# Nachlese: Speichermodell-Widerspruch auflösen (bmecat-Portierung vs. NAS-Ereignisprotokoll vs. s1-main-Neuentwurf)

Key: nachlese-speichermodell-widerspruch-aufloesen
Stand: in Arbeit (Zwischenstände werden nach jedem Teilthema eingetragen)

## Gliederung

0. Aufgabenstellung und Quellenlage
1. Was die drei Berichte tatsächlich sagen (Zitat + Fundstelle)
2. Ist-Modell im Code (connection.ts, file-lock.ts, einsatz-store.ts, Repro lost-update.ts)
3. Prüfung: Widerlegen die SMB-Eigenschaften (nas §1) den bmecat-Portierungsvorschlag?
   3.1 Nicht-atomare Stale-Übernahme
   3.2 Client-Uhren
   3.3 FileNotFound-Cache 5 s
   3.4 Fehlendes fsync
   3.5 Rename-EBUSY
4. Entscheidung: Welche Empfehlung gilt, warum
5. Überführung eines v1-.s1control-Snapshots in das Zielmodell
   5.1 Befund zu schemaVersion 1 / writeSeq
   5.2 Import-Event / Initial-Snapshot
   5.3 Parallelbetrieb alt/neu auf demselben Share
6. Was nur ein Experiment auf einem echten SMB-Share klären kann
7. Offene Fragen

## 0. Aufgabenstellung und Quellenlage

(wird befüllt)

Der Vollständigkeitskritiker (vollstaendigkeitskritik.md §3.6 Punkt 1, §5 Gap 4) meldet einen substanziellen Widerspruch zwischen drei Berichten zur Frage, welches Speichermodell S1-Control v2 auf einem SMB-Share ohne Serverprozess verwenden soll. Zu klären sind drei Dinge:

(a) Welche der drei Empfehlungen gilt und warum.
(b) Ob die in nas-speicher-recherche.md §1 belegten SMB-Eigenschaften (nicht-atomare Stale-Übernahme, Client-Uhren, FileNotFound-Cache 5 s, fehlendes fsync, Rename-EBUSY) den Portierungsvorschlag aus bmecat-stack-muster.md widerlegen.
(c) Wie ein bestehender v1-`.s1control`-Snapshot (schemaVersion 1, writeSeq nicht monoton) in das gewählte Modell überführt wird, inklusive Parallelbetrieb alt/neu auf demselben Share.

Gelesene Quellen (vollständig in den genannten Abschnitten): nas-speicher-recherche.md §0–§1, §3, §4, §8–§12; bmecat-stack-muster.md §8.0–§8.2, §9, §10; s1-main-architektur.md §3c, §4.5, §8–§11; vollstaendigkeitskritik.md §3.4–§5; Code `src/main/db/connection.ts` (61 Z.), `src/main/json-store/file-lock.ts` (77 Z.), `src/main/json-store/einsatz-store.ts` (60 Z.); Reproduktion `scratchpad/repro/lost-update.ts` (25 Z.) samt Ergebnisordner `share-9963ZQ/`.

Web-Recherche wurde nicht neu durchgeführt; alle SMB-Aussagen stützen sich auf die in nas §1 bereits zitierten Primärquellen (Microsoft-Dokumentation, man-pages, SQLite-Doku, MS-SMB2-Spezifikation). Wo ich darüber hinaus argumentiere, ist das mit [unbelegt] gekennzeichnet.

## 1. Was die drei Berichte tatsächlich sagen (Zitat + Fundstelle)

### 1.1 bmecat-stack-muster.md – Position „Portieren + CAS"

