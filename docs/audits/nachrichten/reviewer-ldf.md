# Audit Nachrichten: Leiter des Fernmeldebetriebes (LdF)

Datum: 2026-11-17
Rolle des Prüfers: Leiter des Fernmeldebetriebes in der Fernmeldezentrale einer THW-Führungsstelle (Festlegung des Übertragungsmittels, Weisung im Fernmeldebetrieb, Verantwortung für die Nachweisung, Überwachung der Belastung der FmZ, beim Eingang Station zwischen Fernmelder und Sichter).

## Scope und Methodik

- Geprüft wurde die Funktion „Nachrichten“ (4-fach-Vordruck) der Web-Schale unter `http://127.0.0.1:8080/` im Stand main 15ecdbd. Der Prüfer hat Playwright mit drei Browser-Kontexten gefahren, die je ein eigener Arbeitsplatz sind: Stelle S4 (Hz. Ru, verfasst), Stelle FmZ (Hz. Fm, nimmt an, befördert, weist nach, nimmt Eingänge auf) und eine freie Stelle „LdF“ (Hz. Ld, nur lesen und prüfen). Für die Sichtung kam kurz ein vierter Kontext mit der Stelle Sichter dazu. Alles lief im eigenen Einsatz „Review LdF“; fremde Einsätze wurden nicht angefasst. Die Zeiten der Anwendung stehen im Durchlauf unter dem Datum 17.11.2026 gegen 13:20 (Berliner Zeit).
- Durchlauf (Schritte, auf die die Fundstellen unten verweisen): D1 drei Ausgänge von S4 (einfach, Sofort, Blitz) aufgeben. D2 als LdF die Sichten Fernmeldezentrale und Nachweisung lesen. D3 als FmZ den Blitz ohne Annahme befördern, die Sofort-Nachricht nachweisen, die einfache annehmen und mit Nr. 1 doppelt nachweisen. D4 Annahmezeiten zurückdatieren (1250, 1305), um die Zwanzig-Minuten-Marke zu sehen. D5 vier Eingänge aufnehmen: mit vorbelegter Nummer, mit Papiernummer 50, mit bereits vergebener Nummer 1, ohne Nummer. D6 Eingang ohne Nummer bei besetztem Sichter. D7 „Berichtigen“, „Nachweisen“ mit Nummervorschlag, „Nachweisung ausgeben“. D8 Parameter „Schwelle der FmZ“ in den Stammdaten. D9 Lesen der Nachricht als S4 mit Vorschau „Wie gedruckt“.
- Dazu gelesen: KONZEPT-NACHRICHTEN.md (§3, §5, §9, §11), UMSETZUNGSBERICHT.md, der Abschnitt „Nachrichten“ im HANDBUCH, die Aufnahmen unter `docs/v2/entwurf/nachrichten/stand/`. Der Code wurde nur zur Belegung von Beobachtungen gelesen (`git show 15ecdbd:<Datei>`, Zeilennummern des Stands 15ecdbd). Der Arbeitsbaum enthält ungesicherte Änderungen; sie wurden nicht herangezogen und nicht verändert. Es wurde kein Quellcode und kein anderes Dokument geändert.
- Annahmen sind als „Annahme“ gekennzeichnet. Das sind vor allem: Ich kenne das Papier-Technische-Betriebsbuch (Vordruck 1103.1, Feld 5) nur aus Konzept und Lehrunterlage und habe die Spalten daher gegen diese, nicht gegen ein Original geprüft. Die Sandbox läuft in UTC; in einer Führungsstelle in Deutschland würden einige Zeitbefunde unten nicht auftreten (jeweils vermerkt). Die Stelle LdF gibt es nicht; die laufende Arbeit daran ist als „in Arbeit“ gekennzeichnet und nicht als Fehler gewertet.

## Kurzes Urteil aus Rollensicht

