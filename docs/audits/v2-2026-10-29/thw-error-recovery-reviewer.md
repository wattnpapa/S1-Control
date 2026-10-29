# Audit Fehlerverhalten und Rücknahme — S1-Control v2 (Stand 29.10.2026, laufende Web-Schale)

Rolle: Helfer in der Führungsstelle, aus der Excel „Einsatzkräfteübersicht“ gewohnt, Zellen zu überschreiben und Zeilen zwischen Bereichen zu verschieben; weiß, dass die Excel nichts rückgängig machen kann, und erwartet von der neuen Software genau das Gegenteil.

Material: Screenshots 01–27 des Durchlaufs (v2shots), eigene Lesesondierungen an der laufenden App (reviews-v2/er-shots/01–21), Quellcode `apps/desktop/src/renderer/Einheitentabelle.tsx`, `Einheitenmasken.tsx`, `Maske.tsx`, `Ruecknahme.tsx`, `laden.ts`, `apps/desktop/src/kontrakt/bedienschritte.ts`, `apps/desktop/src/worker/aktendienst.ts`, `packages/domaene/src/fold.ts`, `undo.ts`, `projektion/tabelle.ts`, `projektion/tagebuch.ts`, Handbuch/Kurzanleitung.

**Hinweis zur Prüflage (wichtig für die anderen Reviewer):** Bei meiner ersten Sondierung (Doppelklick auf die Stärke-Zelle „Stab FüSt“, anschließend Klick in eine andere Zelle, 19:45:26 Uhr) hat die App **ungewollt ein Ereignis geschrieben**: `StaerkeGeaendert` mit dem Text „2/3/1“ statt der drei Zahlen. Seitdem zeigt die Prüflage für „Stab FüSt“ `NaN/NaN/NaN`, der Abschnitt „FüSt Oldenburg“ `2 Einh. · //` und das Kopfband `null/null/null // 0` (er-shots/12, 21). Ich konnte das über die Oberfläche **nicht** zurücknehmen (siehe F1/F2). Das ist genau der Fehler, den dieser Audit sucht — aber die Lage muss vor weiteren Prüfungen neu aufgesetzt werden. Es war kein beabsichtigter Schreibversuch; ich bitte um Entschuldigung.

---

## Urteil aus Sicht der Rolle

Was funktioniert: Masken brechen mit Esc sauber ab, Enter bestätigt, der Fokus steht im ersten Feld, Entfernen verlangt einen Grund, Zusammenführen warnt ausdrücklich vor der Unumkehrbarkeit, Verschieben zeigt „bisher …“ und sperrt „Übernehmen“, solange kein Ziel gewählt ist. Es gibt einen Rückgängig-Knopf und Strg+Z, die Rücknahme landet nachvollziehbar im Einsatztagebuch. Die Stärkefelder der Masken lehnen „8a“, „-3“ und vierstellige Zahlen sichtbar ab. Eine halb getippte Zelle wird beim Nachladen nicht mehr zurückgesetzt.

Wo es reißt: Die **wichtigste Zelle des Blatts — Fü/UFü/He — ist in der Zeile nicht korrigierbar, sondern zerstört beim Bestätigen die Zahl** (beobachtet, reproduziert, Tagebuch verschleiert es). Abgewiesene Inline-Eingaben verschwinden ohne Meldung. Rückgängig ist nach Neustart/Neuladen des Fensters leer; wer die eigene Panne nicht sofort bemerkt, kommt ohne fremde Hilfe nicht mehr zurück. Die acht Konflikthinweise sind nur eine Zahl in der Fußzeile — wo der Konflikt sitzt und welcher Wert verdrängt wurde, erfährt man nirgends. Masken behalten alte Eingaben (ein alter Grund, eine alte Teilstärke) und die Zusammenführen-Maske ist mit einem leeren Ziel bestätigbar.

Aufgabe „Zahlendreher in der Stärke berichtigen“: **nein, nicht ohne Admin**. Aufgabe „falschen Abschnitt / Status berichtigen“: ja. Aufgabe „versehentliches Verschieben/Entfernen zurücknehmen“: ja, solange das Fenster noch offen ist.

---

## Findings

### F1 — P0 — Stärke in der Zelle bearbeiten zerstört den Wert (beobachtet)

