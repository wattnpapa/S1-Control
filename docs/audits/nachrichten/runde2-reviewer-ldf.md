# Audit Nachrichten, Runde 2: Leiter des Fernmeldebetriebes (LdF)

Datum: 2026-11-17
Rolle des Prüfers: Leiter des Fernmeldebetriebes in der Fernmeldezentrale einer THW-Führungsstelle (Festlegung des Übertragungsmittels, Weisung im Fernmeldebetrieb, Verantwortung für die Nachweisung, Überwachung der Belastung der FmZ, beim Eingang Station zwischen Fernmelder und Sichter). Dieselbe Rolle wie in `reviewer-ldf.md` (erste Runde).
Stand: main a0e53b5.

## Scope und Methodik

- Scope: (1) Jeden Befund des ersten LdF-Audits (16 Befunde) nachstellen und bestätigen oder widerlegen, vor allem die mit Status „behoben“ oder „teilweise“ in der Befundliste (`README.md`). (2) Die neue Station LdF aus meiner Sicht: Parameter „LdF als eigene Station“, Sicht LdF, Übermittlungsvorschlag und Vorbelegung beim Fernmelder, Weitergabe an den Sichter beim Eingang, Ersatzregel bei unbesetztem LdF, Hinweis „den Fernmeldern vorbehalten“ bei fremden Stellen, Marken in Warteschlange und Nachweisung, Unterschriftszeile und Zeitraum der Nachweisungsausgabe, Sichterstau-Warnung. (3) Papier-Nachtrag und Druckverzeichnis mit Rückfrage. Nicht gewertet (bekannte Grenzen): stiller Druck an einem echten Drucker, Mischbetrieb mehrerer Rechner, PDF der Nachweisung (gibt es nur in der Desktop-App).
- Methodik: Die laufende Web-Schale unter `http://127.0.0.1:8080/` mit Playwright (Chromium, Viewport 1320 x 860). Jeder Browser-Kontext ist ein eigener Arbeitsplatz: S4 (Hz. Ru, verfasst), FMZ (Hz. Fm), LDF (Hz. Ld, ich), SICHTER (Hz. Si), S2 (Hz. Zw). Eigener Einsatz „Runde 2 LdF“, Parameter „LdF als eigene Station“ an. Fremde Einsätze der anderen Reviewer wurden nicht angefasst. Die Anzeige läuft in Europe/Berlin (20:13 bis 20:58), der Dienst-Rechner in UTC; der Hinweis in der Statuszeile nennt das.
- Durchlauf (Kennungen D1 bis D14 für die Fundstellen unten):
  D1 Parameter LdF an, fünf Kontexte öffnen. D2 Drei Ausgänge von S4 (einfach/Funk, Sofort/Telefon, Blitz ohne Wunsch), Warteschlange der FmZ und Sicht LdF lesen, FmZ nimmt an. D3 FmZ befördert den Blitz, bevor der LdF vorgeschlagen hat. D4 LdF schlägt für die Sofort-Nachricht vor (Fm2, Telefon); FmZ befördert abweichend über Funk. D5 Blitz ohne Annahme über „⋯ Befördern“, mit leerer Nummer (zweiter Klick). D6 Schwelle der FmZ 0 (abgelehnt), dann 5 statt 20 Minuten, damit die Marken in der Prüfzeit entstehen. D7 Eingänge: mit LdF besetzt und ohne Sichter (E 3), mit beiden besetzt (E 4, E 5), ohne Nummer; Weitergabe durch den LdF; Stau vor dem Sichter. D8 Hinweis „vorbehalten“: S4 nimmt an („Trotzdem“), FmZ schlägt vor; Tagebuch. D9 Nachweisung: Sprung auf Nr. 50, doppelte Nr. 1, „Berichtigen“, „Nachweisung ausgeben“ (HTML, gelesen). D10 Ersatzregel: LdF-Kontext geschlossen, Eingang aufnehmen und Ausgang befördern. D11 Papier-Nachtrag eines Eingangs (Nr. 8, Zeiten vom Blatt) mit Weitergabe. D12 Druckverzeichnis: Probedruck mit fehlendem Verzeichnis, „Anlegen und Probedruck“, „Übernehmen“. D13 Rücknahme eines Beförderns (Strg+Z). D14 Lesen und Vordruck „Wie gedruckt“ eines Ausgangs mit Vorschlag.
- Dazu gelesen: das erste Audit `reviewer-ldf.md`, die Befundliste `README.md`, `KONZEPT-NACHRICHTEN.md` (§5, §9, §11, Entscheidungen 1 bis 14), der Abschnitt „Nachrichten“ im `HANDBUCH.md`, das Übungsdrehbuch `UEBUNG-NACHRICHTEN.md`. Der Code diente nur zur Belegung von Ursachen (Datei:Zeile des Stands a0e53b5). Es wurde kein Quellcode und kein anderes Dokument geändert; geschrieben wurde nur diese Datei.
- Eine Berichtigung am eigenen Vorgehen: Die Rückfrage beim Übernehmen eines fehlenden Druckverzeichnisses ist ein `window.confirm` des Browsers; Playwright verwirft solche Dialoge von selbst, das sah zunächst wie „Übernehmen speichert nichts“ aus. Mit einem Dialog-Handler wiederholt (D12) arbeitet die Rückfrage wie beschrieben; diese Beobachtung ist deshalb kein Befund.
- Annahmen sind als „Annahme“ gekennzeichnet. Das Papier-Technische-Betriebsbuch (Vordruck 1103.1) und die Ausfüllanleitung kenne ich nur aus Konzept und Lehrunterlage, nicht als Original. Die Anwesenheitsprüfung (Präsenz) verfällt nach einigen Minuten; Ersatzfälle prüfte ich erst, nachdem der betreffende Kontext lange genug geschlossen war.

