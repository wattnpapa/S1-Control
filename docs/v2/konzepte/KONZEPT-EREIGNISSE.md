# KONZEPT-EREIGNISSE — Ereigniskatalog, Konfliktregeln, Undo

Stand: 2026-09-09 · Paket M1.2 · Status: **Entwurf, zweite Fassung nach zwei Gutachten**

Verbindliche Grundlagen: [KONZEPT-SPEICHER.md](KONZEPT-SPEICHER.md) (freigegeben am 2026-09-08), [03-MEILENSTEINE.md](../03-MEILENSTEINE.md) Auflagen 4, 6, 10, 11, 12, 13 und 18, [02-ZIELBILD.md](../02-ZIELBILD.md). Fachliche Quelle: `docs/v2-arbeitsstand/entwurf/zieldatenmodell-feldabgleich.md` §2 bis §4 — im Folgenden **ZDM**. Stand des Codes: `packages/domaene/src/{ereignis,fold,zustand}.ts` aus M0.2.

Dieses Dokument ist die Spezifikation, gegen die M1.3 gebaut wird. Code-Kommentare in `@s1/domaene` verweisen auf seine Paragraphen, so wie `@s1/speicher` auf die von KONZEPT-SPEICHER.md verweist. Wo eine Zahl oder eine Festlegung erst durch eine Antwort der Führungsstelle oder durch eine Messung bestimmt wird, steht hier ein **Startwert** mit Begründung und in §10 sein Eintrag — kein Ratewert ohne Kennzeichnung.

---

## §1 Zweck, Geltungsbereich und Abgrenzung

### §1.1 Was dieses Konzept festlegt

Welche Ereignisarten es gibt, welche Nutzlast jede trägt, welches Feld des Zustands sie setzt, mit welcher Regel ein Konflikt entschieden wird, und **was der Zustand trägt, damit diese Regeln nach einem Schnappschuss noch dieselben Ergebnisse liefern**. Konkret: der fachliche Teil des Rahmens und die Bedeutung von `vorher` (§2), der Zustand und die Regeln, die für jede Art gelten (§3), Nutzlastversionen und Upcaster (§4), der Katalog (§5), die Undo-Semantik U1 bis U6 (§6), die Barriere `EinsatzArchiviert` (§7), Zusicherungen und ihre Grenzen (§8).

Es ist damit die zweite Hälfte der Auflagen 10, 11 und 12, deren erste Hälfte KONZEPT-SPEICHER.md §9 ausdrücklich offen lässt, und es definiert den `Zustand`, den §7.2 dort serialisiert.

### §1.2 Was dieses Konzept nicht festlegt

**Kennzahlen und Excel-Formeln.** Welche Summe über welche Menge läuft (ZDM §3.3, K1 bis K24), gehört zu M1.3. Dieses Dokument sagt, welcher Wert im Zustand steht, wer ihn gesetzt hat und **ob eine Entität überhaupt mitzählt** — die Zählbarkeit ist Teil des Zustands, weil mehrere Konfliktregeln sie bestimmen (§5.3.3, §5.4.3, §5.4.5). Wie aus den zählenden Entitäten eine Summe wird, steht hier nicht.

**Die Speicherschicht.** Zeilenformat, Hash-Kette, Segmente, Spiegel, Poll, Schnappschussformat und jedes Fehlerbild der Dateiebene stehen in KONZEPT-SPEICHER.md und werden hier **benutzt und nicht geändert**. Die Grenze verläuft genau an einer Stelle: Der Schnappschuss ist nach §7.2 dort die Serialisierung des Zustands, und **welche Felder der Zustand hat, legt dieses Dokument fest** (§3.2). Ein zusätzliches Zustandsfeld ist deshalb keine Änderung an der Speicherschicht; es erhöht `foldVersion` (§3.9). Wo dieses Dokument dennoch auf eine Abweichung oder Lücke gestoßen ist, steht sie als Befund in §10 und nicht als Änderung.

**Die beiden Verwaltungsereignisse.** `SegmentAbgeschlossen` und `SegmentErsetzt` gehören der Speicherschicht (KONZEPT-SPEICHER.md §2.4, §4.3, §4.6). Sie tauchen in diesem Katalog **nicht** auf, der Fold ändert an ihnen keinen fachlichen Zustand, und das Einsatztagebuch zeigt sie nicht. Ein Segmentwechsel ist kein Vorgang der Lage.

