# Auftrag M0 — Nacharbeit und Abschluss

Stand: 2026-09-09 · Nacharbeit zu M0.4 und Abnahme von M0.6 · Status: **offen**

Aufträge werden hier abgelegt, damit nachvollziehbar bleibt, wogegen ein Paket gebaut wurde. Der Text unterhalb der Trennlinie wird unverändert als Auftrag an die Arbeitssitzung übergeben.

---

Nacharbeit zu M0.4 und Abnahme von M0.6.

Arbeitsverzeichnis: /Users/johannes/Developer/S1-Control-v2, Branch v2-architektur. Nicht nach /Users/johannes/Developer/S1-Control wechseln, main bleibt unberührt. Der Branch liegt auf GitHub (`origin/v2-architektur`) und darf gepusht werden. Sprache in Doku, Kommentaren und Commit-Texten: Deutsch mit Umlauten. Code-schreibende oder -lesende Subagenten laufen auf Opus.

**Kostenhinweis vorweg.** Die Sitzung, die M0.4 gebaut hat, hat rund 780 US-Dollar gekostet, und der Treiber war nicht das Denken, sondern die Rechenzeit: Ein Abnahmelauf mit vier Clients und 2.000 Kommandos dauert knapp eine Minute, ein Sweep über achtzehn Startwerte rund zwanzig. Plane das ein. Wo eine Frage mit einem Unit-Test statt mit einem Abnahmelauf zu beantworten ist, nimm den Unit-Test.

## Lage

M0.1 bis M0.4 sind gebaut. M0.5 ist verschoben, weil kein NAS zur Verfügung steht — es ist die Messung am echten Synology-Share und braucht Hardware. M0.6 ist der grüne CI-Lauf auf Windows, macOS und Linux.

`s1 simuliere` steht und besteht den Abnahmeplan (4 Clients, 2.000 Kommandos, alle Störungen). Die Simulation hat vierundzwanzig Fehler in `@s1/speicher` gefunden; neun davon hätten im Feld Einträge verloren oder einen Arbeitsplatz dauerhaft unbrauchbar gemacht. Alle sind behoben und mit Regressionstests belegt.

## Pflichtlektüre, in dieser Reihenfolge

1. `docs/v2/messungen/M0.4-simulation.md` — vollständig. Das ist das Protokoll des Pakets. Abschnitt 4 („Was §4.6 nicht heilt") und Abschnitt 7 („Offen geblieben") sind der Kern.
2. `docs/v2-arbeitsstand/auftraege/M0.4-simulation.md` — der Übergabevermerk oben im Dokument.
3. `docs/v2/konzepte/KONZEPT-SPEICHER.md` §4.6 samt §4.6.1, §7.6, §8.2, §8.6.1 — die Paragraphen, um die es in der Nacharbeit geht.
4. `git log --oneline cf426c5..HEAD` und die Commit-Texte mit dem Präfix `fix(speicher):`. Sie sind der Befundkatalog.

## Aufgaben, nach Wichtigkeit

**1. Sweep über achtzehn Startwerte wiederholen.** Der letzte lief gegen ein Abnahmekriterium, das nachweislich zu schwach war (Abschnitt 7.3). Er sagt in der jetzigen Form nichts. Das Skript ist zwanzig Zeilen über `fuehreSimulationAus` aus `packages/cli/dist/simulation/lauf.js` mit überschriebenem `startwert`. Erwartung: kein roter Ausgang, kein verlorenes Ereignis, kein Lauf ohne Konvergenznachweis in den Phasen vor der letzten. Was fällt, ist ein Befund und keine Statistik — geh ihm nach.

**2. M0.6 abnehmen.** `gh run list --branch v2-architektur` und `gh run view <id> --log-failed`. Die CI war bis zuletzt rot, weil die Verzeichnisauflistung der feindlichen Schicht unsortiert war und zwei Störungen in Tests mit `/` im Pfad angeschrieben waren; beides ist behoben, der Lauf danach aber nicht mehr abgewartet worden. Grün auf Windows, macOS und Linux ist die DoD von M0.6 — nichts weniger.

