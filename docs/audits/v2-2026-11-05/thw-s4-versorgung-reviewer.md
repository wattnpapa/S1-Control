# Audit S4 Versorgung — S1-Control v2, Stand 05.11.2026

Rolle: Sachgebietsleiter S4 (Versorgung) in der Führungsstelle. Ich sorge dafür, dass die Kräfte essen, schlafen, tanken und arbeiten können. Ich brauche Mengen je Mahlzeit und Ort, Schlafplätze, Kraftstoff, Bestellungen mit Stand und am Ende einen Nachweis, was wann für wen beschafft wurde.

**Datum:** 05.11.2026 · **Stand:** HEAD `32f45e1` (UX-Umbau E2–E4, darunter „Versorgung mit einem Hauptknopf je Unteransicht und ‚⋯‘“, Profilwahl, Auswahlleiste, Filterzeilen)
**Material:** eigene Web-Schale mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten), Port 8215, Profil „Versorgung (S4)“ auf der Einsatzauswahl gewählt; Bedienung mit Playwright, 40 Screenshots unter `scratchpad/shots/s4/` (deviceScaleFactor 1); erzeugte Ausgaben im Share der Kopie unter `ausgaben/` (Bestellliste, Vorausschau, Belegungsliste, Kraftstoffliste, Kosten, Logistik, alle HTML); ein selbst gebautes Bündel aus zwei Prüfbögen (`pruefdaten/eeb/thw/040-cloppenburg-fgr-n.json`, `049-wilhelmshaven-fgr-w-a.json`, bei Wilhelmshaven Unterbringung und Ruhezeit auf „ja“ gesetzt); `docs/v2/HANDBUCH.md`, `docs/v2/KURZANLEITUNG.md`; Vorgänger-Audits `docs/audits/v2-2026-10-29/` (dort gab es keinen S4-Reviewer, nur Querbezüge im Command- und Workflow-Audit); Quelltext nur lesend als Beleg.
**Kennzeichnung:** **[beobachtet]** = in der laufenden Kopie ausgelöst bzw. an Screenshot/Ausgabedatei gesehen · **[Code]** = aus Quelltext belegt, Datei:Zeile · **[Annahme]** = plausibel bzw. THW-Ablauf, nicht aus dem Material belegt · **[nicht prüfbar]** = in dieser Umgebung nicht nachstellbar.

Geschrieben habe ich nur in meiner Kopie: Bündel mit zwei Bögen in „EA Pumpwerk Süd“ eingelesen, Sofortbedarf „Diesel“ für beide als erledigt gemeldet, zwei Ausgabestellen („Küche Deich“, „Schulküche“), zwei Bestellungen für die Nachtverpflegung 0000, eine Lieferung, Ausgabestelle für „EA Deich Nord“ gesetzt, vier Unterkünfte (zwei davon ungewollt doppelt, weil mein erster Skriptlauf nach dem Anlegen abbrach), fünf Zuweisungen, „BGr 1 Oldenburg“ nach „EA Schule Mitte“ verschoben, Eintreffzeit für „FGr Räumen B (angefordert)“ auf 06.11. 05:00, Schicht „BGr 2 Oldenburg“ Nacht → Tag.

---

## Urteil

Das Blatt Versorgung ist für mich ein echter Arbeitsplatz geworden. Mit dem Profil „Versorgung (S4)“ habe ich drei Reiter, oben stehen die sechs Zahlen des Tages (Portionen der nächsten Mahlzeit, veg., vegan, Betten, ohne Unterkunft, Anmarsch getrennt), darunter fünf Unteransichten mit je einem Hauptknopf und einem „⋯“. Die **Vorausschau „Nächste 24 h“** rechnet Schicht, Mahlzeitenregel, Zugänge ab gemeldeter Eintreffzeit und Abgänge sauber durch. Ein Schichtwechsel und eine Verlegung schlagen sofort auf die Zahlen durch. Die Bestellkarte zeigt die Differenz zum Bedarf, die Unterkünfte zeigen „⚠ überbelegt“, und jede Liste gibt es als HTML mit „Öffnen“. Die Aufgaben „nächste Mahlzeit ermitteln“ und „Unterkunft anlegen, belegen, Rest prüfen“ schaffe ich ohne Hilfe.

Reibung entsteht dort, wo aus der Zahl eine **Bestellung an einen Ort** werden muss. Je Mahlzeit gibt es genau **eine** geltende Bestellung, ohne Rücksicht auf die Ausgabestelle. Bestelle ich für die Schulküche nach, wird die Bestellung für die Deichküche als „ersetzt“ geführt und fällt aus Karte und Bestellliste. Wenn eine Einheit zwischen zwei Ausgabestellen verlegt wird, bleibt die Gesamtsumme gleich und die Karte meldet keine Abweichung. Die Küche am alten Ort kocht dann für Leute, die nicht mehr kommen. Den Sofortbedarf kann ich nur aus einem eingelesenen Bogen übernehmen, nicht selbst erfassen; „erledigt“ ist ein Haken ohne Menge. Fahrzeuge aus dem Bogen erscheinen als `#26`, `#21`, die Einheit als „#16 Cloppenburg“. Die Kosten sind eine Pauschalrechnung über geplante Tage, kein Nachweis tatsächlicher Verbräuche. Material, Betriebsstoffe außerhalb des Bogens und Instandsetzung kennt die Anwendung nicht.

