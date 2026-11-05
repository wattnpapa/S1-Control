# THW-Rollen-Audit: Sichter

- **Datum:** 05.11.2026
- **Rolle:** Sichter in der Führungsstelle. Jede Meldung geht über meinen Tisch: lesen, Vorrang einstufen, an Sachgebiet oder Führungskraft geben, prüfen, dass nichts liegen bleibt.
- **Material:** S1-Control v2, Stand HEAD (`ffc3125`), eigene Web-Schale auf Port 8218 mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten). Profil „Führungsstelle (S1)“, denn ein Profil für die Sichtung gibt es nicht. Drei Browserkontexte: „Sichter 1“, „Sichter 2“ und ein Meldekopf („Meldekopf BR Hafen“, Betriebsart Meldekopf). Erzeugtes Aufkommen über die Oberfläche:
  - 12 Meldungen als Einsatztagebuch-Einträge („Eintrag hinzufügen“), davon 2 BLITZ, 4 SOFORT und 6 Routine, über Funk, Telefon, Meldung vor Ort, Lagebesprechung und Sonstiges, Meldezeiten von 19:55 bis 20:44 Uhr, eine weitere BLITZ-Meldung um 20:59 Uhr.
  - 40 Erfassungsbögen über den Handscanner-Weg (Strg+Q) und den Meldekopf eingelesen (echte Bögen aus `pruefdaten/eeb/thw`, als Scan-Text eingetippt), dazu eine geänderte zweite Fassung (Cloppenburg).
  - 3 Anforderungen.
  - Bedient wurden „Übernahme zurück“, „Ablehnen mit Grund …“ (zweimal gleichzeitig von zwei Sichtern), Filterchips, Auswahlleiste, Kontextmenü, Verschieben in der Lage und die Tagebuchsuche.
  - Screenshots: `/tmp/claude-0/-home-user-S1-Control/5e4b7d40-2c4b-58c0-a32e-96410bb256d6/scratchpad/shots/sichter/` (Dateinamen unten in Klammern).
- **Kennzeichnung:** **[beobachtet]** an der laufenden Anwendung gesehen · **[Code]** aus dem Quelltext belegt (Datei:Zeile) · **[Annahme]** begründete Vermutung oder unsicherer THW-Ablauf · **[nicht prüfbar]** in dieser Umgebung nicht nachvollziehbar.

---

## Urteil

Als Sichter kann ich mit S1-Control **nicht ohne Papier arbeiten**. Das Programm kennt keine „Nachricht“ im Sinne meiner Rolle. Der **Eingangskorb** ist ein gut gemachter Korb für **Erfassungsbögen** (Einheitenanmeldungen): Es gibt die Ampel, Pflichtgrund beim Ablehnen, nichts verschwindet, die Fassungen werden gezählt, Filterchips und Auswahlleiste sind brauchbar. Funksprüche, Anrufe, Fax und Lagemeldungen haben dagegen nur einen Ort: das **Einsatztagebuch** mit „Eintrag hinzufügen“ (Text, Quelle, Zeit). Dort fehlen:

- eine Vorrangstufe,
- ein Empfänger (Sachgebiet oder Führungskraft),
- „gelesen“ und „erledigt“,
- ein Weg, einen Eintrag zu berichtigen.

Drei der fünf Prüfaufgaben (an zwei Sachgebiete weiterleiten, eine Fehlzuweisung umleiten, offene Meldungen älter als 30 Minuten finden) gehen für Nachrichten **gar nicht**. Für Bögen gehen sie nur teilweise.

Dazu kommen zwei handfeste Fehler auf meinem Weg:

1. Ein Bogen, den ich scanne, während der vorige noch geschrieben wird, **geht ohne jede Meldung verloren** (P0).
2. Ein Tagebucheintrag ohne eingetippte Uhrzeit, also der Normalfall „jetzt“, **wird immer mit „Invalid ISO datetime“ abgewiesen** (P1).

Die Zahl „offen“ am Reiter Eingang sagt mir nicht, was neu angekommen ist. Neue Bögen stehen sofort als „Übernommen“ da.

**Zählung:** 1 × P0 · 4 × P1 · 5 × P2 · 3 × P3

---

## Findings

### P0-1 · Ein Scan während der laufenden Übernahme verschwindet stumm

