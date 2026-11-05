# THW-Rollen-Audit: Führer des Einsatztagebuchs (ETB-Führer)

- **Datum:** 05.11.2026
- **Rolle:** Führer des Einsatztagebuchs in der Führungsstelle (Arbeitsplatz „ETB Krüger“, Profil „Führungsstelle (S1)“); zweiter Arbeitsplatz „Lage Meier“ als S1-Lage am selben Einsatz.
- **Material:** Laufende Web-Schale (Stand HEAD `ffc3125`) mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten), zwei Browserkontexte als zwei Arbeitsplätze, alle fünf Prüfaufgaben real durchgespielt einschließlich Einsatz beenden, wiedereröffnen, archivieren und Einsatzakte erzeugen. Erzeugte Ausgaben (`tagebuch_*.html`, Einsatzakte-ZIP) geöffnet und als Druck gerendert. Aufnahmen: `/tmp/claude-0/-home-user-S1-Control/5e4b7d40-2c4b-58c0-a32e-96410bb256d6/scratchpad/shots/etb/` (01–41). Quelltext lesend als Beleg: `apps/desktop/src/renderer/{Tagebuch,TagebuchEintrag,Ruecknahme,Anlegeversuch,Einsatzabschlussmasken}.tsx`, `packages/domaene/src/projektion/tagebuch.ts`, `packages/domaene/src/katalog/schemata.ts`, `packages/ausgaben/src/listen.ts`, `apps/desktop/src/worker/listenausgaben.ts`, `packages/speicher/src/aktenarchiv.ts`. Hintergrund: `docs/v2/HANDBUCH.md`, `docs/audits/v2-2026-10-29/`.
- **Kennzeichnung:** **[beobachtet]** an der laufenden App gesehen · **[Code]** aus dem Quelltext belegt · **[Annahme]** nicht gesicherte Ablauf- oder Vorschriftsannahme · **[nicht prüfbar]** in dieser Umgebung nicht prüfbar.

---

## Urteil

Das Tagebuch ist in seinem Kern das, was ich von einem ETB erwarte: Jede Änderung, die irgendein Arbeitsplatz in der Lage macht, steht ohne mein Zutun mit Erfassungszeit, Bearbeiter und Rechner darin, in Klartext mit „vorher → nachher“ (Status, Stärke, Verschieben, Funkprobe, Einsatz beendet/wiedereröffnet/archiviert). Gelöscht wird nichts; Rücknahmen stehen als eigene, markierte Zeile. Der Ausdruck hat Seitenzahl und Stand, die Einsatzakte trägt Ereignisse und Prüfsummen. Das ist deutlich mehr, als ein Papier-ETB von selbst leistet.

Reibung entsteht genau an den Stellen, die das ETB ausmachen: **(1)** Der freie Eintrag mit der Vorgabe „leer = jetzt“ scheitert jedes Mal mit einer technischen Fehlermeldung – nur wer die Uhrzeit selbst eintippt, kommt durch. **(2)** Einen Eintrag **berichtigen** kann ich nicht: Es gibt keinen Weg, eine Berichtigung mit Bezug auf den Ursprungseintrag zu schreiben, und meine eigenen freien Einträge kann ich nicht einmal zurücknehmen. **(3)** Im Ausdruck und damit in der Einsatzakte verschwinden die Rücknahme-Kennzeichnung, die zweite Zeitspalte und der Rechner; eine Rücknahme sieht dort aus wie ein gewöhnlicher Statuswechsel. **(4)** Die Ansicht zeigt nur die neuesten 100 Einträge, ohne Weiterblättern und ohne Zeitraumfilter.

Ohne Nebenaufzeichnung schaffe ich die Rolle derzeit **nicht ganz**: Berichtigungen und Statuszeiten vom Funk führe ich als Freitext bzw. auf dem Meldeblock weiter.

---

## Findings

### P0-1 — Freier Eintrag „leer = jetzt“ wird nie gespeichert

