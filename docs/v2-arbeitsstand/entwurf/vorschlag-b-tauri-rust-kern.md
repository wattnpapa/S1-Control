# Vorschlag B – Tauri 2 + Rust-Kern-Crates ("bmecatEditor-Muster konsequent")

Stand: ABGESCHLOSSEN – §1–§10 vollständig
Key: vorschlag-b-tauri-rust-kern
Blickwinkel: bmecatEditor-Muster konsequent, aber jede Empfehlung dieses Musters gegen die NAS-Recherche geprüft.

Belegkonvention: `bmecat §x` = bmecat-stack-muster.md, `nas §x` = nas-speicher-recherche.md, `main §x` = s1-main-architektur.md, `renderer §x` = s1-renderer-features.md, `historie §x` = s1-historie-qualitaet.md, `hb §x` = excel-handbuch-anforderungen.md, `dom §x` = excel-domaenenmodell.md, `vba §x` = excel-vba-workflows.md, `kritik §x` = vollstaendigkeitskritik.md, `nachlese-*` = die vier Nachlese-Berichte. `[Annahme]` markiert eigene, unbelegte Setzungen.

## Gliederung
1. Leitidee und Abgrenzung
2. Stack und Prozessmodell
3. Speicher- und Sync-Modell auf dem NAS-Share
4. Fachliches Zielmodell in Grundzügen
5. Modul-/Repo-Struktur auf dem neuen Branch
6. Ausgaben
7. Test- und Qualitätsstrategie
8. Meilensteine bis Excel-Parität
9. Risiken mit Gegenmaßnahmen
10. Was Johannes noch entscheiden/liefern muss

---

## 1. Leitidee und Abgrenzung

### 1.1 Die These in einem Satz
Der Kern von S1-Control v2 ist eine **UI-freie Rust-Bibliothek**, die aus einem append-only Ereignisprotokoll auf dem NAS-Share deterministisch ein Lagebild faltet; Tauri 2 und React sind austauschbare Hüllen darum, und genau deshalb wird der Kern zuerst und ohne Fenster gebaut.

### 1.2 Was daran anders ist als bei den Alternativen

