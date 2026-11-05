# Audit S1-Control v2 — Perspektive Führungsgehilfe in der Führungsstelle

Stand: **05.11.2026**, HEAD `f5de7ee` (nach den Schnitten E1–E4 „Entlastung der Oberfläche“: Auswahlleiste als Baustein, „⋯“ in Funkplan und Versorgung, ein Hauptknopf je Unteransicht, Filterzeile in Eingangskorb und Anforderungen, Profilwahl auf der Einsatzauswahl, „Mehr“ und Umschalter).

Rolle: Führungsgehilfe. Ich arbeite heute für S1, gleich für S4, dann für die Vermeldezentrale (S6-Aufgaben) und wieder für den Leiter. Ich erfasse, was man mir zuruft, drucke aus und halte Listen aktuell. Ich kenne die Software in Grundzügen, aber nicht jede Ansicht im Detail. Nach jeder Unterbrechung will ich sofort wissen, wo ich war, und ich will nicht aus Versehen etwas in den Daten eines anderen Sachgebiets kaputt machen.

Material: eigene Web-Schale `http://127.0.0.1:8223` mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten). Profil „Führungsstelle (S1)“ an Arbeitsplatz A. Zweiter Browserkontext als Arbeitsplatz B, Anzeigename „Platz B (S4)“, Profil „Versorgung (S4)“. Viewport 1600×1000, deviceScaleFactor 1. Durchlauf 20:57–21:14 Uhr mit echten Schreibvorgängen: Stärke falsch erfasst, zurückgenommen und berichtigt; Anforderung angelegt; Mahlzeit bestellt und berichtigt; Rufgruppe angelegt und zugeordnet; Druck und Bestellliste erzeugt; zwei Arbeitsplätze an derselben Stärkezelle und an derselben Anforderung. Aufnahmen unter `scratchpad/shots/fuehrungsgehilfe/01…56`. Quelltext nur lesend. Hintergrund: Handbuch und Kurzanleitung (`docs/v2/`), Audits vom 29.10. und das Leiter-Audit vom 05.11.

Kennzeichnung: **[beobachtet]** = an der laufenden Web-Schale gesehen oder ausgelöst; **[Code]** = aus der Quelle belegt (Datei:Zeile); **[Annahme]** = Annahme über THW-Abläufe oder Ursache, nicht belegt; **[nicht prüfbar]** = in der Web-Schale nicht nachvollziehbar.

---

## Urteil

Für einen Führungsgehilfen, der zwischen Sachgebieten springt, ist die Vereinheitlichung **in der Grundbedienung angekommen**. Auswählen geht überall gleich: Klick auf die Zeile, die Auswahlleiste unten nennt „1 gewählt · <Name>“ und die möglichen Schritte, Esc hebt die Wahl auf. Das gilt in Lage, Funkplan und Anforderungen gleich. Jeder eigene Schritt wird in der Statuszeile mit „✓ … · gespeichert“ quittiert. Rechts steht „↶ Rückgängig: <Schritt>“, mit Rückfrage. Das Tagebuch zeigt „vorher → nachher“ und markiert die Rücknahme. Filter, Suche und Auswahl der Lage überstehen einen Blattwechsel. Das zuletzt offene Blatt übersteht ein Neuladen. Eine Stärkeänderung des S1 schlägt sofort in der Bestellkarte des S4 als „47 −3 fehlen“ durch. In der Einheitentabelle schützt eine Sperre: „🔒 wird von Arbeitsplatz bearbeitet“, und wer trotzdem schreibt, bekommt „Nicht gespeichert – Wurde inzwischen von Platz B (S4) geändert (neu: 0/2/9)“.

Reibung entsteht genau dort, wo der Führungsgehilfe zwischen Aufgaben wechselt:

1. **Schutz vor gleichzeitiger Bearbeitung gibt es nur in Einheitentabelle und Funkplan.** Zwei Arbeitsplätze sagen dieselbe Anforderung mit verschiedenen Stellen zu. Der zweite überschreibt den ersten ohne Hinweis und bekommt „gespeichert“. Übrig bleibt nur der Zähler „⚠ 10 Konflikthinweise“, der auf nichts zeigt.
2. **Halbe Eingaben überleben nur bei der Anforderung.** Masken sind modal. Wer kurz in einem anderen Blatt nachsehen will, muss die Maske schließen. Bei Einheit, Rufgruppe und Bestellung ist die Eingabe dann weg, mit Esc ohne Rückfrage.
3. **Der Wechsel zwischen Sachgebieten kostet Klicks und Orientierung.** Das Profil steht nirgends im Kopfband und lässt sich nur außerhalb des Einsatzes ändern. Der Reiter aus „Mehr“ verschwindet, sobald ich das Blatt verlasse.

