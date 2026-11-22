# Stab-Audit: Fehlende Ansichten aus Sicht des Fachberaters Sanitätsdienst

Datum: 2026-11-22
Rolle des Prüfers: Fachberater Sanitätsdienst (DRK-Kreisbereitschaftsleiter), in die FüSt TEL eines Landkreises gesetzt. Fachlich sicher in der eigenen Organisation, kaum Stabsausbildung, keine Einweisung ins Programm. Auftrag laut Leiter: „Behalte unsere Sanitätskräfte und die Verletztenlage im Blick und berate uns, was wir nachfordern müssen.“

## Scope und Methodik

- Stand: Branch `claude/pensive-bell-9rojma`, Commit 1c9dfee. Laufende Web-Schale `http://127.0.0.1:8790`, Chromium über Playwright, 1440 × 900, deviceScaleFactor 1.
- Eigener Übungseinsatz **„Review Fachberater Hochwasser Deich Elbe“** (FüSt TEL Landkreis, übergeordnet: Krisenstab Landkreis), über die Oberfläche gefüllt: 7 Abschnitte (FüSt TEL, EA 1 Deich Nord, EA 2 Deich Süd, EA 3 Sanitätsdienst/BHP, BR Sportplatz, Angefordert/Anmarsch, Logistik), 19 Einheiten aus THW, Feuerwehr, DRK, JUH, ASB, Rettungsdienst, DLRG, Bundeswehr, Polizei, Wasserwirtschaft, Regie mit gesetzten Status, 6 Anforderungen (u. a. „San-1: 2 RTW + SEG Transport“, Amtshilfe Bundeswehr, Pumpen, Ablösung Feuerwehr), 4 aufgenommene und gesichtete Eingänge (u. a. „Lagemeldung Sanitätsdienst“ der Leitstelle), 5 Tagebucheinträge.
- Mein Arbeitsplatz: eigener Browser-Kontext, Anzeigename „FaBe San“, Profil Vorgabe „Führungsstelle (S1)“, Stellen „Fachberater“ und frei „FaBe San“, Handzeichen „San“.
- Screenshots und Skripte: Scratchpad `reviews/fachberater/` (`san-*.png`, `mon-7/8/9.png`, `08-einheiten.png`, `12-anforderungen.png`). Code nur gelesen, nichts geändert.
- Bereits erfasst und hier nicht wiederholt: alle Befunde aus `docs/audits/nachrichten/runde2-reviewer-fachberater.md` (u. a. Vokabular, Sichten ohne Rückfrage, Quittung, fehlende Sicht „offen“).

## Kurzes Urteil

Für die Frage „Wie viele Sanitätskräfte habe ich wo?“ kommt man mit Umwegen hin: Die Suche der Einheitentabelle findet „DRK“ über die Organisation und zeigt die Teilsumme je Abschnitt, und der Wandmonitor hat eine Kreuztabelle Abschnitt × Organisation. Für alles, was einen Fachberater Sanitätsdienst ausmacht, gibt es keinen Ort: **keine Patienten- oder Verletztenlage, keine verletzten Einsatzkräfte, keine Transport- und Klinikbilanz, keinen Blick auf „den Sanitätsdienst“ als Ganzes** (DRK, JUH, ASB, MHD und Rettungsdienst sind getrennte Organisationen ohne Fachdienst). Was ich weiß, schreibe ich ins Tagebuch – und dort scheitert der Eintrag ohne Zeitangabe mit einer technischen Fehlermeldung (San-B1).

## Fehlende Ansichten

### San-A1 (P0) Verletzten- und Patientenlage (inkl. verletzter Einsatzkräfte)

