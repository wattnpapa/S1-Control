# Audit S1-Control v2: Perspektive Lagekartenführer

Stand: **05.11.2026**, HEAD `b1a4700` (nach den Schnitten E1–E4 „Entlastung der Oberfläche“, Fleetmapping-Vorschlag und den Audits vom selben Tag).

**Rolle:** Lagekartenführer in der Führungsstelle. Ich führe die Lagekarte bzw. Magnettafel: Einsatzabschnitte, Bereitstellungsraum und Einrichtungen, jede Einheit mit ihrem taktischen Zeichen, Stärke und Unterstellung, Änderungen mit Uhrzeit. Ich muss wissen, was sich seit meiner letzten Nachführung geändert hat, und mit der Kräfteübersicht übereinstimmen.

**Material:** Eigene Web-Schale `http://127.0.0.1:8222` mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten). Profil zuerst „Führungsstelle (S1)“, für die Reiter Funkplan/Versorgung „Alle Blätter“. Ein eigenes Profil für Lage oder S2 gibt es nicht. Viewports 1600×1000 und 1920×1080, für die Zeichenprüfung deviceScaleFactor 2 und 3, dazu das Nachtbild. Durchlauf 20:57–21:09 Uhr mit echten Schreibvorgängen: Einheit „FGr Wasserschaden“ von EA Deich Nord nach EA Pumpwerk Süd verschoben, drei Einheiten fremder Organisationen angelegt (Bundeswehr, Feuerwehr, ASB), ein Statuswechsel (GTr Wassergefahren Anmarsch → Einsatz), Ausgaben Führungsorganisation, Druck, Einheitenliste und HTML-Monitor erzeugt. Aufnahmen `scratchpad/shots/lagekarte/01…34`, Ausgaben unter `share/einsaetze/2026-09-08-uebung-weser-ems/ausgaben/` der Kopie. Quelltext nur lesend. Hintergrund: `docs/audits/v2-2026-10-29/` und die Audits vom 05.11. in diesem Ordner.

**Kennzeichnung:** **[beobachtet]** = an der laufenden Web-Schale gesehen oder ausgelöst · **[Code]** = aus dem Quelltext belegt (Datei:Zeile) · **[Annahme]** = Annahme über THW-Abläufe, DV-102-Inhalte oder Ursachen, nicht belegt · **[nicht prüfbar]** = in der Web-Schale nicht nachvollziehbar (Desktop-PDF, echter Beamer).

Zählung: **P0: 0 · P1: 4 · P2: 5 · P3: 4**

---

## Urteil

Die Anwendung ist eine gute **Kräfteübersicht** und ein brauchbarer **Zulieferer für die Tafel der Abschnitte**, aber keine Grundlage, von der ich die Lagekarte ohne Nebenaufzeichnung führen kann.

**Was trägt.** Die Gliederung ist sauber: Abschnittsbaum mit EA, UA, Bereitstellungsraum, Meldekopf und Logistik, je Zeile Einheiten und Fü/UFü/He, „+n erwartet“ getrennt von der Ist-Stärke [beobachtet]. Die Abschnitte tragen echte taktische Zeichen aus einem Satz mit 994 Zeichen (TEL, EAL, UEAL, Meldekopf, Logistikstützpunkt, Bereitstellungsraum), und unter „Führungsstelle · Führungsorganisation“ steht eine gezeichnete Führungsharke mit großen Flaggen (Shot 06). Eine Verlegung steht sofort im Tagebuch als „FGr Wasserschaden: Einheit verschoben: EA Deich Nord → EA Pumpwerk Süd“ mit Uhrzeit und Arbeitsplatz (Shot 14). Der Stärke-Monitor ist aus drei Metern lesbar (Shot 17).

**Wo es reißt.**

