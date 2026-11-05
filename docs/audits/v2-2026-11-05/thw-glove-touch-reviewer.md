# Audit: Bedienbarkeit mit Arbeitshandschuhen (THW Glove Touch Reviewer)

**Datum:** 05.11.2026
**Stand:** HEAD `ffc3125` (nach den Schnitten E2–E4: Einsatzauswahl mit „Neuer Einsatz …", Profilwahl, Auswahlleiste als Baustein, „⋯" in Funkplan und Versorgung, Filterzeilen in Eingangskorb und Anforderungen, Fleetmapping-Vorschlag, Nachtbild)
**Rolle:** Helfer mit Arbeitshandschuhen, grobe Fingerbewegung, stehend oder einhändig, Tablet oder Handy.

**Material:**
- Laufende Web-Schale mit eigener Kopie der Prüflage „Übung Weser-Ems" (40 Einheiten), Profil „Alle Blätter".
- Playwright-Geräteemulation `devices['iPad Mini']` (768×1024) und `devices['iPhone 13']` (390×664), jeweils Hoch- und Querformat (1024×768, 844×390). `pointer: coarse` und `hover: none` waren aktiv (geprüft per `matchMedia`).
- Trefferflächen und Abstände per `getBoundingClientRect` gemessen (Abstand = kürzeste Kante-zu-Kante-Entfernung zum nächsten bedienbaren Element). Bildschirmtastatur simuliert durch Verkleinern des Viewports auf ca. 330 px Höhe.
- Screenshots: `/tmp/claude-0/-home-user-S1-Control/5e4b7d40-2c4b-58c0-a32e-96410bb256d6/scratchpad/shots/glove-touch/` (Dateinamen unten jeweils angegeben).
- Quelltext lesend als Beleg (`apps/desktop/src/renderer/…`), Handbuch `docs/v2/HANDBUCH.md`, frühere Audits `docs/audits/thw-glove-touch-reviewer.md` (18.09.2026, nur Code) und `docs/audits/v2-2026-10-29/`.

**Kennzeichnung:** [beobachtet] = in der Emulation erlebt/gemessen · [Code] = aus dem Quelltext belegt · [Annahme] = plausibel, nicht vorgeführt · [nicht prüfbar] = in der Emulation nicht nachstellbar.

**Grenze der Methode:** Emulation ersetzt keinen Handschuhtest. Ob ein Tipp mit Handschuh als Doppeltipp, Wisch oder langer Druck ankommt, hängt vom echten Gerät ab. Wo das zählt, steht [Annahme] oder [nicht prüfbar].

**Messhinweis für spätere Prüfer:** Ein `fullPage`-Screenshot in Playwright schaltet bei langen Seiten die Emulation von `pointer: coarse` ab (danach messen Knöpfe 31 statt 44 px). Messungen deshalb vor dem Screenshot oder nur mit Viewport-Screenshots machen.

---

## Urteil

Seit dem Code-Audit vom 18.09. hat sich viel verbessert. Fast alle Knöpfe, Reiter, Menüeinträge, Filterchips, Baumzeilen und Felder messen bei grober Bedienung 44 px hoch [beobachtet; Code `index.html:3757-3781`]. Der Status lässt sich auf dem Handy über ein Blatt am unteren Rand ändern: großes Auswahlfeld, „Übernehmen" und „Abbrechen" nebeneinander mit 10 px Abstand. Ein Tipp daneben verwirft nicht stumm, sondern meldet „Nicht übernommen" [beobachtet, `08-statusblatt-iphone.png`]. Die Masken halten ihre Knopfleiste unten im Bild, auch bei simulierter Tastatur [beobachtet]. Für den Kernablauf braucht es weder Ziehen noch Wischgesten.

Reibung entsteht an drei Stellen. Erstens kommt **die Antwort auf einen Tipp nicht dort an, wo der Daumen ist**: Auf Handy und Tablet hochkant liegt die Auswahlleiste nach dem Tipp auf eine Zeile rund 1 800 px tiefer, außerhalb des Bildes. Die Bestätigung und „Rückgängig" stehen am Seitenende, dort ist „Rückgängig" nur 24 px hoch. Zweitens geht **das Bearbeiten einer Zelle (auch der Stärke) nur per Doppeltipp** und dann über die volle Bildschirmtastatur. Drittens gibt es **Listen mit 34 px hohen Einträgen ohne Abstand**, deren Namen sich nur in einer Ziffer unterscheiden (Fleetmapping-Vorschlag, Vorlagen).

