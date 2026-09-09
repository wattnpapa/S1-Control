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
