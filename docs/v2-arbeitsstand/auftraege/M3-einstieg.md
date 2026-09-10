# Einstieg in M3 — Lagebild

Stand: 2026-09-10 · Meilenstein M3 aus [05-UMSETZUNGSPLAN.md](../../v2/05-UMSETZUNGSPLAN.md) · Status: **in Arbeit**

M3 ist der erste Meilenstein ohne Prüfpunkt mit Abbruchrecht. Was er liefern
soll, steht in einem Satz: **die Führungsstelle führt ihre Lage in dieser
Anwendung statt in der Excel.** Sechs Arbeitspakete, und alle sechs sind
Oberfläche über einem Kern, der steht.

## Was M2 übergibt

| Aus M1/M2 | Was M3 damit tut |
|---|---|
| `@s1/domaene`: Ereigniskatalog, Fold, Zielmodell, Kennzahlen K1–K30 | jede Ansicht ist eine reine Funktion über `Zustand`, keine Ansicht rechnet selbst |
| `@s1/speicher`: Akte, Takte, Spiegelung, Präsenz | unverändert; M3 schreibt nur über den Aktendienst |
| IPC-Kontrakt (`apps/desktop/src/kontrakt`) | bekommt drei neue Rufe, keinen breiteren Dauerstrom |
| Aktendienst je Akte | bekommt die Ereignisprojektion des Tagebuchs und beantwortet die neuen Rufe |
| Renderer mit Store und Statuszeile | bekommt die Ansichten; Store, Delta-Weg und Fehlerbild bleiben, wie sie sind |
| `KONZEPT-EREIGNISSE.md` §5.3, §5.4, §5.8, §5.9, §6 | die Regeln, gegen die jede Maske geprüft wird |

## Der Zuschnitt, der alles andere bestimmt

Der Abschlussbericht zu M2 legt ihn fest, und M3 hält sich daran:

> Das Lagebild im Kontrakt ist eine **flache Projektion für die Statuszeile**
> und wächst nicht weiter. M3 bekommt eigene Rufe.

