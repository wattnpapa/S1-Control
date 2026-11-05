# THW-Rollen-Audit S1 (Personal / Innerer Dienst) — S1-Control v2

**Datum:** 05.11.2026
**Rolle:** Sachgebietsleiter S1 (Personal / Innerer Dienst) einer THW-Führungsstelle, Perspektive nach Skill `thw-s1-personal-reviewer`
**Material:** laufende Web-Schale (Stand `17b8182`, UX-Schnitte bis `ffc3125`), eigene Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten) unter http://127.0.0.1:8212, Arbeitsplatz „Arbeitsplatz“, Profil „Führungsstelle (S1)“ (Vorgabe auf der Einsatzauswahl); 43 Screenshots unter `scratchpad/shots/s1/` (1600 × 1000 und 1920 × 1080, Faktor 1); erzeugte Ausgaben (Druck, Status, Einheitenliste als HTML) im Share der Kopie unter `ausgaben/`; Ereignisdateien der Kopie, mit `falte()` aus `@s1/domaene` nachgerechnet; Quelltext nur lesend; Handbuch und Kurzanleitung; Vorgänger-Audits `docs/audits/v2-2026-10-29/`.
**Kennzeichnung:** **[beobachtet]** an der laufenden Anwendung gesehen · **[Code]** aus dem Quelltext belegt · **[Annahme]** Ablauf- oder Rollenannahme · **[nicht prüfbar]** mit diesem Material nicht zu klären.

Durchgeführte Prüfaufgaben:

1. „FGr N Westerstede“ (THW OV Westerstede, 0/1/8) als eingetroffene Einheit angelegt, in EA Pumpwerk Süd gesetzt, auf Einsatzbereit gestellt, Eintreffzeit und Erreichbarkeit nachgetragen.
2. Zahlendreher 0/1/8 → 0/8/1 eingetragen und zurückkorrigiert; Enter ohne Änderung und Eingabe „abc“ geprüft; Kopfband, Baum, Bereichssumme, Filterzeile und Tagebuch verglichen.
3. BGr 2 Oldenburg in Ruhe geschickt, FGr Wasserschaden auf Rückmarsch gesetzt und nach „Einsatz beendet“ verschoben; Kopfband vorher/nachher verglichen. Zusätzlich BGr 2 Oldenburg aufgeteilt (Trupp 0/1/2) und wieder zusammengeführt.
4. Für FGr Räumen A „Ablösung anfordern“, im Blatt Anforderungen zugesagt und „Eingetroffen“ mit Anlage der ablösenden Einheit durchgeführt; Sichtbarkeit an beiden Zeilen geprüft.
5. Druck, Status und Einheitenliste als HTML erzeugt, geöffnet und gegen Kopfband, Baum und Tabellensumme gerechnet; Stärke-Monitor geöffnet.

Hinweis zur Prüflage: Alle Ereignisse der Prüflage tragen als Erfassungszeit 05.11.2026 20:35; Eintreffzeiten, „Verfügbar bis“, Führer und Erreichbarkeit sind an keiner der 40 Einheiten erfasst. Aussagen über Einsatzdauer und Ablösungsfälligkeit beruhen deshalb auf den von mir eingetragenen Werten und auf dem Code.

---

## Urteil

