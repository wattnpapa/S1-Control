# Audit: Bedienbarkeit mit Arbeitshandschuhen (THW Glove Touch Reviewer)

**Projekt:** S1-Control (Electron-Desktop-App, offline-first S1-Stärke-/Einsatzverwaltung)
**Datum:** 2026-09-18
**Rolle:** Helfer mit Arbeitshandschuhen / eingeschränkter Feinmotorik, stehende oder einhändige Bedienung auf einem Touch-Gerät (Convertible, Tablet-Modus, Touch-Monitor in der Führungsstelle)

---

## 1. Scope und Methodik

**Geprüft wurde ausschließlich der Quellcode und die Dokumentation.** Es lief zu keinem Zeitpunkt eine
Instanz der Anwendung, es lagen keine Screenshots und keine Bildschirmfolgen vor. Alle Aussagen zu
Größen, Abständen und Trefferflächen sind daher aus den CSS-Regeln und den React-Komponenten
abgeleitet, nicht auf einem Gerät nachgemessen.

Herangezogene Quellen:

- `src/renderer/src/styles/app.css` (einzige Stylesheet-Datei des Renderers, 1276 Zeilen)
- `src/renderer/src/components/**` (Views, Layout, Tabellen, Dialoge, Inline-Editoren)
- `src/renderer/index.html`, `src/main/services/main-window.ts`
- `README.md`, `AGENTS.md`, `TODO.md`, `e2e/`, `test/`

**Einschränkungen / nicht prüfbar ohne laufende App:**

- Tatsächliche gerenderte Pixelgrößen (abhängig von Zoomfaktor, DPI, Schriftmetrik von „Lato“).
- Verhalten der Bildschirmtastatur (Windows-TIP / Linux) gegenüber dem Electron-Fenster.
- Ob Hover-Zustände nach einem Tap „kleben“ (Chromium-Verhalten, geräteabhängig).
- Reale Treffsicherheit mit Handschuh – dafür ist ein Test am Gerät zwingend erforderlich.

**Ausdrückliche Annahme:** Die App wird im Einsatz auch touchbedient genutzt (Convertible/Touch-Monitor
in der Führungsstelle). Der Code enthält dafür keinerlei Hinweise oder Vorkehrungen – es gibt im
gesamten Repository keine einzige Fundstelle zu Touch, Tablet, `pointer: coarse` oder
Mindest-Trefferflächen (verifiziert per Volltextsuche). Träfe die Annahme nicht zu und würde
ausschließlich mit Maus und Tastatur gearbeitet, entfielen die meisten P0/P1-Befunde.

---

## 2. Urteil aus Rollensicht

Die App ist erkennbar für Maus und Tastatur an einem großen Bildschirm gebaut. Die zentralen
Anzeigen – Gesamtstärke und NATO-Zeit in der Topbar (`app.css:254`) und der Stärke-Monitor
(`app.css:1071`) – sind vorbildlich groß und auch aus Entfernung ablesbar. **Alles, was angefasst
werden muss, ist dagegen zu klein, zu dicht und teilweise unsichtbar.**

Mit Handschuh sind die drei Icon-Aktionen je Einheitenzeile (Verschieben / Bearbeiten / Splitten,
`EinheitRow.tsx:78-99`) praktisch nicht sicher zu unterscheiden, in der Helfer-Tabelle liegen
„Speichern“ und „Löschen“ ohne Rückfrage nebeneinander (`EinheitHelferSection.tsx:154-164`), und im
Stärke-Monitor gibt es zwei **unsichtbare, aber aktive** Flächen von je ca. 180×120 px in den oberen
Bildschirmecken, von denen eine den Monitor schließt (`app.css:1094-1145`).

Die Kernaufgabe „Einheit anlegen und Stärke pflegen“ wäre mit Handschuh nur mit Umwegen und hoher
Fehlerquote zu schaffen; „Helfer bearbeiten“ birgt konkretes Datenverlustrisiko.

Anzumerken ist, dass `AGENTS.md` §9 die aktuelle Gestaltung sogar festschreibt: *„Platzsparende
Bedienung beibehalten (Icon-Actions, tabellarisch)“*. Diese Regel steht in direktem Widerspruch zur
Handschuhbedienung und sollte um eine Mindestgröße für Bedienelemente ergänzt werden.

---

## 3. Befunde

### P0 – Einsatzkritisch

---

#### P0-1 Unsichtbare, aber aktive Großflächen in den Ecken des Stärke-Monitors schließen ihn versehentlich

**Fundstellen**