## Nachgeprüft

Status laut README, dann mein Befund: bestätigt (Verhalten wie behauptet), nicht behoben, anders gelöst (Weg weicht vom Vorschlag ab, siehe Satz).

| Kennung | Status laut README | Befund | Ein Satz |
|---|---|---|---|
| P0-1 Befördern ohne Annahme und Nummer | behoben | bestätigt | D5: „Befördern“ trägt die Annahme mit Zeit und Handzeichen der Beförderung nach, fragt bei leerer Nummer nach („Trotzdem ohne Nummer“, zweiter Klick), und die Nachricht steht danach in der Karte „Ohne Nummer“; Stand beim Verfasser „angenommen … befördert … (Funk)“ und im Lesen „verteilt“, nicht „erledigt“. |
| P0-2 Schwelle ab Eintreffen | behoben | bestätigt | D6: Unangenommene Nachrichten tragen „Wartet n min“, die Zeile wird bernsteinfarben und das Band zählt sie (3 bei 5 Minuten Schwelle), noch ohne Annahme. |
| P1-1 Station LdF | behoben | anders gelöst | Sicht LdF, Vorschlag, Weitergabe und Ersatzregel laufen (D2, D4, D7, D10); „Mittel festlegen“ ist aber ein Vorschlag, den der Fernmelder ohne Rückfrage umgehen kann, und die Vorbelegung auf Funk bleibt (R2-LdF P2-1, P2-2). |
| P1-2 Eingang ohne Nummer | teilweise behoben | nicht behoben | D7: Ein Eingang ohne Nummer wird ohne Rückfrage aufgenommen, vom LdF ohne Hinweis weitergegeben und vom Sichter verteilt; die Karte „Ohne Nummer“ führt nur beförderte Ausgänge, nur der Ausdruck trägt die Marke (R2-LdF P2-3). |
| P1-3 Nachweisung mit Mittel und Gegenstelle | behoben | bestätigt | Am Bildschirm stehen Mittel und Gegenstelle (D9); der Ausdruck führt das Mittel, aber keine Gegenstelle, ordnet die Spalten anders und zeigt Annahme und Beförderung ohne Tag (R2-LdF P2-5). |
| P1-4 Belastung der FmZ | behoben | bestätigt | Schwelle im Kopf der Warteschlange („Schwelle 5 min“), „Wartet“ je Zeile, Band mit „Vor dem LdF“ und „Vor dem Sichter“, Stau-Hinweis beim Sichter (D6, D7); offen bleibt die Uhr für Eingänge beim LdF (R2-LdF P1-2). |
| P2-1 Berichtigen mit nächster freier Nummer | behoben | bestätigt | D9: „Berichtigen“ der doppelten Nr. 1 öffnet mit 51 (höchste plus eins); die Warnung vor dem Schreiben und die Marke „doppelt“ in der Nachweisung stehen, die Marke fehlt weiter in der Warteschlange. |
| P2-2 Lücken und Sprünge | behoben | anders gelöst | Der Ausdruck nennt im Fuß „Fehlende Nummern: 6–49 · ohne Nummer: 4“; am Bildschirm steht keine Lücke, und der Sprung von 6 auf 50 wurde ohne Rückfrage geschrieben (R2-LdF P2-7). |
| P2-3 Stelle ist Zuschnitt, kein Recht | teilweise behoben | anders gelöst | D8: Der Hinweis „Dieser Teil ist der Fernmeldezentrale vorbehalten … Trotzdem eintragen?“ erscheint bei S4, das Tagebuch trägt „Grund: Eintrag durch S4, nicht FmZ“; die Marke „Verfasser = Nachweiser“ in der Nachweisung fehlt weiter (Zeile 51: „2034 Ru“ ohne Marke). |
| P2-4 Zeitzone | behoben | bestätigt | Kopfband, Masken, Hilfszeilen, Blatt und Ausdruck laufen auf Berliner Zeit (Kopf „172013NOV26“ und Maske „17.11.2026 20:18“ stimmen überein, der Rechner steht auf UTC), die Statuszeile nennt die Abweichung. |
| P2-5 Betriebsbuch am Schichtende | behoben | anders gelöst | Der Ausdruck trägt „Zeitraum von … bis …“, die Unterschriftszeile des LdF und einen schlanken Kopf; einen Zeitraum oder Nummernbereich wählen kann ich nicht, weil die Oberfläche `von` und `bis` nicht anbietet (R2-LdF P2-6). |
| P2-6 Absender in der Warteschlange | behoben | bestätigt | Die Warteschlange der FmZ trägt Absender und Wartezeit; der Wunsch steht dort nicht, aber in der Sicht LdF. |
| P3-1 „Nr. (E)“ bei gemeinsamer Zählung | behoben | bestätigt | Masken und Vordruck-Anzeige führen „Nr.“ und die Richtung als eigenen Wert. |
| P3-2 Schreibweise der Zeit | behoben | anders gelöst | Das Blatt schreibt die Datum-Zeit-Gruppe jetzt groß wie das Kopfband; der HTML-Ausdruck der Nachweisung und der Vordruck schreiben weiter klein („172016nov26“). |
| P3-3 Stelle bei jedem Neuladen | behoben | bestätigt | Nach „Neu laden“ bleibt die Sitzung mit Stelle und Handzeichen stehen, keine Maske (die Vorbelegung beim ersten Öffnen habe ich nicht gesondert geprüft). |
| P3-4 Hinweisliste und Einführungsband | behoben | bestätigt | Hinweiskasten mit Uhrzeit je Hinweis und „Löschen“ oben, das Band „Verstanden“ kommt nach dem Neuladen nicht wieder. |

