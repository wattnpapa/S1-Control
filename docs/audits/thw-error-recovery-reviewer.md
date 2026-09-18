# Audit: Fehler machen und wieder herauskommen (THW Error Recovery Reviewer)

Rolle: technisch-praktisch versierter THW-Helfer in der Führungsstelle, der unter Zeitdruck
Stärkemeldungen erfasst, dabei normale Bedienfehler macht und anschließend ohne Admin
weiterarbeiten will.

## Scope und Methodik

- Geprüftes Produkt: S1-Control (Electron-Desktop-App, offline-first, S1-Stärke-/Einsatzverwaltung).
- **Einschränkung: Dieser Audit ist rein code- und dokumentationsbasiert. Es lief keine Instanz,
  es lagen keine Screenshots vor.** Es wurde also nicht "geklickt", sondern die Bedienpfade wurden
  aus den Quellen rekonstruiert. Jede Aussage über sichtbares Verhalten ist aus dem Code belegt
  (Datei:Zeile). Wo eine Schlussfolgerung über das Laufzeitverhalten hinausgeht, steht ausdrücklich
  **Annahme**.
- Untersuchte Quellen:
  - `src/renderer/src/components/dialogs/` (modale Formulare), `src/renderer/src/components/editor/`
    (Inline-Editoren, Helfer-/Fahrzeug-Untertabellen), `src/renderer/src/components/tables/`
    (Zeilen-Aktionen), `src/renderer/src/components/views/` (Shell, Banner, Startbildschirm)
  - `src/renderer/src/app/` (Aktionen, Validierung, Sperren, Sync-/Polling-Logik)
  - `src/main/ipc/`, `src/main/services/` (Validierung, Record-Locks, Undo, Backup-Restore)
  - `test/`, `e2e/` (dokumentierte Fehlerpfade und Lücken)
- Provozierte Bedienfehler (gedanklich am Code durchgespielt): falsche Einheit/falscher Abschnitt
  gewählt, Pflichtfeld leer gelassen, Zahlendreher und unrealistische Stärken, Aktion doppelt
  ausgelöst, mitten in der Eingabe weggeklickt/Ansicht gewechselt, Reload bzw. App-Neustart mit
  halb gefülltem Formular, Auswahl nach dem Ausfüllen abhängiger Felder geändert, Fehlermeldung
  ignoriert und anderer Weg versucht.

## Kurzes Urteil aus Rollensicht

Was funktioniert: Der normale Weg ist kurz und verständlich. Pflichtfelder (Name, Abschnitt,
zugeordnete Einheit) werden vor dem Schreiben geprüft und mit deutschsprachigen Meldungen
abgefangen. Die Schreib-Buttons sind während laufender Operationen gesperrt, ein Datensatz wird
gegen gleichzeitige Bearbeitung durch andere Rechner gesperrt, und es gibt automatische Backups.
Eingaben in den Kopf-Formularen gehen beim Abbrechen nicht "an den Server" verloren.

Wo Reibung entsteht: Das Produkt ist gut darin, *ungültige* Eingaben abzuwehren, aber schlecht
darin, *falsche* Eingaben rückgängig zu machen. Es gibt praktisch keinen Löschweg und keinen
bedienbaren Undo-Knopf; ein Zahlendreher ist korrigierbar, eine versehentlich gesplittete oder
doppelt angelegte Einheit dagegen nicht. Dazu kommt, dass Fehlermeldungen nicht dort erscheinen,
wo der Fehler entstanden ist, und dass ein Hintergrund-Refresh halb eingetippte Unterzeilen
überschreiben kann.

Ohne fremde Hilfe erledigen? Die Erfassung ja. Das Aufräumen nach einem Fehlgriff nein — dafür
muss jemand an die Einsatzdatei.

---

## P0 – Einsatzkritisch

### P0-1 Falsch angelegte oder versehentlich gesplittete Einheiten lassen sich nicht mehr entfernen

**Fundstelle / Aufgabe**
- `src/shared/ipc.ts:195-216` – die gesamte Renderer-API kennt genau eine Löschoperation:
  `deleteEinheitHelfer`. Kein `deleteEinheit`, `deleteFahrzeug`, `deleteAbschnitt`.
- `src/renderer/src/components/tables/EinheitRow.tsx:78-96` – drei gleich große, reine
  Icon-Buttons direkt nebeneinander: Verschieben, Bearbeiten, Splitten.
- `src/renderer/src/app/einheit-actions/useEinheitSplitActions.ts:10-25` – "Splitten" öffnet den
  Dialog sofort, vorbelegt mit `mannschaft: '1'` und Name „<Einheit> - Teil 1".
- `src/main/services/einsatz-write/einheit.ts:142-200` – `splitEinheit` zieht die Stärke von der
  Quell-Einheit ab und legt eine neue Einheit an; es existiert keine Gegenoperation (kein Merge,
  kein Löschen).

**Beobachtung**
Ein Fehlgriff auf das dritte statt das mittlere Icon führt über einen Dialog, dessen Bestätigung
„Splitten" heißt, zu einer dauerhaft zusätzlichen Einheit in der Lage. Dieselbe Sackgasse entsteht,
wenn beim Anlegen die falsche Organisation oder der falsche Abschnitt gewählt wurde und der
Datensatz schlicht überflüssig ist. Der einzige verbleibende Weg ist, die Einheit auf
`ABGEMELDET` zu setzen (`EinheitFormRows.tsx:36-42`) — sie bleibt aber in allen Listen stehen.

**Erwartung der Rolle**
Was ich in zehn Sekunden anlegen kann, muss ich in zehn Sekunden wieder loswerden können —
mindestens solange es frisch ist und niemand darauf gemeldet hat.

**Auswirkung im Einsatz**
Geisterdatensätze in der Kräfteübersicht. Die angezeigte Gesamtstärke stimmt zwar rechnerisch
(die Quell-Einheit wurde reduziert), die Lage ist aber nicht mehr lesbar: „TZ Oldenburg" und
„TZ Oldenburg - Teil 1" mit 8 und 1 Helfer, obwohl es eine Einheit ist. Wer danach eine
Stärkemeldung abgibt, muss mündlich erklären, welcher Eintrag Müll ist. Aufräumen geht nur über
die Einsatzdatei, also über jemanden mit Dateizugriff.

