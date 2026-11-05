# THW-Rollen-Audit S3 (Einsatz) — S1-Control v2

**Datum:** 05.11.2026
**Rolle:** Sachgebietsleiter S3 (Einsatz) einer THW-Führungsstelle, Perspektive nach Skill `thw-s3-einsatz-reviewer`
**Material:** laufende Web-Schale (Stand `a96060e`, UX-Schnitte bis `ffc3125`), eigene Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten) unter http://127.0.0.1:8214, Arbeitsplatz „S3 Einsatz“, Profil „Führungsstelle (S1)“ (ein Profil S3 gibt es nicht, siehe P3-1); 45 Screenshots unter `scratchpad/shots/s3/` (1600 × 1000, Faktor 1, Nummern unten als `s3-NN`); erzeugte Ausgaben „Anforderungen als HTML“ und „Einheitenliste als HTML“ im Share der Kopie unter `ausgaben/`; Ereignisdatei des Arbeitsplatzes im Share; Quelltext nur lesend; Handbuch, Kurzanleitung; Vorgänger-Audits `docs/audits/v2-2026-10-29/`.
**Kennzeichnung:** **[beobachtet]** an der laufenden Anwendung gesehen · **[Code]** aus dem Quelltext belegt · **[Annahme]** Ablauf- oder Rollenannahme · **[nicht prüfbar]** mit diesem Material nicht zu klären.

Durchgeführte Prüfaufgaben:

1. „TZ THW Bereitstellung“ (Bereitstellungsraum Hafen) Auftrag „Deichverteidigung km 3–4, Sandsackverbau“ erfasst, nach „EA Deich Nord“ verschoben, Status „Einsatz“ gesetzt.
2. Anforderung ANF-2026-005 („FGr Räumen THW OV Westerstede“, Auftrag „Radlader und Sandsackfüllung Deich Nord, km 4“) angelegt, Zusage 23:30 von „THW RB Oldenburg / LuK“ erfasst, Eintreffen mit „Einheit aus der Anforderung anlegen“ in den Bereitstellungsraum.
3. Verfügbare Kräfte mit Fähigkeit gesucht: Statusfilter Einsatzbereit + Rufbereitschaft, Suche „Pumpe“, „Räumen“, „Wasserschaden“, „Radlader“, „Deich“, Kennzeichen eines eigens erfassten MTW.
4. „EA Pumpwerk Süd“ (6 Einheiten) aufgelöst nach „EA Reserve“, Rückweg gesucht; „UA Deichfuß“ von „EA Deich Nord“ unter „EA Schule Mitte“ umgehängt; Führungsorganisation geprüft.
5. Auftrag von Aufgabe 1 als erledigt zurückgemeldet und gesucht, wo das sichtbar wird (Tabelle, Untertabelle, Tagebuch gesamt und je Einheit, Einheitenliste, Statuszeile).

---

## Urteil

Die Grundbausteine der S3-Arbeit sind seit dem 29.10. da: Ein Auftrag lässt sich an einer Einheit erfassen und als erledigt setzen, eine Anforderung läuft von „Offen“ über „Zugesagt“ bis „Eingetroffen“ und legt dabei die Einheit samt Auftrag an, Verschieben, Auflösen und Umhängen sind sauber gesperrte Masken mit Pflichtziel. Die Ablösungsspalten N–S der Excel stehen in der Tabelle, und „Ablösung angefordert/zugesagt“ steht als Marke an der Bezeichnung.

Reibung entsteht genau bei den Fragen, die der S3 ständig stellt: **Welche Aufträge sind offen?** Es gibt keine Auftragsliste; der Auftrag ist ein Text in der rechten, abgeschnittenen Tabellenspalte, „erledigt“ erkennt man nur an einer Endzeit, und der Ort im Auftrag ist der Ort bei der Erfassung, nicht der Einsatzort. **Wer ist frei?** „Einsatzbereit“ zeigt auch Einheiten mit laufendem Auftrag, eine Fähigkeit lässt sich nur über den Namen suchen, und die Suche findet weder Ort noch Kennzeichen, obwohl ihr Platzhalter beides verspricht. **Was kommt?** Eine zugesagte Anforderung ist bis zum Eintreffen in der Lage unsichtbar und zählt nicht in „erwartet“; die drei Einheiten im Bereich „Angefordert / Anmarsch“ sind von den Anforderungen getrennt. Dazu treibt normale S3-Arbeit den Zähler „Konflikthinweise“ hoch (Auflösen +7, Auftrag erledigt +1), und die Diagnose zeigt nur die Zahl.