**Stammdaten außerhalb der Akte.** `EinheitVorlage` (Kopiervorlagen, STAN) und `VokabularEintrag` (EEB-Vokabulare, AküLi) sind nach ZDM §3.1 ausdrücklich **global und nicht einsatzgebunden**. Sie liegen unter `stammdaten\` (KONZEPT-SPEICHER.md §1.4), werden versioniert ausgeliefert und nicht durch Ereignisse geändert. Es gibt für sie deshalb keine Ereignisart, und der Fold kennt sie nicht. Was eine Einheit aus einer Vorlage übernommen hat, steht als `vorlageId` an der Einheit — der Verweis ist Teil der Akte, der Katalog nicht.

**Das Einsatztagebuch als Projektion.** Das ETB ist eine Projektion des **Ereignisstroms**, nicht des Zustands (§5.9.1). Es geht nicht in den `zustandsHash` ein.

**Die Oberfläche.** Welche Maske welches Feld anbietet, wann ein Bedienschritt welches Ereignis erzeugt und wie ein Konflikthinweis aussieht, ist M2 und M3.

**Die Migration.** ZDM §5.1 bis §5.3 erzeugt Ereignisse dieses Katalogs, ändert aber keine Regel. Die Abbildung gehört zu M1.5 und M4.

**Rollen und Rechte.** Es gibt keine (Entscheidung 9). `akteur` ist Protokoll, keine Berechtigung. Kein Ereignis wird abgelehnt, weil ein Akteur es nicht hätte auslösen dürfen.

### §1.3 Die fünf tragenden Sätze

1. **Der Fold ist eine Mengenfunktion.** Das Ergebnis hängt allein von der Menge der Ereignisse ab — nicht von ihrer Reihenfolge, nicht von der Zahl der Schübe, nicht davon, welcher Client faltet.
2. **Jede Regel entscheidet allein aus dem Zustand und dem eintreffenden Ereignis.** Das ist die schärfere Fassung von Satz 1, und sie ist der Grund, weshalb §3.2 den Zustand vollständig aufschreibt. Herleitung in §3.1.
3. **Nichts wird still verworfen.** Verliert ein Ereignis einen Konflikt, entsteht ein Konflikthinweis, und der Hinweis ist Teil des Zustands (§3.8). Ein Ereignis, dessen Art oder Version dieser Client nicht kennt, wird nicht gefaltet, aber geführt und unverändert weitergespiegelt (§3.7).
4. **Der Zustand ist wiederherstellbar.** Kein Feld des Zustands hat eine andere Quelle als die Ereignismenge. Es gibt keinen Anfangswert, den kein Ereignis trägt.
5. **Eine Regel, die einen Fall nicht kennt, wird im Code von Hand ausgelegt.** Die Lehre aus M0.4 Abschnitt 2 und aus den zehn Befunden, die `akte.ts` in M0.3 gekostet hat. Deshalb nennt jede Regel ihren Grenzfall, und §11 führt zu jeder Regel den Fall, an dem sie geprüft wird.

---

## §2 Der Rahmen — fachlich gelesen

### §2.1 Was der Rahmen ist und wo er steht

Die Rahmenfelder legt KONZEPT-SPEICHER.md §2.4 fest; sie werden hier nicht wiederholt und nicht geändert. Fachliche Lesart:

| Feld | Lesart |
|---|---|
| `id` | `<clientId>:<laufnummer>`. Idempotenzschlüssel des Folds (§3.6) |
| `hlc` | die **einzige** Ordnung. Jeder Konflikt wird über sie entschieden (§3.5) |
| `schemaVersion` | Version der **Nutzlast dieser Ereignisart** (§4). Siehe Befund B1 in §10 |
| `typ` | Schlüssel in den Katalog aus §5 |
| `akteur` | Protokoll und Anzeige, nie Berechtigung |
| `wanduhr` | Anzeige und Plausibilisierung, nie Ordnung (§2.5) |
| `vorher` / `neu` | der gesehene Vorher-Wert und der neue Wert des **einen** Zustandsfeldes, das die Ereignisart setzt (§2.2) |
| `undoOf` | Kompensation; ein gewöhnliches Ereignis ohne Sonderpfad (§6) |
| `korrekturVon` | Berichtigung eines fachlich falschen Eintrags (§6, U4) |
| `grund` | Freitext; erscheint im Einsatztagebuch. Bei neun Arten Pflicht (§2.4) |
| `nutzlast` | **nur Kennungen und Auswahl**, nie der gesetzte Wert (§2.2) |

### §2.2 Ein Ereignis, ein Zustandsfeld — und der Wert steht in `neu`

Auflage 6 verlangt, dass jedes setzende Ereignis den gesehenen Vorher-Wert mitführt und dass eine Abweichung einen Konflikthinweis erzeugt. Damit die Auswertung nicht je Art neu erfunden wird, gelten drei Sätze ohne Ausnahme:

**(a) Ein setzendes Ereignis setzt je Entität, auf die es wirkt, genau ein Zustandsfeld.** Fast alle Arten wirken auf genau eine Entität und setzen damit genau ein Feld. Die beiden strukturellen Arten `EinheitAufgeteilt` und `EinheitZusammengefuehrt` wirken auf mehrere — sie sind ein Fachvorgang, der zwei oder mehr Einheiten zugleich betrifft, und ihn in mehrere Ereignisse zu zerlegen hieße, dass eines davon verlorengehen könnte. Auch dort gilt die Regel je Entität: ein Feld, ein `vorher`, ein Konflikt (§5.4.2, §5.4.3). Der Katalog nennt es je Art in der Spalte „Feldpfad". Wo eine Art mehrere Werte ändern müsste, ist sie entweder zerlegt (`EinsatzStammdatenGeaendert`, `ZeitpunktGesetzt`, `LogistikGesetzt` tragen das Feld als Auswahl in der Nutzlast) oder die Werte sind zu **einem** Feld zusammengefasst, dessen Wert eine Struktur ist (Klasse LWW/Entität, §3.4).

Begründung: Der Akkumulator hält seinen Stand je Feld (§3.3). Ein Ereignis, das drei Felder setzt, gewönne bei einem und verlöre bei einem anderen, und `vorher` beschriebe drei Werte, von denen nur einer geprüft würde.

**(b) Der gesetzte Wert steht im Rahmen (`neu`), nie in der Nutzlast.** Die Nutzlast trägt ausschließlich Kennungen (`einheitId`, `abschnittId`, …) und, wo nötig, die Auswahl des Feldes (`feld: "bezeichnung"`). Ein Wert, der an zwei Stellen stünde, hätte zwei Wahrheiten, und der Fold müsste raten, welche gilt.

Für Strukturwerte heißt das: `neu` **ist** die Struktur. `AbloesungZugesagt` setzt `neu = { zugesagtFuer, zugesagtVon, abloesendeEinheitId? }`; die Nutzlast trägt nur `anforderungId`.

**(c) `neu = null` heißt „Wert löschen".** Ist das Feld vor dem Ereignis nicht gesetzt, ist `vorher` **abwesend**, nicht `null`. Die Unterscheidung ist nötig, weil die kanonische Serialisierung (KONZEPT-SPEICHER.md §7.6) Felder ohne Wert weglässt; ohne sie wären „nie gesetzt" und „bewusst geleert" im Zustand nicht unterscheidbar. `EinsatzWiedereroeffnet` setzt `einsatz/ende` auf `null`, `LogistikGesetzt` mit `neu = null` hebt einen Override auf.

### §2.3 Anlagen setzen Felder — welche, steht hier

Eine Anlage ist kein Ereignis ohne Feldpfad. Sie setzt **alle** Felder der angelegten Entität auf einmal, mit ihrer eigenen HLC und **ohne** Vorher-Wert. Das ist der Grund für den Hinweis `ohneVorherWertVerdraengt`, den `@s1/domaene` seit M0.2 führt: Liegt die HLC einer Anlage über der einer Änderung an demselben Feld, verdrängt sie fremde Arbeit, ohne sie gesehen haben zu können.

Verbindlich gilt: **Die von einer Anlage belegten Feldpfade sind genau die Felder ihres Nutzlastschemas aus §5**, jeweils unter dem Pfad der angelegten Entität. `EinheitGemeldet` mit `bezeichnung` belegt `einheit/<id>/bezeichnung`, mit `staerke` das Feld `einheit/<id>/staerke` als Basisbeobachtung (§5.4.2), und so fort. Fehlt ein optionales Feld in der Nutzlast, belegt die Anlage es **nicht** — sie setzt es nicht auf abwesend, sondern äußert sich nicht dazu. Sonst überschriebe eine Zweitanlage ohne Bemerkung eine später gesetzte Bemerkung mit „leer".

Zwei Felder je Entität gehören nicht dazu, weil sie kein Ereignis setzt: die Kennung selbst und die Merkmale, die §3.2 als **abgeleitet** führt.

### §2.4 `grund` — die vollständige Liste der Pflichtfälle

Freitext, geht ins Einsatztagebuch, überall erlaubt. **Pflicht** (zod: `z.string().min(1)`) bei neun Arten, und nur bei diesen:

| Art | Warum |
|---|---|
| `AbschnittTypGeaendert` | ändert Zählregeln rückwirkend für jede Auswertung |
| `EinheitEntfernt`, `FahrzeugEntfernt`, `PersonEntfernt` | nimmt etwas aus allen Summen, das jemand gemeldet hat |
| `AnforderungStorniert` | beendet einen Vorgang gegenüber einer fremden Stelle |
| `EebMeldungAbgelehnt` | weist eine eingegangene Meldung zurück |
| `EtbEintragBerichtigt` | berichtigt eine Tagebuchzeile |
| `KorrekturVon` | erklärt, was fachlich falsch war |
| `ArchivierungZurueckgenommen` | öffnet eine abgeschlossene Akte wieder |

Diese Tabelle ist die einzige Quelle; die Schemata in §5 verweisen auf sie und wiederholen sie nicht.

### §2.5 Zwei Zeiten und die Plausibilisierung (Auflage 12)

KONZEPT-SPEICHER.md §3.1 trennt technische Ordnung (HLC) und fachliche Zeit und schiebt die Plausibilisierungsschwelle hierher (§9, Auflage 12).

**Zwei Klassen fachlicher Zeiten, und nur eine wird symmetrisch geprüft.**

* **Ist-Zeiten** — `meldezeit` (`StaerkeGeaendert`), `eingetroffenAm`, `einsatzendeAm`, `rueckfuehrungAm` (`ZeitpunktGesetzt`), `angefordertAm` (`AnforderungAngelegt`), `von` (`AuftragErfasst`), `erledigtAm`. Sie beschreiben etwas Geschehenes. Weicht die Zeit um mehr als **12 Stunden** in eine der beiden Richtungen von der `wanduhr` desselben Ereignisses ab, entsteht `meldezeitUnplausibel`. Startwert S1 (§10).
* **Planwerte** — `verfuegbarBis`, `zugesagtFuer`, `bis` (`AuftragBeendet`). Sie liegen naturgemäß in der Zukunft; eine Zusage für den nächsten Tag ist Alltag. Für sie gilt **nur** eine Obergrenze von **90 Tagen** nach der Wanduhr und ein Hinweis, wenn der Wert **vor** der Wanduhr liegt. Startwert S8.

Ohne diese Trennung erzeugte jede Ablösezusage für morgen einen Hinweis, und der Hinweis verlöre binnen eines Tages jede Bedeutung.

**Der Hinweis hängt an dem Feld, das die Zeit trägt** — bei Anlagen an dem Feldpfad, den §2.3 ihnen gibt. Bei `StaerkeGeaendert` steht er nach Auflage 12 ausdrücklich am **Stärkewert**, weil `meldezeit` dort kein eigenes Zustandsfeld ist, sondern die Meldung datiert.

**Der Hinweis ist kein Fehler.** Das Ereignis wird gefaltet und wirkt. **Die Schwelle entscheidet keinen Konflikt.** Täte sie es, hinge die Konfliktauflösung an der Wanduhr, und §3.5 gälte nicht mehr.

---

## §3 Der Zustand und die Regeln, die für jede Art gelten

### §3.1 Zustandsgebundenheit — warum dieser Paragraph vor dem Katalog steht

Satz 1 aus §1.3 („der Fold ist eine Mengenfunktion") ist schwächer, als er klingt, und der schwächere Satz genügt nicht. Der Grund steht in KONZEPT-SPEICHER.md §7: Ein Client, der einen Einsatz öffnet, lädt einen eigenen Schnappschuss und faltet ab dessen Versionsvektor weiter (§7.5 dort). Der Schnappschuss trägt den **Zustand** — nicht den Ereignisstrom. Die Ereignisse unterhalb des Offsets liest dieser Client nie wieder.

Daraus folgt die eigentliche Anforderung:

> **Jede Regel dieses Dokuments muss allein aus dem materialisierten Zustand und dem eintreffenden Ereignis entscheidbar sein.** Was eine Regel braucht, steht im Zustand — oder die Regel ist nicht baubar.

Eine Regel, die einen Zwischenstand, eine Ereignisliste oder einen „Zeitpunkt in der Vergangenheit" heranzieht, liefert bei einem Client, der aus dem Schnappschuss startet, ein anderes Ergebnis als beim vollen Fold. Beide haben dieselbe Ereignismenge gesehen; ihre Zustände unterscheiden sich trotzdem. Das bricht P3 (Konvergenz) und mit den Hinweisen auch den `zustandsHash` — an genau der Stelle, an der Auflage 18 ihr Abbruchkriterium misst.

Die Kehrseite: **Der Zustand darf nicht mit der Zahl der Ereignisse wachsen.** Sonst wäre der Schnappschuss kein Beschleuniger mehr, sondern eine zweite Kopie der Akte. Jedes Feld in §3.2, das mehr als einen Wert hält, trägt deshalb seine Schranke mit.

Beides zusammen ist der Maßstab, an dem jede Regel in §5 gemessen ist, und §11 führt für die vier Regeln mit erweitertem Zustand einen eigenen Rebase-Prüffall.

### §3.2 Was der Zustand trägt

Der `Zustand` aus M0.2 (`packages/domaene/src/zustand.ts`) wird an fünf Stellen erweitert. Die Erweiterungen sind mit **neu** gekennzeichnet; sie erhöhen `foldVersion` auf 2 (§3.9).

```ts
/** Eine einzelne Beobachtung eines Feldes. */
interface Beobachtung<T> {
  wert: T | null                  // null = bewusst geleert (§2.2c)
  hlc: Hlc
  durch: EreignisId
  gesehenerVorher?: T | null      // neu: der Vorher-Wert dieses Schreibers
}

/** Ein materialisiertes Feld (§7.4 Speicher, Auflage 4). */
interface Feld<T> extends Beobachtung<T> {
  zweiter?: Beobachtung<T>        // neu: die zweithöchste Beobachtung, §3.3
}

interface EinheitZustand {
  id: Id
  // ... Stammfelder je als Feld<T> wie in M0.2

  /** neu: Stärke als Basis plus Änderungsbuch (§5.4.2). */
  staerke: {
    basis: Feld<Staerke>
    deltas: { durch: EreignisId; hlc: Hlc; wert: SigniertesTripel }[]
  }

  abschnittId: Feld<Id>
  wirksamerAbschnittId: Id        // abgeleitet, §5.3.2 und §5.3.3
  entfernt: Feld<boolean>         // neu: §5.4.5
  aufgegangenIn?: Feld<Id>        // neu: §5.4.3
  zaehlt: boolean                 // abgeleitet: nicht entfernt, nicht aufgegangen
}

interface AbschnittZustand {
  id: Id
  parentId?: Feld<Id>
  wirksamerParentId?: Id          // neu, abgeleitet: §5.3.1 (Zyklusauflösung)
  aufgeloest?: Feld<{ zielAbschnittId: Id }>   // neu: §5.3.2
  // ... name, typ, reihenfolge, bemerkung je als Feld<T>
}

interface EinsatzZustand {
  // ... Stammfelder
  ende: Feld<Zeitpunkt>                        // null = wiedereröffnet
  /** neu: je Archivierungsereignis ein Grabstein-Flag (§7.2). */
  archivierungen: { [ereignisId: string]: Feld<boolean> }
  archiviertDurch?: EreignisId                 // abgeleitet: die maßgebliche
  archiviertMit?: Hlc                          // abgeleitet
}

