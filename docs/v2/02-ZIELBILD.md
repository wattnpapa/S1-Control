# 02 – Zielbild

Stand: 2026-09-08 · Quelle: Urteil §11 und §12, Vorschlag A §2 bis §7, Vorschlag C §3 bis §5, Zieldatenmodell §3 und §4 (alle unter `../v2-arbeitsstand/entwurf/`)

## Stack

| Schicht | Wahl | Warum |
|---|---|---|
| Sprache | TypeScript strict, Ziel TS 7 | eine Sprache über Kern, Schale, Renderer, CLI und geteilten Kern |
| Desktop-Schale | Electron, aktuelle Stable-Linie (^43) | Installer per Konstruktion offline vollständig; per-User-NSIS ohne Admin; `webContents.printToPDF` für die Ausgabeprodukte; Zweitfenster erprobt |
| Renderer | React 19, Vite 8, Zustand-Store, Komponententests mit Testing Library | v1-Renderer wird nicht übernommen (150-Props-Drilling, 91 Typfehler, keine Komponententests) |
| Modulsystem | ESM (`"type": "module"`) | Voraussetzung für den geteilten Kern |
| Schemata | zod für Ereignis-, IPC- und Manifest-Schemata | Typsicherheit an der Datei- und Prozessgrenze |
| Bau | Vite (Renderer), tsup (Main/Preload), electron-builder (Pakete) | erprobt; CI-Median heute 5 bis 6 Minuten je Lauf |
| Tests | Vitest 4, fast-check (Property-Tests für den Fold), Playwright + playwright-bdd (die 10 deutschen BDD-Szenarien bleiben lauffähig) | |
| **Nicht im Stack** | Rust, Tauri, SQLite, native Module, LAN-Peer-Update | ADR-001, ADR-002 |

Ohne SQLite braucht das Produkt kein einziges natives Modul mehr: Das Ereignisprotokoll kommt mit `node:fs`, `node:crypto`, `node:worker_threads` und `node:dgram` aus. Damit verschwinden node-gyp, ABI-Brüche und der Cross-Build-Zwang, die bisher der schwerste Electron-Nachteil waren.

## Vier Ringe mit erzwungenen Importgrenzen

Jeder Ring darf nur nach innen importieren; die Grenzen werden per ESLint (`no-restricted-imports`) und durch Testläufe unter `node` und `jsdom` maschinell geprüft, nicht durch Disziplin.

```
@bos/kern      plattformneutral, geteilt mit erfassungsbogen.app (eigenes Repo, git-Submodul vendor/bos-kern)
               EEB-Bogenmodell, Codec EEB2/EEB2C, Ed25519-Signatur, Meldekopf-Sammlung
               (Revisionen, Inhalts-Hash, neuesteJeEinheit), Aufteilen/Zusammenführen,
               Meldungs-Diff, Vokabulare, XLSX-Schreiber
               kein node:, kein DOM, kein React, kein Electron

@s1/domaene    plattformneutral, nur S1
               Zielmodell, Ereigniskatalog, Fold, Konfliktregeln, HLC, Kennzahlen,
               Zeichen-Inferenz und STAN-Daten aus v1, Validierung
               kein node:, kein DOM, kein React, kein Electron

@s1/speicher   node:fs, node:crypto: Segmente, Spiegelung, Schnappschüsse, Präsenz
@s1/netz       node:dgram: UDP-Hinweis als Beschleuniger (optional, siehe offene Entscheidung 11)
@s1/ausgaben   Rendering der Ausgabeprodukte (HTML-Vorlagen, PDF über Electron, XLSX über @bos/kern)
@s1/cli        bin "s1": akte pruefe | falte | exportiere | simuliere | diagnose

apps/desktop   Electron-Main ohne Fachzustand
               + ein worker_thread je offener Akte (Share-I/O, Fold, Projektion)
               + zwei Renderer: index.html (Arbeitsplatz) und monitor.html (Stärke-Monitor)
```

Bewusste Abweichung vom Hybrid-Vorschlag: HLC, Ereigniskatalog und Fold bleiben in `@s1/domaene`. Der Erfassungsbogen braucht sie nicht, und der Fold ist der Teil, der sich in den ersten Monaten am häufigsten ändert; er darf nicht am Release-Takt eines zweiten Produkts hängen.

## Speichermodell

### Dateilayout auf dem Share