**Ohne Nebenaufzeichnung schafft die Rolle ihre Aufgabe nicht:** Die Auftragsübersicht (offen/erledigt je Abschnitt) und die Liste „zugesagt, im Anmarsch, voraussichtlich ab“ führt der S3 weiter auf Papier oder Tafel.

---

## Findings

### P1-1 · Keine Übersicht offener und erledigter Aufträge; Auftragsstand nur aus einer Endzeit ablesbar

- **Fundstelle / Aufgabe:** Aufgaben 1 und 5. Lage → Spalte „Aufträge“ (s3-43), Untertabelle „Aufträge“ (s3-08, s3-13), Ausgaben (s3-40). `packages/domaene/src/kennzahlen.ts:411-423` (`auftragsText`: „von–bis; Ort; Text“, ein erledigter Auftrag bleibt in der Spalte), `apps/desktop/src/renderer/UntertabellenAktionen.tsx:4-8`.
- **Beobachtung [beobachtet]:** Ein Auftrag hat zwei Zustände: ohne Ende („05.11.2026 20:46–; …“) und mit Ende („05.11.2026 20:46–05.11.2026 20:47; …“). „Angenommen“ oder „in Arbeit“ gibt es nicht. Es gibt keine Liste aller Aufträge, keinen Filter „offener Auftrag“ und keine Ausgabe „Aufträge“; die Suche durchsucht den Auftragstext nicht („Radlader“ → kein Treffer, `packages/domaene/src/projektion/tabelle.ts:555-561` [Code]). In der Tabelle steht die Spalte bei 1600 px Breite am rechten Rand, sichtbar ist nur „05.11.2026 20:46–05.11“ — der eigentliche Auftragstext beginnt erst nach Zeitspanne und Ort (s3-43). Die Einheitenliste (HTML) druckt denselben Mischtext.
- **Erwartung der Rolle:** Eine Auftragstafel: je Auftrag Einheit, Abschnitt, erteilt um, Stand (erteilt / angenommen / erledigt), offen oben. Mit einem Blick sehen, welcher Abschnitt noch offene Aufträge hat.
- **Auswirkung im Einsatz:** Wer wissen will, was offen ist, liest 41 Zeilen Fließtext quer und vergleicht Endzeiten. Ein vergessener offener Auftrag fällt nicht auf; nach Schichtwechsel ist der Auftragsstand nur über das Tagebuch rekonstruierbar. Der S3 führt die Auftragsliste deshalb weiter auf Papier.
- **Empfehlung:** Eine Auftragsansicht (Blatt oder Umschalter) mit Zustand als eigener Spalte und Filter „offen / erledigt“, Spalte Abschnitt und Einheit; in der Einheitentabelle den Auftragstext zuerst, die Zeit danach; „erledigt“ als Wort oder Marke, nicht nur als Endzeit. Ob ein Zwischenzustand „angenommen“ gebraucht wird, mit Anwendern klären **[Annahme]**.
- **Verifikation:** Fünf Aufträge an drei Abschnitten, zwei erledigt: In unter 10 Sekunden die drei offenen nennen, ohne horizontal zu scrollen; derselbe Stand auf Papier.

### P1-2 · Der Ort im Auftrag ist der Standort bei der Erfassung — nach dem Verschieben steht der falsche Ort im Auftrag

- **Fundstelle / Aufgabe:** Aufgabe 1. Maske „Auftrag erfassen“ (s3-07), Zeile nach Verschieben (s3-10), Einheitenliste. `apps/desktop/src/renderer/UntertabellenErfassung.tsx:76-131` (Ort = `abschnittId` der Zeile, kein Feld), `apps/desktop/src/renderer/Untertabellen.tsx:85-91`.
- **Beobachtung [beobachtet]:** Die Maske hat nur „Auftrag“ und „Beginn“ und zeigt darunter „Ort: Bereitstellungsraum Hafen“ — den aktuellen Bereich der Einheit. Nach „Verschieben → EA Deich Nord“ steht im Auftrag weiter „…; Bereitstellungsraum Hafen; Deichverteidigung km 3–4“, in der Tabelle wie in der gedruckten Einheitenliste. Die Verschieben-Maske fragt nur das Ziel und berührt Aufträge nicht (s3-09). Bei der aus der Anforderung angelegten Einheit fehlt der Ort ganz.
- **Erwartung der Rolle:** Der S3 erteilt den Auftrag in der Regel im Bereitstellungsraum für einen Einsatzabschnitt **[Annahme]**. Der Ort des Auftrags ist das Ziel, nicht der Abmarschort. Erwartet: Abschnittswahl in der Auftragsmaske, oder „Auftrag erteilen“ und „Verschieben“ als ein Schritt.
- **Auswirkung im Einsatz:** Auf Tabelle und Ausdruck steht eine Einheit, die längst am Deich arbeitet, mit Auftragsort „Bereitstellungsraum Hafen“. Wer den Ausdruck liest (Lagebesprechung, Ablösung), schickt Nachfragen oder Kräfte an den falschen Ort.
- **Empfehlung:** Ort (Abschnitt) als wählbares Feld der Auftragsmaske, vorbelegt mit dem Bereich, aber änderbar; beim Verschieben anbieten, den offenen Auftrag mitzunehmen oder zu beenden. Einen Weg „Auftrag erteilen und in Abschnitt verschieben“ in einem Schritt.
- **Verifikation:** Einheit im Bereitstellungsraum, Auftrag für EA Deich Nord erfassen und verschieben: Tabelle, Einheitenliste und Tagebuch nennen EA Deich Nord als Ort.

