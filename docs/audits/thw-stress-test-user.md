# Audit: S1-Control unter Einsatzstress (Rolle "THW Stress Test User")

## Scope und Methodik

**Rolle:** Erfahrener, praktisch-technisch versierter THW-Helfer in der Führungsstelle. Er bedient die
Software nebenbei: 10–20 Sekunden Aufmerksamkeit pro Schritt, Funk und Zurufe im Raum, mehrere
Meldungen gleichzeitig, Unterbrechungen mitten im Vorgang, gelegentliches Doppeltippen oder
versehentliches Abbrechen.

**Einschränkung (wichtig):** Dieser Audit ist **rein code- und dokumentationsbasiert**. Es lief **keine
Instanz der App**, es lagen **keine Screenshots** vor. Alle Befunde sind aus dem Quelltext, den
Tests und der Dokumentation abgeleitet; sie beschreiben, was der Code an Bedienverhalten
*erzeugt*, nicht was am Bildschirm beobachtet wurde. Aussagen zu Timing, Lesbarkeit, Kontrast und
tatsächlicher Klickgröße sind entsprechend als Annahme gekennzeichnet.

**Geprüfte Quellen:** `src/renderer/src` (Views, Dialoge, Inline-Editoren, Tabellen, Layout,
`styles/app.css`), `src/renderer/src/app/**` (State- und Aktionslogik), `src/main/services` und
`src/main/ipc` (Schreibpfade, Locking, Updater, Backup), `src/shared`, `README.md`, `AGENTS.md`,
`TODO.md`, `e2e/features` + `e2e/steps` (reale Abläufe), `test/`.

**Nicht geprüft:** tatsächliche Performance, Darstellung auf konkreter Hardware, Stärke-Monitor auf
echtem Beamer, Verhalten bei echtem SMB-Aussetzer.

---

## Kurzes Urteil aus der Rolle

Was funktioniert: Der Grundablauf ist schlüssig und in den E2E-Szenarien durchgängig abgebildet –
Einsatz anlegen, Abschnitt anlegen, Einheit erfassen, verschieben, splitten, Fahrzeug zuordnen,
Gesamtstärke oben und auf dem Monitor. Datensatzsperren für Mehr-Client-Betrieb sind vorhanden und
werden in Tabellen und Baum sichtbar gemacht. Das ist für eine Führungsstelle eine brauchbare Basis.

Wo Reibung entsteht: Die Software gibt unter Stress **fast keine Rückmeldung**. Erfolge werden nicht
bestätigt, Fehler landen in einem Banner ganz oben am Fensterrand – bei offenem Dialog hinter dem
Overlay – und werden bei der nächsten Aktion stillschweigend gelöscht. Mehrere zentrale Knöpfe tun
in bestimmten Zuständen schlicht nichts. Gleichzeitig gibt es **keinen Weg zurück**: kein Rückgängig
in der Oberfläche, kein Löschen einer versehentlich angelegten Einheit, keine Rücknahme eines
Splits. Und der gefährlichste Knopf der Anwendung ("Updaten") liegt ohne Rückfrage im selben Banner
wie Statusmeldungen.

Kann die Aufgabe ohne fremde Hilfe erledigt werden? Erfassen und Verschieben: ja. Einen Fehler
korrigieren, den man unter Stress gemacht hat: **nein, nicht ohne Hilfe** (Undo existiert nur als
IPC ohne Bedienelement).

---

## P0 – Einsatzkritisch

### P0-1 "Updaten" beendet die laufende App ohne Rückfrage und ohne sichtbaren Zwischenschritt

**Fundstellen**
- `src/renderer/src/components/common/UpdaterUi.tsx:145-156` – Banner mit Button "Updaten", ohne Bestätigung.
- `src/renderer/src/components/views/AppWorkspaceShell.tsx:333` – dieses Banner wird auch **im laufenden Einsatz** über dem Arbeitsbereich gezeigt.
- `src/renderer/src/components/common/UpdaterUi.tsx:66-140` – es existiert **kein** Zweig für `stage === 'downloading'`; das Banner verschwindet nach dem Klick.
- `src/renderer/src/components/views/AppEntryView.tsx:58,78,104` vs. `AppWorkspaceShell.tsx` – der Fortschritts-Overlay `UpdaterOverlay` wird **nur auf dem Startbildschirm** gerendert, nicht im Workspace.
- `src/main/services/updater.ts:399-427` – nach Abschluss des Downloads: `setTimeout(() => autoUpdater.quitAndInstall(), 1800)`.

**Beobachtetes Problem (Code):** Ein einzelner Klick auf "Updaten" startet den Download. Im Workspace
gibt es danach keinerlei Anzeige mehr. Nach Abschluss beendet sich die Anwendung 1,8 Sekunden später
selbst und installiert. Es gibt keine Rückfrage, keinen Abbruch, keine Wahl "später".

