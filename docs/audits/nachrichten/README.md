# Nachrichten: Befunde der fünf Rollen-Audits und ihr Stand

Stand: main be6f9b9, 2026-11-17.

Fünf Rollen haben die Funktion „Nachrichten“ (4-fach-Vordruck) am 17.11.2026 gegen die laufende Web-Schale geprüft: Sachgebietsleiter S3, Leiter des Fernmeldebetriebes, Fernmelder, Sichter und ETB-Führer. Jede Rolle fuhr mit Playwright (Chromium, Viewport 1320 x 860) in eigenen Browser-Kontexten je Arbeitsplatz, in einem eigenen Einsatz auf dem gemeinsamen Share. Vier Audits prüften den Stand 15ecdbd, das Sichter-Audit den Stand dee1f01. Anders als die code- und dokumentationsbasierten Audits in `docs/audits/README.md` beruhen diese Befunde auf Beobachtung an der laufenden Anwendung; Fundstellen im Quelltext belegen die Ursachen. Bewertet wurde, was die Rolle am Arbeitsplatz erlebt; Annahmen stehen in den Einzeldokumenten als solche. Die Station LdF und die rote und grüne Kopie beim Ausgang waren beim Prüfen im Bau und sind in den meisten Audits nicht bewertet.

Dieses Dokument ordnet jedem Befund einen Status nach den Behebungs-Commits 57699bb (Domäne), 5418687 (Ausgaben), 46c65ac (Kontrakt), 9bbe3fe (Worker), d36d287 (Renderer), d394e34 (Testschritt) und be6f9b9 (Dokumentation) zu. Der Status stammt aus den Commit-Texten und dem Umsetzungsbericht (`docs/v2/entwurf/nachrichten/UMSETZUNGSBERICHT.md`) und wurde stichprobenartig im Code gegengeprüft: Die behobenen Befunde tragen im Quelltext meist Kommentare mit der Kennung und in den Tests Beschreibungen wie „LdF P0-1“ oder „ETB P0-2“ (zum Beispiel `Nachrichtenaudit.test.tsx`, `Sichteraudit.test.tsx`, `szenarien-nachrichtenbefunde.test.ts`, `nachrichten-befunde.test.ts`, `listen.test.ts`). Die Spalte „Beleg“ sagt, worauf der Status beruht. „Code und Test“ heißt, dass ich Kommentar und Test gefunden und gelesen habe, ohne die Tests selbst auszuführen. „Code“ heißt, dass die Umsetzung im Quelltext zu sehen ist, ein eigener Test aber nicht gesichtet wurde. „Commit-Text“ heißt, dass ich den Status nur aus dem Commit oder dem Bericht übernommen habe. „Kein Treffer“ heißt, dass die Suche nach Kennung, Funktion oder Begriff nichts ergab; ein offener Befund ist damit aus dem Fehlen von Spuren geschlossen und nicht durch einen Lauf der Anwendung bestätigt. Es lief keine Instanz, und es wurde nichts committet.

## Die Audits in Zahlen

| Datei | Rolle | P0 | P1 | P2 | P3 | Befunde |
| --- | --- | --- | --- | --- | --- | --- |
| reviewer-sachgebietsleiter.md | Sachgebietsleiter S3 (SGL) | 1 | 6 | 8 | 5 | 20 |
| reviewer-ldf.md | Leiter des Fernmeldebetriebes (LdF) | 2 | 4 | 6 | 4 | 16 |
| reviewer-fernmelder.md | Fernmelder (FM) | 0 | 6 | 11 | 7 | 24 |
| reviewer-sichter.md | Sichter | 3 | 5 | 5 | 4 | 17 |
| reviewer-etb-fuehrer.md | ETB-Führer (ETB) | 3 | 7 | 7 | 5 | 22 |
| Summe |  | 9 | 28 | 37 | 25 | 99 |

Das ETB-Audit nennt im Kopf vier P3-Befunde, führt aber fünf aus; gezählt sind die fünf ausgeführten. Die P1-Nummerierung des SGL-Audits beginnt bei P1-2 und läuft durch alle Stufen weiter bis P3-20, die Kennungen folgen dem Dokument.

## Stand je Audit

| Rolle | behoben | teilweise | offen | bewusst nicht | nicht prüfbar |
| --- | --- | --- | --- | --- | --- |
| SGL | 7 | 1 | 11 | 1 | 0 |
| LdF | 8 | 1 | 7 | 0 | 0 |
| FM | 10 | 2 | 12 | 0 | 0 |
| Sichter | 10 | 1 | 6 | 0 | 0 |
| ETB | 9 | 5 | 7 | 1 | 0 |
| Summe | 44 | 10 | 43 | 2 | 0 |