Ergebnis: 10 bestätigt, 1 nicht behoben, 5 anders gelöst (16 Befunde).

## Kurzes Urteil im Vergleich zur ersten Runde

In der ersten Runde war die FmZ für den Fernmelder einsatzfähig, für den LdF nicht. Jetzt ist es anders: Die beiden P0 sind weg (nichts mehr verschwindet unbemerkt aus der Warteschlange, die Uhr läuft ab dem Eintreffen), die Nachweisung trägt Mittel, Gegenstelle, Wegmarke und am Ende Unterschriftszeile und Lückenfuß, und die Station LdF ist ein tragfähiges Werkzeug: zwei Karten, Vorschlag mit Fernmelder, Mittel und Gegenstelle, Vorbelegung der Beförderung, Ersatzregeln mit Hinweis. Papier-Nachtrag und Druckverzeichnis verhalten sich wie beschrieben.

Was mir als LdF noch fehlt, ist weniger die Funktion als die Aufsicht darüber, was an mir vorbeiläuft: Der Eingang hat beim LdF keine Uhr, der Eingang läuft ohne Sichter an mir vorbei, ein Befördern vor meinem Vorschlag hinterlässt keine Spur, und die Knöpfe meiner Eingangskarte liegen bei 1320 Pixeln hinter dem rechten Bildrand. Dazu bleibt ein Eingang ohne Nummer weiterhin ohne Rückfrage. Keiner dieser Punkte ist einsatzkritisch im Sinne von P0; drei sind P1, weil sie die Rolle des LdF selbst betreffen.

Gesamturteil: Für den Einsatz mit LdF-Station reicht der Stand, wenn der Überlauf der Eingangskarte (P1-1) vorher behoben und die Uhr für Eingänge beim LdF (P1-2) nachgezogen wird.

---

## P0 – Einsatzkritisch

Keine neuen Befunde.

## P1 – Hoch

### R2-LdF P1-1 Die Eingangskarte der Sicht LdF und die Karte „Vor dem Sichter“ liegen bei 1320 Pixeln über den Rand hinaus

**Beobachtung**
- D7: In der Sicht LdF steht die Karte „Eingänge vor der Weitergabe“ in der schmalen rechten Spalte. Bei 1320 x 860 ist die Tabelle dort abgeschnitten: „Aufnahme“ liegt halb draußen, der Knopf „An den Sichter weitergeben“ beginnt bei x = 1375 und ist mit 101 Pixeln Breite zweizeilig. Die Seite hat einen waagerechten Überlauf (`scrollWidth` 1484 bei 1320 Fenster; mit zwei Karten in der Sicht LdF 1493). Screenshot: `x-ldf.png`, `y-weitergabe-maske.png`.
- Dasselbe in der Sicht Fernmeldezentrale: Die Karte „Vor dem Sichter“ mit „Ich sichte jetzt selbst“ steht rechts unten und ist am Rand abgeschnitten (`scrollWidth` 1357; Screenshot `ad-fmz.png`, `ac-fmz.png`).
- Ursache: `.fmzkarten` ist ein Raster mit `minmax(0, 3fr) minmax(220px, 1fr)` (`apps/desktop/src/renderer/index.html:4542-4547`); die dritte und vierte Karte rücken in die schmale Spalte, ihre Tabellen brechen nicht um. Die Karten der Sicht LdF benutzen dieselbe Klasse (`apps/desktop/src/renderer/Ldfsicht.tsx:50,94`).

**Auswirkung**
Der Hauptknopf meiner Eingangskarte und der Knopf der Stau-Karte sind ohne waagerechtes Scrollen nicht zu sehen. Der Eingang ist dadurch genau der Teil meines Weges, den ich am leichtesten übersehe: Eine Blitz-Nachricht wartet am Rand. Das ist eine Bedienbarkeitslücke an der Hauptfunktion der neuen Station, kein Schönheitsfehler.

**Vorschlag**
Die Karten der Sicht LdF und die Karte „Vor dem Sichter“ untereinander oder in gleicher Breite anordnen; Tabellen in der schmalen Spalte umbrechen lassen; den Knopf nicht als Textknopf in der Tabellenzeile, sondern in einer eigenen Zeile oder als Icon mit Beschriftung. Bei 1320 Pixeln messen, nicht bei der Entwicklerbreite.