```
\\NAS\...\S1-Control\
  manifest.json                              formatVersion; mindestClientVersion nur als Warnung
  einsaetze\<datum>_<slug>_<kurzid>\
    einsatz.json                             create_new, unveränderlich (Stammdaten; Änderungen sind Ereignisse)
    ereignisse\<clientId>.<segment>.jsonl    ein Schreiber je Datei; Segmentwechsel nach Größe, nicht je Start
    schnappschuesse\<hlc>-<clientId>.json    Versionsvektor + Hash + foldVersion; jederzeit verwerfbar
    praesenz\<clientId>.json                 einzige überschriebene Datei, nur die eigene; rein informativ
    anhaenge\                                EEB-Scans u. ä., inhaltsadressiert, unveränderlich
    ausgaben\                                erzeugte Ausdrucke und HTML-Monitor
    archiv.marker                            abgeleiteter Anzeiger; Wahrheit ist das Ereignis EinsatzArchiviert
  programm\                                  Update-Ablage; Manifest Ed25519-signiert
  stammdaten\stan-<version>.json
```

Lokal je Client (App-Data): dieselbe Struktur als Spiegel plus `upload-state.json` (eigener Upload-Offset je Segment, zuletzt gelesene Offsets je fremder Datei).

### Tragende Festlegungen

1. **Jeder Client schreibt ausschließlich eigene Dateien.** Kein Lock, kein Master, keine TTL, kein Replace-Rename im Datenpfad. Damit berührt keine der belegten SMB-Schwächen (Byte-Range-Locks, Oplock-Breaks, 10-Sekunden-Metadaten-Caches, nicht-atomare Stale-Übernahme) den Schreibpfad.
2. **Local-first.** Jedes Ereignis wird zuerst lokal angehängt; die Share-Spiegelung ist ein wiederholbarer Append ab Offset. NAS-Ausfall ist der Normalpfad, kein Fehlerpfad; es gibt keinen Merge-Dialog, nur Konflikthinweise.
3. **Der Fold ist eine Mengenfunktion, der Live-Pfad ist ein Rebase, jedes materialisierte Feld trägt die HLC seines Gewinners.** Diese eine Präzisierung räumt die gemeinsamen Blocker aller drei Vorschläge ab.
4. **Ordnung über HLC, nie über die Wanduhr.** HLC wird als Struktur verglichen, nicht als Zeichenkette. Die fachliche Zeit (Meldezeit, Einsatzende) ist Nutzereingabe wie im Papier-ETB, wird angezeigt und plausibilisiert, aber nie zur Ordnung verwendet.
5. **Jedes setzende Ereignis trägt den gesehenen Vorher-Wert.** Passt er nicht zum gefalteten Zustand, erscheint ein Konflikthinweis am Feld. Last-Writer-Wins ohne diesen Hinweis wäre stilles Verwerfen.
6. **Sichtbarkeit ehrlich anzeigen.** Poll am bekannten Byte-Offset, Intervall aus der M0-Messung kalibriert; UDP nur als Beschleuniger. Die Oberfläche zeigt „Stand: vor 8 s" und den Peer-Status; für die erste Datei eines neuen Clients sind bis zu 10 Sekunden zugesagt, nicht weniger.
7. **Zeilenformat** `länge \t crc32 \t json` mit fsync je Zeile und Hash-Kette innerhalb der Datei. Der Vorgänger-Hash wird beim Lesen geprüft; eine defekte Zeile in der Dateimitte führt zur Quarantäne ab Offset mit sichtbarem Hinweis, nie zum Stillstand des Lesers. Der Anspruch „revisionssicher" wird nicht erhoben: ganze Segmente sind ohne Erkennung löschbar; erkennbar ist nur eine nachträgliche Änderung innerhalb einer Datei.
8. **Ereignis-Identität** `<clientId>:<laufnummer>` mit persistenter, monotoner Laufnummer je Client; Fremdschreiber-Erkennung beim Start (geklontes Profil, zwei Instanzen auf einem Rechner); `requestSingleInstanceLock` verbindlich.
9. **Undo** ist ein normales Ereignis mit `undoOf`, ohne Sonderpfad im Fold; Undo-Stapel je Client; `KorrekturVon` für fachlich falsche Einträge; kein Redo.
10. **Archivierung ist ein Ereignis** (`EinsatzArchiviert`), kein Dateizustand. `archiv.marker` bleibt als **abgeleiteter Anzeiger** erhalten, damit die Einsatzliste den Zustand zeigen kann, ohne den Ereignisstrom zu falten; er ist jederzeit aus den Ereignissen neu erzeugbar, und sein Verlust kostet nichts als diesen Komfort. Ein Ereignis mit einer HLC nach der des Archivierungsereignisses hat genau eine definierte Behandlung. Das Verschieben des Ordners darf keinen laufenden Upload ins Leere laufen lassen.

    *Geändert am 2026-09-08 (Johannes).* Die ursprüngliche Fassung machte den Marker zum Zustandsträger. Damit wäre der Archivzustand der einzige gewesen, der sich nicht allein aus den Ereignissen ergibt — im Widerspruch zu „Wahrheit sind die Ereignisse" —, und der Vergleich gegen „die HLC des Markers" hätte keinen definierten Bezugspunkt gehabt. Ausformuliert in [konzepte/KONZEPT-SPEICHER.md](konzepte/KONZEPT-SPEICHER.md) §5.7; die Semantik des Ereignisses gehört in `KONZEPT-EREIGNISSE.md`, wo 05-UMSETZUNGSPLAN.md M1.2 die Barriere `EinsatzArchiviert` bereits vorsieht.