- `src/renderer/src/styles/app.css:1094-1115` (`.strength-display-corner`: `width: 180px; height: 120px; pointer-events: auto;`)
- `src/renderer/src/styles/app.css:1117-1133` (`.strength-display-corner-button`: `opacity: 0`)
- `src/renderer/src/styles/app.css:1141-1145` (Sichtbarkeit nur über `:hover` / `:focus-within`)
- `src/renderer/src/components/views/StrengthDisplayView.tsx:140-144` („Monitor schließen“ oben rechts)
- `src/renderer/src/components/views/StrengthDisplayView.tsx:229` und `:236` (`onDoubleClick` invertiert Schwarz/Weiß)

**Beobachtetes Problem**
Die beiden Eckcontainer sind dauerhaft im DOM, haben `pointer-events: auto` und eine Fläche von je ca.
180×120 px. Die enthaltenen Buttons stehen auf `opacity: 0` und werden ausschließlich über `:hover`
bzw. `:focus-within` sichtbar. `opacity: 0` entfernt ein Element nicht aus der Trefferprüfung – der
Button bleibt anklick- und antippbar. Auf einem Touchgerät existiert kein Hover-Zustand, der die
Fläche vorher sichtbar machen würde.

Zusätzlich löst ein Doppel-Tipp irgendwo auf Stärke oder Uhrzeit die Schwarz/Weiß-Invertierung aus.

**Auswirkung im Einsatz**
Der Stärke-Monitor ist die Anzeige, auf die in der Führungsstelle alle schauen. Wer das Gerät am Rand
anfasst, es aufrichtet, einen Tropfen wegwischt oder mit dem Handschuh über die obere rechte Ecke
streift, schließt die Anzeige, ohne dass vorher irgendetwas sichtbar war. Die Gesamtstärke ist dann
weg, und es ist für den Umstehenden nicht erkennbar, warum. Der versehentliche Doppel-Tipp kippt
die Anzeige unerwartet auf Schwarz und lässt sie wie einen Geräteausfall aussehen.

**Empfehlung**
Bedienelemente, die eine Anzeige schließen, dürfen nicht unsichtbar und nicht am Rand liegen. Der
Schließen-Button sollte dauerhaft (wenn auch dezent) sichtbar sein, deutlich kleiner als die heutige
Trefferfläche, aus der Griffzone der Ecken herausgerückt und mit einer kurzen Rückfrage versehen
werden. Die unsichtbaren Container dürfen außerhalb des Buttons keine Treffer annehmen. Die
Invertierung gehört ins Menü, nicht auf einen Doppel-Tipp der Hauptanzeige.

**Verifikation**
Monitor auf Touchgerät öffnen, Gerät mehrfach an allen vier Ecken greifen, aufstellen und drehen: Die
Anzeige darf nicht verschwinden und nicht invertieren. Anschließend gezielt schließen: muss mit
Handschuh in einem Versuch gelingen und eine Rückfrage zeigen.

---

#### P0-2 „Löschen“ steht ungeschützt direkt neben „Speichern“ in jeder Helfer-Zeile

**Fundstellen**

- `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:154-164` (Speichern / Löschen in derselben Zelle)
- `src/renderer/src/styles/app.css:886-893` (`.inline-subtable-actions button { margin-right: 6px; padding: 4px 8px; }`)
- `src/renderer/src/styles/app.css:880-884` (`.inline-subtable th, td { padding: 4px; font-size: 12px; }`)
- Keine Bestätigungslogik im Renderer: Volltextsuche nach `confirm` in `src/renderer/src` liefert **keinen** Treffer.

**Beobachtetes Problem**
Zwei Buttons mit gegensätzlicher Wirkung liegen in derselben Tabellenzelle, getrennt durch 6 px
Rand. Bei `padding: 4px 8px` und 12 px Schriftgröße ergibt sich eine Höhe von grob 26 px – deutlich
unter jeder üblichen Mindest-Trefferfläche. „Löschen“ führt unmittelbar aus; es gibt weder Rückfrage
noch Rückgängig-Funktion für Helfer (Undo existiert laut `README.md` nur für `MOVE_EINHEIT` und
`MOVE_FAHRZEUG`).

Dasselbe Muster gilt für die Fahrzeug-Untertabelle (`EinheitFahrzeugeSection.tsx:108`, `:127`).

**Auswirkung im Einsatz**
Ein Fehlgriff um wenige Millimeter löscht einen erfassten Helfer. Die Stärkemeldung stimmt danach
nicht mehr, und der Fehler fällt erst auf, wenn die gemeldete Zahl nicht zur Realität passt – im
schlechtesten Fall bei der Meldung nach oben. Die Nacherfassung kostet Zeit, die im Einsatz nicht da
ist, und die Person muss aus dem Gedächtnis rekonstruiert werden.

