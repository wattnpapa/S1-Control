# Audit Runde 2: Nachrichten (4-fach-Vordruck) aus Sicht des ETB-Führers

Datum: 2026-11-17
Rolle des Prüfers: ETB-Führer, Führungsgehilfe im Sachgebiet 2; führt Einsatztagebuch und Lagekarte, bekommt die rote Kopie jeder Nachricht und muss nach dem Einsatz jede Nachricht nachweisen können.
Stand: main a0e53b5, Web-Schale unter http://127.0.0.1:8080/.

## Scope und Methodik

- Zweite Runde. Geprüft wurde, ob die im ersten Audit (`reviewer-etb-fuehrer.md`) als „behoben“ oder „teilweise behoben“ geführten Befunde (Status laut `README.md`) an der laufenden Anwendung halten, dazu drei neue Fragen: der Nachweis nach dem Einsatz mit LdF-Station, Konflikthinweise an Nachrichten in Diagnose und Tagebuch samt Hinweiskasten, und was eine Nachricht der Lagekarte nicht liefert. Außerdem die Vollständigkeit der Akte nach dem Beenden, gedacht gegen das Papier-Betriebsbuch.
- Werkzeug: Chromium über Playwright, Viewport 1320 x 860, je Arbeitsplatz ein eigener Browser-Kontext: S4 (Hz. Ru, verfasst), FmZ (Hz. Fm), LdF (Hz. Ho), Sichter (Hz. Si, später zusätzlich Hz. Zw für die Doppelsichtung) und S2 (Hz. Ak, ich). Eigener Einsatz „Runde 2 ETB“, am Ende beendet, nicht archiviert. Für die Gegenprobe zur Nummernlücke und zum Hinweiskasten kamen zwei kurze Einsätze „Runde 2 ETB Lücke“ und „Runde 2 ETB Hinweis“ dazu, beide ebenfalls beendet. Einsätze anderer Reviewer wurden nicht angefasst. Skripte und Screenshots liegen im Scratchpad `review2-etb/`.
- Gespielt wurden das Übungsdrehbuch (Minute 80, 90, 110) und die Folgen der Befundliste: Ausgang A 1 (verfassen, annehmen, befördern, Kopien); Eingang E 2 (aufnehmen, sichten, Kenntnis, erledigt); doppelte Nummer (E 3) und Berichtigung; Nacherfassung vom Papier (E 4: Aufnahme 1000, Abfassung 0955, Sichtung 1006); zwei gleichlautende Ausgänge, einer zurückgezogen; Zurückziehen der gesichteten und erledigten E 2; Nachsichtung (E 4); danach Einsatzparameter „LdF als eigene Station“ mit Vorschlag (A 5) und Weitergabe (E 6, E 8, E 7 bewusst liegen gelassen); Doppelsichtung zweier Sichter (E 8); Tagebuch am Bildschirm und als HTML, Nachweisung am Bildschirm und als HTML, Vordruck-PDF (mit `pdftotext` gelesen), Diagnose, Einsatz beenden, Einsatzakte (ZIP entpackt, Manifest gelesen), Sperre nach dem Beenden. Ein Kontext lief mit Browser-Zeitzone America/New_York.
- Code wurde nur zur Ursachenklärung gelesen; Fundstellen stehen bei den Befunden. Kein Quellcode und kein anderes Dokument wurde geändert.
- Annahmen sind mit „Annahme“ gekennzeichnet. Die Sandbox läuft in UTC; die Anzeige ist jetzt einheitlich Europe/Berlin (siehe P2-1 unten). Nicht gewertet, weil als bekannte Grenze benannt: stiller Druck, Mischbetrieb mehrerer Rechner, Anlagen an Nachrichten.

## Nachgeprüft

„Bestätigt“ heißt: Der Status laut README trifft zu (bei „teilweise“ mit dem dort genannten Rest). „Nicht behoben“: Der Kern des Befunds besteht fort. „Anders gelöst“: Das Ziel ist erreicht, aber an anderer Stelle oder nur zum Teil gegenüber dem Vorschlag.