### P1-3 · Freie Kräfte mit einer Fähigkeit sind nicht findbar

- **Fundstelle / Aufgabe:** Aufgabe 3. Filterzeile und Suche der Einheitenkarte (s3-27, s3-28). `packages/domaene/src/projektion/tabelle.ts:546-565` (Suche nur in Bezeichnung, Organisation, Organisationsname, FüSt-Kennung, Herkunft).
- **Beobachtung [beobachtet]:** Der Filter „Einsatzbereit“ zeigt 5 Einheiten, darunter „FGr Räumen THW OV Westerstede“ mit laufendem Auftrag und „AB HFS Bereitschaft“ im Einsatzabschnitt — gebunden und frei sehen gleich aus. „Ruhe“ im Bereitstellungsraum (Pioniermaschinenzug) gehört nicht dazu. Eine Fähigkeit, Fachgruppe oder Ausstattung gibt es als Spalte nicht; die Suche trifft nur über den Namen: „Pumpe“ findet „FGr Wasserschaden/Pumpen“, aber nicht „FGr Wasserschaden“; „Radlader“ findet nichts, obwohl er im Auftrag steht. Der Platzhalter verspricht „Einheit, Organisation, Ort, Kennzeichen …“: „THW-84123“ (eigens am TZ erfasstes Fahrzeug) findet nichts, „Deich“ findet nur „ZTr THW Deich“, nicht die neun Einheiten in EA Deich Nord. Die Spalte „Geräte / Fahrzeuge“ zeigt nur den Typ („MTW“), nicht das Kennzeichen.
- **Erwartung der Rolle:** „Alle verfügbaren Kräfte mit Pumpenleistung / Räumgerät“ in einem Schritt: Status verfügbar **und** kein offener Auftrag, filterbar nach Fachgruppe oder Gerät, mit Stärke.
- **Auswirkung im Einsatz:** Der S3 sucht Kräfte aus dem Gedächtnis oder einer eigenen Liste. Eine Einheit mit Auftrag wird als frei eingeplant und doppelt beauftragt; eine passende Fachgruppe mit untypischem Namen wird übersehen.
- **Empfehlung:** Eine Sicht „verfügbar“ (Bereitstellung/Reserve und einsatzbereit ohne offenen Auftrag) als eigener Filter; Fachgruppe/Vorlage und Fahrzeuge (Typ, Kennzeichen) in die Suche, oder ein Fähigkeitsfeld aus der Vorlage; Platzhalter nur versprechen, was die Suche kann.
- **Verifikation:** Frage „freie Kräfte mit Pumpe“ an der Prüflage in unter 20 Sekunden beantworten; Einheiten mit offenem Auftrag fehlen im Ergebnis; Kennzeichen-Suche trifft.

### P1-4 · Zwischen Zusage und Eintreffen ist die Kraft in der Lage unsichtbar; Anforderungen und „Angefordert / Anmarsch“ sind zwei Listen

