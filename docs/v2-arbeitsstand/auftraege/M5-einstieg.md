# Einstieg in M5 — Ressourcenplanung, Logistik, Kosten, FüSt-Personal

Stand: 2026-09-10 · Meilenstein M5 aus [03-MEILENSTEINE.md](../../v2/03-MEILENSTEINE.md) · Status: **abgeschlossen**, siehe
[M5-abschlussbericht.md](../berichte/M5-abschlussbericht.md)

M5 ist der erste Meilenstein, der in `05-UMSETZUNGSPLAN.md` nicht vorkommt.
Der Plan dort beschreibt Stufe 1 — das Zwischenziel „besser als die Excel" —
und endet nach M4 mit dem Block „V Verteilung und Betrieb".
`03-MEILENSTEINE.md` zählt weiter und führt M5 mit 3,0 bis 4,0 PW:
„Anforderung/Zusage/Ablösung/Rückführung, Logistikbedarf und Log-Ausgabe,
Kostenparameter, FüSt-Personal mit Schichtplan". Dieselbe Quelle stellt
ausdrücklich frei, die Reihenfolge nach M4 nach Bedarf der Führungsstelle zu
tauschen.

Damit fällt M5 in Stufe 2 nach Entscheidung 1. Das ist keine Nebensache: Der
Umsetzungsplan sagt zu M4.2 ausdrücklich, Logistik und Kosten blieben in der
Excel. M5 holt sie herein, und das ist eine Erweiterung des Umfangs von
Stufe 1 — sie ist als solche zu benennen und nicht als Selbstverständlichkeit
zu behandeln.

## Was M1 bis M4 übergeben — und warum M5 kein Ereignis anlegt

Der wichtigste Befund vor der ersten Zeile Code: **Der Ereigniskatalog für M5
steht bereits.** M1 hat ihn vollständig angelegt, der Fold faltet ihn, und der
Zustand führt die Entitäten.

| Was M5 braucht | Wo es schon liegt |
|---|---|
| Anforderung mit Zusage, Erledigung, Storno und drei Rücknahmen | `katalog/schemata.ts`, KONZEPT-EREIGNISSE.md §5.6; Zustandsmaschine §5.6.2 |
| Dienstposten und Schichtplan | dieselbe Stelle, §5.7; `zustand.dienstposten`, `zustand.schichtplan` |
| Logistikfelder je Einheit (AC bis AI) | `LogistikGesetzt`; in der Einheitentabelle seit M3.2 **bearbeitbar** |
| Kostenparameter des Einsatzes | `EinsatzAngelegt.kosten` und `KostenParameterGeaendert` |
| Die vier Kostenzahlen je Einheit | K13 bis K16 in `kennzahlen.ts` |
| Die FüSt-Projektion | K17 in `kennzahlen.ts` |
| Ressourcenspalten L, M, T bis W | in der Spaltentabelle aus M3.2, bearbeitbar |

M5 legt deshalb **keine neuen Ereignisarten an**. Wo der Katalog eine Lücke
hat, wird sie als Befund gesammelt und nicht geschlossen: Eine neue Art
berührt den `zustandsHash` und gehört zu einer `foldVersion`, nicht in ein
Oberflächenpaket. Dieselbe Regel galt in M3 für die Befunde B1 und B2.

Was M5 baut, ist die Schicht darüber: Projektionen in Ring 2, Ansichten und
Masken im Renderer, zwei Ausgaben in `@s1/ausgaben`.

## Die vier Lücken, genau benannt

**1. Anforderungen haben keine Ansicht.** Die Excel führt sie als Spalten N
bis S einer Einheitenzeile (`excel-domaenenmodell.md` §2): Ablösung
angefordert, Anforderungs-ID, Zugesagt für, Zugesagt von, Vorgesehene Einheit,
Vorgesehener Auftrag. Im Zielmodell ist es eine **eigene Entität** mit einer
Zustandsmaschine (§5.6.2), und genau deshalb stehen diese sechs Spalten in der
Spaltentabelle aus M3.2 als leer und unbearbeitbar. Sie bleiben leer, bis es
eine Anforderungsansicht gibt.

**2. Das FüSt-Personal hat keine Ansicht.** K17 rechnet die Führungsstelle aus
den besetzten Dienstposten, und ihr Ergebnis fließt in der Vorlage nach
`Stärke!AJ7:AL16` — also in den Druck, den M4.1 gebaut hat. Solange niemand
Dienstposten anlegen und besetzen kann, ist diese Zeile im Ausdruck null.
Dazu kommt der Schichtplan: Funktion × Tag, mehrzeiliger Freitext, ein zweites
Modell neben der Einheitentabelle (`excel-domaenenmodell.md` §5).

