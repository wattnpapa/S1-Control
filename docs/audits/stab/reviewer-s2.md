# Stab-Review: Sachgebiet S2 (Lage)

Datum: 2026-11-22 · laufende Web-Schale http://127.0.0.1:8790 · Playwright/Chromium, 1440 × 900 (Monitor und Lage zusätzlich 1920 × 1080), deviceScaleFactor 1.

Arbeitsplätze, je ein eigener Browser-Kontext:

| Kontext | Anzeigename | Profil | Stelle · Hz. |
|---|---|---|---|
| `s2` | Arbeitsplatz (Vorgabe) | Führungsstelle (S1) | S2 · Lg |
| `fg` | FüGeh S2 | Führungsstelle (S1) | S2 · Gh |
| `s3` | S3-Platz | Führungsstelle (S1) | S3 · Ei |
| `fmz` | FmZ-Platz 1 | Vermeldezentrale | Fm1 + Sichter · Fm |

Übungseinsatz: **„Review S2S3 Hochwasser Hameln“** (22.11.2026, FüSt THW Hameln, übergeordnet TEL Landkreis Hameln-Pyrmont, Beginn 14:00). Über die Oberfläche angelegt:

- 6 Abschnitte: Führungsstelle, EA 1 Deichverteidigung Nord, EA 2 Pumpen Altstadt, EA 3 Sandsackfüllplatz, BR Tündern, Angefordert / Anmarsch.
- 15 Einheiten (THW und Feuerwehr) mit Status Einsatz, Einsatzbereit, Ruhe, Nicht einsatzbereit und Anmarsch; eine Einheit von BR Tündern nach EA 2 verschoben.
- 13 Aufträge an Einheiten, einer davon erledigt.
- 4 Anforderungen, eine davon zugesagt.
- 13 Eingänge mit Aufnahmezeiten 14:35 bis 17:30: Lagemeldungen der EA, Deichläufer, Pegelprognose der TEL, Pumpenausfall, Sperrungen der Polizei, eine Blitz-Meldung „Evakuierung Pflegeheim“. Jeder Eingang lief über FmZ und Sichter.
- 6 Ausgänge des S3 (Aufträge, eine Anforderung an die TEL): angenommen, befördert und gesichtet.
- 3 Tagebucheinträge des S2 (zwei Lagebesprechungen, ein Lagebild).

Das Einsatzgeschehen von etwa 3,5 Stunden wurde in rund 20 Minuten Echtzeit nacherfasst, mit den Zeiten der Meldungen.

Belege liegen unter `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/s2s3/` (unten als `s2s3/NN-…png`), die Ausgaben unter `…/scratchpad/webdaten/share/einsaetze/2026-11-22_review-s2s3-hochwasser-hameln_9fa75a/ausgaben/`.

Kennzeichnung:

- **[beobachtet]**: in der laufenden App gesehen.
- **[Code]**: aus dem Quelltext gelesen.
- **[Annahme]**: S2-Arbeitsweise, die weder aus dem Programm noch aus dem Handbuch folgt. Das sind keine Vorschriften, sondern die übliche Praxis einer Führungsstelle.

Nicht geprüft: Erfassungsbögen, QR-Scan und EEB-Import. Das Paket `@bos/eeb-format` ist hier durch einen Platzhalter ersetzt. Dazu gibt es keine Befunde.

Abgrenzung: Die Befunde der Nachrichten-Audits (`docs/audits/nachrichten/README.md`, insbesondere SGL P2-9 und P2-13 sowie R2-ETB P2-6) werden hier nicht wiederholt. Wo eine fehlende Ansicht auf ihnen aufbaut, steht der Verweis.

## Urteil aus Sicht des S2

Für den S2 ist S1-Control heute ein **Nachrichten-Eingang mit roter Kopie, aber kein Lagewerkzeug**:

- Die rote Kopie kommt zuverlässig an: jede der 19 Nachrichten stand im Posteingang „S2“, Blitz und Sofort oben (`s2s3/23-s2-posteingang.png`).
- Das Tagebuch hält jede Meldung mit Zeit fest.
- Die Stärke je Abschnitt liegt als Monitor-Tafel und als Druck „für die Lagekarte“ vor.

