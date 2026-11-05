# Audit S1-Control v2 — Perspektive Sachgebiet S5 (Presse- und Medienarbeit)

Stand: 05.11.2026, eigene Web-Schale (http://127.0.0.1:8216) mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten), Durchlauf 20:40–21:00 Uhr, HEAD `ffc3125`.
Rolle: Sachgebietsleiter S5 — beantwortet Medienanfragen, schreibt Pressemitteilungen, bereitet Besuche vor. Braucht belastbare, freigegebene Zahlen mit Stand, eine lesbare Chronologie und Ausgaben ohne personenbezogene Daten.
Material: laufende Anwendung (Einsatzauswahl, Profilwahl, Lage, Einsatztagebuch, Ausgaben, Führungsstelle, Stärke-Monitor), alle HTML-Ausgaben und die beiden XLSX-Ausgaben aus dem Ordner `ausgaben/` der Kopie, ein zweiter Arbeitsplatz im selben Einsatz für Änderungen während der Prüfung. Screenshots unter `scratchpad/shots/s5/` (01–19). Quelltext nur lesend. Keine Codeänderungen. PDF-Ausgaben gibt es in der Web-Schale nicht („PDF gibt es nur in der Desktop-App“) — sie sind **[nicht prüfbar]**.
Profil: Ein Profil für S5 gibt es nicht (Auswahl: Führungsstelle (S1), Vermeldezentrale, Versorgung (S4), Alle Blätter). Gewählt: **Führungsstelle (S1)**, weil Lage, Ausgaben und Einsatztagebuch dort im Band stehen; Anzeigename „S5 Presse“.

Kennzeichnung: **[beobachtet]** = an der laufenden App oder in einer erzeugten Ausgabe gesehen; **[Code]** = aus der Quelle belegt; **[Annahme]** = Annahme über den Ablauf in der Führungsstelle, nicht aus einer Vorschrift; **[nicht prüfbar]** = in der Web-Schale nicht nachvollziehbar.

---

## Urteil

Die Software bedient S5 nicht ausdrücklich, aber die Kernzahl ist da: Das Kopfband nennt die Ist-Stärke (zu Beginn 14/48/202 // 264), „+63 erwartet“ daneben, und „Regel“ erklärt in einem Satz, was gezählt wird. Druck, Stärke-Monitor, Führungsorganisation und Status-HTML zeigen dieselbe 264 und tragen alle einen Stand mit Uhrzeit. Für die Frage „wie viele Kräfte sind vor Ort?“ habe ich in unter einer Minute eine vertretbare Antwort.

Schwierig wird es bei allem danach:

1. **Keine Ausgabe trennt Veröffentlichbares von Internem.** Tagebuch, Einheitenliste, Funkplan, Auswertung und Oldenburger Block tragen Namen und Mobilnummern, sobald sie erfasst sind. Die Status-Matrix nennt Geschlecht und Kostform je Organisation, auch bei Gruppen mit vier Personen. Keine Ausgabe ist als intern gekennzeichnet, das Tagebuch lässt sich nur vollständig ausgeben.
2. **„Wie viele, von wem?“ hat mehrere Antworten.** Die Software liefert 264 (Ist), 327 (alle erfassten), 330 (mit Beendeten) und 339 (Summe der Auswertung, mit einer entfernten Doppelmeldung). Der THW-Anteil steht als 100 im Druck und als 115 in der Status-Matrix. Eine Liste der beteiligten Organisationen gibt es nur „auch erwartete“, also mit der Bergwacht, die nur in Rufbereitschaft steht. Eine als „für Veröffentlichung freigegeben“ markierte Zahl gibt es nicht.
3. **Eine Chronologie für Laien gibt es nicht.** Das Einsatztagebuch ist ein Änderungsprotokoll mit über 130 Zeilen, überwiegend „Logistikangabe gesetzt (Divers)“, „Dienstposten besetzt“ und „PSA-Bedarf gesetzt“. Es gibt keinen Filter nach wesentlichen Ereignissen.
4. **Der HTML-Monitor für ein zweites Gerät bleibt nach dem Ausschalten mit alter Zahl stehen** und lädt sich weiter alle 60 Sekunden neu. Beobachtet: Monitor 242, Kopfband 222.

Ob die Rolle ihre Aufgabe ohne Nebenaufzeichnung erledigen kann: **nein**. Die Zahl hole ich aus der Software, die Pressefassung (Organisationen, Ortsverbände, Chronologie, herausgegebene Zahl) muss ich auf Papier oder in einem eigenen Dokument führen.

---

## Findings

### P1-1 — Keine Ausgabe ist ohne Schwärzen weitergebbar; personenbezogene Daten stehen ungekennzeichnet in Tagebuch, Einheitenliste, Funkplan und Tabellen

- **Fundstelle / Aufgabe:** Prüfaufgabe 3. Ausgaben → „Tagebuch als HTML“, „Einheitenliste als HTML“, „Funkplan als HTML“, „Status als HTML“, „Auswertung als XLSX“, „Oldenburger Block als XLSX“; Lage → Spalte „Erreichbarkeit“ (Screenshot 14). Code: `packages/domaene/src/projektion/tagebuch-einheitsteile.ts:46-58` (Fahrzeug mit Kennzeichen, Person mit Vor- und Nachname im Tagebuchsatz), `packages/ausgaben/src/einheitenliste.ts:55,156` (Spalte „Führer / Erreichbarkeit“), `packages/ausgaben/src/funkplan.ts:48,110`, `packages/ausgaben/src/xlsx.ts:348`, `apps/desktop/src/kontrakt/index.ts` (Ausgabewunsch kennt nur `organisation` als Option, keinen Filter oder Zuschnitt).
- **Beobachtung [beobachtet, Code]:**
  - Die Tagebuch-Ausgabe der Prüflage enthält ohne mein Zutun zwölf Klarnamen der Führungsstelle („Mennenga, Fokke“, „Dr. Poppen, Insa (NLWKN)“ …) und „Mob. 0441-000001“.
  - Ich habe beim ZTr THW Deich in „Erreichbarkeit“ „ZFü Hinrichs, Mob. 0171-5551234“ eingetragen. Danach stand die Nummer in der neuen Tagebuch-, Einheitenliste-, Funkplan-, Auswertung- und Oldenburger-Ausgabe; frei davon blieben nur Druck, Status-HTML, Führungsorganisation und HTML-Monitor.
  - Die Status-HTML zeigt je Organisation Männl./Weibl./Div., vegetarisch, vegan und Übernachtung, auch bei MHD (4 Kräfte: 1 m, 2 w, 1 d). Die Einzelpersonen sind darüber praktisch erkennbar.
  - Das Tagebuch führt dieselben Angaben je Einheit als eigene Zeilen („St PSNV: Logistikangabe gesetzt (Divers): (leer) → 1“).
  - Keine Ausgabe trägt einen Vermerk wie „intern“ oder „nicht zur Weitergabe“. Im Quelltext von `packages/ausgaben/src`, `apps/desktop/src` und im Handbuch gibt es keinen Treffer für „Dienstgebrauch“, „vertraulich“, „personenbezogen“ oder „Datenschutz“.
  - Die Tagebuch-Ausgabe nimmt keinen Filter an (Suche „Presse“ im Blatt → Ausgabe enthält trotzdem alle 133 Einträge).
- **Erwartung der Rolle:** Eine Ausgabe „für die Öffentlichkeit“ (oder ein Schalter „ohne personenbezogene Daten“): Zahlen, Organisationen, Ortsverbände, wesentliche Ereignisse — keine Namen, Telefonnummern, Kennzeichen, kein Geschlecht und keine Kostform je Gruppe. Alle anderen Ausgaben sichtbar als intern gekennzeichnet.
- **Auswirkung im Einsatz:** Unter Zeitdruck greift S5 zur Ausgabe, die am meisten Inhalt hat (Tagebuch oder Einheitenliste), und reicht sie an eine Pressestelle, einen Bürgermeister oder per Mail weiter. Dann gehen Mobilnummern von Führungskräften und Daten, über die einzelne Helfer erkennbar sind, nach außen. Schwärzen von Hand an 130 Tagebuchzeilen kostet eine halbe Stunde und ist fehleranfällig.
- **Empfehlung:** Eine eigene „Presseübersicht“ als Ausgabe (siehe P1-2) ohne jedes personenbezogene Feld. Interne Ausgaben in Kopf und Fuß als „intern — enthält personenbezogene Daten“ kennzeichnen, sobald sie solche enthalten. Die Tagebuch-Ausgabe soll den Filter des Blatts übernehmen können. Geschlecht und Kostform in der Status-Matrix nicht je Organisation unterhalb einer Mindestgröße ausweisen, oder sie dort weglassen, wo die Matrix nicht für S4 gedruckt wird.
- **Verifikation:** Eine Einheit mit Erreichbarkeit „Mob. 0171-…“, ein Fahrzeug mit Kennzeichen und eine Person mit Namen anlegen; die Presseübersicht erzeugen und nach Ziffernfolgen, Kennzeichenmuster und Namen durchsuchen → kein Treffer. Jede andere Ausgabe mit solchen Daten trägt sichtbar „intern“.

### P1-2 — Keine freigegebene Pressezahl: Kräfte, THW-Anteil und Organisationen widersprechen sich je nach Ausgabe

- **Fundstelle / Aufgabe:** Prüfaufgaben 1 und 4. Kopfband, Lage-Tabelle, Ausgaben → Druck (Organisationsfilter „Davon Stärke der Organisation“), Status-HTML, Auswertung XLSX (Screenshots 03, 04, 10-druck, 10-status). Code: `packages/ausgaben/src/status.ts:273` („Alle erfassten Einheiten“), `packages/domaene/src/kennzahlen.ts` (Zählklassen).
- **Beobachtung [beobachtet]:** Für die Medienanfrage „Wie viele Einsatzkräfte, welche Organisationen?“ liefert die Software zu einem Zeitpunkt:

  | Wo | Zahl | Definition |
  |---|---|---|
  | Kopfband, Druck, Monitor, FüOrg | 264 | Ist-Stärke vor Ort |
  | Lage-Tabelle Fußzeile, Status-HTML | 327 | „Alle erfassten Einheiten“ (Ist + erwartet) |
  | Lage-Tabelle Fußzeile | 330 | 327 + „Beendet/Rückmarsch“ 3 |
  | Auswertung XLSX, „Summe über alle Zeilen“ | 339 | dazu eine entfernte Doppelmeldung (siehe P2-8) |
  | Druck, „Davon Stärke: THW“ | 100 | THW in der Ist-Stärke |
  | Status-HTML, „Stärke nach Organisationen“ | 115 | THW, „auch erwartete“ |

  - Eine Aufschlüsselung der Ist-Stärke nach **allen** Organisationen gibt es nicht. Der Druck zeigt immer nur eine Organisation (Auswahlliste), die Status-Matrix rechnet nur mit allen erfassten Einheiten. Ihre Liste nennt 12 Organisationen, darunter „Bergwacht 6“: Die Bergwacht steht im Bereich „Angefordert / Anmarsch“ in Rufbereitschaft und war nie vor Ort.
  - Die Ist-Stärke schließt Polizei (2), Bundeswehr (25), Rettungsdienst (2) und „Regie — Landkreis Ammerland, Sandsackkolonne“ (22) ein. Ob die Sandsackkolonne Einsatzkräfte oder Hilfskräfte sind, sagt keine Ansicht **[Annahme: Für die Presse ist das ein Unterschied]**.
  - Die Lage nennt außerdem „Einheiten 40“ im Kartenkopf, „Alle Bereiche 40“ im Baum und „Ist-Stärke gesamt · 33 Einh.“ in der Tabelle.
- **Erwartung der Rolle:** Eine Stelle, an der steht: „Vor Ort: 264 Kräfte aus n Organisationen (THW 100, Feuerwehr x, …), davon x aus n Ortsverbänden; zusätzlich angefordert: 63; Stand 20:43“. Dazu ein Satz, was „Kräfte“ hier umfasst (Bundeswehr, Polizei, Regie ja oder nein). Am besten mit einem Freigabevermerk der Leitung.
- **Auswirkung im Einsatz:** Zwei Sprecher (S5 und der Leiter vor Ort) nennen verschiedene Zahlen, weil der eine den Druck und der andere die Status-Matrix in der Hand hat. Die Pressemitteilung nennt eine Organisation, die nie vor Ort war. Die THW-Leitung meldet „115 THW-Kräfte“, die Lokalzeitung druckt „100“.
- **Empfehlung:** Eine „Presseübersicht“: Ist-Stärke gesamt und je Organisation (nur vor Ort), Zahl der Organisationen und Ortsverbände, Erwartete getrennt, Stand mit Uhrzeit, ein Satz zur Zählregel, keine personenbezogenen Daten (siehe P1-1). Die Status-Matrix um die Spalte „davon vor Ort“ ergänzen oder ihre Überschrift deutlicher machen („nicht für Veröffentlichung — enthält Angeforderte“).
- **Verifikation:** Presseübersicht erzeugen; ihre Gesamtzahl ist gleich dem Kopfband, die Summe der Organisationszeilen ergibt sie, die Bergwacht (nur Rufbereitschaft) fehlt; nach Statuswechsel „Anmarsch → Einsatzbereit“ wandert die Einheit in die Übersicht.

### P1-3 — Der HTML-Monitor zeigt nach dem Ausschalten eine veraltete Zahl, als sei sie aktuell

- **Fundstelle / Aufgabe:** Prüfaufgaben 3/4, Besuch von Behördenvertretern. Ausgaben → „HTML-Monitor für ein zweites Gerät“; Datei `ausgaben/monitor.html` (Screenshot 19). Code: `apps/desktop/src/renderer/Ausgaben.tsx:192-200` (Schalter), `apps/desktop/src/worker/aktendienst.ts:1078-1110` (Ausschalten setzt nur den Merker zurück, die Datei bleibt), `packages/ausgaben/src/monitor.ts:123` (`meta refresh` 60 s), `:134` („Bild geschrieben“).
- **Beobachtung [beobachtet]:**
  - Ich habe den Monitor eingeschaltet (Datei geschrieben 20:58:07, „Ist-Stärke 13/44/185 = 242“) und wieder ausgeschaltet.
  - Um 20:59:37 setzte ich den Betreuungszug auf Rückmarsch. Das Kopfband zeigte danach 12/41/169 // 222, die Monitordatei weiter „Ist-Stärke … = 242“ mit „Diese Seite lädt sich alle 60 Sekunden neu“.
  - Die Seite warnt nicht, dass sie nicht mehr geschrieben wird. Nur die kleine Zeile „Bild geschrieben: 20:58:07“ verrät es, wenn man sie mit der Uhr vergleicht.
  - In jeder neuen Sitzung stand der Schalter auf „aus“, obwohl eine andere Sitzung die Datei noch schrieb (Datei 20:57:37 aktualisiert, Schalter „aus“).
- **Erwartung der Rolle:** Ein Bildschirm im Besucherbereich oder im Pressezelt zeigt entweder die aktuelle Zahl oder unübersehbar „veraltet — Stand 20:58“. Der Schalter zeigt ehrlich, ob irgendwo ein Monitor läuft.
- **Auswirkung im Einsatz:** **[Annahme]** Der Monitor steht dort, wo Besucher, Bürgermeister oder Presse mitlesen. Wird der Arbeitsplatz geschlossen, neu gestartet oder der Schalter versehentlich umgelegt, liest der Besuch eine Zahl, die um 20 Kräfte oder mehr falsch ist, und zitiert sie.
- **Empfehlung:** Beim Ausschalten die Monitorseite durch „Monitor beendet um …“ ersetzen. Die Seite soll sich selbst als veraltet kennzeichnen, sobald „Bild geschrieben“ älter als etwa zwei Takte ist (das geht ohne Skript nicht, deshalb Alternative: ein „gültig bis“-Hinweis, der groß im Bild steht). Den Schalterzustand aus der Akte lesen, nicht aus der Sitzung.
- **Verifikation:** Monitor einschalten, ausschalten, Ist ändern → die Seite zeigt keine Zahl mehr oder sichtbar „veraltet“. Zweite Sitzung öffnen → der Schalter zeigt „an“, solange irgendwo geschrieben wird.

### P1-4 — Aus dem Einsatztagebuch lässt sich keine Chronologie ableiten

- **Fundstelle / Aufgabe:** Prüfaufgabe 2. Reiter Einsatztagebuch (Screenshot 07), „Tagebuch als HTML“ (10-tagebuch).
- **Beobachtung [beobachtet]:**
  - Das Blatt hat genau drei Filter: Textsuche, „Auf die Auswahl beschränken“ und „Nur Rücknahmen und Berichtigungen“. Es gibt keine Auswahl nach Art (Lage, Statuswechsel, eigene Einträge), keine Zeitspanne, keine Wesentlichkeit.
  - Von 130 Einträgen sind über 80 Anlagen von Abschnitten, Einheiten und Dienstposten, Logistikangaben („Logistikangabe gesetzt (Vegan): (leer) → 1“) und PSA-Bedarf. Lageinhalt (Pegel, Deich, Schäden) steht nirgends, weil die Software ihn nicht führt. Die Sätze sind in interner Schreibweise („D07: Schichtplan geändert (2026-09-08): (leer) → …“, „Anforderung storniert: nein → ja“).
  - Die Ausgabe sagt „älteste zuerst“, ordnet aber nach Erfassung. Die Spalte „Zeit“ zeigt dagegen bei einigen Zeilen die Zeit der Meldung, und deshalb stehen „08.09.2026 05:30“-Zeilen zwischen „05.11.2026 20:35“-Zeilen. Zum Teil liegt das an der Prüflage, die heute mit Septemberzeiten erzeugt wurde; die Mischung zweier Zeitachsen in einer Spalte bleibt.
  - Die Ausgabe nennt Rechner und Akteur, aber keine Einordnung.
- **Erwartung der Rolle:** Eine kurze, lesbare Zeitfolge: „04:00 Einsatzbeginn · 05:30 Anforderung Ablösung Deich Nord · 07:15 Sanitätszug eingetroffen · …“, ohne Logistik- und Verwaltungszeilen, ohne Kürzel, filterbar nach den letzten n Stunden und ausgebbar.
- **Auswirkung im Einsatz:** S5 muss das Tagebuch Zeile für Zeile lesen und eine eigene Zeitleiste auf Papier führen. Wichtige Ereignisse (Eintreffen, Abrücken größerer Verbände) gehen zwischen den Logistikzeilen unter. Für einen Zwischenbericht an die Presse entsteht so eine halbe Stunde Abschreibarbeit.
- **Empfehlung:** Einen Filter „wesentlich“ (Statuswechsel nach Einsatz/Rückmarsch, Eintreffen, Anforderung, eigene Einträge, Abschnitt angelegt/aufgelöst) und „letzte n Stunden“. Die Ausgabe des Tagebuchs mit diesem Filter, nach Zeit der Meldung geordnet, mit Klartext statt Kennungen. **[Annahme]** Lagemeldungen von S2 als eigene Einträge, damit S5 den Lageinhalt erhält.
- **Verifikation:** Filter „wesentlich, letzte 4 Stunden“ → unter 20 Zeilen, keine „Logistikangabe“, keine „Dienstposten“; Ausgabe zeigt dieselben Zeilen streng nach Zeit.

### P2-5 — Eine erhebliche Änderung einer bereits genannten Zahl fällt nicht auf

- **Fundstelle / Aufgabe:** Prüffrage „Erfahre ich, wenn sich eine bereits genannte Zahl erheblich ändert?“ Kopfband (Screenshots 03, 12, 15).
- **Beobachtung [beobachtet]:**
  - Um 20:45 trug ich im Tagebuch ein, dass ich 264 Kräfte genannt habe.
  - Ein zweiter Arbeitsplatz setzte die LZ FW Bereitstellung (22) auf Rückmarsch: Das Kopfband sprang ohne Hinweis von 264 auf 242 (Abweichung 8 %), später auf 222 (Abweichung 16 %).
  - Es gibt keine Möglichkeit, eine Zahl als „herausgegeben um …“ festzuhalten, und keinen Vergleich dazu.
- **Erwartung der Rolle:** Ein Merker „zuletzt herausgegeben: 264 um 20:45“ und eine Markierung, wenn die aktuelle Zahl um mehr als einen Schwellwert abweicht.
- **Auswirkung im Einsatz:** Die Pressestelle des Landkreises zitiert stundenlang eine überholte Zahl, weil S5 die Änderung nicht bemerkt hat. Die Korrektur kommt erst nach Nachfrage.
- **Empfehlung:** Die herausgegebene Zahl als Ereignis festhalten (siehe P2-6) und im Kopfband oder in der Presseübersicht „seit letzter Herausgabe: −42“ zeigen.
- **Verifikation:** Zahl herausgeben, eine 22er-Einheit auf Rückmarsch → Hinweis mit Differenz erscheint an jedem Arbeitsplatz.

### P2-6 — Herausgegebene Pressemitteilungen und Medienanfragen lassen sich nur als Freitext mit falscher Quelle ablegen; S5 hat kein Profil

- **Fundstelle / Aufgabe:** Prüfaufgabe 5. Einsatztagebuch → „Eintrag hinzufügen“ (Screenshots 08, 09); Profilwahl (02). Code: `apps/desktop/src/renderer/TagebuchEintrag.tsx:24` (`QUELLEN = ["Funk", "Telefon", "Meldung vor Ort", "Lagebesprechung", "Sonstiges"]`), `:67` („Was wurde gemeldet?“), `apps/desktop/src/kontrakt/index.ts:80` (Profile ohne S5).
- **Beobachtung [beobachtet]:**
  - Die Maske fragt „Was wurde gemeldet?“, also nach einer eingehenden Meldung.
  - Die Quelle ist mit „Funk“ vorbelegt. Ich habe sie nicht geändert, und so steht meine Pressemitteilung als „Tagebucheintrag: Funk: S5: Pressemitteilung Nr. 1 …“ im Tagebuch.
  - Eine Quelle wie „Presse/Medien“ oder „Ausgang“ gibt es nicht, ebenso wenig Felder für Empfänger, Inhalt, Freigabe durch oder Anfrage von.
  - Wiederfinden geht über die Textsuche („Presse“ → 1 von 131).
  - Die Zeit der Meldung 20:50 wurde um 20:45 ohne Rückfrage angenommen, also in der Zukunft.
- **Erwartung der Rolle:** Ein eigener Eintragstyp „Medien“ (Anfrage eingegangen / Information herausgegeben) mit Empfänger, Inhalt, Freigabe, Uhrzeit, filterbar, damit am Ende eine Liste aller Presseauskünfte entsteht. Ein Profil „S5 / Presse“ mit Lage, Einsatztagebuch und Ausgaben.
- **Auswirkung im Einsatz:** Was der Presse gesagt wurde, steht mit falscher Quelle im Tagebuch oder gar nicht. Bei einer späteren Rückfrage („Wer hat der Zeitung 300 Helfer genannt?“) ist der Nachweis mühsam. S5 führt deshalb eine Papierliste.
- **Empfehlung:** Quelle „Presse/Medien“ ergänzen und die Quelle nicht vorbelegen (oder „Sonstiges“). Die Maske soll auch „Was wurde herausgegeben?“ kennen. Ein Profil S5. Dazu: Die Ausgaben tragen den Zeitpunkt im Dateinamen und überschreiben einander nicht — S5 kann die herausgegebene Datei im Eintrag nennen.
- **Verifikation:** Eintrag „Medien → herausgegeben“ anlegen; Filter „Medien“ zeigt nur Presseeinträge; Quelle ist nicht stillschweigend „Funk“.

### P2-7 — Status-Matrix: Schichttabelle als „Alle erfassten Einheiten“ beschriftet, obwohl 37 Kräfte fehlen; Kontrollsumme meldet „o.k.“

- **Fundstelle / Aufgabe:** Prüfaufgabe 4. „Status als HTML“ (10-status). Code: `packages/ausgaben/src/status.ts:273,329` (dieselbe Beschriftung `GESAMT_ALLE` für die Schichttabelle), `packages/domaene/src/kennzahlen.ts:688-699` (erwartete Einheiten ohne Schicht werden aus der Probe herausgerechnet), `packages/ausgaben/src/status-kontrolle.ts:46`.
- **Beobachtung [beobachtet, Code]:**
  - Die Organisationstabelle endet bei „Gesamt 327“, die Statustabelle bei „Alle erfassten Einheiten 327“, die Schichttabelle bei „Alle erfassten Einheiten 290“.
  - Darunter steht: „Schicht: o.k. — alle Einheiten tragen eine Schicht“ und „Alle Einheiten tragen Organisation, Status und Schicht.“
  - Die drei angeforderten Einheiten (9 + 22 + 6 = 37) haben keine Schicht. Das ist fachlich gewollt, aber nirgends erklärt.
- **Erwartung der Rolle:** Gleiche Beschriftung heißt gleiche Menge. Sonst ein Satz: „ohne 37 erwartete Kräfte ohne Schicht“.
- **Auswirkung im Einsatz:** Wer die Status-Matrix für eine Auskunft nimmt, findet zwei verschiedene „Alle erfassten Einheiten“ und vertraut keiner Zahl mehr — oder nennt die falsche.
- **Empfehlung:** Die Schichtsumme anders benennen oder die Lücke ausweisen; die Kontrollzeile soll sagen, wie viele erwartete Kräfte bewusst ohne Schicht sind.
- **Verifikation:** Status-HTML der Prüflage: Schichttabelle zeigt 290 mit Zusatz „ohne 37 erwartete ohne Schicht“, keine zweite Zeile „Alle erfassten Einheiten“ mit abweichender Zahl.

### P2-8 — Auswertung XLSX zählt eine entfernte Doppelmeldung als Einheit „im Einsatz“ mit

- **Fundstelle / Aufgabe:** Prüfaufgabe 4. „Auswertung als XLSX“, Zeile 2 und letzte Zeilen. Code: `packages/ausgaben/src/xlsx.ts:117-122` (`mitStillgelegten: true`), `:539-550` (Summe über alle Zeilen ohne Unterschied).
- **Beobachtung [beobachtet, Code]:**
  - Die Datei enthält „Doppelt gemeldete Gruppe · THW OV Emden · Status Einsatz · 9“. Diese Einheit ist laut Tagebuch „entfernt (Grund: Doppelt gemeldet, Meldung von OV Emden zurückgezogen)“.
  - Eine Spalte, die sie als entfernt kennzeichnet, gibt es nicht.
  - Zeile 2 „Summe über alle Zeilen“ ergibt 339 Kräfte. Das ist eine Zahl, die in keiner Ansicht vorkommt.
  - Laut Quelltext ist das Mitführen Absicht (Nachweis nach dem Einsatz); die Kennzeichnung fehlt.
- **Erwartung der Rolle:** Eine Tabelle, die man filtern und summieren kann, ohne in die Falle zu laufen: Spalte „entfernt/aufgegangen“ und eine Summe, die sie ausnimmt.
- **Auswirkung im Einsatz:** **[Annahme]** S5 oder die Pressestelle des Trägers rechnet aus der Excel nach und nennt 339 oder „13 Ortsverbände“ mit einem, der seine Meldung zurückgezogen hat.
- **Empfehlung:** Spalte „Zustand der Zeile“ (aktiv/entfernt/aufgegangen), und die Summe in Zeile 2 nur über aktive Zeilen, mit Beschriftung.
- **Verifikation:** Auswertung der Prüflage: „Doppelt gemeldete Gruppe“ trägt „entfernt“, Zeile 2 summiert ohne sie.

### P2-9 — Teilsummen je Einsatzabschnitt unterscheiden sich zwischen Baum/Führungsorganisation und Druck/Monitor

- **Fundstelle / Aufgabe:** Prüfaufgabe 4. Baum „EA Deich Nord 11 · 2/10/65“, FüOrg-HTML „EA Deich Nord 2/10/65 = 77“, Druck und HTML-Monitor „EA Deich Nord 39“ und „UA Deichfuß 38“ als eigene Zeilen.
- **Beobachtung [beobachtet]:**
  - Baum und Führungsorganisation rechnen den Unterabschnitt in den Abschnitt ein, Druck und Monitor nicht. Die Lage-Tabelle sagt „EA Deich Nord mit Unterabschnitten“, der Druck sagt es nicht.
  - Zusätzlich nennt die FüOrg-Ausgabe „Führungsstelle gesamt 2/6/4 = 12“ (aus den Dienstposten) neben „FüSt Oldenburg 3/5/2 = 10“ (aus den Einheiten). Den Unterschied erklärt sie nur mit „(§5.7, K17)“.
- **Erwartung der Rolle:** „Am Deich Nord sind … Kräfte im Einsatz“ — eine Zahl, oder beide mit klarer Bezeichnung („davon UA Deichfuß 38“).
- **Auswirkung im Einsatz:** Die Pressemitteilung nennt für den Deich 39, der Abschnittsleiter vor Ort im Interview 77.
- **Empfehlung:** Im Druck und Monitor „ohne Unterabschnitte“ an die Zeile schreiben oder den Unterabschnitt eingerückt unter dem Abschnitt mit Zwischensumme zeigen. In der FüOrg die beiden Führungsstellen-Zahlen in Worten unterscheiden.
- **Verifikation:** Druck der Prüflage: Zeile EA Deich Nord ist entweder 77 mit eingerücktem „davon UA Deichfuß 38“ oder 39 mit dem Zusatz „ohne UA“.

### P2-10 — Für Dank und Nennung fehlt die Liste der beteiligten Organisationen und Ortsverbände

- **Fundstelle / Aufgabe:** Prüffrage „Sehe ich, welche Organisationen und Ortsverbände beteiligt sind?“ Einheitenliste-HTML (Spalte Herkunft), Status-HTML (Organisationstabelle).
- **Beobachtung [beobachtet]:**
  - Die Ortsverbände stehen nur je Einheit in der Spalte „Herkunft“ der Einheitenliste: 40 Zeilen, darunter Mehrfachnennungen (THW OV Oldenburg 5-mal, DRK KV Oldenburg 3-mal). Eine zusammengefasste Liste „THW: OV Oldenburg, Varel, Brake, …“ gibt es nicht.
  - Die Organisationstabelle der Status-Matrix enthält Erwartete (siehe P1-2).
  - Wer schon abgerückt ist (Rückmarsch, Einsatz beendet) und für den Dank trotzdem genannt werden muss, ist nur in der Lage mit „Stillgelegte zeigen“ oder im Tagebuch zu finden.
- **Erwartung der Rolle:** „Beteiligt waren: THW (OV …), Feuerwehr (FF …), DRK (KV …) …“ — einmal je Herkunft, getrennt nach „vor Ort“, „angefordert“ und „bereits abgerückt“.
- **Auswirkung im Einsatz:** S5 schreibt die Liste von Hand aus der Einheitenliste ab. Ein abgerückter Ortsverband fehlt in der Dankesmitteilung — ein Ärgernis, das jeder S5 kennt **[Annahme]**.
- **Empfehlung:** Teil der Presseübersicht aus P1-2: Organisationen mit Ortsverbänden, je einmal genannt, mit Statusklasse.
- **Verifikation:** Prüflage: Liste zeigt 12 Organisationen bzw. nach Herkunft entdoppelt; Bergwacht unter „angefordert“, Trupp Aufklärung (THW OV Emden, Rückmarsch) unter „abgerückt“.

### P2-11 — Fahrzeugzahl und Einsatzdauer, zwei Standardfragen der Presse, liefert die Software nicht

- **Fundstelle / Aufgabe:** Prüfaufgabe 1. Kopfband, Ausgaben, Führungsstelle → Stammdaten („Beginn 08.09.2026 04:00“). Code: kein Treffer für eine Fahrzeugsumme in `packages/ausgaben/src` und `packages/domaene/src` (Suche nach „Fahrzeuge gesamt“, „anzahlFahrzeuge“, „Dauer“).
- **Beobachtung [beobachtet, Code]:**
  - Die Spalte „Geräte / Fahrzeuge“ ist je Einheit vorhanden (in der Prüflage leer), eine Summe gibt es nirgends.
  - Der Einsatzbeginn steht nur in den Stammdaten des Blatts Führungsstelle, eine Dauer („seit 40 Stunden im Einsatz“) nirgends.
- **Erwartung der Rolle:** „Mit 264 Kräften und n Fahrzeugen, seit x Stunden im Einsatz“ — ohne Rechnen.
- **Auswirkung im Einsatz:** S5 muss bei S1/S4 nachfragen oder schätzen. Die Fahrzeugzahl kommt dann aus einer anderen Quelle und passt nicht zur Kräftezahl.
- **Empfehlung:** In der Presseübersicht Fahrzeuge (vor Ort, nach Organisation) und „Einsatzbeginn / Dauer“ ausweisen; wo Fahrzeuge nicht erfasst sind, das sagen statt „0“.
- **Verifikation:** Eine Einheit mit zwei Fahrzeugen anlegen → Übersicht zeigt 2; Dauer stimmt mit Beginn und Uhrzeit.

### P3-12 — Technik und interne Kürzel auf Ausgaben, die man sonst weitergeben könnte

- **Fundstelle / Aufgabe:** Prüfaufgabe 3. Druck-, Status-, Monitor-, FüOrg-, Anforderungen-HTML. Code: `packages/ausgaben/src/fueorg.ts:190`.
- **Beobachtung [beobachtet]:**
  - Jede Ausgabe trägt im Kopf die interne Kennung „2026-09-08_uebung-weser-ems_227e68“ und „@bos/eeb-format 0.0.0“.
  - Die FüOrg-Fußnote nennt „(§5.3.2)“ und „(§5.7, K17)“, die Abschnittstypen stehen als „FUEHRUNGSSTELLE“ und „EINSATZORT“.
  - Anforderungen-HTML zeigt die Zusage als „2026-09-08T16:00:00+02:00 / THW RB Oldenburg“, das Tagebuch dieselbe Zusage als „08.09.2026 14:00“ (Web-Schale in UTC).
  - Kopfband und Stärke-Monitor nennen die Zeit nur als Datum-Zeit-Gruppe „052049NOV26“.
  - Im Druck steht der Spaltenkopf „Gesamt“ senkrecht in Einzelbuchstaben.
- **Erwartung der Rolle:** Kopf: Einsatzname, Führungsstelle, „Stand 05.11.2026, 20:43 Uhr“. Keine Paragraphen, keine Softwareversion, keine Kennungen, Zeiten in einer Schreibweise.
- **Auswirkung im Einsatz:** Der Druck wäre fast als Faktenblatt für Besucher brauchbar, aber S5 muss Kopfzeilen abschneiden oder abschreiben. Zwei Schreibweisen derselben Uhrzeit führen zu Rückfragen.
- **Empfehlung:** Technische Kennungen in den Fuß und klein, Paragraphenverweise aus Ausgaben entfernen, Zeiten einheitlich „08.09.2026, 16:00 Uhr“.
- **Verifikation:** Druck-HTML enthält keine Zeichenfolge „@bos“, „§“ oder ISO-Zeit.

### P3-13 — Die Fußnote des Drucks zur Ist-Stärke ist unvollständig

- **Fundstelle / Aufgabe:** Prüfaufgabe 4. Druck-HTML, Fußnote. Code: `packages/ausgaben/src/druck.ts:156`.
- **Beobachtung [beobachtet]:**
  - Die Fußnote lautet: „Ist-Stärke: ohne erwartete Kräfte aus dem Bereich ‚Angefordert / Anmarsch‘, dem Eingang und ohne ‚Einsatz beendet‘“.
  - Tatsächlich fehlen auch Einheiten in Rufbereitschaft oder Einsatzvorbehalt in Einsatzbereichen (SanZ Bereitstellung 15, FGr Notversorgung 6) und Rückmarsch.
  - Status-HTML und „Regel“ im Kopfband (Screenshot 15) sagen es richtig.
- **Erwartung der Rolle:** Dieselbe Erklärung auf jedem Blatt, das die Zahl trägt.
- **Auswirkung im Einsatz:** Wer nur den Druck hat, erklärt die Zahl auf Nachfrage falsch („alles, was im Bereitstellungsraum steht, zählt“).
- **Empfehlung:** Den Satz aus „Regel“ wörtlich übernehmen.
- **Verifikation:** Fußnote des Drucks nennt Rufbereitschaft, Einsatzvorbehalt und Rückmarsch.

---

## Positives

- **[beobachtet]** Die Ist-Stärke ist **eine** Zahl an allen Stellen, die sie „Ist-Stärke“ nennen: Kopfband, Baum („Alle Bereiche“), Tabellenfuß, Druck, Stärke-Monitor, HTML-Monitor, FüOrg und Status-HTML zeigten gleichzeitig 264, nach meinen Änderungen überall 242 bzw. 222. „Regel“ erklärt die Zählung in einem Satz.
- **[beobachtet]** Jede Ausgabe trägt „Stand: Datum, Uhrzeit“, der HTML-Monitor zusätzlich „Stand der Lage“ und „Bild geschrieben“. Der Dateiname enthält den Zeitpunkt, eine zweite Ausgabe überschreibt die erste nicht. S5 kann damit genau die Datei ablegen, die herausgegeben wurde.
- **[beobachtet]** Druck, Stärke-Monitor, HTML-Monitor und Führungsorganisation enthielten auch nach meinem Eintrag einer Mobilnummer keine personenbezogenen Daten. Der Druck mit Organisationsfilter „THW“ ist der Weg zur Zahl „davon THW“ für die Pressestelle des THW.
- **[beobachtet]** Erwartete Kräfte stehen überall getrennt daneben („+63 erwartet“), nie in die Ist-Zahl gemischt.
- **[beobachtet]** Das Tagebuch ist durchsuchbar und nimmt eigene Einträge mit Zeit der Meldung an. Eine herausgegebene Information ist damit wenigstens überhaupt dokumentierbar.

---

## Randbeobachtungen außerhalb der Rolle

- **[beobachtet]** Nach dem Schließen eines Browserfensters blieb die Bearbeitungssperre einer Einheit stehen („Pioniermaschinenzug 🔒 wird von Arbeitsplatz bearbeitet“, Screenshot 11), und die Statuszeile zählte geschlossene Sitzungen weiter als „6 weitere Arbeitsplätze“. Für S5 nur insofern relevant, als „wer arbeitet gerade mit“ nicht verlässlich ist.
- **[nicht prüfbar]** PDF-Ausgaben (Web-Schale: „PDF gibt es nur in der Desktop-App“).

---

## Abschluss

- **Aufgabe der Rolle geschafft:** mit Umwegen. Die Kräftezahl mit Stand gelingt in unter zwei Minuten. Organisationen, Ortsverbände, Fahrzeuge, Dauer und Chronologie muss ich selbst zusammentragen.
- **Nebenaufzeichnung auf Papier nötig:** ja. Für die Pressefassung (Organisationen und Ortsverbände, Zeitleiste), für die zuletzt herausgegebene Zahl und für die Liste der Medienanfragen und Auskünfte.
- **Größte Lücke an einer Übergabe:** Von S1/S2 an S5 kommt keine aufbereitete, freigegebene Fassung. S5 bekommt nur die internen Ausgaben, die Namen und Telefonnummern enthalten, und muss selbst entscheiden, was davon herausgeht.
- **Größtes Einsatzrisiko:** Eine Ausgabe mit personenbezogenen Daten (Tagebuch, Einheitenliste) oder eine veraltete Zahl vom HTML-Monitor geht ungeprüft an Presse oder Besucher, weil nichts sie als intern oder veraltet kennzeichnet.
- **Top-Priorität für die nächste Iteration:** Eine „Presseübersicht“ als Ausgabe: Ist-Stärke gesamt und je Organisation, beteiligte Ortsverbände, Erwartete getrennt, Stand mit Uhrzeit, ein Satz zur Zählregel, garantiert ohne personenbezogene Daten. Dazu die Möglichkeit, sie als „herausgegeben um …“ im Tagebuch festzuhalten.
