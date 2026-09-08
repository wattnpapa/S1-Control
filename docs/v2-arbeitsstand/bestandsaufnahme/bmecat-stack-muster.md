# bmecatEditor als Referenz-Stack für S1-Control v2 (Key: bmecat-stack-muster)

Stand: Bericht wird fortlaufend geschrieben; jeder Abschnitt wird nach Abschluss ergänzt.

## Gliederung
0. Repo-Überblick (Zahlen, Commits, Struktur)
1. Architektur (Workspace, Schichtung, Modulgrößen, AppState/Mutex, Guards, Cancel, Worker, Events, Fehler)
2. Tauri-Konfiguration (tauri.conf.json, capabilities, Plugins, CSP, Bundle, Signing, Ressourcen)
3. SQLite-Nutzung (storage.rs)
4. Frontend (api.ts, Komponenten, State, Virtualisierung, CSS, Typgleichheit)
5. Tests (Rust, E2E, Compile-Zeit)
6. CI/Distribution (Bitbucket, GitHub, Vergleich S1-Control)
7. Arbeitsweise/Doku
8. Übertragbarkeit (Musterkatalog, Matrix, Projektstruktur-Vorlage)
9. Risiken des Tauri-Wegs
10. Offene Fragen

---

## 0. Repo-Überblick bmecatEditor

Quelle: `git log`, `wc -l`, `ls -la` im Repo /Users/johannes/Developer/bmecatEditor (nur lesend).

- **Historie:** 16 Commits auf `master`, erster Commit 2026-08-13 16:58, letzter 2026-08-21 16:19 (9 Kalendertage). Meilensteine in Commit-Betreffs: „Basis-Commit: Viewer/Editor komplett, Import-Assistent M0+M1", „M2: Excel-Import…", „M3: Profile, Signaturen…", „M4: DIA-Format Rust-Kern — Schema v7", „M5+M6: Typisierte Merkmalsanzeige…", „M7: DIA-Fehlerprotokoll…", „M8: Feinschliff", danach 4 Commits „Datenqualität" (Konzept → Kern/Schema v9 → UI → E2E). Muster: **ein Commit je Meilenstein/Konzeptstufe, sehr grobkörnig** (Basis-Commit enthält bereits Viewer+Editor komplett).
- **Cargo-Workspace** (`Cargo.toml:1-3`): members = `crates/bmecat-core`, `src-tauri`; `resolver = "2"`; Release-Profil `lto = "thin"`, `codegen-units = 1` (`Cargo.toml:5-7`); Dev-Profil optimiert gezielt Parser/DB-Crates (`quick-xml`, `flate2`, `miniz_oxide`, `rusqlite`, `libsqlite3-sys`) mit `opt-level = 3` (`Cargo.toml:11-20`) – Kommentar: damit Test-Importe großer Kataloge im Dev-Modus schnell sind.
- **Rust-Zeilen (wc -l):** Kern-Crate gesamt ~31.500 Zeilen in 11 Modulen: `table_import.rs` 11.322 (429,7 KB), `quality.rs` 5.885 (244,6 KB), `edit.rs` 4.327 (162,7 KB), `import.rs` 2.584, `query.rs` 1.549, `export.rs` 1.546, `eclass.rs` 1.382, `dia.rs` 1.225, `storage.rs` 703, `model.rs` 407, `validate.rs` 181, `lib.rs` 34. Tests: `tests/quality.rs` 3.390, `tests/dia_format.rs` 1.299. Glue: `src-tauri/src/lib.rs` **2.185 Zeilen / 82,6 KB**, `main.rs` 6 Zeilen.
- **Hinweis zur Frage „lib.rs hat 84 KB":** Die 84 KB beziehen sich auf `src-tauri/src/lib.rs` (Glue), NICHT auf `crates/bmecat-core/src/lib.rs` (das hat 34 Zeilen / 835 B und enthält nur `pub mod`-Deklarationen, Re-Exports und den `Error`-Enum). Bewertung folgt in §1.
- **TypeScript-Zeilen:** gesamt ~20.900; größte Dateien `ImportWizard.tsx` 3.930, `SpecialFeaturesPanel.tsx` 1.461, `types.ts` 1.359, `QualityPanel.tsx` 1.291, `ArticleDetail.tsx` 1.157, `MappingCards.tsx` 1.123, `App.tsx` 912, `api.ts` 730.
- **Ressourcen:** `src-tauri/resources/eclass.sqlite` 234,5 MB, per Git LFS (`.gitattributes:4`: `src-tauri/resources/*.sqlite filter=lfs diff=lfs merge=lfs -text`; Kommentar `.gitattributes:1-3`: GitHub lehnt Blobs > 100 MB ab).
- **Frontend-Abhängigkeiten** (`package.json:18-25`): nur `@tanstack/react-virtual`, `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`, `react` 19, `react-dom` 19. Kein Router, kein State-Manager, keine UI-Bibliothek, kein Test-Runner für Frontend-Units (nur WebdriverIO-Stack, `package.json:33-39,48`).
- **Kern-Crate-Abhängigkeiten** (`crates/bmecat-core/Cargo.toml:8-33`): quick-xml, rusqlite 0.40 (`bundled`, `functions`), flate2, thiserror 2, serde, serde_json, encoding_rs, zip, csv, chardetng, calamine 0.36, regex. Dev: rust_xlsxwriter. Zwei CLI-Bins (`bmecat-import`, `eclass-import`, `Cargo.toml:40-46`) — Kern ist ohne UI benutzbar.
- **Tauri-Crate** (`src-tauri/Cargo.toml`): `tauri = "2"` mit Feature `protocol-asset`; Plugins `tauri-plugin-opener`, `tauri-plugin-dialog`; optionales Cargo-Feature `wdio` zieht `tauri-plugin-wdio-webdriver` + `tauri-plugin-wdio` (`src-tauri/Cargo.toml:13-18,31-34`), Kommentar: ohne Feature wird der Code nicht einmal übersetzt. `crate-type = ["staticlib","cdylib","rlib"]`, lib-Name `bmecat_editor_lib` wegen Windows-Namenskollision (`src-tauri/Cargo.toml:8-11`).

## 1. Architektur bmecatEditor

