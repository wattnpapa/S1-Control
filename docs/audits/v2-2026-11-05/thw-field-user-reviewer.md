# Audit „Helfer im Feld“: S1-Control v2, Stand 05.11.2026

**Rolle:** THW-Helfer aus dem Einsatzgeschehen (Gruppenführer, Truppführer, Helfer am Meldekopf oder in der Vermeldezentrale). Er kann Pumpen, Aggregate, Funkgeräte und Fahrzeuge bedienen, nutzt die Software aber nur gelegentlich, ohne frische Einweisung, oft im Stehen, mit Handschuhen, unterbrochen durch Funk und Zurufe.
**Material:** Eigene Web-Schale mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten), HEAD nach `ffc3125`. Bedient mit Playwright in der Geräteemulation `iPhone 13` (390 × 664, hoch und quer), `iPad Mini` (768 × 1024) und Desktop 1600 × 1000. Screenshots unter `scratchpad/shots/field-user/` (01 bis 15). Quelltext nur als Beleg mit Datei:Zeile. Vergleich: `docs/audits/thw-field-user-reviewer.md` (18.09., nur aus Code abgeleitet) und `docs/audits/v2-2026-10-29/` (dort kein Feldnutzer-Audit).
**Kennzeichnung:** [beobachtet] = in der laufenden Anwendung selbst nachgestellt · [Code] = aus dem Quelltext belegt · [Annahme] = naheliegend, aber nicht nachgestellt, oder THW-Ablauf, der nicht aus dem Material stammt · [nicht prüfbar] = Feldbedingung, die hier nicht nachgestellt werden konnte.

**Geprüfte Aufgaben (abgeleitet, weil keine vorgegeben waren):**

| # | Aufgabe | Gerät | Ergebnis |
|---|---|---|---|
| A | Eigene Einheit finden, Status ändern, Änderung erkennen, zurücknehmen | iPhone 13 | **mit Schwierigkeiten** |
| B | Stärke der eigenen Einheit korrigieren | iPhone 13 | **mit Schwierigkeiten** |
| C | Am Meldekopf eine eintreffende Einheit aufnehmen | iPad Mini, Betriebsart Meldekopf | **nein** ohne Handscanner |
| D | Rufgruppe anlegen, Funkplan lesen (Vermeldezentrale) | iPad Mini, iPhone 13 | ja |
| E | Verbindung bricht ab, Eingabe halb fertig | iPhone 13 | **ja**, vorbildlich |
| F | Bei Dunkelheit und mit Feldbild ablesen | iPhone 13, Nachtbild und Feld | ja |

**Mentales Modell des Helfers [Annahme]:** „Das ist die Stärkemeldung und der Funkplan von der FüSt auf meinem Handy. Ich will meine Einheit sehen, meinen Status und meine Stärke durchgeben, sehen, dass es angekommen ist, und wissen, auf welcher Rufgruppe ich bin. Alles andere ist Sache der FüSt.“

---

## Urteil

**Was trägt.** Die Oberfläche ist auf Touch eingerichtet, und das merkt man: Knöpfe, Reiter, Filter und Menüeinträge sind bei grober Zeigesteuerung 44 px hoch [beobachtet, Code `index.html:3757–3781`]. Die Seite scrollt am Handy nie waagerecht, nur die Tabelle in sich. Der Statuswechsel ist der beste Ablauf der Anwendung: Statusknopf antippen, unten erscheint ein Blatt mit großer Auswahl, „Übernehmen“ oder „Abbrechen“, darüber steht „Status ändern: BGr 2 Oldenburg“ (Shot 07). Fällt die Verbindung weg, sagt ein haftendes Band in Klartext, was los ist, „Übernehmen“ wird gesperrt und die halbe Eingabe bleibt stehen (Shot 14). Die Rückfrage vor „Rückgängig“ nennt den Schritt und sagt, dass er für alle Arbeitsplätze gilt (Shot 08). Das Nachtbild ist ablesbar, jeder Status hat sein Wort und hängt nicht nur an der Farbe (Shot 13). Das sollte bei jedem Umbau erhalten bleiben.