- **Fundstelle:** Lage → Einheitentabelle, Spalte „Fü / UFü / He“, Doppelklick, dann Enter **oder Klick in eine andere Zelle**. er-shots/12 (`NaN/NaN/NaN` in der Zelle), er-shots/21 (Kopfband `null/null/null // 0`), Tagebuch er-shots/14. Code: `Einheitentabelle.tsx:219-231` (`schreibeZelle` → `eingabeAlsWert`), `bedienschritte.ts:73-81` (`eingabeAlsWert` kennt nur „zahl“, alles andere wird als Text geschickt), `projektion/tabelle.ts:136-137` (Spalte hat `art: "staerke"`, `schreibt: StaerkeGeaendert`), `aktendienst.ts:570-612` (`#pruefeNutzlast` prüft nur die Nutzlast `{einheitId}`, nicht `neu`), `fold.ts:1593` (Wert wird ungeprüft als Stärke gerechnet).
- **Beobachtung:** Die Zelle öffnet ein Textfeld mit „2/3/1“. Wer den Text unverändert bestätigt oder in die nächste Zelle klickt, schreibt den **Text** „2/3/1“ als Stärke. Danach: Zelle `NaN/NaN/NaN`, Gesamt `NaN`, Abschnittssumme `//`, Kopfband und Fußzeile `null/null/null // 0`, Stärke-Monitor und Druckausgaben rechnen mit dieser Lage. Das Einsatztagebuch schreibt „Stärke geändert: 2/3/1 → 2/3/1“ — Text und Zahlentripel sehen identisch aus (`tagebuch.ts:193-202`), der Fehler ist im Protokoll unsichtbar. Es gibt keine Maske, die die Stärke einer bestehenden Einheit absolut setzt; Aufteilen ist relativ. Damit ist die Einheit über die Oberfläche **nicht reparierbar**. Da jede Eingabe in diese Zelle, auch „0/1/8“, denselben Weg nimmt, kann ein Zahlendreher in der Stärke in v2 gar nicht in der Zeile berichtigt werden.
- **Erwartung der Rolle:** Wie in der Excel drei Zahlenzellen, oder ein Feld, das „0/1/8“ als drei Zahlen versteht und „0/18“ oder „a/b/c“ mit Meldung ablehnt. Unverändertes Bestätigen darf nichts schreiben (das gilt für Textzellen bereits, `Einheitentabelle.tsx:227`).
- **Auswirkung im Einsatz:** Die Gesamtstärke der Führungsstelle wird mit **einem Doppelklick** ungültig; Lagekarte, Druck und Monitor zeigen „null“. Der Helfer, der es ausgelöst hat, sieht erst später, dass die Summen weg sind, findet im Tagebuch nichts Auffälliges und kann es nicht beheben.
- **Empfehlung:** Stärke-Zelle als drei Zahlenfelder oder mit Parsen von „F/U/H“ bearbeiten; ungültige Eingaben in der Zelle (wie in den Masken) rot markieren und nicht schreiben; Schreibseite muss den Wert selbst prüfen, nicht nur die Kennung; Tagebuch soll einen Text-Wert erkennbar anders darstellen (z. B. in Anführungszeichen). Zusätzlich eine Maske „Stärke setzen“ für die absolute Korrektur.
- **Verifikation:** Doppelklick auf die Stärke-Zelle, „0/1/8“ eintippen, Enter → Zelle zeigt 0/1/8, Summen stimmen, Tagebuch zeigt „2/3/1 → 0/1/8“. „1/8“ oder „a“ → sichtbare Ablehnung, nichts geschrieben. Unverändert bestätigen → kein Tagebucheintrag.

### F2 — P0 — Rückgängig greift nur im selben Fenster; nach Neuladen/Neustart ist nichts mehr zurücknehmbar (beobachtet in der Web-Schale; für Electron Annahme)

