# Audit „Fernmelder“: S1-Control v2, Stand 05.11.2026

**Rolle:** Fernmelder bzw. Sprechfunker am Fernmeldeplatz einer THW-Führungsstelle. Eine Hand am Hörer oder an der Sprechtaste, die andere an der Tastatur. Er schreibt mit, während gesprochen wird, ordnet gehörte Rufnamen Einheiten und Rufgruppen zu, übernimmt Statusmeldungen und gibt Nachrichten vollständig weiter.
**Material:** Eigene Web-Schale (Port 8221) mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten), HEAD `6772ffe`. Profil „Vermeldezentrale“, Anzeigename „Fernmelder 1“, Desktop 1600 × 1000. Bedient mit Playwright fast ausschließlich über `page.keyboard`; Mausklicks nur zum Herstellen einer Vorbedingung (Auswahl einer Lagezeile für den Test der Kürzel) und für einen zweiten, gleichzeitig schreibenden Arbeitsplatz. Screenshots unter `/tmp/claude-0/-home-user-S1-Control/5e4b7d40-2c4b-58c0-a32e-96410bb256d6/scratchpad/shots/fernmelder/` (01 bis 34, im Text „Shot NN“). Quelltext nur als Beleg mit Datei:Zeile. Hilfe: `docs/v2/HANDBUCH.md`, `docs/v2/KURZANLEITUNG.md`, Tastenkarte `packages/domaene/src/tastenkarte.ts`.
**Kennzeichnung:** [beobachtet] = in der laufenden Anwendung selbst nachgestellt · [Code] = aus dem Quelltext belegt · [Annahme] = naheliegend, aber nicht nachgestellt, oder THW-Ablauf, der nicht aus dem Material stammt · [nicht prüfbar] = hier nicht nachstellbar.

**Vorbereitung (wie am Platz zu Schichtbeginn):** Die Prüflage hat keine Rufgruppen und keine Funkrufnamen. Ich habe per Tastatur drei Rufgruppen aus dem Fleetmapping angelegt (`THW_01` bis `THW_03`) und zehn Einheiten mit Hauptrufgruppe und Funkrufname versehen (z. B. BGr 1 Oldenburg → „Heros Oldenburg 22/41“, FGr Elektroversorgung → „Heros Aurich 59/51“). Shot 07, 10, 34.

**Geprüfte Aufgaben und gemessene Zeiten:**

Die Zeiten sind Maschinenzeiten mit Playwright-Tippgeschwindigkeit (40 bis 90 ms je Zeichen). Sie zeigen den Aufwand, den die Software selbst verursacht. Wie lange ein Mensch braucht, ist als [Annahme] geschätzt (etwa 200 Anschläge je Minute, plus Orientierung).

| # | Aufgabe | Weg | Tasten (ohne Freitext) | Maschinenzeit | Ergebnis |
|---|---|---|---|---|---|
| 0a | Rufgruppe aus Fleetmapping anlegen | Strg+N, Tab, Name, ↓, Enter, Tab, Zweck, Enter | ~8 | 2,6–2,9 s | ja |
| 0b | Einheit: Hauptrufgruppe + Funkrufname | Strg+F, Name, Tabs zu ✎, Enter, Pfeil, Tab ×2, Enter, Tab, Name, Enter | ~12 | 2,2–2,4 s | ja |
| 1 | Lagemeldung (198 Zeichen) in Echtzeit mitschreiben, während ein zweiter Arbeitsplatz schreibt | Funkplan → Reiter Einsatztagebuch → „Eintrag hinzufügen“ → Text → Tab, Tab, Enter | 11 | Maske bereit nach 0,7 s; gesamt 23,7 s | **nein**: „Nicht gespeichert“ (P0-1) |
| 1b | dieselbe Mitschrift mit eingetippter Zeit „2110“ | wie 1, Zeit eingetippt | 11 + 4 | — | ja |
| 2a | Rufname „22/41“ → Einheit, Bereich, Rufgruppe | Funkplan, Strg+F, „22/41“ | 7 | 0,9 s | ja |
| 2b | dieselbe mit Schreibvariante oder Tippfehler („2241“, „22 41“, „22-41“, „Oldenbrug“, „Hero Brake“) | wie 2a | 7 | — | **nein**: 0 Treffer, kein Hinweis |
| 3 | Mitschrift unterbrechen, Funkplan nachschlagen, zurück | Tab aus der Maske bis Reiter Funkplan, Enter, … zurück | — | — | **nein**: Text verloren (P1-1) |
| 4a | Status nach gehörtem Rufname setzen („Heros Aurich 59/51 jetzt Ruhe“) | Funkplan-Suche → Shift+Tab ×8 zum Reiter Lage → Strg+F, Name → Tab ×3 → Enter → „Ruhe“ → Enter | ~48 | 5,0 s | mit Umwegen; Mensch [Annahme] 20–30 s |
| 4b | Funkprobe „Kontakt“ per Tastatur | Funkplan-Suche → Tab auf Zeile → Enter (Maske) → Tab ×5 → Enter → Esc | ~20 | 2,2 s | ja, aber nicht über Strg+P |
| 5 | Tastenkarte gegen die Bedienung | siehe P1-4 und P3-1 | — | — | 7 von 12 Kürzeln wie beschrieben |

