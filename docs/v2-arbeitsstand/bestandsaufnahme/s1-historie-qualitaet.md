# S1-Control: Projektgeschichte und Qualitätszustand (Key: s1-historie-qualitaet)

Stand: abgeschlossen 2026-09-07

## Gliederung
1. Zeitstrahl der Phasen mit Lehren (git log)
2. Churn-Hotspots
3. Aufwandsverteilung nach Themen
4. Qualitätsbefund (typecheck / lint / vitest)
5. Testabdeckung nach Bereichen
6. Dokumentationsdrift
7. Build/Release-Pipeline
8. Was hat am meisten Zeit gekostet
9. Offene Fragen


## 1. Zeitstrahl der Phasen mit Lehren (git log, 206 Commits, 2026-02-24 bis 2026-06-07)

Quelle: `git log --format='%h|%ad|%s' --date=short --reverse` in /Users/johannes/Developer/S1-Control. Alle Commits von Johannes Rudolph. Auffällig: Commit-Bodies sind bis Ende März praktisch leer (nur Subject-Zeile); erst die JSON-Store-Commits ab 31.05. tragen ausführliche Bodies (mit "Co-Authored-By: Claude Sonnet 4.6").

### Phase 0: MVP-Scaffold + CI/Release (24.–25.02.2026, ~50 Commits an EINEM Tag)
- c9ea25c Initial commit (24.02.), 3bffaf6 "feat: initial S1-Control desktop MVP scaffold" (25.02.)
- Bereits am ersten Tag: Windows-Targets (e7ba50d), NATO-Zeit-Tags in CI (3ab574d, 1cc77d3, 4069eac – drei Iterationen am Tag-Format), Linux deb (d4238af), Coverage-Schwellen 75 % (52cc9ef), Codecov (4d0c3b0, e4e0d96, cd6e298).
- 8199070 (25.02., 11:25) "feat(einsatz-db): separate per-einsatz sqlite with auto backup and restore" – Einführung der Pro-Einsatz-SQLite-Datei, backup.ts (146 Zeilen), einsatz-files.ts (93 Zeilen). Commit-Body leer.
- Updater am selben Tag: fbcd209, 6272b4b, 2967e9d, 253fe02 ("verhindere startup-crash bei auto-updater init"), 230dc6a, 10a0930, 978360e, 96157fc. → 8 Updater-Commits am ersten Produktivtag.
- 72d2de4 "fix(build): rebuild native sqlite for electron and target node20" – erstes Auftauchen des better-sqlite3-Rebuild-Problems.
- Lehre: Die Infrastruktur (CI-Matrix, Signing, Updater, Coverage-Gates) wurde vor jeder fachlichen Tiefe gebaut. Am Tag 1 gab es mehr Commits zu Updater/CI als zu Fachlichkeit.

### Phase 1: Fachfeatures Erfassung (26.–27.02., ~40 Commits)
- 5ba42fa Stärke-Monitor (Vollbild), a554c27 Edit-Flows, 7123808 Erfassungsbogen-Datenmodell, 8f53e2a Inline-Editoren, bffcc6c Helfer-Roster, bb06f98 Stärke-Autosync, 806fe2e Helfer-Generierung aus taktischer Stärke, 74eaa1e BEREITSTELLUNGSRAUM-Typ.
- Parallel weiter Updater-Fixes: c5cd4f1, 2e8f365, 8d5c9f3, 0c0315f, f157843, a6f350b, 2ccb708, 919b113, 7adfc54 (9 Commits an 1 Tag zum generic feed / latest-yml-Metadaten).
- 25a32f6 (26.02.) "feat(clients): add active client heartbeat and master backup election" – Beginn der Multi-Client-Logik in der DB (active_client-Tabelle).
- e25289b .s1control-Endung + File-Association.
- Lehre: Fachfeatures kamen schnell, aber jede Fachrunde wurde von einer Updater-Fixrunde begleitet.

### Phase 2: SMB-Krise (28.02.–03.03., Nacht-Commits)
- 23df61d (28.02. 00:47) "Fixe SMB Datenbankzugriff", c9f312d (00:58) "Fix einsatz metadata on SMB share", 4a098e7 (01:10) "Behebe SMB Share Datenbankzugriff" – drei Commits zwischen 0:47 und 1:10 Uhr nachts, keine Bodies, kein Conventional-Commit-Präfix (Bruch mit dem sonstigen Stil → Stress-Indikator).
- Diff 23df61d (src/main/db/connection.ts): Kommentar "SMB shares can report directory existence before the file handle is fully ready. Touching the target file first reduces 'unable to open database file' races." Retry auf "unable to open database file" erweitert.
- Diff 4a098e7: `fileMustExist: true` für existierende Dateien, Fehlermeldung mit Hinweis "SMB-Share muss fuer beide Clients mit Lese/Schreibrechten gemountet sein" (Pfad-Erkennung `/volumes/`).
- 0ca506a (02.03. 20:20) "use network-safe sqlite pragmas on SMB shares": Kommentar im Diff: "WAL is not reliable across many SMB/NAS setups with multiple hosts." → `journal_mode = DELETE`, `synchronous = FULL`, `busy_timeout = 10000`, Retries 4→12, Erkennung von SQLITE_LOCKED/"database is locked". Umschaltung per ENV `S1_SQLITE_NETWORK_SHARE` und Pfaderkennung (`/volumes/`, `\\\\`).
- 70e5060 (02.03. 20:45, 25 Minuten später) "default to network-safe sqlite mode": Pfaderkennung wieder entfernt, Kommentar: "Default to network-safe mode for robustness in mixed local/share setups (including mapped drives where share detection is unreliable)." → WAL faktisch für alle abgeschaltet.
- b7bc562 (02.03. 21:32) "increase sqlite open timeout for SMB lock contention": `timeout: 15000` beim Öffnen.
- c6a1668 (02.03. 21:50) "swallow transient sqlite lock errors in heartbeat" (clients.ts +70/−44), 6f5d13b (03.03.) "Handle malformed sqlite errors gracefully in client presence" (clients.ts +95).
- Lehre: SQLite über SMB mit mehreren Hosts war das Kernproblem. Innerhalb von vier Tagen wurde WAL aufgegeben (DELETE-Journal + synchronous=FULL = jeder Write ist ein exklusiver Datei-Lock über das Netz), Timeouts hochgedreht (5 s → 10 s busy, 15 s open) und Lock-Fehler in Heartbeat-Pfaden geschluckt. Das ist genau das in der SQLite-Doku dokumentierte Problem (Locking über Netzwerk-Dateisysteme unzuverlässig) [unbelegt: SQLite-Doku "How To Corrupt", nicht abgerufen]. README/AGENTS.md wurden dabei NICHT angepasst (fordern bis heute WAL, siehe Abschnitt 6).