**Wo es hakt.** Die Anwendung ist eine Führungsstellen-Software, die auf dem Handy funktioniert. Sie ist kein Werkzeug für den Helfer im Feld, und sie gibt sich auch nicht als solches aus. Für den Helfer heißt das: Auf dem Handy bekommt er das volle Lagebild der S1 mit fünf Reitern, Abschnittsbaum, 40 Zeilen und einer Auswahlleiste mit „Verschieben Strg+M“ und „Entfernen Strg+E“. Was er wirklich braucht, ist seine Zeile, sein Status, seine Stärke und seine Rufgruppe. Dahin kommt er nur über Suche und waagerechtes Wischen. Zwei Stellen fallen im Feldbetrieb ernsthaft auf:

1. **Ob eine Eingabe gespeichert ist und wie man sie zurücknimmt, steht am Ende der Seite.** Am Handy war die Meldung „✓ … gespeichert“ nach einem Statuswechsel 2 270 px unterhalb des sichtbaren Bereichs. Der Knopf „Rückgängig“ ist dort 24 px hoch.
2. **Der Meldekopf auf einem Tablet kann ohne Handscanner keine Einheit aufnehmen.** Er hat nur „Bogen scannen“, und das Feld wartet auf den Text eines Handscanners. Einen Weg zum Abtippen eines Papierbogens gibt es in dieser Betriebsart nicht.

**Kann der Helfer seine Aufgabe ohne Hilfe erledigen?** Den Status ja, und er erkennt das Ergebnis an der geänderten Zelle. Die Stärke nur mit Mühe. Am Meldekopf-Tablet ohne Scanner gar nicht. Realistisch nutzt ein Helfer im Feld die Anwendung zum **Nachschauen** (Lage, Rufgruppe, Stand der eigenen Einheit) und für **einzelne Statuswechsel**. Am Tisch oder im Fahrzeug, mit Tablet, kann er Meldekopf und Vermeldezentrale besetzen, wenn ein Handscanner dabei ist.

Zählung: **P0: 0 · P1: 2 · P2: 5 · P3: 5**

---

## Findings

### P1-1 · Speicherbestätigung und „Rückgängig“ liegen am Handy weit außer Sicht

**Evidenz:** [beobachtet], [Code]
**Wo:** Lage → Statusknopf einer Einheit → „Übernehmen“, iPhone 13 hochkant, ungefilterte Liste (Shot `09-nach-schreiben-volle-liste-iphone.png`). Die Statuszeile ist `position: static` und steht am Ende des Dokuments (`index.html:826–857`, `Statuszeile.tsx:142–157`). Gemessen wurden Statuszeile bei y = 2 846 und Bestätigung bei y = 2 937 bei einer Fensterhöhe von 664. Der Knopf „↶ Rückgängig: …“ ist 338 × 24 px groß (`.statuszeile .ruecknahme { min-height: 24px }` schlägt die 44-px-Regel für Touch).
**Reaktion des Helfers:** „Hab ich gedrückt, ist das jetzt raus? Und wie krieg ich das zurück, ich hab die falsche Einheit erwischt?“ Er sieht nur, dass der Knopf jetzt „Ruhe“ zeigt.
**Problem:** Die eigentliche Auskunft „gespeichert“ (im Unterschied zu „nur angezeigt“) und der einzige Weg zurück sind am Handy nur erreichbar, wenn man an 40 Zeilen vorbei bis ganz unten scrollt. Im Desktopfenster steht die Statuszeile immer unten im Bild, am Handy nicht. Das Ziel ist mit 24 px auch mit Handschuh zu klein. Bei gefilterter Liste (Suche „BGr 2“) war die Bestätigung zufällig sichtbar, weil die Seite kurz war (Shot 08).
**Auswirkung im Einsatz:** Ein Fehltipp auf den Status der Nachbarzeile, etwa beim Scrollen mit dem Daumen, bleibt unbemerkt oder unkorrigiert stehen. Der Helfer meldet zur Sicherheit noch einmal über Funk. Damit ist der Zeitgewinn weg.
**Empfehlung:** Nach jedem Schreiben am schmalen oder Touch-Bildschirm eine kurze Rückmeldung **im Blickfeld** einblenden, unten anhaftend für einige Sekunden: „Status BGr 2 Oldenburg → Ruhe gespeichert · Rückgängig“. Der Rückgängig-Knopf darin bekommt mindestens 44 px. Alternativ die Statuszeile am Handy unten haften lassen, in einer Zeile gekürzt.
**Nachprüfen:** iPhone, volle Liste, Status einer Zeile in der Mitte ändern. Ohne zu scrollen sind „gespeichert“ und „Rückgängig“ sichtbar, das Ziel ist mindestens 44 px groß, und ein Tipp darauf öffnet die bekannte Rückfrage.