- **Was die Rolle sehen und tun muss:** Zahl der Patienten nach Sichtungskategorie (Annahme: SK I–III/IV/ex nach üblicher Praxis), davon Einsatzkräfte, je Abschnitt bzw. Behandlungsplatz; Zu- und Abgänge (versorgt vor Ort, transportiert, Zielklinik); Zeitpunkt der letzten Meldung. Verletzte **Einsatzkräfte** gesondert mit Organisation/Einheit, weil Führung und Fürsorge (Meldung an die Heimatorganisation, Unfallmeldung) daran hängen. Eintragen muss auch ein Fachberater ohne Vorkenntnis können: eine Zeile je Meldung, Zahl plus Kategorie.
- **Was die App schon hat:** nichts Strukturiertes. Es gibt nur Freitext: Nachricht E 1 „Lagemeldung Sanitätsdienst“ (4 EK leicht verletzt, 1 Transport), Tagebucheinträge „1 Helfer PiBtl 130 Umknicktrauma …“ und „2. Einsatzkraft verletzt …“. Die Einheit hat Status „Nicht einsatzbereit“ und eine Stärke, Personen (`PersonHinzugefuegt`) haben keinen Zustand. Im Datenmodell gibt es kein Ereignis für Patient, Verletzung oder Transport (`packages/domaene/src/katalog/schemata.ts`).
- **Verstreut über:** Nachrichten (Inhalt), Einsatztagebuch (Freitext), Stärke der Einheit (wird stillschweigend verringert oder nicht).
- **Warum P0:** Ein Stab, der die Zahl verletzter Einsatzkräfte nicht beantworten kann, kann seine Fürsorgepflicht nicht nachweisen; im Freitext geht die Summe verloren (zwei Meldungen über dieselbe Person werden doppelt gezählt oder gar nicht).

### San-A2 (P1) Kräfteübersicht „Sanitätsdienst“ über alle Hilfsorganisationen

- **Was die Rolle sehen und tun muss:** In einer Tabelle alle sanitätsdienstlichen Einheiten (DRK, JUH, ASB, MHD, Rettungsdienst, ggf. Bundeswehr-Sanität) mit Abschnitt, Status, Stärke, Fahrzeugen (RTW/KTW/GW-San), „Verfügbar bis“ und offener Anforderung; Summe „einsatzbereit verfügbar“ getrennt von „gebunden“. Betreuungseinheiten (ASB-Betreuungszug) gehören nicht dazu.
- **Was die App schon hat:**
  - Suche der Einheitentabelle über Organisation: „DRK“ findet die SEG und zeigt „Auswahl: Ist-Stärke · 1 Einh.“ mit Abschnittssumme (`san-03-suche-drk.png`). Eine Oder-Suche (DRK **oder** JUH **oder** RD) gibt es nicht, „Sanität“ findet nichts, obwohl der Abschnitt „EA 3 Sanitätsdienst/BHP“ heißt.
  - Wandmonitor Taste 8 „Stärke je Organisation“ und Taste 9 „Abschnitt × Organisation“ (`mon-8.png`, `mon-9.png`): Köpfe je Organisation, aber ohne Status (der nicht einsatzbereite RTW zählt mit) und ohne Einheitennamen.
  - Ausgabe „Druck“ mit „Davon-Stärke“ für **eine** Organisation, Ausgabe „Status“ mit Organisation und Status als zwei getrennte Tabellen.
- **Fehlt:** ein Merkmal „Fachdienst“ an der Einheit (Sanität, Betreuung, Wasserrettung …) oder eine Organisationsgruppe; ohne das ist „Sanitätsdienst“ nicht abfragbar, und ASB-Betreuung wird mitgezählt.

### San-A3 (P1) Sanitätsdienstliche Anforderungen und Transportkapazität

- **Was die Rolle sehen und tun muss:** offene und zugesagte Anforderungen des Sanitätsdienstes mit Anzahl (z. B. 2 RTW), zugesagter Zeit, von wem, und Abgleich „angefordert – eingetroffen“; dazu freie Transportkapazität (RTW/KTW einsatzbereit).
- **Was die App schon hat:** Blatt Anforderungen (unter „Mehr ▾ → Eingangskorb → Anforderungen“) mit San-1 „2 RTW + SEG Transport DRK“, zugesagt „18:30 · Leitstelle Lüneburg“ (`san-06-anforderungen.png`). Keine Organisation, keine Anzahl, kein Filter, keine Suche; die Fahrzeugtypen stehen nur als Freitext.
- **Verstreut über:** Anforderungen (Freitext), Einheitentabelle (Fahrzeuge), Nachrichten.