- **Fundstelle / Aufgabe:** Aufgabe 2. Eingang → Anforderungen (s3-17, s3-19, s3-21, s3-24), Kopfband, Bereich „Angefordert / Anmarsch“ (s3-03).
- **Beobachtung [beobachtet]:** Nach der Zusage (23:30) bleibt das Kopfband bei „+63 erwartet“; die zugesagte FGr steht weder in der Lage noch im Baum. Erst „Eingetroffen …“ legt die Einheit an. Umgekehrt stehen im Bereich „Angefordert / Anmarsch“ drei Einheiten („FGr Räumen B (angefordert)“, „LZ FW (angefordert)“, „Bergwacht (angefordert)“), zu denen es keine Anforderung gibt; ANF-2026-002 „Zugesagt“ hat keine Einheit im Anmarsch. Die Anforderungsmaske kennt nur Kennung, Ablösung für, vorgesehene Einheit (Freitext) und vorgesehenen Auftrag (s3-18) — nicht, bei wem angefordert wurde, welche Stärke oder Fähigkeit gebraucht wird, wohin die Kräfte kommen sollen und ab wann. Die Spalte „Angefordert“ ist eine Uhrzeit.
- **Erwartung der Rolle:** Eine Anforderung an die übergeordnete Stelle ist eine Kette: angefordert (was, wie viel, wohin, bis wann, bei wem) → zugesagt (welche Einheit, wann) → im Anmarsch → eingetroffen. Was zugesagt ist, zählt in „erwartet“ und steht an ihrem Zielort als „im Anmarsch“.
- **Auswirkung im Einsatz:** Der S3 gleicht zwei Listen selbst ab und weiß nicht verlässlich, was kommt. Eine zugesagte Kraft wird ein zweites Mal angefordert oder bei der Planung vergessen; eine „angefordert“-Einheit ohne Anforderung wird nie nachverfolgt.
- **Empfehlung:** Mit der Zusage optional die Einheit im Bereich „Angefordert / Anmarsch“ anlegen oder verknüpfen (der Verknüpfen-Weg existiert schon beim Eintreffen); Einheiten im Anmarsch ohne Anforderung sichtbar markieren; Anforderungsmaske um „angefordert bei“, Stärke/Fähigkeit, Zielabschnitt und „benötigt ab“ ergänzen.
- **Verifikation:** Anforderung anlegen und zusagen: „erwartet“ im Kopfband steigt um die zugesagte Stärke, die Einheit steht im Anmarsch mit Anforderungsnummer; eine Einheit im Anmarsch ohne Anforderung trägt eine Marke.

### P1-5 · Regulärer S3-Betrieb erzeugt „Konflikthinweise“, die niemand lesen kann

- **Fundstelle / Aufgabe:** Aufgaben 4 und 5. Statuszeile, Diagnose (s3-16). `packages/domaene/src/fold.ts:966-977` (`auftrag.bis` als Planzeit), `:1010-1016` (Planzeit vor der Wanduhr = „unplausibel“), `:1667-1681` (Hinweis je Einheit eines aufgelösten Abschnitts), `apps/desktop/src/renderer/Diagnose.tsx:174`.
- **Beobachtung [beobachtet]:** „Auftrag erledigt“ mit vorbelegtem „jetzt“ (minutengenau, also Sekunden vor der Wanduhr) hob den Zähler von 8 auf 9; das Auflösen von „EA Pumpwerk Süd“ mit sechs Einheiten von 9 auf 16. Die Diagnose zeigt nur „Konflikthinweise: 16“, keine Liste mit Feld, Gewinner und verdrängtem Wert — obwohl Kurzanleitung und Störfall „Zwei Arbeitsplätze haben dasselbe Feld geändert“ sagen: „Den Hinweis lesen: Er nennt Feld, Gewinner und verdrängten Wert.“ Ein nachträglich gemeldetes Auftragsende („16:00“ für vorhin) erzeugt nach derselben Regel immer einen Hinweis **[Code]**.
- **Erwartung der Rolle:** Ein Warnzeichen in der Statuszeile heißt: Hier haben zwei Plätze gegeneinander geschrieben, bitte klären. Normale Handgriffe der eigenen Rolle lösen es nicht aus.
- **Auswirkung im Einsatz:** Nach einer Stunde S3-Arbeit steht „⚠ 30 Konflikthinweise“ unten, und keiner schaut mehr hin. Der eine echte Konflikt (zwei Plätze haben dieselbe Einheit unterschiedlich verschoben) geht unter — genau die Lage, für die der Hinweis gebaut ist.
- **Empfehlung:** Ein Auftragsende in der Vergangenheit ist eine Ist-Zeit, keine Planzeit; das planmäßige Folgen einer Auflösung ist kein Konflikt. Die Hinweise in der Diagnose (oder per Klick auf die Statuszeile) als Liste in Klartext zeigen.
- **Verifikation:** Auftrag erledigt setzen und Abschnitt auflösen: Zähler unverändert. Zwei Plätze verschieben dieselbe Einheit: Zähler +1, und die Liste nennt Einheit, beide Ziele und welches gilt.

