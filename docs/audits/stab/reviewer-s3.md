# Stab-Review: Sachgebiet S3 (Einsatz)

Datum: 2026-11-22 · laufende Web-Schale http://127.0.0.1:8790 · Playwright/Chromium, 1440 × 900 (Lage zusätzlich 1920 × 1080), deviceScaleFactor 1.

Arbeitsplatz: Browser-Kontext `s3`, Anzeigename „S3-Platz“, Profil „Führungsstelle (S1)“, Stelle **S3**, Handzeichen „Ei“. Daneben arbeiteten S2 (Lg), FüGeh S2 (Gh) und ein FmZ-Platz (Fm1 + Sichter).

Übungseinsatz **„Review S2S3 Hochwasser Hameln“**, Lage wie in `reviewer-s2.md`. Was der S3 selbst getan hat:

- 13 Aufträge an Einheiten erfasst und einen davon erledigt.
- Eine Einheit aus dem BR Tündern nach EA 2 verschoben und auf „Einsatz“ gesetzt.
- 4 Anforderungen angelegt (Ersatzpumpe, Ablösung Deichläufer, Sand, Transport Pflegeheim) und eine davon zugesagt.
- 6 Nachrichten verfasst (Aufträge an EAL und Einheiten, Anforderung an die TEL); sie liefen über FmZ und Sichter.
- 13 Eingänge mit grüner oder blauer Kopie an S3 im Posteingang bearbeitet.

Belege: `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/s2s3/` (unten `s2s3/NN-…png`). Ausgaben liegen in `…/scratchpad/webdaten/share/einsaetze/2026-11-22_review-s2s3-hochwasser-hameln_9fa75a/ausgaben/`.

Kennzeichnung:

- **[beobachtet]**: in der laufenden App gesehen.
- **[Code]**: aus dem Quelltext gelesen.
- **[Annahme]**: übliche S3-Arbeitsweise, keine Vorschrift.

Nicht geprüft: Erfassungsbögen, QR-Scan und EEB-Import. `@bos/eeb-format` ist ein Platzhalter. Dazu gibt es keine Befunde.

Abgrenzung: Die Befunde des Sachgebietsleiters S3 zum Nachrichtenweg (`docs/audits/nachrichten/reviewer-sachgebietsleiter.md`, `README.md`) werden nicht wiederholt, insbesondere SGL P2-9 (wer hat gelesen) und P2-13 (Antwort nicht mit Original verknüpft). Hier geht es um die **Ansichten** für die Einsatzführung.

## Urteil aus Sicht des S3

S1-Control hat die Bausteine, die der S3 braucht:

- Abschnitte mit Einheiten und Stärke.
- **Aufträge je Einheit** mit Beginn, Ende und Ort.
- Anforderungen mit Zusage und Eintreffen.
- Nachrichten an Einheiten mit Lagebezug.

Diese Bausteine stehen aber **nebeneinander, nicht zusammen**:

- Der S3 erteilt einen Auftrag als Nachricht (A 16 „Auftrag Quellkade“ an ZTr TZ Hameln). Danach erfasst er denselben Auftrag noch einmal an der ausführenden Einheit (FGr BrB Holzminden), damit er in der Tabelle steht.
- Es gibt keine Stelle, an der alle offenen Aufträge mit Frist und Rückmeldung stehen.
- Keinen Auftrag kann man als „überfällig“ erkennen, weil kein Auftrag eine Frist hat.

Die Einsatzabschnitte sind im Programm Zählbehälter für Stärke. Abschnittsleiter, Auftrag des Abschnitts und Lage des Abschnitts gibt es nicht als Feld. Die Kräfteplanung (was ist frei, was kommt wann, wer muss wann abgelöst werden) setzt der S3 aus Filterchips, Anforderungsliste und dem S4-Blatt „Nächste 24 h“ zusammen.

