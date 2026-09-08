# S1-Control v2 – Architekturentscheidung auf der grünen Wiese

Stand: 2026-09-08 · Branch `v2-architektur` · Status: **Entscheidungsvorlage, Umsetzung noch nicht begonnen**

Dieser Ordner beantwortet die Frage, mit der der Branch angelegt wurde: Soll S1-Control neu aufgesetzt werden, und ist dafür der Stack des Schwesterprojekts bmecatEditor (Tauri 2 + Rust + React) besser als der heutige (Electron + React + JSON-Dateien)? Randbedingungen: dateibasierte Datenhaltung auf einer Synology-NAS, mehrere Clients gleichzeitig, kein Serverprozess, Ablösung der Excel „Einsatzkräfteübersicht V 1.5.2-beta".

## Lesepfad

| Nr. | Dokument | Für wen | Inhalt |
|---|---|---|---|
| 1 | [01-ENTSCHEIDUNG.md](01-ENTSCHEIDUNG.md) | alle | Die Antwort in einer Seite, Rangfolge der drei Vorschläge, was entschieden ist und was offen bleibt |
| 2 | [02-ZIELBILD.md](02-ZIELBILD.md) | Entwicklung | Stack, Speichermodell, Ringe und Pakete, Dateilayout auf dem Share, Meldekopf-Wege, Ausgaben, Tests |
| 3 | [03-MEILENSTEINE.md](03-MEILENSTEINE.md) | Planung | Vorschaltungen vor der ersten Codezeile, Meilensteine für beide Zielumfänge, die 25 Auflagen aus der Widerlegung |
| 4 | [04-OFFENE-ENTSCHEIDUNGEN.md](04-OFFENE-ENTSCHEIDUNGEN.md) | Johannes | 13 Entscheidungen, die nur der Produktverantwortliche treffen kann, je mit Empfehlung |
| 5 | [adr/](adr/) | Nachwelt | Vier Architekturentscheidungen als ADR, damit die Fragen nicht in zwei Jahren erneut gestellt werden |

## Wie die Entscheidung entstanden ist

1. **Bestandsaufnahme** (acht unabhängige Leseagenten plus Vollständigkeitskritiker): Excel-Domänenmodell, VBA-Workflows, Handbuch und Anforderungen, S1-Control Main-Architektur, Renderer-Features, Git-Historie und Testzustand, bmecatEditor-Muster, NAS-Speicher-Recherche mit Primärquellen. Der Kritiker hat den Lost-Update-Fehler des heutigen JSON-Stores zur Laufzeit reproduziert.
2. **Entwurf im Wettbewerb**: drei Architekturvorschläge aus verschiedenen Blickwinkeln (A Electron-Evolution, B Tauri/Rust-Kern, C Hybrid mit geteiltem TypeScript-Kern) plus ein stack-neutrales Zieldatenmodell mit Feldabgleich Excel ↔ S1 v1 ↔ Erfassungsbogen.
3. **Widerlegung**: je Vorschlag zwei Widerleger mit den Linsen „technische Korrektheit auf SMB" und „Lieferbarkeit durch einen Einzelentwickler".
4. **Urteil**: ein Juror mit fünf gewichteten Kriterien, Rangfolge, Übernahmen aus den unterlegenen Vorschlägen, offene Entscheidungen.

Alle Rohberichte (rund 1,9 MB Markdown) liegen unter [../v2-arbeitsstand/](../v2-arbeitsstand/): `bestandsaufnahme/` (acht Berichte plus `vollstaendigkeitskritik.md`) und `entwurf/` (drei Vorschläge, Zieldatenmodell, sechs Widerlegungen, `urteil-juror.md`, `betriebsparameter-johannes.md`). Die Dokumente in diesem Ordner sind die verdichtete Fassung; wo sie Zahlen nennen, steht der Beleg in den Rohberichten.

## Was in diesem Branch sonst liegt

Der Branch ist von `main` abgezweigt und enthält den v1-Code unverändert als Referenz. Die Umsetzung von v2 beginnt nicht durch Umbau dieses Codes, sondern als neuer Baum (siehe 02-ZIELBILD.md, Abschnitt Repo-Struktur); v1-Bausteine, die übernommen werden (STAN-Daten, Zeichen-Inferenz, Fachregeln, BDD-Szenarien), werden dabei gezielt herausgelöst.
