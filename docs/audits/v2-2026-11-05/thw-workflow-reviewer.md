# Workflow-Audit S1-Control v2 (THW Workflow Reviewer)

Datum: 05.11.2026 · Stand HEAD (`ffc3125`) · eigene Web-Schale http://127.0.0.1:8211 mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten)

**Material:** laufende Web-Schale mit realen Schreibvorgängen (Playwright, Skripte `wf1…wf36.cjs` im Scratchpad), dazu ein vollständig neu angelegter Einsatz „Hochwasser Hunte“ von „Neuer Einsatz …“ bis „Archivieren“; Screenshots `shots/workflow/01…66` (Scratchpad der Sitzung); Quelltext lesend; HANDBUCH.md, KURZANLEITUNG.md, UEBUNG.md; Vergleich mit `docs/audits/v2-2026-10-29/thw-workflow-reviewer.md`.

**Kennzeichnung:** **[beobachtet]** in der laufenden App erlebt · **[Code]** aus dem Quelltext hergeleitet, Laufzeit nicht eigens geprüft · **[Annahme]** THW-Ablauf, der nicht aus dem Material hervorgeht · **[nicht prüfbar]** in der Web-Schale nicht nachstellbar.

Rolle: Helfer in der S1-Sachbearbeitung, der einen Einsatz von der Anlage bis zum Abschluss allein führt, die Excel-Stärkeübersicht kennt und das Handbuch nicht vorher gelesen hat.

## Erwartete Arbeitsfolge

| Nr. | Schritt | Erwartung der Rolle |
|---|---|---|
| 1 | Einsatz anlegen | Name, Datum, FüSt, übergeordnete FüSt einmal eintragen |
| 2 | Führungsorganisation | Einsatzabschnitt, Bereitstellungsraum, „Angefordert / Anmarsch“ |
| 3 | Einheiten melden lassen | Angeforderte Kräfte aus Vorlage, Meldungen vom Meldekopf (Bogen/Bündel) |
| 4 | Anforderung → Zusage → Eintreffen | Anforderung führen; beim Eintreffen steht die Einheit ohne Neueingabe in der Lage |
| 5 | Auftrag | Auftrag an der Einheit, sichtbar in Zeile und Ausdruck |
| 6 | Statuswechsel | Einsatzbereit → Einsatz → Rückmarsch, mit Zeit |
| 7 | Ablösung | An der Einheit anfordern; neue Einheit entsteht beim Eintreffen; alte wird ausgelöst |
| 8 | Versorgung | S4 sieht, wer zu welcher Mahlzeit da ist, inkl. Zugänge |
| 9 | Funkplan | Rufgruppen anlegen, Einheiten zuordnen, Funkprobe |
| 10 | Ausgaben | Druck/Einheitenliste für die Lagebesprechung, ohne Explorer |
| 11 | Einsatzabschluss | Beenden, Akte, Archiv |

[Annahme] Ob eine Ablösung real als eigene Anforderung oder als Vermerk an der Einheit geführt wird und ob die abgelöste Einheit sofort oder erst nach Übergabe vor Ort ausgelöst wird, geht aus dem Material nicht hervor. Ebenso, ob jede Kraft vor Eintreffen als Anforderung oder als angeforderte Einheit geführt werden soll.

## Urteil

Der komplette Einsatz lässt sich heute **ohne fremde Hilfe** von „Neuer Einsatz …“ bis „Archivieren“ durchspielen. Gegenüber dem Stand vom 29.10. sind die beiden P0 und drei der fünf P1 erledigt: Der Auftrag ist an der Einheit erfassbar und steht mit Abschnitt in der Zeile [beobachtet], Strg+D schreibt Ortszeit `05.11.2026 20:50`, „abc“ wird mit einem Formatsatz abgewiesen [beobachtet], die Stammdaten werden beim Anlegen gefragt und stehen im Druck („FüSt Oldenburg · übergeordnete Führungsstelle: TEL LK Oldenburg“) [beobachtet], die Ist-Stärke zählt nach Status und nennt „+N erwartet“ [beobachtet], und Anforderung → Zusage → Eintreffen legt die Einheit mit Organisation, Stärke, Herkunft und Auftrag in einer Maske an, inklusive Rückbezug „Ablösung durch“ an der abgelösten Zeile [beobachtet]. Einsatzabschluss mit Beenden, Akte und Archiv ist in der Oberfläche, mit vorgefülltem Einsatzende, Restliste („0 offene Anforderungen; 5 Einheiten nicht abgeschlossen“) und Pflichthaken beim Archivieren [beobachtet].