| Kennung | Status laut README | Befund Runde 2 | Beleg in einem Satz |
|---|---|---|---|
| ETB P0-1 | behoben | bestätigt | Jede Zeile trägt die Nachricht (Knopf ✉ öffnet den Vordruck); „Im Tagebuch zeigen“ liefert für die zwei gleichlautenden „Verpflegung 40 Portionen“ genau 6 beziehungsweise 2 Zeilen, getrennt nach „A 5“ und „A“. |
| ETB P0-2 | behoben | bestätigt | Zeile „Nachweisnummer berichtigt (E 2 → E 3, Hz. Fm)“ mit Marke „Berichtigung“, Zeilen davor „E (jetzt E 3)“; der Filter „Nur Rücknahmen und Berichtigungen“ findet Berichtigung, Zurückziehen und Nachsichtung. |
| ETB P0-3 | behoben | bestätigt | Das HTML-Tagebuch führt Nr., Erfasst, Zeit lt. Meldung, Nachricht, Hz., Rechner und am Ende „Einsatztagebuch abgeschlossen 17.11.2026 20:39 … 43 Einträge“; die Nacherfassung E 4 (Fachzeit 10:00) steht in Schreibordnung mit beiden Zeiten, nichts springt unerklärt. |
| ETB P1-1 | behoben | bestätigt | Nach der Beförderung steht A 1 im Posteingang S2 (rot) und im Ausgang S4 (grün) mit Vermerk „Kopien nach Beförderung“; der Ausgang läuft als „verteilt“, nicht mehr „erledigt“. |
| ETB P1-2 | behoben | bestätigt | Der Laufzettel öffnet über „gesichtet“ als „Nachsichtung“, das Tagebuch führt „E 4 nachgesichtet (zweite Sichtung, Hz. Si)“ mit Marke; Feld 20 des PDF trägt „ETB-Nr. 7“ (siehe aber R2-ETB P1-2). |
| ETB P1-3 | teilweise behoben | bestätigt (teilweise) | „Berichtigen“ steht an jeder nummerierten Zeile; Grund, Zeit und Stempel stehen in Vorschau, Nachweisung, Tagebuch und PDF; Berichtigung anderer Felder und „ersetzt durch Nr.“ fehlen weiter, der Grund steht in der Lese-Ansicht erst in der Vorschau unten (R2-ETB P3-3). |
| ETB P1-4 | behoben | bestätigt | Ohne Absender bleibt „Aufnehmen“ gesperrt, daneben steht „Absender eintragen“. |
| ETB P1-5 | behoben | bestätigt | „Einsatzakte erzeugen“ meldet „Nachrichtenvordrucke: 8 neu erzeugt“ und legte Vordruck-PDFs, Nachweisung und Tagebuch bei; „Tagebuch als PDF“ meldet am Bildschirm „PDF gibt es nur in der Desktop-App“. Reste: R2-ETB P2-1. |
| ETB P1-6 | behoben | bestätigt | Der Dialog nennt „Nachrichten: 1 vor der FmZ, 1 beim LdF, 3 mit Vorrang ungelesen“; die Zahlen fehlen weiter in Tagebuch und Akte (R2-ETB P2-2). |
| ETB P1-7 | behoben | nicht behoben | Stelle und Handzeichen stehen bei Verfassen, Sichtung, Kenntnis und den LdF-Schritten („S4 · Ru“, „Sichter · Si“, „LdF · Ho“); „erledigt“ und „zurückgezogen“ haben weiter weder Handzeichen noch Fachzeit, das Zurückziehen und „Einsatz beendet“ zeigen als Akteur „Arbeitsplatz“, die FmZ-Schritte nur „Fm“; dazu falsche Stellen (R2-ETB P1-1). |
| ETB P2-1 | teilweise behoben | bestätigt (teilweise) | Ein Kontext mit Browserzone America/New_York zeigt dieselben Zeiten wie Berlin, die Statuszeile nennt „Rechnerzeit America/New_York, Anzeige in Europe/Berlin“; am Bildschirm fehlen das Jahr und die Option Datum-Zeit-Gruppe weiter („17.11. 20:28:57“), der Ausdruck führt Datum mit Jahr. |
| ETB P2-2 | behoben | anders gelöst | Der Ausdruck nennt „Nummern 1 bis 8; lückenlos · ohne Nummer: 1 · zurückgezogen: 2“ und bei 1 und 4 „Fehlende Nummern: 2, 3“; Bildschirm und Hinweiskasten melden den Sprung 1 auf 4 nicht. |
| ETB P2-3 | bewusst nicht | bestätigt (nicht gewertet) | Die Maske bietet keine Anlage. |
| ETB P2-4 | teilweise behoben | bestätigt (teilweise) | „Im Tagebuch zeigen“ filtert genau auf die Nachricht („6 Einträge (Filter: Nachricht A 5)“); ein Eingabefeld „Nachricht“ in der Kopfleiste gibt es nicht, der Ausdruck nimmt alle 43 Einträge ohne Filter; die 100-Zeilen-Grenze wurde nicht erreicht (Annahme: unverändert). |
| ETB P2-5 | teilweise behoben | bestätigt (teilweise) | Das Handbuch sagt jetzt ausdrücklich, dass „Lesen“ für jede eigene Stelle die Kenntnisnahme vermerkt; „erledigt“ trägt weiter kein Handzeichen (siehe P1-7). |
| ETB P2-6 | behoben | anders gelöst | Am Bildschirm stehen Mittel, Gegenstelle, Sichtung mit Verteiler und Grund; im HTML-Ausdruck fehlt die Gegenstelle, und Annahme, Beförderung, Sichtung stehen als „2014 Fm“ (HHMM mit Handzeichen) neben Aufnahme und Abfassung als Datum-Zeit-Gruppe. |
| ETB P2-7 | teilweise behoben | bestätigt (teilweise) | Nach dem Zurückziehen enthält der Neudruck von E 2 den Stempel „ZURÜCKGEZOGEN 172026nov26: Absender falsch erfasst, Neuaufnahme als E 5“; ein früher erzeugtes PDF bleibt unverändert in der Akte (R2-ETB P2-1). |
| ETB P3-1 | behoben | bestätigt | Spaltenkopf „Fachzeit“ mit Tooltip am Bildschirm; im Ausdruck heißt die Spalte weiter „Zeit lt. Meldung“ (R2-ETB P3-2). |
| ETB P3-2 | behoben | bestätigt | Spalten und Masken heißen „Nr.“; die Richtung steht als eigener Wert. |
| ETB P3-3 | behoben | bestätigt | Nach `page.close` sinkt die Zahl der „weiteren Arbeitsplätze“ binnen etwa 10 bis 20 Sekunden (vorher Minuten); bei hartem Kontextende dauert es ähnlich lang. |
| ETB P3-4 | behoben | bestätigt | Das Wort „zurückgezogen“ steht in Posteingang, Ausgang („Stand“) und Nachweisung neben dem Betreff. |
| ETB P3-5 | behoben | bestätigt | Bei der zurückgezogenen Zeile ohne Nummer gibt es kein „Nachweisen“, mit Nummer bleibt „Berichtigen“. |

