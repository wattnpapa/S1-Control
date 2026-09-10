# M4 — Kernausgaben: was gebaut wurde und was offen bleibt

Stand: 2026-09-10 · Branch `v2-architektur` · Meilenstein M4 aus
[05-UMSETZUNGSPLAN.md](../../v2/05-UMSETZUNGSPLAN.md)

**M4 ist gebaut, der Prüfpunkt ist es nicht.** Alle vier Arbeitspakete des
Plans liegen vor, dazu ein fünftes, das der Plan nicht als eigenes führt: der
ZIP-Schreiber mit der Umräumung der CRC-32 und die synthetische Prüflage. Was
offen bleibt, ist die Frage, um die es in diesem Meilenstein eigentlich geht —
ob die Ausdrucke mit denen der Excel übereinstimmen. Dafür fehlt die
Referenzlage aus Entscheidung 8. Sie liegt nicht vor, und keine Menge
Goldfiles ersetzt sie.

## Stand je Arbeitspaket

| WP | Inhalt | Stand |
|---|---|---|
| M4.0 | ZIP-Schreiber, CRC-32 nach Ring 2, synthetische Prüflage | fertig |
| M4.1 | Druck und Status-Matrix als HTML, PDF über `printToPDF` | gebaut, **Parität mit der Excel offen** |
| M4.2 | Auswertung als XLSX | fertig |
| M4.3 | HTML-Monitor als Datei mit Reload | fertig |
| M4.4 | Einsatzakte als ZIP, `s1 akte exportiere` und `importiere` | fertig |

Gates zum Stand dieses Berichts: `tsc -b` sauber, `eslint .` sauber, **1269
Tests in 96 Dateien grün** (von 1183 zum Ende von M3), `build:renderer` und
`build:schale` sauber. Dazu zwei Nachweise, die außerhalb der Testläufe
stehen: die Rauchprobe unter Xvfb erzeugt beide PDF, und der `fremdleser`-Lauf
prüft ZIP und XLSX mit Programmen, die nichts von diesem Baum wissen.

## Die Commits

| Commit | Inhalt |
|---|---|
| `8044051` | Auftragsdokument: Reihenfolge, Prüfpunkt und was er nicht beweist |
| `64dd5cf` | M4.0: ZIP-Schreiber, CRC-32 nach Ring 2, synthetische Prüflage |
| `d1c6489` | M4.1: Druck und Status-Matrix als HTML und PDF |
| `e337d2c` | M4.2: die Auswertung als XLSX, mit eigenem Schreiber |
| `dcbb3f8` | M4.3: der HTML-Monitor als Datei für ein zweites Gerät |
| `12d182d` | M4.4: die Einsatzakte als ZIP, mit Rückweg |

## Was festgelegt wurde, und warum gerade so

### Kein Formatpaket aus dem Netz

XLSX und ZIP werden hier selbst geschrieben, ohne `exceljs`, ohne `jszip`. Der
Grund ist nicht Misstrauen gegen fremden Code, sondern die Rechnung, die
dahintersteht: Der Ausschnitt des Formats, den diese Anwendung braucht, ist
klein — ein Arbeitsblatt, keine Formeln, keine geteilten Zeichenketten,
gespeichert statt komprimiert. Ihm stehen bei einem Paket die ganze
Oberfläche, deren Abhängigkeiten und deren Pflege über die Lebensdauer dieser
Anwendung gegenüber. `zip.ts` sind 298 Zeilen, `xlsx.ts` 312, beide
plattformneutral in Ring 3, beide ohne eine einzige Abhängigkeit.

Der Preis ist, dass niemand für uns prüft, ob das Ergebnis dem Format
entspricht. Deshalb steht neben jedem Schreiber ein Nachweis mit einem fremden
Leser: `unzip -t` liest das Zentralverzeichnis und prüft jede CRC-32,
LibreOffice wandelt die XLSX nach CSV. Beide Läufe stehen unter `bau/` im
Projekt `fremdleser` und laufen nur unter Linux — dort, wo die Werkzeuge da
sind. Übersprungen wird nichts: Fehlt ein Werkzeug auf einem Läufer, auf dem
der Lauf vorgesehen ist, ist das ein Befund.

### Eine Prüfsumme, eine Stelle

