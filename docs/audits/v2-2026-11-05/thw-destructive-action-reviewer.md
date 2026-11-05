# Audit: Folgenschwere Bedienhandlungen (THW Destructive Action Reviewer)

**Datum:** 05.11.2026 · **Stand:** HEAD nach `ffc3125` (Einsatzauswahl mit „Neuer Einsatz …“, Profilwahl,
Auswahlleiste als Baustein, „⋯“ in Funkplan und Versorgung, Filterzeilen in Eingang/Anforderungen,
Fleetmapping-Vorschlag, Nachtbild)

**Material:** eigene Web-Schale (Port 8203) mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten),
Profil „Führungsstelle (S1)“, Blätter außerhalb des Profils über „Mehr“. Bedient mit Playwright (Chromium,
1600×1000, deviceScaleFactor 1), für Mehrplatz-Effekte zwei bis drei Browserkontexte gleichzeitig auf
derselben Schale. 66 Screenshots unter
`/tmp/claude-0/-home-user-S1-Control/5e4b7d40-2c4b-58c0-a32e-96410bb256d6/scratchpad/shots/destructive/`
(im Text nur mit Dateinamen genannt). Quelltext lesend als Beleg. Vergleich mit
`docs/audits/thw-destructive-action-reviewer.md` (v1, rein codebasiert) und
`docs/audits/v2-2026-10-29/thw-error-recovery-reviewer.md`.

**Kennzeichnung:** **[beobachtet]** an der laufenden Anwendung ausgelöst und gesehen · **[Code]** aus dem
Quelltext belegt (Datei:Zeile) · **[Annahme]** plausibel, nicht bestätigt · **[nicht prüfbar]** mit diesem
Material nicht zu prüfen.

**Rolle:** praktisch-technischer Helfer an der S1-Stelle, der unter Zeitdruck Status setzt, Einheiten
verschiebt, zusammenführt, Abschnitte und Rufgruppen auflöst, Anforderungen storniert und am Ende den
Einsatz beendet — und dabei auch mal daneben greift.

---

## Urteil

Gegenüber v1 hat sich viel getan, und vieles davon trägt: Entfernen fragt den Grund und nennt Einheit und
Stärke, Archivieren ist räumlich abgesetzt und verlangt ein Häkchen, Beenden nennt die Zahl der betroffenen
Arbeitsplätze und die offenen Punkte, der Status wird erst mit „Übernehmen“ geschrieben (Wegklicken
verwirft), und „Rückgängig“ fragt mit Namen des Schritts nach. Das Kerngeschäft „falsch geklickt, sofort
zurück“ geht am selben Arbeitsplatz ohne fremde Hilfe.

Die Reibung sitzt dort, wo eine Handlung **mehr** tut, als die Maske sagt: Zusammenführen übernimmt still
Status, Organisation und Bereich des Ziels und nimmt so Kräfte aus der Ist-Stärke; Verschieben und Auflösen
in „Angefordert / Anmarsch“, „Einsatz beendet“ oder in einen aufgelösten Abschnitt tun das ebenfalls, ohne
es anzukündigen. Am schwersten wiegt der Mehrplatzfall: **„Rückgängig“ überschreibt eine jüngere Änderung
eines anderen Arbeitsplatzes**, während die Rückfrage das Gegenteil verspricht. Die Statuszeile, in der
Bestätigung, Rückgängig und Warnungen stehen, ist bei einer vollen Lage aus dem Bild gescrollt. Und was ein
Rückgängig nicht mehr erreicht (neue Sitzung, anderer Rechner), lässt sich bei Einheit, Abschnitt und
Dienstposten in der Oberfläche nicht wiederherstellen, obwohl die Masken es zusagen.

Ohne fremde Hilfe erledigbar: das versehentliche Einzelereignis am eigenen Platz ja; ein verunglücktes
Zusammenführen, ein überschriebenes Rückgängig oder ein entfernter Datensatz aus einer früheren Sitzung nein.

| Priorität | Anzahl |
|---|---|
| P0 | 2 |
| P1 | 3 |
| P2 | 3 |
| P3 | 3 |

---

## Findings

### F1 — P0 — „Rückgängig“ überschreibt die jüngere Änderung eines anderen Arbeitsplatzes

