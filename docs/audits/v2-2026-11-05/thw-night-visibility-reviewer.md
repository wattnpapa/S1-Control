# Audit: Nacht- und Sichtbarkeitstauglichkeit (THW Night Visibility Reviewer) — v2

**Datum:** 05.11.2026 · **Stand:** HEAD `6772ffe` (Schnitte bis „Rollen-Reviewer je Sachgebiet“, u. a. Kopfband, Nachtbild-Marke, Ampel im Eingangskorb, Funkplan-Monitor)
**Rolle:** THW-Helfer, der das Display nachts im/neben dem Fahrzeug, im abgedunkelten Führungsraum, unter Arbeitslicht und tagsüber in der Sonne nutzt; dazu der Stärke-Monitor an der Wand.

**Material**

- Laufende Web-Schale mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten), Profil Führungsstelle (S1), Chromium über Playwright, 1600×1000, 1920×1080 (Monitor) und 390×844 (Handy).
- Alle vier Erscheinungsbilder (Standard, Dunkel, Feld, Nacht) und `prefers-color-scheme: dark` auf frischem Profil.
- Kontraste aus den **berechneten** Farben (`getComputedStyle`, Hintergründe und Deckkraft der Vorfahren eingemischt), WCAG-2.x-Formel. Flächenhelligkeit als mittlere relative Leuchtdichte der Screenshots.
- Fernsicht: Monitor-Screenshots auf 1/8 verkleinert und wieder vergrößert. Farbsehschwäche: Deuteranopie-Simulation (Machado 1.0) und Graustufen.
- Verbindungsverlust: `setOffline` an Arbeitsplatz und Monitor, 60 s beobachtet.
- Quelltext lesend als Beleg; früheres Audit `docs/audits/thw-night-visibility-reviewer.md` (18.09.2026) zum Vergleich; Handbuch `docs/v2/HANDBUCH.md`.
- Screenshots und Skripte: `/tmp/claude-0/-home-user-S1-Control/5e4b7d40-2c4b-58c0-a32e-96410bb256d6/scratchpad/shots/night/` bzw. `…/scratchpad/night/` (nicht im Repo).

**Kennzeichnung:** [beobachtet] in der laufenden Anwendung gesehen oder gemessen · [Code] im Quelltext belegt · [Annahme] plausible Folgerung, nicht geprüft · [nicht prüfbar] in dieser Umgebung nicht zu klären.

**Nicht prüfbar:** reale Leuchtdichte, Sonnenlicht, Spiegelungen, Display-Dimmung und OS-Nachtlichtfilter [nicht prüfbar]. Die Funkplan-Tafel am Monitor ist leer, weil die Prüflage keine Rufgruppen hat [nicht prüfbar]. Der Eingangskorb ist leer; die Ampel ist nur an den Filterchips und im Code bewertet [nicht prüfbar]. Die Electron-Schale lief nicht, Aussagen dazu stehen nur aus dem Code [Annahme].

---

## Urteil

Seit September hat sich viel getan, und das zeigt sich nachts. Es gibt jetzt ein echtes **Nachtbild** (Bernstein auf Schwarz). Man wählt es im Fenstermenü „⋯“ unter „Erscheinungsbild“, es wirkt sofort und wird je Gerät gespeichert [beobachtet]. Auf der Lage liegt die mittlere Leuchtdichte im Nachtbild bei 0,025, im Standardbild bei 0,79. Nur 1,2 % der Fläche sind hell [beobachtet]. Der Stärke-Monitor steht in jedem Bild auf Schwarz, die Zahl ist aus der Ferne sicher lesbar. Bei Verbindungsverlust kommt ein Streifen mit Symbol und Wort, der nach einer Minute von Gelb auf Rot wechselt [beobachtet]. Fast alle Texte erreichen in allen Bildern mindestens 4,4:1, Status steht immer als Wort da, und der gewählte Abschnitt ist jetzt eine gefüllte Leiste. Die beiden P0 und das Abschnitts-P1 des Vorgänger-Audits sind damit erledigt.

Reibung gibt es an drei Stellen:

1. Die **taktischen Zeichen** bleiben im Nacht- und Dunkelbild grellgelb auf hellem Grund. In der Führungsorganisation wird das Nachtbild dadurch rund viermal heller.
2. Im Nachtbild unterscheiden sich gut, Warnung und Fehler **nur noch durch den Farbton**. Bernstein ist dort zugleich Grund- und Warnfarbe.
3. Die App **startet immer hell**, auch wenn das System auf Dunkel steht.

Die Aufgabe „nachts arbeiten, ohne sich zu blenden“ gelingt ohne fremde Hilfe, wenn man das Nachtbild einmal gefunden hat. Die Führungsorganisation muss man nachts allerdings meiden.

---

## Findings

### P1-1 Taktische Zeichen leuchten im Nacht- und Dunkelbild als grelle Flächen

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Führungsstelle → Führungsorganisation (Harke), Abschnittsbaum der Lage, Handyansicht; Bild „Nacht“ und „Dunkel“.
3. **Beobachtung:**
   - In der Harke stehen sechs Zeichen von 180–200 px Breite in reinem Gelb `#ffff00` (relative Leuchtdichte 0,93) auf einem beigen Rahmen `#d8d3c0` (0,65). Der Nachtgrund `#0c0b06` hat 0,003 [beobachtet].
   - Messung im Nachtbild: Die Führungsorganisation hat eine mittlere Leuchtdichte von 0,093, die Lage 0,025, also das 3,7-Fache. 10,3 % der Fläche liegen über 0,5 [beobachtet].
   - Im Abschnittsbaum und auf dem Handy sind die Zeichen klein (30 px), aber trotzdem die hellsten Punkte des Bildes [beobachtet].
   - Der beige Rahmen ist Absicht: „damit der schwarze Rand nicht im Grund verschwindet“ (`apps/desktop/src/renderer/index.html:324-332`) [Code].
4. **Erwartung der Rolle:** Wenn ich „Nacht“ wähle, bleibt **alles** dunkel. Das Zeichen darf seine Form und sein Gelb behalten, aber nicht mit voller Leuchtkraft.
5. **Auswirkung im Einsatz:** Genau die Ansicht, mit der man nachts die Lage erklärt (Lagekarte, PDF-Vorschau), blendet den Bediener und alle am Tisch und zerstört die Dunkeladaption. Wer die Ansicht meidet, verliert den Überblick über die Gliederung. Wer das Display herunterdimmt, sieht in den übrigen Ansichten die leisen Texte nicht mehr (siehe P3-6) [Annahme].
6. **Empfehlung:**
   - Im Nachtbild die Zeichen abgedunkelt darstellen: gedimmtes Gelb, Rahmen und Grund dunkel, die Form bleibt erhalten.
   - Alternativ eine Kontur statt der beigen Fläche.
   - Die Normtreue gilt für den Ausdruck, nicht für den Bildschirm bei Nacht.
7. **Verifikation:** Führungsorganisation im Nachtbild messen. Die mittlere Leuchtdichte soll höchstens 1,5-mal so hoch sein wie auf der Lage, und kein Zeichen soll heller als der Haupttext `#e8dfae` sein (Leuchtdichte 0,73).

### P2-2 Start ist immer hell, Systemvorgabe „dunkel“ wird ignoriert

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Erster Start eines Arbeitsplatzes oder Browsers, Neuladen mit gespeichertem Nachtbild.
3. **Beobachtung:**
   - Ein frisches Profil mit `prefers-color-scheme: dark` öffnet im Bild „standard“. Die Einsatzauswahl ist großflächig hell, 83 % der Lage-Fläche liegen über Leuchtdichte 0,5 [beobachtet].
   - Die Anmeldeseite der Web-Schale folgt dagegen dem System (`apps/desktop/src/web/anmeldeseite.ts:55`) [Code]. Nach der dunklen Anmeldung springt die App also auf Hell [Annahme, die Schale lief ohne Anmeldung].
   - Der Renderer setzt das Bild erst nach dem Laden der Einstellungen (`apps/desktop/src/renderer/Arbeitsplatz.tsx:147`, Vorgabe `"standard"`), `:root` trägt `color-scheme: light` (`index.html:113`) [Code].
   - Beim Neuladen mit gespeichertem „Nacht“ stand der Grund rund 100–150 ms auf `#eef0f6`, bevor er auf `#0c0b06` wechselte (lokal, ohne Netzlatenz) [beobachtet].
   - Das Hauptfenster in Electron hat anders als der Monitor (`main.ts:127`) kein `backgroundColor` (`main.ts:218-234`) [Code]. Ein heller erster Rahmen ist dort wahrscheinlich [Annahme].
   - Der Weg zum Nachtbild ist das unbeschriftete „⋯“. Das Handbuch nennt nur die vier Namen, ohne zu sagen, wofür „Nacht“ oder „Feld“ gedacht ist (`HANDBUCH.md:151`) [Code].
