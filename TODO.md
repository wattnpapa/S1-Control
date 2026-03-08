# S1-Control Architektur-TODO

## 1) Utility-Prozess-Auslagerung abschließen
- [x] 1a: Locking-Operationen an DB-Utility delegieren (mit Fallback)
- [x] 1b: Write-Operationen (Abschnitt/Einheit/Fahrzeug/Helfer) an DB-Utility delegieren (mit Fallback)
- [x] 1c: Command-Write-Pfade (Move/Split/Undo) an DB-Utility delegieren
- [x] 1d: Housekeeping (Backup/Cleanup/Presence-Wartung) vollständig über low-priority Lane im Utility

## 2) SLO-Messungen automatisieren
- [x] DevTools öffnen p95 < 500ms
- [x] Einsatz öffnen (First Paint) p95 < 1.5s
- [x] Stärke-Monitor öffnen p95 < 1s

## 3) Updater-Observability
- [ ] Feingranulare Timings pro Update-URL/Phase (API/Web/HTTPS-Fallback) loggen
- [ ] Timeouts reproduzierbar in Tests absichern

## 4) Repo-Hygiene
- [ ] `test-results/` bereinigen oder gezielt ignorieren