Reibung entsteht jetzt an drei Stellen. Erstens beim **Anlegen von THW-Einheiten**: Der THW-Katalog trägt Bezeichnungen wie „(B)“, „(FGr N)“ oder Satzbruchstücke; „Bergungsgruppe“, „Notversorgung“, „Wasserschaden“ finden nichts, und was angelegt wird, heißt in der Tabelle „(B)“. Zweitens führen **zwei getrennte Wege** zu „angefordert“ — die Anforderung im Eingang und die angeforderte Einheit in der Lage —, die bis zum Eintreffen nichts voneinander wissen; eine zugesagte Anforderung erscheint weder in „erwartet“ noch in der Versorgung. Drittens bleiben die **Übergänge am Ende einer Einheit** Handarbeit: Nach eingetroffener Ablösung zählt die alte Einheit weiter mit, beim Rückmarsch bleiben Auftrag offen und Einsatzende leer, und eine Eintreffzeit setzt kein Weg von selbst.

Der Prozess wird unterstützt; ein eigener IT-Prozess wird nur noch an Rändern aufgezwungen (Umbenennen jeder THW-Einheit nach dem Anlegen, Spaltengruppe einschalten für Zeiten).

## Schritt-für-Schritt

| Nr. | Schritt | Beobachtet | Bewertung | Beleg |
|---|---|---|---|---|
| 1 | Einsatz anlegen | „Neuer Einsatz …“: Name, Datum (vorbelegt), FüSt, übergeordnete FüSt, Einsatzort, Beginn, Einsatzart, Schichtmodell; Knopf grau mit Grund, bis Name fehlt | **gelöst** (vorher P1-3) | 02, 03, 04 |
| 2 | Abschnitte | „Abschnitt anlegen“: Name + Typ; „Eingang“ und „Einsatz beendet“ sind vorhanden | gut | 05, 06 |
| 3 | Einheiten melden lassen | „Aus Vorlage“ mit Suche und Abschnittspflicht; THW-Katalog kaum findbar (P1-1); Erfassungsbogen/Bündel nur als Maske gesehen | **mit Umweg** | 07–10, 64, 65 |
| 4 | Anforderung → Zusage → Eintreffen | 3 Masken, Leiste je Zustand; Eintreffen legt Einheit „Einsatzbereit“ mit Auftrag an; Strg+Z nimmt Anlage und Erledigung gemeinsam zurück | **gut**, aber getrennte Welt (P1-2), keine Eintreffzeit (P2-1) | 13–21, 66 |
| 5 | Auftrag | „+“ in der Untertabelle „Aufträge“, Text + Beginn; Zeile zeigt „05.11.2026 20:50–; EA Deich Nord; Sandsackverbau Deich km 3“ | **gelöst** (vorher P0-1) | 30, 31 |
| 6 | Statuswechsel | Status-Zelle → Auswahl → „Übernehmen“; Kopf springt von 9 auf 21 | gut, Verschieben ohne Status (P2-1) | 23–25 |
| 7 | Ablösung | „Ablösung anfordern“ aus der Auswahlleiste; alte Zeile zeigt „Ablösung angefordert“, ANF-002, Zusage, „Ablösung durch“ | **gelöst** (vorher P1-2), Ende offen (P2-2) | 32–35 |
| 8 | Versorgung | Band, fünf Unteransichten, „+16 Anmarsch (getrennt)“; Anforderungen fließen nicht ein | mit Lücke (P1-2) | 48, 49 |
| 9 | Funkplan | Fleetmapping-Vorschlag, Zuordnung per Zelle, Strg+P Funkprobe | gut, Details P2-3/P3-3 | 40–47 |
| 10 | Ausgaben | Knopf je Ausgabe, danach „Öffnen / Herunterladen / Drucken“ | **gelöst** (vorher P2-3), Knopfwand (P3-2) | 50–53 |
| 11 | Abschluss | Beenden mit Zeit/Bemerkung und Restliste; Akte als ZIP; Archivieren mit Pflichthaken; Liste zeigt „archiviert, nur lesen“ | **gelöst** (vorher P2-2) | 54–61 |

