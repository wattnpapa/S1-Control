# TODOs (offen)

## Refactor (nächste Schritte)
- [x] `src/main/ipc/register-entity-ipc.ts` vollständig auf Split-Module umstellen.
- [x] Neue Module integrieren und aufräumen:
  - `src/main/ipc/register-entity-einheit-ipc.ts`
  - `src/main/ipc/register-entity-fahrzeug-ipc.ts`
  - `src/main/ipc/register-entity-helfer-ipc.ts`
  - `src/main/ipc/register-entity-helfer-support.ts`
- [x] Prüfen, ob weitere Entity-Handler ebenfalls in eigene Dateien ausgelagert werden sollen (`command`, `edit-lock`).
- [x] Unnötige/alte Imports und Restcode nach dem Split entfernen.

## Qualitätssicherung
- [x] `npm run -s lint` ohne Fehler.
- [x] `npm run -s typecheck` ohne Fehler.
- [x] Relevante Tests für IPC-/Entity-Flow laufen lassen.

## Commit-Plan
- [x] Commit 1: `refactor(ipc): split entity einheit/fahrzeug handlers`
- [x] Commit 2: `refactor(ipc): split helper handlers and support`
- [x] Commit 3: `chore: cleanup imports and verify lint/typecheck`

## Größere Architektur-TODOs (aus Refactor-Plan)
- [ ] Updater-/Peer-Services weiter zerlegen (`state/source/transfer` klar trennen).
- [ ] Weitere große Renderer-Container in kleinere Feature-Hooks/Views aufteilen.
- [ ] Test-Suiten weiter fachlich trennen und Stabilität in Multi-Client-Szenarien erhöhen.
