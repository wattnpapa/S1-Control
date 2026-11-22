# Stab-Review: Führungsgehilfe S1

Datum: 2026-11-22 · laufende Web-Schale http://127.0.0.1:8790 · Playwright/Chromium, 1440 × 900, Arbeitsplatz „S1-Tisch“, Profil „Führungsstelle (S1)“, Stelle S1.

Übungseinsatz: **„Review S1 Hochwasser Aller“**, dieselbe Lage wie im Audit `reviewer-s1.md` (7 Abschnitte, 20 Einheiten aus sechs Organisationen, 3 Ablösungen, 2 Rückmärsche, 1 Schichtwechsel, Tagebucheinträge). Die Erfassung lief als Führungsgehilfe am Tisch:
- 20 Einheiten „Ohne Vorlage“ anlegen,
- Status und Schicht setzen,
- Eintreff- und Verfügbarkeitszeiten nachtragen,
- Personen und Auftrag erfassen,
- eine eingetroffene Ablösung einbuchen,
- Schichtwechsel und Rückfragen nachspielen.

Belege: Screenshots und Skripte unter `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/s1/` (unten `s1/NN-…png`, Skripte `sNN.js`).

Kennzeichnung: **[beobachtet]** = in der App gesehen · **[Code]** = aus dem Quelltext · **[Annahme]** = Arbeitsweise am Tisch, die nicht aus Programm oder Handbuch folgt. Zeiten aus den Skripten sind Maschinenzeiten. Für Menschen nenne ich deshalb die Zahl der Handgriffe.

Nicht geprüft: Erfassungsbögen, Handscanner/QR und EEB-Import. `@bos/eeb-format` ist hier ein Platzhalter. Gerade der schnellste Erfassungsweg am Meldetisch fehlt deshalb im Test. Dazu gibt es keine Befunde.

## Urteil aus Sicht des Führungsgehilfen S1

Die Einheitentabelle mit Zellbearbeitung trägt die Excel-Gewohnheit gut: Doppelklick, Enter, Esc, Strg+D für „jetzt“, Rückgängig in der Statuszeile und Rückmeldung „gespeichert“ nach jedem Schritt. Einzelne Änderungen gehen sicher.

Unter Zeitdruck kippt das. **Jede typische Tischaufgabe besteht aus mehreren getrennten Handgriffen an verschiedenen Stellen:**
- Ankunft einbuchen: Verschieben-Maske, Statuszelle, Eintreffzeit in einer ausgeblendeten Spaltengruppe, Schichtzelle.
- Schichtwechsel: jede Einheit einzeln mit drei Klicks.
- Rückfrage beantworten: Tabelle, Seitwärtsscrollen, Untertabellen weit unten, Tagebuchfilter.

Hinzu kommen zwei Fallen bei der Erfassung. Strg+N öffnet zwei Masken übereinander. Masken sperren den Knopf, ohne zu sagen, was fehlt. Eine echte Arbeitsansicht für den Meldetisch gibt es nicht.

## Fehlende Ansichten

### FA-FG-1 · P1 · Meldetisch / Ankunft einbuchen

**Was der Führungsgehilfe sehen und tun muss** [Annahme]: Eine Einheit meldet sich am Tisch an (oder per Funk). In einer Zeile oder kleinen Maske wählt er die Einheit (Suche, auch unter den angeforderten) oder legt sie neu an. Dann setzt er in **einem** Schritt Abschnitt, Status (vorbelegt „Einsatzbereit“), Eintreffzeit (vorbelegt jetzt, änderbar), Schicht und Stärke, falls die Ist-Stärke von der Soll-Stärke abweicht. Dieselbe Ansicht dient umgekehrt zum Abmelden: Rückmarsch, Einsatzende, nach „Einsatz beendet“. Daneben steht eine Liste „erwartet“ (angefordert, Anmarsch) mit Zusagezeit, aus der man die Einheit antippt.

