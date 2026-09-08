# Gutachten 01 zu KONZEPT-SPEICHER.md

Stand: 2026-09-08 · Gegenstand: [KONZEPT-SPEICHER.md](KONZEPT-SPEICHER.md) in der Fassung `50e1ce1` (477 Zeilen) · Prüfer: unabhängiger Gutachter ohne Kenntnis der Urheberschaft, geprüft gegen ADR-002, 02-ZIELBILD.md, 03-MEILENSTEINE.md (Auflagen 4 bis 18), 05-UMSETZUNGSPLAN.md und `docs/v2-arbeitsstand/bestandsaufnahme/nas-speicher-recherche.md` §1 und §4.

**Dieses Gutachten ist die Arbeitsgrundlage der Überarbeitung.** Es wird nicht gelöscht, wenn die Befunde abgearbeitet sind, sondern bekommt je Befund einen Vermerk.

## Gesamturteil

**Hält mit Auflagen.** Die tragende Statik — ein Schreiber je Datei, zuerst lokal, Lesen statt Metadaten — ist korrekt aus den Quellen abgeleitet, und §8.6 leistet mehr Ehrlichkeit über die eigenen Grenzen als die meisten Spezifikationen. Als Bauvorlage trägt die Fassung jedoch nicht: Die drei Unit-Tests, die die Definition of Done von M0.3 ausdrücklich verlangt — abgeschnittene Zeile, Neustart mitten im Segment, geklontes Profil — treffen jeweils auf eine Stelle, an der das Dokument sich selbst widerspricht oder undefiniert bleibt. Sechs Punkte müssen vor der ersten Codezeile geschlossen sein, weil sie sonst als stille Falschzustände in den Code wandern.

---

## Schwerwiegend

### S1 · §8.1 gegen §5.4 — der Neustart mitten im Segment löst falschen Klon-Alarm aus

§8.1 sagt für den Schreiber: „Auf dem Share setzt er das Anhängen an der **tatsächlichen Dateigröße** an (§5.4)." §5.4 verbietet genau das und begründet ausführlich, warum. Zweitens kürzt §8.1 die lokale Datei beim Start auf die letzte vollständige Zeile, während §5.4 die Spiegelung als Übertragung der Bytes „unverändert" beschreibt, ohne Beschränkung auf Zeilengrenzen. Ein Spiegelungslauf, der eine gerade entstehende Zeile mitnimmt, gefolgt von Absturz und lokaler Kürzung, hinterlässt eine Share-Datei, die **länger** ist als die lokale.

*Schaden:* Der Vergleich in §5.4 findet keine lokalen Bytes an der Stelle und schließt auf Fall 2 nach §4.5 — neue `clientId`, neues Segment, und die Klartextmeldung „Dieses Benutzerprofil wurde offenbar kopiert". Der Bediener bekommt nach einem gewöhnlichen Absturz eine nachweislich falsche Aussage über seinen Rechner.

*Behebung:* Festlegen, dass die Spiegelung ausschließlich bis zur letzten **vollständigen** lokalen Zeile überträgt. In §5.4 den Fall „Share länger als lokal, Präfix identisch" als eigenen, harmlosen Ausgang führen (lokale Kürzung nachziehen, `shareOffset` übernehmen), getrennt vom Fremdschreiberfall „Präfix weicht ab". Den Satz zur Dateigröße in §8.1 streichen.

### S2 · §8.6.1 Regel 4 gegen §5.4 und §4.5 — der einzige Wiederherstellungsweg ist verboten

§8.6.1 Regel 4 stützt die Reparatur darauf, dass der Schreiber „beim Start die Abweichung zwischen lokaler und Share-Datei (§5.4) erkennt und den fehlenden Teil neu schreibt". §5.4 legt für genau diese Feststellung fest, es liege Fall 2 vor — und §4.5 verfügt: „Der Client **schreibt nicht weiter** unter dieser Kennung."

