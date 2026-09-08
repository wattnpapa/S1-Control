# NAS-Speicher-Recherche: Dateibasierte Mehrbenutzer-Datenhaltung auf SMB/NFS ohne Serverprozess

Status: ABGESCHLOSSEN (2026-09-06)

## Gliederung
0. Ist-Stand S1-Control (Befund aus dem Repo)
1. Belegte Aussagen zu SMB-/NFS-Verhalten (mit Quellen)
2. Option A: SQLite auf dem Share
3. Option B: JSON-Dokument + Lockfile (Ist-Stand)
4. Option C: Append-only Ereignisprotokoll, ein Schreiber je Datei
5. Option D: CRDT-Dokument mit Datei-Austausch
6. Option E: Lokale SQLite je Client + Austausch über C/D
7. Option F: Sonstiges / Feldprodukte
8. Querschnitt: Änderungsbenachrichtigung, Uhrzeit/HLC, NAS-Ausfall/Offline, Backup/Archiv/Revision
9. Bewertungsmatrix
10. Empfehlung + 5 größte Restrisiken
11. Dateilayout-Skizze
12. Offene Fragen


## 0. Ist-Stand S1-Control (Befund aus dem Repo, Stand main @ bcf15c6)

### 0.1 Chronologie SQLite → JSON (git log)
- `8199070 feat(einsatz-db): separate per-einsatz sqlite with auto backup and restore` – eine SQLite-Datei je Einsatz auf dem Share.
- 2026-02-28: drei Commits `23df61d Fixe SMB Datenbankzugriff`, `c9f312d Fix einsatz metadata on SMB share`, `4a098e7 Behebe SMB Share Datenbankzugriff` (keine Commit-Bodies, Symptome nicht dokumentiert).
- 2026-03-02 `0ca506a fix(db): use network-safe sqlite pragmas on SMB shares`: Diff in `src/main/db/connection.ts` schaltet für Pfade `/Volumes/...` und `\\...` um auf `journal_mode = DELETE`, `synchronous = FULL`, `busy_timeout = 10000`; Kommentar im Code: „WAL is not reliable across many SMB/NAS setups with multiple hosts." `openDatabaseWithRetry` Retries von 4 auf 12 erhöht, Fehlerklassen `SQLITE_BUSY`, `SQLITE_LOCKED`, `database is locked`, `unable to open database file`.
- 2026-03-02 `70e5060 default to network-safe sqlite mode`, `b7bc562 increase sqlite open timeout for SMB lock contention`, `c6a1668 swallow transient sqlite lock errors in heartbeat`.
- 2026-03-03 `6f5d13b Handle malformed sqlite errors gracefully in client presence` – Hinweis auf `SQLITE_CORRUPT`/„malformed" im Betrieb (Commit-Body fehlt; Interpretation, nicht Beleg).
- 2026-03-07 `cd33747 perf(fileshare): reduce sqlite contention and batch abschnitt reads`, `bfe0970 test(behavior): cover fileshare bottleneck regressions`.
- 2026-03-08 `a1e1d8e refactor(db-runtime): delegate write, lock and housekeeping ops` (Utility-Prozess-Auslagerung, siehe TODO.md).
- 2026-05-31/06-01: `c895599`, `f67b97c`, `58b37e0`, `f0a5fec feat(json-store): complete SQLite removal`, `431eee2`, `4abf2b8`, `bf24667`. Commit-Body f0a5fec: „Zero Drizzle/SQLite imports remain in src/", `backup: use fs.copyFileSync instead of sqlite backup API`.
- README.md ist veraltet: beschreibt weiterhin „SQLite (WAL + busy timeout)", „Mehrere Clients können dieselbe Einsatzdatei auf einem Share nutzen (WAL-Modus)" und Pragmas `journal_mode=WAL`; AGENTS.md Abschnitt 3 ebenfalls („DB-Open muss immer diese Pragmas setzen: journal_mode=WAL"). Beide Dokumente widersprechen dem Code (kein SQLite mehr).

### 0.2 Aktuelle Speicherschicht (JSON + Lockfile)
- `src/main/json-store/einsatz-store.ts:19-23`: `writeEinsatzFile` schreibt `<datei>.tmp` mit `fs.writeFileSync` und benennt per `fs.renameSync` um. **Kein `fsync`** (weder auf die Datei noch auf das Verzeichnis).
- `einsatz-store.ts:25-36`: `mutateEinsatzFile` = `withFileLock` → **Read-Modify-Write der ganzen Datei**, `writeSeq` wird inkrementiert, aber nirgends gegen den vom Client zuletzt gelesenen Stand geprüft (kein optimistic concurrency; Lost Update nur durch das Lockfile verhindert).
- `src/main/json-store/file-lock.ts:17-35`: Lockfile `<datei>.lock` via `fs.writeFileSync(lockFile, …, { flag: 'wx' })` (O_CREAT|O_EXCL). Inhalt `{pid, acquiredAt}` mit **Client-lokaler Uhr**. Stale-Übernahme nach `LOCK_STALE_MS = 10_000` durch **unbedingtes Überschreiben** (`writeFileSync` ohne `wx`, Zeile 27) – zwei Clients können denselben stalen Lock gleichzeitig übernehmen (kein Rename-basiertes „steal", kein Vergleich nach dem Überschreiben). Retry 50 ms, Timeout `LOCK_TIMEOUT_MS = 5_000` → `Error('Lock timeout …')`. Stale-Erkennung vergleicht `Date.now()` des Übernehmers mit `acquiredAt` des Inhabers → falsche Uhren (kein NTP) führen zu Fehlübernahmen oder Nie-Übernahmen.
- `file-lock.ts:38-57`: `withFileLockSync` blockiert den Electron-Main-Thread per `Atomics.wait` (bis 5 s).
- `src/main/json-store/system-store.ts`: `_system.s1control` (Benutzer, `activeClients`, `einsatzListe`, `recordEditLocks`) ebenfalls Read-Modify-Write ganzer Datei.
- `src/main/services/clients.ts:126-170`: Heartbeat alle 5 s schreibt `_system` **ohne Lock** („Lockfrei: Heartbeat ist idempotent") – Read-Modify-Write ohne Lock auf derselben Datei, in der `record-lock.ts` mit Lock die Bearbeitungssperren hält → **Heartbeat kann Bearbeitungssperren und Benutzer anderer Clients überschreiben** (Lost Update auf `_system`). Master-Wahl = ältester `startedAt` (Client-Uhr).
- `src/main/services/record-lock.ts:8`: Datensatz-Bearbeitungssperren TTL 45 s, Ablauf per ISO-String-Vergleich mit Client-Uhren.
- `src/main/services/einsatz-sync.ts:7-8, 118-129, 201`: UDP-Broadcast an `255.255.255.255:41235`, `reuseAddr: true`, `setBroadcast(true)`, Throttle 200 ms; Nachricht enthält `einsatzId`, `dbPath`, `sourceClientId`, `changedAt`, `reason` – reines Signal „bitte neu laden", keine Daten. Kommentar in AGENTS.md §4: „Polling-Fallback intakt halten".
- `src/main/services/backup.ts:76-86`: Backup = `fs.copyFileSync` der JSON-Datei alle 5 min durch den Master nach `<dir>/backup/`; keine Konsistenzprüfung; `restoreBackup` kopiert zurück (Zeile 61) ohne Lock.
- `src/main/services/einsatz-read-cache.ts:4`: Lese-Cache TTL 1,5 s; d.h. jeder Lesezugriff nach Ablauf liest die komplette JSON-Datei erneut vom Share.
- Datenmodell (`json-store/types.ts`): Einsatz, Abschnitte, Einheiten, Fahrzeuge, Helfer, Bewegungen, `commandLog` (Undo), `staerkeLog` in **einer** Datei; Entitäten tragen `version: number` (Abschnitt, Einheit, Fahrzeug), aber Prüfung erfolgt nur lokal.

### 0.3 Referenz-Stack bmecatEditor
- `/Users/johannes/Developer/bmecatEditor/Cargo.toml`: Workspace mit `crates/bmecat-core` und `src-tauri`.
- `crates/bmecat-core/Cargo.toml:11`: `rusqlite = { version = "0.40", features = ["bundled", "functions"] }`; `src-tauri/Cargo.toml:24`: `tauri = "2"`, `tauri-plugin-dialog`, `tauri-plugin-opener`.
- Dort ist SQLite eine **lokale** Einzelbenutzer-DB (Katalog-Import), also nicht mit dem Share-Szenario vergleichbar.

## 1. Belegte Aussagen zu SMB-/NFS-/SQLite-Verhalten (Quellen)

### 1.1 SQLite offizielle Dokumentation
- https://www.sqlite.org/howtocorrupt.html §2.1: „SQLite depends on the underlying filesystem to do locking as the documentation says it will. But some filesystems contain bugs in their locking logic … This is especially true of network filesystems and NFS in particular. If SQLite is used on a filesystem where the locking primitives contain bugs, and if two or more threads or processes try to access the same database at the same time, then database corruption might result."
- howtocorrupt §2.4: alle Verbindungen müssen dasselbe Locking-Protokoll (z.B. dot-file VFS) verwenden, sonst „possibly leading to database corruption".
- howtocorrupt §2.5: „unlinking or renaming an open database file results in behavior that is undefined" → relevant für Backup/Restore per Kopie/Rename (siehe backup.ts:61).
- https://www.sqlite.org/lockingv3.html: „POSIX advisory locking is known to be buggy or even unimplemented on many NFS implementations (including recent versions of Mac OS X) and … there are reports of locking problems for network filesystems under Windows. **Your best defense is to not use SQLite for files on a network filesystem.**"
- https://www.sqlite.org/wal.html: „All processes using a database must be on the same host computer; WAL does not work over a network filesystem." Begründung: wal-index im Shared Memory (§2.2). §8: WAL ohne Shared Memory nur mit `locking_mode=EXCLUSIVE`, d.h. genau ein Prozess.
- https://www.sqlite.org/faq.html (5): „this locking mechanism might not work correctly if the database file is kept on an NFS filesystem … People who have a lot of experience with Windows tell me that file locking of network files is very buggy and is not dependable. If what they say is true, sharing an SQLite database between two or more Windows machines might cause unexpected problems."
- SQLite-Forum „Locking issues on multi user database" (https://sqlite.org/forum/info/a6675453ecd9af62d13d55fb38562a2e93c434c57f7994b34a4fae91506a3214): Anwenderbericht – bei mehreren Nutzern auf einem Share treten „database is locked" und „database disk image is malformed" auf, selbst bei minimaler Last. Mailinglisten-Thread „Lock problem opening a Sqlite db on a Samba/CIFS shared disk" (sqlite-users, narkive): Empfehlung, Oplocks serverseitig abzuschalten; Hinweis, dass SMB1/2/2.1-Implementierungen auch ohne Oplocks fehleranfällig seien (Community-Aussage, kein offizieller Beleg).

### 1.2 SMB-Client-Caching (Microsoft)
- „SMB2 Client Redirector Caches Explained" (https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-7/ff686200(v=ws.10)): drei Metadaten-Caches im Windows-SMB-Client: **FileInfoCacheLifetime 10 s**, **FileNotFoundCacheLifetime 5 s**, **DirectoryCacheLifetime 10 s** (Registry `HKLM\System\CurrentControlSet\Services\Lanmanworkstation\Parameters`). Wörtlich: „Applications which require a high level of file information consistency across clients which may utilize creation or changing of a file as a notification mechanism to other nodes may encounter delays or consistency issues with these default values." Und zum Directory Cache: „This cache is likely to affect distributed applications running on multiple computers accessing a set of files on a server – where the applications use an out of band mechanism to signal each other about modification/addition/deletion of files on the server."
  → Konsequenz für S1: `fs.statSync(...).mtimeMs` / `readdirSync` auf einem Windows-Client kann bis zu 10 s alte Werte liefern; „Datei existiert nicht" kann 5 s lang falsch sein (relevant für Lockfile-Erkennung und für neu angelegte Event-Dateien anderer Clients). Ein UDP-Signal „bitte neu lesen" kann daher **vor** der Sichtbarkeit der Änderung eintreffen.
- „Client caching features: Oplock vs. Lease" (https://learn.microsoft.com/en-us/archive/blogs/openspecification/client-caching-features-oplock-vs-lease): Oplocks/Leases erlauben dem Client, „buffer data for writing locally … if the client is notified there are no other processes accessing data"; bei konkurrierendem Öffnen sendet der Server einen Oplock/Lease-Break, den der Client bestätigen muss, bevor der Server fortfährt. Lease-Typen R, RW, RH, RWH; Write-Caching-Lease ist exklusiv für einen Client. → Solange nur ein Client eine Datei geöffnet hat, dürfen Schreibvorgänge clientseitig gepuffert sein; erst ein Break (durch das Öffnen eines zweiten Clients) oder Flush/Close erzwingt das Zurückschreiben. Für Byte-Range-Locks gilt: „WRITE caching permits the SMB2 client to cache writes and byte-range locks" ([MS-SMB2] Leasing, https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-smb2/d8df943d-6ad7-4b30-9f58-96ae90fc6204) – d.h. auch **Locks** können clientseitig gehalten werden, bis ein Break kommt.
- Oplocks lassen sich unter SMB2+ **nicht** mehr clientseitig abschalten (KB 296264 „Configuring opportunistic locking in Windows", https://support.microsoft.com/en-us/help/296264; Q&A https://learn.microsoft.com/en-us/answers/questions/2426577/opportunistic-locking-question: Registry-Schlüssel gelten nur für SMB1). Microsofts eigene Jet/Access-Datenbanken galten auf Shares mit Oplocks als korruptionsgefährdet (gleiche KB) – historischer Präzedenzfall für „Datei-DB auf Share".

### 1.3 Linux-CIFS-Client (mount.cifs(8), https://man7.org/linux/man-pages/man8/mount.cifs.8.html)
- `cache=none`: Client geht immer direkt zum Server; `cache=strict` (Default): folgt dem Protokoll, prüft ohne Oplock periodisch Attribute; „When multiple clients are accessing the same set of files, then cache=strict is recommended."
- `nobrl`: sendet keine Byte-Range-Lock-Anfragen an den Server – „necessary for certain applications that break with cifs style mandatory byte range locks"; `nolease`: keine Oplocks/Leases anfordern. Hinweis im Man-Page-Kontext: Windows-Locks sind **mandatory** und können Reads/Writes anderer blockieren.
- Bedeutung: Auf Linux hängt SQLite-Locking über CIFS von Mount-Optionen ab, die der Anwender setzt – nicht kontrollierbar durch die App.

### 1.4 POSIX-Primitiven über Netz (open(2), https://man7.org/linux/man-pages/man2/open.2.html)
- „O_APPEND may lead to corrupted files on NFS filesystems if more than one process appends data to a file at once. This is because NFS does not support appending to a file, so the client kernel has to simulate it, which can't be done without a race condition." → **Append mit mehreren Schreibern pro Datei ist über Netz ausgeschlossen**; „ein Schreiber pro Datei" (Option C) umgeht genau dieses Problem.
- „On NFS, O_EXCL is supported only when using NFSv3 or later on kernel 2.6 or later. In NFS environments where O_EXCL support is not provided, programs that rely on it for performing locking tasks will contain a race condition." Workaround laut Man-Page: eindeutige Datei anlegen und per `link(2)` verknüpfen (link ist atomar, auch über NFS). Für SMB: Der SMB2-CREATE mit Disposition FILE_CREATE wird serverseitig atomar entschieden (SMB ist zustandsbehaftet) – O_EXCL wird 1:1 auf SMB2 CREATE(FILE_CREATE) abgebildet [unbelegt, Protokollwissen; MS-SMB2 2.2.13 CreateDisposition].
- Rename: Samba/SMB-Rename innerhalb desselben Shares = serverseitiger `rename()`, atomar (comp.protocols.smb-Thread, Community). Windows: `MoveFileEx(MOVEFILE_REPLACE_EXISTING)` ist nicht dokumentiert atomar; auf SMB wird es als SMB2 SET_INFO/FileRenameInformation mit ReplaceIfExists ausgeführt und vom Server-Dateisystem entschieden [unbelegt für die Atomaritätszusage]. Node `fs.renameSync` nutzt unter Windows `MoveFileExW(..., MOVEFILE_REPLACE_EXISTING)` (libuv) [unbelegt, aus libuv-Quelltextkenntnis]. Praktisch relevant: Ein Rename scheitert unter Windows mit EPERM/EBUSY, wenn ein anderer Client die Zieldatei ohne FILE_SHARE_DELETE offen hält – bei JSON-Ganzdatei-Ersatz (Option B) ein realistischer Fehlerfall, wenn ein zweiter Client gerade liest.

### 1.5 Datei-Watcher über Netz
- Node.js `fs.watch()` (https://nodejs.org/api/fs.html, „Availability"): „On some filesystems (notably NFS and SMB), file change events may not be reliable"; `fs.watchFile()` ist Polling und laut Doku ressourcenintensiv.
- Rust `notify` 8.2.0 (https://docs.rs/notify/latest/notify/, „Known Problems"): „Network mounted filesystems like NFS may not emit any events"; Ausweg `PollWatcher` (optional `compare_contents`).
- Microsoft (Redirector-Caches-Artikel) verweist auf `ReadDirectoryChangesW`/`FindFirstChangeNotification` – SMB2 CHANGE_NOTIFY funktioniert grundsätzlich über das Netz, aber nur, wenn der Server es implementiert; auf NAS-Geräten (Samba) ist `kernel change notify` konfigurationsabhängig [unbelegt für konkrete NAS-Modelle].
- Konsequenz: **Polling** (mtime/size/Verzeichnisliste) ist die einzige portable Basis; Watcher nur als Beschleuniger.

### 1.6 Linux-CIFS Details (wörtlich, mount.cifs(8))
- `cache=`: „none – do not cache file data at all; strict – follow the CIFS/SMB2 protocol strictly; loose – allow loose caching semantics. … As of kernel 3.7 the default is strict." „when multiple clients are accessing the same set of files, then cache=strict is recommended."
- `actimeo=`: „The time (in seconds) that the CIFS client caches attributes of a file or directory before it requests attribute information from a server. During this period the changes that occur on the server remain undetected until the client checks the server again. By default, the attribute cache timeout is set to 1 second."
- `nobrl`: „Do not send byte range lock requests to the server. This is necessary for certain applications that break with cifs style mandatory byte range locks (and most cifs servers do not yet support requesting advisory byte range locks)."
- „The cifs client uses the kernel's pagecache to cache file data. Any I/O that's done through the pagecache is generally page-aligned. This can be problematic when combined with byte-range locks as Windows' locking is mandatory and can block reads and writes from occurring." → SQLites Byte-Range-Locks (POSIX advisory auf dem Client) werden über CIFS zu **mandatory** SMB-Locks; Reads anderer Clients auf gesperrte Bereiche schlagen fehl statt zu warten – eine Quelle für „database is locked"/I/O-Fehler statt sauberem Busy-Handling.

### 1.7 macOS-SMB-Client
- Apple Support „Disable local SMB directory enumeration caching" (https://support.apple.com/en-us/101918): „When you use an SMB 2 or SMB 3 connection, local caching is enabled by default. You might want to turn off local caching if content on the server changes frequently, or the Finder sometimes shows only a partial list of the contents of a share or folder for a few seconds." Abhilfe: `/etc/nsmb.conf` `[default] dir_cache_max_cnt=0` bzw. `dir_cache_off=yes`; wirkt erst nach Neu-Mount. → Auf macOS ist Verzeichnis-Enumeration ebenfalls gecacht; eine App kann das nicht selbst ändern (Root-Konfiguration).
- SQLite lockingv3 nennt ausdrücklich „recent versions of Mac OS X" bei fehlerhaften/unimplementierten NFS-Locks (siehe 1.1).

### 1.8 Verhalten bei NAS-Ausfall (Windows-Client)
- „SMB 2.x and SMB 3.0 Timeouts in Windows" (https://learn.microsoft.com/en-us/archive/blogs/openspecification/smb-2-x-and-smb-3-0-timeouts-in-windows): Request Expiration Timer = `SessTimeout`, Default 60 s; bleibt eine Antwort aus, setzt der Client die Verbindung zurück; „For applications which doesn't retry on SMB connection reset, IO errors are seen." → Ein synchroner `readFileSync`/`writeFileSync` (heutiger Main-Prozess-Code) kann bis zu 60 s blockieren, bevor ein Fehler kommt; Electron-Main-Thread steht dann.
- Durable Handles ([MS-SMB2] SMB2_CREATE_DURABLE_HANDLE_REQUEST_V2, https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-smb2/33e6800a-adf5-4221-af27-7e089b9e81d1): Server hält Handle nach Verbindungsverlust standardmäßig 60 s (Win8/2012) – erleichtert transparente Wiederverbindung, ersetzt aber keine Anwendungslogik für Offline-Betrieb. Synology DSM bietet „SMB durable handles" als Schalter (https://kb.synology.com/en-br/DSM/help/SMBService/smbservice_smb_settings?version=7); ebenso „Enable Opportunistic Locking"/„SMB2 lease" – bei aktivierter Transportverschlüsselung wird Oplocking dort deaktiviert.

### 1.9 Dauerhaftigkeit von Schreibvorgängen über SMB
- [MS-SMB2] SMB2 FLUSH Request (https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-smb2/e494678b-b1fc-44a0-b86e-8195acf74ad7): „sent by a client to request that a server flush all cached file information for a specified open of a file to the persistent store that backs the file." Server-Seite (Receiving an SMB2 FLUSH Request): muss den Object Store zum Flush auffordern und blockiert bis zum Abschluss. → `fsync()`/`File::sync_all()`/`FlushFileBuffers` hat über SMB eine definierte Bedeutung (Client-Cache leeren + Server-Flush). Ohne fsync (heute in `writeEinsatzFile`) darf der Client Schreibdaten unter einer Write-Lease lokal halten; ein Client-Absturz oder Netzabbruch vor Break/Close kann den Inhalt der `.tmp` verlieren, und `rename` kann eine leere/kurze Datei sichtbar machen [Ableitung aus 1.2; kein direkter Beleg für konkrete SMB-Client-Implementierung].

### 1.10 Änderungsbenachrichtigung über UDP-Broadcast im LAN
- 255.255.255.255 („limited broadcast") wird nie geroutet; bei mehreren Adaptern senden BSD-abgeleitete Stacks historisch nur über das „primary interface" (LKML-Thread „255.255.255.255 won't broadcast to multiple NICs", https://lkml.iu.edu/hypermail/linux/kernel/0011.0/0367.html; Windows-Verhalten analog dokumentiert in https://support.microsoft.com/en-us/topic/how-multiple-adapters-on-the-same-network-are-expected-to-behave-e21cb201-2ae1-462a-1f47-1f2307a4d47a [Kernaussage: ein Adapter gewinnt]). Ein Laptop mit LAN + WLAN + VPN/Hotspot-Adapter kann daher in das „falsche" Netz broadcasten.
- WLAN „Client Isolation" (Cisco Meraki: https://documentation.meraki.com/Wireless/Operate_and_Maintain/How_Tos/Firewall_and_Traffic_Shaping/Wireless_Client_Isolation; UniFi: https://help.ui.com/hc/en-us/articles/18965560820247): „broadcast or unicast traffic sourced from the wireless client will not be sent to the other wireless clients on the SSID" – in Einsatz-WLANs (Gäste-/Hotspot-Profile) fällt UDP-Broadcast dann komplett aus, während SMB zum NAS weiter funktioniert.
- Windows Defender Firewall blockiert eingehende Verbindungen standardmäßig; beim ersten `bind()` einer App erscheint ein Freigabedialog; wird er verneint (oder läuft die App ohne Admin-Rechte in einem Domänenprofil), empfängt der Client keine Broadcasts [unbelegt, allgemeines Windows-Wissen].
- → Broadcast ist ein **Beschleuniger**, nie die Wahrheit; Datei-Polling muss immer die Grundlage bleiben (deckt sich mit AGENTS.md §4 „Polling-Fallback intakt halten").

### 1.11 Weitere Belege (Rust-Std, Samba, HLC, CRDT-Crates, Feldprodukte)
- Rust `std::fs::OpenOptions::create_new` (https://doc.rust-lang.org/std/fs/struct.OpenOptions.html): „This option is useful because it is atomic. Otherwise between checking whether a file exists and creating a new one, the file may have been created by another process (a TOCTOU race condition)." – entspricht Node `flag: 'wx'`; die Atomarität hängt aber über Netz von der Server-Implementierung ab (siehe 1.4 NFS).
- Rust `OpenOptions::append`: „Append mode guarantees that writes will be positioned at the current end of file, even when there are other processes or threads appending to the same file. … Keep in mind that this does not necessarily guarantee that data appended by different processes or threads does not interleave." → Selbst lokal ist Multi-Writer-Append nicht sicher; über NFS/SMB erst recht nicht (1.4). Ein Schreiber je Datei ist der einzige belastbare Weg.
- Samba3-HOWTO Kap. 16 „File and Record Locking" (https://stuff.mit.edu/afs/sipb/project/samba/OldFiles/swat/help/Samba3-HOWTO/locking.html): „oplocks should always be disabled if you are sharing a database file (e.g., Microsoft Access) between multiple clients, because any break the first client receives will affect synchronization of the entire file". Zum Netzausfall: wenn ein Client wegen Oplocks lokal gepuffert hat und die TCP-Verbindung abreißt, „the work from the prior session is lost. When the file server recovers, an oplock break is not sent to the client." Samba-Option `veto oplock files` erlaubt es, Oplocks für bestimmte Dateimuster (z.B. `*.s1control`) auszuschalten – auf NAS-Geräten nur per Admin-Konfiguration.
- HLC-Paper Kulkarni/Demirbas et al., „Logical Physical Clocks and Consistent Snapshots in Globally Distributed Databases" (https://cse.buffalo.edu/tech-reports/2014-04.pdf), Abstract: „HLC captures the causality relationship like logical clocks … HLC can be used in lieu of physical/NTP clocks since it maintains its logical clock to be always close to the NTP clock. Moreover HLC fits in to 64 bits NTP timestamp format, and is masking tolerant to NTP kinks and uncertainties." Rust-Crate `uhlc` 0.9.0 (https://docs.rs/uhlc/latest/uhlc/, atolab/Eclipse-zenoh-Umfeld): NTP64-Zeit + eindeutige ID; `update_with_timestamp()` liefert `ExceedingDeltaError`, wenn ein empfangener Zeitstempel die Uhr zu weit vorziehen würde (Schutz gegen völlig falsche Fremduhren).
- CRDT-Crates (docs.rs, Stand 2026-09-06): `automerge` 0.11.0 – JSON-artige CRDT, `save()/load()`, `get_changes()/apply_changes()`, Sync-Protokoll; Konflikt bei gleichzeitigem Setzen desselben Schlüssels „random but deterministic", alle Kandidaten über `get_all()`; **kein Undo-API auf Crate-Ebene**. `loro` 1.16.0 – Container Map/List/MovableList/Text/**Tree** (Knoten verschieben!)/Counter; Export `Snapshot`, `Updates` (ab Version Vector), `ShallowSnapshot` (GC); `UndoManager` „reverts only the local peer's operations"; Frontiers/Checkout für Time-Travel. `yrs` 0.27.4 – Yjs-kompatibel, Map/Array/Text/Xml, State-Vector-Updates V1/V2, `UndoManager` mit Origin-Filter; **kein Tree-/Move-Typ**. Loro gibt an, Dokumente 2–5× kleiner als Yjs/Automerge zu kodieren (https://loro.dev/docs/performance; Herstellerangabe).
- Feldprodukte: **Fireboard** (https://fireboard.net/produkte/module/grundsystem/): „Mehrere Fireboard Arbeitsplätze lassen sich einfach miteinander verbinden, um gemeinsam an einem Einsatz zu arbeiten (Mehrplatzfähigkeit)"; Startseite bezeichnet Fireboard als „Cloudbasierte Lösung"; Hilfe: „nach der Synchronisation können Ihre Arbeitsplätze vom Netz getrennt werden und können offline Einsätze abarbeiten" (Suchtreffer login.fireboard.net/help). Technische Details des Sync (Server- vs. Peer-Modell) sind öffentlich nicht dokumentiert → Vermutung: Server-/Portal-zentriert mit Client-Cache. **CommandX** (Eurocommand, https://www.eurocommand.com/produkte/commandx): „Als webbasierte Softwareanwendung"; „Als Software-on-Premises-Lösung … auf Ihren eigenen Servern"; „der optionale Synchronisationsdienst [CommandX.SYNC] ermöglicht das unterbrechungsfreie Zusammenarbeiten verschiedener lokal installierter CommandX-Instanzen" → **Client-Server mit lokalen Server-Instanzen und Instanz-zu-Instanz-Sync**; keine dateibasierte Share-Lösung. **Drakon**: keine belastbaren öffentlichen Architekturangaben gefunden → offene Frage. Kein recherchiertes Feldprodukt setzt auf „gemeinsame Datei auf SMB-Share ohne Serverprozess"; alle setzen einen Serverprozess (Cloud oder lokal) voraus – der Verzicht darauf ist ein S1-Control-spezifisches Alleinstellungsmerkmal mit entsprechend wenig Vorbildern.
- Excel-Ist-Prozess (vba_full.txt): Die Arbeitsmappe kennt keinerlei Mehrbenutzer-/Netzwerklogik (kein `MultiUserEditing`, kein Shared-Workbook-Code); einziger Dateisystembezug ist der EEB-Ordnerpfad relativ zu `ThisWorkbook.Path` (vba_full.txt:1951-1990, 2053-2087). D.h. heute: **ein Bearbeiter, eine Datei**; Mehrplatzfähigkeit ist eine neue Anforderung, die die Excel-Lösung nie erfüllt hat.

## 2. Option A: SQLite-Datei auf dem Share (Rollback-Journal, kein WAL)

### Was S1-Control tat
Bis 2026-05-31 eine SQLite-Datei je Einsatz (`.s1control`) plus `_system.s1control` auf dem Share; ab 0ca506a auf Share-Pfaden `journal_mode=DELETE`, `synchronous=FULL`, `busy_timeout=10000`, 12 Open-Retries (Abschnitt 0.1). Anschließend eine Serie von Symptom-Fixes („swallow transient sqlite lock errors", „Handle malformed sqlite errors", „reduce sqlite contention"), dann vollständige Abkehr.

### Warum es konkret scheitert
1. **Locking-Semantik ist nicht garantiert.** SQLite setzt Byte-Range-Locks (POSIX `fcntl` bzw. `LockFileEx`) und verlässt sich darauf, dass sie exakt funktionieren (lockingv3: „If that is not the case, then database corruption can result … Your best defense is to not use SQLite for files on a network filesystem."). Über SMB werden diese Locks als **mandatory** SMB2-LOCK-Anfragen an den Server geschickt (mount.cifs: „Windows' locking is mandatory and can block reads and writes from occurring"), auf macOS über den Apple-SMB-Client, auf Linux abhängig von `nobrl`/`forcemandatorylock`. Drei OS-Clients mit drei Lock-Mappings gegen einen NAS-Server (Samba, ggf. mit `oplocks`/`kernel oplocks`/`posix locking` in beliebiger Konfiguration) – die Voraussetzung „alle Verbindungen nutzen dasselbe Locking-Protokoll" (howtocorrupt §2.4) ist auf einem gemischten Einsatz-LAN nicht sicherzustellen.
2. **Cache-Kohärenz.** Mit Oplocks/Leases darf ein Client Schreibdaten *und* Byte-Range-Locks lokal halten (MS-SMB2 Leasing: „WRITE caching permits the SMB2 client to cache writes and byte-range locks"). SQLite liest bei jeder Transaktion den Datei-Header und verlässt sich darauf, dass ein Lock-Wechsel den Cache invalidiert; verzögerte Lease-Breaks, `FileInfoCacheLifetime` 10 s (Windows) bzw. `actimeo` 1 s (Linux) machen daraus Stale Reads → Journal-Inkonsistenzen → „database disk image is malformed". Der SQLite-Forum-Thread (1.1) zeigt genau dieses Symptombild bei 2–3 Nutzern auf SMB, auch mit DELETE-Journal.
3. **Hot-Journal-Recovery über Netz.** Bei Absturz eines Clients bleibt ein `-journal` liegen; der nächste Client muss es zurückspielen. Das setzt voraus, dass er das Journal vollständig und aktuell sieht (Directory-Cache 10 s, FileNotFound-Cache 5 s auf Windows) – sonst arbeitet er auf einer halb zurückgesetzten DB.
4. **Blockierende I/O und 60-s-SessTimeout.** `better-sqlite3` ist synchron; bei NAS-Stocken steht der Main-Prozess bis zu 60 s (1.8) – deckt sich mit den Perf-Commits (`cd33747`, TODO.md „Utility-Prozess-Auslagerung").
5. **Backup/Restore per Datei-Kopie** (backup.ts: `fs.copyFileSync` einer offenen DB) ist laut howtocorrupt §1.2/§2.5 selbst eine Korruptionsquelle.

### Gibt es SMB3-sichere Konfigurationen?
- **Nein für Multi-Client-Schreibzugriff.** Alle offiziellen SQLite-Quellen (FAQ 5, lockingv3, howtocorrupt) raten ab; keine Aussage von SQLite oder Microsoft, die SMB3 (Leases, Durable Handles) als „sicher für SQLite" qualifiziert. SMB3 verbessert Durchsatz/Reconnect, ändert aber nichts an Client-Caching und Lock-Mapping.
- Was das Risiko nur *senkt*: `journal_mode=DELETE` (nie WAL – „WAL does not work over a network filesystem"), `synchronous=FULL`, serverseitig Oplocks/Leases aus für `*.s1control` (Samba `veto oplock files`, Synology „Enable Opportunistic Locking" aus), Windows-Clients mit `FileInfoCacheLifetime=0`, Linux `cache=none`/`nobrl` – alles **Admin-Eingriffe auf NAS und jedem Client**, im Einsatz nicht durchsetzbar (fremde NAS, fremde Laptops).
- **Einziger sicherer SQLite-Betrieb auf Share:** genau ein Prozess öffnet die Datei (`locking_mode=EXCLUSIVE`), alle anderen nur Kopien lesen – das ist faktisch ein Serverprozess und verletzt die Randbedingung.

### Bewertung
- Konsistenz: schlecht (unkontrollierbare Lock-/Cache-Semantik). Datenverlustrisiko: hoch (Korruption der *einzigen* Datei, Backups sind Kopien offener DBs). Offline: nein (Datei ist der Zustand; ohne Share kein Betrieb). Komplexität: gering im Code, hoch im Betrieb. Undo: gut (Command-Log in DB). Nachvollziehbarkeit: mittel (Log-Tabelle, aber Korruption zerstört Historie). Performance <5.000 Einheiten: gut lokal, über SMB durch Lock-Roundtrips schlecht (jede Transaktion mehrere SMB2 LOCK/UNLOCK). Aufwand Rust: gering (rusqlite vorhanden), Node: gering (better-sqlite3) – aber irrelevant, weil das Modell fachlich nicht trägt.
- **Restrisiko: inakzeptabel.** Empirisch im Projekt gescheitert (0.1), theoretisch begründet (1.1), ohne durchsetzbare Gegenmaßnahme.

## 3. Option B: Ein JSON-Dokument je Einsatz + Lockfile (Ist-Stand)

### Befund im Code (zusätzlich zu 0.2)
- `src/main/db/connection.ts:47-60` (`buildCtx.save`): schreibt unter `withFileLock` den **In-Memory-Zustand `ctx.einsatz`** komplett auf die Platte, **ohne die Datei vorher neu zu lesen**. `state.getDbContext()` (`src/main/main.ts:456`) liefert immer dasselbe Objekt; die Datei wird nur beim Öffnen (`openDatabaseWithRetry`, `register-einsatz-helpers.ts:93`) gelesen. Ein Pfad, der `readEinsatzFile` nach dem Öffnen erneut aufruft, existiert im Main-Prozess nicht (grep: nur `db/connection.ts:26` und `einsatz-files.ts:58` für die Einsatzliste). `src/main/db-runtime.ts` ist ein Stub („no longer used in JSON store mode"), `USE_DB_UTILITY_PROCESS` ist opt-in (`main.ts:33`).
  → **Folge:** Client A öffnet, Client B öffnet, B speichert eine Einheit, A speichert eine andere Einheit: A überschreibt Bs Datei mit seinem alten In-Memory-Stand + eigener Änderung. Das Lockfile serialisiert nur die Schreibvorgänge, verhindert aber den Lost Update nicht. Der Renderer-Poll alle 6 s (`useSyncEvents.ts:56-63`) und der UDP-Broadcast lösen `loadEinsatz` aus, das aus dem In-Memory-`ctx` bedient wird – Fremdänderungen werden also gar nicht sichtbar, bis der Einsatz neu geöffnet wird. (Vorbehalt: geprüft per grep über `src/main`; falls ein Reload-Pfad im Renderer über „Einsatz öffnen" läuft, bleibt der Lost Update bestehen, nur die Sichtbarkeit verbessert sich.)
- `ctx.save()` schreibt `_system.json` **ohne** Lock (`connection.ts:57`), parallel zum lockfreien Heartbeat (`clients.ts:137`) und zu den lock-geschützten `recordEditLocks` (`record-lock.ts`) → Bearbeitungssperren können durch Heartbeats anderer Clients verschwinden.
- Backup: Datei-Kopie alle 5 min (nur Master), Restore überschreibt ohne Lock (backup.ts:61).

### Lockfile-Atomarität über SMB
- `flag: 'wx'` → `O_CREAT|O_EXCL` → SMB2 CREATE mit `FILE_CREATE`; die Entscheidung trifft der Server, damit ist die Erzeugung über SMB **atomar** (zustandsbehaftetes Protokoll; für NFS<3 ausdrücklich nicht, open(2)). Aber:
  - **Stale-Übernahme (`file-lock.ts:25-28`) ist nicht atomar**: `writeFileSync` ohne `wx` – zwei Clients, die denselben 10 s alten Lock sehen, übernehmen ihn beide. Korrekt wäre: neue Datei `lock.<clientId>` schreiben und per `rename` auf `.lock` schieben, dann zurücklesen und die eigene ID vergleichen.
  - **Stale-Erkennung nutzt Client-Uhren** (`acquiredAt` vom Inhaber vs. `Date.now()` des Übernehmers): 10 s Schwelle bei Uhren ohne NTP → ein Client mit 30 s vorgehender Uhr „stiehlt" jeden Lock sofort; ein Client mit nachgehender Uhr sieht nie einen stalen Lock.
  - **FileNotFound-Cache 5 s (Windows)**: nach dem `unlink` des Locks durch Client B kann Client A bis zu 5 s lang glauben, die Lock-Datei existiere noch/nicht mehr; das führt zu unnötigen 5-s-Timeouts (`LOCK_TIMEOUT_MS`) und zu `Error('Lock timeout')` für den Benutzer.
  - **10 s Stale-Schwelle vs. 60 s SessTimeout**: Ein Client, der mitten in `writeFileSync(tmp)` an einem stockenden NAS hängt (bis 60 s), verliert nach 10 s seinen Lock an andere; danach schreiben zwei Clients gleichzeitig `.tmp` → letzter `rename` gewinnt, der andere Stand ist weg.
- Datei-Rename: `renameSync(tmp, final)` ist innerhalb eines Shares serverseitig atomar (Samba: POSIX `rename()`); auf Windows-Servern `FileRenameInformation/ReplaceIfExists`. Praktische Falle: wenn ein anderer Client die Zieldatei gerade offen hat (Backup-Kopie, Einsatzliste), schlägt der Rename unter Windows mit `EPERM`/`EBUSY` fehl – die `.tmp` bleibt liegen, der Save ist verloren, obwohl kein Fehler im Lock lag.
- **Kein fsync** vor dem Rename: bei Write-Lease kann der Client den Inhalt der `.tmp` lokal puffern; stürzt der Client ab oder bricht das Netz nach dem Rename ab, kann die finale Datei leer/verkürzt sein (Samba-HOWTO: „the work from the prior session is lost"). Rename-Atomarität schützt nur die Namensbindung, nicht den Inhalt.

### Größe/Skalierung
- Beispiel im Repo: `einsatz/*.s1control` 6,7 KB; realistischer Einsatz mit 5.000 Einheiten × ~600 B JSON (Feldliste in `types.ts:26-54`) + Bewegungen + Command-Log → 5–20 MB je Datei. Jeder Save schreibt die **gesamte** Datei (`JSON.stringify(data, null, 2)` mit Pretty-Print) über das Netz; jeder Read liest sie komplett. Bei 6-s-Poll × 4 Clients × 10 MB = ~7 MB/s Dauerlast auf dem Share; mit WLAN nicht tragfähig. Command-Log und Bewegungen wachsen monoton in derselben Datei.

### Bewertung
- Konsistenz: schlecht (Lost Update strukturell, siehe oben). Datenverlustrisiko: mittel–hoch (ganzer Einsatz in einer Datei, kein fsync, Rename-Fehler, Backup nur alle 5 min). Offline: nein. Komplexität: gering (das ist ihr Vorteil). Undo: vorhanden (commandLog), aber im Mehrbenutzerbetrieb undefiniert (Undo von A überschreibt B). Nachvollziehbarkeit: mittel (Bewegungen/CommandLog), nicht manipulationssicher. Performance: schlecht ab wenigen MB. Aufwand: null (existiert), aber Reparatur der Semantik (Re-Read vor Write, `writeSeq`-Vergleich, atomarer Steal, fsync) ist Pflicht, wenn Option B bleibt.
- **Restrisiko:** Selbst repariert bleibt ein Single-Document-Modell mit globalem Lock: jeder Schreibvorgang serialisiert alle Clients über ein netzweites Lock mit Timing-Annahmen (10 s/5 s/60 s), und der Lock ist wegen Client-Uhren und SMB-Caches nicht sauber definierbar. Für 2–4 Clients mit seltenen Schreibvorgängen „meist" funktionsfähig, aber nicht robust gegen genau die Störfälle (Netzabbruch, Absturz, falsche Uhr), die die Aufgabe fordert.

## 4. Option C: Append-only Ereignisprotokoll, EIN Schreiber je Datei

### Modell
- `<share>/<einsatz>/events/<clientId>.jsonl` (oder segmentiert `<clientId>.<seq-start>.jsonl`): **nur** der besitzende Client hängt an; alle lesen alle. Zustand = Fold über die vereinigte, deterministisch sortierte Ereignismenge (Sortierschlüssel HLC-Zeitstempel, Tie-Break `clientId`). Jedes Event trägt `eventId` (clientId + laufende Nummer), `hlc`, `wallclock`, `actor` (Benutzer/Rechner), `type`, `payload`, optional `causalDeps`/`baseVersion` der betroffenen Entität.
- Konflikte: **je Feld Last-Writer-Wins nach HLC** als Default (kommutativ, idempotent, ordnungsunabhängig, da der Fold immer über die sortierte Gesamtmenge läuft), plus **fachliche Regeln**, wo LWW falsch wäre: (a) Stärke-Zähler = additive Ereignisse (An-/Abmeldung als +/−, nicht als Absolutwert); (b) Verschieben einer Einheit in einen inzwischen aufgelösten Abschnitt → Fold legt sie in einen definierten Auffang-Abschnitt (z.B. Bereitstellungsraum/FüSt) und erzeugt eine Warnung; (c) Abschnitts-Hierarchie: Zyklen durch gleichzeitiges Umhängen → deterministische Regel (Event mit kleinerem HLC gewinnt, das andere wird zu No-Op mit Konfliktvermerk); (d) Löschen vs. Bearbeiten → „Tombstone gewinnt, Bearbeitung wird als Konflikthinweis protokolliert".
- Undo = **Kompensationsereignis** (`undo_of: eventId`) des eigenen Clients; Undo fremder Ereignisse nur als expliziter fachlicher Vorgang (protokolliert). Damit ist Undo im Mehrbenutzerbetrieb definiert (nur eigene, nur letzte n) – anders als heute.
- Snapshots/Compaction: jeder Client darf `snapshots/<hlc>-<clientId>.json` schreiben (Zustand + Version-Vector der eingeflossenen Events). Leser laden neuesten Snapshot und falten nur Events > Version-Vector. Compaction der Event-Dateien selbst **nie** (append-only = ETB-Charakter); Archivierung verschiebt den Ordner in ein ZIP.

### Robustheit von „append + fsync" über SMB
- Single Writer je Datei umgeht das O_APPEND-Multi-Writer-Problem (open(2), Rust-Std, 1.4/1.11) vollständig: der Client kennt sein eigenes Dateiende, schreibt einen Datensatz mit **einem** `write()` an explizitem Offset (SMB2 WRITE hat immer einen Offset) und ruft `fsync` (SMB2 FLUSH, 1.9) auf. Leser prüfen pro Zeile ein Längenpräfix/Prüfsumme (z.B. `len\tcrc32\tjson\n`) und ignorieren eine unvollständige letzte Zeile → **Teilschreiben ist harmlos**, weil der Schreiber beim nächsten Start seine Datei verifiziert und ab der letzten gültigen Zeile truncated/weiterschreibt.
- Keine Locks nötig, kein Rename-Replace, keine Read-Modify-Write-Zyklen → die in 1.2–1.7 belegten SMB-Eigenheiten (Oplock-Breaks, mandatory Locks, FileNotFound-Cache) treffen den Schreibpfad nicht. Einzige Annahme: Eine geöffnete Datei mit Write-Lease wird beim Öffnen durch einen Leser per Lease-Break zurückgeschrieben (MS: Server sendet Break und wartet auf Ack); mit `fsync` nach jedem Event ist man davon unabhängig.
- Netzabbruch beim Schreiber: Event bleibt in der lokalen Kopie (siehe Offline unten) und wird nachgefahren; kein Zustand ist „halb" auf dem Share.

### Erkennen neuer Daten
- Polling: `readdir(events/)` + `stat` (Größe!) je Datei alle 1–3 s; **Größe** statt mtime, weil mtime auf SMB gecacht/grob ist und Größe-Wachstum monoton ist. Inkrementelles Lesen ab bekanntem Offset (`seek`) → pro Poll nur wenige Bytes. Windows Directory-Cache 10 s verzögert das Erscheinen *neuer* Dateien anderer Clients um bis zu 10 s (einmalig je Client-Datei); Größenänderungen bekannter Dateien unterliegen dem FileInfo-Cache (10 s) – ein `open`+`read` am bekannten Offset umgeht den Attribut-Cache (Daten-Reads gehen bei fehlender Lease zum Server; mit `cache=strict` unter Linux ebenso).
- UDP-Broadcast (bestehend) als Beschleuniger: „Client X hat Datei Y bis Offset Z geschrieben" → Empfänger liest sofort gezielt nach. Fällt Broadcast aus (1.10), greift Polling.
- Datei-Watcher (fs.watch/notify) nur opportunistisch (1.5).

### Uhren
- HLC (1.11): logische Komponente garantiert Kausalität, physische bleibt „nahe" an der besten gesehenen Uhr. Client mit falscher Uhr zieht andere nicht mit (Delta-Grenze wie `uhlc::ExceedingDeltaError`, z.B. 5 min) und erhält eine UI-Warnung „Uhr weicht um X ab". Fachliche Zeitstempel (Zeitpunkt der Meldung) bleiben davon getrennt als **Nutzereingabe** (wie im ETB), die technische Ordnung nutzt HLC. Master-Wahl/Heartbeats (heute `startedAt` = Client-Uhr) entfallen für die Datenhaltung ganz.

### Offline/NAS-Ausfall
- Natürlich unterstützt: Der Client schreibt **immer zuerst lokal** (`%APPDATA%/S1/<einsatz>/<clientId>.jsonl`) und spiegelt append-weise auf den Share („Upload-Offset"). Fällt das NAS aus, wächst nur die lokale Datei; kommt es zurück, wird ab Upload-Offset nachgeschrieben. Andere Clients sehen Ereignisse verspätet, aber korrekt geordnet (HLC). Kein Merge-Schritt, kein Konfliktdialog beim Wiederanschluss – die Konfliktregeln des Folds gelten immer gleich.

### Bewertung
- Konsistenz: gut (deterministisch, konvergent; Lost Update ausgeschlossen per Konstruktion). Datenverlustrisiko: niedrig (Daten liegen lokal und auf dem Share, append-only, keine Datei wird je überschrieben). Offline: ja, inhärent. Komplexität: mittel (Fold + Regeln + Snapshot; aber alles lokal testbar, deterministisch, ohne Netz-Mocks). Undo: definiert (eigene Kompensation). Nachvollziehbarkeit: sehr gut (Ereignisprotokoll = ETB-nah, wer/wann/was, unveränderlich). Performance: <5.000 Einheiten × ~10 Events = 50.000 Events × ~300 B = 15 MB Gesamtprotokoll je Einsatz; Fold in Rust <100 ms, in Node <500 ms [Schätzung]; mit Snapshot vernachlässigbar. Aufwand Rust: mittel (serde, HLC, Fold, Datei-I/O, fsync, Poll-Task in tokio); Node: mittel (gleiche Konzepte; `fs.fsyncSync`, Worker-Thread für I/O nötig, um den Main-Thread nicht zu blockieren).
- **Restrisiko:** Regelwerk für fachliche Konflikte muss vollständig sein (jede Event-Art braucht eine Fold-Regel); Schema-Evolution der Events (Versionierung, Upcaster); Größenwachstum bei sehr langen Einsätzen (Snapshots lösen Lesezeit, nicht Archivgröße – akzeptabel).

## 5. Option D: CRDT-Dokument (Automerge/Loro/Yjs) mit Datei-Austausch

### Modell
- Ein CRDT-Dokument je Einsatz; jeder Client schreibt seine Änderungen (Automerge `get_changes`/Loro `export(Updates)`/Yrs Update) in **eigene** Dateien (`changes/<clientId>.<n>.bin`), alle lesen alle und mergen lokal. Transport ist damit identisch zu Option C (Single Writer je Datei, Polling), nur der Inhalt ist eine Bibliotheks-Binärstruktur statt fachlicher Events.

### Reife der Rust-Crates (docs.rs, 1.11)
- `automerge` 0.11.0: ausgereift, JSON-Modell, Historie eingebaut, **kein Undo**, Konflikt bei gleichem Schlüssel „random but deterministic" (`get_all()` liefert Kandidaten). Kein Tree-Container mit Move; Abschnittshierarchie müsste als Map mit `parentId` modelliert werden – Zyklen bei gleichzeitigem Umhängen sind dann Anwendungssache.
- `loro` 1.16.0: **`LoroTree` mit Move-Semantik** (passt exakt zu Abschnitten/Einheiten verschieben), `MovableList`, `UndoManager` (nur eigene Ops), Snapshot/Updates/ShallowSnapshot, kleinste Kodierung (Herstellerangabe 2–5×). Jüngstes Ökosystem; API seit 1.0 auf Kompatibilität ausgelegt.
- `yrs` 0.27.4: reif, Yjs-kompatibel, `UndoManager`; **kein Tree/Move** – für Führungsstruktur ungeeignet ohne Eigenbau.
- Node-Seite: Automerge/Loro/Yjs haben WASM-Bindings; im Electron-Main problemlos, in Tauri läuft die Rust-Crate nativ im Kern.

### Bewertung
- Konsistenz: sehr gut (mathematisch konvergent). Aber: CRDT-Konflikte sind **strukturell**, nicht **fachlich** – „Einheit gleichzeitig nach A und nach B verschoben" löst Loro deterministisch, aber ohne S1-Regel (z.B. Meldung an FüSt) und ohne Erklärbarkeit für den Anwender; Zähler/Stärken brauchen Counter-Container statt Werte. Datenverlustrisiko: niedrig (append-only Change-Dateien). Offline: ja, inhärent. Komplexität: hoch – zusätzlich zur Bibliothek braucht man ohnehin ein Ereignisprotokoll für ETB/Revision, weil CRDT-Historie (Op-Log) nicht fachlich lesbar ist; Debugging von Binär-Changes über SMB ist mühsam. Undo: Loro/Yrs ja (nur lokal), Automerge nein. Nachvollziehbarkeit: mittel (Historie technisch vorhanden, fachliche Semantik „warum" fehlt). Performance: gut. Aufwand Rust: mittel (Bibliothek trägt viel), Node: mittel (WASM). Dateigrößen: Op-Log wächst mit jeder Änderung; Loro ShallowSnapshot/Automerge save() komprimieren; kein Problem bei <5.000 Einheiten.
- **Restrisiko:** Bindung an Bibliotheks-Binärformat (Langzeitarchiv einer Einsatzakte in Automerge-Bytes ist kein revisionsfähiges Format – man müsste ohnehin JSON-Exporte ablegen); Determinismus nur innerhalb derselben Bibliotheksversion garantiert (Formatkompatibilität ist Herstellerzusage); fachliche Konfliktregeln müssen trotzdem gebaut werden → D ist gegenüber C ein Zusatz, kein Ersatz.

## 6. Option E: Lokale SQLite je Client + Austausch über C oder D

### Modell
- Jeder Client hält `~/.../S1/<einsatz>.sqlite` (WAL, lokal → alle SQLite-Warnungen entfallen) als **materialisierte Sicht** des Folds (Option C) oder des CRDT-Dokuments (Option D). Der Share enthält nur Event-/Change-Dateien und Snapshots. Schreibpfad: Kommando → Event (lokal + Share) → Fold → Update der lokalen SQLite (Projektion). Lesepfad: SQL gegen lokale DB (Stärkeübersicht, Filter, Reports, Volltextsuche).
- Wiederaufbau jederzeit aus Events (lokale DB ist Cache, kein Wahrheitsträger) → Schema-Migrationen sind trivial (DB löschen, neu falten).

### Bewertung
- Vorteile: Queries/Reports/Exports in SQL (Excel-Ablösung braucht Auswertungen: Stärke je Abschnitt, Fahrzeuglisten, Verpflegung, Druck), Performance konstant, bmecatEditor-Know-how (rusqlite) direkt nutzbar. Kein Mehrbenutzer-Risiko, weil lokal.
- Komplexität: +1 Schicht (Projektion muss idempotent sein; bei Snapshot-Laden Neuaufbau). In Rust mit rusqlite ~ überschaubar; in Node wieder `better-sqlite3`-Native-Build-Thema (README: Cross-Build nur auf Windows-Host).
- Alternative ohne SQLite: In-Memory-Struktur des Folds + Indizes in Rust (HashMaps) reicht für <5.000 Einheiten problemlos; SQLite lohnt sich erst für Ad-hoc-Auswertungen/Export.
- **Restrisiko:** gering; Gefahr, dass die lokale DB schleichend zur Wahrheit wird (Schreibpfad muss ausschließlich über Events laufen – architektonisch erzwingen: Projektion hat keine Write-API nach außen).

## 7. Option F: Sonstiges

### „Ein Verzeichnis pro Entität, eine Datei pro Version"
- Jede Entität als `entities/<id>/<hlc>-<clientId>.json` (immutable, create_new). Zustand = neueste Version je Entität; Historie = Verzeichnisinhalt. Sperrfrei, atomar per Create. Nachteile: Tausende kleine Dateien und `readdir` über SMB (Directory-Cache 10 s, Enumeration langsam; macOS-Finder-Symptom „partial list", 1.7); Cross-Entity-Invarianten (Einheit ↔ Abschnitt) brauchen trotzdem eine Ordnung → man landet wieder bei Events/HLC, nur mit schlechterem I/O-Profil. Sinnvoll höchstens für große Blobs (Anhänge, Fotos, EEB-Scans) neben dem Ereignisprotokoll.
- Windows Distributed Link Tracking: irrelevant (betrifft Shell-Verknüpfungen, nicht Datei-I/O).

### Feldprodukte (1.11)
- Fireboard: Cloud/Portal mit Mehrplatz und Offline-Weiterarbeit nach Sync – Server-zentriert [Architekturdetails nicht öffentlich; Vermutung].
- CommandX: webbasiert, On-Premises-Server möglich, CommandX.SYNC zwischen lokal installierten Instanzen; Client arbeitet bei Verbindungsverlust zur Master-Instanz weiter – Client-Server mit Instanz-Sync.
- Drakon: keine belastbaren Angaben gefunden.
- Kein bekanntes Produkt nutzt „gemeinsame Datei auf SMB ohne Server". Die Anforderung ist also nicht durch Vorbilder abgedeckt; das Ereignisprotokoll mit Single-Writer-Dateien ist das Muster, das serverlose Sync-Systeme (Dateisync-basierte Local-First-Ansätze, Git-artige Objektspeicher) verwenden – Prinzip „nur eigene Dateien schreiben, fremde nur lesen" [allgemeines Architekturwissen, unbelegt für ein konkretes Produkt].

## 8. Querschnittsthemen

### 8.1 Änderungsbenachrichtigung ohne Server
- Reihenfolge der Verlässlichkeit: (1) **Polling der eigenen Offsets** auf dem Share (immer), (2) UDP-Broadcast/Multicast als Beschleuniger, (3) OS-Watcher opportunistisch.
- UDP-Broadcast: funktioniert auf einfachen Switches; fällt aus bei WLAN-Client-Isolation, bei falschem Adapter (LAN+WLAN+VPN, 1.10), bei Windows-Firewall-Verweigerung, über Subnetzgrenzen (Router). Multicast (z.B. 239.255.x.x) ist auf einfachen Switches ohne IGMP-Snooping = Broadcast, mit Snooping manchmal *schlechter* (Querier fehlt) – kein Gewinn gegenüber Broadcast im Einsatz-LAN [unbelegt, Praxiswissen]. mDNS (5353) braucht ebenfalls Multicast und dient der Entdeckung, nicht der Benachrichtigung; nützlich, um Peer-IPs zu finden und dann **Unicast**-Hinweise zu senden (robust gegen Broadcast-Filter, solange Unicast erlaubt ist). Empfehlung: Peer-Liste aus dem Share (`presence/<clientId>.json` mit IP, per create/overwrite eigener Datei) → Unicast-UDP an alle bekannten Peers + Broadcast als Bonus.
- Der bestehende `EinsatzSyncService` (einsatz-sync.ts) ist als Signalgeber wiederverwendbar; Payload sollte künftig `clientId`, `fileSeq`, `byteOffset` enthalten statt `dbPath`.

### 8.2 Uhrzeit ohne NTP
- Einsatz-Laptops stehen häufig ohne Internet/NTP; Abweichungen von Minuten bis Stunden sind realistisch (Standby, leere CMOS-Batterie). Konsequenzen: (a) Ordnung technischer Ereignisse **nie** über Wallclock → HLC (1.11); (b) TTL-basierte Locks/Heartbeats (heute 10 s/45 s/2 min) sind ohne gemeinsame Uhr undefiniert → vermeiden; (c) fachliche Zeit (Meldezeit, Abmeldezeit) als Nutzereingabe mit Vorschlag aus der lokalen Uhr, jederzeit korrigierbar (wie Papier-ETB); (d) HLC-Delta-Prüfung liefert eine UI-Warnung „Uhr dieses Rechners weicht um X von den anderen ab", ohne Ereignisse abzulehnen (Einsatzbetrieb geht vor).

### 8.3 NAS-Ausfall / Offline-Queue
- Option A/B: kein Betrieb ohne Share (Datei = Zustand); Wiederanlauf erfordert manuelles Zusammenführen → praktisch Datenverlust.
- Option C/D/E: „Local-first": lokale Kopie ist immer vollständig (eigene Events + zuletzt gelesene fremde Events + Snapshot). Ausfall = fremde Änderungen fehlen vorübergehend; eigene Arbeit geht weiter; Nachfahren = Append ab Upload-Offset. UI zeigt „Share nicht erreichbar seit hh:mm – lokal weitergeführt". Bei Wiederanschluss keine Konfliktdialoge, weil die Fold-Regeln deterministisch sind; höchstens Konflikt-*Hinweise* (z.B. Einheit doppelt verschoben).
- Wichtig für die Implementierung: Alle Share-I/O in einem eigenen Thread/Task mit Timeout (SessTimeout 60 s!), nie im UI-/Main-Thread; Tauri/tokio bzw. Node Worker.

### 8.4 Backup/Archiv/Export/Revision
- Ereignisprotokoll = Einsatztagebuch-nah: unveränderlich, append-only, je Eintrag Akteur/Rechner/HLC/Wallclock. Revisionssicherheit erhöhen: Hash-Kette je Client-Datei (`prevHash` im Event) – nachträgliche Änderung wird erkennbar; Signatur optional.
- Backup ist trivial: Ordner kopieren (nur append-only-Dateien und immutable Snapshots; keine „offene DB"-Problematik). Zusätzlich hält jeder Client seine lokale Kopie → n+1 Kopien automatisch.
- Export Einsatzakte: ZIP mit `events/` (Rohprotokoll), `snapshot.json` (Endzustand), `etb.csv/pdf`, `einheiten.csv`, `bewegungen.csv`, `manifest.json` (Hashes, Version, Zeitraum). Import in S1-Control = Ordner entpacken → sofort les-/faltbar.
- Archivierung: Einsatz beenden = `archive.marker` (nur FüSt-Rolle) + Verschieben nach `archiv/`; danach lehnen Clients Writes ab (Fold-Regel, nicht Dateisperre).

## 9. Bewertungsmatrix (++ sehr gut, + gut, o mittel, − schlecht, −− inakzeptabel)

| Kriterium | A SQLite auf Share | B JSON+Lockfile (Ist) | C Event-Log Single-Writer | D CRDT-Dateien | E lokale SQLite + C/D | F Datei je Version |
|---|---|---|---|---|---|---|
| Konsistenz (Mehrclient) | −− (Lock/Cache undefiniert, 1.1/1.6) | − (Lost Update strukturell, 3) | ++ (deterministischer Fold) | ++ (konvergent) | ++ (erbt C/D) | + (per Entität), − (entitätsübergreifend) |
| Datenverlustrisiko | −− (Korruption einer Datei) | − (kein fsync, Rename-Fehler, Steal-Race) | ++ (append-only, lokal+Share) | ++ | ++ | + |
| Offline-Fähigkeit | −− | −− | ++ (inhärent) | ++ | ++ | + |
| Komplexität | + Code / −− Betrieb | ++ (einfach), Reparatur nötig | o | − (Bibliothek + eigenes Regelwerk) | − (zusätzliche Projektion) | − (viele Dateien) |
| Undo | + | o (im Mehrclient undefiniert) | + (eigene Kompensation, definiert) | + Loro/Yrs, − Automerge | + (wie C) | o |
| Nachvollziehbarkeit / ETB-Nähe | o | o | ++ | o (technische Historie) | ++ (C) | + |
| Performance <5.000 Einheiten | − über SMB (Lock-Roundtrips) | − (Ganzdatei 5–20 MB je Save/Read) | + (inkrementell, Snapshots) | + | ++ (SQL lokal) | − (readdir über SMB) |
| Aufwand Rust | gering | gering | mittel | mittel | mittel+ | mittel |
| Aufwand Node | gering | 0 (+Reparatur) | mittel (Worker für I/O) | mittel (WASM) | mittel+ (Native-Build) | mittel |
| SMB-Eigenheiten, die treffen | Locks, Leases, Caches, Journal-Recovery | O_EXCL-Steal, FileNotFound-Cache, Rename-EBUSY, kein fsync | Directory-Cache verzögert neue Dateien (einmalig), sonst keine | wie C | wie C | Directory-Cache, Enumeration |
| Gesamturteil | ausgeschlossen | nur als Übergang, mit Fixes | **Empfehlung** | Ergänzung möglich, nicht nötig | **Empfohlene Ausbaustufe von C** | nicht empfohlen |

## 10. Empfehlung

**Option C (Append-only Ereignisprotokoll, ein Schreiber je Datei, HLC-Ordnung, deterministischer Fold mit fachlichen Konfliktregeln), ausgebaut zu E (lokale Materialisierung/Indizes je Client; SQLite optional für Auswertung/Export).** CRDT-Bibliotheken (D) nur dann, wenn später Freitext-Kollaboration (gemeinsames Lagebild-Textfeld) gebraucht wird – dann Loro wegen Tree/Undo; für Stammdaten-artige Einsatzdaten mit fachlichen Regeln bringt eine CRDT keinen Mehrwert gegenüber dem eigenen Fold.

Begründung in Kurzform:
1. Es ist die einzige Option, bei der **keine** der belegten SMB-Schwächen (mandatory Byte-Range-Locks, Oplock/Lease-Caching, 10-s-Metadaten-Caches, nicht-atomare Stale-Lock-Übernahme, fehlende Multi-Writer-Append-Semantik) den Schreibpfad berührt: Jeder Client schreibt ausschließlich eigene Dateien, ohne Lock, ohne Replace-Rename, mit `fsync`.
2. Offline-Betrieb und Nachfahren sind kein Sonderfall, sondern der Normalpfad (lokal schreiben → auf Share spiegeln).
3. Konsistenz ist **lokal und deterministisch testbar** (gleiche Event-Menge → gleicher Zustand), unabhängig von Netz und Uhr; das ersetzt die heutigen Netz-Timing-Annahmen (10 s/45 s/5 s/60 s).
4. Das Ereignisprotokoll ist fachlich das, was die FüSt ohnehin braucht (ETB-Nähe, Nachvollziehbarkeit „wer hat wann welche Einheit wohin gemeldet"), und ergibt Backup/Export/Archiv fast gratis.
5. Es passt zu beiden Stacks; in Rust (Tauri-Kern-Crate) ist es besonders natürlich (serde, tokio-Task für Share-I/O mit Timeouts, `create_new`, `sync_all`, `uhlc`), in Node ebenso machbar, aber mit Worker-Thread-Disziplin.

Stack-Hinweis für die Synthese: Die Speicherfrage ist **stack-neutral**; sie spricht weder für noch gegen Tauri. Was für den Rust-Kern spricht, ist die Möglichkeit, Fold/Regeln/Projektion als eigene Crate mit Property-Tests (Kommutativität/Idempotenz des Folds) zu bauen und dieselbe Crate für CLI-Werkzeuge (Einsatzakte prüfen/exportieren) zu nutzen; was dagegen spricht, ist der Neubau der bestehenden React/IPC-Schicht. Beides liegt außerhalb dieser Recherche.

### Die 5 größten Restrisiken der Empfehlung
1. **Regelwerk-Vollständigkeit.** Jede Event-Art braucht eine deterministische Fold-Regel inkl. Konfliktfällen (Abschnitt gelöscht/umgehängt, Einheit geteilt/zusammengeführt, Stärke gleichzeitig geändert). Lücken zeigen sich als „stille" Falschzustände. Gegenmaßnahme: Event-Katalog als Spezifikation vor der Implementierung, Property-Tests (Permutation der Event-Reihenfolge ⇒ gleicher Zustand), Konflikt-Hinweise sichtbar im UI/ETB.
2. **Sichtbarkeitsverzögerung durch SMB-Caches.** Bis zu 10 s (Windows Directory-/FileInfo-Cache), bis Events anderer Clients auftauchen; UDP-Beschleunigung kann fehlen. Für Lageführung tolerierbar, muss aber im UI ehrlich sein („Stand: vor 8 s", Peer-Status). Gegenmaßnahme: Daten-Reads am bekannten Offset statt `stat`, Unicast-Hinweise über Peer-Liste.
3. **Schema-Evolution der Events.** Events leben Jahre (Archiv); Feldänderungen brauchen Versionierung/Upcaster; alte Clients im selben Einsatz dürfen neue Event-Typen nicht verwerfen, sondern müssen sie durchreichen/anzeigen („unbekanntes Ereignis"). Gegenmaßnahme: `schemaVersion` je Event, additive Änderungen, Mindestversion je Einsatz im Manifest.
4. **Identität und Zuordnung von Clients/Dateien.** `clientId` muss über Neuinstallation stabil bzw. sauber neu sein; zwei Rechner mit kopiertem Profil (Image-Klon) schreiben in dieselbe Datei → Multi-Writer. Gegenmaßnahme: `clientId` = zufällige ID + Hostname-Suffix, beim Start prüfen, ob die eigene Share-Datei zum lokalen Offset passt (Fremdschreiber-Erkennung), sonst neue Datei-Generation beginnen.
5. **Größe/Lesezeit langer Einsätze und Snapshot-Korrektheit.** Ohne Snapshots wächst die Startzeit linear; Snapshots sind selbst Dateien, deren Vertrauenswürdigkeit (vollständig? welche Version-Vector?) geprüft werden muss; ein fehlerhafter Snapshot verfälscht alle Leser. Gegenmaßnahme: Snapshots tragen Version-Vector + Hash, Leser validieren stichprobenartig gegen Neu-Fold, Snapshots sind immer verwerfbar (Wahrheit = Events).

## 11. Skizze Dateilayout auf dem Share (Option C/E)

```
\\NAS\Einsatz\S1-Control\
  manifest.json                     # Format-/Mindestversion der App, erstellt vom ersten Client (create_new)
  einsaetze\
    2026-09-06_hochwasser-oldenburg_7f3a\      # <datum>_<slug>_<kurz-id>; Ordnername unveränderlich
      einsatz.json                  # Stammdaten des Einsatzes, immutable (create_new); Änderungen via Events
      events\
        c-9b12ef-fuest-laptop1.000001.jsonl     # ein Schreiber je Datei: <clientId>.<segment>.jsonl
        c-9b12ef-fuest-laptop1.000002.jsonl     # neues Segment ab z.B. 8 MB oder Neustart
        c-44d0a3-s1-tablet.000001.jsonl
      snapshots\
        000000000000-000000.json                # Startzustand (leer), immutable
        20260906T141233Z-c-9b12ef.json          # <hlc>-<clientId>.json, immutable; enthält versionVector + hash
      presence\
        c-9b12ef-fuest-laptop1.json             # eigene Datei: host, ip, appVersion, lastOffsetPerFile, updatedAt (nur Anzeige)
        c-44d0a3-s1-tablet.json
      attachments\                              # optional: Blobs (EEB-Scans), <sha256>.<ext>, immutable
      archive.marker                            # existiert ⇒ Einsatz beendet/archiviert (create_new durch berechtigte Rolle)
  archiv\
    2026-08-12_uebung-ammerland_1c9e.zip        # Einsatzakte: events/, snapshots/, export/(csv,pdf,html), manifest.json mit Hashes
  stammdaten\
    stan-2025.json                              # STAN/Einheiten-Stammdaten (immutable je Version, Dateiname = Version)
```

Regeln:
- **Nur Create-New und Append.** Kein Client benennt fremde Dateien um, überschreibt oder löscht sie. `presence/<eigene>.json` ist die einzige überschriebene Datei (Write-Tmp + Rename der *eigenen* Datei; Inhalt ist rein informativ).
- **Event-Zeile:** `<len>\t<crc32>\t{"id":"c-9b12ef:000123","hlc":"…","wall":"2026-09-06T14:12:33+02:00","actor":{"user":"…","host":"…"},"type":"EinheitVerschoben","v":1,"payload":{…},"undoOf":null,"prev":"<hash>"}\n`; nach jedem Event `fsync`; Leser verwerfen unvollständige letzte Zeile.
- **Lokale Spiegelung je Client:** `%APPDATA%\S1-Control\einsaetze\<ordner>\{events,snapshots}` + `upload-state.json` (Offset je eigener Datei, zuletzt gelesene Offsets je fremder Datei). Share-Ausfall ⇒ nur lokale Datei wächst; Rückkehr ⇒ Append ab Offset.
- **Poll-Zyklus (Share-Task, eigener Thread, Timeout 5 s je Operation):** alle 2 s `readdir(events)` (neue Dateien), dann für jede bekannte Datei `open`+`read` ab letztem Offset; UDP-Hinweis (`clientId`, `file`, `offset`) löst denselben Schritt sofort aus.
- **Snapshot-Politik:** Client, der ≥ N (z.B. 5.000) Events seit letztem Snapshot gefaltet hat und länger als 60 s keine neuen Events sah, schreibt einen Snapshot (create_new; Kollisionen zweier Clients sind harmlos, beide Snapshots sind gültig, der neuere Version-Vector gewinnt).
- **Archivierung:** `archive.marker` ⇒ Fold lehnt neue Events ab (Konflikthinweis), Client mit FüSt-Rolle erzeugt ZIP nach `archiv\` und verschiebt den Ordner (Rename desselben Shares = atomar) nach `archiv\<ordner>\` bzw. löscht ihn nach erfolgreicher Hash-Prüfung des ZIP.

## 12. Offene Fragen
- Welche konkreten Fehlerbilder traten im SQLite-Betrieb Feb/März 2026 auf (Commit-Bodies fehlen: 23df61d, c9f312d, 4a098e7, 6f5d13b)? Gab es Korruption oder „nur" Locks/Latenz? – für die Argumentation gegenüber Nutzern relevant.
- Wird im heutigen JSON-Store tatsächlich nie von der Platte nachgelesen (Abschnitt 3)? Grep über `src/main` fand keinen Pfad; ein Laufzeit-Test mit zwei Instanzen auf einem Share würde das endgültig klären.
- Welche NAS-Modelle/Server sind im Einsatz (Synology/QNAP/Windows-Server/Fritz!Box-USB)? Davon hängen Samba-Version, `kernel change notify`, Oplock-Defaults und Rename-Semantik ab.
- Welche Client-OS-Mischung ist real (nur Windows? auch macOS/Linux)? Bestimmt, ob Directory-Cache-Verhalten von macOS (1.7) und CIFS-Mount-Optionen (1.6) praktisch relevant sind.
- Gibt es überhaupt NFS-Shares im THW-Umfeld oder ist SMB die einzige Randbedingung? (NFS würde `link(2)`-basiertes Locking bzw. NFSv3+-O_EXCL erfordern; für Option C irrelevant.)
- Fachlich: vollständiger Event-Katalog und Konfliktregeln (insbesondere Stärkeänderung, Teilen/Zusammenführen von Einheiten, Abschnitt auflösen mit Inhalt) – muss mit der FüSt-Fachseite abgestimmt werden.
- Rollen/Rechte: Wer darf archivieren, wer fremde Ereignisse „korrigieren" (Kompensation)? Beeinflusst Marker-Dateien und Signaturbedarf.
- Drakon: Architektur nicht recherchierbar; falls als Vergleich gewünscht, Herstellerunterlagen anfordern.
- Loro-Formatstabilität über Jahre (falls D später relevant): Herstellerzusage, keine unabhängige Quelle gefunden.
