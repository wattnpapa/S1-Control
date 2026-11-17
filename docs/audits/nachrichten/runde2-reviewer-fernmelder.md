# Audit Runde 2: Nachrichten (4-fach-Vordruck) aus Sicht der Fernmeldezentrale (Fernmelder)

Datum: 2026-11-17
Rolle des Prüfers: Fernmelder (Sprechfunker) in der Fernmeldezentrale einer THW-Führungsstelle, mit Headset, unter Funklast, Funkzeit statt Wanduhr, bei Rechnerausfall sofort auf Papier und später Nacherfassen. Zweite Runde nach den Umsetzungen zu den fünf Erst-Audits.
Stand: main `a0e53b5`.

## Scope und Methodik

- Geprüft wurde die **laufende Anwendung** (Web-Schale `http://127.0.0.1:8080/`, Playwright/Chromium, Viewport 1320 x 860, Browser-Zeitzone UTC), eigener Einsatz „Runde 2 Fernmelder“. Je Arbeitsplatz ein eigener Browser-Kontext: S4 (Hz. Ru), FMZ (Hz. Ha, später ein zweiter FMZ mit Hz. Zw), LDF (Hz. Sch, nur Stichprobe), SICHTER (Hz. Si). Einsätze anderer Reviewer wurden nicht angefasst. Quelltext, Dokumente und Dienst blieben unverändert; die Browser sind beendet, der Webdienst läuft weiter.
- Grundlage waren das erste Audit (`reviewer-fernmelder.md`), die Befundliste (`README.md`, Status je Befund), `KONZEPT-NACHRICHTEN.md` §5, §6, §11 (Entscheidungen 1 bis 14), der Abschnitt „Nachrichten“ und der Störfall in `docs/v2/HANDBUCH.md` sowie das Übungsdrehbuch `UEBUNG-NACHRICHTEN.md` (gespielt: Minute 5 Ausgang mit Vorrang, 15 Eingang über Funk, 35 drei Eingänge unter Last, 55 der Sichter geht, 65 Papier und zurück; Gegenstelle „Heros Wildeshausen 10“ gedacht, die Spruchtexte waren vorbereitet).
- **Tastendrücke und Zeit.** Jede Taste (Zeichen, Tab, Enter, Leertaste, Strg+Enter) wurde gezählt, ohne Maus; Verzögerung 70 ms je Taste (60 ms bei den drei Eingängen), dazu 20 ms Tastenhaltezeit. Drehbuch-Spruch (Min 15: Aufnahme 2010, Gegenstelle „Heros Wildeshausen 10“, Absender „Heros Wildeshausen“, Betreff „Lagemeldung Pumpen“, Inhalt „Pumpen eingetroffen, Einsatzstelle Deich Nord, 0 Verletzte“): **131 Tastendrücke**, davon **12 Navigation** (Enter zum Öffnen, 10 Tab, Enter zum Bestätigen) und 119 Zeichen; **10,97 s** vom ersten Tab ins Feld „Mittel“ bis zum Druck auf „Aufnehmen“ (Tippzeit dominiert, die Maske selbst reagierte ohne Verzug). Die drei Funklast-Eingänge (kürzere Texte, Abschluss mit Strg+Enter): 95, 97 und 98 Tastendrücke, davon 11 bis 12 Navigation, je rund 7,3 s. In der ersten Runde waren es 142 Tasten bei etwa einem Drittel Text; vergleichbar ist deshalb die Navigation: von rund 95 auf 12 Tasten (Annahme: der Text der ersten Runde war kürzer als meiner; bei gleich langem Text läge die Gesamtzahl bei rund 60). Der Fokus kehrt nach dem Aufnehmen auf „Eingang aufnehmen“ zurück, der nächste Spruch beginnt mit Enter.
- Nachgestellt wurden außerdem: Zwei Fernmelder an derselben Nachricht (Sperre, Konflikt), ein Nicht-Fernmelder (S4) an den Masken der FmZ, der Sichter, der den Arbeitsplatz schließt (Stau, „Ich sichte jetzt selbst“), Papier-Nachtrag von Eingang und Ausgang, Verbindungsverlust (`setOffline`), Druckeinstellungen, leerer Vordruck als PDF (Download und Sichtprüfung der Datei), Stellenabfrage nach Schließen und Neuöffnen, Blitz-Ausgang mit Ton (Zähler der Oszillatoren im Browser).
- Fundstellen im Quelltext (`Datei:Zeile`) stammen aus `apps/desktop/src/renderer/`, die Beobachtungen aus der laufenden Anwendung. Screenshots (`NN-….png`), Skripte und das heruntergeladene PDF liegen in `/tmp/claude-0/-home-user-S1-Control/03036fe6-b619-5ee0-aa3a-bdc9e86fdba4/scratchpad/review2-fm/`.
- **Annahmen** sind im Text gekennzeichnet. Nicht gewertet: stiller Druck an einen echten Drucker und Mischbetrieb mehrerer Rechner. Die Station LdF wurde nur als Stichprobe gespielt (Marke „beim LdF“, Karten sichtbar), ihr Vorschlagsweg ist nicht bewertet.