**3. Die Log-Ausgabe fehlt.** Die Daten sind vollständig da — die
Logistikspalten sind seit M3.2 bearbeitbar —, aber das Blatt „Log"
(`excel-domaenenmodell.md` §4.3) gibt es nicht: eine Zeile je Bereich,
Schichtspalten Früh/Spät/Tag/Nacht, Einsatzkräfte nach m/w/d, Vegetarier,
Veganer, Übernachtung nach m/w/d, dazu die getrennte Zeile für den Bereich
„Angefordert / Anmarsch". `LogFrei` ist die Wertekopie desselben Blattes zum
freien Weiterverarbeiten.

**4. Die Kostenübersicht fehlt.** K13 bis K16 rechnen sie je Einheit, und die
Spalte AO (PSA-Sätze pro Tag) ist in der Tabelle bearbeitbar. Was fehlt, sind
die vier Parameter des Einsatzes — `psaKostenProSatz`, `vdaProTag`,
`ukVerpflegungProTag`, `geplanteEinsatztage` — die kein Bedienschritt setzen
kann, und ein Blatt, das die Zahlen zeigt.

## Der Befund, der vor der Log-Ausgabe steht

Aus dem M4-Bericht, Befund A1: **Die Vorlage widerspricht sich bei
„männlich".** Das Blatt „Status" rechnet `Männl. = Gesamt − Weibl.`, das Blatt
„Log" rechnet `I = H − J − K`, also Gesamt − Weiblich − Divers
(`excel-domaenenmodell.md` §4.2 und §4.3). Beides kann nicht stimmen.

Die Log-Ausgabe aus M5 stolpert genau darüber, und zwar in ihrer
Hauptspalte. Entschieden wird das hier **nicht**: Gebaut wird gegen K5, das
seit M1.3 `Gesamt − weiblich − divers` rechnet — die Lesart des Log-Blatts,
also die des Blattes, das hier entsteht. Die Stelle trägt einen Kommentar mit
beiden Formeln, und der Abschlussbericht führt sie erneut. Wer sie ändert,
ändert eine Spalte in drei Ausgaben.

## Reihenfolge — und warum sie von der Aufzählung abweicht

`03-MEILENSTEINE.md` nennt die vier Bereiche in der Folge Ressourcenplanung,
Logistik, Kosten, FüSt-Personal. Gebaut wird in einer anderen, aus drei
Gründen:

**1. Die Projektionen kommen vor den Ansichten.** Wie in M3: Anforderungsliste,
FüSt-Blatt, Logistikzeilen und Kostenzeilen sind Ableitungen über `Zustand`.
Keine braucht ein DOM, und keine darf im Renderer entstehen — die
Zustandsmaschine aus §5.6.2 ist zu genau festgelegt, um sie in einer
Komponente nachzubauen, und die Zuordnung Bereich → Logistikzeile ist dieselbe
Rechnung, die der Druck schon anstellt. `packages/domaene/src/projektion/` ist
deshalb das erste Paket, zusammen mit den Rufen im Kontrakt.

**2. Die beiden Ausgaben werden vorgezogen.** Log und Kosten brauchen keine
neue Entität, keine neue Maske und keinen neuen Bedienschritt außer einem: Ihre
Daten stehen seit M3.2 in der Tabelle und seit M1.3 in den Kennzahlen. Sie
sind damit Varianten dessen, was M4.1 schon tut, und in zwei Commits fertig.
Das hat zwei Vorteile. Sie schließen zwei der vier Bereiche früh, und sie
legen den Befund A1 als **gedrucktes Blatt** vor statt als Zeile in einem
Bericht — eine Führungsstelle entscheidet die Frage schneller, wenn sie die
beiden Zahlen nebeneinander sieht.

**3. Die Anforderung kommt vor der Führungsstelle.** Beide sind neue
Entitäten mit neuer Ansicht, und beide sind teuer. Die Anforderung ist die
riskantere: Ihre Zustandsmaschine hat vier Zustände, sechs Ereignisse und drei
Rücknahmen, und §5.6.2 verlangt ausdrücklich, dass `EINGETROFFEN` gegen ein
späteres Storno gewinnt. Das gehört gebaut, solange noch Zeit für einen
zweiten Anlauf ist. Die Führungsstelle ist umfangreicher, aber gerader: fünf
Teilbereiche, Dienstposten mit Besetzung 0/1, ein Freitextplan.

