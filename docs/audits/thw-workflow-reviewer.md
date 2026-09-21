# Workflow-Audit S1-Control (THW Workflow Reviewer)

Datum: 2026-09-18
Rolle: THW-Helfer/S1-Sachbearbeiter in der Führungsstelle, der eine komplette Aufgabe von der Ankunft der Kräfte bis zum Abschluss des Einsatzes erledigen will.

## Scope und Methodik

- **Einschränkung: Dieser Audit ist rein code- und dokumentationsbasiert. Es gab keine laufende Instanz, keine Screenshots und keine echte Bedienung.** Alle Befunde sind aus Quellcode, Feature-/Step-Dateien und README/AGENTS abgeleitet. Wo ein Verhalten nur aus dem Code hergeleitet und nicht real beobachtet wurde, ist das gekennzeichnet.
- Geprüfte Quellen: `src/renderer/src/components/views/**`, `src/renderer/src/components/layout/**`, `src/renderer/src/components/dialogs/**`, `src/renderer/src/components/editor/**`, `src/renderer/src/app/**`, `src/shared/ipc.ts`, `src/main/ipc/register-einsatz-ipc.ts`, `drizzle/0000_initial.sql`, `e2e/features/einsatz-lifecycle.feature`, `e2e/steps/einsatz.steps.ts`, `README.md`, `AGENTS.md`, `TODO.md`.
- Bewertet wurde der **Gesamtfluss**, nicht die Schönheit einzelner Screens.

### Erwartete Arbeitsfolge (Annahme)

Der reale S1-Ablauf ist im Repository nirgends beschrieben. Die folgende Folge ist daher eine **Annahme** und dient als Prüfraster; die Software wird zusätzlich unabhängig davon auf Verständlichkeit und Robustheit geprüft:

1. Ankunft in der Führungsstelle, Rechner/App starten, anmelden (wer arbeitet?).
2. Einsatz anlegen oder laufenden Einsatz übernehmen (Schichtübergabe).
3. Führungsstruktur abbilden (FüSt, Einsatzabschnitte, Bereitstellungsraum, Anfahrt).
4. Eintreffende Kräfte erfassen (Einheit, Stärke, Fahrzeuge, Erreichbarkeiten), ggf. Anfahrt → Bereitstellung → Abschnitt fortschreiben.
5. Stärke melden (Gesamtstärke an übergeordnete Führung, Monitor für den Raum).
6. Lage fortschreiben: Verschieben, Teilen, Abmelden von Kräften; nachvollziehbare Dokumentation.
7. Übergabe an die nächste Schicht bzw. Abschluss: Einsatz beenden, Einsatzakte exportieren/archivieren.

### Kurzurteil aus Rollensicht

Die Kernstrecke „Einsatz anlegen → Abschnitte → Einheiten mit Stärke erfassen → Gesamtstärke auf Monitor anzeigen" ist vorhanden und in den e2e-Szenarien durchgespielt. Reibung entsteht an den **Rändern** des Ablaufs: Die Anmeldung ist unsichtbar (fest `admin`), der Abschluss (Einsatz beenden, Einsatzakte exportieren, archivieren) ist in der Bedienoberfläche gar nicht erreichbar, das Schließen eines Einsatzes läuft über einen Einstellungs-Button mit ganz anderem Namen, und die Gesamtübersichten sind nach dem Code so gebaut, dass sie im laufenden Betrieb auf den gerade gewählten Abschnitt zusammenschrumpfen. Die Aufgabe „vollständiger Einsatz von Ankunft bis Abschluss" ist damit **nicht ohne Umwege und nicht ohne fremde Hilfe** erledigbar.

---

## P0 – Einsatzkritisch

### P0-1 Gesamtübersichten (Kräfte, Fahrzeuge, Führungsstruktur) schrumpfen im Betrieb auf den gewählten Abschnitt