Auf die P0-Befunde bezogen: Alle neun P0-Befunde sind behoben (SGL P0-1, LdF P0-1 und P0-2, Sichter P0-1 bis P0-3, ETB P0-1 bis P0-3). Das Fernmelder-Audit hat keinen P0.

## Befunde, die mehrere Rollen unabhängig gefunden haben

Die FmZ-Warteschlange und der Ausgang führten eine Nachricht in den Zustand „erledigt“, sobald sie befördert war, auch wenn sie nie angenommen und nie nummeriert wurde. Der LdF fand das als Lücke im Betriebsbuch (LdF P0-1), der Sachgebietsleiter als irreführende Auskunft an den Verfasser (SGL P0-1, P1-6), der Fernmelder als unsichtbaren Zustand „befördert, nicht nachgewiesen“ (FM P2-10), der ETB-Führer in Gestalt der Nachrichten ohne Nummer beim Beenden (ETB P1-6). Behoben mit 57699bb (Laufstand, Vermerke in der Zeile), 9bbe3fe (Befördern trägt Annahme und Nummer nach) und d36d287 (Karte „Ohne Nummer“, zweiter Klick).

Die Zwanzig-Minuten-Marke zählte erst ab der Annahme und schwieg damit genau bei einem Rückstau. Gefunden vom LdF (P0-2, P1-4) und vom Fernmelder (P1-5). Sie läuft seit 57699bb ab dem Eintreffen bei der FmZ; der Fernmelder bekommt für Blitz und Sofort im Ausgang einen Ton (9bbe3fe).

Eine gesichtete Nachricht ließ sich nicht nachsichten, und der Verteiler war damit nicht korrigierbar. Gefunden vom Sichter (P0-1) und vom ETB-Führer (P1-2); die Nachsichtung gibt es seit d36d287, nur die ETB-Nummer in Feld 20 fehlt noch.

Das bloße Ansehen eines fremden Posteingangs schrieb Kenntnis für diese Stelle. Gefunden vom Sichter (P0-2) und vom ETB-Führer (P2-5), vom Sachgebietsleiter als Doppelklickproblem (P2-12). Die Kenntnis gilt seit d36d287 nur für Stellen der eigenen Sitzung; Öffnen gleich Kenntnis bleibt.

Die Anschrift floss nicht in den Verteiler und wurde nicht zur grünen Hauptempfängerkopie. Gefunden vom Sachgebietsleiter (P1-3) und vom Fernmelder (P1-4); behoben mit d36d287.

Esc verwarf einen halb getippten Vordruck ohne Rückfrage, gefunden vom Sachgebietsleiter (P1-5) und vom Fernmelder (P1-3); behoben mit d36d287.

Die Nachweisung ließ Mittel und Gegenstelle aus und zeigte Zeiten anders als der Ausdruck. Gefunden von LdF (P1-3), Fernmelder (P2-7) und ETB-Führer (P2-6); behoben mit d36d287 und 5418687.

Lücken und fehlende Nummern in der Nachweisung blieben unbemerkt: LdF (P1-2, P2-2), ETB-Führer (P2-2), Sachgebietsleiter (P1-6). Band und Nachweisung nennen sie seit 57699bb und 5418687, nur die Rückfrage bei einem großen Nummernsprung fehlt.

Der Sperrhinweis nannte den Arbeitsplatz statt der Person: Fernmelder (P2-5) und Sichter (P2-4). Behoben mit d36d287. Ebenso fehlte eine Sicht auf das, was für die eigene Stelle offen ist oder schon gesichtet wurde (SGL P1-7, Sichter P1-5, ETB P1-6); behoben mit 57699bb und d36d287.

Offen sind drei Befunde, die ebenfalls mehrere Rollen fanden. Die Zeitzone der Datum-Zeit-Gruppe (fest Berlin) gegen die Rechnerzeit in Kopf, Tagebuch und Eingabefeldern fanden SGL P3-16, ETB P2-1, LdF P2-4 und FM P2-1. Der späte Wechsel zum Ersatzsichter und die nachlaufende Präsenz fanden Sichter P1-4 und P3-4 und ETB P3-3. Die Beschriftung „Nr. (E)“ bei gemeinsamer Zählung nannten LdF P3-1 und ETB P3-2.