*Schaden:* Ein einzelnes gekipptes Byte setzt alle Leser in Dauerquarantäne, sperrt die Konvergenzzusage dauerhaft aus, verhindert die Reparatur durch den einzigen, der sie leisten könnte, und begründet das gegenüber dem Bediener mit einer falschen Ursache.

*Behebung:* §5.4 muss zwei Ausgänge unterscheiden — „Share-Bytes weichen ab, aber die eigene Kette und die eigenen Laufnummern sind vollständig enthalten" ⇒ Beschädigung, Reparaturpfad; „Share enthält fremde Laufnummern derselben `clientId`" ⇒ Fall 2. Regel 4 auf den ersten Ausgang stützen.

### S3 · §4.3 — die Abschlusszeile ist nicht berechenbar

Die Abschlusszeile soll „die Kettenprüfsumme tragen, mit der das Nachfolgesegment beginnt". Nach §2.3 ist das die SHA-256 über die vollständigen Bytes der Abschlusszeile selbst. Ein Feld, das den Hash der eigenen Zeile enthält, lässt sich nicht schreiben.

*Schaden:* Blockiert M0.3 unmittelbar. Kein Formulierungsproblem.

*Behebung:* Den Wert streichen — er ist ableitbar, der Leser rechnet ihn aus der gelesenen Abschlusszeile selbst aus. (Alternative: Kettenprüfsumme der vorletzten Zeile; die erste Variante ist die richtige.)

### S4 · §8.2 gegen §8.1 — eine verfälschte `länge` fällt in keine Klasse und friert einen Schreiber lautlos ein

§8.2 erklärt die Abgrenzung für „verbindlich … die einzige Unterscheidung; es wird nicht geraten". Beide Definitionen setzen voraus, dass `länge` korrekt ist. `länge` ist aber selbst ungeschützt: Der CRC-32 deckt nur die JSON-Bytes ab, nicht das Präfix. Zwei Fälle bleiben undefiniert — `länge` zu klein (Bytes da, aber an der angekündigten Stelle kein `\n`) und `länge` zu groß (die Zeile gilt dauerhaft als „unvollständig", der `leseOffset` bleibt stehen, und §8.1 verfügt ausdrücklich „**keine Meldung, kein Hinweis**").

*Schaden:* Der Datenstrom eines Arbeitsplatzes bricht für alle anderen ab, der Quarantänehinweis erscheint nicht, die Statuszeile meldet weiter erfolgreiche Abfragen. Stiller Falschzustand in Reinform. Derselbe Zustand entsteht ohne jeden Defekt, wenn ein Schreiber mitten in einer Zeile endgültig ausfällt.

*Behebung:* `länge` in die Prüfsumme einbeziehen oder gegen eine Plausibilitätsschranke prüfen (Obergrenze je Zeile). Eine unvollständige letzte Zeile, die über eine festzulegende Frist unverändert bleibt, in den Defektfall überführen — mit Hinweis, nicht schweigend.

### S5 · §7.5 — fremde Schnappschüsse werden ohne Prüfung gegen die Ereignisse übernommen

Keine der vier Annahmebedingungen prüft, ob der Zustand der Faltung der im Versionsvektor genannten Ereignisse entspricht. Der `zustandsHash` ist über den Zustand selbst gebildet und belegt nur, dass die Datei in sich stimmt.

*Schaden:* Ein Client mit Speicherfehler, halb ausgerollter Version bei unverändertem `foldVersion` oder schlicht einem Fehler im Fold verteilt seinen Falschzustand dauerhaft und unbemerkt an alle anderen — genau die Klasse, die §7.3 selbst „die gefährlichste Fehlerklasse dieses Entwurfs" nennt, und ein Verstoß gegen §1.3 Satz 3. `nas-speicher-recherche.md` §4 sieht als Gegenmaßnahme ausdrücklich vor, dass Leser „stichprobenartig gegen Neu-Fold" validieren; das Konzept übernimmt Versionsvektor und Hash aus dieser Empfehlung und lässt die Validierung weg.

