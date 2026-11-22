# Audit: Fehlende Ansichten aus Sicht Leiter Stab (LtrStab)

Stand: main d42f471, laufende Web-Schale http://127.0.0.1:8790, 22.11.2026 17:07–17:35. Playwright/Chromium, 1440 × 900 (Lagemonitor zusätzlich 1920 × 1080), deviceScaleFactor 1. Eigener Übungseinsatz „Review Leitung Hochwasser Weser“ (FüSt THW Nienburg, übergeordnet TEL Landkreis Nienburg), drei Browser-Kontexte: „Leitung LtrFüSt“ (Stelle Leiter, Hz. LtF, Profil „Alle Blätter“), „FmZ Review Leitung“ (LdF, Fm1, Sichter, Hz. Fmz, Profil Vermeldezentrale), „ETB Review Leitung“ (Profil Führungsstelle). Screenshots und Skripte: `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/leitung/` (Dateinamen unten in Klammern).

Lage im Einsatz: 8 Abschnitte (TEL, Bereitstellungsraum, Logistik, EA 1 mit UA 1.1, EA 2 mit UA 2.1, UA 1.2), 14 Einheiten aus THW, Feuerwehr, DRK, JUH, DLRG in allen Status von Anmarsch bis Ruhe, 10 Aufträge, 4 Anforderungen (offen, zugesagt, eingetroffen mit Einheitsanlage), 5 Nachrichten über FmZ, LdF und Sichter (Blitz, Sofort, einfach; Ein- und Ausgang), 4 eigene Tagebucheinträge (ein fünfter scheiterte, siehe ETB-Audit), 10 Dienstposten, Einsatzgeschehen 16:30–17:35 nachgespielt.

Einschränkung: `@bos/eeb-format` ist ein Platzhalter. Erfassungsbögen, QR-Scan und EEB-Import nicht geprüft, keine Befunde dazu.

Annahmen zur Stabsarbeit (nicht aus Vorschriften belegt, aus allgemeiner Kenntnis der Stabsarbeit nach dem Sachgebietsmodell): Der LtrStab bereitet die Lagebesprechung vor und leitet sie, überblickt die Arbeit aller Sachgebiete S1–S6, hält Entscheidungen der Einsatzleitung und die daraus folgenden Aufträge nach und braucht dazu ein Gesamtbild auf einer Seite statt sechs Blätter.

## Kurzes Urteil

Für die Stärke ist die Anwendung gut: Ist-Stärke im Kopfband, Abschnittsbaum mit Summen, neun Monitoransichten, Ausdrucke. Für den LtrStab fehlt aber jede **zusammenführende** Sicht. Wer eine Lagebesprechung vorbereitet, muss Stärke (Reiter „S1“), Anforderungen (Eingangskorb → Umschalter), offene Nachrichten (Nachrichten, Stelle für Stelle über „Posteingang von“), Aufträge (je Einheit in der Untertabelle) und Tagebuch einzeln aufschlagen und im Kopf zusammensetzen. Die Exportgruppe „Lagebesprechung“ enthält nur Stärkeausdrucke. Zwei Zahlen-/Zeitfehler in Ausdruck und Monitor (Zusagezeit in UTC, EA-Summen ohne Unterabschnitte) würden ohne Gegenprüfung in einen Lagevortrag wandern.

## Fehlende Ansichten

### A1 (P1) Stabslagebild „Lage auf einen Blick“

- **Was die Rolle sehen/tun muss:** auf einer Bildschirmseite: Ist-Stärke je Einsatzabschnitt **mit** Unterabschnitten und Erwartete; offene und zugesagte Anforderungen mit Alter und zugesagter Zeit; Nachrichten mit Vorrang offen und Zahl offener Nachrichten je Stelle; laufende Aufträge je Abschnitt; die letzten Tagebucheinträge der Quelle „Lagebesprechung“ und „Sonstiges“ (Entscheidungen); Besetzung der Stellen. Jede Kachel führt per Klick in das Fachblatt.
- **Daten vorhanden:** Kennzahlen/Ist-Stärke (Kopfband, Abschnittsbaum mit Rollup „EA 1 Deich Nord 4 · 3/10/58“), Anforderungen mit Zustand und Zusage, Nachrichtenband (neu, vor FmZ, vor Sichter, vor LdF, mit Vorrang offen, über Schwelle) und `besetzteStellen`, Aufträge (`AuftragErfasst`/`AuftragBeendet` mit Einheit, Abschnitt, Beginn/Ende), Tagebuch.
- **Heute verstreut:** Reiter „S1“ (Stärke, Baum), Eingangskorb → „Anforderungen“, Nachrichten (Band + Umschalter + „Posteingang von“ je Stelle), Untertabelle einer markierten Einheit, Einsatztagebuch, Führungsstelle (Dienstposten). Mindestens sechs Wechsel (32-lage-nach-spiel.png, 14-anforderungen.png, 37-leiter-posteingang.png, 46-untertabellen.png).

