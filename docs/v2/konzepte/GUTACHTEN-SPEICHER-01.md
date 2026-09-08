# Gutachten 01 zu KONZEPT-SPEICHER.md

Stand: 2026-09-08 · Gegenstand: [KONZEPT-SPEICHER.md](KONZEPT-SPEICHER.md) in der Fassung `50e1ce1` (477 Zeilen) · Prüfer: unabhängiger Gutachter ohne Kenntnis der Urheberschaft, geprüft gegen ADR-002, 02-ZIELBILD.md, 03-MEILENSTEINE.md (Auflagen 4 bis 18), 05-UMSETZUNGSPLAN.md und `docs/v2-arbeitsstand/bestandsaufnahme/nas-speicher-recherche.md` §1 und §4.

**Dieses Gutachten ist die Arbeitsgrundlage der Überarbeitung.** Es wird nicht gelöscht, wenn die Befunde abgearbeitet sind, sondern bekommt je Befund einen Vermerk.

**Stand der Abarbeitung: 2026-09-08.** Alle 23 Befunde und die Prüfung der Auflagentabelle sind abgearbeitet; je Befund steht ein Vermerk **Behandlung**. Zwei Punkte hat Johannes entschieden: S5 (nur eigene Schnappschüsse) und M6 (Archivierung als Ereignis). Commits: `03d396e` (S1 bis S6), `cff07ad` (M1 bis M8), `67b85fc` (K1 bis K8) und der Folgecommit zur Auflagentabelle.

## Gesamturteil

**Hält mit Auflagen.** Die tragende Statik — ein Schreiber je Datei, zuerst lokal, Lesen statt Metadaten — ist korrekt aus den Quellen abgeleitet, und §8.6 leistet mehr Ehrlichkeit über die eigenen Grenzen als die meisten Spezifikationen. Als Bauvorlage trägt die Fassung jedoch nicht: Die drei Unit-Tests, die die Definition of Done von M0.3 ausdrücklich verlangt — abgeschnittene Zeile, Neustart mitten im Segment, geklontes Profil — treffen jeweils auf eine Stelle, an der das Dokument sich selbst widerspricht oder undefiniert bleibt. Sechs Punkte müssen vor der ersten Codezeile geschlossen sein, weil sie sonst als stille Falschzustände in den Code wandern.

---

## Schwerwiegend

### S1 · §8.1 gegen §5.4 — der Neustart mitten im Segment löst falschen Klon-Alarm aus

§8.1 sagt für den Schreiber: „Auf dem Share setzt er das Anhängen an der **tatsächlichen Dateigröße** an (§5.4)." §5.4 verbietet genau das und begründet ausführlich, warum. Zweitens kürzt §8.1 die lokale Datei beim Start auf die letzte vollständige Zeile, während §5.4 die Spiegelung als Übertragung der Bytes „unverändert" beschreibt, ohne Beschränkung auf Zeilengrenzen. Ein Spiegelungslauf, der eine gerade entstehende Zeile mitnimmt, gefolgt von Absturz und lokaler Kürzung, hinterlässt eine Share-Datei, die **länger** ist als die lokale.

*Schaden:* Der Vergleich in §5.4 findet keine lokalen Bytes an der Stelle und schließt auf Fall 2 nach §4.5 — neue `clientId`, neues Segment, und die Klartextmeldung „Dieses Benutzerprofil wurde offenbar kopiert". Der Bediener bekommt nach einem gewöhnlichen Absturz eine nachweislich falsche Aussage über seinen Rechner.

*Behebung:* Festlegen, dass die Spiegelung ausschließlich bis zur letzten **vollständigen** lokalen Zeile überträgt. In §5.4 den Fall „Share länger als lokal, Präfix identisch" als eigenen, harmlosen Ausgang führen (lokale Kürzung nachziehen, `shareOffset` übernehmen), getrennt vom Fremdschreiberfall „Präfix weicht ab". Den Satz zur Dateigröße in §8.1 streichen.

**Behandlung — geschlossen, wie vorgeschlagen und darüber hinaus.** §5.4.1 legt fest, dass nur bis zur letzten vollständigen lokalen Zeile übertragen wird, und macht daraus die ausgesprochene Invariante: die Share-Datei ist stets ein Byte-Präfix der lokalen Datei. Damit entfällt der vorgeschlagene eigene Ausgang „Share länger als lokal“ — der Fall kann nicht mehr entstehen, statt gutmütig behandelt zu werden. Der Satz zur tatsächlichen Dateigröße in §8.1 ist ersetzt; das Verbot der Größenabfrage in §5.4.2 steht unverändert samt Begründung.

