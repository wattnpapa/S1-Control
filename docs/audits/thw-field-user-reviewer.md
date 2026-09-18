# Usability-Audit: S1-Control aus Sicht eines THW-Einsatzhelfers

Rolle: technisch-praktisch versierter THW-Helfer / S1-Gehilfe, der die Software gelegentlich
und unter Einsatzbedingungen bedient (Zeitdruck, Lärm, Unterbrechungen, wechselnde Beleuchtung,
Rückfragen per Funk), aber kein Produktwissen mitbringt.

## Scope und Methodik

- **Grundlage:** ausschließlich Code und Repo-Dokumentation (`src/renderer/src`, `src/shared`,
  `src/main` soweit für das beobachtbare Verhalten nötig, `README.md`, `AGENTS.md`, `TODO.md`,
  `e2e/`, `test/`), Stand des Arbeitsverzeichnisses `/home/user/S1-Control`.
- **Einschränkung (wichtig):** **Es lief keine Instanz der Anwendung, es lagen keine Screenshots
  und keine Bildschirmaufzeichnungen vor.** Es konnte daher nichts direkt bedient, gemessen oder
  reproduziert werden. Alle Befunde sind aus dem Quellcode abgeleitet. Die Evidenzstufen sind
  entsprechend konservativ gesetzt:
  - **Beobachtet** = im Code eindeutig und ohne Laufzeitannahme ablesbar (z. B. fehlender
    Bestätigungsdialog, Beschriftungstext, fehlender Navigationspunkt).
  - **Wahrscheinlich** = ergibt sich zwingend aus Codelogik, ist aber nicht am laufenden System
    nachgestellt (z. B. Reset von Formularzeilen durch Polling).
  - **Nicht verifiziert** = Feldbedingung, die nur am Gerät prüfbar ist (Lesbarkeit bei Sonne,
    reale Klickgrößen auf einem konkreten Display, SMB-Aussetzer).
- **Zielplattform:** Electron-Desktop-App (Maus/Tastatur, Laptop im Fahrzeug, FüSt-Zelt oder
  Führungsstellenraum). Handschuh-/Einhand-Kriterien wurden deshalb sinngemäß als
  „grobmotorische Bedienung auf Touchpad/Touchscreen im Fahrzeug“ gewertet, nicht als
  Smartphone-Kriterien.
- **Keine Codeänderungen.** Es wurden ausschließlich Dateien gelesen und diese Auditdatei erzeugt.

### Abgeleitete Aufgaben (Szenarien)

Da keine Aufgaben vorgegeben waren, wurden die aus `README.md` und `e2e/features/einsatz-lifecycle.feature`
erkennbaren Hauptaufgaben geprüft:

| # | Aufgabe | Ergebnis (codebasiert) |
|---|---------|------------------------|
| 1 | Einsatz anlegen / öffnen | machbar |
| 2 | Einheit erfassen, Stärke eintragen | machbar, aber ohne Rückmeldung über Speicherung |
| 3 | Helfer einer Einheit pflegen / löschen | machbar, aber ohne Rückfrage und ohne Rückgängig |
| 4 | Einheit/Fahrzeug in anderen Abschnitt verschieben | machbar, aber Dialog nennt das Objekt nicht |
| 5 | Einheit splitten | machbar, Fehler erst nach dem Absenden |
| 6 | Fehler korrigieren / Aktion zurücknehmen | **nicht möglich** (keine Undo-Bedienung) |
| 7 | Einsatz schließen / anderen Einsatz öffnen | **nur über einen fremd beschrifteten Umweg** |
| 8 | Einsatzakte/Doku ausgeben | **nicht möglich** (kein Bedienweg) |
| 9 | Erkennen, ob eigene Eingabe wirklich in der Einsatzdatei steht | **nicht möglich** |

### Mentales Modell des Helfers (Annahme)

Der Helfer erwartet eine digitale Stärkemeldung/Kräfteübersicht wie ein Formular auf Papier:
eintragen, abzeichnen, Bestätigung sehen, im Zweifel durchstreichen und korrigieren. Er erwartet,
dass das Programm sagt, ob seine Eintragung „drin“ ist, dass gefährliche Schritte nachfragen und
dass er falsch Gedrücktes zurücknehmen kann. Alles, was nur ein Programmierer weiß (Pfad, DB-Datei,
Ports, Logs), erwartet er nicht auf seinem Arbeitsbildschirm.

---

## P0 – Einsatzblocker

### [P0] „Backup laden“ überschreibt die laufende Einsatzdatei ohne jede Rückfrage und ohne Sicherung

**Evidenz:** Beobachtet
**Fundstellen:**
- `src/renderer/src/components/views/SettingsView.tsx:226-228` (Schaltfläche „Backup laden“, direkt neben „Verzeichnis speichern“ und „Auf Updates prüfen“)
- `src/renderer/src/app/useSystemActions.ts:54-73` (`restoreBackup`, keinerlei Bestätigung)
- `src/main/ipc/register-einsatz-ipc.ts:368-386` (Dateiauswahldialog, danach sofort Wiederherstellung)
- `src/main/services/backup.ts:59-62` (`fs.copyFileSync(backupFilePath, dbPath)` – die aktive Einsatzdatei wird hart überschrieben)

**Reaktion des Helfers:** „Backup laden“ liest sich wie „Sicherung ansehen/holen“. Wer im Einsatz
den Verdacht hat, es sei etwas verloren gegangen, drückt genau das – zur Kontrolle.

**Problem:** Es gibt (a) keine Sicherheitsabfrage, (b) keine Anzeige, welcher Stand geladen wird
bzw. wie alt er ist, (c) keine Kopie des aktuellen Standes vor dem Überschreiben, (d) keinen
Hinweis, dass die Wiederherstellung auf einer gemeinsam genutzten Datei alle anderen Clients
betrifft. Die Backups werden zudem nur alle 5 Minuten geschrieben (`src/main/services/backup.ts:5`,
`:60-86`), es gehen also bis zu 5 Minuten Lageeintragungen verloren.

**Auswirkung im Einsatz:** Ein Fehlgriff löscht die aktuelle Lage aller Abschnitte – unwiderruflich
und für alle Arbeitsplätze auf dem Share gleichzeitig. Die Stärkemeldung an die übergeordnete
Führungsstelle wird falsch, ohne dass jemand es merkt.