Ohne Nebenaufzeichnung schaffe ich meine Aufgabe nur teilweise. Bestellungen je Küche bzw. Lieferant, Kraftstoffabgaben mit Litern sowie Material und Instandsetzung führe ich weiter auf Papier.

---

## Findings

### P1-1 · Eine Bestellung je Mahlzeit — die zweite Ausgabestelle ersetzt die erste, eine Verlegung zwischen Küchen bleibt unsichtbar

- **Fundstelle / Aufgabe:** Versorgung → Verpflegung → Bestellkarte „Bestellen …“ / „Bestellung ändern …“; Prüfaufgaben 1 und 2. Screenshots `19-bestellmaske.png`, `20-nach-bestellung1.png`, `21-nach-bestellung2.png`.
- **Beobachtung:**
  - [beobachtet] Zwei Ausgabestellen angelegt („Küche Deich“, „Schulküche“). Nachtverpflegung 0000: 30 Portionen bei „Küche Deich“, bestellt bei „Metzgerei Janssen“. Danach über „Bestellung ändern …“ 17 Portionen bei „Schulküche“. Die Karte zeigt nun „17 · −30 fehlen · bei Schulküche“. Im Verlauf steht „Nacht 06.11. ersetzt: 30“. Die Bestellliste (`ausgaben/bestellliste_…html`) führt nur noch „Nacht … 47 · bestellt 17 · −30 · Schulküche“, und die 30 bei der Metzgerei kommen darin nicht mehr vor.
  - [Code] `packages/domaene/src/projektion/bestellung.ts:4-7` und `:75`: Die geltende Bestellung wird je `datum/mahlzeit` bestimmt, nicht je Ausgabestelle. Jede neuere ersetzt die ältere.
  - [beobachtet] „BGr 1 Oldenburg“ (9 Köpfe, Tag) von „EA Deich Nord“ (Ausgabestelle „Küche Deich“) nach „EA Schule Mitte“ verschoben. Der Mahlzeitenplan folgt sofort: Deich 45 → 36, Schule 47 → 56 beim Frühstück. Die Gesamtzahl bleibt aber 298, und eine Bestellung für Frühstück zeigte deshalb keine Differenz. Weder die Karte noch die Kachelzeile meldet, dass sich die Verteilung auf die Küchen geändert hat.
  - [Code] `apps/desktop/src/renderer/Verpflegungsmasken.tsx:214-231`: Die Maske kennt eine Ausgabestelle je Bestellung und keine Aufteilung.
- **Erwartung der Rolle:** Ich bestelle je Küche bzw. Lieferant und Mahlzeit, also z. B. Frühstück 06.11. bei der Deichküche 36 und bei der Schulküche 56. Jede Bestellung hat ihren eigenen Stand, und wenn sich die Verteilung nach einer Bestellung ändert, sehe ich das an der Küche, die betroffen ist.
- **Auswirkung im Einsatz:** Die zweite Küche überschreibt die erste. Die erste Bestellung ist trotzdem beim Lieferanten aufgegeben, verschwindet aber aus Karte und Liste. Fragt die Metzgerei zurück oder kommt die Rechnung, findet sich die Bestellung nur noch als „ersetzt“ im Verlauf. Nach einer Verlegung bekommt die alte Einsatzstelle zu viel Essen und die neue zu wenig, und die Software zeigt das nicht an. Ich führe die Bestellungen je Küche deshalb wieder auf Papier.
- **Empfehlung:** Bestellungen je Mahlzeit **und** Ausgabestelle führen. Die Karte zeigt sie je Ausgabestelle mit eigenem Bedarf aus dem Mahlzeitenplan und eigener Differenz. „Bestellung ändern“ ersetzt nur die Bestellung derselben Ausgabestelle. Eine Verlegung zwischen Ausgabestellen erzeugt an beiden betroffenen Bestellungen eine sichtbare Differenz.
- **Verifikation:** Zwei Ausgabestellen anlegen, für dieselbe Mahlzeit je eine Bestellung aufgeben. Beide gelten, und beide stehen in der Bestellliste. Danach eine Einheit zwischen den Bereichen verschieben. An beiden Bestellungen erscheint eine Differenz mit Vorzeichen.

### P1-2 · Mitgezählt wird, wer nicht da ist: angeforderte und anrückende Einheiten in Einsatzbereichen, Rückmarsch und Rufbereitschaft