### R2-LdF P1-2 Ein Eingang beim LdF hat keine Uhr; die Stau-Warnung beginnt erst mit der Weitergabe

**Beobachtung**
- D7: Der Blitz-Eingang E 5 „Brücke gesperrt“ lag ab 20:38 in meiner Karte „Eingänge vor der Weitergabe“. Bis 20:45 (Schwelle 5 min) gab es keine Wartezeit in der Zeile, keine bernsteinfarbene Marke, keine Zahl im Band „Über der Schwelle“ (die 3 dort waren Ausgänge) und keinen Hinweis bei der FmZ. Screenshot: `an-ldf.png`.
- Der Eingang bei der FmZ nach der Weitergabe hat dagegen eine Uhr: Nach rund fünf Minuten erschienen die Hinweiszeile „1 Eingang wartet vor dem Sichter — wer aufgenommen hat, kann selbst sichten.“ und die Karte „Vor dem Sichter“ (`ad-fmz.png`). Gemessen wird ab der Weitergabe.
- Ursache: Die Wartezeit rechnet nur für Ausgänge (`wartezeitAusGrundlage`, `packages/domaene/src/projektion/nachrichtenstand.ts:175-179`) und für Eingänge nur im Laufzustand VOR_SICHTER (`vorSichterAusGrundlage`, ebenda `:183-186`); `vorLdf` zählt, aber misst nichts (`packages/domaene/src/projektion/nachrichten.ts:275`).
- Die Stau-Warnung erreicht nur die FmZ-Sicht (`apps/desktop/src/renderer/Sichterstau.tsx:56-66`), nicht den LdF, der die Nachricht gerade weitergegeben hat.

**Auswirkung**
Die Aufsicht über die Belastung (mein Auftrag aus P1-4 der ersten Runde) hat ein Loch genau dort, wo die neue Station sitzt: Ein Eingang kann beim LdF beliebig lange liegen, ohne dass Band, Zeile oder FmZ es zeigen. Wer den LdF zum Flaschenhals macht (abwesend, anderweitig im Funkverkehr), erzeugt einen Stau, den die Anzeige als „alles in Ordnung“ zeigt.

**Vorschlag**
Eingänge ab Aufnahme messen (Wartezeit in der Karte, eigene Zeile „beim LdF seit n min“, Zahl im Band). Die Stau-Warnung auch in der Sicht LdF zeigen und die Wartezeit je Station getrennt nennen: bei der FmZ, beim LdF, beim Sichter.

### R2-LdF P1-3 Ohne Sichter läuft der Eingang an der Station LdF vorbei

**Beobachtung**
- D7: Mit LdF besetzt und ohne Sichter schreibt „Eingang aufnehmen“ in einem Zug Aufnahme, Nachweisung und Sichtung als „Ersatzsichter“ (E 3, Tagebuch: „gesichtet … Grund: Kein Sichter besetzt: Ersatzsichter“). Der Eingang erschien nie in meiner Karte „Eingänge vor der Weitergabe“, es gab keine Weitergabe und keinen Hinweis an mich; die Maske nennt nur „Kein Sichter besetzt“.
- Das ist so entworfen: „Verteilt die FmZ im selben Zug (Ersatzsichter), braucht es keine Weitergabe“ (`apps/desktop/src/worker/laufwegfolgen.ts:9-11`). Das Handbuch sagt dagegen „läuft jede Nachricht der FmZ einmal über ihn“ (Abschnitt „Leiter des Fernmeldebetriebes“).

**Auswirkung**
Fällt der Sichter aus (Pause, Rechnerausfall), entfällt zugleich meine Prüfung von Aufnahmevermerk und Nummer, ohne dass ich es erfahre. Der Eingang wird vom Fernmelder allein aufgenommen, nummeriert und verteilt; die Prüfung, für die es die Station gibt, fehlt im Ausnahmefall am meisten.

**Vorschlag**
Entweder auch beim Ersatzsichter die Weitergabe des LdF verlangen (ein Klick mit „Trotzdem“, wenn der LdF nicht erreichbar ist) oder dem LdF eine Zeile „ohne meine Prüfung verteilt“ zeigen (Karte „Zur Kenntnis“, mit Nummer und Zeit). Handbuch bis dahin an den Fall anpassen.

## P2 – Mittel

### R2-LdF P2-1 Befördern vor meinem Vorschlag: nur ein Hinweis danach, Funk als stille Vorgabe, keine Spur im Betriebsbuch

**Beobachtung**
- D3, D5: Bei besetztem LdF befördert die FmZ ohne meinen Vorschlag. Ergebnis ist ein Hinweis in der Leiste („Befördert, bevor der LdF die Übermittlung vorgeschlagen hat.“) nach dem Schritt, ohne Rückfrage vorher. Der Blitz ohne Wunsch ging so über „Funk“ hinaus: Die Maske belegt auf Funk vor, wenn weder Beförderung, Vorschlag noch Wunsch da sind (`apps/desktop/src/renderer/Fmzmasken.tsx:96`, `?? "FUNK"`). Das ist der Punkt „Vorbelegen auf Funk ohne Festlegung entfällt“ aus meiner ersten Runde (P1-1).
- Der Vorgang ist danach nirgends zu finden: Tagebuch und Nachweisung (Ausdruck und Blatt) tragen keine Marke „ohne Vorschlag des LdF“; meine Karte zeigt die Nachricht nicht mehr, ohne dass ich sehe, dass sie übersprungen wurde (D3, `l-ldf.png`, `p-nw.png`, `p-tb.png`).
- Das Konzept sieht das ausdrücklich vor („Ist ein LdF da, aber kein Vorschlag geschrieben, befördert der Fernmelder trotzdem; nachgetragen wird nichts, der Hinweis sagt es“, §5). Bei Blitz ist das sinnvoll; die Folge ist die fehlende Spur.