**Empfehlung**
Löschen räumlich klar von Speichern trennen (eigene Spalte oder Zweitschritt), mit
eindeutiger Rückfrage, die den Namen der betroffenen Zeile nennt, und mit einer Möglichkeit, das
Löschen kurzzeitig zurückzunehmen. Die Trefferfläche beider Aktionen muss so groß werden, dass sie
mit Handschuh sicher getrennt anzusteuern sind.

**Verifikation**
Mit Arbeitshandschuh 20-mal zufällig eine der beiden Aktionen ansteuern: keine Fehlauslösung. Löschen
muss ohne bewusste Bestätigung unmöglich sein.

---

#### P0-3 Modale Dialoge können bei eingeblendeter Bildschirmtastatur nicht mehr gescrollt werden – Bestätigen wird unerreichbar

**Fundstellen**

- `src/renderer/src/styles/app.css:811-817` (`.modal-backdrop`: `position: fixed; inset: 0; display: grid; place-items: center;` – **kein** `overflow: auto`)
- `src/renderer/src/styles/app.css:819-826` (`.modal`: kein `max-height`, kein `overflow`)
- `src/renderer/src/components/dialogs/SplitEinheitDialog.tsx:23-38` (langes Formular im Modal)
- `src/renderer/src/components/dialogs/EditEinsatzDialog.tsx:21-47`, `MoveDialog.tsx:22-41`
- Kein `<form>`-Element im gesamten Renderer (Volltextsuche nach `<form` liefert keinen Treffer) → kein Absenden per Enter/„Los“-Taste der Bildschirmtastatur.

**Beobachtetes Problem**
Der Modal-Inhalt wird mittig zentriert, ohne Höhenbegrenzung und ohne Scrollcontainer. Wird der
sichtbare Bereich kleiner als der Dialog – was beim Einblenden einer Bildschirmtastatur regelmäßig
passiert – ragt der Inhalt oben und unten aus dem Viewport heraus und ist nicht scrollbar. Der
Aktionsbereich `.modal-actions` (`app.css:828-832`) liegt am unteren Ende, also genau dort, wo er
zuerst verdeckt wird. Weil es kein `<form>` gibt, kann auch nicht ersatzweise über die Enter-Taste
abgesendet werden.

*Annahme:* Das Verhalten der jeweiligen Bildschirmtastatur gegenüber dem Electron-Fenster wurde nicht
gemessen; je nach Plattform wird das Fenster verkleinert oder überlagert. Beide Fälle führen hier zum
gleichen Ergebnis.

**Auswirkung im Einsatz**
Der Helfer tippt einen Einheitennamen ein und kommt nicht mehr an „Speichern“ oder „Splitten“ heran.
Die Eingabe geht beim Abbrechen verloren, der Vorgang muss neu begonnen werden – oder es muss jemand
mit Tastatur zu Hilfe geholt werden. Beim Splitten einer Einheit bedeutet das, dass eine bereits
ausgerückte Teileinheit nicht im System abgebildet ist.

**Empfehlung**
Dialoge müssen in der Höhe begrenzt und innen scrollbar sein, und der Aktionsbereich muss dauerhaft
sichtbar am unteren Rand verankert bleiben. Zusätzlich sollte das Absenden über die Bestätigungstaste
der Bildschirmtastatur funktionieren, und ein angefangener Dialog sollte beim Abbrechen nicht
kommentarlos alles verwerfen.

**Verifikation**
Auf einem Touchgerät im Hoch- und im Querformat jeden Dialog öffnen, ein Textfeld antippen und bei
eingeblendeter Tastatur prüfen: Bestätigen- und Abbrechen-Schaltfläche müssen ohne Scrollen des
Hintergrunds erreichbar sein.

---

### P1 – Hoch

---

#### P1-1 Durchgängig zu kleine Trefferflächen bei allen Bedienelementen

**Fundstellen (Auswahl, gleiche Ursache)**

- `src/renderer/src/styles/app.css:34-41` – Basis-Button: `padding: 6px 12px`, ohne `min-height` → grob 32 px hoch
- `src/renderer/src/styles/app.css:53-60` – Eingabefelder: `padding: 8px 10px` → grob 36 px hoch
- `src/renderer/src/styles/app.css:731-738` – `.table-icon-button`: **34 × 34 px**
- `src/renderer/src/styles/app.css:931-942` – `.gender-toggle`: **28 × 28 px**, Abstand 4 px (`:926-929`)
- `src/renderer/src/styles/app.css:905-912` – `.helper-sign-badge`: 30 × 30 px
- `src/renderer/src/styles/app.css:302-308` – `.notice-close-button`: 32 px
- `src/renderer/src/styles/app.css:675-684` – `.tree-item`: `padding: 6px`, Abstand 4 px (`:670-673`) → grob 30 px hoch
- `src/renderer/src/styles/app.css:365-374` – `.rail-button`: 42 × 42 px (der größte Wert im Projekt, immer noch knapp)
- `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:136-141` – native Checkbox ohne jede Vergrößerung

