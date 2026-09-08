# Vorschlag A – Electron-Evolution (Kern-Paket + Ereignisprotokoll)

Status: ABGESCHLOSSEN (Abschnitte 1-10 vollstaendig)
Autor-Key: vorschlag-a-electron-evolution
Blickwinkel: Evolution statt Revolution – Stack bleibt Electron + React + TypeScript, Architektur wird auf dem neuen Branch neu geschnitten.

Quellenkonvention: Berichte werden als `nas §10`, `bmecat §9 R9`, `main §10`, `handbuch §7 F-K1`, `domaenen §8.1`, `kritik §3.1`, `nachlese-speicher §1.1`, `nachlese-tauri §2.2`, `nachlese-build §3.1` zitiert (alle in `.../scratchpad/analysis/`). Code als `Datei:Zeile`. Eigene Setzungen ohne Beleg sind mit [Annahme] gekennzeichnet.

## Gliederung
1. Leitidee und Abgrenzung
2. Stack und Prozessmodell
3. Speicher- und Sync-Modell auf dem NAS-Share
4. Fachliches Zielmodell in Grundzügen
5. Modul-/Repo-Struktur auf dem neuen Branch
6. Ausgaben (Druck/Status/Log/FüOrg/Auswertung/HTML-Monitor)
7. Test- und Qualitätsstrategie
8. Meilensteine bis Excel-Parität
9. Risiken mit Gegenmaßnahmen
10. Was Johannes noch entscheiden/liefern muss

---

## 1. Leitidee und Abgrenzung

### 1.1 Die Leitidee in einem Satz

Das Problem von S1-Control v1 ist **nicht der Stack, sondern die Datenschicht und der Modulschnitt**; deshalb wird auf dem neuen Branch genau das ausgetauscht (Ereignisprotokoll statt Ganzdatei-Überschreiben, Electron-freies Kern-Paket statt Logik im Main-Prozess, Store statt 150-Props-Drilling) – und alles, was heute nachweislich trägt (eine Sprache, 190 Unit-Tests, 10 BDD-Szenarien, CI mit vier Zielplattformen, macOS-Signierung/Notarisierung, Auto-Update, `printToPDF`, Mehrfenster auf dem Zweitmonitor), bleibt unangetastet.

### 1.2 Warum diese Zuordnung von Ursache und Kur belastbar ist

Alle vier Bestandsberichte kommen unabhängig zum selben Schluss, dass die Stackfrage die harten Probleme nicht berührt:

- `nas §10`: „Die Speicherfrage ist **stack-neutral**; sie spricht weder für noch gegen Tauri."
- `bmecat §9 Gesamteinschätzung`: Tauri „löst … **keines** der harten S1-Probleme (SMB-Locking, Sync, Offline-Update)"; der Nutzen entstehe „vor allem durch die **Neuordnung als Kern-Crate mit Konzept-Doku**, nicht durch Rust an sich; dieselbe Neuordnung wäre auch in Electron möglich (Kern als reines TS-Paket ohne Electron-Import)."
- `main §10 Bewertung`: „ein Rust-Kern nimmt die I/O zuverlässig vom UI-Thread und macht O_EXCL/fsync/Verify explizit, löst aber das Konsistenzmodell nicht von selbst."
- `kritik §4`: „Der Stack ist dafür zweitrangig – das sagen historie, main, nas und bmecat übereinstimmend."

Dieser Vorschlag nimmt bmecats eigenen Satz beim Wort und führt die Neuordnung **ohne** Sprachwechsel durch. Die Kur ist damit identisch mit der eines Tauri-Neuanfangs (Kern-Paket, Ereignisprotokoll, Store, Konzept-Doku, CLI), nur ohne die Kosten R1/R5/R6/R11 aus `bmecat §9`.

### 1.3 Was hier anders ist als bei den Alternativen

| Dimension | Vorschlag A (Electron-Evolution) | Tauri-Neuanfang | „v1 reparieren" |
|---|---|---|---|
| Sprachen | 1 (TypeScript) | 2 (Rust + TS) | 1 |
| Kern-Fachlogik | eigenes npm-Workspace-Paket ohne `electron`-Import, im Node **und** im Browser lauffähig | Rust-Crate `s1-model`/`s1-store` | bleibt im Main-Prozess verstreut |
| Datenmodell auf dem Share | Ereignisprotokoll (Neuentwurf, Bruch mit v1) | Ereignisprotokoll oder Lockfile-Portierung (Berichte widersprechen sich) | Lockfile + Ganzdatei (nachweislich Lost Update) |
| Renderer | wird **neu strukturiert** (Store, Routen, Komponententests), Komponenten wandern kuratiert mit | „weitgehend übernehmbar" (`bmecat §8.2`) – von `kritik §3.6 Punkt 7` als zu optimistisch markiert | bleibt wie er ist |
| Bestand, der weiterläuft | CI-Matrix, Signierung, Updater-Kern, Playwright-BDD, 190 Vitest-Tests, `printToPDF` | keiner davon (`bmecat §8.2`: E2E anpassen, Updater neu, Mehrfenster neu, Watching neu, Peer-Serve neu) | alles |
| Native Module | **keine** (better-sqlite3/drizzle fliegen raus) | keine | better-sqlite3 bleibt im Build |
| Zeit bis zur ersten lauffähigen Mehrclient-Demo | kurz (M0 in derselben Sprache und demselben Testframework) | länger (Toolchain, Bindings, E2E-Wechsel zuerst) | nie, Modellfehler bleibt |

### 1.4 Die vier Schnitte, die den Branch ausmachen

