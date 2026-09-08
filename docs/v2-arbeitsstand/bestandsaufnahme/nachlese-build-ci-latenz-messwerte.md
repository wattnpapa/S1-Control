# Nachlese: Build-, CI- und Latenz-Messwerte (Electron vs. Tauri, SMB-Share)

Key: nachlese-build-ci-latenz-messwerte
Stand: 2026-09-07, Bearbeitung laufend. Diese Datei wird nach jedem Teilthema fortgeschrieben.

## Gliederung

1. Fragestellung und Vorgehen
2. Messumgebung (Entwicklungsmaschine)
3. Electron-CI (build-main.yml): Dauer der vier Jobs je Push
4. Electron lokal: `npm run build` (renderer + main + native rebuild)
5. Playwright-BDD-Szenarien: Laufzeit `npm run test:e2e`
6. Tauri/Rust lokal (bmecatEditor): Kalt-/Warmbau Debug und Release
7. bmecatEditor-CI (falls vorhanden): Vergleich
8. SMB-Roundtrip-Zeiten auf dem realen Share: Quellenlage, Ersatzmessungen, Experimentvorschlag
9. Zusammenfassung: Kostenvergleich Entwicklungs-/CI-Zeit, vertretbare Poll-Intervalle
10. Offene Fragen

## 1. Fragestellung und Vorgehen

(wird befüllt)

## 1. Fragestellung und Vorgehen

Gefragt sind harte Messwerte für die Kostenseite der Stack-Entscheidung Electron vs. Tauri: (a) Dauer der Electron-CI je Push (vier Build-Jobs), (b) lokaler Electron-Build, (c) Laufzeit der Playwright-BDD-Szenarien, (d) Kalt-/Warmbau von `src-tauri` (Debug/Release) auf der Entwicklungsmaschine, (e) SMB-Roundtrip-Zeiten auf dem realen Share. Vorgehen: (a) aus der GitHub-Actions-Historie per `gh run view --json jobs` abgelesen (13 Läufe, davon 10 erfolgreich); (b)–(d) auf dieser Maschine mit `time` gemessen; (e) es ist kein SMB-Share gemountet (`mount | grep smb` leer, Stand 2026-09-07 12:06), daher nur Ersatzmessungen und Experimentvorschlag.

## 2. Messumgebung (Entwicklungsmaschine)

- Apple M5 Pro, 15 Kerne (5 P + 10 E laut `hw.perflevel0/1.physicalcpu`), 48 GiB RAM (`hw.memsize` 51539607552), APFS auf SSD, macOS 26.5.2 (Build 25F84).
- Toolchain: cargo/rustc 1.97.1, node v26.8.1, npm 11.19.0, gh 2.87.3 (eingeloggt als `wattnpapa`).
- Störfaktor: Load Average zu Messbeginn 6,06 / 5,86 / 7,00 (andere Prozesse aktiv; parallel laufende Analyse-Agenten). Alle lokalen Zeiten sind deshalb eher Obergrenzen; Netzstrom, Akku 100 %.
- Kein SMB/CIFS/NFS/AFP-Mount vorhanden → Punkt (e) nicht direkt messbar.

## 3. Electron-CI (`.github/workflows/build-main.yml`): Dauer der Jobs je Push

Quelle: `gh run list --workflow build-main.yml --limit 25` und `gh run view <id> --json jobs` (Job-Start/-Ende, Schritte ≥ 20 s), Repo `/Users/johannes/Developer/S1-Control`, abgerufen 2026-09-07. Letzter Lauf ist vom 2026-06-07 (Commit bcf15c6); seitdem keine Pushes auf `main`.

### 3.1 Zehn erfolgreiche Läufe (Job-Dauern in Sekunden)

