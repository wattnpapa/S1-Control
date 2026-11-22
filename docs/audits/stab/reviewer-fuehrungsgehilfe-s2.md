# Stab-Review: Führungsgehilfe S2 (Lage)

Datum: 2026-11-22 · laufende Web-Schale http://127.0.0.1:8790 · Playwright/Chromium, 1440 × 900, deviceScaleFactor 1.

Arbeitsplatz: Browser-Kontext `fg`, Anzeigename „FüGeh S2“, Profil „Führungsstelle (S1)“, Stelle **S2**, Handzeichen „Gh“. Eine eigene Stelle „Führungsgehilfe“ bietet die Stellenabfrage nicht an. Daneben arbeiteten der S2 (Hz. „Lg“), der S3 (Hz. „Ei“) und ein FmZ-Platz (Fm1 + Sichter).

Übungseinsatz, Lage und Belege wie in `reviewer-s2.md`: Einsatz **„Review S2S3 Hochwasser Hameln“**, 15 Einheiten in 6 Abschnitten, 13 Eingänge und 6 Ausgänge mit roter Kopie an S2, Tagebucheinträge. Screenshots unter `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/s2s3/` (unten `s2s3/NN-…png`).

Kennzeichnung:

- **[beobachtet]**: in der laufenden App gesehen.
- **[Code]**: aus dem Quelltext gelesen.
- **[Annahme]**: übliche Arbeitsweise am S2-Tisch, keine Vorschrift.

Angenommene Aufgaben des FüGeh S2:

- rote Kopien abarbeiten,
- Lagemeldungen in Lagekarte und Lagetafel nachführen,
- Lagemeldungen (auch telefonische oder mündliche) eintragen,
- Lageunterlagen für die Lagebesprechung vorbereiten.

Nicht geprüft: Erfassungsbögen, QR-Scan und EEB-Import. `@bos/eeb-format` ist ein Platzhalter. Dazu gibt es keine Befunde.

## Urteil aus Sicht des Führungsgehilfen S2

Der FüGeh S2 ist in S1-Control **ein zweiter S2**, mehr nicht:

- Er bekommt dieselben roten Kopien und teilt mit dem S2 den Zustand „gelesen/erledigt“.
- Er hat kein Werkzeug, in das er nachführen könnte. Es gibt keine Lagekarte, keine Lagetafel und keine Schadenskonten.

Das Abarbeiten der roten Kopien geht schnell (Zeile wählen, „Erledigt“). Danach weiß aber niemand am Tisch, *was* damit geschehen ist und *wer* es getan hat.

Eine telefonische Lagemeldung kann er nur auf zwei Wegen eintragen:

- als Tagebucheintrag (Freitext; Akteur ist der Anzeigename, nicht die Stelle),
- als Nachricht mit Gesprächsnotiz (dann läuft sie in den Nachrichtenfluss).

Beides schreibt nichts in ein Lagebild. Die eigentliche Nachführarbeit findet vollständig außerhalb der App statt.

## Fehlende Ansichten

### FA-FG-1 · P1 · Arbeitsliste „Rote Kopien nachführen“ mit Auswertungsvermerk

**Was der FüGeh sehen und tun muss** [Annahme]:

- Eine Abarbeitungsliste aller roten Kopien in Eingangsreihenfolge (Aufnahme- oder Abfassungszeit, nicht Vorrang/Nummer).
- Je Zeile Inhaltsauszug, Abschnittsbezug und Häkchen „Lagekarte“, „Lagetafel“, „Tagebuch“, jeweils mit Handzeichen und Zeit.
- Ein Filter „noch nicht nachgeführt“.
- Bei Schichtwechsel sieht der Nachfolger, was offen ist.

**Was die App schon hat** [beobachtet]:

- Den Posteingang „S2“ mit roter Kopie und den Marken neu, gelesen und erledigt.
- Die Sicht „Offen“ für die Übergabe.
- Die Kenntnisnahme mit Zeit und Handzeichen im Laufzettel („S2 · rot · gelesen 221743NOV26 Lg“, `s2s3/25-s2-lesen.png`).