**Empfehlung:**
1. Beschriftung in Klartext ändern, z. B. „Einsatzstand aus Sicherung zurücksetzen (überschreibt aktuellen Stand)“.
2. Zweistufige Bestätigung mit Klartextfolge: welcher Sicherungszeitpunkt, wie viele Minuten Arbeit verloren gehen, wer sonst noch am Einsatz arbeitet (die Client-Liste ist vorhanden, `SettingsView.tsx:246-249`).
3. Vor dem Überschreiben automatisch eine Sicherung des aktuellen Standes anlegen und den Pfad im Erfolgstext nennen.
4. Die Schaltfläche optisch und räumlich von den harmlosen Einstellungen trennen (eigener Bereich „Wiederherstellung“).

**Nachtest:** Backup laden auswählen, Dialog abbrechen → Stand unverändert. Dialog bestätigen →
Meldung nennt Sicherungszeitpunkt und Pfad der vorher erstellten Schutzkopie; zweiter Client zeigt
eine Meldung, dass der Einsatzstand zurückgesetzt wurde.

---

### [P0] Folgenschwere Aktionen ohne Rückfrage – und die vorhandene Rückgängig-Funktion ist nicht bedienbar

**Evidenz:** Beobachtet
**Fundstellen:**
- `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:161-163` („Löschen“ je Helferzeile, sofort wirksam)
- `src/renderer/src/app/einheit-actions/useEinheitHelferActions.ts:64-75` (Löschen ohne jede Abfrage)
- `src/renderer/src/components/dialogs/MoveDialog.tsx:33-38` („Bestätigen“ ohne Angabe des betroffenen Objekts)
- `src/renderer/src/components/dialogs/SplitEinheitDialog.tsx:71-79`
- Keine einzige Bestätigungsabfrage im gesamten Renderer (Suche nach `confirm` im Renderer bleibt leer)
- Rückgängig **existiert** in Kern und IPC: `src/shared/ipc.ts:215-216`, `:330-331`, `src/main/preload.ts:41-42`
- …hat aber **keine Bedienoberfläche**; der eigene E2E-Test umgeht sie per IPC und hält das ausdrücklich fest: `e2e/steps/einsatz.steps.ts:232-241` („Kein UI-Button für Undo vorhanden → IPC direkt aufrufen“)

**Reaktion des Helfers:** Er rechnet bei „Löschen“ mit einer Rückfrage und bei einem Fehlgriff mit
„Strg+Z“ oder einem sichtbaren „Rückgängig“. Beides gibt es nicht.

**Problem:** Verschieben, Splitten und Löschen von Personal sind sofort wirksam, betreffen die
gemeinsame Einsatzdatei und sind aus der Oberfläche heraus nicht zurücknehmbar. Bei
Zeilentabellen mit vielen gleich aussehenden Zeilen (10 Spalten, `EinheitHelferSection.tsx:198-209`)
ist das Vergreifen um eine Zeile die wahrscheinlichste Fehlbedienung überhaupt.

**Auswirkung im Einsatz:** Stärkeangaben werden unbemerkt falsch; eine versehentlich verschobene
Einheit steht im falschen Abschnitt und wird dort disponiert. Korrektur nur durch Nacherfassung
aus dem Gedächtnis.

**Empfehlung:**
1. Die vorhandene Undo-Funktion sichtbar machen: dauerhaft erreichbare Schaltfläche „Letzte Änderung zurücknehmen“ in der Kopfzeile, aktiv gesteuert über das bereits existierende `hasUndoableCommand`, mit Klartext der letzten Aktion („Zuletzt: OV Oldenburg nach EA Nord verschoben“).
2. Löschen von Helferzeilen mit Rückfrage versehen, die den Namen/die Rolle der Zeile nennt – oder als „Zeile entfernen + 10 s Widerrufshinweis“ umsetzen.
3. Verschieben/Splitten: Vorher-Nachher im Dialog anzeigen (siehe P2-Befund zum Verschiebedialog).

**Nachtest:** Helferzeile löschen → Rückfrage nennt die Zeile; danach ist die Aktion über
„Letzte Änderung zurücknehmen“ wiederherstellbar, ohne dass ein Administrator eingreifen muss.

---

## P1 – Gravierend

### [P1] Nach dem Speichern gibt es keinerlei Rückmeldung, ob die Eintragung in der Einsatzdatei angekommen ist

**Evidenz:** Beobachtet
**Fundstellen:**
- `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:119-147` (Speichern schließt nur den Editor)
- `src/renderer/src/app/useAppControllers.ts:25-37` (`withBusy`: setzt nur `busy`/`error`, kein Erfolgssignal)
- Im gesamten Renderer existiert keine Erfolgs-/Bestätigungsmeldung (keine Toast-/Statuszeile; die einzigen Banner sind Update- und Fehlerbanner, `src/renderer/src/components/views/AppWorkspaceShell.tsx:308-315`, `src/renderer/src/components/common/UpdaterUi.tsx:94-158`)

**Reaktion des Helfers:** „Ist das jetzt drin? Muss ich das der Führung schon melden?“ Er sucht
nach einem Häkchen, einer Zeitangabe oder wenigstens „gespeichert“.

**Problem:** Die einzige Rückmeldung ist, dass sich ein Formular schließt. Auf einem Netzlaufwerk
(SMB/WAL-Betrieb laut `README.md` und `AGENTS.md` Abschnitt 3-4) ist genau die Frage „ist meine
Eingabe wirklich in der gemeinsamen Datei“ die entscheidende. Ebenso fehlt eine Anzeige, wann
zuletzt Daten anderer Arbeitsplätze übernommen wurden (Polling alle 6 s,
`src/renderer/src/app/useSyncEvents.ts:56-64` – für den Benutzer unsichtbar).

**Auswirkung im Einsatz:** Doppelte Erfassung „zur Sicherheit“, oder Meldung einer Stärke, die nie
geschrieben wurde. Bei kurzzeitig weggebrochenem Share merkt der Helfer den Unterschied zwischen
„gespeichert“ und „verworfen“ nicht.

**Empfehlung:** Eine dauerhaft sichtbare Statuszeile in der Kopfzeile mit drei Klartextzuständen –
„Einsatzdatei erreichbar, zuletzt abgeglichen HH:MM:SS“ / „Speichern läuft“ / „Nicht gespeichert:
Einsatzdatei nicht erreichbar“ – plus eine kurze, nicht wegklickpflichtige Bestätigung je
Speichervorgang mit Objektname und Uhrzeit.