- **Priorität:** P0
- **Fundstelle / Aufgabe:** Aufgabe 1 und 5, Lage › „Erfassungsbogen einlesen“ (Strg+Q), gleiche Maske im Meldekopf. Code: `apps/desktop/src/worker/aktendienst.ts:1334` (`this.eebZuruecksetzen()` am Ende von `eebUebernehmen`, nachdem alle Ereignisse geschrieben sind).
- **Beobachtung [beobachtet]:**
  - Ich habe Bogen „Eschweiler“ gescannt und „Übernehmen“ geklickt. 200 ms später habe ich den nächsten Bogen („Grevenbroich“) gescannt, wie man es mit einem Handscanner im Takt tut. Nach 2,5 s stand im Scanfeld „Noch nichts gescannt.“ und darunter nur „Übernommen: 16 Ereignisse geschrieben.“ für Eschweiler.
  - Grevenbroich war weg: Es gab keine Vorschau, keinen Hinweis und keinen Eintrag im Korb (30-scan-verloren.png).
  - Mit 3 s Pause dazwischen ging es (Duisburg wurde gelesen).
  - Beim Massenscan (24 Bögen, je 0,7 s Pause) fehlten so 5 von 24 Bögen. Ich habe es nur bemerkt, weil mein Skript nachzählte (29-scan-fehler.png).
  - **[Code]:** Der Aktendienst setzt den Sammelstand erst **nach** dem Schreiben aller Ereignisse zurück und löscht dabei einen inzwischen vollständig gelesenen neuen Scan mit.
- **Erwartung der Rolle:** Jeder gelesene Bogen ist entweder in der Vorschau, im Korb oder mit einer Fehlermeldung sichtbar. Der Scanner nimmt den nächsten erst an, wenn er ihn auch behalten kann, oder er hält ihn fest.
- **Auswirkung im Einsatz:**
  - Am Meldekopf oder in der Führungsstelle laufen bei Eintreffen eines Verbands viele Bögen kurz hintereinander ein. Einer fehlt danach, ohne dass es jemand merkt.
  - Die Einheit steht nicht in der Lage, ihre Stärke fehlt in der Ist-Stärke, und der Zugführer hält seinen Bogen für abgegeben.
  - Das ist genau die „verlorene Nachricht“, die der Sichter verhindern soll.
- **Empfehlung:** Solange eine Übernahme läuft, das Scanfeld sichtbar sperren („Wird geschrieben …“) oder den neuen Scan sicher zurückhalten. Ein verworfener vollständiger Scan muss laut gemeldet werden („Bogen nicht angenommen, bitte erneut scannen“).
- **Verifikation:**
  1. Zehn Bögen im Abstand von 0,2 s scannen und jeweils sofort übernehmen.
  2. Danach müssen im Korb genau zehn neue Zeilen stehen, oder für jeden nicht angenommenen Scan muss eine sichtbare Fehlermeldung erscheinen.

### P1-1 · Es gibt keinen Nachrichtenweg: kein Vorrang, kein Empfänger, kein „erledigt“

- **Priorität:** P1, weil die gesamte Rolle nur mit Papier möglich ist. Für BLITZ-Meldungen grenzt es an P0.
- **Fundstelle / Aufgabe:** Aufgaben 1, 2, 3 und 4. Einsatztagebuch › „Eintrag hinzufügen“ (09-eintrag-maske.png). Code:
  - `apps/desktop/src/renderer/TagebuchEintrag.tsx:24`: Quellen Funk/Telefon/Meldung vor Ort/Lagebesprechung/Sonstiges, die Felder Text, Quelle und Zeit stehen in Zeile 66–94.
  - `packages/domaene/src/katalog/schemata.ts:464-474`: `EtbEintragErfasst` hat nur `etbId`, `zeitpunkt`, `text` und optional `bezug`.
  - In `packages/domaene/src` und `apps/desktop/src` gibt es kein Feld für Sachgebiet, Empfänger, Vorrang oder Quittung.
- **Beobachtung [beobachtet, Code]:**
  - Die einzige Stelle für einen Funkspruch oder Anruf ist der Tagebucheintrag. Den Vorrang musste ich als Wort in den Text schreiben („BLITZ: …“), den Absender ebenfalls („Absender: EA Deich Nord“).
  - Eine Zuweisung an S2/S3/S4 oder an den Leiter gibt es nicht, also auch nicht an zwei zugleich.
  - Ein Eintrag hat keinen Zustand: Er ist weder offen, gelesen noch erledigt.
  - „Alle offenen Meldungen älter als 30 Minuten“ lässt sich deshalb nicht beantworten. Die BLITZ-Meldung „Deichbruch droht km 12,4“ von 19:55 Uhr war um 20:50 Uhr nicht von der erledigten Funkprobe zu unterscheiden.
  - Das Profil „Führungsstelle (S1)“ ist das nächstliegende. Ein Profil oder Blatt für die Sichtung gibt es nicht (02-einstellungen.png).
  - Bezeichnend ist, dass der **Papier-Meldeblock** des Programms selbst alles hat, was die Maske nicht hat: „Von“, „An“, „Weg“, „Dringlichkeit: ☐ normal ☐ dringend ☐ Blitz“, „Maßnahme / Antwort“, „Quittiert (Uhrzeit)“ (`packages/ausgaben/src/papier.ts:66-79`). Nachgetragen werden kann davon nur der Text.