### Phase 3: UDP-Sync, Record-Locks, Debug-Werkzeuge (01.–04.03.)
- 6def01a Live-Sync-Log-Konsole in Settings, c43ae6b (02.03.) "broadcast einsatz changes via UDP with polling fallback" (einsatz-sync.ts 161 Zeilen), 47e134c UDP-Monitor in Einsatz-View, ac8f237 dedizierter UDP-Debug-Panel.
- c14ece8 (02.03.) "add LAN peer discovery and transfer fallback" – LAN-Peer-Updater (Update-Artefakte von anderen Clients im LAN holen), f71cc2e Runtime-Toggle, 3704260 Peer-Status-Debug.
- 45497f2 (03.03.) "enforce distributed record edit locks across clients": neue Tabelle record_edit_lock (drizzle/0012), record-lock.ts 208 Zeilen, App.tsx +363/−131 (!), 17 Dateien, +907 Zeilen.
- 5b79209 "Sync remote refresh by einsatzId across different share paths" – Clients mounten denselben Share unter verschiedenen Pfaden; Sync musste auf einsatzId statt Pfad umgestellt werden.
- 581b286, 56ff11c, 20fa0d9, 48b1034: Taktische-Zeichen-Inferenz (THW-Kurzzeichen, Fachgruppen, Fahrzeuge).
- Lehre: Weil SQLite über SMB keine Änderungsbenachrichtigung liefert, wurde ein eigenes UDP-Broadcast-Protokoll plus Polling-Fallback plus Debug-Konsolen gebaut. Record-Locks (pessimistisches Sperren) als zweite Verteidigungslinie – mit massiver Renderer-Auswirkung (App.tsx +363 Zeilen).

### Phase 4: Großes Refactoring + Lint-Guardrails (04.–05.03., ~25 Commits)
- c33f4f9 "add sonarjs complexity and size guardrails", c569782 "add docblocks for functions across source and tests" (generierte "Handles X."-Docblocks, sichtbar in connection.ts-Diff von 0ca506a).
- 0a28b11, bc36ace, d796974, ce31680, aecc121 ("add AGENTS guardrails"), f4d9d3c, cee9948, 54792ff, 5e89558, 70299f8, 85a4946, 720b119, c958e50, 9e2f36d – 14 Refactor-Commits in zwei Tagen: App.tsx (bis dahin 46× geändert) und register-ipc.ts (29×) wurden aufgespalten.
- 2de9900 "reduce udp broadcast load and remove passive peer scans", 060414f "centralize debug controls and log sampling", 2d09380 "disable sync logs by default".
- Lehre: Der Monolith App.tsx/register-ipc.ts war nach 8 Tagen so groß, dass zwei volle Tage Refactoring nötig wurden. Die Guardrails (400 Zeilen/Datei, Komplexität 10) kamen nachträglich.

### Phase 5: Performance-Krise / Utility-Prozess (06.–08.03.)
- aaae41f perf tactical signs, 7f975b4 "add timeouts and non-blocking shutdown path" (Updater).
- cd33747 (07.03.) "perf(fileshare): reduce sqlite contention and batch abschnitt reads" + bfe0970 Test "behavior: Fileshare-Engpass" (Originaltest prüft: WAL/NORMAL/FK-Pragmas – widerspricht 70e5060, das DELETE-Default setzte; siehe Abschnitt 1a unten; Client-Liste erzeugt keine Heartbeat-Writes; Batch-Details = Einzelabfragen).
- ed4b95a "reduce UI latency with monitor prewarm and safe-mode controls" (S1_PERF_SAFE_MODE), 44dc772 "speed up monitor reopen and defer initial backup", eca4863/a5a4efd Lade-Overlay.
- 4b66ce2 (07.03.) "feat(arch): add db utility bridge and faster first-paint loading": neuer Electron-Utility-Prozess (db-runtime.ts, db-runtime-server.ts 120 Z., main-db-bridge.ts 172 Z., shared/db-runtime.ts 110 Z.) – DB-Zugriff wird aus dem Main-Prozess in einen Utility-Prozess verlagert, weil synchrone better-sqlite3-Aufrufe über SMB den Main-Prozess (und damit UI-Responsivität, DevTools-Öffnen) blockierten.
- a1e1d8e (08.03.) "delegate write, lock and housekeeping ops": db-runtime-server.ts +308, shared/db-runtime.ts +433, TODO.md mit "Utility-Prozess-Auslagerung", "SLO-Messungen: DevTools öffnen p95 < 500ms, Einsatz öffnen p95 < 1.5s, Stärke-Monitor p95 < 1s".
- 07a7fd0 SLO-Skripte, e10f2be Updater-Phase-Timing-Logs.
- Lehre: Die SLO "DevTools öffnen < 500 ms" zeigt, wie stark der Main-Prozess blockiert war. Der Utility-Prozess war eine Architekturmaßnahme, um synchrone SQLite-I/O über das Netz vom UI-Thread zu trennen – ein Problem, das aus der Kombination better-sqlite3 (synchron) + SMB-Latenz entstand. Die gesamte Schicht (≈1.200 Zeilen) wurde 12 Wochen später mit f0a5fec komplett gelöscht.