1. **Einheiten haben kein taktisches Zeichen.** Organisation und Ebene stehen nur als Wörter („THW · Gruppe“, „Bundeswehr · Zug“). Dabei liegen die passenden Zeichen schon im Programm (`THW_Einheiten/FGr_Elektroversorgung`, `Bergungsgruppe`, `Feuerwehr_Einheiten`, `Bundeswehr_Einheiten` …), und der Fachkern hat einen Zeichenvorschlag aus dem Namen. Die Oberfläche nutzt beides nicht.
2. **„Was hat sich seit meiner letzten Nachführung geändert?“ geht nicht.** Das Tagebuch hat nur Volltextsuche und zwei Häkchen, keinen Zeitfilter. Die Schichtplan- und Dienstposten-Einträge mischen sich dazwischen. Eine verschobene Zeile ist in der Tabelle nicht markiert.
3. **Es gibt keinen Ort.** Abschnitte haben nur Name und Typ, Einheiten haben keinen Standort. Was ich auf der Karte verorten soll, steht nirgends.
4. **Die Ausgabe „Als PDF (Lagekarte)“ ist keine Lagekarte.** Sie ist eine Textliste ohne ein einziges Zeichen, mit Rohschlüsseln wie „EINSATZORT“ und „FUEHRUNGSSTELLE“, und sie nennt für die Führungsstelle zwei verschiedene Stärken.

**Aufgabe ohne Nebenaufzeichnung:** nein. Zeichen jeder Einheit, Ort und der „Stand meiner Karte“ (bis zu welcher Uhrzeit nachgeführt) laufen weiter auf Papier.

---

## Prüfaufgaben im Überblick

| # | Aufgabe | Ergebnis |
|---|---|---|
| 1 | Alle Einheiten eines Abschnitts: Zeichen, Kurzbezeichnung, Stärke ablesen | **nein** für Zeichen, ja für Name und Stärke |
| 2 | Einheit verlegen, Änderung für die Kartennachführung erkennen | **mit Umwegen**: nur im Tagebuch, nicht an der Zeile |
| 3 | Änderungen der letzten Stunde finden | **mit Umwegen**: Tagebuch von oben lesen, kein Zeitfilter |
| 4 | Monitor bzw. Lagedarstellung auf Fernlesbarkeit | **teilweise**: Gesamtstärke ja, Gliederung nur im HTML-Monitor, ohne Zeichen |
| 5 | Einheit fremder Organisation anlegen und Zeichen prüfen | **nein**: Anlage geht, ein Zeichen gibt es nicht |

---

## Findings

### P1-1: Einheiten tragen kein taktisches Zeichen, obwohl Satz und Vorschlag im Programm liegen

- **Fundstelle / Aufgabe:** Aufgaben 1 und 5. Lage → Einheitentabelle, Maske „Einheit anlegen › Ohne Vorlage“, Einheitenliste-HTML. Shots `03-lage.png`, `26-ohne-vorlage.png`, `27-fremde-org.png`.
- **Beobachtung:**
  - [beobachtet] Keine Zeile der Einheitentabelle zeigt ein Zeichen. Organisation („THW“, „Feuerwehr“, „DLRG“) und „Gliederungsebene“ („Gruppe“, „Zug“, „Staffel“) stehen als Text in getrennten Spalten. Die Funktion (Bergung, Wasserschaden/Pumpen, Elektroversorgung, Sanität) steckt nur im freien Namen.
  - [beobachtet] Neu angelegt: „PiZg 2 Bw“ (Bundeswehr, Zug, 1/3/20), „LF 20 FF Hude“ (Feuerwehr, Gruppe), „RTW ASB 1“ (ASB, Trupp). Die Maske fragt Bezeichnung, Organisation, Ebene, Stärke, Herkunft und Abschnitt, aber kein Zeichen. Die Zeilen sehen danach aus wie jede andere.
  - [beobachtet] Der Vorlagenkatalog filtert nur THW, Feuerwehr, DRK, JUH, MHD, ASB, DLRG und Regie. Bundeswehr und Polizei gibt es nur „Ohne Vorlage“.
  - [Code] Der gelieferte Satz enthält 994 Zeichen, darunter `THW_Einheiten` (127 Dateien, u. a. `FGr_Elektroversorgung.svg`, `Bergungsgruppe.svg`), `Feuerwehr_Einheiten`, `Bundeswehr_Einheiten`, `Rettungswesen_Einheiten`, `Wasserrettung_Einheiten`, `Polizei_Einheiten` (`apps/desktop/assets/tz/`, `HERKUNFT.md`). Die Komponente `Zeichen` wird nur in `Abschnittsbaum.tsx:335`, `Fuehrungsorganisation.tsx:107/179` und `Zeichenwahl.tsx:113` verwendet, nirgends für Einheiten.
  - [Code] Der Fachkern hat `schlageZeichenVor(name, organisation)` (`packages/domaene/src/zeichen/inferenz.ts:149`), exportiert in `packages/domaene/src/index.ts:330`. Kein Aufrufer in `apps/desktop/src`.