Zahl: 19 bestätigt (darunter fünf mit dem im README genannten Rest und P2-3 als bewusste Grenze), 1 nicht behoben (P1-7), 2 anders gelöst (P2-2, P2-6).

## Kurzes Urteil im Vergleich zur ersten Runde

Die erste Runde endete mit „als Beweisstück reicht es noch nicht“. Das gilt so nicht mehr. Die drei P0 sind weg: Zeile und Nachricht hängen über die Kennung zusammen, Berichtigungen sind als solche erkennbar und filterbar, und der Ausdruck führt beide Zeiten, laufende Nummer, Handzeichen, Rechner und eine Abschlusszeile. Die rote Kopie beim Ausgang, die Nachsichtung, die ETB-Nr. in Feld 20, der Stempel mit Grund, die Pflicht zum Absender, die Offen-Zahlen beim Beenden und die Vordrucke in der Akte funktionieren, wie sie sollen. Ich würde diese Akte nach einem Einsatz abheften.

Was bleibt, ist ein anderer Stoff als in Runde 1: nicht fehlende Funktion, sondern Genauigkeit der Zuordnung „wer“ (zwei Stellen im Tagebuch sind falsch beschriftet), Ränder der Akte (alte Stände liegen neben neuen, die offenen Nachrichten stehen nur im Dialog) und Lücken zwischen Bildschirm und Ausdruck. Befunde: 0 x P0, 2 x P1, 8 x P2, 4 x P3.

## Was gut gelöst ist