interface Zustand {
  foldVersion: 2
  einsatz?: EinsatzZustand
  abschnitte: { [id: string]: AbschnittZustand }
  einheiten:  { [id: string]: EinheitZustand }
  fahrzeuge, personen, auftraege, anforderungen,
  dienstposten, schichtplan, meldungen, anhaenge: { [id: string]: … }
  hinweise: Konflikthinweis[]     // deterministisch geordnet
  unbekannt: UnbekanntesEreignis[]
  /** neu: Beobachtungen zu Entitäten, deren Anlage fehlt (§3.10). */
  wartend: { [entitaetspfad: string]: { feld: string; beobachtung: Beobachtung<unknown> }[] }
}
```

Vier Schranken, damit der Zustand nicht mit der Akte wächst:

1. **`zweiter`** ist genau eine zusätzliche Beobachtung je Feld — der Zustand verdoppelt sich je Feld, er wächst nicht mit der Zahl der Ereignisse.
2. **`deltas`** enthält ausschließlich Deltas mit `hlc > basis.hlc`; alles Ältere ist in der Basis enthalten und wird beim Materialisieren verworfen. Weil jede Stärkemeldung eines Bedieners die Basis neu setzt und damit das Buch leert, wächst es nicht mit der Dauer der Lage, sondern nur mit der Zahl der Aufteilungen und Zusammenführungen **seit der letzten Meldung** — praktisch null bis zwei. Die Schranke ist keine harte; sie ist in §8.2 als benannter Wachstumspunkt geführt.
3. **`archivierungen`** hat einen Eintrag je Archivierungsereignis. Ein Einsatz wird ein- bis zweimal archiviert.
4. **`wartend`** hält Beobachtungen zu noch nicht angelegten Entitäten. Es leert sich, sobald die Anlage eintrifft, und ist durch die Zahl der offenen Fremdreferenzen begrenzt (§3.10).

**Abgeleitete Felder** (`wirksamerAbschnittId`, `wirksamerParentId`, `zaehlt`, `archiviertDurch`, `archiviertMit`) werden beim Materialisieren aus den übrigen Feldern berechnet und **gehen trotzdem in die kanonische Serialisierung ein**. Sie sind kein zweiter Zustand: Jeder Client leitet sie aus derselben Grundlage gleich ab. Sie stehen im Zustand, damit ein Verbraucher sie nicht selbst berechnen muss und damit ein Fehler in der Ableitung im Konvergenzvergleich auffällt statt in der Anzeige.

### §3.3 Der Akkumulator je Feld: zwei Beobachtungen, und beide stehen im Zustand

Je Feldpfad hält der Fold die **beiden höchsten** Beobachtungen nach der Ordnung aus §3.5. Der Gewinner liefert Wert und Feld-HLC (Auflage 4); die zweithöchste ist der Wert, gegen den der gesehene `vorher` des Gewinners geprüft wird (§2.2).

**Beide stehen im materialisierten Zustand** (`Feld.zweiter`, §3.2). Das ist die Korrektur gegenüber der ersten Fassung dieses Konzepts, die zwei Beobachtungen im Akkumulator hielt, aber nur eine materialisierte. Die Folge wäre gewesen: Trifft nach einem Schnappschuss ein Ereignis ein, dessen HLC zwischen der zweiten und der ersten Beobachtung liegt, erzeugt der volle Fold einen Konflikthinweis und der Schnappschuss-Client keinen — zwei Zustände aus derselben Menge.

**Warum genau zwei und nicht mehr.** Der Zustand wächst linear in der Zahl der gehaltenen Beobachtungen. Zwei decken den Konflikt zweier Schreiber ab, der in einer Führungsstelle mit bis zu fünf Arbeitsplätzen der praktisch einzige ist. Drei und mehr nebenläufige Schreiber auf **demselben Feld** erzeugen weiterhin nur einen Hinweis; das ist eine Nicht-Zusicherung und steht als solche in §8.2. Die Schranke ist jetzt eine Entscheidung über die Größe des Zustands — nicht mehr, wie in der ersten Fassung, eine Behauptung über den Schnappschuss, die nicht trug.

**Was mit der dritten Beobachtung geschieht.** Sie ist im Zustand nicht mehr sichtbar. Ihr Ereignis steht weiterhin in der Akte und im Einsatztagebuch, das den Ereignisstrom liest (§5.9.1) — nicht den Zustand. Für einen Client, der aus einem Schnappschuss startet, gilt das nur, soweit er die Ereignisse noch hat; auch das steht in §8.2.

### §3.4 Die vier Konfliktklassen

**LWW/Feld.** Der Feldpfad trägt einen skalaren Wert. Zwei Clients, die verschiedene Felder derselben Entität ändern, verlieren nichts.

**LWW/Entität.** Der Feldpfad trägt eine **Struktur**, die fachlich eine Meldung ist. Der Katalog nennt sie einzeln: das Stärke-Tripel, die Dienstpostenbesetzung, der Sofortbedarf-Block, `hierarchie`, `fuehrungskraft`, `funkrufname`, die vier Listenfelder der Person, der Zusageblock und der Erledigungsblock der Anforderung, das Auflösungsziel eines Abschnitts. Ein Merge über die Bestandteile wäre nicht falsch gerechnet, sondern falsch gedacht: Er erzeugte eine Meldung, die niemand abgegeben hat.

**Additiv.** Das Ereignis legt eine Entität mit eigener Id an oder hängt einen unveränderlichen Eintrag an. Zwei solche Ereignisse beziehen sich nie auf dasselbe Feld. Kollidieren doch zwei Anlagen derselben Id, greift §3.11.

**Regel.** Eine fachliche Auflösung, im Katalog ausgeschrieben. Jede entscheidet allein aus Zustand und Ereignis (§3.1).

### §3.5 Ordnung: HLC, dann Ereignis-Id — in beide Richtungen

Gefaltet wird nach `hlc`, nie nach `wanduhr`. Bei **gleicher** HLC entscheidet die Ereignis-Id als Zeichenkette in Codepoint-Ordnung. Weil zwei Regeln in entgegengesetzte Richtungen auswählen, ist die Richtung je Regel zu nennen:

* **LWW und Deltas** wählen das **größte** Element: bei HLC-Gleichstand gewinnt die **größere** Id.
* **Anlagen** (§3.11) und die maßgebliche Archivierung (§7.2) wählen das **kleinste**: bei Gleichstand gilt die **kleinere** Id.

Der Tie-Break ist keine Verzierung. Zwei verschiedene Ereignisse mit derselben HLC sind ein Protokollbruch — §3.2 der Speicherschicht erhöht den Zähler je eigenem Ereignis, §3.3 verbietet die Doppelvergabe der Laufnummer. Genau diesen Bruch erzeugt aber das geklonte Profil, dessen Injektion M0 verlangt. Ohne Tie-Break entschiede der Fold dort nach Eintreffreihenfolge und wäre ausgerechnet im Zielfall der Fehlerinjektion keine Mengenfunktion. `vergleicheBeobachtung` in `fold.ts` tut das seit M0.2 in beiden Richtungen richtig; hier steht die Regel dazu.

### §3.6 Idempotenz

**Über die Ereignis-Id.** Ein Ereignis, dessen `id` bereits gefaltet ist, wird verworfen — ohne Hinweis, weil nichts verloren geht (ZDM §4.1 Regel 2). Das ist P2.

**Über einen fachlichen Schlüssel.** Zwei Arten haben zusätzlich einen inhaltlichen Schlüssel, weil dieselbe reale Tatsache von zwei Clients unabhängig erfasst werden kann: `EebMeldungEmpfangen` über `meldungId` (= `bogenInhaltsId(bogen)`) und `AnhangHinzugefuegt` über `anhangId` (= SHA-256 des Inhalts). Es gilt §3.11 mit dem Schlüssel statt der Entitäts-Id. Ein zweites Ereignis mit abweichendem Inhalt erzeugt `inhaltsschluesselWidersprochen`; in den Inhaltsvergleich gehen nur die inhaltstragenden Felder ein (`bogen`, `einheitSchluessel`, `stand`, `signatur`), nicht `empfangenAm` und nicht `quelle`.

### §3.7 Unbekannte Arten, Versionen, Felder — und unbekannte Werte

ZDM §4.1 Regel 4 und KONZEPT-SPEICHER.md §8.7: Ein Client, der etwas nicht kennt, **reicht es durch**.

1. **Unbekannte Ereignisart.** Nicht gefaltet, im Zustand als `unbekannt` geführt, beim Spiegeln unverändert weitergeschrieben.
2. **Bekannte Art, höhere Nutzlastversion.** Ebenso — es gibt keinen Downcaster (§4.3).
3. **Bekannte Art und Version, unbekannte Felder in der Nutzlast.** Gefaltet; die unbekannten Felder werden ignoriert und **unverändert mitgeführt**. Deshalb ist kein Schema dieses Katalogs `strict`.
4. **Ungültige Nutzlast** (fehlendes Pflichtfeld, falscher Typ). Etwas anderes als „unbekannt": Behandlung wie 1, mit dem Zusatz „Nutzlast entspricht nicht dem Schema". Der Fold rät nicht und stürzt nicht ab.
5. **Unbekannter Wert in einem offenen Wertebereich.** Gefaltet, gespeichert, unverändert angezeigt, dazu der Hinweis `unbekannterWert`.

Punkt 5 ist die Korrektur einer Fehlannahme der ersten Fassung. Fünf Wertebereiche sind **offen**: `status`, `schicht`, `organisation`, `ebene` und `abschnittstyp`. Ihr zod-Schema ist `z.string().min(1)`, nicht `z.enum`; die bekannten Werte stehen im Katalog und in `@s1/domaene` als Liste. Begründung: Wären sie geschlossen, machte ein Client, der einen zehnten Statuswert schreibt, bei jedem älteren Client die **ganze Nutzlast** ungültig — bei `EinheitGemeldet` fehlte damit die Einheit samt Stärke im Zustand, und jede Änderung an ihr erzeugte `anlageFehlt`. Eine Einheit aus der Lage zu verlieren, weil ein Statuswert unbekannt ist, ist der weitaus größere Schaden. Damit stimmt auch die Zusage in §10 S3, dass ein Wert hinzuzufügen billig ist.

Die Zählregeln von M1.3 behandeln einen unbekannten Wert wie einen fehlenden: Er zählt in keinen Statuseimer, wohl aber in die Gesamtstärke, und die Auswertung weist ihn getrennt aus — wie die Excel es mit `Status!G36` („Einheiten ohne Statusangabe") tut.

Geschlossen bleiben die Wertebereiche, an denen eine **Foldregel** hängt: `feld`-Auswahlen, `quelle`, `uebernahmeZustand`, `meldeStatus`, `rolle`, `geschlecht`, `ernaehrung`, `art` des Einsatzes und `schichtmodell`. Ein unbekannter Wert dort machte eine Regel unentscheidbar, nicht nur eine Anzeige leer.

### §3.8 Konflikthinweise sind Zustand

P3 verlangt, dass zwei Clients mit derselben Ereignismenge **dieselben Hinweise** führen. Der Hinweis geht in die kanonische Serialisierung und damit in den `zustandsHash` ein. Zwei Clients mit gleichem Wert und verschiedenen Hinweisen sind **nicht** konvergent.

Jeder Hinweis trägt einen `feldpfad`; wo kein einzelnes Feld betroffen ist, ist es der Pfad der Entität (`einheit/<id>`). Vollständige Liste:

| Art | Bedeutung | § |
|---|---|---|
| `vorherPasstNicht` | gesehener Vorher-Wert passt nicht zur verdrängten Beobachtung | §2.2 |
| `ohneVorherWertVerdraengt` | Gewinner führte keinen Vorher-Wert und verdrängt trotzdem | §2.3 |
| `zweiteAnlageVerworfen` | zweite Anlage derselben Id, mit ihrem Inhalt | §3.11 |
| `reservierteIdVerworfen` | Anlage auf `AUFFANG` oder `ARCHIV` | §5.3.4 |
| `anlageFehlt` | Beobachtungen liegen vor, die Anlage der Entität fehlt | §3.10 |
| `fremdreferenzUnbekannt` | ein Ereignis verweist auf eine Entität, die es (noch) nicht gibt | §3.10 |
| `abschnittUnbekannt` | die Einheit zeigt auf einen unbekannten Abschnitt, sie liegt im Auffang | §5.3.3 |
| `abschnittAufgeloest` | die Einheit wurde in einen aufgelösten Abschnitt gelegt und steht im Ziel | §5.3.2 |
| `zyklusAufgeloest` | eine Umhängung hätte einen Zyklus erzeugt | §5.3.1 |
| `staerkeGeklemmt` | eine relative Stärkeänderung wäre negativ geworden | §5.4.2 |
| `zusammenfuehrungSummeWeichtAb` | übernommene Stärke passt nicht zu den gesehenen Quellstärken | §5.4.3 |
| `zusammenfuehrungKreis` | zwei Einheiten sind ineinander aufgegangen | §5.4.3 |
| `moeglicheDublette` | mehrere Entitäten mit demselben fachlichen Schlüssel | §5.4.4 |
| `inhaltsschluesselWidersprochen` | gleicher Inhaltsschlüssel, abweichender Inhalt | §3.6 |
| `meldezeitUnplausibel` | fachliche Zeit weicht über der Schwelle ab | §2.5 |
| `unbekannterWert` | Wert außerhalb der bekannten Liste eines offenen Wertebereichs | §3.7 |
| `wirkungslosGegenTerminalzustand` | ein Ereignis wurde gefaltet, ändert den abgeleiteten Zustand aber nicht | §3.12 |
| `nachArchivierungEingegangen` | das Feld wurde nach der maßgeblichen Archivierung gesetzt | §7.3 |
| `undoTrifftFremdenStand` | ein Undo verdrängt eine Änderung, die der Bediener nicht gesehen hat | §6, U6 |

Kein Hinweis ist ein Fehler. Jeder benennt eine Lage, in der zwei Menschen gleichzeitig etwas Sinnvolles getan haben, oder eine, in der eine Angabe geprüft gehört.

### §3.9 `foldVersion`

Auflage 4 verlangt, dass Schnappschüsse eine `foldVersion` tragen, und KONZEPT-SPEICHER.md §7.3 macht sie zur harten Schranke: Ein Schnappschuss mit abweichender Version wird stillschweigend verworfen und der Zustand neu gefaltet.

**Dieses Konzept setzt `foldVersion = 2`.** M0.2 hat 1. Die Erhöhung ist zwingend, weil §3.2 den Zustand erweitert und §3.8 neue Hinweisarten einführt: Ein Schnappschuss aus M0.2 trüge weder `zweiter` noch das Stärke-Änderungsbuch, und ein Rebase auf ihm entschiede anders.

**Regel für die Zukunft:** Jede Änderung an einer Regel dieses Dokuments, an der Menge der Zustandsfelder oder an der Menge der Hinweisarten erhöht `foldVersion`. Eine neue Ereignisart allein tut es nicht, solange sie nur Felder setzt, die es schon gibt — ein alter Client kennt sie nach §3.7 Punkt 1 ohnehin nicht und faltet sie nicht.

### §3.10 Fremdreferenzen: die wartende Beobachtung

Ein Ereignis kann auf eine Entität verweisen, die dieser Client noch nicht hat — das `AbschnittAngelegt` liegt in einer Datei, die noch nicht gespiegelt ist, oder die Anlage kommt aus einem Segment mit Rückstand. Das ist der Normalfall in einem verteilten Protokoll, nicht der Fehlerfall, und er braucht **eine** Regel statt einer Auslegung je Aufrufstelle.

**Regel.** Beobachtungen zu einer Entität, deren Anlage fehlt, werden im Zustand unter `wartend` gehalten (§3.2) und wirken unverändert, sobald die Anlage eintrifft — das ist der Rebase. Solange die Anlage fehlt, gilt:

1. Die Entität **erscheint nicht** in ihrer Datensammlung und zählt in keiner Summe. Eine Schattenentität mit erfundenen Pflichtfeldern wäre eine Tatsachenbehauptung.
2. Es entsteht **ein** Hinweis `anlageFehlt` je Entität mit den Ids der wartenden Ereignisse.
3. Die Beobachtungen werden nach denselben Regeln aufgenommen wie sonst — je Feld die beiden höchsten (§3.3). `wartend` wächst deshalb nicht mit der Zahl der Ereignisse, sondern mit der Zahl der Felder der offenen Entitäten.

**Referenzen zwischen Entitäten** behandelt dieselbe Regel von der anderen Seite. Verweist ein Feld einer vorhandenen Entität auf eine fehlende (`Person.einheitId`, `Fahrzeug.einheitId`, `Auftrag.einheitId`, `Anforderung.abzuloesendeEinheitId`, `EtbEintrag.bezug`, `EebMeldung.einheitId`, `EinheitZusammengefuehrt.quellEinheitIds`), dann wird das Feld **gefaltet und behalten** — der Verweis ist der gemeldete Wert —, die Entität erscheint, und es entsteht `fremdreferenzUnbekannt`. Sie verschwindet ohne Zutun, sobald die verwiesene Entität eintrifft.

**Warum zwei verschiedene Behandlungen.** Ohne eigene Anlage gibt es die Entität nicht; sie zu zeigen hieße, ihre Pflichtfelder zu erfinden. Ein unbekannter Verweis dagegen macht die Entität nicht ungültig — eine Person ohne (noch) bekannte Einheit ist eine reale Meldung, und sie zu unterschlagen verlöre sie.

**Die einzige Ausnahme ist der Abschnitt einer Einheit** (§5.3.3): Dort tritt der Auffang an die Stelle des Verweises, damit die Stärke einer real gemeldeten Einheit nicht aus der Gesamtstärke fällt. Das ist eine Zusicherung über Zahlen, keine über Verweise, und sie gilt nur für die Einheit.

### §3.11 Zwei Anlagen derselben Id: die kleinste HLC gilt

Für **jede** anlegende Ereignisart gilt: Liegen zwei Anlagen derselben Entitäts-Id vor, gilt die mit der **kleinsten** HLC (bei Gleichstand die kleinere Id, §3.5); jede weitere wird verworfen und erzeugt `zweiteAnlageVerworfen` **mit dem verworfenen Inhalt**. Sind sie inhaltsgleich, entsteht kein Hinweis — es ist nichts verloren.

Drei Gründe: ZDM §4.2 nennt `EinsatzAngelegt` „erstes Ereignis der Akte; ein zweites wird verworfen", und „erstes" kann nicht die Ankunft meinen, weil das nicht konvergent wäre. Gewönne die größte HLC, überschriebe eine verspätete Zweitanlage die gesamte Arbeit zwischen beiden Anlagen — sie trägt alle Anlagefelder und keinen Vorher-Wert. Und der verworfene Inhalt gehört in den Hinweis, weil eine zweite `EinheitGemeldet` eine real gemeldete Stärke tragen kann.

Die zwölf Anlagearten: `EinsatzAngelegt`, `AbschnittAngelegt`, `EinheitGemeldet`, `EinheitAufgeteilt` (für die neue Einheit, §5.4.2), `FahrzeugAngelegt`, `PersonHinzugefuegt`, `AuftragErfasst`, `AnforderungAngelegt`, `DienstpostenAngelegt`, `EtbEintragErfasst`, `EebMeldungEmpfangen` (über `meldungId`), `AnhangHinzugefuegt` (über `anhangId`).

### §3.12 Gefaltet, aber wirkungslos

An drei Stellen wird ein Ereignis gefaltet, ohne den abgeleiteten Zustand zu ändern: ein Storno gegen eine bereits eingetroffene Anforderung (§5.6.2), eine zweite Archivierung (§7.2), eine Zusage nach der Erledigung (§5.6.2).

In allen dreien entsteht `wirkungslosGegenTerminalzustand` mit der Ereignis-Id und dem Grund. Ohne ihn wäre die Lage von stillem Verwerfen nicht zu unterscheiden: Der Bediener hat storniert, das Ereignis steht in der Akte, und nichts ändert sich — genau das, was §1.3 Satz 3 ausschließt. Der gewöhnliche Hinweis `vorherPasstNicht` greift hier **nicht**, weil das gesetzte Feld (`storno`) tatsächlich den Wert annimmt, den der Schreiber erwartet hat; wirkungslos ist erst die **Ableitung** darüber.

---

## §4 Nutzlastversionen und die Upcaster-Kette

### §4.1 Eine Version je Ereignisart

`schemaVersion` im Rahmen ist die Version der **Nutzlast dieser Ereignisart**. Sie beginnt bei jeder Art bei `1` und wird unabhängig von den anderen erhöht. Eine gemeinsame Version für alle wäre unbrauchbar: Jede Erweiterung an einer Art zwänge jede andere in eine neue Version und jeden Client zu einem Upcaster, der nichts tut.

Das Feld heißt `schemaVersion` und nicht `v` (so ZDM §4.1), weil die Speicherschicht es unter diesem Namen führt und der Rahmen hier nicht geändert wird. Dass KONZEPT-SPEICHER.md §2.4 es als „Version des Ereignisrahmens" beschreibt, ist Befund B1 (§10).

### §4.2 Was ein Upcaster darf

Ein Upcaster bildet eine Nutzlast der Version `n` auf `n+1` derselben Art ab. Er ist **rein** (gleiche Eingabe, gleiche Ausgabe, kein Zugriff auf Uhr, Zufall, Dateisystem, Netz), **zustandsblind** (er sieht weder den gefalteten Zustand noch andere Ereignisse — sonst hinge das Ergebnis von der Reihenfolge ab, in der die Ereignisse durch ihn laufen, und §1.3 Satz 1 fiele) und **rahmenblind** (er ändert `id`, `hlc`, `typ`, `akteur`, `wanduhr`, `vorher`, `neu`, `undoOf`, `korrekturVon` nicht; er arbeitet allein auf `nutzlast`).

Erlaubt: ein Feld umbenennen; ein Feld zerlegen, wenn die Zerlegung allein aus dem alten Wert folgt; ein Feld ergänzen, dessen Wert sich **aus der Nutzlast selbst** ergibt; ein Feld entfernen.

Verboten: ein Pflichtfeld mit einem erfundenen Vorgabewert füllen. Lässt sich der Wert nicht aus der alten Nutzlast ableiten, bleibt das Feld in der neuen Version **optional** — für immer. Ein erfundener Vorgabewert wäre eine Tatsachenbehauptung über eine Lage, bei der niemand dabei war.

### §4.3 Die Kette, und was mit einer höheren Version geschieht

Ein Client kennt je Art die Versionen `1 … k`. Beim Lesen läuft eine Nutzlast der Version `n < k` durch die Upcaster `n → … → k` und wird danach gegen das Schema von `k` geprüft. Es gibt **keinen Downcaster**: Eine Nutzlast der Version `> k` wird nach §3.7 Punkt 2 behandelt.

* **Der Upcaster läuft beim Lesen, nie beim Schreiben.** Die Datei wird nicht umgeschrieben; das Protokoll ist append-only.
* **Beim Spiegeln läuft er nicht.** Ein Client, der ein fremdes Ereignis weiterspiegelt, schreibt die **Originalbytes**. Sonst hinge der Inhalt der Akte davon ab, wer zufällig gespiegelt hat, und die Hash-Kette bräche.

### §4.4 Startzustand

**Alle Ereignisarten stehen bei `schemaVersion = 1`.** Es gibt noch keinen Upcaster; die Kette ist leer. Sie steht hier trotzdem beschrieben, weil der erste Upcaster sonst im Code erfunden würde.

Ein neuer **Wert** in einem der fünf offenen Wertebereiche (§3.7 Punkt 5) erhöht die Version **nicht** — das ist der Sinn der offenen Bereiche. Ein neues **Feld** erhöht sie nur, wenn es Pflicht wird; ein optionales Feld fällt unter §3.7 Punkt 3.

---

## §5 Der Katalog

### §5.1 Lesart und gemeinsame Bausteine

Jede Gruppe bringt ihre Nutzlastschemata, danach eine Tabelle mit vier Spalten:

* **Typ** — der Wert des Rahmenfelds `typ`.
* **Feldpfad** — das Zustandsfeld, das `vorher`/`neu` beschreiben (§2.2a). Bei Anlagen: „Anlage" — sie belegen die Feldpfade ihres Schemas nach §2.3.
* **Klasse** — eine der vier aus §3.4.
* **Undo** — die Klasse aus §6, U2, und das benannte Gegenereignis.

Regeln der Klasse **Regel** stehen unter der Tabelle, jede mit Begründung und Prüffall. Prüffälle sind mit `T<n>` nummeriert und in §11 geführt.

Die Schemata beschreiben **nur `nutzlast`**. Der gesetzte Wert steht im Rahmen (§2.2b) und ist in der Tabelle als Feldpfad genannt. Kein Schema ist `strict` (§3.7 Punkt 3). `grund` steht in §2.4 und wird nicht je Art wiederholt.

```ts
const zId          = z.string().min(1).max(200)
const zZeitpunkt   = z.string().datetime({ offset: true })
const zDatum       = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const zAnzahl      = z.number().int().nonnegative()
const zText        = z.string()
const zPflichttext = z.string().min(1)

