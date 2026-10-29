# Audit S1-Control v2 — Perspektive Leiter Führungsstelle / S1–S3

Stand: 29.10.2026, laufende Web-Schale (http://127.0.0.1:8089, Prüflage „Übung Weser-Ems“, 40 Einheiten), Screenshots 01–27 des Durchlaufs von 15:32 Uhr sowie eigene Aufnahmen von 19:45 Uhr (`scratchpad/cmdshots/`). Quellcode nur lesend geprüft. Keine Codeänderungen.

Rolle: Ich habe bisher mit der Excel „Einsatzkräfteübersicht“ gearbeitet (Blätter Stärke, Druck, Status, Log, FüOrg, FüSt). Ich will in wenigen Sekunden wissen: Welche Kräfte sind wo, in welchem Status? Was ist angefordert, aber noch nicht da? Wann ist eine Ablösung fällig? Und stimmen die Zahlen, die ich an die Lagekarte hänge und in der Lagebesprechung vortrage?

Kennzeichnung: **[beobachtet]** = an der laufenden App oder im Screenshot gesehen; **[Code]** = aus der Quelle belegt; **[Annahme]** = Annahme über den THW-Ablauf, nicht aus einer Vorschrift; **[nicht prüfbar]** = in der Web-Schale nicht nachvollziehbar.

---

## Urteil

Die Lage-Ansicht ist der Excel nahe genug, dass ich mich ohne Einweisung zurechtfinde: Abschnittsbaum links mit Stärke je Bereich, Einheitentabelle rechts mit den Spaltengruppen der Excel, Statusleiste darüber, Druck und Status als HTML in der gewohnten Form. Kopfband, Baum, Tabellensumme, Druck und Kostenblatt rechnen mit denselben Zahlen (15/53/225 // 293 ohne Angefordert, 330 mit) — das ist besser als in der Excel.

Drei Dinge verhindern, dass ich damit eine Lagebesprechung führen würde:

1. **Ein einziger Enter in der Stärke-Zelle setzt die Gesamtstärke des ganzen Einsatzes auf „null/null/null // 0“** — an allen Arbeitsplätzen, ohne Warnung. Das habe ich heute live gesehen (19:45 Uhr, ein anderer Arbeitsplatz hat in „Stab FüSt“ die Stärke unverändert bestätigt). Seitdem steht im Kopfband, in der Statuszeile, im Baum und auf jeder Ausgabe Unsinn.
2. **„Angefordert, aber nicht da“ und „Ablösung fällig“ sind nicht auf einen Blick zu sehen.** Das Blatt Anforderungen und der Bereich „Angefordert / Anmarsch“ hängen nicht zusammen, die Ablaufwarnung (K18) ist im Kern gerechnet, aber nirgends gezeichnet, und die Excel-Spalten „Ablösung angefordert / Anforderungs-ID / Zugesagt für“ fehlen in der Einheitentabelle.
3. **Die Zahl 293 mischt Kräfte, die ich einsetzen kann, mit solchen, die ich nicht einsetzen kann** (Anmarsch, Rückmarsch, Rufbereitschaft, Einsatzvorbehalt, Nicht einsatzbereit = 37 Kräfte). Die Statusleiste zählt Einheiten, nicht Kräfte.

Aufgabe ohne fremde Hilfe erledigbar: **mit Umwegen** — solange niemand in eine Stärke-Zelle tippt.

---

## Findings

### P0-1 — Inline-Eingabe in „Fü / UFü / He“ zerstört die Gesamtstärke aller Arbeitsplätze

- **Fundstelle:** Lage → Einheitentabelle, Spalte „Fü / UFü / He“, Doppelklick → Enter. Eigene Aufnahmen `cmdshots/a-lage-1920.png`, `b-lage-1920-rechts.png`, `f-tagebuch.png`. Ereignisdatei `/tmp/s1-share/einsaetze/2026-09-08-uebung-weser-ems/ereignisse/f078c654.0000.jsonl` (19:45:20 und 19:45:26 Uhr).
  Code: `apps/desktop/src/kontrakt/bedienschritte.ts:73-81` (`eingabeAlsWert` kennt nur `art === "zahl"`, alles andere geht als Text durch), `apps/desktop/src/renderer/Einheitentabelle.tsx:219-230` (`schreibeZelle`: Vergleich Text gegen Tripel schlägt immer an → Ereignis wird geschrieben), `packages/domaene/src/projektion/tabelle.ts:137` (Spalte `staerke` mit `art: "staerke"`, schreibt `StaerkeGeaendert` Last-Writer-Wins über das ganze Tripel), `apps/desktop/src/renderer/formate.ts:27-30` (`staerkeText` druckt `null/null/null // 0`).
- **Beobachtung [beobachtet, Code]:** Um 15:32 Uhr zeigten alle Ansichten 15/53/225 // 293. Um 19:45 Uhr hat ein anderer Arbeitsplatz („Arbeitsplatz“ auf `vm`) für E02 „Stab FüSt Nacht“ und E01 „Stab FüSt“ die Stärke bestätigt — Ereignis `StaerkeGeaendert` mit `neu: "1/2/1"` als **Text** statt `{fuehrer, unterfuehrer, mannschaft}`; `vorher` war noch das Tripel mit denselben Werten. Seitdem: Kopfband **„null/null/null // 0“**, Statuszeile „40 EINH · null/null/null // 0“, Baum „FüSt Oldenburg 2 Einh. · //“, Tabelle „NaN/NaN/NaN“ und „NaN“ in beiden Zeilen, Summe der Tabelle leer. Die Statusleiste zeigt weiter 25 im Einsatz — kein Hinweis, dass etwas kaputt ist. Das Einsatztagebuch führt den Vorgang als harmloses „Stärke geändert“. „Rückgängig“ ist nur am verursachenden Arbeitsplatz aktiv (an meinem ausgegraut).
- **Erwartung der Rolle:** Enter in einer unveränderten Zelle schreibt nichts. Eine Eingabe „1/2/1“ wird wie in der Maske geprüft (`istStaerkeEingabe`) und als drei Zahlen übernommen. Ungültiges wird mit Meldung abgewiesen, wie es die Excel tut.
- **Auswirkung im Einsatz:** Ein Helfer „schaut nur nach“ und drückt Enter — die Stärke an der Wand, im Druck, auf dem Monitor und in der Meldung an die übergeordnete Stelle ist für alle Arbeitsplätze zerstört, bis jemand die Ursache findet. Druck und Status-HTML (gleiche Summenfunktion) drucken dann „null“ auf die Lagekarte. Die Diagnose nennt es nicht als Störfall. Datenintegrität > Feature-Speed (AGENTS.md §1) ist hier verletzt.
- **Empfehlung:** Inline-Eingabe der Stärke entweder sperren (Bearbeitung nur über eine Maske mit drei Feldern) oder die Eingabe „f/u/m“ in das Tripel übersetzen und gegen `istStaerkeEingabe` prüfen; unveränderte Werte dürfen kein Ereignis erzeugen. Zusätzlich: Der Fold darf kein Nicht-Tripel in `staerke` übernehmen (Quarantäne mit Konflikthinweis statt stilles Übernehmen), und Kopfband/Statuszeile müssen bei nicht rechenbarer Stärke „Fehler: Einheit X ohne gültige Stärke“ zeigen statt „null“. Für die laufende Prüflage: Die beiden Ereignisse per Berichtigung aufheben, sonst sind alle weiteren Reviews der Zahlen wertlos.
- **Verifikation:** Doppelklick auf eine Stärke-Zelle, Enter ohne Änderung → kein Tagebucheintrag, Kopfband unverändert. Eingabe „2/3/1“ → Tabelle zeigt 2/3/1, Kopfband um die Differenz geändert. Eingabe „abc“ → Meldung, kein Ereignis. Ereignisdatei enthält nie `"neu":"…/…/…"` als Text.

### P1-2 — „Was ist angefordert und noch nicht da?“ hat zwei Antworten, die sich widersprechen

- **Fundstelle:** Lage → Baum „Angefordert / Anmarsch 3 Einh. · 1/6/30“ (Screenshot 02, `cmdshots/e-abschnitt-angefordert.png`); Blatt Anforderungen (Screenshot 11); Einheitentabelle Spaltengruppe Ressourcen (Screenshot 05, `cmdshots/d-ressourcen-rechts.png`).
  Code: `packages/domaene/src/projektion/anforderung.ts:203-216` (`anforderungZurEinheit`, K12 — in keiner Ansicht und keiner Ausgabe aufgerufen), `packages/domaene/src/projektion/tabelle.ts:141-152` (Ressourcen-Gruppe ohne „Ablösung angefordert“, „Anforderungs-ID“, „Zugesagt für/von“, „Vorgesehene Einheit/Auftrag“ = Excel-Spalten N–S), `apps/desktop/src/renderer/Anforderungen.tsx:208-216`.
- **Beobachtung [beobachtet, Code]:** Im Bereich „Angefordert / Anmarsch“ stehen drei Einheiten (FGr Räumen B, LZ FW, Bergwacht); die Bergwacht trägt dort den Status „Rufbereitschaft“, ohne dass die Statusleiste oder der Baum das als Widerspruch zeigt. Im Blatt Anforderungen stehen vier Vorgänge (ANF-001 offen, ANF-002 zugesagt, ANF-003 eingetroffen, ANF-004 storniert), von denen **keiner** zu einer dieser drei Einheiten gehört. ANF-003 ist „eingetroffen“, aber ein „SanZ DRK KV Ammerland“ gibt es in der Lage nicht (der SanZ im Bereitstellungsraum ist vom ASB RV Oldenburg). ANF-001 ist eine Ablösung für „BGr 1 Oldenburg“ — in der Zeile dieser Einheit ist davon nichts zu sehen, auch nicht in der Ressourcen-Gruppe. Kopfband und Statuszeile nennen die angeforderten 37 Kräfte nicht; nur die Fußnote des Drucks („Angefordert / Anmarsch: 1/6/30 = 37“) und das Monitor-HTML tun es.
- **Erwartung der Rolle:** Eine Stelle, die sagt: angefordert n Einheiten / x Kräfte, davon zugesagt, davon im Anmarsch, erwartet bis wann. In der Zeile der abzulösenden Einheit: „Ablösung angefordert ANF-001, zugesagt für 14:00“. Wer in Anforderungen „Eingetroffen“ drückt, erwartet, dass daraus eine Einheit in der Lage wird oder zumindest die vorgesehene Einheit verknüpft ist.
- **Auswirkung im Einsatz:** In der Lagebesprechung werden zwei verschiedene Zahlen für „angefordert“ genannt (3 Einheiten im Baum, 2 offene/zugesagte Vorgänge im Blatt). Ablösungen werden doppelt angefordert oder vergessen, weil die Einheitenzeile nichts davon weiß. Die Excel hatte das in einer Zeile.
- **Empfehlung:** K12 in die Tabelle bringen: Spalte „Ablösung“ (Kennung + Zustand + Zusage) in der Ressourcen-Gruppe und als Marke in der Grunddaten-Zeile. Anforderung ↔ Einheit im Bereich „Angefordert / Anmarsch“ verknüpfen (Anlegen aus Vorlage mit Anforderungs-Kennung; „Eingetroffen“ verschiebt/verknüpft die Einheit). Kopfband oder Statuszeile: „davon angefordert 37“. Statusleiste: Widerspruch „Status Rufbereitschaft im Bereich Angefordert“ markieren.
- **Verifikation:** Für BGr 1 Oldenburg ist ANF-001 in der Tabellenzeile sichtbar; die Zahl der angeforderten Kräfte steht im Kopf und stimmt mit Baum und Druck-Fußnote überein; „Eingetroffen“ in Anforderungen führt zu einer Einheit in der Lage.

### P1-3 — „Wann ist Ablösung fällig?“ ist nirgends zu sehen

- **Fundstelle:** Lage → Spaltengruppe „Ressourcen“ (standardmäßig aus), Spalte „Verfügbar bis“ (Screenshot 05 ganz rechts); Statusleiste; Druck/Status-HTML.
  Code: `packages/domaene/src/kennzahlen.ts:420-427` (`verfuegbarkeitLaeuftAb`, K18 — in Renderer, Projektion und Ausgaben nicht aufgerufen), `packages/domaene/src/projektion/tabelle.ts:66` (Vorbelegung nur Grunddaten + Stärke), `:144` (`verfuegbarBis`).
- **Beobachtung [beobachtet, Code]:** „Verfügbar bis“, „Eingetroffen“, „Einsatzende“, „Rückführung“ liegen in der ausgeschalteten Gruppe Ressourcen und beim Einschalten am rechten Rand hinter 20 Spalten. Es gibt keine Hervorhebung einer ablaufenden Verfügbarkeit, keinen Zähler „Ablösung fällig“, keine Sortierung nach Zeit, keine Marke in der Zeile und nichts davon im Druck. In der Prüflage sind die Felder leer, der Mechanismus wäre aber auch mit Daten unsichtbar.
- **Erwartung der Rolle:** Wie in der Excel-Ressourcenplanung: „Verfügbar bis“ neben dem Status, Zeilen mit Ablauf innerhalb 24 h farbig, am Kopf „Ablösung fällig: n Einheiten“.
- **Auswirkung im Einsatz:** Ablösungen werden zu spät geplant; der S3 muss sich die Zeiten separat auf Papier führen — dann ist die Software ein Rückschritt gegenüber der Excel.
- **Empfehlung:** K18 zeichnen: Marke an Bezeichnung/Status, Statusleisten-Knopf „Ablösung fällig (n)“, „Verfügbar bis“ in die Standardsicht (direkt nach Status/Schicht), im Druck als Spalte oder Fußnote je Bereich.
- **Verifikation:** Einheit mit „Verfügbar bis“ in 3 h → Zeile markiert, Zähler 1, Filter zeigt sie; nach 25 h-Wert keine Marke.

### P1-4 — Die Gesamtstärke mischt einsetzbare und nicht einsetzbare Kräfte; die Statusleiste zählt Einheiten statt Kräfte

- **Fundstelle:** Kopfband „15/53/225 // 293“, Statuszeile „40 EINH · …“, Statusleiste (Screenshot 02), Druck (25), Status-HTML (27).
  Code: `packages/domaene/src/kennzahlen.ts:33-44, 104-115` (Zählen ist ein Attribut des Abschnittstyps, nicht des Status), `apps/desktop/src/renderer/Einheitentabelle.tsx:65-101` (Statusleiste: Zahl = Einheiten, Stärke nur im `title`-Tooltip).
- **Beobachtung [beobachtet, Code]:** 293 enthält GTr Wassergefahren im **Anmarsch** (5, weil die Einheit im EA Pumpwerk Süd steht), Trupp Aufklärung im **Rückmarsch** (3), SanZ in **Rufbereitschaft** (15), FGr Notversorgung mit **Einsatzvorbehalt** (6), Gr Wasserrettung **nicht einsatzbereit** (8) — 37 Kräfte, die ich nicht einsetzen kann. Die Bergwacht in Rufbereitschaft zählt dagegen nicht, weil sie im Bereich „Angefordert“ steht. Die Statusleiste zeigt „Einsatz 25 · Einsatzbereit 5 · Anmarsch 1 …“ — das sind Einheiten; die Kräfte je Status gibt es nur im Status-HTML (mit Angefordert: 330). Die Statuszeile sagt „40 EINH“ (mit Angefordert) neben „293“ (ohne).
- **Erwartung der Rolle [Annahme]:** Die erste Frage der Lagebesprechung ist „wie viele einsetzbar / im Einsatz / in Bereitstellung“. Die Stärkezahl sollte sagen, was sie zählt, und die Statusleiste Kräfte zeigen.
- **Auswirkung im Einsatz:** Die Meldung „293 Kräfte“ nach oben überzeichnet die Lage um 37; der Tooltip hilft niemandem, der mit Handschuhen am Touch arbeitet oder aus zwei Metern liest.
- **Empfehlung:** Statusleiste: „Einsatz 25 Einh. · 173“ (Zahl der Kräfte sichtbar). Kopfband oder Statuszeile: „davon einsetzbar/im Einsatz“ als zweite Zahl. Im Baum und in der Tabelle den Widerspruch Status ↔ Bereich (Anmarsch im Einsatzort, Rufbereitschaft im Angefordert-Bereich) markieren.
- **Verifikation:** Statusleiste zeigt je Status Einheiten und Kräfte; Summe der Kräfte aller Status = 330 = Status-HTML; Kopfband nennt die Zahl der einsetzbaren Kräfte, die mit Status-HTML (Einsatz + Einsatzbereit + Ruhe?) nachrechenbar ist.

### P1-5 — In der Standardsicht sind Status und Stärke nicht ohne Scrollen sichtbar

- **Fundstelle:** Lage bei 1440 px (Screenshot 02: letzte sichtbare Spalte „Geräte“, Status/Schicht/Stärke außerhalb), bei 1920 px (`cmdshots/a-lage-1920.png`: Status sichtbar, „Fü / UFü / He“ und „Gesamt“ abgeschnitten).
  Code: `packages/domaene/src/projektion/tabelle.ts:109-138` (Spaltenreihenfolge strikt nach Excel: FüSt., Bezeichnung, Organisation, Herkunft, Gliederungsebene, Geräte, Aufträge, Status, Schicht, ID Erfassungsbogen, Personalerfassung, Stärke), `packages/domaene/src/kennzahlen.ts:627` (`herkunftText` setzt „ORTSVERBAND “ vor jeden Namen).
- **Beobachtung [beobachtet, Code]:** Die Tabelle ist 14 Spalten breit, bevor die Stärke kommt. Breite kosten vor allem: Herkunft mit dem Präfix „ORTSVERBAND“ in jeder Zeile (auch „ORTSVERBAND Landkreis Ammerland“, „ORTSVERBAND PiBtl 130“, „ORTSVERBAND DRK KV Oldenburg“ — fachlich falsch), die leeren Spalten „FüSt.“, „Geräte / Fahrzeuge“, „Aufträge“, „ID Erfassungsbogen“ in voller Breite und der Rohwert „NUR_STAERKE“ in „Personalerfassung“. Die Summenzeile „Summe“ steht links, die Summe selbst rechts außerhalb des Bilds. Die Abschnittsspalte wiederholt den Baum, der daneben steht.
- **Erwartung der Rolle:** Auf einem normalen Bildschirm der Führungsstelle (Annahme: 1920×1080 oder Laptop 1440) ohne Scrollen: Abschnitt, Bezeichnung, Organisation, Herkunft, Status, Schicht, Stärke, Gesamt. Wie in der Excel mit fixierten Spalten.
- **Auswirkung im Einsatz:** Die Kernfrage „wer ist wo in welchem Status mit welcher Stärke“ kostet pro Blick einen Scroll; auf der Lagebesprechung über Beamer ist die Stärke nie im Bild.
- **Empfehlung:** Bezeichnung, Status, Schicht, Stärke und Gesamt links fixieren oder direkt hinter Bezeichnung ziehen; „ORTSVERBAND“ weglassen bzw. nur die Art als Tooltip; leere Spalten schmal; „NUR_STAERKE“ als Beschriftung („nur Stärke“) oder Symbol; Abschnittsspalte bei gewähltem Abschnitt ausblenden.
- **Verifikation:** Bei 1440 px sind in der Standardsicht Status und Stärke ohne horizontales Scrollen sichtbar; Herkunft zeigt „THW OV Oldenburg“, „Landkreis Ammerland“.

### P2-6 — Dieselbe Zahl folgt je Ansicht einer anderen Konvention

- **Fundstelle:** Baum/Harke (Screenshot 02, 14), Druck (25), Status-HTML (27), Führungsstelle (12), Statuszeile.
  Code: `packages/domaene/src/projektion/baum.ts:24-31, 177` (`summenStaerke` = Teilbaum, ohne Rücksicht auf `zaehlt`), `packages/ausgaben/src/druck.ts:96` („Je Zeile die eigene Stärke, nicht die des Teilbaums“), `packages/domaene/src/kennzahlen.ts:488-500` (Status-Matrix mit, Schicht-Matrix ohne Angefordert), `packages/domaene/src/projektion/fuest.ts:150-173` (Führungsstelle aus Dienstposten; `fuestStaerke` fließt in keine Ausgabe).
- **Beobachtung [beobachtet, Code]:** Baum und Harke: „EA Deich Nord 11 Einh. · 2/11/70“ (mit UA Deichfuß); Druck: „EA Deich Nord 1/7/37 = 45“ und „UA Deichfuß 1/4/33 = 38“ (ohne Kennzeichnung, dass 70 = 37 + 33). Status-HTML auf einem Blatt: Organisationen 330, Status 330, Schichten 293, „Kontrollsummen o.k.“ — ohne zu sagen, warum drei Gesamtzahlen stimmen. Führungsstelle: besetzte Dienstposten ergeben 2/6/4 = 12 (Stab, ZTr FK, FGr F, FGr K, Externe), die Lage führt die FüSt als zwei gemeldete Einheiten mit 3/5/2 = 10; die Spalte „Besetzt · TAG 1/3/0“ zählt Posten mit Namen, aber der Kopfkommentar der Projektion verspricht „keine Doppelerfassung“ — in der Prüflage ist sie doppelt und verschieden. Statuszeile „40 EINH“ zählt mit Angefordert, die Stärke daneben ohne.
- **Erwartung der Rolle:** Eine Zahl je Bereich, die auf Baum, Harke und Druck gleich ist, oder eine deutliche Beschriftung „mit Unterabschnitten“. Eine FüSt-Stärke.
- **Auswirkung im Einsatz:** Wer Druck und Harke nebeneinander an die Lagekarte hängt, erklärt in jeder Besprechung die Differenz. Die FüSt-Stärke wird je nach Blatt mit 10 oder 12 gemeldet.
- **Empfehlung:** Im Baum/der Harke „2/11/70 (davon UA 1/4/33)“ oder eigene Stärke plus Teilbaum; im Druck eine Zwischensumme je Teilbaum. Im Status-HTML die Kopfzeile „mit Angefordert (330)“ / „ohne (293)“. Für die FüSt entscheiden: entweder Dienstplan speist die Stärke (K17) und die gemeldeten FüSt-Einheiten entfallen, oder umgekehrt.
- **Verifikation:** Baum, Harke und Druck nennen für EA Deich Nord dieselbe Zahl oder beschriften die Abweichung; FüSt-Stärke in Lage und Blatt Führungsstelle identisch.

### P2-7 — Die Führungsharke stellt die TEL als Geschwister der EAL dar

- **Fundstelle:** Blatt Führungsorganisation (Screenshot 14), `apps/desktop/src/renderer/harke.ts:178-184` (`harkenbild`: alle Wurzelknoten außer Einrichtungen in **eine** Ebene), `Fuehrungsorganisation.tsx:86`.
- **Beobachtung [beobachtet, Code]:** TEL „FüSt Oldenburg“, vier EAL und das gestrichelte Feld „Angefordert“ hängen nebeneinander am selben Querbalken; nur die UEAL hängt darunter. In der Kurzform steht der Typ („EAL“) groß im Zeichen, der Name des Abschnitts klein darunter; „EA Reserve 0 Einh.“ wird mitgezeichnet.
- **Erwartung der Rolle [Annahme]:** Die Harke auf der Lagekarte zeigt die Führungsstelle oben und die Einsatzabschnitte darunter; der Name des Abschnitts ist, was man liest.
- **Auswirkung im Einsatz:** Beim Ausdruck für die Lagekarte wird die Führungsstruktur falsch gelesen (TEL als fünfter Abschnitt). Leere Reserveabschnitte blähen die Harke.
- **Empfehlung:** Führungsstelle als Wurzel, darunter die EAL; Name mindestens so groß wie die Kurzform; leere Abschnitte optional ausblenden (wie im Druck).
- **Verifikation:** PDF „Als PDF (Lagekarte)“ zeigt TEL über den EAL; Name lesbar aus 2 m.

### P2-8 — „Was ist passiert?“ beantwortet das Tagebuch nur mit Umweg

- **Fundstelle:** Blatt Einsatztagebuch (Screenshot 17: 1 Eintrag; `cmdshots/f-tagebuch.png`: 4 Einträge), Haken „Auf die Auswahl beschränken“ vorbelegt.
- **Beobachtung [beobachtet]:** Beim Wechsel aus der Lage ist der Filter auf die zuletzt gewählte Einheit/den Abschnitt gesetzt; ohne Wahl in der Lage merkt man das nicht und sieht „1 Einträge“ — der Eindruck ist „nichts passiert“. Die Spalte „Fachliche Zeit“ ist durchgehend leer; die Einträge heißen „Einheit gemeldet“ / „Stärke geändert“ ohne alten und neuen Wert (Ausnahme laut Code: Rücknahmen). Zeitangaben: Kopfband „291532OCT26“ (englischer Monat, ohne Zonenbuchstabe — bekannt offen), Anforderungen „8.9.2026, 05:30:00“, Tagebuch „29.10. 15:02:31“, Schichtplan „2026-09-08“, Datumsfeld „mm/dd/yyyy“.
- **Erwartung der Rolle:** Beim Öffnen des Tagebuchs die letzten Vorgänge des ganzen Einsatzes, mit „vorher → nachher“, und eine Schreibweise der Zeit.
- **Auswirkung im Einsatz:** Übergabe an die ablösende Führungskraft ohne mündliche Erklärung ist nicht möglich; Fehler wie P0-1 sind im Tagebuch nicht als solche erkennbar.
- **Empfehlung:** Filter beim Wechsel ins Blatt nicht vorbelegen bzw. sichtbar als Chip „nur ZTr THW Deich ✕“; Vorgang mit Werten („Stärke 1/2/1 → 1/2/1“ würde P0-1 sofort verraten); eine Zeitschreibweise (DTG) überall.
- **Verifikation:** Tagebuch ohne Auswahl zeigt alle Einträge; Eintrag „Stärke geändert“ nennt alten und neuen Wert.

### P2-9 — „8 Konflikthinweis(e)“ in der Statuszeile ohne Weg zur Stelle

- **Fundstelle:** Statuszeile unten (alle Screenshots ab 03), Diagnose (18), `apps/desktop/src/renderer/Statuszeile.tsx:97`, `Einheitentabelle.tsx:453-474` (⚠ an der Zelle).
- **Beobachtung [beobachtet, Code; welche Zellen betroffen sind: nicht prüfbar]:** Die Zahl steht in Orange, ist nicht anklickbar; die Diagnose wiederholt nur die Zahl und erklärt das Verfahren. In der Tabelle habe ich in keiner Ansicht ein ⚠ gefunden — die acht Hinweise sind von der Lage aus nicht auffindbar.
- **Erwartung der Rolle:** Klick auf die Zahl → Liste „Feld, Einheit, Gewinner, verdrängter Wert“, von dort in die Zeile.
- **Auswirkung im Einsatz:** Der Leiter weiß, dass acht Werte strittig sind, aber nicht welche; er kann sie nicht fachlich klären (was die Diagnose selbst als Pflicht nennt).
- **Empfehlung:** Konfliktliste als Filter in der Einheitentabelle („Nur umstrittene“) und als anklickbare Zahl in der Statuszeile.
- **Verifikation:** Klick auf „8 Konflikthinweis(e)“ führt zu acht konkreten Zellen.

### P2-10 — „Stand vor 30 min“ in Grün

- **Fundstelle:** Kopfband-Zustandszeile (Screenshots 02–23), Diagnose (18: Uhr des Seed-Rechners „30 min nach“).
- **Beobachtung [beobachtet]:** Die Zeile zeigt grün „✓ … Stand vor 30 min · Share erreichbar“. Der Grund (Uhrabweichung eines Arbeitsplatzes) steht nur in der Diagnose.
- **Erwartung der Rolle:** „Stand“ ist für mich das Alter der Lage. 30 Minuten bei erreichbarem Share sind ein Alarm, kein grüner Haken.
- **Auswirkung im Einsatz:** Entweder vertraut man einer alten Lage oder man misstraut einer aktuellen.
- **Empfehlung:** Bei bekannter Uhrabweichung „Stand: aktuell (Uhr von Rechner X weicht ab)“; bei echtem Alter > n Minuten Farbe wechseln.
- **Verifikation:** Rechner mit falscher Uhr → Zeile nennt die Abweichung statt eines alten Standes.

### P3-11 — Stärke-Monitor in der Web-Schale nicht sichtbar

- **Fundstelle:** Lage → „Stärke-Monitor“ (`cmdshots/h-monitor-page.png`), `apps/desktop/src/renderer/Monitor.tsx`, `Monitorwahl.tsx`.
- **Beobachtung [beobachtet; Electron-Fenster nicht prüfbar]:** Der Knopf schaltet die Leiste auf „Auf dem Zweitbildschirm öffnen / Schließen“, aber kein Monitorbild erscheint (kein `section[aria-label="Stärke-Monitor"]` im Dokument). Laut Code zeigt der Monitor Gesamtstärke, DTG mit deutschem Monat („OKT“) und Stand — das Kopfband schreibt „OCT“ (bekannt offen). Mit P0-1 würde der Monitor „null/null/null“ an die Wand werfen.
- **Empfehlung:** In der Web-Schale den Monitor als eigene Seite (`/monitor`) anbieten; Monatskürzel vereinheitlichen; auf dem Monitor „davon angefordert“ und „davon einsetzbar“ mit anzeigen, sonst ist er nur ein Kopfband in groß.
- **Verifikation:** Monitor-Seite im Browser aufrufbar, Zahlen = Kopfband.

### P3-12 — Kleinigkeiten, die Zeit kosten

- Druck (25): Spalte „Probe o.k.“ kann laut Code nie fehlschlagen (`druck.ts:21-24`) — sie belegt Platz, den „Status“ oder „Verfügbar bis“ je Bereich besser füllte.
- Status-HTML (27): „Männl.“ wird als Gesamt − Weibl. − Div. gerechnet, obwohl bei 37 von 40 Einheiten keine Logistikdaten erfasst sind (alles 0) — das liest sich als „306 männlich“, obwohl es „unbekannt“ heißt.
- Kosten (13): Fußnote „nach dem Zieldatenmodell §2.4“ — ein Dokumentverweis, den kein Helfer kennt; „3 Einheiten (angefordert) nicht gerechnet“ reicht.
- Schichtmodelle Tag/Nacht und Früh/Spät/Nacht sind in derselben Lage gemischt; „Nacht“ gehört zu beiden; das Status-HTML summiert beides in einer Tabelle.
- Baumzeile „Angefordert / An…“ und „Einsatz beendet“ ohne Zeichen und mit abgeschnittenem Namen; dass diese Bereiche nicht zählen, steht nirgends im Baum.

---

## Zahlenprobe (Stand 15:32 Uhr, vor P0-1)

| Stelle | Zahl | Grundlage |
|---|---|---|
| Kopfband / Statuszeile / Monitor-HTML | 15/53/225 // 293 | ohne Bereich Angefordert (K3) |
| Tabelle „Summe“ (alle) | 16/59/255 // 330 | mit Angefordert |
| Baum, Summe aller Wurzeln | 16/59/255 | Teilbaum, mit Angefordert |
| Druck Gesamt | 15/53/225 = 293 + Fußnote 1/6/30 = 37 | ohne Angefordert |
| Status-HTML Organisationen / Status | 330 / 330 | mit Angefordert |
| Status-HTML Schichten | 293 | ohne (Angeforderte haben keine Schicht) |
| Kosten Summe | 293 Kräfte | ohne Angefordert, Eingang, Archiv |
| Statusleiste | 40 Einheiten (2+1+2+1+5+25+2+1+1) | Einheiten, nicht Kräfte |
| FüSt: Lage vs. Blatt Führungsstelle | 10 vs. 12 | zwei Datenquellen |

Rechnerisch stimmig; die Lesbarkeit der Unterschiede ist das Problem (P1-4, P2-6). Seit 19:45 Uhr sind alle stärkebasierten Zahlen durch P0-1 ungültig.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen (Kräfte je Bereich und Status sind ablesbar; angefordert/nicht da und Ablösung fällig nur über mehrere Blätter und eigene Notizen).
- **Fremde Hilfe nötig:** ja — nach dem Enter in einer Stärke-Zelle kann die Führungsstelle die Gesamtstärke ohne Entwickler nicht wiederherstellen; und um die acht Konflikthinweise zu finden.
- **Größtes Missverständnis:** „293“ wird als einsetzbare Stärke gelesen, enthält aber 37 Kräfte im Anmarsch, Rückmarsch, in Rufbereitschaft, unter Vorbehalt oder nicht einsatzbereit — und schließt Angeforderte aus, obwohl die Statuszeile daneben „40 EINH“ mit ihnen zählt.
- **Größtes Einsatzrisiko:** Eine bestätigte, unveränderte Stärke-Zelle schreibt ein Text-Ereignis, das die Gesamtstärke an allen Arbeitsplätzen, im Druck und auf dem Monitor auf „null“ setzt, ohne Warnung und ohne Rückweg für die anderen Plätze.
- **Top-Priorität für die nächste Iteration:** P0-1 schließen (Stärke-Zelle als Tripel prüfen und schreiben, unveränderte Eingabe verwirft, Fold weist Nicht-Tripel ab, Kopfband meldet ungültige Stärke statt „null“); direkt danach K12/K18 sichtbar machen (Ablösung angefordert / fällig in der Einheitenzeile und Statusleiste).