---

## P0 – Einsatzkritisch

Keine. Im durchgespielten Ablauf entstand weder ein verlorener Auftrag noch ein falscher Status noch Datenverlust; Rücknahmen blieben nachvollziehbar.

## P1 – Hoch

### P1-1 THW-Einheiten sind im Vorlagenkatalog kaum zu finden und kommen mit unbrauchbarer Bezeichnung in die Lage

- **Fundstelle / Aufgabe:** Schritt 3. Lage → „Einheit anlegen ▾“ → „Aus Vorlage …“, Feld „Vorlage suchen“ (08, 09, 09b, 10). `packages/domaene/src/vorlagen/thw.ts:23,41,72,99,151,420,859,896` (Bezeichnungen „Lastkraftwagen (1,5 t Nutzlast) mit Ladekran (780 kNm)“, „(Ergänzungsausstattung)“, „(MT)“, „(B)“, „(FGr N)“, „Die SEEWA ist gebietsmäßig bundesweit in 3 Module mit jeweils einer Fachgruppe als“, „3.1 SEElift“; kein `lang`, zehnmal `ebene: "UNBESTIMMT"`); Suche über Bezeichnung, Langname und AküLi-Kürzel `packages/domaene/src/vorlagen/suche.ts:37-55`. Feuerwehr-Vorlage „LZ FW“ ohne Soll-Stärke.
- **Beobachtung [beobachtet]:** Die ungefilterte Liste beginnt mit „Lastkraftwagen … mit Ladekran“, „(Ergänzungsausstattung)“, „(MT)“, „(VOST)“. Suchbegriffe und Treffer: „Bergungsgruppe“ → „Keine Vorlage passt“, „Bergung“ → keine, „Wasserschaden“ → keine, „Notversorgung“ → keine, „Sanitätsgruppe“ → keine, „SEG“ → keine; „B“ → 20 Treffer, vorn „(B)“, dann alle „(… (B))“-Varianten. „Zugtrupp“ findet THW nur als „(ZTr TZ)“, „(ZTr FZ Log)“, „(ZTr FZ FK)“. Angelegt steht die Einheit als „(B)“ mit Gliederungsebene „Unbestimmt“, „(ZTr TZ)“, „(FGr WP (A))“ in der Tabelle, im Funkplan und in der Rufgruppenwahl; jede Zeile muss danach per Doppelklick umbenannt werden (getan: „B 1 THW OV Oldenburg“). „LZ FW“ (Feuerwehr) kommt mit 0/0/0 und zählt im Kopf als „+28 erwartet“ ohne die rund 22 Kräfte eines Löschzugs.
- **Erwartung der Rolle:** Ein THW-Helfer tippt „Bergungsgruppe“ oder „B1“ oder „FGr N“ und bekommt „B — Bergungsgruppe (THW, 0/2/10)“. Die Bezeichnung in der Zeile soll lesbar sein, idealerweise schon mit Herkunft („B OV Oldenburg“), wie die Einheit auf der Lagekarte heißt.
- **Auswirkung im Einsatz:** Im eigenen Programm der Organisation ist der Hauptweg für THW-Kräfte der langsamste. Unter Zeitdruck bleiben Zeilen „(B)“, „(B)“, „(B)“ stehen, die niemand mehr auseinanderhält — im Funkplan, in der Ablösungsauswahl („Ablösung für“ zeigte „(B)“, „(FGr WP (A))“, „(ZTr TZ)“) und auf dem Druck. Fehlende Soll-Stärken lassen „erwartet“ zu klein erscheinen. Die Prüflage zeigt das Ausweichmuster schon: „FGr Räumen B (angefordert)“, „LZ FW (angefordert)“ — Status im Namen, weil der Name ohnehin von Hand geschrieben wird.
- **Empfehlung:** THW-Katalog mit Kurz- und Langnamen wie bei KatS/Feuerwehr („B — Bergungsgruppe“, „FGr N — Fachgruppe Notversorgung und Notinstandsetzung“), Satzbruchstücke und Fahrzeuge aus der Einheitenliste entfernen, Ebene setzen. Beim Anlegen die Bezeichnung als Feld anbieten, vorbelegt aus Vorlage + Herkunft. Vorlagen ohne Soll-Stärke beim Anlegen nach der Stärke fragen statt 0/0/0 zu setzen.
- **Verifikation:** „Bergungsgruppe“, „Notversorgung“, „Wasserschaden Pumpen“ finden die THW-Vorlage an erster Stelle; nach dem Anlegen steht eine lesbare Bezeichnung in der Zeile, ohne Zelle anzufassen; ein angeforderter LZ FW zählt mit seiner Stärke in „erwartet“.