**Wo es heute verstreut ist** [beobachtet]:

- Der Posteingang sortiert nach Vorrang, dann nach Nummer.
- Eine erledigte Zeile zeigt nicht, wer sie erledigt hat (`s2s3/31-fg-posteingang.png`).
- Die Kenntnis steht nur im aufgeschlagenen Laufzettel.
- Den Zustand „nachgeführt“ gibt es nicht. „Erledigt“ ist der einzige Haken und gilt für die ganze Stelle S2 (Handbuch: „Gelesen und erledigt gelten je Stelle, nicht je Person“).

### FA-FG-2 · P1 · Lagetafel zum Nachführen (Abschnitte, Schadensstellen, Maßnahmen)

**Was der FüGeh sehen und tun muss** [Annahme]: Eine Tafel mit einer Zeile je Schadensstelle oder Ereignis, mit:

- Ort,
- Abschnitt,
- Beschreibung,
- eingesetzten Einheiten,
- Zustand (neu / in Bearbeitung / erledigt),
- Zeit der letzten Meldung.

Neue Zeilen legt er direkt aus einer roten Kopie an, bestehende schreibt er aus einer Meldung fort. In der Übung wären das gewesen:

- Sickerstelle km 3,1, später km 1,6,
- Pflegeheim St. Elisabeth (Keller, dann EG, dann Evakuierung),
- Tiefgarage Rathaus,
- Pumpwerk Ostertor (Pumpe ausgefallen),
- Sperrung B83/Uferstraße.

**Was die App schon hat** [beobachtet/Code]:

- Abschnitte mit taktischem Zeichen.
- Aufträge je Einheit mit Text, Beginn, Ende und Abschnitt (`AuftragZustand`).
- Den Nachrichtenbezug auf Abschnitt oder Einheit.

Eine Entität „Schadensstelle“, „Ereignis“ oder „Lagepunkt“ gibt es nicht [Code: `packages/domaene/src/zustand.ts`].

**Wo es heute verstreut ist** [beobachtet]:

- Die Schadensstelle „Pflegeheim“ steht in E 2, E 6, E 9, E 12, A 15 und A 18.
- Dazu kommt sie in den Auftragstexten von B-Gruppe TZ Rinteln, FGr E Bad Pyrmont und B-Gruppe TZ Stadthagen vor.
- In der Anforderung ANF-4 steht sie als „Evakuierung Pflegeheim St. Elisabeth“.

### FA-FG-3 · P2 · Erfassung „Lagemeldung“ (strukturiert, ohne Nachrichtenweg)

**Was der FüGeh sehen und tun muss** [Annahme]: Eine kurze Maske für Lagemeldungen, die nicht als Vordruck über die FmZ kommen (Telefonat mit dem EAL, Meldung vor Ort, Lagebesprechung). Felder:

- Zeit,
- Quelle,
- Abschnitt,
- Kategorie (Lage, Messwert, Gefahr, Kräfte),
- Text,
- optional Messwert (z. B. Pegel).

Das Ergebnis landet im Tagebuch **und** im Lagebild des Abschnitts.

**Was die App schon hat** [beobachtet]:

- „Eintrag hinzufügen“ im Tagebuch mit „Was wurde gemeldet?“, Quelle (Funk, Telefon, Meldung vor Ort, Lagebesprechung, Sonstiges) und „Zeit der Meldung“.
- Die Gesprächsnotiz in der Nachrichtenmaske.

**Wo es heute verstreut ist** [beobachtet]: Der Tagebucheintrag kennt keinen Abschnitt und keine Einheit, nur Freitext. „Auf die Auswahl beschränken“ findet ihn deshalb später nicht über einen Abschnitt.

### FA-FG-4 · P2 · Druckbare Lagetafel / Lagekartenbeilage für die Papier-Rückfallebene

**Was der FüGeh sehen und tun muss** [Annahme]: Vor jeder Lagebesprechung einen Ausdruck „Lage je Abschnitt, Stand hh:mm“, der neben die analoge Lagekarte gehängt wird. Er muss auch weiterhelfen, wenn der Rechner ausfällt.

**Was die App schon hat** [beobachtet]:

- Exporte „Druck – Stärke je Bereich für die Lagekarte“, „Führungsorganisation – Als PDF (Lagekarte)“, Einheitenliste, Tagebuch mit Notizspalte.
- Leere Papier-Vordrucke (Meldeblock, Nachrichtenvordruck) unter „Betrieb ohne Rechner“ (`s2s3/27-exporte.png`).

**Wo es heute verstreut ist** [beobachtet]: Lageinhalte stehen nur im Tagebuch-Export (chronologisch, mit allen FmZ-Vermerken). Ein Ausdruck je Abschnitt fehlt.

## Befunde an vorhandenen Ansichten

### B-FG-1 · P1 · Zwei Plätze mit Stelle S2 teilen Lese- und Erledigt-Zustand ohne Personenbezug

**Beobachtung** [beobachtet]:

- Der S2 (Lg) öffnete E 9. Am FüGeh-Platz (Gh) stand E 9 sofort als „gelesen“, obwohl Gh die Nachricht nie gesehen hatte.
- Gh setzte E 8, E 10 und E 13 über die Auswahlleiste auf „Erledigt“, ohne sie zu öffnen. Die Liste zeigt „gelesen erledigt“, also gilt die Nachricht auch als gelesen.
- Wer erledigt hat, steht in der Liste nicht (`s2s3/31-fg-posteingang.png`).
- Die Statuszeile nennt die anderen nur als „2 weitere: S2“, ohne Anzeigename oder Handzeichen.

**Auswirkung**:

- Der S2 sieht „erledigt“ und nimmt an, die Meldung sei in der Lage eingearbeitet.
- Der FüGeh sieht „gelesen“ und überspringt eine Meldung, die nur der S2 gelesen hat.
- Arbeitsteilung am Tisch ist nur mündlich möglich, und eine Meldung kann unbearbeitet durchrutschen.

**Empfehlung**:

- Lesen und Erledigen je Person (Handzeichen) anzeigen, auch in der Listenzeile („erledigt Gh 1748“).
- Erledigen ohne Öffnen nicht als „gelesen“ ausgeben.
- Für die rote Kopie den Auswertungsvermerk aus FA-FG-1 vorsehen.

**Verifikation**: Zwei S2-Plätze. A öffnet E 1, und B sieht „gelesen · A“, nicht „gelesen“ für sich. B erledigt E 2, und A sieht in der Zeile „erledigt · B“.

### B-FG-2 · P2 · Keine Stelle für Führungsgehilfen; FüGeh muss „S2“ wählen

**Beobachtung** [beobachtet]:

- Die Stellenabfrage bietet LdF, Fm1 bis Fm3, Sichter, Leiter, S1 bis S4, S6, Fachberater, Verbindungsstelle und „Weitere Stelle (frei)“.
- Mit einer freien Stelle „FüGeh S2“ bekäme der Platz keine rote Kopie, denn der Sichter setzt die rote Kopie an „S2“ [Annahme aus dem Verteilerraster; nicht ausprobiert]. Deshalb trat Gh als S2 auf.

**Auswirkung**: Im Laufzettel und in der Statuszeile ist nicht zu unterscheiden, ob der S2 oder sein Gehilfe gehandelt hat. Das betrifft den Nachweis, wer eine Lagemeldung zur Kenntnis genommen hat.

**Empfehlung**: Eine Zusatzangabe „Gehilfe von S2“ (Stelle S2, Rolle FüGeh), die Kopien der Stelle erhält, aber im Vermerk als „S2/FüGeh · Gh“ zeichnet.

**Verifikation**: Platz mit „S2 (Gehilfe)“ öffnet E 1. Der Laufzettel zeigt „S2 · rot · gelesen … Gh (FüGeh)“.

### B-FG-3 · P2 · Tagebucheintrag ohne Abschnitt, Stelle und Handzeichen

**Beobachtung** [beobachtet]: Die Maske „Eintrag ins Einsatztagebuch“ hat drei Felder: Text, Quelle und Zeit. Der gespeicherte Eintrag trägt als Akteur den Anzeigenamen („Arbeitsplatz“ am S2-Platz, `s2s3/28-tagebuch-suche-lage.png`), nicht „S2 · Gh“. Ein Abschnitts- oder Einheitsbezug ist nicht wählbar.