- **Fundstelle / Aufgabe:** Versorgung → Verpflegung, Nächste 24 h, Unterbringung, Kosten; Prüfaufgabe 1. Screenshots `04-versorgung-start.png`, `29-vorausschau-zugang.png`, `25-unterbringung-belegt.png`, `30-kosten.png`.
- **Beobachtung:**
  - [beobachtet] Die zwei per Bündel eingelesenen Einheiten stehen mit Status **„Angefordert“** und ohne Eintreffzeit in „EA Pumpwerk Süd“. Danach steigt das Frühstück dort von 29 auf 48, die Kachel „Betten heute Nacht“ von 44 auf 56 (Wilhelmshaven, 12 Köpfe), und die Kosten rechnen beide Einheiten mit je 5 Tagen. Gleichzeitig steht unter der Bestellkarte: „Der Anmarsch ohne Eintreffzeit ist nicht enthalten“.
  - [beobachtet] Schon in der unveränderten Prüflage zählt die Versorgung in „EA Pumpwerk Süd“ den „GTr Wassergefahren“ (Status **Anmarsch**, ohne Eintreffzeit) und den „Trupp Aufklärung“ (Status **Rückmarsch**, im Kopfband unter „beendet“) mit, zusammen 8 Köpfe zu jeder Tagmahlzeit. Ebenso zählt der „SanZ Bereitstellung“ in **Rufbereitschaft** (15 Köpfe) zu Frühstück, Abend und Nacht und braucht 15 Betten. Die Lage führt alle drei als „erwartet“ bzw. „beendet“.
  - [Code] `packages/domaene/src/projektion/versorgung.ts:128-140`: Als Zugang zählt nur, wer im Bereich „Angefordert / Anmarsch“ steht oder Status Angefordert/Anmarsch **mit** künftiger Eintreffzeit hat. Alles andere in einem Einsatzbereich ist „Bestand“, unabhängig vom Status. Rückmarsch endet erst mit „Rückführung“, „verfügbar bis“ oder „Einsatzende“ (`:111-123`).
  - [beobachtet] Am selben Bildschirm stehen zwei Sätze, die sich widersprechen: Die Fußzeile sagt „Anmarsch getrennt“, die Fußnote in „Bereiche · Schichten“ sagt „Die Summe zählt alle Einheiten der Einsatzbereiche, auch im Anmarsch“.
- **Erwartung der Rolle:** Die Verpflegung zählt die Kräfte, die zur Mahlzeit am Ort sind. Wer angefordert, im Anmarsch ohne Zeit, in Rufbereitschaft zu Hause oder im Rückmarsch ist, steht neben der Zahl und nicht darin. Steht er doch darin, will ich an der Zahl sehen, wie viele Köpfe das betrifft.
- **Auswirkung im Einsatz:** Ich bestelle in der Prüflage zu jeder Tagmahlzeit 20 bis 40 Portionen zu viel, nach dem Einlesen zweier Bögen 19 mehr. Die Betten-Kachel meldet Bedarf für eine Einheit, die noch nicht losgefahren ist. Die Kostenübersicht rechnet für eine nur angeforderte Einheit fünf volle Tage. Da die Sätze am Bildschirm sich widersprechen, kann ich nicht beurteilen, welche Zahl stimmt, und rechne mit dem Taschenrechner aus der Lage nach.
- **Empfehlung:** Für die Versorgung den **Status** berücksichtigen, nicht nur den Bereich. Angefordert, Anmarsch und Rufbereitschaft ohne Eintreffzeit sowie Rückmarsch gehören zu „nicht eingerechnet“ bzw. zu Abgängen, genauso wie heute die Zeilen im Bereich „Angefordert / Anmarsch“. Die Regel überall mit demselben Satz erklären. Wenn es fachlich gewollt ist, dass Rufbereitschaft mitisst ([Annahme]: etwa bei Bereitschaft in der Unterkunft), das sichtbar an der Zeile vermerken.
- **Verifikation:** Prüflage öffnen. Frühstück „EA Pumpwerk Süd“ = nur die anwesenden Einheiten (Tag: ZTr, FGr WS/Pumpen, AB HFS = 16). GTr Wassergefahren und Trupp Aufklärung stehen unter „nicht eingerechnet“ bzw. „Abgang“. Nach dem Einlesen eines Bogens mit Status „Angefordert“ ändern sich weder Portionen noch Betten, bis eine Eintreffzeit gemeldet ist.

### P1-3 · Sofortbedarf lässt sich nicht selbst erfassen und nur abhaken, ohne Menge, Lieferant oder Zwischenstand

- **Fundstelle / Aufgabe:** Versorgung → Sofortbedarf; Prüfaufgabe 3. Screenshots `10-sofortbedarf.png`, `14-sofortbedarf-mit-boegen.png`, `16-sofortbedarf-diesel-erledigt.png`, `17-tagebuch.png`.
- **Beobachtung:**
  - [beobachtet] Ohne eingelesenen Bogen zeigt die Unteransicht „Kein Bogen mit Sofortbedarf übernommen.“, und es gibt keinen Knopf zum Erfassen. Erst über Mehr → Eingang → „Bündel einlesen …“ erscheinen zwei Zeilen (Verpflegung, Diesel, Benzin, Gemisch, Unterbringung, Ruhezeit).
  - [Code] Das Ereignis `SofortbedarfGesetzt` entsteht nur beim Übernehmen eines Bogens (`packages/domaene/src/eeb/scanner.ts:301`). Weder die Einheitenmaske noch das Blatt Versorgung schreiben es. Die Kurzanleitung rät bei einem unlesbaren Bogen: „Die Werte von Hand in die Einheitenmaske eintragen“. Für den Sofortbedarf gibt es dort aber kein Feld.
  - [beobachtet] „Als erledigt melden“ setzt je Feld einen Haken („Diesel ✓“). Die Kraftstoffliste druckt „120 ✓“. Wer erledigt hat, wann und wie viel tatsächlich abgegeben wurde, steht nicht an der Zeile, sondern nur im Tagebuch („Sofortbedarf erledigt: Diesel“). Ein Zwischenstand wie „bestellt bei …“ oder „unterwegs“ fehlt.
  - [beobachtet] „Stand Bogen“ zeigt `181327` bzw. `161906`. Dass der Bogen vom 18.**07.** stammt, also vier Monate alt ist, sehe ich erst im Eingangskorb.
