# Audit: Leiter Fernmeldezentrale (Fm-Zentrale)

- **Datum:** 05.11.2026
- **Rolle:** Leiter der Fernmeldezentrale einer THW-Führungsstelle (Annahme und Abgabe von Nachrichten, Nummerierung, Quittierung, Nachweisung, Weitergabe an den Sichter)
- **Material:** S1-Control v2, Stand HEAD (`ffc3125`), eigene Web-Schale mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten), Port 8220; zwei Browserkontexte als „FmZ Platz 1“ und „FmZ Platz 2“, Profil „Vermeldezentrale“, dazu ein Kontext in der Betriebsart „Meldekopf“. Screenshots unter `/tmp/claude-0/-home-user-S1-Control/5e4b7d40-2c4b-58c0-a32e-96410bb256d6/scratchpad/shots/fmz/`. Quelltext lesend als Beleg; `docs/v2/HANDBUCH.md`, `docs/v2/KURZANLEITUNG.md`, Audits vom 29.10.2026 als Hintergrund.
- **Kennzeichnung:** **[beobachtet]** an der laufenden Anwendung erlebt · **[Code]** im Quelltext belegt · **[Annahme]** Ablauf- oder Fachannahme der Rolle · **[nicht prüfbar]** in dieser Umgebung nicht prüfbar.

## Urteil

S1-Control ist eine Anwendung für Stärke, Status, Anforderungen und Funkplan — **einen Nachrichtenverkehr im Sinn der Fernmeldezentrale bildet sie nicht ab.** Es gibt keinen Nachrichtenvordruck, keine Nachrichtennummer, keine Richtung (Eingang/Ausgang), keinen Absender und Empfänger als Feld, keine Quittung und keinen Übergang an den Sichter. Das Einzige, womit eine Nachricht überhaupt erfasst werden kann, ist „Eintrag hinzufügen“ im Einsatztagebuch: Freitext, Quelle, Zeit. Und genau dieser Weg **schlägt im Normalfall fehl**: Mit leerem Zeitfeld („leer = jetzt“) speichert die Maske nicht und meldet „Die Nutzlast für EtbEintragErfasst ist nicht gültig: zeitpunkt — Invalid ISO datetime“ **[beobachtet]**.

Was trägt: Der Funkplan ist für die Sprechfunker-Plätze brauchbar — Rufgruppen, Zuordnung, Funkprobe mit Strg+P, letzter Kontakt, Funkprobenliste, Tagebuchzeile mit Name des Platzes. Zwei Plätze schreiben parallel, ohne dass etwas verloren geht; nach rund 4 s sehen beide dasselbe Tagebuch in derselben Reihenfolge **[beobachtet]**.

Die Rolle kann ihre Aufgabe mit der Software **nicht ohne Nebenaufzeichnung** erledigen: Nachweisung, Nummernvergabe, Quittung und Übergabe an den Sichter laufen weiter vollständig auf Papier.

## Findings

### F1 — P0: „Eintrag hinzufügen“ speichert mit leerem Zeitfeld nicht

1. **Priorität:** P0
2. **Fundstelle / Aufgabe:** Prüfaufgabe 1; Blatt Einsatztagebuch → „Eintrag hinzufügen“; `apps/desktop/src/renderer/TagebuchEintrag.tsx:46-50`, `apps/desktop/src/renderer/Anlegeversuch.tsx:73-76`. Screenshot `07-eintrag-ohne-zeit-fehler.png`.
3. **Beobachtung:** **[beobachtet]** Funkspruch „Von Heros Oldenburg 21/12 an FüSt: Deich km 3,2 sickert durch, erbitten 500 Sandsäcke“, Quelle Funk, Zeitfeld leer (der Platzhalter sagt „leer = jetzt“) → „Nicht gespeichert – Die Nutzlast für EtbEintragErfasst ist nicht gültig: zeitpunkt — Invalid ISO datetime“. Die Maske bleibt offen, der Text bleibt erhalten. Mit eingetippter Uhrzeit („2046“) speichert dieselbe Maske. **[Code]** Die Maske holt Eintrags-Id und „jetzt“ beide über `versuch.kennung(...)`; diese hält nur **einen** Wert je Versuch, der zweite Aufruf liefert die Id „ETB-…“ statt der Zeit zurück. Für die Maske gibt es keinen Test.
4. **Erwartung der Rolle:** Der häufigste Fall — Nachricht kommt jetzt rein, Fernmelder schreibt sie auf — funktioniert ohne Zusatzschritt.
5. **Auswirkung im Einsatz:** Der Fernmelder bekommt eine technische Fehlermeldung, die er nicht deuten kann, und weicht auf Papier aus oder bricht ab. Eine Nachricht, die unter Zeitdruck nicht gespeichert wird, ist für die FmZ eine verlorene Nachricht.
6. **Empfehlung:** Leeres Zeitfeld muss als „jetzt“ speichern; Fehlermeldungen der Maske in Nutzersprache. Regressionstest für genau diesen Weg.
7. **Verifikation:** Eintrag mit leerem Zeitfeld anlegen → Zeile erscheint sofort mit „Zeit der Meldung“ = Erfassungszeit; an zweitem Platz nach wenigen Sekunden sichtbar.