### A2 (P1) Lagevortrag / Vorlage Lagebesprechung (Bildschirm und Ausdruck)

- **Was die Rolle sehen/tun muss:** einen Ausdruck bzw. eine Präsentationsansicht in der üblichen Gliederung (Annahme: Lage – eigene Kräfte – Maßnahmen/Aufträge – Anforderungen/Versorgung – Probleme/Entscheidungsbedarf – nächste Termine) mit Stand-Zeit, damit die Lagebesprechung aus einem Blatt geführt wird.
- **Daten vorhanden:** Stärke je Bereich und Organisation, Anforderungen, Aufträge, Versorgung (Mahlzeiten, Unterkünfte), Tagebuch, offene Nachrichten. **Nicht vorhanden:** ein Feld für die Lagedarstellung in Worten (Pegel, Prognose, Wetter) – heute nur als Tagebuchtext („Lagebesprechung FüSt: Pegel 7,42 m …“).
- **Heute verstreut:** Exporte → Gruppe „Lagebesprechung“ hat Druck, Status, Einheitenliste, Führungsorganisation – alle nur Stärke/Struktur (40-exporte.png). Anforderungen und Tagebuch stehen unter „Protokolle und Funk“, Versorgung im Blatt S4, Aufträge in keinem Ausdruck.

### A3 (P1) Sachgebiets- und Stellenübersicht (Stabsarbeit aller Sachgebiete)

- **Was die Rolle sehen/tun muss:** eine Matrix Stelle × (besetzt von Arbeitsplatz/Handzeichen, neu, offen, mit Vorrang offen, älteste offene seit) für Leiter, S1–S4, S6, Fachberater, Verbindungsstelle, FmZ/LdF/Sichter. So sieht der LtrStab, wo Arbeit liegen bleibt.
- **Daten vorhanden:** Verteiler und Marken je Stelle (neu/gelesen/erledigt), Vorrang, Zeiten, besetzte Stellen aus der Anwesenheit.
- **Heute verstreut:** Nachrichten → „Posteingang von“ zeigt immer nur **eine** Stelle (Auswahlliste, 37-leiter-posteingang.png); Besetzung nur als Hinweiszeilen („Kein Fernmelder besetzt“, „VOR DEM LDF (NICHT BESETZT)“) und in der Diagnose unter „Arbeitsplätze“ (49-diagnose.png). Die Dienstposten im Blatt Führungsstelle sind damit nicht verbunden.

### A4 (P2) Entscheidungs- und Auftragsnachweis der Leitung

- **Was die Rolle sehen/tun muss:** Entscheidungen als eigene Einträge (wer, wann, Begründung, Bezug auf Nachricht/Einheit) und die daraus erteilten Aufträge an Stellen **und** Einheiten mit Frist und Rückmeldung; Liste „offen / überfällig / erledigt“.
- **Daten vorhanden:** Aufträge nur an Einheiten (Text, Beginn, Ende); Tagebucheintrag mit Quelle; Nachricht „Erledigt“ je Stelle. **Nicht vorhanden:** Entscheidung als Art, Auftraggeber, Frist, Auftrag an eine Stelle des Stabs, Erledigungsvermerk (neue Daten nötig).
- **Heute verstreut:** Entscheidung musste ich als Tagebuchtext mit Quelle „Sonstiges“ schreiben („Entscheidung LtrFüSt: TZ Verden …“); Auftrag an EA 1 lief als Nachricht; „Erledigt“ an der Blitz-Nachricht E 1 fragt nichts (39-leiter-offen.png).

### A5 (P2) Termine und Lagerhythmus

- **Was die Rolle sehen/tun muss:** nächste Lagebesprechung (eigene, TEL 18:30), Meldetermine an die übergeordnete Führungsstelle, Schichtwechsel, zugesagte Eintreffzeiten – als Zeitleiste mit Countdown.
- **Daten vorhanden:** Zusagezeiten der Anforderungen, Schichtplan-Tage, Mahlzeiten (Monitor „Nächste Mahlzeit in 27 min“). **Nicht vorhanden:** Termin als Datensatz; die TEL-Lagebesprechung 18:30 steht nur im Inhalt der Nachricht E 2.
- **Heute verstreut:** Anforderungen, Nachrichteninhalt, S4.