**Was die App schon hat** [beobachtet/Code]:
- Alle Felder: Abschnitt, Status, Schicht, Stärke, `eingetroffenAm`, `einsatzendeAm`.
- Den Bereich „Angefordert / Anmarsch“ und die Anforderungen mit Zusage.
- Beim Anlegen aus einer Anforderung („Eingetroffen → Einheit aus der Anforderung anlegen“) gibt es bereits eine Maske, die Abschnitt, Status „Einsatzbereit“ und Stärke zusammen setzt (`s1/24a-eingetroffen.png`).

**Wo es heute verstreut ist** [beobachtet, `s27.js`]: Ankunft von B-Gr OV Hannover einbuchen bedeutete:
1. Zeile anklicken, „Verschieben“, Abschnitt wählen, „Verschieben“ (4 Handgriffe).
2. Statuszelle, Status wählen, „Übernehmen“ (3).
3. „Spalten ▾ → Ressourcen“ einschalten, seitwärts scrollen, Doppelklick auf „Eingetroffen“, Zeit tippen oder Strg+D, Enter (≥ 5).
4. Schicht: Doppelklick, wählen, „Übernehmen“ (3).

Das sind rund 15 Handgriffe an vier Stellen. Eine frisch angelegte Einheit steht immer auf „Angefordert“ („Der Status ist ‚Angefordert‘: Wer anlegt, plant Kräfte …“, `s1/07b-vorlage.png`). Wer eine Einheit anlegt, die vor ihm steht, braucht danach immer noch den Statusschritt.

### FA-FG-2 · P1 · Statustafel mit Sammeländerung (Schichtwechsel)

**Was der Führungsgehilfe sehen und tun muss** [Annahme]: Zum Schichtwechsel oder nach einer Lagebesprechung setzt er mehrere Einheiten auf einmal, z. B. die Tagschicht von Einsatz auf Ruhe und die Nachtschicht von Ruhe auf Einsatz. Dazu braucht er eine kompakte Tafel, Einheiten als Kacheln oder Zeilen je Abschnitt mit Status und Schicht, auf der er mehrfach markiert und einen Status bzw. eine Schicht für alle setzt. Dieselbe Tafel ist die Pflegeansicht für die Stärketafel/Monitor.

**Was die App schon hat** [beobachtet]:
- Mehrfachauswahl mit Strg+Klick.
- Die Auswahlleiste (`s1/41-mehrfachauswahl.png`).
- Status und Schicht als Ereignisse.

**Wo es heute fehlt** [beobachtet]:
- Bei drei markierten Einheiten bietet die Auswahlleiste nur „Verschieben“, „Zusammenführen“ und „Erfassungsbögen“. Ein Statusschritt fehlt.
- Ein Rechtsklick hebt die Mehrfachauswahl auf und gilt nur noch für eine Einheit („1 GEWÄHLT · FGR N OV SOLTAU“, `s1/41-kontextmenue.png`).
- Der nachgespielte Schichtwechsel mit fünf Einheiten waren 15 Klicks, jede Zeile einzeln anscrollen (`s42.js`). Bei 40 Einheiten wären es über 100 Klicks [Annahme].

### FA-FG-3 · P2 · Einheiten-Auskunft (Rückfragen beantworten)

**Was der Führungsgehilfe sehen und tun muss** [Annahme]: Typische Rückfragen am Telefon oder Funk sind „Wo ist der LZ Bergen?“, „Seit wann ist die FGr WP Celle im Einsatz?“, „Wer ist Gruppenführer der B-Gr 1?“ und „Wann werden wir abgelöst?“. Dafür braucht er eine Karte je Einheit, die nach der Suche sofort aufgeht. Sie zeigt Abschnitt, Status mit „seit“, Eingetroffen und Dauer, verfügbar bis, Stand der Ablösung (angefordert, zugesagt für/von), Aufträge, Personen mit Funktion, Fahrzeuge, Funkrufname und Rufgruppe, Bemerkung und die letzten Tagebuchzeilen.