1. **Priorität:** P0
2. **Fundstelle / Aufgabe:** Einsatztagebuch → „Eintrag hinzufügen“, Feld „Zeit der Meldung“ leer lassen (Platzhalter „leer = jetzt, sonst z. B. 0630“) → „Eintrag speichern“. Aufnahmen `08-fehleintrag.png`, `22-A-eintrag-ohne-zeit-fehler.png`. Code: `apps/desktop/src/renderer/TagebuchEintrag.tsx:46-47` zusammen mit `apps/desktop/src/renderer/Anlegeversuch.tsx:73-76`.
3. **Beobachtung [beobachtet]:** Zweimal reproduziert, an frischer Maske und nach einem vorherigen Eintrag: Die Maske bleibt offen und meldet „Nicht gespeichert – Die Nutzlast für EtbEintragErfasst ist nicht gültig: zeitpunkt — Invalid ISO datetime“. Mit eingetippter Uhrzeit („20:46“, „0630“) geht derselbe Eintrag durch. **[Code]** `kennung()` hält je Maske genau einen Wert fest; der zweite Aufruf für die Zeit bekommt deshalb die Eintragskennung „ETB-…“ statt der Uhrzeit zurück. Der vorhandene Test prüft nur den Weg mit Uhrzeit (`Tagebuch.test.tsx:126`).
4. **Erwartung der Rolle:** Der häufigste Eintrag – „gerade kam per Funk …“ – geht mit Text und Enter durch und bekommt die aktuelle Uhrzeit.
5. **Auswirkung im Einsatz:** Unter Zeitdruck ist der Standardweg blockiert, die Meldung ist auf Englisch und technisch. Wer „Abbrechen“ drückt, um es später zu versuchen, hat die Meldung nicht im ETB; sie lebt dann nur noch auf dem Meldeblock. Das trifft jeden Arbeitsplatz (beobachtet auch bei „Lage Meier“, der den Eintrag nur mit Uhrzeit speichern konnte).
6. **Empfehlung:** Leere Zeit muss als „jetzt“ gespeichert werden; Fehlermeldungen der Maske in Nutzersprache („Eintrag nicht gespeichert: Zeit nicht lesbar“) statt Ereignisname und Schema-Text.
7. **Verifikation:** Neue Maske, nur Text, Enter → Zeile steht oben mit „Zeit der Meldung“ = Erfassungsminute. Zweiter Eintrag in derselben Sitzung ebenso. Regressionstest für den Leerweg.

### P1-1 — Kein Berichtigungsweg; eigene freie Einträge nicht korrigierbar

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Prüfaufgabe 2. Einsatztagebuch, Zeile „Funk: BGr 1 Oldenburg meldet … 12 Helfer“ (absichtlich falsch). Aufnahmen `09-rechtsklick.png`, `23-A-berichtigung-frei.png`, `24-A-nur-berichtigungen.png`. Code: `EtbEintragBerichtigt` und `korrekturVon` sind im Katalog (`packages/domaene/src/katalog/schemata.ts:477-482`) und in der Anzeige (`Tagebuch.tsx:187-191`) vorgesehen, werden aber von keiner Maske geschrieben (Suche nach `EtbEintragBerichtigt`/`korrekturVon` im Renderer: nur Anzeige).
3. **Beobachtung [beobachtet]:** Doppelklick und Rechtsklick auf die Tagebuchzeile tun nichts. „Rückgängig“ zeigt direkt nach meinem freien Eintrag „nichts zurückzunehmen“ – freie Einträge stehen nicht im Rücknahmeverlauf. Der einzige Weg war ein zweiter Freitext „BERICHTIGUNG zum Funkeintrag … richtig 9 Helfer“. Er steht als gewöhnlicher „Tagebucheintrag: Sonstiges“, ohne Marke, ohne Bezug; der Schalter „Nur Rücknahmen und Berichtigungen“ findet danach **0 von 138 Einträgen**. Für Lage-Änderungen gilt weiterhin: Rückgängig nur für den eigenen letzten Schritt und nur bis zum Neuladen (`Ruecknahme.tsx:28-30`), eine fremde oder ältere Zeile ist nicht berichtigbar – das Audit vom 29.10. (Error-Recovery F2, „Berichtigen“-Weg je Zeile) ist insoweit **offen**.
4. **Erwartung der Rolle:** An jeder Tagebuchzeile „Berichtigen …“: neuer Text oder Wert, Pflichtgrund, die Berichtigung steht als eigene Zeile mit Verweis „berichtigt Eintrag von 20:50 (ETB Krüger)“, die Ursprungszeile bleibt stehen und zeigt „berichtigt um 20:51“.
5. **Auswirkung im Einsatz:** Falsche Einträge bleiben formal unberichtigt; wer später liest, muss selbst erraten, welcher Freitext welchen Eintrag meint. Für Abrechnung oder Rechtsfragen ist die Korrekturkette nicht nachweisbar. Der Filter, der genau das zeigen soll, ist für freie Einträge immer leer.
6. **Empfehlung:** Berichtigung als Zeilenaktion im Tagebuch (für freie Einträge und für Lage-Ereignisse), unabhängig von „eigen/fremd“ und von der Sitzung; Ursprung und Berichtigung gegenseitig sichtbar verknüpft. Begriffe vereinheitlichen: „Rückgängig“ (letzter eigener Schritt) vs. „Berichtigung“ (jede Zeile, mit Grund).
7. **Verifikation:** Fremde Zeile von vor 30 Minuten berichtigen, Fenster neu laden; beide Zeilen stehen, verknüpft, im Filter „Nur Rücknahmen und Berichtigungen“ und im Ausdruck.

