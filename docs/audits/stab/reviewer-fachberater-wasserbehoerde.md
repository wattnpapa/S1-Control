# Stab-Audit: Fehlende Ansichten aus Sicht des Fachberaters Wasserbehörde

Datum: 2026-11-22
Rolle des Prüfers: Fachberater der unteren Wasserbehörde bzw. des Landesbetriebs für Wasserwirtschaft (Deichschau), in die FüSt TEL eines Landkreises gesetzt. Kennt Pegel, Deichaufbau und Schadensbilder, nicht das Stabsvokabular und das Programm. Auftrag: „Du sagst uns, wie sich das Wasser entwickelt, wo der Deich schwach ist und welche Auflagen gelten.“

## Scope und Methodik

- Stand: Commit 1c9dfee, Web-Schale `http://127.0.0.1:8790`, Chromium/Playwright 1440 × 900.
- Einsatz **„Review Fachberater Hochwasser Deich Elbe“** (Aufbau siehe `reviewer-fachberater-san.md`). Für diese Rolle: Abschnitte „EA 1 Deich Nord“, „EA 2 Deich Süd“; Einheiten „Deichverteidigung Wasserwirtschaftsamt“ (Wasserwirtschaft, EA 1) und „Deichwache Deichverband“ (Regie, EA 2); Eingang E 2 „Pegel und Deichzustand“ (Pegel Hohnstorf 17:00 9,42 m, steigend 3 cm/h, Scheitel 24.11. 06:00 bei 9,80 m; Sickerstelle km 15,2; Auflage: keine schweren Fahrzeuge auf der Deichkrone km 14–16), vom Sichter an die freie Stelle „FaBe Wasserbehörde“ grün verteilt; Tagebucheintrag aus der Lagebesprechung mit denselben Angaben; Anforderung „Amtshilfe BW-2 – Verschluss Sickerstelle km 16“.
- Arbeitsplatz: eigener Kontext, „FaBe Wasser“, Profil Vorgabe, nur freie Stelle „FaBe Wasserbehörde“, Hz. „WW“.
- Screenshots: Scratchpad `reviews/fachberater/ww-*.png`. Code nur gelesen.
- Nicht wiederholt: `docs/audits/nachrichten/runde2-reviewer-fachberater.md`; freie Stelle fehlt in „Posteingang von“ (schon `reviewer-ldf.md`); ETB-Fehler `reviewer-fachberater-san.md` San-B1; gemeinsame Fachberater-Stelle `reviewer-fachberater-fw.md` FW-B1.

## Kurzes Urteil

Das Programm ist ein Kräfte- und Nachrichtenwerkzeug; **meine Lage – Wasserstand, Prognose, Deichzustand, Auflagen – hat darin keinen Platz.** Alles, was ich beitrage, steht als Fließtext in einer Nachricht oder im Tagebuch und ist danach kaum wiederzufinden: Die Tagebuchsuche findet „Sickerstelle“ nicht im Inhalt meiner eigenen Lagemeldung (B1). Die Auflage „Deichkrone km 14–16 nicht befahren“ sieht keiner, der eine Einheit dorthin schickt. Positiv: Meine freie Stelle funktioniert, E 2 kam grün und als „neu“ bei mir an (`ww-01-posteingang.png`).

## Fehlende Ansichten

### WW-A1 (P0) Wasserstände und Prognose (Pegelverlauf)

- **Was die Rolle sehen und tun muss:** je maßgeblichem Pegel: Messwert mit Zeit und Quelle, Tendenz (cm/h), Prognose (Scheitel, Zeitpunkt, Unsicherheit), Meldestufe bzw. Alarmstufe (Annahme: landesrechtlich unterschiedlich, daher nur als frei benannte Schwelle); Verlauf als kleine Kurve oder Tabelle der letzten Stunden; „letzte Meldung vor X min“. Eintragen in Sekunden, weil Pegel stündlich kommen.
- **Was die App schon hat:** nichts Strukturiertes. Die Werte stehen in E 2 (Inhalt) und im Tagebuch (Zeile 75). Kein Ereignis, keine Tabelle, kein Monitor-Bild; das Modell kennt nur Einheiten, Abschnitte, Fahrzeuge, Personen, Aufträge, Anforderungen, Nachrichten, Funk und Versorgung (`packages/domaene/src/katalog/`).
- **Warum P0:** Beim Hochwasser hängen Evakuierungs- und Kräfteentscheidungen am Pegelverlauf. Steht er nur in Fließtext verteilt, rechnet jeder mit einem anderen Wert, und der Monitor im Stabsraum zeigt Stärke statt Wasser.

### WW-A2 (P0) Deichlage nach Deichkilometer (Schadstellen und Maßnahmen)

- **Was die Rolle sehen und tun muss:** Liste (später auch Karte) der Schadstellen: Deich-km/Ort, Art (Sickerstelle, Qualmwasser, Böschungsrutschung, Kappensprung, Überströmung – Annahme: üblicher Wortschatz der Deichverteidigung), Zustand/Entwicklung, Zeit der letzten Kontrolle, eingesetzte Einheit, Maßnahme (Quellkade, Auflast, Sandsackverbau) und deren Stand; zugeordnet zum Einsatzabschnitt. Die Deichwache meldet, ich bewerte.
- **Was die App schon hat:** Abschnitte (EA 1/EA 2) mit Einheiten und Aufträgen; im Schema `AbschnittBemerkungGesetzt` (keine Oberfläche ruft es auf); Aufträge an Einheiten mit Text. Die Sickerstelle km 15,2 steht in E 2, im Tagebuch und als Auftrag in Anforderung BW-2 („km 16“ – schon zwei Kilometrierungen für dieselbe Stelle?).
- **Verstreut über:** Nachrichten, Tagebuch, Anforderungen, Aufträge.