**Auswirkung**
Der LdF kann später nicht belegen, welche Wege er festgelegt hat und welche der Fernmelder ohne ihn gewählt hat. Die Zuständigkeit (Folie 22) lässt sich weder ausüben noch nachweisen; bei Blitz ist die Umgehung der Normalfall, nicht die Ausnahme.

**Vorschlag**
Beim Befördern vor dem Vorschlag eine Wegmarke im Betriebsbuch („ohne LdF-Vorschlag“, in der Spalte Beförderung wie „Weg: … (Ld)“) und eine Zeile in meiner Sicht „ohne mich befördert“ für die letzte Schicht. Das Mittel ohne Wunsch und Vorschlag leer lassen und eine Wahl verlangen, statt Funk anzukreuzen.

### R2-LdF P2-2 Abweichung vom Vorschlag wird nicht markiert

**Beobachtung**
- D4: Ich schlug für „Pumpe nachführen“ Fm2, Telefon vor. Die FmZ (Hz. „Fm“) beförderte über Funk, ohne dass die Maske nachfragte (Mittel Telefon vorbelegt, Wechsel auf Funk ohne Hinweis). Im Blatt steht „Funk“ im Mittel und „Weg: Telefon (Ld)“ daneben; im Lesen „Mittel Funk“, „Vorschlag LdF Fm2 · Telefon …“; im Vordruck „Wie gedruckt“ ist Funk angekreuzt (`bh-lesen.png`, `bi-vordruck.png`).
- Auch den Fernmelder prüft nichts: Ich benannte Fm2, die Beförderung trug das Handzeichen „Fm“.
- Die Wegmarke ist gut, aber ein Unterschied zwischen Vorschlag und Beförderung wird nicht als solcher hervorgehoben.

**Auswirkung**
Ich muss die beiden Angaben selbst vergleichen; bei vielen Nachrichten findet das niemand. Eine Abweichung ist erlaubt (Funkstörung), sollte aber als Abweichung lesbar sein.

**Vorschlag**
In der Beförderungsmaske beim Wechsel weg vom Vorschlag einen Hinweis („Weicht vom Vorschlag des LdF ab: Telefon“); in Blatt und Ausdruck die Marke „abweichend“ neben „Weg: …“.

### R2-LdF P2-3 Die Weitergabe prüft nichts: ein Eingang ohne Nummer geht ohne Hinweis durch

**Beobachtung**
- D7: Ein Eingang ohne Nummer wird beim Aufnehmen ohne Rückfrage angenommen (Erste Runde P1-2; `apps/desktop/src/renderer/fmzformate.ts:47` „Leer lassen ist erlaubt“). Er stand in meiner Karte mit „Nr. —“, und die Weitergabe an den Sichter lief ohne Hinweis durch; der Sichter sah ihn mit „Nr. —“.
- Die Maske „An den Sichter weitergeben“ nennt nur die Überschrift „E Ohne Nummer Test“, Uhrzeit und Handzeichen. Kein Inhalt, keine Gegenstelle, keine Nummer, kein Aufnahmevermerk. Der Knopf trägt zwar den Hinweis „Aufnahme und Nachweisung geprüft: an den Sichter“, geprüft wird aber nichts (`y-weitergabe-maske.png`, `z3-sichter.png`).
- D11: Die Weitergabe mit einer Uhrzeit vor der Aufnahme (19:30 gegen 19:35) wird ohne Hinweis angenommen.

**Auswirkung**
Meine Station soll die Lücke im Betriebsbuch abfangen und tut es nicht. Der Knopf verspricht eine Prüfung, die er nicht macht.

**Vorschlag**
In der Weitergabemaske den Aufnahmevermerk zeigen (Mittel, Zeit, Handzeichen, Gegenstelle, Nummer) und ohne Nummer wie beim Befördern verfahren (Hinweis und zweiter Klick). Die Zeitfolge prüfen und warnen.

### R2-LdF P2-4 Die Sicht LdF zeigt nicht, was ich zum Entscheiden brauche; die Schwellenzahl mischt LdF und FmZ

**Beobachtung**
- D2, D7: Die Ausgangskarte der Sicht LdF führt Vorrang, Anschrift, Betreff, Wunsch und Annahme; es fehlen Absender, Nummer, Wartezeit und die bernsteinfarbene Marke, die die FmZ-Warteschlange hat. Das Band zeigt für mich „Über der Schwelle 1“, die betroffene Zeile in meiner Karte ist unmarkiert (`s-ldf.png`). Die Eingangskarte zeigt Absender, Betreff und Aufnahme, aber keine Gegenstelle (in der Spalte „Aufnahme“ nur Mittel und Zeit).
- Die Zahl „Über der Schwelle“ und die Spalte „Wartet“ der FmZ messen ab Eintreffen. Eine Nachricht „beim LdF“ trägt die Marke, aber keine Zeit „beim LdF seit n min“ (`ac-fmz.png`: Sandsäcke „seit 36 min“ Annahme, „beim LdF“). Wer am Stau schuld ist, FmZ oder LdF, ist nicht ablesbar.

