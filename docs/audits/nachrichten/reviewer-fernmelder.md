# Audit: Nachrichten (4-fach-Vordruck) aus Sicht der Fernmeldezentrale (Fernmelder)

Datum: 2026-11-17
Rolle des Prüfers: Fernmelder (Sprechfunker) in der Fernmeldezentrale einer THW-Führungsstelle. Arbeitet unter Funklast, mit Headset, schnell, oft mit Funkzeit statt Wanduhr, und wechselt bei Rechnerausfall sofort auf den Papierblock und trägt später nach.

## Scope und Methodik

- Geprüft wurde die **laufende Anwendung** (Web-Schale, `http://127.0.0.1:8080/`, Stand main `15ecdbd`), mit Playwright/Chromium, Viewport 1320 x 860, eigener Einsatz „Review Fernmelder“. Zwei bis drei Browser-Kontexte waren gleichzeitig offen (FmZ „Fm“, zweiter Fernmelder „Fz“, Stab S3 „Ke“), um Warteschlange, weiche Sperre und Konflikt zu erzeugen. Verbindungsausfall wurde mit `setOffline` im Browser nachgestellt, der Dienst blieb laufen.
- Gelesen wurden vorab `docs/audits/README.md`, `docs/audits/thw-command-reviewer.md` (Form), `docs/v2/entwurf/nachrichten/KONZEPT-NACHRICHTEN.md` (§3, §5, §11), `UMSETZUNGSBERICHT.md`, der Abschnitt „Nachrichten“ in `docs/v2/HANDBUCH.md` (Z. 281-451, Störfall Z. 806-819) und die Aufnahmen unter `docs/v2/entwurf/nachrichten/stand/`.
- Fachlicher Maßstab ist die Ausfüllanleitung des Vordrucks: Eingang Feld 1 (Mittel), 2 (Aufnahmevermerk, Datum mindestens zweistellig, Uhrzeit vierstellig, Handzeichen), 6 (Rufname der Gegenstelle/Spruchkopf), Inhalt so, wie er kommt; Ausgang Feld 3 (Annahme) und 4 (Beförderung mit Uhrzeit der Quittung der Gegenstelle).
- Durchgespielt: Stelle FmZ und Handzeichen setzen; Eingang aufnehmen (Tastaturweg); Nachweisen; Ausgang des Stabs annehmen, befördern, Quittungszeit eintragen; Marke bei Verzögerung; Nachtrag eines Papiervordrucks mit Zeiten und Nummer vom Blatt; Vordruck als PDF drucken und gegen das Papier prüfen; Probedruck und Automatikdruck; Tippfehler in Zeitfeldern; Pflichtfelder; Verbindungsverlust; weiche Sperre und Konflikt.
- Die Fundstellen mit `Datei:Zeile` stammen aus dem Quelltext, die Beobachtungen aus der laufenden Anwendung. Screenshots, Skripte und die erzeugten PDFs liegen in `/tmp/claude-0/-home-user-S1-Control/03036fe6-b619-5ee0-aa3a-bdc9e86fdba4/scratchpad/review-fm/` (Dateinamen `NN-...png` stehen bei den Befunden). Es wurde kein Quellcode geändert.
- **Annahmen** sind im Text als solche gekennzeichnet. Die Testumgebung läuft in UTC; echte Arbeitsplätze laufen vermutlich in `Europe/Berlin` (Annahme).
- **In Arbeit, nicht bewertet:** Station LdF (Festlegung des Mittels vor der Beförderung; im Code ist der Schritt „Übermittlung vorschlagen“ in `Fmzmasken.tsx:38` angelegt, im Blatt nicht geprüft) sowie rote/grüne Kopie beim Ausgang.

## Kurzes Urteil aus Rollensicht

Der Kern trägt. Der gedruckte Vordruck bildet Feld 1 bis 6 richtig ab (Aufnahmevermerk mit Datum, Uhrzeit und Handzeichen, Annahme, Beförderung, Rufname der Gegenstelle, Nr. mit E/A), die Nachweisung ist nach Nummer geführt, die Funkzeit „1045“ wird verstanden und unter dem Feld vorgelesen, die Warteschlange zeigt Sofort/Blitz oben, und die bernsteinfarbene Marke „seit 30 min“ nach der Annahme funktioniert. Der Papier-Rückfall ist fachlich richtig gedacht: Zeiten, Handzeichen und Nummer vom Blatt werden übernommen, nichts wird aus der Wanduhr erzwungen.

