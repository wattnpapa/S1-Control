# KONZEPT-EREIGNISSE — Ereigniskatalog, Konfliktregeln, Undo

Stand: 2026-09-09 · Paket M1.2, Bauvorlage für M1.3 · Status: **Entwurf, elfte Fassung nach zehn Gutachten**

Verbindliche Grundlagen: [KONZEPT-SPEICHER.md](KONZEPT-SPEICHER.md) (freigegeben am 2026-09-08), [03-MEILENSTEINE.md](../03-MEILENSTEINE.md) Auflagen 4, 6, 10, 11, 12, 13 und 18, [02-ZIELBILD.md](../02-ZIELBILD.md). Fachliche Quelle: `docs/v2-arbeitsstand/entwurf/zieldatenmodell-feldabgleich.md` §2 bis §4 — im Folgenden **ZDM**. Stand des Codes: `packages/domaene/src/{ereignis,fold,zustand}.ts` aus M0.2.

Dieses Dokument ist die Spezifikation, gegen die M1.3 gebaut wird. Code-Kommentare in `@s1/domaene` verweisen auf seine Paragraphen. Wo eine Zahl erst durch eine Antwort der Führungsstelle oder eine Messung bestimmt wird, steht ein **Startwert** mit Begründung und in §10 sein Eintrag.

---

## §1 Zweck, Geltungsbereich und Abgrenzung

### §1.1 Was dieses Konzept festlegt

Welche Ereignisarten es gibt, welche Nutzlast jede trägt, welches Zustandsfeld sie setzt, mit welcher Regel ein Konflikt entschieden wird — und **den Zustand selbst**, den KONZEPT-SPEICHER.md §7.2 serialisiert. Der letzte Punkt ist keine Zugabe: Ohne vollständig aufgeschriebenen Zustand erfinden zwei Implementierungen zwei Strukturen, und der Konvergenzvergleich aus §7.6 dort vergleicht dann Äpfel mit Birnen.

Aufbau: der fachliche Teil des Rahmens (§2), Zustand und allgemeine Regeln (§3), Nutzlastversionen und Upcaster (§4), der Katalog (§5), Undo U1 bis U6 (§6), die Barriere `EinsatzArchiviert` (§7), Zusicherungen und Grenzen (§8).

### §1.2 Was dieses Konzept nicht festlegt

**Kennzahlen und Excel-Formeln.** Welche Summe über welche Menge läuft (ZDM §3.3, K1 bis K24), gehört zu M1.3. Hier steht, welcher Wert im Zustand steht, wer ihn gesetzt hat und **ob eine Entität mitzählt** (`zaehlt`, §3.2) — die Zählbarkeit ist Teil des Zustands, weil mehrere Konfliktregeln sie bestimmen. Wie aus den zählenden Entitäten eine Summe wird, steht hier nicht — mit **einer** Festlegung, die hierher gehört, weil P4 und §11.1 daran messen: **Jede Stärkesumme läuft über `wirksameStaerke` der Einheiten mit `zaehlt`, nie über `staerke`.** Die eigene Stärke ist ein Rechenposten, keine Kennzahl.

**Die Speicherschicht.** Zeilenformat, Hash-Kette, Segmente, Spiegel, Poll, Schnappschussformat und jedes Fehlerbild der Dateiebene stehen in KONZEPT-SPEICHER.md und werden **benutzt und nicht geändert**. Die Grenze verläuft an einer Stelle: Der Schnappschuss ist dort die Serialisierung des Zustands, und **welche Felder der Zustand hat, legt dieses Dokument fest**. Ein zusätzliches Zustandsfeld ist deshalb keine Änderung an der Speicherschicht; es erhöht `foldVersion` (§3.9). Abweichungen und Lücken stehen als Befund in §10, nicht als Änderung.

**Die beiden Verwaltungsereignisse.** `SegmentAbgeschlossen` und `SegmentErsetzt` gehören der Speicherschicht. Sie tauchen hier nicht auf, der Fold ändert an ihnen keinen fachlichen Zustand, und das Einsatztagebuch zeigt sie nicht.

**Stammdaten außerhalb der Akte.** `EinheitVorlage` und `VokabularEintrag` sind nach ZDM §3.1 global und nicht einsatzgebunden. Sie liegen unter `stammdaten\`, werden versioniert ausgeliefert und nicht durch Ereignisse geändert. Es gibt für sie keine Ereignisart. Was eine Einheit aus einer Vorlage übernommen hat, steht als `vorlageId` an der Einheit.

**Das Einsatztagebuch.** Projektion des **Ereignisstroms**, nicht des Zustands (§5.9.1); nicht im `zustandsHash`.

**Oberfläche, Migration, Rollen.** Masken und Bedienschritte sind M2/M3. ZDM §5 erzeugt Ereignisse dieses Katalogs, ändert aber keine Regel. Rollen gibt es nicht (Entscheidung 9); `akteur` ist Protokoll, keine Berechtigung.

### §1.3 Die fünf tragenden Sätze

1. **Der Fold ist eine Mengenfunktion.** Das Ergebnis hängt allein von der Menge der Ereignisse ab.
2. **Jede Regel entscheidet allein aus dem Zustand und dem eintreffenden Ereignis.** Die schärfere Fassung von Satz 1; Herleitung in §3.1.
3. **Nichts wird still verworfen.** Verliert ein Ereignis, entsteht ein Konflikthinweis, und der Hinweis ist Teil des Zustands (§3.8).
4. **Der Zustand ist wiederherstellbar.** Kein Feld hat eine andere Quelle als die Ereignismenge — mit genau zwei benannten Ausnahmen: die beiden systemseitigen Abschnitte (§5.3.4), deren Werte hier festgeschrieben sind.
5. **Eine Regel, die einen Fall nicht kennt, wird im Code von Hand ausgelegt.** Deshalb nennt jede Regel ihren Grenzfall, und §11 führt zu jeder Regel den Prüffall.

---

## §2 Der Rahmen — fachlich gelesen

### §2.1 Die Felder

Festgelegt in KONZEPT-SPEICHER.md §2.4; hier nur die Lesart.

| Feld | Lesart |
|---|---|
| `id` | `<clientId>:<laufnummer>`; Idempotenzschlüssel (§3.6) |
| `hlc` | die einzige Ordnung (§3.5) |
| `schemaVersion` | Version der **Nutzlast dieser Ereignisart** (§4); Befund B1 |
| `typ` | Schlüssel in den Katalog (§5) |
| `akteur` | Protokoll und Anzeige |
| `wanduhr` | Anzeige und Plausibilisierung, nie Ordnung (§2.5) |
| `vorher` / `neu` | gesehener und neuer Wert des Zustandsfeldes, das die Art setzt (§2.2) |
| `undoOf`, `korrekturVon` | Kompensation und Berichtigung (§6) |
| `grund` | Freitext; bei neun Arten Pflicht (§2.4) |
| `nutzlast` | Kennungen, Feldauswahl, Anlagewerte und Prüfangaben — nie ein gesetzter Wert (§2.2) |

### §2.2 Wo der Wert steht — drei Fälle, keine weiteren

Auflage 6 verlangt den gesehenen Vorher-Wert an jedem setzenden Ereignis und einen Konflikthinweis bei Abweichung. Damit die Auswertung nicht je Art neu erfunden wird, gibt es genau drei Formen, und jede Ereignisart des Katalogs ist genau einer zugeordnet.

**(a) Setzendes Ereignis auf eine Entität.** Es setzt **ein** Zustandsfeld. `neu` trägt den Wert, `vorher` den gesehenen. Die Nutzlast trägt nur die Kennung und, wo nötig, die Feldauswahl (`feld: "bezeichnung"`). Ist der Wert eine Struktur (Klasse LWW/Entität, §3.4), **ist** `neu` diese Struktur. `neu = null` heißt „Wert löschen"; ist das Feld vorher ungesetzt, ist `vorher` **abwesend** — die Unterscheidung ist nötig, weil die kanonische Serialisierung Felder ohne Wert weglässt.

**(b) Anlegendes Ereignis.** Es legt eine Entität oder einen Eintrag an und setzt **alle** seine Felder auf einmal. Die Werte stehen in der **Nutzlast** — dort und nirgends sonst, denn ein einzelnes `neu` könnte sie nicht tragen. `vorher` ist abwesend: Es gab nichts zu sehen. Welche Feldpfade eine Anlage belegt, steht in §2.3.

Die dreizehn Arten, die eine **Entität** anlegen, sind in §3.11 aufgezählt; sie unterliegen dort zusätzlich der Kollisionsregel. `EinsatzArchiviert` und `ArchivierungZurueckgenommen` sind ebenfalls Form (b) — sie legen einen **Eintrag** unter einer Ereignis-Id an (§7.2) —, gehören aber nicht zu jenen dreizehn: Es gibt keine zweite Anlage derselben Id, weil die Id die des Ereignisses selbst ist. `EinheitAufgeteilt` ist dagegen Form (c): Es legt die neue Einheit an **und** setzt je übernommenem Fahrzeug und je übernommener Person ein Feld (§5.4.2). Seine Wirkung auf die Stärke der Quelle ist keines von beidem, sondern eine **Ableitung**.

**(c) Setzendes Ereignis auf mehrere Entitäten.** Zwei Arten: `EinheitZusammengefuehrt` und `EinheitAufgeteilt`. Beide sind ein Fachvorgang, der mehrere Entitäten zugleich betrifft; ihn zu zerlegen hieße, dass ein Teil verlorengehen könnte. Es gilt: **je betroffener Entität genau ein Feld**, und der Wert je Entität steht in der Nutzlast unter der Kennung dieser Entität. Die Prüfangabe `gesehen` ist **kein** `vorher` im Sinne von (a), sondern ein eigenes Datum mit eigener Regel (§5.4.3).

**`KorrekturVon` hat keine eigene Form,** sondern übernimmt die ihres `zielTyp`. Weil `zielTyp` weder eine Anlageart noch eine der beiden strukturellen Arten sein darf (§5.9.2), ist das immer (a).

Die Zuordnung je Art steht in der Spalte „Form" der Katalogtabellen. Ungültig ist (§3.7 Punkt 4): ein Ereignis der Form (a) **ohne** `neu`; eines der Form (b) **mit** `neu`; eines der Form (c) **mit** `neu` oder `vorher` im Rahmen — dort stehen beide je Entität in der Nutzlast.

Der Satz „je betroffener Entität genau ein Feld" gilt für die Entitäten, auf die ein Ereignis der Form (c) **setzend** wirkt. `EinheitAufgeteilt` legt daneben eine Entität **an** und belegt deren Felder nach (b) und §2.3 — beides zugleich, weil beides ein Fachvorgang ist.

#### §2.2a Die Prüfung des Vorher-Werts

Auflage 6 verlangt den Konflikthinweis bei Abweichung. Ausgeschrieben:

> **Regel.** Trägt der Gewinner eines Feldes einen `gesehenerVorher` und gibt es eine **zweithöchste** Beobachtung (§3.3), deren Wert davon abweicht, entsteht `vorherPasstNicht` mit dem Feldpfad, beiden Ereignis-Ids, dem gesehenen und dem verdrängten Wert. Verglichen wird über die kanonische Serialisierung, also auch für Strukturwerte wie das Stärke-Tripel.

Vier Grenzfälle, jeder mit seiner Antwort:

* **Keine zweithöchste Beobachtung.** Kein Hinweis. Es gibt nichts, dem die Behauptung des Schreibers widerspräche: Niemandes Arbeit wurde verdrängt. Das gilt auch, wenn der Gewinner einen Wert zu sehen behauptet, den das Feld nie hatte — der Fold prüft Verdrängung, nicht Wahrhaftigkeit.
* **`gesehenerVorher` ist `{ wert: null }`.** Ein ausdrücklich mitgeführtes „ich sah nichts". Gegen eine zweithöchste Beobachtung mit einem Wert ist das eine Abweichung und erzeugt den Hinweis; ohne zweithöchste Beobachtung nicht.
* **Kein `gesehenerVorher`.** Das ist die Anlage (§2.3) — dort greift `ohneVorherWertVerdraengt` statt `vorherPasstNicht`, mit derselben Wertgleichheitsprüfung. Ein **fehlendes optionales Nutzlastfeld** eines Ereignisses der Form (c) ist etwas anderes: Es sagt „ich sah nichts" und wird als `gesehenerVorher = { wert: null }` aufgenommen, fällt also unter den Grenzfall darüber. So das fehlende `gesehenEinheitId` einer Aufteilung (§5.4.2). Prüffall T138.
* **Ein Erstwert-Feld** (`abgeteiltVon`, `aufgegangenIn`). Für sie gilt die Prüfung **nicht**. Sie gehören zu Ereignissen der Form (c), die im Rahmen weder `neu` noch `vorher` tragen dürfen (§2.2), und sie haben keine zweithöchste Beobachtung, sondern eine Liste `verdraengt` um einen Gewinner mit der **kleinsten** HLC (§3.3). Weder `vorherPasstNicht` noch `ohneVorherWertVerdraengt` entstehen dort; die Verdrängung meldet `wirkungslosGegenTerminalzustand` (§3.12), und die inhaltliche Prüfung leistet `gesehen` mit `vorgangSummeWeichtAb` (§5.4.3). Ohne diese Klarstellung trüge ein einziger Vorgang drei Hinweise für eine Sache. Prüffall T135.

Beide Hinweise werden nach §3.8 bei jeder Materialisierung neu gerechnet; verdrängt ein drittes Ereignis den Zweitplatzierten, fallen sie von selbst weg.

**Wertbezogene Hinweise entstehen nur am Gewinner eines Feldes** — und bei `einsatz.archivierungen`, das kein `Feld<T>` ist (§7.2), nur an der **maßgeblichen** Archivierung. Zwei Archivierungen mit verschiedenen Zeitpunkten führen also höchstens einen `meldezeitUnplausibel`, am selben Eintrag, den §7.1 auch sonst als den geltenden führt. Das betrifft `meldezeitUnplausibel` (§2.5) und `unbekannterWert` (§3.7): Der Zustand hält ihre Eingangsdaten auch an der zweithöchsten Beobachtung, und beide wären dort ebenso berechenbar — die Festlegung ist deshalb nötig und nicht selbstverständlich. Sie fordert auf, einen Wert zu prüfen, der **gilt**; ein verdrängter Wert gilt nirgends, und ein Hinweis auf ihn erschiene und verschwände mit jeder fremden Änderung an demselben Feld. Die verdrängungsbezogenen Hinweise oben sind das Gegenteil: Sie handeln gerade von der zweithöchsten Beobachtung. Prüffall T148.

### §2.3 Welche Feldpfade eine Anlage belegt

**Genau die Felder, die ihr Nutzlastschema für den Zustand der angelegten Entität setzt** — mit der HLC der Anlage und ohne Vorher-Wert. Die Zuordnung ist nicht der Feldname der Nutzlast, sondern der **Zustandsfeldname**; wo sie auseinandergehen, nennt der Katalog beide. Verbindlich:

| Anlage | belegte Feldpfade |
|---|---|
| `EinsatzAngelegt` | `einsatz/name`, `/art`, `/fuestName`, `/uebergeordneteFuestName`, `/ort`, `/beginn`, `/schichtmodell` und die vier Pfade `einsatz/kosten/<feld>` — je Kostenparameter ein eigener Pfad, damit ein späteres `KostenParameterGeaendert` denselben Pfad trifft |
| `AbschnittAngelegt` | `abschnitt/<id>/name`, `/typ`, `/parentId`, `/reihenfolge`, `/bemerkung` |
| `EinheitGemeldet` | je Feld des Schemas unter `einheit/<id>/<feld>`, gleichnamig — einschließlich `abschnittId` und `staerke` |
| die übrigen | analog, je Feld des Schemas unter dem Pfad der Entität |

**Ein optionales Feld, das in der Nutzlast fehlt, belegt keinen Pfad.** Die Anlage setzt es nicht auf abwesend, sondern äußert sich nicht dazu. Sonst überschriebe eine nachlaufende Anlage ohne Bemerkung eine bereits gesetzte Bemerkung mit „leer" — der Fall aus dem Absatz „Wenn eine Anlage fremde Arbeit verdrängt" unten, nur ohne jede sichtbare Änderung.

Nicht belegt werden die Kennung selbst und jedes Feld, das §3.2 als **abgeleitet** führt.

**Wenn eine Anlage fremde Arbeit verdrängt.** Eine Anlage trägt keinen Vorher-Wert, gewinnt aber ein Feld, sobald ihre HLC über der einer Änderung an demselben Feld liegt. Der Fall ist real und nicht selten: Ein Client meldet eine Einheit (HLC 9), während ein anderer sie bereits verschoben hat (HLC 5) — etwa weil die Anlage über einen Meldekopf nachläuft. Die Anlage gewinnt `abschnittId` und setzt es auf ihren Wert, ohne den fremden gesehen haben zu können.

> **Regel.** Trägt der Gewinner eines Feldes **kein** `gesehenerVorher` und unterscheidet sich sein Wert von dem der zweithöchsten Beobachtung, entsteht `ohneVorherWertVerdraengt` mit Gewinner, verdrängtem Ereignis und verdrängtem Wert. Sind die Werte gleich, entsteht kein Hinweis — es ist nichts verloren.

Ohne diesen Hinweis wäre die Lage von stillem Verwerfen nicht zu unterscheiden, und Auflage 6 hätte für Anlagen keine Wirkung. `@s1/domaene` erzeugt ihn seit M0.2; hier steht die Regel dazu. Prüffall T106.

### §2.4 `grund` — die vollständige Liste der Pflichtfälle

Freitext, überall erlaubt. **Pflicht** (`z.string().min(1)`) bei neun Arten, und nur bei diesen:

`AbschnittTypGeaendert` (ändert Zählregeln rückwirkend) · `EinheitEntfernt`, `FahrzeugEntfernt`, `PersonEntfernt` (nimmt etwas aus allen Summen, das jemand gemeldet hat) · `AnforderungStorniert` (beendet einen Vorgang gegenüber einer fremden Stelle) · `EebMeldungAbgelehnt` · `EtbEintragBerichtigt` · `KorrekturVon` · `ArchivierungZurueckgenommen`.

`DienstpostenEntfernt` und `AnhangEntfernt` gehören **nicht** dazu: Ein Dienstposten ist Planung, ein Anhang ein Verweis; keines von beiden nimmt eine gemeldete Kraft aus der Lage. Diese Tabelle ist die einzige Quelle; die Schemata verweisen auf sie.

### §2.5 Fachliche Zeiten und ihre Plausibilisierung (Auflage 12)

KONZEPT-SPEICHER.md §3.1 trennt technische Ordnung (HLC) und fachliche Zeit und schiebt die Schwelle hierher. **Jede** fachliche Zeit des Katalogs ist einer von drei Klassen zugeordnet; es gibt keine vierte und keine unzugeordnete.

**`datum` in `SchichtplanEintragGesetzt` ist keine fachliche Zeit,** sondern ein **Schlüsselbestandteil** (§5.7): Es benennt die Zelle, die beschrieben wird, nicht den Zeitpunkt einer Meldung. Es wird deshalb nicht plausibilisiert, und die Aufzählung oben führt es nicht — ein Dienstplan für übermorgen ist der Normalfall, und ein Eintrag für vorgestern eine zulässige Nachtragung.

| Klasse | Zeiten | Prüfung |
|---|---|---|
| **Ist-Zeit** | `meldezeit` (`StaerkeGeaendert`), `eingetroffenAm`, `einsatzendeAm`, `rueckfuehrungAm`, `angefordertAm`, `erledigtAm`, `von` (`AuftragErfasst`), `beginn` und `ende` des Einsatzes, `zeitpunkt` beider ETB-Arten, `aufgeloestAm`, `hinzugefuegtAm`, `zeitpunkt` von `EinsatzArchiviert` (dessen `wanduhr` steht im Eintrag, §3.2) | Abweichung von der `wanduhr` desselben Ereignisses über **12 Stunden** in eine der beiden Richtungen ⇒ `meldezeitUnplausibel`. Startwert S1 |
| **Planwert** | `verfuegbarBis`, `zugesagtFuer`, `bis` (`AuftragBeendet` und `AuftragErfasst`) | Hinweis nur, wenn der Wert **vor** der Wanduhr liegt oder mehr als **90 Tage** danach. Startwert S8 |
| **Fremdzeit** | `stand` und `empfangenAm` einer EEB-Meldung | **keine Prüfung.** Sie stammen aus einem fremden Gerät, dessen Uhr diese Führungsstelle nicht verantwortet; ein Hinweis daran wäre bei jedem zweiten Papierbogen zu sehen und damit wertlos |

Ohne die Trennung erzeugte jede Ablösezusage für morgen einen Hinweis, und der Hinweis verlöre binnen eines Tages jede Bedeutung.

**Der Hinweis hängt an dem Feld, das die Zeit trägt** — bei Anlagen an dem Feldpfad aus §2.3. Bei `StaerkeGeaendert` steht er nach Auflage 12 am **Stärkewert**, weil `meldezeit` dort kein eigenes Zustandsfeld ist, sondern die Meldung datiert.

**Der Hinweis ist kein Fehler,** das Ereignis wirkt. **Die Schwelle entscheidet keinen Konflikt** — täte sie es, hinge die Konfliktauflösung an der Wanduhr.

### §2.6 „Neueste Revision zählt" — zwei Ordnungen, die nie vermischt werden

Auflage 12 verlangt, „neueste Revision zählt" zu **definieren**. Es sind zwei verschiedene Fragen mit zwei verschiedenen Antworten:

* **Welches Ereignis gewinnt einen Konflikt** — immer die HLC (§3.5). Ausnahmslos.
* **Welche EEB-Meldung ist der Revisionskopf einer Einheit** — die Ordnung `istNeuer()` aus dem Erfassungsbogen: erst `stand`, dann `empfangenAm` (ZDM §3.2). **Nicht** die HLC.

Der Unterschied ist nicht formal. Ein Papierbogen von gestern, der heute nachgescannt wird, hat die höhere HLC und den älteren `stand`. Nach HLC geordnet wäre er der Revisionskopf, und die Lage zeigte den Stand von gestern als aktuell. Die Meldungen sind untereinander kein Konflikt — sie sind **Revisionen einer Reihe**, und ihre Reihenfolge ist eine fachliche Angabe im Bogen, keine technische Ordnung. Deshalb gilt hier `stand`, und deshalb gilt für die Frage, welches Ereignis ein *Feld* setzt, weiterhin die HLC.

Daraus folgt die Ableitung von `uebernahmeZustand = GEAENDERT` (§5.8.1): Sie fragt nach `stand`, nicht nach HLC.

---

## §3 Der Zustand und die Regeln, die für jede Art gelten

### §3.1 Zustandsgebundenheit — warum dieser Paragraph vor dem Katalog steht

Ein Client, der einen Einsatz öffnet, lädt einen eigenen Schnappschuss und faltet ab dessen Versionsvektor weiter (KONZEPT-SPEICHER.md §7.5). Der Schnappschuss trägt den **Zustand**, nicht den Ereignisstrom; die Ereignisse unterhalb des Offsets liest er nie wieder. Daraus folgt:

> **Jede Regel dieses Dokuments muss allein aus dem materialisierten Zustand und dem eintreffenden Ereignis entscheidbar sein.** Was eine Regel braucht, steht im Zustand — oder die Regel ist nicht baubar.

Eine Regel, die einen Zwischenstand, eine Ereignisliste oder einen historischen Zeitpunkt heranzieht, liefert bei einem Client, der aus dem Schnappschuss startet, ein anderes Ergebnis als beim vollen Fold. Beide haben dieselbe Ereignismenge gesehen, ihre Zustände unterscheiden sich trotzdem — P3 fällt, und mit den Hinweisen der `zustandsHash`, an dem Auflage 18 ihr Abbruchkriterium misst. Als Eigenschaft geführt ist das **P7** (§8.1).

Die Kehrseite: **Der Zustand darf nicht mit der Zahl der Ereignisse wachsen.** Jedes Feld in §3.2, das mehr als einen Wert hält, trägt seine Schranke mit.

### §3.2 Der Zustand, vollständig

Dies ist die Quelle für die kanonische Serialisierung (KONZEPT-SPEICHER.md §7.6). Was hier nicht steht, steht in keinem Schnappschuss und geht in keinen Hash ein. `foldVersion` ist **2** (§3.9).

```ts
interface Beobachtung<T> {
  wert: T | null                  // null = bewusst geleert (§2.2a)
  hlc: Hlc
  durch?: EreignisId              // fehlt nur bei den Systemabschnitten (§5.3.4)
  /**
   * Der gesehene Vorher-Wert, in einer Hülle. Ohne sie wäre „hat `null`
   * gesehen" von „hat nichts gesehen" nach der Serialisierung nicht mehr zu
   * unterscheiden: §7.6 der Speicherschicht lässt Felder ohne Wert weg, und
   * anders als ein Zustandsfeld trägt dieser Wert keine eigene Feld-HLC, an
   * der man ihn erkennen könnte.
   */
  gesehenerVorher?: { wert: T | null }
  // Eingangsdaten der Hinweise, die sonst nicht neu berechenbar wären (§3.8):
  wanduhr?: string                // ISO-8601 des setzenden Ereignisses; fehlt nur
                                  // bei den Systemabschnitten (§5.3.4)
  fachlicheZeit?: string          // die Zeit aus §2.5, sofern die Art eine trägt
  zeitklasse?: "IST" | "PLAN"     // welche Schwelle gilt
  undoOf?: EreignisId
}

interface Feld<T> extends Beobachtung<T> { zweiter?: Beobachtung<T> }   // §3.3

/**
 * Ein Feld, dessen **erste** Beobachtung gilt (§3.3, Sammelform „Erstwert").
 * Die verdrängten stehen daneben, weil ohne sie weder der Hinweis noch die
 * Mengeneigenschaft trägt: Ein Max-2-Akkumulator verlöre bei drei Vorgängen
 * ausgerechnet den Gewinner.
 */
interface Erstwert<T> extends Beobachtung<T> { verdraengt: Beobachtung<T>[] }

/** Eine verworfene Zweitanlage — Eingangsdatum von `zweiteAnlageVerworfen`. */
interface VerworfeneAnlage { durch: EreignisId; hlc: Hlc; inhalt: unknown }

interface EinsatzZustand {
  id: Id
  angelegtDurch: EreignisId; angelegtMit: Hlc
  name: Feld<string>; art: Feld<string>; fuestName: Feld<string>
  uebergeordneteFuestName?: Feld<string>; ort?: Feld<string>
  beginn: Feld<Zeitpunkt>; schichtmodell: Feld<string>
  ende?: Feld<Zeitpunkt>                      // null = wiedereröffnet; fehlt = nie beendet
  kosten: { psaKostenProSatz: Feld<number>; vdaProTag: Feld<number>
            ukVerpflegungProTag: Feld<number>; geplanteEinsatztage: Feld<number> }
  archivierungen: { [ereignisId: string]: {
      gilt: boolean
      hlc?: Hlc; wanduhr?: string          // fehlen beim reinen Grabstein (§7.2)
      zeitpunkt?: Zeitpunkt; snapshotHash?: string
      zurueckgenommenDurch: { ereignisId: EreignisId
                              erwarteteHlc: string }[]   // nach ereignisId sortiert, §7.2
  } }
  verworfeneAnlagen: VerworfeneAnlage[]
  // abgeleitet:
  status: "AKTIV" | "BEENDET" | "ARCHIVIERT"
  archiviertDurch?: EreignisId; archiviertMit?: Hlc
}

interface AbschnittZustand {
  id: Id
  angelegtDurch?: EreignisId       // fehlt bei den Systemabschnitten (§5.3.4)
  angelegtMit: Hlc
  name: Feld<string>; typ: Feld<string>; reihenfolge: Feld<number>
  parentId?: Feld<Id>; bemerkung?: Feld<string>
  aufgeloest?: Feld<{ zielAbschnittId: Id; aufgeloestAm: Zeitpunkt }>
  verworfeneAnlagen: VerworfeneAnlage[]
  systemAbschnitt?: true                      // §5.3.4
  // abgeleitet:
  wirksamerParentId?: Id                      // §5.3.1
  zaehltInGesamtstaerke: boolean              // aus `typ`, §5.3.3
}

interface EinheitZustand {
  id: Id
  angelegtDurch: EreignisId; angelegtMit: Hlc
  abschnittId: Feld<Id>; reihenfolge: Feld<number>
  bezeichnung: Feld<string>; organisation: Feld<string>
  organisationName?: Feld<string>; hierarchie: Feld<HierarchieEbene[]>
  standortRef?: Feld<number>; fuestKennung?: Feld<string>
  ebene: Feld<string>; teilEtikett?: Feld<string>; vorlageId?: Feld<Id>
  meldungId?: Feld<Id>; einheitSchluessel?: Feld<string>
  istFuehrungDesAbschnitts: Feld<boolean>; bemerkung?: Feld<string>
  fuehrungskraft?: Feld<{ name: string; kontakte: Kontakt[] }>
  erreichbarkeitOverride?: Feld<string>; taktischesZeichen?: Feld<unknown>
  staerke: Feld<Staerke>                      // absolut; §5.4.2
  personalErfassung: Feld<string>
  status: Feld<string>; schicht?: Feld<string>
  eingetroffenAm?: Feld<Zeitpunkt>; verfuegbarBis?: Feld<Zeitpunkt>
  einsatzendeAm?: Feld<Zeitpunkt>; rueckfuehrungAm?: Feld<Zeitpunkt>
  logistik: { [feld: string]: Feld<number> }  // Override je Feld; §5.4
  sofortbedarf?: Feld<Sofortbedarf>; psaSaetzeProTag?: Feld<number>
  abgeteiltVon?: Erstwert<{ quellEinheitId: Id; abgeteilteStaerke: Staerke
                            gesehen: Staerke }>                            // §5.4.2
  aufgegangenIn?: Erstwert<{ zielEinheitId: Id; gesehen: Staerke }>        // §5.4.3
  entfernt?: Feld<boolean>                    // fehlt = nie entfernt (§2.3)
  verworfeneAnlagen: VerworfeneAnlage[]
  // abgeleitet:
  wirksamerAbschnittId: Id                    // §5.3.2, §5.3.3
  wirksameStaerke: Staerke                    // §5.4.2
  wirksamAufgegangen: boolean                 // §5.4.3, nach der Kreisauflösung
  zaehlt: boolean                             // §3.2, Absatz „Zählbarkeit"
}