### Phase 6: STAN / Taktische Zeichen (08.03.–21.03., wenige Commits)
- 282e35b "unify tactical-sign schema and improve THW preview editor", 6b69b7a "migrate preview to taktische-zeichen-core", a5d3de1 "reduce heavy refresh loops during editing and sync", eaf4bf2 Coverage 80 %, b0d5517/e6ce33d Lint.
- Danach 10 Wochen Pause (21.03. → 31.05.).

### Phase 7: JSON-Store-Migration (31.05.–03.06.)
- c895599 (31.05. 18:01) "json-store: foundation types and core write services" – json-store/types.ts 210 Z., file-lock.ts 55 Z., einsatz-store.ts, system-store.ts.
- f67b97c, 58b37e0, f0a5fec (31.05. 18:21 – 20 Minuten nach c895599!) "complete SQLite removal - all services now use JSON store": Body: "Replace DbContext (Drizzle/SQLite) with JSON-backed context … backup: use fs.copyFileSync instead of sqlite backup API … Delete db/schema.ts, db/migrate.ts, db-runtime-server.ts … Zero Drizzle/SQLite imports remain in src/". 14 Dateien, +388/−1632.
- 431eee2 (01.06.) "wire IPC save() calls and rewrite all tests for JSON store": Body: "All write IPC handlers now call await ctx.save() after mutations … record-lock: list/ensure functions read from disk for multi-client consistency … einsatz.test.ts (full rewrite, 1034 → 280 lines) … Delete migration.test.ts (no migrations in JSON store) … tsconfig.main.json errors: 42 (vs 97 on main branch — all remaining are pre-existing)". +773/−1958.
- Folgefixes: 4abf2b8 Skeleton-JSON bei Erststart, bf24667 "skip reading legacy SQLite files by checking JSON magic byte", 7d78596 "notify local renderer directly after writes", 778ca0e "stabilize refreshEinsaetze to prevent boot-loop", 660b9b7 "replace electronmon with plain electron to stop data-file restarts", 0d1a7e6 Abschnittsauswahl bei Background-Refresh erhalten, 507262f "gesamtStaerke always sums ALL sections".
- b423a9d (04.06.) "fix 13 failing unit tests after JSON-store migration", 7798a4f "resolve all ESLint errors blocking CI build".
- WICHTIG: Kein einziger Commit-Body nennt den GRUND für die Migration. Die Commit-Bodies beschreiben nur das WAS. Es gibt keine ADR, kein Doku-Update (README/AGENTS.md nennen weiterhin SQLite). Der Grund muss aus dem Kontext (Phase 2/5) erschlossen werden → openQuestions.
- Lehre: Die Migration war ein Big-Bang (drei Commits in 20 Minuten, −1632 Zeilen), obwohl AGENTS.md §7 "keine Big-Bang-Rewrites" fordert. Die Testbasis schrumpfte massiv (einsatz.test.ts 1034 → 280 Zeilen, migration.test.ts gelöscht). Typecheck war zu diesem Zeitpunkt mit 42 Fehlern rot (laut Commit-Body).

### Phase 8: BDD-E2E (03.–05.06.)
- 9301a8a playwright-bdd-Infrastruktur, 1af806f 10 Szenarien, 5d969e1 (2/10 grün), a9866d1 (8/10), 7e92c73 "ALL 10 BDD tests green".
- Lehre: Erste echte UI-Tests kamen erst nach 3,5 Monaten, nach der Datenhaltungsmigration.

### Phase 9: Aktuelle Features (07.06.)
- ed68271 macOS-Zertifikatsprüfung in CI, cbd72da/c142643 Abschnitt aus Karte bearbeiten, ffa14f8 "Versionsvergleich erkennt neue Builds am selben Tag" (Updater-Bug Nr. ~35), e2fbb7c Abschnitt + Einsatz-Basisdaten bearbeiten, bcf15c6 Lint.
- Working Tree hat 14 ungecommittete Änderungen (git status, siehe Umgebung) rund um EditEinsatzDialog/einsatz-core.

### 1a. Widerspruch Test vs. Code (Phase 5)
Der Originaltest bfe0970 (`test/behavior.fileshare-engpass.test.ts`, "Szenario: DB-Open setzt WAL/NORMAL/FOREIGN_KEYS") erwartete journal_mode=wal, synchronous=1, busy_timeout=5000. 70e5060 (5 Tage vorher) hatte den Default auf DELETE/FULL/10000 gesetzt. Das ist nur konsistent, wenn cd33747 den Default zurückdrehte oder der Test die ENV setzte – muss in der Diff von cd33747 an connection.ts geprüft werden (siehe 1b).

### 1b. Auflösung des Widerspruchs (Pragmas)
`git show cd33747 -- src/main/db/connection.ts`: cd33747 (07.03.) entfernte den DELETE/FULL-Zweig wieder und setzte fest WAL/NORMAL/5000 + `wal_autocheckpoint = 1000` + `temp_store = MEMORY` – bei unverändertem `shouldUseNetworkSafeMode()` (return true), dessen Ergebnis nur noch geloggt wurde (toter Code bis zur Löschung). Verlauf der Journal-Strategie also: WAL (25.02.) → DELETE+FULL als Default (02.03.) → zurück zu WAL (07.03., "perf(fileshare)") → SQLite komplett raus (31.05.). Kein Commit begründet die Rückkehr zu WAL; plausibel ist, dass DELETE+FULL über SMB zu langsam war (jeder Write = fsync + Journal-Datei anlegen/löschen über das Netz) und die Perf-Krise (Phase 5) auslöste [Interpretation, nicht belegt].

### 1c. Arbeitsrhythmus (git log --date=format:%H, Commits pro Tag)
- 45 Commits am 25.02., 36 am 26.02., 24 am 05.03., 14 am 07.03. – Burst-Muster.
- 21 Commits zwischen 0 und 3 Uhr nachts (13+5+3), 40 zwischen 21 und 24 Uhr. Die SMB-Fixes (23df61d, c9f312d, 4a098e7) liegen alle zwischen 00:47 und 01:10.
- Gesamt: +70.488 / −20.827 Zeilen in 206 Commits. Phase P3–6 (März) allein +32.726/−13.722 (Refactoring + Utility-Prozess + Löschungen); P7–8 (JSON+BDD) +3.865/−5.198 (Netto-Abbau).

