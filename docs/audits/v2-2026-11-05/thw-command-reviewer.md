# Audit S1-Control v2 — Perspektive Leiter Führungsstelle / S1–S3

Stand: **05.11.2026**, HEAD `ffc3125` (nach den Schnitten E1–E4 „Entlastung der Oberfläche“ und dem Fleetmapping-Vorschlag).

Material: eigene Web-Schale `http://127.0.0.1:8202` mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten), Profil „Führungsstelle (S1)“, Viewports 1440×900, 1600×1000, 1920×1080, Nachtbild. Durchlauf 20:40–20:55 Uhr mit realen Schreibvorgängen (Statuswechsel, „Verfügbar bis“, Anforderung „Eingetroffen“, Stärkezelle, Ausgaben erzeugt). Aufnahmen `scratchpad/shots/command/01…81` (deviceScaleFactor 1), erzeugte Ausgaben unter `share/einsaetze/2026-09-08-uebung-weser-ems/ausgaben/` der Kopie. Quelltext nur lesend. Vergleich: Vorgänger-Audit `docs/audits/v2-2026-10-29/thw-command-reviewer.md`.

Rolle: Ich führe die Führungsstelle. Ich will in Sekunden wissen: Wie viele Kräfte sind vor Ort, wie viele kommen noch? Wer steht wo in welchem Status mit welcher Stärke? Was ist offen, was ist fällig, was ist strittig? Und kann mein Ablöser das ohne mich übernehmen?

Kennzeichnung: **[beobachtet]** = an der laufenden Web-Schale gesehen oder ausgelöst; **[Code]** = aus der Quelle belegt (Datei:Zeile); **[Annahme]** = Annahme über THW-Abläufe oder Ursache, nicht belegt; **[nicht prüfbar]** = in der Web-Schale nicht nachvollziehbar.

---

## Urteil

Gegenüber dem 29.10. ist die Lage deutlich führbarer geworden. Das Kopfband sagt jetzt, was es zählt: **„Ist-Stärke 14/48/202 // 264 · +63 erwartet · 3 beendet“**, mit einer aufklappbaren Regel. Ein Statuswechsel schlägt sofort ins Kopfband durch (GTr Wassergefahren Anmarsch → Einsatz: 264 → 269, +63 → +58) und wird in der Statuszeile mit „gespeichert“ und Rückgängig quittiert. Die Ablösung hängt jetzt an der Einheit („BGr 1 Oldenburg **Ablösung angefordert**“, „FGr Elektroversorgung **Ablösung zugesagt**“). „Eingetroffen …“ an einer Anforderung legt die Einheit an, die Zeile der abgelösten Einheit wechselt auf „Ablösung eingetroffen“. Das Tagebuch nennt „vorher → nachher“. Ausgaben haben Öffnen/Herunterladen/Drucken, das Status-HTML erklärt seine Zählgrundlagen. Der P0 vom 29.10. (Stärkezelle schreibt Text) ist behoben.

Reibung entsteht an drei Stellen:

1. **Die Kernfrage „wer, wo, Status, Stärke“ passt nicht in ein Bild.** Auch bei 1920 px liegt „Fü / UFü / He“ rechts außerhalb; scrolle ich nach unten, verschwinden Kopfband, Spaltenköpfe und Baum; scrolle ich nach rechts, verlieren die Abschnittszeilen ihren Namen.
2. **Was fällig oder offen ist, muss ich mir zusammensuchen.** „läuft ab“ an „Verfügbar bis“ erscheint nur in der ausgeschalteten Spaltengruppe Ressourcen, Spalte 15; es gibt keinen Zähler und keinen Filter. Offene Anforderungen zählt kein Reiter.
3. **Warnungen und Herkunft lassen sich nicht zurückverfolgen.** „⚠ 8 Konflikthinweise“ verspricht ein ⚠ in der Tabelle. Ich habe keines gefunden, auch nicht mit allen Spaltengruppen. Jeder Arbeitsplatz heißt „Arbeitsplatz“ auf „vm“, das Tagebuch kann also nicht sagen, wer was gemeldet hat.

Aufgabe ohne fremde Hilfe: **ja, mit Umwegen.**

---

## Findings

