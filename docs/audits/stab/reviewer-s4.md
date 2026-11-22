# Stabsreview S4 – Versorgung/Logistik

Stand: 22.11.2026, Web-Schale http://127.0.0.1:8790 (Playwright, Chromium, 1440 × 900). Übungseinsatz „Review S456 Hochwasser Weser“ (FüSt OV Hameln): 7 Abschnitte, 15 Einheiten (THW, Feuerwehr, DRK, Regie), 133 Kräfte Ist, 18 im Anmarsch, 5 Rufgruppen, 4 Anforderungen (davon 3 für Material bzw. Verpflegung als Umweg), Bestellung Abendessen, Ausgabestelle, 2 Unterkünfte mit 9 Zuweisungen, Tagebucheinträge. Eigener Arbeitsplatz mit Profil „Versorgung (S4)“ und Stelle S4. Screenshots und Skripte: `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/s456/` (Dateien `19-*` bis `25-*`, `33-*`, `34-monitor-*`, `36-start-versorgung.png`).

Einschränkung: `@bos/eeb-format` ist ein Platzhalter. Alles, was aus dem Erfassungsbogen kommt (Kostform, Übernachtungsbedarf m/w/d, Sofortbedarf Verpflegung/Diesel/Benzin/Gemisch/Unterbringung/Ruhezeit), war deshalb leer. Dazu gibt es hier keine Befunde; wo ein Befund daran grenzt, steht es dabei.

## Urteil aus Sicht des S4

Für **Verpflegung** ist das Blatt S4 stark: Mahlzeitenplan je Bereich, Vorausschau 24/48 h mit Zu- und Abgängen, Bestellung mit Reserve, „Als geliefert melden“ und ein Monitorbild für das Küchenzelt. **Unterbringung** ist bedienbar, zeigt aber widersprüchliche Zahlen. Für alles andere, was ein S4 den ganzen Einsatz über treibt – **Material, Verbrauchsgüter, Betriebsstoff, Transporte, Lieferungen, Sachkosten** – gibt es keine Ansicht. Das einzige Werkzeug dafür ist „Anforderungen“, und das ist auf Kräfte zugeschnitten (Ablösung, vorgesehene Einheit, beim Eintreffen „Einheit anlegen“). Ich habe Sandsäcke, Diesel und eine Caterer-Verpflegung dort als Freitext angelegt; das geht, ist aber ein Umweg, der die Lage verschmutzen kann (Befund S4-4).

## Fehlende Ansichten

### S4-A1 (P1) – Material- und Verbrauchsgüter: Bedarf, Bestellung, Lieferung

- **Was der S4 sehen/tun muss:** Je Position Bedarf (was, Menge, Einheit wie Stück/t/l), anfordernde Stelle oder Abschnitt, Lieferort/Empfänger, Lieferant, zugesagte Zeit, Status (offen, bestellt, unterwegs, geliefert, teilgeliefert, storniert), Quittung des Empfängers, Bemerkung. Filter „offen / überfällig“, Sortierung nach Lieferzeit. Annahme: Typische Güter im Hochwasser sind Sandsäcke, Sand, Folie, Pumpenzubehör, Beleuchtung, Hygienebedarf.
- **Was die App schon hat:** Das Ereignismuster der Anforderungen (angelegt → zugesagt mit Zeit und „von“ → eingetroffen/storniert, mit Rückgängig und Tagebuch), die Bestellung der Verpflegung (Menge, „bestellt bei/von“, geliefert), Abschnitte als Lieferorte, Ausgabestellen und Unterkünfte als Orte.
- **Wo es heute verstreut ist:** Anforderungen unter „Mehr → Eingangskorb → Anforderungen“ (nur Freitext „Vorgesehene Einheit“/„Auftrag“), Bestellung nur für Mahlzeiten im Blatt S4, Rest im Einsatztagebuch als Freitext oder in Nachrichten.

### S4-A2 (P1) – Betriebsstoff (laufend), nicht nur Sofortbedarf