### San-A4 (P2) „Meine Organisation“ als Arbeitsplatz-Zuschnitt

- **Was die Rolle sehen und tun muss:** Ein Fachberater-Profil, das beim Öffnen genau zeigt: eigene Kräfte (gefiltert), eigene Anforderungen, eigener Posteingang, Tagebuch mit Eintragsknopf. Ohne Schreibrechte auf Status und Stammdaten anderer Organisationen.
- **Was die App schon hat:** Profile Führungsstelle, Vermeldezentrale, Versorgung, Alle. Mit der Vorgabe sieht der Fachberater die Reiter „S1 · Nachrichten · Funkplan · S4 · Exporte“ (`san-01-start.png`); Einsatztagebuch und Anforderungen liegen unter „Mehr ▾“, die Organisationssichten nur auf dem Monitor.

## Befunde an vorhandenen Ansichten (neu)

### San-B1 (P1) Tagebucheintrag ohne Zeitangabe scheitert mit „Invalid ISO datetime“

- **Beobachtung:** Einsatztagebuch → „Eintrag hinzufügen“, Text „FaBe San: 2. Einsatzkraft verletzt …“, Quelle „Meldung vor Ort“, Feld „Zeit der Meldung“ leer (Platzhalter „leer = jetzt“), „Eintrag speichern“. Die Maske bleibt offen mit „Nicht gespeichert – Die Nutzlast für EtbEintragErfasst ist nicht gültig: zeitpunkt — Invalid ISO datetime“ (`san-10-etb-ohne-zeit.png`; dasselbe vorher an einem anderen Arbeitsplatz, `err.png` aus `s24.js`). Mit „1730“ im Zeitfeld geht es.
- **Ursache im Code:** `apps/desktop/src/renderer/TagebuchEintrag.tsx:52-53` ruft `versuch.kennung()` zweimal auf, einmal für die ETB-Id und einmal für die Jetzt-Zeit. `kennung` hält aber nur **einen** Wert je Versuch (`Anlegeversuch.tsx:75-78`, `gehalten.current ??= erzeuge()`), also wird die ETB-Id („ETB-…“) als `zeitpunkt` geschickt.
- **Auswirkung:** Jeder Tagebucheintrag mit dem vorgeschlagenen Standard („leer = jetzt“) scheitert – an allen Arbeitsplätzen, nicht nur beim Fachberater. Für den Fachberater ist das Tagebuch der einzige Ort, an dem Verletzte überhaupt dokumentiert werden können; die Meldung klingt nach Systemfehler, ein Ungeübter gibt auf.
- **Empfehlung:** Zeit nicht über `kennung` halten (eigene Ref oder `kennung` mit Objekt `{ etbId, gesetzt }`); Regressionstest „Eintrag ohne Zeit speichert mit jetzt“. Fehlermeldungen der Nutzlastprüfung nutzerklar formulieren (AGENTS.md §5 sinngemäß).
- **Verifikation:** Eintrag mit leerem Zeitfeld speichern → Zeile erscheint mit Fachzeit = Erfasst.

### San-B2 (P2) Zeit der Meldung in der Zukunft wird ohne Rückfrage angenommen

- **Beobachtung:** Um 17:27 mit „1730“ gespeichert; das Tagebuch zeigt Fachzeit 17:30, später als „Erfasst“ 17:27 (Zeile 79).
- **Auswirkung:** Wer eine Uhrzeit aus einer Meldung abschreibt und sich vertippt, verfälscht die Reihenfolge der Verletztenmeldungen, ohne es zu merken.
- **Empfehlung:** Hinweis „liegt in der Zukunft – gemeint gestern/heute?“ wie bei Nachrichten.
- **Verifikation:** Zeit 10 Minuten nach jetzt eintragen → Rückfrage.