### F2 — P0: Keine Nachrichtenerfassung: weder Nummer noch Richtung, Absender, Empfänger, Quittung

1. **Priorität:** P0
2. **Fundstelle / Aufgabe:** Prüfaufgaben 1, 2, 5; Maske „Eintrag ins Einsatztagebuch“ (`TagebuchEintrag.tsx:24`, Quellen „Funk, Telefon, Meldung vor Ort, Lagebesprechung, Sonstiges“); Tagebuchspalten „Erfasst · Zeit der Meldung · Vorgang · Akteur · Rechner“ (`Tagebuch.tsx:121-127`); `apps/desktop/src/renderer/kennungen.ts` (Zufalls-Id statt fortlaufender Zahl, bewusst so begründet). Screenshots `06-eintrag-maske.png`, `11-parallel-P1.png`.
3. **Beobachtung:** **[beobachtet]** Die Maske hat drei Felder: „Was wurde gemeldet?“, „Quelle“, „Zeit der Meldung“. Absender, Empfänger, Funkrufname, Dringlichkeit, Richtung (eingehend/ausgehend) und Nummer gibt es nicht; ich habe „Von … an …“ in den Freitext geschrieben. Die Quelle wird als Textvorsatz „Funk: …“ gespeichert, nicht als Feld **[Code]** (`TagebuchEintrag.tsx:9-11`). Eine ausgehende Nachricht lässt sich nicht als solche anlegen, nicht als „abgesetzt“ markieren und nicht quittieren — Prüfaufgabe 2 ist nicht durchführbar. Eine Nachrichtennummer wird nicht vergeben; zwei Plätze, die gleichzeitig erfassten, bekamen beide nichts Zählbares — nur die Anzeigenamen unterscheiden sie (Rechner stand in der Web-Schale bei beiden auf „vm“). Doppelte Nummern gibt es also nicht, weil es keine Nummern gibt.
4. **Erwartung der Rolle:** Jede Nachricht hat eine eindeutige, fortlaufende, auf Funk und Papier nennbare Nummer, Uhrzeit, Übermittlungsweg, Absender und Empfänger; Ein- und Ausgang sind getrennt sichtbar; ausgehende Nachrichten tragen „abgesetzt um“ und „quittiert um/von“ **[Annahme: üblicher Aufbau des Nachrichtenvordrucks, ohne Wortlaut der DV]**.
5. **Auswirkung im Einsatz:** Rückfragen („Ihre Nachricht Nummer 17“) sind nicht möglich; nicht abgesetzte oder nicht quittierte Ausgänge fallen niemandem auf; die FmZ führt die eigentliche Nachweisung zwangsläufig auf Papier daneben. Die Software ist für die FmZ dann nur ein zweiter Ort, an dem Teile der Nachrichten stehen.
6. **Empfehlung:** Eine eigene Nachrichtenerfassung im Aufbau des gewohnten Vordrucks: Richtung, Nummer (je Richtung fortlaufend, über mehrere Plätze kollisionsfrei — z. B. mit Platzkennung als Präfix oder nachvollziehbar zentral vergeben), Weg, Absender, Empfänger, Funkrufname, Dringlichkeit, Text, Aufnahme-/Abgabezeit, Quittung. Ausgehende Nachrichten mit offenem Zustand bis zur Quittung.
7. **Verifikation:** Zwei Plätze erfassen je 10 Eingänge gleichzeitig → 20 verschiedene, lückenlos nachvollziehbare Nummern; eine ausgehende Nachricht steht bis zur erfassten Quittung in einer Liste „offen“.

