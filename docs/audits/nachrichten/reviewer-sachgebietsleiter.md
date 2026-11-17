# Audit: Nachrichten (4-fach-Vordruck) aus Sicht des Sachgebietsleiters S3

Datum: 2026-11-17
Rolle des Prüfers: Sachgebietsleiter S3 in einer THW-Führungsstelle (Lage und Einsatz): verfasst Befehle an Einheiten draußen, bekommt Meldungen im Posteingang, hält Telefonate als Gesprächsnotiz fest, übergibt nach der Schicht und braucht den Vordruck für die Akte.

## Scope und Methodik

- Geprüft wurde an einer **laufenden Instanz**: Web-Schale auf http://127.0.0.1:8080/, Stand main 15ecdbd, Chromium über Playwright (Viewport 1320 x 860). Jeder Browser war ein eigener Arbeitsplatz. Eigener Einsatz „Review S3“ (Übung, Zwei-Schicht-Modell) auf dem gemeinsamen Share; fremde Einsätze wurden nicht angefasst.
- Besetzt waren: S3 (Hz. Mü) als Prüfer, außerdem als Gegenstellen FmZ (Hz. Fm) und Sichter (Hz. Si), jeweils in eigenem Browser. Durchgespielt wurden: Stelle und Handzeichen setzen, Einsatzbefehl an „FGr WP 1“ mit Vorrang Sofort verfassen, FmZ nimmt an, befördert, Eingang mit Blitz und Sofort aufnehmen (ohne und mit Sichter), lesen, erledigen, antworten, weiterleiten, Gesprächsnotiz mit Selbstverteilung und „An den Sichter“, Nachweisung, Einsatztagebuch, Vordruck als PDF (per pdftoppm gerendert und angesehen), Bedienfehler (Esc, Abbrechen, leere Stellenabfrage, Reload).
- Quellen: `docs/audits/README.md`, `docs/audits/thw-command-reviewer.md` (Form), `docs/v2/entwurf/nachrichten/KONZEPT-NACHRICHTEN.md` (§3, §5, §11), `UMSETZUNGSBERICHT.md`, Abschnitt „Nachrichten“ in `docs/v2/HANDBUCH.md`, die Aufnahmen unter `stand/`, dazu gezielt der Renderer-Code unter `apps/desktop/src/renderer/` und `packages/domaene/src/projektion/nachrichten.ts`. Zeilenangaben beziehen sich auf HEAD (15ecdbd); der Arbeitsbaum enthält bereits Änderungen für die Station LdF, sie sind nicht bewertet.
- Es wurde weder Quellcode noch ein anderes Dokument geändert. Befunde sind mit Fundstelle (Datei:Zeile oder Schritt im Durchlauf) belegt, Annahmen sind als solche gekennzeichnet. Zwei eigene Bedienfehler im Durchlauf (ein falsch befülltes Handzeichen in der Eingangsmaske, eine versehentlich doppelt aufgegebene Antwort) sind in den Befunden nicht als Fehler der Anwendung gewertet.
- Umgebungsbedingt: Die Sandbox läuft in UTC (siehe P3-5); gleichzeitig laufende Reviewer erzeugen weitere „Arbeitsplätze“ in der Statuszeile.
- Nicht bewertet, weil gerade im Bau („in Arbeit“): Station LdF (Mittel festlegen, Sicht „ldf“, sechste Zahl im Band) und rote/grüne Kopie beim Ausgang.

## Kurzes Urteil aus Rollensicht

Der Weg einer Nachricht ist als Ereignisfolge sauber und nachvollziehbar gebaut: Der Vordruck sieht aus wie das Papier, die FmZ-Schritte tragen Zeit und Handzeichen, Kenntnisnahme und Erledigung gelten je Stelle, der Ersatzsichter verhindert den Stau am leeren Stuhl, und der Ausdruck ist maßhaltig. Eine Nachricht aufgeben, im Posteingang finden, lesen, erledigen und antworten klappt ohne Einweisung.