interface Zustand {
  foldVersion: 2
  einsatz?: EinsatzZustand
  abschnitte:    { [id: string]: AbschnittZustand }
  einheiten:     { [id: string]: EinheitZustand }
  fahrzeuge:     { [id: string]: FahrzeugZustand }
  personen:      { [id: string]: PersonZustand }
  auftraege:     { [id: string]: AuftragZustand }
  anforderungen: { [id: string]: AnforderungZustand }
  dienstposten:  { [id: string]: DienstpostenZustand }
  schichtplan:   { [dienstpostenId: string]: { [datum: string]: Feld<string> } }
  meldungen:     { [meldungId: string]: MeldungZustand }
  anhaenge:      { [anhangId: string]: AnhangZustand }
  etbEintraege:  { [etbId: string]: EtbEintragZustand }
  hinweise: Konflikthinweis[]                 // deterministisch geordnet, §3.8
  unbekannt: { id: EreignisId; typ: string; schemaVersion: number
               hlc: Hlc; akteurBenutzer: string; akteurHost: string
               grund: "ART" | "VERSION" | "SCHEMA" }[]   // §3.7, nach `id` geordnet
  wartend: { [entitaetspfad: string]: { feld: string; beobachtung: Beobachtung<unknown> }[] }
  verworfeneSchluessel: { art: "EREIGNIS_ID" | "INHALTSSCHLUESSEL" | "RESERVIERTE_ID"
                          schluessel: string; verworfen: EreignisId
                          hlc: Hlc; inhalt: unknown }[]   // §3.6
}
```

Die übrigen Entitätsstrukturen bauen nach demselben Muster: **jede Entität trägt `angelegtDurch` und `angelegtMit`; jedes Feld, das der Katalog in §5 als Feldpfad nennt, ist ein `Feld<T>` — auch die, die nur eine Anlage setzt und die danach unveränderlich sind (`meldung.stand`, `auftrag.von`, `anhang.dateiname` und ihresgleichen); jedes Merkmal, das §5 als abgeleitet benennt, steht daneben ohne HLC.** Vollständig sind das:

* **Fahrzeug**: `typ`, `bezeichnung`, `kennzeichen`, `funkrufname`, `stanKonform`, `aenderungen`, `nutzlastText`, `status`, `taktischesZeichen`, `abschnittId`, `einheitId`, `entfernt`; abgeleitet `wirksamerAbschnittId`.
* **Person**: `nachname`, `vorname`, `rolle`, `funktionen`, `fahrerlaubnisse`, `geschlecht`, `ernaehrung`, `kontakte`, `zusatzqualifikationen`, `bemerkung`, `einheitId`, `entfernt`.
* **Auftrag**: `einheitId`, `von`, `bis`, `abschnittId`, `text`, `quelle`, `zurueckgenommen`.
* **Anforderung**: `kennung`, `abzuloesendeEinheitId`, `vorgeseheneEinheitText`, `vorgesehenerAuftrag`, `angefordertAm`, `bemerkung`, `zusage`, `erledigung`, `storno`; abgeleitet `zustand` (§5.6.2).
* **Dienstposten**: `teileinheit`, `funktion`, `schicht`, `reihenfolge`, `besetzung`, `entfernt`.
* **Meldung**: `einheitSchluessel`, `meldeStatus`, `uebernahme` (`{einheitId, uebernommeneFelder}` oder `null`), `abgelehnt`, dazu die unveränderlichen Anlagewerte `stand`, `empfangenAm`, `quelle`, `signatur`, `rohPayload`, `bogen`; abgeleitet allein `uebernahmeZustand` (§5.8.1).
* **Anhang**: `einheitId`, `dateiname`, `mimeTyp`, `groesse`, `hinzugefuegtAm`, `entfernt`.
* **EtbEintrag**: `zeitpunkt`, `text`, `bezug`, bei der Berichtigung zusätzlich `berichtigtEintragId`.

**Ein nie gesetztes Feld fehlt.** Jedes Feld, das keine Anlage belegt und das noch kein Ereignis gesetzt hat, ist **abwesend** — nicht `{wert: false, hlc: …}` mit erfundener HLC. Das betrifft `einsatz.ende`, die fünf `entfernt`, `auftrag.zurueckgenommen`, `anforderung.storno`, `zusage`, `erledigung`, `abschnitt.aufgeloest`, `einheit.abgeteiltVon` und `aufgegangenIn`. KONZEPT-SPEICHER.md §7.6 lässt Felder ohne Wert weg; ein erfundener Anfangswert stünde dagegen im Hash, und zwei Implementierungen, von denen eine ihn setzt und eine nicht, wären bei **jedem** Einsatz nicht konvergent, in dem nichts entfernt wurde — also praktisch immer.

**Zählbarkeit.** `einheit.zaehlt` ist wahr, wenn die Einheit weder entfernt noch **wirksam** aufgegangen ist — maßgeblich ist `wirksamAufgegangen`, nicht das blosse Vorhandensein von `aufgegangenIn`; bei einem Kreis (§5.4.3) und bei unbekanntem Ziel (§5.4.2a) bleibt die Einheit eigenständig und zählt **und** ihr `wirksamerAbschnittId` auf einen Abschnitt mit `zaehltInGesamtstaerke` zeigt. `abschnitt.zaehltInGesamtstaerke` folgt aus **seinem eigenen** `typ` nach ZDM §2.4; ein **unbekannter** Typ zählt wie `EINSATZORT`, also **mit** (§5.3.3). **Der Typ des Elternabschnitts wirkt nicht mit** — ein `EINSATZORT` unter einem `ANGEFORDERT` zählt. Das ist ein Startwert (S11) und beantwortet die offene Frage 3 aus ZDM §2.4 Nr. 6 vorläufig mit „nein, nicht vererben": Vererbung liefe über `wirksamerParentId`, also über das Ergebnis der Zyklusauflösung aus §5.3.1, und machte die Zählbarkeit von einer zweiten Ableitung abhängig. Fällt die Antwort anders aus, ist das eine Änderung an einer Foldregel und kostet eine `foldVersion` (§3.9). Damit hängt die Zählbarkeit an genau einer Stelle statt an dreien.

**Jede Liste im Zustand hat eine festgelegte Ordnung.** Sie geht in die kanonische Serialisierung ein, und §7.6 der Speicherschicht ordnet **Objektschlüssel**, nicht Listenelemente — eine in Eintreffreihenfolge gefüllte Liste ließe zwei gesunde Clients im roten Ausgang landen. Verbindlich: `Erstwert.verdraengt`, `verworfeneAnlagen`, `verworfeneSchluessel` und `wartend` **nach HLC, bei Gleichstand nach Ereignis-Id, bei Gleichstand auch dort nach der kanonischen Serialisierung des Eintrags** — der dritte Schlüssel ist nicht überflüssig, denn genau im Zielfall der Fehlerinjektion (geklontes Profil, §3.5) sind HLC **und** Ereignis-Id beider Einträge gleich; `hinweise` nach ihrer kanonischen Serialisierung (so schon in M0.2); `archivierungen[].zurueckgenommenDurch` nach Ereignis-Id; die Listenfelder der Fachdaten (`hierarchie`, `kontakte`, `funktionen`, …) in der Reihenfolge, in der das Ereignis sie geliefert hat — sie sind **ein** Wert (§3.4) und werden nicht umsortiert.

**Sechs Schranken, damit der Zustand nicht mit der Akte wächst:**

1. **`zweiter`** ist eine zusätzliche Beobachtung je Feld — der Zustand verdoppelt sich je Feld, er wächst nicht mit der Zahl der Ereignisse.
2. **`verworfeneAnlagen`** je Entität und **`verworfeneSchluessel`** global wachsen mit der Zahl doppelt vergebener Ids. Im Normalbetrieb ist sie null; sie entsteht nur bei geklontem Profil oder Migrationsfehler. Benannt in §8.2.
3. **`archivierungen`** hat einen Eintrag je Archivierungsereignis **und** je Rücknahme, die eine unbekannte Archivierung benennt (§7.2). Ein Einsatz wird ein- bis zweimal archiviert; eine Rücknahme auf eine Id, die es nie geben wird, hinterlässt einen Eintrag. Benannt in §8.2.
4. **`wartend`** hält Beobachtungen zu noch nicht angelegten Entitäten, je Feldpfad so viele, wie seine Aufnahmeoperation vorsieht (§3.3). Es wächst mit der Zahl der Entitäten, deren Anlage aussteht — und die ist **nicht** beschränkt, wenn eine Anlage nie kommt (verlorenes Segment, Quarantäne). Benannt in §8.2.
5. **Die `verdraengt`-Listen der beiden Erstwert-Felder** wachsen mit der Zahl wiederholter Vorgänge an derselben Entität — im Normalbetrieb null.
6. **Alles Übrige** ist genau ein Wert je Feld je Entität.

**Abgeleitete Felder gehen in die kanonische Serialisierung ein.** Sie sind kein zweiter Zustand: Jeder Client leitet sie aus derselben Grundlage gleich ab. Sie stehen im Zustand, damit ein Verbraucher sie nicht selbst berechnen muss und damit ein Fehler in der Ableitung im Konvergenzvergleich auffällt statt in der Anzeige. Die vollständige Liste: `einsatz.status`, `einsatz.archiviertDurch`, `einsatz.archiviertMit`, `abschnitt.wirksamerParentId`, `abschnitt.zaehltInGesamtstaerke`, `einheit.wirksamerAbschnittId`, `einheit.wirksameStaerke`, `einheit.wirksamAufgegangen`, `einheit.zaehlt`, `fahrzeug.wirksamerAbschnittId`, `anforderung.zustand`, `meldung.uebernahmeZustand`.

**Was ausdrücklich *nicht* im Zustand steht: alles, was aus `bogen` folgt.** `zugEtikett`, `teilEtikett`, `stammtVon` und `aufgegangenIn` der Meldung (ZDM §3.2) werden von der Oberfläche aus dem Bogen gelesen und **nicht** materialisiert. Der Grund ist der `zustandsHash`: `bogen` ist `z.unknown()`, seine Struktur gehört `@bos/eeb-format` und wird **dort** versioniert. Stünden daraus abgeleitete Werte im Zustand, hinge der Hash an der Version eines fremden Pakets, das `foldVersion` nicht berührt — zwei Clients mit verschiedenen Codec-Fassungen fielen in den roten Ausgang von §7.6 der Speicherschicht, ohne dass ein Fold-Fehler vorläge.

### §3.3 Zwei Akkumulatoren, und je Feld steht fest, welcher gilt

Der Fold kennt **zwei** Aufnahmeoperationen. Welche für ein Feld gilt, sagt seine Konfliktklasse (§3.4), und der Zustand macht es am Typ sichtbar: `Feld<T>` gegen `Erstwert<T>` (§3.2).

**`Feld<T>` — die beiden höchsten Beobachtungen.** Für alle Felder der Klassen LWW/Feld und LWW/Entität.

**`Erstwert<T>` — die kleinste Beobachtung, die übrigen als `verdraengt`.** Für die beiden Felder der Klasse Erstwert. Warum die verdrängten mitgeführt werden müssen: Bei drei Zusammenführungen derselben Quelle (HLC 5, 7, 9) hielte ein Max-2-Akkumulator 9 und 7 — der Gewinner 5 wäre verloren, und zwar in jeder Permutation und nach jedem Schnappschuss. Die Liste ist beschränkt durch die Zahl der Vorgänge an dieser Entität; sie ist im Normalbetrieb leer und in §8.2 als Wachstumspunkt geführt.

Je Feldpfad der Klasse `Feld<T>` hält der Fold die **beiden höchsten** Beobachtungen nach §3.5. Der Gewinner liefert Wert und Feld-HLC (Auflage 4); die zweithöchste ist der Wert, gegen den `gesehenerVorher` des Gewinners geprüft wird (§2.2a). Für die beiden Erstwert-Felder gilt stattdessen die Regel oben. **Beide stehen im materialisierten Zustand** — sonst erzeugte ein nach dem Schnappschuss eintreffendes Ereignis mit mittlerer HLC beim vollen Fold einen Hinweis und beim Rebase keinen.

**Warum genau zwei.** Der Zustand wächst linear in der Zahl gehaltener Beobachtungen. Zwei decken den Konflikt zweier Schreiber ab, den praktisch einzigen bei bis zu fünf Arbeitsplätzen. Drei und mehr nebenläufige Schreiber auf demselben Feld erzeugen weiterhin nur einen Hinweis — Nicht-Zusicherung, §8.2.

**Was mit der dritten Beobachtung geschieht.** Sie ist im Zustand nicht mehr sichtbar; ihr Ereignis steht in der Akte und im Einsatztagebuch, das den Ereignisstrom liest (§5.9.1).

### §3.4 Die fünf Konfliktklassen

**LWW/Feld** — skalarer Wert; zwei Clients, die verschiedene Felder ändern, verlieren nichts.
**LWW/Entität** — der Wert ist eine Struktur, die fachlich **eine** Meldung ist: Stärke-Tripel, Dienstpostenbesetzung, Sofortbedarf, `hierarchie`, `fuehrungskraft`, `funkrufname`, `taktischesZeichen`, die vier Listenfelder der Person, Zusage- und Erledigungsblock, Auflösungsziel, `meldung.uebernahme`. Ein Merge über die Bestandteile wäre nicht falsch gerechnet, sondern falsch gedacht.

**Erstwert** — die Beobachtung mit der **kleinsten** HLC gilt, die übrigen stehen als `verdraengt` daneben (§3.3). Genau zwei Felder: `einheit.abgeteiltVon` und `einheit.aufgegangenIn`. Beide beschreiben einen Vorgang, der einmal geschieht und danach nicht durch einen späteren ersetzt wird; die Begründung steht in §5.4.2 und §5.4.3. Für Anlagen gilt dieselbe Ordnung (§3.11), dort mit `verworfeneAnlagen` als Ablage.

`einsatz.archivierungen` folgt einer eigenen, engeren Regel (§7.2): `gilt` ist eine **monotone Konjunktion** über die Menge — einmal `false`, immer `false` — und braucht deshalb weder eine Auswahl noch eine Ablage verdrängter Beobachtungen.
**Additiv** — Anlage einer Entität mit eigener Id oder ein unveränderlicher Eintrag; bei Kollision §3.11.
**Regel** — fachliche Auflösung, im Katalog ausgeschrieben, entscheidet allein aus Zustand und Ereignis.

### §3.5 Ordnung: HLC, dann Ereignis-Id — in beide Richtungen

Gefaltet wird nach `hlc`, nie nach `wanduhr`. Bei gleicher HLC entscheidet die Ereignis-Id in Codepoint-Ordnung, und die Richtung ist je Regel zu nennen:

* **LWW** wählt das größte Element: bei Gleichstand gewinnt die **größere** Id.
* **Anlagen** (§3.11) und die **Erstwert-Felder** (§3.4) wählen das kleinste: bei Gleichstand gilt die **kleinere** Id. Beides sind Minimumsbildungen und tragen dieselbe Richtung — sonst entschiede ausgerechnet beim geklonten Profil die Eintreffreihenfolge darüber, in welches Ziel eine Einheit aufgeht.

Zwei verschiedene Ereignisse mit derselben HLC sind ein Protokollbruch — den erzeugt aber das geklonte Profil, dessen Injektion M0 verlangt. Ohne Tie-Break entschiede der Fold dort nach Eintreffreihenfolge und wäre ausgerechnet im Zielfall der Fehlerinjektion keine Mengenfunktion. `vergleicheBeobachtung` in `fold.ts` tut das seit M0.2 in beiden Richtungen richtig.

### §3.6 Idempotenz

**Über die Ereignis-Id.** Ein Ereignis mit bereits gefalteter `id` **und gleichem Inhalt** wird verworfen, ohne Hinweis. Das ist P2.

**„Gleicher Inhalt"** heißt: gleiche kanonische Serialisierung von `typ`, `nutzlast`, `vorher` und `neu`. `wanduhr`, `akteur` und `vorgaenger` gehen **nicht** ein — sie unterscheiden sich zwischen zwei Klonen immer, und ein Vergleich, der sie einschlösse, machte aus jedem Duplikat einen Widerspruch.

**Zwei verschiedene Ereignisse mit derselben Id sind ein Protokollbruch,** kein Konflikt. §3.3 der Speicherschicht verbietet die Doppelvergabe der Laufnummer; §4.5 dort erkennt das geklonte Profil und zwingt ihm eine neue `clientId` auf. Bis das greift, kann der Bruch in der Akte stehen.

> **Regel.** Das zuerst gefaltete Ereignis gilt. Das andere geht mit `art: "EREIGNIS_ID"` in `verworfeneSchluessel` und erzeugt `ereignisIdDoppeltVergeben` mit **dem verworfenen** Inhalt.

**Nur mit dem verworfenen, nicht mit beiden.** Der Inhalt des Gewinners steht nach einem Schnappschuss nicht mehr im Zustand — es ist genau das Argument, mit dem §3.11 den Hinweis auch bei inhaltsgleichen Anlagen erzwingt. Ihn mitzuführen hieße, je gefalteter Ereignis-Id ihren Inhalt zu halten, und das verbietet §3.1.

**Diese eine Stelle ist ausdrücklich reihenfolgeabhängig, und das ist die ehrlichere Wahl.** Eine Auswahl „kleinere HLC gewinnt" wäre zwar als Mengenoperation formulierbar, aber nicht baubar: Sie müsste einen bereits gefalteten Gewinner **zurücknehmen**, sobald später ein Ereignis mit derselben Id und kleinerer HLC eintrifft — und dafür bräuchte der Zustand je gefalteter Id ihren Inhalt, also eine Struktur, die mit der Zahl der Ereignisse wächst. Das verbietet §3.1.

Die Folge ist benannt statt versteckt: **Über einer Ereignismenge mit doppelt vergebener Id gelten P1, P2 und P3 nicht** (§8.2). Der Hinweis macht die Lage sichtbar, der Konvergenzvergleich meldet sie als „nicht vergleichbar", und die Reparatur führt wie bei der Quarantäne über den Schreiber. `fold.ts` verwirft in M0.2 nach der Id ohne Hinweis und ist nachzuziehen (T107).

**Über einen fachlichen Schlüssel.** `EebMeldungEmpfangen` über `meldungId`, `AnhangHinzugefuegt` über `anhangId`. Es gilt §3.11 mit dem Schlüssel statt der Entitäts-Id; ein zweites Ereignis mit abweichendem Inhalt landet mit `art: "INHALTSSCHLUESSEL"` in `verworfeneSchluessel` und erzeugt `inhaltsschluesselWidersprochen`. In den Inhaltsvergleich gehen **nur unveränderliche Anlagewerte** ein: für die Meldung `bogen`, `stand`, `signatur` und `rohPayload` — der Rohtext gehört dazu, sonst verschwände ein abweichender Bogen, dessen abgeleitete Felder zufällig gleich sind, ohne Hinweis —, für den Anhang `dateiname`, `mimeTyp`, `groesse` und `einheitId` — dort setzt allein die Anlage, es gibt kein änderndes Ereignis. Nicht `empfangenAm`, nicht `quelle`, nicht `hinzugefuegtAm` — sie beschreiben den Empfang, nicht den Inhalt.

**`einheitSchluessel` geht ausdrücklich nicht ein,** obwohl er inhaltstragend aussieht. Er ist über `EebMeldungZugeordnet` **änderbar**, und ein Vergleich gegen ein änderbares Zustandsfeld wäre reihenfolgeabhängig: Trifft die zweite Meldung vor der Zuordnung ein, sind die Werte gleich und es entsteht kein Eintrag; trifft sie danach ein, entsteht einer. `verworfeneSchluessel` steht im Zustand und im `zustandsHash` — P1 und P3 fielen über einer vollkommen gesunden Ereignismenge. Gegen die **Nutzlast** der geltenden Anlage zu vergleichen, wäre keine Abhilfe: Sie steht nach einem Schnappschuss nicht mehr im Zustand (§3.1), genau das Argument aus §3.11. Prüffall T142.

**`art` unterscheidet die drei Quellen.** Aus `verworfeneSchluessel` speisen sich drei Hinweisarten: `ereignisIdDoppeltVergeben` und `inhaltsschluesselWidersprochen` hier, `reservierteIdVerworfen` in §5.3.4. Ohne den Diskriminator müsste ein Client sie an der Form des Schlüssels erraten — `"AUFFANG"` gegen Inhalts-Hash gegen `clientId:laufnummer` —, und zwei Implementierungen rieten verschieden: verschiedene Hinweise, verschiedener `zustandsHash`, roter Ausgang ohne Fold-Fehler. Prüffall T136.

**Über den Fachvorgang.** Aufteilen und Zusammenführen sind zusätzlich über die **Entität** idempotent, auf der ihr Ergebnis steht — nicht über die Ereignis-Id (§5.4.2, §5.4.3). Das ist der Grund, weshalb es kein Änderungsbuch mehr gibt.

### §3.7 Unbekannte Arten, Versionen, Felder — und unbekannte Werte

Ein Client, der etwas nicht kennt, **reicht es durch** (ZDM §4.1 Regel 4, KONZEPT-SPEICHER.md §8.7).

1. **Unbekannte Ereignisart.** Nicht gefaltet, als `unbekannt` geführt, beim Spiegeln unverändert weitergeschrieben.
2. **Bekannte Art, höhere Nutzlastversion.** Ebenso — es gibt keinen Downcaster (§4.3).
3. **Bekannte Art und Version, unbekannte Felder in der Nutzlast.** Gefaltet; die unbekannten Felder werden ignoriert und **unverändert mitgeführt**. Kein Schema ist deshalb `strict`.
4. **Ungültige Nutzlast oder ungültiger Rahmen** — fehlendes Pflichtfeld, falscher Typ, ein `neu` an einer Anlage, ein fehlendes `neu` an einem setzenden Ereignis (§2.2). Behandlung wie 1, mit dem Zusatz „entspricht nicht dem Schema". Der Fold rät nicht und stürzt nicht ab.
5. **Unbekannter Wert in einem offenen Wertebereich.** Gefaltet, gespeichert, unverändert angezeigt, dazu `unbekannterWert`.

**Die offenen Wertebereiche und ihr Rückfall.** Fünf sind offen: `status`, `schicht`, `organisation`, `ebene`, `typ` des Abschnitts. Ihr Schema ist `z.string().min(1)`, die bekannten Werte stehen als Liste in `@s1/domaene`. Begründung: Wären sie geschlossen, machte ein Client, der einen zehnten Statuswert schreibt, bei jedem älteren Client die **ganze Nutzlast** ungültig — bei `EinheitGemeldet` fehlte die Einheit samt Stärke, und jede Änderung an ihr erzeugte `anlageFehlt`. Eine Einheit aus der Lage zu verlieren, weil ein Statuswert unbekannt ist, ist der weitaus größere Schaden.

Jeder offene Bereich braucht deshalb einen **benannten Rückfall**, sonst wäre er nur eine verschobene Lücke:

| Bereich | Rückfall bei unbekanntem Wert |
|---|---|
| `status` | zählt in keinen Statuseimer, wohl aber in die Gesamtstärke; die Auswertung weist ihn getrennt aus, wie `Status!G36` es tut |
| `schicht` | zählt in keinen Schichteimer, sonst wie oben |
| `organisation` | eigene Zeile in der Organisationsmatrix, Anzeige des Rohwerts; Farbe grau |
| `ebene` | wie `UNBESTIMMT`: kein Größenpunkt im Zeichen |
| `typ` des Abschnitts | **zählt wie `EINSATZORT`** — also mit, mit Schicht als Pflicht und im Druck sichtbar |

Der letzte ist der einzige, an dem eine Foldregel hängt (`zaehltInGesamtstaerke`, §3.2), und er ist deshalb der einzige, dessen Rückfall etwas kostet: Ein unbekannter Typ zählt lieber zu viel als zu wenig. Die umgekehrte Wahl verlöre gemeldete Kräfte aus der Lage, und das ist in einer Führungsstelle der gefährlichere Fehler.

**Freie Vokabularwerte** sind eine dritte Klasse und ausdrücklich **kein** offener Wertebereich: `fahrzeug.typ`, `funkrufname.kennwort`, `hierarchieEbene.art`, `person.funktionen`, `.fahrerlaubnisse`, `.zusatzqualifikationen`, `dienstposten.teileinheit` und `.funktion`. ZDM §3.2 führt sie als `VokabularWert`, das Vokabular ist aber nach §1.2 **Stammdatum außerhalb der Akte** und wird versioniert ausgeliefert. Ein Wert außerhalb der ausgelieferten Liste ist deshalb keine Unbekanntheit, sondern eine zulässige freie Eingabe — die Excel-Praxis „FW" für vierzig Ortsfeuerwehren lebt davon. Sie erzeugen **keinen** `unbekannterWert`, und der Zustand hängt nicht an der Vokabularfassung (dieselbe Begründung wie bei `bogen`, §3.2).

**Geschlossen** bleiben die Bereiche, an denen eine Regel hängt, ohne dass ein Rückfall sinnvoll wäre: die `feld`-Auswahlen, `quelle` der Meldung, `meldeStatus`, `rolle`, `geschlecht`, `ernaehrung`, `personalErfassung`, `art` des Einsatzes, `schichtmodell`, `quelle` des Auftrags, `status` des Fahrzeugs. `uebernahmeZustand` steht **nicht** in dieser Liste, weil kein Ereignis ihn trägt — er ist abgeleitet (§5.8.1).

**Der Wertebereich hängt am Feldpfad, nicht am Ereignis.** Der Katalog nennt je Feldpfad den Typ von `neu` (§5.1); daraus weiß der Fold, ob ein Wert zu prüfen ist und gegen welche Liste.

### §3.8 Konflikthinweise: Zustand, und bei jeder Materialisierung neu gerechnet

P3 verlangt, dass zwei Clients mit derselben Ereignismenge **dieselben Hinweise** führen. Der Hinweis geht in die kanonische Serialisierung und damit in den `zustandsHash` ein.

**Die Regel, ohne Ausnahme: Hinweise werden bei jeder Materialisierung aus dem Zustand neu berechnet und nie fortgeschrieben.** Fortgeschriebene Hinweise wären falsch, sobald ein später eintreffendes Ereignis ihre Grundlage entzieht — `fremdreferenzUnbekannt` „verschwindet ohne Zutun" (§3.10), `anlageFehlt` ebenso, und ein `vorherPasstNicht` fällt weg, sobald ein drittes Ereignis den Zweitplatzierten verdrängt.

Damit das geht, muss **jedes Eingangsdatum eines Hinweises im Zustand stehen**. Das ist der Grund für sieben Angaben, die sonst niemand bräuchte: `Beobachtung.wanduhr`, `.fachlicheZeit` und `.zeitklasse` (für `meldezeitUnplausibel`), `Beobachtung.undoOf` (für `undoTrifftFremdenStand`), `angelegtDurch` je Entität sowie `verworfeneAnlagen` je Entität und `verworfeneSchluessel` global (für `zweiteAnlageVerworfen`, `reservierteIdVerworfen`, `inhaltsschluesselWidersprochen`). M0.2 hält diese Angaben im Akkumulator statt im Zustand; das ist die Änderung, die `foldVersion 2` unter anderem trägt.

| Art | Bedeutung | § |
|---|---|---|
| `vorherPasstNicht` | gesehener Vorher-Wert passt nicht zur verdrängten Beobachtung | §2.2a |
| `ohneVorherWertVerdraengt` | Gewinner führte keinen Vorher-Wert und verdrängt trotzdem | §2.3 |
| `zweiteAnlageVerworfen` | zweite Anlage derselben Id, mit ihrem Inhalt | §3.11 |
| `reservierteIdVerworfen` | Anlage auf `AUFFANG` oder `ARCHIV` | §5.3.4 |
| `inhaltsschluesselWidersprochen` | gleicher fachlicher Schlüssel, abweichender Inhalt | §3.6 |
| `ereignisIdDoppeltVergeben` | zwei verschiedene Ereignisse mit derselben Id | §3.6 |
| `anlageFehlt` | Beobachtungen liegen vor, die Anlage der Entität fehlt | §3.10 |
| `fremdreferenzUnbekannt` | ein Feld verweist auf eine Entität, die es (noch) nicht gibt | §3.10 |
| `abschnittUnbekannt` | die Einheit zeigt auf einen unbekannten Abschnitt, sie liegt im Auffang | §5.3.3 |
| `abschnittAufgeloest` | die Einheit wurde in einen aufgelösten Abschnitt gelegt und steht im Ziel | §5.3.2 |
| `zyklusAufgeloest` | eine Umhängung hätte einen Zyklus erzeugt | §5.3.1 |
| `staerkeGeklemmt` | die wirksame Stärke wäre negativ geworden | §5.4.2 |
| `aufteilungKreis` | zwei Einheiten wären auseinander hervorgegangen | §5.4.2a |
| `entfernungNimmtZugewachsenes` | eine entfernte Einheit trug Zuwachs oder war selbst aufgegangen; beides fällt mit ihr aus der Lage | §5.4.2a |
| `vorgangSummeWeichtAb` | die gesehene Quellstärke passt nicht zur berechneten | §5.4.3 |
| `zusammenfuehrungKreis` | zwei Einheiten wären ineinander aufgegangen | §5.4.3 |
| `moeglicheDublette` | mehrere Entitäten mit demselben fachlichen Schlüssel | §5.4.4 (Einheit), §5.6.1 (Anforderung) |
| `meldezeitUnplausibel` | fachliche Zeit weicht über der Schwelle ihrer Klasse ab | §2.5 |
| `unbekannterWert` | Wert außerhalb der bekannten Liste eines offenen Bereichs | §3.7 |
| `wirkungslosGegenTerminalzustand` | gefaltet, ändert den abgeleiteten Zustand aber nicht | §3.12 |
| `nachArchivierungEingegangen` | die Entität wurde nach der maßgeblichen Archivierung geändert | §7.3 |
| `undoTrifftFremdenStand` | ein Undo verdrängt eine Änderung, die der Bediener nicht gesehen hat | §6, U6 |

Jeder Hinweis trägt einen `feldpfad`; wo kein einzelnes Feld betroffen ist, den Pfad der Entität. Kein Hinweis ist ein Fehler.

### §3.9 `foldVersion`

Auflage 4 verlangt sie am Schnappschuss; KONZEPT-SPEICHER.md §7.3 macht sie zur harten Schranke.

**Dieses Konzept setzt `foldVersion = 2`** (M0.2 hat 1). Die Erhöhung ist zwingend: §3.2 erweitert den Zustand, §3.8 führt neue Hinweisarten ein, und ein Schnappschuss aus M0.2 trüge weder `zweiter` noch die Eingangsdaten der Hinweise.

**Regel für die Zukunft: Jede Änderung am Katalog erhöht `foldVersion`** — eine neue Ereignisart eingeschlossen, und **jede Änderung an einer der bekannten Werteliste der offenen Bereiche** ebenso. Der zweite Teil ist nicht selbstverständlich und deshalb ausgeschrieben: Ein zehnter Statuswert erzeugt bei einem Client mit der alten Liste den Hinweis `unbekannterWert` und bei einem mit der neuen keinen. Hinweise gehen in den `zustandsHash` (§3.8) — zwei Clients hätten bei identischer Ereignismenge identische Versionsvektoren und verschiedene Hashes, also den roten Ausgang. Für die Nutzlast bleibt der neue Wert gültig (`schemaVersion` steigt nicht, §4.4); vergleichbar sind die Zustände erst wieder, wenn beide Clients dieselbe Liste haben — und genau das sagt eine unterschiedliche `foldVersion` aus. Die erste Fassung dieses Konzepts nahm eine neue Art aus, weil ein alter Client sie ohnehin nicht faltet. Das ist falsch, und zwar an der Stelle, an der es am teuersten ist: Zwei Clients verschiedener Programmversionen mit **derselben** Ereignismenge haben dann identische Versionsvektoren, aber verschiedene Zustände — der eine faltet die neue Art, der andere führt sie unter `unbekannt`. §7.6 der Speicherschicht ordnet das als „Fehler, der rote Ausgang, an dem M0 abbricht" ein, ohne dass er von einem echten Fold-Fehler zu unterscheiden wäre. Weil `mindestClientVersion` nach §8.7 dort ausdrücklich **Warnung und keine Sperre** ist, ist der gemischte Betrieb der geplante Normalfall und nicht der Ausnahmefall.

### §3.10 Fremdreferenzen: die wartende Beobachtung

Ein Ereignis kann auf eine Entität verweisen, die dieser Client noch nicht hat. Das ist der Normalfall in einem verteilten Protokoll und braucht **eine** Regel statt einer Auslegung je Aufrufstelle.

**Die eigene Anlage fehlt.** Beobachtungen zu dieser Entität stehen unter `wartend` und wirken unverändert, sobald die Anlage eintrifft. Solange sie fehlt: Die Entität erscheint **nicht** in ihrer Datensammlung und zählt nirgends — eine Schattenentität mit erfundenen Pflichtfeldern wäre eine Tatsachenbehauptung. Es entsteht **ein** `anlageFehlt` je Entität **mit den Ids der Beobachtungen, die `wartend` hält** — nicht mit denen aller je eingetroffenen. Der Unterschied ist zu benennen, weil `wartend` je Feldpfad nur so viele Beobachtungen hält, wie die Aufnahmeoperation seiner Klasse vorsieht: Bei drei `StaerkeGeaendert` auf eine fehlende Einheit steht die dritte nirgends mehr, und ein Client aus einem Schnappschuss könnte ihre Id nicht nennen. Nennte der Hinweis sie trotzdem, hinge sein Inhalt daran, ob dieser Client voll gefaltet oder geladen hat — P7 fiele, und der Hinweis geht in den `zustandsHash`. Dass der Hinweis die Zahl der wartenden Ereignisse nicht vollständig wiedergibt, führt §8.2 als Nicht-Zusicherung. Prüffall T144. Aufgenommen wird wie sonst — je Feldpfad nach der Aufnahmeoperation seiner Klasse (§3.3), für die beiden Erstwert-Felder also die kleinste plus die verdrängten. Ohne diese Unterscheidung verlöre eine Zusammenführung auf eine noch nicht angelegte Quelle beim Eintreffen der Anlage ihren Gewinner, sobald drei Vorgänge warten.

**Ein Feld verweist auf eine fehlende Entität** (`Person.einheitId`, `Fahrzeug.einheitId`, `Auftrag.einheitId`, `Anforderung.abzuloesendeEinheitId`, `EtbEintrag.bezug`, `Meldung.uebernahme.wert.einheitId`, `Anhang.einheitId`). Das Feld wird **gefaltet und behalten** — der Verweis ist der gemeldete Wert —, die Entität erscheint, und es entsteht `fremdreferenzUnbekannt`. Der Hinweis verschwindet ohne Zutun, sobald die verwiesene Entität eintrifft (§3.8).

**Warum zwei Behandlungen.** Ohne eigene Anlage gibt es die Entität nicht; sie zu zeigen hieße, ihre Pflichtfelder zu erfinden. Ein unbekannter Verweis macht die Entität dagegen nicht ungültig — eine Person ohne bekannte Einheit ist eine reale Meldung.

**Die strukturellen Arten setzen nur auf Entitäten ab, die es gibt oder die sie selbst anlegen.** `EinheitAufgeteilt` legt die neue Einheit selbst an; `EinheitZusammengefuehrt` schreibt auf die **Quelle**. Beides sind Felder je einer Entität und fallen unter die Fälle oben. Nur die übernommenen Fahrzeuge und Personen einer Aufteilung (§5.4.2) können unbekannt sein — für sie gilt `wartend` wie für jedes andere Feld. Ein Summand an einer noch nicht angelegten Entität, den `wartend` nicht aufnehmen könnte, entsteht nach §5.4.2 nicht mehr: Die Wirkung steht immer auf der Entität, die das Ereignis selbst beschreibt.

**Die beiden Verweise *im Wert* dieser Felder sind davon nicht erfasst** und brauchen eine dritte Behandlung: `aufgegangenIn.wert.zielEinheitId` und `abgeteiltVon.wert.quellEinheitId` betreffen nicht den Träger des Feldes — der ist da —, sondern die Gegenseite einer Rechnung. Die Aufzählung oben nennt sie deshalb nicht; ihre Regel steht in **§5.4.2a**, und ohne sie verschwände beim unbekannten Ziel einer Zusammenführung die Stärke der Quelle ohne jeden Hinweis. Beide erzeugen `fremdreferenzUnbekannt`.

**Die einzige Ausnahme ist der Abschnitt einer Einheit** (§5.3.3): Dort tritt der Auffang an die Stelle des Verweises, damit die Stärke einer real gemeldeten Einheit nicht aus der Gesamtstärke fällt. Das ist eine Zusicherung über Zahlen, keine über Verweise.

### §3.11 Zwei Anlagen derselben Id: die kleinste HLC gilt

Liegen zwei Anlagen derselben Entitäts-Id vor, gilt die mit der **kleinsten** HLC (bei Gleichstand die kleinere Id, §3.5); jede weitere geht in `verworfeneAnlagen` und erzeugt `zweiteAnlageVerworfen` mit ihrem Inhalt und der Id der geltenden (`angelegtDurch`, §3.2).

> **Die verdrängte Anlage belegt keinen Feldpfad.** Sie nimmt an keiner Feldauswahl teil; ihr Inhalt steht allein in `verworfeneAnlagen` und im Hinweis. Der Satz ist nötig, weil die naheliegende Gegenlesart — „eine Anlage ist eine Menge von Beobachtungen, also fallen ihre Felder in die gewöhnliche LWW-Auswahl" — Kräfte aus dem Nichts schafft: U (0/0/10) wird um 0/0/3 nach V abgeteilt (HLC 100), der Meldekopf meldet V eigenständig mit 0/0/9 nach (HLC 150). Die Aufteilung bleibt die geltende Anlage (kleinere HLC), der Abzug wirkt nach §5.4.2a (3) — und beliefe die zweite Anlage `V.staerke` mit ihrer größeren HLC, stünden 7 + 9 = 16 in der Lage statt 10. Wer die Stärke von V wirklich korrigieren will, tut das mit `StaerkeGeaendert`; dann trägt die Meldung einen Vorher-Wert und die Gegenkorrektur an der Quelle ist die bekannte Pflicht (§5.4.3). `fold.ts` hält es seit M0.2 so; hier steht die Regel dazu. Prüffall T143.
>
> **Der Satz betrifft den Anlageteil, nicht das ganze Ereignis.** `EinheitAufgeteilt` ist nach §2.2 zugleich Form (b) und Form (c). Verliert sein **Anlageteil** gegen eine frühere Anlage derselben Id, wirkt sein **(c)-Teil weiter**: `abgeteiltVon` der neuen Einheit wird gesetzt — es ist kein Nutzlastfeld der Anlage, sondern die Wirkung des Vorgangs — und die `einheitId` der übernommenen Fahrzeuge und Personen ebenso; jene Entitäten haben mit der Kollision nichts zu tun. Andernfalls liefe §5.4.2a (3) leer (ein `abgeteiltVon` der verdrängten Anlage gäbe es dann gar nicht), §3.12 könnte seinen Satz „neben einer verdrängten Aufteilung steht zusätzlich `zweiteAnlageVerworfen`" nicht erfüllen, und die Fahrzeuge blieben bei der Quelle, obwohl sie tatsächlich mitgegangen sind. Der Abzug ist dann nach (3) unwirksam. **Ein zusätzlicher `wirkungslosGegenTerminalzustand` entsteht dabei nicht** — §3.12 zählt seine Stellen abschließend auf, und diese ist keine davon; `zweiteAnlageVerworfen` beschreibt die Lage vollständig, und der (c)-Teil war nicht wirkungslos, er hat die Fahrzeuge bewegt. Prüffall T146.

**Die beiden Inhaltsschlüssel-Arten sind ausgenommen.** `EebMeldungEmpfangen` und `AnhangHinzugefuegt` stehen unter den dreizehn Anlagearten, folgen aber §3.6: Bei **gleichem** Inhalt entsteht kein Hinweis und kein Eintrag (T52, T54), bei abweichendem `inhaltsschluesselWidersprochen` und ein Eintrag in `verworfeneSchluessel` statt in `verworfeneAnlagen`. Die Begründung des nächsten Absatzes trägt für sie nicht: Ihre inhaltstragenden Felder sind unveränderliche Anlagewerte und stehen nach §3.2 **im Zustand** (`bogen`, `stand`, `signatur`, `rohPayload`; beim Anhang `dateiname`, `mimeTyp`, `groesse`, `einheitId`), der Vergleich überlebt also jeden Schnappschuss. Zwei Meldeköpfe, die denselben QR scannen, sind ein Alltagsvorgang und keine Lage, die jemand ansehen muss. Prüffall T147.

**Auch bei inhaltsgleichen Anlagen von Entitäten entsteht der Hinweis.** Die dritte Fassung nahm sie aus („es ist nichts verloren"), und das war nicht baubar: Der Vergleich braucht den Inhalt der **geltenden** Anlage, und der steht nach einem Schnappschuss nicht mehr im Zustand — die Felder der Entität sind inzwischen von anderen Ereignissen überschrieben, und ein fehlendes optionales Nutzlastfeld belegt nach §2.3 ohnehin keinen Pfad. Ein Client aus dem Schnappschuss käme zu einem anderen Hinweisstand als der volle Fold, und P7 fiele. Der Hinweis ist auch inhaltsgleich nicht wertlos: Zwei Clients, die dieselbe Einheit angelegt haben, ist eine Lage, die die Führungsstelle sehen soll.

`fold.ts` unterdrückt in M0.2 den Hinweis bei Inhaltsgleichheit (`// inhaltsgleich: nichts verloren, kein Hinweis`) — die Regel der dritten Fassung. **Das ist nachzuziehen** (T89), wie §3.5, §3.6 und §2.3 die übrigen Abweichungen des Standes von M0.2 benennen.

