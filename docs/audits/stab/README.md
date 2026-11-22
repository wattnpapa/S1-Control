# Stab-Review: fehlende Ansichten je Stabsfunktion

Stand 22.11.2026. Sechs Reviewer haben S1-Control aus Sicht von 18 Stabsfunktionen gegen die laufende Web-Schale geprüft (Playwright, Chromium, je Gruppe ein eigener Übungseinsatz, mehrere Arbeitsplätze parallel). Die Einzelaudits heißen `reviewer-<rolle>.md`. Einschränkung der Prüfumgebung: Das private Paket `@bos/eeb-format` war durch einen Platzhalter ersetzt; Erfassungsbögen, QR-Scan und EEB-Import sind deshalb nicht geprüft.

Geprüfte Rollen: LtrStab, LtrFüSt, ETB-Führer, S1, Führungsgehilfe S1, S2, Führungsgehilfe S2, S3, S4, S5, S6, Sichter, LdF, Fernmelder, Fachberater Sanitätsdienst, Fachberater Feuerwehr, Verbindungsperson Bundeswehr, Fachberater Wasserbehörde.

Das gemeinsame Urteil: Fast alle Rollen kommen ans Ziel, aber mit Umwegen. Die Daten liegen meist vor, es fehlen zusammenführende Ansichten. Ein zweiter, kleinerer Teil der Wünsche braucht neue Daten, die das Ereignismodell heute nicht kennt.

## Fehlende Ansichten, nach Häufigkeit über die Rollen

### Aus vorhandenen Daten (kein neues Ereignis nötig)

| Ansicht | Gefordert von | Stufe | Stand |
| --- | --- | --- | --- |
| Kräfte nach Status je Abschnitt, Köpfe, mit Unterabschnitten | S1 FA-S1-1, S3 FA-S3-3, FW FW-A3, San San-A2/B3, LtrStab A1/LS-1 | P1 | gebaut: Blatt „Übersicht“ (2d0d8c2, 7d0b710) |
| Auftragsübersicht aller Einheiten (offen/erledigt) | LtrFüSt F1, S3 FA-S3-1, LtrStab A1 | P1 | gebaut: Blatt „Übersicht“; Frist, Auftraggeber und Ergebnis fehlen weiter (LF-1, B-S3-3, neue Felder) |
| Profil für Leitung, ETB-Führer, Sachgebiete | LtrStab LS-4, ETB ET-5, S1 B-S1-4, S3 B-S3-5, San San-A4 | P2 | gebaut: Profil „Leitung / Stab“ (7d0b710); S5-, FmZ- und Fachberater-Zuschnitt offen |
| Ablösungs- und Einsatzzeitenplan (verfügbar bis, im Einsatz seit, Deckungslücke) | S1 FA-S1-2/FA-S1-5, LtrFüSt F3, FW FW-A1 | P1 | offen; Zeitstrahl existiert im Blatt S4 unter „Nächste 24 h“ |
| Stabslagebild mit offenen Anforderungen, Nachrichten je Stelle, Tagebuch | LtrStab A1/A3, S4 S4-A3 | P1 | teilweise (Übersicht deckt Stärke und Aufträge) |
| Rücklauf: verteilt, aber nicht gelesen/erledigt, je Stelle | Sichter, FüGeh S2 FA-FG-1, S2 FA-S2-2 | P1 | offen |
| Arbeitsplatzübersicht der FmZ, „Mein Platz“ | LdF, Fernmelder, S6 S6-A3, LtrFüSt F2 | P1 | offen |
| Bereinigte ETB-Sicht, Nachträge markiert, Zeitraum | ETB E1/E2/E3, S2 B-S2-3/B-S2-5 | P1 | offen |
| Meldetisch „Ankunft einbuchen“, Sammel-Statuswechsel | FüGeh S1 FA-FG-1/FA-FG-2 | P1 | offen |
| Lagevortrag / Lagebesprechungsmappe (Bildschirm und Ausdruck) | LtrStab A2, S2 FA-S2-4 | P1 | offen |

### Braucht neue Daten (neue Ereignistypen oder Felder, Entscheidung nötig)

| Bereich | Gefordert von | Stufe |
| --- | --- | --- |
| Lage je Abschnitt, Lagetafel, Lagekarte mit Ort | S2 FA-S2-1/FA-S2-3, FüGeh S2 FA-FG-2, S3 FA-S3-2, Wasserbehörde WW-B2 | P1 |
| Pegel und Prognose, Deichlage nach Kilometer, Auflagen | Wasserbehörde WW-A1–A3 | P0/P1 |
| Verletzte, Patienten, Ausfälle von Einsatzkräften | San San-A1, S1 FA-S1-3 | P0/P1 |
| Amtshilfeanträge mit Bearbeitungsstand; Anforderungen änderbar, mit Organisation und Stärke | Bundeswehr Bw-A1/B1/B2, S4 S4-3, S3 B-S3-4 | P0/P1 |
| Material und Betriebsstoff (Bedarf, Bestellung, Lieferung) | S4 S4-A1/A2 | P1 |
| Pressemitteilungen mit Freigabe, freigegebene Lagezahlen, Medienanfragen | S5 S5-A1–A3 | P1 |
| Störungsliste IuK, Kommunikationsverzeichnis, Geräteausgabe | S6 S6-A1/A2/A4 | P1 |
| Funkverkehrsnachweis je Rufgruppe, Nummernkreise je Platz | Fernmelder, LdF | P1 |
| Entscheidungen und Termine der Leitung | LtrStab A4/A5, S3 FA-S3-4 | P2 |

## Behobene Fehler aus dem Review

| Befund | Commit |
| --- | --- |
| Tagebucheintrag ohne Uhrzeit wird nicht gespeichert (San-B1, ETB ET-1) | 1580b47 |
| Strg+N öffnet Abschnitt- und Einheitenmaske zugleich (S1, FüGeh S1 B-FG-1) | b9c9884, 089722c |
| Tagebuch und Anforderungsliste zeigen Zeiten als UTC-ISO (S1 B-S1-1, LtrStab LS-2) | 5c50cb1 |

## Offene Fehler mit Datenrisiko (Auswahl)

Diese Befunde gefährden Nachweise oder Zahlen und sollten vor neuen Ansichten behoben werden:

- Doppelte Nachrichtennummern, wenn zwei Fernmelder gleichzeitig aufnehmen; keine Warnung (Fernmelder, P1).
- „Eingetroffen → bestehende Einheit verknüpfen“ bucht die Einheit nicht ein (S1 B-S1-2).
- Gesprächsnotiz verteilt den Gesprächspartner als Stelle mit grüner Kopie (S5-1).
- Unterbringung: Belegung, Bedarf und Band widersprechen sich (S4-1).
- Mehrere Fachberater teilen eine Stelle; der Falsche kann erledigen (FW-B1), ebenso zwei Plätze mit Stelle S2 (FüGeh S2 B-FG-1).
- Monitor 7 und Ausdruck „Druck“ zählen Unterabschnitte nicht in den Einsatzabschnitt (LtrStab LS-1); das Blatt „Übersicht“ zählt richtig, Monitor und Ausdruck sind unverändert.