### P1-1 — Stärke und Status nicht in einem Bild; beim Scrollen geht die Orientierung verloren

- **Fundstelle / Aufgabe:** Lage, Standardsicht „Grunddaten, Stärke“. Aufnahmen `04-lage-1440.png`, `04-lage-1920.png`, `17-gescrollt.png`, `16-verfuegbar-bis.png`, `14-statuswahl.png`.
- **Beobachtung [beobachtet]:** Status steht jetzt direkt hinter der Bezeichnung (Verbesserung zum 29.10.). Davor stehen aber weiter „FüSt.“, „Organisation“, „Herkunft“, „Gliederungsebene“, „Geräte / Fahrzeuge“, „Aufträge“, „Schicht“, „ID Erfassungsbogen“ und „Personalerfassung“. Bei 1920 px endet das Bild bei „Personalerfa…“, „Fü / UFü / He“ und „Gesamt“ liegen rechts außerhalb. Bei 1440 px sind wegen der hohen Zeilen (≈ 49 px) nur 8 Einheiten sichtbar. Die Summenzeile „Ist-Stärke gesamt · 33 Einh. …“ steht links, ihre Zahl rechts außerhalb.
  - Die ganze Seite scrollt, nicht die Tabelle allein: Nach 1 500 px sind Kopfband (Ist-Stärke), Spaltenköpfe und Abschnittsbaum weg (`17-gescrollt.png`). Die Werte „05.11.2026 23:30“ und „08.09.2026 05:30“ stehen dann ohne Überschrift da.
  - Beim Scrollen nach rechts bleibt die Bezeichnung stehen. Die Zwischenzeilen der Abschnitte zeigen aber nur noch „2/10/65 77“ ohne den Namen „EA Deich Nord“, und die stehende Spalte verdeckt die erste Ziffer der Stärke („0/1/8“ erscheint als „)/1/8“, „1/3/14“ als „'3/14“, `16-verfuegbar-bis.png`).
- **Erwartung der Rolle:** Auf dem Führungsstellenrechner (Annahme: 1920×1080 oder Laptop 1440) ohne Scrollen: Bezeichnung, Status, Stärke, Gesamt, Abschnitt. Kopf und Spaltenköpfe bleiben stehen wie in der Excel mit fixierten Zeilen und Spalten.
- **Auswirkung im Einsatz:** Jede Frage „wie stark ist X“ kostet einen Seitwärts-Scroll. In der Lagebesprechung am Beamer ist die Stärke nie im Bild. Wer weit unten scrollt, sieht weder die Gesamtstärke noch, welche Spalte er liest. Eine halb verdeckte Führerziffer kann als falsche Stärke abgelesen werden.
- **Empfehlung:** „Fü / UFü / He“ und „Gesamt“ direkt hinter Status ziehen oder mit der Bezeichnung stehen lassen. Leere Spalten (FüSt., Geräte, Aufträge, ID Erfassungsbogen) schmal oder in eine andere Gruppe. Kopfband und Spaltenköpfe beim Scrollen stehen lassen. Abschnittsname in der Zwischenzeile mitlaufen lassen. Die stehende Spalte darf keine Zahl anschneiden.
- **Verifikation:** Bei 1440×900 ohne horizontales Scrollen sind Bezeichnung, Status und Stärke jeder sichtbaren Zeile lesbar. Nach Scrollen bis „Gr Wasserrettung“ sind Ist-Stärke und Spaltenköpfe sichtbar. Nach Scrollen nach rechts trägt jede Zwischenzeile ihren Abschnittsnamen.

### P1-2 — „Was ist fällig, was ist offen?“ hat keinen Überblick