- **§8.0 (Zeile 273):** „Für S1: Einsatzdatei (JSON/CBOR) auf dem Share bleibt Wahrheit; ein lokaler SQLite-Cache wäre nur nötig, falls Abfragen/Historie groß werden." Begründet mit dem bmecatEditor-Muster „Quelle auf dem Share + lokaler SQLite-Index/Cache im App-Data, validiert über Größe/mtime (`matches_source`)".
- **§8.1 M5:** `AppState` soll ein `Mutex<Option<OpenEinsatz>>` halten mit „Pfad, letzte `writeSeq`, letzte mtime, geparste Daten" – also weiterhin ein In-Memory-Snapshot der ganzen Datei.
- **§8.1 M16:** Schema-Versionierung nach bmecat-`storage.rs`-Muster „für das JSON-Schema: `schemaVersion` + `migrate(v) -> v+1`-Kette mit Tests je Stufe; S1 hat heute `schemaVersion: 1` (`einsatz-store.ts:48`) und keine Migrationen mehr."
- **§8.1 M19:** `matches_source` „umdeuten: Änderungserkennung auf dem Share per Polling (size, mtime, `writeSeq`) — Watcher auf SMB sind unzuverlässig."
- **§8.2 Zeile „rusqlite auf der Share-Datei":** „**nicht übernehmen** – S1-Historie + SQLite-Doku".
- **§9 R9 (Kern des Widerspruchs):** „Rust ändert nichts an SMB-Semantik: `fd-lock`/`fs2` sind advisory und über SMB genauso unzuverlässig wie SQLite-Locks. … Heutiges S1-Modell (Lockdatei `wx`, Stale-Timeout, tmp+rename, `writeSeq`, UDP-Signal, Presence-Heartbeat) **1:1 in `s1-store`/`s1-net` portieren**; zusätzlich optimistische Konflikterkennung (`writeSeq` beim Schreiben prüfen, `Conflict`-Fehler an UI)."
- **§9 R10:** Polling „(1–2 s: size, mtime, `writeSeq` aus Dateikopf) + UDP-Broadcast wie heute".
- **§9 R14:** „Dateiformat beibehalten (JSON, gleiche Endung `.s1control`), `schemaVersion`-Migration nach M16; alter Client darf neue Dateien erkennen und ablehnen (Versionsfeld zuerst prüfen)."
- **§9 Gesamteinschätzung:** Tauri „löst aber **keines** der harten S1-Probleme (SMB-Locking, Sync, Offline-Update) — die liegen im Dateiformat und im Netzprotokoll und müssen in Rust neu implementiert werden, **wo sie heute in TS funktionieren und getestet sind** (190 Unit-Tests, 10 BDD-Szenarien)."

Wichtig für die Einordnung: Der bmecat-Bericht hat den Lost-Update-Befund (s1-main §3c, Repro) **nicht** gekannt; seine Aussage „wo sie heute in TS funktionieren und getestet sind" ist durch die Reproduktion widerlegt (siehe §2). Der Bericht argumentiert aus der Portierungsperspektive (bmecatEditor-Muster → S1) und hat die SMB-Eigenschaften aus nas §1 nicht analysiert – das stellt die Kritik in §3.6 Punkt 1 selbst fest.

### 1.2 nas-speicher-recherche.md – Position „Option C→E, Events als Wahrheit"

- **§3 Bewertung:** Option B (JSON+Lockfile) „Konsistenz: schlecht (Lost Update strukturell) … Reparatur der Semantik (Re-Read vor Write, `writeSeq`-Vergleich, atomarer Steal, fsync) ist Pflicht, wenn Option B bleibt." Und das **Restrisiko**: „Selbst repariert bleibt ein Single-Document-Modell mit globalem Lock: jeder Schreibvorgang serialisiert alle Clients über ein netzweites Lock mit Timing-Annahmen (10 s/5 s/60 s), und der Lock ist wegen Client-Uhren und SMB-Caches nicht sauber definierbar. Für 2–4 Clients mit seltenen Schreibvorgängen ‚meist' funktionsfähig, aber nicht robust gegen genau die Störfälle (Netzabbruch, Absturz, falsche Uhr), die die Aufgabe fordert."
- **§9 Matrix, Gesamturteil B:** „nur als Übergang, mit Fixes"; **C:** „Empfehlung"; **E:** „Empfohlene Ausbaustufe von C".
- **§10:** „Option C (Append-only Ereignisprotokoll, ein Schreiber je Datei, HLC-Ordnung, deterministischer Fold mit fachlichen Konfliktregeln), ausgebaut zu E". Begründung 1: „Es ist die einzige Option, bei der **keine** der belegten SMB-Schwächen … den Schreibpfad berührt: Jeder Client schreibt ausschließlich eigene Dateien, ohne Lock, ohne Replace-Rename, mit `fsync`." Und: „Die Speicherfrage ist **stack-neutral**; sie spricht weder für noch gegen Tauri."
- **§10 Restrisiken 1–5:** Regelwerk-Vollständigkeit, Sichtbarkeitsverzögerung 10 s, Schema-Evolution der Events, Client-Identität (Image-Klon → Multi-Writer), Snapshot-Korrektheit.
- **§11:** Dateilayout: `einsaetze/<ordner>/{einsatz.json, events/<clientId>.<seg>.jsonl, snapshots/, presence/, attachments/, archive.marker}`; Regel „Nur Create-New und Append."
- **§12:** Offene Fragen u.a. NAS-Modell, Client-OS, NTP, Event-Katalog.

