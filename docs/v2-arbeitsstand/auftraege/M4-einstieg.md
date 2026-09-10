# Einstieg in M4 — Kernausgaben

Stand: 2026-09-10 · Meilenstein M4 aus [05-UMSETZUNGSPLAN.md](../../v2/05-UMSETZUNGSPLAN.md) · Status: **abgeschlossen**, siehe
[M4-abschlussbericht.md](../berichte/M4-abschlussbericht.md); Prüfpunkt 3
(Parität mit dem Excel-Ausdruck) bleibt offen

M4 ist der dritte Prüfpunkt mit Abbruchrecht. Was er beweisen soll, steht in
einem Satz: **die Ausdrucke sehen aus wie die der Excel und stimmen mit ihr
überein.** Alles andere in diesem Meilenstein ist Zurüstung dafür.

## Was M3 übergibt

| Aus M1–M3 | Was M4 damit tut |
|---|---|
| `@s1/domaene`: Kennzahlen K1–K30 | jede Zahl im Ausdruck ist eine Kennzahl, keine Ausgabe rechnet selbst |
| `@s1/domaene/projektion`: Baum, Tabelle, Tagebuch | die Auswertung ist die Tabelle ohne Ausschnitt; der Druck ist der Baum mit Summen |
| Die Spaltentabelle mit den Excel-Spaltenbuchstaben | die XLSX-Ausgabe bekommt ihr Spaltenlayout daraus und nicht aus einer zweiten Liste |
| `@s1/speicher`: Segmente, Schnappschüsse, `zustandsHash` | die Einsatzakte packt genau das, was `s1 akte pruefe` wieder liest |
| `s1 akte pruefe` (aus M2) | die Abnahmebedingung von M4.4: der Reimport muss konsistent sein |
| `@s1/ausgaben` mit `htmlMaskieren` und `kopfAlsHtml` | der Platzhalter aus M-0.3 wird zum Paket |

## Der Prüfpunkt, und warum er blockiert ist

Die DoD von M4.1 lautet: „Goldfile-Tests; **Zeile für Zeile gegen den
Excel-Ausdruck der Referenzlage** geprüft". Entscheidung 8 des
Umsetzungsplans legt fest, wer die Referenzlage erstellt: „Johannes/FüSt
erstellt sie bis Ende M2 von Hand in der Excel (rund 40 Einheiten, drei
Einsatzstellen, ein Bereitstellungsraum, alle Status- und Schichtwerte,
Ausdrucke von Druck und Status)."

**Sie liegt nicht vor.** Unter `pruefdaten/` stehen die 443 Erfassungsbögen aus
M1.5 und sonst nichts. Damit ist der Prüfpunkt 3 nicht erreichbar — dieselbe
Lage wie bei M0.5 und M2.4, und sie ist zu benennen und nicht zu überspielen.

**Was stattdessen gebaut wird**, ist die ganze Strecke bis unmittelbar davor,
und zwar mit einem Orakel, das trägt, soweit ein Orakel ohne die Excel tragen
kann:

* **Eine synthetische Prüflage** in `@s1/domaene` als Ereignisfolge — rund 40
  Einheiten, drei Einsatzstellen, ein Bereitstellungsraum, ein Meldekopf, alle
  neun Statuswerte, alle Schichtwerte, angeforderte Kräfte, eine aufgeteilte
  Einheit, eine entfernte. Sie ist nach denselben Vorgaben gebaut wie die, die
  Johannes in der Excel erfasst, damit ein Vergleich später Zeile für Zeile
  möglich ist statt „ungefähr".
* **Goldfiles über dieser Lage.** Sie beweisen, was ein Goldfile beweisen
  kann: dass sich die Ausgabe nicht unbemerkt ändert. Sie beweisen **nicht**,
  dass sie mit der Excel übereinstimmt.
* **Die Kontrollsummen der Excel als Prüffälle.** Das Blatt „Status" führt
  drei Proben mit sich (K21, K23, K25): Σ_Status − Σ_Organisation = 0,
  Σ_Schicht − Σ_Organisation + Σ_ANGEFORDERT = 0, und die Liste der Einheiten
  ohne Pflichtangabe. Sie sind in `@s1/domaene` seit M1.3 gerechnet und gehen
  in die Ausgabe ein — eine Ausgabe, deren eigene Probe nicht aufgeht, ist
  schon ohne die Excel falsch.

Das ist der ehrliche Stand: Die Ausgaben sind gebaut und in sich geprüft; die
**Parität** mit der Excel bleibt offen und ist Johannes' Prüfpunkt.

## Reihenfolge — und warum sie von der Tabelle abweicht