- **Erwartung der Rolle:** Ein Sofortbedarf kommt oft per Funk oder Telefon („LKW 1 braucht 80 l Diesel, sofort“). Ich erfasse ihn selbst an der Einheit, gebe ihn an Tankstelle oder Logistik weiter, sehe den Stand (offen / beauftragt / erledigt) und trage beim Erledigen die tatsächlich abgegebene Menge ein.
- **Auswirkung im Einsatz:** Was nicht vom Bogen kommt, führe ich auf Papier. Für die Kraftstoffabrechnung fehlt die abgegebene Menge, denn der Haken sagt nur „erledigt“, nicht „80 l am 05.11. 21:10 an Tankwagen X“.
- **Empfehlung:** Einen Weg „Sofortbedarf erfassen …“ an der Einheit bzw. in der Unteransicht schaffen (dieselben sechs Felder wie der Bogen, Quelle „von Hand“). Beim Erledigen die gelieferte Menge vorschlagen und überschreibbar machen. Erledigt von/um an der Zeile und in der Kraftstoffliste zeigen. Den Stand des Bogens als Datum mit Monat ausgeben.
- **Verifikation:** Ohne Bogen für eine Einheit 80 l Diesel erfassen, als „beauftragt“ und danach mit 60 l als „erledigt“ melden. Die Kraftstoffliste zeigt 80 gemeldet, 60 abgegeben, Zeitpunkt und Bearbeiter.

### P1-4 · Fahrzeuge und Einheiten aus dem Bogen erscheinen als Codes (`#16 Cloppenburg`, `#26`, Org. „1“)

- **Fundstelle / Aufgabe:** Sofortbedarf, Kraftstoffliste, Unterbringung, Kosten, Lage-Untertabelle „Fahrzeuge“, Eingangskorb; Prüfaufgabe 3. Screenshots `14-sofortbedarf-mit-boegen.png`, `34-fahrzeuge-untertabelle.png`, `13-eingang-nach-buendel.png`.
- **Beobachtung:**
  - [beobachtet] Nach dem Einlesen heißen die Einheiten „#16 Cloppenburg“ und „#9 Wilhelmshaven“. Die Herkunft lautet „#1 Cloppenburg (OCLO)“, die Gliederungsebene „Unbestimmt“, die Fahrzeuge „#26 (THW-80201) · #1 24/55“, „#21 (auf LKW verlastet)“, „2× #22“. Im Eingangskorb steht unter „Org.“ die Zahl „1“. Die Kraftstoffliste druckt in der Spalte Fahrzeuge „#26, #21, #44, #47“.
  - [Code] `packages/domaene/src/eeb/adapter.ts:135-145` schreibt ohne Vokabeltabelle `#<code>`. Der Aktendienst ruft `uebernahmeEntwuerfe` ohne Tabellen auf (`apps/desktop/src/worker/aktendienst.ts:1305`, `:1366`, `:1450`). Dasselbe gilt also für die Desktop-Schale, nicht nur für die Web-Schale.
- **Erwartung der Rolle:** „FGr N Cloppenburg“ mit „GKW“, „MzKW“, „Anh“, damit ich weiß, welches Fahrzeug Diesel braucht und welche Einheit in welcher Unterkunft liegt.
- **Auswirkung im Einsatz:** Die Kraftstoffliste ist für den Tankwart nicht lesbar, weil er „#26“ keinem Fahrzeug zuordnen kann. In der Belegungsliste der Unterkunft steht „#9 Wilhelmshaven“, und die Einheit muss am Telefon erst identifiziert werden. Die Kennzeichen helfen nur, wenn sie zufällig im Bogen stehen.
- **Empfehlung:** Beim Übernehmen die Vokabeltabellen des Bogenformats verwenden, sodass Einheitstyp, Fahrzeugtyp und Organisation als Klartext ankommen. Bereits übernommene Einheiten nachträglich übersetzen.
- **Verifikation:** Bogen 040 einlesen. Die Einheit heißt mit Typ und OV, die Fahrzeuge tragen Typnamen, die Kraftstoffliste nennt sie, und im Eingangskorb steht „THW“.

### P1-5 · Kein Nachweis tatsächlicher Kosten und Verbräuche, kein Material, keine Instandsetzung

