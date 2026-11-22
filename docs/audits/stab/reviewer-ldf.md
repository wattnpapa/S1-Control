# Stabsreview LdF – Leiter des Fernmeldebetriebes

Stand: 22.11.2026, Web-Schale http://127.0.0.1:8790 (Playwright, Chromium, 1320 × 860, Stichproben 1440 × 900, je Arbeitsplatz ein eigener Browser-Kontext). Übungseinsatz „Review FmZ Hochwasser Hunte“ mit drei Abschnitten, acht Einheiten, Funkplan mit fünf Rufgruppen (3 TMO, 1 DMO mit Gateway, 1 Analog; „hört“ Fm1 bzw. Fm2), Funkrufnamen für sechs Einheiten. Arbeitsplätze parallel: S3 (Absender), Sichter, LdF (ich), Fm1, Fm2. Durchgespielt: 16 Eingänge (Funk, Telefon, Telefax, Kurier/Melder; einfach, Sofort, Blitz), 8 Ausgänge, Zuteilung an Fm1/Fm2, Annahme, Beförderung, Nachweisen und Weitergabe, Sichtung, ein Fernmelder verlässt den Platz. Skripte und Screenshots: `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/fmz/` (Dateinamen unten in Klammern).

Grundlage: die Audits der Nachrichten-Funktion (`docs/audits/nachrichten/`). Befunde von dort werden nicht wiederholt.

**Annahmen (keine Vorschrift):** Der LdF führt die Fernmeldezentrale als Betrieb: Er teilt Personal und Plätze ein, verteilt Rufgruppen und Leitungen auf die Plätze, überwacht Last und Durchlauf, führt das Technische Betriebsbuch (hier: Nachweisung) mit lückenloser Nummernfolge und übergibt den Betrieb zum Schichtwechsel.

## Urteil

Die Station LdF auf dem Nachrichtenweg ist gegenüber Runde 2 deutlich gereift: Die drei Karten (vor der Zuteilung, vor der Weitergabe, zugeteilt und noch nicht befördert) stehen bei 1320 px ohne waagerechten Überlauf untereinander, die Wartezeit wird bernsteinfarben „über der Schwelle“, die Zuteilung lässt sich in der eigenen Sicht ändern (`70-ldf-1320-voll.png`). Was fehlt, ist alles, was den **Betrieb** der FmZ statt der einzelnen Nachricht betrifft: Wer sitzt an welchem Platz und hört welche Rufgruppe, wie ist die Last über die Zeit, welche Nummern sind wo vergeben. Die Daten dafür liegen größtenteils schon in der App, aber verteilt auf Statuszeile, Diagnose, Funkplan-Freitext und Nachweisung. Der schwerste neue Befund: Zwei Fernmelder, die gleichzeitig aufnehmen, vergeben dieselbe Nummer, und keiner der beiden erfährt es.

## Stichprobe der als offen geführten Befunde

| Befund | Stand im Browser |
| --- | --- |
| R2-LdF P1-1 (Karten über den Rand bei 1320 px) | behoben: `scrollWidth` 1320 in LdF-, Sichter- und FmZ-Sicht. |
| R2-LdF P3-4 (Vorschlag nur über die FmZ-Sicht änderbar) | behoben: „Zuteilung ändern“ in der Karte „Zugeteilt, noch nicht befördert“. |
| R2-LdF P2-4 (Bandzahl „über der Schwelle“ trennt LdF und FmZ nicht) | weiter sichtbar: Band „0 über der Schwelle“, während zwei Eingänge beim LdF „über der Schwelle“ markiert sind (`70-ldf-1320-voll.png`). |

## Fehlende Ansichten

### LdF-A1 (P1) – Arbeitsplatzübersicht der FmZ (Plätze, Personal, Rufgruppen, Last)

- **Was der LdF sehen/tun muss:** Je Platz Fm1–Fm3 (und weitere): besetzt ja/nein, von wem (Name, Handzeichen), seit wann; welche Rufgruppen und Leitungen dieser Platz abhört; was ihm zugeteilt ist (angenommen / nicht angenommen / ältestes); letzte Handlung. Daraus: Umverteilen von Zuteilungen und Rufgruppen, wenn ein Platz ausfällt oder überlastet ist.
- **Was die App schon hat:** Präsenz mit Stellen (`besetzteStellen`, Statuszeile „4 weitere: S3, Fm1, Sichter, Fm2“), Anzeigename und Handzeichen der Sitzung, Zuteilung je Nachricht mit Fernmelder, Annahme und Wartezeit, Feld „hört“ an der Rufgruppe, „eingetragen von“ in den Funkproben, Arbeitsplätze mit „Zuletzt gesehen“ in der Diagnose.
- **Wo es heute verstreut ist:** Statuszeile (nur Stellen, kein Name, keine Zeit), Diagnose im Fenstermenü (Namen, keine Stellen; `54-diagnose.png`), Auswahlliste „Fernmelder“ der Zuteilungsmaske („Fm1 · Fm1 Yilmaz“, „Fm3 (nicht besetzt)“; `22-zuteilen.png`), Karte „Zugeteilt, noch nicht befördert“ (nur Nachrichten, keine Plätze), Funkplan-Spalte „Zweck · hört“ als Freitext ohne Bezug zu den Stellen (`48-fm1-funkplan.png`).