Das Profil „Führungsstelle (S1)“ benennt die Reiter nach S1 und S4. Für den S3 ist das Blatt mit den Einheiten „S1“, die Anforderungen liegen unter „Mehr → Eingangskorb“.

## Fehlende Ansichten

### FA-S3-1 · P1 · Auftragsübersicht mit Verfolgung (offen / überfällig / erledigt)

**Was der S3 sehen und tun muss** [Annahme]: Eine einsatzweite Liste aller Aufträge, eine Zeile je Auftrag, mit:

- Einheit,
- Abschnitt,
- Auftragstext,
- erteilt um,
- Frist oder Soll-Ende,
- Auftraggeber,
- Übermittlungsweg (Nachricht Nr.),
- letzter Rückmeldung,
- Zustand (erteilt, quittiert, in Ausführung, erledigt, aufgehoben).

Dazu gehören:

- Filter „offen“ und „überfällig“ (Frist überschritten oder keine Rückmeldung seit x min), sortierbar nach Frist.
- Aus einer Zeile heraus: Rückmeldung eintragen, erledigt setzen, die Nachricht öffnen.

**Was die App schon hat** [beobachtet/Code]:

- `AuftragZustand` mit Einheit, Text, von, bis, Abschnitt, Quelle und Rücknahme.
- Die Erfassung „Auftrag erfassen“ (Auftrag, Beginn) und „Auftrag erledigt“ (Ende) in der Untertabelle der Einheit (`s2s3/11-einheit-gewaehlt.png`).
- Die Spalte „Aufträge“ der Einheitentabelle.
- Nachrichten an Einheiten mit Lagebezug und FmZ-Stand („Quittung der Gegenstelle 1740 Fm“).
- „Vorgesehener Auftrag“ an Anforderungen.

**Wo es heute verstreut ist** [beobachtet]:

- Aufträge stehen nur je Einheit: in der Tabellenspalte, als Text aneinandergehängt, oder in der Untertabelle nach Klick auf die Einheit.
- Die per Nachricht erteilten Aufträge (A 14, A 16 bis A 19) stehen im Ausgang des S3 mit dem FmZ-Stand, aber ohne Ausführungsstand.
- Die Rückmeldung zum Auftrag Quellkade kam als E 10 „Lagemeldung EA 1“. Eine Verbindung zu A 16 oder zum Einheitsauftrag gibt es nicht.
- „Offen“ im Nachrichtenblatt zeigt nur unerledigte **Kopien** und Ausgänge vor der Beförderung, keine unerledigten Aufträge.

### FA-S3-2 · P1 · Einsatzabschnitt-Karte (Abschnittsführung)

**Was der S3 sehen und tun muss** [Annahme]: Je Einsatzabschnitt eine Übersicht mit:

- Abschnittsleiter (Einheit/Person, Funkrufname, Erreichbarkeit),
- Auftrag des Abschnitts,
- Grenzen bzw. Raum,
- unterstellten Einheiten mit Status und aktuellem Auftrag,
- offenen Anforderungen für den Abschnitt,
- letzter Lagemeldung des Abschnitts mit Alter,
- Nachrichten an und aus dem Abschnitt.

Dazu „Auftrag an Abschnitt erteilen“ als Schritt.

**Was die App schon hat** [beobachtet/Code]:

- Den Abschnittsbaum mit Typ, Zeichen und Stärke. Mit gewähltem Abschnitt filtert die Einheitentabelle (`s2s3/33-s3-ea2-1920.png`).
- Im Modell `EinheitZustand.istFuehrungDesAbschnitts` und `AbschnittZustand.bemerkung` [Code]. Beide sind im Renderer nirgends verwendet (Suche nach `istFuehrungDesAbschnitts` in `apps/desktop/src/renderer`: kein Treffer).
- Funkrufname, Erreichbarkeit und Rufgruppe je Einheit (Funkplan).
- Den Lagebezug von Nachrichten.

**Wo es heute verstreut ist** [beobachtet]:

- Wer EA 2 führt, sagt nur der Bezeichnungstext „ZTr TZ Rinteln“ und sein Auftragstext „Führung EA 2 Altstadt …“.
- Die Lage des Abschnitts steht in Nachrichten, die Anforderungen für den Abschnitt stehen ohne Abschnitt in der Anforderungsliste.
- Die Führungsorganisation (Harke) zeigt je Abschnitt nur „EAL“, den Namen und die Stärke (`s2s3/34-fueorg.png`).

### FA-S3-3 · P1 · Kräfteübersicht für die Einsatzplanung (verfügbar / gebunden / kommt / geht)

**Was der S3 sehen und tun muss** [Annahme]: Auf einen Blick:

- welche Einheiten **frei** sind (Einsatzbereit, BR, Ruhe bis …),
- welche **gebunden** sind (im Einsatz, mit Auftrag),
- welche **ausgefallen** sind (nicht einsatzbereit, mit Grund),
- was **kommt** (Anmarsch und zugesagte Anforderungen mit Eintreffzeit),
- was **geht** (verfügbar bis, Ablösung fällig).

Und das mit Fähigkeiten: Pumpleistung, Beleuchtung, Notstrom. Daraus plant er die nächsten Stunden (Nachtbetrieb, Ablösung 22:00).

**Was die App schon hat** [beobachtet/Code]:

- Status je Einheit mit Filterchips und Zahl.
- Schicht, „verfügbar bis“ und Eintreffzeit (Spaltengruppe Ressourcen).
- Anforderungen mit Zusage „für 21:30“.
- Die S4-Vorausschau mit Zu- und Abgängen (laut Handbuch).
- Den Typ bzw. die Vorlage je Einheit.

**Wo es heute verstreut ist** [beobachtet]:

- Die Filterchips zählen Einheiten, nicht Fähigkeiten oder Köpfe.
- Die Reserve steht im Abschnitt „BR Tündern“ (FGr R Stadthagen, Status Ruhe).
- TZ Nienburg steht im Bereich „Angefordert / Anmarsch“, die zugesagte Ablösung um 21:30 nur in der Anforderung ANF-2 und als Marke „Ablösung zugesagt“ an der FF.
- Der Ausfall der FGr WP Holzminden steht als Status „Nicht einsatzbereit“ und als Nachricht E 7. Den Grund gibt es nicht als Feld.

### FA-S3-4 · P2 · Planungs- und Maßnahmenliste (Entscheidungen, geplante Maßnahmen mit Zeitpunkt)

**Was der S3 sehen und tun muss** [Annahme]: Eine Liste geplanter Maßnahmen mit Zeitpunkt und Verantwortlichem, gespeist aus Entscheidungen der Lagebesprechung. Beispiele aus der Übung:

- 18:30 Ausleuchtung Deich,
- 21:00 Sandnachschub,
- 22:00 Ablösung Deichläufer,
- 23:00 Diesel Notstrom.

Fällige Maßnahmen werden hervorgehoben.

**Was die App schon hat** [beobachtet]:

- Tagebucheinträge mit Quelle „Lagebesprechung“ (Freitext).
- Anforderungen mit „Zugesagt für“.
- Den Beginn eines Auftrags, auch in der Zukunft.

**Wo es heute verstreut ist** [beobachtet]:

- Die Termine stehen im Freitext von A 17, A 19, E 6 und E 11.
- Die Anforderungen ANF-2 und ANF-3 tragen sie zum Teil, ohne Abschnitt.
- Im Tagebuch steht „Lagebesprechung 2: … Ablösung Deichläufer 22:00“.

### FA-S3-5 · P2 · Lage-/Einsatzmonitor für die S3-Wand

**Was der S3 sehen und tun muss** [Annahme]: Auf dem Wandmonitor je Abschnitt Kräfte und offene/überfällige Aufträge sowie offene Anforderungen mit Zusagezeit.