Der ZIP-Kopf trägt je Eintrag eine CRC-32 nach IEEE 802.3 — dieselbe, mit der
`KONZEPT-SPEICHER.md` §2.1 jede Ereigniszeile sichert. Sie stand in
`@s1/speicher`, und `@s1/ausgaben` darf das als Geschwister im selben Ring
nicht importieren (02-ZIELBILD.md). Eine zweite Tabelle desselben Polynoms
wären zwei Wahrheiten über dieselbe Zahl, und die Sorte Fehler findet man erst
Jahre später an einer Datei, die zwei Programme verschieden beurteilen.

Umgezogen ist deshalb die **Funktion** nach `packages/domaene/src/pruefsumme.ts`;
die **Regel**, wo die Zahl in einer Zeile steht und was ein Fehlschlag
bedeutet, ist in `@s1/speicher` geblieben und reicht die Funktion weiter. Die
Speicherschicht rechnet Byte für Byte dasselbe wie vorher; ihre Tests sind
unverändert und grün.

### Die Prüflage ist ein Orakel, kein Ersatz

`prueflageEreignisse()` in Ring 2 baut eine Lage aus zehn Abschnitten und
40 Einheiten: drei Einsatzstellen, ein Bereitstellungsraum, ein Meldekopf,
Logistik, Führungsstelle, ein Abschnitt für angeforderte Kräfte und einer ohne
jede Einheit. Alle neun Statuswerte kommen vor, alle vier Schichtwerte, eine
Einheit ist abgeteilt (§5.4.2), eine entfernt (§5.4.5). Die Folge ist
bitstabil: feste Kennungen, feste HLC, feste Wanduhr, kein Zufall. Zweimal
gefaltet ergibt sie denselben `zustandsHash`, und sie erzeugt keinen einzigen
Konflikthinweis — eine Prüflage, über der schon der Fold streitet, taugt als
Orakel nicht.

Was sie leistet: Sie ist nach denselben Vorgaben gebaut, nach denen die
Referenzlage in der Excel erfasst werden soll, damit ein Vergleich später
Zeile für Zeile möglich ist statt „ungefähr". Was sie nicht leistet: Sie sagt
nichts darüber, ob unsere Zahl und die der Excel dieselbe ist. Die Goldfiles
über ihr beweisen, dass sich eine Ausgabe nicht unbemerkt ändert — mehr nicht,
und der Bericht behauptet nicht mehr.

### Die Kontrollsummen der Excel gehen auf

Das Blatt „Status" führt drei Proben mit sich (`excel-domaenenmodell.md` §4.2):
K21 Σ_Status − Σ_Organisation = 0, K23 Σ_Schicht − Σ_Organisation +
Σ_ANGEFORDERT = 0, K25 die Liste der Einheiten ohne Pflichtangabe. Sie sind
seit M1.3 in Ring 2 gerechnet, gehen in die Statusausgabe ein und stehen im
Ausdruck. Über der Prüflage gehen sie auf.

Das ist die stärkste Aussage, die ohne die Excel zu haben ist: Eine Ausgabe,
deren eigene Probe nicht aufgeht, ist schon vor jedem Vergleich falsch. Sie
ersetzt den Vergleich nicht — es sind unsere Summen gegen unsere Summen.

### Der Druck rechnet nicht, er zeigt

Jede Zahl in Druck, Status, XLSX und Monitor ist eine Kennzahl K1 bis K30 aus
Ring 2. Die Ausgaben suchen sich aus, welche sie zeigen, in welcher
Reihenfolge und mit welchem Rand; gerechnet wird in keiner von ihnen. Der
Grund ist die Parität selbst: Wenn der Vergleich mit der Excel eine Abweichung
zeigt, muss die Frage „wo kommt die Zahl her" **eine** Antwort haben und nicht
vier. Deshalb steht auch die Zeile je Abschnitt im Druck auf der eigenen
Stärke des Abschnitts und nicht auf der seines Teilbaums: Die Excel summiert
so, und wer es anders macht, erklärt später eine Differenz, die er selbst
gebaut hat.

Zwei Feinheiten stehen im Code mit ihrer Begründung: Abschnitte ohne Einheiten
werden ausgeblendet (K7), und `ANGEFORDERT` bleibt aus der Gesamtstärke
draußen — angeforderte Kräfte sind noch nicht da.

### PDF entsteht in der Schale, nicht in Ring 3

