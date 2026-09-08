# Gutachten 02 zu KONZEPT-SPEICHER.md

Stand: 2026-09-08 · Gegenstand: [KONZEPT-SPEICHER.md](KONZEPT-SPEICHER.md) in der Fassung `889c404` (752 Zeilen) · Prüfer: unabhängiger Gutachter ohne Kenntnis der Urheberschaft, geprüft gegen ADR-002, 02-ZIELBILD.md, 03-MEILENSTEINE.md (Auflagen 4 bis 18), 05-UMSETZUNGSPLAN.md und `nas-speicher-recherche.md` §1, §4 und §10.

Zweite Prüfung, nachdem die Befunde aus [GUTACHTEN-SPEICHER-01.md](GUTACHTEN-SPEICHER-01.md) abgearbeitet waren. Wie das erste bleibt dieses Gutachten erhalten und bekommt je Befund einen Vermerk **Behandlung**.

## Gesamturteil des Gutachters

**Hält mit Auflagen.** Die Statik ist korrekt aus den Quellen abgeleitet, §8.6 und §7.6 sind sauber gebaut. Als Bauvorlage trug die geprüfte Fassung noch nicht: Der mit dem ersten Gutachten neu eingeführte Reparaturweg §4.6 greift für den Fall, für den er existiert, nicht; er kollidiert mit einer Regel desselben Paragraphen; und einer der drei von M0.3 verlangten Tests war nicht schreibbar.

Der Gutachter hat vier schwerwiegende, dreizehn mittlere und neun kleine Befunde erhoben und drei Befunde des ersten Gutachtens entgegen deren Vermerk als nicht geschlossen bezeichnet.

## Schwerwiegend

| Nr. | Paragraf | Befund | Behandlung |
|---|---|---|---|
| G1 | §5.4.3 gegen §8.6.1 Regel 4 | Der Vergleich setzt an `shareOffset` an und sieht deshalb nur das Fenster seit dem letzten Offset-Commit — nie die Dateimitte, wo die Beschädigung sitzt, die beim Leser die Quarantäne auslöst. Ausgang B tritt nie ein, das Ersatzsegment wird nie geschrieben. *Schaden:* Ein gekipptes Byte setzt alle Leser dauerhaft in Quarantäne; der einzige Reparaturweg wird nie erreicht | **Geschlossen.** Der Befund trifft zu und war der schwerste des Durchgangs — der Reparaturweg war für seinen einzigen Anwendungsfall unerreichbar. Neu ist §4.6.1 mit zwei Auslösern: eine Vollprüfung der eigenen Share-Segmente beim Öffnen (Grundlast, immer vorhanden, bezahlbar weil ohnehin alle fremden Dateien vollständig gelesen werden) und als Beschleuniger ein Hinweis des Lesers über dessen eigene Präsenzdatei. Der zweite Auslöser bleibt im Rahmen von §6.4: Fällt die Präsenz aus, heilt der erste dieselbe Beschädigung, nur später. Kosten als A10 zur Messung vorgemerkt |
| G2 | §4.6 gegen §8.2 | Die wiederholten Zeilen tragen zwangsläufig ein anderes `vorgaenger`; „Inhalt" ist nirgends definiert. Damit ist jede wiederholte Zeile für einen gesunden Leser „dieselbe Identität mit anderem Inhalt" und nach §8.2 ein Defekt. *Schaden:* Der Reparaturweg setzt genau die Leser in Quarantäne, die vorher gesund waren | **Geschlossen, wie vorgeschlagen.** §4.6 definiert „Inhalt" verbindlich als Ereignisrahmen **ohne** `vorgaenger` und nennt die vier Stellen, an denen die Definition gilt. §2.3 hat einen dritten Sonderfall für die erste Zeile eines Ersatzsegments bekommen; ohne ihn hätte zusätzlich die Kettenprüfung angeschlagen |
| G3 | §4.6 | Die lokale Seite der Reparatur fehlt. Bleibt lokal alles im alten Segment, ist die Präfix-Invariante verletzt und §4.5 Schritt 4 löst den Klon-Falschalarm aus — dieselbe Fehlerklasse, die S1 beseitigt hat | **Geschlossen.** §4.6 hat einen Abschnitt „Die lokale Seite" mit vier Schritten samt Fortschreibung von `schreiber.json` und `upload-state.json`. Die Invariante gilt weiter, weil sie Präfix verlangt und nicht Gleichheit |
| G4 | §4.5 | Beim geklonten Profil ist offen, ob die mitgenommenen Ereignisse ihre Identität behalten, welche Laufnummer unter der neuen Kennung gilt und wie die lokalen Spiegeldateien heißen. *Schaden:* Der Test „geklontes Profil" aus der DoD von M0.3 hat kein Sollergebnis | **Geschlossen, in der vom Gutachter vorgeschlagenen Richtung.** §4.5 legt die Reaktion in sechs Punkten fest: Identität bleibt, Laufnummer läuft fort, die neue Datei darf Zeilen mit fremdem `id`-Präfix enthalten, die alte Kennung bleibt in `schreiber.json` als `frühereClientIds`. Ausgang C und Schritt 2 stellen jetzt auf die **Datei** ab, nicht auf das `id`-Präfix |

