# Audit: Analog-First / Papier-Rückfallebene — S1-Control

**Rolle:** Erfahrener THW-Helfer, der Papier, Meldeblock, Whiteboard und Funk als Basis versteht und digitale Abhängigkeiten kritisch hinterfragt.
**Datum:** 2026-09-18
**Prüfgegenstand:** Repository `/home/user/S1-Control` (Electron-App S1-Control, offline-first S1-Kräfteverwaltung)

## Scope und Methodik

- **Einschränkung (wichtig):** Dieser Audit ist **rein code- und dokumentationsbasiert**. Es gab **keine laufende Instanz, keine Screenshots, keine reale Bedienung**. Alle Aussagen zum *sichtbaren* Verhalten sind aus dem Quelltext abgeleitet und entsprechend als Beleg mit `Datei:Zeile` versehen.
- Geprüfte Quellen: `src/renderer/src` (Views, Dialogs, Tabellen, App-Hooks), `src/main` (Services, IPC), `src/shared` (IPC-Vertrag, Typen), `README.md`, `AGENTS.md`, `TODO.md`.
- Nicht prüfbar ohne laufende App: tatsächliche Lesbarkeit, Klickwege im Betrieb, Dialogtexte des Betriebssystems, Performance unter Last, Verhalten beim realen Abriss eines SMB-Shares.
- Annahmen über THW-Abläufe sind explizit als **Annahme** gekennzeichnet.

## Kurzes Urteil aus Rollensicht

Die technische Grundlage ist für einen Papier-Skeptiker erfreulich: kein Cloudzwang, eine Datei pro Einsatz, WAL-Modus für den Fileshare, automatische Backups, Datensatzsperren mit kurzer Lebensdauer und ein Bewegungs-/Command-Log mit Benutzer und Zeitstempel. Das ist eine ehrliche Offline-Architektur.

Die Reibung entsteht genau an der Stelle, die für mich zählt: **Aus dieser Anwendung kommt kein Blatt Papier heraus.** Es gibt keine Druckfunktion, kein Druck-Stylesheet, kein PDF — und die einzige vorhandene Ausleitung (Einsatzakte-Export) ist in der Oberfläche **überhaupt nicht erreichbar**. Umgekehrt gibt es keinen Weg zurück: keine Import-Schnittstelle, und alle Bewegungszeitpunkte werden zwingend auf „jetzt" gesetzt, sodass ein auf Papier geführter Zeitraum nicht zeitrichtig nachgetragen werden kann.

**Ergebnis:** Der Einsatz lässt sich digital führen. Er lässt sich aber weder geordnet auf Papier übergeben noch von Papier zurückübernehmen. Ohne fremde Hilfe (Zugriff auf die `.s1control`-Datei, Entwicklerkenntnisse) ist die Aufgabe „Papierstand erzeugen / Papierstand nachtragen" derzeit nicht lösbar.

---

## P0 — Einsatzkritisch

### P0-1 Die Export-/Einsatzakten-Funktion ist in der Oberfläche nicht erreichbar

**Fundstellen**
- `src/renderer/src/components/views/ExportView.tsx:14-26` (Komponente existiert)
- `src/renderer/src/types/ui.ts:14-19` — `WorkspaceView = 'einsatz' | 'fuehrung' | 'kraefte' | 'fahrzeuge' | 'einstellungen'`; **kein** `'export'`
- `src/renderer/src/components/layout/WorkspaceRail.tsx:16-51` — Buttons nur E, G, K, F, Zahnrad
- Suche über `src/renderer/**`: `ExportView` und `onExport` kommen ausschließlich in der Datei selbst vor; `window.api.exportEinsatzakte` wird im Renderer nirgends aufgerufen (nur in `test/export.test.ts:33`)

**Beobachtetes Problem:** Backend-IPC (`src/shared/ipc.ts:217,332`) und Handler (`src/main/ipc/register-einsatz-ipc.ts:389-407`) sind vorhanden und funktionsfähig, die Ansicht ist aber weder im Navigations-Enum noch in der Rail noch in der Workspace-Zusammensetzung verdrahtet. Sie ist toter Code.