### A6 (P3) Lagemonitor „Stab“

- **Was die Rolle sehen/tun muss:** eine Wandansicht für den Stabsraum mit offenen Vorrang-Nachrichten, offenen Anforderungen und nächstem Termin.
- **Daten vorhanden:** wie A1. **Heute:** Der Monitor hat neun Ansichten (Stärke, Verpflegung, 24 h, Unterbringung, Bereiche/Schichten, Funkplan, Stärke je Abschnitt, je Organisation, Kreuztabelle; 42-monitor-1…9.png), keine davon zeigt Arbeit des Stabs.

## Befunde an vorhandenen Ansichten

### LS-1 (P1) Stärke je Abschnitt: Einsatzabschnitte ohne ihre Unterabschnitte (Monitor 7, Ausdruck „Druck“)

- **Beobachtung:** Monitoransicht 7 zeigt „EA 2 Innenstadt Pumpen 0 0 0 0“ und darunter eingerückt „UA 2.1 Pumpstelle Marktplatz 0 4 15 19“; „EA 1 Deich Nord 0/1/7 = 8“ neben „UA 1.1 … 63“ (42-monitor-7.png). Der Ausdruck „Druck“ zeigt dasselbe flach: „EA 1 Deich Nord 0/1/7 = 8“ (41-aus-druck.png). Der Abschnittsbaum im Reiter S1 rechnet dagegen auf: „EA 1 Deich Nord 4 · 3/10/58“, „EA 2 … 2 · 0/4/15“.
- **Auswirkung im Einsatz:** Wer im Lagevortrag „Stärke EA 2“ abliest, sagt „null“, obwohl 19 Kräfte pumpen. Zwei Zahlen für denselben Abschnitt je nach Ansicht.
- **Empfehlung:** Je Einsatzabschnitt eine Zwischensumme einschließlich Unterabschnitte (wie im Baum), die eigenen Einheiten des EA als eigene Zeile „davon direkt“.
- **Verifikation:** Einsatz mit EA ohne eigene Einheiten und UA mit Einheiten; Monitor 7, Druck-PDF/HTML und Baum zeigen für den EA dieselbe Summe.

### LS-2 (P1) Ausdruck „Anforderungen“: Zusagezeit als UTC-Zeitstempel

- **Beobachtung:** Am Bildschirm „Zugesagt … 22.11.2026 19:30 · THW RB Bremen/Niedersachsen“; im Ausdruck derselben Anforderung „2026-11-22T18:30:00.000Z / THW RB Bremen/Niedersachsen“, ebenso ANF-04 „…T17:00:00.000Z“ statt 18:00 (41-aus-anforderungen.png, `ausgaben/anforderungen_2026-11-22_1731.html`).
- **Auswirkung im Einsatz:** Der Ausdruck ist ausdrücklich „für die Schichtübergabe“; wer „18:30“ liest, plant die Pumpen eine Stunde zu früh ein.
- **Empfehlung:** Zusagezeit wie in den übrigen Spalten als „22.11.2026 19:30“ (Ortszeit) formatieren; Spalte „Zusage“ in „zugesagt für“ und „zugesagt von“ trennen.
- **Verifikation:** Zusage 19:30 erfassen, PDF und HTML erzeugen: „19:30“, kein „Z“, kein „T“.

### LS-3 (P2) Anforderungen ohne Alter, Priorität und Anforderungsstelle

- **Beobachtung:** Die Liste zeigt Zustand, Kennung, Angefordert (absolute Zeit), Ablösung für, Vorgesehen, Auftrag, Zusage (14-anforderungen.png). Die Maske fragt nur Kennung, Ablösung für, vorgesehene Einheit, vorgesehener Auftrag (13-anforderung.png). Es gibt kein „seit“, kein „bei wem angefordert“, keine Dringlichkeit, kein „benötigt bis“.
- **Auswirkung im Einsatz:** Der LtrStab sieht nicht, welche Anforderung seit Stunden ohne Zusage liegt und bei wem er nachfassen muss.
- **Empfehlung:** Spalte „offen seit“ (bernstein über Schwelle), Felder „angefordert bei“ und „benötigt bis“; additiv im Ereignis.
- **Verifikation:** Anforderung anlegen, 60 min warten: Alter sichtbar und hervorgehoben; Ausdruck enthält „angefordert bei“.