- **Fundstelle / Aufgabe:** Mehr → Kosten; Ausgaben → „Kosten als HTML“; Lage → Untertabelle Fahrzeuge; Prüfaufgabe 5. Screenshots `30-kosten.png`, `32-ausgaben-erzeugt.png`, `34-fahrzeuge-untertabelle.png`.
- **Beobachtung:**
  - [beobachtet] Das Blatt Kosten rechnet je Einheit Kräfte × (PSA + VDA + Unterkunft/Verpflegung) × **geplante Einsatztage** (5). Summe 291.300 €. Die Personentage sind „Kräfte × 5“ für jede Einheit, auch für die nur angeforderten und den Trupp im Rückmarsch.
  - [Code] `packages/domaene/src/kennzahlen.ts:489`: `personentage: p.geplanteEinsatztage * koepfe`. Eintreffen und Einsatzende der Einheit gehen nicht ein.
  - [beobachtet] Gelieferte Mahlzeiten, Unterkunftsnächte und abgegebener Kraftstoff erscheinen in der Kostenübersicht nicht. Eine Ausgabe „Versorgungsnachweis“ gibt es nicht.
  - [beobachtet] Material und Verbrauchsgüter (Sandsäcke, Decken, Betriebsstoffe jenseits des Bogens) lassen sich nirgends bestellen oder verfolgen. „Anforderungen“ im Eingang betrifft Kräfte. Das Handbuch nennt keinen solchen Weg.
  - [beobachtet] An einem Fahrzeug gibt es nur „+“ (erfassen) und „✕“ (entfernen). [Code] Der Status wird nur beim Anlegen gesetzt (`apps/desktop/src/renderer/UntertabellenErfassung.tsx:141`, `:167`). Ein UI-Weg für `FahrzeugGeaendert` fehlt, ebenso ein Zustand „in Instandsetzung“.
- **Erwartung der Rolle:** Für die Abrechnung die tatsächlichen Tage je Einheit (Eintreffen bis Einsatzende), die gelieferten Portionen je Mahlzeit und Ausgabestelle, die Unterkunftsnächte und die Kraftstoffmengen, jeweils mit Datum. Ein Fahrzeug kann ich als „ausgefallen / in Instandsetzung seit …“ markieren.
- **Auswirkung im Einsatz:** Den Versorgungsnachweis für die Abrechnung stelle ich aus Tagebuch, Bestellverlauf und Papier zusammen. Die Pauschale ist für die Planung brauchbar, für den Nachweis nicht. Ausfälle von Fahrzeugen führe ich an der Tafel.
- **Empfehlung:** Eine Ausgabe „Versorgungsnachweis“ je Einheit und Tag: Portionen geliefert, Nächte belegt, Kraftstoff abgegeben, tatsächliche Einsatztage. Fahrzeugstatus (einsatzbereit / ausgefallen / Instandsetzung) an der Untertabelle änderbar machen. Für Material eine einfache Bestellliste (Was, Menge, für wen, bei wem, Stand) prüfen [Annahme: Umfang mit der Fachseite abstimmen].
- **Verifikation:** Einsatz über zwei Tage mit Bestellungen und Lieferungen bespielen. Der Nachweis nennt je Einheit gelieferte Portionen und tatsächliche Tage, und die Summe stimmt mit dem Bestellverlauf überein. Ein Fahrzeug auf „Instandsetzung“ setzen. Es erscheint in der Lage markiert und im Nachweis mit Zeitraum.

### P2-1 · Bestellung: Lieferant verschwindet, Teillieferung nicht möglich, Lieferadresse fehlt auf der Liste

- **Fundstelle / Aufgabe:** Bestellkarte, Bestellliste; Prüfaufgabe 1. Screenshots `20-nach-bestellung1.png`, `23-bestellliste-erzeugt.png`.
- **Beobachtung:**
  - [beobachtet] „bestellt bei: Metzgerei Janssen“ eingetragen, Ausgabestelle „Küche Deich“ gewählt. Karte und Bestellliste zeigen unter „bei“ nur „Küche Deich“. [Code] `apps/desktop/src/renderer/Bestellkarte.tsx:54`: `b.ausgabestelle ?? b.bestelltBei`, also der Lieferant nur, wenn keine Ausgabestelle gesetzt ist.
  - [beobachtet] „Als geliefert melden“ setzt sofort „17 von 17“. [Code] `Bestellkarte.tsx:110` schreibt immer die volle bestellte Menge. Für eine Teil- oder Mehrlieferung gibt es keinen Weg.
  - [beobachtet] Die Bestellliste nennt die Ausgabestelle, aber nicht deren Ort („Deichhof“) und nicht den Lieferanten. Für die Küche fehlt eine Summe je Ausgabestelle; sie muss die Bereichszeilen selbst zusammenzählen.
  - [beobachtet] „Bestellung ändern …“ öffnet mit dem Vorschlag der Vorausschau (47), nicht mit der geltenden Bestellung.
- **Erwartung der Rolle:** Auf der Karte stehen Lieferant **und** Ausgabestelle. Die Lieferung bestätige ich mit der gezählten Menge. Die Liste für den Lieferanten nennt je Ausgabestelle Menge, Ort und Uhrzeit.
- **Auswirkung im Einsatz:** Rückfragen „Wer liefert das?“ klärt das Tagebuch. Kommen nur 40 von 47 Portionen, steht in der Software „geliefert 47“, und die Abrechnung stimmt nicht.
- **Empfehlung:** Lieferant und Ausgabestelle getrennt anzeigen. „Als geliefert melden“ mit überschreibbarer Menge. Bestellliste je Ausgabestelle mit Ort und Summe. „Bestellung ändern“ mit der geltenden Bestellung vorbelegen.
- **Verifikation:** Bestellung mit Lieferant und Ausgabestelle. Beide stehen auf Karte und Liste. Lieferung mit 40 von 47 melden, und Karte und Liste zeigen „40 von 47“.