## Nachgeprüft

„bestätigt“ heißt: Der Status der Befundliste stimmt mit dem Beobachteten überein. „nicht behoben“ heißt: Die Befundliste nennt den Befund erledigt, in der Anwendung ist er es nicht. „anders gelöst“ heißt: Der Zweck ist erreicht, aber auf anderem Weg als vermerkt.

| Kennung | Status laut README | Befund Runde 2 | Ein Satz |
| --- | --- | --- | --- |
| FM P1-1 Zeitfeld hängt an Vorbelegung an | behoben | bestätigt | In Annehmen, Befördern und Aufnahme ist die Vorbelegung beim Fokus markiert (Selektion 0 bis 4), „2020“ ergibt „20:20“ (`31-annehmen-getippt.png`). |
| FM P1-2 Tastaturbestätigung, 18 Tab | behoben | bestätigt | Enter bestätigt Annehmen, Befördern, Nachweisen und jede Zeile der Aufnahme, Strg+Enter auch im Inhalt, 10 Tab bis „Aufnehmen“, der Hauptknopf steht im festen Fuß (y 806 bis 837); die Tabfolge lässt aber Felder aus (R2-FM P1-1). |
| FM P1-3 Esc verwirft ohne Rückfrage | behoben | bestätigt | Esc mit Eingabe fragt „Entwurf verwerfen? Esc oder Verwerfen bestätigt; weitertippen behält ihn“, zweites Esc schließt, der Fokus geht auf den auslösenden Knopf zurück (`21-s4-esc.png`). |
| FM P1-4 Ersatzsichter verteilt nur an S2 | behoben | bestätigt | Anschrift „S3“ belegt S3 grün vor, ohne Hauptempfänger erscheint „Kein Hauptempfänger: …“ als Warnung; sie sperrt nicht (R2-FM P1-2). |
| FM P1-5 Blitz im Ausgang ohne Signal | behoben | bestätigt | Hinweis „Sofort-Nachricht A für FmZ“ binnen 3,5 s, bei Blitz zwei Oszillatoren (Ton), die Spalte „Wartet“ zählt ab Eintreffen, „Über der Schwelle“ zählt unangenommene (`24-fmz-queue.png`). |
| FM P1-6 leerer Vordruck nur als HTML | behoben | bestätigt | „Papier-Vordruck als PDF“ schreibt `vordruck-nachricht-leer.pdf` (8090 Bytes), „Herunterladen“ liefert es, A4 quer mit zwei Vordrucken (`leer-1.png`); das HTML der Einheiten kommt als „Dazu geschrieben“. |
| FM P2-1 Zeitzone | behoben | bestätigt | In der Browserzone UTC ergibt „2010“ die Nachweisung „172010NOV26“, Kopf und Nachweisung großgeschrieben, die Statuszeile nennt „Rechnerzeit UTC, Anzeige in Europe/Berlin“. |
| FM P2-2 keine Plausibilitätsprüfung | behoben | bestätigt | „liegt in der Zukunft“ (2100) und „liegt mehr als 24 Stunden zurück“ (151045nov26) erscheinen weich; „vor der Annahme“, „vor der Abfassung“ und Aufnahme vor Abfassung bleiben ungeprüft (die Befundliste beansprucht sie nicht). |
| FM P2-3 Abfassungszeit und Quittung „jetzt“ | behoben, kein Commit | nicht behoben | Im Eingang stehen beide weiter auf „jetzt“; Aufnahme „2010“ mit Abfassung „2015“ druckt sich wie E 1 in Runde 1 (`12-aufnahme-gefuellt.png`); nur der Schalter „Vom Papier nachtragen“ leert die Zeitfelder („vom Blatt“, Pflicht). |
| FM P2-4 Befördern: Feld nennt die Quittung nicht | behoben | bestätigt | Beschriftung „Quittung der Gegenstelle (Datum/Uhrzeit)“; Mittel steht aus dem Wunsch auf Funk (ohne Wunsch nicht gespielt), die Zeit friert aber beim Öffnen ein (R2-FM P2-6). |
| FM P2-5 Sperre nennt Arbeitsplatz, nicht Person | behoben | nicht behoben | In Befördern steht weiter „🔒 wird von Arbeitsplatz bearbeitet“ (`Fmzmasken.tsx:297`, ohne `sperrerMitStelle`); nur der Laufzettel nennt „Arbeitsplatz (FmZ · Hz. Ha)“ (`Laufzettel.tsx:180`). |
| FM P2-6 Konfliktmeldung zeigt Rohdaten | behoben, kein Commit | bestätigt | Jetzt „Inzwischen von Arbeitsplatz (FmZ) geändert: Beförderung ist jetzt 2032 Zw (Funk) an Heros Wildeshausen 10.“ mit Knopf „Neu laden“, in drei von vier Läufen (`66-A-nach-submit.png`); der vierte siehe R2-FM P2-7. |
| FM P2-7 Nachweisung ohne Mittel und Gegenstelle | teilweise | bestätigt | Spalten Mittel und Gegenstelle stehen da; in der Leiste einer aufgenommenen Nachricht gibt es weiter kein „Aufnahme ändern“ (`93-leiste-eingang.png`), der Rest bleibt offen wie vermerkt. |
| FM P2-8 Fokusfalle, Fokus nach Schließen | behoben, kein Commit | bestätigt | Tab springt vom letzten Knopf („Abbrechen“) auf das erste Element der Maske, der Fokus kehrt nach Esc, Abbrechen und Bestätigen auf den auslösenden Knopf zurück (`useFokusfalle.ts`); der Vermerk „Fokusfalle nicht“ der Befundliste ist überholt. |
| FM P2-9 Nachtrag eines Ausgangs braucht vier Masken | behoben | anders gelöst | Besser als vermerkt: „Nachricht verfassen“ hat „Vom Papier nachtragen“ mit Annahme, Beförderung, Handzeichen, Gegenstelle und Nr. in einer Maske; A 22 mit Zeiten vom Blatt in einem Zug geschrieben (`9a-ausgang-nachtrag.png`). |
| FM P2-10 befördert, nicht nachgewiesen unsichtbar | behoben | bestätigt | Karte „Ohne Nummer“ mit „Nachweisen“, Zeile in der Nachweisung mit „Nachweisen“; Befördern fragt bei leerer Nummer zweimal („Trotzdem ohne Nummer“, `36-ohne-nr-2.png`). |
| FM P2-11 falsches Druckverzeichnis angelegt | behoben | bestätigt | Probedruck meldet „Verzeichnis gibt es nicht … Es wurde nichts angelegt“ und bietet „Anlegen und Probedruck“; „Übernehmen“ speichert den Pfad ohne Rückmeldung (R2-FM P3-5). |
| FM P3-1 Rückmeldungen nennen die Nachricht nicht | behoben | bestätigt | „Nachricht A 2 ‚Sandsäcke anfordern‘ nachgewiesen“, „… angenommen“; nach Aufnehmen und Befördern steht nur „Nachricht verfasst“ bzw. „befördert“ (R2-FM P3-1). |
| FM P3-2 „Uhrzeit“ zeigt sechsstellige Gruppe | behoben | bestätigt | Annehmen ist mit „2018“ vierstellig vorbelegt. |
| FM P3-3 Stellenabfrage, Profil ändert sich nicht | teilweise | bestätigt | Nach Schließen und Neuöffnen: „Zuletzt gewählt: FmZ (Hz. Ha). Übernehmen bestätigt“, Fokus auf „Übernehmen“, ein Enter genügt; ein Neuladen der Seite öffnet den Einsatz mit Stelle unmittelbar auf „Nachrichten“; das Profil bleibt „Führungsstelle“, der erste Reiter nach dem Öffnen „Lage“. |
| FM P3-4 Knöpfe brechen um, Hauptknopf falsch | behoben | bestätigt | Hauptknopf und „⋯“ stehen in einer Zeile, der nächste Schritt (Annehmen, dann Befördern, dann Nachweisen) ist der dunkle Knopf. |
| FM P3-5 Beschriftung „Gegenstelle“ | behoben | bestätigt | „Rufname der Gegenstelle / Spruchkopf“ in Aufnahme, Nachtrag und Befördern. |
| FM P3-6 Verbindungsband ohne Papier-Hinweis | teilweise | bestätigt | Band nennt „Notfalls auf Papier weiterführen (Nachrichten: leerer Papier-Vordruck), später nacherfassen“; „Aufnehmen“ ist gesperrt, Eingaben bleiben, nach Rückkehr geht es weiter (`9g-offline.png`); die Nummer bleibt vorbelegt („24“). |
| FM P3-7 Hinweiskasten bleibt stehen | behoben | bestätigt | Kasten steht oben am Blatt mit Uhrzeit je Zeile und „Löschen“, die Auskünfte verfallen nach rund 20 s (nach 16 s da, nach 28 s weg). |