### P1-2 — Ausdruck und Einsatzakte verlieren Rücknahme-Marke, zweite Zeit und Rechner

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Prüfaufgabe 5. Ausgaben → „Tagebuch als HTML“, Datei `ausgaben/tagebuch_2026-11-05_2051.html` und dieselbe Seite in der Einsatzakte; gerendert und gedruckt (8 Seiten). Aufnahmen `27-tagebuch-html-oben.png`, `28-tagebuch-html-ganz.png`. Code: `packages/ausgaben/src/listen.ts:79-88`.
3. **Beobachtung [beobachtet]:**
   - Eine Rücknahme erscheint im Ausdruck als „BGr 2 Oldenburg: Status gesetzt: Rückmarsch → Einsatz“ bzw. „FGr Wasserschaden: Einheit wiederhergestellt“ – ohne „Rücknahme“, ohne Bezug. Am Bildschirm stand dieselbe Zeile mit Marke.
   - Nur **eine** Spalte „Zeit“, gefüllt mit der Meldungszeit, sonst der Erfassungszeit, ohne Kennzeichnung welche. Ergebnis: Die Folge lautet „20:35 … 20:33 (Lagebesprechung) … 20:46 … 20:48 … 20:49 … 20:46 (Polizei) … 20:49“ – die Reihenfolge springt, ein Nachtrag ist nicht als Nachtrag erkennbar. Nur Minuten, keine Sekunden.
   - Kein „Rechner“, keine laufende Nummer; Spalten „Zeit“ und „Wer“ so schmal, dass „Prüfla ge“ und „05.11.202 6 20:35“ umbrechen; die breite Spalte „Notiz“ bleibt leer.
   - Kopf mit technischen Bezeichnern: „2026-09-08_uebung-weser-ems_227e68“, „@bos/eeb-format 0.0.0“.
4. **Erwartung der Rolle:** Der Ausdruck ist das prüffähige ETB: lfd. Nr., Erfassungszeit **und** Ereigniszeit getrennt, Bearbeiter und Platz, Rücknahme/Berichtigung erkennbar mit Verweis auf die Ursprungsnummer, Kopf ohne interne Kennungen. **[Annahme]** Ein Papier-ETB-Vordruck führt mindestens eine laufende Nummer und eine Uhrzeit je Eintrag; die genaue Spaltenfolge des THW-Vordrucks wird hier nicht behauptet.
5. **Auswirkung im Einsatz:** In der Akte – also dem, was nach dem Einsatz für Abrechnung und Rechtsfragen bleibt – ist eine zurückgenommene Fehlbuchung von einer echten Statusänderung nicht zu unterscheiden, und nachgetragene Meldungen stehen mit einer Zeit, die älter ist als die Zeile davor, ohne Erklärung. Die Bildschirmansicht ist genauer als die Akte.
6. **Empfehlung:** Ausdruck mit denselben Informationen wie die Ansicht: lfd. Nr., „Erfasst“ und „Zeit der Meldung“, Bearbeiter/Platz, Marke „Rücknahme von Nr. …“ / „Berichtigung von Nr. …“; Spaltenbreiten so, dass Zeit und Name nicht umbrechen; Kopf mit Einsatzname, Zeitraum und Stand statt interner Kennungen.
7. **Verifikation:** Status setzen und zurücknehmen, Lagebesprechung mit Zeit −10 min eintragen, Tagebuch drucken: Rücknahme als solche mit Bezugsnummer erkennbar, beide Zeiten getrennt, keine umbrochenen Zeiten/Namen.