Reibung entsteht genau dort, wo ein Fernmelder unter Last arbeitet: bei der **Zeiteingabe in den Schritt-Masken** (getippte Funkzeit hängt sich an die Vorbelegung an), bei der **Tastaturbedienung der Aufnahme** (kein Bestätigen per Taste, 18 Tabulatorschritte zum Knopf, Esc verwirft einen halb getippten Spruch ohne Rückfrage) und bei **Verteilung und Eilmeldung** (der Ersatzsichter verteilt nur an S2; ein Blitz-Ausgang liegt ohne Signal in der Warteschlange). Der Papier-Rückfall hat in der Web-Schale eine Lücke bei der Vorbereitung (leerer Vordruck nur über einen Umweg). Keine Befunde der Stufe P0: Ein Datenverlust oder eine verfälschte Meldung entsteht nur durch Bedienfehler, die sich mit den Vorschlägen unten abfangen lassen.

## Was gut gelöst ist

- Der Druck entspricht dem Papier: Mittel, Aufnahmevermerk (17 | 1145 | Fm), Annahme und Beförderung (17 | 1255 | Fm; 17 | 1330 | Fm), Rufname der Gegenstelle/Spruchkopf, Nr. mit Kästchen Eingang/Ausgang, Anschrift, Betreff und Text, Absender, Abfassungszeit, Zeichen/Funktion, Quittung und Verteilerkreuz (`druckE-1.png`, `druckA-1.png`, `leer-1.png`). Die Vorschau „Wie gedruckt“ in der aufgeschlagenen Nachricht zeigt dasselbe (`32-lesen-E1.png`).
- Zeitfelder lesen „1045“, „171045“ und „171045nov26“ und schreiben darunter, wie die Eingabe verstanden wurde; „1o45“, „125“, „1275“ und „24:00“ werden als „nicht lesbar“ abgewiesen, der Knopf bleibt gesperrt und nennt den Grund. Strg+D setzt „jetzt“ in jedem Zeitfeld.
- Doppelte Nummer wird vor dem Schreiben gemeldet, ohne aufzuhalten („Die Nummer 1 ist bereits vergeben. Nachweisen ist trotzdem möglich …“, `34-nachtrag-nr-doppelt.png`); die Vorbelegung „höchste plus eins“ stimmt (Eingang 8 nach 7).
- Verbindungsverlust ist deutlich: gelbes Band „Keine Verbindung zum Dienst seit 8 s. Die Anzeige ist veraltet, Eingaben werden nicht gespeichert und sind gesperrt. Es wird automatisch neu verbunden; offene Formulare behalten ihre Eingaben.“, dazu „Verbindung unterbrochen“ in der Kopfzeile; „Aufnehmen“ ist gesperrt, die Felder bleiben erhalten (`43-offline-maske.png`).
- Die weiche Sperre greift in der Sache: Zweiter Fernmelder sieht „🔒 …“, darf aber weiterarbeiten; die Vorwertprüfung verhindert das stille Überschreiben (Konflikt, `24-A-doppelt.png`). Abbrechen gibt die Sperre sofort frei; nach einem Absturz des Arbeitsplatzes verfällt sie nach rund 30 bis 40 Sekunden.
- Papier-Rückfall in der Dokumentation (Störfall Z. 806-819) ist klar: leere Vordrucke vorab, Nummer nie zurücksetzen, Zeiten vom Blatt.

## P0 – Einsatzkritisch

Keine Befunde.

## P1 – Hoch

### P1-1 Zeitfeld in Annehmen, Befördern und Nachweisen: getippte Funkzeit hängt sich an die Vorbelegung an

**Beobachtung.** Öffnet man „Annehmen“, steht der Cursor am Ende von „171325nov26“; die Vorbelegung ist nicht markiert (`selectionStart/End` 11-11). Tippt man „1155“, steht dort „171325nov261155“, darunter „nicht lesbar“, und „Annehmen“ ist gesperrt (`25a-annahme-append.png`). Erst mit vorherigem Strg+A (oder Strg+D, das aber „jetzt“ setzt) geht „1155“. In der Aufnahmemaske tritt das nicht auf, weil dort der Fokus per Tab in das Feld kommt und der Browser dabei markiert. Fundstellen: `Maske.tsx:132-137` (Startfokus ohne Markieren), `Dtgfeld.tsx:28-37` (kein Markieren beim Fokussieren), `Fmzmasken.tsx:228`.
**Auswirkung.** Der häufigste Handgriff beim Ausgang, die Funkzeit der Quittung überschreiben, scheitert beim ersten Versuch. Unter Funklast kostet das Sekunden bei jeder Beförderung und führt zu der Gewohnheit, einfach die Vorbelegung „jetzt“ zu bestätigen und damit eine falsche Quittungszeit zu schreiben (siehe P2-4).
**Vorschlag.** Beim Fokussieren eines Zeitfelds den Inhalt markieren (`select()` bei `onFocus`, auch für den Startfokus der Maske). Das ist dieselbe Konvention, die Tab bereits liefert.