### Die Folge

| Nr. | Paket | Warum hier |
|---|---|---|
| 1 | **M5.0** Projektionen in Ring 2 und die Rufe im Kontrakt | Grundlage aller vier Bereiche |
| 2 | M5.1 Log und LogFrei als Ausgabe | keine neue Entität; legt Befund A1 als Blatt vor |
| 3 | M5.2 Kostenübersicht und die vier Parameter am Einsatz | eine Maske, ein Blatt; K13 bis K16 stehen |
| 4 | M5.3 Anforderungen: Ansicht, Masken, Zustandsmaschine | die riskanteste Strecke, mit Luft dahinter |
| 5 | M5.4 FüSt-Personal: Dienstposten, Besetzung, Schichtplan | die umfangreichste, aber die gerade |

## Definition of Done je Paket

Aus `03-MEILENSTEINE.md`, mit dem Zusatz, der sich aus der Reihenfolge ergibt:

| WP | DoD |
|---|---|
| M5.0 | Vier Projektionen als reine Funktionen in Ring 2; die Zustandsmaschine §5.6.2 in der Darstellung geprüft, einschließlich P6 (jede Permutation, jedes Präfix); Rufe mit Filter und Ausschnitt, kein neues Feld im geschobenen Lagebild |
| M5.1 | Log-Blatt als HTML und PDF, LogFrei als XLSX; Zeilen mit Summe 0 ausgeblendet wie in der Vorlage; die Zeile „Angefordert / Anmarsch" getrennt; Goldfiles über der Prüflage; fremder Leser für die XLSX |
| M5.2 | Die vier Parameter sind über eine Maske setzbar und tragen `vorher` (§2.2a); Kostenblatt als HTML und PDF; die Summen gehen gegen K13 bis K16 auf |
| M5.3 | Anforderung anlegen, ändern, zusagen, erledigen, stornieren und jede der drei Rücknahmen; der abgeleitete Zustand ist sichtbar; `moeglicheDublette` nach §5.6.1 wird angezeigt; die Spalten N bis S der Einheitentabelle zeigen die verknüpfte Anforderung |
| M5.4 | Dienstposten anlegen, ändern, besetzen, entfernen, wiederherstellen; die fünf Teilbereiche der Vorlage vorbelegt; Schichtplan Funktion × Tag beschreibbar; K17 fließt in den Druck aus M4.1, und das ist im Ausdruck geprüft |

## Was M5 nicht liefert

* **Keine neue Ereignisart.** Siehe oben. Lücken werden als Befund gesammelt.
* **Die Entscheidung zu „männlich".** Gebaut wird gegen K5, die Stelle ist
  benannt.
* **Die Kostenrechnung der Vorlage Spalte für Spalte.** AN bis AW sind dort
  durchweg Formel; hier stehen die vier Zahlen aus K13 bis K16 und die
  Parameter, aus denen sie entstehen. Eine Zelle-für-Zelle-Nachbildung wäre
  eine zweite Wahrheit über dieselbe Größe.
* **FüOrg.** Ein reines Zeichenblatt ohne Datenmodell
  (`excel-domaenenmodell.md` §4.5); es gehört zur Lagekarte und steht in M8.
* **Die Parität mit der Excel.** Unverändert offen aus M4: Die Referenzlage
  aus Entscheidung 8 liegt nicht vor.

## Verbindliches für die Arbeit

* Deutsch mit Umlauten in Code, Kommentaren, Tests und Commit-Nachrichten.
* Begründender Stil: Jeder Dokumentationskommentar sagt **warum** und
  verweist auf den Paragraphen von `KONZEPT-EREIGNISSE.md`,
  `KONZEPT-SPEICHER.md`, das Zieldatenmodell oder `excel-domaenenmodell.md`,
  der die Regel festlegt.
* Ringgrenzen aus 02-ZIELBILD.md, erzwungen in `eslint.config.mjs`.
  `@s1/ausgaben` bleibt ohne `node:` und ohne Electron.
* Keine Ausgabe rechnet: Jede Zahl ist eine Kennzahl aus Ring 2.
* Das Lagebild im Kontrakt wächst nicht. Jede Ansicht bekommt ihren eigenen
  Ruf mit Filter und Ausschnitt (M3.7).
* Gates je Commit: `tsc -b`, `eslint .`, `vitest run`. Keine übersprungenen
  Tests.
