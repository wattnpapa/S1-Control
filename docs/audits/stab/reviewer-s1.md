# Stab-Review: Sachgebiet S1 (Personal/Innerer Dienst)

Datum: 2026-11-22 · laufende Web-Schale http://127.0.0.1:8790 · Playwright/Chromium, 1440 × 900, ein Browser-Kontext, Arbeitsplatz „S1-Tisch“, Profil „Führungsstelle (S1)“, Stelle S1, Handzeichen „Rvs“.

Übungseinsatz: **„Review S1 Hochwasser Aller“** (22.11.2026, FüSt THW OV Celle, übergeordnet TEL LK Celle, Beginn 06:00, Zwei Schichten). Lage über die Oberfläche angelegt: 7 Abschnitte (EA 1 Deich Nord, EA 2 Deich Süd, EA 3 Pumpenbetrieb, Bereitstellungsraum, Logistik, Führungsstelle, Angefordert / Anmarsch), 20 Einheiten aus THW, Feuerwehr, DRK, JUH, DLRG und Polizei mit Status Rufbereitschaft bis Rückmarsch, Schicht Tag/Nacht, Eintreffzeiten, „verfügbar bis“, zwei Bemerkungen zu Ausfällen, fünf Personen an einer Einheit, drei Ablösungen (eine zugesagt und eingetroffen, B-Gr OV Hannover löst B-Gr 1 TZ OV Celle ab), zwei Rückmärsche, ein Schichtwechsel, vier Tagebucheinträge, vier Dienstposten.

Belege: Screenshots und Skripte unter `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/s1/` (unten als `s1/NN-…png`); erzeugte Ausgaben im Einsatzordner unter `…/scratchpad/webdaten/share/einsaetze/2026-11-22_review-s1-hochwasser-aller_3d37f3/ausgaben/`.

Kennzeichnung: **[beobachtet]** = in der laufenden App gesehen · **[Code]** = aus dem Quelltext gelesen · **[Annahme]** = S1-Ablauf, der nicht aus Programm oder Handbuch folgt.

Nicht geprüft: Erfassungsbögen, QR-Scan und EEB-Import. Das Paket `@bos/eeb-format` ist in dieser Umgebung durch einen Platzhalter ersetzt; alle Einheiten wurden von Hand angelegt. Dazu gibt es keine Befunde.

## Urteil aus Sicht des S1

Die Datenbasis für den S1 ist da. Die App kennt Stärke je Einheit, Status, Schicht, Eintreff- und Endzeiten, „verfügbar bis“, Ablösungen mit Zusage, Personen je Einheit und ein Tagebuch, und sie rechnet die Ist-Stärke nach einer klaren, erklärten Regel. Die Monitor-Tafeln 7 bis 9 (Stärke je Abschnitt, je Organisation, Kreuztabelle) sind wandtauglich, und der Export „Status“ ist inhaltlich fast eine Stärkemeldung.

Was fehlt, sind die **Ansichten, in denen der S1 arbeitet**. Für jede Kernfrage des S1 musste ich Daten aus drei bis fünf Stellen zusammensuchen:

- „Wie viele Köpfe sind im Einsatz, wie viele in Reserve, wie viele in Ruhe?“ steht nur in einer HTML-Datei.
- „Wer muss bis wann abgelöst werden, und ist die Ablösung gedeckt?“ steht am besten im Blatt S4 unter „Nächste 24 h“.
- „Wer ist verletzt oder ausgefallen?“ hat gar kein Feld, nur Freitext.

Die Einheitentabelle ist eine gute Excel-Ablösung, aber keine Lagedarstellung für den S1. Mit 22 Spalten in Ressourcen-Sicht verliert sie beim Seitwärtsscrollen Status, Stärke und sogar die Bereichsnamen. Dazu kommen zwei Fehler, die Nachweise verfälschen: Zeitstempel stehen im Tagebuch in UTC, und eine verknüpfte Ablösung wird nicht in die Stärke gebucht.

## Fehlende Ansichten

### FA-S1-1 · P1 · Kräfteübersicht und Stärkemeldung nach Status