### P1-2 Aufnahmemaske ohne Tastaturbestätigung; Knopf liegt 18 Tabulatorschritte hinter dem Absender und unter der Falz

**Beobachtung.** Tastaturweg ohne Maus: „Eingang aufnehmen“ mit Enter öffnen, Fokus liegt auf „Mittel“ (Funk vorbelegt). Reihenfolge: Mittel, Aufnahme, Handzeichen, Gegenstelle, Nr., Übermittlungswunsch, Spruch, Durchsage, Sofort, Blitz, Gesprächsnotiz, Anschrift, Ruf-Nr., Betreff, Inhalt, Absender, Abfassungszeit, Zeichen, Funktion, dann Quittung, Handzeichen, S2, Kopie, sieben weitere Verteilerkästchen, Weitere Stelle, Vermerke, Vorschau, Abbrechen; „Aufnehmen“ ist erst nach **18 Tab** ab dem Absender erreichbar. Enter in einem Feld und Strg+Enter bestätigen nicht (`Nachrichtenmaske.tsx:230`, `Fmzmasken.tsx:232`: `nurKnopf`). Dasselbe gilt für Annehmen, Befördern und Nachweisen: Enter im Zeit- oder Handzeichenfeld tut nichts, erst Tab bis zum Knopf. Bei 860 Pixel Höhe liegt der Knopf bei y = 1354, also unter der sichtbaren Fläche. Der vollständige Durchlauf (Aufnahme 1045, Gegenstelle, Betreff, ein Satz Inhalt, Absender, Knopf) war mit 142 Tastendrücken möglich; der Text selbst ist ein Drittel, der Rest ist Navigation. Danach geht der fokussierte Knopf verloren (Fokus auf `BODY`), Rückmeldung nur als Hinweiskasten „In der Nachweisung unter Nummer 1 eingetragen“ (`13-nach-submit.png`).
**Auswirkung.** „Unter einer Minute“ ist mit der Maus erreichbar, mit der Tastatur nur über viele Tab-Schläge oder einen Griff zur Maus; beim Headset-Betrieb mit laufendem Funkverkehr ist beides unglücklich. Die Maske selbst sagt in `Maske.tsx:4` „Enter bestätigt“ als Grundsatz; hier gilt er nicht.
**Vorschlag.** Strg+Enter in allen Feldern bestätigt (auch im Textfeld Inhalt, wo Enter den Zeilenumbruch behalten muss); in Annehmen, Befördern, Nachweisen genügt Enter. „Aufnehmen/Aufgeben“ als fester Fuß der Maske, der bei kleiner Höhe sichtbar bleibt. Der Laufzettel liegt in der Tabulatorfolge hinter einem eigenen Sprung („Alt+L“ oder Überspringen, wenn nicht verteilt wird). Nach dem Schließen den Fokus auf „Eingang aufnehmen“ zurückgeben, damit der nächste Spruch mit Enter beginnt.

### P1-3 Esc verwirft einen halb getippten Funkspruch ohne Rückfrage

**Beobachtung.** Gegenstelle und Inhalt getippt, Esc gedrückt: Die Maske schließt sofort, beim erneuten Öffnen sind alle Felder leer (Inhalt `""`, Gegenstelle `""`). Die Rückfrage gibt es nur im Zustand „Unklar, ob gespeichert“ (`Maske.tsx:123-130`, Esc-Behandlung `Maske.tsx:155-164`). Das Handbuch verspricht Rückfrage nur beim Verlassen der Seite (Z. 323-325). Ein Klick neben die Maske schließt dagegen nicht (gut).
**Auswirkung.** Ein versehentliches Esc (Tastenfeld am Headset, Funkgerät, Nachbartaste) vernichtet den Funkspruch, der gerade ohne Wiederholungsmöglichkeit hereinkommt. Der Inhalt wird nur einmal durchgegeben.
**Vorschlag.** Bei geändertem Inhalt fragt Esc einmal nach („Eingabe verwerfen? Esc nochmals“), oder die Maske hält den Entwurf bis zum Speichern oder ausdrücklichen Verwerfen.

