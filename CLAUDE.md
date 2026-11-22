# S1-Control – Anweisungen für Claude

Die verbindlichen Architektur- und Arbeitsregeln stehen in `AGENTS.md` und gelten hier unverändert:

@AGENTS.md

Der gebaute Baum ist v2 (`packages/`, `apps/desktop`, siehe `README-v2.md`); `legacy-v1/` wird nur gelesen.

## Demo-Einsatz bei jedem neuen Feature mit erweitern

In der Einsatzauswahl legt der Knopf „Demo-Einsatz" einen Einsatz an, der zwölf Stunden vor jetzt beginnt und alles zeigt, was die Software kann: Abschnitte, Einheiten mit Fahrzeugen und Personen, Führungsstelle, Funkplan, Nachrichten in allen Stationen, Versorgung, Anforderungen, Erfassungsbogen, Tagebuch. Niemand soll bei null anfangen müssen, um die Software zu zeigen, auszuprobieren oder zu prüfen.

Damit das so bleibt, gilt für jede Änderung:

1. **Jedes neue Feature erweitert das Demo-Drehbuch im selben Zug.** Wer ein Blatt, eine Maske, eine Ereignisart, einen Parameter oder eine Ausgabe baut, sorgt dafür, dass der Demo-Einsatz dazu Daten trägt. Ein Feature, das im Demo-Einsatz leer bleibt, ist nicht fertig (`AGENTS.md` §11 und §13).
2. Das Drehbuch liegt in `apps/desktop/src/worker/demo/`. Einstieg und Übersicht der Teile: `demoeinsatz.ts`. Die Einheitenliste ist reine Daten in `demoeinheiten.ts`; die meisten Einheiten entstehen aus Übungsbögen unter `boegen/` (Herkunft `wattnpapa/erfassungsbogen`, siehe `boegen/HERKUNFT.md`). Neue Einheiten kommen als Bogen dazu, nicht als erfundene Zeile. Die Mischung bleibt bunt: ein THW-Einsatz mit Einheiten anderer Organisationen.
3. Das Drehbuch besteht aus **Bedienschritten**, gebaut mit den Schrittbauern unter `apps/desktop/src/kontrakt/` — denselben, die die Oberfläche benutzt — und aus Rufen an den Aktendienst, wo die Oberfläche einen Ruf benutzt (Erfassungsbogen einlesen und übernehmen). Es schreibt nie am Aktendienst vorbei und legt keine Dateien von Hand an.
   Was ein Erfassungsbogen mitbringt (Stärke, Personen, Fahrzeuge, Bemerkung), kennt das Drehbuch nicht im Voraus: Schritte daran lesen ihren Vorher-Wert beim Abspielen aus dem Zustand (`zelleNeu`, `demoteile.ts`).
4. Zeiten sind **Minuten seit Einsatzbeginn** (0 bis 720), nie feste Uhrzeiten oder Daten; auch in Texten keine Uhrzeiten nennen. Der Demo-Einsatz muss an jedem Tag und zu jeder Stunde stimmen.
5. Ein Teil der Lage bleibt **unterwegs** (Nachricht vor dem Sichter, offene Anforderung, unbesetzter Posten), damit jede Stelle beim Öffnen Arbeit vorfindet. Neue Features folgen dem: nicht nur der erledigte Fall, auch der offene.
6. Der Demo-Einsatz bleibt **ohne Konflikthinweis** und ohne abgewiesenen Schritt.
7. Der Test `apps/desktop/src/worker/demo/demoeinsatz.test.ts` hält das fest: Jede Ereignisart des Katalogs muss im Demo-Einsatz vorkommen oder dort in `AUSNAHMEN` mit Grund stehen. „Noch nicht dazu gekommen" ist kein Grund. Bei neuen Blättern oder Ansichten zusätzlich eine Behauptung im Szenario „zeigt Einheiten, Abschnitte, Funk, Nachrichten und Versorgung" ergänzen.

Prüfen nach einer Änderung am Drehbuch:

```bash
npx vitest run apps/desktop/src/worker/demo apps/desktop/src/main/demoanlage.test.ts
```