**Auswirkung**
Ich sehe, dass etwas bernsteinfarben ist, und kann nicht sagen, ob ich oder der Fernmelder die Wartezeit verursacht habe. Die Beurteilung der Belastung (erste Runde P1-4) bleibt ein halber Schritt.

**Vorschlag**
Absender, Nummer, Wartezeit und Marke in die Karten der Sicht LdF; die Wartezeit je Station aufschlüsseln („bei der FmZ 3 min, beim LdF 33 min“).

### R2-LdF P2-5 Der Ausdruck der Nachweisung führt keine Gegenstelle, ordnet anders als das Blatt und mischt das Zeitformat

**Beobachtung**
- D9: Die Spalten im HTML-Ausdruck sind Nr., E/A, Vorrang, Mittel, Aufnahme, Annahme, Beförderung, Abfassung, Absender, Anschrift, Betreff, Sichtung, Marke (`packages/ausgaben/src/nachweisung.ts:20-33`). Die Gegenstelle fehlt, am Bildschirm steht sie. Die Reihenfolge weicht vom Blatt ab (Blatt: Vorrang, E/A, Nr., …).
- Annahme und Beförderung stehen ohne Tag („2017 Fm“, „2018 Fm“), die Aufnahme mit Tag („172026nov26“), die Abfassungszeit ebenfalls. Der Ausdruck schreibt die Datum-Zeit-Gruppe klein („172016nov26“), das Blatt groß („172016NOV26“).
- Annahme: Die Ausfüllanleitung verlangt für Feld 3 die Uhrzeit, für die anderen Datum und Uhrzeit; ob für den Nachweis eine Uhrzeit ohne Tag genügt, ist für mich nicht eindeutig. Über Mitternacht ist „1250“ ohne Tag nicht mehr eindeutig.

**Auswirkung**
Wer die Nachweisung gegen das Papier hält, findet Gegenstelle und Reihenfolge nicht wieder. Die Fälle sind selten, aber genau die Schichtübergabe betroffen, für die das Blatt gedacht ist.

**Vorschlag**
Gegenstelle in den Ausdruck; dieselbe Spaltenfolge wie das Blatt; Zeitformat je Vermerk einheitlich (mit Tag); Schreibweise der Datum-Zeit-Gruppe wie im Kopfband.

### R2-LdF P2-6 Der Zeitraum der Nachweisungsausgabe ist nicht wählbar

**Beobachtung**
D9: Das Menü „Nachweisung ausgeben“ bietet nur „Nachweisung als HTML“. Es gibt keine Eingabe für Schicht, Zeitraum oder Nummernbereich; der Ausdruck enthält immer alle Nachrichten (10 Zeilen, „Zeitraum von 17.11.2026 20:17 bis 17.11.2026 20:38“ wird aus den Zeilen berechnet). Der Kontrakt kennt `von` und `bis` (`apps/desktop/src/kontrakt/index.ts:919-924`), der Renderer schickt sie nicht (`apps/desktop/src/renderer/Nachweisung.tsx:101-112`). Die Unterschriftszeile („Datum / Uhrzeit | Handzeichen LdF | Unterschrift Leiter des Fernmeldebetriebes“) und der Fuß mit Nummernbereich und Lücken stehen im Ausdruck.

**Auswirkung**
Die Schichtübergabe um 08:00 und 20:00 braucht den Ausschnitt der Schicht; ohne Filter liefert die Ausgabe nach 12 Stunden die ganze Nachweisung und ich muss die Schicht von Hand abgrenzen. Das Schichtbuch ist damit nur auf dem Papier abgabefertig, nicht in der Anwendung.

**Vorschlag**
Zeitraum (von/bis mit „diese Schicht“ als Vorbelegung) und „ab Nr.“ im Menü anbieten und an den Kontrakt weiterreichen; der Bearbeiter im Kopf („Erstellt … · Arbeitsplatz“) trägt dann Stelle und Handzeichen.

### R2-LdF P2-7 Nummernsprung ohne Rückfrage, Lücken nicht am Bildschirm

**Beobachtung**
- D9: „Nachweisen“ mit Nr. 50 statt 6 wurde ohne Rückfrage geschrieben; danach belegen „Nachweisen“, „Eingang aufnehmen“ und der Papier-Nachtrag mit 51 vor (bei D10 und D11 gesehen). Die Rückfrage bei einem großen Sprung hat die Befundliste schon als „nicht belegt“ geführt.
- Die Lücke 6–49 steht nur im Fuß des HTML-Ausdrucks („Nummern 1 bis 50; Fehlende Nummern: 6–49 · ohne Nummer: 4“), nicht in der Nachweisung am Bildschirm und nicht im Band. Die Nummernlücken berechnet der Kern (`nummernluecken`), der Renderer zeigt sie nicht.

**Auswirkung**
Ein Zahlendreher setzt die Folge dauerhaft hoch, und ich sehe es erst beim Ausdruck. Für die Aufsicht über das Betriebsbuch ist der Bildschirm der falsche Ort, das zu erfahren.