### P1-4 Ersatzsichter verteilt nur an S2; die Anschrift wird nicht zur Hauptempfängerkopie

**Beobachtung.** Ist kein Sichter besetzt, verteilt die FmZ beim Aufnehmen im selben Zug. Vorbelegt ist ausschließlich S2 rot (`52-laufzettel-s3.png`, auch nach Eintrag der Anschrift „S3“ bleibt es bei S2). Aufgenommene Nachricht E 1 stand danach nur im Posteingang von S2 („Kein Sichter besetzt: Nachricht beim Aufnehmen verteilt“, `32-lesen-E1.png`). Der Verteiler wird nur im Laufzettel sichtbar, der unter der Falz liegt (siehe P1-2).
**Auswirkung.** Wer unter Funklast nur die Felder 1 bis 6 und den Text füllt, versendet den Spruch faktisch nur an S2; der Adressat im Stab sieht ihn nie. Das ist ein stiller Verlust der Zustellung, bestätigt durch ein grünes Häkchen.
**Vorschlag.** Anschrift, wenn sie einer bekannten Stelle entspricht, als Hauptempfänger (grün) vorbelegen; und wenn der Verteiler außer S2 leer bleibt, vor dem Schreiben warnen („Nur S2 verteilt – Anschrift S3 hat keine Kopie“). Annahme: Dass der Sichter den Hauptempfänger festlegt, ist das Vorbild; für den Ersatzsichter-Fall fehlt dieser Schritt.

### P1-5 Blitz oder Sofort im Ausgang: kein Signal an die FmZ, die Zwanzig-Minuten-Marke zählt erst ab der Annahme

**Beobachtung.** Der Ton und der Hinweis „Blitz-Nachricht … für S4“ gelten nur für gesichtete Nachrichten an eine eigene Stelle des Arbeitsplatzes (`Arbeitsplatzeinstellungen.tsx:102-105`, `nachrichtendienst.ts:159`). Ein neuer Blitz-Ausgang erscheint in der Warteschlange der FmZ nur als Zeile und als Zahl im Band „Mit Vorrang offen“. Die Marke „über der Schwelle“ fordert eine vorhandene Annahme (`nachrichtenzeile.ts:176`: `annahme === undefined` gibt `false`). Beispiel: Blitz „Blitz Test lange liegend“ mit Abfassungszeit vor mehr als einer Stunde, nicht angenommen: Zeile ohne Marke, „Über der Schwelle 0“ (`51-lange-liegend.png`).
**Auswirkung.** Der kritischste Fall, ein Blitz, den niemand annimmt, bleibt in der Messung unsichtbar. Die Marke misst die Bearbeitungsdauer in der FmZ, nicht die Wartezeit vor der FmZ. Der Fernmelder mit Headset und Funkverkehr hat keinen Anstoß, in die Warteschlange zu sehen.
**Vorschlag.** Hinweis und (abschaltbarer) Ton für jeden neuen Sofort/Blitz in der Ausgangswarteschlange an Arbeitsplätze mit Stelle FmZ; Schwelle ab Abfassungs- oder Aufgabezeit messen (zwei Marken: „wartet seit“ und „angenommen seit“).

### P1-6 Papier-Rückfall in der Web-Schale: „Papier-Vordruck als PDF“ wird abgewiesen, der leere Nachrichtenvordruck kommt nur über „… als HTML“

**Beobachtung.** Das Handbuch (Z. 447-451) und der Störfall (Z. 812) sagen: im Reiter Ausgaben „Papier-Vordruck“ den leeren Nachrichtenvordruck als PDF ausdrucken. In der Web-Schale meldet „Papier-Vordruck als PDF“ rot „PDF gibt es nur in der Desktop-App. Im Browser die Ausgabe als HTML erzeugen …“ (`49-papiervordruck.png`, `main/vermittlung.ts:419`). Erst „Papier-Vordruck als HTML“ schreibt zusätzlich „Dazu geschrieben: vordruck-nachricht-leer.pdf“ (`50-papier-html.png`). Der Hinweis nennt diesen Nebeneffekt nicht.
**Auswirkung.** Wer vor dem Ausfall die Reserve ausdrucken will, erhält eine Fehlermeldung und findet den leeren Vordruck nicht. Der Block ist gerade für die Phase gedacht, in der man nicht experimentieren kann.
**Vorschlag.** Eigener Knopf „Nachrichtenvordruck leer (PDF)“ ohne Umweg über den Papier-Vordruck der Einheiten, in beiden Schalen verfügbar (die Web-Schale kann das PDF bereits erzeugen). Den roten Hinweis für diesen Fall streichen. Handbuch und Störfall an die Schale anpassen.