## Alle Befunde mit Status

Spalte „Commit“: der Commit, der den Befund schließt oder verkleinert. Wo ein Befund mit einem Befund einer anderen Rolle zusammenfällt, steht das in der Spalte „Beleg und Anmerkung“.


### P0 – einsatzkritisch

| Kennung | Kurztitel | Status | Commit | Beleg und Anmerkung |
| --- | --- | --- | --- | --- |
| SGL P0-1 | Ausgang meldet „erledigt“ bei nur befördert, ohne Zeit und Nummer | behoben | 57699bb, d36d287 | Code und Test: Laufstand je Zeile, Stand aus den Vermerken. Auch LdF P0-1. |
| ETB P0-1 | Tagebuchzeile und Nachricht nur über Text verbunden | behoben | 57699bb, 46c65ac, d36d287 | Code und Test (nachrichtId, Filter, Ruf nachrichtAnfordern, Knopf „Nachricht öffnen“). |
| ETB P0-2 | Berichtigungen nicht erkennbar, Nummer ist die von heute | behoben | 57699bb | Code und Test (Nummer zur Zeit des Ereignisses, „jetzt E 3“, Filter schließt Berichtigung und Zurückziehen ein). |
| ETB P0-3 | Gedrucktes Tagebuch mit wechselnder Zeit, nicht chronologisch | behoben | 5418687 | Code und Test (listen.test.ts): zwei Zeiten, laufende Nummer, Hz., Rechner, Abschlusszeile. |
| LdF P0-1 | Befördern ohne Annahme und Nummer lässt Nachricht aus der Warteschlange fallen | behoben | 9bbe3fe, 46c65ac, d36d287 | Code und Test (Folgewert Annahme, zweiter Klick „Trotzdem ohne Nummer“, Karte „Ohne Nummer“). Auch SGL P0-1, P1-6. |
| LdF P0-2 | Zwanzig-Minuten-Regel misst nur angenommene Nachrichten | behoben | 57699bb | Code und Test (Schwelle ab Eintreffen, Wartezeit in der Zeile). Auch FM P1-5. |
| Sichter P0-1 | Gesichtete Nachricht lässt sich nicht nachsichten | behoben | d36d287 | Code und Test (Sichteraudit.test.tsx). Auch ETB P1-2. |
| Sichter P0-2 | Ansehen eines fremden Posteingangs quittiert für die Stelle | behoben | d36d287 | Code und Test. Auch ETB P2-5. |
| Sichter P0-3 | Zwei Sichter: Verteiler geht still verloren | behoben | fa7abbb (vorher), d36d287 | Code und Test (Vereinigung der Verteiler, Laufzettel bleibt offen mit Meldung). |

### P1 – hoch