- **Fundstelle / Aufgabe:** Statuszeile „↶ Rückgängig“ bzw. Strg+Z, Mehrplatzbetrieb; Einheit „Gr Betreuung Nacht“.
- **Beobachtung [beobachtet]:** Platz A setzt den Status Einsatz → Ruhe. Platz B sieht Ruhe und setzt
  Ruhe → **Nicht einsatzbereit**; A sieht das nach drei Sekunden. A drückt Strg+Z. Die Rückfrage lautet:
  „Status der Einheit ‚Gr Betreuung Nacht‘ geändert rückgängig machen? Das gilt für alle Arbeitsplätze. Es
  nimmt nur Ihren letzten eigenen Schritt zurück, **nicht den eines anderen Arbeitsplatzes**.“
  (`38-undo-fremd-frage.png`). Nach „Rückgängig machen“ steht die Einheit an **beiden** Plätzen auf
  **Einsatz** (`39-undo-fremd-ergebnis.png`, `39b-undo-fremd-B.png`). B's „Nicht einsatzbereit“ ist weg. An
  der Zelle erscheint nur ein kleines ⚠ mit dem Tooltip „Ein anderer Arbeitsplatz hat es zuletzt anders
  gesehen (§3.8)“ (`40-konfliktmarke.png`). Das Tagebuch zeigt „Status gesetzt: Nicht einsatzbereit →
  Einsatz Rücknahme“ (`65-tagebuch-fremdes-undo.png`). B's eigener Rückgängig-Knopf bietet danach weiter
  „Status geändert“ an. Derselbe Ablauf mit „Betreuungszug“ ergab dasselbe Bild.
- **[Code]:** Die Rücknahme setzt bewusst den beim Zurücknehmen geltenden Wert als `vorher` und vermerkt
  nur einen Hinweis `undoTrifftFremdenStand` (`packages/domaene/src/undo.ts:225-232`); der Text der Rückfrage
  steht in `apps/desktop/src/renderer/Ruecknahme.tsx:124-126`.
- **Erwartung der Rolle:** „Rückgängig“ nimmt meinen Vertipper zurück. Hat inzwischen jemand anderes das Feld
  geändert, will ich das **vorher** wissen: „B hat inzwischen ‚Nicht einsatzbereit‘ gesetzt — trotzdem auf
  ‚Einsatz‘ zurück?“, oder es passiert gar nichts.
- **Auswirkung im Einsatz:** Eine als nicht einsatzbereit gemeldete Einheit (Gerät ausgefallen, Kräfte
  erschöpft) steht wieder als „Einsatz“ in Lage, Ist-Stärke und Ausdruck und kann erneut eingeplant werden.
  B merkt es nur, wenn er zufällig das Dreieck sieht. Das ist genau der Fall „falscher Status“.
- **Empfehlung:** Vor dem Zurücknehmen prüfen, ob das Feld seither von einem anderen Platz geändert wurde;
  wenn ja, in der Rückfrage den fremden Wert, den Platz und die Uhrzeit nennen und als Vorgabe „Abbrechen“
  setzen — oder die Rücknahme in diesem Fall ablehnen. Den Text „nicht den eines anderen Arbeitsplatzes“
  nur behalten, wenn er stimmt. Beim betroffenen Platz B eine sichtbare Meldung „A hat Ihre Änderung an
  … zurückgenommen“.
- **Verifikation:** Obigen Ablauf mit zwei Browsern wiederholen; B's Wert muss nach A's Rückgängig stehen
  bleiben oder A muss vorher eine Rückfrage mit B's Wert sehen; B bekommt eine Mitteilung.

### F2 — P0 — Zusammenführen übernimmt still Status, Organisation und Bereich des Ziels; Kräfte fallen aus der Ist-Stärke, Rückweg verweigert