### P1-2 Anforderung und angeforderte Einheit sind zwei getrennte Welten bis zum Eintreffen

- **Fundstelle / Aufgabe:** Schritte 3, 4, 8. Blatt Eingang → Anforderungen (12–17) gegen Lage „Angefordert / Anmarsch“ (10, 21) und Versorgung (48). `apps/desktop/src/renderer/AnforderungZuEinheit.tsx:150-180` (Einheit entsteht erst beim Eintreffen), `packages/domaene/src/projektion/versorgung.ts:8-17` (Zugänge nur aus Einheiten mit gemeldeter Eintreffzeit; keine Anforderungen). Anforderungsmaske: nur Kennung, Ablösung für, Vorgesehene Einheit, Vorgesehener Auftrag (13).
- **Beobachtung [beobachtet]:** ANF-001 „FGr N THW OV Jever“, zugesagt für 22:30 von „THW RB Oldenburg“, stand bis zum Eintreffen nirgends in der Lage: Kopfband „+28 erwartet“ blieb unverändert, die Versorgung zeigte „+16 Anmarsch (getrennt)“ ohne sie. Umgekehrt stehen die über „Aus Vorlage“ angelegten Einheiten mit Status „Angefordert“ in der Lage und in „erwartet“, aber in keiner Anforderungsliste, ohne Zusage-Felder und ohne Kennung. Wer beides will, pflegt es doppelt; erst beim Eintreffen bietet die Maske „Bestehende Einheit verknüpfen“. Die Zusagezeit fließt nicht in die Vorausschau der Versorgung. Die Eintreffen-Maske übernimmt als Herkunft „THW RB Oldenburg“ (die zusagende Stelle) statt des OV; Stärke steht auf 0/0/0 und muss getippt werden, weil die Anforderung keine Stärke kennt.
- **Erwartung der Rolle:** Eine angeforderte Kraft ist **eine** Sache: angefordert → zugesagt (für wann, von wem) → eingetroffen. Die Lage und der S4 sollen sie ab der Zusage als erwartet sehen.
- **Auswirkung im Einsatz:** Die Meldung „wir erwarten noch X Kräfte“ hängt davon ab, welchen der zwei Wege der Kollege gewählt hat. Der S4 bestellt für 06:00 ohne die zugesagte Gruppe, die um 22:30 eintrifft. Bei Schichtwechsel muss der Nachfolger zwei Listen abgleichen. [Annahme] In der FüSt werden Anforderungen über S3/Leitstelle laufen und angeforderte Einheiten parallel als Platzhalter auf der Lagekarte stehen — genau dieser Doppelweg.
- **Empfehlung:** Eine Anforderung soll beim Anlegen (oder spätestens bei der Zusage) eine erwartete Zeile in „Angefordert / Anmarsch“ erzeugen oder an eine bestehende angeforderte Einheit gebunden werden können; die Zusagezeit wird zur gemeldeten Eintreffzeit. Umgekehrt an einer angeforderten Einheit „Anforderung dazu anlegen“. Optional Stärke/Vorlage in der Anforderung.
- **Verifikation:** Anforderung anlegen und zusagen (22:30): Kopf zeigt sie als erwartet, Versorgung rechnet sie ab 22:30 ein; beim Eintreffen entsteht keine zweite Zeile.