Reibung entsteht an der Stelle, die ich als S3 am häufigsten brauche: Nach dem Aufgeben weiß ich nicht verlässlich, wo meine Nachricht ist. Die Ausgangsliste kennt nur „vor der FmZ“, „verteilt“ und „erledigt“; Annahme, Beförderung, Nummer und Zeit stehen nur im aufgeschlagenen Vordruck, und eine befördert-aber-unquittierte Nachricht heißt „erledigt“. Zweitens fehlt der stabsinterne Weg (S3 an S4 ohne Funk) und die Übernahme der Anschrift in den Verteiler. Drittens gibt es für die Übergabe keine Sicht „offen“, und das Handzeichen ist keine Pflicht, obwohl der Vordruck es verlangt.

Die Kernaufgabe „Befehl hinausgeben und wissen, ob er raus ist“ ist nur über den Umweg der Detailansicht erfüllbar. Die Kernaufgabe „Schicht übergeben“ ist ohne mündliche Ergänzung nicht belastbar.

---

## P0 – Einsatzkritisch

### P0-1 Der Ausgang meldet „erledigt“, wo die Nachricht nur befördert ist, und zeigt weder Zeit noch Nummer

**Fundstellen**
- `apps/desktop/src/renderer/Nachrichtenliste.tsx:20-26` (`LAUFWORT`: nur „vor der FmZ“, „vor dem Sichter“, „verteilt“, „erledigt“, „zurückgezogen“)
- `Nachrichtenliste.tsx:84` (Ausgang und Sichter zeigen in der Spalte „Stand“ ausschließlich dieses Wort; Annahme-, Beförderungsvermerk und Mittel stehen nicht in der Zeile)
- Durchlauf: Einsatzbefehl A an FGr WP 1, Sofort. FmZ „Annehmen“ (171320nov26 Fm): Ausgang bleibt nach 7 s auf „vor der FmZ“. FmZ „Befördern“ (171321nov26 Fm, Funk): Ausgang zeigt „erledigt“, Nr. „—“, Vorrang-Zähler im Band springt auf 0. Die Zeiten stehen erst nach Doppelklick im Vordruck („Annahme 171320nov26 Fm, Beförderung 171321nov26 Fm“, Screenshots 17 und 22).
- `packages/domaene/src/projektion/nachrichten.ts:172` (Vorrang gilt als nicht mehr offen, sobald der Laufzustand ERLEDIGT ist)

**Beobachtung**
Für einen Ausgang endet der Laufweg mit der Beförderung, und die Liste nennt das „erledigt“. Das Wort bedeutet bei einem Eingang etwas anderes (Stelle hat bearbeitet) als beim Ausgang (FmZ hat die Funkstrecke bedient). Annahme (die erste Sichtbarkeit der FmZ-Arbeit) ist in der Liste gar nicht abgebildet. Wann, mit welchem Mittel und von wem befördert wurde, sehe ich nur im Vordruck. Der Vorrang-Zähler im Band sagt „0 offen“, obwohl FGr WP 1 den Sofort-Befehl vielleicht noch gar nicht quittiert hat.

**Auswirkung auf meine Arbeit als S3**
Ich lese „erledigt“ und halte den Einsatzbefehl für ausgeführt. Tatsächlich ist nur der Funkspruch hinausgegangen. Bei Sofort ist das genau die Frage, die in der Führungsstelle gestellt wird („Ist der Befehl raus, und seit wann?“); sie lässt sich aus der Liste nicht beantworten, und ein Sofort-Befehl, der in der FmZ liegt, ist von einem, der draußen ankam, nur über das Wort „vor der FmZ“ zu unterscheiden. Dass die Annahme einer Nachricht schon 15 Minuten her ist, sehe ich als Verfasser nicht.

**Vorschlag**
Für Ausgang eigene Standwörter: „vor der FmZ“, „angenommen 1320“, „befördert 1321 (Funk)“, „nachgewiesen Nr. A 2“; „erledigt“ nur für Eingänge. Annahme- und Beförderungszeit mit Handzeichen als eigene Spalten oder Zusatz im Stand. Der Vorrangzähler sollte erst nach der Quittung der Gegenstelle fallen, oder es gibt eine eigene Marke „befördert, nicht quittiert“. Annahme: Wie weit das mit der rot/grünen Kopie beim Ausgang (in Arbeit) ohnehin entsteht, ist mir nicht bekannt; das Wort „erledigt“ gehört aber dennoch korrigiert.

---

## P1 – Hoch

### P1-2 Es gibt keinen stabsinternen Weg: S3 an S4 läuft über die FmZ-Warteschlange