### LdF-A2 (P1) – Nummernkreise und Nummernvergabe

- **Was der LdF sehen/tun muss:** Welche Nummern vergeben, doppelt, frei oder als Lücke sind; Nummernbereiche je Platz oder je Papierblock vorab festlegen (z. B. Fm1 ab 100, Fm2 ab 200, Papier-Rückfall ab 900), damit parallel aufnehmende Plätze und der Papierweg nicht kollidieren; Doppelungen sofort sehen und berichtigen.
- **Was die App schon hat:** gemeinsamer Zähler „höchste bekannte plus eins“, Marke „doppelt“ und „Berichtigen“ in der Nachweisung, Zeile „Fehlende Nummern“, Konflikthinweise in der Diagnose („Nummer 10 zweimal: …“), Warnung bei bekannter Doppelung vor dem Schreiben.
- **Wo es heute verstreut ist:** Nachweisung (Marke „doppelt“), Statuszeile („⚠ 4 Konflikthinweise“), Diagnose im Fenstermenü. Es gibt keine Stelle, an der Bereiche festgelegt werden; siehe Befund LdF-1.

### LdF-A3 (P2) – Last und Stau über die Zeit

- **Was der LdF sehen/tun muss:** Aufkommen je Stunde (Eingänge, Ausgänge, Vorrang, Mittel), Durchlaufzeiten (Aufnahme → Weitergabe → Sichtung; Aufgabe → Zuteilung → Beförderung), Spitzen und Rückstau je Station, um Personal nachzufordern oder Plätze umzustellen, und für die Lagemeldung an den Leiter.
- **Was die App schon hat:** alle Zeitstempel je Nachricht (Aufnahme, Zuteilung, Annahme, Beförderung, Weitergabe, Sichtung; Nachweisung `41-ldf-nachweisung.png`), Band mit Momentanwerten (vor der FmZ, vor dem Sichter, vor dem LdF, über der Schwelle), Schwellen je Vorrang.
- **Wo es heute verstreut ist:** Nur als Momentaufnahme im Band und als Einzelzeiten in der Nachweisung; keine Zeitreihe, keine Summen, kein Export dazu (Exporte „Protokolle und Funk“ kennt Anforderungen, Tagebuch, Funkplan; `61-exporte.png`).

### LdF-A4 (P2) – Schichtübergabe der FmZ

- **Was der LdF sehen/tun muss:** Eine Übergabeseite für den ganzen Fernmeldebetrieb: offene Nachrichten je Station und Platz, Zuteilungen ohne Beförderung, Nummernstand und Lücken, Rufgruppen mit „kein Kontakt“, Doppelungen und Konflikte, Personalwechsel; mit Unterschrift/Handzeichen von Abgebendem und Übernehmendem.
- **Was die App schon hat:** Sicht „Offen“, Nachweisung mit Zeitraum „von/bis“ und Unterschriftszeile, Funkplan-Band (kein Kontakt, ohne Rufgruppe), Schichtplan im Blatt Führungsstelle mit Teilbereich „FGr K“.
- **Wo es heute verstreut ist:** „Offen“ des LdF zeigt nur seine eigene Station; die Karte „Zugeteilt, noch nicht befördert“ fehlt dort (zwei Nachrichten bei Fm1, eine bei Fm2 standen in der LdF-Sicht, nicht in „Offen“; `42-ldf-offen.png` gegen `40-ldf-sicht.png`). Der Schichtplan kennt die besetzten Stellen nicht (Befund LdF-5).

### LdF-A5 (P2) – Wandanzeige der FmZ

- **Was der LdF sehen/tun muss:** Auf einem zweiten Bildschirm in der FmZ: Warteschlangen je Station, Blitz/Sofort mit Wartezeit, Plätze und ihre Rufgruppen – lesbar aus drei Metern, ohne an einem Arbeitsplatz zu blättern.
- **Was die App schon hat:** den Monitor mit neun Ansichten (Stärke, Versorgung, Funkplan als Taste 6 u. a.), die Zahlen des Nachrichten-Bands.
- **Wo es heute verstreut ist:** Der Monitor hat keine Ansicht für den Nachrichtenweg (`Monitorbild.tsx`: verpflegung, vorausschau, unterbringung, tafel, funkplan, abschnitte, organisationen, kreuz, Stärke); das Band steht nur im Blatt Nachrichten.