---

## Urteil

Der Funkplan ist für den Fernmelder das Beste an der Anwendung. Rufgruppen sind mit dem Fleetmapping-Vorschlag in drei Sekunden angelegt. Die Zuordnung einer Einheit geht vollständig per Tastatur. Ein korrekt gehörter Rufname ist nach weniger als einer Sekunde mit Bereich und Rufgruppe gefunden. Der Monitor zeigt den Funkplan auf einem zweiten Bildschirm groß und lesbar.

Die Kernarbeit der Rolle ist das Mitschreiben, und dort bricht der Ablauf. Lässt man die Uhrzeit leer („leer = jetzt“, der Normalfall beim Mitschreiben in Echtzeit), speichert die Maske den Eintrag nicht. Sie meldet nur einen technischen Fehler. Esc, ein Blattwechsel zum Nachschlagen oder ein Neuladen werfen den halb geschriebenen Funkspruch ohne Rückfrage weg. Die Maske kennt weder „Von“ noch „An“, Dringlichkeit oder Weitergabe. Damit fällt sie hinter den eigenen Papier-Meldeblock der Anwendung zurück. Die Mitschrift hat keinen Bezug zur Einheit und taucht deshalb nicht in deren Funkauszug auf. Ein gehörter Rufname wird nur gefunden, wenn er genau so geschrieben ist wie gespeichert. Für eine Statusänderung muss man das Blatt wechseln und die Einheit noch einmal unter ihrem Namen suchen.

**Ohne Nebenaufzeichnung schafft die Rolle ihre Aufgabe nicht.** Meldeblock oder Funkprotokoll auf Papier bleiben für Absender, Empfänger und Quittung nötig und sichern gegen den Verlust der Eingabe.

---

## Findings

### P0-1 — Tagebucheintrag mit leerer Uhrzeit wird nicht gespeichert

- **Fundstelle / Aufgabe:** Aufgabe 1. Einsatztagebuch → „Eintrag hinzufügen“ → Text eintippen, „Zeit der Meldung“ leer lassen → „Eintrag speichern“. `apps/desktop/src/renderer/TagebuchEintrag.tsx:46-50`, `apps/desktop/src/renderer/Anlegeversuch.tsx:73-76`.
- **Beobachtung:** [beobachtet] Dreimal nachgestellt (Echtzeit-Mitschrift mit gleichzeitig schreibendem zweitem Arbeitsplatz und zwei Wiederholungen): Die Maske bleibt offen und zeigt in Rot „Nicht gespeichert – Die Nutzlast für EtbEintragErfasst ist nicht gültig: zeitpunkt — Invalid ISO datetime“ (Shot 30). Mit eingetippter Zeit („2110“) oder Strg+D speichert dieselbe Maske. [Code] Beide Kennungen der Maske holen sich ihren Wert aus demselben Merker: `versuch.kennung(() => neueId("ETB"))`, danach `versuch.kennung(() => new Date().toISOString())`. Der Merker gibt beim zweiten Aufruf die ETB-Kennung zurück, und die geht als `zeitpunkt` hinaus. Der Test prüft nur den Fall mit eingetippter Zeit „0630“ (`Tagebuch.test.tsx:126`).
- **Erwartung der Rolle:** Text tippen, Enter oder „Eintrag speichern“, fertig. Die Zeit ist „jetzt“, wie es das Feld selbst verspricht.
- **Auswirkung im Einsatz:** Der häufigste Fall, die laufende Mitschrift, scheitert immer. Die Meldung sagt dem Fernmelder nicht, was zu tun ist. Unter Zeitdruck drückt er „Abbrechen“ oder Esc, um den nächsten Spruch aufzunehmen, und der Funkspruch ist verloren (siehe P1-1). Wer den Fehler kennt, tippt künftig jedes Mal eine Uhrzeit, die er erst ablesen muss.
- **Empfehlung:** Leere Zeit muss als „jetzt“ gespeichert werden, wie das Feld es ankündigt. Eine Ablehnung muss in Worten der Rolle sagen, was zu tun ist („Uhrzeit eintragen oder Strg+D“), und darf keine Schemabegriffe zeigen.
- **Verifikation:** Eintrag mit leerer Zeit speichern; er steht mit „Zeit der Meldung“ = Eingabezeit im Tagebuch. Regressionstest für den leeren Fall neben `Tagebuch.test.tsx:126`.