- **Erwartung der Rolle:**
  - Ein Eingang für alle Meldungen, egal über welchen Weg.
  - Je Meldung Vorrang (mindestens normal/sofort/Blitz), Absender, Weg, Uhrzeit und ein oder mehrere Empfänger.
  - Je Empfänger der Zustand „zugestellt → gelesen → erledigt“.
  - Eine Ansicht „offen, älter als …“.
  - **[Annahme]:** So läuft die Sichtung mit dem Nachrichtenvordruck und der Verteilung an die Sachgebiete in der Führungsstelle nach DV 1-100. Einzelheiten des Vordrucks nenne ich hier bewusst nicht.
- **Auswirkung im Einsatz:**
  - Ich führe die Sichtung vollständig auf Papier (Vordruck, Nachweisung, Verteilerkästen) und trage danach jede Meldung zusätzlich als Freitext ins Tagebuch ein. Das ist Doppelarbeit.
  - Die Software weiß nicht, ob eine BLITZ-Meldung bei S3 angekommen ist.
  - Der Leiter sieht im Programm keine offenen Meldungen.
- **Empfehlung:** Ein eigenes Blatt (oder ein Umschalter „Nachrichten“ im Blatt Eingang) mit den Feldern des eigenen Meldeblocks: Vorrang, Absender, Weg, Uhrzeit, Empfänger (Mehrfachwahl Sachgebiete und Führungskräfte), Maßnahme. Dazu:
  - Zustand je Empfänger,
  - Filterchips „Blitz / Sofort / offen / älter als 30 min“,
  - Zähler am Reiter,
  - Tagebuchzeile automatisch.
- **Verifikation:**
  1. Eine BLITZ-Meldung an S3 und S4 erfassen.
  2. An einem zweiten Platz mit Profil S3 steht sie oben und auffällig.
  3. S3 quittiert, und beim Sichter wechselt die Zeile auf „S3 gelesen, S4 offen“.
  4. Nach 30 min erscheint sie unter „älter als 30 min“.

### P1-2 · Tagebucheintrag ohne Zeit wird immer abgewiesen („Invalid ISO datetime“)

- **Priorität:** P1
- **Fundstelle / Aufgabe:** Aufgabe 1, Einsatztagebuch › „Eintrag hinzufügen“, Feld „Zeit der Meldung“ leer („leer = jetzt“). Code:
  - `apps/desktop/src/renderer/TagebuchEintrag.tsx:46-47`: `etbId` und `gesetzt` holen beide `versuch.kennung(...)`.
  - `apps/desktop/src/renderer/Anlegeversuch.tsx:73-76`: `kennung` hält **einen** Wert (`gehalten.current ??= erzeuge()`), deshalb bekommt `gesetzt` die ETB-Kennung statt eines Zeitstempels.
- **Beobachtung [beobachtet, zweimal]:**
  - Jeder Eintrag ohne Uhrzeit endete mit „Nicht gespeichert – Die Nutzlast für EtbEintragErfasst ist nicht gültig: zeitpunkt — Invalid ISO datetime“ (09b-fehler.png, 45-eintrag-ohne-zeit-fehler.png).
  - Mit eingetippter Uhrzeit (z. B. „2040“) ging derselbe Text sofort durch.
  - Die Maske bleibt mit dem Text stehen, verloren geht also nichts.
- **Erwartung der Rolle:** Leer heißt „jetzt“, wie es im Feld steht. Bei einem Fehler steht ein Satz in meiner Sprache da, nicht der Name einer Nutzlast.
- **Auswirkung im Einsatz:**
  - Gerade bei der dringendsten Meldung, die ich sofort aufschreibe, scheitert das Speichern.
  - Wer die Ursache nicht errät, bricht ab und schreibt auf Papier. Wer unter Druck „Abbrechen“ drückt, hat die Meldung nicht im System.
- **Empfehlung:** Leere Zeit als Jetzt-Zeit speichern. Abweisungen des Dienstes in Helfersprache übersetzen („Zeit nicht lesbar – leer lassen oder z. B. 0630“).
- **Verifikation:**
  1. Text eintippen, Zeit leer lassen, „Eintrag speichern“.
  2. Der Eintrag steht im Tagebuch mit „Zeit der Meldung“ gleich der Erfasst-Zeit.
  3. Ein Regressionstest deckt den Fall „Zeit leer“ ab.

### P1-3 · „offen“ am Reiter und im Korb zeigt nicht, was neu angekommen ist