**Was der S1 sehen und tun muss** [Annahme]: Er braucht auf einen Blick die Ist-Stärke als Fü/UFü/He/Gesamt, aufgeschlüsselt nach Status (im Einsatz, einsatzbereit/Reserve, Ruhe, nicht einsatzbereit) und dazu nach Abschnitt und Organisation. Erwartete Kräfte und Abgänge stehen getrennt daneben. Die Ansicht trägt einen Stand mit Uhrzeit. Aus ihr erzeugt ein Knopf eine Stärkemeldung an die übergeordnete Führungsstelle, als vorbelegte Nachricht oder als Druck. Im Übungsablauf hat die TEL zu 18:00 eine gegliederte Stärkemeldung verlangt (Tagebucheintrag).

**Was die App schon hat** [beobachtet/Code]:
- Status und Stärke je Einheit, Abschnitt und Organisation.
- Die Zählregel der Ist-Stärke (`kennzahlen.ts`).
- Die Kräftebilanz nach Organisation, Status und Schicht im Export „Status“ (`s1/33-status_…png`).
- Die Stärke je Abschnitt und Organisation in den Monitor-Tafeln 7 bis 9 (`s1/30-monitor-7.png` bis `-9.png`).

**Wo es heute verstreut ist** [beobachtet]:
- Das Kopfband zeigt nur die Summe 4/33/117 // 154.
- Die Filterchips zählen **Einheiten**, nicht Köpfe („Einsatzbereit 4“).
- Köpfe der Reserve gibt es nur, wenn man den Filter wählt und die Tabellensumme liest (0/4/21 = 25, `s1/37-filter-einsatzbereit.png`).
- Die Statusbilanz steht nur in der HTML-Datei „Status“ unter Exporte. Dort zählen Ist und Erwartete zusammen („alle erfassten Einheiten“, 181 statt 154).
- Die Monitortafeln zeigen keinen Status.
- Eine Stärkemeldung als Nachricht gibt es nicht. Im Quelltext findet sich kein entsprechender Weg [Code: nur ein Treffer „staerkemeldung“ in `fold.ts`, keiner im Renderer].

### FA-S1-2 · P1 · Ablösungs- und Schichtwechselplan (Zeitstrahl)

**Was der S1 sehen und tun muss** [Annahme]: Er sieht alle Einheiten mit ihrer Verfügbarkeitsgrenze („verfügbar bis“, Einsatzende), sortiert nach Fälligkeit, für die nächsten 12 bis 24 Stunden. Zu jeder Einheit steht der Stand der Ablösung: keine, angefordert, zugesagt für Uhrzeit X von Y, eingetroffen. Eine **Deckungslücke** wird markiert, wenn die Ablösung später zugesagt ist, als die Einheit verfügbar ist, oder wenn gar keine angefordert ist. Für den Schichtwechsel zeigt die Ansicht die Köpfe je Schicht (Tag/Nacht bzw. Früh/Spät) und Abschnitt und wer zum Wechselzeitpunkt aus der Ruhe kommt. Von hier aus legt der S1 die Ablösung an.

**Was die App schon hat** [beobachtet/Code]:
- `verfuegbarBis`, `einsatzendeAm` und `rueckfuehrungAm` je Einheit.
- Anforderungen mit `abzuloesendeEinheitId`, Zusage samt `zugesagtAm`, Erledigung und Storno.
- `schicht` je Einheit.
- Die Projektion `abloesung-offen.ts`.
- Im Blatt S4 unter „Nächste 24 h“ bereits eine Liste „Zu- und Abgänge“ mit Uhrzeit, Kopfzahl, Einheit und Abschnitt (`s1/40-s4-24h.png`):

  ```
  221725 −9 B-Gr 1 … · 221730 −9 LG FF Wietze … · 221800 −20 LZ FF Celle-Mitte … · 221900 −9 LG FF Hambühren … · 230600 −12 FGr WP OV Celle …
  ```

  Das ist genau der Zeitstrahl, den der S1 braucht. Er steht aber beim S4 und rechnet in Portionen.