Zahl: 21 bestätigt, 2 nicht behoben (FM P2-3, P2-5), 1 anders gelöst (FM P2-9).

## Kurzes Urteil im Vergleich zur ersten Runde

Die Funkaufnahme ist deutlich besser: Statt rund 95 Navigationstasten sind es 12, der Fokus steht nach dem Aufnehmen wieder auf dem Hauptknopf, Zeitfelder lassen sich überschreiben, Esc fragt nach, der Papier-Rückfall ist als Nachtrag in einer Maske für Eingang und Ausgang da, der leere Vordruck kommt als PDF aus der Web-Schale, die Konfliktmeldung ist lesbar und ein Blitz im Ausgang meldet sich mit Ton. Die ersten sechs P1 der ersten Runde sind sämtlich behoben, kein P0 entsteht neu. Zwei Einträge der Befundliste („behoben“, ohne Commit) halten der Nachprüfung nicht stand (Abfassungszeit „jetzt“, Sperrhinweis ohne Person). Neu ist ein Preis der schnellen Tabfolge: Sie überspringt gerade die Felder, die ein Funkspruch mitbringt (Abfassungszeit, Handzeichen, Nr.), und „Ich sichte jetzt selbst“ öffnet den Laufzettel so, dass ein Blitz nach einem blinden Klick nur an S2 geht. Unter Funklast hält die Anwendung; die verbliebenen Reibungen betreffen Maus-Griffe, nicht die Datenintegrität.