### P1-2 · Meldekopf am Tablet: ohne Handscanner keine Aufnahme möglich

**Evidenz:** [beobachtet], [Code]
**Wo:** Einsatzauswahl → „Ändern“ → Betriebsart „Meldekopf“ → Einsatz öffnen, iPad Mini (Shots `10-meldekopf-ipad.png`, `10-scanner-fehleingabe-ipad.png`). Die Ansicht besteht aus „Aufnehmen nach“, „Bogen scannen“, Eingangskorb und Einsatztagebuch (`Meldekopf.tsx:47–103`). Der Scanner ist ein einzelnes Textfeld für den Handscanner, der „als Tastatur“ tippt (`Scanner.tsx:1–16`): „Handscanner in das Feld richten und den Code lesen (Strg+Q)“.
**Reaktion des Helfers:** Der Bogen ist handschriftlich ausgefüllt, oder der QR-Code ist nass, oder der Scanner ist leer. „Dann tipp ich das eben ab. Wo ist ‚Einheit anlegen‘?“ Er tippt den Namen ins Scanfeld und bekommt „Der Scan enthält keinen Erfassungsbogen. Wurde ein anderer Code gelesen?“. Gleichzeitig steht darüber weiter „Noch nichts gescannt.“
**Problem:** Die Betriebsart Meldekopf blendet die Einheitentabelle samt „Einheit anlegen“ bewusst aus. Ein Tablet hat aber im Regelfall keinen Handscanner, und die Kamera wird nicht als Scanner angeboten. Der einzige Ersatz wäre, die Betriebsart umzustellen. Das findet der Helfer nicht (Startseite → „Ändern“ → Betriebsart), und er soll es laut Erklärtext auch nicht.
**Auswirkung im Einsatz:** Der Meldekopf schreibt auf Papier und funkt oder trägt die Bögen zur FüSt. Dort wird doppelt erfasst, und die Zeit bis zur Einheit in der Lage wächst. [Annahme: Am Bereitstellungsraum kommen auch Bögen ohne lesbaren Code an.]
**Empfehlung:** Im Meldekopf neben „Bogen scannen“ einen gleichwertigen Knopf „Bogen abtippen …“ anbieten. Er öffnet die vorhandene Maske „Einheit anlegen“ mit Abschnitt aus „Aufnehmen nach“ und legt das Ergebnis in den Eingangskorb, nicht direkt in die Lage. Optional die Gerätekamera als Scanner. Den Text „Noch nichts gescannt.“ ausblenden, sobald ein Fehlversuch gemeldet ist.
**Nachprüfen:** Tablet ohne Scanner, Betriebsart Meldekopf. Ein Papierbogen „BGr 3 Varel 0/1/8“ lässt sich in unter einer Minute so erfassen, dass er im Eingangskorb der FüSt als „Neu“ erscheint.

### P2-1 · Keine Feldsicht: Der Helfer bekommt das volle Lagebild der S1 und muss seine Zeile suchen

