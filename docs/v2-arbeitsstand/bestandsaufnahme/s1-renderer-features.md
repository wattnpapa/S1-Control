# S1-Control – Feature-Inventar aus Nutzersicht (Renderer)

Key: s1-renderer-features
Stand: abgeschlossen (Repo-Stand bcf15c6 + uncommitted Prettier-Lauf).

## Gliederung
1. Ansichten und Navigation
2. Dialoge / Editoren
3. Tabellen
4. State-Management / Datenfluss
5. Uncommitted WIP (git diff)
6. Gherkin-Szenarien (vollständig)
7. UX-Beobachtungen
8. (a) Feature-Inventar-Tabelle
9. (b) Datenfelder je Entität
10. (c) Liste Gherkin-Szenarien
11. (d) UX-Stärken/-Schwächen
12. Offene Fragen

---

## 1. Ansichten und Navigation

### Einstiegspfad (main.tsx → App.tsx → AppEntryView / AppWorkspaceShell)
- `src/renderer/src/main.tsx:7-9`: Query-Parameter `?display=strength` rendert `StrengthDisplayView` (separates Monitor-Fenster), sonst `<App/>` in StrictMode.
- `src/renderer/src/App.tsx:10-13`: Umschaltung zwischen `AppEntryView` (kein Einsatz geöffnet) und `AppWorkspaceShell` (Einsatz offen) anhand `viewModel.showWorkspace`.
- `AppEntryView.tsx:42-61`: Zustand "Initialisiere Anwendung …" solange `authReady=false`; `:63-81`: Fehlerseite "Automatische Anmeldung fehlgeschlagen." wenn keine Session; `:83-107`: `StartView` wenn kein Einsatz gewählt. UpdaterNotices/UpdaterOverlay werden in jedem Zustand gerendert.

### StartView (`components/views/StartView.tsx`)
- Kopf: THW-Logo, Titel "S1-Control", Version, "Lizenz: GPL-3.0", Copyright (Z. 28-36).
- Aktionen: "Auf Updates prüfen", "DevTools öffnen" (Z. 38-45) – DevTools-Button ist auf dem Startbildschirm für Endnutzer sichtbar.
- Zwei Wahlmöglichkeiten: "Bestehenden Einsatz öffnen" / "Neuen Einsatz anlegen" (Z. 47-54).
- Modus `open` (Z. 56-80): Button "Einsatz-Datei auswählen und öffnen" (nativer Dateidialog via `openEinsatzWithDialog`), Liste "Zuletzt verwendete Einsätze" als Buttons `"{name} ({status})"` mit Tooltip = dbPath.
- Modus `create` (Z. 82-100): Felder **Einsatzname** (Placeholder "z.B. Hochwasser Landkreis") und **FüSt Name**, Button "Einsatz anlegen und öffnen" (deaktiviert ohne Einsatzname).
- Fehlertext unten (Z. 102).

### LoginView (`components/views/LoginView.tsx`)
- Felder Benutzer/Passwort, Hinweis "Standard: admin / admin" (Z. 24-39).
- **Toter Code**: `grep -rn LoginView src/renderer/src` liefert außer der Datei selbst keinen Treffer; README.md Z. 71: "Anmeldung erfolgt intern automatisch mit dem lokalen Standard-User (admin)".

### AppWorkspaceShell (`components/views/AppWorkspaceShell.tsx`)
- Props-Interface mit ~150 Feldern (Z. 31-180) – reines Prop-Drilling ohne Context/Store.
- Layout (Z. 340-381): `Topbar` → `UpdaterNotices` → `WorkspaceStatusBanners` ("Einsatz ist archiviert (nur lesen)." Z. 330, Fehlerbanner Z. 332) → `WorkspaceMainArea` → `WorkspaceDialogs` → Ladeoverlay "Einsatz wird geladen / Initialdaten werden geladen…" mit indeterminierter Progressbar (Z. 366-378), gesteuert durch `einsatzInitialLoading`.

### WorkspaceRail (`components/layout/WorkspaceRail.tsx`)
- Vertikale Leiste mit Buchstaben-Buttons: **E** = Einsatz, **G** = Führungsstruktur, **K** = Kräfte, **F** = Fahrzeuge, unten Zahnrad = Einstellungen (Z. 16-51). Keine Icons außer FontAwesome-Gear; Beschriftung nur per `title`-Tooltip.
- `WorkspaceView`-Typ (`types/ui.ts:14-19`): `einsatz | fuehrung | kraefte | fahrzeuge | einstellungen`. **Kein Export-Eintrag.**

### Topbar (`components/layout/Topbar.tsx`)
- Zeigt "S1-Control - {Einsatzname}", **Stärke** (Gesamtstärke als `F/UF/M//G`-String via `toTaktischeStaerke`), **Zeit** als NATO-Zeit (`toNatoDateTime`, 1s-Interval Z. 17-24).
- Aktionen: "Stärke-Monitor öffnen", "Monitor schließen" (Z. 50-55), beide während `busy` deaktiviert.

### AbschnittSidebar (`components/layout/AbschnittSidebar.tsx`)
- Überschrift "Abschnitte", Einsatzname als Untertitel, Button "Abschnitt bearbeiten" (deaktiviert bei busy / kein Abschnitt / archiviert / durch anderen Client gesperrt; Tooltip erklärt das, Z. 21-30; Bedingung in `WorkspaceMainArea.tsx:34-39`).
- Baum: flache Buttons mit `paddingLeft = 12 + depth*12`, Beschriftung `"{name} [{systemTyp}]"` (Z. 71) – der technische Enum-Wert (z. B. `[BEREITSTELLUNGSRAUM]`) ist für den Nutzer sichtbar. Lock-Hinweis "Gesperrt: {computer} ({user})" (Z. 72).
- Sidebar wird nur eingeblendet, wenn `showAbschnittSidebar` (siehe Hooks; nur in View `einsatz`).

### WorkspaceSections (`components/views/workspace/WorkspaceSections.tsx`)
- **EinsatzView** (Z. 157-193): Inline-Editoren für Einheit (Edit + Create) und Fahrzeug, Buttons "Basisdaten bearbeiten" (WIP, uncommitted) und "Einheit anlegen", dann `EinsatzOverviewView`.
- **FuehrungView** (Z. 198-217): Button "Abschnitt anlegen", dann `FuehrungsstrukturView`.
- **KraefteView** (Z. 222-273): Org-Filter-Select ("Alle Organisationen" + `ORGANISATION_OPTIONS`), Buttons "Abschnitt anlegen", "Einheit anlegen", `KraefteOverviewTable` (clientseitig gefiltert nach Organisation).
- **FahrzeugeView** (Z. 278-298): Button "Fahrzeug anlegen", `FahrzeugeOverviewTable`.
- **EinstellungenView** (Z. 303-321): `SettingsView`.

### EinsatzOverviewView (`components/views/EinsatzOverviewView.tsx`)
- Überschrift "Einsatz Übersicht", drei Summary-Cards: "Einheiten im Abschnitt", "Fahrzeuge im Abschnitt", "Status" (Z. 26-40) – bezogen auf den in der Sidebar gewählten Abschnitt.
- `EinheitenTable` + `FahrzeugeTable` (Z. 41-55).
- **"UDP Broadcast Monitor"** mit `<pre>`-Log direkt in der Einsatzübersicht (Z. 56-59) – Debug-Ausgabe in der Hauptansicht für Endnutzer.

### FuehrungsstrukturView (`components/views/FuehrungsstrukturView.tsx`)
- Überschrift "Führungsstruktur und Organisation"; Organigramm-Karten (`fuehr-org-card`) rekursiv nach parentId (Z. 215-261, 266-285).
- Pro Knoten: Label des Systemtyps (FüSt/Anfahrt/Logistik/Bereitstellungsraum/Abschnitt, Z. 28-34), Name, roher `systemTyp`-Enum, Stift-Button "✎ Abschnitt bearbeiten" (nur wenn nicht archiviert, Z. 184-192), "Führungsstärke: F/UF/M//G", "Einheiten gesamt: N" (tatsächlich Gesamtstärke `gesamt`, nicht Einheitenzahl – Label irreführend, Z. 198-200), bis zu 4 Organisations-Chips "THW (3)".
- Aggregation: Stärken werden rekursiv über Kinder aufsummiert (Z. 64-90); **Abschnitte vom Typ ANFAHRT zählen ihre direkten Kräfte nicht mit** (Z. 79-81) – fachliche Regel "Kräfte auf Anfahrt zählen nicht zur Einsatzstärke".