## Befunde an vorhandenen Ansichten

### LdF-1 (P1) – Zwei Fernmelder nehmen gleichzeitig auf: dieselbe Nummer, keine Warnung

- **Beobachtung:** Fm1 und Fm2 öffnen „Eingang aufnehmen“ fast gleichzeitig; beide Masken sind mit Nr. 16 vorbelegt, beide „Aufnehmen“ schreiben Nr. 16, beide bekommen „In der Nachweisung unter Nummer 16 eingetragen.“ ohne Warnung (`nummer.js`, `60-nummer-fm1.png`, `60-nummer-fm2.png`). Im regulären Szenario mit zwei Plätzen im Wechsel entstanden so unbemerkt E 10 und E 11 doppelt. Die Karte „Vor der Weitergabe an den Sichter“ führt danach „15, 15, 16, 16“ ohne Marke (`70-ldf-1320-voll.png`), das Tagebuch ebenfalls ohne Hinweis (`62-tagebuch.png`); nur die Nachweisung zeigt „doppelt“ und die Statuszeile „⚠ 4 Konflikthinweise“. Ursache im Code: Die Vorbelegung wird beim Öffnen der Maske festgehalten (`renderer/useMaskenteile.ts`, `useStart`), die Warnung kennt nur Nummern, die der Arbeitsplatz zum Schreibzeitpunkt schon gesehen hat.
- **Auswirkung:** Im Normalbetrieb mit zwei Funkplätzen (nicht nur offline) entstehen doppelte Nummern, die der LdF bei der Weitergabe abzeichnet, ohne sie zu sehen. Rückfragen „Ihre Nr. 16“ sind nicht eindeutig; das Betriebsbuch muss nachträglich berichtigt werden.
- **Empfehlung:** Nummernbereiche je Platz (LdF-A2) oder Vergabe beim Schreiben statt beim Öffnen; nach dem Abgleich eine Warnung an beide Plätze und an den LdF („Nr. 16 auch von Fm2 vergeben“); Marke „doppelt“ auch in der Karte des LdF und in der Weitergabemaske.
- **Verifikation:** Zwei Kontexte, beide Aufnahmemasken öffnen, nacheinander binnen einer Sekunde „Aufnehmen“: Es darf keine stille Doppelung entstehen, oder beide Plätze und der LdF sehen sie binnen eines Abgleichs.

### LdF-2 (P2) – Zuteilung an einen Fernmelder, der gegangen ist, bleibt unmarkiert

- **Beobachtung:** Fm2 schließt seinen Platz; die Statuszeile zeigt nach etwa 140 s nur noch „3 weitere: S3, Fm1, Sichter“. In der Karte „Zugeteilt, noch nicht befördert“ steht „Lotsen für Nachschub · Fm2 · Kurier/Melder an Tr ML · nicht angenommen“ unverändert, ohne „nicht besetzt“ und ohne Hinweis (`s20.out`, `70-ldf-1320-voll.png`). Die Auswahlliste der Zuteilung kennt „(nicht besetzt)“ (`22-zuteilen.png`), die Karte nicht.
- **Auswirkung:** Eine zugeteilte Nachricht liegt bei einem leeren Platz; der LdF merkt es erst über die Wartezeit.
- **Empfehlung:** Marke „Fm2 nicht besetzt“ in der Karte, Hinweis an den LdF beim Wegfall eines Platzes mit offenen Zuteilungen, „Zuteilung ändern“ dort hervorgehoben.
- **Verifikation:** Zuteilung an Fm2, Fm2-Kontext schließen, nach Ablauf der Präsenzfrist trägt die Zeile die Marke und der LdF hat einen Hinweis.

### LdF-3 (P2) – Zuteilung nutzt den Funkplan nicht: Gegenstelle ist die Anschrift, Rufgruppe und Abhörplatz fehlen

