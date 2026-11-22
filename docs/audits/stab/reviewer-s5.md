# Stabsreview S5 – Presse- und Medienarbeit

Stand: 22.11.2026, Web-Schale http://127.0.0.1:8790 (Playwright, Chromium, 1440 × 900). Übungseinsatz „Review S456 Hochwasser Weser“ (Lage siehe `reviewer-s4.md`). Eigener Arbeitsplatz (Profil „Führungsstelle (S1)“, es gibt kein S5-Profil) mit Stelle „S5“ über „Weitere Stelle“ und Handzeichen „Prs“. Durchgespielt: Medienanfrage des NDR als Gesprächsnotiz, Entwurf Pressemitteilung Nr. 1 zur Freigabe an den Leiter, Suche nach freigabefähigen Lagezahlen (Kopfband, Monitor, Exporte). Screenshots und Skripte: `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/s456/` (`26-*` bis `29-*`, `34-monitor-7.png` bis `-9.png`).

Annahmen (keine Vorschrift): Der S5 schreibt Pressemitteilungen, lässt sie vom Leiter freigeben, gibt nur freigegebene Zahlen heraus, protokolliert Medienanfragen mit Rückrufzusage und begleitet Medienvertreter vor Ort.

## Urteil aus Sicht des S5

Für den S5 gibt es **keine eigene Ansicht** und keine eigene Stelle. Er kommt über „Weitere Stelle: S5“ in die Nachrichten, und das funktioniert technisch (Posteingang „meinen Stellen (S5)“, Absender und Funktion „S5“). Aber jede Arbeitsform des S5 passt nur schief in den Vordruck 1103.1: Eine Pressemitteilung ist auf 12 Zeilen begrenzt und läuft zur Freigabe beim Leiter **durch die Fernmeldezentrale**; eine Medienanfrage als Gesprächsnotiz verteilt den Journalisten als Stelle (Befund S5-1). Die Zahlen, die der S5 bräuchte, sind da – Ist-Stärke, je Organisation, je Abschnitt, Monitor 7 bis 9 –, aber nichts unterscheidet „intern“ von „zur Veröffentlichung freigegeben, Stand hhmm“.

## Fehlende Ansichten

### S5-A1 (P1) – Pressemitteilungen mit Freigabe

- **Was der S5 sehen/tun muss:** Liste der Pressemitteilungen mit Nr., Titel, Zustand (Entwurf → zur Freigabe → freigegeben von/um → veröffentlicht um/über → zurückgezogen/berichtigt), Volltext ohne 12-Zeilen-Grenze, Fassungen, Sperrfrist, nächster angekündigter Termin („Nächste Info 2100“). Freigabe durch den Leiter mit Handzeichen, stabsintern, ohne Fernmeldezentrale.
- **Was die App schon hat:** Nachrichten mit Absender/Funktion/Handzeichen, Laufzettel-Vermerke, Tagebuch mit Nachrichtenbezug, Berichtigung/Zurückziehen, Druck als PDF, Stelle „Leiter“.
- **Wo es heute verstreut ist:** Nachricht verfassen (Spruch an „Leiter“, 12 Zeilen) → Ausgang „vor der FmZ (kein LdF)“ → Annahme/Beförderung durch FmZ → Posteingang Leiter. Ob freigegeben wurde, steht nur als Antwort oder Vermerk.

### S5-A2 (P1) – Freigegebene Lagezahlen („Sprachregelung“)