Was der S2 eigentlich führt, gibt es in der App nicht: das **Lagebild** (Schadenslage je Abschnitt, Entwicklung, Prognose), die **Lagekarte** und eine **Grundlage für den Lagevortrag**. Der Code kennt dafür kein Datenfeld; es gibt weder Koordinaten noch Schadenskonten, Lagestände oder Pegelwerte [Code: `packages/domaene/src/zustand.ts`]. Die Programmtexte selbst sagen, die rote Kopie gehe „an S2 für Lagekarte und Einsatztagebuch“ [Code: `packages/domaene/src/akueli.ts:177`]. Mit der Kopie in der Hand muss der S2 dann aber aus der App heraus auf Papier, an das Whiteboard oder in ein anderes Programm.

Die Aufgabe „Lagebild führen und fortschreiben“ gelang nur über Freitext im Tagebuch. „Lagemeldungen auswerten“ hieß 19 Nachrichten einzeln öffnen, ohne Filter nach Abschnitt. Für den Lagevortrag hatte ich am Ende keine Seite, die ich hätte zeigen oder drucken können, außer der Stärke.

## Fehlende Ansichten

### FA-S2-1 · P1 · Lagebild je Einsatzabschnitt (Lagetafel)

**Was der S2 sehen und tun muss** [Annahme]:

- Je Einsatzabschnitt eine fortgeschriebene Kurzlage: Schadenslage, eingesetzte Kräfte, Gefahren, Schwerpunkt, „Stand hh:mm“.
- Dazu Einsatzweite Zeilen: Wetter, Pegel, Prognose, Sperrungen, Lage der Nachbarn.
- Fortschreiben heißt einen neuen Stand setzen, nicht überschreiben. Der vorige Stand bleibt nachvollziehbar.
- Aus einer Lagemeldung heraus soll „in Lagebild übernehmen“ mit Abschnittsbezug möglich sein.

**Was die App schon hat** [beobachtet/Code]:

- Den Abschnittsbaum mit Typ, Zeichen und Stärke je Abschnitt.
- `AbschnittZustand.bemerkung` [Code], das in der Oberfläche nirgends zu sehen ist.
- Den Nachrichtenbezug auf Abschnitt oder Einheit (`anschriftBezug`/`absenderBezug`, `renderer/nachrichtenbezug.ts`). Er entsteht nur, wenn Anschrift oder Absender **genau** dem Namen gleichen.
- Freie Tagebucheinträge mit Quelle „Lagebesprechung“ und Fachzeit.

**Wo es heute verstreut ist** [beobachtet]:

- Die Lage von EA 2 stand in den Eingängen E 2, E 9 und E 12, bei S4 im Eingang E 6, dazu im Tagebucheintrag „Lagebild 16:00“.
- Im Blatt S1 erscheint zu EA 2 nur Stärke und Status der Einheiten (`s2s3/33-s3-ea2-1920.png`).
- Eingänge mit Absender wie „EAL EA 2 / ZTr TZ Rinteln“ bekamen keinen Bezug. „In der Lage zeigen“ fehlte deshalb an allen 13 Eingängen (Lese-Ansicht E 9, `s2s3/25-s2-lesen.png`).

### FA-S2-2 · P1 · Auswertung der roten Kopien (Lagemeldungs-Journal)

**Was der S2 sehen und tun muss** [Annahme]:

- Alle Nachrichten mit roter Kopie **chronologisch nach Abfassungs- oder Aufnahmezeit**, mit dem Inhalt in der Zeile, nicht nur dem Betreff.
- Filter nach Abschnitt, Absender und Zeitraum.
- Ein Bearbeitungszustand, der nicht „erledigt“ heißt, sondern „ausgewertet / in Lagekarte / in Lagetafel“. Zwei Personen am S2-Tisch (S2 und Führungsgehilfe) müssen sehen, wer was nachgeführt hat.

**Was die App schon hat** [beobachtet]:

- Posteingang „S2“ mit roter Kopie, den Marken neu, gelesen und erledigt, Suche (Strg+F) sowie „Im Tagebuch zeigen“.
- Die Nachweisung, chronologisch nach Nummer, mit Verteiler in Worten.

**Wo es heute verstreut ist** [beobachtet]:

- Der Posteingang sortiert nach Vorrang, dann nach Nummer. A 14 und A 15 des S3 stehen dadurch zwischen E 7 und E 1 (`s2s3/23-s2-posteingang.png`).
- Die Liste zeigt keinen Inhalt; für die Pegelentwicklung musste ich E 1, E 4 und E 10 einzeln öffnen.
- Die Spalte „Anschrift“ trägt bei allen 13 Eingängen denselben Wert „FüSt THW Hameln“.
- Die Nachweisung ist chronologisch, zeigt aber ebenfalls keinen Inhalt und keinen Bearbeitungsstand.

### FA-S2-3 · P1 · Lagekarte (wenigstens Abschnitte und Einheiten mit Ort)

**Was der S2 sehen und tun muss** [Annahme]:

- Eine Karte oder ein Lageplan mit Einsatzabschnitten, Einheiten (taktische Zeichen), Schadensstellen und Sperrungen.
- Nachführen aus der Meldung heraus. In der Übung brauchte ich mindestens: Sickerstelle km 3,1, neue Sickerstelle km 1,6, Pflegeheim St. Elisabeth, Sperrung B83/Uferstraße, Pumpwerk Ostertor.
- Mindestens als Rückfallebene: die Lage nach Ort als Liste, die auf Papier an die analoge Lagekarte kommt.

**Was die App schon hat** [beobachtet/Code]:

- Taktische Zeichen für Abschnitte, Einheiten und Fahrzeuge (`taktischesZeichen`).
- Den Druck „Stärke je Bereich für die Lagekarte“ und die Führungsorganisation „Als PDF (Lagekarte)“.
- `UnterkunftZustand.ort` und `AusgabestelleZustand.ort` als Freitext.

Einheiten, Abschnitte und Nachrichten haben **kein Orts- oder Koordinatenfeld** [Code].

**Wo es heute verstreut ist** [beobachtet]: Orte stehen nur im Freitext der Nachrichten („Deich km 3,1“, „Bäckerstraße“, „Ostertorwall“) und in Auftragstexten der Einheiten.

### FA-S2-4 · P1 · Lagevortrag / Lagebesprechungsmappe

**Was der S2 sehen und tun muss** [Annahme]: Zur Lagebesprechung eine Seite (Bildschirm und Druck) „Lage zum Zeitpunkt X“ mit:

- allgemeiner Lage (Pegel, Prognose, Wetter),
- Lage je EA,
- eigenen Kräften (Stärke je EA),
- offenen Anforderungen,
- Schwerpunkten und Entscheidungsbedarf,
- Veränderung seit der letzten Lagebesprechung.

**Was die App schon hat** [beobachtet]:

- Exporte, Abschnitt „Lagebesprechung“: Druck (Stärke je Bereich), Status, Einheitenliste, Führungsorganisation (`s2s3/27-exporte.png`).
- Den Anforderungen-Export mit Notizspalte.
- Tagebucheinträge mit Quelle „Lagebesprechung“.
- Monitor-Tafeln 1 bis 9.

**Wo es heute verstreut ist** [beobachtet]: Der Export-Abschnitt heißt „Lagebesprechung“, enthält aber nur Stärke und Organisation. Die Lage selbst (Inhalte der Meldungen) steht in keiner Ausgabe. Die Lagebesprechungen 15:00 und 17:00 muss man im Tagebuch zwischen den FmZ-Vermerken suchen.

### FA-S2-5 · P2 · Lageentwicklung über die Zeit (Zeitleiste / Messwertverlauf)

**Was der S2 sehen und tun muss** [Annahme]:

- Eine Zeitleiste der lagerelevanten Ereignisse (Meldungen, Entscheidungen, Lagebesprechungen) ohne FmZ-Technik.
- Ein Verlauf führender Messwerte. In der Übung war das der Pegel: 6,12 m um 14:30, 6,28 m um 16:55, Scheitel 6,60 m gegen 04:00 als Prognose.

**Was die App schon hat** [beobachtet]: Das Tagebuch mit Fachzeit und Suche sowie den Filter „Nur Rücknahmen und Berichtigungen“.

**Wo es heute verstreut ist** [beobachtet]:

- Pegelwerte stehen in E 1, E 4, E 10 und im Tagebucheintrag 17:00.
- Im Tagebuch erzeugt eine Nachricht vier bis fünf Zeilen: aufgenommen, nachgewiesen, an den Sichter weitergegeben, gesichtet, Kenntnis. Dazu kommen Funkprobe-Zeilen („ZTr TZ Hameln: Funkprobe: Kontakt“). Das Blatt zeigt „100 von 173 Einträgen“. Von diesen 100 waren 78 Nachrichtenvermerke und 9 Funkproben (`s2s3/26-tagebuch.png`). Die Einträge vor 15:55 fielen schon aus der Anzeige, nach weniger als vier Stunden Einsatz.
- Einen Filter „nur Lage“ oder „ohne Fernmeldevermerke“ gibt es nicht.

### FA-S2-6 · P2 · Lage-Monitor (Wandansicht Lage statt nur Stärke)

**Was der S2 sehen und tun muss** [Annahme]: Auf dem Wandmonitor der Führungsstelle sollen neben der Stärke auch Kurzlage je EA, letzte Lagemeldung je EA mit Alter, offene Blitz- und Sofort-Meldungen und die nächste Lagebesprechung stehen.

**Was die App schon hat** [beobachtet]: Neun Monitor-Tafeln (`s2s3/30-monitor-1.png` bis `-9.png`): Stärke, Verpflegung, Nächste 24 h, Unterbringung, Bereiche · Schichten, Funkplan, Abschnitte, Organisationen und Abschnitt × Organisation.

**Wo es heute verstreut ist** [beobachtet]: Keine Tafel zeigt etwas aus Nachrichten oder Tagebuch. Vier der neun Tafeln gehören dem S4.

## Befunde an vorhandenen Ansichten

### B-S2-1 · P1 · Eingänge bekommen fast nie einen Lagebezug

**Beobachtung** [beobachtet/Code]:

- Der Bezug entsteht nur bei exakter Namensgleichheit von Anschrift oder Absender mit einer Einheit oder einem Abschnitt (`nachrichtenbezug.ts`, `bezugAus`).
- Ein Eingang trägt als Absender, was auf dem Spruch steht („EAL EA 1 / ZTr TZ Hameln“, „PI Hameln-Pyrmont“), und als Anschrift die eigene FüSt. Keiner der 13 Eingänge bekam einen Bezug.
- Die Ausgänge des S3 an eine Einheit bekamen ihn („In der Lage zeigen (Anschrift)“, `s2s3/32-in-der-lage-zeigen.png`).

**Auswirkung**: Gerade die Lagemeldungen, die der S2 auswerten muss, lassen sich keinem Abschnitt zuordnen. Jede Abschnittssicht (FA-S2-1, FA-S2-2) hätte für Eingänge keine Daten.

**Empfehlung**: Den Lagebezug beim Sichten oder Auswerten ausdrücklich wählbar machen (Abschnitt/Einheit), unabhängig vom Absendertext. Mehrfachbezug erlauben.

**Verifikation**: Eingang mit Absender „EAL EA 2 / ZTr TZ Rinteln“ aufnehmen, beim Sichten EA 2 zuordnen. Die Lese-Ansicht zeigt dann „In der Lage zeigen“, und ein Abschnittsfilter findet die Nachricht.

### B-S2-2 · P2 · S2 und Führungsgehilfe teilen „gelesen/erledigt“ – kein „ausgewertet“

**Beobachtung** [beobachtet]:

