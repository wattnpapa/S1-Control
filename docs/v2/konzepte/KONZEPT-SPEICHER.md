# KONZEPT-SPEICHER — Ereignisprotokoll auf dem Share

Stand: 2026-09-08 · Paket M0.1 · Status: **Ueberarbeitungsbeduerftig** — unabhaengig geprueft, Urteil „haelt mit Auflagen". Sechs schwerwiegende, acht mittlere und neun kleine Befunde stehen offen; sie sind in [GUTACHTEN-SPEICHER-01.md](GUTACHTEN-SPEICHER-01.md) einzeln aufgefuehrt. **Vor Abarbeitung der schwerwiegenden Befunde entsteht kein Code fuer M0.2 bis M0.4** — S3 und S4 sind so nicht baubar, S6 macht das Abbruchkriterium von M0 unmessbar.

Verbindliche Grundlagen: [ADR-002](../adr/ADR-002-ereignisprotokoll-statt-lockfile.md), [02-ZIELBILD.md](../02-ZIELBILD.md) Abschnitt „Speichermodell", [03-MEILENSTEINE.md](../03-MEILENSTEINE.md) Auflagen 4 bis 18. Belege für das SMB-Verhalten: `docs/v2-arbeitsstand/bestandsaufnahme/nas-speicher-recherche.md` §1 und §4.

Dieses Dokument ist die Spezifikation, gegen die die Pakete M0.2 bis M0.4 gebaut werden. Code-Kommentare in `@s1/speicher` verweisen auf die Paragraphen dieses Dokuments. Wo eine Zahl erst durch die Messung M0.5 am echten Synology-Share bestimmt wird, steht hier ein **Startwert** mit Begründung, kein Ratewert ohne Kennzeichnung.

---

## §1 Zweck, Geltungsbereich und Abgrenzung

### §1.1 Was dieses Konzept festlegt

Wie ein Einsatz als Append-only-Ereignisprotokoll auf einem SMB-Share liegt, wie Clients daraus lesen und darin schreiben, und wie sich das System verhält, wenn etwas kaputtgeht. Konkret: Zeilenformat und Hash-Kette (§2), Zeit und Identität (§3), Segmente und Schreiberidentität (§4), lokaler Spiegel, Offsets und Archivierung (§5), Sichtbarkeit über Poll und Präsenz (§6), Schnappschüsse (§7), Fehlerbilder und die Grenzen der Zusicherung (§8).

### §1.2 Was dieses Konzept nicht festlegt

Der **Ereigniskatalog** — welche Ereignisarten es gibt, welche Nutzlast sie tragen, welche Konfliktregel je Art gilt, wie der Fold die Felder materialisiert — gehört in `KONZEPT-EREIGNISSE.md` (Paket M1.2, Quelle: `docs/v2-arbeitsstand/entwurf/zieldatenmodell-feldabgleich.md` §4). Dieses Dokument behandelt Ereignisse als undurchsichtige Nutzlast mit einem festen Rahmen (§2.4). Wo eine Auflage aus 03-MEILENSTEINE.md fachlich in den Fold gehört (Auflagen 10, 11, 12), ist hier nur die **Anforderung an die Speicherschicht** notiert; die fachliche Regel steht im Ereigniskonzept. §9 hält diese Zuordnung nach.

### §1.3 Die drei tragenden Sätze

1. **Ein Schreiber je Datei.** Kein Client verändert jemals eine Datei, die ein anderer Client geschrieben hat — keine Sperre, kein Master, keine TTL, kein Ersetzen per Rename im Datenpfad. Damit trifft keine der belegten SMB-Schwächen den Schreibpfad: Mandatory Byte-Range-Locks, Oplock- und Lease-Breaks, die Metadaten-Caches des Windows-Redirectors und die nicht-atomare Übernahme veralteter Sperrdateien treffen ausschließlich Modelle, in denen mehrere Clients dieselbe Datei schreiben oder ersetzen (`nas-speicher-recherche.md` §1.2 bis §1.4).
2. **Zuerst lokal, dann auf den Share.** Jedes Ereignis wird zuerst an die lokale Datei angehängt und mit `fsync` dauerhaft gemacht. Die Spiegelung auf den Share ist ein wiederholbarer Append ab einem gemerkten Offset. Der NAS-Ausfall ist der Normalpfad, kein Fehlerpfad.
3. **Wahrheit sind die Ereignisse.** Schnappschüsse sind Beschleuniger und jederzeit verwerfbar. Kein Verfahren in diesem Konzept darf einen Zustand erzeugen, der sich nicht allein aus den Ereignisdateien wiederherstellen lässt.

### §1.4 Dateilayout