## Was gut gelöst ist

- Aufnahme mit zehn Tabstopps bis „Aufnehmen“, Enter in einzeiligen Feldern und Strg+Enter im Inhalt; Fuß mit „Aufnehmen“ und Grund („Absender eintragen“, „Handzeichen der Aufnahme eintragen“) bleibt bei 860 Pixeln sichtbar.
- Papier-Nachtrag: Aufnahme, Abfassung, Quittung und Nr. „vom Blatt“ ohne Vorbelegung, Pflicht bis alles da ist; im Einsatztagebuch steht als Fachzeit 19:52 bis 19:53 (Blatt), als Erfasst 20:39. Der Nachtrag eines Ausgangs (Annahme 1958, Beförderung 2002, Nr. 22) ist eine Maske.
- Befördern: Quittungsfeld mit Beschriftung, Nummernfeld, bei leerer Nummer Rückfrage mit „Trotzdem ohne Nummer“ und Karte „Ohne Nummer“ mit „Nachweisen“; der Vermerk „Kopien nach Beförderung: rot S2, grün S4“ erscheint als Hinweis.
- Hinweis „Dieser Teil ist der Fernmeldezentrale vorbehalten (Vordruck, Felder 1 bis 6)“ vor Annehmen bei Stelle S4, mit „Trotzdem“ und gesperrtem Knopf bis dahin (`70-s4-annehmen-vorbehalt.png`).
- Sichterstau: Schließt der Sichter den Arbeitsplatz, steht „allein am Einsatz“ sofort, die FmZ erhält binnen einer Minute „3 Eingänge warten seit 4 Minuten vor dem Sichter, kein Sichter besetzt“, dazu die Karte mit „Ich sichte jetzt selbst“.
- Stellenabfrage mit Merker, Konfliktmeldung mit Klartext und „Neu laden“, Probedruck mit „Anlegen und Probedruck“ statt stillem Anlegen, Hinweiskasten mit Verfall, Verbindungsband mit Papier-Hinweis.

## P0 – Einsatzkritisch

Keine Befunde.

## P1 – Hoch

