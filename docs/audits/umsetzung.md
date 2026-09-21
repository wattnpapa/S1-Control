# Umsetzungsstand der THW-Audits

Stand: 21.09.2026. Grundlage sind die elf Perspektiv-Audits in diesem Verzeichnis.
Gleiche Befunde mehrerer Reviewer sind zu einem Punkt zusammengefasst.
Legende: [x] erledigt, [ ] offen.

## Kern: Daten, Persistenz, Korrektheit

- [x] Einsatzdatei wird nach dem Öffnen nie neu gelesen, Speichern überschreibt fremde Änderungen (offline P0-2, destructive P0-6)
- [x] Nicht lesbare Einsatzdatei wird durch leeres Skelett ersetzt (offline P0-1, destructive P0-5)
- [x] Verschobene Einheiten lassen ihre Fahrzeuge im alten Abschnitt zurück (destructive P0-2)
- [x] Nacherfassung mit tatsächlichem Zeitpunkt nicht möglich (analog P0-3)
- [x] "Backup laden" ohne Sicherung des ersetzten Standes (fünf Reviewer, P0)
- [x] Start ohne Freigabe stellt den Pfad dauerhaft auf lokal um (offline P0-4)
- [x] Export-Vorgabepfad ist das Arbeitsverzeichnis des Programms (analog P2-4)
- [ ] Kein Konfliktbegriff im Bedienablauf: Konflikt wird gemeldet, aber nicht geführt aufgelöst (offline P1-1)
- [ ] Bearbeitungssperre verfällt bei Netzausfall lautlos (offline P1-2)
- [ ] Scheitern der Sicherung bleibt unsichtbar (offline P1-7)
- [ ] Neuer Einsatz kann bestehende Datei überschreiben (destructive P2-6)

## Stärke und Lagebild

- [x] Gesamtübersichten fallen im Betrieb auf den gewählten Abschnitt zurück (command P0-1, workflow P0-1)
- [x] ANFAHRT fällt still aus der Stärke, ABGEMELDET zählt mit (fünf Reviewer, P0)
- [x] Regel der Stärkezählung ist nirgends erklärt (stress P0-4)
- [x] "Einheiten gesamt" zeigt die Personenzahl, "Führungsstärke" die volle Stärke (command P0-3, new-user P0-5)
- [x] Kein Datenstand und kein Verbindungszustand neben laufender Uhr (command P0-4, offline P0-3)
- [x] Fehler im zyklischen Refresh werden verschluckt (command P0-4)
- [ ] Zwei Schreibweisen derselben Stärke (mehrere Reviewer, P2)
- [ ] Keine Suche, Sortierung, Statusfilter in den Gesamtlisten (command P1-10)
- [x] Kein Bewegungs- oder Ereignisprotokoll in der Oberfläche (workflow P1-4, destructive P3-1)
- [x] Status als technischer Rohtext ohne Abstufung (mehrere Reviewer, P1/P2)

## Riskante Aktionen und Korrekturwege

- [x] Keine einzige Bestätigungsabfrage im Renderer (sieben Reviewer, P0/P1)
- [x] Undo ist im Kern vorhanden, aber nicht in der Oberfläche angebunden (sieben Reviewer, P0)
- [x] Einheiten, Fahrzeuge, Abschnitte lassen sich nicht löschen (error-recovery P0-1, field P0)
- [x] Splitten ist irreversibel, ohne Vorschau — jetzt mit Rückfrage und Vorschau der Folgen (destructive P1-2)
- [x] "Updaten" beendet die App ohne Rückfrage (stress P0-1)
- [x] Verschieben-Dialog ohne Objekt, Quelle und Hierarchie, Ziel vorbelegt (fünf Reviewer, P0/P1)
- [x] "Bestätigen" nicht gegen Doppelauslösung gesperrt (destructive P2-1, offline P1-4)
- [ ] Statuswechsel ABGEMELDET/AUSSER_BETRIEB bleibt folgenlos (destructive P1-4)
- [ ] Abschnitt umhängen wirkt auf den ganzen Teilbaum ohne Rückfrage (destructive P1-6)
- [ ] Move, Split und Undo umgehen die Bearbeitungssperre (destructive P1-7)
- [x] Archivieren ist einseitig — Beenden und Archivieren sind jetzt umkehrbar (workflow P1-7, analog P3-3)