- **Fundstelle / Aufgabe:** Lage → zwei Zeilen wählen → Auswahlleiste „Zusammenführen“.
- **Beobachtung [beobachtet]:**
  - Die Maske warnt „Das ist nicht umkehrbar …“ und listet „geht auf: …“ (`10-zusammenfuehren-maske.png`,
    `11-zusammenfuehren-ziel.png`). Sie sagt **nicht**, dass Status, Organisation, Schicht und Bereich des
    Ziels für alle Kräfte gelten.
  - „Tr Log Schlauch“ (Feuerwehr, Einsatz, Früh, 3) + „Verpflegungstrupp“ (JUH, Ruhe, Nacht, 5) → eine
    Zeile „Verpflegungstrupp, JUH, Ruhe, Nacht, 0/2/6 = 8“. Drei Feuerwehrleute sind jetzt JUH und in Ruhe.
  - „Pioniermaschinenzug“ (Bundeswehr, Ruhe, 25, zählt in die Ist-Stärke) in „SanZ Bereitstellung“
    (ASB, Rufbereitschaft) → 40 Kräfte in Rufbereitschaft; die Kopfzeile springt von „+63 erwartet“ auf
    „+88 erwartet“, 25 Kräfte sind aus der Ist-Stärke verschwunden (`14-rueckgaengig-rueckfrage.png`).
  - „Meldekopf Spät“ (Einsatzbereit) in „Stab FüSt Nacht“ (Rückmarsch) → „beendet“ steigt von 7 auf 10
    (`16-undo-merge-meldung.png`). Abschnittsübergreifend und organisationsübergreifend geht alles ohne Hinweis.
  - Die Statuszeile bietet danach „↶ Rückgängig: Einheit ‚…‘ zusammengeführt“ an, fragt „Rückgängig
    machen?“ — und lehnt dann ab: „‚Einheit zusammengeführt‘ wird durch den inversen Fachvorgang ‚Einheit
    aufgeteilt‘ zurückgenommen. Die Werte dafür stehen nicht im Original. Bitte über den Vorgang ‚Einheit
    aufgeteilt‘ zurücknehmen.“ Der Schritt bleibt oben auf dem Stapel; frühere eigene Schritte sind damit
    per Rückgängig nicht mehr erreichbar.
  - Unter „Spalten → Stillgelegte zeigen“ stehen die aufgegangenen Einheiten wieder in der Tabelle — **nicht**
    durchgestrichen (anders als die entfernte „Tr Log WT“), mit bedienbarem Statusknopf
    (`53-entfernte-einheit.png`). Ein Statuswechsel an „Pioniermaschinenzug“ wird mit „✓ … gespeichert“
    bestätigt, ändert aber keine Summe (`54-aufgegangene-einheit-schreiben.png`).
- **[Code]:** Die Maske hält die Unumkehrbarkeit fest (`apps/desktop/src/renderer/Einheitenmasken.tsx:17-19`,
  `:247`); die Abweisung kommt aus `packages/domaene/src/undo.ts:340-344`.
- **Erwartung der Rolle:** Vor dem Zusammenführen sehe ich, was **danach** gilt: „Ergebnis: Verpflegungstrupp,
  JUH, Ruhe, Logistik, 8 Kräfte — 3 Kräfte wechseln von Einsatz auf Ruhe, Organisation Feuerwehr geht
  verloren.“ Unterschiedliche Organisation oder ein Status, der die Ist-Stärke ändert, wird ausdrücklich
  angesagt. Ein Knopf, der „Rückgängig“ anbietet, nimmt auch zurück — oder bietet es gar nicht erst an.
- **Auswirkung im Einsatz:** Kräfte verschwinden still aus Ist-Stärke, Verpflegung und Abrechnung bzw.
  landen bei der falschen Organisation (Kostenerstattung je Organisation). Der Fehler fällt erst bei der
  nächsten Stärkemeldung auf; korrigieren lässt er sich nur durch Aufteilen von Hand mit neuer Kennung, die
  Bezüge (Aufträge, Anforderungen) bleiben an der Zielzeile. Die „Geisterzeilen“ unter „Stillgelegte“ laden
  zu Eingaben ein, die nichts bewirken.
- **Empfehlung:** In der Maske eine Ergebniszeile mit Status, Organisation, Bereich und Stärke und eine
  benannte Warnung, wenn sich die Ist-Stärke ändert oder Organisationen gemischt werden; bei
  unterschiedlicher Organisation zusätzliche Bestätigung oder Sperre. „Rückgängig“ für diesen Schritt nicht
  anbieten, sondern direkt „Über ‚Aufteilen‘ korrigieren“ nennen, und den Schritt so ablegen, dass frühere
  Schritte erreichbar bleiben. Aufgegangene Einheiten unter „Stillgelegte“ als „aufgegangen in …“
  kennzeichnen und nicht bearbeitbar zeigen.
- **Verifikation:** Ruhe-Einheit in Rufbereitschafts-Einheit führen: Die Maske nennt vorher „−25 Ist-Stärke“;
  nach dem Schritt bietet die Statuszeile kein unerfüllbares Rückgängig an; „Stillgelegte zeigen“ zeigt die
  aufgegangene Zeile als solche und ohne Statusknopf.

### F3 — P1 — Ziele, die nicht zählen, und aufgelöste Abschnitte stehen ohne Hinweis in Verschieben, Auflösen und Aufteilen