**Vorschlag**
Bei einem Sprung größer als eins Rückfrage („Nr. 6 bis 49 bleiben leer, Papierbetrieb?“); in der Nachweisung und im Band eine Zeile „Nr. 6–49 nicht vergeben“.

### R2-LdF P2-8 Ein Befördern sind drei bis vier Schritte, und „Rückgängig“ nennt den falschen

**Beobachtung**
- D13: Nach „Befördern“ (ohne LdF) nennt der Knopf „Rückgängig: Nachricht A 53 ‚Undo Zwei‘ gesichtet“; der Dialog fragt „… gesichtet rückgängig machen?“. Die Beförderung selbst ist erst nach vier Bestätigungen zurückgenommen (Sichtung der Kopien, Nachweis, Vorschlag der Ersatzregel, Beförderung), mit sichtbaren Zwischenzuständen (nach dem dritten Schritt steht die Nachricht in der Karte „Ohne Nummer“ der FmZ). Mit besetztem LdF sind es nach dem Code drei Schritte (Annahme; nicht nachgestellt). Ursache: `Befördern` schreibt Folgeereignisse (`laufwegfolgen.ts:20-27`), und Strg+Z nimmt Ereignis für Ereignis zurück.
- Ein Fernmelder, der ein falsches Befördern zurücknehmen will, nimmt zunächst die Kopien an S2 und den Verfasser zurück.

**Auswirkung**
Im Einsatz ist das Zurücknehmen unbrauchbar: Die Beschriftung nennt nicht, was der Fernmelder rückgängig machen will, und das Betriebsbuch kann dazwischen halb zurückgenommene Zustände zeigen.

**Vorschlag**
Eine Rücknahme für „Befördern“ als Ganzes (die Folgeereignisse einer Handlung gemeinsam zurücknehmen) und in der Beschriftung die Handlung nennen („Befördern von A 53 zurücknehmen“).

## P3 – Niedrig

### R2-LdF P3-1 Hinweistext „der Fernmeldezentrale vorbehalten“ bei Schritten des LdF

D8: Der Hinweis „Dieser Teil ist der Fernmeldezentrale vorbehalten (Vordruck, Felder 1 bis 6)“ erscheint auch beim Vorschlag und bei der Weitergabe (Stellenvorbehalt, `apps/desktop/src/renderer/Stellenvorbehalt.tsx:32`). Der FmZ-Fernmelder bekommt ihn bei besetztem LdF für meine Schritte zu lesen (`ab-fmz-vorschlag.png`), mit dem falschen Absender des Vorbehalts; der Handbuchsatz „den Fernmeldern vorbehalten“ trifft die Rollen sauberer. Vorschlag: Für Vorschlag und Weitergabe „dem LdF vorbehalten (die FmZ darf ersatzweise, wenn kein LdF besetzt ist)“.

### R2-LdF P3-2 Akteur „LdF · Fm“ und „Sichter · Fm“ im Einsatztagebuch

D4, D10: Folgeschritte des Fernmelders tragen im Tagebuch die Stelle, deren Schritt sie ersetzen: „Übermittlung vorgeschlagen (durch Fm, …) — Akteur LdF · Fm“, „gesichtet (Hz. Fm) — Akteur Sichter · Fm“ bei den Kopien. Das Handzeichen ist richtig, die Stelle liest sich, als hätten LdF und Sichter gehandelt. Vorschlag: Stelle des Handelnden („FmZ · Fm“) und der Ersatz als Grund.

### R2-LdF P3-3 Marke „beim LdF“ und Zahl „Vor dem LdF“ bleiben bei unbesetztem LdF stehen

D10: Nach dem Schließen meines Kontextes trugen die Zeilen weiter „beim LdF“, und das Band zählte „Vor dem LdF 3“; der Hinweis „Kein LdF besetzt“ erscheint erst in der Maske. Vorschlag: Bei unbesetztem LdF „LdF nicht besetzt“ in Zeile und Band.

### R2-LdF P3-4 Fernmelder fest Fm1 bis Fm3; eigener Vorschlag nur über die FmZ-Sicht änderbar; Sicht nach Neuladen

- D4: Die Auswahl „Fernmelder“ kennt nur Fm1, Fm2, Fm3. Eine Zentrale mit anderen Namen oder mehr als drei Fernmeldern kann das nicht abbilden. Vorschlag: Freitext oder die besetzten Fernmelder aus der Anwesenheit.
- D13: Nach dem Vorschlag verschwindet die Nachricht aus meiner Sicht; ändern lässt sich der Weg nur in der Sicht der FmZ („⋯ Vorschlag“). Vorschlag: „Meine Vorschläge der Schicht“ mit Ändern in der Sicht LdF.
- Nach „Neu laden“ lande ich im Posteingang statt in der Sicht LdF (das Handbuch verspricht die Sicht LdF beim Wählen der Stelle).

### R2-LdF P3-5 Der Vordruck zeigt in der Zeile des Verfasserwunsches den tatsächlichen Weg