**Beobachtetes Problem**
Kein einziges Bedienelement im Projekt erreicht die übliche Mindest-Trefferfläche. Die Werte liegen
zwischen 26 und 42 px. Es gibt keine Regel, die auf grobe Zeigegeräte reagiert (kein
`@media (pointer: coarse)`, keine `min-height`-Angabe auf Buttons).

**Auswirkung im Einsatz**
Jede Eingabe braucht zwei bis drei Versuche. Wer stehend und einhändig mit Handschuh arbeitet, legt
das Gerät ab oder zieht den Handschuh aus – beides kostet Zeit und ist bei Nässe, Kälte oder
Gefahrstoffen nicht immer möglich. Der Helfer weicht auf Zuruf an den Kameraden mit Tastatur aus, was
die Führungsstelle zusätzlich belastet.

**Empfehlung**
Eine verbindliche Mindest-Trefferfläche für alle interaktiven Elemente festlegen und in `AGENTS.md`
§9 verankern – die dortige Regel „platzsparende Bedienung beibehalten“ sollte um „aber nie unter die
Mindest-Trefferfläche“ ergänzt werden. Wo Platz knapp ist, lieber die Zeilenhöhe erhöhen als die
Schaltfläche verkleinern. Optional ein Modus mit vergrößerten Bedienelementen für den
Handschuhbetrieb.

**Verifikation**
Alle Kernaufgaben mit angezogenem Arbeitshandschuh im Stehen durchführen und die Fehlversuche zählen;
Ziel: kein Fehlversuch bei den Hauptaktionen.

---

#### P1-2 Drei gegensätzliche Icon-Aktionen ohne Abstand und ohne Beschriftung in einer Tabellenzelle

**Fundstellen**

- `src/renderer/src/components/tables/EinheitRow.tsx:78-99` (Verschieben / Bearbeiten / Splitten)
- `src/renderer/src/components/tables/FahrzeugRow.tsx:50-65` (Verschieben / Bearbeiten)
- `src/renderer/src/components/common/ActionIconButton.tsx:14-25` (Beschriftung nur als `title`/`aria-label`)
- `src/renderer/src/styles/app.css:731-738` (34 × 34 px), `app.css:719-724` (Zellen-Padding 6 px)

**Beobachtetes Problem**
Die Buttons stehen ohne definierten Zwischenraum nebeneinander; es wirkt nur der Leerraum zwischen
den Inline-Elementen. Die Bedeutung erschließt sich ausschließlich über das Icon oder den
`title`-Tooltip – ein Tooltip, der auf Touch nicht erscheint. „Verschieben“ (Pfeilkreuz) und
„Splitten“ (Verzweigung) sind auf 34 px kaum auseinanderzuhalten.

**Auswirkung im Einsatz**
Statt die Einheit zu bearbeiten, wird der Verschiebe-Dialog oder der Split-Dialog geöffnet. Ein
versehentlich bestätigtes Splitten erzeugt eine Geister-Teileinheit in der Lage; ein versehentliches
Verschieben hängt eine Einheit an den falschen Abschnitt – beides verfälscht die Stärkeverteilung, die
gerade gemeldet werden soll.

**Empfehlung**
Die Aktionen räumlich trennen und für die gefährlicheren Aktionen (Verschieben, Splitten) eine
sichtbare Textbeschriftung oder eine zweite Ebene vorsehen, statt drei gleich große Icons
nebeneinanderzustellen. Die harmlose Aktion (Bearbeiten) sollte die prominenteste sein.

**Verifikation**
Zehn Zeilen nacheinander bearbeiten (nicht verschieben, nicht splitten) – mit Handschuh, ohne
Fehlauslösung.

---

#### P1-3 Der einzige Weg, einen Abschnitt in der Führungsstruktur zu bearbeiten, ist ein unsichtbarer Hover-Button

**Fundstellen**

- `src/renderer/src/styles/app.css:569-585` (`.fuehr-org-edit-btn`: `opacity: 0`, sichtbar nur bei `.fuehr-org-card:hover`)
- `src/renderer/src/components/views/FuehrungsstrukturView.tsx:184-192`

**Beobachtetes Problem**
Der Bearbeiten-Stift auf der Organisationskarte ist unsichtbar, bis die Karte mit dem Mauszeiger
überfahren wird. Auf Touch gibt es diesen Zustand nicht. Das Element bleibt gleichzeitig antippbar
(`opacity: 0` blockiert keine Treffer) und ist mit `font-size: 16px; padding: 1px 5px` sehr klein.