const zStaerke = z.object({ fuehrer: zAnzahl, unterfuehrer: zAnzahl, mannschaft: zAnzahl })

// Offene Wertebereiche (§3.7 Punkt 5): Zeichenkette, bekannte Werte als Liste.
const zStatus        = zPflichttext   // bekannt: EINHEIT_STATUS, ZDM §2.2
const zSchicht       = zPflichttext   // bekannt: SCHICHTEN, ZDM §2.3
const zOrganisation  = zPflichttext   // bekannt: ORGANISATIONEN, ZDM §2.1
const zEbene         = zPflichttext   // bekannt: TAKTISCHE_EBENEN, ZDM §2.8
const zAbschnittstyp = zPflichttext   // bekannt: ABSCHNITTSTYPEN, ZDM §2.4

// Geschlossene Wertebereiche: an ihnen hängt eine Foldregel.
const zEinsatzArt    = z.enum(["EINSATZ", "UEBUNG", "VERANSTALTUNG"])
const zSchichtmodell = z.enum(["ZWEI_SCHICHT", "DREI_SCHICHT"])
const zRolle         = z.enum(["FUEHRER", "UNTERFUEHRER", "MANNSCHAFT"])
const zGeschlecht    = z.enum(["MAENNLICH", "WEIBLICH", "DIVERS"])
const zErnaehrung    = z.enum(["FLEISCH", "VEGETARISCH", "VEGAN"])
const zPersonalErf   = z.enum(["VOLLSTAENDIG", "NUR_STAERKE"])