### P2-2 · Belegungsliste rechnet „frei 60“ bei 100 Plätzen und 49 belegt; eine Einheit lässt sich nicht auf zwei Unterkünfte aufteilen

- **Fundstelle / Aufgabe:** Versorgung → Unterbringung, „Belegungsliste als HTML“; Prüfaufgabe 4. Screenshot `25-unterbringung-belegt.png`, Datei `ausgaben/belegung_2026-11-05_2059.html`.
- **Beobachtung:**
  - [beobachtet] Kopf der Belegungsliste: „4 Unterkünfte · Kapazität 100 · belegt 49 · frei 60“. Die Turnhalle ist mit 49 / 40 überbelegt, die anderen sind leer. „frei 60“ ist die Summe der freien Plätze ohne die 9 Überbelegten, also 100 − 49 ≠ 60. Im Blatt steht nur „100 Plätze · 49 belegt“, ohne „frei“.
  - [Code] `packages/ausgaben/src/versorgung.ts:59` kappt die Überbelegung je Unterkunft bei 0, `:79` summiert `frei` ungekürzt.
  - [beobachtet] Die Zuweisung erfolgt je Einheit über eine einzige Auswahl („Turnhalle KGS (40 frei)“). Den SanZ (15 Köpfe) kann ich nicht auf 10 Gemeindehaus + 5 Turnhalle verteilen.
  - [beobachtet] Zwei Unterkünfte mit gleichem Namen und Ort ließen sich ohne Hinweis zweimal anlegen; in der Auswahl stehen sie danach doppelt.
- **Erwartung der Rolle:** Eine Restkapazität, die rechnerisch aufgeht („frei 60, davon 9 Überbelegte unterzubringen → 51 netto“). Große Einheiten lassen sich auf mehrere Unterkünfte aufteilen. Beim Anlegen eines gleichnamigen Quartiers erscheint ein Hinweis.
- **Auswirkung im Einsatz:** Auf dem Ausdruck sehe ich zu viele freie Betten, oder ich zweifle an der Liste. Große Einheiten zwingen mich zur Überbelegung oder zu einer Notiz „5 Mann vom SanZ ins Gemeindehaus“ auf Papier.
- **Empfehlung:** „frei“ netto ausweisen und die Überbelegung daneben nennen. Teilzuweisung (Köpfe je Unterkunft) zulassen. Bei doppeltem Namen warnen.
- **Verifikation:** Turnhalle 40 mit 49 belegt, Gemeindehaus 10 leer. Der Ausdruck zeigt „frei 1 (10 frei, 9 überbelegt)“. Einen SanZ mit 10 + 5 auf zwei Unterkünfte verteilen; beide Karten zählen richtig.

### P2-3 · Das S4-Profil öffnet auf „Lage“, nicht auf „Versorgung“

- **Fundstelle / Aufgabe:** Einsatzauswahl → Profil „Versorgung (S4)“ → Einsatz öffnen. Screenshot `03-nach-oeffnen.png`.
- **Beobachtung:**
  - [beobachtet] Nach dem Öffnen steht der Reiter „Versorgung“ zwar links im Band, aufgeschlagen ist aber „Lage“ mit Einheitentabelle.
  - [Code] `apps/desktop/src/renderer/Arbeitsplatz.tsx:59`: Ohne gemerktes Blatt wird immer `lage` geöffnet. Der Kommentar in `blaetter.ts:84-85` sagt dagegen: „Das erste Blatt ist das der Rolle … die S4 in der Versorgung.“
- **Erwartung der Rolle:** Wer „Versorgung (S4)“ wählt, landet in der Versorgung.
- **Auswirkung im Einsatz:** Das kostet einen Klick bei jedem neuen Gerät oder Browser. Neue S4-Helfer suchen ihre Zahlen erst in der Lage, und das widerspricht der Profilbeschreibung.
- **Empfehlung:** Ohne gemerktes Blatt das erste Blatt des Profils öffnen.
- **Verifikation:** Neuer Browser, Profil S4, Einsatz öffnen. Aufgeschlagen ist „Versorgung“.

### P2-4 · Die Eintreffzeit für die Vorausschau steht in der Spalte „Eingetroffen“

- **Fundstelle / Aufgabe:** Lage → Spalten „Ressourcen“ → „Eingetroffen“; Versorgung → Nächste 24 h. Screenshots `28-eintreffzeit.png`, `29-vorausschau-zugang.png`.
- **Beobachtung:** [beobachtet] Für „FGr Räumen B (angefordert)“ trage ich in die Spalte „Eingetroffen“ 06.11. 05:00 ein, also eine Zeit in der Zukunft. Die Vorausschau rechnet daraufhin „+9 Zugang“ ab Frühstück, was richtig ist. Die Lage zeigt die Einheit aber als „Eingetroffen 06.11.2026 05:00“, obwohl sie noch unterwegs ist. Die Vorausschau nennt das Feld „Eintreffen gemeldet“. [Code] Spaltenkopf `packages/domaene/src/projektion/tabelle.ts:187`.
- **Erwartung der Rolle:** Ein Feld „erwartet um“ (ETA) getrennt von „eingetroffen um“, und einen Weg, die ETA aus der Versorgung heraus zu sehen und an den S1 zurückzufragen.
- **Auswirkung im Einsatz:** Damit meine Vorausschau rechnet, muss der S1 eine Zukunftszeit in „Eingetroffen“ schreiben. Andere lesen sie dann als „schon da“. Unterbleibt der Eintrag, fehlt der Zugang in meiner Zahl ([Annahme]: der S1 trägt „Eingetroffen“ erst beim Eintreffen ein).
- **Empfehlung:** Eine eigene Spalte bzw. ein eigenes Feld „Eintreffen erwartet“, das die Vorausschau nutzt. Die Übergabe S1 → S4 im Handbuch benennen.
- **Verifikation:** ETA für eine angeforderte Einheit setzen. Die Lage zeigt „erwartet 05:00“, „Eingetroffen“ bleibt leer, und die Vorausschau rechnet ab 05:00.