### ExportView (`components/views/ExportView.tsx`)
- Text "Einsatzakte als ZIP mit Datenbankkopie, HTML-Report und CSV-Dateien erzeugen.", Button "Einsatzakte jetzt exportieren" (Z. 14-26).
- **Toter Code / nicht erreichbar**: kein Import in anderen Renderer-Dateien, `exportEinsatzakte` wird im Renderer nirgends aufgerufen (grep über `src/renderer/src` ohne Treffer); kein Rail-Eintrag. IPC `einsatz:export` existiert (`ipc.ts:404`), README Z. 150-158 beschreibt Export als Feature.

### SettingsView (`components/views/SettingsView.tsx`)
- Feld **Einsatz-Verzeichnis** (Textinput, kein Ordnerdialog) + "Verzeichnis speichern"; "Backup laden" (nur mit geöffnetem Einsatz); "Auf Updates prüfen"; Checkbox "LAN-Peer-Updates" (Z. 219-240).
- Hinweistext spricht von "SQLite-Datei mit Endung .s1control" und Backups alle 5 Minuten (Z. 241-244).
- Tabellen: **Aktive Clients** (Rolle MASTER/STANDBY, Computer, IP, DB-Pfad, Zuletzt gesehen; Z. 22-52), **Peer Update Status** (8 Zeilen inkl. "Inaktiv (S1_UPDATER_LAN_PEER=1 setzen)" Z. 114/125), **Peer Artefakte im Netzwerk** (Z. 161-196), Debug-Sections "Debug Sync Logs" und "UDP Debug Monitor" (Z. 257-258).

### StrengthDisplayView (`components/views/StrengthDisplayView.tsx`, Monitorfenster)
- Zeigt taktische Stärke (Default `0/0/0//0`, Z. 5) und NATO-Zeit riesig; Schriftgröße dynamisch per `calcFitFontSize` aus Viewport (Z. 19-33, 187-203), Mindestgröße 24px.
- Datenquelle: initial `getStrengthDisplayState()`, dann Push-Event `strengthDisplayEvents.onStateChanged` (Z. 40-48).
- Bedienung: Ecke links "☰" Menü mit "Schwarz/Weiß wechseln" + Hinweis "Weitere Einstellungen folgen" (Z. 127-139); Ecke rechts "×" schließt Fenster via IPC (Z. 140-144, 208-210); Doppelklick auf Wert/Zeit invertiert Farben (Z. 229, 236); Escape/Klick außerhalb schließt Menü (Z. 88-109).

## 2. Dialoge und Editoren

### Zwei parallele Editor-Generationen
- Modale Dialoge `CreateEinheitDialog.tsx`, `EditEinheitDialog.tsx`, `EditFahrzeugDialog.tsx` existieren, werden aber **nirgends importiert** (`grep -rn "import.*\(CreateEinheitDialog\|EditEinheitDialog\|EditFahrzeugDialog\)" src/renderer/src` → 0 Treffer). Die produktive UI nutzt die Inline-Editoren aus `components/editor/inline/*` (eingebunden in `WorkspaceSections.tsx:58-102`).
- Modal genutzt werden: `MoveDialog`, `CreateAbschnittDialog`, `EditAbschnittDialog`, `SplitEinheitDialog`, `CreateFahrzeugDialog`, `EditEinsatzDialog` (alle in `WorkspaceDialogs.tsx:64-130`).
- Die Modal-Variante `CreateEinheitDialog` (tot) enthält **kein** Taktisches-Zeichen-Feld; die Inline-Variante enthält es. Formularfeld-Komponenten sind doppelt implementiert: `dialogs/EinheitFormFields.tsx` (Label-Layout, tot bis auf `SplitSourceField`+`EinheitCoreFields` im Split-Dialog) vs. `editor/inline/EinheitFormRows.tsx` (Tabellen-Layout).

### Einsatz anlegen (StartView) / Basisdaten bearbeiten (EditEinsatzDialog, WIP)
- Anlegen: Felder **Einsatzname**, **FüSt Name** (`StartView.tsx:84-95`), IPC `einsatz:create-dialog` (Nutzer wählt Speicherort im nativen Dialog; `ipc.ts:248-250, 383`).
- Basisdaten bearbeiten (`EditEinsatzDialog.tsx:26-44`): Felder **Einsatzname**, **Führungsstellenname**; Buttons Speichern/Abbrechen; IPC `einsatz:update` (`ipc.ts:43-47, 252, 385`). Aufruf über Button "Basisdaten bearbeiten" in der Einsatz-Ansicht (`WorkspaceSections.tsx:165-170`). Uncommitted (siehe Abschnitt 5).

### Abschnitt anlegen / bearbeiten (`CreateAbschnittDialog.tsx`, `EditAbschnittDialog.tsx`)
- Felder: **Name** (Placeholder "z.B. Abschnitt Nord"), **Systemtyp** (Select mit rohen Enum-Werten NORMAL/FUEST/ANFAHRT/LOGISTIK/BEREITSTELLUNGSRAUM, Z. 42-46), **Parent-Abschnitt (optional)** ("Kein Parent (Root)" + Liste `"{name} [{systemTyp}]"`).
- Edit-Variante filtert den eigenen Abschnitt aus der Parent-Liste (`EditAbschnittDialog.tsx:54-55`), verhindert aber **nicht** die Auswahl eines eigenen Nachkommen (Zyklusprüfung liegt, falls vorhanden, im Main; im Renderer nicht sichtbar).
- IPC `abschnitt:create` / `abschnitt:update` (`ipc.ts:31-41, 49-60`).
- Kein Löschen/Archivieren von Abschnitten in der UI (kein IPC-Kanal dafür in `ipc.ts:369-437`).

### Einheit anlegen (InlineCreateEinheitEditor) – Felder in Reihenfolge
1. Identität (`EinheitFormRows.tsx:16-47`): **Name im Einsatz**, **Organisation** (Select aus `ORGANISATION_OPTIONS`, 14 Werte lt. `types.ts:9-23`), **Status** (AKTIV / IN_BEREITSTELLUNG / ABGEMELDET – rohe Enum-Labels).
2. **Abschnitt** (Select `"{name} [{systemTyp}]"`, "Bitte wählen"; `InlineCreateEinheitEditor.tsx:35-47`).
3. Stärke (`EinheitFormRows.tsx:52-87`): **Führung**, **Unterführung**, **Mannschaft** (je `type=number min=0`). Gesamt wird nicht angezeigt, sondern erst in Tabellen als `F/UF/M//G`.
4. **Taktisches Zeichen** (`TacticalSignSection.tsx`): Radio **Auto / Manuell**; Statustext "Vorschlag: {matchedLabel} ({confidence}%)" bzw. "Manueller Modus aktiv" (Z. 142-145). Im Auto-Modus wird bei jeder Änderung von Name/Organisation IPC `taktisches-zeichen:infer` **und** `thw-stan:infer` aufgerufen (Z. 102-110) und die Felder Einheit/Typ/Verwaltungsstufe überschrieben (Z. 114-119). Manuell (Z. 173-230): Suchfeld "Suchen..." → Katalog-Select (IPC `taktisches-zeichen:catalog`, pro Tastendruck neu geladen, Z. 68-83), Freitext **Einheit**, Select **Typ** (Keine/Zug/Gruppe/Trupp/Staffel/Zugtrupp/Bereitschaft/Abteilung/Großverband), Freitext **Denominator** (= Verwaltungsstufe), Button "Zurück auf Auto". Danach Zeile **Vorschau** mit gerendertem SVG (`TaktischesZeichenEinheit`).
5. **STAN-Vorschlag** / **STAN-Fahrzeuge** (nur Create; `EinheitFormRows.tsx:141-162`): zeigt "{title} ({conf}%)" oder "Kein STAN-Treffer" bzw. Fahrzeugliste als Komma-String oder "Keine Fahrzeugvorschläge erkannt". Bei Treffer werden **Führung/Unterführung/Mannschaft automatisch mit STAN-Sollstärke überschrieben** (Z. 122-126) und – wenn nicht manuell – das taktische Zeichen gesetzt (Z. 127-131). Die vorgeschlagenen Fahrzeuge werden **nur angezeigt, nicht angelegt** (kein Code, der `stanSuggestedVehicles` an `createFahrzeug` weiterreicht – siehe Hooks-Abschnitt).
6. Kontakt (`EinheitFormRows.tsx:167-202`): **GrFü**, **OV**, **OV Telefon**, **OV Fax**, **RB**, **RB Telefon**, **RB Fax**, **LV**, **LV Telefon**, **LV Fax**.
7. Notizen (Z. 207-224): **Erreichbarkeiten** (Textarea), **Bemerkung** (Textarea).
- Nicht im Formular: `vegetarierVorhanden` (im Form-Typ `types/ui.ts:46`, IPC `ipc.ts:97`, aber kein Eingabefeld in `EinheitFormRows.tsx`/`EinheitFormFields.tsx`), `stammdatenEinheitId`, `piktogrammKey`.
- Buttons "Anlegen"/"Abbrechen" im Header (`InlineCreateEinheitEditor.tsx:21-31`).