**Nachtest:** Einheit speichern → sichtbare Bestätigung mit Name und Uhrzeit. Netzlaufwerk trennen,
erneut speichern → unmissverständliche Meldung „nicht gespeichert“ inkl. Hinweis, was der Benutzer
tun soll.

---

### [P1] Bereits getippte, noch nicht gespeicherte Fahrzeugzeilen werden alle 6 Sekunden automatisch zurückgesetzt

**Evidenz:** Wahrscheinlich (aus der Codelogik zwingend, nicht am laufenden System nachgestellt)
**Fundstellen:**
- `src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:127-129` – `useEffect` setzt die Bearbeitungszeilen bei **jeder** Änderung von `props.fahrzeuge` neu aus den Serverdaten
- `src/renderer/src/app/useEinsatzData.ts:61-81` – auch ein Refresh mit `includeFullOverview: false` ruft `setAllFahrzeuge(...)` mit einem **neu erzeugten Array** auf
- `src/renderer/src/app/useSyncEvents.ts:56-64` – dieser Refresh läuft automatisch alle 6 s
- zusätzlich bei jeder Fremdänderung: `src/renderer/src/app/useSyncEvents.ts:206-227`

**Reaktion des Helfers:** Er tippt Kennzeichen und Funkrufname, wird vom Funk unterbrochen, schaut
zurück – und das Feld steht wieder auf dem alten Wert. Er hält das für einen eigenen Fehler und
tippt erneut.

**Problem:** Lokale, noch nicht abgesendete Eingaben werden durch den Hintergrundabgleich
überschrieben, ohne Hinweis. Betroffen ist die Fahrzeugtabelle im Einheiten-Editor
(`src/renderer/src/components/editor/shared/EinheitFahrzeugeSection.tsx`).

**Auswirkung im Einsatz:** Eingabeverluste genau in den Momenten, in denen der Helfer abgelenkt ist –
also in der Regel. Falsche oder fehlende Kennzeichen/Funkrufnamen in der Fahrzeugübersicht.

**Empfehlung:** Bereits veränderte Zeilen beim Hintergrundabgleich nicht überschreiben („dirty“-Zustand
je Zeile führen). Kommt für eine solche Zeile eine Fremdänderung, sie markieren und den Konflikt
anzeigen („Dieser Datensatz wurde von PC-X geändert – deine Eingabe behalten / fremde Werte übernehmen“),
statt stillschweigend zurückzusetzen.

**Nachtest:** Kennzeichen eintippen, 30 s warten, nichts anfassen → Eingabe steht unverändert.
Zweiter Client ändert dasselbe Fahrzeug → sichtbarer Konflikthinweis statt stillem Reset.

---

### [P1] Kein Bedienweg, um einen Einsatz zu schließen oder zu wechseln – der einzige Weg ist eine falsch beschriftete Schaltfläche

**Evidenz:** Beobachtet
**Fundstellen:**
- `src/renderer/src/components/layout/WorkspaceRail.tsx:72-111` (Navigation: E, G, K, F, Zahnrad – kein „Einsatz schließen“)
- `src/renderer/src/components/layout/Topbar.tsx:49-56` (Kopfzeile: nur Monitor öffnen/schließen)
- `src/renderer/src/app/useSystemActions.ts:37-43` – „Verzeichnis speichern“ ruft als Nebenwirkung `clearSelectedEinsatz()` auf und wirft den Benutzer zurück auf den Startbildschirm
- `src/renderer/src/components/views/SettingsView.tsx:223-225` (Beschriftung „Verzeichnis speichern“)
- Der eigene E2E-Test dokumentiert genau diesen Umweg: `e2e/steps/einsatz.steps.ts:309-321`

**Reaktion des Helfers:** Bei Ablösung oder Zweitlage sucht er „Einsatz schließen“ oder „Anderen
Einsatz öffnen“. Er findet nichts und probiert die Einstellungen durch.

**Problem:** Eine normale, häufige Aufgabe hat keinen erkennbaren Bedienweg; die faktische Lösung
ist eine Schaltfläche, deren Beschriftung („Verzeichnis speichern“) die Folge (Einsatz schließen)
nicht andeutet. Zusätzlich werden dabei gehaltene Bearbeitungssperren nicht freigegeben
(`src/renderer/src/app/useWorkspaceLifecycle.ts:30-40` gibt keine Locks zurück), sie laufen erst
nach 45 s ab (`src/main/services/record-lock.ts:8`).

**Auswirkung im Einsatz:** Zeitverlust bei der Übergabe; versehentliches Schließen des laufenden
Einsatzes beim Speichern eines Pfades; Kollegen sehen bis zu 45 s lang „Gesperrt“ auf Datensätzen,
die niemand bearbeitet.

**Empfehlung:** In der Kopfzeile eine eigene Bedienung „Einsatz schließen / wechseln“ mit
Rückfrage ergänzen; „Verzeichnis speichern“ auf seine eigentliche Funktion begrenzen bzw. die
Folge in der Rückfrage benennen. Beim Schließen alle eigenen Sperren aktiv freigeben.

**Nachtest:** Einsatz über die Kopfzeile schließen → Rückfrage, danach Startbildschirm; der zweite
Client zeigt die betroffenen Datensätze sofort wieder als frei an.

---

### [P1] Die Einsatzakte lässt sich nicht ausgeben – die Ansicht ist im Programm nicht erreichbar

**Evidenz:** Beobachtet
**Fundstellen:**
- `src/renderer/src/components/views/ExportView.tsx:14-26` (vollständige Export-Ansicht vorhanden)
- Diese Komponente wird **nirgends eingebunden** (kein Treffer außerhalb der eigenen Datei)
- `src/renderer/src/types/ui.ts:14-19` – die Navigationszustände enthalten keinen Export
- Die Funktion existiert im Hintergrund: `src/main/preload.ts:43`, `src/main/ipc/register-einsatz-ipc.ts:388-400`

**Reaktion des Helfers:** Zum Abschluss oder zur Übergabe an den nächsten Dienst will er die Lage
ausdrucken bzw. als Akte sichern. Er sucht „Export“, „Drucken“, „Einsatzakte“ – und findet nichts.