### 1.3 s1-main-architektur.md – Position „Neu machen, stack-unabhängig"

- **§3c KERNBEFUND:** 15 `.save()`-Aufrufer, `mutateEinsatzFile` null Aufrufer; „Es gibt keinen Codepfad, der `ctx.einsatz` nach dem Öffnen jemals von der Platte aktualisiert". Konsequenz: „Der Mehrbenutzerbetrieb ist damit in der aktuellen JSON-Store-Fassung auf Datenebene nicht funktionsfähig … In der vorherigen SQLite-Fassung (bis f0a5fec, 2026-05-31) las jeder Request die DB → dort trat das Problem nicht auf; der Umstieg hat es eingeführt."
- **§9 R-DATA-1 (K), R-DATA-2 (K), R-LOCK-1…6, R-SYS-1…3, R-DATA-5 (kein fsync).**
- **§10 „Neu machen":** „Persistenz- und Nebenläufigkeitsmodell vollständig neu. Mindestanforderungen: (a) jeder Write liest den aktuellen Dateistand **oder arbeitet append-only**, (b) Konflikterkennung (writeSeq/Version-CAS **oder Ereignis-Log je Client**), (c) Leser sehen fremde Änderungen ohne Neuöffnen, (d) flüchtige Daten (Präsenz, Sperren) getrennt von Stammdaten und Fachdaten, idealerweise je Client eigene Datei statt geteilter RMW-Datei, (e) atomare, verifizierte Schreibvorgänge (tmp+fsync+rename, danach Re-Read/Größenprüfung), (f) alle I/O außerhalb des UI-/Main-Threads." Datei-Lock: „entweder ganz vermeiden (append-only, ein Schreiber je Datei) oder mit O_EXCL-only, Halter-Prüfung beim Freigeben, Fencing-Token, konservativem Stale-Fenster und Uhren-unabhängiger Logik."
- **§10 Bewertung:** „ein Rust-Kern nimmt die I/O zuverlässig vom UI-Thread und macht O_EXCL/fsync/Verify explizit, löst aber das Konsistenzmodell nicht von selbst."