- Das Tagebuch erzählt den LdF-Weg vollständig: „Übermittlung vorgeschlagen (durch Fm2, Funk, an THW OV Brake, Hz. Ho)“ und „an den Sichter weitergegeben (Hz. Ho)“ stehen mit Stelle LdF, Handzeichen und Zeit da; der Parameterwechsel „LdF als Station: nein → ja“ steht als eigene Zeile.
- „Im Tagebuch zeigen“ ist jetzt exakt: Auch gleichlautende Nachrichten sind getrennt, die Zeile „zurückgezogen“ nennt Grund, Abfassungszeit und Zeichen der gemeinten Nachricht.
- Die ETB-Nr. in Feld 20 ist die laufende Nummer der Anlagezeile im gedruckten Tagebuch und stimmt dort (E 2: 7, A 5: 18, E 7: 33, ohne Nummer: 25).
- Die Doppelsichtung wird gezeigt, nicht verschluckt: Marke „zwei Sichtungen“ im Posteingang, beide Sichtungen im Tagebuch, ein Eintrag „Konflikthinweise an Nachrichten“ in der Diagnose mit Knopf „Nachricht öffnen“.
- Die Nachweisung (HTML) trägt Fuß mit Nummernfolge, Stempel mit Grund, die Unterschriftszeile des LdF und die Abschlusszeile „Nachweisung abgeschlossen“.
- Beim Aufgeben einer gleichlautenden Nachricht fragt die Maske zurück („Trotzdem aufgeben“); die Nacherfassung vom Papier behält die Zeiten vom Blatt.
- Nach dem Beenden sind alle Nachrichtenaktionen gesperrt („Einsatz beendet – nur lesen“), Ausgaben bleiben möglich. Das Manifest der Akte hält Hash je Datei und Zustandshash.

---

## Neue Befunde

Kennung „R2-ETB P<n>-<m>“. Ein P0 wurde nicht gefunden.

## P1 – Wesentliche Lücken im Nachweis

### R2-ETB P1-1 Tagebuch nennt bei mehreren Schritten eine falsche Stelle

**Beobachtung**
- Beim Aufnehmen eines Eingangs steht als Akteur die Funktion des externen Absenders, nicht die der FmZ: „Nachricht E (jetzt E 2) aufgenommen … Akteur **EL** · Fm“, ebenso „Zugführer · Fm“ (E 3, E 8), „Gruppenführer · Fm“ (E 4), „Fahrer · Fm“ (E 6, E 7). Im HTML-Druck erscheint dieselbe Funktion als Akteur. Ursache: `stelleDer` nimmt bei `NachrichtVerfasst` das Feld `funktion` (`packages/domaene/src/projektion/tagebuch-nachrichtenbezug.ts:110`), und das ist beim Eingang die Funktion des Absenders draußen.
- Die automatische Kopie nach der Beförderung steht als „Nachricht A 1 gesichtet (Hz. Fm), verteilt an S2 (rot), S4 (grün) … Akteur **Sichter** · Fm“ (Zeilen 6 und 30 im Druck; `tagebuch-nachrichtenbezug.ts:111`: jede Sichtung ohne Ersatzgrund gilt als „SICHTER“). Der Vermerk „Kopien nach Beförderung“ steht nicht in der Zeile. Wer nur das Tagebuch liest, sieht einen Sichter mit dem Handzeichen des Fernmelders. Dieselbe Verwechslung zeigt die Nachweisung („Sichtung 2029 Fm“).
- Die FmZ-Schritte angenommen, befördert, nachgewiesen tragen keine Stelle (Bildschirm nur „Fm“, Druck „Arbeitsplatz“ in der Spalte Akteur). „Erledigt“ und „zurückgezogen“ sind weiter ohne Handzeichen (siehe Nachgeprüft P1-7).

**Auswirkung**
Eine falsche Zuordnung im Beweisstück ist schlimmer als eine fehlende: „EL“ liest sich wie ein Einsatzleiter, der etwas getan hat. Auf die Frage „wer hat E 2 aufgenommen, wer hat A 1 gesichtet“ gibt das Tagebuch eine zweifelhafte Antwort.

**Vorschlag**
`stelle` in die Nutzlast aller Nachrichtenereignisse schreiben (Stelle der Sitzung des Schreibenden, wie bei Kenntnis und Erledigung), `funktion` des Absenders nicht als Akteur verwenden; die Kopien nach der Beförderung als „Kopien nach Beförderung (FmZ)“ führen (mit `grund` wie beim Ersatzsichter).