4. **Erwartung der Rolle:** Wenn mein Tablet oder Laptop auf Dunkel steht, startet die App dunkel. Nach einem Neustart blitzt nichts weiß auf.
5. **Auswirkung im Einsatz:** Wer nachts als Ablösung einen neuen Browser öffnet, wird zuerst geblendet und muss das Nachtbild erst suchen. Jedes Neuladen blitzt kurz hell auf. Das ist einmalig je Gerät und kurz, deshalb P2.
6. **Empfehlung:** Ohne gespeicherte Wahl dem Systemthema folgen (Dunkel bzw. Nacht). Das zuletzt gewählte Bild vor dem ersten Zeichnen anwenden, der Grund soll schon beim Laden dunkel sein. Im Fenstermenü oder in der Hilfe einen Halbsatz ergänzen, wofür „Nacht“ und „Feld“ gedacht sind.
7. **Verifikation:** Frisches Profil mit OS dunkel öffnen, das Bild ist nicht „standard“. Neuladen mit „Nacht“ filmen oder pollen, kein Bild mit hellem Grund.

### P2-3 Zustandsfarben im Nachtbild nur über den Farbton unterscheidbar, Bernstein ist Grund- und Warnfarbe

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Statusmarken der Einheitentabelle und der Filterzeile, Ampel im Eingangskorb, Kennzahlkacheln und Kontaktmarken im Funkplan, Nebenzeilen am Monitor.
3. **Beobachtung:**
   - Im Nachtbild haben gut `#9ed17e`, Warnung `#e0b84a` und Fehler `#ffa8a8` fast dieselbe Helligkeit (1,03–1,07:1 untereinander) [beobachtet].
   - In der Deuteranopie-Simulation und in Graustufen sehen „Einsatz“, „Angefordert“ und „Nicht einsatzbereit“ gleich aus. „Nicht einsatzbereit“ springt nicht mehr ins Auge (Bild `12-02-lage-Nacht-deut-grau.png`) [beobachtet].
   - Normale Nebentexte sind im Nachtbild selbst Bernstein `#c8a232` und liegen nur 1,28:1 neben der Warnfarbe [beobachtet].
   - Die Funkplan-Kacheln „Ohne Rufgruppe 39“ und „Kein Kontakt > 15 min 34“ heben sich nur durch eine 1,18:1 hellere Fläche von den neutralen Kacheln ab [beobachtet].
   - Am Monitor liegen Warnzeile und normaler Text bei 1,4:1 (Nacht) bzw. 1,75:1 (Standard) [beobachtet].
   - Im Standardbild heben sich die Pastellflächen der Marken nur mit 1,17–1,28:1 von der Zeile ab, in der Sonne bleibt dann nur das Wort [beobachtet].
   - Die Ampel des Eingangskorbs gibt „Neu“ und „Geändert“ denselben Ton (`index.html:3017-3022`) [Code].
   - Ausgleich, der wirkt: Jeder Zustand steht als Wort da (`index.html:866-869`) [Code]. Die Ruhe-Gruppe ist zusätzlich kursiv [beobachtet]. Die Kontaktmarke über der Schwelle bekommt das Alter „· 19 min“ dazu [beobachtet].
