# Audit: Riskante und folgenschwere Bedienhandlungen (THW Destructive Action Reviewer)

Rolle: praktisch-technisch versierter THW-Helfer an einer S1-Stelle, der unter Zeitdruck Stärken pflegt,
Einheiten verschiebt, splittet und Helferlisten korrigiert. Bewertet wird die Bedienung, nicht die Codequalität.

## Scope und Methodik

- **Einschränkung: rein code- und dokumentationsbasiert.** Es lief keine Instanz, es lagen keine Screenshots vor.
  Alle Aussagen zum sichtbaren Verhalten sind aus dem Quellcode abgeleitet (Renderer-Komponenten, Aktions-Hooks,
  IPC-Handler, Schreib-Services). Wo ein Verhalten nur mittelbar erschlossen ist, steht ausdrücklich **Annahme**.
- Geprüfte Bereiche: `src/renderer/src/components/dialogs`, `src/renderer/src/components/tables`,
  `src/renderer/src/components/editor`, `src/renderer/src/app` (inkl. `useEinheitActions`, `useFahrzeugActions`,
  `useAbschnittActions`, `useSystemActions`, `useEditLocks`, `useSyncEvents`), `src/main/ipc`,
  `src/main/services` (inkl. `command`, `backup`, `einsatz-write/*`, `record-lock`), `src/shared/ipc.ts`.
- Leitfragen: Was verändert oder entfernt Daten für andere Helfer? Ist die Folge vor dem Auslösen erkennbar?
  Gibt es Bestätigung, Undo, Historie? Sind gefährliche Schaltflächen von harmlosen getrennt?
- Nicht geprüft (nicht prüfbar ohne laufende App): tatsächliche Dialoggrößen, Touch-Ziele in Pixeln am Gerät,
  Fokus- und Tastaturverhalten, tatsächliche Fehlermeldungstexte zur Laufzeit.

## Kurzes Urteil aus Rollensicht