Die Fernmeldezentrale ist als Werkzeug des Fernmelders gut gebaut: Warteschlange nach Vorrang, drei Knöpfe für die drei Vermerke, editierbare Zeiten für die Nacherfassung vom Papier, eine bernsteinfarbene Zwanzig-Minuten-Marke mit „seit 34 min“, eine einstellbare Schwelle, eine gemeinsame Nummernfolge für Eingang und Ausgang, Warnung und Marke bei doppelter Nummer. Wer die Nachweisung führt, findet das Handwerkszeug.

Für mich als LdF fehlt die Aufsicht, die darüber liegt. Ich kann die Schritte des Fernmelders sehen, aber nicht erkennen, was durch die Maschen fällt. Zwei Wege lassen eine Nachricht ohne Annahme, ohne Nummer und ohne Warnung aus der Warteschlange verschwinden oder einfach nicht in die Belastungsrechnung eingehen (P0). Die Zahl, an der ich die Belastung messe, schweigt genau dann, wenn die FmZ am stärksten hinterherhängt: bei noch nicht angenommenen Nachrichten. Die Station LdF mit Festlegung des Mittels und Weitergabe an den Sichter gibt es noch nicht (in Arbeit); die Grundlage dafür zeigt die Anwendung nur zum Teil, es fehlen Wunsch, Alter und Nummernstatus in den Sichten. Die Nachweisung selbst trägt Zeiten und Nummern, aber nicht Mittel und Gegenstelle, und stimmt damit nicht mit dem Papierbetriebsbuch überein.

Gesamturteil: für den Fernmelder einsatzfähig, für den LdF noch nicht. Die beiden P0 sind kleine Eingriffe mit großer Wirkung auf die Nachweisung.

---

## P0 – Einsatzkritisch

### P0-1 Befördern ohne Annahme und ohne Nummer lässt die Nachricht aus der Warteschlange fallen; der Verfasser liest „erledigt“

**Beobachtung**
- D3: In der Warteschlange stand der Blitz „Dammbruch droht“ mit „nicht angenommen“ und „—“ als Nummer. „Befördern“ wurde ohne Annahme und ohne Nachweis angenommen, ohne Rückfrage und ohne Hinweis. Danach war die Nachricht aus der Sicht Fernmeldezentrale verschwunden. In der Nachweisung blieb sie als Zeile mit Nr. „—“, Annahme „—“, Beförderung „171322nov26 Fm“ stehen, unauffällig neben den übrigen.
- D9: Der Verfasser S4 sieht im Ausgang für dieselbe Nachricht den Stand „erledigt“ und im Lesen „Nachricht A · erledigt“, mit „Nr. (A) —“ und „Annahme —“. Der Verfasser hält die Nachricht damit für abgeschlossen. Kein Zähler im Band und keine Marke weist auf die fehlende Nummer hin.
- Ursache im Code: Die Sicht der FmZ zeigt nur Nachrichten im Laufzustand VOR_FMZ (`packages/domaene/src/projektion/nachrichten.ts:120-121`); der Laufzustand springt mit dem Beförderungsvermerk auf ERLEDIGT, wenn kein Sichter für Ausgänge verlangt ist (`packages/domaene/src/fold-nachricht.ts:67-72`). Die Knöpfe sind unabhängig voneinander freigeschaltet, „Befördern“ ist der Hauptknopf (`apps/desktop/src/renderer/Fernmeldezentrale.tsx:50-60`); die Maske prüft weder Annahme noch Nummer (`apps/desktop/src/renderer/Fmzmasken.tsx:70-77`).

**Auswirkung**
Eine Blitz-Nachricht kann befördert sein, ohne dass sie je angenommen oder nachgewiesen wurde. Das Technische Betriebsbuch hat dann eine Lücke, für die ich verantwortlich bin, und niemand wird darauf gestoßen. Im Stress ist der Hauptknopf „Befördern“ gerade bei Blitz der erste Griff. Dass der Verfasser „erledigt“ liest, ist zusätzlich irreführend: erledigt ist hier nur „befördert“.