## 2. Churn-Hotspots

Quelle: `git log --format= --name-only | sort | uniq -c | sort -rn`

| Änderungen | Datei | Interpretation |
|---:|---|---|
| 46 | src/renderer/src/App.tsx | Renderer-Monolith bis zum Refactoring 04./05.03.; danach in app/*.ts-Hooks aufgeteilt (heute 29 Dateien / 4.165 Zeilen unter src/renderer/src/app) |
| 33 | src/renderer/src/styles/app.css | Ein globales Stylesheet für alles |
| 33 | src/main/services/updater.ts | Updater: 33 Änderungen, heute noch 569 Zeilen (größte Service-Datei) |
| 30 | src/main/main.ts | Bootstrap; Updater-Init, DB-Bridge, Fenster, Shutdown alle hier |
| 29 | src/main/ipc/register-ipc.ts | IPC-Monolith, später in 18 register-*-Dateien (1.850 Zeilen) aufgeteilt |
| 27 | src/shared/ipc.ts | IPC-Vertrag; heute 422 Zeilen (Lint-Warnung > 400) |
| 25 | package.json | Build-/Dependency-Churn |
| 23 | src/main/preload.ts | Jeder neue IPC-Kanal = Preload-Änderung |
| 20 | src/shared/types.ts | |
| 20 | .github/workflows/build-main.yml | CI-Workflow 20× geändert (NATO-Tags, latest.yml, Signing, pacman, Retries) |
| 18 | StartView.tsx | |
| 17 | README.md | trotzdem veraltet (Abschnitt 6) |
| 16 | test/updater.test.ts | größte Testdatei (581 Zeilen) |
| 15 | SettingsView.tsx | Settings = Debug-Konsolen-Sammelbecken (Sync-Log, UDP-Monitor, Peer-Status, DB-Pfad) |
| 14 | test/einsatz.test.ts, InlineEditors.tsx, services/einsatz.ts, services/clients.ts, db/connection.ts | connection.ts: 14 Änderungen an einer 60–190-Zeilen-Datei = SMB-Kampf |
| 11 | useEinsatzData.ts, useAppViewModel.ts, db/schema.ts | |

Aussage: Die instabilen Bereiche sind (1) die Renderer-Orchestrierung (App.tsx → Hook-Geflecht mit heute 91 tsc-Fehlern, siehe 4), (2) der Updater samt CI-Release-Pipeline (updater.ts 33×, build-main.yml 20×, package.json 25×) und (3) die DB-Verbindungsschicht (connection.ts 14×, clients.ts 14×). Die Fachlogik (einsatz.ts 14×, danach in einsatz-write/* aufgeteilt) ist vergleichsweise ruhig.

## 3. Aufwandsverteilung nach Themen (Commit-Anteile)

Klassifikation per Schlüsselwort über Commit-Subjects (Datei: scratchpad/analysis/commit-kategorien.tsv, manuell plausibilisiert; einzelne Commits sind gemischt, z. B. 74eaa1e "BEREITSTELLUNGSRAUM type and improve updater fallback").

| Kategorie | Commits | Anteil | Bemerkung |
|---|---:|---:|---|
| Fachfeatures/UI | 58 | 28 % | inkl. Taktische Zeichen/STAN (~10), Stärke-Monitor, Erfassungsbogen, Helfer |
| Updater / Peer-Update / Release-CI / Signing | 50 | 24 % | 33× updater.ts; LAN-Peer-Updater ist ein eigenes Subsystem (update-peer*.ts 6 Dateien) |
| Datenhaltung / Sync / Locking / SMB / JSON-Migration | 40 | 19 % | davon 10 JSON-Store, 8 SMB/SQLite-Pragmas/Lock-Fehler, 6 UDP-Sync/Debug, 2 Record-Lock, 4 Client-Presence |
| Tests / CI / Lint / Coverage | 23 | 11 % | Coverage-Schwellen ab Tag 1, BDD im Juni |
| Refactoring | 11 | 5 % | fast alle 04./05.03. |
| Performance | 11 | 5 % | alle 06.–08.03. + 3 UX-Overlay-Fixes Juni |
| Docs/Chore | 9 | 4 % | |
| Sonstiges | 4 | 2 % | |

Code-Umfang heute (find/wc): Updater+Peer-Services 2.225 Zeilen (33 % aller Service-Zeilen von 6.703) + 2.985 Testzeilen (62 % aller 4.798 Testzeilen!). Sync/Lock/Clients/Backup/Debug 721 Zeilen + 712 Testzeilen. Fachliche Write-Services (einsatz-write/*) + Read-Service + Command ≈ 1.000 Zeilen.
→ Rund 45 % der Commits und über die Hälfte des Test-Codes betreffen Infrastruktur (Updater, Release, Sync, Locking, Datenhaltung), nicht die Fachdomäne.

## 4. Qualitätsbefund (Befehle + Ergebnisse wörtlich, ausgeführt 2026-09-07 in /Users/johannes/Developer/S1-Control, node_modules vorhanden: 533 Pakete)

### 4.1 `npm run typecheck` → GRÜN, aber ein No-op
```
> tsc --noEmit
npm run typecheck  0.12s user 0.06s system 41% cpu 0.435 total
EXIT=0
```
Laufzeit 0,4 s ist verdächtig. Ursache: `tsconfig.json` = `{ "files": [], "references": [main, renderer] }`. `tsc --noEmit` ohne `-b` prüft bei einem reinen Referenz-Root **keine einzige Datei** (`npx tsc --noEmit --listFiles | grep -v node_modules | wc -l` → 0). Der Typecheck in `npm run build` und in allen vier CI-Build-Jobs (build-main.yml:157, 213, 268, 325) ist damit wirkungslos. `tsc -b --dry` bestätigt, dass Build-Mode beide Projekte bauen würde.

Tatsächlicher Stand bei projektweiser Prüfung:
- `npx tsc -p tsconfig.main.json --noEmit` → **42 Fehler** (deckt sich exakt mit Commit-Body 431eee2: "tsconfig.main.json errors: 42 (vs 97 on main branch — all remaining are pre-existing)" – der Zustand ist seit 01.06. bekannt und unverändert). Verteilung: test/update-peer-feed.test.ts 5, test/utils.test.ts 5 (TS6307: Renderer-Utils nicht im main-Projekt), services/app-version.ts 5, main-db-bridge.ts 4, test/main-window.test.ts 3, test/updater-peer-flow.test.ts 3, stan/thw-stan-inference.ts 3, register-ipc.ts 2, tactical-sign/scoring.ts 2, update-peer-transfer.ts 2, test/e2e/behavior.smoke.spec.ts 2 (TS2584 'document' fehlt – e2e-Datei im main-Projekt), je 1 in update-peer.ts, updater-artifact.ts, 3 renderer/utils.
- `npx tsc -p tsconfig.renderer.json --noEmit` → **91 Fehler**: 61× TS2503 "Cannot find namespace 'JSX'" (React-19-Typen haben den globalen JSX-Namespace entfernt; Rückgabetyp `JSX.Element` in Views), 16× TS2322, 4× TS2345, 3× TS2339, 3× TS18047 u. a. Inhaltlich echte Typbrüche, z. B.:
  - `src/renderer/src/app/app-view-props.ts(145,3)`: Property 'onEditAbschnitt' is missing … (gehört zum aktuellen, ungecommitteten Feature)
  - `app-view-props.ts(153,39)`: Property 'selectedAbschnittId' does not exist on type 'WorkspaceUiStateResult'
  - `AppWorkspaceShell.tsx(221,5)`: Record<string, {isSelf,computerName,userName}> not assignable to Record<string, RecordEditLockInfo | undefined>
  - `useSystemActions.ts(106,11)`: 'props.moveDialog' is possibly 'null'
  - `WorkspaceContent.types.ts(10,3)`: Module '"@renderer/types/ui"' has no exported member 'AbschnittDetails'
  - 7× Setter-Typen `(next: X) => void` vs. `Dispatch<SetStateAction<X>>` in AppWorkspaceShell.tsx(289–313)
- Der Renderer wird von Vite gebaut (kein Typecheck) – die App läuft trotz 91 Typfehlern.

### 4.2 `npm run lint` → GRÜN mit 15 Warnungen
```
✖ 15 problems (0 errors, 15 warnings)
npm run lint  4.36s user 0.75s system 78% cpu 6.536 total
EXIT=0
```
Warnungen: max-lines-per-function (registerEinsatzCreateHandlers 101, registerAbschnittHandlers 104, registerEntityCommandHandlers 127, registerHelferHandlers 102, registerEditLockHandlers 104, useEinsatzData 108, UpdaterNotices 95), max-lines (register-einsatz-ipc.ts 416, shared/ipc.ts 422), complexity (heuristicVehicles 14, inferThwStanPreset 13, toCoreSignSpec 11, useEinsatzData-Arrow 15, EinheitFormRows-Arrow 13), react-hooks/exhaustive-deps (useEinsatzData.ts:134). Die in AGENTS.md §6 als Pflicht formulierten Grenzen (400/80/10) sind als Warnungen konfiguriert und werden an 15 Stellen gerissen.

### 4.3 `npx vitest run --reporter=verbose` → ROT (1 flaky Test)
```
 FAIL  test/updater.test.ts > updater service - init and checks > falls back to GitHub check and reports available only when remote is newer
Error: Test timed out in 5000ms.
 ❯ test/updater.test.ts:129:3
 Test Files  1 failed | 35 passed (36)
      Tests  1 failed | 189 passed (190)
   Duration  5.73s (transform 1.18s, setup 0ms, collect 3.81s, tests 6.82s, environment 3ms, prepare 2.98s)
EXIT=1
```
Isolierter Rerun `npx vitest run test/updater.test.ts` (2×): "Tests 24 passed (24)", Duration 4,51 s bzw. 9,88 s → der Test ist timing-abhängig (5212 ms gegen 5000 ms Timeout) und flaky unter Parallellast. Keine Native-Module-Probleme: better-sqlite3 wird von keinem Test mehr importiert.

### 4.4 Sonstige Befunde
- Working Tree: 14 geänderte Dateien, +517/−189 Zeilen ungecommittet (Feature "Einsatz-Basisdaten bearbeiten"), plus untracked tsconfig.renderer.tsbuildinfo.
- Lokale Artefakt-Verzeichnisse coverage/, dist/, dist-electron/, dist-renderer/, e2e-report/, test-results/, einsatz/ (Laufzeitdaten) liegen im Repo-Ordner (gitignored).

## 5. Testabdeckung nach Bereichen

Quelle: `ls test/`, `wc -l`, vitest.config.ts, playwright.config.ts, e2e/.

| Bereich | Testdateien | Zeilen | Bewertung |
|---|---|---:|---|
| Updater + Peer-Update | updater (581), update-peer-service-flow (294), update-peer-transfer (193), updater-peer-flow (172), update-peer-feed (163), update-peer-http-handler (142), update-peer (91), update-peer-offers (91), update-peer-protocol (85), update-peer-discovery (57), app-version (80), startup-recovery (72) | 2.021 | Am dichtesten getestet – 42 % aller Unit-Test-Zeilen für ein Subsystem, das mit der Fachaufgabe nichts zu tun hat |
| Fachlogik Main (Einsatz/Command/Export) | einsatz (390), command (211), export (75), command-guard-fahrzeug (27), behavior.einsatzfluss (72), behavior.abschnitt-bearbeiten (63), behavior.einsatz-basisdaten (50), behavior.fileshare-engpass (83) | 971 | Mittel; einsatz.test.ts wurde bei der JSON-Migration von 1.034 auf 280 Zeilen gekürzt (431eee2), inzwischen 390 |
| Sync/Lock/Clients/Backup/DB-Bridge | einsatz-sync (193), record-lock (120), clients (140), backup (112), main-db-bridge (147), einsatz-files (72), einsatz-read-cache (90) | 874 | Vorhanden, aber alles Single-Prozess mit gemockten Timern; kein Test mit zwei echten Clients/Prozessen auf einer Datei |
| Taktische Zeichen / STAN | tactical-signs (128), tactical-sign-inference (88), thw-stan-inference (22), tactical-sign-fallback (25) | 263 | ok |
| Renderer | utils (126: Stärke-Format, NATO-Zeit, Assets), tactical-sign-fallback (25) | 151 | **Nur reine Utility-Funktionen.** Kein einziger Komponenten- oder Hook-Test: kein jsdom/happy-dom, keine @testing-library in package.json; vitest environment: 'node'. 10.097 Zeilen Renderer (88 Dateien, 4.165 Zeilen Hooks in app/) sind unit-ungetestet – dort sitzen auch die 91 Typfehler |
| Sonstige | debug (107), strength-display (121), main-window (79), auth (71) | 378 | |
| E2E (Playwright-BDD) | e2e/features/einsatz-lifecycle.feature (10 Szenarien: Einsatz anlegen, Einheit anlegen, Abschnitte, Verschieben, Gesamtstärke, Undo, Fahrzeug, Persistenz nach Neustart, Split) + steps (554 Zeilen), test/e2e/behavior.smoke.spec.ts | 554 | Einzige Absicherung des Renderers; läuft nicht in CI (build-main.yml führt nur `npm run test:coverage` aus) |

Coverage-Konfiguration (vitest.config.ts:14–20): `include: ['src/main/services/**/*.ts', 'src/renderer/src/utils/**/*.ts']`, Schwellen 75 %. Die 75 % (README:145 "Mindestabdeckung") gelten also nur für Services + Renderer-Utils; IPC-Handler (1.850 Zeilen), json-store (399), Renderer-Komponenten/Hooks (≈9.900) sind von der Messung ausgenommen.

