# Stab-Audit: Fehlende Ansichten aus Sicht der Verbindungsperson Bundeswehr

Datum: 2026-11-22
Rolle des Prüfers: Verbindungsoffizier eines Kreisverbindungskommandos (KVK) der Bundeswehr, in die FüSt TEL eines Landkreises gesetzt. Kennt Amtshilfeverfahren und die eigene Befehlskette, nicht das THW-Stabsvokabular und nicht das Programm. Auftrag: „Du berätst uns, was die Bundeswehr leisten kann, verfolgst unsere Unterstützungsanträge und hast die eingesetzten Bundeswehrkräfte im Blick.“

## Scope und Methodik

- Stand: Commit 1c9dfee, Web-Schale `http://127.0.0.1:8790`, Chromium/Playwright 1440 × 900.
- Einsatz **„Review Fachberater Hochwasser Deich Elbe“** (Aufbau siehe `reviewer-fachberater-san.md`). Bundeswehr darin: „PiBtl 130 Kp 2 Sandsackverbau“ (EA 1, Einsatz, 4/12/80), „KdoTerrAufg LVK NI Verbindungskommando“ (FüSt TEL, Einsatzbereit), „Hubschrauber-Lastenflug (CH-53)“ (Angefordert/Anmarsch, Status Anmarsch). Anforderungen „Amtshilfe BW-1 – Pionierkompanie (ca. 100 Soldaten), Sandsackverbau Deich Nord km 14–15“ (offen) und „Amtshilfe BW-2 – CH-53 Lastenflug BigBags, Verschluss Sickerstelle km 16“ (zugesagt 20:00 von „LKdo NI / LVK“). Eingang E 3 „Stand Amtshilfeantrag“ vom LKdo NI, an „Verbindungsstelle (grün)“ verteilt. Tagebuch „VB Bw: CH-53 ab 20:00 einsatzbereit, Landeplatz Sportplatz erforderlich, Befehlsgewalt bleibt bei Bw.“
- Arbeitsplatz: eigener Kontext, „VB Bundeswehr“, Profil Vorgabe, Stellen „Verbindungsstelle“ + frei „VB Bw“, Hz. „Bw“.
- Screenshots: Scratchpad `reviews/fachberater/bw-*.png`, `12-anforderungen.png`, `13-zusage.png`, `mon-8.png`. Code nur gelesen.
- Annahmen sind gekennzeichnet. Ich schreibe kein Amtshilferecht vor; die Felder unten sind das, was in der Praxis für die Verfolgung eines Antrags gebraucht wird.
- Nicht wiederholt: `docs/audits/nachrichten/runde2-reviewer-fachberater.md`; ETB-Fehler siehe `reviewer-fachberater-san.md` San-B1, gemeinsame Stelle siehe `reviewer-fachberater-fw.md` FW-B1 (gilt für „Verbindungsstelle“ genauso: Polizei-, Bundeswehr- und Bundespolizei-Verbindung teilen sie).

## Kurzes Urteil

Die eingesetzten Bundeswehrkräfte finde ich (Suche „Bundeswehr“, Monitor „je Organisation“: 99 vor Ort, +5 erwartet). **Den Stand meiner Unterstützungsanträge kann ich nicht führen.** Das Blatt Anforderungen kennt nur Offen → Zugesagt → Eingetroffen/Storniert, nach dem Anlegen lässt sich kein Feld mehr ändern und keine Bemerkung schreiben, und die angeforderten 100 Soldaten tauchen nirgends als „erwartet“ auf. Die Rückmeldung des LKdo („Prüfung läuft, Ansprechpartner und Unterkunft benennen“) steht als Nachricht E 3 ohne Verbindung zur Anforderung BW-1.

## Fehlende Ansichten

### Bw-A1 (P0) Unterstützungsanträge (Amtshilfe) mit Bearbeitungsstand

- **Was die Rolle sehen und tun muss:** je Antrag: Nr./Kennung, Antragsteller (z. B. Landrat/Krisenstab), Datum/Zeit gestellt, angeforderte Fähigkeit (nicht Einheit: „Sandsackverbau 100 Soldaten“, „Lufttransport BigBags“), Ort/Abschnitt, Zeitraum, Weg (über KVK → LKdo; Annahme), **Zwischenstände** (gestellt – beim LKdo in Prüfung – genehmigt/teilweise/abgelehnt – zugesagt mit Kräften – vor Ort – beendet), Rückfragen der Bundeswehr und deren Antwort, Ansprechpartner vor Ort, Bedarf an Unterkunft/Verpflegung (an S4). Sortiert nach „wartet auf wen“.
- **Was die App schon hat:** Blatt Anforderungen (unter „Mehr ▾ → Eingangskorb → Anforderungen“; `12-anforderungen.png`): Kennung, angefordert am, Ablösung für, vorgesehene Einheit (Text), Auftrag (Text), Zusage (Zeit + von wem). Zustände Offen/Zugesagt/Eingetroffen/Storniert. Im Datenmodell gibt es `AnforderungGeaendert` mit dem Feld `bemerkung` (`packages/domaene/src/katalog/schemata.ts:381-391`, Schritt `anforderungGeaendert` in `apps/desktop/src/kontrakt/bedienschritte.ts:467`), aber **keine Oberfläche ruft es auf**. Nachrichten E 3 und Tagebuch tragen den eigentlichen Stand als Freitext.
- **Verstreut über:** Anforderungen, Nachrichten (E 3), Tagebuch, S4 (Unterkunft).
- **Warum P0:** Amtshilfe wird von außen nachgefragt („Wo steht unser Antrag?“) und hat Kosten- und Rechtsfolgen; wenn der Stand nur im Kopf des Verbindungsoffiziers liegt, ist er bei Schichtwechsel weg.

