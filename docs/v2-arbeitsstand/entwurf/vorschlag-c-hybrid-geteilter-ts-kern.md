# Vorschlag C – Hybrid mit geteiltem TypeScript-Kern

Key: `vorschlag-c-hybrid-geteilter-ts-kern`
Blickwinkel: Wiederverwendung mit erfassungsbogen.app maximieren.
Stand: ABGESCHLOSSEN (2026-09-07)

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

### 1.1 Die Leitidee in einem Satz

S1-Control v2 und erfassungsbogen.app teilen sich ein **plattformneutrales TypeScript-Kernpaket** (`@bos/kern`), das (a) das Fachmodell beider Produkte, (b) den EEB-Codec samt Signatur, (c) das Ereignisprotokoll mit deterministischem Fold und (d) die formatgebundenen Ausgaben (XLSX-Schreiber, PDF-Dokumentdefinitionen) enthält; S1-Control ist die **Electron-Hülle** dieses Kerns mit Datei-I/O auf dem NAS-Share, erfassungsbogen.app bleibt seine Web-/PWA-/Capacitor-/Electron-Hülle.

### 1.2 Warum dieser Schnitt und nicht ein anderer

Die Fachdomäne, die S1-Control v2 zusätzlich zu v1 braucht (Meldekopf-Sammlung, Revisionen je Einheit, Aufteilen/Zusammenführen, Stärke-/Verpflegungs-/Unterbringungsableitung, Oldenburg-XLSX, EEB-Codec), ist **bereits gebaut, getestet und im Feld** — nur im anderen Repo:

| Baustein | Datei | Umfang | Plattformabhängigkeit |
|---|---|---|---|
| EEB-Datenmodell + abgeleitete Werte (`staerke`, `unterbringungMWD`, `verpflegung`, `ansprechpartner`) | `einheitenerfassungsbogen/src/model.ts` | 386 Z. exportierte API, Kopfkommentar: „Plattformneutral (keine Abhängigkeiten)" | keine |
| Binär-Codec EEB2/EEB2C (Base41, Varint, Vokabular, Segmentierung) | `src/codec.ts` | 1.043 Z., Kompressor wird injiziert | keine |
| Ed25519-Signatur/Absenderkarte (TOFU) | `src/signatur.ts` | 311 Z. | nur `@noble/ed25519` |
| Meldekopf-Sammlung: Revisionen stapeln, Inhalts-Hash als ID, Fingerabdruck-Zuordnung, Papierkorb, Aufräumfristen | `src/app/einsaetze.ts` | 699 Z., davon I/O nur in der `localStorage`-Hülle ab Z. 318 | nur die Hülle |
| Aufteilen / Zusammenführen einer Meldung | `src/app/aufteilen.ts` (173 Z.), `src/app/zusammenfuehren.ts` (98 Z.) | „Reine Logik ohne Persistenz" (Kopfkommentar) | keine |
| Meldungs-Diff („was hat sich seit der letzten Meldung geändert") | `src/app/meldung-diff.ts` | 317 Z. | keine |
| Suchen/Filtern/Sortieren der Einheitenliste, Qualifikationsfilter | `src/app/einheiten-liste.ts` | 214 Z. | keine |
| Oldenburg-XLSX-Export (Spaltenlayout der Ziel-Excel) | `src/app/oldenburg-xlsx.ts` | 396 Z. | keine (nutzt `xlsx.ts`) |
| Minimaler XLSX-Schreiber (ZIP + XML, nur `pako`) | `src/app/xlsx.ts` | 272 Z. | keine |
| PDF-Dokumentdefinition (pdfmake-Struktur, keine DOM-Nutzung) | `src/app/pdf-dokument.ts` | 35 KB | keine (Bindung erst in `pdf.ts`) |
| Vokabulare: THW-StAN-Personal/-Fahrzeuge, THW-OV, Funkrufnamen, Landesvorlagen, Sitzplätze, DLRG-Qualifikationen, Ebenen | `src/vokabulare/*.ts` | 19 Dateien | keine |

Belegt: 44 Testdateien mit 684 `it(`/`test(`-Aufrufen in `einheitenerfassungsbogen`; 300 Commits, letzter 2026-09-06 (`5077edc`). Von den Kandidatenmodulen greifen **nur zwei** auf Plattform-APIs zu (`grep -ln "localStorage|document.|window."`): `einsaetze.ts` (die Hülle ab Z. 318, sauber abgetrennt und laut Kopfkommentar „getrennt und unit-getestet") und `hilfen.ts` (bewusst als „Browser-Helfer für die SPA" deklariert). Der Kern ist also nicht „theoretisch teilbar", sondern **bereits so geschnitten**.

Zugleich ist genau dieser Bereich das größte Loch von S1-Control v1: der Feldabgleich in `vollstaendigkeitskritik.md` §3.1 markiert „ID EEB / digitaler EEB", „Meldekopf-Prozess", Statusfeinheit, Schicht, Logistikzahlen und Ressourcenplanung als **fehlt**; `excel-handbuch-anforderungen.md` §7 führt sie als F-D1…F-D3, F-E1…F-E5, F-F1…F-F5, F-G1…F-G3, F-H1…F-H4. Ein Neubau von S1-Control, der diese Domäne **ein zweites Mal** implementiert (ob in TypeScript oder in Rust), verdoppelt einen sechsstelligen Zeilenbestand mit 684 Tests, den derselbe Einzelentwickler danach zweifach pflegen müsste.

### 1.3 Was daran anders ist als bei den Alternativen

| | Vorschlag A/B-Familie (Tauri + Rust-Kern-Crate; bmecat-Muster) | Vorschlag „Electron reparieren" | **Vorschlag C (dieser)** |
|---|---|---|---|
| Wo liegt die Fachdomäne | Rust-Crates `s1-model`/`s1-store` (`bmecat-stack-muster.md` §8.3) | verstreut in `src/main/services` wie heute | **ein npm-Paket `@bos/kern`, das in beiden Produkten läuft** |
| EEB-Codec | Rust-Port nötig oder TS im WebView (Doppelpflege) | vorhandener TS-Code kopierbar | **geteilt, eine Quelle, eine Testsuite** |
| Meldekopf | Neubau in S1 | Neubau in S1 | **erfassungsbogen.app *ist* der Meldekopf; S1 liest dessen Ereignisse** |
| Fold/Ereignisprotokoll | Rust, Property-Tests mit `proptest` | TS im Main-Prozess | **TS im Kern, in beiden Produkten identisch, `fast-check`-Property-Tests** |
| Zweite Sprache | ja | nein | nein |
| Desktop-Hülle | Tauri (WebView2-Offline-Problem, E2E-Wechsel, Updater-Neubau) | Electron | **Electron** (Begründung §2.2) |
| Kopplungsrisiko zweier Produkte | keines (getrennte Repos) | keines | **vorhanden und der Preis dieses Vorschlags** (§1.5) |

Die Abgrenzung zum Tauri-Weg ist damit **keine** Ablehnung von Rust an sich. Sie folgt aus dem gewählten Schnitt: Wenn die geteilte Fachdomäne TypeScript ist — und sie ist es, mit 300 Commits Vorlauf und aktiver Weiterentwicklung —, dann muss die Desktop-Hülle diesen TypeScript-Kern **außerhalb des UI-Threads mit Dateizugriff** ausführen können. Genau das kann Electron (Main-Prozess + `worker_threads`) und Tauri nicht: Tauris Rust-Seite kann kein TS ausführen, also liefe der Kern im WebView — mit den Folgen, die §2.2 aufzählt.

### 1.4 Was der Vorschlag *nicht* ist

- **Kein Monorepo-Zwang.** Der Kern kann als Workspace-Paket in einem Monorepo, als git-Submodul oder als versioniertes Tarball-Paket ausgeliefert werden. §5.4 entscheidet das (Ergebnis: **git-Submodul plus npm-`file:`-Verweis**, nicht Monorepo).
- **Keine Vereinigung der Produkte.** erfassungsbogen.app bleibt ein eigenständiges Produkt mit eigenem Release-Takt, eigener Domain, eigenem Store-Auftritt. Geteilt wird ein Paket, nicht eine Roadmap.
- **Keine Übernahme des v1-Renderers.** Der S1-Renderer wird neu aufgebaut (150-Props-Drilling, 91 Typfehler, 0 Komponententests — `vollstaendigkeitskritik.md` §3.6 Punkt 7). Der Vorschlag übernimmt aus v1 **Daten und Regeln**, nicht Komponenten (§5.3).
- **Kein Server.** Es bleibt bei Dateien auf dem Share; kein Prozess läuft auf dem NAS.

### 1.5 Das Kopplungsrisiko — ehrlich benannt

Zwei Produkte mit einem gemeinsamen Paket und unterschiedlichem Release-Takt haben vier konkrete Fehlermodi. Sie sind der Hauptpreis dieses Vorschlags:

1. **Breaking Change im Kern bremst das schnellere Produkt.** erfassungsbogen.app hat 300 Commits in gut zwei Monaten (`git log`: erster relevanter Stand Jul 2026, letzter 2026-09-06) — S1-Control v2 wird in Phasen mit anderer Taktung entwickelt. Ändert S1 eine Kern-Signatur, muss erfassungsbogen.app nachziehen, bevor es sein nächstes Release baut.
   → Gegenmaßnahme: Der Kern ist **additiv-only** (dieselbe Regel, die das EEB-Schema schon lebt: `SCHEMA_VERSION = 8`, `transportSchemaVersion()` wählt die kleinste Version, die ein Bogen braucht — `model.ts:12,23`). Feldzugänge ja, Feldumbenennungen nein; Ersetzen läuft über „neu einführen, alt als deprecated behalten, in einem eigenen Aufräum-Release entfernen".
2. **Der Kern wird zum Sammelbecken.** Sobald „geteilt" bequem ist, wandert S1-Spezifisches (Abschnitts-Baum, Führungsstruktur, Record-Locks) in den Kern und bläht erfassungsbogen.app auf — für eine PWA, die per Mobilfunk geladen wird, ist Bundle-Größe ein echtes Kriterium.
   → Gegenmaßnahme: **harte Aufnahmeregel** (§5.4): In `@bos/kern` kommt nur, was *beide* Produkte aufrufen. Alles S1-Eigene liegt in `@s1/domaene`, das von `@bos/kern` abhängt, aber nie umgekehrt. Durchgesetzt per `eslint-plugin-import`-Regel „`@bos/kern` darf nichts aus `@s1/*` importieren" plus Bundle-Größen-Budget im CI von erfassungsbogen.app.
3. **Ein Fehler im Kern trifft beide Produkte gleichzeitig, mitten im Einsatz.** Ein Fold-Fehler in S1 und ein Codec-Fehler im Bogen sind dann derselbe Vorfall.
   → Gegenmaßnahme: Der Kern hat eine eigene, vollständige Testsuite (heute schon 684 Tests) und wird **nur versioniert freigegeben**; jedes Produkt pinnt einen Commit/Tag und zieht bewusst nach — kein „floating main". Das ist der Grund für Submodul statt Monorepo (§5.4).
4. **Ein-Personen-Team: der Kern hat keinen zweiten Leser.** Was in bmecatEditor die Konzeptdokumente leisten (`bmecat-stack-muster.md` M29/M30), muss hier die Kern-Spezifikation leisten: `docs/datenmodell.md` (26,7 KB) existiert bereits für den Bogen; für Ereignisprotokoll und Fold muss ein gleichwertiges Dokument entstehen, **bevor** Code geschrieben wird (§8, M0).

Wenn eine dieser Gegenmaßnahmen nicht durchhaltbar erscheint, ist der ehrliche Ausweg **nicht** ein Rust-Kern, sondern der Verzicht auf das Teilen: Dann kopiert S1 `model.ts`/`codec.ts`/`signatur.ts` einmalig (Vendoring mit festgehaltener Herkunftsversion) und pflegt sie getrennt weiter. Das kostet Doppelpflege bei jedem EEB-Schemaschritt (heute: 8 Schritte in gut einem Jahr), ist aber betriebssicher. §5.4 nennt die Abbruchbedingung.

---

## 2. Stack und Prozessmodell

### 2.1 Der Stack in einer Tabelle

| Schicht | Wahl | Begründung / Beleg |
|---|---|---|
| Sprache durchgehend | TypeScript (Ziel: TS 7, wie `einheitenerfassungsbogen/package.json` „typescript": "^7.0.2") | eine Sprache für Kern, Hülle, Tests, CLI; keine Typdrift über eine FFI-Grenze |
| Desktop-Hülle S1 | **Electron** (Ziel 43.x, wie erfassungsbogen.app „electron": "^43.4.0") | §2.2 |
| UI | React 19 + Vite (beide Produkte schon so) | gemeinsame Komponenten-Idiome, gemeinsamer Vite-Setup |
| Kern | `@bos/kern` (plattformneutrales TS, keine `node:`- und keine DOM-Importe) | §1.2, §5 |
| S1-Fachschicht | `@s1/domaene` (Abschnitte, Führungsstruktur, Ressourcen, Schicht, Kosten, FüSt-Personal) | darf `@bos/kern` nutzen, nie umgekehrt |
| Speicherschicht | `@s1/speicher` (Ereignisprotokoll-Dateien, Poll, Spiegel, Snapshots) — nutzt `node:fs` | läuft nur in Electron/Node, nicht im Browser |
| Nebenläufigkeit | `worker_threads`: ein **Kern-Worker** je geöffnetem Einsatz | alle Share-I/O außerhalb des Main-Threads (nas §8.3: SMB `SessTimeout` 60 s; s1-main R-MAIN-1) |
| Persistenz lokal (Projektion) | zunächst In-Memory-Projektion; SQLite (`better-sqlite3`) erst, wenn Auswertungen es fordern | nas §6: „In-Memory-Struktur des Folds + Indizes reicht für <5.000 Einheiten problemlos"; SQLite ausschließlich **lokal**, nie auf dem Share |
| Paketierung | electron-builder (nsis / dmg+zip / deb+pacman) | identisch zu beiden Bestandsprojekten; CI-Median 5:16 min (`nachlese-build-ci-latenz-messwerte.md` §3.1) |
| Update | electron-updater (Internet) **+ eigene Share-Ablage** (offline) | §2.5 |
| Tests | vitest (Unit/Property), Playwright + playwright-bdd (E2E), `@testing-library/react` | beide Repos nutzen vitest; S1 hat playwright-bdd mit 10 Szenarien, erfassungsbogen.app cucumber-js — §7 |

### 2.2 Warum Electron und nicht Tauri — für **diesen** Schnitt

Die Stack-Frage ist bei Vorschlag C nicht offen, sondern eine Folge der Kernaufteilung. Ein plattformneutraler TS-Kern, der das Ereignisprotokoll faltet, muss dort laufen, wo die Dateien liegen.

**In Electron** läuft `@bos/kern` + `@s1/speicher` im Main-Prozess bzw. in einem `worker_thread`: ein Prozess besitzt die Wahrheit, beide Fenster (Hauptfenster, Stärke-Monitor) sind reine Sichten, die dieselbe Projektion abonnieren. Das ist die Architektur, die AGENTS.md §1–2 von v1 ohnehin fordert („Renderer ohne I/O, Main einzige I/O-Schicht", s1-main §10) — nur diesmal eingehalten.

**In Tauri** gibt es diesen Ort nicht. Rust kann kein TypeScript ausführen. Es blieben drei Wege, alle schlechter:

1. **Kern im WebView.** Der Fold läuft im Renderer, Rust ist nur Dateitransport. Folgen: (a) Der Stärke-Monitor ist ein **zweiter, getrennter JS-Kontext** (`bmecat-stack-muster.md` R8) — es gäbe zwei Kern-Instanzen mit zwei Zuständen, oder das Monitorfenster braucht einen eigenen Zustandsweg über Rust-Events; (b) der Fold über zehntausende Ereignisse blockiert den UI-Thread, es sei denn, man legt ihn in einen Web-Worker — dann liegt die Wahrheit in einem Worker eines Fensters, das der Nutzer schließen kann; (c) CLI-Werkzeuge („Einsatzakte prüfen/exportieren") bräuchten trotzdem eine Node-Laufzeit.
2. **Kern in Rust nachbauen.** Genau die Doppelimplementierung, die dieser Vorschlag vermeidet: EEB-Codec (1.043 Z.), Bogenmodell (386 exportierte Symbole), Sammlung/Revisionen (699 Z.), Aufteilen/Zusammenführen (271 Z.), Diff (317 Z.), XLSX-Schreiber (272 Z.) — plus deren 684 Tests, plus die laufende Nachpflege bei jedem EEB-Schemaschritt.
3. **Node als Sidecar neben Tauri.** Dann trägt der Installer Node *und* WebView2 — der Größenvorteil von Tauri ist weg, die Komplexität höher als bei Electron.

Dazu kommen die Kosten, die für S1 unabhängig vom Kern gelten und in den Berichten belegt sind: WebView2 offline (`fixedRuntime` ≈ 180 MB oder `offlineInstaller` ≈ 127 MB, R1) — bei Electron ist der Installer **per Konstruktion offline vollständig**; E2E-Werkzeugwechsel weg von playwright-bdd (R6); Updater- und Peer-Neubau (R11); der Renderer wäre ohnehin neu (Kritik §3.6 Punkt 7). Gegenwert wären kleinerer Installer, weniger RAM, Rust-Typsicherheit im Kern — alle drei sind hier nicht die Engpässe.

Was Vorschlag C von Tauri **übernimmt**, ohne Tauri zu übernehmen (aus `bmecat-stack-muster.md` §8.1): M1 (UI-freier Kern mit CLI-Bins → hier `s1` als Node-CLI), M3 (ein Fehler-Enum, serialisierbar an die UI), M7–M10 (Guard/Worker-Muster gegen doppelt laufende Hintergrundläufe), M12 (Ereignis-Namensschema `<bereich>:<zustand>`), M13 (Fortschritts-Drossel 150 ms), M15 (Aufräumen verwaister Temp-Dateien beim Start, nur eigene), M16 (Schema-Version + Migrationskette mit Test je Stufe), M20 (Bundle-Ressource + überschreibbare Nutzerkopie für StAN-Daten), M25 (ESLint-Flat-Config), M29/M30 (§-nummerierte Konzeptdokumente mit Alternativen, Risiken, DoD), M31 (Messwert an jeder Performance-Aussage). Nicht übernommen: M4 (`Result<_,String>`), M24 (eine globale CSS-Datei), M33 (`csp: null`).

*(Einschränkung, ehrlich: Bleibt die Kernaufteilung nicht bestehen — verwirft Johannes also §1 —, fällt das Hauptargument gegen Tauri weg. Vorschlag C steht und fällt mit dem geteilten TS-Kern.)*

### 2.3 Prozess- und Fenstermodell

```
Electron-Hauptprozess (Node 26)
├─ FensterVerwaltung      Hauptfenster (index.html), Monitorfenster (monitor.html)
├─ IPC-Vermittlung        typisierte Kanäle, keine Fachlogik (v1-Muster beibehalten)
├─ EinstellungenSpeicher  %APPDATA%/S1-Control/einstellungen.json (zuletzt geöffnet, Sharepfad, clientId)
├─ AktualisierungsDienst  electron-updater + Share-Ablage (§2.5)
└─ je geöffnetem Einsatz: Kern-Worker (worker_thread)
   ├─ @s1/speicher   Poll-Schleife (2 s), Anhängen an die EIGENE Ereignisdatei, fsync,
   │                 lokale Spiegelung, Snapshot-Politik, alle Aufrufe mit 5-s-Timeout
   ├─ @bos/kern      Fold über die vereinigte Ereignismenge, HLC-Ordnung, Konfliktregeln
   ├─ @s1/domaene    Projektionen: Führungsstruktur, Stärken, Logistik, Kosten, Schicht, ETB
   └─ UDP            Änderungshinweis (Unicast an Presence-Peers + Broadcast, Port 41235)
        │
        └─ postMessage: { projektionVersion, geaenderteBereiche[], konflikthinweise[] }
Renderer „Hauptfenster"   React 19, liest Projektionen, sendet Kommandos (nie Ereignisse)
Renderer „Stärke-Monitor" React 19, dieselbe Projektion, nur Anzeige
```

Regeln, die daraus folgen und die in v1 verletzt waren (s1-main §3c):
- Der Renderer hat **kein** `fs`, keinen Sharepfad, keinen Zustand, der Wahrheit wäre.
- Der Main-Prozess hält **keinen** Fachzustand; er routet. Der Zustand lebt im Kern-Worker.
- Ein Kommando (`einheit:verschieben`) erzeugt im Worker **ein oder mehrere Ereignisse**, die zuerst lokal, dann auf dem Share landen; die UI wartet auf die neue Projektionsversion, nicht auf den Share.
- Blockierende Share-Operationen können den Worker anhalten, nie das UI. Fällt der Worker aus, zeigt das UI „Speicher nicht erreichbar" und bleibt bedienbar (Lesen aus der letzten Projektion).

### 2.4 Stärke-Monitor auf dem Zweitbildschirm

Fachliche Anforderung (Excel-Pendant F-K6 „Live-Monitor", `excel-handbuch-anforderungen.md` §7): eine große, aus mehreren Metern lesbare Anzeige der Gesamt- und Bereichsstärken mit „Stand: <Zeit>".

Umsetzung: zweites `BrowserWindow` mit eigenem Vite-Einstieg `monitor.html` auf dem ersten Nicht-Primärmonitor (`screen.getAllDisplays()`, Fallback Primär — Logik aus v1 `src/main/services/strength-display.ts:144-148` übernehmbar), rahmenlos, nicht verschiebbar, schwarzer Hintergrund. **Weggelassen** wird die Prewarm-Akrobatik (120-ms-Timer, Splash-HTML, Health-Abfrage, SLO-Skript `scripts/check-strength-monitor-slo.cjs`), wie s1-main §10 empfiehlt: Das Fenster ist eine Route auf dieselbe Projektion und braucht keine Sonderbehandlung.

Zusätzlich, und *nicht* dasselbe: die **HTML-Lagemonitor-Datei** der Excel (`m_htmlExport`, F-K6: „periodisch als statische HTML-Datei an einen Netzort exportieren, Browser/Tablet lädt alle 60 s neu"). Die bleibt als eigenes Ausgabeprodukt erhalten (§6), weil sie ein anderes Publikum bedient: Tablets in der Lagekarte ohne S1-Installation. Der Kern-Worker schreibt sie auf Wunsch alle *n* Minuten in einen konfigurierbaren Ordner (Share oder lokal) — als Datei, nicht als Server.

Randfall, den v1 schon kennt und der bleiben muss: Zweitmonitor zur Laufzeit an-/abgesteckt → Zielmonitor neu bestimmen und Fenster nachziehen (`setBounds`, v1 `:189-192`).

### 2.5 Build, Installer und Aktualisierung

**Build.** `vite build` mit zwei Einstiegen (`index.html`, `monitor.html`) → Renderer; `tsc`/`esbuild` → Main + Preload + Kern-Worker; `electron-builder` → Artefakte. Ziele wie heute: `nsis` (Windows x64), `dmg`+`zip` (macOS), `deb`+`pacman` (Linux). CI-Erwartung: die gemessenen **5:01–6:06 min Wandzeit je Push** (Median 5:16, kritischer Pfad `build-win` 239 s; `nachlese-build-ci-latenz-messwerte.md` §3.1) bleiben gültig, weil sich am Bauverfahren nichts ändert — plus die zusätzlichen Kern-Tests im `test`-Job (heute 30–45 s).

**Windows-Installer offline.** Der NSIS-Installer von electron-builder enthält die vollständige Chromium-/Node-Laufzeit; er braucht zur Installation **kein Internet**. Das ist gegenüber Tauri der Punkt, der ohne Aufwand erfüllt ist (dort: R1, `fixedRuntime` ≈ 180 MB im Repo/CI-Cache oder `offlineInstaller` ≈ 127 MB). Preis: Artefaktgröße in der Größenordnung 90–120 MB [Annahme, aus heutigen S1-Releaseassets nicht neu gemessen] und die Chromium-Sicherheitsaktualisierungen als Dauerlast.
Nicht gelöst und unverändert gegenüber heute: **keine Windows-Codesignatur** (R13) → SmartScreen-Warnung beim ersten Start; Gegenmaßnahme organisatorisch (Installation durch die FüSt-IT, Prüfsumme im Begleitzettel), nicht technisch.

**Aktualisierung, zwei Wege.**
1. *Mit Internet* (Ortsverband, Vorbereitung): `electron-updater` gegen die GitHub-Releases, wie in erfassungsbogen.app bereits konfiguriert (`package.json` build.publish: provider `generic`, URL `…/releases/latest/download`, `generateUpdatesFilesForAllChannels: true`). Versionsvergleich für Zeitstempel-Buildnummern ist in v1 gelöst und übernehmbar (`src/main/services/updater-versioning.ts`, s1-main §10 „übernehmen").
2. *Ohne Internet* (Einsatznetz): **Update-Ablage auf demselben Share.** Verzeichnis `\\NAS\…\S1-Control\programm\` mit `aktuell.json` (Version, Dateiname, SHA-256, Mindest-Schemaversion) und den Installerdateien. Jeder Client prüft beim Start und danach stündlich diese eine Datei, lädt bei neuerer Version den Installer in `%APPDATA%\S1-Control\update-cache\`, prüft die Prüfsumme und bietet „Jetzt aktualisieren" an (Installer starten, App beenden). Ein FüSt-Rechner mit Internet (oder ein USB-Stick) befüllt die Ablage — ein Vorgang, den die FüSt bereits kennt.
   Das **ersetzt das LAN-Peer-Update von v1** (796 + 123 Zeilen, `update-peer*.ts`, im Code standardmäßig deaktiviert), das s1-main §10 unter „weglassen" führt. Begründung: Die Ablage nutzt genau die Infrastruktur, die ohnehin Voraussetzung ist (das NAS), ist zustandslos, in ~200 Zeilen prüfbar und braucht weder UDP-Discovery noch HTTP-Serve noch Firewall-Freigaben. Falls Johannes das Peer-Update als harte Anforderung setzt (§10, Punkt 7), wird es nachgezogen — dann aber gegen dieselbe `aktuell.json`-Beschreibung, nicht als eigenes Protokoll.

---

## 3. Speicher- und Sync-Modell auf dem NAS-Share

### 3.1 Entscheidung zum Widerspruch: Ereignisprotokoll, nicht Lockfile-Portierung

**Entschieden: Append-only-Ereignisprotokoll mit genau einem Schreiber je Datei, HLC-Ordnung, deterministischem Fold und lokaler Materialisierung** — also `nas-speicher-recherche.md` §10 (Option C, ausgebaut zu E). Die Empfehlung aus `bmecat-stack-muster.md` §9 R9 („heutiges S1-Modell 1:1 in `s1-store`/`s1-net` portieren, plus optimistische Konflikterkennung") wird **verworfen**.

Fünf Gründe, in der Reihenfolge ihres Gewichts:

1. **Der Portierungsvorschlag beruht auf einer Prämisse, die widerlegt ist.** R9 begründet die Portierung damit, dass die Mechanismen „heute in TS funktionieren und getestet sind" (§9 Gesamteinschätzung). Die Laufzeitreproduktion (`vollstaendigkeitskritik.md` §3.4, `scratchpad/repro/lost-update.ts`) zeigt das Gegenteil: zwei Kontexte auf einer Datei, A schreibt `[A1]`, B schreibt `[B1]`, A1 ist weg — und `writeSeq` bleibt bei 1, weil B seinen In-Memory-Zähler zurückschreibt. Portiert würde also ein Modell, das im Mehrbenutzerbetrieb nachweislich Daten verliert. Der bmecat-Bericht kannte diesen Befund nicht (`nachlese-speichermodell-widerspruch-aufloesen.md` §1.1, letzter Absatz).
2. **Die vorgeschlagene Reparatur ist kein Zusatz, sondern ein anderer Schreibpfad.** „`writeSeq` beim Schreiben prüfen" setzt ein Re-Read vor jedem Schreiben voraus, das es heute nicht gibt (`connection.ts:52-58` schreibt `ctx.einsatz` blind; `mutateEinsatzFile` hat null Aufrufer, s1-main §3c). Wer das einbaut, hat das Modell ohnehin ersetzt — dann kann er gleich das bessere nehmen.
3. **Der Lock ist über SMB nicht sauber definierbar.** `file-lock.ts:20` erwirbt atomar (`wx`), aber die Stale-Übernahme in `:25-27` vergleicht `Date.now()` mit einem fremden Zeitstempel (zwei Uhren, ohne NTP) und schreibt dann **ohne** `wx` (nicht atomar, keine Verifikation); `unlinkSync` im `finally` prüft nicht, ob der Lock noch der eigene ist (`:51-55, 71-75`). Dazu die belegten SMB-Eigenschaften (nas §1.2–§1.7): FileNotFound-Cache 5 s, Directory-/FileInfo-Cache 10 s, Oplock-/Lease-Breaks, `SessTimeout` 60 s, fehlendes `fsync`, mögliches Rename-EBUSY. Jede dieser Eigenschaften trifft den Lockfile-Pfad; **keine** trifft den Append-only-Pfad, weil dort niemand fremde Dateien anfasst (nas §10 Punkt 1).
4. **Nur das Ereignisprotokoll liefert, was die Excel fachlich verlangt.** F-E2 „Meldekopf-Einträge werden nicht gelöscht", F-E3 „eigenes ETB, Teil des ETB der FüSt", N-6 „Nachvollziehbarkeit: Zeitstempel überall, Verlaufskopien, unlöschbare Historie, Archivbereich", F-L2 „ein Nachfolger sollte echtes Undo/Änderungsprotokoll bieten" (`excel-handbuch-anforderungen.md` §7). Ein Dokumentmodell mit Ganzdatei-Ersetzung müsste das ETB als zweiten Mechanismus danebenbauen; im Ereignismodell **ist** das Protokoll die Datenhaltung.
5. **Der geteilte Kern passt strukturell auf dieses Modell und nicht auf das andere.** Die Meldekopf-Sammlung in erfassungsbogen.app ist bereits ein Append-Store: Revisionen werden gestapelt statt ersetzt, die Eintrags-ID ist der **Inhalts-Hash** des Bogens (`bogenInhaltsId`, `einsaetze.ts:249`) — derselbe Inhalt erzeugt keine zweite Revision (Idempotenz), `neuesteJeEinheit()` (`:264`) ist ein Fold, `revisionen()` (`:274`) ist die Historie. Wer dieses Modell in S1 auf eine Ganzdatei mit Lock abbildet, muss es umbauen; wer es auf ein Ereignisprotokoll abbildet, muss es nur einbetten. Das ist der Hebel, der die Google-Tabelle der Excel entfallen lässt (§3.9).

Was aus R9/M19 **übernommen** wird: Änderungserkennung per **Polling**, nicht per Watcher; UDP nur als Beschleuniger (R10, nas §8.1, s1-main §10 — hier sind sich alle drei Berichte einig). Und M16: `schemaVersion` je Ereignis mit Migrationskette und Test je Stufe.

Was **nicht** aus nas §10 übernommen wird — eine bewusste Abweichung, siehe §3.6 Regel K4: Stärkeänderungen werden **nicht** als additive Ereignisse (`+/-`) modelliert, sondern als absolute Meldestände mit LWW.

### 3.2 Dateilayout auf dem Share

Grundlage: `nas-speicher-recherche.md` §11, ergänzt um Meldekopf-Bündel, Programm-Ablage (§2.5) und Ausgaben.

```
\\NAS\Einsatz\S1-Control\
  manifest.json                       # create_new, einmalig: formatVersion, mindestAppVersion
  programm\                           # Update-Ablage (§2.5)
    aktuell.json                      # version, datei, sha256, mindestFormatVersion
    S1-Control-Setup-2026.09.14.nn.exe
  stammdaten\
    thw-stan-2025.json                # immutable je Version, Dateiname = Version (M20)
    vorlagen-kats-nds-2026.json
  einsaetze\
    2026-09-14_hochwasser-hunte_7f3a\ # <datum>_<slug>_<kurzid>, Ordnername unveraenderlich
      einsatz.json                    # create_new: id, angelegtAm, anlegenderClient, formatVersion
      ereignisse\
        c-9b12ef-fuest-laptop1.000001.jsonl   # EIN Schreiber je Datei
        c-9b12ef-fuest-laptop1.000002.jsonl   # neues Segment ab 8 MB oder je Programmstart
        c-44d0a3-meldekopf-br1.000001.jsonl   # Meldekopf schreibt selbst (§3.9)
        c-7c31aa-uebernommen-mk2.000001.jsonl # per Datei uebergebenes Buendel, fremder Besitzer
      schnappschuesse\
        20260914T141233Z-c-9b12ef.json        # immutable: zustand + versionsvektor + blake3
      praesenz\
        c-9b12ef-fuest-laptop1.json           # EINZIGE ueberschriebene Datei, nur eigene, rein informativ
      anhaenge\
        <blake3>.pdf                          # EEB-Scans, Fotos; immutable, inhaltsadressiert
      ausgaben\                               # erzeugte Dokumente (Druck-PDF, Log-XLSX, HTML-Monitor)
      archiv.marker                           # create_new; danach lehnt der Fold neue Ereignisse ab
  archiv\
    2026-08-12_uebung-ammerland_1c9e.zip      # Einsatzakte (§3.8)
```

Lokal je Client (`%APPDATA%\S1-Control\` bzw. `~/Library/Application Support/S1-Control/`):
```
einstellungen.json          # clientId, sharePfad, zuletztGeoeffnet[], anzeigeoptionen
einsaetze\<ordner>\
  ereignisse\<eigene>.jsonl # WIRD ZUERST GESCHRIEBEN (local-first)
  ereignisse\<fremde>.jsonl # gespiegelte Kopie fremder Dateien
  schnappschuesse\
  uebertragung.json         # hochgeladenOffset je eigener Datei, gelesenOffset je fremder Datei
```

**Harte Regeln**
- Nur `create_new` (Flag `wx`) und `append`. Kein Client benennt fremde Dateien um, überschreibt oder löscht sie. Einzige Ausnahme: die **eigene** Präsenzdatei.
- Nach jedem angehängten Ereignis `fsync` (`fs.fsyncSync`; nas §1.9 — SMB2 FLUSH). Genau das fehlt heute (`einsatz-store.ts:19-23`, kein `fsync`, s1-main R-DATA-5).
- Zeilenformat: `<len>\t<crc32>\t<json>\n`. Leser prüfen `len` und `crc32` und **verwerfen eine unvollständige letzte Zeile**; der Besitzer kürzt beim Start auf die letzte gültige Zeile. Teilschreiben ist damit harmlos.
- `clientId = "c-" + 6 Byte Zufall (hex) + "-" + slug(hostname)`. Beim Start prüft der Client, ob das Ende seiner Share-Datei zu seinem lokalen Übertragungsoffset passt; passt es nicht (geklontes Windows-Image mit kopiertem `%APPDATA%`, nas Restrisiko 4), beginnt er eine **neue Dateigeneration** mit neuer `clientId` und meldet das im ETB.

### 3.3 Aufbau eines Ereignisses

```jsonc
{
  "id":      "c-9b12ef:000123",          // clientId + laufende Nummer, global eindeutig
  "hlc":     "1kq3x9.0007.c-9b12ef",     // Sortierschluessel (§3.5)
  "wanduhr": "2026-09-14T14:12:33+02:00",// nur Anzeige/ETB, NIE Sortierung
  "akteur":  { "benutzer": "Rudolph", "rolle": "S1", "rechner": "fuest-laptop1" },
  "typ":     "EinheitVerschoben",
  "v":       1,                           // schemaVersion DIESES Ereignistyps (M16)
  "nutzlast":{ "einheitId": "e-3f21", "abschnittId": "a-0004", "position": 3,
               "mitFahrzeugen": true, "grund": "Ablösung EA 2" },
  "widerruftId": null,                    // Kompensationsereignis
  "vorherHash": "b3:9c1f…"                // Hash der vorherigen Zeile DERSELBEN Datei (Kette)
}
```

Die Hash-Kette je Client-Datei (nas §8.4) macht nachträgliche Änderungen erkennbar — das ist der Ersatz für „Revisionssicherheit" ohne PKI. Für Meldekopf-Ereignisse kommt die vorhandene Ed25519-Signatur aus `signatur.ts` hinzu (§3.9).

### 3.4 Sichtbarkeit fremder Änderungen (Poll + UDP)

- **Poll-Schleife im Kern-Worker, 2 s** (nas §11): `readdir(ereignisse/)` für neue Dateien, dann je bekannter Datei `open` + `read` **ab bekanntem Offset**. Bewusst kein `stat`/`mtime` als Auslöser: Daten-Reads am bekannten Offset umgehen den Attribut-Cache; Größe wäre der bessere Indikator als `mtime`, ist aber über den FileInfo-Cache ebenfalls bis 10 s alt (nas §1.2, §4 „Erkennen neuer Daten").
- **UDP als Beschleuniger** (Port 41235, wie v1 `einsatz-sync.ts`): Nutzlast künftig `{clientId, datei, offset}` statt `dbPath` (s1-main §10). Versand als **Unicast an die IPs aus `praesenz/`** plus Broadcast als Bonus (nas §8.1: Broadcast scheitert an WLAN-Client-Isolation, falschem Adapter, Firewall, Subnetzgrenzen).
- **Erwartete Sichtbarkeitslatenz:** mit UDP < 1 s; ohne UDP typisch 2–4 s für **wachsende** Dateien, bis **10 s** für die **erste** Datei eines neuen Clients (Windows-Directory-Cache, nas §1.2). Das ist für Lageführung tolerierbar, muss aber sichtbar sein: die UI zeigt je Peer „Stand: vor 8 s" und markiert Peers, von denen länger als 60 s nichts kam.
- Ein OS-Watcher (`fs.watch`) läuft nur auf **lokalen** Pfaden, nie auf dem Share (nas §1.5).
- **Nicht gemessen und offen:** die realen SMB-Roundtrip-Zeiten. `nachlese-build-ci-latenz-messwerte.md` §1 stellt fest, dass auf der Entwicklungsmaschine kein Share gemountet ist. Das Poll-Intervall von 2 s ist damit eine begründete Setzung, kein Messergebnis; M0 (§8) misst es nach.

### 3.5 Uhren ohne NTP

- Technische Ordnung ausschließlich über eine **Hybrid Logical Clock** (nas §8.2, §1.11). Implementierung als `@bos/kern/hlc.ts` (~120 Zeilen, reine Funktion `hlcNext(lokal, gesehen, jetztMs) -> hlc`), nicht als Fremdabhängigkeit — sie muss in Browser, Node und Capacitor identisch laufen und ist der am dichtesten getestete Teil des Kerns (Property-Tests, §7).
- Sortierschlüssel: `(physisch, zaehler, clientId)` lexikografisch. Deckelung der Abweichung: Übersteigt ein empfangenes Ereignis die lokale Uhr um mehr als **5 Minuten**, wird es **trotzdem angenommen** (Einsatzbetrieb geht vor), aber die UI zeigt „Uhr dieses Rechners weicht um X ab" und das ETB vermerkt es.
- **Fachliche** Zeitpunkte (Meldezeit, Eintreffen, Einsatzende, Verfügbar-bis) sind **Nutzereingaben** mit Vorschlag aus der lokalen Uhr und jederzeit korrigierbar — wie im Papier-ETB und wie in der Excel (Strg+D setzt „jetzt", F-C6). Sie werden nie zur Ordnung verwendet.
- Alle TTL-/Stale-Mechanismen von v1 (Lock-Stale 10 s, Record-Lock-TTL 45 s, Präsenz-Stale 2 min, Master-Wahl über `startedAt`) **entfallen**, weil sie fremde Uhren vergleichen. Präsenz bleibt rein informativ; „wer bearbeitet gerade dieselbe Einheit" wird als *Hinweis* aus den letzten Ereignissen abgeleitet, nicht als Sperre.

### 3.6 Fold- und Konfliktregeln in Grundzügen

Der Fold ist eine reine Funktion `falte(ereignisse: Ereignis[]) -> {zustand, konflikthinweise[]}` über die **deterministisch sortierte Gesamtmenge**. Daraus folgt Ordnungsunabhängigkeit (dieselbe Menge ⇒ derselbe Zustand, egal in welcher Reihenfolge sie ankam) — genau das prüfen die Property-Tests in §7.

| # | Fall | Regel | Begründung |
|---|---|---|---|
| K1 | Zwei Clients ändern dasselbe Feld | **LWW je Feld** nach HLC | Standard; kommutativ und idempotent über die sortierte Menge |
| K2 | Einheit in einen inzwischen aufgelösten Abschnitt verschoben | Einheit landet im **aufnehmenden Abschnitt** des Auflösungs-Ereignisses (ersatzweise Bereitstellungsraum), **Konflikthinweis** | nas §4 (b); nichts darf „verschwinden" |
| K3 | Abschnitts-Zyklus durch gleichzeitiges Umhängen | Ereignis mit **kleinerem HLC gewinnt**, das andere wird No-Op mit Hinweis | v1 hat die Zyklusprüfung bereits (`validations.ts:12-35`), sie wird zur Fold-Regel |
| K4 | Gleichzeitige Stärkemeldung 1/2/9 vs. 1/1/8 | **LWW absolut**, plus Konflikthinweis, wenn zwei Clients binnen 120 s verschiedene Absolutwerte für dieselbe Einheit melden | **Abweichung von nas §4 (a):** Stärke ist in dieser Domäne kein Zähler, sondern ein gemeldeter Stand („die Einheit meldet: wir sind jetzt 1/2/9"). Additive Ereignisse würden zwei unabhängige Meldungen desselben Stands verdoppeln. Dieselbe Semantik hat die Bogen-Sammlung bereits: `neuesteJeEinheit()` nimmt die neueste Revision, nicht die Summe |
| K5 | Löschen vs. gleichzeitiges Bearbeiten | **Tombstone gewinnt**, Bearbeitung wird als Hinweis protokolliert | nas §4 (d) |
| K6 | Zwei Clients scannen denselben EEB-QR | **idempotent**: Ereignis-Identität ist `bogenInhaltsId` (Inhalts-Hash) → zweite Meldung erzeugt keine zweite Revision | vorhandene Regel aus `einsaetze.ts` Kopfkommentar („IDEMPOTENZ") |
| K7 | Neue Meldung derselben Einheit (Mehrtageslage) | **Revision stapeln**, neueste zählt in Summen, alte bleiben lesbar | F-E2 / `einsaetze.ts` („HISTORIE STAPELN") |
| K8 | Zuordnung Meldung→Einheit | Fingerabdruck `einheitSchluessel(e)` **schlägt vor**, ein Mensch bestätigt per `MeldungEinheitZugeordnet` | „kein hartes Auto-Merge" (`einsaetze.ts` Kopfkommentar) — dieselbe Regel im S1-Fold |
| K9 | Einheit geteilt / zusammengeführt | Ereignisse `EinheitGeteilt` / `EinheitenZusammengefuehrt` rufen `teileBogen()` / `fuegeZusammen()` aus dem Kern auf; Teil-Schlüssel über `freierTeilSchluessel()` | vorhandene, getestete Logik (`aufteilen.ts`, `zusammenfuehren.ts`, `einsaetze.ts:226`) |
| K10 | Ereignis nach `archiv.marker` | Fold **lehnt ab** und erzeugt Hinweis (keine Dateisperre) | nas §11 |
| K11 | Unbekannter Ereignistyp (neuerer Client) | **durchreichen, nicht verwerfen**: im ETB als „unbekanntes Ereignis (Typ X, v Y) — bitte aktualisieren" anzeigen, Zustand unverändert | nas Restrisiko 3 |
| K12 | Undo | **Kompensationsereignis** `widerruftId`; nur eigene Ereignisse, nur die letzten *n* der eigenen Sitzung; fremde nur als expliziter, protokollierter Vorgang mit Rolle | nas §4; v1 hat Undo nur für MOVE und im Mehrclient undefiniert |

Konflikthinweise sind **Daten**, keine Dialoge: Sie erscheinen im ETB und als Zähler in der Statusleiste („3 Hinweise"), blockieren aber nie eine Eingabe. Beim Wiederanschluss nach NAS-Ausfall gibt es dadurch **keinen** Konfliktdialog (nas §8.3).

**Schnappschüsse.** Ein Client, der ≥ 5.000 Ereignisse seit dem letzten Schnappschuss gefaltet hat und 60 s nichts Neues sah, schreibt `schnappschuesse/<hlc>-<clientId>.json` (`create_new`) mit Zustand, Versionsvektor und blake3-Hash. Leser laden den neuesten und falten nur, was der Versionsvektor nicht abdeckt. Kollisionen zweier Clients sind harmlos (beide gültig). Schnappschüsse sind **immer verwerfbar** — Wahrheit sind die Ereignisse; ein Leser prüft stichprobenartig gegen Neu-Fold (nas Restrisiko 5).

### 3.7 Offline-Betrieb bei NAS-Ausfall

Local-first ist der **Normalpfad**, nicht der Sonderfall (nas §4/§8.3):
1. Jedes Kommando erzeugt Ereignisse, die **zuerst** in die lokale eigene Datei geschrieben und `fsync`t werden. Die UI ist danach fertig — sie wartet nie auf den Share.
2. Ein Übertragungsschritt hängt ab `hochgeladenOffset` an die Share-Datei an. Schlägt er fehl (Timeout 5 s, `ENOENT`, `EBUSY`, Netz weg), bleibt der Offset stehen und der Versuch wiederholt sich; die Statusleiste zeigt „Speicher nicht erreichbar seit hh:mm — lokal weitergeführt".
3. Bei Rückkehr wird ab Offset weiter angehängt. Kein Merge-Schritt, kein Dialog: die Fold-Regeln gelten unverändert, die HLC ordnet die verspäteten Ereignisse korrekt ein.
4. Fremde Änderungen fehlen währenddessen — das ist unvermeidbar und wird angezeigt (Peer-Liste mit „zuletzt gesehen").
5. **Ein Client kann einen Einsatz vollständig ohne Share führen** (lokaler Ordner als „Share"), und die Einsatzakte später per Bündeldatei (§3.9) in einen gemeinsamen Einsatz einspeisen. Das ist der Weg für einen Meldekopf ohne Netz — und der Ersatz für die Google-Tabelle.

### 3.8 Backup, Archiv, Export der Einsatzakte

- **Backup ist trivial und braucht keinen Mechanismus:** Alle Dateien sind append-only oder immutable; ein Ordner-Kopieren zu jedem Zeitpunkt liefert einen konsistenten Stand (es gibt keine „offene Datenbank"). Zusätzlich hält **jeder** Client eine vollständige lokale Kopie → n+1 Kopien ohne Zutun. Damit entfällt die 5-Minuten-Vollkopie von v1 (ohne Rotation, 112 Dateien im Beispielordner).
- **Archivieren:** `archiv.marker` per `create_new` durch einen Client mit FüSt-Rolle. Danach lehnt der Fold neue Ereignisse ab (K10). Ein Client erzeugt `archiv\<ordner>.zip` mit `ereignisse/`, `schnappschuesse/`, `anhaenge/`, `ausgaben/` und `manifest.json` (Hashes, Zeitraum, Formatversion) und prüft die Hashes, bevor der Quellordner verschoben wird.
- **Einsatzakte exportieren** (Excel-Pendant: Verlaufskopien F-L1, Auswertung F-K5, LogFrei F-H3): ZIP mit (a) Rohprotokoll, (b) `zustand.json` (Endstand), (c) `etb.pdf` und `etb.csv`, (d) `einheiten.xlsx` im Oldenburg-Layout, (e) `stärke.pdf`, `logistik.xlsx`, (f) `manifest.json`. Import in S1 = entpacken und falten.
- **Aufbewahrung:** Das Ereignisprotokoll wird **nie** verdichtet (append-only = ETB-Charakter). Größenordnung: 5.000 Einheiten × ~10 Ereignisse × ~300 B ≈ 15 MB je Einsatz (nas §4); die reale Excel-Vorlage fasst 272 Einheitenzeilen (Kritik §3.1), also eher ~1 MB. Kein Problem.

### 3.9 Der Meldekopf schreibt selbst — und die Google-Tabelle entfällt

Das ist die Frage, an der dieser Vorschlag seinen Wert beweist. Ausgangslage (`excel-handbuch-anforderungen.md` §7 E): F-E1 mehrere Meldeköpfe erfassen parallel, FüSt übernimmt mit Quittierung (gelb→grün); F-E2 nichts wird gelöscht; F-E3 Meldekopf-ETB ist Teil des FüSt-ETB; F-E5 „Meldekopf kann ohne Netzverbindung zur FüSt arbeiten (heute: Google-Tabelle/Drive als Brücke)". Und: der QR-Import der Excel war nach Codelage **nie lauffähig** (`EebVokabText`/`EebBogenSchreiben` undefiniert, Kritik §3.2) — es gibt also keine Feldpraxis, die man brechen könnte.

Drei Übergabewege, **ein** Datenmodell:

| Weg | Voraussetzung | Technik | Latenz |
|---|---|---|---|
| **A — direkt in den Einsatz** | Meldekopf ist im selben Netz und hat Zugriff auf das Share | Der Meldekopf (S1-Control im Modus „Meldekopf", oder erfassungsbogen.app-Desktop mit `@s1/speicher`) besitzt eine **eigene** Ereignisdatei `c-…-meldekopf-br1.000001.jsonl` und hängt `MeldungEingegangen`-Ereignisse selbst an. Single-Writer-Regel bleibt gewahrt. | 2 s (Poll) bzw. < 1 s (UDP) |
| **B — Bündeldatei** | kein Netz zur FüSt, aber ein Transportweg (USB, Mail, Drive, Funk-Datenübertragung) | Der Meldekopf exportiert `meldekopf-br1_20260914T1412.s1meld` — inhaltlich **exakt ein Ereignisdatei-Segment**. Die FüSt legt es per `create_new` unter `ereignisse/` ab; Besitzer bleibt der Meldekopf, das Segment ist unveränderlich. Fold und Idempotenz (K6) machen doppeltes Einspielen harmlos. | Transportdauer |
| **C — einzelner Bogen per QR** | gar nichts außer Sichtkontakt/Papier | Handscanner oder Kamera liest die QR-Kette; der EEB-Codec aus `@bos/kern` dekodiert (Segmentierung: real 2,91 Teile im Mittel, nur 73 von 443 Beispielbögen passen in einen QR — Kritik §3.2), daraus entsteht **dasselbe** `MeldungEingegangen`-Ereignis | sofort |

Alle drei erzeugen Ereignisse desselben Typs, mit derselben Idempotenz-ID (`bogenInhaltsId`), demselben Fingerabdruck (`einheitSchluessel`) und derselben Signaturprüfung (`signatur.ts`, TOFU: „✓ signiert von <Kurzform>" belegt Integrität und Herkunft, **nicht** die Zuordnung zu einer Person — die Verifikation blockiert den Import nie).

Die Quittierung gelb→grün (F-E1) wird zu zwei Ereignissen: `MeldungEingegangen` (gelb, zählt noch nicht in die Führungsstruktur) und `MeldungUebernommen{meldungId, einheitId, uebernommeneFelder[]}` (grün). Eine neue Revision derselben Einheit setzt den Zustand automatisch zurück auf „gelb, mit Diff" — und der Diff ist bereits gebaut (`meldung-diff.ts`: „die Historie zeigt Stände, der Diff zeigt Bewegung"). F-E2 (nichts löschen) ist per Konstruktion erfüllt, F-E3 (Meldekopf-ETB ist Teil des FüSt-ETB) ebenfalls: es ist dieselbe Ereignismenge.

**Was damit entfällt:** die Google-Tabelle als Brücke, das „als Formel einfügen"-Workaround (F-E4, Hinweise C168–C170) und der Konflikt zwischen Übernahme und Zieltabellen-Formatierung — es gibt keine Zieltabelle mehr, in die kopiert wird.

**Was bleibt offen:** Ob der Meldekopf-Arbeitsplatz S1-Control oder erfassungsbogen.app-Desktop ist, entscheidet §4.6 fachlich; technisch ist es dieselbe Ereignisdatei.

### 3.10 Migration

**a) Bestehende `.s1control`-Dateien (Schema 1).** Ein CLI-/UI-Schritt `s1 uebernehmen <datei.s1control> <shareordner>`:
1. Datei lesen (JSON, `schemaVersion: 1`), Struktur gegen die v1-Typen validieren.
2. Genau **ein** Ereignis `EinsatzAusV1Uebernommen{quelle, dateiHash, zustand}` in eine frische Ereignisdatei der übernehmenden `clientId` schreiben, HLC-Zeit = jetzt, `wanduhr` = mtime der Quelldatei.
3. Der Fold kennt diesen Typ und setzt daraus den Anfangszustand (Abschnitte, Einheiten, Fahrzeuge, Helfer, Bewegungen). Alle späteren Änderungen sind normale Ereignisse.
Das ist bewusst **kein** Zerlegen in synthetische Einzelereignisse: die v1-Datei kennt keine belastbare Historie (`writeSeq` ist nicht einmal monoton, Kritik §3.4), also wäre jede Zerlegung erfunden. Ein Übernahme-Ereignis ist ehrlich und im ETB sichtbar.
**Parallelbetrieb:** Kein Mischbetrieb alter und neuer Clients auf demselben Einsatz. Der v2-Ordner enthält keine `.s1control`-Datei, ein v1-Client findet dort nichts und kann nichts kaputtmachen; umgekehrt lehnt v2 eine `.s1control`-Datei mit unbekannter `schemaVersion` ab, statt sie zu überschreiben (v1 überschreibt Fremdformate blind, `connection.ts:24-31`).

**b) Die Excel-Mappe „Einsatzkräfteübersicht V 1.5.2-beta".** Zwei Fälle:
- *Die Vorlage* (Stammdaten, Kopiervorlagen, FüSt-Dienstposten): einmalige Übernahme in `stammdaten/` — als **Datenextraktion zur Entwicklungszeit** (Skript im Repo, Ergebnis eingecheckt), nicht als Laufzeitfunktion. Vorbild: `scripts/extract-thw-stan-from-zip.cjs` von v1.
- *Gefüllte Mappen realer Einsätze/Übungen:* Ob es sie gibt, ist **nicht ermittelt** (Kritik §3.7). Falls ja: Import über `s1 import-excel <mappe.xlsm>` → Blatt `Stärke` Zeilen 6–431 spaltenweise nach `excel-domaenenmodell.md` §9 lesen, Bereichszuordnung aus der Zeilenposition (benannte Bereiche `Führungsstelle`, `Meldekopf_FüSt_BR_1/2`, `Logistik`, `Angefordert`, `Bereitstellung_1/2`, `Einsatzort_1..21`), Ergebnis wieder als **ein** `EinsatzAusExcelUebernommen`-Ereignis. Lesebibliothek: `exceljs` oder SheetJS **nur im CLI/Main**, nicht im Kern — der eigene XLSX-Schreiber (`xlsx.ts`) kann nicht lesen und soll es auch nicht lernen.
- Priorität: **niedrig**. Ein Einsatz ist ein abgeschlossener Vorgang; der Normalfall ist „neuer Einsatz in v2", nicht „laufender Einsatz umziehen". M7 in §8.

**c) Legacy-`.sqlite`.** Nicht migrieren. v1 kann sie selbst nicht mehr lesen und würde sie beim Öffnen überschreiben (s1-main R-DATA-4); v2 erkennt sie am Magic-String und weigert sich, in denselben Pfad zu schreiben. Falls doch Daten darin stecken (§10, Punkt 8), ist das ein einmaliger manueller Vorgang mit `sqlite3`, kein Produktfeature.

---

## 4. Fachliches Zielmodell in Grundzügen

Grundlage: `excel-domaenenmodell.md` §8 (Entitäten, Beziehungen, Enumerationen) und §9 (Spalte→Attribut→Regel), abgeglichen gegen `vollstaendigkeitskritik.md` §3.1 (Feldabgleich Excel ↔ v1) und `excel-handbuch-anforderungen.md` §7.

### 4.1 Die tragende Unterscheidung: gemeldete Einheit vs. geführte Einheit

Die Excel führt beides in **einer** Zeile B..AW: was die Einheit gemeldet hat (Bezeichnung, Organisation, Herkunft, Stärke, Fahrzeuge, Ernährung, Übernachtung) und was die Führungsstelle über sie verfügt (Bereich, Status, Schicht, Auftrag, Ablösung, Anforderungs-ID, Zusagen, Rückführung, Kosten). Genau diese Doppelnatur beschreibt der Kopfkommentar von `oldenburg-xlsx.ts` aus der Gegenrichtung: „Die Vorlage hat mehr Spalten, als ein Erfassungsbogen kennt (Ablösung, Anforderungs-ID, Zusagen, Rückführung, Schicht). Die bleiben LEER — sie gehören der Führungsstelle, nicht der meldenden Einheit."

v2 trennt daher zwei Aggregate:

- **`Meldung`** (im geteilten Kern): ein `Erfassungsbogen` samt Revisionen. Eigentümer ist die **meldende Einheit**. Alles, was aus `model.ts` ableitbar ist, wird abgeleitet und nicht doppelt gespeichert: `staerke()` (Fü/UFü/Mannschaft/Gesamt aus dem Personal oder aus `staerkeManuell`), `unterbringungMWD()`, `verpflegung()` (VerpflegungSplit), `ansprechpartner()`.
- **`EinsatzEinheit`** (in `@s1/domaene`): die Sicht der Führungsstelle. Eigentümer ist die **FüSt**. Verweist auf 0..1 `Meldung` (deren neueste Revision), trägt alle FüSt-Felder selbst und darf gemeldete Felder **überschreiben** — mit Herkunftsvermerk `{feld: "bezeichnung", herkunft: "fuest", stand: hlc}`, damit eine neue Meldung eine bewusste FüSt-Korrektur nicht stillschweigend zurücksetzt (Regel: *manuell schlägt gemeldet*, dieselbe Regel wie „manuell schlägt Auto" bei den taktischen Zeichen in v1, `tactical-sign-config.ts`).

Eine `EinsatzEinheit` ohne Meldung ist der Normalfall bei manueller Erfassung und bei Kopiervorlagen; eine Meldung ohne zugeordnete Einheit ist der Eingangskorb des Meldekopfs (gelb, F-E1).

### 4.2 Entitäten und ihre Herkunft

| Entität | Wohnt in | Excel-Bezug (`excel-domaenenmodell.md` §8.1) | v1-Bezug |
|---|---|---|---|
| `Einsatz` (name, fuestName, uebergeordneteFuestName, art, kostenparameter, eebOrdner, schichtmodell) | `@s1/domaene` | Stammdaten C4–C6, Stärke AQ3/AS3/AT3/AV3, Startseite IV11 | `JsonEinsatz` (name/fuestName/uebergeordneteFuestName) — exakt übernehmbar |
| `Abschnitt` (id, parentId, typ, name, position, sichtbar) — **Baum** | `@s1/domaene` | Bereiche/Einsatzstellen (flach, feste Zeilenblöcke) | Abschnitt-Baum mit `systemTyp` — v1 ist hier **mächtiger als die Excel** und wird übernommen |
| `EinsatzEinheit` | `@s1/domaene` | Zeile B..AW, FüSt-Anteil | `JsonEinheit` + Bewegungen |
| `Meldung` + `Revision` | `@bos/kern` | Spalte AB „ID EEB" / digitaler EEB | fehlt in v1 |
| `Erfassungsbogen`, `Person`, `Fahrzeug`, `Staerke`, `Sofortbedarf`, `HierarchieEbene`, `Funkrufname` | `@bos/kern` (`model.ts`) | Spalten C–J, AC–AM | v1 hat Fahrzeug/Helfer eigenständig — wird auf das Kernmodell abgebildet (§4.7) |
| `Anforderung` (anforderungId, fuerEinheitId, abloesungAngefordertAm, zugesagtFuer, zugesagtVon, vorgeseheneEinheitId, vorgesehenerAuftrag, eingetroffenAm, einsatzendeAm, rueckfuehrungAm) | `@s1/domaene` | Spalten M–V, Bereich „Angefordert" | fehlt vollständig |
| `Dienstposten` (teileinheit, funktion, schicht) + `Besetzung` (rolleFue/UFue/He) | `@s1/domaene` | FüSt!B10:B139, D/E/F | fehlt vollständig |
| `SchichtplanEintrag` (dienstpostenId, datum, personText) | `@s1/domaene` | FüSt!J10:AS139 | fehlt vollständig |
| `Vorlage` (Kopiervorlage/StAN-Einheitstyp) | `@s1/domaene` + Daten aus `@bos/kern/vokabulare` | Stärke Z. 23–122, AküLi | `thw-stan-2025.generated.json` (47 Einträge) + Inferenz |
| `Ereignis`, `Konflikthinweis` (= ETB) | `@bos/kern` | Verlaufskopien, „Aufträge"-Freitext Spalte K | `einheitBewegungen` (nur Abschnittswechsel) |

### 4.3 Enumerationen — die drei Organisationslisten

Es existieren drei unvereinbare Listen (Kritik §3.1): Excel 12 Werte (THW, FW, BW, DRK, JUH, ASB, MALT, DLRG, POL, BPOL, HK/NLWKN, ZIV), S1 v1 14 Werte (mit `MALTESER` **und** `MHD` doppelt), EEB `OrganisationsTyp` 1–11 + 255 (`model.ts:90`).

**Entscheidung:** Kanonisch ist der **EEB-`OrganisationsTyp`** — er ist bereits im geteilten Kern, im Binärformat kodiert, in Vokabularen und Farbtabellen (`org-farben.ts`) hinterlegt und in beiden Produkten getestet. Ergänzungen, die nur die Führungsstelle braucht und die **nie auf einem Bogen stehen** (HK/NLWKN, ZIV/Regie, Bergwacht), erhalten in `@s1/domaene` Codes im Bereich **ab 200** — sie berühren die Transportversion des Bogens nicht und verletzen die Additiv-Regel aus §1.5 nicht. Anzeige-Kürzel („FW" statt „Feuerwehr") kommen aus einer Abbildungstabelle in `@s1/domaene`, damit Ausdrucke wie die Excel aussehen. Die v1-Doppelung `MALTESER`/`MHD` wird beim Übernehmen auf je einen Code abgebildet.

Weitere Enums (aus `excel-domaenenmodell.md` §8.3, mit stabilen Schlüsseln statt Anzeigetexten — die Excel hat hier eine Inkonsistenz „Rufbereitschaft" vs. „Ruf Bereitsch."):
- `Status` (9, F-G1): `RUFBEREITSCHAFT, EINSATZVORBEHALT, ANGEFORDERT, ANMARSCH, RUECKMARSCH, EINSATZBEREIT, IM_EINSATZ, RUHE, NICHT_EINSATZBEREIT`. v1 kannte nur 3 + Abschnittstypen und ist damit **nicht** ausreichend (Kritik §3.1).
- `Schicht`: `TAG, NACHT, FRUEH, SPAET`; `Schichtmodell`: `ZWEI | DREI` je Einsatz, Default `TAG` (F-G2).
- `AbschnittTyp`: `FUEHRUNGSSTELLE, MELDEKOPF, SONSTIGES_FUEHRUNG, LOGISTIK, ANGEFORDERT, BEREITSTELLUNGSRAUM, EINSATZABSCHNITT, ARCHIV_BEENDET`. Zählregeln je Typ als Daten, nicht als Code: `zaehltInGesamtstaerke`, `zaehltInKosten`, `zaehltInDruck`, `schichtPflicht` (§8.1 der Domänenanalyse).
- `Rolle` (Stärkegliederung): `FUE, UFUE, HE` — im Kern bereits als `StaerkeRolle` (0 Mannschaft, 1 Unterführer, 2 Führer).

### 4.4 Wie die Excel-Bereiche abgebildet werden

Die Excel hat feste Zeilenblöcke (FüSt 10, Meldekopf 2×3, Logistik 12, Angefordert 22, BR1 22, BR2 11, Einsatzort 1..21 × 9 = 272 Zeilen gesamt, Kritik §3.1). v2 hat einen **Baum ohne Kapazitätsgrenze** (F-B3: „ein Nachfolger sollte unbegrenzt sein"), aber mit denselben *Typen*, damit alle Auswertungsregeln der Excel weiter gelten:

```
Einsatz
├─ Führungsstelle            (FUEHRUNGSSTELLE)      ← Projektion aus Dienstposten (§4.5)
├─ Meldekopf BR 1            (MELDEKOPF)
├─ Meldekopf BR 2            (MELDEKOPF)
├─ Sonstiges Führung         (SONSTIGES_FUEHRUNG)
├─ Logistik                  (LOGISTIK)
├─ Angefordert / Anmarsch    (ANGEFORDERT)          ← zaehltInGesamtstaerke = false, separat ausgewiesen (F-F2)
├─ Bereitstellungsraum 1..n  (BEREITSTELLUNGSRAUM)
├─ Einsatzabschnitt „EA 1"   (EINSATZABSCHNITT)
│  └─ Unterabschnitt „UEA 1.1"  ← geht über die Excel hinaus (dort nur eine Ebene)
└─ Einsatz beendet           (ARCHIV_BEENDET)       ← F-F5
```
F-B2 („je Bereich wird eine Führungsstelle in der ersten Zeile geführt") wird zu einem expliziten Feld `fuehrungsEinheitId` am Abschnitt statt zu einer Zeilenkonvention. F-B5 (Umgliederung mehrerer, auch nicht zusammenhängender Einheiten „nach der Zielzeile") wird ein Kommando `einheiten:verschieben{ids[], zielAbschnittId, nachPosition}` → ein Ereignis je Einheit.

### 4.5 Ressourcenplanung, Schicht, Logistik, Kosten, FüSt-Personal, Status

**Ressourcenplanung / Ablösung (F-F1…F-F5, Excel M–V).** Eigenes Aggregat `Anforderung` mit eigener Ereignisfamilie (`AnforderungGestellt`, `AbloesungAngefordert`, `AbloesungZugesagt`, `EinheitEingetroffen`, `EinsatzendeGesetzt`, `EinheitZurueckgefuehrt`). Die Verknüpfung „Einheit A wird abgelöst durch Einheit B" (F-F3, image84) ist eine echte Referenz `vorgeseheneEinheitId`, nicht mehr ein Freitext-Abgleich über die Anforderungs-ID. Die Anforderungs-ID bleibt als **Fremdschlüssel nach außen** erhalten (Format mit der übergeordneten Stelle abgestimmt, F-F1). Sichtbarkeit: F-F4 („Ressourcenspalten optional ein-/ausblendbar") wird eine Ansichtsoption, kein Datenmerkmal.

**Schicht (F-G2).** Feld an der `EinsatzEinheit`, Enum s. o., Pflichtprüfung je Abschnittstyp (`schichtPflicht`, Excel Status!G43). Die Excel leert `Schicht_Angefordert` bei jedem Einfügen/Verschieben global (`excel-vba-workflows.md` §3.1/§3.5) — ein Defekt, der hier ersatzlos entfällt.

**Logistik (F-H1…F-H4).** Vorrangig **abgeleitet**: `unterbringungMWD()` und `verpflegung()` aus `model.ts` liefern m/w/d und vegetarisch/vegan aus dem Personal, sobald ein Bogen vollständig erfasst ist. Nur wo kein Bogen vorliegt oder `PersonalErfassung.NUR_STAERKE` gilt, sind es Eingabefelder an der `EinsatzEinheit` (Excel AC–AI). „Männlich = Rest" bleibt abgeleitet (Log!I7). Die Logistikübersicht je Einsatzraum × Schicht (F-H2, Log!C5:P38) ist eine Projektion, kein gespeicherter Zustand; `LogFrei` (F-H3) ist ein Export (§6).

**Kosten (F-L6, Excel AN–AW + AQ3/AS3/AT3/AV3).** Vollständig abgeleitet aus `kostenparameter` am Einsatz (psaSatz 180, vdaProTag 150, ukVerpflegungProTag 20, geplanteTage 5 als Defaults) und `psaProTag` je Einheit. Keine Kostenereignisse außer `KostenparameterGesetzt`. Abschnitte mit `zaehltInKosten = false` (Kopiervorlagen, Angefordert, Archiv) fallen heraus.

**FüSt-Personal und Schichtplanung (F-I1, F-I2).** `Dienstposten` je Teileinheit (Stab, ZTr FK, FGr F, FGr K, Externe) × Funktion × Schicht, mit tagesaktueller Besetzung 0/1 je Rolle; `SchichtplanEintrag` je Dienstposten × Datum mit Freitext (Name, Herkunft, Erreichbarkeit). Die Excel projiziert das in zwei Zeilen (Tag/Nacht) je Teileinheit im Bereich Führungsstelle — v2 macht daraus eine **Projektion**: der Abschnitt `FUEHRUNGSSTELLE` erhält je Teileinheit und Schicht eine berechnete Stärke; es gibt keine doppelte Datenhaltung mehr. Das ist der Block, der in v1 **komplett fehlt** und der zum Umfang deutlich beiträgt (§8, M6).

**Status (F-G1, F-G3).** Feld an der `EinsatzEinheit`; die Plausibilitätsprüfung „Einheiten ohne Status/Schicht/Organisation" (Status!G36, G43) wird eine Projektion `pruefhinweise[]`, die in jeder Ausgabe erscheint.

### 4.6 Was geteilt und was importiert wird

| Baustein | geteilt (`@bos/kern`) | importiert / abgebildet | begründet |
|---|---|---|---|
| `Erfassungsbogen` + abgeleitete Werte | **ja, unverändert** | — | einzige Quelle für Stärke/Verpflegung/Unterbringung; jeder Nachbau erzeugt Abweichungen zwischen App und FüSt |
| EEB-Codec + Segmentierung + Signatur | **ja, unverändert** | — | Bit-genau spezifiziert (`docs/datenmodell.md`), 4 Testdateien allein für den Codec |
| Meldekopf-Sammlung (Revisionen, Inhalts-Hash, Fingerabdruck, Papierkorb) | **ja, ohne die `localStorage`-Hülle** | S1 setzt eine `SpeicherHuelle` ein, die auf das Ereignisprotokoll schreibt | Hülle ist bereits abgetrennt (`einsaetze.ts:318 ff.`) — der Eingriff ist ein Interface, keine Umschreibung |
| Aufteilen / Zusammenführen / Diff / Einheitenliste | **ja** | — | fachlich identisch in beiden Produkten |
| Vokabulare (THW-StAN-Personal/-Fahrzeuge, OV, Funkrufnamen, Landesvorlagen, Sitzplätze, Ebenen) | **ja** | — | S1 braucht sie für Vorlagen und Zeichen-Inferenz |
| XLSX-Schreiber, Oldenburg-Layout, PDF-Dokumentdefinitionen | **ja** | — | §6 |
| Abschnitts-Baum, Führungsstruktur, Status, Schicht, Anforderung, Dienstposten, Kosten | nein | `@s1/domaene` | reine FüSt-Begriffe; im Bogen gibt es sie nicht (Kommentar `oldenburg-xlsx.ts`) |
| Taktische Zeichen: Inferenz, Kurzzeichen, Scoring, `meta{source,confidence,ruleVersion}` | nein | **aus v1 übernommen** (§5.3) | S1-spezifisch; erfassungsbogen.app hat nur `taktische-zeichen.ts` für Fahrzeugsymbole |
| STAN-Daten `thw-stan-2025.generated.json` (47 Einträge) + Inferenz | nein | **aus v1 übernommen**, später ggf. mit `@bos/kern/vokabulare/thw-stan-*` zusammengeführt | zwei STAN-Quellen sind ein bekannter Doppelbestand (§9 R7) |
| Ereignisprotokoll, HLC, Fold-Motor | **ja** (generisch) | Ereigniskatalog und Fold-Regeln je Produkt | erfassungsbogen.app kann damit später sein `localStorage`-Modell ablösen — muss aber nicht |

### 4.7 Abbildung der v1-Entitäten

`JsonEinheit` → `EinsatzEinheit`; `Fahrzeug` (name, kennzeichen, funkrufname, stanKonform, sondergeraet, nutzlast) und `Helfer` (rolle, geschlecht, anzahl) von v1 → auf `Fahrzeug`/`Person` des Kernmodells abbilden. Achtung, Genauigkeitsverlust in beide Richtungen: v1 kennt `Helfer` nur als **Zähler je Rolle/Geschlecht**, das Kernmodell kennt **Personen mit Namen**. Die Übernahme erzeugt daher `PersonalErfassung.NUR_STAERKE` mit `staerkeManuell` — korrekt und ehrlich, statt Namen zu erfinden. Umgekehrt trägt v1 an `Fahrzeug` zwei Felder (`sondergeraet`, `nutzlast`), die das Kernmodell nicht hat; sie wandern nach `@s1/domaene` als Zusatzattribute an der `EinsatzEinheit`-Fahrzeugsicht — **nicht** in den Kern, weil ein Erfassungsbogen sie nicht meldet (Aufnahmeregel §1.5 Punkt 2).

---

## 5. Modul-/Repo-Struktur auf dem neuen Branch

### 5.1 Drei Repos, ein geteiltes Paket

```
bos-kern                     (NEU, eigenes Repo)     — @bos/kern
einheitenerfassungsbogen     (bestehend)             — bindet bos-kern als vendor/bos-kern ein
S1-Control  Branch v2        (neu auf der gruenen Wiese) — bindet bos-kern als vendor/bos-kern ein
```

### 5.2 Verzeichnisbaum S1-Control v2

```
S1-Control/                          # Branch v2, altes src/ bleibt auf main
├── package.json                     # npm-Workspaces: pakete/*, vendor/bos-kern
├── tsconfig.base.json
├── vendor/
│   └── bos-kern/                    # git-Submodul → Repo bos-kern (§5.4)
├── pakete/
│   ├── domaene/                     # @s1/domaene — KEIN node:, KEIN DOM
│   │   ├── src/
│   │   │   ├── einsatz.ts abschnitt.ts einheit.ts anforderung.ts
│   │   │   ├── dienstposten.ts schichtplan.ts kosten.ts status.ts organisation.ts
│   │   │   ├── ereignisse/          # Ereigniskatalog: typ, v, Nutzlast-Schema, Upcaster
│   │   │   │   ├── katalog.ts       # EREIGNIS_TYPEN als const, Diskriminierte Union
│   │   │   │   └── migration.ts     # v-1 → v je Typ (M16), Test je Stufe
│   │   │   ├── fold/                # falte(), Regeln K1..K12, Konflikthinweise
│   │   │   ├── projektion/          # fuehrungsstruktur, staerken, logistik, kosten,
│   │   │   │                        # schichtuebersicht, etb, pruefhinweise
│   │   │   ├── zeichen/             # UEBERNOMMEN aus v1 (§5.3)
│   │   │   ├── stan/                # UEBERNOMMEN aus v1 (§5.3)
│   │   │   └── vorlagen/            # Kopiervorlagen THW/FW/KatS-Nds (F-J1)
│   │   └── test/                    # vitest + fast-check
│   ├── speicher/                    # @s1/speicher — node:fs, node:dgram; NUR Node
│   │   ├── src/{ereignisdatei,poll,spiegel,schnappschuss,praesenz,udp,pfade}.ts
│   │   └── test/                    # inkl. Mehrclient-Simulation (§7.3)
│   ├── ausgaben/                    # @s1/ausgaben — Druck/Status/Log/FuEOrg/Auswertung/HTML
│   │   └── src/{druck,status,log,logfrei,fueorg,auswertung,monitor-html}.ts
│   ├── app/                         # Electron-Huelle
│   │   ├── main/{index,fenster,ipc,einstellungen,aktualisierung,worker-start}.ts
│   │   ├── worker/{kern-worker}.ts  # @s1/speicher + Fold + Projektionen
│   │   ├── preload/index.ts         # nur contextBridge, keine Logik
│   │   └── renderer/
│   │       ├── index.html monitor.html
│   │       └── src/{app,ansichten,komponenten,zustand,stile}/
│   └── cli/                         # @s1/cli — bin "s1"
│       └── src/{pruefen,falten,exportieren,uebernehmen,import-excel,messen-smb}.ts
├── e2e/                             # Playwright + playwright-bdd
│   ├── features/                    # 10 Szenarien aus v1 UEBERNOMMEN + neue
│   └── steps/
├── docs/
│   ├── ARCHITEKTUR.md               # Entscheidungen mit Datum, Alternativen, Messwerte (M29/M31)
│   ├── KONZEPT-EREIGNISPROTOKOLL.md # §-nummeriert: Dateilayout, Zeilenformat, HLC, fsync
│   ├── KONZEPT-FOLD.md              # Ereigniskatalog, Regeln K1..K12, Property-Eigenschaften
│   ├── KONZEPT-MELDEKOPF.md         # Wege A/B/C, Quittierung, Signaturanzeige
│   ├── KONZEPT-AUSGABEN.md          # Druck/Status/Log/FuEOrg/Auswertung/Monitor
│   ├── KONZEPT-KERN-GRENZE.md       # Aufnahmeregel, Versionierung, Abbruchbedingung
│   ├── UI-ABNAHME.md
│   └── adr/                         # 0001-ereignisprotokoll, 0002-electron, 0003-geteilter-kern, …
├── skripte/
│   ├── stan-aus-zip.cjs             # UEBERNOMMEN aus v1
│   └── smb-latenz.mjs               # Messskript fuer M0
└── .github/workflows/build-main.yml # Geruest aus v1 (Zeitstempel-Tag, test, build-Matrix, release)
```

### 5.3 Was aus v1 wörtlich übernommen wird

Kopiert, nicht neu geschrieben (Belege aus `s1-main-architektur.md` §10 „Übernehmen"):

| Übernommen | Quelle in v1 | Anpassung |
|---|---|---|
| STAN-Daten THW 2025 (47 Einträge) | `src/main/services/stan/thw-stan-2025.generated.json` | nach `pakete/domaene/src/stan/`, als Bundle-Ressource mit überschreibbarer Nutzerkopie (M20) |
| STAN-Extraktionsskript | `scripts/extract-thw-stan-from-zip.cjs` + validate | Pfade |
| STAN-Inferenz | `src/main/services/stan/thw-stan-inference.ts` | Import-Pfade |
| Zeichen-Inferenz komplett: Kurzzeichen-Tabelle, Komposita, Scoring/Schwellen, `meta{source,confidence,ruleVersion}`, „manuell schlägt auto" | `tactical-sign-aliases.ts`, `tactical-sign/thw-shortcodes.ts`, `tactical-sign/catalog.ts`, `tactical-sign/scoring.ts`, `tactical-sign-inference.ts`, `tactical-signs.ts`, `einsatz-write/tactical-sign-config.ts` | die vier duplizierten `normalizeText`/`tokenize` werden **bei der Übernahme zusammengeführt** (s1-main §10 „Weglassen") |
| Taktische Stärke F/UF/M/G mit Summenprüfung | `einsatz-write/tactical-strength.ts` | Abgleich mit `staerke()` aus dem Kern; eine der beiden Berechnungen entfällt |
| Abschnitt-Zyklusprüfung | `validations.ts:12-35` | wird Fold-Regel K3 |
| Split-Regeln für Einheiten | `einsatz-write/einheit.ts:151-233` | Abgleich mit `teileBogen()` aus dem Kern (K9); die fachlich reichere Variante gewinnt |
| Archiv-Schreibschutz | `einsatz-transaction-guards.ts:31-38` | wird Fold-Regel K10 |
| Versionsvergleich für Zeitstempel-Buildnummern | `updater-versioning.ts` | unverändert |
| Auth-Hashing (scrypt-Format) | `auth.ts` | nur falls Rollen bleiben (§10, Punkt 6) |
| Fenster-/Monitorlogik (Zielmonitor bestimmen, Bounds, Nachziehen) | `strength-display.ts:144-192` | **ohne** Prewarm/Splash/Health/SLO-Skript |
| BDD-Szenarien | `e2e/features/einsatz-lifecycle.feature` (10 Szenarien) | Schritte neu verdrahtet, Szenariotexte bleiben |
| Behavior-Testideen | `test/behavior.einsatzfluss.test.ts`, `behavior.abschnitt-bearbeiten.test.ts`, `behavior.einsatz-basisdaten.test.ts`, `behavior.fileshare-engpass.test.ts` | letzterer wird zur **Mehrclient-Simulation** ausgebaut (§7.3) |
| Wire-Kompatibilitätstests | `test/einsatz-sync.test.ts` (u. a. `/Volumes/…` vs. `Z:\…`) | UDP-Nutzlast neu, Testidee bleibt |
| CI-Gerüst | `.github/workflows/build-main.yml` | Jobs `prepare/test/build×4/release` bleiben |

**Nicht** übernommen (s1-main §10 „Weglassen"): Utility-Prozess-Gerüst (`main-db-bridge`, `shared/db-runtime`, `EinsatzReadCache`), `better-sqlite3`/drizzle/`rebuild:native`, Legacy-`.sqlite`-Öffnen, LAN-Peer-Update (796 + 123 Z.), Debug-Sync-Log-Forwarding in den Renderer, doppelt kodierte JSON-Strings im Dateiformat (`tacticalSignConfigJson`, `payloadJson`), Stärke-Monitor-Prewarm — und der gesamte Renderer.

### 5.4 Wie der Kern geteilt wird — Entscheidung und Abbruchbedingung

**Entschieden: eigenes Repo `bos-kern`, in beiden Produkten als `git`-Submodul unter `vendor/bos-kern` eingebunden, Abhängigkeit `"@bos/kern": "file:vendor/bos-kern"`.**

Verworfene Alternativen:
- *Monorepo (beide Produkte in einem Repo).* Verworfen: erfassungsbogen.app ist ein laufendes Produkt mit eigener Domain, eigenem CI, iOS-/Android-Auslieferung und eigenem Release-Takt. Ein gemeinsames Repo würde beide Taktungen koppeln — genau das Risiko aus §1.5 Punkt 1, nur maximal.
- *Kern bleibt in `einheitenerfassungsbogen`, S1 bindet dieses Repo als Submodul ein.* Verworfen als Dauerlösung (S1 zöge das gesamte App-Repo, die Grenze wäre nicht durchsetzbar), **aber zulässig als Zwischenschritt in M1**, wenn die Extraktion sonst den Start blockiert.
- *npm-Registry / GitHub Packages.* Verworfen: braucht Auth-Token in beiden CIs und Netz beim Installieren; der Gewinn (Versionsauflösung) ist bei zwei Konsumenten und einem Entwickler null.
- *Kopieren (Vendoring ohne Rückweg).* Verworfen als Regelfall, **aber die Abbruchbedingung** (s. u.).
- *npm-`git+ssh`-Abhängigkeit mit Tag.* Fast gleichwertig; verworfen, weil der Einzelentwickler den Kern häufig zusammen mit einem Produkt ändert und dafür lokale Bearbeitbarkeit braucht (`file:` auf ein Submodul liefert genau das, `git+ssh` erzwingt `npm link`).

**Aufnahmeregel für `@bos/kern`** (durchgesetzt, nicht nur beschrieben):
1. Aufnahme nur, wenn **beide** Produkte den Baustein aufrufen. Ein „das brauchen wir sicher auch mal" reicht nicht.
2. Keine `node:`-, keine DOM-, keine React-Importe. Prüfbar per ESLint-`no-restricted-imports` und einem Testlauf des Kerns unter `--environment node` **und** `--environment jsdom`.
3. `@bos/kern` importiert nie aus `@s1/*` (ESLint-Regel `import/no-restricted-paths`).
4. Änderungen sind **additiv**; Entfernen nur in einem eigens gekennzeichneten Aufräum-Release, nachdem beide Produkte umgestellt sind.
5. Bundle-Budget in erfassungsbogen.app: Ein CI-Schritt prüft die Größe des Produktions-Bundles gegen eine eingecheckte Obergrenze. Wächst sie durch Kernänderungen, schlägt der Build fehl.
6. Jedes Produkt pinnt einen **Submodul-Commit** und zieht bewusst nach — kein automatisches Folgen von `main`.

**Abbruchbedingung (in `docs/KONZEPT-KERN-GRENZE.md` festzuhalten):** Wenn innerhalb von drei Monaten zweimal eine S1-Änderung ein Release von erfassungsbogen.app blockiert oder verzögert hat, wird der Kern in S1 **eingefroren vendort** (Kopie mit festgehaltenem Herkunfts-Commit in `pakete/kern-vendor/`) und getrennt weitergepflegt. Das ist ein geordneter Rückweg, kein Scheitern — und der Grund, warum der Kern von Anfang an ohne Produktbezug geschnitten sein muss.

**Extraktionsaufwand (einmalig, M1):** Aus `einheitenerfassungsbogen` wandern `src/model.ts`, `src/codec.ts`, `src/signatur.ts`, `src/qr-node.ts`, `src/vokabulare/**` (19 Dateien), `src/app/{einsaetze,aufteilen,zusammenfuehren,meldung-diff,einheiten-liste,auswertung,bogen-csv,csv,xlsx,oldenburg-xlsx,pdf-dokument,papierkorb,beispielnamen,org-farben,geraete-schluessel}.ts` samt ihrer Testdateien in `bos-kern`. Dabei: (a) `einsaetze.ts` bekommt statt des direkten `globalThis.localStorage`-Zugriffs (Z. 318–360) ein injiziertes `SpeicherHuelle`-Interface `{lies(): string|null; schreib(text: string): void}`; erfassungsbogen.app übergibt die `localStorage`-Implementierung, S1 eine, die auf das Ereignisprotokoll schreibt. (b) Import-Pfade in erfassungsbogen.app von `"../model"` auf `"@bos/kern"` umstellen (mechanisch, ~40 Dateien, abgesichert durch die vorhandenen 684 Tests). (c) `hilfen.ts` bleibt **im Produkt** (es ist ausdrücklich „Browser-Helfer für die SPA"); die wenigen darin steckenden reinen Funktionen, die der Kern braucht (`einheitAnzeigename`, `einheitOrt`, `funkrufText`, `kennzeichenText`, `orgLabel`, `vokabularFuer`, `migriereBogen`, `natoZeitstempel`), wandern nach `bos-kern/src/darstellung.ts`.

---

## 6. Ausgaben

Die Excel liefert acht Ausgabeprodukte (`excel-handbuch-anforderungen.md` §7 K und §10). Alle bleiben erhalten; drei Techniken decken sie ab.

### 6.1 Techniken

| Technik | Wofür | Woher | Bemerkung |
|---|---|---|---|
| **pdfmake** über eine DOM-freie Dokumentdefinition | Druck, Status, Log, FüOrg, ETB, Einsatzakte | `@bos/kern` (`pdf-dokument.ts` ist reine Datenstruktur; die Plattformbindung steckt in `pdf.ts` und bleibt je Produkt) | erzeugt seitengenaue A4-Ausgaben ohne Browserdruck; in erfassungsbogen.app im Feld erprobt (Bogen-PDF im Papierlayout) |
| **eigener XLSX-Schreiber** (`xlsx.ts`, 272 Z., einzige Abhängigkeit `pako`) | Auswertung, LogFrei, Oldenburg-Einheitenliste | `@bos/kern` | „Zellen + Stilnummern → Datei", kein SheetJS/exceljs im Produkt; das Oldenburg-Spaltenlayout ist bereits nachgebaut (`oldenburg-xlsx.ts`) |
| **HTML/SVG-Datei** | Lagemonitor (F-K6), FüOrg-Grafik, Schnellexporte | `@s1/ausgaben` | statische Datei an einen Netzort, `<meta http-equiv="refresh" content="60">` — genau das Verfahren der Excel (`m_htmlExport`) |

Für den **Papierdruck** hat Electron im Gegensatz zu Tauri (R7: kein Print-API) beides: `webContents.print()` (Systemdialog) und `webContents.printToPDF()`. Trotzdem ist der Regelweg „PDF-Datei erzeugen → mit `shell.openPath` im Systemprogramm öffnen": das ist plattformgleich, testbar (die Datei kann verglichen werden) und entspricht dem gewohnten Excel-Ablauf. Der Systemdruckdialog bleibt als Zusatz für „schnell aufs Papier".

### 6.2 Die acht Produkte

| # | Produkt | Anforderung | Inhalt | Technik |
|---|---|---|---|---|
| 1 | **Druck** (Stärkeübersicht) | F-K1, N-4 | Fü/UFü/He = Gesamt je Einsatzstelle in fester Reihenfolge, Gesamtzeile, Plausibilitätszeile, Org-Filter („Davon Stärke: THW"), leere Einsatzstellen unterdrückt, **ohne** Angefordert/Anmarsch, „Stand: …", Einsatz- und FüSt-Name | pdfmake A4 quer; zusätzlich A5-Variante für die Lagekarte (ersetzt den „Zoom 55 %"-Kniff) |
| 2 | **Status-Matrix** | F-K2 | Organisation × (Fü/UFü/He=Gesamt, männl., weibl., veget., Unterbringung m/w) + Stärke je Status + Stärke je Schicht + Kontrollsummen | pdfmake; dieselbe Projektion auch als Bildschirmansicht |
| 3 | **Log** (Logistikübersicht) | F-H2, F-K3 | je Einsatzraum × Schicht: Summe, M/W/D, veget./vegan, Unterbringung M/W/D, Gesamtzeile, „Angefordert/Anmarsch" separat | pdfmake + XLSX |
| 4 | **LogFrei** | F-H3, F-K3 | frei bearbeitbare Kopie mit Zeitstempel | XLSX (offen bearbeitbar) |
| 5 | **FüOrg** (Führungsharke) | F-K4 | Einsatz-/FüSt-Name, Stärkeanzeige, Bereitstellungs-/Logistikknoten, Abschnittsraster, Palette taktischer Zeichen (Einheiten mit Größenpunkten, Führungsstellen-Fahnen KatSL/LuK/TEL/ÖEL/ELO/EL/EAL/UEAL, Personen-Rauten, Funktionskreise, Organisations-Rauten) | **SVG** aus dem Abschnitts-Baum + Zeichen-Inferenz aus v1; Export als SVG und als PDF (pdfmake bettet SVG ein). Die Excel zeichnet das von Hand — v2 erzeugt es aus der Führungsstruktur und lässt Positionen manuell nachjustieren |
| 6 | **Auswertung** | F-K5, N-9 | flache, filterbare Gesamttabelle aller Einheiten mit Bereich als Spalte, Summenzeile, Zeitstempel | XLSX (mit Autofilter) + CSV |
| 7 | **Lagemonitor** | F-K6 | Druck-Ansicht (optional Status/Log) periodisch als statische HTML-Datei an einen Netzort | HTML-Datei, Intervall konfigurierbar; **plus** das Monitorfenster auf dem Zweitbildschirm (§2.4) — zwei Produkte für zwei Publika |
| 8 | **Einsatzakte / Export** | F-L1, N-6, N-9 | ZIP mit Rohprotokoll, Endzustand, ETB (PDF+CSV), Einheiten-XLSX im Oldenburg-Layout, Stärke-PDF, Logistik-XLSX, Manifest mit Hashes | §3.8 |

Querregeln: **F-K7 „Alle Ausgaben tragen ‚Stand: <Datum/Zeit>'"** wird eine Funktion der Ausgabeschicht, nicht ein Feld je Produkt — zusätzlich mit der Sichtbarkeitsangabe aus §3.4 („Stand 14:12, Peers: FüSt-Laptop1 vor 3 s, Meldekopf BR1 vor 41 s"), damit ein Ausdruck nicht vorgibt, aktueller zu sein, als er ist. Die Plausibilitäts-/Prüfhinweise (F-G3) erscheinen als Fußzeile auf Druck und Status.

Wo die Ausgaben erzeugt werden: im **Kern-Worker** (er hat die Projektion und schreibt ohnehin Dateien), nicht im Renderer. Damit sind sie auch aus der CLI (`s1 exportieren`) und im Test ohne Fenster erzeugbar — und mit dem Golden-File-Verfahren aus §7 prüfbar.

---

## 7. Test- und Qualitätsstrategie

Ausgangslage, an der sich v2 messen lassen muss: v1 hat 190 Tests in 36 Dateien (5,73 s), aber **0 Komponententests im Renderer** und 42 + 91 Typfehler; `npm run typecheck` ist wegen `files: []` faktisch ein No-op (Kritik §3.7). erfassungsbogen.app hat 684 Tests in 44 Dateien plus cucumber-E2E. Ziel für v2: die Qualitätslage des Schwesterprojekts, nicht die von v1.

### 7.1 Ebenen

| Ebene | Werkzeug | Umfang | Läuft in CI-Job |
|---|---|---|---|
| Kern-Unit | vitest | die 684 bestehenden Tests wandern mit nach `bos-kern` und laufen dort **im eigenen CI** gegen Node und jsdom | `bos-kern/test` |
| Domänen-Unit | vitest | Fold-Regeln K1–K12 einzeln, Projektionen, Enum-Abbildungen, Zählregeln je Abschnittstyp | `test` |
| **Property-Tests für den Fold** | vitest + `fast-check` | §7.2 | `test` |
| Speicher-Unit | vitest gegen `node:fs` in `os.tmpdir()` | Zeilenformat, CRC-Abbruch, Truncate auf letzte gültige Zeile, Offset-Fortschritt, Segmentwechsel, `create_new`-Kollision | `test` |
| **Mehrclient-Simulation** | vitest, mehrere Prozesse | §7.3 | `test` |
| Ausgaben | vitest, **Golden Files** | je Produkt eine Referenzdatei (PDF → Textextrakt + Seitenzahl; XLSX → entpacktes `sheet1.xml`; HTML/SVG → normalisierter String) | `test` |
| Renderer-Komponenten | vitest + `@testing-library/react` | die Lücke von v1 wird geschlossen: jede Ansicht mindestens „rendert mit leerem/typischem Zustand, Bedienelement löst erwartetes Kommando aus" | `test` |
| E2E | **Playwright + playwright-bdd** gegen die gebaute Electron-App | die 10 Szenarien aus `e2e/features/einsatz-lifecycle.feature` plus neue für Meldekopf, Ablösung, Monitorfenster | `e2e` |
| Typen/Lint | `tsc --noEmit` (echt, nicht leer), ESLint 9 Flat Config + Grenzregeln aus §5.4 | Nulltoleranz ab M1 | `test` |

Dass Playwright bleibt, ist ein **konkreter Gewinn** dieses Vorschlags: Der Tauri-Weg hätte den Wechsel auf WDIO + `@wdio/tauri-service` erzwungen (R6; bmecatEditor testet damit nur macOS) und die 10 Gherkin-Szenarien neu verdrahtet.

### 7.2 Property-Tests für den Fold — und ihre Grenzen in TypeScript

Vier Eigenschaften, mit `fast-check` über generierte Ereignisfolgen:
1. **Ordnungsunabhängigkeit:** `falte(shuffle(E)) == falte(E)` für jede Ereignismenge `E`. Das ist die zentrale Eigenschaft; sie deckt Reihenfolgefehler auf, die im Betrieb als „bei mir steht die Einheit woanders" auftreten.
2. **Idempotenz:** `falte(E ∪ E) == falte(E)` (doppelt eingespielte Bündeldatei, doppelt gescannter QR — K6).
3. **Monotonie/Präfix-Konsistenz:** `falte(E_1..n)` stimmt mit dem inkrementellen Fold überein, der Ereignis für Ereignis anwendet (das ist der Live-Pfad).
4. **Schnappschuss-Äquivalenz:** `ladeSchnappschuss(s) + falte(E \ versionsvektor(s)) == falte(E)`.
Dazu Invarianten als Nachbedingung jedes Folds: kein Zyklus im Abschnitts-Baum; jede Einheit liegt in genau einem existierenden Abschnitt; Summen `fue+ufue+he == gesamt`; kein Ereignis nach `archiv.marker` wirksam.

**Ehrlich zu den Grenzen gegenüber Rust:**
- *Was TS gleich gut kann:* `fast-check` ist ein vollwertiger Property-Test-Rahmen mit Schrumpfen (Shrinking), Seeds und Wiedergabe — funktional vergleichbar mit `proptest`. Für die vier Eigenschaften oben gibt es keinen Unterschied in der Aussagekraft.
- *Was schlechter ist:* (a) **Geschwindigkeit.** Rust-Property-Tests laufen typischerweise eine Größenordnung schneller; bei gleichem Zeitbudget prüft Rust mehr Fälle. Gegenmaßnahme: nächtlicher CI-Lauf mit hoher Fallzahl, im Push-Lauf ein kleines Budget mit festen Seeds. (b) **Der Compiler garantiert weniger.** Rusts `enum` + `match` mit Exhaustiveness-Prüfung und `#[non_exhaustive]` fangen einen vergessenen Ereignistyp beim Kompilieren; TypeScript kann das mit diskriminierten Unions und einem `never`-Erschöpfungsprüfer nachbilden — aber nur, wenn man es diszipliniert tut, und `any` an einer Stelle hebelt es aus. Gegenmaßnahme: `switch`-Erschöpfung über `assertNie(x: never)`, ESLint `no-explicit-any` als Fehler, ein Test, der `EREIGNIS_TYPEN` gegen die im Fold behandelten Typen abgleicht (schlägt fehl, sobald ein Typ ohne Regel existiert). (c) **Keine Werttypen.** Versehentliche Mutation eines Zustandsobjekts im Fold ist in TS möglich und in Rust nicht. Gegenmaßnahme: `Object.freeze` in Testläufen (`deepFreeze` des Eingangszustands), damit versehentliche Mutation als Fehler auffliegt statt als stiller Zustandsdrift.
- *Was besser ist:* Dieselben Property-Tests laufen gegen **denselben Code**, der in erfassungsbogen.app läuft. Ein Rust-Fold wäre für die Bogen-Domäne ein zweiter, ungetesteter Nachbau — genau das Risiko, das §1.2 vermeidet.

### 7.3 Mehrclient-Simulation auf Dateiebene

Der Test, den v1 nie hatte und der den Lost-Update-Fehler verhindert hätte (s1-main §10 fordert ihn ausdrücklich: „Fileshare-Engpass als Szenario — in v2 zwingend erweitert um ‚zwei Prozesse, eine Datei'"):

- **Stufe 1 — In-Process:** *n* Kern-Instanzen mit getrennten `clientId` auf einem gemeinsamen Temp-Verzeichnis; Kommandos in zufälliger Reihenfolge; nach Konvergenz müssen alle Instanzen denselben Zustand melden. Läuft in Millisekunden, gehört in den Push-Lauf.
- **Stufe 2 — Mehrprozess:** echte Node-Kindprozesse, jeder mit eigenem Poll-Zyklus, gemeinsames Verzeichnis; dazu **Störungen**: Prozess wird mitten im Anhängen mit `SIGKILL` beendet (halbe Zeile → muss verworfen und beim Neustart gekürzt werden), Verzeichnis wird zeitweise unlesbar gemacht (Rechte entziehen → Offline-Pfad), Uhr eines Prozesses um +37 Minuten verstellt (HLC-Deckelung), zwei Prozesse mit **derselben** `clientId` (Image-Klon-Fall, nas Restrisiko 4 → muss erkannt werden).
- **Stufe 3 — Fehlerinjektion in der Dateischicht:** eine `Dateischnittstelle` (statt direkter `fs`-Aufrufe) erlaubt es, `EBUSY`, `ENOENT`, Latenz von 3 s, Kurzschreiben und „Datei ist plötzlich kürzer" gezielt einzustreuen. Damit sind die SMB-Eigenheiten aus nas §1 **testbar, ohne ein NAS zu haben** — der Punkt, an dem v1 blind war.
- **Stufe 4 — echte Freigabe, manuell:** einmal je Meilenstein auf dem realen Share der FüSt (M0 und danach), inklusive `skripte/smb-latenz.mjs` (stat/open/read/write/rename/readdir in ms), weil diese Zahlen bis heute fehlen (`nachlese-build-ci-latenz-messwerte.md` §1).

### 7.4 CI-Matrix

| Job | Läuft auf | Inhalt | Erwartete Dauer |
|---|---|---|---|
| `prepare` | ubuntu | Zeitstempel-Version + SemVer ableiten (v1-Muster) | ~5 s (gemessen v1) |
| `test` | ubuntu | `tsc --noEmit`, ESLint, vitest (Kern + Domäne + Speicher + Ausgaben + Renderer), Property-Tests mit kleinem Budget | 60–120 s [Annahme; v1 lag bei 30–45 s mit 190 Tests] |
| `test-windows` | **windows** | nur `@s1/speicher` + Mehrclient-Simulation | ~90 s — **neu und notwendig**: Pfadtrennzeichen, `create_new`-Semantik, Rename-Verhalten und Dateisperren unterscheiden sich unter Windows, und Windows ist die Zielplattform |
| `build` (Matrix) | ubuntu / ubuntu-arch / macos / windows | electron-builder | 120–290 s je Job (gemessen v1: linux 127 s, arch 140 s, mac 193 s, win 239 s im Median) |
| `e2e` | windows (+ ubuntu) | Playwright gegen das gebaute Artefakt, 10+ Szenarien | 3–8 min [Annahme; v1-Laufzeit nicht erhoben] |
| `release` | ubuntu | GitHub-Release + `latest.yml` + `aktuell.json` für die Share-Ablage | ~24 s (gemessen v1) |
| `nightly` | ubuntu | Property-Tests mit hohem Budget, Mehrclient-Stufe 2/3 mit vielen Läufen, Bundle-Budget | — |

Erwartete Gesamt-Wandzeit je Push: **7–10 min** gegenüber gemessenen 5:16 min bei v1 — der Aufschlag kommt aus `test-windows` und `e2e`, nicht aus dem Bauverfahren. Das ist der Preis dafür, dass die Speicherschicht auf der Zielplattform geprüft wird.

Zusätzlich im Repo `bos-kern`: eigener CI-Lauf (vitest Node + jsdom, `tsc`, ESLint-Grenzregeln, Bundle-Größe) — er ist die Absicherung dagegen, dass ein S1-Bedürfnis den Kern verunreinigt.

---

## 8. Meilensteine bis Excel-Parität

Bezugsgröße für die Schätzung: ein KI-gestützter Einzelentwickler. Belegte Vergleichswerte aus der Bestandsaufnahme: erfassungsbogen.app hat **300 Commits und ~24.800 Zeilen `src/`** in gut zwei Monaten erreicht (letzter Commit 2026-09-06); bmecatEditor **31,5 kLoC Rust in 9 Tagen** (bmecat §9 R5); S1-Control v1 **206 Commits, +70.488/−20.827** Zeilen. Diese Werte sind Grünfeld-Geschwindigkeiten mit hoher KI-Beteiligung; sie gelten hier nur, weil auch v2 grünes Feld ist und die Fachdomäne bereits spezifiziert vorliegt.

„Excel-Parität" ist definiert als: **alle F-A1…F-L6 und N-1…N-9 aus `excel-handbuch-anforderungen.md` §7 sind erfüllt oder ausdrücklich als „entfällt" begründet.**

### M0 — Beweis der Speicherarchitektur (ohne UI) · **2,0 PW**
Zuerst, weil hier das Projekt scheitern kann.
Inhalt: `@s1/speicher` + Fold-Motor + HLC + Ereigniskatalog-Gerüst; CLI `s1 falten|pruefen|messen-smb`; Mehrclient-Simulation Stufen 1–3; Messung auf dem **realen Share** der FüSt (Stufe 4).
**DoD:** (a) drei simulierte Clients konvergieren unter Störungen (Kill mitten im Schreiben, Rechteentzug, Uhrversatz +37 min, doppelte `clientId`) auf denselben Zustand; (b) die vier Property-Eigenschaften aus §7.2 halten über 10.000 generierte Fälle; (c) `skripte/smb-latenz.mjs` liefert Zahlen vom Share der FüSt, und das Poll-Intervall ist daraus **begründet** statt gesetzt; (d) `docs/KONZEPT-EREIGNISPROTOKOLL.md` und `KONZEPT-FOLD.md` sind §-nummeriert fertig; (e) ADR 0001 (Ereignisprotokoll statt Lockfile) geschrieben.
**Abbruchkriterium:** Wenn (a) oder (c) scheitert, ist Vorschlag C in dieser Form gestorben — dann muss über das Speichermodell neu entschieden werden, bevor irgendeine UI existiert.

### M1 — Kern extrahieren, Grenze durchsetzen · **1,5 PW**
Inhalt: Repo `bos-kern`, Umzug der Dateien aus §5.4, `SpeicherHuelle`-Interface in `einsaetze.ts`, Import-Umstellung in erfassungsbogen.app, ESLint-Grenzregeln, Bundle-Budget, eigener CI-Lauf.
**DoD:** erfassungsbogen.app baut und ist mit allen 684 Tests grün gegen `@bos/kern`; das Bundle ist nicht größer als vorher (Budgetprüfung); `bos-kern` läuft unter Node **und** jsdom; `docs/KONZEPT-KERN-GRENZE.md` inkl. Abbruchbedingung steht.
Risiko: Dies ist der einzige Meilenstein, der **das laufende Schwesterprodukt anfasst**. Er gehört früh, damit die Kopplung getestet ist, bevor S1 darauf baut.

### M2 — Erster vertikaler Schnitt: Einsatz führen · **3,0 PW**
Inhalt: Electron-Hülle, Kern-Worker, IPC, Einstellungen; Einsatz anlegen/öffnen/schließen auf dem Share; Abschnitts-Baum anlegen/umbenennen/verschieben/auflösen; Einheit manuell anlegen, bearbeiten, verschieben (auch mehrere), abmelden; ETB-Ansicht; Präsenzanzeige mit „Stand vor X s"; Undo (eigene, letzte n).
**DoD:** Zwei Rechner auf einem echten Share führen denselben Einsatz; Änderungen erscheinen ohne Neuöffnen; NAS-Stecker ziehen → beide arbeiten weiter, nach Rückkehr konvergent; die BDD-Szenarien aus v1 laufen gegen die neue App.

### M3 — Einheiten-Vollmodell · **2,5 PW**
Inhalt: alle Felder aus `excel-domaenenmodell.md` §9 (Bezeichnung, Organisation, Herkunft, taktische Gliederung, Geräte/Fahrzeuge, Aufträge, Erreichbarkeit, Bemerkungen); Status (9 Werte) und Schicht; Fahrzeuge und Personal je Einheit; Kopiervorlagen/StAN (F-J1) inkl. Vorlagenkatalog THW/FW/KatS-Nds; taktische Zeichen mit Inferenz aus v1; Suche/Filter/Sortierung aus dem Kern (`einheiten-liste.ts`).
**DoD:** F-C1…F-C7, F-G1…F-G3, F-J1/F-J2 erfüllt; eine reale Übungsliste ist vollständig erfassbar; Zeichen-Inferenz liefert dieselben Ergebnisse wie v1 (Regressionstest gegen v1-Testfälle).

### M4 — Meldekopf · **2,5 PW**
Inhalt: QR-Scan (Handscanner-Tastatureingabe **und** Kamera), Segmentzusammenbau, Signaturanzeige; Bündeldatei `.s1meld` exportieren/importieren; Meldekopf-Modus mit eigener Ereignisdatei; Eingangskorb gelb/grün mit Quittierung; Revisionen und Diff; Fingerabdruck-Zuordnung mit menschlicher Bestätigung; Aufteilen/Zusammenführen.
**DoD:** F-D1…F-D3, F-E1…F-E5, N-8 erfüllt; die drei Wege A/B/C aus §3.9 sind je einmal end-to-end vorgeführt; ein doppelt eingespieltes Bündel erzeugt keine Dublette.

### M5 — Ressourcenplanung und Ablösung · **1,5 PW**
Inhalt: `Anforderung`-Aggregat, Bereich „Angefordert/Anmarsch" mit Sonderzählung, Ablösungskette A↔B, Zusagen, Eintreffen, Einsatzende, Rückführung, Archivbereich „Einsatz beendet".
**DoD:** F-F1…F-F5 erfüllt; eine Ablösung ist vom Anfordern bis zum Rückführen durchspielbar und im ETB nachvollziehbar.

### M6 — Logistik, Kosten, FüSt-Personal · **2,5 PW**
Inhalt: Logistikzahlen abgeleitet und manuell (F-H1), Logistikübersicht je Raum × Schicht (F-H2); Kostenparameter und -ableitung (F-L6); Dienstposten-Raster (Stab/ZTr FK/FGr F/FGr K/Externe × Funktionen × Tag/Nacht) und Schichtplan über Datumsspalten (F-I1, F-I2) samt Projektion in den FüSt-Abschnitt.
**DoD:** F-H1…F-H4, F-I1/F-I2, F-L6 erfüllt; die FüSt-Stärke im Druck stimmt mit der Besetzung überein, ohne dass sie zweimal erfasst wird.

### M7 — Ausgaben · **3,0 PW**
Inhalt: die acht Produkte aus §6.2 inkl. FüOrg-SVG, Lagemonitor-HTML und Einsatzakte-ZIP; Golden-File-Tests; „Stand"-Zeile mit Peer-Angabe.
**DoD:** F-K1…F-K7, F-H3, N-4, N-9 erfüllt; ein Ausdruck der Stärkeübersicht ist neben dem Excel-Ausdruck derselben Lage prüfbar gleichwertig (Abnahme mit Johannes).

### M8 — Betrieb, Migration, Abnahme · **2,5 PW**
Inhalt: Installer für alle Ziele; Update-Ablage auf dem Share + electron-updater; `s1 uebernehmen` (v1-`.s1control`) und `s1 import-excel`; Diagnose/Log; Handbuch und Abkürzungsliste in der App (F-L4); Tastenkürzel für alle Kernfunktionen (N-5); Zugriffsschutz für Admin-Funktionen (N-7); Abnahme im Übungsbetrieb.
**DoD:** F-L1…F-L5, F-A1…F-A4, N-1…N-7 erfüllt; eine Übung wird vollständig in v2 geführt, ohne dass die Excel parallel läuft.

### Summe und Unsicherheit

| | PW |
|---|---|
| M0 Speicherbeweis | 2,0 |
| M1 Kern-Extraktion | 1,5 |
| M2 Vertikaler Schnitt | 3,0 |
| M3 Einheiten-Vollmodell | 2,5 |
| M4 Meldekopf | 2,5 |
| M5 Ressourcenplanung | 1,5 |
| M6 Logistik/Kosten/FüSt | 2,5 |
| M7 Ausgaben | 3,0 |
| M8 Betrieb/Migration | 2,5 |
| **Summe (Planwert)** | **21,0** |

**Spanne: 18–30 Personenwochen.**

Wo die Unsicherheit sitzt (und warum die Spanne nach oben weiter offen ist als nach unten):
- **Die Oberfläche, nicht die Logik.** Der Fachkern ist spezifiziert und teilweise vorhanden; die UI ist es nicht. v1 hatte 10.097 Renderer-Zeilen für einen kleineren Funktionsumfang, ohne Komponententests. Der Schichtplan (Datumsspalten × Funktionen), das FüOrg-Bild und die Einheitentabelle mit ~40 Spalten samt Ein-/Ausblendgruppen (F-L5) sind die drei Ansichten, die eine Woche mehr oder weniger kosten können.
- **M0 kann das Projekt umwerfen.** Fällt die Messung auf dem realen Share ungünstig aus (z. B. `readdir` über 2 s, oder `create_new` nicht atomar), kostet das Nacharbeit im Fundament, die nirgends eingeplant ist.
- **M1 hängt am Schwesterprodukt.** Die Extraktion ist mechanisch, aber jede Überraschung dort (Bundle wächst, ein Test hängt an der `localStorage`-Hülle) trifft einen Termin, den S1 nicht kontrolliert.
- **Betriebsparameter fehlen.** NAS-Typ, Windows-Version, Clientzahl, NTP, reale Einsatzgrößen sind **nicht ermittelt** (`nachlese-reale-betriebsparameter.md` §1/§2). Jede davon kann Zusatzarbeit auslösen (§10).
- **Nach unten begrenzt** ist die Spanne durch den schieren Umfang der Anforderungsliste: ~55 funktionale Anforderungen in 12 Gruppen plus 9 nicht-funktionale, davon mehrere Blöcke (FüSt-Personal, Schichtplan, Ressourcenplanung, FüOrg, Kosten), die in v1 **vollständig fehlen** (Kritik §3.1).

Nicht in der Spanne enthalten: Feldabnahme über mehrere Übungen, Schulung der FüSt, Nachpflege der StAN-Daten, und die laufende Pflege des geteilten Kerns für erfassungsbogen.app.

---

## 9. Risiken mit Gegenmaßnahmen

Priorisiert nach (Eintrittswahrscheinlichkeit × Schadenshöhe), höchstes zuerst.

| # | Risiko | Warum ernst | Gegenmaßnahme | Frühwarnsignal |
|---|---|---|---|---|
| **R1** | **Fold-Regelwerk unvollständig** — ein Ereignistyp ohne Regel oder eine Regel mit falscher Semantik erzeugt einen **stillen** Falschzustand: die Lage sieht plausibel aus, ist aber falsch. | Schlimmster denkbarer Fehler in einem Führungswerkzeug; nas §10 führt ihn als Restrisiko 1. Ein Lost Update war wenigstens sichtbar (Einheit verschwindet). | Ereigniskatalog als Spezifikation **vor** dem Code (`KONZEPT-FOLD.md`); Erschöpfungsprüfung `assertNie(x: never)` im `switch`; Test, der `EREIGNIS_TYPEN` gegen die behandelten Typen abgleicht; die vier Property-Eigenschaften (§7.2) plus Invarianten als Nachbedingung **jedes** Folds; Konflikthinweise sichtbar im ETB statt stillschweigend. | Ein Konflikthinweis, den niemand erklären kann; zwei Clients zeigen verschiedene Gesamtstärken. |
| **R2** | **Betriebsparameter unbekannt** — NAS-Modell, Windows-Version, Clientzahl, NTP, reale Einsatzgrößen sind nicht ermittelt; das Poll-Intervall (2 s) und die Sichtbarkeitszusage sind Setzungen. | Das Fundament ist auf Annahmen gebaut; SMB-Verhalten unterscheidet sich zwischen Synology, QNAP, Windows-Server und Samba erheblich (Oplocks, `kernel change notify`, Rename-Semantik). | M0 misst auf dem realen Share, bevor irgendeine UI existiert; `skripte/smb-latenz.mjs` bleibt als Diagnosewerkzeug in der Auslieferung; §10 listet die Angaben, die Johannes liefern muss. | M0 liefert Latenzen jenseits 1 s je Operation. |
| **R3** | **Kopplung an erfassungsbogen.app** — S1-Bedürfnisse blockieren dessen Releases, oder der Kern wächst und bläht die PWA auf. | Das Kernversprechen dieses Vorschlags ist zugleich sein größtes strukturelles Risiko (§1.5). | Additiv-Regel; Aufnahmeregel „nur was beide aufrufen"; ESLint-Grenzregeln; Bundle-Budget im CI der PWA; jedes Produkt pinnt einen Submodul-Commit; **dokumentierte Abbruchbedingung** (zweimal blockiert in drei Monaten → eingefrorenes Vendoring). | Ein Kern-Commit, der nur wegen S1 nötig war und in erfassungsbogen.app Anpassungen erzwingt. |
| **R4** | **Umfang der Excel-Parität wird unterschätzt** — ~55 funktionale Anforderungen, davon mehrere Blöcke ohne jede v1-Vorlage. | 21 PW Planwert bei 18–30 PW Spanne; ein Einzelentwickler ohne Puffer. | Vertikale Schnitte statt Schichten: nach M2 ist das Werkzeug benutzbar, jeder weitere Meilenstein ist ausliefer- und abnahmefähig; Anforderungsliste F-A1…N-9 als Checkliste im Repo mit Status je Zeile; „entfällt"-Begründungen sind erlaubt und werden dokumentiert. | Ein Meilenstein überzieht um mehr als 50 %. |
| **R5** | **UI unter Stress schlechter als die Excel** — N-5 fordert Tastatur-first, Eingabemasken mit Listen, minimale Ladezeiten. Die Excel kann das seit Jahren (Strg+A, Strg+D, Strg+Q, Kürzel für alles). | Ein funktional vollständiges, aber langsamer bedienbares Werkzeug wird in der FüSt nicht angenommen — dann war alles umsonst. | Tastenkürzel und Eingabemaske sind **Anforderung ab M3**, nicht Politur am Ende; `UI-ABNAHME.md` nach bmecatEditor-Muster mit einer Abnahmeliste je Ansicht; jede Ansicht bekommt Komponententests, die das Kommando bei Tastendruck prüfen; frühe Abnahme mit Johannes an realen Listen. | Bei der ersten Übung greift jemand zur Maus, wo er in Excel ein Kürzel benutzt hätte. |
| **R6** | **Verlust der Historie beim Umstieg / Doppelbetrieb** — laufende Einsätze in Excel oder v1, Migration ist priorisiert niedrig (M8). | Ein halb migrierter Einsatz ist schlimmer als gar keiner. | Kein Mischbetrieb auf einem Einsatz (§3.10): v2-Ordner enthält keine `.s1control`; v2 lehnt fremde Schemaversionen ab, statt zu überschreiben (v1 überschreibt blind, `connection.ts:24-31`); Übernahme erzeugt genau **ein** sichtbares Ereignis, keine erfundene Historie; Umstieg erfolgt zwischen Einsätzen, nicht während eines. | Jemand fragt, ob man „mal eben" mit beiden Versionen auf denselben Ordner geht. |
| **R7** | **Doppelbestand STAN/Vokabulare** — v1 hat `thw-stan-2025.generated.json` (47 Einträge) + Inferenz, der Kern hat `vokabulare/thw-stan-personal.ts`, `thw-stan-fahrzeuge.ts`, `thw-ov.ts`, `thw-funkrufnamen.ts`. Zwei Quellen für dieselbe Wirklichkeit driften. | Fachlich falsche Vorschläge (Fahrzeugtyp, Funkrufname, Sollstärke) fallen erst im Einsatz auf. | Ab M3 **eine** Quelle: die Kern-Vokabulare gewinnen für Personal/Fahrzeuge/OV/Funkrufnamen, die v1-STAN-Datei für die Kopiervorlagen-Struktur; ein Test vergleicht beide und schlägt bei Widerspruch fehl; das Extraktionsskript erzeugt künftig in das Kernformat. | Zwei verschiedene Schreibweisen desselben Fahrzeugtyps in einer Ansicht. |
| **R8** | **Kein Windows-Codesigning** (unverändert gegenüber v1, bmecat R13) — SmartScreen-Warnung, Installation durch Nicht-IT-Personal im Einsatz. | Ein Update, das niemand installiert, existiert nicht. | Organisatorisch: Installation und Ablagepflege durch die FüSt-IT, SHA-256 im Begleitzettel und in `aktuell.json`; mittelfristig Zertifikat beschaffen (Entscheidung §10, Punkt 9). | Rückmeldung „ich konnte das nicht installieren". |
| **R9** | **Electron-Sicherheits- und Größenlast** — Chromium-CVEs erzwingen regelmäßige Major-Updates, Installer 90–120 MB. | Dauerlast für einen Einzelentwickler; ein hängengebliebenes Electron-Major macht die App irgendwann unwartbar. | Electron-Version mit erfassungsbogen.app **gemeinsam** heben (dort ist bereits `electron ^43.4.0` + `electron-builder` + `electron-updater` im Einsatz — ein Aktualisierungsvorgang für zwei Produkte); `contextIsolation` an, `nodeIntegration` aus, Preload ohne Logik, CSP gesetzt (nicht `null` wie bmecatEditor, M33); Renderer bekommt nie einen Dateipfad. | Zwei Majors Rückstand. |
| **R10** | **Sichtbarkeitslatenz wird als Fehler wahrgenommen** — bis 10 s, bis die erste Datei eines neuen Clients erscheint (Windows-Directory-Cache). | „Der sieht meine Einheit nicht" untergräbt das Vertrauen in das Werkzeug mehr als ein sichtbarer Fehler. | Ehrliche Anzeige statt Beschönigung: Peer-Liste mit „zuletzt gesehen", Stand-Zeile auf jeder Ausgabe (F-K7 erweitert), UDP-Unicast an bekannte Peers als Beschleuniger; im Handbuch erklärt. | Nachfragen im Übungsbetrieb. |
| **R11** | **Ereignis-Schemaevolution über Jahre** — Archivakten müssen in fünf Jahren noch faltbar sein; ein alter Client darf neue Ereignistypen nicht verwerfen. | Ein Archiv, das die aktuelle Version nicht mehr lesen kann, ist Datenverlust mit Verzögerung. | `v` je Ereignistyp + Upcaster-Kette mit Test je Stufe (M16); Regel K11 „unbekanntes Ereignis durchreichen und anzeigen"; `mindestAppVersion` im `manifest.json`; ein CI-Test faltet eine eingecheckte **Alt-Akte** aus jeder je ausgelieferten Formatversion. | Ein Upcaster ohne Test. |
| **R12** | **Geklontes Windows-Image** → zwei Rechner mit derselben `clientId` schreiben in dieselbe Datei (nas Restrisiko 4). | Genau der Multi-Writer-Fall, den das ganze Modell vermeidet. | Beim Start prüft der Client, ob das Ende der Share-Datei zu seinem lokalen Offset passt; wenn nicht: neue `clientId`, neue Dateigeneration, ETB-Vermerk; Mehrclient-Simulation Stufe 2 testet den Fall. | Ein „Fremdschreiber erkannt"-Eintrag im ETB. |
| **R13** | **Schnappschuss verfälscht die Lage** — ein fehlerhafter Schnappschuss wird von allen Lesern übernommen. | Wirkt wie R1, hat aber eine andere Ursache. | Schnappschüsse sind immer verwerfbar; sie tragen Versionsvektor + blake3; Leser prüfen stichprobenartig gegen Neu-Fold; ein CI-Test faltet jede Akte einmal mit und einmal ohne Schnappschuss und vergleicht. | Abweichung im Vergleichstest. |
| **R14** | **Ein-Personen-Team ohne zweiten Leser** — der Kern hat keinen Reviewer, Konzepte existieren nur im Kopf. | Betrifft Wartbarkeit und Übergabefähigkeit; bmecatEditor zeigt den Gegenpol (Konzeptdokumente mit §-Nummern, M29/M30). | Konzeptdokument je Vorhaben **vor** dem Code, ADR-Verzeichnis ab Tag 1, Codekommentare verweisen auf §-Nummern; die Kopfkommentare von erfassungsbogen.app (die begründen, *warum* eine Regel so ist) sind der zu haltende Maßstab. | Ein Commit, dessen Begründung nirgends steht. |
| **R15** | **Property-Tests bleiben oberflächlich** — generierte Ereignisfolgen treffen die interessanten Fälle nicht (Verschieben in aufgelösten Abschnitt, Teilen und sofortiges Zusammenführen, Meldung nach Archivierung). | Grüne Tests ohne Aussagekraft sind gefährlicher als keine. | Generatoren erzeugen **gültige Kommandofolgen** gegen den jeweils aktuellen Zustand (Modell-basiertes Testen), nicht zufällige Ereignisse; die zehn bekannten Konfliktfälle K1–K12 zusätzlich als handgeschriebene Tests; Mutationsstichprobe: eine bewusst kaputte Fold-Regel muss die Property-Tests zum Scheitern bringen. | Eine Regeländerung, die keinen Test rot macht. |

---

## 10. Was Johannes noch entscheiden oder liefern muss

Sortiert nach Dringlichkeit; die ersten fünf blockieren M0.

### Blockiert M0 (Speicherbeweis)

1. **Zugang zum realen Share für eine Messung.** Gebraucht wird ein Verzeichnis auf dem Einsatz-NAS, in das `skripte/smb-latenz.mjs` schreiben darf. Gemessen werden `stat`, `open`, `read`, `append+fsync`, `rename`, `readdir` in ms, je 100 Wiederholungen, von einem Windows-Client und einem Mac. Ohne diese Zahlen ist das Poll-Intervall geraten. Belegt fehlend: `nachlese-build-ci-latenz-messwerte.md` §1 („kein SMB-Share gemountet"), `nachlese-reale-betriebsparameter.md` §1.
2. **NAS-Typ und SMB-Dialekt.** Hersteller/Modell/Firmware (Synology DSM, QNAP QTS, Windows-Server, Fritz!Box-USB, Samba-Version). Ermittelbar mit `Get-SmbConnection` auf dem Windows-Client (liefert Dialekt, z. B. 3.1.1) bzw. `smbutil statshares -a` am Mac. Davon hängen Oplock-Defaults, `create_new`-Atomarität und Rename-Semantik ab. Bisher belegt ist nur „1x Netzwerkfestplatte" aus der Übungs-Materialliste (`nachlese-reale-betriebsparameter.md` §2).
3. **Windows-Version der FüSt-Rechner.** Win10 (welcher Build/LTSC?) oder Win11; 64-bit x64 oder ARM. Bestimmt das Buildziel und die Erwartung an `test-windows` in der CI.
4. **Anzahl gleichzeitiger Clients und Rollen im Regelbetrieb.** Die Aufgabe nennt „typisch 2–4, FüSt + Meldeköpfe". Zu bestätigen: Wie viele **schreibende** Arbeitsplätze, wie viele nur lesende Tablets (Lagekarte, Logistik)? Ein rein lesender Client kann leichtgewichtiger bedient werden (nur HTML-Monitor statt Installation).
5. **NTP im Einsatznetz: ja oder nein?** Antwort ändert nichts am Modell (HLC gilt in jedem Fall), aber sie bestimmt, ob die Uhrabweichungs-Warnung ein Ausnahmefall oder ein Dauerzustand ist — und ob fachliche Zeitstempel per Hand nachgepflegt werden müssen.

### Blockiert M1 (Kern-Extraktion)

6. **Zustimmung zum Eingriff in erfassungsbogen.app.** M1 ändert dort ~40 Importpfade und ersetzt in `einsaetze.ts` den direkten `localStorage`-Zugriff durch ein injiziertes Interface. Das ist mechanisch und durch 684 Tests abgesichert, aber es ist ein Eingriff in ein laufendes Produkt zu einem Zeitpunkt, den S1 vorgibt. Wenn erfassungsbogen.app in den nächsten Wochen ein Release braucht, gehört M1 dahinter — oder es wird der Zwischenschritt aus §5.4 gewählt (S1 bindet vorerst das Bogen-Repo ein).
7. **Repo-Name und Sichtbarkeit von `bos-kern`.** Öffentlich (wie erfassungsbogen.app unter EUPL-1.2) oder privat? Öffentlich hätte den Vorteil, dass andere Führungsstellen den EEB-Codec nutzen können; privat spart die Lizenz-/Beitragsfragen. Empfehlung: **EUPL-1.2 wie das Schwesterprodukt**, weil der Kern ohnehin dessen Code enthält.

### Vor M4 (Meldekopf)

8. **Ist der Meldekopf-Arbeitsplatz S1-Control oder erfassungsbogen.app?** Beide sind technisch möglich (§3.9). S1-Control-im-Meldekopf-Modus kann direkt in die Ereignisdatei schreiben und den vollen Einsatzkontext sehen; erfassungsbogen.app kann auf einem Tablet/Handy ohne Installation laufen und ist den meldenden Einheiten bereits bekannt. Empfehlung: **beides zulassen** — der Weg B (Bündeldatei) macht das ohne Zusatzaufwand möglich. Zu entscheiden ist nur, welcher Weg im Handbuch der empfohlene ist.
9. **Signaturbetrieb.** Sollen Meldeköpfe ihre Bündel signieren (Ed25519, TOFU, `signatur.ts`)? Wenn ja: Wie werden Absenderkarten in der FüSt bekanntgemacht? Wenn nein: Der Kern kann es trotzdem, es wird nur nicht verlangt.

### Vor M8 (Betrieb)

10. **Peer-Update: ja oder nein?** Vorschlag C **streicht** das LAN-Peer-Update (796 + 123 Zeilen, in v1 standardmäßig deaktiviert; s1-main §10 führt es unter „weglassen") und ersetzt es durch die Update-Ablage auf demselben Share (§2.5). Wenn Johannes es als harte Anforderung setzt, kostet das grob **+1,0 PW** und muss vor M8 entschieden werden.
11. **Rollen: bedeuten sie etwas?** v1 hat ADMIN/S1/FUE_ASS/VIEWER, setzt sie aber nirgends durch, und das README beschreibt automatische Anmeldung (s1-main §11). Zu entscheiden: (a) Rollen streichen und stattdessen nur einen **Akteursnamen** je Ereignis führen (ETB-Zweck erfüllt, N-6), oder (b) Rollen behalten und mindestens drei Dinge daran knüpfen: archivieren dürfen, fremde Ereignisse kompensieren dürfen, Admin-Funktionen (N-7). Empfehlung: **(a) zum Start, (b) erst wenn ein konkreter Missbrauchsfall benannt werden kann** — die Excel schützt heute mit einem Klartext-Passwort, das ist kein hoher Maßstab.
12. **Windows-Codesignatur beschaffen?** Kosten gegen den Aufwand jeder Installation abwägen (R8).

### Daten, die geliefert werden müssen (nicht blockierend, aber terminwirksam)

13. **Gefüllte Excel-Mappen realer Einsätze/Übungen** — gibt es sie? Falls ja, mindestens eine als Testfixture für `s1 import-excel` (M8). Falls nein, entfällt die Importfunktion und M8 wird um ~0,5 PW leichter (Kritik §3.7: nicht ermittelt).
14. **Reale `.s1control`-Dateien** eines abgeschlossenen Einsatzes als Fixture für `s1 uebernehmen` und als Größenreferenz (bisher nur ein Beispiel mit 6.762 B / 4 Einheiten).
15. **Reale Einsatzgrößen** — Einheiten, Fahrzeuge, Helfer, Dauer, Zahl der Meldungen je Tag. Drei widersprüchliche Baselines stehen im Raum (150 / 5.000 / 272 Excel-Zeilen, Kritik §3.6 Punkt 6); eine Zahl aus einer echten Lage ersetzt alle drei.
16. **Legacy-`.sqlite`-Dateien** — existieren produktive Alt-Dateien mit Daten, die jemand noch braucht? Wenn ja, ist das ein einmaliger manueller Vorgang und kein Produktfeature (§3.10 c).
17. **Abnahmemaßstab für die Ausgaben.** Für M7 wird ein Excel-Ausdruck einer realen Lage gebraucht, gegen den der PDF-Druck geprüft wird — insbesondere Reihenfolge der Einsatzstellen, Rundungen und die Plausibilitätszeile.

---

## Anhang: Kurzfassung der Entscheidungen dieses Vorschlags

| # | Entscheidung | Kurzbegründung |
|---|---|---|
| E1 | Geteiltes TS-Kernpaket `@bos/kern` für S1-Control v2 und erfassungsbogen.app | Bogenmodell, Codec, Signatur, Meldekopf-Sammlung, Aufteilen/Zusammenführen, Diff, XLSX/PDF liegen fertig und getestet vor (684 Tests); Nachbau wäre Doppelpflege |
| E2 | Desktop-Hülle **Electron**, nicht Tauri | Der geteilte Kern muss außerhalb des UI-Threads mit Dateizugriff laufen; das kann nur Node. Zusätzlich: Offline-Installer ohne Zusatzaufwand, Playwright bleibt, Updater bleibt |
| E3 | **Append-only-Ereignisprotokoll** mit einem Schreiber je Datei, HLC, deterministischem Fold — **nicht** Portierung des Lockfile-Modells | Lost Update ist reproduziert; der Lockpfad wird von jeder belegten SMB-Eigenschaft getroffen, der Append-Pfad von keiner; ETB/Undo/Backup fallen ab |
| E4 | Stärke als **absoluter Meldestand mit LWW**, nicht als additiver Zähler | Abweichung von nas §4 (a): Stärke ist ein gemeldeter Stand; additive Ereignisse würden Doppelmeldungen verdoppeln |
| E5 | Trennung **`Meldung` (gehört der Einheit)** vs. **`EinsatzEinheit` (gehört der FüSt)**, „manuell schlägt gemeldet" | Die Excel mischt beides in einer Zeile; der Kommentar in `oldenburg-xlsx.ts` benennt die Grenze bereits |
| E6 | Meldekopf schreibt **selbst** ins Ereignisprotokoll (direkt / Bündeldatei / QR) | Google-Tabelle und „als Formel einfügen"-Workaround entfallen; F-E1…F-E5 per Konstruktion erfüllt |
| E7 | Kanonische Organisationsliste = **EEB-`OrganisationsTyp`**, FüSt-Ergänzungen ab Code 200 | Additiv-Regel gewahrt, Transportformat unberührt |
| E8 | Kern als **eigenes Repo, git-Submodul + `file:`-Abhängigkeit**, mit Aufnahmeregel und dokumentierter Abbruchbedingung | pinnt Commits, erzwingt die Grenze, hält lokale Bearbeitbarkeit, koppelt keine Release-Takte |
| E9 | **Update-Ablage auf dem Share** statt LAN-Peer-Update | nutzt vorhandene Infrastruktur, zustandslos, ~200 Zeilen statt ~920 |
| E10 | **M0 zuerst**: Speicherarchitektur beweisen (inkl. Messung auf dem realen Share), bevor eine Zeile UI entsteht | Hier kann das Vorhaben scheitern; ein Abbruch nach 2 PW ist billig, einer nach 15 PW nicht |