- **Was der S5 sehen/tun muss:** Ein Satz Zahlen und Kernaussagen mit Zeitstempel und Freigabe: Kräfte gesamt und je Organisation, Zahl der Einsatzabschnitte bzw. Einsatzstellen (ohne interne Namen), was getan wird, was die Bevölkerung tun soll, was **nicht** gesagt wird. Die Live-Zahl daneben, mit Abweichung seit der letzten Freigabe.
- **Was die App schon hat:** Ist-Stärke im Kopfband (1/27/105 // 133, „+18 erwartet“), Monitor 7 (Stärke je Abschnitt), 8 (je Organisation: THW 106, DRK 9, Regie 18), 9 (Abschnitt × Organisation), Export „Druck – Stärke je Bereich für die Lagekarte“ mit Davon-Stärke.
- **Wo es heute verstreut ist:** Kopfband, Monitor-Fenster, Exporte. Es gibt mindestens drei Gesamtzahlen (Ist 133, Erwartet 18, „Alle erfassten Einheiten“ 151) und keinen Hinweis, welche nach außen gehört.

### S5-A3 (P2) – Medienanfragen-Protokoll

- **Was der S5 sehen/tun muss:** Je Anfrage: Eingang (Zeit), Medium, Person, Rückrufnummer, Frage, Zusage („Rückruf bis 1830“), zuständig, beantwortet (Zeit, mit welcher Freigabe), offen/überfällig. Filter „offene Zusagen“.
- **Was die App schon hat:** Gesprächsnotiz (Gesprächspartner, Ruf-Nr., Betreff, Inhalt, Zeitstempel), Posteingang-Sicht „Offen“, Tagebuch.
- **Wo es heute verstreut ist:** Gesprächsnotizen zwischen allen anderen Nachrichten in Ausgang und Nachweisung; keine Fälligkeit, kein „beantwortet“.

### S5-A4 (P3) – Termine und Medienvertreter vor Ort

- **Was der S5 sehen/tun muss:** Pressetermine/O-Töne (wer, wann, wo, Begleitung), Medienvertreter an Einsatzstellen mit Begleiter und Ausweis/Akkreditierung, Foto-/Drehfreigabe je Abschnitt.
- **Was die App schon hat:** Abschnitte, Dienstposten im Blatt Führungsstelle (Teilbereich „Externe“), Tagebuch.
- **Wo es heute verstreut ist:** Nur Tagebuch-Freitext.

## Befunde an vorhandenen Ansichten

### S5-1 (P1) – Gesprächsnotiz verteilt den Journalisten als Stelle mit grüner Kopie

- **Beobachtung:** Gesprächsnotiz mit Gesprächspartner „NDR 1 Niedersachsen, Hr. Petersen“, im Laufzettel Leiter grün angehakt. Nach „Aufgeben“ steht in der Nachweisung und im Tagebuch (Nr. 90): „Gesprächsnotiz E gesichtet (Hz. Prs), verteilt an S2 (rot), **NDR 1 Niedersachsen (grün), Hr. Petersen (grün)**, Leiter (grün)“ (`29-Nachweisung.png`). Ursache im Code: `verteilerAusAnschrift`/`anschriftStellen` in `apps/desktop/src/renderer/Verteilerraster.tsx` zerlegt die Anschrift an Komma, Semikolon und „und“ und macht jeden Teil zur Stelle mit grüner Kopie; bei der Gesprächsnotiz ist die Anschrift der externe Gesprächspartner.
- **Auswirkung:** Im Verteiler und im Tagebuch stehen Medienvertreter als Bearbeiter. Es entstehen Posteingänge für Stellen, die es nicht gibt; die Akte suggeriert, die Notiz sei an den NDR gegangen. Für den S5 heikel, weil gerade bei Medien nachvollziehbar sein muss, was nach außen ging.
- **Empfehlung:** Bei Gesprächsnotizen den Verteiler nicht aus dem Gesprächspartner vorbelegen (nur S2 rot + verfassende Stelle bzw. Auswahl im Raster).
- **Verifikation:** Gesprächsnotiz mit Gesprächspartner „Radio X, Fr. Y“ aufgeben; Verteiler enthält weder „Radio X“ noch „Fr. Y“. Regressionstest an `verteilerAusAnschrift` mit `gespraechsnotiz`.

### S5-2 (P1) – Freigabe einer Pressemitteilung hängt an der Fernmeldezentrale

- **Beobachtung:** Spruch „Freigabe Pressemitteilung Nr. 1“ an „Leiter“, Übermittlungswunsch Kurier/Melder. Danach im Ausgang: „vor der FmZ (kein LdF)“, Nr. „folgt (FmZ)“; Band „VOR DEM LDF (NICHT BESETZT) · 1 ZUTEILUNG“, Hinweis „Kein Fernmelder besetzt … Aufgegebene Nachrichten bleiben liegen“. Der Leiter sieht nichts, solange niemand die FmZ bedient. Der Inhalt ist auf 12 Zeilen begrenzt („0 von 12 Zeilen“). Ein stabsinterner Weg ist laut `docs/audits/nachrichten/README.md` (R2-FaBe P1-3) bewusst nicht gebaut.
- **Auswirkung:** Freigaben dauern so lange wie der Fernmeldeweg; eine längere Pressemitteilung passt nicht in den Vordruck. In der Praxis würde der S5 am Programm vorbei auf Papier oder mündlich freigeben lassen – dann fehlt die Freigabe in der Akte.
- **Empfehlung:** Eigene Ansicht S5-A1 mit stabsinterner Freigabe (Ereignis „freigegeben von Leiter, Hz.“), die nicht durch die FmZ läuft und im Tagebuch steht.
- **Verifikation:** Entwurf anlegen, Leiter-Arbeitsplatz gibt frei, ohne dass ein Fm-Arbeitsplatz besetzt ist; Tagebuch zeigt Entwurf, Freigabe, Veröffentlichung.

### S5-3 (P2) – Keine Stelle S5, kein Profil S5

- **Beobachtung:** Die Stellenwahl („Stelle und Handzeichen“) bietet LdF, Fm1–3, Sichter, Leiter, S1–S4, S6, Fachberater, Verbindungsstelle – kein S5. Über „Weitere Stelle“ geht „S5“; danach heißt es „Meine Stelle: S5 · Hz. Prs“, der Posteingang filtert „meinen Stellen (S5)“. Im Verteilerraster fehlt S5 als feste Zeile (bewusst, `Verteilerraster.s5.test.tsx`), in der Leiste „Posteingang von“ ebenso. Profile gibt es nur für Führungsstelle (S1), Vermeldezentrale, Versorgung (S4), Alle.
- **Auswirkung:** Stört wenig beim Schreiben, aber Kollegen, die dem S5 etwas schicken wollen, finden ihn im Raster nicht und müssen „S5“ eintippen; Tippfehler („S 5“, „Presse“) erzeugen neue Stellen. Der S5 bekommt ein Band mit S1/Funkplan/S4/Exporte, das er nicht braucht.
- **Empfehlung:** S5 als feste Stelle in `NACHRICHT_STELLEN` und im Raster aufnehmen (die Lehrunterlagen-Entscheidung 12 dafür neu bewerten, wenn ein S5 im Stab sitzt) oder mindestens in der Vorschlagsliste von „Weitere Stelle“; Profil „Presse (S5)“ mit Nachrichten und der künftigen Ansicht S5-A1/A2.
- **Verifikation:** Stellenwahl zeigt S5; Raster hat Zeile S5; Profil S5 öffnet die Presseansicht.

### S5-4 (P2) – Mehrere Gesamtzahlen ohne Kennzeichnung „für außen“

- **Beobachtung:** Kopfband „1/27/105 // 133, +18 erwartet“; Tabellensumme „Alle erfassten Einheiten 1/31/119 151“; Monitor 8 „THW 106, DRK 9, Regie 18, Gesamt 133, +18“; Feuerwehr (LGr mit 0/0/0) fehlt in Monitor 8 und 9 ganz, obwohl die Feuerwehr im Einsatz ist; die Regel-Erklärung ist lang und intern formuliert.
- **Auswirkung:** Der S5 kann nicht sicher sagen, „wie viele Helfer im Einsatz sind“; die Pressemitteilung nennt sonst „THW und Feuerwehr“, die Zahlenansicht keine Feuerwehr.
- **Empfehlung:** In der Ansicht S5-A2 eine Zahl „Kräfte vor Ort“ mit Organisationen (auch mit unbekannter Stärke „Feuerwehr: Stärke nicht gemeldet“) und Zeitstempel.
- **Verifikation:** Einheit mit Stärke 0 anlegen; die S5-Zahlenansicht nennt die Organisation mit „Stärke nicht gemeldet“.

### S5-5 (P3) – Gesprächsnotiz zählt als Eingang „E (Notiz)“ ohne Fälligkeit

- **Beobachtung:** Die Medienanfrage steht in der Nachweisung als „E (Notiz)“, im Ausgang unter „Kopie rot · verteilt“. Die zugesagte Rückrufzeit (1830) steht nur im Freitext; die Sicht „Offen“ zeigte die Notiz nicht, nur die Freigabebitte.
- **Auswirkung:** Rückrufzusagen an Medien gehen in der Schichtübergabe unter.
- **Empfehlung:** Siehe S5-A3 (Fälligkeit, „beantwortet“).
- **Verifikation:** Anfrage mit Rückruf bis hhmm anlegen; sie erscheint ab hhmm als überfällig.

## Schluss

- **Aufgabe geschafft:** Medienanfrage festhalten **mit Umwegen** (und mit falschem Verteiler); Pressemitteilung zur Freigabe **mit Umwegen**, Freigabe selbst **nein**, solange die FmZ nicht besetzt ist; freigegebene Lagezahlen **nein** (nur interne Zahlen).
- **Größtes Risiko:** Nicht freigegebene oder widersprüchliche Zahlen gehen nach außen, weil die App keine freigegebene Fassung kennt; dazu stehen Medienvertreter als Verteiler-Stellen in der Akte (S5-1).
- **Top-Priorität:** Ansicht „Pressemitteilungen und freigegebene Lagezahlen“ (S5-A1 + S5-A2) mit stabsinterner Freigabe durch den Leiter.