**Auswirkung im Einsatz**
Zwei gegenläufige Probleme aus derselben Ursache: Der Helfer findet die Bearbeiten-Funktion in der
Führungsstruktur nicht (er hält die Ansicht für reines Anzeigen) – und trifft sie gleichzeitig
zufällig, wenn er die Karte antippt, um zu scrollen. Ein unerwartet geöffneter Bearbeiten-Dialog
setzt zudem eine Datensatzsperre (`README.md`, Locking), die andere Clients aussperrt.

**Empfehlung**
Die Bearbeiten-Aktion muss dauerhaft sichtbar sein. Hover darf in dieser Anwendung nie die
einzige Bedingung sein, unter der eine Funktion erreichbar wird.

**Verifikation**
Ansicht auf Touchgerät öffnen: Ohne Vorwissen muss erkennbar sein, dass und wie ein Abschnitt
bearbeitet wird. Scroll-Gesten über den Karten dürfen keinen Dialog öffnen.

---

#### P1-4 „Speichern“ des Inline-Editors steht nur am Kopf eines sehr langen Formulars und scrollt weg

**Fundstellen**

- `src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:140-151` (Aktionen im `<header>`)
- `src/renderer/src/styles/app.css:842-857` (`.inline-editor-header` / `.inline-editor-actions`, nicht sticky)
- `src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:152-186` (darunter: Stammdaten, Stärke, Taktisches Zeichen, Kontakte, Bemerkungen, Fahrzeugtabelle, Helfertabelle)
- `src/renderer/src/styles/app.css:405-409` (`.main-view { overflow: auto }`)

**Beobachtetes Problem**
Das Formular ist sehr lang. Die Schaltflächen „Speichern“ und „Abbrechen“ liegen ganz oben und sind
nicht fixiert. Wer unten in der Helfertabelle arbeitet, sieht sie nicht mehr. Es gibt kein
`<form>`-Element, also auch kein Absenden per Tastatur.

**Auswirkung im Einsatz**
Nach dem Pflegen der Stärke muss über eine lange Strecke zurückgescrollt werden, um zu speichern – mit
Handschuh auf einem Touch-Display mehrere Wischgesten, bei denen unterwegs Felder und Schaltflächen
getroffen werden können. In Eile wird das Speichern vergessen; die Änderung ist dann nicht in der
Einsatzdatei und fehlt in der Stärkemeldung.

**Empfehlung**
Die Aktionsleiste des Inline-Editors dauerhaft sichtbar halten (fixiert am oberen oder unteren Rand
des Editors) und beim Verlassen mit ungespeicherten Änderungen darauf hinweisen.

**Verifikation**
Editor öffnen, bis zur untersten Helferzeile scrollen: „Speichern“ muss ohne Zurückscrollen
erreichbar sein.

---

#### P1-5 Untertabellen mit neun bis zehn Spalten in 12-px-Schrift erzwingen pixelgenaues Zielen und Horizontalscrollen

**Fundstellen**

- `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:196-210` (10 Spalten: Typ, G, Name, Anzahl, Funktion, Telefon, Erreichbarkeit, Vegetarisch, Bemerkung, Aktion)
- `src/renderer/src/components/editor/shared/EinheitFahrzeugeSection.tsx:154-165` (9 Spalten)
- `src/renderer/src/styles/app.css:875-884` (`.inline-subtable`: `padding: 4px; font-size: 12px`)
- `src/renderer/src/styles/app.css:869-873` (Felder auf `width: 100%` der jeweiligen Zelle)

**Beobachtetes Problem**
Neun bis zehn Spalten mit jeweils einem Eingabefeld werden in die verfügbare Breite gequetscht. Bei
12 px Schrift und 4 px Zellenabstand entstehen sehr schmale Felder direkt nebeneinander; das
Geschlechter-Umschaltfeld (28 px, `app.css:931`) und die Checkbox „Vegetarisch“ sind die kleinsten
Ziele der ganzen App. Auf schmalen Fenstern kommt Horizontalscrollen über `.main-view` hinzu.

**Auswirkung im Einsatz**
Beim Antippen des gewünschten Feldes landet der Fokus regelmäßig im Nachbarfeld; Telefonnummer steht
dann in „Erreichbarkeit“, der Name in „Funktion“. Solche Vertauschungen fallen erst auf, wenn jemand
nach der Nummer sucht – typischerweise dann, wenn er sie dringend braucht. Horizontalscrollen mit
Handschuh löst dabei leicht ungewollte Taps aus.

