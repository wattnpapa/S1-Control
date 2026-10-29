# Audit „Neuer Nutzer“ — S1-Control v2 (Branch v2-architektur), Stand 29.10.2026

**Rolle:** THW-Helfer in der Führungsstelle, bedient die Excel „Einsatzkräfteübersicht V 1.5.2“ seit Jahren routiniert, öffnet S1-Control v2 zum ersten Mal ohne Einweisung und ohne Handbuch.
**Material:** Screenshots `v2shots/01–27`, eigene Begehung der Web-Schale (http://127.0.0.1:8089, eigene Screenshots unter `scratchpad/nu-shots/`), Quelltext nur zur Fundstellenangabe. Alle Angaben zu THW-Abläufen, die nicht aus der Excel-Referenz stammen, sind als **Annahme** gekennzeichnet.

> **Wichtiger Hinweis zur Prüflage.** Bei meiner Begehung (Doppelklick in eine Zelle der ersten Tabellenzeile, danach Esc bzw. Wegklicken — ohne eine Zahl zu tippen) hat die App zwei Ereignisse `StaerkeGeaendert` für „Stab FüSt“ und „Stab FüSt Nacht“ auf den Share geschrieben (`/tmp/s1-share/einsaetze/2026-09-08-uebung-weser-ems/ereignisse/f078c654.0000.jsonl`, 2 Zeilen, 19:45 Uhr). Seitdem zeigt das Kopfband aller Arbeitsplätze **`null/null/null // 0`** statt `15/53/225 // 293`, „FüSt Oldenburg“ steht mit `//` im Baum, und die Stärkezelle zeigt `NaN/`. Das war nicht beabsichtigt; es ist Finding **P0-1**. Wer die Prüflage wiederherstellen will, entfernt diese Datei (sie enthält nur diese zwei Zeilen) — ich habe sie bewusst nicht angefasst.

---

## Urteil aus Sicht der Rolle

**Was gut läuft.** Die Begriffe der Excel sind fast vollständig wiederzufinden: die neun Statuswerte wörtlich (Rufbereitschaft … Rückmarsch), die Schichten Tag/Nacht/Früh/Spät, die Spalten Bezeichnung / Organisation / Herkunft / Geräte-Fahrzeuge / Aufträge / Status / Schicht / ID Erfassungsbogen / Fü-UFü-He-Gesamt, die Bereiche Logistik, Bereitstellungsraum, „Angefordert / Anmarsch“, „Einsatz beendet“. Die Spaltengruppen Grunddaten/Stärke/Ressourcen/Logistik/Kosten entsprechen dem Ein-/Ausblenden der Excel, die Spaltenköpfe tragen im Tooltip sogar den Excel-Buchstaben („Excel-Spalte AJ/AK/AL“). Das Blatt „Druck“ (Screenshot 25) sieht aus wie das Excel-Druckblatt inklusive „Probe o.k.“ und „Davon Stärke: THW“; „Status“ (27) ist die Status-Matrix der Excel. Die Hilfe (Strg+H) ist wirklich die AküLi plus Tastenkarte, und jedes Kürzel nennt den Excel-Vorgang daneben. Die Masken „Aus Vorlage“ (= Kopiervorlagen), „Verschieben“ (= Zeilen verschieben, Strg+M) und „Abschnitt anlegen“ (= Bereich benennen) sind selbsterklärend. Ein Excel-Helfer findet den Kern-Ablauf (Einheit anlegen → verschieben → Status setzen) **ohne Hilfe**.

**Wo Reibung entsteht.** Drei Dinge sind neu und werden nirgends auf dem Bildschirm erklärt: (1) die Reiter **Eingangskorb** und **Anforderungen** (in der Excel gibt es weder Erfassungsbogen-Scan noch eine Anforderungstabelle; die Ressourcenplanungs-Spalten „Ablösung angefordert / Anforderungs-ID / Zugesagt für“ sind jetzt ein eigenes Blatt — das merkt man erst, wenn man die Spalten in „Ressourcen“ vergeblich sucht), (2) **Rücknahme / Rückgängig / Entfernen ist kein Löschen** (die Excel sagt „Vorgänge können nicht rückgängig gemacht werden“, der Helfer erwartet also nichts davon und versteht die Bedeutung des grauen Knopfs nicht), (3) **Konflikthinweise** (8 Stück in der Statuszeile, gelb, nicht klickbar, kein ⚠ in der Tabelle — er weiß nicht, ob er etwas tun muss). Dazu kommen Rohwerte in der Tabelle (`NUR_STAERKE`, `ORTSVERBAND …`), Paragraphenverweise (§5.4.5, §2.4, §3.8) in Masken und Hilfetexten, und fehlende Blätter „Log“ und „FüOrg“ unter ihren Excel-Namen.

**Kann die Aufgabe ohne fremde Hilfe erledigt werden?** Ja, mit Umwegen — bis zu dem Moment, in dem die Inline-Bearbeitung der Stärke die Gesamtstärke des Einsatzes zerstört (P0-1). Danach steht der Helfer vor `null/null/null`, findet im Tagebuch nur „Stärke geändert: 2/3/1 → 2/3/1“ und hat keinen Weg zurück, den er erkennen könnte.

---

## Findings

### P0 — Einsatzkritisch

#### P0-1 · Inline-Bearbeitung der Spalte „Fü / UFü / He“ schreibt einen Text statt eines Zahlentripels — Kopfband und Baum zeigen danach `null/null/null // 0`

- **Fundstelle:** Lage → Einheitentabelle, Spalte „FÜ / UFÜ / HE“, Doppelklick → Wegklicken/Esc/Enter. Beobachtet: `nu-shots/16-eeb.png`, `nu-shots/30-hilfe.png` (Kopfband `null/null/null // 0`, Baum „FüSt Oldenburg 2 Einh. · //“, Zelle `NaN/`), Tagebuch `nu-shots/19-tagebuch-alle.png` („Stab FüSt: Stärke geändert: 2/3/1 → 2/3/1“). Ereignis auf dem Share: `"neu":"1/2/1"` (String) statt `{fuehrer,unterfuehrer,mannschaft}`. Code: `apps/desktop/src/kontrakt/bedienschritte.ts:73–81` (`eingabeAlsWert` kennt nur `zahl`, sonst Rohtext), `packages/domaene/src/projektion/tabelle.ts:136–137` (Spalte `staerke`, `schreibt: festeArt StaerkeGeaendert`), `apps/desktop/src/renderer/Einheitentabelle.tsx:482–484` (`onBlur` schreibt immer).
- **Beobachtung:** Ich habe nichts getippt. Doppelklick auf die Zelle und Fokusverlust reichten. Das Programm hat die Tabelle als „geändert“ gewertet, weil der Zellentext „1/2/1“ nicht gleich dem Objekt `{1,2,1}` ist, und den Text als neue Stärke geschrieben. Der Fold nimmt den String an, die Kennzahlen rechnen `null`/`NaN`. Betroffen sind **alle** Arbeitsplätze (Share), nicht nur der verursachende. Der Tagebucheintrag „2/3/1 → 2/3/1“ ist für den Leser unauffällig — er sieht nicht, was kaputt ging. „Rückgängig“ blieb danach grau (Screenshot 30), ein Weg zurück ist für den Helfer nicht erkennbar.
- **Erwartung der Rolle:** In der Excel sind Fü/UFü/He drei Zellen; ein Doppelklick ohne Eingabe ändert nichts. Esc „verwirft“ (so steht es in der Fußzeile der Tabelle).
- **Auswirkung im Einsatz:** Die Gesamtstärke — die eine Zahl, für die S1 da ist und die auf der Lagekarte steht — ist für die ganze Führungsstelle weg, ausgelöst durch einen versehentlichen Doppelklick. Druckblatt und Monitor rechnen vermutlich ebenfalls falsch (nicht geprüft, Risikostelle).
- **Empfehlung:** Die Stärkezelle entweder gar nicht inline bearbeitbar machen (Maske wie beim Aufteilen mit drei Zahlenfeldern und Obergrenze) oder die Eingabe `a/b/c` streng prüfen und bei Unverändertheit (Text == dargestellter Wert) nichts schreiben. Esc darf nie schreiben, auch nicht über den nachfolgenden Blur. Der Fold sollte einen String in `neu` ablehnen, damit ein Client die anderen nicht beschädigen kann.
- **Verifikation:** Doppelklick in „Fü / UFü / He“, Esc, Wegklicken, Enter ohne Änderung: kein Ereignis im Tagebuch, Kopfband unverändert. Eingabe `2/3/x`: Fehlermeldung, kein Ereignis. Eingabe `2/3/4`: Kopfband rechnet korrekt.

#### P0-2 · „Rückgängig“ ist grau, „Rücknahme“ ist ein Fachwort, und im Fehlerfall ist kein Weg zurück erkennbar

- **Fundstelle:** Lage, Werkzeugleiste „Rückgängig“ (Screenshots 02, 06, 30 — immer grau); Tagebuch-Filter „Nur Rücknahmen und Berichtigungen“ (17); Hilfe „Strg+Z Letzte eigene Aktion zurücknehmen (§6 U3)“; Entfernen-Maske „Entfernen ist kein Löschen (§5.4.5)“ (`nu-shots/09-maske-entfernen.png`); `apps/desktop/src/renderer/Ruecknahme.tsx:53–85`.
- **Beobachtung:** Der Knopf heißt „Rückgängig“, die Hilfe „zurücknehmen“, das Tagebuch „Rücknahmen und Berichtigungen“. Drei Wörter, kein Satz, der sagt, was passiert und warum der Knopf gerade grau ist (Tooltip nennt den Grund nicht). Nach P0-1 blieb er grau — die Ereignisse wurden ja „von mir“ geschrieben, trotzdem war nichts zurücknehmbar (nicht prüfbar, warum; aus Nutzersicht: „kaputt und kein Zurück“).
- **Erwartung der Rolle:** Die Excel verspricht ausdrücklich kein Undo. Wer einen „Rückgängig“-Knopf sieht, erwartet Strg+Z wie in Office: letzte Eingabe weg, Zustand wie vorher. Dass es ein „Ereignis“ ist, das im Tagebuch sichtbar bleibt und bei manchen Arten einen „Grund“ verlangt, erschließt sich nicht.
- **Auswirkung im Einsatz:** Nach einem Fehler (falsche Einheit verschoben, Stärke zerstört) probiert der Helfer den grauen Knopf, scheitert, und korrigiert von Hand — oder lässt es stehen. Im Fall P0-1 bleibt die Lage dauerhaft falsch.
- **Empfehlung:** Knopf beschriften mit dem, was er tut („Letzte eigene Änderung zurücknehmen“), im Tooltip den Grund fürs Grau nennen („Nichts von diesem Arbeitsplatz zurücknehmbar“ / „Die letzte Änderung kam von Platz X“). Nach jeder Schreibaktion kurz einblenden: „Stärke von Stab FüSt geändert — Zurücknehmen (Strg+Z)“. Die Paragraphen aus Hilfe und Masken streichen oder hinter „mehr“ legen.
- **Verifikation:** Status ändern → Knopf aktiv, Tooltip nennt die Aktion; Klick → Status wieder alt, Tagebuch zeigt eine Zeile „Rücknahme“. Nach P0-1-Szenario: Rücknahme stellt 2/3/1 wieder her.

### P1 — Hoch

#### P1-1 · „Eingangskorb“ und „Anforderungen“: zwei neue Blätter ohne Einstieg, die Excel-Spalten der Ressourcenplanung sind dorthin gewandert

- **Fundstelle:** Reiter „Eingangskorb — 0 offen“ (Screenshot 10): „Bündel einlesen nach … Abschnitt wählen … / Choose File / Bündel schreiben“, Filter „Neu / Geändert / Übernommen / Abgelehnt / Nur jüngste Fassung“, Leerzustand „Keine Meldung im Korb.“ Reiter „Anforderungen“ (11): Felder „Kennung / Vorgesehene Einheit / Vorgesehener Auftrag“, Spalten „Zustand / Kennung / Angefordert / Ablösung für / Vorgesehen / Auftrag / Zusage“, Knöpfe „Zusagen / Stornieren / Eingetroffen / Zusage zurück / Eintreffen zurück / Storno zurück“. Spaltengruppe „Ressourcen“ (05): nur Verfügbar bis / Eingetroffen / Einsatzende / Rückführung / Bemerkungen.
- **Beobachtung:** Ein Excel-Helfer sucht „Ablösung angefordert“, „Anforderungs-ID“, „Zugesagt für/von“, „Vorgesehene Einheit / Auftrag“ unter „Ressourcen“ — dort fehlen sie. Dass das Blatt „Anforderungen“ genau diese Spalten als Vorgang abbildet, steht nirgends; die Hilfemarke sagt nur „Was angefordert, zugesagt, eingetroffen oder storniert ist.“ „Eingangskorb“ sagt dem Excel-Helfer gar nichts: Was ist ein „Bündel“, was eine „Meldung“, wer legt sie hinein (Annahme: der Meldekopf per Scanner/Datei), und was bedeutet „Bündel schreiben“ — schreibe ich hier etwas an den Meldekopf? Das Dateifeld ist englisch („Choose File / No file chosen“). Die Zustandswörter OFFEN/ZUGESAGT/EINGETROFFEN/STORNIERT sind verständlich; der Knopf „Eintreffen zurück“ ist es nicht (zurück wohin?).
- **Erwartung der Rolle:** Ressourcenplanung = ausblendbare Spalten rechts neben der Einheit, Anforderungs-ID als Freitext. Ein „Eingang“ ist in der Excel der Bereich „Angefordert / Anmarsch“ bzw. der Papier-Einheiten-Erfassungsbogen vom Meldekopf.
- **Auswirkung im Einsatz:** Ablösungen werden weiter als Freitext in „Bemerkungen“ geführt, das Blatt „Anforderungen“ bleibt leer; die Verbindung Einheit ↔ Anforderung („Ablösung für“) geht verloren. Der Eingangskorb wird ignoriert, Bögen des Meldekopfs werden von Hand abgetippt (was laut Störfall 6 erlaubt, aber der langsamere Weg ist).
- **Empfehlung:** Ein Satz je Blatt, der die Excel-Brücke schlägt: „Anforderungen — die Spalten ‚Ablösung angefordert / Anforderungs-ID / Zugesagt‘ der Excel, als Vorgang je Anforderung“; „Eingangskorb — Erfassungsbögen, die der Meldekopf eingelesen oder als Datei abgelegt hat; hier übernehmen oder ablehnen.“ In der Spaltengruppe „Ressourcen“ einen Verweis „Ablösung/Anforderung → Blatt Anforderungen“ oder eine berechnete Spalte „Anforderung“ mit der Kennung. „Bündel schreiben“ umbenennen in das, was es tut (z. B. „Erfassungsbögen als Datei für den Meldekopf ablegen“). Dateiauswahl deutsch beschriften.
- **Verifikation:** Fünf Excel-Helfer bekommen die Aufgabe „Ablösung für BGr 1 anfordern, ID eintragen“: alle landen ohne Nachfrage im Blatt Anforderungen und sehen die Kennung danach an der Einheit.

#### P1-2 · Rohschlüssel und technische Werte in der Tabelle: `NUR_STAERKE`, `ORTSVERBAND THW OV Oldenburg`, `Regie`, `Unbestimmt`

- **Fundstelle:** Spalte „PERSONALERFASSUNG“ = `NUR_STAERKE` in allen 40 Zeilen (Screenshots 02, 09; `packages/domaene/src/beschriftungen.ts:149–163` kennt für diese Spalte kein Wörterbuch); Spalte „HERKUNFT“ = `ORTSVERBAND THW OV Oldenburg`, `ORTSVERBAND FF Rastede`, `ORTSVERBAND Landkreis Ammerland`, `ORTSVERBAND PiBtl 130` (grau); Untertabelle „Personen: Keine Personen erfasst — die Einheit meldet nur ihre Stärke.“ (06).
- **Beobachtung:** „Personalerfassung“ ist keine Excel-Spalte; der Wert sieht aus wie ein Programmfehler („Unterstrich, Großbuchstaben“). Was die Alternative wäre (Annahme: namentliche Erfassung der Helfer), ist nirgends zu sehen. „ORTSVERBAND“ vor „Landkreis Ammerland“ oder „PiBtl 130“ ist sachlich falsch und verwirrt — in der Excel heißt die Spalte „Herkunft (OV/Ort)“ und enthält den Freitext.
- **Erwartung der Rolle:** Herkunft = „OV Oldenburg“. Eine Spalte, die immer denselben Wert zeigt, ist entweder überflüssig oder kaputt.
- **Auswirkung im Einsatz:** Vertrauensverlust („die Software ist noch nicht fertig“), Platzverschwendung in der Breite, und die Herkunftsspalte liest sich im Druck falsch.
- **Empfehlung:** `NUR_STAERKE` beschriften („nur Stärke“ / „namentlich“) und die Spalte standardmäßig ausblenden, solange es nur einen Wert gibt. Herkunft ohne das Präfix anzeigen; das Präfix nur, wenn es eine zweite Art (z. B. „Dienststelle“) gibt.
- **Verifikation:** Keine Zelle der Standardansicht zeigt einen Wert mit Unterstrich oder einen Präfix in Versalien.

#### P1-3 · Konflikthinweise: „8 Konflikthinweis(e)“ in Gelb, aber nirgends ein Hinweis, was zu tun ist

- **Fundstelle:** Statuszeile unten (alle Screenshots): „8 Konflikthinweis(e)“, nicht klickbar (`nu-shots/18-konflikt-klick.png`: Klick ändert nichts); Diagnose (18): „Zwei Arbeitsplätze haben dasselbe Feld geändert … Den Hinweis lesen: Er nennt Feld, Gewinner und verdrängten Wert (§3.8)“; in der Tabelle keine ⚠-Marke (`[aria-label=Konflikthinweis]` = 0 Treffer, `Einheitentabelle.tsx:474`).
- **Beobachtung:** Die Zahl steht gelb und dauerhaft. Wo die acht Hinweise sind, welches Feld, welcher Wert verdrängt wurde — nirgends zu finden, weder per Klick noch in der Diagnose (dort nur die Zahl). Der Name „Konflikthinweis“ klingt nach Fehler, der Text in Diagnose sagt „nicht als Fehler melden“.
- **Erwartung der Rolle:** Excel-Helfer kennen Konflikte als „zwei haben gleichzeitig gespeichert, einer hat verloren“. Sie erwarten eine Liste: welche Einheit, welches Feld, welcher Wert gilt, welcher nicht.
- **Auswirkung im Einsatz:** Entweder wird die Zahl ignoriert (dann bleibt ein möglicherweise falscher Wert in der Lage) oder sie löst eine Suche aus, die nichts findet. Beides kostet Zeit und Vertrauen.
- **Empfehlung:** Zahl klickbar machen → Liste „Einheit · Feld · gilt: X · verdrängt: Y · von Platz Z um hh:mm“ mit Knopf „So lassen“ / „Y wieder eintragen“. Die ⚠-Marke in der Tabelle am betroffenen Feld tatsächlich zeigen. Wort prüfen: „Doppelte Änderung“ sagt mehr als „Konflikthinweis“.
- **Verifikation:** Zwei Arbeitsplätze ändern denselben Status; am betroffenen Feld erscheint ⚠, Klick auf die Zahl zeigt genau diesen Eintrag.

#### P1-4 · Blätter „Log“, „FüOrg“, „Status“, „Druck“ sind nicht unter ihrem Excel-Namen zu finden; „Ausgaben“ ist eine Knopfleiste ohne Vorschau

- **Fundstelle:** Reiterleiste: Lage / Eingangskorb / Anforderungen / Führungsstelle / Kosten / Führungsorganisation / Ausgaben / Einsatztagebuch / Diagnose. Reiter „Ausgaben“ (15/16): 11 Knöpfe „Druck als PDF / Druck als HTML / Status als PDF / Status als HTML / Auswertung als XLSX / Logistik als PDF / Logistik als XLSX (LogFrei) / Führungsorganisation als PDF / Kosten als PDF / Oldenburger Block als XLSX“, Ergebnis nur als Pfadzeile „Geschrieben: /tmp/s1-share/…/status_2026-10-29_1532.html (11209 Bytes)“.
- **Beobachtung:** Der Excel-Helfer sucht die Blätter „Druck“, „Status“, „Log“. Er findet „Ausgaben“, dort Knöpfe, die eine Datei schreiben, aber nichts anzeigen. Ob die Datei das ist, was er auf der Lagekarte braucht, sieht er erst im Explorer. „Oldenburger Block“ kennt er vielleicht (Annahme: lokaler Begriff), „LogFrei“ ist ein Blattname der Excel, hier als Klammerzusatz. „Logistik“ heißt gleichzeitig ein Bereich im Baum und ein Blatt — das Log-Blatt der Excel (Schichtbetrieb, m/w/d, Unterbringung je Einsatzraum) ist nur als Datei erzeugbar. „FüOrg“ heißt jetzt „Führungsorganisation“ — gut, aber die Harke ist nur in Kurzform ohne die Ränder/Namen, die die Excel-Harke hat (14).
- **Erwartung der Rolle:** Ein Blatt anklicken, sehen, drucken (Strg+P). Der „Druck als HTML alle 60 s“ der Excel ist ein Automatismus, hier gibt es ein Häkchen „HTML-Monitor für ein zweites Gerät“, dessen Wirkung unklar bleibt.
- **Auswirkung im Einsatz:** Vor dem Lagevortrag wird dreimal auf „Druck als PDF“ gedrückt, es entstehen drei Dateien, keine ist auf dem Bildschirm. Zeitverlust, falsche Datei auf der Lagekarte.
- **Empfehlung:** Je Ausgabe eine Vorschau im Reiter (Druck/Status/Log als Tabelle wie in der Excel, darunter „Als PDF“ / „Als HTML“). Reiter nach Excel-Blättern benennen oder Untertitel „(Excel: Druck)“. Ergebnis nach dem Schreiben öffnen oder zumindest „Öffnen“-Link anbieten. Häkchen erklären („schreibt alle 60 s eine HTML-Seite für einen Zweitbildschirm nach …“).
- **Verifikation:** Aufgabe „Stärke je Einsatzstelle für die Lagekarte drucken“ ist in zwei Klicks erledigt und das Ergebnis vorher auf dem Bildschirm sichtbar.

#### P1-5 · Startseite: „Betriebsart Führungsstelle/Meldekopf“, „Share-Pfad (vom Dienst vorgegeben)“, „Anzeigename“ ohne Erklärung; Einsatz anlegen ohne Stammdaten

- **Fundstelle:** Screenshot 01: Einstellungen (Share-Pfad, Anzeigename, Betriebsart Führungsstelle/Meldekopf, Übernehmen), Einsätze (Liste, „Neuer Einsatz“ + „Anlegen“). Kopfband „Kein Einsatz geöffnet“, Stärke „—“, Zeit „291532OCT26“.
- **Beobachtung:** Was „Betriebsart Meldekopf“ tut, ist nicht zu sehen (Annahme: eingeschränkte Ansicht fürs Einlesen von Bögen). „Anzeigename“ — wessen? (Antwort steht nur in der Kurzanleitung: der Name in der Statuszeile der anderen.) Das Blatt „Stammdaten“ der Excel (Name der Führungsstelle, übergeordnete FüSt) fehlt beim Anlegen; im Druckblatt steht später „FüSt Oldenburg“, woher das kommt, ist unklar. Die Zeit im Kopfband ist die DTG-Schreibweise „291532OCT26“ — für THW-Führungskräfte vertraut (Annahme), für einen Helfer am S1-Tisch, der in der Excel „29.10.2026 15:32“ sieht, aber eine Hürde; eine Zonenkennung fehlt (bereits in `docs/audits/umsetzung-v2.md` offen).
- **Erwartung der Rolle:** „Einsatz anlegen“ fragt nach Einsatzname, Führungsstelle, übergeordneter Stelle — wie das Stammdaten-Blatt.
- **Auswirkung im Einsatz:** Der Meldekopf-Rechner wird in „Führungsstelle“ betrieben (oder umgekehrt), die Stammdaten fehlen im Ausdruck.
- **Empfehlung:** Unter jedem Feld ein Satz: „Anzeigename — so sehen dich die anderen Arbeitsplätze.“ „Betriebsart Meldekopf — nur Erfassungsbögen einlesen, keine Lage.“ Einsatz anlegen mit den Stammdaten-Feldern der Excel. Uhrzeit zusätzlich lesbar („29.10. 15:32“).
- **Verifikation:** Neuer Helfer legt einen Einsatz an und erklärt danach ungefragt, was „Betriebsart“ ist.

### P2 — Mittel

#### P2-1 · Werkzeugleiste des Abschnittsbaums: „Typ ändern“, „Zeichen“, „Umhängen“, „Auflösen“ — vier Begriffe, die die Excel nicht hat

- **Fundstelle:** Screenshots 02/03, `nu-shots/11-maske-umhngen.png` („Übergeordneter Abschnitt — an die Wurzel —“, „Abschnitte, die einen Zyklus schlössen, stehen nicht zur Wahl (§5.3.1)“), Hilfemarke Abschnitte: „Ein aufgelöster Abschnitt verschwindet nicht …“.
- **Beobachtung:** „Umhängen“ (Unterabschnitt an anderen EA hängen) und „Zeichen“ (taktisches Zeichen wählen) sind nach dem Klick verständlich, „Typ ändern“ (Einsatzort → Bereitstellungsraum) auch. „Auflösen“ für einen Bereich klingt nach Löschen; dass die Einheiten „wieder frei“ stehen (wohin? Annahme: nach „Eingang“), muss man im „?“ nachlesen. „Wurzel“ und „Zyklus“ sind Informatikerwörter.
- **Erwartung der Rolle:** Excel: Bereich umbenennen, ein-/ausblenden. Einen Bereich „auflösen“ bedeutet dort: alle Zeilen nach „Einsatz beendet“ verschieben.
- **Auswirkung im Einsatz:** Zögern vor dem Knopf; im schlimmsten Fall Auflösen statt Umbenennen.
- **Empfehlung:** Auflösen-Maske sagt: „11 Einheiten werden nach ‚Eingang‘ gestellt und müssen neu zugeordnet werden.“ „— an die Wurzel —“ → „— kein übergeordneter Abschnitt (oberste Ebene) —“. Paragraphen weglassen.
- **Verifikation:** Masken ohne §-Verweise; Auflösen nennt Anzahl und Ziel der Einheiten.

#### P2-2 · Statusleiste mit Zählern und Abschnittsbaum mit „2 Einh. · 3/5/2“: gute Idee, aber die Lesart wird nirgends erklärt

- **Fundstelle:** Screenshot 02: STATUS-Chips „Rufbereitschaft 2 · Einsatzvorbehalt 1 · …“, Baum „EA Deich Nord 11 Einh. · 2/11/70“, Kopfband „15/53/225 // 293“, Statuszeile „40 EINH · 15/53/225 // 293“.
- **Beobachtung:** Dass die Chips klickbare Filter sind, verrät nur der Tooltip (`nu-shots/07-chip-angefordert.png` zeigt es nach Klick). Dass „2/11/70“ Fü/UFü/He ist, weiß der Excel-Helfer aus dem Druckblatt — dass „11 Einh.“ Einheiten und nicht Helfer zählt, dass angeforderte Kräfte im Kopfband nicht mitzählen (Druckblatt-Fußnote: „ohne Kräfte aus dem Bereich Angefordert / Anmarsch“; Status-Matrix summiert 330, Kopfband 293) sieht er nur im Ausdruck. Diese Differenz 293 ≠ 330 (Screenshot 27 vs. 25) ist für ihn ein Widerspruch.
- **Erwartung der Rolle:** Eine Gesamtstärke; wenn zwei Zahlen, dann mit Beschriftung „anwesend“ / „inkl. angefordert“.
- **Auswirkung im Einsatz:** Falsche Zahl im Lagevortrag.
- **Empfehlung:** Tooltip/Unterzeile am Kopfband: „anwesend; +37 angefordert/Anmarsch“. Chips mit Filter-Symbol oder Beschriftung „Filter:“. Baum-Spaltenköpfe (Einh. · Fü/UFü/He) einmal oben zeigen.
- **Verifikation:** Helfer erklärt, warum 293 und 330 beide stimmen.

#### P2-3 · Bearbeitungshinweise sind Insiderwissen: „Doppelklick bearbeitet die Zelle · Enter schreibt · Esc verwirft · Strg+D setzt ‚jetzt‘“ steht klein unter der Tabelle; keine Rückmeldung nach dem Schreiben

- **Fundstelle:** Tabellenfuß (02, 06); Inline-Eingabe (06) ohne Speichern-Knopf; Schicht-Auswahl mit „—“ als erstem Eintrag.
- **Beobachtung:** In der Excel wird jede Zelle per Klick editiert; hier reagiert Einfachklick mit Markieren (für Verschieben), erst Doppelklick editiert. Nach Enter gibt es keine Bestätigung (kein „gespeichert“, kein Aufleuchten), das Tagebuch liegt in einem anderen Reiter. „—“ in Auswahlfeldern heißt „leer setzen“ — das steht nirgends.
- **Erwartung der Rolle:** Klick → tippen → Enter; eine Rückmeldung, dass es auf dem Share ist (die Excel speichert sichtbar).
- **Auswirkung im Einsatz:** Doppelte Eingaben, „habe ich das jetzt gespeichert?“, versehentliches Leeren via „—“.
- **Empfehlung:** Kurze Bestätigung in der Statuszeile („Status von BGr 1 → Einsatz · gespeichert · Zurücknehmen“). „—“ durch „(leer)“ ersetzen. Hinweiszeile einmalig prominent, dann klein.
- **Verifikation:** Nach jeder Inline-Änderung erscheint eine Bestätigung mit Rücknahme-Angebot.

#### P2-4 · Blatt „Führungsstelle“ (Excel: FüSt): Begriffe stimmen, aber Dienstposten ↔ Schichtplan ist ein zweistufiges Modell ohne Brücke

- **Fundstelle:** Screenshot 12: „Teilbereich Stab / ZTr FK / FGr F / FGr K / Externe“, „Funktion“, „Schicht“, „Dienstposten anlegen“, Tabellen mit „Besetzung“-Textfeld und „Entfernen“, darunter „Schichtplan“ mit „Tag anzeigen mm/dd/yyyy · Spalte öffnen“ und Freitextzellen je Tag; Hilfemarke: „Ein angelegter Dienstposten belegt noch keinen Platz im Schichtplan. Der Plan hängt am Paar aus Posten und Datum (§5.7).“
- **Beobachtung:** In der Excel trägt man „1“ in die Zelle Funktion × Tag/Nacht. Hier gibt es zwei Tabellen: oben „Besetzung“ (Name) je Dienstposten, unten je Datum nochmal ein Freitext (Name / Funktion / OV / Mobil). Was von beiden die Stärke der Führungsstelle zählt („Stab · Tag: 1/3/0“), ist nicht erkennbar. Datumsfeld englisch (mm/dd/yyyy). „Spalte öffnen“ ist ein Programmwort.
- **Erwartung der Rolle:** Eine Matrix Funktion × Tag, Tag/Nacht, wie in der Excel.
- **Auswirkung im Einsatz:** Doppelte Pflege, inkonsistente Namen, Datumstippfehler (Monat/Tag vertauscht).
- **Empfehlung:** Eine Tabelle: Zeile = Dienstposten, Spalten = Tage, Zelle = Name; Besetzung „heute“ oben als Zusammenfassung. Datum deutsch. „Spalte öffnen“ → „Tag hinzufügen“.
- **Verifikation:** Aufgabe „S1 für morgen Nacht mit Name eintragen“ gelingt in einer Tabelle, Stärkezeile aktualisiert sich.

#### P2-5 · Hilfe und Masken verweisen auf Konzeptpapiere („§5.4.5“, „KONZEPT-EREIGNISSE.md §2.5“, „Auflage 6“, „M7.2“)

- **Fundstelle:** Diagnose (18), Entfernen-Maske (nu-shots/09), Aufteilen-Maske („relativ (§5.4.2)“, nu-shots/10), Hilfe → Ansichten (nu-shots/31), Kosten-Fußnote „nach dem Zieldatenmodell §2.4“ (13).
- **Beobachtung:** Der Helfer hat kein Konzeptpapier; die Verweise lesen sich wie Entwicklernotizen. Der Hilfetext selbst ist gut (Wozu / Zuerst / Gut zu wissen).
- **Erwartung der Rolle:** Hilfe in ganzen Sätzen, Verweise höchstens auf das Handbuch mit Kapitelname.
- **Auswirkung im Einsatz:** Gering, aber es untergräbt die ansonsten gute Hilfe und verlängert Masken.
- **Empfehlung:** Paragraphen in der Oberfläche streichen (im Handbuch dürfen sie bleiben).
- **Verifikation:** Kein „§“ und kein Dateiname im Renderer-Text.

#### P2-6 · Der Excel-Bereich „Sonstiges Führung“, „Meldekopf FüSt BR_1/BR_2“, „Kopiervorlagen“ fehlen als sichtbare Bereiche; „Eingang“ ist neu

- **Fundstelle:** Baum (02): Eingang · FüSt Oldenburg · Meldekopf · Logistik · Bereitstellungsraum Hafen · EA … · Angefordert/Anmarsch · Einsatz beendet. Abschnittstypen (09): Führungsstelle / Meldekopf / Sonstige Führung / Logistik / Angefordert-Anmarsch / Bereitstellungsraum / Einsatzort.
- **Beobachtung:** „Kopiervorlagen THW StAN / KatS-Feuerwehr“ sind zur Maske „Aus Vorlage“ mit Katalogen FEUERWEHR / THW_STAN geworden — gut, aber die Katalognamen sind in Versalien mit Unterstrich. „Eingang“ (0 Einh.) ist ein Bereich, den die Excel nicht kennt; seine Rolle (Annahme: Sammelplatz für eingelesene Bögen und aufgelöste Abschnitte) steht nirgends. „Einsatz beendet“ wird als letzter Eintrag geführt — stimmt mit der Excel überein.
- **Empfehlung:** Katalognamen beschriften („THW (StAN)“, „Feuerwehr (KatS)“), „Eingang“ mit Untertitel „neu eingelesen, noch nicht zugeordnet“.
- **Verifikation:** Helfer benennt die Funktion von „Eingang“ nach dem ersten Blick.

### P3 — Niedrig

#### P3-1 · Stärke-Monitor: Knopf öffnet die Leiste „Auf dem Zweitbildschirm öffnen / Schließen“, aber keine Vorschau (nu-shots/17-monitorwahl.png); `#monitor` zeigt die normale Lage (23). Der Helfer weiß nicht, was der Monitor zeigt, bevor er einen zweiten Bildschirm hat. → Vorschau oder Beschreibung.

#### P3-2 · Jede Browser-Sitzung meldet sich als neuer Arbeitsplatz („5 weitere“ → „17 weitere, 6 veraltet“ in meinen Durchläufen). Für den Helfer bleibt unklar, ob da wirklich 17 Kollegen schreiben. → Veraltete Plätze nach kurzer Zeit nicht mehr zählen, Namen statt Zahl im Tooltip.

#### P3-3 · Themes „Standard / Dunkel / Feld / Nacht“ (20–22): „Feld“ (hoher Kontrast, dicke Rahmen) ist ohne Erklärung nicht von „Standard“ zu unterscheiden. Tooltip „Feld: hoher Kontrast für Sonne“ genügt.

#### P3-4 · Suche-Platzhalter „Einheit, Organisation, Ort, Kennzeichen …“ ist gut; die Suche in Tagebuch („Auf die Auswahl beschränken“ standardmäßig an → nur 1 Eintrag sichtbar, Screenshot 17) versteckt das ganze Tagebuch hinter einem Häkchen, dessen Bezug („Auswahl“ = markierte Einheit) nicht benannt ist. → „Nur markierte Einheit (ZTr THW Deich)“.

#### P3-5 · Kosten-Blatt (13) entspricht den Excel-Spalten PSA/VDA/UK; Fußnote „3 Einheit(en) fallen aus der Rechnung: angeforderte und archivierte Kräfte …“ ist gut — nur „archiviert“ heißt im Baum „Einsatz beendet“. Ein Wort pro Sache.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen (Kernablauf ja; Ablösung/Anforderung und Druck nur mit Suchen; nach P0-1 nein).
- **Fremde Hilfe nötig:** nein für Anlegen/Verschieben/Status; ja für Eingangskorb, Anforderungen, Konflikthinweise und für die Wiederherstellung nach einem Inline-Fehler.
- **Größtes Missverständnis:** „Fü / UFü / He“ ist eine Zelle wie in der Excel — ein Doppelklick darin ist harmlos.
- **Größtes Einsatzrisiko:** Ein versehentlicher Doppelklick in die Stärkezelle setzt die Gesamtstärke des Einsatzes auf `null/null/null` für alle Arbeitsplätze, und „Rückgängig“ bietet keinen Weg zurück.
- **Top-Priorität für die nächste Iteration:** Stärke-Inline-Bearbeitung absichern (Tripel validieren, Esc/Blur ohne Änderung schreibt nichts, Fold lehnt Strings ab) und danach die Rücknahme sichtbar machen (aktiver Knopf mit Beschreibung der letzten Aktion).
