# S1-Control (MVP)

[![codecov](https://codecov.io/gh/wattnpapa/S1-Control/branch/main/graph/badge.svg)](https://codecov.io/gh/wattnpapa/S1-Control)

Offline-first Desktop-App für die THW-Führungsstelle (S1) zur Kräfteverwaltung im Einsatz.

## Für Anwender

### Was die Software macht

S1-Control unterstützt dich bei der Lageführung im Einsatz:

- Einsätze anlegen und bestehende Einsatzdateien öffnen
- Abschnitte hierarchisch verwalten
- Einheiten und Fahrzeuge erfassen, verschieben und nachträglich bearbeiten
- Taktische Stärken automatisch zusammenfassen
- Führungsstruktur-Ansicht und Gesamtübersichten für Kräfte/Fahrzeuge
- Live-Anzeige der Gesamtstärke und NATO-Zeit im separaten Vollbildfenster (Monitoransicht)

### Offline- und Fileshare-Betrieb

- Kein Cloud-Zwang, kein externer Server
- Jeder Einsatz liegt in einer eigenen SQLite-Datei (`.s1control`)
- Mehrere Clients können dieselbe Einsatzdatei auf einem Share nutzen (WAL-Modus)
- Automatische Backups alle 5 Minuten nach `<einsatz-verzeichnis>/backup`
- Nur ein Client erstellt Backups (Lock-Mechanismus), um Konflikte zu vermeiden

### Startmenü / Launcher

- **Windows**: Der NSIS-Installer legt einen Startmenü-Eintrag unter `Sonstige` und einen Desktop-Shortcut an.
- **Linux**: Installierte Pakete (`.deb`, `.pacman`) legen einen Anwendungsstarter (`.desktop`) im Systemmenü an.
- **Portable Builds** (z.B. Windows Portable EXE) haben keinen festen Startmenü-Eintrag ohne Installation.

### Updates

- Beim Start prüft die App auf neue Releases
- Verfügbares Update wird als Banner angezeigt
- Download mit Fortschrittsanzeige, anschließend Neustart zur Installation
- Falls In-App-Download nicht möglich ist, kann direkt die Release-Seite geöffnet werden

---

## Technische Details

### Stack

- Electron (Main + Preload)
- React + TypeScript (Renderer)
- Vite (Renderer bundling)
- SQLite (WAL + busy timeout)
- Drizzle ORM + better-sqlite3
- IPC via `contextBridge`

### Setup

```bash
npm install
```

### Entwicklung

```bash
npm run dev
```

Aktuell erfolgt die Anmeldung intern automatisch mit dem lokalen Standard-User (`admin`).

### Wichtige Skripte

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

### CI/CD

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

### Datenhaltung / DB

- DB-Pfad ist als Einsatz-Verzeichnis konfigurierbar (Settings) oder per ENV:
  - `S1_DB_PATH=/pfad/zum/einsatz-verzeichnis`
- Jeder Einsatz wird als eigene SQLite-Datei angelegt (atomar pro Einsatz, Endung `.s1control`)
- Beim DB-Open werden gesetzt:
  - `PRAGMA journal_mode=WAL`
  - `PRAGMA synchronous=NORMAL`
  - `PRAGMA foreign_keys=ON`
  - `PRAGMA busy_timeout=5000`

### Architekturregeln

- Kein DB-Zugriff im Renderer
- Alle Writes laufen im Main-Prozess, jeweils in Transaktionen
- Archivierte Einsätze (`status=ARCHIVIERT`) sind schreibgeschützt (Main enforced)
- Undo für `MOVE_EINHEIT` und `MOVE_FAHRZEUG` via `einsatz_command_log`

### Teststrategie

- Neue Features müssen mit Tests ausgeliefert werden.
- Mindestabdeckung: 75% (Lines/Functions/Branches/Statements).
- Coverage-Reports liegen in `coverage/`:
  - `coverage/index.html`
  - `coverage/lcov.info`
  - `coverage/coverage-summary.json`

### Export (MVP)

`Einsatzakte exportieren` erzeugt ZIP mit:

- DB-Kopie (`einsatz.s1control`)
- `report.html`
- `einheiten.csv`
- `bewegungen.csv`

Struktur ist vorbereitet, um später PDF-Erzeugung (z.B. Puppeteer) zu ergänzen.
