# S1-Control — Handbuch

Für die, die damit arbeiten: Zugtrupp, Führungsstelle, Meldekopf. Wer den
Share einrichtet, liest [BETRIEB.md](BETRIEB.md); wer eine Karte neben den
Rechner legen will, druckt [KURZANLEITUNG.md](KURZANLEITUNG.md).

Vier Abschnitte dieses Handbuchs sind **erzeugt** — Tastenkürzel, Ansichten,
Abkürzungen, Störfälle. Sie stammen aus denselben Listen, aus denen die
Anwendung sie zeigt. Wer einen dieser Texte ändern will, ändert ihn im
Quelltext und erneuert diese Datei mit `npm run doku:handbuch`. Ein Test
scheitert, wenn beides auseinanderläuft.

## Was das Programm ist

Eine Ablösung der Excel-Mappe, mit der die Führungsstelle heute die Stärke
führt. Dieselben Zahlen, dieselben Ausdrucke, dieselben Tastenkürzel — aber
mehrere Rechner gleichzeitig, ohne dass jemand eine Datei „für sich“ öffnen
muss.

Drei Sätze beschreiben, wie es innen arbeitet, und sie erklären fast alles,
was im Betrieb überrascht:

**Erfasst werden Ereignisse, nicht Zustände.** Wer eine Einheit auf „im
Einsatz“ setzt, schreibt keinen Wert in eine Zelle, sondern einen Satz: „Diese
Einheit hat zu diesem Zeitpunkt diesen Status bekommen.“ Der Bildschirm zeigt,
was sich aus allen Sätzen ergibt (KONZEPT-EREIGNISSE.md §3.1).

**Jeder Rechner schreibt nur seine eigenen Dateien.** Auf dem Share liegt je
Arbeitsplatz eine Datei; niemand verändert die eines anderen. Deshalb braucht
es keine Sperren und keinen Server (KONZEPT-SPEICHER.md §1.3).

**Alles wird zuerst lokal geschrieben.** Der Share ist die zweite Station.
Fällt er aus, geht nichts verloren — es dauert nur, bis die anderen es sehen.

## Ein Einsatz von Anfang bis Ende

1. **Arbeitsplatz prüfen.** Auf der Einsatzauswahl steht unter der Liste die
   Zeile „Dieser Arbeitsplatz“ mit Anzeigename, Profil und Share; „Ändern“
   klappt die Einstellungen auf. Der Name steht in der Statuszeile der
   anderen; „Zugtrupp“ ist nützlicher als „PC-3“. Das Profil bestimmt, welche
   Reiter oben stehen (siehe „Das Fenster“).
2. **Einsatz anlegen** — einmal, von einem Rechner, mit **„Neuer Einsatz …“**.
   Die Maske fragt Name und Datum (TT.MM.JJJJ) und gleich die Stammdaten wie
   das Blatt „Stammdaten“ der Excel: Name der Führungsstelle (FüSt),
   übergeordnete Führungsstelle, Einsatzort, Beginn, Einsatzart und
   Schichtmodell. Name und Datum ergeben den Ordner; danach ist der Einsatz
   unveränderlich verankert (§5.6). FüSt und übergeordnete Führungsstelle
   stehen auf jedem Ausdruck; geändert werden sie später im Blatt
   **Führungsstelle** über „Stammdaten bearbeiten“. Jede Änderung ist ein
   Ereignis und steht im Einsatztagebuch.
3. **Alle anderen öffnen ihn** aus der Liste. Ab jetzt sehen sich alle in der
   Statuszeile.
4. **Abschnitte anlegen.** Die Führungsorganisation zuerst, damit Einheiten
   hineingehören können. Unterabschnitte gehen beliebig tief.
5. **Einheiten erfassen** — von Hand („Ohne Vorlage“), aus einer Vorlage
   (THW StAN, Feuerwehr, KatS-StAN Nds), per Handscanner vom Erfassungsbogen,
   aus einer PDF der Erfassungsbogen-App (in der Maske „Erfassungsbogen
   einlesen“ über „PDF wählen …“ oder durch Hineinziehen; eine Sammel-PDF
   zeigt ihre Bögen nacheinander, „Alle übernehmen (n)“ legt den angezeigten
   und alle wartenden Bögen in einem Schritt in den gewählten Abschnitt,
   ein Balken zeigt dabei, beim wievielten Bogen der Import steht, und
   „Abbrechen“ hält nach dem laufenden Bogen an, die übrigen warten weiter;
   ist eine Einheit schon erfasst, wird sie nur aktualisiert und bleibt in
   ihrem Abschnitt, die Maske warnt dann und nennt ihn; eine früher
   gelöschte Einheit holt der Import zurück, in den gewählten Abschnitt;
   abgewiesene Bögen stehen danach mit Grund unter der Maske) oder über den Eingangskorb aus einer
   Bündeldatei. Eine zweite Teileinheit
   gleicher Bauart entsteht mit „Kopieren“ (Strg+K) aus der markierten Zeile.
6. **Status führen.** Das ist die eigentliche Arbeit der Schicht: Wer ist wo,
   seit wann, wie lange noch. Daneben führt die Fernmeldezentrale im Blatt
   **Funkplan**, über welche Rufgruppe jede Einheit gerufen wird und wann sie
   sich zuletzt gemeldet hat; wer länger schweigt als die Schwelle, wird
   Bernstein, und dann ist eine Funkprobe fällig.
7. **Anforderungen führen.** Was fehlt, was zugesagt ist, was eingetroffen ist.
   Eine Ablösung wird an der Einheit angefordert („Ablösung anfordern“) oder im
   Blatt **Eingang** unter „Anforderungen“ mit „Anforderung anlegen“ (Strg+N)
   und „Ablösung für“. Zusagen und Eintreffen stehen in der Leiste der
   gewählten Anforderung. Beim Eintreffen entsteht die neue Einheit aus der
   Anforderung, und die abgelöste Zeile nennt sie unter „Ablösung durch“.
8. **Ausgaben erzeugen**, wenn die Führung sie braucht: Druck, Status-Matrix,
   Einheitenliste, Auswertung, Log, Kosten. Die Einheitenliste vor jeder
   Lagebesprechung ausdrucken — sie ist der Stand, mit dem bei einem
   Rechnerausfall auf Papier weitergearbeitet wird.
9. **Zum Schichtwechsel:** Nichts. Die Ablösung setzt sich an denselben
   Rechner oder öffnet den Einsatz an einem anderen.
10. **Nach dem Einsatz:** Im Blatt **Ausgaben** unter „Einsatz abschließen“
    den Einsatz beenden (Zeitpunkt und Bemerkung), die letzten Ausdrucke
    machen und „Einsatzakte erzeugen“ — das ZIP liegt im Ordner des Einsatzes
    auf dem Share, der Pfad steht daneben, „Ordner zeigen“ führt hin. Die Akte
    sichern und erst dann „Archivieren“: Danach kann an diesem Einsatz
    nichts mehr geschrieben werden, an keinem Arbeitsplatz. Ein beendeter
    Einsatz lässt sich dagegen jederzeit wiedereröffnen. Dieselbe Akte
    erzeugt `s1 akte exportiere`; wie man sie prüft und ablegt, steht in
    [BETRIEB.md](BETRIEB.md).

## Die Einsatzauswahl

Ohne geöffneten Einsatz zeigt das Fenster die **Einsatzauswahl**. Oben steht
die Karte „Einsätze auf <Share>“: je Einsatz eine Zeile mit Name und Datum,
Status als Marke, Zahl der Einheiten und Stand (letzte Änderung), rechts
„Öffnen“. Der zuletzt genutzte steht oben, sein „Öffnen“ ist gefüllt.
Beendete und archivierte Einsätze stehen blass darunter mit „Ansehen“: Sie
lassen sich lesen, aber nicht mehr ändern. Status und Einheiten nennt die
Liste so, wie dieser Arbeitsplatz den Einsatz zuletzt gesehen hat; wo er ihn
noch nie geöffnet hat, steht ein Strich.

Im Kopf der Karte öffnet **„Neuer Einsatz …“** die Maske mit Name, Datum und
Stammdaten (siehe „Ein Einsatz von Anfang bis Ende“). „Einsatz anlegen“ geht
erst, wenn Name, Datum und Führungsstelle dastehen; was fehlt, steht neben
dem Knopf. Gibt es den Namen am selben Tag schon, bleibt die Maske mit allen
Eingaben offen und nennt den Grund.

Daneben legt **„Demo-Einsatz“** mit einem Klick einen Übungseinsatz mit
Beispieldaten an und öffnet ihn; das dauert etwa eine Viertelminute. Beginn
vor zwölf Stunden, mit Abschnitten, Funkplan, Nachrichten, Versorgung und
Tagebuch. Die Einheiten sind ein THW-Einsatz mit Kräften anderer
Organisationen und haben sich mit Übungs-Erfassungsbögen angemeldet. Er ist zum Zeigen
und Ausprobieren gedacht und lässt sich bearbeiten wie jeder Einsatz; ein
zweiter am selben Tag bekommt eine laufende Nummer.

Darunter steht in einer Zeile **„Dieser Arbeitsplatz“**: Anzeigename, Profil
(im Meldekopf die Betriebsart) und Share, rechts „Ändern“. „Ändern“ klappt die
Einstellungen auf — Share-Pfad, Anzeigename, Betriebsart, Profil und
„Übernehmen“ —, unter jedem Feld ein Satz, was es bewirkt; dazu Ton bei
Blitz-Nachricht sowie Blatt und Automatikdruck des Nachrichtenvordrucks
(siehe „Nachrichten“). Ohne Share-Pfad
oder ohne Anzeigenamen sind die Einstellungen von Anfang an offen. In der
Web-Schale gibt der Dienst den Share vor; dort steht er nur zum Lesen.

Ohne Einsatz trägt das Kopfband nur Wortbild, Zeit und das Fenstermenü; eine
Ist-Stärke gibt es noch nicht, und ob der Share erreichbar ist, sagt die
Zustandsmarke erst mit geöffnetem Einsatz.

## Das Fenster

Oben steht das **Kopfband** in zwei Zeilen. Die erste nennt den Einsatz und
darunter die Führungsstelle, dann Ist-Stärke und Zeit, rechts die
**Zustandsmarke** und das **Fenstermenü „⋯“**. Die Zustandsmarke sagt in einem
Wort, ob dem Bild zu trauen ist: „✓ aktuell“, „⚠ Share nicht erreichbar“ oder
„✖ Verbindung unterbrochen“; wer mit der Maus darauf zeigt, liest Stand, Share
und Arbeitsplätze. Ein beendeter oder archivierter Einsatz steht neben der
Führungsstelle als „BEENDET — Eingaben gesperrt“ oder „ARCHIVIERT — nur
lesen“. Die zweite Zeile trägt die Reiter und rechts **„Mehr ▾“**.

Welche Reiter im Band stehen, bestimmt das **Profil** dieses Arbeitsplatzes.
Es wird auf der Einsatzauswahl neben der Betriebsart gewählt und gilt für
dieses Gerät, nicht für den Einsatz:

| Profil | Reiter im Band | unter „Mehr“ |
|---|---|---|
| Führungsstelle (S1), Vorgabe | S1 · Nachrichten · Funkplan · S4 · Exporte | Übersicht, Eingangskorb, Führungsstelle, Kosten, Einsatztagebuch |
| Leitung / Stab | Übersicht · Nachrichten · S1 · Eingangskorb · Einsatztagebuch · Exporte | Führungsstelle, Funkplan, S4, Kosten |
| Fernmeldezentrale | Nachrichten · Funkplan · S1 · Einsatztagebuch | Übersicht, Eingangskorb, Führungsstelle, S4, Kosten, Exporte |
| Versorgung (S4) | S4 · S1 · Exporte | Übersicht, Eingangskorb, Nachrichten, Führungsstelle, Funkplan, Kosten, Einsatztagebuch |
| Alle Blätter | alle zehn Blätter | — |

Das Blatt **Übersicht** fasst zusammen, was sonst auf mehreren Blättern
steht. Oben „Kräfte nach Status“: je Abschnitt die Köpfe im Einsatz,
einsatzbereit, in Ruhe, nicht einsatzbereit und sonstige (vor Ort, anderer oder kein Status), dieselbe Einteilung wie die Monitoransicht „Status“. Jede Zeile
zählt ihre Unterabschnitte mit, wie der Abschnittsbaum, und die Gesamtzeile
ist dieselbe Zahl wie die Ist-Stärke im Kopfband. Was angefordert oder im
Anmarsch ist, steht in der Spalte „erwartet“ und nicht in der Summe.
Darunter „Aufträge“: die offenen Aufträge aller Einheiten mit Einheit,
Abschnitt und Beginn, die ältesten oben; „Erledigte zeigen“ nimmt die
beendeten dazu. Ganz unten „Einsatzzeiten und Ablösung“: je Einheit vor Ort
Eintreffzeit, Dauer im Einsatz, „verfügbar bis“ mit der Marke „läuft ab“ oder
„abgelaufen“ und der Stand der Ablösung mit wer und wann; wer zuerst gehen
muss, steht oben. Darunter „Es kommen“: was angefordert, zugesagt oder im
Anmarsch ist. Bearbeitet wird weiter im Blatt S1.

Das Profil ist ein Zuschnitt der Oberfläche, kein Recht: Jedes Blatt bleibt
unter „Mehr“ erreichbar. Wer dort ein Blatt aufschlägt, sieht es, solange es
offen ist, als letzten Reiter im Band; im Menü trägt es ein Häkchen. Die
Zahl offener Meldungen steht am Reiter Eingang und ebenso im Menü. Der
Meldekopf hat seinen eigenen Zuschnitt ohne Reiter; dort ist das Profil
gesperrt.

Zwei Blätter tragen oben einen **Umschalter**: **Eingang** zwischen
„Eingangskorb“ (mit der Zahl der offenen Meldungen) und „Anforderungen“,
**Führungsstelle** zwischen „Stammdaten und Schichtplan“ und
„Führungsorganisation“. Der Umschalter merkt sich die Wahl, solange das
Fenster offen ist, und nach einem Neuladen im Browser. Die Kürzel eines
Unterblatts (etwa Strg+N) gelten nur, solange es zu sehen ist.