### P2-5 · Versorgungslisten und Ausgaben an zwei Orten

- **Fundstelle / Aufgabe:** Reiter „Ausgaben“ im S4-Profil; Versorgung → „⋯“; Prüfaufgabe 5. Screenshots `31-ausgaben.png`, `05-verpflegung-menue.png`.
- **Beobachtung:** [beobachtet] Im Reiter „Ausgaben“ stehen 24 Knöpfe (Druck, Status, Einheitenliste, Logistik, Kosten …) und darunter „Einsatz beenden“ und „Einsatzakte erzeugen“. Bestellliste, Vorausschau, Belegungsliste und Kraftstoffliste fehlen dort. Sie liegen jeweils im „⋯“ der passenden Unteransicht, eine je Unteransicht. „Bereiche · Schichten“ hat kein „⋯“; das Logistikblatt gibt es nur unter Ausgaben.
- **Erwartung der Rolle:** An einer Stelle alle Listen, die ich der Küche, der Unterkunft und dem Lieferanten mitgebe.
- **Auswirkung im Einsatz:** Vor der Lagebesprechung klicke ich vier Unteransichten durch, um vier Listen zu erzeugen. „Einsatz beenden“ liegt in meinem Profil zwei Handbreit unter „Kosten als HTML“.
- **Empfehlung:** Im Reiter Ausgaben die vier Versorgungslisten zusätzlich anbieten, bei S4-Profil oben. Optional „Alle Versorgungslisten“ als ein Paket.
- **Verifikation:** Im S4-Profil unter Ausgaben alle vier Versorgungslisten erzeugen, ohne in die Versorgung zu wechseln.

### P3-1 · Interne Verweise und Rohwerte in Oberfläche und Ausdruck

- **Fundstelle:** Versorgung (Hinweistexte), Kosten-Ausdruck, alle Versorgungsausdrucke, Tagebuch.
- **Beobachtung:** [beobachtet] „(Entscheidung 3)“, „Kapazität ist eine Zahl für alle (Entscheidung 2)“, „Bedarf (K6)“, „Männl. ist abgeleitet … (K5)“ im Blatt ([Code] `VersorgungVerpflegung.tsx:138`, `VersorgungUnterbringung.tsx:112`, `:125`). Im Kosten-Ausdruck: „nach dem Zieldatenmodell §2.4“, „die Vorlage erzwingt das über IFERROR“ ([Code] `packages/ausgaben/src/kosten.ts:133-134`). Jeder Versorgungsausdruck trägt im Kopf „@bos/eeb-format 0.0.0“. Das Tagebuch schreibt „Sofortbedarf gesetzt: (leer) → benzinLiter: 80, dieselLiter: 80 …“ und „Erfassungsbogen übernommen: … uebernommeneFelder: abschnittId, bemerkung …“. Die frühere Kritik an Rohwerten (`NUR_STAERKE`) ist behoben, die neuen sind andere.
- **Erwartung der Rolle:** Ein Ausdruck für Rechnungsstelle und Küche ohne Konzeptkürzel.
- **Auswirkung im Einsatz:** Nachfragen der Rechnungsstelle, außerdem wirkt die Liste unfertig.
- **Empfehlung:** Verweise in Klartext umformulieren oder weglassen, Feldnamen im Tagebuch übersetzen, Paketname aus dem Druckkopf nehmen.
- **Verifikation:** Alle Versorgungs- und Kostenausdrucke ohne „§“, „K<Zahl>“, „Entscheidung <Zahl>“, „IFERROR“ und Paketnamen.

### P3-2 · Kleinigkeiten an Unterbringung und Mahlzeitenplan

- **Beobachtung:**
  - [beobachtet] „Betten heute Nacht“ zählt die Nachtschicht (SanZ, 15) mit, obwohl sie tagsüber schläft. Eine Kachel „Betten tagsüber“ oder eine Teilung Tag/Nacht gibt es nicht ([Code] `packages/domaene/src/projektion/unterkunft.ts:80-103` ohne Schichtbezug).
  - [beobachtet] Nach der Verlegung von „BGr 1 Oldenburg“ bleibt die Unterkunft „Turnhalle KGS“ stehen. Das ist richtig, aber ein Hinweis „Einheit verlegt, Unterkunft prüfen“ fehlt.
  - [beobachtet] „UA Deichfuß“ übernimmt die Ausgabestelle seines Einsatzabschnitts „EA Deich Nord“ nicht und bleibt auf „Logistik (Vorbelegung)“.
  - [beobachtet] Zugänge der Vorausschau stehen nur in der Summenzeile, nicht beim Bereich bzw. der Ausgabestelle, an die sie kommen.