**Wo es heute verstreut ist** [beobachtet]:
- „Verfügbar bis“, Ablösungs- und Zusagespalten stehen als Ressourcen-Spalten der Einheitentabelle. Sie sind nur über „Spalten ▾ → Ressourcen“ und Seitwärtsscrollen zu sehen (`s1/16a-zeitzelle.png`).
- Die Anforderungen liegen im Profil S1 unter „Mehr ▾ → Eingangskorb → Umschalter Anforderungen“ (`s1/21-anforderungen.png`). Die Liste nennt weder das „verfügbar bis“ der abzulösenden Einheit noch eine Lücke.
- Die Köpfe je Schicht stehen nur in Monitor-Tafel 5 „Bereiche · Schichten“ (S4-Zählweise, `s1/30-monitor-5.png`) und im Export „Status“.
- Der Schichtplan im Blatt Führungsstelle betrifft nur die Dienstposten des Stabs und kennt keine Uhrzeiten (`s1/29-schichtplan.png`).

### FA-S1-3 · P1 · Ausfälle, Verletzte und Unfälle

**Was der S1 sehen und tun muss** [Annahme]: Er führt eine Liste der Personal-Ausfälle mit Zeit, Einheit, Art (verletzt, erkrankt, erschöpft, abgezogen), Verbleib (versorgt vor Ort, Transport, entlassen), ggf. Name und Meldung an Dienststelle bzw. Unfallmeldung erledigt ja/nein. Jeder Ausfall mindert die Stärke der Einheit mit Grund und Uhrzeit. Er sieht auf einen Blick, wie viele Kräfte im Einsatz ausgefallen sind.

**Was die App schon hat** [beobachtet]:
- Freitext in der Spalte „Bemerkungen“.
- Freie Tagebucheinträge mit Quelle und Uhrzeit (`s1/35a-eintrag.png`).
- Die Stärkeänderung als Ereignis („Stärke geändert: 1/5/16 → 1/5/14“).
- Personen mit Namen je Einheit.

Ein strukturiertes Feld für Ausfall, Verletzung oder Unfall gibt es nicht [Code: kein Treffer zu „verletz“, „ausfall“ oder „erkrank“ in Domäne oder Renderer außer Technik-Texten].

**Wo es heute verstreut ist** [beobachtet]:
- Der Ausfall bei LZ FF Celle-Mitte steht als Bemerkung, die Stärkeänderung ohne Grund als zweite Tagebuchzeile.
- Die Schnittverletzung bei FGr E OV Gifhorn steht als Bemerkung und als freier Tagebucheintrag.
- Wiederzufinden ist das nur über die Tagebuchsuche „verletz“ (`s1/36-tagebuch-suche.png`).
- Die Bemerkungen erscheinen nicht in der Einheitenliste für die Lagebesprechung (`s1/33-einheitenliste_…png`).

### FA-S1-4 · P2 · Personalnachweis (Personen im Einsatz)

**Was der S1 sehen und tun muss** [Annahme]: Er sieht alle namentlich erfassten Personen über alle Einheiten mit Einheit, Rolle, Funktion, Abschnitt, Status der Einheit sowie Eintreff- und Endzeit. Er kann die Liste filtern, z. B. nach Funktion „Kraftfahrer“, „Sprechfunker“ oder „AGT“, und als Nachweis für Freistellung und Erstattung ausgeben. Die Ansicht gleicht ab, wo die Personenzahl von der gemeldeten Stärke abweicht.

**Was die App schon hat** [beobachtet/Code]:
- `PersonZustand` mit Name, Rolle, Funktionen, Fahrerlaubnissen, Kontakten und Einheit.
- Die Erfassung je Einheit über „Personen +“ (`s1/15-untertabellen.png`).

**Wo es heute verstreut ist** [beobachtet]:
- Die Personen stehen nur in den Untertabellen der jeweils gewählten Einheit, gut 1 350 px unter der Zeile (Zeile bei y = 464, Untertabellen bei y = 1 818, `s1/14a-fullpage-untertabellen.png`).
- Funktionen werden dort nicht angezeigt.
- Es gibt keinen Export mit Personen.
- Fünf erfasste Personen (2 UFü, 3 He) neben gemeldeter Stärke 0/2/7 erzeugen keinen Hinweis.