**Empfehlung**
Für schmale Fenster und Touchbedienung eine zeilenweise Darstellung (ein Datensatz untereinander)
statt der breiten Tabelle anbieten, oder die selten benötigten Spalten hinter einen Detailbereich
legen. Die Kernfelder (Rolle, Anzahl, Name) gehören groß und ohne Horizontalscrollen erreichbar.

**Verifikation**
Fünf Helfer mit Handschuh vollständig erfassen: kein Feld darf beim ersten Versuch danebengehen, kein
Horizontalscrollen erforderlich.

---

### P2 – Mittel

---

#### P2-1 Zwei verwendete CSS-Klassen sind gar nicht definiert – Buttons liegen ohne definierten Abstand nebeneinander

**Fundstellen**

- `src/renderer/src/components/views/StartView.tsx:38-45` (`inline-actions`: „Auf Updates prüfen“ / „DevTools öffnen“)
- `src/renderer/src/components/views/workspace/WorkspaceSections.tsx:164` („Basisdaten bearbeiten“ / „Einheit anlegen“), `:195`, `:227` (Filter, „Abschnitt anlegen“, „Einheit anlegen“)
- `src/renderer/src/components/views/SettingsView.tsx:232` (`settings-toggle`)
- In `src/renderer/src/styles/app.css` existiert **keine** Regel `.inline-actions` und keine `.settings-toggle` (per Abgleich aller verwendeten gegen alle definierten Klassennamen ermittelt).

**Beobachtetes Problem**
Beide Klassen sind wirkungslos. Die Container fallen auf den normalen Blockfluss zurück, die Buttons
stehen als Inline-Elemente unmittelbar nebeneinander, getrennt nur vom Leerzeichen zwischen den
Elementen. In der Kräfte-Ansicht stehen so ein Filter-Auswahlfeld und zwei Anlegen-Aktionen dicht an
dicht.

**Auswirkung im Einsatz**
„Einheit anlegen“ statt „Abschnitt anlegen“ – zwei strukturell völlig verschiedene Vorgänge, die im
Zweifel erst nach dem Ausfüllen eines Formulars auffallen. Bei `settings-toggle` sitzt die Checkbox
unmittelbar am Text, ohne vergrößerte Trefferfläche.

**Empfehlung**
Entweder die fehlenden Klassen definieren (mit klarem Abstand) oder die Container auf eine bestehende
Abstandsregel umstellen. Anlegen-Aktionen mit verschiedener Reichweite sollten nicht direkt
nebeneinanderliegen.

**Verifikation**
Sichtprüfung am Gerät: zwischen benachbarten Aktionen muss ein deutlich sichtbarer Zwischenraum
liegen.

---

#### P2-2 „Stärke-Monitor öffnen“ und „Monitor schließen“ liegen 8 px auseinander

**Fundstellen**

- `src/renderer/src/components/layout/Topbar.tsx:49-56`
- `src/renderer/src/styles/app.css:260-263` (`.topbar-actions { gap: 8px }`), `app.css:265-269`

**Beobachtetes Problem**
Zwei gegenläufige Aktionen mit ähnlicher Beschriftung („… öffnen“ / „… schließen“) stehen mit 8 px
Abstand nebeneinander, in einer 34 px hohen Leiste, die in der Topbar oben am Bildschirmrand liegt.

**Auswirkung im Einsatz**
Der Monitor für alle Umstehenden wird versehentlich geschlossen statt geöffnet. Das ist reversibel,
kostet aber Aufmerksamkeit in einer Situation, in der gerade eine Stärke abgefragt wird.

**Empfehlung**
Auf eine einzige Umschalt-Aktion reduzieren, deren Beschriftung den aktuellen Zustand nennt, oder die
beiden Aktionen klar trennen.

**Verifikation**
Mit Handschuh zehnmal den Monitor öffnen: keine Fehlauslösung von „Schließen“.

---

#### P2-3 Telefon- und Zahlenfelder ohne passende Tastaturvorgabe – unnötig viel Tipparbeit

**Fundstellen**

- `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:133` (`telefon` als einfaches Textfeld)
- `src/renderer/src/components/dialogs/EinheitFormFields.tsx:147`, `:150`, `:153` (OV-/RB-/LV-Telefon, jeweils Text)
- Im gesamten Renderer kein `inputMode` (Volltextsuche ohne Treffer)

**Beobachtetes Problem**
Telefonnummern und Faxnummern werden als freie Textfelder erfasst. Die Bildschirmtastatur öffnet sich
damit im Buchstabenmodus; der Helfer muss erst auf die Ziffernebene umschalten. Positiv: die
Stärkefelder nutzen `type="number"` (`EinheitFormRows.tsx:58`, `:66`, `:78`), dort passt die Tastatur.

