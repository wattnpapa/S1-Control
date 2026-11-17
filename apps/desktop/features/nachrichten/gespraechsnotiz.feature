# language: de
Funktionalität: Gesprächsnotiz auf dem Nachrichtenvordruck
  Als Stelle, die telefoniert oder persönlich spricht,
  möchte ich das Gespräch auf dem Vordruck festhalten (Kreuz in Feld 12)
  und selbst bestimmen, wer Kenntnis bekommt, oder es dem Sichter geben.

  Bezug: Lehrunterlage Führungsstelle (Folien 16 und 28),
  KONZEPT-NACHRICHTEN.md §5 „Gesprächsnotiz“ und §11 Entscheidung 2.

  Hintergrund:
    Angenommen ein Einsatz ist angelegt
    Und in der Präsenz stehen diese Arbeitsplätze
      | Stelle  | Handzeichen |
      | S1      | Ko          |
      | S4      | Ru          |
      | S2      | Mü          |
      | FMZ     | Ha          |
      | SICHTER | Si          |

  Szenario: S1 telefoniert mit dem OV und hält das Gespräch fest
    Wenn S1 ein Gespräch als Gesprächsnotiz mit diesen Angaben festhält
      | Feld      | Wert                                       |
      | Absender  | OV Wildeshausen                            |
      | Anschrift | S1                                         |
      | Ruf-Nr.   | 04431 12345                                |
      | Betreff   | Ablösung Bergungsgruppe                    |
      | Inhalt    | Ablösung trifft um 18 Uhr am Deich Nord ein. |
    Dann trägt die Nachricht keinen Beförderungsvermerk
    Und steht die Nachricht nicht in der Warteschlange der FmZ
    Wenn S1 die Nachricht selbst an "S4 grün, S2 rot" verteilt
    Dann liegt die Nachricht im Posteingang von S4 als grüne Kopie
    Und ist die Nachricht im Posteingang von S4 neu
    Wenn die FmZ die Nachricht unter Nummer 3 nachweist
    Dann steht die Nachricht in der Nachweisung als "E 3"
    Und zeigt das Einsatztagebuch zur Nachricht diese Zeilen in dieser Reihenfolge
      | Vorgang      | enthält                     |
      | verfasst     | Gesprächsnotiz              |
      | gesichtet    | verteilt an S4 (grün), S2 (rot) |
      | nachgewiesen | Gesprächsnotiz E 3          |

  Szenario: S1 gibt die Gesprächsnotiz dem Sichter, statt selbst zu verteilen
    Wenn S1 ein Gespräch als Gesprächsnotiz mit diesen Angaben festhält
      | Feld      | Wert                           |
      | Absender  | Polizei Wildeshausen           |
      | Anschrift | S1                             |
      | Ruf-Nr.   | 110                            |
      | Betreff   | Sperrung B 213                 |
      | Inhalt    | B 213 ab 16 Uhr voll gesperrt. |
    Dann hat die Nachricht den Laufzustand "vor dem Sichter"
    Und steht die Nachricht nicht in der Warteschlange der FmZ
    Wenn der Sichter die Nachricht quittiert und an "S2 rot, S4 grün" verteilt
    Dann liegt die Nachricht im Posteingang von S2 als rote Kopie
    Und zeigt das Einsatztagebuch zur Nachricht diese Zeilen in dieser Reihenfolge
      | Vorgang     | enthält            |
      | festgehalten | Gesprächsnotiz E  |
      | gesichtet   | Hz. Si             |