### FA-S1-5 · P2 · Einsatzzeiten-Nachweis

**Was der S1 sehen und tun muss** [Annahme]: Je Einheit stehen Eingetroffen, Einsatzende, Rückführung und die Einsatzdauer bis jetzt. Er sieht, wer über eine Schwelle hinaus ohne Ruhe im Einsatz ist (z. B. mehr als 12 h). Daraus entsteht ein Nachweis je Einheit und Organisation für Abrechnung und Freistellung.

**Was die App schon hat** [beobachtet]:
- `eingetroffenAm`, `einsatzendeAm` und `rueckfuehrungAm`.
- Die Statuswechsel mit Zeit im Tagebuch.
- Die Spalte „Eingetroffen“ in der Einheitenliste.

**Wo es heute verstreut ist** [beobachtet]:
- Die Zeiten stehen in den Ressourcen-Spalten. Eine Dauer wird nirgends berechnet.
- Seit wann eine Einheit ohne Ruhe arbeitet, lässt sich nur aus den Tagebuchzeilen „Status gesetzt“ zusammensuchen. Diese tragen keine Fachzeit (siehe B-FG-6 in `reviewer-fuehrungsgehilfe-s1.md`).

## Befunde an vorhandenen Ansichten

### B-S1-1 · P1 · Tagebuch und Anforderungs-Export schreiben Zeiten in UTC

- **Beobachtung:** Im Einsatztagebuch steht für LG FF Wietze die Fachzeit „22.11. 17:30:00“. Im Text derselben Zeile steht „Zeitpunkt gesetzt (Einsatzende): (leer) → 2026-11-22T16:30:00.000Z“. Ebenso stehen alle Eintreff- und Verfügbarkeitszeiten in ISO-UTC im Vorgangstext (`s1/34-tagebuch.png`, Zeilen 74–103). Der Export „Anforderungen“ (für die Schichtübergabe gedacht) nennt die Zusage als „2026-11-22T18:30:00.000Z / B-Gr OV Hannover“, eingegeben wurde 19:30 (`s1/33-anforderungen_…png`).
- **Auswirkung im Einsatz:** Wer Tagebuch oder Übergabeliste liest, sieht eine Stunde zu früh (im Sommer zwei). Das Tagebuch ist Nachweis. Eine falsche Einsatzende-Zeit kann z. B. bei Arbeitszeit- und Erstattungsfragen Folgen haben [Annahme].
- **Empfehlung:** Zeitwerte in Vorgangstexten und allen Exporten in Ortszeit und im gleichen Format wie die Fachzeit ausgeben (TT.MM. HH:MM bzw. DTG).
- **Verifikation:** Eine Zeitzelle setzen, Tagebuch und Export „Anforderungen“ erzeugen, ISO-Zeichenketten mit „Z“ dürfen nicht mehr vorkommen.

### B-S1-2 · P1 · „Eingetroffen“ an der Anforderung bucht die verknüpfte Einheit nicht ein

- **Beobachtung:** ANF-01 wurde mit „Bestehende Einheit verknüpfen → B-Gr OV Hannover“ auf eingetroffen gesetzt. Danach stand B-Gr OV Hannover weiter im Abschnitt „Angefordert / Anmarsch“, Status Anmarsch, ohne Eintreffzeit. Die Ist-Stärke blieb unverändert. Verschieben, Status setzen und Eingetroffen eintragen waren drei weitere Handgriffe (`s1/25a-verknuepfen.png`, Tabellenauszug nach `s25.js`).
- Die Maske war außerdem auf „Einheit aus der Anforderung anlegen“ vorbelegt, obwohl eine Einheit gleichen Namens schon im Anmarsch stand. Mit einem Klick wäre so eine Doppelzählung entstanden.
- Die Anforderungsliste schreibt danach „→ angelegt: B-Gr OV Hannover“, obwohl verknüpft wurde.
- **Auswirkung im Einsatz:** Die Ablösung ist laut Anforderung da, laut Stärke nicht. Der S1 meldet zu wenig Kräfte oder vergisst das Einbuchen. Mit der Vorbelegung „anlegen“ entsteht leicht eine doppelte Einheit.
- **Empfehlung:**
  - Beim Verknüpfen anbieten, Abschnitt, Status „Einsatzbereit“ und Eintreffzeit „jetzt“ in einem Schritt zu setzen, wie beim Anlegen.
  - Bei gleichnamiger Einheit im Anmarsch „verknüpfen“ vorbelegen.
  - Den Text „angelegt“ oder „verknüpft“ korrekt führen.
