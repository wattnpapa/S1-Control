# Audit: Nachrichten (4-fach-Vordruck) aus Sicht des ETB-Führers

Datum: 2026-11-17
Rolle des Prüfers: ETB-Führer, Führungsgehilfe im Sachgebiet 2; führt das Einsatztagebuch und die Lagekarte, bekommt die rote Kopie jeder Nachricht (Lehrunterlage Folie 29 und 30) und muss nach dem Einsatz jede Nachricht nachweisen können.
Stand: main 15ecdbd, Web-Schale unter http://127.0.0.1:8080/.

## Scope und Methodik

- Geprüft wurde die laufende Anwendung (Chromium über Playwright, Viewport 1320 x 860) in einem eigenen Einsatz „Review ETB“ auf dem gemeinsamen Share. Vier Browser-Kontexte als vier Arbeitsplätze: S4 (Hz. Ru, verfasst), FmZ (Hz. Fm, nimmt an, befördert, weist nach, nimmt Eingänge auf), Sichter (Hz. Si, verteilt) und S2 (Hz. Ak, ich). Einsätze anderer Reviewer wurden nicht angefasst. Screenshots und Skripte liegen im Scratchpad `review-etb/` (Nummern 01 bis 132).
- Durchgespielt: Ausgang A 1 (verfassen, annehmen, befördern, nachweisen) und Eingang E 2 (aufnehmen mit Nummer, sichten mit Verteiler S2 rot und S4 grün, Kenntnisnahme und Erledigt durch S2), dazu ein Eingang mit doppelter Nummer und deren Berichtigung (E 3, Blitz), ein Eingang mit rückdatierten Zeiten wie bei Nacherfassung vom Papier (E 4), eine zurückgezogene Ausgangsnachricht (Doppelaufgabe), das Zurückziehen einer schon gesichteten und erledigten Nachricht (E 2), Tagebuch am Bildschirm (Filter, Suche, „Im Tagebuch zeigen“), Tagebuch als HTML, Nachweisung als HTML, Vordruck-PDF je Nachricht (mit `pdftotext` gelesen), Einsatzakte als ZIP (Inhalt und Manifest gelesen), Einsatz beenden und danach Nachrichten.
- Gelesen wurden außerdem KONZEPT-NACHRICHTEN.md (§3, §5, §9, §11), UMSETZUNGSBERICHT.md, die Abschnitte „Nachrichten“ und „Tagebuch“ im HANDBUCH, `stand/tagebuch.png`, KONZEPT-EREIGNISSE.md §5.9 und `packages/domaene/src/projektion/tagebuch-nachrichten.ts`; Fundstellen im Code stehen bei den Befunden.
- Ich habe keinen Quellcode und kein anderes Dokument geändert. Der Test-Einsatz „Review ETB“ steht am Ende beendet (nicht archiviert) auf dem Share. Einzelne Eingaben in E 2 sind von mir bewusst oder versehentlich falsch gesetzt (Anschrift und Betreff vertauscht, Absender leer); sie dienen unten als Beispiel für Berichtigung und Absender-Lücke und sind als solche gekennzeichnet.
- Annahmen sind im Text mit „Annahme“ gekennzeichnet. Die Sandbox läuft in UTC; die Datum-Zeit-Gruppe des Vordrucks ist fest Europe/Berlin (`packages/domaene/src/zeit/datumZeitGruppe.ts:29`), deshalb liegen Bildschirmzeiten eine Stunde neben den Zeiten des Vordrucks. Das werte ich nur als Annahme (siehe P2-1), nicht als Fehler.

## Kurzes Urteil

Der Ablauf selbst ist als Ereignisstrom sauber und vollständig: Jeder Schritt von A 1 und E 2 steht mit Erfassungszeit, fachlicher Zeit, Handzeichen (wo der Schritt eines trägt), Nummer, Absender, Anschrift und Betreff im Einsatztagebuch; nichts wird gelöscht, das Zurückziehen verlangt einen Grund und bleibt sichtbar; die rote Kopie eines Eingangs landet im Posteingang des S2; der Vordruck als PDF stimmt mit Feld 2 bis 5, 18 und 19 überein; ein beendeter Einsatz ist auch für Nachrichten gesperrt. Die Akte trägt ein Manifest mit SHA-256 je Datei.

Als Beweisstück nach dem Einsatz reicht es noch nicht. Drei Dinge hindern mich als ETB-Führer am meisten: Eine Tagebuchzeile hängt nur über Text an ihrer Nachricht (keine Nachricht-Kennung in der Zeile, „Im Tagebuch zeigen“ ist eine Textsuche auf den Betreff); Berichtigungen von Nachrichten (Nummer neu vergeben, Nachricht zurückgezogen) sind im Tagebuch weder als solche markiert noch über „Nur Rücknahmen und Berichtigungen“ auffindbar; und das gedruckte Tagebuch zeigt je Zeile nur eine Zeit, deren Bedeutung von Zeile zu Zeile wechselt, sodass die Spalte nicht chronologisch läuft. Dazu kommen die bekannte Lücke der roten Kopie beim Ausgang und das fehlende zweite Sichten. Die Ablage der Ereignisse ist gut genug, dass sich alles nachträglich herstellen ließe; die Ausgabe leistet es noch nicht.