**Evidenz:** [beobachtet]
**Wo:** iPhone 13, Profil „Führungsstelle (S1)“ (Voreinstellung). Kopfband, Einstiegszeile, Abschnittsbaum mit 13 Zeilen und Filterzeile stehen vor der Tabelle. Die erste Einheitenzeile beginnt bei rund 1 300 px (Shots 03, 06). Am Handy sind Bezeichnung und Status sichtbar, die Spalte „Fü / UFü / He“ erst nach waagerechtem Wischen in der Tabelle (Shot 06). Die Auswahl einer Zeile öffnet die Auswahlleiste mit „Verschieben“, „Aufteilen“, „Zusammenführen“, „Kopieren“, „Ablösung anfordern“, „Funk …“ und „Entfernen“ (Shot 07). Keines der vier Profile ist für den Helfer gedacht (`blaetter.ts` `BAND`, `Profilwahl.tsx:19–24`).
**Reaktion des Helfers:** „Ich will nur sehen, was für uns drinsteht.“ Die Suche findet „BGr 2“ schnell und zeigt die Zeile mit Abschnitt, das funktioniert. Aber er scrollt erst am Baum vorbei und wischt dann seitlich, um seine Stärke zu sehen.
**Problem:** Die Fläche ist für den Leiter der FüSt gebaut. Die Werkzeuge der S1, darunter „Entfernen“ (mit Rückfrage), liegen am Handy einen Tipp neben der eigenen Zeile. Ein Profil wie „Einheit“ oder „Nur lesen“ gibt es nicht.
**Auswirkung im Einsatz:** Nachschauen dauert eine halbe Minute statt fünf Sekunden. Wer nur nachschauen wollte, kann trotzdem verschieben oder entfernen. [Annahme: Ob Helfer im Feld überhaupt ins Netz der FüSt kommen, entscheidet der Aufbau vor Ort; die Web-Schale läuft im lokalen Netz.] [nicht prüfbar]
**Empfehlung:** Ein fünftes Profil „Einheit im Feld“ (Zuschnitt, kein Recht, wie die anderen): eine Karte je gewählter Einheit mit Status (großes Blatt wie jetzt), Stärke als drei Zahlenfelder, Rufgruppe, Abschnitt und letzte Tagebuchzeilen. Kein Baum, keine Auswahlleiste. Die gewählte Einheit merkt sich das Gerät.
**Nachprüfen:** Ein Helfer ohne Einweisung öffnet auf dem Handy seine Einheit und liest Status, Stärke und Rufgruppe ohne waagerechtes Wischen in unter 15 Sekunden ab.

### P2-2 · Stärke am Handy: Doppeltipp, Textfeld mit Schrägstrichen, erste Ziffer verdeckt

**Evidenz:** [beobachtet], [Code]
**Wo:** Lage → Spalte „Fü / UFü / He“ → Doppeltipp (Shot `09-staerke-doppeltipp-iphone.png`). Es öffnet sich ein Eingabefeld mit „0/1/2“. Das Feld hat kein `inputMode` (`Einheitenzelle.tsx:177`), das Handy zeigt also die Buchstabentastatur. Das Feld beginnt unter der haftenden Namensspalte, die erste Ziffer ist abgeschnitten („)/1/2“). Der Hinweis unter der Tabelle lautet „Doppelklick bearbeitet die Zelle … Enter oder Wegklicken schreibt, Esc verwirft“.
**Reaktion des Helfers:** Ein Tipp tut nichts, ein Doppeltipp ist auf dem Handy eher „Zoomen“. Wenn das Feld da ist: „Welche Zahl steht da vorne? Wo ist der Schrägstrich?“ Mit Handschuh trifft er die Ziffern auf der Buchstabentastatur kaum.
**Problem:** Die Stärke, die wichtigste Zahl der Meldung, wird am Handy als Freitext im Format „a/b/c“ verlangt. Esc gibt es auf dem Handy nicht. „Wegklicken schreibt“ heißt: Wer abbrechen will und daneben tippt, schreibt. Die Eingabe wird inzwischen geprüft, ungültige Werte werden nicht geschrieben (behoben seit 29.10.).
**Auswirkung im Einsatz:** Zahlendreher und Abbrüche. Der Helfer lässt es und meldet per Funk.
**Empfehlung:** Am schmalen oder Touch-Bildschirm öffnet ein einfacher Tipp auf die Stärke ein Blatt wie beim Status, mit drei großen Zahlenfeldern (Zifferntastatur) oder ± Knöpfen, „Übernehmen“ und „Abbrechen“. Wegtippen schreibt dort nicht.
**Nachprüfen:** iPhone mit Handschuh-Simulation (Zielgröße 44 px). Stärke 0/1/8 → 0/1/7 in unter 10 Sekunden ändern, Abbrechen ohne Schreiben möglich.