### WW-A3 (P1) Auflagen und Gefahrenhinweise, die alle sehen

- **Was die Rolle sehen und tun muss:** kurze, gültige Auflagen mit Geltungsbereich und Zeitraum („Deichkrone km 14–16: keine Fahrzeuge > 3,5 t“, „Polder Süd: Betretungsverbot“), sichtbar dort, wo jemand einer Einheit einen Auftrag gibt oder sie in den Abschnitt verschiebt, und auf dem Monitor. Aufheben mit Zeit und Name.
- **Was die App schon hat:** Hinweisleiste (nur technische Hinweise), Abschnittsnamen, Funkhinweis je Einheit (Freitext für Sprechfunker). Nichts mit Geltungsbereich und Laufzeit.

### WW-A4 (P2) „Lage Wasser“ als Monitorbild und Ausdruck für die Lagebesprechung

- **Was die Rolle sehen und tun muss:** ein Bild mit Pegel/Prognose, Schadstellen und Auflagen, das vor jeder Lagebesprechung auf den Monitor und auf Papier geht – wie heute die Stärke.
- **Was die App schon hat:** Monitor mit neun Bildern (Stärke, Versorgung, Funkplan, je Abschnitt/Organisation), Exporte „Lagebesprechung“ (Druck, Status, Einheitenliste, Führungsorganisation). Kein Bild ohne Kräftebezug.

## Befunde an vorhandenen Ansichten (neu)

### WW-B1 (P2) Die Tagebuchsuche findet nicht, was im Inhalt einer Nachricht steht

- **Beobachtung:** Einsatztagebuch, Suche „Sickerstelle“: 2 von 78 Einträgen – mein Lagebesprechungseintrag und die Anforderung BW-2 (`ww-03-etb-suche.png`). Die Nachricht E 2, deren Inhalt „Deich km 15,2 Sickerstelle“ lautet, fehlt; ihre Tagebuchzeilen nennen nur den Betreff „Pegel und Deichzustand“. In den Nachrichten selbst sucht das Feld über „Betreff, Inhalt, Absender und Anschrift“.
- **Auswirkung:** Wer im Tagebuch „alles zur Sickerstelle“ sucht, übersieht die Erstmeldung der Wasserbehörde – genau die, mit der Zeitpunkt und Quelle belegt werden.
- **Empfehlung:** Tagebuchsuche auch über den Inhalt verbundener Nachrichten (mit Marke „Treffer im Inhalt von E 2“) oder Hinweis „auch in Nachrichten suchen“ mit Sprung.
- **Verifikation:** Tagebuchsuche „Sickerstelle“ zeigt die Zeilen von E 2.

### WW-B2 (P2) Die Lage eines Abschnitts hat kein Textfeld

- **Beobachtung:** Abschnittsmenü „⋯“: Umbenennen, Typ ändern, Zeichen, Umhängen, Nach oben/unten, Auflösen. Keine Bemerkung/Lage, obwohl `AbschnittBemerkungGesetzt` im Ereigniskatalog steht (Suche über `apps/desktop/src`: kein Aufruf).
- **Auswirkung:** „EA 1 Deich Nord – Sickerstelle km 15,2, Auflage Deichkrone“ lässt sich nirgends an den Abschnitt schreiben; der Abschnittsleiter sieht es nur, wenn ihm jemand die Nachricht gibt.
- **Empfehlung:** Bemerkung am Abschnitt in Menü und Baum (eine Zeile, Tooltip mit Volltext), auch auf dem Monitor „je Abschnitt“. Kleiner Schritt in Richtung WW-A2/WW-A3.
- **Verifikation:** Bemerkung setzen → steht im Baum, im Tagebuch und im Ausdruck „Führungsorganisation“.

### WW-B3 (P3) Organisation „Wasserwirtschaft“ vs. Behörde, „Regie“ für den Deichverband

- **Beobachtung:** Für die Deichwache des Deichverbandes passte keine Organisation; ich habe „Regie“ gewählt (Monitor Spalte „REGIE“ 11). Die Behörde selbst steht als „Wasserwirtschaft“ mit 3 Köpfen in der Kräftezählung.
- **Auswirkung:** Gering; im Monitor ist „Regie“ für Außenstehende unverständlich, und Behördenvertreter zählen als Einsatzkräfte.
- **Empfehlung:** Organisation „Deichverband“ ergänzen (Liste ist offen, `ORGANISATIONEN` in `packages/domaene/src/ereignis.ts`); Behördenvertreter/Fachberater als eigene Kategorie, die nicht in die Ist-Stärke zählt (Annahme, mit S1 klären).
- **Verifikation:** Deichverband auswählbar; Fachberater-Einträge getrennt ausgewiesen.

## Schluss

- **Aufgabe geschafft?** Nein. Ich konnte meine Meldung empfangen und ins Tagebuch schreiben (mit Zeitangabe, sonst San-B1). Wasserstände, Deichzustand und Auflagen bildet die App nicht ab.
- **Größtes Risiko:** Auflagen wie „Deichkrone nicht befahren“ erreichen die Einheiten nicht, weil sie nur in Nachricht und Tagebuch stehen; beim nächsten Auftrag fährt ein schweres Fahrzeug auf den geschwächten Deich.
- **Top-Priorität:** Pegel-/Prognoseansicht (WW-A1) und Deichlage mit Auflagen je Abschnitt (WW-A2/A3); als Sofortmaßnahme die vorhandene Abschnittsbemerkung freischalten (WW-B2).