**Auswirkung im Einsatz**
Jede Nummernerfassung kostet zusätzliche Bedienschritte auf kleinen Tasten. Bei Handschuhbedienung
ist der Umschaltvorgang selbst eine zusätzliche Fehlerquelle.

**Empfehlung**
Für Rufnummern die numerische Tastaturbelegung vorgeben. Grundsätzlich prüfen, welche Felder im
Einsatz überhaupt getippt werden müssen – jedes eingesparte Textfeld ist mit Handschuh ein Gewinn.

**Verifikation**
Telefonfeld auf Touchgerät antippen: Es muss sofort eine Ziffernbelegung erscheinen.

---

#### P2-4 Keine Rückmeldung beim Antippen – es gibt weder `:active`- noch Fokus-Gestaltung

**Fundstellen**

- `src/renderer/src/styles/app.css:43-46`, `:271-273`, `:376-399`, `:691-707`, `:1147-1153` – ausschließlich `:hover`-Zustände
- Einzige Fokus-Regel im gesamten Stylesheet: `app.css:1141-1145` (`:focus-within` im Stärke-Monitor). Kein `:focus-visible`, kein `:active`.

**Beobachtetes Problem**
Sämtliche visuelle Rückmeldung hängt am Mauszeiger. Auf Touch bleibt entweder gar keine Reaktion oder
– je nach Browserverhalten – der Hover-Zustand nach dem Tippen „kleben“, sodass ein Element dauerhaft
hervorgehoben aussieht, das gar nicht mehr aktiv ist.

*Annahme:* Das Kleben des Hover-Zustands ist Chromium-typisch, wurde hier aber nicht am Gerät
verifiziert.

**Auswirkung im Einsatz**
Der Helfer weiß nicht, ob sein Tippen angekommen ist, und tippt erneut – bei Aktionen, die
Datensätze anlegen oder verschieben, führt das zu Doppelauslösungen. Umgekehrt wird ein
hängengebliebener Hover-Zustand als aktueller Auswahlzustand fehlgedeutet (z. B. in der
Abschnittsliste, `app.css:691-707`).

**Empfehlung**
Für jeden Tap eine sofortige, sichtbare Rückmeldung vorsehen, die unabhängig vom Mauszeiger
funktioniert, und den ausgewählten Zustand klar vom bloß berührten unterscheiden.

**Verifikation**
Auf Touchgerät jede Hauptaktion einmal antippen: Rückmeldung muss sofort sichtbar sein und darf nach
dem Loslassen nicht dauerhaft bestehen bleiben.

---

#### P2-5 „Backup laden“ steht optisch gleichwertig direkt unter „Verzeichnis speichern“

**Fundstellen**

- `src/renderer/src/components/views/SettingsView.tsx:223-231` (drei gleich aussehende Buttons untereinander)
- `src/renderer/src/styles/app.css:435-443` (`.export-panel`: `display: grid; gap: 12px`)

**Beobachtetes Problem**
Drei Schaltflächen mit sehr unterschiedlicher Tragweite – Pfad speichern, Backup einspielen, Update
prüfen – stehen untereinander, gleich gestaltet, mit 12 px Abstand. „Backup laden“ ist die einzige
davon mit potenziell datenverändernder Wirkung, hat aber keine Rückfrage (kein `confirm` im
Renderer).

**Auswirkung im Einsatz**
Ein Fehlgriff bei der Einrichtung des Einsatzverzeichnisses kann einen Backup-Stand über den
aktuellen Arbeitsstand legen. Die Einstellungen werden typischerweise unter Zeitdruck beim Aufbau der
Führungsstelle bedient.

**Empfehlung**
Die Wiederherstellung optisch und räumlich von den harmlosen Einstellungen absetzen und mit einer
Rückfrage versehen, die Datum und Quelle des Backups nennt.

**Verifikation**
Einstellungen mit Handschuh bedienen: „Backup laden“ darf nicht versehentlich erreichbar sein und
nicht ohne Bestätigung ausführen.

---

### P3 – Niedrig

---

#### P3-1 Rail-Navigation mit Einzelbuchstaben E/G/K/F, deren Bedeutung nur im Tooltip steht

**Fundstellen:** `src/renderer/src/components/layout/WorkspaceRail.tsx:16-51`, `src/renderer/src/styles/app.css:365-374`

**Beobachtetes Problem:** Die vier Hauptansichten sind mit je einem Buchstaben beschriftet; die
Klartextbedeutung („Einsatz“, „Führungsstruktur“, „Kräfte“, „Fahrzeuge“) liegt ausschließlich im
`title`-Attribut, das auf Touch nicht erscheint.