Dazu kommen ein Berichtigungsweg, der still Daten verwirft („Bestellung ändern …“ vergisst den Lieferanten), und ein Ausgabenblatt mit 25 gleichrangigen Knöpfen, von denen die PDF-Hälfte im Browser nur eine Fehlermeldung liefert.

**Aufgabe ohne Nebenaufzeichnung: mit Umwegen.** Alle fünf Prüfaufgaben ließen sich erledigen. Nach Unterbrechungen und bei gleichzeitiger Arbeit an Anforderungen bräuchte ich aber einen Zettel.

---

## Findings

### P1-1 — Gleichzeitige Bearbeitung außerhalb der Einheitentabelle ungeschützt; Konflikthinweis ohne Ziel

- **Fundstelle / Aufgabe:** Prüfaufgabe 5. Eingang → Anforderungen → ANF-2026-001 → „Zusagen …“ an zwei Arbeitsplätzen. Aufnahmen `43-b-anforderung-waehrend-a.png`, `44-a-maske-nach-b.png`, `45-a-zusage-nach-b.png`, `46-konflikthinweise.png`, `47-anf-nach-konflikt.png`, `48-tagebuch.png`. Zum Vergleich in der Lage: `36-b-oeffnet-dieselbe-zelle.png`, `42-a-schreibt-nach-b.png`.
- **Beobachtung:**
  - **[beobachtet]** Arbeitsplatz A hat die Maske „Zusage zu Anforderung ANF-2026-001 erfassen“ offen. Arbeitsplatz B wählt dieselbe Zeile und sieht kein Schloss und keinen Hinweis. Die Leiste bietet „Zusagen …“ wie sonst auch. B sagt zu („B: THW RB Nord“) und bekommt „✓ Zusage … erfasst · gespeichert“.
  - **[beobachtet]** In A bleibt die Maske unverändert offen, ohne Hinweis, dass die Anforderung inzwischen zugesagt ist. A sagt zu („A: THW RB Süd“) und bekommt ebenfalls „gespeichert“. Die Zeile zeigt danach nur noch „A: THW RB Süd“. Die Zusage von B ist in der Liste verschwunden.
  - **[beobachtet]** Einziges Zeichen: Der Zähler in der Statuszeile springt von „⚠ 8“ über „9“ auf „10 Konflikthinweise“. Ein Klick darauf zeigt nur einen allgemeinen Text: „Betroffene Felder tragen in der Tabelle ein ⚠.“ Die Anforderungszeile trägt kein ⚠. Das Tagebuch nennt beide Zusagen untereinander. Dort findet man sie, wenn man weiß, wonach man sucht.
  - **[beobachtet]** In der Lage dagegen sieht B an der Zeile „BGr 2 Oldenburg 🔒 wird von Arbeitsplatz bearbeitet“. Schreibt B trotzdem, wird das spätere Enter von A abgelehnt: „Nicht gespeichert – Wurde inzwischen von Platz B (S4) geändert (neu: 0/2/9). … Enter übernimmt Ihren Wert trotzdem, Esc verwirft.“ Das ist der richtige Mechanismus.
  - **[Code]** Die Bearbeitungssperre (`apps/desktop/src/renderer/useBearbeitungssperre.ts:24-33`) wird nur in Einheitentabelle, Einheitenzeile/-zelle, Zellbearbeitung und in den Funkplan-Masken/-Zellen verwendet. `Anforderungen.tsx:87-90` kennt nur die Sperren „nur lesen“ und „Verbindung“. Bestellkarte, Unterkunft und Abschnittsbaum tauchen in der Liste der Nutzer der Sperre nicht auf.