### R2-ETB P1-2 ETB-Nr. steht auf Papier, ist aber am Bildschirm nicht auffindbar

**Beobachtung**
Der Vordruck trägt in Feld 20 „ETB-Nr. 7“, das gedruckte Tagebuch hat dazu die Spalte „Nr.“. Am Bildschirm hat das Tagebuch nur die Spalten Erfasst, Fachzeit, Vorgang, Akteur, Rechner. Es gibt keine Nummer, keine Sortierung danach und keine Suche nach „ETB-Nr. 7“ (Suchtext läuft über den Satz). Auch Lese-Ansicht und Nachrichtenliste zeigen die Nummer nicht; im Laufzettel der Ansicht steht der Vermerk ohne ETB-Nr. („Pegel an S4 zur Weiterleitung an OV“), im Vordruck darunter mit („ETB-Nr. 7 Pegel an S4 …“).

**Auswirkung**
Die ETB-Nr. soll den Querverweis Papier ↔ Tagebuch tragen. Wer im Einsatz am Bildschirm „7“ vom roten Durchschlag sucht, findet die Zeile nur durch Abzählen oder Ausdrucken.

**Vorschlag**
Spalte „Nr.“ im Bildschirm-Tagebuch (sortier- und suchbar), ETB-Nr. im Kopf der Lese-Ansicht.

## P2 – Verbesserungen für den Nachweis

### R2-ETB P2-1 Akte: Vordrucke und Ausgaben in alten Ständen liegen neben neuen, zurückgezogene Nachrichten ohne Vordruck

**Beobachtung**
- Die Akte („…_akte_2026-11-17_2040.zip“, 152 126 Bytes, 43 Ereignisse) enthält neben dem Tagebuch von 20:40 auch das von 20:36 und neben der Nachweisung von 20:40 die von 20:36, beide ohne „abgeschlossen“. Nichts in der Akte sagt, welche gilt (`ausgaben/tagebuch_…_2036.html`, `…_2040.html`).
- Das PDF `nachricht-E2-172019nov26.pdf` lag schon (von meinem Druck vor dem Zurückziehen); die Akte übernahm es unverändert, es trägt keinen Stempel „ZURÜCKGEZOGEN“, obwohl die Nachricht inzwischen zurückgezogen war. Die Meldung sagt „8 neu erzeugt, 0 lagen schon vor“, das Verzeichnis enthält neun. Ein Neudruck von Hand (gleicher Dateiname) hätte den Stempel gesetzt.
- Für die zurückgezogene Ausgangsnachricht ohne Nummer gibt es keinen Vordruck; die Akte hält sie nur in Nachweisung und Tagebuch fest.

**Auswirkung**
Die Akte kann einen veralteten Stand einer Nachricht als gültigen Vordruck führen. Das ist die Stelle, an der ein Prüfer „zurückgezogen“ nicht sieht.

**Vorschlag**
Beim Erzeugen der Akte vorhandene Nachrichten-PDFs neu schreiben (gleicher Name, aktueller Stand) oder Name mit Stand im Fuß tragen; alte HTML-Ausgaben nicht mitnehmen oder als „Stand 20:36, überholt“ benennen; zurückgezogene Nachrichten mit Stempel mitnehmen.

### R2-ETB P2-2 Offene Nachrichten stehen nur im Dialog, nicht im Tagebuch; Abschluss ohne Stelle und Handzeichen

**Beobachtung**
- Der Dialog nennt „Nachrichten: 1 vor der FmZ, 1 beim LdF, 3 mit Vorrang ungelesen“. Nicht genannt werden Nachrichten ohne Nummer (hier 1), ungesichtete (der Posteingang hatte E 7 ohne Sichtung), nicht erledigte (S2: fünf „neu“, eine „gelesen“) und nicht zugestellte Ausgänge. Die Tagebuchzeile „Einsatz beendet: 17.11.2026 20:39 (Grund: …)“ trägt nur meine Bemerkung, keine Zahlen. In der Akte ist der offene Stand nicht abgelegt (Vorschlag aus P1-6 nicht umgesetzt).
- Akteur „Arbeitsplatz“; die Abschlusszeile im Druck lautet „Einsatztagebuch abgeschlossen 17.11.2026 20:39, Arbeitsplatz · 43 Einträge“, ohne Handzeichen oder Stelle (`listen.ts`, Abschlusszeile).