**Auswirkung im Einsatz:** Der Helfer probiert die Ansichten durch, statt gezielt zu navigieren – auf
42 px breiten Zielen mit 10 px Abstand mehrere unnötige Bedienschritte. Kein Datenrisiko, aber
verlorene Sekunden bei jeder Nutzung.

**Empfehlung:** Klartext unter oder neben dem Symbol anzeigen, zumindest wenn Platz vorhanden ist.

**Verifikation:** Unerfahrener Helfer soll ohne Erklärung direkt zur Fahrzeugübersicht wechseln.

---

#### P3-2 Nur ein Breakpoint bei 900 px, keine Anpassung an grobe Zeigegeräte, keine Mindestfenstergröße

**Fundstellen:** `src/renderer/src/styles/app.css:1209` (einzige `@media`-Regel),
`src/renderer/index.html:5`, `src/main/services/main-window.ts:66-68` (1400 × 900, kein `minWidth`)

**Beobachtetes Problem:** Unterhalb 900 px wird das dreispaltige Layout einspaltig gestapelt
(`app.css:1214-1232`): Navigationsleiste, Abschnittsliste und Inhalt liegen dann übereinander im
selben höhenbegrenzten Bereich. Wie viel Platz die Tabelle im Hochformat noch bekommt, ist ohne
laufende App nicht beurteilbar – *dies ist ausdrücklich eine Vermutung und kein beobachteter Fehler.*
Eine Anpassung an grobe Zeigegeräte (`pointer: coarse`) existiert nicht, eine Mindestfenstergröße
ebenfalls nicht.

**Auswirkung im Einsatz:** Im Hochformat oder bei geteiltem Bildschirm könnte der eigentliche
Arbeitsbereich sehr klein werden; die Bedienelemente bleiben dabei unverändert klein.

**Empfehlung:** Hoch- und Querformat am Gerät durchspielen und für schmale Darstellungen die
Bedienelemente vergrößern statt sie nur umzustapeln.

**Verifikation:** Fenster im Tablet-Modus auf Hochformat drehen: Alle Hauptaufgaben müssen ohne
Horizontalscrollen bedienbar bleiben.

---

#### P3-3 Menü des Stärke-Monitors schließt nur über Maus-Ereignis oder Escape-Taste

**Fundstelle:** `src/renderer/src/components/views/StrengthDisplayView.tsx:88-108` (`mousedown` und
`keydown`)

**Beobachtetes Problem:** Das Schließen des Monitor-Menüs ist an `mousedown` und die Escape-Taste
gebunden. Auf Touch-Geräten werden Maus-Ereignisse in der Regel nachgebildet, weshalb das
voraussichtlich funktioniert – *das ist eine Annahme, nicht geprüft.* Eine Tastatur steht am
Monitorgerät typischerweise nicht zur Verfügung.

**Auswirkung im Einsatz:** Im schlechtesten Fall bleibt das Menü über der Stärkeanzeige stehen und
verdeckt sie teilweise.

**Empfehlung:** Ein sichtbares Schließen-Element im Menü selbst vorsehen, statt sich allein auf
Ereignisse außerhalb zu verlassen.

**Verifikation:** Menü auf Touchgerät öffnen und durch Tippen daneben schließen.

---

## 4. Abschluss

- **Aufgabe geschafft:** mit Umwegen – Ansehen und Ablesen funktioniert gut, jedes Erfassen und
  Bearbeiten erfordert mehrere Versuche; „Helfer bearbeiten“ ist mit Handschuh nicht sicher
  durchführbar.
- **Fremde Hilfe nötig:** ja – spätestens dann, wenn ein Dialog bei eingeblendeter Bildschirmtastatur
  nicht mehr bestätigt werden kann oder versehentlich ein Helfer gelöscht wurde.
- **Größtes Missverständnis:** Dass ein Bedienelement, das man nicht sieht, auch nicht ausgelöst
  werden kann – bei den Ecken des Stärke-Monitors und dem Bearbeiten-Stift der Führungsstruktur ist
  genau das Gegenteil der Fall.
- **Größtes Einsatzrisiko:** Unbemerkter Datenverlust in der Stärke – ein Fehlgriff auf „Löschen“
  neben „Speichern“ oder ein vergessenes Speichern am oberen Ende eines langen Formulars verfälscht
  die gemeldete Zahl, ohne dass es jemandem auffällt.
- **Top-Priorität für die nächste Iteration:** Eine verbindliche Mindest-Trefferfläche für alle
  Bedienelemente einführen und alle unsichtbaren Hover-Elemente (Stärke-Monitor-Ecken,
  Führungsstruktur-Stift) dauerhaft sichtbar machen – das entschärft P0-1, P1-1 und P1-3 in einem
  Schritt.