### P1-3 — Nur die neuesten 100 Zeilen, kein Zeitraumfilter, Einheitenfilter übersieht freie Einträge

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Prüfaufgabe 3 („alle Einträge zu BGr 1 Oldenburg zwischen 20:40 und 20:55“). Aufnahmen `20-A-tagebuch-einheit.png`, `25-A-tagebuch-einheit.png`, `21-A-suche-bgr1.png`, `38-A-tagebuch-ende-liste.png`. Code: `laden.ts:72` (`SEITE = 100`), `Tagebuch.tsx` (kein Nachladen), `packages/domaene/src/projektion/tagebuch.ts:614-634` (Filter nur Einheit, Abschnitt, Text, Rücknahmen), `TagebuchEintrag.tsx:47-50` (freier Eintrag ohne `bezug`, obwohl `schemata.ts:464-474` ihn vorsieht).
3. **Beobachtung [beobachtet]:**
   - Fußzeile „100 von 143 Einträgen“; Scrollen ans Ende lädt nichts nach, es gibt keinen Knopf „ältere“. Die ersten 43 Zeilen – darunter „Einsatz angelegt“ und die Anlage aller Abschnitte – sind in der Ansicht nicht erreichbar, nur im Ausdruck.
   - Es gibt keinen Zeitraumfilter; die Suche nach „20:4“ findet 0 Einträge, weil die Zeit nicht durchsucht wird.
   - „Im Tagebuch zeigen“ an BGr 1 Oldenburg liefert 11 Einträge (Status, Stärke, Verschieben, Funkprobe, Anforderung – gut), aber **nicht** die beiden Funk-Freitexte zu BGr 1. Erst die Textsuche „BGr 1“ findet 13 Einträge.
4. **Erwartung der Rolle:** Filter nach Zeitraum (von–bis), Einheit, Abschnitt und Art, kombinierbar, Chronologie bleibt erhalten; vollständiges Blättern bis zum ersten Eintrag; freie Einträge lassen sich einer Einheit/einem Abschnitt zuordnen.
5. **Auswirkung im Einsatz:** Nachfrage „Was war mit BGr 1 zwischen 18 und 20 Uhr?“ ist am Bildschirm nur durch Kombination von Einheitenfilter, Textsuche und Mitzählen der Uhrzeiten zu beantworten; bei 50.000 Ereignissen (laut Kopfkommentar `Tagebuch.tsx`) ist jede Zeile außerhalb der neuesten 100 nur noch über den Ausdruck erreichbar.
6. **Empfehlung:** Weiterblättern/Nachladen bis zum Anfang; Zeitraumfilter; Filter nach Art (frei, Status, Stärke, Anforderung, Funk, Einsatz); in der Maske „Eintrag hinzufügen“ optional Einheit/Abschnitt als Bezug, vorbelegt mit der Auswahl.
7. **Verifikation:** Einheit + Zeitraum 20:40–20:55 → genau Status, Stärke, Verschieben, Funkprobe und die beiden Funk-Freitexte. Ansicht ohne Filter bis „Einsatz angelegt“ durchblätterbar.

### P1-4 — Statuswechsel ohne Ereigniszeit (offen aus dem Audit vom 29.10.)

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Prüfaufgabe 4, Arbeitsplatz „Lage Meier“: Status BGr 1 Oldenburg Einsatz → Ruhe über die Statuszelle. Aufnahme `13-B-status.png`, `19-A-tagebuch-nach-B.png`. Code: `StatusGesetzt` kennt `ereignisZeit` (`schemata.ts:187`), keine Maske im Renderer setzt sie.
3. **Beobachtung [beobachtet]:** Die Statuszelle bietet nur Auswahl + „Übernehmen“. Im Tagebuch bleibt „Zeit der Meldung“ für Status, Stärke und Verschieben leer; nur Funkprobe, freie Einträge, Anforderungen und Einsatzende tragen eine Ereigniszeit.
4. **Erwartung der Rolle:** Eine Statusmeldung vom Funk oder vom Meldeblock wird mit der Uhrzeit eingetragen, zu der sie gemeldet wurde, nicht zu der sie getippt wurde.
5. **Auswirkung im Einsatz:** Nachgetragene Statuswechsel stehen mit der Tippzeit im ETB; die echte Zeit führe ich auf Papier weiter oder als zusätzlichen Freitext – also doppelt.
6. **Empfehlung:** Beim Statuswechsel optional eine Meldezeit (vorbelegt „jetzt“, gleiche Schreibweisen wie im ETB-Feld), im Tagebuch und im Ausdruck in der Spalte „Zeit der Meldung“.
7. **Verifikation:** Status mit Meldezeit „2010“ setzen → Tagebuch zeigt Erfasst 20:46, Zeit der Meldung 20:10; Ausdruck ebenso getrennt.