**Was die App schon hat** [beobachtet]:
- Alle genannten Daten.
- Die Suche (Strg+F).
- „Im Tagebuch zeigen“ im Kontextmenü.
- Den Dialog „Funk und Erreichbarkeit“.
- Die Untertabellen Fahrzeuge/Personen/Aufträge.

**Wo es heute verstreut ist** [beobachtet]:
- Die Zeile in der Tabelle zeigt Status, Abschnitt und Stärke.
- Zeiten und Ablösung stehen in den Ressourcen-Spalten, rechts außerhalb des Bildes (`s1/16a-zeitzelle.png`).
- Personen und Aufträge stehen in den Untertabellen gut 1 350 px unter der gewählten Zeile (Zeile y = 464, Untertabellen y = 1 818, `s1/14a-fullpage-untertabellen.png`). Funktionen der Personen werden nicht angezeigt (`s1/15-untertabellen.png`).
- „Status seit“ und die Einsatzdauer gibt es nirgends. Beides steht nur im Tagebuch, und dort fehlt bei Statuswechseln die Fachzeit (B-FG-6).

### FA-FG-4 · P2 · Nachtrag- und Vollständigkeitsliste

**Was der Führungsgehilfe sehen und tun muss** [Annahme]: Nach einer hektischen Phase arbeitet er nach, was offen ist:
- Einheiten ohne Schicht, ohne Eintreffzeit oder ohne Herkunft,
- abgelaufenes „verfügbar bis“ ohne Ablösung,
- Personenliste ungleich Stärke,
- Rückmarsch ohne Einsatzende,
- Einheiten noch im Bereich „Angefordert / Anmarsch“ mit Status Einsatz.

Jede Zeile führt direkt in die zu ergänzende Zelle.

**Was die App schon hat** [beobachtet]:
- Der Export „Status“ prüft bereits: „Schicht: In der Schichttabelle fehlen 9 Kräfte …, Betroffen: B-Gr OV Hannover“ und „Ohne Pflichtangabe: B-Gr OV Hannover“ (`s1/33-status_…png`).
- Die Marke „abgelaufen“ an „verfügbar bis“.

**Wo es heute verstreut ist** [beobachtet]: Die Prüfungen stehen nur in einer HTML-Datei unter Exporte. Am Bildschirm sagt nichts, dass etwas fehlt.

## Befunde an vorhandenen Ansichten

### B-FG-1 · P1 · Strg+N öffnet „Einheit anlegen“ und „Abschnitt anlegen“ übereinander

- **Beobachtung:** Im Blatt S1 öffnete Strg+N in drei Varianten (ohne Fokus, nach Klick in eine Tabellenzeile, nach Klick auf einen Abschnitt im Baum) jedes Mal **beide** Masken. „Abschnitt anlegen“ liegt oben und hat den Fokus im Feld „Name“ (`s1/38b-strg-n.png`, `s38b.js`, `s38c.js`). Laut Handbuch ist Strg+N im Baum „Abschnitt anlegen“ und in der Einheitenkarte „Einheit anlegen“.
- **Auswirkung im Einsatz:** Der Führungsgehilfe drückt Strg+N, tippt „B-Gr OV Hannover“ und Enter. Dabei entsteht ein **Abschnitt** dieses Namens, und die Einheitenmaske bleibt darunter offen. Unter Zeitdruck merkt das niemand sofort, und der Baum füllt sich mit falschen Abschnitten.
- **Empfehlung:** Strg+N darf genau eine Maske öffnen, abhängig vom Fokus oder als feste Belegung für „Einheit anlegen“ mit eigenem Kürzel für Abschnitte. Zusätzlich einen Test, dass nie zwei `form.maske` gleichzeitig offen sind.
- **Verifikation:** Strg+N in Blatt S1 ohne Fokus, mit Fokus in Tabelle und mit Fokus im Baum drücken. Jedes Mal ist genau eine Maske offen, und es ist die erwartete.