- **Was der S4 sehen/tun muss:** Verbrauch und Bedarf an Diesel/Benzin/Gemisch je Abschnitt bzw. Verbraucher (Pumpen, Aggregate, Fahrzeuge), Tankstellen/Tankwagen, Betankungsrunden mit Uhrzeit, Restmenge, nächste fällige Betankung. Annahme: Bei Pumpenbetrieb über Nacht ist das die zeitkritischste S4-Aufgabe.
- **Was die App schon hat:** Fahrzeuge je Einheit (für die Kraftstoffliste), die Sofortbedarfsfelder Diesel/Benzin/Gemisch aus dem Bogen (`packages/domaene/src/projektion/sofortbedarf.ts`), die Kraftstoffliste als Ausgabe.
- **Wo es heute verstreut ist:** Unteransicht „Sofortbedarf“ (nur Erstmeldung beim Eintreffen, laut Blatt ausdrücklich „kein laufender Verbrauch“), Kraftstoffliste im „⋯“, Rest im Tagebuch. Meine Diesel-Anforderung MAT-02 stand als Freitext in den Anforderungen.

### S4-A3 (P2) – S4-Lagebild: „Was ist für mich offen?“

- **Was der S4 sehen/tun muss:** Auf einer Seite: nächste Mahlzeit (Bedarf, bestellt, geliefert), offene und überfällige Lieferungen/Anforderungen, Betten frei/fehlend heute Nacht, Betriebsstoff fällig, ungelesene Nachrichten an S4, Sofortbedarf offen. Für die Schichtübergabe druckbar.
- **Was die App schon hat:** Alle Zahlen einzeln (Band des Blatts S4, Anforderungen mit Filter, Nachrichten-Posteingang „Offen“ je Stelle, Sofortbedarf offen).
- **Wo es heute verstreut ist:** Blatt S4 (5 Unteransichten), „Mehr → Eingangskorb → Anforderungen“, „Mehr → Nachrichten“, „Mehr → Kosten“. Im Profil „Versorgung (S4)“ stehen davon nur S4, S1 und Exporte im Band (Befund S4-2).

### S4-A4 (P2) – Sachkosten und Belege

- **Was der S4 sehen/tun muss:** Kosten je Bestellung/Lieferung/Unterkunft (Caterer-Rechnung, Materialkauf, Hallenmiete, Betriebsstoff), Kostenträger, Beleg-Nr., Summe je Tag und Kategorie.
- **Was die App schon hat:** Bestellungen der Verpflegung mit Menge und Lieferant, Unterkünfte, das Blatt Kosten mit Einsatzparametern und Abrechnungsausgabe.
- **Wo es heute verstreut ist:** Das Blatt Kosten rechnet nur PSA, VDA und Unterkunft/Verpflegung als Pauschale **je Kraft und Tag** (beobachtet: 133 Kräfte, 113.050,00 €). Die bestellten 150 Portionen beim Caterer erscheinen dort nicht.

### S4-A5 (P3) – Lager-/Logistikstützpunktbestand

- **Was der S4 sehen/tun muss:** Bestand je Lagerort (z. B. „Sandsäcke Hafen: 3.000 vorhanden, 2.000 ausgegeben an EA 3“), Ausgabe an Abschnitte, Rücknahme.
- **Was die App schon hat:** Abschnittstyp „Logistik“ und „Bereitstellungsraum“, Ausgabestellen.
- **Wo es heute verstreut ist:** Nirgends; nur Tagebuch-Freitext.

## Befunde an vorhandenen Ansichten

### S4-1 (P1) – Unterbringung: Belegung, Bedarf und Band widersprechen sich

- **Beobachtung:** Nach 9 Zuweisungen zeigt die Unterkunftskarte „Turnhalle KGS 81 / 80 · m 81 · w 0 · d 0 · ⚠ überbelegt“ und „Gemeindehaus Tündern 27 / 25“, der Kopf „105 Plätze · 108 belegt“. Gleichzeitig nennt die Tabelle rechts „Einheiten mit Übernachtungsbedarf · 8 Einheiten · 0 Betten · ohne Unterkunft 0“ mit ÜN m/w/d = 0 in jeder Zeile, das Band „BETTEN HEUTE NACHT 0“ und „OHNE UNTERKUNFT 0“, der Monitor (Taste 4) „0 BETTEN BENÖTIGT … belegt 108 · frei 0“. Alle Köpfe werden als „männlich“ gezählt (`23-belegt.png`, `34-monitor-4.png`).
- **Auswirkung:** Der S4 liest im Band „0 Betten heute Nacht“, obwohl 108 Personen untergebracht sind und zwei Unterkünfte überbelegt sind. Wer nach dem Band plant, bestellt keine weiteren Plätze. Die m/w/d-Aufteilung (für Schlafräume und Sanitär) ist bei fehlenden Personendaten falsch statt „unbekannt“.
- **Empfehlung:** Band und Monitor aus derselben Quelle wie die Karten rechnen: „Betten heute Nacht“ = Bedarf aus Bogen **oder** belegt, was größer ist, mit Herkunft der Zahl. Ohne Personendaten „Geschlecht unbekannt: n“ statt alles männlich. Eine zugewiesene Einheit ohne gemeldeten Bedarf mit ihren Köpfen in die Tabelle übernehmen (die Karte tut es schon).
- **Verifikation:** Einheiten ohne Bogen zwei Unterkünften zuweisen; Band, Tabellenkopf, Karten und Monitor 4 müssen dieselbe Bettenzahl nennen. Teilweise EEB-abhängig (der Bedarf kommt sonst aus dem Bogen); der Widerspruch Karte ↔ Band ist es nicht.