- [x] Entwicklerbegriffe "Systemtyp" und "Parent-Abschnitt", Abschnittsart ohne Erklärung (new-user P3-2, P2-3)

## Abläufe und Erreichbarkeit

- [x] Export und Einsatzakte aus der Oberfläche nicht erreichbar (fünf Reviewer, P0)
- [x] Einsatz beenden, schließen oder wechseln nur über "Verzeichnis speichern" (new-user P0-4, workflow P1-2)
- [x] Anmeldung läuft unsichtbar als admin — Bearbeitername ist sichtbar und setzbar (workflow P1-1)
- [ ] Stärke doppelt pflegen: Zahlenfelder und Helferliste (workflow P1-5)
- [x] Aktionen brechen ohne Rückmeldung ab (workflow P1-6, stress P1-2)
- [x] Entwicklerwerkzeuge in Start- und Hauptansicht (mehrere Reviewer, P1/P2)
- [ ] Abschnitt anlegen erzwingt Ansichtswechsel (workflow P2-1)

## Eingabe, Fehler, Unterbrechung

- [x] Polling überschreibt halb eingetippte Fahrzeugzeilen (error-recovery P0-3, field P1)
- [x] Leere Zahlenfelder werden still zu 0, keine Plausibilitätsgrenze (error-recovery P1-1)
- [x] Fehlermeldungen liegen hinter dem Dialog und löschen sich selbst (error-recovery P1-2, stress P1-1)
- [ ] Kein Schutz beim Verlassen mit ungespeicherten Änderungen (error-recovery P1-3)
- [ ] Drei gleichnamige "Speichern" mit unterschiedlicher Reichweite (error-recovery P1-4)
- [ ] Abgelaufene Sperre führt in eine Sackgasse (error-recovery P1-6)
- [x] Dialoge nicht mit der Tastatur bedienbar, kein Enter, Escape, Autofokus (error-recovery P2-7, stress P2-3)
- [ ] Globales busy legt die gesamte Oberfläche stumm (stress P1-3)
- [ ] Pflichtfelder nicht gekennzeichnet, technische Fehlertexte (mehrere Reviewer, P3)

## Darstellung und Bedienbarkeit

- [x] Kein Dark Mode, color-scheme fest auf hell (night P0-1)
- [x] Stärke-Monitor startet weiß, Umschalter unsichtbar und flüchtig (night P0-2)
- [x] Unsichtbare, aber aktive Eckflächen im Stärke-Monitor (glove P0-1)
- [x] Trefferflächen durchgängig zu klein, Löschen neben Speichern (glove P0-2, P1-1)
- [x] Modale Dialoge ohne max-height und Scrollmöglichkeit (glove P0-3)
- [x] Zwei verwendete CSS-Klassen sind nicht definiert (glove P2-1, night P2-11)
- [x] Overlays und Dialoge zu schwach abgedunkelt (night P2-7)
- [x] Ausgewählter Abschnitt kaum erkennbar, Kontrast 1,19:1 (night P1-3)
- [x] Gesperrt und archiviert nur über Transparenz erkennbar (night P1-5)
- [x] Navigation nur als Einzelbuchstaben E/G/K/F (fünf Reviewer, P2/P3)
- [x] Kein Fokusstil, keine Rückmeldung beim Antippen (night P3-12, glove P2-4)
- [x] Icon-Aktionen ohne Beschriftung und Abstand — Entfernen ist abgesetzt (glove P1-2, new-user P2-2)

## Papier und Ausleitung

- [x] Keine Druckausgabe, kein Druck-Stylesheet, kein PDF (analog P0-2)
- [x] Exportinhalt taugt nicht als Papierstand (analog P1-1)
- [ ] Keine Import- oder Nacherfassungsschnittstelle (analog P1-2)
- [ ] Sicherungsabstand und Sicherungszustand nicht sichtbar (analog P2-2)
- [x] NATO-Zeit ohne Zeitzonenkennung (drei Reviewer, P1/P3)