- **Fundstelle:** Kopfzeile „Rückgängig“ (Screenshots 02–09: grau „Zurzeit gibt es nichts zurückzunehmen“), er-shots/02 (nach eigener Änderung: „Rückgängig (StaerkeGeaendert)“), er-shots/21 (neues Fenster, dieselbe Lage: wieder grau). Code: `Ruecknahme.tsx:483-500`, `undo.ts:100-183` (Stapel nur eigene Ereignisse des `clientId`), `apps/desktop/src/web/arbeitsplaetze.ts` (jeder Browser = eigener Arbeitsplatz).
- **Beobachtung:** Direkt nach der Panne aus F1 bot das Fenster „Rückgängig (StaerkeGeaendert)“ an. In einem neu geöffneten Fenster derselben Lage ist der Knopf leer. Die Diagnose zählt inzwischen 13 „weitere Arbeitsplätze“ — jeder Browserstart ist ein neuer Arbeitsplatz. Wer das Fenster wechselt, neu lädt oder den Rechner tauscht, kann seine Panne nicht mehr zurücknehmen; und ein Kollege am Nachbarplatz kann es nie (laut Handbuch gewollt, §6 U3).
- **Erwartung der Rolle:** „Rückgängig“ gilt für das, was ich (oder meine Schicht an diesem Platz) gerade gemacht habe — auch nach einem Neustart. Mindestens: eine Berichtigung durch Neueingabe ist immer möglich (bei F1 ist sie es nicht).
- **Auswirkung im Einsatz:** Im Schichtwechsel oder nach einem Absturz ist der Fehlerweg zu. Bei einer Stärke-Panne (F1) bleibt nur ein Admin mit Zugriff auf die Ereignisdatei.
- **Empfehlung:** Undo-Stapel beim Öffnen aus dem lokalen Spiegel wieder aufbauen (laut `undo.ts` Kopf vorgesehen) und in der Web-Schale den Arbeitsplatz je Browser stabil halten; im Einsatztagebuch je Zeile einen „Berichtigen“-Weg anbieten (Wert erneut setzen, KorrekturVon), der nicht an „eigen/fremd“ hängt.
- **Verifikation:** Änderung machen, Fenster neu laden → Rückgängig zeigt weiterhin die letzte eigene Handlung. Im Tagebuch bei einer fremden Zeile „Berichtigen“ → neuer Wert mit Grund.

### F3 — P1 — Abgewiesene Inline-Eingaben verschwinden stumm

- **Fundstelle:** `Einheitentabelle.tsx:230` (`await laden.bediene(entwurf)`, Ergebnis wird nicht gelesen), `laden.ts:766-770` (`bediene` setzt `fehler` nur bei geworfenen Fehlern; ein Ergebnis `abgewiesen`/`uhrSteht`/`nichtMoeglich` wird nur zurückgegeben), `Einheitenmasken.tsx:84-90` (`schreibe`: bei Nicht-„geschrieben“ bleibt die Maske stumm offen).
- **Beobachtung (Code, plausible Risikostelle):** Wird ein Zellen-Schreibversuch abgewiesen (Akte geschlossen, Grund fehlt, Schreibstörung auf dem Share, Uhr steht), schließt die Zelle und zeigt den alten Wert — ohne Meldung. In den Masken bleibt die Maske offen, der Knopf wird wieder frei, aber es steht nirgends, warum nichts passiert ist. Der Abschnittsbaum hat denselben Weg, aber kommentiert ihn wenigstens (`Abschnittsbaum.tsx:86-93`).
- **Erwartung der Rolle:** Eine Meldung am Ort der Eingabe: „Nicht geschrieben: …“ mit dem, was zu tun ist.
- **Auswirkung im Einsatz:** Der Helfer glaubt, der Status sei gesetzt; er merkt es erst, wenn die Tabelle beim nächsten Nachladen den alten Wert zeigt — oder gar nicht.
- **Empfehlung:** Jedes Nicht-„geschrieben“ als Hinweis in die Hinweisleiste und an die Zelle/Maske; Eingabe in der Zelle erhalten, damit man es noch einmal versuchen kann.
- **Verifikation:** Share wegnehmen (Diagnose „Share nicht erreichbar“), Status ändern → sichtbare Meldung, Eingabe bleibt in der Zelle stehen.

### F4 — P1 — Zusammenführen-Maske ist mit leerem Ziel bestätigbar, sobald links ein Abschnitt gewählt ist (beobachtet, nicht bestätigt)

