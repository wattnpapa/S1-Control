# Drehbuch für die Übung „Nachrichten"

Diese Übung prüft den 4-fach-Vordruck in S1-Control an dem Ort, an dem er
hingehört: in der Führungsstelle, mit den Stellen, die ihn auf Papier
bedienen. Was ohne Rechner der Führungsstelle nachweisbar war, ist
nachgewiesen: `npm run test:bdd` fährt die Szenarien aus
`apps/desktop/features/nachrichten/` (Ausgang, Eingang, Gesprächsnotiz) gegen
den Aktendienst, und `docs/v2/entwurf/nachrichten/stand/` zeigt die Blätter
aus der Web-Schale. Was dort nicht geprüft werden konnte, prüft diese Übung:
den stillen Druck am Drucker der Führungsstelle, den Share mit mehreren
Rechnern, den Wechsel auf Papier, und ob die Stellen ohne Einweisung finden,
was sie brauchen. Die fünf Rollen-Audits unter `docs/audits/nachrichten/`
nennen, worauf die Reviewer gestoßen sind; die Übung sagt, ob es im Betrieb
noch stört.

Sie braucht fünf Rechner (vier gehen, wenn LdF und Fernmelder einen Platz
teilen), ein NAS, einen Drucker, einen Block 4-fach-Vordrucke und einen
Nebenraum mit Funkgerät oder Telefon als Gegenstelle. Zwei Stunden.

## Vorbereitung

* Share nach [BETRIEB.md](BETRIEB.md) eingerichtet, fünf Arbeitsplätze
  eingetragen, jeder mit eigenem Anzeigenamen („S3 Platz", „FmZ 1", „LdF",
  „Sichter", „S2 ETB").
* Auf jedem Rechner die Anwendung installiert und einmal gestartet.
* Am Platz der FmZ der Drucker eingerichtet: Fenstermenü, Einstellungen,
  Automatikdruck auf „Drucker", Probedruck. Der leere Vordruck muss aus dem
  Drucker kommen, bevor die Übung beginnt. Geht das nicht, Automatikdruck auf
  ein Verzeichnis auf dem Share stellen und den Grund notieren.
* Am Platz des S2 Automatikdruck ebenfalls an, auf denselben Drucker.
* Ein Block 4-fach-Vordrucke und ein Stift an jedem Platz; die Nachweisung
  auf Papier (Blatt mit laufender Nummer) am Platz der FmZ.
* Im Nebenraum eine Person als Gegenstelle „Heros Wildeshausen 10" mit
  Funkgerät oder Telefon, mit drei vorbereiteten Meldungen (siehe Minute 15,
  35, 65).
* Diese Seite ausgedruckt, dazu die [Kurzanleitung](KURZANLEITUNG.md) für
  jeden Platz. Die Handbuchabschnitte „Nachrichten" liest vorher niemand,
  das ist Absicht.

Rollen und Stellen: Platz 1 ist S3 (Handzeichen des Bedienenden), Platz 2
Fernmelder mit Stelle FMZ, Platz 3 LdF mit Stelle LDF, Platz 4 Sichter,
Platz 5 S2 und ETB-Führer. Wer welchen Platz hat, bleibt bis Minute 55
gleich; dann wechselt der Sichter, das gehört zur Übung. Ein Beobachter mit
Uhr und Block schreibt mit, wann jede Nachricht auf welchem Platz sichtbar
wird; er bedient nichts.

## Ablauf

**Minute 0 — Einsatz und Stellen.** Platz 1 legt den Einsatz an: „Übung
Hochwasser Wildeshausen", Art Übung, heutiges Datum, FüSt „FüSt OV
Oldenburg". Alle fünf öffnen ihn. Jeder beantwortet die Abfrage nach Stelle
und Handzeichen, ohne dass ihm jemand sagt, was das ist. Platz 1 schaltet in
der Stammdatenmaske „LdF als eigene Station" ein und lässt die Schwelle der
FmZ auf 20 Minuten. *Prüfen: Jeder Platz zeigt im Blatt Nachrichten „Meine
Stelle" mit Handzeichen; die Statuszeile nennt vier weitere Arbeitsplätze.*

