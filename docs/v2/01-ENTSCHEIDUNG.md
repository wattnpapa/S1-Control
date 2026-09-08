# 01 – Die Entscheidung

Stand: 2026-09-08 · Status: **vorgeschlagen** (bindend, sobald die Entscheidungen 1, 2 und 4 aus [04-OFFENE-ENTSCHEIDUNGEN.md](04-OFFENE-ENTSCHEIDUNGEN.md) gefallen sind)

## Die Antwort in fünf Sätzen

1. **Nein, der bmecatEditor-Stack ist für S1-Control nicht besser.** Tauri und Rust lösen keines der harten Probleme (Konsistenz auf SMB, Offline-Betrieb, Verteilung ohne Admin-Rechte) und kosten nach eigener Rechnung des Tauri-Vorschlags 6 bis 10 Personenwochen allein für die Zweisprachengrenze.
2. **Ja, die Architektur muss neu.** Der heutige JSON-Store schreibt die ganze Einsatzdatei blind aus dem Speicher zurück; zwei Clients überschreiben sich bei jedem Speichern. Das wurde reproduziert, nicht nur aus dem Code gelesen.
3. **Der Zustand wird ein Append-only-Ereignisprotokoll auf dem Share**: genau ein Schreiber je Datei, Ordnung über Hybrid Logical Clock, deterministischer Fold mit fachlichen Konfliktregeln, lokale Materialisierung je Client. Alle drei Vorschläge haben das unabhängig voneinander so entschieden.
4. **Der Stack bleibt Electron + React + TypeScript**, neu geschnitten in vier Ringe mit erzwungenen Importgrenzen, ohne ein einziges natives Modul, auf der Werkzeugkette des Schwesterprodukts erfassungsbogen.app.
5. **Vor der ersten Codezeile stehen drei Vorschaltungen unter einer Personenwoche** (Feldversuch am heutigen Installer, Werkzeug-Spike für den geteilten Kern, Beweis der Speicherarchitektur auf dem echten Synology-Share), und das Ziel wird von „Excel-Parität" auf „besser als die Excel für Lage führen und ausdrucken" verkleinert.

## Rangfolge

Fünf Kriterien, gewichtet; Punkte 0 bis 100. Die Widerlegungen haben die Bewertung sichtbar gesenkt, wo Blocker unwiderlegt blieben.

| Kriterium (Gewicht) | A Electron-Evolution | C Hybrid, geteilter TS-Kern | B Tauri, Rust-Kern |
|---|---|---|---|
| Datenintegrität Mehrclient/Offline auf SMB (30) | 75 | **78** | 66 |
| Lieferbarkeit durch Einzelentwickler (25) | **74** | 58 | 38 |
| Betreibbarkeit im Einsatz (15) | **66** | 62 | 46 |
| Wiederverwendung mit erfassungsbogen.app und v1 (15) | 70 | **86** | 34 |
| Wartbarkeit und Erweiterbarkeit (15) | **78** | 66 | 58 |
| **Gesamt** | **73** | 70 | 50 |

Der Abstand zwischen A und C entsteht ausschließlich bei der Lieferbarkeit. C hat die beste Spezifikationsqualität und die stärkste fachliche Idee (die Meldekopf-Sammlung des Erfassungsbogens ist selbst schon ein Append-Store), aber seine Aufwandszusage ist als Terminzusage nicht haltbar. B verliert, weil es als einziger drei Blocker aus eigenen Festlegungen mitbringt und einen Beweisapparat vorschlägt, der die eigenen Fehler strukturell nicht finden kann.

Verdicts der sechs Widerleger: alle drei Technik-Widerlegungen „hält mit Auflagen"; Lieferbarkeit A „hält mit Auflagen", Lieferbarkeit B und C „fällt" (jeweils bezogen auf die Aufwands- und Betriebszusage, nicht auf die Architektur).

## Was entschieden ist

| Thema | Entscheidung | Beleg |
|---|---|---|
| Laufzeit | Electron (aktuelle Stable-Linie), kein Tauri, kein Rust | [ADR-001](adr/ADR-001-electron-statt-tauri.md) |
| Speichermodell | Ereignisprotokoll, ein Schreiber je Datei; das Lockfile-Modell von v1 wird nicht portiert | [ADR-002](adr/ADR-002-ereignisprotokoll-statt-lockfile.md) |
| Fachmodell | Zieldatenmodell und Ereigniskatalog aus `entwurf/zieldatenmodell-feldabgleich.md` §3 und §4, nicht aus dem Siegervorschlag, weil dort die Reparaturen bereits enthalten sind (Vorher-Wert je Ereignis, Zyklusregel, relative Stärkeänderung beim Aufteilen, Undo als normales Ereignis) | Urteil §11.1 |
| Werkzeugkette | TypeScript 7, Vite 8, Vitest 4, Electron 43, ESM: Stand des Schwesterprodukts statt v1-Stand | [ADR-004](adr/ADR-004-werkzeugkette-schwesterprodukt.md) |
| Nicht mehr im Produkt | SQLite, better-sqlite3, drizzle, `rebuild:native`, Datei-Locks mit Stale-Timeout, Datensatzsperren mit TTL, Präsenz-Heartbeat als geteilte Datei, LAN-Peer-Update | Urteil §11.2, §12.4 |
| Altdaten | Keine Migration: weder v1-Dateien noch gefüllte Excel-Mappen existieren (Auskunft Johannes) | `entwurf/betriebsparameter-johannes.md` |
| Erste Schritte | M-1 Feldversuch, M-0 Werkzeug-Spike, M0 Speicherbeweis, alle mit Abbruchkriterium | [03-MEILENSTEINE.md](03-MEILENSTEINE.md) |