const zKontakt = z.object({
  art: z.enum(["MOBIL", "FESTNETZ", "EMAIL"]), dienstlich: z.boolean(), wert: zPflichttext,
})
const zHierarchieEbene = z.object({
  art: zPflichttext, name: zPflichttext,
  kurz: zText.optional(), telefon: zText.optional(), email: zText.optional(),
})
```

**Zur Id-Länge.** Eine Entitäts-Id ist Nutzlast aus einer fremden Datei und wird zum Schlüssel einer Datensammlung. `fold.ts` legt die Sammlungen ohne Prototyp an (`Object.create(null)`) — sonst wäre eine Id namens `__proto__` kein Eintrag, sondern ein Aufruf des Prototyp-Setzers, und die Entität verschwände spurlos. Die Längenschranke (Startwert S7) verhindert, dass eine erfundene Id den Speicher jedes Clients füllt.

### §5.2 Einsatz

```ts
const EinsatzAngelegt = z.object({
  einsatzId: zId,
  name: zPflichttext,
  art: zEinsatzArt,
  fuestName: zPflichttext,
  uebergeordneteFuestName: zText.optional(),
  ort: zText.optional(),
  beginn: zZeitpunkt,
  schichtmodell: zSchichtmodell,
  // Kostenparameter gehören in die Anlage, nicht in eine Konstante (§1.3 Satz 4).
  kosten: z.object({
    psaKostenProSatz:    z.number(),   // ZDM §3.2, Vorbelegung 180
    vdaProTag:           z.number(),   // Vorbelegung 150
    ukVerpflegungProTag: z.number(),   // Vorbelegung 20
    geplanteEinsatztage: zAnzahl,      // Vorbelegung 5
  }),
})

const EinsatzStammdatenGeaendert = z.object({
  einsatzId: zId,
  feld: z.enum(["name","art","fuestName","uebergeordneteFuestName","ort","beginn","schichtmodell"]),
})
const KostenParameterGeaendert = z.object({
  einsatzId: zId,
  feld: z.enum(["psaKostenProSatz","vdaProTag","ukVerpflegungProTag","geplanteEinsatztage"]),
})
const EinsatzBeendet             = z.object({ einsatzId: zId })   // neu = Zeitpunkt
const EinsatzWiedereroeffnet     = z.object({ einsatzId: zId })   // neu = null
const EinsatzArchiviert          = z.object({ einsatzId: zId, zeitpunkt: zZeitpunkt,
                                              snapshotHash: z.string().length(64) })
