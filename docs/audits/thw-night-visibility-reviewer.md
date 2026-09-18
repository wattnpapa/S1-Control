# Audit: Nacht- und Sichtbarkeitstauglichkeit (THW Night Visibility Reviewer)

Rolle: THW-Helfer, der das Display nachts im/neben dem Fahrzeug, im Freien unter Arbeitslicht,
im abgedunkelten Führungsraum und tagsüber in direkter Sonne benutzt.
Datum: 2026-09-18 · Repository: `/home/user/S1-Control`

## Scope und Methodik

- **Codebasierter Review, keine laufende Anwendung.** Es standen keine Instanz, keine Screenshots
  und keine Bildschirmfolgen zur Verfügung. Bewertet wurden ausschließlich die im Code festgelegten
  Farben, Flächen, Größen und Zustandsdarstellungen.
- Geprüfte Quellen: `src/renderer/src/styles/app.css` (einzige Stylesheet-Datei, 1276 Zeilen),
  alle Views/Dialoge/Tabellen/Layout-Komponenten unter `src/renderer/src`,
  `src/shared/types.ts`, `src/main/services/strength-display.ts`, `README.md`, `TODO.md`.
- Kontrastwerte sind nach WCAG-2.x-Formel aus den im Code hinterlegten Hex-/RGBA-Werten berechnet
  (Alpha-Werte über die jeweils darunterliegende Codefarbe gemischt). Sie gelten für die
  Standardhelligkeit eines kalibrierten Displays; die reale Wahrnehmung bei gedimmtem Display,
  Sonnenlicht oder Regen auf dem Glas ist schlechter.
- **Nicht prüfbar ohne laufende App:** tatsächliche Leuchtdichte, Flimmern/Blitze beim Fensterwechsel,
  Verhalten bei OS-seitiger Nachtlicht-/Farbfilterfunktion, Lesbarkeit der als Data-URL erzeugten
  taktischen Zeichen (`TaktischesZeichenEinheit.tsx`, `TaktischesZeichenFahrzeug.tsx`,
  `TaktischesZeichenPerson.tsx`) — deren Farben entstehen im Main-Prozess und wurden hier nicht bewertet.