**Auswirkung im Einsatz:** Es gibt keinen bedienbaren Weg, den aktuellen Lagestand aus der Anwendung herauszuholen. Wenn der Rechner ausfällt, der Strom wegbleibt oder die Führungsstelle verlegt, existiert der Kräftestand nur noch in der `.s1control`-Datei — für einen S1 am Meldeblock ist das nicht verwertbar. Die im README (Abschnitt „Export (MVP)") zugesagte Funktion ist praktisch nicht vorhanden.

**Empfehlung:** Export als eigenen Punkt in die Workspace-Rail und in die Ansichtenliste aufnehmen. Zusätzlich als jederzeit erreichbare Aktion in der Topbar, nicht nur in einer Unteransicht — der Griff zum Papierstand darf nicht in den Einstellungen versteckt sein.

---

### P0-2 Es gibt keinerlei Druckausgabe (kein Druckbefehl, kein Druck-Stylesheet, kein PDF)

**Fundstellen**
- Volltextsuche über `src/**` nach `print`, `drucken`, `@media print`, `@page`, `pdf`: **kein einziger Treffer** außerhalb der STAN-Rohdaten `src/main/services/stan/thw-stan-2025.generated.json` (dort nur PDF-Dateinamen)
- `src/renderer/src/styles/app.css` (1276 Zeilen) enthält keine Druckregeln
- `src/shared/ipc.ts:180-295` — die gesamte `RendererApi` kennt keine Druck- oder PDF-Operation
- `README.md`, Abschnitt „Export (MVP)": PDF ist nur als Ausblick („Struktur ist vorbereitet, um später PDF-Erzeugung … zu ergänzen") benannt

**Beobachtetes Problem:** Weder Kräfteübersicht, noch Führungsstruktur, noch Fahrzeugübersicht, noch die Abschnittsdetails können gedruckt werden. Auch die Bildschirmansichten sind nicht druckbar aufbereitet.

**Auswirkung im Einsatz:** Vor jedem absehbaren Ausfall (Verlegung, Akkuwechsel, Schichtwechsel, Stromausfall) müsste der Kräftestand vom Bildschirm abgeschrieben werden. Das kostet unter Zeitdruck Minuten und erzeugt genau die Übertragungsfehler, wegen derer man sonst gleich beim Papier bleibt. Eine Führungsstelle ohne ausdruckbare Kräfteübersicht hat keine belastbare Rückfallebene.

**Empfehlung:** Mindestens eine druckbare „Kräfteübersicht Stand HH:MM" für den gewählten Abschnitt und für den Gesamteinsatz — mit Abschnittsnamen, Einheit, taktischer Stärke, Status, Führungskraft und Erreichbarkeit. Ergänzend ein leeres, formgleiches Blatt zum handschriftlichen Weiterführen; der Ausdruck ist dann gleichzeitig Ausgangsstand und Fortführungsvordruck.

---

### P0-3 Nachträglich erfasste Vorgänge können nicht auf ihren echten Zeitpunkt gesetzt werden

**Fundstellen**
- `src/main/services/command.ts:49` (Einheit-Bewegung), `:99` (Fahrzeug-Bewegung), `:141` und `:156` (Undo-Bewegungen) — jeweils fest `zeitpunkt: nowIso()`
- `src/shared/ipc.ts:127-138` — `MoveEinheitInput` / `MoveFahrzeugInput` haben kein Zeitfeld
- `src/shared/ipc.ts:52-99` — auch `CreateEinheitInput` / `UpdateEinheitInput` kennen keinen Anmelde- oder Erfassungszeitpunkt
- `src/main/json-store/types.ts:97,107,126` — das Datenmodell führt `zeitpunkt` als reines Schreibfeld; eine Unterscheidung „Ereigniszeit" vs. „Erfassungszeit" existiert nicht

**Beobachtetes Problem:** Jede Bewegung bekommt den Zeitstempel des Klicks, nicht den des Ereignisses.

**Auswirkung im Einsatz:** Genau der Normalfall bricht: Die Führungsstelle arbeitet 40 Minuten am Meldeblock weiter (Akku leer, Rechner aus, Netz weg) und trägt danach nach. Anschließend steht in der Einsatzakte, alle zwölf Bewegungen hätten innerhalb von drei Minuten stattgefunden. Die Zeitachse in `bewegungen.csv` und im HTML-Report ist damit für Rekonstruktion, Nachbereitung und Nachweis unbrauchbar — und schlimmer: sie *sieht* korrekt aus. Das ist eine gefährliche Fehlinterpretation, kein Komfortproblem.

