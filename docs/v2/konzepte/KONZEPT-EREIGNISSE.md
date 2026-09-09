# KONZEPT-EREIGNISSE — Ereigniskatalog, Konfliktregeln, Undo

Stand: 2026-09-09 · Paket M1.2 · Status: **Entwurf, dritte Fassung nach vier Gutachten**

Verbindliche Grundlagen: [KONZEPT-SPEICHER.md](KONZEPT-SPEICHER.md) (freigegeben am 2026-09-08), [03-MEILENSTEINE.md](../03-MEILENSTEINE.md) Auflagen 4, 6, 10, 11, 12, 13 und 18, [02-ZIELBILD.md](../02-ZIELBILD.md). Fachliche Quelle: `docs/v2-arbeitsstand/entwurf/zieldatenmodell-feldabgleich.md` §2 bis §4 — im Folgenden **ZDM**. Stand des Codes: `packages/domaene/src/{ereignis,fold,zustand}.ts` aus M0.2.

Dieses Dokument ist die Spezifikation, gegen die M1.3 gebaut wird. Code-Kommentare in `@s1/domaene` verweisen auf seine Paragraphen. Wo eine Zahl erst durch eine Antwort der Führungsstelle oder eine Messung bestimmt wird, steht ein **Startwert** mit Begründung und in §10 sein Eintrag.

---

## §1 Zweck, Geltungsbereich und Abgrenzung

### §1.1 Was dieses Konzept festlegt

Welche Ereignisarten es gibt, welche Nutzlast jede trägt, welches Zustandsfeld sie setzt, mit welcher Regel ein Konflikt entschieden wird — und **den Zustand selbst**, den KONZEPT-SPEICHER.md §7.2 serialisiert. Der letzte Punkt ist keine Zugabe: Ohne vollständig aufgeschriebenen Zustand erfinden zwei Implementierungen zwei Strukturen, und der Konvergenzvergleich aus §7.6 dort vergleicht dann Äpfel mit Birnen.

Aufbau: der fachliche Teil des Rahmens (§2), Zustand und allgemeine Regeln (§3), Nutzlastversionen und Upcaster (§4), der Katalog (§5), Undo U1 bis U6 (§6), die Barriere `EinsatzArchiviert` (§7), Zusicherungen und Grenzen (§8).

### §1.2 Was dieses Konzept nicht festlegt

**Kennzahlen und Excel-Formeln.** Welche Summe über welche Menge läuft (ZDM §3.3, K1 bis K24), gehört zu M1.3. Hier steht, welcher Wert im Zustand steht, wer ihn gesetzt hat und **ob eine Entität mitzählt** (`zaehlt`, §3.2) — die Zählbarkeit ist Teil des Zustands, weil mehrere Konfliktregeln sie bestimmen. Wie aus den zählenden Entitäten eine Summe wird, steht hier nicht.

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

**(b) Anlage.** Sie legt eine Entität an und setzt **alle** ihre Felder auf einmal. Ihre Werte stehen in der **Nutzlast** — dort und nirgends sonst, denn ein einzelnes `neu` könnte sie nicht tragen. `vorher` ist abwesend: Es gab nichts zu sehen. Welche Feldpfade sie belegt, steht in §2.3.

**(c) Setzendes Ereignis auf mehrere Entitäten.** Nur zwei Arten: `EinheitAufgeteilt` und `EinheitZusammengefuehrt`. Sie sind ein Fachvorgang, der mehrere Einheiten zugleich betrifft; ihn zu zerlegen hieße, dass ein Teil verlorengehen könnte. Für sie gilt: **je betroffener Entität genau ein Feld**, und der Wert je Entität steht in der Nutzlast unter der Kennung dieser Entität. Ihre Prüfangaben (`gesehen`) sind **kein** `vorher` im Sinne von (a), sondern ein eigenes Datum mit eigener Regel (§5.4.3).

Die Zuordnung je Art steht in der Spalte „Form" der Katalogtabellen. Ein Ereignis der Form (a) ohne `neu` ist ungültig (§3.7 Punkt 4); ein Ereignis der Form (b) oder (c) mit `neu` ebenso.

### §2.3 Welche Feldpfade eine Anlage belegt

**Genau die Felder, die ihr Nutzlastschema für den Zustand der angelegten Entität setzt** — mit der HLC der Anlage und ohne Vorher-Wert. Die Zuordnung ist nicht der Feldname der Nutzlast, sondern der **Zustandsfeldname**; wo sie auseinandergehen, nennt der Katalog beide. Verbindlich:

| Anlage | belegte Feldpfade |
|---|---|
| `EinsatzAngelegt` | `einsatz/name`, `/art`, `/fuestName`, `/uebergeordneteFuestName`, `/ort`, `/beginn`, `/schichtmodell` und die vier Pfade `einsatz/kosten/<feld>` — je Kostenparameter ein eigener Pfad, damit ein späteres `KostenParameterGeaendert` denselben Pfad trifft |
| `AbschnittAngelegt` | `abschnitt/<id>/name`, `/typ` (Nutzlastfeld heißt `typ`), `/parentId`, `/reihenfolge`, `/bemerkung` |
| `EinheitGemeldet` | je Feld des Schemas `abschnitt/<id>`-frei unter `einheit/<id>/<feld>`, mit `staerke` unter `einheit/<id>/staerke` |
| die übrigen | analog, je Feld des Schemas unter dem Pfad der Entität |

**Ein optionales Feld, das in der Nutzlast fehlt, belegt keinen Pfad.** Die Anlage setzt es nicht auf abwesend, sondern äußert sich nicht dazu. Sonst überschriebe eine inhaltsgleiche Zweitanlage ohne Bemerkung eine später gesetzte Bemerkung mit „leer".

Nicht belegt werden die Kennung selbst und jedes Feld, das §3.2 als **abgeleitet** führt.

### §2.4 `grund` — die vollständige Liste der Pflichtfälle

Freitext, überall erlaubt. **Pflicht** (`z.string().min(1)`) bei neun Arten, und nur bei diesen:

`AbschnittTypGeaendert` (ändert Zählregeln rückwirkend) · `EinheitEntfernt`, `FahrzeugEntfernt`, `PersonEntfernt` (nimmt etwas aus allen Summen, das jemand gemeldet hat) · `AnforderungStorniert` (beendet einen Vorgang gegenüber einer fremden Stelle) · `EebMeldungAbgelehnt` · `EtbEintragBerichtigt` · `KorrekturVon` · `ArchivierungZurueckgenommen`.

`DienstpostenEntfernt` und `AnhangEntfernt` gehören **nicht** dazu: Ein Dienstposten ist Planung, ein Anhang ein Verweis; keines von beiden nimmt eine gemeldete Kraft aus der Lage. Diese Tabelle ist die einzige Quelle; die Schemata verweisen auf sie.

### §2.5 Fachliche Zeiten und ihre Plausibilisierung (Auflage 12)

KONZEPT-SPEICHER.md §3.1 trennt technische Ordnung (HLC) und fachliche Zeit und schiebt die Schwelle hierher. **Jede** fachliche Zeit des Katalogs ist einer von drei Klassen zugeordnet; es gibt keine vierte und keine unzugeordnete.

| Klasse | Zeiten | Prüfung |
|---|---|---|
| **Ist-Zeit** | `meldezeit` (`StaerkeGeaendert`), `eingetroffenAm`, `einsatzendeAm`, `rueckfuehrungAm`, `angefordertAm`, `erledigtAm`, `von` (`AuftragErfasst`), `beginn` und `ende` des Einsatzes, `zeitpunkt` beider ETB-Arten, `aufgeloestAm`, `hinzugefuegtAm`, `zeitpunkt` von `EinsatzArchiviert` | Abweichung von der `wanduhr` desselben Ereignisses über **12 Stunden** in eine der beiden Richtungen ⇒ `meldezeitUnplausibel`. Startwert S1 |
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
  gesehenerVorher?: T | null
  // Eingangsdaten der Hinweise, die sonst nicht neu berechenbar wären (§3.8):
  wanduhr: string                 // ISO-8601 des setzenden Ereignisses
  fachlicheZeit?: string          // die Zeit aus §2.5, sofern die Art eine trägt
  zeitklasse?: "IST" | "PLAN"     // welche Schwelle gilt
  undoOf?: EreignisId
}