**Was die App schon hat** [beobachtet]: Monitor-Tafel 7 „Stärke je Abschnitt“, Tafel 9 „Abschnitt × Organisation“, Tafel 6 „Funkplan“ (`s2s3/30-monitor-7.png`, `-9.png`).

**Wo es heute verstreut ist** [beobachtet]: Aufträge und Anforderungen kommen auf keiner Tafel vor.

## Befunde an vorhandenen Ansichten

### B-S3-1 · P1 · Auftrag per Nachricht und Auftrag an der Einheit sind zwei getrennte Welten

**Beobachtung** [beobachtet]:

- A 16 „Auftrag Quellkade“ ging als Nachricht an ZTr TZ Hameln. Die Nachricht trägt den Lagebezug („In der Lage zeigen (Anschrift)“, `s2s3/32-in-der-lage-zeigen.png`).
- In der Einheitentabelle erscheint davon nichts. Den Auftrag „Quellkade an Sickerstelle km 3,1 errichten“ an FGr BrB Holzminden musste ich getrennt in der Untertabelle erfassen.
- Umgekehrt erzeugt „Auftrag erfassen“ an der Einheit keine Nachricht und keinen Tagebuchbezug zur Nachricht.
- Gleiches gilt für A 18 „Auftrag Verlegung EA 2“ und den Einheitsauftrag „Unterstützung Evakuierung“ der B-Gruppe TZ Stadthagen.

**Auswirkung**:

- Doppelte Erfassung unter Zeitdruck.
- Die Tabelle (für alle sichtbar) und der Nachrichtenweg (nachweispflichtig) laufen auseinander.
- Der S3 kann aus der Einheit nicht sehen, mit welcher Nachricht der Auftrag erteilt wurde, und umgekehrt.

**Empfehlung**:

- In der Nachrichtenmaske „als Auftrag an Einheit/Abschnitt führen“ anbieten; das legt den Einheitsauftrag mit Verweis auf die Nachricht an.
- An der Einheit „Auftrag erteilen …“ anbieten, das den Vordruck vorbelegt.
- In der Untertabelle die Nachrichtennummer zeigen.

**Verifikation**: A-Nachricht „Auftrag X“ an FGr N mit „als Auftrag führen“ aufgeben. In der Spalte Aufträge der FGr N steht „X (A n)“, und die Lese-Ansicht der Nachricht verweist auf den Auftrag.

### B-S3-2 · P2 · Spalte „Aufträge“ hängt alle Aufträge aneinander und schneidet ab

**Beobachtung** [beobachtet]:

- B-Gruppe TZ Rinteln mit zwei Aufträgen zeigt in einer Zeile „22.11.2026 15:05–; EA 2 Pumpen Altstadt; Keller Pflegeheim … 22.11.2026 16:3…“. Der Rest ist auch bei 1920 px abgeschnitten (`s2s3/33-s3-ea2-1920.png`).
- Ein erledigter Auftrag bleibt stehen („15:20–22.11.2026 16:50; …“) und ist nur am Endzeitpunkt erkennbar.
- Jede Zeile wiederholt das volle Datum und den Abschnittsnamen.

**Auswirkung**: Der aktuelle Auftrag einer Einheit ist nicht auf einen Blick lesbar. Erledigte und laufende Aufträge sind kaum zu unterscheiden.

**Empfehlung**:

- In der Tabelle nur den laufenden Auftrag kurz zeigen (Text, seit hh:mm), mit Zahl weiterer („+1“).
- Erledigte ausblenden oder grau setzen.
- Das Datum nur bei anderem Tag zeigen, den Abschnitt nur, wenn er vom Abschnitt der Einheit abweicht.

**Verifikation**: Die B-Gruppe TZ Rinteln zeigt „Erkundung Tiefgarage Rathaus · seit 16:30 · +1“. Die FGr BrB zeigt keinen laufenden Auftrag (erledigt 16:50).