Die Aufgaben „Status setzen", „Einsatz öffnen/anlegen", „Rufgruppe anlegen" und „Anforderung bearbeiten" schafft der Helfer ohne fremde Hilfe, teils mit Umwegen. „Stärke korrigieren" schafft er nur, wenn er den Doppeltipp kennt, und das sagt ihm die Oberfläche nur in Desktop-Begriffen („Doppelklick", „Enter", „Esc").

---

## Findings

### P0 – Einsatzkritisch

Kein P0. Ich habe keinen Weg gefunden, auf dem ein einzelner Fehltipp ohne Rückfrage oder Rückgängig Daten verliert. Entfernen, Stornieren, Auflösen und Erledigen öffnen jeweils eine Maske, und die Statuswahl fragt nach.

---

### P1 – Hoch

#### P1-1 Auswahlleiste erscheint auf Handy und Tablet hochkant außerhalb des Bildes

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Lage → Einheitentabelle: Zeile antippen, um Verschieben, Aufteilen, Kopieren, Ablösung anfordern, Funk … oder Entfernen zu erreichen. Ebenso Eingang → Anforderungen: Anforderung antippen.
3. **Beobachtung:**
   - [beobachtet] iPhone 13 hoch: Zeile „ZTr THW Deich" angetippt (Oberkante 304 px). Die Auswahlleiste beginnt bei 2 158 px, der Viewport ist 664 px hoch. Die Zeile wird hervorgehoben, sonst ändert sich nichts im Bild (`07-nach-tap-iphone-hoch.png`, `05-zeile-gewaehlt-iphone.png`).
   - [beobachtet] iPad Mini hoch: Abstand Zeile → Leiste ebenfalls 1 798 px, Leiste bei 2 338 px bei 1 024 px Viewport.
   - [beobachtet] iPad Mini quer (1 024 px breit): Die Leiste haftet wie vorgesehen 246 px unter der Zeile im Bild.
   - [beobachtet] Anforderungen, iPhone hoch: Leiste mit „Eingetroffen …", „Zusage zurück", „Stornieren …" bei 892 px, Viewport 664 px.
   - [Code] Die Leiste ist `position: sticky; bottom: 0` (`index.html:1551-1553`). Bis 900 px Breite setzt `index.html:3794-3799` `overflow-x: hidden` auf `html, body`. Damit wird `body` selbst zum Scrollbehälter und `sticky` greift nicht mehr. Der Kommentar bei `index.html:3975-3979` beschreibt genau diesen Effekt für das Verbindungsbanner. Das Banner wurde deshalb auf `fixed` umgestellt, die Auswahlleiste nicht. Betroffen sind also auch Handy quer (844 px) und alle Blätter, die den Baustein nutzen (Funkplan, Anforderungen).
4. **Erwartung der Rolle:** Ich tippe eine Einheit an und sehe sofort, was ich mit ihr machen kann, in Daumennähe.
5. **Auswirkung im Einsatz:** Der Helfer hält den Tipp für wirkungslos und tippt erneut. Erneutes Tippen hebt die Auswahl nicht auf, ein zu schneller zweiter Tipp startet aber die Zellbearbeitung (siehe P1-4). Um „Ablösung anfordern" zu erreichen, muss er 15–30 Bildschirmhöhen durch die Tabelle wischen, mit Handschuh auf einer Seite voller 44-px-Statuschips. Jeder Wisch, der als Tipp erkannt wird, öffnet ein Statusblatt oder wählt eine andere Zeile. Danach ist die Zeile, um die es ging, aus dem Blick.
6. **Empfehlung:** Die Auswahlleiste muss auf allen Formaten im Bild erscheinen, sobald etwas gewählt ist, am unteren Rand wie das Statusblatt. Sie darf die gewählte Zeile nicht verdecken.
7. **Verifikation:** iPhone hoch/quer und iPad hoch: Zeile in Tabellenmitte antippen, ohne zu scrollen muss die Leiste vollständig im Viewport stehen. Gleicher Test im Funkplan und in den Anforderungen. Regressionstest im Renderer, der die Leiste bei ≤ 900 px gegen den Viewport prüft.