ZDM §4.2 nennt `EinsatzAngelegt` „erstes Ereignis der Akte; ein zweites wird verworfen", und „erstes" kann nicht die Ankunft meinen. Gewönne die größte HLC, überschriebe eine verspätete Zweitanlage die gesamte Arbeit zwischen beiden Anlagen — sie trägt alle Anlagefelder und keinen Vorher-Wert.

**Die dreizehn Anlagearten:** `EinsatzAngelegt`, `AbschnittAngelegt`, `EinheitGemeldet`, `EinheitAufgeteilt` (für die neue Einheit, §5.4.2), `FahrzeugAngelegt`, `PersonHinzugefuegt`, `AuftragErfasst`, `AnforderungAngelegt`, `DienstpostenAngelegt`, `EtbEintragErfasst`, `EtbEintragBerichtigt`, `EebMeldungEmpfangen` (über `meldungId`), `AnhangHinzugefuegt` (über `anhangId`).

### §3.12 Gefaltet, aber wirkungslos

An sechs Stellen wird ein Ereignis gefaltet, ohne den abgeleiteten Zustand zu ändern: ein Storno gegen eine bereits eingetroffene Anforderung und eine Zusage nach der Erledigung (§5.6.2), eine zweite Archivierung (§7.2), eine Zusammenführung, deren Quelle bereits aufgegangen ist (§5.4.3), und eine zweite Aufteilung auf dieselbe neue Einheit (§5.4.2), und eine `ArchivierungZurueckgenommen`, deren `archivierungHlc` nicht zu der **vorliegenden** Archivierung derselben Id passt (§7.2). Solange die Archivierung fehlt, entsteht **kein** Hinweis: Ein Grabstein, der auf sie wartet, und eine Rücknahme, die ins Leere geht, sind im Zustand nicht unterscheidbar, und die wartende ist der häufigere Fall.

Der Hinweis entsteht **je verdrängter Beobachtung**, nicht je Entität: Bei drei Zusammenführungen derselben Quelle stehen zwei Einträge in `verdraengt` und zwei Hinweise im Zustand. Neben einer verdrängten Aufteilung steht zusätzlich `zweiteAnlageVerworfen` (§3.11) — beide beschreiben denselben Vorgang aus zwei Blickwinkeln, der eine die verworfene Anlage, der andere den nicht wirksamen Abzug.

In allen entsteht `wirkungslosGegenTerminalzustand` mit der Ereignis-Id und dem Grund. Ohne ihn wäre die Lage von stillem Verwerfen nicht zu unterscheiden: Der Bediener hat gehandelt, das Ereignis steht in der Akte, und nichts ändert sich. Der gewöhnliche `vorherPasstNicht` greift nicht, weil das gesetzte Feld den erwarteten Wert annimmt — wirkungslos ist erst die **Ableitung** darüber.

---

## §4 Nutzlastversionen und die Upcaster-Kette

### §4.1 Eine Version je Ereignisart

`schemaVersion` ist die Version der **Nutzlast dieser Ereignisart**, beginnt bei `1` und steigt unabhängig von den anderen. Eine gemeinsame Version zwänge jede Erweiterung an einer Art jede andere in eine neue Version. Das Feld heißt `schemaVersion` und nicht `v`, weil die Speicherschicht es so führt; Befund B1.

### §4.2 Was ein Upcaster darf

Er bildet eine Nutzlast der Version `n` auf `n+1` derselben Art ab und ist **rein** (keine Uhr, kein Zufall, kein Dateisystem), **zustandsblind** (weder gefalteter Zustand noch andere Ereignisse — sonst hinge das Ergebnis von der Reihenfolge ab, in der die Ereignisse durch ihn laufen) und **rahmenblind** (er arbeitet allein auf `nutzlast`).

Erlaubt: umbenennen; zerlegen, wenn die Zerlegung allein aus dem alten Wert folgt; ergänzen, wenn der Wert **aus der Nutzlast selbst** folgt; entfernen. Verboten: ein Pflichtfeld mit einem erfundenen Vorgabewert füllen. Lässt sich der Wert nicht ableiten, bleibt das Feld **optional** — für immer.

### §4.3 Die Kette, und was mit einer höheren Version geschieht

Beim Lesen läuft eine Nutzlast der Version `n < k` durch die Upcaster `n → … → k` und wird danach gegen das Schema von `k` geprüft. **Keinen Downcaster:** Version `> k` fällt unter §3.7 Punkt 2. Der Upcaster läuft **beim Lesen, nie beim Schreiben** (das Protokoll ist append-only) und **nicht beim Spiegeln** — dort werden die Originalbytes weitergeschrieben, sonst hinge der Inhalt der Akte davon ab, wer gespiegelt hat, und die Hash-Kette bräche.

### §4.4 Startzustand

**Alle Arten stehen bei `schemaVersion = 1`;** die Kette ist leer. Das gilt auch gegenüber M0.2, obwohl `EinheitGemeldet` dort weniger Pflichtfelder hatte (`hierarchie`, `reihenfolge`, `istFuehrungDesAbschnitts` kommen hinzu): Die Akten aus M0 sind Simulationsdaten und werden nicht weitergeführt — es gibt keinen Bestand, für den ein Upcaster nötig wäre. Ein M0.2-Ereignis fiele nach §3.7 Punkt 4 unter „ungültige Nutzlast"; das ist richtig so und keine Lücke. Ein neuer **Wert** in einem offenen Bereich erhöht die Version nicht — das ist ihr Sinn. Ein neues **optionales** Feld ebenso wenig (§3.7 Punkt 3). Ein neues **Pflichtfeld** erhöht sie. Unabhängig davon erhöht jede Katalogänderung `foldVersion` (§3.9); die beiden Zahlen messen Verschiedenes: `schemaVersion` die Lesbarkeit einer Nutzlast, `foldVersion` die Vergleichbarkeit zweier Zustände.

---

## §5 Der Katalog

### §5.1 Lesart und gemeinsame Bausteine

Jede Gruppe bringt ihre Nutzlastschemata, danach eine Tabelle mit fünf Spalten:

* **Typ** — der Wert des Rahmenfelds `typ`.
* **Form** — (a), (b) oder (c) nach §2.2.
* **Feldpfad / Wert** — das gesetzte Zustandsfeld und der Typ von `neu`. Bei Anlagen: „Anlage", die belegten Pfade stehen in §2.3.
* **Klasse** — eine der fünf aus §3.4.
* **Undo** — die Klasse aus §6 U2 und das benannte Gegenereignis.

Die Schemata beschreiben **nur `nutzlast`**; der gesetzte Wert steht bei Form (a) im Rahmen. Kein Schema ist `strict`. `grund` steht in §2.4.

```ts
const zId          = z.string().min(1).max(200)
const zZeitpunkt   = z.string().datetime({ offset: true })
const zDatum       = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const zAnzahl      = z.number().int().nonnegative()
const zText        = z.string()
const zPflichttext = z.string().min(1)
const zStaerke     = z.object({ fuehrer: zAnzahl, unterfuehrer: zAnzahl, mannschaft: zAnzahl })

// Offene Bereiche (§3.7 Punkt 5): Zeichenkette, bekannte Werte als Liste.
const zStatus = zPflichttext; const zSchicht = zPflichttext
const zOrganisation = zPflichttext; const zEbene = zPflichttext
const zAbschnittstyp = zPflichttext

// Geschlossene Bereiche: an ihnen hängt eine Regel ohne sinnvollen Rückfall.
const zEinsatzArt    = z.enum(["EINSATZ", "UEBUNG", "VERANSTALTUNG"])
const zSchichtmodell = z.enum(["ZWEI_SCHICHT", "DREI_SCHICHT"])
const zRolle         = z.enum(["FUEHRER", "UNTERFUEHRER", "MANNSCHAFT"])
const zGeschlecht    = z.enum(["MAENNLICH", "WEIBLICH", "DIVERS"])
const zErnaehrung    = z.enum(["FLEISCH", "VEGETARISCH", "VEGAN"])
const zPersonalErf   = z.enum(["VOLLSTAENDIG", "NUR_STAERKE"])
const zMeldeStatus   = z.enum(["ANWESEND", "ABGERUECKT", "AUFGEGANGEN"])
const zMeldeQuelle   = z.enum(["SCAN","MANUELL","PDF_IMPORT","AUFTEILUNG","ZUSAMMENFUEHRUNG"])
const zAuftragQuelle = z.enum(["MANUELL", "BEWEGUNG", "EEB"])
const zFahrzeugStatus = z.enum(["EINSATZBEREIT", "NICHT_EINSATZBEREIT"])

const zKontakt = z.object({ art: z.enum(["MOBIL","FESTNETZ","EMAIL"]),
                            dienstlich: z.boolean(), wert: zPflichttext })
const zHierarchieEbene = z.object({ art: zPflichttext, name: zPflichttext,
  kurz: zText.optional(), telefon: zText.optional(), email: zText.optional() })
const zSofortbedarf = z.object({          // ZDM §3.2, aus dem EEB
  verpflegungPersonen: zAnzahl, dieselLiter: zAnzahl, benzinLiter: zAnzahl,
  gemischLiter: zAnzahl, unterbringung: z.boolean(), ruhezeitErforderlich: z.boolean(),
})
const zZusage = z.object({ zugesagtFuer: zZeitpunkt, zugesagtVon: zPflichttext,
                           abloesendeEinheitId: zId.optional() })
const zErledigung = z.object({ erledigtAm: zZeitpunkt, abloesendeEinheitId: zId })
```

**Zur Id-Länge.** Eine Entitäts-Id ist Nutzlast aus einer fremden Datei und wird Schlüssel einer Datensammlung. `fold.ts` legt die Sammlungen ohne Prototyp an — sonst wäre eine Id `__proto__` kein Eintrag, sondern ein Aufruf des Prototyp-Setzers, und die Entität verschwände spurlos. Die Längenschranke (S7) verhindert, dass eine erfundene Id den Speicher jedes Clients füllt.

### §5.2 Einsatz

```ts
const EinsatzAngelegt = z.object({
  einsatzId: zId, name: zPflichttext, art: zEinsatzArt, fuestName: zPflichttext,
  uebergeordneteFuestName: zText.optional(), ort: zText.optional(),
  beginn: zZeitpunkt, schichtmodell: zSchichtmodell,
  kosten: z.object({ psaKostenProSatz: z.number(), vdaProTag: z.number(),
                     ukVerpflegungProTag: z.number(), geplanteEinsatztage: zAnzahl }),
})
const EinsatzStammdatenGeaendert = z.object({ einsatzId: zId,
  feld: z.enum(["name","art","fuestName","uebergeordneteFuestName","ort","beginn","schichtmodell"]) })
const KostenParameterGeaendert = z.object({ einsatzId: zId,
  feld: z.enum(["psaKostenProSatz","vdaProTag","ukVerpflegungProTag","geplanteEinsatztage"]) })
const EinsatzBeendet              = z.object({ einsatzId: zId })
const EinsatzWiedereroeffnet      = z.object({ einsatzId: zId })
const EinsatzArchiviert           = z.object({ einsatzId: zId, zeitpunkt: zZeitpunkt,
                                               snapshotHash: z.string().length(64) })
const ArchivierungZurueckgenommen = z.object({ einsatzId: zId, archivierungEreignisId: zId,
                                               archivierungHlc: zPflichttext })   // `grund` Pflicht (§2.4)
```

| Typ | Form | Feldpfad / Wert | Klasse | Undo |
|---|---|---|---|---|
| `EinsatzAngelegt` | b | Anlage | Regel §3.11 | nein |
| `EinsatzStammdatenGeaendert` | a | `einsatz/<feld>` · Typ des Feldes | LWW/Feld | frei, dieselbe Art |
| `KostenParameterGeaendert` | a | `einsatz/kosten/<feld>` · `number` | LWW/Feld | frei, dieselbe Art |
| `EinsatzBeendet` | a | `einsatz/ende` · `Zeitpunkt` | LWW/Feld | frei → `EinsatzWiedereroeffnet` |
| `EinsatzWiedereroeffnet` | a | `einsatz/ende` · `null` | LWW/Feld | — |
| `EinsatzArchiviert` | b | `einsatz/archivierungen/<eigene id>` | Regel §7 | nein |
| `ArchivierungZurueckgenommen` | b | `einsatz/archivierungen/<benannte id>` | Regel §7 | nein |

**Die Kostenparameter stehen in der Anlage** und belegen die vier Pfade `einsatz/kosten/<feld>` (§2.3) — dieselben, die `KostenParameterGeaendert` trifft. Wären sie eine Konstante im Code, hätte der Zustand einen Anfangswert ohne Ereignisquelle (§1.3 Satz 4), und `vorher` der ersten Änderung passte auf nichts. ZDM §3.2 nennt die Vorbelegungen 180/150/20/5; die Maske schlägt sie vor, geschrieben werden sie mit der Anlage (S9).

**`beginn` ist änderbar.** Ein Vertipper im Einsatzbeginn muss korrigierbar sein, und `KorrekturVon` hilft bei Anlagen nicht (§5.9.2).

**Beenden ist nicht Archivieren.** `status` ist abgeleitet: archiviert, wenn §7 es sagt; sonst beendet, wenn `ende` gesetzt ist; sonst aktiv. Kein Ereignis setzt ihn direkt.

**T1:** Zwei `EinsatzAngelegt` verschiedener HLC und Namen ⇒ der Name der kleineren HLC gilt, `zweiteAnlageVerworfen` mit dem verworfenen Inhalt. **T2:** `EinsatzBeendet` (HLC 5) und `EinsatzWiedereroeffnet` (HLC 7, `neu = null`) in beiden Permutationen ⇒ `ende` trägt `null` mit Feld-HLC 7, unterscheidbar von „nie gesetzt".

### §5.3 Abschnitt

```ts
const AbschnittAngelegt = z.object({ abschnittId: zId, name: zPflichttext,
  typ: zAbschnittstyp, parentId: zId.optional(), reihenfolge: z.number().int(),
  bemerkung: zText.optional() })
const AbschnittUmbenannt         = z.object({ abschnittId: zId })
const AbschnittTypGeaendert      = z.object({ abschnittId: zId })   // `grund` Pflicht
const AbschnittUmgehaengt        = z.object({ abschnittId: zId })
const AbschnittUmsortiert        = z.object({ abschnittId: zId })
const AbschnittBemerkungGesetzt  = z.object({ abschnittId: zId })
const AbschnittAufgeloest        = z.object({ abschnittId: zId })
const AbschnittWiederhergestellt = z.object({ abschnittId: zId })
```

| Typ | Form | Feldpfad / Wert | Klasse | Undo |
|---|---|---|---|---|
| `AbschnittAngelegt` | b | Anlage | additiv, §3.11 | strukturell → `AbschnittAufgeloest` |
| `AbschnittUmbenannt` | a | `abschnitt/<id>/name` · `string` | LWW/Feld | frei |
| `AbschnittTypGeaendert` | a | `abschnitt/<id>/typ` · offener Bereich | LWW/Feld | frei |
| `AbschnittUmgehaengt` | a | `abschnitt/<id>/parentId` · `Id \| null` | Regel §5.3.1 | frei |
| `AbschnittUmsortiert` | a | `abschnitt/<id>/reihenfolge` · `number` | LWW/Feld | frei |
| `AbschnittBemerkungGesetzt` | a | `abschnitt/<id>/bemerkung` · `string \| null` | LWW/Feld | frei |
| `AbschnittAufgeloest` | a | `abschnitt/<id>/aufgeloest` · `{zielAbschnittId, aufgeloestAm}` | LWW/Entität, Wirkung §5.3.2 | strukturell → `AbschnittWiederhergestellt` |
| `AbschnittWiederhergestellt` | a | `abschnitt/<id>/aufgeloest` · `null` | LWW/Entität | — |

**Sekundärsortierung.** Bei gleicher `reihenfolge` entscheidet die Entitäts-Id in Codepoint-Ordnung — für Abschnitte wie für Einheiten (ZDM §4.2). Ohne diese Regel hinge die Reihenfolge zweier gleichrangiger Einträge im Ausdruck an der Schlüsselreihenfolge der Datensammlung, und zwei Clients druckten Verschiedenes, obwohl ihr Zustand konvergiert.

#### §5.3.1 Regel: die Zyklusprüfung (Auflage 10)

Ein Abschnitt darf nicht sein eigener Vorfahr werden. Zwei Clients können den Zyklus gemeinsam erzeugen, ohne dass einer ihn sieht.

**Die Regel wirkt auf das abgeleitete Feld, nicht auf die Beobachtung.** `parentId` wird nach LWW gefaltet und behält seinen Gewinner samt HLC. Beim Materialisieren prüft der Fold den Wald: Liegt ein Zyklus vor, wird darin die Kante mit der **größten** HLC nicht wirksam (bei Gleichstand die mit der größeren Ereignis-Id, §3.5) — `wirksamerParentId` ist abwesend, der Abschnitt hängt an der Wurzel —, und es entsteht `zyklusAufgeloest` mit dem verdrängten Elternwert.

**Warum das abgeleitete Feld.** Setzte die Regel `parentId` selbst zurück, verlöre das Feld seine Beobachtung; eine danach eintreffende Umhängung mit kleinerer HLC gewönne gegen ein leeres Feld, und ein Client aus dem Schnappschuss käme zu einem anderen Baum als der volle Fold. **Warum die größere HLC weicht:** die jüngere Handlung, deterministisch wählbar. **Warum an die Wurzel:** Der `vorher`-Wert ist der Stand, den ein Client gesehen hat; ihn einzusetzen gäbe dem Feld einen Wert, den kein Ereignis dieser HLC gesetzt hat. Die Wurzel ist der einzige Wert, der immer existiert und keinen Zyklus schließen kann.

**Terminierung:** In einem Elternzeiger-Wald sind Zyklen knoten- und kantendisjunkt; das Lösen einer Kante erzeugt keinen neuen. Linear in der Zahl der Abschnitte.

**T3:** X unter Y (5), Y unter X (7), beide Permutationen ⇒ `wirksamerParentId` von Y abwesend, ein Hinweis. **T4:** Dreierzyklus ⇒ genau eine Kante weicht, in jeder Permutation dieselbe. **T5:** `parentId` = eigene Id ⇒ Wurzel, Hinweis. **T6 (Rebase):** T3, Schnappschuss, dann `AbschnittUmgehaengt(Y → Z, HLC 6)` ⇒ wie voller Fold.

#### §5.3.2 Regel: der aufgelöste Abschnitt

`AbschnittAufgeloest` setzt `aufgeloest` auf `{ zielAbschnittId, aufgeloestAm }`. LWW/Entität: Bei zwei nebenläufigen Auflösungen mit verschiedenem Ziel gewinnt die höhere HLC mit ihrem Ziel, und der gesehene Vorher-Wert erzeugt den gewöhnlichen Hinweis. `aufgeloestAm` ist die fachliche Zeit der Auflösung (Ist-Zeit, §2.5) und schließt die Lücke, die ZDM §3.2 mit `abschnitt.aufgeloestAm` offen ließe.

1. **Der Abschnitt bleibt im Zustand,** mit `aufgeloest` und dessen HLC.
2. **Einheiten in ihm stehen im Ziel.** `wirksamerAbschnittId` ist das Ziel — auch bei einem nebenläufigen `EinheitVerschoben` **in** diesen Abschnitt mit höherer HLC: Die Verschiebung wird gefaltet, die Wirkung ist der Weiterlauf ins Ziel, und es entsteht `abschnittAufgeloest`. Eine Einheit darf nie in einem nicht existierenden Abschnitt hängen.
3. **Ist das Ziel selbst aufgelöst, wird der Kette gefolgt.** Schließt sie einen Kreis oder endet in einem unbekannten Abschnitt, landet die Einheit im Auffang (§5.3.3), mit beiden Hinweisen. Der Abbruch bei der ersten Wiederholung macht die Verfolgung linear.

Alles, was die Kette braucht, steht im Zustand; die Regel gilt damit auch nach einem Schnappschuss.

**T7:** Einheit in A, Auflösung A → B ⇒ wirksam B. **T8:** Verschiebung nach A (9), Auflösung A → B (5) ⇒ wirksam B, `abschnittId` bleibt A, Hinweis. **T9:** A→B, B→C ⇒ C. **T10:** A→B, B→A ⇒ Auffang, zwei Hinweise. **T11:** Zwei Auflösungen von A mit Zielen B und C ⇒ Ziel der höheren HLC, `vorherPasstNicht`. **T12 (Rebase):** T9, Schnappschuss, dann `AbschnittAufgeloest(C → D)` ⇒ wie voller Fold.

#### §5.3.3 Regel: der Auffangabschnitt — und was er nicht ist (Auflage 10)

**Zwei Regeln, nicht eine:**

* **Abschnitt unbekannt** — das `AbschnittAngelegt` ist noch unterwegs. Der Zustand ist **vorläufig**: Sobald es eintrifft, steht die Einheit ohne Zutun richtig. Bis dahin Auffang, Hinweis `abschnittUnbekannt`.
* **Abschnitt aufgelöst** — eine Handlung mit **benanntem Ziel**. Die Einheit in den Auffang zu legen wäre eine dauerhafte Verschlechterung.

Beide teilen die Zusicherung: **Die Stärke einer real gemeldeten Einheit verschwindet nie aus der Gesamtstärke, weil ein Abschnitt fehlt.** Deshalb ist der Auffang zählend und seine Id reserviert.

**Der Preis, benannt.** Eine Einheit im Auffang zählt mit, auch wenn ihr echter Abschnitt vom Typ `ANGEFORDERT` oder `ARCHIV` ist und nach ZDM §2.4 nicht zählen würde. Trifft das `AbschnittAngelegt` ein, springt die Gesamtstärke nach unten. Das ist die Kehrseite der Zusicherung und in §8.2 geführt; die Alternative verlöre gemeldete Kräfte, und das ist der gefährlichere Fehler. Aus demselben Grund zählt ein Abschnitt mit **unbekanntem** Typ wie `EINSATZORT` (§3.7).