- **Erwartung der Rolle:** Zu jeder Einheit das Zeichen mit Organisationsfarbe, Größenordnung und Funktion, so wie es als Magnet an die Tafel kommt. Bei unsicherer Ableitung sichtbar „Vorschlag, bitte prüfen“, und ich kann es wie beim Abschnitt frei wählen.
- **Auswirkung im Einsatz:** Ich muss jedes Zeichen selbst aus Name, Organisation und Ebene ableiten. Bei „BGr Teilbar — Trupp“, „AB HFS Bereitschaft“, „Rettungsdienst Vorhaltung“ oder „Sandsackkolonne“ (Regie) ist das Raten. Zwei Lagekartenführer im Schichtwechsel kleben dann unterschiedliche Zeichen für dieselbe Einheit. [Annahme] Gerade bei fremden Organisationen (Bundeswehr-Pionierzug, Polizei) fehlt das Zeichen am häufigsten auf der Tafel.
- **Empfehlung:** Je Einheit ein Zeichen führen, vorgeschlagen aus Vorlage bzw. Name und Organisation, frei änderbar über dieselbe Zeichenwahl wie beim Abschnitt. Das Zeichen in der Bezeichnungsspalte, in der Einheitenliste und auf dem Monitor zeigen. Unsichere Vorschläge kennzeichnen.
- **Verifikation:** „FGr Elektroversorgung“, „LF 20 FF Hude“ und „PiZg 2 Bw“ zeigen in der Tabelle je ein Zeichen in der Farbe ihrer Organisation mit der richtigen Größenordnung. Ein Wechsel über „Zeichen …“ steht im Tagebuch mit vorher → nachher.

### P1-2: „Was hat sich seit HH:MM geändert?“ hat keine Antwort

- **Fundstelle / Aufgaben 2 und 3:** Einsatztagebuch, Einheitentabelle nach dem Verschieben. Shots `14-tagebuch-nach.png`, `15-verschobene-zeile.png`, `31-tagebuch-status.png`.
- **Beobachtung:**
  - [beobachtet] Nach dem Verschieben steht „FGr Wasserschaden“ in EA Pumpwerk Süd. Die Zeile trägt keinen Hinweis auf die Änderung, nach dem Neuladen ist sie von den alten Zeilen nicht zu unterscheiden (Shot 15). Nur die Statuszeile meldet einmalig „✓ Einheit ‚FGr Wasserschaden‘ verschoben · gespeichert“.
  - [beobachtet] Das Tagebuch zeigt die Verlegung, den Statuswechsel („Status gesetzt: Anmarsch → Einsatz“) und die Neuanlagen oben mit „Erfasst 05.11. 21:01:08“. Als Filter gibt es nur „Suche“, „Auf die Auswahl beschränken“ und „Nur Rücknahmen und Berichtigungen“. Ein Zeitfilter („seit“) oder ein Filter nach Art (Verlegung, Status, Neuanlage, Abschnitt) fehlt [Code `Tagebuch.tsx:38–57`].
  - [beobachtet] Dazwischen stehen Dutzende Einträge „Dienstposten angelegt“ und „Schichtplan geändert“, die für die Karte keine Rolle spielen.
  - [beobachtet] „Einheit gemeldet“ nennt weder Abschnitt, Organisation, Ebene noch Stärke („PiZg 2 Bw: Einheit gemeldet“). Für die Karte fehlt damit das Wichtigste: wohin.
  - [beobachtet] Die Spalte „Zeit der Meldung“ bleibt bei eigenen Änderungen leer. Die Maske „Verschieben“ fragt keine Uhrzeit der Verlegung, gebucht wird die Erfassungszeit.