## P2 – Mittel

### P2-1 Zeitzone: Funkzeit „1045“ wird in der Ortszeit des Browsers gelesen, die Datum-Zeit-Gruppe in Berlin gezeigt (Annahme: nur bei abweichender Rechnerzeitzone)

**Beobachtung.** Die Testumgebung läuft in UTC. Getippt wurde Aufnahme „1045“; die Nachweisung zeigt „171145nov26 Fm“ (`36-nachweisung-nach-nachtrag.png`), im Aufnahmefeld steht beim Wiedereintippen derselbe Zeitpunkt als „10:45“ und im Zeitfeld daneben „171145“. Die Kopfzeile zeigt die Uhr in Ortszeit („171233NOV26“), die Felder zeigen vorbelegt eine Gruppe mit Berliner Zeit („171333nov26“, gleiche Minute, eine Stunde später). Ursache: `funkzeit.ts:23-31` rechnet mit `new Date(...)` in Ortszeit, `datumZeitGruppe.ts:29` formatiert fest `Europe/Berlin`.
**Auswirkung.** Auf einem Browser mit anderer Zeitzone (Web-Schale auf fremdem Rechner, Laptop mit UTC) steht ein anderer Vermerk auf dem Papier als der, den der Fernmelder getippt hat. Auf einem Berliner Arbeitsplatz tritt das nicht auf (Annahme). Außerdem schreibt die Kopfzeile „NOV“ groß, die Felder „nov“ klein.
**Vorschlag.** Beide Pfade in derselben Zone lesen und anzeigen (die der Einsatzführung), die Kopfzeile ebenso; die Schreibweise der Gruppe vereinheitlichen.

### P2-2 Keine Plausibilitätsprüfung der Zeiten

**Beobachtung.** Ohne Warnung akzeptiert: Befördern „1259“ bei Ist-Zeit 12:26 (Zukunft, Zeitfeld zeigt „17.11.2026 12:59“); Befördern „1100“ vor der Annahme (1155) und vor der Abfassung (1322); Aufnahme 1145 vor Abfassung 1320 (E 1, `druckE-1.png`). Eine vierstellige Eingabe wird immer auf „heute“ gesetzt (`funkzeit.ts:26`); „2350“ kurz nach Mitternacht ergibt damit ein Datum 24 Stunden in der Zukunft (aus dem Code abgeleitet, nicht mit geänderter Uhr gespielt).
**Auswirkung.** Ein Zahlendreher oder der Tageswechsel stehen unauffällig in der Nachweisung; die Zwanzig-Minuten-Marke rechnet damit falsch.
**Vorschlag.** Weiche Warnung unter dem Feld („liegt in der Zukunft“, „vor der Annahme“, „vor der Abfassung“), ohne das Schreiben zu sperren (der Papier-Nachtrag muss möglich bleiben). Bei vierstelligen Zeiten, die später als jetzt wären, den Vortag vorschlagen.

### P2-3 Abfassungszeit und Quittung sind bei Eingang und Nachtrag mit „jetzt“ vorbelegt

**Beobachtung.** Im Eingang sind Abfassungszeit und Quittung des Sichters auf die Wanduhr gesetzt, auch wenn die Aufnahme mit Funkzeit eingegeben wurde. E 1 druckt Aufnahme 1145, Abfassung 171320, Quittung 1320 (`druckE-1.png`). Beim Nachtrag vom Papier (E 7: Aufnahme 171000, Abfassung 0958) müssen drei Zeiten überschrieben werden; wer die Quittung vergisst, schreibt die Zeit des Nacherfassens als Zeit der Sichtung (`35-nachtrag-gefuellt.png`).
**Auswirkung.** Die Zeitfolge auf dem Ausdruck widerspricht sich (Abfassung nach Aufnahme); beim Nachtrag steckt eine falsche Zeit unbemerkt im Papier. Das Handbuch sagt „nichts wird aus der Wanduhr erzwungen“; vorbelegt wird sie schon.
**Vorschlag.** Abfassungszeit im Eingang leer lassen oder an die Aufnahmezeit koppeln; im Nachtrag-Modus (Aufnahmezeit weit zurück) alle Zeitfelder nachziehen oder leeren und als Pflichtfeld markieren.