4. **Erwartung der Rolle:** Den einen „Nicht einsatzbereit“ unter 25 „Einsatz“ sehe ich beim Überfliegen, auch mit Rot-Grün-Schwäche und nachts gedimmt. Warnungen sind im Nachtbild die auffälligste Farbe, nicht eine von vielen.
5. **Auswirkung im Einsatz:** Die Information geht nicht verloren, die Wörter stehen da. Das schnelle Erfassen fällt aber weg: Man muss jede Zeile lesen statt zu scannen. Mit Rot-Grün-Schwäche betrifft das jeden achten bis zwölften Mann im Zug [Annahme], im Nachtbild jeden.
6. **Empfehlung:**
   - Die drei Töne zusätzlich über Helligkeit oder Form trennen: Fehler und Warnung mit Symbol (✖ / ⚠ wie in der Zustandsmarke des Kopfbands) oder gefüllt statt umrandet.
   - Im Nachtbild Nebentexte in einem gedeckten Ton halten, der sich klar von der Warnfarbe abhebt.
   - Warnkacheln mit Rahmen oder Symbol, nicht nur mit hellerer Fläche.
7. **Verifikation:** Lage und Funkplan im Nachtbild in Graustufen und Deuteranopie-Simulation zeigen. „Nicht einsatzbereit“ und Warnkacheln sind ohne Lesen zu finden. Warnfarbe gegen Nebentext mindestens 3:1.

### P2-4 Die gewählte Zeile ist kaum vom Rest zu unterscheiden

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Lage → Einheitentabelle, Zeile wählen und dann „Verschieben“, „Entfernen“, „Ablösung anfordern“ aus der Auswahlleiste.
3. **Beobachtung:**
   - Die gewählte Zeile hebt sich von einer normalen ab mit 1,14:1 (Nacht), 1,17:1 (Standard, Feld) und 1,28:1 (Dunkel), dazu ist der Name fett [beobachtet].
   - Die Hover-Fläche hat fast denselben Ton (`index.html:1518-1527`, `--zeile-alt` gegen `--zeile-gewaehlt`) [Code].
   - Die Auswahlleiste nennt bei einer Zeile den Namen („1 gewählt · Meldekopf Spät“) [beobachtet]. Bei mehreren Zeilen steht nur die Zahl da [Annahme].
4. **Erwartung der Rolle:** Bevor ich „Entfernen“ drücke, sehe ich auf einen Blick, **welche** Zeilen betroffen sind, auch mit gedimmtem Display.
5. **Auswirkung im Einsatz:** Bei Mehrfachwahl in einer langen Tabelle ist nachts kaum zu erkennen, welche Einheiten mitgewählt sind. Das ist ein Risiko für Fehlbuchungen. Der Name in der Leiste mildert es bei Einzelwahl.
6. **Empfehlung:** Gewählte Zeilen mit einem kräftigen Merkmal kennzeichnen, das nicht nur auf der Flächenfarbe beruht: Randbalken links in der Akzentfarbe oder ein Häkchen. Hover und Wahl deutlich trennen.
7. **Verifikation:** Drei Zeilen wählen, Screenshot in allen vier Bildern auf 50 % Helligkeit abdunkeln. Die gewählten Zeilen sind ohne Mauszeiger auszumachen, mindestens 3:1 Flächen- oder Randkontrast.

### P2-5 Das Feldbild vergrößert Tabelle und Statusmarken nicht

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Bild „Feld“ (für Sonne und Handschuhe gedacht, `index.html:149-151`), Einheitentabelle.
3. **Beobachtung:**
   - Die Grundschrift steigt von 12 auf 14 px. Tabellenzellen bleiben bei 13,6 px, Statusmarken bei 11,15 px, genau wie im Standardbild [beobachtet].
   - Ursache: Die Tabelle rechnet in `rem` (`.einheiten table { font-size: 0.85rem }`, `index.html:1490-1494`), das Feldbild ändert nur `--schrift` [Code].
   - Die Pastellflächen der Marken bleiben (siehe P2-3), das Kopfband bleibt Navy [beobachtet].
4. **Erwartung der Rolle:** Wenn ich „Feld“ wähle, weil die Sonne aufs Display scheint, werden vor allem die Tabelle und der Status größer und kräftiger. Dort lese ich.
5. **Auswirkung im Einsatz:** In der Sonne bleibt der Status, die wichtigste Spalte, in 11-px-Schrift auf Pastell. Das Feldbild hilft bei Knöpfen und Rahmen, aber nicht beim Ablesen [Annahme zur Sonnenwirkung].
6. **Empfehlung:** Das Feldbild auch auf Tabellen, Statusmarken und Abschnittsbaum wirken lassen. Im Feldbild Marken mit kräftigem Rand oder Füllung zeigen statt Pastell.
7. **Verifikation:** Im Feldbild `getComputedStyle` der Statusmarke mindestens 14 px und der Tabellenzelle mindestens 16 px. Marke gegen Zeile mindestens 3:1.