## Mittel

| Nr. | Paragraf | Befund | Behandlung |
|---|---|---|---|
| G5 | §6.2 | Die Zusage „bis zu 10 Sekunden" folgt nicht aus dem Takt, sie wird gerissen: Cache und Poll-Takt addieren sich, dazu der nirgends erwähnte `FileNotFoundCacheLifetime` von 5 s | **Geschlossen, mit einer Korrektur, die über den Vorschlag hinausgeht.** Takt B von 10 s auf 4 s. Vor allem aber: Die frühere Herleitung ist im Text ausdrücklich als falsch und **zugunsten des eigenen Entwurfs falsch** benannt. Die Zusage wird nicht mehr behauptet, sondern als offen geführt (A9); ergibt M0.5 mehr als 10 s, ist 02-ZIELBILD.md Nr. 6 zu korrigieren — Entscheidung Johannes, nicht der Speicherschicht |
| G6 | §7.5 Prüfung 3 | Der Kettenvergleich ist nicht ausführbar: `upload-state.json` führt je Datei nur **eine** Kette, die am aktuellen Offset; der Schnappschuss nennt einen älteren | **Geschlossen, erste vorgeschlagene Variante.** §5.3 führt `stuetzstellen` als Liste `{offset, kette}`, angelegt beim Schreiben eines Schnappschusses, höchstens drei je Datei. Die Prüfung bleibt damit ohne jeden Dateizugriff ausführbar |
| G7 | §5.4.4 gegen §4.2 | „ein Segment wird erst begonnen, wenn das vorhergehende vollständig übertragen ist" widerspricht dem eigenen ersten Halbsatz und §4.2 | **Geschlossen, wie vorgeschlagen.** Die Regel betrifft nur die Reihenfolge der Spiegelung; das Beginnen hängt allein an der Größenschwelle. Sonst wüchse ein Segment während eines NAS-Ausfalls unbegrenzt |
| G8 | §5.4.2, §6.2 | Die tragendste Annahme des Lesepfads wird als Beleg aus Recherche §1.2 zitiert; dort steht sie nicht, sie ist eine Ableitung der Recherche in §4 | **Geschlossen.** Beide Stellen kennzeichnen sie jetzt als Ableitung und verweisen auf A5 — dieselbe Belegdisziplin, die §2.2 bei `fsync` anwendet |
| G9 | §7.5 | „unter 500 ms bei 50.000 Ereignissen" misst die Faltung, nicht den Erstlauf; das I/O dominiert | **Geschlossen.** Der Text sagt jetzt, dass die Zahl allein die Faltung schätzt, dass der Erstlauf mehr umfasst und dass die Bezahlbarkeit daraus **nicht** ableitbar, sondern zu messen ist |
| G10 | §6.4 gegen §7.5, §8.6.2 | Der S5-Beschluss hat die zweite in §6.4 genannte Quelle entwertet: fremde Schnappschüsse werden nicht mehr gelesen | **Geschlossen, wie vorgeschlagen.** §7.5 trennt Fold-Pfad und Diagnose: `s1 akte pruefe` und §8.6.2 dürfen fremde Schnappschüsse lesen, aber nur, welche Dateien und Offsets sie nennen — nie den Zustand |
| G11 | §5.7 | Der Marker kann nach einer Rücknahme wieder auferstehen, weil ein Client, der die Rücknahme noch nicht kennt, ihn neu anlegt | **Geschlossen, wie vorgeschlagen.** Zwei Regeln, beide allein auf den gefalteten Zustand gestützt: anlegen nur bei archiviertem Zustand, vorgefundenen Marker löschen, wenn der eigene Fold sein `ereignis` als zurückgenommen kennt |
| G12 | §4.4 | „auf einem lokalen Dateisystem der übliche, atomare Weg" — die Recherche §1.4 widerspricht dem für Windows ausdrücklich, und `schreiber.json` trägt die Laufnummer | **Geschlossen, erste vorgeschlagene Variante.** Der Atomaritätsanspruch ist gestrichen; `schreiber.json` ist rekonstruierbar ausgelegt (Laufnummer als höchste im lokalen Segment plus eins). Die Rekonstruktion kann eine Lücke erzeugen, die §3.3 erlaubt, nie einen Rückschritt |
| G13 | §5.2 gegen A1 | Das Kostenmodell rechnet mit einem `fsync` je Ereignis, der Schreibweg verlangt zwei bis drei | **Geschlossen.** §5.2 legt fest: genau ein `fsync` je Ereignis, weil `schreiber.json` nach §4.4 rekonstruierbar ist und deshalb ohne `fsync` geschrieben wird. Die Messung in M0.5 misst den vollständigen Weg |
| G14 | §3.2 | Zählerüberlauf ist nur für den Schreibpfad geregelt; die Empfangsregel kann sieben Stellen erzeugen und bricht die lexikografische Sortierung | **Geschlossen, wie vorgeschlagen** |
| G15 | §6.6 | `fsync` ist nur für Windows/SMB begründet; auf macOS erfüllt `fsync(2)` die lokale Dauerhaftigkeitszusage nicht, dafür ist `F_FULLFSYNC` nötig | **Geschlossen.** §6.6 verlangt `F_FULLFSYNC` für den lokalen Anhang auf macOS und schreibt vor, eine schwächere Zusage im Messprotokoll zu vermerken statt sie hinzunehmen |
| G16 | §7.6 | Ruhephase Punkt 2 ist für Dateien, die nach §6.2 in Takt B zurückgefallen sind, weder erfüllbar noch falsifizierbar | **Geschlossen, wie vorgeschlagen** |
| G17 | §5.7 gegen 02-ZIELBILD Nr. 10 | Die Abweichung ist begründet, aber die verbindliche Quelle sagt weiterhin „Archivierung über `archiv.marker`" | **Teilweise — der Konflikt ist benannt, nicht aufgelöst.** §5.7 führt die Abweichung ausdrücklich als einzige des Dokuments von den zehn tragenden Festlegungen und nennt, was nachzuziehen ist. 02-ZIELBILD.md Nr. 10 und das dortige Layout sind **nicht** geändert: Die Quellen 3 bis 6 sind für diese Überarbeitung verbindlich und werden nicht neu diskutiert. **Offen für Johannes** |