**Fundstellen**
- `KONZEPT-NACHRICHTEN.md` §3 (letzter Absatz: Verkehr zwischen zwei Stellen ist ein Eingang über den Sichter)
- `apps/desktop/src/renderer/Nachrichtenmaske.tsx:98-99, 170-174, 239` (nur das Kästchen „Gesprächsnotiz“ öffnet Laufzettel und Verteilung; jede andere Nachricht ist ein Ausgang)
- Durchlauf: „Weiterleiten“ von E 1 öffnet die Maske mit leerer Anschrift und Absender S3; aufgegeben landet sie wie jeder Ausgang in der Ausgangswarteschlange der FmZ (Screenshot 39).

**Beobachtung**
Eine Nachricht von mir an S4 („Kraftstoff bereitstellen, ihr seht E 1“) ist in der Maske nicht vorgesehen. „Weiterleiten“ und „Antworten“ erzeugen immer einen Ausgang für die FmZ; wer sie nicht verfasst, aber intern sagen will, muss sie als Gesprächsnotiz tarnen und einen Absender erfinden.

**Auswirkung**
Die häufigste Handlung im Stab, „Kenntnis geben“ an ein anderes Sachgebiet, hat keinen eigenen Weg. Entweder landet interner Verkehr in der Funkwarteschlange (die FmZ muss ihn annehmen und „befördern“) und bläht die Nachweisung, oder der S3 missbraucht die Gesprächsnotiz.

**Vorschlag**
Ein Schalter „Stabsintern“ (ohne FmZ, Verteiler direkt wie bei der Gesprächsnotiz) oder „Weiterleiten“ als Kenntnisgabe: Stellen aus dem Verteiler wählen, grüne oder blaue Kopie, ohne Beförderung.

### P1-3 Die Anschrift der Nachricht wird nicht in den Verteiler übernommen; der Sichter muss sie neu tippen

**Fundstellen**
- `apps/desktop/src/renderer/Laufzettel.tsx:37` (`VERTEILER_VORBELEGUNG`: nur S2 rot), `Laufzettel.tsx:113`
- Durchlauf: Gesprächsnotiz „Anruf Wasserwirtschaft: Pegel“ mit Anschrift „S3, S4“, Weg „An den Sichter“. Der Laufzettel des Sichters zeigt nur S2 rot vorbelegt (Screenshot 43). Gesichtet mit Vorbelegung: Die Nachricht stand weder bei S3 noch bei S4 im Posteingang.
- Gleiche Doppelerfassung bei „Selbst verteilen“: Anschrift „S2, S4“ und Verteilermatrix sind zwei getrennte Eingaben.

**Beobachtung**
Anschrift (Feld 10) und Verteiler (Feld 19) sind getrennte Angaben, aber die genannten Stellen werden nicht vorgeschlagen. Ein Sichter in Eile übernimmt die Vorbelegung und lässt S3 und S4 aus.

**Auswirkung**
Meine Nachricht „an S3, S4“ erreicht niemanden außer S2. Im Papierweg liest der Sichter die Anschrift und kreuzt entsprechend an; hier geht dieser Schritt stillschweigend verloren, ohne dass der Verfasser es sieht (die Ausgangszeile sagt „verteilt“).

**Vorschlag**
Verteiler aus den in der Anschrift erkannten Stellennamen vorbelegen (S3 grün, S4 blau); in der Ausgangszeile „verteilt an S2“ nennen, damit der Verfasser die Lücke sieht.

### P1-4 Handzeichen und Absender sind keine Pflicht, die eigene Stelle ist nirgends sichtbar

**Fundstellen**
- `apps/desktop/src/renderer/Stellenabfrage.tsx:71` („Übernehmen“ geht ohne Auswahl und ohne Handzeichen durch)
- `Nachrichtenmaske.tsx` (Aufgeben bleibt aktiv ohne Absender, Zeichen und Funktion)
- Durchlauf: Stellenabfrage ohne Eingabe bestätigt; Maske: Absender, Zeichen, Funktion leer; mit Anschrift und Betreff ist „Aufgeben“ aktiv (Screenshot 52). Im Kopf und in der Statuszeile steht an keiner Stelle „S3 · Mü“; die Posteingangsauswahl sagt „meinen Stellen (S3)“, mehr nicht.
- `Fenstermenue.tsx:151` („Stelle und Handzeichen …“ nur unter dem Menü „⋯“)