- **Fundstelle / Aufgabe:** Lage (Filterzeile, Kopfband), Spaltengruppe Ressourcen, Reiter Eingang › Anforderungen. Aufnahmen `16-verfuegbar-bis.png`, `06-spalten.png`, `11-anforderungen.png`. Code: `packages/domaene/src/projektion/abloesung.ts:86-104` (`verfuegbarkeitsmarke`), `apps/desktop/src/renderer/Reiterzeile.tsx:25-40` (Zähler nur für offene Meldungen des Eingangskorbs).
- **Beobachtung [beobachtet, Code]:** Ich habe für BGr 2 Oldenburg „Verfügbar bis 05.11.2026 23:30“ eingetragen (jetzt 20:48). Die Zelle zeigt „läuft ab“, aber nur, wenn ich unter „Spalten“ die Gruppe Ressourcen einschalte. Sie ist dann die 15. Spalte. Die Bezeichnung trägt keine Marke, die Filterzeile hat keinen Knopf „läuft ab“, das Kopfband keinen Zähler. Ohne Ressourcen-Gruppe ist die Frist unsichtbar. Anders die Ablösungsmarke, die an der Bezeichnung steht (gut).
  - Offene und zugesagte Anforderungen (ANF-2026-001 offen, -002 zugesagt) erscheinen nur unter Eingang › Anforderungen. Der Reiter „Eingang“ zählt nur Meldungen des Eingangskorbs.
- **Erwartung der Rolle:** Eine Stelle im Lagebild, die sagt: „Ablösung fällig: 1 · Anforderungen offen: 1, zugesagt: 1“, anklickbar zur Liste. Marke „läuft ab“ an der Bezeichnung wie bei „Ablösung angefordert“.
- **Auswirkung im Einsatz:** Ablösungen werden zu spät angestoßen, weil die Frist in einer ausgeblendeten Spalte steht. Der S3 führt die Fristen wieder auf Papier. Eine Anforderung, auf die seit Stunden keine Zusage kam, fällt im Lagebild nicht auf.
- **Empfehlung:** „läuft ab / abgelaufen“ als Marke an der Bezeichnung und als Filterknopf mit Zahl in der Filterzeile. Offene/zugesagte Anforderungen als Zahl am Reiter „Eingang“ oder im Kopfband. „Verfügbar bis“ optional in die Standardsicht.
- **Verifikation:** Einheit mit „Verfügbar bis“ in 3 h führt in der Standardsicht zur Marke an der Bezeichnung und zu „läuft ab 1“ in der Filterzeile; ein Klick zeigt genau diese Einheit. Am Reiter „Eingang“ steht die Zahl offener Anforderungen.

### P2-3 — „⚠ 8 Konflikthinweise“ führt zu keiner Stelle

- **Fundstelle / Aufgabe:** Statuszeile, Klick auf „8 Konflikthinweise“; Diagnose. Aufnahmen `08-konflikte.png`, `13-diagnose.png`. Code: `apps/desktop/src/renderer/Statuszeile.tsx:120-122`, `packages/domaene/src/fold.ts:1172, 1331, 1347, 1411, 1433, 1534` (Hinweisarten wie unbekannter Wert, Zyklus, reservierte Id, Fremdreferenz, nicht nur Feldkonflikte), `packages/domaene/src/projektion/tabelle.ts:357` (⚠ nur für Hinweise auf Einheitenfelder).
- **Beobachtung [beobachtet, Code]:** Die Zahl ist jetzt anklickbar und klappt eine Erklärung auf: „Betroffene Felder tragen in der Tabelle ein ⚠“. In der Tabelle fand ich **0** Marken, auch mit allen sechs Spaltengruppen (`[aria-label=Konflikthinweis]`: 0). Die Diagnose nennt nur „Konflikthinweise: 8“ und rät: „Den Hinweis lesen: Er nennt Feld, Gewinner und verdrängten Wert.“ Eine Stelle, an der man einen Hinweis lesen kann, gibt es nicht. [Annahme] Die 8 Hinweise betreffen Abschnitte, Anforderungen oder Dienstposten, die die Einheitentabelle nicht zeigt.
- **Erwartung der Rolle:** Klick auf die Zahl zeigt die Liste mit Feld, Einheit oder Abschnitt, angezeigtem und verdrängtem Wert, von dort ein Sprung zur Stelle.
- **Auswirkung im Einsatz:** Acht Werte sind möglicherweise strittig, und ich kann sie nicht klären, obwohl die Software das als Aufgabe des Menschen beschreibt. Nach ein paar Schichten ignoriert jeder die Zahl, auch wenn sie einmal wichtig wäre.
- **Empfehlung:** Hinweisliste in Diagnose oder Statuszeile mit Ort und Werten. Die Erklärung nur dann auf das ⚠ verweisen lassen, wenn es eines gibt. Hinweise, die keine fachliche Klärung brauchen, nicht als „Konflikt“ zählen.
- **Verifikation:** Klick auf „8 Konflikthinweise“ nennt acht konkrete Stellen; jede ist anspringbar oder als „nicht fachlich“ beschriftet.