### Einheit bearbeiten (InlineEinheitEditor)
- Gleiche Zeilen wie Create ohne Abschnitt und ohne STAN-Zeilen (`InlineEinheitEditor.tsx:154-158`); Abschnittswechsel nur über "Verschieben".
- Zusätzlich eingebettete Untertabellen:
  - **Fahrzeuge** (`EinheitFahrzeugeSection.tsx`): Spalten Name, Kennzeichen, FuRn, STAN, Sondergerät, Nutzlast, Status, Aktion (Z. 158-165), je Zeile taktisches Fahrzeugzeichen (Z. 70); bestehende Zeilen "Speichern" (Z. 109-114), Neuzeile "Hinzufügen" (Z. 128-136). Kein Löschen/Entfernen eines Fahrzeugs.
  - **Helfer** (`EinheitHelferSection.tsx`): Spalten Typ (Führer/Unterführer/Helfer), G (Geschlecht als Mars/Venus-Toggle, Z. 78-99), Name, Anzahl, Funktion, Telefon, Erreichbarkeit, Vegetarisch, Bemerkung, Aktion (Z. 199-208); bestehende Zeilen "Speichern"/"Löschen" (Z. 155-163); **Auto-Zeilen**: aus Differenz Soll (Führung/Unterführung/Mannschaft) minus vorhandene Helfer je Rolle werden leere Zeilen `auto:{ROLLE}:{i}` erzeugt (`InlineEinheitEditor.tsx:77-104`), jede mit "Hinzufügen" (Z. 177-179).
- IPC: `einheit:update`, `einheit-helfer:list/create/update/delete`, `fahrzeug:create/update`.

### Fahrzeug anlegen (CreateFahrzeugDialog, modal) / bearbeiten (InlineFahrzeugEditor)
- Felder (`FahrzeugFormFields.tsx`): **Fahrzeugname** (Placeholder "z.B. MTW OV Oldenburg"), **Kennzeichen** ("z.B. THW-1234"), **Status** (AKTIV/IN_BEREITSTELLUNG/AUSSER_BETRIEB), **Zugeordnete Einheit** (Select `"{name} ({abschnitt})"`, deaktiviert ohne Einheiten), dann "Erfassungsbogen (optional)": **FuRn** ("z.B. Oldenburg 18/13"), **Ausstattung nach STAN** (unbekannt/ja/nein), **Sondergerät / Änderungen** (Textarea), **Nutzlast** ("z.B. 5t").
- Inline-Edit (`InlineFahrzeugEditor.tsx:8-68`) gleiche Felder in 4-Spalten-Tabelle; Label dort "STAN-konform" statt "Ausstattung nach STAN".
- Ein Fahrzeug hängt immer an einer Einheit (`aktuelleEinsatzEinheitId` Pflicht in `ipc.ts:142`); Abschnitt ergibt sich daraus. Kein Löschen.

### Verschieben (MoveDialog)
- Titel "Einheit verschieben"/"Fahrzeug verschieben", ein Select über alle Abschnitte (nur Name), "Bestätigen"/"Abbrechen" (`MoveDialog.tsx:25-38`). Kein Kommentarfeld obwohl `MoveEinheitInput.kommentar` existiert (`ipc.ts:169`). Kein Zeitstempel/kein Grund.
- Fahrzeug-Verschieben zielt auf einen **Abschnitt**, nicht auf eine Einheit (`ipc.ts:172-176`) – Semantik bei einheitsgebundenen Fahrzeugen im Renderer nicht sichtbar (→ offene Frage).
- Undo: IPC `command:undo-last`/`command:has-undo` existieren (`ipc.ts:277-278`), **kein Undo-Button im Renderer** (grep `undoLastCommand|hasUndoableCommand` in `src/renderer/src` → prüfen in Hooks-Abschnitt).

### Einheit splitten (SplitEinheitDialog)
- **Quell-Einheit** (Select `"{name} ({abschnitt}) [{taktische Stärke}]"`), dann `EinheitCoreFields`: Name im Einsatz, Organisation, Führung, Unterführung, Mannschaft, Status (`SplitEinheitDialog.tsx:27-28`, `EinheitFormFields.tsx:56-122`). Button "Splitten".
- Ergebnis: neue Einheit mit `parentEinsatzEinheitId`; Tabellen zeigen Badge "Split von {parent}" (`EinheitRow.tsx:50-52`). Ob die Quellstärke reduziert wird, ist im Renderer nicht sichtbar (Main-Logik).

### Taktische Zeichen (Anzeige)
- `TaktischesZeichenEinheit`, `TaktischesZeichenFahrzeug`, `TaktischesZeichenPerson` (`components/common/`), SVGs kommen per IPC aus dem Main (`taktisches-zeichen:formation-svg(s)`, `vehicle-svg(s)`, `person-svg`), Cache/Prewarm in `app/tactical-sign-cache.ts` (Tabellen rufen `prewarmFormationSigns`/`prewarmVehicleSigns` in `useEffect`, z. B. `EinheitenTable.tsx:19-26`).

## 3. Tabellen

| Tabelle | Datei | Überschrift | Spalten | Sortierung | Zeilenaktionen |
|---|---|---|---|---|---|
| EinheitenTable | `tables/EinheitenTable.tsx:32-42` | "Einheiten im Abschnitt" | [Zeichen], Name (+Badge "Split von …", Lock-Badge), Organisation (pretty), Stärke (taktisch), Status (roh), Aktion | keine (Reihenfolge wie vom Main geliefert) | Verschieben, Bearbeiten, Splitten (Icon-Buttons `EinheitRow.tsx:80-97`); deaktiviert bei archiviert oder Fremd-Lock |
| KraefteOverviewTable | `tables/KraefteOverviewTable.tsx:33-44` | "Alle Kräfte im Einsatz" | wie oben + Abschnitt | keine; Org-Filter clientseitig (`WorkspaceSections.tsx:224-229`) | wie oben |
| FahrzeugeTable | `tables/FahrzeugeTable.tsx:30-39` | "Fahrzeuge im Abschnitt" | [Zeichen], Name (+Lock-Badge), Kennzeichen, Status, Aktion | keine | Verschieben, Bearbeiten (`FahrzeugRow.tsx:52-63`) |
| FahrzeugeOverviewTable | `tables/FahrzeugeOverviewTable.tsx:31-42` | "Alle Fahrzeuge im Einsatz" | + Zugeordnete Einheit, Abschnitt | keine | wie oben |
| Helfer-Subtabelle | `EinheitHelferSection.tsx:199-208` | "Helfer" | Typ, G, Name, Anzahl, Funktion, Telefon, Erreichbarkeit, Vegetarisch, Bemerkung, Aktion | keine | Speichern, Löschen, Hinzufügen |
| Fahrzeuge-Subtabelle | `EinheitFahrzeugeSection.tsx:158-165` | "Fahrzeuge" | Name, Kennzeichen, FuRn, STAN, Sondergerät, Nutzlast, Status, Aktion | keine | Speichern, Hinzufügen |
| Aktive Clients | `SettingsView.tsx:24-51` | "Aktive Clients" | Rolle, Computer, IP-Adresse, DB-Pfad, Zuletzt gesehen | keine | – |

- Keine Tabelle bietet Sortierung, Spaltenfilter, Suche, Paginierung, Mehrfachauswahl oder Inline-Edit von Zellen.
- Stärke-Fallback ohne taktischen String: `0/0/{n}/{n}` (`EinheitRow.tsx:117`).
- Icons: FontAwesome `faArrowsUpDownLeftRight` (Verschieben), `faPenToSquare` (Bearbeiten), `faCodeBranch` (Splitten) mit `aria-label`+`title` (`ActionIconButton.tsx:16-23`).

## 4. State-Management und Datenfluss

### Architektur
- Kein Store (kein Redux/Zustand/Context). Gesamter Zustand liegt in `useState`-Hooks in `useAppCoreState.ts` (15 States: session, authReady, dbPath, einsaetze, selectedEinsatzId, abschnitte, details, allKraefte, allFahrzeuge, error, busy, einsatzInitialLoading, updaterState, perfSafeMode; Z. 10-24) und `useWorkspaceUiState.ts` (Dialog-Flags, Formulare, activeView, gesamtStaerke, activeClients, debugSyncLogs …).
- Komposition: `useAppViewModel` → `useAppControllers` → {`useEditLocks`, `useWorkspaceDerivedState`, `useWorkspaceLifecycle`, `useEinsatzData`, `useSyncEvents`, `useStartActions`, `useSystemActions`, `useEntityActionsBundle` (→ `useAbschnittActions`, `useFahrzeugActions`, `useEinheitActions` → 5 Einheit-Sub-Hooks), `useEinsatzBasisdatenActions`} (`useAppControllers.ts:244-284`).
- Props werden über `app-view-props.ts` (`buildWorkspaceProps`, `buildEntryProps`) in die ~150-Feld-Props von `AppWorkspaceShell` gemappt und von dort über `buildWorkspaceContentProps` (`AppWorkspaceShell.tsx:188-255`) weiter nach unten gereicht. Jede neue Aktion erfordert Änderungen in 5-7 Dateien (sichtbar am WIP-Diff, Abschnitt 5).