- **Verifikation:** Nach „Eingetroffen → verknüpfen“ steigt die Kopfzahl um die Stärke der Einheit, und ihre Zeile steht im gewählten Einsatzabschnitt.

### B-S1-3 · P2 · Einheitentabelle mit Ressourcen-Spalten unlesbar

- **Beobachtung:**
  - Schon mit den Standardspalten ist die Tabelle 1 689 px breit, in einem Rahmen von 1 040 px. „Gesamt“ ist bei 1 440 px Fensterbreite abgeschnitten (`s1/09-einheiten.png`, Messung `s37.js`).
  - Mit „Ressourcen“ kommen 13 Spalten dazu. Beim Seitwärtsscrollen bleibt nur die Bezeichnung stehen. Status, Stärke und Organisation verschwinden, und die Bereichs-Kopfzeilen werden leere graue Balken ohne Namen (`s1/16a-zeitzelle.png`).
  - Nach Zellbearbeitungen blieb die Tabelle seitlich verschoben, die Statusspalte war halb abgeschnitten („satz ▾“, `s1/11-schicht-fehl.png`).
- **Auswirkung im Einsatz:** Beim Pflegen von „verfügbar bis“ oder Ablösung sieht der S1 nicht, in welchem Abschnitt und mit welchem Status die Einheit steht. Verwechslungen in der Zeile werden wahrscheinlicher.
- **Empfehlung:** Status und Stärke wie die Bezeichnung fixieren, den Bereichsnamen in der Kopfzeile ebenfalls. Langfristig gehört die Ressourcenplanung in FA-S1-2 statt in die Breite der Tabelle.
- **Verifikation:** Bei 1 440 px mit „Ressourcen“ ganz nach rechts scrollen. Bezeichnung, Status, Stärke und Bereichsname müssen sichtbar bleiben.

### B-S1-4 · P2 · Profil „Führungsstelle (S1)“ versteckt Anforderungen und Tagebuch, Handbuch beschreibt anderes Band

- **Beobachtung:** Das Kopfband zeigt im Profil S1 „S1 · Nachrichten · Funkplan · S4 · Exporte“. Eingangskorb, Führungsstelle, Kosten und Einsatztagebuch stehen unter „Mehr“ (`s1/19a-mehr.png`, `blaetter.ts` Stand 2026-11-22). Die Anforderungen (Ablösungen) liegen im Blatt „Eingangskorb“, dort hinter dem Umschalter. Das Handbuch nennt für dasselbe Profil „Lage · Eingang · Nachrichten · Führungsstelle · Ausgaben · Einsatztagebuch“ im Band (HANDBUCH.md, Abschnitt „Das Fenster“).
- **Auswirkung im Einsatz:** Für den S1 sind Ablösungen und Tagebuch Kernarbeit [Annahme]. Funkplan und S4 sind es nicht. Jede Ablösung kostet drei Klicks Navigation, und wer nach Handbuch sucht, findet „Eingang“ und „Ausgaben“ nicht.
- **Empfehlung:**
  - Im Profil S1 die Anforderungen als eigenen Reiter oder als Teil von FA-S1-2 ins Band holen.
  - Das Einsatztagebuch ins Band, Funkplan und S4 unter „Mehr“.
  - Die Handbuch-Tabelle nachziehen.
- **Verifikation:** Profil S1 wählen. Ablösungen und Tagebuch sind mit einem Klick erreichbar, das Handbuch nennt dieselben Reiter.

### B-S1-5 · P2 · Ablösung anfordern ohne Zeitpunkt, „Ablösung durch“ zeigt die nur vorgesehene Einheit

