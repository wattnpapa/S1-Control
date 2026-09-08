# language: de
Funktionalität: Einsatz-Lifecycle
  Als S1-Offizier
  möchte ich Einsätze anlegen, Einheiten und Fahrzeuge verwalten
  und stets den Überblick über alle Kräfte behalten.

  Hintergrund:
    Angenommen die App ist gestartet und ich bin als admin eingeloggt

  # ── Grundfunktionen ──────────────────────────────────────────────────────────

  Szenario: Neuen Einsatz anlegen
    Wenn ich einen neuen Einsatz "Hochwasser Testlage" mit FüSt "FüSt 1" anlege
    Dann sehe ich den Workspace mit dem Abschnitt "FüSt 1 [FUEST]"
    Und die Gesamtstärke beträgt 0

  Szenario: Einheit im FüSt anlegen
    Wenn ich einen neuen Einsatz "Einheit-Test" mit FüSt "FüSt 1" anlege
    Und ich die Einheit "OV Oldenburg" mit Organisation "THW" und Stärke 9 anlege
    Dann sehe ich "OV Oldenburg" in der Einheitenliste
    Und die Gesamtstärke beträgt 9

  # ── Abschnitt-Verwaltung ─────────────────────────────────────────────────────

  Szenario: Abschnitt anlegen und Einheit zuordnen
    Wenn ich einen neuen Einsatz "Abschnitt-Test" mit FüSt "FüSt 1" anlege
    Und ich den Abschnitt "EA Nord" anlege
    Und ich den Abschnitt "EA Süd" anlege
    Dann sehe ich "EA Nord" in der Abschnitt-Liste
    Und sehe ich "EA Süd" in der Abschnitt-Liste

  Szenario: Einheit zwischen Abschnitten verschieben
    Wenn ich einen neuen Einsatz "Verschiebe-Test" mit FüSt "FüSt 1" anlege
    Und ich die Einheit "OV Oldenburg" mit Organisation "THW" und Stärke 9 anlege
    Und ich den Abschnitt "EA Nord" anlege
    Und ich "OV Oldenburg" nach "EA Nord" verschiebe
    Dann ist "OV Oldenburg" im Abschnitt "EA Nord"
    Und ist "OV Oldenburg" nicht mehr im Abschnitt "FüSt 1"

  # ── Stärke-Berechnungen ───────────────────────────────────────────────────────

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

  Szenario: Stärke bleibt korrekt nach Abschnitt-Wechsel
    Wenn ich einen neuen Einsatz "Wechsel-Test" mit FüSt "FüSt 1" anlege
    Und ich die Einheit "TZ Basis" mit Organisation "THW" und Stärke 12 anlege
    Und ich den Abschnitt "EA Mitte" anlege
    Und ich den Abschnitt "EA Mitte" auswähle
    Dann beträgt die Gesamtstärke über alle Abschnitte 12

  # ── Undo-Funktion ─────────────────────────────────────────────────────────────

  Szenario: Verschiebung rückgängig machen
    Wenn ich einen neuen Einsatz "Undo-Test" mit FüSt "FüSt 1" anlege
    Und ich die Einheit "OV Hannover" mit Organisation "THW" und Stärke 9 anlege
    Und ich den Abschnitt "EA Nord" anlege
    Und ich "OV Hannover" nach "EA Nord" verschiebe
    Und ich die letzte Aktion rückgängig mache
    Dann ist "OV Hannover" im Abschnitt "FüSt 1"
    Und ist "OV Hannover" nicht mehr im Abschnitt "EA Nord"

  # ── Fahrzeuge ─────────────────────────────────────────────────────────────────

  Szenario: Fahrzeug einer Einheit zuordnen
    Wenn ich einen neuen Einsatz "Fahrzeug-Test" mit FüSt "FüSt 1" anlege
    Und ich die Einheit "OV Lüneburg" mit Organisation "THW" und Stärke 9 anlege
    Und ich das Fahrzeug "MTW-OV" der Einheit "OV Lüneburg" zuordne
    Dann sehe ich "MTW-OV" in der Fahrzeugliste

  # ── Persistenz ────────────────────────────────────────────────────────────────

  Szenario: Daten bleiben nach App-Neustart erhalten
    Wenn ich einen neuen Einsatz "Persistenz-Test" mit FüSt "FüSt 1" anlege
    Und ich die Einheit "FK Hamburg" mit Organisation "THW" und Stärke 8 anlege
    Und ich den Einsatz schließe
    Und ich den Einsatz "Persistenz-Test" erneut öffne
    Dann sehe ich "FK Hamburg" in der Einheitenliste
    Und die Gesamtstärke beträgt 8

  # ── Einheit splitten ─────────────────────────────────────────────────────────

  Szenario: Einheit in Teileinheiten aufteilen
    Wenn ich einen neuen Einsatz "Split-Test" mit FüSt "FüSt 1" anlege
    Und ich die Einheit "TZ Gesamt" mit Organisation "THW" und Stärke 12 anlege
    Und ich "TZ Gesamt" mit Stärke 5 in "TZ Teil-1" aufteile
    Dann sehe ich "TZ Teil-1" in der Einheitenliste
    Und die Gesamtstärke beträgt 12