### P1-6 · Auflösen verspricht „lässt sich wiederherstellen“ — es gibt keinen Weg zurück, und die Einheiten tragen keine Spur

- **Fundstelle / Aufgabe:** Aufgabe 4. Maske „„EA Pumpwerk Süd“ auflösen“ (s3-31), Baum mit „Aufgelöste zeigen“, Kontextmenü am aufgelösten Abschnitt (s3-33), Tagebuch je Einheit. `apps/desktop/src/renderer/Abschnittsmenue.tsx:36-60` (kein Eintrag „Wiederherstellen“; das Ereignis `AbschnittWiederhergestellt` gibt es nur als Rücknahme, `packages/domaene/src/undo.ts`).
- **Beobachtung [beobachtet]:** Die Maske ist gut (Ziel Pflicht, „Betrifft: 6 Einheit(en), Stärke 1/4/16“) und sagt: „Der Abschnitt bleibt sichtbar und lässt sich wiederherstellen.“ Am aufgelösten Abschnitt bietet das Menü Umbenennen, Typ ändern, Zeichen, Umhängen, Nach oben/unten und ein graues „Auflösen … – Schon aufgelöst“; „Wiederherstellen“ fehlt. Strg+Z hilft nur, solange die Auflösung der letzte eigene Schritt ist — nach einem Verschieben bot der Knopf nur noch „Rückgängig: Einheit ‚AB HFS Bereitschaft‘ verschoben“. Die sechs Einheiten stehen in „EA Reserve“ weiter mit Status „Einsatz“, „Rückmarsch“, „Anmarsch“. Im Tagebuch je Einheit („Im Tagebuch zeigen“ an „FGr Wasserschaden/Pumpen“) steht nur „Einheit gemeldet“ — der Wechsel in die Reserve steht allein am Abschnitt.
- **Erwartung der Rolle:** Umgliedern ist Alltag; ein Fehlgriff muss sich vollständig zurückdrehen lassen, und an jeder Einheit muss stehen, wann sie warum wohin gewechselt ist.
- **Auswirkung im Einsatz:** Ein versehentlich aufgelöster Abschnitt wird von Hand neu angelegt und jede Einheit einzeln zurückgeschoben; Aufträge und Historie hängen danach an zwei Abschnitten. Wer die Einheit später nachverfolgt, findet die Umgliederung nicht.
- **Empfehlung:** „Wiederherstellen …“ am aufgelösten Abschnitt (mit Frage, welche Einheiten zurückgehen) oder die Zusage aus der Maske streichen; den Bereichswechsel durch Auflösung als Zeile im Tagebuch jeder betroffenen Einheit; nach dem Auflösen auf Status hinweisen, die zum Ziel nicht passen („Einsatz“ in einer Reserve).
- **Verifikation:** Abschnitt auflösen, eine andere Handlung, dann wiederherstellen: Abschnitt und Einheiten stehen wieder wie vorher; „Im Tagebuch zeigen“ an einer der Einheiten zeigt Auflösung und Rückkehr.

### P2-1 · „Auftrag erfassen“ und „Auftrag erledigt“ stehen nur in den Untertabellen unter der ganzen Tabelle

- **Fundstelle / Aufgabe:** Aufgaben 1 und 5. Auswahlleiste und Kontextmenü (s3-04, s3-05), Untertabellen (s3-07, s3-13).
- **Beobachtung [beobachtet]:** Die Auswahlleiste bietet Verschieben, Aufteilen, Zusammenführen, Kopieren, Ablösung anfordern, Funk …, Entfernen; das Kontextmenü dazu „Im Tagebuch zeigen“ — kein Auftrag. Der Weg ist ein „+“ neben der Überschrift „Aufträge“ unterhalb der letzten Tabellenzeile (bei „Alle Bereiche“ rund 2 800 px tiefer, nur per Scrollen erreichbar); „erledigt“ ist ein Symbol „✓“ mit Tooltip. Weder Untertabelle noch Maske („Auftrag erfassen“, „Auftrag erledigt: …“) nennen die Einheit; nur die Auswahlleiste unten tut es.
- **Erwartung der Rolle:** „Auftrag erteilen …“ und „Auftrag erledigt …“ an derselben Stelle wie Verschieben, mit dem Namen der Einheit in der Maske.
- **Auswirkung im Einsatz:** Jeder Auftrag kostet Suchen und Scrollen; unter Zeitdruck wird er weggelassen oder in „Bemerkungen“ geschrieben. Wer zwischendurch eine andere Zeile wählt, erfasst den Auftrag an der falschen Einheit, ohne dass die Maske es zeigt.
- **Empfehlung:** Beide Schritte in Auswahlleiste und Kontextmenü; Maskentitel „Auftrag für TZ THW Bereitstellung“; die Untertabellen-Überschrift mit dem Einheitennamen.
- **Verifikation:** Erstnutzer erfasst und erledigt einen Auftrag ohne Hilfe in unter 20 Sekunden; Maske nennt die Einheit.

