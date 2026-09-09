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

**(a) Ein setzendes Ereignis setzt genau ein Zustandsfeld.** Der Katalog nennt es je Art in der Spalte „Feldpfad". Wo eine Art mehrere Werte ändern müsste, ist sie entweder zerlegt (`EinsatzStammdatenGeaendert`, `ZeitpunktGesetzt`, `LogistikGesetzt` tragen das Feld als Auswahl in der Nutzlast) oder die Werte sind zu **einem** Feld zusammengefasst, dessen Wert eine Struktur ist (Klasse LWW/Entität, §3.4).

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