**Auswirkung**
Wer die Akte später liest, erfährt nicht, dass E 7 nie weitergegeben wurde und eine Ausgangsnachricht nie angenommen. Die Verantwortung für den Abschluss hat kein Gesicht.

**Vorschlag**
Die Zahlen aus dem Dialog (vollständig, mit ohne Nummer, ungesichtet, nicht erledigt) in die Tagebuchzeile „Einsatz beendet“ schreiben; Abschlusszeile mit Stelle und Handzeichen des Beendenden.

### R2-ETB P2-3 Nachweisung zeigt die Weitergabe des LdF nicht

**Beobachtung**
Mit LdF-Station steht der Vorschlag nur als „Weg Funk (LdF Ho)“ in der Marke (HTML) beziehungsweise „2029 Fm Weg: Funk (Ho)“ unter Beförderung (Bildschirm). Fernmelder („Fm2“) und Zeit des Vorschlags fehlen. Die Weitergabe an den Sichter (E 6, E 8) erscheint weder am Bildschirm noch im HTML (`packages/ausgaben/src/nachweisung.ts:79-86`); E 7, aufgenommen und beim LdF liegen geblieben, sieht aus wie jede andere unsichtbare Zeile ohne Sichtung. Das Tagebuch führt beide Schritte vollständig.

**Auswirkung**
Die Nachweisung soll den Weg jeder Nachricht belegen; mit LdF fehlt ein Glied. „Ist E 7 liegen geblieben oder noch beim Sichter?“ lässt sich nur im Tagebuch beantworten.

**Vorschlag**
Spalte oder Marke „Weitergabe 2031 Ho“ und „Vorschlag Fm2 Funk 2029 Ho“; Marke „wartet beim LdF“ für aufgenommene, nicht weitergegebene Eingänge.

### R2-ETB P2-4 Doppelsichtung: Konflikt ist in der Diagnose, aber ohne Nachricht und Wert

**Beobachtung**
- Die Diagnose führt „Konflikthinweise an Nachrichten: Sichtung: zwei Arbeitsplätze haben verschieden vermerkt [Nachricht öffnen]“ (`Nachrichtenhinweise.tsx:51`), ohne Nummer, Betreff oder die beiden Verteiler. Der Hilfetext darüber verspricht „Er nennt Feld, Gewinner und verdrängten Wert“. Die Statuszeile zählt „⚠ 1 Konflikthinweis“ und erklärt nur allgemein.
- Im Tagebuch stehen beide Sichtungen (Hz. Zw, Hz. Si), jede mit ihrem Verteiler; der wirksame Verteiler (Vereinigung) steht nirgends im Tagebuch. Die Nachweisung zeigt ihn als „S2 (rot), S3 (grün), S4 (grün), Leiter (blau)“, also zwei grüne Hauptempfänger, ohne Marke „zwei Sichtungen“ (nur der Posteingang hat sie).
- Die Diagnose-Tabelle „Arbeitsplätze“ nennt alle Arbeitsplätze „Arbeitsplatz“, ohne Stelle und Handzeichen; wer der zweite Sichter war, geht daraus nicht hervor.

**Auswirkung**
Der Konflikt ist da, aber der ETB-Führer kann aus Diagnose und Tagebuch nicht sagen, welche Nachricht und welche Entscheidung betroffen ist, außer er klickt jeden Eintrag.

**Vorschlag**
Eintrag mit „E 8 Deichbruch droht: Sichtung Zw (S2, S4, Leiter) gegen Si (S2, S3)“; Marke „zwei Sichtungen“ in der Nachweisung; Tagebuchzeile der zweiten Sichtung mit wirksamem Verteiler.

### R2-ETB P2-5 Tagebuchzeile bildet nicht ab, was die ETB-Führung beim Lesen braucht

**Beobachtung**
Die Zeile nennt Nummer, Absender, Anschrift und Betreff, aber nicht den Vorrang (die Blitz-Nachricht E 8 „Deichbruch droht“ steht wie jede andere), nicht Mittel und Gegenstelle beim Aufnehmen (erst bei „befördert“) und nicht den Vermerk des Sichters (E 4 „Nachtrag: S4 zur Kenntnis, Abladeplatz klären“ steht in Nachweisung und Vordruck, nicht im Tagebuch). Der Inhalt ist nur über ✉ erreichbar.