Die Kernzahl stimmt jetzt. Kopfband, Baum, Bereichssummen, Tabellenfuß, Druck, Status-HTML, Einheitenliste und Stärke-Monitor nennen nach jeder meiner Änderungen dieselbe Ist-Stärke (zuletzt 14/49/212 // 275), und „Regel“ unter der Kopfzahl erklärt in einem Satz, was gezählt wird und was als „erwartet“ daneben steht. Der P0 vom 29.10. (Stärkezelle schreibt Text) ist behoben: Enter ohne Änderung schreibt nichts, „abc“ wird an der Zelle abgewiesen, und das Tagebuch nennt jetzt „Stärke geändert: 0/1/8 → 0/8/1“. Ausgaben lassen sich direkt öffnen und drucken. Das ist für S1 der wichtigste Fortschritt: Die Zahl für die Lagebesprechung kann ich ohne Nebenrechnung vortragen.

Reibung entsteht überall dort, wo S1 mehr braucht als die Zahl. Eine eintreffende Einheit kann ich nicht in einem Zug erfassen: Die Anlage kennt weder Führer, Erreichbarkeit, Eintreffzeit noch Schicht, und sie setzt immer „Angefordert“. Die Eintreffzeit setzt das Programm nirgends selbst, auch nicht beim „Eingetroffen“ einer Anforderung. Einen Führer mit Telefonnummer gibt es als Feld nicht; die Spalte „Führer / Erreichbarkeit“ der Einheitenliste ist in allen 41 Zeilen leer. Wie lange eine Einheit schon arbeitet, steht nirgends. Beim Aufteilen verschwinden die abgeteilten Kräfte aus der Ist-Stärke, weil die Teileinheit als „Angefordert“ entsteht.

**Ohne Nebenaufzeichnung schaffe ich die Rolle nicht:** Für Stärke und Status ja, für Führer/Telefon, Eintreffzeiten, Einsatzdauer und fällige Ablösungen führe ich weiter eine Liste auf Papier oder trage alles in mehreren Einzelschritten in ausgeblendeten Spalten nach.

---

## Was seit dem 29.10. behoben ist (geprüft, nicht übernommen)

| Befund 29.10. | Stand 05.11. |
|---|---|
| P0 Stärkezelle schreibt Text, „null/null/null // 0“ | **behoben** [beobachtet]: Enter ohne Änderung kein Ereignis, „abc“ → „Stärke als Fü/UFü/He, z. B. 0/1/8“, kein Schreiben |
| P1 Zwei Gesamtzahlen ohne Erklärung | **behoben** [beobachtet]: „Ist-Stärke … +N erwartet … N beendet“ mit „Regel“; Druck, Status, Einheitenliste und Monitor nennen dieselbe Ist-Stärke |
| P1 Ablösung/Anforderungs-ID fehlt in der Zeile, „Eingetroffen“ erzeugt keine Einheit | **weitgehend behoben** [beobachtet]: Marke „Ablösung angefordert / zugesagt / eingetroffen“ an der Bezeichnung, Spalten N–S in „Ressourcen“, „Eingetroffen“ legt die ablösende Einheit an und füllt „Ablösung durch“ |
| P1 „Verfügbar bis“ läuft ab, nirgends gezeichnet | **teilweise** [beobachtet]: Marke „läuft ab“ an der Zelle — aber nur in der ausgeblendeten Gruppe Ressourcen (→ P1-3) |
| P1 Ausgaben nur als Dateipfad | **behoben** [beobachtet]: „Geschrieben: … Öffnen · Herunterladen · Drucken“ |
| P2 Tagebuch ohne vorher/nachher | **behoben** für Stärke und Status [beobachtet] |
| P3 Stärke-Monitor in der Web-Schale unsichtbar | **behoben** [beobachtet]: eigenes Fenster `#monitor` |
| Rohwerte „ORTSVERBAND …“, `NUR_STAERKE` | **behoben** [beobachtet]: „THW OV Oldenburg“, „Nur Stärke“ |
| P1 Stärke und Status nicht ohne Scrollen sichtbar | **teilweise**: Status steht hinter der Bezeichnung; Stärke weiter außerhalb (→ P2-8) |
| P2 FüSt-Stärke doppelt (Dienstposten vs. gemeldete Einheiten) | **offen** (→ P2-10) |

---

## Findings

### P1-1 — Eine eintreffende Einheit lässt sich nicht in einem Zug erfassen

- **Priorität:** P1
- **Fundstelle / Aufgabe:** Aufgabe 1. Lage → „Einheit anlegen ▾“ → „Ohne Vorlage“ (`shots/s1/06-ohne-vorlage.png`, `08-anlage-ausgefuellt.png`), danach Statuszelle (`11-status-auswahl.png`), „Spalten ▾ → Ressourcen“, Zelle „Eingetroffen“ (`13-eingetroffen.png`). Code: `apps/desktop/src/renderer/EinheitAnlegen.tsx:69-95` (Felder Bezeichnung, Organisation, Ebene, Stärke, Herkunft, Abschnitt), `:228-236` (Hinweis „Der Status ist ‚Angefordert‘“), `apps/desktop/src/kontrakt/einheitsanlage.ts:20` (`STATUS_VORBELEGUNG = "ANGEFORDERT"`), `apps/desktop/src/kontrakt/anforderungsschritte.ts:55-68` (Anlage aus Anforderung setzt Status, keine Eintreffzeit).
- **Beobachtung [beobachtet, Code]:** Die Anlagemaske fragt Bezeichnung, Organisation, Ebene, Fü/UFü/He, Herkunft und Abschnitt. Status ist fest „Angefordert“ — auch wenn ich die Einheit in EA Pumpwerk Süd setze, weil sie vor mir steht. Nach dem Anlegen blieb das Kopfband bei 264, „+72 erwartet“. Danach brauchte ich: Statuszelle öffnen → „Einsatzbereit“ → „Übernehmen“ (Kopfband 273); „Spalten ▾“ → „Ressourcen“ einschalten (die Wahl war nach dem nächsten Öffnen wieder weg); Doppelklick „Eingetroffen“ → „20:30“; Doppelklick „Erreichbarkeit“ → Freitext; Schicht separat. Sechs Arbeitsschritte an drei Stellen für eine Meldung, die auf dem Papier eine Zeile ist. Die Eintreffzeit setzt das Programm nie selbst: weder beim Wechsel Angefordert → Einsatzbereit noch beim „Eingetroffen“ einer Anforderung — die dort angelegte „FGr R THW OV Westerstede“ steht als Einsatzbereit, aber mit leerem „Eingetroffen“ und ohne Schicht (Tabelle nach Aufgabe 4). In der ganzen Prüflage trägt keine einzige Einheit eine Eintreffzeit.
- **Erwartung der Rolle:** Eine Maske „Einheit eingetroffen“: Bezeichnung, Herkunft, Stärke, Führer mit Telefon, Funkrufname, Abschnitt, Schicht, Eintreffzeit (vorbelegt „jetzt“), Status (vorbelegt Einsatzbereit). Ein „Eingetroffen“ setzt die Eintreffzeit mit.
- **Auswirkung im Einsatz:** Beim Eintreffen mehrerer Einheiten am Meldekopf schreibe ich auf Papier mit und trage später nach; was nicht nachgetragen wird (Eintreffzeit, Schicht), fehlt dauerhaft — und damit die Grundlage für Einsatzdauer, Ablösung und Abrechnung. Vergisst jemand den Statuswechsel, steht die Einheit als „erwartet“ statt in der Ist-Stärke.
- **Empfehlung:** Anlage um Status (mit Wahl „eingetroffen / angefordert“), Eintreffzeit, Schicht und Führer/Erreichbarkeit erweitern oder einen eigenen Weg „Eintreffen erfassen“ anbieten. Statuswechsel auf Einsatzbereit/Einsatz und „Eingetroffen“ einer Anforderung setzen die Eintreffzeit, wenn sie leer ist (überschreibbar).
- **Verifikation:** Eine eintreffende Einheit mit Führer, Telefon, Stärke, Schicht und Abschnitt in einer Maske erfassen; danach zählt sie sofort in die Ist-Stärke und „Eingetroffen“ ist gefüllt. Dasselbe über Anforderung → „Eingetroffen“.

### P1-2 — Führer und Telefon einer Einheit sind nicht erfassbar und nicht auffindbar

- **Priorität:** P1
- **Fundstelle / Aufgabe:** Prüffrage „Finde ich zu einer Einheit sofort Führer, Rufname und Telefon?“. Auswahlleiste → „Funk …“ (`shots/s1/14-funk-menu.png`), Spalte „Erreichbarkeit“ (Gruppe Ressourcen), Einheitenliste (`35-einheitenliste.png`), Suche (`40-suche-fuehrer.png`). Code: `packages/domaene/src/kennzahlen.ts:355-379` (`erreichbarkeit` leitet aus `fuehrungskraft` und `hierarchie[0].telefon` ab), `packages/domaene/src/zustand.ts:250` (`fuehrungskraft` im Datenmodell), keine Schreibstelle für `fuehrungskraft` in `apps/` (Suche über `apps/` und `packages/`, nur Domäne), `packages/domaene/src/projektion/tabelle.ts:555-561` (Suche über Bezeichnung, Organisation, FüSt-Kennung, Herkunft).
- **Beobachtung [beobachtet, Code]:** Die Maske „Funk und Erreichbarkeit“ zeigt „Erreichbarkeit — aus Führungskraft und Kontakten“ mit „Überschreiben …“; eine Führungskraft lässt sich aber nirgends eintragen — das Feld existiert im Zustand, kein Bedienweg schreibt es. Erreichbarkeit ist an allen 40 Einheiten der Prüflage leer. Was bleibt, ist Freitext in der Spalte „Erreichbarkeit“ (ausgeblendete Gruppe Ressourcen); ich habe „GrFü Meier, Tel. 0171 2345678“ eingetragen. Die Suche nach „Meier“ und nach „0171“ findet die Einheit nicht und zeigt stattdessen alle zwölf Bereichszeilen mit „0 Einh.“. Die Einheitenliste druckt die Spalte „Führer / Erreichbarkeit“ — leer in allen 41 Zeilen.
- **Erwartung der Rolle:** Ein Feld Führer (Name, Funktion) und Telefon an der Einheit, sichtbar in der Standardansicht oder per Klick auf die Zeile, durchsuchbar. Bei einem Verletzten muss ich in Sekunden den Einheitsführer anrufen können.
- **Auswirkung im Einsatz:** Bei Unfall, Ausfall oder Rückfrage zur Stärke bleibt der Griff zur Papierliste vom Meldekopf. Eine Einheit, deren Führer ich nicht erreiche, kann ich weder ablösen noch abmelden.
- **Empfehlung:** Führer und Telefon als eigene Felder an der Einheit (Anlage, Zeile, „Funk und Erreichbarkeit“), Anzeige als Tooltip/Zeile unter der Bezeichnung, Aufnahme in die Suche.
- **Verifikation:** Führer „Meier“ mit Telefon an einer Einheit eintragen; die Suche „Meier“ findet sie, die Einheitenliste druckt Name und Nummer, die Zeile zeigt beides ohne Spaltenumschaltung.

### P1-3 — Einsatzdauer und fällige Ablösung sind nicht auf einen Blick zu sehen

- **Priorität:** P1
- **Fundstelle / Aufgabe:** Prüffrage „Sehe ich, wann eine Einheit eingetroffen ist, wie lange sie im Einsatz ist und wann Ablösung oder Ruhezeit fällig wird?“ Spalte „Verfügbar bis“ mit Marke „läuft ab“ (`shots/s1/28-verfuegbar-bis.png`), Filterzeile, Druck, Einheitenliste. Code: `apps/desktop/src/renderer/Ressourcenmarken.tsx:1-18` (K18 nur „an der Zelle ‚Verfügbar bis‘“), `packages/domaene/src/projektion/abloesung.ts:89-103` (Vorlauf ein Tag).
- **Beobachtung [beobachtet, Code]:** Für BGr 2 Oldenburg „Verfügbar bis 21:30“ eingetragen: Die Zelle trägt „läuft ab“ — sichtbar nur, wenn „Spalten ▾ → Ressourcen“ eingeschaltet ist, und dann am rechten Rand hinter 20 Spalten. An der Bezeichnung, in der Filterzeile, im Baum, im Kopfband, im Druck und in der Einheitenliste steht nichts davon; es gibt keine Zahl „Ablösung fällig: n“. Eine Einsatzdauer („seit 12:30 h im Einsatz“) rechnet das Programm nirgends, auch nicht aus „Eingetroffen“. Eine Ruhezeitregel gibt es nur in der Versorgung als Ja/Nein. Die Einheitenliste hat eine Spalte „Eingetroffen“, aber nicht „Verfügbar bis“.
- **Erwartung der Rolle:** Neben Status/Schicht: „im Einsatz seit“ bzw. Dauer, „verfügbar bis“ mit Marke; eine Zahl „Ablösung fällig (n)“ als Filter; im Ausdruck für die Lagebesprechung eine Spalte oder Liste „Ablösung fällig“. [Annahme] Höchsteinsatzzeiten und Ruhezeiten plant S1 aus genau diesen Angaben.
- **Auswirkung im Einsatz:** Ablösungen werden zu spät angefordert, weil die Fälligkeit nur in einer ausgeblendeten Spalte steht; die Dauer rechne ich im Kopf aus Eintreffzeiten, die meist gar nicht erfasst sind (P1-1).
- **Empfehlung:** Marke „läuft ab / abgelaufen“ zusätzlich an der Bezeichnung (wie die Ablösungsmarke), Filter „Ablösung fällig“, Dauer seit Eintreffen als berechnete Spalte in der Standardsicht, beides in Einheitenliste und Druck.
- **Verifikation:** Einheit mit „Verfügbar bis“ in 3 h → Marke an der Bezeichnung bei ausgeblendeter Ressourcen-Gruppe, Filter zeigt 1, Einheitenliste führt sie; Einheit mit Eintreffen vor 10 h zeigt „10 h“.

### P1-4 — Aufteilen nimmt die abgeteilten Kräfte aus der Ist-Stärke

- **Priorität:** P1
- **Fundstelle / Aufgabe:** Aufgabe 3 (Teileinheit bilden). Auswahlleiste → „Aufteilen“ (`shots/s1/36-aufteilen.png`). Code: `apps/desktop/src/kontrakt/bedienschritte.ts:250-266` (`neueEinheit`: `hierarchie: []`, `status: STATUS_VORBELEGUNG`, keine Schicht).
- **Beobachtung [beobachtet, Code]:** BGr 2 Oldenburg (Ruhe, 0/1/8, Schicht Nacht, THW OV Oldenburg) aufgeteilt, „BGr 2 Oldenburg — Trupp Sandsack“ 0/1/2 nach UA Deichfuß. Ergebnis: Quelle 0/0/6, Teileinheit 0/1/2 mit Status **„Angefordert“**, ohne Herkunft, ohne Schicht. Kopfband 275 → **272**, „+63“ → „+66 erwartet“. Drei Helfer, die vor Ort sind, stehen jetzt als „erwartet“. Die Maske sagt dazu nichts; ihr Hinweis erklärt nur die relative Rechnung. Zusammenführen stellt 275 wieder her.
- **Erwartung der Rolle:** Eine Teileinheit erbt Status, Herkunft, Schicht und Eintreffzeit der Quelle; die Gesamtstärke bleibt beim Aufteilen gleich.
- **Auswirkung im Einsatz:** Jede Trupp-Abstellung senkt die gemeldete Ist-Stärke, bis jemand den Status der Teileinheit nachsetzt. In der Status-Ausgabe steht die Teileinheit unter „Angefordert“ und in der Kontrollsumme als „ohne Schicht“ — die Zahl nach oben ist falsch, ohne dass ein Fehler angezeigt wird.
- **Empfehlung:** Status, Herkunft, Schicht (und Eintreffzeit) von der Quelle übernehmen; in der Maske die Summe „vorher 0/1/8 = nachher 0/0/6 + 0/1/2“ zeigen.
- **Verifikation:** Aufteilen einer Einheit im Status Einsatz/Ruhe → Kopfband unverändert, Teileinheit trägt denselben Status, dieselbe Herkunft und Schicht.

### P2-5 — Abmelden ist zweistufig, ohne Abmeldezeit, und der Baum zählt den Bereich „Einsatz beendet“ als leer

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Aufgabe 3. Status → „Rückmarsch“, Auswahlleiste → „Verschieben“ → „Einsatz beendet“ (`shots/s1/18-verschieben.png`, `20-nach-abmelden.png`, `21-baum-einsatz-beendet.png`). Code: `packages/domaene/src/kennzahlen.ts:62-76` (`einheitenDerLage` schließt ARCHIV-Bereiche aus, `einheitenImAbschnitt` nutzt sie), `packages/domaene/src/projektion/baum.ts:164`.
- **Beobachtung [beobachtet, Code]:** Ruhe für BGr 2 Oldenburg ließ die Ist-Stärke unverändert (273, wie die Regel sagt). „Rückmarsch“ für FGr Wasserschaden senkte sie auf 267, „3 beendet“ → „9 beendet“. Ein Status „abgemeldet“ gibt es nicht; abgemeldet ist eine Einheit erst nach dem zusätzlichen Verschieben nach „Einsatz beendet“. Dabei wird weder „Einsatzende“ noch „Rückführung“ gesetzt, der Status bleibt „Rückmarsch“. Der Baum zeigt danach „Einsatz beendet 0 · 0/0/0“, obwohl die Tabelle nach Klick auf genau diese Zeile „Einheiten 1 in Einsatz beendet“ zeigt; „Alle Bereiche“ nennt 41, der Tabellenkopf 42 Einheiten. Das Kopfband nennt Rückmarsch und Abgemeldete zusammen „9 beendet“, obwohl Trupp Aufklärung nur auf dem Rückweg ist.
- **Erwartung der Rolle:** Ein Schritt „Abmelden“ mit Zeitpunkt (vorbelegt jetzt), der Einsatzende setzt und die Einheit in „Einsatz beendet“ legt; der Baum zählt dort die tatsächlich abgemeldeten Einheiten. Rückmarsch und abgemeldet getrennt benannt.
- **Auswirkung im Einsatz:** Die Abmeldezeit fehlt für Einsatzdauer und Abrechnung, wenn sie nicht von Hand nachgetragen wird. Wer im Baum „Einsatz beendet 0“ liest, sucht die abgemeldete Einheit oder meldet sie doppelt ab.
- **Empfehlung:** „Abmelden …“ in Auswahlleiste/Kontextmenü (Zeit, Bereich, Status in einem Zug); Baumzeile „Einsatz beendet“ mit Zahl der Einheiten und ihrer Stärke (als „zählt nicht“ gekennzeichnet); Kopfband „3 Rückmarsch · 6 abgemeldet“.
- **Verifikation:** Einheit abmelden → Einsatzende gesetzt, Baum „Einsatz beendet 1 · 0/1/5“, Kopfband trennt Rückmarsch und abgemeldet.

### P2-6 — Konflikthinweise erscheinen ohne Konflikt und erklären sich falsch

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Aufgaben 1–3. ⚠ an „Eingetroffen“ von BGr 2 Oldenburg nach Nachtrag „05.11. 08:00“ und ⚠ an der Stärke nach Aufteilen + Zusammenführen (`shots/s1/30-konflikte.png`). Statuszeile „8 → 9 Konflikthinweise“, allein am Einsatz. Code: `packages/domaene/src/fold.ts:985-1016` (`meldezeitUnplausibel` ab 12 h Abstand zur Wanduhr), `packages/domaene/src/fold.ts:1773-1790` (`vorgangSummeWeichtAb` für die Aufteilung, auch wenn die Teileinheit zurückgeführt ist), `apps/desktop/src/renderer/Einheitenzelle.tsx:105` (Tooltip „Ein anderer Arbeitsplatz hat es zuletzt anders gesehen“), `apps/desktop/src/renderer/statushinweise.ts:26` („Zwei Arbeitsplätze haben dasselbe Feld fast gleichzeitig verschieden geändert“).
- **Beobachtung [beobachtet, Code]:** Ich war allein am Einsatz. Eine Eintreffzeit, die mehr als 12 Stunden zurückliegt, erzeugt einen Hinweis „meldezeitUnplausibel“; nach Aufteilen und Zurückführen trägt die Stärke 0/1/8 einen Hinweis „vorgangSummeWeichtAb“ (gerechnet 0/2/10 gegen gesehen 0/1/8), obwohl die angezeigte Stärke stimmt. Beide zeigt die Oberfläche als Konflikt zweier Arbeitsplätze. Alle 8 Hinweise der Prüflage sind ebenfalls Zeit-Plausibilitäten (Einsatzbeginn, Anforderungszeiten), keiner ist ein Konflikt zwischen Arbeitsplätzen.
- **Erwartung der Rolle:** Ein Hinweis sagt, was er ist: „Eintreffzeit liegt mehr als 12 h zurück — stimmt das?“ bzw. „Summe nach Teilung/Zusammenführung prüfen“. Ein Konflikt heißt Konflikt nur, wenn zwei Bediener dasselbe Feld geändert haben.
- **Auswirkung im Einsatz:** Das Nachtragen von Eintreffzeiten vom Vortag — S1-Alltag — erzeugt Warnungen mit falscher Erklärung. Wer laufend „Konflikte“ sieht, die keine sind, übersieht den echten Konflikt an einer Stärke.
- **Empfehlung:** Hinweisarten getrennt beschriften (Tooltip und Statuszeile); Plausibilität als Rückfrage beim Eintragen statt als dauerhafter Konflikt; Summenprüfung nach Zurückführen nicht auslösen.
- **Verifikation:** Eintreffzeit von gestern nachtragen → Hinweistext nennt die Zeitplausibilität, nicht einen anderen Arbeitsplatz; Aufteilen und Zusammenführen derselben Einheit → kein ⚠.

### P2-7 — Status-Ausgabe: Schichttabelle widerspricht ihrer Überschrift und der Kontrollsumme

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Aufgabe 5. `ausgaben/status_2026-11-05_2054.html` (`shots/s1/34-status.png`). Code: `packages/ausgaben/src/status.ts:276` (`UEBERSCHRIFT_ZUSATZ = " — alle erfassten Einheiten, auch erwartete"`), `:21-23` (K23: Angeforderte fehlen in der Schichtprobe), `:329`; `packages/ausgaben/src/status-kontrolle.ts:59`.
- **Beobachtung [beobachtet, Code]:** Organisationen und Status summieren 338, die Schichttabelle 284 — alle drei mit der Überschrift „alle erfassten Einheiten, auch erwartete“. Die Kontrollsumme sagt: „In der Schichttabelle fehlen 17 Kräfte … Betroffen: FGr R THW OV Westerstede, FGr N Westerstede.“ Tatsächlich fehlen 54: die 17 genannten plus die 37 aus dem Bereich „Angefordert / Anmarsch“, die die Schichttabelle bewusst auslässt. Die Ist-Stärke im Kopf (275) und die Statuszeilen (Einsatzbereit + Einsatz + Ruhe + Nicht einsatzbereit = 275, erwartet 63) stimmen dagegen.
- **Erwartung der Rolle:** Jede Tabelle sagt, was sie zählt; die Kontrollsumme erklärt die ganze Differenz.
- **Auswirkung im Einsatz:** Wer die Schichtzahl für die Verpflegung oder die Nachtschicht nach oben meldet, kann sie nicht gegen die Organisationstabelle abgleichen und verliert in der Lagebesprechung Zeit mit einer Differenz, die das Blatt falsch erklärt.
- **Empfehlung:** Schichttabelle mit „ohne Bereich Angefordert / Anmarsch“ überschreiben oder die Angeforderten als Zeile „ohne Schicht (angefordert)“ führen; Kontrollsumme mit der vollen Differenz.
- **Verifikation:** Status-HTML: Summe Schicht + ausgewiesene Restzeilen = Summe Organisationen; Kontrollsatz nennt dieselbe Zahl.

### P2-8 — Die Stärke der einzelnen Einheit liegt auch bei 1920 px außerhalb des Bilds; die Filterzeile zählt Einheiten

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Lage, Standardsicht (`shots/s1/02-lage.png` bei 1600 px, `42-lage-1920.png` bei 1920 px). Gemessen: Spalte „Fü / UFü / He“ beginnt bei x = 2221, Tabellenrahmen 1520 px breit, Inhalt 2034 px. Filterzeile: Kräfte nur im Tooltip („Einsatz 25“ → title „Stärke 173“).
- **Beobachtung [beobachtet]:** Status steht jetzt direkt hinter der Bezeichnung — gut. Stärke und Gesamt sind aber weiterhin die letzten Spalten hinter FüSt., Organisation, Herkunft, Gliederungsebene, Geräte, Aufträge, Schicht, ID Erfassungsbogen und Personalerfassung; auch die Bereichs-Zwischensummen stehen rechts außerhalb. Eine lange Auftragszelle (Ablösung) schiebt sie weiter nach rechts. Die Filterzeile zeigt „Einsatzbereit 7 · Einsatz 23 · Ruhe 3“ — Einheiten, nicht Kräfte. (Unverändert seit 29.10., P1-5 und P1-4 dort.)
- **Erwartung der Rolle:** Bezeichnung, Status, Schicht, Fü/UFü/He und Gesamt ohne Scrollen; in der Filterzeile Einheiten und Kräfte.
- **Auswirkung im Einsatz:** Jede Rückfrage „wie stark ist die BGr 2?“ kostet einen Seitwärtsscroll; „wie viele Kräfte sind in Ruhe?“ ist nur per Mauszeiger beantwortbar, am Touch gar nicht.
- **Empfehlung:** Stärke und Gesamt hinter Status ziehen oder rechts fixieren; Filterchips „Einsatz 23 · 173“.
- **Verifikation:** Bei 1600 px Breite sind Status, Schicht und Stärke jeder Zeile ohne horizontales Scrollen sichtbar; die Filterzeile nennt Kräfte.

### P2-9 — Ablösung: kein Bedarfszeitpunkt, und die abgelöste Einheit bleibt ohne Folgehinweis im Einsatz

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Aufgabe 4. „Ablösung anfordern“ (`shots/s1/22-abloesung-maske.png`), Anforderungen (`24-anforderungen.png`, `25-zusage.png`), „Eingetroffen“ (`26-eingetroffen-maske.png`), Lage danach (`27-abloesung-eingetroffen-lage.png`).
- **Beobachtung [beobachtet]:** Die Maske fragt nur Kennung, vorgesehene Einheit und Auftrag — nicht, ab wann die Ablösung gebraucht wird oder mit welcher Stärke. Ohne Kennung bleibt die Anforderungs-ID leer. An der Zeile steht danach die Marke „Ablösung angefordert“ (gut); „Zugesagt für 06.11.2026 06:00“ steht nur in der ausgeblendeten Ressourcen-Gruppe. Die Eingetroffen-Maske belegt die Herkunft mit „THW RB Oldenburg“ (dem Zusagenden) statt dem Ortsverband der ablösenden Einheit vor. Nach dem Eintreffen zählen alte und neue Einheit (Kopfband 267 → 275); FGr Räumen A trägt „Ablösung eingetroffen“, bleibt aber „Einsatz“ — kein Hinweis „abgelöste Einheit in Rückmarsch setzen?“.
- **Erwartung der Rolle:** „Ablösung benötigt ab“ in der Anforderung; Zusagezeit als Tooltip an der Marke; nach dem Eintreffen das Angebot, die abgelöste Einheit in Rückmarsch zu setzen.
- **Auswirkung im Einsatz:** Die Ablösung wird ohne Termin an die übergeordnete Stelle gemeldet; nach dem Wechsel stehen beide Einheiten so lange in der Ist-Stärke, bis S1 die alte von Hand abmeldet — die Stärkemeldung ist in dieser Zeit überhöht.
- **Empfehlung:** Feld „benötigt ab“ in der Ablösungsmaske; Marke mit Tooltip „zugesagt für … von …“; nach „Eingetroffen“ ein Folgeschritt „FGr Räumen A abmelden / in Rückmarsch“.
- **Verifikation:** Ablösung mit Termin anfordern → Termin an der Marke lesbar; nach Eintreffen wird der Rückmarsch der abgelösten Einheit angeboten.

### P2-10 — Die Stärke der eigenen Führungsstelle hat zwei Quellen

- **Priorität:** P2
- **Fundstelle / Aufgabe:** Blatt Führungsstelle (`shots/s1/38-fuehrungsstelle.png`) gegen Lage → „FüSt Oldenburg 2 · 3/5/2“.
- **Beobachtung [beobachtet]:** Die Dienstposten ergeben „Stab · Tag 1/3/0 · Nacht 1/0/0 · ZTr FK · Tag 0/1/1 · FGr F · Tag 0/1/1 · FGr K · Nacht 0/1/1 · Externe · Tag 0/0/1“, die Lage führt die FüSt als zwei gemeldete Einheiten mit 3/5/2 = 10. Telefonnummern stehen nur als Bemerkung im Schichtplan („Mob. 0441-000001“). Die Spaltenköpfe des Schichtplans lauten „2026-09-08“. (Unverändert seit 29.10., P2-6 dort.)
- **Erwartung der Rolle:** Eine FüSt-Stärke; die Besetzung des Dienstplans speist sie oder wird gegen sie geprüft.
- **Auswirkung im Einsatz:** Die eigene Stärke meldet S1 je nach Blatt verschieden; die Nachtbesetzung (SGL 1 Nacht, SprFu/Kf Nacht leer) fällt in der Lage nicht auf.
- **Empfehlung:** Entweder Dienstplan → Stärke der FüSt-Einheiten oder ein sichtbarer Abgleich „Dienstplan 9 / gemeldet 10“; Datumsköpfe als TT.MM.
- **Verifikation:** FüSt-Stärke in Lage und Blatt Führungsstelle gleich oder Abweichung benannt.

### P3-11 — Nachvollziehbarkeit im Detail

- **Priorität:** P3
- **Fundstelle / Aufgabe:** Aufgabe 2, Tagebuch (`shots/s1/17-tagebuch.png`), Zellen-Tooltips, Einheitenliste.
- **Beobachtung [beobachtet]:** Ein Zahlendreher 0/1/8 → 0/8/1 lässt die Gesamtzahl gleich und wird ohne Rückfrage übernommen (acht Unterführer in einer Gruppe). Das Tagebuch schreibt „Zeitpunkt gesetzt (Eintreffen): (leer) → 2026-11-05T20:30:00.000Z“ und „Einheit gemeldet“ ohne Stärke und Bereich. Jede Zelle trägt als Tooltip einen ISO-Zeitstempel („2026-11-05T20:35:26.500Z“). Die Einheitenliste druckt den Auftrag als „05.11.2026 20:52–; Ablösung Deichfuß Nachtschicht“.
- **Erwartung der Rolle:** Plausibilitätsfrage bei untypischer Verteilung für die Ebene; Tagebuch und Tooltips in TT.MM. HH:MM; Anmeldung mit Stärke und Bereich im Tagebuch.
- **Auswirkung im Einsatz:** Kleine Reibung bei der Prüfung „wer hat wann was geändert“, keine falsche Zahl.
- **Empfehlung:** Zeitformat der Oberfläche auch im Tagebuch und in Tooltips; „Einheit gemeldet: 0/1/8 in EA Pumpwerk Süd“; weiche Plausibilitätswarnung.
- **Verifikation:** Tagebuch zeigt keine ISO-Zeit mehr; Anmeldung nennt Stärke.

### P3-12 — Kleinigkeiten an Monitor, Druck und Bezeichnungen

- **Priorität:** P3
- **Fundstelle / Aufgabe:** Monitor (`shots/s1/37b-monitor-fenster.png`), Druck (`33-druck.png`), Tabellenfuß, Suche.
- **Beobachtung [beobachtet]:** Der Stärke-Monitor zeigt nur „14/48/210 = 272“ ohne „+66 erwartet“. Der Druck führt weiter die Spalte „Probe o.k.“, aber keine erwarteten Kräfte je Bereich. „Alle erfassten Einheiten 40 Einh.“ schließt die zwei beendeten/zurückmarschierenden aus. „1 Einheiten“ im Fuß. Eine erfolglose Suche zeigt zwölf Bereichszeilen „0 Einh.“ statt „keine Treffer“.
- **Empfehlung:** Monitor mit „+N erwartet“; im Druck je Bereich „+N erwartet“; Beschriftung „alle erfassten ohne beendete“; Singular; leere Bereiche bei Suche ausblenden.
- **Verifikation:** Sichtprüfung der genannten Stellen.

---

## Zahlenprobe (Endstand meiner Kopie, 20:56 Uhr)

| Stelle | Zahl |
|---|---|
| Kopfband | 14/49/212 // 275 · +63 erwartet · 9 beendet |
| Baum „Alle Bereiche“ | 41 · 14/49/212 |
| Tabellenfuß | Ist 275 · Erwartet 63 · Alle erfassten 338 · Beendet/Rückmarsch 9 |
| Druck | Gesamt (Ist-Stärke) 14/49/212 = 275, Fußzeile erwartet 63 |
| Status-HTML | Kopf 275 · Organisationen 338 · Status 338 (Ist-Status 275) · Schichten 284 (→ P2-7) |
| Einheitenliste | Ist 275 · Erwartet 63 · Alle erfassten 338 |
| Stärke-Monitor (bei 272) | gleich Kopfband |

Alle Ist-Zahlen stimmen nach jedem Schritt überein. Abweichend sind nur die Schichttabelle (Überschrift) und die Einheitenzahl des Baums (41 statt 42, P2-5).

---

## Positives

Die Ist-Stärke ist jetzt eine Zahl mit erklärter Regel, und sie ist auf allen Blättern, im Druck und auf dem Monitor dieselbe — nach Anlegen, Statuswechsel, Korrektur, Verschieben, Aufteilen und Zusammenführen ohne Ausnahme. Die Stärkezelle ist sicher: Unverändertes Enter schreibt nichts, Ungültiges wird an der Zelle benannt, und jede Korrektur steht mit „vorher → nachher“ im Tagebuch. Die Marke „Ablösung angefordert / zugesagt / eingetroffen“ an der Bezeichnung und das Anlegen der ablösenden Einheit aus der Anforderung ersparen eine Doppelerfassung. Ausgaben lassen sich direkt öffnen und drucken, und die Einheitenliste sagt ehrlich, welche Einheit im Bereich „Einsatz beendet“ nicht aufgeführt ist. Das Profil „Führungsstelle (S1)“ ist Vorgabe und zeigt genau die Reiter, die S1 braucht.

---

## Abschluss

- **Aufgabe der Rolle geschafft:** mit Umwegen — Stärke führen, korrigieren, abmelden und für die Lagebesprechung drucken geht; Ankunft, Erreichbarkeit, Einsatzzeiten und Teileinheiten nur in Einzelschritten oder gar nicht.
- **Nebenaufzeichnung auf Papier nötig:** ja — für Führer und Telefon je Einheit, Eintreff- und Abmeldezeiten, Einsatzdauer und fällige Ablösungen.
- **Größte Lücke an einer Übergabe:** Vom Meldekopf an S1 kommt eine eintreffende Einheit mit Führer, Telefon und Eintreffzeit, aber die Software nimmt davon nur Name, Herkunft, Stärke und Abschnitt auf und setzt sie auf „Angefordert“.
- **Größtes Einsatzrisiko:** Beim Aufteilen einer Einheit fallen die abgestellten Kräfte unbemerkt aus der gemeldeten Ist-Stärke, bis jemand den Status der Teileinheit nachsetzt.
- **Top-Priorität für die nächste Iteration:** Ein Erfassungsweg „Einheit eingetroffen“ mit Status, Eintreffzeit (vorbelegt jetzt), Schicht, Führer und Telefon in einer Maske — und dieselben Vorgaben für Teileinheiten beim Aufteilen.