**Fahrzeuge gehen nicht in den Auffang.** Ein Fahrzeug hat keine Stärke; die Zusicherung greift nicht. Bei unbekanntem Abschnitt bleibt `abschnittId` gefaltet stehen, `wirksamerAbschnittId` ist **abwesend** (das Fahrzeug hängt an seiner Einheit), und es entsteht `fremdreferenzUnbekannt`. Bei aufgelöstem Abschnitt gilt dieselbe Kette wie bei der Einheit. Damit ist P5 sauber getrennt: Es spricht von Einheiten.

**T13:** `EinheitGemeldet` in Abschnitt Q ohne dessen Anlage ⇒ Auffang, Hinweis. **T14:** Plus `AbschnittAngelegt(Q)` ⇒ Einheit in Q, kein Hinweis, jede Permutation. **T15:** `FahrzeugVerschoben` in unbekannten Abschnitt ⇒ kein Auffang, `fremdreferenzUnbekannt`. **T16:** Abschnitt mit unbekanntem Typ ⇒ `zaehltInGesamtstaerke` wahr, `unbekannterWert`.

#### §5.3.4 Die beiden systemseitigen Abschnitte

Der Fold erzeugt sie ohne Ereignis. Das sind die **einzigen** zwei Ausnahmen von §1.3 Satz 4, und weil ihre Werte in den `zustandsHash` eingehen, sind sie hier vollständig festgeschrieben — sonst setzte ein Client „Archiv" und ein anderer „ARCHIV", und beide wären nicht konvergent.

```ts
const SYSTEM_HLC: Hlc = { millisekunden: 0, zaehler: 0, clientId: "system" }
// `durch` fehlt bei beiden: eine erfundene Ereignis-Id wäre eine, die
// `zerlegeEreignisId` zu Recht zurückwiese (§3.3 Speicher).

AUFFANG = { id: "AUFFANG", systemAbschnitt: true,
  name: { wert: "Auffang", hlc: SYSTEM_HLC },
  typ:  { wert: "EINSATZORT", hlc: SYSTEM_HLC },
  reihenfolge: { wert: 0, hlc: SYSTEM_HLC },
  angelegtMit: SYSTEM_HLC, verworfeneAnlagen: [], zaehltInGesamtstaerke: true }

ARCHIV = { id: "ARCHIV", systemAbschnitt: true,
  name: { wert: "Einsatz beendet", hlc: SYSTEM_HLC },
  typ:  { wert: "ARCHIV", hlc: SYSTEM_HLC },
  reihenfolge: { wert: 999999, hlc: SYSTEM_HLC },
  angelegtMit: SYSTEM_HLC, verworfeneAnlagen: [], zaehltInGesamtstaerke: false }
```