### P3-6 Kleine und leise Nebenbeschriftungen

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Abschnittsbaum, Funkplan-Tabelle, Führungsorganisation.
3. **Beobachtung:**
   - Typbeschriftungen im Abschnittsbaum („Eingang“, „Angefordert / Anmarsch“, „Einsatz beendet“) haben 9,6 px und 3,05:1 (Standard), 4,29:1 (Dunkel) bzw. 4,43:1 (Nacht) [beobachtet].
   - Die Bearbeiten-Stifte ✎ im Funkplan haben 9,7 px, Deckkraft 0,35 und 2,69:1 im Nachtbild. Voll sichtbar werden sie nur bei Hover oder Fokus (`index.html:2515-2524`) [beobachtet/Code].
   - Das Platzhalterzeichen „Angefordert“ in der Harke steht mit 1,61:1 (Bernstein auf Beige) im Nacht- und Dunkelbild [beobachtet]. Der Name steht darunter noch einmal lesbar.
4. **Erwartung der Rolle:** Was ich antippen soll, sehe ich auch ohne Maus. Beschriftungen sind nicht kleiner als 11 px.
5. **Auswirkung im Einsatz:** Am Touchgerät gibt es kein Hover, der Stift ist nachts praktisch unsichtbar. Der Zeilenklick bzw. das „⋯“-Menü bleiben als Weg. Gering, deshalb P3.
6. **Empfehlung:** Mindestgröße und mindestens 4,5:1 für alle Beschriftungen, Bedienelemente ohne Hover-Abhängigkeit.
7. **Verifikation:** Die Kontrastmessung über alle sichtbaren Texte (Skript im Scratchpad) ergibt in keinem Bild Werte unter 4,5:1 bei Text unter 14 px.

### P3-7 Monitor aus der Ferne: Nebenauskünfte nicht lesbar, „offen“ gedämpft, zwei „Stand“

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Stärke-Monitor, Ansichten 2–5, 1920×1080, Fernsicht simuliert (1/8).
3. **Beobachtung:**
   - Hauptzahlen (Stärke, Portionen, Betten) und taktische Zeit bleiben aus der Ferne klar lesbar [beobachtet].
   - Stand-Zeile, „Anmarsch +37 nicht enthalten“, „ohne Zuweisung 44“ und die Spaltenköpfe (20–27 px) sind nicht mehr lesbar [beobachtet].
   - Die Tafel „Nächste 24 h“ nutzt nur gut ein Drittel der Bildhöhe [beobachtet].
   - „offen“ (Mahlzeit noch nicht bestellt) steht immer in der leisen Farbe, auch für die Mahlzeit in 3 h (`Monitoransichten.tsx:107`) [Code/beobachtet].
   - Bei Verbindungsverlust zeigt der Monitor „Keine Verbindung – Stand 20:51“ und darunter „Stand: vor 16 min“, also zwei verschiedene „Stand“-Angaben [beobachtet].
4. **Erwartung der Rolle:** Was am Monitor eine Handlung auslöst (nicht bestellt, Anmarsch nicht eingerechnet), ist aus der Raumtiefe sichtbar. „Stand“ heißt genau eines.
5. **Auswirkung im Einsatz:** Gering. Die Kernzahl stimmt und ist lesbar. Nebenhinweise muss man am Arbeitsplatz nachsehen.
6. **Empfehlung:** Handlungsrelevante Hinweise größer und in Warnfarbe, „offen“ für die nächste Mahlzeit hervorheben. Die Vorausschau auf die Fläche skalieren wie den Funkplan. Die Ereigniszeit anders benennen (etwa „letzte Änderung“).
7. **Verifikation:** Fernsicht-Montage (1/8) erneut erzeugen. Die Hinweise zur nächsten Mahlzeit und zum Anmarsch sind lesbar, und es steht nur ein „Stand“ im Bild.