interface Feld<T> extends Beobachtung<T> { zweiter?: Beobachtung<T> }   // §3.3

/** Eine verworfene Zweitanlage — Eingangsdatum von `zweiteAnlageVerworfen`. */
interface VerworfeneAnlage { durch: EreignisId; hlc: Hlc; inhalt: unknown }

interface EinsatzZustand {
  id: Id
  angelegtDurch: EreignisId; angelegtMit: Hlc
  name: Feld<string>; art: Feld<string>; fuestName: Feld<string>
  uebergeordneteFuestName?: Feld<string>; ort?: Feld<string>
  beginn: Feld<Zeitpunkt>; schichtmodell: Feld<string>
  ende: Feld<Zeitpunkt>                       // null = wiedereröffnet
  kosten: { psaKostenProSatz: Feld<number>; vdaProTag: Feld<number>
            ukVerpflegungProTag: Feld<number>; geplanteEinsatztage: Feld<number> }
  archivierungen: { [ereignisId: string]: { gilt: boolean; hlc: Hlc
                                            zeitpunkt?: Zeitpunkt; snapshotHash?: string
                                            zurueckgenommenDurch?: EreignisId } }   // §7.2
  verworfeneAnlagen: VerworfeneAnlage[]
  // abgeleitet:
  status: "AKTIV" | "BEENDET" | "ARCHIVIERT"
  archiviertDurch?: EreignisId; archiviertMit?: Hlc
}

