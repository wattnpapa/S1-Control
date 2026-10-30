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
- [x] Fahrzeuge und Personen lassen sich in der Oberfläche nicht entfernen, obwohl die Ereignisse im Kern vorhanden sind (Untertabellen: erfassen, entfernen mit Grund, wiederherstellen)
- [x] Der Verschiebedialog hat den gewählten Abschnitt als Ziel vorbelegt
- [ ] Umhängen und Typwechsel eines Abschnitts nennen die Folgen für den Teilbaum und die Gesamtstärke nicht

## Lagebild und Stärke

- [x] An der Stärkezahl steht nicht, welche Abschnitte und Einheiten eingehen (Gliederung der Tabelle: Kopfzeile je Bereich mit Zwischensumme, oberste Zeile „ohne Angefordert“ wie das Kopfband)
- [ ] Die Stärke steht im Hauptfenster und auf dem Monitor in zwei Schreibweisen, dazu abweichende Monatskürzel
- [ ] Die Zeit im Kopfband trägt keine Zonenkennung
- [x] Statuswerte erscheinen als technische Rohtexte; die Abstufung deckt nur fünf von neun Werten
- [x] Die Stärke nach Status wird berechnet, aber nirgends angezeigt, obwohl der Hilfetext sie zusagt
- [ ] Keine wählbare Sortierung in der Einheitentabelle (Statusfilter vorhanden), keine Suche in Anforderungen, Eingangskorb, Kosten und Führungsstelle

## Abläufe und Erreichbarkeit

- [x] Die Einsatzakte lässt sich nur über die Kommandozeile erzeugen (Blatt Ausgaben: „Einsatzakte erzeugen“, Kern in `@s1/speicher` für CLI und Desktop)
- [x] Einsatz beenden, wiedereröffnen und archivieren gibt es im Kern, aber nicht in der Bedienung (Blatt Ausgaben, Zustand im Kopfband, Dienst weist Schreiben nach dem Ende ab)
- [ ] Am Arbeitsplatz ist nicht wählbar, wer erfasst; der Akteur ist fest das Konto des Rechners
- [ ] Abweisungen des Dienstes werden verschluckt, gesperrte Schaltflächen nennen ihren Grund nicht (teils: Abweisung „Einsatz abgeschlossen“ erscheint zentral als Hinweis; Masken nennen den Grund)
- [ ] Den Ausgaben fehlt eine Unterschriftszeile; Fahrzeuge fehlen im Druckblatt

## Kern

- [ ] Ein bereits vorhandener Einsatzordner meldet sich mit einer rohen Dateisystemmeldung
- [ ] Statuswechsel und Verschiebung tragen keine fachliche Zeit; ein Tagebucheintrag lässt sich nicht nachtragen

## Eingabe, Fehler, Darstellung

- [x] Pflichtgründe laufen über eine Browserabfrage, die im Anwendungsfenster nicht unterstützt wird
- [x] Nachgeladene Daten überschreiben die gerade bearbeitete Tabellenzelle
- [x] In den Masken werden leere und unsinnige Zahlen still zu 0; es gibt keine Obergrenze gegen Zahlendreher
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

## Gegen die Excel „Einsatzkräfteübersicht V 1.5.2“ (Audits vom 29.10.2026)

Befunde aus `v2-2026-10-29/README.md` und die Excel-Funktionen, die die
Oberfläche noch nicht hatte.

- [x] Aufträge, Geräte/Fahrzeuge und Personen lassen sich an der Einheit erfassen (Untertabellen, Spalten J/K sofort gefüllt, Tagebuch lesbar)
- [x] Stammdaten des Einsatzes (Einsatzname, Führungsstelle, übergeordnete FüSt, Art, Beginn, Schichtmodell) als Maske im Blatt Führungsstelle; Ausdrucke tragen den FüSt-Namen aus den Stammdaten statt des Rechnernamens
- [x] Bereichs-Kopfzeilen mit Zwischensummen in der Einheitentabelle („Gliederung“), Gesamtzahl beschriftet wie das Kopfband
- [x] Druckbarer Gesamtstand der Einheitenliste (Blatt „Stärke“) als HTML/PDF, A4 quer, mit Goldfile
- [x] Ablösungsspalten N–S an der Einheit; Marken K12 (Ablösung) und K18 (Verfügbar bis läuft ab); Anforderung kennt die abzulösende Einheit; „Eingetroffen“ legt die Einheit vorbelegt an
- [x] KatS-StAN-Nds-Vorlagen (39 Einträge aus der Arbeitsmappe, Sollstärken als Annahme gekennzeichnet), Vorlagensuche, Anlegen ohne Vorlage
- [x] Einsatz beenden, wiedereröffnen, archivieren und Einsatzakte aus der Oberfläche
- [x] Ausgaben öffnen, im Ordner zeigen, drucken (Electron; in der Web-Schale ausgeblendet)
- [x] Herkunft als Wort statt Schlüssel („THW OV Oldenburg“ statt „ORTSVERBAND THW OV Oldenburg“)
- [x] Zeile kopieren (Knopf und Strg+K wie in der Excel; Kopie ist eine neue, angeforderte Einheit ohne Aufträge, Fahrzeuge, Personen und Zeiten)
- [ ] Rückgängig über Fenster und Neuladen hinweg; Begriffe Rückgängig / Rücknahme / Berichtigung vereinheitlichen
- [ ] Masken und Zellen sperren sich nach „Einsatz beendet“ nicht selbst (der Dienst weist ab, das Kopfband zeigt den Zustand)
- [ ] `archiv.marker` wird beim Archivieren nicht geschrieben; die Einsatzliste zeigt archivierte Einsätze nicht als solche
- [ ] Nach einer fehlgeschlagenen Verknüpfung Anforderung → Einheit lässt sich keine bestehende Einheit nachträglich zuordnen