- **Priorität:** P1
- **Fundstelle / Aufgabe:** Aufgaben 1 und 5, Reiter „Eingang n“, Kopf „Eingangskorb — n offen“, Ampel. Code:
  - `apps/desktop/src/worker/aktendienst.ts:1292-1336` (Scan übernimmt sofort) und `:1351-1412` (Bündel ebenso).
  - `packages/domaene/src/fold.ts:1932-1939`: „NEU“ nur ohne Übernahme.
  - `packages/domaene/src/kennzahlen.ts:745-748`: „offen“ = NEU + GEÄNDERT.
  - `apps/desktop/src/renderer/laden.ts:757`: Der Korb wird nur nachgeladen, wenn er schon einmal geholt wurde.
- **Beobachtung [beobachtet]:**
  - **Neuankünfte zählen nicht.** Nach 12 eingelesenen Bögen stand „Eingangskorb — 0 offen“, alle 12 standen als „Übernommen“ (11-korb-12.png). Ein Bogen, den der Meldekopf einlas, erschien bei mir sofort als „Übernommen“, und die Zahl blieb bei 3 (39-fuest-nach-meldekopf.png). „Neu“ entstand nur, wenn ich selbst „Übernahme zurück“ drückte.
  - **Die Zahl am Reiter fehlt, bis man den Korb einmal geöffnet hat.** An einem frisch geöffneten Platz stand „Eingang“ ohne Zahl, obwohl 3 offen waren. Erst nach einem Besuch im Eingang stand „Eingang 3“ (47-reiter-ohne-zahl.png). „Sichter 2“ sah die Zahl ebenfalls nicht, bis er den Korb öffnete.
  - **Eine alte Fassung bleibt dauerhaft offen.** Nach der zweiten Fassung „Cloppenburg“ stand die erste als „Geändert · 1 von 2“, die zweite als „Übernommen · 2 von 2“. Die alte zählt weiter als offen, obwohl die neue schon übernommen ist (31-korb-last-1366.png). Eine Handlung, die sie auf „erledigt“ bringt, gibt es nicht. Ablehnen wäre fachlich falsch.
  - Die Einstiegszeile sagt „Gemeldete Erfassungsbögen, bevor sie in die Lage übernommen werden“. Tatsächlich sind sie alle schon übernommen.
- **Erwartung der Rolle:** Die Zahl am Reiter sagt in jedem Moment und an jedem Platz: So viele Eingänge hat noch kein Mensch angesehen. Sie geht nur herunter, wenn jemand etwas getan hat.
- **Auswirkung im Einsatz:**
  - Ich verlasse mich auf die Marke und sehe „0“ oder nichts, während der Meldekopf gerade einen Zug angemeldet hat.
  - Umgekehrt bleibt die Marke wegen der alten Fassungen nie auf 0 und wird zum Dauerrauschen, das man übersieht.
- **Empfehlung:**
  - Einen Zustand „ungesichtet“ unabhängig von der Übernahme führen (gesehen/quittiert am Platz oder durch den Sichter).
  - Die Marke unabhängig vom Besuch des Blatts laden.
  - Ältere Fassungen, deren jüngere übernommen ist, nicht als offen zählen.
- **Verifikation:**
  1. Meldekopf scannt einen Bogen.
  2. Ein Führungsstellen-Platz, der den Korb noch nie geöffnet hat, zeigt binnen Sekunden „Eingang 1“.
  3. Nach „gesehen“ steht 0.
  4. Eine zweite übernommene Fassung erhöht die Zahl nicht dauerhaft.

### P1-4 · Ein Meldungseingang lässt sich nicht berichtigen, umleiten oder zuordnen

- **Priorität:** P1
- **Fundstelle / Aufgabe:** Aufgabe 3, Einsatztagebuch, Zeilen ohne Klick- und Kontextmenü (22-etb-rechtsklick.png). Code:
  - `packages/domaene/src/katalog/index.ts:414` und `schemata.ts:477-482`: `EtbEintragBerichtigt` ist im Katalog vorhanden, wird aber in `apps/desktop/src` nirgends geschrieben (nur `anlagenamenpruefung.ts:18`).
  - `schemata.ts:468-473`: `bezug` (Einheit, Abschnitt, Fahrzeug, Anforderung) ist in der Maske nicht wählbar.
- **Beobachtung [beobachtet]:**
  - Durch einen wiederholten Lauf standen sieben meiner Meldungen doppelt im Tagebuch. Ein Rechtsklick oder Doppelklick auf die Zeile tut nichts.
  - Es gibt keinen Weg, einen Eintrag als Doppel, falsch adressiert oder berichtigt zu kennzeichnen. „Nur Rücknahmen und Berichtigungen“ ist als Filter da, erzeugen kann ich eine Berichtigung nicht.
  - Eine Meldung lässt sich auch nicht an die betroffene Einheit oder den Abschnitt hängen. „Auf die Auswahl beschränken“ findet sie deshalb nicht.
  - Für Bögen funktioniert das Umleiten: Einheit in der Lage wählen, Strg+M, Ziel wählen, „Verschieben“, mit Bestätigung „✓ Einheit ‚#6 Hallenberg-Hesborn‘ verschoben · gespeichert“ und Rückgängig (41-verschieben-maske.png, 42-nach-verschieben.png). Das geht aber nur in der Lage und nicht aus dem Korb, und der Korb zeigt den Abschnitt gar nicht (siehe P2-2).