1. **Kern-Paket ohne Electron.** `packages/kern` enthält Domänentypen, Ereigniskatalog, Fold, Konfliktregeln, HLC, Dateiformat-Serialisierung, Migrationen, Fachvalidierungen – und importiert weder `electron` noch `node:fs`. Es ist damit in Vitest, im Renderer, in einer CLI und (später) in einem Web-Betrachter lauffähig. Das ist das TS-Äquivalent von `bmecat M1` („UI-freier Kern-Crate + CLI-Bins").
2. **Main wird dünne I/O-Schicht.** Der Main-Prozess besitzt keinen Fachzustand mehr; er startet Fenster, vermittelt IPC und delegiert **jede** Share-Operation an einen Worker-Thread. Damit fällt `R-MAIN-1` (`main §9`: synchrone I/O und `Atomics.wait` bis 5 s im Main-Thread) strukturell weg.
3. **Ereignisprotokoll statt Ganzdatei.** Entscheidung in §3: `nas §10` Option C→E. Damit fallen `R-DATA-1/2`, `R-LOCK-1…6`, `R-SYS-1…3` (`main §9`) ersatzlos weg, weil es weder ein globales Lock noch eine geteilte RMW-Datei mehr gibt.
4. **Renderer mit Store.** Ein Zustandsspeicher (Zustand/Redux-Toolkit) als einzige Quelle für Fachdaten im Renderer; Komponenten lesen selektiv. Das behebt die in `kritik §3.6 Punkt 7` genannten Befunde (150-Props-Drilling, 91 Typfehler, 0 Komponententests) und ist Voraussetzung für das zweite Fenster (Stärke-Monitor) und die Ausgaben.

### 1.5 Wo Electron ehrlich unterlegen ist

Diese Punkte werden nicht schöngeredet; sie sind der Preis dieses Vorschlags.

- **Installer-Größe.** Windows-NSIS heute 101.954.252 B ≈ **102 MB**, macOS-DMG 125,7 MB, Linux-deb 90,6 MB (`gh-release-assets.tsv`, Releases 2026.02.26.*). Ein Tauri-Build *ohne* mitgeliefertes WebView2 wäre bei ~10–20 MB. Relativierung: Mit dem für das THW-Offline-Netz nötigen `fixedRuntime` (~180 MB) bzw. `offlineInstaller` (~127 MB, `bmecat §9 R1`) liegt Tauri **über** dem heutigen Electron-Installer. Der Größenvorteil von Tauri existiert genau in dem Szenario nicht, das S1 braucht.
- **Arbeitsspeicher.** Ein Chromium pro App statt System-WebView; mit dem Stärke-Monitor zwei Renderer-Prozesse. Größenordnung 250–450 MB RSS gegenüber 80–150 MB bei Tauri [Annahme, nicht gemessen]. Auf FüSt-Laptops mit ≥ 8 GB unkritisch; auf einem Uralt-Gerät spürbar.
- **Startzeit** ist bei Electron höher als bei einer WebView-App [Annahme; kein Messwert in den Berichten].
- **Native Module** waren bisher ein echter Nachteil (`rebuild:native` in jedem Build-Skript, `package.json:33-40`, `@types/better-sqlite3`, `drizzle-kit`). Dieser Nachteil **entfällt vollständig**, sobald SQLite raus ist: Das Ereignisprotokoll braucht nur `node:fs`, `node:crypto`, `node:worker_threads`, `node:dgram`. Kein `node-gyp`, kein Cross-Build-Problem, kein ABI-Bruch bei Electron-Upgrades. Damit wird `npm run rebuild:native` gestrichen und die vier CI-Build-Jobs werden einfacher, nicht komplexer.
- **Sicherheitsmodell.** Tauri hat Capabilities je Fenster; Electron braucht Disziplin (contextIsolation, sandbox, kein `nodeIntegration`, enge Preload-API). Das ist Handarbeit statt Konfiguration – aber es ist Handarbeit, die in v1 bereits geleistet ist (Preload mit expliziter API, `src/main/preload.ts`).
- **Eine Rust-Typprüfung für den Fold gäbe es nicht.** Ein `serde`-Enum mit exhaustivem `match` ist stärker als ein TS-Union-Type mit `switch`. Gegenmaßnahme: `zod`-Schemata je Event (bereits Dependency), `satisfies`-Exhaustiveness-Checks, Property-Tests (§7).

### 1.6 Wo die Evolution dem Neuanfang überlegen ist

- **Der Renderer ist nicht kostenlos übernehmbar – aber er ist auch nicht wertlos.** `kritik §3.6 Punkt 7` warnt zu Recht davor, ihn als geschenkt anzusetzen. In diesem Vorschlag wird er umgebaut, aber die *Inhalte* (Führungsstruktur-Ansicht, Org-Chips, taktische Zeichen, Dialoge, Stärke-Monitor-Ansicht) bleiben TSX und wandern kuratiert. Bei einem Tauri-Neuanfang wandern sie ebenfalls – nur zusätzlich zum Sprachwechsel darunter.
- **Der Updater bleibt.** `bmecat §8.2` listet „Auto-Updater: **neu**" und `R11` beziffert den Peer-Update-Neubau (~1.000 Zeilen TS in 7 Dateien). In Vorschlag A bleibt `electron-updater` samt `updater-versioning.ts` (Datums-Buildnummern-Vergleich, in `bcf15c6`/`ffa14f8` gerade erst repariert) und samt der 2.021–2.985 Testzeilen, die laut `historie §5` die Testsuite dominieren.
- **Drucken ist gelöst statt offen.** `bmecat §9 R7`: Tauri hat kein Print-API. Electron hat `webContents.printToPDF()` und `webContents.print({silent})`. Für ein Werkzeug, dessen Excel-Vorgänger acht Ausgabeprodukte kennt (`handbuch §10`), ist das kein Randthema (§6).
- **Mehrfenster auf dem Zweitbildschirm ist erprobt.** `strength-display.ts` löst Monitorwahl, Rahmenlosigkeit, Nachziehen bei Displaywechsel und Prewarm bereits; `nachlese-tauri §1` zeigt, dass die Tauri-Entsprechung drei Dinge braucht, die bmecatEditor nicht vorlebt, plus DPI-Fallstricke (#6843 offen).
- **E2E bleibt.** `playwright-bdd` mit `_electron.launch()` und die 10 Szenarien laufen weiter; `bmecat §9 R6` stuft den Werkzeugwechsel als „Mittel–hoch" ein.
- **CI ist gemessen und günstig.** `nachlese-build §3.1`: Median **5:16 min** Wandzeit je Push, 12,5–15 Runner-Minuten, kritischer Pfad `build-win` 239 s. Für Tauri schätzt `bmecat §9 R4` „10–20 min je Plattform [CI-Zahl unbelegt]". Bei einem Einzelentwickler mit vielen kleinen Commits ist das ein täglich spürbarer Unterschied.
- **Ein-Personen-Team.** `bmecat §9 R5` stuft „zwei Sprachen" selbst als Risiko **Hoch** ein. Vorschlag A entfernt dieses Risiko, statt es zu mitigieren.

### 1.7 Abgrenzung: Was Vorschlag A ausdrücklich NICHT ist

- **Kein „v1 reparieren".** Der Branch beginnt mit einem leeren `packages/kern` und einem neuen Dateiformat; das v1-Format wird nur noch **gelesen** (Migration, §3.9). Alle in `main §10 „Weglassen"` genannten Teile (Utility-Prozess-Gerüst ~1.000 Z., `EinsatzReadCache`, better-sqlite3/drizzle, LAN-Peer-Update, Debug-Log-Forwarding, Prewarm-Akrobatik) werden nicht mitgenommen.
- **Kein Festhalten am Lockfile-Modell.** `bmecat §9 R9` („1:1 portieren") wird in §3.2 begründet verworfen.
- **Keine Wette darauf, dass Electron „für immer" richtig ist.** Weil der Kern Electron-frei und I/O-frei ist, ist ein späterer Wechsel der Schale (Tauri, Web, Mobil) ein Austausch von `apps/desktop`, nicht ein Neuschreiben der Fachlogik. Der Vorschlag hält die Tauri-Option offen, statt sie jetzt zu ziehen.

---

## 2. Stack und Prozessmodell

### 2.1 Laufzeit und Sprachen

| Baustein | Wahl | Begründung / Beleg |
|---|---|---|
| Desktop-Schale | Electron (aktuelle Stable-Linie, heute `electron ^43.4.0` in beiden Repos) | Bestand; vier gebaute Zielplattformen (`nachlese-build §3.1`) |
| Sprache | TypeScript, `strict: true`, überall | eine Sprache (`bmecat §9 R5`) |
| UI | React 19 + Vite | Bestand in S1 und in erfassungsbogen.app |
| Renderer-Zustand | **Zustand** (klein, kein Boilerplate, Selektoren, gut testbar) | ersetzt 150-Props-Drilling (`kritik §3.6 Punkt 7`); `bmecat M22` fordert für zwei Fenster ohnehin einen Store |
| Validierung | `zod` (bereits Dependency) für Event-Payloads und Dateiheader | Ersatz für Rusts `serde`-Typsicherheit |
| Bündler Main/Preload | `tsup` (Bestand) | keine Änderung nötig |
| Paketverwaltung | **npm-Workspaces** (kein pnpm/turbo) | npm ist bereits im Einsatz, CI-Cache funktioniert, kein neues Werkzeug für einen Einzelentwickler |
| Native Module | **keine** | `better-sqlite3`, `drizzle-orm`, `drizzle-kit`, `@types/better-sqlite3`, `rebuild:native` entfallen (`main §10 Weglassen`) |

Neue Laufzeit-Abhängigkeiten gegenüber heute: `zustand`, `exceljs` (Excel-Import/-Export, §6.5), `fast-check` (nur dev, Property-Tests). `handlebars` und `jszip` bleiben (Ausgaben/Export). `taktische-zeichen` / `taktische-zeichen-core` bleiben.

### 2.2 Prozess- und Threadmodell

```
┌─ Main-Prozess (Electron) ─────────────────────────────────────────────┐
│  Fensterverwaltung, Menü, IPC-Registrierung, App-Lebenszyklus         │
│  KEIN Fachzustand, KEINE synchrone Datei-I/O, KEIN Fold               │
│      │ postMessage / MessagePort                                      │
│      ▼                                                                │
│  ┌─ Worker-Thread „akte" (node:worker_threads), 1 je offenem Einsatz ┐ │
│  │  packages/kern      – Fold, Konfliktregeln, Domänenlogik          │ │
│  │  packages/speicher  – append/read/fsync, Poll-Schleife, Snapshots │ │
│  │  packages/netz      – UDP-Hinweise (dgram), Peer-Liste            │ │
│  │  hält die materialisierte Sicht (Maps) und den Version-Vector     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
        │ IPC (contextIsolation, Preload-Whitelist)
        ├──────────────► Renderer „haupt"    (index.html)     – Arbeitsfenster
        └──────────────► Renderer „monitor"  (monitor.html)   – Stärke-Monitor
```

Regeln, die daraus folgen (und die `AGENTS.md §1-2` endlich erfüllen, das laut `main §10` „richtig, aber nicht implementiert" ist):

- Der Main-Thread ruft **nie** eine `*Sync`-Datei-Funktion auf. Lint-Regel: `no-restricted-syntax` gegen `readFileSync|writeFileSync|renameSync|existsSync` in `apps/desktop/src/main/**` außerhalb von `bootstrap`.
- Der Worker ist der einzige Schreiber der eigenen Ereignisdatei. Ein Absturz des Workers reißt die App nicht mit; der Main startet ihn neu, der Worker verifiziert seine Datei (§3.5).
- Kommandos gehen als **Intent** an den Worker (`einheit:verschiebe {einheitId, zielAbschnittId}`), nicht als fertiger Zustand. Der Worker erzeugt daraus 0..n Ereignisse, faltet, und schickt ein Delta zurück. Damit ist die Kommando-Validierung genau einmal implementiert, testbar ohne Electron.
- Der Renderer bekommt **Deltas** (geänderte Entitäten + neue ETB-Zeilen), nicht den Gesamtzustand. Bei 300 Einheiten wäre Gesamtzustand zwar bezahlbar, aber Deltas machen das zweite Fenster und die Konflikthinweise sauber.

IPC-Vertrag: `packages/kontrakt` definiert Kanalnamen, Request- und Response-Typen als `zod`-Schemata; `preload.ts` erzeugt daraus die `window.s1`-API. Das ersetzt die heutigen 67 lose gepflegten Kanalstrings (`src/shared/ipc.ts:360–445`, `kritik §3.3`) durch eine generierte, validierte Oberfläche – das TS-Gegenstück zu `bmecat M21` (`tauri-specta`).

### 2.3 Fenster, insbesondere Stärke-Monitor auf dem Zweitbildschirm

Zwei Vite-Einstiegspunkte statt Query-Parameter:

- `apps/desktop/index.html` → `src/fenster/haupt/main.tsx`
- `apps/desktop/monitor.html` → `src/fenster/monitor/main.tsx`

Das ersetzt `?display=strength` (`src/renderer/src/main.tsx:7-9`) und sorgt dafür, dass das Monitorfenster nur sein eigenes, kleines Bundle lädt (schnellerer Start, kein Zugriff auf Bearbeitungs-IPC).

Übernommen aus `strength-display.ts` (das ist bewährte, teuer erarbeitete Logik):
- Zielmonitor = erster Nicht-Primärmonitor, sonst Primär (`:144-148`)
- exakte `bounds`-Übernahme und Nachziehen bei `display-*`-Events (`:190-192`)
- `frame:false, resizable:false, movable:false, minimizable:false, maximizable:false, fullscreen:false` (`:160-166`) – bewusst kein Vollbild wegen macOS-Space-Übergang
- `backgroundColor:'#000000'` (`:168`)

Weggelassen (`main §10 Weglassen`): Prewarm-Timer, Splash-HTML, Diagnose-Flag, `check-strength-monitor-slo.cjs`. Das Fenster wird schlicht beim Öffnen erzeugt.

Inhaltlich wird der Monitor gegenüber v1 erweitert, weil die Excel mehr zeigt (`handbuch §7 F-K6`, HTML-Lagemonitor): umschaltbare Seiten **Stärke gesamt**, **Druck-Ansicht je Einsatzstelle**, **Status-Matrix**, **Logistik**, mit Rotation alle n Sekunden und großer „Stand: hh:mm"-Zeile (`F-K7`). Der Monitor ist reiner Leser: er abonniert dieselben Deltas, kann aber kein Kommando senden (Preload-Whitelist je Fenster).

### 2.4 Build

```
npm run build            → clean, lint, typecheck, kern-test, build:renderer, build:main, electron-builder --dir
npm run build:win:exe    → NSIS
npm run test             → vitest (alle Pakete, Workspace-weit)
npm run test:e2e         → bddgen && playwright test
npm run akte             → CLI (packages/cli): pruefen | falten | exportieren | migrieren | simulieren
```

Gegenüber heute entfällt `rebuild:native` in **allen** Build-Skripten (7 Vorkommen in `package.json`), weil kein natives Modul mehr gebaut wird. `drizzle.config.ts` und `drizzle/` werden gelöscht.

### 2.5 Installer für Windows, offline

- **electron-builder NSIS, ein Artefakt, keine Laufzeit-Nachladung.** Der heutige Installer ist mit 101.954.252 B bereits vollständig offline lauffähig (`gh-release-assets.tsv`); das ist der Normalfall bei Electron und kein Sonderaufbau. Ohne `better-sqlite3` wird er geringfügig kleiner [Annahme: wenige MB].
- Zusätzlich wird ein **Portable-Ziel** gebaut (`build:win:portable` existiert bereits): ein einzelnes `.exe`, das ohne Installation und ohne Adminrechte von einem USB-Stick oder direkt vom Share startet. Für Meldeköpfe auf fremden Rechnern ist das der schnellste Weg in den Betrieb.
- Codesignierung Windows fehlt heute (`bmecat §9 R13`, Einschätzung „Niedrig"). Empfehlung: unverändert lassen, aber die SmartScreen-Warnung in der Betriebsanleitung dokumentieren. [Annahme: kein THW-Zertifikat verfügbar]
- macOS bleibt signiert/notarisiert (CI-Schritt existiert, `nachlese-build §3.1`: „Build macOS artifacts 139–159 s inkl. Signierung/Notarisierung"; Fehlerfall `27022162439` führte zu `ed68271 fix(ci): add macOS certificate validity check`).

Vergleich zur Alternative: Tauri müsste für dasselbe Offline-Verhalten `fixedRuntime` (~180 MB) oder `offlineInstaller` (~127 MB) mitliefern (`bmecat §9 R1`), plus offene Frage 4 (`tauri-action` mit fixedRuntime ohne 180-MB-Blob im Repo). Der Installer-Vorteil von Tauri verschwindet also in genau diesem Anwendungsfall.

### 2.6 Auto-Update, inklusive Rechner ohne Internet

Drei Kanäle, absteigend nach Bequemlichkeit; alle drei nutzen denselben Versionsvergleich `updater-versioning.ts` (Datums-Buildnummern `YYYY.MM.DD.HH.MM`, in `ffa14f8` repariert):

1. **Internet vorhanden (Vorbereitung im OV, Heimarbeitsplatz):** `electron-updater` gegen GitHub-Releases wie heute. Der dreifache GitHub-Fallback wird auf einen Pfad reduziert (`main §10 Weglassen`).
2. **Kein Internet, aber Share erreichbar (Regelfall im Einsatz): Update-Ablage auf dem NAS.** Neu und einfach:
   ```
   \\NAS\Einsatz\S1-Control\programm\
     aktuell.json                 # {version, dateien:[{plattform, datei, groesse, sha256}], stand}
     S1-Control-2026.09.07.10.15-win-x64.exe
     S1-Control-2026.09.07.10.15-mac-arm64.dmg
   ```
   Der Client liest beim Start und dann stündlich `aktuell.json`, vergleicht mit `app.getVersion()`, prüft `sha256` nach dem Kopieren in den lokalen Cache und bietet „Neue Version 2026.09.07 verfügbar – jetzt installieren?" an. Auf Windows wird der NSIS-Installer mit `/S` gestartet und die App beendet [Annahme: Silent-Install ohne Adminrechte, weil `perMachine:false` – zu prüfen, §10]. Befüllt wird der Ordner von genau einem Rechner (dem mit Internet) über den Menüpunkt „Update ins Einsatz-Share legen". Das ist ~150 Zeilen und ersetzt die 796 + 123 Zeilen LAN-Peer-Update, die `main §10` ohnehin zum Weglassen empfiehlt und deren Peer-Download-Timeout von 3 s laut `R-UPD-1` „praktisch nie erfolgreich bei Installer-Größen" ist.
3. **Weder Internet noch Share:** USB-Stick, Portable-EXE, manuelle Installation. Die Betriebsanleitung nennt das als Verfahren; die App zeigt ihre Version prominent im Info-Dialog und im Monitorfenster-Fuß.

**LAN-Peer-Update wird gestrichen.** Begründung: `main §9 R-UPD-1` (3-s-Timeout unbrauchbar), `main §10 Weglassen`, und Kanal 2 löst dasselbe Problem mit dem Medium, das ohnehin da ist. Falls Johannes es behalten will, ist das eine bewusste Entscheidung mit Aufwand (§10, Punkt 7).

---

## 3. Speicher- und Sync-Modell auf dem NAS-Share

### 3.1 Entscheidung

**Gewählt wird `nas §10` Option C, ausgebaut zu E: Append-only-Ereignisprotokoll mit genau einem Schreiber je Datei, HLC-Ordnung, deterministischer Fold mit fachlichen Konfliktregeln, lokale Materialisierung je Client.**

**Verworfen wird `bmecat §9 R9`: „Heutiges S1-Modell (Lockdatei `wx`, Stale-Timeout, tmp+rename, `writeSeq`, UDP-Signal, Presence-Heartbeat) 1:1 in `s1-store`/`s1-net` portieren; zusätzlich optimistische Konflikterkennung."**

### 3.2 Begründung der Entscheidung (der Widerspruch im Einzelnen)

Der Widerspruch ist auflösbar, weil die beiden Empfehlungen nicht auf demselben Faktenstand stehen.

**(a) Die tragende Prämisse von R9 ist falsifiziert.** `bmecat §9 Gesamteinschätzung` begründet die Portierung damit, die Mechanismen müssten in Rust neu gebaut werden, „**wo sie heute in TS funktionieren und getestet sind** (190 Unit-Tests, 10 BDD-Szenarien)". Sie funktionieren nicht. `kritik §3.4` hat den Lost Update zur Laufzeit reproduziert (`scratchpad/repro/lost-update.ts`, zwei `openDatabaseWithRetry`-Kontexte auf einer Datei): nach `A.save()` steht `[A1]` in der Datei, nach `B.save()` steht `[B1]` – A1 ist weg, und `writeSeq` bleibt bei 1, weil B seinen In-Memory-Zähler `0+1` zurückschreibt. `nachlese-speicher §2` bestätigt das an den Codestellen (`connection.ts:52-58`, `einsatz-store.ts:25-36` mit null Aufrufern). Portiert würde also ein Modell, das im Mehrbenutzerbetrieb nachweislich Daten verliert.

**(b) Die von R9 vorgeschlagene Ergänzung ist keine Ergänzung, sondern ein anderer Schreibpfad.** „`writeSeq` beim Schreiben prüfen" setzt ein Re-Read vor jedem Write voraus, also den Wechsel von `ctx.save()` auf `mutateEinsatzFile` (`nachlese-speicher §2`, `kritik §3.4`). Wer diesen Wechsel macht, hat bereits die halbe Neuentwicklung geleistet – und landet trotzdem bei einem Read-Modify-Write der Gesamtdatei unter einem netzweiten Lock.

**(c) Auch repariert bleibt Option B strukturell schwach.** `nas §3 Restrisiko`: „Selbst repariert bleibt ein Single-Document-Modell mit globalem Lock: jeder Schreibvorgang serialisiert alle Clients über ein netzweites Lock mit Timing-Annahmen (10 s/5 s/60 s), und der Lock ist wegen Client-Uhren und SMB-Caches nicht sauber definierbar." Konkret sind das sechs eigenständige Fehlerquellen, die alle nur beim Lockfile-Modell auftreten (`main §9`): `R-LOCK-1` (Stale-Overwrite ohne `O_EXCL`, zwei Wartende halten denselben Lock), `R-LOCK-2` (Stale-Vergleich Schreiber-Uhr gegen Leser-Uhr), `R-LOCK-3` (langsames SMB enteignet den echten Halter → zwei Schreiber), `R-LOCK-4` (`unlink` im `finally` löscht fremde Locks), `R-LOCK-5` (Lock-Timeout wirft, nachdem `ctx` bereits mutiert wurde → Speicher und Datei divergieren dauerhaft), `R-SYS-2` (`ctx.save()` schreibt die Systemdatei ohne Lock und löscht fremde Sperren/Präsenz).

**(d) Das Ereignisprotokoll berührt keine dieser Stellen.** `nas §10 Begründung 1`: „Es ist die einzige Option, bei der **keine** der belegten SMB-Schwächen … den Schreibpfad berührt: Jeder Client schreibt ausschließlich eigene Dateien, ohne Lock, ohne Replace-Rename, mit `fsync`." Die SMB-Belege dafür stehen in `nas §1.1–§1.11` mit Primärquellen (Microsoft-Redirector-Caches 10 s/5 s/10 s, MS-SMB2 FLUSH/Durable Handles, Oplock vs. Lease, `open(2)` O_APPEND-Semantik).

**(e) Es gibt keinen Widerspruch zu `main §10`.** `nachlese-speicher §1.3` weist nach, dass `main §10` beide Wege offenlässt („(b) Konflikterkennung (writeSeq/Version-CAS **oder Ereignis-Log je Client**)"), aber Mindestanforderungen (a)–(f) stellt, die das heutige Modell in keinem Punkt erfüllt. Option C erfüllt alle sechs: (a) append-only, (b) Ereignis-Log je Client, (c) Leser sehen Fremdänderungen per Tail, (d) Präsenz/Sperren je Client in eigenen Dateien, (e) Append + `fsync` + Prüfsumme statt tmp+rename, (f) alles im Worker-Thread.

**(f) Der Fold ist der einzige Weg, Konsistenz ohne Netz und ohne Uhr zu testen.** `nas §10 Begründung 3`: gleiche Ereignismenge → gleicher Zustand, unabhängig von Reihenfolge, Latenz und Uhrzeit. Das ist für einen Einzelentwickler mit KI-Unterstützung der entscheidende Punkt: Property-Tests über Permutationen ersetzen Feldversuche mit vier Laptops auf einem echten Share (§7.3).

**(g) Fachlich ist es ohnehin gefordert.** Die Excel führt ein ETB (`handbuch §7 F-E3`, `N-6` „unlöschbare Meldekopf-Historie"), verlangt Nachvollziehbarkeit und echtes Undo (`F-L2`: „ein Nachfolger sollte echtes Undo/Änderungsprotokoll bieten"). `main §10 Neu machen` fordert „Bewegungen/Logs: als eigenes, append-only Journal statt Array in der Hauptdatei; daraus Undo, Audit und Stärkeverlauf ableiten". Das Ereignisprotokoll ist genau dieses Journal – man bekommt Persistenz und ETB in einem Artefakt statt in zweien.

**Was aus `bmecat` trotzdem übernommen wird**, damit die Entscheidung nicht als Pauschalablehnung missverstanden wird: `M16` (Schema-Versionierung mit Migrationskette und Test je Stufe → hier `schemaVersion` je Ereignis plus Upcaster), `M19` (Änderungserkennung per Polling statt Watcher), `M12` (Event-Namensschema), `M13` (Fortschritts-Drossel 150 ms), `M15` (Aufräumen verwaister Temp-Dateien, nur eigene), `M20` (Bundle-Ressource + überschreibbare Nutzerkopie für STAN-Daten), `M29`/`M30`/`M31` (Konzeptdokumente mit §-Nummern, verworfene Alternativen, Messwerte an jeder Performance-Aussage). `nas` und `bmecat` sind sich in fünf Punkten ohnehin einig (`nachlese-speicher §1.4`).

### 3.3 Dateilayout auf dem Share

Weitgehend `nas §11`, mit vier Präzisierungen (Bündel-Datei für die Dateizuordnung, deutsche Ordnernamen, getrennte Stammdaten- und Programm-Ablage, Meldekopf-Eingang):

```
\\NAS\Einsatz\S1-Control\
  ablage.json                                   # Formatversion, Mindest-App-Version, erzeugt mit create-new
  einsaetze\
    2026-09-06_hochwasser-oldenburg_7f3a\
      einsatz.s1control                         # Bündel-Kopf: einsatzId, Name, Anlagedatum, formatVersion.
                                                #   Unveränderlich (create-new). Trägt die Dateizuordnung:
                                                #   Doppelklick öffnet den Ordner in S1-Control.
      ereignisse\
        c-9b12ef-fuest1.000001.jsonl            # <clientId>.<segment>.jsonl – EIN Schreiber, nur Append
        c-9b12ef-fuest1.000002.jsonl            # neues Segment ab 8 MB oder bei jedem App-Start
        c-44d0a3-meldekopf1.000001.jsonl
      schnappschuesse\
        20260906T141233Z-c-9b12ef.json          # {versionsvektor, zustand, hashKette} – unveränderlich
      praesenz\
        c-9b12ef-fuest1.json                    # eigene Datei; einzige, die überschrieben wird (rein informativ)
      anhaenge\
        <sha256>.pdf                            # EEB-Scans, Fotos – unveränderlich, inhaltsadressiert
      ausgaben\
        monitor.html                            # HTML-Lagemonitor (F-K6), zyklisch überschrieben vom Leitclient
        Druck_2026-09-06_1412.pdf               # abgelegte Ausdrucke
      archiviert.marker                         # existiert ⇒ Einsatz beendet
  archiv\
    2026-08-12_uebung-ammerland_1c9e.zip        # Einsatzakte inkl. Rohprotokoll + Hashliste
  stammdaten\
    stan-thw-2025.json                          # unveränderlich je Version, Dateiname = Version
    kopiervorlagen-fw-nds-2026.json
    einheitstypen-kats-nds-2026.json
  programm\
    aktuell.json + Installer                    # Update-Ablage (§2.6)
```

Lokal je Client (Electron `app.getPath('userData')`):

```
%APPDATA%\S1-Control\
  einsaetze\<ordner>\ereignisse\<eigene>.jsonl  # lokale Wahrheit, wächst auch ohne NAS
  einsaetze\<ordner>\fremd\<clientId>.<seg>.jsonl  # gespiegelte Fremdereignisse (Lesecache)
  einsaetze\<ordner>\uebertragung.json          # {eigenerUploadOffset, gelesenePositionen:{datei:offset}}
  einsaetze\<ordner>\schnappschuss.json         # letzter lokaler Fold-Stand
  einstellungen.json                            # Share-Pfade, zuletzt geöffnet, Client-Identität
```

**Zeilenformat einer Ereignisdatei** (`nas §11`, konkretisiert):

```
<len>\t<crc32>\t<json>\n
```

mit `<json>` =

```jsonc
{
  "id": "c-9b12ef:000123",          // clientId + laufende Nummer, global eindeutig
  "hlc": "1757164353123:0007:c-9b12ef",  // physisch(ms):logisch:clientId, lexikografisch sortierbar
  "wand": "2026-09-06T14:12:33+02:00",   // lokale Wandzeit des Schreibers, nur zur Anzeige
  "akteur": { "benutzer": "Rudolph", "rechner": "FUEST-1", "rolle": "S1" },
  "typ": "EinheitVerschoben",
  "v": 1,                            // schemaVersion dieses Ereignistyps
  "nutzlast": { "einheitId": "e-3f8a", "vonAbschnittId": "a-01", "nachAbschnittId": "a-07" },
  "fachzeit": "2026-09-06T14:10:00+02:00",  // vom Nutzer angegebene Meldezeit (optional, ETB-relevant)
  "ruecknahmeVon": null,             // Kompensationsereignis: id des zurückgenommenen Ereignisses
  "vorher": "b3f1…"                  // BLAKE2s der vorherigen Zeile derselben Datei (Hash-Kette)
}
```

`len` und `crc32` erlauben es dem Leser, eine unvollständig geschriebene letzte Zeile sicher zu verwerfen (`nas §4`); `vorher` macht nachträgliche Manipulation erkennbar (`nas §8.4`).

### 3.4 Ereigniskatalog (Grundzüge)

Der Katalog ist die zentrale Spezifikation; er wird als `docs/KONZEPT-EREIGNISSE.md` mit §-Nummern geführt (`bmecat M29`) und ist die Voraussetzung dafür, dass das Restrisiko 1 aus `nas §10` („Regelwerk-Vollständigkeit") beherrschbar bleibt. Erste Fassung, gruppiert:

| Gruppe | Ereignistypen |
|---|---|
| Einsatz | `EinsatzAngelegt`, `EinsatzStammdatenGeaendert`, `KostenparameterGesetzt`, `EinsatzArchiviert` |
| Abschnitt/Einsatzstelle | `AbschnittAngelegt`, `AbschnittUmbenannt`, `AbschnittUmgehaengt`, `AbschnittSortiert`, `AbschnittAufgeloest` |
| Einheit | `EinheitAngelegt`, `EinheitFelderGeaendert`, `EinheitVerschoben`, `EinheitPositionGesetzt`, `EinheitStatusGesetzt`, `EinheitSchichtGesetzt`, `EinheitStaerkeGesetzt`, `EinheitGeteilt`, `EinheitZusammengefuehrt`, `EinheitEntfernt` (Tombstone) |
| Fahrzeug/Helfer | `FahrzeugAngelegt`, `FahrzeugGeaendert`, `FahrzeugEinheitZugeordnet`, `FahrzeugEntfernt`, `HelferAngelegt`, `HelferGeaendert`, `HelferEntfernt` |
| Ressourcenplanung | `AnforderungAngelegt`, `AbloesungAngefordert`, `AnforderungZugesagt`, `AnforderungEinheitVorgesehen`, `EinheitEingetroffen`, `EinheitEinsatzendeGesetzt`, `EinheitZurueckgefuehrt` |
| Logistik/Kosten | `LogistikbedarfGesetzt` (w/d/veget/vegan/ÜN m/w/d), `PsaBedarfGesetzt` |
| FüSt-Personal | `DienstpostenBesetzt`, `DienstpostenGeraeumt`, `SchichtplanEintragGesetzt` |
| EEB | `EebBogenImportiert` (Nutzlast: dekodierter Bogen + Herkunft QR/Datei/Segmentstapel), `EebDateiVerknuepft` |
| Meldekopf | `MeldungEingegangen`, `MeldungUebernommen`, `MeldungZurueckgestellt`, `MeldungAbgelehnt` |
| ETB/Führung | `EtbEintragErfasst` (Freitext, mit Fachzeit), `LagemeldungErfasst`, `KonflikthinweisQuittiert` |
| Technisch | `EreignisZurueckgenommen` (`ruecknahmeVon`), `SchnappschussErzeugt` (nur Hinweis, kein Zustand), `ClientRegistriert` |

Gestaltungsregeln:
- **Absolutwerte nur dort, wo LWW fachlich richtig ist** (Name, Status, Schicht, Bemerkung). Zähler, die mehrere Stellen parallel pflegen (Stärke), werden als `EinheitStaerkeGesetzt {fue, ufue, he, basis: <hlc der Vorgängerversion>}` geführt: LWW mit Konflikthinweis, wenn `basis` nicht dem gefalteten Vorgänger entspricht. `nas §4` schlägt additive Ereignisse vor; das ist für An-/Abmeldungen einzelner Helfer richtig, für die von Hand gepflegte Excel-Stärke aber unpraktikabel [Abweichung von nas, bewusst].
- **Feldweise Änderungen** (`EinheitFelderGeaendert {einheitId, felder: {status?, bemerkung?, …}}`) statt „ganze Einheit ersetzt", damit zwei Clients, die verschiedene Spalten derselben Zeile pflegen (FüSt: Auftrag; Logistik: Verpflegung), sich nicht gegenseitig überschreiben. Das ist der häufigste reale Konflikt und der Hauptgrund gegen ein Dokumentmodell.
- **Jede Nutzlast hat ein `zod`-Schema** und einen Upcaster `v1→v2`. Unbekannte Ereignistypen werden **durchgereicht und im ETB als „unbekanntes Ereignis (App zu alt)" angezeigt**, nie verworfen (`nas §10 Restrisiko 3`).

### 3.5 Fold- und Konfliktregeln in Grundzügen

Der Fold ist eine reine Funktion `falte(ereignisse: Ereignis[], ab?: Schnappschuss): Zustand & { hinweise: Konflikthinweis[] }` in `packages/kern`. Sortierung: `hlc` aufsteigend, Tie-Break `clientId`, dann laufende Nummer. Regeln:

1. **Feldweise Last-Writer-Wins nach HLC** als Grundregel (kommutativ, idempotent, ordnungsunabhängig, weil immer über die sortierte Gesamtmenge gefaltet wird).
2. **Tombstone gewinnt.** `EinheitEntfernt` schlägt spätere `EinheitFelderGeaendert` desselben Objekts; die verworfene Änderung erzeugt einen Konflikthinweis, damit die FüSt sieht, dass jemand an einer gelöschten Einheit gearbeitet hat.
3. **Verschieben in einen aufgelösten Abschnitt** → Einheit landet im definierten Auffangabschnitt (`Bereitstellung 1`, ersatzweise FüSt) plus Hinweis (`nas §4`).
4. **Zyklus in der Abschnittshierarchie** durch gleichzeitiges Umhängen → das Ereignis mit dem kleineren HLC gewinnt, das andere wird No-Op mit Hinweis (`nas §4`); dieselbe Invariante wie heute `validations.ts:12-35`, nur ordnungsunabhängig formuliert.
5. **Fahrzeuge folgen ihrer Einheit** beim Verschieben (behebt `main §9 R-DOM-1`); das ist eine Fold-Regel, kein UI-Verhalten.
6. **Konkurrierende Stärkeänderung**: LWW nach HLC, aber wenn `basis` ≠ gefalteter Vorgänger, dann zusätzlich ein Hinweis „Stärke wurde parallel geändert (FUEST-1: 1/2/9, MELDEKOPF-1: 1/2/11) – bitte prüfen". Kein Dialog, keine Blockade; die FüSt entscheidet.
7. **Nach `EinsatzArchiviert`** werden alle späteren fachlichen Ereignisse verworfen und als Hinweis geführt (entspricht `einsatz-transaction-guards.ts:31-38`, aber ohne Dateischreibschutz).
8. **Undo = Kompensation.** `EreignisZurueckgenommen {ruecknahmeVon}` darf nur eigene Ereignisse der letzten n Minuten betreffen; fremde Ereignisse werden nicht zurückgenommen, sondern fachlich korrigiert (neues Ereignis, ETB-sichtbar). Damit ist Undo im Mehrbenutzerbetrieb definiert – anders als heute (`main §9 R-SYNC-4`: „Undo ist einsatzweit, nicht benutzer-/clientbezogen").
9. **Idempotenz** ist Pflicht: dieselbe Ereignisdatei zweimal gelesen ändert nichts (`id` als Dedup-Schlüssel).

**Materialisierte Sicht (Option E).** Der Worker hält den Zustand in Maps: `einsatz`, `abschnitte: Map<id,…>`, `einheiten: Map<id,…>`, `fahrzeuge`, `helfer`, `anforderungen`, `dienstposten`, `schichtplan`, `meldungen`, `etb: Zeile[]`, plus abgeleitete Indizes `einheitenJeAbschnitt`, `staerkeJeAbschnitt`, `staerkeJeOrganisation`, `staerkeJeStatus`, `staerkeJeSchicht`, `logistikJeAbschnittUndSchicht`, `kostenJeEinheit`. Bei der Excel-Kapazität von 272 Zeilen (`kritik §3.1`) und selbst bei der Main-Baseline „Großlage 150 Einheiten" ist das eine Größenordnung, in der In-Memory-Maps ohne Datenbank ausreichen; `nas §6` sagt dasselbe („In-Memory-Struktur des Folds + Indizes reicht für <5.000 Einheiten problemlos; SQLite lohnt sich erst für Ad-hoc-Auswertungen"). Eine spätere Ausbaustufe mit `node:sqlite` (in aktuellen Node-Versionen als Kernmodul enthalten, damit **ohne** natives npm-Modul) bleibt offen [Annahme: Verfügbarkeit im Node der eingesetzten Electron-Version ist zu prüfen]. Die Projektion hat nach außen **keine** Schreib-API – der einzige Schreibweg ist ein Ereignis (`nas §6 Restrisiko`).

### 3.6 Sichtbarkeit und Latenz

- **Poll-Schleife im Worker, alle 2 s** (`nas §11`): `readdir(ereignisse/)` für neue Dateien, dann je bekannter Datei `open` + `read` ab gemerktem Offset. Bewusst **kein** `stat`/mtime als Wahrheitsquelle – Daten-Reads am bekannten Offset umgehen den Windows-Attributcache (`nas §4`).
- **UDP-Hinweis als Beschleuniger** (`packages/netz`, Port wie heute 41235, `einsatz-sync.ts:7-8`): Nutzlast künftig `{einsatzId, clientId, datei, offset}` statt `dbPath` (`nas §8.1`). Zusätzlich Unicast an die aus `praesenz/` gelesenen Peer-IPs, weil Broadcast bei WLAN-Client-Isolation, Multi-Adapter oder Firewall ausfällt (`nas §8.1`, `main §9 R-SYNC-1`). Fällt UDP komplett aus, bleibt das Polling – der Betrieb wird langsamer, nicht falsch.
- **Erwartete Sichtbarkeitslatenz:** mit UDP < 1 s; ohne UDP 2–4 s für Änderungen an bekannten Dateien; bis zu **10 s** für die *erste* Datei eines neu hinzugekommenen Clients (Windows-Directory-Cache, `nas §1`, `§10 Restrisiko 2`). Das wird im UI ehrlich angezeigt: eine Statuszeile „Stand vor 3 s · 3 Stellen verbunden · NAS erreichbar" statt der heutigen impliziten Annahme, alles sei aktuell.
- **Messpflicht:** Die realen SMB-Roundtrips sind nirgends gemessen (`kritik §3.7`, `nachlese-betriebsparameter §1`: kein Share gemountet). M0 (§8) misst sie und legt das Poll-Intervall danach fest; 2 s ist die Startannahme, kein Messwert.

### 3.7 Offline-Betrieb bei NAS-Ausfall

Der Normalpfad ist bereits offline: Jedes Ereignis wird **zuerst lokal** angehängt (`%APPDATA%…\ereignisse\<eigene>.jsonl`, `fsync`), erst danach auf den Share gespiegelt (Append ab `eigenerUploadOffset`). Daraus folgt:

- **Share weg** → die App arbeitet unverändert weiter. Statuszeile: „NAS nicht erreichbar seit 14:22 – lokal weitergeführt, 37 Ereignisse warten".
- **Share zurück** → der Worker hängt ab `eigenerUploadOffset` an; fremde Ereignisse werden nachgelesen und in dieselbe sortierte Menge gefaltet. **Kein Merge-Dialog, kein Konfliktassistent**, weil die Fold-Regeln zeitunabhängig sind (`nas §4`).
- **Client stirbt** (Absturz, Akku leer) → lokal steht alles bis zum letzten `fsync`; beim Neustart verifiziert der Worker die eigene Datei (CRC je Zeile, Hash-Kette), schneidet eine unvollständige letzte Zeile ab und schreibt weiter.
- **Gleichzeitiger Ausfall aller Clients** → jeder hat eine vollständige Kopie seiner eigenen Ereignisse und der zuletzt gelesenen fremden. Datenverlust ist auf die Ereignisse eines einzelnen Clients beschränkt, die er weder auf den Share noch in seine lokale Datei geschrieben hat – also faktisch keine.
- **Ein Meldekopf ohne NAS-Zugang** (Anmeldestelle am Ortseingang) kann seine Ereignisdatei per USB-Stick übergeben; sie wird in `ereignisse/` kopiert und ist ab dann normal Teil des Folds. Das ersetzt die heutige Google-Tabellen-Brücke (`handbuch §7 F-E5`, `N-1`) durch ein Verfahren ohne Cloud.

### 3.8 Uhren ohne NTP

- **Technische Ordnung ausschließlich über HLC** (`nas §8.2`): `hlc = max(eigenePhysische, gesehenePhysische) : logisch : clientId`. Ein Client mit falscher Uhr zieht die anderen nicht mit, weil bei Überschreiten einer Delta-Grenze (Vorschlag: 5 min) nur der logische Teil hochgezählt und eine UI-Warnung gezeigt wird („Die Uhr dieses Rechners weicht um 47 min von den anderen Stellen ab").
- **Keine TTL-basierten Sperren und Heartbeats mehr.** Die heutigen Timing-Annahmen 10 s Lock-Stale, 45 s Record-Lock, 2 min Präsenz-Stale, 5 s Lock-Timeout (`file-lock.ts:4-6`, `record-lock.ts:8`, `clients.ts:9-10`) entfallen ersatzlos, weil es weder Locks noch geteilte Zustandsdateien gibt.
- **Fachliche Zeit ist Nutzereingabe.** `fachzeit` im Ereignis wird aus der lokalen Uhr vorbelegt und ist jederzeit korrigierbar – wie im Papier-ETB (`nas §8.2`). Die Excel macht es genauso (Strg+D setzt „jetzt", der Wert bleibt danach editierbar, `handbuch §7 F-C6`).
- **Bearbeitungssperren** (heute `record-lock.ts`, TTL 45 s): ersetzt durch **weiche Anwesenheitsanzeige** – „MELDEKOPF-1 bearbeitet diese Einheit gerade" aus `praesenz/`, ohne Blockade. Bei feldweisen Ereignissen und deterministischem Fold ist eine harte Sperre nicht mehr nötig, und sie wäre über SMB ohnehin nicht korrekt implementierbar (`main §9 R-LOCK-1…6`).

### 3.9 Migration bestehender `.s1control`-Dateien

Ein Ereignistyp, ein Werkzeug, kein Parallelbetrieb:

1. `npm run akte -- migriere <alt.s1control> --nach <share>\einsaetze\<ordner>` liest die v1-JSON (`schemaVersion: 1`, `einsatz-store.ts:48`), bildet sie auf das v2-Modell ab (Feldabbildung nach `kritik §3.1` und `nachlese-excel-s1-feldabgleich`) und schreibt **ein** Ereignis `EinsatzAusV1Uebernommen` mit dem vollständigen Zustand als Nutzlast, plus je Bewegung im `commandLog` ein `EinheitVerschoben` mit der ursprünglichen Zeit als `fachzeit` (damit das ETB nicht bei null anfängt).
2. Der Fold behandelt `EinsatzAusV1Uebernommen` wie einen Startschnappschuss: es ist immer das HLC-kleinste Ereignis der Akte.
3. **Kein Parallelbetrieb alt/neu auf demselben Share.** Die v2-Akte ist ein Ordner, die v1-Akte eine Datei; sie kollidieren nicht, aber gleichzeitig in beiden zu arbeiten würde Daten spalten. Verfahren: Migration vor dem Einsatz, alte Datei nach `archiv\v1\` verschieben. Die v2-App erkennt eine `.s1control`-Einzeldatei beim Öffnen, bietet die Migration an und **schreibt sie nie** (behebt nebenbei `main §9 R-DATA-4`, wo das Öffnen einer Nicht-JSON-Datei sie mit einem leeren Skelett überschreibt).
4. Alt-`.sqlite`-Dateien: `packages/cli` bekommt einen Lesepfad **nur wenn** solche Dateien real existieren (§10, Punkt 8). Der heutige Code kann sie nicht lesen und würde sie zerstören.

### 3.10 Migration der Excel-Mappe

`packages/import` liest die „Einsatzkräfteübersicht V 1.5.2-beta" mit `exceljs` (reines JS, kein natives Modul; `.xlsm` ist ZIP+XML wie `.xlsx`, die Makros werden ignoriert) [Annahme: `exceljs` liest `.xlsm`-Blattdaten zuverlässig – in M0/M1 zu verifizieren; Rückfallebene: `fflate` + eigener SheetXML-Parser]. Abgebildet werden:

- **Blatt Stärke, Zeilen 4–431**: Bereichszuordnung aus der Zeilenposition (benannte Bereiche `Führungsstelle`, `Meldekopf_FüSt_BR_1/2`, `Sonstiges_Führung`, `Logistik`, `Angefordert`, `Bereitstellung_1/2`, `Einsatzort_1..21`, `domaenen §8.1`), Spalten B..AW nach der Tabelle in `domaenen §9`.
- **Blatt Stammdaten C4/C5/C6** → `EinsatzAngelegt`; **Stärke!AQ3/AS3/AT3/AV3** → `KostenparameterGesetzt`.
- **Blatt FüSt B8:B139 / I4:AS139** → `DienstpostenBesetzt` und `SchichtplanEintragGesetzt`.
- **Kopiervorlagen (Stärke Z. 23–122)** → nicht als Einsatzdaten, sondern nach `stammdaten\` als Katalog.
- Enum-Abbildung Organisation 12 ↔ 14 ↔ EEB-Liste und Status 9 ↔ v1-3 nach der in `kritik §3.1` begonnenen und in `nachlese-excel-s1-feldabgleich` verifizierten Tabelle; nicht abbildbare Werte landen als Freitext in `bemerkung` plus Importprotokoll.
- Ergebnis ist **ein** Ereignis `EinsatzAusExcelUebernommen` plus ein Importbericht (welche Zeile wurde wie gedeutet, was ging nicht). Damit ist der Import Teil des ETB und nachvollziehbar.

Ob überhaupt gefüllte Mappen existieren, ist offen (`kritik §3.7`, §10 Punkt 8). Wenn nicht, reduziert sich `packages/import` auf den Kopiervorlagen-Katalog – der wird in jedem Fall gebraucht (`handbuch §7 F-J1`).

### 3.11 Backup, Archiv, Export der Einsatzakte

- **Backup ist strukturell gelöst.** Append-only-Dateien und unveränderliche Schnappschüsse lassen sich jederzeit kopieren, ohne „offene Datenbank"-Problematik (`nas §8.4`). Zusätzlich hält jeder Client eine vollständige lokale Kopie → bei 3 Stellen liegen 4 Kopien vor, automatisch. Die heutige 5-Minuten-Vollkopie ohne Rotation (`main §9 R-OPS-1`: 288 Dateien/Tag/Einsatz, ~0,6 GB/Tag) entfällt ersatzlos.
- **Archivierung:** Rolle „FüSt" setzt `archiviert.marker` (create-new). Danach verwirft der Fold neue fachliche Ereignisse (Regel 7). Die App erzeugt das ZIP nach `archiv\`, prüft die Hashes und verschiebt den Ordner erst dann.
- **Einsatzakte als ZIP** (`nas §8.4`, erweitert um die Excel-Ausgabeprodukte): `ereignisse/` (Rohprotokoll, revisionsfähig), `schnappschuss.json` (Endzustand), `etb.pdf` + `etb.csv`, `einheiten.csv`, `staerkemeldungen.pdf`, `logistik.csv`, `kosten.csv`, `hashes.json`, `manifest.json` (Zeitraum, beteiligte Stellen, App-Versionen). Behebt `main §9 R-DATA-4`/`R-DOM-4` (Export mit UUIDs statt Namen).
- **Revisionsfähigkeit:** Hash-Kette je Ereignisdatei; optional Signatur der Akte beim Archivieren mit demselben Ed25519-Verfahren, das erfassungsbogen.app schon nutzt (`signatur.ts`, 340 Z.) – dann ist die Signaturlogik bereits vorhanden und getestet (484 Testzeilen).

---

## 4. Fachliches Zielmodell in Grundzügen

Grundlage ist `domaenen §8.1/§8.2/§8.3` (ER-Modell 1:1 zur Excel) und `handbuch §7` (F-A1…F-L6, N-1…N-9). Der zentrale Befund aus `kritik §3.1` gilt: **v1 deckt etwa die Hälfte der Excel-Felder ab; das v2-Modell kann nicht „v1 + Persistenz" sein.**

### 4.1 Entitäten

| Entität | Herkunft | Kernattribute | Excel-Bezug |
|---|---|---|---|
| `Einsatz` | Stammdaten C4–C6, Stärke AQ3/AS3/AT3/AV3 | `name`, `fuestName`, `uebergeordneteFuestName`, `art` (Einsatz/Übung), `kostenparameter {psaSatz, vdaProTag, ukProTag, geplanteEinsatztage}`, `eebOrdner`, `angelegt` | `F-A1`, `F-A4` |
| `Abschnitt` | v1-Abschnittsbaum + Excel-Bereiche | `id`, `elternId`, `name`, `typ`, `reihenfolge`, `sichtbar`, `zaehltInGesamtstaerke`, `zaehltInKosten`, `zaehltInDruck`, `fuehrungsstelleEinheitId` | Bereiche Stärke!B6..B431 (`F-B1..F-B5`) |
| `Einheit` | Excel B..AW + v1 `JsonEinheit` | siehe §4.3 | Zeile im Blatt Stärke (`F-C1`) |
| `Fahrzeug` | v1 (besser als Excel-Spalte J) | `name`, `typ`, `kennzeichen`, `funkrufname`, `stanKonform`, `sondergeraet`, `nutzlast`, `einheitId` | Spalte J Freitext |
| `Helfer` | v1 + EEB-Personal | `name`, `rolle` (Fü/UFü/He), `geschlecht` (m/w/d), `ernaehrung` (–/veget./vegan), `funktionen[]`, `fahrerlaubnisse[]`, `kontakte[]`, `einheitId` | Spalte I „Person", AC–AF |
| `Anforderung` | Excel M–V (in v1 komplett fehlend) | `id` (= Anforderungs-ID der übergeordneten Stelle), `abzuloesendeEinheitId`, `angefordertAm`, `zugesagtFuer`, `zugesagtVon`, `vorgeseheneEinheit`, `vorgesehenerAuftrag`, `eingetroffenAm`, `einsatzendeAm`, `rueckgefuehrtAm` | `F-F1..F-F4` |
| `Dienstposten` | Blatt FüSt B10..B139 | `teileinheit` (Stab/ZTr FK/FGr F/FGr K/Externe), `funktion`, `schicht` (Tag/Nacht), `besetzung {fue, ufue, he}` | `F-I1` |
| `SchichtplanEintrag` | FüSt J10:AS139 | `dienstpostenId`, `datum`, `personText` | `F-I2` |
| `Meldung` | Meldekopf-Google-Tabelle | `quelle` (scan/manuell/pdf-import), `bogen`/`rohdaten`, `status` (neu/übernommen/zurückgestellt/abgelehnt), `einheitId` nach Übernahme | `F-E1..F-E4` |
| `EtbEintrag` | abgeleitet aus dem Ereignisprotokoll | `zeit` (fachzeit), `akteur`, `text`, `bezug` | `F-E3`, `N-6`, `F-L2` |
| `Einheitstyp` (Kopiervorlage) | Stärke Z. 23–122 + STAN | `katalog` (THW-StAN / KatS-Nds / FW), `bezeichnung`, `ebene`, `standardfahrzeuge[]`, `standardstaerke?` | `F-J1`, `F-J2` |

### 4.2 Excel-Bereiche → Abschnittsbaum

Die Excel kennt feste Zeilenbereiche mit fester Kapazität (FüSt 10, Meldekopf 2×3, Logistik 12, Angefordert 22, BR1 22, BR2 11, Einsatzort 1–21 je 9 → 272 Zeilen, `kritik §3.1`). Das v2-Modell übernimmt die **Semantik**, nicht die Grenzen:

```
Einsatz
├── Führungsstelle              typ=FUEST                 zählt in Stärke, Druck, Kosten
│   ├── Meldekopf 1             typ=MELDEKOPF             (neu gegenüber v1)
│   └── Meldekopf 2             typ=MELDEKOPF
├── Sonstiges Führung           typ=FUEHRUNG_SONSTIGES
├── Logistik                    typ=LOGISTIK
├── Angefordert / Anmarsch      typ=ANGEFORDERT           NICHT in Gesamtstärke/Druck/Kosten, separat (F-F2)
├── Bereitstellungsraum 1..n    typ=BEREITSTELLUNG
├── Einsatzstelle 1..n          typ=EINSATZSTELLE         frei benennbar, beliebig viele (F-B3)
│   └── Unterabschnitt          typ=EINSATZSTELLE         Hierarchie – Mehrwert gegenüber Excel
└── Einsatz beendet             typ=ARCHIV                (F-F5)
```

Die vier Zählregeln (`zaehltInGesamtstaerke`, `zaehltInKosten`, `zaehltInDruck`, `schichtPflicht`) sind Attribute des Typs, nicht der Zeilenposition (`domaenen §8.1`); dadurch bleiben die Excel-Kennzahlen aus `domaenen §10` reproduzierbar, ohne die Zeilenlogik nachzubauen. „Erste Zeile eines Bereichs = dessen Führungsstelle" (`F-B2`) wird zu einem expliziten Feld statt zu einer Positionskonvention.

### 4.3 Einheit: Feldgruppen

1. **Identität/Bezeichnung**: `bezeichnung`, `organisation`, `herkunft`/`ovName`, `zug`, `truppStaffel`, `gruppe`, `ebene` (abgeleitet), `nameImEinsatz`.
2. **Zuordnung**: `abschnittId`, `position`, `bewegungen[]` (aus dem Ereignisprotokoll abgeleitet, **mit Auftragstext** – behebt „kein Auftragstext" aus `kritik §3.1`).
3. **Status/Schicht**: `status` aus **neun** Werten (Rufbereitschaft, Einsatzvorbehalt, Angefordert, Anmarsch, Rückmarsch, Einsatzbereit, Einsatz, Ruhe, Nicht einsatzbereit; `handbuch F-G1`, `domaenen §8.3`) mit stabilem Schlüssel + Anzeigename (die Excel-Inkonsistenz „Ruf Bereitsch."/„Rufbereitschaft" wird dabei aufgelöst); `schicht` aus Tag/Nacht/Früh/Spät (`F-G2`). Die v1-Trias AKTIV/IN_BEREITSTELLUNG/ABGEMELDET wird beim Import auf die neun Werte abgebildet (`kritik §3.1`).
4. **Ressourcenplanung**: Verweis auf `Anforderung` statt neun Freitextspalten M–V.
5. **Logistik**: `anzahlWeiblich`, `anzahlDivers`, `vegetarisch`, `vegan`, `uebernachtungM/W/D`; `maennlich` abgeleitet als `gesamt − w − d` (`F-H1`, `Log!I7`).
6. **Stärke**: `fue`, `ufue`, `he`, abgeleitet `gesamt`; Quelle wahlweise manuell (wie Excel) oder aus `Helfer[]` gezählt (wie EEB). Beide werden angezeigt, Abweichung als Hinweis – behebt `main §9 R-DOM-5`.
7. **Kosten**: `psaProTag`; abgeleitet `psaGesamt`, `kostenPsaProTag`, `kostenVdaUkProTag`, `gesamtkosten` nach den Formeln in `domaenen §10` (`F-L6`).
8. **EEB**: `eebDateiRef` (Anhang-Hash/Dateiname) und `eebBogen` (dekodierter digitaler Bogen), `eebStand`.
9. **Erreichbarkeit/Bemerkung**: `erreichbarkeiten[]` (Funk/Tel/E-Mail), `bemerkung`, `auftrag`.

### 4.4 Kennzahlen

Alle 21 Kennzahlen aus `domaenen §10` werden als reine Funktionen in `packages/kern/src/kennzahlen.ts` implementiert und einzeln getestet: Bereichssummen, Gesamtstärke (in der Excel eine Formel mit 32 Summanden), Druck-Plausibilität, SUMIF/SUMIFS nach Organisation/Status/Schicht, Kostenformeln, CF-Warnung „Verfügbar bis überschritten". Keine UI-Logik, keine SQL-Abfragen – testbar ohne Electron und ohne Datei.

### 4.5 Integration erfassungsbogen.app: was geteilt, was importiert wird

Der Codec liegt als plattformneutrales TypeScript vor (`src/codec.ts` 1.043 Z., `src/model.ts` 392 Z., `src/signatur.ts` 340 Z.; Tests `codec*.test.ts` 887 Z., `model.test.ts` 243 Z., `signatur.test.ts` 484 Z.; Spezifikation `docs/datenmodell.md`, 26,7 KB). `kritik §3.2`: „der Referenz-Codec ist TypeScript und läuft in jeder WebView – ein Rust-Port ist für Tauri nicht nötig". In Vorschlag A ist er nicht nur nicht nötig, sondern **direkt einbindbar**.

**Geteilt (npm-Paket, §5.4):**
- aus `model.ts`: `Erfassungsbogen`, `Einheit`, `Person`, `Fahrzeug`, `Staerke`, `Sofortbedarf`, `HierarchieEbene`, Enums `OrganisationsTyp`, `StaerkeRolle`, `Geschlecht`, `Ernaehrung`, `Fahrerlaubnis`, `KontaktArt`, `PersonalErfassung`, die Zeitprimitiven (`EebDatum`, `EebZeitpunkt`, `EEB_EPOCHE_MS`) und die Ableitungen `staerke()`, `unterbringungMWD()`, `verpflegung()`, `ansprechpartner()`.
- aus `codec.ts`: `decodePayloadUrl`, `datenDekodieren`, `payloadAusText`, `entpackePayload`, `dekodiereAbsenderkarte`, Ketten-/Segmentlogik (`EEB_MAGIC`, `EEB_KETTE_MAGIC`, `MAX_STUFEN`), Base41/Base64url.
- `signatur.ts`: Ed25519-Prüfung der Signaturstufen (verwendbar auch für die Signatur der Einsatzakte, §3.11).
- aus `src/app/einsaetze.ts` die **reinen** Teile: `MeldeEintrag`, `MeldeStatus`, `Einsatzsammlung`, `EinsatzArt`, `MeldeQuelle`, `einheitSchluessel`, `stammSchluessel`, `bogenInhaltsId`, `neuesteJeEinheit`, `revisionen`, `einsaetzeAusJson`/`einsaetzeZuJson`, `meldungHinzufuegen`. Die `localStorage`-gebundenen Funktionen (`einsaetzeLaden`, `einsaetzeSpeichern`, `einsatzLoeschen`, `einsaetzePapierkorb`) bleiben in der App und werden **nicht** geteilt – das ist die Trennlinie beim Herauslösen.

**Importiert (in S1 neu gebaut, nicht geteilt):**
- Abbildung `Erfassungsbogen → Einheit + Helfer[] + Fahrzeug[] + Logistikbedarf` als `packages/eeb/src/nach-einheit.ts`. Fachliche Vorlage ist `src/app/oldenburg-xlsx.ts` (425 Z., `bogenOldenburgXlsx`, `einsatzOldenburgXlsx`), laut `kritik §3.2` „das fachlich bessere Mapping" – besser als das VBA-Mapping, das nie lauffähig war (`vba §8.4`).
- **Sammel-Scan**: reale Bögen sind mehrheitlich segmentiert (nur 73 von 443 Beispielbögen passen in einen QR, Mittel 2,91 Teile; `kritik §3.2`), deshalb ist eine Stapelerfassung Pflicht – Segmente sammeln, Fortschritt „Teil 2 von 3", FNV-1a-32-Prüfsumme, dann ein Ereignis `EebBogenImportiert`.
- Erfassungswege: **USB-Handscanner** (Tastaturemulation, das in der Excel gelebte Verfahren, funktioniert ohne Kamera), **Kamera** (`getUserMedia` im Renderer – in Chromium unproblematisch), **Bilddatei/Ordner** (erfassungsbogen.app hat dafür `qr-stapel.ts` und „ganze Ordner voller QR-Bilder", Commit `b417921`), **JSON-Übergabe** einer ganzen `Einsatzsammlung` per Datei/USB.

**Meldekopf-Prozess** (`handbuch F-E1..F-E5`) ohne Cloud: Der Meldekopf arbeitet entweder (a) als S1-Client auf demselben Share – dann sind seine Ereignisse unmittelbar Teil der Akte – oder (b) mit erfassungsbogen.app und übergibt eine `Einsatzsammlung` als Datei; S1 liest sie als `MeldungEingegangen` in einen **Eingangskorb**. Die FüSt quittiert dort (`MeldungUebernommen` → erzeugt/aktualisiert die Einheit), Einträge werden nie gelöscht (`F-E2`), Revisionen bleiben sichtbar (`revisionen()`). Damit ist die gelbe/grüne Quittierung der Google-Tabelle abgelöst, inklusive „Änderung macht wieder gelb" – das ist genau `neuesteJeEinheit()` + `MeldeStatus`.

### 4.6 Was bewusst NICHT ins Modell kommt

- **Benutzerkonten mit Anmeldung**: `main §9 R-OPS-3` (Default admin/admin, Rollen ohne Enforcement). Vorschlag: je Ereignis ein **Akteur** (Name + Rechner) für das ETB, aber keine Anmeldung; eine einzige Rolle „FüSt" an genau zwei Aktionen gebunden (Archivieren, Stammdaten ändern), gesetzt per Client-Einstellung. Entscheidung bei Johannes (§10, Punkt 6).
- **Harte Datensatzsperren** (`record-lock.ts`, TTL 45 s) – ersetzt durch weiche Anwesenheitsanzeige (§3.8).
- **Doppelt kodierte JSON-Strings** (`tacticalSignConfigJson`, `payloadJson`) im Dateiformat (`main §10 Weglassen`).

---

## 5. Modul-/Repo-Struktur auf dem neuen Branch

### 5.1 Verzeichnisbaum

```
S1-Control/  (Branch: v2-evolution)
├── package.json                       # npm-Workspaces: ["packages/*", "apps/*"]
├── tsconfig.base.json                 # strict, noUncheckedIndexedAccess, project references
├── vitest.workspace.ts                # ein Testlauf über alle Pakete
├── eslint.config.mjs                  # + no-restricted-imports: 'electron' in packages/**
├── packages/
│   ├── kern/                          # KEIN electron, KEIN node:fs   <- Herzstück
│   │   ├── src/
│   │   │   ├── modell/                # einsatz.ts abschnitt.ts einheit.ts fahrzeug.ts helfer.ts
│   │   │   │                          # anforderung.ts dienstposten.ts meldung.ts ids.ts enums.ts
│   │   │   ├── ereignisse/            # katalog.ts (Union + zod), schemata.ts, upcaster.ts
│   │   │   ├── fold/                  # falte.ts, regeln/*.ts (je Ereignisgruppe), hinweise.ts
│   │   │   ├── hlc.ts                 # Hybrid Logical Clock, Delta-Grenze, Serialisierung
│   │   │   ├── zustand.ts             # materialisierte Sicht + Indizes
│   │   │   ├── kennzahlen.ts          # 21 Kennzahlen aus domaenen §10
│   │   │   ├── validierung.ts         # Zyklusprüfung, Stärke-Summen, Split-Regeln
│   │   │   ├── format/                # zeile.ts (len/crc32/json), schnappschuss.ts, akte.ts
│   │   │   └── migration/             # v1-snapshot.ts (aus .s1control), excel.ts (Feldabbildung)
│   │   └── test/                      # Unit + Property (fast-check)
│   ├── speicher/                      # node:fs/promises, node:crypto – KEIN electron
│   │   └── src/                       # anhaengen.ts (append+fsync), lesen.ts (Tail ab Offset),
│   │                                  # spiegel.ts (lokal<->Share), poll.ts, schnappschuss.ts,
│   │                                  # verify.ts (CRC/Hashkette/Truncate), pfade.ts
│   ├── netz/                          # node:dgram – UDP-Hinweise, Peer-Liste aus praesenz/
│   ├── stan/                          # STAN-Daten + Zeichen-/Einheiten-Inferenz (aus v1)
│   ├── eeb/                           # Adapter Erfassungsbogen -> S1-Modell; Segmentstapel
│   ├── ausgaben/                      # Druck/Status/Log/FüOrg/Auswertung/Monitor: Daten->HTML/CSV/XLSX
│   ├── kontrakt/                      # IPC-Kanäle + zod-Schemata (Main/Preload/Renderer gemeinsam)
│   └── cli/                           # bin "akte": pruefe|falte|exportiere|migriere|simuliere
├── apps/
│   └── desktop/
│       ├── index.html  monitor.html
│       ├── src/
│       │   ├── main/                  # main.ts, fenster.ts, menue.ts, ipc/*.ts, update-share.ts
│       │   ├── worker/                # akte-worker.ts (kern+speicher+netz), protokoll.ts
│       │   ├── preload/               # preload.ts (Whitelist je Fenster)
│       │   └── fenster/
│       │       ├── haupt/             # App, Routen, store/, komponenten/, dialoge/
│       │       └── monitor/           # Stärke-/Druck-/Status-/Logistikseiten
│       └── e2e/                       # playwright-bdd: features/*.feature, steps/*.ts
├── docs/
│   ├── ARCHITEKTUR.md
│   ├── KONZEPT-EREIGNISSE.md          # Katalog + Fold-Regeln, §-nummeriert
│   ├── KONZEPT-SPEICHER.md            # Dateilayout, Poll, Offline, Migration
│   ├── KONZEPT-AUSGABEN.md
│   ├── KONZEPT-EEB-MELDEKOPF.md
│   ├── UI-ABNAHME.md
│   ├── BETRIEB.md                     # NAS einrichten, Update-Ablage, Notverfahren
│   └── adr/0001-ereignisprotokoll.md, 0002-electron-bleibt.md, 0003-kein-sqlite.md, …
└── .github/workflows/build-main.yml   # Gerüst bleibt; rebuild:native entfällt
```

Die Doku-Struktur folgt `bmecat M29/M30/M31` (Konzeptdokument je Vorhaben mit §-Nummern, verworfene Alternativen, Risiken, DoD, Messwerte an jeder Performance-Aussage) – laut `bmecat §7.2` das stärkste Arbeitsmuster des Schwesterprojekts und laut `bmecat §7.4` genau das, was S1 heute fehlt.

### 5.2 Grenzen, die maschinell erzwungen werden

- `packages/kern` darf weder `electron` noch `node:*` importieren (ESLint `no-restricted-imports`, plus ein Vitest-Lauf mit `environment: 'jsdom'`, der bei einem `node:fs`-Import scheitert).
- `packages/speicher` darf `node:*`, aber nicht `electron` importieren.
- `apps/desktop/src/main` darf keine `*Sync`-Datei-API aufrufen (`no-restricted-syntax`).
- `apps/desktop/src/fenster/**` darf nichts aus `packages/speicher` importieren (Renderer ohne I/O – die Regel aus `AGENTS.md §1-2`, die heute nur auf dem Papier steht, `main §10`).

### 5.3 Was aus v1 wörtlich übernommen wird

Nach `main §10 „Übernehmen"`, konkretisiert:

| Übernahme | Herkunft in v1 | Ziel |
|---|---|---|
| THW-STAN-Daten (47 Einträge) + Extraktions-/Validierungsskripte | `thw-stan-2025.generated.json`, `scripts/extract-thw-stan-from-zip.cjs`, `scripts/validate-thw-stan-json.cjs` | `packages/stan/daten/`, `packages/stan/scripts/` – unverändert |
| Zeichen-Inferenz komplett: Kurzzeichen-Tabelle, Komposita, Scoring/Schwellen, `meta{source, confidence, ruleVersion}`, „Manuell schlägt Auto" | `src/main/services/tactical-sign-aliases.ts`, `tactical-sign/`, `tactical-sign-inference.ts`, `stan/` | `packages/stan/src/` – Logik wörtlich, nur Importe angepasst; die duplizierten `normalizeText`/`tokenize` werden zusammengeführt (`main §10 Weglassen`) |
| Fachregeln: Abschnitt-Zyklusprüfung, taktische Stärke F/UF/M/G mit Summenprüfung, Split-Regeln, Archiv-Schreibschutz | `validations.ts:12-35`, `tactical-strength.ts`, `einheit.ts:151-233`, `einsatz-transaction-guards.ts:31-38` | `packages/kern/src/validierung.ts` bzw. Fold-Regeln |
| Organisation-Whitelist und Domänenvokabular | `src/main/json-store/types.ts:7-128`, `src/shared/types.ts` | `packages/kern/src/modell/enums.ts` – erweitert um HK/NLWKN und ZIV, bereinigt um die Dublette MALTESER/MHD (`kritik §3.1`) |
| Versionsvergleich für Datums-Buildnummern | `updater-versioning.ts` (+ Fix `ffa14f8`) | `apps/desktop/src/main/update-share.ts` |
| Wire-Kompatibilitätstests | `test/einsatz-sync.test.ts` (inkl. `/Volumes/…` vs. `Z:\…`), `test/update-peer-protocol.test.ts` | `packages/netz/test/` |
| BDD-Szenarien (10) | `e2e/features/*.feature`, `e2e/steps/*.ts` | `apps/desktop/e2e/` – Feature-Dateien wörtlich, Steps an die neue UI angepasst |
| Behavior-Testideen | `test/behavior.*.test.ts` (Einsatzfluss, Abschnitt bearbeiten, Basisdaten) | `packages/kern/test/` – ohne Datei/IPC, nur auf dem Zustand |
| Stärke-Monitor-Fensterlogik | `strength-display.ts:144-168, 189-192` | `apps/desktop/src/main/fenster.ts` – ohne Prewarm/Splash |
| Export-Idee ZIP mit Rohdatei + HTML + CSV | `export.ts` | `packages/ausgaben/` – mit Namen statt UUIDs (`main §9 R-DOM-4`) |
| Architekturregeln | `AGENTS.md §1-2, §4` | `docs/ARCHITEKTUR.md` – diesmal mit Lint-Durchsetzung (§5.2) |

Nicht übernommen: alles aus `main §10 „Weglassen"` (Utility-Prozess-Gerüst ~1.000 Z., `EinsatzReadCache`, better-sqlite3/drizzle, Legacy-`.sqlite`-Öffnen, LAN-Peer-Update 919 Z., Debug-Log-Forwarding, Prewarm-Akrobatik) sowie der gesamte `json-store` samt `file-lock.ts`, `clients.ts`, `record-lock.ts`.

### 5.4 Wie erfassungsbogen.app geteilt wird

| Weg | Vorteil | Nachteil | Urteil |
|---|---|---|---|
| **Copy** (Dateien kopieren) | sofort, keine Infrastruktur | Divergenz ab Tag 1; das EEB-Format entwickelt sich noch (`SCHEMA_VERSION = 8`, Weichen v2–v8) | nur als Notbehelf in M0 |
| **git-Submodul** | eine Quelle, versionsgenau | für einen Einzelentwickler fehleranfällig (detached HEAD, vergessene Updates); das Zielrepo enthält eine ganze PWA + Capacitor + Electron, nicht nur den Codec | nein |
| **npm-Paket `@erfassungsbogen/kern`** aus dem bestehenden Repo | saubere Grenze, Versionierung, Tests bleiben beim Eigentümer, S1 pinnt eine Version | einmaliger Workspace-Schnitt im Zielrepo nötig | **empfohlen** |

Vorgehen (~0,5 Personenwoche, gehört in M6):
1. Im Repo `einheitenerfassungsbogen` einen Workspace `pakete/kern` anlegen; `src/model.ts`, `src/codec.ts`, `src/signatur.ts`, `src/qr-node.ts` und die reinen Teile von `src/app/einsaetze.ts` dorthin verschieben; die App importiert danach aus dem Paket. Die vorhandenen ~1.900 Testzeilen (`codec*.test.ts` 887, `model.test.ts` 243, `signatur.test.ts` 484, `einsaetze.test.ts`) wandern mit und sichern den Schnitt ab.
2. Veröffentlichung als Git-Abhängigkeit mit Tag-Pinning: `"@erfassungsbogen/kern": "github:wattnpapa/erfassungsbogen#eeb-kern-v1.0.0"` – offline-tauglich über den npm-Cache, kein Registry-Konto nötig. [Annahme: kein npm-Registry-Konto gewünscht]
3. S1 hält in `packages/eeb` **nur** den Adapter (`nach-einheit.ts`, Segmentstapel, Handscanner-Eingabe). Damit bleibt die Bit-Ebene an genau einer Stelle gepflegt – der Punkt, an dem die Excel gescheitert ist (`vba §8.4`: Strg+Q war nie lauffähig).
4. Rückrichtung S1 → erfassungsbogen: nicht vorgesehen; der Datenfluss ist einseitig (Bogen → Lage).

Lizenz: erfassungsbogen.app steht unter EUPL-1.2 (`package.json`), S1-Control hat eine eigene `LICENSE` (34,3 KB). Vor dem Paketschnitt ist die Vereinbarkeit zu dokumentieren (§10, Punkt 9) – bei identischem Urheber praktisch unkritisch.

---

## 6. Ausgaben

Die Excel kennt acht Ausgabeprodukte (`handbuch §10`, `F-K1..F-K7`). Sie sind kein Anhängsel: Der Ausdruck ist das, was in der Lagekarte hängt, und der HTML-Monitor ist das, was Führung und Logistik lesen. In Electron ist das der Bereich mit dem größten Vorsprung gegenüber der Tauri-Alternative (`bmecat §9 R7`: „Tauri hat kein Print-API").

### 6.1 Technik

| Zweck | Werkzeug | Begründung |
|---|---|---|
| Ansichtsmodell je Ausgabe | `packages/ausgaben/src/<produkt>/modell.ts` – reine Funktion `Zustand → Ansichtsmodell` | testbar ohne Rendering, Goldfile-fähig |
| HTML-Erzeugung | `handlebars` (bereits Dependency) + eigenes Print-CSS | einfach, gut versionierbar, identisch für Bildschirm, Datei und Druck |
| PDF | `webContents.printToPDF()` auf einem verborgenen `BrowserWindow` | Chromium-eigen, keine zusätzliche Bibliothek, exakt das, was man am Bildschirm sieht |
| Direktdruck | `webContents.print({ silent, printBackground, pageSize:'A4', landscape })` | Druckerdialog oder stiller Druck auf den Standarddrucker |
| Excel-Export | `exceljs` (reines JS) | `F-K5`, `F-H3`, `N-9`: „flache Tabelle exportierbar"; kein natives Modul |
| CSV | eigener Serialisierer in `packages/ausgaben` | UTF-8 mit BOM, Semikolon – damit Excel es ohne Importassistent öffnet |
| Taktische Zeichen / Führungsharke | `taktische-zeichen` + `taktische-zeichen-core` (bereits Dependencies), SVG im DOM | `F-K4`; SVG geht ohne Umweg in `printToPDF` |
| ZIP der Einsatzakte | `jszip` (bereits Dependency) | `§3.11` |

Kein `window.print()`, keine externe PDF-Bibliothek, kein Headless-Browser. Der Druckweg ist eine einzige Funktion `drucke(produkt, optionen): Promise<Buffer|void>` im Main-Prozess, die ein verborgenes Fenster mit `file://…/ausgabe.html` lädt, auf `did-finish-load` wartet und dann `printToPDF` oder `print` aufruft.

### 6.2 Die Produkte im Einzelnen

| Produkt | Anforderung | Umsetzung |
|---|---|---|
| **Druck** (Stärkeübersicht) | `F-K1` | Fü/UFü/He=Gesamt je Einsatzstelle in fester Reihenfolge, Gesamtzeile, Plausibilitätszeile, Organisationsfilter („Davon Stärke: THW"), leere Einsatzstellen unterdrückt, ohne Angefordert/Anmarsch. A4 quer, Skalierung wie der Excel-Zoom 55 % über CSS `@page`/`transform`. PDF und Direktdruck. |
| **Status** (Matrix) | `F-K2` | Organisation × (Fü/UFü/He=Gesamt, männl., weibl., veget., Unterbringung m/w), Stärke je Status, Stärke je Schicht, Kontrollsummen. Reine Kennzahlfunktionen aus `packages/kern/src/kennzahlen.ts`. |
| **Log / LogFrei** | `F-K3`, `F-H2`, `F-H3` | Logistikübersicht je Einsatzraum und Schicht (Früh/Spät/Tag/Nacht, Summe, M/W/D, Veget/Vegan, Unterbringung M/W/D), Gesamtzeile, separat „Angefordert/Anmarsch". „LogFrei" wird zum XLSX-/CSV-Export mit Zeitstempel – die Excel brauchte dafür ein zweites Blatt, weil sie nichts exportieren konnte. |
| **FüOrg** (Führungsharke) | `F-K4` | SVG-Editor mit Abschnittsraster und Zeichenpalette (THW/FW-Einheiten mit Größenpunkten, Führungsstellen-Fahnen KatSL/LuK/TEL/ÖEL/ELO/EL/EAL/UEAL, Personen-Rauten, Funktionskreise). Der Baum wird aus dem Abschnittsmodell **vorbelegt** – in der Excel muss er von Hand gezeichnet werden. Speicherung der Anordnung als Ereignis (`FuehrungsharkeAngeordnet`), damit sie auf allen Clients gleich aussieht. |
| **Auswertung** | `F-K5` | Flache, filterbare Gesamttabelle aller Einheiten mit Abschnitt als Spalte, Summenzeile, Zeitstempel; im UI als Tabelle mit Filter, als Datei XLSX/CSV. |
| **HTML-Lagemonitor** | `F-K6` | Drei Wege, alle aus demselben Ansichtsmodell: (1) **zweites Fenster** auf dem Zweitbildschirm (§2.3); (2) **statische HTML-Datei** `ausgaben/monitor.html` auf dem Share, zyklisch (Vorgabe 60 s) von genau einem Client geschrieben, mit `<meta http-equiv="refresh" content="60">` – Tablets und Browser brauchen nichts als den Netzpfad, exakt wie heute in der Excel; (3) optional ein **schreibgeschützter HTTP-Dienst** (`node:http`, nur LAN, standardmäßig **aus**) auf dem FüSt-Rechner für Geräte ohne SMB-Zugriff. Weg (2) ist der Standard, weil er die Randbedingung „kein Serverprozess" nicht anfasst. |
| **ETB / Einsatztagebuch** | `F-E3`, `N-6`, neu gegenüber v1 | Direkt aus dem Ereignisprotokoll: Zeit (Fachzeit), Akteur, Rechner, Vorgang im Klartext, Bezug. Als Bildschirmliste mit Filter, als PDF, als CSV. Das ist der Nebeneffekt der Speicherentscheidung aus §3 – es kostet fast nichts extra. |
| **Einsatzakte (ZIP)** | `§3.11` | Rohprotokoll + Endzustand + alle Produkte + Hashliste. |

Alle Produkte tragen „Stand: <Datum/Zeit>" plus Einsatz- und FüSt-Name im Kopf (`F-K7`, `F-A1`). Die Erzeugung läuft im Main-Prozess außerhalb des Worker-Threads, damit ein 40-seitiges PDF weder den Fold noch die Eingabe blockiert.

### 6.3 Was gegenüber der Excel besser wird

- Ausgaben sind **Funktionen über den Zustand**, keine zweite Datenhaltung. Die Excel hält `Auswertung`, `LogFrei` und die HTML-Datei als Kopien mit eigenem Aktualisierungsproblem (`vba §6.3`: HTML-Export nur bei offener Mappe).
- Keine Zeilenobergrenzen (Druck-Blatt fest 29 Einsatzstellenzeilen, `kritik §3.1`).
- Der Monitor zeigt einen **konsistenten** Stand, weil er dasselbe Delta bekommt wie das Hauptfenster – kein „vergessen zu exportieren".

---

## 7. Test- und Qualitätsstrategie

### 7.1 Ebenen

| Ebene | Werkzeug | Gegenstand | Zielumfang |
|---|---|---|---|
| Unit | Vitest | `packages/kern` (Modell, Validierung, Kennzahlen, Upcaster), `packages/stan` (Inferenz), `packages/eeb` (Adapter), `packages/ausgaben` (Ansichtsmodelle) | Zeilenabdeckung ≥ 85 % in `kern`, harte Schwelle in CI |
| Property | Vitest + `fast-check` | Fold-Eigenschaften (§7.2) | ≥ 6 Eigenschaften, je 1.000 Läufe |
| Datei-/Nebenläufigkeit | Vitest + echte Temp-Verzeichnisse | `packages/speicher`: Append+fsync, Tail ab Offset, abgeschnittene letzte Zeile, Hashkette, Segmentwechsel, Wiederanlauf nach Absturz | jeder Fall einzeln |
| Mehrclient-Simulation | `packages/cli simuliere` als Vitest-Test | §7.3 | in CI bei jedem Push |
| Goldfiles | Vitest-Snapshots | HTML/CSV/XLSX-Ausgaben gegen abgelegte Referenzen | je Produkt mind. ein Referenzeinsatz |
| Komponenten | Vitest + Testing Library | Renderer-Komponenten und Store-Selektoren – **heute null vorhanden** (`kritik §3.6 Punkt 7`) | die 15 wichtigsten Komponenten |
| E2E | Playwright + `playwright-bdd`, `_electron.launch()` | 10 vorhandene Szenarien + Mehrclient-Szenarien (§7.4) | grün auf allen drei Betriebssystemen |

### 7.2 Property-Tests für den Fold

Der Fold ist die Stelle, an der Korrektheit über Nebenläufigkeit entschieden wird; er ist eine reine Funktion und damit ideal für generative Tests. Geprüfte Eigenschaften:

1. **Permutationsinvarianz.** Für jede Permutation derselben Ereignismenge ist der gefaltete Zustand identisch (tiefer Vergleich ohne die Reihenfolge der Hinweise).
2. **Idempotenz.** Ereignismenge ∪ Duplikate ⇒ derselbe Zustand.
3. **Schnappschuss-Äquivalenz.** `falte(alle)` == `falte(rest, ab=schnappschuss(präfix))` für jeden Schnittpunkt.
4. **Monotonie der HLC.** Für jeden erzeugten Ereignisstrom ist die HLC-Folge je Client streng monoton und kausal konsistent, auch bei simulierter Uhrabweichung von ±3 h.
5. **Invarianten des Zustands.** Nach jedem Fold: keine Zyklen im Abschnittsbaum, keine Einheit in einem nicht existierenden Abschnitt, `gesamt == fue+ufue+he`, keine Waise (Fahrzeug/Helfer ohne Einheit).
6. **Konvergenz nach Partition.** Zwei Client-Ströme, unabhängig erzeugt, dann vereinigt ⇒ auf beiden Seiten derselbe Zustand.
7. **Rundreise Serialisierung.** `parse(serialize(e)) == e` für jedes generierte Ereignis, inklusive Upcaster-Kette von `v1` bis zur aktuellen Version.

Generatoren liegen in `packages/kern/test/generatoren.ts` (zufällige, aber fachlich plausible Ereignisströme: Einheiten anlegen, verschieben, Stärke ändern, Abschnitte umhängen, löschen, archivieren).

### 7.3 Mehrclient-Simulation auf Dateiebene

`akte simuliere --clients 4 --dauer 2000 --stoerungen partition,uhr,absturz,truncate` startet 4 Prozesse (`node:child_process`), jeder mit eigener `clientId`, gegen ein gemeinsames Temp-Verzeichnis, das den Share spielt. Jeder Prozess erzeugt zufällige Kommandos, schreibt seine eigene Ereignisdatei und liest die fremden. Eingestreute Störungen:

- **Partition**: Ein Prozess verliert für n Sekunden den Zugriff auf das Share-Verzeichnis (Pfad umbenannt) und arbeitet lokal weiter.
- **Uhrsprung**: Ein Prozess bekommt eine um Stunden verstellte Uhr injiziert.
- **Absturz**: Ein Prozess wird mit `SIGKILL` mitten im Schreiben beendet und neu gestartet.
- **Truncate**: Die letzte Zeile einer Datei wird künstlich halbiert.
- **Langsames Dateisystem**: künstliche Verzögerung je Operation (simuliert SMB-Latenz).

Abnahmekriterium: Nach dem Lauf falten alle vier Prozesse **und** ein fünfter, frisch gestarteter Leser denselben Zustand, und kein Kommando, das eine Bestätigung erhalten hat, ist verloren. Das ist der Test, den v1 nicht bestanden hätte (`kritik §3.4`); er läuft in CI in unter einer Minute und braucht kein NAS.

Ergänzend, **einmalig manuell**: derselbe Lauf gegen das echte Share (M0/M8), um die Annahmen über Latenz und Sichtbarkeit zu prüfen. Das ersetzt die Simulation nicht, sondern kalibriert sie.

### 7.4 E2E

- Werkzeug bleibt **Playwright mit `playwright-bdd`** und `_electron.launch()`. Die zehn Gherkin-Szenarien (`e2e/features/`) werden wörtlich übernommen; nur die Step-Definitionen folgen der neuen UI. Kein Werkzeugwechsel, kein Verlust (`bmecat §9 R6` bewertet den Wechsel bei Tauri als „Mittel–hoch").
- **Neu und wichtig:** Playwright kann in einem Test **zwei Electron-Instanzen** starten. Damit wird der Mehrbenutzerfall endlich als E2E prüfbar: Instanz A und B öffnen dieselbe Akte in einem Temp-Verzeichnis, A verschiebt eine Einheit, B sieht sie innerhalb von n Sekunden – und umgekehrt. Genau dieser Test hätte den Lost Update gefunden.
- Weitere neue Szenarien: NAS-Ausfall (Verzeichnis umbenennen während des Betriebs), EEB-Segmentstapel per simuliertem Handscanner (Tastatureingabe), Druck-PDF erzeugt eine nicht leere Datei mit erwarteter Seitenzahl, Monitorfenster zeigt dieselbe Gesamtstärke wie das Hauptfenster.
- Die drei SLO-Skripte (`check-devtools-slo.cjs`, `check-einsatz-open-slo.cjs`, `check-strength-monitor-slo.cjs`) werden auf zwei reduziert: „Akte mit 300 Einheiten öffnen < 2 s" und „Fremdänderung sichtbar < 5 s (mit UDP) / < 12 s (ohne UDP)".

### 7.5 CI-Matrix

```
prepare   → Version/Tag                                      (~5 s heute)
lint      → eslint, 0 Warnungen (heute 15)                    neu als Gate
typecheck → tsc -b über alle Pakete                           MUSS echt laufen
test      → vitest run (alle Pakete inkl. Property + Simulation)
e2e       → ubuntu-latest (xvfb) + windows-latest, playwright-bdd
build     → linux / linux-arch / mac / win  (parallel, wie heute)
release   → gh-release
```

Zwei Bemerkungen zum Ist-Stand, die in v2 nicht wiederkommen dürfen:
- `npm run typecheck` ist heute faktisch ein No-op (`tsconfig.json` mit `files: []`, `kritik §3.7`), und es liegen 42 + 91 Typfehler auf `main`. In v2 ist `tsc -b` ein Blocker.
- Die CI meldet heute grün, obwohl Lint/Typecheck fehlschlagen: Lauf `27095343919` brach drei Builds nach 27–42 s ab, der Windows-Job lief 242 s durch (`nachlese-build §3.2`). Die Job-Abhängigkeiten werden so gesetzt, dass `build` ohne grünes `test` gar nicht startet.

Erwartete CI-Dauer: heute Median **5:16 min** Wandzeit (`nachlese-build §3.1`). Durch den Wegfall von `rebuild:native` und den Zuwachs an Tests bleibt die Größenordnung erhalten [Annahme: +30–60 s für Property-/Simulationstests, −20–40 s für den entfallenden Native-Build].

### 7.6 Qualitätsgates jenseits von Tests

- **Keine Datei > 400 Zeilen** in `packages/kern` (Lernpunkt aus `bmecat §1.2`, wo `lib.rs` 82,6 KB hat).
- **Jedes Konzept vor dem Code**: `docs/KONZEPT-*.md` mit §-Nummern, Code-Kommentare verweisen auf §-Nummern (`bmecat M29`).
- **Messwert an jeder Leistungsaussage** (`bmecat M31`): Öffnen über SMB in ms, Fold-Dauer bei n Ereignissen, Sichtbarkeitslatenz.
- **ADR je Architekturentscheidung**, mindestens: Ereignisprotokoll, Electron bleibt, kein SQLite, Store-Wahl, kein Peer-Update.

---

## 8. Meilensteine bis Excel-Parität

Einheit: **Personenwoche (PW) = 5 konzentrierte Arbeitstage** eines KI-gestützten Einzelentwicklers. Das ist kein Kalendermaß: Bei ehrenamtlicher Arbeit neben dem Beruf entspricht 1 PW erfahrungsgemäß 2–4 Kalenderwochen [Annahme].

### M0 – Beweis der Speicherarchitektur (Spike) · 1,0–1,5 PW

Zuerst, vor jeder UI-Zeile. Wegwerfcode ist erlaubt, aber die Erkenntnisse gehen in `docs/KONZEPT-SPEICHER.md`.

Inhalt: minimaler Ereignis-Append mit `len\tcrc32\tjson`, `fsync`, Tail-Leser, HLC, ein Fold über drei Ereignistypen, Poll-Schleife, UDP-Hinweis, `akte simuliere` mit 4 Prozessen und allen fünf Störungen; **Messung auf dem echten Share** (stat/open/read/append/fsync/readdir in ms, Sichtbarkeitslatenz mit und ohne UDP); Prüfung, ob `exceljs` die Excel-Mappe liest.

**DoD:** (a) Simulation mit 4 Clients, 2.000 Kommandos und allen Störungen konvergiert reproduzierbar; (b) Messprotokoll vom realen NAS liegt vor und das Poll-Intervall ist daraus begründet; (c) ein absichtlich halbierter Dateischwanz wird erkannt und repariert; (d) Entscheidung dokumentiert, ob 8 MB die richtige Segmentgröße ist. **Abbruchkriterium:** Wenn Append+fsync auf dem realen Share > 300 ms je Ereignis braucht oder Fremdänderungen > 30 s unsichtbar bleiben, wird das Modell überdacht, bevor Aufwand hineinfließt.

### M1 – Kern-Paket · 2,0–3,0 PW

Modell (§4.1), Ereigniskatalog (§3.4) mit `zod`-Schemata und Upcastern, Fold mit allen Regeln (§3.5), Kennzahlen (§4.4), Validierungen, Format-Serialisierung, HLC. Übernahme von STAN und Zeichen-Inferenz aus v1 (§5.3).

**DoD:** alle sieben Property-Eigenschaften grün; die 21 Kennzahlen gegen von Hand gerechnete Referenzwerte aus der Excel geprüft; `packages/kern` hat keinen `node:`/`electron`-Import (Lint + jsdom-Lauf); Zeilenabdeckung ≥ 85 %; `docs/KONZEPT-EREIGNISSE.md` vollständig.

### M2 – Schale und Gerüst · 2,0–3,0 PW

Workspace-Umbau, Main dünn, Worker-Thread mit Protokoll, IPC-Kontrakt (`packages/kontrakt`), Preload je Fenster, Renderer-Grundgerüst mit Store, zwei Fenster (Haupt + Monitor), Einstellungen, Logging, Fehlerbilder („NAS nicht erreichbar", „Uhr weicht ab"), CI-Umbau.

**DoD:** Anwendung startet, legt eine Akte an, schreibt Ereignisse, zeigt Statuszeile mit Peer-Anzahl und Stand; zwei Instanzen auf einem Temp-Verzeichnis sehen sich gegenseitig (erster Mehrclient-E2E grün); kein `*Sync`-Aufruf im Main (Lint); CI grün inklusive echtem `tsc -b`.

### M3 – Vertikaler Schnitt 1: Lagebild · 2,0–3,0 PW

Abschnittsbaum (anlegen, umbenennen, umhängen, sortieren, auflösen), Einheiten (anlegen, bearbeiten, verschieben, teilen, entfernen) mit allen Feldgruppen aus §4.3, Fahrzeuge, Helfer, taktische Zeichen, Kopiervorlagen aus STAN, Status (9 Werte) und Schicht, Stärkeanzeige, ETB-Ansicht, Undo als Kompensation.

**DoD:** Ein Einsatz mit 150 Einheiten ist vollständig führbar; die zehn übernommenen BDD-Szenarien sind grün; ETB zeigt jede Änderung mit Akteur und Zeit; Undo funktioniert clientbezogen; Konflikthinweise erscheinen im UI.

### M4 – Vertikaler Schnitt 2: Ausgaben · 2,0–3,0 PW

Druck, Status, Log/LogFrei, Auswertung, FüOrg, ETB-PDF, HTML-Monitor (Datei + Fenster), XLSX/CSV-Export, ZIP-Einsatzakte.

**DoD:** Jedes Produkt hat ein Goldfile-Testpaar; ein Ausdruck der Stärkeübersicht ist gegen einen Excel-Ausdruck desselben Datenstands Zeile für Zeile geprüft (das ist das eigentliche Paritätskriterium); der HTML-Monitor aktualisiert sich auf einem zweiten Gerät.

### M5 – Vertikaler Schnitt 3: Planung, Logistik, Kosten, FüSt-Personal · 2,5–3,5 PW

Anforderungen/Ablösung (`F-F1..F-F5`) inklusive Verknüpfung abzulösende ↔ ablösende Einheit, Schichtführung, Logistikzahlen (`F-H1..F-H4`), Kostenrechnung (`F-L6`, `F-A4`), FüSt-Dienstposten und Schichtplanung (`F-I1`, `F-I2`), Archivbereich „Einsatz beendet".

**DoD:** Alle Anforderungen der Gruppen F, G, H, I, L aus `handbuch §7` sind abgehakt oder begründet zurückgestellt; die FüSt-Stärke fließt korrekt in die Gesamtstärke; Kostenformeln stimmen mit den Excel-Formeln aus `domaenen §10` überein.

### M6 – EEB und Meldekopf · 1,5–2,5 PW

Paketschnitt in erfassungsbogen.app (§5.4), Adapter, Sammel-Scan über Handscanner/Kamera/Bildordner, Eingangskorb mit Quittierung, Übergabe per Datei, EEB-Dateiverknüpfung und Anhänge.

**DoD:** Ein realer, mehrteiliger QR-Bogen wird per Handscanner vollständig eingelesen und erzeugt Einheit + Personal + Fahrzeuge + Logistikbedarf; Quittierungslogik (neu/übernommen/geändert) ist getestet; `@erfassungsbogen/kern` ist eine gepinnte Abhängigkeit, keine Kopie.

### M7 – Migration und Betrieb · 1,5–2,0 PW

`akte migriere` für v1-`.s1control`, Excel-Import (§3.10), Update-Ablage auf dem Share (§2.6), Archivierung/Export, Betriebsdokumentation (`docs/BETRIEB.md`: NAS einrichten, Ordnerrechte, Notverfahren bei NAS-Ausfall, USB-Übergabe).

**DoD:** Eine reale v1-Datei und – falls vorhanden – eine gefüllte Excel-Mappe sind migriert und gegengelesen; ein Update wird über die Share-Ablage auf einem zweiten Rechner installiert; die Betriebsanleitung ist von jemandem außer Johannes einmal durchgearbeitet worden.

### M8 – Feldhärtung und Abnahme · 1,5–2,5 PW

Übungslauf mit 3–4 echten Clients auf dem echten NAS, Fehlerbilder nachziehen, Bedienung unter Stress (`N-5`: Tastatur-first, Kürzel wie Strg+D für „jetzt", Eingabemasken mit Listen), Barrierefreiheit der Monitoransicht (Schriftgröße, Kontrast), Leistungsmessung mit 300 Einheiten, Rest-Anforderungen aus `handbuch §7`.

**DoD:** Ein vollständiger Übungseinsatz wurde ohne Rückgriff auf die Excel geführt; die Abnahmeliste `docs/UI-ABNAHME.md` ist abgehakt; die SLOs (Öffnen < 2 s, Fremdänderung < 5 s) sind auf der Zielhardware gemessen.

### Summe und Unsicherheit

| Meilenstein | PW min | PW max |
|---|---|---|
| M0 Speicher-Spike | 1,0 | 1,5 |
| M1 Kern | 2,0 | 3,0 |
| M2 Schale | 2,0 | 3,0 |
| M3 Lagebild | 2,0 | 3,0 |
| M4 Ausgaben | 2,0 | 3,0 |
| M5 Planung/Logistik/Kosten/FüSt | 2,5 | 3,5 |
| M6 EEB/Meldekopf | 1,5 | 2,5 |
| M7 Migration/Betrieb | 1,5 | 2,0 |
| M8 Feldhärtung | 1,5 | 2,5 |
| **Summe** | **16,0** | **24,0** |

**Gesamtspanne: 16–24 Personenwochen bis Excel-Parität.** Die Unsicherheit von 50 % sitzt an vier Stellen: (1) der Vollständigkeit des Fold-Regelwerks (M1) – jede vergessene Regel taucht später als stiller Falschzustand auf; (2) den Ausgaben (M4), weil „sieht aus wie der Excel-Ausdruck" ein weiches Kriterium ist, das erfahrungsgemäß mehrere Runden braucht; (3) M5, weil die Ressourcenplanung in v1 **vollständig fehlt** (`kritik §3.1`) und fachlich mit der FüSt abgestimmt werden muss; (4) dem realen SMB-Verhalten, das erst M0 zeigt. Nach unten begrenzt wird die Spanne dadurch, dass Domänenmodell, Zeichen-Inferenz, STAN-Daten, Updater, CI und Testinfrastruktur bereits existieren; nach oben dadurch, dass kein Sprachwechsel und kein Werkzeugwechsel eingeplant ist.

Zum Vergleich der Größenordnung: `bmecat §9 R5` berichtet für das Schwesterprojekt 31,5 kLoC Rust in 9 Tagen KI-gestützt – „aber dort ohne Mehrbenutzer-Komplexität". Genau diese Komplexität ist hier der Kern und rechtfertigt, dass M0 und M1 zusammen ein Fünftel des Gesamtaufwands binden.

**Frühester Nutzen vor Parität:** Nach M3+M4 (ca. 8–12 PW) ist das Werkzeug für den Regelfall „Lage führen und ausdrucken" bereits besser als die Excel, weil es mehrbenutzerfähig ist und ein ETB führt. Der Umstieg muss nicht auf die volle Parität warten; M5 kann als Parallelbetrieb (Excel nur noch für Kosten/Schichtplan) überbrückt werden.

---

## 9. Risiken mit Gegenmaßnahmen

Priorisiert nach Eintrittswahrscheinlichkeit × Schaden.

| # | Risiko | Warum wahrscheinlich | Gegenmaßnahme | Frühwarnzeichen |
|---|---|---|---|---|
| **A1** | **Das Fold-Regelwerk ist unvollständig** – ein Ereignisfall ohne Regel erzeugt stille Falschzustände (`nas §10 Restrisiko 1`). | Der Katalog hat ~45 Ereignistypen; jede Kombination mit Löschen/Umhängen/Archivieren ist ein Fall. | Ereigniskatalog als Spezifikation **vor** dem Code (`docs/KONZEPT-EREIGNISSE.md`); Property-Tests mit generierten Strömen (§7.2); erschöpfende `switch`-Prüfung im Typsystem; jeder Konflikt erzeugt einen sichtbaren Hinweis statt stiller Auflösung. | Ein Simulationslauf, in dem zwei Clients divergieren, ohne dass ein Hinweis erscheint. |
| **A2** | **Das reale SMB-Verhalten weicht von den Annahmen ab** – Sichtbarkeit dauert länger, `fsync` ist teuer, `readdir` blockiert (`nas §10 Restrisiko 2`, `kritik §3.7`: nirgends gemessen). | Es gibt **keine** Messung; NAS-Typ ist unbekannt (`nachlese-betriebsparameter §2`: einziger Beleg ist „1x Netzwerkfestplatte" aus einer Materialliste). | M0 misst zuerst, mit Abbruchkriterium; Poll-Intervall wird aus der Messung abgeleitet; alle Share-Operationen mit Timeout im Worker; UI zeigt den Stand ehrlich an. | M0-Messprotokoll mit Werten außerhalb der Erwartung. |
| **A3** | **Ehrenamtlicher Einzelentwickler, 16–24 PW** – Unterbrechungen über Monate, Wissensverlust zwischen Sitzungen. | Struktur des Projekts (`bmecat §9 R5` stuft „Ein-Personen-Team" selbst als Hoch ein). | Vertikale Schnitte mit eigenständigem Nutzen (M3+M4 sind bereits einsetzbar); Konzeptdokumente mit §-Nummern als Gedächtnis (`bmecat M29`); ADRs; jeder Meilenstein hat ein DoD, das auch nach drei Monaten Pause prüfbar ist. | Ein Meilenstein läuft ohne abgehaktes DoD in den nächsten über. |
| **A4** | **Excel-Parität wird unterschätzt** – die Excel deckt fachlich weit mehr ab als v1 (`kritik §3.1`: Ressourcenplanung, Schicht, Logistikzahlen, Statusfeinheit, FüSt-Personal, acht Ausgabeprodukte fehlen alle). | Der Umfang ist mit 55 funktionalen Anforderungen belegt (`handbuch §7`). | Anforderungsliste F-A1…N-9 als Abhakliste im Repo (`docs/PARITAET.md`); je Meilenstein die zugehörigen Anforderungen benannt; bewusste Zurückstellungen dokumentiert statt vergessen. | Ein Meilenstein endet, ohne dass die Abhakliste fortgeschrieben wurde. |
| **A5** | **Kein Feldtest mit mehreren echten Clients vor dem ersten Einsatz** – genau so ist der heutige Lost Update jahrelang unentdeckt geblieben (`main §11`: „lief S1-Control seit Juni 2026 faktisch nur mit einem schreibenden Client?"). | Feldtests kosten Termine mit mehreren Personen. | Mehrclient-E2E in CI ab M2 (§7.4); M8 mit Übungslauf als Pflicht-DoD; die Simulation ersetzt den Feldtest nicht, macht ihn aber kurz. | M8 wird „aus Zeitgründen" verkürzt. |
| **A6** | **Renderer-Umbau zieht sich** – 10.097 Zeilen, 91 Typfehler, kein Store, keine Komponententests (`kritik §3.6 Punkt 7`). | Der Umbau berührt jede Ansicht. | Nicht „migrieren", sondern je vertikalem Schnitt neu bauen und nur Inhalte übernehmen; Store und Selektoren zuerst (M2); Komponententests als Gate, damit der Umbau nicht in die Breite läuft. | In M3 werden Komponenten aus v1 unverändert eingefügt und ziehen Typfehler nach. |
| **A7** | **Client-Identität kollidiert** (Image-Klon, kopiertes Profil) → zwei Rechner schreiben in dieselbe Ereignisdatei und zerstören sie (`nas §10 Restrisiko 4`). | THW-Rechner werden geklont ausgerollt [Annahme]. | `clientId` = Zufalls-ID + Hostname; beim Start prüft der Worker, ob die eigene Share-Datei zum lokalen Offset und zur Hashkette passt; bei Abweichung wird eine neue Dateigeneration begonnen und gewarnt. | Warnung „Fremdschreiber in eigener Datei erkannt" in den Logs. |
| **A8** | **Schema-Evolution der Ereignisse** – ein Client mit älterer App im selben Einsatz (`nas §10 Restrisiko 3`). | Updates erreichen im Einsatz nicht alle Rechner gleichzeitig (§2.6). | `schemaVersion` je Ereignis; nur additive Änderungen; unbekannte Typen werden durchgereicht und angezeigt, nie verworfen; Mindestversion im `ablage.json`; Migrationstest je Stufe (`bmecat M16`). | Ein alter Client zeigt beim Öffnen „unbekannte Ereignisse" in nennenswerter Zahl. |
| **A9** | **Wachstum des Protokolls** – lange Einsätze, Startzeit, Archivgröße (`nas §10 Restrisiko 5`). | 50.000 Ereignisse × ~300 B ≈ 15 MB je Einsatz (`nas §4`) – beherrschbar, aber nicht null. | Schnappschüsse mit Versionsvektor + Hash; lokale Materialisierung; Segmentierung ab 8 MB; Leser validieren Schnappschüsse stichprobenartig gegen Neu-Fold. | Öffnen einer Akte überschreitet das SLO von 2 s. |
| **A10** | **Stiller Update-Weg unter Windows scheitert** – NSIS `/S` ohne Adminrechte, Virenscanner, gesperrte Ausführung vom Netzlaufwerk. | THW-Rechner können gehärtet sein; unbekannt (§10, Punkt 2). | Installer wird **erst lokal kopiert**, dann ausgeführt; Fallback „Ordner öffnen, Datei doppelklicken"; Portable-EXE als zweiter Weg; Verfahren in `docs/BETRIEB.md`. | Update auf einem zweiten Rechner in M7 schlägt fehl. |
| **A11** | **`exceljs` liest die `.xlsm`-Mappe nicht sauber** (Formeln, benannte Bereiche, Kommentare). | `.xlsm` mit 342 benannten Bereichen ist kein einfacher Fall. | Prüfung bereits in M0; Rückfallebene `fflate` + eigener SheetXML-Parser; im Zweifel wird der Excel-Import auf die Kopiervorlagen reduziert und Einsatzdaten per CSV übernommen. | M0 kann Blatt „Stärke" nicht vollständig lesen. |
| **A12** | **Electron-Wartungslast** – Chromium-Sicherheitsaktualisierungen erzwingen regelmäßige Upgrades. | Electron hat ~8-Wochen-Takt. | Ohne native Module ist ein Electron-Upgrade ein Versionsdreher plus CI-Lauf (heute: `rebuild:native` und ABI-Risiko); Upgrade zweimal jährlich als feste Aufgabe in `docs/BETRIEB.md`. | Ein Upgrade schlägt fehl und wird verschoben. |
| **A13** | **UDP wird blockiert** (WLAN-Isolation, Firewall, Multi-Adapter) → nur Polling, bis 10 s Latenz (`main §9 R-SYNC-1`, `nas §8.1`). | Einsatznetze sind heterogen. | Polling ist immer aktiv und ausreichend; Unicast an Peers aus `praesenz/` zusätzlich zum Broadcast; UI zeigt „Schnellhinweis aktiv/inaktiv". | Statuszeile meldet dauerhaft „ohne Schnellhinweis". |
| **A14** | **Doppelte Wahrheit bei der Stärke** (manuell erfasst vs. aus Helferliste gezählt). | Die Excel erfasst manuell, der EEB liefert Personal (`domaenen §8.1`). | Beide Werte anzeigen, Abweichung als Hinweis, eine Quelle je Einheit als führend markieren; keine automatische Überschreibung. | Nutzer melden „meine Zahl ändert sich von selbst". |
| **A15** | **Verlust von Signaturmaterial** (macOS-Zertifikat, später ggf. Akten-Signaturschlüssel). | Bereits einmal CI-Thema (`ed68271`). | Schlüssel im Passwortmanager **und** als CI-Secret; Gültigkeitsprüfung im Workflow (existiert bereits); Akten-Signatur ist optional, nicht betriebskritisch. | Ablaufwarnung im CI-Schritt. |

---

## 10. Was Johannes noch entscheiden oder liefern muss

Ohne die Punkte 1–4 kann M0 nicht abgeschlossen werden; 5–10 blockieren spätere Meilensteine.

1. **NAS-Typ und -Konfiguration.** Hersteller/Modell, SMB-Dialekt, Oplock-/Durable-Handle-Einstellungen, Ordnerrechte. Ermittelbar mit `Get-SmbConnection` auf dem FüSt-Windows-Rechner bzw. `smbutil statshares -a` am Mac bei gemountetem Share (`nachlese-betriebsparameter §2`). **Warum wichtig:** bestimmt Poll-Intervall, Sichtbarkeitslatenz und ob `fsync` teuer ist.
2. **Windows-Version und Härtung der FüSt-Rechner.** Win10 LTSC oder Win11, Adminrechte für Benutzer ja/nein, Virenscanner, Ausführung von Netzlaufwerken erlaubt. **Warum wichtig:** Update-Weg (§2.6), Portable-EXE, Risiko A10.
3. **Reale Betriebsgrößen.** Anzahl gleichzeitiger Clients (typisch und maximal), Einheitenzahl in realen Lagen, Einsatzdauer, Anzahl Meldeköpfe. Drei Baselines stehen unvereinbar nebeneinander: „150 Einheiten" (`main`), „<5.000" (`nas`), „272 Zeilen Excel-Kapazität" (`kritik §3.1`). **Warum wichtig:** Schnappschuss-Politik, SLOs, ob die In-Memory-Projektion reicht.
4. **NTP im Einsatznetz ja/nein.** Gibt es eine Zeitquelle (FüKomKW, Router, DCF77)? **Warum wichtig:** Wenn ja, ist die HLC-Delta-Warnung kosmetisch; wenn nein, muss die UI die Uhrabweichung sichtbar führen und alle Fachzeiten korrigierbar sein.
5. **Rollen.** Soll es überhaupt Anmeldung geben, oder reicht „Name + Rechner" je Ereignis (§4.6)? Wenn Rollen: welche, und was dürfen sie ausschließlich (Archivieren, Stammdaten, Löschen)? Heute sind Rollen definiert, aber nirgends durchgesetzt (`main §9 R-OPS-3`).
6. **Peer-Update ja oder nein.** Vorschlag A streicht den LAN-Peer-Updater (919 Zeilen) zugunsten der Share-Ablage. Wenn er bleiben soll: +1,0–1,5 PW und die Frage, warum der Share-Weg nicht reicht.
7. **Anzahl und Rolle der Meldeköpfe.** Arbeiten sie als S1-Clients auf demselben Share oder mit erfassungsbogen.app und Dateiübergabe (§4.5)? Beides ist vorgesehen, aber die Bedienoberfläche unterscheidet sich (Eingangskorb ja/nein).
8. **Migrationsbestand.** (a) Existieren produktive `.s1control`-Dateien, die migriert werden müssen? (b) Existieren gefüllte Excel-Mappen realer Einsätze oder nur die Vorlage (`kritik §3.7`)? (c) Existieren noch Legacy-`.sqlite`-Dateien (`main §11`)? Wenn (b) und (c) „nein", entfallen zwei Import-Pfade und M7 wird ~0,5 PW kürzer.
9. **Lizenz.** Kompatibilität EUPL-1.2 (erfassungsbogen.app) mit der S1-Control-Lizenz für den Paketschnitt (§5.4).
10. **Fachliche Abnahme der Ressourcenplanung.** Der Anforderungsvorgang (`handbuch F-F1..F-F4`, Anforderungs-ID, Zugesagt für/von, vorgesehene Einheit) ist in der Excel nur als Spaltenkonvention beschrieben und war in v1 gar nicht vorhanden. Vor M5 braucht es einen Durchgang mit der FüSt: Wer vergibt die Anforderungs-ID? Wie sieht der Ablauf mit der übergeordneten Stelle konkret aus? **Warum wichtig:** größter Einzelposten der Unsicherheit in §8.

Zusätzlich hilfreich, aber nicht blockierend: ein anonymisierter realer Einsatzstand (Excel oder `.s1control`) als Testdatensatz für Goldfiles (§7.1) und die Paritätsprüfung des Ausdrucks (M4-DoD).

---

Ende des Vorschlags A.