```
<share>\S1-Control\
  manifest.json                              §8.7
  einsaetze\<datum>_<slug>_<kurzid>\
    einsatz.json                             unveraenderlich, §5.6
    ereignisse\<clientId>.<segment>.jsonl    ein Schreiber je Datei, §2, §4
    schnappschuesse\<hlc>-<clientId>.json    §7
    praesenz\<clientId>.json                 §6.4
    anhaenge\                                inhaltsadressiert, unveraenderlich
    ausgaben\                                erzeugte Ausdrucke, HTML-Monitor
    archiv.marker                            §5.7
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
| `länge` | Dezimalziffern, ASCII, ohne führende Null | Anzahl der Bytes von `<json>` in UTF-8, ohne Trennzeichen und ohne `\n` |
| `crc32` | genau 8 Zeichen, Hexadezimal, Kleinbuchstaben | CRC-32 (IEEE 802.3, Polynom `0xEDB88320`) über genau diese `länge` Bytes |
| `json` | UTF-8, keine rohen Zeilenumbrüche | der Ereignisrahmen nach §2.4 |
| `\n` | ein Byte `0x0A` | Zeilenende |

Trennzeichen ist der Tabulator `0x09`. `JSON.stringify` erzeugt niemals rohe Zeilenumbrüche oder Tabulatoren außerhalb von Zeichenketten, und innerhalb von Zeichenketten werden sie maskiert. Damit ist die Zeilengrenze eindeutig, ohne dass der Leser JSON parsen muss.

**Warum ein Längenpräfix zusätzlich zum Zeilenumbruch:** Der Leser kann so ein Teilschreiben von einem echten Defekt unterscheiden, ohne zu raten (§8.2). Er weiß nach den ersten Bytes, wie viele Bytes er erwartet.

### §2.2 Schreiben

Ein Ereignis wird mit **einem einzigen** `write` an das bekannte Dateiende geschrieben, gefolgt von `fsync`. Kein Read-Modify-Write, kein Rename, kein Zwischenpuffer über mehrere Ereignisse hinweg.

`fsync` hat über SMB eine definierte Bedeutung: SMB2 FLUSH weist den Server an, den Objektspeicher zu leeren, und blockiert bis zum Abschluss (`nas-speicher-recherche.md` §1.9). Ohne `fsync` darf der Client unter einer Write-Lease lokal puffern; ein Absturz oder Netzabbruch vor dem Lease-Break verlöre den Inhalt. Deshalb ist `fsync` je Zeile Pflicht, lokal wie auf dem Share.

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
| `typ` | Ereignisart; die Speicherschicht kennt davon nur `SegmentAbgeschlossen` (§4.3) |
| `akteur` | Anzeigename und Rechnername des Bedieners (kein Rollen- und Rechtemodell, Entscheidung 9) |
| `wanduhr` | ISO-8601 mit Zeitzone, **nur zur Anzeige und Plausibilisierung**, nie zur Ordnung (§3.1) |
| `vorher` / `neu` | gesehener Vorher-Wert und neuer Wert bei setzenden Ereignissen (§2.5) |
| `nutzlast` | fachliche Nutzlast, für die Speicherschicht undurchsichtig |
| `undoOf` | optional; Undo ist ein gewöhnliches Ereignis ohne Sonderpfad in der Speicherschicht |

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

**Verhalten beim Zählerüberlauf.** Der Fall ist praktisch unerreichbar — eine Million Ereignisse in einer Millisekunde —, aber „praktisch unerreichbar" ist kein definiertes Verhalten. Regel: Erreicht der Zähler 999.999, wartet der Schreiber, bis die Wanduhr die nächste Millisekunde erreicht, und beginnt dort mit Zähler 0. Das ist eine Wartezeit von höchstens einer Millisekunde und niemals ein Fehler; der Leitsatz „kein Stillstand" gilt auch hier. Ein Zähler, der trotz Wartens nicht zurückgesetzt werden kann, weil die Uhr steht, wird als Uhrfehler nach §8.5 gemeldet.

**Schutz gegen fremde Fehluhren:** Zieht ein empfangener HLC-Wert die eigene Uhr um mehr als **5 Minuten** nach vorn, wird er nicht übernommen. Das Ereignis wird normal gefaltet, aber die eigene physische Komponente folgt ihm nicht, und die Oberfläche zeigt „Uhr eines anderen Rechners weicht um X ab". Vorbild: `uhlc::ExceedingDeltaError` (`nas-speicher-recherche.md` §1.11). Betriebsvoraussetzung ist ohnehin ein vorhandener NTP-Abgleich.

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

**Startwert: 4 MiB je Segment.** Bei Annahme A2 sind das rund 7.000 bis 10.000 Ereignisse. Der größte erwartete Einsatz (Entscheidung 10: 100 bis 300 Einheiten) bleibt damit bei einem einzigen Segment je Schreiber; die Simulationsobergrenze von 5.000 Einheiten ergibt rund 5 bis 8 Segmente je Schreiber. Bei 5 Clients sind das im schlimmsten Fall rund 40 Dateien, von denen aber nur 5 überhaupt wachsen können (§6.2). Der Wert wird in M0.5 gegen die gemessene Lesezeit eines vollständigen Erstlaufs kalibriert.

### §4.3 Abschlusszeile

Beim Wechsel schreibt der Schreiber als **letzte Zeile** des alten Segments ein Ereignis vom Typ `SegmentAbgeschlossen` mit der Nummer des Nachfolgesegments und der Kettenprüfsumme, mit der das Nachfolgesegment beginnt. Erst danach entsteht die erste Zeile des neuen Segments.

Das leistet dreierlei: Leser wissen, dass ein Segment endgültig fertig ist und nie wieder gepollt werden muss (§6.2); die Hash-Kette läuft über den Segmentwechsel hinweg durch (§2.3); und ein fehlendes Nachfolgesegment fällt beim Lesen auf, statt still zu verschwinden.

Stürzt der Schreiber zwischen Abschlusszeile und erster Zeile des neuen Segments ab, findet der Leser eine Abschlusszeile ohne Nachfolger. Das ist kein Defekt, sondern ein Wartezustand: Der Leser behandelt das Nachfolgesegment als „angekündigt, noch nicht vorhanden" und pollt es (§6.2). Der Schreiber setzt beim nächsten Start dort auf.

**Verfall des Wartezustands.** Kehrt der Schreiber nicht zurück, dürfte dieser Poll sonst für den Rest des Einsatzes laufen. Deshalb: Erscheint ein angekündigtes Nachfolgesegment **fünf Minuten** lang nicht und ist zugleich die Präsenzdatei desselben Clients veraltet (§6.4), fällt das Segment aus dem kurzen Takt A in den langen Takt B zurück. Es gilt damit nicht als verloren — taucht es später auf, wird es normal gelesen —, es kostet nur nicht mehr alle zwei Sekunden einen Zugriff. Der Wert ist ein Startwert nach §10, A4.

### §4.4 `schreiber.json` — der lokale Schreiberzustand

Liegt ausschließlich lokal, nie auf dem Share:

```
{ "clientId": "...", "laufnummer": 4711, "segment": 3,
  "lokalerOffset": 1234567, "letzteKette": "a1b2…" }
