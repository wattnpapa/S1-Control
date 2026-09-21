# Audit: S1-Control aus Sicht der Führungsstelle (THW Command Reviewer)

Datum: 2026-09-18
Rolle des Prüfers: Führungskraft / Nutzer in einer Führungsstelle (S1), die unter Zeitdruck Lage, Kräfte, Status und Abweichungen erfassen muss.

## Scope und Methodik

- Geprüft wurde **ausschließlich code- und dokumentationsbasiert**. Es lief **keine Instanz der Anwendung**, es lagen **keine Screenshots** vor. Aussagen über die Bildschirmdarstellung sind aus dem Renderer-Code (JSX, CSS) abgeleitet, nicht visuell verifiziert.
- Betrachtete Quellen: `src/renderer/src/components/views/**`, `src/renderer/src/components/layout/**`, `src/renderer/src/components/tables/**`, `src/renderer/src/components/dialogs/**`, `src/renderer/src/app/**` (Daten-/Sync-/Lock-Orchestrierung), `src/renderer/src/utils/**`, `src/shared/types.ts`, `src/shared/ipc.ts`, `src/main/services/strength-display.ts`, `src/main/services/einsatz-write/tactical-strength.ts`, `README.md`, `AGENTS.md`, `TODO.md`.
- Es wurde **kein Code geändert**. Der Audit bewertet keine taktischen Entscheidungen, sondern nur, ob die Software die für Entscheidungen nötigen Informationen verständlich, aktuell und nachvollziehbar bereitstellt.
- **Annahmen** sind im Text ausdrücklich als solche gekennzeichnet. Wo ein realer THW-Ablauf nicht sicher bekannt ist, wird die Software trotzdem auf innere Widerspruchsfreiheit und Verständlichkeit geprüft.

## Kurzes Urteil aus Rollensicht

Die Grundstruktur passt zur Führungsarbeit: Abschnittsbaum, Einheiten/Fahrzeuge je Abschnitt, Gesamtlisten, eine Organisationsansicht mit aggregierten Stärken, ein Wandmonitor mit Gesamtstärke und Zeit, Mehrplatzbetrieb mit sichtbaren Bearbeitungssperren. Das ist deutlich mehr als eine Tabelle.

Reibung entsteht an drei Stellen, und zwar genau dort, wo eine Führungsstelle auf die Zahlen vertraut:

1. Die Gesamtübersichten (Alle Kräfte, Alle Fahrzeuge, Führungsstruktur) werden nach dem ersten Öffnen bei jedem zyklischen Refresh und nach fast jeder Bearbeitung auf den **aktuell gewählten Abschnitt reduziert** — ohne jeden Hinweis. Die Überschrift behauptet weiterhin "Alle Kräfte im Einsatz".
2. Es gibt **keine Statusabhängigkeit der Stärkeberechnung** (abgemeldete Einheiten zählen weiter) und **keine Aktualitätsanzeige** (kein "Stand", keine Fehlermeldung bei ausgefallenem Refresh), während auf dem Wandmonitor eine sekundengenaue Uhr neben der Zahl läuft und Aktualität suggeriert.
3. Es existiert **kein Auftrags-, Meldungs- oder Journalkonzept** und keine im Bedienfeld erreichbare Nachvollziehbarkeit (Undo ist in der IPC-Schicht vorhanden, aber nirgends in der Oberfläche verdrahtet). Eine Übergabe an die ablösende Führungskraft ist ohne mündliche Erklärung nicht möglich.

Die Kernaufgabe "Kräfte erfassen und Gesamtstärke anzeigen" ist erfüllbar. Die Kernaufgabe "in 30 Sekunden ein belastbares Lagebild ziehen und es an den Nachfolger übergeben" ist mit der jetzigen Oberfläche **nicht** zuverlässig erfüllbar.

---

## P0 – Einsatzkritisch

### P0-1 Gesamtübersichten fallen unbemerkt auf einen einzigen Abschnitt zurück

**Fundstellen**
- `src/renderer/src/app/useEinsatzData.ts:69-81` (Seed der Listen aus **nur** dem gewählten Abschnitt)
- `src/renderer/src/app/useEinsatzData.ts:96-106` (bei `includeFullOverview: false` wird **nur** `gesamtStaerke` nachgezogen, `setAllKraefte`/`setAllFahrzeuge` bleiben beim Abschnitts-Seed)
- `src/renderer/src/app/useEinsatzData.ts:143-153` (`refreshCurrentEinsatz` defaultet auf `includeFullOverview: false`)
- `src/renderer/src/app/useSyncEvents.ts:56-66` (zyklischer 6-Sekunden-Refresh mit `includeFullOverview: false`)
- `src/renderer/src/app/useSyncEvents.ts:221` (Refresh nach Fremdänderung, ebenfalls `includeFullOverview: false`)
- Schreibpfade: `useEinheitEditActions.ts:146`, `useEinheitCreateActions.ts:111`, `useEinheitSplitActions.ts:59`, `useEinheitFahrzeugActions.ts:29,62`, `useFahrzeugActions.ts:112,210`
- Anzeigeseite: `src/renderer/src/components/tables/KraefteOverviewTable.tsx:33` ("Alle Kräfte im Einsatz"), `FahrzeugeOverviewTable.tsx:31`, `FuehrungsstrukturView.tsx:269` (baut die gesamte Organisationsansicht aus `props.kraefte`)