interface AbschnittZustand {
  id: Id
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
  abgeteiltVon?: Feld<{ quellEinheitId: Id; abgeteilteStaerke: Staerke }>   // §5.4.2
  aufgegangenIn?: Feld<{ zielEinheitId: Id; gesehen: Staerke }>             // §5.4.3
  entfernt: Feld<boolean>
  verworfeneAnlagen: VerworfeneAnlage[]
  // abgeleitet:
  wirksamerAbschnittId: Id                    // §5.3.2, §5.3.3
  wirksameStaerke: Staerke                    // §5.4.2
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
  unbekannt: UnbekanntesEreignis[]            // §3.7
  wartend: { [entitaetspfad: string]: { feld: string; beobachtung: Beobachtung<unknown> }[] }
  verworfeneSchluessel: { schluessel: string; verworfen: EreignisId; inhalt: unknown }[]
}
```

Die übrigen Entitätsstrukturen bauen nach demselben Muster: **jedes Feld, das der Katalog in §5 als Feldpfad nennt, ist ein `Feld<T>`; jedes Merkmal, das §5 als abgeleitet benennt, steht daneben ohne HLC.** Vollständig sind das:

* **Fahrzeug**: `typ`, `bezeichnung`, `kennzeichen`, `funkrufname`, `stanKonform`, `aenderungen`, `nutzlastText`, `status`, `taktischesZeichen`, `abschnittId`, `einheitId`, `entfernt`; abgeleitet `wirksamerAbschnittId`.
* **Person**: `nachname`, `vorname`, `rolle`, `funktionen`, `fahrerlaubnisse`, `geschlecht`, `ernaehrung`, `kontakte`, `zusatzqualifikationen`, `bemerkung`, `einheitId`, `entfernt`.
* **Auftrag**: `einheitId`, `von`, `bis`, `abschnittId`, `text`, `quelle`, `zurueckgenommen`.
* **Anforderung**: `kennung`, `abzuloesendeEinheitId`, `vorgeseheneEinheitText`, `vorgesehenerAuftrag`, `angefordertAm`, `bemerkung`, `zusage`, `erledigung`, `storno`; abgeleitet `zustand` (§5.6.2).
* **Dienstposten**: `teileinheit`, `funktion`, `schicht`, `reihenfolge`, `besetzung`, `entfernt`.
* **Meldung**: `einheitSchluessel`, `meldeStatus`, `uebernahme`, dazu die unveränderlichen Anlagewerte `stand`, `empfangenAm`, `quelle`, `signatur`, `rohPayload`, `bogen`; abgeleitet `uebernahmeZustand`, `zugEtikett`, `teilEtikett`, `aufgegangenIn`, `stammtVon` (§5.8.1).
* **Anhang**: `einheitId`, `dateiname`, `mimeTyp`, `groesse`, `hinzugefuegtAm`, `entfernt`.
* **EtbEintrag**: `zeitpunkt`, `text`, `bezug`, bei der Berichtigung zusätzlich `berichtigtEintragId`.

**Zählbarkeit.** `einheit.zaehlt` ist wahr, wenn die Einheit weder entfernt noch aufgegangen ist **und** ihr `wirksamerAbschnittId` auf einen Abschnitt mit `zaehltInGesamtstaerke` zeigt. `abschnitt.zaehltInGesamtstaerke` folgt aus `typ` nach ZDM §2.4; ein **unbekannter** Typ zählt wie `EINSATZORT`, also **mit** (§5.3.3). Damit hängt die Zählbarkeit an genau einer Stelle statt an dreien.

**Fünf Schranken, damit der Zustand nicht mit der Akte wächst:**

1. **`zweiter`** ist eine zusätzliche Beobachtung je Feld — der Zustand verdoppelt sich je Feld, er wächst nicht mit der Zahl der Ereignisse.
2. **`verworfeneAnlagen`** je Entität und **`verworfeneSchluessel`** global wachsen mit der Zahl doppelt vergebener Ids. Im Normalbetrieb ist sie null; sie entsteht nur bei geklontem Profil oder Migrationsfehler. Benannt in §8.2.
3. **`archivierungen`** hat einen Eintrag je Archivierungsereignis **und** je Rücknahme, die eine unbekannte Archivierung benennt (§7.2). Ein Einsatz wird ein- bis zweimal archiviert; eine Rücknahme auf eine Id, die es nie geben wird, hinterlässt einen Eintrag. Benannt in §8.2.
4. **`wartend`** hält Beobachtungen zu noch nicht angelegten Entitäten, je Feld zwei. Es wächst mit der Zahl der Entitäten, deren Anlage aussteht — und die ist **nicht** beschränkt, wenn eine Anlage nie kommt (verlorenes Segment, Quarantäne). Benannt in §8.2.
5. **Alles Übrige** ist genau ein Wert je Feld je Entität.

**Abgeleitete Felder gehen in die kanonische Serialisierung ein.** Sie sind kein zweiter Zustand: Jeder Client leitet sie aus derselben Grundlage gleich ab. Sie stehen im Zustand, damit ein Verbraucher sie nicht selbst berechnen muss und damit ein Fehler in der Ableitung im Konvergenzvergleich auffällt statt in der Anzeige. Die vollständige Liste: `einsatz.status`, `einsatz.archiviertDurch`, `einsatz.archiviertMit`, `abschnitt.wirksamerParentId`, `abschnitt.zaehltInGesamtstaerke`, `einheit.wirksamerAbschnittId`, `einheit.wirksameStaerke`, `einheit.zaehlt`, `fahrzeug.wirksamerAbschnittId`, `anforderung.zustand`, `meldung.uebernahmeZustand`, `meldung.zugEtikett`, `meldung.teilEtikett`, `meldung.aufgegangenIn`, `meldung.stammtVon`.

### §3.3 Der Akkumulator je Feld: zwei Beobachtungen, beide im Zustand

Je Feldpfad hält der Fold die **beiden höchsten** Beobachtungen nach §3.5. Der Gewinner liefert Wert und Feld-HLC (Auflage 4); die zweithöchste ist der Wert, gegen den `gesehenerVorher` des Gewinners geprüft wird (§2.2a). **Beide stehen im materialisierten Zustand** — sonst erzeugte ein nach dem Schnappschuss eintreffendes Ereignis mit mittlerer HLC beim vollen Fold einen Hinweis und beim Rebase keinen.

**Warum genau zwei.** Der Zustand wächst linear in der Zahl gehaltener Beobachtungen. Zwei decken den Konflikt zweier Schreiber ab, den praktisch einzigen bei bis zu fünf Arbeitsplätzen. Drei und mehr nebenläufige Schreiber auf demselben Feld erzeugen weiterhin nur einen Hinweis — Nicht-Zusicherung, §8.2.

**Was mit der dritten Beobachtung geschieht.** Sie ist im Zustand nicht mehr sichtbar; ihr Ereignis steht in der Akte und im Einsatztagebuch, das den Ereignisstrom liest (§5.9.1).

### §3.4 Die vier Konfliktklassen

**LWW/Feld** — skalarer Wert; zwei Clients, die verschiedene Felder ändern, verlieren nichts.
**LWW/Entität** — der Wert ist eine Struktur, die fachlich **eine** Meldung ist: Stärke-Tripel, Dienstpostenbesetzung, Sofortbedarf, `hierarchie`, `fuehrungskraft`, `funkrufname`, `taktischesZeichen`, die vier Listenfelder der Person, Zusage- und Erledigungsblock, Auflösungsziel, `abgeteiltVon`, `aufgegangenIn`. Ein Merge über die Bestandteile wäre nicht falsch gerechnet, sondern falsch gedacht.
**Additiv** — Anlage einer Entität mit eigener Id oder ein unveränderlicher Eintrag; bei Kollision §3.11.
**Regel** — fachliche Auflösung, im Katalog ausgeschrieben, entscheidet allein aus Zustand und Ereignis.

### §3.5 Ordnung: HLC, dann Ereignis-Id — in beide Richtungen

Gefaltet wird nach `hlc`, nie nach `wanduhr`. Bei gleicher HLC entscheidet die Ereignis-Id in Codepoint-Ordnung, und die Richtung ist je Regel zu nennen:

* **LWW** wählt das größte Element: bei Gleichstand gewinnt die **größere** Id.
* **Anlagen** (§3.11) wählen das kleinste: bei Gleichstand gilt die **kleinere** Id.

Zwei verschiedene Ereignisse mit derselben HLC sind ein Protokollbruch — den erzeugt aber das geklonte Profil, dessen Injektion M0 verlangt. Ohne Tie-Break entschiede der Fold dort nach Eintreffreihenfolge und wäre ausgerechnet im Zielfall der Fehlerinjektion keine Mengenfunktion. `vergleicheBeobachtung` in `fold.ts` tut das seit M0.2 in beiden Richtungen richtig.

### §3.6 Idempotenz

**Über die Ereignis-Id.** Ein Ereignis mit bereits gefalteter `id` wird verworfen, ohne Hinweis. Das ist P2.

**Über einen fachlichen Schlüssel.** `EebMeldungEmpfangen` über `meldungId`, `AnhangHinzugefuegt` über `anhangId`. Es gilt §3.11 mit dem Schlüssel statt der Entitäts-Id; ein zweites Ereignis mit abweichendem Inhalt landet in `verworfeneSchluessel` und erzeugt `inhaltsschluesselWidersprochen`. In den Inhaltsvergleich gehen nur die inhaltstragenden Felder ein (`bogen`, `einheitSchluessel`, `stand`, `signatur`), nicht `empfangenAm`, nicht `quelle`.

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

**Geschlossen** bleiben die Bereiche, an denen eine Regel hängt, ohne dass ein Rückfall sinnvoll wäre: die `feld`-Auswahlen, `quelle` der Meldung, `meldeStatus`, `rolle`, `geschlecht`, `ernaehrung`, `personalErfassung`, `art` des Einsatzes, `schichtmodell`, `quelle` des Auftrags, `status` des Fahrzeugs. `uebernahmeZustand` steht **nicht** in dieser Liste, weil kein Ereignis ihn trägt — er ist abgeleitet (§5.8.1).

**Der Wertebereich hängt am Feldpfad, nicht am Ereignis.** Der Katalog nennt je Feldpfad den Typ von `neu` (§5.1); daraus weiß der Fold, ob ein Wert zu prüfen ist und gegen welche Liste.

### §3.8 Konflikthinweise: Zustand, und bei jeder Materialisierung neu gerechnet

P3 verlangt, dass zwei Clients mit derselben Ereignismenge **dieselben Hinweise** führen. Der Hinweis geht in die kanonische Serialisierung und damit in den `zustandsHash` ein.

**Die Regel, ohne Ausnahme: Hinweise werden bei jeder Materialisierung aus dem Zustand neu berechnet und nie fortgeschrieben.** Fortgeschriebene Hinweise wären falsch, sobald ein später eintreffendes Ereignis ihre Grundlage entzieht — `fremdreferenzUnbekannt` „verschwindet ohne Zutun" (§3.10), `anlageFehlt` ebenso, und ein `vorherPasstNicht` fällt weg, sobald ein drittes Ereignis den Zweitplatzierten verdrängt.

Damit das geht, muss **jedes Eingangsdatum eines Hinweises im Zustand stehen**. Das ist der Grund für vier Felder, die sonst niemand bräuchte: `Beobachtung.wanduhr` und `.fachlicheZeit` (für `meldezeitUnplausibel`), `Beobachtung.undoOf` (für `undoTrifftFremdenStand`), `verworfeneAnlagen` je Entität und `verworfeneSchluessel` global (für `zweiteAnlageVerworfen`, `reservierteIdVerworfen`, `inhaltsschluesselWidersprochen`). M0.2 hält diese Angaben im Akkumulator statt im Zustand; das ist die Änderung, die `foldVersion 2` unter anderem trägt.

| Art | Bedeutung | § |
|---|---|---|
| `vorherPasstNicht` | gesehener Vorher-Wert passt nicht zur verdrängten Beobachtung | §2.2a |
| `ohneVorherWertVerdraengt` | Gewinner führte keinen Vorher-Wert und verdrängt trotzdem | §2.3 |
| `zweiteAnlageVerworfen` | zweite Anlage derselben Id, mit ihrem Inhalt | §3.11 |
| `reservierteIdVerworfen` | Anlage auf `AUFFANG` oder `ARCHIV` | §5.3.4 |
| `inhaltsschluesselWidersprochen` | gleicher Inhaltsschlüssel, abweichender Inhalt | §3.6 |
| `anlageFehlt` | Beobachtungen liegen vor, die Anlage der Entität fehlt | §3.10 |
| `fremdreferenzUnbekannt` | ein Feld verweist auf eine Entität, die es (noch) nicht gibt | §3.10 |
| `abschnittUnbekannt` | die Einheit zeigt auf einen unbekannten Abschnitt, sie liegt im Auffang | §5.3.3 |
| `abschnittAufgeloest` | die Einheit wurde in einen aufgelösten Abschnitt gelegt und steht im Ziel | §5.3.2 |
| `zyklusAufgeloest` | eine Umhängung hätte einen Zyklus erzeugt | §5.3.1 |
| `staerkeGeklemmt` | die wirksame Stärke wäre negativ geworden | §5.4.2 |
| `zusammenfuehrungSummeWeichtAb` | die gesehene Quellstärke passt nicht zur wirksamen | §5.4.3 |
| `zusammenfuehrungKreis` | zwei Einheiten wären ineinander aufgegangen | §5.4.3 |
| `moeglicheDublette` | mehrere Entitäten mit demselben fachlichen Schlüssel | §5.4.4 |
| `meldezeitUnplausibel` | fachliche Zeit weicht über der Schwelle ihrer Klasse ab | §2.5 |
| `unbekannterWert` | Wert außerhalb der bekannten Liste eines offenen Bereichs | §3.7 |
| `wirkungslosGegenTerminalzustand` | gefaltet, ändert den abgeleiteten Zustand aber nicht | §3.12 |
| `nachArchivierungEingegangen` | die Entität wurde nach der maßgeblichen Archivierung geändert | §7.3 |
| `undoTrifftFremdenStand` | ein Undo verdrängt eine Änderung, die der Bediener nicht gesehen hat | §6, U6 |

Jeder Hinweis trägt einen `feldpfad`; wo kein einzelnes Feld betroffen ist, den Pfad der Entität. Kein Hinweis ist ein Fehler.

### §3.9 `foldVersion`

Auflage 4 verlangt sie am Schnappschuss; KONZEPT-SPEICHER.md §7.3 macht sie zur harten Schranke.

**Dieses Konzept setzt `foldVersion = 2`** (M0.2 hat 1). Die Erhöhung ist zwingend: §3.2 erweitert den Zustand, §3.8 führt neue Hinweisarten ein, und ein Schnappschuss aus M0.2 trüge weder `zweiter` noch die Eingangsdaten der Hinweise.

**Regel für die Zukunft: Jede Änderung am Katalog erhöht `foldVersion`** — eine neue Ereignisart eingeschlossen. Die erste Fassung dieses Konzepts nahm eine neue Art aus, weil ein alter Client sie ohnehin nicht faltet. Das ist falsch, und zwar an der Stelle, an der es am teuersten ist: Zwei Clients verschiedener Programmversionen mit **derselben** Ereignismenge haben dann identische Versionsvektoren, aber verschiedene Zustände — der eine faltet die neue Art, der andere führt sie unter `unbekannt`. §7.6 der Speicherschicht ordnet das als „Fehler, der rote Ausgang, an dem M0 abbricht" ein, ohne dass er von einem echten Fold-Fehler zu unterscheiden wäre. Weil `mindestClientVersion` nach §8.7 dort ausdrücklich **Warnung und keine Sperre** ist, ist der gemischte Betrieb der geplante Normalfall und nicht der Ausnahmefall.

### §3.10 Fremdreferenzen: die wartende Beobachtung

Ein Ereignis kann auf eine Entität verweisen, die dieser Client noch nicht hat. Das ist der Normalfall in einem verteilten Protokoll und braucht **eine** Regel statt einer Auslegung je Aufrufstelle.

**Die eigene Anlage fehlt.** Beobachtungen zu dieser Entität stehen unter `wartend` und wirken unverändert, sobald die Anlage eintrifft. Solange sie fehlt: Die Entität erscheint **nicht** in ihrer Datensammlung und zählt nirgends — eine Schattenentität mit erfundenen Pflichtfeldern wäre eine Tatsachenbehauptung. Es entsteht **ein** `anlageFehlt` je Entität mit den Ids der wartenden Ereignisse. Aufgenommen wird wie sonst, je Feld die beiden höchsten (§3.3).

**Ein Feld verweist auf eine fehlende Entität** (`Person.einheitId`, `Fahrzeug.einheitId`, `Auftrag.einheitId`, `Anforderung.abzuloesendeEinheitId`, `EtbEintrag.bezug`, `Meldung.einheitId`, `Anhang.einheitId`). Das Feld wird **gefaltet und behalten** — der Verweis ist der gemeldete Wert —, die Entität erscheint, und es entsteht `fremdreferenzUnbekannt`. Der Hinweis verschwindet ohne Zutun, sobald die verwiesene Entität eintrifft (§3.8).

**Warum zwei Behandlungen.** Ohne eigene Anlage gibt es die Entität nicht; sie zu zeigen hieße, ihre Pflichtfelder zu erfinden. Ein unbekannter Verweis macht die Entität dagegen nicht ungültig — eine Person ohne bekannte Einheit ist eine reale Meldung.

**Die beiden strukturellen Arten brauchen `wartend` nicht.** `EinheitAufgeteilt` setzt sein Ergebnis auf der **neuen** Einheit ab, die es selbst anlegt; `EinheitZusammengefuehrt` auf der **Quelle**. Beide Ziele sind Felder je einer Entität und fallen damit unter die beiden Fälle oben. Ein Delta an einer noch nicht angelegten Entität, das `wartend` gar nicht aufnehmen könnte, gibt es nach §5.4.2 nicht mehr.

**Die einzige Ausnahme ist der Abschnitt einer Einheit** (§5.3.3): Dort tritt der Auffang an die Stelle des Verweises, damit die Stärke einer real gemeldeten Einheit nicht aus der Gesamtstärke fällt. Das ist eine Zusicherung über Zahlen, keine über Verweise.

### §3.11 Zwei Anlagen derselben Id: die kleinste HLC gilt

Liegen zwei Anlagen derselben Entitäts-Id vor, gilt die mit der **kleinsten** HLC (bei Gleichstand die kleinere Id, §3.5); jede weitere geht in `verworfeneAnlagen` und erzeugt `zweiteAnlageVerworfen` mit ihrem Inhalt. Sind sie inhaltsgleich, entsteht kein Hinweis — es ist nichts verloren.

ZDM §4.2 nennt `EinsatzAngelegt` „erstes Ereignis der Akte; ein zweites wird verworfen", und „erstes" kann nicht die Ankunft meinen. Gewönne die größte HLC, überschriebe eine verspätete Zweitanlage die gesamte Arbeit zwischen beiden Anlagen — sie trägt alle Anlagefelder und keinen Vorher-Wert.

**Die dreizehn Anlagearten:** `EinsatzAngelegt`, `AbschnittAngelegt`, `EinheitGemeldet`, `EinheitAufgeteilt` (für die neue Einheit, §5.4.2), `FahrzeugAngelegt`, `PersonHinzugefuegt`, `AuftragErfasst`, `AnforderungAngelegt`, `DienstpostenAngelegt`, `EtbEintragErfasst`, `EtbEintragBerichtigt`, `EebMeldungEmpfangen` (über `meldungId`), `AnhangHinzugefuegt` (über `anhangId`).

### §3.12 Gefaltet, aber wirkungslos

An vier Stellen wird ein Ereignis gefaltet, ohne den abgeleiteten Zustand zu ändern: ein Storno gegen eine bereits eingetroffene Anforderung und eine Zusage nach der Erledigung (§5.6.2), eine zweite Archivierung (§7.2), eine Zusammenführung, deren Quelle bereits aufgegangen ist (§5.4.3).

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

**Alle Arten stehen bei `schemaVersion = 1`;** die Kette ist leer. Ein neuer **Wert** in einem offenen Bereich erhöht die Version nicht — das ist ihr Sinn. Ein neues **optionales** Feld ebenso wenig (§3.7 Punkt 3). Ein neues **Pflichtfeld** erhöht sie. Unabhängig davon erhöht jede Katalogänderung `foldVersion` (§3.9); die beiden Zahlen messen Verschiedenes: `schemaVersion` die Lesbarkeit einer Nutzlast, `foldVersion` die Vergleichbarkeit zweier Zustände.

---

## §5 Der Katalog

### §5.1 Lesart und gemeinsame Bausteine

Jede Gruppe bringt ihre Nutzlastschemata, danach eine Tabelle mit fünf Spalten:

* **Typ** — der Wert des Rahmenfelds `typ`.
* **Form** — (a), (b) oder (c) nach §2.2.
* **Feldpfad / Wert** — das gesetzte Zustandsfeld und der Typ von `neu`. Bei Anlagen: „Anlage", die belegten Pfade stehen in §2.3.
* **Klasse** — eine der vier aus §3.4.
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
const ArchivierungZurueckgenommen = z.object({ einsatzId: zId, archivierungEreignisId: zId })
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

**Die Regel wirkt auf das abgeleitete Feld, nicht auf die Beobachtung.** `parentId` wird nach LWW gefaltet und behält seinen Gewinner samt HLC. Beim Materialisieren prüft der Fold den Wald: Liegt ein Zyklus vor, wird darin die Kante mit der **größten** HLC nicht wirksam — `wirksamerParentId` ist abwesend, der Abschnitt hängt an der Wurzel —, und es entsteht `zyklusAufgeloest` mit dem verdrängten Elternwert.

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
  name: { wert: "Auffang", hlc: SYSTEM_HLC, wanduhr: "" },
  typ:  { wert: "EINSATZORT", hlc: SYSTEM_HLC, wanduhr: "" },
  reihenfolge: { wert: 0, hlc: SYSTEM_HLC, wanduhr: "" },
  verworfeneAnlagen: [], zaehltInGesamtstaerke: true }

ARCHIV = { id: "ARCHIV", systemAbschnitt: true,
  name: { wert: "Einsatz beendet", hlc: SYSTEM_HLC, wanduhr: "" },
  typ:  { wert: "ARCHIV", hlc: SYSTEM_HLC, wanduhr: "" },
  reihenfolge: { wert: 999999, hlc: SYSTEM_HLC, wanduhr: "" },
  verworfeneAnlagen: [], zaehltInGesamtstaerke: false }
```