### Lesepfad (`useEinsatzData.ts`)
- `loadEinsatz(einsatzId, preferredAbschnittId, {waitForFullOverview, includeFullOverview})` (Z. 35-115):
  1. `refreshEditLocks` fire-and-forget (Z. 43-45, Kommentar: "Lock list must not block open-flow on slow/shared filesystems").
  2. `listAbschnitte` → Abschnittsauswahl bestimmen (aktuelle Auswahl > preferred > erster Abschnitt; Z. 54-61).
  3. `listAbschnittDetails(selected)` → `details`; "Fast first paint": allKraefte/allFahrzeuge werden zunächst **nur aus dem gewählten Abschnitt** befüllt (Z. 69-75).
  4. `listAbschnittDetailsBatch` für alle Abschnitte → volle Übersichten + `gesamtStaerke` (Z. 83-95); im Hintergrund (`void`), außer `waitForFullOverview` (Erstöffnung per Dateiverknüpfung, `useSyncEvents.ts:170`).
  5. Bei `includeFullOverview:false` (Polling, Remote-Signal, nach jedem Write) wird **nur** `gesamtStaerke` aus dem Batch aktualisiert, `allKraefte/allFahrzeuge` bleiben auf dem "quick"-Stand des gewählten Abschnitts (Z. 98-106) → **Kräfte-/Fahrzeuge-Übersicht (Views K/F) kann nach einem Write veraltet oder auf den aktuellen Abschnitt reduziert sein**, bis ein voller Load (Abschnittswechsel/Move/refreshAll) passiert. (Aus dem Code ableitbar; Laufzeitverhalten nicht verifiziert → openQuestions.)
- Revision-Guard `loadRevisionRef` gegen Race Conditions überlappender Loads (Z. 41, 47, 64, 85).
- Gesamtstärke: Summe aller Einheiten aller Abschnitte außer `systemTyp === 'ANFAHRT'` (Z. 239-260); Einheit ohne taktischen String → `0/0/n/n`.
- Taktische-Zeichen-SVGs werden nach 250 ms für max. 40 Einheiten/Fahrzeuge vorgewärmt (Z. 24, 166-185).

### Aktualisierungsmechanismen (`useSyncEvents.ts`)
| Mechanismus | Intervall/Trigger | Was | Beleg |
|---|---|---|---|
| Periodisches Polling | alle **6 s** solange Einsatz offen (nicht bei `perfSafeMode`) | `loadEinsatz(..., includeFullOverview:false)` | Z. 47-67 |
| Abschnittswechsel | Änderung `selectedAbschnittId` | `listAbschnittDetails` | Z. 72-86 |
| Settings-View | alle **5 s** nur in View `einstellungen` | `listActiveClients`, `getSettings`, `getPeerUpdateStatus` | Z. 91-139 |
| Remote-Änderungssignal | Push `einsatz:changed` (UDP-Broadcast anderer Clients, via Main), **800 ms Debounce** | `loadEinsatz(..., includeFullOverview:false)` | Z. 206-227 |
| Debug-Logs | Push `debug:sync-log:added` + initial `getDebugSyncLogLines` | max. 400 Zeilen (`diagnostics-log.ts:1`) | Z. 194-201, 232-247 |
| Dateiverknüpfung | Push `app:pending-open-file` + `consumePendingOpenFilePath` | `openEinsatzByPath` + Ladeoverlay | Z. 144-189, `useAppBootstrap.ts:67-103` |
| Lock-Heartbeat | alle **8 s** solange eigene Locks; jede 3. Runde volle Lock-Liste | `refreshEditLock`, `listEditLocks` | `useEditLocks.ts:37-77` |
| Updater | Push `updater:state-changed` | Banner/Overlay | `useAppBootstrap.ts:83-96` |
| Stärke-Monitor | `useEffect` auf `gesamtStaerke` → `setStrengthDisplayState` | Push an Monitorfenster | `useSystemActions.ts:166-170` |
| Uhr (Topbar/Monitor) | 1 s `setInterval` | NATO-Zeit | `Topbar.tsx:17-24` |

- Es gibt also **drei konkurrierende Refresh-Quellen** (Polling 6 s, Remote-Signal, Post-Write-Refresh), abgesichert durch `refreshInFlightRef`, Revision-Counter und Debounce.

### Schreibpfad
- Alle Writes laufen über `withBusy` (`useAppControllers.ts:25-37`): `busy=true`, `error=null`, IPC, `finally busy=false`. `busy` deaktiviert **global** alle Buttons (Topbar, Rail-Nachbarn nicht, aber alle Aktionsbuttons und Selects; z. B. `WorkspaceSections.tsx:167, 173, 204, 241`).
- Nach Write: `refreshCurrentEinsatz({includeFullOverview:false})` (Einheit/Fahrzeug/Helfer) bzw. `loadEinsatz(einsatzId, created.id)` (Abschnitt) bzw. `refreshAll()` (Move: `useSystemActions.ts:122`).
- Validierung im Renderer minimal: Pflichtname, Abschnitt gewählt, Stärke-Zahlen ≥ 0 (`einheit-actions/types.ts:73-85`); Fehlermeldungen als globaler `error`-String im Banner (`AppWorkspaceShell.tsx:332`), nicht feldbezogen.
- Ableitungen im Renderer: `aktuelleStaerke = F+UF+M`, `aktuelleStaerkeTaktisch = "F/UF/M/G"` (`useEinheitCreateActions.ts:91-92`); `vegetarierVorhanden` beim Create immer `false` (Z. 106), beim Update aus Helfer-Liste abgeleitet (`useEinheitEditActions.ts:139`); `tacticalSignConfigJson` als JSON-String mit `meta.source auto|manual` (`tactical-sign-form.ts:51-79`).
- **Stärke-Notation inkonsistent**: `toTaktischeStaerke` liefert `F/UF/M/G` (`utils/tactical.ts:7`) – so in Topbar und Tabellen; nur für den Monitor wird per Regex auf THW-übliche Schreibweise `F/UF/M//G` umgeschrieben (`useSystemActions.ts:150, 168`); Monitor-Default `0/0/0//0` (`StrengthDisplayView.tsx:5`).

### Edit-Locks (`useEditLocks.ts`)
- Beim Öffnen eines Editors (Einheit/Fahrzeug/Abschnitt) `acquireEditLock`; bei Fehlschlag Fehlertext "Datensatz wird gerade von {computer} ({user}) bearbeitet." (Z. 103). Release beim Speichern/Abbrechen (`useWorkspaceLifecycle.ts:42-59`). Fremde Locks werden in Tabellen als Badge "In Bearbeitung: …" und als deaktivierte Aktionen angezeigt (`EinheitRow.tsx:29-31, 84-96`).
- Optimistic-Locking-Alternative gibt es nicht; kein Konfliktdialog bei gleichzeitigem Schreiben ohne Lock (Helfer-Zeilen werden ohne Lock geschrieben; `useEinheitHelferActions.ts`).

### Busy-/Lade-Overlays
- `einsatzInitialLoading` → Vollbild-Overlay "Einsatz wird geladen" (`AppWorkspaceShell.tsx:366-378`), gesetzt nur beim Öffnen per Dateiverknüpfung (`useSyncEvents.ts:165-173`); bei "Bestehenden Einsatz öffnen"/"Zuletzt verwendet" nur `busy` (Buttons disabled, kein Overlay: `useStartActions.ts:27-48` setzt `setEinsatzInitialLoading` nicht).
- `UpdaterOverlay` während Download (`UpdaterUi.tsx`).
- Kein Skeleton/Spinner in Tabellen; Prewarm der Zeichen asynchron mit Fallback-SVG (`utils/tactical-sign-fallback.ts`).

### Nicht aus der UI erreichbare IPC-Funktionen
`grep -rn "undoLastCommand\|hasUndoableCommand\|archiveEinsatz\|exportEinsatzakte\|logout" src/renderer/src` → **keine Aufrufe**. Undo (README Z. 133), Archivieren, Export (README Z. 150-158) und Logout sind im Main implementiert/vertraglich vorhanden, aber ohne Bedienelement. Ebenso keine IPC-Kanäle für Löschen von Einheit/Fahrzeug/Abschnitt/Einsatz (`ipc.ts:369-437`).