- **Erwartung der Rolle:** Dieselbe Sperre wie in der Lage, an jedem Datensatz, den zwei Plätze gleichzeitig anfassen können: Anforderung, Bestellung, Unterkunft, Abschnitt. Gibt es trotzdem einen Konflikt, nennt der Hinweis die Anforderung und beide Werte und führt mit einem Klick dorthin.
- **Auswirkung im Einsatz:** Zwei Gehilfen nehmen zwei Telefonate zur selben Anforderung an, etwa vom Regionalbereich und vom Ortsverband. Die Software zeigt danach eine Zusage, und keiner der beiden weiß, dass die andere existierte. Auf Papier lägen zwei Zettel nebeneinander. Hier muss der Leiter dem Tagebuch glauben, das niemand liest. **[Annahme]** Für Ablösungen heißt das: falsche Erwartung, wer wann eintrifft.
- **Empfehlung:** Die Sperre der Einheitentabelle auf alle Masken übertragen, die einen bestehenden Datensatz ändern. Eine offene Maske meldet, wenn sich der Datensatz unter ihr ändert („Inzwischen von Platz B zugesagt: …“), und schreibt dann nicht blind. Der Konfliktzähler öffnet eine Liste mit Datensatz, Feld, beiden Werten und Arbeitsplätzen und springt zur Zeile. Die Zeile trägt sichtbar ⚠.
- **Verifikation:** Zwei Browser. A öffnet „Zusagen …“ an einer Anforderung, B sieht an derselben Zeile „🔒 wird von … bearbeitet“. B sagt trotzdem zu, die Maske von A zeigt das vor dem Speichern. Ein Klick auf den Konfliktzähler führt zur betroffenen Anforderung, die ⚠ trägt. Dasselbe mit „Bestellung ändern …“.

### P1-2 — Halbe Eingaben gehen bei Unterbrechung verloren, außer bei der Anforderung

- **Fundstelle / Aufgabe:** Prüfaufgabe 2. Masken „Anforderung anlegen“, „Rufgruppe anlegen“, „Einheit anlegen ▾ → Ohne Vorlage“, „Bestellen …“. Aufnahmen `10-anf-halb.png`, `11-anf-nach-schliessen.png`, `49-einheit-maske.png`.
- **Beobachtung:**
  - **[beobachtet]** Alle Masken sind modal. Bei offener Maske lässt sich kein Reiter anklicken, der Maskengrund fängt den Klick ab. Wer mitten in der Eingabe nachsehen will, ob eine Einheit schon da ist, muss die Maske schließen.
  - **[beobachtet]** Anforderung: halb ausgefüllt, „Schließen“, Lage, zurück, „Anforderung anlegen“. Beide Felder sind wieder da, auch nach Neuladen, und der Browser fragt vor dem Verlassen nach. Nach dem Schließen ist aber nirgends zu sehen, dass ein Entwurf wartet. Der Knopf heißt weiter nur „Anforderung anlegen“.
  - **[beobachtet]** Rufgruppe: Zweck und Name eingetragen, „Abbrechen“, wieder geöffnet: Beide Felder sind leer. Einheit ohne Vorlage: Bezeichnung eingetragen, **Esc** schließt die Maske sofort ohne Rückfrage, beim Wiederöffnen ist die Bezeichnung leer.
  - **[beobachtet]** Die Knöpfe heißen verschieden: „Schließen“ (Anforderung, behält) und „Abbrechen“ (Rufgruppe, Bestellung, Einheit, verwirft). Der Unterschied ist nirgends erklärt.
  - **[Code]** Der Entwurfsspeicher gilt ausdrücklich nur dem Anforderungsformular (`apps/desktop/src/renderer/entwurf.ts:1-10`, `sitzung.ts:13`). Er wird nur in `Anforderungsneu.tsx:71` verwendet.
- **Erwartung der Rolle:** Jede angefangene Eingabe bleibt stehen, bis ich sie anlege oder ausdrücklich verwerfe, wie auf dem halb ausgefüllten Vordruck, der neben der Tastatur liegt. Esc auf einer Maske mit Inhalt fragt nach. Der Hauptknopf zeigt, dass ein Entwurf wartet („Anforderung anlegen · Entwurf“).
- **Auswirkung im Einsatz:** Der Führungsgehilfe wird ständig unterbrochen, das gehört zur Rolle. Die Einheit, die der Meldekopf durchgibt, wird zur Hälfte erfasst. Dann ruft der Leiter, und die Eingabe ist weg. Sie wird neu abgefragt oder auf einem Zettel zwischengelagert, also genau die Nebenaufzeichnung, die die Software ersetzen soll.
- **Empfehlung:** Das Entwurfsverhalten der Anforderung für alle Anlege-Masken übernehmen (Einheit, Rufgruppe, Abschnitt, Bestellung, Unterkunft). „Abbrechen“ mit Inhalt fragt „Eingabe verwerfen?“, Esc ebenso. Ein Merkzeichen am Hauptknopf und an „Mehr“ zeigt einen wartenden Entwurf.
- **Verifikation:** In jeder Anlege-Maske ein Feld füllen, Esc drücken, das Blatt wechseln, zurückkehren, die Maske öffnen: Der Inhalt ist da. Esc mit Inhalt löst eine Rückfrage aus. Der Hauptknopf zeigt den Entwurf an.