- **Erwartung der Rolle:** Eine Ansicht „Änderungen seit [Uhrzeit meiner letzten Nachführung]“ nur mit kartenrelevanten Vorgängen (neu, verlegt, Status, Stärke, Abschnitt angelegt/aufgelöst), jeweils mit Ziel-Abschnitt. Dazu eine Markierung geänderter Zeilen, bis ich sie quittiere.
- **Auswirkung im Einsatz:** Ich muss mir die Uhrzeit meiner letzten Nachführung auf Papier merken und das Tagebuch von oben bis dorthin durchlesen. Eine Neuanlage ohne Abschnittsangabe muss ich in der Tabelle suchen. Übersieht man im Schichtwechsel eine Verlegung, steht der Magnet am falschen Abschnitt. [Annahme] Das ist der häufigste Fehler an der Tafel.
- **Empfehlung:** Tagebuchfilter „seit“ (Uhrzeit oder DTG) und „nur Lage“ (Einheiten, Abschnitte, Status, Stärke). „Einheit gemeldet“ mit Abschnitt, Organisation/Ebene und Stärke. Optional eine Marke „geändert seit …“ an der Zeile. Bei Verlegung und Status eine optionale Zeit der Meldung.
- **Verifikation:** Filter „seit 21:00, nur Lage“ zeigt genau die Verlegung, die drei Neuanlagen mit Ziel-Abschnitt und den Statuswechsel, sonst nichts.

### P1-3: Keine Ortsangaben: Abschnitte und Einrichtungen lassen sich nicht verorten

- **Fundstelle / Aufgabe:** Prüffrage Ortsangaben. Maske „Abschnitt anlegen“, Stammdaten, Einheitenspalten. Shot `05-fuehrungsstelle.png`, `13-spalten.png`.
- **Beobachtung:**
  - [beobachtet] Der Einsatz hat einen Einsatzort („Oldenburg“) in den Stammdaten. Abschnitte haben nur Name und Typ [Code `AbschnittAnlegen.tsx:58–65`]. „Bereitstellungsraum Hafen“, „EA Pumpwerk Süd“ tragen ihren Ort nur im Namen.
  - [beobachtet] Unter allen Spaltengruppen (Grunddaten, Stärke, Ressourcen, Logistik, Kosten, Funk) gibt es keine Spalte für Standort, Einsatzstelle, Anschrift oder Koordinate. Die Suche verspricht im Platzhalter „Einheit, Organisation, Ort, Kennzeichen …“. Ein Ortsfeld habe ich nicht gefunden.
- **Erwartung der Rolle:** Je Abschnitt und Einrichtung (BR, Meldekopf, Logistik, Unterkunft) eine Ortsangabe: Anschrift, markanter Punkt oder Koordinate/Planquadrat. [Annahme] Für Einheiten im Einsatz mindestens der Abschnitt, bei Erkundung oder Marsch ein freier Ort.
- **Auswirkung im Einsatz:** Wo der BR oder ein neuer UA liegt, erfahre ich nur mündlich oder aus der Meldung im Eingang. Bei einem neuen Abschnitt („EA Deich Süd“) steht in der Software kein Ort, den ich auf die Karte übertragen könnte. Der Ort lebt auf Zetteln neben der Karte.
- **Empfehlung:** Ein Ortsfeld (Freitext, optional Koordinate) an Abschnitt und Einrichtung, sichtbar im Baum (Tooltip oder zweite Zeile), in der Führungsorganisation und in Druck/Einheitenliste.
- **Verifikation:** Für „Bereitstellungsraum Hafen“ lässt sich „Hafenstraße 12, Brake“ eintragen. Die Angabe erscheint im Baum, in der Harke und im Druck, und eine Änderung steht im Tagebuch.

### P1-4: „Als PDF (Lagekarte)“ und der Druck liefern keine Lagekarte, und die Stärken weichen je nach Ausgabe ab

