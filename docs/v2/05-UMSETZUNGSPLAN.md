# 05 – Umsetzungsplan Stufe 1 „besser als die Excel"

Stand: 2026-09-08 · Status: **beschlossen** (Johannes am 2026-09-08: „wir gehen den Weg, den du für sinnvoll hältst") · Einheit: Personenwoche (PW) = 5 konzentrierte Arbeitstage eines KI-gestützten Einzelentwicklers

## 1. Getroffene Entscheidungen

| Nr. | Entscheidung | Beschluss |
|---|---|---|
| 1 | Zielumfang | **Stufe 1 „besser als die Excel"**: Lagebild führen, Einheiten vollständig, Einsatztagebuch, Stärkeübersicht und Kernausgaben drucken, Stärke-Monitor, Verteilung. Kosten, Schichtplan, Logistik-Details, Ressourcenplanung bleiben bis Stufe 2 in der Excel |
| 2 | Verfügbarkeit | Noch offen. Planannahme **10 Stunden je Woche** (= 0,25 PW je Woche); Kalenderangaben unten sind daraus abgeleitet und mit der echten Zahl neu zu rechnen |
| 3 | Feldversuch M-1 | **Positiv**: v1 startet auf den FüSt-Rechnern ohne Admin-Rechte (Johannes, 2026-09-08). Reste (stilles Update ohne Elevation, Firewall-Regel für UDP) werden in M0 mitgeprüft |
| 4 | Geteilter Kern | **Ja**: `@bos/kern` als eigenes Repository, Erstschnitt nach ADR-003, mit Rückweg |
| 5 | Werkzeugkette | **Stand des Schwesterprodukts** (TS 7, Vite 8, Vitest 4, Electron 43, ESM) |
| 6 | Windows-Codesignatur | **Zunächst ohne**; Update-Weg über den Share ist Ed25519-signiert |
| 7 | LAN-Peer-Update | **Gestrichen** |
| 8 | Synthetische Referenzlage | **Johannes/FüSt erstellt sie** bis Ende M2 von Hand in der Excel (rund 40 Einheiten, drei Einsatzstellen, ein Bereitstellungsraum, alle Status- und Schichtwerte, Ausdrucke von Druck und Status) |
| 9 | Rollen und Rechte | **Gestrichen**; alle Clients gleichberechtigt, Akteur je Ereignis |
| 10 | Größter Einsatz | Annahme **100 bis 300 Einheiten**, Simulation bis 5.000 |
| 11 | UDP-Beschleuniger | **Nicht im kritischen Pfad**; Polling ist der Normalweg. UDP nur, wenn M0 zeigt, dass die Firewall-Regel ohne Admin-Rechte greift |
| 12 | Windows-Entwicklungsmaschine | **Erforderlich ab M0**; Johannes benennt einen Rechner (kann ein FüSt-Laptop sein) |
| 13 | Zielplattformen | **Windows = Produkt, macOS = Entwicklungsplattform mit Best-Effort-Paket, Linux = nur CI-Lauf** |

## 2. Was Stufe 1 liefert und was nicht

**Drin:** Einsatz anlegen und öffnen; Abschnittsbaum mit den Bereichstypen der Excel; Einheiten mit Bezeichnung, Organisation, Herkunft, Gliederungsebene, Stärke F/UF/M, Status (9 Werte), Schicht, Aufträgen, Erreichbarkeit, Bemerkung; Fahrzeuge; Personen aus dem Bogen; Verschieben, Aufteilen, Zusammenführen, Entfernen; Vorlagenkatalog (StAN THW, KatS Nds, Feuerwehr); taktische Zeichen; Einsatztagebuch mit jedem Ereignis; Undo je Client; Konflikthinweise; Stärke-Monitor auf dem Zweitbildschirm; Ausgaben Druck (Lagekarte), Status-Matrix, Auswertung (flache Tabelle als XLSX), HTML-Monitor, Einsatzakte als ZIP; EEB-Bogen per Handscanner-Text einlesen (Segmente, Signaturprüfung) und als Einheit übernehmen; Installer per-User; Update über den Share; Diagnoseansicht und Kurzanleitung.

**Nicht drin (Stufe 2):** Ressourcenplanung mit Anforderung/Zusage/Ablösung, Logistik-Ausgabe (Log/LogFrei), Kostenrechnung, FüSt-Personal mit Schichtplan, FüOrg-Editor, Kamera-Scan, Eingangskorb mit Quittierung und Revisions-Diff, Meldekopf-Modus direkt auf dem Share, Bündeldatei. Die Felder dafür existieren im Modell bereits (Zieldatenmodell §3), damit Stufe 2 keine Migration braucht.

## 3. Arbeitsorganisation

- **Repositories:** `S1-Control` Branch `v2-architektur` (neuer Baum, v1 bleibt auf `main`); neues Repo `bos-kern` (Arbeitsname, Inhalt nach ADR-003); `einheitenerfassungsbogen` bekommt das Submodul in M1.
- **Arbeitsweise:** Jedes Arbeitspaket ist ein abgegrenzter Auftrag mit Definition of Done und läuft als Code-Agent auf Opus in einem eigenen Worktree; Ergebnis wird gegen die DoD geprüft (typecheck real, lint, Tests, bei Speicherpaketen die Simulation), dann als kleiner Commit übernommen. Konzeptdokumente mit Paragraphen-Nummern (`docs/v2/konzepte/`) entstehen vor dem Code des jeweiligen Pakets; Code-Kommentare verweisen auf die Paragraphen.
- **Qualitätsgates je Commit:** `tsc -b` über alle Projekte, ESLint mit Ringgrenzen, Vitest, Property-Tests des Folds; ab M2 zusätzlich der Mehrclient-E2E.
- **Prüfpunkte mit Abbruchrecht:** nach M0 (Speicherbeweis), nach M2 (zwei Rechner auf dem echten Share), nach M4 (Referenzlage stimmt).

## 4. Arbeitspakete

### M-0 Werkzeug- und Verdrahtungs-Spike · ½ Tag · Voraussetzung für alles

| WP | Inhalt | DoD |
|---|---|---|
| M-0.1 | Repo `bos-kern` anlegen: `package.json` (ESM, TS 7), eine exportierte Funktion, Vitest-Test, ESLint-Regeln gegen `node:`/DOM/React, README mit den sechs Aufnahmeregeln | Test grün unter `node` und `jsdom` |
| M-0.2 | Submodul `vendor/bos-kern` in `einheitenerfassungsbogen` mit `file:`-Abhängigkeit; `npm run build`, `npm test`, PWA- und Capacitor-Build laufen unverändert durch | alle drei Builds grün, Bundle-Größe unverändert |
| M-0.3 | Neuer Baum in `S1-Control` (`v2-architektur`): npm-Workspaces, leere Pakete `domaene`, `speicher`, `netz`, `ausgaben`, `cli`, `apps/desktop`; Submodul eingebunden; `tsc -b`, ESLint, Vitest, ein leeres Electron-Fenster starten | alles grün auf macOS; CI-Gerüst aus v1 übernommen und grün |

### M0 Beweis der Speicherarchitektur ohne UI · 1,5 bis 2,0 PW · Prüfpunkt 1

| WP | Inhalt | DoD |
|---|---|---|
| M0.1 | Konzept `KONZEPT-SPEICHER.md` §1 bis §8: Zeilenformat, Segmente, Spiegelung, Offsets, Schnappschüsse, Präsenz, Fehlerbilder; Auflagen 4 bis 14 aus 03-MEILENSTEINE.md eingearbeitet | Dokument vollständig, von Johannes gegengelesen |
| M0.2 | `@s1/domaene`: HLC als Struktur mit Textform fester Stellenzahl; Ereignisrahmen (Id, Laufnummer, Akteur, `vorher`/`neu`); Minimalfold über `EinsatzAngelegt`, `AbschnittAngelegt`, `EinheitGemeldet`, `EinheitVerschoben`, `StaerkeGeaendert`; Fold als Mengenfunktion mit Rebase | Property-Tests P1 bis P6 grün (Permutation, Idempotenz, Kommutativität); Abbruchkriterium ist keine Tautologie |
| M0.3 | `@s1/speicher`: Append mit `länge\tcrc32\tjson`, fsync, Hash-Kette, Tail-Leser mit Quarantäne defekter Zeilen, Segmentwechsel nach Größe, lokaler Spiegel mit `upload-state.json`, Poll am Offset, `praesenz` | Unit-Tests inkl. abgeschnittener Zeile, Neustart mitten im Segment, geklontes Profil |
| M0.4 | `s1 simuliere`: N Clients, Plandatei, feindliche Dateisystem-Schicht (verzögerte Sichtbarkeit, abgeschnittene Schreibvorgänge, Rename-Fehler, blockierende Aufrufe, FileNotFound-Cache), Fehlerinjektion (Kill mitten im Append, Partition, Uhrsprung), Konvergenzvergleich per Hash nach jeder Ruhephase und lokal ↔ Share je Client | 4 Clients, 2.000 Kommandos, alle Störungen, reproduzierbar konvergent |
| M0.5 | Messung auf dem echten Synology-Share von mindestens zwei physischen Rechnern (Windows 11 und macOS): stat/open/read/append/fsync/readdir in ms, Sichtbarkeitslatenz p50/p95, Gesamtkosten eines Poll-Zyklus bei 5 Clients und 10 Segmenten; Firewall-Test für UDP ohne Admin-Rechte; stiller v1-Update-Start ohne Elevation | Messprotokoll `docs/v2/messungen/M0-share.md`; Poll-Intervall und Segmentgröße daraus begründet |
| M0.6 | CI-Job „Speicherschicht" auf Windows, macOS, Linux | grün |

**Abbruchkriterium M0:** Append plus fsync über 300 ms je Ereignis auf dem realen Share, oder ein Poll-Zyklus bei 5 Clients über 2 s, oder Nichtkonvergenz unter Störung. Dann Redesign von Segment- und Poll-Strategie vor M1, kein Weiterbau.

### M1 Kern-Pakete · 3,0 bis 5,0 PW

| WP | Inhalt | DoD |
|---|---|---|
| M1.1 | `@bos/kern` Stufe 1 aus `einheitenerfassungsbogen` extrahieren: `model`, `codec`, `signatur`, `qr-node`, `vokabulare/**`, `einsaetze` mit injizierter Speicherhülle, `aufteilen`, `zusammenfuehren`, `meldung-diff`, `papierkorb`, acht reine Funktionen aus `hilfen` als `darstellung`; Tests mitziehen (rund 1.900 Zeilen) | Erfassungsbogen baut und testet grün gegen das Submodul; kein Capacitor-, DOM- oder `localStorage`-Import im Kern; Beispielbögen aller Schemaversionen als Testdaten |
| M1.2 | Konzept `KONZEPT-EREIGNISSE.md`: vollständiger Ereigniskatalog aus Zieldatenmodell §4 mit zod-Schemata, `schemaVersion` je Ereignis, Upcaster-Kette, Konfliktregel je Typ, Undo-Semantik U1 bis U6, Barriere `EinsatzArchiviert` | Dokument vollständig; jede Regel hat einen Testfall |
| M1.3 | `@s1/domaene`: Zielmodell (Einsatz, Abschnitt, EinsatzEinheit, Meldung, Fahrzeug, Person, Auftrag, Anforderung, Dienstposten, ETB) mit allen Feldern aus Zieldatenmodell §3; Fold für alle Ereignistypen; Kennzahlen (Summen je Bereich, Organisation, Status, Schicht; Gesamtstärke ohne Anmarsch) mit den Excel-Formeln | Property-Tests grün; Kennzahlen gegen von Hand gerechnete Werte der Referenzlage |
| M1.4 | Übernahme aus v1: STAN-Datensatz und Zeichen-Inferenz (`stan/*`, `tactical-sign*`) als reine Module; Vorlagenkatalog aus den Kopiervorlagen der Excel und den THW-Vokabularen | Tests aus v1 portiert und grün |
| M1.5 | Adapter `eeb → EinheitGemeldet`: Feldzuordnung nach dem Oldenburg-Mapping (Ebene aus dem ausgeschriebenen Einheitstyp, Herkunft, Geräte mit Stückzahl, Erreichbarkeit), Übungs-Flag in die Bemerkung, Segmentsammlung und Signaturprüfung | Roundtrip-Tests mit den 443 Beispielbögen |

### M2 Schale, Worker, Store · 2,0 bis 3,0 PW · Prüfpunkt 2

| WP | Inhalt | DoD |
|---|---|---|
| M2.1 | IPC-Kontrakt (zod), Preload je Fenster, Electron-Main ohne Fachzustand, ein `worker_thread` je offener Akte (Share-I/O, Fold, Projektion), Deltas an die Renderer | kein synchroner Datei- oder Netzaufruf im Main (Lint) |
| M2.2 | Renderer-Grundgerüst: Zustand-Store, Statuszeile („Stand: vor 8 s", Peer-Anzahl, Share erreichbar/nicht erreichbar), Fehlerbilder, Einstellungen (Share-Pfad, Client-Name), Logging in Datei | Komponententests für Store und Statuszeile |
| M2.3 | Einsatz anlegen und öffnen (Ordner auf dem Share), Präsenz, Undo je Client, `requestSingleInstanceLock` | zwei Instanzen auf einem Temp-Verzeichnis sehen sich; erster Mehrclient-E2E grün |
| M2.4 | Zwei physische Rechner auf dem echten Share führen denselben Testeinsatz eine Stunde lang mit Störungen (Kabel ziehen, Neustart) | Konvergenz per `s1 akte pruefe`, kein Datenverlust |
| M2.5 | CI: Build-Matrix aus v1 auf den neuen Baum, `tsc -b` real, Zeitstempel-Tag beibehalten | grün auf drei Plattformen |

### M3 Lagebild · 2,5 bis 3,5 PW

| WP | Inhalt | DoD |
|---|---|---|
| M3.1 | Abschnittsbaum: anlegen, umbenennen, Typ ändern, umhängen (Zyklusregel), sortieren, auflösen mit Zielabschnitt | BDD-Szenarien Abschnitte grün |
| M3.2 | Einheiten: Tabelle mit den Feldgruppen der Excel (ein- und ausblendbar), Inline-Bearbeitung mit `vorher`-Konflikthinweis, anlegen aus Vorlage, verschieben (auch mehrere), aufteilen, zusammenführen, entfernen, Status und Schicht, Fahrzeuge und Personen als Untertabellen, taktische Zeichen mit Inferenz | BDD-Szenarien Einheiten grün; 150 Einheiten flüssig |
| M3.3 | Einsatztagebuch-Ansicht: jedes Ereignis mit Akteur, Rechner, Zeit, lesbarem Satz aus `vorher`/`neu`; Filter je Einheit und Abschnitt; Berichtigung als eigener Eintrag | ETB zeigt jede Änderung; Undo sichtbar als Kompensation |
| M3.4 | EEB per Handscanner-Text: Eingabefeld, Segmentstapel mit Fortschritt („Teil 2 von 3"), Signaturstatus, Vorschau, Übernahme als `EinheitGemeldet` in einen gewählten Abschnitt | mehrteiliger realer Bogen wird vollständig übernommen |
| M3.5 | Stärke-Monitor: Zweitfenster, Monitorwahl, dynamische Schrift, Gesamtstärke und NATO-Zeit, Push aus dem Worker | auf Zweitbildschirm geprüft |
| M3.6 | Tastaturbedienung: Enter/Escape in allen Masken, Strg+D für „jetzt", Kürzel für Anlegen/Verschieben/Suchen, Abkürzungsliste als Hilfefenster | BDD-Szenario Tastatur grün |

### M4 Kernausgaben · 2,0 bis 3,0 PW · Prüfpunkt 3

| WP | Inhalt | DoD |
|---|---|---|
| M4.1 | `@s1/ausgaben`: Druck (Stärken je Einsatzstelle, Gesamt, Org-Filter, ohne Anmarsch, leere Stellen ausgeblendet, Stand-Zeile) und Status-Matrix (Organisation × Stärke/w/d/vegetarisch/ÜN, Stärke je Status und Schicht, Kontrollsummen) als HTML-Vorlagen und PDF über `printToPDF` | Goldfile-Tests; Zeile für Zeile gegen den Excel-Ausdruck der Referenzlage geprüft |
| M4.2 | Auswertung als XLSX (flache Tabelle aller Einheiten mit Bereich als Spalte, Stand, Summen) über den Schreiber aus `@bos/kern`; Oldenburg-Spaltenformat als Exportvariante | öffnet in Excel ohne Nacharbeit |
| M4.3 | HTML-Monitor: Druck (optional Status) als Datei in `ausgaben\`, 60-Sekunden-Reload, automatische Aktualisierung aus dem Worker | zweites Gerät zeigt Aktualisierung |
| M4.4 | Einsatzakte als ZIP: Ereignisse, Schnappschuss, Ausgaben, Manifest mit Hashes; `s1 akte exportiere` | Reimport per `s1 akte pruefe` konsistent |

### V Verteilung und Betrieb · 1,0 bis 1,5 PW

| WP | Inhalt | DoD |
|---|---|---|
| V.1 | NSIS per-User und Portable-EXE; macOS-Paket signiert und notarisiert; Linux-Paket nur als CI-Artefakt | Installation auf einem FüSt-Rechner ohne Elevation |
| V.2 | Update über den Share: Ablage `programm\`, Ed25519-signiertes Manifest mit dem Schlüssel aus `@bos/kern`, Prüfung vor Installation, Hinweis in der Anwendung; GitHub-Release als zweite Quelle | Update von einem zweiten Rechner eingespielt; falsche Signatur wird abgelehnt |
| V.3 | Diagnoseansicht (Peer-Status, Offsets, letzte Fehler, Logdatei öffnen), `s1 diagnose`, Störfallmatrix mit sechs Fällen (Share weg, Uhr weicht ab, Konflikthinweis, Update schlägt fehl, Anwendung startet nicht, Bogen nicht lesbar) | Matrix in der Kurzanleitung |
| V.4 | Kurzanleitung (zwei Seiten) und Betriebsanleitung (`BETRIEB.md`: Share einrichten, Ordnerrechte, Notverfahren bei NAS-Ausfall, USB-Übergabe der Einsatzakte) | von einer zweiten Person durchgearbeitet |
| V.5 | Abnahme: eine Übung mit drei bis vier Clients auf dem echten NAS ohne Rückgriff auf die Excel für das Lagebild | Abnahmeliste abgehakt |

## 5. Summe und Kalender

| Block | PW min | PW max |
|---|---|---|
| M-0 | 0,1 | 0,1 |
| M0 | 1,5 | 2,0 |
| M1 | 3,0 | 5,0 |
| M2 | 2,0 | 3,0 |
| M3 | 2,5 | 3,5 |
| M4 | 2,0 | 3,0 |
| V | 1,0 | 1,5 |
| **Stufe 1** | **12,1** | **18,1** |

Die Spanne liegt über den 10 bis 14 PW des Urteils, weil hier die Extraktion des geteilten Kerns (M1.1) und die Verteilung (V) voll eingerechnet sind. Kalender bei der Planannahme von 10 Stunden je Woche: **48 bis 72 Wochen**; bei 20 Stunden je Woche 24 bis 36 Wochen. Frühester spürbarer Nutzen: nach M2 (zwei Rechner führen einen Einsatz ohne Datenverlust), sichtbarer Nutzen für die FüSt nach M3.

Unsicherheit nach oben sitzt in M1.1 (fremdes Repo, transitive Hülle 17 Dateien), M3.2 (die breite Einheitentabelle ist die teuerste Ansicht) und M4.1 (Ausdruck „sieht aus wie die Excel" braucht Runden). Nach unten begrenzt: v1-Bausteine, Codec und Meldekopf-Logik existieren mit Tests.

## 6. Die fünf größten Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Fold-Regelwerk unvollständig, stille Falschzustände | Ereigniskatalog vor Code (M1.2), Property-Tests, `vorher`-Konflikthinweise, Referenzlage als Orakel |
| SMB-Verhalten des echten Shares weicht von der Simulation ab | M0.5 misst vor jedem Weiterbau; feindliche Dateisystem-Schicht wird mit den gemessenen Werten kalibriert |
| Kopplung an erfassungsbogen.app bremst beide Produkte | schmaler Erstschnitt, gepinnte Commits, Rückweg nach ADR-003, M-0 beweist die Verdrahtung vorab |
| Verfügbarkeit geringer als angenommen | Meilensteine sind vertikale Schnitte mit eigenem Nutzen; nach M2 und M4 ist jeweils ein brauchbarer Stand erreicht |
| Ausdruck wird von der FüSt nicht akzeptiert | Referenzlage mit Excel-Ausdrucken bis Ende M2; Goldfile-Vergleich in M4.1; Layout-Runden eingeplant |

## 7. Nächste Schritte

**Johannes (diese Woche):**
1. Verfügbarkeit in Stunden je Woche nennen (ersetzt die Planannahme in Abschnitt 5).
2. Windows-11-Rechner für M0.5 benennen (ein FüSt-Laptop genügt) und Zugang zum Synology-Share für die Messung.
3. Referenzlage in der Excel beginnen (bis Ende M2 fertig, mit Ausdrucken von Druck und Status).

**Entwicklung (nächste Sitzung, Code-Agenten auf Opus):**
1. M-0.1 bis M-0.3: Repo `bos-kern`, Submodul im Erfassungsbogen, neuer Baum in `S1-Control`.
2. M0.1: `KONZEPT-SPEICHER.md` schreiben und zur Durchsicht vorlegen.
3. M0.2 bis M0.4: HLC, Minimalfold, Speicherschicht, Simulation mit feindlichem Dateisystem.
4. M0.5 gemeinsam mit Johannes am echten Share, sobald der Windows-Rechner steht.