| Kennung | Kurztitel | Status | Commit | Beleg und Anmerkung |
| --- | --- | --- | --- | --- |
| SGL P1-2 | Kein stabsinterner Weg, S3 an S4 läuft über die FmZ | offen | – | Kein Treffer im Code; „Weiterleiten“ erzeugt weiter einen Ausgang. |
| SGL P1-3 | Anschrift wird nicht in den Verteiler übernommen | behoben | d36d287 | Code und Test. Auch FM P1-4. |
| SGL P1-4 | Handzeichen und Absender keine Pflicht, eigene Stelle unsichtbar | behoben | d36d287 | Code und Test (Pflichtfelder, „ohne Stelle“ in der Statuszeile). Auch ETB P1-4. |
| SGL P1-5 | Esc verwirft angefangenen Vordruck ohne Rückfrage | behoben | d36d287 | Code und Test. Auch FM P1-3. |
| SGL P1-6 | Nachrichten verlassen die FmZ-Warteschlange ohne Nummer | behoben | 9bbe3fe, d36d287 | Code und Test: Befördern trägt Annahme und Nummer nach, Karte „Ohne Nummer“. Auch LdF P0-1, P1-2, FM P2-10. |
| SGL P1-7 | Keine Sicht „offen“, Zähler zählt Erledigtes mit | behoben | 57699bb, d36d287 | Code und Test (offenFuerStellen, Sichten „offen“ und „gesichtet“). Auch Sichter P1-5, ETB P1-6. |
| ETB P1-1 | Ausgang: rote Kopie fehlt bei S2 | behoben | fa7abbb (vor den sieben Commits) | Im Befund „in Arbeit“; Kopien nach der Beförderung in worker/laufwegfolgen.ts gesehen, eigener Test nicht geprüft. |
| ETB P1-2 | Nachsichten und Vermerke nach Sichtung nicht erreichbar, Feld 20 | teilweise behoben | d36d287 | Nachsichtung in der Oberfläche (Code und Test, = Sichter P0-1); ETB-Nummer in Feld 20 nicht belegt. |
| ETB P1-3 | Berichtigen nur bei doppelter Nummer, Zurückziehen ohne Grund im Blatt | teilweise behoben | d36d287 | Knopf „Berichtigen“ bei jeder vergebenen Nummer (Code); Grund steht im Tagebuch. Berichtigung anderer Felder und Stempel im Vordruck nicht belegt. |
| ETB P1-4 | Absender kann leer bleiben | behoben | d36d287 | Code und Test (Absender Pflicht). |
| ETB P1-5 | Akte nimmt Nachrichten-PDFs nur nach manueller Erzeugung mit | behoben | 9bbe3fe | Code und Test (aktenbeilagen.ts); PDF der Listen bleibt Desktop-Sache. |
| ETB P1-6 | „Einsatz beenden“ nennt offene Nachrichten nicht | behoben | 46c65ac, 9bbe3fe, d36d287 | Code und Test (offeneNachrichten im Lagebild, Abschlussmaske). |
| ETB P1-7 | Akteur „Arbeitsplatz“, Handzeichen nur im Satz | teilweise behoben | 57699bb, 5418687 | Handzeichen je Ereignis, im Druck Akteur, Hz. und Rechner (Commit-Text, tagebuch.ts); Anzeigename „Arbeitsplatz“ unverändert. |
| LdF P1-1 | Station LdF fehlt | behoben | e32c39b, fa7abbb (vor den sieben Commits) | Im Befund „in Arbeit“; Sicht „ldf“ und Laufwegfolgen im Code gesehen, nicht im Einzelnen geprüft. |
| LdF P1-2 | Eingang ohne Nummer läuft zum Sichter, Lücke fällt nicht auf | teilweise behoben | 57699bb, d36d287 | Marke „ohne Nummer“, Zähler und Karte (Code); Rückfrage beim Aufnehmen ohne Nummer nicht belegt. |
| LdF P1-3 | Nachweisung ohne Mittel und Gegenstelle | behoben | d36d287, 5418687 | Code und Test. Auch FM P2-7, ETB P2-6. |
| LdF P1-4 | Ohne Wartezeit und Zähler keine Beurteilung der Belastung | behoben | 57699bb, d36d287 | Code und Test (Schwelle im Kopf der Warteschlange, Wartezeit, weitere Zahlen im Band). |
| FM P1-1 | Getippte Funkzeit hängt sich an die Vorbelegung an | behoben | d36d287 | Code und Test (select() beim Fokus). |
| FM P1-2 | Aufnahmemaske ohne Tastaturbestätigung, 18 Tabulatorschritte | behoben | d36d287 | Code und Test (Strg+Enter, Tabfolge). |
| FM P1-3 | Esc verwirft halb getippten Funkspruch | behoben | d36d287 | Code und Test. Auch SGL P1-5. |
| FM P1-4 | Ersatzsichter verteilt nur an S2, Anschrift keine Kopie | behoben | d36d287 | Code und Test (grün vorbelegt, Warnung ohne Hauptempfänger). Auch SGL P1-3. |
| FM P1-5 | Blitz oder Sofort im Ausgang ohne Signal, Marke erst ab Annahme | behoben | 57699bb, 9bbe3fe | Code und Test (Ton bei der FmZ, Schwelle ab Eintreffen). Auch LdF P0-2. |
| FM P1-6 | Papier-Rückfall in der Web-Schale: leerer Vordruck nur als HTML | offen | – | Kein Treffer; der leere Nachrichtenvordruck als PDF entsteht im Main (druckausgang.ts). |
| Sichter P1-1 | Eingang mit Vorrang wird dem Sichter nicht gemeldet | behoben | 9bbe3fe | Code und Test (szenarien-fmz-audit.test.ts). |
| Sichter P1-2 | Inhalt beim Sichten nicht lesbar | behoben | d36d287 | Code und Test (Eingangszeit und Inhalt im Laufzettel). |
| Sichter P1-3 | Mahnung „Nicht jeder alles“ nicht unterstützt | teilweise behoben | d36d287 | Warnung ohne Hauptempfänger (Code und Test); Vorschlag „zuletzt gleiche Absender“ und Empfängerzahl nicht belegt. |
| Sichter P1-4 | Wechsel zum Ersatzsichter dauert über zwei Minuten, Stau unsichtbar | offen | – | Bekannt offen: hängt an PRAESENZ_VERALTET_MS (Bericht „Zur Kenntnis, nicht geändert“). Auch ETB P3-3, Sichter P3-4. |
| Sichter P1-5 | Keine Ablage „heute gesichtet“ | behoben | 57699bb, 5418687 | Code und Test (Sicht „gesichtet“, Sichtung und Verteiler in der Nachweisung). Auch SGL P1-7. |