**Vorschlag**
- Befördern ohne Annahme oder ohne Nummer mit einer deutlichen Rückfrage („Nachricht ist noch nicht angenommen / nachgewiesen. Trotzdem befördern?“), nicht sperren, weil bei Blitz Papier vorgehen kann.
- Eine befördert-aber-nicht-nachgewiesene Nachricht bleibt in der FmZ-Sicht in einem eigenen Abschnitt „Nachweis offen“ sichtbar, und das Band bekommt dafür eine Zahl (siehe P1-4).
- Den Stand im Ausgang des Verfassers „befördert“ statt „erledigt“ nennen, solange keine Sichtung oder Erledigung vorliegt.

### P0-2 Die Zwanzig-Minuten-Regel misst nur angenommene Nachrichten; was noch nicht angenommen ist, bleibt unbegrenzt unbemerkt

**Beobachtung**
- D2/D4: Drei Ausgänge lagen in der Warteschlange, einer davon Blitz. Die Zahl „Über der Schwelle“ blieb 0, solange keine Annahme gesetzt war. Erst nach Setzen von Annahmezeiten (1250, 1305) wurde die Zeile bernsteinfarben und das Band stand auf 1 bzw. 2. Die Zeile zeigt „171319nov26“ als Abfassungszeit, aber keine Wartezeit seit Aufgabe.
- Ursache im Code: `ueberSchwelle` liefert für `annahme === undefined` immer `false` (`packages/domaene/src/projektion/nachrichtenzeile.ts:157-162`); die Marke hängt nur an VOR_FMZ (`nachrichtenzeile.ts:232`); die Handbuchregel lautet „liegt eine angenommene Nachricht länger als die Schwelle unbefördert“ (HANDBUCH, Abschnitt Fernmeldezentrale).
- Die Lehrunterlage (Folie 14) misst von der Annahme bis zur Beförderung. Gerade deshalb schweigt die Zahl, wenn der Fernmelder die Nachricht noch gar nicht angefasst hat.

**Auswirkung**
Der Zustand „FmZ überlastet, nichts wird mehr angenommen“ ist für den LdF der wichtigste und ist am Band nicht zu sehen. Die Zahl zeigt umso weniger, je größer die Rückstände sind. Ein Blitz kann Stunden im Fach liegen, ohne dass irgendetwas Bernsteinfarbenes erscheint.
Zusatz, Annahme: Der Rückstand ist vor der Annahme für die Absender die eigentliche Verzögerung; ob der Fernmeldebetrieb ihn nach Folie 14 in die Zwanzig Minuten rechnet, ist für mich nicht eindeutig. Nicht anzeigen sollte man ihn deshalb nicht.

**Vorschlag**
In der Zeile „im Fach seit n min“ ab Abfassungs- bzw. Aufgabezeit zeigen, eine zweite Marke und eine zweite Zahl im Band „nicht angenommen, älter als Schwelle“. Die Regel von Folie 14 (Annahme bis Beförderung) bleibt die offizielle Zahl, die zweite ist die Frühwarnung.

---

## P1 – Hoch

### P1-1 Die Station LdF fehlt (in Arbeit); Mittel festlegen und Weitergabe an den Sichter sind nicht abgebildet

**Beobachtung**
- Die Stellenliste kennt Leiter, S1 bis S4, S6, Fachberater, Verbindungsstelle, Sichter, FmZ (D2, Maske „Stelle und Handzeichen“; `packages/domaene/src/projektion/tagebuch-nachrichten.ts:18-25`). Eine freie Stelle „LdF“ lässt sich eintragen, bleibt aber ohne Wirkung. Sie fehlt auch in „Posteingang von“.
- Der Laufweg des Konzepts (§5) kennt keinen Halt beim LdF. Eingänge gehen vom Fernmelder direkt zum Sichter (D6), Ausgänge direkt vom Fach zum Befördern (D3).
- **Markierung: in Arbeit.** Der Umbau für Festlegung des Mittels und Weitergabe an den Sichter läuft laut Auftrag; ich habe ihn nicht bewertet.