const ArchivierungZurueckgenommen = z.object({ einsatzId: zId, archivierungEreignisId: zId })
```

| Typ | Feldpfad | Klasse | Undo |
|---|---|---|---|
| `EinsatzAngelegt` | Anlage | Regel (§3.11) | nein |
| `EinsatzStammdatenGeaendert` | `einsatz/<feld>` | LWW/Feld | frei, dieselbe Art |
| `KostenParameterGeaendert` | `einsatz/kosten/<feld>` | LWW/Feld | frei, dieselbe Art |
| `EinsatzBeendet` | `einsatz/ende` | LWW/Feld | frei → `EinsatzWiedereroeffnet` |
| `EinsatzWiedereroeffnet` | `einsatz/ende` | LWW/Feld | — |
| `EinsatzArchiviert` | `einsatz/archivierungen/<eigene id>` | Regel (§7) | nein |
| `ArchivierungZurueckgenommen` | `einsatz/archivierungen/<benannte id>` | Regel (§7) | nein |

**Die Kostenparameter stehen in der Anlage.** ZDM §3.2 nennt vier Vorbelegungen (180 / 150 / 20 / 5 aus `Stärke!AQ3`, `AS3`, `AT3`, `AV3`). Wären sie eine Konstante im Code, hätte der Zustand einen Anfangswert ohne Ereignisquelle — gegen §1.3 Satz 4 —, und `vorher` der ersten Änderung passte auf nichts. Die Maske schlägt die vier Zahlen vor; geschrieben werden sie mit der Anlage.

**`beginn` ist änderbar** (`EinsatzStammdatenGeaendert`). Ein Vertipper im Einsatzbeginn muss korrigierbar sein, und `KorrekturVon` hilft bei Anlagen nicht (§5.9.2).

**Beenden ist nicht Archivieren.** ZDM §3.2 führt `status: AKTIV | BEENDET | ARCHIVIERT` als **abgeleitet**: archiviert, wenn §7 es sagt; sonst beendet, wenn `ende` gesetzt ist; sonst aktiv. Kein Ereignis setzt `status` direkt — sonst gäbe es zwei Wahrheiten über denselben Sachverhalt.

**T1:** Zwei `EinsatzAngelegt` mit verschiedener HLC und verschiedenen Namen ⇒ der Name der kleineren HLC gilt, Hinweis `zweiteAnlageVerworfen` mit dem verworfenen Inhalt. **T2:** `EinsatzBeendet` (HLC 5) und `EinsatzWiedereroeffnet` (HLC 7, `neu = null`) in beiden Permutationen ⇒ `ende` abwesend; umgekehrte HLC ⇒ `ende` gesetzt.

### §5.3 Abschnitt

```ts
const AbschnittAngelegt = z.object({
  abschnittId: zId, name: zPflichttext, abschnittstyp: zAbschnittstyp,
  parentId: zId.optional(), reihenfolge: z.number().int(), bemerkung: zText.optional(),
})
const AbschnittUmbenannt        = z.object({ abschnittId: zId })   // neu = Name
const AbschnittTypGeaendert     = z.object({ abschnittId: zId })   // neu = Typ; `grund` Pflicht
const AbschnittUmgehaengt       = z.object({ abschnittId: zId })   // neu = parentId | null
const AbschnittUmsortiert       = z.object({ abschnittId: zId })   // neu = reihenfolge
const AbschnittBemerkungGesetzt = z.object({ abschnittId: zId })   // neu = Text | null
const AbschnittAufgeloest       = z.object({ abschnittId: zId })   // neu = { zielAbschnittId }
const AbschnittWiederhergestellt = z.object({ abschnittId: zId })  // neu = null
```

| Typ | Feldpfad | Klasse | Undo |
|---|---|---|---|
| `AbschnittAngelegt` | Anlage | additiv, bei Kollision §3.11 | strukturell → `AbschnittAufgeloest` |
| `AbschnittUmbenannt` | `abschnitt/<id>/name` | LWW/Feld | frei |
| `AbschnittTypGeaendert` | `abschnitt/<id>/typ` | LWW/Feld | frei |
| `AbschnittUmgehaengt` | `abschnitt/<id>/parentId` | Regel (§5.3.1) | frei |
| `AbschnittUmsortiert` | `abschnitt/<id>/reihenfolge` | LWW/Feld | frei |
| `AbschnittBemerkungGesetzt` | `abschnitt/<id>/bemerkung` | LWW/Feld | frei |
| `AbschnittAufgeloest` | `abschnitt/<id>/aufgeloest` | LWW/Entität, Wirkung §5.3.2 | strukturell → `AbschnittWiederhergestellt` |
| `AbschnittWiederhergestellt` | `abschnitt/<id>/aufgeloest` | LWW/Entität | — |

#### §5.3.1 Regel: die Zyklusprüfung (Auflage 10)

Ein Abschnitt darf nicht sein eigener Vorfahr werden. Zwei Clients können den Zyklus **gemeinsam** erzeugen, ohne dass einer ihn sieht: A hängt X unter Y, B gleichzeitig Y unter X.

**Die Regel wirkt auf das abgeleitete Feld, nicht auf die Beobachtung.** `parentId` wird nach LWW/Feld gefaltet und behält seinen Gewinner samt HLC. Beim Materialisieren prüft der Fold den entstehenden Wald: Liegt ein Zyklus vor, wird darin die Kante mit der **größten** HLC nicht wirksam — `wirksamerParentId` des betroffenen Abschnitts ist abwesend (er hängt an der Wurzel) —, und es entsteht `zyklusAufgeloest` mit dem verdrängten Elternwert.

**Warum das abgeleitete Feld und nicht das gefaltete.** Setzte die Regel `parentId` selbst zurück, verlöre das Feld seine Beobachtung. Träfe danach eine Umhängung mit kleinerer HLC ein, gewönne sie gegen ein leeres Feld — und ein Client, der aus einem Schnappschuss startet, käme zu einem anderen Baum als der volle Fold. Mit der Trennung bleibt die Beobachtung erhalten, die Auflösung wird bei jeder Materialisierung neu gerechnet, und beide Wege liefern dasselbe (§3.1).

**Warum die größere HLC weicht.** Sie ist die jüngere Handlung, die ältere Struktur bleibt stehen — und vor allem ist die Wahl **deterministisch**, weil die HLC total geordnet ist. „Die zuletzt eingetroffene" wäre nicht konvergent.

**Warum an die Wurzel.** Der `vorher`-Wert ist der Stand, den **ein** Client gesehen hat; ihn einzusetzen gäbe dem Feld einen Wert, den kein Ereignis mit dieser HLC gesetzt hat. Die Wurzel ist der einzige Wert, der immer existiert und keinen Zyklus schließen kann. Ein an die Wurzel gehängter Abschnitt ist sichtbar falsch einsortiert und in einem Griff korrigierbar.

**Terminierung.** In einem Elternzeiger-Wald sind Zyklen knoten- und kantendisjunkt; das Lösen einer Kante kann keinen neuen Zyklus erzeugen. Die Prüfung ist linear in der Zahl der Abschnitte.

**T3:** X unter Y (HLC 5), Y unter X (HLC 7), beide Permutationen ⇒ `wirksamerParentId` von Y abwesend, X unter Y, ein `zyklusAufgeloest`. **T4:** Dreierzyklus X→Y→Z→X ⇒ genau eine Kante weicht, in jeder Permutation dieselbe. **T5:** `parentId` = eigene Id ⇒ Wurzel, Hinweis. **T6 (Rebase):** T3, dann Schnappschuss, dann `AbschnittUmgehaengt(Y → Z, HLC 6)` ⇒ derselbe Zustand wie beim vollen Fold über alle vier Ereignisse.

#### §5.3.2 Regel: der aufgelöste Abschnitt

`AbschnittAufgeloest` setzt das Feld `abschnitt/<id>/aufgeloest` auf die Struktur `{ zielAbschnittId }` — wohin die verbliebenen Einheiten wandern. Es ist LWW/Entität: Bei zwei nebenläufigen Auflösungen mit **verschiedenem Ziel** gewinnt die höhere HLC mit ihrem Ziel, und der gesehene Vorher-Wert erzeugt den gewöhnlichen Hinweis. Ohne diese Festlegung entschiede ein Wahrheitswert über das Flag und niemand über das Ziel, von dem §5.3.2 vollständig lebt.

Drei Festlegungen:

1. **Der aufgelöste Abschnitt bleibt im Zustand,** mit dem Feld `aufgeloest` und dessen HLC. Ereignisse, die auf ihn zeigen, bleiben auflösbar, und das Einsatztagebuch nennt ihn beim Namen.
2. **Einheiten in ihm stehen im Ziel.** Für jede Einheit, deren gefaltete `abschnittId` ein aufgelöster Abschnitt ist, ist `wirksamerAbschnittId` das Ziel der Auflösung. Das gilt auch für ein nebenläufiges `EinheitVerschoben` **in** diesen Abschnitt, selbst mit höherer HLC: Die Verschiebung wird gefaltet (`abschnittId` ändert sich), die Wirkung ist der Weiterlauf ins Ziel, und es entsteht `abschnittAufgeloest`. Begründung von ZDM §4.2: Eine Einheit darf nie in einem nicht existierenden Abschnitt hängen.
3. **Ist das Ziel selbst aufgelöst, wird der Kette gefolgt.** Schließt sie einen Kreis oder endet sie in einem unbekannten Abschnitt, landet die Einheit im Auffang (§5.3.3), mit beiden Hinweisen. Der Abbruch bei der ersten Wiederholung eines besuchten Abschnitts macht die Verfolgung linear.

Alles, was die Kette braucht — `aufgeloest.wert.zielAbschnittId` je Abschnitt —, steht im Zustand; die Regel bleibt damit nach einem Schnappschuss gültig.

`AbschnittWiederhergestellt` setzt das Feld auf `null`. Danach ist der Abschnitt gewöhnlich und die Einheiten stehen wieder in ihm — derselbe Fold über eine größere Menge, kein Rückabwickeln.

**T7:** Einheit in A, `AbschnittAufgeloest(A, neu = {ziel: B})` ⇒ wirksamer Abschnitt B. **T8:** `EinheitVerschoben(→ A)` HLC 9, Auflösung HLC 5 ⇒ wirksam B, `abschnittId` bleibt A, Hinweis. **T9:** A→B, B→C ⇒ C. **T10:** A→B, B→A ⇒ Auffang, zwei Hinweise. **T11:** Zwei Auflösungen von A mit Zielen B und C ⇒ das Ziel der höheren HLC gilt, `vorherPasstNicht`. **T12 (Rebase):** T9, Schnappschuss, danach `AbschnittAufgeloest(C → D)` ⇒ wie voller Fold.

#### §5.3.3 Regel: der Auffangabschnitt — und was er nicht ist (Auflage 10)

`@s1/domaene` führt seit M0.2 den systemseitigen Auffang unter der reservierten Id `AUFFANG`, Typ `EINSATZORT`, also **zählend**. Der Auftrag zu M1.2 fragt, ob „Abschnitt noch nicht gesehen" und „Abschnitt aufgelöst" dieselbe Regel bekommen. **Nein, zwei Regeln:**

* **Abschnitt unbekannt** — das `AbschnittAngelegt` ist noch unterwegs. Der Zustand ist **vorläufig**: Sobald es eintrifft, steht die Einheit ohne Zutun im richtigen Abschnitt (Rebase). Bis dahin Auffang, Hinweis `abschnittUnbekannt`.
* **Abschnitt aufgelöst** — eine Handlung mit **benanntem Ziel**. Die Einheit dorthin zu bringen ist die Absicht des Bedieners; sie stattdessen in den Auffang zu legen wäre eine dauerhafte Verschlechterung, an der kein später eintreffendes Ereignis mehr etwas änderte.

Beide teilen die Zusicherung dahinter: **Die Stärke einer real gemeldeten Einheit verschwindet nie aus der Gesamtstärke, weil ein Abschnitt fehlt.** Deshalb ist der Auffang zählend, und deshalb ist seine Id reserviert (§5.3.4).

**Der Preis, benannt.** Eine Einheit im Auffang zählt mit, auch wenn ihr echter Abschnitt vom Typ `ANGEFORDERT` oder `ARCHIV` ist und nach ZDM §2.4 **nicht** zählen würde. Trifft das `AbschnittAngelegt` ein, springt die Gesamtstärke nach unten. Das ist die Kehrseite der Zusicherung und in §8.2 als Nicht-Zusicherung geführt: Der Auffang schützt vor dem Verschwinden einer Meldung, nicht vor einer vorübergehend zu hohen Summe. Die Alternative — im Zweifel nicht zählen — verlöre gemeldete Kräfte aus der Lage, und das ist in einer Führungsstelle der gefährlichere Fehler.

**Fahrzeuge gehen nicht in den Auffang.** Ein Fahrzeug hat keine Stärke; die Zusicherung greift für es nicht. Zeigt `FahrzeugVerschoben` oder `FahrzeugAngelegt` auf einen unbekannten Abschnitt, bleibt `abschnittId` gefaltet stehen, `wirksamerAbschnittId` ist **abwesend** (das Fahrzeug hängt an seiner Einheit, nicht an einem Abschnitt), und es entsteht `fremdreferenzUnbekannt` nach §3.10. Ist der Abschnitt aufgelöst, gilt dieselbe Kette wie bei der Einheit (§5.3.2). Damit ist auch P5 sauber getrennt: Es spricht von Einheiten, und für Fahrzeuge gilt die schwächere, aber ausgeschriebene Regel.

**T13:** `EinheitGemeldet` in Abschnitt Q ohne dessen Anlage ⇒ Auffang, Hinweis. **T14:** Dieselbe Menge plus `AbschnittAngelegt(Q)` ⇒ Einheit in Q, kein Hinweis, in jeder Permutation. **T15:** `FahrzeugVerschoben` in unbekannten Abschnitt ⇒ kein Auffang, `fremdreferenzUnbekannt`.

#### §5.3.4 Reservierte Abschnitte und die Invarianten aus ZDM §3.2

Zwei Abschnitte erzeugt der Fold selbst, ohne Ereignis: `AUFFANG` (§5.3.3) und `ARCHIV` (ZDM §3.2 Invariante a: genau einer je Einsatz, systemseitig, nicht löschbar). Beide Ids sind **reserviert**: Eine Anlage darauf wird verworfen und erzeugt `reservierteIdVerworfen`. Ohne die Reservierung könnte eine Anlage dem Auffang einen nicht zählenden Typ geben, und die Stärke jeder dort liegenden Einheit verschwände aus der Lage.

| Invariante ZDM §3.2 | Behandlung |
|---|---|
| (a) genau ein `ARCHIV`, systemseitig, nicht löschbar | reservierte Id, vom Fold erzeugt |
| (b) höchstens ein `FUEHRUNGSSTELLE` ohne `parentId` | **nicht erzwungen.** Zwei Clients können nebenläufig je eine anlegen; ein Verwerfen wäre stilles Verwerfen. Kein Hinweis — die Lage ist im Baum sichtbar, und die Excel kennt „Sonstiges Führung" neben der FüSt. Anzeigefrage, keine Foldregel |
| (c) `parentId` bildet keinen Zyklus | §5.3.1 |
| (d) ein aufgelöster Abschnitt enthält keine Einheiten | §5.3.2, über `wirksamerAbschnittId` |

**T16:** `AbschnittAngelegt` auf `AUFFANG` bzw. `ARCHIV` ⇒ verworfen, Hinweis, Typ des Auffangs unverändert `EINSATZORT`.

### §5.4 Einheit

```ts
/** Die Anlagefelder einer Einheit — auch von EinheitAufgeteilt getragen. */
const zEinheitAnlage = z.object({
  abschnittId: zId,
  bezeichnung: zPflichttext,
  organisation: zOrganisation,
  organisationName: zText.optional(),
  hierarchie: z.array(zHierarchieEbene),
  standortRef: z.number().int().optional(),
  fuestKennung: zText.optional(),
  ebene: zEbene,
  staerke: zStaerke,
  personalErfassung: zPersonalErf,
  status: zStatus,
  schicht: zSchicht.optional(),
  reihenfolge: z.number().int(),
  istFuehrungDesAbschnitts: z.boolean(),
  bemerkung: zText.optional(),
  teilEtikett: zText.optional(),
  abgeteiltVonId: zId.optional(),
  vorlageId: zId.optional(),
  meldungId: zId.optional(),
  einheitSchluessel: zText.optional(),
})