**Auswirkung im Einsatz:** Der Knopf liegt direkt neben "Release-Seite öffnen" und dem
Schließen-Kreuz, also genau dort, wo ein gestresster Nutzer eine Meldung wegtippt. Folge: Die
Führungsstelle verliert mitten in der Lage ihr Werkzeug, ohne Vorwarnung. Offene, noch nicht
gespeicherte Formulareingaben (Einheit anlegen, Erfassungsbogen) sind weg; gehaltene
Bearbeitungssperren bleiben bis zum Ablauf der TTL stehen und blockieren andere Clients.

**Erwartung der Rolle:** Ein Update während eines Einsatzes wird nicht automatisch installiert.
Erwartet wird: deutliche Rückfrage ("Anwendung wird beendet – jetzt oder nach dem Einsatz?"),
sichtbarer Downloadfortschritt und ein Neustart erst auf ausdrückliche Bestätigung.

**Empfehlung:** Installation/Neustart nur nach expliziter Bestätigung; im geöffneten Einsatz
zusätzlich warnen bzw. auf "nach Einsatzende" verschieben. Downloadfortschritt auch im Workspace
sichtbar machen. Den Update-Knopf optisch von Status-/Schließen-Elementen trennen.

**Verifikation:** Im laufenden Einsatz "Updaten" klicken – es darf sich nichts unwiderruflich in
Gang setzen, der Fortschritt muss sichtbar sein, und die App darf sich erst nach einem zweiten,
bewussten Klick beenden.

---

### P0-2 Kein Rückgängig und keine Korrekturmöglichkeit in der Oberfläche

**Fundstellen**
- `src/main/preload.ts:41-42` – `undoLastCommand` / `hasUndoableCommand` sind verfügbar.
- `src/main/services/command.ts:119` – Undo ist implementiert (laut `README.md` für `MOVE_EINHEIT`/`MOVE_FAHRZEUG`).
- `e2e/steps/einsatz.steps.ts:236-238` – im E2E-Test steht wörtlich: "Kein UI-Button für Undo vorhanden → IPC direkt aufrufen".
- `src/main/preload.ts` – es existiert **keine** Lösch-API für Einheit oder Fahrzeug (nur `deleteEinheitHelfer:37`); `src/shared/ipc.ts:326` bestätigt das einzige DELETE-Kanal.
- `src/main/services/einsatz-write/einheit.ts:151-230` – `splitEinheit` reduziert die Quellstärke und legt eine Teileinheit an; ein Gegenstück ("Split zurücknehmen", "zusammenführen") gibt es nicht.

**Beobachtetes Problem (Code):** Die einzige im Backend vorhandene Rücknahmefunktion ist aus der
Oberfläche nicht erreichbar. Falsch angelegte Einheiten und Fahrzeuge lassen sich nicht entfernen,
ein falscher Split nicht zurücknehmen.

**Auswirkung im Einsatz:** Ein Zahlendreher, ein Doppelklick auf "Anlegen" oder ein Verschieben in
den falschen Abschnitt bleibt dauerhaft in der Einsatzdokumentation stehen. Der Helfer kann den
Fehler nur "umerzählen" (Name ändern, Stärke auf 0 setzen, Status ABGEMELDET) – die Einsatzakte
und die Bewegungsliste stimmen danach nicht mehr mit der Lage überein.

**Erwartung der Rolle:** Mindestens "letzte Aktion rückgängig" mit Klartext, was zurückgenommen
wird, und eine Möglichkeit, einen offensichtlichen Fehleintrag zu entfernen oder als ungültig zu
kennzeichnen.

**Empfehlung:** Undo sichtbar an prominenter Stelle (Topbar) inklusive Beschreibung der letzten
Aktion; Undo auf Split und Anlegen ausweiten oder ersatzweise ein nachvollziehbares "stornieren"
mit Protokolleintrag anbieten.

**Verifikation:** Nach jedem Schreibvorgang muss in der Oberfläche erkennbar sein, was zuletzt
passiert ist und wie man es zurücknimmt; Fehleintrag anlegen und ohne Fremdhilfe wieder
loswerden.

---

### P0-3 Verschieben-Dialog ist mit einem Tipp bestätigbar – mit vorausgewähltem, oft falschem Ziel

