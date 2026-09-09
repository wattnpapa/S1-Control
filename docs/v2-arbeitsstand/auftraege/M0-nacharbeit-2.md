# M0 — zweite Nacharbeit

Die erste Nacharbeit ist abgeschlossen (Sitzung 2026-09-09, Commits `ed2a204`
bis `ccda1f9`). Sie hat alle sechs Aufgaben erledigt und dabei einen Befund
erzeugt, der größer ist als die Aufgabe: Der wiederholte Sweep fällt in sechs
von achtzehn Läufen, und die Ursache liegt in §4.6.

## Was Du zuerst liest

1. `docs/v2/messungen/M0.4-simulation.md`, Abschnitte **7.5** und **7.6**. 7.5
   ist der Sweep samt Ursache, 7.6 sind sechs unbearbeitete Befunde des dritten
   Gutachterdurchgangs.
2. `docs/v2/04-OFFENE-ENTSCHEIDUNGEN.md`, Nummern **14, 15, 16**. Alle drei
   sind für Johannes aufbereitet und **nicht getroffen**.

## Die Sperre

**Entscheidung 16 gehört Johannes.** §4.6 sagt nicht, ab welcher Stelle das
Ersatzsegment übernimmt; der Code nimmt den aufgezeichneten
Übertragungsstand, die Share-Datei ist aber nur bis zur Beschädigungsstelle
lesbar, und die Zeilen dazwischen sind für jeden Leser fort. Drei Richtungen
stehen in der Entscheidung. **Frag nach, bevor Du §4.6 anfasst** — 14 und 16
betreffen dieselbe Stelle und sollten zusammen entschieden werden.

Solange sie offen ist, bleibt der Sweep rot. Das ist kein Grund, ihn zu
schönen.

## Aufgaben, nach Wichtigkeit

**1. Das Abnahmekriterium misst zu milde — an zwei Stellen.** Beides steht in
7.6, beides ist beobachtet, beides ist Code und keine Konzeptfrage.
  * `bericht.ts:23–44` nimmt `beschaedigung`, `profilKlon`,
    `schreibrechtEntzug` und `lokaleSchreibstoerung` von der Mangelprüfung
    aus. Ein Lauf kann grün sein, ohne §8.2 und §4.6 berührt zu haben. Zieh
    sie in die Prüfung — und erwarte, dass danach mehr Läufe fallen.
  * `lauf.ts:439–473` baut die Sollmenge aus den überlebenden lokalen Dateien.
    Eine gelöschte Zeile fehlt auf beiden Seiten und fällt nicht auf. Die
    Ist-Menge liegt bereit: `klient.ts:301` sieht jede geschriebene
    Ereignis-Identität. Führ sie mit.

**2. Vorläufige Quarantäne zählt wie endgültige.** `klient.ts:163–169`,
`konvergenz.ts:235–236`. §8.1 führt sie ausdrücklich als „kein Fehler", §8.6.1
Regel 3 meint die aus §8.2. Trenn die Herkunft. Das ist der wahrscheinlichste
Grund dafür, dass Startwert 999 zwei Phasen ohne Konvergenznachweis hat —
prüf das nach, statt es anzunehmen.

**3. Startwert 3 aufklären.** Er verliert **ohne** die Korrektur aus `ed2a204`
kein Ereignis und **mit** ihr sieben (Tabelle in 7.5). Das ist kein Beleg für
einen Rückschritt — jede Verhaltensänderung verschiebt den ganzen Ablauf —
aber es ist auch nicht ausgeräumt. Nimm den Diagnoseweg aus 7.5: Lauf mit
festem Ordner, dann lokale und Share-Segmente Zeile für Zeile
gegenüberstellen.

**4. Die vier übrigen Befunde aus 7.6.** `darfLoeschen` für unberührte
Kennungen, der bis zum Neustart unsichtbare Klon, und die zwei Kommentare, die
das Gegenteil dessen sagen, was der Code tut. Die Kommentare zuerst — sie sind
billig und sie führen den nächsten Leser in die Irre.

**5. Sweep wiederholen.** Achtzehn Startwerte, frischer Ordner je Lauf. Das
Skript steht in 7.5. Erwartung nach 1 bis 4: Die Läufe fallen aus *benannten*
Gründen oder gar nicht.

## Was nicht Gegenstand ist

* **M0.5** ist ungetestet, weil kein NAS verfügbar war. Bleibt liegen, bis
  Johannes eines stellt.
* **§4.6 selbst** — siehe Sperre.

## Vorgehen

Unverändert gegenüber der ersten Nacharbeit: Qualitätsgates je Commit
(`tsc -b`, ESLint, Vitest), kleine thematisch getrennte Commits, jeder neue
Test mit einer Mutation des Produktionscodes geprüft und die Mutation über
eine **frisch** angelegte Sicherungskopie zurückgenommen, Kommentare mit den
Paragraphen von KONZEPT-SPEICHER.md mitziehen.

Am Ende: was gemacht wurde, die Commit-Hashes, die Gates im Wortlaut, das
Sweep-Ergebnis, der CI-Stand je Betriebssystem — und ausdrücklich alles, was
NICHT erfüllt ist.
