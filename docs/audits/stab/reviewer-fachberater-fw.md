# Stab-Audit: Fehlende Ansichten aus Sicht des Fachberaters Feuerwehr

Datum: 2026-11-22
Rolle des Prüfers: Fachberater Feuerwehr (Kreisbrandmeister-Vertreter), in die FüSt TEL eines Landkreises gesetzt. Kennt Feuerwehr-Taktik, Kreisfeuerwehrbereitschaften und Wasserförderung, nicht aber das THW-Stabsvokabular und das Programm. Auftrag: „Du hast unsere Feuerwehrkräfte im Blick, planst mit uns die Ablösung und berätst zur Wasserförderung.“

## Scope und Methodik

- Stand: Commit 1c9dfee, Web-Schale `http://127.0.0.1:8790`, Chromium/Playwright 1440 × 900.
- Einsatz **„Review Fachberater Hochwasser Deich Elbe“** (Aufbau siehe `reviewer-fachberater-san.md`). Feuerwehr darin: LZ FF Bleckede (EA 1, Einsatz, Ablösung angefordert „FW-Abl-1“), KFB 2 LK Harburg (EA 2, Einsatz, 71 Köpfe), TLF-Gruppe FF Neuhaus (EA 2, Ruhe), Wasserförderzug FF Dahlenburg (BR Sportplatz, Einsatzbereit); Anforderung „FW-WF-1 Wasserförderzug (SW 2000) – Wasserförderung 2 km Polder Süd“; Eingang E 4 „Ablösung Feuerwehr“ (KBM: KFB 2 wird 06:00 durch KFB 3 abgelöst), vom Sichter an die Stelle „Fachberater“ grün verteilt; Tagebuch „EA 2: Wasserförderung über 1,8 km, 3 Pumpen, ca. 4.000 l/min“.
- Arbeitsplatz: eigener Kontext, „FaBe FW“, Profil Vorgabe, Stellen „Fachberater“ + frei „FaBe FW“, Hz. „FW“. Ein zweiter Kontext „FaBe San“ mit derselben Stelle „Fachberater“ lief parallel.
- Screenshots: Scratchpad `reviews/fachberater/fw-*.png`, `mon-9.png`, `san-04-posteingang.png`. Code nur gelesen.
- Nicht wiederholt: `docs/audits/nachrichten/runde2-reviewer-fachberater.md`; der ETB-Fehler „Invalid ISO datetime“ steht in `reviewer-fachberater-san.md` (San-B1) und trifft den FW-Fachberater genauso.

## Kurzes Urteil

Die Feuerwehrkräfte je Abschnitt bekomme ich: Suche „Feuerwehr“ in der Einheitentabelle liefert 4 Einheiten mit Abschnittssummen, Status und – mit Spaltengruppe „Ressourcen“ – „Ablösung angefordert“, „Zugesagt für“, „Ablösung durch“. Das ist brauchbar. Es fehlt aber eine **Ablöseplanung** auf der Zeitachse (wer ist seit wann drin, wann muss wer raus, wer kommt), und für **Wasserförderung** gibt es kein einziges Feld: Förderstrecke, Pumpen, Leistung, Schlauchbedarf stehen nur im Freitext. Und meine Nachricht vom KBM landet als „grün: bearbeiten“ auch beim Fachberater Sanitätsdienst, weil es nur **eine** Stelle „Fachberater“ gibt (FW-B1).

## Fehlende Ansichten

### FW-A1 (P1) Ablöse- und Einsatzzeitplan der eigenen Kräfte

- **Was die Rolle sehen und tun muss:** je Feuerwehreinheit: im Einsatz seit, Einsatzdauer bis jetzt, geplantes Ende/„Verfügbar bis“, Ablösung angefordert/zugesagt/eingetroffen, Ablöseeinheit, Übergabezeit; als Zeitleiste oder Tabelle sortiert nach „muss als Nächstes raus“. Warnung bei Überschreiten einer Einsatzdauer (Annahme: übliche 12-h-Grenze bei ehrenamtlichen Kräften; nicht als Vorschrift gemeint).
- **Was die App schon hat:** Spaltengruppe „Ressourcen“ in der Einheitentabelle (`fw-01-feuerwehr-ressourcen.png`): Verfügbar bis (Marke „läuft ab“ einen Tag vorher), Ablösung angefordert, Anforderungs-ID, Zugesagt für/von, Ablösung durch, Eingetroffen, Einsatzende, Rückführung. Dazu Schicht (bei mir leer). Die Ansicht „Nächste 24 h“ im Blatt S4 rechnet Zu- und Abgänge bereits zeitbezogen – nur für Verpflegung.
- **Fehlt:** „Im Einsatz seit“ als Spalte (nur im Tagebuch über die Statuszeile), Sortierung nach Zeit, eine Zeitachse, eine Warnschwelle. Die Daten liegen verteilt in Statusereignissen, Anforderungen und Ressourcenspalten.