### P2 – mittel

| Kennung | Kurztitel | Status | Commit | Beleg und Anmerkung |
| --- | --- | --- | --- | --- |
| SGL P2-8 | Kopiefarbe nur als Rand, kein Wort | behoben | d36d287 | Code und Test (Kopiefarbe als Wort im Stand). |
| SGL P2-9 | Im Ausgang nicht sichtbar, wer gelesen hat | offen | – | Kein Treffer; gesichtetVon nennt den Sichter, nicht die Lesenden. |
| SGL P2-10 | Hinweis nur bei Vorrang, kein Zähler am Reiter, liegt am Seitenende | offen | – | Kein Treffer für einen Reiterzähler; der Hinweis für den Sichter kam mit 9bbe3fe (Sichter P1-1). |
| SGL P2-11 | Sichten auf 860 px zu lang, Verteilermatrix gestreckt | teilweise behoben | d36d287 | Verteilerraster kompakter (Code, Kommentar); Höhe bei 860 px nicht nachgemessen. Auch Sichter P2-1. |
| SGL P2-12 | „Lesen“ setzt Kenntnisnahme sofort, ohne Rücknahme | offen | – | Kenntnis gilt jetzt nur für eigene Stellen (Sichter P0-2); Doppelklick und fehlende Rücknahme unverändert. |
| SGL P2-13 | „Erledigt“ ohne Vermerk, Antwort nicht mit Original verknüpft | offen | – | Kein Treffer; Bezug gibt es nur im Tagebuch (ETB P0-1). |
| SGL P2-14 | Ausgang hängt am Absendertext oder Rechner, nicht an der Stelle | offen | – | Annahme des Audits; istEigenerAusgang nicht als geändert erkennbar. |
| SGL P2-15 | Nachweisung im Browser nur als HTML | bewusst nicht | – | Bericht: PDF der Listen bleibt Sache der Desktop-Schale; die Akte legt die Nachweisung als HTML bei (9bbe3fe). Audit selbst: kein Mangel bei Desktop-Einsatz. |
| ETB P2-1 | Zeit im Tagebuch ohne Jahr, Browserzone, nicht Datum-Zeit-Gruppe | offen | – | Bekannt offen, siehe SGL P3-16. |
| ETB P2-2 | Vollständigkeit der Nummernfolge nicht geprüft | behoben | 57699bb, 5418687 | Code und Test (nummernluecken, Fuß der Nachweisung). Auch LdF P2-2. |
| ETB P2-3 | Anlagen fehlen | bewusst nicht | – | Bericht: Anhänge nicht gebaut, Audit selbst „später“. |
| ETB P2-4 | Tagebuch: 100 Zeilen, keine Nachrichtenfilter, Druck ohne Filter | teilweise behoben | 46c65ac, d36d287 | Filter je Nachricht (Code und Test); Ausschnitt und ungefilterter Druck nicht belegt. |
| ETB P2-5 | Kenntnisnahme durch Öffnen, „erledigt“ ohne Handzeichen | teilweise behoben | d36d287 | Kenntnis nur für eigene Stellen (Code und Test); Öffnen gleich Kenntnis bleibt, Handbuch nicht angepasst. |
| ETB P2-6 | Nachweisung und Tagebuch decken sich nicht in allen Angaben | behoben | d36d287, 5418687 | Code und Test (Mittel, Gegenstelle, Sichtung, Zeitschreibweise). Auch LdF P1-3, FM P2-7. |
| ETB P2-7 | Vordruck-PDF ist Stand zum Druckzeitpunkt | offen | – | Kein Treffer. |
| LdF P2-1 | Berichtigung beginnt mit der falschen Nummer | behoben | d36d287 | Code und Test (nächste freie Nummer vorbelegt). |
| LdF P2-2 | Lücken und Sprünge in der Nummernfolge | behoben | 57699bb, 5418687 | Code und Test; die Rückfrage bei großem Sprung ist nicht belegt. Auch ETB P2-2. |
| LdF P2-3 | Stelle ist Zuschnitt, kein Recht | offen | – | Im Konzept §4 so gewollt; der vorgeschlagene Hinweis in der Maske nicht gebaut. |
| LdF P2-4 | Uhrzeit in vier Zeitzonen-Darstellungen | offen | – | Bekannt offen, siehe SGL P3-16. |
| LdF P2-5 | Betriebsbuch am Schichtende ohne Schicht und Abschluss, Rohtext im Kopf | offen | – | Nachweisung.ts: Fußzeile unverändert; Fuß mit Nummernlücken ist neu, die Schichtabgrenzung nicht. |
| LdF P2-6 | Absender nicht in der Warteschlange | behoben | d36d287 | Code (Fernmeldezentrale.tsx, Kommentar „P2-6“). |
| FM P2-1 | Zeitzone: Funkzeit in Browserzeit gelesen, Gruppe in Berlin | offen | – | Bekannt offen, siehe SGL P3-16. |
| FM P2-2 | Keine Plausibilitätsprüfung der Zeiten | behoben | d36d287 | Code und Test (weiche Warnung bei Zukunft und älter als ein Tag). |
| FM P2-3 | Abfassungszeit und Quittung mit „jetzt“ vorbelegt | offen | – | Kein Treffer. |
| FM P2-4 | Befördern: Feld nennt die Quittung nicht, stille Vorbelegungen | behoben | d36d287 | Code (Beschriftung „Quittung der Gegenstelle“). |
| FM P2-5 | Weiche Sperre nennt Arbeitsplatz, nicht Person | behoben | d36d287 | Code und Test (Stelle und Handzeichen im Sperrhinweis). = Sichter P2-4. |
| FM P2-6 | Konfliktmeldung zeigt Rohdaten, „Neu laden?“ ohne Knopf | offen | – | Kein Treffer. |
| FM P2-7 | Nachweisung ohne Mittel und Gegenstelle, Aufnahme nicht korrigierbar | teilweise behoben | d36d287 | Spalten ergänzt (Code und Test); „Aufnahme ändern“ nicht belegt. |
| FM P2-8 | Maske fängt den Fokus nicht ein, Fokus nach Schließen verloren | offen | – | Bekannt offen (Fokusrücksprung); Tabfolge ist neu, Fokusfalle und Rückgabe nicht. |
| FM P2-9 | Nachtrag eines Ausgangs braucht vier Masken | teilweise behoben | 9bbe3fe | Befördern trägt Annahme und Nummer nach (Test); Nachtragsmodus in einer Maske nicht gebaut. |
| FM P2-10 | „Befördert, aber nicht nachgewiesen“ nirgends sichtbar | behoben | d36d287, 57699bb | Code und Test (Karte „Ohne Nummer“, Marke ohneNummer). |
| FM P2-11 | Falsch getipptes Druckverzeichnis wird still angelegt | offen | – | Bekannt offen: Ruf verzeichnisPruefen existiert nicht (Suche im Code ohne Treffer). |
| Sichter P2-1 | Verteilermatrix entspricht nicht dem Vordruck, wird lang | behoben | d36d287 | Code und Test (Verteilerraster). Auch SGL P2-11. |
| Sichter P2-2 | Druck bildet Farben nicht ab, kein Hinweis auf zu wenig Blätter | offen | – | Kein Treffer. |
| Sichter P2-3 | Gesprächsnotiz: Voreinstellung „Selbst verteilen“ umgeht den Sichter | offen | – | Kein Treffer. |
| Sichter P2-4 | Sperrhinweis nennt nicht, wer sichtet | behoben | d36d287 | Code und Test. = FM P2-5. |
| Sichter P2-5 | Vermerke des Sichters für Empfänger kaum sichtbar | behoben | 57699bb, d36d287 | Code und Test (Vermerk in der Zeile, fmzVermerkText, Tagebuch). |