- **Fundstelle / Aufgabe:** Führungsstelle → Führungsorganisation → „Als PDF (Lagekarte)“ / „Als HTML (druckbar)“. Ausgaben → „Druck als HTML“, „HTML-Monitor“. Shots `07-PDF .png`, `21-druck.png`, `23-fueorg-html.png`. Dateien `fueorg_2026-11-05_2059.html`, `druck_2026-11-05_2103.html`.
- **Beobachtung:**
  - [beobachtet] In der Web-Schale meldet „Als PDF (Lagekarte)“: „PDF gibt es nur in der Desktop-App.“ Das HTML enthält **kein einziges Zeichen**, nur eine eingerückte Textliste. Neben jedem Namen steht der interne Schlüssel: „EA Deich Nord EINSATZORT“, „FüSt Oldenburg FUEHRUNGSSTELLE“, „Angefordert / Anmarsch ANGEFORDERT“ [Code `packages/ausgaben/src/fueorg.ts:123`]. Das PDF wird aus derselben Quelle erzeugt (`apps/desktop/src/worker/aktendienst.ts:1056–1057`), also gilt dasselbe [Code; PDF selbst nicht prüfbar].
  - [beobachtet] In derselben Datei hat die Führungsstelle zwei Stärken: Kasten „Führungsstelle gesamt 2 / 6 / 4 = 12“ (aus Dienstposten) und Knoten „FüSt Oldenburg 3 / 5 / 2 = 10“ (aus Einheiten). Die Fußnote erklärt das mit Paragrafen aus dem Konzept („§5.7, K17“), nicht in Worten der Führungsstelle.
  - [beobachtet] Druck und HTML-Monitor führen „UA Deichfuß“ als gleichrangige Zeile ohne Einrückung unter „EA Deich Nord“. EA Deich Nord steht dort mit **33**, im Abschnittsbaum und in der Harke mit **71** (nach der Verlegung, einschließlich UA). Die Ansicht „Bereiche und Schichten“ des Monitors nennt für den Bereitstellungsraum **80**, Baum und Druck **65**, weil sie alle erfassten Einheiten zählt.
- **Erwartung der Rolle:** Eine Ausgabe, die den Namen Lagekarte trägt, liefert die Zeichen (Abschnitte und Einheiten) mit Name und Stärke, druckbar als Kärtchen bzw. Bogen für die Magnettafel. Am Zeichen und in der Kräfteübersicht steht dieselbe Zahl für denselben Abschnitt, oder sichtbar „mit UA“ / „ohne UA“.
- **Auswirkung im Einsatz:** Zum Bestücken der Tafel bleibt Handarbeit. Wer die Stärke für „EA Deich Nord“ vom Druck an das Zeichen schreibt, schreibt 33, die Harke daneben sagt 71. In der Lagebesprechung (Annahme: Druck an der Wand, Harke am Beamer) entstehen zwei Zahlen für denselben Abschnitt. Die Rohschlüssel lesen sich auf dem Aushang wie ein Fehler.
- **Empfehlung:** Die Führungsorganisation als druckbare Seite **mit** den Zeichen ausgeben, wie am Bildschirm, mit Klartext statt Schlüssel. Zusätzlich ein Kärtchenbogen „je Einheit ein Zeichen mit Name und Stärke“ zum Ausschneiden. Im Druck UA eingerückt und mit Vermerk „davon in UA …“ oder einer Summenzeile „EA Deich Nord mit UA“. Jede Ausgabe nennt die Zählgrundlage im Kopf mit einem Wort.
- **Verifikation:** Ausgabe der Führungsorganisation zeigt TEL-/EAL-Flaggen und Einrichtungszeichen, ohne Großbuchstaben-Schlüssel. Druck, Harke und Baum nennen für EA Deich Nord dieselbe Zahl oder dieselbe ausgewiesene Aufteilung.

### P2-1: Die Führungsharke zeigt keine Unterstellung unter die Führungsstelle und keine Einheiten

- **Fundstelle:** Führungsstelle → Führungsorganisation. Shot `06-fuehrungsorganisation.png`.
- **Beobachtung:** [beobachtet] TEL „FüSt Oldenburg“ steht **neben** den EAL-Flaggen auf derselben Ebene, nicht über ihnen. Nur UA Deichfuß hängt sichtbar (gestrichelt) unter EA Deich Nord. Unter den Flaggen stehen nur „11 Einh. · 2/10/65“, nicht welche Einheiten. In der Tabelle gibt es keine Unterstellung von Einheiten unter Einheiten (Zugtrupp → Gruppen). „BGr Teilbar — Trupp“ ist nur über den Namen als Teil erkennbar. [Code] `harke.ts:20–31` stellt Meldekopf, BR und Logistik bewusst neben die Harke.
- **Erwartung der Rolle:** Die Harke von oben nach unten: Führungsstelle → EA → UA, darunter die Einheiten (Zeichen) je Abschnitt, damit ich das Bild 1:1 auf die Tafel übertragen kann. [Annahme] Welche Gruppen zu welchem Zugtrupp gehören, ist für die Tafel wichtig.
- **Auswirkung:** Ich muss die Unterstellung aus Baum und Tabelle selbst zusammensetzen. Der Ausdruck taugt nicht als Vorlage für die Tafel.
- **Empfehlung:** Führungsstelle als Wurzel über die EAs zeichnen. Optional Einheiten unter den Flaggen. Eine Angabe „unterstellt“ (Zug/Zugtrupp) an der Einheit zulassen.
- **Verifikation:** Harke zeigt die FüSt oben, EAs darunter, UA darunter. Mit Schalter „Einheiten“ erscheinen die Einheiten je Abschnitt.