- **Beobachtung:**
  - Die Maske „Ablösung für … anfordern“ fragt Kennung, vorgesehene Einheit und Auftrag, aber nicht, **bis wann** abgelöst werden muss (`s1/18b-abloesung-anfordern.png`). Der Zeitpunkt entsteht erst mit der Zusage („Zugesagt für“).
  - In der Einheitentabelle steht bei LZ FF Celle-Mitte unter „Ablösung durch“ bereits „LZ FF Bergen“, obwohl ANF-02 noch offen und nichts zugesagt ist (Tabellenauszug nach `s27.js`).
- **Auswirkung im Einsatz:** Wer die Spalte liest, hält die Ablösung für geregelt. Der Bedarfszeitpunkt fehlt in der Anforderung und damit auch in der Übergabeliste.
- **Empfehlung:**
  - Die Anforderung mit „benötigt bis“ anlegen, vorbelegt aus „verfügbar bis“.
  - „Ablösung durch“ erst ab Zusage füllen, davor „vorgesehen: …“.
- **Verifikation:** Für eine Einheit mit „verfügbar bis“ eine Ablösung anfordern. Die Maske ist mit der Zeit vorbelegt, und „Ablösung durch“ bleibt leer bis zur Zusage.

### B-S1-6 · P2 · Abgelöste und abgerückte Einheiten bleiben in der Lage stehen, „läuft ab“ ohne Abstufung

- **Beobachtung:**
  - B-Gr 1 TZ OV Celle (Rückmarsch, Ablösung eingetroffen) steht weiter unter EA 1 Deich Nord, mit „verfügbar bis 22.11.2026 20:00 läuft ab“ (`s1/27-nach-abloesung.png`).
  - „läuft ab“ steht gleich für 18:00 (30 min) und für 23.11. 06:00 (13 h). Nur LG FF Wietze nach 17:30 heißt „abgelaufen“ (Auszug `s40.js`).
- **Auswirkung im Einsatz:** Die Spalte warnt bei fast jeder Einheit. Das Wichtige (in 30 min weg, keine Ablösung) geht unter. Rückmarsch-Einheiten verfälschen den Blick auf den Abschnitt.
- **Empfehlung:**
  - „läuft ab“ nach Restzeit staffeln (z. B. < 2 h hervorgehoben).
  - Bei Rückmarsch und Einsatz beendet keine Ablaufmarke zeigen.
  - Beim Rückmarsch anbieten, nach „Einsatz beendet“ zu verschieben.
- **Verifikation:** Einheit auf Rückmarsch setzen, die Marke verschwindet. Zwei Einheiten mit 30 min und 13 h Restzeit sind unterschiedlich markiert.

### B-S1-7 · P2 · Kopfband „18 beendet“ ist mehrdeutig

- **Beobachtung:** Unter der Ist-Stärke steht „+27 erwartet (angefordert/Anmarsch/Eingang) · 18 beendet“ (`s1/28a-fuest.png`). Gemeint sind 18 Köpfe aus zwei Einheiten. Im Export heißt es „18 beendet/Rückmarsch“.
- **Auswirkung im Einsatz:** Man liest 18 beendete Einheiten. Bei der mündlichen Stärkemeldung ist das ein Zahlendreher-Risiko.
- **Empfehlung:** „18 Kräfte beendet/Rückmarsch“ oder „0/3/15 beendet“ schreiben.
- **Verifikation:** Kopfband nach einem Rückmarsch lesen. Die Einheit „Kräfte“ steht dabei.

### B-S1-8 · P2 · Ausfälle und Stärkeänderungen ohne Grund, Bemerkung fehlt im Lagebesprechungsdruck

- **Beobachtung:**
  - Die Stärke von LZ FF Celle-Mitte wurde per Zelle von 1/5/16 auf 1/5/14 gesetzt. Es gab weder Rückfrage noch Grundfeld, das Tagebuch sagt nur „Stärke geändert“.
  - Der Grund steht separat als Bemerkung. Die Einheitenliste (Lagebesprechung, Rechnerausfall) enthält keine Bemerkungsspalte (`s1/33-einheitenliste_…png`).
