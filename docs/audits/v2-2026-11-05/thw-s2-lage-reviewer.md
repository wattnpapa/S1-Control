# THW-Rollen-Audit S2 (Lage) — S1-Control v2

**Datum:** 05.11.2026
**Rolle:** Sachgebietsleiter S2 (Lage) einer THW-Führungsstelle, Perspektive nach Skill `thw-s2-lage-reviewer`
**Material:** laufende Web-Schale (Stand `6772ffe`, Code-Stand der UX-Schnitte bis `ffc3125`), eigene Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten) unter http://127.0.0.1:8213, Arbeitsplatz „S2 Lage“, Profil „Alle Blätter“; 40 Screenshots unter `scratchpad/shots/s2/` (1600 × 1000, Faktor 1); erzeugte Ausgaben (Druck, Einheitenliste, Tagebuch, Anforderungen, Status, Führungsorganisation als HTML) im Share der Kopie unter `ausgaben/`; Quelltext nur lesend; Handbuch und Kurzanleitung; Vorgänger-Audits `docs/audits/v2-2026-10-29/`.
**Kennzeichnung:** **[beobachtet]** an der laufenden Anwendung gesehen · **[Code]** aus dem Quelltext belegt · **[Annahme]** Ablauf- oder Rollenannahme · **[nicht prüfbar]** mit diesem Material nicht zu klären.

Durchgeführte Prüfaufgaben: (1) Lagemeldung „EA Deich Nord: Sickerstelle km 3,2 …“ über Funk erfasst und verfolgt; (2) Stand einer Einsatzstelle über die Zeit nachvollzogen (Tagebuch mit Auswahl, Suche); (3) Lagebesprechung vorbereitet (Kräfte je Abschnitt, offene Anforderungen, Änderungen); (4) Einsatzstelle „EA Sielhafen“ angelegt, TZ THW und LZ FW aus dem Bereitstellungsraum verschoben, Status und Auftrag gesetzt; (5) Schichtwechsel ohne mündliche Übergabe durchgespielt.

Hinweis zur Prüflage: Alle Ereignisse der Prüflage tragen als Erfassungszeit 05.11.2026 20:35 (Zeitpunkt der Erzeugung), fachliche Zeiten nur an den Anforderungen (08.09.2026). Eine echte Lageentwicklung über Stunden liegt nicht vor; Aufgabe 2 ließ sich deshalb nur am Mechanismus prüfen, nicht an gewachsenen Daten.

---

## Urteil

S1-Control ist eine gute **Kräfteübersicht**, aber noch **kein Lagebild**. Was die eigene Lage betrifft — welche Einheit steht in welchem Abschnitt, in welchem Status, mit welcher Stärke, welcher Auftrag, welche Ablösung ist angefordert — liefert die Anwendung schnell und an mehreren Arbeitsplätzen gleich, und der Druck „Stärke“ ist eine brauchbare Unterlage für den Teil „eigene Kräfte“ der Lagebesprechung. Seit dem 29.10. sind Aufträge erfassbar und Ablösungen an der Zeile sichtbar; das hilft auch S2.

Für die eigentliche Arbeit des S2 fehlt dagegen die Hälfte: Es gibt **keinen Ort für die Schadenlage je Einsatzstelle**, **keinen Eingang für Lagemeldungen** mit Bearbeitungsstand, **keine Möglichkeit, die Lage zu einem früheren Zeitpunkt zu sehen** oder „seit der letzten Lagebesprechung“ zu filtern, und **keinen Lagevortrag oder keine Lagemeldung nach oben** als Ausgabe. Die einzige Stelle für eine eingehende Meldung ist der freie Tagebucheintrag — und genau der **speichert in seiner Voreinstellung nicht** („leer = jetzt“ führt zu „Nicht gespeichert – … Invalid ISO datetime“).

Die Rolle kann ihre Aufgabe mit der Software **nur mit Umwegen** erledigen; Lagekarte bzw. Lagetafel und eine Liste offener Lagemeldungen müssen **parallel auf Papier** geführt werden.

---

## Findings

### P0-1 · Tagebucheintrag mit leerer Zeit („leer = jetzt“) wird nicht gespeichert