**Beobachtetes Problem**
Beim Öffnen eines Einsatzes werden die Listen vollständig geladen. Spätestens nach 6 Sekunden (zyklischer Refresh) oder nach der nächsten Bearbeitung ersetzt `loadEinsatz` die Listen wieder durch den Schnell-Seed, der nur die Einheiten und Fahrzeuge **des gewählten Abschnitts** enthält, und der Vollabgleich wird in diesem Pfad übersprungen. Nur `gesamtStaerke` wird weiterhin korrekt über alle Abschnitte gerechnet. Einzig der Verschiebe-Vorgang ruft `refreshAll()` (`useSystemActions.ts:122`) und stellt die Vollständigkeit wieder her.

**Auswirkung im Einsatz**
Die Ansicht "Alle Kräfte im Einsatz" zeigt trotz unveränderter Überschrift nur einen Teil der Kräfte. Die Führungsstruktur-Ansicht weist für alle nicht gewählten Abschnitte Stärke 0 und "Keine Einheiten" aus, obwohl dort Kräfte gebunden sind. Gleichzeitig bleibt die Gesamtstärke in der Topbar korrekt — die Ansicht ist also in sich widersprüchlich, sieht aber plausibel aus. Eine Führungskraft, die daraus Reserven oder Abschnittsbelastungen ableitet, entscheidet auf Basis eines stillschweigend halbierten Lagebildes. Das ist der schwerwiegendste Befund dieses Audits.

**Empfehlung**
Die Gesamtansichten müssen entweder immer vollständig sein oder klar als "nur Abschnitt X" beschriftet und als unvollständig markiert sein. Ein Zustand, in dem die Überschrift "alle" behauptet und der Inhalt teilweise ist, darf es nicht geben.

**Verifikation**
Einsatz mit mindestens drei Abschnitten und Kräften in jedem Abschnitt öffnen, Ansicht "Kräfte" wählen, 15 Sekunden warten, ohne etwas zu tun. Die Zeilenzahl muss unverändert bleiben. Gleiches nach einer Einheitenbearbeitung und nach einer Fremdänderung von einem zweiten Client.

### P0-2 Abgemeldete Einheiten und außer Betrieb gesetzte Fahrzeuge zählen weiter mit

**Fundstellen**
- `src/renderer/src/app/useEinsatzData.ts:239-259` (`aggregateTacticalStrength` filtert ausschließlich nach `systemTyp === 'ANFAHRT'`, nie nach `einheit.status`)
- `src/renderer/src/components/views/FuehrungsstrukturView.tsx:95-109` (`addDirectStats` summiert jede Einheit ohne Statusprüfung)
- Statuswerte: `src/shared/types.ts:3-4` (`ABGEMELDET`, `AUSSER_BETRIEB`), gesetzt über `EinheitFormRows.tsx:40-41` bzw. `InlineFahrzeugEditor.tsx:35-36`
- Ausgabe: `Topbar.tsx:42`, `useSystemActions.ts:149-150,167-169` (Wandmonitor)

**Beobachtetes Problem**
Eine Einheit kann auf `ABGEMELDET` gesetzt werden, bleibt aber mit ihrer vollen taktischen Stärke in der Gesamtstärke, in der Abschnittssumme der Führungsstruktur und damit auch auf dem Stärke-Monitor enthalten. Für Fahrzeuge gilt sinngemäß `AUSSER_BETRIEB` (Fahrzeuge werden ohnehin nur gezählt, nicht bewertet).

**Annahme**: Es ist fachlich gewollt, dass die angezeigte Stärke die *aktuell im Einsatz befindlichen* Kräfte beschreibt und nicht die jemals erfassten. Falls die Zahl bewusst "alle erfassten Kräfte" meint, ist der Befund kein Rechenfehler, sondern ein Beschriftungsfehler — die Wirkung auf die Führungskraft ist dieselbe.

**Auswirkung im Einsatz**
Die an der Wand hängende Gesamtstärke ist nach dem ersten Abmelden systematisch zu hoch. Meldungen an übergeordnete Stellen, Verpflegungs- und Ablösungsplanung stützen sich auf Kräfte, die nicht mehr da sind. Der Fehler wächst über die Einsatzdauer und ist an der Anzeige nicht erkennbar.

**Empfehlung**
Stärke nach Status trennen und beides zeigen: verfügbare Stärke als Hauptzahl, abgemeldete/außer Betrieb als getrennte, klar benannte Nebenangabe. Keine stillschweigende Mischung.

**Verifikation**
Einheit mit bekannter Stärke auf `ABGEMELDET` setzen, Topbar-Zahl und Monitorzahl vergleichen. Sie müssen sich erkennbar und erklärbar ändern.

### P0-3 "Einheiten gesamt" zeigt in Wahrheit die Personenzahl

**Fundstellen**
- `src/renderer/src/components/views/FuehrungsstrukturView.tsx:198-200` (`Einheiten gesamt: {stats.taktisch.gesamt}`)
- `src/renderer/src/components/views/FuehrungsstrukturView.tsx:101-104` (`gesamt` ist die Summe der Personen aus der taktischen Stärke)
- `src/renderer/src/components/views/FuehrungsstrukturView.tsx:194-197` (dieselbe Größe steht eine Zeile darüber als "Führungsstärke")