### P2-1 — Wechsel zwischen Sachgebieten: Profil unsichtbar, „Mehr“-Reiter flüchtig

- **Fundstelle / Aufgabe:** Prüfaufgabe 1 (S1 → S3 → S4 → S6). Aufnahmen `14-mehr-menue.png`, `15-versorgung.png`, `19-funkplan.png`, `26-fenstermenue.png`, `33-b-profil-s4.png`, `53-mehr-reiter-weg.png`.
- **Beobachtung:**
  - **[beobachtet]** Im geöffneten Einsatz nennt das Kopfband Einsatz, Führungsstelle, Ist-Stärke und Zeit, aber nicht das Profil. Auch das Fenstermenü kennt es nicht (Hilfe, Erscheinungsbild, Stärke-Monitor, Diagnose, Einsatz schließen). Ändern lässt es sich nur auf der Einsatzauswahl, also nach „Einsatz schließen“.
  - **[beobachtet]** Im Profil S1 liegen Versorgung und Funkplan unter „Mehr“. „Mehr → Versorgung“ legt einen Reiter „Versorgung“ an. Ein Klick auf „Lage“ lässt ihn verschwinden (`53-mehr-reiter-weg.png`). „Mehr → Funkplan“ ersetzt „Versorgung“. Für S1 → S4 → S1 → S6 → S1 sind das jedes Mal zwei Klicks über ein Menü.
  - **[beobachtet]** Arbeitsplatz B mit Profil „Versorgung (S4)“ hat „Versorgung“ als ersten Reiter, landet beim Öffnen aber auf „Lage“.
- **Erwartung der Rolle:** Ich sehe im Kopf, unter welchem Profil ich gerade arbeite, und kann es im Einsatz wechseln. Ein Blatt, das ich heute schon dreimal aufgeschlagen habe, bleibt als Reiter stehen, bis ich es wegklicke. Ein S4-Platz öffnet auf Versorgung.
- **Auswirkung im Einsatz:** Kein Datenrisiko, aber ständiges Suchen. Wer den Platz eines Kollegen übernimmt, weiß nicht, warum dort andere Reiter stehen. Die Ausweichlösung „Alle Blätter“ gibt es, man muss sie aber kennen und dafür den Einsatz schließen.
- **Empfehlung:** Das Profil im Kopfband oder Fenstermenü nennen und dort umschaltbar machen. Aus „Mehr“ geöffnete Blätter bleiben als Reiter stehen, bis sie geschlossen werden, oder höchstens die letzten zwei. Beim Öffnen auf dem ersten Reiter des Profils landen.
- **Verifikation:** Im Einsatz das Profil ohne Schließen wechseln. „Mehr → Versorgung“, „Lage“, und der Reiter Versorgung steht noch. Ein S4-Profil öffnet auf Versorgung.

### P2-2 — Berichtigen: „Bestellung ändern …“ verwirft den Lieferanten; keine Plausibilitätsprüfung

- **Fundstelle / Aufgabe:** Prüfaufgabe 4. Versorgung → Verpflegung → „Bestellen …“ / „Bestellung ändern …“. Lage → Stärkezelle. Aufnahmen `04-staerke-falsch.png`, `17-bestellt-470.png`, `18-bestellung-berichtigt.png`, `48-tagebuch.png`.
- **Beobachtung:**
  - **[beobachtet]** Bestellung mit Zahlendreher 470 statt 47, „bestellt bei: Metzgerei Hinrichs“. Die Karte zeigt neutral „470 +423 Reserve“, ohne Warnung vor der zehnfachen Menge.
  - **[beobachtet]** „Bestellung ändern …“ öffnet eine Maske mit dem Titel „Bestellung Nacht 0000“, gefüllt mit dem **Vorschlag** (47) statt der laufenden Bestellung. „bestellt bei“ ist leer. Ich ändere nur die Portionen. Danach steht in der Karte „bei —“. Der Lieferant ist aus der aktuellen Bestellung verschwunden und nur noch im Tagebuch beim alten Eintrag zu finden.
  - **[Code]** `apps/desktop/src/renderer/Bestellkarte.tsx:139` übergibt der Maske `vorschlagAus(m, b?.ausgabestelleId)`, also Vorausschau und Ausgabestelle, nicht die Werte der bestehenden Bestellung.
  - **[beobachtet]** Stärke „0/1/20“ an einem Trupp (Tippfehler statt 0/1/2) wird ohne Rückfrage geschrieben, die Ist-Stärke springt um 18. Das Zurücknehmen danach ist vorbildlich: Rückfrage mit Folgen („gilt für alle Arbeitsplätze … steht im Einsatztagebuch“), dann „✓ Zurückgenommen“.