Daraus folgt der Schnitt zwischen Schieben und Holen, und er ist keine
Geschmacksfrage. Ein Dauerstrom des vollen Zustands kostet bei 150 Einheiten
je Änderung eine Serialisierung des ganzen Lagebilds über die Prozessgrenze —
und zwar auch dann, wenn die Änderung ein Statuswechsel an einer einzigen
Einheit ist. Dieselbe Zahl steht in der DoD von M3.2 („150 Einheiten
flüssig") und ist damit ein Abnahmekriterium, kein Gefühl.

**Die Regel für M3 lautet deshalb:**

* **Geschoben** wird das flache Lagebild, unverändert aus M2, und zusätzlich
  ein **Zeiger**: eine Zahl, die bei jeder fachlichen Änderung hochzählt. Mehr
  nicht. Der Zeiger sagt „hol dir das, was du offen hast, neu" und nichts
  darüber, was sich geändert hat.
* **Geholt** werden Baum, Tabelle und Tagebuch, je mit eigenem Ruf, eigenem
  Ausschnitt und eigenen Filtern. Wer den Baum zugeklappt hat, holt ihn nicht;
  wer im Tagebuch auf Seite 1 steht, holt nicht die 50.000 Zeilen dahinter.

Das ist der Grund, aus dem der Zeiger überhaupt existiert: Ohne ihn müsste
entweder der Renderer pollen (und dabei meistens dasselbe holen) oder der
Worker müsste wissen, welche Ansicht offen ist — Fachwissen über die
Oberfläche im Worker, genau die Vermischung, die 02-ZIELBILD.md ausschließt.

## Reihenfolge — und warum sie von der Tabelle abweicht

Der Plan nennt M3.1 bis M3.6 in dieser Folge. Gebaut wird in einer anderen,
und zwar aus drei Gründen:

**1. Die Projektionen kommen vor den Ansichten, und sie kommen nach Ring 2.**

Baum, Tabelle und Tagebuch sind Ableitungen über `Zustand` beziehungsweise
über den Ereignisstrom. Keine davon braucht ein DOM, und keine darf im
Renderer entstehen: Eine Sortierregel, die in einer `.tsx` steht, ist gegen
§5.3 nicht prüfbar, und die Zyklusregel aus §5.3.1 wie die Auflösungskette aus
§5.3.2 sind zu genau festgelegt, um sie in einer Komponente nachzubauen.
`packages/domaene/src/projektion/` ist deshalb das erste Arbeitspaket und
läuft im Test in beiden Umgebungen (node und jsdom), wie der ganze Ring 2.

Dasselbe gilt für den lesbaren Satz des Tagebuchs. „Ein lesbarer Satz aus
`vorher`/`neu`" (DoD M3.3) ist eine Funktion von Ereignisart, Katalogeintrag
und Zustand — und keine Formatierung.

**2. Die Tastaturbedienung ist keine Ansicht, sondern eine Eigenschaft aller
Ansichten.**

Der Plan führt M3.6 zuletzt. Wer Enter/Escape und die Kürzel erst baut,
nachdem fünf Masken stehen, baut sie fünfmal nach. Die **Grundlage** —
eine zentrale Tastenkarte, die Konvention „Enter bestätigt, Escape bricht ab",
und die Stelle, an der ein Kürzel angemeldet wird — wird deshalb direkt nach
der ersten Maske gebaut und von jeder weiteren benutzt. Zuletzt bleibt nur
das, was tatsächlich zuletzt gehört: die Abkürzungsliste als Hilfefenster, die
erst vollständig sein kann, wenn alle Kürzel angemeldet sind.

**3. Der Stärke-Monitor kommt zuletzt, weil er die Schale anfasst.**

Er ist das einzige Paket von M3 mit einem zweiten `BrowserWindow`,
Monitorwahl und einem Push aus dem Worker in ein Fenster, das keine Akte
geöffnet hat. Alles andere ist Renderer über bestehendem Kontrakt. Ein
Fehler in der Schale kostet mehr als einer in einer Tabelle, und er kostet
ihn zu einem Zeitpunkt, zu dem noch fünf Pakete offen sind.

### Die Folge

| Nr. | Paket | Warum hier |
|---|---|---|
| 1 | **M3.0** Projektionen in Ring 2 (Baum, Tabellenzeile, Tagebuchzeile) | Grundlage aller drei Ansichten; ohne DOM prüfbar |
| 2 | **M3.7** Kontrakt: die drei Rufe und der Zeiger | die Naht, an der alle Ansichten hängen |
| 3 | M3.1 Abschnittsbaum | erste Maske, erste Bedienschritte |
| 4 | **M3.6a** Tastatur-Grundlage | vor der zweiten Maske, damit sie nicht nachgebaut wird |
| 5 | M3.2 Einheitentabelle | das größte Paket, und das mit der Zahl in der DoD |
| 6 | M3.3 ETB-Ansicht | braucht den Tagebuchstrom aus 1 und die Auswahl aus 3 und 5 |
| 7 | M3.4 EEB per Handscanner | braucht den Abschnittsbaum als Ziel der Übernahme |
| 8 | M3.5 Stärke-Monitor | fasst als einziges Paket die Schale an |
| 9 | **M3.6b** Abkürzungsliste als Hilfefenster | erst vollständig, wenn alle Kürzel angemeldet sind |

M3.0, M3.7, M3.6a und M3.6b sind keine neuen Pakete des Plans, sondern die
Aufteilung dessen, was dort unter M3.1 bis M3.6 zusammensteht.

## Definition of Done je Paket

Unverändert aus 05-UMSETZUNGSPLAN.md, mit dem Zusatz, der sich aus der
Reihenfolge ergibt:

| WP | DoD |
|---|---|
| M3.0 | Baum, Tabellenzeile und Tagebuchzeile als reine Funktionen in Ring 2; Zyklusregel §5.3.1 und Auflösungskette §5.3.2 in der Darstellung geprüft; Tests laufen in node **und** jsdom |
| M3.7 | drei Rufe mit Ausschnitt und Filter; der Zeiger zählt genau bei fachlicher Änderung; kein neues Feld im geschobenen Lagebild |
| M3.1 | BDD-Szenarien Abschnitte grün |
| M3.6a | eine Stelle, an der ein Kürzel angemeldet wird; Enter/Escape in jeder Maske geprüft |
| M3.2 | BDD-Szenarien Einheiten grün; 150 Einheiten flüssig (gemessen, nicht behauptet) |
| M3.3 | ETB zeigt jede Änderung; Undo sichtbar als Kompensation |
| M3.4 | mehrteiliger realer Bogen wird vollständig übernommen |
| M3.5 | auf Zweitbildschirm geprüft |
| M3.6b | BDD-Szenario Tastatur grün |

## Was „BDD-Szenarien grün" hier heißt

Drei Pakete verlangen BDD-Szenarien. v1 hatte dafür eine Feature-Datei
(`legacy-v1/e2e/features/einsatz-lifecycle.feature`, zehn Szenarien) und
Playwright; im v2-Baum gibt es beides nicht.

**Die Szenarien werden portiert, der Läufer nicht.** Sie stehen als
ausführbare Szenarien unter Vitest, in der Sprache der Feature-Datei
(`Szenario`, `Angenommen`, `Wenn`, `Dann`), und sie fahren die **echte**
Strecke: Renderer-Store → Brücke → Vermittlung → Aktendienst → Dateisystem,
auf einem Wegwerf-Verzeichnis. Zwei Gründe:

1. Playwright gegen Electron braucht ein Fenster und einen Bildschirm. Die
   CI-Matrix aus M2.5 läuft auf drei Plattformen, und ein Szenario, das auf
   zweien davon übersprungen wird, ist kein Nachweis. Die Gates verbieten
   übersprungene Tests.
2. Ein Szenario, das über den Store fährt, prüft dieselben Regeln, aber ohne
   die Klickstrecke. Was es **nicht** prüft, ist die Verdrahtung der Knöpfe —
   und genau dafür stehen daneben die Komponententests mit
   `@testing-library/react`, die es seit M2.2 gibt.

Der Läufer selbst (playwright-bdd gegen die gepackte Anwendung) gehört zu M7,
wo die Anwendung als Paket vorliegt. Das ist als Befund für Johannes
festzuhalten und nicht stillschweigend zu ersetzen.

## Was M3 nicht liefert

* **Kosten, Schichtplan, Ressourcenplanung, Logistik-Details.** Stufe 2, nach
  Entscheidung 1 des Umsetzungsplans. Die Felder stehen im Modell, die Masken
  nicht.
* **Ausgaben.** Druck, Status-Matrix, XLSX, HTML-Monitor und Einsatzakte sind
  M4. Der Stärke-Monitor aus M3.5 ist davon ausgenommen — er ist ein Fenster,
  keine Ausgabe.
* **Der Eingangskorb mit Quittierung.** M3.4 liest einen Bogen vom
  Handscanner und übernimmt ihn; der Korb mit Revisions-Diff ist M6.

## Verbindliches für die Arbeit

* Deutsch mit Umlauten in Code, Kommentaren, Tests und Commit-Nachrichten.
* Begründender Stil: Jeder Dokumentationskommentar sagt **warum** und
  verweist auf den Paragraphen von `KONZEPT-EREIGNISSE.md`,
  `KONZEPT-SPEICHER.md` oder das Zieldatenmodell, der die Regel festlegt.
* Ringgrenzen aus 02-ZIELBILD.md, erzwungen in `eslint.config.mjs`.
* Gates je Commit: `tsc -b`, `eslint .`, `vitest run`. Keine übersprungenen
  Tests.