- **Beobachtung:** Die Zuteilungsmaske belegt „Rufname der Gegenstelle“ mit der Anschrift („GE SFM“, „Tr ML“), obwohl der Funkplan den Funkrufnamen kennt („Heros Delmenhorst 59/20“); sie zeigt weder die Rufgruppe der Einheit noch, welcher Platz sie abhört (`22-zuteilen.png`, `s20.out`). Fm1 beförderte „Pumpwerk räumen“ an Gr EV über THW_OL_EA2, die laut Funkplan Fm2 abhört; die Funkprobe steht unter Fm1 (`49-funkproben.png`). In der Nachweisung steht als Gegenstelle der Ausgänge die Anschrift, bei den Eingängen der Funkrufname (`41-ldf-nachweisung.png`).
- **Auswirkung:** Der LdF teilt zu, ohne zu sehen, welcher Platz die Gruppe ohnehin hört; die Nachweisung mischt Rufnamen und Einheitenbezeichnungen in derselben Spalte.
- **Empfehlung:** In der Zuteilung Rufgruppe, Funkrufname und „hört“-Platz der Anschrift anzeigen und den abhörenden Platz als Fernmelder vorschlagen; Gegenstelle mit dem Funkrufnamen vorbelegen.
- **Verifikation:** Ausgang an eine Einheit mit Rufgruppe „hört Fm2“: Die Zuteilung schlägt Fm2 und den Funkrufnamen vor.

### LdF-4 (P2) – Wartezeit in „Zugeteilt, noch nicht befördert“ ohne Schwelle; Stand stockt in ruhigen Phasen

- **Beobachtung:** Die Spalte „Wartet“ der Karte zeigt nur Minuten, keine Marke „über der Schwelle“ wie die Weitergabe-Karte. Bei vier Messungen über 140 s blieb sie bei „13 min“ stehen, solange kein neues Ereignis kam (`s20.out`); später sprang sie auf „19 min“ (`70-ldf-1320-voll.png`). Die Zeit kommt als `wartetSeit` aus der Projektion (`renderer/Ldfsicht.tsx`, Zeile 255), nicht aus der Uhr der Sicht. (Einmalige Messung; Annahme: neu gerechnet wird beim nächsten Abgleich mit Änderung.)
- **Auswirkung:** Gerade wenn es ruhig ist und ein Platz ausfällt, bleibt die Zeit stehen, die den Stau zeigen soll.
- **Empfehlung:** Wartezeit aus Zeitstempel und Uhr der Sicht rechnen; Schwellenmarke wie in den anderen Karten.
- **Verifikation:** Zuteilung ohne weitere Ereignisse 3 min beobachten: Minuten steigen jede Minute, ab Schwelle Bernstein.

### LdF-5 (P2) – Dienstposten und Schichtplan kennen die besetzten Stellen nicht

- **Beobachtung:** Bei fünf besetzten Stellen (S3, Sichter, LdF, Fm1, Fm2) meldet das Blatt Führungsstelle „Kein Dienstposten besetzt“ und einen leeren Schichtplan; der Teilbereich „FGr K“ ist vorhanden, aber ohne Bezug zu LdF/Fm1–Fm3 (`52-fuest.png`).
- **Auswirkung:** Der LdF pflegt sein Personal doppelt (Stellenabfrage und Dienstposten) oder gar nicht; Schichtplan und tatsächliche Besetzung laufen auseinander.
- **Empfehlung:** Dienstposten der FGr K mit den Stellen LdF/Fm1–Fm3/Sichter verknüpfen; besetzte Stellen im Schichtplan als „tatsächlich besetzt durch …“ anzeigen.
- **Verifikation:** Stelle Fm1 mit Handzeichen wählen: Der Schichtplan des Tages zeigt Fm1 als besetzt.

### LdF-6 (P3) – „hört“ heißt in der Detailbox „hört mit“

- **Beobachtung:** In der Liste steht „Zweck · hört: Fm2“, im Kasten der gewählten Gruppe „hört mit: Fm2“ (`14-funkplan-rg.png`, `48-fm1-funkplan.png`); „hört mit“ ist im selben Blatt der Begriff für Einheiten, die die Gruppe als weitere tragen.
- **Auswirkung:** Der abhörende FmZ-Platz und mithörende Einheiten werden verwechselt.
- **Empfehlung:** Im Kasten „abgehört von (FmZ)“; „hört“ als Auswahl der Stellen Fm1–Fm3 statt Freitext.
- **Verifikation:** Detailkasten und Liste tragen denselben Begriff.

## Schluss

- **Aufgabe geschafft:** Teilweise. Zuteilen, Prüfen, Nachweisen und Weitergeben gehen ohne Hilfe und passen bei 1320 px. Den Betrieb der FmZ führen (Plätze, Personal, Rufgruppen, Last, Nummern, Übergabe) kann ich nur aus Statuszeile, Diagnose, Funkplan-Freitext und Nachweisung zusammensuchen.
- **Größtes Risiko:** Doppelte Nummern im parallelen Normalbetrieb, die weder die Fernmelder noch ich in meiner Karte sehen (LdF-1).
- **Top-Priorität:** Arbeitsplatzübersicht der FmZ (LdF-A1) zusammen mit Nummernkreisen je Platz (LdF-A2); beides beseitigt LdF-1 bis LdF-3 an der Wurzel.