- **Fundstelle / Aufgabe:** Verschieben (Strg+M), Abschnitt „⋯ → Auflösen …“, Aufteilen — jeweils die
  Abschnittswahl.
- **Beobachtung [beobachtet]:**
  - Auflösen „EA Pumpwerk Süd“ nach „Angefordert / Anmarsch“: Die Maske nennt „6 Einheit(en), Stärke
    1/4/16“, aber nicht, dass das Ziel nicht zählt (`20-aufloesen-maske.png`). Danach Kopfzeile 11/36/161 //
    208 statt 12/40/177 // 229, „+112 erwartet“ statt „+88“; die sechs Einheiten stehen mit Status „Einsatz“
    im Anmarsch-Bereich (`21-nach-aufloesen.png`) und fallen in der Versorgung aus dem Mahlzeitenplan
    („Angefordert / Anmarsch nicht enthalten“, `55-versorgung.png`).
  - Verschieben „FGr Räumen A“ + „LG Rastede“ nach „Einsatz beendet“: 16 Kräfte weg aus der Ist-Stärke,
    „beendet“ von 7 auf 23; die Maske listet das Ziel gleichrangig neben Einsatzabschnitten
    (`36-verschieben-maske.png`).
  - Der aufgelöste Abschnitt „EA Pumpwerk Süd“ steht in Verschieben, Aufteilen und Einheit anlegen ohne
    Kennzeichnung als Ziel. „St PSNV“ (Einsatz) dorthin verschoben landet tatsächlich in „Angefordert /
    Anmarsch“ (Funkplan-Spalte Bereich), Ist-Stärke −3/−4; die Bestätigung lautet nur „Einheit ‚St PSNV‘
    verschoben · gespeichert“ (`61-in-aufgeloesten-verschoben.png`).
  - Gegenbeispiel im selben Programm: Die Maske „Einheit aus ANF-… anlegen“ markiert „Eingang (zählt
    nicht)“, „Angefordert / Anmarsch (zählt nicht)“, „Einsatz beendet (zählt nicht)“ (`35-anf-einheit-anlegen.png`).
- **[Code]:** Die gemeinsame Abschnittswahl listet alle Knoten flach, ohne Typ- oder Aufgelöst-Kennung
  (`apps/desktop/src/renderer/Maskenfelder.tsx:95-119`); die Kennzeichnung gibt es nur in
  `AnforderungZuEinheit.tsx:311-318`.
- **Erwartung der Rolle:** Ein Ziel, das die Kräfte aus der Ist-Stärke nimmt, ist als solches erkennbar, und die
  Maske sagt die Folge in Zahlen („−21 Kräfte aus der Ist-Stärke“). Aufgelöste Abschnitte stehen gar nicht
  zur Wahl; wenn doch, sagt die Bestätigung, wo die Einheit wirklich gelandet ist.
- **Auswirkung im Einsatz:** Ein Griff in die falsche Zeile der Auswahlliste (die Ziele stehen untereinander)
  nimmt ganze Einsatzabschnitte aus Lagebild, Ist-Stärke und Verpflegungsbestellung, während die Einheiten
  vor Ort weiterarbeiten. Bei einem aufgelösten Ziel landet die Einheit an einem dritten Ort, den niemand
  gewählt hat.
- **Empfehlung:** Dieselbe Kennzeichnung „(zählt nicht)“ in allen Abschnittswahlen; aufgelöste Abschnitte
  ausblenden oder als „aufgelöst → …“ sperren; in der Maske die Wirkung auf die Ist-Stärke nennen, sobald das
  Ziel nicht zählt; die Bestätigung nennt das tatsächliche Ziel.
- **Verifikation:** In allen drei Masken stehen nicht zählende Ziele gekennzeichnet, aufgelöste fehlen; ein
  Verschieben nach „Einsatz beendet“ zeigt vor dem Bestätigen die Differenz der Ist-Stärke.

### F4 — P1 — Bestätigung, Rückgängig und Warnungen stehen in einer Statuszeile, die aus dem Bild scrollt