### P1-1 — Halb geschriebener Funkspruch geht ohne Rückfrage verloren

- **Fundstelle / Aufgabe:** Aufgabe 3. Maske „Eintrag ins Einsatztagebuch“. `Maske.tsx:123-130` (Abbrechen verwirft sofort, nur bei unklarem Speicherstand wird gefragt), `TagebuchEintrag.tsx:38-40` (Eingabe nur im Komponentenzustand).
- **Beobachtung:** [beobachtet]
  - **Esc:** Bei 80 getippten Zeichen schließt Esc die Maske ohne Rückfrage. Neu geöffnet ist sie leer.
  - **Blattwechsel:** Tab verlässt die modale Maske und erreicht nach 8 Tabs den Reiter „Funkplan“ dahinter. Mit Enter wechselt das Blatt, die Maske verschwindet (Shot 20). Zurück im Tagebuch ist der Text weg (Shot 21).
  - **Neuladen:** Text weg.
  - **Strg+H:** Im Textfeld wirkt Strg+H nicht, die Hilfe ist aus der Maske nicht erreichbar (Shot 22). Ein Kommentar in `Arbeitsplatz.tsx` sagt das Gegenteil.
  - **Modal:** Die Maske ist modal. Den Funkplan kann man während des Schreibens nur auf einem zweiten Bildschirm über den Monitor sehen.

  Zum Vergleich: Die Anforderungsmaske behält eine halb ausgefüllte Eingabe (HANDBUCH.md, „Anforderungen“).
- **Erwartung der Rolle:** Kurz nachschlagen, welche Einheit „Heros Brake“ ist, und dann den Spruch weiterschreiben. Esc schließt höchstens eine Liste, nicht den Spruch.
- **Auswirkung im Einsatz:** Ein bereits gesendeter Funkspruch muss erneut angefordert werden, oder er fehlt im Tagebuch. Wer das einmal erlebt hat, schreibt zuerst auf Papier und tippt später ab.
- **Empfehlung:** Eine angefangene Mitschrift bleibt als Entwurf erhalten, über Esc, Blattwechsel und Neuladen hinweg, wie bei den Anforderungen. Verwerfen einer nicht leeren Mitschrift nur mit Rückfrage. Nachschlagen im Funkplan (Rufname suchen) ohne die Maske zu verlassen.
- **Verifikation:** 80 Zeichen tippen → Esc → „Eintrag hinzufügen“: Text noch da oder Rückfrage. Dasselbe mit Wechsel auf Funkplan und zurück und mit Neuladen.

### P1-2 — Die Mitschrift hat nicht die Felder des eigenen Meldeblocks und keinen Empfänger