**Grundlage, die die Anwendung heute zeigt**
- Der Übermittlungswunsch (Feld 7) ist im Verfassen-Formular wählbar, steht aber nicht in der Warteschlange und nicht in der Nachweisung (`Fernmeldezentrale.tsx:74-82`, `Nachweisung.tsx:76-86`); der LdF sieht ihn erst im Lesen der Nachricht.
- Die Vorbelegung des Mittels in der Beförderungsmaske ist der Wunsch, sonst stillschweigend „FUNK“ (`Fmzmasken.tsx:59`). D3/D9: Der Blitz hatte keinen Wunsch („—“); im Vordruck stand danach Funk angekreuzt, obwohl niemand es festgelegt hat. Das Mittel im Vordruck ist damit ein Vorschlag der Software, keine Festlegung des LdF.
- Es gibt keine Anzeige „Mittel festgelegt von … um …“. Eine Festlegung ist ohne die neue Station nicht nachvollziehbar.

**Auswirkung**
Der LdF legt das Mittel fest (Folie 22). Heute kann der Fernmelder es allein setzen oder durchwinken, und was auf dem Vordruck steht, kann ein bloßer Vorgabewert sein. Die Zuständigkeit des LdF lässt sich weder ausüben noch später belegen.

**Vorschlag**
Beim Umbau: In der Warteschlange eine Spalte „Wunsch“ und eine Spalte „Mittel (LdF)“ zeigen; „Befördern“ ohne festgelegtes Mittel mit Rückfrage; das Vorbelegen auf FUNK ohne Festlegung entfällt. Beim Eingang ein Halt beim LdF mit Zeit der Weitergabe, mit Rückfall auf direkten Sichter, wenn kein LdF besetzt ist (so wie der Ersatzsichter es heute macht).

### P1-2 Ein Eingang ohne Nummer läuft zum Sichter und wird verteilt; die Nummernlücke fällt nicht auf

**Beobachtung**
- D5: „Nr. (E)“ ist vorbelegt, darf aber leer bleiben (`apps/desktop/src/renderer/fmzformate.ts:47`: „Leer lassen ist erlaubt“). Der Eingang „Ohne Nummer“ (Blitz) wurde ohne Warnung aufgenommen, vom Ersatzsichter verteilt („Kein Sichter besetzt: Nachricht beim Aufnehmen verteilt“) und steht in der Nachweisung mit Nr. „—“ und Sichtung 1324.
- D6: Bei besetztem Sichter dasselbe in der Sichtersicht: „vor dem Sichter … E — … Eingang mit Sichter“, Nr. „—“. Der Sichter quittiert und verteilt eine Nachricht, die nicht im Betriebsbuch steht. Eine Warnung gibt es weder an der Aufnahme noch am Sichter.

**Auswirkung**
Konzept-Entscheidung 2 legt fest, dass die Nummer leer bleiben kann, bis die FmZ nachweist (das gilt für Ausgänge der Stellen). Beim Eingang ist die FmZ aber selbst die aufnehmende Stelle, die Nummer sofort vergeben kann. Ein Eingang, der ohne Nummer verteilt wird, ist die klassische Lücke im Betriebsbuch; der LdF erfährt es erst beim Durchblättern der Nachweisung.

**Vorschlag**
Beim Eingang Aufnehmen ohne Nummer Rückfrage („Ohne Nummer aufnehmen? Die Nachricht steht dann nicht in der Nachweisung.“), und eine Zahl „ohne Nummer“ im Band. Ausgang bleibt wie entschieden.

### P1-3 Die Nachweisung hat weder Mittel noch Gegenstelle und weicht vom Papier-Betriebsbuch ab