**Empfehlung**
Für frisch angelegte bzw. gerade gesplittete Datensätze einen klar benannten Rückweg anbieten
(„Einheit entfernen", „Split zurücknehmen"), mindestens solange keine Bewegung/Meldung darauf
erfolgt ist. Zusätzlich die Zeilen-Aktion „Splitten" optisch und räumlich von „Bearbeiten" trennen
und mit Text statt nur Symbol versehen.

**Verifikation**
Szenario: Einheit anlegen → versehentlich splitten → ohne fremde Hilfe zurück zum Ausgangszustand,
inklusive korrekter Gesamtstärke. Als e2e-Szenario neben dem bestehenden Split-Szenario in
`e2e/features/einsatz-lifecycle.feature` führbar.

---

### P0-2 Undo ist vollständig implementiert, aber für den Nutzer nicht erreichbar

**Fundstelle / Aufgabe**
- `src/main/services/command.ts:119-160` – `undoLastCommand` setzt Verschiebungen von Einheiten und
  Fahrzeugen inklusive Bewegungsprotokoll zurück.
- `src/main/ipc/register-entity-command-ipc.ts:114`, `:139` – Kanäle `UNDO_LAST` und `HAS_UNDO`
  sind registriert.
- `src/main/preload.ts:41-42` – beides ist an den Renderer durchgereicht.
- Kein einziger Aufruf im Renderer (`grep undoLastCommand src/renderer` liefert nichts).
- `e2e/steps/einsatz.steps.ts:232-241` – der Testschritt umgeht die Oberfläche mit dem Kommentar
  `// Kein UI-Button für Undo vorhanden → IPC direkt aufrufen`.

**Beobachtung**
Die Funktion „letzte Aktion rückgängig" existiert, ist getestet, und ist in der Bedienoberfläche
nicht vorhanden.

**Erwartung der Rolle**
Nach einem falschen „Verschieben" erwarte ich ein Rückgängig — genau das, was die Software
intern bereits kann.

**Auswirkung im Einsatz**
Eine falsch in den Bereitstellungsraum verschobene Einheit muss von Hand zurückverschoben werden.
Das erzeugt zwei zusätzliche Einträge im Bewegungsprotokoll (`command.ts:92-100`), also eine
Bewegungshistorie, die eine Bewegung behauptet, die es nie gab. Beim späteren Nachvollziehen der
Lage (Einsatzakte, Nachbereitung) ist nicht mehr erkennbar, was Tippfehler und was echter
Marschbefehl war.

