# Audit: Erstnutzung ohne Einweisung (THW New User Reviewer)

Rolle: THW-Helfer, technisch-praktisch versiert, kennt die Software nicht, hat keine Schulung
und kein Handbuch. Aufgabe: Einsatz öffnen bzw. anlegen, Kräfte erfassen, Stärke melden,
Einheit verschieben, Einsatz sauber abschließen.

## Scope und Methodik

- **Einschränkung: Dieser Audit ist rein code- und dokumentationsbasiert. Es gab keine laufende
  Instanz und keine Screenshots.** Bewertet wurde, was der Renderer nachweislich rendert
  (Beschriftungen, Buttons, Dialoge, Statusanzeigen) und was die Aktions-Hooks beim Klick tun.
  Aussagen zu Layout, Schriftgröße, Farbwirkung und tatsächlicher Klickreihenfolge sind nicht
  belastbar und wurden weggelassen.
- Geprüfte Quellen: `src/renderer/src` (Views, Dialoge, Inline-Editoren, Tabellen, Layout, Styles),
  `src/shared/types.ts`, relevante Main-Handler (`src/main/ipc`, `src/main/services/backup.ts`),
  `README.md`, `TODO.md`, `e2e/features/einsatz-lifecycle.feature`, `e2e/steps/einsatz.steps.ts`.
- Die e2e-Schritte wurden bewusst mitgelesen, weil sie dokumentieren, wie ein realer Ablauf
  tatsächlich durchgeklickt werden muss - an zwei Stellen belegen sie fehlende Bedienwege
  ausdrücklich im Kommentar.
- Nicht prüfbar (mangels laufender App): Fokusreihenfolge, Tastaturbedienung, Scrollverhalten bei
  langen Listen, Sichtbarkeit des Fehlerbanners beim Scrollen, Performance-Empfinden.
- Annahmen sind im Text als **Annahme** gekennzeichnet. Es werden keine THW-Vorschriften behauptet.

## Kurzes Urteil aus Rollensicht

Der Einstieg ist erstaunlich gut: Startbildschirm fragt in Klartext "bestehenden Einsatz öffnen
oder neuen anlegen", Einheit und Fahrzeug anlegen ist mit deutschen Feldnamen beschriftet, und das
taktische Zeichen wird mit Vorschau und Auto-Vorschlag erzeugt. Bis "Einheit erfasst" komme ich
allein durch.

Die Reibung beginnt danach. Drei Dinge halten mich ohne fremde Hilfe auf: Ich kann eine falsche
Aktion nicht zurücknehmen (kein Undo, kein Löschen in der Oberfläche), ich finde keinen Weg, den
Einsatz zu schließen oder abzuschließen, und die Zahl, die ich melde - die Gesamtstärke - kann
stillschweigend Kräfte auslassen, ohne dass irgendwo steht, warum. Dazu kommen Entwickler-Begriffe
an genau den Stellen, an denen ich entscheiden muss (`Systemtyp`, `Parent-Abschnitt`, `NORMAL`,
`IN_BEREITSTELLUNG`, `Seeder`, `RTT`).

---

## P0 - Einsatzkritisch

### P0-1 Gesamtstärke schließt "ANFAHRT"-Abschnitte stillschweigend aus

- **Fundstelle:** `src/renderer/src/app/useEinsatzData.ts:236-258` (`aggregateTacticalStrength`,
  Abbruch bei `systemTyp === 'ANFAHRT'`); dieselbe Regel nochmals in
  `src/renderer/src/components/views/FuehrungsstrukturView.tsx:79`; angezeigt in
  `src/renderer/src/components/layout/Topbar.tsx:41-47` und im Vollbildmonitor
  `src/renderer/src/components/views/StrengthDisplayView.tsx:231`; wählbar ohne jeden Hinweis in
  `src/renderer/src/components/dialogs/CreateAbschnittDialog.tsx:44`.
- **Beobachtung:** Einheiten, die in einem Abschnitt mit Systemtyp `ANFAHRT` stehen, zählen nicht in
  die Gesamtstärke - weder in der Topbar noch im projizierten Stärke-Monitor noch in der
  Führungsstruktur. In der Oberfläche steht diese Regel nirgends. Der Abschnittstyp ist beim Anlegen
  ein gleichrangiger Eintrag in einer Auswahlliste neben `NORMAL`, `LOGISTIK` usw.
- **Erwartung der Rolle:** Was ich in der Liste sehe, ist auch in der Summe drin. Wenn eine Einheit
  bewusst nicht mitzählt, muss das an der Zahl stehen ("ohne Anfahrt", "12 (+9 in Anfahrt)").
- **Auswirkung im Einsatz:** Die Stärkemeldung, die von der Monitorwand abgelesen und weitergemeldet
  wird, ist zu niedrig. Anrückende Kräfte sind unsichtbar. Der Fehler ist still - niemand bemerkt
  ihn, bis jemand nachzählt.
- **Empfehlung:** Die Summe muss beschriften, was sie enthält, und die ausgeklammerten Kräfte
  sichtbar danebenstellen. Beim Anlegen/Ändern eines Abschnitts muss beim Typ "Anfahrt" in Klartext
  stehen, dass Kräfte dort nicht in die Gesamtstärke zählen.
- **Verifikation:** Einheit mit Stärke 0/1/8 in einen Anfahrt-Abschnitt legen. Topbar und Monitor
  müssen entweder mitzählen oder den Ausschluss beziffert ausweisen. Ein Erstnutzer muss die Frage
  "warum sind es nur 12?" allein aus dem Bildschirm beantworten können.