- **Annahme (als solche gekennzeichnet):** S1-Control wird nicht nur am ruhigen Arbeitsplatz, sondern
  auch im Führungsfahrzeug/ELW und an einem separaten Stärke-Monitor im teilweise abgedunkelten
  Führungsraum eingesetzt (README, Abschnitt „Monitoransicht"). Konkrete THW-Vorschriften zur
  Displaynutzung werden nicht behauptet.

## Kurzes Urteil aus Rollensicht

Inhaltlich ist die Oberfläche erfreulich robust: **kein einziger Zustand wird ausschließlich über
Farbe vermittelt** — Sperren, Fehler, Archivierung und Status stehen immer als Klartext da. Die
meisten Text/Hintergrund-Paarungen liegen deutlich über 4,5:1 (typisch 6–14:1). Die Stärke- und
NATO-Zeit-Anzeige ist groß und aus Distanz lesbar.

Die Reibung entsteht nicht beim Kontrast einzelner Texte, sondern bei der **Gesamthelligkeit**: Die
App ist durchgehend und ausschließlich hell gebaut (`color-scheme: light`), es gibt keinen Dark Mode
und keine Helligkeits-/Kontrasteinstellung. Der Stärke-Monitor startet grundsätzlich vollflächig
weiß; die Umschaltung auf Schwarz ist nur über ein unsichtbares Hover-Element oder einen
undokumentierten Doppelklick erreichbar und wird nicht gespeichert. Dazu kommt, dass der
ausgewählte Abschnitt — der bestimmt, wohin Kräfte gebucht werden — visuell fast nicht vom Rest
unterscheidbar ist (1,19:1 Flächenkontrast).

Arbeiten kann man mit der App auch nachts, aber man blendet sich dabei selbst und muss beim
Abschnittswechsel doppelt hinschauen.

---

## P0 – Einsatzkritisch

### P0-1 Keine dunkle Darstellung vorhanden — die App ist zwangsweise hell

**Fundstellen**

- `src/renderer/src/styles/app.css:2` — `color-scheme: light;` (fest, kein `light dark`)
- `src/renderer/src/styles/app.css:23` — `body` mit hellem Verlauf `#dde6fb → #eef1f7 → #e9eef8`
- `src/renderer/src/styles/app.css:187` — `.app-shell { background: #f5f7fc; }`
- `src/renderer/src/styles/app.css:8-9` — `--bg: #eef1f7`, `--surface: #ffffff`
- `src/renderer/src/styles/app.css:713, 819, 988, 423, 443` — Tabellen, Modals, Overlays, Karten alle `#fff`
- Verifiziert per Suche: `prefers-color-scheme` kommt im gesamten Repository **null mal** vor
  (einziger Treffer für „color-scheme" ist `app.css:2`).

**Beobachtetes Problem** Die gesamte Arbeitsfläche besteht aus großflächigem Weiß/Hellblau. Es gibt
weder eine automatische Anpassung an das Systemthema noch einen manuellen Schalter. Die einzigen
dunklen Flächen sind die schmale Rail (`app.css:356`), die Abschnitts-Sidebar (`app.css:653-657`)
und das Debug-Log-Panel (`app.css:459-467`) — also genau die Nebenbereiche, nicht die Tabellen, in
denen gearbeitet wird.

**Erwartung der Rolle** Wenn ich nachts im Fahrzeug oder im abgedunkelten Raum arbeite, erwarte ich,
dass die App dunkel wird — entweder weil das Betriebssystem auf Dunkel steht oder weil ich es
einmal umschalten kann. Das ist bei Einsatz-Werkzeugen Standard.

**Auswirkung im Einsatz** Ein vollflächig weißes 15"-Display blendet den Bediener und alle
Umstehenden, zerstört die Dunkeladaption der Augen für mehrere Minuten und macht den Arbeitsplatz
von außen weithin sichtbar. Wer dagegen die Displayhelligkeit stark herunterregelt, verliert genau
die Feininformationen, die ohnehin klein und kontrastschwach sind (siehe P1-4, P2-8). Praktisch
führt das dazu, dass Helfer den Deckel zuklappen oder das Gerät wegdrehen, statt zu dokumentieren.

**Empfehlung** Eine dunkle Variante der Arbeitsoberfläche anbieten, die dem Systemthema folgt und
zusätzlich manuell erzwingbar ist (hell / dunkel / automatisch). Die Farbwerte sind bereits als
Tokens in `:root` gebündelt (`app.css:4-15`) — die Umstellung braucht vor allem eine zweite
Token-Belegung, keine Umstrukturierung. Wichtig ist, dass auch Tabellen, Karten, Modals und Overlays
mitziehen, nicht nur der Rahmen.

**Verifikation** Systemthema auf „Dunkel" stellen, App starten, jede Ansicht (Einsatz, Führung,
Kräfte, Fahrzeuge, Einstellungen, alle Dialoge, Update-Overlay) durchklicken: keine Ansicht darf
großflächig hell bleiben. Zusätzlich im abgedunkelten Raum prüfen, ob ein Blick auf den Bildschirm
noch blendet.

### P0-2 Stärke-Monitor startet immer vollflächig weiß, Invertierung ist versteckt und flüchtig

**Fundstellen**

- `src/renderer/src/components/views/StrengthDisplayView.tsx:178` — `const [inverted, setInverted] = useState(false);`
  (Startwert immer hell, reiner Komponentenstate)
- `src/renderer/src/styles/app.css:1044-1057` — `.strength-display { background:#ffffff; color:#000000 }`,
  invertiert erst über `.is-inverted`
- `src/renderer/src/styles/app.css:1071-1092` — Ziffernhöhe `min(24vw, 36vh)` bzw. `min(13vw, 22vh)`,
  also nahezu bildschirmfüllend
- `src/main/services/strength-display.ts:168` — Fenster mit `backgroundColor: '#000000'`
- `src/main/services/strength-display.ts:199-202` — schwarze Splash-Seite, danach lädt der Renderer
  die weiße Ansicht
- `src/renderer/src/styles/app.css:1117-1145` — `.strength-display-corner-button { opacity: 0 }`,
  sichtbar nur bei `:hover` / `:focus-within`
- `src/renderer/src/components/views/StrengthDisplayView.tsx:229, 236` — Doppelklick auf Wert/Zeit
  schaltet ebenfalls um, nirgends beschriftet
- `src/shared/types.ts:150-153` — `AppSettings` kennt nur `dbPath` und `lanPeerUpdatesEnabled`,
  keine Anzeigepräferenz; auch `StrengthDisplayState` (`types.ts:155-157`) trägt nur die Stärke

**Beobachtetes Problem** Beim Öffnen läuft die Sequenz Schwarz (Splash) → Weiß (Renderer). Danach
steht eine bildschirmfüllende weiße Fläche mit schwarzer Riesenschrift, typischerweise auf dem
externen Monitor (`strength-display.ts:143-147` wählt bevorzugt das externe Display). Der Schalter
„Schwarz/Weiß wechseln" liegt hinter einem Button, der mit `opacity: 0` unsichtbar ist und erst bei
Mauszeiger-Hover erscheint. Beim nächsten Öffnen ist die Einstellung wieder weg.

**Erwartung der Rolle** Ein Lagemonitor, der nachts im Führungsraum hängt, ist dunkel — oder merkt
sich wenigstens, wie ich ihn zuletzt eingestellt habe. Und ich erwarte einen sichtbaren Schalter,
nicht ein Element, das ich nur finde, wenn ich zufällig in die Ecke fahre.

**Auswirkung im Einsatz** Der hellste Gegenstand im Raum ist der Lagemonitor. Er blendet alle, die
auf die Karte oder auf Papier schauen, und muss bei jedem Öffnen erneut umgeschaltet werden — von
jemandem, der weiß, dass es den versteckten Schalter überhaupt gibt. Wird der Monitor im laufenden
Betrieb neu geöffnet (z. B. nach Update-Neustart, README: „Neustart zur Installation"), springt er
mitten in der Nacht wieder auf Weiß. Zusätzlich ist der Monitor ohne angeschlossene Maus praktisch
nicht umschaltbar.

**Empfehlung** Für den Stärke-Monitor dunkel als Voreinstellung wählen (weiß auf schwarz), die
gewählte Variante dauerhaft speichern (Settings statt flüchtigem Komponentenstate) und den
Umschalter dauerhaft sichtbar, wenn auch dezent, anzeigen. Die Splash-/Fehlerseiten sind bereits
dunkel (`strength-display.ts:199-202, 240-247`) — der Helligkeitssprung entfällt damit gleich mit.
Ergänzend: den Doppelklick-Shortcut im Menü als Hinweis benennen, statt ihn nur zu haben.

**Verifikation** Monitor im abgedunkelten Raum öffnen: keine weiße Blendfläche beim Start. Auf
Schwarz umschalten, Monitor schließen, App neu starten, Monitor erneut öffnen — die Einstellung
muss erhalten sein. Ohne Mausbewegung prüfen, ob die Bedienelemente auffindbar sind.

---

## P1 – Hoch

### P1-3 Der ausgewählte Abschnitt ist optisch kaum vom Rest zu unterscheiden

**Fundstellen**

- `src/renderer/src/styles/app.css:675-707` — `.tree-item` vs. `.tree-item.selected`
- `src/renderer/src/components/layout/AbschnittSidebar.tsx:62-63` — Klassenwechsel `tree-item selected`
- `src/renderer/src/components/tables/EinheitenTable.tsx:31` — Überschrift lautet pauschal
  „Einheiten im Abschnitt" ohne den Namen des Abschnitts
- Suche nach einer Anzeige des aktiven Abschnittsnamens im Hauptbereich
  (`views/WorkspaceContent.tsx`, `views/workspace/WorkspaceSections.tsx`): kein Treffer

**Beobachtetes Problem** Der ausgewählte Eintrag bekommt `rgba(0,56,168,0.42)` über dem
Sidebar-Verlauf. Gemischt ergibt das etwa `#0f285a` gegenüber `#1a1d21` im Normalzustand:
**Flächenkontrast 1,19:1**. Die Textfarbe wechselt lediglich von `#d6deee` auf `#ffffff`. Der Rahmen
`rgba(160,196,255,0.48)` ist bei gedimmtem Display der einzige verbleibende Anhaltspunkt. Der
Hauptbereich wiederholt den Abschnittsnamen nicht — es gibt also keine zweite Quelle.

**Erwartung der Rolle** Ich muss auf einen Blick — auch schräg, auch bei halber Helligkeit — sehen,
in welchem Abschnitt ich gerade arbeite, bevor ich eine Einheit anlege oder verschiebe.

**Auswirkung im Einsatz** Kräfte werden dem falschen Abschnitt zugeordnet. Das fällt oft erst bei
der nächsten Stärkemeldung auf und erzeugt eine falsche Lage in der Führungsstelle. Anders als ein
Tippfehler ist das nicht sofort sichtbar, weil die Tabelle danach völlig plausibel aussieht.

**Empfehlung** Die Auswahl deutlich robuster kennzeichnen: kräftigerer Flächenunterschied, zusätzlich
eine breite Markierung an der Kante und/oder Fettschrift — mindestens zwei voneinander unabhängige
Merkmale. Ergänzend den Namen des aktiven Abschnitts als Überschrift im Hauptbereich führen, damit
die Auswahl auch dann eindeutig ist, wenn die Sidebar schmal, ausgeblendet (`content-no-sidebar`,
`app.css:351`) oder im Mobil-Layout untergeklappt ist (`app.css:1214-1232`).

**Verifikation** Displayhelligkeit auf etwa 20 % stellen, aus 60 cm Abstand schräg auf den Bildschirm
schauen und den ausgewählten Abschnitt benennen, ohne zu klicken. Zusätzlich Graustufen-Screenshot
prüfen: die Auswahl muss auch ohne Farbe erkennbar bleiben.

### P1-4 Status wird nur als undifferenzierter Rohtext geführt

**Fundstellen**

- `src/renderer/src/components/tables/EinheitRow.tsx:112` — `<td>{props.item.status}</td>`
- `src/renderer/src/components/tables/FahrzeugRow.tsx:90` — `<td>{props.item.status}</td>`
- `src/renderer/src/components/views/EinsatzOverviewView.tsx:36-38` — Einsatzstatus als `<strong>`
- `src/shared/types.ts:1-4` — `EinsatzStatus`, `EinheitStatus` (`AKTIV | IN_BEREITSTELLUNG |
  ABGEMELDET`), `FahrzeugStatus` (`AKTIV | IN_BEREITSTELLUNG | AUSSER_BETRIEB`)

**Beobachtetes Problem** Alle Statuswerte erscheinen als technische Bezeichner in derselben Schrift,
Größe und Farbe wie Name, Organisation und Kennzeichen. Es gibt keinerlei visuelle Abstufung —
weder Farbe noch Form, Gewicht oder Symbol. Positiv: damit gibt es auch **keine reine
Farbcodierung**, das Problem „Rot-Grün-Schwäche" tritt hier gar nicht erst auf. Negativ: es gibt
überhaupt keine schnelle Erfassbarkeit, und `AUSSER_BETRIEB` sieht exakt aus wie `AKTIV`.

**Erwartung der Rolle** Ein außer Betrieb gesetztes Fahrzeug oder eine abgemeldete Einheit muss beim
Überfliegen der Tabelle herausstechen — ohne Zeile für Zeile zu lesen, erst recht bei gedimmtem
Display.

**Auswirkung im Einsatz** Bei der nächtlichen Kräfteübersicht wird ein defektes Fahrzeug oder eine
bereits abgerückte Einheit mitgezählt bzw. eingeplant. Das führt zu Aufträgen an Kräfte, die es
faktisch nicht mehr gibt.

**Empfehlung** Kritische Zustände redundant kennzeichnen: Klartext behalten (gut so), zusätzlich
Form/Gewicht/Symbol und erst als drittes Merkmal Farbe. Die technischen Bezeichner mit Unterstrich
(`AUSSER_BETRIEB`) durch sprechende Kurzbegriffe ersetzen. Wichtig: die Kennzeichnung muss auch in
Graustufen und bei starker Displaydimmung funktionieren.

**Verifikation** Tabelle mit gemischten Status als Graustufenbild betrachten und innerhalb von drei
Sekunden alle nicht einsatzbereiten Zeilen zeigen lassen.

### P1-5 Gesperrte und archivierte Bedienelemente sind fast nur an der Transparenz erkennbar

**Fundstellen**

- `src/renderer/src/styles/app.css:48-51` — `button:disabled { opacity: 0.6; }` (einzige
  Deaktiviert-Kennzeichnung im gesamten Stylesheet)
- `src/renderer/src/components/common/ActionIconButton.tsx:15-25` — Icon-Buttons, deren einzige
  Rückmeldung `disabled` ist
- `src/renderer/src/components/tables/EinheitRow.tsx:76-92`, `FahrzeugRow.tsx:49-62` — Sperre wirkt
  ausschließlich über `disabled`
- `src/renderer/src/styles/app.css:760-769` — `.lock-badge` in 11 px
- `src/renderer/src/styles/app.css:686-689` — `.tree-lock-note` in 11 px, `#ffd5d5`
- `src/renderer/src/components/views/AppWorkspaceShell.tsx:311` — `.banner` „Einsatz ist archiviert"

**Beobachtetes Problem** Ob eine Aktion gesperrt ist, zeigt sich am Button ausschließlich über 40 %
Transparenz. Der begleitende Klartext („In Bearbeitung: …", „Gesperrt: …") steht in 11 px. Bei
niedriger Displayhelligkeit schrumpft der ohnehin geringe Helligkeitsunterschied zwischen aktivem
und inaktivem Button weiter zusammen. Der Archiv-Hinweis ist ein Banner, das nach dem ersten Blick
nicht mehr wahrgenommen wird, während die Buttons darunter nur blass wirken.

**Erwartung der Rolle** Wenn ich etwas nicht bearbeiten darf, will ich das am Element selbst sehen —
und beim Klick eine Rückmeldung bekommen, nicht ins Leere greifen.

**Auswirkung im Einsatz** Mehrfaches Klicken auf einen toten Button, Zeitverlust, und im
Mehrplatzbetrieb auf dem Fileshare (README: „Mehrere Clients … WAL-Modus") der Eindruck, die App
hänge. Beim archivierten Einsatz wird länger versucht zu ändern, bis der Grund gefunden ist.

**Empfehlung** Deaktivierte Elemente zusätzlich über Umriss/Füllung/Schraffur kennzeichnen, nicht nur
über Transparenz, und die Sperrhinweise auf eine bei Nacht lesbare Größe bringen. Bei einem Klick
auf ein gesperrtes Element den Grund sichtbar melden, statt nur nicht zu reagieren.

**Verifikation** Zwei Clients auf derselben Einsatzdatei, ein Datensatz in Bearbeitung; auf dem
zweiten Client bei 20 % Helligkeit die gesperrten Zeilen benennen lassen, ohne zu klicken.

### P1-6 Sicherheitsrelevante Zusatzinformationen durchgängig in 11–13 px

**Fundstellen (Auswahl, gleiche Ursache)**

- `app.css:104, 110` — Version/Lizenz 12 px / 11 px
- `app.css:120-124` — `.update-status-reason` 11 px, `#4f5f7a` (6,46:1 auf Weiß)
- `app.css:659-663` — `.sidebar-subtitle` 13 px, `#9aabc9` (7,28:1 auf `#1a1d21`)
- `app.css:686-689` — `.tree-lock-note` 11 px
- `app.css:749-769` — `.split-badge` / `.lock-badge` 11 px
- `app.css:794-798, 920-924` — Fallback-Kürzel taktischer Zeichen 10 px / 12 px
- `app.css:880-884` — `.inline-subtable th/td` 12 px
- `app.css:963-967, 1198-1203` — Meta-/Hinweistexte 12–13 px
- `app.css:247-252` — `.topbar-meta-label` 11 px mit zusätzlich `opacity: 0.85`

**Beobachtetes Problem** Die Kontrastwerte dieser Texte sind rechnerisch in Ordnung (6–13:1), die
Schriftgrößen aber liegen an der unteren Grenze. Genau hier stehen die Angaben, die den Unterschied
machen: wer einen Datensatz sperrt, wovon eine Einheit abgesplittet wurde, welches taktische Zeichen
ersatzweise angezeigt wird. Bei `.topbar-meta-label` kommt zur kleinen Schrift noch eine
Deckkraftreduktion.

**Erwartung der Rolle** Was ich im Einsatz brauche, muss ich mit Helm, Brille, Regen auf dem Display
und aus wechselndem Abstand lesen können — nicht nur, wenn ich mich vorbeuge.

**Auswirkung im Einsatz** Diese Zusatzangaben werden schlicht nicht gelesen. Split-Beziehungen und
Sperrhinweise gehen unter, was zu Doppelerfassungen und zu überschriebenen Änderungen im
Mehrplatzbetrieb führt.

**Empfehlung** Eine Mindestgröße für alle Inhaltstexte festlegen (Hinweise und Badges deutlich über
11 px) und Deckkraftreduktion bei kleinen Texten vermeiden — lieber die Farbe anpassen. Ergänzend
eine Einstellung für größere Schrift anbieten, die auch im Stärke-Monitor greift.

**Verifikation** Aus 70 cm Abstand bei 20 % Displayhelligkeit einen Sperrhinweis und ein Split-Badge
vorlesen lassen.

---

## P2 – Mittel

### P2-7 Overlays und Dialoge sind helle Großflächen mit zu schwacher Abdunklung

**Fundstellen**

- `app.css:811-817` — `.modal-backdrop { background: rgba(0,0,0,0.2); }`
- `app.css:819-826` — `.modal { background: white; }`
- `app.css:979-995` — `.overlay-backdrop { rgba(10,14,23,0.45) }`, `.overlay-panel { background:#fff }`
- `src/renderer/src/components/common/UpdaterUi.tsx:180-208` — Update-Overlay erscheint ohne
  Zutun des Nutzers, sobald der Download läuft

**Beobachtetes Problem** Der Modal-Hintergrund dunkelt nur um 20 % ab; die darunterliegende, ohnehin
helle Oberfläche bleibt nahezu vollständig sichtbar und hell. Der Dialog selbst ist wieder reines
Weiß. Das Update-Overlay legt sich unaufgefordert über den Bildschirm.

**Erwartung der Rolle** Ein Dialog soll den Blick bündeln und den Rest zurücknehmen — nachts vor
allem, indem er die Gesamthelligkeit senkt, nicht erhöht.

**Auswirkung im Einsatz** Bei Dunkelheit springt der Bildschirm mehrfach in der Helligkeit, ohne dass
es einen erkennbaren Auslöser gibt, und der Fokus auf den Dialog ist schwach — man liest im
Hintergrund weiter.

**Empfehlung** Abdunklung deutlich verstärken und Dialogflächen gemeinsam mit P0-1 in die dunkle
Variante überführen. Selbst ausgelöste Overlays (Update) sollen sich nicht heller als die
darunterliegende Ansicht darstellen.

**Verifikation** Im Dunkeln einen Dialog öffnen und schließen: die Bildschirmhelligkeit darf nicht
spürbar springen.

### P2-8 Sehr dünne, kontrastschwache Trennlinien und Hierarchie-Linien

**Fundstellen**

- `app.css:604-634` und `app.css:1267-1274` — Org-Baum-Linien in `#9caecf` (2 px) auf `#f7f9ff`:
  **Kontrast 2,13:1**
- `app.css:14` / `app.css:719-724` — `--border: #d8dfea` auf `--surface: #ffffff`:
  **Kontrast 1,34:1** (Tabellen-Zellrahmen, Eingabefelder, Panels)
- `app.css:81` — Panelrahmen `#cfd8ea` auf Weiß: **1,43:1**
- `app.css:1121` / `app.css:1160` — Rahmen der Monitor-Bedienelemente mit `rgba(...,0.5)` bzw. `--border`
- Topbar-Buttons: Rahmen `rgba(255,255,255,0.24)` gegen die eigene Fläche `rgba(255,255,255,0.14)`
  ergibt **1,30:1** (`app.css:265-273`)

**Beobachtetes Problem** Die tragende Struktur — Tabellenraster, Formularfeldgrenzen, Verbindungen im
Führungsbaum — hängt an Linien mit Kontrasten um 1,3–2,1:1. Der Text darin ist gut lesbar, die
Struktur verschwindet aber zuerst, sobald Helligkeit sinkt oder Sonne auf das Glas fällt.

**Erwartung der Rolle** Ich muss Zeilen sauber auseinanderhalten und im Führungsbaum sehen können,
wer unter wem hängt — auch wenn ich das Display dunkel gestellt habe.

**Auswirkung im Einsatz** Zeilen verrutschen beim Lesen: Stärke der einen Einheit wird der nächsten
zugeordnet. Im Führungsbaum wird die Unterstellung falsch abgelesen. Beides sind Fehler, die man der
Ausgabe nicht ansieht.

**Empfehlung** Trennlinien und Feldgrenzen kräftiger ausführen und die Zeilentrennung zusätzlich
über abwechselnde Zeilenflächen absichern, damit sie nicht allein von einer dünnen Linie abhängt.
Im Führungsbaum die Linien stärker und dunkler zeichnen.

**Verifikation** Screenshot in Graustufen und zusätzlich mit reduziertem Kontrast betrachten: das
Tabellenraster und die Baumstruktur müssen erhalten bleiben.

### P2-9 Start-/Anmeldebildschirm blendet direkt beim App-Start

**Fundstellen**

- `app.css:72-77` — `.start-page` mit Hintergrundbild und nur `rgba(6,17,40,0.5)`-Überlagerung
- `app.css:144-148` — `.start-screen-panel` mit `rgba(255,255,255,0.93)` und `backdrop-filter: blur(3px)`
- `src/renderer/src/components/views/StartView.tsx:26-35` — Startansicht mit Logo und Metatexten
- `app.css:126-135` — weiße Logo-Kachel `rgba(255,255,255,0.96)`

**Beobachtetes Problem** Der erste Bildschirm nach dem Start kombiniert ein halbhelles Foto mit einer
fast vollständig weißen Panel-Fläche von bis zu 680 px Breite. Das ist die hellste Ansicht der App
und erscheint genau in dem Moment, in dem der Nutzer nach Öffnen des Laptops noch dunkeladaptiert
ist. Der `blur`-Filter weicht zusätzlich die Kanten der dahinterliegenden Texte auf.

**Erwartung der Rolle** Der Start soll unauffällig sein und nicht als Erstes blenden.

**Auswirkung im Einsatz** Kurzzeitiger Sehverlust beim Aufklappen des Geräts im Dunkeln; im Fahrzeug
auch eine Störung für den Fahrer.

**Empfehlung** Startansicht in die dunkle Variante einbeziehen bzw. das Panel deutlich zurücknehmen
und das Hintergrundbild stärker abdunkeln.

**Verifikation** Im Dunkeln App starten und prüfen, ob der erste Bildschirm ohne Zusammenkneifen der
Augen betrachtet werden kann.

### P2-10 Hauptnavigation nur über Einzelbuchstaben und einen Farbverlauf

**Fundstellen**

- `src/renderer/src/components/layout/WorkspaceRail.tsx:17-49` — Buttons mit den Beschriftungen
  „E", „G", „K", „F" und einem Zahnrad-Icon; die Bedeutung steht nur im `title`-Tooltip
- `app.css:365-399` — `.rail-button` `#2a2f38` / `.rail-button.active` blauer Verlauf
  `#2352bf → #0038a8`

**Beobachtetes Problem** Der aktive Bereich wird über eine blaue Verlaufsfläche gegenüber
`#2a2f38` markiert — der Buchstabe selbst ändert sich nicht. Bei entsättigter oder stark gedimmter
Darstellung bleibt vor allem ein Helligkeitsunterschied übrig, der nicht sehr groß ist. Die
Bedeutung der Buchstaben erschließt sich nur per Maus-Tooltip.

**Erwartung der Rolle** Ich will ohne Tooltip wissen, wo ich bin und wohin ich springe.

**Auswirkung im Einsatz** Fehlklicks in die falsche Ansicht, Zeitverlust bei Dunkelheit und Eile.

**Empfehlung** Aktiven Zustand zusätzlich nicht-farblich markieren (Markierungsbalken, Kontur,
Schriftgewicht) und die Bereiche sichtbar beschriften statt nur mit Einzelbuchstaben.

**Verifikation** Graustufen-Screenshot der Rail: der aktive Eintrag muss eindeutig sein.

### P2-11 Zwei verwendete CSS-Klassen existieren gar nicht — betroffene Bereiche bleiben ungestylt

**Fundstellen**

- `src/renderer/src/components/views/workspace/WorkspaceSections.tsx:194, 225, 243` u. a. —
  `className="inline-actions"`; in `app.css` kein einziger Treffer für `.inline-actions`
- `src/renderer/src/components/views/SettingsView.tsx:232` — `className="settings-toggle"`;
  in `app.css` kein Treffer für `.settings-toggle`
- Ebenfalls ohne Regel: `.settings` wird nur innerhalb der Media Query `app.css:1210` angesprochen

**Beobachtetes Problem** Diese Container fallen auf die Browser-Standarddarstellung zurück
(Blockfluss, keine definierten Abstände). Das ist ein Ausrichtungs- und Abstandsproblem, kein
Kontrastproblem — es wirkt sich bei Nacht aber darüber aus, dass Aktionsleisten ungleichmäßig
sitzen und beim Überfliegen schwerer als Gruppe erkannt werden.

**Erwartung der Rolle** Aktionsleisten sehen überall gleich aus, damit ich sie ohne Suchen finde.

**Auswirkung im Einsatz** Geringer Zeitverlust; vor allem inkonsistente Optik zwischen den Ansichten.

**Empfehlung** Die fehlenden Regeln ergänzen oder die Klassen entfernen, damit der beabsichtigte
Zustand eindeutig ist.

**Verifikation** Alle Ansichten nebeneinander vergleichen: Aktionsleisten mit gleichem Abstand und
gleicher Ausrichtung.

---

## P3 – Niedrig

### P3-12 Kein eigener Fokusstil definiert

**Fundstelle** `app.css` enthält außer `:focus-within` in Zeile 1142 keinerlei `:focus`- oder
`outline`-Regel.

**Problem/Auswirkung** Die Tastaturbedienung verlässt sich vollständig auf den Standard-Fokusring des
Browsers. Auf der dunklen Sidebar (`app.css:653-657`) und der dunklen Rail ist unklar, wie gut
dieser im Dunkeln sichtbar bleibt — **nicht ohne laufende App prüfbar**.

**Empfehlung** Einen eigenen, klar sichtbaren Fokusstil festlegen, der auf hellen und dunklen
Flächen funktioniert.

**Verifikation** Mit Tab durch Sidebar, Rail, Tabellenaktionen und Dialoge gehen; der Fokus muss
immer eindeutig lokalisierbar sein.

### P3-13 Bedienelemente, die nur bei Mauszeiger-Hover erscheinen

**Fundstellen** `app.css:569-585` (`.fuehr-org-edit-btn { opacity: 0 }`),
`app.css:1130` (Monitor-Ecktasten, siehe P0-2).

**Problem/Auswirkung** Funktionen sind vorhanden, aber unsichtbar, bis man zufällig darüberfährt.
Ohne Maus (Touch, Fernbedienung, reiner Monitorbetrieb) faktisch nicht auffindbar.

**Empfehlung** Bearbeiten-Funktionen dauerhaft, wenn auch dezent, sichtbar halten.

**Verifikation** Führungsstruktur ohne Mausbewegung betrachten: Bearbeiten-Möglichkeit muss erkennbar
sein.

### P3-14 Sehr hell leuchtende Flächen für die Führungsstelle

**Fundstelle** `app.css:528-531` — `.fuehr-org-card.is-command .fuehr-org-sign { background: #fff100; }`

**Problem/Auswirkung** Der Text darauf hat 16,2:1 Kontrast, ist also einwandfrei lesbar. Die Fläche
selbst ist jedoch eine der leuchtstärksten der Oberfläche (reines Gelb) und sitzt als 88 px breite
Spalte an jeder Führungskarte. Im Dunkeln zieht sie den Blick unverhältnismäßig an und trägt zur
Gesamtblendung bei.

**Empfehlung** In der dunklen Variante die Leuchtdichte dieser Kennzeichnung reduzieren, ohne die
Erkennbarkeit als Führungsstelle aufzugeben.

**Verifikation** Führungsstruktur im Dunkeln betrachten: die Kennzeichnung darf auffallen, aber nicht
blenden.

### P3-15 Keine Anzeigeeinstellungen vorhanden

**Fundstellen** `src/shared/types.ts:150-153` (`AppSettings` = `dbPath`, `lanPeerUpdatesEnabled`),
`src/renderer/src/components/views/SettingsView.tsx:217-255`.

**Problem/Auswirkung** Es gibt keinen Ort, an dem sich Thema, Kontrast oder Schriftgröße einstellen
ließen. Alle vorherigen Befunde können damit nur zentral gelöst werden, nicht durch den Nutzer vor
Ort angepasst.

**Empfehlung** Einen kleinen Bereich „Anzeige" in den Einstellungen vorsehen (Thema hell/dunkel/
automatisch, Schriftgröße, Voreinstellung des Stärke-Monitors) und die Werte persistent speichern.

**Verifikation** Einstellung ändern, App neu starten, Wirkung muss erhalten bleiben — auch im
separaten Monitorfenster.

---

## Positiv aufgefallen

- **Keine reine Farbcodierung.** Sperren, Fehler, Archivierung, Splits und Status stehen überall als
  Klartext (`EinheitRow.tsx:51-53`, `FahrzeugRow.tsx:85`, `AbschnittSidebar.tsx:72`,
  `AppWorkspaceShell.tsx:311-312`). Rot-Grün-Schwäche ist damit kein Thema.
- **Textkontraste überwiegend deutlich über der Anforderung:** `--muted` auf Weiß 5,80:1;
  Tabellenkopf 8,91:1; Sidebar-Einträge 12,52:1; Rail-Beschriftung 10,25:1; Fehlertext auf
  Fehlerbanner 5,48:1; Topbar weiß auf Blau 9,85–14,12:1.
- **Stärke-Monitor hat bereits eine echte Invertierung** (`app.css:1054-1057, 1135-1207`) inklusive
  angepasster Menüfarben — die Mechanik ist da, ihr fehlen nur Voreinstellung, Sichtbarkeit und
  Persistenz (P0-2).
- **Splash- und Fehlerseiten des Monitorfensters sind dunkel** (`strength-display.ts:199-202,
  240-247`) und das Fenster hat `backgroundColor: '#000000'` — kein weißes Aufblitzen beim
  Fensteraufbau selbst.
- **Stärke und NATO-Zeit sind sehr groß dimensioniert** (`app.css:254-258, 1071-1092`) und damit aus
  Distanz ablesbar.

## Abschluss

- **Aufgabe geschafft:** mit Umwegen — nachts bedienbar, aber nur um den Preis von Blendung oder
  einer Helligkeitsreduktion, unter der die kleinen Zusatzinformationen verloren gehen.
- **Fremde Hilfe nötig:** ja — den versteckten Umschalter des Stärke-Monitors findet ohne Hinweis
  praktisch niemand.
- **Größtes Missverständnis:** Der ausgewählte Abschnitt in der Sidebar wirkt bei gedimmtem Display
  wie ein normaler Eintrag, sodass man glaubt, in einem anderen Abschnitt zu arbeiten, als man es tut.
- **Größtes Einsatzrisiko:** Der bildschirmfüllende, immer wieder auf Weiß zurückspringende
  Stärke-Monitor blendet im abgedunkelten Führungsraum alle Beteiligten und zerstört die
  Dunkeladaption.
- **Top-Priorität für die nächste Iteration:** Stärke-Monitor dunkel voreinstellen, die Wahl
  persistent speichern und den Umschalter dauerhaft sichtbar machen (P0-2) — kleiner Eingriff,
  größte Wirkung; unmittelbar danach die dunkle Variante der Arbeitsoberfläche (P0-1).