### S2 · §8.6.1 Regel 4 gegen §5.4 und §4.5 — der einzige Wiederherstellungsweg ist verboten

§8.6.1 Regel 4 stützt die Reparatur darauf, dass der Schreiber „beim Start die Abweichung zwischen lokaler und Share-Datei (§5.4) erkennt und den fehlenden Teil neu schreibt". §5.4 legt für genau diese Feststellung fest, es liege Fall 2 vor — und §4.5 verfügt: „Der Client **schreibt nicht weiter** unter dieser Kennung."

*Schaden:* Ein einzelnes gekipptes Byte setzt alle Leser in Dauerquarantäne, sperrt die Konvergenzzusage dauerhaft aus, verhindert die Reparatur durch den einzigen, der sie leisten könnte, und begründet das gegenüber dem Bediener mit einer falschen Ursache.

*Behebung:* §5.4 muss zwei Ausgänge unterscheiden — „Share-Bytes weichen ab, aber die eigene Kette und die eigenen Laufnummern sind vollständig enthalten" ⇒ Beschädigung, Reparaturpfad; „Share enthält fremde Laufnummern derselben `clientId`" ⇒ Fall 2. Regel 4 auf den ersten Ausgang stützen.

**Behandlung — geschlossen.** §5.4.3 unterscheidet drei Ausgänge. Das Kriterium ist nicht „eigene Kette und Laufnummern vollständig enthalten“, sondern schärfer: eine Share-Zeile mit der eigenen `clientId`, deren Laufnummer lokal nicht oder mit anderem Inhalt vergeben ist. Zusätzlich war zu klären, *wie* repariert wird — der Behebungsvorschlag lässt das offen, und Anhängen heilt keine Beschädigung in der Dateimitte. Der neue §4.6 führt dafür das Ersatzsegment mit dem Typ `SegmentErsetzt` ein: neue Datei, unveränderte Ereignis-Identitäten, Kette über den Sprung durchlaufend, Idempotenz über die Mengeneigenschaft des Folds. §8.6.1 Regel 4 stützt sich darauf.

### S3 · §4.3 — die Abschlusszeile ist nicht berechenbar

Die Abschlusszeile soll „die Kettenprüfsumme tragen, mit der das Nachfolgesegment beginnt". Nach §2.3 ist das die SHA-256 über die vollständigen Bytes der Abschlusszeile selbst. Ein Feld, das den Hash der eigenen Zeile enthält, lässt sich nicht schreiben.

*Schaden:* Blockiert M0.3 unmittelbar. Kein Formulierungsproblem.

*Behebung:* Den Wert streichen — er ist ableitbar, der Leser rechnet ihn aus der gelesenen Abschlusszeile selbst aus. (Alternative: Kettenprüfsumme der vorletzten Zeile; die erste Variante ist die richtige.)

**Behandlung — geschlossen, erste Variante wie vorgeschlagen.** §4.3 streicht den Wert; die Prüfsumme ist abgeleitet und wird vom Leser aus der gelesenen Abschlusszeile berechnet. Warum ein solches Feld nicht schreibbar wäre, steht im Text, damit es nicht erneut hineingerät.

### S4 · §8.2 gegen §8.1 — eine verfälschte `länge` fällt in keine Klasse und friert einen Schreiber lautlos ein

§8.2 erklärt die Abgrenzung für „verbindlich … die einzige Unterscheidung; es wird nicht geraten". Beide Definitionen setzen voraus, dass `länge` korrekt ist. `länge` ist aber selbst ungeschützt: Der CRC-32 deckt nur die JSON-Bytes ab, nicht das Präfix. Zwei Fälle bleiben undefiniert — `länge` zu klein (Bytes da, aber an der angekündigten Stelle kein `\n`) und `länge` zu groß (die Zeile gilt dauerhaft als „unvollständig", der `leseOffset` bleibt stehen, und §8.1 verfügt ausdrücklich „**keine Meldung, kein Hinweis**").

*Schaden:* Der Datenstrom eines Arbeitsplatzes bricht für alle anderen ab, der Quarantänehinweis erscheint nicht, die Statuszeile meldet weiter erfolgreiche Abfragen. Stiller Falschzustand in Reinform. Derselbe Zustand entsteht ohne jeden Defekt, wenn ein Schreiber mitten in einer Zeile endgültig ausfällt.