### P2-2: Die Zeichen im Abschnittsbaum sind am Arbeitsplatz zu klein zum Ablesen

- **Fundstelle:** Lage → Abschnittsbaum. Shots `03-lage.png` (1×), `04-baum-zoom.png` (3×).
- **Beobachtung:** [beobachtet] Die Flaggen sind 26 px breit [Code `Abschnittsbaum.tsx:341`]. Die Schrift „EAL“, „UEAL“, „TEL“ darin ist bei normaler Skalierung wenige Pixel hoch und nur mit Lupe lesbar. Der Bereitstellungsraum trägt seinen Namen gekürzt („Bereitstellun…“).
- **Erwartung der Rolle:** Kürzel im Zeichen lesbar, oder daneben als Text. Volle Abschnittsnamen.
- **Auswirkung:** Im Baum dienen die Zeichen nur als Farbtupfer. Wer EAL von UEAL unterscheiden will, liest den Namen bzw. die Einrückung.
- **Empfehlung:** Zeichen etwas größer oder die Kurzform als Text daneben. Namen umbrechen statt kürzen.
- **Verifikation:** Bei 1600×1000 und 100 % sind „EAL“/„UEAL“ ohne Zoom lesbar, „Bereitstellungsraum Hafen“ steht vollständig da.

### P2-3: Kein Monitorbild der Lage nach Abschnitten, das HTML-Monitorbild hat keine Zeichen

- **Fundstelle / Aufgabe 4:** Stärke-Monitor (Ansichten 1–6), HTML-Monitor. Shots `17-monitor-staerke.png`, `18-monitor-2…6.png`, `20-htmlmonitor.png`.
- **Beobachtung:**
  - [beobachtet] Der Stärke-Monitor zeigt groß „14/48/202 = 264“ mit DTG, aus drei Metern sicher lesbar. Ansichten 2–6 sind Verpflegung, Vorausschau, Unterbringung, „Bereiche und Schichten“ (Köpfe je Schicht und Kostform) und Funkplan. Keine zeigt Abschnitte mit Zeichen, Einheiten und Ist-Stärke.
  - [beobachtet] Der HTML-Monitor (Ausgaben) zeigt die Bereiche mit Fü/UFü/He und Gesamt. Die Zeilen sind bei 1920×1080 etwa 24 px groß. [Annahme] Auf einem 55-Zoll-Bildschirm aus drei Metern ist das grenzwertig. Zeichen fehlen, UA ohne Einrückung (siehe P1-4), „Stand der Lage“ steht doppelt im Kopf.
- **Erwartung der Rolle:** Eine Wandansicht „Lage“: Harke mit Zeichen, je Abschnitt Ist-Stärke und erwartete Kräfte, Stand groß. Sie wäre die digitale Lagetafel neben der Papierkarte.
- **Auswirkung:** In der Lagebesprechung ist am Monitor nur die Gesamtzahl zu sehen. Für die Gliederung muss jemand die Harke am Arbeitsplatz zeigen, und deren Unterschriften (≈ 11 px) sind aus drei Metern nicht lesbar.
- **Empfehlung:** Monitoransicht „Führungsorganisation“ mit den großen Flaggen und skalierender Schrift für Name und Stärke, wie bei der Funkplan-Tafel.
- **Verifikation:** Ansicht 7 (o. ä.) zeigt bei 1920×1080 alle EA/UA/Einrichtungen mit Zeichen. Name und Stärke haben mindestens die Schriftgröße der Funkplan-Tafel.