### P2-1 — Bearbeiter und Arbeitsplatz nicht verlässlich erkennbar

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Prüfaufgabe 4; Einsatzauswahl → „Dieser Arbeitsplatz“ → „Ändern“ → „Anzeigename“. Aufnahmen `02-profil.png`, `40-ruecknahme-im-tagebuch.png`.
3. **Beobachtung [beobachtet]:** Ohne eigene Eingabe schreibt ein Platz als Akteur „Arbeitsplatz“; das Öffnen des Einsatzes fragt nicht nach einem Namen. Der Anzeigename ist frei und jederzeit änderbar. In der Web-Schale steht bei beiden Arbeitsplätzen als Rechner „vm“, sie sind nur über den getippten Namen unterscheidbar. **[nicht prüfbar]** In der Desktop-App mit getrennten Rechnern dürfte „Rechner“ unterscheiden.
4. **Erwartung der Rolle:** Jeder Eintrag nennt eindeutig, wer (Person/Funktion) und an welchem Platz; Schichtwechsel am selben Platz wird sichtbar.
5. **Auswirkung im Einsatz:** Zeilen „Arbeitsplatz · vm“ lassen sich im Nachhinein keiner Person zuordnen; bei Rückfragen fehlt der Ansprechpartner.
6. **Empfehlung:** Beim Öffnen eines Einsatzes einen Namen/Funktion verlangen, wenn noch „Arbeitsplatz“ eingestellt ist; Namenswechsel selbst ins Tagebuch („Bearbeiter am Platz X: Krüger → Weber“); in der Web-Schale eine unterscheidbare Platzkennung.
7. **Verifikation:** Neuer Arbeitsplatz ohne Namen öffnet den Einsatz → Rückfrage; Namenswechsel steht im Tagebuch.

### P2-2 — Rücknahme verweist nur per interner Kennung auf den Ursprung

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Einsatztagebuch nach „Rückgängig“ eines Statuswechsels und eines Entfernens. Aufnahmen `40-ruecknahme-im-tagebuch.png`, `41-nur-ruecknahmen.png`. Code: `Tagebuch.tsx:182`.
3. **Beobachtung [beobachtet]:** Die Marke „Rücknahme“ ist gut sichtbar, der Bezug steht nur im Tooltip: „nimmt dc970d6d210a4fadb2b6780ea7a16bcf:3 zurück“. Im Filter „Nur Rücknahmen und Berichtigungen“ verschwindet die Ursprungszeile, man sieht nur die Rücknahme.
4. **Erwartung der Rolle:** „nimmt zurück: Status gesetzt 20:55:45 (Arbeitsplatz)“ in Klartext, im Filter beide Zeilen als Paar.
5. **Auswirkung im Einsatz:** Bei mehreren gleichartigen Änderungen ist nicht erkennbar, welche zurückgenommen wurde.
6. **Empfehlung:** Bezug in Klartext (Zeit, Vorgang, Bearbeiter) an der Rücknahmezeile; Klick springt zur Ursprungszeile; Filter zeigt Paare.
7. **Verifikation:** Zwei Statuswechsel derselben Einheit, den zweiten zurücknehmen → Rücknahmezeile nennt Zeit und Inhalt des zweiten.

### P2-3 — Ereigniszeit ohne Plausibilitätsprüfung, Nachträge unmarkiert

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Prüfaufgabe 1, Feld „Zeit der Meldung“. Aufnahme `06-eintrag-ausgefuellt.png`, `07-nach-eintrag.png`.
3. **Beobachtung [beobachtet]:** „2033“ (−10 min) wurde korrekt als „05.11. 20:33:00“ übernommen, „4.11. 23:50“ ebenfalls, „2575“ wird sauber abgelehnt mit Beispielen. Eine Zeit **drei Stunden in der Zukunft** wird ohne Hinweis angenommen. Ein Nachtrag (Meldezeit deutlich vor Erfassung) ist in der Ansicht nur durch Vergleich zweier Spalten, im Ausdruck gar nicht erkennbar (siehe P1-2).
4. **Erwartung der Rolle:** Rückfrage bei Zeiten in der Zukunft; Nachträge als „nachgetragen“ gekennzeichnet.
5. **Auswirkung im Einsatz:** Zahlendreher in der Uhrzeit (z. B. 2330 statt 2033) landen unbemerkt im ETB.
6. **Empfehlung:** Warnung bei Zukunftszeit und bei großem Abstand zur Erfassung; Marke „Nachtrag“ in Ansicht und Ausdruck.
7. **Verifikation:** Zeit +3 h → Rückfrage; Zeit −40 min → Zeile trägt „Nachtrag“.