### FW-A2 (P1) Wasserförderung und Pumpenlage

- **Was die Rolle sehen und tun muss:** je Förderstrecke: von/nach, Länge, Höhenunterschied (Annahme), eingesetzte Pumpen mit Leistung, Schläuche, verantwortliche Einheit, Zustand (in Betrieb/gestört/Tankstelle nötig), Gesamtfördermenge; dazu freie Pumpenkapazität (Einheiten mit Pumpen, einsatzbereit). Für Hochwasser auch die Pumpen des THW (FGr WP, Großpumpe 15.000 l/min) – Fachberater FW und THW-Fachberater planen hier gemeinsam.
- **Was die App schon hat:** Fahrzeuge der Einheit (Typ, Bezeichnung, Kennzeichen, Status; `FahrzeugAngelegt` in `packages/domaene/src/katalog/schemata.ts:270`), Spalte „Geräte / Fahrzeuge“, die S4-Kraftstoffliste. Keine Geräte mit Leistung, keine Förderstrecke, keinen Ort. Die Zahlen meines Beispiels stehen nur im Tagebuch und in den Anforderungen „Pumpen-1“ und „FW-WF-1“ als Text.
- **Verstreut über:** Tagebuch, Anforderungen (Freitext), Fahrzeugliste.

### FW-A3 (P2) Feuerwehr-Kräftebilanz nach Status je Abschnitt

- **Was die Rolle sehen und tun muss:** je Abschnitt: Feuerwehr im Einsatz / in Ruhe / einsatzbereit (Reserve) / nicht einsatzbereit / erwartet – also verfügbar vs. gebunden.
- **Was die App schon hat:** Monitor Taste 9 „Abschnitt × Organisation“ zählt Köpfe vor Ort ohne Status (die TLF-Gruppe in Ruhe zählt in EA 2 voll mit, `mon-9.png`). Die Ausgabe „Status – Kräftebilanz nach Organisation, Status und Schicht“ hat Organisation und Status als zwei getrennte Tabellen, keine Kreuzung. Die Filterchips der Tabelle (Einsatz 2, Ruhe 1, Einsatzbereit 1) kombinieren mit der Suche – das ist der einzige Weg.

## Befunde an vorhandenen Ansichten (neu)

### FW-B1 (P1) Mehrere Fachberater teilen sich eine Stelle: der Auftrag an FW landet als „bearbeiten“ beim Fachberater San

- **Beobachtung:** Der Sichter verteilt E 4 „Ablösung Feuerwehr“ an „Fachberater (grün)“ – die Stelle, die die Verteilermatrix anbietet (Leiter, S1–S6, Fachberater, Verbindungsstelle; `21-verteiler.png`). Im Kontext „FaBe San“ (Stellen Fachberater + FaBe San) steht E 4 als „Kopie grün · grün: bearbeiten · neu“ im Posteingang (`san-04-posteingang.png`). Dasselbe sieht der FW-Fachberater. Wer zuerst „Erledigt“ drückt, erledigt für die Stelle (Handbuch: „Gelesen und erledigt gelten je Stelle“).
- **Auswirkung:** Bei vier Fachberatern im Stab (San, FW, Bundeswehr, Wasserbehörde) bekommt jeder alles Grüne der anderen; der Falsche erledigt, der Richtige sieht danach „erledigt“ und handelt nicht. Der Sichter kennt die freie Stelle („Weitere Stelle“ + „Dazu“) – nur wenn er weiß, dass „FaBe FW“ besetzt ist; die Matrix schlägt freie Stellen der besetzten Arbeitsplätze nicht vor.
- **Empfehlung:** In der Verteilermatrix die besetzten freien Stellen der Arbeitsplätze anbieten (sie stehen schon in der Statuszeile: „Fachberater, FaBe FW, Verbindungsstelle, VB Bw, FaBe Wasserbehörde“); beim Wählen von „Fachberater“ Rückfrage, wenn mehrere Arbeitsplätze diese Stelle tragen; in der Stellenwahl „Fachberater“ mit Pflichtzusatz (Organisation/Fachgebiet).
- **Verifikation:** Zwei Arbeitsplätze mit „Fachberater …“ besetzt → der Sichter sieht beide getrennt und muss einen wählen.