Befunde: 3 x P0, 7 x P1, 7 x P2, 4 x P3.

## Was gut gelöst ist

- Jeder Schritt ist eine Tagebuchzeile mit Kennung, Verb, Absender, Anschrift und Betreff („Nachricht A 1 befördert (Funk, an OV Wildeshausen, Hz. Fm): S4 an OV Wildeshausen, ‚Pumpen anfordern‘“; `tagebuch-nachrichten.ts:145-159`). Zeit der Erfassung und fachliche Zeit stehen getrennt (`Tagebuch.tsx:140-141`).
- Das Zurückziehen verlangt einen Grund, löscht nichts, und der Grund steht im Tagebuch („— Grund: …“, `Tagebuch.tsx:194`) und in der HTML-Ausgabe (`listen.ts:82`).
- Doppelte Nummer: Hinweis bei der FmZ („Die Nummer 2 ist bereits vergeben …“), Konflikthinweis in der Statuszeile, Marke „doppelt“ und Knopf „Berichtigen“ in der Nachweisung.
- Beim Eingang landet die rote Kopie sofort im Posteingang des S2 (Kopiefarbe rot, Marke „neu“); Kenntnisnahme (mit Handzeichen) und Erledigt sind je Stelle sichtbar und stehen im Tagebuch.
- Der Vordruck als PDF gibt Annahme-, Beförderungs-, Quittungs- und Verteilerfelder und die Vermerke (Feld 20) wieder; die Nachweisung nach Vordruck 1103.1 Feld 5 hat dieselben Nummern und Zeiten wie das Tagebuch.
- Die Einsatzakte enthält die vollständigen Ereignisdateien (append-only) und ein Manifest mit Hash je Datei und `zustandsHash`; nach „Einsatz beenden“ sind alle Nachrichtenaktionen gesperrt, „Einsatz beendet“ steht als Tagebuchzeile.
- „Im Tagebuch zeigen“ gibt es an jeder Nachricht (Leiste und Kontextmenü), und die Maske ist der Vordruck.

---

## P0 – Nachweis nach dem Einsatz nicht zuverlässig

### P0-1 Tagebuchzeile und Nachricht sind nur über Text verbunden

**Beobachtung**
- `Tagebuchzeile` trägt keine Nachricht-Kennung (`packages/domaene/src/projektion/tagebuch.ts:242-271`); die Ereignisse tragen sie (`nachrichtId`, z. B. „N-5ad4e5377023“ in `ereignisse/4014f306.0000.jsonl`), die Zeile gibt sie nicht weiter.
- „Im Tagebuch zeigen“ setzt nur eine Suche: Betreff, bei leerem Betreff der Absender (`useNachrichtenschritte.tsx:62-64, 106`; `Tagebuch.tsx:42-52`). Beispiel aus dem Lauf: Für E 2 (Betreff „OV Wildeshausen“) zeigte das Tagebuch 9 Zeilen, darunter alle Schritte von A 1, weil dessen Anschrift ebenso heißt.
- Umgekehrt (Zeile → Nachricht) gibt es nichts: Ein Klick oder Doppelklick auf eine Tagebuchzeile tut nichts.
- Zwei gleichlautende Nachrichten sind im Tagebuch nicht zu trennen: Meine beiden Aufgaben „Verpflegung 40 Portionen“ (12:29 und 12:30) stehen als zwei identische Zeilen „Nachricht A aufgegeben: S4 an THW OV Brake, ‚Verpflegung 40 Portionen‘“; die Zeile „Nachricht A zurückgezogen … Grund: Doppelt aufgegeben …“ nennt nicht, welche von beiden gemeint ist (`tagebuch-nachrichten.ts:158`: `NachrichtZurueckgezogen: () => "zurückgezogen"`, ohne Bezug). Beide haben noch keine Nummer, die Kennung „A“ ist also dieselbe.
- Die Suche ist ein Teilstring-Treffer: „E 3“ findet auch „E 30“ bis „E 39“ (Annahme aus `trifftFilter`, `tagebuch.ts:651-655`; mit weniger als 10 Nachrichten nicht auslösbar).

**Auswirkung**
Nach dem Einsatz muss ich je Nachricht alle ihre Zeilen finden und nur diese. Bei gleichem Betreff, bei Antworten („Antwort: …“ enthält den Betreff der Ausgangsnachricht), bei Nachrichten ohne Nummer und bei Betreff, der in einer Anschrift vorkommt, geht das nur durch Raten. Das ist genau die Zuordnung, die die Rolle als Beweisstück braucht.