## 5. Uncommitted WIP (git diff, 14 Dateien)

- `git diff --stat`: 14 Dateien, +517/−189. Betroffen: `register-einsatz-ipc.ts`, `preload.ts`, `einsatz-write-service.ts`, `einsatz-write/einsatz-core.ts`, `defaultState.ts`, `useAppControllers.ts`, `useAppViewModel.ts`, `useWorkspaceUiState.ts`, `EditEinsatzDialog.tsx`, `AppWorkspaceShell.tsx`, `WorkspaceSections.tsx`, `ipc.ts`, zwei Behavior-Tests.
- **Befund: reine Prettier-Neuformatierung.** Tokenstrom-Vergleich (`tr -d ' \t\n\r,()' | md5` HEAD vs. Working Tree) ergibt für 13/14 Dateien Identität; bei `src/shared/ipc.ts` besteht die einzige Differenz aus umgebrochenen Union-Typen mit führendem `|` und mehrzeiligen Signaturen (`git diff -w -- src/shared/ipc.ts`). Keine neue Logik, keine neuen Kanäle, keine neuen Felder.
- Die eigentlichen Features **"Abschnitt bearbeiten"** und **"Einsatz-Basisdaten bearbeiten"** sind bereits committed: `e2fbb7c feat: Abschnitt bearbeiten + Einsatz-Basisdaten bearbeiten` (23 Dateien, +579/−58; Commit-Message: Stift-Button auf Führungsstruktur-Karten → `EditAbschnittDialog`; `updateEinsatz` Service + IPC + `EditEinsatzDialog` + Button "Basisdaten bearbeiten"; Fix `compareSemver`; 4 neue Behavior-Tests), gefolgt von `bcf15c6 fix(lint)`.
- Was gerade gebaut wird (aus Commit-Historie ableitbar): der Zweig "Stammdaten nachträglich editierbar machen" (Abschnitt: Name/Systemtyp/Parent; Einsatz: Name/FüSt-Name mit Durchschreiben auf den Root-FüSt-Abschnitt, siehe `test/behavior.einsatz-basisdaten.test.ts:28-33`). Der ungespeicherte Stand ist ein Formatierungslauf darüber (vermutlich `prettier --write`, [unbelegt] – kein Script-Aufruf im Diff nachweisbar).
- `tsconfig.renderer.tsbuildinfo` ist untracked (Build-Artefakt).

## 6. Gherkin-Szenarien (e2e/features/einsatz-lifecycle.feature, playwright-bdd, `# language: de`)

Feature "Einsatz-Lifecycle" – "Als S1-Offizier möchte ich Einsätze anlegen, Einheiten und Fahrzeuge verwalten und stets den Überblick über alle Kräfte behalten." Hintergrund: "die App ist gestartet und ich bin als admin eingeloggt".

| # | Szenario | Schritte (Kurzform) | Umsetzung/Auffälligkeit in Steps |
|---|---|---|---|
| 1 | Neuen Einsatz anlegen (Z. 12-15) | Einsatz "Hochwasser Testlage"/FüSt "FüSt 1" anlegen → Workspace mit Abschnitt "FüSt 1 [FUEST]" → Gesamtstärke 0 | Dateidialog wird per `app.evaluate` gemockt (`einsatz.steps.ts:26`) |
| 2 | Einheit im FüSt anlegen (Z. 17-21) | Einheit "OV Oldenburg" THW Stärke 9 → in Einheitenliste → Gesamtstärke 9 | Stärke wird als F/UF/M über `data-testid` gesetzt (Z. 130-140) |
| 3 | Abschnitt anlegen und Einheit zuordnen (Z. 25-30) | "EA Nord", "EA Süd" anlegen → beide in Abschnitt-Liste | Titel verspricht "Einheit zuordnen", Schritte prüfen nur Abschnittsliste |
| 4 | Einheit zwischen Abschnitten verschieben (Z. 32-38) | OV Oldenburg → EA Nord verschieben → in EA Nord, nicht mehr in FüSt 1 | Klick auf `button[title="Verschieben"]`, `dispatchEvent('click')` auf Bestätigen (Z. 164-174) |
| 5 | Gesamtstärke summiert alle Abschnitte (Z. 42-51) | A(5) in FüSt, B(7) in EA West, C(3) in EA Ost → 15 | Abschnittswahl über `.tree-item` |
| 6 | Stärke bleibt korrekt nach Abschnitt-Wechsel (Z. 53-58) | TZ Basis 12, EA Mitte anlegen+wählen → 12 | Regression zu Commit 507262f |
| 7 | Verschiebung rückgängig machen (Z. 62-69) | Move → "letzte Aktion rückgängig" → wieder in FüSt 1 | **Kein UI-Button**: Step ruft `window.api.undoLastCommand` per `page.evaluate` (Z. 232-243, Kommentar "Kein UI-Button für Undo vorhanden → IPC direkt aufrufen") |
| 8 | Fahrzeug einer Einheit zuordnen (Z. 73-77) | MTW-OV der Einheit OV Lüneburg zuordnen → in Fahrzeugliste | Mehrere Fallback-Selektoren (`[data-testid="fahrzeug-name"]` existiert im Renderer nicht, Z. 271-279) |
| 9 | Daten bleiben nach App-Neustart erhalten (Z. 81-87) | Einsatz schließen → erneut öffnen → FK Hamburg sichtbar, Stärke 8 | **Kein "Einsatz schließen"**: Step nutzt Einstellungen → "Verzeichnis speichern" als Workaround, weil `saveDbPath` `clearSelectedEinsatz()` aufruft (Z. 309-321, `useSystemActions.ts:37-43`); kein echter App-Neustart |
| 10 | Einheit in Teileinheiten aufteilen (Z. 91-96) | TZ Gesamt 12 → Teil-1 Stärke 5 → beide sichtbar, Gesamtstärke 12 | Step sucht Button `title="Aufteilen"`, Renderer-Label ist "Splitten" (`EinheitRow.tsx:93`) → Fallback "3. Icon-Button" (Z. 355-369) |

- Steps arbeiten überwiegend mit `waitForTimeout` (300–1500 ms, ~30 Vorkommen) statt Zustandsbedingungen; `playwright.config.ts`: `workers: 1`, `fullyParallel: false`, Timeout 120 s.
- Behavior-Tests (Vitest, `environment: 'node'`, gegen Main-Services, nicht gegen Renderer): `behavior.einsatzfluss` (Undo Move; Split reduziert Quellstärke `1/2/9/12` → `1/1/6/8`; Archiv schreibgeschützt), `behavior.fileshare-engpass` (JSON-Store schemaVersion 1; `listActiveClients` mutiert nicht; Batch == Einzelabfragen), `behavior.abschnitt-bearbeiten` (umbenennen; systemTyp → LOGISTIK), `behavior.einsatz-basisdaten` (Name/FüSt ändern schreibt Root-FüSt-Abschnitt um; archiviert → Fehler "Archiviert").
- **Keine Renderer-Komponententests**: `vitest.config.ts` coverage-include nur `src/main/services/**` und `src/renderer/src/utils/**`; unter `test/` referenzieren nur `utils.test.ts` und `tactical-sign-fallback.test.ts` Renderer-Code. UI-Verhalten ist ausschließlich über die 10 E2E-Szenarien abgesichert.

## 7. UX-Beobachtungen aus dem Code

### Sprache / Terminologie
- UI-Texte durchgehend Deutsch mit Umlauten (z. B. "Führungsstruktur", "Stärke", "Zuletzt verwendete Einsätze", "Abbrechen"). Fachbegriffe FüSt, GrFü, OV, RB, LV, FuRn, STAN, Bereitstellungsraum vorhanden.
- **Rohe Enum-Werte für Endnutzer sichtbar**: Statusspalten zeigen `AKTIV` / `IN_BEREITSTELLUNG` / `ABGEMELDET` / `AUSSER_BETRIEB` (`EinheitRow.tsx:118`, `FahrzeugRow.tsx:95`, Selects in `EinheitFormRows.tsx:39-41`); Abschnittsbaum zeigt `"{name} [BEREITSTELLUNGSRAUM]"` (`AbschnittSidebar.tsx:71`); Systemtyp-Select `FUEST`/`NORMAL` (`CreateAbschnittDialog.tsx:42-46`); StartView `"{name} (AKTIV)"` (`StartView.tsx:73`); Status-Card in Übersicht (`EinsatzOverviewView.tsx:38`). Nur die Führungsstruktur-Karten übersetzen (`FuehrungsstrukturView.tsx:28-34`) – und zeigen daneben trotzdem den rohen Wert (Z. 183).
- Rail-Navigation mit Buchstaben "E G K F" statt Icons/Labels (`WorkspaceRail.tsx:21-42`); "G" für Führungsstruktur ist nicht selbsterklärend.
- Uneinheitliche Bezeichner: "FüSt Name" (StartView) vs. "Führungsstellenname" (EditEinsatzDialog); "Ausstattung nach STAN" (Dialog) vs. "STAN-konform" (Inline) vs. "STAN" (Subtabelle); "Splitten" (Button) vs. "Aufteilen" (Test) vs. "Teileinheit" (Fehlertext).
- Stärke-Schreibweise `F/UF/M/G` in Topbar/Tabellen, `F/UF/M//G` nur im Monitor (Abschnitt 4).