### P2-4 — Dieselbe Lage, mehrere Zahlen und eine Beschriftung, die nicht stimmt

- **Fundstelle / Aufgabe:** Kopfband und „Regel“ (`02b-regel.png`), Abschnittsbaum, Druck-HTML (`32-druck.png`), Kosten (`70-Kosten.png`), Versorgung (`60-Versorgung.png`), Führungsstelle (`20-Führungsstelle.png`), Filterzeile. Code: `packages/domaene/src/kennzahlen.ts:130-145` (`STATUS_ERWARTET` enthält Rufbereitschaft und Einsatzvorbehalt), `:200-203` (`erwartetText` druckt fest „(angefordert/Anmarsch/Eingang)“).
- **Beobachtung [beobachtet, Code]:**
  - Kopfband: „+63 erwartet (angefordert/Anmarsch/Eingang)“. Darin stecken 15 Kräfte des SanZ in **Rufbereitschaft** und 6 der FGr Notversorgung mit **Einsatzvorbehalt** (Baum: „Bereitstellungsraum Hafen +15 erwartet“, „EA Deich Nord +6 erwartet“). Die Regel-Erklärung nennt Rufbereitschaft, aber nicht Einsatzvorbehalt; die Klammer nennt keines von beiden.
  - „3 beendet“ im Kopfband sind Kräfte (Trupp Aufklärung 0/1/2), gelesen wird es als drei Einheiten.
  - EA Deich Nord: Baum und Harke „2/10/65 +6 erwartet“ (mit UA Deichfuß, Teilbaum), Druck „1/6/32 = 39“ (Eigenstärke) ohne Hinweis, dass UA Deichfuß 38 dazukommt (Befund P2-6 vom 29.10., unverändert).
  - Kosten summiert 293 Kräfte (mit Anmarsch und Rückmarsch), Kopfband 264, Versorgung zählt Rufbereitschaft voll und Anmarsch getrennt. Jede Ansicht erklärt ihre Grundlage in einer Fußzeile, aber keine sagt, wie sie zur Ist-Stärke steht.
  - Führungsstelle: Dienstposten ergeben 2/6/4 = 12, die Lage führt die FüSt mit 3/5/2 = 10 (unverändert).
  - Die Filterzeile zählt Einheiten („Einsatz 25“), die Kräfte stehen nur im Tooltip („Stärke 173“).
- **Erwartung der Rolle:** Die Klammer hinter „erwartet“ nennt alles, was darin steckt. Wo eine Ansicht anders zählt, steht die Brücke zur Ist-Stärke dabei („293 = 264 Ist + 29 …“). Eine FüSt-Stärke.
- **Auswirkung im Einsatz:** In der Lagebesprechung wird „63 angefordert“ vorgetragen, obwohl 21 davon eigene Kräfte in Bereitschaft oder unter Vorbehalt sind. Die Abrechnung meldet 293, die Lage 264. Jede Abweichung muss mündlich erklärt werden, und genau das soll die Übergabe vermeiden.
- **Empfehlung:** Beschriftung aus derselben Statusliste erzeugen wie die Zählung („erwartet: angefordert, Anmarsch, Rufbereitschaft, Einsatzvorbehalt, Eingang“). „3 Kräfte beendet“. Im Druck je Abschnitt mit Unterabschnitten die Teilbaumsumme ausweisen. Kosten und Versorgung mit einer Zeile „Abweichung zur Ist-Stärke“. Kräfte je Status in der Filterzeile sichtbar.
- **Verifikation:** Kopfband-Klammer und Regel nennen dieselben fünf Gründe wie `STATUS_ERWARTET`. Druck und Baum nennen für EA Deich Nord dieselbe Teilbaumzahl oder beschriften den Unterschied. Kosten nennt „293 = 264 + …“.

### P2-5 — Herkunft einer Änderung: Jeder Arbeitsplatz heißt „Arbeitsplatz“