`@s1/ausgaben` erzeugt HTML als Zeichenkette und weiß nichts von Papier. Das
PDF macht `apps/desktop/src/main/drucker.ts` mit einem unsichtbaren
`BrowserWindow` und `printToPDF`. Der Renderer, der ohnehin im Paket steckt,
ist damit auch der Drucktreiber; ein zweites Layoutprogramm gibt es nicht,
und was am Bildschirm steht, steht auf dem Blatt.

Der Nachweis ohne Menschen läuft über die Rauchprobe: `S1_SMOKE=ausgaben`
startet unter Xvfb, erzeugt beide Blätter und prüft die MediaBox der
entstandenen Datei — 841,9 × 595 pt für den Druck (quer) und 595 × 841,9 pt
für den Status (hoch). Das ist die Aussage, die eine Maschine über ein PDF
treffen kann: Das Blatt hat das Format, das es haben soll. Ob die Tabelle
darauf gut aussieht, sagt der Ausdruck.

### Der Monitor ist eine Datei, kein Server

M4.3 verlangt „zweites Gerät zeigt Aktualisierung". Gebaut ist das ohne
HTTP-Server: Der Aktendienst schreibt `ausgaben/monitor.html` auf den Share,
die Seite trägt ein `meta refresh` mit 60 Sekunden, und das zweite Gerät
öffnet sie über die Freigabe. Ein Server im Einsatz wäre ein Dienst, der
laufen, einen Port halten und in der Firewall stehen muss; eine Datei auf dem
Share ist genau das, was in dieser Umgebung ohnehin funktioniert (BETRIEB.md).

Die Seite trägt zwei Zeiten, und das ist Absicht: „Stand der Lage" ist der
fachliche Stand, „Bild geschrieben" das Lebenszeichen. Ein Monitor, der nur
den Lagestand zeigt, sieht bei einer stehengebliebenen Datei genauso aus wie
bei einer ruhigen Lage — und das ist der Unterschied, auf den es an einer Wand
ankommt.

### Das Archiv hat einen Rückweg

`s1 akte exportiere` packt `einsatz.json`, Ereignisse, Schnappschüsse, Anhänge
und die Ausgaben aus M4.1 bis M4.3 in ein ZIP und legt ein `manifest.json`
dazu: jede Datei mit Größe und SHA-256, dazu Ereigniszahl, `foldVersion` und
der `zustandsHash` nach §7.6. `praesenz/` fährt nicht mit — die Aussage aus
§6.4 lautet „dieser Client ist gerade da" und ist in einem Archiv falsch,
sobald sie geschrieben ist.

Die Abnahmebedingung heißt „Reimport per `s1 akte pruefe` konsistent". Ein
Beweis, der ein fremdes Werkzeug voraussetzt, wird in einer Abnahme nicht
geführt, deshalb steht `liesZip` neben `schreibeZip` und `s1 akte importiere`
neben dem Export: erst jede Datei gegen das Manifest, dann auspacken — nur bei
vollständiger Übereinstimmung, ein halb ausgepacktes Archiv sähe aus wie eine
Akte und wäre keine —, dann derselbe Prüflauf wie `s1 akte pruefe` und der
Vergleich der beiden `zustandsHash`. Gleiche Bytes sind noch kein gleicher
Einsatz.

Daneben steht der Rundlauf mit dem fremden Auspacker:
`bau/ausgaben/akte-fremdleser.test.ts` lässt `unzip` dieselbe Datei auspacken
und schickt `s1 akte pruefe --vergleiche` über das Ergebnis. Beide Wege prüfen
verschiedene Fragen, und beide werden gebraucht.

Eine Akte mit Befunden wird trotzdem exportiert. Wer nach einem Einsatz
feststellt, dass eine Ereignisdatei einen Defekt nach §8.2 hat, braucht das
Archiv gerade dann; verweigerte der Export, bliebe der Rest auf einem Share,
der abgebaut wird. Der Befund steht im Manifest, der Exitcode ist 1.

## Befunde aus der Arbeit