1. **Priorität:** P0
2. **Fundstelle / Aufgabe:** Einsatztagebuch → „Eintrag hinzufügen“ → Text, Quelle, Feld „Zeit der Meldung“ leer lassen → „Eintrag speichern“ (Aufgabe 1). Screenshots `34b-lb-nach-speichern.png`, `36-eintrag-ohne-zeit-fehler.png`. `apps/desktop/src/renderer/TagebuchEintrag.tsx:46-50` zusammen mit `apps/desktop/src/renderer/Anlegeversuch.tsx:73-76`.
3. **Beobachtung [beobachtet]:** Zweimal in frischer Maske nachgestellt (Quelle „Lagebesprechung“ und „Telefon“): Die Maske bleibt offen und zeigt in Rot „Nicht gespeichert – Die Nutzlast für EtbEintragErfasst ist nicht gültig: zeitpunkt — Invalid ISO datetime“. Mit eingetippter Zeit („2032“, „2045“) wird derselbe Eintrag gespeichert. Das Feld wirbt ausdrücklich mit dem Platzhalter „leer = jetzt, sonst z. B. 0630“.
   **[Code]:** `versuch.kennung(...)` hält den ersten erzeugten Wert fest (`gehalten.current ??= erzeuge()`). Der zweite Aufruf in `TagebuchEintrag.tsx:47` für den Zeitpunkt liefert daher die schon gehaltene ETB-Kennung zurück statt der Uhrzeit — der Zeitpunkt ist dann keine Zeit. Für die Maske gibt es keinen eigenen Test (`grep` findet keine `TagebuchEintrag`-Prüfung in `*.test.tsx`).
4. **Erwartung der Rolle:** Eine Funk- oder Telefonmeldung wird in Sekunden festgehalten; „jetzt“ ist der Normalfall und darf nicht scheitern. Wenn etwas fehlt, sagt die Maske in Klartext, welches Feld.
5. **Auswirkung im Einsatz:** Der freie Tagebucheintrag ist der **einzige** Weg, eine Lagemeldung zu erfassen (siehe P1-1). Im Normalfall — sofort mitschreiben, Zeit leer — scheitert er mit einer Programmmeldung, die niemand am Platz deuten kann. Wer unter Druck „Abbrechen“ drückt oder die Maske für den nächsten Anruf schließt, verliert die Meldung; wer es nicht bemerkt, glaubt sie im Tagebuch. Der Umweg (Uhrzeit von Hand tippen) muss erst erraten werden.
6. **Empfehlung:** Leere Zeit wieder als „jetzt“ speichern; Fehlermeldungen der Maske in Nutzersprache und am betroffenen Feld („Zeit der Meldung nicht lesbar“) statt Schemameldung; die Maske mit einem Renderer-Test für „Zeit leer“ und „Zeit gesetzt“ absichern.
7. **Verifikation:** Eintrag mit leerer Zeit speichern → Zeile mit „Zeit der Meldung“ = Erfassungszeit erscheint sofort im Tagebuch; ein Test schlägt fehl, wenn der Zeitpunkt keine ISO-Zeit ist.

### P1-1 · Kein Eingang für Lagemeldungen, kein Bearbeitungsstand, kein Bezug zur Einsatzstelle

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Aufgabe 1 und 5. Eingang → Eingangskorb (`17-eingangskorb.png`); Einsatztagebuch → „Eintrag hinzufügen“ (`06-eintrag-maske.png`); Lage → EA Deich Nord gewählt → Einsatztagebuch → „Auf die Auswahl beschränken“ (`13-tagebuch-auswahl-ea.png`). `apps/desktop/src/renderer/TagebuchEintrag.tsx:1-30`.
3. **Beobachtung [beobachtet]:** Der Eingangskorb ist laut Einstiegszeile für „Gemeldete Erfassungsbögen, bevor sie in die Lage übernommen werden“ — also für Einheitenmeldungen, nicht für Lagemeldungen. Die Lagemeldung zur Sickerstelle konnte ich nur als freien Tagebucheintrag erfassen: Felder „Was wurde gemeldet?“, „Quelle“ (Funk, Telefon, Meldung vor Ort, Lagebesprechung, Sonstiges), „Zeit der Meldung“. Es gibt kein Feld für Einsatzstelle/Abschnitt, Meldenden, Empfänger oder Dringlichkeit; die Quelle wird nur als Textvorsatz „Funk: …“ gespeichert (**[Code]** `TagebuchEintrag.tsx:9-11, 26-29`). Mit EA Deich Nord gewählt und „Auf die Auswahl beschränken“ zeigt das Tagebuch 16 Einträge zu diesem Abschnitt — **meine Lagemeldung zu EA Deich Nord ist nicht dabei**. Sie taucht außer im Tagebuch (und im Tagebuch-Ausdruck) nirgends auf: nicht am Abschnitt, nicht im Kopfband, nicht im Eingang, nicht im Monitor. Eine Meldung lässt sich nicht als „eingearbeitet“ oder „offen“ kennzeichnen.
4. **Erwartung der Rolle:** Ein Eingang für Lagemeldungen (ähnlich dem Meldeblock/Nachrichtenvordruck), in dem jede Meldung mit Uhrzeit, Quelle und betroffener Einsatzstelle steht und sichtbar bleibt, bis S2 sie ins Lagebild übernommen hat; die Zahl offener Meldungen gut sichtbar. **[Annahme]** zum genauen Vordruck: Ablauf nach DV 1-100 nur allgemein — Meldungen laufen über die Sichtung in die Sachgebiete.
5. **Auswirkung im Einsatz:** Was in der Meldung steckt („Unterstützung 2. BGr erforderlich“) erreicht weder S1 noch S3 von selbst und wird nicht zur Anforderung. Welche Meldungen schon eingearbeitet sind, weiß nur der Kopf des S2 — nach Schichtwechsel niemand. Die Liste offener Meldungen wird auf Papier geführt.
6. **Empfehlung:** Lagemeldung als eigene Art mit Feldern Einsatzstelle/Abschnitt (Auswahl aus dem Baum), Quelle/Meldender, Zeit, Text und Zustand „offen / eingearbeitet / weitergegeben an …“; Zähler der offenen Meldungen am Reiter; Bezug zum Abschnitt, damit „Auf die Auswahl beschränken“ sie findet; aus einer Meldung heraus eine Anforderung anlegen können.
7. **Verifikation:** Meldung zu EA Deich Nord erfassen → sie erscheint als offen im Eingang, im Tagebuch bei gewähltem Abschnitt und am Abschnitt; nach „eingearbeitet“ fällt der Zähler; ein zweiter Arbeitsplatz sieht denselben Zustand.