### Bw-A2 (P1) Bundeswehrkräfte im Einsatz mit Auftrag, Unterstellung und Dauer

- **Was die Rolle sehen und tun muss:** je Bundeswehrteil: Auftrag (welcher Antrag), Einsatzort/Abschnitt, Ansprechpartner/Führer, Unterstellungsverhältnis (Annahme: Bundeswehrkräfte bleiben in ihrer Befehlskette, die FüSt koordiniert nur – deshalb „Zusammenarbeit mit“ statt „unterstellt“), seit wann im Einsatz, Ende laut Zusage, Unterkunft und Verpflegung geklärt ja/nein.
- **Was die App schon hat:** Einheitentabelle (Suche „Bundeswehr“: 3 Einheiten mit Abschnitt, Status, Stärke), Spalte „Aufträge“, Ressourcenspalten „Verfügbar bis“, Versorgung (S4) mit Unterkunft je Einheit. Die Verbindung Einheit ↔ Antrag gibt es nur über „Eingetroffen … Einheit anlegen“ (dann steht der Antrag nur am Ende der Kette), nicht als sichtbare Spalte.
- **Fehlt:** Antragsbezug an der Einheit, „Zusammenarbeit/Unterstellung“, ein Blick, der Einheiten und S4-Stand zusammenführt.

### Bw-A3 (P2) Fähigkeitenkatalog statt Einheitenvorlage

- **Was die Rolle sehen und tun muss:** beim Beraten: Was kann die Bundeswehr typischerweise stellen (Pioniere, Lufttransport, Sanität, Betankung, Unterkunft), mit Vorlaufzeit – als Hilfe zum Formulieren einer Anforderung, nicht als Bestand.
- **Was die App schon hat:** Vorlagen THW StAN, Feuerwehr, KatS-StAN Nds. Für Bundeswehr nichts; Ebenen sind die THW/FW-Ebenen (Großverband, Abteilung, Bereitschaft, Zug, Gruppe …), „Kompanie“ oder „Bataillon“ fehlen (ich habe „Abteilung“ gewählt). Annahme: ein kleiner Katalog als Textbaustein reicht.

## Befunde an vorhandenen Ansichten (neu)

### Bw-B1 (P1) Eine Anforderung lässt sich nach dem Anlegen nicht mehr ändern und hat keine Bemerkung

- **Beobachtung:** Anforderung „Amtshilfe BW-1“ gewählt: Leiste und Kontextmenü bieten nur „Zusagen …“ und „Stornieren …“ (`bw-01-kontext.png`); Doppelklick auf die Zeile tut nichts (`bw-02-dblclick.png`). Die Anlegemaske hat keine Bemerkung (`11-anforderungmaske.png`). Im Code ruft keine Oberfläche `anforderungGeaendert` auf (Suche über `apps/desktop/src`), obwohl Handbuch und Bedienhilfe zur Einheitentabelle sagen, die Ablösungsspalten „kommen aus der Ansicht ‚Anforderungen‘ und werden dort bearbeitet“.
- **Auswirkung:** „Pionierkompanie (ca. 100 Soldaten)“ wird nach Rückfrage „80 Soldaten, ab 06:00“ – das lässt sich nur durch Stornieren und Neuanlegen abbilden; die Kennung „Amtshilfe BW-1“ wird damit doppelt oder wechselt. Rückfragen und Zwischenstände gehen ins Tagebuch, ohne Bezug.
- **Empfehlung:** In der Auswahlleiste „Bearbeiten …“ für Kennung, vorgesehene Einheit, Auftrag, Bemerkung (die Schritte existieren schon); Handbuchsatz korrigieren, solange es fehlt.
- **Verifikation:** BW-1 wählen → „Bearbeiten …“ → Bemerkung „LKdo prüft, Rückfrage Unterkunft“ → steht in der Liste und im Tagebuch.

### Bw-B2 (P1) Angeforderte Kräfte zählen nicht als „erwartet“, weil die Anforderung keine Organisation und Stärke hat