- S2 (Lg) öffnete E 9. Der zweite S2-Platz (Gh) sah E 9 danach als „gelesen“ (`s2s3/31-fg-posteingang.png`).
- Gh setzte E 8, E 10 und E 13 auf „Erledigt“, ohne sie zu öffnen. Die Liste zeigt „gelesen erledigt“, aber nicht, wer es war.
- Das deckt sich mit dem Handbuch („Gelesen und erledigt gelten je Stelle, nicht je Person“).

**Auswirkung**: Am S2-Tisch lässt sich die Arbeit nicht aufteilen und nicht nachweisen, ob eine Meldung in Lagekarte oder Lagetafel eingearbeitet ist. „Erledigt“ ohne Lesen setzt zudem „gelesen“.

**Empfehlung**: Für die rote Kopie einen eigenen Auswertungsvermerk mit Handzeichen und Zeit (z. B. „in Lage übernommen · Gh 1748“) und einen Filter darauf. „Erledigt“ ohne vorheriges Öffnen nicht als „gelesen“ werten oder das sichtbar unterscheiden. (Nicht identisch mit SGL P2-13: dort fehlt ein Vermerk beim Erledigen der grünen Kopie.)

**Verifikation**: Zwei S2-Plätze. Platz A wertet E 1 aus, Platz B sieht „ausgewertet · A“, und der Filter „nicht ausgewertet“ zeigt E 1 nicht mehr.

### B-S2-3 · P2 · Tagebuch sortiert nach Erfassungszeit, nicht nach Fachzeit

**Beobachtung** [beobachtet]: Die Einträge „Lagebesprechung 1“ (Fachzeit 15:00) und „Lagebild 16:00“ wurden um 17:44 erfasst. Sie stehen oben, vor den Meldungen von 17:32 (`s2s3/28-tagebuch-suche-lage.png`). Eine Sortierung nach der Spalte „Fachzeit“ bietet die Tabelle nicht an.

**Auswirkung**: Für die Lageentwicklung ist die Reihenfolge der Ereignisse maßgeblich. Nachgetragene Lagebesprechungen und Papiermeldungen stehen an der falschen Stelle.

**Empfehlung**: Sortierung umschaltbar machen („nach Fachzeit“ / „nach Erfassung“), für die Auswertung mit Fachzeit als Vorgabe.

**Verifikation**: Eintrag mit Zeit 1500 nachtragen. In der Sortierung nach Fachzeit steht er zwischen den Meldungen von 14:50 und 15:10.

### B-S2-4 · P2 · Tagebucheintrag des S2 trägt weder Stelle noch Handzeichen

**Beobachtung** [beobachtet]: Am Platz mit Stelle S2 und Hz. „Lg“ erscheinen eigene Tagebucheinträge mit Akteur „Arbeitsplatz“ (dem Anzeigenamen). Die Kenntnisnahme einer Nachricht am selben Platz steht als „S2 · Lg“ (Zeilen 166 und 167 bis 169, `s2s3/26-tagebuch.png`, `s2s3/28-tagebuch-suche-lage.png`).

**Auswirkung**: Im ausgedruckten Einsatztagebuch ist nicht erkennbar, dass die Lagebewertung vom S2 stammt.

**Empfehlung**: Eigene Einträge mit Stelle und Handzeichen der Sitzung zeichnen, wie bei Nachrichten.

**Verifikation**: Platz mit S2/Lg schreibt „Lagebild 18:00“. Die Spalte Akteur zeigt „S2 · Lg“.

### B-S2-5 · P2 · Tagebuch ohne Filter „ohne Fernmeldevermerke“

**Beobachtung** [beobachtet]: Siehe FA-S2-5. Jede Nachricht erzeugt bis zu fünf Zeilen, dazu Funkprobe-Zeilen. Die Suche „Lage“ findet zwar die Lagebesprechungen, aber auch alle Vermerke zu „Lagemeldung EA 1/2“.

**Auswirkung**: Die Auswertung der Lageentwicklung aus dem Tagebuch kostet Zeit; Entscheidungen der Lagebesprechung gehen unter.

