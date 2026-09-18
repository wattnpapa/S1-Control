# Audit: Offline-Resilienz (THW-Nutzersicht)

Rolle: Helfer/S1-Sachbearbeiter in einer Führungsstelle, der nicht davon ausgeht, dass WLAN,
Netzlaufwerk oder Fileshare zuverlässig verfügbar sind, und der jederzeit wissen muss, ob eine
Eingabe wirklich angekommen ist.

## Scope und Methodik

- Geprüft wurde ausschließlich **code- und dokumentationsbasiert**. Es lief **keine Instanz** der
  Anwendung, es lagen **keine Screenshots** vor. Alle Aussagen über das Verhalten sind aus dem
  Quelltext abgeleitet, nicht am laufenden Gerät beobachtet. Wo das Verhalten aus dem Code nicht
  eindeutig folgt, ist es als **Annahme** gekennzeichnet.
- Betrachtete Quellen: `src/renderer/src` (Sync-Hooks, Topbar, Dialoge, Statusanzeigen),
  `src/main` (JSON-Store, Datei-Locking, Präsenz, Backup, UDP-Sync, IPC), `src/shared`,
  `README.md`, `AGENTS.md`, `TODO.md`, `test/`.
- Wichtig für das Verständnis aller Befunde: „Offline" bedeutet in dieser Anwendung **nicht**
  „kein Server erreichbar", sondern **„die Einsatzdatei auf dem Netzlaufwerk/Share ist gerade nicht
  oder nur unzuverlässig erreichbar"** bzw. „der UDP-Broadcast zwischen den Clients kommt nicht an".
  Es gibt keinen Server, keine Sync-Warteschlange und keine lokale Offline-Kopie der Einsatzdaten.
- Prüfszenarien, die nur gedanklich am Code durchgespielt werden konnten (nicht real ausgeführt):
  Verbindung vor dem Speichern verlieren, Verbindung direkt nach dem Absenden verlieren, mehrere
  Änderungen ohne Netz, App bei fehlendem Netz neu starten, Netz zurückerhalten, Aktion aus
  Unsicherheit erneut auslösen, denselben Datensatz auf zwei Clients ändern.

## Kurzes Urteil aus der Rolle

Was funktioniert: Jede Eingabe wird sofort und vollständig in die Einsatzdatei geschrieben – es gibt
keinen unsichtbaren „Sendepuffer", der bei Absturz verloren geht. Schlägt ein Speichern fehl, bleibt
der Dialog mit den eingetippten Daten offen; die Arbeit ist also nicht sofort weg. Die
Datensatzsperre verhindert im Normalfall, dass zwei Leute dieselbe Einheit gleichzeitig bearbeiten.

Wo es reibt: Die Anwendung sagt mir an **keiner Stelle**, ob die Einsatzdatei gerade erreichbar ist,
wann der angezeigte Stand zuletzt tatsächlich von der Freigabe gelesen wurde und ob meine Eingabe
dort angekommen ist. Die Topbar zeigt eine sekundengenaue NATO-Uhr neben einer Stärkezahl, die im
Mehr-Client-Betrieb nach dem Öffnen des Einsatzes **nie wieder** von der Datei nachgeladen wird.
Damit sieht ein veralteter oder abweichender Stand exakt so aus wie ein aktueller. Mehrere stille
Fehlerpfade (Hintergrund-Refresh, Sperr-Heartbeat, Präsenz-Heartbeat, Backup) melden einen
Netzausfall gar nicht an den Nutzer, sondern nur ins Debug-Log.

Aufgabe ohne fremde Hilfe erledigbar: Einfache Erfassung ja. Die Frage „ist mein Stand aktuell und
ist meine Eingabe bei den anderen angekommen?" kann ich mit der Oberfläche **nicht** beantworten –
dafür brauche ich jemanden, der in die Dateien bzw. Debug-Logs schaut.

---

# P0 – Einsatzkritisch

## P0-1 Nicht lesbare Einsatzdatei wird kommentarlos durch eine leere Datei ersetzt

- **Fundstellen:** `src/main/db/connection.ts:24-35`; genutzt beim Öffnen jedes Einsatzes über
  `src/main/ipc/register-einsatz-helpers.ts:89-93` und beim Start `src/main/main.ts:160-176`.
- **Beobachtetes Problem (Code):** Existiert die Datei, kann aber nicht gelesen bzw. geparst werden,
  fängt ein pauschales `catch` **jeden** Fehler ab und schreibt an genau diese Stelle ein leeres
  Einsatz-Skelett (`writeEinsatzFile(dbPath, einsatz)`). Unterschieden wird nicht zwischen „alte
  SQLite-Datei" (der kommentierte Anlass), „Datei halb geschrieben", „Lesefehler wegen abgerissener
  SMB-Verbindung" oder „Datei beschädigt". Es gibt keine Rückfrage, keine Sicherung der
  Originaldatei, keinen Hinweis.