**Beobachtetes Problem**
Der Zahlenwert hinter "Einheiten gesamt" ist der vierte Teil der taktischen Stärke, also die Anzahl **Personen**, nicht die Anzahl Einheiten. Ein Abschnitt mit drei Gruppen zeigt dort beispielsweise 27. Zusätzlich ist die Zeile darüber mit "Führungsstärke" beschriftet, obwohl sie die vollständige taktische Stärke des Teilbaums (F/U/M/Gesamt) enthält, nicht die Stärke der Führungskräfte.

**Auswirkung im Einsatz**
Zwei benachbarte Zeilen derselben Karte tragen falsche Bezeichner. Wer daraus im Funkgespräch "27 Einheiten im Abschnitt Nord" meldet, produziert eine grobe Falschmeldung. Der Fehler ist besonders tückisch, weil beide Zahlen für sich plausibel wirken.

**Empfehlung**
Bezeichner an den Inhalt anpassen: Stärke (F/U/M//Gesamt), Personen gesamt, Anzahl Einheiten als eigene, tatsächlich gezählte Größe.

**Verifikation**
Abschnitt mit genau zwei Einheiten zu je 1/1/7//9 anlegen. Die Karte muss "2 Einheiten" und "18 Personen" ausweisen, nicht "18 Einheiten".

### P0-4 Keine Aktualitäts- und Störungsanzeige, aber eine laufende Uhr

**Fundstellen**
- `src/renderer/src/app/useSyncEvents.ts:56-66` (zyklischer Refresh ohne `catch`; Fehler werden weder angezeigt noch protokolliert, nur `finally` setzt das Flag zurück)
- `src/renderer/src/app/useSyncEvents.ts:206-227` (Refresh nach Broadcast; hier existiert ein `catch`, das den Fehler in das allgemeine Fehlerbanner schreibt)
- `src/renderer/src/components/views/AppWorkspaceShell.tsx:308-315` (einziges, unspezifisches Fehlerbanner)
- `src/renderer/src/components/layout/Topbar.tsx:39-48` (Stärke und Uhrzeit nebeneinander, kein Datenstand)
- `src/renderer/src/components/views/StrengthDisplayView.tsx:76-83, 226-239` (Monitor: Sekundenuhr neben der Stärkezahl)

**Beobachtetes Problem**
Nirgends wird angezeigt, wann die dargestellten Daten zuletzt erfolgreich gelesen wurden. Schlägt der zyklische Abgleich fehl (Fileshare weg, SMB-Hänger, Datei gesperrt), bleiben die alten Zahlen unverändert stehen, ohne Hinweis. Die daneben laufende NATO-Uhr wird sekündlich aktualisiert und erzeugt den Eindruck einer aktuellen Anzeige. Auf dem Wandmonitor ist das besonders wirksam, weil dort ausschließlich Zahl und Uhrzeit stehen.

**Auswirkung im Einsatz**
Eine eingefrorene Lage ist von einer aktuellen Lage nicht unterscheidbar. Genau der Fall, in dem die Führungsstelle wissen muss, dass sie blind ist, wird optisch als Normalbetrieb dargestellt. Das widerspricht auch der eigenen Vorgabe in `AGENTS.md` Abschnitt 4, dass Broadcast-Ausfall die Funktion nicht brechen darf — die Funktion bricht nicht, aber der Nutzer erfährt nichts davon.

**Empfehlung**
Sichtbarer Datenstand ("Stand HHMM") in Topbar und Monitor, plus deutlich sichtbarer Zustand, wenn der letzte Abgleich älter als eine festgelegte Schwelle ist oder fehlgeschlagen ist. Fehler des zyklischen Refresh dürfen nicht stillschweigend verworfen werden.

**Verifikation**
Einsatzdatei-Verzeichnis im laufenden Betrieb unerreichbar machen. Innerhalb weniger Sekunden muss die Oberfläche kenntlich machen, dass die Zahlen nicht mehr fortgeschrieben werden.

---

## P1 – Hoch

### P1-5 Keine Aufträge, keine Meldungen, kein Journal, kein erreichbares Rückgängig

**Fundstellen**
- Datenmodell ohne Auftrags-/Meldungsentität: `src/shared/types.ts:1-200` (Einsatz, Abschnitt, Einheit, Fahrzeug, Helfer — mehr nicht)
- `src/renderer/src/components/dialogs/EditEinsatzDialog.tsx:66-80` (Einsatz-Basisdaten bestehen aus Einsatzname und Führungsstellenname)
- Vorhandene, aber im Renderer **nirgends aufgerufene** Schnittstellen: `src/shared/ipc.ts:215-216` (`undoLastCommand`, `hasUndoableCommand`), `src/main/services/command.ts:119-163`
- Historie nur im Export: `src/main/services/export.ts:172-177` (`bewegungen.csv` im ZIP)

**Beobachtetes Problem**
Die Anwendung verwaltet Kräfte, aber keinen Führungsvorgang. Es gibt keinen Ort für Auftrag, Lage, eingehende Meldung, offene Forderung oder Erledigungsvermerk. Bewegungen werden zwar protokolliert, sind aber in der laufenden Anwendung nicht einsehbar, sondern erst nach einem Export als CSV im ZIP. Die im Hauptprozess implementierte Undo-Funktion für Verschiebungen ist über die Oberfläche nicht erreichbar.

**Auswirkung im Einsatz**
Die Fragen "Was ist in der letzten Stunde passiert?", "Was ist noch offen?" und "Wer hat das wann so eingetragen?" lassen sich am Bildschirm nicht beantworten. Eine Ablösung in der Führungsstelle ist nur mit mündlicher Übergabe möglich; fällt die Führungskraft aus, ist ihr Wissen weg. Eine versehentliche Verschiebung muss von Hand rückverschoben werden, obwohl die Rücknahme technisch bereitsteht.

**Empfehlung**
Mindestens eine chronologische, in der Anwendung lesbare Ereignisliste (wer, wann, was, von wo nach wo) und ein erreichbares Rückgängig für die letzte Bewegung. Auftrags-/Meldungsverwaltung ist der nächste Ausbauschritt; sie sollte bewusst geplant und nicht durch Freitextfelder ersetzt werden.

**Verifikation**
Eine Einheit verschieben, dann ohne Export und ohne zweiten Bildschirm in der Anwendung nachweisen können, dass und durch wen dies geschah — und die Verschiebung mit einer Bedienhandlung zurücknehmen.

### P1-6 Kräfte auf Anfahrt verschwinden stillschweigend aus der Gesamtstärke

**Fundstellen**
- `src/renderer/src/app/useEinsatzData.ts:244-248` (Abschnitte vom Typ `ANFAHRT` werden aus der Gesamtstärke ausgenommen)
- `src/renderer/src/components/views/FuehrungsstrukturView.tsx:78-81` (dieselbe Ausnahme in der Organisationsansicht)
- `src/renderer/src/components/layout/Topbar.tsx:40-43` (eine einzige Zahl ohne Erläuterung)

**Beobachtetes Problem**
Der Ausschluss ist fachlich nachvollziehbar (anfahrende Kräfte sind noch nicht verfügbar), wird aber nirgends angezeigt. Weder Topbar noch Monitor noch die Führungsstruktur-Karte des Anfahrt-Abschnitts weisen aus, wie viele Kräfte gerade unterwegs sind. Die Karte des Anfahrt-Abschnitts zeigt sogar 0 und "Keine Einheiten", obwohl Einheiten darin stehen.

**Annahme**: `ANFAHRT` ist als Sammelraum für noch nicht eingetroffene Kräfte gedacht (abgeleitet aus `SYSTEM_TYP_LABELS`, `FuehrungsstrukturView.tsx:28-34`, und der Sonderbehandlung in der Summierung).

**Auswirkung im Einsatz**
Die anfahrende Reserve ist die für die nächste Stunde wichtigste Größe und genau die, die nirgends steht. Zusätzlich wirkt die Anfahrt-Karte fehlerhaft ("0 / Keine Einheiten" trotz Belegung), was Vertrauen in die übrigen Zahlen kostet.

**Empfehlung**
Gesamtstärke als "verfügbar" ausweisen und "davon auf Anfahrt" als eigene Zahl danebenstellen. Die Anfahrt-Karte muss ihren Bestand zeigen und optisch kennzeichnen, dass er nicht in die Summe eingeht.

**Verifikation**
Eine Einheit in den Anfahrt-Abschnitt legen: Gesamtstärke unverändert, "davon Anfahrt" erhöht, Anfahrt-Karte zeigt die Einheit.

### P1-7 Die Einsatzübersicht beantwortet die wichtigste Frage des Abschnitts nicht

**Fundstelle**
- `src/renderer/src/components/views/EinsatzOverviewView.tsx:27-40` (drei Kennzahlen: Anzahl Einheiten im Abschnitt, Anzahl Fahrzeuge im Abschnitt, Einsatzstatus)

**Beobachtetes Problem**
Die Hauptansicht eines Abschnitts zeigt Anzahlen von Datensätzen, aber **keine Stärke des Abschnitts**, keine Statusverteilung (wie viele aktiv / in Bereitstellung / abgemeldet) und keinen Zeitbezug. Die dritte Kachel wiederholt den Status des gesamten Einsatzes, der schon durch das Archiv-Banner (`AppWorkspaceShell.tsx:311`) abgedeckt ist.

**Auswirkung im Einsatz**
Für die Frage "Wie stark ist Abschnitt Nord gerade?" muss die Führungskraft in eine andere Ansicht wechseln (Führungsstruktur) und dort die richtige Karte suchen — unter Zeitdruck ein vermeidbarer Kontextwechsel, der zudem von P0-1 betroffen ist.

**Empfehlung**
Kennzahlen des gewählten Abschnitts an die Spitze: taktische Stärke, Anzahl Einheiten, Statusverteilung, Fahrzeuge einsatzbereit/außer Betrieb.

**Verifikation**
Abschnitt wechseln und die Abschnittsstärke ohne Ansichtswechsel ablesen können.

### P1-8 Führungsrelevante Angaben sind nur über den sperrenden Bearbeiten-Dialog lesbar

**Fundstellen**
- `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:58-78` (`openEditDialogAsync` erwirbt **zuerst** eine exklusive Bearbeitungssperre und zeigt erst dann Daten)
- `src/renderer/src/app/useEditLocks.ts:98-115` (Sperre wird gesetzt; fremde Sperre erzeugt nur eine Fehlermeldung)
- Nicht in der Tabelle sichtbar: `src/renderer/src/components/tables/EinheitRow.tsx:107-130` (nur Zeichen, Name, Organisation, Abschnitt, Stärke, Status)
- Betroffene Felder: `src/shared/types.ts:96-114` (`grFuehrerName`, `ovTelefon`, `erreichbarkeiten`, `bemerkung` …)

**Beobachtetes Problem**
Wer den Gruppenführernamen, eine Telefonnummer oder die Bemerkung zu einer Einheit lesen will, muss den Bearbeiten-Dialog öffnen. Damit ist die Einheit für alle anderen Arbeitsplätze gesperrt, solange der Dialog offen ist. Es gibt keine reine Leseansicht.

**Auswirkung im Einsatz**
Nachschlagen einer Telefonnummer blockiert parallel arbeitende Kollegen. Bleibt der Dialog offen (Unterbrechung, Funkgespräch), ist der Datensatz für die Dauer der Sperre unbearbeitbar. Im Mehrplatzbetrieb auf dem Share — dem erklärten Hauptbetriebsfall laut `README.md` — ist das ein wiederkehrender Reibungspunkt.

**Empfehlung**
Lesbare Detailansicht ohne Sperre; Sperre erst beim tatsächlichen Eintritt in die Bearbeitung. Wichtige Kontaktangaben zusätzlich in der Tabelle oder in einem Aufklappbereich.

**Verifikation**
Von zwei Clients dieselbe Einheit ansehen. Beide müssen die Angaben lesen können; erst der Bearbeitungsbeginn darf sperren.

### P1-9 Verschieben ohne Kontext und ohne echte Bestätigung

**Fundstellen**
- `src/renderer/src/components/dialogs/MoveDialog.tsx:22-41` (Titel nur "Einheit verschieben"; Auswahlliste ohne Hierarchie und ohne Systemtyp; kein Name des verschobenen Objekts; kein Quellabschnitt)
- `src/renderer/src/components/views/WorkspaceDialogs.tsx:63-76` (Zielvorbelegung leer bzw. auf `''` zurückgesetzt)
- `src/renderer/src/app/useSystemActions.ts:100-124` (Ausführung ohne Rückfrage und ohne Ergebnisrückmeldung)

**Beobachtetes Problem**
Der Dialog nennt nicht, **welche** Einheit verschoben wird und **woher**. Die Zielauswahl ist eine flache Namensliste ohne Einrückung und ohne Typkennzeichnung, obwohl der Abschnittsbaum in der Seitenleiste hierarchisch dargestellt wird (`AbschnittSidebar.tsx:57-77`). Nach dem Bestätigen erscheint keine Bestätigungsmeldung.

**Auswirkung im Einsatz**
Bei mehreren ähnlich benannten Abschnitten ("Nord", "Nord 1", "Nord Logistik") ist eine Fehlzuordnung wahrscheinlich, sie bleibt unbemerkt, und sie ist über die Oberfläche nicht rücknehmbar (siehe P1-5). Die Lage stimmt dann an zwei Stellen gleichzeitig nicht.

**Empfehlung**
Im Dialog Objektname, Quellabschnitt und Zielabschnitt ausformuliert anzeigen ("Verschiebe *2. Bergungsgruppe* von *Bereitstellungsraum* nach *Abschnitt Nord*"), Zielauswahl mit Hierarchie und Typ, danach kurze Rückmeldung.

**Verifikation**
Zwei gleichnamige Unterabschnitte in verschiedenen Zweigen anlegen und eine Einheit gezielt in einen davon verschieben können, ohne raten zu müssen.

### P1-10 Keine Suche, keine Sortierung, kein Statusfilter in den Gesamtlisten

**Fundstellen**
- `src/renderer/src/components/views/workspace/WorkspaceSections.tsx:228-243` (einziger Filter: Organisation)
- `src/renderer/src/components/tables/KraefteOverviewTable.tsx:32-46` und `FahrzeugeOverviewTable.tsx:32-44` (Tabellenköpfe ohne Sortierfunktion)
- `src/renderer/src/components/views/workspace/WorkspaceSections.tsx:283-289` (Fahrzeugliste ganz ohne Filter)

**Beobachtetes Problem**
Die Gesamtlisten sind unstrukturiert in der Reihenfolge der Abschnittsauflistung, ohne Suchfeld, ohne Sortierung nach Name, Abschnitt oder Status und ohne Statusfilter.

**Auswirkung im Einsatz**
Bei größeren Lagen mit dutzenden Einheiten wird "Wo steht Fahrzeug X?" oder "Welche Einheiten sind in Bereitstellung?" zur Scroll- und Suchaufgabe. Das kostet genau die Sekunden, die während einer Funkabfrage nicht da sind.

**Empfehlung**
Freitextsuche über Name, Funkrufname und Kennzeichen; Sortierung per Spaltenkopf; Filter nach Status und Abschnitt.

**Verifikation**
In einem Einsatz mit 60 Einheiten ein bekanntes Fahrzeug in unter zehn Sekunden finden.

### P1-11 Zeitangabe im NATO-Format ohne Zeitzonenkennung

**Fundstelle**
- `src/renderer/src/utils/datetime.ts:4-11` (`${dd}${hh}${mm}${mon}${yy}`, gebildet aus lokalen Getter-Methoden)
- Verwendung: `Topbar.tsx:46`, `StrengthDisplayView.tsx:195`

**Beobachtetes Problem**
Die Anzeige hat die Form `181430SEP26`. Die in der Datums-Zeit-Gruppe übliche Zeitzonenkennung (etwa `A`, `B` oder `Z` zwischen Minuten und Monat) fehlt; gerechnet wird mit der lokalen Systemzeit des jeweiligen Rechners.

**Annahme**: Die Darstellung soll einer Datums-Zeit-Gruppe entsprechen — das legen Bezeichnung und Format nahe (`README.md`, "NATO-Zeit"). Die konkrete hausinterne Schreibvorschrift ist dem Prüfer nicht bekannt.

**Auswirkung im Einsatz**
Ein Zeitstempel, der wie eine DTG aussieht, aber keine Zone nennt, ist in der Zusammenarbeit mit anderen Stellen mehrdeutig — besonders beim Wechsel Sommer-/Winterzeit und wenn mehrere Clients unterschiedlich konfigurierte Systemzeiten haben. Auf dem Wandmonitor wird diese Zeit groß und autoritativ dargestellt.

**Empfehlung**
Zonenkennung ergänzen und festlegen, welche Zeit maßgeblich ist. Zusätzlich sollte erkennbar sein, wenn Clients im Mehrplatzbetrieb voneinander abweichende Systemzeiten haben.

**Verifikation**
Systemzeitzone ändern und prüfen, ob die Anzeige die Zone kenntlich macht.

---

## P2 – Mittel

### P2-12 Technisches Debug-Fenster mitten in der Lageansicht

**Fundstelle**
- `src/renderer/src/components/views/EinsatzOverviewView.tsx:56-59` (Überschrift "UDP Broadcast Monitor" mit `<pre>`-Protokollausgabe, direkt unter den Einsatztabellen)

**Beobachtetes Problem**
Die Hauptansicht endet mit einem rohen Netzwerkprotokoll. Vergleichbare Diagnoseausgaben liegen sonst sauber in den Einstellungen (`WorkspaceSections.tsx:297-315`).

**Auswirkung im Einsatz**
Datenrauschen ohne Entscheidungsrelevanz im wichtigsten Bildschirm; bei Vorführung oder Beamerbetrieb wirkt es wie ein Fehlerzustand. Nutzer gewöhnen sich an unverständliche Ausgaben und übersehen dadurch echte Hinweise.

**Empfehlung**
In den Diagnosebereich verschieben.

**Verifikation**
Lageansicht enthält ausschließlich lagerelevante Inhalte.

### P2-13 Rohe Schlüsselwerte als Status und keine visuelle Abstufung

**Fundstellen**
- `src/renderer/src/components/tables/EinheitRow.tsx:118` (`{props.item.status}` unverändert, also `IN_BEREITSTELLUNG`)
- `src/renderer/src/components/tables/FahrzeugRow.tsx:95` (`AUSSER_BETRIEB`)
- `src/renderer/src/components/views/EinsatzOverviewView.tsx:38` (Einsatzstatus roh)
- `src/renderer/src/components/layout/AbschnittSidebar.tsx:71` (`{node.name} [{node.systemTyp}]`, also `[BEREITSTELLUNGSRAUM]`)
- `src/renderer/src/components/views/FuehrungsstrukturView.tsx:178-183` (lesbares Label **und** direkt daneben der rohe Enumwert)
- `src/renderer/src/styles/app.css` (Badge-Stile existieren für Split und Sperre, `:749`, `:760`; für Status existiert keine eigene Auszeichnung)

**Beobachtetes Problem**
Statuswerte erscheinen als technische Bezeichner in Großbuchstaben mit Unterstrichen und werden alle gleich dargestellt. Nichts hebt Abweichungen hervor; alles liest sich gleich wichtig.

**Auswirkung im Einsatz**
Beim Überfliegen einer langen Tabelle ist nicht erkennbar, welche Zeilen Aufmerksamkeit verlangen. Die Rolle braucht genau das: Abweichung zuerst.

**Empfehlung**
Lesbare deutsche Statusbezeichnungen und eine zurückhaltende, aber eindeutige Hervorhebung abweichender Zustände (nicht nur über Farbe, sondern zusätzlich über Form oder Text).

**Verifikation**
In einer Liste mit 40 Einheiten die drei abgemeldeten in unter fünf Sekunden finden.

### P2-14 Fehlende taktische Gliederung wird als "alles Mannschaft" dargestellt

**Fundstellen**
- `src/renderer/src/components/tables/EinheitRow.tsx:117` (Fallback `0/0/${aktuelleStaerke}/${aktuelleStaerke}`)
- `src/renderer/src/utils/tactical.ts:13-23` und identisch `src/main/services/einsatz-write/tactical-strength.ts:6-21`

**Beobachtetes Problem**
Ist keine taktische Stärke hinterlegt oder ist der gespeicherte Wert ungültig, zeigt die Tabelle eine vollständig aussehende Gliederung mit null Führungs- und null Unterführungskräften an. Fehlende Information ist von der Aussage "keine Führungskraft dabei" nicht unterscheidbar.

**Auswirkung im Einsatz**
Die Führungsstelle kann nicht erkennen, wo Angaben fehlen und nachgefordert werden müssen. Bei der Summenbildung fließt der geratene Wert unmarkiert in die Gesamtstärke ein.

**Empfehlung**
Fehlende oder ungültige Gliederung als solche kennzeichnen (etwa "Stärke unbestätigt") und in Summen sichtbar als unbestätigten Anteil führen.

**Verifikation**
Einheit ohne taktische Gliederung anlegen: Tabelle und Summen müssen den Zustand "unbestätigt" ausweisen.

### P2-15 Zwei Schreibweisen derselben Zahl, dazu ein fehlerhafter Startwert

**Fundstellen**
- `src/renderer/src/utils/tactical.ts:6-8` (Topbar-Form `1/5/10/16`)
- `src/renderer/src/app/useSystemActions.ts:149-150, 167-169` (für den Monitor wird per `replace` auf `1/5/10//16` umgeformt)
- `src/main/services/strength-display.ts:7-9` und `src/renderer/src/components/views/StrengthDisplayView.tsx:5` (Startwert `0/0/0//0`)

**Beobachtetes Problem**
Dieselbe Größe wird in der Topbar mit einfachem und auf dem Wandmonitor mit doppeltem Schrägstrich vor der Gesamtzahl dargestellt. Solange noch kein Zustand übertragen wurde, zeigt der Monitor `0/0/0//0`.

**Auswirkung im Einsatz**
Der Vergleich zwischen Arbeitsplatz und Wandanzeige erfordert eine gedankliche Umrechnung der Schreibweise; bei der Übernahme in handschriftliche Meldungen entstehen Uneinheitlichkeiten. Ein Monitor, der `0/0/0//0` zeigt, ist von "keine Kräfte im Einsatz" nicht zu unterscheiden.

**Empfehlung**
Eine einzige Schreibweise in der gesamten Anwendung. Für den Monitor vor dem ersten gültigen Zustand einen ausdrücklichen Hinweis anstelle einer Null-Stärke anzeigen.

**Verifikation**
Topbar und Monitor zeigen zeichengleiche Werte; frisch geöffneter Monitor ohne Daten zeigt keinen Zahlenwert.

### P2-16 Organisationsübersicht wird ohne Hinweis auf vier Einträge gekürzt

**Fundstelle**
- `src/renderer/src/components/views/FuehrungsstrukturView.tsx:128-134` (`.slice(0, 4)`), Ausgabe in `:139-156`

**Beobachtetes Problem**
Sind in einem Abschnitt mehr als vier Organisationen vertreten, entfallen die übrigen ersatzlos. Es gibt keinen "+n"-Hinweis.

**Auswirkung im Einsatz**
Bei überörtlichen Lagen mit mehreren Hilfsorganisationen verschwinden kleinere Beteiligte aus der Übersicht — gerade die, an die man beim Abarbeiten am ehesten nicht denkt.

**Empfehlung**
Rest als Sammelangabe mit Anzahl ausweisen.

**Verifikation**
Abschnitt mit sechs Organisationen: die Karte muss sechs Organisationen erkennbar machen.

### P2-17 Abschnittskontext ist in drei von fünf Ansichten unsichtbar

**Fundstellen**
- `src/renderer/src/app/useWorkspaceDerivedState.ts:40` (`showAbschnittSidebar = activeView === 'einsatz'`)
- `src/renderer/src/components/views/WorkspaceMainArea.tsx:26-41`

**Beobachtetes Problem**
Die Abschnittsleiste erscheint nur in der Einsatzansicht. In den Ansichten Führungsstruktur, Kräfte und Fahrzeuge ist nicht sichtbar, welcher Abschnitt ausgewählt ist, obwohl diese Auswahl im Hintergrund weiterwirkt (Datenladen, und wegen P0-1 auch der Listeninhalt).

**Auswirkung im Einsatz**
Beim Zurückwechseln ist unklar, in welchem Kontext man sich befindet; die Orientierung "wo war ich" geht verloren. In Verbindung mit P0-1 erklärt es zudem nicht, warum plötzlich weniger Zeilen zu sehen sind.

**Empfehlung**
Gewählten Abschnitt in allen Ansichten anzeigen (zumindest als Textzeile), auch wenn die Baumleiste ausgeblendet bleibt.

**Verifikation**
In jeder Ansicht ist ohne Rückwechsel ablesbar, welcher Abschnitt gewählt ist.

### P2-18 Sperrhinweise ohne Zeitbezug

**Fundstellen**
- `src/renderer/src/components/tables/EinheitRow.tsx:24-33` und `FahrzeugRow.tsx:21-30` (Anzeige nur `computerName` und `userName`)
- `src/renderer/src/components/layout/AbschnittSidebar.tsx:61-72` (analog)
- Verfügbar, aber ungenutzt: `src/shared/types.ts:249-260` (`acquiredAt`, `heartbeatAt`, `expiresAt`)

**Beobachtetes Problem**
Der Hinweis "In Bearbeitung: PC-03 (admin)" enthält keinen Zeitpunkt. Ob jemand seit zehn Sekunden oder seit vierzig Minuten in einem offenen Dialog steht, ist nicht erkennbar, obwohl die Daten vorliegen.

**Auswirkung im Einsatz**
Die Führungskraft kann nicht entscheiden, ob sie kurz wartet oder den betreffenden Arbeitsplatz ansprechen muss. Vergessene offene Dialoge blockieren unbemerkt.

**Empfehlung**
Sperrdauer bzw. Sperrbeginn anzeigen und alte Sperren optisch abheben.

**Verifikation**
Dialog auf Client A offen lassen, auf Client B muss nach wenigen Minuten die Sperrdauer ablesbar sein.

---

## P3 – Niedrig

### P3-19 Einbuchstabige Navigationsleiste

**Fundstelle**
- `src/renderer/src/components/layout/WorkspaceRail.tsx:16-43` (Schaltflächen "E", "G", "K", "F"; die Führungsstruktur trägt "G")

**Beobachtetes Problem**
Die Hauptnavigation besteht aus Einzelbuchstaben, deren Bedeutung sich nur aus dem Tooltip erschließt. "G" für "Führungsstruktur" ist nicht ableitbar.

**Auswirkung im Einsatz**
Kurze Orientierungspause bei jedem Wechsel, besonders für selten eingesetzte Kräfte in der Führungsstelle.

**Empfehlung**
Symbol plus Kurzbezeichnung, wie es die Einstellungsschaltfläche bereits mit einem Symbol andeutet.

**Verifikation**
Eine nicht eingewiesene Person findet die Führungsstruktur ohne Nachfrage.

### P3-20 Kein Zeitbezug zum Einsatz selbst

**Fundstellen**
- `src/renderer/src/components/layout/Topbar.tsx:33-48` (Name, Stärke, aktuelle Uhrzeit)
- Vorhanden, aber ungenutzt: `src/shared/types.ts:82-90` (`start`, `end`)

**Beobachtetes Problem**
Einsatzbeginn und Einsatzdauer werden nirgends dargestellt, obwohl sie im Datensatz stehen.

**Auswirkung im Einsatz**
Ablösungsrhythmus, Verpflegungszeitpunkte und Einsatzdauer müssen anderweitig mitgeführt werden.

**Empfehlung**
Einsatzbeginn und laufende Dauer in der Topbar ergänzen.

**Verifikation**
Einsatzdauer ist ohne weiteren Klick ablesbar.

### P3-21 Diagnose- und Platzhalterelemente in der Bedienoberfläche

**Fundstellen**
- `src/renderer/src/components/views/StrengthDisplayView.tsx:136` ("Weitere Einstellungen folgen" im Monitor-Menü)
- `src/renderer/src/components/views/StartView.tsx:41-43` ("DevTools öffnen" auf dem Startbildschirm für jeden Nutzer)

**Beobachtetes Problem**
Entwicklerwerkzeuge und Platzhaltertexte sind im Regelbetrieb sichtbar.

**Auswirkung im Einsatz**
Fehlbedienungsgelegenheit ohne Nutzen; ein versehentlich geöffnetes Entwicklerfenster auf dem Führungsrechner irritiert und verdeckt die Anwendung.

**Empfehlung**
Hinter eine Diagnoseeinstellung legen, Platzhalter entfernen.

**Verifikation**
Startbildschirm im Auslieferungszustand ohne Entwicklerfunktionen.

### P3-22 Einsatz kann in der Oberfläche nicht beendet oder archiviert werden

**Fundstellen**
- `src/renderer/src/app/useWorkspaceDerivedState.ts:39` (`isArchived` wird nur gelesen)
- `src/shared/types.ts:1` (Status `BEENDET`, `ARCHIVIERT` definiert); in `src/renderer` findet sich keine Bedienhandlung, die den Status setzt

**Beobachtetes Problem**
Die Statuswerte existieren im Modell und werden ausgewertet (Schreibschutz, Anzeige auf dem Startbildschirm über `StartView.tsx:72`), aber es gibt keine Bedienhandlung, um einen Einsatz zu beenden oder zu archivieren.

**Auswirkung im Einsatz**
Der Abschluss eines Einsatzes ist am Bildschirm nicht vollziehbar; alte Einsätze bleiben in der Liste zuletzt verwendeter Einsätze gleichrangig neben dem laufenden stehen, mit entsprechender Verwechslungsgefahr beim Öffnen.

**Empfehlung**
Bewussten, bestätigten Abschluss des Einsatzes in der Oberfläche vorsehen (mit Blick auf die Regeln des Reviewers für folgenschwere Aktionen: klare Folgenbeschreibung, keine beiläufige Schaltfläche).

**Verifikation**
Einen Einsatz beenden und danach eindeutig unterscheidbar in der Liste wiederfinden.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen — Kräfte lassen sich erfassen und eine Gesamtstärke anzeigen; ein belastbares, vollständiges Lagebild lässt sich ohne Umwege nicht ziehen.
- **Fremde Hilfe nötig:** ja — für die Nachvollziehbarkeit von Bewegungen (nur über Export), für die Rücknahme einer Fehlverschiebung und für die Übergabe an die ablösende Führungskraft.
- **Größtes Missverständnis:** Die Karten der Führungsstruktur beschriften die Personenzahl als "Einheiten gesamt" und die vollständige taktische Stärke als "Führungsstärke".
- **Größtes Einsatzrisiko:** Die Gesamtübersichten schrumpfen nach wenigen Sekunden unbemerkt auf den gewählten Abschnitt, während die Gesamtstärke korrekt bleibt — ein in sich widersprüchliches, aber plausibel aussehendes Lagebild.
- **Top-Priorität für die nächste Iteration:** P0-1 beheben und dabei die Regel festschreiben, dass eine Ansicht, die "alle" behauptet, entweder vollständig ist oder sich selbst sichtbar als unvollständig kennzeichnet.