- **Fundstelle / Aufgabe:** Einsatzauswahl „Dieser Arbeitsplatz · Anzeigename“ (`01-auswahl.png`, `02-profil.png`), Tagebuch Spalten Akteur/Rechner (`41-tagebuch-suche.png`), Diagnose › Arbeitsplätze (`13-diagnose.png`).
- **Beobachtung [beobachtet]:** Ich konnte den Einsatz öffnen, ohne einen Namen zu vergeben. Meine Einträge stehen im Tagebuch als „Arbeitsplatz · vm“. Die Diagnose listet fünf weitere Arbeitsplätze, alle „Arbeitsplatz · vm · 0.0.0-review“. [Annahme] In der Web-Schale teilen sich alle Browser den Rechnernamen; in der Desktop-Fassung unterscheidet wenigstens der Rechner.
- **Erwartung der Rolle:** Beim ersten Öffnen eine Frage „Wer sitzt hier? (z. B. S1 Lage, Meier)“, im Tagebuch eine eindeutige Herkunft.
- **Auswirkung im Einsatz:** „Wer hat den Status von GTr Wassergefahren auf Einsatz gesetzt?“ lässt sich nicht beantworten. Rückfragen bei der meldenden Stelle sind nicht möglich, die Nachvollziehbarkeit für die Einsatzakte fehlt.
- **Empfehlung:** Anzeigename beim ersten Öffnen eines Einsatzes verlangen oder deutlich anmahnen. Solange er fehlt, Statuszeile „Ohne Namen — Einträge nicht zuzuordnen“.
- **Verifikation:** Neuer Arbeitsplatz öffnet einen Einsatz → Namensabfrage; Tagebuch zeigt den Namen; die Diagnose unterscheidet zwei Browser am selben Rechner.

### P2-6 — Tagebuch taugt für die Übergabe nur mit Suche

- **Fundstelle / Aufgabe:** Einsatztagebuch (`40-Einsatztagebuch.png`, `41-tagebuch-suche.png`), Tagebuch-HTML.
- **Beobachtung [beobachtet]:** Die Filter-Vorbelegung vom 29.10. ist weg, und es gibt „vorher → nachher“ (Verbesserung). Beim Öffnen stehen oben aber ~30 Zeilen „Dienstposten angelegt / besetzt / Schichtplan geändert“. Statuswechsel, Anforderungen und Stärken muss ich über die Freitextsuche finden. Es gibt keinen Filter nach Art des Vorgangs (Status, Stärke, Anforderung, Notiz). Mein Eintrag „Verfügbar bis“ steht als „Zeitpunkt gesetzt (Verfügbarkeit): (leer) → **2026-11-05T23:30:00.000Z**“ (ISO, UTC). In der Spalte „Zeit der Meldung“ steht dazu „05.11. 23:30:00“, also der eingetragene Wert in der Zukunft, nicht der Zeitpunkt einer Meldung. Die Zelltooltips der Lage zeigen ebenfalls rohe ISO-Zeiten („2026-11-05T20:35:26.459Z“).
- **Erwartung der Rolle:** Für die Übergabe: „Was hat sich in der letzten Schicht an Lage geändert?“ mit einem Klick, ohne Aufbau-Rauschen. Zeiten durchgehend in einer Schreibweise (TT.MM. HH:MM oder DTG).
- **Auswirkung im Einsatz:** Der Ablöser liest Dienstpostenpflege statt Lageänderungen. Eine Zeitangabe in UTC mit „Z“ wird um eine oder zwei Stunden falsch gelesen. Eine „Zeit der Meldung“ in der Zukunft verwirrt beim Nachvollziehen.
- **Empfehlung:** Filterknöpfe nach Vorgangsart (wie Filterzeile der Lage), voreingestellt „Lage“ (Status, Stärke, Abschnitt, Anforderung, Notiz). Zeitwerte im Vorgangstext wie in der Tabelle formatieren. „Zeit der Meldung“ nur für echte Meldezeiten.
- **Verifikation:** Tagebuch mit Filter „Lage“ zeigt Statuswechsel und Anforderungen ohne Dienstposten. Der Eintrag „Verfügbar bis“ lautet „→ 05.11.2026 23:30“.