- **Erwartung der Rolle:** „Ändern“ heißt: Ich sehe, was gilt, und ändere ein Feld. Alles andere bleibt. Eine Zahl, die weit von Vorschlag oder Ebene abweicht, wird einmal hinterfragt („470 Portionen, Vorschlag 47 — richtig?“).
- **Auswirkung im Einsatz:** Der S4 will die Bestellung beim Lieferanten nachhalten und findet den Namen nicht mehr. Ein Zahlendreher bei Portionen geht ohne Gegenprüfung an den Lieferanten. **[Annahme]** Eine Stärke von 21 an einem Trupp fällt erst in der Lagebesprechung auf.
- **Empfehlung:** „Bestellung ändern …“ mit den Werten der geltenden Bestellung vorbelegen und den Vorschlag daneben nennen. Titel „Bestellung ändern“. Eine weiche Plausibilitätsrückfrage bei Portionen deutlich über dem Vorschlag und bei Stärken weit über der Ebene.
- **Verifikation:** Bestellung mit Lieferant anlegen, „Bestellung ändern …“, nur die Portionen ändern: Der Lieferant steht weiter in der Karte. 470 statt 47 löst eine Rückfrage aus.

### P2-3 — Sperr- und Konflikttexte unvollständig lesbar und ohne echten Namen

- **Fundstelle / Aufgabe:** Prüfaufgabe 5, Lage. Aufnahmen `36-b-oeffnet-dieselbe-zelle.png`, `42-a-schreibt-nach-b.png`, `48-tagebuch.png`, `01-start.png`.
- **Beobachtung:**
  - **[beobachtet]** Die Konfliktmeldung in der Stärkezelle ist rechts am Tabellenrand abgeschnitten: Sichtbar bleibt „Nicht gespeichert – Wurde inzwisc…“. Dass Enter den fremden Wert überschreibt und Esc verwirft, steht im abgeschnittenen Teil. Gleichzeitig sind die Zwischenzeilen der Abschnitte durch das Seitwärtsscrollen namenlos (wie im Leiter-Audit P1-1).
  - **[beobachtet]** Die Sperre nennt den Anzeigenamen. Ab Werk heißt jeder Platz „Arbeitsplatz“, die Einstellungen sind dann nicht von selbst offen. Ergebnis: „🔒 wird von Arbeitsplatz bearbeitet“ und im Tagebuch Akteur „Arbeitsplatz“, Rechner „vm“. Das sagt nicht, wen ich fragen muss.
  - **[beobachtet]** Die Meldung „Neu laden?“ ist als Frage formuliert, es gibt aber keinen Knopf dafür, nur Enter (= trotzdem) und Esc.
- **Erwartung der Rolle:** Die Meldung steht vollständig neben oder über der Zelle, mit zwei Knöpfen („Meinen Wert schreiben“ / „Wert von Platz B behalten“). Der Name sagt, wer es ist („S4 Meier“).
- **Auswirkung im Einsatz:** Wer aus Gewohnheit zweimal Enter drückt, überschreibt den Wert des Kollegen, ohne die Warnung gelesen zu haben. Ein Sperrhinweis „von Arbeitsplatz“ führt zu Zurufen durchs Zelt.
- **Empfehlung:** Konfliktmeldung als nicht abgeschnittenes Feld mit zwei benannten Knöpfen. Beim ersten Öffnen eines Einsatzes einen Anzeigenamen verlangen, solange er „Arbeitsplatz“ lautet.
- **Verifikation:** Bei 1600 px Breite ist die ganze Konfliktmeldung lesbar und hat zwei Knöpfe. Ein frischer Arbeitsplatz kann keinen Einsatz öffnen, ohne einen eigenen Namen zu setzen.

### P2-4 — Ausgaben: kein klarer Weg zum Ausdruck für die Lagebesprechung; PDF im Browser angeboten und abgewiesen