- **Fundstelle / Aufgabe:** jeder Schreibschritt im Blatt Lage bei voller Tabelle (40 Einheiten).
- **Beobachtung [beobachtet]:** Bei 1600×1000 ist das Dokument 2598 px hoch; die Statuszeile mit
  „✓ … gespeichert“, „↶ Rückgängig: …“ und den Meldungen (etwa die Abweisung des Zusammenführen-Rückgängig
  aus F2) liegt bei y ≈ 2564 und ist nach einem Statuswechsel nicht sichtbar (`17-viewport-nach-schreiben.png`,
  Vollbild `17b-fullpage.png`). Sichtbar ist sie nur bei kurzen Blättern (`22a-aufgeloeste.png`). Die
  Rückfrage zu Strg+Z erscheint zwar als Maske; die Antwort darauf (Erfolg oder Abweisung) aber wieder unten.
- **[Code]:** Der Kommentar verlangt „darf nicht wegscrollen“, die Regel setzt aber keine feste Position
  (`apps/desktop/src/renderer/index.html:824-836`).
- **Erwartung der Rolle:** Nach einem Klick sehe ich ohne zu scrollen, ob er gespeichert ist, und habe
  „Rückgängig“ an einer festen Stelle im Blick.
- **Auswirkung im Einsatz:** Wer nach einem Fehlgriff zurücknehmen will, muss erst wissen, wo der Knopf ist.
  Eine abgewiesene Rücknahme (F2) bleibt unbemerkt; der Helfer glaubt, sie sei erfolgt. Das in Runde 6 als
  Entlastung eingeführte Bestätigungsband wirkt so nur bei kurzen Listen.
- **Empfehlung:** Statuszeile am unteren Fensterrand festhalten (wie es der Kommentar verlangt) oder
  Bestätigung und Abweisung zusätzlich nahe der Handlung zeigen.
- **Verifikation:** Lage mit 40 Einheiten, Status einer Zeile in der Mitte ändern: Bestätigung und
  „Rückgängig“ sind ohne Scrollen sichtbar.

### F5 — P1 — Wiederherstellen fehlt für Einheit, Abschnitt und Dienstposten, obwohl die Masken es zusagen

- **Fundstelle / Aufgabe:** einen versehentlich entfernten/aufgelösten Datensatz zurückholen, nachdem
  Rückgängig nicht mehr greift (anderer Browser, anderer Rechner, Schichtwechsel).
- **Beobachtung [beobachtet]:**
  - Abschnitt: Die Auflösen-Maske sagt „Der Abschnitt bleibt sichtbar und lässt sich wiederherstellen“. Im
    „⋯“ des aufgelösten Abschnitts steht aber nur Umbenennen … Auflösen (grau, „Schon aufgelöst“); kein
    Wiederherstellen (`22a-aufgeloeste.png`). Zudem zeigt die Führungsorganisation (Harke) den aufgelösten
    „EA Pumpwerk Süd“ ohne Kennzeichnung als normalen Abschnitt mit „0 Einh.“ (`50-fuehrungsorganisation.png`).
  - Einheit: „Entfernen ist kein Löschen“ — die entfernte „Tr Log WT“ steht unter „Stillgelegte zeigen“
    durchgestrichen da, Auswahlleiste und Kontextmenü bieten aber Verschieben … Entfernen, kein
    Wiederherstellen (`53-entfernte-einheit.png`).
  - Dienstposten: „Der Dienstposten bleibt im Einsatztagebuch stehen und lässt sich wiederherstellen.“ Nach
    dem Entfernen ist die Zeile „SGL 2“ aus dem Blatt verschwunden, auch nach Neuladen.
  - Gegenbeispiel: Eine aufgelöste Rufgruppe bietet „Wiederherstellen“ und bringt sogar die drei
    Zuordnungen zurück (`29-funkplan-nach-aufl.png`).
  - Rückgängig selbst ist an den Browser gebunden: Neuladen im selben Browser behält den Verlauf (anders als
    der Tooltip „nach dem Neuladen … leer“ sagt), ein neuer Browserkontext beginnt leer.
- **[Code]:** Kein Menüeintrag für Abschnitte (`apps/desktop/src/renderer/Abschnittsmenue.tsx:40-57`), Zusage
  im Text (`Abschnittsmasken.tsx:225`); `EinheitWiederhergestellt` ist als Ereignis benannt
  (`Ereignisnamen.ts:23`), aber von keiner Oberfläche ausgelöst; die Dienstpostenzeile hätte einen Knopf
  (`Fuehrungsstellenzeilen.tsx:120-130`), der in der Lage nicht erschien.
- **Erwartung der Rolle:** Was „kein Löschen“ ist, kann ich zurückholen — an der durchgestrichenen Zeile, von
  jedem Arbeitsplatz, auch nach Stunden.
