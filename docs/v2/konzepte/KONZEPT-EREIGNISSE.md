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