**Auswirkung**: Telefonische Lagemeldungen, die der FüGeh einträgt, lassen sich weder einem Abschnitt zuordnen noch einer Stelle. Über „Auf die Auswahl beschränken“ (Abschnitt in der Lage gewählt) sind sie nicht zu finden.

**Empfehlung**: Optionaler Bezug (Abschnitt/Einheit) im Eintrag. Zeichnung mit Stelle und Handzeichen der Sitzung.

**Verifikation**: Eintrag „Pegel 6,28 m“ mit Bezug EA 1. Die Lage mit gewähltem EA 1 und „Im Tagebuch zeigen“ listet ihn, Akteur „S2 · Gh“.

### B-FG-4 · P2 · Tagebuch zeigt nur die neuesten 100 Einträge, sortiert nach Erfassung

**Beobachtung** [beobachtet/Code]:

- Nach knapp vier Stunden stand „100 von 173 Einträgen“. Ein Nachladen gibt es nicht (`renderer/Tagebuch.tsx`, `NACHRICHT_SEITE = 100`).
- Nachgetragene Einträge (Fachzeit 15:00, erfasst 17:44) stehen oben vor Meldungen von 17:32.

**Auswirkung**: Der FüGeh kann die Lageentwicklung nicht von Beginn an durchgehen, um die Lagekarte zu prüfen oder nachzuziehen.

**Empfehlung**: Blättern bzw. Nachladen sowie Sortierung nach Fachzeit (siehe B-S2-3, B-S2-5a).

**Verifikation**: Der erste Eintrag des Einsatzes ist ohne Suchtrick erreichbar. Ein nachgetragener 15:00-Eintrag steht zwischen 14:50 und 15:10.

### B-FG-5 · P3 · Hinweisstapel überdeckt Bedienelemente

**Beobachtung** [beobachtet]:

- Nach 13 aufgenommenen Eingängen stapelten sich am FmZ-Platz fast 30 Hinweise im Hinweisanker („In der Nachweisung unter Nummer n eingetragen“, „Kein LdF besetzt …“, „Funkplan: Kontakt mit … vermerkt“).
- Auf der Einsatzauswahl verdeckte der Hinweis „Der Einsatz wurde geschlossen“ den Knopf „Neuer Einsatz …“, sodass er nicht klickbar war (`s2s3/08-hinweis-verdeckt.png`).

Für den FüGeh relevant, weil er am selben Gerät oft auch Eingänge aufnimmt [Annahme].

**Auswirkung**: Wichtige Knöpfe sind bis zum Schließen der Hinweise blockiert; relevante Hinweise gehen im Stapel unter.

**Empfehlung**: Erfolgsmeldungen nach kurzer Zeit selbst schließen oder zusammenfassen („13 Eingänge aufgenommen“). Den Hinweisanker nicht über Hauptknöpfe legen.

**Verifikation**: Nach 13 Aufnahmen stehen höchstens drei Hinweise, und „Neuer Einsatz …“ ist mit Hinweis sichtbar und klickbar.

## Schluss

- **Aufgabe geschafft:** mit Umwegen. Das Abarbeiten der roten Kopien gelang, das Nachführen nicht, weil die App dafür kein Ziel hat (Lagekarte und Lagetafel fehlen). Lagemeldungen ließen sich nur als Freitext ohne Abschnitt eintragen.
- **Größtes Risiko:** Der gemeinsame „gelesen/erledigt“-Zustand zweier S2-Plätze (B-FG-1) erzeugt falsche Sicherheit. Eine Meldung wirkt bearbeitet, ohne dass sie jemand in die Lage eingearbeitet hat.
- **Top-Priorität:** FA-FG-1 (Arbeitsliste rote Kopien mit Auswertungsvermerk je Handzeichen). Sie ist klein, nutzt vorhandene Daten (Kopie, Kenntnis, Handzeichen) und schließt das größte Risiko. Danach FA-FG-2 (Lagetafel).