### P2-4 — Einsatz beenden kappt halb getippte Einträge an anderen Plätzen; Nachtrag nur über Wiedereröffnen

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Ausgaben → „Einsatz beenden“ bei „ETB Krüger“, während „Lage Meier“ einen ETB-Eintrag tippt. Aufnahmen `30-A-beenden-maske.png`, `32-B-nach-beenden.png`, `33-B-eintrag-nach-beenden.png`, `34-A-eintrag-im-beendeten.png`.
3. **Beobachtung [beobachtet]:** Die Beenden-Maske nennt „4 weitere Arbeitsplätze“ (davon mehrere längst geschlossene Browserkontexte) und offene Anforderungen, aber nicht, dass jemand gerade einen Eintrag schreibt. Bei „Lage Meier“ wird binnen Sekunden „BEENDET — Eingaben gesperrt“ angezeigt, die offene Maske zeigt „Einsatz beendet – nur lesen. Eingaben werden nicht gespeichert.“, der Speichern-Knopf ist gesperrt; der Text bleibt nur, solange die Maske offen ist. „Eintrag hinzufügen“ ist im beendeten Einsatz weiter klickbar und öffnet eine Maske, die nicht speichern kann. Ein Nachtrag ging nur über „Wiedereröffnen“ → Eintrag → erneut beenden (beobachtet, sauber im Tagebuch). Die Wiedereröffnen-Maske sagt „Das Einsatzende wird gelöscht“ und fragt keinen Grund; im Tagebuch steht korrekt „Ende … aufgehoben“.
4. **Erwartung der Rolle:** Vor dem Beenden Hinweis „An Platz X ist ein Tagebucheintrag offen“; nach dem Beenden ein ausdrücklicher Nachtragsweg für das ETB (Abschlussvermerk, späte Meldungen) oder zumindest kein Verlust des getippten Textes. **[Annahme]** Nachträge nach Einsatzende sind im ETB-Alltag üblich.
5. **Auswirkung im Einsatz:** Eine letzte Meldung kann verloren gehen; Wiedereröffnen hebt die Sperre für alle Plätze auf, um einen Satz nachzutragen.
6. **Empfehlung:** Offene Masken anderer Plätze in der Beenden-Maske nennen; Text einer gesperrten Maske kopierbar halten bzw. als Entwurf erhalten; „Eintrag hinzufügen“ im beendeten Einsatz entweder sperren mit Grund oder als „Nachtrag zum beendeten Einsatz“ zulassen; „gelöscht“ durch „aufgehoben“ ersetzen, Grund beim Wiedereröffnen erfragen.
7. **Verifikation:** Platz B tippt, Platz A beendet → A sieht den Hinweis; B behält den Text; Nachtrag ohne Wiedereröffnen möglich oder klar erklärt.

### P2-5 — Einsatzakte: mehrere Tagebuch-Stände ohne Kennzeichnung, gleiche Minute überschreibt

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Ausgaben → „Einsatzakte erzeugen“ (laufend, beendet, archiviert). ZIP `…_akte_2026-11-05_2052.zip` und `…_akte_2026-11-05_2054.zip` entpackt.
3. **Beobachtung [beobachtet]:** Die Akte enthält Ereignisdateien je Arbeitsplatz, `manifest.json` mit SHA-256 je Datei und Ereigniszahl, `einsatz.json` – und **alle** bisher erzeugten `ausgaben/tagebuch_*.html` (in der letzten Akte drei Fassungen: 138, 138 und 143 Einträge), ohne Hinweis, welche die abschließende ist. Ein Deckblatt in Klartext (Einsatz, Zeitraum, Abschlussvermerk, Inhaltsverzeichnis) fehlt; weitere Ausgaben (Einheitenliste, Status) sind nur drin, wenn jemand sie vorher erzeugt hat. Zwei Akten in derselben Minute (vor und nach dem Archivieren) trugen denselben Dateinamen; die zweite hat die erste ersetzt (169 485 → 170 209 Bytes). **[nicht prüfbar]** PDF-Ausgaben gibt es nur in der Desktop-App; in der Web-Schale erscheint „PDF gibt es nur in der Desktop-App“ im Log.
4. **Erwartung der Rolle:** Eine Akte mit genau einem, als abschließend benannten Tagebuch, Deckblatt und den Standardausgaben; jede erzeugte Akte bleibt erhalten.
5. **Auswirkung im Einsatz:** Wer die Akte Monate später öffnet, kann einen Zwischenstand für das vollständige ETB halten.
6. **Empfehlung:** Zwischenstände in der Akte als solche benennen oder in einen Unterordner legen; das bei Erzeugung frisch gerenderte Tagebuch eindeutig als „abschließend“ benennen; Deckblatt in Klartext; Dateiname mit Sekunden oder Zähler.
7. **Verifikation:** Akte nach zwei Zwischenständen erzeugen → eindeutig benanntes Abschluss-Tagebuch, Deckblatt vorhanden; zwei Akten in einer Minute → zwei Dateien.