**Vorschlag**
- `Tagebuchzeile` um `nachrichtId` (und die zum Zeitpunkt gültige Nummer, siehe P0-2) erweitern; „Im Tagebuch zeigen“ filtert nach dieser Kennung, nicht nach Text. In der Zeile ein Knopf oder Link „Nachricht anzeigen“.
- Die Zeile „zurückgezogen“ trägt Kennung, Abfassungszeit und Handzeichen der zurückgezogenen Nachricht.
- Ein Filter „Nachricht“ in der Kopfleiste des Tagebuchs (Nummer oder Kennung), kein Teilstring.

### P0-2 Berichtigungen von Nachrichten sind nicht als Berichtigung erkennbar; die Nummer in der Zeile ist die von heute

**Beobachtung**
- Der Filter „Nur Rücknahmen und Berichtigungen“ liefert für meinen Einsatz „0 von 21 Einträgen (Filter: nur Rücknahmen und Berichtigungen) — für diesen Filter gibt es keinen Eintrag“, obwohl eine Nachricht zurückgezogen und eine Nachweisnummer berichtigt wurde. Grund: Marke und Filter hängen nur an `undoOf` und `korrekturVon` (`Tagebuch.tsx:182-188, 199-210`); die Berichtigung der Nummer ist ein gewöhnliches `NachrichtNachgewiesen`, das Zurückziehen ein `NachrichtZurueckgezogen`, beides ohne diese Rahmenfelder.
- Die Nummer in der Zeile kommt aus dem Zustand von heute (`tagebuch-nachrichten.ts:89-102`, Zeile 97, Kopfkommentar Zeilen 10-12), nur die nachweisende Zeile nennt ihre eigene Nummer (`tagebuch-nachrichten.ts:191-194`). Folge im Lauf: Die Nachricht „Deichlage Brake“ erhielt erst Nr. 2 (doppelt), dann durch „Berichtigen“ Nr. 3. Im Tagebuch steht, in dieser Reihenfolge: „12:29:04 Nachricht E 3 aufgenommen“ (damals ohne Nummer, hat jetzt 3), „12:29:04 Nachricht E 2 nachgewiesen: Polizei Delmenhorst … Deichlage Brake“, „12:29:37 Nachricht E 3 nachgewiesen: Polizei Delmenhorst … Deichlage Brake“. Nirgends steht „Nummer 2 auf 3 berichtigt“. Wer nur das Tagebuch liest, sieht zwei Nachrichten „E 2“ mit zwei verschiedenen Inhalten und eine „E 3“ ohne erkennbaren Zusammenhang.
- Das Zurückziehen setzt keine Marke „Rücknahme“ oder „Berichtigung“ (`Tagebuch.tsx:199-210` greift nicht); nur das Wort „zurückgezogen“ im Satz.
- Das HANDBUCH sagt: „Rücknahmen stehen als eigene Zeilen darin und löschen nichts“; für Nachrichten ist das richtig (nichts wird gelöscht), aber die Zeilen sind nicht als Rücknahme oder Berichtigung gekennzeichnet.

**Auswirkung**
Ich brauche „Berichtigungen als eigener Eintrag“, erkennbar als solche. Hier ist die Berichtigung im Strom vorhanden, aber für den Leser unsichtbar, und die Historie der Nummer ist verstreut, weil jede Zeile die heutige Nummer zeigt.

**Vorschlag**
- Beim Berichtigen einer Nummer eine eigene Zeile „Nummer von E 2 auf E 3 berichtigt“ mit Marke „Berichtigung“; der Filter „Nur Rücknahmen und Berichtigungen“ erfasst diese und das Zurückziehen.
- Zeilen zeigen die Nummer, die zur Zeit des Ereignisses galt (aus `vorher`/`neu`), und, wo sie sich seither geändert hat, „jetzt E 3“.

### P0-3 Das gedruckte Tagebuch trägt je Zeile eine Zeit mit wechselnder Bedeutung und ist dadurch nicht chronologisch

**Beobachtung**
- Die Ausgabe „Tagebuch als HTML/PDF“ zeigt eine Spalte „Zeit“ mit `zeitpunkt ?? wanduhr` (`packages/ausgaben/src/listen.ts:79-85`): die fachliche Zeit, wo es eine gibt, sonst die Wanduhr. Am Bildschirm stehen beide Zeiten (`Tagebuch.tsx:190-191`).
- Reihenfolge der Ausgabe ist HLC aufsteigend (`listen.ts:96-107`). Mit meiner Nacherfassung (E 4, Aufnahme 1000, Abfassung 0955, Sichtung 1006, alles um 12:33 geschrieben) endet die gedruckte Liste so: „12:29 … E 3 gesichtet“, „12:29 A aufgegeben“, „12:30 A aufgegeben“, „12:30 A zurückgezogen“ (Wanduhr), danach „09:00 E 4 aufgenommen“, „09:00 E 4 nachgewiesen“, „09:06 E 4 gesichtet“ (fachliche Zeit; auf dem Bildschirm in der Sandbox 09:00 statt 10:00, siehe P2-1). Die Spalte springt von 12:30 auf 09:00; woher die Zeit kommt, steht nicht dabei. Die Zeilen „erledigt“ und „zurückgezogen“ haben keine fachliche Zeit und zeigen die Wanduhr.
- In der gedruckten Fassung fehlen Rechner, Datum-Zeit-Gruppe, Erfassungszeit neben der fachlichen Zeit, laufende Zeilennummer, Seite x von y ist da (CSS), eine Abschlusszeile mit Handzeichen oder Unterschrift fehlt (Einsatzende steht nur als normale Zeile).

