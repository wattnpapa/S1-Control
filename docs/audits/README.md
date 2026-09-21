# THW-Perspektiv-Audits

Elf Reviews von S1-Control aus je einer THW-Nutzerperspektive, erstellt am 18.09.2026.
Alle Reviews sind code- und dokumentationsbasiert: es lief keine Instanz der Anwendung,
es gab keine Screenshots. Befunde sind mit Datei:Zeile belegt, Annahmen sind in den
Einzeldokumenten als solche gekennzeichnet. Es wurde kein Code geändert.

| Datei | Perspektive | P0 | P1 | P2 | P3 |
| --- | --- | --- | --- | --- | --- |
| thw-field-user-reviewer.md | Helfer im Feld | 2 | 7 | 8 | 5 |
| thw-new-user-reviewer.md | Erstnutzung ohne Einweisung | 5 | 7 | 6 | 4 |
| thw-stress-test-user.md | Stress, Lärm, Unterbrechungen | 4 | 6 | 8 | 4 |
| thw-glove-touch-reviewer.md | Handschuhe, Touch-Bedienung | 3 | 5 | 5 | 3 |
| thw-night-visibility-reviewer.md | Nacht, Kontrast, Dark Mode | 2 | 4 | 5 | 4 |
| thw-offline-resilience-reviewer.md | Funkloch, Sync, Mehrplatzbetrieb | 4 | 8 | 4 | 2 |
| thw-analog-first-reviewer.md | Papier-Rückfallebene | 4 | 4 | 4 | 3 |
| thw-destructive-action-reviewer.md | Riskante und irreversible Aktionen | 6 | 8 | 6 | 3 |
| thw-error-recovery-reviewer.md | Provozierte Bedienfehler | 4 | 7 | 7 | 4 |
| thw-workflow-reviewer.md | Vollständige Arbeitsabläufe | 4 | 7 | 5 | 4 |
| thw-command-reviewer.md | Führungsstelle, Lagebild | 4 | 7 | 7 | 4 |

## Befunde, die mehrere Reviewer unabhängig gefunden haben

Die Einsatzdatei wird beim Öffnen einmal in den Speicher geladen und danach nie wieder
gelesen. Der Sechs-Sekunden-Refresh und der UDP-Änderungshinweis lesen denselben alten
Stand erneut, und jeder Speichervorgang schreibt die komplette Datei aus diesem Abbild
zurück (connection.ts:41-60, einsatz-store.ts:19-23). README und AGENTS.md sehen
ausdrücklich Mehrplatzbetrieb auf einem Share vor; in dieser Konstellation überschreibt
jede Station die Eingaben der anderen, ohne dass es jemand merkt. Gefunden von
Offline-Resilienz und destruktive Aktionen, mit identischer Fundstelle.

Die Gesamtstärke stimmt in mehreren Fällen nicht mit der Lage überein. Abschnitte vom
Typ ANFAHRT fallen still aus der Summe (useEinsatzData.ts:236-259), Einheiten mit Status
ABGEMELDET zählen dauerhaft mit, und weder Topbar noch Stärke-Monitor erklären die Regel.
Gefunden von Erstnutzer, Stress-Test, Feldnutzer, Workflow und Führung.

Die Gesamtübersichten fallen im laufenden Betrieb auf den gewählten Abschnitt zurück.
allKraefte und allFahrzeuge werden aus dem gewählten Abschnitt befüllt, und der
Default-Refresh mit includeFullOverview: false zieht nur die Gesamtstärke nach
(useEinsatzData.ts:69-106). Fremde Abschnitte erscheinen dann als leer, während die
Topbar-Zahl weiter stimmt: ein widersprüchliches, aber plausibel aussehendes Lagebild.
Gefunden von Führung und Workflow.

Im gesamten Renderer existiert keine einzige Bestätigungsabfrage. Helfer löschen,
Verschieben, Splitten und Backup laden wirken sofort. Der Undo-Mechanismus ist im Kern
vollständig vorhanden und bis ins Preload durchgereicht (command.ts:119,
preload.ts:41-42), aber nirgends in der Oberfläche angebunden; der eigene e2e-Test hält
das in einem Kommentar fest (e2e/steps/einsatz.steps.ts:233). Gefunden von sieben der elf
Reviewer.

Backup laden überschreibt die aktive Einsatzdatei per copyFileSync, ohne Warnung und ohne
Sicherung des Ist-Standes (SettingsView.tsx:226, backup.ts:59-62). Backups entstehen alle
fünf Minuten, entsprechend viel Lageführung kann verloren gehen. Gefunden von
analog-first, Erstnutzer, Feldnutzer, destruktive Aktionen und Fehlerbehandlung.

ExportView.tsx ist implementiert, wird aber nirgends gerendert; WorkspaceView kennt keinen
Wert 'export', und exportEinsatzakte wird im Renderer nie aufgerufen. Die im README
zugesagte Einsatzakte ist damit toter Code, und ein Einsatz lässt sich über die Oberfläche
weder exportieren noch abschließen. Gefunden von analog-first, Erstnutzer, Stress-Test,
Feldnutzer und Workflow.

Das Sechs-Sekunden-Polling setzt ungespeicherte Eingaben im Inline-Editor zurück, weil die
Entwurfszeilen bei jeder neuen Array-Referenz aus Serverdaten neu aufgebaut werden
(InlineEinheitEditor.tsx:127-129, useEinsatzData.ts:70-77). Halb getippte Kennzeichen
verschwinden ohne Meldung. Gefunden von Feldnutzer und Fehlerbehandlung.

## Einzelbefunde mit hohem Gewicht

Beim Verschieben einer Einheit bleiben deren Fahrzeuge im alten Abschnitt zurück, weil nur
einheit.aktuellerAbschnittId gesetzt wird, Fahrzeuge aber über ihr eigenes Feld gefiltert
werden (command.ts:24-69, einsatz-read-service.ts:104-108).

Eine nicht lesbare Einsatzdatei wird kommentarlos durch ein leeres Skelett ersetzt
(connection.ts:24-35).

Der Updaten-Knopf sitzt im Banner über dem Arbeitsbereich, und quitAndInstall folgt 1,8
Sekunden nach Downloadende (UpdaterUi.tsx:145-156, updater.ts:399-427).

Im Stärke-Monitor liegen zwei 180×120 Pixel große Flächen mit pointer-events: auto und
opacity: 0 in den oberen Ecken; opacity blockiert keine Treffer, ein Griff dorthin schließt
die Anzeige (app.css:1094-1145).

Der Login ist fest auf admin verdrahtet, die LoginView ist toter Code
(useAppBootstrap.ts:47). Einträge lassen sich keiner Person zuordnen.

Nacherfassung nach einer Papierphase ist zeitlich nicht korrekt möglich, weil alle
Bewegungen fest nowIso() setzen und die Inputs kein Zeitfeld haben (command.ts:49, 99,
141, 156).

Es gibt keinen Dark Mode: color-scheme: light steht fest in app.css:2, und
prefers-color-scheme kommt im Repository nicht vor.