| Run-ID | Datum | prepare | test | build-linux | build-linux-arch | build-mac | build-win | release | Wand-Zeit gesamt (createdAt→updatedAt) |
|---|---|---|---|---|---|---|---|---|---|
| 27095828799 | 2026-06-07 14:49 | 4 | 36 | 121 | 150 | 179 | 234 | 21 | 5:08 |
| 27089455079 | 2026-06-07 10:06 | 4 | 38 | 127 | 143 | 172 | 265 | 45 | 6:06 |
| 27088980550 | 2026-06-07 09:44 | 5 | 30 | 127 | 139 | 184 | 244 | 21 | 5:12 |
| 27088734199 | 2026-06-07 09:32 | 5 | 35 | 136 | 164 | 182 | 243 | 25 | 5:20 |
| 27088075195 | 2026-06-07 09:01 | 6 | 35 | 125 | 157 | 199 | 222 | 37 | 5:14 |
| 23382358864 | 2026-03-21 15:05 | 5 | 35 | 132 | 141 | 187 | 226 | 22 | 5:01 |
| 23382121097 | 2026-03-21 14:51 | 4 | 41 | 140 | 128 | 222 | 239 | 38 | 5:36 |
| 22807732374 | 2026-03-07 21:36 | 6 | 30 | 127 | 138 | 230 | 234 | 22 | 5:05 |
| 22807559706 | 2026-03-07 21:25 | 7 | 32 | 136 | 129 | 209 | 286 | 19 | 5:58 |
| 22807155225 | 2026-03-07 21:01 | 4 | 34 | 120 | 134 | 239 | 251 | 31 | 5:32 |
| **Median** | | **5** | **35** | **127** | **140** | **193** | **239** | **24** | **≈5:16** |
| Spanne | | 4–7 | 30–45 | 120–140 | 128–164 | 172–239 | 222–286 | 19–45 | 5:01–6:06 |

Ablauf (aus den Zeitstempeln): `prepare` → `test` (seriell, zusammen ≈ 45 s) → vier Build-Jobs **parallel** (Start innerhalb 1 s) → `release` nach dem langsamsten Build. Kritischer Pfad = `build-win` (Median 239 s). Wand-Zeit je Push: **5:01 bis 6:06 min, Median ≈ 5:16 min**.

Schrittanteile (nur in Läufen ab Juni 2026 aufgelöst): `Build Windows artifacts` 161–185 s, `Build macOS artifacts` 139–159 s (inkl. Signierung/Notarisierung), `Build Linux artifacts` 97–108 s, `Build Arch Linux artifacts (pacman)` 91–121 s; `Install dependencies` (npm ci) 22–41 s je Runner; `Install Arch packaging tools` 22 s.

Summe der Job-Laufzeiten je erfolgreichem Lauf (Runner-Minuten): ≈ 745–905 s ≈ **12,5–15 Runner-Minuten** je Push (davon macOS ≈ 3–4 min, Windows ≈ 4–5 min).

### 3.2 Fehlgeschlagene Läufe (Kontext)

- 27095343919 (e2fbb7c, 2026-06-07 14:29): build-linux/-arch/-mac nach 27–42 s abgebrochen, build-win lief 242 s durch → Fehler früh im Build-Schritt (Lint/Typecheck), Windows-Job erkennt ihn offenbar nicht als fatal; nächster Commit bcf15c6 „fix(lint): remove unused readError import" behebt es.
- 27022162439 (7798a4f, 2026-06-05): build-mac scheiterte nach 40 s, manueller Re-Run am 2026-06-06 17:35 ebenfalls; Folge-Commit ed68271 „fix(ci): add macOS certificate validity check" → Signing-Problem, nicht Build-Dauer.
- 26950628066 (b423a9d, 2026-06-04): drei Builds nach 28–45 s gescheitert, build-win 259 s erfolgreich – gleiches Muster.
- Von 25 gelisteten Läufen sind 13 `failure`; die März-Fehler brechen nach 30–60 s ab (Testphase). Fehlerläufe kosten damit ≈ 1–5 min Wand-Zeit, kein Build-Overhead.

### 3.3 Einordnung

- Der bmecat-Bericht (R4) schätzte „heute Electron ~5 min" – **bestätigt** (Median 5:16 Wand-Zeit).
- Der Electron-Build ist auf allen vier Runnern **ohne Rust-Kompilat**: Node-Install 22–41 s + `npm run build` + electron-builder-Packaging. Der Kern des Zeitbedarfs liegt bei electron-builder (Download der Electron-Binaries, Packaging, Signierung/Notarisierung auf macOS, NSIS auf Windows).