### San-B3 (P2) Die Organisationssichten gibt es nur auf dem Wandmonitor

- **Beobachtung:** „Stärke je Organisation“ und „Abschnitt × Organisation“ erscheinen nur unter `#monitor` mit den Tasten 8 und 9 (`mon-8.png`, `mon-9.png`). Im Programm selbst gibt es dafür keinen Reiter; in der Web-Schale öffnet der Monitorknopf kein Fenster, sondern verweist auf die Adresse mit „#monitor“ (`apps/desktop/src/web/schale.ts:63-65`). Die Bedienhilfe (`packages/domaene/src/bedienhilfe.ts`) nennt den Monitor nur beim Funkplan, die Organisationssichten gar nicht; nur das Handbuch („Versorgung und Monitoransichten“) erwähnt sie.
- **Auswirkung:** Genau die Zahl, die ich brauche, ist da – aber ein Ungeübter findet sie nicht, und am eigenen Platz kann ich nicht mit ihr arbeiten (kein Klick auf eine Zelle zu den Einheiten).
- **Empfehlung:** Die Kreuztabelle als Unteransicht im Blatt S1 („Je Organisation“), Zelle anklickbar → gefilterte Einheitentabelle.
- **Verifikation:** Ohne Monitor in zwei Klicks zur Stärke der eigenen Organisation je Abschnitt.

### San-B4 (P2) Die Suche filtert die Tabelle, der Abschnittsbaum zählt weiter alles

- **Beobachtung:** Mit Suche „DRK“ zeigt die Tabelle 1 Einheit, 20 Köpfe; der Baum links daneben zeigt weiter „Alle Bereiche 19 · 15/41/272“ und „EA 3 Sanitätsdienst/BHP 2 · 1/3/18“ (`san-03-suche-drk.png`).
- **Auswirkung:** Zwei verschiedene Zahlen nebeneinander; wer auf den Baum schaut, meldet die falsche Stärke als „unsere“.
- **Empfehlung:** Bei aktiver Suche im Baum „davon Treffer“ zeigen oder den Baum sichtbar als „ungefiltert“ kennzeichnen.
- **Verifikation:** Suche „DRK“ → Baum nennt bei EA 3 „1 Treffer · 20“.

### San-B5 (P3) Handbuch und Profilbeschreibung nennen andere Reiter als das Programm

- **Beobachtung:** Handbuch („Das Fenster“): Profil Führungsstelle = „Lage · Eingang · Nachrichten · Führungsstelle · Ausgaben · Einsatztagebuch“. Das Programm zeigt „S1 · Nachrichten · Funkplan · S4 · Exporte“ und „Mehr ▾“ mit Eingangskorb, Führungsstelle, Kosten, Einsatztagebuch.
- **Auswirkung:** Wer sich nach dem Handbuch orientiert, sucht „Lage“ und „Einsatztagebuch“ im Band und findet sie nicht.
- **Empfehlung:** Handbuch und Kurzanleitung an die Reiternamen anpassen.
- **Verifikation:** Profiltabelle im Handbuch = Reiter im Band.

## Schluss

- **Aufgabe geschafft?** Teilweise. „Wie viele Sanitätskräfte wo“: ja, mit Suche je Organisation oder über den Monitor. „Patientenlage, verletzte Einsatzkräfte, Transporte“: nein, nur als Freitext, und der Tagebucheintrag scheitert ohne Zeitangabe.
- **Größtes Risiko:** Verletzte Einsatzkräfte stehen verstreut in Nachrichten und Tagebuch; niemand kann sicher sagen, wie viele es sind und wer davon zur Heimatorganisation gemeldet ist.
- **Top-Priorität:** San-B1 beheben (klein, betrifft alle), dann die Ansicht „Verletzten- und Patientenlage“ (San-A1) mit eigenem Ereignis statt Freitext.