- **Fundstelle / Aufgabe:** Prüfaufgabe 3. Reiter Ausgaben, „⋯“ in Versorgung und Funkplan. Aufnahmen `27-ausgaben.png`, `28-status-pdf.png`, `30-druck-html.png`, `31-druck-inhalt.png`, `50-versorgung-menue.png`, `51-versorgung-ausgabe.png`.
- **Beobachtung:**
  - **[beobachtet]** Das Blatt Ausgaben trägt 25 gleich aussehende Knöpfe in drei Zeilen („Druck als PDF“, „Status als PDF“, „Einheitenliste …“, „Logistik …“, „Oldenburger Block …“). Keiner sagt, wofür er gedacht ist. Was die Lagebesprechung braucht, „Druck“ oder „Status“, muss ich raten.
  - **[beobachtet]** In der Web-Schale führt „Status als PDF“ zu einer roten Meldung: „PDF gibt es nur in der Desktop-App. Im Browser die Ausgabe als HTML erzeugen und mit ‚Drucken‘ ausgeben.“ Die Versorgung bietet im „⋯“ dagegen gar kein PDF an, nur „Bestellliste als HTML“. Derselbe Fall wird an zwei Stellen verschieden behandelt.
  - **[beobachtet]** Funkplan steht in Ausgaben **und** im „⋯“ des Funkplans. Bestell-, Belegungs- und Vorausschauliste stehen **nur** im „⋯“ der Versorgung. Anforderungen und Eingangskorb haben im Blatt keine Ausgabe (Anforderungen nur unter Ausgaben). Wer „ausdrucken“ will, muss wissen, welches Blatt welchen Weg hat.
  - **[beobachtet]** Positiv: Nach dem Erzeugen steht überall gleich „Geschrieben: druck_2026-11-05_2105.html (7620 Bytes) · Öffnen · Herunterladen · Drucken“. Ich muss nicht wissen, wo die Datei liegt.
  - **[beobachtet]** Im erzeugten Druck stehen technische Zeilen („2026-09-08_uebung-weser-ems_227e68“, „@bos/eeb-format 0.0.0“) und „Stand: 5.11.2026, 21:05:27“ statt der Datum-Zeit-Gruppe aus dem Kopfband.
  - **[beobachtet]** Unter denselben Knöpfen steht „Einsatz beenden“ im gleichen Knopfstil (eine Rückfrage folgt laut Handbuch, [nicht prüfbar] ohne den Einsatz zu gefährden, deshalb nicht ausgelöst).
- **Erwartung der Rolle:** Ein benannter Weg „Für die Lagebesprechung“ (Status und Stärke auf einen Blick). Die übrigen Ausgaben sind nach Sachgebiet gruppiert. Jede Ausgabe, die ein Blatt hat, steht auch im „⋯“ dieses Blattes. Im Browser werden nur Formate angeboten, die gehen. „Einsatz beenden“ steht abgesetzt.
- **Auswirkung im Einsatz:** Fünf Minuten vor der Lagebesprechung wird probiert. Im Browser kommt erst einmal die Fehlermeldung. **[Annahme]** Am Ende liegt der falsche Ausdruck auf dem Tisch oder er wird von Hand abgeschrieben.
- **Empfehlung:** Die Ausgaben nach Zweck gruppieren, mit einem hervorgehobenen Ausdruck für die Lagebesprechung. In der Web-Schale nicht verfügbare PDF-Knöpfe ausblenden wie in der Versorgung. Jedem Fachblatt sein „⋯ → Ausgabe“ geben (Anforderungen, Eingangskorb). Technische Kennungen aus dem Druckkopf nehmen und die Zeitangaben einheitlich setzen.
- **Verifikation:** Ein neuer Gehilfe findet ohne Hilfe in unter 30 s den Ausdruck für die Lagebesprechung. In der Web-Schale gibt es keinen Knopf, der mit „gibt es nur in der Desktop-App“ antwortet.

### P2-5 — Neue Anforderung ohne Kennung

- **Fundstelle / Aufgabe:** Prüfaufgabe 1 (S3). Aufnahmen `09-anf-maske.png`, `13-anf-angelegt.png`.
- **Beobachtung:** **[beobachtet]** Das Feld „Kennung“ ist leer und freiwillig. Die angelegte Anforderung steht mit leerer Kennungsspalte zwischen „ANF-2026-001“ und „ANF-2026-002“. Tagebuch und Statuszeile nennen sie „Anforderung (FGr R THW OV Westerstede)“. **[Code]** Leere Vorbelegung `Anforderungsformular.tsx:26`, keine Vergabe.
- **Erwartung der Rolle:** Jede Anforderung bekommt sofort eine fortlaufende Nummer, die ich am Telefon nennen kann. Eine eigene Nummer bleibt möglich.
- **Auswirkung im Einsatz:** Rückfragen („Ihre Anforderung von 21:01 …“) gehen über Uhrzeit und Freitext. Bei zwei gleichen Einheitenbezeichnungen wird es mehrdeutig.
- **Empfehlung:** Die nächste freie ANF-Nummer vorschlagen. Überschreiben bleibt erlaubt.
- **Verifikation:** „Anforderung anlegen“ zeigt im Feld Kennung bereits „ANF-2026-005“.