**Beobachtung**
Feld 15 und 17 des Vordrucks sind Pflicht, die Abfrage beim Öffnen auch („Die Wahl gilt, bis der Einsatz geschlossen wird“), lässt sich aber leer bestätigen. Wer nichts einträgt, erzeugt Nachrichten ohne Absender und Zeichen; im Ausdruck steht dann ein leeres Feld. Die eigene Stelle und das Handzeichen sind nach dem Öffnen nicht mehr zu sehen.

**Auswirkung**
Der Nachweis, wer wann aufgegeben hat, ist der Grund für das Handzeichen. Bei Übergabe oder Rückfrage (Wer hat den Befehl um 13:18 gegeben?) fehlt er. Ich weiß außerdem nicht mehr, unter welchem Zeichen ich gerade schreibe.

**Vorschlag**
Stellenabfrage ohne Stelle und Handzeichen nicht übernehmen (oder ausdrücklich „ohne Stelle weiter“ mit Warnung); „Aufgeben“ nur mit Absender und Zeichen; „S3 · Mü“ als dauerhafte Angabe in der Statuszeile, die zugleich zum Ändern führt.

### P1-5 Esc und „Abbrechen“ verwerfen einen angefangenen Vordruck ohne Rückfrage

**Fundstellen**
- `Nachrichtenmaske.tsx:233` (`aufAbbrechen={aufSchliessen}`)
- Durchlauf: Maske mit drei Zeilen Inhalt, Esc im Textfeld: Maske zu, erneutes Strg+N zeigt einen leeren Inhalt; dasselbe mit „Abbrechen“. Kein Dialog. Nur Seite verlassen (Reload) fragt, wie im Handbuch beschrieben („wer die Seite verlässt, wird gefragt“).

**Beobachtung**
Der Vordruck hat zwölf Zeilen; ein Einsatzbefehl nach Befehlsschema ist in der Regel länger getippt als eine Gesprächsnotiz. Ein versehentliches Esc (naheliegend, wenn man aus dem Feld heraus will) löscht alles.

**Auswirkung**
Unter Zeitdruck ist das der teuerste Bedienfehler der Maske: Befehl neu schreiben, die Abfassungszeit ändert sich, die Einheit wartet.

**Vorschlag**
Rückfrage „Entwurf verwerfen?“, sobald Anschrift, Betreff oder Inhalt belegt sind; besser: Entwurf je Arbeitsplatz erhalten, bis er aufgegeben oder bewusst verworfen wird.

### P1-6 Nachrichten verlassen die FmZ-Warteschlange ohne Nummer; die Nummer lässt sich nur in der Nachweisung nachholen

**Fundstellen**
- Durchlauf: Nach „Befördern“ ist die Zeile aus der Ausgangswarteschlange verschwunden, der Knopf „Nachweisen“ mit ihr. In der Ausgangsliste steht dauerhaft „—“, in der Nachweisung „Nachweisen“ (Screenshots 17, 50). Nach drei Ausgängen und zwei Gesprächsnotizen trägt keiner eine Nummer; nur die eingegangene E 1 hat eine.
- Primärknopf in der Warteschlange ist „Befördern“ (Screenshot 12), auch ohne vorherige Annahme; die Reihenfolge Annahme, Beförderung, Nachweis wird nirgends erzwungen oder angemahnt.
- Handbuch: „ohne besetzte FmZ bleibt die Nummer leer, bis die FmZ nachweist“.

**Beobachtung**
Die Nachweisung (Feld 5, Technisches Betriebsbuch) ist die Nummerierung des Stabes. Hier kann eine Nachricht hinausgehen, ohne dass sie nummeriert ist, und nichts erinnert daran.

**Auswirkung**
Ich kann im Funk keine Nummer nennen („Bezug A 2“), die Rückfrage von draußen („Ihr Befehl Nr. 2“) ist nicht auflösbar, und die Nachweisung hat Lücken, die erst jemand in der Nachweisung-Sicht sucht. Im Ausgang erscheint bei mir „folgt (FmZ)“ als Vertröstung, auch nach der Beförderung als „—“.

