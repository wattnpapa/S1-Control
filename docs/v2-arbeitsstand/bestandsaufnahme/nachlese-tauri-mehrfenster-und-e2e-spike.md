# Nachlese: Tauri-Mehrfenster (Zweitmonitor), Windows-WebView2-Distribution, E2E-Stack — Spike-Bewertung

Status: IN ARBEIT (Zwischenstand wird nach jedem Teilthema fortgeschrieben)

## Gliederung
0. Ausgangslage und Methode
1. Ist-Stand S1-Control: Stärke-Monitor (strength-display.ts) — was genau muss Tauri leisten?
2. Frage 1: Zweites rahmenloses Fenster auf Zweitmonitor in Tauri 2.x — Issue #14019, Changelog, API-Stand
3. Frage 2: WebView2-Distribution unter Windows (webviewInstallMode) und tauri-action
4. Frage 3: E2E-Stack — Ist-Stand S1 (playwright-bdd) vs. bmecatEditor (WDIO + tauri-driver) vs. Playwright-Browser-Mode
5. Spike-Design (1 Tag): konkrete Schritte, Abbruchkriterien, was der Spike belegen kann und was nicht
6. Zusammenfassung / Empfehlung
7. Offene Fragen


## 0. Ausgangslage und Methode (Zwischenstand 1)