| Nr. | Befund | Behandlung |
|---|---|---|
| A1 | **Für Johannes.** Die Excel widerspricht sich bei „männlich": Das Blatt „Status" rechnet `Männl. = Gesamt − Weibl.`, das Blatt „Log" zieht Weiblich **und** Divers ab. Beides kann nicht stimmen | Der Code folgt einer Definition (K5: `Gesamt − weiblich − divers`) und nennt sie im Kommentar. **Vor dem Paritätsvergleich zu klären** — sonst wird eine Differenz gesucht, die in der Vorlage steht |
| A2 | `libreoffice-core` allein genügt nicht: Ohne den Calc-Filter meldet `soffice` „source file could not be loaded" für **jede** Tabelle, auch für eine selbst geschriebene | Zwei Stunden an einer Datei gesucht, die in Ordnung war. `libreoffice-calc` ist jetzt ein eigener Schritt in `build-v2.yml`, und der Kommentar im Test sagt, dass ein roter Lauf hier zuerst auf das Werkzeug zeigt |
| A3 | Ein `no-control-regex` in `zellentext()` ließ sich nicht mit einem regulären Ausdruck lösen, ohne die Regel abzuschalten | Die Schleife über Codepunkte ist ein paar Zeilen länger und liest sich besser: Sie benennt, welche Zeichen XML 1.0 nicht zulässt, statt sie in eine Zeichenklasse zu verstecken |
| A4 | 5.000 Einheiten durch den Aktendienst liefen in die Zeitgrenze — jedes Ereignis kostet ein `fsync` | Die Messung ist geteilt: 150 Einheiten über die echte Strecke, 5.000 über Fold und Projektion allein. Beide Läufe stehen mit ihrer Begründung im Test; die zweite Zahl sagt etwas über die Projektion, nicht über die Platte |

Aus M3 bleiben offen: **B1** (`HierarchieEbene` heißt im Katalog `art`/`name`,
im Typ `ebene`/`bezeichnung`), **B2** (`FahrzeugZustand.bezeichnung` und
`PersonZustand.vorname` stehen als Pflichtfelder, sind im Katalog optional),
**B5** (Playwright-Läufer gehört zu M7), **B6** (der Zonenbuchstabe der
NATO-Zeit gehört in die Stammdaten der Führungsstelle). B1 und B2 berühren den
`zustandsHash` und gehören mit einer `foldVersion` zusammen.

## Was offen bleibt

| Punkt | Wer entscheidet | Warum offen |
|---|---|---|
| **Prüfpunkt 3 — Parität mit dem Excel-Ausdruck** | Johannes | Die Referenzlage aus Entscheidung 8 liegt nicht vor; unter `pruefdaten/` stehen die 443 Erfassungsbögen aus M1.5 und sonst nichts. Die ganze Strecke bis unmittelbar davor ist gebaut, das Orakel ist synthetisch, der Vergleich fehlt |
| **A1 — „männlich" in der Vorlage** | Johannes | Zwei Blätter derselben Datei rechnen verschieden. Die Antwort entscheidet über eine Spalte in Druck, Status und XLSX |
| **Der Ausdruck auf Papier** | Johannes | Format und Ränder sind maschinell geprüft, das Schriftbild nicht. Ein Blatt aus dem Drucker beantwortet in einer Minute, was kein Test beantwortet |
| **M3.5 auf einer echten zweiten Anzeige** | Johannes | Unverändert aus M3 |
| **M2.4** — zwei Rechner, echter Share | Johannes | Unverändert aus M2 |
| **M0.5** — Messung am echten Share | Johannes | Unverändert aus M0 |
| **Freigabe von `KONZEPT-EREIGNISSE.md`** | Johannes | Unverändert aus M1 |
| **B1 und B2** | eigener Schritt | Unverändert aus M3: Sie stehen im `Zustand` und gehören zu einer `foldVersion` |

## Was M4 an M5 übergibt

* **Den ZIP-Schreiber und den Leser.** Beide plattformneutral in Ring 3, beide
  gegen fremde Programme geprüft. Jede weitere Ausgabe, die ein Paket ist,
  benutzt sie.
* **Die Prüflage.** Sie ist ab hier das Orakel für jede Ausgabe und für jede
  Messung, die eine realistische Lage braucht — 40 Einheiten, alle Statuswerte,
  bitstabil.
* **Die Einsatzakte als Datei.** Was ein Meilenstein erzeugt, lässt sich ab
  jetzt einpacken, weitergeben und mit einem Kommando prüfen. Für die
  Abnahmen, die auf Hardware warten, ist das der Weg, auf dem der Bestand
  eines Übungslaufs hierher zurückkommt.
* **Die Trennung Ausgabeform / Rechnung.** Keine Ausgabe rechnet. Wer eine
  Zahl ändern will, ändert eine Kennzahl in Ring 2 und sieht sie in allen vier
  Ausgaben.