**Empfehlung**
Den vorhandenen Undo mit `hasUndoableCommand` als sichtbaren, dauerhaft erreichbaren Knopf
anbieten (z. B. in der Kopfzeile), mit Klartext, was rückgängig gemacht wird
(„Verschieben von OV Hannover rückgängig machen").

**Verifikation**
Das bestehende e2e-Szenario „Verschiebung rückgängig machen" so umschreiben, dass es den Knopf
klickt statt IPC aufzurufen.

---

### P0-3 Halb eingetippte Fahrzeugdaten im Einheiten-Editor werden alle 6 Sekunden überschrieben

**Fundstelle / Aufgabe**
- `src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:127-129` –
  `useEffect(() => setEditFahrzeuge(buildEditFahrzeuge(props.fahrzeuge, props.form.einheitId)),
  [props.fahrzeuge, props.form.einheitId])`: die Entwürfe der Fahrzeug-Unterzeilen werden bei jeder
  neuen `fahrzeuge`-Referenz aus den Serverdaten neu aufgebaut.
- `src/renderer/src/app/useSyncEvents.ts:56-63` – ein Intervall lädt den Einsatz alle 6000 ms neu.
- `src/renderer/src/app/useEinsatzData.ts:70-77` – jeder dieser Ladevorgänge ruft
  `props.setAllFahrzeuge(...)` mit einem **neu erzeugten Array** auf, auch wenn sich inhaltlich
  nichts geändert hat.
- `src/renderer/src/components/editor/shared/EinheitFahrzeugeSection.tsx:170` – die Eingabefelder
  der bestehenden Fahrzeugzeilen lesen genau aus diesem zurückgesetzten `editFahrzeuge`.

**Beobachtung**
Der Nutzer tippt in der Fahrzeug-Unterzeile einer Einheit einen Funkrufnamen oder ein Kennzeichen
ein. Spätestens 6 Sekunden später springt das Feld auf den gespeicherten Wert zurück, ohne
Meldung, ohne dass etwas angeklickt wurde. Dasselbe passiert bei jeder Remote-Änderung durch einen
anderen Client (`useSyncEvents.ts:191-213`).

**Erwartung der Rolle**
Was ich gerade tippe, bleibt stehen, bis ich speichere oder abbreche. Ein Hintergrund-Abgleich darf
mein Eingabefeld nicht anfassen.

**Auswirkung im Einsatz**
Unter Zeitdruck merkt man das Zurückspringen nicht zuverlässig. Man tippt „Oldenburg 18/13", wird
durch Funk unterbrochen, klickt danach auf „Speichern" — gespeichert wird der alte Wert. Das ist
stiller Datenverlust bei der Fahrzeugerfassung, und der Nutzer hält die Daten für erfasst.
Schlimmer: Er wird den Fehler erst beim Export der Einsatzakte bemerken.

**Empfehlung**
Laufende Eingaben haben Vorrang vor dem Hintergrund-Abgleich. Entwürfe nur dann aus Serverdaten
neu aufbauen, wenn der Nutzer den Editor öffnet oder wechselt — nicht bei jedem Refresh. Wenn ein
anderer Rechner denselben Datensatz wirklich geändert hat, das sichtbar melden statt still zu
überschreiben.

**Verifikation**
Editor einer Einheit öffnen, in eine Fahrzeugzeile tippen, 15 Sekunden warten, ohne zu klicken.
Der eingetippte Text muss unverändert dastehen.

---

### P0-4 „Backup laden" überschreibt den laufenden Einsatz ohne Warnung und ohne Rückweg

**Fundstelle / Aufgabe**
- `src/renderer/src/components/views/SettingsView.tsx:226-228` – Schaltfläche „Backup laden",
  ohne Zusatztext, in derselben Knopfreihe wie „Verzeichnis speichern" und „Auf Updates prüfen".
- `src/renderer/src/app/useSystemActions.ts:54-72` – ruft direkt `window.api.restoreBackup(...)`,
  keine Rückfrage.
- `src/main/ipc/register-einsatz-ipc.ts:368-386` und
  `src/main/ipc/register-einsatz-ipc-support.ts:59-67` – es erscheint nur ein
  Datei-Öffnen-Dialog mit dem Titel „Backup laden"; keine Warnung, dass der aktuelle Stand ersetzt
  wird.
- `src/main/services/backup.ts:59-62` – `restoreBackup` ist ein `fs.copyFileSync(backup → live)`.
  Der aktuelle Stand wird **nicht** vorher gesichert.

**Beobachtung**
Ein Klick, eine Dateiauswahl, und die laufende Einsatzdatei ist durch einen bis zu fünf Minuten
alten Stand ersetzt (`SettingsView.tsx:241-244`: Backups werden alle 5 Minuten geschrieben). Der
Vorgang wird anschließend an alle Clients gemeldet (`notifyEinsatzChanged(..., 'restore-backup')`).

**Erwartung der Rolle**
„Laden" klingt nach hinzufügen oder ansehen, nicht nach ersetzen. Vor einem Ersetzen erwarte ich
eine unmissverständliche Rückfrage mit Zeitstempel („Stand von 14:32 Uhr wiederherstellen? Alle
Eingaben seit 14:32 Uhr gehen verloren.") und eine Sicherung des aktuellen Standes.

**Auswirkung im Einsatz**
Alle Meldungen der letzten Minuten — auf mehreren Arbeitsplätzen gleichzeitig — sind weg. Niemand
weiß, was genau fehlt, weil es keinen „Stand vor der Wiederherstellung" mehr gibt. Das ist die
teuerste einzelne Fehlbedienung in der Anwendung, und sie ist einen Klick von den
Einstellungen entfernt.

**Empfehlung**
Rückfrage in der Anwendung mit Klartext-Folgen und dem Zeitstempel des gewählten Backups; vor dem
Überschreiben automatisch eine Sicherung des aktuellen Standes anlegen, damit der Schritt selbst
zurücknehmbar ist. Beschriftung schärfen, z. B. „Früheren Stand wiederherstellen (überschreibt
aktuelle Daten)".

**Verifikation**
Wiederherstellung auslösen und abbrechen: Daten unverändert. Wiederherstellung durchführen:
danach muss der vorherige Stand noch auswählbar sein.

---

## P1 – Hoch

### P1-1 Zahlendreher und leere Zahlenfelder werden ohne Warnung übernommen

**Fundstelle / Aufgabe**
- `src/renderer/src/app/einheit-actions/types.ts:77-84` – `Number(input.fuehrungRaw)` usw.;
  abgewiesen wird nur `NaN` und `< 0`.
- `src/renderer/src/components/editor/inline/EinheitFormRows.tsx:51-84` und
  `src/renderer/src/components/dialogs/EinheitFormFields.tsx:85-110` – `type="number" min={0}`,
  aber kein `max`, kein `step`, keine Bereinigung beim Verlassen des Feldes.
- `src/main/services/einsatz-write/tactical-strength.ts:44-58` – serverseitig wird nur die
  Konsistenz `F+U+M == Gesamt` geprüft, keine Plausibilität.

**Beobachtung**
Drei Fälle, alle werden stillschweigend akzeptiert:
1. Leeres Feld: `Number('')` ergibt `0`, nicht `NaN`. Wer die Mannschaft löscht und ohne neue Zahl
   speichert, bekommt kommentarlos eine Einheit der Stärke 0 statt einer Fehlermeldung.
2. Zahlendreher: `88` statt `8` liegt im erlaubten Bereich und wird gespeichert.
3. Kommazahlen: `2.5` besteht beide Prüfungen und landet als taktische Stärke „0/1/2.5/3.5".

Ein Browser-Zahlenfeld liefert bei Eingaben wie `8-` oder `8e` ebenfalls einen leeren Wert
(**Annahme** über das Browserverhalten in der Chromium-Renderer-Umgebung) und landet damit in
Fall 1.

**Erwartung der Rolle**
Bei einer Stärke, die zehnmal so groß ist wie normal, oder bei einer leeren Pflichtzahl, erwarte ich
eine Nachfrage — keinen stillen Übernahmevorgang.

**Auswirkung im Einsatz**
Die Gesamtstärke ist der zentrale Wert, der nach oben gemeldet und auf der Stärkeanzeige
(`openStrengthDisplay`) angezeigt wird. Eine 88 statt 8 verfälscht die Lagemeldung um 80 Personen;
eine unbeabsichtigte 0 lässt eine anwesende Gruppe verschwinden. Beides fällt erst auf, wenn
jemand die Summe nachrechnet.

**Empfehlung**
Plausibilitätswarnung (keine harte Sperre) bei auffällig hohen Werten, leere Zahlenfelder als
Fehler behandeln statt als 0, ganze Zahlen erzwingen. Zusätzlich die resultierende Gesamtstärke
direkt im Formular mitrechnen und anzeigen, damit der Dreher vor dem Speichern auffällt.

**Verifikation**
Stärkefeld leeren und speichern → Fehlermeldung statt 0. `88` eingeben → Warnhinweis mit
Bestätigungsmöglichkeit. Live-Summe im Formular sichtbar.

---

### P1-2 Fehlermeldungen erscheinen außerhalb des Dialogs, hinter dem Abdunkelungsschleier, und lassen sich nicht wegklicken

**Fundstelle / Aufgabe**
- `src/renderer/src/components/views/AppWorkspaceShell.tsx:308-315, 340` – das Fehlerbanner wird
  ganz oben in der Shell gerendert.
- `src/renderer/src/styles/app.css:811-817` – `.modal-backdrop { position: fixed; inset: 0;
  background: rgba(0,0,0,0.2); }` liegt im DOM nach dem Banner und damit darüber.
- `src/renderer/src/styles/app.css:276-278, 314-317` – das Banner hat keine eigene Ebene
  (`z-index`), kein Schließen-Element.
- Ausgelöst wird es u. a. aus `useEinheitCreateActions.ts:57-65` („Bitte Namen der Einheit
  eingeben.") und `useFahrzeugActions.ts:91-98` — also aus Formularen, die zu diesem Zeitpunkt als
  Modal über dem Banner liegen.
- `useAppControllers.ts:26-28` – zurückgesetzt wird der Fehler ausschließlich beim Start der
  nächsten erfolgreichen Schreiboperation.

**Beobachtung**
Wer im Dialog „Einheit anlegen" den Namen vergisst und auf „Anlegen" drückt, sieht im Dialog
nichts. Die Erklärung steht am oberen Bildschirmrand, abgedunkelt hinter dem Modal-Schleier, weit
weg vom Feld, das leer ist. Bricht man den Dialog danach ab, bleibt die Meldung dauerhaft stehen
— es gibt keinen Weg, sie zu schließen.

**Erwartung der Rolle**
Die Meldung steht am Formular, am besten am betroffenen Feld, und verschwindet, wenn ich das
Problem behoben oder den Vorgang abgebrochen habe.

**Auswirkung im Einsatz**
Der typische Ablauf ist: Knopf drücken, es passiert scheinbar nichts, nochmal drücken, wieder
nichts, Dialog schließen und von vorn anfangen — eine vermeidbare Minute pro Fehlversuch, in der
der Melder am Funk wartet. Danach steht eine veraltete rote Meldung im Bild, die bei der nächsten
Störung nicht mehr von einer aktuellen unterschieden werden kann.

**Empfehlung**
Validierungsmeldungen im Dialog bzw. am Feld anzeigen und das betroffene Feld markieren;
globales Banner nur für echte Systemfehler, dann mit Schließen-Möglichkeit und automatischer
Löschung beim Schließen des auslösenden Dialogs.

**Verifikation**
Dialog ohne Pflichtfeld absenden → Meldung im Dialog sichtbar, Feld hervorgehoben. Dialog
abbrechen → keine Restmeldung im Hauptfenster.

---

### P1-3 Kein Schutz vor dem Verlassen mit ungespeicherten Änderungen; die Bearbeitungssperre bleibt unsichtbar bestehen

**Fundstelle / Aufgabe**
- `src/renderer/src/components/layout/WorkspaceRail.tsx:16-51` – die Ansichtsknöpfe rufen nur
  `onSelect(view)`.
- `src/renderer/src/components/views/workspace/WorkspaceSections.tsx:157-186` (`EinsatzView`),
  `:212-265` (`KraefteView`), `:267-290` (`FahrzeugeView`) – die Einheiten-Editoren werden nur in
  den Ansichten „Einsatz" und „Kräfte" gerendert, der Fahrzeug-Editor nur in „Einsatz" und
  „Fahrzeuge"; in „Führungsstruktur" und „Einstellungen" erscheint gar kein Editor.
- `src/renderer/src/app/useWorkspaceLifecycle.ts:42-60` – die Sperre wird ausschließlich in
  `closeEditEinheitDialog` / `closeEditFahrzeugDialog` freigegeben, also nur beim Klick auf
  „Abbrechen" (und beim erfolgreichen Speichern).
- `src/renderer/src/app/useEditLocks.ts:44-76` – solange `ownedEditLocks` gefüllt ist, hält ein
  8-Sekunden-Herzschlag die Sperre am Leben.
- `src/renderer/src/components/dialogs/EditEinheitDialog.tsx:33-35` – „Abbrechen" verwirft ohne
  jede Rückfrage.

**Beobachtung**
Wer mitten in der Bearbeitung einer Einheit auf das Rail-Symbol „G" (Führungsstruktur) klickt,
sieht den Editor nicht mehr. Der Editor ist aber nicht geschlossen: `showEditEinheitDialog` bleibt
`true`, die Eingaben bleiben im Speicher, und die Bearbeitungssperre bleibt gehalten und wird
alle 8 Sekunden erneuert. Für den Nutzer wirkt es, als sei er fertig. Umgekehrt genügt ein
versehentlicher Klick auf „Abbrechen", und alle Eingaben sind ohne Rückfrage weg.

**Erwartung der Rolle**
Entweder nimmt die Software mich mit („Du hast ungespeicherte Änderungen") oder sie schließt
sauber ab. Ein unsichtbares, offenes Formular, das nebenbei einen Datensatz für die Kollegen
sperrt, ist beides nicht.

**Auswirkung im Einsatz**
Ein Kollege am zweiten Arbeitsplatz bekommt beim Versuch, dieselbe Einheit zu bearbeiten,
„Datensatz wird gerade von <Rechner> (<Nutzer>) bearbeitet" (`useEditLocks.ts:103`) — dauerhaft,
weil der erste Nutzer gar nicht weiß, dass er noch etwas offen hat. Die Sperre löst sich erst,
wenn die App geschlossen wird. In der Führungsstelle mit zwei bis drei Arbeitsplätzen blockiert
das reale Arbeit und führt zu Zurufen über den Tisch.

**Empfehlung**
Ansichtswechsel bei offenem Editor entweder verhindern (mit Hinweis) oder den Editor sauber
schließen und die Sperre freigeben. Zusätzlich sichtbar machen, welche Datensätze der eigene
Arbeitsplatz gerade sperrt, mit Möglichkeit zum Freigeben. „Abbrechen" mit Änderungen im Formular
sollte nachfragen.

**Verifikation**
Editor öffnen, etwas ändern, Ansicht wechseln: entweder Nachfrage oder Editor geschlossen und
Sperre am zweiten Arbeitsplatz aufgehoben.

---

### P1-4 Drei verschiedene „Speichern" mit unterschiedlicher Reichweite – Helfer- und Fahrzeugzeilen gehen verloren

**Fundstelle / Aufgabe**
- `src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:144-146` – „Speichern" in der
  Kopfzeile des Editors.
- `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:157-163` – jede Helferzeile
  hat ein eigenes „Speichern".
- `src/renderer/src/components/editor/shared/EinheitFahrzeugeSection.tsx:170-195` – jede
  Fahrzeugzeile ebenfalls, plus „Hinzufügen" für die Neuzeile.
- `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:118-152` – das obere „Speichern"
  schreibt ausschließlich die Kopfdaten der Einheit, gibt die Sperre frei, schließt den Editor
  (`setShowEditEinheitDialog(false)`) und leert die Helferliste. Die Zeilen-Entwürfe werden
  verworfen.

**Beobachtung**
Im selben Formular stehen mindestens drei gleich beschriftete Knöpfe mit völlig unterschiedlicher
Wirkung. Der oberste, prominenteste („Speichern") ist derjenige, der die Unterzeilen **nicht**
speichert — und der den Editor danach schließt.

**Erwartung der Rolle**
Ein Formular, ein Speichern. Wenn es Unterbereiche gibt, muss erkennbar sein, was der große Knopf
mitnimmt und was nicht.

**Auswirkung im Einsatz**
Der Nutzer trägt Name, Telefon und Funktion mehrerer Helfer ein, klickt oben auf „Speichern" — und
alle Helferangaben sind weg, ohne Meldung. Die Stärkezahl stimmt, die Personenliste ist leer. Das
fällt frühestens bei der Verpflegungsplanung oder beim Export auf, also Stunden später.

**Empfehlung**
Entweder das obere „Speichern" alle offenen Zeilenänderungen mitnehmen lassen, oder beim Schließen
auf nicht gespeicherte Zeilen hinweisen. Zeilen-Knöpfe eindeutig beschriften („Zeile übernehmen")
und den Kopf-Knopf entsprechend („Einheit speichern und schließen").

**Verifikation**
Helferzeile ändern, oben „Speichern" klicken, Einheit erneut öffnen: die Änderung muss da sein
oder es muss vorher gewarnt worden sein.

---

### P1-5 Helfer löschen ohne Rückfrage, direkt neben „Speichern"

**Fundstelle / Aufgabe**
- `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:157-164` – „Speichern" und
  „Löschen" stehen unmittelbar nebeneinander in derselben Aktionszelle.
- `src/renderer/src/app/einheit-actions/useEinheitHelferActions.ts:63-76` – ruft sofort
  `deleteEinheitHelfer`, keine Rückfrage.
- `src/main/services/einsatz-write/helfer.ts:100-112` – echtes Löschen per `splice`, kein
  Papierkorb, kein Undo-Eintrag (`command.ts:150` kennt nur die Move-Typen).
- Im gesamten Renderer existiert keine einzige Bestätigungsabfrage (`grep -r "confirm" src/renderer`
  liefert nichts).

**Beobachtung**
Ein Klick daneben löscht einen erfassten Helfer samt Telefonnummer, Funktion und Erreichbarkeit
endgültig.

**Erwartung der Rolle**
Löschen fragt nach. Oder es ist innerhalb weniger Sekunden zurücknehmbar.

**Auswirkung im Einsatz**
Kontaktdaten, die beim Anmelden der Einheit einmal mündlich durchgegeben wurden, müssen neu
erfragt werden — über Funk, mitten im Einsatz. Die taktische Stärke der Einheit bleibt dabei
unverändert stehen, sodass Kopfzahl und Personenliste auseinanderlaufen, ohne dass das irgendwo
auffällt.

**Empfehlung**
Rückfrage mit Namen der betroffenen Person, oder ein kurzzeitiges „Rückgängig" nach dem Löschen.
Löschen optisch klar von Speichern absetzen.

**Verifikation**
„Löschen" klicken → Rückfrage mit konkretem Namen; Abbrechen lässt den Datensatz unverändert.

---

### P1-6 Abgelaufene Bearbeitungssperre führt zu einer Sackgasse mit fertig ausgefülltem Formular

**Fundstelle / Aufgabe**
- `src/main/services/record-lock.ts:11` – `LOCK_TTL_MS = 45_000`.
- `src/main/services/record-lock.ts:140-152` – `ensureRecordEditLockOwnership` wirft
  „Datensatz ist nicht zur Bearbeitung gesperrt. Bitte Datensatz erneut öffnen."
- Erzwungen beim Speichern in `register-entity-einheit-ipc.ts:61`,
  `register-entity-fahrzeug-ipc.ts:61`, `register-entity-helfer-ipc.ts:46,79`,
  `register-einsatz-ipc.ts:227`.
- `src/renderer/src/app/useEditLocks.ts:44-76` – der Herzschlag läuft nur alle 8 Sekunden und
  **verschluckt jeden Fehler stillschweigend** (`catch { // ignore transient refresh errors }`).

**Beobachtung**
Fällt der Herzschlag aus — Netzlaufwerk kurz weg, Rechner im Energiesparmodus, Datei gesperrt —
läuft die Sperre nach 45 Sekunden ab, ohne dass der Nutzer etwas merkt. Er arbeitet im Formular
weiter. Beim Klick auf „Speichern" kommt die Meldung „Bitte Datensatz erneut öffnen". Erneut
öffnen bedeutet: das ausgefüllte Formular verwerfen und alles noch einmal tippen. Die Meldung
selbst erscheint zudem am oberen Bildschirmrand, siehe P1-2.

**Erwartung der Rolle**
Wenn die Software mir die Bearbeitung entzieht, sagt sie das, solange ich noch tippe — nicht erst,
wenn ich fertig bin. Und sie bietet mir an, es noch einmal zu versuchen, ohne meine Eingaben
wegzuwerfen.

**Auswirkung im Einsatz**
Eine komplette Erfassung einer neu eingetroffenen Einheit (Stärke, GrFü, OV, Telefonnummern,
Erreichbarkeiten) geht verloren. Genau das passiert typischerweise, wenn die Einsatzdatei auf
einem Netzlaufwerk oder einem Feld-WLAN liegt, also unter den Bedingungen, für die die App
gebaut ist.

**Empfehlung**
Verlust der Sperre sichtbar machen, solange der Editor offen ist, und beim Speichern eine
Wiederhol-Option anbieten, die die eingegebenen Werte behält („Sperre erneut holen und
speichern"). Fehler des Herzschlags nicht komplett verschlucken.

**Verifikation**
Sperre künstlich ablaufen lassen (z. B. Datei kurz unzugänglich machen), im Formular weitertippen,
speichern: die Eingaben müssen erhalten bleiben und der Vorgang wiederholbar sein.

---

### P1-7 Der Verschieben-Dialog verrät nicht, was von wo wohin verschoben wird

**Fundstelle / Aufgabe**
- `src/renderer/src/components/dialogs/MoveDialog.tsx:25-32` – Überschrift ist nur
  „Einheit verschieben" bzw. „Fahrzeug verschieben"; darunter ein unbeschriftetes Auswahlfeld mit
  Abschnittsnamen. Weder der Name der Einheit noch der Ausgangsabschnitt wird angezeigt.
- `src/renderer/src/app/app-view-props.ts:322-332` – das Ziel wird mit dem **aktuell
  ausgewählten** Abschnitt vorbelegt, also häufig mit dem Abschnitt, in dem die Einheit schon
  steht.
- `src/renderer/src/components/dialogs/MoveDialog.tsx:34-36` – „Bestätigen" ist nur bei leerem Ziel
  oder archiviertem Einsatz gesperrt, **nicht** während der laufenden Operation
  (`busy` wird hier nicht ausgewertet, anders als in allen anderen Dialogen).
- `src/renderer/src/app/useSystemActions.ts:100-120` – `moveDialog` und `moveTarget` werden erst
  **nach** dem Schreibvorgang geleert.

**Beobachtung**
Zwei Probleme in einem Dialog. Erstens: Wer die Zeilen-Symbole in einer langen Liste verwechselt
(siehe P0-1) oder zwischendurch unterbrochen wird, kann im Dialog nicht mehr erkennen, welche
Einheit er gerade in der Hand hat. Zweitens: Ein Doppeltipp auf „Bestätigen" löst die Verschiebung
zweimal aus, weil der Knopf währenddessen bedienbar bleibt und die Dialogdaten noch gesetzt sind.

**Erwartung der Rolle**
Der Dialog sagt mir: „OV Hannover — von FüSt 1 nach …". Und ein zweites Antippen darf nichts
zusätzlich auslösen.

**Auswirkung im Einsatz**
Eine falsche Einheit wird verschoben und die Fehlbedienung fällt erst später auf — ohne Undo-Knopf
(P0-2) ist die Korrektur eine zweite, fälschlich protokollierte Bewegung. Beim Doppeltipp entstehen
zwei Einträge im Bewegungsprotokoll und im `commandLog` (`command.ts:58-70`), sodass ein späteres
Rückgängig nur die Hälfte zurücknimmt.

**Empfehlung**
Name der Einheit/des Fahrzeugs und der aktuelle Abschnitt im Dialog anzeigen; Ziel nicht mit dem
Ist-Abschnitt vorbelegen bzw. das Bestätigen sperren, wenn Ziel gleich Quelle ist; Bestätigen
während der Ausführung sperren, wie in allen anderen Dialogen.

**Verifikation**
Verschieben-Dialog öffnen: Einheitsname und Ausgangsabschnitt sichtbar. Zweimal schnell auf
„Bestätigen" tippen: nur ein Eintrag im Bewegungsprotokoll.

---

## P2 – Mittel

### P2-1 Neuladen oder Neustart wirft den Nutzer zurück auf den Startbildschirm; Formularstände sind weg

**Fundstelle / Aufgabe**
- `src/renderer/src/app/useAppBootstrap.ts:36-53` – beim Start werden Session, Einstellungen und
  die Einsatzliste geladen; der zuletzt geöffnete Einsatz wird **nicht** wiederhergestellt.
- Im gesamten Renderer wird weder `localStorage`/`sessionStorage` noch ein `beforeunload`-Handler
  verwendet (Suche ohne Treffer).

**Beobachtung**
`Strg+R`, ein Absturz oder ein Update-Neustart beenden jede laufende Eingabe ersatzlos und
zeigen wieder den Startbildschirm mit „Bestehenden Einsatz öffnen / Neuen Einsatz anlegen".
Vorwarnung gibt es keine.

**Erwartung der Rolle**
Die Anwendung kommt dort wieder hoch, wo ich war, oder fragt mich wenigstens, bevor sie eine
halb fertige Eingabe verwirft.

**Auswirkung im Einsatz**
Nach einem Neustart ist zunächst unklar, ob die letzte Erfassung angekommen ist. Die Liste der
zuletzt verwendeten Einsätze (`StartView.tsx:64-76`) macht das Wiederöffnen zwar kurz, aber der
Nutzer muss aktiv prüfen, was gespeichert wurde — Zeit, die im Einsatz fehlt.

**Empfehlung**
Zuletzt geöffneten Einsatz beim Start wieder anbieten oder automatisch öffnen; Entwürfe offener
Formulare lokal zwischenspeichern und beim Wiederöffnen anbieten.

**Verifikation**
Formular halb ausfüllen, App neu starten: Einsatz wieder offen, Entwurf wird angeboten.

---

### P2-2 Nach einem Neustart blockiert die eigene alte Sperre bis zu 45 Sekunden – mit irreführender Meldung

**Fundstelle / Aufgabe**
- `src/main/services/clients.ts:37` – `private readonly clientId = crypto.randomUUID();`, also bei
  jedem Programmstart eine neue Kennung.
- `src/main/services/record-lock.ts:11, 84-92` – Sperren laufen erst nach 45 Sekunden ab und
  gehören der alten Kennung.
- `src/renderer/src/app/useEditLocks.ts:103` – Meldungstext: „Datensatz wird gerade von
  <Rechner> (<Nutzer>) bearbeitet."

**Beobachtung**
Stürzt die App mit offenem Editor ab oder wird sie neu gestartet, meldet die neu gestartete App
beim Öffnen desselben Datensatzes, er werde „gerade von" — dem eigenen Rechner und dem eigenen
Nutzernamen — bearbeitet. Nach spätestens 45 Sekunden löst sich das von selbst.

**Erwartung der Rolle**
Wenn mein eigener Rechner und mein eigener Name dastehen, will ich wissen, dass es meine eigene
alte Sitzung ist, und sie übernehmen dürfen.

**Auswirkung im Einsatz**
Der Nutzer hält die Meldung für einen Fehler oder für einen Kollegen, ruft ggf. herum, bevor er
merkt, dass Warten hilft. Unter Zeitdruck versucht er stattdessen einen anderen Weg (andere
Ansicht, anderer Datensatz) und verliert den Faden.

**Empfehlung**
Eigene verwaiste Sperren erkennen (gleicher Rechner + gleicher Nutzer) und übernehmbar machen, oder
die Meldung um einen Hinweis ergänzen („eigene frühere Sitzung, wird in … Sekunden frei").

**Verifikation**
App mit offenem Editor beenden, sofort neu starten, denselben Datensatz öffnen: verständliche
Meldung bzw. Übernahme.

---

### P2-3 „Fahrzeug anlegen" wählt automatisch die erste Einheit der Gesamtliste

**Fundstelle / Aufgabe**
- `src/renderer/src/app/useFahrzeugActions.ts:68-79` – `initialCreateFahrzeugForm(props.allKraefte[0]?.id ?? '')`.
- `src/renderer/src/components/dialogs/FahrzeugFormFields.tsx:53-72` – das Auswahlfeld zeigt
  „Name (Abschnitt)", die Vorbelegung ist aber nicht als solche gekennzeichnet.

**Beobachtung**
Der Dialog startet mit einer gültig aussehenden, aber willkürlichen Zuordnung: der ersten Einheit
der Gesamtliste — nicht der Einheit oder dem Abschnitt, aus dem heraus der Nutzer gekommen ist.
Da alle Pflichtfeldprüfungen erfüllt sind, kann durchgespeichert werden, ohne die Zuordnung je
angesehen zu haben.

**Erwartung der Rolle**
Entweder „Bitte wählen" ohne Vorbelegung, oder die Einheit, aus deren Zusammenhang ich den Dialog
geöffnet habe.

**Auswirkung im Einsatz**
Ein MTW landet bei einer fremden Einheit in einem anderen Abschnitt. Bei der Fahrzeugübersicht
oder der Marschordnung fehlt es dort, wo es stehen müsste, und taucht an einer Stelle auf, an der
niemand danach sucht.

**Empfehlung**
Keine stille Vorbelegung bei einer Auswahl mit Folgen; oder aus dem tatsächlichen Kontext
vorbelegen und die Vorbelegung sichtbar begründen.

**Verifikation**
In Abschnitt B ein Fahrzeug anlegen: die vorgeschlagene Einheit stammt aus Abschnitt B oder es
steht „Bitte wählen".

---

### P2-4 Vorbelegte Stärke 0/1/8 ohne sichtbare Gesamtsumme

**Fundstelle / Aufgabe**
- `src/renderer/src/app/einheit-actions/useEinheitCreateActions.ts:11-16` – `fuehrung: '0'`,
  `unterfuehrung: '1'`, `mannschaft: '8'`.
- `src/renderer/src/components/editor/inline/EinheitFormRows.tsx:51-84` – die drei Felder stehen
  ohne berechnete Summe nebeneinander.

**Beobachtung**
Wer nur den Namen eintippt und speichert, legt eine Einheit mit 9 Personen an, ohne diese Zahl je
gesehen zu haben. Die Gesamtsumme taucht erst nachträglich in der Tabelle auf.

**Erwartung der Rolle**
Wenn die Software für mich eine Stärke rät, will ich das Ergebnis sehen, bevor ich speichere.

**Auswirkung im Einsatz**
Neun nicht vorhandene Helfer in der Gesamtstärke. Weil die Zahl plausibel ist (Standard-Gruppe),
fällt der Fehler bei der Kontrolle nicht auf.

**Empfehlung**
Summe im Formular live anzeigen; Vorbelegung als Vorschlag kennzeichnen.

**Verifikation**
Formular öffnen: berechnete Gesamtstärke sichtbar und ändert sich mit den Eingaben.

---

### P2-5 Gleichnamige Einsätze sind in der Startliste nicht unterscheidbar

**Fundstelle / Aufgabe**
- `src/renderer/src/components/views/StartView.tsx:64-76` – die Knöpfe zeigen `Name (Status)`;
  der Dateipfad steckt nur im `title`-Tooltip.

**Beobachtung**
Bei „Übung" und „Übung" (z. B. Vorbereitung und Echtlage, oder zwei Übungstage) entscheidet der
Zufall, welche Datei geöffnet wird. Erkennbar wird es erst am Inhalt.

**Erwartung der Rolle**
Zuletzt geöffnet wann, welche Datei, welcher Ort — genug, um die richtige zu treffen.

**Auswirkung im Einsatz**
Erfassung in der falschen Einsatzdatei. Die Daten sind nicht verloren, stehen aber am falschen
Ort und müssen manuell übertragen werden — es gibt keine Verschiebefunktion zwischen Einsätzen.

**Empfehlung**
Zeitstempel der letzten Öffnung und Dateiname/Pfad direkt sichtbar machen.

**Verifikation**
Zwei gleichnamige Einsätze anlegen: in der Startliste unterscheidbar.

---

### P2-6 Verschieben und Splitten umgehen die Bearbeitungssperre

**Fundstelle / Aufgabe**
- `src/main/ipc/register-entity-command-ipc.ts:14-38` (Split), `:40-63` (Verschieben Einheit),
  `:65-88` (Verschieben Fahrzeug) – keiner dieser Handler ruft
  `ensureRecordEditLockOwnership`, anders als die Bearbeiten-Pfade
  (`register-entity-einheit-ipc.ts:61` u. a.).
- `src/renderer/src/app/einheit-actions/useEinheitSplitActions.ts:10-25` – der Split-Dialog holt
  keine Sperre.

**Beobachtung**
Während ein Arbeitsplatz eine Einheit bearbeitet, kann ein zweiter sie gleichzeitig verschieben
oder splitten. Die Zeilen-Symbole sind zwar bei fremder Sperre deaktiviert
(`EinheitRow.tsx:80-95`), das beruht aber auf einer bis zu 24 Sekunden alten Sperrliste
(`useEditLocks.ts:65-70`: Vollabgleich nur jeden dritten Herzschlag).

**Erwartung der Rolle**
Wenn die Software mir sagt, ein Datensatz sei in Bearbeitung, dann gilt das für alle Aktionen auf
diesem Datensatz.

**Auswirkung im Einsatz**
Der Bearbeiter speichert eine Stärke, die der Splitter kurz zuvor bereits reduziert hat — das
Ergebnis ist eine stille falsche Gesamtstärke ohne Konfliktmeldung. **Annahme:** je nach Reihenfolge
gewinnt der zuletzt schreibende Vorgang.

**Empfehlung**
Verschieben und Splitten denselben Sperrprüfungen unterwerfen wie das Bearbeiten.

**Verifikation**
Datensatz an Arbeitsplatz A öffnen, an B splitten: B muss abgewiesen werden.

---

### P2-7 Dialoge sind nicht mit der Tastatur bedienbar

**Fundstelle / Aufgabe**
- `src/renderer/src/components/dialogs/CreateEinheitDialog.tsx:25-40`,
  `EditEinheitDialog.tsx:22-37`, `CreateAbschnittDialog.tsx:24-71`, `MoveDialog.tsx:22-39`,
  `SplitEinheitDialog.tsx:22-38`, `EditEinsatzDialog.tsx:22-47` – kein `<form>`-Element, kein
  `onKeyDown`, kein Fokus auf dem ersten Feld, kein Schließen per Escape, kein Schließen per Klick
  auf den Hintergrund.

**Beobachtung**
Enter löst nichts aus, Escape schließt nicht. Jede Aktion erfordert einen gezielten Mausklick.

**Erwartung der Rolle**
Tippen, Tab, Enter — so erfasse ich Zahlenreihen schnell. Escape, wenn ich mich vertan habe.

**Auswirkung im Einsatz**
Bei der Erstaufnahme mehrerer Einheiten nacheinander kostet der Griff zur Maus je Datensatz
mehrere Sekunden, und der Blick muss vom Meldeblock auf den Bildschirm wechseln. Das erhöht die
Fehlerquote bei genau den Zahlen, um die es geht.

**Empfehlung**
Enter zum Absenden, Escape zum Abbrechen, Fokus beim Öffnen auf das erste Feld.

**Verifikation**
Dialog öffnen, ohne Maus vollständig ausfüllen und absenden.

---

## P3 – Niedrig

### P3-1 Technische Fehlermeldungen ohne Handlungsanweisung

**Fundstelle / Aufgabe**
- `src/main/services/errors.ts:14-26` – nur `AppError` erhält einen Code; alle anderen Fehler
  werden mit ihrem Rohtext weitergereicht.
- `src/main/ipc/register-ipc.ts:42-47` – der Rohtext wird in einen neuen `Error` verpackt und über
  IPC geworfen.
- `src/renderer/src/utils/error.ts:4-8` – der Renderer zeigt `err.message` unverändert an.

**Beobachtung**
Dateisystemfehler (Netzlaufwerk weg, Datei gesperrt) landen als technischer Originaltext im
Fehlerbanner. **Annahme:** Electron stellt Fehlern aus `ipcRenderer.invoke` zusätzlich einen
Präfix der Form „Error invoking remote method '…'" voran, sodass der Nutzer auch den internen
Kanalnamen sieht.

**Erwartung der Rolle**
Was ist passiert, und was soll ich jetzt tun — in einem Satz.

**Auswirkung im Einsatz**
Der Nutzer kann nicht entscheiden, ob er es erneut versuchen, warten oder Hilfe holen soll, und
kann die Meldung auch nicht sinnvoll weitergeben.

**Empfehlung**
Häufige technische Ursachen (Datei nicht erreichbar, Datei gesperrt, kein Schreibrecht) in
Klartext mit Handlungsanweisung übersetzen; den technischen Text nur als Detail anbieten.

**Verifikation**
Einsatzdatei während des Speicherns unzugänglich machen: verständliche Meldung mit klarer nächster
Handlung.

---

### P3-2 Pflichtfelder sind nicht als solche gekennzeichnet

**Fundstelle / Aufgabe**
- `src/renderer/src/components/dialogs/EinheitFormFields.tsx:60-113` und
  `FahrzeugFormFields.tsx:29-72` – „Name im Einsatz", „Abschnitt" bzw. „Fahrzeugname",
  „Zugeordnete Einheit" sind Pflicht (geprüft in `useEinheitCreateActions.ts:57-65`,
  `useFahrzeugActions.ts:91-98`), tragen aber keine Kennzeichnung. Optionale Felder sind dagegen
  unter „Erfassungsbogen (optional)" gruppiert.

**Beobachtung**
Was zwingend ist, erfährt der Nutzer erst nach dem fehlgeschlagenen Absenden — und dann in einem
Banner außerhalb des Dialogs (P1-2).

**Erwartung der Rolle**
Vor dem Absenden sehen, was ausgefüllt werden muss.

**Auswirkung im Einsatz**
Ein vermeidbarer Fehlversuch je Neuerfassung.

**Empfehlung**
Pflichtfelder markieren und den Absende-Knopf erst freigeben oder das fehlende Feld direkt
hervorheben.

**Verifikation**
Dialog öffnen: Pflichtfelder auf einen Blick erkennbar.

---

### P3-3 Abbruch im Datei-Dialog bleibt ohne jede Rückmeldung

**Fundstelle / Aufgabe**
- `src/renderer/src/app/useStartActions.ts:27-33` (`openExisting`) und `:55-66` (`create`) – bei
  `null` wird kommentarlos zurückgekehrt.
- `src/main/ipc/register-einsatz-ipc.ts:373-378` – auch der Backup-Restore endet bei Abbruch still.

**Beobachtung**
Nach einem versehentlichen „Abbrechen" im Betriebssystem-Dialog passiert sichtbar gar nichts. Ob
der Knopf nicht reagiert hat oder der Vorgang abgebrochen wurde, ist nicht unterscheidbar.

**Erwartung der Rolle**
Eine kurze Rückmeldung „Vorgang abgebrochen".

**Auswirkung im Einsatz**
Mehrfaches Klicken auf denselben Knopf, kurze Verunsicherung. Geringes Risiko, aber unnötig.

**Empfehlung**
Kurzen, selbst verschwindenden Hinweis anzeigen.

**Verifikation**
Datei-Dialog abbrechen: sichtbare Rückmeldung.

---

### P3-4 Fehlerbanner wird Hilfstechnik nicht angekündigt

**Fundstelle / Aufgabe**
- `src/renderer/src/components/views/AppWorkspaceShell.tsx:310-313` – `<div class="error-banner">`
  ohne `role="alert"` bzw. `aria-live`.

**Beobachtung**
Ein neu erscheinender Fehler wird nicht angekündigt; er muss visuell bemerkt werden.

**Erwartung der Rolle**
Wichtige Meldungen drängen sich auf, statt am Rand zu warten.

**Auswirkung im Einsatz**
Gering, verstärkt aber P1-2: die Meldung wird noch leichter übersehen.

**Empfehlung**
Fehlerbanner als Live-Region auszeichnen.

**Verifikation**
Fehler auslösen: Meldung wird angekündigt.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen. Erfassen und Korrigieren von Zahlen funktioniert; das
  Aufräumen nach einem Fehlgriff nicht.
- **Fremde Hilfe nötig:** ja. Sobald ein Datensatz falsch angelegt oder versehentlich gesplittet
  wurde, führt kein Weg in der Oberfläche zurück (P0-1, P0-2); dasselbe gilt nach einem
  versehentlichen „Backup laden" (P0-4).
- **Größtes Missverständnis:** Das große „Speichern" oben im Einheiten-Editor speichert genau das
  nicht, was man gerade in den Helfer- und Fahrzeugzeilen eingetragen hat, und schließt danach das
  Formular (P1-4).
- **Größtes Einsatzrisiko:** Stille Falschwerte in der Gesamtstärke — durch überschriebene
  Eingaben beim Hintergrund-Abgleich (P0-3), akzeptierte Zahlendreher und leere Zahlenfelder
  (P1-1) und nicht entfernbare Geisterdatensätze (P0-1). Die gemeldete Stärke sieht dabei
  jederzeit plausibel aus.
- **Top-Priorität für die nächste Iteration:** Den bereits vorhandenen Undo sichtbar machen und um
  einen Rückweg für „Einheit entfernen" bzw. „Split zurücknehmen" ergänzen. Das entschärft mit
  einem Schritt die meisten Sackgassen dieses Audits.