### S4-2 (P2) – Profil „Versorgung (S4)“ öffnet das Blatt S1 und versteckt Anforderungen und Nachrichten

- **Beobachtung:** Neuer Arbeitsplatz mit Profil „Versorgung (S4)“: Das Band zeigt „S4 · S1 · Exporte“, geöffnet wird aber das Blatt **S1** (`36-start-versorgung.png`). `blaetter.ts` sagt „Das erste Blatt ist das der Rolle“, `Arbeitsplatz.tsx` (`blattAusMerker`) fällt aber immer auf „lage“ zurück. Anforderungen (Eingangskorb), Nachrichten und Kosten stehen nur unter „Mehr“.
- **Auswirkung:** Der S4 muss für seine Kernarbeit (Lieferungen verfolgen, Posteingang S4 lesen, Kosten) jedes Mal über „Mehr“ gehen; der Hinweis auf neue Nachrichten an S4 ist im Band nicht sichtbar.
- **Empfehlung:** Beim ersten Öffnen ohne Merker das erste Blatt des Profils aufschlagen. Für das Profil „Versorgung“ Nachrichten und Anforderungen ins Band nehmen.
- **Verifikation:** Frischer Browser-Kontext, Profil Versorgung, Einsatz öffnen → Blatt S4 aktiv; Band enthält Nachrichten und Anforderungen.

### S4-3 (P2) – Anforderungen sind nur für Kräfte gebaut

- **Beobachtung:** Die Maske „Anforderung anlegen“ hat nur Kennung, „Ablösung für“, „Vorgesehene Einheit“, „Vorgesehener Auftrag“. Keine Menge, kein Lieferort, kein Lieferant, kein Bedarfszeitpunkt. Die Zusage fragt „Zugesagt für“ und „Zugesagt von“. Die Tabelle hat keine Spalte für die Eintreffzeit; nach „eingetroffen“ steht in „Zusage“ weiter die Zusagezeit.
- **Auswirkung:** Material- und Betriebsstoffanforderungen landen als Freitext in Feldern, die „Einheit“ heißen; Auswertung nach Menge oder Ort ist unmöglich.
- **Empfehlung:** Siehe fehlende Ansicht S4-A1; bis dahin mindestens eine Art „Kräfte / Material / Verpflegung / Betriebsstoff“ und Freitextfelder „Menge“, „Lieferort“.
- **Verifikation:** Anforderung „5000 Sandsäcke“ anlegen; Menge und Lieferort stehen in eigenen Spalten und im Export „Anforderungen“.

### S4-4 (P2) – „Eingetroffen“ bei Material schlägt „Einheit aus der Anforderung anlegen“ vor

- **Beobachtung:** Für MAT-01 („5000 Sandsäcke + 20 t Sand (Bauhof)“) öffnet „Eingetroffen …“ mit vorgewählter Option „Einheit aus der Anforderung anlegen“, Bezeichnung „5000 Sandsäcke + 20 t Sand (Bauhof)“, Organisation THW, Ebene Gruppe, Herkunft „Bauhof Stadt Hameln“ (`33-eingetroffen.png`). Nach „Nur eingetroffen, ohne Einheit“ bietet die Leiste weiter „Einheit anlegen …“ an.
- **Auswirkung:** Ein Klick auf „Anlegen“ mit Abschnitt erzeugt eine THW-„Gruppe“ namens „5000 Sandsäcke …“ in der Lage – sie steht dann in Stärke-, Funk-, Verpflegungs- und Kostenlisten.
- **Empfehlung:** Bei Anforderungen ohne „Ablösung für“ und ohne Stärke „Nur eingetroffen“ vorwählen; mit einer Art „Material“ (S4-3) die Einheitenoption ganz weglassen.
- **Verifikation:** Materialanforderung eintreffen lassen; Vorwahl ist „Nur eingetroffen“, „Einheit anlegen …“ fehlt in der Leiste.