### P2-2 · Rückmeldung „erledigt“ fehlt im Tagebuch der Einheit

- **Fundstelle / Aufgabe:** Aufgabe 5. „Im Tagebuch zeigen“ (s3-14), Tagebuch gesamt.
- **Beobachtung [beobachtet]:** Im Gesamttagebuch steht „Deichverteidigung km 3–4, Sandsackverbau: Auftrag beendet: (leer) → 05.11.2026 20:47“ — ohne Einheit, Anzeige „Auftrag beendet“, Knopf „Erledigt“. Auf die Einheit beschränkt zeigt das Tagebuch vier Einträge (gemeldet, Auftrag erfasst, verschoben, Status) — die Erledigung fehlt. Sichtbar ist sie sonst nur als Endzeit in der Auftragszelle; die Statuszeile bestätigt sie zehn Sekunden.
- **Erwartung der Rolle:** Die Rückmeldung „Auftrag erledigt“ gehört in den Verlauf der Einheit, mit Einheit und Ort im Text.
- **Auswirkung im Einsatz:** Wer nachprüft, ob die Einheit ihren Auftrag gemeldet hat, findet es im Einheitenverlauf nicht und fragt per Funk nach.
- **Empfehlung:** Auftragsereignisse der Einheit zuordnen; Text „TZ THW Bereitstellung: Auftrag erledigt — Deichverteidigung … (20:47)“.
- **Verifikation:** Auswahl-Tagebuch der Einheit zeigt Erteilung und Erledigung.

### P2-3 · Eintreffen aus der Anforderung: Eintreffzeit fehlt an der Einheit, Herkunft ist die zusagende Stelle

- **Fundstelle / Aufgabe:** Aufgabe 2. Maske „ANF-2026-005 eingetroffen“ (s3-22, s3-23), Ressourcen-Spalten (s3-38), Einheitenliste. `apps/desktop/src/renderer/AnforderungZuEinheit.tsx:5-12` („Herkunft aus der Zusage“).
- **Beobachtung [beobachtet]:** Die Maske legt die Einheit mit Auftrag an (gut), belegt aber „Herkunft“ mit „THW RB Oldenburg / LuK“ (dem Zusagenden) und die Stärke mit 0/0/0 vor, weil die Anforderung keine Stärke kennt. Ein Feld für die Eintreffzeit fehlt. Die Anforderung trägt „Erledigt 05.11.2026 20:56“, an der neuen Einheit bleibt die Spalte „Eingetroffen“ (Excel T) leer — in der Tabelle wie in der Einheitenliste.
- **Erwartung der Rolle:** Eintreffzeit einmal erfassen (auch nachträglich), dann steht sie an Anforderung und Einheit; Herkunft ist der Ortsverband.
- **Auswirkung im Einsatz:** „Verfügbar bis“, Ablösung und Kostenabrechnung hängen an der Eintreffzeit; der S1 muss sie ein zweites Mal eintragen oder sie fehlt.
- **Empfehlung:** Eintreffzeit (vorbelegt „jetzt“) in der Maske und an die Einheit schreiben; Herkunft nicht aus „zugesagt von“ vorbelegen.
- **Verifikation:** Eintreffen mit „20:40“ nachtragen: Anforderung und Einheit zeigen 20:40, Einheitenliste ebenso.

### P2-4 · „Läuft ab“ nur in der ausgeblendeten Ressourcen-Spalte

- **Fundstelle / Aufgabe:** Prüffrage Verfügbarkeit/Ablösung. „Verfügbar bis“ an „BGr 2 Oldenburg“ auf 6.11. 06:00 gesetzt (s3-42). `apps/desktop/src/renderer/Ressourcenmarken.tsx:5-9`.
- **Beobachtung [beobachtet]:** Die Marke „läuft ab“ erscheint an der Zelle „Verfügbar bis“ — sichtbar erst nach „Spalten → Ressourcen“, das beim nächsten Öffnen wieder aus ist. „Ablösung angefordert/zugesagt“ steht dagegen an der Bezeichnung und ist immer sichtbar (s3-43). Eine Liste „Ablösung fällig in den nächsten 12 h“ gibt es nicht.
- **Erwartung der Rolle:** Was demnächst nicht mehr leisten kann, sieht der S3 ohne Spaltenwahl, so wie die Ablösungsmarke.
- **Auswirkung im Einsatz:** Eine auslaufende Einheit fällt erst auf, wenn sie sich abmeldet; die Ablösung wird zu spät angefordert.
- **Empfehlung:** „läuft ab“ / „abgelaufen“ zusätzlich an der Bezeichnung; Filter „läuft ab“ in der Filterzeile.
- **Verifikation:** Standardansicht nach Neuladen zeigt „läuft ab“ an BGr 2 ohne Spaltenwahl.

