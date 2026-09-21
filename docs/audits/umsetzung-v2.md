# Umsetzungsstand der THW-Audits im neuen Baum

Die elf Audits in diesem Verzeichnis wurden gegen die Fassung erhoben, die
unter `legacy-v1/` liegt. Für `apps/` und `packages/` wurde jeder Befund
einzeln geprüft. Vieles ist dort konstruktionsbedingt erledigt: der Einsatz
ist ein angehängtes Ereignisprotokoll je Arbeitsplatz statt einer gemeinsam
überschriebenen Datei, es gibt keine Datensatzsperren, keinen Auto-Updater
und kein Einlesen einer Sicherung über die Oberfläche.

Diese Liste führt nur, was im neuen Baum noch zutrifft.
Legende: [x] erledigt, [ ] offen.

## Riskante Aktionen und Korrekturwege

- [x] Bestätigen ist nicht gegen Doppelauslösung gesperrt; ein zweiter Druck legt denselben Vorgang erneut an
- [x] Die Rücknahme wertet die Antwort des Dienstes nicht aus: bei Grundpflicht, strukturellem Rückweg und Ablehnung passiert sichtbar nichts
- [ ] Fahrzeuge und Personen lassen sich in der Oberfläche nicht entfernen, obwohl die Ereignisse im Kern vorhanden sind
- [ ] Der Verschiebedialog hat den gewählten Abschnitt als Ziel vorbelegt
- [ ] Umhängen und Typwechsel eines Abschnitts nennen die Folgen für den Teilbaum und die Gesamtstärke nicht

## Lagebild und Stärke

- [ ] An der Stärkezahl steht nicht, welche Abschnitte und Einheiten eingehen
- [ ] Die Stärke steht im Hauptfenster und auf dem Monitor in zwei Schreibweisen, dazu abweichende Monatskürzel
- [ ] Die Zeit im Kopfband trägt keine Zonenkennung
- [ ] Statuswerte erscheinen als technische Rohtexte; die Abstufung deckt nur fünf von neun Werten
- [ ] Die Stärke nach Status wird berechnet, aber nirgends angezeigt, obwohl der Hilfetext sie zusagt
- [ ] Keine wählbare Sortierung, kein Statusfilter in der Einheitentabelle, keine Suche in Anforderungen, Eingangskorb, Kosten und Führungsstelle

## Abläufe und Erreichbarkeit

- [ ] Die Einsatzakte lässt sich nur über die Kommandozeile erzeugen
- [ ] Einsatz beenden, wiedereröffnen und archivieren gibt es im Kern, aber nicht in der Bedienung
- [ ] Am Arbeitsplatz ist nicht wählbar, wer erfasst; der Akteur ist fest das Konto des Rechners
- [ ] Abweisungen des Dienstes werden verschluckt, gesperrte Schaltflächen nennen ihren Grund nicht
- [ ] Den Ausgaben fehlt eine Unterschriftszeile; Fahrzeuge fehlen im Druckblatt

## Kern

- [ ] Ein bereits vorhandener Einsatzordner meldet sich mit einer rohen Dateisystemmeldung
- [ ] Statuswechsel und Verschiebung tragen keine fachliche Zeit; ein Tagebucheintrag lässt sich nicht nachtragen

## Eingabe, Fehler, Darstellung

- [ ] Pflichtgründe laufen über eine Browserabfrage, die im Anwendungsfenster nicht unterstützt wird
- [ ] Nachgeladene Daten überschreiben die gerade bearbeitete Tabellenzelle
- [ ] In den Masken werden leere und unsinnige Zahlen still zu 0; es gibt keine Obergrenze gegen Zahlendreher
- [ ] Das Fehlerbild liegt hinter dem Maskengrund
- [ ] Kein Schutz beim Schließen mit offener Maske
- [ ] Pflichtfelder sind nur an zwei Stellen gekennzeichnet
- [ ] Die Erstwahl der Darstellung folgt nicht der Einstellung des Betriebssystems
- [ ] Trefferflächen unter 44 Pixel; gegensätzliche Aktionen stehen ohne Abstand nebeneinander
- [ ] Vierundzwanzig verwendete CSS-Klassen sind nicht definiert
- [ ] Keine Rückmeldung beim Antippen, Fokusstil nur für Eingabefelder
- [ ] Die Pfeilschaltflächen im Abschnittsbaum haben keine Beschriftung für Hilfstechnik
- [ ] Masken rechnen nicht mit der Bildschirmtastatur
- [ ] Der Dialog im Eingangskorb kennt weder Escape noch Autofokus