### P1-2 · Kein Lagestand je Einsatzstelle und Abschnitt — keine Lagetafel

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Aufgabe 3 und 4. Lage → „Abschnitt anlegen“ (`19-abschnitt-anlegen.png`); „⋯“ am Abschnitt; Monitor (`32-monitor.png`, `33-monitor-taste5.png`). **[Code]** `packages/domaene/src/katalog/index.ts:150` (`AbschnittBemerkungGesetzt`) ohne Verwendung im Renderer (`grep` in `apps/desktop/src/renderer`: kein Treffer).
3. **Beobachtung [beobachtet]:** Ein Abschnitt hat Name, Typ (Führungsstelle … Einsatzort) und taktisches Zeichen; das Menü „⋯“ bietet „Umbenennen, Typ ändern, Zeichen, Umhängen, Reihenfolge, Auflösen“. Es gibt kein Feld für Ort/Adresse, Schadenlage, Abschnittsleiter, Auftrag des Abschnitts, letzte Meldung, deren Uhrzeit und Quelle. Das Blatt „Lage“ ist laut eigener Einstiegszeile „das Gegenstück zur bisherigen Stärketabelle auf Papier“. Der Monitor zeigt Ist-Stärke, Verpflegung, Unterbringung, „Bereiche · Schichten“ (Köpfe, Kostform, Betten) und Funkplan — keine Lagetafel. Eine Lagekarte gibt es nicht. **[Code]** Die Domäne kennt eine Bemerkung am Abschnitt, die Oberfläche bietet sie nicht an.
4. **Erwartung der Rolle:** Je Einsatzstelle eine Zeile „Lage“: was ist los, seit wann, letzte Meldung (Uhrzeit, von wem), eingesetzte Kräfte, offene Probleme — wie die Spalte einer Lagetafel. Daraus ließe sich der Vortrag „Schadenlage“ lesen.
5. **Auswirkung im Einsatz:** Die Schadenlage wird vollständig neben der Software geführt (Lagekarte, Whiteboard). Die Software kennt die Kräfte, das Papier die Lage — Widersprüche zwischen beiden (Kräfte an einer Einsatzstelle, deren Lage sich erledigt hat) fallen niemandem auf.
6. **Empfehlung:** Am Abschnitt ein kurzer, fortschreibbarer Lagestand mit Zeit und Quelle (jede Änderung ein Ereignis, wie heute schon alles); in Baum und Monitor sichtbar „letzte Lage vor n min“, veraltete Stände hervorgehoben. Die vorhandene Bemerkung am Abschnitt ist ein naheliegender Anfang.
7. **Verifikation:** Für EA Sielhafen einen Lagestand eintragen → er steht am Abschnitt mit Uhrzeit und Bediener, im Tagebuch beim Filter auf diesen Abschnitt und auf einer Monitor-Ansicht; nach Ablauf einer Schwelle ist er als veraltet erkennbar.