const EinheitGemeldet = zEinheitAnlage.extend({ einheitId: zId })

const EinheitStammdatenGeaendert = z.object({
  einheitId: zId,
  feld: z.enum([
    "bezeichnung","organisation","organisationName","hierarchie","ebene","fuestKennung",
    "bemerkung","teilEtikett","fuehrungskraft","erreichbarkeitOverride","taktischesZeichen",
    "istFuehrungDesAbschnitts","standortRef","psaSaetzeProTag","personalErfassung",
    "einheitSchluessel",
  ]),
})
const StaerkeGeaendert  = z.object({ einheitId: zId, meldezeit: zZeitpunkt.optional() })
const StatusGesetzt     = z.object({ einheitId: zId })
const SchichtGesetzt    = z.object({ einheitId: zId })
const ZeitpunktGesetzt  = z.object({ einheitId: zId,
  feld: z.enum(["eingetroffenAm","verfuegbarBis","einsatzendeAm","rueckfuehrungAm"]) })
const EinheitVerschoben = z.object({ einheitId: zId, kommentar: zText.optional() })
const EinheitUmsortiert = z.object({ einheitId: zId })
const LogistikGesetzt   = z.object({ einheitId: zId,
  feld: z.enum(["weiblich","divers","vegetarisch","vegan",
                "uebernachtungM","uebernachtungW","uebernachtungD"]) })
const SofortbedarfGesetzt = z.object({ einheitId: zId })
const EinheitArchiviert   = z.object({ einheitId: zId })   // neu = "ARCHIV"

const EinheitAufgeteilt = z.object({
  quellEinheitId: zId,
  neueEinheitId:  zId,
  neueEinheit:    zEinheitAnlage,          // vollständige Anlage der abgeteilten Einheit
  uebernommeneFahrzeugIds: z.array(zId),
  uebernommenePersonIds:   z.array(zId),
})   // vorher = gesehene Quellstärke; neu = abwesend

const EinheitZusammengefuehrt = z.object({
  zielEinheitId: zId,
  quellen: z.array(z.object({ einheitId: zId, gesehen: zStaerke })).min(1),
})   // vorher je Quelle in `quellen[].gesehen`; neu = abwesend