### B-FG-2 · P2 · Knöpfe gesperrt, ohne zu sagen, was fehlt

- **Beobachtung:**
  - „Person erfassen“ hält „Erfassen“ grau, bis Geschlecht **und** Verpflegung gewählt sind. Die Maske nennt das nicht (`s1/15b-person.png`; [Code] `UntertabellenErfassung.tsx`: `[nachname, vorname, geschlecht, ernaehrung].every(...)`).
  - „Einheit anlegen → Ohne Vorlage“ hält den Knopf grau, solange die Ebene fehlt, ebenfalls ohne Hinweis (`s39.js`).
  - Andere Masken machen es vor: „Zusage“ schreibt „Zeit ‚Zugesagt für‘ eintragen“ (`s1/23a-zusage.png`), „Ablösung anfordern“ nennt die fehlenden Felder.
- **Auswirkung im Einsatz:** Wer eine Person nachträgt, deren Kostform er nicht kennt, bleibt hängen und sucht. Am Tisch kostet das Zeit, und die Erfassung unterbleibt.
- **Empfehlung:** Jede Maske nennt neben dem gesperrten Knopf das fehlende Feld. Geschlecht und Verpflegung bei Personen optional machen oder „unbekannt“ anbieten.
- **Verifikation:** Person nur mit Namen erfassen. Entweder es geht, oder neben dem Knopf steht „Geschlecht und Verpflegung wählen“.

### B-FG-3 · P2 · Vorlagensuche findet die eigenen THW-Einheiten schlecht

- **Beobachtung:**
  - Die Suche „Bergung“ findet nichts.
  - Die THW-Vorlagen heißen nur mit Klammerkürzel („(B)“, „(FGr WP (A))“, „(ZTr TZ)“).
  - Die Liste beginnt mit „Lastkraftwagen (1,5 t Nutzlast) mit Ladekran (780 kNm)“ und „(Ergänzungsausstattung)“, und ein Eintrag heißt „Die SEEWA ist gebietsmäßig bundesweit in 3 Module mit jeweils einer Fachgruppe als“.
  - „TZ“ trägt die Stärke 1/1/2, „(VOST)“ 1/13/32 (`s1/07b-vorlage.png`, Ausgabe `s8.js`).
  - Bei Feuerwehr und DRK stehen dagegen Kürzel **und** Langname („Gr San — Gruppe Sanitätsversorgung“).
- **Auswirkung im Einsatz:** Der Führungsgehilfe nimmt eine falsche Vorlage und übernimmt eine falsche Soll-Stärke („TZ“ mit 4 Köpfen), oder er weicht auf „Ohne Vorlage“ aus und tippt alles von Hand. Die Stärke im Lagebild stimmt dann nicht [Annahme zur Ursache: Zuordnung Titel/Stärke im THW-Katalog verrutscht, nicht weiter geprüft].
- **Empfehlung:**
  - THW-Vorlagen wie die anderen mit „Kürzel — Langname“ benennen und nach Langname durchsuchbar machen.
  - Katalogeinträge ohne Einheitencharakter (Fahrzeuge, Fließtext) ausfiltern.
  - Soll-Stärken der THW-Vorlagen gegen die StAN prüfen.
- **Verifikation:** „Bergung“ findet die Bergungsgruppe mit 0/2/7 [Annahme StAN-Wert prüfen], „TZ“ findet den Technischen Zug mit Zugstärke.

### B-FG-4 · P2 · Status ändern: drei Klicks, springende Spalten, verdeckte Zeilen

- **Beobachtung:**
  - Ein Klick auf die Statusmarke öffnet Auswahl, „Übernehmen“ und „Abbrechen“ in der Zelle. Die Statusspalte wird dabei breiter und schiebt Organisation und Herkunft nach rechts (`s1/10-status-menu.png`).
  - Nach einigen Bearbeitungen stand die Tabelle seitlich verschoben, die Statusspalte war halb abgeschnitten (`s1/11-schicht-fehl.png`).
  - Ist eine Zeile gewählt, überdeckt die Auswahlleiste am unteren Rand die letzten sichtbaren Zeilen. Der Doppelklick auf die Schichtzelle von FGr WP OV Celle traf deshalb die Leiste, nicht die Zelle (gleicher Screenshot).