- **Auswirkung im Einsatz:** Ein Fehlgriff, der erst bei der nächsten Lagebesprechung auffällt, lässt sich nur
  durch Neuerfassen beheben: neue Kennung, Tagebuch und Bezüge (Rufgruppe, Ablösung) gehen an der neuen Zeile
  verloren. Die Zusage in der Maske senkt die Hemmschwelle, überhaupt zu klicken.
- **Empfehlung:** „Wiederherstellen …“ (mit Grund) an entfernten Einheiten, aufgelösten Abschnitten und
  entfernten Dienstposten wie bei Rufgruppen; bis dahin die Maskentexte ehrlich machen („zurück nur über
  Rückgängig an diesem Platz“).
- **Verifikation:** In einem frischen Browser eine zuvor entfernte Einheit und einen aufgelösten Abschnitt
  wiederherstellen; beide zählen danach wieder, das Tagebuch zeigt den Vorgang.

### F6 — P2 — Rückfragen und Bestätigungen nennen den Gegenstand nicht; Sammelschritte zerfallen

- **Fundstelle / Aufgabe:** Anforderung „Stornieren …“, Dienstposten „Entfernen“, Mehrfach-Verschieben.
- **Beobachtung [beobachtet]:**
  - „Anforderung stornieren“ fragt nur den Grund — ohne Kennung, „Ablösung für“ oder Auftrag
    (`33-stornieren-maske.png`); die vier Prüfanforderungen tragen alle „08.09.2026 05:30“.
  - „Dienstposten entfernen“ nennt weder Funktion noch Schicht, obwohl „Ltr FüSt“ zweimal (Tag/Nacht)
    untereinander steht; die Bestätigung danach lautet „✓ Dienstposten entfernt (‚D05‘)“ — eine interne Kennung.
  - Zwei Einheiten gemeinsam verschoben: Die Bestätigung nennt nur die letzte, ein Rückgängig nimmt nur
    „Sandsackkolonne“ zurück, „BGr Teilbar — Trupp“ bleibt im neuen Abschnitt (`37-nach-undo-verschieben.png`).
    Bereits am 29.10. als F12 gemeldet, unverändert.
  - Positiv dagegen: Die Entfernen-Maske nennt „Betrifft: ‚Tr Log WT‘, Stärke 0/1/2 (3 Kräfte)“
    (`08-entfernen-maske.png`), die Auflösen-Masken nennen Zahl und Stärke.
- **Erwartung der Rolle:** Jede Rückfrage sagt, **was** betroffen ist, wie die Entfernen-Maske; ein Schritt
  über mehrere Zeilen wird auch als ein Schritt zurückgenommen.
- **Auswirkung im Einsatz:** Wer in der Liste eine Zeile verrutscht ist, merkt es an der Rückfrage nicht und
  storniert die falsche Ablösung. Ein halb zurückgenommener Sammelschritt hinterlässt eine Lage, die keiner
  so gewollt hat.
- **Empfehlung:** Kennung und Kurzinhalt in jede Grund- und Rückfrage; Bestätigungen mit Klartextnamen;
  Mehrfachschritte als ein Rücknahmeschritt („2 Einheiten verschoben“).
- **Verifikation:** Stornieren zeigt „ANF-2026-001 · Ablösung für BGr 1 Oldenburg“; Rückgängig nach
  Zwei-Zeilen-Verschieben stellt beide zurück.

### F7 — P2 — Ein-Klick-Änderungen mit Wirkung auf alle Arbeitsplätze ohne Rückfrage

- **Fundstelle / Aufgabe:** Funkplan „⋯ → Schwelle“, Anforderung „Zusage zurück“, Kosten-Parameter,
  Eingangskorb „Übernahme zurück“.
- **Beobachtung [beobachtet]:** Ein Klick auf „15 min“ im „⋯“ des Funkplans setzt die Schwelle „kein Kontakt“
  für alle Arbeitsplätze; die Zahl „kein Kontakt“ springt von 0 auf 27 (`28-schwelle-15.png`). „Zusage zurück“
  setzt ANF-2026-002 ohne Rückfrage auf „Offen“ und löscht Zusagezeit und Zusagegeber aus der Zeile
  (`34-zusage-zurueck.png`). Ein Kosten-Parameter (PSA 180 → 999 €) wird beim Verlassen des Feldes mit Tab
  für den ganzen Einsatz geschrieben. Alle drei sind per Rückgängig am selben Platz umkehrbar.
  **[Code]** „Übernahme zurück“ schreibt ebenfalls sofort (`apps/desktop/src/renderer/Eingangskorb.tsx:155`);
  im leeren Korb der Prüflage **[nicht prüfbar]**.
