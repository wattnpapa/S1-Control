# KONZEPT-EREIGNISSE — Ereigniskatalog, Konfliktregeln, Undo

Stand: 2026-09-09 · Paket M1.2 · Status: **Entwurf, noch nicht freigegeben**

Verbindliche Grundlagen: [KONZEPT-SPEICHER.md](KONZEPT-SPEICHER.md) (freigegeben am 2026-09-08), [03-MEILENSTEINE.md](../03-MEILENSTEINE.md) Auflagen 4, 6, 10, 11, 12 und 13, [02-ZIELBILD.md](../02-ZIELBILD.md). Fachliche Quelle: `docs/v2-arbeitsstand/entwurf/zieldatenmodell-feldabgleich.md` §3 und §4 — im Folgenden **ZDM**. Stand des Codes: `packages/domaene/src/{ereignis,fold,zustand}.ts` aus M0.2.

Dieses Dokument ist die Spezifikation, gegen die M1.3 gebaut wird. Code-Kommentare in `@s1/domaene` verweisen auf seine Paragraphen, so wie `@s1/speicher` auf die von KONZEPT-SPEICHER.md verweist. Wo eine Zahl oder eine Festlegung erst durch eine Antwort der Führungsstelle oder durch eine Messung bestimmt wird, steht hier ein **Startwert** mit Begründung und in §10 sein Eintrag — kein Ratewert ohne Kennzeichnung.

---

## §1 Zweck, Geltungsbereich und Abgrenzung

### §1.1 Was dieses Konzept festlegt

Welche Ereignisarten es gibt, welche Nutzlast jede trägt, mit welcher Regel ein Konflikt zwischen zwei Ereignissen entschieden wird, und was der Fold aus einer Ereignismenge macht. Konkret: der fachliche Teil des Rahmens und die Bedeutung von `vorher` je Art (§2), die Regeln, die für jede Art gelten (§3), Nutzlastversionen und Upcaster (§4), der Katalog selbst (§5), die Undo-Semantik U1 bis U6 (§6), die Barriere `EinsatzArchiviert` (§7), Zusicherungen und ihre Grenzen (§8).

Es ist damit die zweite Hälfte der Auflagen 10, 11 und 12, deren erste Hälfte KONZEPT-SPEICHER.md §9 ausdrücklich offen lässt.

### §1.2 Was dieses Konzept nicht festlegt

**Kennzahlen und Excel-Formeln.** Welche Summe über welche Menge läuft (ZDM §3.3, K1 bis K24), gehört zu M1.3. Dieses Dokument sagt, welcher Wert im Zustand steht und wer ihn gesetzt hat; es sagt nicht, wie er aufaddiert wird. Die einzige Ausnahme sind die drei Stellen, an denen eine Zählregel die **Konfliktauflösung** bestimmt: der Abschnittstyp `ANGEFORDERT` (§5.3), der Auffangabschnitt (§5.3) und die Nichtzählung aufgegangener Einheiten (§5.4).

**Die Speicherschicht.** Zeilenformat, Hash-Kette, Segmente, Spiegel, Poll, Schnappschüsse und jedes Fehlerbild der Dateiebene stehen in KONZEPT-SPEICHER.md und werden hier **benutzt und nicht geändert**. Wo dieses Dokument beim Schreiben auf eine Abweichung oder eine Lücke gestoßen ist, steht sie als Befund in §10 und nicht als Änderung.

**Die beiden Verwaltungsereignisse.** `SegmentAbgeschlossen` und `SegmentErsetzt` gehören der Speicherschicht (KONZEPT-SPEICHER.md §2.4, §4.3, §4.6). Sie tauchen in diesem Katalog **nicht** auf, der Fold ändert an ihnen keinen fachlichen Zustand, und das Einsatztagebuch zeigt sie nicht. Ein Segmentwechsel ist kein Vorgang der Lage.

**Die Oberfläche.** Welche Maske welches Feld anbietet, wann ein Bedienschritt welches Ereignis erzeugt und wie ein Konflikthinweis aussieht, ist M2 und M3. Hier steht, dass der Hinweis Bestandteil des **Zustands** ist (§3.7) — nicht, wie er aussieht.

**Die Migration.** ZDM §5.1 bis §5.3 (v1-JSON, Excel-Mappe, EEB-QR) erzeugt Ereignisse dieses Katalogs, ändert aber keine Regel. Die Abbildung gehört zu M1.5 und M4.

**Rollen und Rechte.** Es gibt keine (Entscheidung 9). `akteur` ist Protokoll, keine Berechtigung. Kein Ereignis dieses Katalogs wird abgelehnt, weil ein Akteur es nicht hätte auslösen dürfen.

### §1.3 Die vier tragenden Sätze

1. **Der Fold ist eine Mengenfunktion.** Das Ergebnis hängt allein von der Menge der Ereignisse ab — nicht von ihrer Reihenfolge, nicht von der Zahl der Schübe, in denen sie ankommen, und nicht davon, welcher Client faltet. Jede Regel dieses Dokuments entscheidet ausschließlich anhand der HLC-Ordnung (§3.1) und des bereits gefalteten Zustands, nie anhand der Ankunftsreihenfolge.
2. **Nichts wird still verworfen.** Verliert ein Ereignis einen Konflikt, entsteht ein Konflikthinweis, und der Hinweis ist Teil des Zustands (§3.7). Ein Ereignis, dessen Art oder Version dieser Client nicht kennt, wird nicht gefaltet, aber geführt und unverändert weitergespiegelt (§3.6). Auflage 6 und KONZEPT-SPEICHER.md §2.5 lassen keine dritte Möglichkeit.
3. **Der Zustand ist wiederherstellbar.** Kein Feld des Zustands hat eine andere Quelle als die Ereignismenge. Es gibt keinen Zustand, den ein Bedienschritt erzeugt und kein Ereignis trägt.
4. **Eine Regel, die einen Fall nicht kennt, wird im Code von Hand ausgelegt.** Das ist die Lehre aus M0.4 Abschnitt 2 und aus den zehn Befunden, die `akte.ts` in M0.3 gekostet hat. Deshalb nennt jede Regel dieses Dokuments ihren Grenzfall, und §11 führt zu jeder Regel den Fall, an dem sie geprüft wird.

---

## §2 Der Rahmen — fachlich gelesen

### §2.1 Was der Rahmen ist und wo er steht

Die Rahmenfelder legt KONZEPT-SPEICHER.md §2.4 fest; sie werden hier nicht wiederholt und nicht geändert. Für den Fold sind sie so zu lesen:

| Feld | Fachliche Lesart |
|---|---|
| `id` | `<clientId>:<laufnummer>` (§3.3 Speicher). Idempotenzschlüssel des Folds (§3.2) |
| `hlc` | die **einzige** Ordnung. Jeder Konflikt wird über sie entschieden (§3.1) |
| `schemaVersion` | Version der **Nutzlast dieser Ereignisart** (§4). Siehe Befund B1 in §10 |
| `typ` | Schlüssel in den Katalog aus §5 |
| `akteur` | Protokoll und Anzeige im Einsatztagebuch, nie Berechtigung |
| `wanduhr` | Anzeige und Plausibilisierung, nie Ordnung (§2.4) |
| `vorher` / `neu` | der gesehene Vorher-Wert und der neue Wert des **einen** Feldes, das die Ereignisart setzt (§2.2) |
| `undoOf` | Kompensation; ein gewöhnliches Ereignis ohne Sonderpfad (§6) |
| `korrekturVon` | Berichtigung eines fachlich falschen Eintrags (§6, U4) |
| `grund` | Freitext; erscheint im Einsatztagebuch. Bei zwei Arten Pflicht (§5.3, §5.4) |
| `nutzlast` | alles Übrige; je Art durch das zod-Schema in §5 festgelegt |

### §2.2 `vorher` — welches Feld es beschreibt (Auflage 6)

Auflage 6 verlangt, dass jedes **setzende** Ereignis den beim Bedienen gesehenen Vorher-Wert mitführt und dass eine Abweichung vom gefalteten Zustand einen Konflikthinweis erzeugt. Damit die Auswertung nicht je Art neu erfunden wird, gilt:

**Ein setzendes Ereignis setzt genau ein Feld.** `vorher` und `neu` beschreiben immer dieses eine Feld, und der Katalog nennt es je Art in der Spalte „Feldpfad". Wo eine Ereignisart mehrere Felder ändern könnte, ist sie in mehrere Arten zerlegt oder trägt das zu setzende Feld als Nutzlast (`feld`) — so wie `EinsatzStammdatenGeaendert`, `EinheitStammdatenGeaendert`, `ZeitpunktGesetzt` und `LogistikGesetzt` es tun. Der Feldpfad ist dann `<entität>/<id>/<feld>`.

Warum nicht mehrere Felder je Ereignis: Der Fold hält seinen Akkumulator je Feld (§3.3). Ein Ereignis, das drei Felder setzt, müsste bei drei verschiedenen Feldern gleichzeitig gewinnen oder verlieren dürfen — es gewönne dann bei einem und verlöre bei einem anderen, und `vorher` beschriebe drei Werte, von denen nur einer geprüft würde. Die einzigen Ausnahmen sind die **Tripel** (§3.3, Klasse LWW/Entität): Dort ist der zusammengesetzte Wert fachlich *ein* Wert.

**Wo es keinen Vorher-Wert gibt.** Anlagen (`EinsatzAngelegt`, `AbschnittAngelegt`, `EinheitGemeldet`, `FahrzeugAngelegt`, `PersonHinzugefuegt`, `AuftragErfasst`, `AnforderungAngelegt`, `DienstpostenAngelegt`, `EtbEintragErfasst`, `EebMeldungEmpfangen`, `AnhangHinzugefuegt`) tragen keinen — es gab vorher nichts zu sehen. Die Folge ist benannt und gebaut: Verdrängt eine Anlage durch ihre höhere HLC eine Änderung an demselben Feld, entsteht der Hinweis `ohneVorherWertVerdraengt` (`zustand.ts`, aus M0.2). Der Fall ist real: `EinheitGemeldet` setzt `abschnittId` und `staerke` mit, und eine zweite Anlage derselben Id mit höherer HLC verdrängte sonst still eine Verschiebung.

**Optionale Felder.** Ist das Feld vor dem Ereignis nicht gesetzt, ist `vorher` **abwesend**, nicht `null`. `null` als `neu` bedeutet dagegen ausdrücklich „Wert löschen" beziehungsweise bei `LogistikGesetzt` „Override aufheben, wieder ableiten" (ZDM §4.2). Die Unterscheidung ist nötig, weil die kanonische Serialisierung (KONZEPT-SPEICHER.md §7.6) Felder ohne Wert weglässt statt `null` zu schreiben; ohne sie wären „nie gesetzt" und „bewusst geleert" im Zustand nicht unterscheidbar.

### §2.3 `grund` — wo er Pflicht ist

Freitext, geht ins Einsatztagebuch, überall optional außer bei zwei Arten:

* `AbschnittTypGeaendert` — ändert Zählregeln rückwirkend für jede Auswertung (ZDM §4.2).
* `EinheitEntfernt`, `FahrzeugEntfernt`, `PersonEntfernt`, `AnforderungStorniert` — nimmt etwas aus allen Summen, das jemand gemeldet hat.

Bei diesen Arten ist eine leere Zeichenkette ungültig (zod: `z.string().min(1)`), und die Oberfläche erzwingt die Eingabe. Bei allen anderen ist `grund` erlaubt und wird, wenn vorhanden, im Einsatztagebuch mit angezeigt.

### §2.4 Zwei Zeiten und die Plausibilisierung (Auflage 12)

KONZEPT-SPEICHER.md §3.1 trennt die technische Ordnung (HLC) von der fachlichen Zeit (Meldezeit, Einsatzbeginn, Einsatzende) und schiebt die Plausibilisierungsschwelle ausdrücklich hierher (§9, Auflage 12).

**Die Regel.** Trägt ein Ereignis eine fachliche Zeit — `meldezeit` bei `StaerkeGeaendert`, `von`/`bis` bei `AuftragErfasst`, die vier Zeitpunkte bei `ZeitpunktGesetzt`, `angefordertAm`/`zugesagtFuer` bei den Anforderungsereignissen — und weicht diese um mehr als die Schwelle von der `wanduhr` desselben Ereignisses ab, erzeugt der Fold den Hinweis `meldezeitUnplausibel` an dem Feld, das die Zeit trägt. Bei `StaerkeGeaendert` steht der Hinweis nach Auflage 12 ausdrücklich **am Stärkewert**, nicht an einem eigenen Zeitfeld.

**Schwelle: 12 Stunden, in beide Richtungen. Startwert (§10, S1).** Begründung: Eine Meldung, die in der Nacht für den Vortag nachgetragen wird, ist Alltag; eine Meldezeit drei Tage in der Zukunft ist es nicht. Die Schwelle ist bewusst grob — sie soll grobe Vertipper fangen („2026" statt „2025", Monat und Tag vertauscht), nicht die Nacharbeit stören.

**Der Hinweis ist kein Fehler.** Das Ereignis wird gefaltet und wirkt. Auflage 12 verlangt „anzeigen und plausibilisieren", nicht ablehnen — und eine abgelehnte Meldung wäre stilles Verwerfen nach §1.3 Satz 2.

**Die Schwelle entscheidet keinen Konflikt.** Sie erzeugt nur einen Hinweis. Täte sie mehr, hinge die Konfliktauflösung an der Wanduhr, und §3.1 gälte nicht mehr.

---

## §3 Regeln, die für jede Ereignisart gelten

### §3.1 Ordnung: HLC, dann Ereignis-Id

Gefaltet wird nach `hlc` (KONZEPT-SPEICHER.md §3.2), nie nach `wanduhr`. Bei **gleicher** HLC entscheidet die Ereignis-Id als Zeichenkette in Codepoint-Ordnung.

Der zweite Schritt ist keine Verzierung. Zwei verschiedene Ereignisse mit derselben HLC sind ein Protokollbruch — §3.2 der Speicherschicht erhöht den Zähler je eigenem Ereignis, §3.3 verbietet die Doppelvergabe der Laufnummer. Genau diesen Bruch erzeugt aber das geklonte Profil, dessen Injektion M0 verlangt. Ohne den Tie-Break entschiede der Fold in diesem Fall nach Eintreffreihenfolge und wäre ausgerechnet dort keine Mengenfunktion mehr, wo die Fehlerinjektion hinzielt. Der Fold aus M0.2 tut das bereits (`vergleicheBeobachtung` in `fold.ts`); hier steht die Begründung als Regel.

### §3.2 Idempotenz

**Über die Ereignis-Id.** Ein Ereignis, dessen `id` bereits gefaltet ist, wird verworfen — ohne Hinweis, weil nichts verloren geht (ZDM §4.1 Regel 2). Das ist Prüfkriterium P2.

**Über einen fachlichen Schlüssel.** Zwei Arten haben zusätzlich einen inhaltlichen Idempotenzschlüssel, weil dieselbe reale Tatsache von zwei Clients unabhängig erfasst werden kann:

* `EebMeldungEmpfangen` über `meldungId` (= `bogenInhaltsId(bogen)`). Zwei Arbeitsplätze, die denselben QR-Code scannen, erzeugen zwei Ereignisse mit verschiedener `id`, aber derselben `meldungId` — und **eine** Meldung im Zustand.
* `AnhangHinzugefuegt` über `anhangId` (= SHA-256 des Inhalts).

Bei beiden gilt: Das Ereignis mit der **kleineren** HLC liefert die Werte (§3.4); ein zweites mit abweichendem Inhalt bei gleichem Schlüssel ist ein Widerspruch und erzeugt `inhaltsschluesselWidersprochen`. Bei `AnhangHinzugefuegt` kann das nur bei einer SHA-256-Kollision oder einer gefälschten Id auftreten; bei `EebMeldungEmpfangen` reicht ein abweichendes `empfangenAm` — deshalb gehen in den Vergleich nur die inhaltstragenden Felder ein (`bogen`, `einheitSchluessel`, `stand`, `signatur`), nicht `empfangenAm` und nicht `quelle`.

### §3.3 Die vier Konfliktklassen

Jede Ereignisart des Katalogs trägt genau eine dieser vier Klassen. Die Legende stammt aus ZDM §4.2; die Präzisierung, ohne die sie nicht baubar ist, steht hier.

**LWW/Feld.** Der Akkumulator hält je Feldpfad die beiden höchsten Beobachtungen nach der Ordnung aus §3.1. Der Gewinner liefert Wert und Feld-HLC (Auflage 4, KONZEPT-SPEICHER.md §7.4); die zweithöchste Beobachtung ist der Wert, gegen den der gesehene `vorher` des Gewinners geprüft wird (§2.2). Zwei Clients, die **verschiedene** Felder derselben Entität ändern, verlieren nichts.

**LWW/Entität.** Wie LWW/Feld, aber der Feldpfad umfasst mehrere Werte, die fachlich **eine** Meldung sind. Der Katalog nennt sie einzeln: das Stärke-Tripel, die Dienstpostenbesetzung, der Sofortbedarf-Block, die Teilstrukturen `hierarchie` und `fuehrungskraft`. Ein Merge über die Bestandteile wäre nicht falsch berechnet, sondern falsch gedacht: Er erzeugte eine Meldung, die niemand abgegeben hat.

**Additiv.** Das Ereignis legt eine Entität mit eigener Id an oder hängt einen unveränderlichen Eintrag an. Die Reihenfolge ist ohne Bedeutung, weil sich zwei solche Ereignisse nie auf dasselbe Feld beziehen. Kollidieren doch zwei Anlagen derselben Id, greift §3.4.

**Regel.** Eine fachliche Auflösung, die im Katalog ausgeschrieben ist. Jede dieser Regeln entscheidet ausschließlich anhand der HLC-Ordnung und des gefalteten Zustands (§1.3 Satz 1) — deshalb gilt P1 auch für sie.

### §3.4 Die Anlage-Regel: die kleinste HLC gilt

Für **jede** anlegende Ereignisart gilt: Liegen zwei Anlagen derselben Entitäts-Id vor, gilt die mit der **kleinsten** HLC; jede weitere wird verworfen und erzeugt den Hinweis `zweiteAnlageVerworfen` **mit dem verworfenen Inhalt**.

Drei Gründe:

1. ZDM §4.2 nennt `EinsatzAngelegt` „erstes Ereignis der Akte; ein zweites wird verworfen". „Erstes" kann nicht die Ankunft meinen — das wäre nicht konvergent. Die Analogie zu `EinsatzArchiviert` („die mit kleinerer `hlc` gilt") gibt die Lesart vor.
2. Würde die **größte** HLC gewinnen, überschriebe eine verspätete Zweitanlage die gesamte Arbeit an dieser Entität, die zwischen beiden Anlagen geschehen ist — sie trägt ja alle Anlagefelder mit und keinen Vorher-Wert.
3. Der verworfene Inhalt gehört in den Hinweis, weil eine zweite `EinheitGemeldet` eine real gemeldete Stärke tragen kann. Ohne ihn verschwände eine Meldung spurlos.

Sind beide Anlagen **inhaltsgleich**, entsteht kein Hinweis: Es ist nichts verloren gegangen.

Der Fold aus M0.2 setzt die Regel bereits um (`nimmAnlage` in `fold.ts`). Neu ist hier nur, dass sie für alle elf Anlagearten des vollen Katalogs gilt und nicht nur für die drei des Minimalsets.

### §3.5 Wie viele Beobachtungen je Feld — und was das für die Hinweiskette heißt

Der Akkumulator hält je Feld **zwei** Beobachtungen. Das hat eine Folge, die M0.2 als offene Entscheidung hierher verwiesen hat: Bei drei und mehr nebenläufigen Schreibern auf demselben Feld bekommt nur der zweithöchste einen Hinweis, die darunter nicht.

**Entschieden: Es bleibt bei zwei Beobachtungen.** Begründung:

* Ein Schnappschuss trägt nach KONZEPT-SPEICHER.md §7.4 den **Zustand samt Feld-HLC**, nicht den Ereignisstrom. Ein Akkumulator, der alle Beobachtungen bräuchte, wäre aus einem Schnappschuss nicht wiederherstellbar — der Rebase nach dem Laden entschiede anders als der volle Fold, und zwei Clients mit demselben Ereignisstand hätten verschiedene Hinweise. Das verletzte P3 an genau der Stelle, an der P3 gebraucht wird.
* Die Alternative wäre, den Schnappschuss die volle Beobachtungsliste je Feld mitschreiben zu lassen. Damit wüchse er mit der Zahl der Konflikte statt mit der Zahl der Felder, und §7.5 der Speicherschicht müsste geändert werden — was M1.2 nicht darf.

**Was daraus zugesichert wird und was nicht,** steht in §8.2. Der praktische Schaden ist begrenzt: Der Hinweis nennt den Gewinner, den verdrängten Wert und den Feldpfad; wer wissen will, wer sonst noch geschrieben hat, findet es im Einsatztagebuch, das jedes Ereignis führt.

**Der dritte Schreiber verschwindet nicht.** Sein Ereignis steht in der Akte, erscheint im Einsatztagebuch und wird beim Rebase weiterhin berücksichtigt — es entsteht nur kein eigener Konflikthinweis an dem Feld.

### §3.6 Unbekannte Arten, unbekannte Versionen, unbekannte Felder

ZDM §4.1 Regel 4 und KONZEPT-SPEICHER.md §8.7: Ein Client, der etwas nicht kennt, **reicht es durch**.

1. **Unbekannte Ereignisart.** Nicht gefaltet. Im Zustand als `unbekannt` geführt mit `id`, `typ`, `schemaVersion`, `hlc` und Akteur; das Einsatztagebuch zeigt „unbekanntes Ereignis (Typ X, Version Y) von <Akteur>". Beim Spiegeln unverändert weitergeschrieben.
2. **Bekannte Art, höhere Nutzlastversion als die eigene.** Ebenso — es gibt keinen Downcaster (§4.3). Der Zustand führt sie in derselben Liste, das Tagebuch nennt Art und Version.
3. **Bekannte Art, bekannte Version, unbekannte Felder in der Nutzlast.** Gefaltet. Die unbekannten Felder werden ignoriert und **unverändert mitgeführt**; sie fließen nicht in den Zustand ein und werden beim Spiegeln nicht entfernt. Deshalb ist jedes zod-Schema dieses Katalogs **nicht** `strict`: `.strict()` würde ein Ereignis eines neueren Clients zurückweisen und damit aus einer Toleranzregel eine Sperre machen.
4. **Fehlende Pflichtfelder oder falsche Typen.** Das ist etwas anderes als „unbekannt": Die Nutzlast ist nach dem eigenen Schema ungültig. Behandlung wie 1 — nicht gefaltet, aber geführt, mit dem Zusatz „Nutzlast entspricht nicht dem Schema". Der Fold darf hier nicht raten und darf auch nicht abstürzen; ein Zeilenfehler ist Sache der Speicherschicht (§8.2 dort), ein Schemafehler Sache dieser Regel.

Ein alter Client beschädigt damit die Daten eines neuen nicht — die Zusage aus §8.7 der Speicherschicht wird hier eingelöst.

### §3.7 Konflikthinweise sind Zustand, nicht Oberfläche

Prüfkriterium P3 verlangt ausdrücklich, dass zwei Clients mit derselben Ereignismenge auch **dieselben Hinweise** führen. Der Hinweis geht deshalb in die kanonische Serialisierung und damit in den `zustandsHash` ein (KONZEPT-SPEICHER.md §7.6). Zwei Clients, die denselben Wert, aber verschiedene Hinweise führen, sind **nicht** konvergent.

Die Hinweisarten dieses Konzepts, vollständig:

| Art | Bedeutung | Wo festgelegt |
|---|---|---|
| `vorherPasstNicht` | der gesehene Vorher-Wert des Gewinners passt nicht zu dem, was der Vorgänger gesetzt hat | §2.2 |
| `ohneVorherWertVerdraengt` | der Gewinner führte keinen Vorher-Wert mit und verdrängt trotzdem eine Änderung | §2.2 |
| `zweiteAnlageVerworfen` | zweite Anlage derselben Id, mit ihrem Inhalt | §3.4 |
| `reservierteIdVerworfen` | eine Anlage wollte die Auffang-Id belegen | §5.3 |
| `abschnittUnbekannt` | die Einheit zeigt auf einen Abschnitt, den es (noch) nicht gibt | §5.3 |
| `anlageFehlt` | Feldänderungen liegen vor, die Anlage der Entität fehlt | §3.4 |
| `meldezeitUnplausibel` | fachliche Zeit weicht über der Schwelle von der Wanduhr ab | §2.4 |
| `inhaltsschluesselWidersprochen` | zwei Ereignisse mit gleichem fachlichem Idempotenzschlüssel, aber abweichendem Inhalt | §3.2 |
| `abschnittAufgeloest` | die Einheit wurde in einen aufgelösten Abschnitt verschoben und steht im Ziel der Auflösung | §5.3 |
| `zyklusAufgeloest` | eine Umhängung hätte einen Zyklus erzeugt; der Abschnitt hängt an der Wurzel | §5.3 |
| `staerkeGeklemmt` | eine relative Stärkeänderung wäre negativ geworden und wurde auf 0 geklemmt | §5.4 |
| `zusammenfuehrungSummeWeichtAb` | die übernommene Stärke passt nicht zur Summe der Quellen | §5.4 |
| `nachArchivierungEingegangen` | das Ereignis liegt nach der maßgeblichen Archivierung | §7 |
| `undoTrifftFremdenStand` | ein Undo verdrängt eine Änderung, die der Bediener nicht gesehen hat | §6, U6 |
| `moeglicheDublette` | zwei Einheiten mit demselben `einheitSchluessel` | §5.4 |

Die ersten sechs sind in M0.2 gebaut; die übrigen neun kommen mit M1.3 dazu. Kein Hinweis ist ein Fehler: Jeder benennt eine Lage, in der zwei Menschen gleichzeitig etwas Sinnvolles getan haben.

---

## §4 Nutzlastversionen und die Upcaster-Kette

### §4.1 Eine Version je Ereignisart, nicht eine für alle

`schemaVersion` im Rahmen ist die Version der **Nutzlast dieser Ereignisart**. Sie beginnt bei jeder Art bei `1` und wird unabhängig von den anderen erhöht. Eine gemeinsame Version für alle wäre unbrauchbar: Jede Erweiterung an einer Art zwänge jede andere in eine neue Version, und ein Client müsste für jede Art einen Upcaster schreiben, der nichts tut.

Das Feld heißt trotzdem `schemaVersion` und nicht `v` (so ZDM §4.1) — die Speicherschicht führt es unter diesem Namen, und der Rahmen wird hier nicht geändert. Dass KONZEPT-SPEICHER.md §2.4 es als „Version des Ereignisrahmens" beschreibt, ist Befund B1 (§10).

### §4.2 Was ein Upcaster darf

Ein Upcaster bildet eine Nutzlast der Version `n` auf die Version `n+1` derselben Ereignisart ab. Er ist:

* **rein** — gleiche Eingabe, gleiche Ausgabe, kein Zugriff auf Uhr, Zufall, Dateisystem oder Netz;
* **zustandsblind** — er sieht **nicht** den gefalteten Zustand und nicht andere Ereignisse. Sähe er sie, hinge das Ergebnis des Folds von der Reihenfolge ab, in der die Ereignisse durch den Upcaster laufen, und §1.3 Satz 1 fiele;
* **rahmenblind** — er ändert `id`, `hlc`, `typ`, `akteur`, `wanduhr`, `vorher`, `neu`, `undoOf`, `korrekturVon` nicht. Er arbeitet allein auf `nutzlast`.

Erlaubt sind: ein Feld umbenennen; ein Feld in mehrere zerlegen, wenn die Zerlegung allein aus dem alten Wert folgt; ein Feld ergänzen, dessen Wert sich **aus der Nutzlast selbst** ergibt; ein Feld entfernen, das der neue Zustand nicht mehr kennt.

Verboten ist, ein Pflichtfeld mit einem erfundenen Vorgabewert zu füllen. Lässt sich der Wert nicht aus der alten Nutzlast ableiten, bleibt das Feld in der neuen Version **optional** — für immer. Ein erfundener Vorgabewert wäre eine Tatsachenbehauptung über eine Lage, bei der niemand dabei war; genau davor warnt der Auftrag zu M1-einstieg.

### §4.3 Die Kette, und was mit einer höheren Version geschieht

Ein Client kennt je Ereignisart die Versionen `1 … k`. Beim Lesen läuft eine Nutzlast der Version `n < k` durch die Upcaster `n → n+1 → … → k` und wird danach gegen das Schema der Version `k` geprüft. Es gibt **keinen Downcaster**: Eine Nutzlast der Version `> k` wird nach §3.6 Punkt 2 behandelt — nicht gefaltet, geführt, unverändert weitergespiegelt.

Zwei Festlegungen dazu:

* **Der Upcaster läuft beim Lesen, nie beim Schreiben.** Die Datei wird nicht umgeschrieben; das Protokoll ist append-only (KONZEPT-SPEICHER.md §1.3). Was auf der Platte liegt, bleibt in der Version, in der es geschrieben wurde.
* **Beim Spiegeln läuft er nicht.** Ein Client, der ein fremdes Ereignis weiterspiegelt, schreibt die **Originalbytes**. Täte er es nicht, hinge der Inhalt der Akte davon ab, welcher Client zufällig gespiegelt hat, und die Hash-Kette (§2.3 der Speicherschicht) bräche.

### §4.4 Startzustand

**Alle Ereignisarten dieses Katalogs stehen bei `schemaVersion = 1`.** Es gibt noch keinen Upcaster; die Kette ist leer. Sie steht hier trotzdem vollständig beschrieben, weil der erste Upcaster sonst im Code erfunden würde — die Lehre aus §1.3 Satz 4.

Der erste Anwendungsfall ist absehbar und dient als Prüfstein: Sobald eine der offenen Fragen 19 bis 22 aus [04-OFFENE-ENTSCHEIDUNGEN.md](../04-OFFENE-ENTSCHEIDUNGEN.md) anders beantwortet wird als der Startwert, ändert sich ein Wertebereich. Für Frage 20 (HK) wäre das ein Upcaster von `WASSERWIRTSCHAFT` auf zwei getrennte Schlüssel — ableitbar allein aus `organisationName`, also nach §4.2 zulässig, und wo er nicht ableitbar ist, bleibt der alte Schlüssel stehen.

---

## §5 Der Katalog

### §5.1 Lesart und gemeinsame Bausteine

Jede Gruppe bringt ihre zod-Schemata, danach eine Tabelle mit vier Spalten:

* **Typ** — der Wert des Rahmenfelds `typ`.
* **Feldpfad** — das Feld, das `vorher`/`neu` beschreiben (§2.2). „—" heißt: setzt kein Feld (Anlagen, additive Einträge).
* **Klasse** — eine der vier aus §3.3.
* **Undo** — die Klasse aus §6, U2.

Regeln der Klasse **Regel** stehen unter der Tabelle im Fließtext, jede mit ihrer Begründung und ihrem Prüffall. Die Prüffälle sind mit `T<n>` durchnummeriert und in §11 vollständig geführt.

Die Schemata beschreiben ausschließlich `nutzlast`. Der Rahmen ist in KONZEPT-SPEICHER.md §2.4 festgelegt und wird nicht je Art wiederholt; `vorher` und `neu` stehen im Rahmen, nicht in der Nutzlast. **Kein Schema ist `strict`** — §3.6 Punkt 3.

```ts
// Gemeinsame Bausteine. Die Wertebereiche stammen aus ZDM §2; die
// Konstanten liegen bereits in packages/domaene/src/ereignis.ts.
const zId          = z.string().min(1).max(200)
const zZeitpunkt   = z.string().datetime({ offset: true })   // ISO-8601 mit Zonenversatz
const zDatum       = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const zAnzahl      = z.number().int().nonnegative()
const zText        = z.string()
const zPflichttext = z.string().min(1)

const zStaerke = z.object({
  fuehrer:      zAnzahl,
  unterfuehrer: zAnzahl,
  mannschaft:   zAnzahl,
})

const zOrganisation  = z.enum(ORGANISATIONEN)      // ZDM §2.1, 16 Schlüssel
const zStatus        = z.enum(EINHEIT_STATUS)      // ZDM §2.2, 9 Werte (Frage 19)
const zSchicht       = z.enum(SCHICHTEN)           // ZDM §2.3, 4 Werte
const zAbschnittstyp = z.enum(ABSCHNITTSTYPEN)     // ZDM §2.4
const zEbene         = z.enum(TAKTISCHE_EBENEN)    // ZDM §2.8
const zRolle         = z.enum(["FUEHRER", "UNTERFUEHRER", "MANNSCHAFT"])          // §2.5
const zGeschlecht    = z.enum(["MAENNLICH", "WEIBLICH", "DIVERS"])                // §2.6
const zErnaehrung    = z.enum(["FLEISCH", "VEGETARISCH", "VEGAN"])                // §2.7

const zKontakt = z.object({
  art:        z.enum(["MOBIL", "FESTNETZ", "EMAIL"]),
  dienstlich: z.boolean(),
  wert:       zPflichttext,
})

const zHierarchieEbene = z.object({
  art:     zPflichttext,          // VokabularWert: OV | RB | LV | Gemeinde | ...
  name:    zPflichttext,
  kurz:    zText.optional(),
  telefon: zText.optional(),
  email:   zText.optional(),
})
```

**Zur Id-Länge.** `zId` begrenzt auf 200 Zeichen. Das ist keine Schönheit: Eine Entitäts-Id ist Nutzlast aus einer fremden Datei und wird zum Schlüssel einer Datensammlung. `fold.ts` legt die Sammlungen deshalb ohne Prototyp an (`Object.create(null)`) — ohne das wäre eine Id namens `__proto__` kein Eintrag, sondern ein Aufruf des Prototyp-Setzers, und die Entität verschwände spurlos. Die Längenschranke kommt hinzu, damit eine erfundene Id nicht den Speicher jedes Clients füllt.

### §5.2 Einsatz

```ts
const EinsatzAngelegt = z.object({
  einsatzId:                zId,
  name:                     zPflichttext,
  art:                      z.enum(["EINSATZ", "UEBUNG", "VERANSTALTUNG"]),
  fuestName:                zPflichttext,
  uebergeordneteFuestName:  zText.optional(),
  ort:                      zText.optional(),
  beginn:                   zZeitpunkt,
  schichtmodell:            z.enum(["ZWEI_SCHICHT", "DREI_SCHICHT"]),
})

const EinsatzStammdatenGeaendert = z.object({
  feld: z.enum(["name", "art", "fuestName", "uebergeordneteFuestName", "ort", "schichtmodell"]),
})   // Werte in `vorher` / `neu`

const KostenParameterGeaendert = z.object({
  feld: z.enum(["psaKostenProSatz", "vdaProTag", "ukVerpflegungProTag", "geplanteEinsatztage"]),
})   // Werte in `vorher` / `neu`, je Zahl

const EinsatzBeendet          = z.object({ ende: zZeitpunkt })
const EinsatzWiedereroeffnet  = z.object({})
const EinsatzArchiviert       = z.object({ zeitpunkt: zZeitpunkt, snapshotHash: z.string().length(64) })
const ArchivierungZurueckgenommen = z.object({ archivierungEreignisId: zId })
```

| Typ | Feldpfad | Klasse | Undo |
|---|---|---|---|
| `EinsatzAngelegt` | — | Regel (§3.4) | nein |
| `EinsatzStammdatenGeaendert` | `einsatz/<feld>` | LWW/Feld | frei |
| `KostenParameterGeaendert` | `einsatz/kosten/<feld>` | LWW/Feld | frei |
| `EinsatzBeendet` | `einsatz/ende` | LWW/Entität | frei → `EinsatzWiedereroeffnet` |
| `EinsatzWiedereroeffnet` | `einsatz/ende` | LWW/Entität | — (ist selbst die Kompensation) |
| `EinsatzArchiviert` | — | Regel (§7) | nein |
| `ArchivierungZurueckgenommen` | — | Regel (§7) | nein |

**`EinsatzAngelegt` ist das erste Ereignis der Akte.** Es gilt §3.4: Bei zwei Anlagen gewinnt die kleinere HLC. Eine zweite Anlage ist im Normalbetrieb unmöglich — die Einsatz-Kennung entsteht beim Anlegen des Ordners (KONZEPT-SPEICHER.md §5.6) —, aber sie ist erzeugbar, wenn zwei Clients denselben Ordner gleichzeitig anlegen. **T1:** Zwei `EinsatzAngelegt` mit verschiedener HLC und verschiedenen Namen; der Zustand trägt den Namen der kleineren HLC und den Hinweis `zweiteAnlageVerworfen` mit dem verworfenen Namen.

**`EinsatzBeendet` ist LWW/Entität, nicht LWW/Feld.** Beendet und wiedereröffnet sind derselbe Wert (`ende` gesetzt oder abwesend), und `EinsatzWiedereroeffnet` setzt ihn auf abwesend. Zwei Clients, die gleichzeitig beenden und wiedereröffnen, erhalten das Ergebnis der höheren HLC. **T2:** `EinsatzBeendet` (HLC 5) und `EinsatzWiedereroeffnet` (HLC 7, `undoOf` auf das erste) in beliebiger Reihenfolge ⇒ `ende` ist abwesend; umgekehrte HLC ⇒ `ende` ist gesetzt.

**Beenden ist nicht Archivieren.** ZDM §3.2 führt `status: AKTIV | BEENDET | ARCHIVIERT` als **abgeleitetes** Merkmal: archiviert, wenn §7 es sagt; sonst beendet, wenn `ende` gesetzt ist; sonst aktiv. Es gibt kein Ereignis, das `status` direkt setzt — sonst gäbe es zwei Wahrheiten über denselben Sachverhalt.

### §5.3 Abschnitt

```ts
const AbschnittAngelegt = z.object({
  abschnittId:  zId,
  name:         zPflichttext,
  abschnittstyp: zAbschnittstyp,
  parentId:     zId.optional(),
  reihenfolge:  z.number().int(),
})

const AbschnittUmbenannt   = z.object({ abschnittId: zId })            // Werte im Rahmen
const AbschnittTypGeaendert = z.object({ abschnittId: zId })           // `grund` Pflicht (§2.3)
const AbschnittUmgehaengt  = z.object({ abschnittId: zId })            // vorher/neu = parentId
const AbschnittUmsortiert  = z.object({ abschnittId: zId })            // vorher/neu = reihenfolge
const AbschnittBemerkungGesetzt = z.object({ abschnittId: zId })

const AbschnittAufgeloest = z.object({
  abschnittId:     zId,
  zielAbschnittId: zId,          // wohin die verbliebenen Einheiten wandern
})
const AbschnittWiederhergestellt = z.object({ abschnittId: zId })
```

| Typ | Feldpfad | Klasse | Undo |
|---|---|---|---|
| `AbschnittAngelegt` | — | additiv, bei Kollision §3.4 | strukturell → `AbschnittAufgeloest` |
| `AbschnittUmbenannt` | `abschnitt/<id>/name` | LWW/Feld | frei |
| `AbschnittTypGeaendert` | `abschnitt/<id>/typ` | LWW/Feld | frei |
| `AbschnittUmgehaengt` | `abschnitt/<id>/parentId` | Regel | frei |
| `AbschnittUmsortiert` | `abschnitt/<id>/reihenfolge` | LWW/Feld | frei |
| `AbschnittBemerkungGesetzt` | `abschnitt/<id>/bemerkung` | LWW/Feld | frei |
| `AbschnittAufgeloest` | `abschnitt/<id>/aufgeloest` | Regel | strukturell → `AbschnittWiederhergestellt` |
| `AbschnittWiederhergestellt` | `abschnitt/<id>/aufgeloest` | Regel | — |

#### §5.3.1 Regel: die Zyklusprüfung bei `AbschnittUmgehaengt` (Auflage 10)

Ein Abschnitt darf nicht sein eigener Vorfahr werden. Zwei Clients können den Zyklus **gemeinsam** erzeugen, ohne dass einer von beiden ihn sieht: A hängt X unter Y, B hängt gleichzeitig Y unter X.

**Die Regel.** `parentId` wird zunächst nach LWW/Feld gefaltet — jeder Abschnitt bekommt seinen Gewinner. Danach prüft der Fold den entstandenen Wald auf Zyklen. Findet er einen, wird darin die Kante mit der **größten** HLC gelöst: Der Abschnitt, dessen `parentId` sie setzt, hängt an der Wurzel (`parentId` abwesend), und es entsteht der Hinweis `zyklusAufgeloest` mit dem verdrängten Elternwert.

**Warum nicht verwerfen.** Das Ereignis zu verwerfen wäre stilles Verwerfen nach §1.3 Satz 2 und nach KONZEPT-SPEICHER.md §2.5. Es wird gefaltet und wirkt — nur die eine Kante, die den Zyklus schließt, wird gelöst, und das sichtbar.

**Warum die größere HLC gelöst wird.** Sie ist die jüngere Handlung; die ältere Struktur bleibt stehen. Vor allem aber ist die Wahl **deterministisch**, weil die HLC nach §3.1 total geordnet ist: Jeder Client löst dieselbe Kante. Eine Auflösung „die zuletzt eingetroffene" wäre nicht konvergent.

**Warum an die Wurzel und nicht auf den alten Wert.** Der alte Wert (`vorher`) ist der Stand, den **ein** Client gesehen hat; ihn wiederherzustellen setzte einen Wert, den kein Ereignis mit dieser HLC gesetzt hat, und das Feld trüge eine HLC, die nicht zu seinem Wert passt. Die Wurzel ist der einzige Wert, der immer existiert und keinen Zyklus schließen kann. Ein an die Wurzel gehängter Abschnitt ist sichtbar falsch einsortiert und in einem Griff korrigierbar; ein stillschweigend zurückgesetzter wäre es nicht.

**T3:** X unter Y (HLC 5) und Y unter X (HLC 7), beide Permutationen ⇒ Y hängt an der Wurzel, X unter Y, ein `zyklusAufgeloest` für Y. **T4:** Dreierzyklus X→Y→Z→X; genau eine Kante wird gelöst, und zwar in jeder Permutation dieselbe. **T5:** Ein Abschnitt hängt unter sich selbst (`parentId` = eigene Id) ⇒ Wurzel, Hinweis.

#### §5.3.2 Regel: der aufgelöste Abschnitt

`AbschnittAufgeloest` trägt `zielAbschnittId` — wohin die verbliebenen Einheiten wandern. Drei Festlegungen:

1. **Der aufgelöste Abschnitt bleibt im Zustand,** mit dem Merkmal `aufgeloest` und der HLC seiner Auflösung. Er verschwindet nicht: Ereignisse, die auf ihn zeigen, müssen weiterhin auflösbar sein, und das Einsatztagebuch nennt ihn beim Namen.
2. **Einheiten in ihm stehen im Ziel.** Für jede Einheit, deren gefaltete `abschnittId` ein aufgelöster Abschnitt ist, ist der **wirksame** Abschnitt das `zielAbschnittId` der Auflösung. Das gilt auch für ein nebenläufiges `EinheitVerschoben` **in** diesen Abschnitt hinein, selbst wenn dessen HLC höher ist als die der Auflösung: Die Verschiebung wird gefaltet (die Einheit „kommt an"), die Wirkung ist der Weiterlauf ins Ziel, und es entsteht der Hinweis `abschnittAufgeloest`. Begründung von ZDM §4.2: Eine Einheit darf nie in einem nicht existierenden Abschnitt hängen.
3. **Ist das Ziel selbst aufgelöst,** wird der Kette gefolgt. Schließt die Kette einen Kreis oder endet sie in einem unbekannten Abschnitt, landet die Einheit im Auffang (§5.3.3). Ohne diesen Satz wäre die Regel eine, die ihren Grenzfall nicht kennt — §1.3 Satz 4.

`AbschnittWiederhergestellt` ist die Kompensation (U2, strukturell). Nach ihr ist der Abschnitt wieder gewöhnlich, und die Einheiten stehen wieder in ihm — es ist derselbe Fold über eine kleinere Ereignismenge, kein Rückabwickeln.

**T6:** Einheit in A, `AbschnittAufgeloest(A → B)` ⇒ wirksamer Abschnitt B. **T7:** `EinheitVerschoben(→ A)` mit HLC 9, `AbschnittAufgeloest(A → B)` mit HLC 5 ⇒ wirksamer Abschnitt B, `abschnittId` bleibt A, Hinweis `abschnittAufgeloest`. **T8:** A → B, B → C ⇒ wirksamer Abschnitt C. **T9:** A → B, B → A ⇒ Auffang, Hinweis.

#### §5.3.3 Regel: der Auffangabschnitt — und was er nicht ist (Auflage 10)

`@s1/domaene` führt seit M0.2 den systemseitigen Auffang unter der reservierten Id `AUFFANG`, Typ `EINSATZORT`, also **zählend**. Der Auftrag zu M1.2 stellt die Frage, ob „Abschnitt noch nicht gesehen" und „Abschnitt aufgelöst" dieselbe Regel bekommen.

**Entschieden: nein, zwei Regeln.**

* **Abschnitt unbekannt** — das `AbschnittAngelegt` ist noch unterwegs oder liegt in einer Datei, die dieser Leser (noch) nicht hat. Der Zustand ist **vorläufig**: Sobald das Ereignis eintrifft, steht die Einheit ohne weiteres Zutun im richtigen Abschnitt (Rebase). Die Einheit liegt bis dahin im Auffang, mit Hinweis `abschnittUnbekannt`.
* **Abschnitt aufgelöst** — die Auflösung ist eine Handlung mit einem **benannten Ziel**. Die Einheit dorthin zu bringen ist die Absicht des Bedieners; sie stattdessen in den Auffang zu legen wäre eine Verschlechterung, und zwar eine dauerhafte: An diesem Zustand ändert kein später eintreffendes Ereignis mehr etwas.

Beide Regeln teilen nur die Zusicherung, die dahintersteht: **Die Stärke einer real gemeldeten Einheit verschwindet nie aus der Gesamtstärke, weil ein Abschnitt fehlt.** Deshalb ist der Auffang zählend, und deshalb ist seine Id reserviert — eine Anlage, die sie belegen wollte, wird verworfen (`reservierteIdVerworfen`), weil sie dem Auffang sonst einen nicht zählenden Typ geben könnte.

**T10:** `EinheitGemeldet` in Abschnitt Q, ohne `AbschnittAngelegt(Q)` ⇒ Auffang, Hinweis `abschnittUnbekannt`. **T11:** Dieselbe Menge plus `AbschnittAngelegt(Q)` ⇒ Einheit in Q, kein Hinweis, und zwar in jeder Permutation. **T12:** `AbschnittAngelegt` mit `abschnittId = "AUFFANG"` ⇒ verworfen, Hinweis `reservierteIdVerworfen`, Auffang unverändert `EINSATZORT`.

#### §5.3.4 Der Abschnitt `ARCHIV` und die Invarianten aus ZDM §3.2

ZDM §3.2 nennt vier Invarianten des Abschnittsbaums. Der Fold behandelt sie so:

| Invariante | Behandlung |
|---|---|
| (a) genau ein `ARCHIV` je Einsatz, systemseitig, nicht löschbar | wie der Auffang: reservierte Id `ARCHIV`, vom Fold erzeugt, Anlage darauf wird verworfen |
| (b) höchstens ein `FUEHRUNGSSTELLE` ohne `parentId` | **nicht erzwungen.** Zwei Clients können nebenläufig je eine anlegen; ein Verwerfen wäre stilles Verwerfen. Der Fold erzeugt keinen Hinweis — die Lage ist im Baum sichtbar, und die Excel-Vorlage kennt „Sonstiges Führung" neben der FüSt |
| (c) `parentId` bildet keinen Zyklus | §5.3.1 |
| (d) ein aufgelöster Abschnitt enthält keine Einheiten | §5.3.2, über den wirksamen Abschnitt |

Invariante (b) ist damit ausdrücklich eine **Anzeigefrage**, keine Foldregel. Das gehört hierher, weil ZDM sie in einer Reihe mit (c) nennt und ein Leser sonst annähme, der Fold erzwinge sie.

### §5.4 Einheit

```ts
const EinheitGemeldet = z.object({
  einheitId:         zId,
  abschnittId:       zId,
  bezeichnung:       zPflichttext,
  organisation:      zOrganisation,
  organisationName:  zText.optional(),
  hierarchie:        z.array(zHierarchieEbene),      // unterste zuerst
  standortRef:       z.number().int().optional(),
  fuestKennung:      zText.optional(),
  ebene:             zEbene,
  staerke:           zStaerke,
  personalErfassung: z.enum(["VOLLSTAENDIG", "NUR_STAERKE"]),
  status:            zStatus,
  schicht:           zSchicht.optional(),
  reihenfolge:       z.number().int(),
  istFuehrungDesAbschnitts: z.boolean().default(false),
  teilEtikett:       zText.optional(),
  abgeteiltVonId:    zId.optional(),
  vorlageId:         zId.optional(),
  meldungId:         zId.optional(),
  einheitSchluessel: zText.optional(),               // Dublettenerkennung, §5.4.4
})

const EinheitStammdatenGeaendert = z.object({
  einheitId: zId,
  feld: z.enum([
    "bezeichnung", "organisation", "organisationName", "hierarchie", "ebene",
    "fuestKennung", "bemerkung", "teilEtikett", "fuehrungskraft",
    "erreichbarkeitOverride", "taktischesZeichen", "istFuehrungDesAbschnitts",
    "standortRef", "psaSaetzeProTag",
  ]),
})

const StaerkeGeaendert = z.object({ einheitId: zId, meldezeit: zZeitpunkt.optional() })
const StatusGesetzt    = z.object({ einheitId: zId })
const SchichtGesetzt   = z.object({ einheitId: zId })
const ZeitpunktGesetzt = z.object({
  einheitId: zId,
  feld: z.enum(["eingetroffenAm", "verfuegbarBis", "einsatzendeAm", "rueckfuehrungAm"]),
})
const EinheitVerschoben  = z.object({ einheitId: zId, kommentar: zText.optional() })
const EinheitUmsortiert  = z.object({ einheitId: zId, abschnittId: zId })
const LogistikGesetzt    = z.object({
  einheitId: zId,
  feld: z.enum(["weiblich", "divers", "vegetarisch", "vegan",
                "uebernachtungM", "uebernachtungW", "uebernachtungD"]),
})   // `neu = null` hebt den Override auf
const SofortbedarfGesetzt = z.object({ einheitId: zId })   // Block in vorher/neu
const PsaBedarfGesetzt    = z.object({ einheitId: zId })

const EinheitAufgeteilt = z.object({
  quellEinheitId:        zId,
  neueEinheitId:         zId,
  teilEtikett:           zPflichttext,
  abgeteilteStaerke:     zStaerke,
  abschnittId:           zId,
  uebernommeneFahrzeugIds: z.array(zId),
  uebernommenePersonIds:   z.array(zId),
})

const EinheitZusammengefuehrt = z.object({
  zielEinheitId:      zId,
  quellEinheitIds:    z.array(zId).min(1),
  uebernommeneStaerke: zStaerke,
})

const EinheitArchiviert       = z.object({ einheitId: zId, einsatzendeAm: zZeitpunkt.optional() })
const EinheitEntfernt         = z.object({ einheitId: zId })   // `grund` Pflicht (§2.3)
const EinheitWiederhergestellt = z.object({ einheitId: zId })
```

| Typ | Feldpfad | Klasse | Undo |
|---|---|---|---|
| `EinheitGemeldet` | — | additiv, bei Kollision §3.4 | frei → `EinheitEntfernt` |
| `EinheitStammdatenGeaendert` | `einheit/<id>/<feld>` | LWW/Feld; `hierarchie` und `fuehrungskraft` LWW/Entität | frei |
| `StaerkeGeaendert` | `einheit/<id>/staerke` | LWW/Entität über das Tripel | frei |
| `StatusGesetzt` | `einheit/<id>/status` | LWW/Feld | frei |
| `SchichtGesetzt` | `einheit/<id>/schicht` | LWW/Feld | frei |
| `ZeitpunktGesetzt` | `einheit/<id>/<feld>` | LWW/Feld | frei |
| `EinheitVerschoben` | `einheit/<id>/abschnittId` | Regel (§5.3.2) | frei |
| `EinheitUmsortiert` | `einheit/<id>/reihenfolge` | LWW/Feld | frei |
| `LogistikGesetzt` | `einheit/<id>/logistik/<feld>` | LWW/Feld | frei |
| `SofortbedarfGesetzt` | `einheit/<id>/sofortbedarf` | LWW/Entität | frei |
| `PsaBedarfGesetzt` | `einheit/<id>/psaSaetzeProTag` | LWW/Feld | frei |
| `EinheitAufgeteilt` | — | Regel (§5.4.2) | strukturell → `EinheitZusammengefuehrt` |
| `EinheitZusammengefuehrt` | — | Regel (§5.4.3) | strukturell → `EinheitAufgeteilt` |
| `EinheitArchiviert` | `einheit/<id>/abschnittId` | Regel (§5.3.2), Ziel ist `ARCHIV` | frei |
| `EinheitEntfernt` | `einheit/<id>/entfernt` | Regel (§5.4.5) | frei → `EinheitWiederhergestellt` |
| `EinheitWiederhergestellt` | `einheit/<id>/entfernt` | Regel (§5.4.5) | — |

#### §5.4.1 Regel: die Stärke ist ein Tripel, keine drei Felder

LWW über das ganze Tripel, nicht je Rolle. Begründung von ZDM §4.2: Die drei Zahlen sind eine Meldung („0/3/17"), keine unabhängigen Felder; ein Merge aus zwei Meldungen (Führer von A, Mannschaft von B) ergäbe eine Stärke, die nie jemand gemeldet hat. Passt `vorher` nicht zum gefalteten Zustand, entsteht `vorherPasstNicht` **mit beiden Werten** — die Oberfläche muss daraus einen Satz bauen können.

**T13:** Zwei `StaerkeGeaendert` mit verschiedener HLC, die verschiedene Rollen ändern ⇒ der Zustand trägt genau eines der beiden Tripel, nie eine Mischung, und einen Hinweis `vorherPasstNicht`.

#### §5.4.2 Regel: Aufteilen wirkt relativ, nicht absolut (Auflage 10)

`EinheitAufgeteilt` **setzt** die Quellstärke nicht, es **verringert** sie um `abgeteilteStaerke`. v1 setzt hier absolut (`einheit.ts`) und wäre nebenläufig falsch: Zwei gleichzeitige Aufteilungen derselben Einheit erzeugten beide Teile, die Quelle sänke aber nur einmal.

Damit eine relative Änderung in einer Mengenfunktion tragfähig ist, braucht sie eine ausgeschriebene Zusammensetzungsregel. Sie lautet:

> **Wirksame Stärke einer Einheit** = Wert der gewinnenden **absoluten** Beobachtung (aus `EinheitGemeldet`, `StaerkeGeaendert` oder einer EEB-Übernahme) **plus der Summe aller Deltas**, deren HLC **größer** ist als die HLC dieser Beobachtung.

Deltas sind: `−abgeteilteStaerke` an der Quelle einer Aufteilung, `+uebernommeneStaerke` am Ziel einer Zusammenführung. Die Summe läuft über eine **Menge** — sie ist kommutativ, assoziativ und (weil jedes Ereignis nach §3.2 höchstens einmal gefaltet wird) idempotent. Damit gilt P1 und P2 auch hier.

**Warum nur die jüngeren Deltas.** Eine absolute Meldung ist die Aussage „so ist der Stand jetzt". Wer nach einer Aufteilung 0/2/15 meldet, hat die Aufteilung bereits berücksichtigt; sie ein zweites Mal abzuziehen wäre doppelte Buchung. Ein Delta, das **nach** der Meldung liegt, ist dagegen noch nicht enthalten.

**Klemmen bei null.** Wird die wirksame Stärke in einer Rolle negativ, gilt 0, und es entsteht `staerkeGeklemmt` mit dem rechnerischen Wert. Ohne den Hinweis wäre die Klemmung ein stilles Verwerfen; ohne die Klemmung stünde eine negative Stärke in der Gesamtstärke der Lage.

**T14:** Zwei nebenläufige `EinheitAufgeteilt` derselben Quelle (je 0/1/3 abgeteilt) auf eine Quelle von 1/4/12 ⇒ Quelle 1/2/6, zwei neue Einheiten, Gesamtstärke unverändert (P4), in jeder Permutation. **T15:** `StaerkeGeaendert` (HLC 9) nach `EinheitAufgeteilt` (HLC 5) ⇒ das Delta wirkt **nicht** mehr; die gemeldete Zahl steht. **T16:** `EinheitAufgeteilt` (HLC 9) nach `StaerkeGeaendert` (HLC 5) ⇒ das Delta wirkt. **T17:** Abgeteilte Stärke größer als die Quelle ⇒ 0/0/0 und `staerkeGeklemmt`.

#### §5.4.3 Regel: Zusammenführen, und wann P4 hält

`EinheitZusammengefuehrt` addiert `uebernommeneStaerke` als Delta am Ziel (§5.4.2) und markiert jede Quelle als **aufgegangen** (`aufgegangenInId = zielEinheitId`). Eine aufgegangene Einheit bleibt im Zustand, zählt aber in **keiner** Summe mit — ihre Zahlen stecken im Ziel.

Drei Grenzfälle:

* **Doppelte Zusammenführung derselben Quelle** ist ein No-op: Ist die Quelle bereits aufgegangen, wirkt das zweite Delta nicht. Sonst würden die Zahlen zweimal gutgeschrieben. Maßgeblich ist die Zusammenführung mit der **kleinsten** HLC; jede weitere erzeugt `zusammenfuehrungSummeWeichtAb`.
* **Nebenläufiges Verschieben einer Quelle** verliert: Die Einheit existiert als eigenständige nicht mehr. Das Verschieben wird gefaltet (ihre `abschnittId` ändert sich), wirkt aber auf keine Summe, weil die Einheit aufgegangen ist.
* **P4 (Summenerhaltung) hält genau dann,** wenn `uebernommeneStaerke` gleich der Summe der wirksamen Stärken aller Quellen zum Zeitpunkt der Zusammenführung ist. Weicht sie ab — etwa weil eine Quelle nebenläufig eine neue Stärke gemeldet hat —, ändert sich die Gesamtstärke, und der Fold erzeugt `zusammenfuehrungSummeWeichtAb` mit beiden Zahlen. **Das ist kein Fehler des Folds, sondern zwei widersprüchliche Meldungen**, und es ist genau die Lage, in der die Führungsstelle nachfragen muss.

Diese Bedingung gehört ausdrücklich in die Zusicherung: P4 ist in §8.1 als **bedingte** Zusage geführt. Eine unbedingte wäre nicht haltbar, und eine Property, die man nur mit widerspruchsfreien Eingaben erfüllt, muss ihre Bedingung nennen — sonst prüft der Test etwas anderes als das Dokument verspricht.

**T18:** Zwei Quellen 0/1/3 und 0/2/6, `uebernommeneStaerke` 0/3/9 ⇒ Ziel plus 0/3/9, Quellen aufgegangen, Gesamtstärke unverändert. **T19:** Dieselbe Menge, aber eine Quelle meldet nebenläufig 0/1/5 ⇒ Hinweis `zusammenfuehrungSummeWeichtAb`. **T20:** Dieselbe Zusammenführung zweimal (verschiedene Ereignis-Ids) ⇒ Ziel bekommt das Delta einmal.

#### §5.4.4 Die mögliche Dublette

Zwei Clients melden dieselbe reale Einheit — beim Meldekopf und in der Führungsstelle. Das ist **kein technischer Konflikt**: Zwei verschiedene Ids, zwei Anlagen, beide gültig. Erkennung über `einheitSchluessel` (aus dem EEB, Heuristik). Führen zwei nicht aufgegangene Einheiten denselben Schlüssel, entsteht `moeglicheDublette` mit beiden Ids.

**Aufgelöst wird nur von Hand,** durch `EinheitZusammengefuehrt`. Automatisch zu verschmelzen wäre falsch: Zwei Trupps derselben Fachgruppe können denselben Schlüssel tragen, und eine automatische Verschmelzung nähme eine Meldung aus der Lage, die jemand abgegeben hat. Der Schlüssel ist nach `einsaetze.ts` ausdrücklich „von der App vorgeschlagen, vom Menschen bestätigt".

**T21:** Zwei `EinheitGemeldet` mit demselben `einheitSchluessel` ⇒ beide Einheiten im Zustand, beide zählen, ein Hinweis `moeglicheDublette`. **T22:** Nach `EinheitZusammengefuehrt` verschwindet der Hinweis, weil eine der beiden aufgegangen ist.

#### §5.4.5 Regel: Entfernen ist kein Löschen

`EinheitEntfernt` löscht nichts. Die Einheit wird als entfernt markiert, zählt in keiner Summe mehr, bleibt aber im Einsatztagebuch und in der Historie (EXH N-6, F-E2). `grund` ist Pflicht (§2.3).

Das Merkmal `entfernt` ist ein gewöhnliches LWW/Feld über die beiden Ereignisse `EinheitEntfernt` und `EinheitWiederhergestellt` — sonst wäre die Wiederherstellung nicht möglich. Der Satz aus ZDM §4.2, das Entfernen „gewinne gegen alle nebenläufigen Feldänderungen", bedeutet **nicht**, dass es andere Felder verdrängt: Sie werden weiter gefaltet, damit eine Wiederherstellung den neuesten Stand zeigt. Er bedeutet, dass die Einheit **unabhängig von jedem anderen Feld** nirgends mitzählt, solange `entfernt` gilt. Das ist die einzige Lesart, unter der Entfernen und Wiederherstellen zusammenpassen; die andere wäre eine Regel, die ihren Grenzfall nicht kennt.

Dasselbe gilt für `FahrzeugEntfernt` und `PersonEntfernt`.

**T23:** `EinheitEntfernt` (HLC 5), `StaerkeGeaendert` (HLC 7) ⇒ Einheit entfernt, Stärke im Zustand aktualisiert, zählt nicht. **T24:** Dazu `EinheitWiederhergestellt` (HLC 9) ⇒ Einheit zählt wieder, mit der Stärke aus HLC 7.

### §5.5 Fahrzeug und Person

```ts
const FahrzeugAngelegt = z.object({
  fahrzeugId:  zId,
  einheitId:   zId.optional(),
  abschnittId: zId.optional(),
  typ:         zPflichttext,               // VokabularWert
  bezeichnung: zText.optional(),
  kennzeichen: zText.optional(),
  funkrufname: z.object({
    kennwort: zPflichttext, eigenerStandort: z.boolean(),
    ort: zText.optional(), teile: z.array(z.number().int()),
  }).optional(),
  stanKonform: z.boolean().optional(),     // dreiwertig: abwesend = nicht anwendbar
  aenderungen: zText.optional(),
  nutzlast:    zText.optional(),
  status:      z.enum(["EINSATZBEREIT", "NICHT_EINSATZBEREIT"]),
})
const FahrzeugGeaendert        = z.object({ fahrzeugId: zId, feld: z.enum([
  "typ","bezeichnung","kennzeichen","funkrufname","stanKonform","aenderungen","nutzlast","status","taktischesZeichen"]) })
const FahrzeugVerschoben       = z.object({ fahrzeugId: zId })   // vorher/neu = abschnittId
const FahrzeugEinheitGewechselt = z.object({ fahrzeugId: zId })  // vorher/neu = einheitId
const FahrzeugEntfernt         = z.object({ fahrzeugId: zId })   // `grund` Pflicht

const PersonHinzugefuegt = z.object({
  personId:  zId,
  einheitId: zId,
  nachname:  zPflichttext,
  vorname:   zPflichttext,
  rolle:     zRolle,
  funktionen:            z.array(zPflichttext),
  fahrerlaubnisse:       z.array(zPflichttext),
  geschlecht:            zGeschlecht,
  ernaehrung:            zErnaehrung,
  kontakte:              z.array(zKontakt),
  zusatzqualifikationen: z.array(zPflichttext),
  bemerkung: zText.optional(),
})
const PersonGeaendert = z.object({ personId: zId, feld: z.enum([
  "nachname","vorname","rolle","funktionen","fahrerlaubnisse","geschlecht",
  "ernaehrung","kontakte","zusatzqualifikationen","bemerkung","einheitId"]) })
const PersonEntfernt  = z.object({ personId: zId })   // `grund` Pflicht
```

| Typ | Feldpfad | Klasse | Undo |
|---|---|---|---|
| `FahrzeugAngelegt` | — | additiv, bei Kollision §3.4 | frei → `FahrzeugEntfernt` |
| `FahrzeugGeaendert` | `fahrzeug/<id>/<feld>` | LWW/Feld; `funkrufname` LWW/Entität | frei |
| `FahrzeugVerschoben` | `fahrzeug/<id>/abschnittId` | Regel (§5.3.2) | frei |
| `FahrzeugEinheitGewechselt` | `fahrzeug/<id>/einheitId` | LWW/Feld | frei |
| `FahrzeugEntfernt` | `fahrzeug/<id>/entfernt` | Regel (§5.4.5) | frei |
| `PersonHinzugefuegt` | — | additiv, bei Kollision §3.4 | frei → `PersonEntfernt` |
| `PersonGeaendert` | `person/<id>/<feld>` | LWW/Feld; die vier Listenfelder LWW/Entität | frei |
| `PersonEntfernt` | `person/<id>/entfernt` | Regel (§5.4.5) | frei |

**Listen sind ein Wert.** `funktionen`, `fahrerlaubnisse`, `kontakte` und `zusatzqualifikationen` werden als Ganzes ersetzt, nie elementweise gemischt. Ein Merge über Listen zweier Clients wäre nicht deterministisch begründbar (in welcher Reihenfolge? mit welcher Dublettenerkennung?), und ZDM §4.2 trifft für `hierarchie` und `fuehrungskraft` bereits dieselbe Entscheidung. **T25:** Zwei `PersonGeaendert` auf `kontakte` mit verschiedenen Listen ⇒ genau eine Liste im Zustand, keine Vereinigung.

**Die Stärke folgt nicht aus den Personen.** `staerke` ist ein eigenes gemeldetes Tripel; `personalErfassung` sagt, ob Einzelpersonen erfasst sind. Der Fold rechnet die Personen **nicht** in die Stärke um — das wäre eine Kennzahl (M1.3, ZDM §3.3 K4) und würde eine Meldung durch eine Rechnung ersetzen. Ein `PersonHinzugefuegt` ändert die Stärke nicht.

### §5.6 Auftrag und Anforderung

```ts
const AuftragErfasst = z.object({
  auftragId:   zId,
  einheitId:   zId,
  von:         zZeitpunkt,
  bis:         zZeitpunkt.optional(),
  abschnittId: zId.optional(),
  text:        zPflichttext,
  quelle:      z.enum(["MANUELL", "BEWEGUNG", "EEB"]),
})
const AuftragBeendet         = z.object({ auftragId: zId })   // vorher/neu = bis
const AuftragZurueckgenommen = z.object({ auftragId: zId })

const AnforderungAngelegt = z.object({
  anforderungId:          zId,
  kennung:                zText.optional(),   // Format extern abgestimmt, Frage 22
  abzuloesendeEinheitId:  zId.optional(),
  vorgeseheneEinheitText: zText.optional(),
  vorgesehenerAuftrag:    zText.optional(),
  angefordertAm:          zZeitpunkt,
  bemerkung:              zText.optional(),
})
const AbloesungZugesagt = z.object({
  anforderungId:      zId,
  zugesagtFuer:       zZeitpunkt,
  zugesagtVon:        zPflichttext,
  abloesendeEinheitId: zId.optional(),
})
const AnforderungErledigt  = z.object({
  anforderungId: zId, abloesendeEinheitId: zId, erledigtAm: zZeitpunkt,
})
const AnforderungStorniert = z.object({ anforderungId: zId })   // `grund` Pflicht
const AnforderungGeaendert = z.object({ anforderungId: zId, feld: z.enum([
  "kennung","abzuloesendeEinheitId","vorgeseheneEinheitText","vorgesehenerAuftrag","bemerkung"]) })
```

| Typ | Feldpfad | Klasse | Undo |
|---|---|---|---|
| `AuftragErfasst` | — | additiv | frei → `AuftragZurueckgenommen` |
| `AuftragBeendet` | `auftrag/<id>/bis` | LWW/Feld | frei |
| `AuftragZurueckgenommen` | `auftrag/<id>/zurueckgenommen` | LWW/Feld | — |
| `AnforderungAngelegt` | — | additiv, bei Kollision §3.4 | frei → `AnforderungStorniert` |
| `AnforderungGeaendert` | `anforderung/<id>/<feld>` | LWW/Feld | frei |
| `AbloesungZugesagt` | `anforderung/<id>/zusage` | Regel (§5.6.2) | frei |
| `AnforderungErledigt` | `anforderung/<id>/zustand` | Regel (§5.6.2) | frei |
| `AnforderungStorniert` | `anforderung/<id>/zustand` | Regel (§5.6.2) | frei |

#### §5.6.1 Regel: die Kennung ist ein Etikett, keine Identität (Frage 22)

`kennung` ist optionaler Freitext **ohne Formatprüfung**. Das Format ist mit der übergeordneten Stelle abgestimmt (EXH F-F1) und der Führungsstelle nicht abgerungen; eine erfundene Prüfung wäre ein Platzhalter, der später wie eine Festlegung aussieht (Startwert §10, S2).

Entscheidend für den Fold ist etwas anderes: **Die Kennung wird nie zur Identität.** Zwei Anforderungen mit derselben Kennung bleiben zwei Anforderungen. Nach EXH F-F3 tragen die abzulösende und die ablösende Zeile dieselbe Kennung **absichtlich** — ein Verschmelzen über die Kennung wäre also fachlich falsch, nicht nur technisch riskant. Andererseits wäre stilles Nebeneinander eine unbemerkte Doppelanforderung. Deshalb: Führen zwei nicht stornierte Anforderungen dieselbe nicht leere Kennung, entsteht `moeglicheDublette` mit beiden Ids — dieselbe Behandlung wie bei der Einheit (§5.4.4), aus demselben Grund.

**T26:** Zwei `AnforderungAngelegt` mit derselben Kennung ⇒ zwei Anforderungen, ein Hinweis. **T27:** Eine davon storniert ⇒ kein Hinweis mehr.

#### §5.6.2 Regel: die Zustandsmaschine der Anforderung (Prüfkriterium P6)

`anforderung.zustand` ist **kein LWW-Feld**. Er wird aus der Ereignismenge berechnet:

```
  storniert  = es gibt ein AnforderungStorniert
  erledigt   = es gibt ein AnforderungErledigt
  zugesagt   = es gibt ein AbloesungZugesagt

  zustand = erledigt  ? EINGETROFFEN
          : storniert ? STORNIERT
          : zugesagt  ? ZUGESAGT
          : OFFEN
```

Vier Festlegungen, die daraus folgen:

1. **`EINGETROFFEN` ist terminal und gewinnt gegen alles** — auch gegen ein Storno mit höherer HLC. Was eingetroffen ist, ist eingetroffen; eine Stornierung danach beschreibt keinen realen Vorgang. Der Storno wird trotzdem gefaltet (er steht im Tagebuch) und erzeugt einen Hinweis.
2. **Eine spätere `AbloesungZugesagt` ändert den Zustand nicht mehr,** wenn bereits `EINGETROFFEN` oder `STORNIERT` gilt. Ihre **Felder** (`zugesagtFuer`, `zugesagtVon`, `abloesendeEinheitId`) werden trotzdem nach LWW/Feld gefaltet — die Zusage ist eine Tatsache, auch wenn sie am Zustand nichts mehr ändert. Genau das sagt ZDM §4.2: „die Zusage wird gefaltet, `zustand` bleibt jedoch `EINGETROFFEN`."
3. **Die Berechnung hängt an der Ereignis*menge*, nicht an der HLC-Reihenfolge.** Damit ist P6 (der Zustand geht nie von `EINGETROFFEN` zurück) nicht nur eine Aussage über zeitliche Abfolgen, sondern über den Fold selbst: In **jeder** Permutation und **jedem** Präfix der Menge, das das `AnforderungErledigt` enthält, ist der Zustand `EINGETROFFEN`. Das ist die Prüfform von P6.
4. **Rückgängig gemacht wird über `undoOf`, nicht über einen Rückschritt.** Ein Undo von `AnforderungErledigt` ist ein Kompensationsereignis, das das Erledigt-Ereignis aus der wirksamen Menge nimmt (§6, U1); der Zustand fällt dann auf `ZUGESAGT` zurück. Das ist kein Verstoß gegen P6: P6 spricht über den Fold einer festen Menge, nicht über die Wirkung einer bewussten Rücknahme. §6 nennt diese Unterscheidung ausdrücklich, damit sie im Test nicht verwechselt wird.

**T28:** `AnforderungErledigt` (HLC 5) und `AnforderungStorniert` (HLC 9), beide Permutationen ⇒ `EINGETROFFEN`. **T29:** `AbloesungZugesagt` (HLC 9) nach `AnforderungErledigt` (HLC 5) ⇒ Zustand `EINGETROFFEN`, `zugesagtVon` aber gesetzt. **T30 (P6):** Für jede Permutation und jedes Präfix einer Menge, die `AnforderungErledigt` enthält, gilt `zustand = EINGETROFFEN`. **T31:** Undo des `AnforderungErledigt` ⇒ `ZUGESAGT`.

#### §5.6.3 Der automatische Auftrag beim Verschieben

`EinheitVerschoben` erzeugt nach ZDM §4.2 „automatisch einen `Auftrag` mit `quelle = BEWEGUNG` und einen ETB-Eintrag". **Das ist kein zweites Ereignis, sondern eine Projektion.** Der Fold leitet den Bewegungsauftrag aus dem Verschiebeereignis ab; er wird nicht geschrieben.

Begründung: Ein zweites Ereignis müsste derselbe Client mit eigener Id schreiben. Ginge es verloren oder käme es doppelt, gäbe es zwei Wahrheiten über dieselbe Bewegung — und §1.3 Satz 3 verlangt, dass jeder Zustand allein aus den Ereignissen folgt. Als Projektion kann er das nicht.

**T32:** Eine Menge mit einem `EinheitVerschoben` ⇒ genau ein Bewegungsauftrag, auch wenn dieselbe Menge zweimal gefaltet wird.

### §5.7 Führungsstelle: Dienstposten und Schichtplan

```ts
const DienstpostenAngelegt = z.object({
  dienstpostenId: zId,
  teileinheit:    zPflichttext,     // "Stab" | "ZTr FK" | ... (frei, ZDM §1.14)
  funktion:       zPflichttext,     // "Ltr FüSt", "SGL 3", "LdF" (frei, Frage 20)
  schicht:        zSchicht,
  reihenfolge:    z.number().int(),
})
const DienstpostenGeaendert = z.object({
  dienstpostenId: zId,
  feld: z.enum(["teileinheit", "funktion", "schicht", "reihenfolge"]),
})
const DienstpostenBesetzt = z.object({ dienstpostenId: zId })   // Tripel in vorher/neu
const DienstpostenEntfernt = z.object({ dienstpostenId: zId })
const SchichtplanEintragGesetzt = z.object({ dienstpostenId: zId, datum: zDatum })
```

| Typ | Feldpfad | Klasse | Undo |
|---|---|---|---|
| `DienstpostenAngelegt` | — | additiv, bei Kollision §3.4 | frei → `DienstpostenEntfernt` |
| `DienstpostenGeaendert` | `dienstposten/<id>/<feld>` | LWW/Feld | frei |
| `DienstpostenBesetzt` | `dienstposten/<id>/besetzung` | LWW/Entität über das Tripel | frei |
| `DienstpostenEntfernt` | `dienstposten/<id>/entfernt` | Regel (§5.4.5) | frei |
| `SchichtplanEintragGesetzt` | `schichtplan/<dienstpostenId>/<datum>` | LWW/Feld | frei |

**Der Schlüssel des Schichtplans ist das Paar (`dienstpostenId`, `datum`),** nicht eine eigene Entitäts-Id. Zwei Clients, die denselben Tag desselben Dienstpostens beschreiben, meinen dieselbe Zelle des FüSt-Blatts; mit zwei Ids hätten sie zwei Einträge für eine Zelle, und die Ausgabe müsste raten. `text` ist mehrzeiliger Freitext und bleibt es (ZDM §1.14, Frage 6 an die FüSt) — er ist ein Wert, nicht eine Struktur.

**`schicht` ist am Dienstposten Pflicht,** an der Einheit dagegen nach ZDM §2.3 Nr. 4 optional außer im Abschnittstyp `ANGEFORDERT`. Diese Ausnahme ist **keine Foldregel**: Der Fold nimmt jede Schicht und jede fehlende Schicht an. Sie ist eine Anzeige- und Warnregel der Maske, und sie steht hier nur, damit sie nicht im Code als Ablehnung auftaucht (Frage 21, §10 S3).

**T33:** Zwei `SchichtplanEintragGesetzt` auf denselben Dienstposten und dasselbe Datum ⇒ ein Eintrag, LWW. **T34:** Dieselben auf verschiedene Daten ⇒ zwei Einträge, kein Konflikt.

### §5.8 EEB-Meldungen und Anhänge

```ts
const EebMeldungEmpfangen = z.object({
  meldungId:        zId,             // = bogenInhaltsId(bogen); Idempotenzschlüssel (§3.2)
  einheitSchluessel: zPflichttext,
  stand:            zZeitpunkt,
  empfangenAm:      zZeitpunkt,
  quelle:           z.enum(["SCAN", "MANUELL", "PDF_IMPORT", "AUFTEILUNG", "ZUSAMMENFUEHRUNG"]),
  signatur: z.object({
    zustand: z.enum(["GUELTIG", "UNGUELTIG"]),
    pubkey: zText.optional(), kurzform: zText.optional(),
    absender: z.object({ name: zText.optional(), email: zText.optional(), telefon: zText.optional() }).optional(),
  }).optional(),
  rohPayload: zText.optional(),      // Base64url; Frage 14 des ZDM
  bogen:      z.unknown(),           // vollständige EEB-Struktur, unverändert (§5.8.1)
})
const EebMeldungZugeordnet = z.object({ meldungId: zId })     // vorher/neu = einheitSchluessel
const EebMeldungUebernommen = z.object({
  meldungId: zId, einheitId: zId, uebernommeneFelder: z.array(zPflichttext),
})
const EebMeldungUebernahmeZurueckgenommen = z.object({ meldungId: zId })
const EebMeldungAbgelehnt   = z.object({ meldungId: zId })    // `grund` Pflicht
const EebMeldeStatusGesetzt = z.object({ meldungId: zId })    // vorher/neu ∈ §2.9

const AnhangHinzugefuegt = z.object({
  anhangId:  z.string().length(64),  // sha256; Idempotenzschlüssel (§3.2)
  einheitId: zId.optional(),
  dateiname: zPflichttext,
  mimeTyp:   zPflichttext,
  groesse:   zAnzahl,
})
const AnhangEntfernt = z.object({ anhangId: z.string().length(64) })
```

| Typ | Feldpfad | Klasse | Undo |
|---|---|---|---|
| `EebMeldungEmpfangen` | — | Regel: idempotent über `meldungId` | **nein** |
| `EebMeldungZugeordnet` | `meldung/<id>/einheitSchluessel` | LWW/Feld | frei |
| `EebMeldungUebernommen` | `meldung/<id>/uebernahmeZustand` | Regel (§5.8.2) | frei → `…ZurueckgenommenN` |
| `EebMeldungAbgelehnt` | `meldung/<id>/uebernahmeZustand` | LWW/Feld | frei |
| `EebMeldeStatusGesetzt` | `meldung/<id>/meldeStatus` | LWW/Feld | frei |
| `AnhangHinzugefuegt` | — | Regel: idempotent über `anhangId` | frei → `AnhangEntfernt` |
| `AnhangEntfernt` | `anhang/<id>/entfernt` | LWW/Feld | frei |

#### §5.8.1 Regel: der Empfang ist eine Tatsache

`EebMeldungEmpfangen` ist **nicht rücknehmbar** (U2, Klasse „nicht rückgängig") und über `meldungId` idempotent. Zwei Arbeitsplätze, die denselben QR-Code scannen, erzeugen eine Meldung (§3.2). Die Meldung selbst ist unveränderlich: Eine Korrektur ist eine **neue** Meldung mit eigener `meldungId` (Revision), Löschen ist verboten (EXH F-E2). Wer eine Meldung nicht will, lehnt sie ab (`EebMeldungAbgelehnt`) — sie bleibt sichtbar.

`bogen` steht im Schema als `z.unknown()`. Das ist Absicht und keine Lücke: Die Struktur des Erfassungsbogens gehört `@bos/kern` und wird dort versioniert (Schemaversionen des EEB, M1.1). Sie hier ein zweites Mal zu beschreiben hieße, zwei Wahrheiten über dasselbe Format zu führen; die Prüfung leistet der Codec des Kerns. Was dieser Katalog festlegt, ist allein, dass der Bogen **unverändert** mitgeführt wird.

**T35:** Zwei `EebMeldungEmpfangen` mit gleicher `meldungId` und gleichem Bogen, verschiedene Ereignis-Ids ⇒ eine Meldung, kein Hinweis. **T36:** Gleiche `meldungId`, abweichender Bogen ⇒ eine Meldung (kleinste HLC) und `inhaltsschluesselWidersprochen`. **T37:** Gleiche `meldungId`, abweichendes `empfangenAm` ⇒ eine Meldung, **kein** Hinweis (§3.2).

#### §5.8.2 Regel: die Übernahme erzeugt die Feldereignisse mit

`EebMeldungUebernommen` setzt `uebernahmeZustand = UEBERNOMMEN` **und** die übernommenen Werte werden als eigenständige Feldereignisse geschrieben (`StaerkeGeaendert`, `LogistikGesetzt`, …) mit `grund = "EEB <meldungId>"`. Damit gelten dort die gewöhnlichen Konfliktregeln, und die Übernahme ist im Einsatztagebuch als solche erkennbar.

**Das sind wirklich geschriebene Ereignisse, keine Projektion** — anders als beim Bewegungsauftrag (§5.6.3). Der Unterschied ist begründet: Der Bewegungsauftrag folgt zwingend und vollständig aus dem Verschiebeereignis. Welche Felder eine Übernahme übernimmt, folgt dagegen aus einer **Auswahl des Bedieners** (`uebernommeneFelder`) und aus dem Stand, den er dabei gesehen hat — dieser gesehene Vorher-Wert steckt in den Feldereignissen und nirgends sonst. Als Projektion wäre er verloren, und Auflage 6 gälte für den ganzen EEB-Weg nicht mehr.

Eine spätere Revision setzt `uebernahmeZustand` auf `GEAENDERT` (ZDM §2.9). Auch das ist abgeleitet: Es gilt, wenn zu demselben `einheitSchluessel` eine Meldung mit jüngerem `stand` vorliegt als die übernommene.

**T38:** `EebMeldungUebernommen` plus das zugehörige `StaerkeGeaendert` mit dem gesehenen Vorher-Wert; ein nebenläufiges `StaerkeGeaendert` mit höherer HLC gewinnt, und es entsteht `vorherPasstNicht`. **T39:** Zweite Revision nach Übernahme ⇒ `uebernahmeZustand = GEAENDERT`, in jeder Permutation.

### §5.9 Einsatztagebuch und Korrekturen

```ts
const EtbEintragErfasst   = z.object({
  etbId: zId, text: zPflichttext,
  bezug: z.object({
    entitaet: z.enum(["EINHEIT", "ABSCHNITT", "FAHRZEUG", "ANFORDERUNG"]), id: zId,
  }).optional(),
})
const EtbEintragBerichtigt = z.object({
  etbId: zId, berichtigtEintragId: zId, text: zPflichttext,
})   // `grund` Pflicht
const KorrekturVon = z.object({
  korrigiertesEreignisId: zId,
  zielTyp:                zPflichttext,   // Ereignisart der eingebetteten Nutzlast
  zielNutzlast:           z.unknown(),    // wird gegen das Schema von `zielTyp` geprüft
})   // `grund` Pflicht
```

| Typ | Feldpfad | Klasse | Undo |
|---|---|---|---|
| `EtbEintragErfasst` | — | additiv, unveränderlich | **nein** |
| `EtbEintragBerichtigt` | — | additiv | **nein** |
| `KorrekturVon` | der Feldpfad von `zielTyp` | wie `zielTyp` | **nein** |

**Das Einsatztagebuch ist überwiegend Projektion.** Jedes fachliche Ereignis erzeugt eine Zeile; `EtbEintragErfasst` ist der frei getippte Zusatz. Doppelt geführt wird nichts (ZDM §3.1 Nr. 6). Die beiden Verwaltungsereignisse der Speicherschicht erscheinen nicht (§1.2).

**`KorrekturVon` faltet wie sein Ziel.** Die eingebettete Nutzlast wird gegen das Schema von `zielTyp` geprüft und wie ein Ereignis dieser Art gefaltet — mit der HLC und der Id des Korrekturereignisses. Zusätzlich wird das korrigierte Ereignis im Tagebuch als berichtigt markiert; **beide Zeilen bleiben stehen** (U4). Ist `zielTyp` unbekannt oder die Nutzlast ungültig, greift §3.6 Punkt 1 beziehungsweise 4.

**T40:** `KorrekturVon` mit `zielTyp = "StaerkeGeaendert"` und höherer HLC als das korrigierte Ereignis ⇒ die korrigierte Stärke gilt, beide Zeilen stehen im Tagebuch. **T41:** `KorrekturVon` mit unbekanntem `zielTyp` ⇒ nicht gefaltet, geführt, weitergespiegelt.
