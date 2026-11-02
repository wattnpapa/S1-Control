# S4-Ansichten: Unterbringung und Verpflegung aus der Kräfteübersicht

Stand 2026-11-02. Das ist ein Entwurf, nichts davon ist umgesetzt. Der Text
legt fest, was gebaut würde und aus welchen Daten; `mockups-s4.html` im selben
Ordner zeigt, wie es aussähe (Runde 4, Optionen 4a bis 4h, Beispiellage
„Hochwasser Oldenburg" wie in `../oberflaeche/mockups.html`).

Begriffe: S1 führt die Kräfte, S4 versorgt sie. In der THW-Führungsstelle ist
S4 der Sachgebietsleiter Versorgung; er kümmert sich um Unterbringung,
Verpflegung und, soweit es aus den Bögen kommt, um Kraftstoff. Mehr als diese
drei Dinge nimmt der Entwurf nicht an.

## 1. Ausgangslage

Der Stärke-Monitor (M3.5, `Monitor.tsx`) zeigt eine Zahl: die Ist-Stärke als
`Fü/UFü/He // Gesamt`, darunter die taktische Zeit, im Fuß Einsatzname und
Stand. Er bekommt das `Lagebild` aus dem Worker geschoben und rechnet nichts.
Ein zweites Monitorbild gibt es als Datei: `monitor.html` im Ordner
`ausgaben\` (M4.3) ist der Druck in dunkler Hülle mit 60-Sekunden-Reload.

Die Logistikzahlen sind bereits da, nur nicht am Bildschirm. Das Blatt „Log"
(M5.1, `packages/ausgaben/src/log.ts`) rechnet über `projektion.logistikblatt`
je Bereich: Gesamtstärke je Schicht (K24), Männlich/Weiblich/Divers (K4, K5),
Vegetarisch/Vegan (K4) und Übernachtungsbedarf nach m/w/d (K6). Es ist eine
Ausgabe (PDF oder HTML über das Blatt „Ausgaben"), keine Ansicht: Wer die
Zahlen sehen will, erzeugt eine Datei und öffnet sie. Das ist für einen
Ausdruck an der Zeltwand richtig und für die laufende Arbeit des S4 zu
langsam.

Die Einzelwerte kommen aus drei Quellen: aus dem Erfassungsbogen
(`sofortbedarf`: Verpflegung für n Personen, Diesel/Benzin/Gemisch in Litern,
Unterbringung ja/nein, Ruhezeit erforderlich ja/nein), aus den Personen der
Einheit (`geschlecht`, `ernaehrung`) und aus den Overrides je Einheit
(`LogistikGesetzt` für weiblich, divers, vegetarisch, vegan, uebernachtungM/W/D),
die eine Meldung ohne Personenliste ersetzen. Der Kostenparameter
`ukVerpflegungProTag` (20 € je Kraft und Tag) gehört zur Abrechnung, nicht zur
Planung.

Was fehlt, sind vier Dinge: eine Ansicht statt einer Datei, ein Monitorbild
für die Versorgung, die Orte (Unterkünfte, Ausgabestellen) als Entitäten und
der Abgleich Bedarf gegen Bestellung.

## 2. Was der S4 wissen muss und woher es kommt

| Frage des S4 | Quelle im Modell | Stand |
|---|---|---|
| Wie viele Essen braucht die nächste Mahlzeit, je Bereich? | Gesamtstärke je Bereich (K2) und je Schicht (K24), Mahlzeitenregel je Schicht (neu, Parameter) | ableitbar |
| Wie viel Essen zu welcher Mahlzeit in den nächsten 24 Stunden? | dasselbe je Mahlzeit in Zeitfolge, dazu Zugänge ab `eingetroffenAm` (erwartet) und Abgänge ab `verfuegbarBis`, `einsatzendeAm`, `rueckfuehrungAm` | ableitbar, Rechnung neu |
| Wie viele davon vegetarisch oder vegan? | K4 aus Personen oder Override `vegetarisch`/`vegan` | vorhanden |
| Weitere Kostformen (halal, Allergien, Diät)? | nicht im Bogen, nicht im Modell | neu, offen (Entscheidung 3) |
| Wer braucht heute Nacht ein Bett, getrennt nach m/w/d? | K6 aus `sofortbedarf.unterbringung` und Personen, Override `uebernachtungM/W/D` | vorhanden |
| Wer braucht Ruhezeit und ab wann? | `sofortbedarf.ruhezeitErforderlich`, `schicht`, `eingetroffenAm` | vorhanden, nur als Ja/Nein |
| Wo schläft wer, wie viele Plätze sind frei? | Unterkunft als Entität mit Kapazität, Zuweisung Einheit → Unterkunft | neu |
| Wer kommt wann an und geht wann? | `status` ANMARSCH, `eingetroffenAm`, `verfuegbarBis`, `einsatzendeAm`, `rueckfuehrungAm` | vorhanden |
| Welche Einheiten sind im Anmarsch und noch nicht zu versorgen? | Bereiche vom Typ ANGEFORDERT, getrennte Zeile im Logistikblatt | vorhanden |
| Wie viel Kraftstoff wurde gemeldet? | `sofortbedarf.dieselLiter/benzinLiter/gemischLiter` | vorhanden als Erstmeldung; Verbrauch und Erledigung fehlen |
| Welche Fahrzeuge stehen wo (Stellplätze)? | Fahrzeuge je Einheit, nach Typ (K10) | vorhanden |
| Was ist bestellt, was geliefert? | nichts | neu |

Alles in der Spalte „vorhanden" wird gelesen, nicht gepflegt: Der S1 schreibt
die Einheit, der S4 liest sie. Was der S4 selbst schreibt, sind seine eigenen
Entitäten (Abschnitt 6).

## 3. Zählregel

Das Logistikblatt zählt alle erfassten Einheiten der Einsatzbereiche, auch die
in Ruhe, und führt den Bereich „Angefordert / Anmarsch" getrennt darunter. Das
ist nicht die Ist-Stärke des Kopfbands, die ANGEFORDERT und ARCHIV ausnimmt
und bei beendeten Einheiten anders zählt. Beide Zahlen sind richtig, aber für
verschiedene Fragen: 268 Köpfe sind da und müssen essen; 24 sind unterwegs,
und wer für sie mitkocht, hat am Abend zu viel.

Daraus folgt für jede S4-Ansicht und für den Monitor: Die Zählregel steht
sichtbar dabei („alle erfassten Einheiten der Einsatzbereiche, Anmarsch
getrennt"), und die Anmarschzahl steht daneben, nie darin. Gerechnet wird in
Ring 2 (`@s1/domaene`, `projektion`), so wie heute `logistikblatt`; weder
Renderer noch Ausgabe bilden eigene Summen. Das Logistikblatt auf Papier und
die Ansicht am Bildschirm zeigen dieselbe Zahl, weil es dieselbe Funktion ist.

## 4. Der Monitor: Ansichten und Umschaltung

Der Monitor bleibt ein Fenster mit einem Bild, bekommt aber mehrere Ansichten.
Fünf zum Start: Stärke (das heutige Bild, unverändert), Verpflegung, Nächste
24 h, Unterbringung und die Tafel „Bereiche und Schichten". Jede Ansicht folgt den
Regeln des heutigen Monitors: eine große Zahl, wenige Worte, Beschriftung über
der Zahl, taktische Zeit darunter, Einsatz und Stand im Fuß, dynamische
Schrift nach Fenstergröße (`schriftgroesse` in `monitorZahlen.ts` wird für
den Text der jeweiligen Ansicht wiederverwendet, keine zweite Heuristik).

Verpflegung (Option 4a) nennt die nächste Mahlzeit mit Uhrzeit und Restzeit,
darunter die Portionen als große Zahl, darunter vegetarisch und vegan, dann
die Bestellung, falls eine vorliegt, und die Anmarschzahl mit dem Zusatz
„nicht enthalten". Nächste 24 h (4h) ist die Vorausschau aus 5.2 als Tafel:
eine Zeile je Mahlzeit in Zeitfolge mit Portionen, Kostformen, Bestand,
Zugang, Abgang und Bestellung, die nächste Mahlzeit fett. Unterbringung (4b)
nennt die Nacht, die Betten als große
Zahl, die Aufteilung m/w/d, dann belegt, frei und ohne Zuweisung; die Zeile
„ohne Zuweisung" ist in Bernstein, denn sie ist die Arbeit, die noch ansteht.
Die Tafel (4c) ist das Logistikblatt in groß: eine Zeile je Bereich, Spalten
Schicht, Summe, Kostform, Betten, die Anmarschzeile abgesetzt darunter.

Umschalten geht auf drei Wegen, und alle drei liegen im Renderer:

Rechtsklick oder die Taste Menü öffnet ein Kontextmenü mit den Ansichten,
die aktive mit Haken, darunter „Ansichten wechseln alle 20 s" als Schalter,
„Vollbild" und „Monitor schließen". Das Menü ist ein eigenes Element im
Monitorfenster, kein Electron-Menü aus dem Main: Der Monitor läuft auch in
der Web-Schale (ADR-005) in einem Browsertab, und dort gäbe es das
Electron-Menü nicht. Ein Menü, das in beiden Hüllen gleich aussieht, ist auch
in beiden gleich zu prüfen (jsdom).

Mausbewegung zeigt oben eine Leiste mit den Ansichten als Reiter, die nach
drei Sekunden ohne Bewegung verschwindet. Auf einem Monitor an der Wand ist
die Maus meist nicht da; die Leiste ist für den Moment, in dem jemand mit dem
Laptop danebensteht und ausprobiert.

Tastatur: 1 bis 5 wählen die Ansicht, R schaltet den Wechsel ein und aus,
Leertaste hält einen laufenden Wechsel an, F11 Vollbild, Esc verlässt es.

Der Wechsel ist absichtlich kein Standard: Ein Monitor, der von allein
umspringt, lässt den Betrachter raten, ob er dieselbe Zahl gerade noch
gesehen hat. Wer ihn will, schaltet ihn ein, und ein kleiner Punkt im Fuß
zeigt, welche Ansicht als nächste kommt.

Die gewählte Ansicht und der Wechselschalter sind Fensterzustand und werden
in den Einstellungen dieses Geräts gemerkt (wie `theme`), nicht in der Akte:
Der Monitor im Zelt zeigt Verpflegung, der im Fahrzeug Stärke, und beide
hängen an derselben Einsatzdatei.

Die Datei `monitor.html` auf dem Share bleibt, wie sie ist. Ob sie eine zweite
Datei `versorgung.html` bekommt, die die Tafel 4c mit 60-Sekunden-Reload
schreibt, ist Entscheidung 5; technisch ist es dieselbe Hülle wie heute mit
einer anderen Tabelle darin.

## 5. Das Blatt „Versorgung"

Ein neuer Reiter im Kopfband, zwischen Führungsstelle und Kosten, nur additiv
in `blaetter.ts`. Das Blatt hat fünf Unteransichten als Umschalter in der
Werkzeugzeile (Option 4d bis 4g): Verpflegung, Nächste 24 h, Unterbringung,
Bereiche und Schichten, Sofortbedarf. Das KPI-Band über dem Blatt nennt die Zahlen des
Tages: Portionen der nächsten Mahlzeit, vegetarisch, vegan, Betten heute
Nacht, ohne Unterkunft (Bernstein, wenn größer null) und Anmarsch. Das Blatt
setzt nicht auf der Auswahl der Lage auf (`gehoertZurLage` bleibt falsch); es
hat seine eigene Auswahl, die Unterkunft oder die Mahlzeit.

### 5.1 Verpflegung (4d)

Links der Mahlzeitenplan des Tages: eine Zeile je Bereich, Spalten Frühstück,
Mittag, Abend, Nacht mit ihrer Ausgabezeit, dazu Vegetarisch, Vegan und die
Ausgabestelle; Summenzeile unten, Anmarsch abgesetzt darunter. Welche Schicht
welche Mahlzeit bekommt, ist die Mahlzeitenregel: TAG isst Frühstück, Mittag,
Abend; NACHT isst Abend, Nacht, Frühstück; FRUEH und SPAET entsprechend. Die
Regel ist ein Parameter des Einsatzes mit Vorbelegung, denn ein Hochwasser im
September und ein Sturm im Januar verpflegen die Nachtschicht nicht zur
selben Stunde. Sie wird in der Werkzeugzeile gewählt und im Fuß des Plans
genannt.

Rechts die Bestellung der nächsten Mahlzeit: Bedarf aus dem Plan, bestellte
Menge, wo und wann bestellt, Abweichung als Zahl mit Vorzeichen, darunter
„Bestellung ändern" und „Als geliefert melden". Eine Bestellung ist ein
Ereignis (Abschnitt 6) und damit im Tagebuch und rücknehmbar; die Ansicht
zeigt den Verlauf der letzten Bestellungen des Tages als kurze Liste. Die
Bestellliste als PDF ist eine neue Ausgabe in `@s1/ausgaben`, die den Plan
mit der Bestellung zusammenführt.

### 5.2 Nächste 24 h (4g)

Die Frage des S4 am Nachmittag lautet nicht „wie viele sind heute da",
sondern „was brauche ich zu welcher Mahlzeit bis morgen um diese Zeit". Die
Vorausschau beantwortet sie: die Mahlzeiten der nächsten 24 Stunden in
Zeitfolge, bei 1443 also Abend 1800 heute, Nacht 0000, Frühstück 0600 und
Mittag 1200 morgen; ein Umschalter weitet auf 48 Stunden.

Je Mahlzeit stehen oben vier Karten mit der Vorausschau als große Zahl,
Kostformen, der Rechnung dahinter und dem Stand der Bestellung; die nächste
Mahlzeit trägt den 2-px-Rahmen. Darunter die Tabelle: eine Zeile je Bereich,
je Mahlzeit drei Spalten (Portionen, vegetarisch, vegan), dann die Zeilen
Bestand, Zugänge, Abgänge und Vorausschau. Rechts daneben die Liste der Zu-
und Abgänge mit Uhrzeit, Einheit, Bereich und Grund.

Die Rechnung je Mahlzeit: Bestand sind alle erfassten Einheiten der
Einsatzbereiche, nach Mahlzeitenregel und Schicht gefiltert, dieselbe Zahl
wie im Mahlzeitenplan. Zugänge sind Einheiten im Anmarsch, deren gemeldete
Eintreffzeit vor der Ausgabezeit liegt. Abgänge sind Einheiten, deren
„verfügbar bis", Einsatzende oder Rückführung vor der Ausgabezeit liegt. Was
keine Zeit trägt, etwa eine zugesagte Ablösung ohne Eintreffzeit, steht in
der Liste mit der Marke „nicht eingerechnet", aber nicht in der Zahl: Eine
Vorausschau, die rät, ist schlechter als eine, die sagt, was sie nicht weiß.

Das ist die eine Stelle, an der der Anmarsch in eine Zahl eingeht, und sie
ist als Vorausschau beschriftet. Die Bestellung der nächsten Mahlzeit nimmt
die Vorausschau als Vorschlag; wer die Reserve anders setzt, überschreibt die
Zahl in der Bestellmaske. Liegt eine Bestellung unter der Vorausschau, weil
nach der Bestellung noch eine Einheit gemeldet wurde, zeigt die Karte die
Differenz in Bernstein. Die Vorausschau als PDF ist die dritte neue Ausgabe,
für den Verpflegungsträger, der morgen früh kocht.

### 5.3 Unterbringung (4e)

Links die Unterkünfte als Karten: Name, Ort, Kapazität, Belegung als Balken
in m/w/d, frei, dazu eine Marke „voll" oder „frei". „Unterkunft anlegen" ist
eine Maske wie „Abschnitt anlegen" (Enter bestätigt, Esc verwirft). Rechts
die Tabelle der Einheiten mit Übernachtungsbedarf: Einheit, Bereich, Schicht,
ÜN m/w/d, Ruhezeit, Unterkunft, Zustand. Einheiten ohne Zuweisung stehen oben
und tragen die Marke „ohne Unterkunft" in Bernstein; die Zelle „Unterkunft"
ist in der Zeile bearbeitbar wie jede Zelle der Einheitentabelle (Doppelklick,
Enter, Esc) und bietet die Unterkünfte mit freien Plätzen zur Wahl. Eine
Zuweisung, die die Kapazität überschreitet, wird nicht verweigert, sondern
mit „⚠ überbelegt" an der Karte gezeigt: Im Einsatz schlafen zwanzig Leute
auch in einer Halle für zwölf, und die Software soll das wissen, nicht
verhindern.

Die Belegungsliste als PDF ist die zweite neue Ausgabe: je Unterkunft die
Einheiten mit Köpfen, für den Zettel an der Hallentür.

### 5.4 Bereiche und Schichten

Das Logistikblatt am Bildschirm, aus `projektion.logistikblatt` ohne jede
Änderung an der Rechnung, mit Live-Aktualisierung über den Zeiger des
Lagebilds (M3.7) statt über ein neu erzeugtes PDF. Die Fußnote zur Rechnung
hinter „Männl." (`LOG_FUSSNOTE`) steht auch hier. Dieses Stück ist das
kleinste und kommt zuerst (Abschnitt 7).

### 5.5 Sofortbedarf (4f)

Eine Tabelle über alle Einheiten mit Sofortbedarf aus dem Bogen: eingetroffen
um, Verpflegung für n Personen, Diesel, Benzin, Gemisch in Litern,
Unterbringung, Ruhezeit, Stand der Meldung, erledigt. Summenzeile für die
Liter. „Als erledigt melden" ist ein Ereignis je Feld, damit Diesel erledigt
sein kann und Unterbringung noch nicht. Der Sofortbedarf ist die Erstmeldung
beim Eintreffen; die Tabelle ist die Abarbeitungsliste dazu und verschwindet
nicht, wenn alles erledigt ist, sondern zeigt die Zeilen blass.

## 6. Datenmodell und Ereignisse (Vorschlag, additiv)

Neue Entitäten im Zustand, alle mit denselben Rahmenfeldern wie Abschnitt und
Einheit (§3.2 des Ereigniskonzepts, Anlage, Feld, verworfene Anlagen):

Unterkunft: id, name, ort, kapazitaet (eine Zahl oder m/w/d getrennt,
Entscheidung 2), bemerkung, aufgeloest. Ereignisse `UnterkunftAngelegt`,
`UnterkunftGeaendert` (feld), `UnterkunftAufgeloest` mit Pflichtgrund.

Zuweisung: `EinheitUntergebracht` (einheitId, unterkunftId, ab, bis optional)
und `UnterbringungAufgehoben` (einheitId). Die Zuweisung hängt an der Einheit
als Feld `unterkunftId`, damit Verschieben und Entfernen der Einheit sie
mitnehmen und der Fold keine zweite Karte braucht.

Ausgabestelle: `AusgabestelleAngelegt` (id, name, ort, traeger, mahlzeiten)
und die Zuordnung Bereich → Ausgabestelle als Feld am Abschnitt
(`AbschnittAusgabestelleGesetzt`). Vorbelegung: der Bereich vom Typ LOGISTIK,
wenn es genau einen gibt.

Bestellung: `MahlzeitBestellt` (datum, mahlzeit, ausgabestelleId, portionen,
vegetarisch, vegan, bestelltBei, bestelltVon), `MahlzeitGeliefert`
(bestellungId, portionen), `MahlzeitStorniert` mit Pflichtgrund.

Sofortbedarf: `SofortbedarfErledigt` (einheitId, feld) mit den Feldern des
Bogens als Aufzählung, Gegenstück `SofortbedarfWiederOffen`.

Mahlzeitenregel: `MahlzeitenregelGesetzt` am Einsatz, Nutzlast je Mahlzeit
die Ausgabezeit und die Schichten, die sie bekommen; Vorbelegung in `werte.ts`
neben `KOSTEN_VORBELEGUNG`.

Das `Lagebild` wächst um ein kleines Feld `versorgung`: Portionen und
Kostformen der nächsten Mahlzeit, Mahlzeit und Zeit, Betten m/w/d, belegt,
frei, ohne Zuweisung, Anmarsch, dazu je Mahlzeit der nächsten 24 Stunden
Portionen, vegetarisch, vegan, Bestand, Zugang, Abgang und bestellte Menge,
also vier mal sieben Zahlen. Das ist derselbe Umfang wie
`gesamtstaerke` und `staerkeJeStatus` und damit mit der Festlegung aus M2
vereinbar, keine Tabelle in das Lagebild zu legen. Der Monitor braucht genau
diese Zahlen und nichts weiter. Alles Weitere (Mahlzeitenplan, Unterkünfte,
Sofortbedarfsliste) holt das Blatt mit eigenen Rufen `versorgungAnfordern`
nach dem Muster von `tabelleAnfordern`, gefiltert und mit Zeigerstand.

## 7. Architektur und Schnitte

Rechnung in `packages/domaene/src/projektion/versorgung.ts` neben
`logistik.ts`; die Ausgaben Bestellliste und Belegungsliste in
`packages/ausgaben`; Kontrakt additiv in `apps/desktop/src/kontrakt`;
Renderer `Versorgung.tsx` mit den vier Unteransichten als eigene Dateien
unter 400 Zeilen, der Monitor bekommt `Monitoransichten.tsx` und das
Kontextmenü als eigene Datei. Der Main bekommt nichts Neues; `monitorOeffnen`
bleibt, wie es ist. Die Web-Schale braucht keine Änderung, weil Menü und
Umschaltung im Renderer liegen.

Senkrecht geschnitten, jeder Schnitt für sich prüfbar und nützlich:

S4.1 Blatt „Versorgung" mit den Unteransichten „Bereiche und Schichten" aus
der bestehenden Projektion und „Nächste 24 h" mit fester Mahlzeitenregel
(Vorbelegung, noch ohne Parameter), dazu der Monitor mit den Ansichten
Verpflegung (ohne Bestellung), Nächste 24 h (ohne Bestellung), Unterbringung
(nur Bedarf) und Tafel, Kontextmenü, Hover-Leiste, Tasten, Wechselschalter.
Keine neuen Ereignisse. Tests: Monitor in jsdom je Ansicht, Menü und Tasten;
`versorgung`-Feld im Lagebild gegen `logistikblatt` geprüft; Vorausschau mit
Zugang vor und nach der Ausgabezeit, Abgang, Einheit ohne Zeit.

S4.2 Unterkünfte und Zuweisung: Entität, Ereignisse, Fold, Unteransicht
Unterbringung, Belegungsliste, Monitor zeigt belegt/frei/ohne Zuweisung.
Tests: Fold mit Überbelegung, Verschieben und Entfernen einer zugewiesenen
Einheit, Undo.

S4.3 Mahlzeitenregel, Mahlzeitenplan, Bestellung und Lieferung, Bestellliste,
Monitor zeigt die Bestellung. Tests: Regel gegen Schichten, Bestellung im
Tagebuch, Rücknahme.

S4.4 Sofortbedarf-Abarbeitung mit Erledigt je Feld und Kraftstoffsumme.

Nach jedem Schnitt `typecheck`, `lint`, betroffene Tests; bei S4.2 und S4.3
(Fold, Sync) der volle Lauf.

## 8. Offene Entscheidungen

1. Reiter „Versorgung" im Kopfband für alle, oder nur sichtbar, wenn der
   Arbeitsplatz die Rolle S4 trägt? Der Entwurf zeigt ihn für alle; eine
   Rollenwahl gibt es im Modell nicht, und ein Reiter mehr kostet nichts.
2. Kapazität einer Unterkunft als eine Zahl oder getrennt nach m/w/d? Der
   Bedarf ist getrennt (K6); eine Turnhalle ist es meist nicht. Vorschlag:
   eine Zahl, mit optionaler Trennung, wenn die Unterkunft sie hat.
3. Weitere Kostformen (halal, Allergien, Diäten): als freies Textfeld je
   Einheit, als weitere Aufzählung der Ernährung am Bogen (dann im geteilten
   Kern `eeb-format` und damit in erfassungsbogen.app), oder gar nicht?
4. Mahlzeitenregel je Einsatz oder fest? Vorschlag: Parameter mit
   Vorbelegung, weil Nachtverpflegung je nach Lage um 0000 oder um 0200 liegt.
5. `versorgung.html` als zweite Monitordatei auf dem Share, oder reicht das
   Zweitfenster?
6. Der Anmarsch geht nur in die Vorausschau (5.2) ein, mit Eintreffzeit;
   Mahlzeitenplan und Monitoransicht „Verpflegung" zeigen ihn getrennt
   daneben. Offen bleibt, ob eine zugesagte Ablösung ohne Eintreffzeit eine
   Vorgabezeit bekommen darf (etwa die Ausgabezeit der übernächsten
   Mahlzeit) oder immer „nicht eingerechnet" bleibt.
7. Ruhezeit: nur das Ja/Nein des Bogens, oder eine Zeit „ab wann", damit die
   Unterbringung sagen kann, wann eine Halle wieder frei wird?