*Behebung:* **Entscheidung Johannes.** Entweder fremde Schnappschüsse nur als Vorschlag mit anschließender stichprobenartiger Nachfaltung annehmen — oder, im 5-Client-Betrieb tragbar und einfacher, die Annahme auf **eigene** Schnappschüsse beschränken und fremde nur zulassen, wenn der Erstlauf nachweislich zu lang wird.

### S6 · §7.2 und §8.6.1 — die Konvergenz, an der M0 abbricht, ist nicht messbar definiert

Das Abbruchkriterium verlangt „Konvergenz aller Clients per Hash nach jeder Ruhephase", Auflage 18 ein zählbares Kriterium. Das Konzept liefert das Messmittel dem Namen nach (`zustandsHash`), definiert aber weder die „kanonische Serialisierung" (Feldreihenfolge, Zahlendarstellung, Behandlung von Undefiniert, ob die Feld-HLCs aus §7.4 einfließen), noch wann eine „Ruhephase" erreicht ist (alle Upload-Warteschlangen leer? alle `leseOffset` am Dateiende — festgestellt woran, wenn §5.4 und §6.2 die Dateigröße verbieten?), noch was „dieselbe Ereignismenge gesehen" operativ heißt.

*Schaden:* Der Abbruchtest ist nicht schreibbar, und ein roter Lauf ist nicht von einem falsch gemessenen zu unterscheiden.

*Behebung:* Kanonische Serialisierung festschreiben (Schlüssel sortiert, feste Zahlendarstellung, Feld-HLCs eingeschlossen), Ruhephase über beobachtbare Größen definieren, und festlegen, dass der Vergleich Versionsvektoren mitführt, damit „ungleich wegen unterschiedlicher Mengen" von „ungleich bei gleicher Menge" unterscheidbar ist.

---

## Mittel