Fazit: Gut getestet ist der Updater; die Fachlogik ist mittel getestet; Multi-Client-Verhalten ist nur simuliert; der Renderer ist unit-ungetestet und wird nur durch 10 E2E-Szenarien abgedeckt, die nicht in CI laufen.

## 6. Dokumentationsdrift (README.md, AGENTS.md, agends.md, TODO.md)

Ist-Stand Code: JSON-Dateien (`src/main/db/connection.ts` importiert nur json-store; `readEinsatzFile` prüft Magic-Byte `{`; Systemdatei heißt `_system.json` (connection.ts:15); Locking via `<datei>.lock`-Sidecar (file-lock.ts:14); Schreiben = ganze Datei als pretty-printed JSON via tmp+rename (einsatz-store.ts:19–23)). Kein SQLite-Import mehr in src/ (grep leer).

| Datei:Zeile | Veraltete Aussage | Ist |
|---|---|---|
| README.md:23 | "Jeder Einsatz liegt in einer eigenen SQLite-Datei (`.s1control`)" | JSON-Datei mit Endung .s1control |
| README.md:24 | "Legacy-Dateien mit Endung `.sqlite` können weiterhin geöffnet werden" | connection.ts:24–31: nicht-JSON-Datei wird beim Öffnen **durch ein leeres Skelett überschrieben** (Datenverlust statt Legacy-Support) |
| README.md:25 | "Mehrere Clients können dieselbe Einsatzdatei auf einem Share nutzen (WAL-Modus)" | kein WAL; siehe 8.3 zur tatsächlichen Multi-Client-Fähigkeit |
| README.md:63–64 | Stack "SQLite (WAL + busy timeout)", "Drizzle ORM + better-sqlite3" | entfernt (f0a5fec) |
| README.md:95 | "`npm run test`: Vitest (DB/Command)" | |
| README.md:107 | Hinweis zu better-sqlite3 Cross-Build | kein natives Modul mehr nötig – aber `rebuild:native` läuft weiterhin (7.2) |
| README.md:127–133 | "Jeder Einsatz wird als eigene SQLite-Datei angelegt", "Systemdatenbank … `_system.s1control`", vier PRAGMAs | `_system.json`, keine PRAGMAs |
| README.md:138 | "Alle Writes laufen im Main-Prozess, jeweils in Transaktionen" | keine Transaktionen; ctx.save() schreibt Gesamtdatei |
| README.md:140 | "Undo … via `einsatz_command_log`" | Array `commandLog` in JSON (einsatz-store.ts:57) |
| README.md:145 | "Mindestabdeckung: 75%" | stimmt formal, aber nur für services+utils (5.) |
| README.md:155 | Export enthält "DB-Kopie (`einsatz.s1control`)" | Kopie der JSON-Datei [nicht geprüft, ob Dateiname stimmt] |
| AGENTS.md:26 | Verbot "SQL, Drizzle, `better-sqlite3` … im Renderer" | gegenstandslos |
| AGENTS.md:28, 40 | "Nebenläufige Schreibpfade ohne Transaktion" verboten, "Jeder Write in expliziter Transaktion" | es gibt keine Transaktionen mehr |
| AGENTS.md:35–39 | "DB-Open muss immer diese Pragmas setzen: WAL/NORMAL/FK/5000" | keine DB |
| AGENTS.md:42 | "Sperr-/Heartbeat-/Client-Tabellen" | Arrays in _system.json |
| AGENTS.md:89 | "bei UI-Logik auch Renderer-Tests" | es existiert keine Renderer-Testinfrastruktur |
| AGENTS.md:123–126 | "agends.md ist Altbestand" | agends.md existiert weiterhin (Doppelpflege) |
| agends.md:19, 26 | "DB: SQLite über better-sqlite3 + Drizzle", "DB Schema/Migration: src/main/db/**, drizzle/**" | db/schema.ts, db/migrate.ts gelöscht; drizzle/ (10 SQL-Dateien) und drizzle.config.ts liegen noch im Repo und werden per package.json:92 `"drizzle/**/*"` **weiterhin ins Paket gebündelt** |
| agends.md:38–46 | .sqlite legacy, `_system.s1control`, PRAGMAs | s. o. |
| agends.md:50 | "Aktive Clients werden in DB geführt (`active_client`)" | `activeClients`-Array |
| TODO.md:3–7 | "Utility-Prozess-Auslagerung abschließen" – alle Punkte [x] | Utility-Prozess wurde gelöscht (f0a5fec); `src/main/db-runtime.ts` ist ein 2-Zeilen-Stub ("no longer used in JSON store mode. Kept as stub to avoid breaking the electron-builder entry point config"); main-db-bridge.ts (172 Z.) + shared/db-runtime.ts (542 Z.) sind toter Code, werden aber in main.ts:18/355 noch instanziiert und in register-sync-ipc.ts:15 abgefragt |
| package.json:111–112, 125, 134 | dependencies better-sqlite3, drizzle-orm, @types/better-sqlite3, drizzle-kit | ungenutzt, aber installiert und nativ rebuildet |