**Problem:** Die einzige Möglichkeit, aus der App etwas Papier- oder übergabefähiges zu erzeugen
(ZIP mit HTML-Report und CSV), hat keinen Bedienweg.

**Auswirkung im Einsatz:** Keine Rückfallebene auf Papier, keine saubere Übergabe, keine
Dokumentation für die Nachbereitung. Bei Geräte- oder Stromausfall bleibt nur das, was jemand
parallel handschriftlich geführt hat.

**Empfehlung:** Export als eigenen Punkt in die Navigationsleiste aufnehmen (mit Klartextnamen,
nicht als Buchstabe) und zusätzlich in der Kopfzeile als „Lage ausdrucken/sichern“ anbieten.

**Nachtest:** Aus der Navigationsleiste heraus eine Einsatzakte erzeugen und den erzeugten Pfad
in der Bestätigung lesen können.

---

### [P1] Fehlermeldungen sind technische Originaltexte ohne Handlungsanweisung

**Evidenz:** Beobachtet
**Fundstellen:**
- `src/main/ipc/register-ipc.ts:42-47` (technische Fehlermeldung wird unverändert an die Oberfläche durchgereicht)
- `src/main/services/errors.ts:16-26`
- `src/renderer/src/utils/error.ts:4-9` (Rückfalltext ist wörtlich „Fehler“)
- Anzeige: `src/renderer/src/components/views/AppWorkspaceShell.tsx:312` (`error-banner`, ohne Schließen-Bedienung, ohne Zeitstempel – anders als die Update-Meldungen, die eine Schließen-Bedienung haben: `src/renderer/src/components/common/UpdaterUi.tsx:96`)

**Reaktion des Helfers:** Er liest „SQLITE_BUSY“ oder „EPERM …\\server\\share\\einsatz.s1control“
und weiß nicht, ob seine Eingabe verloren ist, ob er es nochmal versuchen soll oder ob er Hilfe
holen muss. Der Rückfalltext „Fehler“ sagt gar nichts.

**Problem:** Keine Einordnung (schlimm/harmlos), keine Angabe, ob die Eingabe gespeichert wurde,
keine nächste Handlung, kein Wegklicken möglich.

**Auswirkung im Einsatz:** Der Helfer bricht ab oder arbeitet weiter, ohne zu wissen, ob Daten
fehlen; Fehlerbanner bleiben stehen und werden dadurch ignoriert („Banner-Blindheit“).

**Empfehlung:** Häufige Fälle in Klartext übersetzen (Datei gesperrt / Netzlaufwerk nicht
erreichbar / Datensatz wird bearbeitet), jeweils mit Satz „Deine Eingabe wurde (nicht) gespeichert“
und einer konkreten nächsten Handlung sowie einer Schaltfläche „Erneut versuchen“. Technische
Details nur auf Anforderung („Details anzeigen“).

**Nachtest:** Netzlaufwerk während des Speicherns trennen → Meldung in Klartext mit klarer Aussage
über den Verbleib der Eingabe und einer Wiederholmöglichkeit.

---

### [P1] Die angezeigte Gesamtstärke rechnet Abschnitte vom Typ „ANFAHRT“ heraus, ohne dass das irgendwo steht

**Evidenz:** Beobachtet
**Fundstellen:**
- `src/renderer/src/app/useEinsatzData.ts:239-259` (Abschnitte mit `systemTyp === 'ANFAHRT'` werden bei der Summe übersprungen)
- Anzeige ohne jeden Hinweis: `src/renderer/src/components/layout/Topbar.tsx:40-43` und im Vollbild-Monitor `src/renderer/src/components/views/StrengthDisplayView.tsx`

**Reaktion des Helfers:** Er addiert zur Kontrolle die Abschnitte im Kopf, kommt auf eine andere
Zahl als die Kopfzeile und traut der Anzeige nicht mehr.

**Problem:** Eine fachlich sinnvolle Regel (Anfahrende zählen nicht zur verfügbaren Stärke) ist
unsichtbar. Weder Kopfzeile noch Stärke-Monitor benennen die Bezugsgröße.

**Auswirkung im Einsatz:** Die gemeldete Stärke weicht von der selbst nachgerechneten ab –
Rückfragen, Misstrauen gegenüber der Anzeige, im ungünstigen Fall eine falsche Meldung nach oben.

**Empfehlung:** Bezugsgröße beschriften („Stärke vor Ort (ohne Anfahrt)“) und die herausgerechnete
Anfahrtsstärke als zweiten, kleineren Wert danebenstellen. Gleiches im Vollbild-Monitor, der von
mehreren Personen aus Entfernung abgelesen wird.

**Nachtest:** Einheit in einen ANFAHRT-Abschnitt legen → Kopfzeile zeigt unveränderte Vor-Ort-Stärke
und zusätzlich „+n in Anfahrt“.

---

### [P1] Hauptnavigation besteht aus einzelnen Buchstaben (E, G, K, F), der Sinn steht nur im Tooltip

**Evidenz:** Beobachtet
**Fundstelle:** `src/renderer/src/components/layout/WorkspaceRail.tsx:72-111` (Beschriftungen `E`, `G`, `K`, `F` und ein Zahnrad; Klartext nur im `title`-Attribut)

**Reaktion des Helfers:** „E“ und „G“ erschließen sich nicht – „G“ steht für Führungsstruktur, das
errät niemand. Er klickt sich durch, bis die richtige Ansicht erscheint.

**Problem:** Produktinterne Abkürzungen statt Aufgabenbezeichnungen. Tooltips erfordern ruhiges
Zeigen mit der Maus, das bei Zeitdruck, Touchpad-Bedienung oder Touchscreen nicht funktioniert.
Beim schmalen Layout wird die Leiste zusätzlich waagerecht umgebrochen
(`src/renderer/src/styles/app.css:1215-1222`), wodurch die Buchstaben ohne jeden Kontext nebeneinander stehen.

**Auswirkung im Einsatz:** Verzögertes Auffinden der richtigen Ansicht bei jedem Wechsel; bei
seltener Nutzung jedes Mal erneut.

**Empfehlung:** Klartext neben dem Symbol („Einsatz“, „Führungsstruktur“, „Kräfte“, „Fahrzeuge“,
„Einstellungen“); wenn Platz knapp ist, Symbol plus Kurzwort untereinander, nicht Buchstaben allein.