### F3 — P1: Kein Übergang an den Sichter, keine Übernahmebestätigung

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Prüfaufgabe 1, „bis zum Sichter verfolgen“; Blätter Einsatztagebuch und Eingang.
3. **Beobachtung:** **[beobachtet]** Ein Tagebucheintrag hat keinen Empfänger innerhalb der Führungsstelle, keinen Zustand („neu / gesichtet / weitergeleitet an S2/S3/S4“) und keine Kennzeichnung, wer ihn gelesen hat. Er steht nur zwischen den automatisch erzeugten Zeilen (Schichtplan, PSA-Bedarf, Dienstposten …) — in der Prüflage 134 Zeilen, davon meine fünf Nachrichten. Das Muster dafür gibt es in der Anwendung schon: Der Eingangskorb führt für Erfassungsbögen die Ampel „Neu → Übernommen / Abgelehnt mit Grund“ (`Eingangskorb.tsx`, Kopfkommentar) — aber nur für Bögen, nicht für Nachrichten **[Code]**.
4. **Erwartung der Rolle:** Die FmZ sieht, welche Nachrichten der Sichter noch nicht übernommen hat; der Sichter hat einen Korb, keine Volltextsuche im Tagebuch.
5. **Auswirkung im Einsatz:** Die Übergabe FmZ → Sichter läuft weiter mit Papier (Durchschlag, Ablagekorb) oder mündlich; eine im Rechner erfasste Nachricht kann unbemerkt liegen bleiben.
6. **Empfehlung:** Nachrichten in einen eigenen Korb mit Zustand „neu / vom Sichter übernommen (wer, wann) / weitergeleitet an …“, analog zur bestehenden Ampel des Eingangskorbs; offene Zahl am Reiter wie bei „Eingang“.
7. **Verifikation:** FmZ-Platz erfasst Nachricht → Sichter-Platz sieht sie als „neu“ mit Zähler → nach Übernahme sieht die FmZ „übernommen von … um …“.

### F4 — P1: Nachträglich erfasste Papiernachrichten: Zeit wird still falsch gedeutet, Reihenfolge bleibt die der Erfassung

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Prüfaufgabe 3; Zeitfeld der Tagebuchmaske (`apps/desktop/src/renderer/funkzeit.ts`: „hhmm = heute“), Prüfung nur für Status und Funkprobe (`apps/desktop/src/worker/zustandspruefung.ts:70`). Screenshots `08-zukunft-angenommen.png`, `09-tagebuch-nach-nachtrag.png`.
3. **Beobachtung:** **[beobachtet]** Um 20:46 nachgetragen: „1915“ → 05.11. 19:15, korrekt. „2350“ (gemeint: gestern 23:50 vom Meldeblock) → gespeichert als **05.11. 23:50, also drei Stunden in der Zukunft**, ohne Rückfrage. Erst „042350“ ergibt 04.11. 23:50. Für Status und Funkprobe weist der Dienst Zeiten in der Zukunft ab, für Tagebucheinträge nicht **[Code]**. Die Liste ordnet nach Erfassung, nicht nach Zeit der Meldung: Im Bildschirm und im Ausdruck „Tagebuch als HTML“ („älteste zuerst“) stehen die Zeilen 19:15 · 23:50 (heute) · 23:50 (gestern) · 20:48 untereinander; der Ausdruck zeigt dabei nur noch eine Spalte „Zeit“ **[beobachtet]**.
4. **Erwartung der Rolle:** Nacherfassung nach Rechnerausfall ist Routine — die ursprüngliche Uhrzeit und die ursprüngliche (Papier-)Nummer werden übernommen, unplausible Zeiten werden abgefangen, und die Nachweisung lässt sich nach Zeit der Nachricht lesen.
5. **Auswirkung im Einsatz:** Über Mitternacht nachgetragene Nachrichten landen mit falschem Datum in der Akte; die Abfolge der Nachrichten ist im Ausdruck nicht mehr nachvollziehbar. Gerade die Lücke des Ausfalls wird damit unzuverlässig dokumentiert.
6. **Empfehlung:** Zeiten in der Zukunft auch beim Tagebucheintrag abweisen oder mit „gestern?“ rückfragen; beim Nachtragen ein Feld für die Papiernummer und eine Kennzeichnung „nacherfasst“; Nachweisung wahlweise nach Zeit der Nachricht sortieren; im Ausdruck beide Zeiten getrennt.
7. **Verifikation:** Um kurz nach Mitternacht „2350“ eintragen → Rückfrage oder Vorjahrestag; Ausdruck nach Zeit der Nachricht zeigt nachgetragene Zeilen an der richtigen Stelle, mit Kennzeichnung.