const EinheitEntfernt          = z.object({ einheitId: zId })   // neu = true; `grund` Pflicht
const EinheitWiederhergestellt = z.object({ einheitId: zId })   // neu = false
```

| Typ | Feldpfad | Klasse | Undo |
|---|---|---|---|
| `EinheitGemeldet` | Anlage | additiv, bei Kollision §3.11 | frei → `EinheitEntfernt` |
| `EinheitStammdatenGeaendert` | `einheit/<id>/<feld>` | LWW/Feld; `hierarchie`, `fuehrungskraft`, `taktischesZeichen` LWW/Entität | frei |
| `StaerkeGeaendert` | `einheit/<id>/staerke` (Basis) | LWW/Entität über das Tripel | frei |
| `StatusGesetzt` | `einheit/<id>/status` | LWW/Feld | frei |
| `SchichtGesetzt` | `einheit/<id>/schicht` | LWW/Feld | frei |
| `ZeitpunktGesetzt` | `einheit/<id>/<feld>` | LWW/Feld | frei |
| `EinheitVerschoben` | `einheit/<id>/abschnittId` | Regel (§5.3.2) | frei |
| `EinheitUmsortiert` | `einheit/<id>/reihenfolge` | LWW/Feld | frei |
| `LogistikGesetzt` | `einheit/<id>/logistik/<feld>` | LWW/Feld | frei |
| `SofortbedarfGesetzt` | `einheit/<id>/sofortbedarf` | LWW/Entität | frei |
| `EinheitArchiviert` | `einheit/<id>/abschnittId` | Regel (§5.3.2), Ziel `ARCHIV` | frei |
| `EinheitAufgeteilt` | Quelle: `einheit/<quellId>/staerke`; neue Einheit: Anlage | Regel (§5.4.2) | strukturell → `EinheitZusammengefuehrt` |
| `EinheitZusammengefuehrt` | je Quelle `einheit/<quellId>/aufgegangenIn`; Ziel: Delta | Regel (§5.4.3) | strukturell → `EinheitAufgeteilt` |
| `EinheitEntfernt` | `einheit/<id>/entfernt` | LWW/Feld, Wirkung §5.4.5 | frei → `EinheitWiederhergestellt` |
| `EinheitWiederhergestellt` | `einheit/<id>/entfernt` | LWW/Feld | — |

**`einsatzendeAm` beim Archivieren.** `EinheitArchiviert` verschiebt nur; das fachliche Einsatzende der Einheit ist ein eigenes `ZeitpunktGesetzt`. Zwei Werte in einem Ereignis wären zwei Konflikte in einem (§2.2a).

#### §5.4.1 Regel: die Stärke ist ein Tripel

LWW über das ganze Tripel, nicht je Rolle. Die drei Zahlen sind eine Meldung („0/3/17"), keine unabhängigen Felder; ein Merge aus zwei Meldungen ergäbe eine Stärke, die nie jemand gemeldet hat. Passt `vorher` nicht, entsteht `vorherPasstNicht` **mit beiden Werten**.

**T17:** Zwei `StaerkeGeaendert` verschiedener HLC, die verschiedene Rollen ändern ⇒ genau eines der Tripel, nie eine Mischung, plus Hinweis.

#### §5.4.2 Regel: Aufteilen wirkt relativ — und wie das im Zustand steht (Auflage 10)

`EinheitAufgeteilt` **setzt** die Quellstärke nicht, es **verringert** sie um die Stärke der neuen Einheit. v1 setzt absolut und wäre nebenläufig falsch: Zwei gleichzeitige Aufteilungen erzeugten beide Teile, die Quelle sänke nur einmal.

**Die Zusammensetzungsregel.** Das Zustandsfeld `einheit/<id>/staerke` besteht aus einer **Basis** und einem **Änderungsbuch** (§3.2):

> **Wirksame Stärke** = `basis.wert` + Summe der Deltas aus dem Buch, je Rolle, geklemmt bei 0.

* **Basis** ist die gewinnende absolute Beobachtung: aus `EinheitGemeldet`, `StaerkeGeaendert` oder einer EEB-Übernahme. Für sie gilt LWW/Entität wie für jedes andere Feld, samt `zweiter` und Vorher-Prüfung.
* Ins **Buch** kommt jedes Delta mit `hlc > basis.hlc`: `−neueEinheit.staerke` an der Quelle einer Aufteilung, `+gesehen` je Quelle einer Zusammenführung am Ziel (§5.4.3). Trifft eine absolute Beobachtung mit höherer HLC ein, wird sie neue Basis, und alle Deltas darunter fallen aus dem Buch.
* Die **Feld-HLC** von `staerke` ist das Maximum aus `basis.hlc` und den HLCs im Buch. Sie ist es, die ein späteres Rebase vergleicht.

**Warum nur die jüngeren Deltas.** Eine absolute Meldung sagt „so ist der Stand jetzt". Wer nach einer Aufteilung 0/2/15 meldet, hat sie berücksichtigt; sie erneut abzuziehen wäre doppelte Buchung. Ein Delta **nach** der Meldung ist noch nicht enthalten.

**Warum das Buch im Zustand steht und nicht im Akkumulator.** Weil sonst ein Client, der aus einem Schnappschuss startet, ein später eintreffendes älteres `StaerkeGeaendert` anders verrechnete als der volle Fold (§3.1). Die Schranke des Buchs steht in §3.2 Punkt 2.

**Die neue Einheit ist eine vollständige Anlage.** `neueEinheit` trägt alle Pflichtfelder aus ZDM §3.2 — der Client, der aufteilt, kennt die Quelle und füllt sie vor; der Bediener bestätigt. Sie wird nach §3.11 behandelt, `abgeteiltVonId` zeigt auf die Quelle. Ohne diese Festlegung müsste der Fold Felder von der Quelle kopieren, und **welchen Stand der Quelle** er kopierte, hinge vom Zeitpunkt ab — nicht rebase-fest. Zwei Aufteilungen mit derselben `neueEinheitId` kollidieren nach §3.11.

**Klemmen bei null.** Wird eine Rolle negativ, gilt 0 und es entsteht `staerkeGeklemmt` mit dem rechnerischen Wert. Ohne Hinweis wäre die Klemmung stilles Verwerfen; ohne Klemmung stünde eine negative Stärke in der Lage.

**T18:** Zwei nebenläufige Aufteilungen derselben Quelle (je 0/1/3) aus 1/4/12 ⇒ Quelle 1/2/6, zwei neue Einheiten, Gesamtstärke unverändert, in jeder Permutation. **T19:** `StaerkeGeaendert` (HLC 9) nach Aufteilung (HLC 5) ⇒ das Delta wirkt nicht mehr. **T20:** Aufteilung (HLC 9) nach Meldung (HLC 5) ⇒ das Delta wirkt. **T21:** Abgeteilte Stärke größer als die Quelle ⇒ 0/0/0, `staerkeGeklemmt`. **T22 (Rebase):** T20, Schnappschuss, danach trifft `StaerkeGeaendert` (HLC 3) ein ⇒ derselbe Zustand wie beim vollen Fold; das ist der Fall, an dem die erste Fassung dieses Konzepts scheiterte.

#### §5.4.3 Regel: Zusammenführen — je Quelle, nicht als Klumpen

`EinheitZusammengefuehrt` trägt **je Quelle** die gesehene Stärke. Wirkung:

1. Je Quelle wird `einheit/<quellId>/aufgegangenIn` auf `zielEinheitId` gesetzt — LWW/Feld mit `vorher` = der gesehenen Stärke jener Quelle. Eine aufgegangene Einheit bleibt im Zustand, `zaehlt` ist falsch, ihre Zahlen stecken im Ziel.
2. Am Ziel entsteht je Quelle **ein** Delta `+gesehen` im Änderungsbuch (§5.4.2), vermerkt mit der Quell-Id.
3. **Ein Delta wirkt nur, solange seine Quelle auf dieses Ziel zeigt.** Beim Materialisieren zählt ein Merge-Delta genau dann, wenn `einheiten[quellId].aufgegangenIn.wert` gleich dieser Einheit ist.

Punkt 3 löst die überlappende Quellmenge: Führt A die Einheiten {X, Y} zusammen und B gleichzeitig {Y, Z} in ein anderes Ziel, entscheidet für Y das gewöhnliche LWW über `aufgegangenIn` — und das Delta für Y verschwindet automatisch beim Verlierer, statt dort doppelt gutgeschrieben zu bleiben. Ein Klumpenwert `uebernommeneStaerke` (so ZDM §4.2) könnte das nicht: Er ließe sich nicht auf die einzelne Quelle zurückrechnen. Die Abweichung von ZDM ist in §10 geführt.

**Kreise und Selbstbezug.** Zeigt `aufgegangenIn` nach mehreren Schritten auf eine bereits besuchte Einheit — der Grenzfall A→B und B→A —, wird die Kante mit der **größeren** HLC nicht wirksam: Jene Einheit bleibt eigenständig, und es entsteht `zusammenfuehrungKreis`. Dasselbe gilt, wenn `zielEinheitId` in den eigenen `quellen` steht. Ohne diese Regel wären beide Einheiten „aufgegangen", zählten nirgends, und ihre Stärke verschwände still aus der Lage — genau das, was §5.3.3 als tragende Zusicherung ausschließt. Die Auflösung folgt derselben Richtung wie §5.3.1 und ist aus demselben Grund deterministisch.

**P4 (Summenerhaltung) hält genau dann,** wenn die gesehenen Quellstärken den wirksamen Stärken der Quellen entsprechen. Weicht eine ab — eine Quelle hat nebenläufig neu gemeldet —, entsteht das gewöhnliche `vorherPasstNicht` an ihrem Stärkefeld und zusätzlich `zusammenfuehrungSummeWeichtAb` mit beiden Zahlen. Der Vergleich läuft gegen den **gefalteten** Stand der Quelle, nicht gegen einen historischen Zwischenstand: Ein Zwischenstand stünde nicht im Zustand und wäre nach einem Schnappschuss nicht rekonstruierbar (§3.1). Damit ist P4 bedingt zugesagt, und die Bedingung ist am Hinweis ablesbar (§8.1).

**T23:** Zwei Quellen 0/1/3 und 0/2/6 ⇒ Ziel plus 0/3/9, Quellen aufgegangen, Gesamtstärke unverändert. **T24:** Eine Quelle meldet nebenläufig anders ⇒ beide Hinweise. **T25:** Dieselbe Zusammenführung zweimal (verschiedene Ereignis-Ids) ⇒ das Delta wirkt einmal. **T26:** {X,Y} nach Z1 und {Y,Z} nach Z2 ⇒ Y zählt genau einmal, beim Gewinner. **T27:** A→B und B→A ⇒ eine Einheit bleibt eigenständig, `zusammenfuehrungKreis`, Gesamtstärke unverändert. **T28:** `zielEinheitId` in `quellen` ⇒ dieselbe Behandlung.

#### §5.4.4 Die mögliche Dublette

Zwei Clients melden dieselbe reale Einheit — am Meldekopf und in der Führungsstelle. Das ist **kein technischer Konflikt**: zwei Ids, zwei Anlagen, beide gültig. Erkennung über `einheitSchluessel` (aus dem EEB, Heuristik).

**Form des Hinweises.** Je Schlüssel **ein** Hinweis, nicht paarweise: `moeglicheDublette` mit der aufsteigend sortierten Liste aller beteiligten Ids und dem Feldpfad `einheit/<kleinste Id>/einheitSchluessel`. Bei drei Kandidaten also ein Hinweis mit drei Ids. Paarweise Hinweise wären bei vier Einheiten sechs Zeilen für einen Sachverhalt, und ihre Zahl hinge von einer Wahl ab, die zwei Clients gleich treffen müssten, damit P3 hält.

**Wer zählt mit.** In die Gruppe gehen nur Einheiten ein, für die `zaehlt` gilt — also weder entfernte (§5.4.5) noch aufgegangene. Bleibt danach nur eine übrig, entsteht kein Hinweis. Damit verschwindet er sowohl nach einer Zusammenführung als auch nach dem Entfernen der Dublette, und die Behandlung ist symmetrisch zu §5.6.1, wo eine stornierte Anforderung ebenso herausfällt.

**Aufgelöst wird nur von Hand,** durch `EinheitZusammengefuehrt` oder `EinheitEntfernt`. Automatisch zu verschmelzen wäre falsch: Zwei Trupps derselben Fachgruppe können denselben Schlüssel tragen, und eine automatische Verschmelzung nähme eine Meldung aus der Lage. Der Schlüssel ist nach `einsaetze.ts` ausdrücklich „von der App vorgeschlagen, vom Menschen bestätigt" — deshalb ist er über `EinheitStammdatenGeaendert` auch **änderbar**: Ein falsch vorgeschlagener Schlüssel muss korrigierbar sein, sonst bliebe der Hinweis dauerhaft stehen.

**T29:** Zwei `EinheitGemeldet` mit demselben Schlüssel ⇒ beide zählen, ein Hinweis mit zwei Ids. **T30:** Drei ⇒ ein Hinweis mit drei Ids. **T31:** Nach Zusammenführung bzw. nach `EinheitEntfernt` ⇒ kein Hinweis. **T32:** Nach `EinheitStammdatenGeaendert` auf `einheitSchluessel` ⇒ kein Hinweis.

#### §5.4.5 Regel: Entfernen ist kein Löschen

`EinheitEntfernt` löscht nichts. Die Einheit wird markiert, zählt in keiner Summe mehr (`zaehlt` falsch), bleibt aber in Einsatztagebuch und Historie (EXH N-6, F-E2). `grund` ist Pflicht.

`entfernt` ist ein gewöhnliches LWW/Feld über das Ereignispaar `EinheitEntfernt`/`EinheitWiederhergestellt` — sonst wäre die Wiederherstellung nicht möglich. Der Satz aus ZDM §4.2, das Entfernen „gewinne gegen alle nebenläufigen Feldänderungen", bedeutet **nicht**, dass es andere Felder verdrängt: Sie werden weiter gefaltet, damit eine Wiederherstellung den neuesten Stand zeigt. Er bedeutet, dass die Einheit **unabhängig von jedem anderen Feld** nirgends mitzählt, solange `entfernt` gilt. Das ist die einzige Lesart, unter der Entfernen und Wiederherstellen zusammenpassen.

Dieselbe Regel und dasselbe Ereignispaar gelten für `Fahrzeug`, `Person`, `Dienstposten` und `Anhang` (§5.5, §5.7, §5.8). Die Gegenereignisse sind benannt und tragen keinen Pflicht-`grund` — eine Rücknahme braucht keine Begründung, das Entfernen schon.

**T33:** `EinheitEntfernt` (HLC 5), `StaerkeGeaendert` (HLC 7) ⇒ entfernt, Stärke aktualisiert, zählt nicht. **T34:** Dazu `EinheitWiederhergestellt` (HLC 9) ⇒ zählt wieder, mit der Stärke aus HLC 7.
