# language: de
Funktionalität: Ausgang über den Nachrichtenvordruck
  Als Stelle der Führungsstelle
  möchte ich eine Nachricht nach außen aufgeben
  und sehen, wann und wie die Fernmeldezentrale sie befördert hat,
  so wie die grüne Kopie des Vierfachvordrucks zu mir zurückkommt.

  Bezug: Lehrunterlage Führungsstelle (Folien 14 bis 30), DV 810,
  KONZEPT-NACHRICHTEN.md §5 „Ausgang“ und §11.

  Hintergrund:
    Angenommen ein Einsatz ist angelegt
    Und in der Präsenz stehen diese Arbeitsplätze
      | Stelle | Handzeichen |
      | S4     | Ru          |
      | FMZ    | Ha          |
      | LDF    | Sch         |
      | S2     | Mü          |
    Und die Station LdF ist für den Einsatz eingeschaltet

  Szenario: S4 verfasst eine Nachricht an den OV Wildeshausen und sie wird übermittelt
    Wenn S4 eine Nachricht mit diesen Angaben verfasst
      | Feld           | Wert                                   |
      | Anschrift      | OV Wildeshausen                        |
      | Betreff        | Sandsäcke anfordern                    |
      | Inhalt         | Erbitten 500 Sandsäcke an Deich Nord.  |
      | Vorrang        | Sofort                                 |
      | Abfassungszeit | vor 2 Minuten                          |
    Dann steht die Nachricht im Ausgang von S4 als "vor der FmZ"
    Wenn die FmZ die Nachricht annimmt
    Dann trägt die Nachricht den Annahmevermerk mit Uhrzeit und Handzeichen "Ha"
    Und hat die Nachricht den Laufzustand "beim LdF"
    Wenn der LdF als Übertragungsmittel "Funk" festlegt
    Dann trägt die Nachricht die Wegfestlegung "Funk" mit Handzeichen "Sch"
    Wenn der Fernmelder die Nachricht über "Funk" an "Heros Wildeshausen 10" befördert
    Und die FmZ die Nachricht unter Nummer 1 nachweist
    Dann steht die Nachricht in der Nachweisung als "A 1"
    Und steht die Nachricht im Ausgang von S4 als befördert mit Zeit und Handzeichen "Ha"
    Und ist die grüne Kopie an S4 zurück
    Und liegt die Nachricht im Posteingang von S2 als rote Kopie
    Und zeigt das Einsatztagebuch zur Nachricht diese Zeilen in dieser Reihenfolge
      | Vorgang        | enthält                 |
      | verfasst       | aufgegeben              |
      | angenommen     | Hz. Ha                  |
      | Weg festgelegt | Funk                    |
      | befördert      | Heros Wildeshausen 10   |
      | nachgewiesen   | Nachricht A 1           |
    Und nennt jede Tagebuchzeile der Nachricht "Nachricht A 1"

  Szenario: Eine Blitz-Nachricht steht vor einer Sofort-Nachricht in der Warteschlange der FmZ
    Wenn S4 eine Nachricht "Lage ruhig" mit Vorrang "Sofort" verfasst
    Und S4 eine Nachricht "Deichbruch Nord" mit Vorrang "Blitz" verfasst
    Dann zeigt die Warteschlange der FmZ "Deichbruch Nord" vor "Lage ruhig"

  Szenario: Eine angenommene, nach 25 Minuten nicht beförderte Nachricht steht über der Schwelle
    Wenn S4 eine Nachricht "Verpflegung anfordern" mit Vorrang "einfach" verfasst
    Und die FmZ die Nachricht vor 25 Minuten angenommen hat
    Dann steht die Nachricht in der Warteschlange der FmZ über der Schwelle
    Und zählt das Band der FmZ 1 Nachricht über der Schwelle