### P1-3 · Lageentwicklung lässt sich nicht rekonstruieren

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Aufgabe 2 und 5. Einsatztagebuch (`05-tagebuch.png`, `38-konflikthinweise.png`), Tagebuch-Ausdruck `ausgaben/tagebuch_2026-11-05_2053.html`. **[Code]** `apps/desktop/src/renderer/Tagebuch.tsx:8-10` (hundert Zeilen), `:58-68` (Filter nur Auswahl, Suche, Rücknahmen); `packages/ausgaben/src/listen.ts:82`.
3. **Beobachtung [beobachtet]:** Das Tagebuch bietet Suche, „Auf die Auswahl beschränken“ und „Nur Rücknahmen und Berichtigungen“ — **keinen Zeitfilter** („seit 20:45“, „seit letzter Lagebesprechung“). Es zeigt die jüngsten 100 Zeilen; die Fußzeile sagt „100 von 137 Einträgen“, ein Weiterblättern gibt es nicht, ältere Einträge sind in der Anwendung nur über Suche oder Auswahl erreichbar. Es gibt keine Ansicht „Stand um HH:MM“ und keine Spalte „Status seit“ (die Spalten der Tabelle in `packages/domaene/src/projektion/tabelle.ts:136-232` **[Code]**; einzige Zeitangabe je Einheit ist „Letzter Kontakt“ unter Funk, z. B. „2049 Meldung“). Fachliche Einträge gehen im Rauschen unter: Die ersten 100 Zeilen sind überwiegend Dienstposten, Schichtplan, PSA-Bedarf, Logistikangaben. Der Umweg, nur die eigenen Meldungen zu sehen, ist die Suche nach dem Wort „Tagebucheintrag“ (`34-tagebuch-nur-eintraege.png`). Im Ausdruck mischt die Spalte „Zeit“ fachliche Zeit und Erfassungszeit ohne Kennzeichnung (`zeile.zeitpunkt ?? zeile.wanduhr`): ANF-2026-002 steht mit „08.09.2026 05:30“ zwischen Zeilen mit „05.11.2026 20:35“.
4. **Erwartung der Rolle:** „Was hat sich an EA Deich Nord seit der Lagebesprechung um 20:45 geändert?“ in einem Schritt: Zeitraum wählen, Abschnitt wählen, nur lagerelevante Vorgänge (Status, Verschiebung, Auftrag, Meldung). Optional: Stand eines Abschnitts zu einem Zeitpunkt.
5. **Auswirkung im Einsatz:** Der Teil „Entwicklung seit der letzten Besprechung“ im Lagevortrag entsteht aus dem Gedächtnis oder einer Papierliste. Bei einem echten Einsatz mit tausenden Ereignissen ist das 100-Zeilen-Fenster nach wenigen Minuten voll mit Nebenvorgängen.
6. **Empfehlung:** Zeitfilter „seit …“ (mit Schnellwahl „seit letzter Lagebesprechung“, wenn eine solche als Eintrag markiert ist), Filter nach Vorgangsart (Lage/Status/Kräfte vs. Logistik/Kosten/Verwaltung), Weiterblättern; im Ausdruck die beiden Zeiten getrennt wie in der Ansicht.
7. **Verifikation:** Filter „seit 20:45“ + Abschnitt EA Sielhafen zeigt genau Anlegen, zwei Verschiebungen, Statuswechsel, Auftrag; der Ausdruck hat getrennte Spalten „Erfasst“ und „Zeit der Meldung“.