## Klein

| Nr. | Befund | Behandlung |
|---|---|---|
| K-a | `<hlc>-<clientId>.json` führt die Kennung doppelt, weil die HLC-Textform bereits darauf endet; zugleich uneinheitlich zu `clientId8` in §4.1 | **Geschlossen.** Name auf `<hlc>.json` verkürzt; der Unterschied zwischen voller und gekürzter Kennung ist begründet (Namenslänge zählt dort, wo sie in jedem Zyklus in einer Antwort steht) |
| K-b | „nach kurzer Wartezeit" ist die letzte unbezifferte Zahl | **Geschlossen.** 250 ms, in §10 geführt |
| K-c | Die Menge der gesehenen Ereignis-Identitäten ist nirgends verortet; ohne sie greift die zweite Verteidigungslinie nach jedem Neustart nicht | **Geschlossen.** §5.3 legt fest, dass sie beim Öffnen aus dem lokalen Spiegel aufgebaut wird — der nach §5.5 genau die geprüften Zeilen enthält |
| K-d | Der Startwert Takt A verletzt die eigene neue Regel an der zulässigen Grenze | **Geschlossen, mit ausdrücklicher Vorrangregel.** §6.2 sagt, dass der Startwert nur bis 1,5 s gemessener Kosten regelkonform ist und dass bei mehr die Regel gilt, nicht der Startwert |
| K-e | §4.5 prüft nur das eigene **letzte** Segment; ein Klon mit höherer Segmentnummer bleibt unerkannt | **Geschlossen, wie vorgeschlagen** |
| K-f | „es gibt nur diese eine Regel" — die vorläufige Quarantäne geht darin nicht auf | **Geschlossen**, Formulierung berichtigt |
| K-g | Nirgends steht, dass Fold und Einsatztagebuch `SegmentAbgeschlossen` und `SegmentErsetzt` ignorieren | **Geschlossen.** §2.4 führt sie als Verwaltungsereignisse; der Bezug zur Zusage aus M3.3 ist benannt |
| K-h | Groß- und Kleinschreibung der Kettenprüfsumme nicht festgelegt | **Geschlossen**, Kleinbuchstaben wie `crc32` |
| K-i | §9 Zeile 15 beansprucht, die Störungen aus M0.4 seien „einzeln benannt" — vier davon nicht | **Geschlossen.** Die Zeile listet jetzt getrennt, was behandelt ist, was zusätzlich behandelt ist und welche drei Störungen M0.4 injizieren muss, ohne dass dieses Dokument mehr hergibt als „müssen folgenlos bleiben" |