### P0-2 "Backup laden" überschreibt die laufende Einsatzdatei ohne Warnung und ohne Rückweg

- **Fundstelle:** Button `src/renderer/src/components/views/SettingsView.tsx:226-228`; Ablauf
  `src/renderer/src/app/useSystemActions.ts:53-71`; Dateiauswahl
  `src/main/ipc/register-einsatz-ipc-support.ts:59-67` (Dialogtitel nur "Backup laden");
  Ausführung `src/main/services/backup.ts:59-62` (`fs.copyFileSync(backupFilePath, dbPath)`).
- **Beobachtung:** Ein Klick auf "Backup laden" öffnet einen Dateiauswahl-Dialog. Sobald eine Datei
  gewählt ist, wird die aktive Einsatzdatei sofort überschrieben - keine Rückfrage, keine
  Sicherungskopie des aktuellen Standes, kein Hinweis, dass alle Eingaben seit dem Backup-Zeitpunkt
  verloren sind. Backups entstehen nur alle 5 Minuten (`backup.ts`, `FIVE_MINUTES`), es können also
  bis zu fünf Minuten Lageführung verschwinden.
- **Erwartung der Rolle:** "Laden" klingt nach ansehen oder daneben öffnen, nicht nach ersetzen.
  Spätestens beim Ersetzen erwarte ich eine deutliche Rückfrage mit Zeitstempel des Backups und dem
  Hinweis, was verloren geht.
- **Auswirkung im Einsatz:** Wer aus Neugier oder auf der Suche nach "wo sind meine alten Daten"
  darauf klickt, kann den aktuellen Lagestand der gesamten Führungsstelle vernichten - auch für alle
  anderen Clients auf demselben Share.