Befund: s1-main §10 lässt **beide** Wege offen („oder"), formuliert aber Mindestanforderungen, die das heutige Modell in keinem Punkt erfüllt. s1-main widerspricht nas also nicht, sondern ist die Anforderungsliste, an der beide Alternativen zu messen sind. Der eigentliche Widerspruch besteht nur zwischen bmecat R9 („1:1 portieren + CAS") und nas §10 („C→E").

### 1.4 Wo sich alle drei einig sind

1. Keine SQLite-Datei auf dem Share (bmecat §8.2, nas §2/§9 „ausgeschlossen", s1-main §10).
2. Änderungserkennung nur per Polling, UDP nur Beschleuniger (bmecat R10, nas §8.1, s1-main §10 „Sync-Signal").
3. Alle Share-I/O aus dem UI-/Main-Thread heraus (bmecat M11/M14, nas §8.3, s1-main R-MAIN-1).
4. Die Speicherfrage entscheidet nicht über Electron vs. Tauri (bmecat §9 Gesamteinschätzung, nas §10 Stack-Hinweis, s1-main §10 Bewertung).
5. `schemaVersion`-basierte Migration und Ablehnung unbekannter Versionen durch alte Clients (bmecat M16/R14; nas Restrisiko 3 „schemaVersion je Event, Mindestversion je Einsatz im Manifest").

## 2. Ist-Modell im Code und Reproduktion

Codebelege (unverändert auf main @ bcf15c6, Working Tree nur Prettier-Änderungen laut Kritik §3.6 Punkt 2):

- `src/main/db/connection.ts:52-58` – `save()` erhöht `ctx.einsatz.writeSeq` aus dem **In-Memory-Wert** (`(ctx.einsatz.writeSeq ?? 0) + 1`, Z. 54) und schreibt `ctx.einsatz` unter `withFileLock`; `writeSystemFile(sysPath, ctx.system)` (Z. 57) **außerhalb** des Locks.
- `src/main/db/connection.ts:24-31` – nicht-JSON-Datei wird durch leeres Skelett **überschrieben** (Kommentar Z. 28 „e.g. old SQLite file").
- `src/main/json-store/einsatz-store.ts:19-23` – `writeEinsatzFile`: `writeFileSync(tmp)` + `renameSync(tmp, filePath)`, **kein `fsyncSync`** (grep über `src/main` nach `fsync`: keine Treffer laut s1-main R-DATA-5).
- `src/main/json-store/einsatz-store.ts:25-36` – `mutateEinsatzFile` (Read-Modify-Write unter Lock, `writeSeq` aus dem **gelesenen** Dateiwert) existiert, hat aber laut s1-main §3c null Aufrufer außerhalb des json-store.
- `src/main/json-store/einsatz-store.ts:48-49` – `schemaVersion: 1`, `writeSeq: 0` im Skelett.
- `src/main/json-store/file-lock.ts:17-35` – `tryAcquire`: `writeFileSync(lockFile, …, { flag: 'wx' })` (Z. 20, atomar); bei Fehlschlag Lesen des Inhalts, Vergleich `Date.now() - existing.acquiredAt > LOCK_STALE_MS` (Z. 25, **zwei verschiedene Client-Uhren**), dann `writeFileSync(lockFile, …)` **ohne `wx`** (Z. 27, nicht atomar, keine Verifikation).
- `file-lock.ts:4-6` – `LOCK_STALE_MS = 10_000`, Retry 50 ms, `LOCK_TIMEOUT_MS = 5_000`.
- `file-lock.ts:46` – `Atomics.wait` blockiert den Main-Thread bis 5 s (Sync-Variante).
- `file-lock.ts:51-55, 71-75` – `unlinkSync(lockFile)` im `finally` ohne Prüfung, ob der Lock noch der eigene ist.

Reproduktion (`scratchpad/repro/lost-update.ts`, ausgeführt laut Kritik §3.4 mit vite-node gegen unveränderten Code; Ergebnisordner `share-9963ZQ/` liegt vor): zwei `openDatabaseWithRetry`-Kontexte auf derselben Datei; A speichert Einheit A1 → Datei `writeSeq=1, [A1]`; B sieht in-memory `[]`; B speichert B1 → Datei `writeSeq=1, [B1]`. A1 ist weg, **und `writeSeq` bleibt 1**, weil B seinen In-Memory-Zähler `0+1` zurückschreibt. Das ist genau der in der Frage genannte Befund „writeSeq 1→1".

Konsequenz für die Bewertung von bmecat R9: Ein „1:1 portieren" würde ein Modell portieren, das im Mehrbenutzerbetrieb nachweislich Daten verliert. Die von R9 vorgeschlagene Ergänzung „`writeSeq` beim Schreiben prüfen" setzt zwingend voraus, dass **vor** jedem Schreiben der Dateistand gelesen wird (Re-Read) – das ist heute nicht der Fall und wäre keine Ergänzung, sondern ein anderer Schreibpfad (nämlich `mutateEinsatzFile` statt `ctx.save()`). Die Kritik §3.4 hat das ebenfalls festgehalten: „ein späterer ‚writeSeq vergleichen'-Fix müsste zuerst ein Re-Read einführen."