- **Fundstelle / Aufgabe:** Aufgabe 1. Maske „Eintrag ins Einsatztagebuch“ (`TagebuchEintrag.tsx:66-94`, Nutzlast nur `etbId`, `zeitpunkt`, `text`, Zeile 50) gegen den Papier-Vordruck Meldeblock (`packages/ausgaben/src/papier.ts:66-79`).
- **Beobachtung:**
  - [beobachtet] Die Maske fragt nur „Was wurde gemeldet?“, „Quelle“ (Funk, Telefon, …) und „Zeit der Meldung“. Der Text steht danach als „Tagebucheintrag: Funk: …“ im Tagebuch (Shot 19).
  - [beobachtet] Die Lagemeldung von „Heros Oldenburg 22/41“ erscheint nicht im Funkauszug von BGr 1 Oldenburg (Maske „Funk und Erreichbarkeit“, Shot 25). Der „Letzte Kontakt“ der Einheit blieb auf 2035, obwohl sie sich um 2103 über Funk gemeldet hatte.
  - [Code] Der Meldeblock der Anwendung kennt Von, An, Weg, Funkrufname, Dringlichkeit, Maßnahme/Antwort, Aufgenommen von, Quittiert (Uhrzeit) und „im Rechner nachgetragen“. Das Funkprotokoll kennt Uhrzeit, Von, An, Inhalt, Quittiert (`papier.ts:96-102`).
  - Eine Weitergabe an ein Sachgebiet oder eine Quittung gibt es digital nicht.
- **Erwartung der Rolle:** Absender (Rufname, mit Vorschlag aus dem Funkplan) und Empfänger als eigene Felder, in der Reihenfolge, in der sie gesprochen werden („… von … kommen“). Danach der Inhalt, dann „weiter an S2/S3/Leiter“ und eine sichtbare Bestätigung, dass es dort angekommen ist. [Annahme] Das entspricht dem gewohnten Nachrichtenvordruck der Führungsstelle; Einzelheiten der Vordruckfassung sind hier nicht geprüft.
- **Auswirkung im Einsatz:** Die Lagemeldung mit Stärke und Bedarf erreicht niemanden gezielt. Sie liegt als Freitext zwischen Dutzenden Statuszeilen. Ob der Bedarf („200 Sandsäcke“) bei der Stelle ankommt, die ihn erfüllt, bleibt Zuruf. Wer Papier digital nachträgt, verliert Von, An und Quittung. Der Funkplan zeigt eine Einheit als „lange still“, obwohl sie gerade gesprochen hat.
- **Empfehlung:** Die Mitschrift bekommt mindestens die Felder des eigenen Meldeblocks (Von, An, Dringlichkeit) und einen Bezug auf die Einheit, die aus dem Rufnamen erkannt wird. Damit erscheint sie im Funkauszug und zählt als Kontakt. Dazu eine erkennbare Weitergabe mit Quittung oder wenigstens eine Liste „offen / weitergegeben“.
- **Verifikation:** Lagemeldung von „Heros Oldenburg 22/41“ erfassen. Sie steht im Funkauszug von BGr 1 Oldenburg, deren „Letzter Kontakt“ springt auf die Funkzeit, und der Empfänger sieht sie als offen, bis er quittiert.

### P1-3 — Rufname wird nur bei genauer Schreibweise gefunden, und die Lage kennt ihn gar nicht

- **Fundstelle / Aufgabe:** Aufgabe 2. Funkplan-Suche (Strg+F), Einheitensuche der Lage. `apps/desktop/src/worker/funkplanprojektion.ts:38-44` (reiner Teilzeichenketten-Vergleich).
- **Beobachtung:**
  - [beobachtet] Treffer: „22/41“, „Oldenburg 22/41“, „Heros Oldenburg 22“ (zwei Treffer), „Brake“, „52/51“. Shot 11.
  - [beobachtet] Kein Treffer: „2241“, „22 41“, „22-41“, „Heros Oldenbrug 22/41“, „heros oldenburg 22-41“, „Hero Brake“. Das Ergebnis zeigt drei leere Rufgruppenköpfe mit „0 Teilnehmer“, ohne Hinweis und ohne Vorschlag (Shot 11, Tippfehler).
  - [beobachtet] Die Einheitensuche der Lage findet weder „22/41“ noch „Heros“ (0 Einheiten, Shot 12). Sie kennt Funkrufnamen nicht, obwohl dort der Status gesetzt wird.