Im Fenstermenü steht, was zum Fenster gehört und selten gebraucht wird: Hilfe
und Tastenkarte (Strg+H), das Erscheinungsbild (Standard, Dunkel, Feld,
Nacht), „Stärke-Monitor öffnen …“, „Stelle und Handzeichen …“, die Diagnose, in der Web-Schale
„Abmelden“ und „Einsatz schließen“, der Weg zurück zur Liste der Einsätze.

Unter dem Kopfband steht beim ersten Aufschlagen eines Blatts eine
**Einstiegszeile**: in einem Satz, was das Blatt ist, und „Verstanden“. Bei
Eingang und Führungsstelle hat jede Seite des Umschalters ihre eigene Zeile.
Danach bleibt sie an diesem Gerät weg; derselbe Text steht in der Hilfe
(Strg+H). Ein Browser ohne Speicher (privates Fenster) zeigt sie bei jedem
Öffnen wieder.

Alle Menüs des Fensters gehen gleich: ein Klick öffnet, die Pfeiltasten
wandern, Enter wählt, Esc oder ein Klick daneben schließt. Was gerade nicht
geht, steht grau da und nennt im Tooltip den Grund.

## Das Blatt Lage

Links der **Abschnittsbaum**, rechts die **Einheiten**. Jede Karte hat einen
Hauptknopf; was einer gewählten Zeile gilt, erscheint erst mit der Wahl.

Der Baum trägt oben „Abschnitt anlegen“ (Strg+N, solange der Fokus im Baum steht; sonst legt Strg+N eine Einheit an) und darunter einmal die
Spaltenköpfe „Einh. · Fü/UFü/He“. Die Zeile **„Alle Bereiche“** nennt
Einheiten und Ist-Stärke des Einsatzes und hebt die Wahl eines Abschnitts
auf, ebenso Esc. Die gewählte Zeile trägt rechts **„⋯“** mit Umbenennen, Typ
ändern, Zeichen, Umhängen, Nach oben, Nach unten und Auflösen; dasselbe Menü
öffnet ein Rechtsklick auf jede Zeile. Gibt es aufgelöste Abschnitte, steht
am Fuß der Karte „Aufgelöste zeigen (n)“.

Die Einheitenkarte trägt im Kopf den Hauptknopf **„Einheit anlegen ▾“**
(Aus Vorlage … Strg+N, Ohne Vorlage, Erfassungsbogen einlesen … Strg+Q), die
Suche (Strg+F) und **„Spalten ▾“**: die sechs Spaltengruppen (Grunddaten
immer), „Gliederung nach Bereich“, „Leere Bereiche ausblenden“,
„Stillgelegte zeigen“ und „Spalten zurücksetzen“. Darunter steht nur die
**Filterzeile**: die Status mit ihrer Zahl, ein Klick filtert; rechts klein,
was „Spalten“ gerade eingestellt hat.

Stehen in der Tabelle Einheiten wie „#3 Bückeburg“, Herkunft „#1 Bückeburg
(OBKB)“ oder Fahrzeuge „#2“, wurden sie mit einer älteren Fassung aus einem
Erfassungsbogen übernommen: Die Zahlen sind die Codes des Bogens für
Einheitstyp, Ebene und Fahrzeugtyp. Über der Tabelle steht dann „n Einheiten
aus Erfassungsbögen zeigen Codes …“ mit dem Knopf **„Namen eintragen“**. Er
setzt die Namen aus dem gespeicherten Bogen ein („Zugtrupp Technischer Zug
Bückeburg“, „Ortsverband“, „FüKW“), mit dem Grund „Vokabularkorrektur EEB …“
im Tagebuch. Was jemand inzwischen von Hand geändert hat, bleibt stehen. Im
beendeten Einsatz erscheint der Hinweis nicht.

Ist im Baum kein Abschnitt gewählt, steht die Tabelle **nach Bereich
gegliedert** wie die Stärketabelle auf Papier, mit Zwischensumme je Bereich;
ist einer gewählt, flach. Beides lässt sich unter „Spalten“ umschalten, und
die Wahl bleibt je Fall bis zum Schließen. Die Spalte Abschnitt steht nur in
der flachen Liste aller Einheiten — sonst sagt es der Baum oder die
Kopfzeile.

Ein Klick wählt eine Zeile, Strg+Klick nimmt weitere dazu. Dann erscheint am
Fuß der Karte die **Auswahlleiste**: „1 gewählt · <Name>“ und die Schritte
Verschieben (Strg+M), Aufteilen, Zusammenführen, Kopieren (Strg+K), Ablösung
anfordern, Funk …, Erfassungsbögen und Entfernen (Strg+E). Bei zwei gewählten
Zeilen bleiben Verschieben, Zusammenführen und Erfassungsbögen; Zusammenführen steht bei einer Zeile grau mit
„Zwei Einheiten wählen“. Esc hebt die Auswahl auf. Ein **Rechtsklick** auf
eine Zeile wählt sie und öffnet dieselben Schritte als **Kontextmenü**, dazu
„Im Tagebuch zeigen“: Das Tagebuch geht auf, auf diese Einheit beschränkt.
Auf dem Handy liegt das Kontextmenü am unteren Rand, und die Auswahlleiste
bricht um. Im beendeten Einsatz nennt die Leiste die Sperre statt der
Schritte; nur „Erfassungsbögen“ bleibt.