### P3 – gering

| Kennung | Kurztitel | Status | Commit | Beleg und Anmerkung |
| --- | --- | --- | --- | --- |
| SGL P3-16 | Datum-Zeit-Gruppe in Berliner Zeit, Uhr im Kopf in Browserzeit | offen | – | Bekannt offen. Auch ETB P2-1, LdF P2-4, FM P2-1. |
| SGL P3-17 | „Antworten“ und „Weiterleiten“ ohne Ruf-Nr. und Bezug | offen | – | Kein Treffer. |
| SGL P3-18 | Ausgang zeigt Laufzettel „noch nicht gesichtet“ | offen | – | Kein Treffer. |
| SGL P3-19 | Hinweistext der Gesprächsnotiz sagt „beim Aufnehmen“ | offen | – | Text in worker/nachrichtenfolgen.ts unverändert. |
| SGL P3-20 | Zwei gleiche Nachrichten werden nicht erkannt | offen | – | Kein Treffer. |
| ETB P3-1 | Beschriftung „Zeit der Meldung“ | offen | – | Bildschirm unverändert (Tagebuch.tsx); nur der Druck trennt zwei Zeiten. |
| ETB P3-2 | „Nr. (E)“ bei gemeinsamer Zählung | offen | – | Beschriftung in Vordruckteile.tsx unverändert. Auch LdF P3-1. |
| ETB P3-3 | Präsenz bleibt nach Schließen des Browsers sichtbar | offen | – | Gleiche Ursache wie Sichter P1-4. |
| ETB P3-4 | „Zurückgezogen“ nur durch Durchstreichen | offen | – | Kein Treffer. |
| ETB P3-5 | „Nachweisen“ bei zurückgezogenen Zeilen | offen | – | Kein Treffer. |
| LdF P3-1 | „Nr. (E)“ bei gemeinsamer Zählung | offen | – | Siehe ETB P3-2. |
| LdF P3-2 | Schreibweise der Zeit wechselt | offen | – | Kein Treffer. |
| LdF P3-3 | Stelle wird nach jedem Neuladen erneut abgefragt | offen | – | Kein Treffer; vom Konzept (Entscheidung 3) so gewollt. |
| LdF P3-4 | Hinweisliste wächst, Einführungsband bleibt | offen | – | Kein Treffer. Auch FM P3-7. |
| FM P3-1 | Rückmeldungen nennen die Nachricht nicht | offen | – | Kein Treffer. |
| FM P3-2 | Feld „Uhrzeit“ zeigt sechsstellige Gruppe | offen | – | Kein Treffer. |
| FM P3-3 | Stellenabfrage: FmZ zehntes Kästchen, Profil ändert sich nicht | offen | – | Kein Treffer. |
| FM P3-4 | Schaltflächen brechen um, „Befördern“ auch ohne Annahme Hauptknopf | behoben | d36d287 | Code (Hauptknopf je nach nächstem Schritt); Umbruch bei 1320 px nicht nachgemessen. |
| FM P3-5 | Beschriftung „Gegenstelle“ statt „Rufname der Gegenstelle“ | offen | – | Kein Treffer. |
| FM P3-6 | Verbindungsband ohne Hinweis auf Papier-Rückfall | offen | – | Kein Treffer. |
| FM P3-7 | Hinweiskasten bleibt stehen | offen | – | Kein Treffer. |
| Sichter P3-1 | Quittungszeit beim Öffnen eingefroren | offen | – | Kein Treffer. |
| Sichter P3-2 | Escape hebt Auswahl und Laufzettel zugleich auf | behoben | d36d287 | Code und Test. |
| Sichter P3-3 | S5 fehlt im Verteiler | offen | – | Bekannt offen; S5 nur als Freitext (ausgaben/nachricht.ts). |
| Sichter P3-4 | Zählung „n weitere Arbeitsplätze“ läuft auf | offen | – | Gleiche Ursache wie Sichter P1-4. |