- **Erwartung der Rolle:** Gesprochen wird „zweiundzwanzig einundvierzig“. Getippt wird, was die Finger zuerst finden: „2241“, „22 41“ oder „22-41“. Ein Buchstabendreher beim Ortsnamen darf die Einheit nicht verstecken. Dieselbe Rufnamensuche überall, wo man nach Einheiten sucht.
- **Auswirkung im Einsatz:** „Kein Treffer“ verleitet zu „Einheit nicht im Funkplan“ und zur Rückfrage über Funk. Oder der Fernmelder sucht über den Ortsnamen und wählt zwischen mehreren Treffern die falsche Teileinheit. Der Weg zum Status führt immer über den Funkplan (siehe P2-1).
- **Empfehlung:** Rufnamen tolerant vergleichen: Trennzeichen (/, Leerzeichen, -) gleichwertig, Ziffernfolge ohne Trenner erkennen, kleine Tippfehler im Ortsteil zulassen. Bei null Treffern die nächstliegenden Rufnamen anbieten. Funkrufnamen auch in der Einheitensuche der Lage finden.
- **Verifikation:** „2241“, „22 41“, „22-41“ und „Oldenbrug 22/41“ finden BGr 1 Oldenburg im Funkplan und in der Lage. „Hero Brake“ schlägt „Heros Brake 52/51“ vor.

### P1-4 — Kürzel der verdeckten Lage greifen im Einsatztagebuch

- **Fundstelle / Aufgabe:** Aufgabe 5. Blatt Einsatztagebuch (gilt ebenso für Ausgaben). `Arbeitsplatz.tsx:229-231` gibt der verdeckten Lage `KuerzelAktiv = gehoertZurLage(blatt)`, und `blaetter.ts:71-73` zählt „tagebuch“ und „ausgaben“ zur Lage.
- **Beobachtung:** [beobachtet]
  - **Strg+N** im Tagebuch öffnet die Masken „Einheit anlegen“ und „Abschnitt anlegen“ übereinander (Shot 16).
  - **Strg+E:** In der Lage ist eine Zeile gewählt (Sandsackkolonne), danach wird das Tagebuch aufgeschlagen. Strg+E öffnet „„Sandsackkolonne“ entfernen“ für eine Einheit, die auf dem Bildschirm nicht zu sehen ist (Shot 28).
  - **Strg+M** öffnet „1 Einheit(en) verschieben“.
  - **Strg+F** setzt den Fokus ins Leere, obwohl das Handbuch das Kürzel für das Tagebuch nennt (HANDBUCH.md:385).

  Ein eigenes Kürzel für „Eintrag hinzufügen“ gibt es nicht.
- **Erwartung der Rolle:** Im Tagebuch tut Strg+N das, was dort „neu“ heißt: eine neue Mitschrift. Strg+F springt in die Tagebuchsuche. Was man nicht sieht, wird nicht entfernt.
- **Auswirkung im Einsatz:** Wer aus Gewohnheit Strg+N für den nächsten Spruch drückt, steht vor zwei fremden Masken. Strg+E öffnet das Entfernen einer unsichtbaren Einheit. Der verlangte Grund verhindert den Schaden in der Regel, aber unter Stress wird auch ein Grund schnell getippt.
- **Empfehlung:** Kürzel nur für das sichtbare Blatt anmelden. Im Tagebuch Strg+N für „Eintrag hinzufügen“ und Strg+F für die Suche.
- **Verifikation:** Im Tagebuch mit vorher gewählter Lagezeile Strg+N, Strg+E und Strg+M drücken. Nur „Eintrag ins Einsatztagebuch“ öffnet sich, sonst nichts. Strg+F steht in der Tagebuchsuche.

### P1-5 — Uhrzeiten von Status und Funkprobe lassen sich nicht nachtragen, Tagebuchzeiten werden nicht geprüft

- **Fundstelle / Aufgabe:** Aufgabe 1 und 4. Statusauswahl der Einheitentabelle. Funkprobe (`useFunkprobe.tsx:69-72`, immer „jetzt“). Zeitfeld des Tagebucheintrags (`funkzeit.ts:21-24`).
- **Beobachtung:**
  - [beobachtet] Die Statusauswahl bietet nur Liste, „Übernehmen“ und „Abbrechen“, aber keine Uhrzeit (Shot 13). Im Tagebuch bleibt „Zeit der Meldung“ bei Statuszeilen leer, nur „Erfasst“ ist gesetzt (Shot 15).
  - [Code] Das Ereignis kennt eine fachliche Zeit (`StatusGesetzt … ereignisZeit`, `packages/domaene/src/katalog/schemata.ts:187`), der Renderer setzt sie nirgends.
  - [Code] Die Funkprobe trägt immer die Eingabezeit.
  - [beobachtet] Im Tagebuch wurde „2110“ um 21:03 als 21:10 desselben Tages angenommen, also sieben Minuten in der Zukunft, ohne Hinweis. Die Maske zeigt nicht an, wie sie die Eingabe gelesen hat.
  - [Code] „2355“, eingetippt um 00:05, wird „heute 23:55“, fast 24 Stunden in der Zukunft statt fünf Minuten zurück.