### F5 — P1: Keine Nachweisung des Fernmeldeverkehrs

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Prüfaufgabe 4; Blatt Einsatztagebuch, Blatt Ausgaben → „Tagebuch als PDF/HTML“. Screenshots `10-tagebuch-suche-funk.png`, `13-ausgaben.png`.
3. **Beobachtung:** **[beobachtet]** Eine „Liste aller Nachrichten der letzten Stunde mit Status“ lässt sich nicht erzeugen. Das Tagebuch kennt Suche, „Auf die Auswahl beschränken“ und „Nur Rücknahmen“ — keinen Zeitraum, keinen Filter „nur Nachrichten“, keinen Status. Behelf: Suche „Funk:“ findet Funkeinträge, aber keine Telefonnachrichten und nichts, wo jemand den Vorsatz anders getippt hat. Am Bildschirm stehen höchstens 100 Zeilen („100 von 134 Einträgen“), ältere nur über die Suche. Der Ausdruck „Tagebuch als HTML“ enthält alles (136 Einträge), aber ungefiltert mit allen Systemzeilen, ohne Nummer, Absender, Empfänger, Quittung.
4. **Erwartung der Rolle:** Eine druckbare Nachweisung (laufende Nummer, Zeit, Richtung, Weg, Absender, Empfänger, Kurzinhalt, Quittung, Verbleib) für einen wählbaren Zeitraum, übergebbar an das ETB **[Annahme: üblicher Inhalt einer Nachweisung]**.
5. **Auswirkung im Einsatz:** Die Nachweisung wird weiter von Hand geführt; zum Schichtwechsel oder für die Einsatzakte muss sie aus dem Tagebuch herausgelesen werden.
6. **Empfehlung:** Ausgabe „Nachweisung Fernmeldeverkehr“ mit Zeitraum und Richtung als Filter; Tagebuch mit Filter „nur Nachrichten“ und Zeitraum.
7. **Verifikation:** „Letzte Stunde, alle Richtungen“ wählen → Liste nur der Nachrichten, mit Status, als PDF.

### F6 — P1: Falsch erfasste Nachricht lässt sich weder zurücknehmen noch berichtigen

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Blatt Einsatztagebuch; Statuszeile; `packages/domaene/src/katalog/schemata.ts:477` (`EtbEintragBerichtigt` existiert), im Renderer ohne Bedienweg **[Code]**; Tagebuchzeilen haben weder Klick noch Kontextmenü (`Tagebuch.tsx`, `Tagebuchreihe`).
3. **Beobachtung:** **[beobachtet]** Nach dem eigenen Tagebucheintrag steht in der Statuszeile „✓ Tagebucheintrag · gespeichert“ und daneben „↶ Rückgängig: nichts zurückzunehmen“. Bei Funkprobe dagegen bietet die Zeile „Rückgängig: Funkprobe … eingetragen“. Eine Zeile im Tagebuch lässt sich nicht anwählen, berichtigen oder als Irrläufer kennzeichnen.
4. **Erwartung der Rolle:** Ein Zahlendreher in Uhrzeit oder Absender wird wie auf Papier berichtigt — durchgestrichen und neu, mit Grund, nachvollziehbar.
5. **Auswirkung im Einsatz:** Falsche Zeit (siehe F4) oder falscher Absender bleiben dauerhaft in der Akte; die Berichtigung bleibt eine zweite Freitextzeile, die niemand mit der ersten verbindet.
6. **Empfehlung:** Die im Datenmodell vorhandene Berichtigung bedienbar machen (Zeile wählen → „Berichtigen …“ mit Grund), Rückgängig für den eigenen letzten Eintrag wie bei anderen Schritten.
7. **Verifikation:** Eintrag mit falscher Uhrzeit → „Berichtigen“ → Ausdruck zeigt Original und Berichtigung verbunden.