### R2-FM P1-1 Die Tabfolge der Aufnahme überspringt Handzeichen, Nr., Abfassungszeit und den ganzen Rest; im Papier-Nachtrag ist sie nicht ohne Maus zu bedienen

**Beobachtung.** Tab läuft: Vom Papier nachtragen, Mittel, Aufnahme, Rufname der Gegenstelle, Absender, Anschrift, Sofort, Blitz, Betreff, Inhalt, Aufnehmen, Abbrechen, dann wieder von vorn (`c5.js`, 20 Tab). Nicht erreichbar mit Tab oder Umschalt+Tab sind: Handzeichen der Aufnahme, Nr., Übermittlungswunsch, Spruch, Durchsage, Gesprächsnotiz, Ruf-Nr., Abfassungszeit, Zeichen, Funktion, Quittung, Laufzettel-Handzeichen, Verteilerkästchen, Weitere Stelle, Vermerke. Ursache: Nur Felder mit `data-tabfolge` gehören zur Folge (`Maske.tsx:250-264`, `Nachrichtenmaske.tsx:96`, `Vordruckeingabe.tsx:52,60,69`). Im Papier-Nachtrag gilt dieselbe Folge, obwohl Aufnahme, Abfassungszeit, Quittung und Nr. dort Pflicht sind: „Nachtragen“ bleibt gesperrt („Quittung und Handzeichen im Laufzettel eintragen“) und die Felder sind mit der Tastatur nicht zu füllen (`91-papier-laufzettel.png`). Dasselbe gilt für einen Funkspruch mit mitgeteilter Abfassungszeit (Drehbuch Minute 15): Das Feld liegt außerhalb der Folge.
**Auswirkung.** Der schnelle Weg ist sichtbar schnell und verleitet dazu, die Abfassungszeit auf „jetzt“ stehen zu lassen (siehe FM P2-3). Wer die Nummer vom Block, das Handzeichen eines Kollegen oder die Abfassungszeit ändern muss, braucht die Maus; der Papier-Rückfall, der unter Zeitdruck ohne Umwege laufen soll, ist ohne Maus nicht fertigzustellen.
**Vorschlag.** Hinter Inhalt „Abfassungszeit“ in die Folge aufnehmen (dann Aufnehmen); Handzeichen und Nr. über Umschalt+Tab vor „Mittel“ erreichbar machen; im Papier-Nachtrag die Folge ausschalten und die Dokumentfolge der Maske gelten lassen (dort sind alle Pflichtfelder in Blattordnung).

### R2-FM P1-2 „Ich sichte jetzt selbst“ öffnet den Laufzettel unter der Falz; „Sichten“ ist blind drückbar und schickt einen Blitz nur an S2

**Beobachtung.** Sichter weg, drei Eingänge (Blitz „Person im Wasser“) vor dem Sichter. Klick auf „Ich sichte jetzt selbst“: Der Fokus bleibt auf dem Knopf, die Seite scrollt nicht (`scrollY` 0), der Laufzettel liegt als vierte Karte unter der Warteschlange; auf 860 Pixel sichtbar sind nur die Überschrift und der klebende Knopf „Sichten“ (`72-ich-sichte.png`, `73-laufzettel.png`). Nach einem Klick auf „Sichten“ ohne Scrollen war E 5 gesichtet, Verteiler nur S2 rot (`75-nach-blind-sichten.png`); die Warnung „Kein Hauptempfänger: Keine Stelle hat die grüne Kopie – wer soll handeln?“ steht nur im ungesehenen Teil der Karte und hält nicht auf. Die Anschrift „FüSt OV Oldenburg“ ist keine Stelle, also gibt es nichts zu übernehmen. Fundstelle: `Sichterstau.tsx:78-100` (Knopf setzt nur die Auswahl), `Nachrichten.tsx:360`.
**Auswirkung.** Der Fall, für den der Knopf gebaut wurde (Sichter fort, Blitz liegt), endet bei bequemer Bedienung in einer Verteilung, bei der niemand handeln soll. Das ist die Zustellungslücke aus dem ersten Audit (P1-4) auf neuem Weg, diesmal mit grünem Häkchen „gesichtet“.
**Vorschlag.** Den Laufzettel als Maske öffnen (wie Annehmen) oder zumindest scrollen und den Fokus auf das erste Feld setzen; bei Vorrang ohne grüne Kopie den Knopf wie „Trotzdem ohne Nummer“ mit Rückfrage („Ohne Hauptempfänger sichten? Zweiter Klick“) führen.