### P2-5 · Führer der Einheit und Leiter des Abschnitts sind nicht zu sehen

- **Fundstelle / Aufgabe:** Prüffrage Unterstellung. Tabelle, Abschnittsbaum, Führungsorganisation (s3-37). `packages/domaene/src/katalog/schemata.ts:165-168` (`fuehrungskraft`, `istFuehrungDesAbschnitts` im Ereignisschema), `packages/domaene/src/kennzahlen.ts:359-367` (Führungskraft nur als Teil von „Erreichbarkeit“).
- **Beobachtung [beobachtet, Code]:** Der Abschnitt ist an jeder Einheit klar (Baum, Gliederung, Kopf „9 in EA Deich Nord“). Wer die Einheit führt und wer den Abschnitt leitet, steht nirgends als eigene Angabe; die Führungskraft geht nur im Text der Spalte „Erreichbarkeit“ (Ressourcen, ausgeblendet) auf. Die Harke zeigt Zeichen, Namen und Stärke, keine Personen. Eine Maske für die Abschnittsleitung gibt es im Renderer nicht **[Code]**.
- **Erwartung der Rolle:** An der Harke und am Abschnitt: „EA Deich Nord — Ltr. Meyer, Funkrufname …“; an der Einheit der Einheitsführer.
- **Auswirkung im Einsatz:** Für eine Auftragserteilung oder Rückfrage sucht der S3 den Ansprechpartner im Schichtplan oder auf Papier.
- **Empfehlung:** Einheitsführer als sichtbare Spalte; „Leitung“ am Abschnitt (Person, Erreichbarkeit) und in der Führungsorganisation.
- **Verifikation:** Für drei Einheiten und zwei Abschnitte den Führer in einem Blick ablesen, auch im PDF der Führungsorganisation.

### P2-6 · Ausgabe „Anforderungen“ mit ISO-Zeiten und Rohwerten

- **Fundstelle / Aufgabe:** Aufgabe 2. Ausgaben → „Anforderungen als HTML“ (`ausgaben/anforderungen_2026-11-05_2101.html`). `packages/ausgaben/src/listen.ts:33-58`.
- **Beobachtung [beobachtet]:** Spalte Zusage: „2026-09-08T16:00:00+02:00 / THW RB Oldenburg“ und „2026-11-05T23:30:00.000Z / THW RB Oldenburg / LuK“; Zustand „OFFEN“, „STORNIERT (storniert)“; Kopf mit technischer Kennung und „@bos/eeb-format 0.0.0“. Am Bildschirm steht dieselbe Zusage richtig als „05.11.2026 23:30“. Die Liste hat keine Spalte „angefordert bei“ oder Stärke (siehe P1-4).
- **Erwartung der Rolle:** Die Anforderungsliste ist das Papier für Rückfragen bei der übergeordneten Stelle; Zeiten wie am Bildschirm.
- **Auswirkung im Einsatz:** Beim Telefonat „Wann kommt die FGr N?“ muss eine UTC-Zeichenkette im Kopf umgerechnet werden — Fehlerquelle um Stunden.
- **Empfehlung:** Zeiten als TT.MM.JJJJ HH:MM, Zustände als Wörter, technische Kennungen in den Fuß.
- **Verifikation:** Ausgabe neu erzeugen: keine Zeichenkette mit „T“ und „Z“ mehr, Zustände in Normalschreibung.

### P3-1 · Kein Profil für S3

- **Fundstelle / Aufgabe:** Einsatzauswahl → „Dieser Arbeitsplatz → Ändern“ (s3-02). Handbuch „Das Fenster“, Tabelle der Profile.
- **Beobachtung [beobachtet]:** Profile: Führungsstelle (S1), Vermeldezentrale, Versorgung (S4), Alle Blätter. Für S3 passt „Führungsstelle (S1)“ inhaltlich (Lage, Eingang, Führungsstelle), heißt aber anders.
- **Erwartung der Rolle:** Ein Profil „Einsatz (S3)“ mit Lage, Anforderungen (statt Eingangskorb vorn), Führungsorganisation.
- **Auswirkung im Einsatz:** Gering: Der S3 nimmt S1 und landet im Eingang zuerst beim Eingangskorb, den er nicht braucht.
- **Empfehlung:** Profil S3 oder neutrale Benennung „Führungsstelle (S1/S3)“; Umschalter merkt sich ohnehin die Wahl.
- **Verifikation:** Profil S3 wählen: Reiter Lage, Anforderungen, Führungsorganisation direkt im Band.