#### P1-2 Was gerade geschrieben wurde, steht nicht im Bild, und „Rückgängig" ist ein 24-px-Ziel am Seitenende

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Jede schreibende Handlung in langen Blättern (Status ändern, Textzelle, Schwelle im Funkplan), danach die Kontrolle „ist es angekommen, war es das Richtige?" und gegebenenfalls „Rückgängig".
3. **Beobachtung:**
   - [beobachtet] iPhone hoch: Status von „FGr Wasserschaden" über das Blatt auf „Ruhe" gesetzt. Im Bild ändert sich nur der Chip. Die Statuszeile mit „✓ … gespeichert" und „↶ Rückgängig: Status der Einheit …" beginnt bei 2 018 px, der Viewport ist 664 px hoch (`43-nach-status-iphone-hoch.png`).
   - [beobachtet] Der Knopf „Rückgängig" misst 358×24 px (iPhone) bzw. 214×24 px (iPad). Er ist der einzige Knopf der Hauptseite unter 44 px Höhe. [Code] `.statuszeile .ruecknahme { min-height: 24px; padding: 2px 0; border: 0 }` (`index.html:846-857`) ist spezifischer als die Touch-Regel `button { min-height: 44px }` (`index.html:3757-3767`) und gewinnt deshalb.
   - [beobachtet] Ein Fehlgriff wird ohne Rückfrage geschrieben: Ich wollte die Zelle „Herkunft" doppelt antippen, 15 px vom linken Zellrand. Der Tipp lag unter der haftenden Namensspalte (167 von 350 px Breite, `position: sticky; left: 0`), also ging „Bezeichnung" auf. Eingetippter Text plus ein Tipp daneben ergab „Einheit ‚ZTr THW Deich XY' geändert · gespeichert". Die Tabelle sagt das ausdrücklich: „Textzelle: Enter oder Wegklicken schreibt" (`Einheitentabelle.tsx:359`; [Code] `Einheitenzelle.tsx:186-188` schreibt beim Blur).
   - [beobachtet] Funkplan „⋯" → „30 min": ein Tipp, kein Zwischenschritt, die Schwelle „kein Kontakt" gilt sofort für alle Arbeitsplätze („✓ Schwelle … gesetzt · gespeichert"). Die acht Schwellenwerte liegen als 44-px-Einträge ohne Abstand untereinander (`40-menue-Weitere_Schritte_im_Funkplan-iphone-hoch.png`, [Code] `Funkwerkzeuge.tsx:35-48`).
4. **Erwartung der Rolle:** Wenn ich mich vertippt habe, will ich das sofort an der Stelle sehen und mit einem groben Tipp zurücknehmen.
5. **Auswirkung im Einsatz:** Gerade die Fehltipps, die mit Handschuh häufig sind (Nachbarzeile, Nachbarwert, Wegtippen beim Absetzen des Geräts), werden still gespeichert und sind sofort bei allen Arbeitsplätzen sichtbar. Der Rückweg liegt eine lange Seite tiefer und ist ein 24 px hoher Textknopf ohne Rahmen. Wahrscheinlich bleibt der Fehler stehen, bis ihn jemand an der Stärkemeldung oder am Funkplan bemerkt.
6. **Empfehlung:** Nach jedem eigenen Schreiben eine kurze Bestätigung mit „Rückgängig" im sichtbaren Bereich zeigen (unten, wo der Daumen ist), so groß wie die übrigen Knöpfe. Auf Touchgeräten soll Wegtippen eine Textzelle nicht stillschweigend schreiben, sondern wie beim Statusblatt nachfragen („Nicht übernommen – Übernehmen / Verwerfen"). Werte, die für alle gelten (Schwelle), mit einem zweiten Schritt bestätigen lassen.
7. **Verifikation:** iPhone hoch, Status in Tabellenmitte ändern: Bestätigung und Rückgängig im Viewport, Rückgängig ≥ 44 px. Textzelle öffnen, tippen, daneben tippen: Es wird nichts geschrieben, ohne dass bestätigt wird. Schwelle wählen: Ein einzelner Tipp ändert den geltenden Wert nicht.