## P2 – Mittel

### R2-FM P2-1 Kein Tastenkürzel für „Eingang aufnehmen“; 20 Tab vom Reiter bis zum Knopf

**Beobachtung.** Das Kürzel Strg+N öffnet „Nachricht verfassen“; „Eingang aufnehmen“ hat keins (`HANDBUCH.md` Abschnitt Nachrichten, Kürzel Strg+N, Strg+F, Strg+D). Vom Reiter „Nachrichten“ mit Tab sind es bei drei offenen Zeilen und der Karte „Vor dem Sichter“ **20 Tab** (`v1.js`); jede Zeile der Warteschlange fügt zwei hinzu.
**Auswirkung.** Der häufigste Handgriff der FmZ unter Funklast, das Öffnen der Aufnahme, liegt hinter allem, was sich in der Warteschlange staut; je mehr los ist, desto weiter weg.
**Vorschlag.** Eigenes Kürzel für „Eingang aufnehmen“ in der Sicht „Fernmeldezentrale“ (Annahme: ein Buchstabe ohne Strg wäre beim Tippen in Feldern gefährlich), und der Knopf gehört in der Tabfolge vor die Warteschlange.

### R2-FM P2-2 Die Maske beginnt auf „Vom Papier nachtragen“ statt im ersten Feld

**Beobachtung.** Sowohl „Eingang aufnehmen“ als auch „Nachricht verfassen“ setzen den Fokus auf den ersten Eingabeknoten, und das ist jetzt der Schalter „Vom Papier nachtragen“ (`Maske.tsx:155-160`, `Papiernachtrag.tsx:105`). In der Verfassen-Maske (S4) liegen sieben Tab zwischen Schalter und Anschrift (Wunsch, Spruch, Durchsage, Sofort, Blitz, Gesprächsnotiz); wer sofort die Anschrift tippt, schaltet mit dem ersten Leerzeichen den Papier-Nachtrag ein (im ersten Versuch ging der getippte Text „Heros Wildeshausen 10“ ins Leere). In der ersten Runde stand der Fokus noch auf „Mittel“ bzw. der Anschrift.
**Auswirkung.** Ein Tab mehr bei jeder Aufnahme; beim Blindtippen eine verlorene Eingabe oder ein umgeschalteter Modus, den man erst bei den leeren Zeitfeldern bemerkt.
**Vorschlag.** Startfokus auf „Mittel“ (Aufnahme) bzw. „Anschrift“ (Verfassen); der Schalter kommt in die Folge nach dem Fuß oder bekommt ein Kürzel.

### R2-FM P2-3 Enter in einer Zeile speichert einen halben Funkspruch; Rufname der Gegenstelle ist keine Pflicht

**Beobachtung.** In der Aufnahme genügen Absender, Betreff oder Inhalt und das Handzeichen; ein Enter im Feld „Betreff“ schrieb E 10 „Pflicht“ ohne Inhalt und ohne Gegenstelle (Nachweisung: Gegenstelle „—“), Nr. vergeben, Ersatzsichter-Verteilung an S2 (`m1.js`, `80-pflichtfelder.png`). Kein Hinweis, dass Feld 6 (Spruchkopf) bei Funk fehlt.
**Auswirkung.** Ein versehentliches Enter beim Tippen des Betreffs verbucht den Spruch ohne Inhalt. Eine Korrektur geht nur über Zurückziehen und Neuaufnahme, die Nummer ist dann doppelt belegt. Die Rückmeldung der Maske („Betreff oder Inhalt eintragen“) fragt nur eins von beidem ab.
**Vorschlag.** Gegenstelle bei Funk (und Telefon) als Pflicht oder wie bei der Nummer mit Rückfrage „Ohne Rufname aufnehmen? Zweiter Klick“; Enter außerhalb der letzten Zeile nur dann bestätigen, wenn Betreff und Inhalt nicht beide fehlen.

### R2-FM P2-4 „Vor dem Sichter“ sortiert nicht nach Vorrang

**Beobachtung.** Die Karte führt die Eingänge in Nummernfolge: Verpflegung (3), Sofort (4), Blitz (5); der Blitz steht zuunterst (`53-fmz-sichter-weg.png`). Im Blatt „Sichter“ steht der Blitz oben. `vorSichterZeilen` filtert nur (`Sichterstau.tsx:41-43`).
**Auswirkung.** Die FmZ greift zum obersten Knopf; unter Last ist das der falsche, und die Konzeptregel „Blitz vor Sofort vor Einfach“ (§5) gilt für diese Liste nicht.
**Vorschlag.** Nach Vorrang, dann Eintreffen sortieren, wie jede andere Liste.