**Vorschlag**
Beim „Befördern“ ohne Nummer zurückfragen oder „Befördern und nachweisen“ als einen Schritt anbieten; in der Warteschlange nicht nummerierte, beförderte Nachrichten weiter zeigen (Marke „ohne Nummer“); „folgt (FmZ)“ auch nach der Beförderung ersetzen durch „Nummer fehlt“.

### P1-7 Für die Übergabe gibt es keine Sicht „offen“, und der Zähler „mit Vorrang offen“ zählt mit, was meine Stelle schon erledigt hat

**Fundstellen**
- `packages/domaene/src/projektion/nachrichten.ts:172` (ein Vorrang ist „offen“, bis der gesamte Laufzustand ERLEDIGT ist)
- Posteingang: Chips „neu“, „gelesen“, „erledigt“ (Screenshots 27, 37); es gibt keinen Zustand „offen“ und keine Sicht „von mir noch zu bearbeiten, grüne Kopie“.
- Durchlauf: E 1 (Sofort) von S3 als erledigt markiert; im Band bleibt „mit Vorrang offen 3“ stehen (zwei Antworten, noch bei der FmZ, und E 1, weil S2 und S4 noch nicht erledigt haben). Aus der Zahl ist nicht abzulesen, welche davon meine sind.

**Beobachtung**
Bei der Schichtübergabe will der Nachfolger auf einen Blick sehen: Was liegt bei S3 noch offen, was ist erledigt, was wartet auf andere? Die Chips zeigen Zustände je Nachricht, nicht „noch zu tun für diese Stelle“; Kopiefarbe und Erledigtmarke müssen gedanklich verknüpft werden. Das Band zählt für alle Stellen.

**Auswirkung**
Die Übergabe bleibt mündlich. Ob ein grün gekennzeichneter Befehl bei mir noch offen ist, muss ich in der Liste suchen. Kommt nachts ein Blitz dazu, sinkt die Aussagekraft von „3“.

**Vorschlag**
Eigener Filter „offen für meine Stellen“ (grün oder blau, nicht erledigt) als Standardchip, Zähler im Band „offen bei meiner Stelle“ statt (oder neben) „offen insgesamt“, und ein Übergabeausdruck der offenen Posten der eigenen Stelle. Annahme: Die Einsatzakte ersetzt die Liste nicht, weil die Papierübergabe heute einen Stapel offener Vordrucke bedeutet.

---

## P2 – Mittel

### P2-8 Die Kopiefarbe ist nur ein schmaler Rand; „grün heißt bearbeiten“ steht nirgends als Wort

**Fundstellen**
- `Nachrichtenliste.tsx:66, 73-75` (Kopiefarbe nur als Rand der Zeile und als `title`/Screenreader-Text „Kopie grün“)
- Durchlauf: Posteingang, Zeile E 1 (Screenshot 27): grüner Streifen von etwa sechs Pixeln Breite, in der Spalte keine Beschriftung. Das Handbuch erklärt die Farben im Text; die Oberfläche erklärt sie nicht.

**Auswirkung**
Der Unterschied zwischen „bearbeiten“ (grün) und „zur Kenntnis“ (blau) ist genau das, was ich im Posteingang erkennen will. Bei schlechtem Licht, Farbsehschwäche oder aus zwei Metern Abstand ist der Streifen kaum zu halten.

**Vorschlag**
Eigene Spalte „Kopie“ mit Wort („grün · bearbeiten“, „blau · Kenntnis“, „rot · S2“) und Legende in der Kopfzeile.

### P2-9 Im Ausgang sehe ich nicht, wer die verteilte Nachricht gelesen hat

**Fundstellen**
- `Nachrichtenliste.tsx:84` (Ausgang zeigt für Gesprächsnotizen und Antworten nur „verteilt“)
- Durchlauf: Gesprächsnotiz „Telefonat Kreisverwaltung“ an S2 und S4: Zeile „Kopie rot verteilt“; die Kenntnisnahme steht erst im aufgeschlagenen Laufzettel („S2 · rot · neu, S4 · grün · neu“, Screenshot 29 für E 1 analog).

**Auswirkung**
Habe ich S4 etwas „zur Bearbeitung“ gegeben, muss ich die Nachricht öffnen, um zu sehen, dass er sie noch nicht angesehen hat.

**Vorschlag**
Im Stand der Zeile „verteilt · 1 von 2 gelesen“, mit den Stellen im Tooltip.