### B-S3-3 · P2 · Auftrag hat keine Frist, keinen Auftraggeber und keine Rückmeldung

**Beobachtung** [beobachtet/Code]:

- Die Maske „Auftrag erfassen“ hat nur „Auftrag“ und „Beginn“ (leer = jetzt). „Auftrag erledigt“ hat nur „Ende“ (`renderer/UntertabellenErfassung.tsx`).
- `AuftragZustand` hat kein Feld für Soll-Ende, Auftraggeber oder Rückmeldung [Code].
- Im Tagebuch steht „Auftrag erfasst“ mit dem Anzeigenamen des Platzes („S3-Platz“), nicht „S3 · Ei“.

**Auswirkung**:

- „Überfällig“ ist nicht bestimmbar. Der Auftrag „Sandsäcke füllen, Ziel 5000 Stück bis 20:00“ trägt die Frist nur im Text.
- Wer den Auftrag erteilt hat, ist nicht nachweisbar.

**Empfehlung**: Optionale Felder „bis“ (Soll), „erteilt von“ (Stelle/Hz. vorbelegt) und Rückmeldungen als Liste mit Zeit. Die Zeichnung im Tagebuch mit Stelle und Handzeichen.

**Verifikation**: Auftrag mit „bis 20:00“ erfassen. Um 20:01 ist er in der Auftragsübersicht (FA-S3-1) als überfällig markiert, und das Tagebuch zeigt „S3 · Ei“.

### B-S3-4 · P2 · Anforderung ohne Abschnitt, Bedarfszeit und Adressat; Nachricht und Anforderung unverbunden

**Beobachtung** [beobachtet]:

- Die Maske „Anforderung anlegen“ hat Kennung, „Ablösung für“, „Vorgesehene Einheit“ und „Vorgesehener Auftrag“ (Tagebuch zu ANF-1 bis ANF-4).
- Es fehlen Abschnitt bzw. Einsatzort, „benötigt bis“ und „angefordert bei“. Diese Angaben musste ich in den Freitext schreiben.
- Die Nachricht A 15 „Anforderung Transport Pflegeheim“ an die TEL und ANF-4 sind nicht verbunden.
- „Angefordert“ ist die Erfassungszeit (17:41), nicht die Zeit der Anforderung (16:45).

**Auswirkung**: Für die Lagebesprechung lässt sich weder sagen, wo eine Anforderung gebraucht wird, noch wie lange sie schon offen ist, noch bei wem nachzufassen ist.

**Empfehlung**: Abschnitt, „benötigt bis“, „angefordert bei“ und einen änderbaren Anforderungszeitpunkt ergänzen. Aus einem Ausgang „als Anforderung führen“ anbieten.

**Verifikation**: ANF-4 trägt EA 2, „benötigt sofort“, „bei TEL“ und „angefordert 16:45 (A 15)“. Die Anforderungsliste lässt sich nach Abschnitt filtern.

### B-S3-5 · P2 · Profil und Reiter passen nicht zur S3-Arbeit

**Beobachtung** [beobachtet]:

- Im Profil „Führungsstelle (S1)“ heißen die Reiter „S1 · Nachrichten · Funkplan · S4 · Exporte“. Anforderungen und Einsatztagebuch liegen unter „Mehr“ (Anforderungen als Umschalter im „Eingangskorb“, `s2s3/20-anf.png`).
- Ein S2- oder S3-Profil gibt es nicht (Auswahl: Führungsstelle (S1), Vermeldezentrale, Versorgung (S4), Alle Blätter).
- Das Handbuch beschreibt für dieses Profil noch „Lage · Eingang · Nachrichten · Führungsstelle · Ausgaben · Einsatztagebuch“ (`docs/v2/HANDBUCH.md`, Abschnitt „Das Fenster“). Der S1-Review führt das als B-S1-4.

**Auswirkung**: Der S3 sucht Einheiten unter „S1“ und Anforderungen unter „Eingangskorb“; beides passt nicht zu seinem Sachgebiet. Die Stelle S3 ändert am Zuschnitt nichts.