- **Erwartung der Rolle:** Was den Bildschirm aller anderen umfärbt oder Daten aus einer Zeile entfernt, sagt
  das vor dem Klick („gilt für alle Arbeitsplätze“) oder ist im Menü deutlich vom Ausdruck getrennt.
- **Auswirkung im Einsatz:** Die Vermeldezentrale sieht plötzlich 27 Einheiten in Bernstein und beginnt
  Funkproben, ohne zu wissen, dass nur die Schwelle verstellt wurde. Eine weggeklickte Zusage fehlt bei der
  Planung der Ablösung.
- **Empfehlung:** Schwelle als kleine Maske mit „gilt für alle Arbeitsplätze“ oder mit Hinweis im Menü;
  „Zusage zurück“ und „Übernahme zurück“ mit Kurzrückfrage, die den gelöschten Inhalt nennt; Kosten-Parameter
  mit „Übernehmen“ statt Schreiben beim Tab.
- **Verifikation:** Jede dieser vier Handlungen zeigt vor dem Schreiben, was sich für wen ändert.

### F8 — P2 — Fremdes Entfernen schließt die eigene offene Maske stumm

- **Fundstelle / Aufgabe:** Platz A hat „Aufteilen“ für „Streifenwagen Absperrung“ offen und tippt die
  Bezeichnung; Platz B entfernt dieselbe Einheit.
- **Beobachtung [beobachtet]:** B's Entfernen geht ohne Sperre durch. Bei A verschwindet die Maske samt
  Eingabe ohne jede Meldung; die Seite springt, die Auswahlleiste zeigt nur noch „1 gewählt“ ohne Namen
  (`62a-A-maske-vorher.png`, `62-A-nach-fremdem-entfernen.png`). Gleiches mit „Sanitätsgruppe“.
- **Erwartung der Rolle:** Entweder sieht B „wird gerade von A bearbeitet“, oder A erfährt „Die Einheit wurde
  von B entfernt (Grund: …); Ihre Eingabe wurde nicht gespeichert“.
- **Auswirkung im Einsatz:** A hält die Aufteilung für erledigt oder sucht die Maske; die Teileinheit fehlt in
  der Lage. Der Grundsatz „Datensatz-Bearbeitungssperren sind Pflicht“ (`AGENTS.md` §4) greift hier sichtbar nicht.
- **Empfehlung:** Offene Masken als Bearbeitung anzeigen und fremdes Entfernen warnen; beim Wegfall des
  Datensatzes die Maske mit Meldung stehen lassen statt sie zu schließen.
- **Verifikation:** Obigen Zweiplatz-Ablauf wiederholen; A behält eine Meldung mit Grund und Urheber.

### F9 — P3 — Abweisungen und Hinweise in Entwicklersprache

- **Fundstelle:** Rückgängig nach Zusammenführen, Aufteilen-Maske, Konfliktmarke, Rückgängig-Tooltip.
- **Beobachtung [beobachtet]:** „… inversen Fachvorgang … Die Werte dafür stehen nicht im Original.“ (F2);
  „Die Wirkung ist relativ: Der Abzug steht an der neuen Einheit, nicht als neue Gesamtzahl an der Quelle —
  zwei gleichzeitige Aufteilungen derselben Einheit gehen so beide auf.“ (`59-aufteilen.png`);
  Konfliktmarke „(§3.8)“; Zellen tragen als Tooltip ISO-UTC-Zeiten („2026-11-05T20:35:26.552Z“). Der
  Rückgängig-Tooltip „nach dem Neuladen … leer“ stimmt in der Web-Schale nicht (Verlauf überstand das
  Neuladen im selben Browser).
- **Erwartung / Empfehlung:** Was zu tun ist, in einem Satz („Zusammenführen lässt sich nicht zurücknehmen —
  über ‚Aufteilen‘ korrigieren“); Paragrafen und ISO-Zeiten aus der Oberfläche; Tooltip an das tatsächliche
  Verhalten anpassen.
- **Auswirkung:** Unsicherheit genau in dem Moment, in dem ein Fehler korrigiert werden soll.
- **Verifikation:** Alle genannten Texte ohne Fachbegriffe der Ereignisschicht und ohne §-Verweis.

### F10 — P3 — Pflichtgrund nimmt jedes Zeichen