- **Fundstelle:** Lage, Abschnitt „Bereitstellungsraum Hafen“ gewählt, zwei Zeilen markiert, „Zusammenführen“ — er-shots/01: Auswahl zeigt „— bitte wählen —“, Knopf „Zusammenführen“ ist **aktiv**. Code: `Einheitenmasken.tsx:69-74` (`ziel` wird für jede Maske außer Verschieben mit der **Abschnitts**-Id vorbelegt), `:265-270` (`bereit = ziel !== "" && quellen.length > 0` — ziel ist hier eine Abschnitts-Id, kein Einheiten-Ziel), `:273` (`zusammenfuehrung(ziel, quellen)` würde alle markierten Einheiten in eine nicht existierende Ziel-Id aufgehen lassen).
- **Beobachtung:** Ohne Abschnittswahl (Ansicht „alle“) ist der Knopf korrekt gesperrt; mit Abschnittswahl — der Normalfall — kann man Enter drücken, bevor man das Ziel gewählt hat. Die Maske warnt selbst: „Das ist nicht umkehrbar.“ Ich habe nicht bestätigt; was der Fold mit einer Abschnitts-Id als Zieleinheit macht, konnte ich nicht beobachten (vermutlich: beide Einheiten „aufgegangen“, zählen nicht mehr, Ziel existiert nicht).
- **Erwartung der Rolle:** Enter ohne Ziel tut nichts; die Maske sagt „Ziel wählen“.
- **Auswirkung im Einsatz:** Ein Doppel-Enter (erst in der Suche, dann in der Maske) lässt zwei Einheiten unumkehrbar aus den Summen verschwinden.
- **Empfehlung:** Ziel der Zusammenführung getrennt vom Abschnittsziel führen und nur gegen die markierten Einheiten prüfen; Schreibseite muss eine unbekannte Ziel-Id abweisen.
- **Verifikation:** Abschnitt wählen, zwei Einheiten markieren, Zusammenführen → Knopf gesperrt, bis ein Ziel aus der Liste gewählt ist.

### F5 — P1 — Masken behalten alte Eingaben; Grund und Teilstärke vom letzten Mal stehen schon drin (beobachtet)

- **Fundstelle:** er-shots/03 („Entfernen“ erneut geöffnet: Grund „Versehen“ steht vorab drin, Knopf aktiv); Aufteilen erneut geöffnet: „Trupp B“ und „99“ stehen noch drin. Code: `Einheitenmasken.tsx:59-67` (Zustand lebt in der dauerhaft eingehängten Komponente), `aufSchliessen` setzt nichts zurück (anders als `Abschnittsbaum.tsx:79-84`, wo `schliesse()` aufräumt).
- **Beobachtung:** Nach Abbruch **und** nach erfolgreichem Schreiben bleiben Bezeichnung, Stärkefelder, Herkunft und Grund stehen. Beim nächsten „Entfernen“ einer **anderen** Einheit reicht ein einziges Enter — mit dem alten Grund. Beim nächsten Aufteilen wird die alte Teilstärke erneut abgezogen, wenn man nur die Bezeichnung tippt.
- **Erwartung der Rolle:** Eine neue Maske ist leer; ein abgebrochener Entwurf darf gern wiederkommen, aber erkennbar („Entwurf übernommen“), nicht als vorgeblich gültige Eingabe.
- **Auswirkung im Einsatz:** Falsche Einheit mit falschem Grund entfernt; Aufteilung mit Zahlen von vorhin; Tagebuch dokumentiert einen Grund, der nicht stimmt.
- **Empfehlung:** Felder beim Schließen leeren; wenn Fortsetzen gewünscht ist, nur bei Abbruch und mit sichtbarem Hinweis.
- **Verifikation:** Entfernen abbrechen → erneut öffnen → Grund leer, Knopf gesperrt. Nach erfolgreichem Aufteilen erneut öffnen → 0/0/0.

### F6 — P1 — Aufteilen lässt mehr abziehen, als da ist (beobachtet)

- **Fundstelle:** er-shots/02: „Abgezogen werden 99 von 18“, „Übernehmen“ aktiv. Code: `Einheitenmasken.tsx:217` (`bereit` prüft nur Bezeichnung, Summe > 0 und Zifferngültigkeit), `bedienschritte.ts:84-99` (Obergrenze 999, Kommentar: „ein Zahlendreher wie 80 statt 8 bleibt drin“), `fold.ts:1655-1680` (negative Quelle wird „geklemmt“ und erzeugt nur einen Konflikthinweis).
- **Beobachtung:** 99 von 18 abteilen ist bestätigbar. Die Quelle ginge rechnerisch ins Minus, würde in der Anzeige auf 0 geklemmt und ein Hinweis „staerkeGeklemmt“ entstünde — als Zahl in der Fußzeile, siehe F8. Auch unrealistische Einzelwerte (80 Führer) passieren. Es ist keine Prüfung je Teilstärke (Fü ≤ Fü der Quelle) vorhanden.
- **Erwartung der Rolle:** Rot: „Mehr als vorhanden (Mannschaft 99 > 15)“, Knopf gesperrt oder zumindest Rückfrage.
- **Auswirkung im Einsatz:** Zahlendreher bei der Aufteilung erzeugt eine Phantom-Einheit mit 99 Helfern und eine Quelle mit 0; Gesamtstärke springt um 80 nach oben.
- **Empfehlung:** Je Teilstärke gegen die gesehene Quellstärke prüfen und als Feldfehler zeigen; bei Überschreitung sperren.
- **Verifikation:** Quelle 0/3/15, Eingabe Mannschaft 99 → Feldfehler, Übernehmen gesperrt; 15 → erlaubt.