- **Auswirkung im Einsatz:** Langsames, unruhiges Arbeiten. Die nächste Zeile springt unter dem Mauszeiger weg, Fehlklicks in falsche Zeilen werden wahrscheinlicher.
- **Empfehlung:**
  - Status per Tastatur direkt setzbar machen (z. B. Ziffern oder Anfangsbuchstaben bei markierter Zeile).
  - Die Zellbreite beim Öffnen konstant halten.
  - Unter der Auswahlleiste Platz freihalten bzw. die gewählte Zeile darüber halten.
- **Verifikation:** Zehn Status hintereinander ändern. Die Spalten bleiben stehen, keine Zeile liegt unter der Leiste.

### B-FG-5 · P2 · Untertabellen weit weg von der gewählten Zeile

- **Beobachtung:** Fahrzeuge, Personen und Aufträge der gewählten Einheit erscheinen unter der ganzen Tabelle. Bei 20 Einheiten liegt das gut 1 350 px unter der Zeile (`s1/14a-fullpage-untertabellen.png`). „Person erfassen“ öffnet eine eigene Maske, die nach jedem Eintrag schließt. Fünf Personen sind fünfmal „+“, fünf Felder und „Erfassen“.
- **Auswirkung im Einsatz:** Wer eine Personalliste vom Gruppenführer abtippt, scrollt hin und her und sieht dabei die Einheit nicht mehr. Eine Verwechslung der Einheit wird wahrscheinlicher.
- **Empfehlung:**
  - Die Untertabellen neben oder unter der gewählten Zeile aufklappen (oder als Seitenleiste).
  - Bei Personen „Erfassen und nächste“ mit gleichbleibender Kostform/Rolle anbieten.
- **Verifikation:** Zeile wählen. Personen sind ohne Scrollen sichtbar, und fünf Personen gehen ohne erneutes Öffnen der Maske.

### B-FG-6 · P2 · Statuswechsel lassen sich nicht mit der gemeldeten Zeit nachtragen

- **Beobachtung:** Im Tagebuch tragen die Zeilen „Status gesetzt“ keine Fachzeit, nur die Erfassungszeit (`s1/34-tagebuch.png`, z. B. Nr. 98, 100, 102). Zeitfelder (Eingetroffen, Einsatzende, verfügbar bis) haben eine Fachzeit. Die Statuszelle bietet kein Zeitfeld (`s1/10-status-menu.png`). Freie Tagebucheinträge haben dagegen „Zeit der Meldung“ (`s1/35a-eintrag.png`).
- **Auswirkung im Einsatz:** Eine Meldung „FGr E seit 15:40 wieder einsatzbereit“, die um 17:30 vom Zettel nachgetragen wird, steht im Nachweis mit 17:30. Daraus lassen sich Einsatz- und Ruhezeiten nicht belegen. Das betrifft FA-S1-5 im Audit `reviewer-s1.md`.
- **Empfehlung:** Bei Status (und Abschnittswechsel) eine optionale Zeit „gemeldet um“ anbieten, vorbelegt jetzt, wie im Tagebucheintrag.
- **Verifikation:** Status mit Zeit 15:40 nachtragen. Das Tagebuch zeigt Fachzeit 15:40 und Erfassung 17:30.

### B-FG-7 · P2 · Kein Hinweis auf gleichnamige Einheit beim Anlegen

- **Beobachtung:**
  - „Ohne Vorlage“ mit Bezeichnung „LG FF Hambühren“, Feuerwehr, Gruppe, Abschnitt EA 2 Deich Süd: Dieselbe Einheit steht dort schon im Einsatz, trotzdem ist „Einheit anlegen“ aktiv und es gibt keinen Hinweis (`s39.js`). Abgeschickt habe ich nicht.
  - Ebenso schlug „Eingetroffen“ an der Anforderung „Einheit aus der Anforderung anlegen“ vor, obwohl „B-Gr OV Hannover“ schon im Anmarsch stand (`s1/24a-eingetroffen.png`).