### P2-7 — Unverändert bestätigte Stärkezelle schreibt trotzdem ein Ereignis

- **Fundstelle / Aufgabe:** Lage, Doppelklick in „Fü / UFü / He“ bei „Rettungsdienst Vorhaltung“ (0/1/1), Enter ohne Änderung. Code: `apps/desktop/src/renderer/useZellbearbeitung.ts:93-99` (gewollt: „Nichts geändert, nichts geschrieben“, Vergleich per `JSON.stringify(neu) === JSON.stringify(zelle.wert)`), `apps/desktop/src/kontrakt/bedienschritte.ts:84, 99` (`staerkeAusEingabe`), `packages/domaene/src/projektion/tabelle.ts:396` (`wert: einheit.staerke.wert`).
- **Beobachtung [beobachtet]:** Statuszeile „✓ Stärke der Einheit ‚Rettungsdienst Vorhaltung‘ geändert · gespeichert“, Rückgängig aktiv, Tagebuch „Stärke geändert: **0/1/1 → 0/1/1**“. Reproduziert bei „BGr Teilbar — Trupp“ (0/0/3 → 0/0/3). Die Summen bleiben richtig, der Schaden vom 29.10. tritt nicht mehr auf. [Annahme zur Ursache] Das Tripel aus der Eingabe und der gespeicherte Wert unterscheiden sich in der Schlüsselreihenfolge oder in Zusatzfeldern, sodass der Textvergleich nie gleich ergibt.
- **Erwartung der Rolle:** Nachsehen ist kein Ändern; der Code-Kommentar sagt dasselbe.
- **Auswirkung im Einsatz:** Jedes „nur mal reinschauen“ erzeugt einen Tagebucheintrag „Stärke geändert“ und laut Code-Kommentar beim zweiten Arbeitsplatz einen Konfliktkandidaten ohne fachlichen Anlass. Das Tagebuch füllt sich mit Scheinänderungen, die Konfliktzahl (P2-3) wächst.
- **Empfehlung:** Stärke inhaltlich vergleichen (drei Zahlen), nicht als Text. Regressionstest für Enter ohne Änderung in der Stärkezelle.
- **Verifikation:** Doppelklick und Enter in einer Stärkezelle ändern nichts: kein Tagebucheintrag, Rückgängig bleibt „nichts zurückzunehmen“.

### P2-8 — Harke zeigt die TEL als Geschwister der EAL (unverändert)

- **Fundstelle / Aufgabe:** Führungsstelle › Führungsorganisation, Kurzform (`21-fuehrungsorganisation.png`).
- **Beobachtung [beobachtet]:** TEL „FüSt Oldenburg“ steht in einer Reihe mit den vier EAL, ohne Querbalken darüber. Nur die UEAL hängt sichtbar unter EA Deich Nord. Die Abschnittsnamen stehen klein unter großen Kürzeln. „EA Reserve 0 Einh.“ wird mitgezeichnet.
- **Erwartung der Rolle [Annahme]:** Führungsstelle oben, Einsatzabschnitte darunter; der Name ist, was man aus zwei Metern liest.
- **Auswirkung im Einsatz:** Als PDF an der Lagekarte wird die Struktur falsch gelesen (TEL als fünfter Abschnitt).
- **Empfehlung:** Wie am 29.10.: TEL als Wurzel, Namen größer, leere Abschnitte optional ausblenden.
- **Verifikation:** „Als PDF (Lagekarte)“ zeigt die TEL über den EAL.

### P3-9 — Kleinigkeiten, die Zeit kosten