### P2-4 Befördern: Feld „Datum/Uhrzeit“ sagt nicht, dass die Quittung der Gegenstelle gemeint ist; Vorbelegungen sind still gesetzt

**Beobachtung.** Das Feld heißt „Datum/Uhrzeit“ und steht auf „jetzt“ (`Fmzmasken.tsx:228`), Feld 4 verlangt die Uhrzeit, zu der die Gegenstelle quittiert hat. „Mittel“ steht ohne Wunsch still auf Funk, „Gegenstelle“ wird mit der Anschrift vorbelegt („Polizei Oldenburg“, eine Dienststelle, kein Rufname; `21-befoerdern-A.png`).
**Auswirkung.** Ein eiliger Bediener bestätigt „jetzt“ vor der Quittung oder nach ihr und schreibt damit die falsche Zeit; ein Telefonat wird als Funk gespeichert.
**Vorschlag.** Beschriftung „Quittung der Gegenstelle um“ mit Hinweistext; Mittel ohne Wunsch leer lassen (Pflicht); Gegenstelle aus dem Funkplan (Rufname) vorschlagen, nicht aus der Anschrift.

### P2-5 Weiche Sperre nennt den Arbeitsplatz, nicht die Person; der Name ist bei allen gleich

**Beobachtung.** „🔒 wird von Arbeitsplatz bearbeitet“ (`22-befoerdern-B-sperre.png`; `useBearbeitungssperre.ts:30-32`). „Arbeitsplatz“ ist der Standard-Anzeigename (`39-arbeitsplatz-aendern.png`), solange niemand ihn ändert. Handzeichen und Stelle der Gegenseite sind bekannt (Präsenz), werden nicht genannt; eine Dauer fehlt. Die Sperre bleibt nach dem Absturz des anderen Arbeitsplatzes 30 bis 40 Sekunden stehen.
**Auswirkung.** Der zweite Fernmelder weiß nicht, mit wem er sich abstimmen soll, und kann nicht unterscheiden, ob der andere noch dran ist. Das Prinzip ist verständlich, der Text nicht.
**Vorschlag.** „… von Fz (FmZ) seit 1 min“ aus Handzeichen/Stelle der Präsenz; beim Anlegen des Arbeitsplatzes einen Anzeigenamen verlangen.

### P2-6 Konfliktmeldung zeigt Rohdaten, „Neu laden?“ ohne Knopf, Maske bleibt auf einer erledigten Nachricht stehen

**Beobachtung.** Wurde die Nachricht inzwischen vom anderen Fernmelder befördert und der erste schreibt trotzdem, steht in der Maske: „Nicht gespeichert – Wurde inzwischen von Arbeitsplatz geändert (neu: {"gegenstelle":"Polizei Oldenburg","handzeichen":"Fz","mittel":"FUNK","zeitpunkt":"2026-11-17T12:24:00.000Z"}). Neu laden?“ (`24-A-doppelt.png`, `worker/vorwertpruefung.ts:140`). Die Warteschlange dahinter hat die Nachricht schon entfernt.
**Auswirkung.** JSON und ISO-Zeit sind für den Fernmelder nicht lesbar; die Frage „Neu laden?“ hat keine Schaltfläche. Gewünscht wäre: „Bereits befördert um 1324 von Fz an Polizei Oldenburg. Nichts zu tun.“ mit Schließen.
**Vorschlag.** Konflikttext aus den Feldern bilden (Vermerk in Vordruck-Schreibweise), Knopf „Übernehmen und schließen“.

### P2-7 Nachweisung zeigt weder Mittel (Feld 1) noch Gegenstelle (Feld 6); Eingangsvermerke sind nach dem Speichern nicht korrigierbar

**Beobachtung.** Spalten: Vorrang, E/A, Nr., Von, An, Aufnahme, Annahme, Beförderung, Abfassungszeit, Betreff (`36-nachweisung-nach-nachtrag.png`). Mittel und Rufname der Gegenstelle stehen nur im Vordruck. In der Leiste einer aufgenommenen Nachricht gibt es Lesen, Antworten, Weiterleiten, Als Vordruck drucken, Im Tagebuch zeigen und Zurückziehen, aber kein „Aufnahme ändern“ (für die Annahme gibt es „Annahme ändern“). Ein Tippfehler in Gegenstelle, Mittel oder Aufnahmezeit lässt sich nur durch Zurückziehen mit Grund und Neuaufnahme beheben (die Nummer ist dann doppelt belegt, die Maske warnt nur).
**Auswirkung.** Das technische Betriebsbuch ist ohne Mittel und Gegenstelle nicht prüfbar; ein Tippfehler im Spruchkopf bleibt im Papier.
**Vorschlag.** Zwei Spalten ergänzen; „Aufnahme ändern“ analog „Annahme ändern“.