- **Auswirkung im Einsatz:** Wenn zwei Arbeitsplätze dieselbe Ankunft erfassen oder ein Funkspruch doppelt ankommt, entstehen Doppelzählungen in der Ist-Stärke [Annahme].
- **Empfehlung:** Beim Anlegen und beim „Eingetroffen → anlegen“ gleichnamige oder ähnliche Einheiten nennen und „verknüpfen“ bzw. „trotzdem anlegen“ anbieten.
- **Verifikation:** Gleichen Namen eintippen, die Maske nennt die vorhandene Einheit mit Abschnitt und Status.

### B-FG-8 · P3 · Spaltenwahl geht beim Neuladen verloren

- **Beobachtung:** Nach einem Neuladen der Seite war die Gruppe „Ressourcen“ wieder ausgeblendet (`s16.js` erster Lauf). Der Umschalter im Blatt Eingang merkt sich seine Wahl dagegen über das Neuladen (Handbuch).
- **Auswirkung im Einsatz:** Nach einem Verbindungsabbruch oder Neuladen sucht der Führungsgehilfe seine Arbeitsspalten wieder zusammen.
- **Empfehlung:** Die Spaltenwahl je Gerät merken, wie die Monitorwahl.
- **Verifikation:** Ressourcen einschalten, neu laden, Ressourcen sind sichtbar.

### B-FG-9 · P3 · Personenliste und gemeldete Stärke werden nicht abgeglichen

- **Beobachtung:** An B-Gr 1 TZ OV Celle sind fünf Personen erfasst (2 Unterführer, 3 Helfer), die Stärke bleibt 0/2/7 = 9 ohne Hinweis (`s1/15-untertabellen.png`). Die Funktionen (GrFü, TrFü, Kraftfahrer, Sprechfunker) erscheinen in der Liste nicht.
- **Auswirkung im Einsatz:** Halbe Personalerfassungen fallen nicht auf. Bei Rückfragen „Wer ist Kraftfahrer?“ muss man die Person öffnen [Annahme].
- **Empfehlung:** In den Untertabellen „5 von 9 erfasst“ anzeigen und die Funktionen in der Personenzeile nennen.
- **Verifikation:** Fünf Personen bei Stärke 9 zeigen „5 von 9“.

## Schluss

- **Aufgabe geschafft:** **mit Umwegen.**
  - Erfassung, Nachtragen, Ankunft und Abmeldung, Schichtwechsel und Rückfragen ließen sich alle erledigen, aber jeweils nur in vielen Einzelschritten an mehreren Stellen.
  - Eine Ankunft kostete rund 15 Handgriffe, ein Schichtwechsel drei Klicks je Einheit.
  - Rückfragen „seit wann“ waren nur über das Tagebuch zu beantworten.
  - Die Stärketafel/Monitor pflegt sich selbst aus der Tabelle. Dort gab es nichts zu tun, aber auch keine Sammeländerung.
- **Größtes Risiko:** Fehlerfassung unter Zeitdruck. Strg+N legt unbemerkt Abschnitte statt Einheiten an (B-FG-1). Gleichnamige Einheiten werden ohne Warnung doppelt angelegt (B-FG-7). Gesperrte Knöpfe ohne Grund lassen Einträge unterbleiben (B-FG-2).
- **Top-Priorität:** B-FG-1 sofort beheben. Danach FA-FG-1 „Meldetisch / Ankunft einbuchen“ bauen, zusammen mit der Sammeländerung aus FA-FG-2. Sie fasst die vier Handgriffe einer Ankunft und den Schichtwechsel in je einen Schritt und nimmt dem Tisch den größten Zeitdruck.