**Fundstellen**
- `src/renderer/src/app/app-view-props.ts:322-331` – beim Öffnen wird `moveTarget` auf den **aktuell in der Sidebar ausgewählten Abschnitt** gesetzt, nicht auf den Abschnitt der betroffenen Einheit.
- `src/renderer/src/components/dialogs/MoveDialog.tsx:22-41` – der Dialog nennt **nicht**, welche Einheit/welches Fahrzeug verschoben wird, zeigt **nicht** den aktuellen Abschnitt, listet Abschnitte flach nur mit `name` (ohne Hierarchie, ohne `[systemTyp]`), und "Bestätigen" ist sofort aktiv.
- `src/renderer/src/components/views/workspace/WorkspaceSections.tsx:236-262` – in der Kräfte-Ansicht werden Einheiten **aller** Abschnitte gelistet; die Sidebar-Auswahl hat mit der Zeile nichts zu tun.

**Beobachtetes Problem (Code):** Aus der Gesamtübersicht "Kräfte" auf das Verschieben-Symbol tippen
und sofort "Bestätigen" drücken schiebt die Einheit in den zufällig links markierten Abschnitt.
Der Dialog zeigt weder Objekt noch Ausgangslage.

**Auswirkung im Einsatz:** Falsche Kräftezuordnung im Abschnitt – die Führung disponiert mit einer
Einheit, die dort physisch nicht ist. In Kombination mit P0-2 (kein Undo in der UI) bleibt der
Fehler stehen, bis jemand ihn zufällig bemerkt.

**Erwartung der Rolle:** Der Dialog sagt in einem Satz: "Einheit X aus Abschnitt A verschieben nach:
…", die Zielauswahl steht zunächst auf "bitte wählen", und Abschnitte werden mit Hierarchie und Typ
angezeigt.

**Empfehlung:** Objekt und Quellabschnitt im Dialogkopf nennen; keine Vorauswahl eines Ziels, das
nicht bewusst gewählt wurde; Abschnittsliste mit Einrückung/Typ wie in der Sidebar; nach dem
Verschieben eine kurze Bestätigung mit Rücknahme-Möglichkeit.

**Verifikation:** Verschieben-Dialog aus der Kräfte-Ansicht öffnen: ohne aktive Auswahl darf
"Bestätigen" nicht ausführbar sein; der Dialogtext muss Einheit und Quellabschnitt nennen.

---

### P0-4 Gesamtstärke ist nicht erklärt: abgemeldete Kräfte zählen mit, ANFAHRT-Abschnitte fallen still heraus

**Fundstellen**
- `src/renderer/src/app/useEinsatzData.ts:236-260` – `aggregateTacticalStrength` überspringt Abschnitte mit `systemTyp === 'ANFAHRT'` und summiert sonst **alle** Einheiten, unabhängig von `status` (`AKTIV`, `IN_BEREITSTELLUNG`, `ABGEMELDET`).
- `src/renderer/src/components/layout/Topbar.tsx:38-43` – Anzeige "Stärke" ohne jeden Zusatz, was gezählt wird.
- `src/renderer/src/components/dialogs/EinheitFormFields.tsx:112-119` – Status `ABGEMELDET` ist wählbar und der einzige Weg, eine Einheit "wegzumelden".

**Beobachtetes Problem (Code):** Eine Einheit, die als `ABGEMELDET` gepflegt wurde, erhöht weiterhin
die Gesamtstärke in Topbar und Stärke-Monitor. Umgekehrt verschwinden Kräfte im Abschnitt vom Typ
ANFAHRT ohne sichtbaren Hinweis aus der Summe.

**Auswirkung im Einsatz:** Die Zahl, die auf dem Monitor steht und nach oben gemeldet wird, ist
nicht die Zahl der tatsächlich verfügbaren Kräfte. Beide Richtungen sind gefährlich: zu viel
gemeldete Stärke führt zu Aufträgen, für die keine Leute da sind; fehlende Anfahrt-Kräfte werden
doppelt nachgefordert.