### F7 — P2: Funknachricht und Einheit sind nicht verknüpft

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Maske „Eintrag ins Einsatztagebuch“; `schemata.ts:464-474` (Feld `bezug` auf Einheit/Abschnitt/Fahrzeug/Anforderung vorhanden, in der Maske nicht angeboten) **[Code]**.
3. **Beobachtung:** **[beobachtet]** Eine Nachricht von „Heros Oldenburg 21/12“ lässt sich keiner Einheit zuordnen; „Auf die Auswahl beschränken“ und der Funkauszug in „Funk und Erreichbarkeit“ können sie deshalb nicht zeigen. Auch der „letzte Kontakt“ im Funkplan bleibt von einer eingegangenen Nachricht unberührt — nur Funkprobe und Statusmeldung zählen (Handbuch, Abschnitt Funkplan).
4. **Erwartung der Rolle:** Wer sich über Funk meldet, hat Kontakt gehabt; seine Nachrichten stehen bei ihm.
5. **Auswirkung im Einsatz:** Eine Einheit, die gerade eine Nachricht abgesetzt hat, wird nach Ablauf der Schwelle trotzdem bernsteinfarben und zur Funkprobe fällig; Rückfragen „was hat 21/12 zuletzt gemeldet?“ gehen nur über Volltextsuche.
6. **Empfehlung:** Absender aus den Einheiten bzw. Funkrufnamen wählbar (Freitext bleibt möglich); eine Nachricht von einer Einheit zählt als Kontakt.
7. **Verifikation:** Nachricht mit Absender „BGr 1 Oldenburg“ erfassen → „Letzter Kontakt“ springt auf die Nachrichtenzeit, Funkauszug der Einheit zeigt sie.

### F8 — P2: Rufgruppen dürfen doppelt heißen und sind dann nicht unterscheidbar; Enter legt halbe Namen an

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Funkplan → „Rufgruppe anlegen“, Maske „Funk und Erreichbarkeit“. Screenshots `14-rufgruppe-fleetmapping.png`, `15b-nach-strgp.png`.
3. **Beobachtung:** **[beobachtet]** Ich tippte „Oldenb“ ins Namensfeld, um die Fleetmapping-Vorschläge zu sehen; es kam „Nicht im Fleetmapping: wird als eigene Rufgruppe mit diesem Namen angelegt“, Pfeil ab + Enter legte die Gruppe sofort mit dem halben Namen an. Bei Wiederholung entstanden drei Gruppen „Oldenb“ ohne jeden Hinweis. In der Auswahl „Hauptrufgruppe“ stehen sie dann dreimal gleich als „Oldenb (TMO)“.
4. **Erwartung der Rolle:** Ein Funkplan hat jede Rufgruppe einmal; wer eine Dublette anlegt, wird gewarnt.
5. **Auswirkung im Einsatz:** Einheiten werden auf verschiedene, gleich benannte Gruppen verteilt; der Ausdruck für die Sprechfunker zeigt dieselbe Gruppe mehrfach mit unterschiedlichen Teilnehmern.
6. **Empfehlung:** Hinweis bei gleichem Namen; Enter ohne gewählten Vorschlag nicht sofort als Anlegen werten.
7. **Verifikation:** Zweimal „T_OL_1“ anlegen → zweite Anlage fragt nach oder wird abgewiesen.

### F9 — P3: Profil „Vermeldezentrale“ öffnet auf der Lage; Begriff

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Einsatzauswahl → Profil „Vermeldezentrale“ → Öffnen. Screenshot `03-vermeldezentrale-start.png`.
3. **Beobachtung:** **[beobachtet]** Funkplan steht als erster Reiter, geöffnet wird aber die Lage mit der Einheitentabelle. Der Name „Vermeldezentrale“ wird im Glossar mit „FmZ — Fernmeldezentrale“ gleichgesetzt (`HANDBUCH.md`, Abkürzungen); in der Führungsstelle sagt man nach meiner Erfahrung „Fernmeldezentrale“ oder „Fm-Zentrale“ **[Annahme]**.
4. **Erwartung der Rolle:** Der Platz öffnet dort, wo die Rolle arbeitet, und trägt den gewohnten Namen.
5. **Auswirkung im Einsatz:** Ein Klick mehr je Start; kleine Unsicherheit, ob das Profil gemeint ist.
6. **Empfehlung:** Erstes Blatt des Profils beim Öffnen zeigen; Begriff mit der Führungsstelle abstimmen.
7. **Verifikation:** Profil wählen → Funkplan steht nach dem Öffnen offen.