Zahl der Befunde je Status: behoben 44, teilweise behoben 10, offen 43, bewusst nicht 2, nicht prüfbar 0; zusammen 99. Als „nicht prüfbar“ habe ich keinen Befund eingestuft, weil jeder entweder im Code eine Spur hinterlassen hat oder keine hat. Die Tests habe ich nicht ausgeführt; der Bericht nennt für den Stand 331 Testdateien und 3354 Tests, grün, bei typecheck und lint ohne Befund. Das habe ich nur übernommen.

## Was offen bleibt

Am dringendsten ist das, was im Einsatz still etwas Falsches tut. Das ist der Druckordner der Fernmeldezentrale (FM P2-11): Ein falsch getipptes Verzeichnis wird angelegt und als „geschrieben“ gemeldet, der Ausdruck landet dann in einem Ordner, in den niemand schaut. Dafür braucht es einen Ruf `verzeichnisPruefen`, der vor dem Schreiben prüft, ob der Ordner vorhanden ist, und im Probedruck sagt, wo die Datei liegt. Im Code gibt es diesen Ruf noch nicht. Gleich danach kommt der Ersatzsichter (Sichter P1-4, ETB P3-3, Sichter P3-4): Er schaltet erst um, wenn die Präsenz des Sichters verfällt, also nach rund zwei Minuten. Bis dahin liegt ein Blitz im Eingang, und niemand sieht den Stau. Der Weg ist ein bewusstes „Stelle abgeben“ beim Schließen des Sichter-Arbeitsplatzes, das die Präsenz sofort ohne SICHTER schreibt; dazu eine Warnung auf der FmZ („Eingänge warten seit n Minuten“) mit dem Knopf „Ich sichte jetzt selbst“. Diese beiden Punkte sollten vor dem nächsten Einsatz erledigt sein.