### P1-4 · Keine Ausgabe für Lagevortrag oder Lagemeldung nach oben

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Aufgabe 3. Ausgaben (`15-ausgaben.png`, `39-ausgaben-oeffnen.png`).
3. **Beobachtung [beobachtet]:** Angeboten werden Druck, Status, Einheitenliste, Auswertung, Logistik, Führungsorganisation, Kosten, Anforderungen, Tagebuch, Funkplan, Papier-Vordruck, Oldenburger Block. Für die Lagebesprechung musste ich drei Dateien zusammensuchen: „Druck“ (Kräfte je Einsatzstelle mit Probe, gut), „Anforderungen“ (alle vier Vorgänge, unabhängig vom Zustand), „Tagebuch“ (alle 137 Einträge). Eine Ausgabe „Lage zum Zeitpunkt“ mit Schadenlage je Einsatzstelle, eigene Kräfte, offene Anforderungen, Änderungen seit Zeitpunkt, offene Fragen gibt es nicht; ebenso keine Lagemeldung an die übergeordnete Führungsstelle (die übergeordnete FüSt ist in den Stammdaten leer „—“, steht aber laut Handbuch auf jedem Ausdruck).
4. **Erwartung der Rolle:** Ein Knopf „Lagevortrag vorbereiten“ bzw. „Lagemeldung“, der die vorhandenen Bausteine auf einer Seite zusammenführt und den Zeitraum seit der letzten Besprechung nimmt. **[Annahme]** Gliederung des Lagevortrags nach der in der Führungsstelle üblichen Reihenfolge (Lage, eigene Kräfte, Entwicklung, offene Punkte); keine bestimmte Vorschrift unterstellt.
5. **Auswirkung im Einsatz:** Vor jeder Lagebesprechung schreibt S2 den Vortrag von Hand aus mehreren Ausdrucken zusammen; die Lagemeldung nach oben wird separat getippt — Doppelerfassung und Übertragungsfehler.
6. **Empfehlung:** Eine Ausgabe „Lage“ (HTML/PDF) mit Kopf (Einsatz, FüSt, Stand), Abschnitt für Abschnitt Lagestand (nach P1-2) und Kräfte, offene und zugesagte Anforderungen, Tagebuchauszug seit Zeitpunkt (nach P1-3).
7. **Verifikation:** Eine Seite für die Prüflage erzeugen und gegen Kopfband, Baum und Anforderungsblatt abgleichen; Zeitpunkt „seit“ wählbar.

### P2-1 · Zahlen je Abschnitt widersprechen sich zwischen Baum, Tabelle, Ausdrucken und Monitor

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Aufgabe 3. Lage, EA Deich Nord gewählt (`10-lage-ea-deich-nord.png`); `druck_*.html`, `fueorg_*.html`; Monitor Taste 5 (`33-monitor-taste5.png`).
3. **Beobachtung [beobachtet]:** Baum „EA Deich Nord 11 · 2/10/65 · +6 erwartet“ (mit UA Deichfuß, ohne Kennzeichnung); nach Klick darauf „Einheiten 8 in EA Deich Nord“, Ist-Stärke 1/6/32 = 39. Druck: EA Deich Nord 39, UA Deichfuß 38. Führungsorganisation-HTML: EA Deich Nord 77, „11 Einh.“. In der gegliederten Gesamtliste heißt die Zeile richtig „EA Deich Nord mit Unterabschnitten · 11 Einh.“ — im Baum fehlt dieser Zusatz. Monitor „Bereiche und Schichten“: Gesamt 293 neben Kopfband 264 (andere Zählregel, dort nicht genannt). Seit 29.10. bekannt (dort P1/P2), teilweise verbessert durch die Beschriftungen „Ist-Stärke / Erwartet / Alle erfassten Einheiten“ und den Knopf „Regel“.
4. **Erwartung der Rolle:** Für den Vortrag „Kräfte je Abschnitt“ eine Zahl je Abschnitt; wo eine Teilbaumsumme gemeint ist, steht das dran.
5. **Auswirkung im Einsatz:** In der Lagebesprechung werden für EA Deich Nord 39 und 77 Kräfte genannt, je nachdem, wer von welchem Blatt liest; Rückfragen kosten Zeit.
6. **Empfehlung:** Baum und Führungsorganisation-Ausdruck mit „inkl. Unterabschnitte“ beschriften oder beide Zahlen nennen; im Monitor die Zählregel in der Kopfzeile nennen.
7. **Verifikation:** Für EA Deich Nord nennen Baum, Tabelle, Druck und FüOrg dieselbe Zahl oder beschriften die Abweichung gleich.

### P2-2 · Anforderungen hängen nicht an einer Einsatzstelle

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Aufgabe 3. Eingang → Anforderungen (`18-anforderungen.png`). **[Code]** `apps/desktop/src/renderer/Anforderungsformular.tsx:99-130`.
3. **Beobachtung [beobachtet, Code]:** Die Liste hat die Spalten Zustand, Kennung, Angefordert, Ablösung für, Vorgesehen, Auftrag, Zusage; die Filterzeile zählt Offen 1, Zugesagt 1, Eingetroffen 1, Storniert 1 (gut). Die Maske fragt Kennung, Ablösung für, Vorgesehene Einheit, Vorgesehener Auftrag — **keine Einsatzstelle / kein Abschnitt**. Nur bei Ablösungen ergibt sich der Abschnitt mittelbar über die abzulösende Einheit.
4. **Erwartung der Rolle:** „Offene Anforderungen je Einsatzstelle“ für den Vortrag; die Sickerstelle an EA Deich Nord und die angeforderte 2. BGr gehören zusammen.
5. **Auswirkung im Einsatz:** Der Bezug Anforderung ↔ Einsatzstelle steht nur im Freitext „Auftrag“; Widersprüche (Anforderung für einen Abschnitt, der aufgelöst ist) fallen nicht auf.
6. **Empfehlung:** Zielabschnitt als Feld der Anforderung (vorbelegt aus der Ablösung) und als Spalte/Filter; im Baum je Abschnitt „n offen“.
7. **Verifikation:** Anforderung für EA Sielhafen anlegen → Filter auf EA Sielhafen zeigt sie; im Baum steht der Hinweis.

