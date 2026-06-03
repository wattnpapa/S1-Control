# language: de
Funktionalität: Einsatz-Lifecycle
  Als S1-Offizier
  möchte ich Einsätze anlegen, Einheiten verwalten und deren Stärke überwachen,
  damit ich im Einsatz stets den Überblick über alle Kräfte behalte.

  Hintergrund:
    Angenommen die App ist gestartet und ich bin als admin eingeloggt

  Szenario: Neuen Einsatz anlegen
    Wenn ich einen neuen Einsatz "Hochwasser Testlage" mit FüSt "FüSt 1" anlege
    Dann sehe ich den Workspace mit dem Abschnitt "FüSt 1 [FUEST]"

  Szenario: Einheit im FüSt anlegen
    Wenn ich einen neuen Einsatz "Einheit-Test" mit FüSt "FüSt 1" anlege
    Und ich die Einheit "OV Oldenburg" mit Organisation "THW" und Stärke 9 anlege
    Dann sehe ich "OV Oldenburg" in der Einheitenliste
    Und die Gesamtstärke beträgt 9

  Szenario: Einheit in einen anderen Abschnitt verschieben
    Wenn ich einen neuen Einsatz "Verschiebe-Test" mit FüSt "FüSt 1" anlege
    Und ich die Einheit "OV Oldenburg" mit Organisation "THW" und Stärke 9 anlege
    Und ich den Abschnitt "EA Nord" anlege
    Und ich "OV Oldenburg" nach "EA Nord" verschiebe
    Dann ist "OV Oldenburg" im Abschnitt "EA Nord"

  Szenario: Gesamtstärke summiert alle Abschnitte
    Wenn ich einen neuen Einsatz "Stärken-Test" mit FüSt "FüSt 1" anlege
    Und ich die Einheit "Einheit A" mit Organisation "THW" und Stärke 5 anlege
    Und ich den Abschnitt "EA West" anlege
    Und ich den Abschnitt "EA Ost" anlege
    Und ich den Abschnitt "EA West" auswähle
    Und ich die Einheit "Einheit B" mit Organisation "THW" und Stärke 7 anlege
    Und ich den Abschnitt "EA Ost" auswähle
    Und ich die Einheit "Einheit C" mit Organisation "THW" und Stärke 3 anlege
    Dann beträgt die Gesamtstärke über alle Abschnitte 15