**Auswirkung**
DV 1-100 8.4 verlangt das abgeschlossene Tagebuch als Beweisstück. Eine Liste, die in der Zeitspalte rückwärts springt, ohne zu sagen warum, ist nach dem Einsatz nur mit dem Bildschirm daneben lesbar; bei Nacherfassung vom Papier (der Normalfall nach einem Rechnerausfall, Störfall 7) ist sie genau dann nicht chronologisch, wenn sie es sein muss.

**Vorschlag**
- Zwei Spalten im Druck, wie am Bildschirm: „Erfasst“ und „Zeit der Meldung“; Kopfzeile erklärt beide. Alternativ ein Schalter „nach Meldezeit sortiert“, mit der Erfassungszeit als zweiter Spalte.
- Laufende Zeilennummer (ETB-Nummer, siehe P1-2) und Spalte „Rechner“ aufnehmen; am Ende eine Abschlusszeile („Einsatztagebuch abgeschlossen am … um …, N Einträge, Handzeichen …“).

---

## P1 – Wesentliche Lücken im Nachweis

### P1-1 Ausgang: rote Kopie fehlt bei S2 (bekannt, in Arbeit)

**Beobachtung**
Nach A 1 (befördert, nachgewiesen) steht nichts im Posteingang des S2; im Tagebuch gibt es keine Sichtungs- oder Verteilzeile für A 1. Die Nachricht steht im Ausgang als „erledigt“ (Verteiler leer; Konzept §9: ERLEDIGT bei leerem Verteiler), obwohl niemand außer dem Verfasser und der FmZ sie kennt. Der Parameter `sichtungAuchAusgang` ist als Notlösung vorhanden (KONZEPT §11 Nr. 8), schaltet aber den Weg über den Sichter und nicht die rote Kopie an S2.
**Status:** in Arbeit; dieser Befund dient als Gegenprobe. Zusätzlich fällt auf: Die Anzeige „erledigt“ im Ausgang ist so lange irreführend, wie der Verteiler leer ist.

**Auswirkung**
Lagekarte und Einsatztagebuch erfahren von Ausgangsnachrichten (Anforderungen, Aufträge) nichts, außer ich lese die FmZ-Zeilen. „Wer hat sie gesehen“ ist für Ausgänge nicht beantwortbar.

**Vorschlag**
Mit der Beförderung (oder Nachweisung) die rote Kopie als Verteilereintrag S2 erzeugen und im Tagebuch als Zeile führen; solange das fehlt, den Ausgang nicht „erledigt“ nennen, sondern „befördert, nicht verteilt“.

### P1-2 Zweites Sichten und Vermerke nach der Sichtung sind in der Oberfläche nicht erreichbar; Feld 20 bleibt Freitext ohne ETB-Nummer

**Beobachtung**
- Der Laufzettel erscheint nur in der Sicht „Sichter“ und nur für Nachrichten ohne Sichtung (`Nachrichten.tsx:315`, `Laufzettel.tsx:125`); nach „Sichten“ ist die Liste leer („Keine Nachricht in ‚Sichter‘“). Im Lesemodus ist der Laufzettel nur Anzeige. KONZEPT §5 sieht die zweite Sichtung vor; `NachrichtVermerkt` hat in der Renderer-Schicht keinen Aufrufer (nur `apps/desktop/src/worker/nachrichtenpruefung.ts`).
- Ein vergessener Verteiler (S4 vergessen) oder eine später bekannte ETB-Nummer lässt sich nicht nachtragen.
- Das Tagebuch hat keine laufende Nummer, und der Vordruck-PDF trägt in Feld 20 nur, was der Sichter zum Zeitpunkt der Sichtung frei getippt hat („ETB-Nr. 5“ in meinem Lauf, erfunden). Der Konzeptsatz „Feld 20 … braucht damit niemand mehr von Hand zu füllen: Die Tagebuchzeile trägt die Nachrichtennummer“ dreht die Richtung um: Auf der roten Kopie steht keine ETB-Nummer, und im Tagebuch gibt es keine zum Hinschreiben.

**Auswirkung**
Der Querverweis Papier ↔ Tagebuch, den ich als ETB-Führer auf der roten Kopie führe, ist nicht möglich. Verteilerfehler bleiben stehen.

**Vorschlag**
- Laufzettel auch für gesichtete Nachrichten öffnen („Nachsichten“, „Vermerk ergänzen“), jeweils als eigene Tagebuchzeile; erste Sichtung bleibt sichtbar.
- Laufende Nummer je Tagebuchzeile (ETB-Nr.) einführen und im Vermerk-Feld der Nachricht vorbelegen oder per Knopf „ETB-Nr. eintragen“ ergänzen.

