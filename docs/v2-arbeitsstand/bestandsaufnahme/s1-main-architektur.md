# S1-Control: Architektur des Electron-Main-Prozesses (Ist-Stand)

Key: s1-main-architektur
Stand: 2026-09-06, Branch main, HEAD bcf15c6 (+ uncommitted Änderungen an Einsatz-Basisdaten)

## Gliederung
1. Codeverteilung (wc -l)
2. Prozessmodell (main.ts, bootstrap, db-bridge, window, preload, IPC)
3. Datenhaltung (json-store, Dateiformate, Schreibpfad, Lock, Backup, Recovery)
4. Multi-Client (clients, einsatz-sync, record-lock, read-cache)
5. Fachlogik (einsatz-write/*, command, read-service, export, strength, stan/tactical-signs)
6. Updater (updater*, update-peer*)
7. Architekturkarte
8. Datenformat-Spezifikation .s1control (JSON)
9. Risikoliste mit Codebeleg
10. Übernehmen / neu machen / weglassen (v2)
11. Offene Fragen

(Datei wird nach jedem Teilthema fortgeschrieben.)

---

## 1. Codeverteilung (wc -l, src/main + src/shared, Stand HEAD bcf15c6)

Gesamt: 11.040 Zeilen TypeScript in 84 Dateien (ohne die generierte STAN-JSON).

Größte Dateien:
- src/main/services/updater.ts 569
- src/shared/db-runtime.ts 542 (Protokoll für einen Utility-Prozess, der laut src/main/db-runtime.ts:1-2 nicht mehr genutzt wird)
- src/main/main.ts 514
- src/main/ipc/register-einsatz-ipc.ts 463
- src/shared/ipc.ts 439
- src/main/services/strength-display.ts 321
- src/shared/types.ts 317
- src/main/services/update-peer.ts 312

(Detaillierte Bereichs-Summen folgen in Abschnitt 1b nach Sichtung aller Dateien.)

## 3a. json-store (vollständig gelesen)

Dateien: src/main/json-store/{types.ts (210), einsatz-store.ts (60), system-store.ts (52), file-lock.ts (77)} = 399 Zeilen. Der gesamte Persistenzkern ist also < 400 Zeilen.

### Schreibpfad Einsatzdatei (einsatz-store.ts)
- readEinsatzFile (Z.5-17): prüft erstes Byte == '{' (0x7b), sonst Fehler "Not a JSON file" – Schutz gegen Legacy-SQLite-Dateien (Kommentar Z.6-7). Dann readFileSync + JSON.parse der GESAMTEN Datei.
- writeEinsatzFile (Z.19-23): JSON.stringify(data, null, 2) nach `<datei>.tmp`, dann renameSync über die Zieldatei. KEIN fsync, KEIN Verify-Read.
- mutateEinsatzFile (Z.25-36): withFileLock → read → mutate(data) → writeSeq++ → write. Klassisches Read-Modify-Write der GANZEN Datei unter einem Advisory-Lock. writeSeq ist ein monotoner Zähler pro Datei (Z.32), wird nirgends zur Konflikterkennung (Compare-and-Swap) benutzt – nur inkrementiert.
- getFileMtime (Z.38-44): statSync.mtimeMs, 0 bei Fehler.

### Schreibpfad Systemdatei (system-store.ts)
- readSystemFile (Z.16-21): **wenn `fs.existsSync(filePath)` false → leere Systemdatei zurückgeben** (Z.17-19). existsSync liefert auch bei EACCES/ENETUNREACH/EIO false. Kombination mit mutateSystemFile(Sync) (Z.30-52): read → mutate → write. D.h. ein transienter SMB-Fehler beim existsSync führt dazu, dass eine LEERE Systemdatei (ohne benutzer, stammdaten, einsatzListe) plus die eine Mutation zurückgeschrieben wird. Datenverlust-Risiko R-SYS-1.
- mutateSystemFileSync (Z.30-40) benutzt withFileLockSync → blockiert den Main-Thread (siehe file-lock).

### file-lock.ts
- Lockdatei `<datei>.lock`, Inhalt {pid, acquiredAt} (Z.8-15,18).
- tryAcquire (Z.17-35): writeFileSync mit flag 'wx' (O_CREAT|O_EXCL). Bei Fehler: Lock lesen; wenn `Date.now() - existing.acquiredAt > 10_000` → **Stale-Overwrite mit normalem writeFileSync (ohne 'wx')** (Z.25-28). Zwei Clients, die gleichzeitig einen stale Lock sehen, überschreiben beide und glauben beide, den Lock zu halten (R-LOCK-1). acquiredAt stammt von der Uhr des Schreibers, der Vergleich von der Uhr des Lesers → Uhrenabweichung zwischen Clients verschiebt das 10-s-Fenster (R-LOCK-2).
- Konstanten: LOCK_STALE_MS=10_000, LOCK_RETRY_INTERVAL_MS=50, LOCK_TIMEOUT_MS=5_000 (Z.4-6). Ein Schreiber, der > 5 s wartet, erhält Error "Lock timeout"; ein Halter, der > 10 s braucht (z.B. langsamer SMB + große Datei), wird enteignet, schreibt aber trotzdem noch fertig → Lost Update (R-LOCK-3).
- Freigabe: `fs.unlinkSync(lockFile)` im finally (Z.51-55, 71-75) OHNE Prüfung, ob der Lock noch der eigene ist. Nach einem Stale-Overwrite durch B löscht A beim Fertigwerden B's Lock; C kann dann eintreten, während B noch schreibt (R-LOCK-4).
- withFileLockSync (Z.38-57): Busy-Wait mit `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50)` – blockiert den Electron-Main-Thread bis zu 5 s (R-MAIN-1).
- PID im Lock wird nie ausgewertet (kein "process alive"-Check; über SMB wäre er ohnehin bedeutungslos, da fremder Host).

### Dateiformat / Typen (types.ts) → siehe Abschnitt 8.

## 3b. Dateien, Pfade, DbContext, Backup (gelesen: db/connection.ts, db/settings-store.ts, einsatz-files.ts, backup.ts, startup-recovery.ts, auth.ts)

### Historie
- Repo seit 2026-02-24 (206 Commits). Bis Ende Mai 2026 SQLite (better-sqlite3 + drizzle): 8199070 (2026-02-25) "separate per-einsatz sqlite with auto backup", 0ca506a/70e5060/b7bc562/c6a1668 (2026-03-02) "network-safe sqlite pragmas on SMB shares", "increase sqlite open timeout for SMB lock contention", "swallow transient sqlite lock errors in heartbeat", cd33747 (2026-03-07) "reduce sqlite contention", 4b66ce2 (2026-03-07) "add db utility bridge".
- 2026-05-31 bis 2026-06-04: Komplettumstieg auf JSON-Store (c895599 … f0a5fec "complete SQLite removal", b423a9d). D.h. der JSON-Store ist ~3 Monate alt und wurde als Reaktion auf SQLite-auf-SMB-Probleme eingeführt (Interpretation aus Commit-Reihenfolge; die Commit-Messages nennen SMB-Lock-Contention explizit).
- Reste: package.json dependencies enthalten weiterhin better-sqlite3 ^11.8.1 und drizzle-orm ^0.39.3; build-Skripte rufen weiterhin `rebuild:native`; electron-builder `files` enthält `drizzle/**/*`; src/main/db-runtime.ts ist ein 2-Zeilen-Stub, src/shared/db-runtime.ts (542 Z.) und main-db-bridge.ts (172 Z.) bleiben als totes Protokoll. `grep -rn sqlite src/main src/shared` → nur noch Kommentare/Dateinamen-Erkennung (.sqlite Legacy-Extension in main.ts:23, einsatz-files.ts:13,15, register-einsatz-ipc-support.ts:12).

### Zwei "System"-Dateien mit verwirrender Benennung
- connection.ts:14-16 `systemFilePath(einsatzPath) = dirname(einsatzPath)/_system.json` → das ist die echte Systemdatei (SystemJsonFile: benutzer, stammdaten, activeClients, einsatzListe, recordEditLocks).
- einsatz-files.ts:14 `SYSTEM_DB_NAME = _system.s1control`; main.ts:147-148 `resolveSystemDbPath(baseDir)` → main.ts:161 `openDatabaseWithRetry(configuredSystemDbPath)` öffnet `_system.s1control` als EINSATZ-Datei (connection.ts:18-39 erzeugt bei Bedarf ein leeres Einsatz-Skelett mit zufälliger UUID und leerem Namen). Diese Datei dient als Default-DbContext, bevor ein Einsatz geöffnet ist (Login läuft gegen ctx.system, das aus `_system.json` daneben geladen wird).
- Bestätigt im Ordner einsatz/: `_system.s1control` (434 B) hat Einsatzdatei-Form (schemaVersion, writeSeq 0, einsatz{}, leere Arrays); `_system.json` (469 B) hat Systemdatei-Form (1 benutzer). einsatz-files.ts:52 filtert `_system.s1control` aus der Einsatzliste.
- Fazit: Namensrelikt aus der SQLite-Zeit (`_system.sqlite` war früher die System-DB). Für eine v2 klar zu bereinigen.

### DbContext (connection.ts:9-12, 47-61) – zentrales Problem
- DbContext hält `einsatz` und `system` als In-Memory-Objekte (Snapshot beim Öffnen).
- `save()` (Z.52-58): withFileLock(dbPath) → writeSeq++ → writeEinsatzFile(ctx.einsatz) – schreibt den **In-Memory-Stand** ohne vorheriges Re-Read. Danach `writeSystemFile(sysPath, ctx.system)` **ohne Lock** und ebenfalls aus dem Speicher.
- Folge: Wenn Client A und B denselben Einsatz offen haben und beide über ctx.save() schreiben, überschreibt der zweite den ersten vollständig (Lost Update, R-DATA-1). Ob die Schreibpfade ctx.save() oder mutateEinsatzFile (RMW) verwenden, wird in Abschnitt 3c anhand der IPC-Handler geprüft.
- Der System-Write in save() überschreibt activeClients/recordEditLocks anderer Clients mit dem eigenen (potenziell minutenalten) Snapshot (R-SYS-2).

### Backup (backup.ts)
- Nur der "Master" schreibt Backups (main.ts:362-364 → clientPresence.canWriteBackups()). Intervall-Loop 10 s, effektiv alle 5 min (Z.5-7, 71-74), erster Lauf nach 60 s.
- copyFileSync der Einsatzdatei nach `<dir>/backup/<basename>-<yyyymmdd-hhmmss>.s1control` (Z.76-83). Kein Lock beim Kopieren (bei atomarem rename unkritisch), **keine Aufbewahrungsgrenze / kein Pruning** → 12 Dateien/h, 288/Tag pro Einsatz bei jeder Dateigröße (R-OPS-1).
- restoreBackup (Z.59-62): copyFileSync über die Einsatzdatei **ohne Lock, ohne writeSeq-Erhöhung, ohne tmp+rename** → nicht atomar; andere Clients lesen ggf. eine halb geschriebene Datei (R-DATA-2).
- Systemdatei (_system.json) wird NICHT gesichert.

### Einstellungen (settings-store.ts)
- `<userData>/settings.json` mit dbPath, lanPeerUpdatesEnabled, recentEinsatzDbPaths, recentEinsatzUsageByPath, lastOpenedEinsatzId. Lokal pro Client, unkritisch.

### Auth (auth.ts)
- scrypt (N=16384, r=8, p=1, 64 B) mit Salt, Format `scrypt$salt$hash` (Z.7-24). Default-Admin "admin"/"admin" wird automatisch angelegt (Z.45-56). Benutzer liegen in `_system.json`. Login prüft nur gegen ctx.system-Snapshot (Z.58-67).
- Rollen: ADMIN | S1 | FUE_ASS | VIEWER (types.ts:5). Ob Rollen im Main irgendwo Rechte durchsetzen, wird in 3c geprüft.

### Startup-Recovery (startup-recovery.ts)
- Kein Daten-Recovery: Zeigt bei Bootstrap-Fehler eine Fehlerbox, versucht einen Update-Check und bietet die GitHub-Release-Seite an (Z.52-78). Der Name ist irreführend; es gibt keinen Reparaturpfad für beschädigte JSON-Dateien.

## 3c. Der reale Schreibpfad: ctx.save() statt Read-Modify-Write (KERNBEFUND)

`grep -rn "\.save()" src/main` liefert 15 Aufrufer, `grep -rn mutateEinsatzFile src/main` außerhalb des json-store liefert **null** Aufrufer:
- register-einsatz-ipc.ts:181 (archive), :192 (update-einsatz), :243 (create-abschnitt), :290 (update-abschnitt)
- register-entity-einheit-ipc.ts:35 (create), :67 (update)
- register-entity-fahrzeug-ipc.ts:35, :67
- register-entity-helfer-ipc.ts:52, :85, :118
- register-entity-command-ipc.ts:35 (split), :61 (move-einheit), :87 (move-fahrzeug), :116 (undo)

Jeder dieser Handler: `const ctx = state.getDbContext(); mutateInMemory(ctx, input); await ctx.save();`. `save()` (connection.ts:52-58) nimmt den Lock, erhöht writeSeq und schreibt **den kompletten In-Memory-Snapshot dieses Prozesses**. Es gibt keinen Vergleich mit dem Dateistand (kein Re-Read, kein writeSeq-Vergleich, kein Merge).

Und: Es gibt keinen Codepfad, der `ctx.einsatz` nach dem Öffnen jemals von der Platte aktualisiert:
- `buildCtx` (connection.ts:47) wird nur aus `openDatabaseWithRetry`/`createDbContext` aufgerufen; `createDbContext` hat keinen Aufrufer; `openDatabaseWithRetry` wird nur aufgerufen in main.ts:160-174 (Bootstrap), register-settings-ipc.ts:37 (Pfadwechsel), register-einsatz-ipc-support.ts:78 (nach Backup-Restore), register-einsatz-helpers.ts:93 (Einsatz öffnen), einsatz-files.ts:138 (Einsatz anlegen).
- Alle Lese-Handler lesen aus `ctx.einsatz`/`ctx.system`: register-einsatz-ipc.ts:337-339 (`listAbschnitte(ctx.einsatz, …)`), :372-377, :407-409; register-entity-helfer-ipc.ts:22; register-entity-command-ipc.ts:139.
- Der Renderer-Refresh `loadEinsatz` (src/renderer/src/app/useEinsatzData.ts:35-75) ruft nur `listAbschnitte`, `listAbschnittDetails`, `listAbschnittDetailsBatch`. Die Poll-Schleife (useSyncEvents.ts:56-64, alle 6 s) und der UDP-Trigger (useSyncEvents.ts:209-224) rufen ebenfalls nur `loadEinsatz`. Ein erneutes `openEinsatz`/`openEinsatzByPath` erfolgt nur beim Start (useStartActions.ts:40), nach Backup-Restore (useSystemActions.ts:66) und bei Datei-Doppelklick (useSyncEvents.ts:167).

Konsequenz nach Codelage (nicht mit zwei laufenden Clients nachgestellt, aber die Kette ist geschlossen):
1. Client A und B öffnen dieselbe .s1control (beide Snapshot S0).
2. A legt eine Einheit an → Datei = S0+eA. B bekommt per UDP/Polling ein Refresh-Signal, liest aber weiterhin seinen In-Memory-Snapshot S0 → B sieht eA nicht.
3. B verschiebt eine Einheit → `save()` schreibt S0+moveB. **eA ist aus der Datei verschwunden** (Lost Update). A sieht das nicht einmal, weil A ebenfalls nur aus seinem Snapshot liest; erst nach Neustart/Neuöffnen ist eA für alle weg.
4. Das Verhalten ist unabhängig von der Qualität des .lock-Mechanismus: Der Lock serialisiert nur zwei gleichzeitige `rename`s, verhindert aber nicht das Überschreiben mit veraltetem Stand.

Der Mehrbenutzerbetrieb ist damit in der aktuellen JSON-Store-Fassung auf Datenebene nicht funktionsfähig, obwohl Heartbeat, Master-Wahl, Bearbeitungssperren, UDP-Sync und Polling vorhanden sind. In der vorherigen SQLite-Fassung (bis f0a5fec, 2026-05-31) las jeder Request die DB → dort trat das Problem nicht auf; der Umstieg hat es eingeführt. Der einzige Test mit "Fileshare" im Namen (test/behavior.fileshare-engpass.test.ts) testet einen Prozess mit einem ctx und deckt das nicht ab; kein Test öffnet dieselbe Datei zweimal.

Datei-Größen (aus einsatz/java_error_in_phpstorm_18906.s1control, 6.762 B bei 4 Abschnitten, 4 Einheiten, 1 Fahrzeug, pretty-printed mit 2 Leerzeichen): ca. 1,2 KB je Einheit (26 Felder inkl. eingebettetem tacticalSignConfigJson-String), ca. 0,5 KB je Fahrzeug, ca. 0,4 KB je Helfer, ca. 0,3 KB je Bewegung, ca. 0,35 KB je commandLog-Eintrag (Schätzung aus Feldanzahl). Bewegungen und commandLog wachsen unbegrenzt (command.ts:44-68, 94-116; undo fügt weitere Bewegungen hinzu, command.ts:136-158; kein Pruning). Hochrechnung Großlage: 150 Einheiten + 300 Fahrzeuge + 1.500 Helfer + 2.000 Bewegungen + 2.000 Commands ≈ 2-2,5 MB. Jeder einzelne Write (auch ein Lock-Heartbeat ist NICHT betroffen, aber jede fachliche Änderung) schreibt diese Datei komplett über SMB; das ist funktional noch tragbar, aber jede Änderung ist O(Dateigröße) und blockiert den Main-Thread für Parse+Stringify+Write.

## 4. Multi-Client (clients.ts, einsatz-sync.ts, record-lock.ts, einsatz-read-cache.ts)

### 4.1 Präsenz und Master-Wahl (clients.ts, 171 Z.)
- HEARTBEAT_MS = 5 s, STALE_MS = 2 min (Z.9-10). clientId = zufällige UUID pro Prozessstart (Z.37), startedAt = Prozessstart (Z.39).
- heartbeat() (Z.126-170): **lockfreies** Read-Modify-Write von `_system.json`: readSystemFile → stale Clients filtern → eigenen Eintrag upserten → Leader bestimmen → writeSystemFile. Kommentar Z.137: "Lockfrei: Heartbeat ist idempotent; bei Konflikt schreibt der nächste Heartbeat". Das stimmt für activeClients, aber der Write schreibt auch benutzer, stammdatenEinheiten, einsatzListe und **recordEditLocks** aus dem gerade gelesenen Stand zurück → Sperren, die ein anderer Client zwischen Read und Write angelegt hat, werden gelöscht (R-SYS-3). Bei N Clients gibt es N ungeschützte RMW-Zyklen pro 5 s auf derselben Datei plus die geschützten RMW der Sperren.
- Master = ältestes startedAt, Tie-Break clientId (Z.158-163). Master-Rolle wird nur für Backups genutzt (canWriteBackups, Z.93-95; main.ts:362-364). Die persistierte `isMaster`-Flagge (types.ts:168) wird beim Push immer `false` gesetzt und nie aktualisiert (Z.155) → Feld ist bedeutungslos; die Rolle wird lokal berechnet.
- Uhrzeitabhängig: lastSeen/staleCutoff sind ISO-Strings verschiedener Client-Uhren, Vergleich per String (Z.104, 140). Uhrenabweichung > 2 min zwischen Clients → ein Client hält den anderen für stale und löscht dessen Eintrag; Master flackert.
- stop(true) (Z.71-91) schreibt ebenfalls lockfrei.
- Der Konstruktor nimmt noch `_dbBridge`/`_useDbUtilityProcess` entgegen (Z.47-50), ungenutzt (Relikt).

### 4.2 Änderungs-Signal (einsatz-sync.ts, 244 Z.)
- UDP4-Socket mit reuseAddr auf Port 41235 (env S1_SYNC_BROADCAST_PORT), Broadcast an 255.255.255.255 (Z.7-8, 118-129, 201). Nachricht: {type:'s1-einsatz-changed', payload:{einsatzId, dbPath, sourceClientId, changedAt, reason}} (Z.11-14, types.ts:311-317).
- Throttle: gleiche einsatzId+dbPath max. alle 200 ms (Z.9, 180-192).
- Empfang: Match über sameDbPath ODER sameBaseName ODER sameEinsatzId (Z.73-83) → onRemoteChange → broadcastToAllWindows(EINSATZ_CHANGED) (main.ts:365-367). Match über Dateinamen (Z.82) ist zu weit: gleicher Dateiname in anderem Ordner löst Refresh aus (harmlos, aber unsauber).
- Eigene Broadcasts werden verworfen (Z.79); lokale Benachrichtigung läuft separat über notifyLocal (register-einsatz-helpers.ts:142-149).
- Keine Zustellgarantie, kein Inhalt (nur "etwas hat sich geändert"). Broadcast überquert keine Subnetz-/VLAN-Grenzen; Host-Firewalls (Windows Defender bei portable EXE) können eingehendes UDP blocken [unbelegt für die konkrete Zielumgebung].
- Fallback: Renderer-Polling alle 6 s (useSyncEvents.ts:56-64) und beim Settings-View alle 5 s Clients/Peers (Z.123-126). Beide Kanäle führen aber wegen 3c ins Leere (Refresh des eigenen Snapshots).
- Zweite, unabhängige clientId (Z.89) neben der Präsenz-clientId (clients.ts:37) → sourceClientId im Signal ist nicht die Präsenz-ID.

### 4.3 Bearbeitungssperren (record-lock.ts, 161 Z.)
- LOCK_TTL_MS = 45 s (Z.8). Sperren liegen in `_system.json`.recordEditLocks (types.ts:180-191) pro entityType (ABSCHNITT|EINHEIT|FAHRZEUG) + entityId.
- acquire/refresh/release über mutateSystemFileSync (Z.60, 109, 133) → withFileLockSync → **Busy-Wait auf dem Main-Thread** bis 5 s (file-lock.ts:38-47).
- Heartbeat aus dem Renderer alle 8 s je gehaltener Sperre (useEditLocks.ts:316-340), jede 3. Runde zusätzlich Volllisten-Refresh.
- Enforcement: ensureRecordEditLockOwnership (Z.140-153) wird vor update-abschnitt/-einheit/-fahrzeug und Helfer-CRUD geprüft (register-einsatz-ipc.ts:254, register-entity-einheit-ipc.ts:61, -fahrzeug-ipc.ts:61, -helfer-ipc.ts:46/79/112), **nicht** vor move/split/undo/create/archive. Die Prüfung liest ohne Lock (Z.142) → TOCTOU zwischen Prüfung und save().
- Ablauf per ISO-String-Vergleich verschiedener Uhren (Z.42-44).
- Da Heartbeats der Präsenz die recordEditLocks lockfrei zurückschreiben (4.1), kann eine frisch erworbene Sperre verschwinden; der nächste ensureRecordEditLockOwnership wirft dann "Datensatz ist nicht zur Bearbeitung gesperrt" (Z.148) → Nutzer muss Dialog neu öffnen; oder ein zweiter Client erwirbt dieselbe Sperre.

### 4.4 Lese-Cache (einsatz-read-cache.ts, 79 Z.)
- TTL 1,5 s, Schlüssel ctx.path+einsatzId(+abschnittId); invalidiert bei eigenem notifyEinsatzChanged (register-einsatz-helpers.ts:143) und setDbContext (main.ts:459-460). Cache über einem In-Memory-Objekt ohne I/O → Nutzen minimal (spart Map/Filter über Arrays), stammt erkennbar aus der SQLite-Zeit (Commit cd33747 "batch abschnitt reads").

### 4.5 Timeouts/Konstanten auf einen Blick
| Mechanismus | Wert | Quelle |
|---|---|---|
| Datei-Lock stale | 10 s | file-lock.ts:4 |
| Datei-Lock Retry | 50 ms | file-lock.ts:5 |
| Datei-Lock Timeout | 5 s | file-lock.ts:6 |
| Präsenz-Heartbeat | 5 s | clients.ts:9 |
| Präsenz stale | 120 s | clients.ts:10 |
| Record-Lock TTL | 45 s | record-lock.ts:8 |
| Record-Lock Renderer-Heartbeat | 8 s | useEditLocks.ts:340 |
| Read-Cache TTL | 1,5 s | einsatz-read-cache.ts:4 |
| UDP-Throttle | 200 ms | einsatz-sync.ts:9 |
| Renderer-Poll Einsatz | 6 s | useSyncEvents.ts:64 |
| Renderer-Poll Settings | 5 s | useSyncEvents.ts:125 |
| Remote-Refresh-Debounce | 800 ms | useSyncEvents.ts:218 |
| Backup-Intervall | 5 min (Loop 10 s, Start 60 s) | backup.ts:5-7 |
| IPC "slow"-Schwelle (nur Log) | 120 ms | register-ipc.ts:18 |
| DB-Runtime-Timeouts (tot) | 1,2 / 5 / 15 s | shared/db-runtime.ts:522-526 |

## 5. Fachlogik

### 5.1 Schreibdienste (einsatz-write/*, 781 Z. inkl. Re-Exports)
- einsatz-core.ts: createEinsatz legt Einsatz + Wurzel-Abschnitt systemTyp FUEST an (Z.19-27); updateEinsatz benennt Einsatz und FüSt-Wurzel um (Z.44-51, uncommitted erweitert); archiveEinsatz setzt ARCHIVIERT+end (Z.54-60).
- abschnitt.ts: create/update; update prüft Parent-Zyklus (validations.ts:12-35) und erhöht `version` (Z.60).
- einheit.ts: createEinheit (26 Felder, EEB-Felder grFuehrer/ov/rb/lv/Telefon/Fax/bemerkung/vegetarier/erreichbarkeiten), Zeichen-Default per Inferenz (Z.54-61); updateEinheit bewahrt manuelle Zeichen (tactical-sign-config.ts:39-67); splitEinheit (Z.151-233) teilt F/UF/M-Stärken, prüft Verfügbarkeit, legt Kind mit parentEinsatzEinheitId an. Erhöht `version` (Z.147) – wird nirgends geprüft.
- fahrzeug.ts: Fahrzeug ist immer einer Einheit zugeordnet (validateLinkedEinheitId), aktuellerAbschnittId wird von der Einheit übernommen (Z.38, 92). standardPiktogrammKey fest 'mtw' (Z.41).
- helfer.ts: Helfer je Einheit mit rolle FUEHRER|UNTERFUEHRER|HELFER, geschlecht, anzahl>=1 (Z.25), Name-Fallback 'N.N.' (Z.42). Keine Kopplung an aktuelleStaerke der Einheit (nirgends verrechnet).
- validations.ts / tactical-strength.ts: Organisation-Whitelist (14 Werte, einsatz-transaction-guards.ts:5-20), Stärke-Format `F/UF/M/G` mit Konsistenzprüfung Summe==G==aktuelleStaerke (tactical-strength.ts:46-58), parseTaktisch mit Fallback (Z.6-21).
- Alle Schreibdienste sind reine Funktionen auf `EinsatzWriteCtx` ohne I/O → gut testbar, 190 Tests grün (vitest run, 5 s).

### 5.2 Kommandos/Undo (command.ts, 165 Z.)
- moveEinheit/moveFahrzeug: setzt aktuellerAbschnittId, schreibt Bewegung (einheitBewegungen/fahrzeugBewegungen) und commandLog-Eintrag mit payloadJson (Z.24-117). No-op bei gleichem Ziel (Z.37, 87).
- **moveEinheit verschiebt die zugeordneten Fahrzeuge nicht** (Z.41-42 ändert nur die Einheit; fahrzeug.aktuellerAbschnittId bleibt; wird erst bei updateFahrzeug nachgezogen, fahrzeug.ts:92) → fachliche Inkonsistenz R-DOM-5.
- undoLastCommand (Z.119-165): nimmt jüngsten nicht-undone Command (Sortierung per timestamp-String), unterstützt nur MOVE_EINHEIT/MOVE_FAHRZEUG, schreibt Gegenbewegung mit Benutzer "<name> (undo)" und markiert undone. Undo ist einsatzweit (nicht pro Benutzer/Client) → im Mehrbenutzerbetrieb macht Client B ggf. die Bewegung von Client A rückgängig.
- create/update/delete/split/archive werden NICHT im commandLog protokolliert → kein Audit-Trail, kein Undo.
- staerkeLog (types.ts:121-128) wird nie geschrieben (grep; siehe 3d).

### 5.3 Lesedienste (einsatz-read-service.ts, 167 Z.)
- Reine Projektionen aus EinsatzJsonFile: listAbschnitte, listAbschnittDetails (Einheiten+Fahrzeuge je Abschnitt), listAbschnittDetailsBatch (Gruppierung in einem Durchlauf), listEinheitHelfer (sortiert nach Name), hasUndoableCommand. piktogrammKey kommt aus stammdatenEinheiten (Z.44-46, 55) – die nie befüllt werden.

### 5.4 Export (export.ts, 183 Z.)
- ZIP (jszip) mit report.html (Einheitenliste + Bewegungen), einheiten.csv, bewegungen.csv (Semikolon, alle Werte gequotet), Rohkopie der .s1control (Z.174-178). Abschnitte werden als UUID ausgegeben, nicht als Name (Z.81, 93, 99). Helfer, Fahrzeuge (außer Bewegungen), commandLog fehlen. Default-Pfad `process.cwd()` (register-einsatz-ipc.ts:445).

### 5.5 Taktische Zeichen und STAN (1.157 Z. + 75 KB JSON)
- tactical-signs.ts: SVG-Erzeugung über `taktische-zeichen-core` (erzeugeTaktischesZeichen) für Formation/Fahrzeug, Person über Handlebars-Template aus `taktische-zeichen` (Z.35-40); Mapping OrganisationKey → core OrganisationId (Z.82-97) und Farben (Z.65-80); Legacy-typ-Mapping group/squad/platoon → gruppe/trupp/zug (Z.99-111); Data-URL-Cache im Prozess (Z.41). Beide npm-Pakete (taktische-zeichen ^1.3.4, taktische-zeichen-core ^0.10.0) sind Abhängigkeiten.
- tactical-sign-inference.ts + tactical-sign/*: Regelwerk (1) THW-Komposita "TZ …"/"FZ FK"/"FZ Log" (thw-shortcodes.ts:72-209, Confidence 0,88-0,9), (2) THW-Kurzzeichen-Tabelle mit Patterns (tactical-sign-aliases.ts:39-78: Ztr, BrB, BT, E, I, N, Öl, O, R, SB, SP, TW, W, WP, F, K, Log-MW/V/M/VG, ESS, UL, TS), Score 0,72+0,08·Treffer, (3) Katalog-Scoring über core-Einheiten mit Aliassen, AUTO_THRESHOLD 0,6 (tactical-sign-inference.ts:11, scoring.ts:52-77). Ergebnis trägt meta{source:'auto'|'manual', confidence, matchedKey, ruleVersion:1}. Manuelle Zeichen werden bei Updates bewahrt (tactical-sign-config.ts:57-64).
- stan/thw-stan-inference.ts: 47 Einträge aus `thw-stan-2025.generated.json` (generatedAt/sourceZip/entries; Skript scripts/extract-thw-stan-from-zip.cjs, README), Token-Overlap-Score mit Schwelle 0,45 (Z.196), Heuristik-Fallbacks für Stärke/Fahrzeuge/Zeichen (Z.72-169). Liefert ThwStanPresetSuggestion {strength F/UF/M/G, vehicles[], tacticalSign, vehicleTacticalSigns[]} (types.ts:192-201).
- Bewertung: fachlich wertvoll, gut isoliert (reine Funktionen, Tests: tactical-sign-inference.test.ts, tactical-signs.test.ts, tactical-sign-fallback.test.ts, thw-stan-inference.test.ts), aber die THW-Kurzzeichen-Patterns sind teilweise sehr kurz ('bt', 'sb', 'sp', 'tw', 'ul', 'ts', ' w ') → Fehltreffer bei Freitext wahrscheinlich; Regel-Version 1 ohne Migrationspfad für gespeicherte meta.

### 5.6 Stärke-Monitor (strength-display.ts, 321 Z. + register-display-ipc.ts 148 Z.)
- Zweites BrowserWindow (rahmenlos, auf externem Display falls vorhanden, Z.144-148, 153-182) mit demselben Renderer-Bundle (?display=strength). Prewarm 150 ms/1,2 s nach ready-to-show (main-bootstrap.ts:57-86). Zustand nur `taktischeStaerke: string` (types.ts:155-157), wird vom Renderer gesetzt (SET_STRENGTH_DISPLAY_STATE) – Main rechnet nichts.
- Viel Code für Fenster-Lebenszyklus/Splash/Fallback (Diagnose-Flag, safeLoadURL). Rein präsentativ, kein Fachanteil.

## 6. Updater (updater*.ts 1.429 Z. + update-peer*.ts 796 Z. = 2.225 Z., 20 % des Main/Shared-Codes)

- updater.ts: electron-updater (generic feed auf GitHub Releases latest/download, updater.ts:31, 320-323), drei parallele GitHub-Fallback-Checks (API, Releases-Webseite-Redirect via fetch, Redirect via node:https; updater-github-check.ts:192-256, Promise.any), Timeouts 12 s in-app / 8 s GitHub / 15 s Watchdog (updater.ts:48-54, updater-github-check.ts:7-14), Versionsvergleich für drei Formate (SemVer, YYYY.MM.DD.HH.MM, YYYY.M.D-H.M; updater-versioning.ts:142-208, jüngster Fix ffa14f8). Download → quitAndInstall nach 1,8 s (Z.424-427).
- LAN-Peer: UDP-Discovery Port 41234 Broadcast (update-peer-protocol.ts:5, 99-101), 1,5 s Sammelfenster (Z.6), Angebote sortiert nach freshness/rtt (Z.84-94); HTTP-Server auf Port 0 (update-peer.ts:226-240) liefert `/update/<artifact>`; Download mit **3 s Gesamt-Timeout** (update-peer-transfer.ts:8, 33 – für ein 100-MB-Installer-Artefakt praktisch immer zu kurz, da AbortController den gesamten fetch inkl. Body abbricht), SHA512-Prüfung und 10-min-Peer-Sperre bei Hash-Fehler (Z.9, 123-127); danach lokaler One-Shot-Feed-Server (update-peer-feed.ts) damit electron-updater das Artefakt "signiert" installiert (updater-peer-flow.ts:95-123). Feature standardmäßig aus (settings lanPeerUpdatesEnabled ?? false, main.ts:342).
- Bewertung: technisch ordentlich getestet (10 update-*-Testdateien), aber im Verhältnis zum Kern überdimensioniert: 2.225 Z. Updater vs. 1.296 Z. Fachlogik-Schreib/Lese/Export. Für den Einsatzfall (offline, Fileshare) ist die relevante Anforderung "Installer per USB/Share verteilen"; der LAN-Peer-Pfad löst ein Problem, das ohne Internet ohnehin nicht entsteht (ohne Internet gibt es kein Erst-Artefakt) und mit Internet nicht nötig ist.

## 3d. Ungenutzte Schemateile / tote Pfade (grep-Belege)
- `staerkeLog` (types.ts:121-128, 141): nur in createEmptyEinsatzFile initialisiert, nie geschrieben.
- `einsatzListe` (types.ts:171-178, 198): nie geschrieben; Einsatzliste kommt aus settings.json recentEinsatzDbPaths + Verzeichnisscan (register-settings-ipc.ts:70-73, einsatz-files.ts:46-113).
- `stammdatenEinheiten` (types.ts:144-151, 195): nie geschrieben, keine IPC dafür; `stammdatenEinheitId`/`piktogrammKey` dadurch immer null.
- `JsonActiveClient.isMaster`: immer false (clients.ts:155).
- `mutateEinsatzFile`, `createDbContext`, `getFileMtime`, `loadEinsatzState`: ohne Aufrufer.
- Rollen (ADMIN|S1|FUE_ASS|VIEWER): im Main nirgends geprüft; `requireUser` prüft nur Anmeldung (register-ipc.ts:52-58); Login läuft laut README automatisch als admin.
- `fsync`: nirgends verwendet.
- Utility-Prozess: main-db-bridge.ts (172), shared/db-runtime.ts (542), db-runtime.ts-Stub (2), ~15 `if (state.useDbUtilityProcess && state.dbBridge.isEnabled())`-Blöcke in den IPC-Handlern (je ~15-25 Z.). Mit S1_DB_UTILITY_PROCESS=1 würde ein 2-Zeilen-Stub geforkt, jede Anfrage liefe in den Timeout (1,2/5/15 s) und dann in den lokalen Fallback; Sperren-IPC würde dabei hart fehlschlagen (register-entity-lock-ipc.ts:37-40, 69-72, 102-105 werfen statt Fallback). TODO.md hakt "Utility-Prozess-Auslagerung abschließen" als erledigt ab.

---

## 1b. Codeverteilung nach Bereich (wc -l, exakt aus der Dateiliste, Summe 11.040)

| Bereich | Dateien | Zeilen | Anteil |
|---|---|---|---|
| Fachlogik Schreiben/Lesen/Kommandos/Export | einsatz-write/* (8), einsatz-write-service, command, einsatz-read-service, export | 1.296 | 11,7 % |
| Taktische Zeichen + STAN | tactical-signs, tactical-sign-inference, tactical-sign/* (3), tactical-sign-aliases, stan/thw-stan-inference (+75 KB JSON) | 1.157 | 10,5 % |
| **Kern-Fachlogik gesamt** | | **2.453** | **22,2 %** |
| Persistenz json-store | types, einsatz-store, system-store, file-lock | 399 | 3,6 % |
| Persistenz-Umfeld | db/connection, db/settings-store, einsatz-files, backup, startup-recovery, auth, errors, debug, diagnostics, app-version, einsatz.ts, einsatz-transaction-guards | 789 | 7,1 % |
| Multi-Client/Sync | clients, einsatz-sync, record-lock, einsatz-read-cache | 655 | 5,9 % |
| Prozess/Bootstrap/Fenster/Preload/Bridge | main, main-bootstrap, main-window, preload, db-runtime-Stub, main-db-bridge | 1.050 | 9,5 % |
| IPC-Registrierung (18 Dateien) | ipc/* | 1.850 | 16,8 % |
| Stärke-Monitor | strength-display | 321 | 2,9 % |
| Updater (GitHub/electron-updater) | updater*.ts (8) | 1.429 | 12,9 % |
| LAN-Peer-Update | update-peer*.ts (7) | 796 | 7,2 % |
| **Updater gesamt** | | **2.225** | **20,2 %** |
| Shared-Verträge | shared/types 317, shared/ipc 439 | 756 | 6,8 % |
| Shared totes Protokoll | shared/db-runtime | 542 | 4,9 % |

Toter/obsoleter Code (konservativ): main-db-bridge 172 + db-runtime-Stub 2 + shared/db-runtime 542 + dbBridge-Zweige in IPC-Handlern ≈ 250 + read-cache 79 + mutateEinsatzFile/createDbContext/getFileMtime/loadEinsatzState ≈ 40 ≈ **1.085 Zeilen (~10 %)**. Zum Vergleich Renderer: 10.097 Zeilen (src/renderer), Tests: 36 Dateien/190 Tests.

Verhältnis: Auf 1 Zeile Fachlogik kommen ~0,9 Zeilen Updater, ~1,2 Zeilen Prozess/IPC-Verdrahtung und ~0,45 Zeilen toter Code. Die eigentliche Domäne (Abschnitte, Einheiten, Fahrzeuge, Helfer, Bewegungen, Stärke, Zeichen, STAN) ist kompakt und trägt fast allein den fachlichen Wert.

## 2. Prozessmodell

- **Ein Electron-Main-Prozess** (main.ts:428-491 bootstrap): Single-Instance-Lock (Z.100-121), macOS open-file und argv-Parsing für .s1control/.sqlite (Z.23, 47-95), SettingsStore in userData, Runtime-Services (initRuntimeServices Z.330-383): UpdaterService, DbContext auf `_system.s1control` (Platzhalter-Einsatz), MainDbBridge (nur aktiv mit S1_DB_UTILITY_PROCESS=1, dann defekt), ClientPresenceService, BackupCoordinator, EinsatzSyncService (UDP), StrengthDisplayService, EinsatzReadCache. Feature-Flags: S1_PERF_SAFE_MODE schaltet Heartbeat/UDP/Peer ab (Z.29-33).
- **Renderer** (BrowserWindow 1400x900, contextIsolation true, nodeIntegration false, sandbox false; main-window.ts:65-75) plus optional zweites Fenster Stärke-Monitor mit demselben Bundle. Dev-Modus wartet auf Vite (Z.47-60, Retry bei ERR_ABORTED Z.82-93).
- **Preload** (preload.ts): contextBridge exponiert `window.api` (58 Methoden, 1:1 ipcRenderer.invoke) sowie `updaterEvents`, `strengthDisplayEvents`, `appEvents` (onPendingOpenFile, onDebugSyncLog, onEinsatzChanged). Keine Logik im Preload – sauber.
- **IPC**: 66 Kanäle (shared/ipc.ts:369-437), alle `ipcMain.handle` über `wrap` (register-ipc.ts:19-50: Zeitmessung >120 ms → Debug-Log, Fehler → toSafeError mit code). `requireUser` nur Anwesenheitsprüfung. Registrierung modular in 8 Registrar-Dateien (register-ipc.ts:64-71).
- **Kein Utility-/Worker-Prozess** trotz Code dafür (siehe 3d). Alle Datei-I/O ist synchron (readFileSync/writeFileSync/renameSync/copyFileSync/existsSync/readdirSync) und läuft im Main-Thread: einsatz-store.ts, system-store.ts, file-lock.ts, clients.ts, record-lock.ts, backup.ts, einsatz-files.ts. Bei SMB-Latenz von z.B. 200 ms je Operation blockiert ein Einsatz-Öffnen (readdir + je Datei readFile für die Einsatzliste, einsatz-files.ts:70-75) oder ein Sperren-Erwerb (Lock-Datei wx + read + write + unlink = 4 Roundtrips) den kompletten Main-Prozess inkl. aller anderen IPC-Antworten, Menüs und Fenster-Events. Der Busy-Wait `Atomics.wait` in withFileLockSync (file-lock.ts:46) blockiert den Main-Thread explizit bis zu 5 s.
- Weitere Main-Thread-Blocker: scryptSync (auth.ts:17,32; N=16384, ~50-100 ms je Aufruf, bei ensureDefaultAdmin auf jedem Open-Pfad), JSON.parse/stringify der gesamten Einsatzdatei bei jedem Read/Write, SVG-Erzeugung + base64 (tactical-signs.ts:196-198, gecacht), JSZip-Export (async, ok), sha512File liest gesamtes Artefakt synchron (update-peer.ts:32-37).
- Zeitgeber im Main: Heartbeat 5 s (clients.ts:66), Backup-Loop 10 s (backup.ts:51), Prewarm-Timer (main-bootstrap.ts), Updater-Watchdog (updater.ts:543). Alles andere polled der Renderer (6 s Einsatz, 5 s Settings, 8 s Sperren-Heartbeat).
- Fehlerbehandlung: process.on('uncaughtException'/'unhandledRejection') → Dialog mit Version (main.ts:493-503); Bootstrap-Fehler → startup-recovery mit Update-Hinweis. Shutdown: window-all-closed/before-quit → stopServices, danach 250 ms Force-Exit (main.ts:258-286); ClientPresence.stop(false) lässt den eigenen activeClients-Eintrag stehen (TTL 2 min).
- Sicherheit: contextIsolation an, aber `sandbox: false`; OPEN_EXTERNAL_URL nur https (register-updater-ipc.ts:45); Passwörter scrypt; Standard-Admin admin/admin; keine Autorisierung nach Rolle; UDP-Nachrichten ohne Authentisierung (jeder im LAN kann Refresh-Stürme auslösen oder – beim Peer-Update – Angebote unterschieben, gemildert durch sha512 aus dem GitHub-Feed).

## 7. Architekturkarte

```
+---------------------------------------------------------------------------------+
| Client-PC (Electron)                                                            |
|                                                                                 |
|  Renderer (React, 10.1k Z.)          Stärke-Monitor-Fenster (gleiches Bundle)  |
|   useSyncEvents: Poll 6s, onEinsatzChanged ----+   ^ STRENGTH_DISPLAY_STATE     |
|   useEditLocks: Sperren-Heartbeat 8s           |   |                            |
|   useEinsatzData.loadEinsatz -> list*          |   |                            |
|          | window.api.* (58 invoke)            |   |                            |
|  Preload (contextBridge, keine Logik)          |   |                            |
|          | ipcMain.handle (66 Kanäle, wrap)    |   |                            |
|  Main-Prozess -------------------------------------------------------------     |
|   ipc/register-* (1.850 Z.)  ---> services/einsatz-write/* (reine Fkt. auf ctx) |
|          |                        services/command.ts (MOVE + Undo)             |
|          |                        services/einsatz-read-service.ts (Projektion) |
|          |                        services/tactical-sign*/stan/* (Inferenz,SVG) |
|          v                        services/export.ts (ZIP)                      |
|   AppState.getDbContext() = DbContext {path, einsatz (IN-MEMORY), system, save}|
|          |  save(): lock -> writeSeq++ -> tmp+rename (GANZE DATEI, kein Re-Read)|
|          |  system: writeSystemFile ohne Lock                                   |
|   ClientPresenceService  --5s--> _system.json (lockfreies RMW)                  |
|   record-lock            --------> _system.json (mutateSystemFileSync, Busy-Wait)|
|   BackupCoordinator (nur Master) --5min--> backup/<name>-<ts>.s1control          |
|   EinsatzSyncService --UDP 41235 broadcast--> andere Clients (nur "changed")    |
|   UpdaterService (electron-updater/GitHub) + UpdatePeerService (UDP 41234+HTTP) |
|   MainDbBridge -> fork(db-runtime.js)  [Stub, tot]                              |
+---------------------------------------------------------------------------------+
            |  sync fs (readFileSync/writeFileSync/renameSync) über SMB
            v
+---------------------------------------------------------------------------------+
| NAS / SMB-Share  <einsatzverzeichnis>/                                           |
|   _system.json            SystemJsonFile: benutzer, activeClients, recordEditLocks|
|   _system.json.lock       {pid, acquiredAt} nur bei record-lock-Mutationen       |
|   _system.s1control       Platzhalter-Einsatzdatei (Default-DbContext)           |
|   <name>-<ts>.s1control   EinsatzJsonFile (schemaVersion 1, writeSeq, Arrays)    |
|   <name>-<ts>.s1control.lock / .tmp                                              |
|   backup/<name>-YYYYMMDD-HHMMSS.s1control  (unbegrenzt)                          |
+---------------------------------------------------------------------------------+
Lokal je Client: <userData>/settings.json (dbPath, recent, lanPeer), update-cache/
```

Datenflüsse:
1. Öffnen: Renderer openEinsatzByPath → openDatabaseWithRetry (readEinsatzFile + readSystemFile) → neuer DbContext → clientPresence.start, einsatzSync.setContext, backup.start, settings recent.
2. Lesen: Renderer list* → IPC → EinsatzReadCache → Projektion aus ctx.einsatz (kein Datei-I/O).
3. Schreiben: Renderer create/update/move → IPC → (ensureRecordEditLockOwnership: readSystemFile) → reine Mutation auf ctx → ctx.save() → notifyEinsatzChanged (Cache invalidieren, lokal EINSATZ_CHANGED, UDP-Broadcast).
4. Fremde Änderung: UDP → EINSATZ_CHANGED → Renderer loadEinsatz → list* → **derselbe alte ctx.einsatz** (kein Reload).
5. Sperre: Renderer acquireEditLock → mutateSystemFileSync(_system.json) → Heartbeat 8 s → release.
6. Präsenz: Heartbeat 5 s RMW _system.json; Master = ältester Client → Backup.

## 8. Datenformat-Spezifikation .s1control (Ist, aus json-store/types.ts)

Kodierung: UTF-8 JSON, `JSON.stringify(data, null, 2)`, erstes Byte muss `{` sein (einsatz-store.ts:12). Endung `.s1control`; `.sqlite` wird nur noch als Legacy-Endung erkannt, Inhalt nicht mehr lesbar (connection.ts:25-31 legt bei Nicht-JSON ein leeres Skelett an und **überschreibt die Datei**; readEinsatzFile wirft; d.h. eine echte Legacy-SQLite-Datei würde beim Öffnen durch ein leeres Einsatz-Skelett ersetzt – R-DATA-4).

### EinsatzJsonFile (types.ts:130-142)
```
{
  schemaVersion: 1,                 // Literal 1, keine Migrationslogik vorhanden
  writeSeq: number,                 // monoton, +1 je save(); nirgends geprüft
  einsatz: JsonEinsatz,
  abschnitte: JsonAbschnitt[],
  einheiten: JsonEinheit[],
  fahrzeuge: JsonFahrzeug[],
  helfer: JsonHelfer[],
  einheitBewegungen: JsonEinheitBewegung[],
  fahrzeugBewegungen: JsonFahrzeugBewegung[],
  commandLog: JsonCommandLogEntry[],
  staerkeLog: JsonStaerkeLogEntry[]  // nie befüllt
}
```
- JsonEinsatz (Z.7-15): id (UUID), name, fuestName, uebergeordneteFuestName|null, start (ISO), end|null, status AKTIV|BEENDET|ARCHIVIERT (BEENDET wird nie gesetzt).
- JsonAbschnitt (Z.17-24): id, einsatzId, name, parentId|null, systemTyp FUEST|ANFAHRT|LOGISTIK|BEREITSTELLUNGSRAUM|NORMAL, version (Zähler). Baum über parentId; Wurzel = FUEST mit parentId null (einsatz-core.ts:20-27).
- JsonEinheit (Z.26-54): id, einsatzId, stammdatenEinheitId|null (immer null), parentEinsatzEinheitId|null (Split-Herkunft), nameImEinsatz, organisation (String aus 14er-Whitelist), aktuelleStaerke (Gesamt), aktuelleStaerkeTaktisch "F/UF/M/G"|null, aktuellerAbschnittId, status AKTIV|IN_BEREITSTELLUNG|ABGEMELDET, tacticalSignConfigJson (String mit eingebettetem JSON TacticalSignConfig inkl. meta), grFuehrerName, ovName/ovTelefon/ovFax, rbName/rbTelefon/rbFax, lvName/lvTelefon/lvFax, bemerkung, vegetarierVorhanden boolean|null, erreichbarkeiten, erstellt (ISO), aufgeloest|null (nie gesetzt), version.
- JsonFahrzeug (Z.56-73): id, einsatzId, parentEinsatzFahrzeugId|null (nie gesetzt), aktuelleEinsatzEinheitId|null, aktuellerAbschnittId|null (Kopie der Einheit zum Zeitpunkt create/update), name, kennzeichen|null, standardPiktogrammKey ('mtw' fest), funkrufname|null, stanKonform boolean|null, sondergeraet|null, nutzlast|null, status AKTIV|IN_BEREITSTELLUNG|AUSSER_BETRIEB, erstellt, entfernt|null (nie gesetzt), version.
- JsonHelfer (Z.75-90): id, einsatzId, einsatzEinheitId, name ('N.N.' Fallback), rolle FUEHRER|UNTERFUEHRER|HELFER, geschlecht MAENNLICH|WEIBLICH, anzahl>=1, funktion|null, telefon|null, erreichbarkeit|null, vegetarisch boolean, bemerkung|null, erstellt, aktualisiert. (Helfer werden hart gelöscht, helfer.ts:111.)
- JsonEinheitBewegung (Z.92-100): id, einsatzEinheitId, vonAbschnittId|null, nachAbschnittId, zeitpunkt, benutzer (Name, bei Undo "<name> (undo)"), kommentar|null.
- JsonFahrzeugBewegung (Z.102-109): wie oben ohne kommentar.
- JsonCommandLogEntry (Z.111-119): id, einsatzId, benutzerId, commandTyp 'MOVE_EINHEIT'|'MOVE_FAHRZEUG', payloadJson (String: {einheitId|fahrzeugId, vonAbschnittId, nachAbschnittId, kommentar?}), timestamp, undone boolean.
- JsonStaerkeLogEntry (Z.121-128): id, einsatzEinheitId, alteStaerke, neueStaerke, zeitpunkt, benutzer – ungenutzt.

Auffälligkeiten des Formats: doppelt kodiertes JSON (tacticalSignConfigJson, payloadJson) statt Objekte; Zeitstempel ISO-Strings der Client-Uhr ohne Zeitzonenkontext; keine Stärke-Historie; kein Benutzer/Client-Stempel auf Entitäten (nur in Bewegungen/commandLog); `version`-Felder ohne Verwendung; keine Löschmarker außer aufgeloest/entfernt (nie gesetzt); ein Einsatz je Datei, aber alle Entitäten tragen redundant einsatzId (Relikt der Multi-Einsatz-SQLite-Tabellen).

### SystemJsonFile `_system.json` (types.ts:193-200)
```
{ schemaVersion: 1,
  stammdatenEinheiten: JsonStammdatenEinheit[],   // nie befüllt
  benutzer: JsonBenutzer[],                        // {id, name, rolle, passwortHash 'scrypt$salt$hex', aktiv}
  activeClients: JsonActiveClient[],               // {clientId, computerName, ipAddress, dbPath, lastSeen, startedAt, isMaster(false)}
  einsatzListe: JsonEinsatzMeta[],                 // nie befüllt
  recordEditLocks: JsonRecordEditLock[] }          // {id, einsatzId, entityType, entityId, clientId, computerName, userName, acquiredAt, heartbeatAt, expiresAt}
```
Eine `_system.json` je Verzeichnis, geteilt von allen Einsätzen darin. Hochfrequente, flüchtige Daten (Präsenz, Sperren) liegen in derselben Datei wie langlebige (Benutzer) → jeder Heartbeat schreibt die Benutzerliste neu.

## 9. Risikoliste (mit Codebeleg; K = kritisch, H = hoch, M = mittel, N = niedrig)

| ID | Sev | Risiko | Beleg |
|---|---|---|---|
| R-DATA-1 | K | Lost Update by design: jeder Write überschreibt die Datei mit dem In-Memory-Snapshot des Prozesses; kein Re-Read/Compare; das RMW-Primitive mutateEinsatzFile ist ungenutzt | connection.ts:52-58; 15 `.save()`-Aufrufer (3c); einsatz-store.ts:25-36 ohne Aufrufer |
| R-DATA-2 | K | Fremde Änderungen werden nie geladen: Lesepfade nutzen ctx.einsatz; Reload nur bei Open/Create/Restore/Pfadwechsel; UDP+Polling refreshen den eigenen Snapshot | register-einsatz-ipc.ts:337-339,372-377,407-409; useEinsatzData.ts:46-63; openDatabaseWithRetry-Aufrufer |
| R-DATA-3 | H | Backup-Restore kopiert ungeschützt über die Live-Datei (kein Lock, kein tmp+rename, kein writeSeq) | backup.ts:59-62 |
| R-DATA-4 | H | Öffnen einer Nicht-JSON-Datei (z.B. echte Legacy-.sqlite) ersetzt sie durch ein leeres Skelett | connection.ts:24-31 |
| R-DATA-5 | M | Kein fsync vor rename; bei Stromausfall des Clients oder NAS-Cache-Verlust kann die Datei leer/alt sein (Verhalten SMB-abhängig) [teilweise unbelegt] | einsatz-store.ts:19-23; grep fsync leer |
| R-SYS-1 | H | readSystemFile liefert bei existsSync=false (auch bei transienten SMB-Fehlern) eine leere Systemdatei; nachfolgendes write (Heartbeat 5 s, Sperre, save) persistiert sie → Benutzer/Sperren/Präsenz weg | system-store.ts:16-21; clients.ts:139,164; record-lock.ts:60; connection.ts:57 |
| R-SYS-2 | H | ctx.save() schreibt ctx.system (Snapshot vom Öffnen) ohne Lock → löscht fremde Sperren/Präsenz | connection.ts:57 |
| R-SYS-3 | M | Präsenz-Heartbeat = lockfreies RMW der gesamten `_system.json` alle 5 s je Client → Rennen mit record-lock; Sperren können verschwinden oder doppelt vergeben werden | clients.ts:137-164 vs record-lock.ts:60-94 |
| R-LOCK-1 | H | Stale-Overwrite ohne O_EXCL: zwei Wartende überschreiben denselben alten Lock und halten ihn beide | file-lock.ts:25-28 |
| R-LOCK-2 | M | Stale-Erkennung vergleicht Schreiber-Uhr mit Leser-Uhr (10 s Fenster) | file-lock.ts:18,25 |
| R-LOCK-3 | M | Halter > 10 s (langsames SMB, große Datei) wird enteignet, schreibt aber fertig → zwei Schreiber | file-lock.ts:4,25 |
| R-LOCK-4 | M | unlink im finally löscht auch fremde Locks (nach Enteignung) | file-lock.ts:51-55,71-75 |
| R-LOCK-5 | M | Lock-Timeout 5 s wirft in den IPC-Handler; Änderung des Nutzers geht verloren, obwohl sie im ctx bereits mutiert ist → Speicher und Datei divergieren dauerhaft bis Neuöffnen | file-lock.ts:42-44,63-65; IPC-Handler mutieren vor save() |
| R-LOCK-6 | N | O_EXCL-Semantik der Lockdatei hängt von SMB-Server/-Client ab; keine Verifikation nach Erwerb (Re-Read des eigenen Inhalts) [unbelegt für Zielhardware] | file-lock.ts:20 |
| R-MAIN-1 | M | Synchrone Datei-I/O und Busy-Wait (Atomics.wait bis 5 s) im Main-Thread; jede SMB-Latenz friert alle IPC-Antworten/Fenster ein | file-lock.ts:38-47; alle *Sync-Aufrufe |
| R-MAIN-2 | N | scryptSync auf jedem Open-Pfad (ensureDefaultAdmin), ~50-100 ms Blockade | auth.ts:41-56; register-einsatz-helpers.ts:94 |
| R-SYNC-1 | M | UDP-Broadcast ohne Subnetz-Überschreitung/Firewall-Garantie; Fallback-Polling wirkungslos (R-DATA-2) | einsatz-sync.ts:8,201; useSyncEvents.ts:56-64 |
| R-SYNC-2 | N | Match über Dateinamen löst Refresh für fremde Einsätze aus | einsatz-sync.ts:82 |
| R-SYNC-3 | N | Zwei getrennte clientIds (Präsenz vs Sync) | clients.ts:37; einsatz-sync.ts:89 |
| R-SYNC-4 | N | Undo ist einsatzweit, nicht benutzer-/clientbezogen | command.ts:122-124 |
| R-OPS-1 | M | Backups unbegrenzt: 288/Tag/Einsatz, keine Rotation; bei 2 MB → ~0,6 GB/Tag | backup.ts:5-7,76-83 |
| R-OPS-2 | M | `_system.json` (Benutzer!) wird nicht gesichert | backup.ts:76-83 |
| R-OPS-3 | N | Default admin/admin; Rollen ohne Enforcement; README: automatische Anmeldung | auth.ts:45-56; register-ipc.ts:52-58; grep rolle |
| R-OPS-4 | N | Namensverwirrung `_system.s1control` (Platzhalter-Einsatz) vs `_system.json` (System); Fehlertext "Systemdatenbank (_system)" | einsatz-files.ts:14; connection.ts:15; register-einsatz-helpers.ts:98-100 |
| R-DEAD-1 | N | Totes Utility-Prozess-Gerüst (~1.000 Z.); Flag S1_DB_UTILITY_PROCESS=1 macht Sperren-IPC hart kaputt | main-db-bridge.ts:129-135; db-runtime.ts:1-2; register-entity-lock-ipc.ts:37-40 |
| R-DEAD-2 | N | Doku-Drift: README/AGENTS.md beschreiben SQLite/WAL/Pragmas/Transaktionen, die nicht mehr existieren; better-sqlite3/drizzle noch in dependencies/build | README.md "Datenhaltung / DB"; AGENTS.md §3; package.json |
| R-DOM-1 | M | moveEinheit verschiebt zugeordnete Fahrzeuge nicht mit | command.ts:41-42; fahrzeug.ts:38,92 |
| R-DOM-2 | N | Kein Audit-Trail für create/update/delete/split/archive (nur MOVE im commandLog); staerkeLog ungenutzt | command.ts; grep staerkeLog |
| R-DOM-3 | N | version-/writeSeq-Felder existieren, werden aber nie zur Konflikterkennung genutzt | abschnitt.ts:60; einheit.ts:147; fahrzeug.ts:98; connection.ts:54 |
| R-DOM-4 | N | Export zeigt Abschnitts-UUIDs statt Namen; Helfer/Fahrzeuge fehlen | export.ts:81,93,99 |
| R-DOM-5 | N | Helfer-anzahl und Einheiten-Stärke sind entkoppelt (keine Konsistenzprüfung) | helfer.ts, einheit.ts |
| R-UPD-1 | N | Peer-Download-Timeout 3 s für gesamten Transfer → LAN-Peer praktisch nie erfolgreich bei Installer-Größen | update-peer-transfer.ts:8,33 |

## 10. Übernehmen / neu machen / weglassen (Empfehlung für v2, unabhängig vom Stack)

### Übernehmen (fachlich tragfähig, möglichst 1:1 portieren, ggf. nach Rust/TS-Core)
- Domänenmodell und Vokabular aus json-store/types.ts + shared/types.ts: Einsatz, Abschnitt-Baum (systemTyp FUEST/ANFAHRT/LOGISTIK/BEREITSTELLUNGSRAUM/NORMAL), Einheit (inkl. EEB-Felder OV/RB/LV, Erreichbarkeiten, Vegetarier), Fahrzeug (Funkrufname, stanKonform, Sondergerät, Nutzlast), Helfer (Rolle/Geschlecht/Anzahl), Bewegungen, Organisation-Whitelist.
- Validierungen: Abschnitt-Zyklusprüfung (validations.ts:12-35), taktische Stärke F/UF/M/G mit Summenprüfung (tactical-strength.ts), Split-Regeln (einheit.ts:151-233), Archiv-Schreibschutz (einsatz-transaction-guards.ts:31-38).
- Zeichen-Inferenz komplett: THW-Kurzzeichen-Tabelle und Komposita (tactical-sign-aliases.ts, thw-shortcodes.ts), Scoring/Schwellen, meta{source, confidence, ruleVersion}, Manuell-schlägt-Auto-Regel (tactical-sign-config.ts). Mapping auf taktische-zeichen-core (Org→Id, Farben, Legacy-typ).
- STAN-Daten und -Pipeline: thw-stan-2025.generated.json (47 Einträge) + scripts/extract-thw-stan-from-zip.cjs + validate, Inferenz mit Heuristik-Fallbacks.
- Export-Struktur als Idee (ZIP mit Rohdatei + HTML + CSV), aber mit Namen statt IDs und vollständigen Tabellen.
- Auth-Hashing (scrypt-Format) falls Benutzerkonzept bleibt.
- Versionsvergleich für Datums-Buildnummern (updater-versioning.ts) falls Updater bleibt.
- Testideen: reine Domänenfunktionen auf einem ctx-Objekt; Behavior-Tests (Einsatzfluss, Abschnitt bearbeiten, Basisdaten); Wire-Kompatibilitätstests (einsatz-sync.test.ts, update-peer-protocol.test.ts); Fileshare-Engpass als Szenario – in v2 zwingend erweitert um "zwei Prozesse, eine Datei".
- Architekturregeln aus AGENTS.md §1-2, §4 (Renderer ohne I/O, Main einzige I/O-Schicht, Master nur Housekeeping, Broadcast-Ausfall darf nichts brechen) – die Regeln sind richtig, die Implementierung erfüllt sie nicht.
- IPC-Schnitt: schmale, typisierte Kanäle mit wrap/Fehlerkodierung (register-ipc.ts) und Preload ohne Logik.

### Neu machen (Kernproblem des Fileshare-Betriebs)
- Persistenz- und Nebenläufigkeitsmodell vollständig neu. Mindestanforderungen: (a) jeder Write liest den aktuellen Dateistand oder arbeitet append-only, (b) Konflikterkennung (writeSeq/Version-CAS oder Ereignis-Log je Client), (c) Leser sehen fremde Änderungen ohne Neuöffnen (mtime/writeSeq-Watch oder Log-Tail), (d) flüchtige Daten (Präsenz, Sperren) getrennt von Stammdaten und Fachdaten, idealerweise je Client eigene Datei statt geteilter RMW-Datei, (e) atomare, verifizierte Schreibvorgänge (tmp+fsync+rename, danach Re-Read/Größenprüfung), (f) alle I/O außerhalb des UI-/Main-Threads.
- Datei-Lock: entweder ganz vermeiden (append-only, ein Schreiber je Datei) oder mit O_EXCL-only, Halter-Prüfung beim Freigeben, Fencing-Token, konservativem Stale-Fenster und Uhren-unabhängiger Logik.
- Sync-Signal: bleibt UDP als Beschleuniger, aber der Wahrheitsanker muss der Dateistand sein (Poll von mtime/Seq, nicht des eigenen Speichers).
- Backup: Rotation/Retention, `_system` einschließen, Restore atomar und mit Sperre/Seq-Bump.
- Bewegungen/Logs: als eigenes, append-only Journal statt Array in der Hauptdatei; daraus Undo, Audit und Stärkeverlauf ableiten.
- Fahrzeug-Mitnahme bei Einheitenverschiebung, Audit-Trail für alle Mutationen, Undo pro Benutzer/Client.
- Systemdatei-Konzept: Benutzer/Stammdaten getrennt von Präsenz/Sperren; Klarnamen (`system.json`, `presence/<clientId>.json`, `locks/…`).
- Autorisierung nach Rolle, falls Rollen bleiben; sonst Rollen streichen.

### Weglassen
- Utility-Prozess-Gerüst (main-db-bridge, shared/db-runtime, db-runtime-Stub, alle dbBridge-Zweige) und EinsatzReadCache.
- better-sqlite3/drizzle/drizzle-Migrationen/rebuild:native aus package.json und Build, Legacy-.sqlite-Öffnen (funktioniert ohnehin nicht mehr, R-DATA-4).
- LAN-Peer-Update (796 Z. + Peer-Flow 123 Z.); ggf. auch den dreifachen GitHub-Fallback auf einen Pfad reduzieren. Für den Einsatzfall reicht: Version anzeigen, Release-Seite öffnen, Installer per Share/USB.
- Debug-Sync-Log-Forwarding in den Renderer (debug.ts/diagnostics.ts) durch normales Logging ersetzen.
- Duplizierte normalizeText/tokenize (catalog.ts, scoring.ts, thw-shortcodes.ts, thw-stan-inference.ts) zusammenführen.
- Doppelt kodierte JSON-Strings (tacticalSignConfigJson, payloadJson) im Dateiformat.
- Stärke-Monitor-Prewarm-Akrobatik (Timer, Splash, Diagnose-Flag), falls das Fenster in v2 schlicht ein zweites Fenster/Route ist.

### Bewertung gegen die Randbedingung "Fileshare, mehrere Clients, kein Server"
Der heutige Main-Prozess erfüllt diese Randbedingung nicht: Die Mechanismen für Mehrbenutzerbetrieb sind vorhanden (Präsenz, Master, Sperren, UDP, Polling, Lock, Backup), aber die zentrale Datenschicht (DbContext-Snapshot + save()) macht sie wirkungslos und erzeugt Lost Updates. Das ist kein Feinschliff-Thema, sondern ein Modellfehler, der beim Umstieg von SQLite auf JSON (Mai/Juni 2026) entstanden ist. Die Fachlogik darüber ist davon unabhängig und sauber genug, um sie in ein neues Persistenzmodell zu heben – gleich ob Electron/Node oder Tauri/Rust. Für die Stack-Entscheidung relevant: Die SMB-spezifischen Probleme (Lock-Atomarität, fsync, Latenz im UI-Thread, Uhrenabweichung) sind sprachunabhängig; ein Rust-Kern nimmt die I/O zuverlässig vom UI-Thread und macht O_EXCL/fsync/Verify explizit, löst aber das Konsistenzmodell nicht von selbst. rusqlite auf SMB würde die ursprünglichen SQLite-auf-SMB-Probleme (Commits 0ca506a bis cd33747) wieder einführen; SQLite-Dokumentation rät von Netzwerkdateisystemen für gleichzeitigen Zugriff ab [unbelegt, aus eigenem Wissen].

## 11. Offene Fragen
- Ist der Lost-Update-Pfad (R-DATA-1/2) im realen Betrieb bereits aufgefallen, oder lief S1-Control seit Juni 2026 faktisch nur mit einem schreibenden Client? (Nicht mit zwei Prozessen nachgestellt; Kette nur aus dem Code abgeleitet.)
- Welche NAS/SMB-Implementierung (Synology/QNAP/Windows-Server/macOS-Client) ist im Einsatznetz? Davon hängen O_EXCL-Atomarität, rename-Semantik und mtime-Auflösung ab.
- Gibt es Client-Uhrensynchronisation im Einsatznetz (NTP)? Alle Stale-/TTL-Mechanismen vergleichen fremde Zeitstempel.
- Sollen Rollen (ADMIN/S1/FUE_ASS/VIEWER) fachlich etwas bedeuten? Aktuell nirgends durchgesetzt; README spricht von automatischer Anmeldung.
- Ist der LAN-Peer-Updater eine harte Anforderung oder ein Experiment? Im Code standardmäßig deaktiviert.
- Wie groß sind reale Einsätze (Einheiten/Fahrzeuge/Helfer/Bewegungen), um die O(Dateigröße)-Schreibkosten und die Backup-Menge einzuordnen?
- Uncommitted Änderungen im Working Tree (Einsatz-Basisdaten bearbeiten, 14 Dateien, +517/-189) wurden nur oberflächlich berücksichtigt; ob sie das Schreibmodell berühren, wurde nicht geprüft (Diff nicht gelesen).
- Legacy-.sqlite-Dateien: existieren noch produktive Alt-Dateien, die migriert werden müssten? Der aktuelle Code kann sie nicht lesen und würde sie beim Öffnen überschreiben (R-DATA-4).