**Minute 5 — Ausgang mit Vorrang.** Platz 1 verfasst eine Nachricht an
„Heros Wildeshausen 10": Betreff „Sandsäcke anfordern", drei Zeilen Text im
Befehlsschema, Vorrang Sofort, Übermittlungswunsch Funk. Vor dem Aufgeben
klappt er die Vorschau auf und vergleicht sie mit dem Papiervordruck. Dann
aufgeben. Der Beobachter stoppt die Zeit, bis Platz 2 die Nachricht in der
Warteschlange sieht und den Hinweis mit Ton bekommt. Platz 2 nimmt an.
Platz 3 schlägt den Weg vor (Funk, Fernmelder „Ha"). Platz 2 befördert über
Funk an die Gegenstelle. Das Feld „Quittung der Gegenstelle" ist beim
Befördern leer und Pflicht: Platz 2 wartet, bis die Gegenstelle den Empfang
quittiert hat, und trägt deren Uhrzeit ein (Strg+D setzt „jetzt"); vorher
geht „Befördern" nicht. Dann weist er mit Nummer 1 nach. *Prüfen: Das Feld
war leer und trug nicht die Zeit des Öffnens; Platz 1 sieht im Ausgang
„angenommen (FmZ) … · Quittung der Gegenstelle … (Funk)", vorher „… · noch
nicht übermittelt", mit Nummer A 1; Platz 5 hat die rote Kopie im Posteingang; die Gegenstelle
hat die Nachricht wörtlich mitgeschrieben, und der Beobachter vergleicht
sie mit dem Vordruck.*

**Minute 15 — Eingang über Funk.** Die Gegenstelle gibt eine Lagemeldung
durch: „Pumpen eingetroffen, Einsatzstelle Deich Nord, 0 Verletzte" an
„FüSt OV Oldenburg", mit Abfassungszeit. Platz 2 nimmt sie während des
Funkspruchs in der Maske auf, nicht danach, und weist mit Nummer 2 nach.
Wer die Stelle FmZ nicht hat, bekommt beim Aufnehmen den Hinweis „Dieser
Teil ist der Fernmeldezentrale vorbehalten … Trotzdem eintragen?"; dasselbe
gilt für den Papier-Nachtrag mit Annahme, Beförderung oder Nummer und für
„Sichten" ohne die Stelle Sichter. „Trotzdem" gibt frei, das Tagebuch
vermerkt den Grund. Platz 2 hat die Stelle FmZ und sieht keinen Hinweis.
Platz 2 öffnet die Maske in der Sicht „Fernmeldezentrale" mit Strg+N, ohne
die Maus; die Tabulatortaste führt durch alle Felder bis zum Knopf.
Platz 3 gibt an den Sichter weiter. Platz 4 quittiert und verteilt: S2 rot,
S3 grün, Leiter blau. *Prüfen: Platz 1 bekommt die Nachricht als „grün:
bearbeiten", nimmt Kenntnis und erledigt; Platz 5 sieht sie rot; die Zeit
von Aufnahme bis Verteilung steht im Block des Beobachters. Wenn Platz 2
beim Tippen hinter dem Funkspruch zurückbleibt, aufschreiben, an welchem
Feld.*

**Minute 25 — Gesprächsnotiz.** Platz 1 telefoniert mit der Gegenstelle
(Rückruf zur Sandsackmenge) und hält das Gespräch als Gesprächsnotiz fest,
Ruf-Nr. eingetragen, selbst verteilt an S2 und S4. Platz 2 weist sie mit
Nummer 3 nach. *Prüfen: Die Notiz steht nicht in der Warteschlange der FmZ;
Platz 5 sieht sie im Posteingang; die Nachweisung zeigt 1, 2, 3 ohne Lücke.*

**Minute 35 — Drei Eingänge unter Last.** Die Gegenstelle gibt kurz
hintereinander drei Meldungen durch: eine einfache (Verpflegung), eine
Sofort (Deichsickerung) und eine Blitz (Person im Wasser). Platz 2 nimmt
alle drei auf und weist nach. Platz 3 gibt weiter. Platz 4 bearbeitet in der
Reihenfolge, die das Blatt vorgibt, und sagt laut, welche er zuerst
aufschlägt. *Prüfen: Blitz zuerst, dann Sofort, dann einfach; der Ton beim
Blitz; das Band zeigt „mit Vorrang offen". Platz 4 kreuzt bei der
Blitz-Nachricht absichtlich nur S2 an: Die Warnung „Kein Hauptempfänger"
muss kommen, und er korrigiert. Die Hinweise zu den drei Meldungen stehen
oben rechts über dem Blatt und schieben es nicht nach unten; jede Zeile hat
ein eigenes „×", mit dem Platz 4 nur sie schließt, „Löschen" räumt alle.*

**Minute 45 — Zwei Sichter.** Platz 5 übernimmt zusätzlich die Stelle
SICHTER (Fenstermenü, Stelle und Handzeichen). Beide Sichter öffnen dieselbe
Nachricht (die Sofort-Meldung) und verteilen gleichzeitig an verschiedene
Stellen. *Prüfen: Beide Sichtungen stehen im Tagebuch; die Nachricht trägt
die Marke „zwei Sichtungen"; der Verteiler ist die Vereinigung; wer die
zweite Sichtung schreibt, sieht die Meldung des Workers. Danach gibt Platz 5
die Stelle SICHTER wieder ab.*

**Minute 55 — Der Sichter geht.** Platz 4 schließt die Anwendung mit
„Stelle abgeben". Die Gegenstelle gibt eine weitere Sofort-Meldung durch.
*Prüfen: Platz 2 sieht beim Aufnehmen den Laufzettel mit („Kein Sichter
besetzt") und verteilt selbst; das Tagebuch nennt den Ersatzsichter. Wenn
Platz 4 die Anwendung stattdessen hart beendet (Taskmanager), dauert der
Wechsel bis zum Präsenzverfall; der Beobachter stoppt beide Zeiten.* Danach
öffnet Platz 4 die Anwendung wieder, nimmt SICHTER und sichtet die Meldung
nach: Verteiler ergänzen, Vermerk schreiben.

**Minute 65 — Papier.** Der Rechner von Platz 2 wird ausgeschaltet. Die
Gegenstelle gibt zwei Meldungen durch, eine davon Blitz. Platz 2 nimmt
beide auf dem Papiervordruck auf, führt die Nachweisung auf Papier fort
(nächste Nummern vom Blatt) und trägt den Laufzettel von Hand zum Sichter.
Nach zehn Minuten startet der Rechner wieder; Platz 2 trägt beide
Nachrichten mit „Vom Papier nachtragen" nach, mit den Zeiten, Handzeichen
und Nummern vom Blatt. *Prüfen: Die Nachweisung ist nach dem Nachtrag
lückenlos; die Zeiten im Tagebuch sind die vom Blatt, nicht die Uhrzeit des
Nachtrags; die Störfallmatrix in der Diagnose beschreibt diesen Fall so, wie
er gerade gelaufen ist. Was auf dem Papier stand und in der Maske keinen
Platz hatte, aufschreiben.*

**Minute 80 — Druck.** Platz 1 druckt seine erste Nachricht als Vordruck und
legt sie neben das Papier: Felder 1 bis 20 vergleichen, auch die Kreuze des
Verteilers und die ETB-Nummer in Feld 20. Platz 2 gibt die Nachweisung aus,
Platz 5 das Einsatztagebuch. *Prüfen: Die Nummern in Nachweisung und
Tagebuch stimmen überein; der Automatikdruck hat seit Minute 5 jede
Nachricht für S2 ausgedruckt, der Stapel liegt am Drucker in der Reihenfolge
der Sichtung; fehlt eine, aufschreiben, welche.*

**Minute 90 — Zurückziehen und Berichtigen.** Platz 1 gibt eine Nachricht
mit Tippfehler in der Anschrift auf, zieht sie mit Grund zurück und gibt sie
neu auf. Platz 2 berichtigt eine Nachweisungsnummer. *Prüfen: Beides steht
im Tagebuch unter „Nur Rücknahmen und Berichtigungen"; die zurückgezogene
Nachricht trägt im Vordruck den Stempel; die Nachweisung nennt den Grund.*

**Minute 100 — Übergabe.** Platz 1 wird abgelöst: Ein neuer Bedienender
setzt sich an Platz 1, beantwortet die Stellenabfrage mit S3 und eigenem
Handzeichen und soll ohne Erklärung sagen, was für S3 offen ist. Die Sicht „Offen" steht im
Umschalter gleich nach dem Posteingang; die Einstiegszeile des Blatts nennt
sie für die Übergabe. *Prüfen: Die Sicht „Offen" (oder der Chip „offen") zeigt
die Kopien für S3 ohne „erledigt", die eigenen Ausgänge vor der Beförderung
und nichts, was schon erledigt ist; sie genügt für die Übergabe. Wenn der
Nachfolger ins Tagebuch muss, aufschreiben, wonach er gesucht hat.*

**Minute 110 — Abschluss.** Platz 1 beendet den Einsatz. *Prüfen: Die
Rückfrage nennt die offenen Nachrichten (vor der FmZ, ohne Nummer, mit
Vorrang ungelesen); nach dem Beenden nimmt kein Platz mehr eine Nachricht
an.* Einsatzakte erzeugen und prüfen, dass unter `ausgaben/nachrichten` für
jede nicht zurückgezogene Nachricht ein Vordruck-PDF liegt und Nachweisung
und Tagebuch beiliegen.

## Danach

**Aufschreiben, was gefehlt hat, und es nicht sofort beantworten.** Die
Liste ist das Ergebnis der Übung. Die Zeiten des Beobachters gehören dazu:
Aufgeben bis Warteschlange, Aufnahme bis Verteilung, Beförderung bis
Rücklauf der grünen Kopie, Schließen des Sichters bis Ersatzsichter. Der
Papiervordruck hat für jede dieser Strecken einen Erfahrungswert; wo der
Rechner langsamer ist, steht die Übung im Weg und nicht das Papier.

Vier Fragen an jeden Platz, schriftlich:

1. Wo mussten Sie suchen?
2. Was haben Sie zweimal eingegeben oder zweimal bestätigt?
3. Was stand auf dem Papiervordruck und hatte in der Maske keinen Platz?
4. Welche Angabe haben Sie gebraucht und nicht gefunden: Nummer, Zeit,
   Handzeichen, Verteiler, Stand?

Die Antworten gehören mit Datum unter `docs/audits/nachrichten/` als
`feldtest-<datum>.md`, mit den Kennungen der Audits, wo ein Befund schon dort
steht, und als neue Kennung „FT-n", wo nicht. Danach wird entschieden, was
in die nächste Runde kommt; die Reihenfolge steht in der Befundliste unter
„Was offen bleibt".