### Icon-Actions
- Tabellenaktionen ausschließlich Icon-Buttons (FontAwesome) mit `aria-label`+`title` (`ActionIconButton.tsx`) – kompakt, aber ohne sichtbare Beschriftung; Lock-Zustand nur per Tooltip-Text "Bearbeiten gesperrt (…)" (`EinheitRow.tsx:31`).
- Stift "✎" als Unicode-Zeichen auf Führungsstruktur-Karten (`FuehrungsstrukturView.tsx:190`), Geschlecht als Mars/Venus-Toggle (`EinheitHelferSection.tsx:78-99`).

### Vollbild-Monitor
- Eigenes BrowserWindow (`?display=strength`), Schrift dynamisch nach Viewport berechnet (Zeichenbreiten-Heuristik `charWidthEm 0.62/0.7`, `StrengthDisplayView.tsx:19-33`), Schwarz/Weiß-Invertierung per Menü oder Doppelklick, Menü-Hinweis "Weitere Einstellungen folgen" (Z. 136). Zeigt nur Gesamtstärke + NATO-Zeit; keine Abschnittsaufteilung, kein Einsatzname.
- Datenweg: Renderer berechnet Gesamtstärke → `setStrengthDisplayState` → Main → Push an Monitorfenster (`useSystemActions.ts:166-170`). Der Monitor hängt damit am Hauptfenster-State, nicht an der Datei.

### Ladeoverlays / Busy
- Ein globales `busy` deaktiviert alle Aktionsbuttons in allen Views gleichzeitig (auch unbeteiligte, z. B. Org-Filter `WorkspaceSections.tsx:241`, Topbar-Buttons). Commits `6c6db17 fix(ux): run loadEinsatz outside withBusy so workspace buttons enable immediately`, `2364f2f fix(ux): remove loading overlay from einsatz open/create flows`, `c2fa343 fix(ux): show loading overlay only after file dialog is dismissed` zeigen, dass Busy/Overlay wiederholt nachjustiert wurde.
- Vollbild-Overlay "Einsatz wird geladen" nur bei Öffnen per Dateiverknüpfung.

### Refresh-Schleifen (Commit a5d3de1 "fix(perf): reduce heavy refresh loops during editing and sync")
- Diff: Polling und Remote-Signal riefen vorher `refreshAll()` (Einsatzliste + kompletter Load) alle 6 s; danach `loadEinsatz(..., {includeFullOverview:false})`; Lock-Heartbeat bekam `heartbeatInFlightRef` und lädt die Lock-Liste nur noch jede 3. Runde; neuer `refreshCurrentEinsatz` nach Writes (`git show a5d3de1`).
- Weitere Stabilisierungs-Commits derselben Klasse: `0d1a7e6 preserve user's abschnitt selection during background refreshes`, `778ca0e stabilize refreshEinsaetze to prevent boot-loop`, `112c9dc/879f869 debug isEntryOnlyState trigger reason`, `7d78596 notify local renderer directly after writes`, `507262f gesamtStaerke always sums ALL sections`.
- Der Code enthält dafür Refs gegen Stale Closures (`selectedAbschnittIdRef`, `selectedEinsatzIdRef`, `clearSelectedEinsatzRef`, `useEinsatzData.ts:31-33, 117-122`), Revisionszähler, In-Flight-Flags und Debounce – Symptome eines Pull-basierten Modells ohne zentrale Datenquelle.

### Was sich nach Workaround anfühlt (mit Beleg)
1. `useAutoSuggestion` mit `eslint-disable-next-line react-hooks/exhaustive-deps` und `onChange` innerhalb eines Effects, der bei jedem Tastendruck zwei IPC-Calls auslöst und Formularfelder überschreibt (`TacticalSignSection.tsx:88-128`).
2. Auto-Helfer-Zeilen aus Stärke-Defizit, Schlüssel `auto:{ROLLE}:{i}` (`InlineEinheitEditor.tsx:68-104`).
3. "Verzeichnis speichern" als einziger Weg, einen Einsatz zu schließen (E2E-Step `einsatz.steps.ts:309-321`; `useSystemActions.ts:40`).
4. Undo nur per IPC erreichbar (E2E-Step Z. 232-243).
5. Doppelte Formular-Implementierungen (modal vs. inline) mit abweichendem Feldumfang (Abschnitt 2).
6. `UDP Broadcast Monitor` in der Einsatzübersicht (`EinsatzOverviewView.tsx:56-59`) und DevTools-Button auf dem Startbildschirm (`StartView.tsx:42-44`).
7. Fallback-Selektorketten in E2E-Steps für nicht existierende `data-testid`s (`einsatz.steps.ts:271-292`).
8. Stärke-Notation per Regex-Ersetzung für den Monitor statt einer Formatfunktion (`useSystemActions.ts:150`).
9. `KraftOverviewItem` erhält `abschnittName` per Index-Zuordnung `abschnitte[index]` (`useEinsatzData.ts:205-207`) – hängt von Array-Reihenfolge des Batch ab.
10. Kein Einsatz-Verzeichnis-Picker; Pfad wird als Freitext eingegeben (`SettingsView.tsx:221`).

## 8. (a) Feature-Inventar (Nutzersicht)

Teststatus-Legende: E2E = Gherkin-Szenario Nr.; BT = Behavior-Test (Main-Service); – = kein Test; (IPC) = nur per IPC, kein Bedienelement.