- **Erwartung der Rolle:** Die Uhrzeit wird automatisch gesetzt, lässt sich aber korrigieren, wenn der Spruch erst nach dem nächsten Funkverkehr erfasst wird („Eingetroffen 2047“). Eine Zeit in der Zukunft fällt sofort auf.
- **Auswirkung im Einsatz:** Eintreff- und Statuszeiten im Tagebuch, in Ausgaben und im „Letzten Kontakt“ sind um die Erfassungsverzögerung falsch. Der Fernmelder führt die echte Funkzeit auf Papier mit. Mitschriften kurz nach Mitternacht landen am falschen Tag.
- **Empfehlung:** Bei Status und Funkprobe ein optionales Funkzeitfeld wie im Tagebucheintrag (leer = jetzt, Strg+D, „hhmm“). Eingaben in der Zukunft markieren, bei „hhmm“ kurz nach Mitternacht den Vortag annehmen. Die gelesene Zeit neben dem Feld anzeigen („= 05.11. 20:47“).
- **Verifikation:** Status „Einsatzbereit“ mit Funkzeit 2047 setzen. Im Tagebuch steht „Zeit der Meldung 20:47“, der „Letzte Kontakt“ steht auf 2047. „2355“ um 00:05 ergibt den Vortag. „2110“ um 21:03 wird markiert.

### P2-1 — Funkplan per Tastatur: Zeile nicht wählbar, Strg+P und Status nicht erreichbar

- **Fundstelle / Aufgabe:** Aufgabe 4. Zuordnungstabelle im Funkplan. `Funkzuordnung.tsx:76-78` (Enter öffnet die Maske), `Funkzuordnung.tsx:100-104` (Wahl nur über `onClick`). HANDBUCH.md:421 („eine Einheit … anklicken, dann Strg+P“).
- **Beobachtung:**
  - [beobachtet] Der Name einer Einheit ist per Tab erreichbar. Enter öffnet „Funk und Erreichbarkeit“, die Leertaste tut nichts, eine Auswahlleiste erscheint per Tastatur nie. Strg+P greift deshalb nur nach einem Mausklick.
  - [beobachtet] Die Funkprobe geht per Tastatur nur über die Maske (Enter, 5 × Tab, Enter, Esc; etwa 20 Tasten).
  - [beobachtet] Den Status einer Einheit gibt es im Funkplan nicht. Für „Heros Aurich 59/51 jetzt Ruhe“ waren nötig: Funkplan-Suche, 8 × Shift+Tab zum Reiter Lage, Enter, Strg+F, den vollen Einheitennamen tippen, 3 × Tab zur Statusmarke, Enter, „Ruhe“, Enter. Das sind rund 48 Tasten in 5,0 s Maschinenzeit; [Annahme] ein Mensch braucht 20–30 s (Shot 13, 14).
  - Ein Kürzel zum Wechseln der Blätter gibt es nicht.
- **Erwartung der Rolle:** Rufname suchen, Pfeil auf die Zeile, Taste für Funkprobe oder Status, fertig. Während der Sprecher noch „kommen“ sagt.
- **Auswirkung im Einsatz:** Jede Statusmeldung kostet einen Blattwechsel und eine zweite Suche unter einem anderen Namen. Bei mehreren Meldungen kurz hintereinander staut sich das, und Statusänderungen werden zuerst auf Papier notiert.
- **Empfehlung:** Zeilen im Funkplan per Pfeiltasten wählbar machen, damit Strg+P wirkt. Den Status in der Auswahlleiste des Funkplans anbieten, mit derselben Auswahl wie in der Lage. Ein Kürzel für die Blätter des Profils.
- **Verifikation:** „59/51“ suchen, ↓, Strg+P → Funkprobe eingetragen; Statusschritt der Leiste → „Ruhe“. Beides ohne Blattwechsel, unter 10 Tasten.

### P2-2 — Jede weitere Mitschrift beginnt mit Suchen nach dem Knopf