### P2-10 Der Hinweis auf eine eingegangene Nachricht gibt es nur bei Vorrang, ohne Zähler am Reiter, und er liegt am Seitenende

**Fundstellen**
- Durchlauf, Screenshot 53: S3 auf dem Blatt „Lage“, FmZ nimmt eine Blitz-Nachricht auf. Nach rund 8 s steht unter dem Arbeitsbereich ein Kasten „Hinweise: Blitz-Nachricht E 2 für S3: …“. Der Reiter „Nachrichten“ im Kopfband trägt keine Zahl. Der Kasten ist nicht anklickbar.
- Handbuch: „bei Blitz spielt das Programm zwei kurze Töne“ (Ton im Durchlauf nicht prüfbar; Annahme: wie beschrieben).

**Auswirkung**
Eine normale Nachricht ohne Vorrang wird auf Lage, Führungsstelle oder Einsatztagebuch nicht bemerkt; die Zahl „neu für meine Stellen“ gibt es nur im Blatt selbst. Bei langer Lage-Tabelle rutscht der Hinweis unter den sichtbaren Bereich.

**Vorschlag**
Zähler „neu“ am Reiter („Nachrichten 2“), Hinweis oben am Blatt fixieren und anklickbar machen („E 2 öffnen“).

### P2-11 Die Sichten sind auf 860 Pixeln Höhe zu lang: „Sichten“ liegt unter dem Rand, die Verteilermatrix ist gestreckt

**Fundstellen**
- `Laufzettel.tsx:48-60` (Kästchen und Auswahl „Kopie“ je Zeile untereinander)
- Durchlauf: Sicht „Sichter“ mit gewählter Nachricht (Screenshot 43): Laufzettel füllt den Bildschirm, der Knopf „Sichten“ ist ohne Scrollen nicht erreichbar; in der Maske „Eingang aufnehmen“ und der Gesprächsnotiz (Screenshots 25, 36) steht je Verteilerzeile ein Kästchen über einem vollbreiten Auswahlfeld, die Maske wächst um mehr als eine Bildschirmhöhe.

**Auswirkung**
Das Handbuch rühmt platzsparende Bedienung („Icon-Actions, tabellarisch“); hier stehen drei Verteilerstellen auf einer halben Bildschirmhöhe. Der Sichter muss für den Hauptknopf scrollen.

**Vorschlag**
Verteilerzeile einzeilig (Kästchen, Stelle, Farbe als Kurzwahl), „Sichten“ als fest sichtbare Fußleiste der Maske beziehungsweise des Laufzettels.

### P2-12 „Lesen“ setzt die Kenntnisnahme sofort und ohne Rücknahme

**Fundstellen**
- Durchlauf: Doppelklick auf E 1 öffnet den Vordruck und vermerkt „S3 · grün · gelesen 171323nov26 Mü“ (Screenshot 29); in der Leiste gibt es nur „Erledigt“ und „Erledigung zurück“, nichts für „ungelesen“.
- Konzept §5 („Wer sie dort aufschlägt, schreibt `NachrichtKenntnisGenommen`“).

**Auswirkung**
Ein versehentlicher Doppelklick im Posteingang hält für alle fest, dass der S3 die Nachricht gesehen hat, mit Zeit und Handzeichen. Die Unterscheidung „angesehen“ gegen „zur Kenntnis genommen“ gibt es nicht; die Marke „neu“ verschwindet auch, wenn ich nur die Spalte gesucht habe.

**Vorschlag**
„Gelesen“ erst nach einer Verweildauer oder per Knopf „Zur Kenntnis“; mindestens „Als ungelesen markieren“.

### P2-13 „Erledigt“ ohne Vermerk, und die Antwort ist in den Listen nicht mit dem Original verknüpft

**Fundstellen**
- `Konzept` §3 Feld 20 (Vermerke, Erledigung gehört dem Sichter); Posteingang kennt für meine Stelle nur das Kästchen „Erledigt“.
- Durchlauf: E 1 erledigt, danach A „Antwort: Pumpe 2 ausgefallen …“ (Betreff trägt den Bezug nur als Wort). In der Ausgangsliste steht kein Verweis auf E 1; im Tagebuch stehen beide Einträge ohne Querverweis (Screenshot 51).