*Behebung:* `länge` in die Prüfsumme einbeziehen oder gegen eine Plausibilitätsschranke prüfen (Obergrenze je Zeile). Eine unvollständige letzte Zeile, die über eine festzulegende Frist unverändert bleibt, in den Defektfall überführen — mit Hinweis, nicht schweigend.

**Behandlung — geschlossen, beide vorgeschlagenen Mittel und eines mehr.** Der CRC deckt jetzt `<länge> \t <json>` ab (§2.1), es gibt eine Obergrenze von 1 MiB je Zeile, und §8.2 ersetzt die zweiteilige Abgrenzung durch vier Regeln, in die jede Zeile fällt: eine zu kleine `länge` landet in Regel 3, eine zu große in Regel 1 oder 2. Die Frist beträgt fünf Minuten und führt in eine **vorläufige** Quarantäne (§8.1), die bei jedem Takt-B-Durchlauf erneut geprüft wird und ohne Zutun wegfällt, wenn der Schreiber zurückkehrt — mit Hinweis, nicht schweigend.

### S5 · §7.5 — fremde Schnappschüsse werden ohne Prüfung gegen die Ereignisse übernommen

Keine der vier Annahmebedingungen prüft, ob der Zustand der Faltung der im Versionsvektor genannten Ereignisse entspricht. Der `zustandsHash` ist über den Zustand selbst gebildet und belegt nur, dass die Datei in sich stimmt.

*Schaden:* Ein Client mit Speicherfehler, halb ausgerollter Version bei unverändertem `foldVersion` oder schlicht einem Fehler im Fold verteilt seinen Falschzustand dauerhaft und unbemerkt an alle anderen — genau die Klasse, die §7.3 selbst „die gefährlichste Fehlerklasse dieses Entwurfs" nennt, und ein Verstoß gegen §1.3 Satz 3. `nas-speicher-recherche.md` §4 sieht als Gegenmaßnahme ausdrücklich vor, dass Leser „stichprobenartig gegen Neu-Fold" validieren; das Konzept übernimmt Versionsvektor und Hash aus dieser Empfehlung und lässt die Validierung weg.

*Behebung:* **Entscheidung Johannes.** Entweder fremde Schnappschüsse nur als Vorschlag mit anschließender stichprobenartiger Nachfaltung annehmen — oder, im 5-Client-Betrieb tragbar und einfacher, die Annahme auf **eigene** Schnappschüsse beschränken und fremde nur zulassen, wenn der Erstlauf nachweislich zu lang wird.

**Behandlung — Entscheidung Johannes am 2026-09-08: der zweite, einfachere Weg.** Es werden ausschließlich eigene Schnappschüsse angenommen (§7.5). Die Begründung samt Beleg aus der Recherche steht im Text, ebenso die Bedingung für eine Nachrüstung (Annahme A7 in §10: wenn M0.4 zeigt, dass der Erstlauf zu lang wird). Die vierte Annahmebedingung bleibt erhalten; begründet ist jetzt auch, warum sie bei ausschließlich eigenen Schnappschüssen weiterhin nötig ist.

### S6 · §7.2 und §8.6.1 — die Konvergenz, an der M0 abbricht, ist nicht messbar definiert

Das Abbruchkriterium verlangt „Konvergenz aller Clients per Hash nach jeder Ruhephase", Auflage 18 ein zählbares Kriterium. Das Konzept liefert das Messmittel dem Namen nach (`zustandsHash`), definiert aber weder die „kanonische Serialisierung" (Feldreihenfolge, Zahlendarstellung, Behandlung von Undefiniert, ob die Feld-HLCs aus §7.4 einfließen), noch wann eine „Ruhephase" erreicht ist (alle Upload-Warteschlangen leer? alle `leseOffset` am Dateiende — festgestellt woran, wenn §5.4 und §6.2 die Dateigröße verbieten?), noch was „dieselbe Ereignismenge gesehen" operativ heißt.

*Schaden:* Der Abbruchtest ist nicht schreibbar, und ein roter Lauf ist nicht von einem falsch gemessenen zu unterscheiden.