- **Empfehlung:** Beschriftung, die die Folge nennt ("Einsatzstand aus Backup wiederherstellen -
  überschreibt den aktuellen Stand"), zweistufige Bestätigung mit Anzeige von Backup-Zeitpunkt und
  aktuellem Stand, und automatische Sicherung des überschriebenen Standes vor dem Kopieren.
- **Verifikation:** Erstnutzer bitten, "mal zu schauen, welche Backups es gibt". Der Versuch darf
  nicht zu Datenverlust führen können, ohne dass die Folge vorher in einem Satz dastand.

### P0-3 Keine Korrekturmöglichkeit: kein Rückgängig, kein Löschen von Einheit/Fahrzeug/Abschnitt

- **Fundstelle:** In `src/renderer/src` existiert kein Treffer für "undo" oder "rückgängig"; die
  Funktion ist nur per IPC vorhanden und wird im Test ausdrücklich am UI vorbei aufgerufen:
  `e2e/steps/einsatz.steps.ts:232-241` ("Kein UI-Button für Undo vorhanden → IPC direkt aufrufen").
  Löschen gibt es im Renderer ausschließlich für Helferzeilen
  (`src/renderer/src/app/einheit-actions/useEinheitHelferActions.ts:70`), nicht für Einheit,
  Fahrzeug oder Abschnitt.
- **Beobachtung:** Eine versehentlich angelegte Einheit, ein doppelt erfasstes Fahrzeug oder ein
  falsch benannter Abschnitt bleibt dauerhaft im Einsatz stehen. Eine falsche Verschiebung lässt sich
  nur durch erneutes, manuelles Zurückverschieben heilen - vorausgesetzt, ich weiß noch, wo die
  Einheit vorher stand (das zeigt der Verschiebedialog nicht an, siehe P1-1).
- **Erwartung der Rolle:** Jede Erfassungsanwendung kann das, was sie anlegt, auch wieder entfernen,
  und ein Fehlgriff ist mit einem Klick zurücknehmbar.
- **Auswirkung im Einsatz:** Falscheinträge bleiben in Lagebild, Stärkemeldung und Einsatzakte
  stehen. Unter Zeitdruck wird notgedrungen mit Namenszusätzen wie "XX falsch" gearbeitet -
  Verfälschung der Dokumentation.
- **Empfehlung:** Rückgängig-Funktion in der Oberfläche sichtbar machen (die Fachlogik existiert
  bereits) und für Einheit/Fahrzeug/Abschnitt einen klar benannten Weg zum Entfernen bzw. Abmelden
  mit Bestätigung anbieten.
- **Verifikation:** Erstnutzer legt bewusst eine falsche Einheit an und soll sie ohne Hilfe wieder
  loswerden. Aufgabe muss ohne Umbenennungs-Workaround lösbar sein.

### P0-4 Kein Weg, den Einsatz zu schließen, zu wechseln oder abzuschließen

- **Fundstelle:** Navigationsleiste kennt nur fünf Ansichten
  (`src/renderer/src/components/layout/WorkspaceRail.tsx:16-51`,
  `src/renderer/src/types/ui.ts:14-19`). Es gibt im Renderer keinen Treffer für "beenden",
  "archivieren" oder "abschließen" außer dem Nur-Lese-Banner
  (`src/renderer/src/components/views/AppWorkspaceShell.tsx:311`). Der einzige Weg zurück zum
  Startbildschirm ist der Umweg über "Verzeichnis speichern", was der eigene Test dokumentiert:
  `e2e/steps/einsatz.steps.ts:309-321` ("Einstellungen-Tab → 'Verzeichnis speichern' ruft
  clearSelectedEinsatz auf"); Ursache `src/renderer/src/app/useSystemActions.ts:36-41`.
- **Beobachtung:** Wer den falschen Einsatz geöffnet hat oder einen zweiten Einsatz öffnen will,
  findet keine Schaltfläche dafür. Der funktionierende Weg ist ein Knopf in den Einstellungen, dessen
  Beschriftung ("Verzeichnis speichern") nichts mit Schließen zu tun hat und diesen Nebeneffekt nicht
  ankündigt. Den Status `BEENDET`/`ARCHIVIERT` gibt es im Datenmodell
  (`src/shared/types.ts:1`), aber keine Bedienung dazu.
- **Erwartung der Rolle:** Oben steht der Einsatzname - dort erwarte ich "Einsatz wechseln" und
  "Einsatz beenden". Ein Einsatz, der vorbei ist, wird abgeschlossen, nicht offen liegengelassen.
- **Auswirkung im Einsatz:** Beim Schichtwechsel oder bei Parallellagen wird die App neu gestartet,
  oder es wird im falschen Einsatz weitergearbeitet - Einträge landen in der falschen Einsatzakte.
  Ein versehentlicher Klick auf "Verzeichnis speichern" wirft den Nutzer zudem unangekündigt aus dem
  Einsatz.
- **Empfehlung:** "Einsatz schließen/wechseln" sichtbar in die Kopfzeile, "Einsatz beenden" als
  bewusster, bestätigter Abschluss. "Verzeichnis speichern" darf den geöffneten Einsatz nicht als
  unangekündigten Nebeneffekt schließen.
- **Verifikation:** Erstnutzer öffnet Einsatz A, soll nach B wechseln - ohne App-Neustart und ohne
  die Einstellungen zu benutzen.

### P0-5 "Einheiten gesamt" zeigt Personen, nicht Einheiten

- **Fundstelle:** `src/renderer/src/components/views/FuehrungsstrukturView.tsx:194-200` in Verbindung
  mit `src/renderer/src/utils/tactical.ts:6-8` (`gesamt` ist die vierte Stelle der taktischen Stärke,
  also die Personensumme) und `FuehrungsstrukturView.tsx:101-104`.
- **Beobachtung:** Jede Abschnittskarte zeigt "Führungsstärke: 1/2/9/12" und direkt darunter
  "Einheiten gesamt: 12". Die 12 ist die Zahl der Personen, nicht die Zahl der Einheiten. Die Zahl der
  Einheiten steckt tatsächlich in den Organisations-Chips daneben ("THW (2)").
- **Erwartung der Rolle:** "Einheiten gesamt" ist die Anzahl der Einheiten. Die Zeile steht direkt
  unter der Stärke - ich lese sie als zweite, unabhängige Information.
- **Auswirkung im Einsatz:** In der Führungsansicht, die für Lagevorträge gedacht ist, wird eine
  Personenzahl als Einheitenzahl gemeldet. Das ist eine gefährliche Fehlinterpretation genau in der
  Ansicht, in der Entscheidungen vorbereitet werden. Zusätzlich ist "Führungsstärke" eine
  irreführende Bezeichnung für die taktische Gesamtstärke - sie legt "Anzahl Führungskräfte" nahe.
- **Empfehlung:** Beschriftungen an die Bedeutung anpassen ("Stärke (F/U/M/Gesamt)", "Personen
  gesamt", separat "Einheiten: n") und die Reihenfolge F/U/M im Umfeld der Zahl erklären.
- **Verifikation:** Erstnutzer auf eine Karte zeigen und fragen: "Wie viele Einheiten und wie viele
  Personen sind in diesem Abschnitt?" Beide Antworten müssen ohne Nachfrage stimmen.

---

## P1 - Hoch

### P1-1 Verschiebedialog zeigt weder das Objekt noch den aktuellen Standort - und ist sofort scharf

- **Fundstelle:** `src/renderer/src/components/dialogs/MoveDialog.tsx:23-41`; Vorbelegung des Ziels
  auf den zuletzt gewählten Abschnitt in
  `src/renderer/src/app/app-view-props.ts:322-333` (`setMoveTarget(selectedAbschnittId)`);
  Ausführung `src/renderer/src/app/useSystemActions.ts:100-119`.
- **Beobachtung:** Der Dialog heißt nur "Einheit verschieben". Welche Einheit gemeint ist, steht
  nirgends - nur der Zeilen-Icon-Klick davor hat es festgelegt. Der aktuelle Abschnitt wird nicht
  gezeigt, die Auswahlliste hat keine Beschriftung, und das Ziel ist bereits vorbelegt, sodass
  "Bestätigen" sofort aktiv ist. In den Ansichten "Kräfte" und "Fahrzeuge" ist die Abschnittsleiste
  ausgeblendet (`src/renderer/src/app/useWorkspaceDerivedState.ts:40`), die Vorbelegung stammt also
  aus einem Abschnitt, den ich gerade gar nicht sehe.
- **Erwartung der Rolle:** "Einheit X von Abschnitt A nach [Auswahl]". Ohne Quelle und Objekt kann
  ich nicht prüfen, ob ich die richtige Zeile erwischt habe.
- **Auswirkung im Einsatz:** Ein Fehlklick in einer langen Tabelle verschiebt die falsche Einheit in
  einen unsichtbar vorbelegten Abschnitt. Weil es kein Rückgängig gibt (P0-3), ist die Korrektur
  Handarbeit - und im Lagebild steht zwischenzeitlich eine falsche Zuordnung.
- **Empfehlung:** Objektname und aktueller Abschnitt in den Dialogkopf, Auswahlliste beschriften
  ("Neuer Abschnitt"), den aktuellen Abschnitt als Ausgangswert setzen und "Bestätigen" erst
  freigeben, wenn ein abweichendes Ziel gewählt wurde. Bestätigungstext als vollständiger Satz.
- **Verifikation:** Erstnutzer soll eine bestimmte Einheit verschieben und vor dem Bestätigen sagen,
  was gleich passiert - Objekt, Quelle und Ziel.

### P1-2 Zwei Speicherlogiken in einem Formular: "Abbrechen" nimmt Helfer- und Fahrzeugänderungen nicht zurück

- **Fundstelle:** Äußeres Formular mit "Speichern"/"Abbrechen"
  `src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:141-151`; Helferzeilen mit
  eigenen Knöpfen "Speichern"/"Löschen"/"Hinzufügen"
  `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:150-183`; Speichern der
  Einheit `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:119-147`.
- **Beobachtung:** In derselben Maske gibt es oben ein Formular, das erst beim Klick auf "Speichern"
  wirkt, und darin eingebettete Tabellen (Helfer, Fahrzeuge), deren Knöpfe sofort in die Datenbank
  schreiben. "Abbrechen" oben verwirft nur die Kopfdaten; gelöschte oder hinzugefügte Helfer bleiben
  gelöscht bzw. angelegt. Das Löschen einer Helferzeile erfolgt zudem ohne jede Rückfrage.
- **Erwartung der Rolle:** Ein Formular mit Speichern und Abbrechen ist eine Einheit. "Abbrechen"
  heißt: nichts von dem, was ich hier gemacht habe, wurde übernommen.
- **Auswirkung im Einsatz:** Wer sich vertippt und "Abbrechen" als Notbremse benutzt, hat trotzdem
  Personendaten gelöscht oder doppelt angelegt - und merkt es nicht, weil die Maske danach zugeht.
- **Empfehlung:** Entweder alles im Formular sammeln und gemeinsam speichern, oder die sofort
  wirkenden Bereiche optisch und sprachlich klar abtrennen ("wird sofort gespeichert") und "Löschen"
  mit Rückfrage versehen. "Abbrechen" darf nicht suggerieren, dass es alles zurücknimmt.
- **Verifikation:** Erstnutzer eine Helferzeile löschen lassen, dann "Abbrechen" klicken, dann
  fragen, ob die Zeile noch da ist. Die Antwort muss mit der Realität übereinstimmen.

### P1-3 Automatisch erzeugte Helferzeilen erscheinen und verschwinden unerklärt - eingetippte Namen gehen verloren

- **Fundstelle:** `src/renderer/src/components/editor/inline/InlineEinheitEditor.tsx:77-104`
  (`nextAutoRows`, Differenz zwischen Stärkezahlen und erfassten Helfern) und `:131-133`
  (Neuberechnung bei jeder Formularänderung); Darstellung
  `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:234-250`.
- **Beobachtung:** Sobald in Führung/Unterführung/Mannschaft Zahlen stehen, tauchen in der
  Helfertabelle leere Zeilen auf - eine je "fehlender" Person - mit dem Knopf "Hinzufügen". Es steht
  nirgends, woher diese Zeilen kommen, ob sie schon zählen oder erst nach "Hinzufügen". Wird die
  Mannschaftszahl verkleinert, verschwinden die überzähligen Zeilen samt bereits eingetippter Namen.
- **Erwartung der Rolle:** Entweder trage ich Namen ein, oder ich trage Zahlen ein. Zeilen, die von
  selbst entstehen, muss die Maske erklären ("noch 8 Personen ohne Namen").
- **Auswirkung im Einsatz:** Halb erfasste Namenslisten gehen beim Korrigieren einer Zahl verloren;
  unklar bleibt, ob die gemeldete Stärke aus den Zahlen oder aus den Namen kommt (tatsächlich aus den
  Zahlen, siehe `useEinheitEditActions.ts:125-126`). Doppelerfassung und Fehlmeldung sind
  wahrscheinlich.
- **Empfehlung:** Die automatischen Zeilen als das beschriften, was sie sind (Platzhalter für noch
  nicht namentlich erfasste Personen), bereits ausgefüllte Platzhalter nicht ohne Hinweis entfernen,
  und in einem Satz sagen, welche Angabe die gemeldete Stärke bestimmt.
- **Verifikation:** Erstnutzer 8 Mannschaft eintragen, zwei Namen eintippen, dann auf 6 reduzieren.
  Es darf keine Eingabe kommentarlos verschwinden.

### P1-4 Einsatzakte/Export ist in der Oberfläche nicht erreichbar

- **Fundstelle:** `src/renderer/src/components/views/ExportView.tsx` ist definiert, wird aber nirgends
  eingebunden (kein Import in `src/renderer/src`); die Navigationsleiste kennt keine Export-Ansicht
  (`src/renderer/src/types/ui.ts:14-19`,
  `src/renderer/src/components/views/workspace/WorkspaceSections.tsx:320-329`). Der Handler existiert:
  `src/main/ipc/register-einsatz-ipc.ts:389-399` (`EXPORT_EINSATZAKTE`).
- **Beobachtung:** Es gibt keinen Knopf, um die Einsatzakte (ZIP mit Datenbankkopie, HTML-Report,
  CSV) zu erzeugen, obwohl die Funktion vorhanden und im Code beschrieben ist.
- **Erwartung der Rolle:** Am Ende einer Lage will ich das Ergebnis herausgeben können - als Datei
  zum Ausdrucken oder Weiterreichen.
- **Auswirkung im Einsatz:** Die Dokumentation bleibt in einer Programmdatei gefangen. Wer Zahlen
  weitergeben muss, schreibt sie ab - Übertragungsfehler und Zeitverlust, obwohl die Funktion da ist.
- **Empfehlung:** Export als eigenen, benannten Punkt in die Navigation aufnehmen und beim Abschluss
  eines Einsatzes aktiv anbieten.
- **Verifikation:** Erstnutzer soll "die Zahlen für die Übergabe rausgeben". Aufgabe muss ohne
  Hinweis von außen lösbar sein.

### P1-5 Einstiegs- und Hauptansicht zeigen Entwickler-Werkzeuge als gleichwertige Funktionen

- **Fundstelle:** "DevTools öffnen" direkt neben "Auf Updates prüfen" auf dem Startbildschirm
  `src/renderer/src/components/views/StartView.tsx:42-44`; "UDP Broadcast Monitor" mit Rohprotokoll
  unterhalb der Einheiten-/Fahrzeugtabellen der Haupt-Einsatzansicht
  `src/renderer/src/components/views/EinsatzOverviewView.tsx:56-59`; in den Einstellungen
  "Seeder", "Discovery Port", "HTTP Port", "Freshness", "RTT", "Debug Sync Logs", "UDP Debug Monitor"
  sowie der Hinweis "Inaktiv (S1_UPDATER_LAN_PEER=1 setzen)"
  `src/renderer/src/components/views/SettingsView.tsx:62-97,102-125,161-196,257-258`.
- **Beobachtung:** Diagnosewerkzeuge stehen unbeschriftet und ohne Abgrenzung zwischen den
  Arbeitsfunktionen. Der Startbildschirm bietet als eine von vier Schaltflächen die
  Entwicklerkonsole an. Die Einstellungen verlangen an einer Stelle das Setzen einer
  Umgebungsvariablen.
- **Erwartung der Rolle:** Auf dem Einstiegsbildschirm stehen die Dinge, die ich im Einsatz brauche.
  Technikanzeigen gehören hinter einen erkennbar technischen Bereich.
- **Auswirkung im Einsatz:** Neue Nutzer klicken unter Zeitdruck auf "DevTools" und stehen vor einem
  Entwicklerfenster, das sie nicht zuordnen und unter Stress schwer wieder loswerden. Der
  Protokollblock in der Hauptansicht kostet Aufmerksamkeit und schiebt die eigentlichen Tabellen
  nach oben aus dem Blick. Die Einstellungen wirken, als sei die Anwendung nicht fertig - das
  untergräbt das Vertrauen in die angezeigten Zahlen.
- **Empfehlung:** Diagnose in einen klar benannten Bereich ("Technik/Diagnose") bündeln, aus
  Startbildschirm und Einsatzübersicht entfernen, und Hinweise auf Umgebungsvariablen durch
  Klartext ersetzen.
- **Verifikation:** Erstnutzer bitten, alles zu benennen, was er auf Start- und Hauptbildschirm
  sieht. Nichts Unerklärliches darf übrig bleiben.

### P1-6 Rohe Statuswerte in Anzeige und Auswahl

- **Fundstelle:** Anzeige `src/renderer/src/components/tables/EinheitRow.tsx:118`,
  `src/renderer/src/components/tables/FahrzeugRow.tsx:95`,
  `src/renderer/src/components/views/EinsatzOverviewView.tsx:36-39`; Auswahl
  `src/renderer/src/components/editor/inline/EinheitFormRows.tsx:38-42`,
  `src/renderer/src/components/dialogs/EinheitFormFields.tsx:114-118`; Abschnittstypen
  `src/renderer/src/components/dialogs/CreateAbschnittDialog.tsx:42-46`,
  `src/renderer/src/components/dialogs/EditAbschnittDialog.tsx:42`, Baumanzeige
  `src/renderer/src/components/layout/AbschnittSidebar.tsx:71`.
- **Beobachtung:** Statuswerte erscheinen als Datenbankkonstanten: `AKTIV`,
  `IN_BEREITSTELLUNG`, `ABGEMELDET`, `AUSSER_BETRIEB`, `ARCHIVIERT`, Abschnittstypen als `NORMAL`,
  `FUEST`, `BEREITSTELLUNGSRAUM`. In der Führungsansicht stehen sogar Klartext und Rohwert
  nebeneinander ("FüSt" und darunter "FUEST",
  `src/renderer/src/components/views/FuehrungsstrukturView.tsx:178,183`).
- **Erwartung der Rolle:** Beschriftungen in normaler Sprache: "aktiv", "in Bereitstellung",
  "abgemeldet", "außer Betrieb"; beim Abschnitt "normaler Abschnitt", "Führungsstelle".
- **Auswirkung im Einsatz:** Beim schnellen Überfliegen einer Tabelle verschwimmen Großbuchstaben
  mit Unterstrich zu einem Block; "AUSSER_BETRIEB" und "IN_BEREITSTELLUNG" unterscheiden sich für
  das Auge kaum. Statusverwechslung bei Fahrzeugen führt zu Aufträgen an nicht einsatzbereites Gerät.
  Zusätzlich ist der Status ausschließlich Text, ohne zweites Unterscheidungsmerkmal.
- **Empfehlung:** Durchgängig lesbare Beschriftungen verwenden (eine Übersetzungstabelle existiert
  bereits für Abschnittstypen in `FuehrungsstrukturView.tsx:28-34` und für Organisationen in
  `prettyOrganisation`) und den Status zusätzlich sichtbar abheben, nicht nur als Wort.
- **Verifikation:** Erstnutzer in einer gemischten Fahrzeugliste alle nicht einsatzbereiten
  Fahrzeuge in unter 10 Sekunden zeigen lassen.

### P1-7 "Einheit anlegen" kann wirkungslos bleiben, ohne dass etwas passiert

- **Fundstelle:** `src/renderer/src/app/einheit-actions/useEinheitCreateActions.ts:41-50` - bei
  fehlendem `selectedAbschnittId` kehrt die Funktion ohne Meldung zurück; der Knopf ist dabei aktiv
  (`src/renderer/src/components/views/workspace/WorkspaceSections.tsx:250-255` prüft nur `busy` und
  `isArchived`). Die Abschnittsleiste ist in den Ansichten "Kräfte"/"Fahrzeuge" ausgeblendet
  (`src/renderer/src/app/useWorkspaceDerivedState.ts:40`).
- **Beobachtung:** Klickbarer Knopf, der unter bestimmten Umständen gar nichts tut - kein Dialog,
  keine Fehlermeldung. **Annahme:** Im Normalbetrieb wird ein Abschnitt automatisch vorausgewählt,
  sodass der Fall vor allem direkt nach dem Öffnen bzw. bei leerer Auswahl auftritt; ohne laufende
  App ist die Häufigkeit nicht belegbar.
- **Erwartung der Rolle:** Ein Knopf, der nicht geht, ist ausgegraut - oder er sagt mir, was fehlt.
- **Auswirkung im Einsatz:** Der Nutzer klickt mehrfach, hält die App für hängend, und geht im
  schlimmsten Fall davon aus, dass Erfassen gerade nicht möglich ist.
- **Empfehlung:** Knopf deaktivieren, solange kein Abschnitt gewählt ist, und den Grund im Tooltip
  bzw. als kurze Meldung nennen. In Ansichten ohne sichtbare Abschnittsleiste den Zielabschnitt im
  Formular ohnehin anzeigen.
- **Verifikation:** In jeder Ansicht "Einheit anlegen" drücken. Es muss immer entweder ein Formular
  erscheinen oder eine verständliche Begründung.

---

## P2 - Mittel

### P2-1 Navigationsleiste nur mit Einzelbuchstaben, Bedeutung nur im Tooltip

- **Fundstelle:** `src/renderer/src/components/layout/WorkspaceRail.tsx:16-51` - Schaltflächen "E",
  "G", "K", "F" plus ein Zahnrad; Klartext nur im `title`-Attribut. Breite 42px
  (`src/renderer/src/styles/app.css:365-374`).
- **Beobachtung:** Die einzige Hauptnavigation besteht aus vier Buchstaben. "G" steht für
  "Führungsstruktur" - der Buchstabe kommt im Wort nicht vor. "E" (Einsatz) und "K" (Kräfte) sind
  ebenfalls mehrdeutig, "F" könnte Fahrzeuge oder Führung sein.
- **Erwartung der Rolle:** Beschriftete Reiter, oder zumindest Symbol plus Wort.
- **Auswirkung im Einsatz:** Erstnutzer probieren die Ansichten durch, statt gezielt zu wechseln.
  Das kostet bei jedem Wechsel Sekunden und Aufmerksamkeit; Tooltips helfen nur mit Maus und Ruhe.
- **Empfehlung:** Klartext unter oder neben dem Symbol, zumindest für die vier Hauptansichten.
- **Verifikation:** Erstnutzer ohne Hovern fragen, hinter welchem Knopf die Fahrzeuge stecken.

### P2-2 Aktionen in Tabellen nur als Symbol, "Splitten" mit entwicklertypischem Zeichen

- **Fundstelle:** `src/renderer/src/components/common/ActionIconButton.tsx:14-26` (Text nur als
  `aria-label`/`title`); Symbole `src/renderer/src/components/tables/EinheitRow.tsx:2,80-97`
  (`faArrowsUpDownLeftRight` für Verschieben, `faPenToSquare` für Bearbeiten, `faCodeBranch` für
  Splitten); Stiftzeichen "✎" als Textzeichen in
  `src/renderer/src/components/views/FuehrungsstrukturView.tsx:185-191`.
- **Beobachtung:** Die drei Aktionen je Zeile sind nur Symbole. Das Verzweigungssymbol für
  "Splitten" stammt aus der Softwareentwicklung und ist für die Zielgruppe nicht vorbelegt; es lässt
  mehrere Deutungen zu (verschieben, unterstellen, kopieren).
- **Erwartung der Rolle:** Bei einer folgenreichen Aktion erwarte ich ein Wort, nicht nur ein Bild.
- **Auswirkung im Einsatz:** Symbole werden ausprobiert. Beim Verschieben ist das durch P1-1
  unmittelbar folgenreich.
- **Empfehlung:** Text neben dem Symbol, zumindest für "Verschieben" und "Splitten"; alternativ die
  Spalte "Aktion" mit einer Legende versehen.
- **Verifikation:** Erstnutzer die drei Symbole einer Zeile benennen lassen, bevor er klickt.

### P2-3 Abkürzungen ohne Auflösung in Erfassungsmasken

- **Fundstelle:** `src/renderer/src/components/editor/inline/EinheitFormRows.tsx:171-199` (GrFü, OV,
  RB, LV mit Telefon/Fax); `src/renderer/src/components/dialogs/EinheitFormFields.tsx:139-154`;
  "FüSt Name" ohne Erklärung und ohne Beispiel auf dem Startbildschirm
  `src/renderer/src/components/views/StartView.tsx:92-95`; "STAN-Vorschlag"/"STAN-Fahrzeuge"
  `src/renderer/src/components/editor/inline/EinheitFormRows.tsx:148-159`; "Denominator" als
  Eingabefeld `src/renderer/src/components/editor/shared/TacticalSignSection.tsx:218-222`.
- **Beobachtung:** Kurzformen stehen unaufgelöst als Feldnamen. Beim Einsatzanlegen hat
  "Einsatzname" ein Beispiel, "FüSt Name" keines. "Denominator" ist ein Fachbegriff aus der
  Zeichenkonstruktion, nicht aus der Einsatzsprache.
- **Erwartung der Rolle:** Ein Feld, das ich beim ersten Mal ausfüllen soll, sagt mir mit einem
  Beispiel, was hineingehört.
- **Auswirkung im Einsatz:** Felder bleiben leer oder werden falsch befüllt; die Einsatzakte ist
  später unvollständig. Beim Anlegen des Einsatzes wird der Name der Führungsstelle geraten - und
  dieser Name wird sofort zum ersten Abschnitt (siehe e2e-Szenario "FüSt 1 [FUEST]").
- **Empfehlung:** Ausgeschriebene Bezeichnung oder Beispieltext an jedem Kurzfeld; "Denominator"
  durch die gemeinte Angabe ersetzen.
- **Verifikation:** Erstnutzer alle Felder eines Erfassungsbogens ausfüllen lassen und fragen, bei
  welchen er geraten hat.

### P2-4 Voreingestellte Stärke 0/1/8 erscheint ohne Erklärung

- **Fundstelle:** `src/renderer/src/app/einheit-actions/useEinheitCreateActions.ts:12-14`.
- **Beobachtung:** Beim Anlegen einer Einheit stehen bereits Führung 0, Unterführung 1, Mannschaft 8
  in den Feldern. Woher diese Werte kommen, steht nirgends. **Annahme:** gemeint ist eine typische
  Gruppenstärke; das ist nicht belegt und für eine Einheit anderer Organisation nicht passend.
- **Erwartung der Rolle:** Entweder leere Felder, oder ein Hinweis "Vorschlag, bitte prüfen".
- **Auswirkung im Einsatz:** Wer nur den Namen einträgt und speichert, meldet eine erfundene
  Stärke von 9 Personen. Das fällt in der Summe nicht auf.
- **Empfehlung:** Vorbelegung als Vorschlag kennzeichnen oder leer lassen und die Eingabe erzwingen.
- **Verifikation:** Einheit nur mit Namen anlegen. Es darf keine Stärke entstehen, die niemand
  eingegeben hat.

### P2-5 Zwei Schreibweisen für dieselbe Stärke

- **Fundstelle:** Topbar `src/renderer/src/components/layout/Topbar.tsx:42` über
  `src/renderer/src/utils/tactical.ts:6-8` ergibt "1/2/9/12"; der Vollbildmonitor bekommt dieselbe
  Zahl mit doppeltem Trennstrich `src/renderer/src/app/useSystemActions.ts:149-151` und zeigt
  "1/2/9//12" (`src/renderer/src/components/views/StrengthDisplayView.tsx:231`,
  Standardwert `:5`).
- **Beobachtung:** Dieselbe Größe wird an zwei Stellen unterschiedlich geschrieben.
- **Erwartung der Rolle:** Die Zahl auf der Wand und die Zahl im Programm sehen gleich aus.
- **Auswirkung im Einsatz:** Kurzes Stocken beim Abgleich und die Frage, ob es sich um zwei
  verschiedene Werte handelt. Kein Datenfehler, aber vermeidbare Unsicherheit beim Melden.
- **Empfehlung:** Eine Schreibweise festlegen und überall verwenden.
- **Verifikation:** Beide Anzeigen nebeneinander zeigen und nach der aktuellen Stärke fragen.

### P2-6 Sperrhinweise und Fehlermeldungen sprechen Technik statt Handlung

- **Fundstelle:** `src/renderer/src/app/useEditLocks.ts:103` ("Datensatz wird gerade von <Computer>
  (<Benutzer>) bearbeitet."); Zeilenbadges `src/renderer/src/components/tables/EinheitRow.tsx:30-31`
  ("In Bearbeitung: …", "Bearbeiten gesperrt (…)"); Baum
  `src/renderer/src/components/layout/AbschnittSidebar.tsx:72` ("Gesperrt: …"); allgemeiner
  Rückfalltext `src/renderer/src/utils/error.ts:8` (nur "Fehler"); Fehlerbanner
  `src/renderer/src/components/views/AppWorkspaceShell.tsx:312`.
- **Beobachtung:** "Datensatz" ist Datenbanksprache. Die Meldungen sagen, was blockiert ist, aber
  nicht, was ich tun soll und wie lange es dauert. Der allgemeine Rückfalltext lautet schlicht
  "Fehler". Das Fehlerbanner hat keinen Schließen-Knopf.
- **Erwartung der Rolle:** "Die Einheit X wird gerade an Rechner Y bearbeitet. Bitte kurz warten
  oder dort abstimmen."
- **Auswirkung im Einsatz:** In einer Führungsstelle mit mehreren Arbeitsplätzen ist das der
  häufigste Stolperstein. Ohne Handlungsanweisung wird geklickt statt gesprochen.
- **Empfehlung:** Meldungen als vollständige Sätze mit Objektnamen und nächstem Schritt formulieren;
  "Datensatz" vermeiden; einen aussagekräftigen Rückfalltext statt "Fehler" verwenden.
- **Verifikation:** Sperre an einem zweiten Arbeitsplatz erzeugen und den Erstnutzer fragen, was er
  jetzt tut.

---

## P3 - Niedrig

### P3-1 Startbildschirm erklärt den Unterschied zwischen "öffnen" und "anlegen" nicht zu Ende

- **Fundstelle:** `src/renderer/src/components/views/StartView.tsx:37-80`.
- **Beobachtung:** Die Einstiegsfrage ist gut gestellt. Der Hinweistext nennt aber die Dateiendung in
  Backticks ("`.s1control`", Zeile 58), was als Zeichen mitgerendert wird, und die zuletzt genutzten
  Einsätze erscheinen erst nach Klick auf "Bestehenden Einsatz öffnen". Der Status neben dem Namen
  ist der Rohwert.
- **Erwartung der Rolle:** Die zuletzt genutzten Einsätze sehe ich sofort - das ist der häufigste
  Fall.
- **Auswirkung im Einsatz:** Ein zusätzlicher Klick und kurzes Suchen beim Start.
- **Empfehlung:** Letzte Einsätze direkt anzeigen, Backticks entfernen, Status lesbar schreiben.
- **Verifikation:** Erstnutzer soll den gestern genutzten Einsatz öffnen - ohne Zwischenschritt.

### P3-2 "Systemtyp" und "Parent-Abschnitt (optional)" sind Entwicklerbegriffe an einer Entscheidungsstelle

- **Fundstelle:** `src/renderer/src/components/dialogs/CreateAbschnittDialog.tsx:36-62`
  ("Systemtyp", "Parent-Abschnitt (optional)", "Kein Parent (Root)"); ebenso
  `src/renderer/src/components/dialogs/EditAbschnittDialog.tsx`.
- **Beobachtung:** Beim Anlegen eines Abschnitts muss ich zwei Felder verstehen, die aus der
  Datenmodellierung stammen. Die Folgen der Auswahl bleiben offen (siehe P0-1 für "ANFAHRT").
- **Erwartung der Rolle:** "Art des Abschnitts" und "gehört zu" bzw. "direkt unter der
  Führungsstelle".
- **Auswirkung im Einsatz:** Die Struktur wird beim ersten Mal geraten und muss später korrigiert
  werden.
- **Empfehlung:** Beide Felder in Einsatzsprache benennen und je Auswahl einen Halbsatz zur Wirkung
  ergänzen.
- **Verifikation:** Erstnutzer einen Abschnitt unterhalb eines anderen anlegen lassen, ohne die
  Begriffe zu erklären.

### P3-3 Geschlecht und Rolle in der Helfertabelle nur als Symbol bzw. Einzelbuchstabe

- **Fundstelle:** `src/renderer/src/components/editor/shared/EinheitHelferSection.tsx:78-99`
  (Mars-/Venus-Symbol, Klartext nur im Tooltip) und `:199-208` (Spaltenüberschriften "Typ" und "G",
  wobei "Typ" die Rolle Führer/Unterführer/Helfer meint).
- **Beobachtung:** Die Spaltenüberschrift "G" erklärt sich nicht; "Typ" passt nicht zum Inhalt der
  Auswahlliste.
- **Erwartung der Rolle:** Spaltenüberschriften, die den Inhalt benennen ("Rolle", "Geschlecht").
- **Auswirkung im Einsatz:** Kurzes Zögern bei der Ersterfassung, keine Datenfolge.
- **Empfehlung:** Spalten ausschreiben, Symbolschalter zusätzlich beschriften.
- **Verifikation:** Erstnutzer die Spalten benennen lassen.

### P3-4 Kein sichtbarer Hinweis, wer angemeldet ist

- **Fundstelle:** Anmeldung erfolgt automatisch (`README.md`, Abschnitt Entwicklung); die
  Anmeldemaske `src/renderer/src/components/views/LoginView.tsx` wird nirgends eingebunden; im
  Arbeitsbereich taucht der Benutzername nur in fremden Sperrhinweisen auf
  (`src/renderer/src/components/tables/EinheitRow.tsx:30`).
- **Beobachtung:** Der eigene Benutzer wird nirgends angezeigt, obwohl er in Sperrmeldungen anderer
  Arbeitsplätze erscheint und in der Einsatzakte landet.
- **Erwartung der Rolle:** Oben rechts steht, unter welchem Namen und an welchem Rechner ich
  arbeite.
- **Auswirkung im Einsatz:** Bei Sperrmeldungen ist unklar, ob ich selbst die Sperre halte. Für die
  Nachvollziehbarkeit der Dokumentation fehlt die Selbstauskunft.
- **Empfehlung:** Benutzer und Rechnername in der Kopfzeile anzeigen. Die ungenutzte Anmeldemaske
  entweder aktivieren oder entfernen, damit keine zwei Anmeldemodelle nebeneinander existieren.
- **Verifikation:** Erstnutzer fragen, als wer er gerade arbeitet.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen. Einsatz anlegen, Abschnitte und Einheiten erfassen, Stärke
  anzeigen und Einheiten verschieben gelingt allein. Korrigieren, exportieren und den Einsatz
  beenden gelingt nicht.
- **Fremde Hilfe nötig:** ja - spätestens beim Schließen/Wechseln des Einsatzes (P0-4), beim
  Rückgängigmachen einer Fehlbedienung (P0-3) und beim Herausgeben der Einsatzakte (P1-4).
- **Größtes Missverständnis:** "Einheiten gesamt" in der Führungsansicht ist in Wahrheit die
  Personenzahl - eine plausible, aber falsche Lesart, die direkt in eine Meldung wandert.
- **Größtes Einsatzrisiko:** Die gemeldete Gesamtstärke lässt Kräfte in Anfahrt-Abschnitten
  unkommentiert weg, während "Backup laden" den aktuellen Lagestand ohne Rückfrage überschreiben
  kann - falsche Zahl und Datenverlust, beides ohne Warnung.
- **Top-Priorität für die nächste Iteration:** Die Gesamtstärke muss beschriften, was sie enthält,
  und die ausgeschlossenen Anfahrt-Kräfte sichtbar ausweisen (P0-1) - sie ist die eine Zahl, die
  diese Anwendung nach außen meldet.