**Beobachtung**
- Spalten in der Anwendung (D2/D5): Vorrang, E/A, Nr., Von, An, Aufnahme, Annahme, Beförderung, Abfassungszeit, Betreff (`Nachweisung.tsx:76-85`). Im Ausdruck (D7): Nr., E/A, Vorrang, Aufnahme, Annahme, Beförderung, Abfassung, Absender, Anschrift, Betreff, Sichtung, Marke (`packages/ausgaben/src/nachweisung.ts:31-44`). Beide Listen haben eine unterschiedliche Reihenfolge der Spalten; die Sichtung steht nur im Ausdruck.
- Beide Listen führen weder das Mittel der Beförderung noch die Gegenstelle (Rufname) und kein Handzeichen für den Nachweis.
- Annahme: Das Papier-Betriebsbuch (Technisches Betriebsbuch, Feld 5) führt meiner Kenntnis nach Mittel und Gegenstelle mit; das Konzept §3 listet beides als Felder (1, 6) des Vordrucks. Das Original habe ich nicht vorliegen.
- Zeitformate: In der Anwendung stehen Annahme und Beförderung als „171250nov26 Fm“ (volle Datum-Zeit-Gruppe), im Ausdruck die Annahme als „1250 Fm“, die Beförderung als „1322 Fm“, die Aufnahme als „171324nov26“ (D7). Der Vordruck verlangt für Feld 3 Uhrzeit, für Feld 2 und 4 Datum und Uhrzeit; der Ausdruck mischt also je Spalte das Format. Um Mitternacht ist „1250“ ohne Tag nicht eindeutig.

**Auswirkung**
Wer die Nachweisung gegen das Papier hält (Schichtübergabe, Rückfall), findet Mittel und Gegenstelle nicht und muss in jede Nachricht hineinsehen. Die Datum-Zeit-Gruppe stimmt dafür in der Maske, im Vordruck und in der Liste überein.

**Vorschlag**
Spalten „Mittel“ und „Gegenstelle“ in Liste und Ausdruck, gleiche Reihenfolge in beiden, Zeitformat je Vermerk wie auf dem Papier und im Ausdruck immer mit Tag.

### P1-4 Ohne Wartezeit und ohne Zähler lässt sich die Belastung der FmZ nicht beurteilen

**Beobachtung**
- Das Band hat fünf Zahlen: neu für meine Stellen, vor der FmZ, vor dem Sichter, mit Vorrang offen, über der Schwelle (`nachrichten.ts:166-173`). Keine misst „länger als n min nach Aufnahme beim Sichter liegend“, „ohne Nummer“ oder „befördert, nicht nachgewiesen“.
- Die Zeile der Warteschlange zeigt die Wartezeit nur seit der Annahme (`Fernmeldezentrale.tsx:36-44`), die Schwelle selbst steht nicht in der Sicht, sondern nur in der Stammdatenmaske unter „Nachrichtenweg“ (`Nachrichtenparameter.tsx:63-64`, D8). Sie ist dort einstellbar und prüft (0 und −5 werden abgelehnt: „als ganze Zahl ab 1 eintragen“), aber man liest sie am Blatt nicht ab.
- Die Sicht des Sichters (D6) zeigt keine Aufnahmezeit und kein Alter; der Weg Aufnahme bis Sichtung ist nirgends gemessen.
- Alle Vorränge haben dieselbe Schwelle; Blitz und Sofort werden nicht strenger behandelt (Annahme: Die Lehrunterlage nennt zwanzig Minuten als Maß der Belastung, nicht als Vorrangregel; für den Betrieb wäre eine kürzere Marke bei Blitz trotzdem nützlich).

**Auswirkung**
Ich sehe, dass etwas bernsteinfarben ist, aber nicht, wie viele Nachrichten nur knapp darunter liegen, wie die Schwelle gesetzt ist oder ob der Eingang beim Sichter hängt.

**Vorschlag**
Die Schwelle in die Kopfzeile der Warteschlange („Marke ab 20 min, einstellbar“) mit Link in die Stammdaten; „Alter“ als Spalte in Fach- und Sichtersicht; drei weitere Zahlen im Band (ohne Nummer, befördert ohne Nachweis, beim Sichter länger als Schwelle). Eine eigene Schwelle für Blitz als Parameter.