Kein Dokument erwähnt JSON-Store, `_system.json`, `.lock`/`.tmp`-Sidecars (nur .gitignore:23–25 kennt sie) oder die Migration.

## 7. Build/Release-Pipeline

Quelle: .github/workflows/build-main.yml (390 Zeilen), scripts/*.cjs, package.json.

- **Trigger**: jeder Push auf main = Release (build-main.yml:3–6). Job `prepare` erzeugt Tag `YYYY.MM.DD.HH.MM` (UTC, Zeile 26) und SemVer-Variante `YYYY.M.D-H.M` (Zeile 27) für electron-updater, pusht den Tag (Zeile 37–38). Das Tag-Format brauchte drei Anläufe am 25.02. (3ab574d, 1cc77d3, 4069eac) und README:112–113 nennt es "NATO"-Format, obwohl es eine reine UTC-Zeitstempelung ist.
- **Matrix**: test (ubuntu, coverage + Codecov), build-mac (Developer-ID-Signing + Notarisierung via App-Store-Connect-API-Key; 5 Secrets, Validierung Zeile 124–132, Zertifikatsprüfung 142–150 mit continue-on-error), build-win (portable + NSIS), build-linux (deb), build-linux-arch (pacman, braucht libarchive-tools), release (softprops/action-gh-release). Jeder Build-Job wiederholt lint+typecheck(no-op)+build:renderer+build:main+rebuild:native.
- **Native Rebuild**: scripts/rebuild-native.cjs führt `npm rebuild better-sqlite3 --runtime=electron --target=<electron-version> --dist-url=https://electronjs.org/headers` aus – auf allen vier Plattformen, obwohl better-sqlite3 seit 31.05. nicht mehr importiert wird. Historisch: 72d2de4 "rebuild native sqlite for electron and target node20" (25.02.), README:107 warnt vor Cross-Build-Problemen. Das ist reiner Electron/N-API-Ballast.
- **Update-Metadaten**: scripts/ensure-update-metadata.cjs erzeugt latest.yml/latest-mac.yml/latest-linux.yml nachträglich mit sha512, falls electron-builder sie nicht liefert; CI bricht ohne sie ab (Zeile 167–169, 220–224, 274–277). Entstanden aus fünf Fix-Commits an einem Tag (0c0315f, f157843, a6f350b, 2e8f365, 8d5c9f3 am 26.02.). build-resources/app-update.yml zeigt auf generic-Feed `github.com/wattnpapa/S1-Control/releases/latest/download`.
- **Versionierung**: scripts/run-electron-builder.cjs injiziert `extraMetadata.version` (SemVer) und `s1DisplayVersion` (Zeitstempel) sowie CFBundleShortVersionString auf mac; im Code existiert dafür updater-versioning.ts (226 Zeilen) und app-version.ts; jüngster Bug ffa14f8 (07.06.) "Versionsvergleich erkennt neue Builds am selben Tag".
- **LAN-Peer-Updater** (c14ece8 ff.): Clients bieten heruntergeladene Artefakte per UDP-Discovery + lokalem HTTP-Feed anderen Clients an (update-peer.ts 312, -transfer 129, -protocol 101, -feed 92, -discovery, -offers; updater-peer-flow.ts 123). Begründung laut AGENTS.md §5: Internet-Fallback muss bleiben, Peer nur mit Hash-Validierung. Aufwand: 6 Service-Dateien + 8 Testdateien (1.230 Testzeilen).
- **Was hängt an Electron**: electron-builder-Konfiguration (package.json "build"), NSIS/dmg/deb/pacman-Targets, Notarisierung mit hardenedRuntime, electron-updater + generic feed + latest*.yml, rebuild-native (N-API), tsup-Bundling von main/preload/db-runtime (package.json dev:main/build:main bündeln weiterhin den db-runtime-Stub), electronmon-Problematik (660b9b7: Dev-Restart bei Datendatei-Änderung, weil Daten im Repo-Ordner lagen).
- **Aufwendig**: 20 Änderungen an build-main.yml, 25 an package.json, ~15 CI-Fix-Commits; Windows-Job baut portable und NSIS getrennt (Zeile 217–218); vier Plattform-Jobs × identische Schrittkette; Signing-Secrets nur für mac (Windows unsigniert).

## 8. Was hat am meisten Zeit gekostet – und würde bei einem Neuanfang wegfallen oder anders gemacht

### 8.1 Rangfolge nach Commits/Code/Nachtarbeit
1. **Updater + Release-Pipeline + LAN-Peer-Update** (50 Commits, 24 %; 2.225 Service-Zeilen; 2.985 Testzeilen; updater.ts 33× geändert; letzter Bug 07.06.). Ursachen: electron-updater-Eigenheiten (generic vs. github provider, latest*.yml, setFeedURL-Fehler, Startup-Crash, Timeouts blockieren Shutdown), Zeitstempel-Versionen vs. SemVer, Signing/Notarisierung, vier Plattform-Targets ab Tag 1. Bei einem Neuanfang: Plattformen auf das tatsächlich im Einsatz genutzte OS begrenzen [offen: welches], Update-Mechanismus der Plattform (Tauri-Updater bringt Signaturprüfung mit, ist aber ebenfalls Pflege [unbelegt]) oder schlicht "Installer von USB/Share" – der LAN-Peer-Updater löst ein Problem (Internet fehlt im Einsatz), das ein Share-Ordner mit Installer ebenfalls löst.
2. **SQLite über SMB** (Phase 2 + 5, mind. 20 Commits, viele nachts; danach 1.200 Zeilen Utility-Prozess, danach Komplettabriss): Kernproblem war nicht SQLite an sich, sondern (a) SQLite-Locking über SMB mit mehreren Hosts ("WAL is not reliable across many SMB/NAS setups", 0ca506a), (b) synchrone better-sqlite3-Aufrufe über Netzlatenz im Electron-Main-Prozess (SLO "DevTools öffnen < 500 ms" nötig, TODO.md:10), (c) fehlende Änderungsbenachrichtigung → eigener UDP-Sync. Jede dieser drei Ursachen bleibt bei Tauri+rusqlite bestehen, wenn die SQLite-Datei auf dem Share liegt: SMB-Locking-Semantik ist unabhängig vom Binding; rusqlite ist ebenfalls synchron (in Rust aber leicht in einen Thread auszulagern, was das Main-Thread-Problem entschärft); Change-Notification fehlt weiterhin. Eine grüne Wiese muss zuerst die Datenhaltungsstrategie für "mehrere Clients, eine Datei, SMB, kein Server" entscheiden – der Technologie-Stack ist zweitrangig.
3. **Renderer-Orchestrierung** (App.tsx 46×, zwei Refactoring-Tage, heute 29 Hook-Dateien mit 91 Typfehlern, Prop-Drilling mit 51+ Props laut TS-Fehler in app-view-props.ts:145). Ohne Renderer-Tests und mit wirkungslosem Typecheck sammelte sich hier unbemerkt Schuld an. Bei einem Neuanfang: State-Management-Entscheidung (Store statt Prop-Bündel), Typecheck als echtes Gate (`tsc -b`), Komponententests von Anfang an.
4. **Debug-/Diagnose-Infrastruktur** als Reaktion auf Nicht-Reproduzierbarkeit (Sync-Log-Konsole 6def01a, UDP-Monitor 47e134c/ac8f237, Peer-Status 3704260, Perf-Safe-Mode ed4b95a, SLO-Skripte 07a7fd0, debug.ts 107 Testzeilen): Symptom fehlender lokaler Multi-Client-Testbarkeit. Neuanfang: eine Testumgebung, die zwei Clients gegen ein simuliertes Share fährt, bevor Produktivcode entsteht.
5. **Refactoring/Guardrails nach 8 Tagen** (14 Commits 04./05.03., sonarjs-Regeln, generierte Docblocks "Handles X.") – Kosten des Tempo-Starts (81 Commits an zwei Tagen).

### 8.2 Was bei einem Neuanfang wegfiele
- rebuild-native + better-sqlite3/drizzle-Reste, drizzle/-Bundling, db-runtime-Stub, main-db-bridge (716 Zeilen toter Code).
- Utility-Prozess-Schicht (bereits gelöscht; die Idee war Electron-spezifisch).
- LAN-Peer-Updater (falls Update-Verteilung anders gelöst wird).
- Arch/pacman-Job, ggf. Linux insgesamt [offen].
- Doppelte Agent-Dokumente (AGENTS.md/agends.md) und README-Abschnitte, die eine nicht mehr existierende Architektur beschreiben.

### 8.3 Was anders gemacht werden müsste (unabhängig vom Stack)
- **Der JSON-Store löst das Multi-Client-Problem derzeit nicht, er umgeht es**: `ctx.einsatz` wird beim Öffnen einmal in den Speicher geladen (connection.ts:26/37); `save()` schreibt das In-Memory-Objekt komplett zurück (connection.ts:52–58), ohne vorher von Platte zu lesen; `writeSeq` wird gesetzt, aber nirgends verglichen (grep: einzige Verwendung connection.ts:54); `getFileMtime` (einsatz-store.ts:38) wird nirgends aufgerufen; ein Remote-UDP-Signal wird in main.ts:364–365 nur an die Renderer-Fenster weitergereicht, kein Reload des Kontexts; einziger Reload-Pfad ist Neu-Öffnen/Backup-Restore (register-einsatz-ipc-support.ts:78). Folge: Client A und B öffnen dieselbe Datei; B speichert; A sieht B's Änderung nicht (liest aus eigenem Speicher) und überschreibt sie beim nächsten `save()` (Lost Update). Die `.lock`-Datei schützt nur den Schreibvorgang selbst (tmp+rename), nicht die Konsistenz. Nur `_system.json` (Heartbeats alle 5 s, clients.ts:9/139–164; Record-Locks, record-lock.ts:60/109/133) wird per read-modify-write unter Lock bearbeitet – dafür schreibt jeder Client alle 5 s die komplette Systemdatei neu über das Netz. [Laufzeitverhalten mit zwei Clients nicht getestet – Befund aus Code-Lesung; siehe openQuestions.]
- Die Datei-Lock-Implementierung (file-lock.ts) nutzt `writeFileSync(..., {flag:'wx'})` als Mutex mit 10-s-Stale-Übernahme und im Sync-Pfad `Atomics.wait`-Busy-Spin (file-lock.ts:46) im Main-Prozess – dieselbe Blockade-Klasse, die den Utility-Prozess motiviert hatte.
- Echte Typprüfung im Gate (`tsc -b` statt `tsc --noEmit` auf Referenz-Root); Renderer-Tests; E2E in CI.
- Commit-Bodies/ADRs für Architekturentscheidungen: Für die drei größten Entscheidungen (per-Einsatz-SQLite 8199070, Utility-Prozess 4b66ce2, JSON-Migration c895599…f0a5fec) existiert keine schriftliche Begründung im Repo.
- Release nicht bei jedem Push; Plattformumfang aus dem tatsächlichen Einsatzbedarf ableiten.

## 9. Offene Fragen
siehe openQuestions im Rückgabewert.