### P1-3 Berichtigen geht nur für doppelte Nummern; sonst nur Zurückziehen, ohne Bezug und ohne Grund im Blatt

**Beobachtung**
- „Berichtigen“ bietet die Nachweisung nur, wenn die Nummer fehlt oder doppelt vergeben ist (`Nachweisung.tsx:131-134`). Ein Zahlendreher ohne Doppelung (12 statt 21) lässt sich nicht berichtigen. Das Konzept (§9) sieht Berichtigung mit neuer Nummer und gesehenem Vorherwert allgemein vor.
- Für Anschrift, Betreff, Inhalt, Abfassungszeit einer aufgegebenen Nachricht gibt es keine Berichtigung; die Leiste bietet nur Lesen, Erledigt, Antworten, Weiterleiten, Drucken, Im Tagebuch zeigen, Zurückziehen.
- Zurückziehen ist in jedem Zustand möglich und für jede Stelle, auch für eine gesichtete und von S2 erledigte Nachricht (`Nachrichtenauswahl.tsx:81-84` sperrt nur „bereits zurückgezogen“). Mein Test: E 2, gesichtet und erledigt, ließ sich von S2 zurückziehen. Im Lesemodus der zurückgezogenen Nachricht steht „Nachricht E 2 · zurückgezogen“, aber kein Grund, keine Zeit, kein Handzeichen; im Vordruck-PDF und in der Liste (nur durchgestrichen) ebenso nicht. Eine Ersatznachricht lässt sich nicht verknüpfen („Neuaufnahme als E 5“ musste ich in den Grund tippen).

**Auswirkung**
Fehler in einer bereits verteilten Nachricht lassen sich nur durch Zurückziehen und Neuaufgabe berichtigen. Nach dem Einsatz sehe ich in der Nachricht selbst nicht, warum und von wem sie zurückgezogen wurde; der Zusammenhang zur Ersatznachricht ist nur Freitext.

**Vorschlag**
Berichtigen auch ohne Doppelung zulassen (mit Vorwert); den Grund des Zurückziehens in der Lese-Ansicht, in der Nachweisung und im Vordruck-PDF (Stempel „ZURÜCKGEZOGEN“ mit Grund) zeigen; Zurückziehen nach der Sichtung nur mit zusätzlicher Bestätigung und mit optionaler Ersatznachricht („ersetzt durch Nr.“).

### P1-4 Absender kann leer bleiben

**Beobachtung**
Beim Aufnehmen eines Eingangs lässt sich ohne Absender aufnehmen („Betreff oder Inhalt eintragen“ war die einzige Bedingung, hier 12:25). Die Tagebuchsätze lauten dann „Nachricht E 2 … : ? an Pumpen unterwegs, ‚OV Wildeshausen‘“ (`tagebuch-nachrichten.ts:82`). Auch Zeichen und Funktion blieben leer (E 2 im Lesemodus: „Absender —“, „Zeichen —“, „Funktion —“).

**Auswirkung**
Die Frage „von wem“ ist eines meiner Nachweiskriterien; das Programm erlaubt, sie offen zu lassen und gibt keinen Hinweis.

**Vorschlag**
Absender (bei Eingang: die Stelle draußen, bei Ausgang aus der Stelle) als Pflicht oder mindestens mit deutlicher Rückfrage; Hinweis in der Nachweisung, wenn Absender, Zeichen oder Funktion fehlen.

### P1-5 Die Einsatzakte nimmt Nachrichten-PDFs nur mit, wenn jemand sie vorher erzeugt hat

**Beobachtung**
- Die ZIP („…_akte_2026-11-17_1232.zip“, 47 372 Bytes, „18 Ereignisse“) enthält `ereignisse/*.jsonl` vollständig, `manifest.json` mit Hash je Datei und `ausgaben/nachrichten/nachricht-A1-171321nov26.pdf` und `nachricht-E3-171329nov26.pdf` – genau die beiden, die ich vorher von Hand mit „Als Vordruck drucken“ erzeugt hatte. Für E 2 und die zwei Ausgangsnachrichten ohne Nummer gibt es keine PDFs, denn der Automatikdruck war nicht eingestellt (Ziel fehlt, UMSETZUNGSBERICHT „Offen bleibt“). Der Akte-Schritt erzeugt sie nicht nach.
- Ebenso kommen Nachweisung und Tagebuch als HTML nur mit, weil ich sie vorher ausgegeben habe; die Akte erzeugte zusätzlich ein eigenes `tagebuch_…_1232.html` (gleicher Inhalt wie 1231, 6159 Bytes).
- In der Web-Schale lieferte „Tagebuch als PDF“ keine Rückmeldung und keine Datei; „Nachweisung ausgeben“ bietet nur „Nachweisung als HTML“. Annahme: PDF-Ausgabe über `printToPDF` gibt es in der Web-Schale nicht; das ist ein Schalen-Unterschied, aber ohne Fehlermeldung am Bildschirm.