### P2-6 — Keine Vollständigkeitsaussage je Arbeitsplatz im Tagebuch

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Prüfaufgabe 4; Statuszeile und Tagebuch. Aufnahmen `19-A-tagebuch-nach-B.png`, `39-konflikthinweise.png`.
3. **Beobachtung [beobachtet]:** Einträge von „Lage Meier“ erschienen bei mir zuverlässig und in Erfassungsreihenfolge; der Wechsel auf „beendet“ kam binnen Sekunden an. Das Tagebuch selbst sagt aber nicht, bis wann es von welchem Platz Daten hat. Die Statuszeile zählt „3/4/5 weitere Arbeitsplätze“, darunter geschlossene Browserkontexte. „8 Konflikthinweise“ erklärt nur allgemein; im Tagebuch ist nicht markiert, welche Zeilen betroffen sind.
4. **Erwartung der Rolle:** Beim Ausdruck/Zwischenstand: „enthält Einträge von Platz A bis 20:51, Platz B bis 20:49“; betroffene Zeilen bei Konflikten markiert.
5. **Auswirkung im Einsatz:** Beim Zwischenstand für die Lagebesprechung weiß ich nicht, ob ein Platz mit Netzproblem fehlt.
6. **Empfehlung:** Je Platz „letzter Eintrag / letzter Abgleich“ in Tagebuchkopf und Ausdruck; Konfliktzeilen markieren.
7. **Verifikation:** Platz B vom Share trennen, Einträge schreiben → Tagebuch von A zeigt „Platz B: letzter Abgleich vor x min“.

### P2-7 — Freier Eintrag nur aus dem Blatt Tagebuch, ohne Kürzel

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Prüfaufgabe 1. Code: `TagebuchEintrag` wird nur in `Tagebuch.tsx` eingebunden; Hilfe nennt als Kürzel nur Strg+F.
3. **Beobachtung [beobachtet, Code]:** Um ein Telefonat einzutragen, muss ich aus Lage, Eingang oder Führungsstelle in den Reiter „Einsatztagebuch“ wechseln. Die Maske selbst ist gut: Text, Quelle (Funk, Telefon, Meldung vor Ort, Lagebesprechung, Sonstiges), Zeit mit verständlichem Format.
4. **Erwartung der Rolle:** Ein Kürzel und ein Knopf „ETB-Eintrag“ in jedem Blatt, Quelle per Tastatur, Bezug vorbelegt mit der aktuellen Auswahl.
5. **Auswirkung im Einsatz:** Jede freie Notiz kostet einen Ansichtswechsel und das Zurückfinden in die vorherige Arbeit.
6. **Empfehlung:** Globales Kürzel für „Eintrag ins Einsatztagebuch“, erreichbar aus jedem Blatt.
7. **Verifikation:** Aus der Lage mit Kürzel einen Eintrag schreiben, ohne das Blatt zu wechseln.

### P3-1 — Rauschen und Rohwerte im Klartext

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Einsatztagebuch, Ansicht und Ausdruck. Aufnahme `04-tagebuch.png`.
3. **Beobachtung [beobachtet]:** „D07: Schichtplan geändert (2026-09-08)“ (ISO-Datum, Kürzel D07 ohne Erklärung), „PSA-Bedarf gesetzt: (leer) → 0“, „Logistikangabe gesetzt (Weiblich): (leer) → 1“; „Einheit gemeldet“ ohne Stärke, Status oder Herkunft. Dutzende Verwaltungszeilen (Logistik, Dienstposten) stehen gleichrangig zwischen Lagemeldungen.
4. **Erwartung der Rolle:** Datumsformat TT.MM.JJJJ wie überall; „Einheit gemeldet: 0/1/8, THW OV Oldenburg, Status Einsatz“; Verwaltungszeilen abblendbar über einen Artfilter (vgl. P1-3).
5. **Auswirkung im Einsatz:** Wesentliches geht in den 100 sichtbaren Zeilen unter; ein Fachfremder stolpert über Kürzel.
6. **Empfehlung:** Restliche ISO-Daten umstellen; Meldesatz mit Kerndaten; Art-Filter.
7. **Verifikation:** Tagebuch der Prüflage ohne ISO-Datum; „Einheit gemeldet“ nennt Stärke und Herkunft.

