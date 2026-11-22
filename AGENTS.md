# S1-Control – Architektur- und Arbeitsregeln für Coding-Agents

Dieses Dokument ist verbindlich für alle automatisierten Code-Änderungen in diesem Repository.
Ziel: robuste Multi-Client-Einsatzführung ohne Architekturdrift.

## 1. Prioritäten (in Reihenfolge)

1. Einsatzbetrieb darf nicht gefährdet werden (Datenintegrität > Feature-Speed).
2. Multi-Client auf Fileshare muss stabil bleiben.
3. Architekturgrenzen strikt einhalten.
4. Änderungen klein, testbar und nachvollziehbar halten.

## 2. Architektur (verbindlich)

- `src/main/**`:
  - einzige Schicht mit DB-Zugriff, Datei-I/O, Netzwerk, Updater, Locking.
- `src/preload/**`:
  - nur freigegebene IPC-Brücke, keine Business-Logik.
- `src/renderer/src/**`:
  - reine UI/State-Orchestrierung, keine DB-Queries, kein direkter FS/Netzwerk-Zugriff.
- `src/shared/**`:
  - kanal- und typstabile Verträge zwischen Main/Renderer.

### Verboten

- SQL, Drizzle, `better-sqlite3` oder Dateisystemzugriff im Renderer.
- Business-Entscheidungen in Preload.
- Nebenläufige Schreibpfade ohne Transaktion.
- „Schnelle Workarounds“, die Architekturgrenzen verletzen.

## 3. DB- und Fileshare-Regeln

- Einsatzdatei-Endung: `.s1control` (Legacy öffnen bleibt erlaubt).
- Jeder Einsatz = eigene DB-Datei (atomar).
- DB-Open muss immer diese Pragmas setzen:
  - `journal_mode=WAL`
  - `synchronous=NORMAL`
  - `foreign_keys=ON`
  - `busy_timeout=5000`
- Jeder Write in expliziter Transaktion.
- Archivierte Einsätze sind read-only (Main-seitig enforced).
- Sperr-/Heartbeat-/Client-Tabellen müssen fehlertolerant gegen SMB-Latenzen sein.

## 4. Multi-Client, Locking, Sync

- Mehrere Clients dürfen schreiben; Master ist nur für Housekeeping (Backups/Cleanup).
- Datensatz-Bearbeitungssperren sind Pflicht (Einheit/Fahrzeug/Abschnitt).
- Nach erfolgreichem Write:
  - lokale Aktualisierung
  - UDP-Sync-Broadcast senden
  - Polling-Fallback intakt halten
- Bei Broadcast-Ausfall darf Funktionalität nicht brechen.

## 5. Updater-Regeln

- Updater darf niemals Kernfunktionen blockieren.
- Peer/LAN-Update nur mit Hash-/Signatur-Validierung.
- Internet-Fallback muss immer verfügbar bleiben.
- Fehlermeldungen nutzerklar, kein Stacktrace-Spam in der UI.

## 6. Strukturgrenzen für neuen Code

Diese Grenzen gelten für **neu geschriebene oder stark geänderte Dateien**:

- max. 400 Zeilen pro Datei
- max. 80 Zeilen pro Funktion
- max. Komplexität 10
- max. 4 Parameter pro Funktion

Wenn bestehender Legacy-Code größer ist:
- nur im betroffenen Scope schrittweise aufteilen,
- keine Big-Bang-Rewrites.

## 7. Refactor-Strategie (anti-chaos)

- Immer vertikal schneiden (Feature-Ende-zu-Ende), nicht quer durch alles gleichzeitig.
- Erst extrahieren, dann Verhalten unverändert halten, dann vereinfachen.
- Jede neue Helper-Datei hat klaren Zwecknamen.
- Keine toten Wrapper oder doppelte Adapter zurücklassen.

Pflicht bei größeren Umbauten:

1. Kleine Commit-Slices (kompilierbar).
2. Nach jedem Slice: `typecheck`, `lint`, relevante Tests.
3. Öffentliche IPC-Signaturen nur additiv ändern.

## 8. Testregeln

- Neue Features immer mit Tests (Unit/Service, bei UI-Logik auch Renderer-Tests).
- Bugfixes reproduzierbar mit Regressionstest absichern.
- Mindeststandard vor Abschluss:
  - `npm run typecheck`
  - `npm run lint`
  - betroffene Tests
- Bei Core-Änderungen (DB, Sync, Updater, Locking): `npm run test` + Coverage prüfen.

## 9. UI-Regeln

- Sprache Deutsch, korrekt mit Umlauten.
- Platzsparende Bedienung beibehalten (Icon-Actions, tabellarisch).
- Sidebar nur dort anzeigen, wo sie funktional notwendig ist.
- Stärke-/Zeit-Monitor: dynamische Schriftanpassung, keine abgeschnittenen Werte.

## 10. Commit-/Push-Regeln

- Kleine, thematisch saubere Commits.
- Commit-Typen:
  - `feat(...)`, `fix(...)`, `refactor(...)`, `test(...)`, `chore(...)`, `docs(...)`
- Keine gemischten „Alles-in-einem“-Commits.
- Vor Push sicherstellen:
  - Working tree konsistent
  - keine offensichtlichen Build-/Lint-Brüche

## 11. Definition of Done

Ein Task gilt erst als fertig, wenn:

1. Verhalten wie gefordert umgesetzt ist.
2. Architekturgrenzen eingehalten sind.
3. Tests/Checks grün sind (mindestens lokal für den betroffenen Scope).
4. Dokumentation angepasst ist (`README.md`/dieses Dokument bei Regeländerung).
5. Der Demo-Einsatz das Neue zeigt (§13).

## 12. Migrationshinweis

- `agends.md` ist Altbestand.
- Dieses `AGENTS.md` ist die aktuelle, verbindliche Quelle.

## 13. Demo-Einsatz

- Der Knopf „Demo-Einsatz" der Einsatzauswahl legt einen Einsatz an, der zwölf Stunden vor jetzt beginnt und alle Funktionen mit Beispieldaten zeigt.
- **Jedes neue Feature erweitert das Demo-Drehbuch im selben Zug** (`apps/desktop/src/worker/demo/`, Einstieg `demoeinsatz.ts`). Ein Feature ohne Daten im Demo-Einsatz ist nicht fertig.
- Das Drehbuch besteht aus Bedienschritten der Schrittbauer unter `apps/desktop/src/kontrakt/` und läuft über `Aktendienst.bediene`; es schreibt nichts am Dienst vorbei.
- Zeiten sind Minuten seit Einsatzbeginn, nie feste Uhrzeiten oder Daten.
- Der Demo-Einsatz bleibt ohne abgewiesenen Schritt und ohne Konflikthinweis; ein Teil der Lage bleibt offen (Nachricht vor dem Sichter, offene Anforderung).
- `demoeinsatz.test.ts` erzwingt die Abdeckung: Jede Ereignisart des Katalogs kommt im Demo-Einsatz vor oder steht dort begründet in `AUSNAHMEN`.