### P2-8 Maske fängt den Fokus nicht ein; nach dem Schließen ist der Fokus verloren

**Beobachtung.** Nach „Abbrechen“ springt Tab aus der Maske hinaus auf die Seite dahinter (Fenstermenü, Reiter; gemessen in der Tabfolge Punkt 33-44). Nach dem Annehmen steht der Fokus auf `BODY`.
**Auswirkung.** Mit Headset und Tastatur verirrt man sich hinter der Abdunklung; der nächste Schritt (z. B. „Befördern“ der nächsten Zeile) braucht die Maus.
**Vorschlag.** Fokusfalle in `Maske.tsx`; Rückgabe des Fokus an den auslösenden Knopf.

### P2-9 Nachtrag eines Ausgangs vom Papier braucht vier Masken

**Beobachtung.** Ein Eingang lässt sich in einer Maske nachtragen (Aufnahme, Gegenstelle, Nr., Abfassung, Quittung; `35-nachtrag-gefuellt.png`). Für einen Ausgang gibt es in „Nachricht verfassen“ als FmZ keine Felder für Annahme, Beförderung und Nr. (nur grauer Kopf, `33-fmz-verfassen.png`): Aufgeben, dann Annehmen, Befördern, Nachweisen, jeweils mit eigenem Zeit- und Handzeichenfeld (siehe P1-1).
**Auswirkung.** Nach einem Ausfall liegen einige Blätter vor; ein Ausgang kostet vier Masken, ein Eingang eine. Dazu die Vorbelegung „jetzt“ (P2-3).
**Vorschlag.** Nachtragsmodus in „Nachricht verfassen“ für die FmZ: Annahme, Beförderung (mit Gegenstelle) und Nr. aufklappbar, mit gesammeltem Schreiben in einer Folge. Annahme: Die Folge existiert für den Eingang bereits (`nachrichtenfolge`, Umsetzungsbericht).

### P2-10 „Befördert, aber nicht nachgewiesen“ ist nirgends sichtbar

**Beobachtung.** Nach dem Befördern verlässt die Nachricht die Warteschlange mit „Nr. —“; „Nachweisen“ gibt es nur noch in der Nachweisung (`30-nachweisung.png`). Kein Zähler im Band, keine Marke. Dabei werden Annehmen und Nachweisen auf Papier in einem Zug erledigt.
**Auswirkung.** Nummern fehlen im Betriebsbuch, ohne dass es auffällt; die Zeile „folgt (FmZ)“ im Ausgang des Verfassers bleibt stehen.
**Vorschlag.** Sechste Zahl oder Marke „nicht nachgewiesen“; „Annehmen und nachweisen“ als ein Schritt (Nummer vergeben beim Annehmen).

### P2-11 Probedruck und Automatikdruck: Ein falsch getipptes Verzeichnis wird still angelegt und als „geschrieben“ gemeldet

**Beobachtung.** Probedruck mit Verzeichnis `/nonexistent/zzz/ordner`: „Probedruck geschrieben: /nonexistent/zzz/ordner/probedruck-vordruck_2026-11-17_1230.pdf“, das Verzeichnis wurde auf dem Dienstrechner angelegt (`41-probedruck-falsch.png`). In der Web-Schale ist „Drucker“ ausgegraut, ohne Hinweis am Schalter selbst; es gibt keinen Dialog zur Ordnerwahl, das Verzeichnis liegt auf dem Rechner des Dienstes, nicht auf dem Arbeitsplatz. Probedruck ohne Pfad ist gesperrt (gut), „Übernehmen“ bestätigt ohne Anzeige (`40-automatik-verzeichnis.png`).
**Auswirkung.** Ein Tippfehler im Share-Pfad erzeugt einen neuen Ordner; der Automatikdruck läuft „erfolgreich“ in einen Ordner, aus dem niemand druckt. Ob der Pfad ein Drucker-Ausgangsordner ist, wird nicht geprüft.
**Vorschlag.** Nur in vorhandene Ordner schreiben (Fehler „Verzeichnis nicht gefunden“); Probedruck zeigt, wo die Datei liegt und ob der Ordner bereits Dateien enthält. Annahme: Das Anlegen ist beim Einsatzordner gewollt, beim Druckziel nicht.

## P3 – Niedrig