| # | Feature | Ansicht / Element | IPC-Kanal | Datenfelder (Nutzer) | Teststatus |
|---|---|---|---|---|---|
| 1 | App-Start mit Auto-Login `admin/admin` | AppEntryView | `session:get`, `auth:login`, `settings:get`, `app:get-runtime-flags` | – | E2E Hintergrund |
| 2 | Einsatz anlegen (Speicherort per nativem Dialog) | StartView "Neuen Einsatz anlegen" | `einsatz:create-dialog` | Einsatzname, FüSt Name (Default "FüSt 1") | E2E 1 |
| 3 | Einsatz-Datei öffnen (Dialog) | StartView "Einsatz-Datei auswählen und öffnen" | `einsatz:open-dialog` | – | – (E2E 9 nutzt Recent-Liste) |
| 4 | Zuletzt verwendete Einsätze öffnen | StartView Quick-Liste | `einsatz:list`, `einsatz:open` | – | E2E 9 |
| 5 | Öffnen per `.s1control`-Doppelklick | Overlay "Einsatz wird geladen" | `app:consume-pending-open-file`, `app:pending-open-file`, `einsatz:open-by-path` | – | – |
| 6 | Einsatz-Basisdaten bearbeiten | Einsatz-View Button → EditEinsatzDialog | `einsatz:update` | Einsatzname, Führungsstellenname | BT einsatz-basisdaten (2) |
| 7 | Einsatz archivieren | **kein Bedienelement** | `einsatz:archive` (IPC) | – | BT einsatzfluss (Schreibschutz), BT basisdaten |
| 8 | Einsatz schließen / zur Startseite | **kein Bedienelement** (Workaround "Verzeichnis speichern") | – | – | E2E 9 (Workaround) |
| 9 | Abschnitt anlegen | Führungs-/Kräfte-View Button → CreateAbschnittDialog | `abschnitt:create` | Name, Systemtyp (5 Werte), Parent | E2E 3 |
| 10 | Abschnitt bearbeiten | Sidebar-Button / ✎ auf Karte → EditAbschnittDialog (mit Lock) | `abschnitt:update`, `edit-lock:*` | Name, Systemtyp, Parent | BT abschnitt-bearbeiten (2) |
| 11 | Abschnitt löschen | **nicht vorhanden** | – | – | – |
| 12 | Abschnittsbaum navigieren | AbschnittSidebar (nur View "Einsatz") | `abschnitt:list`, `abschnitt:details` | – | E2E 5, 6 |
| 13 | Einheit anlegen | Einsatz-/Kräfte-View → InlineCreateEinheitEditor | `einheit:create`, `taktisches-zeichen:infer`, `thw-stan:infer`, `taktisches-zeichen:catalog` | siehe (b) Einheit | E2E 2 |
| 14 | Einheit bearbeiten (inkl. Helfer, Fahrzeuge) | Tabellen-Icon → InlineEinheitEditor (mit Lock) | `einheit:update`, `einheit-helfer:list/create/update/delete`, `fahrzeug:create/update`, `edit-lock:*` | siehe (b) | – |
| 15 | Einheit verschieben | Tabellen-Icon → MoveDialog | `command:move-einheit` | Ziel-Abschnitt | E2E 4, BT einsatzfluss |
| 16 | Einheit splitten | Tabellen-Icon → SplitEinheitDialog | `einheit:split` | Quell-Einheit, Name, Organisation, F/UF/M, Status | E2E 10, BT einsatzfluss |
| 17 | Einheit löschen / abmelden mit Zeitstempel | **nicht vorhanden** (nur Status ABGEMELDET) | – | – | – |
| 18 | Undo letzte Bewegung | **kein Bedienelement** | `command:undo-last`, `command:has-undo` (IPC) | – | E2E 7 (per IPC), BT einsatzfluss |
| 19 | Fahrzeug anlegen | Fahrzeuge-View → CreateFahrzeugDialog; Einheit-Editor Subtabelle | `fahrzeug:create` | siehe (b) Fahrzeug | E2E 8 |
| 20 | Fahrzeug bearbeiten | Tabellen-Icon → InlineFahrzeugEditor (mit Lock); Subtabelle | `fahrzeug:update` | siehe (b) | – |
| 21 | Fahrzeug verschieben (nach Abschnitt) | Tabellen-Icon → MoveDialog | `command:move-fahrzeug` | Ziel-Abschnitt | – |
| 22 | Fahrzeug löschen | **nicht vorhanden** | – | – | – |
| 23 | Helfer pflegen (Rolle, Geschlecht, Kontakt, vegetarisch) | Subtabelle im Einheit-Editor, Auto-Zeilen aus Stärkedefizit | `einheit-helfer:*` | siehe (b) Helfer | – |
| 24 | Taktisches Zeichen Auto/Manuell + Vorschau | TacticalSignSection | `taktisches-zeichen:infer`, `:catalog`, `:formation-svg(s)` | Modus, Einheit, Typ, Denominator | – |
| 25 | STAN-Preset-Vorschlag (Sollstärke, Fahrzeugliste) | Create-Einheit Zeilen "STAN-Vorschlag/-Fahrzeuge" | `thw-stan:infer` | (nur Anzeige; Stärke wird übernommen) | – |
| 26 | Einsatzübersicht je Abschnitt | View E: Cards + EinheitenTable + FahrzeugeTable | `abschnitt:details` | – | E2E 2, 4 |
| 27 | Führungsstruktur (Organigramm, Stärkeaggregation ohne ANFAHRT) | View G | `abschnitt:list`, `abschnitt:details-batch` | – | – |
| 28 | Kräfteübersicht mit Org-Filter | View K KraefteOverviewTable | `abschnitt:details-batch` | Filter Organisation | – |
| 29 | Fahrzeugübersicht | View F FahrzeugeOverviewTable | `abschnitt:details-batch` | – | – |
| 30 | Gesamtstärke in Topbar + NATO-Zeit | Topbar | – (clientseitig) | – | E2E 1, 2, 5, 6, 9, 10 |
| 31 | Stärke-Monitor (Vollbildfenster) | Topbar-Buttons, StrengthDisplayView | `strength-display:*` | Invertierung (lokal) | – (SLO-Skript `test:e2e:slo:strength-monitor`) |
| 32 | Einsatzakte exportieren (ZIP) | **ExportView nicht eingebunden** | `einsatz:export` (IPC) | – | – |
| 33 | Backup wiederherstellen | Settings "Backup laden" | `einsatz:restore-backup`, `einsatz:open` | – | – |
| 34 | Einsatz-Verzeichnis setzen | Settings Textfeld + "Verzeichnis speichern" | `settings:set-db-path` | Pfad (Freitext) | E2E 9 (als Schließen-Workaround) |
| 35 | LAN-Peer-Updates an/aus + Peer-Status | Settings Checkbox + Tabellen | `settings:set-lan-peer-updates-enabled`, `updater:peer-status` | Schalter | – |
| 36 | Aktive Clients anzeigen (MASTER/STANDBY) | Settings Tabelle (5-s-Polling) | `clients:list-active` | – | BT fileshare-engpass |
| 37 | Update prüfen / laden / installieren | StartView, Settings, UpdaterNotices/-Overlay | `updater:check/download/install/get-state/state-changed`, `app:open-external-url` | – | Unit-Tests updater (Main) |
| 38 | Debug: DevTools, Sync-Logs, UDP-Monitor | StartView-Button, Settings, Einsatzübersicht | `app:open-main-devtools`, `debug:sync-logs:get`, `debug:sync-log:added` | – | – |
| 39 | Edit-Locks (Sperranzeige, Heartbeat) | Badges/Tooltips in Tabellen + Sidebar | `edit-lock:acquire/refresh/release/list` | – | – (Main-Tests record-lock) |
| 40 | Remote-Änderungen anderer Clients übernehmen | unsichtbar (Refresh) | `einsatz:changed` + 6-s-Polling | – | – |
| 41 | Archiv-Schreibschutz in UI | Banner + disabled Buttons | – | – | BT (Main enforced) |
| 42 | Login-Maske | LoginView **nicht eingebunden** | `auth:login`, `auth:logout` (IPC) | Benutzer, Passwort | – |

## 9. (b) Datenfelder je Entität aus Nutzersicht

**Einsatz** – Anlegen (StartView): Einsatzname*, FüSt Name (Default "FüSt 1"; `useStartActions.ts:58`). Bearbeiten (EditEinsatzDialog): Einsatzname*, Führungsstellenname. Angezeigt, nicht editierbar: Status (AKTIV/BEENDET/ARCHIVIERT), Start/Ende (nur im Typ `EinsatzListItem`, nirgends angezeigt), dbPath (Tooltip StartView).

**Abschnitt** – Name* (Placeholder "z.B. Abschnitt Nord"), Systemtyp (NORMAL | FUEST | ANFAHRT | LOGISTIK | BEREITSTELLUNGSRAUM; Default NORMAL), Parent-Abschnitt (optional; Default = aktuell gewählter Abschnitt, `useAbschnittActions.ts:92-93`). Kein Leiter, keine Kontaktdaten, kein Ort, keine Zeiten.

**Einheit** (Create/Edit, `EinheitFormRows.tsx`, `types/ui.ts:27-54`):
- Identität: Name im Einsatz*, Organisation (14 Werte, Default THW), Status (AKTIV | IN_BEREITSTELLUNG | ABGEMELDET)
- Zuordnung: Abschnitt* (nur Create; später nur per Verschieben)
- Stärke: Führung, Unterführung, Mannschaft (Defaults 0/1/8 beim Anlegen, `useEinheitCreateActions.ts:12-14`); Gesamt wird berechnet; persistiert als `aktuelleStaerke` + `aktuelleStaerkeTaktisch "F/UF/M/G"`
- Taktisches Zeichen: Modus Auto/Manuell, Einheit (Fachaufgabe/Katalog), Typ (none/zug/gruppe/trupp/staffel/zugtrupp/bereitschaft/abteilung/grossverband), Denominator (Verwaltungsstufe); persistiert als JSON `tacticalSignConfigJson`
- STAN (nur Create, nur Anzeige): STAN-Vorschlag-Label, STAN-Fahrzeuge
- Kontakt: GrFü, OV, OV Telefon, OV Fax, RB, RB Telefon, RB Fax, LV, LV Telefon, LV Fax
- Notizen: Erreichbarkeiten, Bemerkung
- Nicht eingebbar, aber im Modell: `vegetarierVorhanden` (abgeleitet), `stammdatenEinheitId`, `piktogrammKey`, `parentEinsatzEinheitId` (durch Split gesetzt, als Badge sichtbar)
- Split-Dialog: Quell-Einheit*, Name* (Default "{Quelle} - Teil 1"), Organisation, F/UF/M (Default 0/0/1), Status

**Fahrzeug** (`FahrzeugFormFields.tsx`, `InlineFahrzeugEditor.tsx`, Subtabelle): Fahrzeugname*, Kennzeichen, Status (AKTIV | IN_BEREITSTELLUNG | AUSSER_BETRIEB), Zugeordnete Einheit* (Create-Dialog: Default erste Einheit; Subtabelle: implizit die editierte Einheit), FuRn (Funkrufname), Ausstattung nach STAN (unbekannt/ja/nein → `null/true/false`), Sondergerät / Änderungen, Nutzlast. Nicht eingebbar: `stammdatenFahrzeugId`, `piktogrammKey`, `organisation` (aus Einheit abgeleitet, `useEinsatzData.ts:226-228`), `aktuellerAbschnittId` (aus Einheit/Move).