### R2-FM P2-5 Bei besetztem, aber säumigem Sichter verspricht die FmZ-Sicht „kann selbst sichten“ und bietet keinen Knopf an

**Beobachtung.** Sichter-Kontext offen, aber untätig; Schwelle 2 min. Nach zweieinhalb Minuten zeigt die FmZ „3 Eingänge warten vor dem Sichter — wer aufgenommen hat, kann selbst sichten.“, aber weder Karte noch Knopf (`52-fmz-sichterstau-mit-sichter.png`). Erst nach dem Weggang des Sichters erscheint die Karte, zunächst mit „seit 0 min“ bei drei vier Minuten alten Eingängen (`53-fmz-sichter-weg.png`), eine Minute später „seit 4 min“ (`62-A-konflikt.png`). Annahme: Die Karte hängt am Feld `wartetSeitSichter`, das die Zeile nur bei einem Ereignis neu rechnet, nicht mit der Uhr (`Sichterstau.tsx:36-39`, `selbstSichtbar`).
**Auswirkung.** Der Sichter, der nicht abgemeldet ist, aber nicht reagiert (Funkgerät, Telefon, Tür), ist der häufigere Fall als der geschlossene Browser; genau dafür war die Schwelle gedacht, und der Knopf fehlt dort.
**Vorschlag.** `wartetSeitSichter` aus der Uhr der Sicht rechnen; die Karte bei Eingängen über der Schwelle auch bei besetztem Sichter zeigen.

### R2-FM P2-6 Quittungszeit friert beim Öffnen von Annehmen und Befördern ein

**Beobachtung.** Maske geöffnet um 20:45, Feld „2045“; nach 75 s (Uhr 20:46) unverändert, mit Enter wird 2045 gespeichert (`x1.js`). Beim Befördern steht „jetzt“ im Feld „Quittung der Gegenstelle“ ebenso beim Öffnen, bevor die Gegenstelle quittiert hat. Dem Sichter wurde das behoben (Sichter P3-1, die Quittungszeit läuft mit).
**Auswirkung.** Wer Befördern aufmacht, den Spruch durchgibt und auf die Quittung wartet, schreibt die Zeit vor der Quittung, nicht die der Quittung. Das ist genau die Zeit, an der die Zwanzig-Minuten-Regel gemessen wird (Folie 14).
**Vorschlag.** Die Vorbelegung mitlaufen lassen, solange sie niemand getippt hat (wie `quittungszeitpunkt` beim Sichten); beim Befördern zusätzlich als Platzhalter „Quittung jetzt“.

### R2-FM P2-7 Zwei Befördern kurz nacheinander: einmal überschrieb der zweite ohne Meldung (Annahme, einmalige Beobachtung)

**Beobachtung.** In vier Läufen mit zwei FmZ-Arbeitsplätzen an derselben Nachricht (A Maske offen, B befördert, A bestätigt) zeigte A dreimal die lesbare Konfliktmeldung. Im ersten Lauf (`i1.js`, Abstand zwischen den Schreibvorgängen unter etwa 3 Sekunden) schloss die Maske von A ohne Meldung; die Nachweisung zeigte danach A 6 mit Beförderung „2029 Ha“ statt „2029 Zw“ (B), der Zähler „Konflikthinweise“ stieg. Nicht wiederholbar; Annahme: Die Vorwertprüfung greift, sobald B im Worker von A angekommen ist, davor nicht.
**Auswirkung.** Der Beförderungsvermerk der Nachweisung, dessen Handzeichen im Papier gilt, wurde ohne Meldung durch den zweiten ersetzt. Selten, aber genau der Fall, den die Maske verhindern sollte.
**Vorschlag.** Beim Schreiben das Handzeichen des Vorwerts mitführen und bei Abweichung die Konfliktmeldung auch dann zeigen, wenn der Vorwert noch nicht eingetroffen ist; zusätzlich den Sperrhinweis nutzen (siehe FM P2-5).

## P3 – Niedrig

### R2-FM P3-1 Statuszeile nach Aufnehmen und Befördern ohne Nummer; Rückgängig nennt den falschen Schritt

