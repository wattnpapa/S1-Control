# M0 — dritte Nacharbeit: drei entschiedene Konzeptfragen umsetzen

Die zweite Nacharbeit ist abgeschlossen (Sitzung 2026-09-09, Commits `f275d58`
bis `7d19f50`, CI grün auf allen drei Betriebssystemen). Sie hat alle fünf
Aufgaben erledigt, die Entscheidungen 14 und 16 umgesetzt und dabei zwei neue
Konzeptfragen erzeugt. Johannes hat am 2026-09-09 **alle drei noch offenen
entschieden**. Sie sind noch nicht umgesetzt. Das ist dieser Auftrag.

## Was Du zuerst liest

1. `docs/v2/04-OFFENE-ENTSCHEIDUNGEN.md`, Nummern **15, 17, 18**. Alle drei
   sind entschieden; die Richtung steht jeweils in der Überschrift und im
   Absatz „Entschieden am 2026-09-09".
2. `docs/v2/messungen/M0.4-simulation.md`, Abschnitt **7.7**. Dort steht der
   Sweep, aus dem 17 und 18 stammen, samt der Zeile-für-Zeile-Messung an den
   Startwerten 999 und 12345.

## Die Beschlüsse

* **15 → beide Präzisierungen.** §7.6 misst den Fortschritt am **gesehenen
  Dateiende** statt an gelieferten Bytes, und verlangt `2 + ⌈Cache / Takt⌉`
  leere Durchläufe statt zwei.
* **18 → A.** §7.6 nimmt **ersetzte Segmente aus dem Versionsvektor** heraus —
  so wie Bedingung 1 sie schon aus der Ruhephase herausnimmt.
* **17 → B.** Die **Vollprüfung beim Öffnen nimmt die Dateien aufgegebener
  Kennungen wieder auf**; eine Beschädigung dort wird durch ein Ersatzsegment
  unter der **neuen** Kennung repariert.

## Aufgaben, nach Aufwand

**1. Entscheidung 15 — §7.6 nachziehen.** Der billigste Teil: Die Simulation
tut beides seit M0.4 und hat es in Abschnitt 2.1 und 2.2 des Messprotokolls
belegt. Nachzuziehen ist der Konzepttext in `KONZEPT-SPEICHER.md` §7.6 — und
dann zu prüfen, ob außerhalb der Simulation noch etwas §7.6 umsetzt, das
mitzuziehen ist. Der Vermerk in Nr. 15 nennt `s1 akte pruefe` (Paket V.3);
prüf nach, ob das Paket schon existiert, statt es anzunehmen.

**2. Entscheidung 18 — ersetzte Segmente aus dem Vektor.** `erhebeStand` in
`packages/cli/src/simulation/konvergenz.ts` baut den Versionsvektor über alle
lokalen Dateien. `ersetzteSegmente` (`@s1/speicher`) liefert seit `e071ace`
eine Zuordnung Segmentnummer → Übernahmeoffset; die Auskunft ist also da.
Nimm die ersetzten Segmente aus dem Vektor und zieh §7.6 im Konzept nach.

Gegenprobe: Startwert **999** muss danach bestehen. Er fällt heute mit zwei
Phasen „nicht vergleichbar", ohne Verlust, bei identischem Zustand und
identischer Ereignismenge.