## P2 – Mittel

### P2-1 Eintreffen in der Lage bleibt drei Handgriffe, und kein Weg setzt die Eintreffzeit

- **Fundstelle / Aufgabe:** Schritte 4, 6. Verschieben-Maske (23: nur „Nach Abschnitt“), `apps/desktop/src/kontrakt/bedienschritte.ts:211-218` (`verschiebung` trägt nur von/nach), `apps/desktop/src/kontrakt/anforderungsschritte.ts:55-73` (Anlage aus Anforderung ohne Zeitfeld). Spaltengruppe „Ressourcen“ (26, 27).
- **Beobachtung [beobachtet]:** „(B)“ nach „EA Deich Nord“ verschoben: Status bleibt „Angefordert“, Kopf bleibt 9 — korrekt nach der neuen Zählregel, aber die Maske sagt es nicht. Danach Status-Zelle → „Einsatzbereit“ → Kopf 21. „Eingetroffen“ bleibt leer, bis die Gruppe „Ressourcen“ unter „Spalten ▾“ eingeschaltet und die Zelle mit Strg+D gefüllt wird (dann `05.11.2026 20:50`, gut). Auch die über die Anforderung angelegten Einheiten „FGr N THW OV Jever“ und „B 2 THW OV Wilhelmshaven“ haben keine Eintreffzeit, obwohl das Tagebuch „eingetroffen 05.11.2026 20:47“ kennt. Die eingeschaltete Spaltengruppe war nach jedem Neuladen der Seite wieder aus.
- **Erwartung der Rolle:** „Ist da“ ist ein Handgriff: Bereich, Einsatzbereit, Uhrzeit — so wie die Anforderung es schon vormacht.
- **Auswirkung im Einsatz:** Die Spalte „Eingetroffen“ der Einheitenliste und des „Oldenburger Blocks“ bleibt leer; wer später Einsatzdauer, Ruhezeit oder Ablösezeitpunkt rechnet, hat keine Grundlage. [Annahme] Für Abrechnung und Einsatzbericht wird die Eintreffzeit gebraucht.
- **Empfehlung:** Statuswechsel auf „Einsatzbereit“ aus Angefordert/Anmarsch und das Eintreffen an der Anforderung setzen „Eingetroffen = jetzt“ (überschreibbar). Die Verschieben-Maske bietet beim Ziel Einsatzbereich „Status Einsatzbereit, eingetroffen jetzt“ als vorbelegte Option und nennt die Zählfolge.
- **Verifikation:** Eine angeforderte Einheit in einem Handgriff eintreffen lassen; Abschnitt, Status und Eintreffzeit stehen danach in Zeile und Einheitenliste.

### P2-2 Ende einer Einheit: Ablösung, Rückmarsch und „Einsatz beendet“ lassen Folgeschritte offen