- **Fundstelle / Aufgabe:** `src/renderer/src/app/useEinsatzData.ts:69-81` (Schnellpfad setzt `allKraefte`/`allFahrzeuge` **nur** aus dem gewählten Abschnitt), `src/renderer/src/app/useEinsatzData.ts:97-106` (bei `includeFullOverview: false` wird die Vollliste nie nachgeladen, nur die Gesamtstärke), Aufrufer: `src/renderer/src/app/useSyncEvents.ts:56-64` (zyklisch alle 6 s), `src/renderer/src/app/useSyncEvents.ts:221`, `src/renderer/src/app/einheit-actions/useEinheitCreateActions.ts:111`, `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:146`, `src/renderer/src/app/einheit-actions/useEinheitSplitActions.ts:59`, `src/renderer/src/app/useFahrzeugActions.ts:112`, `src/renderer/src/app/einheit-actions/useEinheitFahrzeugActions.ts:29,62`. Verbraucher: `src/renderer/src/components/views/workspace/WorkspaceSections.tsx:216-267` (Kräfte), `:272-292` (Fahrzeuge), `:203-208` → `src/renderer/src/components/views/FuehrungsstrukturView.tsx:266-284` (Führungsstruktur-Stärken).
- **Beobachtetes Problem (aus Code hergeleitet, Laufzeitprüfung offen):** Nach jedem Anlegen/Bearbeiten/Splitten und spätestens nach dem nächsten 6-Sekunden-Polling werden `allKraefte`/`allFahrzeuge` auf die Einheiten des aktuell gewählten Abschnitts reduziert und nicht wieder aufgefüllt. Die Views „Kräfte", „Fahrzeuge" und „Führungsstruktur" arbeiten genau auf diesen Listen.
- **Erwartung der Rolle:** Eine Gesamtübersicht zeigt alle Kräfte des Einsatzes, unabhängig davon, welcher Abschnitt links markiert ist. Wenn gefiltert wird, muss der Filter sichtbar sein.
- **Auswirkung im Einsatz:** Der S1 sieht in der Kräfteübersicht und in der Führungsstruktur zu wenige Einheiten, ohne dass irgendetwas auf eine Einschränkung hinweist. Kräfte können übersehen, doppelt angefordert oder als „nicht da" gemeldet werden. Die Führungsstruktur-Karten zeigen für alle nicht gewählten Abschnitte 0er-Stärken, während die Topbar-Gesamtstärke korrekt bleibt – zwei widersprüchliche Zahlen auf einem Bildschirm.
- **Empfehlung:** Gesamtübersichten müssen immer aus dem vollständigen Datenstand gespeist werden. Der abschnittsbezogene Schnellstart darf die Gesamtliste nicht überschreiben, sondern nur den Abschnitts-Detailbereich befüllen. Solange keine vollständigen Daten vorliegen, gehört ein sichtbarer Hinweis („Übersicht lädt …") in die Ansicht statt einer stillen Teilliste.
- **Verifikation:** Einsatz mit Einheiten in mindestens drei Abschnitten öffnen, in die Kräfte-Ansicht wechseln, 30 s ohne Bedienung warten und danach eine Einheit bearbeiten. Anzahl Zeilen und Summen müssen unverändert alle Abschnitte enthalten und mit der Topbar-Stärke zusammenpassen.

### P0-2 Einsatz beenden, archivieren und Einsatzakte exportieren sind in der Oberfläche nicht erreichbar

- **Fundstelle / Aufgabe:** `src/renderer/src/components/views/ExportView.tsx:14-27` (Komponente existiert, wird nirgends gerendert – kein Import außerhalb der Datei), `src/renderer/src/components/layout/WorkspaceRail.tsx:13-54` und `src/renderer/src/components/views/workspace/WorkspaceSections.tsx:320-329` (nur `einsatz`, `fuehrung`, `kraefte`, `fahrzeuge`, `einstellungen`), `src/shared/ipc.ts:197` (`archiveEinsatz`), `src/shared/ipc.ts:217` (`exportEinsatzakte`), `src/main/ipc/register-einsatz-ipc.ts:155,404` (Main-Seite implementiert), `src/renderer/src/components/views/AppWorkspaceShell.tsx:311` (Archiv-Banner existiert, aber kein Weg dorthin), `README.md` („Export (MVP)" wird als Funktion beschrieben).
- **Beobachtetes Problem:** Die letzte Prozessstufe ist dokumentiert und in Main/IPC vorhanden, aber der Renderer ruft weder `archiveEinsatz` noch `exportEinsatzakte` auf. Der Einsatz kann über die Oberfläche weder auf BEENDET gesetzt noch archiviert noch exportiert werden.
- **Erwartung der Rolle:** Am Einsatzende drücke ich „Einsatz beenden" und „Einsatzakte exportieren" und bekomme eine Datei, die ich weitergeben und ablegen kann.
- **Auswirkung im Einsatz:** Der Ablauf endet ohne definierten Abschluss. Es gibt kein übergabefähiges Dokument; die Einsatzdokumentation muss händisch aus der SQLite-Datei oder gar nicht erzeugt werden. Ein Einsatz bleibt dauerhaft „AKTIV" und damit beschreibbar, auch wenn er längst beendet ist.
- **Empfehlung:** Export und Einsatzabschluss als sichtbare Schritte in den Workspace aufnehmen (eigener Rail-Eintrag oder Aktionen im Einsatz-Bildschirm), mit klarer Rückmeldung, wo die Datei liegt, und mit deutlicher Trennung zwischen „beenden" (fachlich) und „archivieren" (schreibgeschützt).
- **Verifikation:** Einsatz anlegen, Kräfte erfassen, ohne Dokumentation oder Fremdhilfe Export auslösen und die ZIP-Datei im Dateisystem wiederfinden; danach Einsatz beenden und prüfen, dass der Status sichtbar wechselt.

### P0-3 Kräfte in Abschnitten vom Typ ANFAHRT zählen ohne jeden Hinweis nicht zur Gesamtstärke

- **Fundstelle / Aufgabe:** `src/renderer/src/app/useEinsatzData.ts:239-260` (`aggregateTacticalStrength` überspringt `systemTyp === 'ANFAHRT'`), `src/renderer/src/components/views/FuehrungsstrukturView.tsx:78-81` (gleiche Ausnahme), Anzeige: `src/renderer/src/components/layout/Topbar.tsx:40-43` und `src/renderer/src/components/views/StrengthDisplayView.tsx:231` (Monitor), Auswahl des Typs: `src/renderer/src/components/dialogs/CreateAbschnittDialog.tsx:36-48`.
- **Beobachtetes Problem:** Ob eine Einheit in die Gesamtstärke eingeht, hängt allein am Systemtyp des Abschnitts. Weder beim Anlegen des Abschnitts noch in der Topbar, noch im Stärke-Monitor, noch in der Führungsstruktur-Karte wird dieser Ausschluss erklärt oder angezeigt.
- **Erwartung der Rolle:** Wenn eine Zahl als „Stärke" gemeldet wird, muss erkennbar sein, wer darin enthalten ist und wer nicht – und zwar auf dem Bildschirm, von dem abgelesen wird.
- **Auswirkung im Einsatz:** Die gemeldete Stärke ist systematisch zu niedrig, sobald Kräfte im Abschnitt „Anfahrt" geführt werden. Eine falsche Stärkemeldung an die übergeordnete Führung ist eine gefährliche Fehlinterpretation und kann zu Nach- oder Fehlanforderungen führen. Umgekehrt springt die Zahl beim Verschieben aus der Anfahrt heraus sprunghaft nach oben, ohne dass sich real etwas geändert hat.
- **Empfehlung:** Die Regel sichtbar machen: Anfahrt-Kräfte entweder getrennt ausweisen („im Einsatz 2/6/30//38, in Anfahrt 0/1/8//9") oder den Ausschluss direkt an der Zahl und im Abschnittstyp beschriften. Der Stärke-Monitor sollte zusätzlich den Einsatznamen und den Bezug der Zahl zeigen.
- **Verifikation:** Einheit in einen ANFAHRT-Abschnitt legen und prüfen, ob auf Topbar und Monitor ohne Vorwissen erkennbar ist, dass diese Kräfte nicht enthalten sind.

### P0-4 Abgemeldete Einheiten und außer Betrieb gesetzte Fahrzeuge bleiben in der Stärke enthalten

- **Fundstelle / Aufgabe:** `src/renderer/src/app/useEinsatzData.ts:249-256` und `src/renderer/src/components/views/FuehrungsstrukturView.tsx:95-109` (Statusfeld wird bei der Summenbildung nirgends ausgewertet); Statusauswahl: `src/renderer/src/components/editor/inline/EinheitFormRows.tsx:36-43` (`AKTIV`, `IN_BEREITSTELLUNG`, `ABGEMELDET`), Schema: `drizzle/0000_initial.sql:36-48`.
- **Beobachtetes Problem:** Eine Einheit auf `ABGEMELDET` zu setzen ändert die Gesamtstärke nicht. Ein echtes Abmelden (Einheit rückt ab) ist über die Oberfläche nur als Statusänderung ohne Wirkung oder gar nicht möglich; eine Löschfunktion für Einheiten existiert im Renderer nicht.
- **Erwartung der Rolle:** Wenn ich eine Einheit abmelde, sinkt die gemeldete Stärke – das ist der Hauptzweck des Status.
- **Auswirkung im Einsatz:** Die Stärke wächst über die Einsatzdauer monoton und wird nach den ersten Ablösungen deutlich zu hoch gemeldet. Der S1 verliert das Vertrauen in die Zahl und führt parallel Strichliste.
- **Empfehlung:** Status fachlich wirksam machen: abgemeldete Kräfte aus der gemeldeten Stärke herausnehmen und getrennt als „abgemeldet/abgerückt" ausweisen, mit Abmeldezeitpunkt. Alternativ den Status klar als rein informativ kennzeichnen und einen echten Abmeldevorgang ergänzen.
- **Verifikation:** Einheit mit Stärke 9 anlegen, Gesamtstärke prüfen, Status auf ABGEMELDET setzen, Gesamtstärke erneut prüfen; das Ergebnis muss dem entsprechen, was ein Helfer erwartet, und auf dem Bildschirm erklärt sein.

---

## P1 – Hoch

### P1-1 Anmeldung findet unsichtbar als `admin` statt – keine Übergabe, keine Zuordnung von Einträgen zu Personen

- **Fundstelle / Aufgabe:** `src/renderer/src/app/useAppBootstrap.ts:47` (fester Auto-Login `admin`/`admin`), `src/renderer/src/components/views/LoginView.tsx:14-43` (Login-Maske existiert, wird nirgends eingebunden – kein Import), `src/renderer/src/components/views/AppEntryView.tsx:63-80` (bei fehlender Session nur Fehlertext, keine Anmeldemöglichkeit), Protokollierung: `src/main/services/command.ts:50,100,142` (`benutzer: user.name`), Sperren: `src/renderer/src/components/layout/AbschnittSidebar.tsx:72` (zeigt Rechnername und Benutzername).
- **Beobachtetes Problem:** Es gibt keine Anmeldung. Jede Bewegung, jeder Undo-Eintrag und jede Bearbeitungssperre wird dem Benutzer `admin` zugeschrieben. Schlägt der Auto-Login fehl, ist die App ohne Anmeldemaske in einer Sackgasse.
- **Erwartung der Rolle:** Bei Schichtbeginn melde ich mich an, damit erkennbar ist, wer welche Meldung eingetragen hat; bei Schichtende melde ich mich ab.
- **Auswirkung im Einsatz:** Übergaben zwischen Schichten sind nicht nachvollziehbar. Bei Rückfragen („wer hat die 12 eingetragen?") hilft das Protokoll nicht. Auf einem gemeinsam genutzten FüSt-Rechner ist außerdem nicht erkennbar, wer gerade einen Datensatz gesperrt hält, außer über den Rechnernamen.
- **Empfehlung:** Entweder die vorhandene Anmeldemaske aktivieren oder mindestens beim Öffnen eines Einsatzes einmalig Namen/Funktion des Bearbeiters abfragen und diesen in Bewegungen und Sperren führen. Fehlgeschlagener Auto-Login muss in eine bedienbare Anmeldung münden, nicht in eine Fehlermeldung.
- **Verifikation:** Zwei unterschiedliche Bearbeiter erfassen je eine Bewegung; im Bewegungsprotokoll/Export müssen unterschiedliche Namen stehen.

### P1-2 Einen Einsatz schließen oder wechseln geht nur über „Einstellungen → Verzeichnis speichern"

- **Fundstelle / Aufgabe:** `src/renderer/src/app/useSystemActions.ts:37-43` (`saveDbPath` ruft `clearSelectedEinsatz`), `src/renderer/src/components/views/SettingsView.tsx:223-225` (Button „Verzeichnis speichern"), `src/renderer/src/app/useWorkspaceLifecycle.ts:30-40` (einziger Weg zurück zum Startbildschirm), `src/renderer/src/components/layout/Topbar.tsx:49-56` (Topbar bietet nur Monitor-Aktionen), Beleg aus den eigenen Tests: `e2e/steps/einsatz.steps.ts:310` und `:314` („'Verzeichnis speichern' ruft clearSelectedEinsatz auf").
- **Beobachtetes Problem:** Es gibt keine Aktion „Einsatz schließen" oder „Einsatz wechseln". Der einzige Weg zurück ist ein Einstellungs-Button, dessen Beschriftung etwas völlig anderes verspricht – der eigene e2e-Test dokumentiert diesen Umweg ausdrücklich.
- **Erwartung der Rolle:** Ein sichtbarer Weg zurück zur Einsatzauswahl, ohne in Systemeinstellungen zu gehen.
- **Auswirkung im Einsatz:** Wer den Einsatz wechseln will (zweite Lage, falsche Datei geöffnet), findet den Weg ohne Einweisung nicht und startet stattdessen die Anwendung neu. Umgekehrt löst ein Nutzer, der nur den Pfad korrigieren will, ungewollt das Schließen des laufenden Einsatzes aus.
- **Empfehlung:** „Einsatz schließen / Einsatz wechseln" prominent in die Topbar, und den Einstellungs-Button auf reines Pfad-Speichern ohne Seiteneffekt zurückführen bzw. die Folge vorher ankündigen.
- **Verifikation:** Ein Ersteinsteiger soll ohne Hilfe von einem geöffneten Einsatz zur Auswahlliste zurückkommen.

### P1-3 Rückgängig (Undo) ist implementiert, aber in der Oberfläche nicht vorhanden

- **Fundstelle / Aufgabe:** `src/shared/ipc.ts:215-216` (`undoLastCommand`, `hasUndoableCommand`), `README.md` („Undo für MOVE_EINHEIT und MOVE_FAHRZEUG"), `e2e/features/einsatz-lifecycle.feature` Szenario „Verschiebung rückgängig machen", Beleg: `e2e/steps/einsatz.steps.ts:233` („Kein UI-Button für Undo vorhanden → IPC direkt aufrufen"). Keine Fundstelle in `src/renderer/src`.
- **Beobachtetes Problem:** Das Szenario ist nur über einen direkten IPC-Aufruf im Test bedienbar. Ein Helfer hat keine Möglichkeit, eine versehentliche Verschiebung zurückzunehmen.
- **Erwartung der Rolle:** Nach einem Fehlklick im Verschieben-Dialog eine sofort sichtbare Rücknahme, solange die Aktion frisch ist.
- **Auswirkung im Einsatz:** Falsch verschobene Einheiten müssen manuell zurückverschoben werden; dabei entsteht ein zweiter Bewegungseintrag, und die Lagekarte/Meldung weicht zwischenzeitlich von der Wirklichkeit ab.
- **Empfehlung:** Nach jeder Verschiebung eine kurzzeitige Rücknahmemöglichkeit direkt an der Stelle der Aktion anbieten (nicht versteckt in einem Menü), gestützt auf die bereits vorhandene Funktion.
- **Verifikation:** Verschieben, danach ohne Vorwissen die Verschiebung zurücknehmen; das Bewegungsprotokoll muss den Vorgang als Rücknahme ausweisen.

### P1-4 Kein Bewegungs-/Ereignisprotokoll in der Oberfläche – Übergabe nur mündlich möglich

- **Fundstelle / Aufgabe:** `drizzle/0000_initial.sql:61-78` (`einsatz_einheit_bewegung`, `einsatz_fahrzeug_bewegung` mit Zeitpunkt und Benutzer), `drizzle/0000_initial.sql:88-104` (`einsatz_command_log`, `einsatz_einheit_staerke_log`), Renderer: keine Fundstelle für „bewegung"; Ausgabe nur im nicht erreichbaren Export (`README.md`, `bewegungen.csv`).
- **Beobachtetes Problem:** Die Anwendung schreibt ein vollständiges Bewegungs- und Stärkeprotokoll mit, zeigt es aber an keiner Stelle an.
- **Erwartung der Rolle:** Beim Schichtwechsel will ich sehen, was in den letzten Stunden passiert ist: welche Einheit wann wohin, welche Stärke wann geändert wurde.
- **Auswirkung im Einsatz:** Die Übergabe erfolgt ohne nachvollziehbare Grundlage; nachträgliche Klärungen („seit wann ist der Zug im Abschnitt Nord?") sind am Gerät nicht möglich, obwohl die Daten vorliegen.
- **Empfehlung:** Eine schlichte, chronologische Ereignisliste je Einsatz (Zeit, Wer, Was, Von/Nach) als eigene Ansicht, filterbar nach Abschnitt und Einheit.
- **Verifikation:** Nach fünf Verschiebungen und zwei Stärkeänderungen muss die Liste diese sieben Vorgänge in NATO-Zeit korrekt und vollständig zeigen.

### P1-5 Stärke doppelt pflegen: Zahlenfelder und Helferliste laufen nebeneinander mit unterschiedlicher Speicherlogik

- **Fundstelle / Aufgabe:** `src/renderer/src/components/editor/inline/EinheitFormRows.tsx:52-87` (Zahlenfelder Führung/Unterführung/Mannschaft), `src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:77-104` (`nextAutoRows` erzeugt Platzhalterzeilen aus der Differenz), `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:150-161` (jede Helferzeile hat einen eigenen „Speichern"-Knopf), `src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:144-150` (getrennter „Speichern"-Knopf für die Einheit), Auswirkung auf gespeicherte Stärke: `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:125-126` (Stärke kommt ausschließlich aus den Zahlenfeldern).
- **Beobachtetes Problem:** Dieselbe Information – wie viele Führer, Unterführer, Helfer sind da – wird an zwei Stellen gepflegt. Die gemeldete Stärke stammt nur aus den Zahlenfeldern; die namentliche Helferliste beeinflusst sie nicht. In einem einzigen Formular gibt es zwei verschiedene Speicherwege: zeilenweise sofort (Helfer, Fahrzeuge) und ganzheitlich am Ende (Einheit).
- **Erwartung der Rolle:** Eine Eingabe, ein Speichern. Wenn ich zehn Helfer eintrage, soll die Stärke zehn sein.
- **Auswirkung im Einsatz:** Zahlenfeld und Namensliste laufen auseinander; Verpflegungs- und Meldezahlen widersprechen sich. Unter Zeitdruck wird der falsche Speichern-Knopf gedrückt und Arbeit geht verloren, ohne dass etwas darauf hinweist.
- **Empfehlung:** Eine führende Quelle festlegen. Entweder Stärke aus der Helferliste berechnen (Zahlenfelder dann nur Anzeige/Schnellerfassung) oder die Helferliste klar als optionale Zusatzinformation kennzeichnen und die Abweichung im Formular sichtbar machen. Speichern-Verhalten im gesamten Editor vereinheitlichen.
- **Verifikation:** Stärke 0/1/8 eintragen, neun Helferzeilen ausfüllen, speichern, Formular erneut öffnen – gespeicherte Stärke, Helferliste und Gesamtstärke müssen zusammenpassen.

### P1-6 Aktionen brechen ohne Rückmeldung ab, wenn kein Abschnitt gewählt ist oder der Einsatz archiviert ist

- **Fundstelle / Aufgabe:** `src/renderer/src/app/einheit-actions/useEinheitCreateActions.ts:43-50` (stiller `return`), `src/renderer/src/app/useFahrzeugActions.ts:69-80` (stiller `return`; nur der Fall „keine Einheit vorhanden" erzeugt eine Meldung), `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:60-62` (stiller `return`), `src/renderer/src/app/useEinsatzBasisdatenActions.ts:42-45` (stiller `return`), Kontext: Abschnittsleiste nur in der Einsatz-Ansicht sichtbar (`src/renderer/src/app/useWorkspaceDerivedState.ts:40`), Aktionen aber auch in Kräfte-/Fahrzeug-Ansicht (`src/renderer/src/components/views/workspace/WorkspaceSections.tsx:244-256`, `:277-282`).
- **Beobachtetes Problem:** Knöpfe sind aktiv, die Aktion passiert aber nicht und es erscheint keine Meldung. In den Kräfte- und Fahrzeugansichten ist zudem gar nicht sichtbar, welcher Abschnitt gerade gewählt ist, von dem die Aktion abhängt.
- **Erwartung der Rolle:** Entweder der Knopf funktioniert, oder er ist erkennbar gesperrt mit Begründung.
- **Auswirkung im Einsatz:** Mehrfaches Drücken, Unsicherheit ob die App hängt, Zeitverlust in der Erfassungsspitze, wenn viele Kräfte gleichzeitig eintreffen.
- **Empfehlung:** Jede abgewiesene Aktion begründen („Bitte zuerst Abschnitt wählen", „Einsatz ist archiviert"), und den aktiven Abschnitt in allen Ansichten sichtbar halten, in denen abschnittsabhängige Aktionen angeboten werden.
- **Verifikation:** In jeder Ansicht jeden Anlege-Knopf im ungünstigen Zustand drücken; es muss immer eine verständliche Rückmeldung erscheinen.

### P1-7 Archivierter Einsatz lässt sich nicht einmal mehr ansehen

- **Fundstelle / Aufgabe:** `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:60-62` (Öffnen der Einheit-Detailansicht bei `isArchived` blockiert), `src/renderer/src/components/views/FuehrungsstrukturView.tsx:184-192` (Bearbeiten-Knopf ausgeblendet), `src/renderer/src/components/views/AppWorkspaceShell.tsx:311` (nur Banner „nur lesen").
- **Beobachtetes Problem:** „Nur lesen" bedeutet hier faktisch „Details gar nicht lesbar": Der Detaileditor einer Einheit ist zugleich die einzige Ansicht für Erreichbarkeiten, Ansprechpartner und Helferliste und wird im Archiv komplett verweigert.
- **Erwartung der Rolle:** Einen abgeschlossenen Einsatz nachschlagen zu können, ist der Hauptzweck des Archivs.
- **Auswirkung im Einsatz:** Rückfragen zu einem abgeschlossenen Einsatz (Kontaktdaten, wer war beteiligt) sind am Gerät nicht beantwortbar.
- **Empfehlung:** Detailansichten im Archivmodus lesend öffnen und lediglich die Speichern-Funktionen sperren.
- **Verifikation:** Archivierten Einsatz öffnen und zu einer beliebigen Einheit sämtliche erfassten Felder einsehen.

---

## P2 – Mittel

### P2-1 Abschnitt anlegen erzwingt einen Ansichtswechsel mitten in der Kräfteerfassung

- **Fundstelle / Aufgabe:** `src/renderer/src/components/views/workspace/WorkspaceSections.tsx:192-210` (Knopf „Abschnitt anlegen" nur in Führungsstruktur- und Kräfte-Ansicht), Abschnittsbaum aber nur in der Einsatz-Ansicht (`src/renderer/src/app/useWorkspaceDerivedState.ts:40`); Beleg aus den eigenen Tests: `e2e/steps/einsatz.steps.ts:64-96` (erst Rail „Führungsstruktur", dann zurück auf „Einsatz", um das Ergebnis zu sehen).
- **Beobachtetes Problem:** Wer beim Erfassen merkt, dass ein Abschnitt fehlt, muss die Ansicht wechseln, anlegen und zurückwechseln; das Ergebnis ist in der Ansicht, in der es angelegt wurde, nicht in der Abschnittsleiste sichtbar.
- **Erwartung der Rolle:** Neuen Abschnitt dort anlegen, wo der Abschnittsbaum steht, und sofort weiterarbeiten.
- **Auswirkung im Einsatz:** Zwei zusätzliche Kontextwechsel je neuem Abschnitt, genau in der hektischsten Phase (Aufbau der Struktur bei eintreffenden Kräften).
- **Empfehlung:** „Abschnitt anlegen" zusätzlich direkt an der Abschnittsleiste anbieten; nach dem Anlegen den neuen Abschnitt auswählen und im Kontext bleiben.
- **Verifikation:** Aus der laufenden Einheitenerfassung heraus einen Abschnitt anlegen, ohne die Ansicht zu wechseln.

### P2-2 Verschieben-Dialog zeigt weder den aktuellen Abschnitt noch die Hierarchie

- **Fundstelle / Aufgabe:** `src/renderer/src/components/dialogs/MoveDialog.tsx:22-41` (Auswahlliste nur mit `abschnitt.name`, flach, ohne Markierung des Ist-Zustands), Vorbelegung auf den aktuell gewählten Abschnitt: `src/renderer/src/app/app-view-props.ts:325-330`.
- **Beobachtetes Problem:** Der Dialog nennt weder Einheit noch Herkunftsabschnitt und listet alle Abschnitte flach, während der Abschnittsbaum sonst hierarchisch und mit Systemtyp dargestellt wird (`src/renderer/src/components/layout/AbschnittSidebar.tsx:71`). Bei gleichlautenden Unterabschnitten ist keine Unterscheidung möglich.
- **Erwartung der Rolle:** „Einheit X von A nach B verschieben" muss im Bestätigungsmoment vollständig lesbar sein.
- **Auswirkung im Einsatz:** Verschieben in den falschen Abschnitt, was wegen des fehlenden Undo (P1-3) nur mit einem zweiten Bewegungseintrag korrigierbar ist.
- **Empfehlung:** Im Dialog Einheitenname, Quellabschnitt und Zielabschnitt im Klartext nennen; Zielliste hierarchisch und mit Systemtyp darstellen, aktuellen Abschnitt kennzeichnen.
- **Verifikation:** Zwei gleichnamige Unterabschnitte anlegen und eine Einheit zielsicher in den richtigen verschieben.

### P2-3 Offene Bearbeitung geht beim Ansichtswechsel unsichtbar verloren und blockiert Kollegen weiter

- **Fundstelle / Aufgabe:** Editoren werden nur in bestimmten Ansichten gerendert (`src/renderer/src/components/views/workspace/WorkspaceSections.tsx:157-187`, `:216-226`, `:272-276`), der Zustand `showEditEinheitDialog` und die Sperre bleiben bestehen (`src/renderer/src/app/useWorkspaceLifecycle.ts:42-50` löst nur beim ausdrücklichen Schließen aus), Sperr-Heartbeat läuft weiter (`src/renderer/src/app/useEditLocks.ts:46-76`).
- **Beobachtetes Problem:** Wechselt der Nutzer bei geöffnetem Einheiten-Editor auf „Führungsstruktur" oder „Einstellungen", verschwindet das Formular samt ungespeicherter Eingaben aus dem Blick; die Bearbeitungssperre bleibt jedoch aktiv.
- **Erwartung der Rolle:** Entweder eine Warnung („ungespeicherte Eingaben") oder ein sichtbarer Hinweis, dass noch ein Datensatz in Bearbeitung ist.
- **Auswirkung im Einsatz:** Eingaben werden verworfen, ohne dass es auffällt; gleichzeitig meldet ein zweiter Arbeitsplatz „Datensatz wird bearbeitet von …" und kann nicht weiterarbeiten.
- **Empfehlung:** Offene Bearbeitungen ansichtsübergreifend anzeigen (z. B. Hinweisleiste „1 Einheit in Bearbeitung – fortsetzen/verwerfen") und beim Verlassen entweder die Sperre lösen oder ausdrücklich nachfragen.
- **Verifikation:** Editor öffnen, Feld ändern, Ansicht wechseln, zurückwechseln – der Zustand muss eindeutig und wiederherstellbar sein.

### P2-4 Der Startbildschirm mischt Einsatzführung mit Entwicklerwerkzeugen

- **Fundstelle / Aufgabe:** `src/renderer/src/components/views/StartView.tsx:39-45` („DevTools öffnen" gleichwertig neben „Auf Updates prüfen"), `src/renderer/src/components/views/EinsatzOverviewView.tsx:53-57` („UDP Broadcast Monitor" direkt unter den Kräften der Lageübersicht), `src/renderer/src/components/views/SettingsView.tsx:257-258` (Debug-Protokolle in den Einstellungen).
- **Beobachtetes Problem:** Diagnosewerkzeuge stehen dauerhaft in den Arbeitsansichten, teilweise an prominenter Stelle in der Einsatzübersicht.
- **Erwartung der Rolle:** Der Arbeitsbildschirm zeigt Lage und Kräfte; Technikdiagnose liegt abseits.
- **Auswirkung im Einsatz:** Ablenkung, versehentliches Öffnen der DevTools, und die eigentliche Einsatzübersicht wird nach unten gedrängt.
- **Empfehlung:** Diagnoseflächen hinter einen eigenen, klar benannten Bereich legen (oder an ein Flag koppeln, wie es für andere Diagnosefunktionen laut `README.md` bereits üblich ist).
- **Verifikation:** Einsatzübersicht enthält im Normalbetrieb ausschließlich einsatzfachliche Inhalte.

### P2-5 „Backup laden" ist ein folgenschwerer Schritt ohne Vorwarnung in der Oberfläche

- **Fundstelle / Aufgabe:** `src/renderer/src/components/views/SettingsView.tsx:226-228` (Knopf ohne Erläuterung), `src/renderer/src/app/useSystemActions.ts:54-73` (führt direkt zur Wiederherstellung und öffnet den Einsatz neu), Main-Seite: `src/main/ipc/register-einsatz-ipc.ts:369-386`.
- **Beobachtetes Problem:** Die Wirkung („aktueller Stand wird durch einen älteren ersetzt, für alle Clients") wird in der Oberfläche nirgends benannt; es gibt nur die Dateiauswahl des Betriebssystems.
- **Erwartung der Rolle:** Vor dem Zurückspielen eines Backups eine klare Ansage, welcher Stand verloren geht und wer davon betroffen ist.
- **Auswirkung im Einsatz:** Verlust aller Eingaben seit dem Sicherungszeitpunkt (bis zu fünf Minuten laut `README.md`) auf allen Arbeitsplätzen.
- **Empfehlung:** Benennung schärfen („Einsatzstand aus Sicherung zurücksetzen"), Zeitpunkt der gewählten Sicherung und die Folge vor dem Ausführen im Klartext anzeigen.
- **Verifikation:** Der Vorgang muss sich nach dem Lesen des Bildschirmtexts richtig einschätzen und abbrechen lassen.

---

## P3 – Niedrig

### P3-1 Führungsstruktur-Karten sind missverständlich beschriftet

- **Fundstelle / Aufgabe:** `src/renderer/src/components/views/FuehrungsstrukturView.tsx:194-200` („Führungsstärke" für die gesamte taktische Stärke; „Einheiten gesamt" zeigt `stats.taktisch.gesamt`, also die Personenzahl, nicht die Anzahl der Einheiten).
- **Auswirkung im Einsatz:** Beim schnellen Ablesen wird eine Personenzahl als Anzahl Einheiten gelesen – falsche Lagebeurteilung auf den zweiten Blick.
- **Empfehlung:** „Stärke" und „Personen gesamt" bzw. „Einheiten: n" getrennt und korrekt benennen.
- **Verifikation:** Abschnitt mit 2 Einheiten und 18 Personen zeigt beide Zahlen unverwechselbar.

### P3-2 Navigationsleiste mit Einzelbuchstaben E/G/K/F

- **Fundstelle / Aufgabe:** `src/renderer/src/components/layout/WorkspaceRail.tsx:16-49` (Buchstaben als Beschriftung, Klartext nur im `title`-Tooltip).
- **Auswirkung im Einsatz:** Ohne Maus-Verweilen ist nicht erkennbar, wohin ein Knopf führt; „G" für Führungsstruktur ist nicht selbsterklärend.
- **Empfehlung:** Sprechende Kurzbeschriftungen oder etablierte Symbole mit sichtbarem Text.
- **Verifikation:** Ein Ersteinsteiger findet die Fahrzeugübersicht ohne Tooltip.

### P3-3 Stärke-Monitor ohne Bezug zum Einsatz und ohne Aktualitätsangabe

- **Fundstelle / Aufgabe:** `src/renderer/src/components/views/StrengthDisplayView.tsx:212-242` (nur Stärkezeichenkette und Uhrzeit), Speisung aus `src/renderer/src/app/useSystemActions.ts:166-170`.
- **Auswirkung im Einsatz:** Auf dem Raum-Monitor ist nicht erkennbar, zu welchem Einsatz die Zahl gehört und ob die Anzeige noch aktuell ist (z. B. wenn der speisende Arbeitsplatz hängt).
- **Empfehlung:** Einsatzname und Zeitpunkt der letzten Aktualisierung mit anzeigen; Veralten der Daten sichtbar machen.
- **Verifikation:** Speisenden Arbeitsplatz anhalten – der Monitor muss erkennen lassen, dass die Zahl nicht mehr fortgeschrieben wird.

### P3-4 Fahrzeugerfassung an zwei Stellen mit unterschiedlichem Umfang

- **Fundstelle / Aufgabe:** `src/renderer/src/components/editor/shared/EinheitFahrzeugeSection.tsx` (Fahrzeuge innerhalb des Einheiten-Editors) gegenüber `src/renderer/src/components/views/workspace/WorkspaceSections.tsx:272-292` und `src/renderer/src/components/dialogs/CreateFahrzeugDialog.tsx` (eigene Fahrzeugansicht mit eigener Zuordnungslogik, Vorbelegung auf die erste Einheit in `src/renderer/src/app/useFahrzeugActions.ts:46-57,78`).
- **Auswirkung im Einsatz:** Zwei Wege für denselben Vorgang, unterschiedliche Vorbelegungen; die Vorbelegung „erste Einheit der Liste" führt bei Unachtsamkeit zur falschen Zuordnung.
- **Empfehlung:** Einen führenden Weg festlegen; bei der Zuordnung keine beliebige Einheit vorbelegen, sondern bewusst wählen lassen.
- **Verifikation:** Fahrzeug über beide Wege anlegen – gleiche Felder, gleiche Pflichtangaben, keine stillschweigende Vorauswahl.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen – Erfassen und Melden geht, Abschließen und Dokumentieren nicht.
- **Fremde Hilfe nötig:** ja – ohne Einweisung findet man weder den Weg zurück zur Einsatzauswahl (P1-2) noch einen Weg zum Export/Abschluss (P0-2, existiert in der Oberfläche nicht).
- **Größtes Missverständnis:** Die angezeigte Gesamtstärke wirkt wie „alle Kräfte im Einsatz", schließt aber Anfahrt-Abschnitte still aus und abgemeldete Einheiten weiterhin ein.
- **Größtes Einsatzrisiko:** Kräfte- und Führungsstrukturübersicht reduzieren sich im laufenden Betrieb unbemerkt auf den gewählten Abschnitt, sodass Lagebild und Meldezahlen auseinanderlaufen (P0-1).
- **Top-Priorität für die nächste Iteration:** P0-1 beheben – Gesamtübersichten dürfen nie durch den abschnittsbezogenen Schnellpfad überschrieben werden; unmittelbar danach P0-3/P0-4 (was zählt in die gemeldete Stärke hinein) sichtbar machen.
