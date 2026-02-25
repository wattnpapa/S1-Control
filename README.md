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

Standard-Login: `admin` / `admin`

## Wichtige Skripte

- `npm run dev`: Vite + Electron mit Live-Reload
- `npm run test`: Vitest (DB/Command)
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

## DB-Pfad / Fileshare

- DB-Pfad ist in der App konfigurierbar (Settings-Bereich).
- Alternativ über ENV: `S1_DB_PATH=/pfad/zur/einsatz.sqlite`
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

## Architekturregeln

- Kein DB-Zugriff im Renderer
- Alle Writes laufen im Main-Prozess, jeweils in Transaktionen
- Archivierte Einsätze (`status=ARCHIVIERT`) sind schreibgeschützt (Main enforced)
- Undo für `MOVE_EINHEIT` und `MOVE_FAHRZEUG` via `einsatz_command_log`

## Export (MVP)

`Einsatzakte exportieren` erzeugt ZIP mit:

- DB-Kopie (`einsatz.sqlite`)
- `report.html`
- `einheiten.csv`
- `bewegungen.csv`

Struktur ist vorbereitet, um später PDF-Erzeugung (z.B. Puppeteer) zu ergänzen.