**3. Vier Korrekturen ohne Testdeckung.** Das zweite Gutachten hat sie mit Mutationen nachgewiesen; sie überleben jede plausible Mutation. Schreib die Tests, und prüfe sie ihrerseits mit einer Mutation:
   * die Pfadbindung von `#reparaturNoetigFuer` in `schreiber.ts`,
   * der Parameter `quelleIstVollstaendig` in `kettenanker.ts` — `kettenanker.test.ts` ruft ihn nur mit dem Vorgabewert,
   * die Längenprüfung in `#kuerzeSpiegel` in `leser.ts`,
   * `abGrenze` in der Nutzlast des Ersatzsegments — im Protokoll als einer der gefährlichen Befunde geführt und trotzdem ohne Test.

**4. Ein hergeleiteter, nicht ausgelöster Datenverlust.** `akte.ts`, `#kuerzeAufgegebeneDateien(..., false)` beim Öffnen: Nach einem abgebrochenen Kennungswechsel (§8.8, Reaktion `kennungswechselUnvollstaendig`) kürzt es die aufgegebene Datei trotzdem auf den Share-Stand — und Zeilen, die die abgebrochene Übernahme nicht mehr in die Datei der neuen Kennung geschrieben hat, stehen danach nirgends mehr. Der Kommentar an der Stelle begründet nur, warum nicht **gelöscht** wird; die Kürzung setzt dieselbe Gewissheit voraus, die er verneint. Löse es aus, dann behebe es.

**5. Kleinigkeiten.** `klient.ts` protokolliert `weitereReaktionen` nicht, der Bericht zeigt deshalb nicht, ob mehrere Reparaturen je Öffnen gelungen sind. `oeffnungspruefung.ts` berechnet `hoechsteLaufnummerAufShare`, das kein Produktionscode liest.

**6. Ein dritter Gutachterdurchgang.** Bei M0.3 hat der dritte Durchgang in der jüngsten Datei noch einen Blocker gefunden, bei M0.4 der zweite gleich drei. Rechne damit, dass der dritte etwas findet, und gib ihm die zuletzt geänderten Dateien: `akte.ts`, `schreiber.ts`, `kettenanker.ts`, `ersetzteSegmente.ts`, `packages/cli/src/simulation/lauf.ts`.

## Zwei Entscheidungen, die Johannes zu treffen hat — nicht selbst entscheiden

**§8.6.1 Regel 4 hält nicht.** Wird eine Beschädigung erst entdeckt, nachdem der Schreiber das Segment verlassen hat, heilt das Ersatzsegment nur dieses eine Segment; die danach geschriebenen bleiben für den betroffenen Leser dauerhaft unlesbar, weil ihr Kettenanker hinter der Quarantänestelle liegt. Drei mögliche Richtungen stehen in Abschnitt 4 des Protokolls. Bereite die Entscheidung auf, triff sie nicht.

**§7.6 braucht zwei Präzisierungen**, sonst ist die Ruhephase im Feld nicht messbar: Bedingung 2 und 3 hängen am **Fortschritt**, nicht an den gelesenen Bytes, und „zwei aufeinanderfolgende Durchläufe" reichen gegen die Caches aus §6.6 nicht. Beide sind in der Simulation umgesetzt und in Abschnitt 2 des Protokolls begründet. Sie gehören in §7.6 nachgezogen — durch Johannes.

## Vorgehen

* Qualitätsgates je Commit: `tsc -b` über alle Projekte, ESLint mit Ringgrenzen, Vitest. Alles grün, bevor Du committest.
* Kleine, thematisch getrennte Commits mit Präfix `fix(speicher):`, `test(...)`, `docs(...)` und dem Trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
* Prüfe jeden neuen Test mit einer Mutation des Produktionscodes. **Nimm die Mutation über eine frische Sicherungskopie zurück, die Du unmittelbar davor angelegt hast** — in der M0.4-Sitzung ist eine fertige Korrektur verlorengegangen, weil eine ältere Sicherungskopie zurückgespielt wurde. `git status` nach jeder Rücknahme.
* Code-Kommentare verweisen auf die Paragraphen von KONZEPT-SPEICHER.md. Sie sollen wahr sein: Änderst Du eine Stelle, zieh den Kommentar mit.

## Bericht am Ende

Was gemacht wurde, die Commit-Hashes, `tsc -b`, ESLint und Vitest im Wortlaut, das Sweep-Ergebnis, der CI-Stand je Betriebssystem, die Antwort des Gutachters — und ausdrücklich alles, was NICHT erfüllt ist.