`name` des Archivs folgt der Excel (`Stärke!B431` „Kopier Bereich für ‚Einsatz beendet'"); `reihenfolge` setzt es ans Ende jeder Sortierung. Beide Ids sind **reserviert**: Eine Anlage darauf wird verworfen und erzeugt `reservierteIdVerworfen`. Ohne die Reservierung könnte eine Anlage dem Auffang einen nicht zählenden Typ geben, und die Stärke jeder dort liegenden Einheit verschwände.

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
  gesehen: zStaerke,                       // Quellstärke, die der Bediener sah (§5.4.3)
  uebernommeneFahrzeugIds: z.array(zId), uebernommenePersonIds: z.array(zId),
})
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
| `EinheitAufgeteilt` | c | neue Einheit: Anlage **und** `einheit/<neueId>/abgeteiltVon` | Regel §5.4.2 | strukturell → `EinheitZusammengefuehrt` |
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

**Wo die Verringerung steht.** Nicht an der Quelle, sondern an der **neuen Einheit**: Sie trägt `abgeteiltVon = { quellEinheitId, abgeteilteStaerke }` als gewöhnliches Feld (LWW/Entität) mit der HLC der Aufteilung. Die Quelle hat ein unverändertes `staerke`-Feld.

> **Wirksame Stärke einer Einheit `u`** = `u.staerke.wert`
> − Σ `v.abgeteiltVon.wert.abgeteilteStaerke` über alle `v` mit `v.abgeteiltVon.wert.quellEinheitId = u` und `v.abgeteiltVon.hlc > u.staerke.hlc`
> + Σ `v.aufgegangenIn.wert.gesehen` über alle `v` mit wirksamem `v.aufgegangenIn.wert.zielEinheitId = u` und `v.aufgegangenIn.hlc > u.staerke.hlc`
> je Rolle, geklemmt bei 0.