Nach „Aufnehmen“ steht „✓ Nachricht verfasst · gespeichert“ (ohne Nr. und Betreff), nach „Befördern“ „✓ Nachricht befördert · gespeichert“. „Rückgängig“ nennt dahinter „Nachricht E 5 ‚Person im Wasser‘ gesichtet“ bzw. „… A 6 … gesichtet“, weil der Folgeschritt (Ersatzsichter, Kopien) der letzte Schritt ist (so von der Befundliste gesehen, FM P3-1). Der Fernmelder, der „Rückgängig“ drückt, nimmt damit die Kopien an S2 und die Verfasserstelle zurück, nicht die Beförderung. Vorschlag: Statuszeile mit „E 5 ‚Betreff‘ aufgenommen“, Rückgängig nach dem eigenen Schritt benennen.

### R2-FM P3-2 Bei „Eingang aufnehmen“ fehlt der Hinweis „den Fernmeldern vorbehalten“

Annehmen, Befördern, Nachweisen zeigen ihn (Entscheidung 13). „Eingang aufnehmen“ schreibt den Aufnahmevermerk (Feld 2) und die Felder 1 und 6, aber ein Arbeitsplatz mit Stelle S4 öffnet die Maske ohne Hinweis (`9e-s4-aufnahme.png`). Handbuch und Entscheidung nennen die Aufnahme nicht. Vorschlag: Hinweis oder die Aufnahme ausdrücklich ausnehmen.

### R2-FM P3-3 „Wartet“-Marke sitzt versetzt, „seit 0 min“ im ersten Takt

In der Zeile der Warteschlange steht die bernsteinfarbene Marke „4 min“ unterhalb der Textzeile der Zelle (`72-ich-sichte.png`; im Textabzug „4 minkein Vorschlag“). Die Karte „Vor dem Sichter“ zeigt im ersten Takt „seit 0 min“ (siehe R2-FM P2-5). Beides kosmetisch, aber an der Stelle, an der man Wartezeiten liest.

### R2-FM P3-4 Handbuch und Störfall nennen „Vom Papier nachtragen“ nicht

Der Rückfallweg ist ein Schalter in der Maske („Eingang aufnehmen“ und „Nachricht verfassen“, mit Feldern für Annahme, Beförderung, Nr.), aber `HANDBUCH.md` (Abschnitt „Nachrichten“ und Störfall) beschreibt nur „die Nachricht verfassen beziehungsweise den Eingang aufnehmen und die Zeiten übernehmen“, nicht den Schalter; auch nicht, dass „Papier-Vordruck als PDF“ zwei Dateien schreibt (leerer Nachrichtenvordruck als PDF, Papier-Vordruck der Einheiten als HTML). Vorschlag: Schalter und die zwei Dateien im Störfall nennen.

### R2-FM P3-5 „Übernehmen“ in den Druckeinstellungen schweigt bei fehlendem Verzeichnis

Mit einem nicht vorhandenen Ordner speichert „Übernehmen“ ohne Rückmeldung (`87-uebernehmen.png`); die Rückfrage kommt erst beim Probedruck. Wer ihn überspringt, bekommt den Hinweis erst beim ersten Automatikdruck. Vorschlag: „Übernehmen“ prüft das Verzeichnis und meldet „Verzeichnis gibt es nicht“.

### R2-FM P3-6 „⚠ 1 Konflikthinweis“ in der Fußzeile ohne erkennbaren Anlass

Schon beim ersten Öffnen des frisch angelegten Einsatzes (ein Arbeitsplatz, vor jeder Nachricht) steht „⚠ 1 Konflikthinweis“; der Zähler wächst auf 4. Die Erklärung beschreibt zwei Arbeitsplätze an einem Feld in der Lagetabelle; im Nachrichtenblatt ist nicht zu erkennen, ob sie etwas betrifft (`9f-konflikthinweis.png`). Annahme: Die Zahl stammt aus der Einsatzanlage und nicht aus den Nachrichten. Vorschlag: Zähler der Hinweise mit Ort („in der Lage“) oder leer, wenn keiner den Anlass kennt.

## Zusammenfassung der Befunde

| Stufe | Anzahl neu |
| --- | --- |
| P0 | 0 |
| P1 | 2 |
| P2 | 7 |
| P3 | 6 |

Nachgeprüft: 24 Befunde der ersten Runde, 21 bestätigt, 2 nicht behoben (FM P2-3, FM P2-5), 1 anders gelöst (FM P2-9).
