# Audit Nachrichten: Sichter (Führungsgehilfe in der Führungsstelle)

Datum: 2026-11-17
Rolle des Prüfers: Sichter in einer THW-Führungsstelle (quittiert jeden Eingang mit Uhrzeit und Namenszeichen, legt den Verteiler fest, schreibt Vermerke, bearbeitet Blitz vor Sofort vor Einfach).
Gegenstand: Funktion „Nachrichten" (4-fach-Vordruck) in S1-Control, Web-Schale unter http://127.0.0.1:8080/. Repository-Stand zum Prüfzeitpunkt: dee1f01 (der Auftrag nannte 15ecdbd).

## Scope und Methodik

- Gelesen: `docs/audits/README.md`, `docs/audits/thw-command-reviewer.md` (Form), `docs/v2/entwurf/nachrichten/KONZEPT-NACHRICHTEN.md` (§3, §5, §11), `UMSETZUNGSBERICHT.md`, `stand/README.md` samt zwei Aufnahmen, Abschnitt „Nachrichten" in `docs/v2/HANDBUCH.md`. Zur Klärung von Beobachtungen wurde punktuell Quellcode gelesen; geändert wurde nichts außer dieser Datei.
- **Live geprüft** mit Playwright/Chromium (Viewport 1320 x 860), je Rolle ein eigener Browser-Kontext: SICHTER (Hz. Si), zweiter Sichter (Zw), FmZ (Fm), S2 (Kl), S3 (Dr), S4 (Ru), später ein später hinzukommender Sichter (Sp). Einsatz „Review Sichter" auf dem Share, dazu acht Probe-Einsätze „Review Sichter Probe 1 bis 8" für Vorversuche. Andere Einsätze wurden nicht angefasst.
- Durchgespielt: drei Eingänge (Einfach, Sofort, Blitz) von der FmZ aufnehmen, in der Sicht Sichter lesen, quittieren, verteilen (S2 rot vorbelegt, S4 grün, S3 blau, Freitext „Polizei", S1 blau), Vermerke; Gegenprobe in den Posteingängen S2/S3/S4; Suche nach einer Nachsichtung; zwei Sichter an derselben Nachricht (einmal mit Sperrhinweis, einmal als Wettlauf, einmal mit zeitlichem Abstand); Gesprächsnotiz „An den Sichter"; „kein Sichter besetzt" mit Ersatzsichter durch die FmZ und anschließend ein später kommender Sichter; Ablage über Posteingang, Nachweisung und Einsatztagebuch.
- Screenshots und Skripte: `/tmp/claude-0/-home-user-S1-Control/03036fe6-b619-5ee0-aa3a-bdc9e86fdba4/scratchpad/review-si/` (Nummern 10 bis 94; genannt werden die tragenden).
- **Annahmen** sind als „Annahme" gekennzeichnet. Die Lehrunterlage (Folien 28 und 29) lag nicht vor; sie wird nur so zitiert, wie der Auftrag und das Konzept sie wiedergeben. Der Papierweg (welche Kopie welche Farbe trägt, Spaltenbedeutung im Verteilerraster) ist Annahme.
- Nicht geprüft: Desktop-Schale, echter Druck, Datei-Share mit mehreren Rechnern (hier ein Dienst, mehrere Browser). Station LdF vor dem Sichter: **in Arbeit**, nicht bewertet (im laufenden Dienst gab es keinen LdF-Reiter; im Code existiert schon eine Sicht „ldf").

## Kurzes Urteil

Der Regelweg trägt: Die Sicht Sichter ordnet richtig (Blitz, Sofort, Einfach), Uhrzeit und Handzeichen sind vorbelegt, S2 rot ist vorbelegt, die Verteilung kommt bei den richtigen Stellen an und bei den falschen nicht, Tagebuch und Lese-Ansicht halten Hz., Verteiler und Vermerke fest. Für das Tagesgeschäft eines gut besetzten Sichters ist das brauchbar.

Brüchig wird es genau an den Stellen, an denen der Sichter die Engstelle des Nachrichtenflusses ist: Eine einmal gesichtete Nachricht lässt sich in der Oberfläche **nicht mehr nachsichten** (der im Handbuch beschriebene Weg existiert nicht), das Ansehen eines fremden Posteingangs **quittiert für die fremde Stelle**, und zwei Sichter können sich **still den Verteiler wegnehmen**. Dazu kommt, dass der Sichter selbst keinen Eingang mit Vorrang gemeldet bekommt und den Inhalt beim Verteilen nicht neben dem Laufzettel sieht. Die Mahnung „Wenn jeder alles bekommt, wird jeder zum S2" wird von den Vorbelegungen nur halb getragen.

Befunde: P0 = 3, P1 = 5, P2 = 5, P3 = 4.

---

## P0 – Einsatzkritisch

### P0-1 Eine gesichtete Nachricht lässt sich nicht nachsichten

**Beobachtung.** Nach dem Sichten verschwindet die Nachricht aus der Sicht Sichter („Keine Nachricht in ‚Sichter'", Aufnahme `80-spaeter-sichter-sicht.png`). Der Laufzettel öffnet nur in der Sicht Sichter; diese zeigt nur Nachrichten im Laufzustand VOR_SICHTER.
- `packages/domaene/src/projektion/nachrichten.ts:123-124` (Sicht „sichter" = nur VOR_SICHTER)
- `apps/desktop/src/renderer/Nachrichten.tsx:315-317` (Laufzettel nur bei `sicht === "sichter"` und gewählter Zeile)
- `apps/desktop/src/renderer/Laufzettel.tsx:137` (der Kopf „2. Sichtung" ist damit nie erreichbar)
- Im Posteingang einer Stelle bietet die Leiste nur Lesen, Erledigt, Antworten, Weiterleiten, Als Vordruck drucken, Im Tagebuch zeigen, Zurückziehen; kein Nachsichten (`41-si-post-sel.png`, Skript `i.js`).
- Handbuch (`docs/v2/HANDBUCH.md:398-399`) und Konzept (§5, „kann nachsichten") versprechen es ausdrücklich.

Fall aus dem Auftrag, wörtlich nachgespielt: Verteiler nachträglich erweitern (z. B. S6 oder Leiter dazu): nicht möglich. Fall „kein Sichter besetzt": Die FmZ hat E 5 selbst verteilt, nur an S2 (rot). Der später dazukommende Sichter (Sp) sieht in seiner Sicht nichts, im eigenen Posteingang nichts und in der Nachweisung nichts über die Sichtung (`80-`, `81-`). Er kann die Verteilung der FmZ weder prüfen noch ergänzen.

**Auswirkung.** Ein falscher oder zu knapper Verteiler bleibt stehen. Der Sichter, der später kommt, hat keine Handlung zur Hand; der einzige Notbehelf wäre „Weiterleiten" als neue Nachricht mit neuer Nummer oder Zurückziehen (nicht getestet, Annahme nach Handbuch). Beides erzeugt Doppelnachrichten im ETB.

**Vorschlag.** Eine Auswahl „Nachsichtung" in der Sicht Sichter (Filter „heute von mir gesichtet" und „von Ersatzsichter gesichtet"), die den vorhandenen Laufzettel im Modus „2. Sichtung" öffnet, vorbelegt mit dem geltenden Verteiler. Nachrichten, die der Ersatzsichter verteilt hat, mit Marke „Ersatzsichtung, bitte prüfen" in der Warteschlange lassen, bis ein Sichter sie bestätigt.

### P0-2 Der Sichter quittiert beim Ansehen eines fremden Posteingangs für diese Stelle

**Beobachtung.** Der Sichter schaltet im Posteingang auf „Posteingang von S4" (der naheliegende Weg zur Kontrolle seiner Verteilung) und öffnet die Blitz-Nachricht mit „Lesen". Das Programm schreibt die Kenntnisnahme **für S4**, mit Zeit und **Handzeichen des Sichters**: im Laufzettel „S4 · grün · gelesen 171338nov26 Si" (`64-si-liest-s4.png`), im Einsatztagebuch „zur Kenntnis genommen (Hz. Si) von S4", im echten S4-Kontext springt die Marke von „neu" auf „gelesen" (`65-s4-nach-si-lesen.png`), obwohl S4 die Blitz-Nachricht nie geöffnet hat.
- `apps/desktop/src/renderer/useNachrichtenschritte.tsx:68-81` (`lesen` schreibt `kenntnisFuerStellen(ziel, stellen, …)` mit den Stellen der **angezeigten** Sicht, nicht der eigenen Sitzung)
- `useNachrichtenschritte.tsx:94` (Erledigt entsprechend), Handbuch-Text „nur für eigene Stellen" gilt damit nur, solange man die eigene Sicht ansieht.

**Auswirkung.** Die Marke „neu" ist das Signal, an dem S4 erkennt, dass er etwas offen hat. Sie wird vom Sichter gelöscht, ohne dass S4 etwas weiß; das Tagebuch hält „S4 hat Kenntnis genommen" fest, das nie stattfand. Bei einer Blitz-Nachricht ist das einsatzkritisch, und es trifft ausgerechnet die Kontrolle, die der Sichter am häufigsten macht.

**Vorschlag.** In fremden Posteingängen ist „Lesen" reine Ansicht (keine Kenntnisnahme, kein Erledigt, deutlich gekennzeichnet „Ansicht für S4"). Kenntnis und Erledigt nur für Stellen der eigenen Sitzung. Aufnahme in die Regressionstests.

### P0-3 Zwei Sichter an derselben Nachricht: ein Verteiler geht still verloren, beide melden Erfolg

**Beobachtung.**
- Sperre: Öffnet der zweite Sichter dieselbe Nachricht, steht im Laufzettel „🔒 wird von Arbeitsplatz bearbeitet" (`66-si2-sperre.png`), die Eingabe bleibt möglich (weiche Sperre, wie vorgesehen).
- Wettlauf (E 6, beide drücken „Sichten" fast gleichzeitig): Sichter Sp verteilt an S2 und S4, Sichter Zw an S2 und S3. Beide Oberflächen melden „Nachricht gesichtet … gespeichert" (`85-si2-nach-wettlauf.png`). Im Tagebuch stehen beide Sichtungen. In den Posteingängen liegt E 6 aber nur bei S2 und S3; **S4, der Hauptempfänger des einen Sichters, hat sie nicht** (`q.js`, Ausgabe „S4 POST", „S3 POST"). Als Hinweis erscheint nur ein Zähler „⚠ 1 Konflikthinweis" in der Statusleiste; sein Text ist die allgemeine Feldkonflikt-Erklärung („Betroffene Felder tragen in der Tabelle ein ⚠ … Angezeigt wird der jüngere Wert", `93-konflikthinweis.png`); in der Nachrichtenliste gibt es kein ⚠.
- Zeitlicher Abstand (Sp sichtet, Zw hat den Laufzettel offen, mit angekreuztem S3 und Vermerk): Nach etwa 7 Sekunden ist der Laufzettel des zweiten Sichters **ohne Meldung weg**, samt Eingaben (`90-si2-laufzettel-weg.png`).
- Quelltext: `apps/desktop/src/kontrakt/nachrichtenschritte.ts:14-20` (bewusst „ohne Vorwert-Prüfung", „beide Verteiler gelten"); beobachtet wird aber ein Gewinner nach Schreibzeit. Das Handbuch (`HANDBUCH.md:344-347`) verspricht „meldet es".

**Auswirkung.** Ein Sichter glaubt, S4 sei versorgt, und S4 bekommt nichts, ohne dass irgendwer es merkt. Da Nachsichtung fehlt (P0-1), lässt sich der Konflikt auch nicht auflösen; die Zeile „führt beide Verteiler, bis eine Nachsichtung bereinigt" (Quelltext) hat kein Bedienelement. Bei zwei besetzten Sichtern (Schichtwechsel, Ablösung) ist das kein Randfall.

**Vorschlag.** Beim Konflikt die Verteiler **vereinigen** (Vereinigungsmenge, jeweils mit Kopiefarbe des Erstsichters), im Laufzettel des Zweiten eine sichtbare Meldung „Hz. Si hat gerade gesichtet: S2, S4 …; Ihre Eingaben bleiben stehen, übernehmen?" statt Verschwinden, und einen nachrichtenspezifischen Hinweistext statt des Tabellentexts. Alternativ den Zweiten beim Wählen einer gesperrten Nachricht blockieren.

---

## P1 – Hoch

### P1-1 Ein Eingang mit Blitz oder Sofort wird dem Sichter selbst nicht gemeldet

**Beobachtung.** Treffen Blitz- und Sofort-Eingänge ein, zeigt der Sichter nur die Kachel „Vor dem Sichter" (kein Ton, kein Hinweisblock, keine Zahl am Reiter „Nachrichten", `60-si-drei-eingaenge.png`). Der Hinweis „Blitz-Nachricht E 3 für S4" und der Ton gehen erst an die Empfänger **nach** der Sichtung (Handbuch Zeilen 352-356). Die Kachel „Mit Vorrang offen" (`Nachrichten.tsx:92`) ist bernsteinfarben, zählt aber auch gesichtete, noch nicht erledigte Vorrangnachrichten; nach dem Sichten aller drei Eingänge blieb sie bei 2 (`85-`), sie sagt dem Sichter also nicht, was in **seiner** Warteschlange brennt.

**Auswirkung.** Wer nicht auf dem Blatt „Nachrichten" steht (Lage, Führungsstelle), merkt den Blitz im Eingang nicht. Ausgerechnet der Engpass bekommt keinen Alarm.

**Vorschlag.** Hinweis und Ton auch für den Sichter beim Eintreffen eines Eingangs mit Vorrang; Zahl am Reiter; Kachel „Vor dem Sichter" bernsteinfarben, wenn darunter Vorrang liegt, und „Mit Vorrang offen" in „Vorrang bei den Empfängern offen" umbenennen oder teilen.

### P1-2 Der Inhalt ist beim Sichten nicht neben dem Laufzettel lesbar

**Beobachtung.** Wählt der Sichter eine Zeile, erscheint unter der Liste nur der Laufzettel; die Liste zeigt Absender, Anschrift, Abfassungszeit, Betreff, aber weder Inhalt noch Eingangszeit noch Mittel/Gegenstelle (`14-si-laufzettel.png`). Den Text liest der Sichter nur über „Lesen" in einem Dialog über dem Laufzettel (`21-si-lesen-vor-sichtung.png`). Escape schließt den Dialog und hebt zugleich die Auswahl auf, der Laufzettel verschwindet (Aufnahme `22-si-nach-esc.png`); mit „Schließen" statt Escape bleibt die Auswahl (nicht eigens geprüft, Annahme). Die Reihenfolge „innerhalb der Stufe nach Eingang" ist nicht ablesbar, weil die Eingangszeit der FmZ (Aufnahme) in der Liste fehlt; die Abfassungszeit ist eine andere Größe.

**Auswirkung.** Der Sichter muss den Verteiler aus dem Gedächtnis festlegen, nachdem er den Text in einem anderen Fenster gelesen hat; mit Escape verliert er Eingaben. Das Papier legt Text und Laufzettel auf ein Blatt.

**Vorschlag.** Inhalt (gekürzt, 12 Zeilen) und Aufnahmevermerk oberhalb des Laufzettels im selben Bereich zeigen; Spalte „Eingang" (Aufnahmezeit, Hz.) und eine Inhaltsvorschau in die Liste; beim Öffnen die oberste Zeile (Blitz) vorwählen.

### P1-3 Die Mahnung „Nicht jeder alles" wird nicht unterstützt

**Beobachtung.** Vorbelegt ist nur S2 rot (`apps/desktop/src/renderer/Laufzettel.tsx:37`, gut). Jede weitere angekreuzte Stelle bekommt automatisch **grün (Hauptempfänger)** (`Laufzettel.tsx:40-43`): Bei S4 und S3 stehen zwei Hauptempfänger (`23-si-verteiler-s4-s3.png`). Eine Nachricht ohne jeden Hauptempfänger (nur S2 rot) lässt sich ohne Rückfrage sichten; so ist E 5 vom Ersatzsichter FmZ nur an S2 gegangen (`80-`, Tagebuchzeile „E 5 gesichtet (Hz. Fm), verteilt an S2 (rot)"). Es gibt weder Vorschläge je Absender, Vorrang oder Betreff noch einen Zähler der Verteilerbreite.

**Auswirkung.** Der Sichter hat nur das eigene Augenmaß. Gerade unter Last (Ersatzsichter, Nachtschicht) landen Nachrichten bei „S2 allein" (niemand handelt) oder bei vielen Grünen (niemand fühlt sich zuständig).

**Vorschlag.** Beim Sichten eine ruhige Warnzeile bei null Hauptempfängern und bei mehr als einem; „zuletzt gleiche Absender" als Ein-Klick-Vorschlag (zuletzt verwendeter Verteiler je Absender, nur als Vorbelegung, nicht erzwungen); Anzahl der Empfänger neben dem Knopf „Sichten".

### P1-4 Der Wechsel zum Ersatzsichter dauert über zwei Minuten und niemand sieht den Stau

**Beobachtung.** Der Sichter-Kontext wurde geschlossen. Die FmZ meldete erst nach rund **130 Sekunden** „Kein Sichter besetzt" in der Aufnahmemaske; davor lief jede Aufnahme gegen einen Sichter, der nicht mehr da war (zwei Messungen, 130 s, `71-fm-ersatzsichter-maske.png`, Ausgabe Skript `j.js`). In dieser Zeit steht die Nachricht „vor dem Sichter", ohne dass jemand es sieht; die Kachel zählt hoch, aber kein Hinweis „Sichter seit n Minuten nicht erreichbar". Offene Fenster, die vor einem Rechnerabsturz Präsenz hinterlassen haben, zählen mit („10 weitere Arbeitsplätze" nach acht Probeläufen, Statusleiste).

**Auswirkung.** Im Störfall (Absturz, Netz) staut sich der Fluss zwei Minuten lang lautlos. Der Sichter, der sich später wieder anmeldet, findet seine Nachrichten teils schon vom Ersatzsichter verteilt (P0-1).

**Vorschlag.** Warnung auf FmZ und Blatt: „Eingänge warten seit n Minuten, letzter Sichter vor n Minuten gesehen" mit Ein-Klick „Ich sichte jetzt selbst". Präsenzfrist kürzer oder abmeldbar beim Schließen. (Annahme: Die 130 s sind die Präsenzfrist bei hartem Schließen; ein sauberes Abmelden wurde nicht geprüft.)

### P1-5 Es gibt keine Ablage für „was ich heute gesichtet habe"

**Beobachtung.** Sicht Sichter: nur offene Eingänge. Eigener Posteingang des Sichters: leer (er steht in keinem Verteiler). Nachweisung: Spalten Vorrang, E/A, Nr., Von, An, Aufnahme, Annahme, Beförderung, Abfassungszeit, Betreff; **keine Spalte Sichtung, Verteiler oder Vermerke** (`42-si-Nachweisung.png`; der Umsetzungsbericht nennt Sichtung und Marken in der Nachweisung, die Bildschirmansicht hat sie nicht). Einzig zwei Wege: das Einsatztagebuch (jede Sichtung mit Hz. und Verteilerliste, aber ohne Filter nach Handzeichen und ohne Vermerke) und das Umschalten auf „Posteingang von S2", der wegen der roten Kopie alles enthält (`82-spaeter-post-s2.png`), ein Behelf, der bei abgewähltem S2 versagt und P0-2 auslöst. Offenes Band: Kachel „Vor dem Sichter" und die Sicht selbst, das ist gut gelöst.

**Auswirkung.** Der Sichter kann am Schichtende weder „meine Sichtungen" zählen noch übergeben noch einen Verteilerfehler nachvollziehen.

**Vorschlag.** Sicht „Gesichtet" (heute / meine / Ersatzsichtung) mit Verteiler und Vermerken; in der Nachweisung Spalten Sichtung (Zeit, Hz.) und Verteiler.

---

## P2 – Mittel

### P2-1 Die Verteilermatrix entspricht nicht dem Vordruck und wird lang

**Beobachtung.** Der Laufzettel ist eine senkrechte Liste: je Stelle ein Kästchen und darunter ein breites Auswahlfeld für die Kopiefarbe; die restlichen Stellen stehen als zweite Kästchenreihe (`32-si-blitz-verteiler.png`). Der Vordruck hat ein Raster (Zeilen S1 bis S4, S6, Spalten, „TEL / EL / EAL / UEAL" als eigene Zeile, `92-vordruck-canvas.png`). Bei vier Empfängern ist die Seite 1140 Pixel hoch; bei Viewport 860 liegt „Sichten" unter der Falz. Zwischen Quittung und Verteiler klafft eine Leerfläche von ca. 80 Pixeln. „Leiter" ist ein Kästchen, die Unterscheidung TEL, EL, EAL, UEAL fehlt (Annahme: im Vordruck vorgesehen, die Bibliothek bildet nur ein Kästchen ab, `vendor/bos-nachrichtenvordruck/src/formularGeometrie.ts:163`).

**Auswirkung.** Mehr Scrollen und Klicken als nötig, kein Wiedererkennen des Papiers.

**Vorschlag.** Kompakte Matrix: Zeilen = Stellen, Spalten = grün / blau / rot als Klickfelder; ein Klick setzt Stelle und Farbe zugleich.

### P2-2 Kopiefarbe und Ausfertigungen: der Druck bildet die Farben nicht ab, kein Hinweis auf zu wenig Blätter

**Beobachtung.** Im Ausdruck stehen S1 bis S6 und Leiter immer in Spalte 1; Freitext (hier „Polizei") und alle Nicht-Sachgebiete in Spalte 3, im Beispiel in der Zeile „S 1" (`92-vordruck-canvas.png`; `packages/ausgaben/src/nachricht.ts:185-216`). Die Farbe grün/blau/rot taucht auf dem Ausdruck nicht auf. Die Oberfläche zählt die Ausfertigungen nicht gegen die Blätter des Vordrucks und sagt nichts von „Kopien fertigen" (Papierweg, Folie 29: bei mehr Ausfertigungen als Blättern fertigt der Sichter Kopien, das soll die Ausnahme sein).

**Auswirkung.** Wer nach dem Ausdruck verteilt, erkennt die Farbzuordnung nicht; die Zeile „S 1 / Polizei" liest sich als S1 mit Polizei. Eine Nachricht mit vier Empfängern plus S2 braucht Kopien, ohne dass die Maske es sagt. (Annahme: Welche Spalte welcher Farbe entspricht, ist aus der Ausfüllanleitung abzuleiten und lag nicht vor.)

**Vorschlag.** Ausfertigungszähler („5 Empfänger, 4 Blätter: 1 Kopie nötig") im Laufzettel; Farbe als Kürzel (G/B/R) im Raster.

### P2-3 Gesprächsnotiz: Voreinstellung „Selbst verteilen" umgeht den Sichter

**Beobachtung.** Die Maske öffnet bei einer Gesprächsnotiz mit gesetztem „Selbst verteilen", obwohl ein Sichter besetzt ist (`50-s3-gespraechsnotiz-maske.png`; `apps/desktop/src/renderer/Vordruckeingabe.tsx:125-131`). „An den Sichter" muss aktiv gewählt werden; dann erscheint die Notiz ohne Nummer („—") in der Sicht Sichter und lässt sich normal sichten (gut gelöst). Das Konzept (§5) sieht beides vor; die Lehrunterlage zählt Gesprächsnotizen zu den gesichteten Nachrichten (Folie 16 laut Konzept).

**Auswirkung.** Der Normalfall landet am Sichter vorbei; Verteiler und Quittung stammen vom Verfasser. Bei „jeder verteilt selbst" ist die Mahnung „nicht jeder alles" nicht mehr durchsetzbar.

**Vorschlag.** Vorbelegung „An den Sichter", wenn einer besetzt ist; „Selbst verteilen" als bewusste Ausnahme.

### P2-4 Der Sperrhinweis nennt nicht, wer sichtet

**Beobachtung.** Der Text lautet „wird von Arbeitsplatz bearbeitet" ohne Namen, Stelle oder Handzeichen (`66-si2-sperre.png`, `apps/desktop/src/renderer/useBearbeitungssperre.ts:31`). Er sperrt nicht, was bei dieser Weichheit nur im Zusammenspiel mit P0-3 problematisch ist.

**Auswirkung.** Der zweite Sichter kann sich nicht absprechen („Zw sichtet gerade"), die Sperre ist ein Textfeld.

**Vorschlag.** Stelle und Hz. des Halters nennen; bei Sichtern zwei Sekunden Rückfrage „Si bearbeitet diese Nachricht, trotzdem öffnen?".

### P2-5 Vermerke des Sichters sind für die Empfänger kaum sichtbar

**Beobachtung.** In Posteingang und Hinweisblock stehen Vorrang, Absender, Betreff, nicht der Vermerk (Feld 20); der Empfänger sieht ihn nur nach „Lesen" (`64-`). Der Vermerk „Kräfte Abschnitt Nord umlenken; Rückmeldung in 10 Min an S3" ist aber die eigentliche Handlungsanweisung. Auch im Tagebuch fehlt er.

**Auswirkung.** Wer nur die Liste oder den Blitz-Hinweis liest, übersieht den Auftrag.

**Vorschlag.** Vermerk als Zusatzspalte oder im Hinweis „Blitz-Nachricht E 3 für S4: Deichbruch droht — Vermerk: …"; ins Tagebuch aufnehmen.

---

## P3 – Gering

### P3-1 Quittungszeit ist beim Öffnen eingefroren
`Laufzettel.tsx:111` setzt die Uhrzeit einmal beim Aufschlagen. Wer drei Minuten verteilt, quittiert mit der Zeit des Aufschlagens (Feld ist änderbar). Vorschlag: beim Drücken von „Sichten" die Zeit setzen, solange das Feld unverändert ist.

### P3-2 Escape hebt Auswahl und Laufzettel zugleich auf
Siehe P1-2; getrennt zu behandeln, damit Eingaben nicht verfallen (Aufnahme `22-si-nach-esc.png`).

### P3-3 „S5" fehlt (Annahme)
Verteiler führt S1 bis S4, S6 wie der Vordruck (`nachricht.ts:172`); die Fachbezeichnung „S1 bis S6" im Auftrag legt S5 nahe. Als Freitext möglich, dann ohne Kästchen. Nur prüfen, ob gewollt.

### P3-4 Die Zählung „n weitere Arbeitsplätze" läuft auf
Verlassene Kontexte zählen minutenlang mit (siehe P1-4); die Zahl hilft dem Sichter bei der Frage „Ist noch ein zweiter Sichter da?" nicht, weil sie keine Stellen nennt. Vorschlag: besetzte Stellen als Chips in der Statusleiste.

---

## Was gut gelöst ist

- Reihenfolge in der Sicht Sichter stimmt: Blitz, Sofort, dann Einfach, mit roter und bernsteinfarbener Marke (`20-`, `60-`).
- Quittung mit Zeitgruppe und Handzeichen ist vorbelegt, S2 ist rot vorbelegt und abwählbar, freie Stelle („Polizei") und Vermerke gehen ohne Umweg; „Sichten" zeigt eine Statuszeile und ein Rückgängig.
- Die Verteilung kam exakt an: S2 sah alle drei Nachrichten (rot), S3 die Blitz-Nachricht (blau) und die einfache (grün), S4 Blitz und Sofort (grün); S3 sah E 2 nicht, S4 sah E 1 nicht (`63-`).
- Die Lese-Ansicht zeigt den Laufzettel je Stelle mit Kopiefarbe und Lesezustand (`64-`); das Einsatztagebuch hält jede Sichtung mit Hz. und Verteiler fest.
- Die Vorschau „Wie gedruckt" gibt den Vordruck mit Quittung, Handzeichen und Vermerken wieder.
- Das Ersatzsichter-Verhalten der FmZ (Laufzettel gleich in der Aufnahmemaske, `docs/v2/entwurf/nachrichten/stand/eingang-maske.png`) ist ein tragender Gedanke; nur die Reaktionszeit und die Nachsichtung fehlen (P1-4, P0-1).

## Station LdF vor dem Sichter

In Arbeit (bekannte Lücke). Im laufenden Dienst nicht sichtbar, daher nicht bewertet. Vorab zu klären: Bekommt der Sichter die Weitergabe des LdF mit Marke und Hinweis (vgl. P1-1)?