### P2-3 · Konflikthinweise sind von der Lage aus nicht auffindbar

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Statuszeile „⚠ 8 Konflikthinweise“ (`38-konflikthinweise.png`); Lage mit allen Spaltengruppen bei 2400 px (`40-alle-spalten.png`). **[Code]** `apps/desktop/src/renderer/Einheitenzelle.tsx:155`.
3. **Beobachtung [beobachtet]:** Die Erklärung sagt „Betroffene Felder tragen in der Tabelle ein ⚠“. Mit allen Spaltengruppen eingeschaltet trägt **keine** Zelle ein ⚠ (0 Treffer). Welche acht Angaben umstritten sind, sehe ich nicht. Seit 29.10. unverändert offen.
4. **Erwartung der Rolle:** Umstrittene Angaben sind für S2 „unbestätigt“ — genau die, die vor dem Vortrag geklärt werden müssen. Ein Klick auf den Hinweis führt zu den betroffenen Datensätzen.
5. **Auswirkung im Einsatz:** S2 trägt möglicherweise einen Wert vor, den ein anderer Arbeitsplatz anders erfasst hat, ohne es zu wissen.
6. **Empfehlung:** Liste der Hinweise mit Datensatz, Feld, beiden Werten und Sprung dorthin; wo der Datensatz nicht in der Tabelle steht (Anforderung, Dienstposten …), das ausdrücklich sagen.
7. **Verifikation:** Klick auf „8 Konflikthinweise“ zeigt acht Zeilen mit Ziel; jede führt an eine Stelle mit ⚠.

### P2-4 · Status und Verschiebung ohne Meldezeit und Quelle

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Aufgabe 4. Statuswechsel TZ THW Bereitstellung → Einsatz; Tagebuch (`37-eintrag-mit-zeit.png`).
3. **Beobachtung [beobachtet]:** Im Tagebuch stehen „Status gesetzt: Einsatzbereit → Einsatz“ und „Einheit verschoben: Bereitstellungsraum Hafen → EA Sielhafen“ mit Erfassungszeit und Akteur „S2 Lage“ — die Spalte „Zeit der Meldung“ bleibt leer, eine Quelle (wer hat gemeldet, auf welchem Weg) gibt es nicht. Beim Auftrag wird die fachliche Zeit gleich der Erfassungszeit gesetzt. Der Akteur ist der Bediener, nicht der Meldende.
4. **Erwartung der Rolle:** Zu jedem Stand „wann gemeldet, von wem“ — eine Statusmeldung um 20:30, eingetragen um 20:49, ist eine andere Information als eine um 20:49.
5. **Auswirkung im Einsatz:** Bei nachgetragenen Meldungen (Funkverkehr staut sich) ist der Zeitpunkt der Lage um die Bearbeitungszeit verschoben; die Herkunft ist nicht nachvollziehbar.
6. **Empfehlung:** Bei Status- und Bereichswechsel optional „gemeldet um“ und „Quelle“ (Funk, Telefon, Melder, vor Ort) mit Vorbelegung „jetzt / Funk“; im Tagebuch in den vorhandenen Spalten.
7. **Verifikation:** Statuswechsel mit „gemeldet 2030, Funk“ eintragen → Tagebuch zeigt 20:30 unter „Zeit der Meldung“ und die Quelle.