**Auswirkung**
Die Lage lässt sich aus dem Tagebuch nicht lesen, ohne jede Nachricht zu öffnen; ein Blitz fällt in der Zeile nicht auf.

**Vorschlag**
Vorrang als Marke oder Präfix („Blitz“), Mittel und Gegenstelle bei der Aufnahme, Vermerk des Sichters im Satz oder als Tooltip.

### R2-ETB P2-6 Nachricht und Lagekarte sind nicht verbunden

**Beobachtung**
Das Datenmodell kennt `anschriftBezug` und `absenderBezug` (`packages/domaene/src/katalog/schemata-nachrichten.ts`, `zustand-nachricht.ts`), die Oberfläche schreibt und liest sie nicht (Suche in `apps/` ohne Treffer). Anschrift und Absender sind Freitext, auch wenn die Maske Einheiten und Abschnitte vorschlägt. Aus einer Nachricht ist damit nicht ablesbar: welche Einheit oder welcher Abschnitt gemeint ist, ein Ort oder eine Koordinate, die Zeit des Ereignisses (nur die Abfassung), eine Lageänderung (Einheit eingetroffen, Status, Stärke). Der Tagebuchfilter „Einheit/Abschnitt“ findet Nachrichten deshalb nicht (Annahme aus dem Code: `abschnittId` und Einheit werden nur bei Lageereignissen gesetzt; nicht mit angelegten Einheiten gegengeprüft). Von der Nachricht zur Lagekarte führt nur der Weg über Abtippen.

**Auswirkung**
Die Nachricht „Pumpen eingetroffen“ ändert nichts an der Lage; der ETB-Führer trägt sie zweimal ein (einmal als Nachricht, einmal als Lageänderung) und beide stehen unverbunden im Tagebuch.

**Vorschlag**
Anschrift und Absender mit Bezug auf Einheit und Abschnitt füllen, wenn aus der Liste gewählt; Knopf „In die Lage übernehmen“ an der Nachricht (Einheit, Status, Zeit vorbelegt); Tagebuchzeile mit Bezug.

### R2-ETB P2-7 Handzeichen sind nicht auf Personen und Stellen zurückführbar

**Beobachtung**
Handzeichen sind zwei bis vier freie Zeichen. Nach dem Beenden liegt nichts mehr vor, das „Fm“, „Si“, „Ak“, „Ru“, „Ho“ einer Person oder Stelle zuordnet: Die Präsenzdateien des Einsatzes sind nach dem Schließen leer, die Akte enthält kein Verzeichnis, und die Zeile trägt den Anzeigenamen „Arbeitsplatz“. Annahme: Im Papierbetrieb gibt es dafür ein Handzeichenverzeichnis oder die Dienstpläne.

**Auswirkung**
Ein Handzeichen ohne Verzeichnis ist als Beweis dünn, zumal es nicht eindeutig sein muss (zwei Bediener „Fm“ an zwei Schichten).

**Vorschlag**
Beim Öffnen die Zuordnung Handzeichen, Stelle, Name als Ereignis festhalten (eine Zeile im Tagebuch) und als Verzeichnis in die Akte legen.

### R2-ETB P2-8 Annahme: ETB-Nr. ist eine berechnete Reihenfolge und kann sich verschieben

**Beobachtung**
`etbNummern` zählt die Zeilen in HLC-Ordnung bei jedem Lesen neu (`packages/domaene/src/projektion/nachrichtenzusatz.ts:133-136`); die Nummer wird nicht festgeschrieben. Das gilt, solange alle Ereignisse in Schreibordnung eintreffen. Annahme: Schreibt ein Arbeitsplatz bei „Share nicht erreichbar“ weiter und liefert später nach, ordnen sich seine Ereignisse mit älterer Uhr mitten in die Folge ein, und die ETB-Nr. aller späteren Zeilen verschiebt sich um eins, auch die auf Papier und in PDFs schon geschriebenen. Nicht ausgelöst (kein Mischbetrieb geprüft).

**Auswirkung**
Eine auf Papier geschriebene Nummer darf sich nicht ändern (Konzept §9 sagt es für die Nachweisungsnummer). Für die ETB-Nr. gilt dasselbe, der Fall ist aber der Störfall 1 der Diagnose, kein Randfall.