- **Fundstelle / Aufgabe:** Schritte 6, 7, 11. Lage nach „ANF-002 eingetroffen“ (35), Status „Rückmarsch“, Verschieben nach „Einsatz beendet“ (38, 39); Maske „Einsatz beenden“ (54), `apps/desktop/src/renderer/Einsatzabschlussmasken.tsx:48`.
- **Beobachtung [beobachtet]:** Nach Eintreffen der Ablösung steht „B 1 THW OV Oldenburg · Ablösung eingetroffen“ weiter auf Status „Einsatz“; der Kopf zählt alte und neue Einheit (21 → 33). Kein Hinweis „B 1 jetzt auslösen?“. Nach „Rückmarsch“ und Verschieben nach „Einsatz beendet“ bleibt der Auftrag offen („05.11.2026 20:50–; EA Deich Nord; Sandsackverbau …“), „Einsatzende“ und „Rückführung“ bleiben leer; die Verschieben-Maske nennt keine Folge. Beim Einsatzende meldet die Maske „5 Einheiten nicht abgeschlossen (nicht im Archiv-Abschnitt)“ ohne Namen und ohne Weg dorthin; der Abschnitt heißt in der Oberfläche „Einsatz beendet“, nicht „Archiv“.
- **Erwartung der Rolle:** Ablösung eingetroffen → alte Einheit auf Rückmarsch mit Einsatzende jetzt, Auftrag an die neue übergeben. „Einsatz beendet“ schließt Auftrag und Zeiten.
- **Auswirkung im Einsatz:** [Annahme] Während der Übergabe vor Ort sind beide Einheiten da; dass beide zählen, ist dann richtig. Aber ohne Anstoß bleibt die alte Einheit leicht stundenlang in der Ist-Stärke und im Mahlzeitenbestand stehen, und der offene Auftrag hängt an einer abgefahrenen Einheit. Die Restliste beim Einsatzende ist eine Zahl, mit der niemand arbeiten kann.
- **Empfehlung:** Nach „Ablösung eingetroffen“ an der alten Zeile einen Schritt „Auslösen (Rückmarsch, Einsatzende jetzt, Auftrag beenden)“ anbieten. Beim Ziel „Einsatz beendet“ Status und Zeiten vorbelegen, offenen Auftrag beenden. In der Abschlussmaske die offenen Einheiten mit Namen nennen und „in der Lage zeigen“ anbieten; Begriff „Archiv-Abschnitt“ durch „Einsatz beendet“ ersetzen.
- **Verifikation:** Nach eingetroffener Ablösung führt ein Klick die alte Einheit aus der Ist-Stärke, mit Zeit und beendetem Auftrag; die Abschlussmaske listet offene Einheiten namentlich.

### P2-3 „Letzter Kontakt“ wird auch durch Anlage und Statuswechsel am Schreibtisch gesetzt

- **Fundstelle / Aufgabe:** Schritt 9. Funkplan, Spalte „Letzter Kontakt“ (40, 42). `packages/domaene/src/projektion/funkkontakt.ts:1-16,96-100` (jede gesetzte Statusmeldung zählt als Kontakt, auch der Anfangsstatus der Anlage).
- **Beobachtung [beobachtet]:** Direkt nach dem Anlegen zeigt der Funkplan für „LZ FW“ (angefordert, noch nicht vor Ort) „2045 Meldung“, für „(ZTr TZ)“ „2044 Meldung“; „B 2 THW OV Wilhelmshaven“, angelegt über das Eintreffen der Anforderung, „2056 Meldung“ — ohne dass jemand gefunkt hat. Erst Strg+P ergibt „2100 Funkprobe“.
- **Erwartung der Rolle:** „Letzter Kontakt“ heißt für die Vermeldezentrale: Die Einheit hat sich gemeldet.
- **Auswirkung im Einsatz:** Ein Statuswechsel, den der S1 nach Telefonat mit dem Meldekopf oder einfach zur Korrektur einträgt, setzt die Funküberwachung zurück; die Bernsteinmarke „kein Kontakt > 60 min“ kommt eine Stunde zu spät. [Annahme] In der Praxis kommen Statusmeldungen nicht nur per Funk.
- **Empfehlung:** Nur Statusmeldungen mit Funkzeit (oder ausdrücklich „per Funk“) als Kontakt werten; Anlage und Eintreffen nicht. Oder in der Spalte klar trennen: „Funkprobe 2100“ / „Status (Eingabe) 2056“.
- **Verifikation:** Eine neu angelegte Einheit zeigt „—“ als letzten Kontakt; ein Statuswechsel ohne Funkzeit setzt die Schwelle nicht zurück.

### P2-4 Schichtübergabe: weiter kein Übergabebild, Akteur ist der Rechnername „Arbeitsplatz“