### P2-4: Zeichenzuordnung der Abschnitte teilweise fragwürdig, Kurz- und Langform passen nicht zusammen

- **Fundstelle:** Abschnittsbaum, Harke. [Code `harke.ts:33–83`, `harke.ts:115–140`].
- **Beobachtung:**
  - [Code] Typ `FUEHRUNGSSTELLE` wird immer zu `Führungsstellen/TEL` („Technische Einsatzleitung“), auch wenn der Abschnitt „FüSt Oldenburg“ heißt. Der Satz enthält auch `Führungsstellen/Führungsstelle.svg` und `Abschnittsführungsstelle.svg`. [Annahme] Für eine THW-Führungsstelle, die nicht die TEL ist, ist „TEL“ auf der Karte eine falsche Aussage über die Führungsebene.
  - [Code] `LOGISTIK` zeigt das Zeichen „Logistikstützpunkt“, die Langform lautet aber „Versorgungsstelle“ (`harke.ts:126`). Der Satz hat eigene Zeichen „Versorgungsstelle Verpflegung/Verbrauchsgüter/Materialerhaltung“.
  - [Annahme] Ein Einsatzabschnitt erscheint als Flagge „EAL“ (Einsatzabschnittsleitung). Auf der Karte steht der Abschnitt selbst [Annahme: als Raum/Grenze], die Flagge nur für seine Leitung. Das ist vertretbar, sollte aber so benannt sein.
  - [beobachtet] Die freie Zeichenwahl je Abschnitt funktioniert (Suche, 39 Kategorien, Kachel „aus dem Typ“, Shot 29). Wer TEL für falsch hält, kann korrigieren.
- **Erwartung der Rolle:** Vorgabezeichen, die zur tatsächlichen Führungsebene passen, oder ein Hinweis „abgeleitet, bitte prüfen“.
- **Auswirkung:** Übernimmt ein neuer Lagekartenführer die Flagge „TEL“ ungeprüft, steht auf der Karte eine Technische Einsatzleitung, die es so nicht gibt.
- **Empfehlung:** Für Typ Führungsstelle das neutrale Führungsstellen-Zeichen vorbelegen oder beim Anlegen fragen. Langform und Zeichen von „Logistik“ angleichen. Die Zuordnung von Fachkundigen (DV 102) prüfen lassen.
- **Verifikation:** „FüSt Oldenburg“ zeigt ohne Eingriff ein Zeichen, dessen Titel zur Führungsstelle passt. Tooltip und Zeichen von „Logistik“ sagen dasselbe.

### P2-5: Neue Einheiten landen als „Angefordert“ im Ziel-Abschnitt und zählen dort als erwartet

- **Fundstelle / Aufgabe 5:** „Einheit anlegen › Ohne Vorlage“ mit Abschnitt „EA Reserve“. Shot `29-zeichenwahl-bw.png` (Hintergrund).
- **Beobachtung:** [beobachtet] Die drei neuen Einheiten stehen in EA Reserve mit Status „Angefordert“. Der Baum zeigt „EA Reserve 3 · 0/0/0 · +35 erwartet“, die Harke dasselbe. Der Hinweistext der Maske sagt das ehrlich („plant Kräfte und meldet sie nicht als anwesend“).
- **Erwartung der Rolle:** [Annahme] Was im EA steht, ist dort, oder es ist am Zeichen sichtbar als „erwartet“ unterschieden (auf der Tafel z. B. Magnet am Rand).
- **Auswirkung:** Am Abschnitt EA Reserve steht in der Harke „3 Einh.“ und Stärke 0. Ob ich drei Magnete hinhänge oder an den Rand lege, muss ich in der Tabelle nachsehen.
- **Empfehlung:** In Harke und Baum „3 Einh. (davon 3 erwartet)“ ausweisen. Beim Anlegen in einen Einsatzabschnitt den Status direkt mit abfragen.
- **Verifikation:** Harke für EA Reserve sagt in Worten, dass alle drei noch nicht da sind.

### P3-1: Kein Profil für Lage/S2