### P2-5 · Zeitangaben: Uhrzeit ohne Tag, „hhmm“ immer heute, ISO-Zeit im Ausdruck

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Funkplan/Spalte „Letzter Kontakt“ (`28-funkplan.png`); Zeitfeld des Tagebucheintrags; Ausdruck `anforderungen_2026-11-05_2046.html`. **[Code]** `apps/desktop/src/renderer/funkzeit.ts:23-33`, `packages/ausgaben/src/listen.ts:25`.
3. **Beobachtung:** **[beobachtet]** „Letzter Kontakt“ zeigt nur „2035 Meldung“ bzw. „2049 Meldung“ ohne Tag — bei mehrtägigen Lagen mehrdeutig. **[Code]** Eine Eingabe „2350“ wird immer als heute 23:50 gelesen; wer kurz nach Mitternacht eine Meldung von 23:50 nachträgt, erhält einen Zeitpunkt fast 24 Stunden in der Zukunft — **[nicht prüfbar]** an der Schale, weil die Uhr nicht verstellt wurde. Wegen P0-1 ist das Tippen der Zeit derzeit der einzige Weg, also trifft es jeden Nachtrag. **[beobachtet]** Im Anforderungen-Ausdruck steht die Zusage als „2026-09-08T16:00:00+02:00 / THW RB Oldenburg“, in der Ansicht dagegen „08.09.2026 14:00 · THW RB Oldenburg“. **[Annahme]** Die zwei Stunden Unterschied rühren von der UTC-Zeitzone des Prüfrechners her; im Betrieb mit deutscher Zeitzone stimmten die Uhrzeiten überein, das Rohformat im Ausdruck bleibt.
4. **Erwartung der Rolle:** Durchgängig „TT.MM. HH:MM“ (oder Datum-Zeit-Gruppe), Nachträge über Mitternacht werden dem Vortag zugeordnet oder nachgefragt.
5. **Auswirkung im Einsatz:** Falsch einsortierte Nachtmeldungen in der Rekonstruktion; Ausdrucke, die man erst übersetzen muss.
6. **Empfehlung:** Tag am „Letzten Kontakt“ ab dem Folgetag; Zeit in der Zukunft als Vortag deuten oder nachfragen; Zusage im Ausdruck wie in der Ansicht formatieren.
7. **Verifikation:** Uhr auf 00:10 stellen, „2350“ eintragen → 23:50 des Vortags; Ausdruck zeigt „08.09.2026 16:00“.

### P3-1 · Kein Profil für S2

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Einsatzauswahl → „Dieser Arbeitsplatz“ → Ändern (`02-arbeitsplatz.png`).
3. **Beobachtung [beobachtet]:** Profile: Führungsstelle (S1), Vermeldezentrale, Versorgung (S4), Alle Blätter. Für S2 habe ich „Alle Blätter“ gewählt, weil S2 Lage, Eingang, Funkplan (letzter Kontakt), Ausgaben und Tagebuch braucht. Das ist wegen „Mehr“ unkritisch, aber die Reiterleiste ist dann voll mit Kosten und Versorgung.
4. **Erwartung der Rolle:** Ein Zuschnitt „Lage (S2)“: Lage · Eingang · Einsatztagebuch · Ausgaben, Funkplan unter „Mehr“.
5. **Auswirkung im Einsatz:** Gering; ein paar Reiter mehr im Blick.
6. **Empfehlung:** Profil S2 ergänzen, sobald es lagespezifische Blätter gibt (P1-1, P1-2).
7. **Verifikation:** Profil wählbar, Reiter wie oben.

### P3-2 · Neue Einsatzstelle steht unter „Einsatz beendet“

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Aufgabe 4 (`23-sielhafen-mit-kraeften.png`).
3. **Beobachtung [beobachtet]:** „EA Sielhafen“ (Typ Einsatzort) erscheint im Baum als letzte Zeile unter „Angefordert / Anmarsch“ und „Einsatz beendet“, getrennt von den anderen Einsatzstellen; ebenso im Monitor nach EA Schule Mitte, im Druck als Nr. 9. Die Maske „Abschnitt anlegen“ fragt keinen übergeordneten Abschnitt; Unterabschnitte entstehen erst über „Umhängen“.
4. **Erwartung der Rolle:** Eine neue Einsatzstelle steht bei den Einsatzstellen.
5. **Auswirkung im Einsatz:** Beim schnellen Blick auf den Baum wird die neue Einsatzstelle übersehen oder für einen Sonderbereich gehalten.
6. **Empfehlung:** Neue Abschnitte nach dem letzten Abschnitt gleichen Typs einsortieren; optional „unter …“ in der Maske.
7. **Verifikation:** Neue Einsatzstelle steht direkt unter EA Reserve.

### P3-3 · Rohwerte und Widerspruch Status/Bereich weiterhin sichtbar

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** `fueorg_2026-11-05_2046.html`; Ausgaben-Auswahl „Davon Stärke der Organisation“; Führungsstelle → Schichtplan (`30-fuehrungsstelle.png`); Lage, Bereich „Angefordert / Anmarsch“.
3. **Beobachtung [beobachtet]:** Führungsorganisation-Ausdruck mit Typen „FUEHRUNGSSTELLE“, „EINSATZORT“, „ANGEFORDERT“; Organisationsauswahl „FEUERWEHR“, „BUNDESWEHR“ in Großbuchstaben; Schichtplan-Spalten „2026-09-08“. „Bergwacht (angefordert)“ steht mit Status „Rufbereitschaft“ im Bereich „Angefordert / Anmarsch“ ohne Hinweis. Alles seit 29.10. bekannt.
4. **Erwartung der Rolle:** Lesbare Begriffe; ein Status, der nicht zum Bereich passt, ist markiert.
5. **Auswirkung im Einsatz:** Kleine Lesehürden im Ausdruck für die Besprechung.
6. **Empfehlung:** Anzeigenamen statt Schlüssel; Hinweis bei Status-Bereich-Widerspruch.
7. **Verifikation:** Ausdruck zeigt „Einsatzort“, Schichtplan „08.09.2026“.