## Die drei Tests aus der DoD von M0.3

| Test | Urteil des Gutachters | Behandlung |
|---|---|---|
| Abgeschnittene Zeile | Schreibbar. Es fehlt allein eine injizierbare Zeitquelle für die Fünf-Minuten-Frist | **Geschlossen.** §8 legt einleitend fest, dass **alle** Fristen und Takte des Dokuments ihre Zeit aus einer injizierbaren Quelle beziehen und die Speicherschicht keine Uhr unmittelbar aufruft |
| Neustart mitten im Segment | Hauptpfad vollständig. Nicht schreibbar war der Teilfall „Absturz zwischen Abschlusszeile und erster Zeile des Folgesegments": Reihenfolge und Bestimmung des laufenden Segments ungeregelt | **Geschlossen.** §4.3 legt die Reihenfolge in vier Schritten fest und bestimmt das laufende Segment aus dem lokalen Dateibestand, nicht aus `schreiber.json` — damit ist jeder Unterbrechungspunkt eindeutig |
| Geklontes Profil | Nicht schreibbar: Die Erkennung ist präzise, die Reaktion nicht | **Geschlossen** über G4 |

## Messbarkeit des Abbruchkriteriums von M0

Der Gutachter hat das Kriterium in drei Teile zerlegt.