#### P1-3 Auswahllisten mit 34-px-Einträgen ohne Abstand und fast gleichen Namen (Fleetmapping, Vorlagen)

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Funkplan → „Rufgruppe anlegen" → Name tippen → Vorschlag aus dem Fleetmapping wählen. Ebenso Lage → „Einheit anlegen ▾" → „Aus Vorlage …".
3. **Beobachtung:**
   - [beobachtet] Nach Eingabe „T_BUND" erscheinen „T_BUND-01" bis „T_BUND-09", jeder Eintrag 340×34 px, Abstand 0, keine Trennlinie (`31-rufgruppe-vorschlag-iphone.png`). Die Namen unterscheiden sich nur in der letzten Ziffer. Die Kurzwahl darunter ist klein und blass.
   - [beobachtet] Mit simulierter Tastatur (Viewport 330 px) sind nur noch 1½ Einträge zu sehen. Die Liste scrollt in sich, innerhalb der scrollenden Maske, und die klebende Knopfleiste nimmt ein Drittel des Restes ein (`32-rufgruppe-vorschlag-tastatur-iphone.png`). [Code] `.vorlagenliste { max-height: 12rem }`, bei flacher Anzeige `6rem` (`index.html:1208-1220`, `:4111-4113`), Einträge `padding: 2px 6px`.
   - [beobachtet] Vorlagenliste „Einheit anlegen" im iPhone-Querformat: Einträge 476×34 px, Abstand 0, sichtbar sind knapp zwei Einträge („(FGr R (A))", „(FGr R (B))", „(FGr R (C))" …) (`17-einheit-anlegen-maske-iphone-quer.png`).
   - [Code] Die Touch-Regel für 44 px erfasst `role="option"` nicht (`index.html:3757-3767`).
4. **Erwartung der Rolle:** Ich tippe ungefähr auf meinen Eintrag und bekomme genau diesen, oder ich sehe deutlich, was ich gewählt habe, bevor es gilt.
5. **Auswirkung im Einsatz:** Ein Treffer eine Zeile daneben ergibt „T_BUND-02" statt „-01" bzw. FGr R (B) statt (A). Der Name steht danach korrekt aussehend im Funkplan und in der Stärkevorlage. Eine falsche TMO-Rufgruppe im Funkplan kann dazu führen, dass Einheiten auf der falschen Gruppe gesucht werden [Annahme zum Einsatzablauf]. Der Fehler fällt erst auf, wenn jemand vergeblich ruft.
6. **Empfehlung:** Listeneinträge auf Touchgeräten mindestens 44 px hoch mit sichtbarer Trennung. Den unterscheidenden Teil (Ziffer, Kurzwahl) groß zeigen. Nach der Wahl den übernommenen Namen deutlich im Feld anzeigen. Bei offener Tastatur mehr als einen Eintrag sichtbar lassen, z. B. indem erklärende Texte und Filter darüber zurücktreten.
7. **Verifikation:** Mit Arbeitshandschuh 20 × gezielt den 3. Eintrag aus neun wählen, Trefferquote ≥ 19/20. Messung: `[role=option]` ≥ 44 px hoch. Mit Tastatur offen mindestens drei Einträge sichtbar.