### FW-B2 (P2) Doppelklick auf den Einheitennamen öffnet die Umbenennung, nicht die Einheit

- **Beobachtung:** Doppelklick auf „Kreisfeuerwehrbereitschaft 2 LK Harburg“ setzt die Namenszelle in Bearbeitung (Text markiert, „hrbereitschaft 2 LK Harburg“ angeschnitten, `fw-02-einheit-dblclick.png`). Es gibt keine Detailansicht der Einheit (Fahrzeuge, Personen, Aufträge, Zeiten auf einen Blick); Doppelklick heißt überall „bearbeiten“.
- **Auswirkung:** Ein Fachberater von außen erwartet „Öffnen“ und tippt dann womöglich in den Namen einer fremden Einheit; Enter oder Wegklicken schreibt. Zudem hat der Fachberater dieselben Schreibrechte wie S1 (Status ändern, Einheit entfernen, im Blatt Exporte „Einsatz beenden“).
- **Empfehlung:** Für Fachberater-Arbeitsplätze ein Lesezuschnitt (Profil „Fachberater“ ohne Zellbearbeitung, nur Tagebuch/Nachrichten schreibend); unabhängig davon eine Lese-Detailkarte der Einheit (Klick auf ⓘ o. ä.).
- **Verifikation:** Im Profil „Fachberater“ öffnet Doppelklick eine Lesekarte; Status und Name sind nicht editierbar.

### FW-B3 (P2) Die Anforderung „Wasserförderzug“ ist mit keiner Einheit und keinem Abschnitt verbunden

- **Beobachtung:** „FW-WF-1“ hat nur Kennung, vorgesehene Einheit (Text) und Auftrag (Text) (`11-anforderungmaske.png`, `12-anforderungen.png`). Ohne „Ablösung für“ erscheint sie in keiner Ressourcenspalte und keinem Abschnitt; in der Tabelle „Feuerwehr“ taucht sie nicht auf, im Monitor nicht unter „Erwartet“. Erst beim „Eingetroffen“ wird eine Einheit angelegt und dann Organisation und Abschnitt gefragt.
- **Auswirkung:** Was die Feuerwehr nachgefordert hat, sieht der Fachberater nicht bei seinen Kräften; er muss die Anforderungsliste (unter „Mehr ▾ → Eingangskorb → Anforderungen“) im Kopf abgleichen.
- **Empfehlung:** Organisation und Ziel-Abschnitt schon an der Anforderung (optional), damit sie als „erwartet“ beim richtigen Abschnitt und der richtigen Organisation zählt. Siehe auch `reviewer-bundeswehr.md` Bw-B2.
- **Verifikation:** Anforderung mit Organisation Feuerwehr, Abschnitt EA 2 → Monitor Taste 9 „Erwartet Feuerwehr“ zeigt sie.

### FW-B4 (P3) „Davon-Stärke“ nur für eine Organisation je Ausdruck

- **Beobachtung:** Blatt Exporte, „Druck – Stärke je Bereich für die Lagekarte“, Auswahl „Davon-Stärke“ eine Organisation (`san-07-exporte.png`; erzeugte `druck_2026-11-22_1724.html` mit „Davon Stärke: DRK“).
- **Auswirkung:** Für die Lagebesprechung braucht der FW-Fachberater Feuerwehr **und** THW (gemeinsame Deichverteidigung) – zwei Ausdrucke.
- **Empfehlung:** Mehrfachauswahl oder Spalten je gewählter Organisation.
- **Verifikation:** Druck mit Feuerwehr und THW in einem Blatt.

## Schluss

- **Aufgabe geschafft?** Kräfte je Abschnitt: ja (Suche + Gliederung). Ablösung: teilweise (Spalten vorhanden, aber keine Zeitachse, kein „seit wann“). Wasserförderung: nein, nur Freitext.
- **Größtes Risiko:** Grüne Nachrichten an „Fachberater“ werden vom falschen Fachberater erledigt (FW-B1) – ein Ablöseauftrag kann so liegen bleiben.
- **Top-Priorität:** Fachberater-Stellen unterscheidbar machen (FW-B1), danach die Ablöse-Zeitachse (FW-A1).