---

## Gegenüber dem Audit vom 29.10.2026

- **Behoben [beobachtet]:** Aufträge lassen sich erfassen („Auftrag erfassen“ an der gewählten Einheit, Ort aus dem Abschnitt vorbelegt) und stehen in Tabelle und Einheitenliste. Ablösungen sind an der Zeile markiert („BGr 1 Oldenburg — Ablösung angefordert“, „FGr Elektroversorgung — Ablösung zugesagt“). Ausgaben bieten „Öffnen“, „Herunterladen“, „Drucken“. Die Gesamtzahlen sind beschriftet (Ist-Stärke, Erwartet, Alle erfassten Einheiten, Beendet/Rückmarsch, Knopf „Regel“).
- **Weiter offen [beobachtet]:** Konflikthinweise ohne Ziel (P2-3), Teilbaumsummen ohne Beschriftung im Baum und Führungsorganisation (P2-1), Rohwerte im Ausdruck (P3-3), Status „Rufbereitschaft“ im Bereich Angefordert (P3-3).
- **Nicht erneut geprüft:** Stärke- und Zeitzellen (P0 vom 29.10., laut Commit behoben), „Eingetroffen“ legt Einheit an (laut Handbuch umgesetzt) — nicht Kern der S2-Aufgabe.

## Positives

Das Verschieben mehrerer Einheiten ist für S2 vorbildlich: Strg+Klick, Auswahlleiste mit „Verschieben Strg+M“, die Maske nennt je Einheit „(bisher Bereitstellungsraum Hafen)“, und der Baum zieht sofort nach. Jeder Schritt wird in der Statuszeile bestätigt („✓ Auftrag erfasst … · gespeichert“) und ist zurücknehmbar. Das Tagebuch trennt in der Ansicht „Erfasst“ und „Zeit der Meldung“ sauber und nennt Akteur und Rechner — das ist die richtige Grundlage für Nachvollziehbarkeit, auch wenn der Ausdruck es noch vermischt. „Auf die Auswahl beschränken“ liefert die Geschichte eines Abschnitts oder einer Einheit mit einem Klick. Der Druck „Stärke“ mit Spalte „Einsatzstelle“, Probe und Zeile „Erwartet“ ist als Kräfteteil des Lagevortrags direkt brauchbar. „Letzter Kontakt“ gibt je Einheit wenigstens das Alter der letzten Statusmeldung. Die Zustandsmarke „✓ aktuell“ und „Stand: vor n s“ sagen, ob dem Bild zu trauen ist.

---

## Abschluss

- **Aufgabe der Rolle geschafft:** mit Umwegen — eigene Kräfte ja, Schadenlage, Meldungseingang, Entwicklung und Lagevortrag nicht in der Software.
- **Nebenaufzeichnung auf Papier nötig:** ja — Lagekarte/Lagetafel je Einsatzstelle, Liste offener (nicht eingearbeiteter) Lagemeldungen, Notiz „Änderungen seit letzter Lagebesprechung“ und der Lagevortrag selbst.
- **Größte Lücke an einer Übergabe:** Eine eingehende Lagemeldung (von Fernmelder/Sichtung an S2) landet nur als Freitext im Tagebuch ohne Einsatzstelle und Zustand, sodass weder S2 nach Schichtwechsel noch S1/S3 erkennen, ob sie eingearbeitet oder in eine Anforderung umgesetzt ist.
- **Größtes Einsatzrisiko:** Der freie Tagebucheintrag — einziger Weg für eine Lagemeldung — scheitert in seiner Voreinstellung „leer = jetzt“ mit einer unverständlichen Programmmeldung, sodass Meldungen beim Abbrechen verloren gehen oder unbemerkt fehlen (P0-1).
- **Top-Priorität für die nächste Iteration:** P0-1 beheben (leere Zeit = jetzt, Meldung am Feld, Test), danach eine Lagemeldung mit Einsatzstelle und Zustand „offen/eingearbeitet“ (P1-1).