- **Fundstelle / Aufgabe:** Übergabe [Annahme]. Einsatzauswahl „Dieser Arbeitsplatz · Arbeitsplatz · Anzeigename“ (01), Tagebuch-Spalte Akteur „Arbeitsplatz“ (45); HANDBUCH.md „Zum Schichtwechsel: Nichts.“ Vorher P2-4.
- **Beobachtung [beobachtet]:** Der Einsatz ließ sich mit dem Vorgabenamen „Arbeitsplatz“ anlegen, ohne Hinweis. Alle 33 Ereignisse des Einsatzes stehen mit Akteur „Arbeitsplatz“ im Tagebuch. Offene Anforderungen (Eingang), Einheiten mit Ablösung (Spaltengruppe Ressourcen), Konflikthinweise („⚠ 8 Konflikthinweise“ in der Statuszeile der Prüflage) und Einheiten ohne Rufgruppe (Funkplan) stehen weiterhin auf vier Blättern.
- **Erwartung der Rolle:** Ein Blick zum Schichtwechsel: was offen ist, was abläuft, was strittig ist, wer es eingetragen hat.
- **Auswirkung im Einsatz:** Die Übergabe bleibt mündlich; Rückfragen „wer hat das eingetragen?“ sind aus dem Tagebuch nicht zu beantworten.
- **Empfehlung:** Anlegen mit Vorgabenamen „Arbeitsplatz“ mit Hinweis versehen; eine Übergabesicht mit offenen Anforderungen, „läuft ab“, Ablösungen, Konflikten und Einheiten ohne Status/Rufgruppe.
- **Verifikation:** Ein Ablösender findet ohne Rückfrage in einer Minute die offenen Punkte der Prüflage.

## P3 – Niedrig

### P3-1 Rohtexte und schiefe Bestätigungen

- **Beobachtung [beobachtet]:** Ausgaben, „Davon Stärke der Organisation“: Auswahl in Schlüsseln „FEUERWEHR, BUNDESPOLIZEI, WASSERWIRTSCHAFT …“ (50). Druck-HTML trägt die Zeile „@bos/eeb-format 0.0.0“ (53). Bestätigungen „Anforderung ‚Anforderung ANF-001‘ angelegt“, „Einheit ‚(B)‘ gemeldet“ für eine angeforderte Einheit. Abschlussmaske: „sperrt den Einsatz für Sie und keinen weiteren Arbeitsplatz“ (`Einsatzabschlussmasken.tsx:39,79`). Im archivierten Einsatz trägt der gesperrte Rückgängig-Knopf den Tooltip „Einsatz beendet – nur lesen“.
- **Empfehlung:** Anzeigenamen statt Schlüssel, Paketzeile aus dem Druck, Bestätigungstexte ohne Doppelung und mit dem richtigen Verb („angefordert“), Sperrsatz bei null weiteren Plätzen umformulieren.
- **Verifikation:** Keine Großbuchstaben-Schlüssel und keine Paketnamen auf Bildschirm und Druck.

### P3-2 Blatt Ausgaben: 23 gleichrangige Knöpfe; PDF im Browser immer mit Fehlermeldung

- **Beobachtung [beobachtet]:** Druck, Status, Einheitenliste, Auswertung, Logistik, Führungsorganisation, Kosten, Anforderungen, Tagebuch, Funkplan, Papier-Vordruck je als PDF/HTML/XLSX nebeneinander (50) — das Blatt folgt nicht dem neuen Muster „ein Hauptknopf + ⋯“. In der Web-Schale meldet jeder PDF-Knopf „PDF gibt es nur in der Desktop-App …“ (52). Welche Ausgabe vor der Lagebesprechung zu drucken ist (Handbuch: Einheitenliste), sagt das Blatt nicht.
- **Empfehlung:** Einheitenliste/Druck als Hauptknopf, Rest gruppiert; im Browser PDF-Knöpfe ausblenden oder grau mit Grund.
- **Verifikation:** Ein Helfer ohne Handbuch druckt die Einheitenliste in unter 15 Sekunden.

### P3-3 Funkplan: gleiche Rufgruppe doppelt anlegbar; Fleetmapping nur über die Kennung