- Auftrag: drei Tauri-Fähigkeiten, die bisher nur aus Doku/Erinnerung belegt sind, belastbar prüfen (bmecat-stack-muster.md §9 R1/R6/R8, §10 Fragen 3, 4, 7, 8; vollstaendigkeitskritik.md §3.5, §5 Gap 5).
- Methode: (a) Ist-Stand S1 aus dem Code (`src/main/services/strength-display.ts`, `e2e/`, `playwright.config.ts`, `package.json`), (b) Referenz bmecatEditor (`e2e/wdio.conf.ts`, `docs/UI-ABNAHME.md`, `package.json`, `Cargo.toml`, installierte Paketversionen in `node_modules`), (c) Primärquellen online (GitHub-Issue #14019, Tauri-Doku Windows-Installer, tauri-action-README, docs.rs), (d) daraus ein konkretes Spike-Design. Kein Spike wurde ausgeführt (kein Schreibzugriff auf Repos, keine neue Tauri-App auf dieser Maschine angelegt) — der Bericht sagt, was Lesen belegt und was nur der Spike belegen kann.
- Hinweis zur Quellenlage: Der Auftragstext nennt `strength-display.ts:144–182`; die Datei liegt unter `src/main/services/strength-display.ts` (321 Zeilen), nicht unter `src/main/`.

## 1. Ist-Stand S1-Control: Was der Stärke-Monitor von einem Fenstersystem verlangt (Zwischenstand 1)

Quelle: `/Users/johannes/Developer/S1-Control/src/main/services/strength-display.ts`, `src/main/ipc/register-display-ipc.ts`, `src/renderer/src/main.tsx`.

| Anforderung | Beleg im Ist-Code | Tauri-2-Entsprechung (zu prüfen im Spike) |
|---|---|---|
| Zielmonitor = erster Nicht-Primär-Monitor, sonst Primär | `getTargetDisplay()`: `screen.getAllDisplays()`, `find(d => d.id !== screen.getPrimaryDisplay().id)`, Fallback Primär (`strength-display.ts:144-148`) | `app.available_monitors()` / `app.primary_monitor()` (Rust) bzw. `availableMonitors()`/`primaryMonitor()` (`@tauri-apps/api/window`); Vergleich über `name()`/`position()` statt `id` (Tauri-Monitor hat keine stabile numerische ID) [Detail unbelegt, docs.rs nicht geprüft] |
| Fenster exakt auf `bounds` des Zielmonitors (x, y, width, height) | `new BrowserWindow({ x: target.bounds.x, y: target.bounds.y, width, height, ... })` (`:154-158`); Nachziehen per `win.setBounds(target.bounds)` (`:190-192`) | `WebviewWindowBuilder::position(x, y).inner_size(w, h)` mit physischen Pixeln aus `monitor.position()`/`monitor.size()` (PhysicalPosition/PhysicalSize) — Skalierungsfaktor je Monitor beachten (Tauri-Issues #6843, #10263 zu Multi-Monitor-Scaling) |
| Rahmenlos, nicht verschieb-/größenänderbar, nicht minimier-/maximierbar, kein Vollbild (bewusst, wegen macOS-Space-Übergang) | `frame: false, resizable: false, movable: false, minimizable: false, maximizable: false, fullscreen: false` (`:160-166`) | `decorations(false)`, `resizable(false)`, `minimizable(false)`, `maximizable(false)`; `movable` gibt es in Tauri nicht als Builder-Option [unbelegt] → ersatzweise `decorations(false)` (ohne Titelleiste ist das Fenster ohnehin nur per `data-tauri-drag-region` verschiebbar) |
| Schwarzer Hintergrund vor dem Laden | `backgroundColor: '#000000'` (`:168`) | `background_color(Color(0,0,0,255))` (Tauri ≥ 2.1 [unbelegt]) oder CSS im Monitor-Einstieg |
| Gleiches Renderer-Bundle, Unterscheidung per Query-Parameter | `?display=strength` → `StrengthDisplayView` (`src/renderer/src/main.tsx:7-9`, `register-display-ipc.ts:20,29`) | `WebviewUrl::App("index.html?display=strength")` oder eigener Vite-Eintrag `monitor.html` (bmecat §8.3 sieht zwei Einstiege vor) |
| Zustand wird vom Hauptfenster gesetzt und an das Monitorfenster gepusht | `setState` per IPC (`register-display-ipc.ts:141-142`), `pushState()` → `webContents.send(STRENGTH_DISPLAY_STATE_CHANGED)` (`strength-display.ts:134-139`) | Tauri-Event `app.emit_to("monitor", "strength-changed", payload)` oder Backend-Store, den beide Fenster per `invoke` lesen; zwei WebViews sind zwei getrennte JS-Kontexte (bmecat R8) |
| Prewarm: Fenster verdeckt vorerzeugen (120 ms Timer), Splash-HTML, Fallback bei Ladefehler, Health-Abfrage | `prewarmTimer` (`:120-128`), Splash (`:193-201`), `getHealth()` (`register-display-ipc.ts:136`); S1 hat sogar ein SLO-Skript `scripts/check-strength-monitor-slo.cjs` (`package.json:42`) | `visible(false)` + späteres `show()`; Prewarm-Akrobatik ist in s1-main-architektur.md §10 als „weglassen" eingestuft |
| Öffnen/Schließen aus dem Hauptfenster heraus (IPC-Command) | `OPEN`/`CLOSE` → `state.strengthDisplay.openWindow()/closeWindow()` (`register-display-ipc.ts:118,125`) | **Kritisch:** Fenstererzeugung darf unter Windows nicht in einem synchronen Tauri-Command passieren (Deadlock, Tauri-Doku zu `WebviewWindowBuilder`) → `#[tauri::command] async fn open_monitor(app: AppHandle)` oder Erzeugung im `setup()`-Hook mit `visible(false)` und später nur `show()` |

Zwischenfazit §1: Die fachliche Anforderung ist klein (ein rahmenloses Vollbildfenster auf dem Zweitmonitor, das eine Zahl und eine Uhrzeit zeigt). Der Tauri-Weg braucht dafür drei Dinge, die bmecatEditor nicht vorlebt: Monitor-Enumeration, ein zweites Fenster mit eigener Capability, und einen Zustandsweg zwischen zwei WebViews.

## 2. Frage 1: Zweites rahmenloses Fenster auf dem Zweitmonitor in Tauri 2.x (Zwischenstand 2)

### 2.1 Versionsstand (crates.io / npm, abgefragt 2026-09-07)
- `tauri` 2.11.5 (2026-07-01) ist die aktuelle stabile Version; davor 2.11.4 (06-30), 2.11.3 (06-17), 2.11.2 (05-16), 2.11.1 (05-06), 2.11.0 (04-30), 2.10.3 (03-04). `tauri-runtime-wry` 2.11.4 (2026-06-30), `tao` 0.37.0 (2026-08-21), `wry` 0.56.1 (2026-08-13), `@tauri-apps/cli` 2.11.4 (2026-06-28). (Quelle: crates.io-API `/api/v1/crates/<name>`, npm-Registry.)
- bmecatEditor ist auf demselben Stand: `Cargo.lock` löst `tauri 2.11.5`, `tauri-runtime-wry 2.11.4`, `tauri-build 2.6.3`, `tauri-utils 2.9.3`, `tao 0.35.3`, `wry 0.55.1`, `webview2-com 0.38.2` auf; `@tauri-apps/cli` 2.11.4 in `node_modules`. Ein Spike auf Basis des bmecatEditor-Templates testet also den aktuellen Stand.

### 2.2 Issue #14019 — Befund (Primärquelle: `gh api repos/tauri-apps/tauri/issues/14019`)
- Titel „[bug] Tauri can't open multiple windows in multi monitor screen", **Status: open**, Labels `type: bug`, `status: needs triage`, erstellt 2025-08-17, **1 Kommentar**, kein Fix-PR verlinkt.
- Umgebung laut `tauri info` im Issue: **Fedora 41, „gnome on wayland"**, webkit2gtk 2.48.3, Tauri 2.5.1 (damals „outdated, latest: 2.7.0"). Anwendungsfall: Screenshot-Tool, ein Overlay-Fenster je Monitor; `WebviewWindowBuilder … .decorations(false).transparent(true).always_on_top(true).visible(false)` → `build()` → `set_position(PhysicalPosition{…})` → `show()`; alle Fenster landen auf dem Primärmonitor.
- Einzige Antwort (Tauri-Maintainer FabianLars, 2025-08-18): „Did Wayland add support for app-side window positioning? I'm a bit out of the loop when it comes to Linux lately but when i wasn't this simply wasn't supported."
- **Einordnung:** Das Issue dokumentiert die bekannte Wayland-Protokollbeschränkung (Clients dürfen ihre Fenster nicht selbst positionieren), keinen Windows-/macOS-Defekt. Für S1 (Windows-Clients in der FüSt, Entwicklung auf macOS) ist #14019 **nicht einschlägig**. Es ist offen, weil niemand triagiert hat, nicht weil ein Fix aussteht. Unter Linux/Wayland wäre auch Electron betroffen [unbelegt, Wayland-Eigenschaft, nicht Tauri-spezifisch].

### 2.3 Was der Tauri-Changelog zu Mehrfenster/Multi-Monitor sagt (Quelle: `crates/tauri/CHANGELOG.md`, Stand dev-Branch, 4.150 Zeilen)
| Version | Eintrag | Bedeutung für S1 |
|---|---|---|
| **2.11.0** (2026-04-30) | `110336c88` (#15250) „Fix initial window position when positioning it to another monitor." PR-Titel: „fix(macOS): fix incorrect window position on multi-monitor setups", Body: „Fixes #12167 where windows were not correctly positioned when created on a second display on macOS. Applying `set_outer_position(...)` after window creation resolves the issue" (merged 2026-04-30) | **Genau der S1-Fall (Fenster beim Erzeugen auf dem zweiten Display platzieren) war auf macOS bis 2.10.x fehlerhaft und ist seit 2.11.0 gefixt.** Der Spike muss ≥ 2.11.0 verwenden; bmecatEditor (2.11.5) erfüllt das. |
| 2.11.0 | `9808236eb` (#14655) „Fix monitor work area Y position on macOS." | `work_area()` auf macOS korrigiert (relevant, falls S1 statt `size()` den Arbeitsbereich nimmt). |
| 2.9.5 | `251203b89` (#14637) „Fix `Monitor::work_area` returns logical position and size inside the `PhysicalRect` on Linux" | Linux-only. |
| 2.11.x | `5e3126ff7` (#15338) „Expose the monitor (display) APIs on mobile." | irrelevant. |
| 2.0.0-alpha.11 | `84c41597` (#6394) „Add `App::primary_monitor`, `App::available_monitors`, `AppHandle::primary_monitor`, and `AppHandle::available_monitors`" | Die für `getTargetDisplay()` nötige Enumeration existiert seit Tauri 2 alpha auf `App`/`AppHandle` (nicht nur auf `Window`). Issue #6394 „assign a window to a specific monitor/display [feat]" ist seit 2023-03-06 geschlossen. |
| 2.0.0-beta | `ec0e092ec` (#9770) `monitor_from_point(x, y)`; `b072e2b29` (#9687) `prevent_overflow` | Zusatz-APIs; `prevent_overflow` darf für ein Vollbild-Monitorfenster NICHT gesetzt werden (würde Größe beschneiden) [Schlussfolgerung]. |
| 1.0.0-rc.15 (2022-06) | „Revert the window creation to be blocking in the main thread … has an issue on Windows where the program deadlocks when creating a window in a Tauri command if it is not `async`. The documentation now states that commands must be `async`" | Ursprung der Deadlock-Warnung; besteht bis heute (2.4). |

Verwandte Issues (Status per `gh api`, 2026-09-07): #6843 „[bug] The window size is incorrect under multiple monitors" **open** seit 2023-05-03 (6 Kommentare); #10263 „when multiple monitors have different scaling settings, the window cannot switch correctly between monitors" closed 2025-02-27; #12167 (macOS, zweites Display) durch #15250 geschlossen.

### 2.4 API-Stand (docs.rs, tauri 2.11.5)
- `tauri::webview::WebviewWindowBuilder` — „Known issues: On Windows, this function deadlocks when used in a synchronous command and event handlers. You should use `async` commands and separate threads when creating windows." Builder-Methoden für den S1-Fall: `position()`, `inner_size()`, `decorations()`, `resizable()`, `visible()`, `always_on_top()`, `background_color()`, `skip_taskbar()`, `focused()`, `fullscreen()`, `maximizable()/minimizable()`.
- `tauri::window::Monitor`: `name() -> Option<&String>`, `size() -> &PhysicalSize<u32>`, `position() -> &PhysicalPosition<i32>` („top-left corner position of the monitor relative to the larger full screen area"), `work_area() -> &PhysicalRect<i32,u32>`, `scale_factor() -> f64`. **Keine numerische ID** → Auswahl „erster Nicht-Primärmonitor" muss über Vergleich mit `primary_monitor()` per `name()`/`position()` erfolgen (heute `d.id !== primary.id`, `strength-display.ts:146`).
- `position()`/`inner_size()` im Builder sind laut docs.rs in *logischen* Pixeln; `Monitor` liefert *physische* Werte → Umrechnung mit `scale_factor()` je Monitor nötig, oder `PhysicalPosition`/`PhysicalSize` an `set_position()/set_size()` nach dem Bau übergeben (so macht es der Fix #15250). Gemischte DPI-Skalierung (Laptop 150 % + Beamer 100 %) ist der klassische Fehlerfall (#6843 offen, #10263 gefixt) → **Pflichtfall im Spike**.

### 2.5 Antwort auf Frage 1 (Stand Lesen)
- **Belegt:** #14019 ist offen, aber Wayland-spezifisch und ohne Fix-Bedarf auf Windows/macOS. Die macOS-Variante des S1-Falls war bis Tauri 2.10.x kaputt (#12167) und ist seit 2.11.0 (2026-04-30) gefixt. Monitor-Enumeration und alle nötigen Builder-Optionen existieren. Fenstererzeugung muss in einem `async`-Command oder in `setup()` erfolgen.
- **Nicht durch Lesen belegbar, nur durch den Spike:** (a) korrektes Verhalten bei gemischter DPI-Skalierung unter Windows 10/11 (#6843 offen), (b) Verhalten beim Ab-/Anstecken des Zweitmonitors zur Laufzeit (S1 ruft `getTargetDisplay()` bei jedem Laden neu auf, `strength-display.ts:189`), (c) ob `decorations(false)` + `resizable(false)` ohne `fullscreen` das Fenster unter Windows wirklich randlos über die Taskleiste legt oder ob `always_on_top`/`fullscreen(true)` nötig wird (S1 vermeidet `fullscreen` wegen macOS-Space-Übergängen, `strength-display.ts:160-161`), (d) Zustandsweg Hauptfenster → Monitorfenster per `emit_to` inkl. Neustart des Monitorfensters.