**Auswirkung**
Für die vollständige Akte muss jemand vor dem Beenden an jede Nachricht denken; sonst fehlen Vordrucke, und die Akte sagt das nicht. Das Manifest weist die Vollständigkeit der Ereignisse nach, nicht die der Vordrucke.

**Vorschlag**
„Einsatzakte erzeugen“ schreibt Vordruck-PDF je (nicht zurückgezogener, auch zurückgezogener mit Stempel) Nachricht, Nachweisung und Tagebuch neu, mit Manifest; „PDF nicht verfügbar in dieser Schale“ am Bildschirm melden.

### P1-6 „Einsatz beenden“ nennt offene Nachrichten nicht

**Beobachtung**
Der Dialog zählt „Noch offen: 0 offene Anforderungen; 0 Einheiten nicht abgeschlossen“ (`Einsatzabschlussmasken.tsx:48`), während in meinem Einsatz zwei Ausgangsnachrichten vor der FmZ ohne Nummer standen, eine Blitz-Nachricht (E 3) und eine weitere (E 4) für S2 „neu“ waren und die Kachel „Mit Vorrang offen“ auf 1 stand. Der Einsatz ließ sich beenden; danach sind Nachrichten gesperrt (gut), aber E 3 bleibt für immer „neu“ und ohne Erledigung.

**Auswirkung**
Das Tagebuch ist nach dem Beenden abgeschlossen, ohne dass jemand gesagt bekam, dass Nachrichten unbefördert, unnummeriert oder ungesehen sind. Das Beweisstück wäre an diesen Stellen lückenhaft.

**Vorschlag**
Im Dialog „Noch offen“ um Nachrichten ergänzen (vor der FmZ, ohne Nummer, ungesichtet, mit Vorrang offen, nicht erledigt); Beenden bleibt möglich, die Zahlen kommen aber in die Tagebuchzeile „Einsatz beendet“ oder in einen Abschlussvermerk.

### P1-7 Akteur ist „Arbeitsplatz“, Handzeichen und Stelle stehen nur im Satz, und mehrere Schritte haben keine Zeit oder kein Handzeichen

**Beobachtung**
- Spalte „Akteur“ zeigt in jeder Zeile „Arbeitsplatz“, „Rechner“ „vm“ (Ereignisrahmen: `"akteur":{"benutzer":"Arbeitsplatz",…,"host":"vm"}`). Das ist der Anzeigename des Arbeitsplatzes (Standard „Arbeitsplatz“); Stelle und Person stehen nirgends als Spalte. Annahme: Wird in den Einstellungen ein Anzeigename gesetzt, erscheint dieser; geprüft habe ich das nicht.
- Handzeichen stehen nur in einigen Sätzen: angenommen, befördert, nachgewiesen, gesichtet, Kenntnis. Nicht dabei: „aufgegeben“ (Zeichen „Ru“, Funktion „S4“ liegen im Ereignis, nicht in der Zeile), „aufgenommen“ (Hz. Fm ist im Aufnahmevermerk, steht aber nicht im Satz), „erledigt“, „zurückgezogen“ (`tagebuch-nachrichten.ts:145-159`). „Zeit der Meldung“ ist bei „erledigt“ und „zurückgezogen“ leer (`nachrichtenzeit`, `tagebuch-nachrichten.ts:214-221`: nur Vermerke mit `zeitpunkt`).
- Nachweisung und Aufgabe: Wer verfasst, wer nachweist, wer sichtet, steht über Handzeichen, aber nicht in einer filterbaren Spalte.

**Auswirkung**
„Wer“ ist je Schritt nur dort beantwortet, wo der Satz es zufällig nennt. Für „erledigt“ und „zurückgezogen“ fehlt Handzeichen und fachliche Zeit; wer nach dem Einsatz „wer hat E 2 für S2 erledigt“ fragt, bekommt nur „Arbeitsplatz“.

**Vorschlag**
Spalte „Stelle / Hz.“ in Bildschirm und Druck (Stelle und Handzeichen der Sitzung des schreibenden Arbeitsplatzes, in der Nutzlast aller Nachrichtenereignisse mitgeschrieben); `Erledigt`, `Zurückgezogen` bekommen `zeitpunkt` und Handzeichen.

---

## P2 – Verbesserungen für den Nachweis

### P2-1 Zeit am Bildschirm und im Druck: Uhrzeit ohne Jahr, Zeitzone des Browsers, nicht Datum-Zeit-Gruppe

**Beobachtung**
Das Tagebuch zeigt „17.11. 12:29:44“ (`Tagebuch.tsx:250-256`, ohne Jahr, ohne Zone, Browserzone), die Maske und die Nachweisung „171329nov26“ (Europe/Berlin, `datumZeitGruppe.ts:29`), die Kopfzeile „171221NOV26“ (Großbuchstaben). Im Sandbox-Lauf (UTC) stand für „Abfassung 1000“ im Tagebuch 09:00. Annahme: Mit Browser in Berlin fiele das nicht auf; bei einer Anzeige außerhalb von Berlin oder bei einer Verbindungsstelle in anderer Zone liefe es auseinander.