`name` des Archivs folgt der Excel (`Stärke!B431` „Kopier Bereich für ‚Einsatz beendet'"); `reihenfolge` setzt es ans Ende jeder Sortierung. Beide Ids sind **reserviert**: Eine Anlage darauf wird verworfen und erzeugt `reservierteIdVerworfen`. Ohne die Reservierung könnte eine Anlage dem Auffang einen nicht zählenden Typ geben, und die Stärke jeder dort liegenden Einheit verschwände. **Die verworfene Anlage landet mit `art: "RESERVIERTE_ID"` in `verworfeneSchluessel`,** nicht in `verworfeneAnlagen` des Systemabschnitts — dessen Felder sind hier festgeschrieben und bleiben es, sonst wären zwei Clients mit verschiedenen Fehlversuchen nicht mehr konvergent.

| Invariante ZDM §3.2 | Behandlung |
|---|---|
| (a) genau ein `ARCHIV`, systemseitig, nicht löschbar | oben |
| (b) höchstens ein `FUEHRUNGSSTELLE` ohne `parentId` | **nicht erzwungen** — zwei Clients können nebenläufig je eine anlegen, und ein Verwerfen wäre stilles Verwerfen. Anzeigefrage, keine Foldregel |
| (c) kein Zyklus | §5.3.1 |
| (d) ein aufgelöster Abschnitt enthält keine Einheiten | §5.3.2 über `wirksamerAbschnittId` |

**T17:** `AbschnittAngelegt` auf `AUFFANG` bzw. `ARCHIV` ⇒ verworfen, Hinweis, Werte unverändert. **T18:** Zwei Clients ohne gemeinsame Ereignisse haben für beide Systemabschnitte denselben Teilhash.

### §5.4 Einheit

```ts
const zEinheitAnlage = z.object({
  abschnittId: zId, bezeichnung: zPflichttext, organisation: zOrganisation,
  organisationName: zText.optional(), hierarchie: z.array(zHierarchieEbene),
  standortRef: z.number().int().optional(), fuestKennung: zText.optional(),
  ebene: zEbene, staerke: zStaerke, personalErfassung: zPersonalErf,
  status: zStatus, schicht: zSchicht.optional(), reihenfolge: z.number().int(),
  istFuehrungDesAbschnitts: z.boolean(), bemerkung: zText.optional(),
  teilEtikett: zText.optional(), vorlageId: zId.optional(),
  meldungId: zId.optional(), einheitSchluessel: zText.optional(),
})
const EinheitGemeldet = zEinheitAnlage.extend({ einheitId: zId })

const EinheitStammdatenGeaendert = z.object({ einheitId: zId, feld: z.enum([
  "bezeichnung","organisation","organisationName","hierarchie","ebene","fuestKennung",
  "bemerkung","teilEtikett","fuehrungskraft","erreichbarkeitOverride","taktischesZeichen",
  "istFuehrungDesAbschnitts","standortRef","personalErfassung","einheitSchluessel"]) })
const StaerkeGeaendert  = z.object({ einheitId: zId, meldezeit: zZeitpunkt.optional() })
const StatusGesetzt     = z.object({ einheitId: zId })
const SchichtGesetzt    = z.object({ einheitId: zId })
const ZeitpunktGesetzt  = z.object({ einheitId: zId,
  feld: z.enum(["eingetroffenAm","verfuegbarBis","einsatzendeAm","rueckfuehrungAm"]) })
const EinheitVerschoben = z.object({ einheitId: zId, kommentar: zText.optional() })
const EinheitUmsortiert = z.object({ einheitId: zId })
const EinheitArchiviert = z.object({ einheitId: zId })
const LogistikGesetzt   = z.object({ einheitId: zId, feld: z.enum(["weiblich","divers",
  "vegetarisch","vegan","uebernachtungM","uebernachtungW","uebernachtungD"]) })
const SofortbedarfGesetzt = z.object({ einheitId: zId })
const PsaBedarfGesetzt    = z.object({ einheitId: zId })

const EinheitAufgeteilt = z.object({
  quellEinheitId: zId, neueEinheitId: zId,
  neueEinheit: zEinheitAnlage,             // vollständige Anlage der abgeteilten Einheit
  abgeteilteStaerke: zStaerke,             // was der Quelle abgezogen wird (§5.4.2)
  // quellEinheitId und neueEinheitId müssen verschieden sein (§5.4.2a Nr. 4)
  gesehen: zStaerke,                       // Quellstärke, die der Bediener sah (§5.4.3)
  uebernommeneFahrzeuge: z.array(z.object({ fahrzeugId: zId,
                                            gesehenEinheitId: zId.optional() })),
  uebernommenePersonen:  z.array(z.object({ personId: zId,
                                            gesehenEinheitId: zId.optional() })),
}).refine((n) => gleich(n.abgeteilteStaerke, n.neueEinheit.staerke),
          "abgeteilteStaerke und neueEinheit.staerke müssen gleich sein (§5.4.2)")
const EinheitZusammengefuehrt = z.object({
  zielEinheitId: zId,
  quellen: z.array(z.object({ einheitId: zId, gesehen: zStaerke })).min(1),
})

const EinheitEntfernt          = z.object({ einheitId: zId })   // `grund` Pflicht
const EinheitWiederhergestellt = z.object({ einheitId: zId })
```

| Typ | Form | Feldpfad / Wert | Klasse | Undo |
|---|---|---|---|---|
| `EinheitGemeldet` | b | Anlage | additiv, §3.11 | frei → `EinheitEntfernt` |
| `EinheitStammdatenGeaendert` | a | `einheit/<id>/<feld>` · Typ des Feldes | LWW/Feld; `hierarchie`, `fuehrungskraft`, `taktischesZeichen` LWW/Entität | frei |
| `StaerkeGeaendert` | a | `einheit/<id>/staerke` · `Staerke` | LWW/Entität | frei |
| `StatusGesetzt` | a | `einheit/<id>/status` · offener Bereich | LWW/Feld | frei |
| `SchichtGesetzt` | a | `einheit/<id>/schicht` · offener Bereich | LWW/Feld | frei |
| `ZeitpunktGesetzt` | a | `einheit/<id>/<feld>` · `Zeitpunkt \| null` | LWW/Feld | frei |
| `EinheitVerschoben` | a | `einheit/<id>/abschnittId` · `Id` | Regel §5.3.2 | frei |
| `EinheitUmsortiert` | a | `einheit/<id>/reihenfolge` · `number` | LWW/Feld | frei |
| `EinheitArchiviert` | a | `einheit/<id>/abschnittId` · `"ARCHIV"` | Regel §5.3.2 | frei |
| `LogistikGesetzt` | a | `einheit/<id>/logistik/<feld>` · `number \| null` | LWW/Feld | frei |
| `SofortbedarfGesetzt` | a | `einheit/<id>/sofortbedarf` · Block | LWW/Entität | frei |
| `PsaBedarfGesetzt` | a | `einheit/<id>/psaSaetzeProTag` · `number \| null` | LWW/Feld | frei |
| `EinheitAufgeteilt` | c | neue Einheit: Anlage einschließlich `abgeteiltVon`; je übernommenem Fahrzeug `fahrzeug/<id>/einheitId` · `Id`, je Person `person/<id>/einheitId` · `Id` | Regel §5.4.2 | strukturell → `EinheitZusammengefuehrt` |
| `EinheitZusammengefuehrt` | c | je Quelle `einheit/<quellId>/aufgegangenIn` · `{zielEinheitId, gesehen}` | Regel §5.4.3 | strukturell → `EinheitAufgeteilt` |
| `EinheitEntfernt` | a | `einheit/<id>/entfernt` · `true` | LWW/Feld, Wirkung §5.4.5 | frei → `EinheitWiederhergestellt` |
| `EinheitWiederhergestellt` | a | `einheit/<id>/entfernt` · `false` | LWW/Feld | — |

**`einsatzendeAm` beim Archivieren.** `EinheitArchiviert` verschiebt nur; das fachliche Einsatzende ist ein eigenes `ZeitpunktGesetzt`. Zwei Werte in einem Ereignis wären zwei Konflikte in einem.

**`PsaBedarfGesetzt` bleibt eine eigene Art** (ZDM §4.2), obwohl `psaSaetzeProTag` auch über `EinheitStammdatenGeaendert` erreichbar wäre. Eine Zusammenlegung wäre unschädlich — dieselbe Klasse, dasselbe Feld —, aber ein Ereignis dieser Art aus einer Migration oder einem neueren Client fiele dann unter „unbekannte Art" und würde nicht gefaltet: Der PSA-Bedarf verschwände aus der Kostenrechnung, und niemand fände die Ursache im Katalog.

#### §5.4.1 Regel: die Stärke ist ein Tripel

LWW über das ganze Tripel, nicht je Rolle. Die drei Zahlen sind eine Meldung („0/3/17"); ein Merge aus zwei Meldungen ergäbe eine Stärke, die nie jemand gemeldet hat. Passt `vorher` nicht, entsteht `vorherPasstNicht` **mit beiden Werten**.

**T19:** Zwei `StaerkeGeaendert` verschiedener HLC, die verschiedene Rollen ändern ⇒ genau eines der Tripel, nie eine Mischung, plus Hinweis.

#### §5.4.2 Regel: Aufteilen wirkt relativ — die Wirkung steht an der neuen Einheit (Auflage 10)

`EinheitAufgeteilt` **setzt** die Quellstärke nicht, es **verringert** sie. v1 setzt absolut und wäre nebenläufig falsch: Zwei gleichzeitige Aufteilungen erzeugten beide Teile, die Quelle sänke nur einmal.

**Wo die Verringerung steht.** Nicht an der Quelle, sondern an der **neuen Einheit**: Sie trägt `abgeteiltVon = { quellEinheitId, abgeteilteStaerke, gesehen }` mit der HLC der Aufteilung. Das Feld gehört zur Klasse **Erstwert** (§3.4) — wie bei der Zusammenführung gilt der erste Vorgang, und verdrängte Beobachtungen stehen daneben. Die Quelle hat ein unverändertes `staerke`-Feld.

> **`staerke` ist die *eigene* Stärke der Einheit** — die Kräfte, die sie selbst mitbringt. Zugewachsene und abgegangene Teile stehen nicht darin.
>
> **Wirksame Stärke einer Einheit `u`** = `u.staerke.wert`
> − Σ `v.abgeteiltVon.wert.abgeteilteStaerke` über alle `v` mit `v.abgeteiltVon.wert.quellEinheitId = u`
> + Σ `v.aufgegangenIn.wert.gesehen` über alle `v` mit **wirksamem** `v.aufgegangenIn.wert.zielEinheitId = u`
> je Rolle, geklemmt bei 0. **Ohne jede Bedingung an die HLC** — aber mit vier Bedingungen an die Entität, die den Summanden trägt (§5.4.2a).

**Warum ohne HLC-Bedingung.** Die zweite und dritte Fassung dieses Konzepts machten den Summanden davon abhängig, ob er jünger ist als die letzte absolute Meldung — mit der Begründung, wer nach einem Vorgang melde, habe ihn berücksichtigt. **Diese Begründung trägt nicht.** Eine HLC ist eine Linearisierung von Nebenläufigkeit; sie sagt nur „nicht kausal davor", nicht „hat gesehen". Zwei Gegenbeispiele, beide ohne verstellte Uhr:

* Client B führt X (0/0/5) in Z zusammen (HLC 200). Client C, der das noch nicht gesehen hat — §3.10 lässt diese Reihenfolge ausdrücklich zu —, bestätigt die Stärke von Z (HLC 300). Der Summand fiele aus: **fünf gemeldete Kräfte weg**, und keiner der Hinweise greift.
* Umgekehrt, mit der Fünf-Minuten-Regel aus §3.2 der Speicherschicht: Ein Client sieht die Zusammenführung auf dem Schirm, übernimmt ihre vorauslaufende HLC nicht und meldet einschließlich X mit **kleinerer** HLC. Der Summand zählte zusätzlich, und die Stärke stünde **zweimal** in der Lage.

Beide Richtungen sind derselbe Fehler: ein Stellvertreter für Kausalität, den es nicht gibt. Die Auflösung ist nicht ein besserer Stellvertreter, sondern die Frage, die sich gar nicht stellen darf. Trägt `staerke` die **eigene** Stärke, dann kann eine Meldung einen Zuwachs nie „schon enthalten" — sie beschreibt ihn nicht.

**Was das für die Bedienung heißt, und warum es hinnehmbar ist.** Die Maske zeigt die **wirksame** Stärke; das Eingabefeld ändert die **eigene**. Bei einer Einheit ohne Aufteilung und ohne Zusammenführung — dem Normalfall — sind beide gleich, und der Unterschied ist unsichtbar. Wo sie auseinandergehen, zeigt die Maske beides mit ihrer Herkunft („eigene 0/1/3, zugewachsen 0/2/6 aus zwei Zusammenführungen"), und das ist ohnehin die Auskunft, die die Führungsstelle braucht. **Die EEB-Übernahme ist die eine Stelle, an der das nicht von selbst stimmt.** Ein Erfassungsbogen beschreibt genau eine Einheit, aber er meldet den **Kopfstand im Feld** — einschließlich der Teile, die ihr in der Führungsstelle zugewachsen sind, von denen der Bogenschreiber nichts weiß. Würde eine Übernahme diesen Wert als eigene Stärke schreiben, stünde der Zuwachs zweimal in der Lage, und kein Hinweis griffe: `gesehen` der Zusammenführung stimmt, der Vorher-Wert stimmt, nichts wird negativ.

> **Regel für den schreibenden Client.** Die Übernahme des Feldes `staerke` aus einem Bogen wird nur angeboten, wenn die Einheit **weder Zuwachs noch Abgang** hat. Hat sie welche, zeigt der Feldabgleich beide Zahlen — Bogenstand und eigene Stärke — und der Bediener entscheidet, was er schreibt. ZDM §5 verlangt für die Übernahme ohnehin den „sichtbaren Feldabgleich"; hier ist er nicht Komfort, sondern Bedingung.

Der Fold kann das nicht prüfen: Ihm liegt ein gewöhnliches `StaerkeGeaendert` vor, und ob die Zahl darin eine eigene oder eine Gesamtstärke ist, steht nirgends. Die Regel bindet deshalb den Schreiber, und §8.2 führt die Lage als Nicht-Zusicherung.

**Was dadurch entfällt:** die Unterscheidung, ob eine Basisbeobachtung aus einer Anlage stammt; der Hinweis, den die vierte Fassung für den Uhrenwiderspruch eingeführt hatte; und mit ihm die dritte Bedingung von P4. Die Formel ist jetzt eine reine Summe über Mengen — kommutativ, assoziativ, idempotent und rebase-fest ohne jede Fallunterscheidung.

**Warum das die richtige Form ist — vier Eigenschaften auf einmal:**

* **Rebase-fest.** Jeder Summand steht in einem Feld einer Entität des Zustands; nichts liegt in einem Akkumulator, nichts muss ein Schnappschuss zusätzlich tragen (§3.1).
* **Idempotent über den Fachvorgang.** Jede Einheit `v` trägt **ein** `abgeteiltVon` und **ein** `aufgegangenIn`. Zwei inhaltsgleiche Aufteilungen mit derselben `neueEinheitId` sind eine Entität und damit ein Summand; zwei Clients, die dieselbe Zusammenführung schreiben, setzen dasselbe Feld. Eine Liste von Deltas könnte das nicht — sie zählte je Ereignis, nicht je Vorgang.
* **Beschränkt.** Der Zustand wächst nicht: Es kommt kein Feld hinzu, das mehr als einen Wert hält.
* **Nebenläufig richtig.** Zwei Aufteilungen derselben Quelle erzeugen zwei Einheiten, also zwei Summanden.

**Berechnung und Terminierung.** Die Summe ist **flach**: Jeder Summand ist ein fester Wert aus der Nutzlast (`abgeteilteStaerke`, `gesehen`), keine abgeleitete Größe. Es genügt ein Durchlauf, der einen Index über `abgeteiltVon.quellEinheitId` und `aufgegangenIn.zielEinheitId` aufbaut; danach ist jede Einheit in konstanter Zeit fertig. **Keine Rekursion, keine topologische Ordnung** — eine frühere Fassung ließ den Summanden die wirksame Stärke der Quelle sein und brauchte beides; seit er der gesehene Wert ist, nicht mehr. Auch die Vergleichsgröße aus §5.4.3 ist flach: der ungeklemmte Wert, der ohnehin anfällt, je Aufteilung um ihre eigene wirksame `abgeteilteStaerke` ergänzt — kein weiterer Durchlauf.

**`abgeteilteStaerke` und `neueEinheit.staerke` müssen gleich sein.** Beide stehen in der Nutzlast, und das Schema prüft die Gleichheit mit `refine`; eine Nutzlast, die sie verschieden füllt, ist ungültig (§3.7 Punkt 4). Ohne die Bindung entstünden Kräfte aus dem Nichts: Quelle minus 3, neue Einheit plus 5, und kein Hinweis, weil nichts negativ wird und `gesehen` stimmt.

Die beiden Werte bleiben trotzdem getrennt geführt, und das hat eine Folge, die benannt gehört: **Eine spätere Korrektur der Stärke an der neuen Einheit ändert den Abzug bei der Quelle nicht.** `abgeteiltVon.abgeteilteStaerke` steht fest. Wer sich beim Abteilen verzählt hat, korrigiert **beide** Seiten — an der neuen Einheit mit `StaerkeGeaendert`, an der Quelle ebenso. Das ist gewollt: Der Abzug ist die Meldung „diese drei sind gegangen", keine Rechnung, die sich nachträglich mitzieht.

**Die neue Einheit ist eine vollständige Anlage.** `neueEinheit` trägt alle Pflichtfelder aus ZDM §3.2; der aufteilende Client kennt die Quelle und füllt sie vor, der Bediener bestätigt. Ohne diese Festlegung müsste der Fold Felder von der Quelle kopieren, und **welchen Stand** er kopierte, hinge vom Zeitpunkt ab — nicht rebase-fest. `abgeteiltVonId` aus ZDM §3.2 ist damit `abgeteiltVon.wert.quellEinheitId`.

**Die übernommenen Fahrzeuge und Personen wechseln mit.** `uebernommeneFahrzeuge` und `uebernommenePersonen` setzen `fahrzeug/<id>/einheitId` beziehungsweise `person/<id>/einheitId` auf die neue Einheit — je betroffener Entität ein Feld, mit der HLC der Aufteilung und mit dem **in der Nutzlast mitgeführten** gesehenen Vorher-Wert `gesehenEinheitId`. Er steht dort und nicht im Rahmenfeld `vorher`, weil dieses einwertig ist und das Ereignis mehrere Entitäten betrifft — genau die Form (c) aus §2.2. Fehlt er, war das Fahrzeug keiner Einheit zugeordnet. Das ist der Teil, der `EinheitAufgeteilt` zu einem Ereignis der Form (c) macht (§2.2), und die Regel aus §3.10 gilt: Ist ein Fahrzeug diesem Client noch nicht bekannt, wartet die Beobachtung.

Ohne diese Festlegung wären die beiden Listen dekorativ, und die Fahrzeugzuordnung ginge bei jeder Aufteilung verloren — die stillere und deshalb wahrscheinlichere Auslegung im Code.

**Klemmen bei null.** Die Summe wird ungeklemmt gebildet; wird eine Rolle negativ, ist `wirksameStaerke` dort 0 und es entsteht `staerkeGeklemmt` mit dem rechnerischen Wert. Die Klemmung ist **je Rolle** und der letzte Schritt: Alles, was auf der Summe aufsetzt — die Vergleichsgröße aus §5.4.3 —, rechnet mit dem rechnerischen Wert.

#### §5.4.2a Wann ein Summand wirkt

Vier Bedingungen, jede aus dem Zustand entscheidbar und jede mit einem Gegenbeispiel, das sie erzwingt. Sie hängen allein an Feldern der Entität, die den Summanden trägt, und keine erweitert die Definition von `zaehlt` aus §3.2. **Keine von ihnen unterstellt der HLC Kausalität** — keine fragt „war das schon da, als jemand meldete?". Dass (4) den Kreis über die größere HLC auflöst, ist etwas anderes: eine Auswahl unter zwei gleichrangigen Kanten, die dieselbe sein muss, damit zwei Clients konvergieren (§3.5).

**(1) Ein Zuwachs wirkt nicht, wenn seine Quelle entfernt ist.** `EinheitEntfernt` nimmt nach §2.4 „etwas aus allen Summen, das jemand gemeldet hat" — bei einer Einheit, die bereits in ein Ziel aufgegangen ist, muss das Ziel entsprechend sinken. Ohne diese Bedingung bliebe eine Einheit, die es nie gab, mit ihrer Stärke in der Lage, und der Bediener sähe nach dem Entfernen mit Pflicht-Grund keine Änderung.

> **Was (1) mitnimmt, wird benannt.** Das Entfernen einer Einheit nimmt mehr aus der Lage als ihre eigenen Zahlen, und zwar in zwei Richtungen. **Nach unten:** Die entfernte Einheit kann selbst Zuwachs getragen haben — X (0/0/5) geht in Y (0/0/15) auf, Y geht in Z auf (`gesehen` 0/0/20), danach wird Y entfernt; Y's Zuwachs bei Z wirkt nach (1) nicht mehr, und mit Y's eigenen fünfzehn fallen X's fünf, die niemand entfernt hat. Transitiv zu rechnen hilft nicht: X ist aufgegangen und zählt in keiner Lesart selbst. **Nach oben:** Die entfernte Einheit kann selbst aufgegangen sein — X (0/0/5) wird entfernt und geht nebenläufig in Y auf; nach (1) fällt der Summand bei Y, und X's fünf sind aus der Lage, obwohl der zweite Bediener sie gerade übergeben hat. Das Konzept löst beides nicht arithmetisch, sondern **sichtbar**: Trägt eine entfernte Einheit wirksame Zuwächse **oder ist sie selbst wirksam aufgegangen**, entsteht `entfernungNimmtZugewachsenes` am Feldpfad `einheit/<entfernteId>/entfernt`, mit den betroffenen Ids und Zahlen — nach unten den Quellen, nach oben dem Ziel. Damit bleibt der Satz aus §1.3 gewahrt — keine gemeldete Stärke verschwindet **still** —, und die Führungsstelle sieht, dass ihr Entfernen mehr genommen hat als die Einheit, die sie im Blick hatte. Prüffall T141.

**(2) Ein Abgang wirkt weiter, auch wenn die abgeteilte Einheit entfernt ist.** Das ist kein Widerspruch zu (1), sondern dieselbe Regel: Entfernen nimmt Stärke aus der Lage. Die drei Abgeteilten sind gegangen; sie kommen nicht dadurch zurück, dass jemand ihren Eintrag entfernt.

**(3) Ein `abgeteiltVon` wirkt nur, wenn die Einheit, die es trägt, durch **dieses** Ereignis angelegt wurde.** Formal: `v.abgeteiltVon` wirkt nur, wenn `v.angelegtDurch` das Aufteilungsereignis ist. **Die Bedingung gilt allein für `abgeteiltVon`** und ist auf keinen anderen Summanden zu übertragen: Ein `aufgegangenIn` wird von einer Einheit getragen, die **nie** durch das Zusammenführungsereignis angelegt wurde, sondern immer aus einer eigenen Anlage stammt. Wer (3) allgemein läse, käme dazu, dass **kein einziger Zuwachs jemals wirkt** — jede Zusammenführung löschte die Stärke ihrer Quelle aus der Lage, und die Prüffälle der Aufteilung blieben dabei grün. Gegenbeispiel sonst: Der Meldekopf meldet die Teileinheit V direkt (HLC 50), die Führungsstelle teilt sie aus U ab (HLC 100). Nach §3.11 gilt die frühere Anlage mit ihrer eigenen Stärke, der Abzug bei U bliebe aber stehen — die Bilanz ginge auf. Die Bedingung schließt das, und `zweiteAnlageVerworfen` zeigt die Lage ohnehin an.

**(4) Kreise und Selbstbezug wirken nicht.** `quellEinheitId = neueEinheitId` ist bereits im Schema ungültig. Zeigt eine Kette von `abgeteiltVon` auf eine besuchte Einheit zurück, wirkt die Kante mit der **größeren** HLC nicht (bei Gleichstand die größere Ereignis-Id), und es entsteht `aufteilungKreis` — dieselbe Auflösung wie in §5.3.1 und §5.4.3, aus demselben Grund.

> **Gesucht wird in zwei getrennten Graphen, nicht in einem.** `abgeteiltVon` bildet den einen, `aufgegangenIn` den anderen; eine Kette, die zwischen beiden wechselt, ist **kein** Kreis. Ohne diesen Satz wäre der häufigste zusammengesetzte Vorgang der Führungsstelle einer: U wird um V abgeteilt, danach geht der Rest von U in V auf („der Zug gibt seinen Rest an den Trupp ab"). Im gemeinsamen Graphen wäre V→U→V ein Kreis, die jüngere Kante fiele, U bliebe eigenständig, und die Lage zeigte zwei Einheiten mit einem Kreis-Hinweis statt einer mit zehn Kräften. In zwei Graphen rechnet derselbe Fall richtig: `wirksame(U)` = 10 − 4 = 6, U ist aufgegangen, `wirksame(V)` = 4 + 6 = 10, ein zählendes Objekt, kein Hinweis. Die beiden Kanten bedeuten Verschiedenes — die eine zieht Kräfte ab und lässt die Einheit zählen, die andere lässt die Zahlen stehen und schaltet die Zählbarkeit ab —, und nur gleichartige Kanten können sich im Kreis widersprechen. Es gibt deshalb auch keinen gemischten Kreis und keine Frage, welcher der beiden Hinweisarten er trüge. Prüffall T139.

**Die Reihenfolge der Prüfungen steht fest: erst (3), dann (4), dann (1) und (2).**

(3) läuft **vor** der Kreissuche, weil eine Kante, die (3) fallen lässt, nie eine Wirkung hatte und deshalb auch keine wirksame aus einem Kreis schlagen darf. Beispiel: U (0/0/10) ist gemeldet (HLC 1); eine Aufteilung `V→U` (HLC 5) legt U nicht an, ihr `abgeteiltVon` ist nach (3) unwirksam; eine Aufteilung `U→V` (HLC 9) legt V an und ist wirksam. Liefe die Kreissuche zuerst, fiele die **jüngere und wirksame** Kante, und die Lage stünde bei 13 statt 10 — mit einem `aufteilungKreis`, der eine Kante benennt, die ohnehin nichts getan hätte. (3) ist rein strukturell (`angelegtDurch` gegen die Ereignis-Id) und kann, anders als `entfernt`, durch kein Ereignis an einer dritten Einheit verschoben werden; die Reihenfolge bleibt damit von der Ereignismenge unabhängig. Prüffall T140.

(1) und (2) laufen **nach** der Kreissuche, und diese läuft über alle Kanten, die (3) übrig lässt. Nicht umgekehrt, und der Unterschied ist keine Feinheit: Bei A→B (HLC 5), B→A (HLC 9) und einem `EinheitEntfernt(A)` löst die Kreissuche zuerst die Kante B→A auf, B bleibt eigenständig und zählt. Liefe (1) zuerst, wäre A's Kante schon weg, es gäbe keinen Kreis, B ginge in die entfernte A auf — und B's Stärke verschwände ohne Hinweis. Zwei Implementierungen mit verschiedener Reihenfolge hätten verschiedene Gesamtstärken **und** verschiedene Hinweismengen; P3 fiele. Die Kreisauflösung hängt allein an `abgeteiltVon`, `aufgegangenIn` und der HLC — also an nichts, was ein Ereignis an einer dritten Einheit verschieben könnte. Prüffall T132.

**Wann `aufgegangenIn` überhaupt wirksam ist.** Die vier Bedingungen betreffen den **Summanden**. Die Kante selbst hat zwei eigene, und sie gehören hierher, weil sonst Stärke ohne Hinweis verschwindet:

* **Das Ziel muss im Zustand stehen.** Kennt dieser Client `zielEinheitId` (noch) nicht, ist `aufgegangenIn` **nicht wirksam**: Die Quelle bleibt eigenständig, sie zählt weiter, und es entsteht `fremdreferenzUnbekannt` am Feldpfad `einheit/<quellId>/aufgegangenIn`. Ohne diese Regel verschwänden ihre Kräfte vollständig — sie zählte nicht mehr, und ihr Summand fände kein Ziel. Der Fall ist der Normalfall eines verteilten Protokolls: Ein Client sieht die Zusammenführung, bevor die Anlage des Ziels bei ihm ankommt. Der Hinweis verschwindet ohne Zutun, sobald sie eintrifft (§3.8), und die Stärke wandert dann von der Quelle ins Ziel.
* **Kein Kreis** — Bedingung (4) und §5.4.3, dieselbe Auflösung.

**Die Gegenrichtung braucht keine Regel.** Ist die `quellEinheitId` einer Aufteilung unbekannt, findet der Abzug keine Einheit, auf die er wirken könnte; die Summe läuft über die Einheiten des Zustands. Verloren geht dabei nichts: Die Quelle ist diesem Client noch gar nicht bekannt, ihre Stärke steht in keiner Summe, und trifft ihre Anlage ein, wirkt der Abzug. Sichtbar gemacht wird die Lage trotzdem, mit `fremdreferenzUnbekannt` am Feldpfad `einheit/<neueId>/abgeteiltVon`. Prüffall T133.

**Eine fünfte Bedingung wäre falsch, und das gehört hierher.** Der Fall, der sie nahelegt, ist: U (0/0/10) geht in Z auf, danach wird U in V (0/0/4) aufgeteilt — U zählt nicht, Z trägt U's zehn, V's vier kämen hinzu, Summe 14 statt 10. Die naheliegende Regel „die abgeteilte Einheit erbt die Nichtzählbarkeit ihrer Quelle" schafft mehr Schaden als sie heilt: Sie ist weder transitiv definierbar (eine Aufteilung aus V wüsste nichts mehr von U), sie führt die HLC-Bedingung durch die Hintertür wieder ein, die §5.4.2 gerade verworfen hat, und sie kann eine ganze Lage auf null bringen — geht der Rest einer Quelle in die eigene abgeteilte Teileinheit auf, zählte am Ende keine der beiden.

**Der Fall ist bereits abgedeckt, und zwar sichtbar.** Die Vergleichsgröße der Zusammenführung ist nach §5.4.3 die **wirksame** Stärke der Quelle; sie ist nach der Aufteilung 0/0/6 und passt nicht mehr zu `gesehen` (0/0/10). Es entsteht `vorgangSummeWeichtAb` an `einheit/U/staerke` (T126). Genau dafür trägt jene Vergleichsgröße die fremden Abgänge mit — sie ist die Stelle, an der dieser Widerspruch auffällt. Die Summe ist falsch, die Lage steht als Hinweis im Zustand, und P4 ist über solchen Mengen nach §8.1 ausdrücklich ausgesetzt. Das ist genau die Bedingtheit, die dort zugesagt ist — kein stiller Fehler, sondern zwei Meldungen, die sich widersprechen und die jemand klären muss.

**T20:** Zwei nebenläufige Aufteilungen derselben Quelle (je 0/1/3) aus 1/4/12, beide mit `gesehen` 1/4/12 ⇒ Quelle 1/2/6, zwei neue Einheiten, Gesamtstärke unverändert, jede Permutation — **und je ein `vorgangSummeWeichtAb`**, der Fehlalarm aus §5.4.3. Er setzt P4 nicht aus; die Prüfung muss auch über ihn hinweg durchlaufen. **T21:** `StaerkeGeaendert` (9) nach Aufteilung (5) ⇒ der Abzug wirkt **weiterhin**; die Meldung setzt die eigene Stärke und lässt ihn unberührt. **T22:** Aufteilung (9) nach Meldung (5) ⇒ ebenso; die Reihenfolge ändert nichts. **T23:** Abgeteilte Stärke größer als die Quelle ⇒ 0/0/0, `staerkeGeklemmt`. **T24 (Rebase):** T22, Schnappschuss, danach `StaerkeGeaendert` (3) ⇒ wie voller Fold. **T25 (Idempotenz über den Vorgang):** Zwei inhaltsgleiche `EinheitAufgeteilt` mit derselben `neueEinheitId`, verschiedene Ereignis-Ids ⇒ **ein** Abzug, Gesamtstärke unverändert.

#### §5.4.3 Regel: Zusammenführen — je Quelle, und einmalig

`EinheitZusammengefuehrt` setzt je Quelle `aufgegangenIn = { zielEinheitId, gesehen }`. Eine aufgegangene Einheit bleibt im Zustand, `zaehlt` ist falsch, ihre Zahlen stecken im Ziel (§5.4.2).

**`aufgegangenIn` ist ein Feld der Klasse Erstwert (§3.4): die kleinste HLC gilt.** Nicht die höchste, sondern die **erste** Zusammenführung gewinnt; jede weitere steht als `verdraengt` daneben und erzeugt `wirkungslosGegenTerminalzustand`. Der Zustand führt sie mit, weil ohne sie bei drei Zusammenführungen derselben Quelle der Gewinner aus dem Akkumulator fiele (§3.3).

Das ist die entscheidende Festlegung, und sie ist teuer erkauft. Mit gewöhnlichem LWW ließe sich eine Quelle **umlenken**: X geht in Z1 auf, jemand meldet Z1 danach absolut (die Meldung enthält X), und eine spätere Zusammenführung schickt X nach Z2. Z1 behielte X in seiner Basis, Z2 bekäme X als Summanden — X zählte zweimal, ohne dass ein Hinweis entstünde, weil beide Meldungen für sich stimmig sind. Mit der Monotonie kann das nicht auftreten: Was aufgegangen ist, bleibt, wo es aufging. Wer es doch bewegen will, nimmt die Zusammenführung zurück — dafür gibt es die strukturelle Rücknahme `EinheitAufgeteilt` (U2), und die ist sichtbar.

**Überlappende Quellmengen.** Führt A die Einheiten {X, Y} zusammen und B gleichzeitig {Y, Z} in ein anderes Ziel, entscheidet für Y die kleinere HLC; X geht zu A's Ziel, Z zu B's, und für Y erzeugt der Verlierer den Wirkungslos-Hinweis. Kein Summand wird doppelt gezählt und keiner verschluckt.

**Kreise und Selbstbezug.** Zeigt `aufgegangenIn` nach mehreren Schritten auf eine bereits besuchte Einheit — A→B und B→A —, ist die Kante mit der **größeren** HLC nicht wirksam (bei Gleichstand die mit der größeren Ereignis-Id, §3.5): Jene Einheit bleibt eigenständig und zählt, es entsteht `zusammenfuehrungKreis`. Dasselbe, wenn `zielEinheitId` in den eigenen `quellen` steht. Ohne die Regel wären beide Einheiten „aufgegangen", zählten nirgends, und ihre Stärke verschwände still — genau das, was §5.3.3 als tragende Zusicherung ausschließt.

**`gesehen` ist kein Vorher-Wert,** sondern eine Prüfangabe (§2.2, Form (c)): der Stand der Quelle, den der Bediener beim Vorgang sah. Einen `vorher` hat `aufgegangenIn` **nie** — Form (c) verbietet ihn im Rahmen, und §2.2a nimmt die Erstwert-Felder von der Vorher-Prüfung ausdrücklich aus.

Weicht `gesehen` ab, entsteht `vorgangSummeWeichtAb` mit beiden Zahlen am Feldpfad `einheit/<quellId>/staerke`.

> **Die Vergleichsgröße ist die wirksame Stärke der Quelle (§5.4.2), ohne die Wirkung des geprüften Vorgangs selbst.** Ausgeschrieben:
>
> | Vorgang | `gesehen` wird verglichen gegen |
> |---|---|
> | `EinheitZusammengefuehrt`, je Quelle `q` | die **rechnerische** wirksame Stärke von `q` (§5.4.2, vor der Klemmung) — unverändert, denn eine Zusammenführung verringert die Stärke ihrer Quelle nicht, sie macht sie nur unzählbar |
> | `EinheitAufgeteilt` | die **rechnerische** wirksame Stärke der Quelle **plus der eigenen** `abgeteilteStaerke`, **sofern dieser Abzug wirksam ist** (§5.4.2a) — der Stand, den die Quelle ohne diese eine Aufteilung hätte |
>
> Beide Größen stehen im Zustand und fragen nach keiner HLC.
>
> **Zurückgerechnet wird vor der Klemmung, und zwar für beide Vorgänge.** Die Summe aus §5.4.2 wird zuerst ungeklemmt gebildet; das Zustandsfeld `wirksameStaerke` klemmt sie bei 0, die Vergleichsgröße nimmt den **rechnerischen** Wert. Das ist keine zusätzliche Angabe im Zustand: Hinweise werden nach §3.8 ohnehin bei jeder Materialisierung aus dem Zustand neu gerechnet, und die flache Summe ist Teil dieser Rechnung. Bei einer geklemmten Quelle entsteht dadurch neben `staerkeGeklemmt` auch `vorgangSummeWeichtAb`, obwohl der Bediener die 0 gemeldet hat, die seine Maske zeigt. Das ist gewollt: Die Quelle ist um fünf im Minus, und beide Hinweise beschreiben denselben Widerspruch aus zwei Richtungen. Die Alternative wäre die geklemmte Größe — und die machte die Prüfung genau dort blind, wo sie gebraucht wird (T150). Sonst wäre die Prüfung gerade dort blind, wo sie gebraucht wird: Wer aus einer Einheit mit 0/0/3 achte abteilt und `gesehen` 0/0/8 einträgt, käme aus `max(3−8,0) + 8 = 8` auf Übereinstimmung und bekäme keinen Hinweis, obwohl er sich um fünf verzählt hat. Der rechnerische Wert ist ohnehin da — `staerkeGeklemmt` führt ihn mit (§5.4.2).
>
> **Zwei Fälle prüfen gar nicht.** Wirkt der Abzug nicht — weil (3) oder (4) ihn fallen lässt —, wird nichts hinzugerechnet, was nie abgezogen wurde; die Vergleichsgröße ist dann die wirksame Stärke der Quelle. Und **steht die Quelle diesem Client nicht im Zustand**, unterbleibt der Vergleich vollständig: `wirksameStaerke` ist für sie nicht definiert, und ein Hinweis, der davon abhinge, welche Ereignisse ein Client schon hat, ginge in den `zustandsHash` ein und träfe zwei gesunde Clients verschieden. Sichtbar ist die Lage über `fremdreferenzUnbekannt` (§5.4.2a). Prüffälle T124 und T133.

**Warum die Wirkung des eigenen Vorgangs herausfällt.** `gesehen` ist der Stand **vor** dem Vorgang. Eine Aufteilung verringert diesen Stand; verglichen man gegen die wirksame Stärke danach, trüge **jede fehlerfreie Aufteilung** einen Hinweis. Eine Zusammenführung verringert ihn nicht — sie setzt `aufgegangenIn` und schaltet `zaehlt` ab, die Zahlen der Quelle bleiben stehen. Für sie ist „davor" gleich „danach", und es fällt nichts heraus.

**Warum fremde Abgänge trotzdem mitzählen.** Die siebte Fassung verglich gegen `staerke.wert` plus allen Zuwachs, also **ohne jeden** Abgang, damit sich die Vergleichsgröße einer Zusammenführung durch eine spätere Aufteilung nicht verschiebt. Das war falsch, und zwar in beide Richtungen:

* X (0/0/10) wird um 0/0/3 aufgeteilt; danach geht X in Z auf. Die Maske zeigt 0/0/7, der Bediener trägt 0/0/7 ein — und bekäme einen Hinweis, weil gegen 0/0/10 verglichen würde. Trüge er stattdessen die falsche 0/0/10 ein, schwiege die Prüfung, und die Lage stünde bei 13 statt 10. **Die Prüfung feuerte bei der richtigen Eingabe und schwiege bei der falschen.**
* Umgekehrt: U (0/0/10) geht in Z auf (`gesehen` 0/0/10); **danach** teilt jemand 0/0/4 aus U ab. Die Lage trägt 14 statt 10 — und ohne die fremden Abgänge in der Vergleichsgröße entstünde kein Hinweis. Es ist genau der Fall, für den §5.4.2a **keine** fünfte Wirksamkeitsbedingung einführt, weil er hier sichtbar wird; ohne diese Größe wäre jene Begründung eine Behauptung ohne Deckung.

Die Verschiebung, die die siebte Fassung fürchtete, ist deshalb keine: Eine Aufteilung **nach** der Zusammenführung ihrer Quelle ist kein harmloser Nachzügler, sondern der Widerspruch selbst. Sie soll die Vergleichsgröße verschieben.

Damit ist die Prüfung die Bedingung von P4 für die Zusammenführung: Die Gesamtstärke bleibt genau dann erhalten, wenn jede Zusammenführung so viel ins Ziel trägt, wie ihre Quelle wirksam hatte.

**Für die Aufteilung ist die Bedingung eine andere, und sie ist nicht `gesehen`.** `abgeteilteStaerke` und `neueEinheit.staerke` sind schemaseitig gleich, Abzug und neue eigene Stärke heben sich also **im Augenblick des Vorgangs** auf. Danach nicht mehr: `abgeteiltVon.abgeteilteStaerke` steht fest, `neueEinheit.staerke` ist ein gewöhnliches Feld (§5.4.2). Ein `StaerkeGeaendert` an der abgeteilten Einheit von 0/0/3 auf 0/0/9, ohne die Gegenkorrektur an der Quelle, hebt die Gesamtstärke von 10 auf 16 — und **kein Hinweis greift**: Es gibt keine Zusammenführung, nichts wird geklemmt, und der Vorher-Wert stimmt. Der Fold kann es nicht sehen; eine Meldung „diese neun sind hier" ist von einer Korrektur nicht zu unterscheiden. Die Regel bindet deshalb wie bei der EEB-Übernahme den **schreibenden Client** (§5.4.2: „wer sich beim Abteilen verzählt hat, korrigiert beide Seiten"), und §8.2 führt die Lage als Nicht-Zusicherung. Die frühere Behauptung, eine Aufteilung könne P4 gar nicht brechen, galt nur für den Augenblick des Vorgangs.

**Der Preis: zwei nebenläufige Abgänge derselben Quelle melden sich gegenseitig.** Teilen zwei Clients gleichzeitig aus U (0/1/12) je 0/1/3 ab, sahen beide 0/1/12; die Vergleichsgröße jedes der beiden Vorgänge nimmt den Abgang des anderen mit und ergibt 0/0/9. Beide bekommen `vorgangSummeWeichtAb`. Das ist ein Fehlalarm, und er bleibt stehen: Die Frage „war der fremde Abgang schon da, als ich sah?" ließe sich nur über eine HLC beantworten — der Stellvertreter für Kausalität, den §5.4.2 verworfen hat. Der Fehlalarm ist die richtige Seite des Irrtums. Er ist sichtbar, er kostet keine Kraft, und zwei Aufteilungen derselben Quelle in derselben Minute sind eine Lage, die die Führungsstelle ohnehin ansehen soll. Die Gegenrichtung wäre ein stiller Doppelzähler.

**P4 (Summenerhaltung) hält genau dann,** wenn für jede **Zusammenführung** `gesehen` der wirksamen Stärke ihrer Quelle entspricht und nichts geklemmt wurde. Beide Ausnahmen erzeugen einen Hinweis und sind am Zustand ablesbar. Ein `vorgangSummeWeichtAb` aus einer **Aufteilung** setzt P4 **nicht** aus: Es meldet einen Irrtum über den Stand, keinen Verlust in der Bilanz (T20). Die messbare Fassung — über die Bilanzsumme und über Präfixe — steht in §8.1.

**T26:** Zwei Quellen 0/1/3 und 0/2/6 ⇒ Ziel plus 0/3/9, Quellen aufgegangen, Gesamtstärke unverändert. **T27:** Eine Quelle meldet nebenläufig anders ⇒ `vorgangSummeWeichtAb`. **T28:** Dieselbe Zusammenführung zweimal (verschiedene Ereignis-Ids) ⇒ **ein** Summand. **T29:** {X,Y} nach Z1 und {Y,Z} nach Z2 ⇒ Y zählt einmal, beim Gewinner, Wirkungslos-Hinweis beim Verlierer. **T30:** A→B und B→A ⇒ eine Einheit bleibt eigenständig, `zusammenfuehrungKreis`, Gesamtstärke unverändert. **T31:** `zielEinheitId` in `quellen` ⇒ dieselbe Behandlung. **T32 (Umlenkung):** X→Z1 (9), `StaerkeGeaendert` an Z1 (12), X→Z2 (15) ⇒ X bleibt in Z1, Gesamtstärke unverändert, Wirkungslos-Hinweis für die zweite Zusammenführung. Ohne die Monotonie zählte X zweimal.

#### §5.4.4 Die mögliche Dublette

Zwei Clients melden dieselbe reale Einheit — am Meldekopf und in der Führungsstelle. Kein technischer Konflikt: zwei Ids, zwei Anlagen, beide gültig. Erkennung über `einheitSchluessel` (aus dem EEB, Heuristik).

**Form des Hinweises.** Je Schlüssel **ein** Hinweis, nicht paarweise: `moeglicheDublette` mit der aufsteigend sortierten Liste aller Ids und dem Feldpfad `einheit/<kleinste Id>/einheitSchluessel`. Paarweise Hinweise wären bei vier Einheiten sechs Zeilen für einen Sachverhalt, und ihre Zahl hinge von einer Wahl ab, die zwei Clients gleich treffen müssten, damit P3 hält.

**Wer in die Gruppe geht:** nur Einheiten mit `zaehlt` — weder entfernt noch aufgegangen. Bleibt eine übrig, entsteht kein Hinweis. Damit verschwindet er nach einer Zusammenführung wie nach dem Entfernen der Dublette, symmetrisch zu §5.6.1.

**Aufgelöst wird nur von Hand.** Zwei Trupps derselben Fachgruppe können denselben Schlüssel tragen; eine automatische Verschmelzung nähme eine Meldung aus der Lage. Der Schlüssel ist „von der App vorgeschlagen, vom Menschen bestätigt" — deshalb ist er über `EinheitStammdatenGeaendert` **änderbar**, sonst bliebe ein falscher Vorschlag dauerhaft stehen.

**T33:** Zwei mit demselben Schlüssel ⇒ beide zählen, ein Hinweis mit zwei Ids. **T34:** Drei ⇒ ein Hinweis mit drei Ids. **T35:** Nach Zusammenführung bzw. `EinheitEntfernt` ⇒ kein Hinweis. **T36:** Nach Änderung des Schlüssels ⇒ kein Hinweis.

#### §5.4.5 Regel: Entfernen ist kein Löschen

`EinheitEntfernt` löscht nichts. Die Einheit wird markiert, zählt nirgends mehr, bleibt in Tagebuch und Historie. `grund` ist Pflicht (§2.4).

`entfernt` ist ein gewöhnliches LWW/Feld über das Paar `EinheitEntfernt`/`EinheitWiederhergestellt` — sonst wäre die Wiederherstellung nicht möglich. Der Satz aus ZDM §4.2, das Entfernen „gewinne gegen alle nebenläufigen Feldänderungen", bedeutet **nicht**, dass es andere Felder verdrängt: Sie werden weiter gefaltet, damit eine Wiederherstellung den neuesten Stand zeigt. Er bedeutet, dass die Einheit **unabhängig von jedem anderen Feld** nirgends mitzählt, solange `entfernt` gilt.

Dasselbe Paar gilt für `Fahrzeug`, `Person`, `Dienstposten` und `Anhang`; die Gegenereignisse sind benannt. Pflicht-`grund` haben nach §2.4 nur `EinheitEntfernt`, `FahrzeugEntfernt` und `PersonEntfernt` — sie nehmen eine gemeldete Kraft oder ein gemeldetes Mittel aus der Lage. Ein Dienstposten ist Planung, ein Anhang ein Verweis.

**T37:** `EinheitEntfernt` (5), `StaerkeGeaendert` (7) ⇒ entfernt, Stärke aktualisiert, zählt nicht. **T38:** Dazu `EinheitWiederhergestellt` (9) ⇒ zählt wieder, mit der Stärke aus 7. **T39:** Eine entfernte Einheit, die aus einer Aufteilung stammt ⇒ die Quelle bleibt verringert.

### §5.5 Fahrzeug und Person

```ts
const FahrzeugAngelegt = z.object({
  fahrzeugId: zId, einheitId: zId.optional(), abschnittId: zId.optional(),
  typ: zPflichttext, bezeichnung: zText.optional(), kennzeichen: zText.optional(),
  funkrufname: z.object({ kennwort: zPflichttext, eigenerStandort: z.boolean(),
    ort: zText.optional(), teile: z.array(z.number().int()) }).optional(),
  stanKonform: z.boolean().optional(), aenderungen: zText.optional(),
  nutzlastText: zText.optional(), status: zFahrzeugStatus })
const FahrzeugGeaendert = z.object({ fahrzeugId: zId, feld: z.enum(["typ","bezeichnung",
  "kennzeichen","funkrufname","stanKonform","aenderungen","nutzlastText","status",
  "taktischesZeichen"]) })
const FahrzeugVerschoben        = z.object({ fahrzeugId: zId })
const FahrzeugEinheitGewechselt = z.object({ fahrzeugId: zId })
const FahrzeugEntfernt          = z.object({ fahrzeugId: zId })   // `grund` Pflicht
const FahrzeugWiederhergestellt = z.object({ fahrzeugId: zId })

const PersonHinzugefuegt = z.object({ personId: zId, einheitId: zId,
  nachname: zPflichttext, vorname: zPflichttext, rolle: zRolle,
  funktionen: z.array(zPflichttext), fahrerlaubnisse: z.array(zPflichttext),
  geschlecht: zGeschlecht, ernaehrung: zErnaehrung, kontakte: z.array(zKontakt),
  zusatzqualifikationen: z.array(zPflichttext), bemerkung: zText.optional() })
const PersonGeaendert = z.object({ personId: zId, feld: z.enum(["nachname","vorname",
  "rolle","funktionen","fahrerlaubnisse","geschlecht","ernaehrung","kontakte",
  "zusatzqualifikationen","bemerkung","einheitId"]) })
const PersonEntfernt          = z.object({ personId: zId })   // `grund` Pflicht
const PersonWiederhergestellt = z.object({ personId: zId })
```

| Typ | Form | Feldpfad / Wert | Klasse | Undo |
|---|---|---|---|---|
| `FahrzeugAngelegt` | b | Anlage | additiv, §3.11 | frei → `FahrzeugEntfernt` |
| `FahrzeugGeaendert` | a | `fahrzeug/<id>/<feld>` · Typ des Feldes | LWW/Feld; `funkrufname`, `taktischesZeichen` LWW/Entität | frei |
| `FahrzeugVerschoben` | a | `fahrzeug/<id>/abschnittId` · `Id \| null` | Regel §5.3.3 | frei |
| `FahrzeugEinheitGewechselt` | a | `fahrzeug/<id>/einheitId` · `Id \| null` | LWW/Feld, §3.10 | frei |
| `FahrzeugEntfernt` / `…Wiederhergestellt` | a | `fahrzeug/<id>/entfernt` · `boolean` | LWW/Feld, §5.4.5 | frei |
| `PersonHinzugefuegt` | b | Anlage | additiv, §3.11 | frei → `PersonEntfernt` |
| `PersonGeaendert` | a | `person/<id>/<feld>` · Typ des Feldes | LWW/Feld; die vier Listenfelder LWW/Entität | frei |
| `PersonEntfernt` / `…Wiederhergestellt` | a | `person/<id>/entfernt` · `boolean` | LWW/Feld, §5.4.5 | frei |

**Listen sind ein Wert.** `funktionen`, `fahrerlaubnisse`, `kontakte`, `zusatzqualifikationen`, `hierarchie`, `fuehrungskraft` werden als Ganzes ersetzt. Ein Merge über Listen zweier Clients wäre nicht deterministisch begründbar.

**Die Stärke folgt nicht aus den Personen.** `staerke` ist ein gemeldetes Tripel; `personalErfassung` sagt, ob Einzelpersonen erfasst sind. Personen in die Stärke umzurechnen wäre eine Kennzahl (M1.3) und ersetzte eine Meldung durch eine Rechnung.

**T40:** Zwei `PersonGeaendert` auf `kontakte` ⇒ genau eine Liste, keine Vereinigung. **T41:** `PersonHinzugefuegt` ⇒ `staerke` unverändert.

### §5.6 Auftrag und Anforderung

```ts
const AuftragErfasst = z.object({ auftragId: zId, einheitId: zId, von: zZeitpunkt,
  bis: zZeitpunkt.optional(), abschnittId: zId.optional(), text: zPflichttext,
  quelle: zAuftragQuelle })
const AuftragBeendet         = z.object({ auftragId: zId })
const AuftragZurueckgenommen = z.object({ auftragId: zId })

const AnforderungAngelegt = z.object({ anforderungId: zId, kennung: zText.optional(),
  abzuloesendeEinheitId: zId.optional(), vorgeseheneEinheitText: zText.optional(),
  vorgesehenerAuftrag: zText.optional(), angefordertAm: zZeitpunkt,
  bemerkung: zText.optional() })
const AnforderungGeaendert = z.object({ anforderungId: zId, feld: z.enum(["kennung",
  "abzuloesendeEinheitId","vorgeseheneEinheitText","vorgesehenerAuftrag","bemerkung",
  "angefordertAm"]) })
const AbloesungZugesagt         = z.object({ anforderungId: zId })
const ZusageZurueckgenommen     = z.object({ anforderungId: zId })
const AnforderungErledigt       = z.object({ anforderungId: zId })
const ErledigungZurueckgenommen = z.object({ anforderungId: zId })
const AnforderungStorniert      = z.object({ anforderungId: zId })   // `grund` Pflicht
const StornoZurueckgenommen     = z.object({ anforderungId: zId })
```

| Typ | Form | Feldpfad / Wert | Klasse | Undo |
|---|---|---|---|---|
| `AuftragErfasst` | b | Anlage | additiv, §3.11 | frei → `AuftragZurueckgenommen` |
| `AuftragBeendet` | a | `auftrag/<id>/bis` · `Zeitpunkt` | LWW/Feld | frei |
| `AuftragZurueckgenommen` | a | `auftrag/<id>/zurueckgenommen` · `true` | LWW/Feld | — |
| `AnforderungAngelegt` | b | Anlage | additiv, §3.11 | frei → `AnforderungStorniert` |
| `AnforderungGeaendert` | a | `anforderung/<id>/<feld>` · Typ des Feldes | LWW/Feld | frei |
| `AbloesungZugesagt` | a | `anforderung/<id>/zusage` · `{zugesagtFuer, zugesagtVon, abloesendeEinheitId?}` | LWW/Entität | frei → `ZusageZurueckgenommen` |
| `AnforderungErledigt` | a | `anforderung/<id>/erledigung` · `{erledigtAm, abloesendeEinheitId}` | LWW/Entität | frei → `ErledigungZurueckgenommen` |
| `AnforderungStorniert` | a | `anforderung/<id>/storno` · `true` | LWW/Feld | frei → `StornoZurueckgenommen` |
| die drei Gegenereignisse | a | dasselbe Feld · `null` bzw. `false` | wie oben | — |

#### §5.6.1 Regel: die Kennung ist ein Etikett, keine Identität (Frage 22)

Optionaler Freitext **ohne Formatprüfung** (S2). **Nie Identität:** Nach EXH F-F3 tragen die abzulösende und die ablösende Zeile dieselbe Kennung absichtlich; ein Verschmelzen wäre fachlich falsch, stilles Nebeneinander eine unbemerkte Doppelanforderung. Führen mehrere nicht stornierte Anforderungen dieselbe nicht leere Kennung, entsteht **ein** `moeglicheDublette` je Kennung mit allen Ids — Form und Begründung wie §5.4.4.

**T42:** Zwei mit derselben Kennung ⇒ zwei Anforderungen, ein Hinweis. **T43:** Eine storniert ⇒ kein Hinweis.

#### §5.6.2 Regel: die Zustandsmaschine (Prüfkriterium P6)

`zustand` ist **kein eigenes Feld**, sondern abgeleitet aus drei gewöhnlichen:

```
zustand = gilt(erledigung) ? EINGETROFFEN : gilt(storno) ? STORNIERT : gilt(zusage) ? ZUGESAGT : OFFEN
// gilt(f) = f ist vorhanden UND f.wert ist weder null noch false — ein Gegenereignis
// setzt den Wert auf null (§3.2), das Feld selbst bleibt stehen.
```

**Warum drei Felder statt eines Zustandsfelds.** Ein einzelnes Feld mit LWW ließe `EINGETROFFEN → ZUGESAGT` zu, sobald eine verspätete Zusage eine höhere HLC trägt — der Rückschritt, den P6 verbietet. Drei unabhängige Felder mit einer Ableitung können das nicht: Die Ableitung fragt nur, **ob** erledigt gilt, nie **wann**.

**Warum die drei Gegenereignisse.** Ohne sie wäre ein Undo nur durch Ausschluss des Originals aus der Ereignismenge darstellbar — ein Sonderpfad, den U1 ausschließt. ZDM §4.2 nennt für `AbloesungZugesagt` bereits ein „Gegen-Set auf `zustand = OFFEN`"; hier bekommt es Namen und Feld.

1. **`EINGETROFFEN` gewinnt gegen ein Storno,** auch mit höherer HLC. Das Storno wird gefaltet, `storno` steht auf `true`, der abgeleitete Zustand ändert sich nicht — dafür gibt es `wirkungslosGegenTerminalzustand` (§3.12). `vorherPasstNicht` griffe nicht: `storno` stand vorher tatsächlich auf `false`, der Schreiber hat sich nicht geirrt. Ohne den eigenen Hinweis wäre eine bewusste Stornierung wirkungslos **und** unsichtbar.
2. **Eine spätere Zusage** ändert den Zustand nicht mehr, wenn `erledigung` gilt; ihre Felder werden trotzdem gefaltet, mit demselben Hinweis.
3. **Die Ableitung hängt an der Menge.** P6: In jeder Permutation und jedem Präfix einer Menge mit `AnforderungErledigt` und ohne jüngeres `ErledigungZurueckgenommen` ist der Zustand `EINGETROFFEN`.
4. **Eine Rücknahme ist kein Rückschritt im Sinne von P6** — sie hat Akteur, Grund und Tagebuchzeile.

**T44:** Erledigt (5) und storniert (9), beide Permutationen ⇒ `EINGETROFFEN`, Wirkungslos-Hinweis. **T45:** Zusage (9) nach Erledigung (5) ⇒ `EINGETROFFEN`, `zusage` gesetzt, Hinweis. **T46 (P6):** jede Permutation, jedes Präfix. **T47:** `ErledigungZurueckgenommen` (11) ⇒ `ZUGESAGT`; mit HLC 3 ⇒ weiterhin `EINGETROFFEN`.

#### §5.6.3 Der Bewegungsauftrag ist ein Ereignis mit abgeleiteter Id

ZDM §4.2 verlangt, `EinheitVerschoben` erzeuge automatisch einen `Auftrag` mit `quelle = BEWEGUNG`. Der schreibende Client schreibt ihn als **eigenes `AuftragErfasst`** in denselben Anhang, mit `auftragId = "<id des EinheitVerschoben>#bewegung"`.

Damit ist er über §3.11 idempotent: Schrieben ihn zwei Clients, gälte die kleinere HLC, und die andere Anlage stünde in `verworfeneAnlagen` — mit `zweiteAnlageVerworfen`, wie bei jeder doppelten Anlage (§3.11). Der Hinweis ist hier lästig und trotzdem richtig: Er sagt, dass zwei Arbeitsplätze dieselbe Bewegung geschrieben haben, und das ist eine Auskunft über die Lage der Clients. **Warum ein Ereignis und keine Projektion:** Aus dem Zustand projiziert wäre er verloren, sobald das Verschiebeereignis nicht mehr Gewinner oder Zweiter des Feldes ist — bei drei Verschiebungen gäbe es zwei Aufträge statt drei. Der Einwand „zwei Wahrheiten über dieselbe Bewegung" entfällt durch die abgeleitete Id.

**T48:** Drei aufeinanderfolgende Verschiebungen ⇒ drei Bewegungsaufträge. **T49:** Zwei Clients schreiben denselben ⇒ einer im Zustand, `zweiteAnlageVerworfen`.

### §5.7 Führungsstelle: Dienstposten und Schichtplan

```ts
const DienstpostenAngelegt = z.object({ dienstpostenId: zId, teileinheit: zPflichttext,
  funktion: zPflichttext, schicht: zSchicht, reihenfolge: z.number().int() })
const DienstpostenGeaendert = z.object({ dienstpostenId: zId,
  feld: z.enum(["teileinheit","funktion","schicht","reihenfolge"]) })
const DienstpostenBesetzt           = z.object({ dienstpostenId: zId })
const DienstpostenEntfernt          = z.object({ dienstpostenId: zId })
const DienstpostenWiederhergestellt = z.object({ dienstpostenId: zId })
const SchichtplanEintragGesetzt     = z.object({ dienstpostenId: zId, datum: zDatum })
```

| Typ | Form | Feldpfad / Wert | Klasse | Undo |
|---|---|---|---|---|
| `DienstpostenAngelegt` | b | Anlage | additiv, §3.11 | frei → `DienstpostenEntfernt` |
| `DienstpostenGeaendert` | a | `dienstposten/<id>/<feld>` · Typ des Feldes | LWW/Feld | frei |
| `DienstpostenBesetzt` | a | `dienstposten/<id>/besetzung` · Tripel | LWW/Entität | frei |
| `DienstpostenEntfernt` / `…Wiederhergestellt` | a | `dienstposten/<id>/entfernt` · `boolean` | LWW/Feld, §5.4.5 | frei |
| `SchichtplanEintragGesetzt` | a | `schichtplan/<dienstpostenId>/<datum>` · `string \| null` | LWW/Feld | frei |

**Der Schlüssel des Schichtplans ist das Paar (`dienstpostenId`, `datum`).** Zwei Clients, die denselben Tag desselben Dienstpostens beschreiben, meinen dieselbe Zelle des FüSt-Blatts; mit zwei Entitäts-Ids hätten sie zwei Einträge für eine Zelle. `text` bleibt mehrzeiliger Freitext (ZDM §1.14) — ein Wert, keine Struktur.

**`schicht` ist am Dienstposten Pflicht,** an der Einheit nach ZDM §2.3 Nr. 4 optional außer im Abschnittstyp `ANGEFORDERT`. Diese Ausnahme ist **keine Foldregel** — der Fold nimmt jede und jede fehlende Schicht an —, sondern eine Warnregel der Maske. Sie steht hier, damit sie nicht im Code als Ablehnung auftaucht (S6 betrifft die Vorbelegung des Schichtmodells, nicht diese Pflicht).

**T50:** Zwei Einträge auf denselben Dienstposten und dasselbe Datum ⇒ ein Eintrag, LWW. **T51:** Auf verschiedene Daten ⇒ zwei Einträge.

### §5.8 EEB-Meldungen und Anhänge

```ts
const EebMeldungEmpfangen = z.object({ meldungId: zId, einheitSchluessel: zPflichttext,
  stand: zZeitpunkt, empfangenAm: zZeitpunkt, quelle: zMeldeQuelle,
  signatur: z.object({ zustand: z.enum(["GUELTIG","UNGUELTIG"]), pubkey: zText.optional(),
    kurzform: zText.optional(), absender: z.object({ name: zText.optional(),
    email: zText.optional(), telefon: zText.optional() }).optional() }).optional(),
  rohPayload: zText.optional(), bogen: z.unknown() })
const EebMeldungZugeordnet  = z.object({ meldungId: zId })
const EebMeldungUebernommen = z.object({ meldungId: zId, einheitId: zId,
                                         uebernommeneFelder: z.array(zPflichttext) })
const EebMeldungUebernahmeZurueckgenommen = z.object({ meldungId: zId })
const EebMeldungAbgelehnt   = z.object({ meldungId: zId })   // `grund` Pflicht (§2.4)
const EebMeldeStatusGesetzt = z.object({ meldungId: zId })

const AnhangHinzugefuegt = z.object({ anhangId: z.string().length(64),
  einheitId: zId.optional(), dateiname: zPflichttext, mimeTyp: zPflichttext,
  groesse: zAnzahl, hinzugefuegtAm: zZeitpunkt })
const AnhangEntfernt          = z.object({ anhangId: z.string().length(64) })
const AnhangWiederhergestellt = z.object({ anhangId: z.string().length(64) })
```

| Typ | Form | Feldpfad / Wert | Klasse | Undo |
|---|---|---|---|---|
| `EebMeldungEmpfangen` | b | Anlage über `meldungId` | Regel §3.6, §3.11 | **nein** |
| `EebMeldungZugeordnet` | a | `meldung/<id>/einheitSchluessel` · `string` | LWW/Feld | frei |
| `EebMeldungUebernommen` | a | `meldung/<id>/uebernahme` · `{einheitId, uebernommeneFelder}` | LWW/Entität | frei → `…Zurueckgenommen` |
| `EebMeldungUebernahmeZurueckgenommen` | a | `meldung/<id>/uebernahme` · `null` | LWW/Entität | — |
| `EebMeldungAbgelehnt` | a | `meldung/<id>/abgelehnt` · `true` | LWW/Feld | frei, dieselbe Art mit `neu = false`; dann ohne Pflicht-`grund` |
| `EebMeldeStatusGesetzt` | a | `meldung/<id>/meldeStatus` · geschlossener Bereich | LWW/Feld | frei |
| `AnhangHinzugefuegt` | b | Anlage über `anhangId` | Regel §3.6, §3.11 | frei → `AnhangEntfernt` |
| `AnhangEntfernt` / `…Wiederhergestellt` | a | `anhang/<id>/entfernt` · `boolean` | LWW/Feld | frei |

#### §5.8.1 Regel: der Empfang ist eine Tatsache

`EebMeldungEmpfangen` ist **nicht rücknehmbar** und über `meldungId` idempotent. Die Meldung ist unveränderlich: Eine Korrektur ist eine **neue** Meldung mit eigener `meldungId` (Revision), Löschen ist verboten. Wer eine Meldung nicht will, lehnt sie ab — sie bleibt sichtbar.

**`meldungId` ist der Inhalts-Hash des Bogens** (`bogenInhaltsId(bogen)`, ZDM §3.2), nicht eine frei vergebene Kennung. Darauf beruht die Zusicherung, dass zwei Meldeköpfe, die denselben QR scannen, **eine** Meldung erzeugen. Das Schema kann es nicht prüfen — der Fold hat den Codec nicht, `@bos/eeb-format` hat ihn —, und deshalb steht es hier als Pflicht des **Schreibers**. Ein Client, der den Codec ohnehin geladen hat, darf nachrechnen und bei Abweichung warnen; der Fold tut es nicht. Der Inhaltsvergleich aus §3.6 bleibt trotzdem nötig: Er fängt die gefälschte oder mit einer anderen Codec-Fassung berechnete Id.

`bogen` steht als `z.unknown()`: Die Struktur gehört `@bos/eeb-format` und wird dort versioniert. Sie hier zweitzubeschreiben führte zwei Wahrheiten über dasselbe Format; die Prüfung leistet der Codec. Dieser Katalog legt fest, dass der Bogen **unverändert** mitgeführt wird.

**Ablehnung und Rücknahme sind zwei Felder, nicht eines.** Die erste Fassung setzte beide auf `uebernahme = null` — damit wäre eine abgelehnte Meldung von einer nie übernommenen nicht zu unterscheiden, und `ABGELEHNT` aus dem Zustand nicht entscheidbar. `abgelehnt` ist deshalb ein eigenes LWW-Feld; die Meldung bleibt nach EXH F-E2 in beiden Fällen sichtbar.

**Ein Merkmal der Meldung ist abgeleitet** (§3.2): `uebernahmeZustand` folgt aus `abgelehnt`, `uebernahme` und der Revisionsreihe:

```
uebernahmeZustand = abgelehnt.wert === true          ? ABGELEHNT
                  : uebernahme fehlt oder null       ? NEU
                  : jüngere Revision derselben Reihe ? GEAENDERT
                  :                                    UEBERNOMMEN
```

**Eine Revisionsreihe ist die Menge der Meldungen mit demselben gefalteten `einheitSchluessel`** — dem Feld der Meldung, das `EebMeldungZugeordnet` korrigieren kann, nicht dem Wert aus dem Bogen. Damit ist die Reihe aus dem Zustand bestimmbar und folgt einer Korrektur der Zuordnung. „Jünger" heißt innerhalb der Reihe nach **`stand`**, nicht nach HLC (§2.6). Ein nachgescannter Papierbogen von gestern hat die höhere HLC und den älteren `stand`; nach HLC geordnet gälte er als aktuell, und die Lage zeigte den Stand von gestern.

**T52:** Zwei `EebMeldungEmpfangen`, gleiche `meldungId`, gleicher Bogen ⇒ eine Meldung, kein Hinweis. **T53:** Gleiche `meldungId`, abweichender Bogen ⇒ eine Meldung (kleinste HLC), `inhaltsschluesselWidersprochen`, verworfener Inhalt in `verworfeneSchluessel`. **T54:** Abweichendes `empfangenAm` ⇒ eine Meldung, **kein** Hinweis. **T55:** Zweite Revision mit jüngerem `stand` nach Übernahme ⇒ `GEAENDERT`. **T56:** Zweite Revision mit **älterem** `stand`, aber höherer HLC ⇒ **nicht** `GEAENDERT`.

#### §5.8.2 Regel: die Übernahme erzeugt die Feldereignisse mit

`EebMeldungUebernommen` setzt `uebernahme` **und** die übernommenen Werte werden als eigenständige Feldereignisse geschrieben (`StaerkeGeaendert`, `LogistikGesetzt`, …) mit `grund = "EEB <meldungId>"`. Dort gelten die gewöhnlichen Konfliktregeln.

**Das sind wirklich geschriebene Ereignisse, keine Projektion** — anders als beim Bewegungsauftrag. Welche Felder eine Übernahme übernimmt, folgt aus einer **Auswahl des Bedieners** und aus dem Stand, den er dabei gesehen hat; dieser gesehene Vorher-Wert steckt in den Feldereignissen und nirgends sonst. Als Projektion wäre er verloren, und Auflage 6 gälte für den ganzen EEB-Weg nicht mehr.

**T57:** Übernahme plus zugehöriges `StaerkeGeaendert` mit gesehenem Vorher-Wert; ein nebenläufiges `StaerkeGeaendert` höherer HLC gewinnt, `vorherPasstNicht` entsteht.

### §5.9 Einsatztagebuch und Korrekturen

```ts
const EtbEintragErfasst = z.object({ etbId: zId, zeitpunkt: zZeitpunkt, text: zPflichttext,
  bezug: z.object({ entitaet: z.enum(["EINHEIT","ABSCHNITT","FAHRZEUG","ANFORDERUNG"]),
                    id: zId }).optional() })
const EtbEintragBerichtigt = z.object({ etbId: zId, berichtigtEintragId: zId,
  zeitpunkt: zZeitpunkt, text: zPflichttext })   // `grund` Pflicht
const KorrekturVon = z.object({ korrigiertesEreignisId: zId, zielTyp: zPflichttext,
  zielNutzlast: z.unknown() })                   // `grund` Pflicht
```

| Typ | Form | Feldpfad / Wert | Klasse | Undo |
|---|---|---|---|---|
| `EtbEintragErfasst` | b | Anlage | additiv, §3.11 | **nein** |
| `EtbEintragBerichtigt` | b | Anlage | additiv, §3.11 | **nein** |
| `KorrekturVon` | wie `zielTyp` | der Feldpfad von `zielTyp` | wie `zielTyp` | **nein** |

**`EtbEintragBerichtigt` gehört zu den dreizehn Anlagearten** (§3.11) und hat eine eigene `etbId`. Zwei Berichtigungen derselben Id fallen damit unter dieselbe Regel wie jede andere Anlage; ohne sie hinge das Verhalten an der Wahl des Implementierers. `berichtigtEintragId` benennt die berichtigte Zeile **unabhängig davon, ob dieser Client sie hat** — Grabsteinregel wie in §7.2.

#### §5.9.1 Das Einsatztagebuch ist eine Projektion des Ereignisstroms

Jedes fachliche Ereignis erzeugt eine Tagebuchzeile; `EtbEintragErfasst` ist der frei getippte Zusatz. Doppelt geführt wird nichts. Die beiden Verwaltungsereignisse der Speicherschicht erscheinen nicht.

**Das Tagebuch wird aus den Ereignisdateien gerendert, nicht aus dem Zustand.** Es ist **kein** Bestandteil des `Zustand` und geht **nicht** in den `zustandsHash` ein: Der Zustand hält je Feld zwei Beobachtungen, das Tagebuch braucht alle — projiziert man es aus dem Zustand, zeigt es bei drei Änderungen zwei Zeilen. Nur die Entitäten `EtbEintrag` selbst (die getippten und die berichtigenden Zeilen) stehen im Zustand, weil sie eigene Anlagen mit eigener Id sind.

Das ist kein Verlust: Die Ereignisdateien sind append-only und vollständig; das Tagebuch ist jederzeit herstellbar — es kostet Lesezeit, keinen Inhalt. Die Zeilen tragen den fachlichen `zeitpunkt`, geordnet wird nach `hlc`. `art` und `ereignisId` aus ZDM §3.2 sind Merkmale dieser Projektion und keine Zustandsfelder.

#### §5.9.2 Regel: `KorrekturVon` gilt nur für setzende Arten

Die eingebettete Nutzlast wird gegen das Schema von `zielTyp` geprüft, und das Ereignis wirkt wie eines dieser Art — mit HLC und Id des Korrekturereignisses. Zusätzlich wird das korrigierte Ereignis im Tagebuch als berichtigt markiert; **beide Zeilen bleiben stehen** (U4).

**`zielTyp` darf keine Anlageart und keine der beiden strukturellen Arten sein.** Für Anlagen gilt §3.11: die kleinste HLC gewinnt; eine Korrektur hat kausal immer die größere und würde als `zweiteAnlageVerworfen` abgetan — sie täte nachweislich nichts. **Für `EinheitZusammengefuehrt` und `EinheitAufgeteilt` gilt dasselbe aus demselben Grund:** Ihre Wirkung steht in einem Feld der Klasse Erstwert (§3.4), wo ebenfalls die kleinste HLC gewinnt; eine Korrektur erzeugte nur `wirkungslosGegenTerminalzustand`, und ein Bedienschritt mit Pflicht-`grund` verpuffte still. Der Weg dorthin ist der strukturelle Rückweg aus U2. Ein solches `KorrekturVon` ist **ungültig** (§3.7 Punkt 4). Damit ist der Korrekturweg je Anlageart ein anderer, und zwar benannt:

| Was falsch ist | Der Weg |
|---|---|
| ein Stammwert des Einsatzes, auch `beginn` | `EinsatzStammdatenGeaendert` |
| ein Stammwert einer Einheit, auch `personalErfassung`, `einheitSchluessel` | `EinheitStammdatenGeaendert` |
| eine Einheit ist gar nicht da | `EinheitEntfernt` mit Grund |
| eine EEB-Meldung ist falsch | eine neue Revision; die alte ablehnen |
| eine Tagebuchzeile ist falsch | `EtbEintragBerichtigt` |
| eine Zusammenführung ging ins falsche Ziel, eine Aufteilung war falsch | der strukturelle Rückweg (U2): `EinheitAufgeteilt` beziehungsweise `EinheitZusammengefuehrt` in der Gegenrichtung |
| eine Zuordnung, Zusage, ein Zeitpunkt, ein Status war fachlich falsch | `KorrekturVon` |

**T58:** `KorrekturVon` mit `zielTyp = "StaerkeGeaendert"` und höherer HLC ⇒ die korrigierte Stärke gilt, beide Zeilen im Tagebuch. **T59:** `zielTyp = "EinheitGemeldet"` ⇒ ungültig, nicht gefaltet, geführt; ebenso `zielTyp = "EinheitZusammengefuehrt"` (T151). **T60:** unbekannter `zielTyp` ⇒ ebenso.

---

## §6 Undo — die Regeln U1 bis U6 (Auflage 11)

Auflage 11 legt vier Eckpunkte fest: Undo ist ein gewöhnliches Ereignis mit `undoOf`, es gibt einen Stapel je Client, `KorrekturVon` ist etwas anderes, und Redo gibt es nicht.

### U1 — Undo ist ein neues Ereignis, und der Fold hat keinen Sonderpfad

Eigene `id`, eigene `hlc`, eigener `akteur`, zusätzlich `undoOf`, und es setzt ein Feld auf den Wert, den das Original verdrängt hat — bei setzenden Arten aus dessen `vorher`.

**Der Fold liest `undoOf` nicht, um zu entscheiden.** Er faltet die Kompensation nach der Regel ihrer eigenen Art. `undoOf` steht im Zustand (`Beobachtung.undoOf`, §3.2), weil der Hinweis aus U6 es braucht, und dient sonst dem Tagebuch und dem Stapel.

Deshalb führt der Katalog für **jede** rücknehmbare Art ein Gegenereignis oder lässt dieselbe Art mit `neu = vorher` genügen. Ohne das gäbe es Arten, deren Rücknahme nur durch **Ausschluss** des Originals aus der Ereignismenge darstellbar wäre — eine Rückwärtslogik, bei der die Menge nicht mehr die Menge ist.

**T61:** Ein Fold, dem `undoOf` künstlich entfernt wird, liefert denselben Zustand bis auf die Tagebuchmarkierung und den Hinweis aus U6.

### U2 — Was rückgängig gemacht werden kann, ist typabhängig

| Klasse | Arten | Kompensation |
|---|---|---|
| **frei rückgängig** | alle setzenden Arten, alle Verschiebungen, alle Anlagen außer den unten genannten, Zusagen | ein Ereignis derselben Art mit `neu = vorher` **oder** das im Katalog benannte Gegenereignis. Welche Form gilt, steht in der Undo-Spalte je Art |
| **strukturell rückgängig** | `EinheitAufgeteilt` ↔ `EinheitZusammengefuehrt`, `AbschnittAngelegt` ↔ `AbschnittAufgeloest`, `AbschnittAufgeloest` ↔ `AbschnittWiederhergestellt` | der **inverse Fachvorgang**, nicht ein technisches Zurückrollen. Im Tagebuch als Rücknahme markiert, fachlich eine echte Handlung |
| **nicht rückgängig** | `EinsatzAngelegt`, `EinsatzArchiviert`, `EebMeldungEmpfangen`, `EtbEintragErfasst`, `EtbEintragBerichtigt`, `KorrekturVon` | Tatsachen und Barrieren |

**Für die sechs nicht rücknehmbaren Arten gibt es keinen gemeinsamen Ersatz.** Der Weg ist je Art ein anderer, und die Tabelle in §5.9.2 nennt ihn. Insbesondere ist `KorrekturVon` **nicht** der Ersatz für die Anlagen — auf eine Anlage angewandt täte es nachweislich nichts.

**Warum `EinsatzArchiviert` nicht rückgängig ist, obwohl es zurückgenommen werden kann.** Ein Undo sagt „das war ein Versehen"; die Rücknahme einer Archivierung sagt „der Einsatz geht weiter". Das erste passt zu einer Barriere nicht — sie hat, solange sie galt, die Arbeit aller Clients gesteuert. `ArchivierungZurueckgenommen` trägt deshalb kein `undoOf`, steht nicht auf dem Stapel und braucht einen `grund`.

### U3 — Der Stapel ist je Client, und er wird abgeleitet

„Letzte Aktion rückgängig" heißt: das **eigene** Ereignis dieses Clients mit der höchsten HLC, das noch nicht kompensiert ist. Ein globales Undo wäre für den Bediener nicht vorhersagbar.

Der Stapel liegt nirgends. KONZEPT-SPEICHER.md §4.4 leitet ihn aus dem lokalen Spiegel ab und **verweist die Semantik ausdrücklich hierher**. Zwei Größen legt dieses Konzept fest:

* **Tiefe N = 20** (S4). Der Stapel dient dem Zurücknehmen eines Vertippers, nicht dem Zurückrollen einer Schicht; zwanzig Schritte decken jede Bedienfolge ab, die ein Mensch als „gerade eben" empfindet, und begrenzen, wie weit ein Undo in fremde Arbeit reicht.
* **Kompensiert ist ein Ereignis, sobald *irgendein* Client es kompensiert hat.** §4.4 formuliert enger („ein **eigenes** Ereignis mit passendem `undoOf`") — Befund B2. Begründung: Hat B mein Ereignis zurückgenommen, ist der alte Stand wiederhergestellt. Nähme ich es erneut zurück, setzte mein Undo denselben Wert ein zweites Mal, mit einer HLC über allem, was zwischenzeitlich geschrieben wurde. Ich verwürfe fremde Arbeit, ohne es zu beabsichtigen.

**T62:** A schreibt e1, B kompensiert e1 ⇒ der Stapel von A enthält e1 nicht mehr. **T63:** Der Stapel enthält keine fremden Ereignisse.

### U4 — `KorrekturVon` ist etwas anderes als Undo

Undo tut so, als wäre nichts gewesen. Korrektur sagt, dass etwas war. Sie ist das Werkzeug für „das war fachlich falsch" — etwa eine Meldung, die der falschen Einheit zugeordnet wurde und bereits in Summen und Ausdrücke eingegangen ist. Im Tagebuch erscheinen **beide** Zeilen. Ein Korrekturereignis steht nicht auf dem Undo-Stapel und ist selbst nicht rücknehmbar.

### U5 — Redo gibt es nicht

Ein zurückgenommenes Ereignis wird durch **erneutes Ausführen der Handlung** wiederhergestellt: ein neues Ereignis ohne `undoOf`. Ein Redo über nebenläufige Ereignisse ist nicht deterministisch definierbar — zwischen Undo und Redo kann ein anderer dasselbe Feld gesetzt haben, und ein Redo hätte keinen gesehenen Vorher-Wert.

### U6 — Undo gegen Fremdänderung

Kompensiert A ein Ereignis, das B zwischenzeitlich überschrieben hat, gilt weiterhin LWW: **Die Kompensation gewinnt, wenn ihre HLC höher ist.** Zusätzlich entsteht `undoTrifftFremdenStand` mit Gewinner, verdrängtem Wert und der Id des Originals. Eine eigene Hinweisart und nicht `vorherPasstNicht`, weil der Bediener nicht ein Feld gesetzt, sondern „rückgängig" gedrückt hat und die Oberfläche daraus einen anderen Satz bauen muss.

Der Hinweis wird nach §3.8 bei jeder Materialisierung neu gerechnet. Er steht genau dann, wenn **alle drei** Bedingungen gelten: Der Gewinner des Feldes trägt ein `undoOf`, der Zweitplatzierte stammt von einem anderen Client, **und die beiden Werte sind verschieden**. Die dritte Bedingung ist die, an der zwei Rücknahmen desselben Ereignisses auseinandergehen (unten); ohne sie erzeugte jede doppelte Rücknahme einen Hinweis, obwohl niemandes Arbeit verdrängt wurde. `fold.ts` unterdrückt bei `ohneVorherWertVerdraengt` seit M0.2 nach demselben Muster über `wertGleich`. Verdrängt später ein viertes Ereignis den Undo vom Gewinnerplatz, fällt er von selbst weg.

**Zwei Clients nehmen dasselbe Ereignis zurück.** Beide schreiben eine Kompensation mit demselben `undoOf` und, weil beide aus demselben `vorher` stammen, demselben Wert. LWW entscheidet; das Ergebnis ist derselbe Wert, und weil die Werte gleich sind, entsteht **kein** Hinweis. Sahen sie verschiedene Stände, unterscheiden sich die Werte, und es gilt LWW mit Hinweis.

**T64:** A schreibt `StatusGesetzt` (5), B setzt anders (7), A nimmt zurück (9) ⇒ der Wert von A gilt, `undoTrifftFremdenStand`. **T65:** Ein viertes `StatusGesetzt` (11) ⇒ der Hinweis fällt weg. **T66:** Zwei Clients kompensieren dasselbe Ereignis mit demselben Wert ⇒ ein Wert, kein Hinweis. **T67:** Dieselben mit verschiedenen Werten ⇒ LWW, Hinweis.

---

## §7 Die Barriere `EinsatzArchiviert` (Auflage 13)

### §7.1 Nutzlast und Wirkung

`EinsatzArchiviert` trägt `{ einsatzId, zeitpunkt, snapshotHash }`. Beide Werte stehen im Zustand unter `einsatz.archivierungen[<eigene id>]` (§3.2) — sonst wäre der „Beleg" nur im Ereignisstrom auffindbar und nach einem Schnappschuss verloren.

`snapshotHash` ist **Beleg, nicht Bedingung**: Ein anderer Client, der einen anderen Hash rechnet, archiviert trotzdem und faltet trotzdem. Ihn zur Bedingung zu machen hieße, die Archivierung von der Sicht eines einzelnen Clients abhängig zu machen.

Wirkung: Der Einsatz gilt als archiviert, der Client wechselt in einen Nur-Lesen-Zustand und bietet keine ändernden Bedienschritte mehr an. Der Fold hört **nicht** auf zu falten.

### §7.2 Die maßgebliche Archivierung — und der monotone Grabstein

Es kann mehr als ein `EinsatzArchiviert` geben. Die Ableitung:

* Der Zustand führt `archivierungen` als Abbildung von **Ereignis-Id** auf `{ gilt, hlc?, wanduhr?, zeitpunkt?, snapshotHash?, zurueckgenommenDurch }` — **`zurueckgenommenDurch` ist immer vorhanden**, im Regelfall als leere Liste. §7.6 der Speicherschicht behält leere Listen und lässt fehlende Felder weg; ein Client, der das Feld bei einer Archivierung ohne Rücknahme wegließe, hätte einen anderen `zustandsHash` als einer, der `[]` schreibt (T137). `EinsatzArchiviert` legt den Eintrag unter seiner **eigenen** Id mit `gilt = true` an; `ArchivierungZurueckgenommen` setzt den Eintrag unter der von ihm **benannten** Id auf `gilt = false`.
* **Der Eintrag entsteht unabhängig davon, ob das benannte Ereignis bekannt ist.** Trifft die Rücknahme vor der Archivierung ein, steht der Eintrag als **Grabstein** mit `false` da; die später eintreffende Archivierung findet ihn vor.
* **`gilt` ist eine Konjunktion über die Menge**, kein LWW und kein Erstwert:
  `gilt = es gibt eine Archivierung mit dieser Id ∧ keine der Rücknahmen auf diese Id nennt deren HLC`.
  Jede Rücknahme steht mit ihrer `erwarteteHlc` in `zurueckgenommenDurch` — **auch dann, wenn die Archivierung noch fehlt**. Damit ist die Bedingung aus dem Zustand entscheidbar und bleibt es nach einem Schnappschuss; ohne den mitgeführten Erwartungswert müsste ein Client aus dem Schnappschuss raten, ob ein Grabstein zu einer später eintreffenden Archivierung gehört. Kommutativ, assoziativ und idempotent ohne jede Auswahl.
* **Eine Rücknahme benennt die Archivierung mit Id *und* HLC** (`archivierungHlc`, in der Textform aus §3.2 der Speicherschicht). Sie wirkt nur auf eine Archivierung, deren HLC genau diese ist. Das ist der gesehene Vorher-Wert im Sinne von Auflage 6: Wer zurücknimmt, hat die Archivierung vor sich.

  Die Bedingung löst zwei Fälle auf einmal, die sich sonst widersprechen. **Erstens** wirkt eine Rücknahme auch dann, wenn ihre HLC **kleiner** ist als die der Archivierung — der Fall der vorlaufenden fremden Uhr, den §3.2 der Speicherschicht ausdrücklich als Normalfall führt und den eine reine HLC-Bedingung verworfen hätte. **Zweitens** vergiftet eine Rücknahme auf eine noch nicht vergebene Id sie nicht dauerhaft: Ereignis-Ids sind deterministisch (`clientId:laufnummer`), und erreichte derselbe Client später diese Laufnummer mit einem `EinsatzArchiviert`, trüge dieses eine **andere** HLC — der Grabstein passt nicht, die Archivierung gilt.
* **`zurueckgenommenDurch` ist eine Liste,** aufsteigend nach Ereignis-Id sortiert. Zwei Clients können dieselbe Archivierung gleichzeitig zurücknehmen; ein einwertiges Feld müsste zwischen ihnen wählen, und die Wahl ginge in den `zustandsHash` ein.
* **`hlc` und `wanduhr` des Eintrags fehlen, solange nur der Grabstein vorliegt.** Sie kommen mit dem Archivierungsereignis. Ein erfundener Anfangswert stünde im Hash (§3.2, „Ein nie gesetztes Feld fehlt").
* **Maßgeblich** ist unter allen Einträgen mit `gilt = true` der mit der **kleinsten** HLC des Archivierungsereignisses; bei Gleichstand die kleinere Id. Gibt es keinen, ist der Einsatz nicht archiviert.

**Warum monoton und nicht LWW.** Mit LWW hinge die Wirkung einer Rücknahme an der Uhr des archivierenden Clients. KONZEPT-SPEICHER.md §3.2 übernimmt eine fremde HLC nicht, wenn sie mehr als fünf Minuten vorausläuft — der Fall, den die Fehlerinjektion von M0 ausdrücklich erzeugt. Archiviert A mit einer verstellten Uhr bei HLC 9 und nimmt B es daraufhin bei HLC 5 zurück, gewänne unter LWW die Archivierung: Die Rücknahme wäre wirkungslos, es entstünde **kein** Hinweis (das Feld hatte tatsächlich den erwarteten Wert), und die Speicherseite entfernte den Marker nicht. Ein Bedienschritt mit Pflicht-`grund` verpuffte still — gegen §1.3 Satz 3.

Monotonie ist hier zulässig, weil es keine symmetrische Gegenhandlung gibt: Wer nach einer Rücknahme wieder archivieren will, schreibt ein **neues** `EinsatzArchiviert` mit neuer Id, und das legt einen neuen Eintrag an. Eine Rücknahme benennt immer genau ein Ereignis und kann keines wiederbeleben.

Dieselbe Grabsteinregel gilt für jedes Feld, das ein Ereignis über die Id eines anderen adressiert: `KorrekturVon.korrigiertesEreignisId` und `EtbEintragBerichtigt.berichtigtEintragId` markieren das benannte Ereignis im Tagebuch, gleichgültig ob es vorliegt.

Die zweite Archivierung erzeugt keine zweite Barriere, wohl aber `wirkungslosGegenTerminalzustand` (§3.12) — sie ist nicht falsch, nur später, und der Bediener soll sehen, dass sein Klick nichts geändert hat.

**Die Schranke, benannt.** Der Schlüsselraum von `archivierungen` sind die Ids **beider** Arten. Eine Rücknahme auf eine Id, die es nie geben wird — Vertipper, verlorenes Segment —, hinterlässt einen dauerhaften Eintrag. Das ist selten und billig (ein Eintrag), aber es ist keine Null, und §8.2 führt es.

### §7.3 Ein Ereignis nach der Archivierung — genau eine Behandlung

**Das Ereignis wird angenommen, gefaltet und wirkt.** Verworfen wird nichts.

**Der Hinweis hängt an der Entität, nicht am Ereignis und nicht am einzelnen Feld.** Für jede Entität, von deren Feldern mindestens eines eine Gewinner-HLC größer als die der maßgeblichen Archivierung trägt, entsteht **ein** `nachArchivierungEingegangen` mit dem Entitätspfad und der Liste der betroffenen Feldnamen. Das ist die einzige Form, die nach §3.1 trägt — der Zustand kennt Felder, nicht den Ereignisstrom — und sie hält die Zahl der Hinweise bei der Zahl der geänderten Entitäten statt bei der ihrer Felder. Bei einer Archivierung mit versehentlich kleiner HLC wären das sonst sechsstellig viele Hinweise im Hash.

Die Zusicherung ist damit enger als „jedes nachträgliche Ereignis wird angezeigt" und dafür haltbar: **Keine nachträgliche Änderung, die im Zustand steht, bleibt unbemerkt.** Ein Ereignis, das seinen Konflikt verloren hat, hat den Zustand nicht geändert; es steht im Tagebuch. Die Meldung „N nachträgliche Einträge" ist eine Auskunft der Tagebuchprojektion (§5.9.1), nicht des Zustands; §8.2 führt das.

**Diese Festlegung ersetzt ZDM §4.1 Regel 5** („nach `EinsatzArchiviert` werden neue Ereignisse nicht mehr gefaltet"). KONZEPT-SPEICHER.md §5.7 sagt das Gegenteil, ausdrücklich und begründet. Maßgeblich ist die Speicherfassung: Sie ist freigegeben, ZDM ist ein Entwurfsbericht; Auflage 13 verlangt „genau **eine** Behandlung"; und nicht zu falten hieße, dass der Zustand davon abhinge, in welcher Reihenfolge ein Client Archivierung und Nachzügler sieht — der Fold wäre keine Mengenfunktion mehr. Der Widerspruch steht zusätzlich als Befund B3 in §10.

### §7.4 Die Rücknahme

`ArchivierungZurueckgenommen` trägt `{ einsatzId, archivierungEreignisId, archivierungHlc }` und einen Pflicht-`grund`. **Kein Undo** (U2): kein `undoOf`, nicht auf dem Stapel.

Wirkung: Der benannte Eintrag steht auf `gilt = false`. War er der maßgebliche und gibt es keinen weiteren mit `true`, ist der Einsatz wieder offen, und die Hinweise verschwinden an allen Entitäten, deren Felder nun keine geltende Archivierung mehr überschreiten. **Kein Zurückrollen, sondern dieselbe Ableitung über eine größere Menge** — deshalb geht es auch aus einem Schnappschuss heraus.

Die Speicherseite folgt: Der Client, der die Rücknahme faltet, entfernt `archiv.marker`, und kein Client legt ihn wieder an, solange sein eigener Fold den Einsatz nicht als archiviert führt.

**T68:** Zwei `EinsatzArchiviert` (5 und 9) ⇒ maßgeblich ist 5, für die zweite ein Wirkungslos-Hinweis. **T69:** `StatusGesetzt` mit HLC 7 dazu ⇒ gefaltet, wirkt, ein `nachArchivierungEingegangen` an der Einheit mit dem Feldnamen. **T70:** Rücknahme der Archivierung mit HLC 5 ⇒ maßgeblich ist 9, die Einheit aus HLC 7 verliert ihren Hinweis. **T71 (Grabstein):** Die Rücknahme trifft **vor** ihrer Archivierung ein ⇒ derselbe Zustand wie in umgekehrter Reihenfolge. **T72 (Monotonie):** Archivierung HLC 9, Rücknahme HLC 5 ⇒ der Einsatz ist offen. **T73:** Beide Archivierungen zurückgenommen ⇒ Einsatz offen, keine Entität trägt den Hinweis. **T74:** Alle vorstehenden Fälle in jeder Permutation mit demselben Ergebnis.

---

## §8 Was zugesichert wird — und was nicht

### §8.1 Die sieben Eigenschaften

| | Zugesichert | Bedingung |
|---|---|---|
| **P1 Kommutativität** | Jede Permutation einer Ereignismenge ergibt denselben Zustand, einschließlich der Hinweise | keine. Gilt für alle Arten, auch die der Klasse „Regel" |
| **P2 Idempotenz** | Ein doppelt gefaltetes Ereignis ändert den Zustand nicht | keine (§3.6) |
| **P3 Konvergenz** | Zwei Clients mit derselben Ereignismenge **und derselben `foldVersion`** haben denselben Zustand | dieselbe Menge und dieselbe Fold-Fassung — die nach §3.9 auch die bekannten Wertelisten umfasst. Bei Quarantäne sehen zwei Clients verschiedene Mengen (KONZEPT-SPEICHER.md §8.6.1) |
| **P4 Summenerhaltung** | Sei `P(e)` die Menge aller Ereignisse aus `M` mit kleinerer HLC als `e`. Für jedes strukturelle Ereignis `e ∈ M` (`EinheitAufgeteilt`, `EinheitZusammengefuehrt`) gilt `Bilanzsumme(falte(P(e) ∪ {e})) = Bilanzsumme(falte(P(e)))` | **bedingt**, drei Bedingungen: (i) das `gesehen` einer **Zusammenführung** entspricht der wirksamen Stärke ihrer Quelle (§5.4.3); (ii) nichts wurde geklemmt (§5.4.2); (iii) `P(e)` ist vollständig und keine von `e` berührte Einheit ist in `M` entfernt. Alle drei sind am Zustand ablesbar. Ein `vorgangSummeWeichtAb` aus einer **Aufteilung** setzt P4 nicht aus (§5.4.3) |
| **P5 Kein Waisenzustand** | Keine **Einheit** steht in einem nicht existierenden oder aufgelösten Abschnitt | keine. Für Fahrzeuge gilt die schwächere Regel aus §5.3.3, ausdrücklich nicht P5 |
| **P6 Monotone Zustandsmaschine** | `anforderung.zustand` geht nie von `EINGETROFFEN` zurück | **bedingt:** über einer Menge ohne `ErledigungZurueckgenommen` (§5.6.2) |
| **P7 Rebase-Treue** | Der Zustand aus „Schnappschuss laden, Rest falten" ist gleich dem aus „alles falten" — für jeden Schnitt | keine. Die formale Fassung von §3.1 |

> **Bilanzsumme** eines Zustands = Σ `wirksameStaerke(u)` über alle Einheiten `u`, die **weder entfernt noch wirksam aufgegangen** sind. Das ist `zaehlt` **ohne** seine Abschnittsbedingung: Der Typ des Abschnitts spielt keine Rolle, das Entfernen und das Aufgehen schon.

**Warum die Bilanzsumme und nicht die Gesamtstärke.** Die Gesamtstärke hängt zusätzlich am **Abschnittstyp**, und der ist eine Aussage darüber, ob eine Einheit im Lagebild erscheint, nicht darüber, wie viele Kräfte gemeldet sind. Eine angeforderte Einheit liegt in einem Abschnitt, der nach ZDM §2.4 nicht mitzählt; wird sie beim Eintreffen in eine Einheit am Einsatzort übernommen, **steigt die Gesamtstärke** um ihre Zahlen, ohne dass ein einziger Helfer hinzugekommen wäre. Das ist fachlich richtig und wäre als Bruch von P4 gemessen worden. Die Bilanzsumme ignoriert den Abschnittstyp und misst allein, was die **strukturellen** Vorgänge mit den gemeldeten Zahlen tun.

**Warum das Entfernen dagegen ausgeschlossen bleibt.** Entfernen **soll** Kräfte aus der Lage nehmen; es ist die einzige Art neben der Klemmung, die das darf, und sie trägt dafür einen Pflicht-`grund` (§2.4). Über den Umweg der Bedingung (1) aus §5.4.2a nimmt es auch die Zahlen mit, die einer entfernten Einheit zugewachsen sind, und über `aufgegangenIn` auch die, die sie in ein Ziel getragen hätte. Beides ist gewollt und beides wäre als P4-Bruch gemessen worden. Die Bilanzsumme lässt entfernte Einheiten deshalb aus, und **P4 prüft ein strukturelles Ereignis nur, wenn keine der von ihm berührten Einheiten in `M` entfernt ist** (dritte Bedingung). Sichtbar bleibt die Wirkung über `entfernungNimmtZugewachsenes` (§5.4.2a), den Pflicht-Grund und die Tagebuchzeile — nicht über P4.

**Warum Präfixe und nicht „dieselbe Menge ohne `e`".** `EinheitAufgeteilt` **legt** die neue Einheit **an** (§2.2 Form (b) und (c) zugleich). Lässt man es weg, hängen alle Ereignisse an dieser Einheit in der Luft: Ein `StaerkeGeaendert` wartet, eine Aufteilung aus ihr heraus findet ihre Quelle nicht, und die zweite Faltung misst eine andere Lage statt derselben ohne einen Vorgang. Die Präfixfassung hat das Problem nicht; sie ist auch keine Sortierannahme über den Fold — der bleibt eine Mengenfunktion —, sondern die Wahl zweier Mengen, die sich um genau ein Ereignis unterscheiden und beide vollständig sind. `P(e)` ist eindeutig, weil `vergleicheHlc` eine **totale** Ordnung ist (Millisekunden, Zähler, `clientId`); gleiche HLC bei verschiedenen Ereignissen setzt das geklonte Profil voraus, und dort sind P1 bis P3 ohnehin ausgesetzt (§8.2).

> **Geprüft wird `e` nur, wenn `P(e)` vollständig ist.** Es wäre falsch, sich darauf zu verlassen, dass alles, worauf `e` sich stützt, eine kleinere HLC trägt: §3.2 der Speicherschicht lässt ausdrücklich zu, dass ein Client eine **gesehene** fremde HLC nicht übernimmt, wenn seine eigene Uhr weit genug vorgeht. Dann liegt die Anlage der Quelle **hinter** der Aufteilung, `P(e)` kennt sie nicht, und die neue Einheit brächte ihre Stärke mit, ohne dass irgendwo abgezogen würde. Die Bedingung ist am Zustand ablesbar: `falte(P(e) ∪ {e})` darf **keinen** der Hinweise `fremdreferenzUnbekannt` an `abgeteiltVon` oder `aufgegangenIn`, `aufteilungKreis` und `zusammenfuehrungKreis` tragen. Alle drei sagen dasselbe: Der Vorgang steht in dieser Menge nicht auf beiden Beinen, und was er verschiebt, ist deshalb nicht messbar. In der **vollen** Menge rechnet der Fold in allen drei Fällen richtig; unmessbar ist nur die Differenz.

Die beiden Bedingungen fallen daraus von selbst: Bei einer Zusammenführung unterscheiden sich die zwei Faltungen genau um `gesehen` minus die wirksame Stärke der Quelle; bei einer Aufteilung um den geklemmten Rest. Eine **nachträgliche** Änderung an der Stärke der abgeteilten Einheit bricht P4 in dieser Fassung **nicht** — sie liegt in beiden Präfixen oder in keinem. Dass sie die Gesamtstärke der Lage hebt, ohne dass ein Hinweis greift, bleibt wahr und steht in §8.2; es ist aber keine Aussage über den Vorgang und deshalb keine Bedingung von P4. Die neunte Fassung führte sie als dritte Bedingung, und das war eine Verwechslung.

P7 ist neu gegenüber ZDM §4.4 und gehört in die DoD von M1.3. Ohne sie prüft P1 nur den vollen Fold, während im Betrieb jeder Client nach dem ersten Schnappschuss den anderen Weg geht.

Die beiden bedingten Zusagen sind als solche geführt. Eine unbedingte wäre entweder falsch oder schnitte den Test so zu, dass er nur widerspruchsfreie Eingaben sieht — das Schein-Grün, das Auflage 18 verbietet.

### §8.2 Nicht zugesichert

**Die Hinweiskette über mehr als zwei Schreiber.** Bei drei und mehr nebenläufigen Änderungen an demselben Feld bekommt nur die zweithöchste einen Hinweis (§3.3). Der Zustand ist richtig und konvergent; am Feld ist nicht ablesbar, dass drei Leute geschrieben haben. Der Weg dahin führt über die Größe jedes Schnappschusses.

**Die Vollständigkeit des Einsatztagebuchs auf einem Client mit Schnappschuss.** Es liest den Ereignisstrom (§5.9.1); ein Client, der aus einem Schnappschuss startet, liest die alten Ereignisse bei Bedarf nach. Solange der Einsatzordner vollständig ist, kostet das Zeit und keinen Inhalt — fehlt eine Datei, fehlt die Zeile. Die Aussage „N nachträgliche Einträge" (§7.3) hängt daran.

**Die Zahl der betroffenen Ereignisse nach einer Archivierung.** Der Zustand nennt die betroffenen **Entitäten und Felder**, nicht die Ereignisse.

**Ob eine gemeldete Stärke die eigene oder die Gesamtstärke ist.** Der Fold sieht ein `StaerkeGeaendert` und kann nicht erkennen, ob die Zahl darin den Zuwachs schon enthält. Bei der EEB-Übernahme ist das ein realer Fall, und §5.4.2 bindet dafür den **schreibenden Client**: Die Übernahme des Stärkefeldes wird nur angeboten, wenn die Einheit weder Zuwachs noch Abgang hat. Hält sich ein Client nicht daran, zählt der Zuwachs doppelt, und kein Hinweis greift.

**Die Gegenkorrektur nach einer Aufteilung.** Ändert jemand die Stärke der abgeteilten Einheit, weil er sich beim Abteilen verzählt hat, und zieht die Quelle nicht mit, steht die Lage zu hoch, und **kein Hinweis greift** (§5.4.3). Der Fold kann eine Korrektur nicht von einer neuen Meldung unterscheiden; beide sagen „hier sind neun“. Die Regel bindet den schreibenden Client. Sie ist **keine** Bedingung von P4 — der Vorgang selbst bleibt bilanzneutral —, sondern eine Lücke in der fachlichen Richtigkeit, wie die EEB-Übernahme.

**Fachliche Richtigkeit einer Meldung.** Der Fold entscheidet, welche Meldung gilt, nie welche stimmt. `vorgangSummeWeichtAb`, `staerkeGeklemmt`, `moeglicheDublette`, `unbekannterWert` und `meldezeitUnplausibel` sind für Menschen.

**Die Gesamtstärke, solange eine Einheit im Auffang liegt** oder ein Abschnittstyp unbekannt ist. Sie kann vorübergehend zu hoch sein (§5.3.3, §3.7). Zugesichert ist, dass keine gemeldete Stärke verschwindet — nicht, dass die Summe in jedem Zwischenstand stimmt.

**Vollständigkeit der Dublettenerkennung.** `einheitSchluessel` ist eine Heuristik.

**Der Empfangsvermerk einer doppelt eingegangenen Meldung.** `empfangenAm` und `quelle` gehen nach §3.6 nicht in den Inhaltsvergleich ein; bei zwei Eingängen desselben Bogens gilt der Vermerk der kleineren HLC, der andere ist ohne Hinweis weg (T54). Das ist gewollt — ein zweiter Scan derselben Meldung ist kein Befund —, kostet aber die Auskunft, über welchen Weg der Bogen zuerst kam.

**Die Zahl der wartenden Ereignisse einer fehlenden Anlage.** `anlageFehlt` nennt die Beobachtungen, die `wartend` hält (§3.10) — bei mehr als zwei Änderungen an demselben Feld nicht alle. Der Zustand ist richtig und konvergent; die verdrängte Beobachtung ist ohnehin ohne Wirkung.

**Erzwungene Modell-Invarianten.** Weder „höchstens eine Führungsstelle ohne Elternabschnitt" (§5.3.4) noch die Schichtpflicht (§5.7) noch ein Format der Anforderungs-Kennung (§5.6.1) werden erzwungen. Alle drei sind Warnungen der Oberfläche.

**Vier Zustandsteile ohne harte Schranke** (§3.2): die `verdraengt`-Listen der beiden Erstwert-Felder wachsen mit wiederholten Vorgängen an derselben Entität; `verworfeneAnlagen` und `verworfeneSchluessel` mit doppelt vergebenen Ids — im Normalbetrieb null, im Klon- oder Migrationsfall nicht; `archivierungen` bekommt je Rücknahme auf eine unbekannte Id einen dauerhaften Eintrag; `wartend` wächst mit den Entitäten, deren Anlage nie kommt (verlorenes Segment, Quarantäne). Alle vier sind klein und in der Praxis leer, aber keine ist nachweisbar beschränkt; `wartend` sammelt ein Client mit Quarantäne systematisch.

**P1, P2 und P3 gelten nicht über einer Ereignismenge mit doppelt vergebener Ereignis-Id** (§3.6). Die Auswahl hängt dort an der Eintreffreihenfolge, und das ist die einzige Stelle des Konzepts, an der das gewollt ist — die Alternative wäre eine Struktur im Zustand, die mit der Zahl der Ereignisse wächst. Der Hinweis `ereignisIdDoppeltVergeben` macht die Lage sichtbar; der Konvergenzvergleich behandelt sie wie eine Quarantäne.

**Reihenfolge innerhalb einer Wanduhr-Sekunde.** `wanduhr` ordnet nichts. Zwei Ereignisse mit derselben fachlichen Meldezeit und verschiedener HLC werden nach HLC geordnet.

---

## §9 Nachweis der Auflagen

| Auflage | Wo | Anmerkung |
|---|---|---|
| 4 · Mengenfold mit Rebase; HLC je Feld; Schnappschüsse tragen `foldVersion` | §3.1 bis §3.3, §3.9 | **Vollständig**, alle drei Teile. §3.9 setzt `foldVersion = 2` und nennt die Regel, wann sie steigt — einschließlich einer neuen Ereignisart |
| 6 · Vorher-Wert an jedem setzenden Ereignis; Abweichung ⇒ Hinweis | §2.2, §2.2a, §2.3, §3.8 | **Erfüllt, mit einer benannten Auslegung:** Drei Formen statt „drei Sätze ohne Ausnahme"; §2.3 nennt die Feldpfade der Anlagen unter ihren **Zustands**namen, sodass Anlage und Änderung dasselbe Feld treffen. §2.2a prüft die Abweichung gegen die **verdrängte Beobachtung**, nicht gegen den gefalteten Zustand — ein Vorher-Wert, den das Feld nie hatte, erzeugt ohne Verdrängung keinen Hinweis (T130). Als Auslegung 20 in §10 geführt |
| 10 · Zyklusregel; relative Stärkeänderung; **Auffangregel für aufgelöste Abschnitte** | §5.3.1, §5.4.2, §5.3.3 | **Erfüllt, aber mit einer begründeten Umkehrung:** §5.3.3 gibt dem aufgelösten Abschnitt **nicht** den Auffang, sondern das benannte Ziel der Auflösung; der Auffang bleibt dem *unbekannten* Abschnitt. Die Auflage nennt den umgekehrten Fall. Als Auslegung 14 in §10 geführt |
| 11 · Undo mit `undoOf`, Stapel je Client, `KorrekturVon`, kein Redo | §6 | **Vollständig.** Je Art nennt die Undo-Spalte, ob dieselbe Art mit `neu = vorher` genügt oder ein benanntes Gegenereignis nötig ist; die nicht rücknehmbaren haben je einen anderen benannten Weg (§5.9.2) |
| 12 · „Neueste Revision zählt" **definieren** (HLC entscheidet); Meldezeit plausibilisieren | §2.5, §2.6, §2.2a, §3.5 | **Erfüllt, mit einer Ergänzung und einer Einschränkung.** Die Einschränkung: Die Plausibilisierung läuft nur am Gewinner eines Feldes (§2.2a); eine unplausible Meldezeit, deren Meldung ihr Feld verloren hat, erzeugt keinen Hinweis. Als Auslegung 21 in §10 geführt. Die Ergänzung: HLC entscheidet jeden Konflikt; für die Reihenfolge der EEB-**Revisionen** gilt zusätzlich `stand`, weil ein nachgescannter Bogen von gestern sonst als aktuell gälte. Die Auflage nennt nur die HLC; als Auslegung 15 in §10 geführt |
| 13 · Ereignis nach der Archivierung, genau eine Behandlung; Ordnerverschiebung darf keinen Upload ins Leere laufen lassen | §7 | **Erste Hälfte vollständig**, mit Grabstein, Monotonie und der Auflösung des Widerspruchs zu ZDM §4.1 Regel 5. Die **zweite Hälfte ist Speicherseite** und dort erfüllt (KONZEPT-SPEICHER.md §5.7); dieses Dokument leistet sie nicht |
| 18 · Zählbares Abbruchkriterium; P1 keine Tautologie | §8.1, §11 | **Zählbar:** §11.1 nennt die Zahlen. Die Gegenprobe zu P1 läuft an diesem Katalog (T75), nicht nur an M0.2 |

### Was hier nur teilweise erfüllt ist

* **Auflage 4** ist erfüllt, die Hinweiskette aber auf zwei Beobachtungen begrenzt (§3.3, §8.2) — eine Entscheidung über die Größe des Zustands, keine Lücke im Nachweis.
* **Auflage 6** gilt für die Arten dieses Katalogs; für eine künftige Art erst, wenn ihr Feldpfad benannt ist. §2.2 macht das zur Bedingung jeder Erweiterung. Die beiden Erstwert-Felder sind von der Vorher-Prüfung ausgenommen (§2.2a); ihre inhaltliche Prüfung leistet `gesehen`.
* **P4, P6 und P7** sind die DoD von M1.3. Dieses Dokument liefert ihre Definition samt Bedingung.

---

## §10 Startwerte, Befunde und offene Punkte

### Startwerte

| Nr. | Wert | Startwert | Wo | Wogegen zu kalibrieren |
|---|---|---|---|---|
| S1 | Plausibilisierung von Ist-Zeiten | 12 Stunden, beide Richtungen | §2.5 | Erfahrung aus dem ersten geführten Einsatz |
| S2 | Format der Anforderungs-Kennung | keines; Freitext ohne Prüfung | §5.6.1 | Antwort der FüSt auf Frage 22 |
| S3 | Statusliste | neun bekannte Werte, Bereich offen | §3.7 | Antwort auf Frage 19. Hinzufügen kostet **keine Schemaversion** (die Nutzlast bleibt gültig), wohl aber eine `foldVersion` (§3.9); Entfernen zusätzlich einen Upcaster |
| S4 | Tiefe des Undo-Stapels N | 20 | §6 U3 | Bedienerfahrung |
| S5 | `WASSERWIRTSCHAFT`, Anzeige „HK/NLWKN" | wie am 2026-09-09 beschlossen | §3.7 | Antwort auf Frage 20; Aufspaltung wäre ein Upcaster aus `organisationName` |
| S6 | Vorbelegung `schichtmodell` | `ZWEI_SCHICHT` | §5.2 | Antwort auf Frage 21 |
| S7 | Obergrenze einer Entitäts-Id | 200 Zeichen | §5.1 | wird nicht gemessen; Plausibilitätsschranke |
| S8 | Plausibilisierung von Planwerten | 90 Tage nach der Wanduhr; Hinweis auch davor | §2.5 | Dauer der längsten geführten Lage |
| S9 | Kostenvorbelegungen | 180 € / 150 € / 20 € / 5 Tage | §5.2 | ZDM §3.2 aus der Excel |
| S10 | Umfang der Eigenschaftsprüfung | siehe §11.1 | §11.1 | Laufzeit in der CI |
| S11 | Vererbt ein Abschnitt seine Zählbarkeit an Unterabschnitte? | nein; jeder Abschnitt zählt nach seinem eigenen `typ` | §3.2 | offene Frage 3 aus ZDM §2.4 Nr. 6. Eine andere Antwort ändert eine Foldregel und kostet eine `foldVersion` |

### Befunde für Johannes — nicht durch dieses Dokument geändert

**B1 — `schemaVersion` ist nicht die Version des Rahmens.** KONZEPT-SPEICHER.md §2.4 beschreibt sie so; die DoD von M1.2 und ZDM §4.1 meinen die Nutzlast dieser Art. Dieses Konzept liest sie als Nutzlastversion (§4.1); der Rahmen ist über `manifest.json` versioniert, und die Speicherschicht reicht das Feld ohnehin nur durch. **Vorschlag:** den Satz in §2.4 ändern.

**B2 — Der Undo-Stapel in §4.4 ist zu eng.** „ein **eigenes** Ereignis mit passendem `undoOf`" → „ein Ereignis". §4.4 verweist die Semantik ausdrücklich hierher; die Änderung bleibt in seiner Absicht. Begründung in §6 U3.

**B3 — ZDM §4.1 Regel 5 widerspricht KONZEPT-SPEICHER.md §5.7.** §7.3 entscheidet für die Speicherfassung. **Vorschlag:** Regel 5 streichen oder mit Verweis versehen.

**B4 — Der Zustand wächst gegenüber M0.2 deutlich.** `zweiter` je Feld, `wanduhr` und `fachlicheZeit` je Beobachtung, die verworfenen Anlagen, die abgeleiteten Felder — grob geschätzt Faktor drei bis vier je Schnappschuss. KONZEPT-SPEICHER.md §7.5 kalibriert die Schnappschuss-Auslöser gegen die Erstlaufzeit, nicht gegen die Dateigröße. **Kein Handlungsbedarf vor M0.5**, aber die Messung dort sollte die Schnappschussgröße mitnehmen.

**B5 — `foldVersion` steigt künftig bei jeder Katalogerweiterung** (§3.9). Das heißt: Nach jedem Ausbau verwerfen alle Clients ihre Schnappschüsse einmal und falten voll. Bei den in KONZEPT-SPEICHER.md §7.5 geschätzten 20 bis 30 MB je Einsatz ist das ein spürbarer Erstlauf. **Vorschlag:** in M0.5 mitmessen; wird er zu lang, ist die Gegenmaßnahme nicht eine schwächere Versionsregel, sondern die dort bereits vorgesehene Annahme fremder Schnappschüsse (A7).

### Auslegungen, die das Zieldatenmodell nicht hergibt

1. **`abgeteiltVon` und `aufgegangenIn` als Felder der abgeleiteten Einheit** (§5.4.2, §5.4.3). ZDM §4.2 nennt `meldeZustand = AUFGEGANGEN` an der Quelle — aber `meldeZustand` ist nach §2.9 ein Merkmal der **Meldung**, und `Einheit` in §3.2 hat kein solches Feld. Sie führt für die Gegenrichtung `abgeteiltVonId`; dies ist das symmetrische Gegenstück.
2. **Zusammenführen je Quelle statt als Klumpen** (§5.4.3). ZDM nennt einen Gesamtwert `uebernommeneStaerke`, der sich nicht auf die einzelne Quelle zurückrechnen lässt und deshalb weder überlappende Quellmengen noch den Kreis trägt.
3. **`aufgegangenIn` ist monoton** (§5.4.3). ZDM sagt dazu nichts; ohne Monotonie zählt eine umgelenkte Quelle doppelt.
4. **Die Zusammensetzungsregel der wirksamen Stärke** (§5.4.2).
5. **Die drei Gegenereignisse der Anforderung und die fünf `…Wiederhergestellt`** (§5.6.2, §5.4.5). ZDM nennt sie in der Undo-Spalte, ohne ein Ereignis zu benennen.
6. **`ArchivierungZurueckgenommen`** (§7.4) — eine Art, die ZDM nicht kennt; KONZEPT-SPEICHER.md §5.7 setzt sie voraus, ohne sie zu benennen.
7. **`Einheit.einheitSchluessel`** (§5.4.4). ZDM führt den Schlüssel nur an der Meldung.
8. **`EinheitAufgeteilt` trägt die vollständige Anlage der neuen Einheit** (§5.4.2). ZDM nennt nur `teilEtikett` und `abgeteilteStaerke`.
9. **Der Bewegungsauftrag hat eine abgeleitete Id** (§5.6.3).
10. **Fünf Wertebereiche sind offen** (§3.7). ZDM führt sie als Aufzählungen.
11. **`EinsatzBeendet`, `PersonEntfernt` und `DienstpostenEntfernt` sind LWW/Feld** statt LWW/Entität (ZDM §4.2). Die Felder sind einwertig; das Ergebnis ist identisch, die Benennung genauer.
12. **`aufgeloestAm` und `hinzugefuegtAm` stehen in der Nutzlast** (§5.3.2, §5.8). ZDM führt sie als Entitätsfelder, ohne ein Ereignis zu nennen, das sie setzt.
13. **P7** (§8.1). ZDM §4.4 kennt P1 bis P6.
14. **Der Auffang gilt nicht für den aufgelösten Abschnitt** (§5.3.3). Auflage 10 nennt ihn ausdrücklich für diesen Fall; die Umkehrung ist begründet, weicht aber vom Wortlaut ab.
15. **`stand` als zweite Ordnung für EEB-Revisionen** (§2.6). Auflage 12 nennt allein die HLC.
16. **`AnforderungGeaendert` und `AbschnittBemerkungGesetzt`** sind neue Arten, die ZDM §4.2 nicht kennt; ohne sie wären `kennung`, `angefordertAm` und die Abschnittsbemerkung nach der Anlage unveränderlich.
17. **`fahrzeug.entferntAm` entfällt** (ZDM §3.2) zugunsten des Wahrheitswerts `entfernt`; der Zeitpunkt steht im Einsatztagebuch. **`fahrzeug.nutzlast` heißt `nutzlastText`,** weil `nutzlast` im Ereignisrahmen belegt ist.
18. **Freie Vokabularwerte erzeugen keinen `unbekannterWert`** (§3.7). ZDM §3.2 führt sie als `VokabularWert` einer geschlossenen Liste.
19. **Vier aus `bogen` abgeleitete Merkmale stehen nicht im Zustand** (§3.2). ZDM §3.2 führt sie an der Meldung.
20. **Die Vorher-Prüfung misst gegen die verdrängte Beobachtung, nicht gegen den gefalteten Zustand** (§2.2a). Auflage 6 spricht von der Abweichung schlechthin. Ein Wert, den niemandes Arbeit widerlegt, erzeugt keinen Hinweis; die Alternative hieße, je Feld die gesamte Beobachtungsfolge zu halten, und das verbietet §3.1.
21. **Wertbezogene Hinweise nur am Gewinner eines Feldes** (§2.2a). Auflage 12 verlangt den Hinweis bei großer Abweichung ohne Vorbehalt; eine verdrängte Meldung trägt ihn nicht, obwohl ihre Zeit im Zustand steht.
22. **P4 misst die Bilanzsumme, nicht die Gesamtstärke, und lässt Entfernen und unvollständige Präfixe aus** (§8.1). ZDM §4.4 formuliert die Summenerhaltung ohne Bedingung; über der Gesamtstärke ist sie unerfüllbar, sobald ein Abschnittstyp nicht mitzählt.

### Offen geblieben

| Punkt | Wer entscheidet |
|---|---|
| Fragen 19 bis 22 aus 04-OFFENE-ENTSCHEIDUNGEN.md | FüSt; bis dahin gelten S2, S3, S5, S6 |
| Offene Frage 3 aus ZDM §2.4 Nr. 6: Vererbung der Zählbarkeit | FüSt; bis dahin gilt S11. Blockiert M1.3 nicht, aber eine spätere Antwort kostet eine `foldVersion` |
| B1 bis B5 | Johannes; keiner blockiert M1.3 |
| Ob die Hinweiskette über mehr als zwei Schreiber gebraucht wird | Betrieb; Änderung an der Schnappschussgröße |
| Die Schwellen S1 und S8 | erster geführter Einsatz |
| Schnappschussgröße und Erstlaufzeit nach B4 und B5 | Messung M0.5 |

---

## §11 Verzeichnis der Prüffälle

### §11.1 Die zählbaren Größen (Auflage 18)

Startwerte (S10), gegen die Laufzeit in der CI zu kalibrieren:

| Prüfung | Umfang | Abbruchkriterium |
|---|---|---|
| **P1** (T75) | mindestens **500 Permutationen** je Menge, mindestens **200 Mengen** von je **40 bis 120 Ereignissen**, die zusammen **jede Ereignisart mindestens zehnmal** enthalten | eine einzige abweichende Serialisierung ist ein Fehlschlag |
| **P2** (T81) | dieselben Mengen, jedes Ereignis doppelt | dito |
| **P3** (T87) | dieselben Mengen, zwei unabhängig aufgebaute Faltungen | Vergleich über den `zustandsHash` |
| **P4** (T20, T26, T145) | mindestens **100 Mengen** mit je zwei bis fünf Aufteilungen und Zusammenführungen, darunter Mengen mit entfernten Einheiten, mit nicht zählenden Abschnitten und mit vorauslaufenden Uhren | je strukturellem `e`: `Bilanzsumme(falte(P(e) ∪ {e})) = Bilanzsumme(falte(P(e)))`, sofern die drei Bedingungen aus §8.1 gelten — kein `vorgangSummeWeichtAb` einer Zusammenführung, kein `staerkeGeklemmt`, kein `fremdreferenzUnbekannt` an einem Strukturfeld, kein Kreis-Hinweis und keine entfernte beteiligte Einheit. Ein Aufteilungs-`vorgangSummeWeichtAb` ist **kein** Ausschlussgrund — läuft die Prüfung auch über ihn hinweg nicht durch, ist das ein Fehlschlag (T20). Wie viele Ereignisse je Menge übersprungen werden, ist mitzuzählen: Überspringt die Prüfung mehr als ein Fünftel, ist der Mengengenerator zu schwach und die Prüfung wertlos |
| **P5** (T95) | alle Mengen aus P1 | keine Einheit in einem unbekannten oder aufgelösten Abschnitt |
| **P6** (T46) | alle Permutationen **und alle Präfixe** je Menge | Zustand nie `≠ EINGETROFFEN` nach einem `AnforderungErledigt` ohne jüngeres Gegenereignis |
| **P7** (T77) | für jede Menge aus P1 **jeder** Schnitt: Präfix falten, serialisieren, laden, Rest falten | Zustand gleich dem vollen Fold, einschließlich Hinweisen |

**Warum P1 keine Tautologie ist.** Der Fold sortiert nirgends (Modulkopf von `fold.ts`). T75 fügt die Gegenprobe für diesen Katalog hinzu: Wird in den Akkumulator eine Sortierung nach Eintreffreihenfolge eingebaut, muss T75 fallen. Ein Test, der auch mit dieser Mutation grün bleibt, prüft die Eigenschaft nicht.

### §11.2 Zuordnung Regel → Prüffall

| Regel | § | Prüffälle |
|---|---|---|
| Drei Formen von `vorher`/`neu` | §2.2 | T78, T79, T80 |
| Prüfung des Vorher-Werts, vier Grenzfälle | §2.2a | T119, T130, T131, T135, T138 |
| Wertbezogene Hinweise nur am Gewinner | §2.2a, §2.5, §3.7 | T148 |
| Anlagen belegen Zustandsfeldpfade | §2.3 | T82, T13 |
| `grund` bei neun Arten Pflicht | §2.4 | T83 |
| Plausibilisierung, drei Zeitklassen | §2.5 | T84, T85, T86 |
| Zwei Ordnungen (Konflikt und Revision) | §2.6 | T55, T56 |
| Zustandsgebundenheit (P7) | §3.1 | T77, T6, T12, T24, T71 |
| P4 über der Bilanzsumme und über Präfixe | §8.1, §11.1 | T20, T26, T145, T149, T152, T153 |
| Der Zustand ist vollständig beschrieben | §3.2 | T76, T87, T18 |
| Erstwert-Akkumulator mit verdrängten Beobachtungen | §3.3 | T108 |
| Ein nie gesetztes Feld fehlt | §3.2 | T109 |
| Zweite Beobachtung im Zustand | §3.3 | T88 |
| Tie-Break, LWW-Richtung | §3.5 | T89 |
| Tie-Break, Anlage-Richtung | §3.5 | T90 |
| Idempotenz über die Ereignis-Id | §3.6 | T81 |
| Idempotenz über den Inhaltsschlüssel | §3.6 | T52, T53, T54, T142 |
| Idempotenz über den Fachvorgang | §3.6 | T25, T28 |
| Unbekannte Art, Version, Feld, Nutzlast, Wert | §3.7 | T91, T92, T93, T94, T16 |
| Rückfall je offenem Wertebereich | §3.7 | T16, T94 |
| Hinweise werden neu gerechnet | §3.8 | T65, T88, T96 |
| `foldVersion` steigt auch bei neuer Art | §3.9 | T97 |
| Wartende Beobachtung, `anlageFehlt` | §3.10 | T98, T144 |
| Unbekannte Fremdreferenz | §3.10 | T99, T15 |
| Unbekanntes Ziel bzw. unbekannte Quelle eines Vorgangs | §5.4.2a, §3.10 | T133 |
| Zweite Anlage: kleinste HLC, belegt keinen Feldpfad | §3.11 | T1, T90, T100, T143 |
| Der (c)-Teil einer verdrängten Aufteilung wirkt weiter | §3.11 | T146 |
| Inhaltsschlüssel-Arten folgen §3.6, nicht §3.11 | §3.11, §3.6 | T52, T147 |
| Gefaltet, aber wirkungslos | §3.12 | T44, T45, T29, T68, T110 |
| Anlage verdrängt ohne Vorher-Wert | §2.3 | T106 |
| Gleiche Ereignis-Id, verschiedener Inhalt | §3.6 | T107 |
| Summanden wirken ohne HLC-Bedingung | §5.4.2 | T21, T22, T111, T112, T115 |
| Doppelt vergebene Ereignis-Id | §3.6 | T107, T117 |
| `art` in `verworfeneSchluessel` | §3.6, §5.3.4 | T136 |
| Ordnung der Listen im Zustand | §3.2 | T118 |
| Gesehener Vorher-Wert `null` | §3.2 | T119 |
| Rücknahme benennt Id und HLC | §7.2 | T114, T116, T122 |
| `zurueckgenommenDurch` ist immer eine Liste | §7.2 | T137 |
| EEB-Übernahme bei Zuwachs | §5.4.2 | T120 |
| Vergleichsgröße von `gesehen`, Rückrechnung vor der Klemmung | §5.4.3 | T121, T126, T134, T27, T20, T124, T133, T23, T150 |
| Wann ein Summand wirkt | §5.4.2a | T123, T124, T125, T126, T127, T39 |
| Reihenfolge der vier Bedingungen: (3), (4), dann (1) und (2) | §5.4.2a | T132, T140 |
| Zwei getrennte Kreisgraphen | §5.4.2a | T139 |
| Entfernen nimmt zugewachsene Kräfte mit, in beide Richtungen | §5.4.2a | T141, T152 |
| Tie-Break der Kreisauflösungen | §5.3.1, §5.4.2a, §5.4.3 | T128 |
| Stärkesummen lesen die wirksame Stärke | §1.2 | T129 |
| Übernommene Fahrzeuge und Personen wechseln mit | §5.4.2 | T113 |
| Rücknahme wirkt nur auf kleinere HLC | §7.2 | T114 |
| Upcaster rein und zustandsblind | §4.2 | T101 |
| Beim Spiegeln keine Upcaster | §4.3 | T102 |
| Einsatz: Anlage, Beenden, Wiedereröffnen | §5.2 | T1, T2 |
| Zyklusregel | §5.3.1 | T3, T4, T5, T6 |
| Aufgelöster Abschnitt, Kette, Ziel-LWW | §5.3.2 | T7 bis T12 |
| Auffang nur für den unbekannten Abschnitt | §5.3.3 | T13, T14, T16 |
| Fahrzeuge gehen nicht in den Auffang | §5.3.3 | T15 |
| Systemabschnitte, reservierte Ids | §5.3.4 | T17, T18 |
| Stärke ist ein Tripel | §5.4.1 | T19 |
| Relative Änderung, Klemmung, Vorgangsidempotenz | §5.4.2 | T20 bis T25 |
| Zusammenführen je Quelle, Monotonie, Kreis | §5.4.3 | T26 bis T32 |
| Mögliche Dublette (Einheit) | §5.4.4 | T33 bis T36 |
| Entfernen ist kein Löschen | §5.4.5 | T37, T38, T39 |
| Listen sind ein Wert | §5.5 | T40 |
| Personen ändern die Stärke nicht | §5.5 | T41 |
| Kennung ist ein Etikett | §5.6.1 | T42, T43 |
| Zustandsmaschine, P6 | §5.6.2 | T44 bis T47 |
| Bewegungsauftrag mit abgeleiteter Id | §5.6.3 | T48, T49 |
| Schichtplan-Schlüssel ist ein Paar | §5.7 | T50, T51 |
| Empfang ist eine Tatsache, Revisionsordnung | §5.8.1 | T52 bis T56 |
| Übernahme erzeugt Feldereignisse | §5.8.2 | T57 |
| Tagebuch ist Stromprojektion | §5.9.1 | T103 |
| `KorrekturVon` nur für setzende Arten | §5.9.2 | T58, T59, T60, T151 |
| U1 kein Sonderpfad | §6 | T61 |
| U2 drei Klassen | §6 | T7, T20, T47 |
| U3 Stapel je Client | §6 | T62, T63 |
| U4 Korrektur ist kein Undo | §6 | T58 |
| U5 kein Redo | §6 | T104 |
| U6 Undo gegen Fremdänderung | §6 | T64, T65, T66, T67 |
| Maßgebliche Archivierung, Grabstein, Monotonie | §7.2 | T68, T71, T72 |
| Ereignis nach der Archivierung wirkt | §7.3 | T69 |
| Rücknahme der Archivierung | §7.4 | T70, T73, T74 |
| P1 über den vollen Katalog | §8.1 | T75 |
| P5 | §8.1 | T95 |
| Sekundärsortierung bei gleicher Reihenfolge | §5.3 | T105 |

### §11.3 Die Fälle, die nicht bei einer einzelnen Ereignisart stehen

**T75 (P1)** Jede Permutation ergibt denselben `zustandsHash`; mit einer Sortierung nach Eintreffreihenfolge im Akkumulator fällt der Fall.
**T76** Für jede Menge aus P1 gilt: Der Zustand enthält kein Feld, das §3.2 nicht nennt — geprüft über einen Schemavergleich der Serialisierung.
**T77 (P7)** Für jede Menge und jeden Schnitt: Präfix falten, serialisieren, laden, Rest falten ⇒ gleicher Zustand einschließlich Hinweisen.
**T78** Ein Ereignis der Form (a) ohne `neu` ⇒ ungültig (§3.7 Punkt 4).
**T79** Eine Anlage **mit** `neu` ⇒ ungültig.
**T80** `neu = null` auf einem Override hebt ihn auf; ein nie gesetztes Feld hat `vorher` abwesend; beide sind in der Serialisierung unterscheidbar.
**T81 (P2)** Dieselbe Menge zweimal gefaltet ⇒ identischer Zustand und identische Hinweise.
**T82** `AbschnittAngelegt` (Nutzlastfeld `typ`) und `AbschnittTypGeaendert` treffen **denselben** Feldpfad ⇒ eine Typänderung mit passendem `vorher` erzeugt keinen Hinweis, eine mit unpassendem erzeugt `vorherPasstNicht`. Dasselbe für `EinsatzAngelegt.kosten` gegen `KostenParameterGeaendert`.
**T83** Jede der neun Arten aus §2.4 ohne `grund` ⇒ Schemafehler. Jede andere ohne `grund` ⇒ gültig, `DienstpostenEntfernt` und `AnhangEntfernt` eingeschlossen.
**T84** `StaerkeGeaendert` mit `meldezeit` 30 Stunden vor der Wanduhr ⇒ `meldezeitUnplausibel` **am Stärkewert**; mit 6 Stunden ⇒ kein Hinweis.
**T85** `zugesagtFuer` einen Tag in der Zukunft ⇒ **kein** Hinweis; 120 Tage danach oder ein Tag davor ⇒ Hinweis.
**T86** `stand` und `empfangenAm` einer Meldung, beliebig weit von der Wanduhr entfernt ⇒ **nie** ein Hinweis.
**T87 (P3)** Zwei unabhängig aufgebaute Faltungen derselben Menge ⇒ gleicher `zustandsHash`.
**T88** e1(HLC 1, neu A), e3(HLC 3, vorher A, neu C), Schnappschuss, danach e2(HLC 2, neu B) ⇒ `vorherPasstNicht` entsteht — beim vollen Fold wie beim Rebase.
**T89** Zwei LWW-Ereignisse identischer HLC, verschiedene Ids ⇒ die größere Id gewinnt.
**T90** Zwei Anlagen identischer HLC ⇒ die kleinere Id gilt.
**T91** Unbekannter `typ` ⇒ nicht gefaltet, geführt, Originalbytes unverändert.
**T92** Bekannte Art, `schemaVersion` über der eigenen ⇒ ebenso; kein Downcaster.
**T93** Zusätzliches unbekanntes Nutzlastfeld ⇒ gefaltet, ignoriert, beim Spiegeln mitgeführt.
**T94** `EinheitGemeldet` mit einem zehnten Statuswert ⇒ Einheit vollständig im Zustand, Wert unverändert gespeichert, `unbekannterWert`, zählt in der Gesamtstärke, in keinem Statuseimer.
**T95 (P5)** Für alle Mengen aus P1 zeigt keine Einheit auf einen nicht existierenden oder aufgelösten Abschnitt.
**T96** Ein `fremdreferenzUnbekannt` und ein `anlageFehlt` verschwinden ohne Zutun, sobald die fehlende Entität eintrifft — auch nach einem Schnappschuss.
**T97** Zwei Clients mit derselben Ereignismenge, einer kennt eine Ereignisart mehr ⇒ ihre `foldVersion` unterscheidet sich, und der Konvergenzvergleich meldet „nicht vergleichbar" statt „Fehler".
**T98** `StaerkeGeaendert` ohne `EinheitGemeldet` ⇒ die Einheit erscheint nicht, zählt nicht, ein `anlageFehlt`; trifft die Anlage nach, steht der Wert da.
**T99** `PersonHinzugefuegt` mit unbekannter `einheitId` ⇒ die Person erscheint, `fremdreferenzUnbekannt`.
**T100** Zwei inhaltsgleiche Anlagen derselben Id ⇒ die kleinere HLC gilt, die andere steht in `verworfeneAnlagen`, und `zweiteAnlageVerworfen` entsteht auch bei Inhaltsgleichheit (§3.11).
**T101** Ein Upcaster, zweimal auf dieselbe Nutzlast angewandt, liefert dasselbe Ergebnis und liest keinen Zustand.
**T102** Ein Client spiegelt ein Ereignis niedrigerer Version weiter ⇒ die geschriebenen Bytes sind identisch mit den gelesenen.
**T103** Drei Änderungen an demselben Feld ⇒ der Zustand trägt zwei Beobachtungen, das aus dem Ereignisstrom gerenderte Tagebuch drei Zeilen.
**T104** Es existiert kein Rahmenfeld und keine Ereignisart für Redo — Prüfung am Schema.
**T106** `EinheitVerschoben` (HLC 5) und `EinheitGemeldet` (HLC 9) derselben Einheit ⇒ die Anlage gewinnt `abschnittId`, `ohneVorherWertVerdraengt` mit dem verdrängten Abschnitt; setzt die Anlage denselben Abschnitt, entsteht kein Hinweis.
**T107** Zwei verschiedene Ereignisse mit derselben `id` (geklontes Profil) ⇒ das **zuerst gefaltete** gilt, das andere steht in `verworfeneSchluessel`, und `ereignisIdDoppeltVergeben` entsteht. Der Prüffall erwartet **kein** permutationsstabiles Ergebnis: §8.2 setzt P1 bis P3 über solchen Mengen ausdrücklich aus, und der Konvergenzvergleich meldet „nicht vergleichbar".
**T108** Drei Zusammenführungen derselben Quelle (HLC 5, 7, 9) ⇒ die mit HLC 5 gilt, die beiden anderen stehen als `verdraengt` und erzeugen je einen Wirkungslos-Hinweis; auch nach einem Schnappschuss.
**T109** Ein Einsatz, in dem nichts entfernt und nichts beendet wurde ⇒ die Felder `entfernt`, `ende`, `storno`, `zurueckgenommen` fehlen in der Serialisierung, statt mit einem erfundenen Anfangswert darin zu stehen.
**T110** `EinheitWiederhergestellt` auf eine aufgegangene Einheit ⇒ sie zählt weiterhin nicht (sie ist aufgegangen), **aber** ihr Zuwachs wirkt beim Ziel wieder (§5.4.2a Nr. 1): Die Wiederherstellung ändert den abgeleiteten Zustand und ist deshalb **nicht** wirkungslos.
**T111** `wirksameStaerke` ist unabhängig von der HLC-Reihenfolge zwischen `staerke` und den Vorgängen — geprüft über alle Permutationen einer Menge aus Anlage, zwei Meldungen, einer Aufteilung und einer Zusammenführung.
**T112** Zusammenführung nach Z (HLC 400), danach `EinheitGemeldet(Z)` (HLC 500) ⇒ der Summand zählt.
**T115** Zusammenführung nach Z (HLC 200), danach `StaerkeGeaendert(Z)` (HLC 300) von einem Client, der sie nicht gesehen hat ⇒ der Summand zählt ebenfalls; keine gemeldete Kraft geht verloren.
**T113** Aufteilung mit `uebernommeneFahrzeuge` ⇒ `fahrzeug/<id>/einheitId` zeigt auf die neue Einheit; ist das Fahrzeug unbekannt, wartet die Beobachtung und wirkt beim Eintreffen.
**T114** `ArchivierungZurueckgenommen` mit einem `archivierungHlc`, das zu keiner Archivierung passt ⇒ sie wirkt nicht, `wirkungslosGegenTerminalzustand`; wird später unter derselben Ereignis-Id eine Archivierung mit **anderer** HLC geschrieben, gilt sie.
**T116** Archivierung HLC 9, Rücknahme HLC 5 mit passendem `archivierungHlc` ⇒ der Einsatz ist offen; die kleinere HLC der Rücknahme ändert daran nichts.
**T117** Zwei verschiedene Ereignisse mit derselben Id ⇒ `ereignisIdDoppeltVergeben`; der Konvergenzvergleich meldet „nicht vergleichbar" statt eines Fehlers.
**T118** Drei verdrängte Beobachtungen eines Erstwert-Feldes, in zwei Reihenfolgen eingelesen ⇒ gleiche Serialisierung, weil die Liste nach HLC und Ereignis-Id geordnet ist.
**T120** Übernahme des Feldes `staerke` aus einem Bogen bei einer Einheit mit Zuwachs ⇒ der Client bietet sie nicht automatisch an, sondern zeigt Bogenstand und eigene Stärke nebeneinander (Prüfung am schreibenden Client, nicht am Fold).
**T121** Einzelne fehlerfreie Aufteilung (`gesehen` = Stand vor dem Abteilen) ⇒ **kein** `vorgangSummeWeichtAb`; die eigene `abgeteilteStaerke` fällt aus der Vergleichsgröße heraus. Eine **zweite, spätere** Aufteilung derselben Quelle mit dem inzwischen richtigen `gesehen` ⇒ ebenfalls keiner; mit dem alten `gesehen` ⇒ Hinweis. Die Mutation, die die eigene `abgeteilteStaerke` **nicht** herausrechnet, muss den ersten Teil fallen lassen.
**T122** Rücknahme mit `archivierungHlc`, Schnappschuss, danach trifft die Archivierung ein ⇒ derselbe Zustand wie beim vollen Fold, für eine passende wie für eine unpassende HLC.
**T123** X (0/0/5) geht in Z auf, danach `EinheitEntfernt(X)` ⇒ `wirksame(Z)` sinkt um 0/0/5.
**T124** `abgeteiltVon` einer Einheit, deren `angelegtDurch` eine andere Anlage ist ⇒ der Abzug wirkt nicht; `zweiteAnlageVerworfen` steht, und **kein** `vorgangSummeWeichtAb` — die Vergleichsgröße rechnet nur wirksame Abzüge heraus (§5.4.3).
**T125** Aufteilungskreis A→B, B→A ⇒ die Kante mit der größeren HLC wirkt nicht, `aufteilungKreis`, Gesamtstärke unverändert.
**T126** U (0/0/10) geht in Z auf (`gesehen` 0/0/10), danach wird U um 0/0/4 aufgeteilt ⇒ die Vergleichsgröße der **Zusammenführung** ist 0/0/6 und passt nicht mehr, `vorgangSummeWeichtAb` an `einheit/U/staerke`. Die Summe ist erkennbar falsch (14 statt 10), und P4 ist über dieser Menge nach §8.1 ausgesetzt. Die Mutation, die fremde Abgänge aus der Vergleichsgröße nimmt, muss diesen Fall fallen lassen.
**T127** `EinheitAufgeteilt` mit `quellEinheitId = neueEinheitId` ⇒ ungültige Nutzlast.
**T128** Zwei Kreiskanten mit identischer HLC ⇒ die größere Ereignis-Id weicht, auf jedem Client dieselbe.
**T119** `AbschnittBemerkungGesetzt(neu = null, vorher = null)` gegen ein nebenläufiges mit einem Wert ⇒ `vorherPasstNicht`, derselbe Hinweis auch nach einem Schnappschuss.
**T130** Gewinner mit `gesehenerVorher`, aber ohne zweithöchste Beobachtung ⇒ **kein** Hinweis, auch wenn der behauptete Wert nie im Feld stand.
**T131** `gesehenerVorher = { wert: null }` gegen eine zweithöchste Beobachtung mit Wert ⇒ `vorherPasstNicht`; ohne zweithöchste ⇒ kein Hinweis.
**T132** A→B (HLC 5), B→A (HLC 9), dazu `EinheitEntfernt(A)` ⇒ die Kreisauflösung läuft **vor** den Wirksamkeitsbedingungen: B→A weicht, `zusammenfuehrungKreis`, B bleibt eigenständig und zählt. Die Mutation, die (1) zuerst laufen lässt, muss den Fall fallen lassen — dort verschwände B's Stärke.
**T133** Zusammenführung auf ein `zielEinheitId`, das dieser Client nicht kennt ⇒ die Quelle zählt **weiter**, `fremdreferenzUnbekannt` an `einheit/<quellId>/aufgegangenIn`; trifft die Anlage des Ziels ein, wandert die Stärke, der Hinweis fällt weg. Symmetrisch: Aufteilung mit unbekannter `quellEinheitId` ⇒ der Abzug wirkt nicht, `fremdreferenzUnbekannt` an `einheit/<neueId>/abgeteiltVon`, **kein** `vorgangSummeWeichtAb` (der Vergleich unterbleibt, §5.4.3), keine Kraft verschwindet.
**T134** X (0/0/10) wird um 0/0/3 aufgeteilt, danach geht X mit `gesehen` 0/0/7 in Z auf ⇒ **kein** Hinweis, Gesamtstärke 0/0/10. Mit `gesehen` 0/0/10 ⇒ `vorgangSummeWeichtAb`. Die siebte Fassung kehrte beides um.
**T135** Zwei Zusammenführungen derselben Quelle in verschiedene Ziele ⇒ genau **ein** `wirkungslosGegenTerminalzustand` für die verdrängte, **kein** `vorherPasstNicht` und **kein** `ohneVorherWertVerdraengt`: Die Erstwert-Felder sind von der Vorher-Prüfung ausgenommen (§2.2a).
**T136** Je ein Eintrag aus doppelt vergebener Ereignis-Id, aus widersprochenem Inhaltsschlüssel und aus einer Anlage auf `AUFFANG` ⇒ drei Einträge in `verworfeneSchluessel` mit verschiedenem `art`, und drei Hinweisarten, ohne dass die Form des Schlüssels ausgewertet wird.
**T137** Archivierter Einsatz ohne jede Rücknahme ⇒ `archivierungen[<id>].zurueckgenommenDurch` ist `[]` und steht in der Serialisierung; zwei Clients haben denselben `zustandsHash`.
**T138** Aufteilung mit `uebernommeneFahrzeuge`, bei der `gesehenEinheitId` fehlt ⇒ `gesehenerVorher = { wert: null }`; gegen eine zweithöchste Beobachtung mit Einheit entsteht `vorherPasstNicht`, nicht `ohneVorherWertVerdraengt`.
**T139** U (0/0/10) wird um 0/0/4 nach V abgeteilt (HLC 20), danach geht U in V auf (HLC 30) ⇒ **kein** Kreis, `wirksame(V)` = 0/0/10, U aufgegangen, ein zählendes Objekt, keine Hinweise. Die Mutation, die beide Kantenarten in **einen** Graphen legt, muss den Fall fallen lassen.
**T140** U gemeldet (HLC 1); Aufteilung `V→U` (HLC 5, ihr `abgeteiltVon` ist nach (3) unwirksam); Aufteilung `U→V` (HLC 9, wirksam) ⇒ kein `aufteilungKreis`, `wirksame(U)` = 0/0/7, `wirksame(V)` = 0/0/3, Gesamtstärke 0/0/10. Läuft die Kreissuche vor (3), fällt die wirksame Kante und die Summe steht bei 13.
**T141** X (0/0/5) geht in Y (0/0/15) auf, Y geht in Z auf (`gesehen` 0/0/20), danach `EinheitEntfernt(Y)` ⇒ Z sinkt um 0/0/20, und es entsteht `entfernungNimmtZugewachsenes` an `einheit/Y/entfernt` mit X und dessen Zahlen. Ohne den Hinweis verschwänden X's fünf still.
**T142** Zwei `EebMeldungEmpfangen` mit derselben `meldungId` und demselben Bogen, dazwischen ein `EebMeldungZugeordnet`, das `einheitSchluessel` ändert ⇒ in **beiden** Reihenfolgen kein `inhaltsschluesselWidersprochen` und ein leeres `verworfeneSchluessel`; derselbe `zustandsHash`.
**T143** Aufteilung U (0/0/10) → V (0/0/3, HLC 100), danach `EinheitGemeldet(V, 0/0/9)` (HLC 150) ⇒ `V.staerke` bleibt 0/0/3, `zweiteAnlageVerworfen` mit dem Inhalt 0/0/9, Gesamtstärke 0/0/10. Die verdrängte Anlage belegt keinen Feldpfad.
**T144** Drei `StaerkeGeaendert` (HLC 3, 5, 7) auf eine Einheit ohne Anlage ⇒ `anlageFehlt` nennt genau die beiden Ids, die `wartend` hält; derselbe Hinweis nach einem Schnappschuss.
**T145 (P4 gegen Zählbarkeit):** Eine Einheit (0/0/10) liegt in einem Abschnitt vom Typ `ANGEFORDERT` und geht in eine Einheit im `EINSATZORT` auf ⇒ die **Gesamtstärke** steigt um 0/0/10, die **Bilanzsumme** bleibt gleich. Kein Bruch von P4; eine Prüfung über der Gesamtstärke meldete einen.
**T146** Aufteilung U→V, deren Anlage gegen ein früheres `EinheitGemeldet(V)` verliert, mit `uebernommeneFahrzeuge` ⇒ `V.staerke` stammt aus der früheren Anlage, `V.abgeteiltVon` ist **gesetzt** und nach (3) unwirksam, `fahrzeug/F1/einheitId` zeigt auf V, und es steht **genau ein** Hinweis: `zweiteAnlageVerworfen`. Kein `wirkungslosGegenTerminalzustand` — §3.12 zählt seine Stellen abschließend auf.
**T150** U (0/0/3), Aufteilung um 0/0/8 ⇒ `staerkeGeklemmt`, rechnerisch 0/0/−5. Eine Zusammenführung dieser Quelle mit `gesehen` 0/0/0 ⇒ **zusätzlich** `vorgangSummeWeichtAb`; verglichen wird gegen den rechnerischen Wert, nicht gegen die geklemmte Null.
**T151** `KorrekturVon` mit `zielTyp = "EinheitZusammengefuehrt"` oder `"EinheitAufgeteilt"` ⇒ ungültige Nutzlast, nicht gefaltet, unter `unbekannt` geführt.
**T152 (P4 gegen Entfernen):** X (0/0/5) wird entfernt und geht nebenläufig in Y (0/0/15) auf ⇒ der Summand fällt nach (1), Y bleibt 0/0/15, und `entfernungNimmtZugewachsenes` steht an `einheit/X/entfernt` mit dem Ziel Y. P4 prüft dieses `e` **nicht**: Eine berührte Einheit ist entfernt. Ohne die Ausnahme meldete die Prüfung einen Bruch, ohne den Hinweis verschwänden fünf gemeldete Kräfte lautlos.
**T153 (P4 gegen vorauslaufende Uhr):** `EinheitGemeldet(U)` mit HLC 4600000, `EinheitAufgeteilt(U→V, 0/0/3)` mit HLC 4000000 von einem Client, dessen Uhr nachgeht ⇒ der Fold rechnet über der vollen Menge richtig (U 0/0/7, V 0/0/3), aber `P(e)` kennt U nicht: `fremdreferenzUnbekannt` steht, und P4 überspringt das Ereignis. Eine Prüfung ohne diese Bedingung meldete einen Bruch.
**T147** Zwei `EebMeldungEmpfangen` mit derselben `meldungId` und gleichem Inhalt ⇒ **kein** `zweiteAnlageVerworfen`; §3.6 gilt, nicht §3.11. Bei abweichendem `rohPayload` und sonst gleichen Feldern ⇒ `inhaltsschluesselWidersprochen`.
**T148** Eine unplausible Meldezeit und ein unbekannter Statuswert stehen nur an der **zweithöchsten** Beobachtung eines Feldes ⇒ **kein** `meldezeitUnplausibel`, **kein** `unbekannterWert`; wird der Gewinner später verdrängt, entstehen sie.
**T149** Kette U → V → W aus zwei Aufteilungen ⇒ Bilanzsumme nach jedem Präfix gleich; die Prüfung „dieselbe Menge ohne das mittlere Ereignis" bräche hier, die Präfixfassung nicht.
**T129** Eine Menge mit Aufteilungen, Zusammenführungen, entfernten und aufgegangenen Einheiten ⇒ die Gesamtstärke der Lage ist die Summe von `wirksameStaerke` über die Einheiten mit `zaehlt`, nicht von `staerke`.
**T105** Zwei Abschnitte gleicher `reihenfolge` und zwei Einheiten gleicher `reihenfolge` ⇒ Ausgabereihenfolge nach Entitäts-Id, auf jedem Client gleich.