### F7 — P1 — Doppelt bestätigen legt doppelt an (Code; Schutz greift nicht)

- **Fundstelle:** `Maske.tsx:583-595` (Sperre nur, wenn `aufBestaetigen` ein Promise zurückgibt), `Einheitenmasken.tsx:100-111, 178-190, 219-232, 272-274, 316-318` (alle fünf Masken geben `void` zurück; `neueId("E")` wird je Aufruf neu vergeben).
- **Beobachtung (Code, plausible Risikostelle):** Die Maske soll laut Kommentar gegen Doppel-Enter/Doppelklick schützen, aber keine Einheitenmaske übergibt ihr das Versprechen. Zwischen Klick und Schließen (Schreibzeit auf dem Share, bei SMB leicht Sekunden) ist der Knopf frei: Zwei Einheiten aus Vorlage, zwei Aufteilungen, zwei Verschiebeereignisse. Nicht an der laufenden App ausprobiert, weil es schreibt.
- **Erwartung der Rolle:** Zweiter Druck tut nichts; Knopf zeigt „…“.
- **Auswirkung im Einsatz:** Doppelte Einheit in der Stärke, doppelte Aufteilung → Quelle doppelt reduziert.
- **Empfehlung:** Sperre unabhängig vom Rückgabewert; Knopf nach dem ersten Druck sperren, bis Antwort da ist.
- **Verifikation:** Bei langsamem Share „Aus Vorlage“ zweimal schnell bestätigen → genau eine Einheit.

### F8 — P1 — Konflikthinweise: nur eine Zahl, kein Ort, kein Wert (beobachtet)

- **Fundstelle:** Fußzeile „8 Konflikthinweis(e)“ (alle Screenshots), nicht klickbar (`Statuszeile.tsx:96-97`); Diagnose „Konflikthinweise: 8“ (Screenshot 18, texte.txt); Zelle: nur „⚠“ mit allgemeinem Tooltip (`Einheitentabelle.tsx:452-454, 474`); im Renderer gibt es keine Stelle, die `feldpfad`, Gewinner oder verdrängten Wert zeigt (grep ohne Treffer). Handbuch Z. 64-70 und Z. 257-263 versprechen: „Der Hinweis nennt Feld, Gewinner und verdrängten Wert.“
- **Beobachtung:** Nach zwei gleichzeitigen Änderungen an zwei Arbeitsplätzen erfährt der Helfer: Es gibt 8 Hinweise. Welche Einheit, welches Feld, welcher Wert wurde verdrängt — das steht nirgends; man müsste 40 Zeilen × 5 Spaltengruppen nach „⚠“ absuchen. Die Hinweis-Tooltips sind Mauszeiger-abhängig. Dasselbe gilt für „Zeit unplausibel“, „Stärke geklemmt“ und „Rücknahme trifft fremden Stand“ — alle sind nur Zählwerte.
- **Erwartung der Rolle:** Klick auf „8 Konflikthinweise“ → Liste: Einheit, Feld, gilt / verdrängt, wer, wann, Knopf „anderen Wert übernehmen“.
- **Auswirkung im Einsatz:** Zwei Plätze überschreiben sich; der Verlierer merkt es nicht, der Gewinner auch nicht. Die Zusage „nichts verschwindet still“ gilt technisch, praktisch aber doch.
- **Empfehlung:** Hinweisliste als eigenes Blatt oder Ausklapper mit Sprung zur Zeile; in der Zelle den verdrängten Wert im Tooltip nennen; Hinweis nach Prüfung „erledigt“ markieren können.
- **Verifikation:** Zwei Browserfenster, gleiche Zelle unterschiedlich setzen → in beiden erscheint eine Liste mit Einheit/Feld/beide Werte.

### F9 — P2 — Zeitfelder in der Zeile: freier Text, keine Form, Strg+D schreibt ISO-Zeit (Code; nicht an der App bestätigt)