| Nr. | Paragraf | Befund und Behebung |
|---|---|---|
| M1 | §6.4 gegen §4.3, §8.6.2 | Die Präsenzdatei ist als „rein informativ" zugesichert, aber §4.3 macht den Verfall des Wartezustands von ihr abhängig und §8.6.2 die Erkennung entfernter Dateien. Fällt die Präsenz aus, pollt jeder Leser ein nie erscheinendes Segment für den Rest der Lage. *Behebung:* Zusage auf „kein Datenpfad, keine Fold-Regel" abschwächen und die Ausnahmen benennen — oder den Verfall rein zeitgesteuert auslegen. |
| M2 | §6.2 | „Fünf Clients ⇒ fünf Dateien je Takt" gilt nur, wenn jede Kette wächst oder eine Abschlusszeile trägt. Nach jeder Klon-Erkennung, jedem Präfixkonflikt, jedem Profilverlust und jeder Neuinstallation bleibt eine Datei dauerhaft in Takt A. Die Zahl ist die aller je schreibenden Kennungen. *Behebung:* Verfallsregel für **jede** Datei ohne Fortschritt, und die Messung in M0.5 mit realistischer Dateizahl ansetzen. |
| M3 | §4.5 | Das Erkennungskriterium „größer oder gleich der eigenen **nächsten**" lässt die symmetrische Klon-Lage durch: Beide Kopien vergeben dieselbe Nummer, das Share-Maximum ist dann gleich der eigenen **letzten**. Damit tragen zwei verschiedene Ereignisse dieselbe Identität — Auflage 8 im Kern verletzt. Zudem beschreibt §4.5 den Zusatzvergleich über einen Offset, dessen Ermittlung §5.4 verbietet. *Behebung:* Kriterium auf „zuletzt vergebene" umstellen, Byte-Vergleich zum primären Mittel erklären, Formulierung an §5.4 angleichen. |
| M4 | §3.2 | Die HLC-Fortschreibungsregel fehlt vollständig — für das Erzeugen wie für das Empfangen. Insbesondere die **rückwärts** springende eigene Uhr: ohne `millisekunden = max(bisher, Wanduhr)` erzeugt derselbe Client fallende HLC, womit Schnappschuss-Sortierung, Archivvergleich und Konfliktentscheidung still falsch werden. Zweitens: Wer einen fremden Wert wegen der 5-Minuten-Grenze nicht übernimmt, verliert die Kausalität zu genau diesem Ereignis. *Behebung:* Fortschreibungsregel ausschreiben, Rückwärtssprung abfangen, Kausalitätsfolge benennen. |
| M5 | §5.2, §8 | Der lokale Schreibweg, den §1.3 zur Wahrheit erklärt, hat kein einziges Fehlerbild: volle Platte, entzogenes Recht, Virenscanner, defekter Datenträger. Ebenso unbehandelt: zwei Clients legen denselben Einsatz gleichzeitig an; Rechteentzug auf dem Share im Betrieb (`EACCES` ist nicht transient, würde aber endlos wiederholt, während §6.3 den Share als erreichbar zeigt); Reihenfolge der Spiegelung bei mehreren unübertragenen eigenen Segmenten. *Behebung:* Ein §8.x „lokale Schreibstörung" (Bedienschritt sichtbar abweisen, nicht scheinbar annehmen), Absatz zu dauerhaften gegenüber transienten Share-Fehlern, Regel „Segmente aufsteigend spiegeln", Zeile zum doppelt angelegten Einsatz. |
| M6 | §5.7, §1.4 | `archiv.marker` ist inhaltlich undefiniert — §5.7 vergleicht gegen „die HLC des Markers", ohne dass Format, Inhalt oder Schreiber festgelegt wären. Zugleich ist der Archivzustand damit einer, der sich **nicht** allein aus den Ereignissen ergibt, im Widerspruch zu §1.3 Satz 3. *Behebung:* **Entscheidung Johannes.** Marker-Inhalt festlegen (HLC, `clientId`, Wanduhr) und §1.3 Satz 3 um die eine bewusste Ausnahme ergänzen — oder die Archivierung zusätzlich als Ereignis führen und den Marker zum abgeleiteten Anzeiger erklären. |
| M7 | §8.4 | Ein hängender `fs`-Aufruf lässt sich in Node nicht abbrechen; der Zeitausstieg von 20 s beendet den Aufruf nicht. Entweder findet die zugesagte Wiederholung bis zu 40 s nicht statt, oder ein zweiter Versuch läuft parallel zum hängenden ersten — dann sind zwei Anhänge-Vorgänge auf derselben Datei unterwegs, also genau der Zustand, den „ein Schreiber je Datei" ausschließt. *Behebung:* Festlegen, dass der Zeitausstieg nur den Wartezustand der Oberfläche beendet, der Zugriff serialisiert bleibt und kein zweiter Versuch startet, solange der erste nicht zurück ist. |
| M8 | durchgehend | Die Argumentation ist Windows-Argumentation; Auflage 17 und M0.6 verlangen drei Betriebssysteme. Die Recherche belegt eigene Eigenheiten für macOS (§1.7: Verzeichnis-Enumeration gecacht, nur per Root-Konfiguration abstellbar) und Linux (§1.3, §1.6: `cache=loose` möglich, `actimeo` standardmäßig 1 s, mandatory Locks) — keine kommt im Konzept vor. Der Satz „Datenlesezugriffe gehen ohne gültige Lease zum Server durch" übernimmt die Einschränkung der Quelle, ohne zu sagen, wann eine gültige Lease vorliegen kann. *Behebung:* Abschnitt „Verhalten je Betriebssystem"; in §5.4 und §6.2 benennen, wann die Lease-Annahme kippt (der eigene Schreiber hält seine Datei offen). |

---

## Klein