**Nachtest:** Eine Person ohne Einweisung soll ohne Mausverweilen die Fahrzeugübersicht öffnen.

---

### [P1] Statuswerte werden als technische Großbuchstaben-Schlüssel angezeigt, ohne Farb- oder Symbolunterscheidung

**Evidenz:** Beobachtet
**Fundstellen:**
- Anzeige in Tabellen: `src/renderer/src/components/tables/EinheitRow.tsx:118`, `src/renderer/src/components/tables/FahrzeugRow.tsx:95`, Kachel „Status“ in `src/renderer/src/components/views/EinsatzOverviewView.tsx:36-39`
- Auswahlfelder ebenso: `src/renderer/src/components/editor/inline/EinheitFormRows.tsx:38-42`, `src/renderer/src/components/dialogs/EinheitFormFields.tsx:114-118`, `src/renderer/src/components/editor/inline/InlineFahrzeugEditor.tsx:34-37`
- Für Organisationen existiert eine saubere Klartextabbildung (`src/renderer/src/constants/organisation.ts:3-18`, `prettyOrganisation`), für Status nicht.

**Reaktion des Helfers:** „IN_BEREITSTELLUNG“ und „AUSSER_BETRIEB“ liest er als Datenbankeintrag,
nicht als Lagebild. Beim schnellen Überfliegen einer langen Tabelle sehen alle Statuswerte gleich aus.

**Problem:** Unterstrich-Großschreibung ist Programmiersprache, kein Einsatzbegriff. Es gibt keine
zusätzliche, nicht rein textliche Kodierung (Farbe **und** Symbol/Form), mit der ein außer Betrieb
stehendes Fahrzeug beim Überfliegen auffällt. Inkonsistent ist zudem, dass an einer Stelle bereits
„AUSSER BETRIEB“ mit Leerzeichen steht (`src/renderer/src/components/editor/shared/EinheitFahrzeugeSection.tsx:94`),
an anderer „AUSSER_BETRIEB“ (`InlineFahrzeugEditor.tsx:36`).

**Auswirkung im Einsatz:** Ein defektes Fahrzeug wird beim Überfliegen der Liste eingeplant.

**Empfehlung:** Klartextbeschriftungen („Im Einsatz“, „In Bereitstellung“, „Außer Betrieb“,
„Abgemeldet“), einheitlich in Anzeige und Auswahl, und eine zusätzliche nicht-farbliche
Kennzeichnung (z. B. Form/Symbol), damit der Zustand auch bei schlechter Sicht und für
farbsehschwache Nutzer erkennbar bleibt.

**Nachtest:** In einer Fahrzeugliste mit 30 Zeilen alle außer Betrieb stehenden Fahrzeuge in unter
5 Sekunden finden.

---

## P2 – Reibung

### [P2] Zeilenaktionen sind reine Symbole ohne Beschriftung, klein und dicht beieinander

**Evidenz:** Beobachtet (Größe im CSS), Nicht verifiziert (tatsächliche Trefferquote am Gerät)
**Fundstellen:** `src/renderer/src/components/common/ActionIconButton.tsx:208-219` (nur `aria-label`/`title`),
`src/renderer/src/components/tables/EinheitRow.tsx:78-99` (drei Symbole nebeneinander: Verschieben,
Bearbeiten, Splitten), `src/renderer/src/styles/app.css:731-738` (34 × 34 px, ohne zusätzlichen Abstand)

**Reaktion des Helfers:** Ein Pfeilkreuz, ein Stift und ein „Verzweigungs“-Symbol – „Splitten“ ist
als Symbol nicht erratbar. Er muss jedes Mal mit der Maus verweilen.

**Problem:** Symbolbedeutung nur per Tooltip; 34 px sind für grobmotorische Bedienung (Touchscreen
im Fahrzeug, kalte Finger, Handschuh) klein, und die Aktionen mit sehr unterschiedlicher Tragweite
(Bearbeiten vs. Verschieben vs. Splitten) liegen unmittelbar nebeneinander.

**Auswirkung im Einsatz:** Fehlgriffe zwischen harmlosen und folgenschweren Aktionen – die mangels
Rückfrage und Undo (siehe P0) sofort wirken.

**Empfehlung:** Mindestens 44 px Zielgröße mit sichtbarem Abstand; Beschriftung am Symbol oder in
einem aufklappenden Menü mit Klartext; folgenschwere Aktionen (Verschieben, Splitten) optisch von
„Bearbeiten“ absetzen.

**Nachtest:** Mit Arbeitshandschuhen auf einem Touch-Convertible 20 Zeilen nacheinander korrekt
bearbeiten, ohne einmal Verschieben oder Splitten auszulösen.

---

### [P2] Keine Nachtdarstellung; die Oberfläche ist fest hell ausgelegt

**Evidenz:** Beobachtet (im CSS), Nicht verifiziert (Blendung/Lesbarkeit real)
**Fundstellen:** `src/renderer/src/styles/app.css:1-14` (`color-scheme: light`, feste helle Farbwerte),
`:21-23` (heller Farbverlauf als Seitenhintergrund), `:70-76` (Startbildschirm mit Foto-Hintergrund
und Aufhellung), im gesamten Stylesheet gibt es **keine** `prefers-color-scheme`-Regel.

Eine dunkle Darstellung existiert nur für den Vollbild-Stärkemonitor
(`src/renderer/src/components/views/StrengthDisplayView.tsx`, Klasse `is-inverted`,
`src/renderer/src/styles/app.css:1195-1202`) – also gerade nicht für die Arbeitsansichten.

**Reaktion des Helfers:** Im abgedunkelten FüSt-Zelt oder im Fahrzeug bei Nacht blendet die helle
Fläche; er dreht die Bildschirmhelligkeit herunter und kann dann die kleinen Beschriftungen
(11–13 px, z. B. `app.css:103,109,687,752,763,795`) nicht mehr lesen.

**Problem:** Keine dunkle Darstellung für die Arbeitsansichten, viele sehr kleine Schriftgrößen,
Hilfstexte in Grau auf Hellgrau (`--muted: #5d6675` auf `#f9fbfe`).

**Auswirkung im Einsatz:** Blendung und Nachtsichtverlust bei Nacht; schlechte Ablesbarkeit bei
Sonnenlicht; Ermüdung über lange Lagen.