Ereignistypen, Payloads, Konfliktregel je Typ und die Property-Eigenschaften P1 bis P6 für den Fold stehen ausformuliert in `entwurf/zieldatenmodell-feldabgleich.md` §4. Wo die zwölf Regeln K1 bis K12 aus Vorschlag C davon abweichen, gilt das Zieldatenmodell; eine bewusste Ausnahme wird übernommen: Stärke ist ein absoluter Meldestand mit Last-Writer-Wins über das Tripel, kein additiver Zähler.

## Fachmodell in Grundzügen

- **Einsatz** mit Stammdaten (Name, FüSt, übergeordnete FüSt, Kostenparameter).
- **Abschnitt / Einsatzstelle** als Baum mit Typ (Führungsstelle, Meldekopf, Bereitstellungsraum, Logistik, Angefordert/Anmarsch, Einsatzort, Einsatz beendet); frei benennbar, unbegrenzt in der Zahl. Ersetzt die 21 fest verdrahteten Bereiche der Excel.
- **EinsatzEinheit** gehört der Führungsstelle: Bezeichnung, Organisation, Herkunft, Gliederungsebene (Zug/Trupp/Gruppe/Person), Stärke F/UF/M als Meldestand, Status (9 Werte der Excel), Schicht, Aufträge, Erreichbarkeit, Bemerkung, Logistikbedarf (w/d, vegetarisch/vegan, Übernachtung m/w/d), Ressourcenplanung (Verfügbar bis, Ablösung angefordert, Anforderungs-ID, Zugesagt für/von, vorgesehene Einheit und Auftrag, eingetroffen, Einsatzende, Rückführung), EEB-Referenz.
- **Meldung** gehört der meldenden Einheit: der Erfassungsbogen mit Revisionen, Signaturkette und Herkunft. Die Grenze zwischen Meldung und EinsatzEinheit ist die Grenze, die der Oldenburg-Export der Erfassungsbogen-App bereits zieht („Spalten, die der Führungsstelle gehören, bleiben leer").
- **Fahrzeug/Gerät**, **Person** (aus dem Bogen oder manuell), **FüSt-Personal mit Schichtplan**, **ETB-Eintrag** (jedes Ereignis ist einer), **Vorlagenkatalog** (StAN THW, KatS-StAN Nds, Feuerwehr, aus den Kopiervorlagen der Excel und den THW-Vokabularen des Erfassungsbogens).
- Alle Kennzahlen (Summen je Bereich, Organisation, Status, Schicht; Logistik; Kosten) sind Projektionen mit den Formeln aus `bestandsaufnahme/excel-domaenenmodell.md` §10.

Die vollständige Abgleichstabelle Excel-Spalte → v1-Feld → EEB-Feld → v2-Entscheidung und die Enum-Abbildungen (Organisation 12 ↔ 14 ↔ 11+Sonstige, Status 9 ↔ 3 + Abschnittstyp, Schicht, Rolle, Geschlecht, Ernährung) stehen in `entwurf/zieldatenmodell-feldabgleich.md` §1 und §2.

## Meldekopf auf drei Wegen

Weil die Meldekopf-Sammlung des Erfassungsbogens selbst schon ein Append-Store ist (Revisionen stapeln, Inhalts-Hash als Identität, neueste Revision je Einheit als Fold), wird sie eingebettet statt nachgebaut. Ein Meldekopf erzeugt dann auf jedem der drei Wege dieselben Ereignisse:

1. **Direkt auf dem Share**: S1-Control im Meldekopf-Modus schreibt in seine eigene Ereignisdatei des Einsatzes.
2. **Bündeldatei** `.s1meld`: ohne Netzverbindung erzeugt, per USB oder Funk übergeben, in der FüSt importiert; idempotent über die Inhalts-Hashes.
3. **QR-Code**: einzelner Bogen per Kamera oder USB-Handscanner, inklusive Segmentsammlung (im Mittel 2,9 Teile je Bogen) und Signaturprüfung.

Die Google-Tabelle der Excel entfällt damit ersatzlos; die gelb/grün-Quittierung wird zum Eingangskorb mit Status „neu / übernommen / geändert".

## Ausgaben

Die Ausgabeprodukte der Excel (Druck für die Lagekarte, Status-Matrix, Logistik, LogFrei, FüOrg, Auswertung, HTML-Monitor mit 60-Sekunden-Reload) werden als Projektionen gerendert: HTML-Vorlagen in `@s1/ausgaben`, PDF über `webContents.printToPDF`, XLSX über den Schreiber aus `@bos/kern`, HTML-Monitor als Datei im Ordner `ausgaben\` des Einsatzes. Der Stärke-Monitor auf dem Zweitbildschirm übernimmt die Fensterlogik aus v1 (`strength-display.ts`) ohne Prewarm-, Splash- und SLO-Ballast.

## Updates und Verteilung

- Windows: NSIS per-User ohne Elevation, plus Portable-EXE; macOS signiert und notarisiert wie heute; Linux deb/pacman.
- Updates über die Ablage `programm\` auf demselben Share mit Ed25519-signiertem Manifest (die Signaturprimitive kommt aus `@bos/kern`); GitHub-Releases bleiben Quelle für Rechner mit Internet. Das LAN-Peer-Update von v1 (rund 920 Zeilen) entfällt.
- Ohne Windows-Codesignatur muss der Share-Update-Weg zwingend signiert sein (offene Entscheidung 6).

## Diagnose im Einsatz

Übernommen aus dem Tauri-Vorschlag, weil er als einziger „Diagnose ohne Entwickler vor Ort" systematisch löst: strukturiertes Logging in Datei, Diagnoseansicht in der Anwendung (Peer-Status, Offsets, letzte Fehler), CLI `s1 diagnose` und `s1 akte pruefe`, und eine Störfallmatrix „Symptom → was tut der Bediener" als Teil der Anwenderdokumentation.

## Tests und Qualitätssicherung

- Property-Tests (fast-check) für den Fold: Permutation der Ereignisreihenfolge ergibt denselben Zustand; Idempotenz; Kommutativität je Regel. Das Abbruchkriterium darf keine Tautologie über die Sortierfunktion sein.
- **Mehrclient-Simulation `s1 simuliere`** mit feindlicher Dateisystem-Schicht (verzögerte Sichtbarkeit, abgeschnittene Zeilen, Rename-Fehler, blockierende Aufrufe) im Unit-Lauf, und als **Release-Gate gegen ein echtes Share auf mindestens zwei Rechnern und zwei Betriebssystemen** mit Konvergenzvergleich per Hash.
- Komponententests für den Renderer; die zehn BDD-Szenarien aus v1 als Verhaltensspezifikation, ergänzt um Mehrbenutzer-Szenarien.
- CI: eigener Job für die Speicherschicht auf Windows, macOS und Linux; Build-Matrix wie heute; Zeitstempel-Tag beibehalten.

## Repo-Struktur auf dem Branch

```
S1-Control/
  package.json              npm-Workspaces, ESM
  packages/
    domaene/  speicher/  netz/  ausgaben/  cli/
  apps/desktop/             Electron-Main, Preload, Worker, zwei Renderer
  vendor/bos-kern/          git-Submodul (eigenes Repo; Aufnahmeregeln siehe ADR-003)
  test/  e2e/               Vitest, Playwright + playwright-bdd
  docs/v2/                  dieser Ordner; docs/v2-arbeitsstand/ als Beleg
  legacy-v1/                (optional) v1-Code als Referenz, nicht gebaut; oder v1 bleibt allein auf main
```

Aus v1 werden gezielt herausgelöst: `json-store/types.ts` als Ausgangspunkt der Typen, die reinen Fachregeln aus `einsatz-write/*` und `command.ts`, Zeichen-Inferenz und STAN-Datensatz (`tactical-sign*`, `stan/*`, 1.157 Zeilen, eigenständig testbar), die Zweitmonitor-Logik, die BDD-Feature-Datei, die CI-Gerüste für Signierung und Release. Nicht übernommen: Persistenz, Locks, Präsenz, Sync, Updater-Peer, Renderer-State.