### 1.1 Schichtung und Workspace
- **Drei Schichten, zwei Crates, ein Frontend:** `crates/bmecat-core` (UI-unabhängig, Cargo-Beschreibung „UI-unabhängiger Kern: BMEcat-Parsing, SQLite-Storage, Queries", `crates/bmecat-core/Cargo.toml:5`) → `src-tauri` (Glue: Commands, AppState, Threads, Events; `src-tauri/src/lib.rs:1` „Tauri-Glue: Commands und Events zwischen bmecat-core und der React-UI") → `src/` (React 19, Vite 7).
- Der Kern ist ohne Tauri lauffähig: zwei CLI-Binaries `bmecat-import` und `eclass-import` (`crates/bmecat-core/Cargo.toml:40-46`). Damit ist der Kern per `cargo test -p bmecat-core` und per CLI testbar, ohne ein Fenster zu starten — genau das, was `docs/ARCHITEKTUR-ENTWURF.md:76` als Ziel nennt („eigenständig testbar … später als CLI oder Server-Komponente wiederverwendbar").
- Re-Export von `rusqlite` aus dem Kern (`crates/bmecat-core/src/lib.rs:15-16`), damit `src-tauri` keine eigene rusqlite-Version pinnt. Gutes Muster gegen Versionsdrift zwischen Crates.
- `src-tauri/src/main.rs` ist 6 Zeilen: nur `windows_subsystem`-Attribut und `bmecat_editor_lib::run()` — Standard-Tauri-2-Vorlage.

### 1.2 Modulgrößen — ist `src-tauri/src/lib.rs` mit 82,6 KB ein Problem?
Befund (`wc -l`): 2.185 Zeilen, 67 `#[tauri::command]`-Funktionen (Zählung in `generate_handler!`, `src-tauri/src/lib.rs:2110-2178`), dazu `AppState`, `FlagGuard`, `guard_belegen`, Hilfsfunktionen für Pfade, Staging, Worker-Threads.

Bewertung:
- **Kein Architekturproblem, ein Ordnungsproblem.** Der Inhalt ist homogen (nur Glue), es gibt keine Fachlogik darin — jede Command-Funktion ist 5–40 Zeilen und delegiert an `bmecat_core::{query,edit,quality,timport,eclass,export}`. Die eigentliche Komplexität liegt im Kern (`table_import.rs` 11.322 Zeilen, `quality.rs` 5.885 Zeilen).
- **Was stört:** Sechs Themenblöcke (Katalog/Import, Edit/Undo, Export, eClass, Tabellen-Import, Qualität) sind nur durch Kommentar-Trennlinien geschieden (`lib.rs:484, 655, 1069, 1617, 1757`). Ein Aufteilen in `commands/{catalog,edit,export,eclass,timport,quality}.rs` plus `state.rs` und `guard.rs` wäre mechanisch und ohne Verhaltensänderung möglich, da Tauri-Commands frei über Module verteilt werden können (`generate_handler!` nimmt Pfade wie `commands::quality::quality_run`).
- **Größeres Problem als lib.rs:** `crates/bmecat-core/src/table_import.rs` mit 429,7 KB / 11.322 Zeilen und `quality.rs` mit 244,6 KB — Einzeldateien dieser Größe verlangsamen inkrementelle Kompilierung (ein Crate = eine Compile-Einheit, aber rustc parallelisiert innerhalb eines Crates nur begrenzt; codegen-units=1 im Release verschärft das) und machen Code-Review schwer. Für S1-Control-v2-Lehre: **Kern von Anfang an in Sub-Module oder mehrere Crates aufteilen** (`s1-model`, `s1-store`, `s1-import-excel`, …), nicht eine Datei je Fachthema wachsen lassen.
- Die 34-Zeilen-`lib.rs` im Kern (nur `pub mod` + `Error` + Re-Exports) ist dagegen vorbildlich schlank.

### 1.3 AppState / Mutex-Muster
`src-tauri/src/lib.rs:21-44`:
```rust
struct AppState {
    conn: Mutex<Option<Connection>>,          // UI-Verbindung zum Katalog
    xml_path: Mutex<Option<PathBuf>>,
    importing: AtomicBool, cancel: Arc<AtomicBool>,
    eclass_conn: Mutex<Option<Connection>>, eclass_building: AtomicBool, eclass_filling: AtomicBool,
    table_importing: AtomicBool, table_cancel: Arc<AtomicBool>,
    score_running: AtomicBool, score_cancel: Arc<AtomicBool>,
    staging: Mutex<Option<StagingSession>>,   // Lock-Reihenfolge: IMMER conn vor staging
}
```
- Registriert per `.manage(AppState{…})` (`lib.rs:2096-2109`), Zugriff in Commands per `State<AppState>` oder `app.state()`.
- **Eine langlebige UI-Connection im Mutex** (`conn`), Zugriff nur über `with_conn(&state, |c| …)` (`lib.rs:307-316`), das den Mutex über die gesamte Closure hält und `Option::None` in „Kein Katalog geöffnet" übersetzt. **Lange Läufe gehen NIE über `with_conn`** — Kommentar `lib.rs:1773-1776`: „nie über with_conn, das den conn-Mutex über die ganze Closure hält und die UI für die Dauer des Laufs einfrieren würde". Worker-Threads öffnen stattdessen **eigene Connections** auf denselben DB-Pfad (`lib.rs:1139-1140, 1834, 984, 633`).
- **Lock-Reihenfolgen sind dokumentiert, nicht nur eingehalten:** `conn` vor `staging` (`lib.rs:40-43, 1172, 1189, 1603`), „Katalog vor eClass" (`lib.rs:924`), und der Worker lässt seine Connection fallen, BEVOR er `state.conn` anfasst (`lib.rs:1829-1832`), sonst hielte er den SQLite-Schreib-Lock während er auf den UI-Mutex wartet.
- `Mutex::lock().map_err(|_| "Lock-Fehler")` überall — Poisoned-Mutex wird als String-Fehler nach oben gegeben, nicht per `unwrap()` panickt.
- **Verbindungslokaler Zustand ist eine Falle**: `temp.selection` (materialisierte Auswahl für virtuelles Scrollen) lebt je Connection. Nach einem Worker-Lauf muss die UI-Connection ihre Auswahl invalidieren (`lib.rs:1563-1566, 1855-1863`). Für S1 relevant, falls TEMP-Tabellen oder ATTACH je Connection benutzt werden.

### 1.4 Guards (`guard_belegen`, `FlagGuard`) und Cancel-Flags
- **Ein `AtomicBool` je nebenläufigem Vorgang, ein `Arc<AtomicBool>` je Cancel-Kanal.** Bewusst getrennt: „ein Abbruch des Scores darf keinen laufenden Import treffen und umgekehrt" (`lib.rs:35-37`).
- **`guard_belegen(eigen, besetzt, fremde)`** (`lib.rs:166-193`): belegt das eigene Flag per `swap(true)` ZUERST, prüft dann die fremden per `load`, gibt bei Kollision das eigene wieder frei. Begründung im Kommentar: Tauri führt Commands auf einem Thread-Pool aus, zwei `invoke` laufen echt parallel; „erst prüfen, dann setzen" hätte ein Zeitfenster, in dem beide durchgelassen werden. Ergebnis: „höchstens beidseitig abgelehnt — nie beidseitig durchgelassen".
- **Bekannte Lücke, ehrlich dokumentiert:** Export belegt kein eigenes Flag (`lib.rs:615-619` „BEKANNTE LÜCKE … Behebung heißt: dem Export ein eigenes Flag geben").
- **`FlagGuard` — RAII-Freigabe über `Drop`** (`lib.rs:198-254`): hält `AppHandle`, einen Funktionszeiger `fn(&AppState) -> &AtomicBool` (weil eine Referenz nicht über die Thread-Grenze getragen werden kann), ein Fehler-Event und Fehlertext. `abschliessen()` = normaler Rückweg (Flag frei, `fertig = true`). `Drop` ohne `fertig` = Panic-Pfad: Flag frei UND Fehler-Event an die UI. Motivation im Kommentar: Ohne das bliebe nach einem Panic im Worker ein Flag gesetzt und sperrte „bis zum Neustart — ohne dass der Nutzer je eine Meldung sähe". Reihenfolge ist festgelegt: **Flag frei, DANN Abschluss-Event**, damit die UI unmittelbar nach `-done` einen neuen Lauf starten darf (`lib.rs:235-236, 1864-1866`).
- **`std::thread::Builder::new().name(…).spawn()` statt `thread::spawn`** (`lib.rs:273-276, 813-815, 1818-1821`): `thread::spawn` panickt, wenn das OS keinen Thread liefert — nach dem Belegen des Guards. Mit `Builder` kommt ein `Err` zurück, das Flag wird zurückgesetzt (`lib.rs:295-298`).
- **Alles Mutex-Pflichtige VOR dem Spawn auflösen** (`lib.rs:1798-1814`): Pfade werden im Command-Thread ermittelt; schlägt das fehl, wird das Guard-Flag zurückgesetzt, bevor `Err` zurückgeht.
- Cancel wird im Kern **an Fensterngrenzen** gelesen (`cancel.load(Ordering::Relaxed)` in `import.rs:1965, 2011, 2032`; Kommentar `lib.rs:1893-1894` „Rückkehr dauert höchstens eine Fensterlaufzeit"). Nutzerabbruch ist ein eigener Fehlerwert `Error::Cancelled` (`crates/bmecat-core/src/lib.rs:26-27`) und wird in der Glue-Schicht zu einem eigenen Event `*:cancelled` statt `*:error` (`lib.rs:125-129, 1871-1874`): „Nutzerabbruch ist kein Fehler: eigenes Event, kein Fehler-Banner."

### 1.5 Worker-Threads und Events an die UI
- **Muster „Command startet, Event beendet":** Lange Commands (`open_catalog`, `export_catalog`, `eclass_build_db`, `eclass_fill_auto`, `table_import_{analyze,stage,dry_run,apply}`, `quality_run`) geben sofort `Ok(())` zurück und melden Fortschritt/Ergebnis per `app.emit(…)`. Namensschema **`<bereich>:<zustand>`**: `catalog:progress|ready|error|cancelled`, `export:progress|done|error`, `edit:progress`, `eclass:progress|ready|error|fill-progress|fill-done|fill-error`, `timport:analyzed|progress|staged|dryrun|done|error|cancelled`, `quality:progress|done|error|cancelled`. Insgesamt 26 Event-Namen (gezählt in `src/api.ts` `listen<…>`-Aufrufe).
- **Fortschritts-Drossel auf 150 ms** überall gleich (`lib.rs:118-123, 557-566, 634-640, 1338-1359, 1836-1851`; eClass-Fill 100 ms `lib.rs:1000`). Zusätzlich `done == 0 || done >= total` erzwingt erstes und letztes Event (`lib.rs:560`). Ohne Drossel würde `emit` die WebView mit JSON-Serialisierung fluten.
- Ein Command ist `async` und nutzt `tauri::async_runtime::spawn_blocking` (`table_import_missing_report`, `lib.rs:1699-1708`) — der Rest ist synchron + manueller `std::thread`. Zwei Stile nebeneinander; für S1 sollte man sich für einen entscheiden (Empfehlung: `spawn_blocking` für „Antwort kommt zurück", eigener Thread + Events für „läuft lang, Fortschritt sichtbar").
- Payloads sind `#[derive(Serialize, Clone)] #[serde(rename_all = "camelCase")]`-Structs, teils in der Glue (`ReadyPayload`, `ErrorPayload`, `StagePhasePayload`, …, `lib.rs:57-74, 1208-1236, 1761-1769`), teils Kern-Typen direkt (`ImportSummary`, `Progress`).
- `.setup(|app| { sweep_staging_dir(app.handle()); Ok(()) })` (`lib.rs:2179-2182`) — Aufräumen verwaister Staging-Dateien beim Start.

### 1.6 Fehlerbehandlung
- **Kern:** ein `thiserror`-Enum `bmecat_core::Error { Xml(String), Db(#[from] rusqlite::Error), Io(#[from] std::io::Error), Cancelled, EncodingMismatch, Other(String) }` und `pub type Result<T>` (`crates/bmecat-core/src/lib.rs:18-34`). Deutsche `#[error("…")]`-Texte, die direkt in der UI landen.
- **Glue:** jeder Command gibt `Result<T, String>` zurück; Konvertierung per `.map_err(|e| e.to_string())` (durchgängig, z. B. `lib.rs:315`). Das ist der einfachste Weg, den Tauri akzeptiert (Fehlertyp muss `Serialize` sein; `String` erfüllt das). **Nachteil:** die UI kann Fehlerarten nicht unterscheiden (nur `Cancelled` wird vorher abgefangen). Für S1 mit Mehrbenutzer-Konflikten („Datei gesperrt von Client X", „Datensatz inzwischen geändert") wäre ein serialisierbarer Fehler-Enum `#[derive(Serialize)] enum ApiError { Busy{by}, Conflict{…}, NotFound, Io(String) }` mit `#[serde(tag="kind")]` sinnvoll — Tauri 2 unterstützt beliebige `Serialize`-Fehlertypen.
- **Fehler verschlucken ist dokumentiert, nicht versehentlich:** `score_nachziehen` verschluckt Fehler mit `eprintln!` und Begründung (`lib.rs:447-450, 462`); Profil-Touch nach Apply ebenso (`lib.rs:1543-1560`).
- Frontend: `errorMessage(e: unknown): string` (`src/api.ts:725-730`) normalisiert String/Error/Sonstiges.

### 1.7 Bewertung der Architektur für S1
Stark: saubere Trennung Kern/Glue/UI, testbarer Kern ohne UI, konsequente Guard-Disziplin mit Begründungskommentaren, RAII gegen hängende Flags, Event-Namensschema, Drossel. Schwach: eine 2.185-Zeilen-Glue-Datei, `String`-Fehler ohne Typ, zwei Nebenläufigkeitsstile, Kern-Dateien >10.000 Zeilen. Für S1 (kleine Dateien, kaum Minutenläufe) ist das Guard-/Worker-Arsenal überdimensioniert — relevant bleiben: `with_conn`-Muster, `FlagGuard`-Idee für jeden Hintergrundlauf (Datei-Watcher, Sync, Update-Download), Event-Namensschema, `Error::Cancelled` als eigener Fall.

## 2. Tauri-Konfiguration

Quelle: `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/tauri.wdio.conf.json`, `src-tauri/Cargo.toml`.

| Punkt | Befund | Bewertung / Bedeutung für S1 |
|---|---|---|
| Schema/Version | `$schema: https://schema.tauri.app/config/2`, `version 0.1.0`, `identifier de.dia-software.bmecat-editor` (`tauri.conf.json:2-5`) | Identifier bestimmt `app_data_dir()` (macOS `~/Library/Application Support/<id>`); S1: z. B. `de.thw.s1control` (wie heute `appId`, `package.json:46`). |
| Build | `beforeDevCommand: npm run dev`, `devUrl: http://localhost:1420`, `beforeBuildCommand: npm run build`, `frontendDist: ../dist` (`tauri.conf.json:6-11`); Vite `strictPort: 1420`, `watch.ignored: **/src-tauri/**` (`vite.config.ts:16-30`) | Standard-Template, direkt übernehmbar. |
| Fenster | genau EIN Fenster `main`, 1440×900, min 1000×640 (`tauri.conf.json:13-21`) | S1 braucht mindestens zwei (Hauptfenster + Stärke-Monitor auf zweitem Bildschirm, vgl. `src/main/services/strength-display.ts` in S1-Control). In Tauri 2: weitere Einträge in `app.windows[]` oder `WebviewWindowBuilder` zur Laufzeit; Capabilities pro Fenster (`windows: ["main","monitor"]`). |
| **CSP** | `"csp": null` (`tauri.conf.json:23`) | **Sicherheitslücke, bewusst oder aus Bequemlichkeit.** `null` schaltet die Content-Security-Policy ab; damit könnte injizierter Code (z. B. aus Katalogdaten, die als HTML gerendert werden) Skripte nachladen. Tauri-Doku empfiehlt dringend eine CSP; die Vorlage setzt `default-src 'self'; connect-src ipc: http://ipc.localhost`. Für S1 (Daten aus fremden Excel-Dateien, Netzwerk-Share) **nicht übernehmen**; CSP mit `img-src asset: http://asset.localhost` für Bilder setzen. [Einordnung teils unbelegt, Tauri-Doku nicht online geprüft] |
| assetProtocol | `enable: true, scope: ["**"]` (`tauri.conf.json:24-27`); Cargo-Feature `protocol-asset` (`src-tauri/Cargo.toml:24`); Nutzung: `convertFileSrc(resolved)` für MIME-Bilder (`src/api.ts:169-174`) | Scope `**` erlaubt der WebView das Lesen JEDER Datei des Nutzers über `asset://`. Nötig, weil Katalogbilder irgendwo liegen. Für S1: Scope auf Einsatzordner + `$APPDATA` begrenzen (`$HOME/**` ist schon zu weit), oder Bilder als Base64 per Command liefern. |
| Capabilities | `default.json`: `windows: ["main"]`, `permissions: ["core:default","opener:default","dialog:default"]` (`capabilities/default.json:5-10`) | Minimal, gut. Tauri-2-ACL: jedes Plugin muss pro Fenster freigegeben werden. `gen/schemas` ist gitignored (`src-tauri/.gitignore:7`). |
| Plugins | `tauri-plugin-opener` (Links/Dateien im System öffnen), `tauri-plugin-dialog` (Datei öffnen/speichern; Nutzung `open, save` in `src/App.tsx:2`) | Nur zwei. Kein `fs`, kein `shell`, kein `store`, kein `updater`, kein `window-state`, kein `log`. |
| WDIO-Overlay | `tauri.wdio.conf.json`: `withGlobalTauri: true`, Inline-Capability `wdio` mit `wdio:default`, `bundle.active: false` (`tauri.wdio.conf.json:3-17`) — zugemischt per `tauri build --config`; Begründung, warum inline und nicht als Datei: `tauri-build` prüft jede Capability-Datei gegen einkompilierte Plugins (`docs/UI-ABNAHME.md:50-57`) | Muster für „Test-Konfiguration überlagert Produktiv-Konfiguration ohne sie zu ändern" — übernehmbar. |
| Bundle | `targets: "all"`, macOS `signingIdentity: "Developer ID Application: Johannes Rudolph (2AKGEZS43R)"`, `hardenedRuntime: true`, `minimumSystemVersion: 10.15`, `resources: ["resources/eclass.sqlite"]`, Icons (`tauri.conf.json:30-46`) | Signing-Identity steht im Klartext in der Konfig (kein Geheimnis, aber CI ohne Zertifikat scheitert daran — bitbucket-pipelines baut deshalb „unsigniert", `bitbucket-pipelines.yml:1`; wie das mit der gesetzten Identity zusammengeht, ist nicht dokumentiert → offene Frage). **Kein `createUpdaterArtifacts`, kein `plugins.updater`** — Updater nur als Kommentar vorgesehen (`.github/workflows/build.yml:9-10`). |
| Ressourcen | `eclass.sqlite` 234,5 MB als Bundle-Ressource via Git LFS; Auflösung `app.path().resolve("resources/eclass.sqlite", BaseDirectory::Resource)` (`lib.rs:670-675`); read-only geöffnet, Nutzer-Kopie im `app_data_dir` hat Vorrang (`lib.rs:677-689`); defekte Nutzer-DB wird als `.broken` beiseitegelegt (`lib.rs:691-707`) | Für S1: StAN-/Einheiten-Stammdaten (heute `scripts/extract-thw-stan-from-zip.cjs`, `package.json:19`) könnten genauso als Bundle-Ressource (SQLite oder JSON) mitgeliefert und im App-Data überschreibbar sein. LFS ist nur bei >100 MB nötig. |
| `withGlobalTauri` | im Produktivbau AUS (nur WDIO-Overlay an) | Richtig: `window.__TAURI__` nicht global exponieren. |

**Zusammenfassung Tauri-Konfig:** Schlank, aber zwei sicherheitsrelevante Abkürzungen (`csp: null`, `assetProtocol.scope: **`), die für ein Katalog-Tool auf einem Einzelplatz vertretbar sind, für S1 im Einsatznetz nicht. Mehrfenster, Updater, Store, Log, Window-State fehlen und wären für S1 neu.

## 3. SQLite-Nutzung (`crates/bmecat-core/src/storage.rs`)

### 3.1 Schema-Versionierung und Migration
- `SCHEMA_VERSION: &str = "9"` (`storage.rs:5`), Ablage in Tabelle `meta(key, value)` unter `schema_version` (`storage.rs:9-12, 630-646`).
- **`migrate(conn) -> Result<bool>`** (`storage.rs:519-608`): lineare Kette `if version == "5" {…} if version == "6" {…} if version == "7" {…} if version == "8" {…}`, jeder Schritt in **eigener `unchecked_transaction()`** mit `commit()` — Begründung `storage.rs:522-526`: BEGIN im SQL-Batch hinterließe bei Abbruch eine offene Transaktion, spätere Edits gingen beim Schließen still verloren. Rückgabe `version == SCHEMA_VERSION`.
- **Idempotente Schritte:** `ALTER TABLE ADD COLUMN` nur, wenn Spalte fehlt (`columns()` via `PRAGMA table_xinfo`, `storage.rs:620-628`; `table_xinfo` statt `table_info`, weil letzteres generierte Spalten verschweigt); `CREATE TABLE/INDEX IF NOT EXISTS`; DDL-Text steht **nur an einer Stelle** (`add_score_tables`, `add_special_key`, `INDEXES`) und wird von Neuanlage UND Migration benutzt (`storage.rs:326-332, 401-415`).
- **Nur additive Migrationen**, keine Datenmigration; Versionen < 5 haben keinen Pfad → Re-Import (`storage.rs:490-492`). `MIGRATABLE_VERSIONS = ["5","6","7","8"]` muss bei jedem Schritt gepflegt werden (`storage.rs:677-684`, Kommentar: „der am leichtesten zu übersehende Schritt").
- Migration läuft **synchron beim Öffnen** (`open_db` → `migrate`, `storage.rs:465`); teure Schritte (Indexaufbau über Millionen Zeilen) werden bewusst hingenommen und dokumentiert (`storage.rs:494-504`). Tabelle mit realen Bestandskatalogen und ihrem Migrationsweg im Doc-Kommentar (`storage.rs:506-518`).

### 3.2 PRAGMAs / WAL
- **Import-DB** (`create_db`, `storage.rs:434-450`): `page_size=8192, journal_mode=OFF, synchronous=OFF, temp_store=MEMORY, cache_size=-131072` (128 MB) — „bewusst nicht crash-sicher", weil in `.bmecatdb.tmp` geschrieben und erst bei Erfolg umbenannt wird (`import.rs:1816, 2084`).
- **Am Ende des Imports:** `PRAGMA journal_mode = WAL; PRAGMA optimize;` (`import.rs:2063`), danach `rename(tmp → db)` (`import.rs:2084`) und Aufräumen verwaister `-wal/-shm` (`import.rs:2080`). **WAL ist also der Betriebsmodus** der fertigen Katalog-DB (sichtbar an `e2e/.home/…/*.bmecatdb-wal`).
- **Lesen/Bearbeiten** (`open_db`, `storage.rs:453-471`): `busy_timeout=5000, cache_size=-65536, temp_store=MEMORY`. `busy_timeout` ist Pflicht, weil Worker und UI-Connection parallel auf dieselbe Datei gehen.
- `is_locked(e)` (`storage.rs:686-693`): erkennt `DatabaseBusy | DatabaseLocked`; wird in `open_db` und `matches_source` genutzt, um „Datei gerade belegt" von „Datei nicht migrierbar" zu trennen — Sperrfehler werden gemeldet statt in den verwerfenden Re-Import zu laufen (`storage.rs:460-469, 665-668`).

### 3.3 Bulk-Insert-Strategie
- Streaming (SAX, quick-xml) mit konstantem RAM (`import.rs:1-6`); `ImportOptions::batch_size = 2000` Artikel je Transaktion (`import.rs:32-41, 1959`); `prepare_cached` für alle Insert-Statements (`import.rs:866, 906, 1013, …`).
- **Indizes und FTS erst nach dem Bulk-Load** (`storage.rs:7` „Tabellen ohne Indizes — Indizes werden erst nach dem Bulk-Load angelegt"; `import.rs:2027 execute_batch(storage::INDEXES)`, `import.rs:1755 execute_batch(storage::FTS)`).
- Gruppen-Zuordnung per SQL-Join über eine Rohtabelle `map_raw` statt In-Memory-Map (`import.rs:4-6, 1172`).
- Gemessen (`docs/ARCHITEKTUR-ENTWURF.md:136-140`): 3,7 GB / 748.072 Artikel in 68 s, ~630 MB RAM; naive `LIMIT/OFFSET` bei Offset 500k kostete 6 s → materialisierte Selektion in TEMP-Tabelle.

### 3.4 FTS
- `article_fts` als **contentless FTS5** (`content='', contentless_delete=1, tokenize='unicode61'`, `storage.rs:423-428`) — spart Platz, verlangt aber manuelle Pflege: `refresh_fts` je Edit (`edit.rs:259-265`) und set-basiert nach Batches (`edit.rs:1608-1618`); `FTS_FIELDS`-Konstante listet die Spalten, die einen Refresh auslösen (`edit.rs:142`).
- eClass-DB: eigene `eclass_fts` mit `bm25`-Ranking und Präfixsuche (`eclass.rs:45, 534-538, 547-549`).

### 3.5 `matches_source`-Cache
- `matches_source(db_path, source_size, source_mtime)` (`storage.rs:652-675`): DB gilt als passend, wenn `schema_version` aktuell (oder migrierbar und nur gesperrt), `meta.source_size` und `meta.source_mtime` mit der XML-Quelle übereinstimmen. mtime fängt In-Place-Änderungen gleicher Länge ab (`storage.rs:650-651`). DB-Dateiname = Stamm + FNV-1a-Hash des kanonischen Pfads (`lib.rs:76-98`).

### 3.6 Was davon ist für kleine Einsatzdateien (KB bis wenige MB) relevant?
| Baustein | Relevanz für S1 v2 | Begründung |
|---|---|---|
| Schema-Version in `meta` + lineare, idempotente, additive Migration in eigenen Transaktionen | **Hoch — 1:1 übernehmen** | Einsatzdateien leben Wochen/Monate, werden mit alten und neuen App-Versionen geöffnet; genau dafür ist das Muster gebaut. Wichtig: Migration muss auf einem Share **atomar gegen andere Clients** sein (Lock oder Copy-Migrate-Rename). |
| WAL | **Nicht auf SMB/NAS** | WAL setzt Shared-Memory (`-shm` via mmap) voraus, das über Netzwerkdateisysteme nicht korrekt funktioniert; SQLite-Doku: WAL „does not work over a network filesystem". Für Dateien auf dem Share: `journal_mode=DELETE` (Standard) oder besser gar keine gemeinsam beschriebene SQLite-Datei (siehe Risiken §9). [SQLite-Doku aus Erinnerung, nicht online geprüft — Kernaussage gilt als gesichert] |
| `journal_mode=OFF`/`synchronous=OFF` beim Import + tmp/rename | **Mittel** — als Muster „in Temp bauen, atomar umbenennen" ja; die PRAGMAs selbst irrelevant | Bei KB-Dateien ist Bulk-Speed egal; das atomare Ersetzen ist aber genau das, was S1 heute mit JSON-Dateien braucht (Crash-Sicherheit beim Schreiben). |
| `busy_timeout` + `is_locked`-Unterscheidung | **Hoch** | Mehrere Clients auf einem Share: „gerade gesperrt" muss eine andere UI-Reaktion auslösen als „kaputt". |
| Bulk-Insert mit prepare_cached, Indizes nach Load | Niedrig | Einsatzdaten: hunderte bis tausende Zeilen. |
| FTS5 | Niedrig bis mittel | Suche über Helfer/Einheiten/Fahrzeuge ginge bei wenigen tausend Zeilen auch per `LIKE` oder im Frontend; FTS nur, wenn Freitext-Lagemeldungen/Protokolle durchsucht werden sollen. Contentless-FTS ohne Trigger würde ich für S1 nicht nehmen (Pflegeaufwand), eher `content=`-Tabelle mit Triggern. |
| `matches_source` (Cache-Validierung über Größe/mtime) | **Hoch, umgedeutet** | Für S1: Erkennung „Datei auf dem Share hat sich geändert" per Größe+mtime+Hash als Fallback zu Datei-Watching (Watcher auf SMB sind unzuverlässig). |
| Materialisierte Selektion / TEMP-Tabellen | Nein | Kein virtuelles Scrollen über 1 Mio. Zeilen nötig. |
| Contentless FTS, generierte Spalten, partielle Indizes | Nein | Überdimensioniert. |
| Bundle-Ressource + überschreibbare Nutzerkopie + `.broken`-Beiseitelegen | **Hoch** | Für StAN-Referenzdaten / taktische Zeichen exakt passend. |

**Fazit §3:** Der SQLite-Teil ist für Multi-GB-Kataloge optimiert. Für S1 tragen vor allem die **Betriebsmuster** (Migration, busy/locked-Unterscheidung, atomares Ersetzen, Ressourcen-Override), nicht die Performance-Tricks. Und: **die Kernfrage „SQLite auf SMB mit mehreren Clients" beantwortet bmecatEditor NICHT** — dort ist die DB immer lokal im `app_data_dir`, ein Nutzer, ein Prozess (`docs/FEATURE-IDEEN.md:59` führt „Mehrbenutzer-Betrieb (gemeinsame Datenbank auf Server/NAS) — architektonisch klären: SQLite vs. Server-Backend" als OFFENEN Punkt).

## 4. Frontend bmecatEditor

### 4.1 `src/api.ts` — invoke-Wrapper und Events
- 730 Zeilen, **eine Funktion je Command** (`export function openCatalog(path) { return invoke("open_catalog", { path }); }`, `src/api.ts:65-67`) und **eine Funktion je Event** (`export function onCatalogReady(cb): Promise<UnlistenFn> { return listen<ReadyPayload>("catalog:ready", e => cb(e.payload)); }`, `src/api.ts:278-282`). Kopfkommentar `api.ts:1`: „Gemeinsame invoke-Wrapper und Event-Helfer". Selbstbeschreibung `api.ts:597`: „Dünne invoke-Wrapper, ohne jede Logik."
- Argumentnamen werden **camelCase** übergeben (`{ groupId }`, `{ entityId }`) — Tauri wandelt sie in `snake_case`-Parameter der Rust-Commands.
- Wichtig: Doku-Kommentare an den Wrappern tragen die Vertragsregeln („`apply` bekommt KEIN Profil … nach jeder Mapping-Änderung muss der Dry-Run erneut laufen", `api.ts:385-388`; Reihenfolge `analyze → stage → automap → dry_run → preview → apply → discard`).
- Zwei Utility-Funktionen am Ende: `formatNumber` (Intl de-DE) und `errorMessage(e: unknown)` (`api.ts:718-730`).
- **Bewertung:** Sehr gut lesbar, aber 67 Commands × (Wrapper + Typ + Rust-Signatur) = dreifache Pflege. Skaliert bis ~100 Commands; S1-Control hat heute laut `src/shared/ipc.ts` (439 Zeilen) bereits eine typisierte IPC-Schicht, die man in dieses Muster überführen könnte.

### 4.2 Typgleichheit TS ↔ Rust
- **Manuell gespiegelt.** `src/types.ts:1`: „DTO-Typen für den BMEcat-Editor (Spiegel der Rust-Seite, camelCase via serde-rename)". 124 `export interface|type` (Zählung). Auf Rust-Seite `#[serde(rename_all = "camelCase")]` an jedem Payload (`lib.rs:58, 71, 753, …`).
- **Kein Generator:** `Cargo.lock` enthält weder `ts-rs` noch `specta`/`tauri-specta`/`typeshare` (nur `schemars` als transitive Tauri-Abhängigkeit, `Cargo.lock:3317-3344`).
- Risiko: Ein umbenanntes Rust-Feld fällt erst zur Laufzeit als `undefined` auf; `tsc --noEmit` kann das nicht prüfen. Bei 124 Typen und einem Entwickler ist das bisher offenbar beherrschbar geblieben, für S1 mit Mehrfenster + Shared-Types würde ich **`ts-rs`** (Derive `#[derive(TS)] #[ts(export)]`, erzeugt `.ts`-Dateien in `cargo test`) oder **`tauri-specta`** (erzeugt zusätzlich die `invoke`-Wrapper mit Typen — würde `api.ts` fast komplett generieren) empfehlen. [Crate-Fähigkeiten aus Erinnerung; siehe Recherche §8]

### 4.3 Komponentenstruktur und State
- Kein Router, kein State-Manager: `grep useReducer|createContext|zustand|redux` → **0 Treffer** in `src/`. State liegt in `useState` — `App.tsx` allein 34 `useState`, `ImportWizard.tsx` 59, `EclassPanel.tsx` 17, `QualityPanel.tsx` 14, `ArticleDetail.tsx` 13.
- Steuerung per **Epoch-Zähler**: `epoch`, `editEpoch`, `dataEpoch` (`App.tsx:99, 103-104`) werden hochgezählt, um Kindkomponenten zum Nachladen zu bringen. Das ist ein einfaches, aber implizites Invalidierungsmodell („wer sich auf `dataEpoch` abhängt, lädt neu").
- Ein `App.tsx` mit 912 Zeilen als „Container-Komponente", 24 Komponenten in `src/components/`, davon 21 Merkmal-Editoren in `feature-editor/` (typspezifisch: `NumberEditor`, `RalColorEditor`, `TableEditor`, …). `ImportWizard.tsx` mit 3.930 Zeilen ist die größte Datei des Frontends — ein 5-Schritte-Assistent in einer Datei.
- **Bewertung für S1:** Für eine Ein-Fenster-App mit klaren Reitern reicht `useState` + Epoch. Für S1 mit **zwei Fenstern** (Haupt + Monitor), die denselben Datenstand zeigen, und mit Fremdänderungen vom Share ist ein expliziter Store (Zustand/Jotai oder ein `useSyncExternalStore`-Wrapper um Tauri-Events) sinnvoller, weil Tauri-Fenster getrennte JS-Kontexte sind und nur über Events/Backend kommunizieren.

### 4.4 Virtualisierung
- `@tanstack/react-virtual` (`package.json:19`) für Artikelliste (`grep useVirtualizer` in `ArticleList.tsx`, `GroupTree.tsx`, `QualityGroups.tsx`, `DiaErrorLog.tsx` — Nutzung bestätigt in ArticleList; Konzept `ARCHITEKTUR-ENTWURF.md:27` „es sind immer nur die sichtbaren ~50 Zeilen im Speicher"). Backend liefert seitenweise (`getArticles(group, search, quality, offset, limit)`, `api.ts:97-105`).
- S1: Helfer-/Einheitenlisten mit <5.000 Zeilen brauchen keine Virtualisierung; die Kombination „Backend paginiert + Frontend virtualisiert" ist aber das richtige Muster, falls Protokolle/Lagemeldungen groß werden.

### 4.5 CSS
- **Eine globale Datei** `src/App.css` mit 3.437 Zeilen und 531 Klassenselektoren; kein CSS-Modules, kein Tailwind, keine UI-Bibliothek. Import in `App.tsx:55`.
- Selektoren sind zugleich die **E2E-Anker** (`docs/UI-ABNAHME.md:154-159`: „Es gibt keine data-testid-Attribute; gearbeitet wird mit den Klassen … Wer eine Klasse umbenennt, bricht den Ablauf — das ist gewollt").
- Bewertung: Für einen Entwickler funktionsfähig, aber 3.400 Zeilen ohne Modulgrenzen sind der klassische Punkt, an dem Styles unbeabsichtigt kollidieren. S1-Control hat heute `src/renderer/src/styles/`; Empfehlung für v2: CSS-Modules oder zumindest eine Datei je Komponente, `data-testid` für E2E statt Klassen.

### 4.6 Lint/Typecheck
- ESLint 9 Flat Config mit `react-hooks` + `jsx-a11y`, `no-explicit-any: error`; bewusst keine Stilregeln (`eslint.config.js:1-12`). Getrennte Blöcke für `src/`, `e2e/`, Tooling. `tsconfig.json`: `strict`, `noUnusedLocals`, `noUnusedParameters`. `npm run build` = `tsc && vite build` (`package.json:8`).
- Übernehmbar 1:1.

## 5. Tests

### 5.1 Rust-Tests
- **227 `#[test]`** gesamt: 156 inline in `src/` (`table_import.rs` 52, `quality.rs` 40, `edit.rs` 24, `dia.rs` 13, `import.rs` 9, `export.rs` 8, `eclass.rs` 6, `query.rs` 4) + 71 in `tests/` (`quality.rs` 50, `dia_format.rs` 21). `storage.rs`, `model.rs`, `validate.rs`, `lib.rs` haben keine eigenen Tests (Migration wird indirekt getestet — offene Frage, ob ein expliziter Migrations-Kettentest existiert; `IMPORT-ASSISTENT-KONZEPT.md §11 M0` nennt „Migrationstest").
- Fixtures: echte XML-Ausschnitte in `tests/fixtures/dia/` (3 Dateien); Excel-Fixtures werden zur Testzeit mit `rust_xlsxwriter` erzeugt statt als Binärblobs eingecheckt (`crates/bmecat-core/Cargo.toml:35-38`).
- **Compile-Zeiten (gemessen, Apple M5 Pro, 15 Kerne, 48 GB):**
  - `cargo test -p bmecat-core --no-run` **warm** (vorhandenes `target/`, 18 GB): **1,06 s** (`cargo-test-norun.log`).
  - **kalt** (leeres `CARGO_TARGET_DIR` im Scratchpad, Debug-Profil mit `opt-level=3` für Parser/DB-Crates laut Workspace-Cargo.toml): **real 26,7 s, user 68,9 s**, 68 Crates kompiliert, 693 MB Artefakte (`cargo-test-norun-cold.log`). Das ist NUR der Kern ohne Tauri; ein Kaltbau von `src-tauri` (tauri, wry, tao, webkit-Bindings, ~400 Crates) liegt laut `docs/UI-ABNAHME.md:11` bei „etwa vier Minuten (Rust-Bau)" für den Debug-Build.
  - CI-Pipelines führen `cargo test -p bmecat-core` vor dem Bundle aus (`bitbucket-pipelines.yml:66, 111`; `build.yml:89-90`) — Tests für `src-tauri` gibt es nicht (Glue ist ungetestet außer per E2E).

### 5.2 E2E via WebdriverIO + tauri-plugin-wdio
- Stack: `@wdio/cli|globals|local-runner|mocha-framework|spec-reporter` 9.31, `@wdio/tauri-service` + `@wdio/tauri-plugin` 1.3.0, `webdriverio` 9.31, `tsx`, `@types/mocha` (`package.json:33-48`). Rust-Seite: `tauri-plugin-wdio-webdriver` + `tauri-plugin-wdio` v1 hinter Cargo-Feature `wdio` (`src-tauri/Cargo.toml:18, 33-34`).
- Ablauf `npm run e2e` = Fixture bauen (60.000 Artikel, ~100 MB XML, `katalog-bauen.mjs:25`) → `tauri build --debug --no-bundle --config src-tauri/tauri.wdio.conf.json --features wdio` → `wdio run e2e/wdio.conf.ts` (`package.json:12-15`).
- **`driverProvider: "embedded"`** (`wdio.conf.ts:60`): WebDriver-Server läuft IM Programm; laut Kommentar der einzige Weg auf macOS, weil WKWebView kein externes `tauri-driver` hat (`wdio.conf.ts:7, docs/UI-ABNAHME.md:33-36`).
- **Stabilitätsfallen, die bereits abgestellt wurden** (`wdio.conf.ts:62-79`): `statusPollTimeout: 60_000` (Default 2 s → Service startete die App während des 20-s-Imports neu), `captureFrontendLogs/captureBackendLogs: false` (Service holte vor jedem Kommando Konsolenlogs, dadurch war der Vollpass vorbei, bevor der erste Zustand gemessen war). Zeitkritische Zustände werden **im Fenster mitgeschnitten** (`e2e/hilfen/lauf.ts:34-64`: `setInterval` alle 25 ms schreibt DOM-Zustand in `window.__abnahme`, Klick im selben `browser.execute`), weil WebDriver-Roundtrips zu langsam sind. Isoliertes `HOME` für den Testlauf (`wdio.conf.ts:32-33`), Aufräumen in `onPrepare` (`wdio.conf.ts:95-111`).
- Umfang: **ein Spec** mit 8 Prüfungen und 8 Screenshots (`docs/UI-ABNAHME.md:80-92`), 267 Zeilen. Kein `data-testid`; Dateidialoge sind unerreichbar, deshalb `invoke("open_catalog")` direkt (`UI-ABNAHME.md:136-139`). Nur macOS; Linux bräuchte webkit2gtk + `XDG_DATA_HOME`-Umleitung (`UI-ABNAHME.md:130-132`).
- **Frontend-Unit-Tests: keine.** Bewusst verworfen (`UI-ABNAHME.md:234-240`: „Vitest mit React Testing Library und gemocktem invoke … bewusst nicht gebaut … Sinnvoll wird sie, sobald einzelne Komponenten Logik bekommen"). Kein `vitest` in `package.json`.
- **Bewertung Aufwand/Stabilität:** Das Setup ist funktionsfähig, aber fragil (Timeouts, Log-Capture, Restart-Verhalten des Service, Selektoren auf CSS-Klassen) und dokumentiert genau diese Fragilität ehrlich. Laufzeit ~1 min warm, ~4 min kalt. Für S1-Control, das heute **Playwright + playwright-bdd mit 10 Gherkin-Szenarien** gegen Electron fährt (`package.json:36-39` in S1-Control; Commit `7e92c73 feat(e2e): ALL 10 BDD tests green`), wäre der Wechsel auf WDIO+Tauri ein **Rückschritt in Reife und Werkzeug** — Playwright kann Tauri-WebViews nicht direkt steuern (nur über den WebDriver-Umweg oder den „browser mode" gegen Vite mit gemocktem `invoke`). Das ist ein echter Kostenpunkt des Tauri-Wegs (siehe §9).

## 6. CI / Distribution

### 6.1 bmecatEditor
- **Bitbucket Pipelines** (`bitbucket-pipelines.yml`): Basis `ubuntu:22.04`; Linux-Step baut `.deb/.rpm/.AppImage` (`size: 2x` = 8 GB RAM, „der Rust-Release-Build braucht Luft", Z. 53); **Windows per Cross-Compile** von Linux mit `cargo-xwin` + `nsis` → nur NSIS `.exe`, kein `.msi` („WiX braucht echtes Windows", Z. 6-8, 92-93); **macOS nur self-hosted** auf echtem Mac, manuelle Custom-Pipeline (Z. 9-12, 100-117). Trigger: Tag `v*` → Linux + Windows parallel (Z. 127-131). LFS-Pull mit Header-Check auf `SQLite format 3` gegen ungesmudgte Pointer (Z. 38-44). Caches: cargo-registry, cargo-git, target, `~/.xwin`.
- **GitHub Actions** (`.github/workflows/build.yml`): Matrix macOS arm64 + x86_64, ubuntu-22.04, windows-latest; `dtolnay/rust-toolchain@stable`, `swatinem/rust-cache@v2`, `tauri-apps/tauri-action@v0` (Z. 20-35, 72-78, 92-95); LFS gezielt gecacht (`.git/lfs`, Key = Hash der Pointer-Datei, Z. 44-55). **Signing/Notarisierung und Updater nur als Kommentar vorgesehen** (Z. 4-10: Secrets `APPLE_*`, `WINDOWS_CERTIFICATE`, `TAURI_SIGNING_PRIVATE_KEY`, `createUpdaterArtifacts: true`), nicht aktiv. Trigger: `workflow_dispatch` + Tag `v*`. Kein Release-Job, nur `upload-artifact`.
- **Kein Auto-Updater, keine Versionierung über Tags** (Version fest `0.1.0` in drei Dateien: `package.json:3`, `src-tauri/Cargo.toml:3`, `tauri.conf.json:4`).

### 6.2 S1-Control (Ist)
- **GitHub Actions** `.github/workflows/build-main.yml`: Trigger `push` auf `main` (Z. 3-6); Job `prepare` erzeugt **Zeitstempel-Version** `YYYY.MM.DD.HH.MM` als Git-Tag (Z. 23-38; Tags wie `2026.06.07.14.49`) und SemVer-Variante; Job `test` mit `vitest --coverage` + Codecov (Z. 66-88); Jobs `build-mac` (mit Signing-Secret-Validierung `CSC_LINK`, `APPLE_API_KEY_*`, Notarisierung, Z. 90-130), `build-win` (NSIS), `build-linux` (deb + `latest-linux.yml`-Prüfung, Z. 265-285), `build-linux-arch` (pacman, Z. 287-346); Job `release` mit `softprops/action-gh-release@v2` (Z. 348-390).
- **Auto-Updater:** `electron-updater` mit `provider: generic`, URL `https://github.com/wattnpapa/S1-Control/releases/latest/download` (`package.json:75-80`), Kanal-Konfiguration in `src/main/services/updater-auto-updater.ts:25-42`; **zusätzlich ein Peer-Update-Mechanismus im LAN** (`update-peer-discovery.ts`, `update-peer-http-handler.ts`, `update-peer-transfer.ts`, `updater-peer-flow.ts`) — Clients bieten heruntergeladene Artefakte per HTTP im Einsatznetz an. Versionsvergleich für Builds am selben Tag (`ffa14f8 fix(updater): Versionsvergleich erkennt neue Builds am selben Tag`).
- electron-builder-Konfig inline in `package.json.build` (Z. 45-83): macOS dmg+zip, hardenedRuntime, notarize; Windows NSIS mit Startmenü/Desktop-Shortcut; Linux deb; `fileAssociations` (Einsatzdatei-Endung).

### 6.3 Vergleich und Übertrag
| Aspekt | bmecatEditor (Tauri) | S1-Control (Electron) | Für S1 v2 auf Tauri |
|---|---|---|---|
| Trigger/Version | Tag `v*`, feste 0.1.0 | Push auf main → Zeitstempel-Tag automatisch | S1-Schema beibehalten; Version muss in `tauri.conf.json`+`Cargo.toml`+`package.json` gesetzt werden → Schritt „Version patchen" vor `tauri-action` (oder `tauri.conf.json` `version` aus `package.json` lesen lassen — Tauri 2 kann `"version": "../package.json"`). [letzteres unbelegt] |
| Windows-Build | Cross-Compile Linux→NSIS (Bitbucket) ODER windows-latest (GitHub) | windows-latest | windows-latest mit `tauri-action`; NSIS wie heute. WebView2-Bootstrapper-Strategie festlegen (§9). |
| macOS-Signing | Identity in Konfig, CI unsigniert | voll (Zertifikat + Notarisierung via API-Key) | `tauri-action` unterstützt dieselben Secrets (`APPLE_CERTIFICATE`, `APPLE_ID`/`APPLE_API_KEY`); S1-Secrets wiederverwendbar. |
| Linux | deb/rpm/AppImage | deb + pacman | Tauri liefert deb/rpm/AppImage; pacman nicht nativ → Zusatzskript oder weglassen. |
| Updater | nicht vorhanden | electron-updater + LAN-Peer | `tauri-plugin-updater` (signierte `latest.json`, Minisign-Schlüssel) + Peer-Mechanismus **neu in Rust** portieren (UDP-Discovery + HTTP-Serve). |
| Tests in CI | `cargo test -p core` | vitest + Coverage + Codecov | beides: `cargo test --workspace` + `vitest` (Frontend) |
| Release-Job | keiner | gh-release mit allen Artefakten | S1-Job übernehmen, Pfade auf `target/release/bundle/**` umstellen |

## 7. Arbeitsweise / Doku

### 7.1 Doku-Struktur (`docs/`, 3.631 Zeilen in 7 Dateien)
| Datei | Zeilen | Typ | Kennzeichen |
|---|---|---|---|
| `ARCHITEKTUR-ENTWURF.md` | 182 | Architekturentscheidung | Ziel/Rahmen → Kernidee mit ASCII-Diagramm → Technologie-Entscheidung mit **Alternativen-Tabelle** (Pro/Contra .NET+Avalonia, Electron, JVM, Qt) → Schichten → Schema-Skizze → UI-Konzept → kritischer Pfad mit **Messwerten** → Meilenstein-Tabelle mit Status → nummerierte Entscheidungen mit Datum (`:25-33`) |
| `IMPORT-ASSISTENT-KONZEPT.md` | 521 | Umsetzungskonzept | Ziel → **fünf Leitprinzipien** → UX → Datenmodell → Semantik → Pipeline → Validierung → Meilensteine mit Wochen-Schätzung → **§12 Größte Risiken** → **§13 Verworfene Alternativen (aus den Jury-Runden)** als Tabelle „Idee / Warum verworfen" |
| `DIA-FORMAT-KONZEPT.md` | 390 | Umsetzungskonzept | „Beschlossener Rahmen (Antworten von Johannes)" (§1) → normative Spezifikation → Datenmodell → Meilensteine mit **Definition of Done** (§7) → **Umsetzungsnotizen nach dem Commit** (§8: „Präzisierungen gegenüber §5 (im Code so umgesetzt)", „Fachlich geklärt (Johannes, 2026-08-19)", Restliste ERLEDIGT, Archiv) |
| `DATENQUALITAET-KONZEPT.md` | 2.097 | Umsetzungskonzept | Kopf mit Status „Beschlossen (§11 mit Johannes entschieden)" und **Messtabelle der Referenzkataloge**; Abgrenzungstabelle zu Nachbarfeatures (§1.2); Thread-/Lock-/Guard-Muster als nummerierte Schrittliste (§5.3); Event-Tabelle (§5.4); Commands/`api.ts`/`types.ts` als eigene Abschnitte (§8) |
| `UI-ABNAHME.md` | 240 | Betriebsanleitung Test | Was/Wie/Was nicht/Erweitern/Fallstricke/Verworfen |
| `FEATURE-IDEEN.md` | 81 | Backlog | Checkbox-Liste nach Themen, Erledigtes mit Datum und Verweis aufs Konzept |
| `LIZENZIERUNG-KONZEPT.md` | 120 | Produktkonzept | nicht S1-relevant |

### 7.2 Was sich bewährt hat (und für S1 v2 taugt)
1. **Ein Konzeptdokument je Vorhaben mit §-Nummern**, auf die Code-Kommentare verweisen („§5.3 Punkt 2", `lib.rs:37, 78, 1078`; „§6.3", `lib.rs:430`; „B10", `lib.rs:2062`). Dadurch ist jede nicht offensichtliche Entscheidung im Code rückverfolgbar. Das ist der stärkste Einzelbaustein dieser Arbeitsweise.
2. **Entscheidungen mit Datum und Urheber** („Entschieden (2026-08-12)", „Antworten von Johannes", „Fachlich geklärt (Johannes, 2026-08-19)").
3. **Verworfene Alternativen als Tabelle** — verhindert, dass dieselbe Idee in drei Monaten erneut diskutiert wird.
4. **Meilensteine mit Definition of Done** und Statusspalte; **Umsetzungsnotizen** nach dem Commit ins selbe Dokument (Abweichungen vom Konzept werden nachgetragen, nicht verschwiegen).
5. **Messwerte statt Schätzungen** an jeder Performance-Aussage (Katalog, Größe, Sekunden, RAM).
6. **Risikoliste mit Gegenmaßnahmen** (§12 Import-Konzept).
7. **Backlog als Checkbox-Datei** mit Erledigt-Datum.
8. Konventionen im Code: deutsche Bezeichner in Domänennähe (`guard_belegen`, `score_nachziehen`, `laufStartenUndMitschneiden`), englische in Infrastruktur (`open_db`, `with_conn`); ausführliche **Warum**-Kommentare mit Verweis auf den konkreten Fehlerfall, den sie verhindern.

### 7.3 Commit-Granularität
- 16 Commits / 9 Tage; Statistik (`git log --shortstat`): Basis-Commit 73 Dateien / 31.596 Zeilen; M2 8.666+; M3 5.250+; M4 3.058+; M5+M6 47 Dateien / 9.759+; M7 3.946+; M8 24 Dateien 1.099+/253−; Datenqualität: Konzept 2.097+ (1 Datei), Kern 10.629+ (12 Dateien), UI 3.701+ (11 Dateien), E2E 9.823+ (16 Dateien, davon der Großteil `package-lock.json`).
- Muster: **Konzept-Commit → Kern-Commit → UI-Commit → (E2E/Doku-Commit)**, jeweils ein Meilenstein. Sehr grob (Tausende Zeilen je Commit); Bisect und Review je Commit sind damit praktisch unmöglich. Für ein Ein-Personen-Projekt mit KI-Unterstützung ist das offenbar der reale Arbeitstakt („ein Meilenstein am Stück"); S1-Control committet dagegen fein (206 Commits, `fix(...)`/`feat(...)`-Präfixe, Conventional Commits). **Empfehlung für S1 v2:** Konzept-/Kern-/UI-Trennung übernehmen, aber innerhalb eines Meilensteins mehrere Commits (Schema, Kern-Modul, Commands, UI, Tests).

### 7.4 Was in der bmecatEditor-Doku FEHLT und S1 braucht
- Kein `README.md` im Repo-Root (Einstieg nur über `docs/`), kein `CHANGELOG`, keine Benutzer-Doku, kein ADR-Verzeichnis (Entscheidungen stehen verteilt in den Konzepten), keine Schema-Referenz außerhalb des Codes (`storage.rs` ist die Wahrheit), keine Doku zu Betriebsumgebung/Installation (WebView2 etc.), kein Test-Konzept außer UI-ABNAHME.

## 8. Übertragbarkeit auf S1-Control v2

### 8.0 Vorbemerkung: S1-Control hat SQLite auf dem Share bereits hinter sich
Bevor Muster übertragen werden, der wichtigste Befund aus der S1-Control-Historie (`git log`, nur lesend):
- 2026-02-28 „Behebe SMB Share Datenbankzugriff" (4a098e7), 2026-03-02 „use network-safe sqlite pragmas on SMB shares" (0ca506a), „default to network-safe sqlite mode" (70e5060), „increase sqlite open timeout for SMB lock contention" (b7bc562), „swallow transient sqlite lock errors in heartbeat" (c6a1668), 2026-03-07 „perf(fileshare): reduce sqlite contention" (cd33747), „test(behavior): cover fileshare bottleneck regressions" (bfe0970).
- 2026-05-31 bis 06-01: **kompletter SQLite-Ausbau** — „feat(json-store): complete SQLite removal - all services now use JSON store" (f0a5fec), „Delete migration.test.ts (no migrations in JSON store)" (431eee2). Heutiges Modell: `src/main/json-store/einsatz-store.ts:19-36` — `tmp` schreiben, `rename`, `writeSeq` hochzählen, alles unter `withFileLock` (Lockdatei `<datei>.lock` mit `wx`-Flag, Stale nach 10 s, Timeout 5 s, `file-lock.ts:4-6, 17-35`). Änderungssignal per UDP-Broadcast Port 41235 (`einsatz-sync.ts:7-8`), Client-Präsenz per Heartbeat 5 s / Stale 2 min in einer System-Datei (`clients.ts:9-10`), Datensatz-Sperren mit TTL 45 s (`record-lock.ts:8`).
- `README.md:22-25` ist veraltet („eigene SQLite-Datei … WAL-Modus") — Doku-Drift.
- Die Websuche bestätigt die Ursache: SQLite-Locking ist über SMB/CIFS nicht verlässlich, WAL „cannot safely be used over non-local filesystems" (SQLite-Forum, Sonarr #1886, crush #473).

**Konsequenz:** Die Frage „Tauri+Rust statt Electron?" ist von der Frage „SQLite statt JSON?" zu trennen. bmecatEditors rusqlite-Nutzung ist **lokal** (`app_data_dir`) und liefert für die Share-Datei kein Vorbild. Was bmecatEditor aber vormacht und für S1 passt: **Quelle auf dem Share + lokaler SQLite-Index/Cache im App-Data, validiert über Größe/mtime (`matches_source`)** — genau das Muster XML→`.bmecatdb`. Für S1: Einsatzdatei (JSON/CBOR) auf dem Share bleibt Wahrheit; ein lokaler SQLite-Cache wäre nur nötig, falls Abfragen/Historie groß werden.

### 8.1 (a) Musterkatalog
| # | Muster | Fundstelle | Bewertung für S1 v2 |
|---|---|---|---|
| M1 | Cargo-Workspace: UI-freier Kern-Crate + `src-tauri` als Glue; Kern hat CLI-Bins | `Cargo.toml:1-3`; `crates/bmecat-core/Cargo.toml:40-46` | **Übernehmen.** Kern testbar ohne Fenster; CLI (`s1 einsatz validate/migrate/export`) als Diagnosewerkzeug im Einsatz. |
| M2 | `pub use rusqlite` Re-Export gegen Versionsdrift | `crates/bmecat-core/src/lib.rs:15-16` | Übernehmen (für jede Crate, deren Typen die Glue sieht). |
| M3 | Ein `thiserror`-Enum + `Result<T>`-Alias im Kern, `Cancelled` als eigener Fall | `crates/bmecat-core/src/lib.rs:18-34` | **Anpassen:** Enum um `Busy{holder}`, `Conflict{expected_seq,found_seq}`, `Locked`, `Stale` erweitern und **serialisierbar** an die UI geben statt `String`. |
| M4 | `Result<_, String>` in Commands, `.map_err(|e| e.to_string())` | `lib.rs:315` u. v. a. | **Nicht 1:1.** Für Einzelplatz ok, für Mehrbenutzer-Konflikte zu grob → `#[derive(Serialize)] enum ApiError`. |
| M5 | `AppState` mit `Mutex<Option<Connection>>` + `with_conn` | `lib.rs:21-44, 307-316` | **Anpassen:** Statt Connection ein `Mutex<Option<OpenEinsatz>>` (Pfad, letzte `writeSeq`, letzte mtime, geparste Daten); Zugriffsfunktion `with_einsatz`. |
| M6 | Lock-Reihenfolgen als Kommentar am Feld + an jeder Stelle | `lib.rs:40-43, 924, 1172, 1603, 1829-1832` | Übernehmen (Disziplin, kein Code). |
| M7 | `guard_belegen`: eigenes Flag `swap` zuerst, fremde danach, bei Kollision zurück | `lib.rs:166-193` | Übernehmen für sich ausschließende Hintergrundläufe (Backup, Sync-Pull, Update-Download, Export). |
| M8 | `FlagGuard` — RAII-Freigabe + Fehler-Event bei Panic; Flag frei VOR Abschluss-Event | `lib.rs:198-254, 1864-1866` | **Übernehmen**, generisch machen (`WorkerGuard<F: Fn(&AppState)->&AtomicBool>`). |
| M9 | `thread::Builder::spawn` statt `thread::spawn`, Fehler setzt Flag zurück | `lib.rs:273-298` | Übernehmen; oder durchgängig `tauri::async_runtime::spawn_blocking` (M11). |
| M10 | Alles Mutex-Pflichtige vor dem Spawn auflösen, bei Fehler Flag zurück | `lib.rs:1798-1814` | Übernehmen. |
| M11 | Zwei Nebenläufigkeitsstile (std::thread vs. `async` + `spawn_blocking`) | `lib.rs:276` vs. `lib.rs:1700-1708` | **Vereinheitlichen:** kurz-blockierend → `async fn` + `spawn_blocking`; lang mit Fortschritt → Thread + Events. |
| M12 | Event-Namensschema `<bereich>:<zustand>`, `*:cancelled` ≠ `*:error` | `lib.rs:121,127,150,292,…`; `api.ts:244-292` | Übernehmen; für S1 z. B. `einsatz:changed|conflict|locked`, `sync:peer-joined`, `update:progress|ready`. |
| M13 | Fortschritts-Drossel 150 ms + erstes/letztes Event erzwingen | `lib.rs:118-123, 560` | Übernehmen (Backup, Import der Excel-Mappe, Update-Download). |
| M14 | Worker öffnet eigene Connection statt UI-Mutex zu halten | `lib.rs:1139-1140, 1773-1776` | Übernehmen als Prinzip („UI-Zustand nie über einen langen Lauf sperren"). |
| M15 | `.setup()`-Hook räumt verwaiste Temp-Dateien | `lib.rs:1108-1126, 2179-2182` | Übernehmen (verwaiste `.tmp`/`.lock` von abgestürzten Clients — **nur eigene PID/Host!**). |
| M16 | Schema-Version in `meta`, lineare idempotente additive Migration je Schritt in eigener Transaktion, DDL nur an einer Stelle, `MIGRATABLE_VERSIONS` | `storage.rs:5, 326-332, 519-608, 677-684` | **Übernehmen (Konzept)** für das JSON-Schema: `schemaVersion` + `migrate(v) -> v+1`-Kette mit Tests je Stufe; S1 hat heute `schemaVersion: 1` (`einsatz-store.ts:48`) und keine Migrationen mehr. |
| M17 | Sperrfehler (`is_locked`) von Kaputt unterscheiden; `busy_timeout` | `storage.rs:453-471, 686-693` | Übernehmen (Lockdatei belegt ≠ Datei defekt). |
| M18 | Import in `.tmp` bauen, atomar `rename`, alte `-wal/-shm` wegräumen | `import.rs:1816, 2063-2084` | Übernehmen (S1 macht es heute schon in JS, `einsatz-store.ts:19-23`). |
| M19 | Cache-Validierung über Quellgröße+mtime (`matches_source`) | `storage.rs:652-675` | **Umdeuten:** Änderungserkennung auf dem Share per Polling (size, mtime, `writeSeq`) — Watcher auf SMB sind unzuverlässig. |
| M20 | Bundle-Ressource + überschreibbare Nutzerkopie + `.broken`-Beiseitelegen | `lib.rs:659-707`, `tauri.conf.json:38` | Übernehmen für StAN-/Einheitenstammdaten und taktische Zeichen. |
| M21 | Handgeschriebener `api.ts` + manuell gespiegelte `types.ts` | `api.ts:1`, `types.ts:1` | **Ersetzen** durch `tauri-specta` (generiert `bindings.ts` inkl. typisierter Events) oder `ts-rs`. |
| M22 | `useState`-Container-App mit Epoch-Zählern | `App.tsx:92-120` | Für ein Fenster ok; für zwei Fenster + Fremdänderungen einen kleinen Store (Zustand/Jotai) mit Event-Anbindung. |
| M23 | `@tanstack/react-virtual` + Backend-Pagination | `package.json:19`, `api.ts:97-105` | Nur bei großen Protokolllisten. |
| M24 | Eine globale `App.css` (3.437 Zeilen), Klassen als E2E-Anker | `App.css`, `UI-ABNAHME.md:154-159` | Nicht übernehmen: CSS pro Komponente, `data-testid`. |
| M25 | ESLint 9 Flat Config (hooks + a11y, keine Stilregeln), `tsc && vite build` | `eslint.config.js`, `package.json:8` | Übernehmen; S1 hat bereits eslint+prettier+sonarjs. |
| M26 | Test-Konfig als Overlay `tauri build --config tauri.wdio.conf.json --features wdio`; Feature-gated Plugins; `import.meta.env.VITE_WDIO` | `package.json:14`, `src-tauri/Cargo.toml:18`, `main.tsx:10-12` | Übernehmen, wenn WDIO gewählt wird. |
| M27 | Zeitkritische UI-Zustände im Fenster mitschneiden statt per WebDriver pollen | `e2e/hilfen/lauf.ts:34-64` | Übernehmen (gilt auch für Playwright). |
| M28 | Isoliertes `HOME`/App-Data für E2E | `wdio.conf.ts:21-33` | Übernehmen; unter Windows `APPDATA`, Linux `XDG_DATA_HOME`. |
| M29 | Konzeptdokument je Vorhaben mit §-Nummern, Code-Kommentare verweisen darauf | `docs/*.md`, `lib.rs:37, 430, 2062` | **Übernehmen** — stärkstes Arbeitsmuster. |
| M30 | Verworfene Alternativen + Risiken + DoD-Meilensteine + Umsetzungsnotizen im selben Dokument | `IMPORT-ASSISTENT-KONZEPT.md §11-13`, `DIA-FORMAT-KONZEPT.md §7-8` | Übernehmen. |
| M31 | Messwerte an jeder Performance-Aussage | `ARCHITEKTUR-ENTWURF.md:136-140`, `DATENQUALITAET-KONZEPT.md:10-18` | Übernehmen (für S1: Öffnen einer Einsatzdatei über SMB in ms, Sync-Latenz). |
| M32 | CI: LFS-Header-Check, Cross-Compile Windows via cargo-xwin, macOS self-hosted | `bitbucket-pipelines.yml:38-44, 74-98, 100-117` | Nicht nötig (GitHub Actions hat Windows/macOS-Runner; S1 nutzt sie schon). |
| M33 | `csp: null`, `assetProtocol.scope: ["**"]` | `tauri.conf.json:22-27` | **Nicht übernehmen.** |
| M34 | Dev-Profil: Parser/DB-Crates mit `opt-level=3` | `Cargo.toml:9-20` | Übernehmen für `calamine`/`zip` (Excel-Import der Arbeitsmappe) und `rusqlite`, falls genutzt. |
| M35 | Excel-/CSV-Tabellenimport mit Encoding-Sniffing, Staging, Dry-Run, Profile | `crates/bmecat-core/src/table_import.rs` (11.322 Zeilen), `IMPORT-ASSISTENT-KONZEPT.md` | **Teilweise wiederverwendbar:** `calamine`-Leseschicht + Header-Erkennung für den einmaligen Import der „Einsatzkräfteübersicht V 1.5.2-beta". Staging/Profile/Dry-Run sind überdimensioniert. |

### 8.2 (b) Übertragbarkeitsmatrix
| Baustein | Status | Kommentar |
|---|---|---|
| Cargo-Workspace-Layout (`crates/*`, `src-tauri`, `src/`) | **übernehmen** | siehe 8.3 |
| Workspace-`Cargo.toml` (Profile, lto thin, dev-opt für Parser) | übernehmen | |
| `src-tauri/Cargo.toml` (lib-Name mit Suffix, crate-type, Feature-gated Test-Plugins) | übernehmen | |
| `tauri.conf.json` Build-Block, Vite-Konfig (Port 1420, strictPort, ignore src-tauri) | übernehmen | |
| `tauri.conf.json` Security-Block | **neu** | CSP setzen, asset-Scope auf Einsatzordner/App-Data |
| Capabilities | anpassen | zwei Fenster (`main`, `monitor`), zusätzliche Plugins |
| Plugins dialog/opener | übernehmen | |
| Plugins store/log/window-state/single-instance/fs/updater/process/os | **neu** | bmecatEditor hat keines davon |
| AppState/Guard/Worker/Event-Muster (M5–M14) | anpassen | Connection → Einsatz-Handle; Fehler-Enum |
| `storage.rs`-Migrationsmuster | übernehmen (Konzept) | auf JSON-Schema anwenden |
| rusqlite auf der Share-Datei | **nicht übernehmen** | S1-Historie + SQLite-Doku |
| rusqlite als lokaler Cache/Index | optional | nur bei Bedarf |
| WAL/PRAGMA-Tuning | nicht übernehmen | irrelevant bei KB-Dateien |
| `api.ts`/`types.ts` von Hand | ersetzen | tauri-specta / ts-rs |
| React-Komponentenaufbau, Virtualisierung | teilweise | S1-Renderer (10.097 Zeilen) ist bereits React+Vite und bleibt weitgehend; nur IPC-Schicht (`window.api.*` via preload) wird zu `invoke`/`listen` |
| CSS-Ansatz | nicht übernehmen | |
| E2E WDIO+tauri-service | anpassen | oder Playwright-browser-mode + wenige WDIO-Smokes; S1s 10 BDD-Szenarien (`e2e/features/einsatz-lifecycle.feature`) müssten portiert werden |
| Frontend-Unit-Tests | **neu** (S1 hat vitest, 190 `it/test` in 36 Dateien) | bmecatEditor hat keine; S1 sollte seine behalten — sie testen heute den Main-Prozess (TS), der nach Rust wandert → **diese 190 Tests werden zu Rust-Tests** |
| CI GitHub Actions (Matrix, rust-cache, tauri-action, LFS) | anpassen | S1-Workflow-Gerüst behalten (Zeitstempel-Tag, test, release), Build-Schritte durch `tauri-action` ersetzen |
| Bitbucket-Pipeline | nicht nötig | |
| Signing macOS | anpassen | S1-Secrets in `tauri-action`-Variablen |
| Auto-Updater | **neu** | `tauri-plugin-updater` + Minisign; Peer-Update in Rust |
| Mehrfenster/Monitor | **neu** | `WebviewWindowBuilder`, `available_monitors()`, zweiter Vite-Eintrag |
| Datei-Watching | **neu** | Polling + UDP-Signal; `notify` nur lokal |
| UDP-Broadcast (Änderungssignal, Peer-Discovery) | **neu** | `tokio::net::UdpSocket` / `std::net::UdpSocket` mit `set_broadcast(true)` |
| Peer-HTTP-Serve für Update-Artefakte | **neu** | `axum` oder `tiny_http` |
| Drucken/Export | anpassen | kein Tauri-Print-API; Export-Dokumente wie heute im Frontend (handlebars+jszip laufen im WebView) oder Rust (`docx-rs`, `rust_xlsxwriter`, `printpdf`/`typst`) und per opener öffnen |
| Dateiassoziation `.s1control` | anpassen | `bundle.fileAssociations` in `tauri.conf.json`; macOS `RunEvent::Opened`, Windows/Linux argv + `single-instance` |
| Doku-Vorlagen (Konzept mit §, Risiken, Alternativen, DoD, UI-ABNAHME) | **übernehmen** | S1 hat `AGENTS.md` (Architekturregeln) und `README.md`; Konzept-Ebene fehlt |
| Commit-Granularität | S1-Stil behalten | |

### 8.3 (c) Projektstruktur-Vorlage S1-Control v2 (Tauri-Basis)
```
s1-control/
├── Cargo.toml                      # [workspace] members = ["crates/*", "src-tauri"]; profile wie bmecatEditor
├── package.json                    # React/Vite/TS, @tauri-apps/api + Plugins, vitest, Playwright/WDIO
├── tsconfig.json, vite.config.ts   # zwei Einstiege: index.html (main), monitor.html (Stärke-Monitor)
├── crates/
│   ├── s1-model/                   # Domänentypen: Einsatz, Abschnitt, Einheit, Fahrzeug, Helfer, Stärke,
│   │   └── src/{lib,einsatz,einheit,staerke,ids}.rs     # RecordLock, ClientPresence; serde + specta; reine Typen + Invarianten
│   ├── s1-store/                   # Dateiformat: Lesen/Schreiben, Lockdatei, atomares tmp+rename, writeSeq,
│   │   └── src/{lib,file,lock,migrate,detect}.rs        # Schema-Migration v1→vN (M16), Änderungserkennung size/mtime/seq (M19)
│   ├── s1-stan/                    # StAN-/Einheiten-Referenzdaten, taktische-Zeichen-Inferenz
│   │   └── resources/              # heute src/main/services/stan + tactical-sign
│   ├── s1-net/                     # UDP-Änderungssignal, Client-Heartbeat, Peer-Update-Discovery + HTTP-Serve
│   ├── s1-import/                  # Einmal-Import „Einsatzkräfteübersicht V 1.5.2-beta" (calamine; Muster aus table_import.rs)
│   ├── s1-export/                  # (optional) docx/xlsx/pdf; sonst im Frontend
│   └── s1-cli/                     # bin: s1 open|validate|migrate|export|watch  (Diagnose im Einsatz, Tests)
├── src-tauri/
│   ├── Cargo.toml                  # lib "s1_control_lib", features: wdio (optional)
│   ├── tauri.conf.json             # identifier de.thw.s1control, windows: main+monitor, CSP gesetzt,
│   │                               # assetProtocol scope eng, bundle.fileAssociations [.s1control],
│   │                               # windows.webviewInstallMode fixedRuntime|offlineInstaller, updater.pubkey
│   ├── tauri.wdio.conf.json        # Overlay nur für E2E (M26)
│   ├── capabilities/main.json, monitor.json
│   ├── resources/                  # StAN-Daten (Bundle-Ressource, M20)
│   └── src/
│       ├── main.rs                 # 6 Zeilen
│       ├── lib.rs                  # run(): Builder, Plugins, manage(AppState), generate_handler!, setup()
│       ├── state.rs                # AppState { einsatz: Mutex<Option<OpenEinsatz>>, guards: AtomicBool…, cancel… }
│       ├── guard.rs                # guard_belegen, WorkerGuard (M7–M10)
│       ├── error.rs                # ApiError (Serialize) ← s1_store::Error, s1_net::Error
│       ├── events.rs               # Event-Namen als Konstanten + Payload-Structs (M12), tauri-specta Events
│       ├── windows.rs              # Haupt-/Monitorfenster, Monitorwahl (available_monitors), Window-State
│       ├── watcher.rs              # Poll-Loop (size/mtime/writeSeq) + UDP-Listener → einsatz:changed
│       ├── updater.rs              # tauri-plugin-updater + Peer-Flow
│       └── commands/
│           ├── einsatz.rs abschnitt.rs einheit.rs fahrzeug.rs helfer.rs
│           ├── lock.rs (Record-Locks, Presence) display.rs (Monitor) system.rs (Version, Pfade, Log)
│           └── import.rs export.rs backup.rs
├── src/                            # React-Frontend (heutiger Renderer weitgehend übernehmbar)
│   ├── bindings.ts                 # GENERIERT (tauri-specta) — ersetzt api.ts + types.ts
│   ├── app/ components/ styles/    # wie heute src/renderer/src
│   └── windows/{main,monitor}/     # zwei Einstiege
├── e2e/                            # WDIO+tauri-service (M26–M28) und/oder Playwright browser-mode
│   ├── wdio.conf.ts hilfen/ specs/ fixtures/
├── test/                           # vitest: reine Frontend-Logik (Stärkeberechnung, Formatierung)
├── docs/
│   ├── ARCHITEKTUR.md              # Entscheidungen mit Datum, Alternativen-Tabelle, Messwerte
│   ├── KONZEPT-DATEIFORMAT.md      # §-nummeriert: Locking, writeSeq, Migration, Konflikte
│   ├── KONZEPT-SYNC.md             # UDP, Polling, Presence, Record-Locks
│   ├── KONZEPT-UPDATER.md          # Updater + Peer
│   ├── KONZEPT-MONITOR.md          # Zweitfenster
│   ├── UI-ABNAHME.md               # wie bmecatEditor
│   ├── FEATURE-IDEEN.md            # Checkbox-Backlog
│   └── adr/                        # kurze ADRs (Tauri statt Electron, JSON statt SQLite, specta …)
└── .github/workflows/build-main.yml  # S1-Gerüst: prepare(Zeitstempel-Tag) → test(cargo test --workspace + vitest)
                                      # → build matrix (tauri-action, rust-cache) → release (gh-release + latest.json)
```

### 8.4 Konkrete Tauri-2-Plugins / Crates für S1 v2
Offizielle Plugins (`tauri-apps/plugins-workspace`, Websuche bestätigt Existenz von fs, store, log, window-state, single-instance, notification, updater):
- `tauri-plugin-dialog`, `tauri-plugin-opener` (wie bmecatEditor)
- `tauri-plugin-fs` (mit Feature `watch`, basiert auf `notify`) — nur für lokale Pfade sinnvoll
- `tauri-plugin-store` (Einstellungen, zuletzt geöffnete Einsätze; ersetzt `settings-store.ts`)
- `tauri-plugin-log` (Datei-Logs im Einsatz; ersetzt `debug.ts`/`diagnostics.ts`)
- `tauri-plugin-window-state` (Fensterpositionen, auch für Monitorfenster)
- `tauri-plugin-single-instance` (Zweitstart übergibt Datei-Argument an laufende Instanz)
- `tauri-plugin-updater` (signierte `latest.json`, `tauri signer generate`, `createUpdaterArtifacts: true`)
- `tauri-plugin-process` (Relaunch nach Update), `tauri-plugin-os` (Hostname/Plattform für Client-Identität)
- `tauri-plugin-notification` (optional)
- Test: `tauri-plugin-wdio` + `tauri-plugin-wdio-webdriver` (wie bmecatEditor)
Crates:
- Typen/IPC: `serde`, `serde_json`, `specta` + `tauri-specta` (oder `ts-rs`), `thiserror`
- Datei/Lock: `fd-lock` oder `fs2` (advisory Locks — auf SMB ebenfalls unsicher, daher zusätzlich Lockdatei wie heute), `tempfile` (`NamedTempFile::persist`), `filetime`
- Zeit/IDs: `time` oder `chrono`, `uuid`, `ulid`
- Netz: `tokio` (`net` Feature) für UDP/Heartbeat, `axum` oder `tiny_http` für Peer-Serve, `reqwest` (GitHub-Check, mit Timeouts wie heute `updater-network-errors.ts`), `local-ip-address`
- Hash: `blake3` oder `sha2` (Dateiänderung/Artefakt-Prüfsumme)
- Import: `calamine` (xlsx/xlsm der Arbeitsmappe), `zip`; Export: `rust_xlsxwriter`, `docx-rs`, `printpdf` oder `typst`
- Lokaler Cache (optional): `rusqlite` bundled
- Logging: `tracing` + `tracing-subscriber`, Bridge zu `tauri-plugin-log`

## 9. Risiken des Tauri-Wegs für S1 — mit Gegenmaßnahmen

| # | Risiko | Einschätzung | Gegenmaßnahme |
|---|---|---|---|
| R1 | **WebView2 auf THW-Windows-Rechnern offline nicht vorhanden.** Der Default `downloadBootstrapper` und `embedBootstrapper` (+1,8 MB) brauchen Internet. | Hoch — Einsatznetz ist offline; Windows 10 ohne aktuelles Edge/Office hat WebView2 nicht sicher. | `bundle.windows.webviewInstallMode: { type: "offlineInstaller" }` (+~127 MB, installiert Evergreen ohne Netz) **oder** `{ type: "fixedRuntime", path: "…/Microsoft.WebView2.FixedVersionRuntime.X.x64/" }` (+~180 MB, feste Version, keine Fremd-Updates, reproduzierbares Verhalten). Empfehlung: **fixedRuntime** — Installer ist dann ähnlich groß wie heute Electron, dafür kein Evergreen-Überraschungsupdate im Einsatz. Quellen: v2.tauri.app/distribute/windows-installer, docs.rs WebviewInstallMode, MS „evergreen vs fixed". Offen: `tauri-action`-Build mit fixedRuntime braucht das .cab entpackt im Repo/CI-Cache (~180 MB → LFS oder CI-Download). |
| R2 | **Drei Rendering-Engines** (WKWebView, WebView2, WebKitGTK) statt einer Chromium-Version → CSS/JS-Abweichungen, insbesondere WebKitGTK auf älteren Distributionen. | Mittel | Linux als Tier-2; konservatives CSS; E2E je Plattform; `browserslist`/keine Bleeding-Edge-APIs. S1 baut heute deb + pacman — Tauri liefert deb/rpm/AppImage. |
| R3 | **Debugging**: Rust-Panics/Deadlocks statt Node-Stacktraces; WebView-DevTools nur im Debug-Build ohne Feature `devtools`. | Mittel | `tauri-plugin-log` + `tracing` in Datei; `RUST_BACKTRACE`; Feature `devtools` für Diagnose-Builds; CodeLLDB. Die bmecatEditor-Kommentare zeigen typische Fallen (Poisoned Mutex, hängende Flags, verbindungslokale TEMP-Tabellen). |
| R4 | **Rust-Build-Zeiten.** Gemessen: Kern kalt 26,7 s / 68 Crates (M5 Pro); Tauri-Debug kalt ~4 min (`UI-ABNAHME.md:11`); Release mit `lto=thin, codegen-units=1` deutlich länger; CI je Plattform geschätzt 10–20 min vs. heute Electron ~5 min. [CI-Zahl unbelegt] | Mittel | `swatinem/rust-cache`, ggf. `sccache`; Kern-Crates klein halten (nicht 11.000-Zeilen-Dateien); `cargo test -p` gezielt; Release-Profil nur im Release-Job. |
| R5 | **Ein-Personen-Team, zwei Sprachen.** Borrow-Checker/Lifetimes über Thread-Grenzen (sichtbar am `fn`-Pointer-Trick im `FlagGuard`, `lib.rs:211-213`); Doppelpflege TS/Rust-Typen. | Hoch | `tauri-specta` gegen Typdrift; Fachlogik dorthin, wo sie einfacher ist (Stärkeberechnung/Anzeige kann im Frontend bleiben, nur I/O/Locking/Netz in Rust); die bmecatEditor-Historie (31 kLoC Rust in 9 Tagen, KI-gestützt) zeigt, dass es geht — aber dort ohne Mehrbenutzer-Komplexität. |
| R6 | **E2E-Werkzeugwechsel.** Playwright steuert Tauri-WebViews nicht; WDIO+`@wdio/tauri-service` ist jung (v1.3), macOS nur `embedded`, dokumentierte Fallen (Restart nach 2 s, Log-Capture-Latenz). S1 verliert `playwright-bdd` (10 Szenarien). | Mittel–hoch | Zweigleisig: Playwright „browser mode" gegen Vite mit gemocktem `invoke` (schnell, viele Fälle) + wenige WDIO-Smokes gegen die echte App; oder `@wdio/cucumber-framework` für die Gherkin-Dateien. |
| R7 | **Drucken.** Tauri hat kein Print-API (Issues #3066, #4917, #5330); `window.print()` unzuverlässig; WebView2 hätte `ShowPrintUI`, ist aber nicht exponiert. | Niedrig für S1 (Renderer nutzt heute kein `window.print`, Export läuft über handlebars+jszip → Dokumentdatei) | Dokumente weiterhin als Datei erzeugen (im WebView per handlebars/jszip oder in Rust) und per `opener` im Systemprogramm öffnen/drucken. |
| R8 | **Mehrfenster.** Fenstererzeugung in synchronen Commands deadlockt unter Windows (Tauri-Doku); Bug-Report #14019 „can't open multiple windows in multi monitor screen". Zwei WebViews = zwei getrennte JS-Kontexte. | Mittel | Fenster in `setup()` oder `async` Command anlegen; Monitorfenster als eigener Vite-Eintrag; Zustand nur über Backend-Events synchronisieren; `available_monitors()`/`current_monitor()` für die Zweitbildschirm-Wahl (heute `screen.getAllDisplays()` in `strength-display.ts:145-147`). |
| R9 | **Mehrbenutzer-Dateizugriff auf SMB.** Rust ändert nichts an SMB-Semantik: `fd-lock`/`fs2` sind advisory und über SMB genauso unzuverlässig wie SQLite-Locks. | Hoch (unabhängig vom Stack) | Heutiges S1-Modell (Lockdatei `wx`, Stale-Timeout, tmp+rename, `writeSeq`, UDP-Signal, Presence-Heartbeat) **1:1 in `s1-store`/`s1-net` portieren**; zusätzlich optimistische Konflikterkennung (`writeSeq` beim Schreiben prüfen, `Conflict`-Fehler an UI). **Keine SQLite-Datei auf dem Share.** |
| R10 | **Datei-Watching auf SMB** liefert Events unzuverlässig (`notify`/ReadDirectoryChangesW über SMB). | Hoch | Polling (1–2 s: size, mtime, `writeSeq` aus Dateikopf) + UDP-Broadcast wie heute; `notify` nur als Beschleuniger für lokale Pfade. [Zuverlässigkeitsaussage aus Erfahrung, unbelegt] |
| R11 | **Auto-Updater:** Minisign-Privatschlüssel verloren = keine Updates mehr für installierte Clients; Peer-Update-Mechanismus (UDP-Discovery, HTTP-Serve, Transfer) muss komplett neu in Rust entstehen (heute ~1.000 Zeilen TS in 7 Dateien). | Mittel | Schlüssel im Passwort-Manager + CI-Secret (`TAURI_SIGNING_PRIVATE_KEY`); `createUpdaterArtifacts: true`; `latest.json` im Release-Job erzeugen; Peer-Serve mit `axum`; Versionsschema `YYYY.MM.DD.HH.MM` ist **kein SemVer** — Tauri-Updater vergleicht SemVer → S1 hat dafür bereits `BUILD_SEMVER` (`build-main.yml:27`). |
| R12 | **Security-Defaults aus bmecatEditor** (`csp: null`, asset-Scope `**`) im Einsatznetz. | Mittel | CSP setzen; asset-Scope auf Einsatzverzeichnis + App-Data; Capabilities je Fenster minimal. |
| R13 | **Signing/Notarisierung Windows fehlt** (heute auch). | Niedrig | Wie heute; `tauri-action` unterstützt `WINDOWS_CERTIFICATE`. |
| R14 | **Migration bestehender Einsatzdateien** (JSON v1) und Nutzer-Gewohnheiten; Parallelbetrieb alt/neu im selben Share. | Mittel | Dateiformat beibehalten (JSON, gleiche Endung `.s1control`), `schemaVersion`-Migration nach M16; alter Client darf neue Dateien erkennen und ablehnen (Versionsfeld zuerst prüfen). |
| R15 | **Doku-/Wissensverlust:** bmecatEditor hat kein README, keine ADRs; S1 hat `AGENTS.md`. | Niedrig | ADR-Verzeichnis + Konzeptdokumente von Tag 1. |

**Gesamteinschätzung:** Der Tauri-Stack ist für S1 technisch tragfähig und bringt kleinere Installer (ohne fixedRuntime), weniger RAM, einen echten Kern-Crate mit CLI und ein besseres Sicherheitsmodell. Er löst aber **keines der harten S1-Probleme** (SMB-Locking, Sync, Offline-Update) — die liegen im Dateiformat und im Netzprotokoll und müssen in Rust neu implementiert werden, wo sie heute in TS funktionieren und getestet sind (190 Unit-Tests, 10 BDD-Szenarien). Der Nutzen entsteht vor allem durch die **Neuordnung als Kern-Crate mit Konzept-Doku**, nicht durch Rust an sich; dieselbe Neuordnung wäre auch in Electron möglich (Kern als reines TS-Paket ohne Electron-Import). Wer Tauri wählt, sollte es wegen Installer-Größe/RAM/Sicherheit und Rust-Typsicherheit im Kern tun — und die Kosten R1, R5, R6, R11 bewusst tragen.

## 10. Offene Fragen
1. Wie baut die bmecatEditor-CI „unsigniert", obwohl `tauri.conf.json:34` eine `signingIdentity` setzt? (Bricht `tauri build` auf einem Runner ohne dieses Zertifikat, oder wird sie stillschweigend ignoriert?) Nicht im Repo dokumentiert.
2. Gibt es in bmecatEditor einen expliziten Migrations-Kettentest v5→v9 (`IMPORT-ASSISTENT-KONZEPT.md §11 M0` nennt „Migrationstest"; `storage.rs` selbst hat 0 `#[test]`)? Nicht verifiziert (Testdateien nicht vollständig gelesen).
3. Unterstützt `tauri.conf.json` v2 tatsächlich `"version": "../package.json"` zum Übernehmen der Version? Websuche gab keinen Beleg. [unbelegt]
4. Kann `tauri-action` einen `fixedRuntime`-Build durchführen, ohne das ~180-MB-Runtime-Verzeichnis im Repo zu halten (Download-Schritt im Workflow, Cache)? Nicht geprüft.
5. Welche Windows-Versionen/Images laufen konkret auf den THW-Rechnern der FüSt (Win10 LTSC? Win11?) — entscheidet zwischen `offlineInstaller` und `fixedRuntime` und ob WebView2 überhaupt fehlt.
6. Wie zuverlässig ist `notify` (ReadDirectoryChangesW/kqueue/inotify) auf den konkret eingesetzten NAS-Freigaben (SMB2/3, Synology/QNAP/Windows-Server)? Muss im Einsatznetz gemessen werden; die Polling-Empfehlung ist Vorsichtsmaßnahme.
7. Ist der Tauri-Bug #14019 (mehrere Fenster auf Multi-Monitor) in der aktuellen Tauri-2-Version behoben? Nicht geprüft.
8. `@wdio/tauri-service` unter Windows: läuft dort `tauri-driver` (msedgedriver) statt `embedded` stabiler? bmecatEditor testet nur macOS.
9. Wie groß ist der reale Kaltbau von `src-tauri` (Debug und Release) auf der Entwicklungsmaschine und in GitHub-Actions? Nur der Kern wurde gemessen; „vier Minuten" stammt aus `UI-ABNAHME.md`.
10. Playwright-bdd: `find` fand nur `e2e/features/einsatz-lifecycle.feature` mit 0 Treffern für „Scenario" (vermutlich deutsche Schlüsselwörter „Szenario") — genaue Szenarienzahl aus Commit `1af806f` (10) übernommen, nicht selbst gezählt.
11. Wurde bei bmecatEditor je ein Release an Endnutzer verteilt (Updater, Installer-Erfahrung)? Aus dem Repo nicht ersichtlich; Version 0.1.0, keine Release-Tags.