**Erwartung der Rolle:** Die angezeigte Stärke ist entweder eindeutig beschriftet ("Stärke vor Ort,
ohne Anfahrt") oder rechnet abgemeldete Kräfte heraus. Eine Zahl ohne Definition ist im Meldewesen
nicht verwendbar.

**Empfehlung:** Abgemeldete Einheiten aus der Summe nehmen (oder getrennt ausweisen); die
Zählregel direkt an der Anzeige beschriften und auf dem Stärke-Monitor mitführen; idealerweise
zwei Werte: "vor Ort" und "in Anfahrt".

**Verifikation:** Einheit auf ABGEMELDET setzen und Abschnitt ANFAHRT befüllen – die Anzeige muss
sich nachvollziehbar und beschriftet verändern.

---

## P1 – Hoch

### P1-1 Rückmeldung fehlt: Erfolge unbestätigt, Fehler unsichtbar und selbstlöschend

**Fundstellen**
- `src/renderer/src/app/useAppControllers.ts:26-38` – `withBusy` setzt bei **jeder** Aktion zuerst `setError(null)`.
- `src/renderer/src/components/views/AppWorkspaceShell.tsx:308-313,340` – der einzige Fehlerkanal ist ein Banner ganz oben im Fenster.
- `src/renderer/src/styles/app.css:811-826` – Dialoge liegen als `position: fixed` Overlay über der Seite; das Banner liegt darunter/dahinter.
- Validierungen melden ausschließlich über dieses Banner, z. B. `src/renderer/src/app/einheit-actions/useEinheitSplitActions.ts:36-48`, `einheit-actions/useEinheitCreateActions.ts:61-68`, `useAbschnittActions.ts` (Namensprüfungen).
- Erfolgspfade schließen nur den Dialog, ohne Meldung: `useEinheitCreateActions.ts:112-114`, `useEinheitSplitActions.ts:67-70`, `useSystemActions.ts:118-122`.

**Beobachtetes Problem (Code):** Drückt der Nutzer im Split- oder Anlegen-Dialog auf Absenden und
eine Prüfung schlägt fehl, bleibt der Dialog offen und die Erklärung erscheint im Banner hinter dem
abgedunkelten Overlay. Gelingt die Aktion, passiert sichtbar nur, dass der Dialog verschwindet.
Meldungen aus einer vorherigen Aktion (z. B. "Datensatz wird gerade von PC-03 bearbeitet") werden
beim nächsten Klick gelöscht.

**Auswirkung im Einsatz:** Der Helfer tippt zwei-, dreimal auf "Splitten" bzw. "Anlegen", weil
nichts passiert; im Erfolgsfall ist unklar, ob der Vorgang gespeichert wurde, und die Kontrolle
kostet Zeit und Aufmerksamkeit. Mehrfachtippen erzeugt in Verbindung mit P0-2 nicht löschbare
Dubletten.

**Erwartung der Rolle:** Fehler stehen dort, wo gearbeitet wird – im Dialog, am betroffenen Feld.
Erfolg wird kurz quittiert ("Einheit X angelegt"), inklusive Hinweis, wie man es zurücknimmt.

**Empfehlung:** Meldungen im jeweiligen Formular/Dialog anzeigen und dort stehen lassen, bis der
Nutzer sie behoben oder geschlossen hat; kurze Erfolgsquittung mit Objektbezug; Fehlermeldungen
nicht automatisch beim nächsten Klick verwerfen.

**Verifikation:** Split mit ungültiger Stärke absenden – die Begründung muss im Dialog sichtbar
sein, ohne dass der Nutzer den Dialog schließen muss.

---

### P1-2 Stumme Knöpfe: "Einheit anlegen" / "Fahrzeug anlegen" reagieren in bestimmten Zuständen gar nicht

**Fundstellen**
- `src/renderer/src/app/einheit-actions/useEinheitCreateActions.ts:41-49` – ohne `selectedAbschnittId` wird der Aufruf kommentarlos verworfen (Button ist jedoch aktiv, vgl. `WorkspaceSections.tsx:167-170`).
- `src/renderer/src/app/useFahrzeugActions.ts:66-78` – ohne ausgewählten Abschnitt ebenfalls stiller Abbruch; ohne vorhandene Einheit immerhin eine Meldung.
- `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:64-72` – Bearbeiten bricht still ab, wenn die Sperre nicht erlangt wurde (die Ursache landet nur im Banner, vgl. P1-1).
- `e2e/steps/einsatz.steps.ts:60-70,110-116,178-186` – die Tests müssen aktiv darauf warten, dass Buttons nicht mehr `disabled` sind, und umgehen den `disabled`-Zustand teils per `dispatchEvent`. Das ist ein Indiz dafür, dass dieselbe Wartezeit auch den Nutzer trifft (Annahme, da nicht live gemessen).

**Beobachtetes Problem (Code):** Ein aktiver Knopf, der beim Drücken nichts tut und nichts sagt.

**Auswirkung im Einsatz:** Der Helfer hält die Anwendung für hängend, tippt mehrfach, wechselt die
Ansicht und verliert 20–30 Sekunden, während am Funk die nächste Meldung läuft.

**Empfehlung:** Knopf entweder deaktivieren **mit Begründung** im Tooltip/Hinweistext ("erst
Abschnitt wählen") oder die fehlende Voraussetzung beim Klick sofort und sichtbar benennen.

**Verifikation:** In jedem Zustand, in dem eine Aktion nicht ausführbar ist, muss die Oberfläche die
Ursache und den nächsten Schritt nennen.

---

### P1-3 Globales `busy` legt die gesamte Oberfläche still

**Fundstellen**
- `src/renderer/src/app/useAppCoreState.ts:24` und `useAppControllers.ts:26-38` – ein einziges globales `busy` für alle Schreibvorgänge.
- Auswirkungen über die ganze Oberfläche: `Topbar.tsx:47-54` (Stärke-Monitor), `StartView.tsx:40-48`, `WorkspaceSections.tsx:167-170,246-256,281`, `SettingsView.tsx:223-240`.

**Beobachtetes Problem (Code):** Während eines Schreibvorgangs sind auch völlig unbeteiligte
Bedienelemente gesperrt – inklusive Monitor öffnen/schließen und Ansichtswechsel-abhängiger
Aktionen. Auf einem trägen Fileshare (Zielumgebung laut `README.md`/`AGENTS.md`) dauert das spürbar.

**Auswirkung im Einsatz:** Zwei gleichzeitig eintreffende Meldungen können nicht parallel abgearbeitet
werden; der Nutzer wartet, ohne zu wissen worauf, weil es außer dem `disabled`-Zustand keine
Fortschrittsanzeige gibt (Ausnahme: der Ladeoverlay beim Öffnen, `AppWorkspaceShell.tsx:343-353`).

**Empfehlung:** Sperre auf den betroffenen Datensatz/Dialog begrenzen; bei längeren Vorgängen eine
sichtbare, benannte Fortschrittsanzeige ("Einheit wird gespeichert…").

**Verifikation:** Während eines Speichervorgangs müssen Lesen, Ansichtswechsel und Monitor weiter
bedienbar bleiben.

---

### P1-4 Unterbrechung führt zu verlorener Sperre und späterem Speicherfehler

**Fundstellen**
- `src/main/services/record-lock.ts:8` – `LOCK_TTL_MS = 45_000`.
- `src/renderer/src/app/useEditLocks.ts:50-77` – Heartbeat alle 8 s, nur solange der Renderer läuft.
- `src/main/services/record-lock.ts:140-152` – beim Speichern: `ensureRecordEditLockOwnership`, Fehlertext "Datensatz ist nicht zur Bearbeitung gesperrt. Bitte Datensatz erneut öffnen." bzw. "wird gerade von … bearbeitet".
- `src/main/ipc/register-entity-einheit-ipc.ts:61`, `register-entity-fahrzeug-ipc.ts:61`, `register-entity-helfer-ipc.ts:46,79`, `register-einsatz-ipc.ts:227` – der Schutz greift serverseitig.

**Beobachtetes Problem (Code):** Der Schutz vor Überschreiben ist korrekt, aber die Nutzerführung
danach fehlt. Nach Rechnerwechsel, Standby oder Absturz steht der Editor mit vollständig ausgefüllten
Feldern da, und erst der Klick auf "Speichern" bringt (über das Banner aus P1-1) die Absage. Die
eingegebenen Daten sind nirgends zwischengespeichert; ein Weg "erneut sperren und jetzt speichern"
existiert nicht.

**Auswirkung im Einsatz:** Ein kompletter Erfassungsbogen (Einheit, Kontakte, Helferzeilen) kann
nach einer Unterbrechung nicht gespeichert werden. Der Helfer muss alles erneut eintippen – genau
in dem Moment, in dem er ohnehin unter Druck steht.

**Empfehlung:** Ablaufende Sperre im Editor anzeigen, bevor sie verfällt; beim Verlust einen
klaren Weg anbieten ("Sperre erneut anfordern" / "Eingaben als Entwurf behalten"); Formularinhalte
lokal halten, bis der Nutzer sie bewusst verwirft.

**Verifikation:** Editor öffnen, Anwendung 60 s ohne Heartbeat lassen, danach speichern – der Nutzer
muss ohne Datenverlust weiterarbeiten können.

---

### P1-5 Zwei folgenschwere Einstellungsknöpfe ohne Warnung: "Verzeichnis speichern" schließt den Einsatz, "Backup laden" überschreibt ihn

**Fundstellen**
- `src/renderer/src/components/views/SettingsView.tsx:223-229` – beide Knöpfe direkt untereinander, ohne erklärenden Text.
- `src/renderer/src/app/useSystemActions.ts:37-43` – `saveDbPath` ruft `clearSelectedEinsatz()`, der geöffnete Einsatz wird also geschlossen.
- `e2e/steps/einsatz.steps.ts:305-319` – der E2E-Test benutzt genau diesen Knopf als "Einsatz schließen". Das bestätigt die Nebenwirkung.
- `src/main/ipc/register-einsatz-ipc.ts:368-386` und `register-einsatz-ipc-support.ts:57-67` – "Backup laden" öffnet einen Dateidialog und ersetzt anschließend die aktive Einsatzdatei; es gibt keine In-App-Rückfrage, nur einen Dateidialog mit dem Titel "Backup laden".

**Beobachtetes Problem (Code):** Ein Knopf mit dem Wort "speichern" führt zum Verlassen des
Einsatzes. Ein Knopf mit dem Wort "laden" ersetzt die gemeinsam genutzte Einsatzdatei und wirkt
damit auf **alle** Clients am Share.

**Auswirkung im Einsatz:** Der Helfer, der nur den Pfad kontrollieren wollte, steht plötzlich wieder
auf dem Startbildschirm und hält das für einen Absturz. Beim Backup wird im schlimmsten Fall der
Stand der letzten Minuten für die gesamte Führungsstelle verworfen.

**Empfehlung:** Benennung an die Wirkung anpassen ("Verzeichnis wechseln – aktueller Einsatz wird
geschlossen"); vor dem Backup-Einspielen eine Rückfrage in der App mit Klartext, welcher Stand
ersetzt wird und dass alle Clients betroffen sind; Backup-Wiederherstellung nach Möglichkeit auf
Rollen/Master beschränken.

**Verifikation:** Beide Knöpfe im geöffneten Einsatz betätigen – die Folge muss vorher im Klartext
dastehen und abbrechbar sein.

---

### P1-6 Helfer löschen ohne Rückfrage, direkt neben "Speichern"

**Fundstellen**
- `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:152-167` – "Speichern" und "Löschen" nebeneinander in derselben Zellenleiste.
- `src/renderer/src/app/einheit-actions/useEinheitHelferActions.ts:66-79` – Löschen wird sofort ausgeführt; kein Undo (vgl. P0-2).

**Beobachtetes Problem (Code):** In einer eng gesetzten Tabellenzeile liegt die zerstörende Aktion
unmittelbar neben der erhaltenden; es gibt weder Rückfrage noch Wiederherstellung.

**Auswirkung im Einsatz:** Beim schnellen Nachpflegen einer Helferzeile verschwindet ein Datensatz
mit Name, Funktion, Telefon und Erreichbarkeit endgültig – Angaben, die bei einer Personenanfrage
kurzfristig gebraucht werden.

**Empfehlung:** Abstand und optische Trennung; Rückfrage mit Nennung des Namens oder eine kurze
Rücknahmemöglichkeit direkt nach dem Löschen.

**Verifikation:** Löschen darf nie die Folge eines einzelnen ungeplanten Tippens sein.

---

## P2 – Mittel

### P2-1 Navigation nur als Einzelbuchstaben "E / G / K / F"

**Fundstellen:** `src/renderer/src/components/layout/WorkspaceRail.tsx:14-52` – Beschriftung
ausschließlich `E`, `G`, `K`, `F`, Bedeutung nur im `title`-Tooltip (Maus-Hover).

**Problem/Auswirkung:** "G" für Führungsstruktur ist nicht selbsterklärend; Tooltips helfen bei
Touch-Bedienung nicht und unter Zeitdruck ohnehin kaum. Der Helfer klickt sich durch die Ansichten,
um die gesuchte Funktion zu finden – jedes Mal aufs Neue.

**Empfehlung:** Symbol plus kurzes Wort ("Einsatz", "Führung", "Kräfte", "Fahrzeuge"), so wie beim
Einstellungs-Zahnrad bereits ein Symbol genutzt wird.

---

### P2-2 Diagnoseinhalte in der Arbeitsansicht

**Fundstellen**
- `src/renderer/src/components/views/EinsatzOverviewView.tsx:56-60` – "UDP Broadcast Monitor" mit Rohlog direkt unter den Einheiten-/Fahrzeugtabellen der Einsatzübersicht.
- `src/renderer/src/components/views/StartView.tsx:41-44` – "DevTools öffnen" prominent auf dem Startbildschirm.
- `src/renderer/src/components/views/SettingsView.tsx:257-258` – zwei weitere Debug-Logbereiche.

**Problem/Auswirkung:** Die zentrale Lageansicht endet in einem technischen Protokoll. Unter Stress
kostet das Scrollweg und Aufmerksamkeit, und ein versehentlich geöffnetes DevTools-Fenster wirkt wie
ein Fehler der Anwendung.

**Empfehlung:** Diagnose ausschließlich in den Einstellungen bzw. hinter einem bewussten
Diagnose-Schalter (die ENV-Flags aus `README.md` zeigen, dass ein solcher Modus schon gedacht ist).

---

### P2-3 Tastatur unbrauchbar: kein Absenden mit Enter, kein Autofokus, kein Schließen mit Escape

**Fundstellen:** In `src/renderer/src` existiert kein `<form>`, kein `autoFocus` und – außer im
Stärke-Monitor (`StrengthDisplayView.tsx:97-104`) – kein `Escape`-Handler. Dialoge schließen nur über
den "Abbrechen"-Knopf (z. B. `MoveDialog.tsx:37`, `SplitEinheitDialog.tsx:36-38`); ein Klick auf den
abgedunkelten Hintergrund (`app.css:811-817`) bewirkt nichts.

**Problem/Auswirkung:** Wer schnell tippt, erwartet Enter zum Bestätigen und Escape zum Abbrechen.
Stattdessen muss jedes Mal mit der Maus gezielt werden – bei Zeitdruck und auf einem Laptop-Touchpad
in der Führungsstelle unnötig langsam.

**Empfehlung:** Formulare mit Enter absendbar machen, erstes Feld fokussieren, Escape schließt den
Dialog (mit Rückfrage, falls Eingaben vorhanden sind).

---

### P2-4 Erfassungsformulare verlangen mehr Aufmerksamkeit, als im Einsatz vorhanden ist

**Fundstellen**
- `src/renderer/src/components/dialogs/EinheitFormFields.tsx:122-175` – Erfassungsbogen mit OV/RB/LV je Name/Telefon/Fax plus Bemerkung und Erreichbarkeiten.
- `src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:145-190` – im Bearbeiten-Editor zusätzlich Fahrzeug- und Helfer-Untertabellen im selben Formular.
- `src/renderer/src/app/einheit-actions/useEinheitCreateActions.ts:9-21` – Vorbelegung `0/1/8`; die Stärke wird in drei Einzelfeldern erfasst.

**Problem/Auswirkung:** Der Kernvorgang "Einheit meldet sich an" erfordert das Durchqueren eines
langen Formulars. Die Vorbelegung 0/1/8 ist plausibel für eine Bergungsgruppe, wird aber unter
Zeitdruck ungeprüft übernommen – eine falsche Stärke fällt niemandem auf, weil sie plausibel
aussieht, und lässt sich später nicht durch Undo korrigieren (P0-2).

**Empfehlung:** Zweistufig arbeiten: minimaler Schnellerfassungssatz (Name, Stärke, Abschnitt,
Status), Erfassungsbogen als eigener, später nachzupflegender Bereich. Vorbelegte Stärkewerte
sichtbar als Vorschlag kennzeichnen und beim Speichern bestätigen lassen (Annahme: 0/1/8 soll eine
Standardgruppe abbilden – das THW-fachliche Sollbild wurde nicht geprüft).

---

### P2-5 Zwei unterschiedliche Schreibweisen derselben Stärke

**Fundstellen:** `src/renderer/src/components/layout/Topbar.tsx:42` zeigt `F/U/M/Gesamt`
(`utils/tactical.ts:6-8`); `src/renderer/src/app/useSystemActions.ts:150,168` sendet an den
Stärke-Monitor `...replace(/\/(\d+)$/, '//$1')`, also `F/U/M//Gesamt` mit doppeltem Schrägstrich.

**Problem/Auswirkung:** Wandanzeige und Topbar sehen unterschiedlich aus. Wer die Zahl vom Monitor
abliest und ins Meldeformular überträgt, muss kurz überlegen, welche Zahl welche ist – genau die
Art Denkpause, die unter Stress zu Übertragungsfehlern führt. (Annahme: Der doppelte Schrägstrich
soll eine bestimmte Darstellungsform abbilden; eine Begründung ist im Code nicht dokumentiert.)

**Empfehlung:** Eine einheitliche, dokumentierte Schreibweise in Topbar, Monitor, Tabellen und
Export.

---

### P2-6 Statuswerte erscheinen als technische Bezeichner

**Fundstellen:** `src/renderer/src/components/dialogs/EinheitFormFields.tsx:112-119` und
`components/tables/EinheitRow.tsx:118` – Anzeige von `IN_BEREITSTELLUNG`, `AUSSER_BETRIEB`,
`ABGEMELDET` in Großbuchstaben mit Unterstrichen; ebenso `abschnitt.systemTyp` als `[FUEST]`,
`[ANFAHRT]` (`AbschnittSidebar.tsx:66-76`).

**Problem/Auswirkung:** Lesbarkeit und Verwechslungsgefahr beim schnellen Überfliegen einer langen
Tabelle; die Bedeutung von `FUEST` vs. `ANFAHRT` ist für die Stärkeberechnung erheblich (siehe
P0-4), wird aber nirgends erklärt.

**Empfehlung:** Klartextbezeichnungen, farb- **und** textcodierte Statusangabe, kurze Erklärung der
Abschnittstypen dort, wo sie gewählt werden.

---

### P2-7 Exportfunktion ist dokumentiert, aber aus der Oberfläche nicht erreichbar

**Fundstellen**
- `README.md` – Abschnitt "Export (MVP)": "Einsatzakte exportieren" erzeugt ZIP mit DB-Kopie, Report und CSV.
- `src/main/preload.ts:43` – `exportEinsatzakte` vorhanden; `src/main/ipc/register-einsatz-ipc.ts:388-406` – Handler vorhanden.
- `src/renderer/src/components/views/ExportView.tsx` – Ansicht existiert, wird aber **nirgends** eingebunden: `WorkspaceSections.tsx:321-328` kennt nur `einsatz`, `fuehrung`, `kraefte`, `fahrzeuge`, `einstellungen`; `WorkspaceRail.tsx` hat keinen Eintrag dafür.

**Problem/Auswirkung:** Am Einsatzende sucht der Helfer den Export, den die Doku verspricht, findet
ihn nicht und muss annehmen, die Software könne es nicht. Die Dokumentation der Einsatzakte
unterbleibt oder wird händisch nachgebaut.

**Empfehlung:** Export in der Rail/Topbar erreichbar machen oder in der Dokumentation klar als
"noch nicht verfügbar" kennzeichnen.

---

### P2-8 Kein Hinweis auf Aktualität und Herkunft der angezeigten Daten

**Fundstellen:** `src/renderer/src/app/useSyncEvents.ts:50-66` (Polling alle 6 s),
`useSyncEvents.ts:206-230` (Refresh auf Broadcast), `useEditLocks.ts:50-77` (Lock-Heartbeat).
In der Oberfläche gibt es keinen Zeitstempel "zuletzt aktualisiert", keinen Verbindungs-/Share-Status
und keinen Hinweis, wenn sich Daten gerade durch einen anderen Client geändert haben.

**Problem/Auswirkung:** Tabelleninhalte ändern sich unter der Hand, während der Nutzer liest. Er
kann nicht unterscheiden zwischen "es hat sich nichts geändert" und "der Abgleich klemmt".

**Empfehlung:** Dezenter Aktualitätsstempel und ein sichtbarer Hinweis, wenn eine Änderung von einem
anderen Client eingespielt wurde (mit Nennung des Clients, wie es bei den Sperren bereits geschieht).

---

## P3 – Niedrig

### P3-1 Zwei Monitor-Knöpfe ohne Zustandsanzeige

`src/renderer/src/components/layout/Topbar.tsx:47-54` – "Stärke-Monitor öffnen" und "Monitor
schließen" stehen dauerhaft nebeneinander, ohne zu zeigen, ob der Monitor gerade läuft. Ein Knopf
mit Zustand ("Monitor an/aus") wäre eindeutiger.

### P3-2 Icon-Aktionen sind klein für Feldbedienung

`src/renderer/src/styles/app.css:731-734` – `.table-icon-button` misst 34×34 px; die drei Aktionen
Verschieben/Bearbeiten/Splitten liegen in `EinheitRow.tsx:80-104` unmittelbar nebeneinander.
Annahme (nicht live geprüft): Auf einem Touch-Gerät oder mit kalten Fingern ist die
Verwechslungsgefahr zwischen den drei Symbolen hoch – besonders, weil "Verschieben" direkt neben
"Bearbeiten" liegt und irreversibel wirkt (P0-3).

### P3-3 Startbildschirm nennt Status, aber nicht den Speicherort

`src/renderer/src/components/views/StartView.tsx:66-76` – die Liste zeigt `Name (STATUS)`; der Pfad
steht nur im `title`-Tooltip. Bei gleichnamigen Übungs- und Echtlagen auf einem Share ist nicht auf
einen Blick erkennbar, welche Datei geöffnet wird.

### P3-4 Entwürfe der Untertabellen gehen beim Ansichtswechsel verloren

`src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:109-137` – Helfer- und
Fahrzeugentwürfe liegen in lokalem Komponentenstate. Wechselt der Nutzer währenddessen die Ansicht
über die Rail, wird der Editor ausgehängt; die Hauptfelder bleiben (Parent-State), die noch nicht
gespeicherten Helferzeilen nicht. Unter Unterbrechung ist das ein stiller Teilverlust.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen. Erfassen, Verschieben und Splitten sind durchführbar; das
  Korrigieren eigener Fehler ist es nicht.
- **Fremde Hilfe nötig:** ja – sobald ein Fehleintrag entstanden ist (kein Undo, kein Löschen in der
  Oberfläche) oder nach einer Unterbrechung eine Sperre verfallen ist.
- **Größtes Missverständnis:** Die groß angezeigte Gesamtstärke wirkt wie "Kräfte vor Ort", zählt
  aber abgemeldete Einheiten mit und lässt Anfahrt-Abschnitte still weg.
- **Größtes Einsatzrisiko:** Ein einzelner unbedachter Klick auf "Updaten" beendet die Anwendung
  mitten in der Lage, ohne Rückfrage, ohne sichtbaren Fortschritt und ohne Abbruchmöglichkeit.
- **Top-Priorität für die nächste Iteration:** Rücknahme und Rückmeldung zusammen angehen – Undo
  sichtbar in der Oberfläche (es existiert bereits im Backend), verbunden mit einer kurzen
  Erfolgsquittung nach jedem Schreibvorgang und Fehlermeldungen dort, wo gearbeitet wird.