*Behebung:* Kanonische Serialisierung festschreiben (Schlüssel sortiert, feste Zahlendarstellung, Feld-HLCs eingeschlossen), Ruhephase über beobachtbare Größen definieren, und festlegen, dass der Vergleich Versionsvektoren mitführt, damit „ungleich wegen unterschiedlicher Mengen" von „ungleich bei gleicher Menge" unterscheidbar ist.

**Behandlung — geschlossen, wie vorgeschlagen.** Der neue §7.6 schreibt die kanonische Serialisierung fest (Schlüssel sortiert, Zahlendarstellung nach `JSON.stringify`, fehlende Felder weggelassen statt `null`, Feld-HLC eingeschlossen), definiert die Ruhephase über vier beobachtbare Größen ohne Dateigröße und über zwei aufeinanderfolgende Durchläufe je Takt, und legt den Vergleich als Paar aus Versionsvektor und Hash mit drei Ausgängen fest — nur einer davon ist ein Fehler.

---

## Mittel

| Nr. | Paragraf | Befund und Behebung |
|---|---|---|
| M1 | §6.4 gegen §4.3, §8.6.2 | Die Präsenzdatei ist als „rein informativ" zugesichert, aber §4.3 macht den Verfall des Wartezustands von ihr abhängig und §8.6.2 die Erkennung entfernter Dateien. Fällt die Präsenz aus, pollt jeder Leser ein nie erscheinendes Segment für den Rest der Lage. *Behebung:* Zusage auf „kein Datenpfad, keine Fold-Regel" abschwächen und die Ausnahmen benennen — oder den Verfall rein zeitgesteuert auslegen. <br><br>**Behandlung — geschlossen, beide Vorschläge kombiniert.** §6.4 grenzt die Zusage auf „kein Datenpfad, keine Fold-Regel“ ein und benennt die zwei verbleibenden Verwendungen samt Ausfallfolge. Der Verfall in §4.3 ist zugleich rein zeitgesteuert; die Präsenz darf ihn nur vorziehen. |
| M2 | §6.2 | „Fünf Clients ⇒ fünf Dateien je Takt" gilt nur, wenn jede Kette wächst oder eine Abschlusszeile trägt. Nach jeder Klon-Erkennung, jedem Präfixkonflikt, jedem Profilverlust und jeder Neuinstallation bleibt eine Datei dauerhaft in Takt A. Die Zahl ist die aller je schreibenden Kennungen. *Behebung:* Verfallsregel für **jede** Datei ohne Fortschritt, und die Messung in M0.5 mit realistischer Dateizahl ansetzen. <br><br>**Behandlung — geschlossen, wie vorgeschlagen.** §6.2 nennt die Zahl der je schreibenden Kennungen als Maß, zählt die fünf Ursachen auf, die sie erhöhen, und führt eine Verfallsregel für jede Datei ohne Fortschritt ein; der Sonderfall aus §4.3 und die vorläufige Quarantäne aus §8.1 gehen darin auf. Die Messung M0.5 wird mit 10 Segmenten bei 5 Clients angesetzt (§10, A8). |
| M3 | §4.5 | Das Erkennungskriterium „größer oder gleich der eigenen **nächsten**" lässt die symmetrische Klon-Lage durch: Beide Kopien vergeben dieselbe Nummer, das Share-Maximum ist dann gleich der eigenen **letzten**. Damit tragen zwei verschiedene Ereignisse dieselbe Identität — Auflage 8 im Kern verletzt. Zudem beschreibt §4.5 den Zusatzvergleich über einen Offset, dessen Ermittlung §5.4 verbietet. *Behebung:* Kriterium auf „zuletzt vergebene" umstellen, Byte-Vergleich zum primären Mittel erklären, Formulierung an §5.4 angleichen. <br><br>**Behandlung — geschlossen, im Commit der schwerwiegenden Befunde**, weil §4.5 nicht von der Neufassung des §5.4 zu trennen war. Das Kriterium lautet jetzt „größer als die zuletzt vergebene“, ergänzt um den Inhaltsvergleich bei Gleichheit — ein reiner Zahlenvergleich auf „zuletzt vergebene“ hätte im Normalfall eines vollständig gespiegelten Segments immer angeschlagen. Der Byte-Vergleich der Spiegelung ist ausdrücklich zum primären Mittel erklärt, die Offset-Formulierung an §5.4 angeglichen. |
| M4 | §3.2 | Die HLC-Fortschreibungsregel fehlt vollständig — für das Erzeugen wie für das Empfangen. Insbesondere die **rückwärts** springende eigene Uhr: ohne `millisekunden = max(bisher, Wanduhr)` erzeugt derselbe Client fallende HLC, womit Schnappschuss-Sortierung, Archivvergleich und Konfliktentscheidung still falsch werden. Zweitens: Wer einen fremden Wert wegen der 5-Minuten-Grenze nicht übernimmt, verliert die Kausalität zu genau diesem Ereignis. *Behebung:* Fortschreibungsregel ausschreiben, Rückwärtssprung abfangen, Kausalitätsfolge benennen. <br><br>**Behandlung — geschlossen, wie vorgeschlagen.** §3.2 schreibt beide Fortschreibungsregeln als Pseudocode aus, fängt den Rückwärtssprung über „`millisekunden` wird nie verkleinert“ ab und nennt die drei Stellen, die ohne diese Regel still falsch würden. Die Kausalitätsfolge der Nichtübernahme ist in einem eigenen Absatz benannt und mit dem `vorher`-Konflikthinweis aus §2.5 verbunden. |
| M5 | §5.2, §8 | Der lokale Schreibweg, den §1.3 zur Wahrheit erklärt, hat kein einziges Fehlerbild: volle Platte, entzogenes Recht, Virenscanner, defekter Datenträger. Ebenso unbehandelt: zwei Clients legen denselben Einsatz gleichzeitig an; Rechteentzug auf dem Share im Betrieb (`EACCES` ist nicht transient, würde aber endlos wiederholt, während §6.3 den Share als erreichbar zeigt); Reihenfolge der Spiegelung bei mehreren unübertragenen eigenen Segmenten. *Behebung:* Ein §8.x „lokale Schreibstörung" (Bedienschritt sichtbar abweisen, nicht scheinbar annehmen), Absatz zu dauerhaften gegenüber transienten Share-Fehlern, Regel „Segmente aufsteigend spiegeln", Zeile zum doppelt angelegten Einsatz. <br><br>**Behandlung — geschlossen, alle vier Punkte.** Neu: §8.8 (lokale Schreibstörung, mit sichtbarer Abweisung des Bedienschritts und der Begründung, warum das der schlimmste Fehler wäre) und §8.9 (dauerhafte gegenüber vorübergehenden Share-Fehlern, mit Fehlerlisten je Klasse und getrennter Anzeige). Dazu die Regel „Segmente aufsteigend spiegeln“ in §5.4.4 und der doppelt angelegte Einsatz in §5.6 — dort mit der Feststellung, dass zwei gleichzeitige Anlagevorgänge wegen der Kurz-ID zwei Ordner erzeugen, also ein fachlicher Doppeleintrag sind und kein Speicherkonflikt. |
| M6 | §5.7, §1.4 | `archiv.marker` ist inhaltlich undefiniert — §5.7 vergleicht gegen „die HLC des Markers", ohne dass Format, Inhalt oder Schreiber festgelegt wären. Zugleich ist der Archivzustand damit einer, der sich **nicht** allein aus den Ereignissen ergibt, im Widerspruch zu §1.3 Satz 3. *Behebung:* **Entscheidung Johannes.** Marker-Inhalt festlegen (HLC, `clientId`, Wanduhr) und §1.3 Satz 3 um die eine bewusste Ausnahme ergänzen — oder die Archivierung zusätzlich als Ereignis führen und den Marker zum abgeleiteten Anzeiger erklären. <br><br>**Behandlung — Entscheidung Johannes am 2026-09-08: die zweite Variante.** Die Archivierung ist ein Ereignis `EinsatzArchiviert`, `archiv.marker` nur ein abgeleiteter Anzeiger mit festgelegtem Inhalt und festgelegten Schreib- und Löschregeln (§5.7). §1.3 Satz 3 braucht damit keine Ausnahme, sondern nur eine Präzisierung, dass abgeleitete Anzeiger zulässig sind. Ausschlaggebend war, dass 05-UMSETZUNGSPLAN.md M1.2 die Barriere `EinsatzArchiviert` ohnehin als Ereignis führt. |
| M7 | §8.4 | Ein hängender `fs`-Aufruf lässt sich in Node nicht abbrechen; der Zeitausstieg von 20 s beendet den Aufruf nicht. Entweder findet die zugesagte Wiederholung bis zu 40 s nicht statt, oder ein zweiter Versuch läuft parallel zum hängenden ersten — dann sind zwei Anhänge-Vorgänge auf derselben Datei unterwegs, also genau der Zustand, den „ein Schreiber je Datei" ausschließt. *Behebung:* Festlegen, dass der Zeitausstieg nur den Wartezustand der Oberfläche beendet, der Zugriff serialisiert bleibt und kein zweiter Versuch startet, solange der erste nicht zurück ist. <br><br>**Behandlung — geschlossen, wie vorgeschlagen.** §8.4 stellt klar, dass der Zeitausstieg den `fs`-Aufruf nicht beendet, sondern allein den Wartezustand der Oberfläche, dass je Datei höchstens ein Zugriff offen ist und dass der Rückstau erst nach Rückkehr des ersten Versuchs zu zählen beginnt. Die Serialisierung ist ausdrücklich Sache der Speicherschicht, nicht des Aufrufers. |
| M8 | durchgehend | Die Argumentation ist Windows-Argumentation; Auflage 17 und M0.6 verlangen drei Betriebssysteme. Die Recherche belegt eigene Eigenheiten für macOS (§1.7: Verzeichnis-Enumeration gecacht, nur per Root-Konfiguration abstellbar) und Linux (§1.3, §1.6: `cache=loose` möglich, `actimeo` standardmäßig 1 s, mandatory Locks) — keine kommt im Konzept vor. Der Satz „Datenlesezugriffe gehen ohne gültige Lease zum Server durch" übernimmt die Einschränkung der Quelle, ohne zu sagen, wann eine gültige Lease vorliegen kann. *Behebung:* Abschnitt „Verhalten je Betriebssystem"; in §5.4 und §6.2 benennen, wann die Lease-Annahme kippt (der eigene Schreiber hält seine Datei offen). <br><br>**Behandlung — geschlossen, wie vorgeschlagen.** Der neue §6.6 behandelt Windows, macOS und Linux getrennt mit den Belegen aus §1.2, §1.7 sowie §1.3 und §1.6 der Recherche. Er endet mit der Festlegung, wann die Lease-Annahme kippt: Der Schreiber öffnet die Datei für die Endebestimmung nach §5.4.2 und für die Prüfung nach §4.5 neu und liest sie nie über ein dauerhaft offenes Handle. Ob die Neuöffnung auf dem Synology-Gerät durchgeht, ist als Teil von A5 vermerkt. |