- **Fundstelle:** `Einheitentabelle.tsx:495-500` (Strg+D setzt `new Date().toISOString()` ins Feld, also „2026-10-29T19:45:26.798Z“), `bedienschritte.ts:73-81` (Text wird unverändert geschickt), `projektion/tabelle.ts:238-244` (Zeit wird roh angezeigt), `fold.ts:960-994` (Plausibilität nur, wenn der Text als Datum lesbar ist; „14:30“ → kein Hinweis, kein Fehler, wird so gespeichert).
- **Beobachtung:** In der Prüflage sind alle Zeitfelder leer, deshalb nicht am Bildschirm belegt. Nach Code: Es gibt keine Eingabeform wie in der Excel (dd.mm. hh:mm). „14:30“, „heute 14.30“ oder ein Zahlendreher „31.10.“ statt „13.10.“ gehen ohne Rückfrage durch; die 12-Stunden-Plausibilität (§2.5) wird nur ein Zählwert (F8). Mit Strg+D steht ein ISO-String in UTC im Feld — für den Helfer unlesbar und mit einer Stunde Versatz zur Wanduhr.
- **Erwartung der Rolle:** Datum/Uhrzeit wie gewohnt eingeben, „jetzt“ sichtbar als 29.10. 20:45, Unmögliches (Einsatzende vor Eintreffen, Zukunft bei Ist-Zeit) wird gemeldet.
- **Auswirkung im Einsatz:** Eintreffen/Einsatzende sind die Grundlage für Einsatztage und Kosten; ein unlesbarer Zeitstring oder eine Freitextzeit lässt Auswertungen leer oder falsch.
- **Empfehlung:** Zeitzelle mit Eingabemaske/Datumswähler, Ortszeitanzeige, Ablehnung nicht lesbarer Werte, Hinweis bei unplausibler Zeit direkt an der Zelle.
- **Verifikation:** „14:30“ in „Eingetroffen“ → wird als heutiges Datum 14:30 gespeichert oder abgelehnt; Strg+D → „29.10. 20:45“.

### F10 — P2 — Nachladen während der Eingabe: Zelle hält die Eingabe, Masken reagieren still (Code; teils plausibel)

- **Fundstelle:** `Einheitentabelle.tsx:436-448` (Startwert nur einmal, gut), `laden.ts:289-305` (`frischeAnsichten` tauscht die ganze Tabelle), `Einheitentabelle.tsx:322-324` (Zeilen nach `einheitId`), `Einheitenmasken.tsx:81, 207, 264, 309` (`erste`/`gewaehlte` werden bei jedem Nachladen aus der neuen Tabelle gelesen; fällt die Einheit aus dem Ausschnitt, wird `erste` `undefined` und die Maske verschwindet ohne Wort).
- **Beobachtung:** Positiv: Eine halb getippte Zelle wird beim Standwechsel nicht mehr überschrieben (im Kommentar dokumentiert). Risikostellen: Verschiebt ein anderer Platz die Einheit in einen anderen Abschnitt, fällt sie aus dem gefilterten Ausschnitt; die offene Zelle wird abgebaut, die Eingabe verfällt ohne Meldung; eine offene Aufteilen-/Entfernen-Maske schließt sich einfach. Der `vorher`-Wert der Zelle ist der beim Öffnen gesehene (gut, erzeugt später den Konflikthinweis — der aber nur gezählt wird, F8).
- **Erwartung der Rolle:** „Diese Einheit wurde gerade von Platz 2 nach EA Schule verschoben — Eingabe behalten?“
- **Auswirkung im Einsatz:** Verlorene Eingabe unter Zeitdruck; der Helfer tippt erneut und weiß nicht, ob die erste Fassung geschrieben wurde.
- **Empfehlung:** Offene Zelle/Maske an die Einheit binden, nicht an den Ausschnitt; bei Wegfall eine Meldung mit der getippten Eingabe.
- **Verifikation:** Zwei Fenster; in A Zelle öffnen und tippen, in B die Einheit verschieben → A zeigt Meldung, Eingabe bleibt.

### F11 — P2 — Rückgängig spricht Entwicklersprache (beobachtet)