```

Geschrieben wird lokal per Schreiben in eine `.tmp`-Datei plus Rename — auf einem lokalen Dateisystem ist das der übliche, atomare Weg. Auf dem Share ist Rename im Datenpfad verboten (§1.3); lokal gilt dieses Verbot nicht.

### §4.5 Fremdschreiber-Erkennung

Auflage 8. Zwei Fälle sind zu erkennen:

**Fall 1 — zwei Instanzen auf demselben Rechner.** Verhindert durch `requestSingleInstanceLock` von Electron. Das ist verbindlich, nicht optional (02-ZIELBILD.md, Speichermodell Nr. 8).

**Fall 2 — geklontes Benutzerprofil.** Wird das Anwendungsdatenverzeichnis kopiert (Rechner-Klon, wiederhergestelltes Backup, mitgenommenes Profil), existiert dieselbe `clientId` mit derselben Laufnummer zweimal. Erkennung beim Öffnen eines Einsatzes:

1. Lies das eigene letzte Segment **auf dem Share** bis zum Ende.
2. Vergleiche die höchste dort gefundene `laufnummer` mit der eigenen aus `schreiber.json`.
3. Ist die Laufnummer auf dem Share **größer oder gleich** der eigenen nächsten, hat ein anderer Prozess mit derselben `clientId` geschrieben.

Reaktion: Der Client **schreibt nicht weiter** unter dieser Kennung. Er erzeugt eine neue `clientId`, beginnt ein eigenes Segment `0000`, hängt seine noch nicht hochgeladenen lokalen Ereignisse unter der neuen Kennung an, und meldet im Klartext: „Dieses Benutzerprofil wurde offenbar kopiert. Der Rechner arbeitet ab jetzt unter einer neuen Kennung weiter; bereits geschriebene Einträge bleiben erhalten." Kein stilles Weiterschreiben, kein Datenverlust, keine überschriebene Fremdzeile.

Zusätzlich prüft der Schreiber bei **jedem** Anhängen, dass der Share-Offset seines Segments dem gemerkten Upload-Offset entspricht (§5.3). Weicht er ab, ist ebenfalls Fall 2 eingetreten, und es gilt dieselbe Reaktion.

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

Eigenschaften:

- **Wiederholbar, und das wahre Dateiende wird gelesen, nicht erfragt.** Der Offset wird erst nach erfolgreichem `fsync` fortgeschrieben; nach einem Abbruch kann die Share-Datei also weiter sein als der gemerkte `shareOffset`. Das wahre Ende wird **durch Lesen** bestimmt: ab `shareOffset` wird gelesen, bis nichts mehr kommt, und die gelesenen Bytes werden mit den eigenen lokalen Bytes an derselben Stelle verglichen.

  **Nicht über `stat` oder die Dateigröße.** Das wäre derselbe Fehler, den §6.2 für den Lesepfad ausschließt: Die Metadaten-Caches des Windows-Redirectors liefern bis zu 10 Sekunden alte Werte (`nas-speicher-recherche.md` §1.2). Eine zu klein gemeldete Größe würde bereits übertragene Bytes ein zweites Mal anhängen — und damit doppelte Ereigniszeilen in der eigenen Datei erzeugen, den einen Fehler, den dieses Verfahren per Konstruktion ausschließen soll. Datenlesezugriffe gehen ohne gültige Lease zum Server durch und umgehen den Attribut-Cache; deshalb ist Lesen hier die einzige zulässige Feststellung.

  Stimmen die verglichenen Bytes nicht überein, hat ein Fremdschreiber in die eigene Datei geschrieben: Fall 2 nach §4.5. Stimmen sie überein, wird ab dem festgestellten Ende weiter angehängt. Eine bei einem Abbruch entstandene Bruchstückzeile am Dateiende ist für alle Leser harmlos (§8.1); sie wird auf diesem Weg vervollständigt, weil die lokale Datei byteweise identisch ist und ab derselben Stelle fortgeschrieben wird.
- **Aus dem Worker, nie aus dem Main-Prozess.** Ein blockierender SMB-Aufruf kann bis zu 60 Sekunden hängen, bevor ein Fehler kommt (`SessTimeout`, `nas-speicher-recherche.md` §1.8). Im Electron-Main-Prozess stünde damit die gesamte Oberfläche. Das ist als Lint-Regel zu erzwingen (05-UMSETZUNGSPLAN.md, M2.1).
- **Mit Rückstauverhalten.** Scheitert die Spiegelung, wird sie mit wachsendem Abstand erneut versucht (Startwerte: 2 s, 5 s, 15 s, danach 30 s dauerhaft). Die Oberfläche zeigt „Share nicht erreichbar seit HH:MM, N Einträge noch nicht übertragen". Kein Dialog, keine Nachfrage, kein Blockieren der Arbeit.

### §5.5 Leseweg

Der Leser holt für jede fremde Datei die Bytes ab `leseOffset`, hängt sie an die lokale Spiegelkopie an, prüft die Zeilen (§2.1, §2.3) und schreibt `leseOffset` fort. Nur vollständige, geprüfte Zeilen werden übernommen; ein unvollständiger Rest bleibt liegen und wird beim nächsten Durchlauf zusammen mit dem Nachschub ausgewertet.

### §5.6 `einsatz.json`

Wird beim Anlegen des Einsatzes **einmal** geschrieben und danach nie wieder verändert. Es trägt nur, was zur Identifikation des Ordners nötig ist: Einsatz-Kennung, Anlagezeitpunkt, anlegender Client, `formatVersion`. Alle fachlichen Stammdaten — auch der Einsatzname — sind Ereignisse und damit änderbar. Das Anlegen erfolgt mit „nur erzeugen, wenn nicht vorhanden" (`flag: 'wx'`); dass diese Atomarität über SMB serverseitig entschieden wird, ist für den einmaligen Anlegevorgang tragbar (`nas-speicher-recherche.md` §1.4).

### §5.7 Archivierung und Ordnerverschiebung

Auflage 13. Zwei Anforderungen, die die Speicherschicht erfüllen muss.

**Ereignis nach `archiv.marker` — genau eine Behandlung.** Sobald ein Client die Datei `archiv.marker` sieht, wechselt er für diesen Einsatz in einen Nur-Lesen-Zustand und bietet keine ändernden Bedienschritte mehr an. Trifft dennoch ein Ereignis mit einer HLC **nach** der HLC des Markers ein — weil ein anderer Client offline weitergearbeitet hat —, dann gilt: **Das Ereignis wird angenommen, gefaltet und wirkt.** Es wird zusätzlich als „nach Archivierung eingegangen" gekennzeichnet, erscheint im Einsatztagebuch mit diesem Hinweis, und die Oberfläche meldet „Der Einsatz war bereits archiviert; N nachträgliche Einträge sind eingegangen." Verworfen wird nichts. Stilles Verwerfen wäre der schlimmere Fehler, und ein Einsatz, der nachträglich einen Eintrag bekommt, ist ein realer Vorgang, kein Programmfehler.

**Ordnerverschiebung darf keinen Upload ins Leere laufen lassen.** Wird der Einsatzordner auf dem Share verschoben, umbenannt oder archiviert, während ein Client noch unübertragene Ereignisse hat, darf der Wiederholversuch den Ordner **nicht neu anlegen**. Deshalb prüft jeder Spiegelungsversuch zuerst, ob unter dem gemerkten Pfad eine `einsatz.json` mit der erwarteten Einsatz-Kennung liegt. Ist sie nicht da oder trägt sie eine andere Kennung, wird die Spiegelung angehalten und im Klartext gemeldet: „Der Einsatzordner ist unter dem bekannten Pfad nicht mehr auffindbar. N Einträge liegen lokal bereit und werden übertragen, sobald der Pfad wieder stimmt." Die Ereignisse bleiben lokal vollständig erhalten; ein neuer Pfad kann in den Einstellungen gesetzt werden, danach läuft die Spiegelung ab dem gemerkten Offset weiter.

---

## §6 Sichtbarkeit: Poll, Präsenz, UDP

### §6.1 Warum Polling und nicht Beobachten

`fs.watch` ist laut Node-Dokumentation über NFS und SMB nicht verlässlich; vergleichbare Bibliotheken sagen dasselbe; SMB2 CHANGE_NOTIFY hängt an der Konfiguration des NAS (`nas-speicher-recherche.md` §1.5). Polling ist die einzige portable Grundlage. Dateibeobachtung darf höchstens als Beschleuniger ergänzt werden, nie als Wahrheit.

### §6.2 Zwei Takte

**Takt A — bekannte, noch wachsende Dateien (kurz).** Für jede fremde Datei, die weder abgeschlossen noch in Quarantäne ist, wird direkt am bekannten `leseOffset` gelesen. Kein `stat`, kein `mtime`-Vergleich: Ein Datenlesezugriff geht ohne gültige Lease zum Server durch, während die Attribut-Caches des Windows-Redirectors bis zu 10 Sekunden alte Werte liefern (`nas-speicher-recherche.md` §1.2). Kommen 0 Bytes zurück, ist nichts Neues da; kommen Bytes zurück, werden sie nach §5.5 verarbeitet. Das kostet je Datei einen Öffnen-Lesen-Schließen-Zyklus.

Entscheidend für die Kosten: **Nur das jeweils letzte Segment eines Schreibers kann wachsen.** Abgeschlossene Segmente sind durch ihre Abschlusszeile (§4.3) endgültig erkennbar und werden nie wieder angefasst. Bei fünf Clients sind das fünf Dateien je Takt, unabhängig davon, wie lang der Einsatz schon läuft.

**Startwert Takt A: 2 Sekunden.** Kalibrierung in M0.5 gegen die gemessenen Gesamtkosten eines Zyklus; das Abbruchkriterium liegt bei 2 Sekunden Zykluskosten bei 5 Clients.

**Takt B — neue Dateien entdecken (lang).** Eine Verzeichnisauflistung von `ereignisse\` findet Dateien neuer Clients und angekündigte Nachfolgesegmente. **Startwert: 10 Sekunden**, weil der Windows-Directory-Cache ohnehin bis zu 10 Sekunden alt sein darf und ein kürzerer Takt nur Last ohne Erkenntnisgewinn erzeugt. Daraus folgt unmittelbar die Zusage aus 02-ZIELBILD.md: Für die **erste** Datei eines neuen Clients sind bis zu 10 Sekunden zugesagt, nicht weniger.

Ein durch eine Abschlusszeile **angekündigtes** Nachfolgesegment wird abweichend davon bereits in Takt A gepollt, damit ein Segmentwechsel keine 10-Sekunden-Lücke erzeugt.

### §6.3 Ehrliche Anzeige

Die Oberfläche zeigt dauerhaft: den Zeitpunkt des letzten erfolgreichen Poll-Durchlaufs als „Stand: vor 8 s", ob der Share erreichbar ist, wie viele eigene Einträge noch nicht übertragen sind, und wie viele andere Arbeitsplätze gerade aktiv sind. Es wird nie „aktuell" angezeigt, wenn nur der lokale Stand gemeint ist.

### §6.4 Präsenz

`praesenz\<clientId>.json` ist die **einzige** Datei auf dem Share, die überschrieben wird, und jeder Client überschreibt ausschließlich seine eigene. Sie ist **rein informativ**: Kein Verfahren dieses Konzepts und keine Fold-Regel darf von ihr abhängen. Fällt sie aus, ist nur die Anzeige „3 weitere Arbeitsplätze" ungenau.

Inhalt: `clientId`, Anzeigename, Rechnername, Programmversion, letzter Kontakt als HLC und als Wanduhr, laufendes eigenes Segment und dessen Offset.

- **Schreibtakt:** alle 15 Sekunden, und zusätzlich bei jedem Segmentwechsel.
- **Verfahren:** Überschreiben an Ort und Stelle mit Kürzen auf die neue Länge, kein Rename. Rename schlägt unter Windows mit `EPERM`/`EBUSY` fehl, wenn ein anderer Client die Zieldatei ohne `FILE_SHARE_DELETE` geöffnet hält (`nas-speicher-recherche.md` §1.4) — genau das täte ein lesender Client.
- **Folge davon:** Ein Leser kann eine halb geschriebene Präsenzdatei sehen. Das ist zulässig und vorgesehen: Lässt sie sich nicht parsen, wird sie ignoriert und beim nächsten Takt erneut gelesen. Kein Fehler, keine Meldung.
- **Veraltet ab 60 Sekunden** ohne Fortschreibung. Die großzügige Schwelle folgt aus dem 10-Sekunden-Attribut-Cache plus Poll-Takt; ein knapperer Wert erzeugte falsche „offline"-Anzeigen.
- Präsenzdateien werden **nie** von fremden Clients gelöscht.

### §6.5 UDP nur als Beschleuniger

Ein UDP-Hinweis („Client X hat bis Offset Z geschrieben") darf einen Takt-A-Durchlauf vorziehen. Er darf niemals die Grundlage sein: Broadcast wird bei WLAN-Client-Isolation vollständig unterdrückt, geht bei mehreren Netzwerkadaptern in das falsche Netz, und die Windows-Firewall kann den Empfang ohne Administratorrechte verhindern (`nas-speicher-recherche.md` §1.10). Zudem kann ein Hinweis **vor** der Sichtbarkeit der Daten eintreffen; der vorgezogene Lesezugriff darf dann nichts finden, ohne dass das ein Fehler ist. Entscheidung 11 hält fest: nicht im kritischen Pfad.

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
| `zustandsHash` | SHA-256 über eine kanonische Serialisierung von `zustand` |
| `erzeugtVon` | `clientId` und Programmversion |

### §7.3 `foldVersion` ist eine harte Schranke

Auflage 4. Ein Client übernimmt einen Schnappschuss **nur**, wenn dessen `foldVersion` exakt seiner eigenen entspricht. Andernfalls ignoriert er ihn stillschweigend und faltet aus den Ereignissen. Jede Änderung an den Fold-Regeln erhöht `foldVersion`. Ein Schnappschuss aus einer älteren Programmversion darf niemals einen Zustand liefern, den die neue Regel anders berechnet hätte — das wäre ein stiller Falschzustand, die gefährlichste Fehlerklasse dieses Entwurfs.

`zustandsHash` erlaubt zusätzlich den Konvergenzvergleich zweier Clients ohne Übertragung des ganzen Zustands. Er ist das Messmittel für das Abbruchkriterium in M0.4 und M2.4.

### §7.4 HLC je materialisiertem Feld

Auflage 4. Jedes materialisierte Feld trägt die HLC des Ereignisses, das es gesetzt hat. Für die Speicherschicht ist das eine Anforderung an die Serialisierung: Der Schnappschuss muss diese Feld-HLCs mitschreiben, sonst kann nach dem Laden kein Rebase mehr entscheiden, ob ein nachträglich eintreffendes älteres Ereignis ein Feld noch überschreiben darf. Der Fold selbst ist in `KONZEPT-EREIGNISSE.md` beschrieben.

### §7.5 Schreiben und Aufräumen

- Ein Schnappschuss entsteht, wenn seit dem letzten mehr als **2.000 Ereignisse** eingeflossen sind oder mehr als **30 Minuten** vergangen sind — was zuerst eintritt. Startwerte, in M0.4 zu prüfen.
- Jeder Client schreibt nur Schnappschüsse **unter seiner eigenen `clientId`** und löscht nur **eigene** Schnappschüsse. Damit bleibt „ein Schreiber je Datei" auch hier gewahrt.
- Ein Client behält seine jüngsten drei eigenen Schnappschüsse und löscht ältere.
- Beim Öffnen wird der jüngste **passende** Schnappschuss beliebiger Herkunft gewählt: passend heißt `foldVersion` gleich, `zustandsHash` über den geladenen Zustand nachgerechnet und gleich, und jede Datei des Versionsvektors ist vorhanden und mindestens so lang wie der vermerkte Offset. Schlägt eine dieser Prüfungen fehl, wird der nächstältere versucht, zuletzt der vollständige Fold.
- **Vierte Bedingung: keine eigene Quarantänestelle wird übersprungen.** Führt der Leser für eine Datei ein `quarantaeneAb` (§8.2) und nennt der Versionsvektor des Schnappschusses für dieselbe Datei einen Offset **jenseits** dieser Stelle, wird der Schnappschuss **nicht** angenommen. Sonst holte sich der Leser über den Umweg des fremden Schnappschusses genau die Ereignisse zurück, die er selbst als unlesbar verworfen hat — und zwar vermischt mit dem, was er direkt gelesen hat. Das Ergebnis wäre ein Zustand, den weder der Schnappschuss noch der eigene Fold erzeugt hätte, und niemand könnte ihn erklären.
- Ein Leser mit Quarantäne schreibt **keine eigenen Schnappschüsse** mehr für diesen Einsatz. Sein Zustand ist unvollständig (§8.6); er darf ihn nicht als Beschleuniger an andere weitergeben.

---

## §8 Fehlerbilder, Störfallverhalten und Zusicherungsgrenzen

Grundsatz: **Kein Fehlerbild führt zum Stillstand des Lesers.** Ein Defekt in einer Datei darf immer nur diese eine Datei ab der Fehlerstelle betreffen; alle anderen Schreiber werden weiter ausgewertet.

### §8.1 Unvollständige letzte Zeile

*Bild:* Die Datei endet mitten in einer Zeile — die angekündigte `länge` ist nicht vollständig vorhanden, oder der abschließende `\n` fehlt.

*Ursache:* Normalfall. Der Schreiber ist gerade dabei, oder ein Absturz oder Verbindungsabbruch traf ihn mitten im Anhängen.

*Verhalten:* Der Rest wird **nicht** ausgewertet, `leseOffset` bleibt vor der unvollständigen Zeile stehen. Beim nächsten Durchlauf ist sie entweder vollständig oder immer noch unvollständig. **Keine Meldung, kein Hinweis** — dies ist kein Fehler.

*Für den Schreiber:* Beim Start prüft er sein eigenes letztes Segment lokal und kürzt es auf die letzte vollständige, kettenrichtige Zeile. Auf dem Share setzt er das Anhängen an der tatsächlichen Dateigröße an (§5.4).

### §8.2 Defekte Zeile in der Dateimitte

*Bild:* Eine Zeile ist vollständig vorhanden — die angekündigte `länge` Bytes sind da und es folgt ein `\n` —, aber `crc32` stimmt nicht, oder `vorgaenger` passt nicht zur berechneten Kette, oder das JSON ist nicht parsebar.

*Abgrenzung zu §8.1, verbindlich:* Sind weniger Bytes vorhanden als angekündigt, ist die Zeile **unvollständig** (§8.1). Sind sie vollständig vorhanden und stimmt die Prüfung nicht, ist sie **defekt**. Diese Regel ist die einzige Unterscheidung; es wird nicht geraten.

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

*Verhalten:* Sämtliche Share-Zugriffe laufen im Worker-Thread je Akte, nie im Main-Prozess, und tragen einen eigenen Zeitausstieg (**Startwert 20 s**, deutlich unter dem SMB-Standard). Nach dem Ausstieg gilt der Zugriff als gescheitert und wird nach §5.4 wiederholt. Die Oberfläche bleibt in jedem Fall bedienbar. Als Lint-Regel: kein synchroner Datei- oder Netzaufruf im Main-Prozess (05-UMSETZUNGSPLAN.md, M2.1).

### §8.5 Verstellte Uhr, geklontes Profil, zwei Instanzen

Verstellte Uhr: §3.2 (Delta-Grenze 5 Minuten, Warnung, kein Verwerfen). Geklontes Profil: §4.5 Fall 2 (neue Kennung, Klartextmeldung). Zwei Instanzen auf einem Rechner: §4.5 Fall 1 (`requestSingleInstanceLock`).

### §8.6 Was zugesichert wird — und was nicht

#### §8.6.1 Konvergenz

**Zugesichert:** Zwei Clients, die dieselbe Ereignismenge gesehen haben, berechnen denselben Zustand — nachprüfbar über den `zustandsHash` (§7.2). Das ist das Kriterium, an dem M0.4 und M2.4 gemessen werden.

**Nicht zugesichert, sobald eine Quarantäne besteht.** Die Quarantäne wirkt je Leser (§8.2). Stößt Client A in der Datei von C auf einen Defekt, während Client B dieselben Bytes vorher fehlerfrei gelesen hat, sehen A und B dauerhaft **verschiedene Ereignismengen** und damit verschiedene Zustände. Das ist kein Programmfehler, sondern die unvermeidliche Folge davon, dass ein Leser fremde Dateien nicht reparieren darf. Wer es übersieht, hält später einen roten Konvergenztest für einen Fehler im Fold.

Daraus folgen vier Regeln:

1. **Sichtbar machen.** Ein Arbeitsplatz mit Quarantäne zeigt dauerhaft an, dass er weniger sieht als die anderen — nicht nur einmal beim Auftreten (§8.2, Punkt 3).
2. **Nicht weitergeben.** Er schreibt keine Schnappschüsse mehr (§7.5) und nimmt keine an, die über seine Quarantänestelle hinausreichen.
3. **Aus dem Konvergenzvergleich herausnehmen.** `s1 akte pruefe` und die Simulation vergleichen die Hashes nur der Clients ohne Quarantäne und melden die übrigen getrennt als „unvollständige Sicht". Ein Testlauf, der eine Zeile absichtlich beschädigt, muss diesen Ausgang erwarten, statt an ihm zu scheitern.
4. **Wiederherstellungsweg.** Der einzige Weg zurück führt über den **Schreiber** der beschädigten Datei: Er hat den Inhalt lokal, erkennt beim Start die Abweichung zwischen lokaler und Share-Datei (§5.4) und schreibt den fehlenden Teil neu. Ist er nicht mehr erreichbar, kann ein anderer Client seinen lokalen Spiegel als Datei ausleiten (`s1 akte exportiere`, Paket M4.4) und über die Einsatzakte einspielen — von Hand, sichtbar, nie automatisch. Automatisches Reparieren fremder Dateien bliebe ausgeschlossen: Es bräche die Regel „ein Schreiber je Datei", auf der die gesamte Statik ruht.

#### §8.6.2 Erkennbarkeit nachträglicher Änderungen

Auflage 14. Der Anspruch „revisionssicher" wird **nicht** erhoben.

**Zugesichert:** Eine nachträgliche Änderung **innerhalb** einer Schreiberkette ist erkennbar. Weil die Kette über den Segmentwechsel hinweg durchläuft (§2.3), gilt das auch über die Segmentgrenzen eines Schreibers hinweg — wird ein Segment in der Mitte geändert, gekürzt oder entfernt, bricht die Kette am Anfang des Folgesegments.

**Nicht zugesichert:** Wer Schreibzugriff auf das Verzeichnis hat, kann das **letzte** Segment eines Schreibers oder dessen **sämtliche** Dateien spurlos entfernen. Das ist mit dateibasierter Ablage ohne Serverprozess nicht verhinderbar. Was bleibt: Andere Clients haben denselben Inhalt in ihrem lokalen Spiegel, ein Vergleich fällt also im laufenden Betrieb auf, und `s1 akte pruefe` meldet eine fehlende Kettenfortsetzung, sobald eine Präsenzdatei oder ein Schnappschuss eine Datei nennt, die nicht mehr existiert. Das ist eine Erkennungshilfe, keine Revisionssicherheit, und wird gegenüber der Führungsstelle genau so benannt.

### §8.7 `manifest.json` und `mindestClientVersion`

`manifest.json` auf der Share-Wurzel trägt `formatVersion` und `mindestClientVersion`. Auflage 9, zweiter Teil: `mindestClientVersion` wirkt als **Warnung, nicht als Sperre**. Ein zu alter Client zeigt „Dieser Arbeitsplatz ist älter als vorgesehen; bitte aktualisieren", arbeitet aber weiter. Ein Programm, das sich im Einsatz selbst aussperrt, ist ein größerer Schaden als ein Programm, das eine unbekannte Ereignisart überspringt und darauf hinweist. Unbekannte Ereignisarten und unbekannte Felder werden toleriert und unverändert weitergespiegelt, damit ein alter Client die Daten eines neuen nicht beschädigt.

---

## §9 Nachweis der Auflagen 4 bis 14

| Auflage (03-MEILENSTEINE.md) | Wo behandelt | Anmerkung |
|---|---|---|
| 4 · Fold als Mengenfunktion mit Rebase; HLC je materialisiertem Feld; Schnappschüsse tragen `foldVersion` | §7.2, §7.3, §7.4 | Speicherseite vollständig hier. Der Fold selbst gehört in `KONZEPT-EREIGNISSE.md` (M1.2) |
| 5 · HLC als Struktur vergleichen; Textform fester Stellenzahl | §3.2 | 13 + 6 Stellen, Vergleich als Struktur, Delta-Grenze 5 min |
| 6 · Jedes setzende Ereignis trägt den Vorher-Wert; Abweichung ⇒ Konflikthinweis | §2.4, §2.5 | Speicherseite: `vorher` ist Rahmenfeld und wird unverändert durchgereicht. Auswertung im Fold |
| 7 · Vorgänger-Hash beim Lesen prüfen; defekte Zeile ⇒ Quarantäne ab Offset, kein Stillstand | §2.3, §8.1, §8.2 | Verbindliche Abgrenzung unvollständig ↔ defekt in §8.2 |
| 8 · Ereignis-ID mit persistenter, monotoner Laufnummer; Fremdschreiber-Erkennung; Single-Instance-Lock | §3.3, §4.4, §4.5 | Beide Fälle mit Reaktion ausformuliert |
| 9 · Segmentwechsel nach Größe, nicht bei jedem Start; `mindestClientVersion` als Warnung | §4.2, §8.7 | Startwert 4 MiB, Begründung über Poll-Kosten |
| 10 · Zyklusregel; relative Stärkeänderung; Auffangregel für aufgelöste Abschnitte | — | **Fachliche Fold-Regeln, gehören nach `KONZEPT-EREIGNISSE.md` (M1.2).** Für die Speicherschicht ohne Anforderung; hier bewusst nicht dupliziert |
| 11 · Undo als normales Ereignis mit `undoOf`, Stapel je Client, kein Redo | §2.4 | Speicherseite: `undoOf` ist ein Rahmenfeld, es gibt keinen Sonderpfad. Semantik im Ereigniskonzept |
| 12 · „Neueste Revision zählt" über HLC; Meldezeit anzeigen und plausibilisieren | §3.1, §3.2 | Trennung technischer und fachlicher Zeit hier festgelegt; die Plausibilisierungsschwelle je Feld im Ereigniskonzept |
| 13 · Ereignis nach `archiv.marker` hat genau eine Behandlung; Ordnerverschiebung darf keinen Upload ins Leere laufen lassen | §5.7 | Beide Teile ausformuliert; Ereignis wird angenommen und gekennzeichnet, nie verworfen |
| 14 · Anspruch „revisionssicher" streichen | §8.6 | Zusicherung und Nicht-Zusicherung getrennt benannt |

---

## §10 Offene Punkte und Annahmen

| Nr. | Punkt | Behandlung |
|---|---|---|
| A1 | `fsync` je Ereignis auf dem echten Share bezahlbar (< 300 ms) | Messung M0.5; Gegenmaßnahme Bündelung, §2.2 |
| A2 | 400 bis 600 Byte je Ereignis im Mittel | Prüfung an der Simulation M0.4, §2.6 |
| A3 | 8 Hexziffern als Dateinamenspräfix kollisionsfrei | Prüfung beim ersten Schreiben, §4.1 |
| A4 | Startwerte Takt A 2 s, Takt B 10 s, Segment 4 MiB, Schnappschuss alle 2.000 Ereignisse oder 30 min, Zeitausstieg 20 s | sämtlich zu kalibrieren in M0.5; keiner dieser Werte ist eine Zusage |
| A5 | Verhalten des Synology-SMB-Servers bei `fsync` und bei gleichzeitigem Anhängen und Lesen derselben Datei | M0.5; die Belege in §1 der Recherche sind Client- und Protokollbelege, keine Messung an diesem Gerät |
| A6 | Ob die Windows-Firewall UDP ohne Administratorrechte zulässt | M0.5; ohne Freigabe entfällt der Beschleuniger ersatzlos (§6.5), das Verfahren bleibt vollständig |