**Auswirkung**
Auf dem Papier schreibe ich auf den Vordruck „erl. durch A 2, 1325, Mü“ und lege beides zusammen. Hier ist „erledigt“ ein Häkchen ohne Grund; bei der Übergabe lässt sich nicht sehen, wodurch.

**Vorschlag**
Beim Erledigen optional einen Vermerk und die Antwort als Bezug (aus „Antworten“ automatisch); „Bezug E 1“ als Spalte oder Tooltip in beiden Listen und im Tagebuch.

### P2-14 Der Ausgang hängt am Absendertext oder am Rechner, nicht an der Stelle (Annahme)

**Fundstellen**
- `packages/domaene/src/projektion/nachrichten.ts:94-105` (`istEigenerAusgang`: gleiche `clientId`, oder Absender oder Funktion steht in den Stellen des Arbeitsplatzes)

**Beobachtung (Annahme aus dem Code, nicht durchgespielt)**
Schreibe ich im Absender „FüSt S3“ oder „OV Wildeshausen, S3“ (die Maske lässt Freitext zu), taucht die Nachricht auf einem anderen Rechner mit Stelle S3, etwa beim Nachfolger an einem anderen Arbeitsplatz, nicht im Ausgang auf. Auf meinem eigenen Rechner bleibt sie sichtbar.

**Auswirkung**
Nach der Übergabe an einem anderen Rechner sind meine Ausgänge für den Nachfolger weg, wenn der Absender nicht genau „S3“ lautet.

**Vorschlag**
Verfassende Stelle als eigenes Feld der Nachricht führen und danach zuschneiden, nicht nach dem Freitext.

### P2-15 Die Nachweisung im Browser nur als HTML, ohne PDF für die Akte

**Fundstellen**
- Durchlauf: „Nachweisung ausgeben“ bietet in der Web-Schale nur „Nachweisung als HTML“ (Screenshot 50); Handbuch: „PDF (nur in der Desktop-App)“.

**Auswirkung**
Für die Akte brauche ich Papier oder PDF. Läuft ein Arbeitsplatz im Browser, bleibt der Umweg über den Browserdruck. Der Vordruck je Nachricht dagegen entsteht als PDF auch im Browser, gut. Annahme: Der Einsatzbetrieb nutzt die Desktop-App; für die Web-Schale ist es dann kein Mangel.

**Vorschlag**
Im Browser zumindest einen Druckstil (A4 hoch) für die HTML-Datei und einen Hinweis in der Ausgabe, wie daraus ein PDF wird.

---

## P3 – Komfort

### P3-16 Die Datum-Zeit-Gruppe nutzt Berliner Zeit, die Uhr im Kopf die Zeit des Browsers (Annahme für den Einsatz)

Fundstelle: `packages/domaene/src/zeit/datumZeitGruppe.ts:29` (`ZEITZONE = "Europe/Berlin"`). Im Durchlauf zeigte der Kopf „171218NOV26“, die gleichzeitig verfasste Nachricht „171318nov26“, weil die Sandbox in UTC läuft. Im Einsatz auf Windows mit deutscher Zeitzone fällt das nicht auf; bei einem Rechner mit falscher Zeitzone stünden zwei Uhren nebeneinander, ohne Hinweis. Vorschlag: Uhr im Kopf ebenfalls aus derselben Quelle, oder beim Abweichen eine Warnung.

### P3-17 „Antworten“ und „Weiterleiten“ belegen Übermittlungswunsch, Ruf-Nr. und Bezug nicht vor

Fundstelle: Screenshot 31 („Antworten“): Ruf-Nr. und Übermittlungswunsch leer, Betreff „Antwort: …“, Bezugsnummer nicht im Text. Die Ruf-Nr. der Gegenstelle steht im Eingang (Feld 11), und die Nachrichtennummer wäre für die Rückfrage am Funk die einzige eindeutige Kennung. Vorschlag: Ruf-Nr. übernehmen, Betreff „Antwort auf E 1: …“.

### P3-18 Im aufgeschlagenen Ausgang steht ein Laufzettel „noch nicht gesichtet“

Fundstelle: Screenshot 22, Ansicht A mit „Quittung —, Verteiler noch nicht gesichtet, Vermerke —“. Für einen Ausgang, der nie zum Sichter läuft (Vorbelegung nein, Entscheidung 8), ist der Abschnitt irreführend. Vorschlag: bei Ausgängen ausblenden oder „entfällt (Ausgang)“.