### P3-1 Rückmeldungen nennen die Nachricht nicht: „Nachricht A“ statt Nr. oder Betreff

Statuszeile: „✓ Nachricht angenommen (‚Nachricht A‘) · gespeichert“ (`20-nach-annehmen.png`); nach „Eingang aufnehmen“ steht „Rückgängig: Nachricht gesichtet (‚Nachricht E 7‘)“, obwohl die Nachricht aufgenommen wurde und nur die Sichtung zurückgenommen würde. Vorschlag: „Nachricht A ‚Sperrung B212‘ angenommen“; Rückgängig nennt den Schritt, den der Bediener getan hat.

### P3-2 Feld „Uhrzeit“ zeigt eine sechsstellige Datum-Zeit-Gruppe

Der Annahmevermerk (Feld 3) verlangt nur Uhrzeit und Handzeichen; die Maske nennt das Feld „Uhrzeit“, zeigt aber „171322nov26“ (`19-annehmen.png`). Das Eintippen von „1322“ geht, die Vorbelegung ist dennoch länger als das Feld auf Papier. Vorschlag: Annahme wie das Papier als Uhrzeit führen.

### P3-3 Stellenabfrage: FmZ ist das zehnte Kästchen, das Profil ändert sich nicht mit

Tastaturweg: neun Tab bis FmZ, dann Leertaste; Handzeichen mit einem Zeichen sperrt „Übernehmen“ (Hinweis „zwei bis vier Zeichen“, `05-hz-zu-kurz.png`, gut). Nach der Wahl FmZ bleibt der Arbeitsplatz im Profil „Führungsstelle“ und landet auf „Lage“ statt auf der Fernmeldezentrale (`06-nach-stelle.png`; der Handbuchsatz „Wer die Stelle FmZ hat, landet in der Sicht Fernmeldezentrale“ gilt erst im Reiter Nachrichten). Vorschlag: Stelle FmZ öffnet Reiter Nachrichten in der FmZ-Sicht.

### P3-4 Schaltflächen in der Warteschlange brechen um; „Befördern“ ist der dunkle Hauptknopf auch ohne Annahme

Bei 1320 Pixel liegt „Nachweisen“ in einer zweiten Zeile (`25-marke-verzoegerung.png`); „Befördern“ ist hervorgehoben, auch wenn „Annehmen“ noch fehlt. Reihenfolge Annehmen, Befördern, Nachweisen ist nicht erzwungen, aber auch nicht angeleitet. Vorschlag: der nächste fällige Schritt ist der Hauptknopf der Zeile.

### P3-5 Beschriftung „Gegenstelle“ statt „Rufname der Gegenstelle / Spruchkopf“

Der Vordruck nennt Feld 6 so; die Maske nur „Gegenstelle“, Platzhalter „z. B. Heros Wildeshausen“ (`08-eingang-maske.png`). Für den Fernmelder ist das verständlich; der Neuling sucht den Spruchkopf. Vorschlag: Beschriftung wie das Papier, Spruchkopf (Anruf, Rufname, Vorrang) als Hilfetext.

### P3-6 Verbindungsband weist nicht auf den Papier-Rückfall hin; Vorbelegung der Nummer aus veraltetem Stand

Das Band erklärt gut, was gerade geht und nicht geht, und verweist nicht auf den Papier-Rückfall (Annahme: Ausgaben ist offline ebenfalls gesperrt, nicht geprüft; zur Vorbereitung siehe P1-6). Die Nummer in der Aufnahmemaske wird offline weiter vorbelegt („8“), obwohl die Anzeige als veraltet gilt. Vorschlag: Hinweis „Auf Papier weiterführen, Nummer vom Block, später nacherfassen“ im Band; Vorbelegung der Nummer als „unbestätigt“ kennzeichnen.

### P3-7 Der Hinweiskasten bleibt stehen

„Hinweise: In der Nachweisung unter Nummer 7 eingetragen. Kein Sichter besetzt …“ bleibt über den Sichtwechsel stehen (`36-nachweisung-nach-nachtrag.png`) und füllt die Fläche unter einer Liste; er sollte nach einigen Sekunden oder mit der nächsten Eingabe verschwinden.

## Zusammenfassung der Befunde

| Stufe | Anzahl |
| --- | --- |
| P0 | 0 |
| P1 | 6 |
| P2 | 11 |
| P3 | 7 |

Bekannte Lücken in Arbeit (nicht gezählt): Station LdF (Festlegung des Mittels vor der Beförderung), rote und grüne Kopie beim Ausgang.