- **Erwartung der Rolle:** Eine falsch eingeordnete Meldung kann ich mit Grund berichtigen oder neu zuordnen. Die alte bleibt durchgestrichen sichtbar, die neue Zuordnung gilt.
- **Auswirkung im Einsatz:**
  - Doppel- und Fehleinträge bleiben unkommentiert im Tagebuch stehen und werden in der Akte für bare Münze genommen.
  - Auf Papier würde ich durchstreichen und abzeichnen. Hier muss ich einen dritten Freitexteintrag „Eintrag von 20:47 ist doppelt“ schreiben.
- **Empfehlung:** An jeder eigenen Tagebuchzeile „Berichtigen …“ (mit Pflichtgrund, wie beim Ablehnen) und „Bezug setzen …“. Im Korb ein „Abschnitt ändern …“ in der Auswahlleiste.
- **Verifikation:** Einen doppelten Eintrag berichtigen. Das Tagebuch zeigt den alten durchgestrichen mit Grund und Akteur, der Filter „Nur Rücknahmen und Berichtigungen“ findet ihn.

### P2-1 · Im Tagebuch gehen Meldungen unter, BLITZ fällt nicht auf

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Aufgaben 1 und 4, Einsatztagebuch (10-tagebuch-nach12.png, 19-etb-blitz.png).
- **Beobachtung [beobachtet]:**
  - 12 eingelesene Bögen erzeugten rund 200 Tagebuchzeilen („Person hinzugefügt — …“, „Fahrzeug angelegt — #22 (auf Anh)“, „9c961d4a: Erfassungsbogen übernommen: (leer) → einheitId: E-0c322ee3, uebernommeneFelder: abschnittId, bemerkung, …“). Meine 13 Meldungen standen in 343 Zeilen.
  - Einen Filter „nur Meldungen/Tagebucheinträge“ gibt es nicht. Ich musste nach dem Wort „Tagebucheintrag“ suchen.
  - Sortiert wird nach „Erfasst“, nicht nach „Zeit der Meldung“. Die älteste BLITZ-Meldung (19:55) steht deshalb unter jüngeren Routinemeldungen.
  - BLITZ ist weder farblich noch durch eine Marke hervorgehoben. Es ist nur das Wort im Text, das ich selbst getippt habe.
- **Erwartung der Rolle:** Meldungen von Menschen getrennt von Systemprotokoll, Dringendes oben und auffällig.
- **Auswirkung im Einsatz:** Wer das Tagebuch als Ersatz-Eingang nutzt, scrollt an der BLITZ-Meldung vorbei. Die Suche hilft nur, wenn alle das Wort gleich schreiben.
- **Empfehlung:**
  - Filterchip „Meldungen“ (nur `EtbEintragErfasst`).
  - Sortierung wahlweise nach Meldezeit.
  - Bis P1-1 gelöst ist, wenigstens eine Vorrang-Auswahl im Eintrag mit sichtbarer Marke.
  - Die Systemzeilen der Bogenübernahme zu einer lesbaren Zeile je Bogen zusammenfassen.
- **Verifikation:** Nach 12 Bogenscans und 13 Meldungen zeigt ein Klick auf „Meldungen“ genau 13 Zeilen, BLITZ steht markiert oben.

### P2-2 · Die Korbzeile sagt nicht, woher und wohin

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Aufgaben 1 und 3, Eingangskorb, Spalten Zustand/Einheit/Org./Stärke/Stand/Empfangen/Signatur/Fassung. Code: `apps/desktop/src/renderer/Eingangskorb.tsx:175-182`, Spaltenköpfe. `Meldungszeile.quelle` liegt vor (`packages/domaene/src/projektion/meldung.ts`), wird aber nicht gezeigt.
- **Beobachtung [beobachtet]:**
  - Es gibt keine Spalte für den Übermittlungsweg (Scan, Bündel, Meldekopf), für den aufnehmenden Platz oder für den Abschnitt, in den der Bogen ging.
  - „Org.“ zeigt die Zahl „1“ statt „THW“ (11-korb-12.png).
  - Bei einer abgelehnten Zeile sehe ich weder Grund noch Akteur. Die Auswahlleiste zeigt nur „Ablehnung zurück“ (43-korb-abgelehnt-gewaehlt.png). Den Grund fand ich im Tagebuch nur über die Suche „abgelehnt“, und dort steht der Bogen als „a3c4d929:“ statt mit Namen (18-etb-syke.png).
  - In Lage und Tagebuch tragen eingelesene Einheiten Codes wie „#6 Hallenberg-Hesborn“, „#4 Syke“, Geräte „#7, #16, #45“ und die Bogen-ID „org:1||c6|hallenberg-hesborn“ (40-lage-hesborn.png).
- **Erwartung der Rolle:** Je Zeile: von wem, über welchen Weg, wann, wohin gegeben, von wem bearbeitet. Lesbar und ohne interne Schlüssel.
- **Auswirkung im Einsatz:** Rückfragen („Wo ist die BGr Syke hin? Wer hat sie abgelehnt und warum?“) kann ich am Korb nicht beantworten, sondern muss zwischen Korb, Lage und Tagebuch springen.
- **Empfehlung:** Spalten „Weg“, „Aufgenommen von“ und „Abschnitt“. Ablehnungsgrund und Akteur in der Zeile oder im Tooltip. Organisations- und Typcodes als Klartext auflösen.
- **Verifikation:** Ein am Meldekopf gescannter Bogen zeigt im Korb „Meldekopf BR Hafen · Scan · Bereitstellungsraum Hafen · THW“. Eine abgelehnte Zeile nennt Grund und Akteur.

### P2-3 · Zwei Sichter arbeiten blind nebeneinander

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Prüffrage „zwei Sichter parallel“, Eingangskorb › „Ablehnen mit Grund …“.
- **Beobachtung [beobachtet]:**
  - Sichter 1 und Sichter 2 wählten gleichzeitig „Syke“ und lehnten zeitgleich ab, mit den Gründen „Falscher Einsatz – gehört zu Übung Hunte“ und „Doppelt gemeldet“.
  - Beide Masken schlossen ohne Hinweis. Im Korb steht eine Ablehnung, im Tagebuch stehen zwei mit verschiedenen Gründen in derselben Sekunde (17-parallel-A.png, 17-parallel-B.png, 18-etb-syke.png).
  - Keiner sah, dass der andere die Zeile gerade bearbeitete. Eine Bearbeitungssperre oder Anzeige „in Bearbeitung durch …“ hat der Korb nicht.
  - Neue Tagebucheinträge des einen erschienen beim anderen nach rund 4 s, aber ohne Markierung als neu (46-B-sieht-blitz.png).
  - Der Zähler „Konflikthinweise“ in der Statuszeile stieg im Lauf der Prüfung von 8 auf 26. Welche Ursache dahinter steckt, habe ich nicht nachvollzogen **[nicht prüfbar]**.
- **Erwartung der Rolle:** Wenn wir zu zweit sichten, sehe ich, welche Zeile der andere gerade hat. Bei gleichzeitigem Handeln sagt mir das Programm, dass mir jemand zuvorgekommen ist und mit welchem Ergebnis.
- **Auswirkung im Einsatz:** Doppelbearbeitung und widersprüchliche Gründe in der Akte. Bei Nachrichten mit Empfängern (P1-1) würde dasselbe zu Doppel- oder Fehlzustellung führen.
- **Empfehlung:** Datensatzsperre bzw. Anzeige „wird bearbeitet von Sichter 2“ an der Korbzeile, wie bei Einheiten. Bei einer zweiten Ablehnung den Hinweis „bereits abgelehnt von …, Grund …“.
- **Verifikation:** Zwei Plätze wählen dieselbe Zeile. Der zweite sieht die Sperre. Gleichzeitiges Ablehnen ergibt eine Ablehnung und einen sichtbaren Hinweis beim zweiten.

### P2-4 · Hilfe und Einstieg versprechen ein „Übernehmen“, das es im Korb nicht gibt

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Strg+H › Ansichten › Eingangskorb: „**Zuerst:** Eine Meldung wählen und übernehmen oder ablehnen.“ (`docs/v2/HANDBUCH.md:391`, erzeugt aus derselben Quelle). Dagegen `apps/desktop/src/renderer/Meldungsauswahl.tsx:12-15`: „Kein ‚Übernehmen‘“.
- **Beobachtung [beobachtet]:** Die Auswahlleiste bietet nur „Ablehnen mit Grund …“, „Übernahme zurück“, „Fassungen …“ und „Meldestatus …“ (12-korb-auswahl-strg.png). Wie eine „Neu“-Zeile wieder übernommen wird, steht im Korb nirgends. Es geht nur über einen erneuten Scan bzw. ein Bündel.
- **Erwartung der Rolle:** Die Hilfe beschreibt, was ich auf dem Bildschirm sehe. Eine „Neu“-Zeile hat einen Weg zur Erledigung direkt an der Zeile.
- **Auswirkung im Einsatz:** Wer nach „Übernahme zurück“ die Zeile wieder übernehmen will, sucht und findet nichts. Die Zeile bleibt offen (siehe P1-3).
- **Empfehlung:** Hilfe angleichen. An einer „Neu“-Zeile einen Hinweis „Übernehmen: Bogen in der Lage mit Strg+Q erneut einlesen“ oder ein „Erneut übernehmen …“.
- **Verifikation:** Hilfetext und Auswahlleiste stimmen überein. Eine „Neu“-Zeile lässt sich ohne Handbuch wieder auf „Übernommen“ bringen.

### P2-5 · Anforderungen sind Eingänge ohne Absender und Dringlichkeit

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Eingang › Anforderungen › „Anforderung anlegen“ (26-anf-maske.png, 27-anforderungen-neu.png). Code: `apps/desktop/src/renderer/Anforderungsformular.tsx:17-23` (Kennung, Ablösung für, vorgesehene Einheit, Auftrag).
- **Beobachtung [beobachtet]:**
  - Die Maske kennt weder einen Anfordernden (wer will es?) noch eine Dringlichkeit noch einen Termin „benötigt bis“. „Sandsäcke 5000 + 2 BGr – BLITZ“ steht gleichrangig neben „Nachtverpflegung“.
  - Die Kennung bleibt leer, wenn ich keine eintippe. Die Spalte „Kennung“ ist dann leer.
  - Zwei identische Anforderungen innerhalb einer Minute wurden ohne Rückfrage angelegt, weil mein Prüfskript zweimal lief.
  - „Offen“ mit der Spalte „Angefordert“ lässt ältere Anforderungen immerhin per Auge finden.
- **Erwartung der Rolle:** Eine Anforderung, die über meinen Tisch kommt, trägt Absender, Dringlichkeit und eine laufende Nummer. Gleiche Anforderungen fallen auf.
- **Auswirkung im Einsatz:** S4 bekommt die BLITZ-Anforderung nicht vor der Routine zu sehen. Rückfragen an den Anfordernden gehen über Papier.
- **Empfehlung:** Felder „Angefordert von“ und „Dringlichkeit“, automatische laufende Kennung, Hinweis bei gleichem Inhalt in kurzer Folge.
- **Verifikation:** Eine Anforderung ohne Kennung bekommt „ANF-2026-005“. Filterchip „dringend“ zeigt nur die BLITZ-Anforderung.

### P3-1 · Auswahlleiste nur für eine Zeile

- **Priorität:** P3
- **Fundstelle / Aufgabe:** Aufgabe 5, Eingangskorb mit 29 Zeilen bei 1366 × 768 (31-korb-last-1366.png, 32-korb-letzte-gewaehlt.png, 34-korb-filter-neu.png).
- **Beobachtung [beobachtet]:**
  - Strg+Klick auf eine zweite Zeile ersetzt die Wahl, statt sie zu ergänzen („1 gewählt“). Mehrere Bögen auf einmal auf „anwesend“ setzen geht deshalb nicht.
  - Positiv: Die Leiste bleibt am unteren Fensterrand sichtbar, auch bei der letzten Zeile. Filterchips mit Zahlen schalten schnell, mehrere Chips kombinieren sich („Neu“ + „Geändert“ = 3 Zeilen), und „Alle zeigen“ erscheint, sobald ein Filter wirkt. Esc hebt die Wahl auf.
- **Erwartung der Rolle:** Bei einem Verband mit 12 Bögen alle markieren und in einem Zug quittieren.
- **Auswirkung im Einsatz:** Zwölfmal derselbe Handgriff. Das ist lästig, aber nicht gefährlich.
- **Empfehlung:** Mehrfachwahl wie in der Einheitentabelle (Strg/Umschalt), dazu Sammelschritte für Meldestatus und Ablehnen.
- **Verifikation:** Zwölf Zeilen wählen, „Meldestatus: anwesend“. Alle zwölf tragen den Status, im Tagebuch stehen zwölf Zeilen.

### P3-2 · Technik- und Rohwörter an meinen Bedienstellen

- **Priorität:** P3
- **Fundstelle / Aufgabe:** Scanner, Auswahlleiste, Korb.
- **Beobachtung [beobachtet]:**
  - Nach dem Übernehmen steht „Übernommen: 25 Ereignisse geschrieben.“ (07-scanner-nach12.png).
  - Die Auswahl „Meldestatus …“ in der Leiste bietet „ANWESEND / ABGERUECKT / AUFGEGANGEN“, das Kontextmenü dagegen „anwesend / abgerückt / aufgegangen“ (`Meldungsauswahl.tsx:82-86` gegenüber `:37-41`).
  - Die Zeitformate unterscheiden sich: im Korb „5.11.2026, 20:44:53“ und „16.7.2026, 09:28:00“, im Tagebuch „05.11. 20:49:27“, im Kopf „052049NOV26“.
- **Erwartung der Rolle:** Eine Schreibweise und deutsche Wörter mit Umlaut. „Bogen Bad Lauterberg in Eingang übernommen“ statt einer Ereigniszahl.
- **Auswirkung im Einsatz:** Kleine Lesehürden, die bei 40 Bögen in Folge ermüden.
- **Empfehlung:** Rückmeldung mit Einheit und Abschnitt, Meldestatus in Klartext, eine Zeitschreibweise.
- **Verifikation:** Sichtprüfung von Scanner, Leiste und Korb.

### P3-3 · Kein Zuschnitt für die Sichtung

- **Priorität:** P3
- **Fundstelle / Aufgabe:** Einsatzauswahl › „Dieser Arbeitsplatz“ › Profil (02-einstellungen.png).
- **Beobachtung [beobachtet]:** Zur Wahl stehen „Führungsstelle (S1)“, „Vermeldezentrale“, „Versorgung (S4)“ und „Alle Blätter“. Für den Sichter passt „S1“ am ehesten, beginnt aber mit der Lage statt mit dem Eingang. Bei „Vermeldezentrale“ liegt der Eingang unter „Mehr“.
- **Erwartung der Rolle:** Ein Profil „Sichtung“, das mit dem Eingang (und künftig den Nachrichten) beginnt.
- **Auswirkung im Einsatz:** Ein Klick mehr nach jedem Öffnen. Nebensächlich, solange P1-1 offen ist.
- **Empfehlung:** Mit P1-1 ein Profil „Sichtung“ anlegen.
- **Verifikation:** Profil wählen, Einsatz öffnen, der erste Reiter ist der Eingang.

---

## Positives

- **Nichts verschwindet aus dem Korb.** Ablehnen verlangt einen Grund, die Zeile bleibt grau stehen, und Ablehnung wie Übernahme lassen sich zurücknehmen. Die Rücknahme steht im Tagebuch.
- **Filterchips mit Zahlen, Auswahlleiste und Kontextmenü** sind im Korb, in den Anforderungen und in der Lage gleich aufgebaut. Die Leiste klebt am unteren Rand und ist auch mit 29 Zeilen bei 1366 × 768 erreichbar.
- **Fassungen:** Eine zweite Meldung derselben Einheit wird als „1 von 2 / 2 von 2“ erkannt und nicht als neue Einheit angelegt.
- **Umleiten in der Lage** (Strg+M) ist sauber: Die Maske nennt „bisher Bereitstellungsraum Hafen“, danach gibt es eine Bestätigung mit „gespeichert“ und Rückgängig in der Statuszeile.
- **Zwei Zeiten im Tagebuch:** „Erfasst“ und „Zeit der Meldung“ sind getrennt, nachgetragene Papiermeldungen behalten ihre Uhrzeit. Die Quelle (Funk, Telefon, …) ist wählbar, und der Eintrag erscheint am zweiten Platz nach rund 4 s.
- Der **Papier-Meldeblock** unter „Ausgaben“ hat genau die Felder, die ich brauche. Die Rückfallebene ist also schon durchdacht. Es fehlt nur die digitale Hälfte dazu.

---

## Abschluss

- **Aufgabe der Rolle geschafft:** nein. Für Erfassungsbögen geht es mit Umwegen. Für Nachrichten (Vorrang, Verteilung, Erledigungskontrolle) gibt es keinen Ablauf im Programm.
- **Nebenaufzeichnung auf Papier nötig:** ja. Für die gesamte Sichtung: Vorrangstufe, Empfänger und Verteilung, Quittung und Erledigt-Vermerk, die Liste offener Meldungen. Außerdem eine Strichliste der am Meldekopf gescannten Bögen, weil ein Scan stumm verloren gehen kann.
- **Größte Lücke an einer Übergabe:** Vom Sichter an die Sachgebiete (S2/S3/S4, Leiter): Es gibt keinen Weg, eine Meldung digital zuzustellen und zu sehen, ob sie angekommen und erledigt ist.
- **Größtes Einsatzrisiko:** Ein im Takt gescannter Erfassungsbogen geht ohne Meldung verloren (P0-1), und eine BLITZ-Meldung im Tagebuch ist weder markiert noch als offen verfolgbar (P1-1, P2-1).
- **Top-Priorität für die nächste Iteration:** P0-1 schließen. Das Scanfeld nimmt während einer laufenden Übernahme nichts an oder hält den neuen Scan fest und meldet ihn, mit Regressionstest „zwei Scans im Abstand von 0,2 s“. Danach P1-2 (leere Zeit gleich jetzt) als Einzeiler-Fix.
