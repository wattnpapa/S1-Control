# Audit Runde 2: Nachrichten (4-fach-Vordruck) aus Sicht des Fachberaters einer anderen Hilfsorganisation (DRK)

Datum: 2026-11-17
Rolle des Prüfers: DRK-Bereitschaftsführer, als Fachberater in eine THW-Führungsstelle gesetzt. Fachlich erfahren in der eigenen Organisation, aber ohne Stabsausbildung, ohne Kenntnis des 4-fach-Vordrucks und der Wörter Sichter, FmZ, LdF, Nachweisung, Kopiefarben, Datum-Zeit-Gruppe oder Vorrangstufen; zum ersten Mal an diesem Programm. Einweisung des Leiters der Führungsstelle: „Du bist Fachberater DRK, wir schreiben dir, was wir von euch brauchen, und du antwortest darüber; wenn du etwas an deine Leitstelle willst, geht das auch darüber.“ Mehr nicht.

## Scope und Methodik

- Stand: main a0e53b5. Geprüft wurde an der **laufenden Instanz** (Web-Schale, http://127.0.0.1:8080/), Chromium über Playwright, Viewport 1320 x 860. Eigener Einsatz „Runde 2 Fachberater“ (Einsatz, Zwei Schichten) auf dem gemeinsamen Share. Mein Arbeitsplatz war ein eigener Browser-Kontext mit der Stelle „Fachberater“, Handzeichen „Mka“.
- Gegenseite in einem zweiten Browser-Kontext (zuletzt mit den Stellen S3, Sichter, FmZ, Handzeichen „Si“/„Fm“): Eingang aufnehmen (Funk, „Bitte 20 Sanitäter für Deich Nord bis 1600 stellen“), sichten und an „Fachberater“ grün verteilen, später ein Sofort-Eingang mit „Fachberater“ blau, außerdem Annahme und Beförderung meiner beiden Ausgänge. Das Urteil kommt ausschließlich aus dem Kontext des Fachberaters.
- **Ohne Einweisung, Handbuch erst danach.** Vorab gelesen wurden nur `docs/audits/README.md` und der Aufbau von `docs/audits/nachrichten/reviewer-sachgebietsleiter.md`. Der Durchlauf geschah nur mit dem, was das Programm selbst zeigt (Einstiegszeile, Tooltips, Hilfe mit Strg+H). Erst danach habe ich `docs/v2/HANDBUCH.md` (Abschnitt „Nachrichten“) und `docs/v2/KURZANLEITUNG.md` gelesen (letzter Abschnitt unten). Den Code habe ich erst nach dem Durchlauf nur für Fundstellen durchsucht.
- Belege: Screenshot-Namen (liegen als PNG im Scratchpad `/tmp/claude-0/-home-user-S1-Control/03036fe6-b619-5ee0-aa3a-bdc9e86fdba4/scratchpad/review2-fabe/`) oder Datei:Zeile. Annahmen sind als solche gekennzeichnet. Es wurde kein Quellcode und kein anderes Dokument geändert.
- **Eigener Fehler, offengelegt:** Mein erstes Skript hat beim Öffnen die falsche Zeile der Einsatzliste getroffen und kurz den Einsatz „Runde 2 Sichter“ (anderer Reviewer) geöffnet. Dort habe ich die Stelle „Sichter“ (Hz. „Si“) gesetzt, die Nachrichten-Sicht und die Maske angesehen, nichts verfasst, nichts verteilt, und den Einsatz über „Einsatz schließen“ wieder geschlossen. Im Tagebuch und in der Anwesenheit dieses Einsatzes kann dadurch kurz ein weiterer Arbeitsplatz mit Stelle Sichter stehen. Alle weiteren Läufe prüfen den Einsatznamen vor jeder Bedienung.
- Nicht geprüft: Ton bei Blitz (Browser ohne Audio), Schwellenwarnung nach 20 Minuten in der FmZ (nicht abgewartet; längste beobachtete Wartezeit 6 Minuten), PDF-Ausdruck, Station LdF.

## Kurzes Urteil aus Rollensicht

Hätte ich das ohne Hilfe geschafft? **Zum Teil.** Eine ankommende Nachricht finden, öffnen, „Lesen“, „Erledigt“ und „Antworten“ ging ohne Hilfe, weil das Programm seine Knöpfe hinschreibt und eine Nachricht binnen Sekunden von selbst im Reiter „Nachrichten“ auftaucht. Der Vordruck sieht aus wie das Papier, und die Sicherungen (Rückfrage bei „Zurückziehen“, „Verwerfen“, „Rückgängig“, Hinweis bei „Annehmen“) haben mich dreimal vor mir selbst geschützt.

Nicht geschafft habe ich es ohne Raten bei allem, wofür man das Vokabular des Stabs braucht: Das Handzeichen gleich auf der ersten Maske, die Felder Spruch/Durchsage/Sofort/Blitz/Übermittlungswunsch, der Laufzettel (G/B/R), die Gesprächsnotiz und die Frage „Ist meine Nachricht wirklich draußen?“. Kein einziges dieser Wörter wird im Programm erklärt. Die Abkürzungsliste in der Hilfe kennt FmZ, Sichter, LdF, Nachweisung, Blitz und DRK nicht (0 Treffer).

Gefährlich ist, was **stumm** geht: Ich konnte als Fachberater eine Nachricht „sichten“ und damit aus der Warteschlange des Sichters nehmen, ohne eine Rückfrage zu bekommen (P0-1). Ich lese „Quittung 172040NOV26 Fm“ und denke, die Leitstelle hat bestätigt (P0-2). Und ich erfahre nicht, ob überhaupt jemand die Funkzentrale besetzt hat, an die meine Zusage geht (P0-3). Eine Übergabe an die Ablösung gibt das Programm nicht her (P1-6).

## Mein Durchlauf, Schritt für Schritt

| Schritt | Was ich gesucht habe | Was ich vermutet habe | Wo ich falsch lag | Wörter, die ich nicht verstand |
| --- | --- | --- | --- | --- |
| 1 Einsatz öffnen, erste Abfrage | „Neuer Einsatz“, dann ein Name; danach fragt das Programm von selbst nach „Stelle und Handzeichen“ (Screenshot 03-nach-anlegen). | „Fachberater“ ist ein Kästchen, also meins. Handzeichen = meine Unterschrift/Kürzel, vielleicht „DRK“. | Ohne Handzeichen bleibt „Übernehmen“ grau; der Grund steht erst nach dem Haken in kleiner Schrift („Handzeichen eintragen (zwei bis vier Zeichen)“, 05-fabe-angehakt). Was ein Handzeichen ist und wo es später steht, sagt die Maske nicht. Ich habe „Mka“ geraten (meine Initialen). | Handzeichen, Stelle („Zuschnitt, kein Recht“) |
| 2 Wo kommen Nachrichten an? | Zuerst Reiter „Eingang“ (07-eingang-tab): dort liegt der „Eingangskorb“ mit Erfassungsbögen und „Bündel einlesen“, nicht meine Post. Dann „Nachrichten“ (06-nachrichten-leer). | „Eingang“ = eingehende Nachrichten. | Falsch. Meine Post liegt unter Nachrichten, Sicht „Posteingang“. Gefunden habe ich sie erst, weil ich alle Reiter angeklickt habe. Danach hat mich der amber Zähler am Reiter („Nachrichten 1“) geführt (e1-fabe-ohne-anfassen). | Eingangskorb, Erfassungsbogen, Bündel |
| 3 Farben, Marken, „Kenntnis“, „erledigen“ | Hover über die Knöpfe; Tooltips sagen „nimmt für die eigenen Stellen des Verteilers Kenntnis“ (Nachrichtenauswahl.tsx:61). Die Zeile sagt „grün: bearbeiten“ bzw. „blau: Kenntnis“ (nachrichtenformate.ts:52-55). | grün = erledigen/handeln, blau = nur lesen. | Richtig, aber nur weil das Wort in der Zeile steht. „Lesen“ ist nicht nur Ansehen, sondern schreibt sofort eine Kenntnisnahme mit meinem Handzeichen (e3-nach-lesen); „Erledigt“ schickt nichts zurück an den Absender. | Kopie, Kenntnis, Laufzettel, Quittung, Verteiler, „gelesen“ als amtliche Marke |
| 4 Antworten | „Antworten“ in der Leiste (e4-antwort-maske), Text, „Aufgeben“. | Die Antwort geht jetzt an den S3. | Teilweise falsch: Sie ging als **Funkspruch** („Funk“ vorbelegt, Anschrift „S3“, Absender „FüSt OV Test“) in die Warteschlange der Funkzentrale und war erst nach deren Annahme und Beförderung „weg“ (g7-ausgang-befoerdert). Danach kam sie als „neu, grün: bearbeiten“ in meinen eigenen Posteingang zurück (g7-posteingang). | Aufgeben, Ausgangswarteschlange, Annahme, Beförderung, „folgt (FmZ)“ |
| 5 Eigene Nachricht an die Leitstelle | „Nachricht verfassen“ (i1-maske-neu); die graue Hilfszeile neben „Aufgeben“ nannte zuerst nur die Anschrift. Ich habe „DRK Leitstelle“, Telefon, Zeit „20:33“ eingetragen und Strg+D probiert. | Sofort/Blitz = dringend (aber wie dringend?), Spruch/Durchsage = Art der Sprechweise (geraten, nicht gewählt). | Beim Aufgeben schließt die Maske, die Liste bleibt auf „Posteingang“, unten blitzt „Nachricht verfasst · gespeichert“ (i4-nach-aufgeben). Dass die Nachricht noch bei der Funkzentrale wartet, steht nur in der Sicht „Ausgang“ („vor der FmZ“, j1-ausgang-zwei). | Spruch, Durchsage, Sofort, Blitz, Übermittlungswunsch, Ruf-Nr., Datum-Zeit-Gruppe |
| 6 Telefonat als Gesprächsnotiz | Ich habe das Kästchen „Gesprächsnotiz“ im Maskenkopf gefunden, weil das Wort dort steht; was es tut, sagt die Maske nicht (j1-gespraechsnotiz). | Ein Gesprächsprotokoll für mich. | Es öffnet zusätzlich einen Laufzettel mit G/B/R-Kästchen und „Selbst verteilen / An den Sichter“ und verlangt trotzdem eine „Anschrift“. Danach steht die Notiz in meinem „Ausgang“ als **E** (Eingang) mit Nr. „—“ und roter Kopie (j2-gn-aufgegeben). | Gesprächsnotiz, Selbst verteilen, Hauptempfänger, G/B/R |
| 7 Übergabe an die Ablösung | Eine Übersicht „offen“ oder „Übergabe“. | Irgendwo steht, was noch offen ist. | Gibt es nicht. Offen ist die Summe aus: Posteingang „neu“ + „gelesen“ ohne „erledigt“, Ausgang nicht „befördert“, Nachweisung ohne Nummer (m1-nachweisung). Die Stelle-Maske sagt nur „Die Wahl gilt, bis der Einsatz geschlossen wird“ (q1-aendern). | Nachweisung, Berichtigen, Nachweisen |
| 8 Versehentliche Klicks | „Annehmen“ in der Sicht Fernmeldezentrale, „Zurückziehen …“, Esc, „Abbrechen“, „Rückgängig“, „Sichten“. | Es wird schon einen Schutz geben. | Meist ja (Hinweise, Rückfragen), aber **nicht bei „Sichten“** (P0-1). | Fehlanlage, Vorbehalt („Felder 1 bis 6“) |

## Wörter, die ich nicht kannte

Eine Erklärung im Programm gibt es nur dort, wo ich sie nenne. In der Hilfe (Strg+H) führt der Reiter „Abkürzungen“ nur THW-Einheiten und Fahrzeuge (108 Einträge); die Suche nach FmZ, Sichter, LdF, Nachweisung, Blitz, Spruch und DRK liefert „0 von 108 Einträgen“ (k6). Der Reiter „Ansichten“ hat unter „Nachrichten“ einen langen Absatz, der die Wörter benutzt, aber nicht erklärt (bedienhilfe.ts:126).

| Wort | Wo ich es traf | Was das Programm dazu sagt |
| --- | --- | --- |
| Handzeichen | erste Maske, jede Nachricht | Nur „2 bis 4 Zeichen“ (Platzhalter) und die Fehlzeile „Handzeichen eintragen (zwei bis vier Zeichen)“ (nachrichtenformate.ts:120). Keine Erklärung, wofür, wo es steht, ob es mich identifiziert. |
| Stelle | erste Maske | „Welche Position hat dieser Arbeitsplatz im Stab? … Sie ist ein Zuschnitt, kein Recht“ (Stellenabfrage.tsx:100-110). Verständlich bis auf „Zuschnitt“. |
| FmZ, Fernmeldezentrale | Band („VOR DER FMZ“), Sicht, Maske | Keine Erklärung. Das Band hat nicht einmal einen Tooltip (Nachrichten.tsx:100-110). |
| Sichter, Sichten, gesichtet | Sicht, Maske, Stand | Keine Erklärung. Die Hilfe sagt „zeigt die Eingänge ohne Sichtung“. |
| LdF | Stellenliste | Keine Erklärung im Programm. |
| Nachweisung, Nachweisen, Berichtigen | Sicht, Knöpfe | Keine Erklärung; „Berichtigen“ steht als Knopf an jeder Zeile (m1-nachweisung). |
| Laufzettel, Quittung, Verteiler | Vordruck | Nur als Zwischenüberschriften. Keine Erklärung. |
| Kopiefarben grün/blau/rot, G/B/R | Liste, Laufzettel | In der Liste ausgeschrieben („grün: bearbeiten“, „blau: Kenntnis“, „rot: S2“, nachrichtenformate.ts:52-55). Im Laufzettel nur die Buchstaben G, B, R (aria-Label „Fachberater grün“). |
| neu / gelesen / erledigt | Marken | Chips ohne Erklärung („Klicken filtert die Liste“). |
| Kenntnis | Tooltip, Statuszeile | Nur im Tooltip von „Lesen“ und als „Nachricht zur Kenntnis genommen“ nach dem Klick. |
| Vorrang, Sofort, Blitz | Maske, Liste, Hinweisleiste | Keine Erklärung, wie dringend was ist und wer was zu tun hat. |
| Spruch, Durchsage | Maskenkopf | Keine Erklärung, kein Tooltip (Nachrichtenmaske.tsx:110-135). |
| Übermittlungswunsch | Maskenkopf | Keine Erklärung; Auswahl „— / Funk / Telefon / Telefax / DFÜ / Kurier/Melder“. |
| Gesprächsnotiz | Maskenkopf | Keine Erklärung; Folgewirkung (Laufzettel, Selbst verteilen) erscheint erst nach dem Haken. |
| Abfassungszeit, Datum-Zeit-Gruppe | Maske | Tooltip „Datum-Zeit-Gruppe; Strg+D setzt ‚jetzt‘“, darunter Klartext „17.11.2026 20:33“ (i2-abfassung-hhmm). Das reicht. |
| Aufnahme, Annahme, Beförderung | Vordruck, Stand | Keine Erklärung, wer das ist. „angenommen 2031 Fm“ hielt ich für „vom Empfänger angenommen“. |
| Hauptempfänger | Warnung | „Keine Stelle hat die grüne Kopie – wer soll handeln?“ (Verteilerraster.tsx:39). Versteht man erst nach „grün = bearbeiten“. |
| Schwelle, „über der Schwelle“ | Band, FmZ-Karte | „Schwelle 20 min“ in der Kartenüberschrift, Band-Kachel ohne Erklärung. |
| Fehlanlage | „Zurückziehen“ | Tooltip „Eine Fehlanlage zurückziehen; fragt nach dem Grund“. Wort unbekannt, Satz trägt. |
| Vorbehalt, „Felder 1 bis 6“ | Hinweis bei „Annehmen“ | „Dieser Teil ist der Fernmeldezentrale vorbehalten (Vordruck, Felder 1 bis 6)“ (Stellenvorbehalt.tsx:32). Ohne Papiervordruck sind Felder 1 bis 6 nicht auffindbar. |
| 1103.1, 4-fach-Vordruck | Einstiegszeile | „Das Blatt für Nachrichten nach Vordruck 1103.1“ – eine Nummer, keine Aufgabe. |

---

## P0 – Falsch getan oder Wichtiges nicht erfahren, ohne es zu merken

### R2-FaBe P0-1 „Sichten“ geht für jeden, ohne Hinweis; die Nachricht verschwindet aus der Warteschlange des Sichters

**Schritt:** 8 (versehentlicher Klick). **Belege:** r1-sichter-sicht, r1-sichten-klick, r2-nach-undo; `Laufzettel.tsx:236` (Knopf „Sichten“ ohne Stellenprüfung); `Stellenvorbehalt.tsx:30` (der Hinweis kennt nur annahme, befoerderung, nachweis, vorschlag, weitergabe); `Verteilerraster.tsx:39`.

**Beobachtung:** Die Sicht „Sichter“ stand mir als Fachberater offen. Ich wählte eine Nachricht von „RTW 12“ (Test), der Laufzettel erschien mit dem Satz „Kein Hauptempfänger: Keine Stelle hat die grüne Kopie – wer soll handeln?“ und einem Knopf „Sichten“. Ich klickte. Keine Rückfrage. Unten stand „Nachricht E 5 ‚Test Sichter-Sicht‘ gesichtet · gespeichert“, die Nachricht war aus der Sichter-Liste verschwunden und nur an S2 (rot) verteilt. Niemand hatte die grüne Kopie.

**Auswirkung:** Ein Fachberater, der „mal schaut“, nimmt dem Sichter die Nachricht weg und verteilt sie falsch. In der Praxis wäre das eine Meldung der Einheit draußen, die nie bei dem ankommt, der handeln soll. Beim „Annehmen“ in der Fernmeldezentrale bekam ich dagegen einen Hinweis („vorbehalten … Trotzdem eintragen?“, g2-nach-annehmen); der Schutz ist also nur auf einem Teil der Schritte da, und ich hatte keine Möglichkeit, das zu ahnen.

**Gerettet hat mich:** der Knopf „Rückgängig“ (Dialog „Das gilt für alle Arbeitsplätze …“, r2-undo-dialog); danach stand E 5 wieder „vor dem Sichter“.

**Vorschlag (meine Worte):** Wer nicht Sichter ist, bekommt vor „Sichten“ denselben Hinweis wie bei „Annehmen“ („Das ist die Aufgabe des Sichters. Trotzdem?“). Und wenn niemand die grüne Kopie hat, sollte „Sichten“ erst nach einem zweiten Klick gehen, nicht nach einer Warnzeile.

### R2-FaBe P0-2 „Quittung“ steht schon da, und ich halte meine Zusage für angekommen

**Schritt:** 4/5 (Antwort, Nachricht an die Leitstelle). **Belege:** g5-befoerdern (Maske der FmZ mit „Quittung der Gegenstelle (Datum/Uhrzeit)“ bereits mit der Beförderungszeit gefüllt: 172031nov26), p2-vordruck-ausgang („Quittung 172040NOV26 Fm“); `Fmzmasken.tsx:104-107`.

**Beobachtung:** Nach der Beförderung meiner Nachricht an die „DRK Leitstelle“ steht im Vordruck unter Laufzettel „Quittung 172040NOV26 Fm“, in der Liste „angenommen 2040 Fm · befördert 2040 Fm (Telefon)“. In der Maske der Funkzentrale war das Quittungsfeld bereits mit „jetzt“ vorbelegt; klickt die FmZ nur „Befördern“, steht die Quittung der Gegenstelle auf der Minute der Beförderung.

**Auswirkung:** Ich als Absender lese „Quittung“ und denke: Die Leitstelle hat meine Zusage von 20 Sanitätern bestätigt. Ob das stimmt, kann ich nicht sehen. Wenn die Leitstelle nie bestätigt hat, plane ich mit einer Zusage, die niemand angenommen hat.

**Annahme:** Eine eingewiesene FmZ ändert oder leert das Feld, wenn die Gegenstelle nicht quittiert hat. Ob das im Alltag passiert, kann ich aus meiner Rolle nicht beurteilen.

**Vorschlag (meine Worte):** Quittung leer lassen, bis jemand sie wirklich einträgt, und in der Ausgangsliste einen eigenen Stand „befördert, noch nicht quittiert“ zeigen. „angenommen“ in der Liste sollte „angenommen von der FmZ“ heißen, nicht „angenommen 2031 Fm“ (ich hielt das für eine Quittung des Empfängers).

### R2-FaBe P0-3 Ich erfahre nicht, ob die Funkzentrale überhaupt besetzt ist; meine Nachricht kann unbemerkt liegen bleiben

**Schritt:** 4/5. **Belege:** e5-nach-aufgeben, e6-ausgang, f1-fmz („Wartet 0 min“, später 6 min), g1-fabe-fmz; Statuszeile „1 weiterer Arbeitsplatz“ ohne Aufschlüsselung (s1); `Nachrichten.tsx:100-110`.

**Beobachtung:** Nach „Aufgeben“ schließt die Maske, die Ansicht bleibt dort, wo ich war, und in der Statuszeile steht kurz „Nachricht verfasst · gespeichert“. Das Wort „aufgegeben“ oder „an die Fernmeldezentrale übergeben“ fällt nirgends; die Band-Kachel „VOR DER FMZ“ springt auf 1. Ob in der Führungsstelle überhaupt jemand die FmZ-Stelle hat, steht nirgends: Die Statuszeile nennt nur „1 weiterer Arbeitsplatz“, nicht welche Stelle. Die Hinweisleiste meldet Eingänge mit Sofort oder Blitz, aber nichts über einen eigenen Ausgang, der liegt.

**Auswirkung:** Ich gebe „20 Sanitäter zugesagt, Eintreffen 1530“ auf und halte es für gesendet. Ist der FmZ-Platz leer, liegt die Nachricht, und ich erfahre es höchstens an der amber Kachel „über der Schwelle“ nach der Schwellenzeit („Schwelle 20 min“ steht nur über der FmZ-Tabelle).

**Annahme:** Die amber Warnung nach 20 Minuten gibt es (laut Handbuch-Text, siehe unten), ich habe sie nicht abgewartet. Selbst dann wäre sie für mich eine Kachel mit unbekanntem Namen.

**Vorschlag (meine Worte):** Nach „Aufgeben“ eine Zeile in der Maske: „Liegt jetzt bei der Fernmeldezentrale. Besetzt: ja/nein.“ Und in der Nachrichten-Sicht „Meine Stelle: …“ daneben „FmZ besetzt: ja / Sichter besetzt: nein“. Wenn die FmZ nicht besetzt ist, soll das Programm sagen, dass ich anrufen muss.

---

## P1 – Blockiert, Hilfe nötig

### R2-FaBe P1-1 Das Handzeichen verlangt die allererste Maske, ohne dass jemand sagt, was es ist

**Schritt:** 1. **Belege:** 03-nach-anlegen, 05-fabe-angehakt; `Stellenabfrage.tsx:43`; `nachrichtenformate.ts:120`.
**Beobachtung:** „Übernehmen“ ist grau, bis ich Stelle und „Handzeichen (2 bis 4 Zeichen)“ gesetzt habe. Der Grund steht erst nach dem Haken; die Maske sagt nicht, dass das Handzeichen auf jedem Vordruck, im Tagebuch und im Laufzettel steht und dass es Verantwortung heißt.
**Auswirkung:** Ich habe meine Initialen geraten. Ein anderer hätte „DRK“ oder „xx“ geschrieben; auf dem Vordruck steht es später unter meinem Namen.
**Vorschlag:** Ein Satz unter dem Feld: „Dein Kürzel, mit dem du auf jedem Vordruck unterschreibst, z. B. Initialen.“

### R2-FaBe P1-2 Das Vokabular des Stabs wird nirgends erklärt, auch nicht in der Hilfe

**Schritt:** alle. **Belege:** k3-hilfe-Abkürzungen, k6 (0 Treffer für FmZ, Sichter, LdF, Nachweisung, Blitz, Spruch, DRK); `bedienhilfe.ts:126`.
**Beobachtung:** Siehe Tabelle oben: Die Hilfe benutzt Sichter, FmZ, Nachweisung, Laufzettel in einem langen Absatz, ohne sie zu erklären. Das Wort „Handzeichen“ erscheint in der Hilfe nur in Nebensätzen.
**Auswirkung:** Ich musste bei fast jedem Feld raten, welche Folge es hat. Wer das nicht kennt, wählt Vorrang nach Gefühl.
**Vorschlag:** Ein Reiter „Begriffe“ neben „Abkürzungen“ mit einem Satz je Wort (FmZ, Sichter, LdF, Nachweisung, Handzeichen, Vorrang, Laufzettel, Kopiefarben), erreichbar über ein „?“ an der Maske und an der Band-Kachel.

### R2-FaBe P1-3 Meine Antwort an den Stab läuft als Funkspruch durch die Funkzentrale

**Schritt:** 4. **Belege:** e4-antwort-maske (Mittel „Funk“, Anschrift „S3“, Absender „FüSt OV Test“), g7-ausgang-befoerdert („befördert 2031 Fm (Funk)“), m1-nachweisung (Mittel Funk, Gegenstelle „S3“); `nachrichtenformate.ts:236-243` (Anschrift und Absender getauscht, Übermittlungswunsch aus dem Aufnahmemittel der Vorlage).
**Beobachtung:** „Antworten“ hat mir den Absender des Eingangs (S3) als Anschrift eingetragen und das Mittel der Aufnahme (Funk) als Übermittlungswunsch vorbelegt. Als Absender stand „FüSt OV Test“, bei einer frisch verfassten Nachricht „Fachberater“ (nachrichtenformate.ts:211). Meine Antwort erschien im Ausgang als Nr. „folgt (FmZ)“, wurde von der FmZ angenommen und per Funk an den S3 befördert, der im selben Raum sitzt.
**Auswirkung:** Ich wusste nicht, dass „antworten“ heißt: eine Funkzeile für die Funkzentrale schreiben. Die Zusage wurde erst „weg“, als jemand an der FmZ zweimal klickte. Dass die Antwort mit dem Eingang nur über den Betreff „Antwort auf E 1: …“ verbunden ist und der Eingang weiter „gelesen“ bleibt, bis ich separat „Erledigt“ drücke, ist mir auch nicht aufgefallen (g3-abgebrochen, h1-erledigt).
**Annahme:** Das Handbuch sagt später, einen stabsinternen Weg an FmZ und Sichter vorbei gebe es bewusst nicht. Dann sollte das Programm es mir beim Antworten sagen.
**Vorschlag:** Über der Anschrift eine Zeile „Geht an die Fernmeldezentrale und wird von dort befördert“. Der Absender der Antwort sollte der gleiche sein wie bei einer neuen Nachricht (meine Stelle), nicht die ganze Führungsstelle.

### R2-FaBe P1-4 Meine eigene beförderte Nachricht kommt als „neu, grün: bearbeiten“ in meinen Posteingang zurück

**Schritt:** 4. **Belege:** g7-posteingang, l3-posteingang-sofort (Zähler „Nachrichten 2“ und „NEU FÜR MEINE STELLEN 2“, davon eine mein eigener Ausgang A 2); Handbuch-Gegenprobe siehe unten.
**Beobachtung:** Nach der Beförderung erscheint meine Antwort A 2 mit „grün: bearbeiten“ und der Marke „neu“ im Posteingang. Reiter-Zähler und Band-Kachel steigen. Der Vermerk darunter sagt „Kopien nach Beförderung: rot S2, grün Fachberater“.
**Auswirkung:** Ich las „bearbeiten“ als Auftrag an mich und suchte, was ich tun soll. Mit einem echten Sofort-Eingang zwischendurch sind „2 neu“ eine echte und eine falsche. Die Zahl taugt nicht mehr als Alarm.
**Vorschlag:** Eigene Ausgänge nicht als „neu“ zählen und nicht „bearbeiten“ nennen, sondern „Ablage: eigene Nachricht, befördert“.

### R2-FaBe P1-5 Gesprächsnotiz: ein Kästchen mit großen Folgen, ohne Erklärung

**Schritt:** 6. **Belege:** j1-gespraechsnotiz, j2-gn-gefuellt, j2-gn-aufgegeben, k1-Einsatztagebuch; `Vordruckeingabe.tsx:146`; `Verteilerraster.tsx:39`.
**Beobachtung:** Der Haken schaltet Laufzettel, G/B/R-Kästchen, „Selbst verteilen / An den Sichter“ und eine Warnung „Kein Hauptempfänger“ ein, verlangt aber weiter eine Anschrift („Anschrift eintragen“), obwohl ich mit niemandem „korrespondiere“, sondern ein Telefonat festhalte. Ich trug die Leitstelle als Anschrift ein und wählte S3 grün. Das Tagebuch führt dann „Gesprächsnotiz E gesichtet … verteilt an S2 (rot), DRK Leitstelle (grün), S3 (grün)“, als Akteur „Sichter · Mka“. Die Notiz steht in meinem „Ausgang“ als **E** mit Nr. „—“ und Stand „verteilt“.
**Auswirkung:** Ich habe nicht verstanden, dass meine Anschrift zum grünen Empfänger wurde (die „DRK Leitstelle“ ist als Stelle im Verteiler) und dass ich mich zugleich zum Sichter gemacht habe. Dass die Notiz nicht an die FmZ geht und keine Nummer bekommt, erfahre ich nirgends.
**Vorschlag:** Bei „Gesprächsnotiz“ eine Zeile: „Ein Gespräch, das du geführt hast. Es geht nicht an die Funkzentrale. Wähle, wer es bearbeiten soll (grün) und wer nur Bescheid wissen soll (blau).“ Die Anschrift heißt hier „Gesprächspartner“.

### R2-FaBe P1-6 Für die Übergabe gibt es keine Sicht „offen“

**Schritt:** 7. **Belege:** m1-nachweisung, q1-aendern, g7-posteingang, j1-ausgang-zwei.
**Beobachtung:** „Offen“ besteht für mich aus: Posteingang mit den Marken „neu“ und „gelesen“ ohne „erledigt“ (die Chips filtern je Zustand, nicht zusammen), Ausgang mit „vor der FmZ“ oder nur „angenommen“, Nachweisung mit Nachrichten ohne Nummer („Nachweisen“-Knopf). Die Maske „Stelle und Handzeichen“ sagt nur „Die Wahl gilt, bis der Einsatz geschlossen wird“; die Ablösung setzt ihr Handzeichen dort neu. Eine Übergabeliste „das ist offen, das wartet auf Antwort“ gibt es nicht.
**Auswirkung:** Ich kann der Ablösung nur sagen: „Schau in den Posteingang, in den Ausgang und in die Nachweisung.“ Dass meine eigene Nachricht „vor der FmZ“ noch liegt, würde ich beim Gehen vergessen.
**Vorschlag:** Eine Sicht oder ein Chip „Offen“ im Posteingang (neu + gelesen) und im Ausgang „noch nicht befördert“, mit Zähler. Beim Ändern des Handzeichens in „Stelle und Handzeichen“ eine Zeile: „Offen für diese Stelle: 2 im Posteingang, 1 im Ausgang.“

---

## P2 – Habe gesucht

### R2-FaBe P2-1 „Eingang“ im Reiterband ist nicht der Posteingang

Beleg: 07-eingang-tab. Der Reiter „Eingang“ führt zum Eingangskorb für Erfassungsbögen („Bündel einlesen …“). Ich habe dort meine Nachricht gesucht. Vorschlag: „Meldungen der Einheiten“ oder „Erfassungsbögen“ statt „Eingang“, oder in „Nachrichten“ der Hinweis „Hier kommt deine Post an: Posteingang“ in der Einstiegszeile.

### R2-FaBe P2-2 Die Einstiegszeile sagt, was das Blatt ist, nicht, was ich tun soll

Beleg: 06-nachrichten-leer. „Das Blatt für Nachrichten nach Vordruck 1103.1: Eingänge und Ausgänge mit Vorrang, Nummer, Absender, Anschrift und Betreff. Mehr in der Hilfe (Strg+H).“ Ich habe „Verstanden“ gedrückt und mich dann allein auf die Kachel „NEU FÜR MEINE STELLEN“ verlassen. Vorschlag: „Was für dich ankommt, steht unter Posteingang. Antworten und eigene Nachrichten gehen über die Fernmeldezentrale.“

### R2-FaBe P2-3 Die Erklärungen stecken in Tooltips; die Band-Kachel hat keinen

Belege: e3 (Titel von Lesen, Erledigt, Antworten, Weiterleiten, Zurückziehen), `Nachrichtenauswahl.tsx:61,75,82`, `Nachrichten.tsx:100-110` (Kacheln ohne Titel). Mit der Maus gut, auf dem Tablet unsichtbar. Vorschlag: Die Kachel „über der Schwelle“ und „vor der FmZ“ bekommen einen Satz, und die Leiste der gewählten Nachricht zeigt den Satz zu „Lesen“ („Kenntnis nehmen“) offen.

### R2-FaBe P2-4 „Lesen“ ist auch Kenntnisnahme; „Erledigt“ meldet nichts zurück

Belege: e3-nach-lesen („gelesen 172029NOV26 Mka“, „Nachricht zur Kenntnis genommen“), h1-erledigt, p2-vordruck-ausgang (auch bei meiner eigenen Nachricht „zur Kenntnis genommen“). Ich wollte „nur ansehen“, das Programm schrieb mein Handzeichen unter die Nachricht. „Erledigt“ ist sofort (ohne Rückfrage, mit „Erledigung zurück“ umkehrbar), aber der Absender S3 erfährt davon nichts außer über die Nachweisung. Vorschlag: „Lesen“ in „Lesen und Kenntnis nehmen“ umbenennen, „Erledigt“ mit einem Zeilentext („Der Absender sieht das nicht; antworte, wenn er etwas wissen muss“).

### R2-FaBe P2-5 Abfassungszeit: „171534“ wird kommentarlos als vor fünf Stunden gelesen

Belege: i2-abfassung-hhmm, i2-abfassung-falsch. Die Maske versteht „20:33“ und „171534“ (als 17.11. 15:34, mit Klartext darunter). Eine Zeit fünf Stunden vor „jetzt“ wird nicht beanstandet. Die Klartextzeile unter dem Feld ist gut, aber das Zahlendreher-Risiko (1534 statt 2034) ist da. Vorschlag: Bei mehr als 30 Minuten Abstand zu „jetzt“ eine Rückfrage „Das liegt 5 Stunden zurück. Stimmt das?“.

### R2-FaBe P2-6 Spruch / Durchsage / Sofort / Blitz / Übermittlungswunsch ohne Hilfe

Beleg: i1-maske-neu; `Nachrichtenmaske.tsx:110-135`. Es gibt keinen Tooltip und keine Zeile. Ich habe die Felder leer gelassen, „Telefon“ gewählt und Sofort nicht angehakt, obwohl meine Zusage „bis 1600“ galt. Vorschlag: Je Kästchen ein Satz (Sofort und Blitz: wie schnell muss es raus, laut Vorgabe der Führungsstelle), und „Übermittlungswunsch“ als „Wie soll es raus?“.

### R2-FaBe P2-7 Der Hinweis bei „Annehmen“ ist freundlich, aber nicht verständlich

Beleg: g2-nach-annehmen. „Dieser Teil ist der Fernmeldezentrale vorbehalten (Vordruck, Felder 1 bis 6). Trotzdem eintragen?“ – Ich habe verstanden: nicht meins. Ich habe nicht verstanden, wen ich stattdessen rufe, und das Wort „Trotzdem“ als Knopf liest sich wie eine Aufforderung. Vorschlag: „Das macht normalerweise die Fernmeldezentrale. Du bist nicht als FmZ eingetragen. Abbrechen oder trotzdem?“ mit Abbrechen als Vorauswahl.

### R2-FaBe P2-8 Der Knopf „Rückgängig“ nennt nach „Aufgeben“ einen älteren Schritt

Beleg: i4-nach-aufgeben (Fußzeile „Rückgängig: Nachricht E 1 ‚Sanitäter Deich Nord‘ erledigt“, nachdem ich die Nachricht an die Leitstelle aufgegeben hatte). Gesendete Nachrichten lassen sich nicht rückgängig machen, nur mit Grund zurückziehen, was ich erst durch Ausprobieren erfuhr. Die Rückfrage („Das gilt für alle Arbeitsplätze …“, o1-nach-rueckgaengig) schützt, aber das Fußzeilenlabel führt in die Irre. Vorschlag: Nach dem Aufgeben „Zurückziehen“ als Link in der Bestätigungszeile anbieten.

### R2-FaBe P2-9 Die Ausgangsliste mischt E und A, die Nummern laufen gemeinsam

Belege: j2-gn-aufgegeben, l3-posteingang-sofort. Meine Gesprächsnotiz steht im Ausgang als „E“, im Posteingang liegen A 2 und E 1 gemischt, die Reihenfolge ist weder nach Nummer (3, 1, 2) noch erkennbar nach Zeit. „E/A“ hat nur den Tooltip „Eingang oder Ausgang“. Vorschlag: Eigene Ausgänge im Ausgang zeigen, Gesprächsnotizen mit „Notiz“ statt „E“, Sortierung nach Zeit mit Vorrang zuerst.

---

## P3 – Unschön

- **R2-FaBe P3-1** Die Hinweisleiste hat den Knopf „Löschen“ (Tooltip „Alle Hinweise aus der Leiste nehmen“, `Hinweiskasten.tsx:51`); ich hielt es für „Nachricht löschen“. „Ausblenden“ wäre klarer (l3).
- **R2-FaBe P3-2** Der Sofort-Hinweis „Sofort-Nachricht E 3 für Fachberater: Dringend: Sanitäter früher“ steht als eine Zeile in dunklem Gelb und ohne Ton (nur für Blitz laut Handbuch); bei Lärm im Stab leicht zu übersehen, wenn ich nicht auf dem Bildschirm bin (l2).
- **R2-FaBe P3-3** Die Statuszeile zeigt „Rechnerzeit UTC, Anzeige in Europe/Berlin“ und „1 weiterer Arbeitsplatz“ ohne Stellenangabe; mit „×“ lässt sich der Zeitzonenhinweis ausblenden (01-start).
- **R2-FaBe P3-4** Beim Verwerfen ändert sich „Abbrechen“ still zu „Verwerfen“; der erklärende Satz „Entwurf verwerfen? Esc oder ‚Verwerfen‘ bestätigt; weitertippen behält ihn.“ (`Maske.tsx:37`) ist im Maskenfuß nicht sichtbar, nur der Knopftext wechselt (n5). Funktioniert, aber man muss es wissen.
- **R2-FaBe P3-5** Im Tagebuch steht mein Handzeichen zu einer Gesprächsnotiz als „Sichter · Mka“, obwohl ich Fachberater bin (k1-Einsatztagebuch).

---

## Annahmen

1. Eine eingewiesene FmZ prüft die Quittung der Gegenstelle vor dem Befördern (P0-2).
2. Die amber Warnung bei Überschreitung der Schwelle erscheint wie beschrieben nach 20 Minuten; ich habe sie nicht abgewartet (P0-3).
3. Der Sichter prüft, wem er die grüne Kopie gibt; aus meiner Sicht sehe ich nur die Warnzeile (P0-1).
4. Die Gegenstelle (zweiter Kontext) verhält sich wie ein menschlicher Stab; ich habe keine echten Verzögerungen simuliert.
5. Das Verhalten im Tablet-/Handyformat habe ich nicht geprüft.

## Was mich positiv überrascht hat

- **Die Post kam von selbst.** Binnen Sekunden stand „Nachrichten 1“ amber am Reiter, auch wenn ich auf einem anderen Reiter war. Der Sofort-Eingang erschien zusätzlich als Zeile in der Leiste (l2-fabe-lage-sofort-eingang).
- **Die Kopiefarbe steht als Wort da:** „grün: bearbeiten“, „blau: Kenntnis“. Ohne dieses Wort hätte ich die Farbe nicht deuten können (l3).
- **Die Maske schützt:** „Aufgeben“ bleibt grau, solange etwas fehlt, und die graue Zeile daneben sagt konkret was („Anschrift eintragen“). Ein Klick neben die Maske schließt sie nicht; Esc und „Abbrechen“ verlangen bei Eingaben eine zweite Bestätigung („Verwerfen“).
- **„Zurückziehen“ löscht nicht** und verlangt einen Grund; „Rückgängig“ nennt, was zurückgenommen wird, und dass es für alle gilt (g3-zurueckziehen, o1-nach-rueckgaengig, r2-undo-dialog).
- **Die Zeit ist verzeihlich:** „20:33“ geht, Strg+D setzt „jetzt“, darunter steht „17.11.2026 20:33“ im Klartext.
- **Die Ausgangsliste nennt den Stand in Worten** („angenommen 2031 Fm · befördert 2031 Fm (Funk)“), und die FmZ-Meldung „Kopien nach Beförderung: rot S2, grün Fachberater. S2 ist nicht besetzt; die rote Kopie wartet im Fach.“ ist hilfreich.
- **Die Vorschau „Wie gedruckt“** zeigt das Papier; für jemanden, der den 4-fach-Vordruck nicht kennt, ist das die beste Erklärung des ganzen Programms (e3-nach-lesen).

## Abgleich mit Handbuch und Kurzanleitung (erst nach dem Durchlauf gelesen)

Gelesen: `docs/v2/HANDBUCH.md`, Abschnitt „Nachrichten“ (ab Zeile 281), und `docs/v2/KURZANLEITUNG.md` (Abschnitt „Nachrichten“, Zeilen 53-62, elf Zeilen). Bewertung: **Hätte die Hilfe im Programm gesagt, was mir gefehlt hat?** Überwiegend nein.

- **Gesagt, aber nicht dort, wo ich suchte:** Der Handbuch-Text erklärt die Kopiefarben („grün für den Hauptempfänger, blau für Mitleser, rot für S2“), „Gelesen und erledigt gelten je Stelle“, „Nach der Beförderung gehen die rote Kopie an S2 und die grüne an die Stelle des Verfassers“ und den Weg einer Gesprächsnotiz. Die Hilfe im Programm (Reiter „Ansichten“ unter „Nachrichten“, `bedienhilfe.ts:126`) wiederholt davon nur einen Teil und steht erst nach acht anderen Ansichten. Der Satz zum eigenen Ausgang im Posteingang (P1-4) steht dort ganz am Ende eines langen Absatzes.
- **Nicht gesagt:** Handzeichen (nur „zwei bis vier Zeichen“), was Sofort und Blitz fachlich bedeuten, was ein Fachberater mit der Sicht „Sichter“ nicht tun sollte, wie man einer Ablösung übergibt, dass „Antworten“ ein Funkspruch ist (das Handbuch sagt es für die Gesprächsnotiz: „einen eigenen stabsinternen Weg … gibt es bewusst nicht“), und dass in der Statuszeile nicht steht, wer die FmZ ist. Das Handbuch hat kein Wörterverzeichnis; die Kurzanleitung benutzt Fernmeldezentrale, Sichter, Handzeichen, Vordruck 1103.1 ohne Erklärung.
- **Abweichung:** Das Handbuch sagt, „Antworten“ setze den Betreff „Antwort: …“; das Programm schreibt „Antwort auf E 1: …“. Das Handbuch verspricht bei Blitz zwei Töne und bei Sofort eine Zeile in der Leiste; Letzteres stimmt (l2).
- **Konsistent mit meinem P0-1:** Das Handbuch nennt den Stellenvorbehalt nur für „annehmen, befördern, nachweisen“ (bzw. Vorschlag und Weitergabe beim LdF), nicht für „Sichten“. Die Lücke ist also keine Auslassung im Text, sondern im Programm.
- **Meine Empfehlung an die Doku:** Ein Merkblatt „Fachberater in drei Minuten“ (Posteingang, grün = tun, blau = wissen, Antworten geht über die Funkzentrale, Handzeichen = dein Kürzel) und ein Wörterverzeichnis im Hilfereiter „Abkürzungen“.