### P3-2 — Spaltenbegriffe zwischen Ansicht und Ausdruck uneinheitlich

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Ansicht „Erfasst · Zeit der Meldung · Vorgang · Akteur · Rechner“ vs. Ausdruck „Zeit · Wer · Eintrag · Notiz“.
3. **Beobachtung [beobachtet]:** Zwei Begriffswelten für dasselbe Tagebuch; „Akteur“ ist für Fachfremde ungewohnt.
4. **Erwartung der Rolle:** Gleiche Spalten und Begriffe in Ansicht und Ausdruck („Bearbeiter“, „Platz“).
5. **Auswirkung im Einsatz:** Rückfragen bei der Übergabe des Ausdrucks.
6. **Empfehlung:** Einheitliche Spaltennamen.
7. **Verifikation:** Ansicht und Ausdruck nebeneinander, gleiche Spaltenköpfe.

---

## Abgleich mit dem Audit vom 29.10.2026

| Befund damals | Stand heute |
|---|---|
| Stärkezelle schrieb Text, Tagebuch verschleierte es | **behoben** [beobachtet]: „Stärke geändert: 0/1/8 → 0/1/7“ |
| Tagebuch öffnete auf die Auswahl beschränkt | **behoben** [beobachtet]: Vorgabe „alle“, Filter in der Fußzeile benannt, „Alle anzeigen“ |
| „Stärke geändert“ ohne alt/neu | **behoben** [beobachtet] |
| Zeitfelder nahmen Rohtext / ISO-UTC | **behoben** für Eingaben [beobachtet]; ISO-Datum noch im Satz „Schichtplan geändert (2026-09-08)“ (P3-1) |
| Ausgaben nur als Dateipfad | **behoben** [beobachtet]: „Öffnen“, „Herunterladen“, „Drucken“ |
| Rückgängig nur in der Sitzung, kein Berichtigen-Weg je Zeile | **offen** (P1-1) |
| Statuswechsel ohne fachliche Zeit | **offen** (P1-4) |
| Begriffe Rückgängig / Rücknahme / Berichtigung uneinheitlich | **offen**; „Berichtigung“ existiert als Filterwort, aber nicht als Funktion (P1-1) |

---

## Positives

Jede Lage-Änderung eines anderen Platzes landete ohne mein Zutun im Tagebuch, mit Erfassungszeit auf die Sekunde, Bearbeiter und Rechner, in lesbaren Sätzen mit „vorher → nachher“ – auch Einsatz beendet (mit Bemerkung als Grund), wiedereröffnet („Ende … aufgehoben“) und archiviert. Zwei getrennte Zeitspalten in der Ansicht, Ordnung nach Erfassung statt nach getippter Zeit, Rücknahmen als eigene markierte Zeilen, Entfernen ist kein Löschen. Die Maske für freie Einträge ist knapp und fachlich richtig (Quelle als Auswahl, Zeitformate „0630“, „4.11. 23:50“, verständliche Ablehnung). Der Ausdruck hat Seitenzahl „Seite x von y“, Stand, älteste zuerst und eine Notizspalte für Handvermerke. Die Einsatzakte ist als Zwischenstand jederzeit erzeugbar, trägt alle Ereignisse und SHA-256 je Datei; Archivieren verlangt eine ausdrückliche Bestätigung und lässt Lesen, Ausgaben und Akte weiter zu.

---

## Abschluss

- **Aufgabe der Rolle geschafft:** mit Umwegen – freie Einträge nur mit eingetippter Uhrzeit (P0-1), Berichtigung nur als unverknüpfter Freitext (P1-1), Einheiten-/Zeitraumsuche nur über Textsuche und Mitlesen (P1-3).
- **Nebenaufzeichnung auf Papier nötig:** ja – für Berichtigungsvermerke mit Bezug auf den Ursprungseintrag, für die Meldezeit von Statuswechseln und, solange P0-1 besteht, für jede Meldung, die unter Zeitdruck nicht gespeichert wurde.
- **Größte Lücke an einer Übergabe:** Von der Führungsstelle an die Einsatzakte (Abrechnung/Rechtsfragen): Der Ausdruck verliert Rücknahme-Kennzeichnung, Erfassungszeit und Platz, sodass die Akte weniger aussagt als der Bildschirm.
- **Größtes Einsatzrisiko:** Der Standardweg „Eintrag jetzt“ scheitert mit einer technischen Meldung, und eine abgebrochene Maske hinterlässt keine Spur im Tagebuch.
- **Top-Priorität für die nächste Iteration:** Freien Eintrag mit leerer Zeit als „jetzt“ speichern (mit Regressionstest), unmittelbar gefolgt von einer Zeilenaktion „Berichtigen“ mit sichtbarem Bezug in Ansicht und Ausdruck.