#### P1-4 Stärke und andere Zellen nur per Doppeltipp bearbeitbar, dann über die volle Tastatur

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Lage → Einheitentabelle → Zelle „Fü / UFü / He" korrigieren (Kernaufgabe S1). Gilt für alle Textzellen, Unterkunft, Rufgruppe, Funkhinweis.
3. **Beobachtung:**
   - [Code] Bearbeiten startet nur über `onDoubleClick` an der Zelle (`Einheitenzelle.tsx:123`). Auch Rufgruppenliste, Funkzuordnung, Rufgruppen- und Funkhinweiszelle setzen auf Doppelklick (`Rufgruppenliste.tsx:127`, `Funkzuordnung.tsx:75`, `Rufgruppenzelle.tsx:165`, `Funkhinweiszelle.tsx:84`). Die Auswahlleiste hat keinen Schritt „Bearbeiten".
   - [beobachtet] Zwei Tipps mit 120 ms Abstand öffneten in der Emulation kein Feld, zwei Tipps mit 250 ms Abstand öffneten es. Mit Handschuh ist ein Doppeltipp an derselben Stelle unzuverlässig [Annahme].
   - [beobachtet] Das Stärkefeld öffnet mit „0/1/8", der Cursor steht am Ende (Auswahl 5–5), der Wert ist nicht markiert. Es ist `type="text"` ohne `inputmode` (`Einheitenzelle.tsx:177-184`), also erscheint die volle Buchstabentastatur [Annahme für iOS/Android]. Der Schrägstrich liegt dort auf der zweiten Ebene. Zum Korrigieren muss der Helfer fünf Zeichen löschen und drei Zahlen mit zwei Schrägstrichen tippen.
   - [beobachtet] Der Hinweis unter der Tabelle spricht in Desktop-Begriffen: „Doppelklick bearbeitet die Zelle · … Enter oder Wegklicken schreibt, Esc verwirft · … Strg+D setzt ‚jetzt'" (`Einheitentabelle.tsx:359`). Auf dem Tablet gibt es weder Esc noch Strg.
   - Zum Vergleich [Code]: Die Stärkefelder in den Masken nutzen `inputMode="numeric"` und je ein Feld pro Zahl (`Maskenfelder.tsx:36`). Dort gibt es das Problem nicht.
4. **Erwartung der Rolle:** Ein Tipp auf die Zahl, dann drei Zahlen auf einer großen Zifferntastatur, fertig.
5. **Auswirkung im Einsatz:** Die häufigste S1-Korrektur, „Trupp meldet einen Helfer mehr", braucht unter Handschuh mehrere Versuche. Der Helfer zieht den Handschuh aus oder bittet jemanden am Laptop. Misslingt der Doppeltipp halb, ist stattdessen die Zeile gewählt (P1-1), und es passiert scheinbar nichts.
6. **Empfehlung:** Auf Touchgeräten einen einfachen Weg zum Bearbeiten anbieten, z. B. „Bearbeiten …" in der Auswahlleiste, das die Zeile in einer Maske mit großen Feldern öffnet (wie die Anlegemaske mit drei Stärkefeldern und Zifferntastatur). Beim Öffnen einer Zelle den Wert markieren. Den Hinweistext auf Touch umstellen („Doppeltippen" bzw. den Touch-Weg nennen).
7. **Verifikation:** Mit Handschuh auf iPad und Handy die Stärke einer Einheit von 0/1/8 auf 0/1/9 ändern: höchstens drei Tipps plus Zahleneingabe, beim ersten Versuch erfolgreich, Zifferntastatur erscheint.

---

### P2 – Mittel

