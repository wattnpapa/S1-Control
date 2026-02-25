# S1-Control (MVP)

Offline-first Desktop-App für THW Führungsstelle (S1) Einsatzkräfteverwaltung.

## Stack

- Electron (Main + Preload)
- React + TypeScript (Renderer)
- Vite (Renderer bundling)
- SQLite (WAL, busy_timeout)
- Drizzle ORM + better-sqlite3
- IPC via `contextBridge`

## Setup

```bash
npm install
```

## Entwicklung

```bash
npm run dev
```

Aktuell erfolgt die Anmeldung intern automatisch mit dem lokalen Standard-User (`admin`).

## Wichtige Skripte

- `npm run dev`: Vite + Electron mit Live-Reload
- `npm run test`: Vitest (DB/Command)
- `npm run test:coverage`: Tests mit Coverage-Report (text, html, lcov, json-summary)
- `npm run build`: Lint + Typecheck + Build + Electron distributable (`--dir`)
- `npm run build:win`: Windows Build (`win-unpacked`, x64)
- `npm run build:win:zip`: Windows ZIP-Paket (x64)
- `npm run build:win:exe`: Windows Installer als `.exe` (NSIS, x64)
- `npm run build:win:portable`: Portable `.exe` ohne Installation (x64)
- `npm run build:linux:deb`: Linux `.deb` Paket (x64)
  - Hinweis: Mit `better-sqlite3` funktioniert das zuverlässig auf einem Windows-Host (oder via GitHub Actions `build-main.yml`), nicht als nativer Cross-Build von macOS.

## CI/CD

- Bei jedem Commit auf `main` baut GitHub Actions automatisch macOS-, Windows- und Linux-Artefakte.
- Die Release-Tag/Versionskennung wird als NATO-Zeit ohne Zeitzonenangabe erzeugt: `DDHHMMmonYY`, z.B. `251530feb26`.
- Workflow: `.github/workflows/build-main.yml`
- macOS-Artefakte werden mit **Developer ID Application** signiert und notarisiert.
- Benötigte GitHub Secrets für macOS-Signing/Notarisierung:
  - `CSC_LINK` (Base64 der `.p12` Developer-ID-Zertifikatsdatei)
  - `CSC_KEY_PASSWORD` (Passwort der `.p12`)
  - `APPLE_API_KEY_ID` (App Store Connect API Key ID)
  - `APPLE_API_ISSUER` (App Store Connect Issuer ID)
  - `APPLE_API_KEY_BASE64` (Base64-Inhalt der `AuthKey_*.p8`)

## Auto-Update

- In gebauten macOS/Windows-Versionen prüft die App beim Start auf neue GitHub-Releases.
- Bei verfügbarem Update erscheint oben eine Leiste mit Download-Button.
- Während des Downloads wird ein Overlay mit Fortschrittsbalken angezeigt.
- Nach Download kann das Update per Button installiert werden (App-Neustart).
- Die App-Version in Metadaten/Info (z.B. macOS Info.plist) wird beim Build auf den NATO-Tag gesetzt.

## DB-Pfad / Fileshare

- DB-Pfad ist in der App als **Einsatz-Verzeichnis** konfigurierbar (Settings-Bereich).
- Alternativ über ENV: `S1_DB_PATH=/pfad/zum/einsatz-verzeichnis`
- Jeder Einsatz wird als eigene SQLite-Datei im Einsatz-Verzeichnis angelegt (atomar pro Einsatz).
- Beim DB-Open werden gesetzt:
  - `PRAGMA journal_mode=WAL`
  - `PRAGMA synchronous=NORMAL`
  - `PRAGMA foreign_keys=ON`
  - `PRAGMA busy_timeout=5000`
- App arbeitet ohne Cloud/Server.
- Bei Fileshare-Nutzung:
  - Nur DB-Datei teilen (WAL-Modus aktiv)
  - Gleichzeitige Zugriffe werden über busy timeout/retry abgefedert
  - Daten werden im laufenden Einsatz automatisch periodisch aktualisiert
  - Automatische Backups alle 5 Minuten in `<einsatz-verzeichnis>/backup`
  - Bei mehreren offenen Clients schreibt nur ein Client Backups (Lock-Datei)

## Architekturregeln

- Kein DB-Zugriff im Renderer
- Alle Writes laufen im Main-Prozess, jeweils in Transaktionen
- Archivierte Einsätze (`status=ARCHIVIERT`) sind schreibgeschützt (Main enforced)
- Undo für `MOVE_EINHEIT` und `MOVE_FAHRZEUG` via `einsatz_command_log`

## Teststrategie

- Neue Features müssen mit Tests ausgeliefert werden.
- Mindestabdeckung: 75% (Lines/Functions/Branches/Statements).
- Coverage-Reports liegen in `coverage/`:
  - `coverage/index.html`
  - `coverage/lcov.info`
  - `coverage/coverage-summary.json`

## Export (MVP)

`Einsatzakte exportieren` erzeugt ZIP mit:

- DB-Kopie (`einsatz.sqlite`)
- `report.html`
- `einheiten.csv`
- `bewegungen.csv`

Struktur ist vorbereitet, um später PDF-Erzeugung (z.B. Puppeteer) zu ergänzen.