| Gegenüber | Unterschied dieses Vorschlags |
|---|---|
| **v1 (Electron + JSON-Ganzdatei)** | Kein „Datei = In-Memory-Snapshot"-Modell mehr. Wahrheit sind Ereignisse; der Zustand ist eine Ableitung. Damit entfällt der reproduzierte Lost-Update-Pfad (kritik §3.4, nachlese-speichermodell §2) strukturell, nicht durch einen Fix. |
| **Einer reinen Electron-Neuauflage mit gleichem Speichermodell** | Der Kern ist eine eigene Sprache/Artefaktgrenze. Was in TS eine Konvention ist („Renderer macht kein I/O", AGENTS.md §1–2, von der Implementierung verletzt, main §10), wird zur Compile-Grenze: `s1-model`/`s1-store` können `tauri` gar nicht importieren. Zusätzlich: Property-Tests über den Fold, ein CLI, das dieselbe Bibliothek benutzt, und I/O grundsätzlich außerhalb des UI-Threads. |
| **bmecat §8.3 (Ausgangspunkt)** | Verzeichnisbaum und Muster M1–M35 werden weitgehend übernommen, **aber drei Empfehlungen werden verworfen**: (a) R9 „Lockfile-Modell 1:1 portieren" → ersetzt durch Ereignisprotokoll (§3.2); (b) M5 `Mutex<Option<OpenEinsatz>>` mit „geparsten Daten der ganzen Datei" → ersetzt durch `Mutex<Projektion>` + Event-Reader-Task; (c) §8.2 „S1-Renderer bleibt weitgehend" → der Renderer wird neu geschnitten (kritik §3.6 Punkt 7: 150-Props-Drilling, 91 Typfehler, 0 Komponententests). |
| **Einem „v1 + Persistenzreparatur"-Weg** | Excel-Parität ist das Ziel, nicht v1-Parität. v1 deckt laut kritik §3.1 etwa die Hälfte der Excel-Felder ab; Ressourcenplanung/Ablösung, Schicht, Logistik, Kosten, FüSt-Personal und sechs von acht Ausgabeprodukten fehlen ganz. Das Datenmodell wird deshalb aus dom §8 abgeleitet, nicht aus `json-store/types.ts`. |

### 1.3 Fünf Leitentscheidungen (Kurzfassung, Begründung in den jeweiligen Abschnitten)
1. **Ereignisprotokoll statt Lockfile** (§3.2). Der Widerspruch bmecat R9 ↔ nas §10 wird zugunsten von nas entschieden.
2. **Kein Lock, keine Uhrenabhängigkeit, kein Master-Client.** Jeder Client schreibt ausschließlich eigene Dateien; Ordnung über HLC, nicht über Wanduhr (§3.7).
3. **EEB-Codec bleibt TypeScript** und wird aus erfassungsbogen.app geteilt; nur das Mapping `Erfassungsbogen → S1-Ereignisse` wird in Rust gebaut (§4.6, §5.4). Ein Rust-Port des Codecs wird ausdrücklich abgelehnt.
4. **Kein Peer-Update über LAN mehr; stattdessen Update über denselben Share** mit Minisign-Prüfung (§2.6). Das streicht ~920 TS-Zeilen aus v1 (main §10 „weglassen") und nutzt das Medium, das ohnehin da ist.
5. **Ausgaben werden im Rust-Kern erzeugt** (HTML/XLSX/CSV aus der Projektion), nicht im Renderer (§6). Damit sind Ausdrucke auch aus `s1-cli` und aus dem Hintergrund-Task (HTML-Monitor F-K6) erzeugbar und in CI testbar.

### 1.4 Wofür dieser Vorschlag *nicht* die beste Wahl ist – ehrlich
- Wenn Excel-Parität in unter ~6 Monaten Kalenderzeit erreicht sein muss und Johannes nur Abende hat: der Rust-Weg kostet gegenüber demselben Entwurf in reinem TypeScript nach meiner Schätzung **+20 bis +35 % Bauzeit** (§8.5) – im Wesentlichen durch die Doppelgrenze Rust↔TS, Borrow-Checker über Thread-Grenzen (bmecat R5, sichtbar am `fn`-Pointer-Trick in `lib.rs:211-213`) und den E2E-Werkzeugwechsel (bmecat R6).
- Wenn Linux-Clients (WebKitGTK) gleichrangig unterstützt werden müssten: drei Engines statt einer (bmecat R2). Der Auftrag setzt Windows-FüSt als primär, macOS/Linux nachrangig – damit ist das Risiko klein.
- Der Speichermodell-Nutzen kommt **nicht** von Rust (nas §10 Stack-Hinweis: „Die Speicherfrage ist stack-neutral"). Wer diesen Vorschlag wählt, wählt Rust wegen Typsicherheit im Fold, Property-Tests, CLI, Ressourcen und der Compile-Grenze – nicht, weil SMB dadurch besser würde.

### 1.5 Wo der Rust-Weg echten Mehrwert bringt (die Gegenrechnung)
1. **Fold als Property-Test-Ziel.** `proptest` über Permutationen nebenläufiger Ereignisfolgen ist in Rust Standardhandwerk und deckt genau das Restrisiko 1 aus nas §10 („Regelwerk-Vollständigkeit") ab. In TS ginge das mit `fast-check` auch, aber die algebraischen Typen (Summentypen mit erschöpfendem `match`) machen den Ereigniskatalog in Rust überhaupt erst erschöpfend prüfbar – ein neuer Ereignistyp bricht den Build, nicht erst einen Test.
2. **`s1-cli` im Einsatz.** Ein einzelnes Binary, das ohne UI eine Einsatzakte prüft (`s1 doctor`), faltet (`s1 export`), migriert (`s1 migrate`) und Mehrclient-Last simuliert (`s1 sim`), ist im Einsatzstress ein Diagnosewerkzeug, das v1 nicht hat. Mit Node bräuchte es eine Laufzeitumgebung auf dem FüSt-Rechner.
3. **I/O nie im UI-Thread.** v1 blockiert den Main-Thread bis 5 s per `Atomics.wait` im Lock (`file-lock.ts:46`, nachlese-speichermodell §2). In Rust ist der Share-Task ein eigener Thread mit Timeouts; das ist keine Disziplinfrage mehr.
4. **Ressourcen.** Zwei Fenster ohne zweiten Chromium-Prozessbaum; der Stärke-Monitor läuft auf schwacher FüSt-Hardware.
5. **Typgrenze zur UI generiert.** `tauri-specta` erzeugt `bindings.ts` aus den Rust-Typen (bmecat M21: bmecatEditor pflegt `api.ts`+`types.ts` von Hand – das ist der Fehler, den man nicht kopiert).

---

## 2. Stack und Prozessmodell

### 2.1 Laufzeit und Sprachen
| Schicht | Technik | Begründung/Beleg |
|---|---|---|
| Prozess | Ein Tauri-2-Prozess (Rust) + WebView je Fenster | Tauri 2.11.5 ist aktueller Stand (nachlese-tauri §2.1); bmecatEditor läuft auf demselben Stand → Spike-Basis vorhanden |
| Kern | Cargo-Workspace, Crates ohne `tauri`-Abhängigkeit | bmecat M1 |
| Frontend | React 19 + TypeScript + Vite, zwei Einstiege (`index.html`, `monitor.html`) | bmecat §8.3 |
| IPC | `tauri-specta` → generiertes `src/bindings.ts` (Commands **und** Events typisiert) | bmecat M21 (ersetzt Handpflege) |
| Fehler | `thiserror`-Enum im Kern, serialisierbares `ApiError` an der Tauri-Grenze | bmecat M3/M4 – ausdrücklich **nicht** `Result<_, String>` |
| Zeit | `uhlc` (HLC) für Ordnung, `time` für Anzeige | nas §1.10, §10 |
| Log | `tracing` + `tauri-plugin-log` in Datei je Einsatz | bmecat R3 |
| Einstellungen | `tauri-plugin-store` (`settings.json`) | ersetzt `settings-store.ts` |

Rust-Version: 1.97.1 ist installiert (nachlese-build §2). Node 26.8.1 für Vite/Tests.

### 2.2 Fenster
Zwei Fenster, beide im `setup()`-Hook erzeugt (nicht in einem synchronen Command – Windows-Deadlock, dokumentiert in nachlese-tauri §2.4):

| Fenster | Label | Einstieg | Eigenschaften |
|---|---|---|---|
| Hauptfenster | `main` | `index.html` | normal, `window-state`-Plugin merkt Größe/Position |
| Stärke-Monitor | `monitor` | `monitor.html` | `visible(false)` beim Start, `decorations(false)`, `resizable(false)`, `skip_taskbar(true)`, `background_color(#000)`; Position/Größe **nach** dem Bau per `set_position(PhysicalPosition)` / `set_size(PhysicalSize)` aus `available_monitors()` |

Monitorwahl: erster Monitor, dessen `position()` ≠ `primary_monitor().position()`, sonst Primär. Tauri-`Monitor` hat keine numerische ID (nachlese-tauri §2.4), deshalb Vergleich über Position/Name statt über `id` wie heute (`strength-display.ts:146`).

Belegt (nachlese-tauri §2.2/§2.3): Issue #14019 ist **Wayland-spezifisch und für Windows/macOS nicht einschlägig**; der echte S1-Fall (Fenster direkt auf dem Zweitmonitor erzeugen) war auf macOS bis 2.10.x defekt (#12167) und ist seit **Tauri 2.11.0** gefixt (PR #15250). **Mindestversion `tauri >= 2.11.0` ist damit eine harte Projektvorgabe.** Offen und Spike-Pflicht (nachlese-tauri §2.5): gemischte DPI-Skalierung (Issue #6843, offen), Ab-/Anstecken des Monitors zur Laufzeit, randlos über der Taskleiste ohne `fullscreen`.

Zustandsweg Hauptfenster → Monitorfenster: **kein** direkter JS-Weg (zwei getrennte Kontexte, bmecat R8). Das Monitorfenster abonniert dasselbe Backend-Event wie das Hauptfenster (`lage:projektion-geaendert`) und liest per `invoke("monitor_kennzahlen")`. Damit ist der Monitor beim Neustart sofort korrekt – die Prewarm-/Splash-Akrobatik aus v1 (`strength-display.ts:120-128, 193-201`) entfällt (main §10 „weglassen").

### 2.3 Prozessmodell innerhalb des Rust-Prozesses
```
Haupt-Thread (Tauri/UI-Events)
 ├─ AppState { lage: RwLock<Projektion>, offen: Mutex<Option<EinsatzHandle>>, flags: AtomicBool… }
 ├─ Command-Handler: lesen aus RwLock (billig) oder schicken Ereignisse an den Schreib-Task
 ├─ Schreib-Task  (1 Thread je offenem Einsatz)   -> hängt Ereignisse an die EIGENE lokale Datei an,
 │                                                    fsync, dann Spiegelung auf den Share (Append ab Offset)
 ├─ Lese-Task     (1 Thread)                      -> Poll 2 s: readdir + read-at-offset fremder Dateien,
 │                                                    faltet neue Ereignisse in die Projektion,
 │                                                    emit `lage:projektion-geaendert`
 ├─ Netz-Task     (1 Thread, tokio)               -> UDP 41235: „ich habe angehängt" (Beschleuniger),
 │                                                    Presence-Datei alle 10 s
 └─ Ausgabe-Task  (on demand / Timer)             -> HTML-Monitor-Export F-K6, Backups, Snapshots
```
Regeln (bmecat M7–M14 übernommen): kein Mutex über einen langen Lauf halten; `WorkerGuard` (RAII) mit Rückgabe des Flags **vor** dem Abschluss-Event; Fortschritt gedrosselt auf 150 ms (M13); Worker öffnen ihre eigenen Dateihandles.

### 2.4 Build
- `cargo build` / `cargo tauri dev` lokal; Workspace-Profile wie bmecat (`lto="thin"`, `codegen-units=1` nur im Release; Dev-`opt-level=3` für `calamine`, `zip`, `flate2` – bmecat M34).
- Frontend `tsc && vite build`, zwei Rollup-Einstiege.
- Messwerte zur Erwartungshaltung: Kern-Crates von bmecatEditor kalt 26,7 s / warm 1,06 s (kritik §3.7); Tauri-Debug-Kaltbau ~4 min (aus bmecat-Doku übernommen, **nicht gemessen** – nachlese-build §6 war zum Zeitpunkt der Lektüre noch nicht befüllt). Electron-CI heute: Median **5:16 min** Wandzeit, 12,5–15 Runner-Minuten je Push, kritischer Pfad `build-win` 239 s (nachlese-build §3.1, 10 erfolgreiche Läufe). Für Tauri ist mit **10–20 min je Plattform** zu rechnen (bmecat R4, [Annahme]) – der Alltagspreis liegt also eher bei „CI dauert 3× so lange", nicht bei „Build unbenutzbar".

### 2.5 Installer für Windows offline
- `bundle.windows.webviewInstallMode = { type: "fixedRuntime", path: "webview2/Microsoft.WebView2.FixedVersionRuntime.<ver>.x64/" }` (bmecat R1). Größe +~180 MB; Installer landet damit in derselben Größenordnung wie heute Electron.
- Begründung gegen `offlineInstaller` (+~127 MB): Evergreen-WebView2 kann sich im Feld eigenständig aktualisieren; im Einsatz ist ein reproduzierbarer Renderer mehr wert als 50 MB. Gegen `downloadBootstrapper`/`embedBootstrapper`: brauchen Internet – im Einsatznetz nicht vorhanden (hb N-1).
- Der Fixed-Runtime-Cab wird **nicht** ins Repo gelegt (LFS-Ballast), sondern im CI-Job von der Microsoft-URL geladen und gecacht; lokal einmalig unter `webview2/` (gitignored). Offen: ob `tauri-action` das ohne Zusatzschritt mitnimmt (bmecat §10 Frage 4, Spike-Punkt).
- Zusätzlich ein **MSI/NSIS-Silent-Schalter** dokumentieren, damit die FüSt-Rechner per USB-Stick in einem Rutsch installiert werden können. [Annahme: keine Softwareverteilung im THW-FK vorhanden.]

### 2.6 Auto-Update – inklusive Weg für Rechner ohne Internet
Zwei Wege, ein Schlüssel, ein Artefaktsatz:

| Weg | Technik | Wann |
|---|---|---|
| **Internet** | `tauri-plugin-updater` gegen `latest.json` in den GitHub-Releases | Vorbereitung zu Hause / OV-Netz |
| **Share** (neu, ersetzt Peer-Update) | Eigener Rust-Prüfschritt: `\\NAS\S1-Control\update\latest.json` + Artefakt im selben Ordner, Signatur mit `minisign-verify` gegen den **einkompilierten öffentlichen Schlüssel** geprüft, dann Installer per `opener` starten und App beenden | Im Einsatznetz |

Begründung für den Ersatz des LAN-Peer-Updaters: v1 hat dafür ~796 + 123 Zeilen in 7 Dateien (main §10 „weglassen"), UDP-Discovery + HTTP-Serve + Transfer, und der Updater dominiert schon heute die Testmasse (historie §5). Der Share ist ohnehin die gemeinsame Infrastruktur, ist offline verfügbar, braucht keinen Serverprozess und keine Firewallregel. Der Signaturweg bleibt identisch (Minisign), damit ist der Share **kein** zusätzlicher Vertrauensanker: eine manipulierte Datei auf dem NAS wird abgelehnt.

Versionsschema: `tauri-plugin-updater` vergleicht SemVer, das S1-Schema `YYYY.MM.DD.HH.MM` ist keines (bmecat R11). v1 hat dafür bereits `BUILD_SEMVER` (`build-main.yml:27`) und `updater-versioning.ts` mit dem Datums-Vergleich (main §10 „übernehmen") – das wird nach Rust portiert (~120 Zeilen inkl. Tests) und deckt den in `ffa14f8` behobenen Fall „zwei Builds am selben Tag" mit ab.

Schlüsselhaltung: `TAURI_SIGNING_PRIVATE_KEY` als CI-Secret **und** im Passwortmanager; Verlust = keine Updates mehr für installierte Clients (bmecat R11). Als Rückfalllinie liest der Share-Updater eine zweite, „Notfall"-Public-Key-Variante mit. [Annahme; Aufwand ~0, Nutzen groß.]

### 2.7 Was aus dem bmecat-Muster bewusst NICHT übernommen wird
- `csp: null` und `assetProtocol.scope: ["**"]` (bmecat M33/R12) → CSP gesetzt, Asset-Scope auf Einsatzordner + App-Data.
- Eine globale `App.css` mit 3.437 Zeilen als E2E-Anker (M24) → CSS je Komponente, `data-testid`.
- Handgepflegte `api.ts`/`types.ts` (M21) → generiert.
- `Result<_, String>` in Commands (M4) → typisierte Fehler, weil Mehrbenutzerkonflikte im UI unterschieden werden müssen.
- Bitbucket-Pipeline (M32) → GitHub Actions bleibt.

---

## 3. Speicher- und Sync-Modell auf dem NAS-Share

### 3.1 Anforderungen, an denen gemessen wird
Aus main §10 (Mindestanforderungen a–f), nas §10 und hb N-1/N-2/N-3/N-6: kein Serverprozess; 2–4 gleichzeitige Clients (FüSt + Meldeköpfe), lesende Tablets; Offline-Betrieb bei NAS-Ausfall; keine verlässlichen Uhren; Nachvollziehbarkeit (ETB); Datenverlust ist der schlimmste Fehler, Sichtbarkeitsverzögerung von Sekunden ist tolerierbar.

### 3.2 ENTSCHEIDUNG zum Widerspruch: Ereignisprotokoll, nicht Lockfile-Portierung

**Entschieden wird für nas §10 (Option C, ausgebaut zu E) und gegen bmecat §9 R9 („heutiges Modell 1:1 portieren + optimistische Konflikterkennung").**

Begründung, in der Reihenfolge der Beweiskraft:

1. **R9 argumentiert auf einer widerlegten Prämisse.** bmecat §9 begründet die Portierung damit, dass die Mechanismen „heute in TS funktionieren und getestet sind (190 Unit-Tests, 10 BDD-Szenarien)". Das ist falsch: Der Schreibpfad verliert im Mehrclientbetrieb nachweislich Daten (kritik §3.4, Reproduktion `scratchpad/repro/lost-update.ts`: Datei `writeSeq=1,[A1]` → `writeSeq=1,[B1]`, A1 verschwindet). nachlese-speichermodell §1.1 stellt ausdrücklich fest, dass der bmecat-Bericht diesen Befund nicht kannte. Portiert würde also ein defektes Modell.
2. **Die vorgeschlagene Ergänzung ist keine Ergänzung.** R9 will „`writeSeq` beim Schreiben prüfen". Das setzt ein Re-Read vor jedem Schreiben voraus, das es heute nirgends gibt (`ctx.save()` schreibt den In-Memory-Stand, main §3c: „Es gibt keinen Codepfad, der `ctx.einsatz` nach dem Öffnen jemals von der Platte aktualisiert"). Der „portierte" Pfad wäre in Wahrheit ein neu geschriebener Pfad (`mutateEinsatzFile` statt `ctx.save()`, das heute null Aufrufer hat). Die Ersparnis der Portierung ist damit weitgehend eingebildet.
3. **Der Lock selbst ist auf SMB nicht sauber definierbar.** `file-lock.ts:20` erwirbt atomar (`wx`), aber die **Stale-Übernahme in Zeile 25–27 vergleicht `Date.now()` des einen Rechners mit `acquiredAt` des anderen und schreibt dann ohne `wx`** – zwei Clients können denselben stale Lock gleichzeitig übernehmen (nas §1.2/§1.4, nachlese-speichermodell §2). Ohne NTP im Einsatznetz (offen, §10.1) ist das nicht reparierbar, nur eingrenzbar. Dazu: kein `fsync` (main R-DATA-5), Rename-EBUSY auf SMB, FileNotFound-Cache 5 s, `unlinkSync` im `finally` ohne Halterprüfung (`file-lock.ts:51-55`).
4. **Ein globaler Lock skaliert fachlich schlecht, nicht technisch.** Bei 2–4 Clients wäre der Durchsatz kein Problem – aber jede Schreiboperation serialisiert über ein netzweites Lock mit Timing-Annahmen (10 s Stale / 5 s Timeout / 45 s Record-Lock / 2 min Presence, main §4.5). Genau diese Annahmen brechen bei den Störfällen, für die das System gebaut wird: Netzabbruch, Absturz, falsch gestellte Uhr (nas §3).
5. **Das Ereignisprotokoll ist fachlich ohnehin gefordert.** hb N-6 (Nachvollziehbarkeit, unlöschbare Meldekopf-Historie, Archivbereich), hb F-E3 (Meldekopf führt eigenes ETB, das Teil des FüSt-ETB ist), hb F-L2 („ein Nachfolger sollte echtes Undo/Änderungsprotokoll bieten"). Ein Append-only-Log liefert ETB, Undo, Audit und Backup als Nebenprodukt. Beim Lockfile-Modell wären das vier zusätzliche Bauteile.
6. **Es ist der einzige Entwurf, dessen Korrektheit ohne Netz testbar ist.** Gleiche Ereignismenge → gleicher Zustand ist eine Eigenschaft, die `proptest` prüft. „Lock funktioniert über SMB" ist keine testbare Eigenschaft, sondern eine Hoffnung über fremde Server-Implementierungen (Synology/QNAP/Windows-Server – unbekannt, §10.1).

**Was von R9 trotzdem übernommen wird** (der Bericht hat in Teilen recht):
- Änderungserkennung per **Polling**, nicht per Watcher (R10, nas §1.8): `notify` nur für lokale Pfade.
- **UDP-Broadcast als Beschleuniger**, nicht als Wahrheitsquelle (R10, main §10). Port 41235 wie heute, Wire-Format neu.
- **Presence-Heartbeat** – aber als *eigene Datei je Client*, nicht als geteilte RMW-Datei (main §10 (d)).
- **`schemaVersion` + Migrationskette mit Test je Stufe** (M16) – angewandt auf Ereignisse statt auf ein Gesamtdokument.
- **Atomares tmp+fsync+rename** – aber nur noch für Dateien, die **einem einzigen Client gehören** (Presence, Snapshot, lokaler Offset-Stand). Für Fremdclientdateien gibt es keinen Schreibpfad mehr, also auch keine Rename-Kollision.

**Was ersatzlos entfällt:** globale Lockdatei, Stale-Übernahme, `writeSeq` als globaler Zähler, Master-Client-Wahl, Record-Locks mit TTL 45 s (→ ersetzt durch unverbindliche Bearbeitungshinweise, §3.6), `Atomics.wait` im UI-Thread.

### 3.3 Dateilayout
Übernommen aus nas §11 mit drei Präzisierungen (fett):

```
\\NAS\S1-Control\
  manifest.json                       # {formatVersion, mindestClientVersion}; create_new durch den ersten Client
  einsaetze\
    2026-09-06_hochwasser-oldenburg_7f3a\
      einsatz.json                    # unveränderlich: {einsatzId, ordnerName, erstelltVon, erstelltAm, formatVersion}
      events\
        c-9b12ef-fuest1.000001.jsonl  # genau ein Schreiber; <clientId>.<segment>.jsonl
        c-9b12ef-fuest1.000002.jsonl  # neues Segment bei >8 MB oder bei App-Neustart
        c-44d0a3-meldekopf1.000001.jsonl
      snapshots\
        20260906T141233Z-c-9b12ef.json   # unveränderlich; enthält versionVektor + blake3-Hash
      presence\
        c-9b12ef-fuest1.json          # nur der Eigentümer schreibt; rein informativ
      anhaenge\
        <blake3>.pdf                   # EEB-Scans u.ä., unveränderlich, inhaltsadressiert
      archiv.marker                    # create_new; danach nimmt der Fold keine neuen Ereignisse mehr an
  archiv\
    2026-08-12_uebung-ammerland_1c9e.zip
  stammdaten\
    stan-thw-2025.json  stan-kats-nds-2026.json  fw-nds-2026.json
  update\
    latest.json  S1-Control_2026.09.14.19.05_x64-setup.exe  *.sig     # §2.6
```

**Präzisierung 1 – Segmentwechsel bei jedem App-Start.** Damit ist ausgeschlossen, dass zwei Prozesse desselben Clients (Doppelstart trotz `single-instance`, Absturz mit hängendem Handle) in dieselbe Datei anhängen. Der Segmentname wird per `create_new` in einer Schleife (000001, 000002, …) gefunden – der erste Erfolg gewinnt, ohne Lock.

**Präzisierung 2 – Datei sofort anlegen, auch leer.** Der Client legt seine Segmentdatei beim Öffnen des Einsatzes an, nicht erst beim ersten Ereignis. Grund: Neue *Dateien* unterliegen dem Windows-Directory-Cache (bis 10 s, nas §1.3), neue *Bytes* in einer bekannten Datei nicht, wenn man mit `read` ab Offset statt mit `stat` arbeitet (nas §10 Restrisiko 2). Nach der einmaligen Entdeckung eines Clients ist dessen weitere Latenz nur noch die Poll-Periode.

**Präzisierung 3 – `presence/` ersetzt `_system.json` vollständig.** Benutzer/Rollen/Stammdaten wandern in Ereignisse; flüchtige Daten (wer ist online, welche IP, welche Version, welcher Lesestand) sind pro Client eine überschreibbare eigene Datei. Damit gibt es keine geteilte Read-Modify-Write-Datei mehr (main §10 (d), R-SYS-1..3).

### 3.4 Ereigniszeile und Ereigniskatalog
Zeilenformat (nas §11): `<len>\t<crc32>\t<json>\n`, nach jedem Ereignis `sync_all()`. Leser verwerfen eine unvollständige oder crc-falsche letzte Zeile und lesen sie beim nächsten Poll erneut.

```json
{"id":"c-9b12ef:000123","hlc":"7B9…","wall":"2026-09-06T14:12:33+02:00",
 "akteur":{"benutzer":"jr","rolle":"S1","host":"FUEST1"},
 "typ":"EinheitVerschoben","v":1,
 "payload":{"einheitId":"…","nachAbschnittId":"…","position":3},
 "kompensiert":null,"prev":"<blake3-8>"}
```

Ereignistypen (Erstkatalog, `s1-model::Ereignis` als Rust-Enum; erschöpfendes `match` im Fold erzwingt Vollständigkeit):

| Bereich | Typen |
|---|---|
| Einsatz | `EinsatzAngelegt`, `EinsatzStammdatenGeaendert`, `KostenparameterGeaendert`, `EinsatzArchiviert` |
| Abschnitt/Einsatzstelle | `AbschnittAngelegt`, `AbschnittUmbenannt`, `AbschnittUmgehaengt`, `AbschnittReihenfolgeGeaendert`, `AbschnittSichtbarkeitGeaendert`, `AbschnittAufgeloest` |
| Einheit | `EinheitAngelegt`, `EinheitFelderGeaendert`, `EinheitVerschoben`, `EinheitStatusGesetzt`, `EinheitSchichtGesetzt`, `EinheitStaerkeGesetzt`, `EinheitLogistikGesetzt`, `EinheitGeteilt`, `EinheitZusammengefuehrt`, `EinheitBeendet` |
| Fahrzeug/Helfer | `FahrzeugAngelegt`, `FahrzeugGeaendert`, `FahrzeugUmgehaengt`, `FahrzeugEntfernt`, `HelferAngelegt`, `HelferGeaendert`, `HelferEntfernt` |
| Ressourcenplanung | `AnforderungAngelegt`, `AbloesungAngefordert`, `ZusageErfasst`, `AbloesungZugeordnet`, `EintreffenErfasst`, `RueckfuehrungErfasst` |
| FüSt-Personal | `DienstpostenBesetzt`, `SchichtplanEintragGesetzt` |
| EEB/Meldekopf | `EebBogenImportiert`, `EebDateiVerknuepft`, `MeldungEingegangen`, `MeldungUebernommen`, `MeldungZurueckgestellt` |
| Journal/ETB | `EtbEintragErfasst`, `EreignisKompensiert` |
| Technik | `SchemaHinweis` (Client meldet höhere Schemaversion), `UnbekanntesEreignis` (Leseseite, nie geschrieben) |

`EinheitFelderGeaendert` trägt eine **Feldmenge**, nicht die ganze Einheit – das ist der Kern der Konfliktvermeidung: Zwei Clients, die gleichzeitig Bemerkung und Status derselben Einheit ändern, kollidieren nicht.

### 3.5 Fold-Regeln in Grundzügen
1. **Ordnung:** Sortierung nach HLC, bei Gleichstand nach `clientId` (lexikografisch). Deterministisch und uhrenunabhängig – die Wanduhr steht nur zur Anzeige im Ereignis (`wall`).
2. **Feldebene, Last-Writer-Wins:** je Entität und je Feld gewinnt das Ereignis mit der höheren HLC. Kein CRDT-Zähler für Stärken: Fü/UFü/He sind Absolutwerte, die ein Mensch meldet; „Addieren" wäre fachlich falsch.
3. **Verschieben:** LWW auf `abschnittId`. Zielabschnitt inzwischen aufgelöst → Einheit landet im Systemabschnitt `Nicht zugeordnet` **und** es entsteht ein Konflikthinweis in der Projektion (nicht im Log – Hinweise sind ableitbar, keine Ereignisse).
4. **Löschen/Auflösen:** Es gibt kein hartes Löschen. `AbschnittAufgeloest` ist ein Grabstein; enthaltene Einheiten werden auf den Elternabschnitt gehoben. `EinheitBeendet` verschiebt in den Archivbereich (Excel: „Einsatz beendet", hb F-F5), löscht nichts. Das deckt hb F-E2 („Meldekopf-Einträge werden nicht gelöscht") mit ab.
5. **Teilen/Zusammenführen:** `EinheitGeteilt{quelleId, neueId, staerkeAnteil}` erzeugt die neue Einheit implizit. Wird die Quelle nebenläufig beendet, bleibt der Split gültig; Konflikthinweis.
6. **Idempotenz:** Ereignis-`id` ist `<clientId>:<laufnummer>`; ein zweimal gelesenes Ereignis wird verworfen. Damit ist ein Wiedereinspielen (Backup, Doppelspiegelung) unschädlich.
7. **Kompensation statt Rücknahme:** `EreignisKompensiert{zielId, begruendung}` ist das Undo (hb F-L2). Der Fold wendet das kompensierte Ereignis nicht an, es bleibt aber im ETB sichtbar. Undo je Benutzer/Client, wie main §10 fordert.
8. **Unbekannte Typen** werden **durchgereicht und angezeigt** („unbekanntes Ereignis, neuere Programmversion"), nie stillschweigend verworfen (nas §10 Restrisiko 3). Zusätzlich `manifest.json.mindestClientVersion` als harte Sperre, wenn ein Formatbruch unvermeidbar ist.
9. **Projektion ist verwerfbar.** Snapshots tragen Versionsvektor + blake3-Hash; ein Leser, der einen Snapshot lädt, prüft stichprobenartig gegen Neufaltung (nas §10 Restrisiko 5).

### 3.6 Was aus den Sperren von v1 wird
Record-Locks mit TTL 45 s (`record-lock.ts:8`) entfallen. Ersatz: **unverbindlicher Bearbeitungshinweis** aus der Presence-Datei („FUEST1 bearbeitet gerade Einheit X, seit 12 s"). Er blockiert nichts. Begründung: Ein verbindlicher Lock über SMB ist aus denselben Gründen nicht sauber implementierbar wie der Dateilock (§3.2 Punkt 3), und die Feldebenen-LWW macht ihn fachlich entbehrlich – der reale Konfliktfall (zwei Menschen tippen gleichzeitig dieselbe Bemerkung derselben Einheit) ist bei 2–4 Clients selten und durch den Hinweis ausreichend entschärft. [Annahme über die reale Kollisionshäufigkeit; belegbar erst mit den Betriebsparametern aus §10.1.]

### 3.7 Uhren ohne NTP
- **Ordnung**: HLC (`uhlc`-Crate, nas §1.10). Eine falsch gestellte Uhr verschiebt die Ordnung, zerstört aber weder Determinismus noch Daten – jeder Client faltet dieselbe Reihenfolge.
- **Keine TTL-Logik mehr**: kein Stale-Lock, kein Master, kein Record-Lock-Ablauf. Damit gibt es keinen Mechanismus mehr, der fremde Zeitstempel *vergleicht, um etwas zu übernehmen*. Das war der gefährlichste Uhrenfall (nas §1.2).
- **Uhrenschieflage sichtbar machen**: Beim Lesen fremder Ereignisse vergleicht der Client `wall` mit der eigenen Uhr; Abweichung > 120 s → Warnbanner „Uhr von MELDEKOPF1 weicht um 14 min ab; Zeitstempel im ETB können irreführen". Kostet ~30 Zeilen und rettet die Nachvollziehbarkeit im ETB.
- **HLC-Drift begrenzen**: `uhlc` lehnt Ereignisse mit absurder Zukunftszeit ab (konfigurierbares Delta, Vorschlag 10 min); solche Ereignisse werden angenommen, aber mit korrigierter HLC neu eingeordnet und markiert. [Annahme zur konkreten Ausgestaltung.]

### 3.8 Sichtbarkeitslatenz – was Johannes zusagen kann
| Fall | Erwartung |
|---|---|
| Änderung eines anderen Clients, UDP kommt an | < 1 s |
| UDP blockiert (Firewall, VLAN) | ≤ 2 s Poll + SMB-Leselatenz |
| **Neuer** Client tritt bei | einmalig bis ~10 s (Directory-Cache, nas §1.3) |
| NAS kurz weg | eigene Arbeit ungestört; fremde Änderungen erscheinen nach Rückkehr gebündelt |

Im UI ehrlich anzeigen: „Stand vom Share: vor 3 s · 2 weitere Clients online · 1 Client seit 4 min nicht erreichbar". Das ersetzt die heutige Illusion, alle sähen dasselbe.

### 3.9 Offline-Betrieb bei NAS-Ausfall
Der Normalpfad ist bereits offline: geschrieben wird **immer zuerst lokal** (`%APPDATA%\S1-Control\einsaetze\<ordner>\events\…`), die Share-Spiegelung ist ein zweiter, wiederholbarer Append ab Offset. Fällt der Share aus:
- Der Client arbeitet unverändert weiter, `upload-state.json` merkt den letzten übertragenen Offset.
- Der Lese-Task markiert alle fremden Clients als „nicht erreichbar" und zeigt den Stand-Zeitpunkt.
- Bei Rückkehr wird ab Offset nachgeschoben; Konvergenz ist garantiert, weil jeder nur eigene Dateien anhängt.
- **Kein Merge-Dialog, kein Datenverlust, kein Sonderfall im Code.** Das ist der Hauptgewinn gegenüber jedem Lock-Modell, in dem „Share weg" ein Fehlerpfad ist.
- Grenzfall „NAS kommt nie zurück": `s1 export --lokal` erzeugt aus dem lokalen Log eine vollständige Einsatzakte (§6).

### 3.10 Backup, Archiv, Export der Einsatzakte
- **Backup** ist trivial, weil nichts überschrieben wird: stündlich (und bei Einsatzende) kopiert der Client, der die Rolle `FüSt` hat, den Einsatzordner nach `\\NAS\S1-Control\backup\<ordner>\<zeitstempel>\`. Rotation: 24 stündliche, 14 tägliche. v1 hatte Backup alle 5 min **ohne Rotation** (main §10) – das entfällt.
- **Archiv**: `archiv.marker` (create_new) friert den Einsatz ein; `s1 archiv <ordner>` bzw. der UI-Befehl erzeugt `archiv\<ordner>.zip` mit `events/`, `snapshots/`, `anhaenge/`, allen Ausgaben (§6) und einer `manifest.json` mit blake3-Hashes je Datei. Erst nach verifiziertem Hash-Vergleich wird der Ordner verschoben.
- **Export**: `s1 export --format xlsx|csv|html|pdf` faltet und schreibt (§6). Weil der Export im Kern liegt, ist er in CI gegen Referenzdateien testbar – anders als der heutige ZIP-Export mit UUIDs statt Namen (kritik §3.1).

### 3.11 Migration bestehender `.s1control`-Dateien
`s1 migrate --von alt.s1control --nach \\NAS\S1-Control\einsaetze\<neu>`:
1. Liest v1-JSON (`schemaVersion: 1`, `einsatz-store.ts:48`). `writeSeq` wird **ignoriert** – er ist nachweislich nicht monoton (kritik §3.4).
2. Schreibt genau **ein** Segment `c-migration-<hash>.000001.jsonl` mit: `EinsatzAngelegt`, dann pro Abschnitt/Einheit/Fahrzeug/Helfer je ein `…Angelegt` mit allen Feldern, dann die vorhandenen `einheitBewegungen` als `EinheitVerschoben` in Originalreihenfolge mit ihren Originalzeitstempeln (HLC aus dem Zeitstempel synthetisiert), zuletzt `SchemaHinweis{quelle:"v1", dateiHash}`.
3. Akteur aller Migrationsereignisse: `{benutzer:"migration", host:"<cli>"}` – im ETB als solche erkennbar.
4. Die Altdatei wird **nicht** verändert und nicht gelöscht.

**Parallelbetrieb alt/neu:** ausgeschlossen und das ist Absicht. v1 und v2 nutzen unterschiedliche Verzeichnisstrukturen (`*.s1control`-Einzeldatei vs. `einsaetze/<ordner>/`); ein v1-Client kann einen v2-Einsatz nicht öffnen und würde ihn auch nicht überschreiben. Umgekehrt liest v2 v1-Dateien nur über `migrate`. Betrieblich: **Stichtagsumstellung je Einsatz**, nicht gemischt. Warnung, die in die Doku gehört: v1 überschreibt beim Öffnen jede Datei, die es nicht als eigenes JSON erkennt (`connection.ts:24-31`, main R-DATA-4) – ein alter Client darf nie auf eine v2-Datei gezeigt werden.

### 3.12 Migration der Excel-Mappe
Crate `s1-import` mit `calamine` (bmecat M35: die Leseschicht ist wiederverwendbar, Staging/Profile/Dry-Run aus `table_import.rs` sind überdimensioniert):
- Liest die benannten Bereiche (`Führungsstelle`, `Meldekopf_FüSt_BR_1/2`, `Sonstiges_Führung`, `Logistik`, `Angefordert`, `Bereitstellung_1/2`, `Einsatzort_1..21`) und daraus die Zeilen des Blatts `Stärke` (dom §8.1) – **nicht** feste Zeilennummern, weil die Bereiche verschoben werden können.
- Bildet Spalten B..AW auf die Felder aus dom §9 ab, Stammdaten C4/C5/C6 auf den Einsatz, AQ3/AS3/AT3/AV3 auf die Kostenparameter.
- Enum-Abbildung Organisation (Excel 12 Werte) und Status (9 Werte) nach §4.3; unbekannte Werte werden zu `Sonstige` + Bemerkungstext, nie verworfen.
- Blatt `FüSt` (Dienstposten × Tag/Nacht, Schichtplan) → `DienstpostenBesetzt` / `SchichtplanEintragGesetzt`.
- Ergebnis ist derselbe Ereignisstrom wie bei der v1-Migration. `s1 import-excel --pruefen` gibt einen Bericht aus (wie viele Zeilen, welche Felder leer, welche Enums abgebildet), bevor geschrieben wird.
- Offen: ob überhaupt **gefüllte** Mappen realer Einsätze existieren oder nur die Vorlage (kritik §3.7, §10.1). Wenn nur die Vorlage: `s1-import` wird zu einem Einmalwerkzeug für die **Kopiervorlagen** (Stärke!Z.25–121, THW 46 / FW 4 / KatS Nds ~40) und die AküLi – das lohnt sich trotzdem.

---

## 4. Fachliches Zielmodell in Grundzügen

Grundlage ist dom §8 (Excel-Zielmodell), nicht `json-store/types.ts`. Wo v1 fachlich reicher ist (Abschnitt-Hierarchie, Fahrzeug- und Helfer-Entität, taktische Zeichen), gewinnt v1; wo die Excel reicher ist (Ressourcenplanung, Schicht, Logistik, Kosten, FüSt-Personal, Statusfeinheit), gewinnt die Excel (kritik §3.1).

### 4.1 Entitäten (Crate `s1-model`)

| Entität | Herkunft | Kernfelder (gekürzt) |
|---|---|---|
| `Einsatz` | dom §8.1 + v1 | `name`, `fuestName`, `uebergeordneteFuestName`, `kostenparameter{psaSatz, vdaProTag, ukProTag, geplanteEinsatztage}`, `eebOrdner`, `istUebung` |
| `Abschnitt` | v1-Baum **+** Excel-Bereichstypen | `id`, `elternId`, `name`, `typ`, `position`, `sichtbar`; `typ ∈ {FUEHRUNGSSTELLE, MELDEKOPF, SONSTIGES_FUEHRUNG, LOGISTIK, ANGEFORDERT, BEREITSTELLUNGSRAUM, EINSATZORT, ARCHIV_BEENDET, NICHT_ZUGEORDNET}` |
| `Einheit` | dom §8.1 vollständig | siehe §4.2 |
| `Fahrzeug` | v1 (Excel hat nur Freitext Spalte J) | `name`, `kennzeichen`, `funkrufname`, `stanKonform`, `sondergeraet`, `nutzlast`, `einheitId` |
| `Helfer` | v1 + EEB | `nachname`, `vorname`, `staerkeRolle{FUE,UFUE,MANNSCHAFT}`, `geschlecht{M,W,D}`, `ernaehrung{FLEISCH,VEGETARISCH,VEGAN}`, `funktionen[]`, `fahrerlaubnis[]`, `kontakte[]`, `qualifikationen[]` |
| `Anforderung` | Excel F-F1/F-F3, in v1 **nicht vorhanden** | `anforderungsId` (extern vergeben), `angefordertAm`, `zugesagtFuer`, `zugesagtVon`, `vorgeseheneEinheit`, `vorgesehenerAuftrag`, `abzuloesendeEinheitId`, `abloesendeEinheitId` |
| `Dienstposten` | Excel-Blatt FüSt (F-I1) | `teileinheit{STAB,ZTR_FK,FGR_F,FGR_K,EXTERNE}`, `funktion`, `schicht`, `besetzungFue/Ufue/He` |
| `SchichtplanEintrag` | Excel F-I2 | `dienstpostenId`, `datum`, `personText` |
| `EtbEintrag` | hb F-E3, N-6 | abgeleitet aus dem Ereignislog + freie Einträge |
| `Meldung` | hb F-E1/E2/E4/E5 | eingegangener EEB-Bogen oder Meldekopf-Datensatz, Zustand `{NEU, UEBERNOMMEN, ZURUECKGESTELLT}` |
| `Kopiervorlage` | Excel F-J1 (`stammdaten/`) | `katalog{THW_STAN, KATS_NDS, FEUERWEHR}`, `bezeichnung`, `zug/trupp/gruppe`, `standardFahrzeuge[]` |

### 4.2 Einheit – Feldgruppen (Excel-Spalten in Klammern)
- **Zuordnung**: `abschnittId`, `position`, `istFuehrungsstelleDesAbschnitts` (B; in v1 fehlend, kritik §3.1)
- **Bezeichnung**: `bezeichnung` (C), `organisation` (D), `herkunft`/`ovName` (E) + v1-Zusatzfelder `ovTelefon/Fax`, `rbName`, `lvName`
- **Taktische Gliederung**: `zug` (F), `truppStaffel` (G), `gruppe` (H), `person` (I) **und** v1-`tacticalSignConfig` (typ/Zeichen/Inferenz). Beides parallel: die vier Textspalten sind die Meldeform der Excel, die Zeichenkonfiguration die Darstellungsform. Die Inferenz füllt letztere aus ersterer.
- **Mittel**: `fahrzeuge[]` (statt Freitext J), `auftragstext` (K)
- **Ressourcenplanung**: `erreichbarkeiten` (L), `verfuegbarBis` (M), `anforderungId` → `Anforderung` (N–S), `eingetroffenAm` (T), `einsatzendeAm` (U), `rueckfuehrungAm` (V)
- **Zustand**: `status` (Z, 9 Werte), `schicht` (AA), `bemerkung` (W)
- **EEB**: `eebDateiRef` (AB), `eebBogenId` (digital), `eebStand`
- **Logistik**: `anzahlWeiblich` (AC), `anzahlDivers` (AD), `vegetarisch` (AE), `vegan` (AF), `uebernachtungM/W/D` (AG–AI). `maennlich` ist abgeleitet (`gesamt − w − d`, Log!I7).
- **Stärke**: `fue` (AJ), `ufue` (AK), `he` (AL); `gesamt` abgeleitet (AM). Regel aus v1 übernehmen: taktische Stärke F/UF/M/G mit Summenprüfung (`tactical-strength.ts`, main §10).
- **Kosten**: `psaProTag` (AO); `psaBedarf`, `psaGesamtProTag`, `kostenPsa`, `kostenVdaUk`, `gesamtkosten` sind **abgeleitet** (dom §8.1) und liegen nicht im Modell, sondern in der Projektion.

### 4.3 Enumerationen und ihre Abbildung
Drei Organisationslisten existieren (kritik §3.1): Excel 12, v1 14, EEB 12 (Codes 1–11, 255). Entscheidung: **Die Excel-Liste ist die fachliche Wahrheit** (sie steht in Formularen, Filtern und Ausdrucken), erweitert um die EEB-Werte, die in der Excel fehlen.

| Kanonisch (`s1-model::Organisation`) | Excel (D) | v1 | EEB-Code |
|---|---|---|---|
| `THW` | THW | THW | 1 |
| `FEUERWEHR` | FW | FEUERWEHR | 2 |
| `BUNDESWEHR` | BW | BUNDESWEHR | 10 |
| `DRK` | DRK | DRK | 5 |
| `JUH` | JUH | JOHANNITER | 6 |
| `ASB` | ASB | ASB | 8 |
| `MALTESER` | MALT | MALTESER **und** MHD (Dublette in v1) | 7 |
| `DLRG` | DLRG | DLRG | 9 |
| `POLIZEI` | POL | POLIZEI | 3 |
| `BUNDESPOLIZEI` | BPOL | – | 4 |
| `RETTUNGSDIENST` | – | RETTUNGSDIENST_KOMMUNAL | 11 |
| `HK_NLWKN` | HK/NLWKN | – | – (255 + Name) |
| `ZIVIL` | ZIV | REGIE / SONSTIGE / BERGWACHT | 255 |

Status: die 9 Excel-Werte werden kanonisch (`RUFBEREITSCHAFT, EINSATZVORBEHALT, ANGEFORDERT, ANMARSCH, RUECKMARSCH, EINSATZBEREIT, EINSATZ, RUHE, NICHT_EINSATZBEREIT`, hb F-G1) mit **einem Schlüssel und einem Anzeigenamen** – die Excel-Inkonsistenz „Ruf Bereitsch."/„Rufbereitschaft" (dom §8.3) verschwindet damit. Die drei v1-Werte (`AKTIV/IN_BEREITSTELLUNG/ABGEMELDET`) werden bei der Migration auf `EINSATZ / EINSATZBEREIT / NICHT_EINSATZBEREIT` abgebildet [Annahme – von Johannes zu bestätigen, §10.2].

Schicht: `TAG, NACHT, FRUEH, SPAET` mit Betriebsart je Einsatz (2-Schicht = Tag/Nacht, 3-Schicht = Früh/Spät/Nacht, hb F-G2), Vorbelegung `TAG`.

### 4.4 Excel-Bereiche → Abschnittsbaum
Die Excel hat eine flache Liste fester Bereiche mit Kapazitätsgrenzen (FüSt 10, Meldekopf 2×3, Logistik 12, Angefordert 22, BR1 22, BR2 11, Einsatzort 1–21 × 9 = 272 Zeilen, kritik §3.1). v1 hat einen Baum mit `parentId` und `systemTyp`. Entscheidung: **Baum, mit den Excel-Bereichstypen als `typ` und ohne Kapazitätsgrenze** (dom §8.1: „im Zielmodell entfällt die Grenze"). Beim Start eines Einsatzes wird der Excel-Satz als Vorlage angelegt (FüSt, Meldekopf 1/2, Sonstiges Führung, Logistik, Angefordert/Anmarsch, Bereitstellung 1/2, Einsatz beendet), Einsatzorte legt der Nutzer an. Die Excel-Regeln je Bereichstyp aus dom §8.1 werden Eigenschaften des Typs: `zaehltInGesamtstaerke`, `zaehltInKosten`, `zaehltInDruck`, `schichtPflicht`, `sichtbar`. Das ersetzt die verstreuten SUMIF-Formeln (dom §10) durch eine Tabelle.

### 4.5 Ressourcenplanung, Schichten, Logistik, Kosten, FüSt-Personal, Status
| Excel-Bereich | Abbildung in v2 |
|---|---|
| Ressourcenplanung/Ablösung (F-F1..F-F5, Spalten M–V) | Eigene Entität `Anforderung`, verbunden über `anforderungsId`; die Excel-Freitextreferenz wird zur echten Beziehung. Bereich `ANGEFORDERT` zählt nicht in Gesamtstärke, wird aber separat ausgewiesen (F-F2). |
| Schichten (F-G2) | Feld an der Einheit + Betriebsart am Einsatz; alle Auswertungen gruppieren danach. |
| Logistik (F-H1..F-H4) | Felder an der Einheit; die Logistikübersicht (Log!C5:P38) ist eine **Projektion**, keine Tabelle: Einsatzraum × Schicht × {Summe, M/W/D, Veget/Vegan, Unterbringung M/W/D} + Gesamtzeile + separat „Angefordert/Anmarsch". |
| Kosten (F-L6) | Kostenparameter am Einsatz, `psaProTag` an der Einheit; alle übrigen Kostenspalten (AN, AP, AR, AU, AW) sind abgeleitet – niemals gespeichert. Die 21 Kennzahlformeln aus dom §10 werden Funktionen in `s1-model::kennzahlen`. |
| FüSt-Personal (F-I1/F-I2) | `Dienstposten` (Teileinheit × Funktion × Tag/Nacht) und `SchichtplanEintrag` (Dienstposten × Datum). Die Excel projiziert die FüSt als 10 Einheitenzeilen ins Blatt Stärke – in v2 ist das eine **abgeleitete** Einheit je Teileinheit und Schicht, nicht doppelt gepflegt. Das behebt einen echten Excel-Workaround. |
| Status (F-G1/F-G3) | Enum + Plausibilitätsregeln („Einheiten ohne Status/Schicht/Organisation melden", Status!G36/G43) als Prüfregeln in der Projektion, sichtbar als Hinweisliste. |

### 4.6 Integration EEB / erfassungsbogen.app

**Was geteilt wird (Code):** der plattformneutrale Kern von `/Users/johannes/Developer/einheitenerfassungsbogen`:
- `src/codec.ts` (1.043 Z.) – Base41/Deflate/Container EEB2/EEB2C/Segmentierung
- `src/model.ts` (392 Z.) – `Erfassungsbogen`, Vokabulare, Schemaversion
- `src/signatur.ts` (340 Z.) – Ed25519-Signaturstufen
- `src/app/einsatz-transport.ts` – **`eeb-einsatz`-JSON-Datei und das in PDFs eingebettete Bogen-JSON** (ZUGFeRD-artig): das ist der Sammel-Importpfad für ganze Meldekopf-Sammlungen ohne QR-Scan
- Spezifikation: `docs/datenmodell.md`

**Was importiert wird (Daten):** einzelne Bögen per QR (Handscanner/Kamera) oder Sammlungen per Datei (`*.eeb-einsatz.json`, PDF mit eingebettetem JSON) vom USB-Stick oder direkt vom Share.

**ENTSCHEIDUNG: Der EEB-Codec wird NICHT nach Rust portiert.**
Begründung:
1. Die Spezifikation ist mit dem Referenz-Code *identisch gepflegt* – ein Rust-Port ist eine zweite Wahrheit, die bei jeder Schemaerweiterung (heute 2..8) nachziehen muss. Das ist genau das Doppelpflegeproblem, das bmecat M21 an `api.ts`/`types.ts` kritisiert, nur mit höherem Einsatz.
2. Der TS-Codec läuft unverändert in jeder WebView; in Tauri ist er damit **kostenlos** verfügbar. Der VBA-Port existiert zwar, war aber nie lauffähig (vba §8.4: `EebVokabText`/`EebBogenSchreiben` undefiniert) – ein Beleg dafür, wie ein Zweitport altert, nicht dafür, dass er sich lohnt.
3. Es gibt 1.291 Zeilen Tests im Ursprungsprojekt (`codec*.test.ts`, `model.test.ts`, `signatur.test.ts`), die beim Port nicht mitkommen.
4. Kryptografie (Ed25519-Signaturketten) in einem Zweitport zu duplizieren, ist ein Risiko ohne Gegenwert.

**Die Naht:** Der Renderer dekodiert (`QR-String → Erfassungsbogen`) und schickt den **fertigen, typisierten Bogen** per `invoke("eeb_bogen_uebernehmen", bogen)` an Rust. Das Mapping `Erfassungsbogen → Ereignisse` (Organisation, Hierarchie, Fahrzeuge, Personal, Stärke, Unterbringung, Sofortbedarf) liegt im Rust-Crate `s1-eeb-map` und ist damit fachliche Kernlogik im Kern, testbar ohne UI. Vorbild für das Mapping ist **nicht** das VBA (`EebBogenInZeileSchreiben`, dom §8.1), sondern `src/app/oldenburg-xlsx.ts` (kritik §3.2: „das fachlich bessere Mapping steht in der App").

Konsequenz, die man benennen muss: `s1-cli` kann **keinen** QR-String dekodieren. Betroffen ist genau ein Anwendungsfall („Bogen ohne laufende App aus einer Datei ziehen"), und der wird über den JSON-/PDF-Transportweg abgedeckt, den `einsatz-transport.ts` ohnehin liefert. [Annahme: das reicht; falls nicht, ist ein späterer schmaler Rust-Decoder nur für die Containerschicht möglich, ohne das Feldschema zu duplizieren.]

**Meldekopf-Sammlung:** erfassungsbogen.app hält beim Meldekopf eine `Einsatzsammlung` (`src/app/einsaetze.ts`, 27 kB). S1 v2 importiert diese Sammlung als Ganzes und legt je Bogen eine `Meldung` im Eingangskorb an (`MeldungEingegangen`), die die FüSt quittiert (`MeldungUebernommen`) – exakt der gelb/grün-Prozess aus hb F-E1, aber ohne Google-Tabelle (F-E5) und ohne die Formatzerstörung des heutigen „als Formel einfügen"-Workarounds (F-E4). Bereits eingelesene Bögen werden über `bogenId` + Stand erkannt; ein neuerer Stand desselben Bogens erzeugt eine neue Meldung mit Differenzanzeige (`meldung-diff.ts` existiert im Ursprungsprojekt und ist mit-teilbar).

---

## 5. Modul-/Repo-Struktur auf dem neuen Branch

### 5.1 Branch und Vorgehen
Neuer Branch `v2` im bestehenden Repo `S1-Control` (nicht neues Repo): die Historie, die Releases, die Issues und der `.github`-Workflow-Rahmen bleiben nutzbar; `main` bleibt lauffähig, bis v2 die Übung bestanden hat. Das v1-Verzeichnis `src/` wird auf `v2` **gelöscht**, nicht umgebaut – wiederverwendete Teile werden gezielt kopiert (§5.3).

### 5.2 Verzeichnisbaum
```
S1-Control/                              (Branch v2)
├── Cargo.toml                           # [workspace] members=["crates/*","src-tauri"]
├── package.json                         # React/Vite/TS, vitest, playwright-bdd, wdio
├── vite.config.ts                       # Einstiege index.html + monitor.html
├── crates/
│   ├── s1-model/         # Domänentypen, Enums, Invarianten, Kennzahlformeln (dom §10)
│   │   └── src/{lib,einsatz,abschnitt,einheit,fahrzeug,helfer,anforderung,
│   │             fuest,staerke,kennzahlen,enums,ids}.rs
│   ├── s1-event/         # Ereigniskatalog, Serialisierung, HLC, Schema-Upcaster v1→vN
│   │   └── src/{lib,ereignis,hlc,upcast,zeile}.rs        # <len>\t<crc32>\t<json>
│   ├── s1-fold/          # Fold: Ereignisse → Projektion; Konfliktregeln; Hinweise
│   │   └── src/{lib,projektion,regeln,konflikt,snapshot}.rs
│   ├── s1-store/         # Dateiebene: lokales Log, Share-Spiegelung, Offsets, Snapshots,
│   │   └── src/{lib,lokal,share,segment,offsets,presence,archiv}.rs   # Backup, Archiv-ZIP
│   ├── s1-net/           # UDP-Änderungssignal (41235), Peer-Sicht aus presence/
│   ├── s1-stan/          # StAN-Daten + taktische-Zeichen-Inferenz (aus v1 portiert)
│   │   └── resources/{thw-stan-2025.json, kats-nds.json, fw-nds.json, akueli.json}
│   ├── s1-eeb-map/       # Erfassungsbogen(JSON) → Ereignisse; Meldungs-Diff
│   ├── s1-import/        # calamine: Excel-Mappe + Kopiervorlagen + v1-.s1control
│   ├── s1-ausgabe/       # HTML/XLSX/CSV/SVG-Erzeugung aus der Projektion (§6)
│   │   └── vorlagen/{druck,status,log,logfrei,auswertung,monitor,fueorg}.html.j2
│   ├── s1-update/        # Minisign-Prüfung, Share-Endpoint, Datums-SemVer-Vergleich
│   └── s1-cli/           # bin `s1`: doctor|fold|export|migrate|import-excel|sim|archiv
├── src-tauri/
│   ├── Cargo.toml        # lib "s1_control_lib"; features: wdio
│   ├── tauri.conf.json   # de.thw.s1control; Fenster main+monitor; CSP gesetzt;
│   │                     # fileAssociations; windows.webviewInstallMode=fixedRuntime;
│   │                     # updater.pubkey; createUpdaterArtifacts
│   ├── tauri.wdio.conf.json
│   ├── capabilities/{main.json, monitor.json}
│   ├── resources/        # StAN-/Zeichen-Ressourcen als Bundle-Ressource (bmecat M20)
│   └── src/
│       ├── main.rs  lib.rs  state.rs  guard.rs  error.rs  events.rs  fenster.rs
│       ├── tasks/{schreiber.rs, leser.rs, netz.rs, ausgabe.rs}
│       └── commands/{einsatz.rs, abschnitt.rs, einheit.rs, fahrzeug.rs, helfer.rs,
│                     anforderung.rs, fuest.rs, eeb.rs, meldung.rs, ausgabe.rs,
│                     monitor.rs, system.rs, update.rs}
├── src/                                 # React
│   ├── bindings.ts                      # GENERIERT (tauri-specta)
│   ├── store/                           # Zustand-Store, an Backend-Events gebunden
│   ├── funktionen/                      # UI-nahe reine Funktionen (vitest)
│   ├── komponenten/                     # je Komponente eigenes CSS-Modul
│   ├── ansichten/{lage,einheit,fueorg,logistik,fuest,ausgaben,meldungen}/
│   └── fenster/{main.tsx, monitor.tsx}
├── vendor/
│   └── eeb/                             # git-Submodul auf erfassungsbogen.app (Tag-gepinnt)
├── e2e/
│   ├── features/                        # Gherkin, aus v1 übernommen + neue
│   ├── steps/                           # Playwright-BDD (gemocktes invoke)
│   └── wdio/                            # WDIO+tauri-driver Smoke-Suite (Windows)
├── test/                                # vitest (Frontend)
├── docs/
│   ├── ARCHITEKTUR.md  KONZEPT-EREIGNISMODELL.md  KONZEPT-SYNC.md
│   ├── KONZEPT-AUSGABEN.md  KONZEPT-UPDATE.md  KONZEPT-MONITOR.md
│   ├── EREIGNISKATALOG.md  UI-ABNAHME.md  MIGRATION.md  BETRIEB.md
│   └── adr/0001-ereignisprotokoll.md  0002-tauri.md  0003-eeb-codec-nicht-portieren.md …
└── .github/workflows/{ci.yml, release.yml}
```

Warum `s1-event` und `s1-fold` getrennt von `s1-store`: Der Fold muss ohne Dateisystem testbar sein (Property-Tests über Vektoren im Speicher), der Store muss ohne Fachlogik testbar sein (Segmente, Offsets, Wiederaufsetzen). bmecat §8.3 sah nur `s1-store` vor – das würde beides vermischen.

### 5.3 Was aus v1 wörtlich übernommen wird
| Gegenstand | Quelle in v1 | Ziel | Art |
|---|---|---|---|
| STAN-Daten | `src/main/services/stan/thw-stan-2025.generated.json` (47 Einträge) | `crates/s1-stan/resources/` | **Datei 1:1**, Generatorskript (`scripts/extract-thw-stan-from-zip.cjs`) bleibt Node und wird nur bei Neuauflage der StAN gebraucht |
| STAN-Inferenz | `stan/thw-stan-inference.ts` | `s1-stan/src/inferenz.rs` | Portierung, Regeln 1:1, Tests mitportiert |
| Zeichen-Inferenz | `tactical-sign-aliases.ts`, `tactical-sign/{catalog,scoring,thw-shortcodes}.ts`, `tactical-sign-inference.ts` | `s1-stan/src/zeichen/` | Portierung inkl. Scoring/Schwellen, `meta{source,confidence,ruleVersion}` und der Regel „manuell schlägt automatisch"; die vier duplizierten `normalizeText`/`tokenize` werden dabei zusammengeführt (main §10) |
| Fachregeln | `validations.ts:12-35` (Abschnitt-Zyklus), `tactical-strength.ts`, `einheit.ts:151-233` (Split), `einsatz-transaction-guards.ts:31-38` (Archiv-Schreibschutz) | `s1-model` bzw. `s1-fold/regeln.rs` | Portierung |
| Versionsvergleich Datums-Builds | `updater-versioning.ts` | `s1-update` | Portierung inkl. Fix aus `ffa14f8` |
| BDD-Szenarien | `e2e/features/einsatz-lifecycle.feature` (10 Szenarien) | `e2e/features/` | **Gherkin-Dateien wörtlich**, Step-Definitionen neu |
| Behavior-Testideen | `test/behavior.*.test.ts` (Einsatzfluss, Abschnitt bearbeiten, Basisdaten) | Rust-Integrationstests auf `s1-fold` | Übersetzung, nicht Portierung |
| Wire-Kompatibilitätstests | `einsatz-sync.test.ts` (u.a. gleicher Einsatz unter `/Volumes/...` und `Z:\...`) | `s1-net` | Idee übernehmen, Fälle behalten |
| Architekturregeln | `AGENTS.md` §1–2, §4 | `docs/ARCHITEKTUR.md` | Text übernehmen, jetzt durch Crate-Grenzen erzwungen |
| Taktische Zeichen (SVG) | npm `taktische-zeichen-core` | Frontend | unverändert weiterverwenden |

**Nicht übernommen** (main §10 „weglassen"): Utility-Prozess/`main-db-bridge`/`db-runtime`, `EinsatzReadCache`, better-sqlite3/drizzle, LAN-Peer-Update (~920 Z.), Debug-Sync-Log-Forwarding, doppelt kodierte JSON-Strings im Format, Stärke-Monitor-Prewarm. Der Renderer wird **nicht** übernommen (kritik §3.6 Punkt 7); übernommen werden aus ihm nur Layout-Ideen und CSS-Fragmente, bewusst per Neuschnitt mit Store statt 150-Props-Drilling.

### 5.4 Wie erfassungsbogen.app geteilt wird
**Entscheidung: git-Submodul `vendor/eeb`, auf einen Tag gepinnt, per Vite-Alias eingebunden. Kein npm-Publish, kein Copy.**

| Option | Bewertung |
|---|---|
| npm-Workspace über beide Repos | scheitert daran, dass es zwei getrennte Repos mit eigener Release-Kadenz sind |
| npm-Paket veröffentlichen (`@thw-ol/eeb-codec`) | sauberste Versionierung, aber Registry-Infrastruktur, Publish-Schritt und Offline-Installation im Einsatznetz als Zusatzlast für einen Einzelentwickler |
| **git-Submodul, Tag-gepinnt** | **gewählt**: keine Infrastruktur, exakte Version im Repo festgeschrieben, offline klonbar, Änderungen im Ursprungsprojekt kommen nur durch bewusstes Submodul-Update; `tsc`-Prüfung deckt Brüche sofort auf |
| Dateien kopieren | verliert die Herkunft, driftet garantiert (VBA-Port als Mahnung, vba §8.4) |

Konkret eingebunden werden nur `src/codec.ts`, `src/model.ts`, `src/signatur.ts`, `src/app/einsatz-transport.ts`, `src/app/hilfen.ts` (Migration alter Bögen) und `src/app/meldung-diff.ts` – über `vite.config.ts`-Alias `@eeb/*` → `vendor/eeb/src/*`. Der Rest des Ursprungsprojekts (UI, PDF, Capacitor) wird nicht gebaut. Ein CI-Job baut `tsc --noEmit` gegen das Submodul, damit ein Schemasprung im Ursprungsprojekt nicht still einsickert.

Die Spezifikation `vendor/eeb/docs/datenmodell.md` ist die einzige Quelle für das Format; `docs/adr/0003-eeb-codec-nicht-portieren.md` hält fest, warum es keinen Rust-Port gibt.

---

## 6. Ausgaben

### 6.1 Grundsatz
Alle acht Ausgabeprodukte der Excel (hb §10, F-K1..F-K7) entstehen im Crate `s1-ausgabe` **aus der Projektion**, mit `minijinja`-Vorlagen. Damit gilt:
- identische Ausgaben aus App, CLI und CI (Referenzdateien als Snapshot-Tests, `insta`),
- der HTML-Monitor braucht keinen Renderer,
- Vorlagen sind Textdateien und ohne Rebuild anpassbar (Bundle-Ressource + überschreibbare Nutzerkopie, bmecat M20).

### 6.2 Technikwahl je Produkt
| Produkt (Excel) | Anforderung | Technik in v2 |
|---|---|---|
| **Druck** (F-K1) | Stärken je Einsatzstelle, feste Reihenfolge, Gesamtzeile, Plausibilität, Org-Filter, „Stand:", A4/Zoom 55 % | HTML mit `@page`-CSS aus `druck.html.j2`; Öffnen per `tauri-plugin-opener` im Standardbrowser, Ausdruck dort. Zusätzlich PDF, siehe §6.3. |
| **Status** (F-K2) | Matrix Org × (Fü/UFü/He=Ges, M, W, Veg, Unterbringung), Stärke je Status, je Schicht, Kontrollsummen | HTML + XLSX |
| **Log** (F-K3/F-H2) | Logistik je Einsatzraum × Schicht + Gesamt + „Angefordert" separat | HTML + XLSX |
| **LogFrei** (F-H3) | frei bearbeitbare/exportierbare Kopie mit Zeitstempel | XLSX (`rust_xlsxwriter`) – bewusst als Datei, die der Nutzer verbiegen darf |
| **Auswertung** (F-K5/N-9) | flache filterbare Gesamttabelle, Bereich als Spalte, Summen | XLSX mit AutoFilter + Summenzeile; zusätzlich CSV |
| **FüOrg** (F-K4) | bearbeitbare Führungsharke mit taktischen Zeichen, druckbar | **Frontend**: React-Editor über SVG, Zeichen aus `taktische-zeichen-core`; Layout wird als Ereignis (`FueorgLayoutGesetzt`) gespeichert; Ausgabe = SVG in HTML-Rahmen aus `s1-ausgabe`. Einziges Produkt, dessen Erzeugung nicht rein im Kern liegt – weil es interaktiv ist. |
| **HTML-Monitor** (F-K6) | Druck (opt. Status/Log) periodisch als statische HTML an Netzort; Browser lädt alle 60 s neu | Ausgabe-Task im Rust-Prozess schreibt alle N Minuten `\\NAS\...\monitor\index.html` (tmp+rename). Besser als heute: kein offener Excel-Prozess nötig, nur ein laufender Client (vba §6.3 nennt das als Excel-Schwäche). |
| **Stärke-Monitor** (v1-Feature, Excel-Pendant Lagemonitor) | Zweitbildschirm, Gesamtstärke + Uhrzeit | Fenster `monitor` (§2.2), Daten per Event |
| **Einsatzakte / Archiv** | ZIP mit allem | `s1-store::archiv` (§3.10) |

### 6.3 PDF – ehrliche Einordnung
Tauri hat kein Druck-API (bmecat R7, Issues #3066/#4917/#5330), `window.print()` ist unzuverlässig. Zwei Wege:
1. **Primär: HTML + Systembrowser.** Deckt F-K1/F-K7 vollständig ab, ist genau der heutige Excel-Workflow („Ausdruck für die Lagekarte") und kostet nichts.
2. **Optional: echtes PDF im Kern.** `typst` als Bibliothek oder `printpdf`. Empfehlung: **erst bauen, wenn die FüSt es verlangt** – der Aufwand (Layout in einer zweiten Sprache, Schriften einbetten) liegt bei ~1–1,5 PW und der Nutzen gegenüber „Browser → PDF drucken" ist gering. Als ADR festhalten, nicht stillschweigend weglassen.

### 6.4 Was gegenüber der Excel besser wird (und in die Abnahme gehört)
- Ausdrucke tragen den Stand aus der **Ereigniszeit**, nicht aus der Uhr des Erzeugers.
- „Leere Einsatzstellen ausblenden" (F-B4) und „Angefordert nicht mitzählen" (F-F2) sind Regeln im Kern, nicht Formelketten mit 32 Summanden (dom §10).
- Das ETB (hb F-E3, N-6) ist eine Ausgabe des Logs und damit erstmals vollständig – die Excel hat dafür nur Dateikopien.

---

## 7. Test- und Qualitätsstrategie

### 7.1 Testpyramide
| Ebene | Werkzeug | Umfang | Was abgesichert wird |
|---|---|---|---|
| Rust-Unit | `cargo test` | `s1-model`, `s1-event`, `s1-stan`, `s1-eeb-map`, `s1-update` | Invarianten, Enum-Abbildungen, Kennzahlformeln (dom §10), Zeichen-Inferenz-Scoring, Datums-SemVer |
| **Rust-Property** | `proptest` | `s1-fold` | siehe §7.2 – das Herzstück |
| Rust-Snapshot | `insta` | `s1-ausgabe`, `s1-import` | Ausgaben zellgenau gegen Referenzdateien; Excel-Import gegen die Vorlage |
| Rust-Integration | `cargo test -p s1-store` + `tempfile` | `s1-store` | Segmente, Offsets, abgeschnittene letzte Zeile, Wiederaufsetzen, Snapshot-Validierung |
| **Mehrclient-Simulation** | `s1-cli sim` | Dateiebene | siehe §7.3 |
| Frontend-Unit | `vitest` + Testing Library | `src/funktionen`, `src/store`, Komponenten | v1 hat **null** Komponententests (kritik §3.6 Punkt 7) – das wird nachgeholt |
| E2E schnell | Playwright browser-mode gegen Vite mit gemocktem `invoke` | die 10 Gherkin-Szenarien + neue | Bedienflüsse, Regressionen |
| E2E echt | WDIO + `@wdio/tauri-service` unter Windows | ~6 Smokes | echte App startet, zwei Fenster, Datei öffnen, Ausgabe erzeugen |

### 7.2 Property-Tests für den Fold (die eigentliche Absicherung)
Vier Eigenschaften, alle über generierte Ereignismengen mehrerer fiktiver Clients:
1. **Determinismus/Kommutativität:** Für jede Permutation der Eingangsreihenfolge (die HLC-Sortierung bleibt fix, die Ankunftsreihenfolge variiert) ist die Projektion bit-identisch. Das ist der Test, der Restrisiko 1 aus nas §10 adressiert.
2. **Idempotenz:** Mehrfaches Einspielen derselben Ereignisse ändert nichts (Ereignis-`id`-Dedup, §3.5 Punkt 6).
3. **Snapshot-Äquivalenz:** `fold(events)` == `fold_from(snapshot_at(k), events[k..])` für jedes k. Damit ist Restrisiko 5 (Snapshot-Korrektheit) maschinell abgedeckt.
4. **Invariantenerhalt:** Nach jedem Fold gilt: kein Abschnittszyklus (`validations.ts:12-35`), Stärke-Summenregel (`tactical-strength.ts`), keine Einheit ohne Abschnitt, keine Referenz auf einen nicht existierenden Abschnitt.

Zusätzlich ein **Regressionskorpus**: jede im Betrieb aufgetretene Merkwürdigkeit wird als Ereignisdatei in `crates/s1-fold/tests/korpus/` abgelegt und mitgeprüft. Weil Ereignisse unveränderlich sind, ist jeder Feldfehler exakt reproduzierbar – das kann v1 nicht.

### 7.3 Mehrclient-Simulation auf Dateiebene
Zwei Stufen:
- **In-Process (CI, schnell):** `s1-store`-Test startet N Threads, jeder mit eigenem `clientId` und eigenem lokalen Verzeichnis, alle gegen ein `tempfile`-Verzeichnis als „Share". Prüft Konvergenz, Wiederaufsetzen nach simuliertem Abbruch (Datei mitten in der Zeile abgeschnitten), Offset-Sprünge, Segmentwechsel.
- **Echt (`s1 sim`, manuell/Übung):** `s1 sim --share \\NAS\S1-Control --clients 4 --dauer 30m --last realistisch` startet vier Prozesse, erzeugt Ereignisse mit realistischer Verteilung, misst Sichtbarkeitslatenz (p50/p95/max), zieht am Ende jeden Client einzeln offline und wieder online und vergleicht am Schluss die Projektionen aller vier per blake3. **Dieses Werkzeug ist Teil von M0 und danach das Abnahmemittel für jede Änderung am Speichermodell.** Es liefert außerdem die SMB-Latenzzahlen, die heute überall fehlen (kritik §3.7, nachlese-build §8).

### 7.4 Qualitätsschranken (CI)
- `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`
- `cargo test --workspace` (inkl. proptest, Standard-Fallzahl 256)
- `tsc --noEmit` (auch gegen das EEB-Submodul), `eslint` (flat config, hooks + a11y, keine Stilregeln – bmecat M25), `vitest run --coverage`
- `playwright test` (BDD)
- Merkposten aus v1, der sich nicht wiederholen darf: `npm run typecheck` war dort faktisch ein No-op (`tsconfig.json files: []`), 42 + 91 Typfehler blieben unbemerkt (kritik §3.7). In v2 bricht die CI bei jedem Typfehler.

### 7.5 CI-Matrix
| Job | Läuft auf | Inhalt | Erwartete Dauer |
|---|---|---|---|
| `pruefen` | ubuntu-latest | fmt, clippy, cargo test (Kern-Crates ohne Tauri), tsc, eslint, vitest | 5–8 min [Annahme; Kern kalt 26,7 s gemessen, kritik §3.7] |
| `e2e` | ubuntu-latest | Playwright browser-mode | 3–5 min |
| `bauen` | windows-latest, macos-14, ubuntu-22.04 | `tauri-action`, `swatinem/rust-cache` | 10–20 min je Plattform [Annahme, bmecat R4] |
| `smoke-win` | windows-latest | WDIO gegen die gebaute App | 5 min |
| `release` | ubuntu-latest | `latest.json`, Minisign, GH-Release, Kopie nach `update/` (manuell) | 1 min |

Zum Vergleich Ist-Stand Electron: Median 5:16 min Wandzeit, 12,5–15 Runner-Minuten (nachlese-build §3.1). Tauri wird das etwa verdreifachen. Gegenmaßnahmen: Plattform-Builds nur auf Tags und auf `main`, PR-Läufe nur `pruefen` + `e2e`; `sccache` erst, wenn `rust-cache` nicht reicht.

### 7.6 Abnahme
`docs/UI-ABNAHME.md` nach bmecat-Vorbild (M29/M30): je Ausgabeprodukt und je Bedienfluss eine Checkliste mit erwartetem Ergebnis, die vor jeder Übung durchgegangen wird. Ergänzt um eine **Störfallmatrix** (NAS weg / Client-Absturz mitten im Schreiben / Uhr um 3 h falsch / Doppelstart / Monitor abgesteckt / Update während des Betriebs), die in M3 einmal vollständig durchgespielt und protokolliert wird.

---

## 8. Meilensteine bis Excel-Parität

Rechengröße: **1 PW = 40 fokussierte Arbeitsstunden** eines KI-gestützten Einzelentwicklers. Die Umrechnung in Kalenderzeit muss Johannes selbst vornehmen (§10.4) – bei 8–10 h/Woche ergibt die mittlere Schätzung rund 2,5 Jahre, bei 20 h/Woche rund 14 Monate. Das ist die wichtigste Zahl des ganzen Vorschlags.

### 8.1 Meilensteine

| M | Inhalt | Definition of Done | PW |
|---|---|---|---|
| **M0** | **Beweis der Speicherarchitektur zuerst.** (a) Prototyp `s1-sim` in Rust: 4 Prozesse, ein echtes SMB-Share, Append-only-Segmente, HLC, trivialer Fold; Offline/Reconnect; Latenzmessung. (b) Tauri-Spike: zweites Fenster auf Zweitmonitor unter Windows inkl. gemischter DPI, `fixedRuntime`-Installer über `tauri-action`, ein WDIO-Smoke, ein Playwright-BDD-Szenario. | (a) Vier Clients konvergieren nachweislich (blake3-Vergleich), Sichtbarkeitslatenz p95 dokumentiert, „NAS weg für 10 min" ohne Datenverlust; (b) alle drei Tauri-Fragen mit Ja/Nein beantwortet und in `docs/adr/` festgehalten. **Abbruchkriterium benannt:** scheitert (a), fällt der ganze Vorschlag; scheitert (b) an einem Punkt, wird nur dieser Punkt ersetzt (z. B. Monitor als separates Fenster derselben App vs. eigener Prozess). | **2** |
| **M1** | Kern-Crates `s1-model`, `s1-event`, `s1-fold`, `s1-store`, `s1-cli`. Ereigniskatalog (§3.4) vollständig für Einsatz/Abschnitt/Einheit. Property-Tests (§7.2). `s1 doctor|fold|sim`. | `cargo test --workspace` grün inkl. 4 Property-Eigenschaften; `s1 sim --clients 4` gegen das echte Share konvergiert; `EREIGNISKATALOG.md` beschreibt jeden Typ mit Fold-Regel; keine Tauri-Abhängigkeit in `crates/`. | **3** |
| **M2** | Tauri-Schale + React-Grundgerüst + erster vertikaler Schnitt: Einsatz anlegen/öffnen, Abschnittsbaum, Einheit anlegen/bearbeiten/verschieben, Stärke, Presence-Anzeige, Live-Aktualisierung. `tauri-specta`-Bindings. Zustand-Store statt Props-Drilling. | Zwei Clients auf einem Share: Änderung eines Clients beim anderen in < 2 s sichtbar; Übungslage mit 20 Einheiten anlegbar; Playwright-BDD deckt „Einsatz anlegen → Einheit anlegen → verschieben" ab. | **3** |
| **M3** | Mehrclient-Härtung: Offline/Reconnect, Snapshots + Validierung, Konflikthinweise im UI, Uhrenwarnung, Backup/Rotation, Archiv-ZIP mit Hashes, Diagnoseansicht. | Störfallmatrix (§7.6) vollständig durchgespielt und protokolliert; Archiv-ZIP lässt sich per `s1 doctor` verifizieren; Startzeit bei 20.000 Ereignissen < 3 s. | **2** |
| **M4** | Einheit vollständig (alle Excel-Spalten B..AW), Status (9 Werte) + Schicht, Fahrzeuge, Helfer, **Ressourcenplanung/Ablösung** (`Anforderung`, F-F1..F-F5), Archivbereich „Einsatz beendet". | Jede Excel-Spalte aus dom §9 hat ein Feld oder eine dokumentierte Begründung, warum nicht; Anforderungsvorgang A↔B über gemeinsame ID nachvollziehbar; Plausibilitätsliste (F-G3) vorhanden. | **3** |
| **M5** | Logistik (F-H1..F-H4), Kosten (F-L6), FüSt-Personal + Schichtplanung (F-I1/F-I2). | Log- und Statuszahlen stimmen gegen eine ausgefüllte Referenz-Mappe **zellgenau**; FüSt-Stärke wird automatisch in die Lage projiziert statt doppelt gepflegt. | **2,5** |
| **M6a** | Ausgaben ohne FüOrg: Druck, Status, Log, LogFrei, Auswertung, HTML-Monitor, Stärke-Monitor (Zweitbildschirm), ETB. | Sieben Produkte mit „Stand:"-Zeile, Snapshot-Tests gegen Referenzdateien; HTML-Monitor schreibt periodisch auf den Share; Stärke-Monitor läuft stabil auf dem Zweitbildschirm. | **2,5** |
| **M6b** | FüOrg: Führungsharke-Editor mit taktischen Zeichen, Palette (THW/FW-Einheiten, Führungsstellen-Fahnen, Personen-Rauten, Funktionskreise), Layout als Ereignis, Druckausgabe. | F-K4 vollständig; Layout übersteht Neustart und ist auf einem zweiten Client identisch; Ausdruck A4 lesbar. | **2** |
| **M7** | EEB-Integration: Submodul, QR per Handscanner **und** Kamera, Segmentsammlung (Mittel 2,91 Teile je Bogen, kritik §3.2), Sammel-Import aus `eeb-einsatz`-JSON/PDF, `s1-eeb-map`, Meldekopf-Eingangskorb mit gelb/grün-Quittierung und Diff. | Ein realer Bogen aus erfassungsbogen.app landet vollständig als Einheit inkl. Personal/Fahrzeugen; eine Sammlung von 20 Bögen wird in einem Schritt übernommen; Doppelimport erkannt. | **2,5** |
| **M8** | Migration + Stammdaten: `s1-import` (Excel-Mappe, Kopiervorlagen, AküLi), v1-`.s1control`-Migration, StAN-Daten + STAN-Inferenz + Zeichen-Inferenz portiert. | `s1 migrate` erzeugt aus einer v1-Datei eine identische Lage (Feldabgleich dokumentiert); Kopiervorlagenkatalog (THW/FW/KatS Nds) nutzbar; Zeichen-Inferenz liefert für einen Testkorpus dieselben Ergebnisse wie v1. | **2,5** |
| **M9** | Verteilung: `fixedRuntime`-Installer, Signierung, Updater über GitHub **und** Share, Betriebsdoku (`BETRIEB.md`: Sharelayout, Rechte, Backup, Wiederherstellung). | Ein FüSt-Rechner ohne Internet lässt sich installieren und über den Share aktualisieren; Rollback-Weg beschrieben. | **1,5** |
| **M10** | Abnahme und Härtung: UI-ABNAHME vollständig, eine echte Übung mit ≥ 2 Clients, Nachbesserungen. | Übung ohne Datenverlust und ohne Ausweichen auf Excel gefahren; Fehlerliste abgearbeitet oder terminiert. | **2** |
| | **Summe (Mittelwert)** | | **28,5** |

### 8.2 Gesamtspanne und Unsicherheitsbegründung
**24 bis 40 Personenwochen**, Erwartungswert ~29.

Wo die Unsicherheit sitzt (absteigend):
1. **Excel-Parität ist ein sehr breiter Zielbegriff** – hb §7 listet ~55 funktionale Anforderungen in 12 Gruppen. Erfahrungsgemäß entdeckt man in M4/M5 Detailregeln, die in keiner Anforderung stehen (Beispiel: `Schicht_Angefordert` wird beim Einfügen global geleert, vba §3.1/§3.5). +0 bis +6 PW.
2. **FüOrg-Editor (M6b)** ist das einzige Feature ohne Vorbild in v1 und mit hoher UI-Varianz. +0 bis +3 PW.
3. **Rust-Lernkurve über Thread-Grenzen** (bmecat R5). Der Kern (M1) ist gut greifbar, der Tauri-Glue mit Guards/Tasks weniger. +0 bis +3 PW.
4. **Renderer-Neubau**: „S1-Renderer bleibt weitgehend" (bmecat §8.2) ist widerlegt (kritik §3.6 Punkt 7); die 10.097 Renderer-Zeilen werden nicht übernommen, sondern neu geschnitten. Ich habe das in M2/M4/M6 eingepreist – falls sich mehr wiederverwenden lässt, −2 PW.
5. **Unbekannte Betriebsparameter** (§10.1): Wenn das NAS sich ungünstig verhält (lange Directory-Caches, Rename-Probleme), kostet M0/M3 mehr. +0 bis +2 PW.
6. **E2E-Wechsel** (bmecat R6): `@wdio/tauri-service` ist jung; wenn es unter Windows klemmt, bleibt Playwright-browser-mode allein – dann fehlt die Absicherung des echten Prozesses. +0 bis +2 PW.

### 8.3 Was der Rust-Weg gegenüber demselben Entwurf in TypeScript kostet
**+20 bis +35 % auf die Summe**, also grob **+6 bis +10 PW** – im Wesentlichen: Typ-/Serialisierungsgrenze (auch mit `tauri-specta` bleibt Zweisprachigkeit), Nebenläufigkeit im Borrow-Checker, E2E-Werkzeugwechsel, Updater-Neubau in Rust, längere Build-/CI-Zyklen. Dem stehen gegenüber: Property-Tests, die in TS zwar möglich (`fast-check`), aber ohne erschöpfendes `match` deutlich schwächer sind; ein CLI ohne Laufzeitumgebung; keine UI-Thread-Blockade; kleinerer Speicherbedarf auf FüSt-Hardware. **Diese Rechnung geht nur auf, wenn der Kern langlebig ist** – bei einem Werkzeug, das in zwei Jahren ersetzt wird, wäre TypeScript die richtige Wahl.

### 8.4 Reihenfolgeprinzip
M0 vor allem anderen (Beweis der Speicherarchitektur), danach **vertikale Schnitte**: jeder Meilenstein ab M2 endet mit etwas, das ein Mensch in der FüSt bedienen kann. Kein Meilenstein baut „erst alle Entitäten, dann alle Ansichten". Ab M2 ist die App bei jeder Übung parallel zur Excel einsetzbar (Doppelerfassung), ab M6a ersetzt sie die Ausdrucke, ab M10 die Mappe.

---

## 9. Risiken mit Gegenmaßnahmen (priorisiert)

| # | Risiko | Wahrsch. × Wirkung | Gegenmaßnahme | Frühwarnzeichen |
|---|---|---|---|---|
| **B1** | **Fold-Regelwerk unvollständig** – ein nicht bedachter Nebenläufigkeitsfall erzeugt einen stillen Falschzustand im Lagebild (nas §10 Restrisiko 1). Das ist das gefährlichste Risiko, weil es *nicht auffällt*. | hoch × sehr hoch | Ereigniskatalog als Spezifikation **vor** der Implementierung (`docs/EREIGNISKATALOG.md`); erschöpfendes `match` im Fold (Compiler erzwingt Vollständigkeit); vier Property-Eigenschaften (§7.2); Konflikthinweise im UI sichtbar statt still aufgelöst; Regressionskorpus. | Ein Feldfehler, der sich nicht aus dem Log rekonstruieren lässt |
| **B2** | **Ein-Personen-Team, zwei Sprachen, Umfang von ~29 PW** (bmecat R5). Das Projekt bleibt auf halbem Weg liegen und die FüSt hat weder Excel-Ersatz noch v1. | hoch × hoch | Vertikale Schnitte (§8.4): ab M2 ist jeder Stand einsetzbar. v1 bleibt auf `main` lauffähig, bis M10 steht. Harte Meilenstein-DoDs statt „fertig wenn schön". Nach M3 ehrlich neu bewerten – das ist der natürliche Ausstiegspunkt zugunsten eines TS-Weges auf demselben Speichermodell. | M0+M1 brauchen > 7 PW |
| **B3** | **Unbekanntes NAS verhält sich anders als angenommen** – Directory-Cache länger als 10 s, `create_new` nicht atomar, Append über SMB unzuverlässig. | mittel × sehr hoch | M0 misst es **auf dem echten Share, vor allem anderen**; `s1 sim` bleibt danach als Regressionsmittel. Fällt `create_new` durch, gibt es einen Rückfallpfad (Segmentname mit Zufallssuffix statt Zähler). Betriebsparameter beschaffen (§10.1). | M0(a) zeigt Latenz-p95 > 15 s oder Konvergenzfehler |
| **B4** | **Scope-Explosion Excel-Parität** – 55 Anforderungen, davon einige (FüOrg, Schichtplan) mit hoher UI-Varianz. | hoch × mittel | hb §7 als Abnahmeliste mit Ja/Nein je Anforderung führen; „nicht in v2"-Entscheidungen schriftlich (F-L3 Passwortschutz, F-K4-Detailtiefe, PDF §6.3); Kopiervorlagen und AküLi als Daten, nicht als Code. | M4 überschreitet 4 PW |
| **B5** | **E2E-Werkzeugwechsel scheitert** (bmecat R6): `@wdio/tauri-service` klemmt unter Windows; die 10 BDD-Szenarien verlieren ihren Bezug zur echten App. | mittel × mittel | Zweigleisig von Anfang an (§7.1): Playwright-browser-mode mit gemocktem `invoke` trägt die Breite, WDIO nur ~6 Smokes. Fällt WDIO ganz aus, bleibt eine manuelle UI-ABNAHME-Checkliste. | M0(b) bekommt keinen WDIO-Smoke grün |
| **B6** | **Renderer wird teurer als gedacht** – v1 liefert kein wiederverwendbares Fundament (150-Props-Drilling, kein Store, 91 Typfehler, 0 Komponententests). | mittel × mittel | Store (Zustand/Jotai) + generierte Bindings ab M2; Komponententests ab Tag 1, damit der Neuschnitt nicht zum zweiten Prop-Sumpf wird; CSS je Komponente statt globaler Datei. | M2 überschreitet 4 PW |
| **B7** | **WebView2-`fixedRuntime` im CI** – `tauri-action` nimmt den ~180-MB-Runtime nicht sauber mit; Windows-Installer bleibt offline unbrauchbar (bmecat R1, §10 Frage 4). | mittel × hoch | In M0(b) klären, nicht in M9. Rückfall: `offlineInstaller` (+127 MB, Evergreen) oder Handpaketierung des Installers einmal je Release. Runtime per CI-Download, nicht im Repo. | M0(b) baut keinen offline lauffähigen Installer |
| **B8** | **Zweitmonitor/DPI** – Stärke-Monitor sitzt falsch oder skaliert falsch bei gemischter DPI (Issue #6843 offen, nachlese-tauri §2.5). | mittel × mittel | `tauri >= 2.11` (Pflicht, wegen Fix #15250); Positionierung nach dem Bau mit `PhysicalPosition`/`PhysicalSize`; Test mit Laptop 150 % + Beamer 100 %; Rückfall: Monitorwahl manuell im UI. | Spike zeigt Versatz bei gemischter DPI |
| **B9** | **Submodul-Drift EEB** – erfassungsbogen.app erweitert das Schema, S1 liest alte Bögen falsch oder gar nicht. | mittel × mittel | Tag-Pin + bewusstes Update; `tsc --noEmit` gegen das Submodul in CI; `s1-eeb-map` behandelt unbekannte Felder tolerant; `migriereBogen` aus dem Ursprungsprojekt mitnutzen. | Ein Bogen aus der aktuellen App wird abgelehnt |
| **B10** | **`clientId`-Kollision** durch geklontes Windows-Image → zwei Rechner schreiben in dieselbe Segmentdatei (nas §10 Restrisiko 4). | niedrig × hoch | `clientId` = Zufalls-ULID + Hostname-Suffix, beim Start prüfen, ob die eigene Share-Datei zum lokalen Offset passt; bei Abweichung neues Segment und Warnung. Segmentwechsel bei jedem App-Start (§3.3 Präzisierung 1) entschärft zusätzlich. | Warnung „Fremdschreiber in eigener Datei" |
| **B11** | **Minisign-Schlüsselverlust** → keine Updates mehr für installierte Clients (bmecat R11). | niedrig × hoch | Schlüssel im Passwortmanager **und** CI-Secret **und** auf einem verschlüsselten Offline-Datenträger; zweiter „Notfall"-Public-Key mit einkompiliert (§2.6). | – |
| **B12** | **Logwachstum/Startzeit** bei langen Lagen; Snapshot fehlerhaft. | niedrig × mittel | Snapshots ab 5.000 Ereignissen mit Versionsvektor + blake3; Property-Eigenschaft 3 (§7.2) prüft Snapshot-Äquivalenz maschinell; Snapshots sind immer verwerfbar. | Startzeit > 3 s in M3 |
| **B13** | **Migrationsgrundlage fehlt** – es gibt gar keine gefüllten Excel-Mappen oder v1-Dateien, `s1-import` war umsonst (kritik §3.7). | mittel × niedrig | Vor M8 klären (§10.1). Notfalls schrumpft M8 auf Kopiervorlagen + AküLi (lohnt sich auch dann). | – |
| **B14** | **Rollen bleiben Attrappe** wie in v1 (nirgends durchgesetzt, main §11). | mittel × niedrig | Entweder fachlich definieren (§10.2) oder ersatzlos streichen; kein drittes Mal „ADMIN/S1/FUE_ASS/VIEWER" ohne Wirkung. | – |

---

## 10. Was Johannes noch entscheiden/liefern muss

### 10.1 Betriebsparameter (blockierend für M0 und M3)
| # | Frage | Wie zu ermitteln | Wofür gebraucht |
|---|---|---|---|
| 1 | **NAS-Typ/Modell/Firmware und SMB-Dialekt** | Auf dem FüSt-Rechner `Get-SmbConnection`; auf dem Mac bei gemountetem Share `smbutil statshares -a`; bei Synology/QNAP DSM/QTS-Version und Oplock-/Durable-Handle-Einstellungen (nachlese-betriebsparameter §2) | Cache-Zeiten, `create_new`-Atomarität, Append-Verhalten – alles, was M0 misst |
| 2 | **Windows-Version(en)** der FüSt-Rechner (10/11, Build) | `winver` / `systeminfo` | WebView2-Vorhandensein, `fixedRuntime`-Notwendigkeit, DPI-Verhalten |
| 3 | **Anzahl gleichzeitiger Clients** real (2? 4? mehr bei Großlage?) und wie viele davon schreibend | Erfahrung Johannes / letzte Übung | Poll-Intervall, Presence-Anzeige, Simulationsparameter |
| 4 | **NTP im Einsatznetz vorhanden?** Wenn nein: wie weit driften die Rechner typisch? | Uhrzeiten auf den FüSt-Rechnern nach 8 h Betrieb vergleichen | ETB-Zeitstempel, Uhrenwarnschwelle (§3.7) |
| 5 | **Reale Einsatzgrößen**: Einheiten, Fahrzeuge, Helfer, Bewegungen, Einsatzdauer | letzte Übung / Hochwasser | Snapshot-Schwelle, Startzeitziel, Simulationslast |
| 6 | **Gibt es gefüllte Excel-Mappen** realer Einsätze und/oder produktive `.s1control`/`.sqlite`-Dateien? | FüSt-Rechner, Share, Archivordner | Umfang von M8 (B13) |
| 7 | **SMB-Latenzmessung** auf dem echten Share | `s1 sim` aus M0, oder vorab ein kleines Skript (stat/open/read/write/rename in ms) | Poll-Intervall, Zusage an die FüSt (§3.8) |

### 10.2 Fachliche Festlegungen (blockierend für M4/M5)
1. **Rollenmodell**: Sollen `ADMIN / S1 / FüGeh / Meldekopf / Leser` etwas bedeuten (wer darf archivieren, wer fremde Ereignisse kompensieren, wer Stammdaten pflegen)? Oder ersatzlos streichen? hb §8 liefert einen Vorschlag; v1 setzt nichts durch (B14).
2. **Statusabbildung v1 → Excel-Liste**: Ist `AKTIV → EINSATZ`, `IN_BEREITSTELLUNG → EINSATZBEREIT`, `ABGEMELDET → NICHT_EINSATZBEREIT` fachlich richtig? (§4.3, meine [Annahme])
3. **Organisationsliste**: Sind `HK/NLWKN` und `ZIV` weiterhin nötig? Sollen `BUNDESPOLIZEI` und `RETTUNGSDIENST` dauerhaft dazu (kommen aus dem EEB)?
4. **Schichtbetrieb**: 2-Schicht (Tag/Nacht) als Standard, 3-Schicht (Früh/Spät/Nacht) als Option je Einsatz – oder frei konfigurierbar?
5. **Anforderungs-ID**: Welches Format gibt die übergeordnete Führungsstelle vor (hb F-F1: „Format mit übergeordneter Stelle abgestimmt")? Freitext oder Prüfregel?
6. **Meldekopf-Prozess**: Bleibt es beim gelb/grün-Quittieren (hb F-E1) oder darf der Meldekopf direkt in die Lage schreiben, wenn er im selben Share ist? (Der Ereignis-Ansatz erlaubt beides; die Frage ist fachlich, nicht technisch.)
7. **Kostenrechnung** (F-L6): Wird sie tatsächlich genutzt oder ist sie ein Excel-Relikt? Betrifft ~10 abgeleitete Felder und eine Ausgabe.

### 10.3 Produkt-/Technikentscheidungen
1. **Peer-Update über LAN: ja oder nein?** Mein Vorschlag: **nein**, ersetzt durch Update über den Share (§2.6). Das streicht ~920 Zeilen aus v1. Falls Johannes am Peer-Update hängt, kostet der Neubau in Rust ~1,5 PW zusätzlich in M9.
2. **PDF-Ausgabe im Kern: ja oder nein?** Mein Vorschlag: **erst auf Nachfrage** (§6.3, ~1–1,5 PW).
3. **FüOrg-Editor (M6b): Pflicht für Parität oder Ausbaustufe?** Wenn Ausbaustufe, sinkt die Gesamtspanne um 2 PW.
4. **Linux-Clients: Tier 2 oder gar nicht?** Bei „gar nicht" entfällt ein Drittel der Build-Matrix.
5. **`tauri >= 2.11` als Mindestversion akzeptiert?** (Pflicht wegen Multi-Monitor-Fix #15250, nachlese-tauri §2.3.)
6. **Passwortschutz/Admin-Modus** (hb F-L3, in der Excel Klartext-Passwort, vba §5.4): in v2 weglassen oder als echte Rechteprüfung bauen?
7. **Branch-Strategie**: Bestätigung, dass `v2` im bestehenden Repo entsteht und `main` bis M10 lauffähig bleibt (§5.1).

### 10.4 Die eine Zahl, die alles bestimmt
**Wie viele Stunden pro Woche stehen realistisch zur Verfügung?** 29 PW sind bei 8 h/Woche etwa 2,5 Jahre, bei 20 h/Woche etwa 14 Monate. Wenn die Antwort „unter 10 h/Woche" lautet, ist die ehrliche Empfehlung, den **Speicherentwurf aus §3 unverändert zu nehmen, aber in TypeScript zu bauen** (−6 bis −10 PW, kein E2E-Wechsel, kein Zweisprachenpreis) – der fachliche Kern dieses Vorschlags (Ereignisprotokoll, Fold, Ausgaben aus der Projektion, EEB-Naht, Migration) ist stackneutral und überlebt diese Entscheidung.

---

*Ende. Alle Abschnitte 1–10 fertig.*