**Empfehlung:** Dunkle Darstellung für die Arbeitsansichten anbieten und umschaltbar machen (nicht
nur automatisch); Mindestschriftgröße für Statusinformationen anheben; Hilfstexte kontraststärker.

**Nachtest:** Im abgedunkelten Raum und bei direkter Sonne jeweils Stärke, Status und
Abschnittsname ohne Nachjustieren ablesen.

---

### [P2] Der Verschiebedialog nennt nicht, was verschoben wird und woher

**Evidenz:** Beobachtet
**Fundstelle:** `src/renderer/src/components/dialogs/MoveDialog.tsx:22-41` – Überschrift „Einheit
verschieben“, ein Auswahlfeld mit Abschnittsnamen, Schaltfläche „Bestätigen“. Der Name der Einheit,
der aktuelle Abschnitt und die Stärke fehlen; der Zustand enthält nur die ID
(`src/renderer/src/types/ui.ts:9-12`).

**Reaktion des Helfers:** Nach einer Unterbrechung sieht er den offenen Dialog und weiß nicht mehr,
welche Zeile er angeklickt hatte. Er bestätigt trotzdem.

**Problem:** Der Dialog ist ohne Gedächtnis an den vorherigen Klick nicht interpretierbar; die
Vorbelegung ist der erste Abschnitt, nicht „unverändert“.

**Auswirkung im Einsatz:** Die falsche Einheit landet im falschen Abschnitt – ohne Rückfrage, ohne Undo.

**Empfehlung:** Überschrift bzw. Text in der Form „„OV Oldenburg“ (9 Helfer) verschieben von
FüSt 1 → …“, Zielauswahl ohne Vorbelegung („Bitte Ziel wählen“) und Schaltfläche mit konkreter
Aufschrift („Nach EA Nord verschieben“).

**Nachtest:** Dialog öffnen, 30 s wegsehen, zurückkehren → Objekt, Herkunft und Ziel sind ohne
Rückblättern erkennbar.

---

### [P2] Formulare reagieren nicht auf Eingabe-/Escape-Taste; Abbrechen verwirft Eingaben ohne Warnung

**Evidenz:** Beobachtet
**Fundstellen:** Alle Dialoge sind `div`-Container ohne `form`-Element und ohne Tastaturbehandlung,
z. B. `src/renderer/src/components/dialogs/CreateAbschnittDialog.tsx:105-154`,
`EditEinheitDialog.tsx:178-194`, `MoveDialog.tsx:22-41`; eine Escape-Behandlung gibt es nur im
Vollbild-Stärkemonitor (`src/renderer/src/components/views/StrengthDisplayView.tsx:97-101`).
„Abbrechen“ schließt ohne Rückfrage und verwirft die Eingaben
(`src/renderer/src/app/useWorkspaceLifecycle.ts:42-59`).

**Reaktion des Helfers:** Nach dem Tippen des Namens drückt er Enter – es passiert nichts. Er
drückt Escape – es passiert nichts. Beim versehentlichen „Abbrechen“ ist alles Getippte weg.

**Problem:** Erwartete Tastaturbedienung fehlt; der einzige Weg zum Schließen ist die
Abbrechen-Schaltfläche, die unmittelbar neben „Speichern“ liegt (`modal-actions`, `app.css:828-832`)
und ohne Warnung verwirft.

**Auswirkung im Einsatz:** Tempoverlust bei der Massenerfassung; gelegentlicher Verlust eines
vollständig ausgefüllten Erfassungsbogens.

**Empfehlung:** Eingabetaste löst Speichern aus, Escape löst Abbrechen aus; bei geänderten Feldern
vor dem Verwerfen kurz rückfragen.

**Nachtest:** Einheit vollständig per Tastatur anlegen; nach Änderungen „Abbrechen“ drücken →
Rückfrage erscheint.

---

### [P2] Entwickler- und Diagnosefunktionen stehen mitten in der Arbeitsoberfläche

**Evidenz:** Beobachtet
**Fundstellen:**
- „DevTools öffnen“ direkt auf dem Startbildschirm: `src/renderer/src/components/views/StartView.tsx:48-50`
- „UDP Broadcast Monitor“ mit Rohprotokoll unterhalb der Einsatzübersicht: `src/renderer/src/components/views/EinsatzOverviewView.tsx:56-59`
- Einstellungen enthalten „Peer Update Status“, „Peer Artefakte im Netzwerk“ (mit Spalten „Freshness“, „RTT“), „Debug Sync Logs“, „UDP Debug Monitor“: `src/renderer/src/components/views/SettingsView.tsx:251-258`, `:161-196`
- Hinweistext nennt eine Umgebungsvariable als Bedienanweisung: `src/renderer/src/components/views/SettingsView.tsx:114` / `:125` („Inaktiv (S1_UPDATER_LAN_PEER=1 setzen)“)

**Reaktion des Helfers:** Er hält die Protokollfenster für etwas, das er beachten muss, oder er
öffnet die DevTools und steht vor einem Entwicklerfenster, das er nicht wieder wegbekommt.

**Problem:** Diagnoseoberflächen ohne Einsatzbezug konkurrieren mit den Arbeitsinhalten;
Umgebungsvariablen sind keine Handlungsanweisung für einen Helfer.

**Auswirkung im Einsatz:** Ablenkung, Fehlinterpretation („da stimmt was nicht“),
Bedienunsicherheit; im Zweifel ein Anruf beim Fachberater IT.

**Empfehlung:** Diagnose in einen klar als solchen benannten, standardmäßig eingeklappten Bereich
verlagern (oder hinter einen Startparameter legen); die Einsatzübersicht enthält ausschließlich
Lageinformationen; Hinweise in Handlungssprache statt Variablennamen.

**Nachtest:** Ein Helfer ohne IT-Auftrag findet auf Start- und Übersichtsseite nichts, was er nicht
für die Lageführung braucht.

---

### [P2] Während laufender Vorgänge wird alles gesperrt, aber nichts zeigt, dass gearbeitet wird

**Evidenz:** Wahrscheinlich
**Fundstellen:** `src/renderer/src/app/useAppControllers.ts:25-37` (globales `busy`), Auswertung als
`disabled` an nahezu allen Schaltflächen (z. B. `Topbar.tsx:50-55`, `WorkspaceSections.tsx:165-171`,
`SettingsView.tsx:223-231`). Eine sichtbare Fortschrittsanzeige gibt es nur beim erstmaligen Laden
eines Einsatzes (`src/renderer/src/components/views/AppWorkspaceShell.tsx:343-353`).