### S4-5 (P2) – Verpflegungsbestellung und Anforderung laufen doppelt und unverbunden

- **Beobachtung:** Die Caterer-Verpflegung stand als Anforderung VPF-01 (zugesagt 18:00, Caterer Weserküche) und als Bestellung „Abend 1800, 150 Portionen, bei Caterer Weserküche“ im Blatt S4. Keine der beiden Stellen kennt die andere.
- **Auswirkung:** Zwei Wahrheiten für dieselbe Lieferung; „geliefert“ an der einen Stelle schließt die andere nicht.
- **Empfehlung:** Verpflegung nur als Bestellung im Blatt S4 führen und die Anforderung darauf verweisen lassen, oder eine gemeinsame Lieferliste (S4-A1).
- **Verifikation:** Bestellung als geliefert melden; zugehörige Anforderung zeigt „eingetroffen“ (oder es gibt nur einen Datensatz).

### S4-6 (P3) – „Ablösung für“ nennt zwei Einheiten gleich

- **Beobachtung:** Die Auswahl „Ablösung für“ listet „(B)“ zweimal (Bergungsgruppe OV Hameln in EA 1 und OV Holzminden in EA 3), ohne Herkunft oder Abschnitt. Die Unterkunftskarte dagegen zeigt „(B) · EA 1 Deichverteidigung Nord · 12 Köpfe“.
- **Auswirkung:** Verwechslung bei der Ablösungsplanung, aus der auch Verpflegung und Unterkunft folgen.
- **Empfehlung:** Dieselbe Beschriftung wie an der Unterkunftskarte (Name · Abschnitt · Herkunft).
- **Verifikation:** Zwei gleich benannte Einheiten anlegen; „Ablösung für“ unterscheidet sie.

### S4-7 (P3) – Ausgabe im „⋯“ nur als HTML, Logistikblatt-Fußnote widersprüchlich

- **Beobachtung:** Das „⋯“ bietet „Bestellliste als HTML“ bzw. „Vorausschau als HTML“; das Handbuch nennt „PDF oder HTML“. Die Fußnote unter „Bereiche · Schichten“ sagt „Die Summe zählt alle Einheiten der Einsatzbereiche, auch im Anmarsch“, die Tabelle führt „Angefordert / Anmarsch“ aber getrennt unter „Gesamt“, und die Fußzeile darunter sagt „Anmarsch getrennt“. Außerdem steht in der Spalte „Ausgabestelle“ des Mahlzeitenplans auch nach „Ausgabestelle anlegen“ („Feldküche Hafen“) weiter „Logistik / Versorgung (Vorbelegung)“, die Bestellmaske bot vorher „— keine —“.
- **Auswirkung:** Unsicherheit, welche Zahl an die Küche geht und wo die Ausgabe stattfindet.
- **Empfehlung:** Fußnote an die tatsächliche Zählung angleichen; PDF ergänzen oder Handbuch berichtigen; Vorbelegung und Bestellmaske gleich benennen.
- **Verifikation:** Texte nebeneinander lesen; „⋯“ prüfen.

### S4-8 (P3) – Kosten kennen nur Personalpauschalen

- **Beobachtung:** Blatt Kosten: vier Parameter (PSA je Satz, VDA, Unterkunft und Verpflegung je Tag und Kraft, geplante Tage), Tabelle je Einheit. Bestellungen, Lieferungen und Unterkünfte erscheinen nicht.
- **Auswirkung:** Sachkosten werden außerhalb der App geführt.
- **Empfehlung:** Siehe S4-A4.
- **Verifikation:** Bestellung anlegen; ihr Betrag erscheint im Blatt Kosten.

## Schluss

- **Aufgabe geschafft:** Verpflegung ja; Unterbringung ja, aber mit widersprüchlichen Zahlen; Material/Betriebsstoff/Lieferungen nur **mit Umwegen** (Freitext in Kräfte-Anforderungen und Tagebuch); Sachkosten **nein**.
- **Größtes Risiko:** Das Band meldet „0 Betten heute Nacht“ bei 108 untergebrachten Personen und überbelegten Unterkünften (S4-1); dazu kann eine Materiallieferung mit einem Klick als Einheit in die Lage geraten (S4-4).
- **Top-Priorität:** Eine Lieferliste für Material, Verbrauchsgüter und Betriebsstoff (S4-A1/A2) mit Menge, Ort, Lieferant, Zeit und Status – auf dem vorhandenen Ereignismuster der Anforderungen.