**3. Entscheidung 17 — Reparatur in der Datei einer aufgegebenen Kennung.**
Der große Teil. Der Weg ist in Nr. 17 beschrieben; drei Stellen sind
absehbar, prüf sie nach, statt sie zu glauben:

  * `pruefeBeimOeffnen` (`packages/speicher/src/oeffnungspruefung.ts`) bildet
    seine Vergleichsmenge aus `clientPraefix(optionen.clientId)`. Aufgegebene
    Kennungen werden dort seit einer früheren Nacharbeit **bewusst nicht mehr
    gelesen** — der Kommentar sagt warum und was es gespart hat. Der Grund
    fällt jetzt; lies ihn trotzdem, bevor Du ihn umkehrst.
  * **`SegmentErsetzt` muss künftig das Präfix nennen.** Heute nennt die
    Nutzlast nur `ersetztesSegment` und `abOffset`. Steht ein solches Ereignis
    in der Datei einer **anderen** Kennung, hielte `ersetzteSegmente` deren
    Segment gleicher Nummer für ersetzt. Genau deshalb schleppt der
    Kennungswechsel heute keine `SegmentErsetzt`-Zeile mit (Test in
    `akte.test.ts`, „schleppt beim Kennungswechsel auch keine
    SegmentErsetzt-Zeile mit"). Mit 17 B ist das Ersatzsegment einer fremden
    Kennung der Regelfall — die Nutzlast braucht das Präfix, und
    `ersetzteSegmente`, `kettenanker` und die Vollprüfung müssen es auswerten.
    Alte Zeilen ohne Präfix sind als „eigenes Präfix" zu lesen.
  * `#repariere` in `akte.ts` schreibt das Ersatzsegment über
    `schreiber.schreibeErsatzsegment(segment, ansatz)`. Der Schreiber liest
    dafür `#liesEigenesSegment` — das ist bei einer aufgegebenen Kennung eine
    andere Datei.

Gegenprobe: Startwert **12345** muss danach bestehen. Er verliert heute die
zwei Ereignisse `656543703fff2917:377` und `:468`; beide stehen lokal genau an
der Lesbarkeitsgrenze ihrer Share-Datei (24.306 in `65654370.0000.jsonl`,
24.194 in `65654370.0002.jsonl`).

**4. Sweep wiederholen.** Achtzehn Startwerte, frischer Ordner je Lauf,
`dist` während des Sweeps **unverändert** — ein Neubau mittendrin entwertet
den Vergleich, das ist in 7.5 schon einmal passiert. Die Startwerte und das
Vorgehen stehen in 7.7. Erwartung: 999 und 12345 bestehen; übrig bleiben nur
noch die Läufe, in denen eine geforderte Störung nicht eingetreten ist.

## Was nicht Gegenstand ist

* **M0.5** — ungetestet, weil kein NAS verfügbar war. Bleibt liegen, bis
  Johannes eines stellt.
* **Die Wahrscheinlichkeiten in `ALLE_FEHLER`.** `profilKlon` steht auf 0,001
  je Kommando; das sind rund 13 % Wahrscheinlichkeit, in 2.000 Kommandos gar
  nicht einzutreten, und im letzten Sweep fielen 3 von 18 Läufen allein daran.
  Das ist mit Auflage 18 schwer zu vereinbaren — aber jede Änderung an den
  Werten bewertet **jeden** bisherigen Lauf neu. Eigener Schritt, eigene
  Entscheidung, nicht hier nebenbei.

## Vorgehen

Unverändert: Qualitätsgates je Commit (`tsc -b`, ESLint, Vitest), kleine
thematisch getrennte Commits, jeder neue Test mit einer Mutation des
Produktionscodes geprüft und die Mutation über eine **frisch** angelegte
Sicherungskopie zurückgenommen, Kommentare mit den Paragraphen von
KONZEPT-SPEICHER.md mitziehen.

Zwei Erfahrungen aus der zweiten Nacharbeit, die Zeit sparen:

* **Miss nach, statt am Code zu raten.** Die Ursache der Verluste bei
  Startwert 111 lag nicht dort, wo das Protokoll sie vermutete. Ein Lauf mit
  `--verzeichnis` und ein kleines Skript, das lokale und Share-Segmente Zeile
  für Zeile gegenüberstellt, hat sie in wenigen Minuten gezeigt.
* **Prüf die Mutationsprobe wirklich.** Zwei Testfassungen überlebten ihre
  Mutation, weil sie die interessante Stelle gar nicht erreichten. Beide
  mussten nachgeschärft werden.

Am Ende: was gemacht wurde, die Commit-Hashes, die Gates im Wortlaut, das
Sweep-Ergebnis, der CI-Stand je Betriebssystem — und ausdrücklich alles, was
NICHT erfüllt ist.