### P3-1 — Begriffe, Zahlen und Formate weichen zwischen Ansichten ab

- **Fundstelle:** Abschnittsbaum, Druck, Versorgung, Tooltips. Aufnahmen `02-lage.png`, `31-druck-inhalt.png`, `15-versorgung.png`, `17-bestellt-470.png`.
- **Beobachtung [beobachtet]:**
  - „EA Deich Nord“ steht im Baum mit „11 · 2/10/65“ (mit Unterabschnitt), im Druck mit „1/6/32 = 39“ (ohne). Gleicher Name, andere Zahl.
  - Dieselbe Mahlzeit heißt „NACHT 0000“ (Plan), „Nachtverpflegung 0000“ (Karte), „Nacht 0000“ (Maske) und „Nacht 06.11.“ (Statuszeile/Tagebuch).
  - Die Spalte Ausgabestelle zeigt „Logistik (Vorbelegung)“, die Bestellmaske bietet nur „— keine —“.
  - Der Tooltip an den Zellen der Einheitentabelle zeigt „2026-11-05T20:35:26.470Z“ (UTC, ISO), das Kopfband „052105NOV26“, Listen „05.11.2026 21:01“, der Druck „5.11.2026, 21:05:27“.
  - Die Lage nennt „40 Einheiten“ bzw. „Alle erfassten Einheiten 39“, der Funkplan „39 Einheiten“.
- **Erwartung der Rolle:** Ein Name, eine Zahl, ein Zeitformat. Ein Gehilfe, der einen Wert vorliest, liest denselben, den der Leiter am Monitor sieht.
- **Empfehlung:** Im Druck „EA Deich Nord (mit UA)“ oder die Baumzahl übernehmen. Mahlzeitennamen vereinheitlichen. Zeiten überall als Datum-Zeit-Gruppe oder TT.MM.JJJJ hh:mm in Ortszeit.
- **Verifikation:** Für „EA Deich Nord“ zeigen Baum, Druck und Monitor dieselbe Zahl. Kein ISO-UTC-Zeitstempel an der Oberfläche.

### P3-2 — Bearbeitungsgesten und Hinweistexte nicht deckungsgleich

- **Fundstelle:** Funkplan-Zuordnung, Lage. **[Code]** `apps/desktop/src/renderer/Funkzuordnung.tsx:232-233`. Aufnahmen `54-lage-dblclick-name.png`, `55-funkplan-stift.png`.
- **Beobachtung [beobachtet]:** Der Funkplan erklärt: „überschrieben werden sie in der Maske der Einheit (Doppelklick auf den Namen)“. Im Funkplan tut ein Doppelklick auf den Namen nichts. Die Maske öffnet der Stift ✎ daneben. In der Lage macht derselbe Doppelklick den Namen zum Textfeld, also Umbenennen der Einheit. Bearbeiten heißt damit in der Lage „Doppelklick“, im Funkplan „✎“, in Anforderungen „Leiste“.
- **Erwartung der Rolle:** Eine Geste bedeutet überall dasselbe. Der Hinweistext beschreibt die Geste, die in diesem Blatt wirkt.
- **Auswirkung im Einsatz:** Wer den Hinweis befolgt, landet in der Lage im Umbenennen einer Einheit, ausgerechnet am Datensatz eines anderen Sachgebiets.
- **Empfehlung:** Den Hinweis im Funkplan auf „✎“ ändern oder den Doppelklick dort wie beschrieben wirken lassen. Langfristig in beiden Tabellen dieselbe Geste für „Maske der Einheit“.
- **Verifikation:** Der Text im Funkplan und die tatsächliche Wirkung stimmen überein. Ein Doppelklick auf den Namen bedeutet in Lage und Funkplan dasselbe.

### P3-3 — Werkzeugzeilen fast, aber nicht ganz einheitlich