---

## P2 – Mittel

### P2-1 Doppelte Nummer: Warnung und Marke sind gut, die Berichtigung beginnt mit der falschen Nummer

**Beobachtung**
- D3/D5: Die Warnung kommt vor dem Schreiben („Die Nummer 1 ist bereits vergeben … Nachweisen ist trotzdem möglich“, Knopf „Trotzdem nachweisen“), danach stehen alle drei Zeilen mit „1 doppelt“ in der Nachweisung (zwei Ausgänge, ein Eingang), Zeile „Hinweise“ und im Fuß „1 Konflikthinweis“.
- D7: „Berichtigen“ öffnet die Maske mit der doppelten Nummer vorbelegt (`Fmzmasken.tsx:61`, `p.zeile.nummer ?? p.naechsteNummer`), nicht mit der nächsten freien (hier 51). Wer nur „Nachweisen“ drückt, ändert nichts.
- Die Warteschlange der FmZ zeigt die doppelte Nummer nicht (Zeilen „1“ ohne Marke, D4); die Marke steht nur in der Nachweisung.
- Wortwechsel: Marke „doppelt“, Hinweis „berichtigt wird mit ‚Nachweisen‘“, Knopf „Berichtigen“.

**Auswirkung**
Der Normalfall der Doppelung (zwei Fernmelder, ein Papierblock) lässt sich beheben, aber mit einem Klick zu viel und einer Falle bei der Vorbelegung.

**Vorschlag**
Bei „Berichtigen“ die nächste freie Nummer vorbelegen, die Marke auch in der Warteschlange zeigen, Wörter vereinheitlichen.

### P2-2 Lücken und Sprünge in der Nummernfolge werden nicht gezeigt; ein Zahlendreher passiert unbemerkt

**Beobachtung**
D5: Nach Nr. 2 wurde 50 (Papiernummer) angenommen, richtig: Die Vorbelegung springt danach auf 51 (D7), „höchste bekannte plus eins“ (`nachrichten.ts:150-161`). Gut. Es gibt aber keinen Hinweis auf die Lücke 3 bis 49 und keine Frage bei einem Sprung; ein Zahlendreher („50“ statt „5“) oder ein zusätzliches Nullzeichen setzt die Nummernfolge für alle Folgenden hoch und lässt sich nicht zurücknehmen (die Nummer „steht auf Papier“, Konzept §9). Eine Anzeige „Nr. 3 bis 49 nicht vergeben“ fehlt.

**Auswirkung**
Beim Hochsetzen nach Papierbetrieb gewollt, bei einem Vertipper gefährlich: Die Nachweisung ist dann dauerhaft lückenhaft, und der Weg zurück ist nur eine Berichtigung jeder einzelnen Nachricht.

**Vorschlag**
Bei einem Sprung größer als eins eine Rückfrage („Nr. 3 bis 49 bleiben leer, Papierbetrieb?“) und in der Nachweisung eine graue Zeile „Nr. 3 bis 49 nicht vergeben“, die der LdF abzeichnen kann.

### P2-3 Die Stelle ist Zuschnitt, kein Recht: Jeder kann annehmen, befördern und nachweisen

**Beobachtung**
Die Knöpfe sind für jeden Arbeitsplatz in der Sicht Fernmeldezentrale freigeschaltet, unabhängig von der Stelle (`Fernmeldezentrale.tsx:50-60`, nur `nurLesen` bei beendetem Einsatz). Eine Stelle wie S4 darf also auch die eigenen Nachrichten befördern und nachweisen. Das ist im Konzept §4 ausdrücklich so entschieden („ein Zuschnitt, kein Recht“).

**Auswirkung**
Der LdF ist im Fernmeldebetrieb weisungsbefugt (DV 1-100 4.3.1.7), die Anwendung kann das nicht abbilden. Dass der Verfasser seine Nachricht selbst nachweist, ist im Betriebsbuch dann nur an den Handzeichen zu erkennen.