### P3-8 Veraltete Zahlen am Arbeitsplatz bleiben voll hell

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Arbeitsplatz bei Verbindungsverlust, Nachtbild.
3. **Beobachtung:**
   - Nach 60 s zeigt der Arbeitsplatz ein rotes Band oben (12 px Text: „✖ Keine Verbindung zum Dienst seit 1 min. Die Anzeige ist veraltet …“) und die Zustandsmarke „✖ Verbindung unterbrochen“, beides mit Symbol [beobachtet].
   - Ist-Stärke im Kopfband und Tabelle bleiben unverändert groß und hell [beobachtet].
4. **Erwartung der Rolle:** Veraltete Zahlen sehen anders aus als frische, nicht nur der Rand meldet es.
5. **Auswirkung im Einsatz:** Wer nur auf die große Ist-Stärke schaut, übersieht das schmale Band [Annahme]. Der Monitor löst das schon besser (Streifen über der Zahl).
6. **Empfehlung:** Die Ist-Stärke im Kopfband bei Verbindungsverlust sichtbar als veraltet kennzeichnen (gedämpft oder mit „Stand hh:mm“ direkt an der Zahl), wie am Monitor.
7. **Verifikation:** Offline schalten. Nach 60 s ist die Kopfband-Zahl selbst als veraltet erkennbar.

---

## Vergleich mit dem Audit vom 18.09.2026

| Damals | Heute |
|---|---|
| P0-1 keine dunkle Darstellung | erledigt: Dunkel und Nacht, je Gerät gespeichert [beobachtet]. Rest siehe P2-2 |
| P0-2 Monitor startet weiß, Umschaltung versteckt | erledigt: Monitor immer Schwarz, im Nachtbild Bernstein [beobachtet] |
| P1-3 gewählter Abschnitt 1,19:1 | erledigt: gefüllte Leiste [beobachtet]. Neu: gewählte **Zeile** schwach (P2-4) |
| P1-4 Status nur Rohtext | verbessert: Marke mit Wort und Ton. Tonunterschied im Nachtbild schwach (P2-3) |
| P2-7 Dialoge hell, Abdunklung schwach | hell erledigt. Die Abdunklung hinter Dialogen ist im Nachtbild weiter kaum sichtbar, der Dialog hebt sich durch die Bernsteinkante ab [beobachtet] |
| P3-12 kein eigener Fokusstil | unverändert Browser-Standard, im Nachtbild aber gut sichtbar (14:1) [beobachtet] |

## Positiv beobachtet

- Das Nachtbild ist konsequent: keine weißen Flächen in Lage, Eingang, Führungsstelle, Ausgaben, Tagebuch, Funkplan, Versorgung und Dialogen. Der Haupttext hat 14,6:1 [beobachtet].
- Der Wechsel des Bildes ist vorhersehbar. Er wirkt sofort, das Häkchen zeigt das geltende Bild, und bei offenem Dialog ist das Fenstermenü gesperrt, sodass kein Vorgang unterbrochen wird [beobachtet].
- Der Warnstreifen am Monitor ist bewusst grell (Gelb 14,7:1, nach 60 s Rot 6,5:1) und trägt Symbol und Uhrzeit. Hier ist Helligkeit richtig eingesetzt [beobachtet].
- Die Zustandsmarke im Kopfband trägt Symbol und Wort (✓ / ⚠ / ✖) [beobachtet].

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen. Nachts arbeiten geht, nachdem man „Nacht“ im „⋯“-Menü gefunden hat. Die Führungsorganisation muss man dabei meiden.
- **Fremde Hilfe nötig:** nein.
- **Größtes Missverständnis:** „Nacht gewählt“ heißt nicht „alles dunkel“, denn die taktischen Zeichen leuchten weiter mit voller Kraft.
- **Größtes Einsatzrisiko:** Im Nachtbild und bei Rot-Grün-Schwäche fällt ein „Nicht einsatzbereit“ zwischen grünen und gelben Marken erst beim Lesen auf, nicht beim Überfliegen.
- **Top-Priorität für die nächste Iteration:** Die taktischen Zeichen im Nacht- und Dunkelbild abdunkeln (P1-1), danach die Zustandstöne über Helligkeit oder Symbol trennen (P2-3).