Als Zweites ist nachzuweisen, was bisher nur in Tests oder unter Electron gemessen ist. Der stille Druck an einen echten Windows-Drucker ist nicht nachgewiesen (Bericht, „Offen bleibt“); das PDF kommt im unsichtbaren Fenster in der Druckpipeline an, mehr ist nicht belegt. Das gehört an den Arbeitsplatz mit dem Drucker, mit Probedruck und mit einem Automatikdruck bei der Sichtung. Ebenso ist die Laufzettelhöhe bei 860 Pixeln nicht nachgemessen (SGL P2-11, Sichter P2-1): Das Raster ist kompakter, ob „Sichten“ ohne Scrollen erreichbar ist, hat keiner gemessen. Dasselbe gilt für den Zeilenumbruch der Knöpfe in der Warteschlange bei 1320 Pixeln (FM P3-4).

Als Drittes die Zeit. Die Datum-Zeit-Gruppe ist fest Europe/Berlin, Kopf, Tagebuch und Eingabefelder folgen der Rechnerzeit (SGL P3-16, ETB P2-1, LdF P2-4, FM P2-1). Auf einem Rechner mit deutscher Zeitzone fällt das nicht auf; auf einem Notebook mit falscher Zone liegen Bildschirmzeiten eine Stunde neben den Zeiten des Vordrucks. Die kleinste wirksame Lösung ist, Kopf und Hilfszeilen in derselben Zone zu zeigen und bei abweichender Rechnerzeit einen Hinweis zu geben; sie berührt vier Audits auf einmal und sollte vor den P3-Beschriftungen kommen.

Viertens die Bedienung der Masken: Nach dem Schließen einer Maske springt der Fokus nicht auf den auslösenden Knopf zurück, und die Maske fängt den Fokus nicht ein (FM P2-8); die neue Tabfolge hat das nicht ersetzt. Dazu die offenen Fernmelder-Punkte unter Last: Abfassungszeit und Quittung sind mit „jetzt“ vorbelegt (P2-3), die Konfliktmeldung zeigt Rohdaten (P2-6), der leere Nachrichtenvordruck lässt sich in der Web-Schale nur als HTML holen (P1-6), und der Nachtrag eines Ausgangs vom Papier braucht noch mehrere Masken (P2-9).

Fünftens der Verteiler und die Wege im Stab. S5 fehlt im Verteiler (Sichter P3-3), er ist nur als Freitext ohne Kästchen möglich; ob das gewollt ist, muss die Fachseite sagen. Ein stabsinterner Weg ohne FmZ (SGL P1-2) fehlt; er ist ein Funktionsumfang, kein Fehler, und braucht eine Entscheidung im Konzept, bevor jemand baut. Das gilt auch für den Hinweis bei Rollen ohne Befugnis (LdF P2-3) und für die Zuschnitt-Frage des Ausgangs nach Stelle statt Absendertext (SGL P2-14).

Zuletzt der Rest, der den Nachweis nach dem Einsatz verbessert, aber nichts verhindert: die ETB-Nummer in Feld 20 und der Stempel „zurückgezogen“ mit Grund im Vordruck (ETB P1-2, P1-3, P2-7), die Berichtigung anderer Felder als der Nummer, der Anzeigename „Arbeitsplatz“ im Tagebuch (ETB P1-7), der Schicht- und Abschlusskopf der Nachweisung (LdF P2-5), der Reiterzähler (SGL P2-10) und die Beschriftungen und Hinweistexte der P3-Gruppe. Bewusst nicht gebaut sind Anlagen an Nachrichten (ETB P2-3) und das PDF der Listen in der Web-Schale (SGL P2-15); beides steht im Umsetzungsbericht.