- **Beobachtung:** Monitor Taste 8 „Stärke je Organisation“: Bundeswehr 99, Erwartet +5 (`mon-8.png`). Die +5 sind der als Einheit angelegte CH-53-Trupp. Die offene Anforderung BW-1 über ca. 100 Soldaten fehlt in jeder Summe (Kopfband „+5 erwartet“, Status-Ausgabe, Versorgung „Nächste 24 h“).
- **Auswirkung:** Lagebesprechung und S4 planen ohne die 100 angeforderten Soldaten (Unterkunft und Verpflegung, die das LKdo in E 3 gerade abfragt). Der Verbindungsoffizier muss das mündlich nachtragen.
- **Empfehlung:** Optionale Felder Organisation und Stärke (Fü/UFü/He oder nur Gesamt) an der Anforderung; offene/zugesagte Anforderungen als „angefordert, noch ohne Einheit“ in die Erwartet-Spalte der Organisation und – mit Eintreffzeit aus der Zusage – in die S4-Vorausschau.
- **Verifikation:** BW-1 mit Bundeswehr, 100 → Monitor „Erwartet Bundeswehr +105“, S4-Vorausschau ab Zusagezeit.

### Bw-B3 (P2) Eine Nachricht zum Antrag lässt sich nicht mit der Anforderung verbinden

- **Beobachtung:** E 3 „Stand Amtshilfeantrag“ (Inhalt nennt „Antrag Amtshilfe BW-1“) hat in der Leiste Öffnen, Erledigt, Antworten, Weiterleiten, Drucken, „Im Tagebuch zeigen“, Zurückziehen – kein „zu Anforderung …“. Die Anforderung kennt umgekehrt keine Nachrichten. Ein Tagebucheintrag kann laut Schema einen Bezug ANFORDERUNG tragen (`EtbEintragErfasst.bezug`, `schemata.ts:486-491`), die Eintragsmaske bietet ihn nicht an.
- **Auswirkung:** Die Geschichte eines Antrags (Antrag raus, Rückfrage rein, Antwort raus, Zusage) ist nur über Volltextsuche in Nachweisung und Tagebuch zu rekonstruieren.
- **Empfehlung:** „Zu Anforderung …“ an Nachricht und Tagebucheintrag; in der Anforderung „Verlauf“ mit allen verbundenen Nachrichten und Einträgen.
- **Verifikation:** E 3 mit BW-1 verbinden → BW-1 zeigt E 3 im Verlauf.

### Bw-B4 (P2) Die Anforderungsliste hat keine Suche und keinen Filter nach Organisation

- **Beobachtung:** Handbuch und Bedienhilfe nennen für Anforderungen „Kürzel: Strg+N · Strg+F · Strg+D“; die Ansicht hat nur die Zustandsfilter, kein Suchfeld (`bw-02-dblclick.png`). Die Liste ist nach Zustand sortiert, nicht nach Alter oder „wartet seit“.
- **Auswirkung:** Bei 30+ Anforderungen gemischter Organisationen sucht der Verbindungsoffizier seine von Hand.
- **Empfehlung:** Suchfeld wie in der Einheitentabelle; Spalte „offen seit“.
- **Verifikation:** Strg+F im Blatt Anforderungen setzt den Fokus in ein Suchfeld; „BW“ zeigt nur die beiden Anträge.

### Bw-B5 (P3) Ebenen und Stärkebegriffe passen nicht zur Bundeswehr

- **Beobachtung:** Ebene ohne Kompanie/Bataillon; Stärke als „Führer / Unterführer / Mannschaft“ (Fü/UFü/He). Ich habe „Abteilung“ und 4/12/80 eingetragen und war unsicher, ob Offiziere „Führer“ sind.
- **Auswirkung:** Gering, aber jede Bw-Meldung muss umgedacht werden; im Ausdruck steht „Abteilung“, was es bei der Bundeswehr nicht gibt.
- **Empfehlung:** Ebene „Kompanie“, „Bataillon“ ergänzen (Wertebereich ist offen, `ORGANISATIONEN`/`TAKTISCHE_EBENEN` in `packages/domaene/src/ereignis.ts`); Tooltip an Fü/UFü/He „Offz / Uffz / Mannschaften“.
- **Verifikation:** Einheit Bundeswehr, Ebene Kompanie anlegen.

## Schluss

- **Aufgabe geschafft?** Eigene Kräfte sehen: ja. Unterstützungsanträge und deren Stand führen: nein – nur Offen/Zugesagt, ohne Änderung, ohne Bemerkung, ohne Verbindung zu den Nachrichten.
- **Größtes Risiko:** Angeforderte Bundeswehrkräfte fehlen in jeder Planungszahl (Bw-B2); Unterkunft und Verpflegung für 100 Soldaten werden zu spät geplant.
- **Top-Priorität:** Anforderung bearbeitbar machen und um Organisation/Stärke/Bemerkung ergänzen (Bw-B1, Bw-B2) – das ist der Unterbau für die Ansicht „Unterstützungsanträge mit Bearbeitungsstand“ (Bw-A1).