- **Auswirkung im Einsatz:** In der Lagebesprechung und auf Papier fehlt, warum eine Einheit weniger meldet. Ausfälle sind nicht nachweisbar. Das ist die Grundlage von FA-S1-3.
- **Empfehlung:** Bei Stärkeminderung optional nach dem Grund fragen (Ausfall, Verletzung, Abzug) und ihn ins Tagebuch schreiben. Bemerkungen in die Einheitenliste aufnehmen.
- **Verifikation:** Stärke mindern, im Tagebuch steht der Grund. Die Einheitenliste zeigt die Bemerkung.

### B-S1-9 · P3 · Monitor-Tafel „Bereiche · Schichten“ summiert nicht auf

- **Beobachtung:** Für EA 1 Deich Nord zeigt die Tafel Tag 42 und Nacht 0, aber Summe 51 (`s1/30-monitor-5.png`). Die Differenz ist B-Gr OV Hannover ohne Schicht. In Tafel 7 steht die Spalte „Erwartet“ je Abschnitt überall auf „—“, die Erwarteten stehen zusätzlich als eigene graue Zeile (`s1/30-monitor-7.png`).
- **Auswirkung im Einsatz:** Wer an der Wand Tag plus Nacht rechnet, kommt nicht auf die Summe. Die Stärketafel wirft Rückfragen auf.
- **Empfehlung:** Eine Spalte „ohne Schicht“ einführen oder die Fußnote „n ohne Schicht“ anzeigen. In Tafel 7 entweder die Spalte oder die Zeile „Erwartet“.
- **Verifikation:** Einheit ohne Schicht anlegen, und die Zeile summiert sichtbar.

### B-S1-10 · P3 · Technische Kennungen und ISO-Datum in Führungsstelle/Schichtplan

- **Beobachtung:**
  - Die Rückmeldung nach „Dienstposten anlegen“ lautet „Dienstposten angelegt (‚dp-mws1ry0u-rxazva‘)“, das Tagebuch ebenso.
  - Die Spalte des Schichtplans heißt „2026-11-22“.
  - Der Hinweis „Kein Dienstposten besetzt.“ bleibt stehen, obwohl vier Posten angelegt sind (`s1/29-schichtplan.png`).
  - Das Datumsfeld zeigte „mm/dd/yyyy“. Das hängt vom Browser-Locale der Testumgebung ab [Annahme].
- **Auswirkung im Einsatz:** Das Tagebuch enthält unlesbare Zeilen. Die Stabsbesetzung je Schicht ist schwer nachzuvollziehen.
- **Empfehlung:** Funktion und Schicht statt ID nennen, Datum als TT.MM.JJJJ.
- **Verifikation:** Dienstposten anlegen. Rückmeldung und Tagebuch nennen „S1 · Tag“.

## Schluss

- **Aufgabe geschafft:** **mit Umwegen.**
  - Gelungen sind Kräfteübersicht, Ablösungen, Schichtwechsel und Einsatzzeiten. Die Statusbilanz stand dafür nur in einer Exportdatei, der Ablösungs-Zeitstrahl im S4-Blatt.
  - Die verknüpfte Ablösung musste von Hand eingebucht werden.
  - Den Personalnachweis gibt es nur je Einheit.
  - Ausfälle und Verletzte ließen sich nur als Freitext festhalten.
- **Größtes Risiko:** Die Nachweise des S1 sind fehlerhaft oder unvollständig. Tagebuch und Übergabe-Export zeigen UTC-Zeiten (B-S1-1), eine eingetroffene Ablösung fehlt in der Ist-Stärke (B-S1-2), und Ausfälle hinterlassen keinen strukturierten Nachweis (FA-S1-3).
- **Top-Priorität:** B-S1-1 beheben. Danach FA-S1-2 (Ablösungs- und Schichtwechselplan) als eigene S1-Ansicht bauen, mit dem Zeitstrahl, den die Versorgung schon rechnet. Sie bündelt „verfügbar bis“, Anforderungen und Schicht und löst B-S1-3 bis B-S1-6 zu großen Teilen mit.