- **Fundstelle:** Kopf der Karten in Lage, Eingangskorb, Anforderungen, Funkplan, Versorgung. Aufnahmen `02-lage.png`, `07-eingang.png`, `08-anforderungen.png`, `23-funk-auswahlleiste.png`, `15-versorgung.png`.
- **Beobachtung [beobachtet]:** Suche gibt es in Lage, Funkplan und Tagebuch, nicht in Eingangskorb und Anforderungen. „⋯“ gibt es in Eingangskorb, Funkplan und Versorgung, nicht in Lage und Anforderungen. Der Hauptknopf steht in der Lage im Kartenkopf, im Funkplan in der Zeile des Umschalters, in der Versorgung (Verpflegung) unten in der Bestellkarte. Die Einstiegszeile „Verstanden“ erscheint an jedem Blatt und jeder Umschalterseite einzeln, beim Gehilfen also sechs- bis achtmal.
- **Erwartung der Rolle:** Oben links der Hauptknopf, rechts Suche und „⋯“, immer an derselben Stelle, auch wenn ein Blatt einmal nichts im „⋯“ hätte.
- **Empfehlung:** Die feste Reihenfolge „Umschalter · Hauptknopf · … · Suche · ⋯“ für alle Fachblätter. Suche auch in Anforderungen und Eingangskorb.
- **Verifikation:** Bildschirmfotos aller Fachblätter übereinanderlegen: Hauptknopf, Suche und „⋯“ liegen an derselben Stelle.

---

## Positives

- **Auswahl und Auswahlleiste** sind in Lage, Funkplan und Anforderungen gleich: Klick wählt, Leiste nennt „1 gewählt · <Name>“, die Schritte passen zum Zustand (Anforderungen zeigen offen nur „Zusagen …“ und abgesetzt „Stornieren …“), Esc hebt die Wahl auf. **[beobachtet]**
- **Quittung und Rückgängig** an fester Stelle mit Klartext und Rückfrage. Die Rücknahme steht im Tagebuch als „Rücknahme“. Das Tagebuch zeigt „vorher → nachher“ mit Akteur, auch die doppelte Zusage. **[beobachtet]**
- **Wiedereinstieg:** Suche „Pionier“, Filter „Ruhe“ und die gewählte Zeile überstehen den Wechsel Lage → Eingang → Lage. Der Filter ist sichtbar („Einheiten 1“, „Alle zeigen“, „Auswahl: Ist-Stärke“). Das zuletzt offene Blatt und der Umschalter in Eingang überstehen ein Neuladen. Der Anforderungsentwurf übersteht Blattwechsel und Neuladen. **[beobachtet]**
- **Sperre in der Einheitentabelle** mit Schloss und Wort, Übernahme nur bewusst, und eine Konfliktprüfung, die nichts still überschreibt („Nicht gespeichert – Wurde inzwischen von Platz B (S4) geändert“). **[beobachtet]**
- **Übergabe S1 → S4:** Stärkeänderungen erscheinen sofort im Mahlzeitenplan und als „47 −3 fehlen“ an der Bestellung. **[beobachtet]**
- **Ausgaben** nennen nach dem Erzeugen Dateiname und Größe und bieten „Öffnen · Herunterladen · Drucken“, in Ausgaben und Versorgung gleich. **[beobachtet]**
- **Rufgruppe anlegen** mit Fleetmapping-Vorschlägen und dem Satz, dass ein freier Name als eigene Gruppe angelegt wird. „Rufgruppe ändern …“ aus der Leiste ordnet in zwei Klicks zu. **[beobachtet]**

---

## Abschluss

- **Aufgabe der Rolle geschafft:** mit Umwegen. S1 (Stärke), S3 (Anforderung), S4 (Verpflegung), S6 (Rufgruppe), Ausdruck und Berichtigung gingen. Der Ausdruck nur über HTML und Raten, die Bestellberichtigung mit Datenverlust beim Lieferanten.
- **Nebenaufzeichnung auf Papier nötig:** ja, für halb erfasste Einheiten und Rufgruppen bei Unterbrechungen und für Zusagen, die zwei Plätze gleichzeitig erfassen könnten.
- **Größte Lücke an einer Übergabe:** Vom zweiten Gehilfen zum Leiter: Eine an einem anderen Platz erfasste Zusage wird ohne Hinweis überschrieben, und der Leiter sieht nur die zweite.
- **Größtes Einsatzrisiko:** Gleichzeitige Bearbeitung von Anforderungen und Bestellungen ist nicht gesperrt, und der Konfliktzähler zeigt auf keinen Datensatz. Widersprüchliche Zusagen bleiben unbemerkt.
- **Top-Priorität für die nächste Iteration:** Die Bearbeitungssperre der Einheitentabelle samt Konfliktprüfung auf alle Masken übertragen, die bestehende Datensätze ändern (zuerst Anforderung und Bestellung), und den Konfliktzähler zur betroffenen Zeile führen lassen.