#### P2-1 Handy-Layout: Kopfband frisst die Fläche, Tabelle ist 4–7 Bildschirme breit

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Jedes Blatt auf dem Handy, besonders Lage im Querformat.
3. **Beobachtung:**
   - [beobachtet] iPhone hoch: Das Kopfband (Titel, Ist-Stärke mit „Regel", Zeit, „aktuell", „⋯", Reiter) belegt etwa 240 von 664 px (36 %). Im Querformat sind es 172 von 390 px (44 %) (`04-kopf-iphone-hoch.png`, `15-lage-iphone-quer.png`). Es scrollt mit weg, jeder Reiterwechsel beginnt aber oben.
   - [beobachtet] Die Reiterzeile ist breiter als das Handy. „Versorgung" ist als „Vers" abgeschnitten, „Kosten", „Ausgaben" und „Einsatztagebuch" liegen rechts außerhalb und sind nur per Wisch in der Reiterzeile erreichbar. Die Reiter stoßen mit 2 px Abstand aneinander.
   - [beobachtet] Die Einheitentabelle hat 13 Spalten: 1 592 px breit bei 350 px Sichtbreite (iPhone), 2 392 px bei 710 px (iPad hoch). Die haftende Namensspalte nimmt auf dem iPhone 167 px ein. Der linke Teil jeder Nachbarzelle liegt darunter, ein Tipp dort trifft die Bezeichnung (siehe Beleg in P1-2).
4. **Erwartung der Rolle:** Auf dem Handy sehe ich vor allem Name, Status und Stärke, ohne seitlich zu wischen.
5. **Auswirkung im Einsatz:** Viel Wischen in zwei Richtungen. Jeder Wisch mit Handschuh kann als Tipp auf einen Statuschip oder eine Zeile gelesen werden [Annahme]. Im Querformat bleibt nach dem Öffnen eines Blatts kaum Arbeitsfläche.
6. **Empfehlung:** Auf dem Handy eine schmale Spaltenauswahl als Vorgabe (Bezeichnung, Status, Stärke) mit „Spalten ▾" für den Rest. Das Kopfband im Querformat auf eine Zeile mit Stärke und Zeit reduzieren. Reiter, die nicht ins Bild passen, unter „Mehr" sammeln statt sie abzuschneiden.
7. **Verifikation:** iPhone hoch und quer: Stärke einer Einheit ohne horizontales Wischen ablesen und ändern. Kopfband ≤ 25 % der Viewporthöhe. Alle Reiter ohne Wisch in der Reiterzeile erreichbar.

#### P2-2 „⋯"-Menüs der Blätter: Knopf zu schmal, Menü läuft aus dem Bild

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** „⋯" in Eingangskorb, Funkplan und Versorgung.
3. **Beobachtung:**
   - [beobachtet] Die drei Menüknöpfe messen 36×44 px (iPhone und iPad). [Code] `.menueknopf { min-width: 36px }` (`index.html:2195-2199`) überstimmt die Touch-Regel `button { min-width: 44px }` (`index.html:3757-3767`), weil die Klasse spezifischer ist als der Elementselektor. Fenstermenü und Baum-„⋯" messen dagegen 44×44 px.
   - [beobachtet] Funkplan-„⋯" auf iPhone hoch: Der letzte Eintrag „Funkplan als HTML" liegt bei 693 px (Viewport 664). Auf iPad quer liegt er bei 769 px (Viewport 768), also ganz außerhalb. Das Menü ist `position: absolute` ohne `max-height` und ohne eigenes Scrollen. Ein Touch neben dem Menü, auch der Beginn eines Wischs, schließt es [beobachtet]. Der Helfer muss das Menü schließen, die Seite so scrollen, dass „⋯" oben steht, und neu öffnen. Dann liegt der Eintrag bei 490 px [beobachtet].
4. **Erwartung der Rolle:** Jeder Menüknopf ist so groß wie die anderen, und alles im Menü ist sichtbar oder im Menü scrollbar.
5. **Auswirkung im Einsatz:** Der Ausdruck des Funkplans, typischerweise der Papier-Rückfall, ist auf dem Tablet quer nur mit einem Trick zu erreichen. Der schmale Knopf wird mit Handschuh öfter verfehlt. Direkt links daneben liegt das Suchfeld, das dann die Tastatur öffnet.
6. **Empfehlung:** „⋯" auf 44 px Mindestbreite bringen wie das Fenstermenü. Menüs so platzieren oder begrenzen, dass alle Einträge im Bild liegen. Auf dem Handy die Menüs wie das Kontextmenü als Blatt am unteren Rand zeigen.
7. **Verifikation:** Messung `.menueknopf` ≥ 44×44 px. Alle Menüeinträge nach dem Öffnen ohne Scrollen der Seite im Viewport, in allen vier Formaten.

#### P2-3 Untertabellen: Symbolknöpfe ✓ / ✕ / + nur 24–25 px breit und dicht beieinander

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Einheit wählen → unter der Tabelle Fahrzeuge, Personen, Aufträge: erfassen, entfernen, als erledigt markieren.
3. **Beobachtung:**
   - [beobachtet] „+" (erfassen) 24×44 px. Bei jedem Auftrag stehen „✓ Auftrag erledigt" und „✕ Auftrag zurücknehmen" mit je 25×44 px und 7 px Abstand nebeneinander. Die ✓-Knöpfe zweier Aufträge stoßen senkrecht ohne Abstand aneinander (551–595 / 595–639 px). Die ✕-Knöpfe der Fahrzeuge „GKW 1" und „MTW" ebenso, leicht versetzt (`14-untertabellen-iphone.png`).
   - [Code] `.untertabellen .symbolknopf { min-width: 1.5rem; padding: 0 0.35rem }` (`index.html:1878-1884`). Der Kommentar dazu sagt „so klein wie ein Zeichen".
   - [Code] Alle Symbolknöpfe öffnen eine Maske mit dem Namen der Zeile (`Untertabellen.tsx:120-205`). Ein Fehltipp löscht also nichts sofort.
   - [beobachtet] Die Untertabellen erscheinen nur bei gewählter Einheit, auf dem Handy rund 1 400 px unter der Zeile, dieselbe Ursache wie P1-1.
4. **Erwartung der Rolle:** „Erledigt" und „Zurücknehmen" sind so groß und so weit getrennt wie „Übernehmen" und „Abbrechen".
5. **Auswirkung im Einsatz:** Häufig öffnet sich die falsche Maske („zurücknehmen" statt „erledigt", oder der Auftrag darunter). Wer die Maske nicht genau liest, bestätigt die falsche Handlung am falschen Auftrag [Annahme].
6. **Empfehlung:** Symbolknöpfe auf Touch mindestens 44×44 px mit Abstand. Gegensätzliche Aktionen (erledigt / zurücknehmen) nicht direkt nebeneinander, oder mit Wort statt Zeichen.
7. **Verifikation:** Messung `.symbolknopf` ≥ 44×44 px, Abstand ≥ 8 px. Handschuhtest: 20 × „erledigt" am zweiten von drei Aufträgen ohne falsche Maske.

---

### P3 – Niedrig

#### P3-1 Auswahl lässt sich per Touch nicht aufheben, Hinweise nennen Tasten

- **Fundstelle:** Einheitentabelle, Funkplan, Anforderungen.
- **Beobachtung:** [beobachtet] iPad hoch: Ein zweiter Tipp auf die gewählte Zeile hebt die Wahl nicht auf, ein Tipp auf leere Fläche auch nicht. Die Leiste sagt „Esc hebt die Auswahl auf" (`Auswahlleiste.tsx:89`), Knöpfe tragen „Strg+M", „Strg+K", „Strg+E".
- **Erwartung / Auswirkung:** Ohne Tastatur bleiben Leiste und Untertabellen mit „Entfernen" stehen, bis eine andere Zeile gewählt wird. Kein Datenrisiko, aber unnötige Ziele im Bild.
- **Empfehlung:** Auf Touch ein sichtbares „Auswahl aufheben" (✕) in der Leiste. Tastenkürzel auf `pointer: coarse` ausblenden.
- **Verifikation:** Auf dem Tablet ohne Tastatur die Auswahl mit einem Tipp aufheben.

#### P3-2 „Zusage zurück" schreibt sofort und steht zwischen zwei Masken-Knöpfen

- **Fundstelle:** Anforderungen → zugesagte Anforderung gewählt.
- **Beobachtung:** [beobachtet] Leiste: „Eingetroffen …" (104 px), „Zusage zurück" (103 px), „Stornieren …" (92 px), je 8 px Abstand. [Code] „Zusage zurück" ist eine sofortige Rücknahme ohne Maske (`Anforderungsauswahl.tsx:53`), die beiden Nachbarn öffnen Masken.
- **Auswirkung:** Ein Fehltipp eine Position daneben setzt die Anforderung ohne Rückfrage auf „offen" zurück. Er lässt sich durch erneutes Zusagen beheben, die Angaben müssen aber neu eingetragen werden [Annahme].
- **Empfehlung:** Rücknahmen ans Ende der Leiste oder mit Rückfrage. Die Schreibweise mit „…" für Maske beibehalten und sichtbarer machen.
- **Verifikation:** Handschuhtest „Eingetroffen …" 20 ×, kein unbeabsichtigtes „Zusage zurück".

#### P3-3 Stärke-Monitor: Ansichtenleiste nur kurz sichtbar

- **Fundstelle:** Fenstermenü → Stärke-Monitor öffnen.
- **Beobachtung:** [beobachtet] Ein Tipp auf den Monitor zeigt die Leiste (Ansichten, „Wechsel", „Menü", alle 44 px hoch). [Code] Sie verschwindet nach wenigen Sekunden ohne Mausbewegung (`monitorSteuerung.ts:100-112`, ausgelöst über `onMouseMove`, `Monitorbild.tsx:74`). Das Menü sonst nur per Rechtsklick (`Monitorbild.tsx:75-78`). Unsichtbare aktive Flächen wie im Audit vom 18.09. habe ich nicht gefunden.
- **Auswirkung:** Wer mit Handschuh langsam zielt, tippt ins Leere und muss erneut tippen. Kein Fehlbedienungsrisiko.
- **Empfehlung:** Auf Touch die Leiste bis zum nächsten Tipp stehen lassen.

#### P3-4 Datumsfeld „Neuer Einsatz" mit Zifferntastatur, Format verlangt Punkte

- **Fundstelle:** Einsatzauswahl → „Neuer Einsatz …" → Datum.
- **Beobachtung:** [Code] `inputMode="numeric"` (`Einsatzanlage.tsx:73`), die Prüfung verlangt aber `TT.MM.JJJJ` mit Punkten (`einsatzanlage.ts:36`). [Annahme] Die iOS-Zifferntastatur hat keinen Punkt. [beobachtet] Das Feld ist mit dem heutigen Datum vorbelegt, Abweichungen sind selten. „Einsatzbeginn" hat keine `inputmode` und öffnet die volle Tastatur.
- **Empfehlung:** Ziffern ohne Punkte annehmen (z. B. 05112026) oder eine Tastatur mit Punkt anbieten.
- **Verifikation:** Auf einem echten iPhone ein anderes Datum eingeben.

#### P3-5 Langer Druck als Kontextmenü

- [nicht prüfbar] Das Handbuch nennt das Kontextmenü per Rechtsklick und „auf dem Handy am unteren Rand" (`HANDBUCH.md:199-203`). In der Emulation öffnete ein langer Druck (900 ms) kein Kontextmenü, sondern wählte nur die Zeile. Ob iOS Safari bzw. Android Chrome `contextmenu` auslösen, muss am Gerät geprüft werden. Weil alle Schritte auch in der Auswahlleiste stehen, ist das unkritisch, sobald P1-1 behoben ist.

---

## Was gut funktioniert (Vergleich zum Audit vom 18.09.)

- Es gibt jetzt eine durchgehende Touch-Regel: Bei `pointer: coarse` sind Knöpfe, Felder, Reiter und Menüeinträge mindestens 44 px groß, Checkboxen 24 px in 44 px hohen Labels [beobachtet]. Der Scan aller acht Blätter fand nur die Ausnahmen aus P1-2, P2-2 und P2-3 sowie die Listen aus P1-3.
- Das Statusblatt am unteren Rand ist vorbildlich: in Daumennähe, groß, verwirft nicht stumm [beobachtet].
- Abschnittsbaum: 44 px hohe Zeilen über die volle Breite, „⋯" 44×44 px [beobachtet].
- Filterchips 44 px mit 6 px Abstand [beobachtet].
- „Neuer Einsatz …": alle Felder 44 px, Datum und Beginn vorbelegt, Knopfleiste bleibt bei Tastatur im Bild [beobachtet].
- Die Masken halten „Anlegen" und „Abbrechen" auch bei simulierter Tastatur sichtbar (`32-…`, `17-…`) [beobachtet].
- Kein Ablauf verlangt Ziehen, Wischen oder langen Druck.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen. Status, Einsatz öffnen/anlegen, Rufgruppe anlegen und Anforderungen gehen. Stärke korrigieren und zeilenbezogene Schritte nur mit Doppeltipp-Wissen bzw. langem Scrollen.
- **Fremde Hilfe nötig:** ja, für die Stärkekorrektur in der Tabelle, solange der Doppeltipp nicht bekannt ist und die Oberfläche nur „Doppelklick/Enter/Esc" nennt.
- **Größtes Missverständnis:** Nach dem Tipp auf eine Einheit sieht der Helfer auf Handy und Tablet hochkant keine Reaktion außer der Hervorhebung und hält die Zeile für nicht bedienbar.
- **Größtes Einsatzrisiko:** Mit Handschuh getroffene Nachbarwerte (Fleetmapping-Eintrag, Nachbarzelle, Schwellenwert) werden still gespeichert, und Bestätigung wie „Rückgängig" liegen außer Sicht am Seitenende in einem 24-px-Knopf.
- **Top-Priorität für die nächste Iteration:** Die Auswahlleiste und die Schreibbestätigung mit „Rückgängig" auf allen Formaten am unteren Bildrand sichtbar machen (Ursache: `sticky` scheitert an `overflow-x: hidden` auf `html, body` bis 900 px).
