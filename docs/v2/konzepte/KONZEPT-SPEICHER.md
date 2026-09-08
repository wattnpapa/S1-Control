# KONZEPT-SPEICHER — Ereignisprotokoll auf dem Share

Stand: 2026-09-08 · Paket M0.1 · Status: **wartet auf Freigabe durch Johannes** — unabhängig geprüft (Urteil „hält mit Auflagen"), Befunde überarbeitet. Die sechs schwerwiegenden Befunde aus [GUTACHTEN-SPEICHER-01.md](GUTACHTEN-SPEICHER-01.md) sind geschlossen; wie jeder einzelne Befund behandelt wurde, ist dort vermerkt. **Code für M0.2 bis M0.4 entsteht erst nach der Freigabe.**

Verbindliche Grundlagen: [ADR-002](../adr/ADR-002-ereignisprotokoll-statt-lockfile.md), [02-ZIELBILD.md](../02-ZIELBILD.md) Abschnitt „Speichermodell", [03-MEILENSTEINE.md](../03-MEILENSTEINE.md) Auflagen 4 bis 18. Belege für das SMB-Verhalten: `docs/v2-arbeitsstand/bestandsaufnahme/nas-speicher-recherche.md` §1 und §4.

Dieses Dokument ist die Spezifikation, gegen die die Pakete M0.2 bis M0.4 gebaut werden. Code-Kommentare in `@s1/speicher` verweisen auf die Paragraphen dieses Dokuments. Wo eine Zahl erst durch die Messung M0.5 am echten Synology-Share bestimmt wird, steht hier ein **Startwert** mit Begründung, kein Ratewert ohne Kennzeichnung.

---

## §1 Zweck, Geltungsbereich und Abgrenzung

### §1.1 Was dieses Konzept festlegt

Wie ein Einsatz als Append-only-Ereignisprotokoll auf einem SMB-Share liegt, wie Clients daraus lesen und darin schreiben, und wie sich das System verhält, wenn etwas kaputtgeht. Konkret: Zeilenformat und Hash-Kette (§2), Zeit und Identität (§3), Segmente und Schreiberidentität (§4), lokaler Spiegel, Offsets und Archivierung (§5), Sichtbarkeit über Poll und Präsenz (§6), Schnappschüsse (§7), Fehlerbilder und die Grenzen der Zusicherung (§8).

### §1.2 Was dieses Konzept nicht festlegt

Der **Ereigniskatalog** — welche Ereignisarten es gibt, welche Nutzlast sie tragen, welche Konfliktregel je Art gilt, wie der Fold die Felder materialisiert — gehört in `KONZEPT-EREIGNISSE.md` (Paket M1.2, Quelle: `docs/v2-arbeitsstand/entwurf/zieldatenmodell-feldabgleich.md` §4). Dieses Dokument behandelt Ereignisse als undurchsichtige Nutzlast mit einem festen Rahmen (§2.4). Wo eine Auflage aus 03-MEILENSTEINE.md fachlich in den Fold gehört (Auflagen 10, 11, 12), ist hier nur die **Anforderung an die Speicherschicht** notiert; die fachliche Regel steht im Ereigniskonzept. §9 hält diese Zuordnung nach.

Bei Auflage 11 ist die Abgrenzung nicht so glatt wie bei 10 und 12: Der „Undo-Stapel je Client" ist keine reine Fold-Frage, sondern hat eine Speicherseite — er muss einen Neustart überstehen, und es muss feststehen, wo er liegt. Sie ist in §4.4 behandelt. Die Semantik des Undo bleibt im Ereigniskonzept.

### §1.3 Die drei tragenden Sätze

1. **Ein Schreiber je Datei.** Kein Client verändert jemals eine Datei, die ein anderer Client geschrieben hat — keine Sperre, kein Master, keine TTL, kein Ersetzen per Rename im Datenpfad. Damit trifft keine der belegten SMB-Schwächen den Schreibpfad: Mandatory Byte-Range-Locks, Oplock- und Lease-Breaks, die Metadaten-Caches des Windows-Redirectors und die nicht-atomare Übernahme veralteter Sperrdateien treffen ausschließlich Modelle, in denen mehrere Clients dieselbe Datei schreiben oder ersetzen (`nas-speicher-recherche.md` §1.2 bis §1.4).
2. **Zuerst lokal, dann auf den Share.** Jedes Ereignis wird zuerst an die lokale Datei angehängt und mit `fsync` dauerhaft gemacht. Die Spiegelung auf den Share ist ein wiederholbarer Append ab einem gemerkten Offset. Der NAS-Ausfall ist der Normalpfad, kein Fehlerpfad.
3. **Wahrheit sind die Ereignisse.** Schnappschüsse sind Beschleuniger und jederzeit verwerfbar. Kein Verfahren in diesem Konzept darf einen Zustand erzeugen, der sich nicht allein aus den Ereignisdateien wiederherstellen lässt. Abgeleitete Anzeiger auf dem Share — `praesenz\` (§6.4) und `archiv.marker` (§5.7) — sind davon **keine Ausnahme**: Sie tragen keinen Zustand, den die Ereignisse nicht auch tragen, und sind jederzeit aus ihnen neu erzeugbar. Verschwindet ein solcher Anzeiger, kostet das Komfort, nie Daten.

### §1.4 Dateilayout

```
<share>\S1-Control\
  manifest.json                              §8.7
  einsaetze\<datum>_<slug>_<kurzid>\        <kurzid> aus clientId und HLC des Anlegens, §5.6
    einsatz.json                             unveraenderlich, §5.6
    ereignisse\<clientId>.<segment>.jsonl    ein Schreiber je Datei, §2, §4
    schnappschuesse\<hlc>-<clientId>.json    §7
    praesenz\<clientId>.json                 §6.4
    anhaenge\                                inhaltsadressiert, unveraenderlich
    ausgaben\                                erzeugte Ausdrucke, HTML-Monitor
    archiv.marker                            abgeleiteter Anzeiger, §5.7
  programm\                                  Update-Ablage (Paket V)
  stammdaten\stan-<version>.json
```

Lokal je Client unter dem Anwendungsdatenverzeichnis dieselbe Struktur als Spiegel, zusätzlich `upload-state.json` (§5.3) und `schreiber.json` (§4.4).

---

## §2 Zeilenformat, Prüfsumme und Hash-Kette

### §2.1 Aufbau einer Zeile

Eine Ereignisdatei ist eine Folge von Zeilen. Jede Zeile hat den Aufbau

```
<länge> \t <crc32> \t <json> \n
```

mit

| Feld | Form | Bedeutung |
|---|---|---|
| `länge` | Dezimalziffern, ASCII, ohne führende Null, höchstens 7 Ziffern | Anzahl der Bytes von `<json>` in UTF-8, ohne Trennzeichen und ohne `\n` |
| `crc32` | genau 8 Zeichen, Hexadezimal, Kleinbuchstaben | CRC-32 (IEEE 802.3, Polynom `0xEDB88320`) über die Bytes `<länge>` `\t` `<json>` |
| `json` | UTF-8, keine rohen Zeilenumbrüche | der Ereignisrahmen nach §2.4 |
| `\n` | ein Byte `0x0A` | Zeilenende |

Trennzeichen ist der Tabulator `0x09`. `JSON.stringify` erzeugt niemals rohe Zeilenumbrüche oder Tabulatoren außerhalb von Zeichenketten, und innerhalb von Zeichenketten werden sie maskiert. Damit ist die Zeilengrenze eindeutig, ohne dass der Leser JSON parsen muss.

**Warum ein Längenpräfix zusätzlich zum Zeilenumbruch:** Der Leser kann so ein Teilschreiben von einem echten Defekt unterscheiden, ohne zu raten (§8.2). Er weiß nach den ersten Bytes, wie viele Bytes er erwartet.

**Warum der CRC das Längenfeld einschließt.** Deckte der CRC nur `<json>` ab, wäre `länge` das einzige ungeschützte Feld der Zeile — und zugleich dasjenige, von dem die Abgrenzung „unvollständig gegen defekt" in §8.2 vollständig abhängt. Ein gekipptes Byte im Längenfeld hätte dann keine Klasse: Der Leser erwartete eine falsche Byte-Zahl, fände kein `\n` an der erwarteten Stelle oder wartete auf Bytes, die nie kommen, und bliebe nach §8.1 stumm stehen. Weil der CRC über `<länge>` `\t` `<json>` gebildet wird, fällt jede Verfälschung des Längenfelds bei der Prüfung auf, und die Zeile ist nach §8.2 defekt. Dass das Feld in der Zeile vor dem CRC steht, ist unschädlich: Der Leser liest die Bytes ohnehin erst ein und prüft danach.

**Obergrenze je Zeile: 1 MiB (1.048.576 Byte).** Eine `länge` über dieser Schranke oder mit mehr als sieben Ziffern ist nach §8.2 ein Defekt, unabhängig davon, wie viele Bytes tatsächlich vorhanden sind. Ohne diese Schranke ließe ein verfälschtes Längenfeld einen Leser dauerhaft auf Bytes warten, die es nicht gibt. Die Schranke liegt weit über jedem realen Ereignis (Annahme A2: 400 bis 600 Byte) und weit unter jedem Wert, dessen Abwarten schaden könnte. Startwert nach §10, A4.

### §2.2 Schreiben

Ein Ereignis wird mit **einem einzigen** `write` an das bekannte Dateiende geschrieben, gefolgt von `fsync`. Kein Read-Modify-Write, kein Rename, kein Zwischenpuffer über mehrere Ereignisse hinweg.

`fsync` hat über SMB eine definierte Bedeutung: SMB2 FLUSH weist den Server an, den Objektspeicher zu leeren, und blockiert bis zum Abschluss (`nas-speicher-recherche.md` §1.9). Ohne `fsync` darf der Client unter einer Write-Lease lokal puffern (belegt, [MS-SMB2] Leasing, §1.2); dass ein Absturz oder Netzabbruch vor dem Lease-Break den Inhalt verlöre, ist dagegen **nicht** belegt — die Recherche markiert genau diesen Schluss an dieser Stelle als „Ableitung aus 1.2; kein direkter Beleg" (§1.9). Die Folgerung bleibt trotzdem, nur mit anderer Begründung: Zugesichert ist allein die Bedeutung des Flush, nicht die Dauerhaftigkeit ohne ihn. `fsync` je Zeile ist Pflicht, lokal wie auf dem Share — nicht weil der Verlust bewiesen wäre, sondern weil die Dauerhaftigkeit ohne ihn nirgends zugesagt ist.

**Annahme A1:** `fsync` je Ereignis ist auf dem echten Share bezahlbar. Das Abbruchkriterium aus 05-UMSETZUNGSPLAN.md nennt 300 ms je Ereignis als Grenze. Wird sie gerissen, ist die erste Gegenmaßnahme nicht der Verzicht auf `fsync`, sondern die Bündelung: mehrere Ereignisse einer Benutzeraktion werden zu einem `write` zusammengefasst und danach einmal `fsync` gerufen. Die Zeilen bleiben einzeln, nur der Systemaufruf wird geteilt. Messung: M0.5.

**Ausdrücklich nicht behauptet:** dass die Zeilen eines `write` gemeinsam sichtbar werden oder gar nicht. SMB2 sagt das nirgends zu, und der Redirector darf einen Schreibvorgang aufteilen. Die Bündelung ist trotzdem zulässig — nicht weil ein Teilschreiben unmöglich wäre, sondern weil es nach §8.1 folgenlos ist: Der Leser wertet eine unvollständige Zeile nicht aus, und der Schreiber setzt an ihrem Anfang wieder auf. Die Zusage lautet „es schadet nicht", nicht „es kann nicht passieren".

### §2.3 Hash-Kette

Jede Zeile trägt im Rahmen das Feld `vorgaenger`: die Kettenprüfsumme der **vorhergehenden Zeile derselben Schreiberkette**, berechnet als

```
vorgaenger(n) = SHA-256( vollständige Bytes der Zeile n-1 einschließlich \n )  → erste 16 Bytes, hex, 32 Zeichen
```

Sonderfälle:

- Erste Zeile des **ersten** Segments eines Clients in einem Einsatz: `vorgaenger` = 32 Nullen.
- Erste Zeile eines **Folgesegments**: `vorgaenger` = Kettenprüfsumme der letzten Zeile des Vorgängersegments. Die Kette läuft also über den Segmentwechsel hinweg durch (§4.3).

Der Leser berechnet die Kette beim Lesen mit und prüft jede Zeile. Eine Abweichung ist ein Defekt nach §8.2.

SHA-256 kommt aus `node:crypto`, also aus der Standardbibliothek — kein natives Modul (02-ZIELBILD.md, Abschnitt Stack).

**Warum zusätzlich zu CRC-32:** CRC-32 erkennt Übertragungs- und Speicherfehler, ist aber trivial fälschbar. Die Hash-Kette erkennt darüber hinaus jede **nachträgliche Änderung** innerhalb einer Schreiberkette, weil sie alle Folgezeilen ungültig macht. Was sie nicht leistet, steht in §8.6.

### §2.4 Rahmenfelder, die die Speicherschicht kennt

Die Speicherschicht liest und schreibt nur diese Felder; alles Weitere ist für sie undurchsichtige Nutzlast.

| Feld | Bedeutung |
|---|---|
| `id` | `<clientId>:<laufnummer>` (§3.3) |
| `hlc` | Textform der Hybrid Logical Clock, feste Stellenzahl (§3.2) |
| `vorgaenger` | Kettenprüfsumme nach §2.3 |
| `schemaVersion` | Version des Ereignisrahmens; Upcaster-Kette in `KONZEPT-EREIGNISSE.md` |
| `typ` | Ereignisart; die Speicherschicht kennt davon nur `SegmentAbgeschlossen` (§4.3) und `SegmentErsetzt` (§4.6) |
| `akteur` | Anzeigename und Rechnername des Bedieners (kein Rollen- und Rechtemodell, Entscheidung 9) |
| `wanduhr` | ISO-8601 mit Zeitzone, **nur zur Anzeige und Plausibilisierung**, nie zur Ordnung (§3.1) |
| `vorher` / `neu` | gesehener Vorher-Wert und neuer Wert bei setzenden Ereignissen (§2.5) |
| `nutzlast` | fachliche Nutzlast, für die Speicherschicht undurchsichtig |
| `undoOf` | optional; Undo ist ein gewöhnliches Ereignis ohne Sonderpfad in der Speicherschicht |
| `korrekturVon` | optional; Berichtigung eines fachlich falschen Eintrags. Wie `undoOf` ein reines Rahmenfeld ohne Sonderpfad; Auflage 11 und 02-ZIELBILD.md Nr. 9 nennen beide gleichrangig. Semantik im Ereigniskonzept |

### §2.5 `vorher` ist Teil des Rahmens, nicht der Fachlogik

Auflage 6 verlangt, dass jedes setzende Ereignis den beim Bedienen **gesehenen** Vorher-Wert mitführt. Für die Speicherschicht folgt daraus nur eine Zusicherung: `vorher` wird unverändert mitgeschrieben und beim Lesen unverändert herausgegeben. Die Auswertung — passt `vorher` nicht zum gefalteten Zustand, erscheint ein Konflikthinweis am Feld — ist Aufgabe des Folds (`KONZEPT-EREIGNISSE.md`). Ohne diesen Hinweis wäre Last-Writer-Wins ein stilles Verwerfen.

### §2.6 Größenannahme

Die Recherche rechnet mit rund 300 Byte je Ereignis (`nas-speicher-recherche.md` §4). Der Rahmen aus §2.4 mit `vorher`/`neu` liegt darüber. **Annahme A2:** 400 bis 600 Byte je Ereignis im Mittel. Bei der Obergrenze aus Entscheidung 10 (Simulation bis 5.000 Einheiten, rund 10 Ereignisse je Einheit) ergibt das 50.000 Ereignisse und 20 bis 30 MB je Einsatz über alle Schreiber. Zu prüfen in M0.4 an der Simulation, nicht zu raten.

---

## §3 Zeit, Ordnung und Ereignis-Identität

### §3.1 Zwei Zeiten, die nie vermischt werden

- **Technische Ordnung**: ausschließlich die HLC. Sie entscheidet, welches Ereignis in einem Konflikt gewinnt.
- **Fachliche Zeit**: Meldezeit, Einsatzbeginn, Einsatzende. Das ist Nutzereingabe wie im Papier-ETB. Sie wird angezeigt und plausibilisiert, aber **nie** zur Ordnung verwendet.

Die Wanduhr im Rahmen (`wanduhr`) dient allein der Anzeige und der Plausibilisierung. Eine Abweichung zwischen `wanduhr` und der fachlichen Meldezeit über einer Schwelle erzeugt einen Hinweis, keinen Fehler (Auflage 12).

### §3.2 HLC als Struktur, Textform mit fester Stellenzahl

Auflage 5. Die HLC ist im Programm eine Struktur und wird als Struktur verglichen:

```
{ millisekunden: number, zaehler: number, clientId: string }
```

Verglichen wird in dieser Reihenfolge: `millisekunden`, dann `zaehler`, dann `clientId` als Tie-Break. Ein Vergleich als Zeichenkette ist verboten — er ist die klassische Fehlerquelle, sobald Zahlen unterschiedlich lang werden.

Für Dateinamen und für die Textform in JSON gilt eine **feste Stellenzahl**, damit die lexikografische Ordnung der Textform mit der Strukturordnung übereinstimmt:

```
<millisekunden: 13 Ziffern, links mit 0 gefüllt>-<zaehler: 6 Ziffern, links mit 0 gefüllt>-<clientId>
```

13 Ziffern tragen Unix-Millisekunden bis zum Jahr 2286. 6 Ziffern für den Zähler erlauben eine Million Ereignisse innerhalb derselben Millisekunde. Die Textform ist eine Darstellung; im Programm wird trotzdem die Struktur verglichen.

**Fortschreibung.** Auflage 5 nennt Vergleich und Textform. Ohne eine ausgeschriebene Fortschreibungsregel ist die HLC aber nicht baubar, weder für das Erzeugen noch für das Empfangen. Es gilt:

*Beim Erzeugen eines eigenen Ereignisses:*

```
w = Wanduhr in Millisekunden
wenn w > millisekunden:   millisekunden = w;  zaehler = 0
sonst:                                        zaehler = zaehler + 1
```

*Beim Lesen eines fremden Ereignisses mit der HLC `f`:*

```
w = Wanduhr in Millisekunden
wenn f.millisekunden - max(millisekunden, w) > 5 Minuten:
    nicht übernehmen (siehe „Schutz gegen fremde Fehluhren")
sonst:
    m = max(millisekunden, f.millisekunden, w)
    wenn m == millisekunden und m == f.millisekunden:  zaehler = max(zaehler, f.zaehler) + 1
    sonst wenn m == millisekunden:                     zaehler = zaehler + 1
    sonst wenn m == f.millisekunden:                   zaehler = f.zaehler + 1
    sonst:                                             zaehler = 0
    millisekunden = m
```

**Die eigene Uhr darf rückwärts springen, die HLC nicht.** `millisekunden` wird niemals verkleinert — das ist der Sinn der ersten Zeile beider Regeln. Wird die Systemuhr zurückgestellt, springt ein Zeitabgleich, oder wechselt die Sommerzeit fehlerhaft, läuft die HLC über den Zähler weiter, bis die Wanduhr wieder aufgeholt hat. Ohne diese Regel erzeugte derselbe Client fallende HLC, und das würde an drei Stellen zugleich still falsch: die Sortierung der Schnappschüsse über den Dateinamen (§7.2), der Vergleich gegen die HLC der Archivierung (§5.7) und jede Konfliktentscheidung des Folds. Übersteigt der Rückstand fünf Minuten, wird er zusätzlich als Uhrfehler nach §8.5 gemeldet; die Arbeit läuft weiter.

**Verhalten beim Zählerüberlauf.** Der Fall ist praktisch unerreichbar — eine Million Ereignisse in einer Millisekunde —, aber „praktisch unerreichbar" ist kein definiertes Verhalten. Regel: Erreicht der Zähler 999.999, wartet der Schreiber, bis die Wanduhr die nächste Millisekunde erreicht, und beginnt dort mit Zähler 0. Das ist eine Wartezeit von höchstens einer Millisekunde und niemals ein Fehler; der Leitsatz „kein Stillstand" gilt auch hier. Ein Zähler, der trotz Wartens nicht zurückgesetzt werden kann, weil die Uhr steht, wird als Uhrfehler nach §8.5 gemeldet.

**Schutz gegen fremde Fehluhren:** Zieht ein empfangener HLC-Wert die eigene Uhr um mehr als **5 Minuten** nach vorn, wird er nicht übernommen. Das Ereignis wird normal gefaltet, aber die eigene physische Komponente folgt ihm nicht, und die Oberfläche zeigt „Uhr eines anderen Rechners weicht um X ab". Vorbild: `uhlc::ExceedingDeltaError` (`nas-speicher-recherche.md` §1.11). Betriebsvoraussetzung ist ohnehin ein vorhandener NTP-Abgleich.

**Was die Nichtübernahme kostet.** Sie ist nicht folgenlos, und das gehört benannt: Wer einen fremden Wert nicht übernimmt, gibt für genau dieses Ereignis die Kausalitätszusage der HLC auf. Ein eigenes Ereignis, das der Bediener erzeugt, **nachdem** er den fremden Eintrag auf dem Bildschirm gesehen hat, kann in der HLC-Ordnung **vor** ihm liegen. Der Fold bleibt deterministisch — er ordnet nach den gespeicherten Werten, und alle Clients kommen zum selben Ergebnis —, aber die Ordnung bildet an dieser einen Stelle nicht mehr ab, was tatsächlich zuerst war. Deshalb ist die Meldung nicht optional, und deshalb trägt jedes setzende Ereignis den gesehenen Vorher-Wert (§2.5): Der Konflikthinweis am Feld fängt genau diesen Fall ab. Die Grenze ist so hoch angesetzt, dass sie bei gewöhnlichem NTP-Versatz nie und nur bei einer echten Fehluhr greift.

### §3.3 Ereignis-Identität und Laufnummer

Auflage 8. Die Identität eines Ereignisses ist `<clientId>:<laufnummer>`.

- `clientId` ist eine beim ersten Start erzeugte, zufällige Kennung (UUIDv4, in Dateinamen auf die ersten 8 Hexziffern gekürzt, siehe §4.1). Sie ist **nicht** der Rechnername, damit ein umbenannter Rechner keine Identität wechselt.
- `laufnummer` ist eine je Client und Einsatz **persistente, streng monoton wachsende** Ganzzahl, beginnend bei 1. Sie wird in `schreiber.json` (§4.4) geführt und **vor** dem Schreiben der Zeile erhöht und dauerhaft gemacht. Eine Lücke ist erlaubt (Absturz zwischen Erhöhen und Schreiben), ein Rückschritt oder eine Doppelvergabe ist ein Fehler.

Die Laufnummer ist damit unabhängig von der HLC, unabhängig von der Uhr und für die Erkennung eines Fremdschreibers geeignet (§4.5).

---

## §4 Segmente und Schreiberidentität

### §4.1 Benennung

```
ereignisse\<clientId8>.<segment>.jsonl
```

`clientId8` sind die ersten 8 Hexziffern der `clientId`; die vollständige Kennung steht in jedem Ereignisrahmen und in der Präsenzdatei. `segment` ist eine 4-stellige, links mit Nullen gefüllte Dezimalzahl, beginnend bei `0000`. Kurze Namen sind kein Selbstzweck: Verzeichnisauflistungen über SMB sind eine der teuren Operationen, und lange Namen verlängern die Antwort.

**Annahme A3:** Eine Kollision der ersten 8 Hexziffern zweier `clientId` ist bei bis zu 5 gleichzeitigen Clients praktisch ausgeschlossen. Trotzdem prüft ein Client beim ersten Schreiben, ob bereits eine Datei mit seinem Präfix existiert, die eine fremde vollständige `clientId` enthält; ist das so, wird eine neue `clientId` erzeugt. Der Fall ist ein Sonderfall in §4.5, kein eigener Mechanismus.

### §4.2 Segmentwechsel nach Größe, nicht bei Programmstart

Auflage 9. Ein neues Segment beginnt **ausschließlich**, wenn das laufende Segment eine Größenschwelle überschreitet. Ein Programmstart, ein Tageswechsel oder ein Verbindungsabbruch beginnt **kein** neues Segment; der Schreiber hängt an sein letztes Segment an.

Begründung: Segmente je Start erzeugen bei fünf Clients über eine mehrtägige Lage dutzende kleiner Dateien. Jede zusätzliche Datei kostet in jedem Poll-Zyklus eine Verzeichnisauflistung oder einen Lesezugriff und verzögert die Sichtbarkeit neuer Dateien um bis zu 10 Sekunden (Windows-Directory-Cache, `nas-speicher-recherche.md` §1.2).

**Startwert: 4 MiB je Segment** (§10, A4). Bei Annahme A2 sind das rund 7.000 bis 10.000 Ereignisse je Segment. Der größte erwartete Einsatz (Entscheidung 10: 100 bis 300 Einheiten, rund 10 Ereignisse je Einheit) bleibt damit weit innerhalb eines einzigen Segments je Schreiber.

Die Simulationsobergrenze von 5.000 Einheiten ergibt 50.000 Ereignisse **über alle Schreiber zusammen** (§2.6). Gleichmäßig auf fünf verteilt sind das 10.000 je Schreiber, also ein bis zwei Segmente je Schreiber und insgesamt fünf bis zehn Dateien. Nur wenn ein einzelner Arbeitsplatz die gesamte Last trüge, käme er allein auf fünf bis acht Segmente. Die frühere Fassung rechnete die Gesamtzahl je Schreiber und kam so auf „rund 40 Dateien" — die Zahl lag auf der sicheren Seite, der Rechenweg stimmte nicht. Für die Poll-Kosten zählt ohnehin nicht die Gesamtzahl, sondern die Zahl der Dateien in Takt A (§6.2). Der Wert wird in M0.5 gegen die gemessene Lesezeit eines vollständigen Erstlaufs kalibriert.

### §4.3 Abschlusszeile

Beim Wechsel schreibt der Schreiber als **letzte Zeile** des alten Segments ein Ereignis vom Typ `SegmentAbgeschlossen`, dessen Nutzlast allein die Nummer des Nachfolgesegments trägt. Erst danach entsteht die erste Zeile des neuen Segments.

**Die Abschlusszeile trägt die Kettenprüfsumme des Nachfolgers nicht.** Diese Prüfsumme ist nach §2.3 der SHA-256 über die vollständigen Bytes der Abschlusszeile selbst; ein Feld, das den Hash der eigenen Zeile enthielte, wäre nicht schreibbar. Sie ist auch nicht nötig: Der Leser hat die Abschlusszeile vollständig gelesen und rechnet den Wert selbst aus. Er ist damit ein abgeleiteter Wert, kein gespeicherter.

Das leistet dreierlei: Leser wissen, dass ein Segment endgültig fertig ist und nie wieder gepollt werden muss (§6.2); die Hash-Kette läuft über den Segmentwechsel hinweg durch (§2.3); und ein fehlendes Nachfolgesegment fällt beim Lesen auf, statt still zu verschwinden.

Stürzt der Schreiber zwischen Abschlusszeile und erster Zeile des neuen Segments ab, findet der Leser eine Abschlusszeile ohne Nachfolger. Das ist kein Defekt, sondern ein Wartezustand: Der Leser behandelt das Nachfolgesegment als „angekündigt, noch nicht vorhanden" und pollt es (§6.2). Der Schreiber setzt beim nächsten Start dort auf.

**Verfall des Wartezustands.** Kehrt der Schreiber nicht zurück, liefe dieser Poll sonst für den Rest des Einsatzes. Es gilt die allgemeine Verfallsregel aus §6.2: Erscheint das angekündigte Nachfolgesegment **fünf Minuten** lang nicht, fällt es aus dem kurzen Takt A in den langen Takt B zurück. Es gilt damit nicht als verloren — taucht es später auf, wird es normal gelesen —, es kostet nur nicht mehr jeden kurzen Takt einen Zugriff.

Die Regel ist rein zeitgesteuert. Sie hing in einer früheren Fassung zusätzlich daran, dass die Präsenzdatei desselben Clients veraltet ist; damit hätte ein Ausfall der Präsenz — die nach §6.4 ausfallen **darf** — dazu geführt, dass jeder Leser ein nie erscheinendes Segment für den Rest der Lage im kurzen Takt pollt. Die Präsenzdatei darf den Verfall allenfalls **vorziehen**, nie verhindern. Der Wert ist ein Startwert nach §10, A4.

### §4.4 `schreiber.json` — der lokale Schreiberzustand

Liegt ausschließlich lokal, nie auf dem Share:

```
{ "clientId": "...", "laufnummer": 4711, "segment": 3,
  "lokalerOffset": 1234567, "letzteKette": "a1b2…" }
```

Geschrieben wird lokal per Schreiben in eine `.tmp`-Datei plus Rename — auf einem lokalen Dateisystem ist das der übliche, atomare Weg. Auf dem Share ist Rename im Datenpfad verboten (§1.3); lokal gilt dieses Verbot nicht.

**Der Undo-Stapel steht nicht hier — er ist abgeleitet.** Auflage 11 verlangt einen Undo-Stapel je Client. Für die Speicherschicht stellt sich dabei nur die Frage, wo er liegt und ob er einen Neustart übersteht. Antwort: Er liegt nirgends. Er wird beim Öffnen des Einsatzes aus dem lokalen Spiegel berechnet — die eigenen Ereignisse in HLC-Ordnung, abzüglich derer, zu denen bereits ein eigenes Ereignis mit passendem `undoOf` vorliegt, begrenzt auf die jüngsten N. Damit übersteht er jeden Neustart, ohne dass eine eigene Datei ihn tragen müsste, und er kann nicht von den Ereignissen abweichen. Eine gespeicherte Liste könnte das: Sie wäre ein Zustand, der sich nicht allein aus den Ereignissen ergibt, und liefe §1.3 Satz 3 zuwider. N und die Frage, welche Ereignisarten überhaupt rücknehmbar sind, gehören ins Ereigniskonzept.

### §4.5 Fremdschreiber-Erkennung

Auflage 8. Zwei Fälle sind zu erkennen:

**Fall 1 — zwei Instanzen auf demselben Rechner.** Verhindert durch `requestSingleInstanceLock` von Electron. Das ist verbindlich, nicht optional (02-ZIELBILD.md, Speichermodell Nr. 8).

**Fall 2 — geklontes Benutzerprofil.** Wird das Anwendungsdatenverzeichnis kopiert (Rechner-Klon, wiederhergestelltes Backup, mitgenommenes Profil), existiert dieselbe `clientId` mit derselben Laufnummer zweimal. Erkennung beim Öffnen eines Einsatzes:

1. Lies das eigene letzte Segment **auf dem Share** von `shareOffset` an bis zum Ende (durch Lesen, nicht über die Dateigröße — §5.4.2).
2. Bestimme die höchste dort gefundene `laufnummer` der eigenen `clientId`.
3. Ist sie **größer als** die eigene zuletzt vergebene aus `schreiber.json`, hat ein anderer Prozess unter derselben Kennung geschrieben.
4. Ist sie **gleich** der eigenen zuletzt vergebenen, vergleiche die Share-Zeile mit dieser Laufnummer byteweise gegen die eigene lokale Zeile derselben Laufnummer. Stimmen sie überein, ist alles in Ordnung — das ist der Normalfall eines vollständig gespiegelten Segments. Weichen sie ab, hat ein zweiter Prozess dieselbe Nummer für ein anderes Ereignis vergeben.

Schritt 4 ist der Grund, warum das Kriterium nicht „größer oder gleich der eigenen **nächsten**" lauten darf. Die symmetrische Klon-Lage — beide Kopien laufen gleich weit und vergeben dieselbe Nummer — erzeugt auf dem Share genau die eigene zuletzt vergebene Nummer und bliebe unter einem reinen Zahlenvergleich unerkannt. Dann trügen zwei verschiedene Ereignisse dieselbe Identität, und Auflage 8 wäre im Kern verletzt. Der Inhaltsvergleich trennt die beiden Lagen, ohne eine Größenabfrage zu brauchen.

**Der Byte-Vergleich der Spiegelung ist das primäre Mittel.** Die Prüfung oben läuft beim Öffnen eines Einsatzes, also einmal je Sitzung. Im laufenden Betrieb wird Fall 2 durch Ausgang C in §5.4.3 erkannt, und zwar bei jedem Spiegelungslauf. Beide Wege benutzen dasselbe Kriterium: eine Zeile mit der eigenen `clientId`, die lokal nicht oder anders vorhanden ist. Beide stellen das Dateiende ausschließlich durch Lesen fest.

Reaktion in beiden Wegen: Der Client **schreibt nicht weiter** unter dieser Kennung. Er erzeugt eine neue `clientId`, beginnt ein eigenes Segment `0000`, hängt seine noch nicht hochgeladenen lokalen Ereignisse unter der neuen Kennung an, und meldet im Klartext: „Dieses Benutzerprofil wurde offenbar kopiert. Der Rechner arbeitet ab jetzt unter einer neuen Kennung weiter; bereits geschriebene Einträge bleiben erhalten." Kein stilles Weiterschreiben, kein Datenverlust, keine überschriebene Fremdzeile.

Die alte Segmentdatei bleibt liegen und wird von allen Lesern normal ausgewertet. Sie wächst nicht mehr und fällt deshalb nach §6.2 aus Takt A heraus.

### §4.6 Ersatzsegment nach Beschädigung

Stellt der Schreiber Ausgang B nach §5.4.3 fest — die auf dem Share liegenden Bytes seiner eigenen Datei sind verfälscht, ohne dass eine fremde Schreibspur nachweisbar wäre —, dann ist er der einzige, der den Inhalt noch vollständig hat. Er darf die beschädigte Datei aber nicht in der Mitte überschreiben: Das Verfahren ist Append-only, und ein Read-Modify-Write auf dem Share ist nach §1.3 und §2.2 ausgeschlossen. Repariert wird deshalb durch **Anhängen an anderer Stelle**.

Ablauf:

1. Der Schreiber beginnt ein neues Segment mit der nächsten freien Nummer. Es heißt **Ersatzsegment**.
2. Dessen erste Zeile ist ein Ereignis vom Typ `SegmentErsetzt`. Ihre Nutzlast nennt das ersetzte Segment und den Offset, ab dem der Ersatz gilt — den Offset der ersten abweichenden Zeile.
3. `vorgaenger` dieser ersten Zeile ist die Kettenprüfsumme der letzten **unbeschädigten** Zeile des ersetzten Segments. Die Kette läuft damit über den Sprung hinweg durch, und ein Leser, der bis zur Beschädigungsstelle gelesen hat, schließt lückenlos an.
4. Danach schreibt der Schreiber alle Ereignisse ab dieser Stelle noch einmal — mit **unveränderten** Ereignis-Identitäten `<clientId>:<laufnummer>`, unveränderten HLC und unveränderter Nutzlast. Es sind dieselben Ereignisse, nicht neue.
5. Das beschädigte Segment bekommt keine Abschlusszeile mehr. Es wird nicht mehr beschrieben.

Warum das trägt:

- **Für Leser in Quarantäne** ist das Ersatzsegment eine neue Datei ohne Quarantänestelle. Sie holen sich dort genau die Ereignisse, die ihnen fehlen, und die Konvergenzzusage aus §8.6.1 gilt für sie wieder.
- **Für Leser ohne Quarantäne**, die die Original-Bytes fehlerfrei gelesen haben, kommen die Ereignisse ein zweites Mal an. Das ist folgenlos, weil der Fold eine Mengenfunktion über die Ereignis-Identitäten ist (Auflage 4): Zwei Zeilen mit derselben Identität sind dasselbe Ereignis, nicht zwei.
- **„Ein Schreiber je Datei" bleibt unangetastet.** Der Schreiber schreibt ausschließlich in eine eigene, neu angelegte Datei.

Damit die Wiederholung nicht zum Einfallstor wird, gilt als Anforderung an den Leser: **Treffen zwei Zeilen mit derselben Ereignis-Identität, aber unterschiedlichem Inhalt ein, ist das ein Defekt** nach §8.2 in derjenigen Datei, in der die zweite Zeile steht. Das ist die zweite Verteidigungslinie gegen das geklonte Profil und zugleich die Bedingung, unter der die Wiederholung idempotent bleibt.

Kehrt der Schreiber nie zurück, greift der Exportweg aus §8.6.1 Regel 4.

---

## §5 Lokaler Spiegel, Offsets, Spiegelung und Archivierung

### §5.1 Der lokale Spiegel ist die Arbeitskopie

Jeder Client hält unter seinem Anwendungsdatenverzeichnis eine vollständige Kopie aller Ereignisdateien des geöffneten Einsatzes — der eigenen wie der fremden. Der Fold läuft **immer** über den lokalen Spiegel, nie über den Share. Damit ist die Anzeige unabhängig von der Erreichbarkeit des NAS, und kein Fold hängt an einer Netzlatenz.

### §5.2 Schreibweg

1. Ereignis erzeugen, HLC ziehen, Laufnummer erhöhen und dauerhaft machen (§3.3).
2. Zeile an die lokale eigene Segmentdatei anhängen, `fsync`.
3. `schreiber.json` fortschreiben.
4. Der Zustand ist ab hier gültig; die Oberfläche zeigt das Ereignis sofort.
5. Asynchron: Spiegelung auf den Share (§5.4).

Erst Schritt 2 macht ein Ereignis wirklich; Schritt 5 darf beliebig lange dauern oder scheitern.

### §5.3 `upload-state.json`

Liegt lokal und führt zwei Sorten von Offsets:

```
{
  "eigen":  { "0003": { "shareOffset": 1234567, "letzteKette": "a1b2…" } },
  "fremd":  { "9f3c1a20.0000": { "leseOffset": 890123, "letzteKette": "c3d4…",
                                  "abgeschlossen": true,  "quarantaeneAb": null } }
}
```

- `eigen.<segment>.shareOffset` — bis zu welchem Byte die eigene lokale Datei bereits auf den Share gespiegelt ist.
- `fremd.<datei>.leseOffset` — bis zu welchem Byte eine fremde Datei bereits gelesen und in den lokalen Spiegel übernommen wurde.
- `letzteKette` — die Kettenprüfsumme an genau diesem Offset, damit der nächste Leseabschnitt lückenlos an die Kette anschließt.
- `abgeschlossen` — die Datei trug eine Abschlusszeile (§4.3) und wird nicht mehr gepollt.
- `quarantaeneAb` — Byte-Offset, ab dem diese Datei wegen eines Defekts nicht weiter ausgewertet wird (§8.2).

### §5.4 Spiegelung auf den Share

Ein Hintergrundvorgang im Worker-Thread liest die eigene lokale Datei ab `shareOffset` und hängt die Bytes unverändert an die gleichnamige Share-Datei an, gefolgt von `fsync`, und schreibt danach `shareOffset` fort.

#### §5.4.1 Übertragen wird nur bis zur letzten vollständigen lokalen Zeile

Der Hintergrundvorgang überträgt **niemals** Bytes einer lokal noch unvollständigen Zeile. Er bestimmt vor jedem Lauf den `lokalerVollstaendigerOffset` — das Byte hinter dem `\n` der letzten lokal vollständigen, kettenrichtigen Zeile — und überträgt höchstens bis dorthin.

Daraus folgt die tragende Invariante dieses Abschnitts:

> **Die Share-Datei ist zu jedem Zeitpunkt ein Byte-Präfix der lokalen Datei desselben Segments.**

Sie gilt auch über einen Absturz hinweg. Der Schreiber kürzt seine lokale Datei beim Start auf die letzte vollständige, kettenrichtige Zeile (§8.1); weil nur bis genau dorthin gespiegelt wurde, überlebt jedes bereits übertragene Byte diese Kürzung. Ohne diese Regel wäre der Gegenfall möglich: Ein Spiegelungslauf nimmt eine gerade entstehende Zeile mit, der Rechner stürzt ab, die lokale Datei wird gekürzt — und die Share-Datei wäre **länger** als die lokale. Der Vergleich unten fände dann fremde Bytes an einer Stelle, an der es lokal keine gibt, und meldete dem Bediener nach einem gewöhnlichen Absturz, sein Benutzerprofil sei kopiert worden. Genau diesen Falschalarm schließt die Invariante aus.

Ein Teilschreiben auf dem Share verletzt die Invariante nicht: Was dort ankommt, ist ein Präfix dessen, was gesendet wurde, und damit ein Präfix der lokalen Bytes. Eine so entstandene Bruchstückzeile am Share-Ende ist für alle Leser harmlos (§8.1) und wird beim nächsten Lauf vervollständigt.

#### §5.4.2 Das wahre Dateiende wird gelesen, nicht erfragt

Der Offset wird erst nach erfolgreichem `fsync` fortgeschrieben; nach einem Abbruch kann die Share-Datei also weiter sein als der gemerkte `shareOffset`. Das wahre Ende wird **durch Lesen** bestimmt: ab `shareOffset` wird gelesen, bis nichts mehr kommt, und die gelesenen Bytes werden mit den eigenen lokalen Bytes an derselben Stelle verglichen.

**Nicht über `stat` oder die Dateigröße.** Das wäre derselbe Fehler, den §6.2 für den Lesepfad ausschließt: Die Metadaten-Caches des Windows-Redirectors liefern bis zu 10 Sekunden alte Werte (`nas-speicher-recherche.md` §1.2). Eine zu klein gemeldete Größe würde bereits übertragene Bytes ein zweites Mal anhängen — und damit doppelte Ereigniszeilen in der eigenen Datei erzeugen, den einen Fehler, den dieses Verfahren per Konstruktion ausschließen soll. Datenlesezugriffe gehen ohne gültige Lease zum Server durch und umgehen den Attribut-Cache; deshalb ist Lesen hier die einzige zulässige Feststellung. Wann diese Lease-Annahme kippt und was daraus für den Schreiber folgt, steht in §6.6.

#### §5.4.3 Drei Ausgänge des Vergleichs

Der Vergleich der gelesenen Share-Bytes mit den eigenen lokalen Bytes ab `shareOffset` hat genau drei Ausgänge. Sie sind zu unterscheiden, weil zwei davon einen Bediener­hinweis mit einer Ursachenbehauptung auslösen und die dritte den einzigen Weg zurück eröffnet.

**Ausgang A — Präfix, kein Widerspruch (Normalfall).** Die gelesenen Share-Bytes stimmen mit den lokalen Bytes an derselben Stelle überein, so weit sie reichen. Ab dem festgestellten Ende wird weiter angehängt, danach `shareOffset` fortgeschrieben. Keine Meldung. Dieser Ausgang deckt den Neustart mitten im Segment vollständig ab, einschließlich einer abgebrochenen Übertragung mit Bruchstückzeile am Share-Ende.

**Ausgang B — Abweichung, aber keine fremde Schreibspur (Beschädigung).** Die Bytes weichen ab, und für jede auswertbare Zeile, die ab der Abweichungsstelle auf dem Share steht, gilt: Ihre Ereignis-Identität `<clientId>:<laufnummer>` ist lokal vergeben **und** ihr Inhalt stimmt mit der lokalen Zeile derselben Identität überein. Es hat also niemand unter dieser Kennung etwas geschrieben, was hier nicht auch lokal steht; die Bytes sind auf dem Weg oder auf dem Datenträger verfälscht worden. Reaktion: **Reparatur nach §4.6**, Klartextmeldung „Ein Teil der bereits übertragenen Einträge dieses Arbeitsplatzes ist auf dem Server beschädigt; er wird neu geschrieben." Kein Kennungswechsel.

**Ausgang C — fremde Schreibspur (Fall 2).** Auf dem Share steht mindestens eine auswertbare Zeile mit der eigenen `clientId`, deren Laufnummer lokal **nicht** vergeben ist, oder deren Laufnummer lokal vergeben ist, deren Inhalt sich aber von der lokalen Zeile derselben Laufnummer unterscheidet. Beides kann nur ein zweiter Prozess unter derselben Kennung erzeugt haben. Reaktion: Fall 2 nach §4.5.

Die Unterscheidung von B und C ist der Grund, warum die Laufnummer nach §3.3 persistent und lückenlos nachvollziehbar geführt wird: Sie ist das einzige Merkmal, das eine fremde Schreibspur von verfälschten Bytes trennt. Ohne diese Trennung führte jedes gekippte Byte zu einer neuen `clientId` und zur Meldung „Dieses Benutzerprofil wurde offenbar kopiert" — einer nachweislich falschen Aussage über den Rechner des Bedieners — und zugleich zu einem Schreibverbot für genau den Client, der die Beschädigung als einziger heilen kann.

Ist eine Share-Zeile ab der Abweichungsstelle weder als Zeile lesbar noch einer Identität zuzuordnen (verfälschte Länge, verfälschter CRC), zählt sie für diese Unterscheidung nicht als fremde Schreibspur; sie stützt Ausgang B. Der Zweifel geht damit zugunsten der Reparatur aus. Das ist die richtige Richtung: Ausgang B ist folgenlos, wenn er sich als Irrtum erweist — der Schreiber schreibt Ereignisse noch einmal, die bereits dieselbe Identität tragen und deshalb dieselben sind —, während Ausgang C einen Kennungswechsel und eine Aussage über den Rechner des Bedieners nach sich zieht.

#### §5.4.4 Weitere Eigenschaften

- **Aus dem Worker, nie aus dem Main-Prozess.** Ein blockierender SMB-Aufruf kann bis zu 60 Sekunden hängen, bevor ein Fehler kommt (`SessTimeout`, `nas-speicher-recherche.md` §1.8). Im Electron-Main-Prozess stünde damit die gesamte Oberfläche. Das ist als Lint-Regel zu erzwingen (05-UMSETZUNGSPLAN.md, M2.1).
- **Segmente aufsteigend.** Hat ein Client mehrere eigene Segmente mit unübertragenen Bytes — nach einem längeren Ausfall oder nach einem Segmentwechsel während der Trennung —, werden sie in aufsteigender Segmentnummer gespiegelt; ein Segment wird erst begonnen, wenn das vorhergehende vollständig übertragen ist. Sonst erschiene bei den Lesern ein Nachfolgesegment vor der Abschlusszeile seines Vorgängers: Die Kette (§2.3) ließe sich erst nachträglich schließen, und §8.6.2 meldete zwischenzeitlich eine fehlende Kettenfortsetzung, wo keine fehlt.
- **Mit Rückstauverhalten.** Scheitert die Spiegelung, wird sie mit wachsendem Abstand erneut versucht (Startwerte: 2 s, 5 s, 15 s, danach 30 s dauerhaft; §10, A4). Die Oberfläche zeigt „Share nicht erreichbar seit HH:MM, N Einträge noch nicht übertragen". Kein Dialog, keine Nachfrage, kein Blockieren der Arbeit. Zur Unterscheidung vorübergehender von dauerhaften Fehlern siehe §8.9.

### §5.5 Leseweg

Der Leser holt für jede fremde Datei die Bytes ab `leseOffset` **in einen Puffer**, prüft die Zeilen dort (§2.1, §2.3), hängt **nur die geprüften, vollständigen Zeilen** an die lokale Spiegelkopie an und schreibt danach `leseOffset` fort. Die Reihenfolge ist verbindlich: geprüft wird **vor** dem Anhängen, nie danach.

Damit gelangt kein defektes Byte in den lokalen Spiegel. Das entscheidet über zwei andere Stellen: §8.2 Punkt 5 kann die Quarantänestelle beim nächsten Start gegen die Share-Datei erneut prüfen, ohne den Spiegel als Vergleichsmaßstab verloren zu haben, und der Export nach §8.6.1 Regel 4 gibt garantiert nur geprüfte Zeilen weiter. Die Folge ist gewollt und gehört benannt: Ab einer Quarantänestelle ist der lokale Spiegel einer fremden Datei **nicht** byteweise identisch mit der Share-Datei — er ist ihr geprüftes Präfix.

Ein unvollständiger Rest bleibt im Puffer liegen und wird beim nächsten Durchlauf zusammen mit dem Nachschub ausgewertet (§8.1).

### §5.6 `einsatz.json`

Wird beim Anlegen des Einsatzes **einmal** geschrieben und danach nie wieder verändert. Es trägt nur, was zur Identifikation des Ordners nötig ist: Einsatz-Kennung, Anlagezeitpunkt, anlegender Client, `formatVersion`. Alle fachlichen Stammdaten — auch der Einsatzname — sind Ereignisse und damit änderbar. Das Anlegen erfolgt mit „nur erzeugen, wenn nicht vorhanden" (`flag: 'wx'`); dass diese Atomarität über SMB serverseitig entschieden wird, ist für den einmaligen Anlegevorgang tragbar (`nas-speicher-recherche.md` §1.4).

**Zwei Clients legen gleichzeitig denselben Einsatz an.** Der Ordnername enthält eine Kurz-ID (§1.4), die aus der `clientId` und der HLC des Anlegens gebildet wird; zwei gleichzeitige Anlagevorgänge erzeugen deshalb zwei verschiedene Ordner, nicht einen Konflikt. Das ist kein Fehler der Speicherschicht, sondern ein fachlicher Doppeleintrag: Es gibt zwei Einsätze, die dasselbe meinen. Die Speicherschicht meldet ihn — beim Öffnen der Einsatzliste erscheinen zwei Einträge mit gleichem Namen und gleichem Anlagezeitpunkt mit dem Hinweis „Zwei Einsätze mit gleichem Namen wurden fast gleichzeitig angelegt" —, löst ihn aber nicht auf. Das Zusammenführen zweier Einsätze ist ein fachlicher Vorgang mit fachlichen Regeln und gehört nicht hierher; bis es ihn gibt, ist der richtige Bedienschritt, einen der beiden zu archivieren. Schlägt `wx` dagegen fehl, weil der Ordner mit **derselben** Kurz-ID bereits existiert, wird der vorhandene geöffnet, nichts überschrieben und nichts gemeldet — das ist der Wiederholversuch nach einem Abbruch.

### §5.7 Archivierung und Ordnerverschiebung

Auflage 13. Drei Festlegungen, die die Speicherschicht erfüllen muss.

**Archiviert wird durch ein Ereignis, nicht durch eine Datei (Entscheidung Johannes, 2026-09-08).** Das Archivieren ist ein gewöhnliches Ereignis `EinsatzArchiviert` in der Ereignisdatei desjenigen Clients, der es auslöst. Seine HLC ist die HLC der Archivierung; erst damit ist der Vergleich weiter unten überhaupt ausführbar. Die fachliche Semantik gehört in `KONZEPT-EREIGNISSE.md`, wo die Barriere `EinsatzArchiviert` bereits vorgesehen ist (05-UMSETZUNGSPLAN.md, M1.2); hier steht nur, was die Speicherschicht davon wissen muss.

`archiv.marker` ist damit **kein Zustandsträger, sondern ein abgeleiteter Anzeiger.** Er existiert allein, damit die Einsatzliste einen Einsatz als archiviert zeigen kann, ohne seinen Ereignisstrom zu falten. Inhalt:

```json
{ "einsatzId": "…",
  "ereignis": "9f3c1a20…:4711",
  "hlc": "1757340000000-000003-9f3c1a20…",
  "wanduhr": "2026-09-08T14:22:31+02:00" }
```

- Geschrieben wird er von dem Client, der das Ereignis erzeugt hat, mit `flag: 'wx'`.
- Jeder andere Client, der das Ereignis liest und keinen Marker vorfindet, legt ihn ebenfalls mit `wx` an. Eine Kollision zweier Clients ist folgenlos, weil beide denselben Inhalt schreiben.
- Fehlt der Marker oder geht er verloren, ändert das am Zustand nichts. Die Einsatzliste zeigt den Einsatz dann als nicht archiviert, bis er einmal geöffnet wurde — der einzige Schaden.
- Nimmt ein späteres Ereignis die Archivierung zurück, entfernt der Client, der die Rücknahme faltet, den Marker. Das ist die einzige Stelle, an der ein Client eine Datei löscht, die ein anderer geschrieben hat. Sie ist zulässig, weil die Datei abgeleitet ist und ihr Verlust folgenlos bleibt; „ein Schreiber je Datei" gilt für den Datenpfad, und der Marker ist keiner.

**§1.3 Satz 3 bleibt damit ohne Ausnahme.** Der Archivzustand ergibt sich allein aus den Ereignissen. Die frühere Fassung ließ den Marker den Zustand tragen und ihn zugleich inhaltlich undefiniert — der Vergleich „HLC des Markers" hatte keinen Bezugspunkt, und der Archivzustand war der einzige im ganzen Entwurf, der sich nicht aus den Ereignissen ergab.

**Ereignis nach der Archivierung — genau eine Behandlung.** Sobald ein Client den Einsatz als archiviert faltet, wechselt er für ihn in einen Nur-Lesen-Zustand und bietet keine ändernden Bedienschritte mehr an. Trifft dennoch ein Ereignis mit einer HLC **nach** der des Ereignisses `EinsatzArchiviert` ein — weil ein anderer Client offline weitergearbeitet hat —, dann gilt: **Das Ereignis wird angenommen, gefaltet und wirkt.** Es wird zusätzlich als „nach Archivierung eingegangen" gekennzeichnet, erscheint im Einsatztagebuch mit diesem Hinweis, und die Oberfläche meldet „Der Einsatz war bereits archiviert; N nachträgliche Einträge sind eingegangen." Verworfen wird nichts. Stilles Verwerfen wäre der schlimmere Fehler, und ein Einsatz, der nachträglich einen Eintrag bekommt, ist ein realer Vorgang, kein Programmfehler.

**Ordnerverschiebung darf keinen Upload ins Leere laufen lassen.** Wird der Einsatzordner auf dem Share verschoben, umbenannt oder archiviert, während ein Client noch unübertragene Ereignisse hat, darf der Wiederholversuch den Ordner **nicht neu anlegen**. Deshalb prüft jeder Spiegelungsversuch zuerst, ob unter dem gemerkten Pfad eine `einsatz.json` mit der erwarteten Einsatz-Kennung liegt. Ist sie nicht da oder trägt sie eine andere Kennung, wird die Spiegelung angehalten und im Klartext gemeldet: „Der Einsatzordner ist unter dem bekannten Pfad nicht mehr auffindbar. N Einträge liegen lokal bereit und werden übertragen, sobald der Pfad wieder stimmt." Die Ereignisse bleiben lokal vollständig erhalten; ein neuer Pfad kann in den Einstellungen gesetzt werden, danach läuft die Spiegelung ab dem gemerkten Offset weiter.

---

## §6 Sichtbarkeit: Poll, Präsenz, UDP

### §6.1 Warum Polling und nicht Beobachten

`fs.watch` ist laut Node-Dokumentation über NFS und SMB nicht verlässlich; vergleichbare Bibliotheken sagen dasselbe; SMB2 CHANGE_NOTIFY hängt an der Konfiguration des NAS (`nas-speicher-recherche.md` §1.5). Polling ist die einzige portable Grundlage. Dateibeobachtung darf höchstens als Beschleuniger ergänzt werden, nie als Wahrheit.

### §6.2 Zwei Takte

**Takt A — bekannte, noch wachsende Dateien (kurz).** Für jede fremde Datei, die weder abgeschlossen noch in Quarantäne ist, wird direkt am bekannten `leseOffset` gelesen. Kein `stat`, kein `mtime`-Vergleich: Ein Datenlesezugriff geht ohne gültige Lease zum Server durch, während die Attribut-Caches des Windows-Redirectors bis zu 10 Sekunden alte Werte liefern (`nas-speicher-recherche.md` §1.2). Kommen 0 Bytes zurück, ist nichts Neues da; kommen Bytes zurück, werden sie nach §5.5 verarbeitet. Das kostet je Datei einen Öffnen-Lesen-Schließen-Zyklus.

Entscheidend für die Kosten: **Nur das jeweils letzte Segment eines Schreibers kann wachsen.** Abgeschlossene Segmente sind durch ihre Abschlusszeile (§4.3) endgültig erkennbar und werden nie wieder angefasst. Damit hängt die Zahl der Dateien in Takt A nicht daran, wie lang der Einsatz schon läuft.

**Sie hängt aber an der Zahl der je schreibenden Kennungen, nicht an der Zahl der Arbeitsplätze.** „Fünf Clients ⇒ fünf Dateien je Takt" gilt nur, solange jede Kette entweder wächst oder eine Abschlusszeile trägt. Eine Kennung, die aufgegeben wird, hinterlässt eine Datei, die beides nicht tut: Sie bekommt keine Abschlusszeile mehr und wächst nie wieder. Das geschieht bei jeder Klon-Erkennung (§4.5), jedem Präfixkonflikt (§4.1), jedem Ersatzsegment (§4.6), jedem verlorenen Benutzerprofil und jeder Neuinstallation. Ohne weitere Regel bliebe jede dieser Dateien für den Rest der Lage in Takt A.

**Verfallsregel, für jede Datei gleich.** Liefert eine Datei in Takt A über **fünf Minuten** hinweg keine neuen Bytes, fällt sie in Takt B zurück. Sie gilt damit nicht als verloren: Liefert sie in Takt B wieder Bytes, kehrt sie unmittelbar in Takt A zurück. Dieselbe Regel deckt das angekündigte, aber noch nicht vorhandene Nachfolgesegment aus §4.3 und die Datei mit vorläufiger Quarantäne aus §8.1 ab — es gibt nur diese eine Regel, und sie ist rein zeitgesteuert. Startwert nach §10, A4.

Im Normalbetrieb ist die Zahl der Dateien in Takt A damit die der aktiven Arbeitsplätze; nach Störungen liegt sie darüber, aber beschränkt durch den Verfall. Die Messung in M0.5 setzt deshalb nicht 5, sondern **10 Segmente bei 5 Clients** an (05-UMSETZUNGSPLAN.md, M0.5) — die Zahl, die eine mehrtägige Lage mit ein paar Zwischenfällen erreicht.

**Startwert Takt A: 3 Sekunden**, mit der Regel: Das Intervall ist mindestens das Doppelte der gemessenen Zykluskosten. Der frühere Startwert von 2 Sekunden lag genau auf der Abbruchgrenze desselben Meilensteins — 2 Sekunden Zykluskosten bei 5 Clients (05-UMSETZUNGSPLAN.md) —, und ein Client, dessen Intervall gleich seinen Zykluskosten ist, pollt ohne Pause. Ein Startwert braucht Abstand zu der Grenze, gegen die er gemessen wird. Kalibrierung in M0.5.

**Takt B — neue Dateien entdecken (lang).** Eine Verzeichnisauflistung von `ereignisse\` findet Dateien neuer Clients und angekündigte Nachfolgesegmente. **Startwert: 10 Sekunden**, weil der Windows-Directory-Cache ohnehin bis zu 10 Sekunden alt sein darf und ein kürzerer Takt nur Last ohne Erkenntnisgewinn erzeugt. Daraus folgt unmittelbar die Zusage aus 02-ZIELBILD.md: Für die **erste** Datei eines neuen Clients sind bis zu 10 Sekunden zugesagt, nicht weniger.

Ein durch eine Abschlusszeile **angekündigtes** Nachfolgesegment wird abweichend davon bereits in Takt A gepollt, damit ein Segmentwechsel keine 10-Sekunden-Lücke erzeugt.

### §6.3 Ehrliche Anzeige

Die Oberfläche zeigt dauerhaft: den Zeitpunkt des letzten erfolgreichen Poll-Durchlaufs als „Stand: vor 8 s", ob der Share erreichbar ist, wie viele eigene Einträge noch nicht übertragen sind, und wie viele andere Arbeitsplätze gerade aktiv sind. Es wird nie „aktuell" angezeigt, wenn nur der lokale Stand gemeint ist.

### §6.4 Präsenz

`praesenz\<clientId>.json` ist die **einzige** Datei auf dem Share, die überschrieben wird, und jeder Client überschreibt ausschließlich seine eigene.

**Zusicherung, genau abgegrenzt:** Die Präsenzdatei ist **kein Datenpfad und keine Fold-Regel**. Kein Ereignis, kein gefalteter Zustand und keine Poll-Entscheidung hängt an ihr. Fällt sie vollständig aus, ist die Folge auf zwei Stellen begrenzt, und beide sind Komfort:

- Die Anzeige „3 weitere Arbeitsplätze" (§6.3) wird ungenau.
- Die Erkennungshilfe für entfernte Dateien (§8.6.2) verliert eine ihrer beiden Quellen; die andere — Schnappschüsse und die lokalen Spiegel der übrigen Clients — bleibt.

Die weiter gefasste Zusage „kein Verfahren dieses Konzepts darf von ihr abhängen" wäre nicht wahr gewesen: §4.3 machte den Verfall des Wartezustands von ihr abhängig, und ein Ausfall der Präsenz hätte damit die Poll-Last dauerhaft erhöht. Dieser Verfall ist jetzt rein zeitgesteuert (§6.2); die Präsenzdatei darf ihn **vorziehen**, nie verhindern. Das ist die Rolle, die ihr überall zusteht: Beschleuniger und Anzeige, nie Voraussetzung.

Inhalt: `clientId`, Anzeigename, Rechnername, Programmversion, letzter Kontakt als HLC und als Wanduhr, laufendes eigenes Segment und dessen Offset.

- **Schreibtakt:** alle 15 Sekunden, und zusätzlich bei jedem Segmentwechsel. Startwert nach §10, A4.
- **Verfahren:** Überschreiben an Ort und Stelle mit Kürzen auf die neue Länge, kein Rename. Rename schlägt unter Windows mit `EPERM`/`EBUSY` fehl, wenn ein anderer Client die Zieldatei ohne `FILE_SHARE_DELETE` geöffnet hält (`nas-speicher-recherche.md` §1.4) — genau das täte ein lesender Client.
- **Folge davon:** Ein Leser kann eine halb geschriebene Präsenzdatei sehen. Das ist zulässig und vorgesehen: Lässt sie sich nicht parsen, wird sie ignoriert und beim nächsten Takt erneut gelesen. Kein Fehler, keine Meldung.
- **Veraltet ab 60 Sekunden** ohne Fortschreibung (Startwert, §10, A4). Die großzügige Schwelle folgt aus dem 10-Sekunden-Attribut-Cache plus Poll-Takt; ein knapperer Wert erzeugte falsche „offline"-Anzeigen.
- Präsenzdateien werden **nie** von fremden Clients gelöscht.

### §6.5 UDP nur als Beschleuniger

Ein UDP-Hinweis („Client X hat bis Offset Z geschrieben") darf einen Takt-A-Durchlauf vorziehen. Er darf niemals die Grundlage sein: Broadcast wird bei WLAN-Client-Isolation vollständig unterdrückt, geht bei mehreren Netzwerkadaptern in das falsche Netz, und die Windows-Firewall kann den Empfang ohne Administratorrechte verhindern (`nas-speicher-recherche.md` §1.10). Zudem kann ein Hinweis **vor** der Sichtbarkeit der Daten eintreffen; der vorgezogene Lesezugriff darf dann nichts finden, ohne dass das ein Fehler ist. Entscheidung 11 hält fest: nicht im kritischen Pfad.

### §6.6 Verhalten je Betriebssystem

Auflage 17 und M0.6 verlangen drei Betriebssysteme, Entscheidung 13 gewichtet sie: Windows ist das Produkt, macOS die Entwicklungsplattform mit Best-Effort-Paket, Linux nur CI-Lauf. Die Begründungen der vorstehenden Abschnitte stützen sich fast durchweg auf Belege zum Windows-Redirector. Hier steht, was auf den anderen beiden gilt und wo eine Annahme kippt.

**Windows.** Drei Metadaten-Caches im SMB-Client: `FileInfoCacheLifetime` 10 s, `DirectoryCacheLifetime` 10 s, `FileNotFoundCacheLifetime` 5 s (`nas-speicher-recherche.md` §1.2). Daraus folgen unmittelbar der Takt B von 10 Sekunden (§6.2), das Verbot der Größenabfrage (§5.4.2) und die großzügige Veraltet-Schwelle der Präsenz (§6.4). Rename scheitert mit `EPERM`/`EBUSY`, wenn ein anderer Client die Zieldatei ohne `FILE_SHARE_DELETE` geöffnet hält (§1.4) — deshalb kein Rename im Datenpfad und Überschreiben statt Rename bei der Präsenz. Der `SessTimeout` von 60 s (§1.8) begründet §8.4.

**macOS.** Die Verzeichnis-Enumeration ist ebenfalls gecacht und lässt sich nur per Root-Konfiguration abstellen (`/etc/nsmb.conf`, `dir_cache_off=yes` beziehungsweise `dir_cache_max_cnt=0`, wirksam erst nach Neu-Mount; `nas-speicher-recherche.md` §1.7). Eine Anwendung kann das nicht ändern, und dieses Konzept setzt es nicht voraus. Folge: Der Takt B von 10 Sekunden gilt auch hier, und die Zusage „bis zu 10 Sekunden für die erste Datei eines neuen Clients" ist auf macOS nicht besser als auf Windows und möglicherweise schlechter — Apple nennt keine Zahl. M0.5 misst das auf beiden Plattformen. Die tragende Entlastung ist auf macOS dieselbe wie auf Windows: Takt A liest am bekannten Offset und kommt ohne Verzeichnisauflistung aus; die Enumeration steckt allein im langsamen Takt.

**Linux.** Der CIFS-Client cacht Attribute standardmäßig nur 1 Sekunde (`actimeo=1`, `nas-speicher-recherche.md` §1.6) — deutlich kürzer als Windows. Das ändert nichts, weil das Verfahren keine Attribute auswertet; es macht die Zusagen auf Linux nur nicht schlechter. Zwei Mount-Optionen könnten das Verhalten verschlechtern, und beide treffen dieses Verfahren nicht: `cache=loose` erlaubt lockere Caching-Semantik, betrifft aber Daten, die je Datei nur ein einziger Schreiber schreibt; und Windows-Byte-Range-Locks sind über CIFS **mandatory** und können Lese- und Schreibvorgänge anderer blockieren (§1.3, §1.6) — dieses Verfahren setzt keine Byte-Range-Locks. Da der Mount ohnehin nicht durch die Anwendung kontrollierbar ist, verlässt sich das Konzept auf **keine** Mount-Option. Das ist der eigentliche Punkt: Die Portabilität kommt nicht daher, dass alle drei Systeme sich gleich verhielten, sondern daher, dass keine der Zusagen von einem Cache-Verhalten abhängt.

**Wann die Lease-Annahme kippt.** §5.4.2 und §6.2 stützen sich auf den Satz „Datenlesezugriffe gehen ohne gültige Lease zum Server durch und umgehen den Attribut-Cache" (`nas-speicher-recherche.md` §1.2, §4). Der Satz gilt für den Leser einer **fremden** Datei: Er hält auf sie keine Lease, sein Client muss also fragen. Er gilt **nicht** ohne Weiteres für den Schreiber, der seine eigene Datei dauerhaft offen hält — auf ein solches Handle kann der Server eine Write- oder RWH-Lease vergeben, und dann darf der SMB-Client eigene Lesevorgänge aus dem lokalen Puffer bedienen (§1.2). Genau dort läge der Fehler: Der Schreiber prüft in §5.4.2 das wahre Dateiende durch Lesen, und ein aus dem eigenen Cache bedienter Lesevorgang zeigte ihm nicht, was auf dem Server steht.

Deshalb, verbindlich: **Für die Feststellung des Share-Endes nach §5.4.2 und für die Prüfung nach §4.5 öffnet der Schreiber die Datei neu.** Er liest diese Prüfung nie über ein dauerhaft offenes Handle. Dies ist die einzige Stelle im Konzept, an der die Lease-Annahme kippt, und mit dieser Regel ist sie behandelt. Ob die Neuöffnung auf dem Synology-Gerät tatsächlich zum Server durchgeht, ist Teil der Messung A5 (§10).

---

## §7 Schnappschüsse

### §7.1 Zweck und Verwerfbarkeit

Ein Schnappschuss verkürzt den Erstlauf beim Öffnen eines Einsatzes. Er ist **jederzeit verwerfbar**: Wird jeder Schnappschuss gelöscht, muss sich derselbe Zustand allein aus den Ereignisdateien ergeben. Das ist in M0.4 als Eigenschaft zu prüfen, nicht nur zu behaupten.

### §7.2 Dateiname und Inhalt

`schnappschuesse\<hlc>-<clientId>.json`, wobei `<hlc>` die Textform fester Stellenzahl nach §3.2 ist. Damit sortiert die Verzeichnisauflistung bereits richtig.

Inhalt:

| Feld | Bedeutung |
|---|---|
| `foldVersion` | Version der Fold-Implementierung, die diesen Zustand erzeugt hat |
| `versionsvektor` | je Ereignisdatei: eingeflossener Offset, letzte Kettenprüfsumme, höchste Laufnummer |
| `zustand` | der materialisierte Zustand einschließlich der HLC je Feld (§7.4) |
| `zustandsHash` | SHA-256 über die kanonische Serialisierung von `zustand` nach §7.6 |
| `erzeugtVon` | `clientId` und Programmversion |

### §7.3 `foldVersion` ist eine harte Schranke

Auflage 4. Ein Client übernimmt einen Schnappschuss **nur**, wenn dessen `foldVersion` exakt seiner eigenen entspricht. Andernfalls ignoriert er ihn stillschweigend und faltet aus den Ereignissen. Jede Änderung an den Fold-Regeln erhöht `foldVersion`. Ein Schnappschuss aus einer älteren Programmversion darf niemals einen Zustand liefern, den die neue Regel anders berechnet hätte — das wäre ein stiller Falschzustand, die gefährlichste Fehlerklasse dieses Entwurfs.

`zustandsHash` erlaubt zusätzlich den Konvergenzvergleich zweier Clients ohne Übertragung des ganzen Zustands. Er ist das Messmittel für das Abbruchkriterium in M0.4 und M2.4; wie er gebildet und wogegen er verglichen wird, steht in §7.6.

### §7.4 HLC je materialisiertem Feld

Auflage 4. Jedes materialisierte Feld trägt die HLC des Ereignisses, das es gesetzt hat. Für die Speicherschicht ist das eine Anforderung an die Serialisierung: Der Schnappschuss muss diese Feld-HLCs mitschreiben, sonst kann nach dem Laden kein Rebase mehr entscheiden, ob ein nachträglich eintreffendes älteres Ereignis ein Feld noch überschreiben darf. Der Fold selbst ist in `KONZEPT-EREIGNISSE.md` beschrieben.

### §7.5 Schreiben und Aufräumen

- Ein Schnappschuss entsteht, wenn seit dem letzten mehr als **2.000 Ereignisse** eingeflossen sind oder mehr als **30 Minuten** vergangen sind — was zuerst eintritt. Startwerte nach §10, A4, in M0.4 zu prüfen.
- Jeder Client schreibt nur Schnappschüsse **unter seiner eigenen `clientId`** und löscht nur **eigene** Schnappschüsse. Damit bleibt „ein Schreiber je Datei" auch hier gewahrt.
- Ein Client behält seine jüngsten drei eigenen Schnappschüsse (§10, A4) und löscht ältere. Das Löschen kann unter Windows aus demselben Grund scheitern, den §6.4 für Rename anführt: wenn ein anderer Client die Datei ohne `FILE_SHARE_DELETE` geöffnet hält (`nas-speicher-recherche.md` §1.4). Das ist kein Fehler — es wird beim nächsten Aufräumlauf wiederholt, es liegen vorübergehend mehr Schnappschüsse als vorgesehen, gemeldet wird nichts. Seit fremde Schnappschüsse nicht mehr gelesen werden, tritt der Fall ohnehin praktisch nur noch auf, wenn ein Wartungswerkzeug den Ordner offen hält.
- **Ein Client übernimmt ausschließlich Schnappschüsse unter seiner eigenen `clientId`.** Fremde werden nicht gelesen und nicht ausgewertet. Beim Öffnen wird der jüngste **passende** eigene Schnappschuss gewählt; schlägt eine Prüfung fehl, der nächstältere, zuletzt der vollständige Fold.

**Warum keine fremden Schnappschüsse (Entscheidung Johannes, 2026-09-08).** Ein Schnappschuss ist das Ergebnis einer fremden Rechnung, nicht ein Auszug fremder Daten. Der `zustandsHash` ist über den Zustand selbst gebildet und belegt allein, dass die Datei in sich stimmt — nicht, dass der Zustand die Faltung der im Versionsvektor genannten Ereignisse ist. Ein Client mit Speicherfehler, mit einer halb ausgerollten Version bei unverändertem `foldVersion` oder schlicht mit einem Fehler im Fold verteilte seinen Falschzustand damit dauerhaft und unbemerkt an alle anderen — genau die Klasse, die §7.3 „die gefährlichste Fehlerklasse dieses Entwurfs" nennt, und ein Verstoß gegen §1.3 Satz 3. `nas-speicher-recherche.md` §10 sieht als Gegenmaßnahme vor, dass Leser „stichprobenartig gegen Neu-Fold" validieren. Im Betrieb mit bis zu fünf Clients ist der einfachere Weg tragbar: gar nicht erst annehmen. Der Preis ist ein vollständiger Fold, wenn ein Client einen laufenden Einsatz zum ersten Mal öffnet — nach der Abschätzung der Recherche (§4, unter 500 ms in Node bei 50.000 Ereignissen) ist er bezahlbar. Zeigt die Messung in M0.4, dass der Erstlauf zu lang wird, ist die Annahme fremder Schnappschüsse mit stichprobenartiger Nachfaltung nachzurüsten; bis dahin wird sie nicht gebaut. Vermerkt als Annahme A7 in §10.

Prüfungen beim Übernehmen eines eigenen Schnappschusses:

1. `foldVersion` gleich der eigenen (§7.3).
2. `zustandsHash` über den geladenen Zustand nach §7.6 nachgerechnet und gleich.
3. Für jede Datei des Versionsvektors stimmt die dort vermerkte `letzteKette` mit der überein, die der Leser für dieselbe Datei an demselben Offset in `upload-state.json` führt (§5.3). Diese Prüfung ersetzt die frühere Frage, ob die Datei „mindestens so lang wie der vermerkte Offset" sei — das wäre eine Größenabfrage gewesen, die §5.4.2 und §6.2 aus guten Gründen ausschließen. Der Kettenvergleich ist zugleich die schärfere Prüfung: Er belegt nicht nur, dass genug Bytes da waren, sondern dass es dieselben waren.
4. **Keine eigene Quarantänestelle wird übersprungen.** Führt der Leser für eine Datei ein `quarantaeneAb` (§8.2) und nennt der Versionsvektor des Schnappschusses für dieselbe Datei einen Offset **jenseits** dieser Stelle, wird der Schnappschuss **nicht** angenommen. Sonst holte sich der Leser über den Umweg eines älteren eigenen Schnappschusses genau die Ereignisse zurück, die er inzwischen als unlesbar verworfen hat — und zwar vermischt mit dem, was er direkt gelesen hat. Das Ergebnis wäre ein Zustand, den weder der Schnappschuss noch der eigene Fold erzeugt hätte, und niemand könnte ihn erklären. Die Bedingung bleibt auch bei ausschließlich eigenen Schnappschüssen nötig, weil eine Defektstelle erst nach dem Schreiben des Schnappschusses entstehen oder auffallen kann.

- Ein Leser mit Quarantäne schreibt **keine eigenen Schnappschüsse** mehr für diesen Einsatz. Sein Zustand ist unvollständig (§8.6).

### §7.6 Kanonische Serialisierung, Ruhephase und Konvergenzvergleich

Auflage 18 verlangt ein zählbares Abbruchkriterium, und 05-UMSETZUNGSPLAN.md misst M0 an „Konvergenz aller Clients per Hash nach jeder Ruhephase". Beides ist nur messbar, wenn drei Dinge festliegen: wie serialisiert wird, wann Ruhe herrscht und was verglichen wird.

**Kanonische Serialisierung.** Der `zustandsHash` ist SHA-256 über die UTF-8-Bytes dieser Serialisierung des Zustands, in voller Länge als 64 Hexzeichen:

- Objektschlüssel aufsteigend nach Unicode-Codepoint sortiert.
- Keine Leerzeichen, keine Zeilenumbrüche zwischen den Bestandteilen.
- Zahlen in der kürzesten Dezimaldarstellung nach ECMA-262 `Number::toString` — also genau das, was `JSON.stringify` erzeugt. Kein `-0`; die Zahl null wird als `0` geschrieben.
- Felder ohne Wert werden **weggelassen**, nicht als `null` geschrieben. Ein Feld, das nie gesetzt wurde, und ein Feld, das auf einen leeren Wert gesetzt wurde, sind damit unterscheidbar — Letzteres trägt eine Feld-HLC, Ersteres nicht.
- Leere Objekte und leere Listen bleiben erhalten.
- Zeichenketten mit den Maskierungen von `JSON.stringify`.
- **Die Feld-HLC aus §7.4 ist Bestandteil des Zustands und fließt ein.** Zwei Clients, die dieselben Werte, aber verschiedene Gewinner-HLC führen, sind *nicht* konvergent: Der nächste Rebase entschiede bei ihnen unterschiedlich. Ein Hash, der das verschwiege, ginge genau an der Eigenschaft vorbei, die er belegen soll.

**Ruhephase.** Sie ist über beobachtbare Größen definiert, ohne Dateigröße und ohne Metadatenabfrage. Ruhe herrscht, wenn für **jeden** teilnehmenden Client gilt:

1. Für jedes eigene Segment ist `shareOffset` gleich dem `lokalerVollstaendigerOffset` (§5.4.1) — es liegen keine unübertragenen eigenen Bytes.
2. Der letzte Takt-A-Durchlauf hat für jede bekannte, nicht abgeschlossene und nicht in Quarantäne stehende fremde Datei 0 Bytes geliefert.
3. Der letzte Takt-B-Durchlauf hat keine neue Datei und kein angekündigtes Nachfolgesegment gefunden.
4. Es ist kein Bedienschritt offen, der noch ein Ereignis erzeugen wird.

Und zwar für **zwei aufeinanderfolgende** Durchläufe je Takt. Der zweite Durchlauf ist nötig, weil ein einzelner leerer Takt A auch dann entsteht, wenn ein anderer Client gerade zwischen zwei Zeilen steht. In der Simulation (M0.4) sind diese vier Größen unmittelbar ablesbar; im Feldlauf (M0.5, M2.4) meldet sie `s1 akte pruefe` je Client.

**Was verglichen wird.** Verglichen wird nicht der Hash allein, sondern das Paar aus Versionsvektor und `zustandsHash`. Der Versionsvektor benennt die gesehene Ereignismenge vollständig: Weil jede Ereignisdatei append-only ist, bestimmt der Offset je Datei eindeutig, welche Ereignisse eingeflossen sind; die mitgeführte `letzteKette` belegt, dass es dieselben Bytes waren. „Dieselbe Ereignismenge gesehen" heißt damit operativ: identische Versionsvektoren.

Daraus folgen drei Ausgänge, und nur einer davon ist ein Fehler:

| Versionsvektoren | `zustandsHash` | Bewertung |
|---|---|---|
| gleich | gleich | **Konvergenz nachgewiesen.** Der Lauf zählt. |
| gleich | verschieden | **Fehler.** Gleiche Eingabe, verschiedenes Ergebnis — der Fold ist nicht deterministisch oder die Serialisierung nicht kanonisch. Das ist der rote Ausgang, an dem M0 abbricht. |
| verschieden | beliebig | **Nicht vergleichbar.** Die Ruhephase war nicht erreicht, oder ein Client steht in Quarantäne (§8.6.1). Kein Fehler, aber auch kein Nachweis: Der Lauf zählt nicht. |

Ohne diese Unterscheidung wäre ein roter Lauf nicht von einem falsch gemessenen zu trennen — und ein Testlauf, der absichtlich eine Zeile beschädigt, träfe zwangsläufig die dritte Zeile der Tabelle und sähe wie ein Fehler aus.

---

## §8 Fehlerbilder, Störfallverhalten und Zusicherungsgrenzen

Grundsatz: **Kein Fehlerbild führt zum Stillstand des Lesers.** Ein Defekt in einer Datei darf immer nur diese eine Datei ab der Fehlerstelle betreffen; alle anderen Schreiber werden weiter ausgewertet.

### §8.1 Unvollständige letzte Zeile

*Bild:* Die Datei endet mitten in einer Zeile — die angekündigte `länge` ist nicht vollständig vorhanden, oder der abschließende `\n` fehlt.

*Ursache:* Normalfall. Der Schreiber ist gerade dabei, oder ein Absturz oder Verbindungsabbruch traf ihn mitten im Anhängen.

*Verhalten:* Der Rest wird **nicht** ausgewertet, `leseOffset` bleibt vor der unvollständigen Zeile stehen. Beim nächsten Durchlauf ist sie entweder vollständig oder immer noch unvollständig. **Keine Meldung, kein Hinweis** — dies ist kein Fehler.

*Frist, nach der es einer wird:* Bleibt dieselbe unvollständige Zeile **fünf Minuten** lang unverändert unvollständig, ist der Normalfall ausgeschlossen — kein Schreibvorgang dauert so lange. Übrig bleiben zwei Ursachen, die beide behandelt gehören: Der Schreiber ist mitten in einer Zeile endgültig ausgefallen, oder das Längenfeld kündigt Bytes an, die es nie geben wird. Die Datei geht deshalb in eine **vorläufige Quarantäne** nach §8.2 über, mit demselben sichtbaren Hinweis. Vorläufig heißt: Anders als bei einer echten Defektstelle wird diese Datei in jedem Takt-B-Durchlauf erneut geprüft. Wird die Zeile später doch vollständig und kettenrichtig, fällt die Quarantäne ohne Zutun weg und die Datei kehrt in Takt A zurück. Ohne diese Frist bliebe der Datenstrom eines Arbeitsplatzes für alle anderen dauerhaft stehen, während §8.1 ausdrücklich „keine Meldung, kein Hinweis" verfügt und die Statuszeile weiter erfolgreiche Abfragen meldete — ein stiller Falschzustand in Reinform. Startwert nach §10, A4.

*Für den Schreiber:* Beim Start prüft er sein eigenes letztes Segment lokal und kürzt es auf die letzte vollständige, kettenrichtige Zeile. Auf dem Share setzt er nach dem Verfahren aus §5.4 auf: Er liest ab `shareOffset`, vergleicht mit den eigenen lokalen Bytes und hängt ab dem so festgestellten Ende an. Die Dateigröße wird dabei **nicht** erfragt (§5.4.2), und weil nur vollständige Zeilen gespiegelt werden (§5.4.1), kann die lokale Kürzung nie Bytes entfernen, die auf dem Share schon liegen.

### §8.2 Defekte Zeile in der Dateimitte

*Bild:* Eine Zeile ist vollständig vorhanden — die angekündigte `länge` Bytes sind da und es folgt ein `\n` —, aber `crc32` stimmt nicht, oder `vorgaenger` passt nicht zur berechneten Kette, oder das JSON ist nicht parsebar.

*Abgrenzung zu §8.1, verbindlich.* Jede Zeile fällt in genau eine dieser vier Regeln; sie werden in dieser Reihenfolge geprüft, und es wird nicht geraten:

1. `länge` ist keine Dezimalzahl ohne führende Null, hat mehr als sieben Ziffern oder überschreitet die Obergrenze von 1 MiB (§2.1) ⇒ **defekt**.
2. Es sind weniger Bytes vorhanden, als `länge` samt Trennzeichen und `\n` verlangt ⇒ **unvollständig** (§8.1), bis die Frist dort abläuft.
3. Es sind genug Bytes vorhanden, aber an der von `länge` angekündigten Stelle steht kein `\n` ⇒ **defekt**.
4. Bytes vollständig, `\n` an der richtigen Stelle, aber `crc32`, Kette oder JSON stimmen nicht ⇒ **defekt**.

Regel 1 und 3 fangen die Fälle ab, die eine verfälschte `länge` erzeugt: ein zu großer Wert läuft in Regel 1 oder — wenn er plausibel bleibt — in Regel 2 und dort in die Frist; ein zu kleiner Wert läuft in Regel 3, weil an der angekündigten Stelle dann kein Zeilenende steht. Weil der CRC das Längenfeld einschließt (§2.1), fällt eine verfälschte, aber zufällig noch plausible `länge` spätestens in Regel 4 auf. Damit gibt es keinen Wert des Längenfelds mehr, der weder eine Klasse noch einen Hinweis erzeugt.

Ebenfalls **defekt** ist eine Zeile, deren Ereignis-Identität `<clientId>:<laufnummer>` bereits mit **anderem** Inhalt gelesen wurde (§4.6). Eine wiederholte Zeile mit identischem Inhalt ist dagegen kein Defekt, sondern dasselbe Ereignis; sie wird übersprungen.

*Verhalten — Quarantäne ab Offset (Auflage 7):*

1. Alle Zeilen **vor** der Fehlerstelle bleiben gültig und ausgewertet.
2. `quarantaeneAb` wird auf den Offset der defekten Zeile gesetzt. Diese Datei wird ab dort nicht weiter ausgewertet und nicht weiter gepollt.
3. Die Oberfläche zeigt sichtbar und dauerhaft: „Die Einträge von *Arbeitsplatz X* ab HH:MM sind beschädigt und werden nicht angezeigt. Die Einträge aller anderen Arbeitsplätze sind vollständig." Kein technischer Text, aber auch keine Verharmlosung.
4. Alle anderen Dateien laufen unverändert weiter.
5. Bei jedem Programmstart wird die Quarantänestelle **einmal** erneut geprüft. Ein Defekt, der aus einem Lesefehler des Netzes stammte, verschwindet damit; ein echter Defekt bleibt.
6. `s1 akte pruefe` listet alle Quarantänestellen mit Datei, Offset und Zeitpunkt (Paket V.3).
7. **Die Konvergenzzusage ist für diesen Arbeitsplatz ausgesetzt**, solange die Quarantäne besteht. Was das heißt und was daraus folgt, steht in §8.6.

*Ausdrücklich nicht:* Kein Überspringen der defekten Zeile mit Weiterlesen dahinter. Nach einem Kettenbruch ist nicht mehr feststellbar, ob die Folgezeilen zur selben Kette gehören; sie auszuwerten hieße, unbestätigte Daten als bestätigt anzuzeigen.

### §8.3 Share nicht erreichbar

*Verhalten:* Die Arbeit läuft lokal ungestört weiter (§5.2). Die Spiegelung staut zurück (§5.4), das Lesen fremder Dateien liefert Fehler, die als „nicht erreichbar" gezählt werden. Die Statuszeile nennt Dauer und Anzahl der wartenden Einträge. Kein Dialog, keine Rückfrage, kein Merge-Schritt beim Wiederanschluss — die Konfliktregeln des Folds gelten immer gleich, ob ein Ereignis 2 Sekunden oder 2 Stunden alt ist.

### §8.4 Blockierender Dateizugriff

*Bild:* Ein Aufruf kehrt nicht zurück; der SMB-Client wartet bis zum `SessTimeout` von 60 Sekunden (`nas-speicher-recherche.md` §1.8).

*Verhalten:* Sämtliche Share-Zugriffe laufen im Worker-Thread je Akte, nie im Main-Prozess. Die Oberfläche bleibt in jedem Fall bedienbar. Als Lint-Regel: kein synchroner Datei- oder Netzaufruf im Main-Prozess (05-UMSETZUNGSPLAN.md, M2.1).

**Was der Zeitausstieg von 20 Sekunden leistet — und was nicht.** Ein laufender `fs`-Aufruf lässt sich in Node nicht abbrechen. Der Zeitausstieg (**Startwert 20 s**, deutlich unter dem SMB-Standard von 60 s; §10, A4) beendet deshalb **nicht** den Zugriff, sondern allein den Wartezustand der Oberfläche: Nach 20 Sekunden meldet die Statuszeile „Der Server antwortet seit 20 s nicht", und der Bediener arbeitet lokal ungestört weiter (§5.2). Der Aufruf selbst läuft weiter, bis er zurückkehrt — spätestens nach dem `SessTimeout`.

**Kein zweiter Versuch, solange der erste unterwegs ist.** Je Datei ist höchstens ein Zugriff offen; die Speicherschicht serialisiert das selbst und überlässt es nicht dem Aufrufer. Der Rückstau nach §5.4.4 beginnt seine Wartezeit erst zu zählen, wenn der erste Versuch zurückgekehrt ist. Ein Wiederholversuch neben einem noch hängenden Anhänge-Vorgang brächte zwei gleichzeitige Schreibvorgänge auf dieselbe Datei — genau den Zustand, den „ein Schreiber je Datei" ausschließen soll, und zwar unbemerkt, weil beide demselben Prozess gehören. Die 20 Sekunden sind damit ein Wert der Oberfläche, kein Wert des I/O.

### §8.5 Verstellte Uhr, geklontes Profil, zwei Instanzen

Verstellte Uhr: §3.2 (Delta-Grenze 5 Minuten, Warnung, kein Verwerfen). Geklontes Profil: §4.5 Fall 2 (neue Kennung, Klartextmeldung). Zwei Instanzen auf einem Rechner: §4.5 Fall 1 (`requestSingleInstanceLock`).

### §8.6 Was zugesichert wird — und was nicht

#### §8.6.1 Konvergenz

**Zugesichert:** Zwei Clients, die dieselbe Ereignismenge gesehen haben, berechnen denselben Zustand — nachprüfbar über den `zustandsHash` (§7.2). „Dieselbe Ereignismenge gesehen", „Ruhephase" und der Vergleich selbst sind in §7.6 als messbare Größen festgelegt; das ist das Kriterium, an dem M0.4 und M2.4 gemessen werden.

**Nicht zugesichert, sobald eine Quarantäne besteht.** Die Quarantäne wirkt je Leser (§8.2). Stößt Client A in der Datei von C auf einen Defekt, während Client B dieselben Bytes vorher fehlerfrei gelesen hat, sehen A und B dauerhaft **verschiedene Ereignismengen** und damit verschiedene Zustände. Das ist kein Programmfehler, sondern die unvermeidliche Folge davon, dass ein Leser fremde Dateien nicht reparieren darf. Wer es übersieht, hält später einen roten Konvergenztest für einen Fehler im Fold.

Daraus folgen vier Regeln:

1. **Sichtbar machen.** Ein Arbeitsplatz mit Quarantäne zeigt dauerhaft an, dass er weniger sieht als die anderen — nicht nur einmal beim Auftreten (§8.2, Punkt 3).
2. **Nicht weitergeben.** Er schreibt keine Schnappschüsse mehr (§7.5) und nimmt auch eigene ältere nicht an, die über seine Quarantänestelle hinausreichen.
3. **Aus dem Konvergenzvergleich herausnehmen.** `s1 akte pruefe` und die Simulation vergleichen die Hashes nur der Clients ohne Quarantäne und melden die übrigen getrennt als „unvollständige Sicht". Formal fällt ein solcher Client in die dritte Zeile der Tabelle in §7.6: verschiedene Versionsvektoren, deshalb nicht vergleichbar. Ein Testlauf, der eine Zeile absichtlich beschädigt, muss diesen Ausgang erwarten, statt an ihm zu scheitern.
4. **Wiederherstellungsweg.** Der einzige Weg zurück führt über den **Schreiber** der beschädigten Datei. Er hat den Inhalt lokal und stellt die Abweichung zwischen lokaler und Share-Datei beim nächsten Spiegelungslauf fest (§5.4.3). Entscheidend ist, dass er dabei in **Ausgang B** fällt und nicht in Ausgang C: Wäre jede Abweichung ein Fremdschreiberfall, verböte ihm §4.5 das Weiterschreiben unter dieser Kennung, und der einzige, der reparieren könnte, dürfte es nicht — bei gleichzeitig falscher Ursachenmeldung an den Bediener. Weil Ausgang B eine Beschädigung ohne fremde Schreibspur ist, schreibt er den fehlenden Teil als **Ersatzsegment** nach §4.6 neu. Danach gilt die Konvergenzzusage für die betroffenen Leser wieder.

   Ist er nicht mehr erreichbar, kann ein anderer Client seinen lokalen Spiegel als Datei ausleiten (`s1 akte exportiere`, Paket M4.4) und über die Einsatzakte einspielen — von Hand, sichtbar, nie automatisch. Der ausgeleitete Spiegel enthält nur geprüfte Zeilen (§5.5), gibt also keine defekten Bytes weiter. Automatisches Reparieren fremder Dateien bleibt ausgeschlossen: Es bräche die Regel „ein Schreiber je Datei", auf der die gesamte Statik ruht.

#### §8.6.2 Erkennbarkeit nachträglicher Änderungen

Auflage 14. Der Anspruch „revisionssicher" wird **nicht** erhoben.

**Zugesichert:** Eine nachträgliche Änderung **innerhalb** einer Schreiberkette ist erkennbar. Weil die Kette über den Segmentwechsel hinweg durchläuft (§2.3), gilt das auch über die Segmentgrenzen eines Schreibers hinweg — wird ein Segment in der Mitte geändert, gekürzt oder entfernt, bricht die Kette am Anfang des Folgesegments.

**Nicht zugesichert:** Wer Schreibzugriff auf das Verzeichnis hat, kann das **letzte** Segment eines Schreibers oder dessen **sämtliche** Dateien spurlos entfernen. Das ist mit dateibasierter Ablage ohne Serverprozess nicht verhinderbar. Was bleibt: Andere Clients haben denselben Inhalt in ihrem lokalen Spiegel, ein Vergleich fällt also im laufenden Betrieb auf, und `s1 akte pruefe` meldet eine fehlende Kettenfortsetzung, sobald eine Präsenzdatei oder ein Schnappschuss eine Datei nennt, die nicht mehr existiert. Das ist eine Erkennungshilfe, keine Revisionssicherheit, und wird gegenüber der Führungsstelle genau so benannt.

### §8.7 `manifest.json` und `mindestClientVersion`

`manifest.json` auf der Share-Wurzel trägt `formatVersion` und `mindestClientVersion`. Auflage 9, zweiter Teil: `mindestClientVersion` wirkt als **Warnung, nicht als Sperre**. Ein zu alter Client zeigt „Dieser Arbeitsplatz ist älter als vorgesehen; bitte aktualisieren", arbeitet aber weiter. Ein Programm, das sich im Einsatz selbst aussperrt, ist ein größerer Schaden als ein Programm, das eine unbekannte Ereignisart überspringt und darauf hinweist. Unbekannte Ereignisarten und unbekannte Felder werden toleriert und unverändert weitergespiegelt, damit ein alter Client die Daten eines neuen nicht beschädigt.

### §8.8 Lokale Schreibstörung

*Bild:* Der lokale Schreibweg nach §5.2 scheitert — volle Platte (`ENOSPC`), entzogenes Schreibrecht (`EACCES`), ein Virenscanner, der die Datei kurzzeitig hält (`EBUSY` unter Windows), ein defekter Datenträger (`EIO`).

*Warum das einen eigenen Abschnitt braucht:* §1.3 Satz 2 erklärt den lokalen Anhang zur Wahrheit, und §5.2 Schritt 4 lässt die Oberfläche das Ereignis unmittelbar zeigen. Scheitert Schritt 2, darf Schritt 4 nicht stattfinden. Ein Bedienschritt, den die Oberfläche annimmt und der nirgends steht, wäre der schlimmste Fehler dieses Entwurfs — schlimmer als ein sichtbar abgewiesener Bedienschritt. Der gesamte übrige Text behandelt Störungen auf dem Share; der Weg, den §1.3 zur Wahrheit erklärt, hatte bis hierher kein einziges Fehlerbild.

*Verhalten:*

1. Der Bedienschritt wird **sichtbar abgewiesen**. Die Eingabe bleibt im Formular stehen, der Wert wird nicht in den Zustand übernommen, und es erscheint: „Der Eintrag konnte auf diesem Rechner nicht gespeichert werden und wurde nicht übernommen." Kein stilles Verwerfen, kein Übernehmen auf Verdacht.
2. Die bereits erhöhte Laufnummer bleibt vergeben. §3.3 lässt Lücken ausdrücklich zu; ein Rückschritt der Laufnummer wäre der gefährlichere Fehler, weil er zwei Ereignissen dieselbe Identität geben könnte.
3. `EBUSY` und `EACCES` werden **einmal** nach kurzer Wartezeit wiederholt — ein Virenscanner-Zugriff ist typischerweise nach Millisekunden vorbei. Danach gilt Punkt 1.
4. Bei `ENOSPC` und `EIO` erscheint zusätzlich ein dauerhafter Hinweis in der Statuszeile, bis wieder erfolgreich geschrieben wurde. `ENOSPC` nennt den Grund im Klartext („Auf diesem Rechner ist kein Speicherplatz mehr frei"), weil der Bediener ihn selbst beheben kann.
5. Der Einsatz bleibt lesbar, und die Ereignisse der anderen Clients laufen weiter ein. Der Leitsatz „kein Stillstand" gilt auch hier: Der Arbeitsplatz wird zum Nur-Lesen-Platz, nicht zum toten Fenster.

### §8.9 Dauerhafte gegenüber vorübergehenden Share-Fehlern

Der Rückstau nach §5.4.4 wiederholt einen gescheiterten Zugriff endlos mit wachsendem Abstand. Für vorübergehende Fehler ist das richtig, für dauerhafte falsch: Wird einem Arbeitsplatz im laufenden Betrieb das Schreibrecht auf dem Share entzogen, liefert jeder Versuch `EACCES` — und §6.3 zeigte den Share dabei weiterhin als erreichbar, weil die Lesezugriffe ja funktionieren. Der Bediener sähe „alles in Ordnung" und übertrüge nichts mehr.

Zwei Klassen, verbindlich:

- **Vorübergehend** — `ETIMEDOUT`, `ENOTCONN`, `EHOSTUNREACH`, `ENETUNREACH`, `EBUSY`, jeder Fehler beim Verbindungsaufbau und jeder Zeitausstieg nach §8.4. Behandlung: Rückstau nach §5.4.4, Anzeige „Share nicht erreichbar seit HH:MM, N Einträge noch nicht übertragen".
- **Dauerhaft** — `EACCES`, `EPERM`, `EROFS` und `ENOSPC` auf dem Share. Behandlung: Der Rückstau geht sofort auf den langsamsten Takt (30 s), und die Statuszeile trennt den Zustand von der Erreichbarkeit: „Der Server ist erreichbar, nimmt von diesem Arbeitsplatz aber keine Einträge an (kein Schreibrecht). N Einträge liegen lokal bereit." Weiterversucht wird trotzdem — ein Recht kann zurückgegeben werden —, aber nicht mehr im Sekundentakt und nie unter einer Anzeige, die Erfolg suggeriert.

`ENOENT` auf dem Einsatzordner gehört in keine der beiden Klassen, sondern in den Fall aus §5.7 (Ordner verschoben, umbenannt oder archiviert).

---

## §9 Nachweis der Auflagen 4 bis 18

Die Kopfzeile nennt die Auflagen 4 bis 18 als Grundlage; deshalb sind sie hier alle geführt. Die Auflagen 15 bis 18 sind Abnahmeauflagen für M0 — sie werden nicht in diesem Dokument erfüllt, sondern in M0.4 bis M0.6. Was die Speicherschicht dafür bereitstellen muss, steht trotzdem hier, sonst fehlte den Prüfungen das Messmittel.

| Auflage (03-MEILENSTEINE.md) | Wo behandelt | Anmerkung |
|---|---|---|
| 4 · Fold als Mengenfunktion mit Rebase; HLC je materialisiertem Feld; Schnappschüsse tragen `foldVersion` | §7.2 bis §7.6 | Speicherseite: Schnappschussformat, `foldVersion` als harte Schranke, Feld-HLC, kanonische Serialisierung. Angenommen werden nur eigene Schnappschüsse (§7.5). Der Fold selbst gehört in `KONZEPT-EREIGNISSE.md` (M1.2) |
| 5 · HLC als Struktur vergleichen; Textform fester Stellenzahl | §3.2 | 13 + 6 Stellen, Vergleich als Struktur, Fortschreibungsregel für Erzeugen und Empfangen ausgeschrieben, Rückwärtssprung der eigenen Uhr abgefangen, Delta-Grenze 5 min mit benannter Kausalitätsfolge |
| 6 · Jedes setzende Ereignis trägt den Vorher-Wert; Abweichung ⇒ Konflikthinweis | §2.4, §2.5 | Speicherseite: `vorher` ist Rahmenfeld und wird unverändert durchgereicht. Auswertung im Fold |
| 7 · Vorgänger-Hash beim Lesen prüfen; defekte Zeile ⇒ Quarantäne ab Offset, kein Stillstand | §2.1, §2.3, §8.1, §8.2 | Die Abgrenzung unvollständig ↔ defekt besteht aus vier Regeln, in die jede Zeile fällt. `länge` ist durch den CRC und die Obergrenze gedeckt; eine unvollständige Zeile wird nach Fristablauf zum sichtbaren Defekt |
| 8 · Ereignis-ID mit persistenter, monotoner Laufnummer; Fremdschreiber-Erkennung; Single-Instance-Lock | §3.3, §4.4, §4.5, §5.4.3 | Erkennung über die zuletzt vergebene Laufnummer plus Inhaltsvergleich; damit fällt auch die symmetrische Klon-Lage auf. Im laufenden Betrieb über Ausgang C der Spiegelung, ohne Größenabfrage |
| 9 · Segmentwechsel nach Größe, nicht bei jedem Start; `mindestClientVersion` als Warnung | §4.2, §8.7 | Startwert 4 MiB, Begründung über Poll-Kosten, Rechenweg korrigiert |
| 10 · Zyklusregel; relative Stärkeänderung; Auffangregel für aufgelöste Abschnitte | — | **Fachliche Fold-Regeln, gehören nach `KONZEPT-EREIGNISSE.md` (M1.2).** Für die Speicherschicht ohne Anforderung; hier bewusst nicht dupliziert |
| 11 · Undo als normales Ereignis mit `undoOf`, Stapel je Client, `KorrekturVon`, kein Redo | §2.4, §4.4 | Speicherseite: `undoOf` und `korrekturVon` sind Rahmenfelder ohne Sonderpfad; der Undo-Stapel wird aus dem lokalen Spiegel abgeleitet, übersteht damit den Neustart und braucht keine eigene Datei (§4.4). Semantik im Ereigniskonzept |
| 12 · „Neueste Revision zählt" über HLC; Meldezeit anzeigen und plausibilisieren | §3.1, §3.2 | Trennung technischer und fachlicher Zeit hier festgelegt; die Plausibilisierungsschwelle je Feld im Ereigniskonzept |
| 13 · Ereignis nach `archiv.marker` hat genau eine Behandlung; Ordnerverschiebung darf keinen Upload ins Leere laufen lassen | §5.7 | Archiviert wird durch das Ereignis `EinsatzArchiviert`; der Marker ist ein abgeleiteter Anzeiger mit festgelegtem Inhalt. Damit ist der HLC-Vergleich ausführbar. Das Ereignis wird angenommen und gekennzeichnet, nie verworfen |
| 14 · Anspruch „revisionssicher" streichen | §8.6 | Zusicherung und Nicht-Zusicherung getrennt benannt |
| 15 · Feindliche Dateisystem-Schicht in der Simulation | — (M0.4) | Abnahmeauflage. Speicherseitig sind die zu injizierenden Störungen hier einzeln benannt und damit als Testfall formulierbar: abgeschnittene Zeile (§8.1), defekte Zeile (§8.2), blockierender Aufruf (§8.4), dauerhafter Share-Fehler (§8.9), lokale Schreibstörung (§8.8), Beschädigung und Fremdschreiber (§5.4.3, Ausgänge B und C) |
| 16 · SMB-Latenzmessung und Gesamtkosten eines Poll-Zyklus bei fünf Clients | — (M0.5) | Abnahmeauflage. Speicherseitig: die Startwerttabelle in §10 benennt je Wert, wogegen kalibriert wird; §6.2 nennt die anzusetzende Dateizahl |
| 17 · Läufe auf mindestens zwei Betriebssystemen; CI-Jobs auf Windows und macOS/Linux | §6.6 (M0.5, M0.6) | Speicherseite: Verhalten je Betriebssystem und die eine Stelle, an der die Lease-Annahme kippt. Die Läufe selbst sind Abnahme |
| 18 · Zählbares Abbruchkriterium; Property 1 keine Tautologie | §7.6 (M0.2, M0.4) | Speicherseite vollständig: kanonische Serialisierung, Ruhephase über vier beobachtbare Größen, Vergleich mit mitgeführtem Versionsvektor und drei Ausgängen. Dass Property 1 keine Tautologie über die Sortierfunktion ist, betrifft `@s1/domaene` und wird in M0.2 nachgewiesen |

### Was hier nur teilweise erfüllt ist

Damit die Tabelle nicht mehr behauptet, als der Text hergibt:

- **Auflage 4** ist auf der Speicherseite erfüllt, die Annahme fremder Schnappschüsse aber bewusst **weggelassen** statt abgesichert (§7.5, Annahme A7). Zeigt M0.4, dass der Erstlauf ohne sie zu lang wird, ist die Auflage erst mit der stichprobenartigen Nachfaltung erfüllt.
- **Auflagen 10, 11 und 12** haben eine fachliche Hälfte, die ausdrücklich nicht hier steht. Erfüllt sind sie erst mit `KONZEPT-EREIGNISSE.md`.
- **Auflage 13** setzt voraus, dass der Ereigniskatalog das Ereignis `EinsatzArchiviert` führt. Dieses Dokument setzt es voraus (§5.7); geschrieben wird es in M1.2.
- **Auflagen 15 bis 18** sind Abnahmeauflagen. Hier steht das Messmittel, nicht die Messung. Ein grüner Nachweis entsteht in M0.4 bis M0.6, nicht in diesem Dokument.

---

## §10 Offene Punkte und Annahmen

| Nr. | Punkt | Behandlung |
|---|---|---|
| A1 | `fsync` je Ereignis auf dem echten Share bezahlbar (< 300 ms) | Messung M0.5; Gegenmaßnahme Bündelung, §2.2 |
| A2 | 400 bis 600 Byte je Ereignis im Mittel | Prüfung an der Simulation M0.4, §2.6 |
| A3 | 8 Hexziffern als Dateinamenspräfix kollisionsfrei | Prüfung beim ersten Schreiben, §4.1 |
| A4 | **Sämtliche Startwerte.** Vollständige Liste unter der Tabelle | zu kalibrieren in M0.5, teils zu prüfen in M0.4; keiner dieser Werte ist eine Zusage |
| A5 | Verhalten des Synology-SMB-Servers bei `fsync`, bei gleichzeitigem Anhängen und Lesen derselben Datei, und ob eine Neuöffnung durch den Schreiber zum Server durchgeht (§6.6) | M0.5; die Belege in §1 der Recherche sind Client- und Protokollbelege, keine Messung an diesem Gerät |
| A6 | Ob die Windows-Firewall UDP ohne Administratorrechte zulässt | M0.5; ohne Freigabe entfällt der Beschleuniger ersatzlos (§6.5), das Verfahren bleibt vollständig |
| A7 | Der Erstlauf beim Öffnen eines laufenden Einsatzes bleibt ohne fremde Schnappschüsse bezahlbar | Prüfung M0.4, §7.5. Wird er zu lang, ist die Annahme fremder Schnappschüsse mit stichprobenartiger Nachfaltung nachzurüsten — bis dahin wird sie nicht gebaut |
| A8 | Die Segmentierung erzeugt im Feld mehr Dateien in Takt A als es Arbeitsplätze gibt | Messung M0.5 mit 10 Segmenten bei 5 Clients, §6.2 |

### Die Startwerte zu A4, vollständig

Die Einleitung sagt zu, dass jede Zahl, die erst durch die Messung bestimmt wird, als Startwert gekennzeichnet und hier geführt ist. Das ist die Liste:

| Wert | Startwert | Wo | Wogegen kalibriert |
|---|---|---|---|
| Takt A (kurzer Poll) | 3 s | §6.2 | gemessene Zykluskosten, mindestens deren Doppeltes |
| Takt B (Verzeichnisauflistung) | 10 s | §6.2 | Directory-Cache; zugleich die Zusage aus 02-ZIELBILD.md |
| Verfall aus Takt A nach Stillstand | 5 min | §6.2 | Poll-Kosten gegen Wiederentdeckungszeit |
| Frist, ab der eine unvollständige Zeile als defekt gilt | 5 min | §8.1 | derselbe Wert; er darf den Verfall nicht unterschreiten |
| Segmentgröße | 4 MiB | §4.2 | Lesezeit eines vollständigen Erstlaufs |
| Obergrenze je Zeile | 1 MiB | §2.1 | wird nicht gemessen; Plausibilitätsschranke weit über A2 |
| Schnappschuss-Auslöser | 2.000 Ereignisse oder 30 min | §7.5 | Erstlaufzeit gegen Schreiblast, M0.4 |
| Aufbewahrte eigene Schnappschüsse | 3 | §7.5 | Speicherplatz gegen Rückfalltiefe |
| Zeitausstieg der Oberfläche | 20 s | §8.4 | gemessene Antwortzeiten; muss unter dem `SessTimeout` von 60 s bleiben |
| Rückstau-Staffel der Spiegelung | 2 / 5 / 15 / 30 s | §5.4.4 | Wiederanlaufzeit des NAS |
| Präsenztakt | 15 s | §6.4 | Schreiblast gegen Anzeigegenauigkeit |
| Präsenz gilt als veraltet | 60 s | §6.4 | Attribut-Cache plus Poll-Takt |
| Delta-Grenze fremder Uhren | 5 min | §3.2 | wird **nicht** gemessen; folgt dem Vorbild `uhlc` (`nas-speicher-recherche.md` §1.11) und steht hier nur, damit jede Zahl des Dokuments an einer Stelle geführt ist |

Der Fünf-Minuten-Verfall aus §4.3 ist kein eigener Wert mehr, sondern der Verfall aus §6.2, angewandt auf ein angekündigtes Nachfolgesegment.