**Vorschlag**
Keine harte Sperre (Papier und Notbetrieb gehen vor), aber ein Hinweis in der Maske, wenn die eigene Stelle weder FmZ noch LdF ist, und der Handzeichen-Vergleich in der Nachweisung (Verfasser = Nachweiser als Marke).

### P2-4 Uhrzeit ist in Kopfband, Maske, Vordruck und Ausdruck nicht in derselben Zeitzone

**Beobachtung**
- Die Datum-Zeit-Gruppe wird ausdrücklich in Berliner Zeit geschrieben (`packages/domaene/src/zeit/datumZeitGruppe.ts:1-12`), die Anzeige im Kopfband dagegen in der Rechnerzeit (`apps/desktop/src/renderer/formate.ts:59-66`, Aufruf `Kopfband.tsx:124`), die Zeile unter dem Eingabefeld in der Ortszeit des Browsers.
- D3/D5 in der Sandbox (UTC): Kopfband „171221NOV26“, Maske „171322nov26“ und darunter „17.11.2026 12:22“ nebeneinander, eine Stunde auseinander. Der HTML-Ausdruck trägt „Stand: 17.11.2026, 12:26:00“, die Zeilen darin sind in Berliner Zeit.
- Annahme: Auf einem Rechner mit deutscher Ortszeit gibt es diesen Unterschied nicht. Ein Rechner mit falscher Zeitzone (Notebook auf UTC oder Ausland) würde ihn zeigen, und damit auch Zeiten in Annahme- und Beförderungsvermerk, die um eine Stunde abweichen.
- Außerdem hat die Gruppe keinen Zeitzonenbuchstaben („171322nov26“, Papier der Führungsstellen kennt häufig „171322Anov26“); das ist Annahme und für eine rein deutsche Lage zu vernachlässigen.

**Auswirkung**
Beim Messen der Wartezeit (Annahme bis Beförderung) kommt es nur auf Differenzen an und die stimmen; beim Abgleich mit dem Papier und der Uhr an der Wand kann eine Stunde fehlen.

**Vorschlag**
Kopfband und Hilfszeile unter dem Feld in derselben Zone wie die Gruppe; ein Hinweis, wenn die Rechnerzeit von Berlin abweicht.

### P2-5 Das Betriebsbuch am Schichtende: Ausgabe ohne Schicht, ohne Abschluss, mit Rohtext im Kopf

**Beobachtung**
- D7: „Nachweisung ausgeben“ bietet im Browser nur „Nachweisung als HTML“ an (PDF nur in der Desktop-App, laut HANDBUCH); die Datei hat einen Zeitstempel im Namen (`nachweisung_2026-11-17_1226.html`) und enthält alle Nachrichten des Einsatzes. Es gibt keinen Filter „diese Schicht“ oder „ab Nr.“, keine Seitenzählung (Annahme: die Druckvorlage ist eine A4-Liste, ich habe keine Druckseiten gemessen) und kein Feld für Abschlussvermerk oder Unterschrift des LdF.
- Im Kopf steht „@bos/eeb-format 0.0.0“ und der interne Einsatzordner „2026-11-17_review-ldf_9fb75a“; die Fußzeile heißt „Erstellt Stand: 17.11.2026, 12:26:00 · Arbeitsplatz“ (doppeltes Wort, `packages/ausgaben/src/nachweisung.ts:108`) und „Arbeitsplatz“ ohne Namen.
- Die Marke „GN“ (Gesprächsnotiz) und „zurückgezogen“ stehen im Ausdruck, aber nur die „Nr. doppelt“ konnte ich auslösen.

**Auswirkung**
Als Schichtbuch ist der Ausdruck verwendbar, aber nicht abgabefertig: Der LdF muss die Schicht von Hand abgrenzen und kann nicht quittieren.

**Vorschlag**
Zeitraum oder Nummernbereich als Filter, Kopf mit Einsatzname, Schicht, Bearbeiter und Zeile für Handzeichen LdF; Tech-Kennungen aus dem Kopf entfernen.