**Reaktion des Helfers:** Auf dem trägen Netzlaufwerk sind plötzlich alle Schaltflächen grau. Er
weiß nicht, ob das Programm arbeitet oder hängt, und klickt mehrfach.

**Problem:** „Arbeitet“ und „hängt“ sind nicht unterscheidbar; es gibt keine Abbruchmöglichkeit und
keine Zeitangabe.

**Auswirkung im Einsatz:** Unnötige Programmneustarts mitten in der Lage.

**Empfehlung:** Bei Vorgängen über ca. 300 ms eine sichtbare, benannte Fortschrittsanzeige („Speichere
Einheit …“) einblenden; nach mehreren Sekunden ergänzen um „Netzlaufwerk antwortet langsam“.

**Nachtest:** Speichern auf einem künstlich verlangsamten Share → durchgehend erkennbar, dass und
woran gearbeitet wird.

---

### [P2] Sperrhinweise nennen keinen Menschen, weil alle Nutzer „admin“ heißen

**Evidenz:** Beobachtet
**Fundstellen:** Sperranzeige „In Bearbeitung: RECHNERNAME (BENUTZER)“
(`src/renderer/src/components/tables/EinheitRow.tsx:24-33`, `FahrzeugRow.tsx:21-30`,
`AbschnittSidebar.tsx:174-186`); Anmeldung erfolgt laut `README.md` automatisch als
Standardbenutzer `admin` (`src/main/services/auth.ts:46-53`, Hinweistext „Standard: admin / admin“
in `src/renderer/src/components/views/LoginView.tsx:39`).

**Reaktion des Helfers:** „Gesperrt von LAPTOP-FUEST2 (admin)“ – wen soll er ansprechen? Er ruft
quer durch den Raum oder wartet.

**Problem:** Die Benutzerangabe ist in der Praxis konstant und damit informationslos; es gibt keine
Möglichkeit, sich mit Rolle/Name am Platz kenntlich zu machen, und keinen Weg, eine hängende Sperre
sichtbar auslaufen zu sehen (Restlaufzeit 45 s, `src/main/services/record-lock.ts:8`, wird nicht angezeigt).

**Auswirkung im Einsatz:** Wartezeiten und Rückfragen an genau der Stelle, wo schnell geschrieben
werden müsste.

**Empfehlung:** Beim Öffnen eines Einsatzes einmalig „Wer sitzt hier?“ abfragen (freier Text,
z. B. „S1 Platz 2 / Müller“) und diesen Text in Sperrhinweisen führen; Restlaufzeit der Sperre
anzeigen („wird in 30 s automatisch frei“).

**Nachtest:** Zwei Clients bearbeiten dieselbe Einheit → der zweite sieht Platz/Name und die
verbleibende Wartezeit.

---

### [P2] Begriffe aus der Datenmodellierung im Dialog „Abschnitt anlegen“

**Evidenz:** Beobachtet
**Fundstelle:** `src/renderer/src/components/dialogs/CreateAbschnittDialog.tsx:118-144` – Feld
„Systemtyp“ mit Werten `NORMAL / FUEST / ANFAHRT / LOGISTIK / BEREITSTELLUNGSRAUM`, Feld
„Parent-Abschnitt (optional)“ mit dem Eintrag „Kein Parent (Root)“.

**Reaktion des Helfers:** „Systemtyp“ und „Parent/Root“ sind keine Einsatzbegriffe. Er wählt
irgendetwas – und trifft damit unbemerkt eine Entscheidung, die die Stärkeberechnung verändert
(ANFAHRT wird herausgerechnet, siehe P1-Befund).

**Problem:** Feldnamen und Werte entstammen dem Datenmodell; die fachliche Folge der Auswahl wird
nicht erklärt.

**Auswirkung im Einsatz:** Falsch typisierte Abschnitte und dadurch falsche Gesamtstärke.

**Empfehlung:** „Art des Abschnitts“ mit Klartextauswahl („Einsatzabschnitt“, „Führungsstelle“,
„Anfahrt – zählt nicht zur Stärke vor Ort“, „Logistik“, „Bereitstellungsraum“) und
„Übergeordneter Abschnitt“ / „Keiner (oberste Ebene)“.

**Nachtest:** Ein Helfer ohne Einweisung legt einen Bereitstellungsraum an und kann anschließend
erklären, warum dessen Kräfte in der Gesamtstärke erscheinen oder nicht.

---

### [P2] Splitten meldet den Fehler erst nach dem Absenden und zeigt keine Reststärke

**Evidenz:** Beobachtet
**Fundstellen:** Dialog ohne Vorschau: `src/renderer/src/components/dialogs/SplitEinheitDialog.tsx:65-81`,
Quellauswahl zeigt die Stärke nur eingeklammert im Auswahltext
(`src/renderer/src/components/dialogs/EinheitFormFields.tsx:197-213`); die eigentliche Prüfung
passiert erst im Hintergrund (`src/main/services/einsatz-write/einheit.ts:177-188`) und kommt als
Fehlerbanner zurück.

**Reaktion des Helfers:** Er trägt die Teilstärke ein und erfährt erst nach dem Klick „Split
übersteigt verfügbare Teilstärken“, ohne zu sehen, wie viel überhaupt verfügbar ist.

**Problem:** Keine Anzeige von „vorher / abgeben / bleibt übrig“ im Dialog, keine Begrenzung der
Eingabefelder auf die verfügbaren Werte.

**Auswirkung im Einsatz:** Mehrere Anläufe, Zeitverlust beim Bilden von Teileinheiten.

**Empfehlung:** Im Dialog dauerhaft „Quelle: 1/2/6 → nach Split: 1/1/3, neu: 0/1/3“ anzeigen und
die Eingaben auf die vorhandenen Teilstärken begrenzen.

**Nachtest:** Split mit zu hoher Mannschaftszahl → die Zahl lässt sich gar nicht erst eingeben bzw.
der Hinweis erscheint sofort am Feld.

---

## P3 – Verbesserung

### [P3] „Monitor schließen“ ist immer sichtbar und aktiv, auch wenn kein Monitor offen ist