- **Beobachtung [beobachtet]:** Ein zweites „T_OL-GOLD-1“ mit gleichem Zweck wurde ohne Hinweis angelegt (44: „Rufgruppen · 2“, zweimal derselbe Name; in der Rufgruppen-Auswahl der Zelle doppelt). Der Fleetmapping-Vorschlag findet „OL-GOLD“ und „T_OL“ (5–6 Treffer mit „T_LV HBNI › Oldenburg · Kurzwahl 539“), „Oldenburg“ und „Deich“ finden nichts, obwohl der Ort im Vorschlag steht. Pfeil + Enter übernimmt nur den Namen und legt nicht an — gut.
- **Empfehlung:** Doppelten Namen melden; Suche auch über den Ordner (Ortsname).
- **Verifikation:** „Oldenburg“ zeigt die OL-Gruppen; zweite gleichnamige Gruppe fragt nach.

### P3-4 Erster Rückgängig-Schritt nach dem Anlegen sind die Stammdaten

- **Beobachtung [beobachtet]:** Unmittelbar nach „Einsatz anlegen“ bietet die Statuszeile „↶ Rückgängig: Stammdaten geändert (‚Hochwasser Hunte‘)“ (04). [nicht geprüft] Was ein Strg+Z an dieser Stelle mit FüSt und übergeordneter FüSt macht, wurde nicht ausgelöst.
- **Empfehlung:** Die Stammdaten der Anlage nicht als zurücknehmbaren Einzelschritt anbieten oder den Text auf „Stammdaten der Anlage“ ändern.
- **Verifikation:** Strg+Z direkt nach der Anlage lässt die Stammdaten auf Druck und Kopfband unverändert.

## Was gut funktioniert

- Anforderung → Zusage → Eintreffen in einer Leiste je Zustand; Eintreffen legt die Einheit mit Auftrag an und verknüpft die Ablösung; Strg+Z danach fragt nach und nimmt Einheit und Erledigung gemeinsam zurück („Einheit ‚TestGr THW OV Leer‘ entfernt“, Kopf 272 → 264) [beobachtet].
- Ablösung an der Einheit: alte Zeile zeigt Anforderungskennung, Zusage, vorgesehene Einheit und „Ablösung durch“ [beobachtet].
- Zeitfelder: Ortszeit, einheitliches Format, Freitext geprüft [beobachtet].
- Ist-Stärke mit „+N erwartet“ und „N beendet“ im Kopf, Summenzeilen „Ist-Stärke / Erwartet / Alle erfassten Einheiten“, Abschnittskopf „zählt nicht“ [beobachtet].
- Abschluss: Beenden mit Restliste, Akte als ZIP mit Ereigniszahl, Archivieren nur mit Haken, beendeter Einsatz sperrt Leiste und Status mit Klartext [beobachtet].
- Ausgaben mit „Öffnen / Herunterladen / Drucken“ statt Pfad und Bytezahl [beobachtet].

---

- **Aufgabe geschafft:** ja — der vollständige Ablauf war ohne Sackgasse durchspielbar; Umwege beim Anlegen von THW-Einheiten und bei den Zeiten.
- **Fremde Hilfe nötig:** nein — alle Schritte waren über Knöpfe, Leisten und Masken auffindbar; nur die Eintreffzeit verlangt das Wissen um die Spaltengruppe „Ressourcen“.
- **Größtes Missverständnis:** Der Helfer hält eine zugesagte Anforderung für „erwartet“, die Software kennt sie bis zum Eintreffen weder im Kopf noch in der Versorgung.
- **Größtes Einsatzrisiko:** Einheiten heißen nach dem Anlegen „(B)“, „(ZTr TZ)“ und bleiben unter Zeitdruck so stehen — in Funkplan, Ablösungswahl und Druck nicht mehr unterscheidbar.
- **Top-Priorität für die nächste Iteration:** Den THW-Vorlagenkatalog mit Langnamen, Ebenen und Soll-Stärken suchbar machen und die Bezeichnung beim Anlegen als vorbelegtes Feld abfragen.