**Auswirkung**
Die Frage „Datum-Zeit-Gruppe gegen Uhrzeit“: Das Tagebuch führt Uhrzeiten mit Zone des Rechners, die Nachrichten führen Datum-Zeit-Gruppen mit fester Zone; ein Vergleich per Auge ist unsicher, und die Schreibweise (groß/klein) wechselt.

**Vorschlag**
Im Tagebuch eine Option „Datum-Zeit-Gruppe“ (eine Zone je Einsatz, im Kopf genannt); Jahr in der Ausgabe immer, am Bildschirm im Tooltip.

### P2-2 Vollständigkeit der Nummernfolge wird nicht geprüft oder berichtet

**Beobachtung**
Die Nachweisung zeigt Zeilen, aber keine Zusammenfassung „Nr. 1 bis 4, lückenlos“, keine Zahl der Nachrichten ohne Nummer und keine Lückenprüfung (keine Fundstelle für Lücken in `Nachweisung.tsx` oder `packages/ausgaben/src/nachweisung.ts`). Die HTML-Nachweisung nennt „5 Nachrichten“ inklusive der zurückgezogenen und der zwei ohne Nummer. Gut: Eine zurückgezogene nummerierte Nachricht bleibt in der Folge stehen (E 2).

**Vorschlag**
Fuß der Nachweisung: „Nummern 1 bis 4; fehlt: keine; ohne Nummer: 2; zurückgezogen: 2“. Hinweis „Lücke Nr. n“ bei fehlender Nummer in der Folge.

### P2-3 Anlagen fehlen

**Beobachtung**
Die Maske bietet keine Anlage (UMSETZUNGSBERICHT: „AnhangHinzugefuegt mit Bezug, in der Maske nicht angeboten“); eine Skizze, ein Foto oder die Nachricht „siehe Anlage“ lässt sich nicht an die Nachricht hängen. Der Vordruck hat dafür keine Vorgabe, im Einsatz kommen Lagekarten und Pegeltabellen vor.

**Vorschlag**
Anlage an Nachricht mit Tagebuchzeile („Anlage zu E 3“) und Eintrag in der Akte, später.

### P2-4 Tagebuch am Bildschirm: Ausschnitt von hundert Zeilen, keine Nachrichtenfilter, Druck ohne Filter

**Beobachtung**
Der Bildschirm lädt hundert Zeilen und meldet „die neuesten N stehen in der Liste“ (`Tagebuch.tsx:223-240`). Filter gibt es nur für Text, Einheit/Abschnitt und Rücknahmen; keine nach Nachricht, Richtung, Vorrang, Stelle, Zeitraum. Die Druckausgabe nimmt das ganze Tagebuch, aber ohne Filter (`listenausgaben.ts:27-31`, `tagebuchausschnitt(…, {})`). Ein Nachrichten-Tagebuch (nur Zeilen der Nachrichten) lässt sich nicht ausgeben.

**Vorschlag**
Filter „Nachrichten“ und „Nachricht Nr. …“ (Verbindung zu P0-1); Ausgabe „Tagebuch (Nachrichten)“ mit denselben Zeilen und derselben Nachweisung daneben.

### P2-5 Kenntnisnahme durch bloßes Öffnen; „erledigt“ ohne Handzeichen

**Beobachtung**
„Lesen“ schreibt für jede eigene Stelle im Verteiler die Kenntnisnahme (Meldung „Nachricht zur Kenntnis genommen“, Handzeichen Ak), ohne Rückfrage; ein Doppelklick beim Suchen genügt. „Erledigt“ ist je Stelle, hat im Tagebuch aber kein Handzeichen und keine fachliche Zeit (siehe P1-7). Bei einem Arbeitsplatz mit zwei Stellen gilt die Kenntnisnahme für beide.

**Auswirkung**
„Wer hat sie gesehen“ ist eher „wessen Arbeitsplatz hat sie geöffnet“; für den Nachweis tragfähig, aber nicht gleichbedeutend mit „gelesen“.

**Vorschlag**
Im Handbuch (Abschnitt „Lesen, erledigen, antworten“) ausdrücklich sagen, dass Öffnen = Kenntnisnahme ist; „Erledigt“ mit Handzeichen und Zeit führen.

### P2-6 Nachweisung und Tagebuch decken sich bei Nummern und Zeiten, aber nicht in allen Angaben

**Beobachtung**
Verglichen: Nummern (A 1, E 2, E 3 berichtigt, E 4) und die Minuten von Annahme, Beförderung, Aufnahme und Sichtung stimmen mit dem Tagebuch überein (z. B. Annahme/Beförderung „1322 Fm“ gegen „12:22:09/12:22:23“ in UTC). Unterschiede: Die Nachweisung zeigt Annahme, Beförderung, Sichtung nur als HHMM ohne Datum (Aufnahme und Abfassung als Datum-Zeit-Gruppe), Sichtung ohne Verteiler, ohne Gegenstelle und Mittel, ohne Grund bei „zurückgezogen“ (`packages/ausgaben/src/nachweisung.ts:61-71`: nur die Marke); in der Bildschirmfassung der Nachweisung fehlt die Spalte Sichtung ganz.