- **Fundstelle:** er-shots/02 Knopf „Rückgängig (StaerkeGeaendert)“; `Ruecknahme.tsx:498-499` zeigt `undoObersteArt` roh; `:468-471` meldet bei Aufteilen/Zusammenführen: „… Bitte über den Fachvorgang "EinheitZusammengefuehrt" zurücknehmen.“; `:512-514` Maske „Rücknahme … der Art „EinheitEntfernt““. Paragraphenzeichen (§5.4.2, §2.4, §5.9.2) in jedem Maskentext.
- **Beobachtung:** Der Knopf nennt die interne Ereignisart; die Ablehnung bei strukturellen Vorgängen nennt eine Art, die der Helfer nirgends als Knopf findet (die Maske heißt „Zusammenführen“, nicht „EinheitZusammengefuehrt“), und erklärt nicht, welche Einheiten er dafür markieren muss. Die Tagebuch-Projektion hat lesbare Titel (`tagebuch.ts:70`), sie werden hier nicht benutzt.
- **Erwartung der Rolle:** „Rückgängig: Stärke geändert (Stab FüSt)“; bei Aufteilung: „Eine Aufteilung nimmt man zurück, indem man beide Einheiten markiert und zusammenführt.“
- **Auswirkung im Einsatz:** Der Helfer weiß nicht, was der Knopf gleich tut, und drückt im Zweifel nicht — oder falsch.
- **Empfehlung:** Lesbare Vorgangsbezeichnung plus Einheitenname am Knopf und in der Grund-Maske; bei „strukturell“ den Weg in Bediensprache beschreiben und die passende Maske gleich öffnen; Paragraphen aus den Maskentexten in die Hilfe verschieben.
- **Verifikation:** Nach Statuswechsel steht am Knopf „Rückgängig: Status gesetzt (BGr 1 Oldenburg)“.

### F12 — P2 — Verschieben mehrerer Einheiten: kein Sammelvorgang, Teilabbruch stumm, Rücknahme einzeln (Code)

- **Fundstelle:** `Einheitenmasken.tsx:179-190` (Schleife, Ergebnis je Einheit wird nicht geprüft, Maske schließt immer), `undo.ts` (ein Schritt je Rückgängig).
- **Beobachtung:** Beim Verschieben von fünf Einheiten entstehen fünf Ereignisse. Scheitert das dritte (Share-Störung), laufen vier und fünf trotzdem, die Maske schließt, keine Meldung. Rückgängig nimmt danach nur die letzte Einheit zurück; der Helfer muss fünfmal drücken und bei jedem Druck prüfen, was gerade zurückgeht (F11).
- **Erwartung der Rolle:** Ein Vorgang „5 Einheiten verschoben“, ein Rückgängig, bei Teilfehler eine Liste „3 von 5 verschoben, folgende nicht: …“.
- **Auswirkung im Einsatz:** Halb verschobener Zug, verteilt auf zwei Abschnitte, ohne dass es jemand gesagt bekommt.
- **Empfehlung:** Ergebnis je Einheit auswerten und melden; Rückgängig für eine Serie bündeln (mindestens: Hinweis „noch 4 zurücknehmbar“).
- **Verifikation:** Share während einer Mehrfachverschiebung trennen → Meldung mit Liste; Rückgängig zeigt die Serie.

### F13 — P2 — Falscher Status / falscher Abschnitt: Korrektur möglich, aber Status ohne Zeitbezug und ohne Plausibilität (beobachtet + Code)

- **Fundstelle:** Inline-Status als Auswahl (`Einheitentabelle.tsx:506-520`), Statusleiste (Screenshots 02–06), Verschieben-Maske (Screenshot 08).
- **Beobachtung:** Status und Abschnitt lassen sich in der Zeile bzw. per Maske direkt wieder richtig setzen; Rückgängig ist dafür vollständig (gleiche Art, `neu = vorher`). Gut. Aber: Status „Einsatz“ in „Angefordert / Anmarsch“ oder „Rückmarsch“ ohne Einsatzende-Zeit werden nicht angemahnt; die Excel koppelt Verschieben und Status über den Ablauf des Helfers, v2 hat keinerlei Rückfrage („Einheit in EA Deich Nord, Status noch Angefordert — Status mitsetzen?“). Ein Statuswechsel per Auswahlfeld wird mit **Verlust des Fokus** geschrieben — ein Scrollen über ein geöffnetes Auswahlfeld (Mausrad) ändert in manchen Browsern den Wert und schreibt beim Wegklicken.
- **Erwartung der Rolle:** Beim Verschieben in einen Einsatzort den Status gleich mit anbieten; beim Rückmarsch nach Einsatzende fragen.
- **Auswirkung im Einsatz:** Stärke je Status (Blatt Status, Statusleiste) stimmt nicht mit der Lagekarte überein; fällt erst dem Nächsten auf.
- **Empfehlung:** In der Verschieben-Maske optional „Status setzen auf …“ und „Eingetroffen: jetzt“; Hinweis bei Widerspruch Abschnittstyp/Status.
- **Verifikation:** Einheit nach „Einsatz beendet“ verschieben → Maske schlägt Status „Rückmarsch“ und Einsatzende-Zeit vor.