- **Empfehlung:** Kachelbeschriftung „Betten (alle Schichten)“ oder Tag/Nacht getrennt. Hinweis an der Zeile nach einer Verlegung. Unterabschnitt erbt die Ausgabestelle. Zugang dem Zielbereich zuordnen, sobald einer bekannt ist.
- **Verifikation:** Je Punkt an der Prüflage nachstellen, wie oben beschrieben.

---

## Gegenprüfung früherer Befunde (Audits vom 29.10.2026)

- **„Ausgaben nur als Dateipfad (P1)“: behoben.** [beobachtet] Nach jeder Versorgungsausgabe steht „Geschrieben: … · Öffnen“ neben dem Menü.
- **„Aufträge und Geräte/Fahrzeuge nur berechnet (P0)“: teilweise behoben.** [beobachtet] Fahrzeug, Person und Auftrag lassen sich an der Untertabelle erfassen und entfernen. Der Fahrzeugstatus lässt sich aber nicht ändern (siehe P1-5).
- **„Zwei Gesamtzahlen ohne Erklärung (P1/P2)“: für die Lage verbessert, für die Versorgung offen.** [beobachtet] Das Kopfband nennt jetzt „264 · +63 erwartet · 3 beendet“ mit „Regel“. In der Versorgung sehe ich jedoch 264 (Kopfband), 279 bzw. 298 (Frühstück), 293 bzw. 312 (Bereiche · Schichten, Kosten) und 327 (alle erfassten), dazu zwei sich widersprechende Erklärsätze (siehe P1-2).
- **„Rohwerte in der Oberfläche (P2/P3)“: alte behoben, neue hinzugekommen** (siehe P3-1).

---

## Positives

Die Vorausschau ist das stärkste Stück für den S4. Sie rechnet je Mahlzeit Bestand, Zugang ab gemeldeter Zeit und Abgang, nennt die Einheiten „ohne Zeit“ mit Namen, statt sie still wegzulassen, und reagiert sofort auf Schichtwechsel (Nacht 47 → 38, Differenz an der Bestellung −30 → −21) und Verlegungen. Der Mahlzeitenplan je Bereich mit Ausgabestelle und veg./vegan entspricht dem, was ich der Küche sonst von Hand aufschreibe. Die Kachelzeile oben bleibt in allen Unteransichten stehen. Die Unterkunftskarten mit m/w/d-Balken, „frei“/„voll“/„⚠ überbelegt“ und die Abfrage „Auflösen“ mit Pflichtgrund und dem Satz „5 Einheiten verlieren ihre Zuweisung“ sind klar. Die Belegungsliste nennt je Unterkunft die Einheiten mit Köpfen und lässt sich so der Unterkunft mitgeben. Bestellung, Lieferung, Zuweisung und Erledigt-Meldung stehen im Tagebuch und lassen sich zurücknehmen. Ein Hauptknopf je Unteransicht („Bestellung Frühstück 0600 …“ wandert zur nächsten unbestellten Mahlzeit) und das „⋯“ machen die Bedienung ruhig. Das Profil „Versorgung (S4)“ zeigt nur meine drei Reiter, alles andere liegt unter „Mehr“.

---

## Abschluss

- **Aufgabe der Rolle geschafft:** mit Umwegen. Nächste Mahlzeit ermitteln: ja. Verlegen (Zahlen folgen, die Bestellung je Küche nicht): mit Umwegen. Sofortbedarf erfassen und verfolgen: nur aus dem Bogen, nur als Haken. Unterkunft anlegen, belegen, Rest prüfen: ja, mit falsch wirkendem „frei“ im Ausdruck. Kosten- bzw. Versorgungsnachweis: nur als Pauschale.
- **Nebenaufzeichnung auf Papier nötig:** ja, für Bestellungen je Küche bzw. Lieferant (inkl. Teillieferungen), telefonisch gemeldeten Sofortbedarf und abgegebene Kraftstoffmengen, Material und Verbrauchsgüter, Fahrzeugausfälle und Instandsetzung sowie den Versorgungsnachweis für die Abrechnung.
- **Größte Lücke an einer Übergabe:** Vom Meldekopf bzw. S1 kommen Einheiten mit Status „Angefordert“ oder „Anmarsch“ in einen Einsatzbereich; die Versorgung zählt sie sofort als anwesend, und für die erwartete Ankunftszeit fehlt ein eigenes Feld, sodass ich mich auf die Spalte „Eingetroffen“ verlassen muss.
- **Größtes Einsatzrisiko:** Eine zweite Bestellung für dieselbe Mahlzeit ersetzt still die erste, auch wenn sie an eine andere Küche geht. Die erste Küche fällt damit aus Karte und Liste, während Lieferanten weiter liefern bzw. eine Einsatzstelle nach einer Verlegung falsch versorgt wird.
- **Top-Priorität für die nächste Iteration:** Bestellungen je Mahlzeit **und** Ausgabestelle führen, mit eigenem Bedarf und eigener Differenz je Küche (P1-1).