### P3-19 Der Hinweistext der Gesprächsnotiz sagt „beim Aufnehmen“

Fundstelle: Durchlauf, Kasten „Hinweise“: „Kein Sichter besetzt: Nachricht beim Aufnehmen verteilt.“ nach einer Gesprächsnotiz (Screenshot 37). Der Verfasser hat „aufgegeben“, nicht „aufgenommen“; die Maske sagt dort „beim Aufgeben verteilt“. Vorschlag: gleiches Wort.

### P3-20 Zwei gleiche Nachrichten hintereinander werden nicht erkannt

Fundstelle: Durchlauf; durch einen eigenen Skriptfehler lagen zwei Antworten mit gleichem Betreff, gleichem Inhalt und gleicher Minute in Ausgang und Nachweisung (Screenshots 38-Ausgang, 50), beide mit „Nachweisen“. Das System warnte nicht. Bei Funkverkehr ist ein doppelter Befehl nicht harmlos. Vorschlag: bei gleicher Anschrift, gleichem Betreff und gleichem Inhalt innerhalb weniger Minuten vor „Aufgeben“ fragen.

---

## Was gut gelöst ist

- Die Maske ist der Vordruck: drei Teile in der Reihenfolge des Blattes, FmZ-Teil und Laufzettel grau, Zeilenzähler gegen die zwölf Zeilen, Absender, Zeichen und Funktion aus Stelle und Handzeichen vorbelegt, Abfassungszeit als Datum-Zeit-Gruppe.
- Der Ausdruck stimmt mit dem Papier überein (gerendert: Felder 1 bis 20, Kästchen für Mittel, Vorrang und Verteiler, Nummer mit E/A); „Drucken“ liegt in jeder Sicht, in der Leiste und im Kontextmenü, auch beim beendeten Einsatz, und liefert als Datei „nachricht-E1-171322nov26.pdf“ mit „Öffnen“ und „Herunterladen“.
- Posteingang je Stelle statt je Person: Kenntnis und Erledigung gelten für das Sachgebiet, nicht für den Schichtführer; Marken „neu“, „gelesen“, „erledigt“ und „Posteingang von“ für andere Stellen.
- Laufzettel im Vordruck nennt je Stelle Kopie und Stand („S3 · grün · gelesen 171323nov26 Mü“); das ist die elektronische Entsprechung des Ablagekorbs.
- Der Ersatzsichter ist klar benannt („Kein Sichter besetzt: Die Nachricht wird beim Aufnehmen verteilt“), die Verteilung entfällt nicht still, und der Sichter bekommt die Nachricht trotzdem zum Nachsichten. Die Gesprächsnotiz hat beide Wege („Selbst verteilen“, „An den Sichter“).
- Die FmZ-Schritte tragen Zeit und Handzeichen und sind vorbelegt, aber änderbar (Nacherfassung vom Papier); „Annahme ändern“ ist vorhanden; Rückgängig steht in der Statuszeile und benennt den Schritt.
- Vorrang: Sofort und Blitz schließen sich in der Maske aus, die Sortierung stellt Blitz vor Sofort, die Hinweiszeile „Sofort-Nachricht E 1 für S3: …“ erschien nach etwa sechs Sekunden auch auf einem anderen Blatt.
- Das Einsatztagebuch führt jeden Schritt mit Zeit der Meldung, Handzeichen und Verteilung („gesichtet (Hz. Fm), verteilt an S2 (rot), S3 (grün), S4 (blau)“); das ist die Akte, die ich bei der Rückfrage brauche.
- Reload mit angefangener Maske fragt nach; Zurückziehen mit Pflichtgrund und die Nummernlogik („höchste bekannte plus eins“, Warnung bei doppelter Nummer) sind konzeptgemäß vorhanden.

## Nicht bewertet (in Arbeit)

- Station LdF: Festlegung des Fernmeldemittels, Sicht „ldf“, sechste Zahl im Band.
- Rote und grüne Kopie beim Ausgang (grüne Kopie zurück zum Verfasser, rote an S2). Der Verfasser erlebt sie derzeit als „ohne Kopie“ im Ausgang (Screenshot 10); sie hängt mit P0-1 zusammen.