**Empfehlung**: Ein Profil „Einsatz (S2/S3)“ mit Lage, Nachrichten, Anforderungen, Tagebuch und, sobald vorhanden, Aufträgen. Das Blatt mit den Einheiten neutral benennen („Lage“ oder „Kräfte“).

**Verifikation**: Profil „Einsatz“ wählen. Im Band stehen Lage, Nachrichten, Anforderungen, Aufträge und Tagebuch ohne „Mehr“.

### B-S3-6 · P2 · Exporte für die Lagebesprechung mit technischen Werten

**Beobachtung** [beobachtet]:

- Der Anforderungen-Export nennt die Zusage als „2026-11-22T20:30:00.000Z / TEL über RB Hannover“, also in UTC statt 21:30 Ortszeit (`ausgaben/anforderungen_2026-11-22_1745.html`). Der S1-Review führt die UTC-Zeiten als B-S1-1.
- Der Führungsorganisation-Export nennt die Abschnittstypen als „FUEHRUNGSSTELLE“, „EINSATZORT“ und „BEREITSTELLUNGSRAUM“ (`ausgaben/fueorg_2026-11-22_1745.html`).

**Auswirkung**: In der Lagebesprechung wird eine Ablösung „20:30“ gelesen, die um 21:30 kommt. Der Ausdruck wirkt unfertig.

**Empfehlung**: Zeiten in der Anzeigezone (Europe/Berlin) und als „22.11. 21:30“ ausgeben. Typen mit ihrer Beschriftung ausgeben.

**Verifikation**: Den Export nach einer Zusage „21:30“ erzeugen. Die Spalte Zusage zeigt „22.11.2026 21:30“, die Harke „Einsatzort“ bzw. „Einsatzabschnitt“.

### B-S3-7 · P3 · Abschnittstyp „Einsatzabschnitt“ fehlt; Einsatzabschnitte heißen „Einsatzort“

**Beobachtung** [beobachtet]: Die Typauswahl beim Anlegen bietet Führungsstelle, Meldekopf, Sonstige Führung, Logistik, Angefordert / Anmarsch, Bereitstellungsraum und Einsatzort. Ein EA wird als „Einsatzort“ angelegt und mit „EAL“ gezeichnet (`s2s3/05-abschnitte.png`, `s2s3/34-fueorg.png`).

**Auswirkung**: Der Begriff weicht vom Sprachgebrauch des S3 ab („Einsatzabschnitt“). Mehrere Orte in einem Abschnitt lassen sich so nicht abbilden.

**Empfehlung**: Die Beschriftung „Einsatzabschnitt“ (Wert unverändert), Ort als eigenes Feld (siehe FA-S2-3).

**Verifikation**: Die Typauswahl zeigt „Einsatzabschnitt“, und der Export zeigt dieselbe Beschriftung.

## Schluss

- **Aufgabe geschafft:** mit Umwegen. Aufträge ließen sich erteilen (als Nachricht) und erfassen (an der Einheit), aber nur doppelt und ohne Frist. Offene oder überfällige Aufträge waren nicht feststellbar. Die Kräfteplanung gelang nur durch Zusammensuchen aus vier Stellen.
- **Größtes Risiko:** Ein per Nachricht erteilter Auftrag ist ohne Ausführungsstand und ohne Frist. Bleibt die Rückmeldung aus, merkt es die App nicht, und die Tabelle zeigt womöglich einen anderen Auftrag als den zuletzt erteilten (B-S3-1, B-S3-3).
- **Top-Priorität:** FA-S3-1 (Auftragsübersicht mit Frist und Zustand) zusammen mit B-S3-1 (Auftrag aus der Nachricht führen). Das nutzt vorhandene Daten (`AuftragZustand`, Nachrichten mit Lagebezug) und macht „offen/überfällig“ erst möglich.