- Stärke-Monitor (`81-monitor.png`) zeigt nur „14/50/210 = 274“; „+58 erwartet“ fehlt. An der Wand fehlt so die zweite Zahl, nach der in der Besprechung gefragt wird. [beobachtet]
- Abschnittsbaum schneidet Namen ab: „Bereitstellun…“, „EA Pumpwerk …“, „Angefordert / A…“, „Einsatz be…“. [beobachtet]
- „Eingetroffen …“ (`19-eingetroffen-maske.png`): Herkunft wird mit der **zusagenden** Stelle „THW RB Oldenburg“ vorbelegt statt mit dem OV der Einheit. Die Schicht wird nicht abgefragt, das Status-HTML meldet danach „Ohne Pflichtangabe: FGr N THW OV Jever“. Die drei Optionsknöpfe stehen gequetscht über zwei Zeilen. [beobachtet]
- Einsatzauswahl zeigt für einen Arbeitsplatz, der den Einsatz noch nicht geöffnet hatte, „Status — · — Einh.“: Vor dem Öffnen sehe ich nichts über die Lage. [beobachtet]
- Filterknopf „Anmarsch“ verschwindet bei 0 Einheiten. „Niemand im Anmarsch“ und „gibt es nicht“ sehen gleich aus. [beobachtet]
- Druck: Spalte „Probe o.k.“ belegt weiter Platz (Befund vom 29.10.). [beobachtet]
- Summenzeile der Tabelle: „Ist-Stärke gesamt · 33 Einh.“ neben „Einheiten 40“ und „Alle erfassten Einheiten 39 Einh.“, drei Einheitenzahlen in einer Zeile. [beobachtet]

---

## Zahlenprobe (Stand 20:41 Uhr, vor meinen Änderungen)

| Stelle | Zahl | Grundlage |
|---|---|---|
| Kopfband / Monitor / Druck „Gesamt (Ist-Stärke)“ | 14/48/202 // 264 | Ist: vor Ort, mit Ruhe und Nicht einsatzbereit |
| Kopfband „erwartet“ | +63 | Angefordert-Bereich 37 + Rufbereitschaft 15 + Einsatzvorbehalt 6 + Anmarsch 5 |
| Kopfband „beendet“ | 3 | Kräfte im Rückmarsch |
| Tabelle „Alle erfassten Einheiten“ | 16/58/253 = 327 | Ist + erwartet |
| Status-HTML Organisation/Status | 327 (nach Änderungen 332) | Ist + erwartet |
| Kosten | 293 | ohne Angefordert-Bereich, mit Anmarsch und Rückmarsch |
| Filterzeile | 40 Einheiten | Einheiten, nicht Kräfte |
| FüSt Lage / Dienstposten | 10 / 12 | zwei Datenquellen |

Nach Statuswechsel GTr (5 Kräfte): 269 / +58, nach „Eingetroffen“ ANF-002 (+5): 274. Rechnerisch stimmig und jetzt erklärt; die Beschriftung von „erwartet“ ist unvollständig (P2-4).

## Seit 29.10. behoben oder deutlich besser

P0-1 Stärkezelle schreibt Text (behoben; Rest siehe P2-7) · P1-2 Ablösung an der Einheit, „Eingetroffen“ legt die Einheit an · P1-4 Ist/erwartet/beendet getrennt und erklärt · P1-5 teilweise: Status steht vorn, „ORTSVERBAND“ und `NUR_STAERKE` sind weg · P2-8 Tagebuch ohne Vorbelegung, mit vorher → nachher · P2-10 „Stand“ ohne falsche Uhrabweichung · P3-11 Monitor in der Web-Schale sichtbar · Ausgaben mit Öffnen/Drucken.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen. Stärke, Status und Ablösungen sind ablesbar; Stärke je Zeile nur nach Seitwärts-Scroll, Fristen nur über eine ausgeblendete Spaltengruppe.
- **Fremde Hilfe nötig:** nein für die Lage; ja, um die acht Konflikthinweise zu finden.
- **Größtes Missverständnis:** „+63 erwartet (angefordert/Anmarsch/Eingang)“ wird als 63 fremde, angeforderte Kräfte vorgetragen, obwohl 21 davon eigene Kräfte in Rufbereitschaft oder unter Einsatzvorbehalt sind.
- **Größtes Einsatzrisiko:** Eine ablaufende Verfügbarkeit fällt in der Standardsicht nicht auf, weil „läuft ab“ nur in der ausgeschalteten 15. Spalte steht. Die Ablösung kommt dann zu spät.
- **Top-Priorität für die nächste Iteration:** Die Lage-Tabelle so ordnen und fixieren, dass Bezeichnung, Status, Stärke und eine Marke „läuft ab / Ablösung“ bei 1440 px in einem Bild stehen und Kopfband sowie Spaltenköpfe beim Scrollen sichtbar bleiben; dazu ein Filterknopf „läuft ab (n)“.