| Teil | Urteil | Behandlung |
|---|---|---|
| Konvergenz per Hash nach jeder Ruhephase | Messbar; §7.6 sauber gebaut. Einschränkungen: Ruhephase-Punkt 2 (G16) und die Frage, ob „identische Versionsvektoren" auch identische Dateimengen verlangt | **Geschlossen.** G16 behoben; §7.6 sagt jetzt ausdrücklich, dass ein Client ohne Kenntnis einer Datei keinen kleineren, sondern gar keinen Wert hat und damit einen verschiedenen Versionsvektor führt |
| Lokales Log gleich Share-Segment je Client | Nur mittelbar messbar; für fremde Dateien ist der Spiegel ausdrücklich kein Abbild | **Geschlossen.** §7.6 stellt klar, dass dieser Teil die **eigenen** Segmente unter Ruhephase-Bedingung 1 meint, und warum er für fremde Dateien nicht gelten kann |
| Sichtbarkeitslatenz p95 | **Nicht messbar**: keine Messpunkte, keine Zusage für den häufigen Fall, und die eine vorhandene Zusage wird gerissen | **Geschlossen.** Der neue §6.7 legt die Messpunkte fest (lokaler `fsync` beim Schreiber bis Übernahme in den Spiegel des Lesers) und trennt zwei Fälle mit eigenen Zusagen: neue Zeile in bekannter Datei p95 unter 5 s (erstmals beziffert), erste Datei eines neuen Clients nach A9 offen |

## Befunde des ersten Gutachtens, die der zweite Prüfer als nicht geschlossen ansah

| Befund 01 | Einwand des zweiten Prüfers | Behandlung |
|---|---|---|
| S2 | Der Reparaturweg wird nie ausgelöst und wäre schädlich, wenn er ausgelöst würde | **Zutreffend, jetzt geschlossen** über G1 bis G3 |
| K4 | Der Vermerk „kommt ohne jeden Dateizugriff aus" ist sachlich falsch, weil die Werte nur für den aktuellen Offset vorliegen | **Zutreffend, jetzt geschlossen** über G6. Der Vermerk in Gutachten 01 ist entsprechend berichtigt |
| M1 | Der S5-Beschluss hat die zweite in §6.4 genannte Quelle entwertet | **Zutreffend, jetzt geschlossen** über G10 |
| S6 | Nur einer von drei Teilen des Abbruchkriteriums war gelöst | **Zutreffend, jetzt geschlossen** über G16 und §6.7 |
| K3 | Die neue Regel widerlegt den eigenen Startwert | **Zutreffend, jetzt geschlossen** über K-d |
| M8 | Die Cache-Seite ja, die Dauerhaftigkeitsseite nein | **Zutreffend, jetzt geschlossen** über G15 und G12 |
| K1 | Eine unbezifferte Zahl war übrig | **Zutreffend, jetzt geschlossen** über K-b |

## Was der Gutachter als tragend bezeichnet hat und erhalten bleiben muss

§5.4.1 samt Präfix-Invariante · §5.4.2, das Verbot der Größenabfrage samt Begründung · §5.4.3, besonders der Absatz „Der Zweifel geht zugunsten der Reparatur aus" · §2.1, der CRC über `<länge> \t <json>`, und die vier Regeln in §8.2 · §2.2, Absatz „Ausdrücklich nicht behauptet" und die Trennung belegt/abgeleitet bei `fsync` · §8.6.1 und §8.6.2 insgesamt, besonders Regel 3 · §7.6 als Ganzes · §7.5, „Warum keine fremden Schnappschüsse" und die vierte Annahmebedingung · §8.8 und §8.9 · §3.2, „Die eigene Uhr darf rückwärts springen, die HLC nicht" und „Was die Nichtübernahme kostet" · §6.6 samt der Neuöffnungsregel · §10, die vollständige Startwerttabelle.

## Was nach dieser Überarbeitung offen bleibt

- **G17:** 02-ZIELBILD.md Nr. 10 sagt weiterhin „Archivierung über `archiv.marker`". Nachzuziehen, Entscheidung Johannes.
- **A9:** Ob die Zusage „bis zu 10 Sekunden für die erste Datei eines neuen Clients" haltbar ist, ist offen und wird von diesem Konzept nicht behauptet. Ergibt M0.5 mehr, ist die Zusage im Zielbild zu korrigieren — Entscheidung Johannes.
- **A7 und A10:** Erstlauf ohne fremde Schnappschüsse und Vollprüfung beim Öffnen sind als bezahlbar angenommen, nicht gemessen.
- Eine dritte unabhängige Prüfung hat nicht stattgefunden. Die Behandlung der Befunde G1 bis G17 ist ungeprüft.