### F14 — P3 — Esc in der Tabelle hebt die Markierung auf; Tagebuch ist auf die Auswahl eingeschränkt

- **Fundstelle:** `Einheitentabelle.tsx:190-194` (Esc-Reihenfolge Maske → Zelle → Markierung), Screenshot 17 („Auf die Auswahl beschränken“ vorbelegt: 1 Eintrag).
- **Beobachtung:** Ein Esc zu viel (etwa nach dem Abbrechen der Zelle) entfernt die Mehrfachmarkierung, die man für Verschieben/Zusammenführen mühsam mit Strg aufgebaut hat. Im Tagebuch sieht der Helfer nach einer Panne zunächst nur die Einträge der zuletzt angeklickten Einheit und hält das Tagebuch für leer.
- **Empfehlung:** Markierung nur mit eigener Handlung aufheben; Tagebuch-Vorbelegung „alle, neueste zuerst“ mit sichtbarer Filtermarke.
- **Verifikation:** Zwei Zeilen markieren, Zelle öffnen, Esc, Esc → Markierung bleibt.

### F15 — P3 — Abschnitt versehentlich auflösen: Rückweg vorhanden, aber nur als „Rückgängig“ im selben Fenster

- **Fundstelle:** `Abschnittsbaum.tsx:360-398` (Maske mit Ziel, Hinweistext „lässt sich wiederherstellen“), Katalog `AbschnittAufgeloest → AbschnittWiederhergestellt`.
- **Beobachtung:** Die Maske verlangt ein Ziel, erklärt die Wirkung und ist per Rückgängig umkehrbar. Einen Knopf „Wiederherstellen“ im Baum gibt es nicht; nach Fensterwechsel (F2) ist der Abschnitt nur noch per Admin zurückzuholen. „Aufgelöste ausblenden“ versteckt ihn zusätzlich.
- **Empfehlung:** „Wiederherstellen“ als Knopf am aufgelösten Abschnitt.
- **Verifikation:** Auflösen, Fenster neu laden, aufgelösten Abschnitt wählen → Knopf „Wiederherstellen“.

---

## Positiv (beibehalten)

- Esc/Enter in allen Masken einheitlich, Fokus im ersten Feld (`Maske.tsx`), Escape in der Maske fällt nicht in die Tabelle durch.
- Zelle: Startwert wird beim Nachladen nicht überschrieben; unveränderte Textzellen schreiben nichts.
- Entfernen = kein Löschen, Grund Pflicht, Einheit bleibt im Tagebuch sichtbar; Wiederherstellen als Rückgängig vorhanden.
- Zusammenführen warnt deutlich und sichtbar vor Unumkehrbarkeit.
- Verschieben-Maske sperrt „Übernehmen“, bis ein anderes Ziel gewählt ist; nennt „bisher …“.
- Stärkefelder der Masken markieren „8a“, „-3“, „1000“ rot und sperren den Knopf.
- Rücknahme ist selbst ein Tagebucheintrag mit Filter „Nur Rücknahmen und Berichtigungen“.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen (Status/Abschnitt ja; Stärke in der Zeile: nein).
- **Fremde Hilfe nötig:** ja — bei jedem Stärke-Fehler aus der Zelle und bei jeder Panne, die erst nach dem Neuladen auffällt.
- **Größtes Missverständnis:** „Ich tippe wie in der Excel 0/1/8 in die Stärkezelle und drücke Enter“ — und die Einheit zeigt danach NaN.
- **Größtes Einsatzrisiko:** Die Gesamtstärke der Führungsstelle wird durch einen einzigen Doppelklick plus Wegklicken ungültig, das Tagebuch zeigt es nicht, und niemand außer einem Admin kann es zurückdrehen.
- **Top-Priorität für die nächste Iteration:** Stärke-Zelle als geprüfte Dreifach-Zahleneingabe (F1) samt absoluter „Stärke setzen“-Maske und Rückgängig, das einen Neustart überlebt (F2).