### P2-3 · Kopfband nimmt ein Drittel (hoch) bis die Hälfte (quer) des Bildschirms, Reiter sind abgeschnitten

**Evidenz:** [beobachtet]
**Wo:** iPhone hochkant: Das Kopfband ist 241 px hoch bei 664 px Fensterhöhe, dazu kommt die Einstiegszeile mit „Verstanden“ (Shot 03). Der Reiter „Ausga…“ ist abgeschnitten, „Einsatztagebuch“ liegt verdeckt hinter „Mehr ▾“ und ist nur durch seitliches Wischen der Reiterzeile erreichbar. Im Querformat bleiben unter Kopfband und Einstiegszeile etwa 40 % der Höhe für Inhalt (Shot `15-lage-quer-iphone.png`). Das Kopfband haftet nicht und scrollt weg (gemessen `position: relative`). Damit sind beim Arbeiten in der Tabelle auch Reiter und Verbindungsmarke weg.
**Reaktion des Helfers:** „Wo ist das Tagebuch?“ Er sieht „Mehr ▾“, öffnet es und findet dort Funkplan, Versorgung und Kosten, aber kein Tagebuch.
**Problem:** Wer nicht weiß, dass man die Reiterzeile wischen kann, findet einen der fünf Reiter nicht. Die große Stärkezahl und die DTG-Zeit sind für die FüSt wichtig, für den Helfer am Handy kosten sie den halben Bildschirm.
**Auswirkung im Einsatz:** Suchen statt Arbeiten, Fehltipps auf den Reiterrand.
**Empfehlung:** Am Handy die Reiter umbrechen lassen oder alle nicht passenden Reiter unter „Mehr“ führen. Kennzahl und Zeit in eine Zeile, die Zustandsmarke („aktuell“, „Verbindung unterbrochen“) beim Scrollen unten oder oben haften lassen.
**Nachprüfen:** iPhone hoch und quer: alle Reiter ohne Wischen sichtbar oder unter „Mehr“; Inhalt beginnt oberhalb von 40 % der Höhe.

### P2-4 · Tastaturhinweise auf Touchgeräten: Strg+M, Esc, Doppelklick, Rechtsklick

**Evidenz:** [beobachtet], [Code]
**Wo:** Auswahlleiste: „Verschieben Strg+M“, „Kopieren Strg+K“, „Entfernen Strg+E“, Schluss „Esc hebt die Auswahl auf“ (`Auswahlleiste.tsx:89`). Jede Einstiegszeile: „Mehr in der Hilfe (Strg+H)“ (`Einstiegszeile.tsx:65`). Funkplan: „„⋯“ an der gewählten Gruppe oder Rechtsklick … Doppelklick auf Rufgruppe oder Funkhinweis bearbeitet die Zelle · Enter schreibt · Esc verwirft“. Scanner: „(Strg+Q)“.
**Reaktion des Helfers:** „Ich hab kein Strg und kein Esc. Wie werd ich die Auswahl wieder los?“ Er tippt irgendwo hin.
**Problem:** Die Hinweise erklären einen Weg, den es am Gerät nicht gibt, und verschweigen den, den es gibt. Der Weg zur Hilfe läuft am Handy über „⋯“ → „Hilfe und Tastenkarte“. Das sagt keine Einstiegszeile.
**Auswirkung im Einsatz:** Unsicherheit und unnötige Tipps in einer Fläche, in der „Entfernen“ liegt.
**Empfehlung:** Bei `pointer: coarse` die Kürzel ausblenden und die Texte auf Tippen umstellen: „Antippen öffnet“, „Auswahl aufheben“ als eigener Knopf in der Leiste, „Hilfe unter ⋯“.
**Nachprüfen:** Auf dem iPhone enthält kein sichtbarer Text „Strg“, „Esc“, „Doppelklick“ oder „Rechtsklick“; die Auswahl lässt sich mit einem beschrifteten Knopf aufheben.