- **Fundstelle / Aufgabe:** Aufgabe 1. Profil Vermeldezentrale, Einsatztagebuch. `Arbeitsplatz.tsx:59` (Anfangsblatt ohne Merker ist immer „lage“), gegen `blaetter.ts:84-91` („Das erste Blatt ist das der Rolle“).
- **Beobachtung:** [beobachtet]
  - Mit dem Profil „Vermeldezentrale“ öffnet der Einsatz auf dem Blatt Lage, nicht auf dem Funkplan, obwohl der Funkplan als erster Reiter steht (Shot 04).
  - Nach dem Speichern eines Tagebucheintrags steht der Fokus auf dem Seitenkörper. Bis „Eintrag hinzufügen“ sind wieder 8 Tabs nötig.
  - Enter im Textfeld macht einen Zeilenumbruch, Strg+Enter speichert nicht. Speichern geht nur über Tab, Tab, Enter.
  - Das Textfeld hat drei Zeilen; eine Lagemeldung mit 198 Zeichen füllt es ganz aus.
  - Eine sichtbare Bestätigung „gespeichert“ gibt es beim Tagebucheintrag nicht; die Statuszeile zeigt weiter die vorige Aktion (Shot 19). Bei der Funkprobe zeigt sie „… eingetragen · gespeichert“.
- **Erwartung der Rolle:** Nach dem Speichern sofort bereit für den nächsten Spruch, ohne Maus und ohne Zählen von Tabs. Eine kurze, eindeutige Bestätigung.
- **Auswirkung im Einsatz:** Pro Spruch einige Sekunden Anlauf. Bei Funkverkehr in dichter Folge sind die verloren, und der zweite Spruch beginnt auf Papier.
- **Empfehlung:** Das Profil öffnet auf seinem ersten Reiter. Nach dem Speichern steht der Fokus wieder auf „Eintrag hinzufügen“, oder es gibt ein Kürzel (siehe P1-4). Strg+Enter speichert aus dem Textfeld. Die Statuszeile bestätigt „Tagebucheintrag … gespeichert“ wie bei der Funkprobe.
- **Verifikation:** Zwei Sprüche nacheinander erfassen. Zwischen dem Speichern des ersten und dem ersten Zeichen des zweiten liegen höchstens zwei Tasten. Die Statuszeile nennt den Eintrag.

### P3-1 — Tastenkarte und Hilfe weichen von der Bedienung ab

- **Fundstelle / Aufgabe:** Aufgabe 5. `packages/domaene/src/tastenkarte.ts:48-80`, HANDBUCH.md:385, :395, :421, KURZANLEITUNG.md:28-39.
- **Beobachtung:**
  - [beobachtet] Wie beschrieben: Strg+N im Funkplan, Strg+F in Funkplan und Lage, Strg+D im Zeitfeld, Enter, Esc und Strg+H außerhalb von Feldern. Die Hilfe zeigt die Tastenkarte vollständig (Shot 27).
  - [beobachtet] Abweichungen:
    - Strg+F wirkt im Tagebuch und im Eingangskorb nicht, obwohl das Handbuch es dort nennt (HANDBUCH.md:385, :395).
    - Strg+Q im Eingangskorb ist nicht angemeldet.
    - Strg+E heißt in der Karte „entfernen; verlangt einen Grund“, im Funkplan bearbeitet es die Rufgruppe.
    - Strg+H wirkt in keiner Maske.
    - Strg+P ist per Tastatur nicht nutzbar (P2-1).
  - [Code] Die Kurzanleitung zum Danebenlegen nennt Strg+K und Strg+P nicht.
  - [Annahme] In der Web-Schale unter einem normalen Chrome erreicht Strg+N die Seite nicht, weil der Browser das Kürzel für „neues Fenster“ reserviert. Headless ließ es sich nicht nachstellen.
- **Erwartung der Rolle:** Die gedruckte Karte am Platz stimmt.
- **Auswirkung im Einsatz:** Ein Kürzel, das einmal nicht greift, wird nicht mehr benutzt. Danach wird zur Maus gegriffen.
- **Empfehlung:** Die Karte je Blatt angeben (was gilt wo). Die Abweichungen beheben oder aus Handbuch und Karte streichen. Strg+P in die Kurzanleitung aufnehmen. Für die Web-Schale ein Ersatz für Strg+N nennen.
- **Verifikation:** Jedes Kürzel der Karte auf jedem Blatt, auf dem das Handbuch es nennt, einmal drücken. Es tut das Beschriebene.