D14: Der Ausgang „Pumpe nachführen“ hat den Wunsch Telefon (Anzeige im Lesen), beförderte über Funk. Der Vordruck „Wie gedruckt“ kreuzt in beiden Zeilen (Weg Feld 1 und die zweite Kästchenzeile) Funk an. Der Code kennt für den Vordruck nur einen Weg (`packages/ausgaben/src/nachricht.ts:253-255`, Weg aus Beförderung, Vorschlag, Wunsch). Annahme: Die zweite Zeile ist der Übermittlungswunsch des Verfassers (Feld 7); ich habe kein Original zum Vergleichen. Vorschlag: Wunsch und Weg getrennt zeichnen.

### R2-LdF P3-6 Die Nachweisung am Bildschirm wird durch die Sichtungszeile hoch

D9: Die Sichtungszeile („Sichtung 2018 Fm · Verteiler … · Vermerke …“) steht in der schmalen ersten Spalte, jede gesichtete Nachricht belegt drei bis fünf Zeilen; bei 12 Nachrichten ist der Bildschirm voll (`ag-nw.png`). Vorschlag: Die Sichtung über die ganze Breite oder in eine ausklappbare Zeile.

### R2-LdF P3-7 Papier-Nachtrag belegt die Nummer vor

D11: Beim „Vom Papier nachtragen“ stehen Aufnahme und Abfassungszeit leer („vom Blatt“), die Nummer aber ist mit „höchste plus eins“ (51) vorbelegt. Wer die Papiernummer vergisst zu überschreiben, schreibt die Maschinennummer; nur eine doppelte Nummer warnt. Vorschlag: Beim Papier-Nachtrag die Nummer leer lassen und verlangen, oder die Vorbelegung ausdrücklich als „nächste freie“ kennzeichnen.

## Annahmen und nicht reproduzierte Beobachtungen

- Annahmen stehen im Text als „Annahme“ (Ausfüllanleitung, Rolle der zweiten Zeile im Vordruck, Zeitformat auf dem Papier).
- Einmal erschien nach dem Aufnehmen eines Eingangs in der Leiste „2 Eingänge warten seit 12 Minuten vor dem Sichter, kein Sichter besetzt“, obwohl der Sichter-Kontext gerade geöffnet war und die Maske ihn erkannt hatte (D10, `al-nach-aufnehmen.png`). Ich habe es nicht reproduzieren können (D12 mit wartendem Sichter lieferte „Diese Eingänge warten über der Schwelle auf den Sichter“). Ich vermute eine Verzögerung der Präsenz kurz nach dem Öffnen und werte es nicht.
- Die Schwelle stand für die Marken auf 5 Minuten; das Verhalten bei 20 Minuten habe ich nicht abgewartet, die Rechnung ist dieselbe.
- Papier-Nachtrag und Druckverzeichnis wurden in der Web-Schale geprüft (Automatikdruck mit vorhandenem Verzeichnis schrieb den Vordruck des Eingangs E 4, die Rückfrage bei fehlendem Verzeichnis wirkt beim Probedruck und beim Übernehmen). Den Drucker und die Desktop-App habe ich nicht angefasst.

## Was gut gelöst ist

- Die Sicht LdF ist schlicht: zwei Karten, Blitz oben, ein Hauptknopf je Karte; der Vorschlag trägt Fernmelder, Mittel und Gegenstelle, belegt das Mittel aus dem Wunsch vor, und der Fernmelder findet den Vorschlag in der Warteschlange und in der Beförderungsmaske wieder.
- Die Wegmarke „Weg: Telefon (Ld)“ in Blatt und Ausdruck macht meine Festlegung nachweisbar; der Ersatzvorschlag trägt das Handzeichen des Fernmelders.
- Die Ersatzregeln ohne LdF (Weitergabe beim Aufnehmen, Beförderung als Vorschlag) wirken und sagen es in der Maske und in der Leiste.
- Befördern ohne Annahme und Nummer ist sicher gelöst: Annahme wird nachgetragen und gesagt, Nummer mit zweitem Klick, Karte „Ohne Nummer“ hält die Lücke sichtbar.
- Die Schwelle steht im Kopf der Warteschlange, die Uhr läuft ab dem Eintreffen, Zeile, Zahl und „Wartet“ stimmen überein; 0 als Schwelle wird abgelehnt.
- Die Stau-Warnung beim Sichter und „Ich sichte jetzt selbst“ (inhaltlich) entlasten die FmZ; der Hinweis kommt nach der Schwelle und nennt den Weg.
- „Berichtigen“ beginnt mit der nächsten freien Nummer, die doppelte Nummer warnt vor dem Schreiben und steht markiert im Blatt; der Fuß des Ausdrucks nennt Nummernbereich, Lücken und „ohne Nummer“.
- Der Ausdruck trägt Zeitraum und Unterschriftszeile des LdF; der Kopf ist ohne Technikkennungen.
- Der Hinweis „vorbehalten“ mit „Trotzdem“ ist ein Hinweis, keine Sperre, und das Tagebuch führt „Eintrag durch S4, nicht FmZ“.
- Eine Anzeigezone für alles (Berlin), mit Hinweis bei abweichender Rechnerzeit.
- Papier-Nachtrag trägt Zeiten und Nummer vom Blatt; die Fachzeit im Tagebuch bleibt die vom Blatt.
- Das Druckverzeichnis legt nichts still an: Probedruck und „Übernehmen“ fragen nach, „Anlegen und Probedruck“ zeigt die geschriebene Datei.