**Erfassungsbögen speichern.** Beliebig viele Zeilen markieren, dann
„Erfassungsbögen“ in der Leiste oder im Kontextmenü: Die Maske nennt die
Zahl, „Speichern“ schreibt die Bögen als eine Bündeldatei
(`erfassungsboegen_<Datum>_<Zeit>.json`) nach `ausgaben\`, je Einheit die
jüngste Fassung. Danach stehen Öffnen und Ordner zeigen da, im Browser
Herunterladen. Die Erfassungsbogen-App öffnet die Datei und druckt daraus die
PDFs; eine andere Führungsstelle liest sie mit „Bündel einlesen …“. Von Hand
angelegte Einheiten haben keinen Bogen — die Maske nennt sie, statt einen zu
erfinden.

Unter der Tabelle steht, wie man eine Zelle bearbeitet (Doppelklick, Enter,
Esc), bis an diesem Gerät die erste Zelle geschrieben ist.

## Funkplan, Eingang und Anforderungen

Die Fachblätter folgen demselben Muster wie die Lage: ein Hauptknopf, „⋯“
für das Seltene, und was einer Zeile gilt, erscheint erst mit ihrer Wahl —
als **Auswahlleiste** am Fuß der Karte und als **Kontextmenü** per
Rechtsklick. Esc hebt die Wahl auf.

**Funkplan.** Das Band mit den sechs Zahlen bleibt. Darunter der Umschalter
„Je Rufgruppe | Je Bereich | Funkproben“, der Hauptknopf „Rufgruppe anlegen“
(Strg+N), die Suche (Strg+F) und rechts **„⋯“** mit der Schwelle „kein
Kontakt“ (Häkchen am geltenden Wert; gilt für alle Arbeitsplätze) und dem
Funkplan als PDF oder HTML. Ein Klick auf eine Einheit der Zuordnung wählt
sie; die Leiste darunter bietet „Funkprobe: Kontakt“ (Strg+P, gefüllt),
„kein Kontakt …“ (fragt den Grund), „Funk und Erreichbarkeit …“ und
„Rufgruppe ändern …“, das die Zelle Rufgruppe der Zeile zur Wahl öffnet.
Links trägt die gewählte Rufgruppe „⋯“ an ihrer Zeile mit „Bearbeiten …“
(Strg+E) und „Auflösen …“, bei einer aufgelösten „Wiederherstellen“;
dasselbe öffnet ein Rechtsklick auf jede Gruppe.

**Eingangskorb.** Im Kopf der Hauptknopf **„Bündel einlesen …“**: Die Maske
fragt den Abschnitt und die Datei („Datei wählen …“, der Name steht
daneben); „Einlesen“ geht erst mit beidem, das Ergebnis steht danach über
dem Korb („3 aufgenommen, 2 schon bekannt“). Im „⋯“ daneben steht
„Meldungen als Datei speichern“ für den Weg ohne Netz. Darunter die
Filterzeile: Neu, Geändert, Übernommen, Abgelehnt mit ihrer Zahl, dazu
„Nur jüngste Fassung“. Für die gewählte Meldung bietet die Leiste „Ablehnen
mit Grund …“ (bei einer abgelehnten „Ablehnung zurück“), „Übernahme zurück“,
„Fassungen …“ und den Meldestatus. Übernommen wird eine Meldung nicht hier,
sondern beim Einlesen des Bogens in der Lage (Strg+Q) oder mit dem Bündel.

**Anforderungen.** Im Kopf **„Anforderung anlegen“** (Strg+N); die Felder
stehen in der Maske und nicht mehr über der Liste. Eine halb ausgefüllte
Anforderung bleibt beim Schließen stehen, bis sie angelegt oder verworfen
ist. Darunter die Filterzeile mit Offen, Zugesagt, Eingetroffen, Storniert.
Die gewählte Anforderung bietet in der Leiste nur, was ihren Zustand ändert:
offen „Zusagen …“, zugesagt „Eingetroffen …“ und „Zusage zurück“,
eingetroffen „Einheit anlegen …“ (wenn noch keine verknüpft ist) und
„Eintreffen zurück“, storniert „Storno zurück“; „Stornieren …“ steht
abgesetzt in Warnfarbe und fragt den Grund.

## Nachrichten

Das Blatt **Nachrichten** führt den Nachrichtenvordruck (4-fach-Vordruck)
zwischen den Stellen der Führungsstelle. Jede Nachricht hat die drei Teile
des Papiervordrucks: oben die Vermerke der Fernmeldezentrale, in der Mitte
die Nachricht, unten den Laufzettel des Sichters mit Quittung, Verteiler
und Vermerken. Papier bleibt die Rückfallebene; was auf Papier weiterläuft,
lässt sich später so nacherfassen, wie es auf dem Blatt steht.

**Stelle und Handzeichen.** Nach dem Öffnen eines Einsatzes fragt das
Programm, welche Position dieser Arbeitsplatz im Stab hat (Leiter, S1 bis S6,
Fachberater, Verbindungsstelle, Sichter, LdF, Fm1, Fm2, Fm3, auch mehrere zugleich oder ein
freier Name wie „Polizei“), und das Handzeichen mit zwei bis vier Zeichen.
Die Wahl gilt, bis der Einsatz geschlossen wird, die anderen Arbeitsplätze
sehen sie als besetzte Stelle, und beim nächsten Öffnen desselben Einsatzes
ist sie vorbelegt. Ändern lässt sie sich im Fenstermenü unter „Stelle und
Handzeichen …“. Die Stelle ist ein Zuschnitt, kein Recht: Sie bestimmt,
welcher Posteingang zuerst erscheint. Im Meldekopf fragt das Programm nicht.

**Das Blatt.** Oben stehen fünf Zahlen: neu für meine Stellen, vor der FmZ,
vor dem Sichter, mit Vorrang offen und länger als die Schwelle in der FmZ;
die letzten beiden werden ab eins bernsteinfarben. Mit LdF als Station kommt
eine sechste dazu, „vor dem LdF“, aufgeteilt in Zuteilung und Weitergabe.
Arbeitet ein anderer Arbeitsplatz mit einer anderen Programmfassung, steht
darüber eine Warnung: Der Nachrichtenweg kann dort anders stehen, bitte alle
Arbeitsplätze aktualisieren. Darunter der Umschalter
„Posteingang | Offen | Ausgang | Sichter | Fernmeldezentrale | Nachweisung“
(mit LdF als Station auch „LdF“), der Hauptknopf „Nachricht verfassen“
(Strg+N) und die Suche über Betreff, Inhalt, Absender und Anschrift
(Strg+F). In der Sicht „Fernmeldezentrale“ gehört Strg+N der Aufnahme: Dort
öffnet es „Eingang aufnehmen“, und dessen Knopf trägt das Kürzel; „Nachricht
verfassen“ nennt es dort nicht. Jede Zeile trägt links die Farbe ihrer Kopie: grün für den
Hauptempfänger, blau für Mitleser, rot für S2. Blitz steht rot, Sofort
bernsteinfarben, und Blitz steht vor Sofort vor einfach. Der Posteingang
zeigt die Nachrichten, in deren Verteiler eine eigene Stelle steht, mit den
Marken „neu“ oder „gelesen“ und „erledigt“; die Chips filtern danach und
nennen die Zahl je Zustand, und
„Posteingang von“ schlägt den Posteingang einer anderen Stelle auf. Der
Ausgang zeigt, was dieser Arbeitsplatz oder eine Stelle dieser Sitzung
verfasst hat, mit dem Stand auf dem Weg; maßgeblich ist die Stelle im Feld
„Funktion“ der Nachricht, nicht der Text im Absender. Wer beim Schichtwechsel
die Stelle S4 übernimmt, sieht damit auch den Ausgang des Vorgängers. Der
Stand steht in Worten da, mit dem, was die FmZ getan hat: „angenommen (Fm)
1710 Fm · Quittung der Gegenstelle 1720 Ha (Telefon)“, bei einer Nachricht,
die die FmZ noch nicht befördert hat, „… · noch nicht übermittelt“. Die
Annahme ist die der eigenen FmZ, nicht die des Empfängers; erst die
Quittung der Gegenstelle sagt, dass die Nachricht angekommen ist. Dieselben
Worte stehen in der aufgeschlagenen Nachricht und in der Vorschau; auf dem
gedruckten Vordruck steht die Zeile am Fuß, weil das Feld „Ausgang“ der
Vorlage keine eigene Beschriftung hat und ohne Beförderung die Annahme zeigt.

**Offen — die Sicht für die Übergabe.** Die Sicht „Offen“ (der Chip „offen“
im Posteingang schaltet sie ein) zeigt, was für die eigenen Stellen noch zu
tun ist: die Kopien für die eigenen Stellen, die noch nicht erledigt sind,
die eigenen Ausgänge vor der Beförderung und, wer eine Station hat, deren
Warteschlange. Wer abgelöst wird, geht sie mit dem Nachfolger durch; der
Nachfolger braucht dafür das Tagebuch nicht. Die Einstiegszeile des Blatts
sagt das auch.

**Eine Nachricht verfassen.** Die Maske ist der Vordruck. Absender, Zeichen
und Funktion kommen aus Stelle und Handzeichen, die Abfassungszeit steht als
Datum-Zeit-Gruppe auf „jetzt“ („161045nov26“; Strg+D setzt sie neu, „1045“
geht auch). Die Anschrift bietet Abschnitte, Einheiten und die besetzten
Stellen an und nimmt jeden anderen Namen. Der Inhalt zählt seine Zeilen
gegen die zwölf des Vordrucks; ab der dreizehnten sagt die Maske, dass der
Ausdruck ein Folgeblatt bekommt, gekürzt wird nichts. „Aufgeben“ geht, sobald
Anschrift, Betreff oder Inhalt und eine lesbare Abfassungszeit da sind. Bis
dahin ist die Nachricht nur in diesem Fenster; wer die Seite verlässt, wird
gefragt.

**Lesen, erledigen, antworten.** Ein Klick wählt eine Nachricht, die Leiste
darunter bietet „Lesen“ (auch Doppelklick), „Erledigt“ oder „Erledigung
zurück“, „Antworten“, „Weiterleiten“, „Im Tagebuch zeigen“ und abgesetzt
„Zurückziehen …“; dasselbe öffnet ein Rechtsklick. „Lesen“ schlägt den
Vordruck mit Laufzettel auf und vermerkt für jede eigene Stelle im Verteiler
die Kenntnisnahme mit Zeit und Handzeichen; alle Arbeitsplätze sehen sie.
Gelesen und erledigt gelten je Stelle, nicht je Person. „Antworten“ öffnet
die Maske mit getauschter Anschrift und Absender und dem Betreff „Antwort:
…“, „Weiterleiten“ mit demselben Inhalt. Eine falsch aufgegebene Nachricht
wird mit Grund zurückgezogen; sie bleibt sichtbar und steht im Tagebuch.

**Sichten.** Die Sicht „Sichter“ zeigt die Eingänge, die noch niemand
gesichtet hat, die mit Vorrang oben. Mit der Wahl erscheint darunter der
Laufzettel: Quittung mit Uhrzeit und Handzeichen, die Stellen des Verteilers
als Kästchen mit Kopiefarbe je Eintrag, weitere Stellen mit freiem Namen und
die Vermerke. S2 ist mit der roten Kopie vorbelegt, lässt sich aber
abwählen. „Sichten“ verteilt die Nachricht in die Posteingänge. Solange ein
Laufzettel offen ist, sehen andere Sichter „wird von … bearbeitet“; hat
inzwischen ein anderer gesichtet, nimmt das Programm die zweite Sichtung
nicht still an, sondern meldet es.

**Vorrang.** Trifft eine gesichtete Nachricht mit Sofort oder Blitz für eine
eigene Stelle ein, steht ein Hinweis in der Leiste („Blitz-Nachricht E 26
für S4: …“); bei Blitz spielt das Programm zwei kurze Töne. Der Ton lässt
sich unter „Dieser Arbeitsplatz“ auf der Einsatzauswahl abschalten.

**Fernmeldezentrale.** Die Fernmeldezentrale besetzen der LdF und die
Fernmelder Fm1 bis Fm3; die frühere Sammelstelle „FmZ“ gibt es nicht mehr
zur Wahl (ein älterer Arbeitsplatz, der sie noch führt, gilt als Fernmelder
ohne Nummer). Wer einen der Fernmelder Fm1 bis Fm3 hat, landet in der Sicht
„Fernmeldezentrale“. Links steht die Ausgangswarteschlange: alles, was
aufgegeben und noch nicht befördert ist, Vorrang oben. Jede Zeile hat drei
Knöpfe. „Annehmen“ setzt den Annahmevermerk, „Befördern“ den
Beförderungsvermerk mit Mittel und Gegenstelle (vorbelegt aus dem
Übermittlungswunsch und der Anschrift), „Nachweisen“ trägt die Nachricht in
die Nachweisung ein. Uhrzeit und Handzeichen sind mit „jetzt“ und dem eigenen
Handzeichen vorbelegt und lassen sich ändern, damit ein Papiervordruck mit
den Zeiten nacherfasst werden kann, die auf ihm stehen. Beim Befördern ist
die **Quittung der Gegenstelle** die Ausnahme: Das Feld ist leer und Pflicht,
„Befördern“ geht erst, wenn die Uhrzeit eingetragen ist, zu der die
Gegenstelle den Empfang quittiert hat. Die Zeit des Öffnens der Maske wäre
nur die eigene Zeit und würde vom Absender als Bestätigung gelesen; Strg+D
setzt „jetzt“, wenn die Gegenstelle gerade quittiert hat. Der obere Teil des
Vordrucks (Felder 1 bis 6) ist den Fernmeldern vorbehalten: Wer ohne die Stelle
FmZ annimmt, befördert oder nachweist (beim Vorschlag und bei der Weitergabe
an den Sichter ohne die Stelle LdF), sieht „Dieser Teil ist der
Fernmeldezentrale vorbehalten … Trotzdem eintragen?“; „Trotzdem“ gibt den
Schritt frei, und das Tagebuch vermerkt „Eintrag durch <Stelle>, nicht FmZ“.
Dasselbe gilt für „Eingang aufnehmen“ und für einen Papier-Nachtrag mit
Annahme, Beförderung oder Nummer ohne die Stelle FmZ, und für „Sichten“ ohne
die Stelle Sichter („Das Sichten ist dem Sichter vorbehalten (Vordruck,
Felder 18 bis 20). Dieser Arbeitsplatz ist nicht als Sichter eingetragen …“,
im Tagebuch „Eintrag durch Fachberater, nicht Sichter“). Der Satz nennt je
Schritt die Stelle, der er vorbehalten ist — der Fernmeldezentrale beim
Aufnehmen, Annehmen, Befördern und Nachweisen, dem Leiter des
Fernmeldebetriebes beim Vorschlag und bei der Weitergabe — und dass
„Trotzdem“ den Schritt mit Grund im Tagebuch einträgt; der
Arbeitsplatz prüft das auch selbst und schreibt ohne „Trotzdem“ nichts.
Ausgenommen sind die Ersatzregeln unten: Ist kein Sichter besetzt, sichten
FmZ und LdF ohne Rückfrage.
Das ist ein Hinweis, keine Sperre. Liegt eine
Nachricht länger als die Schwelle unbefördert in der FmZ — gerechnet ab dem
Eintreffen, nicht erst ab der Annahme —, wird ihre Zeile bernsteinfarben und
nennt die Minuten seit dem Eintreffen; nach der Beförderung
verlässt sie die Warteschlange, der Verfasser sieht im Ausgang Zeit und
Handzeichen, und die Kopien gehen an S2 und die Verfasserstelle (siehe
unten). Rechts steht der Hauptknopf „Eingang aufnehmen“ (Strg+N in dieser Sicht): Er öffnet den
Vordruck als Eingang mit freigeschaltetem oberem Teil (Mittel, Zeit und
Handzeichen der Aufnahme, Gegenstelle, Nummer). Die Anschrift ist mit dem
Namen der eigenen Führungsstelle aus den Stammdaten vorbelegt, der Absender
bleibt frei. „Aufnehmen“ legt die Nachricht an und trägt sie, wenn eine
Nummer eingetragen ist, im selben Zug in die Nachweisung ein; danach läuft
sie zum Sichter. Ohne Nummer sagt das Aufnehmen „Eingang ohne
Nachweisungsnummer“, und der Eingang steht in der Karte „Ohne Nummer“, bis
er nachgewiesen ist; die Karte führt Eingänge und beförderte Ausgänge.

**Kontakt im Funkplan.** Läuft eine Nachricht per Funk mit einer Einheit
der Lage, ist sie ein Kontakt: beim Befördern eines Ausgangs zur Quittung
der Gegenstelle, beim Aufnehmen eines Eingangs zur Uhrzeit der Aufnahme.
Beide Masken zeigen dann „Kontakt mit „…“ im Funkplan vermerken“ (gesetzt)
und daneben die Rufgruppe, vorbelegt mit der Rufgruppe, der die Einheit im
Funkplan zugeordnet ist. Wurde auf einer anderen Gruppe gesprochen, wird sie
hier gewählt; die Einheit bleibt trotzdem auf ihrer bisherigen Gruppe. Die
Einheit erkennt die Maske am Namen oder am Funkrufnamen der Gegenstelle, beim
Eingang auch am Absender. Hat die Einheit noch keine Rufgruppe (oder nur eine
aufgelöste), sagt die Maske „„FGr N Oldenburg“ hat noch keine Rufgruppe und
wird „THW_OL_EA2“ zugeordnet.“, und nach dem Schreiben steht sie im Funkplan
unter dieser Gruppe. Der Funkplan zeigt danach den letzten Kontakt;
„Rückgängig“ nimmt Kontakt und Zuordnung mit dem Befördern oder Aufnehmen
zurück; der aufgenommene Eingang selbst bleibt.

**Ist die FmZ besetzt?** Wer einen Ausgang aufgibt, während kein
Arbeitsplatz einen der Fernmelder Fm1 bis Fm3 führt (mit LdF als Station: auch kein LdF), liest
nach dem Aufgeben „Fernmeldezentrale nicht besetzt: Die Nachricht wartet.
Selbst befördern über die Sicht Fernmeldezentrale.“ Dann ruft man die FmZ
an oder befördert selbst (mit „Trotzdem“). Eine Gesprächsnotiz „An den
Sichter“ ohne Sichter sagt entsprechend „Sichter nicht besetzt: Die
Gesprächsnotiz wartet.“

**Hinweise in der Leiste.** Meldungen des Programms stehen im Hinweiskasten
oben rechts über dem Blatt; er überlagert es und schiebt es nicht nach unten,
damit niemand die nächste Zeile trifft, wenn er gerade auf eine zielt. Jede
Zeile trägt Uhrzeit und ein eigenes „×“, mit dem man genau diesen Hinweis
schließt; „Löschen“ räumt alle auf einmal. Auskünfte verlöschen nach
20 Sekunden von selbst, Warnungen und Fehler bleiben, bis jemand sie
schließt. Der Hinweis zum Stellenvorbehalt („Trotzdem“, siehe oben) ist keine
Zeile des Kastens, sondern steht in der Maske, in der man gerade arbeitet.

**Nachweisung.** Die Sicht „Nachweisung“ zeigt alle Nachrichten nach Nummer,
Eingang und Ausgang mit einem gemeinsamen Zähler, die ohne Nummer zuletzt,
mit den Zeiten von Aufnahme, Annahme und Beförderung. Die Nummer ist mit
„höchste bekannte plus eins“ vorbelegt und darf höher eingetragen werden.
Ist sie schon vergeben, warnt die Maske vor dem Schreiben, hält aber nicht
auf: Haben zwei Arbeitsplätze ohne Verbindung dieselbe Nummer vergeben,
stehen beide Zeilen mit der Marke „doppelt“ da und werden mit „Berichtigen“
neu nummeriert. Nachrichten ohne Nummer bekommen sie hier mit „Nachweisen“;
ohne besetzte FmZ bleibt die Nummer leer, bis die FmZ nachweist. Fehlende
Nummern zwischen 1 und der höchsten stehen als Lücke am Fuß. „Nachweisung
ausgeben“ legt die Liste als PDF oder HTML mit
Zeitstempel im Ordner „ausgaben“ des Einsatzes ab, nach Nummer und mit
denselben Spalten wie am Bildschirm (Vorrang, E/A, Nr., Absender, Anschrift,
Mittel, Gegenstelle, Aufnahme, Annahme, Beförderung, Sichtung, Abfassung,
Betreff, Marke). Aufnahme und Abfassung stehen als Datum-Zeit-Gruppe mit
Tag, Annahme, Beförderung und Sichtung als Uhrzeit mit Handzeichen; die
Weitergabe des LdF und „wartet beim LdF“ stehen als Marke.

**Vom Papier nachtragen.** Der Schalter „Vom Papier nachtragen“ in den
Masken „Nachricht verfassen“ und „Eingang aufnehmen“ trägt Zeiten,
Handzeichen und Nummer so ein, wie sie auf dem Blatt stehen. Das Tagebuch
nennt jede Zeile dazu „vom Papier nachgetragen durch <Stelle>“ mit der
Stelle des Arbeitsplatzes, der nachgetragen hat; Annahme, Beförderung und
Nummer ohne die Stelle FmZ brauchen „Trotzdem“. Geschrieben wird, was auf
dem Blatt steht; passt die Zeitfolge nicht, sagt eine Warnung es sofort, die
im Hinweiskasten stehen bleibt: Die Annahme liegt vor der Abfassung, die
Beförderung vor der Annahme, eine Zeit liegt in der Zukunft (Zahlendreher)
oder die Nummer ist schon vergeben. Berichtigt wird danach mit „Annehmen“,
„Befördern“, „Nachweisen“ oder „Aufnahme berichtigen“.

**Aufnahme berichtigen.** Hat die FmZ einen Eingang mit falscher
Aufnahmezeit oder falschem Mittel aufgenommen, berichtigt „Aufnahme
berichtigen“ Mittel, Zeit und Handzeichen der Aufnahme (Feld 1, 2 und 6).
Ein Grund ist Pflicht, weil der Vermerk auf Papier schon stehen kann; das
Tagebuch führt die Zeile als Berichtigung mit altem und neuem Wert
(„Aufnahme berichtigt (Funk 1705 → Telefon 1750, Hz. Fm)“).

**Gesprächsnotiz.** Wer telefoniert oder persönlich spricht, hält das
Gespräch mit dem Kästchen „Gesprächsnotiz“ in der Verfassen-Maske fest. Die
Nachricht wird damit ein Eingang, geht nicht über die FmZ und wird nicht
befördert. Der Laufzettel erscheint in der Maske: Der Verfasser bestimmt
selbst, welche Stellen Kenntnis bekommen (S2 rot vorbelegt), und „Aufgeben“
verteilt sie gleich. Mit dem Schalter „An den Sichter“ läuft sie stattdessen
zum Sichter wie ein Eingang. Verkehr zwischen zwei Stellen des Stabs
läuft wie in der Lehrunterlage (Folie 31) über den Sichter oder die eigene
Verteilung der Gesprächsnotiz; einen eigenen stabsinternen Weg an FmZ und
Sichter vorbei gibt es bewusst nicht. S5 hat im Vordruck kein Kästchen; sie
wird unter „Weitere Stelle“ als Freitext eingetragen.

**Ersatzsichter.** Steht in der Anwesenheit kein Arbeitsplatz mit der Stelle
Sichter, verteilt, wer aufnimmt: Die Eingangsmaske der FmZ zeigt dann den
Laufzettel mit, und „Aufnehmen“ verteilt die Nachricht im selben Zug („Kein
Sichter besetzt: Nachricht beim Aufnehmen verteilt“). Dasselbe gilt für die
Gesprächsnotiz; „An den Sichter“ ist dann gesperrt. Ist der LdF als Station
besetzt, sichtet nicht die FmZ, sondern der LdF: Der Eingang geht zu ihm,
und er verteilt beim Weitergeben („Kein Sichter besetzt: Der LdF hat beim
Weitergeben verteilt“). Jede Ersatzsichtung heißt im Tagebuch „als
Ersatzsichter gesichtet“. Ein Sichter, der doch da war, sieht die Nachricht
trotzdem und kann nachsichten.

**Säumiger Sichter.** Ist ein Sichter besetzt, reagiert aber nicht
(Funkgerät, Telefon, Tür), gilt eine Schwelle je Vorrang: Liegt ein Blitz 5
Minuten, ein Sofort 10 Minuten oder eine einfache Nachricht die Schwelle der
FmZ lang vor dem Sichter, bekommen FmZ und LdF einmal den Hinweis „… wartet
seit … Minuten vor dem Sichter, obwohl ein Sichter besetzt ist“, die Zeile
trägt die Marke, und „Ich sichte jetzt selbst“ ist ohne Rückfrage frei. Im
Tagebuch steht die Sichtung dann als Ersatzsichtung („Sichter besetzt,
Schwelle überschritten“). Die beiden Schwellen für Blitz und Sofort sind
Parameter des Einsatzes; eine Vorrangschwelle über der Schwelle der FmZ
gilt nicht, ein Blitz wartet nie länger als eine einfache Nachricht.

**Parameter des Einsatzes.** In den Stammdaten im Blatt Führungsstelle
stehen unter „Nachrichtenweg“ zwei Einstellungen für alle Arbeitsplätze:
ob Ausgänge nach der Beförderung noch einmal zum Sichter laufen (Vorbelegung
nein) und die Schwelle der FmZ in Minuten (Vorbelegung 20). Dazu kommen
„LdF als eigene Station“ (Vorbelegung ja, in jedem Einsatz; ausgeschaltet nur, wenn jemand das Häkchen herausnimmt), siehe unten, und die Schwellen
vor dem Sichter bei Blitz und Sofort (Vorbelegung 5 und 10 Minuten, siehe
„Säumiger Sichter“).

**Leiter des Fernmeldebetriebes (LdF).** Führt der Einsatz den LdF als
eigene Station (Kästchen „LdF als eigene Station“ unter „Nachrichtenweg“),
läuft jede Nachricht der FmZ einmal über ihn. Ein Ausgang kommt gleich nach
dem Aufgeben zu ihm, noch vor der Annahme: Er sichtet ihn und teilt ihn mit
„Fernmelder zuteilen“ einem der Fernmelder Fm1, Fm2 oder Fm3 zu, mit Mittel
und Gegenstelle; die Auswahl nennt, wer den Fernmelder gerade besetzt
(„Fm2 · Meyer“); ist nur ein Fernmelder besetzt, steht er schon im Feld.
Der zugeteilte Fernmelder nimmt die Nachricht an und überträgt sie. Seine
Zuteilung kann der LdF mit „Rückgängig“ zurücknehmen, solange die Nachricht
nicht befördert ist; danach bleibt sie stehen, und der Knopf sagt im
Tooltip, warum. Beim Eingang prüft er nach der Aufnahme Aufnahmevermerk und
Nummer und gibt die Nachricht an den Sichter weiter. Wer die Stelle LdF
wählt, landet in der Sicht „LdF“ mit zwei Karten: „Ausgänge vor der
Zuteilung“ mit dem Knopf „Fernmelder zuteilen“ und „Eingänge vor der
Weitergabe“ mit dem Knopf „An den Sichter weitergeben“ (Uhrzeit,
Handzeichen). Das Band zeigt dann die Zahl „vor dem LdF“. In der
Warteschlange der FmZ trägt ein Ausgang ohne Zuteilung die
Marke „beim LdF“. Wer als Fm1, Fm2 oder Fm3 eingetragen ist, sieht die ihm
zugeteilten Nachrichten zuoberst mit der Marke „für Sie“, darunter die ohne
Zuteilung und die der anderen; „nur meine“ blendet die übrigen aus. Jeder
Fernmelder kann trotzdem jede Nachricht befördern, etwa wenn ein Platz
ausfällt; „Befördern“ belegt Mittel und Gegenstelle mit dem
Vorschlag vor. Der Weg des LdF steht in der Nachweisung als Marke und auf
dem Vordruck als Übermittlungsweg (Feld 1) und in den Vermerken mit seinem
Handzeichen. Ein Eingang mit Sofort oder Blitz meldet sich beim LdF, sobald
er bei ihm liegt (bei Blitz mit Ton), und zählt bei ihm als „mit Vorrang
offen“; die Zeile nennt die Minuten beim LdF, und liegt ein Eingang die
Schwelle der FmZ lang beim LdF, bekommen FmZ, LdF und Sichter einmal den
Hinweis „… wartet seit … Minuten beim LdF“. Ist in der Anwesenheit kein LdF, übernimmt der Fernmelder: Ein
aufgenommener Eingang läuft direkt zum Sichter („Kein LdF besetzt:
Nachricht direkt an den Sichter weitergegeben“), und beim Befördern gilt
sein Vermerk als Vorschlag. Ohne das Kästchen bleibt der Weg, wie er ist;
die Sicht „LdF“ erscheint dann nur an einem Arbeitsplatz mit der Stelle LdF.
Befördert die FmZ, bevor der besetzte LdF einen Weg vorgeschlagen hat,
tragen Nachweisung und Tagebuch die Marke „ohne Vorschlag des LdF“; nimmt
sie ein anderes Mittel als vorgeschlagen, steht „abweichend vom Vorschlag
(Telefon → Funk)“ dort und als Hinweis beim Befördern. Ist kein LdF besetzt,
tragen die Zeilen beim LdF das als Angabe („LdF nicht besetzt“); die
Auswahl der Fernmelder in der Zuteilung nennt Fm1 bis Fm3 mit den Arbeitsplätzen, die sie besetzen.

**Zwei Sichter zugleich.** Haben zwei Sichter dieselbe Nachricht gesichtet,
ohne die Sichtung des anderen zu sehen, nimmt das Programm beide an: Der
zweite bekommt den Hinweis „Die Nachricht war inzwischen anders gesichtet“,
die Nachricht steht bei beiden Verteilern mit der Marke „zwei Sichtungen“,
und der Laufzettel zeigt beide Quittungen. Beide Vermerke gelten, mit dem
Handzeichen davor („Si: … / Zw: …“), und der zweite Sichter liest den
Vermerk des ersten im Hinweis. Eine erneute Sichtung bereinigt das. Die Sichtung des Ersatzsichters heißt im Tagebuch „als Ersatzsichter
gesichtet“.

**Der Weg eines Ausgangs mit LdF.** Mit „LdF als eigene Station“ läuft ein
Ausgang so: Die Stelle verfasst und gibt auf. Der LdF sieht die Nachricht und
teilt sie einem Fernmelder zu. Der Fernmelder nimmt an und überträgt. Danach
liegt die Nachricht wieder beim LdF, in der Karte „Vor der Weitergabe an den
Sichter“: Er trägt die Nummer ins Technische Betriebsbuch ein (das Feld
„Nummer (Nachweisung)“ ist mit der nächsten freien vorbelegt) und gibt mit
„Nachweisen und weitergeben“ an den Sichter. Der Sichter verteilt; sein
Laufzettel ist bei einem Ausgang mit rot S2 (Lage und Tagebuch) und grün
der Stelle des Verfassers vorbelegt. Ist kein LdF besetzt, gibt die
Beförderung selbst an den Sichter weiter. Ist kein Sichter besetzt, gehen
die Kopien beim Weitergeben (oder ohne LdF beim Befördern) gleich an S2
und den Verfasser, wie im nächsten Absatz.

**Kopien nach der Beförderung.** Ist ein Ausgang befördert, gehen nach der
Lehrunterlage die rote Kopie an S2 und die grüne an die Stelle des
Verfassers. Ohne LdF als Station trägt das Programm beides beim Befördern ein: Der Ausgang steht
danach im Posteingang von S2 (rot) und der Verfasserstelle (grün), mit dem
Vermerk „Kopien nach Beförderung: rot S2, grün …“ (im Tagebuch als
„Kopien nach Beförderung“ unter der FmZ, nicht als Sichtung), und gilt als verteilt,
bis beide ihn erledigt haben. Die Verfasserstelle ist die Funktion auf dem
Vordruck, wenn sie eine Stelle ist, sonst der Absender. Ist S2 nicht
besetzt, wird die Kopie trotzdem eingetragen und wartet im Fach. Laufen
Ausgänge nach der Beförderung noch einmal zum Sichter (Parameter oben),
entfällt dieser Schritt, weil dann der Sichter verteilt. Die grüne Kopie
des eigenen Ausgangs gilt für die Verfasserstelle als gelesen: Sie zählt dort
nicht als „neu“, und ein Blitz meldet sich seinem Verfasser nicht noch einmal.
Im Tagebuch steht dafür keine Kenntnisnahme — der Verfasser kennt den Inhalt.

**Als Vordruck drucken.** An jeder gewählten Nachricht steht in der Leiste,
im Rechtsklickmenü und in der aufgeschlagenen Nachricht „Als Vordruck
drucken“. Das Programm legt den Nachrichtenvordruck als PDF im Ordner
„ausgaben\nachrichten“ des Einsatzes ab, mit Namen wie
„nachricht-E26-171045nov26.pdf“ (Richtung, Nummer, Abfassungszeit; ohne
Nummer steht „ohne“ und ein Stück der Kennung dabei), und nennt die Datei mit
„Öffnen“ und „Ordner zeigen“; gedruckt wird aus dem PDF-Programm. Im Browser
stehen „Öffnen“ und „Herunterladen“ — der Vordruck entsteht auch dort, ohne
Desktop-App. Das Blatt stellt „Dieser Arbeitsplatz“ auf der Einsatzauswahl
ein: A5 hoch, ein Vordruck je Blatt (Vorgabe), oder A4 quer mit zwei
Vordrucken nebeneinander. Ein Inhalt über zwölf Zeilen bekommt Folgeblätter
mit „Blatt n von m“. In einer Übung trägt jeder Vordruck das Wasserzeichen
„ÜBUNG“. Drucken schreibt nichts in die Akte und geht deshalb auch im
beendeten Einsatz.

**Vorschau.** Unter der aufgeschlagenen Nachricht und unter der Maske
„Nachricht verfassen“ steht der Bereich „Vorschau“: der Vordruck, wie er
gedruckt wird, mit Umbruch und Folgeblättern. In der aufgeschlagenen
Nachricht ist er offen, in der Maske zugeklappt; ein Klick auf „Vorschau“
klappt ihn auf oder zu, und dieser Arbeitsplatz merkt sich die Wahl. In der
Maske zeichnet die Vorschau neu, sobald eine Drittelsekunde nichts getippt
wurde. Die Schrift am Bildschirm weicht leicht von der des Ausdrucks ab. Kann
das Fenster nicht zeichnen (etwa bei abgeschalteter Grafik), steht dort
„Keine Vorschau möglich“; der Ausdruck geht trotzdem.

**Automatikdruck.** Unter „Dieser Arbeitsplatz“ steht beim
Nachrichtenvordruck der Umschalter „Automatikdruck: Aus | Verzeichnis |
Drucker“. Ist er nicht aus und ein Ziel eingetragen, geht jede Nachricht, die
gesichtet für eine Stelle dieses Arbeitsplatzes eintrifft, von selbst als
Vordruck an das Ziel — auch eine, die man selbst verteilt hat, denn das Papier
braucht die Stelle trotzdem. Was beim Öffnen des Einsatzes oder beim
Einschalten schon verteilt war, wird nicht nachgedruckt. „Verzeichnis“ legt
die PDFs in einen festen Ordner, aus dem sie später oder von einem anderen
Rechner gedruckt werden; „Wählen …“ öffnet den Ordnerdialog. Im Browser
liegt das Verzeichnis auf dem Rechner des Dienstes, einen Dialog gibt es
dort nicht. „Drucker“ gibt es nur in der Desktop-App: Die Liste zeigt die
Drucker des Rechners, und der Vordruck geht ohne Rückfrage dorthin.
„Probedruck“ schickt einen leeren Vordruck an das eingetragene Ziel, auch
bevor „Übernehmen“ gedrückt ist. Scheitert ein Ausdruck (Verzeichnis nicht
erreichbar, Drucker ohne Papier), steht einmal je Sitzung ein Hinweis in der
Leiste; die Nachricht steht weiter im Blatt und lässt sich von Hand drucken.

**Leerer Vordruck.** „Papier-Vordruck“ unter Ausgaben legt neben die
Papier-Vordrucke den leeren Nachrichtenvordruck als eigenes PDF
(„vordruck-nachricht-leer.pdf“, A4 quer, zwei Vordrucke) und nennt beide
Dateien. So liegt der Block im Schrank, bevor der Rechner steht.

**Im Tagebuch.** Jede Zeile trägt die laufende Nummer („Nr.“, dieselbe wie
im gedruckten Tagebuch und als ETB-Nr. auf dem Vordruck) und die Nummer der
Nachricht zur Zeit des Eintrags („Nachricht“, etwa „E 3“). Als Akteur steht
die Stelle, die den Schritt getan hat: bei der Aufnahme die FmZ, nicht die
Funktion des Absenders draußen. Der Satz nennt den Vorrang („Blitz-Nachricht
E 8“), bei der Aufnahme Mittel und Gegenstelle, bei der Sichtung den Vermerk
des Sichters; Erledigen und Zurückziehen tragen das Handzeichen. Beim
Beenden des Einsatzes schreibt das Programm, wenn etwas offen ist, einen
Eintrag „Einsatz beendet, offene Nachrichten: …; fehlende Nummern: …“, und
die Abschlusszeile des gedruckten Tagebuchs nennt Stelle und Handzeichen
dessen, der beendet hat. Die Spalte der fachlichen Zeit heißt im Druck wie
am Bildschirm „Fachzeit“.

**Zurückziehen.** Eine zurückgezogene Nachricht trägt den Satz mit Zeit,
Stelle und Grund („Zurückgezogen 17.11.2026 20:41 von S3 · Mü, Grund: …“).
War sie schon verteilt, sagt der Hinweis nach dem Zurückziehen, welche
Stellen sie haben und ob sie gelesen oder erledigt ist — diese Stellen sehen
nur die Marke, jemand muss ihnen Bescheid geben.

**Einsatzakte und Handzeichenverzeichnis.** Die Einsatzakte legt von Tagebuch
und Nachweisung nur den jüngsten Stand obenauf; ältere Ausgaben stehen im
Unterordner „ausgaben/fruehere“ des Archivs (auf dem Share bleibt jede
Datei). Der Vordruck einer zurückgezogenen Nachricht wird vor dem Packen mit
dem Stempel „Zurückgezogen“ neu geschrieben. Dazu kommt das
Handzeichenverzeichnis: je Handzeichen die Arbeitsplätze und Stellen, unter
denen es vorkam, mit erstem und letztem Eintrag — so bleibt ein Handzeichen
nach dem Einsatz einer Person und Stelle zuzuordnen. Jeder Ausdruck nennt im
Kopf die Programmfassung. Konflikthinweise an Nachrichten nennt die Diagnose
mit Nummer, Betreff und den beiden Werten („Nummer 7 zweimal: E 7 ‚…‘ und
A 7 ‚…‘“, „E 8 ‚…‘: Sichtung von Si 1420 und Zw 1421, Verteiler …“).

### Wörterverzeichnis Nachrichten

Die Wörter des Nachrichtenwegs, für alle, die nicht aus dem Stab kommen;
dieselben Sätze stehen in der Hilfe unter „Abkürzungen“. Die **FmZ**
(Fernmeldezentrale) nimmt Nachrichten von außen auf, befördert Ausgänge
über Funk, Telefon oder Melder und führt die Nachweisung; jede Nachricht der
Führungsstelle läuft über sie. Der **Sichter** quittiert jeden Eingang mit
Uhrzeit und Handzeichen und legt fest, welche Stelle ihn bearbeitet und wer
ihn zur Kenntnis bekommt. Der **LdF** (Leiter des Fernmeldebetriebes) legt
in der Fernmeldezentrale fest, auf welchem Weg und durch welchen Fernmelder
eine Nachricht hinausgeht, und prüft Eingänge, bevor er sie an den Sichter
weitergibt. Die **Nachweisung** ist die fortlaufend nummerierte Liste aller
Ein- und Ausgänge der Fernmeldezentrale, und eine Nummer, die auf dem
Vordruck steht, ändert sich nie. Der **Laufzettel** ist der untere Teil des
Vordrucks, auf dem der Sichter quittiert, den Verteiler ankreuzt und
Vermerke für die Empfänger schreibt. Das **Handzeichen** ist Ihr Kürzel aus
zwei bis vier Zeichen, meist die Initialen, und steht wie eine Unterschrift
auf jedem Vermerk, im Einsatztagebuch und auf dem Vordruck. Der **Vorrang**
sagt, wie eilig eine Nachricht ist: ohne Kreuz einfach, sonst Sofort oder
Blitz, und er wird sparsam vergeben. **Sofort** ist die Vorrangstufe für
eine Nachricht, die vor allen einfachen befördert und bearbeitet wird.
**Blitz** ist die höchste Vorrangstufe, wenn es um Leben oder unmittelbare
Gefahr geht; sie geht allem anderen vor und meldet sich mit Ton. Ein
**Spruch** geht an eine bestimmte Gegenstelle, die ihn Wort für Wort
aufnimmt und quittiert. Eine **Durchsage** geht an mehrere Empfänger
zugleich, etwa an alle Teilnehmer eines Funkkreises, ohne dass jeder
einzeln antwortet. Eine **Gesprächsnotiz** hält ein Telefonat oder Gespräch
fest, das Sie selbst geführt haben; sie wird nicht übermittelt, sondern
nachgewiesen und von Ihnen oder vom Sichter verteilt. Die **Kopiefarbe**
(rot, grün, blau) sagt, was der Empfänger tut: grün bearbeitet die
Nachricht, blau nimmt sie zur Kenntnis, rot geht an S2 für Lagekarte und
Einsatztagebuch. Die **Datum-Zeit-Gruppe** schreibt Tag, Stunde, Minute,
Monat und Jahr in ein Wort, etwa „171045NOV26“ für den 17. November 2026 um
10:45 Uhr. Der **Übermittlungswunsch** ist der Weg, auf dem der Verfasser
die Nachricht befördert haben möchte (Funk, Telefon, Telefax, DFÜ,
Kurier/Melder); die Fernmeldezentrale kann anders entscheiden. Die
**Abfassungszeit** ist die Zeit, zu der der Verfasser die Nachricht
geschrieben hat, beim Eingang die Zeit, die der Absender draußen nennt.

## Was ein Zurücknehmen tut

Strg+Z nimmt die letzte **eigene** Handlung zurück. Es löscht nichts: Die
Rücknahme ist selbst ein Ereignis und steht im Tagebuch (§6 U3, §5.9.1).

Der Knopf dazu steht rechts in der **Statuszeile**, immer an derselben Stelle,
und nennt den Schritt: „↶ Rückgängig: Status der Einheit ‚FGr WP 1‘ geändert“.
Ist nichts zurückzunehmen, steht dort grau „Rückgängig: nichts
zurückzunehmen“. Links daneben steht nach jedem eigenen Schritt zehn Sekunden
lang die Bestätigung „✓ … · gespeichert“, nach einer Rücknahme
„✓ Zurückgenommen: …“. Die Ist-Stärke steht nicht in der Statuszeile, sondern
nur im Kopfband.

**Ein Schritt mit Folgeschritten ist ein Rückgängig.** Manche Bedienschritte
schreiben mehr als einen Eintrag: „Befördern“ trägt fehlende Annahme und
Nummer nach und verteilt die Kopien an S2 und den Verfasser, „Aufnehmen“
trägt Nummer und Sichtung mit ein. „Rückgängig“ nimmt dann den ganzen
Schritt zurück, den jüngsten Teil zuerst, und sagt danach, was es
zurückgenommen hat („Zurückgenommen: Befördern (mit Annahme, Nummer und
Kopien)“); jeder Teil steht als eigene Rücknahme im Tagebuch. Die Anlage
einer Nachricht selbst lässt sich nicht rückgängig machen: Nach „Eingang
aufnehmen (mit Nummer und Sichtung)“ gehen Nummer und Sichtung, der Eingang
bleibt; eine aufgegebene Nachricht wird mit Grund zurückgezogen. War der
letzte eigene Schritt ein solcher, kennt das Programm das und kann es
nennen, statt still einen älteren Schritt anzubieten.

Zwei Grenzen gehören dazu. Hat ein anderer Arbeitsplatz dieselbe Handlung
bereits zurückgenommen, ist der alte Stand schon wiederhergestellt — ein
zweites Zurücknehmen verwürfe fremde Arbeit und findet deshalb nicht statt.
Und was in einem Endzustand steht, nimmt keine Änderung mehr an: eine
erledigte Anforderung etwa (§5.6.2).

## Wenn zwei dasselbe ändern

Es passiert, und es ist kein Fehler. Das Programm entscheidet nach fester Regel
— der jüngere Eintrag gewinnt — und **merkt sich, was es verdrängt hat**. Der
Hinweis nennt Feld, Gewinner und verdrängten Wert (§2.2a, §3.8).

Was damit zu tun ist, entscheidet ein Mensch: Der richtige Wert wird neu
eingetragen und ist damit der jüngste. Die Hinweise stehen in der
Diagnoseansicht.

## Ein neues Programmpaket holen

In der **Diagnose** (Fenstermenü „⋯“) steht der Knopf **„Neues Paket für die
Führungsstelle holen“**. Ihn drückt **eine** Person an **einem** Rechner: Sie holt das Paket
aus der Veröffentlichung, die Anwendung prüft Signatur und Prüfsumme und legt
es auf den Share. Alle anderen Arbeitsplätze bekommen es danach angeboten,
ohne selbst ins Netz zu gehen.

Vor dem Einsatz, nicht während. Ist ein Einsatz geöffnet, warnt die Anwendung
und fragt ein zweites Mal — der Download geht über dieselbe Leitung wie der
Share.

Installiert wird nichts von selbst; es gibt keinen Auto-Updater. Nach dem
Holen liegt eine Datei auf dem Share, und ein Mensch startet sie. Alles
Weitere in [BETRIEB.md](BETRIEB.md).

## Versorgung und Monitoransichten

Das Blatt **Versorgung** ist der Arbeitsplatz des S4. Es liest, was der S1
an den Einheiten pflegt (Stärke, Schicht, Kostform, Übernachtungsbedarf,
Zeiten, Sofortbedarf aus dem Bogen), und führt dazu, was der S4 selbst
entscheidet: Unterkünfte und wer dort schläft, Ausgabestellen, Bestellungen,
die Mahlzeitenregel des Einsatzes und was vom Sofortbedarf erledigt ist.

- **Zählregel.** Gezählt werden alle erfassten Einheiten der Einsatzbereiche,
  auch in Ruhe. Das ist nicht die Ist-Stärke des Kopfbands. Der Anmarsch steht
  daneben und nie darin; nur die Vorausschau rechnet ihn ein, und nur ab der
  gemeldeten Eintreffzeit.
- **Nächste 24 h.** Je Mahlzeit Bestand nach Mahlzeitenregel und Schicht, plus
  Zugänge ab Eintreffzeit, minus Abgänge ab „verfügbar bis“, Einsatzende oder
  Rückführung. Wer genau zur Ausgabezeit eintrifft, isst mit; wer genau dann
  geht, nicht mehr. Einheiten ohne Schicht essen wie die Tagschicht.
- **Bestellen.** Die Vorausschau ist der Vorschlag, die Bestellung die
  Entscheidung. Liegt die Bestellung darunter, zeigt die Karte die Differenz in
  Bernstein. „Bestellung ändern“ legt eine neue an, die jüngste gilt.
- **Unterbringen.** Erst links „Unterkunft anlegen“. Dann entweder in der
  Tabelle rechts in der Spalte „Unterkunft“ die Unterkunft wählen und
  „Zuweisen“ drücken (oder Enter), oder an der Unterkunftskarte unter
  „Einheit wählen“ die Einheit nehmen und „Zuweisen“. An der Karte stehen
  auch Einheiten ohne gemeldeten Übernachtungsbedarf zur Wahl; sie belegen
  dann ihre Köpfe. Die Karte nennt die untergebrachten Einheiten beim Namen.
  Eine Zuweisung über die Kapazität wird gezeigt („⚠ überbelegt“), nicht
  verweigert.
- **Sofortbedarf.** Einheiten anhaken, Feld wählen, „Als erledigt melden“ —
  je Feld ein Ereignis. Erledigte Zeilen bleiben blass stehen.
- **Werkzeuge.** Neben dem Umschalter steht je Unteransicht höchstens ein
  Hauptknopf: in „Nächste 24 h“ die Bestellung der nächsten noch
  unbestellten Mahlzeit, in „Unterbringung“ „Unterkunft anlegen“ in der
  Karte. Alles Weitere steht rechts im **„⋯“**: die Mahlzeitenregel
  (Verpflegung, Nächste 24 h), „Ausgabestelle anlegen …“ (Verpflegung) und
  die Ausgabe der Unteransicht als PDF oder HTML — Bestellliste,
  Vorausschau, Belegungsliste, Kraftstoffliste. Die erzeugte Datei steht
  danach neben dem Menü mit „Öffnen“.

Der **Monitor** ordnet seine Ansichten nach dem Stab. Führung: „Offene
Punkte“ mit je einer Kachel für offene Anforderungen und Ablösungen,
ungelesene Blitz- und Sofort-Nachrichten, Nachrichten über der Schwelle, Funk
ohne Kontakt, Kräfte ohne Bett, die nächste Mahlzeit (nicht bestellt oder
Fehlmenge) und Konflikthinweise. S1: die Stärke mit Erwarteten und Beendeten
darunter, „Status“ je Organisation (im Einsatz, einsatzbereit, Ruhe, nicht
einsatzbereit, ab zwei Sanitätsorganisationen mit „davon Sanitätsdienst“),
„Kommen und Gehen“ mit Anforderungen, Zusagen, Anmarsch und ablaufender
Verfügbarkeit in Zeitfolge, dazu die Stärke je Abschnitt, je
Organisation und als Kreuztabelle „Abschnitt × Organisation“ mit den
Köpfen vor Ort je Zelle und den Erwarteten je Organisation darunter. Die beiden Stärketafeln nennen je Zeile Fü / UFü / He und
Gesamt nach derselben Regel wie die Kopfzahl, die Gesamtzeile ist die
Ist-Stärke. Erwartete Kräfte stehen in einer eigenen Spalte und nie in der
Summe. Unter den Abschnitten folgen Unterabschnitte eingerückt, leere
Abschnitte fallen weg, „Angefordert / Anmarsch“ steht abgesetzt darunter. Der Funkplan steht als Tafel mit einer Zeile je Rufgruppe
(Betriebsart, Zweck, wer abhört) und den Teilnehmern als Kacheln: die linke
Kante in der Statusfarbe, ein Bernsteinrahmen mit der Zeit des letzten
Kontakts, wenn er älter ist als die Schwelle, Mithörer gestrichelt mit „hört
mit“. Der Fuß nennt in Bernstein die Einheiten ohne Rufgruppe und die Zahl
ohne Kontakt. Die Schrift wird so groß, wie das Fenster es zulässt; viele
Rufgruppen verkleinern sie, statt zu blättern, aufgelöste stehen nicht an der
Wand. S2: der „Lageticker“ mit den jüngsten Einträgen des Einsatztagebuchs
ohne Stammdatenpflege, Rücknahmen mit ⚠. S3: „Einsatzmittel“ mit den
Einheiten je Abschnitt nach Status und „Aufträge“ mit den laufenden Aufträgen
je Abschnitt (Beginn, Einheit, Auftrag, Status). S4: Verpflegung, Nächste
24 h, Unterbringung (eine überbelegte Unterkunft mit ⚠ und „überbelegt +N“),
die Tafel „Bereiche · Schichten“ und „Sofortbedarf“ mit dem, was beim
Eintreffen gemeldet und noch nicht erledigt ist, die offene Summe im Fuß. S6: „IuK-Lage“ mit
Share, erreichbaren Arbeitsplätzen, Programmfassungen, nicht übertragenen Daten
und Quarantäne. FmZ: der Funkplan und der „Nachrichtenweg“, der zeigt, was
beim LdF, vor der FmZ und vor dem Sichter wartet und was davon über der
Schwelle liegt, dazu Vorrang ungelesen, Nachrichten ohne Nummer,
Nummernlücken und im Fuß, ob LdF, Fernmelder und Sichter besetzt sind; die
„Warteschlange“ mit jeder wartenden Nachricht (Vorrang, Richtung, Nummer,
Gegenstelle, Stand, Wartezeit), Blitz vor Sofort, nie mit Betreff oder Inhalt;
„Funk still“ mit den Einheiten ohne Kontakt, länger als die Schwelle still
oder ohne Rufgruppe, älteste zuerst. Eine
Kachel in Bernstein trägt immer ⚠ und ein Wort; eine Null steht gedämpft.
Umgeschaltet wird mit Rechtsklick (Menü), über die Leiste, die bei
Mausbewegung oben erscheint, mit den Tasten 1 bis 9 und 0 für die ersten zehn
Ansichten oder mit Pfeil links und rechts durch alle. Taste B (oder Leiste
und Menü) schaltet die Besucheransicht: Dann sind nur Stärke, Status,
Abschnitte, Organisationen und die Kreuztabelle zu sehen und im Wechsel. R schaltet den Wechsel
alle 20 Sekunden ein und aus; über Leiste und Menü läuft er auf Wunsch nur
durch ein Sachgebiet, das mehr als eine Ansicht hat. Die Leertaste hält ihn an, F11 schaltet
Vollbild, Esc verlässt es. Die Wahl merkt sich das Gerät, nicht der Einsatz —
der Monitor im Zelt kann Verpflegung zeigen, der im Fahrzeug Stärke.

## Die Ansichten

<!-- ANSICHTEN ANFANG — erzeugt, nicht von Hand ändern -->

### Lage

Der Überblick: Stärke nach Status, Zahl der Abschnitte und Einheiten, der Stand des Einsatzes.

**Zuerst:** Nichts. Diese Ansicht bleibt offen, während gearbeitet wird.

**Gut zu wissen:** Die Zahlen ändern sich, ohne dass jemand an diesem Rechner etwas tut. Sie kommen von den anderen Arbeitsplätzen. Die Kopfzahl „Ist-Stärke“ (Fü/UFü/He // Gesamt) zählt die Kräfte, die vor Ort sind: Einheiten in einem Einsatzbereich mit Status Einsatzbereit, Einsatz, Ruhe oder Nicht einsatzbereit. Wer noch nicht da ist, steht daneben als „+N erwartet (angefordert/Anmarsch/Eingang)“: Status Angefordert, Anmarsch, Rufbereitschaft, Einsatzvorbehalt, oder die Einheit steht im Bereich „Angefordert / Anmarsch“ oder im Eingang. Nicht gezählt sind „Einsatz beendet“ und Rückmarsch (angezeigt als „N beendet“). Der Status entscheidet, nicht nur der Bereich: Setzt jemand eine Einheit im Einsatzbereich von Anmarsch auf Einsatzbereit, steigt die Kopfzahl sofort, ohne dass die Einheit den Bereich wechselt. Ein Tipp auf „Regel“ unter der Kopfzahl zeigt diese Erklärung — auch auf dem Handy. Dieselbe Regel gilt in der Tabellensumme („Ist-Stärke“, darunter „Erwartet“ und „Alle erfassten Einheiten“), im Abschnittsbaum, in der Gliederung und in allen Ausgaben; „Alle erfassten Einheiten“ ist bewusst größer als die Ist-Stärke. Wer eintrifft, wird in einen Einsatzbereich gesetzt und auf Einsatzbereit gestellt; ab dann zählt er in die Ist-Stärke.

**Kürzel:** Strg+H

### Abschnittsbaum

Die Führungsorganisation: Einsatzabschnitte, Unterabschnitte und was daran hängt.

**Zuerst:** Mit Strg+N einen Abschnitt anlegen; Einheiten kommen danach hinein.

**Gut zu wissen:** Ein aufgelöster Abschnitt verschwindet nicht, er wird als aufgelöst geführt. Seine Einheiten stehen dann wieder frei.

**Kürzel:** Strg+N · Strg+E · Strg+M · Strg+F · Strg+Z

### Einheitentabelle

Alle Einheiten der Lage mit Stärke, Status und Zeiten — das Gegenstück zur bisherigen Stärketabelle auf Papier.

**Zuerst:** Suchen (Strg+F) oder mit Strg+N eine Einheit anlegen — aus einer Vorlage (THW StAN, Feuerwehr, KatS-StAN Nds; Tippen filtert, Enter wählt) oder „Ohne Vorlage“ als freie Zeile.

**Gut zu wissen:** Eine entfernte Einheit bleibt sichtbar, wenn „mit Stillgelegten“ gewählt ist. Entfernen ist kein Löschen: Die Einheit bleibt in der Akte und im Tagebuch, nur die Summen zählen sie nicht mehr. „Gliederung“ setzt über jeden Bereich eine Kopfzeile mit Zwischensumme wie in der Stärketabelle auf Papier; die oberste Zeile ist die Ist-Stärke wie im Kopfband, erwartete Kräfte und alle erfassten Einheiten stehen daneben. Bei KatS-Vorlagen steht an der Soll-Stärke „Annahme“: Die Vorlage nennt dort keine, eingetragen ist die übliche Gliederung — am Standort prüfen. Die Spalten der Ablösung („Ablösung angefordert“ bis „Vorgesehener Auftrag“) unter „Ressourcen“ kommen aus der Ansicht „Anforderungen“ und werden dort bearbeitet; „Ablösung anfordern“ legt für die markierte Zeile eine an; „Funk …“ öffnet für sie Rufgruppen, Funkrufname, Erreichbarkeit und Funkhinweis. „Erfassungsbögen“ speichert die Bögen aller markierten Zeilen als eine Bündeldatei nach „ausgaben“, je Einheit die jüngste Fassung; die Erfassungsbogen-App öffnet sie und druckt daraus die PDFs, auch im beendeten Einsatz. Die Marke „läuft ab“ an „Verfügbar bis“ erscheint einen Tag vor Ablauf (K18). Unter „Funk“ steht „Letzter Kontakt“: die jüngere von Funkprobe und Statusmeldung, Bernstein mit Alter, sobald sie älter ist als die Schwelle des Funkplans. „Kopieren“ (Strg+K) öffnet für die markierte Zeile die Anlegemaske mit Bezeichnung, Organisation, Ebene, Herkunft, Stärke, Abschnitt und Vorlage vorbelegt; die Kopie ist eine neue, angeforderte Einheit ohne Aufträge, Fahrzeuge, Personen und Zeiten.

**Kürzel:** Strg+N · Strg+K · Strg+E · Strg+M · Strg+F · Strg+Q · Strg+D · Strg+Z

### Tagebuch

Was wann geschehen ist, aus den Ereignissen abgeleitet.

**Zuerst:** Filtern — nach Einheit, Abschnitt oder Text.

**Gut zu wissen:** Rücknahmen stehen als eigene Zeilen darin und löschen nichts. Das Tagebuch ist eine Projektion und kein Eintragsbuch: Neue Zeilen entstehen durch Arbeiten in der Lage, eigene Notizen kommen über „Eintrag hinzufügen“ dazu. Eine Zeile zu einer Nachricht nennt die Nummer, die damals galt, und öffnet die Nachricht mit ✉; „Im Tagebuch zeigen“ an der Nachricht zeigt genau ihre Zeilen. Eine neue Nummer, eine Nachsichtung und das Zurückziehen tragen die Marke „Berichtigung“. Der Ausdruck führt beide Zeiten, Nachricht, Handzeichen und Rechner je Zeile und schließt mit „Einsatztagebuch abgeschlossen“, sobald der Einsatz beendet ist.

**Kürzel:** Strg+F

### Eingangskorb

Gemeldete Erfassungsbögen, bevor sie in die Lage übernommen werden.

**Zuerst:** Eine Meldung wählen und übernehmen oder ablehnen.

**Gut zu wissen:** Derselbe Bogen zweimal eingelesen ergibt eine Meldung, keine zwei — der Inhalt des Bogens entscheidet, nicht der Zeitpunkt des Einlesens.

**Kürzel:** Strg+Q · Strg+F

### Nachrichten

Das Blatt für Nachrichten nach Vordruck 1103.1: Eingänge und Ausgänge mit Vorrang, Nummer, Absender, Anschrift und Betreff. Fünf Sichten, eine Zeile je Nachricht. „Posteingang“ zeigt, was an eine Stelle dieses Arbeitsplatzes verteilt ist, mit Kopiefarbe und den Marken neu, gelesen und erledigt. „Ausgang“ zeigt, was dieser Arbeitsplatz oder eine Stelle dieser Sitzung verfasst hat, mit dem Stand in der Fernmeldezentrale. „Sichter“ zeigt die Eingänge ohne Sichtung, zuoberst die mit Vorrang. „Fernmeldezentrale“ zeigt die Ausgangswarteschlange mit Annahme und Beförderung und nimmt Eingänge auf. „Nachweisung“ zeigt alle Nachrichten nach Nummer und lässt sich als Liste ausgeben. „LdF“ erscheint nur, wenn der Einsatz den Leiter des Fernmeldebetriebes als Station führt oder dieser Arbeitsplatz LdF ist: Ausgänge vor dem Übermittlungsvorschlag und Eingänge vor der Weitergabe an den Sichter.

**Zuerst:** Oben die Zahlen des Bandes lesen, dann mit dem Umschalter die Sicht wählen; mit „Nachricht verfassen“ entsteht eine neue Nachricht im Aufbau des Vordrucks.

**Gut zu wissen:** Die Stelle des Arbeitsplatzes wählt nur die erste Sicht und schneidet den Posteingang zu; sie ist kein Recht, jede Sicht bleibt erreichbar. Die Uhrzeiten stehen vierstellig und die Zeit der Abfassung als Datum-Zeit-Gruppe („171045nov26“), so wie sie auf dem Papier steht. Eine doppelt vergebene Nummer wird nicht verhindert, sondern in der Nachweisung markiert; beim Nacherfassen vom Papier gilt, was auf dem Blatt steht. „Als Vordruck drucken“ legt die Nachricht als PDF im Vordrucklayout unter ausgaben/nachrichten ab, mit der Nummer im Dateinamen; ohne Nummer trägt der Name die Kennung der Nachricht. Die Vorschau zeigt das Blatt vor dem Druck mit der Schrift des Browsers, sie weicht leicht von der des PDF ab. Der Automatikdruck ist nur an, wenn in den Druckeinstellungen ein Drucker oder ein Verzeichnis gewählt ist, und druckt dann jede an eine Stelle dieses Arbeitsplatzes verteilte Nachricht beim Eintreffen, auch die eigene Sichtung. Mit LdF als Station teilt der LdF jeden Ausgang einem der Fernmelder Fm1 bis Fm3 zu, nach der Beförderung trägt er die Nummer ein und gibt an den Sichter; der verteilt die rote Kopie an S2 und die grüne an die Stelle des Verfassers. Ohne LdF als Station gehen beide Kopien gleich nach der Beförderung hinaus. Der Ausgang steht dann in beiden Posteingängen.

**Begriffe:** FmZ ist die Fernmeldezentrale, über die jede Nachricht hinein- und hinausgeht. Der Sichter quittiert jeden Eingang und legt den Verteiler fest; der LdF (Leiter des Fernmeldebetriebes) teilt Ausgänge einem Fernmelder (Fm1 bis Fm3) zu, weist sie nach der Beförderung nach und gibt Eingänge wie Ausgänge an den Sichter weiter. Die Nachweisung ist die nummerierte Liste aller Nachrichten der FmZ, der Laufzettel der untere Teil des Vordrucks mit Quittung, Verteiler und Vermerken. Das Handzeichen ist Ihr Kürzel, das wie eine Unterschrift unter jedem Vermerk steht. Vorrang heißt Sofort (vor allem Einfachen) oder Blitz (Gefahr für Leben, geht allem vor). Ein Spruch geht an eine Gegenstelle, die ihn aufnimmt und quittiert, eine Durchsage an mehrere zugleich. Eine Gesprächsnotiz hält ein Telefonat fest und wird nicht übermittelt. Die Kopiefarbe sagt, was der Empfänger tut: grün bearbeiten, blau zur Kenntnis, rot an S2. Die Datum-Zeit-Gruppe schreibt Tag, Uhrzeit, Monat und Jahr in ein Wort („171045NOV26“); die Abfassungszeit ist die Zeit, zu der die Nachricht geschrieben wurde, der Übermittlungswunsch der Weg, den der Verfasser sich wünscht. Alle Begriffe stehen mit einem Satz in der Abkürzungsliste (Reiter „Abkürzungen“).

**Kürzel:** Strg+N · Strg+F · Strg+D

### Anforderungen

Was angefordert, zugesagt, eingetroffen oder storniert ist.

**Zuerst:** Mit Strg+N eine Anforderung anlegen.

**Gut zu wissen:** Eine erledigte oder stornierte Anforderung nimmt keine Änderung mehr an; sie ist am Ende ihrer Kette. „Eingetroffen“ legt auf Wunsch die Einheit aus der Anforderung an (Organisation, Ebene, Stärke und Auftrag vorbelegt, Status „Einsatzbereit“, Bereich zu wählen — erst in einem Einsatzbereich zählt sie in die Ist-Stärke) oder verknüpft eine schon erfasste Einheit; sie steht dann bei einer Ablösung als „Ablösung durch“ an der abgelösten Einheit.

**Kürzel:** Strg+N · Strg+F · Strg+D

### Führungsstelle

Stammdaten des Einsatzes, Dienstposten der eigenen Führungsstelle und der Schichtplan dazu.

**Zuerst:** Über „Stammdaten bearbeiten“ den Namen der Führungsstelle und die übergeordnete Führungsstelle eintragen — sie stehen auf jedem Ausdruck.

**Gut zu wissen:** Ein angelegter Dienstposten belegt noch keinen Platz im Schichtplan. Der Plan hängt an der Kombination aus Posten und Datum.

**Kürzel:** Strg+N · Strg+E

### Funkplan

Die Ansicht der Fernmeldezentrale: welche Rufgruppen es im Einsatz gibt, wofür und in welcher Betriebsart (TMO, DMO, Analog), wer sie abhört, und welche Einheit über welche Rufgruppe gerufen wird — mit Funkrufname, Erreichbarkeit, Funkhinweis und letztem Kontakt, je Rufgruppe oder je Bereich. Wer eine Gruppe als weitere trägt, steht dort als „hört mit“. Die Sicht „Funkproben“ zeigt alle Funkproben als Zeitfolge. Der Funkplan lässt sich als Ausdruck für den Platz der Sprechfunker erzeugen; der Monitor zeigt ihn in der Gruppe „FmZ“ mit einer Zeile je Rufgruppe und den Teilnehmern als Kacheln, daneben den Nachrichtenweg: was beim LdF, vor der FmZ und vor dem Sichter wartet.

**Zuerst:** Mit „Rufgruppe anlegen“ die Gruppen des Einsatzes eintragen (beim Tippen des Namens schlägt die Maske Gruppen aus dem THW-Standard-Fleetmapping vor, Stand 06/2024; Pfeil ab und Enter oder Klick übernehmen, jeder andere Name bleibt als eigene Rufgruppe möglich), dann in der Zuordnung die Gruppe „ohne Rufgruppe“ abarbeiten: Doppelklick auf die Zelle „Rufgruppe“, Gruppe wählen, Enter. Der Funkhinweis wird ebenso in seiner Zelle geschrieben. Doppelklick auf den Namen einer Einheit (oder ✎) öffnet „Funk und Erreichbarkeit“: weitere Rufgruppen, Funkrufname und Erreichbarkeit überschreiben, Funkprobe eintragen, Funkauszug des Tagebuchs. Strg+E bearbeitet die links gewählte Rufgruppe. Für die Funkprobe eine Einheit in der Zuordnung anklicken, dann Strg+P (Kontakt, Funkzeit jetzt) oder „kein Kontakt …“ (fragt nach dem Grund).

**Gut zu wissen:** Die Rufgruppe gilt für die ganze Einheit, nicht je Fahrzeug, und sie bleibt beim Verschieben in einen anderen Bereich stehen; „Bereich ≠ Gruppe“ weist nur darauf hin. Eine aufgelöste Rufgruppe setzt ihre Einheiten nicht um: Sie stehen danach als „ohne Rufgruppe“, bis jemand sie neu zuordnet. Der Funkrufname kommt aus dem ersten Fahrzeug der Einheit mit Funkrufnamen; ein Override in der Maske ersetzt ihn, ein leerer Override gibt ihn zurück. Mithörer zählen nicht als „zugeordnet“: Gerufen wird eine Einheit über ihre Hauptrufgruppe. „Letzter Kontakt“ ist die jüngere von Funkprobe „Kontakt“ und Statusmeldung (Funkzeit, sonst Eingabezeit); älter als die Schwelle (Vorbelegung 60 Minuten, einstellbar in der Werkzeugzeile, gilt für alle Arbeitsplätze) wird er Bernstein. Eine Probe „kein Kontakt“ setzt den letzten Kontakt nicht zurück, sie steht daneben. Einheiten in Rufbereitschaft, Einsatzvorbehalt, Angefordert und Rückmarsch werden nie Bernstein.

**Kürzel:** Strg+N · Strg+P · Strg+F

### Versorgung

Die Ansicht des S4: Mahlzeitenplan je Bereich mit Ausgabestelle und Bestellung der nächsten Mahlzeit, die Vorausschau der nächsten 24 oder 48 Stunden mit Zu- und Abgängen, Unterkünfte mit Belegung und Zuweisung, das Logistikblatt am Bildschirm und die Abarbeitung des Sofortbedarfs aus den Bögen.

**Zuerst:** Oben im Band die Zahlen des Tages lesen, dann mit dem Umschalter die Unteransicht wählen. „Nächste 24 h“ beantwortet, wie viel Essen zu welcher Mahlzeit gebraucht wird; „Unterbringung“ zeigt, wer noch kein Bett hat: Unterkunft anlegen, dann in der Spalte „Unterkunft“ wählen und „Zuweisen“ drücken oder an der Unterkunftskarte eine Einheit wählen.

**Gut zu wissen:** Gezählt werden alle erfassten Einheiten der Einsatzbereiche, auch in Ruhe — nicht die Ist-Stärke des Kopfbands. Der Anmarsch steht getrennt daneben und geht nur in die Vorausschau ein, und nur mit gemeldeter Eintreffzeit; was keine Zeit trägt, steht als „nicht eingerechnet“ in der Liste. Bestellung, Zuweisung, Mahlzeitenregel und „erledigt“ sind Ereignisse: Sie gelten für alle Arbeitsplätze, stehen im Tagebuch und lassen sich zurücknehmen.

### Kosten

Die Abrechnung: PSA, VDA, Unterkunft und Verpflegung je Einheit.

**Zuerst:** Oben die vier Parameter des Einsatzes setzen.

**Gut zu wissen:** Die Parameter gehören zum Einsatz und nicht zu diesem Rechner: Sie gelten für alle Arbeitsplätze.

### Ausgaben

Druck, Status-Matrix, Einheitenliste, Auswertung, Log und Kostenübersicht als HTML, PDF oder Tabelle. Die Einheitenliste ist die Stärketabelle auf Papier: alle Bereiche mit Zwischensumme und jede Einheit darunter — für die Lagebesprechung und für den Rechnerausfall. Alle Ausgaben nennen die Ist-Stärke wie das Kopfband und trennen davon die erwarteten Kräfte; Summen über alle Einheiten heißen „Alle erfassten Einheiten“. Das Log-Blatt ist Bedarfsplanung (Verpflegung, Unterbringung) und zählt alle Einheiten der Einsatzbereiche, auch im Anmarsch. Die Kontrollsummen der Status-Matrix nennen bei einer Abweichung die Menge und die betroffenen Einheiten mit Namen. Darunter wird der Einsatz abgeschlossen: beenden, Einsatzakte erzeugen, archivieren.

**Zuerst:** Ausgabe und Format wählen; die Datei landet im Ordner „ausgaben“ des Einsatzes. Mit „Öffnen“, „Ordner zeigen“ und bei HTML „Drucken“ geht es von dort weiter.

**Gut zu wissen:** Der Dateiname trägt den Zeitpunkt. Eine zweite Ausgabe überschreibt die erste nicht. Ein beendeter Einsatz nimmt keine Eingaben mehr an, bis er wiedereröffnet wird; ein archivierter gar keine mehr — an keinem Arbeitsplatz.

### Diagnose

Wer sonst am Einsatz arbeitet, wie weit die Stände auseinander sind, wo die Protokolldatei liegt.

**Zuerst:** Von oben nach unten lesen: zutreffende Störfälle, Arbeitsplätze, Pfade.

**Gut zu wissen:** Ein Rückstand bei einem Arbeitsplatz ist kurz nach dessen Eingabe normal. Erst ein stehender Rückstand ist eine Auskunft.

<!-- ANSICHTEN ENDE -->

## Tastenkürzel

<!-- TASTENKARTE ANFANG — erzeugt, nicht von Hand ändern -->

### Allgemein

| Taste | Was sie tut | In der Excel |
|---|---|---|
| Strg+N | Neuen Eintrag anlegen — Abschnitt oder Einheit, je nach gewählter Ansicht | Strg+N (Zeilen einfügen) |
| Strg+E | Gewählten Eintrag entfernen; verlangt einen Grund | Strg+E (Zeilen entfernen) |
| Strg+M | Gewählte Einheiten in einen anderen Abschnitt verschieben | Strg+M (Zeilen verschieben) |
| Strg+F | In die Suche springen | — |
| Strg+Z | Letzte eigene Aktion zurücknehmen | — |
| Strg+H | Abkürzungsliste und Tastenkarte öffnen | Strg+H (AküLi) |

### Masken

| Taste | Was sie tut | In der Excel |
|---|---|---|
| Strg+D | „Jetzt“ in das Zeitfeld schreiben, in dem der Cursor steht | Strg+D (=Now in die aktive Zelle) |
| Enter | Maske bestätigen | — |
| Escape | Maske abbrechen, Auswahl aufheben | — |

### Einheiten

| Taste | Was sie tut | In der Excel |
|---|---|---|
| Strg+Q | Erfassungsbogen vom Handscanner einlesen | Strg+Q (digitaler EEB in neue Zeile) |
| Strg+K | Markierte Einheit als neue, angeforderte Zeile kopieren — ohne Aufträge, Fahrzeuge, Personen und Zeiten | Strg+K (Zeilen kopieren) |
| Strg+P | Funkprobe „Kontakt“ für die markierte Einheit eintragen (Blatt Funkplan), Funkzeit jetzt | — |

<!-- TASTENKARTE ENDE -->

## Wenn etwas klemmt

Im Programm: Fenstermenü **„⋯“ → Diagnose**, oder Strg+H und der Reiter
„Störfälle“.

<!-- STÖRFALLMATRIX ANFANG — erzeugt, nicht von Hand ändern -->

### Der Share ist nicht erreichbar

**Woran es auffällt:** Die Statuszeile zeigt „Share nicht erreichbar“, die Liste der anderen Arbeitsplätze altert, und die Zahl der unübertragenen Bytes wächst.

**Was dahintersteckt:** Netzwerk, NAS oder Freigabe sind weg. Der eigene Rechner schreibt weiter — in den Zwischenspeicher.

1. Weiterarbeiten, solange das Fenster den Dienst erreicht. Alles Eingetippte bleibt erhalten und wird übertragen, sobald der Share wieder da ist.
2. Antwortet im Browser der Dienst selbst nicht („Dienst nicht erreichbar“), sperrt die Seite die Eingabe und speichert nichts: dann auf Papier weiterarbeiten und später nachtragen. Die Vordrucke (Meldeblock, Einheitenliste, Funkprotokoll) stehen im Reiter „Exporte“ unter „Papier-Vordruck“ — am besten schon vorab ausdrucken.
3. Jemanden zum NAS schicken: Strom, Netzwerkkabel, Freigabe.
4. Kommt der Share nicht wieder: An **einem** Rechner weiterführen und den anderen sagen, dass sie nur noch mitlesen.
5. Ist der Share wieder da, gleicht sich der Stand von selbst ab; die Statuszeile zeigt es.

**Nicht:** Die Anwendung neu starten. Das holt den Share nicht zurück und kostet den offenen Stand der Masken.

Grundlage: KONZEPT-SPEICHER.md §5.3, §6.4

### Die Uhr eines Arbeitsplatzes weicht ab

**Woran es auffällt:** Die Diagnoseansicht meldet für einen Arbeitsplatz eine Abweichung von mehr als zwei Minuten. In Listen stehen Zeitpunkte, die nicht zur Lage passen.

**Was dahintersteckt:** Auf dem betroffenen Rechner geht die Systemuhr falsch, meist nach einem Kaltstart ohne Netz.

1. Die Uhr des betroffenen Rechners stellen — Zeitzone mit prüfen.
2. Die bereits erfassten Einträge stehen richtig in der Reihenfolge; nur ihre angezeigten Zeitpunkte sind schief.
3. Zeitpunkte, die für die Auswertung zählen, dort nachtragen, wo sie eingetippt werden — sie sind ein Feld und keine Systemzeit.

**Nicht:** Die Uhr während einer laufenden Erfassung zurückstellen und darauf hoffen, dass sich die Reihenfolge korrigiert. Sie tut es nicht, weil sie nie daran hing.

Grundlage: KONZEPT-EREIGNISSE.md §2.5, §2.6

### Zwei Arbeitsplätze haben dasselbe Feld geändert

**Woran es auffällt:** Die Diagnoseansicht zählt Konflikthinweise; in der Maske steht der Wert des einen, nicht der des anderen.

**Was dahintersteckt:** Zwei Bediener haben dasselbe Feld geändert, ohne den Stand des anderen gesehen zu haben. Der Fold entscheidet dann nach fester Regel und merkt sich, was er verdrängt hat.

1. Den Hinweis lesen: Er nennt Feld, Gewinner und verdrängten Wert.
2. Fachlich klären, welcher Wert stimmt — das entscheidet ein Mensch und kein Programm.
3. Den richtigen Wert neu eintragen. Damit ist er der jüngste und gewinnt.

**Nicht:** Den Hinweis als Fehler melden. Er ist die Zusage, dass nichts still verschwunden ist (Auflage 6).

Grundlage: KONZEPT-EREIGNISSE.md §2.2a, §3.8

### Ein Programmpaket auf dem Share wird abgelehnt

**Woran es auffällt:** Die Anwendung zeigt statt eines Angebots eine Ablehnung mit Grund.

**Was dahintersteckt:** Das Manifest im Ordner `programm\` passt nicht: fremder Schlüssel, falsche Signatur, ausgetauschte Datei, andere Plattform oder eine ältere Version.

1. Den genannten Grund lesen. „Nicht neuer“ und „andere Plattform“ sind Alltag und kein Vorfall.
2. Bei fremdem Schlüssel oder falscher Signatur: Das Paket **nicht** ausführen, sondern denjenigen fragen, der es abgelegt hat.
3. Ein neues Paket wird abgelegt, indem Datei und Manifest zusammen ersetzt werden — nie die Datei allein.

**Nicht:** Die abgelehnte Datei von Hand aus dem Ordner starten. Die Ablehnung ist der Zweck der Prüfung, nicht ihr Hindernis.

Grundlage: M7.2, Entscheidung 7

### Die Anwendung startet nicht

**Woran es auffällt:** Kein Fenster, oder ein Fenster mit einer Fehlermeldung beim Öffnen des Einsatzes.

**Was dahintersteckt:** Meist die Einstellungsdatei oder der lokale Spiegel, seltener eine Freigabe, auf die der angemeldete Benutzer kein Recht hat.

1. Die Protokolldatei öffnen — ihr Ort steht in der Diagnoseansicht und in der Kurzanleitung.
2. Startet die Anwendung ohne Einsatz, aber nicht mit: Ein anderer Rechner führt den Einsatz weiter, dieser wird nachgezogen.
3. Startet sie gar nicht: Die portable Fassung vom Stick starten. Sie braucht keine Installation und keinen Spiegel.
4. Der lokale Zwischenspeicher darf gelöscht werden. Er wird vom Share neu aufgebaut; die Wahrheit liegt dort.

**Nicht:** Dateien im Einsatzordner auf dem Share löschen oder von Hand bearbeiten. Das ist der einzige Griff, der Daten kostet.

Grundlage: KONZEPT-SPEICHER.md §1.3, §1.4

### Ein Erfassungsbogen lässt sich nicht einlesen

**Woran es auffällt:** Der Handscanner gibt nichts weiter, oder der Eingangskorb meldet einen unlesbaren Bogen.

**Was dahintersteckt:** Der Code ist zu klein gedruckt, grau kopiert, geknickt oder das Papier ist nass. Seltener: Es ist ein Bogen einer anderen Fassung.

1. Den Bogen glätten und flach auflegen; bei Kopien das Original suchen.
2. Hilft das nicht: Die Werte von Hand in die Einheitenmaske eintragen. Der Bogen ist ein Weg und keine Voraussetzung.
3. Den Meldekopf bitten, künftig im Original und nicht als Kopie zu geben.

**Nicht:** Den Bogen wegwerfen, bevor die Werte erfasst sind. Er ist bis dahin die einzige Fassung.

Grundlage: KONZEPT-EREIGNISSE.md §5.8, EXH C159–C172

### Rechner oder Netz fällt aus, Nachrichten laufen auf Papier weiter

**Woran es auffällt:** Das Blatt „Nachrichten“ lässt sich nicht öffnen oder nimmt nichts mehr an, der Posteingang füllt sich nicht, und Nachrichten kommen per Funk, Telefon oder Zettel herein.

**Was dahintersteckt:** Der Arbeitsplatz oder das Netz ist ausgefallen, und der Dienst ist nicht erreichbar. Der Vordruck 1103.1 kommt ohne Rechner aus; die Nachweisung ist dann ein Blatt Papier.

1. Leere Vordrucke nehmen: im Reiter „Exporte“ unter „Papier-Vordruck“ den leeren Nachrichtenvordruck als PDF ausdrucken, am besten schon vorab und in Reserve.
2. Nachrichten von Hand auf dem Vordruck schreiben, die Nummer fortlaufend auf dem Blatt vergeben und die Nachweisung auf Papier weiterführen, mit Uhrzeit und Handzeichen für Aufnahme, Annahme und Beförderung.
3. Läuft der Rechner wieder, die Blätter nacherfassen: im Blatt „Nachrichten“ die Nachricht verfassen beziehungsweise in der Fernmeldezentrale den Eingang aufnehmen, die Zeiten und die Nummer vom Blatt übernehmen und nicht die Uhrzeit des Nacherfassens.
4. Die Nummer nie zurücksetzen und keine Lücke füllen. Eine Nummer, die auf Papier steht, bleibt; kommt sie doppelt vor, markiert die Nachweisung beide Zeilen, und es wird mit neuer Nummer berichtigt.

**Nicht:** Die Nummernfolge nach dem Ausfall neu beginnen oder Nachrichten ohne die Zeiten vom Blatt eintragen. Die Zeiten auf dem Papier sind die Zeiten der Nachricht.

Grundlage: KONZEPT-NACHRICHTEN.md §5, §7, Entscheidung 2

<!-- STÖRFALLMATRIX ENDE -->

## Abkürzungen

Dieselbe Liste zeigt Strg+H. Sie stammt aus dem Blatt „AküLi“ der Excel.
Der Funkplan bringt einige Wörter mit, die dort nicht stehen:

- **FmZ** — Fernmeldezentrale der Führungsstelle; dort sitzen die
  Sprechfunker (SprFu).
- **Rufgruppe** — die Gruppe im Digitalfunk, über die gerufen wird; im
  Analogfunk der Kanal. Jede Einheit hat eine Hauptrufgruppe und kann weitere
  mithören.
- **TMO** — Netzbetrieb über die Basisstationen des Digitalfunks BOS.
- **DMO** — Direktbetrieb von Gerät zu Gerät, begrenzte Reichweite; über ein
  Fahrzeugfunkgerät als **Gateway** ins Netz verbunden, wenn eines steht.

<!-- AKÜLI ANFANG — erzeugt, nicht von Hand ändern -->

### Einheiten

| Kürzel | Bedeutung |
|---|---|
| FM Veg | Fachmodul Vegetationsbrandbekämpfung |
| FGr VersES | Fachgruppe Versorgung und Eigenschutz |
| FM Hfs | Fachmodul Hochleistungsförderpumpensystem |
| FüGr FB Nds | Führungsgruppe Feuerwehrbereitschaft Nds |
| FZ BS | Fachzug Brandschutz |
| FZ TH | Fachzug Technische Hilfe |
| FZ VegBBK | Fachzug Vegetationsbrandbekämpfung |
| FZ WT | Fachzug Wassertransport |
| GE MobHWS | Geräteeinheit mobiles Hochwasserschutzsystem |
| GE SFM | Geräteeinheit Sandsackfüllmaschine (GE SFM) |
| Gr BT | Gruppe Betreuung |
| Gr EV | Gruppe Energieversorgung |
| Gr Fü | Gruppe Führung |
| Gr LT | Gruppe Logistik und Technik |
| Gr San | Gruppe Sanitätsversorgung |
| Gr STau | Gruppe Spezial Tauchen |
| Gr Tau | Gruppe Einsatz Tauchen |
| Gr Vpf | Gruppe Verpflegung |
| Gr WR | Gruppe Wasserrettung |
| GTr W | Gerätetrupp Wassergefahren |
| LG | Löschgruppe |
| St BtL | Staffel Betreuungstransport- und -leitung |
| St Log Schlauch | Staffel Logistik Schlauch |
| St Log WT | Staffel Logistik Wassertransport |
| St PSNV | Staffel Psychosoziale Notfallversorgung |
| St PT | Staffel Patiententransport |
| St Reg | Staffel Registrierung |
| St StrWR | Staffel Strömungswasserrettung |
| St WR | Staffel Wasserrettung |
| StLog WE | Staffel Logistik Wasserentnahme |
| Tr Akl | Trupp Aufklärung Luft |
| TR L | Trupp Logistik schwer |
| Tr Log Schlauch | Trupp Logistik Schlauch |
| Tr LogFü | Trupp Logistik Führung |
| Tr ML | Trupp Melde- und Lotsen |
| Tr T | Trupp Transport Bus 50 |
| Tr TH | Trupp Technische Hilfe |
| Tr VegBBK | Trupp Vegetationsbrandbekämpfung |
| Tr WT | Trupp Wassertransport |
| Z SB | Zug Sanität und Betreuung |
| ZTr | Zugtrupp |
| ZTr WR | Zugtrupp Wasserrettung |

### Fahrzeuge und Geräte

| Kürzel | Bedeutung |
|---|---|
| AB HFS | Abrollbehälter mit Hochleistungsförderpumpensystem |
| AB Log | Abrollbehälter Logistik |
| AB Mulde | Abrollbehälter Mulde |
| AB Veg | Abrollbehälter Vegetationsbrandbekämpfung |
| Anh | Anhänger |
| Anh Bt | Anhänger Betreuung |
| Anh Kühl | Kühlanhänger |
| Anh Log | Anhänger für Logistikzwecke |
| Anh Tank | Anhänger mobile Kraftstoffversorgung |
| Anh Trsp | Anhänger zum Transport |
| Anh Zelt | Anhänger Zelt |
| DLK 23/12 | Drehleiter Korb, Rettungshöhe 23 m, Ausladung 12 m |
| ELW 1 | Einsatzleitwagen 1 |
| ELW 2 | Einsatz Leit Wagen 2 |
| FKH | Feldkochherd |
| FüKw | Führungs Kraftwagen |
| GW Bt | Gerätewagen Betreuungsdienst |
| GW L 7,5 | Gerätewagen Logistik „7,5“ |
| GW L Gr | Gerätewagen Logistik groß |
| GW L kl | Gerätewagen Logistik klein |
| GW San | Gerätewagen Sanitätsdienst |
| GW SpTau | Gerätewagen Spezialtauchen |
| GW Tau | Gerätewagen Tauchen |
| GW Vpf | Gerätewagen Verpflegung |
| GW WGT | Gerätewagen Wassergefahren / Technik |
| GW-L1 Vpf | Gerätewagen Logistik 1 Verpflegung |
| GW-L1BTrMt | Gerätewagen Logistik 1 Betriebsmittel |
| GW-L2 | Gerätewagen Logistik 2 |
| GW-L2 HFS | Gerätewagen-Logistik 2 mit Hochleistungsförderpumpensystem |
| GW-L2 SW | Gerätewagen Logistik 2 Schlauch |
| GW-L2 TH | Gerätewagen Logistik 2 Technische Hilfe |
| GW-L2 Vers | Gerätewagen Logistik 2 Versorgung |
| GW-Str | Gerätewagen Strömungsrettung |
| GW-WR | Gerätewagen Wasserrettung |
| HWB | Hochwasserschutzboot |
| KdoW | Kommando Wagen |
| KOM | Kraft Omnibus |
| Kombi UAV | Kombinationskraftwagen Unbemanntes Luftfahrzeug |
| Kombi-L | Kombinationskraftwagen Logistik |
| Krad | Kraftrad |
| KTW | Kranken Transport Wagen |
| LF 20/16 | Löschfahrzeug 20/16 (2000 ltr/min, 1600 ltr Tank) |
| LF KatS | Löschgruppenfahrzeug Katastrophenschutz |
| LKW K | Lastkraftwagen Kipper |
| LZ FW | Löschzug Feuerwehr |
| Mat Cont | Materialcontainer |
| MTW | Mannschaft Transport Wagen |
| MTW Bt | Mannschaft Transport Wagen Betreuung |
| MTW Vpf | Mannschaftstransportwagen Verpflegung |
| MTWm | Mannschaftstransportwagen multifunktional |
| MZB KatS | Mehrzweckboot Katastrophenschutz |
| NEA 250 | Netzersatzanlage 250 kVA |
| NEA LiMa | Netzersatzanlage mit Lichtmast |
| Raft | Schlauchboot |
| RTW | Rettungswagen |
| RW | Rüstwagen |
| SMF | Sandsackfüllmaschine, elektromechanisch |
| SW KatS | Schlauchwagen Katastrophenschutz |
| TB KS 6000 L | mobiler Tankbehälter Kraftstoff 6000 Liter |
| TLF 16/25 | Tank Löschfahrzeug 16/25 (1600 ltr/min, 2500 ltr Tank) |
| TLF 2000 | Tanklöschfahrzeug 2000 |
| TLF 3000 | Tanklöschfahrzeug 3000 |
| TSF | Tragkraftspritzen Fahrzeug |
| UslG | Umschlaggerät |
| WLF | Wechsellader Fahrzeug |
| ZTrKw | Zugtruppkraftwagen |

### Begriffe der Nachrichten

| Kürzel | Bedeutung |
|---|---|
| FmZ | Fernmeldezentrale: nimmt Nachrichten von außen auf, befördert Ausgänge über Funk, Telefon oder Melder und führt die Nachweisung; jede Nachricht der Führungsstelle läuft über sie. |
| Sichter | Quittiert jeden Eingang mit Uhrzeit und Handzeichen und legt fest, welche Stelle ihn bearbeitet (grün) und wer ihn zur Kenntnis bekommt (blau). |
| LdF | Leiter des Fernmeldebetriebes: legt in der Fernmeldezentrale fest, auf welchem Weg und durch welchen Fernmelder eine Nachricht hinausgeht, und prüft Eingänge, bevor er sie an den Sichter weitergibt. |
| Nachweisung | Die fortlaufend nummerierte Liste aller Ein- und Ausgänge der Fernmeldezentrale; die Nummer steht auf dem Vordruck und ändert sich danach nie. |
| Laufzettel | Der untere Teil des Vordrucks, auf dem der Sichter quittiert, den Verteiler ankreuzt und Vermerke für die Empfänger schreibt. |
| Handzeichen | Ihr Kürzel aus zwei bis vier Zeichen, meist die Initialen; es steht wie eine Unterschrift auf jedem Vermerk, im Einsatztagebuch und auf dem Vordruck. |
| Vorrang | Wie eilig eine Nachricht ist: ohne Kreuz einfach, sonst Sofort oder Blitz; Blitz geht vor Sofort vor einfach, und Vorrang wird sparsam vergeben. |
| Sofort | Vorrangstufe für eine Nachricht, die vor allen einfachen Nachrichten befördert und bearbeitet wird. |
| Blitz | Höchste Vorrangstufe für eine Nachricht, bei der es um Leben oder unmittelbare Gefahr geht; sie geht allem anderen vor und meldet sich mit Ton. |
| Spruch | Eine Nachricht an eine bestimmte Gegenstelle, die sie Wort für Wort aufnimmt und quittiert. |
| Durchsage | Eine Nachricht an mehrere Empfänger zugleich, etwa an alle Teilnehmer eines Funkkreises, ohne dass jeder einzeln antwortet. |
| Gesprächsnotiz | Ein Telefonat oder Gespräch, das Sie selbst als Nachricht festhalten; es wird nicht übermittelt, sondern nachgewiesen und von Ihnen oder vom Sichter verteilt. |
| Kopiefarbe (rot/grün/blau) | Die Farbe im Verteiler: grün bearbeitet die Nachricht, blau nimmt sie zur Kenntnis, rot geht an S2 für Lagekarte und Einsatztagebuch. |
| Datum-Zeit-Gruppe | Zeitangabe als Tag, Stunde, Minute, Monat und Jahr in einem Wort, etwa 171045NOV26 für den 17. November 2026 um 10:45 Uhr. |
| Übermittlungswunsch | Auf welchem Weg der Verfasser die Nachricht befördert haben möchte (Funk, Telefon, Telefax, DFÜ, Kurier/Melder); die Fernmeldezentrale kann anders entscheiden. |
| Abfassungszeit | Wann der Verfasser die Nachricht geschrieben hat, als Datum-Zeit-Gruppe; beim Eingang die Zeit, die der Absender draußen nennt. |

<!-- AKÜLI ENDE -->
