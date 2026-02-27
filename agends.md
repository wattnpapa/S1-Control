# S1-Control – Agent-Handbuch

Dieses Dokument ist für Coding-Agents, die an diesem Repository arbeiten.
Ziel: schnell korrekt liefern, ohne bestehende Betriebslogik zu brechen.

## 1) Produktkontext

- Desktop-App für THW S1 Einsatzkräfteverwaltung.
- Offline-first, kein Cloud-Backend, kein lokaler Mini-Server.
- Mehrbenutzerbetrieb über gemeinsame Datei (Fileshare) muss robust bleiben.

## 2) Technischer Kern

- Electron Main + Preload + React Renderer, TypeScript strict.
- Renderer wird mit Vite gebaut.
- DB: SQLite über `better-sqlite3` + Drizzle, Zugriff **nur im Main-Prozess**.
- IPC ist die einzige Schnittstelle Renderer <-> Main.

Wichtige Pfade:
- Main: `src/main/**`
- Renderer: `src/renderer/src/**`
- Shared Types/IPC: `src/shared/**`
- DB Schema/Migration: `src/main/db/**`, `drizzle/**`

## 3) Harte Architekturregeln

- Keine DB-Queries im Renderer.
- Jede Schreiboperation in DB-Transaktion.
- Archivierte Einsätze (`status=ARCHIVIERT`) dürfen nicht verändert werden (enforced im Main).
- Keine neuen Netzwerkabhängigkeiten für Kernfunktionen einführen.
- UI-Änderungen immer mit bestehendem visuellen Stil kompatibel halten.

## 4) Datenbank- und Dateiregeln

- Einsatzdatei-Endung: `.s1control` (Legacy `.sqlite` weiterhin lesbar).
- Systemdatei im Einsatz-Verzeichnis: `_system.s1control`.
- Beim DB-Open müssen gesetzt sein:
  - `journal_mode=WAL`
  - `synchronous=NORMAL`
  - `foreign_keys=ON`
  - `busy_timeout=5000`
- Jeder Einsatz ist atomar: eigene DB-Datei.
- Backups im Unterordner `backup/`, derzeit ebenfalls mit `.s1control`.

## 5) Multi-Client / Präsenz / Backup-Master

- Aktive Clients werden in DB geführt (`active_client`).
- Heartbeat aktualisiert regelmäßig.
- Stale Clients (>30s ohne Update) werden entfernt.
- Genau ein Client ist `MASTER`; nur dieser schreibt periodische Backups.
- Bei Ausfall des Masters muss automatisch ein anderer Client übernehmen.

## 6) Start-/Öffnen-Verhalten

- Letzte Einsätze werden lokal gemerkt.
- Sortierung auf Startseite: absteigend nach letzter Nutzung.
- Datei-Doppelklick auf `.s1control` soll App öffnen und Einsatz laden.
- Wenn App bereits läuft: Datei in bestehender Instanz öffnen.

## 7) Updater / Release

- Auto-Updater läuft über GitHub Releases + Metadaten (`latest*.yml`).
- Versionierung:
  - Build-Tag: `YYYY.MM.DD.HH.MM` (UTC)
  - SemVer-kompatible Build-Version separat für Updater.
- Bei Offline/Netzfehlern keine aggressive Fehlermeldungsflut.

## 8) Build & CI

Lokale Standards:
- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:coverage`
- `npm run build`

CI:
- GitHub Actions baut auf `main` für macOS, Windows, Linux (inkl. `.deb`, `.pacman`).
- Update-Metadaten müssen in Artefakten vorhanden sein, sonst schlägt CI bewusst fehl.

## 9) Tests & Qualität

- Neue Features immer mit Tests.
- Zielwerte im Projektverlauf hochgezogen; orientiere dich an hoher Abdeckung in allen Bereichen.
- Relevante Tests:
  - Service-/DB-Tests in `test/*.test.ts`
  - Coverage über `vitest --coverage`

Beim Ändern von:
- `src/main/services/einsatz.ts`: unbedingt Validierungs- und Fehlerpfade mittesten.
- Updater-/Dateipfade: Tests für Fallbacks und Plattformpfade ergänzen.

## 10) UI/UX Leitplanken

- Sprache: Deutsch (mit Umlauten).
- Header/Navigation sind kompakt, einsatznah, ohne unnötige Bedienelemente.
- Für tabellarische Ansichten platzsparende Actions (Icons) beibehalten.
- Stärke-/Zeit-Monitor ist Vollbild-optimiert, Schriftgröße muss dynamisch passen.

## 11) Sicherheit / Betrieb

- Kein Klartext-Passwort-Handling außerhalb bestehender Auth-Services.
- Keine destruktiven DB-Operationen ohne klare Validierung.
- Fehler im Main-Prozess so behandeln, dass Nutzer eine verständliche Meldung erhalten.

## 12) Agent-Arbeitsweise (konkret)

Vor Änderung:
- Betroffene Flows über `rg` suchen.
- Prüfen, ob Tests existieren und erweitert werden müssen.

Nach Änderung:
- Mindestens `typecheck`, `lint`, zielgerichtete Tests laufen lassen.
- Bei kritischen Änderungen komplettes `test:coverage` laufen lassen.
- README aktualisieren, wenn Verhalten/Dateiformate/Bedienung geändert wurden.

Commit-Richtlinie:
- Kleine, thematisch saubere Commits.
- Aussagekräftige Commit-Messages (`feat(...)`, `fix(...)`, `test(...)`, `chore(...)`).

## 13) Häufige Fallstricke

- Dateiendung hart auf `.sqlite` kodieren (nicht mehr korrekt).
- DB im Renderer anfassen (verboten).
- Auto-Updater ohne vorhandene `latest*.yml` erwarten.
- UI-Modal überladen statt bestehende Inline-Editoren zu nutzen.
- Branch-Coverage in Kernservices unterschätzen (v.a. `einsatz.ts`).