### LS-4 (P2) Kein Arbeitsplatzprofil für die Leitung; Handbuch beschreibt andere Reiter

- **Beobachtung:** Profile: Führungsstelle (S1), Vermeldezentrale, Versorgung (S4), Alle Blätter (02-arbeitsplatz.png). Im Profil „Führungsstelle (S1)“ stehen S1 · Nachrichten · Funkplan · S4 · Exporte im Band, Eingangskorb, Führungsstelle, Kosten, Einsatztagebuch unter „Mehr“ (43-profil-fuest.png, `renderer/blaetter.ts` Kommentar „2026-11-22“). Das Handbuch nennt für dieses Profil „Lage · Eingang · Nachrichten · Führungsstelle · Ausgaben · Einsatztagebuch“ (HANDBUCH.md, Abschnitt „Das Fenster“).
- **Auswirkung im Einsatz:** Die Leitung braucht Nachrichten, Anforderungen, Führungsstelle und Tagebuch; mit dem Vorgabeprofil liegen drei davon hinter „Mehr“. Wer nach Handbuch sucht, findet die genannten Reiter nicht.
- **Empfehlung:** Profil „Leitung/Stab“ (Lagebild A1 zuerst, dann Nachrichten, Anforderungen, Tagebuch, Führungsstelle); Handbuch-Tabelle an `blaetter.ts` angleichen (Prüftest wie bei den erzeugten Abschnitten).
- **Verifikation:** Profil wählen → Band zeigt die genannten Reiter; Handbuchtest scheitert bei Abweichung.

### LS-5 (P3) Reiter „S1“ für das Lageblatt

- **Beobachtung:** Der Reiter mit Abschnittsbaum, Einheiten und Ist-Stärke heißt „S1“ (seit 2026-11-22, `blaetter.ts`), die Versorgung „S4“.
- **Auswirkung im Einsatz (Annahme):** Im Stab bezeichnet „S1“ ein Sachgebiet (Personal/Innerer Dienst), die Lagedarstellung ist Sache des S2. Ein LtrStab, der „Lage“ sucht, findet „S1“; wer „S1“ hört, meint die Person, nicht das Blatt.
- **Empfehlung:** Reitername nach Inhalt („Lage/Stärke“), Sachgebiet als Untertitel oder Tooltip.
- **Verifikation:** Hilfe und Einstiegszeile nennen denselben Namen wie der Reiter.

### LS-6 (P3) Eine Stelle „Leiter“ für alle Leitungsfunktionen

- **Beobachtung:** Die Stellenwahl kennt „Leiter“ einmal (Stellenabfrage, 03-leer.png). LtrStab, LtrFüSt, Leiter Einsatzabschnitt teilen sich diese Stelle bzw. müssen „Weitere Stelle“ frei eintragen.
- **Auswirkung im Einsatz (Annahme):** In einem Stab mit LtrStab und Leiter der Führungsstelle laufen beide Posteingänge zusammen; Verteiler „Leiter grün“ trifft beide.
- **Empfehlung:** Bei Bedarf additiv „LtrStab“ als Stelle, oder Hinweistext, dass „Leiter“ die Leitung der Führungsstelle meint.
- **Verifikation:** zwei Arbeitsplätze mit unterschiedlichen Leitungsstellen, Verteiler trifft gezielt einen.

Bekannt und weiter sichtbar (nicht neu gezählt): „⚠ 1 Konflikthinweis“ erscheint nach normaler Arbeit ohne erkennbaren Anlass (48-konflikt.png; vgl. R2-FM P3-6 in `docs/audits/nachrichten/README.md`).

## Schluss

- **Aufgabe geschafft:** mit Umwegen. Ein Lagevortrag ließ sich aus fünf Blättern und zwei Ausdrucken zusammensetzen, aber nur mit eigener Gegenprüfung der Zahlen (LS-1, LS-2).
- **Größtes Risiko:** falsche Zahlen und Zeiten im Lagevortrag, weil Monitor/Ausdruck EA-Summen ohne Unterabschnitte und Zusagezeiten in UTC zeigen.
- **Top-Priorität:** Stabslagebild A1 (eine Seite mit Stärke je EA inkl. UA, offenen Anforderungen mit Alter, Vorrang-Nachrichten und offenen Posten je Stelle, laufenden Aufträgen) und daraus der Lagevortrags-Ausdruck A2; vorher LS-1 und LS-2 beheben.