### P2-6 Die Nachrichten-Zeile zeigt „Absender“ nicht in der Warteschlange

**Beobachtung**
Die FmZ-Warteschlange (D2) hat Vorrang, Nr., Anschrift, Betreff, Abfassungszeit, Annahme (`Fernmeldezentrale.tsx:76-81`); weder Absender noch Wunsch noch Gegenstelle noch Alter stehen dort. Zu den Spalten der Nachweisung kommt ein Absender erst im Ausdruck.

**Auswirkung**
Der LdF kann nicht prüfen, welche Stelle wartet, und nicht nach Absender priorisieren.

**Vorschlag**
Absender und Wunsch als schmale Spalten.

---

## P3 – Niedrig

### P3-1 Beschriftung „Nr. (E)“ bei gemeinsamer Zählung

Im Eingangsformular heißt das Feld „Nr. (E)“, im Verfassen-Formular und im Lesen „Nr. (A)“. Die Zählung ist nach Entscheidung 1 gemeinsam für E und A. Der Zusatz (E)/(A) legt zwei Zählungen nahe. Vorschlag: „Nr.“ und die Richtung getrennt ausweisen.

### P3-2 Schreibweise der Zeit wechselt zwischen Kopfband und Blatt

Kopfband „171221NOV26“ in Großbuchstaben, Blatt und Vordruck „171319nov26“ in Kleinbuchstaben. Beides lesbar, aber uneinheitlich; auf Papier üblich ist eine feste Schreibweise.

### P3-3 Stelle wird nach jedem Neuladen erneut abgefragt

D5/D6: Nach dem Neuöffnen einer Sitzung erscheint die Maske „Stelle und Handzeichen“ wieder, die Wahl ist vorbelegt (Konzept-Entscheidung 3). Ein Klick, aber an einer FmZ, die tagelang im Betrieb ist, bei jeder Browser-Aktualisierung eine Hürde vor dem ersten Annehmen. Vorschlag: für eine Stelle mit festem Handzeichen auf dem Gerät merken und nur einmal bestätigen.

### P3-4 Hinweisliste unter der Nachweisung wächst und Einführungsband bleibt

D5: Unter der Nachweisung sammeln sich Hinweise („In der Nachweisung unter Nummer 2 eingetragen“, „Kein Sichter besetzt …“) ohne Datum und ohne Zusammenfassung. Das gelbe Einführungsband „Verstanden“ liegt in jedem neuen Kontext über der FmZ-Sicht. Vorschlag: Hinweise mit Uhrzeit und „löschen“, Band je Arbeitsplatz merken.

---

## Was gut gelöst ist

- Warteschlange nach Vorrang (Blitz rot, Sofort bernsteinfarben, Blitz vor Sofort vor einfach), drei Knöpfe je Zeile, Uhrzeit und Handzeichen vorbelegt und änderbar: gut für Nacherfassung vom Papier.
- Zwanzig-Minuten-Marke mit „seit 34 min“, bernsteinfarbener Zeile und Zahl im Band; Schwelle einstellbar und gegen Unsinnswerte geprüft.
- Gemeinsame Nummernfolge E/A, „höchste bekannte plus eins“, springt nach der Papiernummer 50 auf 51, Eintrag höherer Nummer ist erlaubt; das ist genau der Papierbetrieb-Rückfall.
- Doppelte Nummer: Warnung vor dem Schreiben, Marke „doppelt“ in der Nachweisung, Fußhinweis, „Berichtigen“; nichts geht verloren.
- Datum-Zeit-Gruppe in der Maske, auch „1045“ als Kurzeingabe; die Vorschau „Wie gedruckt“ im Vordrucklayout mit Ankreuzfeldern, Nr.-Kasten und Beförderungsvermerk entspricht dem Papier.
- Ersatzsichter-Regel mit klarem Hinweis „Kein Sichter besetzt“; Eingang nimmt Anschrift aus den Stammdaten vor.