**Warum das die richtige Form ist — vier Eigenschaften auf einmal:**

* **Rebase-fest.** Jeder Summand steht in einem Feld einer Entität des Zustands; nichts liegt in einem Akkumulator, nichts muss ein Schnappschuss zusätzlich tragen (§3.1).
* **Idempotent über den Fachvorgang.** Jede Einheit `v` trägt **ein** `abgeteiltVon` und **ein** `aufgegangenIn`. Zwei inhaltsgleiche Aufteilungen mit derselben `neueEinheitId` sind eine Entität und damit ein Summand; zwei Clients, die dieselbe Zusammenführung schreiben, setzen dasselbe Feld. Eine Liste von Deltas könnte das nicht — sie zählte je Ereignis, nicht je Vorgang.
* **Beschränkt.** Der Zustand wächst nicht: Es kommt kein Feld hinzu, das mehr als einen Wert hält.
* **Nebenläufig richtig.** Zwei Aufteilungen derselben Quelle erzeugen zwei Einheiten, also zwei Summanden.

**Warum nur die jüngeren Summanden.** Eine absolute Meldung sagt „so ist der Stand jetzt". Wer nach einer Aufteilung 0/2/15 meldet, hat sie berücksichtigt; sie erneut abzuziehen wäre doppelte Buchung. Ein Vorgang **nach** der Meldung ist noch nicht enthalten.

**Berechnung und Terminierung.** Die Summe über „alle `v`, die auf `u` zeigen" braucht einen Index über `abgeteiltVon.quellEinheitId` und `aufgegangenIn.zielEinheitId` — ein Durchlauf, danach ist jede Einheit in konstanter Zeit fertig. Die Prüfung in §5.4.3 braucht die wirksame Stärke der Quelle; die Abhängigkeit folgt den `aufgegangenIn`-Kanten, die nach der Kreisauflösung (§5.4.3) ein Wald sind. Berechnet wird in topologischer Ordnung dieses Waldes, also linear.

**Die neue Einheit ist eine vollständige Anlage.** `neueEinheit` trägt alle Pflichtfelder aus ZDM §3.2; der aufteilende Client kennt die Quelle und füllt sie vor, der Bediener bestätigt. Ohne diese Festlegung müsste der Fold Felder von der Quelle kopieren, und **welchen Stand** er kopierte, hinge vom Zeitpunkt ab — nicht rebase-fest. `abgeteiltVonId` aus ZDM §3.2 ist damit `abgeteiltVon.wert.quellEinheitId`.

**Klemmen bei null.** Wird eine Rolle negativ, gilt 0 und es entsteht `staerkeGeklemmt` mit dem rechnerischen Wert.

**T20:** Zwei nebenläufige Aufteilungen derselben Quelle (je 0/1/3) aus 1/4/12 ⇒ Quelle 1/2/6, zwei neue Einheiten, Gesamtstärke unverändert, jede Permutation. **T21:** `StaerkeGeaendert` (9) nach Aufteilung (5) ⇒ der Abzug wirkt nicht mehr. **T22:** Aufteilung (9) nach Meldung (5) ⇒ er wirkt. **T23:** Abgeteilte Stärke größer als die Quelle ⇒ 0/0/0, `staerkeGeklemmt`. **T24 (Rebase):** T22, Schnappschuss, danach `StaerkeGeaendert` (3) ⇒ wie voller Fold. **T25 (Idempotenz über den Vorgang):** Zwei inhaltsgleiche `EinheitAufgeteilt` mit derselben `neueEinheitId`, verschiedene Ereignis-Ids ⇒ **ein** Abzug, Gesamtstärke unverändert.

#### §5.4.3 Regel: Zusammenführen — je Quelle, und einmalig

`EinheitZusammengefuehrt` setzt je Quelle `aufgegangenIn = { zielEinheitId, gesehen }`. Eine aufgegangene Einheit bleibt im Zustand, `zaehlt` ist falsch, ihre Zahlen stecken im Ziel (§5.4.2).

**`aufgegangenIn` ist monoton: die kleinste HLC gilt.** Anders als jedes andere Feld gewinnt hier nicht die höchste, sondern die **erste** Zusammenführung; jede weitere ist wirkungslos und erzeugt `wirkungslosGegenTerminalzustand`.

Das ist die entscheidende Festlegung, und sie ist teuer erkauft. Mit gewöhnlichem LWW ließe sich eine Quelle **umlenken**: X geht in Z1 auf, jemand meldet Z1 danach absolut (die Meldung enthält X), und eine spätere Zusammenführung schickt X nach Z2. Z1 behielte X in seiner Basis, Z2 bekäme X als Summanden — X zählte zweimal, ohne dass ein Hinweis entstünde, weil beide Meldungen für sich stimmig sind. Mit der Monotonie kann das nicht auftreten: Was aufgegangen ist, bleibt, wo es aufging. Wer es doch bewegen will, nimmt die Zusammenführung zurück — dafür gibt es die strukturelle Rücknahme `EinheitAufgeteilt` (U2), und die ist sichtbar.

**Überlappende Quellmengen.** Führt A die Einheiten {X, Y} zusammen und B gleichzeitig {Y, Z} in ein anderes Ziel, entscheidet für Y die kleinere HLC; X geht zu A's Ziel, Z zu B's, und für Y erzeugt der Verlierer den Wirkungslos-Hinweis. Kein Summand wird doppelt gezählt und keiner verschluckt.

**Kreise und Selbstbezug.** Zeigt `aufgegangenIn` nach mehreren Schritten auf eine bereits besuchte Einheit — A→B und B→A —, ist die Kante mit der **größeren** HLC nicht wirksam: Jene Einheit bleibt eigenständig und zählt, es entsteht `zusammenfuehrungKreis`. Dasselbe, wenn `zielEinheitId` in den eigenen `quellen` steht. Ohne die Regel wären beide Einheiten „aufgegangen", zählten nirgends, und ihre Stärke verschwände still — genau das, was §5.3.3 als tragende Zusicherung ausschließt.

