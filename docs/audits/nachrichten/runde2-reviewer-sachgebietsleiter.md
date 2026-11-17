# Audit Runde 2: Nachrichten (4-fach-Vordruck) aus Sicht des Sachgebietsleiters S3

Datum: 2026-11-17
Rolle des Prüfers: Sachgebietsleiter S3 in einer THW-Führungsstelle (Lage und Einsatz): verfasst Befehle an Einheiten draußen, bekommt Meldungen im Posteingang, hält Telefonate als Gesprächsnotiz fest, übergibt nach der Schicht und braucht den Vordruck für die Akte.
Stand: main a0e53b5.

## Scope und Methodik

- Zweite Runde nach `reviewer-sachgebietsleiter.md` (20 Befunde). Geprüft wurde an der **laufenden Web-Schale** (http://127.0.0.1:8080/, Chromium über Playwright, Viewport 1320 x 860), eigener Einsatz „Runde 2 S3“ (Übung, zwei Schichten). Jeder Browser-Kontext war ein eigener Arbeitsplatz: S3 (Hz. Mü) als Prüfer, FmZ (Fm), Sichter (Si; zeitweise zwei Sichter Sa und Sb), S2 (Zw), S4 (Ve), ein zweiter S3-Arbeitsplatz (Nf, Übergabe) und ein Kontext mit Rechnerzeitzone America/New_York. Fremde Einsätze wurden nicht angefasst. Der LdF war nicht besetzt (Ersatzregel „Kein LdF besetzt“); die Station LdF ist nicht Gegenstand dieser Rolle.
- Nachgestellt wurden alle 15 Befunde der ersten Runde mit Status „behoben“ oder „teilweise behoben“ (README, Stand a0e53b5 mit ungebuchten Durchläufen) sowie die vier „offen“ geführten und die zwei „bewusst nicht“ geführten, soweit mit wenig Aufwand prüfbar. Dazu die Schritte der Rolle aus `UEBUNG-NACHRICHTEN.md` (Minute 0, 5, 15, 25, 35, 55, 65, 80, 100): Stellenabfrage, Ausgang mit Vorrang, Annahme, Beförderung, Eingang mit Blitz und Sofort, Sichtung, Lesen, Erledigen, Antworten, Gesprächsnotiz (selbst verteilen und über den Sichter), Papier-Nachtrag, Übergabe an einen zweiten Arbeitsplatz, Vordruck als PDF (per pdftoppm gerendert).
- Ergänzend gelesen: `KONZEPT-NACHRICHTEN.md` §11 (Entscheidungen 1 bis 14), Abschnitt „Nachrichten“ in `docs/v2/HANDBUCH.md`, die Befundliste, gezielt der Renderer-Code (Zeilenangaben auf a0e53b5). Es wurde weder Quellcode noch ein anderes Dokument geändert; Messwerte (Pixel, Zeiten) stammen aus dem Durchlauf. Annahmen sind als solche gekennzeichnet.
- Umgebungsbedingt: Die Sandbox läuft in UTC. Der Ton bei Blitz (Entscheidung 6) ist im Browser nicht prüfbar; wo er betroffen ist, steht „Annahme“. Meine Testläufe haben Geisterarbeitsplätze in der Statuszeile hinterlassen („7 weitere Arbeitsplätze“) und zwei Testnachrichten ohne Sinn (E 8, E 9); das ist kein Befund. Die Präsenz einer frisch geöffneten Sichter-Sitzung brauchte einige Sekunden, bis die Maske „Kein Sichter besetzt“ zurücknahm; das wurde nicht gewertet (Sichter P3-4 ist bekannt).
- Nicht gewertet (bekannte Grenzen): stiller Druck an echtem Drucker, Mischbetrieb mehrerer Rechner auf dem Share.

## Nachgeprüft

Status laut Befundliste (README) und mein Ergebnis: **bestätigt** (Zustand wie behauptet), **nicht behoben**, **anders gelöst** (Ziel auf anderem Weg oder bewusst nicht gebaut).

| Kennung | Status laut README | Befund Runde 2 |
|---|---|---|
| SGL P0-1 | behoben | bestätigt: Ausgang zeigt „angenommen 2020 Fm · befördert 2022 Fm (Funk)“ mit Nr. 1, „erledigt“ steht nur noch beim Eingang; Rest zur Nummer siehe R2-SGL P2-5. |
| SGL P1-2 | bewusst nicht (Entscheidung 11) | anders gelöst: Gesprächsnotiz „Selbst verteilen“ an S2 und S4 funktioniert ohne FmZ; als Ausgang steht sie mit „E“, ohne Nummer; der Satz steht im Handbuch. |
| SGL P1-3 | behoben | bestätigt: Anschrift „S3, S4“ ergibt im Laufzettel S3 grün, S4 grün, S2 rot vorbelegt, bei Eingang und bei „An den Sichter“. |
| SGL P1-4 | behoben | bestätigt: „Übernehmen“ ohne Stelle und Handzeichen gesperrt, „Aufgeben“ ohne Absender und Zeichen gesperrt; die Stelle steht aber nur im Blatt Nachrichten („Meine Stelle: S3 · Hz. Mü“), in der Statuszeile nur als „ohne Stelle“. |
| SGL P1-5 | behoben | bestätigt: Esc und „Abbrechen“ fragen „Entwurf verwerfen?“ (Nebenpunkte: R2-SGL P3-2). |
| SGL P1-6 | behoben | bestätigt: „Befördern“ trägt Nummer vor, ohne Nummer erst nach zweitem Klick („Trotzdem ohne Nummer“), Karte „Ohne Nummer“ vorhanden; Rest im Ausgang: R2-SGL P2-5. |
| SGL P1-7 | behoben | nicht behoben: Der Zähler „mit Vorrang offen“ zählt jetzt je Stelle, aber im Blatt gibt es weder Sicht noch Chip „offen“ (nur „neu“, „gelesen“, „erledigt“); siehe R2-SGL P1-1. |
| SGL P2-8 | behoben | bestätigt: Spalte „Kopie“ im Posteingang mit Wort („grün: bearbeiten“, „rot: S2“); im Ausgang bleibt es beim Farbrand. |
| SGL P2-9 | offen | nicht behoben: Ausgang zeigt für die Gesprächsnotiz weiter nur „verteilt“, nicht wer gelesen hat. |
| SGL P2-10 | teilweise behoben | bestätigt als teilweise: Reiter „Nachrichten 2“ (bernsteinfarben) und Hinweiskasten oben am Blatt; der Hinweis ist weiter nicht anklickbar (`li.warnung`, Cursor „auto“) und nur bei Vorrang. |
| SGL P2-11 | behoben | bestätigt: „Sichten“ liegt bei 823 bis 854 px, „Aufgeben“ bei 806 bis 837 px, Verteilerraster zweispaltig mit G/B/R je Zeile (Restpunkt: R2-SGL P3-5). |
| SGL P2-12 | offen | nicht behoben: Doppelklick auf E 2 schreibt „S3 · grün · gelesen 172029NOV26 Mü“ ohne Rücknahme. |
| SGL P2-13 | offen | nicht behoben: „Erledigt“ ohne Vermerk; der Bezug steht jetzt immerhin im Betreff der Antwort („Antwort auf E 10: …“). |
| SGL P2-14 | behoben | bestätigt: Der zweite Arbeitsplatz mit Stelle S3 (Nf) sieht alle Ausgänge, auch den mit Absender „FüSt OV Oldenburg, S3 Lage“; S4 sieht keinen. |
| SGL P2-15 | bewusst nicht | anders gelöst: „Nachweisung ausgeben“ bietet im Browser nur HTML; für die Desktop-Schale kein Mangel (Annahme). |
| SGL P3-16 | behoben | bestätigt: Mit Rechnerzone America/New_York zeigen Kopf (172035NOV26) und Maske (172035nov26, 20:35) dieselbe Berliner Zeit; die Statuszeile nennt die Abweichung. |
| SGL P3-17 | behoben | bestätigt: Antwort auf einen Eingang mit Ruf-Nr. „FuA 12“ und Mittel Telefon übernimmt beides, Betreff „Antwort auf E 10: Rückfrage Pumpe“. |
| SGL P3-18 | behoben | bestätigt: unbeförderter Ausgang zeigt „Verteiler entfällt (Ausgang), Kopien mit der Beförderung“. |
| SGL P3-19 | behoben | bestätigt: Hinweiskasten nach der Gesprächsnotiz „Kein Sichter besetzt: Gesprächsnotiz beim Aufgeben verteilt.“, verfällt nach etwa 20 s. |
| SGL P3-20 | behoben | bestätigt: Zweiter identischer Ausgang innerhalb fünf Minuten löst „Dieselbe Nachricht an FGr WP 1 ist vor wenigen Minuten schon aufgegeben“ aus; Knopf wird „Trotzdem aufgeben“, ein Doppelklick lässt sie nicht durch (Restpunkt: R2-SGL P3-1). |

Von den 15 nachgestellten Befunden (behoben und teilweise) sind 14 bestätigt und 1 nicht behoben (P1-7). Gesamt über alle 20: 14 bestätigt, 4 nicht behoben (P1-7, P2-9, P2-12, P2-13), 2 anders gelöst (P1-2, P2-15).

## Kurzes Urteil aus Rollensicht

Gegenüber Runde 1 hat sich die Kernaufgabe „Befehl hinausgeben und wissen, ob er raus ist“ von „nur über den Vordruck“ zu „in der Liste ablesbar“ gewandelt: Annahme und Beförderung stehen mit Zeit und Handzeichen im Ausgang, die Nummer wird nachgetragen oder als „ohne Nummer“ gemahnt, grüne und rote Kopie kommen nach der Beförderung an, der Ausgang gehört der Stelle und nicht dem Rechner, der Verteiler folgt der Anschrift, ein versehentliches Esc und ein doppelter Befehl werden abgefangen. Das trägt im Betrieb.

Offen bleibt die Übergabe: Das Übungsdrehbuch verlangt für Minute 100 die Sicht „offen“, die das Blatt nicht hat (R2-SGL P1-1). Neu hinzugekommen ist mit dem Papier-Nachtrag ein Weg, der den FmZ-Teil und die Sichtung ohne Hinweis und ohne Marke beschreibbar macht (R2-SGL P1-2). Vieles Übrige sind Reibungen an neuen Teilen (Fokus, Hinweiskasten, Konfliktmeldung, Reiterzähler), keine Blockaden. Ich würde mit der Maske und der Liste in der Lagebesprechung arbeiten und die Übergabe weiter mit Zettel ergänzen.

---

## P0 – Einsatzkritisch

Keine neuen Befunde.

## P1 – Hoch

### R2-SGL P1-1 Die Sicht „offen“ für die Übergabe ist im Blatt nicht erreichbar, das Übungsdrehbuch setzt sie voraus

**Fundstellen**
- `apps/desktop/src/renderer/Nachrichten.tsx:66` (`Nachrichtensicht` kennt posteingang, ausgang, sichter, fmz, nachweisung, ldf) und `:155-159` (`CHIPS`: nur „neu“, „gelesen“, „erledigt“)
- `packages/domaene/src/projektion/nachrichten.ts:38, 180` (Sicht „offen“ ist in der Domäne da) und `nachrichtenzaehlung.ts:19-32` (die Zahl `OFFEN` wird berechnet, aber vom Renderer nicht gelesen)
- `docs/v2/UEBUNG-NACHRICHTEN.md:142-144` (Minute 100: „Die Sicht „offen“ genügt dafür“); Befundliste führt SGL P1-7 als „behoben“
- Durchlauf: zweiter S3-Arbeitsplatz (Nf), Posteingang: Chips „neu 8 · gelesen 1 · erledigt 1“, Umschalter Posteingang, Ausgang, Sichter, Fernmeldezentrale, Nachweisung; kein „offen“.

**Beobachtung**
Der Zähler „mit Vorrang offen“ im Band arbeitet jetzt je Stelle (nach „Erledigt“ von E 2 fiel er von 3 auf 2). Eine Sicht oder ein Chip „offen für meine Stelle“ fehlt. Mit den Chips „neu“ und „gelesen“ gemeinsam lässt sich das zusammenklicken (9 von 10 Zeilen), aber nirgends steht, dass das die offene Liste ist; die Handbuchstelle zur Übergabe fehlt ebenso.

**Auswirkung**
Der Nachfolger an Platz 1 findet das, was die Übung ihm zuschreibt, nicht. Ob „Sicht offen genügt“, ist damit nicht prüfbar; die Übung wird an dieser Stelle ins Tagebuch ausweichen.

**Vorschlag**
Chip „offen“ (nicht erledigt, mit Zahl) als Voreinstellung des Posteingangs oder als eigener Umschalter, Zahl aus `OFFEN`; Befundstatus P1-7 auf „teilweise“ zurücknehmen, bis das steht.

### R2-SGL P1-2 Der Papier-Nachtrag schreibt den FmZ-Teil und die Sichtung für jede Stelle ohne Hinweis und ohne Marke

**Fundstellen**
- `apps/desktop/src/renderer/Papiernachtrag.tsx:63-95` (`nachtragfehler` prüft nur Lesbarkeit und Handzeichenlänge; `nachtragFolge` setzt Annahme, Beförderung und Nummer in einem Zug) und `Nachrichtenmaske.tsx:348` (Schalter „Vom Papier nachtragen“ steht in jeder Verfassen-Maske)
- `KONZEPT-NACHRICHTEN.md` §11 Entscheidung 13 (Hinweis bei Schritten, die nicht von der eigenen Stelle sind) und Entscheidung 11
- Durchlauf: S3 (kein FmZ) hakt „Vom Papier nachtragen“ an und trägt Annahme „172010nov26 / Fm“, Beförderung „172012nov26 / Fm“, Nr. 7 ein. „Nachtragen“ geht ohne Hinweis. Ergebnis im Einsatztagebuch: „A 7 gesichtet (Hz. Fm), verteilt an S2 (rot), S3 (grün)“ (Akteur „Sichter · Fm“), „befördert (Funk, …, Hz. Fm)“, „nachgewiesen“, „angenommen“, alle Akteur „Fm“, Erfasst 20:33:53.

**Beobachtung**
Die Annahme- und Beförderungsmasken der FmZ warnen die falsche Stelle („Dieser Teil ist der Fernmeldezentrale vorbehalten …“, geprüft für S3: „Annehmen“ bleibt bis „Trotzdem“ gesperrt). Der Nachtrag umgeht das. Er trägt dazu die Sichtung mit dem Handzeichen der Beförderung ein, sodass die Nachricht ohne FmZ-Arbeitsplatz und ohne Sichter bei S2 und S3 im Posteingang liegt. Das Tagebuch kennzeichnet nicht, dass es ein Nachtrag war und dass S3 (Mü) ihn geschrieben hat; die Fachzeit zeigt 20:05 bis 20:12, nur die Spalte „Erfasst“ verrät den Zeitpunkt.

**Auswirkung**
Der Weg an FmZ und Sichter vorbei, den die Entscheidungen 11 und 13 ausschließen wollen, ist über den Nachtrag offen, und zwar mit fremdem Handzeichen im Akteur. Für die Akte unterscheidet sich eine echte Beförderung nicht von einem getippten Nachtrag. Annahme: Gemeint ist der Nachtrag für die FmZ am eigenen Platz nach Papierbetrieb; dafür genügt die Eigenmarke.

**Vorschlag**
Den Hinweis aus Entscheidung 13 auch im Nachtrag; im Tagebuch „nachgetragen vom Papier durch <Stelle · Hz.>“; Akteur das eigene Handzeichen, das Blatt-Handzeichen als Angabe im Vorgang.

## P2 – Mittel

### R2-SGL P2-1 Der Nachtrag prüft weder Zeitfolge noch Zukunft noch doppelte Nummer

**Fundstellen**
- `Papiernachtrag.tsx:63-74`
- Durchlauf: Nachtrag mit Abfassungszeit 172100nov26, Annahme 172010, Beförderung 171850, Nr. 1 (schon vergeben). „Nachtragen“ ging ohne Warnung durch. Nachweisung: „1doppelt“ in zwei Zeilen; Beförderung 18:50 vor Annahme 20:10, Abfassung 21:00 nach beiden (jetzt 20:35).

**Beobachtung**
Das Handbuch sagt für „Nachweisen“, die Maske warne vor einer vergebenen Nummer. Im Nachtrag fehlt die Warnung, ebenso eine Prüfung der Reihenfolge Abfassung, Annahme, Beförderung.

**Auswirkung**
Zeitreihen im Tagebuch und im Nachweis, die nicht zueinander passen, entstehen beim Nachtragen am leichtesten (Zahlendreher). Die Maske ist die einzige Stelle, an der es auffiele.

**Vorschlag**
Gleiche Nummernwarnung wie bei „Nachweisen“; weiche Warnung (kein Sperren) bei Folge verkehrt oder Zeit in der Zukunft; Mittel „Funk“ nicht vorbelegen, wenn der Nachtrag vom Papier kommt (die Maske setzt Funk still).

### R2-SGL P2-2 Der Konflikthinweis bei doppelter Nummer erklärt etwas anderes und liegt außerhalb des Bildes

**Fundstellen**
- `apps/desktop/src/renderer/statushinweise.ts:25-29` (Text „Zwei Arbeitsplätze haben dasselbe Feld fast gleichzeitig verschieden geändert … Felder tragen in der Tabelle ein ⚠“), `Statuszeile.tsx:121-122`, `Nachrichtenhinweise.tsx:75` (Diagnose)
- Durchlauf: Nach dem Nachtrag mit doppelter Nr. 1 steht „⚠ 1 Konflikthinweis“ in der Statuszeile jedes Arbeitsplatzes. Ein Klick klappt die Erklärung bei 860 px Höhe auf y = 878 aus, also unterhalb des sichtbaren Bildes (Seite scrollt nur um 31 px). Die Diagnose nennt den Grund als Rohschlüssel: „Nummer: nachweisnummerDoppelt“.

**Beobachtung**
Wer den Hinweis anklickt, sieht nichts und liest, wenn er scrollt, etwas über Tabellenfelder und Kollegen, nicht über eine doppelte Nachrichtennummer. In der Nachrichtenliste gibt es kein ⚠.

**Auswirkung**
Der Hinweis wird weggeklickt oder nicht verstanden; die doppelte Nummer, die in der Nachweisung nur an der Marke „doppelt“ hängt, wird dann nicht berichtigt.

**Vorschlag**
Text je Art („Nachrichtennummer A 1 ist doppelt vergeben, in der Nachweisung berichtigen“), Erklärung im Sichtbaren (oberhalb der Zeile oder als Flyout), Schlüssel in der Diagnose übersetzen.

### R2-SGL P2-3 Der erste Fokus der Verfassen-Maske liegt auf „Vom Papier nachtragen“, die ersten Tasten gehen ins Leere

**Fundstellen**
- `Nachrichtenmaske.tsx:348` (Nachtragsschalter als erstes Element der Maske)
- Durchlauf: Strg+N, danach „FGr WP 1“ getippt: Anschrift leer; Fokus liegt auf dem Kästchen. Ein Leerzeichen würde den Nachtrag-Modus einschalten und den FmZ-Teil leeren.

**Auswirkung**
Strg+N und lostippen ist der Weg, den der S3 bei einem Befehl wählt. Der Anfang des Textes fehlt, oder die Maske wechselt unbemerkt in den Nachtrag. Die Fokusfalle selbst hält (45 Tab und 15 Shift+Tab bleiben in der Maske, nach Esc steht der Fokus wieder auf „Nachricht verfassen“).

**Vorschlag**
Anfangsfokus auf „Anschrift“, der Schalter darf bleiben, wo er ist.

### R2-SGL P2-4 Der Hinweiskasten schiebt die Seite nach unten; Warnungen bleiben, Eigenes zählt mit

**Fundstellen**
- `Arbeitsplatz.tsx:204` (Hinweiskasten über dem Blatt), `Hinweiskasten.tsx` (Auskünfte verfallen nach 20 s, Warnungen nur mit „Löschen“)
- Durchlauf: Auf dem Blatt Lage steht „Abschnitt anlegen“ bei y = 235. Nach zwei Hinweisen (Sofort und Blitz) steht es bei y = 294, das ist ein Sprung um 59 px ohne Zutun. Das Band „Nachrichten“ trägt bei mir „8“ (Reiter und Band: „neu für meine Stellen“), davon sind vier von mir selbst verfasst (drei beförderte Ausgänge als grüne Kopie, eine Gesprächsnotiz) und liegen als „neu“ im Posteingang. Die Beförderung meines Sofort-Befehls A 2 löste bei mir den Hinweis „Sofort-Nachricht A für S3: Pumpe Deich Nord“ aus, bei Blitz wäre es, Annahme, auch der Ton (`nachrichtendienst.ts:211-216`).

**Auswirkung**
Springende Bedienelemente: Wer eine Einheit anfasst, wenn der Hinweis einläuft, trifft die Zeile darunter. Der Reiterzähler und der Vorrangshinweis verlieren ihren Wert, wenn ihn die eigenen Ausgänge füttern; „8 neu“ sind nur vier Eingänge von außen.

**Vorschlag**
Hinweiskasten ohne Layoutsprung (festgelegte Höhe oder überlagernd), Eigenes (Ausgang an eine Stelle derselben Sitzung) nicht als „neu“ und nicht als Eingangshinweis führen; mindestens ein Schalter „Eigene Ausgänge nicht melden“.

### R2-SGL P2-5 Im Ausgang steht nach der Beförderung ohne Nummer weiter „folgt (FmZ)“

**Fundstellen**
- `Nachrichtenliste.tsx:103-104` (`folgt` gilt für jeden Ausgang ohne Nummer)
- Durchlauf: A 2 nach „Trotzdem ohne Nummer“: Stand „angenommen 2040 Fm · befördert 2040 Fm (Funk)“, Spalte Nr. „folgt (FmZ)“ (Screenshot s43). Die FmZ führt sie unter „Ohne Nummer“.

**Auswirkung**
Der Verfasser liest, die Nummer komme noch, obwohl die FmZ sie bewusst nicht vergeben hat. Rest von SGL P1-6, dessen Vorschlag „Nummer fehlt“ lautete.

**Vorschlag**
Nach der Beförderung „Nummer fehlt“ statt „folgt (FmZ)“.

### R2-SGL P2-6 Die Stellenabfrage mit Merker lädt die Vorbelegung des Vorgängers, der Hauptknopf bestätigt sie

**Fundstellen**
- `Stellenabfrage.tsx:85` („der Fokus steht gleich auf „Übernehmen““) und `:100` („Zuletzt gewählt: S3 (Hz. Mü). „Übernehmen“ bestätigt.“)
- Durchlauf: Einsatz schließen und im selben Browser wieder öffnen: S3 und „Mü“ vorbelegt, Fokus auf „Übernehmen“; in einem fremden Browser leer. Der Merker liegt im Browser.

**Beobachtung**
Bei der Ablösung an Platz 1 (Übung, Minute 100) sitzt der Nachfolger am selben Rechner im selben Browser. Ein Enter genügt, und alles, was er schreibt, trägt das Handzeichen seines Vorgängers. Die Abfrage nennt es in einer Zeile, der Blick bleibt am Hauptknopf.

**Auswirkung**
Handzeichen sind der Nachweis, wer wann aufgegeben hat. Ein falsches Handzeichen fällt erst in der Rückfrage auf. Vorschlag: Fokus bei vorbelegtem Handzeichen auf das Handzeichenfeld, oder Handzeichen nicht vorbelegen und nur die Stelle merken (die Entscheidung 3 merkt beides; Annahme: Das Handzeichen ist an die Person, nicht an den Arbeitsplatz gebunden).

## P3 – Komfort

### R2-SGL P3-1 Die Rückfrage bei doppeltem Ausgang steht hinter der Fußleiste
Fundstelle: `doppelterAusgang.ts:48`. Der Text „Dieselbe Nachricht an FGr WP 1 ist vor wenigen Minuten schon aufgegeben (ohne Nummer). Noch einmal aufgeben?“ liegt bei y = 841, die Fußleiste der Maske beginnt bei 797. Sichtbar wird nur, dass der Knopf „Trotzdem aufgeben“ heißt. Vorschlag: Rückfragetext neben die Knöpfe in die Fußleiste.

### R2-SGL P3-2 Ein zweites Esc verwirft den Entwurf, ein verworfener Entwurf ist weg
Fundstelle: `Nachrichtenmaske.tsx` (Rückfrage „Entwurf verwerfen?“, „Esc oder „Verwerfen“ bestätigt“). Durchlauf: Esc, Esc: Maske zu, Strg+N: leer. Wer Esc zweimal drückt (Gewohnheit), hebelt die Rückfrage aus. Der Entwurf je Arbeitsplatz (Vorschlag aus P1-5) fehlt. Vorschlag: zweites Esc bricht die Rückfrage ab, Bestätigung nur mit „Verwerfen“.

### R2-SGL P3-3 Die Antwort auf eine Nachricht an mehrere Stellen trägt beide als Absender
Fundstelle: `nachrichtenformate.ts:234` (`antwortVorlage`). Antwort auf E 2 („S3, S4“): Absender „S3, S4“, Funktion „S3“. Vorschlag: Absender aus der eigenen Stelle der Sitzung.

### R2-SGL P3-4 Die Beförderung wird im Tagebuch und im Vordruck als Sichtung durch „Fm“ geführt; die Zeitfeldbeschriftung heißt „Quittung der Gegenstelle“
Fundstellen: Tagebuch „A 1 gesichtet (Hz. Fm), verteilt an S2 (rot), S3 (grün)“, Akteur „Sichter · Fm“; Vordruck-PDF „Quittung 2022 Fm“ (Feld 18) für einen Ausgang, den kein Sichter sah; `Fmzmasken.tsx:106` („Quittung der Gegenstelle (Datum/Uhrzeit)“ für die Beförderungszeit, in der Liste „befördert“). Die Liste sagt dem Verfasser nicht, ob die Gegenstelle tatsächlich quittiert hat; „mit Vorrang offen“ fällt erst, wenn ich meine eigene grüne Kopie erledige (Annahme: so gewollt als „Befehl noch offen“). Vorschlag: Beschriftung „Beförderungszeit“ und die automatische Verteilung der FmZ im Tagebuch als „Kopien nach Beförderung“ führen.

### R2-SGL P3-5 Die klebende Fußleiste „Sichten“ verdeckt die Hälfte des Verteilerrasters
Fundstelle: Sicht Sichter bei 860 px, Screenshot s19: sichtbar Leiter, S1, S2, S3; S4 bis Verbindungsstelle und Vermerke erst nach Scrollen. Wer sofort „Sichten“ drückt, hat S4 nicht gesehen. Vorschlag: Raster einspaltig kompakter (zwei Stellen je Zeile) oder Fußleiste niedriger.

### R2-SGL P3-6 Das Handbuch kennt den Papier-Nachtrag und den Hinweis auf die Rechnerzeit nicht, die Zeitzonenmeldung kehrt nach jedem Neuladen zurück
Fundstellen: Abschnitt „Nachrichten“ in `HANDBUCH.md` (kein „Vom Papier nachtragen“, nur die Übung nennt es); Kontext America/New_York: „Rechnerzeit America/New_York, Anzeige in Europe/Berlin ×“ wird mit „×“ geschlossen und steht nach Reload wieder da. Die Meldung sagt nicht, welche Zeit gilt. Vorschlag: Handbuchabsatz; Hinweis je Sitzung einmal, Satz „Alle Zeiten gelten in Berliner Zeit“.

---

## Was gut gelöst ist

- Der Ausgang sagt, was passiert ist: „angenommen 2020 Fm · befördert 2022 Fm (Funk)“ mit Nr. 1; Kopien nach Beförderung kommen als „grün: bearbeiten“ bei S3 und „rot: S2“ bei S2 mit Vermerk an.
- Stellenabfrage: Pflicht, Merker mit „Zuletzt gewählt“, „ohne Stelle“ in der Statuszeile; Posteingang mit Wort statt nur Farbstreifen.
- Verteilerraster: Anschrift wird zur grünen Kopie, S2 rot, die Warnung „Kein Hauptempfänger“ greift; „Sichten“ und „Aufnehmen“ bleiben auf 860 px ohne Scrollen erreichbar; die Konfliktmeldung bei zwei Sichtungen („Inzwischen von Sa gesichtet … Sie können nachsichten“) ist verständlich und verliert keine Eingabe.
- Hinweis am oberen Teil für Stellen ohne FmZ („Trotzdem“, Annahme gesperrt bis dahin); Ausgang nach Stelle trägt die Übergabe an einen zweiten Rechner.
- Reiterzähler und Hinweiskasten oben am Blatt zeigen den Blitz auch auf der Lage nach etwa drei Sekunden; Auskünfte verfallen von selbst.
- Der Vordruck als PDF stimmt mit dem Papier überein (Felder 1 bis 20, Kästchen, ETB-Nr., Vermerk der Kopien, Wasserzeichen „ÜBUNG“); die Maske zählt die Zeilen und nennt das Folgeblatt.
- Zeitzone: Kopf, Maske und Vordruck zeigen mit fremder Rechnerzone dieselbe Zeit, die Abweichung wird genannt.
- Fokusfalle in der Maske hält, Fokus kehrt zum Öffner zurück.