### P2-5 · Voreingestellter Anzeigename „Arbeitsplatz“: Sperre und Tagebuch nennen niemanden

**Evidenz:** [beobachtet], [Code]
**Wo:** Startseite „DIESER ARBEITSPLATZ · Arbeitsplatz · Anzeigename“ (Shot 01). Ohne Eintrag setzt der Dienst „Arbeitsplatz“ (`main/einstellungen.ts:58–61`). Folge: Am iPad stand in der Tabelle „Stab FüSt Nacht 🔒 wird von Arbeitsplatz bearbeitet“ (Shot `15-lage-ipad.png`), und das Tagebuch führt als Akteur „Arbeitsplatz“ (Shot 10).
**Reaktion des Helfers:** „Welcher Arbeitsplatz? Wen frag ich?“
**Problem:** Die Sperre ist richtig und läuft nach 30 s ab (`useBearbeitungssperre.ts:18`), aber sie nennt keinen Menschen. Beim Öffnen eines Einsatzes wird nicht nach dem Namen gefragt.
**Auswirkung im Einsatz:** Bei mehreren Tablets und Handys ist nicht nachzuvollziehen, wer was eingetragen oder gesperrt hat. Rückfragen über Funk werden unmöglich.
**Empfehlung:** Vor dem ersten Öffnen eines Einsatzes nach dem Anzeigenamen fragen (Vorschlag: Funkrufname oder „Name, Funktion“), solange er „Arbeitsplatz“ oder leer ist.
**Nachprüfen:** Frisches Gerät, Einsatz öffnen: Es fragt nach dem Namen. Die Sperre zeigt danach „wird von Meier (Meldekopf) bearbeitet“.

### P3-1 · Profil „Vermeldezentrale“ öffnet auf „Lage“, nicht auf „Funkplan“

**Evidenz:** [beobachtet]
**Wo:** iPad Mini, Profil Vermeldezentrale, Einsatz öffnen. Band „Funkplan · Lage · Einsatztagebuch“, aufgeschlagen ist „Lage“ (Lauf `fu-11`). Laut Kommentar in `blaetter.ts` ist das erste Blatt „das der Rolle“.
**Problem und Empfehlung:** Ein Tipp mehr bei jedem Öffnen. Beim Öffnen das erste Blatt des Profils aufschlagen.
**Nachprüfen:** Profil Vermeldezentrale → Öffnen → Funkplan ist aktiv.

### P3-2 · „Erste Schritte“ der Hilfe nennen einen Reiter, den es nicht mehr gibt

**Evidenz:** [beobachtet], [Code]
**Wo:** ⋯ → Hilfe → Erste Schritte: „Kräfte anfordern: Im Reiter „Anforderungen“ …“ (`packages/domaene/src/bedienhilfe.ts:32`). Seit E3 ist das Eingang → Umschalter „Anforderungen“. Ebenso „links mit „Abschnitt anlegen““: Am Handy steht der Knopf oben.
**Empfehlung:** Text an die Reiter nach E3 angleichen.
**Nachprüfen:** Jeder in „Erste Schritte“ genannte Reiter oder Knopf ist unter genau diesem Namen sichtbar.

### P3-3 · Statusknöpfe „Ruhe“, „Rufbereitschaft“, „Einsatzvorbehalt“ wirken wie abgeschaltet

**Evidenz:** [beobachtet]
**Wo:** Tabelle, Standard- und Feldbild (Shots 07, 13): grau, kursiv, ohne Rahmen. Die anderen Status haben einen farbigen Rahmen. „Einsatz“ und „Einsatzbereit“ sind dasselbe Grün und nur am Wort zu unterscheiden.
**Problem:** Bei Sonne halten Helfer graue Knöpfe für gesperrt. Das Wort trägt zwar, aber die Verwechslungsgefahr Einsatz/Einsatzbereit bleibt beim schnellen Blick. [nicht prüfbar: echtes Sonnenlicht]
**Empfehlung:** Alle Statusknöpfe mit gleichem Rahmen. Einsatzbereit von Einsatz zusätzlich durch Form oder Zeichen unterscheiden.

