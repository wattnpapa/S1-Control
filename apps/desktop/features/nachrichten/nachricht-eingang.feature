# language: de
Funktionalität: Eingang über den Nachrichtenvordruck
  Als Fernmeldezentrale, Sichter und Sachgebiet
  möchte ich eine Nachricht von außen aufnehmen, nachweisen, sichten und verteilen,
  damit jede Stelle ihre Kopie bekommt und die Erledigung nachvollziehbar ist.

  Bezug: Lehrunterlage Führungsstelle (Folien 16 bis 30), DV 810,
  KONZEPT-NACHRICHTEN.md §5 „Eingang von außen“, „Sichtung“, „Ersatzsichter“.

  Hintergrund:
    Angenommen ein Einsatz ist angelegt
    Und in der Präsenz stehen diese Arbeitsplätze
      | Stelle | Handzeichen |
      | FMZ    | Ha          |
      | LDF    | Sch         |
      | S2     | Mü          |
      | S3     | Kr          |
      | LEITER | Le          |

  Szenario: Eine Lagemeldung des OV Wildeshausen geht über Funk ein und erreicht S3
    Angenommen die Station LdF ist für den Einsatz eingeschaltet
    Und ein weiterer Arbeitsplatz mit der Stelle "SICHTER" und dem Handzeichen "Si" ist in der Präsenz
    Wenn der Fernmelder eine Nachricht mit diesen Angaben aufnimmt
      | Feld        | Wert                                        |
      | Mittel      | Funk                                        |
      | Gegenstelle | Heros Wildeshausen 10                       |
      | Absender    | OV Wildeshausen                             |
      | Anschrift   | FüSt OV Oldenburg                           |
      | Betreff     | Lagemeldung Deich Nord                      |
      | Inhalt      | Deich hält, Pegel fallend, zwei Pumpen in Betrieb. |
    Und die FmZ die Nachricht unter Nummer 2 nachweist
    Dann steht die Nachricht in der Nachweisung als "E 2"
    Und hat die Nachricht den Laufzustand "beim LdF"
    Wenn der LdF die Nachricht an den Sichter weitergibt
    Dann hat die Nachricht den Laufzustand "vor dem Sichter"
    Wenn der Sichter die Nachricht quittiert und an "S2 rot, S3 grün, Leiter blau" verteilt
    Dann trägt die Sichtung Uhrzeit und Handzeichen "Si"
    Und ist die Nachricht im Posteingang von S3 neu
    Und liegt die Nachricht im Posteingang von S3 als grüne Kopie
    Und liegt die Nachricht im Posteingang von S2 als rote Kopie
    Und liegt die Nachricht im Posteingang von Leiter als blaue Kopie
    Und liegt die Nachricht nicht im Posteingang von S1
    Wenn S3 die Nachricht zur Kenntnis nimmt
    Dann ist die Nachricht im Posteingang von S3 gelesen mit Handzeichen "Kr"
    Wenn S3 die Nachricht erledigt
    Dann hat die Nachricht den Laufzustand "verteilt"
    Wenn S2 die Nachricht erledigt
    Und der Leiter die Nachricht erledigt
    Dann hat die Nachricht den Laufzustand "erledigt"
    Und zeigt das Einsatztagebuch zur Nachricht diese Zeilen in dieser Reihenfolge
      | Vorgang       | enthält                                   |
      | aufgenommen   | OV Wildeshausen an FüSt OV Oldenburg      |
      | nachgewiesen  | Nachricht E 2                             |
      | weitergegeben | Hz. Sch                                   |
      | gesichtet     | verteilt an S2 (rot), S3 (grün), Leiter (blau) |
      | Kenntnis      | von S3 zur Kenntnis genommen (Hz. Kr)     |
      | erledigt      | für S3 erledigt                           |

  Szenario: Kein Sichter besetzt — der Fernmelder verteilt beim Aufnehmen selbst
    Angenommen die Station LdF ist für den Einsatz abgeschaltet
    Wenn der Fernmelder eine Nachricht mit diesen Angaben aufnimmt
      | Feld        | Wert                              |
      | Mittel      | Telefon                           |
      | Gegenstelle | OV Wildeshausen, Zugführer        |
      | Absender    | OV Wildeshausen                   |
      | Anschrift   | FüSt OV Oldenburg                 |
      | Betreff     | Pumpen eingetroffen               |
      | Inhalt      | Zwei Pumpen am Deich Nord.        |
      | Verteiler   | S2 rot, S3 grün                   |
    Dann erhält der Fernmelder den Hinweis "Kein Sichter besetzt: Nachricht beim Aufnehmen verteilt."
    Und hat die Nachricht den Laufzustand "verteilt"
    Und liegt die Nachricht im Posteingang von S3 als grüne Kopie
    Und zeigt das Einsatztagebuch zur Nachricht diese Zeilen in dieser Reihenfolge
      | Vorgang     | enthält             |
      | aufgenommen | Pumpen eingetroffen |
      | gesichtet   | Ersatzsichter       |

  Szenario: Zwei Sichter sichten dieselbe Nachricht, der zweite sieht einen Konflikthinweis
    Angenommen ein weiterer Arbeitsplatz mit der Stelle "SICHTER" und dem Handzeichen "Si" ist in der Präsenz
    Und ein weiterer Arbeitsplatz mit der Stelle "SICHTER" und dem Handzeichen "Ko" ist in der Präsenz
    Wenn der Fernmelder eine Nachricht mit diesen Angaben aufnimmt
      | Feld        | Wert                         |
      | Mittel      | Funk                         |
      | Gegenstelle | Heros Wildeshausen 10        |
      | Absender    | OV Wildeshausen              |
      | Anschrift   | FüSt OV Oldenburg            |
      | Betreff     | Fahrzeug ausgefallen         |
      | Inhalt      | MTW ausgefallen, Ersatz nötig. |
    Und beide Sichter den Laufzettel der Nachricht öffnen
    Und der erste Sichter die Nachricht quittiert und an "S2 rot, S3 grün" verteilt
    Und der zweite Sichter die Nachricht quittiert und an "S2 rot, Leiter blau" verteilt
    Dann sieht der zweite Sichter einen Konflikthinweis zur Sichtung
    Und liegt die Nachricht im Posteingang von S3 als grüne Kopie
    Und liegt die Nachricht im Posteingang von Leiter als blaue Kopie