**`gesehen` ist kein Vorher-Wert.** Es ist eine Prüfangabe (§2.2c): der Stand der Quelle, den der Bediener beim Zusammenführen sah. Der `vorher` von `aufgegangenIn` ist, wie bei jedem Feld, dessen früherer Wert — im Regelfall abwesend. Weicht `gesehen` von der wirksamen Stärke der Quelle ab, entsteht `zusammenfuehrungSummeWeichtAb` mit beiden Zahlen, am Feldpfad `einheit/<quellId>/staerke`. Verglichen wird gegen den **gefalteten** Stand, nicht gegen einen historischen Zwischenstand: Ein Zwischenstand stünde nicht im Zustand und wäre nach einem Schnappschuss nicht rekonstruierbar.

Dieselbe Prüfangabe trägt `EinheitAufgeteilt` als `gesehen` — der Stand der Quelle vor dem Abteilen. Auch dort führt eine Abweichung zum Hinweis.

**P4 (Summenerhaltung) hält genau dann,** wenn alle `gesehen` den wirksamen Stärken entsprechen und nichts geklemmt wurde. Beide Ausnahmen erzeugen einen Hinweis, sind also am Zustand ablesbar (§8.1).

**T26:** Zwei Quellen 0/1/3 und 0/2/6 ⇒ Ziel plus 0/3/9, Quellen aufgegangen, Gesamtstärke unverändert. **T27:** Eine Quelle meldet nebenläufig anders ⇒ `zusammenfuehrungSummeWeichtAb`. **T28:** Dieselbe Zusammenführung zweimal (verschiedene Ereignis-Ids) ⇒ **ein** Summand. **T29:** {X,Y} nach Z1 und {Y,Z} nach Z2 ⇒ Y zählt einmal, beim Gewinner, Wirkungslos-Hinweis beim Verlierer. **T30:** A→B und B→A ⇒ eine Einheit bleibt eigenständig, `zusammenfuehrungKreis`, Gesamtstärke unverändert. **T31:** `zielEinheitId` in `quellen` ⇒ dieselbe Behandlung. **T32 (Umlenkung):** X→Z1 (9), `StaerkeGeaendert` an Z1 (12), X→Z2 (15) ⇒ X bleibt in Z1, Gesamtstärke unverändert, Wirkungslos-Hinweis für die zweite Zusammenführung. Ohne die Monotonie zählte X zweimal.

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
zustand = erledigung ? EINGETROFFEN : storno ? STORNIERT : zusage ? ZUGESAGT : OFFEN
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

Damit ist er über §3.11 idempotent: Schrieben ihn zwei Clients, gälte die kleinere HLC, und weil der Inhalt gleich ist, entsteht nicht einmal ein Hinweis. **Warum ein Ereignis und keine Projektion:** Aus dem Zustand projiziert wäre er verloren, sobald das Verschiebeereignis nicht mehr Gewinner oder Zweiter des Feldes ist — bei drei Verschiebungen gäbe es zwei Aufträge statt drei. Der Einwand „zwei Wahrheiten über dieselbe Bewegung" entfällt durch die abgeleitete Id.

**T48:** Drei aufeinanderfolgende Verschiebungen ⇒ drei Bewegungsaufträge. **T49:** Zwei Clients schreiben denselben ⇒ einer im Zustand, kein Hinweis.

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
const EebMeldungAbgelehnt   = z.object({ meldungId: zId })   // `grund` Pflicht
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
| `EebMeldungAbgelehnt` | a | `meldung/<id>/uebernahme` · `null` mit Ablehnungsvermerk | LWW/Entität | frei |
| `EebMeldeStatusGesetzt` | a | `meldung/<id>/meldeStatus` · geschlossener Bereich | LWW/Feld | frei |
| `AnhangHinzugefuegt` | b | Anlage über `anhangId` | Regel §3.6, §3.11 | frei → `AnhangEntfernt` |
| `AnhangEntfernt` / `…Wiederhergestellt` | a | `anhang/<id>/entfernt` · `boolean` | LWW/Feld | frei |

#### §5.8.1 Regel: der Empfang ist eine Tatsache

`EebMeldungEmpfangen` ist **nicht rücknehmbar** und über `meldungId` idempotent. Die Meldung ist unveränderlich: Eine Korrektur ist eine **neue** Meldung mit eigener `meldungId` (Revision), Löschen ist verboten. Wer eine Meldung nicht will, lehnt sie ab — sie bleibt sichtbar.

`bogen` steht als `z.unknown()`: Die Struktur gehört `@bos/eeb-format` und wird dort versioniert. Sie hier zweitzubeschreiben führte zwei Wahrheiten über dasselbe Format; die Prüfung leistet der Codec. Dieser Katalog legt fest, dass der Bogen **unverändert** mitgeführt wird.

**Fünf Merkmale der Meldung sind abgeleitet, nicht gesetzt** (§3.2): `zugEtikett`, `teilEtikett`, `stammtVon` und `aufgegangenIn` folgen aus `bogen` und aus den Aufteilungs- und Zusammenführungsfeldern der zugehörigen Einheit; `uebernahmeZustand` folgt aus `uebernahme` und der Revisionsreihe:

```
uebernahmeZustand = abgelehnt                        ? ABGELEHNT
                  : keine Übernahme                  ? NEU
                  : jüngere Revision derselben Reihe ? GEAENDERT
                  :                                    UEBERNOMMEN
```

„Jünger" heißt nach **`stand`**, nicht nach HLC (§2.6). Ein nachgescannter Papierbogen von gestern hat die höhere HLC und den älteren `stand`; nach HLC geordnet gälte er als aktuell, und die Lage zeigte den Stand von gestern.

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

**`EtbEintragBerichtigt` ist die dreizehnte Anlageart** (§3.11) und hat eine eigene `etbId`. Zwei Berichtigungen derselben Id fallen damit unter dieselbe Regel wie jede andere Anlage; ohne sie hinge das Verhalten an der Wahl des Implementierers. `berichtigtEintragId` benennt die berichtigte Zeile **unabhängig davon, ob dieser Client sie hat** — Grabsteinregel wie in §7.2.

#### §5.9.1 Das Einsatztagebuch ist eine Projektion des Ereignisstroms

Jedes fachliche Ereignis erzeugt eine Tagebuchzeile; `EtbEintragErfasst` ist der frei getippte Zusatz. Doppelt geführt wird nichts. Die beiden Verwaltungsereignisse der Speicherschicht erscheinen nicht.

**Das Tagebuch wird aus den Ereignisdateien gerendert, nicht aus dem Zustand.** Es ist **kein** Bestandteil des `Zustand` und geht **nicht** in den `zustandsHash` ein: Der Zustand hält je Feld zwei Beobachtungen, das Tagebuch braucht alle — projiziert man es aus dem Zustand, zeigt es bei drei Änderungen zwei Zeilen. Nur die Entitäten `EtbEintrag` selbst (die getippten und die berichtigenden Zeilen) stehen im Zustand, weil sie eigene Anlagen mit eigener Id sind.

Das ist kein Verlust: Die Ereignisdateien sind append-only und vollständig; das Tagebuch ist jederzeit herstellbar — es kostet Lesezeit, keinen Inhalt. Die Zeilen tragen den fachlichen `zeitpunkt`, geordnet wird nach `hlc`. `art` und `ereignisId` aus ZDM §3.2 sind Merkmale dieser Projektion und keine Zustandsfelder.

#### §5.9.2 Regel: `KorrekturVon` gilt nur für setzende Arten

Die eingebettete Nutzlast wird gegen das Schema von `zielTyp` geprüft, und das Ereignis wirkt wie eines dieser Art — mit HLC und Id des Korrekturereignisses. Zusätzlich wird das korrigierte Ereignis im Tagebuch als berichtigt markiert; **beide Zeilen bleiben stehen** (U4).

**`zielTyp` darf keine Anlageart sein.** Für Anlagen gilt §3.11: die kleinste HLC gewinnt; eine Korrektur hat kausal immer die größere und würde als `zweiteAnlageVerworfen` abgetan — sie täte nachweislich nichts. Ein solches `KorrekturVon` ist **ungültig** (§3.7 Punkt 4). Damit ist der Korrekturweg je Anlageart ein anderer, und zwar benannt:

| Was falsch ist | Der Weg |
|---|---|
| ein Stammwert des Einsatzes, auch `beginn` | `EinsatzStammdatenGeaendert` |
| ein Stammwert einer Einheit, auch `personalErfassung`, `einheitSchluessel` | `EinheitStammdatenGeaendert` |
| eine Einheit ist gar nicht da | `EinheitEntfernt` mit Grund |
| eine EEB-Meldung ist falsch | eine neue Revision; die alte ablehnen |
| eine Tagebuchzeile ist falsch | `EtbEintragBerichtigt` |
| eine Zuordnung, Zusage, ein Zeitpunkt, ein Status war fachlich falsch | `KorrekturVon` |

**T58:** `KorrekturVon` mit `zielTyp = "StaerkeGeaendert"` und höherer HLC ⇒ die korrigierte Stärke gilt, beide Zeilen im Tagebuch. **T59:** `zielTyp = "EinheitGemeldet"` ⇒ ungültig, nicht gefaltet, geführt. **T60:** unbekannter `zielTyp` ⇒ ebenso.

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

Der Hinweis wird nach §3.8 bei jeder Materialisierung neu gerechnet: Er steht genau dann, wenn der **Gewinner** des Feldes ein `undoOf` trägt und der Zweitplatzierte von einem anderen Client stammt. Verdrängt später ein viertes Ereignis den Undo vom Gewinnerplatz, fällt er von selbst weg.

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

* Der Zustand führt `archivierungen` als Abbildung von **Ereignis-Id** auf `{ gilt, hlc, zeitpunkt?, snapshotHash?, zurueckgenommenDurch? }`. `EinsatzArchiviert` legt den Eintrag unter seiner **eigenen** Id mit `gilt = true` an; `ArchivierungZurueckgenommen` setzt den Eintrag unter der von ihm **benannten** Id auf `gilt = false`.
* **Der Eintrag entsteht unabhängig davon, ob das benannte Ereignis bekannt ist.** Trifft die Rücknahme vor der Archivierung ein, steht der Eintrag als **Grabstein** mit `false` da; die später eintreffende Archivierung findet ihn vor.
* **`gilt` ist monoton: einmal `false`, immer `false`** — unabhängig von den HLC beider Ereignisse. Kein LWW.
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

`ArchivierungZurueckgenommen` trägt `{ einsatzId, archivierungEreignisId }` und einen Pflicht-`grund`. **Kein Undo** (U2): kein `undoOf`, nicht auf dem Stapel.

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
| **P3 Konvergenz** | Zwei Clients mit derselben Ereignismenge **und derselben `foldVersion`** haben denselben Zustand | dieselbe Menge und dieselbe Fold-Fassung (§3.9). Bei Quarantäne sehen zwei Clients verschiedene Mengen — KONZEPT-SPEICHER.md §8.6.1 |
| **P4 Summenerhaltung** | Aufteilen und Zusammenführen in beliebiger Reihenfolge lassen die Gesamtstärke unverändert | **bedingt:** alle `gesehen` entsprechen den wirksamen Stärken (§5.4.3) und nichts wurde geklemmt (§5.4.2). Beide Ausnahmen erzeugen einen Hinweis |
| **P5 Kein Waisenzustand** | Keine **Einheit** steht in einem nicht existierenden oder aufgelösten Abschnitt | keine. Für Fahrzeuge gilt die schwächere Regel aus §5.3.3, ausdrücklich nicht P5 |
| **P6 Monotone Zustandsmaschine** | `anforderung.zustand` geht nie von `EINGETROFFEN` zurück | **bedingt:** über einer Menge ohne `ErledigungZurueckgenommen` (§5.6.2) |
| **P7 Rebase-Treue** | Der Zustand aus „Schnappschuss laden, Rest falten" ist gleich dem aus „alles falten" — für jeden Schnitt | keine. Die formale Fassung von §3.1 |

P7 ist neu gegenüber ZDM §4.4 und gehört in die DoD von M1.3. Ohne sie prüft P1 nur den vollen Fold, während im Betrieb jeder Client nach dem ersten Schnappschuss den anderen Weg geht.

Die beiden bedingten Zusagen sind als solche geführt. Eine unbedingte wäre entweder falsch oder schnitte den Test so zu, dass er nur widerspruchsfreie Eingaben sieht — das Schein-Grün, das Auflage 18 verbietet.

### §8.2 Nicht zugesichert

**Die Hinweiskette über mehr als zwei Schreiber.** Bei drei und mehr nebenläufigen Änderungen an demselben Feld bekommt nur die zweithöchste einen Hinweis (§3.3). Der Zustand ist richtig und konvergent; am Feld ist nicht ablesbar, dass drei Leute geschrieben haben. Der Weg dahin führt über die Größe jedes Schnappschusses.

**Die Vollständigkeit des Einsatztagebuchs auf einem Client mit Schnappschuss.** Es liest den Ereignisstrom (§5.9.1); ein Client, der aus einem Schnappschuss startet, liest die alten Ereignisse bei Bedarf nach. Solange der Einsatzordner vollständig ist, kostet das Zeit und keinen Inhalt — fehlt eine Datei, fehlt die Zeile. Die Aussage „N nachträgliche Einträge" (§7.3) hängt daran.

**Die Zahl der betroffenen Ereignisse nach einer Archivierung.** Der Zustand nennt die betroffenen **Entitäten und Felder**, nicht die Ereignisse.

**Fachliche Richtigkeit einer Meldung.** Der Fold entscheidet, welche Meldung gilt, nie welche stimmt. `zusammenfuehrungSummeWeichtAb`, `staerkeGeklemmt`, `moeglicheDublette`, `unbekannterWert` und `meldezeitUnplausibel` sind für Menschen.

**Die Gesamtstärke, solange eine Einheit im Auffang liegt** oder ein Abschnittstyp unbekannt ist. Sie kann vorübergehend zu hoch sein (§5.3.3, §3.7). Zugesichert ist, dass keine gemeldete Stärke verschwindet — nicht, dass die Summe in jedem Zwischenstand stimmt.

**Vollständigkeit der Dublettenerkennung.** `einheitSchluessel` ist eine Heuristik.

**Erzwungene Modell-Invarianten.** Weder „höchstens eine Führungsstelle ohne Elternabschnitt" (§5.3.4) noch die Schichtpflicht (§5.7) noch ein Format der Anforderungs-Kennung (§5.6.1) werden erzwungen. Alle drei sind Warnungen der Oberfläche.

**Drei Zustandsteile ohne harte Schranke** (§3.2): `verworfeneAnlagen` und `verworfeneSchluessel` wachsen mit doppelt vergebenen Ids — im Normalbetrieb null, im Klon- oder Migrationsfall nicht; `archivierungen` bekommt je Rücknahme auf eine unbekannte Id einen dauerhaften Eintrag; `wartend` wächst mit den Entitäten, deren Anlage nie kommt (verlorenes Segment, Quarantäne). Alle drei sind klein und in der Praxis leer, aber keine ist nachweisbar beschränkt. Ein Client mit Quarantäne sammelt den dritten systematisch.

**Reihenfolge innerhalb einer Wanduhr-Sekunde.** `wanduhr` ordnet nichts. Zwei Ereignisse mit derselben fachlichen Meldezeit und verschiedener HLC werden nach HLC geordnet.

---

## §9 Nachweis der Auflagen