- **Fundstelle:** Entfernen, Stornieren, Rufgruppe auflösen, Dienstposten entfernen.
- **Beobachtung [beobachtet]:** „x“ und „.“ genügen als Grund; die Masken begründen die Pflicht ausführlich
  („Wer das später liest, soll erfahren, warum …“).
- **Erwartung / Empfehlung:** Mindestens ein Wort, gern Vorschläge („Fehlerfassung“, „doppelt“,
  „abgezogen“), damit der Grund im Tagebuch etwas aussagt.
- **Auswirkung:** Unter Zeitdruck wird der Pflichtgrund zum Reflexklick; das Tagebuch verliert die
  Unterscheidung „Versehen oder Absicht“.
- **Verifikation:** Ein einzelnes Satzzeichen wird mit Hinweis abgewiesen.

### F11 — P3 — Archivieren prüft nicht, ob die Akte erzeugt ist

- **Fundstelle:** Ausgaben → Einsatz abschließen → Archivieren.
- **Beobachtung [beobachtet]:** Archivieren ist gut abgesichert: eigener Block „Unumkehrbar“, Maske mit
  klarer Folge („auch nicht über ‚Rückgängig‘ … kein Wiedereröffnen“) und Pflicht-Häkchen
  (`46-archivieren-maske.png`). Ob eine Einsatzakte existiert, sagt sie nicht; nur „am besten vorher erzeugen“.
  Archiviert wurde in der Prüfkopie bewusst nicht, um weiter prüfen zu können.
- **Erwartung / Empfehlung:** Die Maske nennt „Letzte Akte: 21:03, nach diesem Stand keine Änderungen“ oder
  warnt „Keine Akte seit der letzten Änderung“.
- **Auswirkung:** Gering; der Archivzustand bleibt lesbar und exportierbar.
- **Verifikation:** Archivieren ohne vorherige Akte zeigt einen Hinweis mit Zeitpunkt.

---

## Positiv (beibehalten)

- Status schreibt nur mit „Übernehmen“/Enter; Wegklicken verwirft (`04-status-select.png`).
- Entfernen: rot, am Ende der Auswahlleiste abgesetzt, Grund Pflicht, Maske nennt Einheit und Stärke.
- „Rückgängig“ fragt nach und nennt den Schritt; die Rückfrage ist eine echte Maske (`14-rueckgaengig-rueckfrage.png`).
- Einsatz beenden nennt Zahl der gesperrten Arbeitsplätze und offene Punkte; Wiedereröffnen ebenso
  (`42-beenden-maske.png`). Eine halb ausgefüllte Maske am anderen Platz bleibt nach dem Beenden stehen und
  sagt „nur lesen“.
- Rufgruppe auflösen nennt die Zahl der Teilnehmer, fragt den Grund und lässt sich vollständig wiederherstellen.
- Archivieren ist räumlich und optisch getrennt und doppelt gesichert.
- Doppelklick auf „Zusammenführen“ erzeugte nur einen Vorgang.

## Nicht geprüft

- Eingangskorb (Ablehnen, Ablehnung/Übernahme zurück) **[nicht prüfbar]**: Korb der Prüflage leer, kein Bündel
  zur Hand; nur Code gelesen.
- Unterkunft/Sofortbedarf erledigt melden **[nicht prüfbar]**: keine Unterkünfte und kein Sofortbedarf in der Prüflage.
- Electron-Fassung, Handy-Breite, „Abmelden“ (stand im Fenstermenü der Web-Schale nicht), „Neuer Einsatz“
  mit doppeltem Namen.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen
- **Fremde Hilfe nötig:** ja — für ein verunglücktes Zusammenführen, einen fremd überschriebenen Status und
  jeden entfernten Datensatz, den Rückgängig am eigenen Platz nicht mehr erreicht.
- **Größtes Missverständnis:** „Rückgängig nimmt nur meinen eigenen Schritt zurück“ — tatsächlich überschreibt
  es eine inzwischen von einem anderen Platz gesetzte Änderung.
- **Größtes Einsatzrisiko:** Kräfte verschwinden still aus Ist-Stärke und Verpflegung, weil Zusammenführen,
  Verschieben und Auflösen in nicht zählende oder aufgelöste Bereiche ihre Folge nicht ankündigen.
- **Top-Priorität für die nächste Iteration:** Rückgängig darf eine jüngere fremde Änderung nicht ohne
  Rückfrage überschreiben, die den fremden Wert und Platz nennt (F1).