### P3-2 · Kleinigkeiten in Texten

- **Beobachtung [beobachtet]:** Statuszeile „Anforderung ‚Anforderung ANF-2026-005‘ angelegt“ (doppelt); Tagebuchfuß „1 Einträge“; Knopf „Erledigt“, Tagebuch „Auftrag beendet: (leer) → …“; Auflösen-Maske „6 Einheit(en)“; „Anfordern“ und „Schließen“ in der Anforderungsmaske gleich gewichtet (s3-19).
- **Empfehlung:** Einheitliche Wörter (erledigt), Singular/Plural, Hauptknopf hervorgehoben.
- **Verifikation:** Durchsicht der genannten Stellen.

---

## Gegenüber dem Audit vom 29.10.2026

- **Behoben [beobachtet]:** Aufträge und Fahrzeuge lassen sich erfassen (P0 „Auftrag nirgends eintragbar“; jetzt über die Untertabellen, Zugang siehe P2-1). „Eingetroffen“ an der Anforderung legt die Einheit an oder verknüpft sie, „Ablösung durch“ füllt sich (P1 „Doppelerfassung“). Die Ablösungsspalten N–S stehen unter „Ressourcen“, die Marke „Ablösung angefordert/zugesagt“ an der Bezeichnung. Zeitfelder nehmen „2330“ und „6.11. 06:00“ an. Anforderungsmaske und Leiste zeigen nur, was zum Zustand passt.
- **Teilweise:** „Verfügbar bis läuft ab“ (K18) wird jetzt gezeichnet, aber nur in der ausgeblendeten Spalte (P2-4). ISO-Zeiten sind aus der Oberfläche verschwunden, nicht aus der Anforderungsausgabe (P2-6).
- **Offen:** Anforderung hängt nicht an Einheiten im Anmarsch (P1-4).

---

## Positives

Die Masken für Verschieben, Auflösen und Umhängen sind für den S3 genau richtig: Ziel ist Pflicht, der Grund für den grauen Knopf steht daneben („Zielabschnitt wählen“), die Auflösung nennt vorher Zahl und Stärke der betroffenen Einheiten, Umhängen schließt Zyklen aus und nimmt die Einheiten mit. Die Kette Anforderung → Zusage → Eingetroffen → Einheit mit Auftrag funktioniert ohne Abtippen, und „→ angelegt: FGr Räumen THW OV Westerstede“ in der Anforderungsliste zeigt die Verknüpfung. Die Statuszeile bestätigt jeden Schritt mit Namen und bietet die Rücknahme an derselben Stelle. Die Führungsorganisation zeichnet aufgelöste Abschnitte durchgestrichen statt sie zu verstecken. Das Gesamttagebuch enthält jeden S3-Schritt mit Akteur und Zeit.

---

## Abschluss

- **Aufgabe der Rolle geschafft:** mit Umwegen — Auftrag, Zuweisung, Anforderungskette, Umgliederung und Rückmeldung gelingen; freie Kräfte mit Fähigkeit finden und den Auftragsstand überblicken gelingen nicht verlässlich.
- **Nebenaufzeichnung auf Papier nötig:** ja — Auftragstafel (offen/erledigt je Abschnitt) und Liste „zugesagt / im Anmarsch / voraussichtlich ab“.
- **Größte Lücke an einer Übergabe:** Von der übergeordneten Stelle (Zusage) an den S1/S3-Lagestand: Eine zugesagte Kraft erscheint bis zum Eintreffen weder in der Lage noch in „erwartet“, und die vorhandenen Einheiten „im Anmarsch“ haben keine Anforderung.
- **Größtes Einsatzrisiko:** Eine Einheit mit laufendem Auftrag sieht in Filter und Status aus wie eine freie Kraft und wird ein zweites Mal beauftragt — während ihr erster Auftrag im Ausdruck mit dem falschen Ort steht.
- **Top-Priorität für die nächste Iteration:** Eine Auftragsübersicht mit Zustand und Abschnitt (offen oben), deren „offen“ zugleich den Filter „verfügbar“ der Lage speist.