**Empfehlung:** Für jede Bewegung und jede Statusänderung ein bearbeitbares Ereigniszeit-Feld (Vorbelegung „jetzt", NATO-Zeit eingebbar) getrennt von der automatisch gesetzten Erfassungszeit. Nachgetragene Vorgänge sichtbar als „nacherfasst" kennzeichnen, damit klar bleibt, was live und was vom Papier stammt.

---

### P0-4 „Backup laden" überschreibt den aktuellen Stand ohne Rückfrage und ohne Sicherung

**Fundstellen**
- `src/renderer/src/components/views/SettingsView.tsx:226-228` — Button „Backup laden", keine Warnung, kein Hinweistext
- `src/renderer/src/app/useSystemActions.ts:54-73` — ruft direkt `window.api.restoreBackup(...)`, keine Bestätigung im Renderer
- `src/main/ipc/register-einsatz-ipc.ts:369-386` — Dateiauswahl, danach unmittelbar `restoreBackup(...)`
- `src/main/services/backup.ts:59-62` — `restoreBackup()` ist ein reines `fs.copyFileSync(backupFilePath, dbPath)`; der bestehende Stand wird **nicht** vorher gesichert
- `src/main/ipc/register-einsatz-ipc-support.ts:59-67` — der Auswahldialog heißt nur „Backup laden"; welchen Stand die gewählte Datei enthält, ist nur am Dateinamen-Zeitstempel (`backup.ts:13-22`) ablesbar

**Beobachtetes Problem:** Die einzige Wiederherstellungsfunktion ist destruktiv, unbestätigt und ohne Sicherheitsnetz. Zudem betrifft sie im Fileshare-Betrieb die gemeinsame Einsatzdatei, nicht nur den eigenen Rechner.

**Auswirkung im Einsatz:** Das ist genau der Griff, zu dem man nach einem Geräteausfall greift. Ein Fehlgriff — oder ein Backup von vor 20 Minuten, während ein zweiter Arbeitsplatz weitergearbeitet hat — löscht ohne Warnung die Arbeit der anderen Clients. Danach ist der digitale Stand älter als der Papierstand, ohne dass irgendjemand es merkt. Es gibt keinen Weg zurück und keinen Abgleichmechanismus.

**Empfehlung:** Vor dem Überschreiben automatisch eine Sicherung des Ist-Standes anlegen. Im Dialog Klartext zeigen: „Backup vom 18SEP26 14:35 wird geladen. Der aktuelle Stand (18SEP26 14:52, 3 aktive Clients) wird ersetzt." Aktive Clients aus `listActiveClients` (`src/shared/ipc.ts:219`) an dieser Stelle anzeigen und die Aktion blockieren oder deutlich eskalieren, solange andere Clients schreiben.

---

## P1 — Hoch

### P1-1 Der Export-Inhalt taugt nicht als Papierstand

**Fundstellen** (`src/main/services/export.ts`)
- `:81` — Spalte „Abschnitt" enthält `item.aktuellerAbschnittId`, also eine UUID statt des Abschnittsnamens
- `:93` und `:99` — in der Bewegungstabelle stehen ebenfalls nur `einsatzEinheitId` / `einsatzFahrzeugId` und Abschnitts-UUIDs
- `:59-105` — der HTML-Report enthält **keinen** Erstellungszeitpunkt/„Stand"; nur Einsatzname, FüSt und Status (`:72-73`)
- `:129-183` — exportiert werden ausschließlich Einheiten und Bewegungen: **keine Fahrzeugliste**, **keine Helferliste**, **keine Erreichbarkeiten/Telefonnummern** (obwohl `ovTelefon`, `rbTelefon`, `lvTelefon`, `erreichbarkeiten` im Datenmodell existieren, `src/shared/ipc.ts:62-74`)
- `:117-127` — die Bewegungs-CSV führt die Spalte `kommentar` nicht, obwohl sie gespeichert wird (`src/main/services/command.ts:52`)

**Beobachtetes Problem:** Der Export ist eine Datenbank-Ausleitung, kein lesbares Lagedokument.

**Auswirkung im Einsatz:** Selbst wenn der Export erreichbar wäre (siehe P0-1) und man ihn ausdruckt, steht auf dem Blatt „Abschnitt: 8f3c-…" statt „Bereitstellungsraum Süd". Das ist am Meldeblock wertlos. Der Fahrzeugstand und die Telefonnummern — im Ausfall das Wichtigste, weil man dann per Funk und Handy weiterarbeitet — fehlen vollständig. Ohne „Stand"-Zeitstempel lässt sich später nicht entscheiden, welches von zwei Blättern das jüngere ist.

**Empfehlung:** Im Report Namen statt IDs auflösen, Erstellungszeitpunkt in NATO-Zeit groß in den Kopf, Fahrzeug- und Helferliste sowie eine kompakte Erreichbarkeitsliste ergänzen, `kommentar` in die Bewegungs-CSV aufnehmen. Die IDs dürfen zusätzlich in einer Nebenspalte stehen — für den Wiedereinstieg ins Digitale sind sie nützlich, nur nicht als Hauptinformation.

---

### P1-2 Es gibt keinen Rückweg: keine Import- oder Nacherfassungsschnittstelle

**Fundstellen**
- `src/shared/ipc.ts:180-295` — die vollständige `RendererApi` enthält `exportEinsatzakte` (`:217`), aber keinerlei Import-, Einlese- oder Massenerfassungsoperation
- `src/shared/ipc.ts:297-365` — dasselbe im Kanal-Verzeichnis: `EXPORT_EINSATZAKTE`, kein Gegenstück
- `src/main/services/export.ts` erzeugt CSV (`:108-127`), es existiert kein CSV-Lesepfad im Repository

**Beobachtetes Problem:** Die CSV-Ausleitung ist eine Einbahnstraße. Was auf Papier oder in einer Tabelle entstanden ist, muss Feld für Feld über die Dialoge neu eingetippt werden.

**Auswirkung im Einsatz:** Nach einer längeren Papierphase — zwei Stunden Meldeblock bei Stromausfall — bedeutet das: ein Helfer sitzt danach 30 bis 60 Minuten am Rechner und tippt, statt zu führen. In dieser Zeit läuft die Lage weiter und erzeugt neue Papiernotizen. Praktisch führt das dazu, dass man gar nicht mehr zurück ins System geht und die Anwendung für den Rest des Einsatzes abgeschrieben ist.

**Empfehlung:** Ein pragmatischer Sammelerfassungs-Modus reicht: eine Tabellenmaske, in der mehrere Bewegungen mit Zeit, Einheit und Zielabschnitt untereinander eingetippt und in einem Rutsch übernommen werden. Alternativ das Wiedereinlesen der eigenen `bewegungen.csv` mit zusätzlichen handschriftlich ergänzten Zeilen. Beides setzt P0-3 (Ereigniszeit) voraus.

---

### P1-3 Beim Verschieben fehlt das Bemerkungsfeld, obwohl das Datenmodell es vorsieht

**Fundstellen**
- `src/renderer/src/components/dialogs/MoveDialog.tsx:22-41` — nur eine Abschnittsauswahl, kein Textfeld
- `src/renderer/src/app/useSystemActions.ts:100-124` — `moveEinheit` wird ohne `kommentar` aufgerufen
- `src/shared/ipc.ts:127-132` — `MoveEinheitInput.kommentar` existiert
- `src/main/services/command.ts:52` — `kommentar: input.kommentar ?? null` wird gespeichert und bleibt daher immer leer

**Beobachtetes Problem:** Der einzige Ort, an dem der Grund einer Bewegung festgehalten werden könnte, ist in der Oberfläche nicht vorhanden.

**Auswirkung im Einsatz:** Auf dem Meldeblock steht „14:32 2. Bergungsgruppe → Abschnitt Ost, Anforderung Einsatzleitung FW". Digital bleibt davon nur „von A nach B". Der fachliche Anlass — das, was in der Nachbereitung und bei Rückfragen zählt — geht verloren. Das ist ein Medienbruch, bei dem das Papier klar überlegen ist und es keinen digitalen Mehrwert gibt.

**Empfehlung:** Ein Freitextfeld „Bemerkung / Grund" im Verschiebedialog, optional, eine Zeile. Es ist bereits alles dafür da.

---

### P1-4 Rückgängig nur für die letzte Bewegung, nur für Verschiebungen

**Fundstellen**
- `src/main/services/command.ts:118-163` — `undoLastCommand` nimmt den jüngsten nicht rückgängig gemachten Eintrag und unterstützt ausschließlich `MOVE_EINHEIT` und `MOVE_FAHRZEUG`; alles andere wirft `'UNSUPPORTED'` (`:160`)
- `src/shared/ipc.ts:215-216` — nur `undoLastCommand` / `hasUndoableCommand`
- `README.md`, Abschnitt „Datenhaltung / DB": „Undo für `MOVE_EINHEIT` und `MOVE_FAHRZEUG`"

**Beobachtetes Problem:** Stärkeänderungen, Statuswechsel, angelegte Einheiten, Helfereinträge und Aufteilungen sind nicht rücknehmbar. Auch bei Verschiebungen lässt sich nur der allerletzte Schritt zurücknehmen.

**Auswirkung im Einsatz:** Beim Nachtragen vom Papier passieren Fehler in Serie — man tippt zehn Vorgänge und merkt beim zwölften, dass ab dem dritten ein Abschnitt falsch war. Genau dann hilft ein Undo für den letzten Schritt nicht. Man korrigiert von Hand und erzeugt dabei zusätzliche, zeitlich falsche Bewegungen (siehe P0-3), die die Akte weiter verfälschen.

**Empfehlung:** Undo auf weitere Vorgangstypen ausdehnen, insbesondere Anlegen und Stärkeänderung; mehrstufiges Zurücknehmen innerhalb der eigenen Sitzung. Bis dahin: den Nutzer bei einer Nacherfassungsstrecke ausdrücklich darauf hinweisen, dass nur der letzte Schritt zurückgenommen werden kann.

---

## P2 — Mittel

### P2-1 Zeitformat-Bruch zwischen Bildschirm und Ausleitung

**Fundstellen**
- `src/renderer/src/utils/datetime.ts:4-11` — Bildschirm zeigt NATO-Zeit aus lokaler Zeit (`181432SEP26`)
- `src/renderer/src/components/layout/Topbar.tsx:46` — dieselbe Darstellung in der Kopfzeile
- `src/main/services/export.ts:156,167` — im Export steht der Rohwert aus `zeitpunkt`, erzeugt als ISO-UTC (`src/main/services/command.ts:49`)
- `src/renderer/src/components/views/SettingsView.tsx:41,143,184` — dort wiederum `toLocaleTimeString('de-DE')`, also ein drittes Format

**Beobachtetes Problem:** Drei Zeitdarstellungen in einer Anwendung; die Ausleitung nutzt ein Format, das auf keinem Meldevordruck vorkommt.

**Auswirkung im Einsatz:** Wer den Export neben den Meldeblock legt, muss jede Zeile im Kopf von `2026-09-18T12:32:11.000Z` auf `181432SEP26` umrechnen — inklusive Zeitzone. Beim Abgleich von Papier- und Digitalstand ist das die häufigste Fehlerquelle, und sie kostet bei jeder Zeile Aufmerksamkeit.

**Empfehlung:** Im Report und in der CSV die NATO-Zeit als führende Spalte, den ISO-Wert daneben für Weiterverarbeitung. Eine durchgängige Zeitdarstellung in der gesamten Oberfläche.

---

### P2-2 Sicherungsabstand und Sicherungszustand sind im Betrieb nicht sichtbar

**Fundstellen**
- `src/main/services/backup.ts:5-7` — `FIVE_MINUTES`, Prüfschleife alle 10 s, erste Sicherung erst nach 60 s (`INITIAL_BACKUP_DELAY_MS`)
- `src/main/services/backup.ts:68-73` — nur der Master-Client sichert (`canWriteBackup`), und nur, wenn fünf Minuten vergangen sind
- `src/main/services/backup.ts:81-86` — schlägt das Kopieren fehl, wird der Fehler **stillschweigend verworfen** („best effort backup in background"); es gibt keine Meldung an die Oberfläche
- `src/renderer/src/components/views/SettingsView.tsx:241-244` — der Fünf-Minuten-Takt steht nur als Fließtext; **kein** „letztes Backup: HH:MM"
- `src/shared/ipc.ts:180-295` — keine API, die den Backup-Zustand abfragen könnte

**Beobachtetes Problem:** Man erfährt nirgends, ob und wann zuletzt gesichert wurde — auch dann nicht, wenn die Sicherung dauerhaft scheitert (Share voll, keine Schreibrechte, Master weg).

**Auswirkung im Einsatz:** Bei Akkuende oder Absturz gehen bis zu fünf Minuten Eintragungen verloren, ohne dass jemand das vorher abschätzen konnte. Fällt der Master-Client aus und übernimmt keiner die Rolle sauber, kann die Sicherung stillschweigend ganz ausbleiben. Aus Rollensicht ist das der Punkt, an dem ich sage: „Dann führe ich parallel Papier" — und dann brauche ich die Software eigentlich nicht mehr.

**Empfehlung:** Zeitpunkt der letzten erfolgreichen Sicherung dauerhaft sichtbar (Topbar oder Statuszeile), fehlgeschlagene Sicherung als deutliche Warnung. Zusätzlich eine manuelle Aktion „Jetzt sichern und Stand drucken" vor absehbaren Unterbrechungen (Verlegung, Schichtwechsel, Akkuwechsel).

---

### P2-3 Diagnoseausgaben stehen in der Einsatzansicht, Lageaktualität steht nirgends

**Fundstellen**
- `src/renderer/src/components/views/EinsatzOverviewView.tsx:56-59` — unter den Kräfte- und Fahrzeugtabellen ein „UDP Broadcast Monitor" mit rohen Log-Zeilen
- `src/renderer/src/components/views/SettingsView.tsx:257-258` — zusätzlich „Debug Sync Logs" und „UDP Debug Monitor"
- `src/renderer/src/components/layout/Topbar.tsx:39-48` — die Kopfzeile zeigt Stärke und Uhrzeit, aber **keinen** Hinweis auf Datenstand, Share-Verbindung oder Synchronisationszustand

**Beobachtetes Problem:** Der Nutzer bekommt technische Innereien zu sehen, die er nicht auswerten kann, während die einzige Information, die er für die Vertrauensfrage braucht — „ist das, was ich hier sehe, aktuell?" — fehlt.

**Auswirkung im Einsatz:** Bricht die Verbindung zum Fileshare ab, zeigt der Bildschirm weiterhin eine plausible Gesamtstärke an. Aus Rollensicht ist eine stillschweigend veraltete Zahl schlimmer als gar keine Zahl: Am Whiteboard sieht man sofort, wann zuletzt jemand etwas eingetragen hat. Hier sieht man es nicht.

**Annahme:** Ohne laufende App ist nicht prüfbar, ob eine Verbindungsstörung an anderer Stelle (z. B. als Fehlerbanner) sichtbar wird. Im Renderer wurde kein entsprechender Statusindikator gefunden.

**Empfehlung:** Statt der Log-Fenster in der Einsatzansicht eine einzige, klare Statusanzeige: „Stand 181452SEP26 · Datei erreichbar · 3 Arbeitsplätze". Diagnose-Logs gehören ausschließlich in die Einstellungen.

---

### P2-4 Der Standard-Speicherort des Exports ist das Arbeitsverzeichnis

**Fundstelle:** `src/main/ipc/register-einsatz-ipc.ts:393` — `path.join(process.cwd(), 'einsatzakte-${einsatzId}.zip')`; der Dateiname enthält die UUID statt des Einsatznamens.

**Beobachtetes Problem:** Vorgeschlagen wird ein Pfad, der bei einer installierten Anwendung vom Startkontext abhängt und für den Nutzer nicht vorhersehbar ist. Der Dateiname ist nicht sprechend.

**Auswirkung im Einsatz:** Unter Zeitdruck wird der Dialog bestätigt, ohne den Pfad zu lesen. Danach findet niemand die Datei — schon gar nicht der Kollege, der sie auf dem Nachbarrechner ausdrucken soll. Bei mehreren Exporten ist am Dateinamen nicht erkennbar, welcher der jüngere ist.

**Empfehlung:** Standardmäßig neben die Einsatzdatei legen (dort, wo auch `backup` liegt), Dateiname aus Einsatzname und NATO-Zeitstempel. Nach dem Export den Ablageort im Klartext anzeigen.

---

## P3 — Niedrig

### P3-1 NATO-Zeit ohne Zeitzonenkennzeichen

**Fundstelle:** `src/renderer/src/utils/datetime.ts:4-11` — ausgegeben wird `DDHHMMMONYY` ohne Zonenbuchstaben; die Werte stammen aus der lokalen Systemzeit (`date.getHours()`), gespeichert wird dagegen UTC (`src/main/services/command.ts:49`).

**Auswirkung im Einsatz:** Beim Abschreiben auf einen Vordruck, der ein Zonenkennzeichen vorsieht, muss geraten werden. Bei überregionaler Zusammenarbeit oder beim Vergleich mit dem Export entsteht eine stille Zweideutigkeit.

**Annahme:** Welche Zeitzonenkennzeichnung im konkreten THW-Verband verlangt wird, ist hier nicht bekannt — geprüft wurde nur die Eindeutigkeit der Darstellung.

**Empfehlung:** Zonenbuchstaben mitführen und Bildschirm- wie Exportzeit auf dieselbe Bezugszone stellen.

---

### P3-2 Einbuchstabige Navigationsschaltflächen

**Fundstelle:** `src/renderer/src/components/layout/WorkspaceRail.tsx:21,28,35,42` — Beschriftungen „E", „G", „K", „F"; die Klartextbedeutung steht nur im `title`-Attribut, also im Tooltip.

**Auswirkung im Einsatz:** Beim Schichtwechsel oder wenn ein Ersatzhelfer kurz übernehmen soll, muss erst jemand erklären, dass „G" die Führungsstruktur ist. Das ist kein Sicherheitsproblem, kostet aber jedes Mal eine Einweisung — und Tooltips liest niemand, der mit einer Hand am Telefon ist.

**Empfehlung:** Kurzwort statt Einzelbuchstabe, oder Symbol mit Beschriftung darunter.

---

### P3-3 Archivieren ist einseitig, ohne Weg zurück

**Fundstellen**
- `src/main/services/einsatz-write/einsatz-core.ts:43-49` — `archiveEinsatz` setzt den Status auf `ARCHIVIERT` und das Ende-Datum; eine Gegenoperation existiert nicht
- `src/main/services/einsatz-transaction-guards.ts:35` und `einsatz-core.ts:32-34` — jeder Schreibzugriff wird danach abgewiesen
- `src/main/ipc/register-einsatz-ipc.ts:151-159` — der Kanal ist vorhanden; im Renderer wurde kein Aufruf von `archiveEinsatz` gefunden

**Beobachtetes Problem:** Der Abschluss eines Einsatzes ist unumkehrbar. Wer danach noch Papiernotizen findet, kann sie nicht mehr nachtragen.

**Auswirkung im Einsatz:** Gerade das Nachtragen vom Papier passiert erfahrungsgemäß spät — beim Aufräumen, beim Zusammentragen der Meldeblöcke. Genau dann ist der Einsatz meist schon abgeschlossen. Aktuell ist das Risiko gering, weil die Funktion in der Oberfläche offenbar gar nicht ausgelöst werden kann; sobald sie verdrahtet wird, wird es relevant.

**Empfehlung:** Vor dem Archivieren zum Export/Ausdruck auffordern. Ein kontrolliertes Wiederöffnen für Nacherfassung vorsehen, das im Log als solches erkennbar bleibt.

---

## Analog-/Digital-Übergabematrix

| Prozessschritt | Digitaler Nutzen | Analoger Fallback | Sauberer Wiedereinstieg in Digital |
|---|---|---|---|
| Kräfte anmelden / erfassen | Taktische Stärke wird automatisch summiert, taktische Zeichen und STAN-Vorschläge sparen Tipparbeit (`src/main/services/stan/thw-stan-inference.ts`) | Anmeldeliste auf Papier: Einheit, Stärke, Ankunftszeit, Führungskraft, Telefon | **Fehlt.** Keine Sammelerfassung, kein Import (P1-2); Ankunftszeit nicht nachtragbar (P0-3) |
| Kräfte verschieben / Bewegung melden | Lückenloses Bewegungslog mit Benutzer (`src/main/services/command.ts:44-54`) | Meldeblock: Zeit, Einheit, von, nach, Grund | **Unvollständig.** Zeitpunkt wird auf „jetzt" gesetzt (P0-3), Grund nicht erfassbar (P1-3) |
| Lagestand an Ablösung / Führung übergeben | Gesamtübersicht und Führungsstruktur am Bildschirm, Stärke-Monitor im Vollbild | Ausgedruckte Kräfteübersicht als Stand + handschriftliche Fortschreibung | **Fehlt vollständig.** Kein Druck (P0-2), Export nicht erreichbar (P0-1), Export ohne Namen und ohne Stand-Zeit (P1-1) |
| Ausfall eines Arbeitsplatzes (Akku, Gerät) | Andere Clients arbeiten auf derselben Datei weiter (WAL, `README.md` „Offline- und Fileshare-Betrieb") | Weiterführung auf Papier am ausgefallenen Platz | Nacherfassung nur händisch und zeitlich verfälscht (P0-3, P1-2) |
| Ausfall des Fileshares / vollständige Trennung | — | Alles auf Papier | Kein Statusindikator, ob die Anzeige noch aktuell ist (P2-3); Rückführung wie oben |
| Wiederherstellung nach Datenverlust | Automatische Sicherung alle 5 Minuten (`src/main/services/backup.ts:5`) | Papierstand als Referenz zum Abgleich | **Riskant.** Überschreiben ohne Rückfrage und ohne Sicherung des Ist-Standes (P0-4); kein Abgleichwerkzeug, keine Aussage, welcher Stand im Konflikt maßgeblich ist |
| Einsatzabschluss / Dokumentation | Einsatzakte als ZIP mit DB, HTML und CSV (`src/main/services/export.ts:174-182`) | Meldeblöcke, Vordrucke, Übersichtsblätter | Export nicht erreichbar (P0-1); nachträgliche Ergänzung nach Archivierung nicht vorgesehen (P3-3) |

---

## Würde ich dafür das Papier weglegen?

**Nein — heute noch nicht, aber der Grund ist klein und behebbar.** Die Datenhaltung überzeugt mich: eine Datei pro Einsatz, kein Server, kein Netzzwang, Sicherungen im Hintergrund, ein Bewegungslog mit Benutzer und Zeit. Das ist mehr Robustheit, als ich einer Einsatzsoftware normalerweise zutraue, und die automatische Stärkeberechnung nimmt mir echte Rechenfehler ab. Weglegen kann ich den Meldeblock aber erst, wenn ich (1) jederzeit mit einem Klick einen brauchbaren, datierten Ausdruck in der Hand habe und (2) das, was ich in der Zwischenzeit von Hand geschrieben habe, mit der richtigen Uhrzeit wieder hineinbekomme. Solange beides fehlt, führe ich zwangsläufig doppelt — und dann habe ich die Doppelarbeit, vor der die Software mich eigentlich bewahren sollte.

---

## Abschluss

- **Aufgabe geschafft:** nein (bezogen auf „Papierstand erzeugen" und „Papierstand nachtragen"; die reine digitale Einsatzführung ist möglich)
- **Fremde Hilfe nötig:** ja — für eine Ausleitung des Lagestands ist derzeit Zugriff auf die `.s1control`-Datei und technisches Wissen erforderlich
- **Größtes Missverständnis:** Die Anwendung erweckt durch Stärkeanzeige und Bewegungslog den Eindruck einer vollständigen, zeitrichtigen Einsatzakte — tatsächlich tragen nachgetragene Vorgänge die Zeit des Tippens, nicht die des Ereignisses
- **Größtes Einsatzrisiko:** Ein Geräte- oder Stromausfall trennt die Führungsstelle vollständig vom Kräftestand, weil es keinen ausdruckbaren Stand gibt und die einzige Ausleitung in der Oberfläche nicht erreichbar ist
- **Top-Priorität für die nächste Iteration:** Eine jederzeit erreichbare, druckbare Kräfte- und Fahrzeugübersicht mit Abschnittsnamen, Erreichbarkeiten und „Stand HH:MM" — damit lässt sich P0-1, P0-2 und der praxisrelevante Teil von P1-1 in einem Zug erledigen
