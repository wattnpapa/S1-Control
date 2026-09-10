# Einstieg in M8 — Dokumentation und Abnahme

Stand: 2026-09-10 · Meilenstein M8 aus [03-MEILENSTEINE.md](../../v2/03-MEILENSTEINE.md) · Status: **in Arbeit**

M8 ist der letzte Meilenstein des Plans. Seine Zeile im Meilensteindokument
lautet: „Anwenderdokumentation, In-App-Hilfe, Tastenkürzel, Abkürzungsliste;
eine Übung vollständig in v2 geführt; FüOrg-Editor“.

Drei der sechs Nennungen sind seit M3.6 gebaut, und das ändert den Zuschnitt
dieses Meilensteins von Grund auf.

## Was der Bestand hergibt

| Was M8 nennt | Wo es liegt |
|---|---|
| Tastenkürzel | `renderer/tastatur.ts` seit M3.6 — eine Liste, aus der die Kürzel **tatsächlich** greifen |
| Abkürzungsliste | `@s1/domaene`, `akueli.ts` seit M3.6, mit Suche |
| In-App-Hilfe | `renderer/Hilfe.tsx` seit M3.6 — Tastenkarte und AküLi in einem Fenster, über Strg+H |
| Störfälle als Daten | `packages/domaene/src/stoerfaelle.ts` seit M7.3, mit zwei Lesern |
| Erzeugungsmuster für Dokumente | `bau/kurzanleitung.mjs` und der Gleichstandstest daneben, seit M7.3 |
| Betriebsdokumentation | `BETRIEB.md`, `KURZANLEITUNG.md`, `ABNAHME.md` seit M7.4 |
| Der Abschnittsbaum als Führungsstruktur | `projektion/baum.ts` und `Abschnittsbaum.tsx` seit M3 |
| Stärke der Führungsstelle | `projektion/fuest.ts`, `fuestStaerke()` seit M5.4 |

Was **nicht** dasteht: eine Anwenderdokumentation, eine Hilfe, die mehr kann
als Kürzel und Abkürzungen nachschlagen, eine Darstellung der
Führungsorganisation, und eine Übung, die durch die ganze Anwendung führt.

## Der Zuschnitt, und warum er so ausfällt

**Nichts wird zweimal geschrieben.** Das ist die Festlegung, die M8 von M7
übernimmt und ausweitet. Die Tastenkürzel stehen in einer Liste, aus der die
Kürzel greifen; die Abkürzungen in einer, die die Suche bedient; die Störfälle
in einer, die Ansicht und Karte lesen. Eine Anwenderdokumentation, die diese
drei abschreibt, wäre nach der dritten Änderung an drei Stellen falsch. Sie
werden deshalb erzeugt, mit demselben Muster wie die Kurzanleitung: Marken im
Zieldokument, ein Skript, ein Gleichstandstest in `bau/`.

**Der FüOrg-Editor ist kein Editor.** Die Excel führt `FüOrg` als reines
Zeichenblatt (`excel-domaenenmodell.md` §4.5): Organigramm-Formen mit
Textfeldern, dazu vier verknüpfte Stärkefelder der Führungsstelle. Die Hinweise
sagen ausdrücklich, wie die Anpassung geht — „durch Umbenennen freier Bereiche
(EA/UEA) und Verschieben der Einheiten“. Genau das ist in v2 der
Abschnittsbaum, und der ist seit M3 bedienbar. Was fehlt, ist die
**Darstellung**: die Führungsharke, aus Baum und FüSt-Stärke gezeichnet, zum
Drucken und für den Monitor.

Einen zweiten Editor daneben zu bauen, hieße dieselbe Struktur an zwei Stellen
zu pflegen — und die Ereignisse (§5.3, §5.4) kennen nur eine.

**Die Übung kann nicht abgenommen werden.** F1 der Abnahmeliste verlangt drei
bis vier Rechner, ein NAS und zwei Stunden. Was ein Baum leisten kann, ist das
Drehbuch dazu und der Nachweis, dass die Strecke trägt: ein Szenario, das eine
vollständige Lage von der Einsatzanlage bis zur Einsatzakte durchfährt.

## Reihenfolge

| Nr. | Paket | Warum hier |
|---|---|---|
| 1 | **M8.1** In-App-Hilfe: Störfälle, Kontexthilfe je Ansicht | die Daten liegen seit M7.3; die Hilfe ist ihr dritter Leser |
| 2 | M8.2 `HANDBUCH.md`, erzeugt wo ableitbar | braucht die Hilfe, weil beide dieselben Listen lesen |
| 3 | M8.3 Führungsharke als Ausgabe | eigenständig; kommt nach der Dokumentation, weil sie in ihr beschrieben wird |
| 4 | M8.4 Übungsdrehbuch und der durchgehende Szenariolauf | prüft alles davor mit |

## Definition of Done je Paket

| WP | DoD |
|---|---|
| M8.1 | Das Hilfefenster zeigt Tastenkarte, Abkürzungen **und** die sechs Störfälle aus Ring 2; jede Hauptansicht hat einen Hilfetext, der aus einer Liste kommt und nicht im JSX steht |
| M8.2 | `HANDBUCH.md` beschreibt den Arbeitsablauf eines Einsatzes; Tastenkürzel, Abkürzungen und Störfälle sind **erzeugt**, und ein Test in `bau/` scheitert, wenn sie veralten |
| M8.3 | Die Führungsharke entsteht aus Abschnittsbaum und FüSt-Stärke, als HTML und PDF wie jede Ausgabe seit M4.1, mit Goldfile |
| M8.4 | Ein Szenariolauf führt eine vollständige Übungslage: Einsatz anlegen, Abschnitte, Einheiten, Anforderungen, Meldungen, Ausgaben, Export und Vergleich des `zustandsHash`. Das Drehbuch dazu steht in `docs/v2/UEBUNG.md`. **Die Übung selbst: offen (F1)** |

## Was M8 nicht liefert

* **Keinen zweiten Editor für die Führungsstruktur.** Siehe oben.
* **Keine Klärung der offenen Kürzel.** HK, MT, LdF und TLtg. (Offene
  Entscheidung 20) bleiben offen; die Dokumentation schreibt, was in der Excel
  steht, statt eine Deutung zu behaupten.
* **Keine Abnahme.** M8 füllt die Liste aus M7.4 nicht aus; es liefert, was
  nötig ist, um sie durchzugehen.

## Verbindliches für die Arbeit

* Deutsch mit Umlauten, begründender Stil mit Paragraphenverweis.
* Ringgrenzen aus 02-ZIELBILD.md.
* Gates je Commit: `tsc -b`, `eslint .`, `vitest run`. Keine übersprungenen
  Tests.
* Was aus einer Liste ableitbar ist, wird abgeleitet und nicht abgeschrieben.