**Vorschlag**
Gleiche Zeitschreibweise je Spalte; Spalten „Gegenstelle/Mittel“ und „Verteiler“ ergänzen; „zurückgezogen (Grund …)“ in der Marke.

### P2-7 Vordruck-PDF ist ein Stand der Nachricht zum Zeitpunkt des Drucks

**Beobachtung**
Der Dateiname trägt Richtung, Nummer und Abfassungszeit (`nachricht-E3-171329nov26.pdf`). Ein früher erzeugtes PDF (zum Beispiel durch Automatikdruck bei der Sichtung, solange die Nummer 2 war) hätte, Annahme aus dem Namensschema, einen anderen Dateinamen („E2“) als der Nachdruck („E3“) und bliebe daneben in der Akte liegen. Das PDF einer zurückgezogenen Nachricht trägt keine Kennzeichnung (`nachricht*.ts` in `packages/ausgaben/src` kennt kein „zurückgezogen“). Nicht nachgestellt (kein Automatikdruck eingestellt).

**Vorschlag**
Beim Erzeugen den Stand (Zeit, Nummer) ins PDF-Fußfeld schreiben, zurückgezogene Nachrichten mit Stempel und Grund; beim Berichtigen der Nummer alte Dateien umbenennen oder kennzeichnen.

---

## P3 – Feinschliff

### P3-1 Beschriftung „Zeit der Meldung“
Für Nachrichten ist es die Zeit des Vermerks oder der Abfassung, keine „Meldung“ (`Tagebuch.tsx:141`). „Fachzeit“ oder „Zeit laut Vermerk“ wäre eindeutiger, mit Tooltip welcher Vermerk.

### P3-2 „Nr. (E)“ bei gemeinsamer Zählung
Die Eingangsmaske beschriftet das Nummernfeld „Nr. (E)“, obwohl Eingang und Ausgang gemeinsam gezählt werden (Entscheidung 1); der Zusatz (E) erweckt eine getrennte Zählung.

### P3-3 Presence bleibt nach Schließen des Browsers sichtbar
Annahme (nicht gezielt geprüft): Nach dem Schließen meiner Kontexte zählte die Statuszeile weiter „15 weitere Arbeitsplätze“ und sank erst über Minuten (zuletzt „3“, „4“). Da die Anwesenheit eines Sichters das Ersatzsichten steuert (KONZEPT §5 „Ersatzsichter“), kann ein verlassener Sichter-Arbeitsplatz noch einige Zeit als „besetzt“ gelten; die FmZ sieht dann keinen Laufzettel.

### P3-4 „Zurückgezogen“ nur durch Durchstreichen sichtbar
In Posteingang und Nachweisung steht die zurückgezogene Zeile durchgestrichen und blass, ohne Wort in der Zeile (Screenshot `120-e2-zurueckgezogen.png`); beim Ausdruck in Schwarzweiß oder bei Sehschwäche ist die Marke dünn. Ein Textmarker „zurückgezogen“ in der Spalte „Marken“ wäre sicherer.

### P3-5 „Nachweisen“ bei zurückgezogenen Zeilen
Eine zurückgezogene, nicht nummerierte Ausgangsnachricht zeigt in der Nachweisung weiter den Knopf „Nachweisen“ (Screenshot nach Schritt `s24`); sie sollte keine Nummer mehr bekommen.

---

## Zusammenfassung zur Frage „Nachweis nach dem Einsatz“

| Frage | Befund |
|---|---|
| Wer verfasste, nahm an, beförderte, sichtete? | Über Handzeichen im Satz, nicht überall (P1-7); Akteur „Arbeitsplatz“ |
| Wann (Abfassung, Aufnahme, Annahme, Beförderung, Quittung)? | Ja, im Tagebuch beide Zeiten, im Druck nur eine (P0-3) |
| An wen, mit welcher Nummer, welcher Inhalt? | Anschrift, Nummer, Betreff ja; Inhalt nur im Vordruck-PDF, aus dem Tagebuch nur über Text-Suche erreichbar (P0-1) |
| Wer hat sie gesehen und erledigt? | Eingang: ja, je Stelle mit Handzeichen; Ausgang: nein (P1-1) |
| Berichtigungen als eigener Eintrag | Im Strom ja, im Tagebuch nicht erkennbar und nicht filterbar (P0-2) |
| Zurückgezogene Nachricht mit Grund | Im Tagebuch ja; in der Nachricht, Nachweisung, PDF nein (P1-3) |
| Ausdruck Tagebuch und Nachweisung | HTML ja; PDF in der Web-Schale nicht; Zeiten und Nummern passen zusammen (P0-3, P2-6) |
| Feld 20 ETB-Nummer, Anlagen, Nummernfolge | alle drei offen (P1-2, P2-3, P2-2) |
| Einsatzakte mit Nachrichten-PDFs | Nur mit vorher von Hand erzeugten (P1-5) |