---

## Klein

| Nr. | Paragraf | Befund |
|---|---|---|
| K1 | §10, §4.3 | §4.3 verweist für den Fünf-Minuten-Verfall auf „§10, A4" — dort steht er nicht. Ebenfalls nicht geführt: Präsenztakt 15 s und Veraltet-Schwelle 60 s (§6.4), Rückstau-Staffel 2/5/15/30 s (§5.4), drei aufbewahrte Schnappschüsse (§7.5). Die Einleitung verspricht, jede solche Zahl sei gekennzeichnet. <br><br>**Behandlung — geschlossen.** §10 führt sämtliche Startwerte in einer eigenen Tabelle mit Fundstelle und Kalibrierungsziel, einschließlich Präsenztakt, Veraltet-Schwelle, Rückstau-Staffel, aufbewahrten Schnappschüssen und der Delta-Grenze (letztere ausdrücklich als nicht zu messender Wert). Neu sind A7 und A8. |
| K2 | §4.2 | Rechenfehler: 50.000 Ereignisse **insgesamt** ergeben bei 4 MiB nicht „5 bis 8 Segmente je Schreiber" und nicht „rund 40 Dateien"; verteilt auf fünf Schreiber sind es ein bis zwei je Schreiber. Die Zahl liegt auf der sicheren Seite, die Herleitung stimmt nicht. <br><br>**Behandlung — geschlossen.** §4.2 rechnet jetzt richtig: 50.000 Ereignisse über alle Schreiber, ein bis zwei Segmente je Schreiber, fünf bis zehn Dateien. Der alte Rechenweg ist als Irrtum benannt statt stillschweigend ersetzt. |
| K3 | §6.2 | Takt A ist 2 s, und im selben Absatz sind 2 s Zykluskosten die Abbruchgrenze — an der Grenze pollt der Client ohne Pause. Der Startwert sollte Abstand zur Grenze haben. <br><br>**Behandlung — geschlossen, mit einer zusätzlichen Regel.** Startwert Takt A auf 3 s, dazu die Regel „mindestens das Doppelte der gemessenen Zykluskosten“, damit der Abstand zur Grenze nicht wieder verloren geht. |
| K4 | §7.5 | Die Prüfung „mindestens so lang wie der vermerkte Offset" ist wieder eine Größenabfrage; die in §7.2 mitgeführte `letzteKette` bliebe ungenutzt, obwohl genau sie die belastbare Prüfung wäre. <br><br>**Behandlung — geschlossen, im Commit der schwerwiegenden Befunde.** Die Größenabfrage in §7.5 ist durch den Vergleich der mitgeführten `letzteKette` ersetzt — genau die Prüfung, die das Gutachten als die belastbare bezeichnet. Sie kommt zudem ohne jeden Dateizugriff aus, weil der Leser die Werte in `upload-state.json` führt. |
| K5 | §2.4 | `undoOf` ist Rahmenfeld, `KorrekturVon` nicht — Auflage 11 und 02-ZIELBILD Nr. 9 nennen beide gleichrangig. <br><br>**Behandlung — geschlossen.** `korrekturVon` ist als Rahmenfeld in §2.4 aufgenommen, gleichrangig zu `undoOf`, und in §9 Zeile 11 nachgetragen. |
| K6 | §5.5 | Reihenfolge zweideutig („hängt an die lokale Spiegelkopie an, prüft die Zeilen"). Ob defekte Bytes im lokalen Spiegel landen, entscheidet über den Wert von §8.2 Punkt 5 und über den Export nach §8.6.1 Regel 4. <br><br>**Behandlung — geschlossen.** §5.5 legt die Reihenfolge verbindlich fest: geprüft wird im Puffer, vor dem Anhängen. Die Folge — der lokale Spiegel einer fremden Datei ist ab einer Quarantänestelle ihr geprüftes Präfix, nicht ihre Kopie — ist ausdrücklich benannt, ebenso die Wirkung auf §8.2 Punkt 5 und den Export. |
| K7 | §2.2 | „Ohne `fsync` verlöre ein Absturz den Inhalt" wird als Beleg ausgegeben; die Recherche markiert §1.9 an dieser Stelle ausdrücklich als „Ableitung aus 1.2; kein direkter Beleg". Die Schlussfolgerung bleibt richtig, die Belegqualität ist geringer als behauptet. <br><br>**Behandlung — geschlossen.** §2.2 trennt den belegten Teil vom abgeleiteten und stützt die `fsync`-Pflicht neu: Nicht der Verlust ist bewiesen, sondern die Dauerhaftigkeit ohne `fsync` ist nirgends zugesagt. |
| K8 | §7.5 | Das Löschen älterer eigener Schnappschüsse kann unter Windows aus demselben Grund scheitern, den §6.4 für Rename anführt. Kein Schaden, aber unbehandelt. <br><br>**Behandlung — geschlossen.** §7.5 behandelt den Fall mit dem Beleg aus §1.4 der Recherche und hält fest, dass er seit dem Wegfall fremder Schnappschüsse praktisch nur noch durch Wartungswerkzeuge auftritt. |
| K9 | §9 | Überschrift nennt „Auflagen 4 bis 14", die Kopfzeile des Dokuments nennt 4 bis 18 als Grundlage. Wo 15 bis 18 landen, sagt das Dokument nirgends; Auflage 18 ist wegen S6 nicht rein Abnahmesache. <br><br>**Behandlung — geschlossen.** §9 heißt jetzt „Nachweis der Auflagen 4 bis 18“ und führt 15 bis 18 mit eigenen Zeilen: Sie sind Abnahmeauflagen, und in der Zeile steht, was die Speicherschicht dafür bereitstellt. Auflage 18 ist zweigeteilt geführt — das Messmittel steht in §7.6, der Nachweis in M0.2 und M0.4. |

---

## Prüfung der Auflagentabelle in §9

| Auflage | Urteil des Gutachters |
|---|---|
| 4 | **Trägt mit Einschränkung.** §7.3 und §7.4 sind stark; „Speicherseite vollständig hier" ist zu viel — kanonische Serialisierung fehlt (S6), Annahme fremder Schnappschüsse ungesichert (S5), beides Speicherseite. |
| 5 | **Trägt** im Wortlaut. Die fehlende Fortschreibungsregel (M4) liegt jenseits des Auflagentextes, aber diesseits der Baubarkeit. |
| 6 | **Trägt.** Grenze zwischen Rahmen und Auswertung sauber gezogen. |
| 7 | **Trägt nur scheinbar.** Die als „verbindlich" ausgegebene Abgrenzung deckt den verfälschten Längenwert nicht ab; der Folgezustand ist ein stiller Stillstand genau eines Schreiberstroms (S4). |
| 8 | **Trägt mit Lücke.** Erkennungskriterium falsch angesetzt, symmetrische Klon-Lage bleibt unerkannt (M3) — Auflagenkern nicht erfüllt. |
| 9 | **Trägt.** Startwert gekennzeichnet, Herleitung enthält K2. |
| 10 | **Abgrenzung sauber.** Reine Fold-Regeln, keine versteckte Lücke. |
| 11 | **Trägt überwiegend.** `KorrekturVon` fehlt (K5); der „Undo-Stapel je Client" braucht eine Aussage, ob er einen Neustart überlebt und wo er liegt — er steht weder in `schreiber.json` noch sonstwo. |
| 12 | **Trägt.** |
| 13 | **Trägt inhaltlich, nicht formal.** Nicht ausführbar, solange der Marker keinen definierten Inhalt und keine HLC hat (M6). |
| 14 | **Trägt vollständig.** §8.6.2 ist der beste Abschnitt des Dokuments. |

Die Tabelle behauptet in vier Zeilen mehr, als der Text hergibt: bei 4, 7, 8 und 13.

**Behandlung — geschlossen.** §9 ist neu gefasst und heißt jetzt „Nachweis der Auflagen 4 bis 18“ (K9). Die vier beanstandeten Zeilen sagen nicht mehr, als der Text hergibt:

- **4** nennt statt „Speicherseite vollständig hier“ die konkreten Paragraphen §7.2 bis §7.6 und die Einschränkung auf eigene Schnappschüsse.
- **7** verweist zusätzlich auf §2.1 und nennt, dass `länge` durch CRC und Obergrenze gedeckt ist und eine unvollständige Zeile nach Frist zum sichtbaren Defekt wird.
- **8** verweist zusätzlich auf §5.4.3 und nennt den Inhaltsvergleich, mit dem auch die symmetrische Klon-Lage auffällt.
- **13** nennt das Ereignis `EinsatzArchiviert` und den Marker als abgeleiteten Anzeiger; damit ist der HLC-Vergleich tatsächlich ausführbar.
- **11** nennt zusätzlich `korrekturVon` und den Ort des Undo-Stapels (§4.4: abgeleitet aus dem lokalen Spiegel, damit ohne eigene Datei und ohne Widerspruch zu §1.3 Satz 3).

Neu ist außerdem ein Abschnitt „Was hier nur teilweise erfüllt ist“ unter der Tabelle, der die vier verbleibenden Einschränkungen ausdrücklich benennt: Auflage 4 unter dem Vorbehalt von A7, die Auflagen 10 bis 12 mit ihrer fachlichen Hälfte im Ereigniskonzept, Auflage 13 unter der Voraussetzung, dass der Ereigniskatalog das Ereignis führt, und die Auflagen 15 bis 18 als Abnahmeauflagen, für die hier nur das Messmittel steht.

---

## Was beim Überarbeiten nicht kaputtgehen darf

- **§8.6 insgesamt.** Die getrennte Benennung von Zusicherung und Nicht-Zusicherung, und besonders die Einsicht, dass eine Quarantäne die Konvergenzzusage aufhebt und ein roter Testlauf dann der erwartete Ausgang ist (§8.6.1 Regel 3).
- **§2.2, Absatz „Ausdrücklich nicht behauptet".** Die Trennung von „es kann nicht passieren" und „es schadet nicht".
- **§5.4, das Verbot der Größenabfrage samt Begründung.** Muss beim Beheben von S1 erhalten bleiben und darf nicht als Kollateralschaden mit dem Satz in §8.1 verschwinden.
- **§7.5, die vierte Annahmebedingung.** Bleibt richtig, auch wenn S5 die Annahme fremder Schnappschüsse insgesamt einschränkt.
- **§5.7, „das Ereignis wird angenommen".** Fachlich richtig gedacht, nicht technisch bequem.
- **§4.2, Begründung der Segmentierung über Poll-Kosten**, und die Disziplin, Zahlen als Startwerte zu kennzeichnen und in §10 zu führen.