**Evidenz:** Beobachtet
**Fundstelle:** `src/renderer/src/components/layout/Topbar.tsx:49-56` (beide Schaltflächen dauerhaft,
nur über `busy` gesperrt)

**Problem/Empfehlung:** Ein Umschalter („Stärke-Monitor anzeigen“ / „ausblenden“) mit erkennbarem
Zustand statt zwei Schaltflächen ohne Zustandsanzeige. Sonst drückt der Helfer im Zweifel beide.

---

### [P3] „FüSt Name“ beim Anlegen ist unerklärt und die Vorbelegung unsichtbar

**Evidenz:** Beobachtet
**Fundstellen:** `src/renderer/src/components/views/StartView.tsx:92-95` (Feld ohne Erklärung und
ohne Platzhalter, während das Feld darüber einen Beispieltext hat); der Vorgabewert „FüSt 1“ steht
nur im Code (`src/renderer/src/app/useStartActions.ts:58`).

**Problem/Empfehlung:** Platzhalter „z. B. FüSt 1“ und ein Satz, was dadurch entsteht (der erste
Abschnitt des Einsatzes). Der Helfer weiß dann, warum dieser Abschnitt später in der Liste steht.

---

### [P3] Auf dem Startbildschirm stehen Version, Lizenz und Copyright prominenter als die eigentliche Aufgabe

**Evidenz:** Beobachtet
**Fundstellen:** `src/renderer/src/components/views/StartView.tsx:31-35` gegenüber der eigentlichen
Frage in `:37` sowie den beiden Systemschaltflächen in `:46-52`.

**Problem/Empfehlung:** „Bestehenden Einsatz öffnen“ / „Neuen Einsatz anlegen“ und die Liste der
zuletzt genutzten Einsätze nach oben; Version/Lizenz als kleine Fußzeile.

---

### [P3] Ersatzdarstellung der taktischen Stärke ist irreführend

**Evidenz:** Beobachtet
**Fundstelle:** `src/renderer/src/components/tables/EinheitRow.tsx:117` – fehlt die taktische
Stärke, wird `0/0/<gesamt>/<gesamt>` angezeigt.

**Problem/Empfehlung:** Ein erfundenes „0/0/…“ sieht aus wie eine gemeldete Gliederung ohne Führung.
Besser „nicht gegliedert (<gesamt> Einsatzkräfte)“ mit Hinweis, dass die Aufteilung nachzutragen ist.

---

### [P3] Die Helfertabelle ist mit zehn Spalten für die Erfassung unter Zeitdruck zu breit

**Evidenz:** Beobachtet
**Fundstelle:** `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:198-209`
(Typ, G, Name, Anzahl, Funktion, Telefon, Erreichbarkeit, Vegetarisch, Bemerkung, Aktion – die
Spalte „G“ ist zudem nur ein Buchstabe und wird durch reine Symbolschalter bedient, `:78-99`)

**Problem/Empfehlung:** Für die Ersterfassung eine schmale Ansicht (Rolle, Geschlecht, Anzahl)
anbieten und die Bogenfelder (Telefon, Erreichbarkeit, Bemerkung, Verpflegung) aufklappbar
nachreichen. Spalte „G“ ausschreiben.

---

## Verständnisprüfung

- **Orientierung (Wo bin ich?):** **unsicher** – Kopfzeile nennt den Einsatz, die Navigationsleiste
  aber nur Buchstaben (P1); in welchem Abschnitt man arbeitet, steht nur in der Seitenleiste.
- **Nächster Schritt (Was soll ich tun?):** **unsicher** – Erfassen und Bearbeiten sind auffindbar;
  Schließen/Wechseln eines Einsatzes und Ausgeben einer Einsatzakte haben keinen erkennbaren
  Bedienweg (P1).
- **Systemzustand (Ist es angekommen?):** **gescheitert** – es gibt keinerlei Speicher- oder
  Übertragungsbestätigung und keine Anzeige der Verbindung zur Einsatzdatei (P1).
- **Fehlerkorrektur:** **gescheitert** – keine Rückfragen, kein bedienbares Rückgängig, obwohl die
  Funktion im Kern vorhanden ist (P0); die Wiederherstellung aus der Sicherung ist selbst die
  gefährlichste Aktion im Programm (P0).
- **Feldtauglichkeit:** **eingeschränkt / nicht abschließend prüfbar** – die fachliche Struktur
  (Abschnitte, taktische Stärke, taktische Zeichen, NATO-Zeit, Mehrplatzbetrieb auf einer Datei)
  passt gut zur Einsatzrealität; die Bedienung ist jedoch auf ruhige, geübte Nutzung ausgelegt.
  Eine abschließende Bewertung von Lesbarkeit, Trefferflächen und Verhalten bei Netzaussetzern
  erfordert Tests am realen Gerät (siehe „Nicht verifiziert“).

## Was gut funktioniert (bitte bei Umbauten erhalten)

- **Bearbeitungssperren je Datensatz mit Namensanzeige und automatischem Ablauf**
  (`src/renderer/src/app/useEditLocks.ts:37-115`, `src/main/services/record-lock.ts:8`): verhindert
  das gegenseitige Überschreiben im Mehrplatzbetrieb und ist in Tabellen und Abschnittsbaum sichtbar.
- **Archivierte Einsätze sind durchgängig schreibgeschützt und das wird angezeigt**
  (`src/renderer/src/components/views/AppWorkspaceShell.tsx:311`, `isArchived` an allen Aktionen).
- **Automatische Vorschlagszeilen für Helfer anhand der eingetragenen taktischen Stärke**
  (`src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:77-104`): spart genau die
  Tipparbeit, die im Einsatz stört.
- **Vollbild-Stärkemonitor mit selbstskalierender Schrift, NATO-Zeit und invertierbarer Darstellung**
  (`src/renderer/src/components/views/StrengthDisplayView.tsx:19-33`, `:110-130`): richtig gedachte
  Anzeige für den Raum – die invertierbare Darstellung sollte auf die Arbeitsansichten ausgeweitet
  werden (siehe P2 Nachtdarstellung).
- **Ein Einsatz = eine Datei, ohne Server- und Cloudzwang** (`README.md`, Abschnitt „Offline- und
  Fileshare-Betrieb“): passt zur Einsatzrealität und macht die Datensicherung für den Helfer
  begreifbar.