### F10 — P3: Papier-Vordruck „Meldeblock“ ohne Nummernfeld

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Ausgaben → „Papier-Vordruck“; `packages/ausgaben/src/papier.ts:66-79` (Meldeblock), `:96-103` (Funkprotokoll) **[Code]**.
3. **Beobachtung:** Der Meldeblock trägt Datum, Uhrzeit, Von, An, Weg, Funkrufname, Dringlichkeit, Meldung, Maßnahme, „Aufgenommen von“, „Quittiert (Uhrzeit)“ und „im Rechner nachgetragen“ — das ist für den Ausfall gut gedacht. Ein Feld für die Nachrichtennummer fehlt; das Funkprotokoll hat Spalten „Uhrzeit · Von · An · Inhalt · Quittiert · Nachgetragen“, ebenfalls ohne Nummer. Der Vordruck ist damit reicher als die digitale Maske (F2), die die meisten dieser Felder nicht kennt.
4. **Erwartung der Rolle:** Papier und Rechner haben dieselben Felder, damit die Nacherfassung eins zu eins geht.
5. **Auswirkung im Einsatz:** Beim Nachtragen gehen Von/An/Dringlichkeit/Quittung in Freitext über oder verloren.
6. **Empfehlung:** Nummernfeld ergänzen; digitale Maske an diesen Vordruck angleichen (siehe F2).
7. **Verifikation:** Vordruck und Maske Feld für Feld nebeneinanderlegen.

## Positives

- **Funkprobe** ist schnell und sauber: Einheit in der Zuordnung anklicken, Strg+P, Bestätigung in der Statuszeile, Zeile in „Funkproben“ mit Funkzeit, Ergebnis und „Eingetragen von FmZ Platz 1“, dazu ein Tagebucheintrag; die Probe ist rückgängig zu machen **[beobachtet]**.
- **Parallelbetrieb** zweier Plätze: Gleichzeitig gespeicherte Einträge gingen nicht verloren, beide Plätze sahen nach rund 4 s dieselbe Liste in derselben Reihenfolge, der Anzeigename des Platzes steht an jeder Zeile **[beobachtet]**.
- **Funkzeit-Eingabe** versteht „0630“, „06:30“ und „280630“ wie über Funk durchgegeben; die Maske hält bei einem Fehler den getippten Text fest **[beobachtet]**.
- **Papier-Vordrucke** (Meldeblock, Funkprotokoll, Funkplan leer) sind vorhanden und vorab druckbar; der Meldeblock hat schon „Quittiert“ und „im Rechner nachgetragen“ **[Code]**.
- Die **Ampel des Eingangskorbs** (Neu → Übernommen / Abgelehnt mit Grund, nichts wird gelöscht) ist genau das Übergabemuster, das die FmZ zum Sichter bräuchte **[beobachtet]**.

## Abschluss

- **Aufgabe der Rolle geschafft:** nein — Funkprobe und Funkplan ja; Nachricht annehmen nur mit Umweg (Uhrzeit von Hand), Nachricht abgeben/quittieren, Übergabe an den Sichter und Nachweisung nicht.
- **Nebenaufzeichnung auf Papier nötig:** ja — für Nachrichtennummer, Ein-/Ausgang, Absender/Empfänger, Quittung, Übergabe an den Sichter und die Nachweisung des Fernmeldeverkehrs.
- **Größte Lücke an einer Übergabe:** Von der Fm-Zentrale an den Sichter gibt es keinen Übergang — eine erfasste Nachricht steht nur im Tagebuch, ohne Empfänger, Zustand oder Übernahmebestätigung.
- **Größtes Einsatzrisiko:** Der einzige digitale Erfassungsweg für Nachrichten scheitert im Normalfall (leeres Zeitfeld) mit einer technischen Meldung, sodass Nachrichten unter Zeitdruck nicht gespeichert werden.
- **Top-Priorität für die nächste Iteration:** „Eintrag hinzufügen“ mit leerem Zeitfeld speicherbar machen und mit Regressionstest absichern; danach eine Nachrichtenerfassung mit Nummer, Richtung, Absender/Empfänger und Quittung nach dem Muster des eigenen Meldeblocks.