### P3-2 — Fokus in Masken nicht gehalten

- **Fundstelle / Aufgabe:** Maske „Rufgruppe anlegen“, Maske „Funk und Erreichbarkeit“.
- **Beobachtung:** [beobachtet] Tab nach „Abbrechen“ verlässt jede Maske und wandert durch Kopfband und Reiter dahinter (Prüfaufgabe 3 zeigt die Folge). Nach „Überschreiben …“ beim Funkrufnamen steht der Fokus auf dem Seitenkörper statt im neuen Feld (Shot 09). Ein Tab bringt ihn ins Feld.
- **Erwartung der Rolle:** Tab bleibt in der offenen Maske. Wer „Überschreiben“ drückt, tippt sofort.
- **Auswirkung im Einsatz:** Ein Tab zu viel landet hinter der Maske und löst dort Enter aus (siehe P1-1).
- **Empfehlung:** Fokus in offenen Masken halten. Nach „Überschreiben …“ in das neue Feld setzen.
- **Verifikation:** In jeder Maske 20 × Tab: Der Fokus verlässt die Maske nicht. „Überschreiben …“, dann sofort tippen: Der Text steht im Feld.

---

## Positives

- **Fleetmapping-Vorschlag:** Rufgruppen sind in unter drei Sekunden rein per Tastatur angelegt. Der Vorschlag nennt Kurzwahl und Gültigkeit, Esc schließt erst die Liste und dann die Maske (Shot 06).
- **Zuordnung:** „Funk und Erreichbarkeit“ ist voll per Tastatur bedienbar. Der Fokus beginnt in der Hauptrufgruppe, Enter übernimmt; zehn Einheiten waren in gut 20 s zugeordnet. Enter auf der Zelle „Rufgruppe“ öffnet direkt die Auswahl.
- **Suche bei korrektem Rufnamen:** Der richtig gehörte Rufname ist in unter einer Sekunde mit Bereich, Status und Rufgruppe gefunden.
- **Gleichzeitiges Schreiben:** Eingaben überstehen gleichzeitige Änderungen anderer Arbeitsplätze. Eine angefangene Mitschrift und eine offene Funkhinweiszelle behielten Text und Fokus, während ein zweiter Arbeitsplatz einen Status schrieb (Shot 31). Sperren anderer Arbeitsplätze sind an der Zelle mit 🔒 erkennbar.
- **Bestätigung:** Bei Funkprobe und Status nennt die Statuszeile „… eingetragen · gespeichert“, „Rückgängig: …“ und „528 B noch nicht übertragen“ (Shot 25).
- **Hilfen:** Strg+D schreibt „jetzt“ ins Zeitfeld. Der Funkauszug in der Maske zeigt die Funkgeschichte der Einheit.
- **Monitor:** Der Funkplan auf dem Monitor (Taste 6) ist aus Entfernung lesbar und eignet sich als Funkplan am Platz auf einem zweiten Bildschirm (Shot 34).
- **Papier-Rückfallebene:** Meldeblock und Funkprotokoll stehen als Papier-Vordruck bereit.

---

## Abschluss

- **Aufgabe der Rolle geschafft:** mit Umwegen. Mitschriften speichern nur mit eingetippter Uhrzeit. Status geht nur über Blattwechsel. Rufnamen werden nur bei genauer Schreibweise gefunden.
- **Nebenaufzeichnung auf Papier nötig:** ja. Für Von, An und Quittung jeder Nachricht, die echte Funkzeit verspätet erfasster Statusmeldungen und als Sicherung, solange eine halbe Mitschrift durch Esc oder Blattwechsel verschwinden kann.
- **Größte Lücke an einer Übergabe:** Vom Fernmelder an die Sachgebiete und die Leitung. Die Mitschrift landet als Freitext ohne Empfänger, Weitergabe und Quittung im Tagebuch und ohne Bezug zur Einheit, die sie gesendet hat.
- **Größtes Einsatzrisiko:** Eine in Echtzeit mitgeschriebene Lagemeldung wird beim üblichen „Zeit leer lassen“ nicht gespeichert. Unter Druck wird sie dann mit Esc kommentarlos verworfen.
- **Top-Priorität für die nächste Iteration:** Den Tagebucheintrag mit leerer Uhrzeit speichern lassen (P0-1) und das mit einem Regressionstest absichern.