**Vorschlag**
ETB-Nr. beim Schreiben des ersten Ereignisses der Nachricht festschreiben (Nutzlast) oder in der Akte die Zuordnung Nummer ↔ Ereignis ablegen und den Ausdruck daran ausrichten.

## P3 – Feinschliff

### R2-ETB P3-1 Hinweiskasten: Warnung zur doppelten Nummer verschwindet nach 20 Sekunden

Der Hinweis „Die Nummer 1 ist bereits vergeben (E 1 …)“ stand nach 1 s im Hinweiskasten und war nach 26 s weg, obwohl der Kopfkommentar von `Hinweiskasten.tsx` verspricht, dass Warnungen bleiben (`INFO_VERFALL_MS = 20_000`, Zeile 21). Die Marke „doppelt“ in der Nachweisung und der Konflikthinweis in der Statuszeile bleiben, also kein Verlust, aber wer in dieser Zeit woanders hinsieht, hat den Hinweis nie gelesen. Außerdem sagt der Hinweis „berichtigt wird mit ‚Nachweisen‘“, der Knopf heißt „Berichtigen“, und der Dialog heißt „Nachweisen · E 2 …“; ein Titel „Berichtigen“ wäre klarer.

### R2-ETB P3-2 Druckkopf und Beschriftungen

Im Kopf jedes HTML-Ausdrucks steht die Zeile „@bos/eeb-format 0.0.0“ (`packages/ausgaben/src/index.ts:52`), die auf dem Beweisstück nichts bedeutet. Die Spalte heißt im Druck „Zeit lt. Meldung“, am Bildschirm „Fachzeit“; „Erfasst“ ist im Druck ohne Sekunden, am Bildschirm mit.

### R2-ETB P3-3 Lese-Ansicht einer zurückgezogenen Nachricht

Der Kopf „Nachricht E 2 · zurückgezogen“ nennt weder Grund noch Zeit; beides steht im Stempel der Vorschau darunter (erst nach Scrollen sichtbar). Ein Satz unter der Überschrift („zurückgezogen 2026 von … wegen …“) genügt.

### R2-ETB P3-4 Zurückziehen nach Verteilung

Das Zurückziehen einer gesichteten, von S2 erledigten und an S4 grün verteilten Nachricht fragt dasselbe wie bei einer Fehlanlage („Eine Fehlanlage wird zurückgezogen …“) und sagt nicht, wer die Nachricht schon hat. Annahme: Was S4 danach sieht (nur die Marke im Posteingang), wurde nicht geprüft.

---

## Zusammenfassung zu den drei Fragen

| Frage | Befund |
|---|---|
| Nachweis nach dem Einsatz mit LdF-Station | Tagebuch vollständig (Vorschlag mit Fernmelder, Mittel, Gegenstelle; Weitergabe mit Handzeichen); Nachweisung nur mit „Weg Funk (LdF Ho)“, Weitergabe fehlt (R2-ETB P2-3). Beenden nennt „1 beim LdF“. |
| Konflikthinweise und Hinweiskasten | Konflikt in Diagnose (mit „Nachricht öffnen“) und Posteingang („zwei Sichtungen“), aber ohne Nummer und Werte (R2-ETB P2-4); Kasten oben, mit Uhrzeit, verfällt nach 20 s auch bei Warnung (R2-ETB P3-1). |
| Was die Lagekarte aus einer Nachricht nicht bekommt | Einheit/Abschnitt (Bezug nicht gesetzt), Ort, Ereigniszeit, Lageänderung, Vorrang und Inhalt in der Tagebuchzeile (R2-ETB P2-5, P2-6). |
| Akte gegen Papier-Betriebsbuch | Vordrucke (nicht zurückgezogene), Nachweisung mit Unterschriftszeile, Tagebuch mit Abschlusszeile, Ereignisse mit Hash: ja. Offen: veraltete Stände und stempelloses E 2 (P2-1), Offen-Zahlen (P2-2), Handzeichenverzeichnis (P2-7), Nachweisung und Tagebuch nur als HTML in der Web-Schale (PDF nur Desktop). Annahme: Der Papierbetrieb verlangt zusätzlich die unterschriebene Nachweisung; die Unterschriftszeile steht, aber die Akte enthält keinen Beleg der Unterschrift. |