**Helfer** (Subtabelle im Einheit-Editor): Typ/Rolle (Führer | Unterführer | Helfer), Geschlecht (männlich/weiblich, Toggle), Name, Anzahl (bei "Hinzufügen" immer 1, `EinheitHelferSection.tsx:177`), Funktion, Telefon, Erreichbarkeit, Vegetarisch (Checkbox), Bemerkung. Keine Qualifikationen, keine Ausbildungen, kein Führerschein, keine Ankunfts-/Abmeldezeit.

**Bewegung/Move**: Ziel-Abschnitt. `kommentar` im IPC (`ipc.ts:169`) ohne UI. Keine Historienansicht im Renderer (Bewegungen nur im Export `bewegungen.csv`, README Z. 156).

**Einstellungen**: Einsatz-Verzeichnis (Pfad), LAN-Peer-Updates (bool). Stärke-Monitor: Invertierung (nur lokal, nicht persistiert).

## 10. (c) Liste der Gherkin-Szenarien
1. Neuen Einsatz anlegen
2. Einheit im FüSt anlegen
3. Abschnitt anlegen und Einheit zuordnen
4. Einheit zwischen Abschnitten verschieben
5. Gesamtstärke summiert alle Abschnitte
6. Stärke bleibt korrekt nach Abschnitt-Wechsel
7. Verschiebung rückgängig machen
8. Fahrzeug einer Einheit zuordnen
9. Daten bleiben nach App-Neustart erhalten
10. Einheit in Teileinheiten aufteilen
(Details, Schritte und Step-Auffälligkeiten in Abschnitt 6.)

## 11. (d) UX-Stärken und -Schwächen

### Stärken
- S1: Durchgängig deutsche Fachsprache, THW-Begriffe korrekt (FüSt, GrFü, OV/RB/LV, FuRn, STAN, Bereitstellungsraum) – `EinheitFormRows.tsx:171-198`, `FahrzeugFormFields.tsx:85-93`.
- S2: Fachregel "Anfahrt zählt nicht zur Stärke" konsistent in Gesamtstärke und Organigramm umgesetzt – `useEinsatzData.ts:246`, `FuehrungsstrukturView.tsx:79`.
- S3: Taktische Zeichen mit Auto-Inferenz aus Namen, Katalogsuche, manueller Übersteuerung und Live-Vorschau; STAN-Preset füllt Sollstärke automatisch – `TacticalSignSection.tsx`, `EinheitFormRows.tsx:112-133`.
- S4: Multi-Client-Bewusstsein in der UI: Sperr-Badges mit Rechnername/Benutzer, deaktivierte Aktionen, Sidebar-Hinweis – `EinheitRow.tsx:29-31`, `AbschnittSidebar.tsx:62-72`.
- S5: Vollbild-Stärkemonitor mit auto-skalierender Schrift, Invertierung und NATO-Zeit – `StrengthDisplayView.tsx`.
- S6: Inline-Editor für Einheiten bündelt Stammdaten, Helfer und Fahrzeuge an einem Ort; Auto-Helferzeilen machen Soll/Ist-Lücke sichtbar – `InlineEinheitEditor.tsx:77-104`.
- S7: Archiv-Schreibschutz wird überall sichtbar gespiegelt (Banner + disabled) – `AppWorkspaceShell.tsx:329-331`, alle Dialoge `disabled={busy || isArchived}`.
- S8: Zuletzt-verwendet-Liste, Dateiverknüpfung und Auto-Login senken die Einstiegshürde – `StartView.tsx:62-78`, `useAppBootstrap.ts:47, 67-81`.

### Schwächen
- W1: Rohe Enum-Werte an mindestens 8 Stellen sichtbar (Status, Systemtyp, Abschnittsbaum, StartView) – Belege Abschnitt 7.
- W2: Kern-Workflows ohne Bedienelement: Undo, Archivieren, Export, Einsatz schließen, Logout (Abschnitt 4 "Nicht erreichbar"; E2E-Workarounds `einsatz.steps.ts:232-243, 309-321`).
- W3: Kein Löschen/Korrigieren von Fehleingaben bei Einheit/Fahrzeug/Abschnitt (kein IPC-Kanal in `ipc.ts:369-437`).
- W4: Keine Sortierung, Filter (außer Org-Filter), Suche oder Spaltenkonfiguration in Tabellen – alle `tables/*.tsx`.
- W5: Ein globales `busy` friert die gesamte Oberfläche bei jedem Write ein; Fehlermeldungen nur als globales Banner, nicht am Feld – `useAppControllers.ts:25-37`, `AppWorkspaceShell.tsx:332`.
- W6: Navigation über Buchstaben-Rail "E G K F" ohne Beschriftung – `WorkspaceRail.tsx`.
- W7: Debug-Artefakte im Produktiv-UI (UDP Broadcast Monitor in der Einsatzübersicht, DevTools-Button auf Startseite, "S1_UPDATER_LAN_PEER=1 setzen" als Nutzertext) – `EinsatzOverviewView.tsx:56-59`, `StartView.tsx:42-44`, `SettingsView.tsx:114`.
- W8: Datenaktualität nach Writes unklar: `includeFullOverview:false` lässt Übersichtslisten auf Abschnittsstand – `useEinsatzData.ts:98-106`; drei konkurrierende Refresh-Quellen (6-s-Polling, Remote-Signal, Post-Write) mit Refs/Debounce als Absicherung.
- W9: Stärke-Notation inkonsistent (`F/UF/M/G` vs. `F/UF/M//G`) – `utils/tactical.ts:7` vs. `useSystemActions.ts:150`.
- W10: Fahrzeug-Verschieben zielt auf Abschnitt, obwohl Fahrzeuge einheitsgebunden sind; Move ohne Kommentar/Zeit – `MoveDialog.tsx`, `ipc.ts:165-176`.
- W11: Zwei parallele Editor-Generationen (modal tot, inline aktiv) und doppelte Feldkomponenten erhöhen Wartungsaufwand – Abschnitt 2.
- W12: Label "Einheiten gesamt" zeigt Personenstärke, nicht Einheitenzahl – `FuehrungsstrukturView.tsx:198-200`.
- W13: Kein Ordner-Picker für das Einsatz-Verzeichnis, Hinweistext spricht noch von "SQLite-Datei" trotz JSON-Store – `SettingsView.tsx:221, 242`.
- W14: Keine Renderer-Komponententests; UI-Absicherung nur über 10 E2E-Szenarien mit `waitForTimeout`-Ketten und Fallback-Selektoren – `vitest.config.ts`, `einsatz.steps.ts`.
- W15: Props-Explosion (~150 Props in `AppWorkspaceShellProps`) und 5-7 Dateien pro neuer Aktion (Commit e2fbb7c: 23 Dateien für zwei Dialoge) – `AppWorkspaceShell.tsx:31-180`.

## 12. Offene Fragen
- README/SettingsView sprechen von SQLite (`.s1control` als SQLite-Datei, WAL), die Commit-Historie (`f0a5fec feat(json-store): complete SQLite removal`) und `src/main/json-store/` zeigen JSON-Store; `better-sqlite3`/`drizzle` sind noch in `package.json`. Welcher Stand ist maßgeblich, und ist die Dateiendung `.s1control` heute JSON?
- Ob `allKraefte/allFahrzeuge` (Views K/F) nach einem Write in einem anderen Abschnitt tatsächlich veraltet bleiben (Ableitung aus `useEinsatzData.ts:98-106`), wurde nicht zur Laufzeit verifiziert.
- Verhalten von `moveFahrzeug` nach Abschnitt bei einheitsgebundenen Fahrzeugen (löst der Main die Einheitszuordnung? bleibt `aktuelleEinsatzEinheitId` inkonsistent?) – Main-Code nicht analysiert.
- Verhindert der Main-Prozess Zyklen beim Setzen eines Nachkommen als Parent im EditAbschnittDialog? Renderer filtert nur den eigenen Knoten.
- Werden STAN-Fahrzeugvorschläge irgendwo automatisch angelegt (im Renderer nicht), oder ist das bewusst nur Anzeige?
- Warum sind `LoginView`, `ExportView` und die modalen Einheit-/Fahrzeug-Dialoge noch im Repo (geplante Reaktivierung oder Rest)?
- Ist der ungespeicherte Prettier-Lauf beabsichtigt (kein `prettier`-Script in `package.json` gesichtet, [unbelegt])?
- Undo deckt laut README nur `MOVE_EINHEIT`/`MOVE_FAHRZEUG`; ob weitere Kommandos geplant sind, ist aus dem Renderer nicht ersichtlich.
- Semantik von `EinsatzListItem.start/end` und Status `BEENDET` – im Renderer nirgends gesetzt oder angezeigt.