Der Plan nennt M4.1 bis M4.4 in dieser Folge. Gebaut wird in derselben, mit
**einem** vorgezogenen Stück:

**M4.0: der ZIP-Schreiber, und CRC-32 wandert nach Ring 2.**

Zwei Pakete brauchen dasselbe Werkzeug: Eine XLSX-Datei **ist** ein ZIP mit
XML darin (M4.2), und die Einsatzakte ist ein ZIP (M4.4). Wer den Schreiber
erst in M4.2 baut, baut ihn dort in der Form, die XLSX gerade braucht, und in
M4.4 ein zweites Mal.

Dabei fällt eine kleine Umräumung an: Der ZIP-Kopf trägt eine CRC-32 je
Eintrag, und zwar dieselbe nach IEEE 802.3, die `KONZEPT-SPEICHER.md` §2.1 für
die Zeilenprüfsumme festlegt. Sie steht heute in `@s1/speicher`, das
`@s1/ausgaben` nicht importieren darf — Geschwister im selben Ring
(02-ZIELBILD.md). Eine zweite Tabelle desselben Polynoms wären zwei Wahrheiten
über dieselbe Zahl. Die **Funktion** wandert deshalb nach `@s1/domaene`; die
**Regel**, wo sie in einer Zeile steht, bleibt in `@s1/speicher`, das sie von
dort weiterreicht.

### Die Folge

| Nr. | Paket | Warum hier |
|---|---|---|
| 1 | **M4.0** ZIP-Schreiber, CRC-32 nach Ring 2, synthetische Prüflage | Grundlage von M4.2 und M4.4; das Orakel für alles Weitere |
| 2 | M4.1 Druck und Status-Matrix als HTML, PDF über `printToPDF` | das Herzstück des Prüfpunkts |
| 3 | M4.2 Auswertung als XLSX | braucht den ZIP-Schreiber und die Spaltentabelle aus M3.2 |
| 4 | M4.3 HTML-Monitor | ist der Druck aus M4.1 als Datei mit Reload |
| 5 | M4.4 Einsatzakte als ZIP, `s1 akte exportiere` | packt Ereignisse, Schnappschuss **und** die Ausgaben aus 2 bis 4 |

## Definition of Done je Paket

Unverändert aus 05-UMSETZUNGSPLAN.md, mit dem Zusatz, der sich aus der
fehlenden Referenzlage ergibt:

| WP | DoD |
|---|---|
| M4.0 | ZIP-Dateien werden von einem **fremden** Leser gelesen; CRC-32 unverändert für die Speicherschicht |
| M4.1 | Goldfile-Tests grün; die drei Kontrollsummen der Excel gehen in der Prüflage auf. **Parität mit dem Excel-Ausdruck: offen** |
| M4.2 | öffnet in einem fremden OOXML-Leser ohne Nacharbeit; Spaltenlayout aus der Spaltentabelle |
| M4.3 | zweites Gerät zeigt Aktualisierung — ersatzweise: die Datei wird aus dem Worker geschrieben und trägt den Reload |
| M4.4 | Reimport per `s1 akte pruefe` konsistent; Manifest mit Hashes über jede Datei |

## Was M4 nicht liefert

* **Die Parität mit der Excel.** Siehe oben. Prüfpunkt 3 bleibt offen.
* **Logistik-Ausgabe (Log/LogFrei) und Kostenrechnung.** Stufe 2 nach
  Entscheidung 1; die Kennzahlen dafür stehen, die Blätter nicht.
* **FüOrg.** Ein reines Zeichenblatt ohne Datenmodell
  (`excel-domaenenmodell.md` §4.5); es gehört zur Lagekarte und nicht zu den
  Kernausgaben.
* **Der ETB-Export.** Am 2026-09-10 mit dem Einsatztagebuch aus dem Umfang
  genommen. Die Ereignisse liegen in der Einsatzakte ohnehin vollständig; wer
  ein Tagebuch braucht, rendert es daraus.

## Verbindliches für die Arbeit

* Deutsch mit Umlauten in Code, Kommentaren, Tests und Commit-Nachrichten.
* Begründender Stil: Jeder Dokumentationskommentar sagt **warum** und
  verweist auf den Paragraphen von `KONZEPT-EREIGNISSE.md`,
  `KONZEPT-SPEICHER.md`, das Zieldatenmodell oder die Bestandsaufnahme
  `excel-domaenenmodell.md`, der die Regel festlegt.
* Ringgrenzen aus 02-ZIELBILD.md, erzwungen in `eslint.config.mjs`.
  `@s1/ausgaben` bleibt ohne `node:` und ohne Electron.
* Gates je Commit: `tsc -b`, `eslint .`, `vitest run`. Keine übersprungenen
  Tests.
