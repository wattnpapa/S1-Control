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