| Auflage | Wo | Anmerkung |
|---|---|---|
| 4 · Mengenfold mit Rebase; HLC je Feld; Schnappschüsse tragen `foldVersion` | §3.1 bis §3.3, §3.9 | **Vollständig**, alle drei Teile. §3.9 setzt `foldVersion = 2` und nennt die Regel, wann sie steigt — einschließlich einer neuen Ereignisart |
| 6 · Vorher-Wert an jedem setzenden Ereignis; Abweichung ⇒ Hinweis | §2.2, §2.3, §3.8 | **Vollständig.** Drei Formen statt „drei Sätze ohne Ausnahme"; §2.3 nennt die Feldpfade der Anlagen unter ihren **Zustands**namen, sodass Anlage und Änderung dasselbe Feld treffen |
| 10 · Zyklusregel; relative Stärkeänderung; Auffangregel | §5.3.1, §5.4.2, §5.3.3 | **Vollständig.** Die relative Änderung steht als Feld an der Entität, die sie erzeugt |
| 11 · Undo mit `undoOf`, Stapel je Client, `KorrekturVon`, kein Redo | §6 | **Vollständig.** Je Art nennt die Undo-Spalte, ob dieselbe Art mit `neu = vorher` genügt oder ein benanntes Gegenereignis nötig ist; die nicht rücknehmbaren haben je einen anderen benannten Weg (§5.9.2) |
| 12 · „Neueste Revision zählt" **definieren**; Meldezeit plausibilisieren | §2.5, §2.6, §3.5 | **Vollständig.** §2.6 definiert beide Ordnungen getrennt: HLC für Konflikte, `stand` für die Revisionsreihe. §2.5 ordnet jede fachliche Zeit einer von drei Klassen zu |
| 13 · Ereignis nach der Archivierung, genau eine Behandlung | §7 | **Vollständig**, mit Grabstein, Monotonie und der Auflösung des Widerspruchs zu ZDM §4.1 Regel 5 |
| 18 · Zählbares Abbruchkriterium; P1 keine Tautologie | §8.1, §11 | **Zählbar:** §11.1 nennt die Zahlen. Die Gegenprobe zu P1 läuft an diesem Katalog (T75), nicht nur an M0.2 |

### Was hier nur teilweise erfüllt ist

* **Auflage 4** ist erfüllt, die Hinweiskette aber auf zwei Beobachtungen begrenzt (§3.3, §8.2) — eine Entscheidung über die Größe des Zustands, keine Lücke im Nachweis.
* **Auflage 6** gilt für die Arten dieses Katalogs; für eine künftige Art erst, wenn ihr Feldpfad benannt ist. §2.2 macht das zur Bedingung jeder Erweiterung.
* **P4, P6 und P7** sind die DoD von M1.3. Dieses Dokument liefert ihre Definition samt Bedingung.

---

## §10 Startwerte, Befunde und offene Punkte

### Startwerte

| Nr. | Wert | Startwert | Wo | Wogegen zu kalibrieren |
|---|---|---|---|---|
| S1 | Plausibilisierung von Ist-Zeiten | 12 Stunden, beide Richtungen | §2.5 | Erfahrung aus dem ersten geführten Einsatz |
| S2 | Format der Anforderungs-Kennung | keines; Freitext ohne Prüfung | §5.6.1 | Antwort der FüSt auf Frage 22 |
| S3 | Statusliste | neun bekannte Werte, Bereich offen | §3.7 | Antwort auf Frage 19. Hinzufügen kostet nichts, Entfernen einen Upcaster |
| S4 | Tiefe des Undo-Stapels N | 20 | §6 U3 | Bedienerfahrung |
| S5 | `WASSERWIRTSCHAFT`, Anzeige „HK/NLWKN" | wie am 2026-09-09 beschlossen | §3.7 | Antwort auf Frage 20; Aufspaltung wäre ein Upcaster aus `organisationName` |
| S6 | Vorbelegung `schichtmodell` | `ZWEI_SCHICHT` | §5.2 | Antwort auf Frage 21 |
| S7 | Obergrenze einer Entitäts-Id | 200 Zeichen | §5.1 | wird nicht gemessen; Plausibilitätsschranke |
| S8 | Plausibilisierung von Planwerten | 90 Tage nach der Wanduhr; Hinweis auch davor | §2.5 | Dauer der längsten geführten Lage |
| S9 | Kostenvorbelegungen | 180 € / 150 € / 20 € / 5 Tage | §5.2 | ZDM §3.2 aus der Excel |
| S10 | Umfang der Eigenschaftsprüfung | siehe §11.1 | §11.1 | Laufzeit in der CI |

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

### Offen geblieben

| Punkt | Wer entscheidet |
|---|---|
| Fragen 19 bis 22 aus 04-OFFENE-ENTSCHEIDUNGEN.md | FüSt; bis dahin gelten S2, S3, S5, S6 |
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
| **P4** (T20, T26) | mindestens **100 Mengen** mit je zwei bis fünf Aufteilungen und Zusammenführungen | Gesamtstärke vor und nach dem Fold gleich, sofern kein Hinweis `zusammenfuehrungSummeWeichtAb` oder `staerkeGeklemmt` vorliegt |
| **P5** (T95) | alle Mengen aus P1 | keine Einheit in einem unbekannten oder aufgelösten Abschnitt |
| **P6** (T46) | alle Permutationen **und alle Präfixe** je Menge | Zustand nie `≠ EINGETROFFEN` nach einem `AnforderungErledigt` ohne jüngeres Gegenereignis |
| **P7** (T77) | für jede Menge aus P1 **jeder** Schnitt: Präfix falten, serialisieren, laden, Rest falten | Zustand gleich dem vollen Fold, einschließlich Hinweisen |

**Warum P1 keine Tautologie ist.** Der Fold sortiert nirgends (Modulkopf von `fold.ts`). T75 fügt die Gegenprobe für diesen Katalog hinzu: Wird in den Akkumulator eine Sortierung nach Eintreffreihenfolge eingebaut, muss T75 fallen. Ein Test, der auch mit dieser Mutation grün bleibt, prüft die Eigenschaft nicht.

### §11.2 Zuordnung Regel → Prüffall

| Regel | § | Prüffälle |
|---|---|---|
| Drei Formen von `vorher`/`neu` | §2.2 | T78, T79, T80 |
| Anlagen belegen Zustandsfeldpfade | §2.3 | T82, T13 |
| `grund` bei neun Arten Pflicht | §2.4 | T83 |
| Plausibilisierung, drei Zeitklassen | §2.5 | T84, T85, T86 |
| Zwei Ordnungen (Konflikt und Revision) | §2.6 | T55, T56 |
| Zustandsgebundenheit (P7) | §3.1 | T77, T6, T12, T24, T71 |
| Der Zustand ist vollständig beschrieben | §3.2 | T87, T18 |
| Zweite Beobachtung im Zustand | §3.3 | T88 |
| Tie-Break, LWW-Richtung | §3.5 | T89 |
| Tie-Break, Anlage-Richtung | §3.5 | T90 |
| Idempotenz über die Ereignis-Id | §3.6 | T81 |
| Idempotenz über den Inhaltsschlüssel | §3.6 | T52, T53, T54 |
| Idempotenz über den Fachvorgang | §3.6 | T25, T28 |
| Unbekannte Art, Version, Feld, Nutzlast, Wert | §3.7 | T91, T92, T93, T94, T16 |
| Rückfall je offenem Wertebereich | §3.7 | T16, T94 |
| Hinweise werden neu gerechnet | §3.8 | T65, T88, T96 |
| `foldVersion` steigt auch bei neuer Art | §3.9 | T97 |
| Wartende Beobachtung, `anlageFehlt` | §3.10 | T98 |
| Unbekannte Fremdreferenz | §3.10 | T99, T15 |
| Zweite Anlage: kleinste HLC | §3.11 | T1, T90, T100 |
| Gefaltet, aber wirkungslos | §3.12 | T44, T29, T68 |
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
| `KorrekturVon` nur für setzende Arten | §5.9.2 | T58, T59, T60 |
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
**T100** Zwei inhaltsgleiche Anlagen derselben Id ⇒ kein Hinweis, nichts in `verworfeneAnlagen`.
**T101** Ein Upcaster, zweimal auf dieselbe Nutzlast angewandt, liefert dasselbe Ergebnis und liest keinen Zustand.
**T102** Ein Client spiegelt ein Ereignis niedrigerer Version weiter ⇒ die geschriebenen Bytes sind identisch mit den gelesenen.
**T103** Drei Änderungen an demselben Feld ⇒ der Zustand trägt zwei Beobachtungen, das aus dem Ereignisstrom gerenderte Tagebuch drei Zeilen.
**T104** Es existiert kein Rahmenfeld und keine Ereignisart für Redo — Prüfung am Schema.
**T105** Zwei Abschnitte gleicher `reihenfolge` und zwei Einheiten gleicher `reihenfolge` ⇒ Ausgabereihenfolge nach Entitäts-Id, auf jedem Client gleich.