- **Erwartung der Rolle:** Wenn meine Einsatzdatei nicht gelesen werden kann, will ich einen klaren
  Hinweis und die unveränderte Datei behalten – niemals ein stilles Überschreiben.
- **Auswirkung im Einsatz:** Ein einziger Lesefehler auf einer zickigen Freigabe kann die komplette
  Einsatzdokumentation (Abschnitte, Einheiten, Fahrzeuge, Bewegungen, Stärkeverlauf) vernichten.
  Danach steht dort ein leerer Einsatz, der wie ein regulärer, neuer Einsatz aussieht. Der Verlust
  fällt erst auf, wenn jemand die Lage sucht.
- **Empfehlung:** Nicht lesbare Dateien niemals überschreiben. Stattdessen Öffnen abbrechen, im
  Klartext melden („Einsatzdatei konnte nicht gelesen werden – Datei unverändert gelassen"), auf das
  Backup-Verzeichnis verweisen und eine Migration alter Formate nur nach ausdrücklicher Bestätigung
  und nur mit vorheriger Kopie durchführen.
- **Verifikation:** Einsatzdatei unlesbar machen (Rechte entziehen, Byte-Müll voranstellen, Share
  während des Öffnens trennen) – Datei muss anschließend byte-identisch sein, und die App muss den
  Grund benennen.

## P0-2 Der angezeigte Stand wird nach dem Öffnen nie wieder von der Freigabe gelesen – eigenes Speichern überschreibt fremde Änderungen komplett

- **Fundstellen:** `src/main/db/connection.ts:41-60` (`save()` schreibt den gesamten
  In-Memory-Stand ohne vorheriges Neulesen); `src/main/json-store/einsatz-store.ts:19-23`
  (Vollschreiben der gesamten Datei); Leseweg `src/main/ipc/register-einsatz-ipc.ts:278-300,
  303-331, 334-357` (liest `ctx.einsatz` aus dem Speicher) mit zusätzlichem 1,5-s-Cache
  `src/main/services/einsatz-read-cache.ts:4`; kein Datei-Watch und `getFileMtime`
  (`src/main/json-store/einsatz-store.ts:38-44`) wird nirgends verwendet; der
  Utility-Prozess-Pfad, der per `dbPath` arbeiten würde, ist ein Stub und standardmäßig aus
  (`src/main/db-runtime.ts:1-2`, `src/main/main.ts:33`).
- **Beobachtetes Problem (Code):** Ein Einsatz wird beim Öffnen einmal komplett in den Speicher
  geladen. Danach lesen alle Ansichten aus diesem Speicherabbild. Der 6-Sekunden-Refresh im
  Renderer (`src/renderer/src/app/useSyncEvents.ts:56-66`) und die Reaktion auf den
  UDP-Änderungshinweis (`src/renderer/src/app/useSyncEvents.ts:206-227`) lesen daher **denselben
  alten Speicherstand** erneut. Beim nächsten eigenen Schreiben wird die Datei vollständig mit
  diesem Speicherabbild überschrieben.
- **Erwartung der Rolle:** Wenn eine zweite Führungsstelle dieselbe Einsatzdatei bearbeitet, sehe
  ich deren Änderungen spätestens nach kurzer Zeit – und meine Speicherung darf fremde Eingaben
  nicht löschen.
- **Auswirkung im Einsatz:** Zwei Arbeitsplätze auf derselben Einsatzdatei zeigen dauerhaft
  unterschiedliche Lagen, ohne dass das sichtbar wird. Wer zuletzt speichert, löscht sämtliche
  Eingaben des anderen seit dessen Öffnen – Einheiten, Verschiebungen, Helferlisten – restlos und
  ohne Meldung. Genau das ist der Regelfall, wenn eine Verbindung kurz weg war und jemand
  weitergearbeitet hat. Die im README (`README.md:25`) zugesagte Mehr-Client-Nutzung ist damit in
  der Praxis nicht gegeben.
- **Empfehlung:** Vor jedem Schreiben den aktuellen Dateistand innerhalb der Dateisperre neu
  einlesen und nur die tatsächliche Änderung anwenden; für Lesezugriffe die Datei bei geänderter
  Änderungszeit neu laden. Wo das nicht möglich ist, muss die Oberfläche den Mehr-Client-Betrieb
  klar als nicht unterstützt kennzeichnen, statt ihn zuzusichern.
- **Verifikation:** Zwei Clients öffnen dieselbe Datei; A legt eine Einheit an, B (ohne Neustart)
  ändert eine andere Einheit. Nach beiden Speicherungen müssen beide Änderungen vorhanden sein und
  beide Bildschirme innerhalb weniger Sekunden gleich aussehen.

## P0-3 Kein erkennbarer Datenstand und kein Verbindungszustand – stille Fehler im Hintergrund

- **Fundstellen:** `src/renderer/src/components/layout/Topbar.tsx:39-48` (nur Stärke und laufende
  NATO-Uhr, kein Stand/Status); `src/renderer/src/app/useSyncEvents.ts:56-66` (Refresh-Timer ohne
  `catch`, Fehler verschwinden); `src/renderer/src/app/useEinsatzData.ts:100-111` (Gesamtstärke
  wird in einem nicht abgesicherten Hintergrundlauf nachgeladen);
  `src/renderer/src/components/views/StrengthDisplayView.tsx:38-50, 76-83` (Monitorfenster zeigt
  Stärke plus Sekundenuhr, ohne Stand); Statuszeile nur für Archiv/Fehler
  `src/renderer/src/components/views/AppWorkspaceShell.tsx:308-313`.
- **Beobachtetes Problem (Code):** Es existiert an keiner Stelle der Oberfläche eine Anzeige „Datei
  erreichbar / nicht erreichbar", „Stand von HH:MM" oder „letzte erfolgreiche Schreiboperation".
  Schlägt der zyklische Refresh fehl, wird der Fehler nicht behandelt; die zuletzt geladenen Zahlen
  bleiben unverändert stehen.
- **Erwartung der Rolle:** Eine Zahl, die ich an die Einsatzleitung melde, muss einen sichtbaren
  Stand haben. Wenn die Verbindung weg ist, will ich das sehen, bevor ich die Zahl weitergebe.
- **Auswirkung im Einsatz:** Die Gesamtstärke auf dem Monitor im Führungsraum kann beliebig alt oder
  unvollständig sein und wirkt durch die mitlaufende Uhr trotzdem tagesaktuell. Meldungen an
  übergeordnete Stellen basieren dann auf falschen Zahlen; niemand bemerkt den Netzausfall.
- **Empfehlung:** Dauerhaft sichtbarer Statusstreifen mit drei Aussagen in Klartext: Einsatzdatei
  erreichbar ja/nein, Stand der angezeigten Daten (Uhrzeit des letzten erfolgreichen Lesens),
  Zeitpunkt der letzten erfolgreich geschriebenen Änderung. Bei Ausfall die praktische Folge
  benennen („Anzeige eingefroren, Änderungen werden derzeit nicht gespeichert"). Denselben Hinweis
  auch im Stärke-Monitor einblenden.
- **Verifikation:** Share im laufenden Betrieb trennen. Innerhalb weniger Sekunden muss die
  Oberfläche unübersehbar in einen „Stand eingefroren"-Zustand wechseln; nach Rückkehr des Netzes
  muss ein aktueller Stand mit neuer Uhrzeit erscheinen.

## P0-4 Start ohne Freigabe schaltet dauerhaft und still auf einen lokalen Pfad um

- **Fundstellen:** `src/main/main.ts:156-179` (Fallback-Kette inklusive
  `settingsStore.set({ dbPath: paths.defaultBaseDir })`), Hinweisdialog `src/main/main.ts:408-414`.
- **Beobachtetes Problem (Code):** Ist der konfigurierte Einsatzordner beim Start nicht erreichbar,
  wird ein Warndialog gezeigt – gleichzeitig wird der konfigurierte Pfad in den Einstellungen
  **überschrieben** und durch den lokalen Standardordner ersetzt. Ist auch der nicht nutzbar, wird
  auf eine Datei im Temp-Verzeichnis ausgewichen. Kehrt das Netz zurück, wechselt die Anwendung
  nicht zurück; der ursprüngliche Pfad ist in der Konfiguration nicht mehr vorhanden.
- **Erwartung der Rolle:** Der eingestellte Einsatzordner ist eine Festlegung der Führungsstelle.
  Ein Startproblem darf sie nicht ändern; er muss nach Rückkehr des Netzes wieder gelten.
- **Auswirkung im Einsatz:** Wer die App startet, bevor das Netzlaufwerk verbunden ist (typisch nach
  Standortwechsel, Stromausfall oder Kaltstart im Einsatz), arbeitet danach unbemerkt in einer
  lokalen Parallelwelt: leere Einsatzliste, neu angelegter Einsatz, eigene Datei. Die Führungsstelle
  hat zwei divergierende Stände, im Temp-Fall sogar einen, der beim Aufräumen verschwinden kann.
  Der Warndialog wird unter Zeitdruck typischerweise weggeklickt, weil er nur den Pfad nennt und
  nicht die Folge.
- **Empfehlung:** Konfigurierten Pfad nie automatisch überschreiben. Stattdessen den Ausfall
  benennen, „erneut versuchen" anbieten, und wenn lokal weitergearbeitet wird, das dauerhaft und
  auffällig in der Oberfläche kennzeichnen („Arbeitet lokal, nicht auf der Freigabe") samt Weg
  zurück. Beim Temp-Fallback zusätzlich vor Datenverlust warnen.
- **Verifikation:** Start ohne Netzlaufwerk, danach Netz verbinden und App neu starten – der
  ursprüngliche Einsatzordner und die Einsatzliste müssen unverändert wieder da sein.

---

# P1 – Hoch

## P1-1 Kein Konfliktbegriff: gleichzeitige Änderungen gewinnen nach Reihenfolge, ohne Hinweis

- **Fundstellen:** `src/main/services/einsatz-write/einheit.ts:126-148`,
  `src/main/services/einsatz-write/fahrzeug.ts:98`,
  `src/main/services/einsatz-write/abschnitt.ts:60` (Feld `version` wird nur hochgezählt, nie
  geprüft); Schreibweg `src/main/ipc/register-entity-einheit-ipc.ts:40-69`.
- **Beobachtetes Problem (Code):** Beim Aktualisieren wird der bestehende Datensatz vollständig
  ersetzt. Ein Vergleich mit dem Stand, den der Nutzer beim Öffnen des Formulars gesehen hat,
  findet nicht statt. Ein Konflikt kann daher weder erkannt noch erklärt werden.
- **Erwartung der Rolle:** Wenn sich der Datensatz geändert hat, während mein Formular offen war,
  will ich das erfahren und entscheiden, was gilt.
- **Auswirkung im Einsatz:** Nach jeder Unterbrechung (Formular offen gelassen, Netz weg, später
  gespeichert) überschreibt der Nutzer stillschweigend neuere Angaben – zum Beispiel eine inzwischen
  korrigierte Stärke oder einen geänderten Status. Die falsche Zahl wirkt danach wie bestätigt.
- **Empfehlung:** Beim Speichern erkennen, ob sich der Datensatz zwischenzeitlich geändert hat, und
  in einfacher Sprache gegenüberstellen: „Dein Wert / Aktueller Wert / Wer und wann" mit klarer
  Auswahl. Kein automatisches Zusammenführen ohne Anzeige.
- **Verifikation:** Denselben Datensatz auf zwei Clients öffnen, nacheinander speichern – der zweite
  Speichervorgang muss eine verständliche Konfliktmeldung erzeugen.

## P1-2 Bearbeitungssperre verfällt bei Netzausfall lautlos

- **Fundstellen:** `src/renderer/src/app/useEditLocks.ts:50-76` (Heartbeat verschluckt Fehler
  vollständig), Sperrdauer 45 Sekunden `src/main/services/record-lock.ts:8`, Prüfung erst beim
  Speichern `src/main/services/record-lock.ts:140-153`.
- **Beobachtetes Problem (Code):** Scheitert die Sperr-Auffrischung (Netz weg, Freigabe langsam),
  wird der Fehler ignoriert. Nach 45 Sekunden gilt der Datensatz als frei; ein anderer Client kann
  ihn übernehmen. Der noch tippende Nutzer erfährt davon erst beim Speichern – dann mit der Meldung
  „Datensatz ist nicht zur Bearbeitung gesperrt. Bitte Datensatz erneut öffnen.", ohne angebotenen
  Weg, die Sperre erneut zu holen. (Annahme: Der Dialog bleibt mit den Eingaben offen, da er erst
  nach erfolgreichem Schreiben geschlossen wird – siehe
  `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:119-147`.)
- **Erwartung der Rolle:** Wenn meine Bearbeitungssperre verloren geht, sehe ich das sofort im
  offenen Formular – nicht erst nach zehn Minuten Tipparbeit.
- **Auswirkung im Einsatz:** Längere Erfassungen (Einheit mit Helferliste) gehen im ungünstigen Fall
  ins Leere oder kollidieren mit einem zweiten Bearbeiter. Unter Zeitdruck wird die Meldung als
  „Programmfehler" gewertet und der Vorgang abgebrochen.
- **Empfehlung:** Verlorene Sperre sofort im geöffneten Formular anzeigen („Bearbeitungsrecht
  verloren – Verbindung prüfen") und beim Speichern eine ausdrückliche Schaltfläche „Erneut
  sperren und speichern" anbieten, statt nur zum Neuöffnen aufzufordern.
- **Verifikation:** Editor öffnen, Netz für 60 Sekunden trennen – die Warnung muss im Formular
  erscheinen, und nach Rückkehr des Netzes muss ein Weiterarbeiten ohne Datenverlust möglich sein.

## P1-3 Innerhalb eines Formulars wird teils sofort, teils erst beim Speichern geschrieben

- **Fundstellen:** Helferzeilen werden je Zeile sofort geschrieben
  `src/renderer/src/app/einheit-actions/useEinheitHelferActions.ts:14-75`; die Stammdaten der
  Einheit erst beim Absenden `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:119-147`.
- **Beobachtetes Problem (Code):** Im selben Dialog gibt es zwei unterschiedliche
  Speicherzeitpunkte, ohne dass die Oberfläche kennzeichnet, welche Angaben bereits in der
  Einsatzdatei stehen und welche nur im Formular liegen.
- **Erwartung der Rolle:** Ich muss auf einen Blick sehen, was schon verbindlich gespeichert ist –
  besonders, wenn ich das Fenster wegen einer Meldung verlassen muss.
- **Auswirkung im Einsatz:** Bricht die Verbindung mitten in der Erfassung ab oder wird der Dialog
  mit „Abbrechen" verlassen, bleiben Helfer bereits gespeichert, während Stärke und Stammdaten der
  Einheit verworfen sind. Die Einheit steht danach mit inkonsistenten Angaben in der Lage.
- **Empfehlung:** Einheitliches Verhalten je Dialog – entweder alles sofort oder alles beim
  Speichern – und je Zeile/Abschnitt ein sichtbarer Zustand „gespeichert" bzw. „noch nicht
  gespeichert". Beim Abbrechen benennen, was bereits geschrieben wurde.
- **Verifikation:** Helferzeile anlegen, Netz trennen, Dialog abbrechen, Einsatz neu öffnen – die
  Oberfläche muss vorher angekündigt haben, was jetzt tatsächlich in der Datei steht.

## P1-4 Wiederholtes Tippen auf „Bestätigen" beim Verschieben erzeugt Mehrfachbewegungen

- **Fundstellen:** `src/renderer/src/components/dialogs/MoveDialog.tsx:34` (Bestätigen ist als
  einzige Aktion **nicht** über `busy` gesperrt – vgl. alle anderen Dialoge, z. B.
  `src/renderer/src/components/dialogs/EditEinheitDialog.tsx:29`), Aktion
  `src/renderer/src/app/useSystemActions.ts:100-124`.
- **Beobachtetes Problem (Code):** Dauert der Schreibvorgang auf der Freigabe (oder das Warten auf
  die Dateisperre, bis 5 Sekunden, `src/main/json-store/file-lock.ts:6`) länger, bleibt die
  Schaltfläche bedienbar. Jeder weitere Druck löst eine zusätzliche Verschiebung samt Eintrag in
  Bewegungs- und Kommandoprotokoll aus. Rückgängig macht laut README nur den letzten Schritt.
- **Erwartung der Rolle:** Wenn nichts sichtbar passiert, drücke ich noch einmal. Das darf keine
  zweite Buchung erzeugen.
- **Auswirkung im Einsatz:** Das Bewegungsprotokoll – die Nachweisgrundlage, wann welche Einheit wo
  war – enthält doppelte Einträge. Bei der Nachbereitung ist nicht mehr feststellbar, ob eine
  Einheit tatsächlich zweimal verlegt wurde.
- **Empfehlung:** Schaltfläche während des laufenden Vorgangs sperren und den Zustand benennen
  („wird gespeichert …"). Eine unveränderte Wiederholung derselben Verschiebung soll erkannt und
  nicht erneut protokolliert werden.
- **Verifikation:** Verschieben bei künstlich langsamer Freigabe mehrfach auslösen – im
  Bewegungsprotokoll darf nur ein Eintrag entstehen.

## P1-5 Fehlermeldungen sind unauffällig und verschwinden bei der nächsten Aktion

- **Fundstellen:** `src/renderer/src/app/useAppControllers.ts:25-37` (`setError(null)` zu Beginn
  jeder Aktion), Darstellung `src/renderer/src/components/views/AppWorkspaceShell.tsx:308-313`,
  Gestaltung `src/renderer/src/styles/app.css:276-278, 314-317` (schmaler Textstreifen, kein
  Symbol, keine Schaltfläche).
- **Beobachtetes Problem (Code):** Alle Fehler – vom Tippfehler in der Stärke bis zum abgerissenen
  Netzlaufwerk – landen in einem einzelnen Textfeld ohne Bestätigen, ohne „erneut versuchen" und
  ohne Priorisierung. Die nächste beliebige Aktion löscht die Meldung. Fehler aus
  Hintergrundvorgängen (Sperr-Heartbeat, Präsenz, Backup, zyklischer Refresh) erreichen dieses Feld
  gar nicht erst.
- **Erwartung der Rolle:** Ein Verbindungsabbruch ist etwas anderes als eine Falscheingabe und muss
  stehen bleiben, bis ich ihn zur Kenntnis genommen habe.
- **Auswirkung im Einsatz:** Der entscheidende Hinweis „konnte nicht gespeichert werden" kann
  unbemerkt verschwinden, während der Nutzer bereits die nächste Eingabe macht – er hält beide für
  erledigt.
- **Empfehlung:** Verbindungs- und Speicherfehler getrennt von Eingabefehlern behandeln, dauerhaft
  bis zur Quittierung anzeigen, mit „erneut versuchen" und einem Klartext-Satz zur Folge
  („Die Änderung ist nicht in der Einsatzdatei angekommen.").
- **Verifikation:** Netz während eines Speichervorgangs trennen, danach eine beliebige andere Aktion
  ausführen – die Fehlermeldung muss weiterhin sichtbar sein.

## P1-6 Nach einem kurzen Ausfall verschwindet der Einsatz dauerhaft aus „Letzte Einsätze"

- **Fundstellen:** `src/main/ipc/register-einsatz-helpers.ts:48-72` (nicht lesbare Pfade werden aus
  den Einstellungen entfernt und die Bereinigung wird gespeichert), stiller Lesefehler
  `src/main/services/einsatz-files.ts:56-73`.
- **Beobachtetes Problem (Code):** Beim Ermitteln der zuletzt genutzten Einsätze wird jede Datei
  probeweise gelesen. Schlägt das fehl – gleichgültig ob die Datei wirklich fehlt oder die Freigabe
  nur gerade nicht verbunden ist –, wird der Pfad aus der gespeicherten Liste gestrichen. Ein
  Hinweis erscheint nicht; der Einsatz fehlt einfach auf dem Startbildschirm.
- **Erwartung der Rolle:** Ein Einsatz, den ich vorhin bearbeitet habe, steht weiter in der Liste –
  notfalls mit dem Vermerk „derzeit nicht erreichbar".
- **Auswirkung im Einsatz:** Nach einem Netzaussetzer scheint der laufende Einsatz weg zu sein. Wer
  den UNC-Pfad nicht auswendig kennt, legt im Zweifel einen neuen Einsatz an – und die
  Führungsstelle arbeitet ab da auf zwei Ständen.
- **Empfehlung:** Einträge nicht automatisch entfernen, sondern als „derzeit nicht erreichbar"
  kennzeichnen, den vollständigen Pfad anzeigen und „erneut versuchen" anbieten. Entfernen nur auf
  ausdrückliche Nutzeraktion.
- **Verifikation:** Netzlaufwerk trennen, Startbildschirm öffnen, Laufwerk wieder verbinden – der
  Einsatz muss ohne Zutun wieder in der Liste erscheinen.

## P1-7 Sicherungen liegen nur auf der Freigabe und ihr Scheitern bleibt unsichtbar

- **Fundstellen:** `src/main/services/backup.ts:24-26` (Sicherungsordner neben der Einsatzdatei),
  `src/main/services/backup.ts:64-87` (Fehler werden verworfen, kein Ereignis an die Oberfläche),
  Zusage in `README.md:26-27`.
- **Beobachtetes Problem (Code):** Die Sicherung ist eine Kopie der Einsatzdatei in ein
  Unterverzeichnis desselben Ortes und wird nur von einem Client geschrieben. Scheitert sie, endet
  das im leeren `catch`. Es gibt keine Anzeige, wann zuletzt erfolgreich gesichert wurde. (Annahme:
  Fällt der Client aus, der gerade „MASTER" ist, übernimmt der nächste erst nach Ablauf der
  Präsenz-Frist von zwei Minuten, `src/main/services/clients.ts:10`.)
- **Erwartung der Rolle:** Ich will sehen, wann die letzte Sicherung geschrieben wurde – und dass
  zumindest eine Kopie lokal liegt, wenn die Freigabe ausfällt.
- **Auswirkung im Einsatz:** Genau im Schadensfall (Freigabe weg oder Datei beschädigt, siehe P0-1)
  ist die Sicherung entweder nicht vorhanden oder ebenso unerreichbar. Die Arbeit mehrerer Stunden
  hängt an einer einzigen Datei.
- **Empfehlung:** Zeitpunkt der letzten erfolgreichen Sicherung in der Oberfläche anzeigen,
  Scheitern melden und zusätzlich eine lokale Kopie auf dem Gerät führen, die bei Freigabeausfall
  weiterläuft.
- **Verifikation:** Freigabe während des Betriebs schreibgeschützt machen – die Oberfläche muss auf
  die ausbleibende Sicherung hinweisen.

## P1-8 Benutzerdokumentation sagt Mehr-Client-Sicherheit zu, die die Umsetzung nicht leistet

- **Fundstellen:** `README.md:25` („Mehrere Clients können dieselbe Einsatzdatei auf einem Share
  nutzen (WAL-Modus)"), `README.md:63, 130, 138` (SQLite/WAL/`busy_timeout`/Transaktionen),
  `AGENTS.md:33-41`; tatsächliche Umsetzung: JSON-Datei, die vollständig neu geschrieben wird
  (`src/main/json-store/einsatz-store.ts:19-36`) mit selbstgebauter Sperrdatei
  (`src/main/json-store/file-lock.ts:4-35`, Übernahme einer fremden Sperre nach 10 Sekunden).
- **Beobachtetes Problem:** Die Beschreibung, auf die sich eine Führungsstelle bei der
  Einsatzplanung stützt, nennt Eigenschaften einer Datenbank, die nicht verwendet wird. Die reale
  Absicherung ist eine Hilfssperrdatei auf demselben Netzlaufwerk; auf SMB-Freigaben ist deren
  Zuverlässigkeit begrenzt, und eine als „veraltet" eingestufte Sperre wird überschrieben.
- **Erwartung der Rolle:** Was im Handbuch steht, muss ich meiner Planung zugrunde legen können.
- **Auswirkung im Einsatz:** Führungsstellen richten den Parallelbetrieb mehrerer Arbeitsplätze ein,
  weil die Dokumentation ihn zusichert – und laufen damit direkt in P0-2. Wer das nicht weiß, sucht
  den Fehler bei den Helfern.
- **Empfehlung:** Dokumentation an den tatsächlichen Stand angleichen und den derzeit belastbaren
  Betriebsfall klar benennen (Annahme: ein schreibender Arbeitsplatz je Einsatzdatei). Erst nach
  Behebung von P0-2 wieder Mehr-Client-Betrieb zusichern.
- **Verifikation:** Der im README beschriebene Betriebsfall wird als Prüfszenario nachgestellt und
  muss ohne Datenverlust bestehen.

---

# P2 – Mittel

## P2-1 Übersicht „Aktive Clients" kann veraltete Daten als aktuell zeigen

- **Fundstellen:** `src/main/services/clients.ts:97-124` (bei Lesefehler wird die zwischengespeicherte
  Liste zurückgegeben), `src/main/services/clients.ts:126-170` (Heartbeat-Fehler nur ins Debug-Log),
  Darstellung `src/renderer/src/components/views/SettingsView.tsx:22-50`.
- **Beobachtetes Problem (Code):** Ist die Freigabe nicht erreichbar, zeigt die Tabelle weiter die
  zuletzt bekannten Arbeitsplätze mit deren alten Zeitstempeln. Ein Hinweis, dass die Angaben nicht
  frisch sind, fehlt.
- **Erwartung der Rolle:** Ich will erkennen, ob die anderen Arbeitsplätze wirklich gerade
  mitarbeiten.
- **Auswirkung im Einsatz:** Eine Führungskraft schließt aus der Anzeige, dass die zweite Stelle
  verbunden ist, und geht davon aus, dass ihre Änderungen dort ankommen.
- **Empfehlung:** Zeitpunkt der letzten erfolgreichen Abfrage mit anzeigen und zwischengespeicherte
  Stände sichtbar als „veraltet" kennzeichnen.
- **Verifikation:** Freigabe trennen und Einstellungen öffnen – die Tabelle muss den veralteten
  Stand ausweisen.

## P2-2 Kein positiver Nachweis nach erfolgreichem Speichern

- **Fundstellen:** `src/renderer/src/app/einheit-actions/useEinheitCreateActions.ts:86-112`,
  `src/renderer/src/app/einheit-actions/useEinheitEditActions.ts:119-147` – es wird lediglich der
  Dialog geschlossen.
- **Beobachtetes Problem (Code):** Erfolg wird nur durch Abwesenheit einer Fehlermeldung
  ausgedrückt. Zusammen mit dem fehlenden Datenstand (P0-3) lässt sich nicht nachvollziehen, ob und
  wann etwas in die Einsatzdatei geschrieben wurde.
- **Erwartung der Rolle:** Kurze, eindeutige Rückmeldung „gespeichert HH:MM", gerade wenn die
  Verbindung wackelt.
- **Auswirkung im Einsatz:** Bei Unsicherheit wird die Eingabe wiederholt – das erzeugt doppelte
  Einheiten oder doppelte Bewegungen (siehe P1-4) und kostet Zeit.
- **Empfehlung:** Kurze Bestätigung mit Uhrzeit, gemeinsam mit der Statuszeile aus P0-3.
- **Verifikation:** Nach jeder Speicherung ist ohne Umweg über Listen erkennbar, dass und wann sie
  angekommen ist.

## P2-3 Ausfall des Änderungs-Broadcasts ist für den Nutzer nicht erkennbar

- **Fundstellen:** `src/main/services/einsatz-sync.ts:7-8` (fester UDP-Port, Versand ausschließlich
  an `255.255.255.255`), `src/main/services/einsatz-sync.ts:174-208` (Senden ohne Rückmeldung,
  Ergebnis nur im Debug-Log), Empfang `src/renderer/src/app/useSyncEvents.ts:206-227`.
- **Beobachtetes Problem (Code):** Ob der Hinweis „Daten haben sich geändert" bei anderen
  Arbeitsplätzen ankommt, ist nirgends sichtbar. In getrennten WLAN-Segmenten, bei Client-Isolation
  oder aktiver Firewall kommt er typischerweise nicht an. Der als Auffangnetz gedachte
  6-Sekunden-Abruf hilft wegen P0-2 nicht.
- **Erwartung der Rolle:** Wenn die gegenseitige Benachrichtigung nicht funktioniert, will ich das
  wissen, statt es für aktuell zu halten.
- **Auswirkung im Einsatz:** Zwei Arbeitsplätze im selben Raum zeigen unterschiedliche Lagen, ohne
  dass jemand einen Anlass sieht, nachzuprüfen.
- **Empfehlung:** Erkannte Gegenstellen und Zeitpunkt der letzten empfangenen Änderungsmeldung in
  Klartext anzeigen; bei längerem Ausbleiben aktiv darauf hinweisen.
- **Verifikation:** Zwei Clients in getrennten Netzsegmenten – die Oberfläche muss melden, dass
  keine Änderungsmeldungen empfangen werden.

## P2-4 Technische Fehlertexte ohne Handlungsanweisung

- **Fundstellen:** `src/main/json-store/file-lock.ts:43` und `:64` („Lock timeout for <Pfad>"),
  `src/main/json-store/einsatz-store.ts:13` („Not a JSON file: <Pfad>"),
  `src/renderer/src/utils/error.ts:4-9` (unbekannte Fehler werden zu „Fehler"),
  `src/main/services/record-lock.ts:148`.
- **Beobachtetes Problem (Code):** Die Meldungen nennen den technischen Zustand, nicht die Ursache
  und nicht den nächsten Schritt. Englischsprachige Texte und ein nacktes „Fehler" stehen neben
  deutschen Klartexten.
- **Erwartung der Rolle:** Ich brauche einen Satz in verständlicher Sprache und eine Anweisung, was
  ich jetzt tun soll.
- **Auswirkung im Einsatz:** Unter Zeitdruck wird die Meldung ignoriert oder eine Aktion sinnlos
  wiederholt; eine Rückfrage beim Betreuer kostet Minuten. (`AGENTS.md:53` verlangt bereits
  nutzerklare Fehlermeldungen.)
- **Empfehlung:** Einheitliche deutsche Klartextmeldungen mit Ursache und Handlungsempfehlung
  („Einsatzdatei derzeit belegt oder Netzlaufwerk nicht erreichbar – bitte erneut versuchen").
- **Verifikation:** Alle im Netzausfall erreichbaren Meldungen durchgehen; jede muss laienverständlich
  sein und einen nächsten Schritt nennen.

---

# P3 – Niedrig

## P3-1 Diagnosewissen liegt nur in den Einstellungen und im Debug-Log

- **Fundstellen:** `src/renderer/src/components/views/SettingsView.tsx` (Clients, Peer-Status,
  Debug-Zeilen), Protokollweg `src/renderer/src/app/useSyncEvents.ts:194-201, 232-247`.
- **Beobachtetes Problem:** Die einzigen Informationen zum Verbindungsverhalten liegen in einer
  separaten Ansicht in Rohform, während der Arbeitsbereich schweigt.
- **Auswirkung im Einsatz:** Wer den Verdacht hat, dass etwas nicht ankommt, muss den Arbeitsbereich
  verlassen und Protokollzeilen deuten.
- **Empfehlung:** Die drei für den Betrieb wesentlichen Aussagen (erreichbar, Stand, letzte
  Änderung) in den Arbeitsbereich holen; die Rohprotokolle dürfen in den Einstellungen bleiben.
- **Verifikation:** Der Verbindungszustand ist ohne Wechsel in die Einstellungen erkennbar.

## P3-2 Keine automatisierten Prüfungen für Freigabeverlust und Konfliktfälle

- **Fundstellen:** `test/` (u. a. `behavior.fileshare-engpass.test.ts`, `record-lock.test.ts`,
  `einsatz-sync.test.ts`) – abgedeckt sind Lese-/Präsenzverhalten und Broadcast-Logik, nicht jedoch
  Verbindungsabbruch beim Schreiben, nicht lesbare Einsatzdatei, konkurrierende Änderungen oder
  Wiederkehr des Netzes; `TODO.md` führt diese Themen nicht.
- **Auswirkung im Einsatz:** Die in P0/P1 beschriebenen Zustände können unbemerkt zurückkehren.
- **Empfehlung:** Die oben genannten Verifikationen als feste Prüfszenarien aufnehmen.
- **Verifikation:** Jedes P0-Szenario existiert als reproduzierbarer Test.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen – erfassen und speichern funktioniert, aber die Frage „ist mein
  Stand aktuell und ist meine Eingabe angekommen?" lässt sich mit der Oberfläche nicht beantworten.
- **Fremde Hilfe nötig:** ja – sobald die Freigabe wackelt, ist ohne Blick in Dateien, Einstellungen
  oder Debug-Log nicht feststellbar, welcher Stand gilt.
- **Größtes Missverständnis:** Die mitlaufende NATO-Uhr neben der Stärkeanzeige suggeriert einen
  aktuellen Stand, obwohl die Daten nach dem Öffnen des Einsatzes nicht mehr von der Freigabe
  nachgeladen werden.
- **Größtes Einsatzrisiko:** Stiller Totalverlust der Einsatzdokumentation – entweder durch das
  Überschreiben einer nicht lesbaren Einsatzdatei mit einem leeren Skelett (P0-1) oder durch das
  vollständige Überschreiben fremder Änderungen beim eigenen Speichern (P0-2).
- **Top-Priorität für die nächste Iteration:** Einsatzdatei vor jedem Schreiben neu einlesen und
  nicht lesbare Dateien niemals überschreiben – flankiert von einer dauerhaft sichtbaren Zeile
  „Einsatzdatei erreichbar / Stand von HH:MM / zuletzt gespeichert HH:MM".