### P3-4 · Scanner meldet gleichzeitig „Noch nichts gescannt.“ und einen Fehler

**Evidenz:** [beobachtet]
**Wo:** Meldekopf → Bogen scannen → falscher Text + Enter (Shot `10-scanner-fehleingabe-ipad.png`).
**Empfehlung:** Nach einem Fehlversuch nur die Fehlermeldung zeigen, mit dem nächsten Schritt („Bogen erneut scannen oder abtippen“).

### P3-5 · Startseite zeigt am Handy den vollen Share-Pfad zweimal

**Evidenz:** [beobachtet]
**Wo:** Einsatzauswahl, iPhone (Shot 01): „Einsätze auf /tmp/…/share“ und noch einmal unter „Dieser Arbeitsplatz“. Das sind je vier Zeilen. Für einen Helfer ist das bedeutungsloser Text.
**Empfehlung:** Am schmalen Bildschirm nur den letzten Ordnernamen zeigen, den vollen Pfad hinter „Ändern“.

---

## Was ausdrücklich gut ist und bleiben soll

- **Statusblatt unten** mit Titel „Status ändern: <Einheit>“, großer Auswahl (48 px) und „Übernehmen“ / „Abbrechen“. Ein Tipp auf den Status schreibt nicht sofort. [beobachtet]
- **Verbindungsabbruch:** Das Band „Keine Verbindung zum Dienst seit 12 s … Eingaben werden nicht gespeichert und sind gesperrt … offene Formulare behalten ihre Eingaben“ haftet oben. Im Blatt steht der Grund unter dem grauen „Übernehmen“, und nach Wiederverbindung ist die Eingabe noch da. [beobachtet]
- **Rückfrage vor Rückgängig** nennt den Schritt und die Wirkung auf alle Arbeitsplätze. [beobachtet]
- **44-px-Ziele bei Touch** global, keine waagerechte Seitenverschiebung, Suche filtert und behält die Abschnittsgliederung. [beobachtet]
- **Nachtbild** blendet nicht, Status bleiben am Wort erkennbar. [beobachtet]
- **Fleetmapping-Hinweis** in „Rufgruppe anlegen“ sagt bei unbekanntem Namen klar: „Nicht im Fleetmapping: wird als eigene Rufgruppe mit diesem Namen angelegt.“ [beobachtet]

## Nicht prüfbar

Echte Handschuhe, Nässe, Sonnenlicht und Kälte. Echtes Safari auf iOS (die Emulation nutzt Chromium). Verhalten beim Wechsel zwischen WLAN und Mobilfunk sowie bei SMB-Latenzen am Share. Kopplung eines Bluetooth-Handscanners mit einem Tablet. Ob Helfergeräte im Einsatz überhaupt Zugang zum Netz der FüSt erhalten.

## Verständnischeck

- Orientierung: **unsicher**. Ort und Einsatz sind klar, aber am Handy fehlt ein Reiter im Blick, und die eigene Einheit muss gesucht werden.
- Nächste Handlung: **verstanden** für den Status, **unsicher** für die Stärke und am Meldekopf ohne Scanner.
- Systemstatus: **unsicher**. Verbindungsausfall ist vorbildlich angezeigt, die Speicherbestätigung am Handy außer Sicht.
- Fehlerbehebung: **unsicher**. Die Rückfrage ist klar, der Knopf aber 24 px und am Seitenende.
- Feldtauglichkeit: **eingeschränkt**. Sie reicht zum Nachschauen und für Statuswechsel am Handy sowie für Meldekopf und Vermeldezentrale am Tablet mit Scanner. Als Werkzeug des Helfers ohne Feldsicht nicht ausreichend.