| Nr. | Paragraf | Befund |
|---|---|---|
| K1 | §10, §4.3 | §4.3 verweist für den Fünf-Minuten-Verfall auf „§10, A4" — dort steht er nicht. Ebenfalls nicht geführt: Präsenztakt 15 s und Veraltet-Schwelle 60 s (§6.4), Rückstau-Staffel 2/5/15/30 s (§5.4), drei aufbewahrte Schnappschüsse (§7.5). Die Einleitung verspricht, jede solche Zahl sei gekennzeichnet. |
| K2 | §4.2 | Rechenfehler: 50.000 Ereignisse **insgesamt** ergeben bei 4 MiB nicht „5 bis 8 Segmente je Schreiber" und nicht „rund 40 Dateien"; verteilt auf fünf Schreiber sind es ein bis zwei je Schreiber. Die Zahl liegt auf der sicheren Seite, die Herleitung stimmt nicht. |
| K3 | §6.2 | Takt A ist 2 s, und im selben Absatz sind 2 s Zykluskosten die Abbruchgrenze — an der Grenze pollt der Client ohne Pause. Der Startwert sollte Abstand zur Grenze haben. |
| K4 | §7.5 | Die Prüfung „mindestens so lang wie der vermerkte Offset" ist wieder eine Größenabfrage; die in §7.2 mitgeführte `letzteKette` bliebe ungenutzt, obwohl genau sie die belastbare Prüfung wäre. |
| K5 | §2.4 | `undoOf` ist Rahmenfeld, `KorrekturVon` nicht — Auflage 11 und 02-ZIELBILD Nr. 9 nennen beide gleichrangig. |
| K6 | §5.5 | Reihenfolge zweideutig („hängt an die lokale Spiegelkopie an, prüft die Zeilen"). Ob defekte Bytes im lokalen Spiegel landen, entscheidet über den Wert von §8.2 Punkt 5 und über den Export nach §8.6.1 Regel 4. |
| K7 | §2.2 | „Ohne `fsync` verlöre ein Absturz den Inhalt" wird als Beleg ausgegeben; die Recherche markiert §1.9 an dieser Stelle ausdrücklich als „Ableitung aus 1.2; kein direkter Beleg". Die Schlussfolgerung bleibt richtig, die Belegqualität ist geringer als behauptet. |
| K8 | §7.5 | Das Löschen älterer eigener Schnappschüsse kann unter Windows aus demselben Grund scheitern, den §6.4 für Rename anführt. Kein Schaden, aber unbehandelt. |
| K9 | §9 | Überschrift nennt „Auflagen 4 bis 14", die Kopfzeile des Dokuments nennt 4 bis 18 als Grundlage. Wo 15 bis 18 landen, sagt das Dokument nirgends; Auflage 18 ist wegen S6 nicht rein Abnahmesache. |

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

---

## Was beim Überarbeiten nicht kaputtgehen darf

- **§8.6 insgesamt.** Die getrennte Benennung von Zusicherung und Nicht-Zusicherung, und besonders die Einsicht, dass eine Quarantäne die Konvergenzzusage aufhebt und ein roter Testlauf dann der erwartete Ausgang ist (§8.6.1 Regel 3).
- **§2.2, Absatz „Ausdrücklich nicht behauptet".** Die Trennung von „es kann nicht passieren" und „es schadet nicht".
- **§5.4, das Verbot der Größenabfrage samt Begründung.** Muss beim Beheben von S1 erhalten bleiben und darf nicht als Kollateralschaden mit dem Satz in §8.1 verschwinden.
- **§7.5, die vierte Annahmebedingung.** Bleibt richtig, auch wenn S5 die Annahme fremder Schnappschüsse insgesamt einschränkt.
- **§5.7, „das Ereignis wird angenommen".** Fachlich richtig gedacht, nicht technisch bequem.
- **§4.2, Begründung der Segmentierung über Poll-Kosten**, und die Disziplin, Zahlen als Startwerte zu kennzeichnen und in §10 zu führen.