- [beobachtet] Profile: „Führungsstelle (S1)“, „Vermeldezentrale“, „Versorgung (S4)“, „Alle Blätter“ (Shot 02). Für den Lagekartenführer passt keins genau. Die Führungsorganisation liegt im Reiter „Führungsstelle“ unter „Stammdaten und Schichtplan“, die Monitore im Fenstermenü.
- **Empfehlung:** Profil „Lage (S2)“ mit Lage, Führungsorganisation, Tagebuch, Ausgaben. **Verifikation:** Profil wählbar, Führungsorganisation in einem Klick.

### P3-2: Uhrzeiten nicht als DTG in Tagebuch und Ausgaben

- [beobachtet] Kopf und Monitor zeigen das DTG („052102NOV26“). Das Tagebuch zeigt „05.11. 21:01:08“, Ausgaben „Stand: 5.11.2026, 21:03:47“. [Annahme] An der Karte wird mit DTG bzw. Uhrzeit nachgeführt, beides ist lesbar, aber uneinheitlich.
- **Empfehlung:** Einheitlich DTG oder einheitlich TT.MM. HH:MM. **Verifikation:** Tagebuch, Druck und Monitor nennen dieselbe Form.

### P3-3: Nachtbild: Abschnittszeichen hell auf hellen Kacheln

- [beobachtet] Im Nachtbild stehen die gelben Flaggen und Kreise auf hellgrauen Kacheln in voller Helligkeit (Shot 34). Das Etikett „Angefordert“ ist fast unsichtbar. [Annahme] In abgedunkelter Führungsstelle blendet das.
- **Empfehlung:** Zeichen im Nachtbild gedimmt, ohne helle Kachel. **Verifikation:** Nachtbild der Harke ohne Flächen heller als der Text.

### P3-4: Druck-HTML: Spaltenköpfe verschoben

- [beobachtet] Im Druck-HTML steht „Gesamt“ senkrecht buchstabenweise, „Davon Stärke: THW“ sitzt nicht über seinen vier Zahlenspalten (Shot 21). Inhalt korrekt, Ablesen am Aushang mühsam.
- **Empfehlung:** Kopf über den richtigen Spalten. **Verifikation:** Druckvorschau A4 quer zeigt jeden Kopf über seinen Zahlen.

---

## Positives

Die Gliederung in Abschnitte mit Ist-Stärke und getrennt ausgewiesenen erwarteten Kräften ist klar und stimmt in sich: Die Summe von EA und UA im Druck ergibt die Zahl im Baum, und der Statuswechsel schlägt sofort in Kopfband und Baum durch (264 → 269). Die Abschnitte tragen echte DV-102-nahe Zeichen aus einem gepflegten, wöchentlich aktualisierten Satz, die freie Zeichenwahl je Abschnitt ist gut bedienbar. Das Tagebuch nennt bei Verlegung und Status „vorher → nachher“ mit Arbeitsplatz. Der Stärke-Monitor ist fernlesbar und trägt das DTG, das HTML-Monitorbild sagt groß, auf welchem Stand es ist.

---

## Abschluss

- **Aufgabe der Rolle geschafft:** mit Umwegen. Gliederung und Stärken ja, Zeichen der Einheiten, Orte und „Änderungen seit“ nein.
- **Nebenaufzeichnung auf Papier nötig:** ja. Für das Zeichen jeder Einheit, die Ortsangaben von Abschnitten und Einrichtungen, und die Uhrzeit meiner letzten Nachführung samt Liste der seither gelesenen Änderungen.
- **Größte Lücke an einer Übergabe:** Von S1 (Kräfteübersicht/Tagebuch) an den Lagekartenführer kommt keine gefilterte Liste „neu/verlegt/Status seit HH:MM“ mit Ziel-Abschnitt. Ich muss sie aus dem ungefilterten Tagebuch selbst herauslesen.
- **Größtes Einsatzrisiko:** Eine Verlegung oder Neuanlage wird beim Durchlesen des Tagebuchs übersehen, und der Magnet bleibt am falschen Abschnitt, ohne dass die Software es anzeigt.
- **Top-Priorität für die nächste Iteration:** Taktisches Zeichen je Einheit, vorgeschlagen aus Vorlage bzw. Name und Organisation (der Vorschlag existiert schon im Fachkern) und frei wählbar, sichtbar in Tabelle, Einheitenliste und druckbarer Führungsorganisation.