**Empfehlung**: Filterchips nach Art (Nachricht verteilt / FmZ-Vermerk / eigener Eintrag / Lage-Änderung / Funk).

**Verifikation**: Den Filter „eigene Einträge + verteilte Nachrichten“ setzen. Statt 173 Zeilen bleiben etwa 25.

### B-S2-5a · P2 · Tagebuch zeigt nur die letzten 100 Einträge

**Beobachtung** [beobachtet]:

- Nach knapp vier Stunden Übung stand am Fuß „100 von 173 Einträgen“.
- Die ältesten Einträge (Anlage der Abschnitte, erste Lagemeldungen, Lagebesprechung 1 nur dank Erfassungszeit) waren in der Ansicht nicht mehr zu sehen.
- Ein Knopf zum Nachladen war im Text des Blatts nicht zu finden.
- Laut Code zeigt die Liste höchstens die neuesten 100 Treffer (`renderer/Tagebuch.tsx`, `NACHRICHT_SEITE = 100`). Ältere Einträge erreicht man nur, indem man mit Suche oder Filter die Treffermenge verkleinert [Code].

**Auswirkung**: Die Entwicklung seit Einsatzbeginn ist am Bildschirm nicht durchlesbar; für den S2 ist das die Hauptquelle der Lageentwicklung.

**Empfehlung**: Nachladen oder Blättern sichtbar anbieten, dazu einen Zeitraumfilter.

**Verifikation**: Bei mehr als 100 Einträgen sind die ersten Einträge des Einsatzes erreichbar.

### B-S2-6 · P3 · Posteingangsliste zeigt für die Auswertung die falschen Spalten

**Beobachtung** [beobachtet]: Spalten: Kopie, Marken, Vorrang, E/A, Nr., Absender, Anschrift, Abfassungszeit und Betreff. Die Anschrift ist bei allen Eingängen gleich, ein Inhaltsauszug fehlt (`s2s3/23-s2-posteingang.png`).

**Auswirkung**: Der S2 öffnet jede Meldung, um zu entscheiden, ob sie lagerelevant ist.

**Empfehlung**: Für die rote Kopie eine Spaltenwahl mit Inhaltsanfang statt Anschrift.

**Verifikation**: In der Zeile E 10 ist „Quellkade km 3,1 steht …“ ohne Öffnen lesbar.

### B-S2-7 · P3 · Keine Stelle S5; „Posteingang von“ und Stellenwahl ohne S5

**Beobachtung** [beobachtet]: Die Stellenabfrage bietet Leiter, S1 bis S4, S6, Fachberater und Verbindungsstelle, ebenso das Verteilerraster des Sichters. S5 fehlt. Der Auftrag nennt S1 bis S6. Für den S2 ist das relevant, weil Lage-Informationen für Presse und Bevölkerung (S5) ohne Kopie an S5 nicht verteilt werden können.

**Auswirkung**: Eine Lageinformation „an S5“ geht nur über „Weitere Stelle“ als Freitext.

**Empfehlung**: Mit dem Bearbeiter des S5-Reviews abgleichen; falls S5 gewollt fehlt, im Handbuch begründen.

**Verifikation**: Die Stellenabfrage zeigt S5, und der Sichter kann S5 blau setzen.

## Schluss

- **Aufgabe geschafft:** mit Umwegen. Das Lagebild war nur als Freitext im Tagebuch zu führen, die Meldungen nur einzeln auszuwerten. Lagekarte und Lagevortrag waren in der App nicht möglich.
- **Größtes Risiko:** Lagemeldungen kommen digital beim S2 an, die Lage selbst wird aber außerhalb der App geführt (Papier, Whiteboard, anderes Programm). Ob eine Meldung dort eingearbeitet ist, ist in der App nicht nachweisbar (B-S2-2). Bei Ablösung am S2-Tisch geht das verloren.
- **Top-Priorität:** FA-S2-1 (Lagebild je Abschnitt mit Fortschreibung) zusammen mit B-S2-1 (Lagebezug beim Sichten). Beides schafft die Datenbasis, auf der Journal, Lagevortrag und Lage-Monitor aufsetzen können.