## Was offen ist und die Entscheidung noch formen kann

- **Geteilter Kern mit erfassungsbogen.app ja oder nein.** Das ist zugleich die Wahl zwischen A und C: Mit `@bos/kern` entfällt die Google-Tabelle des Meldekopfs ersatzlos und der Meldekopf-Apparat (Revisionen, Diff, Aufteilen/Zusammenführen) wird eingebettet statt nachgebaut; dafür laufen zwei Repositories im Gleichschritt und die Vorleistung liegt bei geschätzt 3 bis 5 Personenwochen statt der von C angenommenen 1,5. Der Juror empfiehlt Ja, mit schmalem Erstschnitt und dokumentiertem Rückweg ([ADR-003](adr/ADR-003-geteilter-kern-bos-kern.md)).
- **Zielumfang.** Excel-Parität kostet nach korrigierter Rechnung 20,5 bis 32 Personenwochen. „Lagebild führen, Einheiten vollständig, Einsatztagebuch, Stärkeübersicht drucken, Stärke-Monitor" kostet 10 bis 14 Personenwochen und ist ab Auslieferung besser als die Excel, weil mehrbenutzerfähig. Kosten, Schichtplan und Logistik laufen so lange in der Excel weiter. Empfehlung: das kleinere Ziel.
- **Verfügbarkeit in Stunden je Woche.** Ohne diese Zahl gibt es kein Lieferdatum. Der Commit-Rhythmus von v1 legt 8 bis 12 Stunden je Woche nahe; bei 10 Stunden entspricht eine Personenwoche vier Kalenderwochen.

Die vollständige Liste steht in [04-OFFENE-ENTSCHEIDUNGEN.md](04-OFFENE-ENTSCHEIDUNGEN.md).

## Die drei Befunde aus der Bestandsaufnahme, die alles tragen

1. **Mehrbenutzerbetrieb existiert in v1 nicht.** Der Main-Prozess lädt die Einsatzdatei einmal, mutiert sie im Speicher und schreibt sie bei jedem Save vollständig zurück, ohne zu prüfen, ob ein anderer Client geschrieben hat; UDP-Signale und Polling lösen nur Renderer-Refreshs aus dem unveränderten Speicher aus. Die Systemdatei mit Sperren und Heartbeats wird ebenfalls lockfrei überschrieben. (`bestandsaufnahme/s1-main-architektur.md` §3, `vollstaendigkeitskritik.md` §3.4)
2. **SQLite auf dem Share ist gescheitert und laut SQLite-Dokumentation nicht tragfähig.** Die Journal-Strategie wechselte im März 2026 viermal ohne dokumentierte Begründung; im Mai wurde SQLite in 20 Minuten komplett entfernt. Johannes bestätigt: „super langsam" im Mehrclient-Betrieb. Der Punkt ist stack-neutral, Rust ändert daran nichts. (`bestandsaufnahme/s1-historie-qualitaet.md` §2, `nas-speicher-recherche.md` §1 und §2)
3. **Die Excel ist fachlich weit größer als v1.** Ressourcenplanung mit Anforderung, Zusage, Ablösung und Rückführung, Schichten, Logistikbedarf, Kostenabschätzung, FüSt-Personal mit Schichtplan, sieben Ausgabeprodukte und ein HTML-Auto-Export als Lagemonitor fehlen in v1 vollständig. Die Erfassungsbogen-App deckt dagegen die Meldekopf-Seite bereits ab, inklusive Export in exakt das Spaltenformat der Excel. (`bestandsaufnahme/excel-handbuch-anforderungen.md` §7, `excel-vba-workflows.md` §11.7)

## Was die Empfehlung kippen würde

- Fällt der Feldversuch M-1 negativ aus, weil eine unsignierte EXE auf den FüSt-Rechnern nicht startet, fällt nicht ein Vorschlag, sondern jeder Desktop-Ansatz; dann ist die Randbedingung „kein Serverprozess" neu zu verhandeln.
- Zeigt M0 auf dem echten Share, dass ein Poll-Zyklus bei fünf Clients und mehreren Segmenten die Latenzen erzeugt, an denen SQLite scheiterte, muss das Segment- und Poll-Design vor M1 geändert werden, nicht danach.
- Entscheidet Johannes gegen den geteilten Kern, bleibt A ohne Graft die Basis; der Meldekopf-Apparat wird dann in `@s1/domaene` nachgebaut, und die Google-Tabelle wird durch Bündeldatei und QR ersetzt, nicht durch Direktschreiben.