Die Anwendung ist im Kern sauber gebaut: Bearbeiten von Einheit, Fahrzeug und Abschnitt ist über
Datensatzsperren gegen paralleles Bearbeiten abgesichert, archivierte Einsätze sind schreibgeschützt, und
alle Formulare validieren Stärken plausibel. Reibung entsteht überall dort, wo eine Handlung **mehr** tut,
als der Text auf der Schaltfläche verspricht: Verschieben, Splitten, Umhängen, Backup laden. Für keine
dieser Handlungen gibt es in der Oberfläche eine Rückfrage, eine Vorschau der Folge oder eine
Rückgängig-Funktion — im gesamten Renderer existiert **keine einzige Bestätigungsabfrage** (Suche nach
`confirm` liefert nur den Knopf „Bestätigen" im Verschieben-Dialog). Eine Fehlbedienung ist damit im
laufenden Einsatz praktisch nicht mehr korrigierbar, außer durch manuelles Nachpflegen.

---

## P0 – Einsatzkritisch

### P0-1 „Backup laden" überschreibt den laufenden Einsatz ohne Rückfrage

- **Fundstelle:** `src/renderer/src/components/views/SettingsView.tsx:226`;
  `src/renderer/src/app/useSystemActions.ts:54-73`;
  `src/main/ipc/register-einsatz-ipc.ts:366-385`;
  `src/main/services/backup.ts:59-62`
- **Beobachtung:** In den Einstellungen steht die Schaltfläche „Backup laden" direkt zwischen
  „Verzeichnis speichern" und „Auf Updates prüfen", optisch identisch. Ein Klick öffnet sofort einen
  Dateiauswahldialog mit dem Titel „Backup laden". Nach der Auswahl wird die aktive Einsatzdatei per
  `fs.copyFileSync(backupFilePath, dbPath)` (`backup.ts:61`) überschrieben. Es gibt keine Rückfrage, keine
  Anzeige, welcher Stand ersetzt wird, und keine Sicherungskopie des aktuellen Standes vor dem Überschreiben.
- **Erwartung der Rolle:** Vor dem Zurücksetzen eines Einsatzes auf einen alten Stand erwarte ich eine klare
  Warnung mit Zeitstempel („Alle Eingaben seit 14:35 gehen verloren") und die Zusicherung, dass der Ist-Stand
  vorher weggesichert wird.
- **Auswirkung im Einsatz:** Bis zu fünf Minuten Lageführung (Backup-Intervall, `backup.ts:5`) sind für alle
  Stationen verloren — Stärkemeldungen, Zugänge, Verschiebungen. Der Verlust fällt oft erst auf, wenn eine
  Einheit gesucht wird. Rückholen ist nicht möglich, weil der überschriebene Stand nirgends liegt.
- **Empfehlung:** Zweistufige, benannte Bestätigung („Einsatz auf Stand 14:35 zurücksetzen? Alle Eingaben
  seit 14:35 gehen verloren."), vor dem Überschreiben automatisch eine Sicherung des Ist-Standes anlegen,
  Schaltfläche optisch als gefährlich kennzeichnen und räumlich von Routineeinstellungen trennen.
- **Verifikation:** Backup laden auslösen, im Backup-Ordner muss anschließend ein zusätzlicher Stand mit
  dem Zeitpunkt des Zurücksetzens liegen; die Warnung muss die konkrete Uhrzeit des Zielstandes nennen.

### P0-2 Verschobene Einheiten lassen ihre Fahrzeuge im alten Abschnitt zurück

- **Fundstelle:** `src/main/services/command.ts:24-69` (nur `einheit.aktuellerAbschnittId` wird gesetzt);
  `src/main/services/einsatz-read-service.ts:104-108` (Fahrzeuge werden über ihr eigenes
  `aktuellerAbschnittId` dem Abschnitt zugeordnet)
- **Beobachtung:** `moveEinheit` ändert ausschließlich den Abschnitt der Einheit. Die Fahrzeuge, die über
  `aktuelleEinsatzEinheitId` an dieser Einheit hängen, behalten ihr altes `aktuellerAbschnittId`. Die
  Abschnittsansicht filtert Fahrzeuge aber genau über dieses Feld.
- **Erwartung der Rolle:** Wenn ich einen Zug in den Einsatzabschnitt Nord verschiebe, sind seine Fahrzeuge
  ebenfalls in Nord — oder die Software fragt mich, was mit den Fahrzeugen passieren soll.
- **Auswirkung im Einsatz:** Das Lagebild ist nach dem ersten Verschieben falsch. Fahrzeuge erscheinen in
  einem Abschnitt, in dem die zugehörige Mannschaft nicht mehr ist. Wer nach verfügbarem Gerät in einem
  Abschnitt sucht, disponiert Fahrzeuge, die dort nicht stehen.
- **Empfehlung:** Verschieben der Einheit muss die zugeordneten Fahrzeuge mitnehmen; wenn Fahrzeuge bewusst
  zurückbleiben können, muss der Verschieben-Dialog sie einzeln auflisten und abwählbar machen.
- **Verifikation:** Einheit mit zwei Fahrzeugen verschieben; beide Fahrzeuge müssen in der Zielabschnitts-
  Tabelle auftauchen und im Bewegungsprotokoll des Exports stehen.

### P0-3 Kein Rückgängig in der Oberfläche, obwohl der Kern es könnte

- **Fundstelle:** `src/main/services/command.ts:119-165`; `src/shared/ipc.ts` (`undoLastCommand`,
  `hasUndoableCommand`); im gesamten Renderer kein Aufruf (Suche nach `undo` in
  `src/renderer/src` ohne Treffer)
- **Beobachtung:** Der Hauptprozess bietet `undoLastCommand`/`hasUndoableCommand` an, und `README.md:140`
  beschreibt Undo für `MOVE_EINHEIT`/`MOVE_FAHRZEUG`. Die Oberfläche ruft beides nirgends auf. Zusätzlich
  gilt: Nur Verschiebungen werden überhaupt protokolliert (`commandLog.push` existiert nur in
  `command.ts:60` und `command.ts:108`); Anlegen, Bearbeiten, Splitten, Helfer löschen und Backup laden sind
  nicht rückholbar. `undoLastCommand` nimmt außerdem den letzten nicht zurückgenommenen Befehl im gesamten
  Einsatz — unabhängig davon, wer ihn wann ausgelöst hat.
- **Erwartung der Rolle:** Nach einem Fehlgriff erwarte ich ein sichtbares „Letzte Aktion rückgängig" mit
  Angabe, was genau rückgängig gemacht wird.
- **Auswirkung im Einsatz:** Jede Fehlbedienung muss von Hand rückgebaut werden — unter Zeitdruck genau das,
  wofür keine Zeit ist. Bei falsch gesplitteten oder gelöschten Datensätzen ist der Rückbau teilweise
  gar nicht mehr möglich (siehe P1-2, P1-1).
- **Empfehlung:** Undo sichtbar machen und mit Klartext versehen („Verschieben von 1. Bergungsgruppe von
  Bereitstellungsraum nach EA Nord rückgängig machen"), es strikt auf die eigene letzte Aktion begrenzen und
  weitere Aktionstypen ins Protokoll aufnehmen.
- **Verifikation:** Nach einer Verschiebung erscheint der Undo-Knopf mit konkretem Text; nach einer
  Verschiebung durch eine andere Station darf er die fremde Aktion nicht anbieten.

### P0-4 Verschieben ändert unbemerkt die angezeigte Gesamtstärke

- **Fundstelle:** `src/renderer/src/app/useEinsatzData.ts:239-259` (Abschnitte vom Typ `ANFAHRT` werden aus
  der Summe ausgeschlossen); `src/renderer/src/app/useSystemActions.ts:166-170` (Gesamtstärke wird in die
  Stärkeanzeige gespiegelt); `src/renderer/src/components/dialogs/MoveDialog.tsx:22-41`
- **Beobachtung:** Der Verschieben-Dialog zeigt nur eine Auswahlliste mit Abschnittsnamen. Ob ein Ziel vom
  Typ `ANFAHRT` ist, ist dort nicht erkennbar. Wird eine Einheit dorthin verschoben, verschwindet ihre Stärke
  aus der Gesamtstärke in der Topbar und in der separaten Stärkeanzeige — ohne Hinweis.
- **Erwartung der Rolle:** Wenn eine Handlung die gemeldete Gesamtstärke verändert, muss das vor dem
  Auslösen sichtbar sein.
- **Auswirkung im Einsatz:** Die nach außen gemeldete bzw. auf dem Stärkedisplay angezeigte Zahl springt,
  ohne dass jemand eine Stärke geändert hat. Fehlmeldungen an die übergeordnete Führung sind die Folge; die
  Ursache ist im Nachhinein kaum zu finden.
- **Empfehlung:** Im Verschieben-Dialog Zielabschnitte mit ihrem Typ kennzeichnen und die Folge für die
  Gesamtstärke vorab anzeigen („Stärke 0/2/9/11 zählt danach nicht mehr zur Gesamtstärke").
- **Verifikation:** Verschieben in einen Anfahrt-Abschnitt; Dialog nennt die Konsequenz, Topbar-Wert ändert
  sich erst nach Bestätigung und ist erklärt.

### P0-5 Öffnen einer nicht lesbaren Einsatzdatei überschreibt sie mit einem leeren Einsatz

- **Fundstelle:** `src/main/db/connection.ts:24-35`
- **Beobachtung:** Beim Öffnen wird die Datei gelesen; schlägt das Parsen fehl (Kommentar im Code nennt
  ausdrücklich „old SQLite file"), wird ohne Rückfrage ein leeres Gerüst erzeugt und mit
  `writeEinsatzFile(dbPath, einsatz)` über die vorhandene Datei geschrieben. Der Dateiauswahldialog bietet
  „Legacy SQLite" ausdrücklich als Filter an (`src/main/ipc/register-einsatz-ipc-support.ts:10-13`).
- **Erwartung der Rolle:** Eine Datei, die die Software nicht lesen kann, wird nicht angefasst, sondern mit
  einer verständlichen Meldung abgelehnt.
- **Auswirkung im Einsatz:** Wer eine ältere oder beschädigte Einsatzdatei öffnet — genau das, was man nach
  einem Absturz zuerst versucht — vernichtet sie endgültig. Es gibt keine Kopie der Originaldatei.
- **Empfehlung:** Bei nicht lesbarem Inhalt abbrechen und melden, niemals schreiben; falls eine Migration
  gewollt ist, vorher eine unveränderte Kopie der Originaldatei anlegen und den Nutzer bestätigen lassen.
- **Verifikation:** Eine beliebige Nicht-JSON-Datei mit Endung `.s1control` öffnen — Datei muss byteweise
  unverändert bleiben, es erscheint eine Fehlermeldung.

### P0-6 Jeder Speichervorgang überschreibt die komplette Einsatzdatei mit dem eigenen Stand

- **Fundstelle:** `src/main/db/connection.ts:52-58` (`save()` schreibt den kompletten In-Memory-Stand);
  `src/main/services/einsatz-read-cache.ts:18-49` und
  `src/main/ipc/register-einsatz-ipc.ts:278-300` (Lesen bedient sich ausschließlich am In-Memory-Stand);
  `src/main/ipc/register-einsatz-helpers.ts:142-148` (Änderungssignal invalidiert nur den Lese-Cache);
  `README.md:25` („Mehrere Clients können dieselbe Einsatzdatei auf einem Share nutzen")
- **Beobachtung:** Der Hauptprozess lädt die Einsatzdatei beim Öffnen einmal in den Speicher
  (`openDatabaseWithRetry`) und schreibt bei jeder Änderung das gesamte Objekt zurück. Ein Abgleich mit dem
  Stand auf der Platte findet nicht statt: `writeSeq` wird nur hochgezählt, nie geprüft; die vorhandene
  Hilfsfunktion `getFileMtime` (`src/main/json-store/einsatz-store.ts:38`) und der
  Lese-Ändern-Schreiben-Pfad `mutateEinsatzFile` (ebd. Zeile 25) werden nirgends verwendet
  (repoweite Suche ohne weitere Treffer). Eingehende Änderungssignale anderer Stationen lösen im
  Hauptprozess kein erneutes Einlesen der Datei aus.
- **Annahme:** Dass es keinen weiteren Nachlade-Pfad gibt, ist aus der Code-Suche erschlossen; ein Test mit
  zwei echten Stationen auf einem Share steht aus und sollte das zuerst bestätigen.
- **Erwartung der Rolle:** Wenn zwei Stellen am selben Einsatz arbeiten, sehe ich die Eingaben der anderen
  und meine eigenen gehen nicht verloren.
- **Auswirkung im Einsatz:** Zwei parallel arbeitende S1-Plätze löschen sich gegenseitig die Arbeit: Wer
  zuletzt speichert, setzt den gesamten Einsatz auf seinen eigenen, veralteten Stand zurück — inklusive der
  eben gelöschten Helfer, verschobenen Einheiten und geänderten Stärken der anderen Station. Auch eine
  gerade eingespielte Backup-Wiederherstellung (P0-1) wird durch den nächsten Speichervorgang einer anderen
  Station wieder aufgehoben.
- **Empfehlung:** Vor jedem Schreiben den Stand auf der Platte prüfen und nur die eigene Änderung darauf
  anwenden; bei abweichendem Stand nicht stillschweigend überschreiben, sondern den Nutzer informieren.
  Zusätzlich beim Änderungssignal einer anderen Station den Stand neu einlesen.
- **Verifikation:** Zwei Stationen öffnen denselben Einsatz; Station A löscht einen Helfer, Station B ändert
  danach eine Stärke — nach beiden Vorgängen müssen beide Änderungen erhalten sein.

---

## P1 – Hoch

### P1-1 Helfer löschen: keine Rückfrage, kein Undo, Knopf direkt neben „Speichern"

- **Fundstelle:** `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:150-167`;
  `src/renderer/src/app/einheit-actions/useEinheitHelferActions.ts:64-75`;
  `src/main/services/einsatz-write/helfer.ts:100-112`;
  `src/renderer/src/styles/app.css:886-893`
- **Beobachtung:** In jeder Helferzeile stehen „Speichern" und „Löschen" unmittelbar nebeneinander
  (`margin-right: 6px`, `padding: 4px 8px`), gleiche Farbe, gleiche Größe. „Löschen" entfernt den Datensatz
  sofort und endgültig (`splice`), ohne Rückfrage und ohne Protokolleintrag.
- **Erwartung der Rolle:** Löschen sieht anders aus als Speichern, liegt nicht direkt daneben und fragt
  mindestens einmal nach — mit Nennung des betroffenen Namens.
- **Auswirkung im Einsatz:** Beim schnellen Nachpflegen einer Helferliste wird statt „Speichern" „Löschen"
  getroffen. Der Datensatz mit Name, Funktion und Erreichbarkeit ist weg und muss aus dem Gedächtnis oder
  vom Papier neu erfasst werden. Betroffen ist ein gemeinsam genutzter Einsatzdatensatz.
- **Empfehlung:** Löschen farblich und räumlich absetzen, Rückfrage mit konkretem Namen („Helfer Müller,
  Truppführer, wirklich entfernen?"), alternativ kurzzeitiges Zurücknehmen nach dem Löschen anbieten.
- **Verifikation:** Löschen auslösen; Rückfrage nennt den Namen, Abbrechen lässt die Zeile unverändert.

### P1-2 Splitten ist endgültig, ohne Vorschau und ohne Mitnahme der Helferzeilen

- **Fundstelle:** `src/renderer/src/components/dialogs/SplitEinheitDialog.tsx:23-38`;
  `src/renderer/src/app/einheit-actions/useEinheitSplitActions.ts:9-24`;
  `src/main/services/einsatz-write/einheit.ts:151-233`
- **Beobachtung:** Der Dialog zeigt Quelle, Name und Stärke der neuen Teileinheit; die verbleibende Stärke
  der Quelleinheit wird nirgends angezeigt. Beim Ausführen wird die Quellstärke dauerhaft reduziert
  (`einheit.ts:185-194`), die neue Einheit angelegt — aber keine Helferzeile und kein Fahrzeug wandert mit;
  Kontaktdaten der neuen Einheit werden auf `null` gesetzt (`einheit.ts:215-227`). Es entsteht kein
  Protokolleintrag, folglich ist der Split nicht rückgängig zu machen. Wird die volle Stärke abgegeben,
  bleibt die Quelleinheit mit 0/0/0/0 weiterhin als aktive Einheit stehen.
- **Erwartung der Rolle:** Vor dem Splitten sehe ich beide Ergebnisse („bleibt: 0/1/6/7 – neu: 0/1/3/4") und
  kann festlegen, welche Helfer und Fahrzeuge mitgehen.
- **Auswirkung im Einsatz:** Nach dem Split stimmen Stärkezahl und Namensliste nicht mehr überein: Die
  Personen stehen weiter vollständig bei der Quelleinheit, deren Zahl aber gesunken ist. Fahrzeuge bleiben
  bei der Quelle. Eine versehentlich falsche Aufteilung lässt sich nur durch manuelles Nachrechnen an zwei
  Einheiten reparieren; Geisterzeilen mit Stärke 0 verbleiben im Lagebild.
- **Empfehlung:** Ergebnisvorschau für Quelle und Teileinheit im Dialog, Auswahl der mitgehenden Helfer und
  Fahrzeuge, Hinweis bzw. Rückfrage, wenn die Quelleinheit auf 0 fällt, und Aufnahme des Splits in die
  rückgängig machbaren Aktionen.
- **Verifikation:** Split mit Vorschau ausführen; Summe der Helferzeilen beider Einheiten entspricht danach
  der Summe der Stärken.

### P1-3 Fahrzeug einer anderen Einheit zuordnen verschiebt es still in einen anderen Abschnitt

- **Fundstelle:** `src/renderer/src/app/useFahrzeugActions.ts:194-205`;
  `src/main/services/einsatz-write/fahrzeug.ts:87-99`
- **Beobachtung:** Im Fahrzeug-Bearbeiten-Dialog ist „zugeordnete Einheit" ein Auswahlfeld über alle Kräfte
  des Einsatzes. Beim Speichern wird zusätzlich `aktuellerAbschnittId` auf den Abschnitt der neuen Einheit
  gesetzt. Ein Eintrag in `fahrzeugBewegungen` entsteht dabei nicht — der wird nur von `moveFahrzeug`
  geschrieben (`command.ts:94-101`).
- **Erwartung der Rolle:** Eine Zuordnungsänderung, die das Fahrzeug faktisch in einen anderen
  Einsatzabschnitt verlegt, wird als Verlegung erkennbar gemacht und protokolliert.
- **Auswirkung im Einsatz:** Ein Vergriff in einer langen Auswahlliste verlegt ein Fahrzeug lautlos in einen
  fremden Abschnitt. Die Bewegung fehlt in der Einsatzdokumentation, der Fehler ist später nicht
  nachvollziehbar.
- **Empfehlung:** Bei Wechsel der Einheit den daraus folgenden Abschnittswechsel im Dialog anzeigen und als
  Bewegung protokollieren.
- **Verifikation:** Fahrzeug einer Einheit in einem anderen Abschnitt zuordnen; Export „Bewegungen" enthält
  den Vorgang mit Uhrzeit und Benutzer.

### P1-4 Statuswechsel „ABGEMELDET" / „AUSSER_BETRIEB" bleibt folgenlos

- **Fundstelle:** `src/renderer/src/components/dialogs/EinheitFormFields.tsx:110-118`;
  `src/renderer/src/components/editor/shared/EinheitFahrzeugeSection.tsx:88-95`;
  `src/renderer/src/app/useEinsatzData.ts:244-256`;
  `src/main/services/einsatz-read-service.ts:98-108`
- **Beobachtung:** Der Status ist ein normales Auswahlfeld. Weder die Gesamtstärke noch die Abschnitts-
  listen filtern nach Status: `aggregateTacticalStrength` summiert alle Einheiten des Abschnitts,
  unabhängig vom Status, und `listAbschnittDetails` liefert auch abgemeldete Einheiten und außer Betrieb
  gesetzte Fahrzeuge unverändert aus. Sichtbar wird der Status nur als Rohtext in einer Tabellenspalte
  (`src/renderer/src/components/tables/EinheitRow.tsx:118`).
- **Erwartung der Rolle:** Setze ich eine Einheit auf „abgemeldet", zählt sie nicht mehr zur verfügbaren
  Stärke, oder es steht klar da, dass der Status nur ein Vermerk ist.
- **Auswirkung im Einsatz:** Die Gesamtstärke enthält Kräfte, die den Einsatzraum bereits verlassen haben.
  Wer sich auf die Zahl verlässt, meldet und disponiert zu viel Personal. Umgekehrt entsteht der Eindruck,
  das Abmelden sei erledigt, obwohl es fachlich wirkungslos bleibt.
- **Empfehlung:** Entweder abgemeldete Kräfte aus der Gesamtstärke herausnehmen und in den Listen deutlich
  absetzen, oder den Statuswechsel im Dialog als reinen Vermerk beschriften und die tatsächliche Abmeldung
  über einen eigenen, erklärten Vorgang abbilden.
- **Verifikation:** Einheit auf „abgemeldet" setzen; Topbar-Stärke und Abschnittsliste verhalten sich so,
  wie der Dialogtext es ankündigt.

### P1-5 Verschieben-Dialog nennt weder Einheit noch Quellabschnitt, Ziel ist vorbelegt

- **Fundstelle:** `src/renderer/src/components/dialogs/MoveDialog.tsx:22-41`;
  `src/renderer/src/app/app-view-props.ts:324-331` (Ziel wird mit dem gerade ausgewählten Abschnitt
  vorbelegt); `src/renderer/src/app/useEinsatzData.ts:52-61` (der ausgewählte Abschnitt kann beim
  zyklischen Neuladen auf den ersten Abschnitt zurückfallen, wenn der bisherige nicht mehr existiert);
  `src/renderer/src/app/useSyncEvents.ts:52-66` (Neuladen alle 6 Sekunden)
- **Beobachtung:** Der Dialog trägt nur die Überschrift „Einheit verschieben" bzw. „Fahrzeug verschieben",
  darunter eine Auswahlliste der Abschnittsnamen ohne Hierarchie und ohne Typkennzeichnung. Welche Einheit
  betroffen ist und wo sie aktuell steht, steht nicht im Dialog. Das Ziel ist mit dem aktuell angezeigten
  Abschnitt vorbelegt; dieser kann sich durch den Hintergrund-Refresh ändern.
- **Erwartung der Rolle:** „1. Bergungsgruppe von Bereitstellungsraum nach … verschieben" — Name, Herkunft
  und Ziel im Klartext.
- **Auswirkung im Einsatz:** Bei mehreren gleichnamigen oder gesplitteten Einheiten („… - Teil 1") wird die
  falsche Einheit verschoben, ohne dass es auffällt. Ohne Undo (P0-3) bleibt nur manuelles Zurückverschieben
  — sofern der Fehler überhaupt bemerkt wird.
- **Empfehlung:** Betroffenen Datensatz und aktuellen Abschnitt im Dialog ausschreiben, die Zielauswahl
  hierarchisch und mit Abschnittstyp darstellen, kein stillschweigend wechselndes Vorbelegen.
- **Verifikation:** Verschieben-Dialog aus einer Liste mit zwei gleichnamigen Teileinheiten öffnen; der
  Dialog muss eindeutig zeigen, welche der beiden gemeint ist.

### P1-6 Abschnitt umhängen oder Typ ändern wirkt auf den ganzen Teilbaum, ohne Rückfrage

- **Fundstelle:** `src/renderer/src/app/useAbschnittActions.ts:219-245`;
  `src/main/services/einsatz-write/abschnitt.ts:31-61`;
  `src/main/services/einsatz-write/validations.ts:12-35`
- **Beobachtung:** Im Abschnitt-Bearbeiten-Dialog lassen sich „übergeordneter Abschnitt" und „Systemtyp"
  frei ändern. Geprüft wird nur auf Zyklen und Existenz des Elternabschnitts — nicht, wie viele
  Unterabschnitte, Einheiten und Fahrzeuge mitwandern, und nicht, ob der Führungsstellenabschnitt seinen
  Typ verliert. Keine Rückfrage, kein Protokolleintrag, kein Undo.
- **Erwartung der Rolle:** Eine Änderung der Einsatzgliederung, die hunderte zugeordnete Datensätze
  betrifft, wird mir mit Anzahl und Folge vorgelegt.
- **Auswirkung im Einsatz:** Die Gliederung im Lagebild verschiebt sich schlagartig; ein Typwechsel auf oder
  von „ANFAHRT" verändert zusätzlich die Gesamtstärke (siehe P0-4). Der Zustand vorher ist nicht
  rekonstruierbar.
- **Empfehlung:** Vor dem Speichern anzeigen, was mitwandert („4 Unterabschnitte, 11 Einheiten, 7
  Fahrzeuge"), Typwechsel mit Stärkefolge erklären, Systemabschnitte gegen versehentliche Umtypung sichern.
- **Verifikation:** Abschnitt mit Unterabschnitten umhängen; Bestätigung nennt die betroffenen Anzahlen.

### P1-7 Verschieben, Splitten und Undo umgehen die Bearbeitungssperre

- **Fundstelle:** `src/main/ipc/register-entity-command-ipc.ts:14-121` (kein
  `ensureRecordEditLockOwnership`) gegenüber `src/main/ipc/register-entity-einheit-ipc.ts:61-65` und
  `src/main/ipc/register-entity-helfer-ipc.ts:110-116` (Sperre wird erzwungen)
- **Beobachtung:** Bearbeiten von Einheit, Fahrzeug und Helfer prüft serverseitig die Datensatzsperre.
  `move-einheit`, `move-fahrzeug`, `einheit:split` und `command:undo-last` prüfen sie nicht. In der
  Oberfläche sind die Knöpfe zwar deaktiviert, solange eine fremde Sperre bekannt ist
  (`src/renderer/src/components/tables/EinheitRow.tsx:84-97`), die Sperrliste wird aber nur zyklisch
  aktualisiert (`src/renderer/src/app/useEditLocks.ts:46-76`, alle 8 Sekunden, Vollabgleich nur jeder
  dritte Durchlauf) und läuft nach 45 Sekunden ohne Herzschlag ab (`src/main/services/record-lock.ts:8`).
- **Erwartung der Rolle:** Wenn eine andere Stelle einen Datensatz gerade bearbeitet, kann ich ihn auch
  nicht verschieben oder splitten.
- **Auswirkung im Einsatz:** Während die eine Stelle die Stärke einer Einheit korrigiert, splittet oder
  verschiebt die andere dieselbe Einheit. Zusammen mit P0-6 entstehen daraus widersprüchliche Stände, ohne
  dass eine der beiden Stellen eine Warnung sieht.
- **Empfehlung:** Dieselbe Sperrprüfung wie beim Bearbeiten auch für Verschieben, Splitten und Undo
  anwenden und die Ablehnung im Klartext melden („wird gerade an Platz S1-2 bearbeitet").
- **Verifikation:** Datensatz an Station A im Bearbeiten-Dialog offen halten, an Station B verschieben —
  muss mit verständlicher Meldung abgelehnt werden.

### P1-8 Versehentlich angelegte Einheiten und Fahrzeuge lassen sich nicht entfernen

- **Fundstelle:** `src/shared/ipc.ts` (`RendererApi` kennt nur `deleteEinheitHelfer`; kein Löschen für
  Einheit, Fahrzeug, Abschnitt oder Einsatz); `src/main/services/einsatz-write/einheit.ts`,
  `.../fahrzeug.ts`, `.../abschnitt.ts` (keine Löschfunktionen)
- **Beobachtung:** Es gibt keinen Weg, eine falsch angelegte Einheit, ein doppelt erfasstes Fahrzeug oder
  einen überflüssigen Abschnitt wieder zu entfernen. Anlegen ist mit einem Klick erledigt
  (`CreateEinheitDialog.tsx:32`, `EinheitFahrzeugeSection.tsx:126-138`).
- **Erwartung der Rolle:** Was ich versehentlich anlege, kann ich auch wieder entfernen — notfalls mit
  Begründung und Protokolleintrag.
- **Auswirkung im Einsatz:** Eine doppelt erfasste Einheit erhöht die Gesamtstärke dauerhaft. Die einzige
  Abhilfe ist Umbenennen und Stärke auf 0 setzen — die Geisterzeile bleibt im Lagebild und in der
  Einsatzdokumentation stehen und verwirrt jede ablösende Schicht.
- **Empfehlung:** Löschen bzw. „als Fehleingabe zurücknehmen" für frisch angelegte Datensätze anbieten —
  mit Bestätigung, Protokolleintrag und Sperre, sobald der Datensatz bereits bewegt oder gemeldet wurde.
- **Verifikation:** Einheit doppelt anlegen und die Dublette wieder entfernen; Gesamtstärke stimmt danach.

---

## P2 – Mittel

### P2-1 „Bestätigen" im Verschieben-Dialog ist nicht gegen Doppelauslösung gesperrt

- **Fundstelle:** `src/renderer/src/components/dialogs/MoveDialog.tsx:34` (kein `busy`-Zustand, anders als
  bei allen anderen Dialogen, z. B. `SplitEinheitDialog.tsx:30`, `EditEinheitDialog.tsx:29`);
  `src/renderer/src/app/useSystemActions.ts:100-124`
- **Beobachtung:** Während die Verschiebung läuft, bleibt der Knopf bedienbar. Die Aktion wird ein zweites
  Mal ausgelöst; im Kern fängt `moveEinheit` den Fall „gleicher Abschnitt" ab (`command.ts:37-39`).
- **Auswirkung im Einsatz:** Auf einem langsamen Netzlaufwerk entsteht der Eindruck, nichts sei passiert;
  der Helfer klickt erneut. Die Daten bleiben zwar konsistent, es kostet aber Aufmerksamkeit und Vertrauen.
- **Empfehlung:** Knopf während des Vorgangs sperren und den Fortschritt anzeigen — wie in den übrigen
  Dialogen bereits gelöst.
- **Verifikation:** Verschieben auf langsamem Laufwerk auslösen; Knopf ist bis zum Abschluss gesperrt.

### P2-2 Einsatz archivieren ist endgültig und hat kein Gegenstück

- **Fundstelle:** `src/main/services/einsatz-write/einsatz-core.ts:43-49`; `src/shared/ipc.ts`
  (`archiveEinsatz` ohne Gegenstück); im Renderer derzeit kein Aufrufer (Suche nach `archive` liefert nur
  `isArchived`-Auswertungen)
- **Beobachtung:** `archiveEinsatz` setzt den Status auf `ARCHIVIERT` und ein Ende-Datum. Danach sind alle
  Schreibpfade gesperrt (`ensureNotArchived`), und es gibt keine Funktion, das rückgängig zu machen. Die
  Schaltfläche fehlt aktuell in der Oberfläche.
- **Auswirkung im Einsatz:** Sobald das Archivieren in die Oberfläche kommt, wäre ein Fehlgriff endgültig:
  Der laufende Einsatz ließe sich nicht mehr fortschreiben.
- **Empfehlung:** Vor dem Einbau eine benannte Bestätigung vorsehen („Einsatz Hochwasser Musterstadt
  abschließen? Danach sind keine Eingaben mehr möglich.") und einen Weg zum Wiederöffnen.
- **Verifikation:** Nach Einbau: Archivieren ist nur mit Bestätigung möglich und lässt sich zurücknehmen.

### P2-3 Dialoge verwerfen Eingaben beim Schließen ohne Warnung

- **Fundstelle:** `src/renderer/src/app/useWorkspaceLifecycle.ts:42-59`;
  `src/renderer/src/components/dialogs/EditEinheitDialog.tsx:32-34`
- **Beobachtung:** „Abbrechen" schließt den Dialog, leert die Helferliste und gibt die Sperre frei. Es gibt
  keine Rückfrage, auch wenn im Formular bereits Eingaben stehen. Die Dialoge haben keinen sichtbaren
  Schließen- oder Escape-Weg (keine Tastaturbehandlung im Code) — **Annahme**, dass Escape damit wirkungslos
  ist; am laufenden Gerät zu prüfen.
- **Auswirkung im Einsatz:** Halb erfasste Stärke- oder Kontaktangaben gehen verloren und müssen neu
  aufgenommen werden; bei telefonisch durchgegebenen Angaben ist das nicht wiederholbar.
- **Empfehlung:** Bei geänderten Eingaben nachfragen, ob verworfen werden soll.
- **Verifikation:** Feld ändern, „Abbrechen" drücken — Rückfrage erscheint.

### P2-4 Folgen einer Aktion sind nur aus dem Ergebnis ablesbar

- **Fundstelle:** `src/renderer/src/app/useAppControllers.ts:27-36` (Fehler landen in einem
  Fehlerzustand); `src/renderer/src/styles/app.css:314-318` (Fehlerbanner)
- **Beobachtung:** Erfolgreiche Aktionen erzeugen keine Rückmeldung, fehlgeschlagene nur einen Bannertext.
  Was genau geschrieben wurde — etwa welche Einheit wohin verschoben wurde — steht nirgends.
- **Auswirkung im Einsatz:** Nach einer Aktion unter Ablenkung ist unklar, ob sie durchging und was sie
  bewirkt hat. Es wird sicherheitshalber ein zweites Mal ausgeführt oder gar nicht nachgehalten.
- **Empfehlung:** Kurze, konkrete Rückmeldung nach jeder verändernden Aktion, die den Datensatz benennt.
- **Verifikation:** Nach dem Verschieben erscheint eine Meldung mit Name, Quelle und Ziel.

### P2-5 Wiederholung eines Schreibvorgangs nach einem Übertragungsfehler

- **Fundstelle:** `src/main/ipc/register-entity-command-ipc.ts:19-37` und die gleichartigen Blöcke in
  `register-entity-einheit-ipc.ts:46-59`, `register-entity-helfer-ipc.ts:31-44`
- **Beobachtung:** Schreiboperationen werden zunächst an einen separaten Datenbankprozess delegiert; schlägt
  das mit einem beliebigen Fehler fehl, wird die Operation lokal erneut ausgeführt. Ein Zeitüberschreiten
  nach bereits erfolgtem Schreiben würde damit zu einer zweiten Ausführung führen — bei „Einheit anlegen"
  oder „Splitten" also zu einem doppelten Datensatz.
- **Annahme:** Der Datenbank-Hilfsprozess ist in dieser Fassung ein leerer Platzhalter
  (`src/main/db-runtime.ts:1-2`), der Pfad dürfte derzeit nicht aktiv sein. Relevant wird das, sobald er
  wieder eingeschaltet wird.
- **Empfehlung:** Wiederholung nur bei nachweislich nicht ausgeführter Operation, oder Operationen so
  kennzeichnen, dass eine Wiederholung keinen zweiten Datensatz erzeugt.
- **Verifikation:** Zeitüberschreitung beim Anlegen erzwingen; es darf nur ein Datensatz entstehen.

### P2-6 Neuer Einsatz kann eine bestehende Einsatzdatei überschreiben

- **Fundstelle:** `src/main/ipc/register-einsatz-ipc-support.ts:45-53`;
  `src/main/services/einsatz-files.ts:113-147` (`writeEinsatzFile(dbPath, skeleton)` ohne Existenzprüfung)
- **Beobachtung:** Beim Anlegen eines Einsatzes wird ein Speichern-Dialog geöffnet. Wählt der Nutzer eine
  vorhandene `.s1control`-Datei, warnt nur das Betriebssystem („Datei ersetzen?"). Anschließend wird die
  Datei mit einem leeren Einsatzgerüst überschrieben.
- **Auswirkung im Einsatz:** Die Systemwarnung spricht von einer Datei, nicht von einem Einsatz. Ein
  bestätigter Klick löscht einen kompletten, möglicherweise laufenden Einsatz.
- **Empfehlung:** Vor dem Überschreiben prüfen, ob die Zieldatei einen Einsatz enthält, und mit dessen Namen
  und Startzeitpunkt nachfragen — oder das Überschreiben ganz verhindern.
- **Verifikation:** Beim Anlegen eine bestehende Einsatzdatei auswählen; es erscheint eine Warnung mit
  Einsatzname.

---

## P3 – Niedrig

### P3-1 Bewegungen sind in der Anwendung nirgends einsehbar

- **Fundstelle:** `src/main/services/command.ts:44-52` und `94-101` (Bewegungen werden geschrieben);
  `src/main/services/export.ts:86-96` (nur im Export sichtbar); im Renderer kein Aufrufer (Suche nach
  `Bewegung` in `src/renderer` ohne Treffer)
- **Beobachtung:** Verschiebungen werden mit Zeitpunkt und Benutzer protokolliert, sind aber nur nach einem
  Export der Einsatzakte lesbar.
- **Auswirkung im Einsatz:** Die Frage „wer hat die Einheit wann verschoben?" lässt sich im laufenden
  Betrieb nicht beantworten; eine Fehlbedienung bleibt unentdeckt.
- **Empfehlung:** Kleine Verlaufsansicht je Einheit/Fahrzeug oder ein Einsatz-Protokollreiter.
- **Verifikation:** Nach einer Verschiebung ist der Vorgang ohne Export sichtbar.

### P3-2 Statuswerte erscheinen als technische Rohtexte

- **Fundstelle:** `src/renderer/src/components/tables/EinheitRow.tsx:118`;
  `src/renderer/src/components/editor/inline/InlineFahrzeugEditor.tsx:36`;
  `src/renderer/src/components/editor/shared/EinheitFahrzeugeSection.tsx:88-95`
- **Beobachtung:** In den Tabellen und teilweise in den Auswahlfeldern stehen `ABGEMELDET`,
  `IN_BEREITSTELLUNG`, `AUSSER_BETRIEB` — an einer Stelle mit Unterstrich, an einer anderen ohne.
- **Auswirkung im Einsatz:** Kostet beim Überfliegen Aufmerksamkeit; uneinheitliche Schreibweise nährt den
  Zweifel, ob es sich um denselben Wert handelt.
- **Empfehlung:** Einheitliche Klartextbezeichnungen in Tabellen und Auswahlfeldern.
- **Verifikation:** Gleiche Bezeichnung in Tabelle, Dialog und Inline-Editor.

### P3-3 Löschen und Speichern ohne optische Unterscheidung im gesamten Formularbereich

- **Fundstelle:** `src/renderer/src/styles/app.css:886-893`; `src/renderer/src/styles/app.css:13`
  (`--danger` ist definiert, wird aber nur für Fehlertexte verwendet, Zeilen 179 und 316)
- **Beobachtung:** Eine Gestaltung für gefährliche Schaltflächen existiert als Farbe, wird aber auf keiner
  Schaltfläche eingesetzt.
- **Auswirkung im Einsatz:** Der Blick kann gefährliche Aktionen nicht vorsortieren; das verstärkt P1-1.
- **Empfehlung:** Vorhandene Warnfarbe konsequent für verändernde und entfernende Schaltflächen nutzen und
  diese mit erkennbarem Abstand platzieren.
- **Verifikation:** Löschen-Schaltflächen sind auf einen Blick von Speichern unterscheidbar.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen — Kräfte erfassen, verschieben und splitten funktioniert; jede
  Fehlbedienung muss jedoch von Hand zurückgebaut werden.
- **Fremde Hilfe nötig:** ja — nach einem Fehlgriff beim Backup laden oder beim Splitten ist ohne
  Unterstützung kein sauberer Stand mehr herstellbar.
- **Größtes Missverständnis:** „Verschieben" verschiebt nur die Einheit, nicht ihre Fahrzeuge, und kann
  nebenbei die gemeldete Gesamtstärke verändern.
- **Größtes Einsatzrisiko:** „Backup laden" setzt ohne jede Rückfrage den gesamten Einsatz für alle
  Stationen auf einen alten Stand zurück, ohne den Ist-Stand vorher zu sichern.
- **Top-Priorität für die nächste Iteration:** Benannte Bestätigung plus automatische Sicherung des
  Ist-Standes vor dem Zurücksetzen auf ein Backup — und im selben Zug ein sichtbares, auf die eigene letzte
  Aktion begrenztes Rückgängig.
