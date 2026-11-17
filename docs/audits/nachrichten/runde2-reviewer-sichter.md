# Audit Nachrichten, zweite Runde: Sichter (Führungsgehilfe in der Führungsstelle)

Datum: 2026-11-17
Rolle des Prüfers: Sichter in einer THW-Führungsstelle (quittiert jeden Eingang mit Uhrzeit und Handzeichen, legt den Verteiler fest, schreibt Vermerke, bearbeitet Blitz vor Sofort vor Einfach). Dieselbe Rolle wie in `reviewer-sichter.md`.
Gegenstand: Funktion „Nachrichten“ (4-fach-Vordruck) in S1-Control, Web-Schale unter http://127.0.0.1:8080/. Repository-Stand: main a0e53b5.

## Scope und Methodik

- Gelesen: das erste Audit (`reviewer-sichter.md`), die Befundliste (`README.md`, Status je Befund), `KONZEPT-NACHRICHTEN.md` §5 und §11 (Entscheidungen 1 bis 14), der Abschnitt „Nachrichten“ in `docs/v2/HANDBUCH.md` und das Übungsdrehbuch `UEBUNG-NACHRICHTEN.md` (Minute 15, 35, 45, 55 nachgespielt). Quelltext wurde nur gelesen, um Beobachtungen zu erklären; geändert wurde nichts außer dieser Datei.
- **Live geprüft** mit Playwright/Chromium (Viewport 1320 x 860), je Rolle ein eigener Browser-Kontext: FMZ (Fm), LDF (Ld), SICHTER (Si, ich), zweiter Sichter (Zw), S2 (Kl), S3 (Dr), S4 (Ru). Einsatz „Runde 2 Sichter“ auf dem Share `review2-share`, „LdF als eigene Station“ eingeschaltet. Fremde Einsätze anderer Reviewer wurden nicht angefasst.
- Durchgespielt: zehn Eingänge (einfach, Sofort, Blitz; einer mit Anschrift „S3“) von der FmZ über den LdF zum Sichter; Verteilen mit allen Kopiefarben und Freitext; Gegenprobe in den Posteingängen S2, S3, S4; Ansicht des Posteingangs von S4 durch den Sichter; Nachsichtung; zwei Sichter an derselben Nachricht (gleichzeitig und mit zeitlichem Abstand); Ersatzsichter durch die FmZ und Rückkehr des Sichters; Sichterstau; Schichtwechsel nach Drehbuch Minute 55 mit gestoppter Zeit.
- Screenshots und Skripte: `/tmp/claude-0/-home-user-S1-Control/03036fe6-b619-5ee0-aa3a-bdc9e86fdba4/scratchpad/review2-si/` (genannt werden die tragenden Aufnahmen, z. B. `21-`, `32-`, `41-`, `53-`, `72-`, `85-`, `93-`, `97-`).
- **Annahmen** sind als „Annahme“ gekennzeichnet. Der Ton beim Blitz ist in der Web-Schale ohne Audioausgabe nicht prüfbar (Annahme: er spielt, wenn der Hinweis erscheint). Der Papierweg (Kopiefarben, Spaltenbedeutung) bleibt Annahme.
- Nicht gewertet (bekannte Grenzen): stiller Druck, Mischbetrieb mehrerer Rechner. Nicht geprüft: Desktop-Schale, echter Druck, Share mit mehreren Rechnern (hier ein Dienst, mehrere Browser).
- Zeiten sind mit der Skriptuhr gestoppt und auf Sekunden gerundet; Browser-Kontexte, die ich geschlossen habe, zählten mit Ausnahme des gemessenen harten Ausfalls nicht als Geisterplätze.

## Nachgeprüft

Status laut README, danach mein Befund aus der Nachstellung. „bestätigt“ heißt: Der Befund ist behoben, wie dort angegeben. „anders gelöst“ gibt es hier nicht.

| Kennung | Status laut README | Mein Befund |
|---|---|---|
| Sichter P0-1 Nachsichtung | behoben | bestätigt: Sicht „gesichtet“, Laufzettel „· Nachsichtung“ mit geltendem Verteiler vorbelegt, Knopf „Nachsichten“; ein Nachtrag (S1 blau) kam bei S4 und S3 an (`41-`, `42-`). |
| Sichter P0-2 Fremder Posteingang quittiert | behoben | bestätigt: „Posteingang von S4“ zeigt „Nur lesen, Kenntnis gibt S4 selbst.“; nach „Lesen“ steht S4 weiter auf „neu“, die Lese-Ansicht zeigt „S4 · grün · neu“ (`36-`). |
| Sichter P0-3 Zwei Sichter, Verteiler geht verloren | behoben | bestätigt für die Verteiler: S3 und S4 haben E 3 (grün), Marke „zwei Sichtungen“ bei S2, S3, S4, Tagebuch führt beide Sichtungen; bei Abstand bleibt der Laufzettel mit Meldung „Inzwischen von Si gesichtet, Verteiler: S2 (rot), S3 (grün). Ihre Eingaben bleiben …“ (`53-`). Der Vermerk des Ersten geht aber verloren, siehe R2-Si P1-2. |
| Sichter P1-1 Vorrang nicht an den Sichter gemeldet | behoben | bestätigt, mit Einschränkung: Hinweis „Blitz-Nachricht E 2 für Sichter“ kommt rund 3 s nach der Weitergabe des LdF (ohne LdF sofort beim Aufnehmen); Blitz-Hinweise bleiben bis „Löschen“. Der Reiter „Nachrichten“ trägt beim Sichter keine Zahl (R2-Si P2-5); ein Blitz, der noch beim LdF liegt, wird nirgends gemeldet (R2-Si P1-1). Ton Annahme. |
| Sichter P1-2 Inhalt beim Sichten nicht lesbar | behoben | bestätigt: Der Laufzettel zeigt Betreff, Eingangszeit und Inhalt, die Liste hat die Spalte „Eingang“ (Zeit und Handzeichen), Reihenfolge Blitz, Sofort, dann Einfach nach Eingang stimmt (`20-`, `30-`). |
| Sichter P1-3 „Nicht jeder alles“ | teilweise behoben | teilweise bestätigt, wie im README: Vorbelegung S2 rot, Anschrift grün (E 4 an S3: „S2 rot, S3 grün“), Freitext und neu angekreuzte Stellen blau, Warnung „Kein Hauptempfänger: Keine Stelle hat die grüne Kopie – wer soll handeln?“ verschwindet mit dem ersten grünen Kreuz. Der Vorschlag „zuletzt gleiche Absender“ und eine Empfängerzahl am Knopf „Sichten“ fehlen weiter. |
| Sichter P1-4 Wechsel zum Ersatzsichter, Stau unsichtbar | behoben | bestätigt: Schließen über „Einsatz schließen“ bis „Kein Sichter besetzt“ in der FmZ-Maske **3 s** (vorher 130 s); harter Ausfall (Netz weg, Kontext zu) **125 s**; Stauhinweis „2 Eingänge warten vor dem Sichter“ mit Karte und „Ich sichte jetzt selbst“ (`72-`). Die Schwelle trifft Blitz wie Einfach (R2-Si P2-2). |
| Sichter P1-5 Keine Ablage „heute gesichtet“ | behoben | bestätigt: Sicht „gesichtet“ mit Marke; die Nachweisung hat die Spalte „Sichtung“ und je Zeile Verteiler und Vermerke (`97-`). |
| Sichter P2-1 Verteilermatrix | behoben | bestätigt: Raster mit Spalten G, B, R je Stelle, eine Aktion setzt Stelle und Farbe; gemessene Höhe siehe R2-Si P3-3. TEL/EL/EAL/UEAL fehlen weiter (Annahme: nicht Teil der Bibliothek). |
| Sichter P2-4 Sperrhinweis ohne Namen | behoben | bestätigt: „🔒 wird von Arbeitsplatz (Sichter · Hz. Si) bearbeitet“, beim Rollentausch „Hz. Zw“. Die Sperre bleibt weich, wie vorgesehen. |
| Sichter P2-5 Vermerke für Empfänger unsichtbar | behoben | bestätigt für die Zeile: „Vermerk: Kräfte Abschnitt Nord umlenken; …“ steht bei S2, S3, S4 in der Posteingangszeile (`34-`). Das Einsatztagebuch zeigt die Sichtung mit Hz. und Verteiler, aber ohne Vermerk; dafür trägt ihn die Nachweisung. |
| Sichter P3-1 Quittungszeit eingefroren | behoben | bestätigt: Feld 172029nov26 beim Öffnen, 172030nov26 nach 70 s; Tagebuch trägt 20:30:25, die Sekunde des Klicks auf „Sichten“. |
| Sichter P3-2 Escape hebt Auswahl und Laufzettel auf | behoben | **nicht behoben**, nur zur Hälfte: Escape im Laufzettel selbst fragt nach („Eingaben im Laufzettel verwerfen? … die Auswahl bleibt“) und hält die Auswahl, wie gebaut. Der Fall des ersten Audits (Lesen öffnen, Escape) besteht aber fort: ein Escape im Lesen-Dialog schließt den Dialog und hebt zugleich die Auswahl auf, Laufzettel samt Kreuzen und Vermerk sind weg, ohne Rückfrage (`26-`, Skript `e3.js`). Ursache: `Nachrichtenansicht.tsx:40-50` hört am Dokument ohne `stopPropagation`, die Auswahl hört mit. Mit dem Knopf „Schließen“ bleibt alles erhalten. |
| Sichter P3-4 Zählung „n weitere Arbeitsplätze“ | behoben | bestätigt: Nach „Einsatz schließen“ und nach geschlossenem Kontext fällt die Zahl sofort (Statusleiste); nur der harte Ausfall hängt an der Frist von 125 s. |
| Sichter P3-3 S5 | bewusst nicht | Entscheidung 12 wie beschrieben: Raster führt Leiter, S1 bis S4, S6, Fachberater, Verbindungsstelle, „Weitere Stelle“ als Freitext; S5 ohne Kästchen. Nicht gewertet. |
| Sichter P2-2, P2-3 | offen | nicht Auftrag; nebenbei: P2-3 besteht fort (Gesprächsnotiz bei besetztem Sichter öffnet mit „Selbst verteilen“ gesetzt, „An den Sichter“ aus, `94-`). |

Zählung der 14 geprüften Befunde mit Status „behoben“ oder „teilweise“: **12 bestätigt, 1 teilweise bestätigt (P1-3, wie im README), 1 nicht behoben (P3-2, Lesen-Dialog).**

## Kurzes Urteil

Gegenüber der ersten Runde ist der Sichter-Arbeitsplatz verlässlich geworden. Die drei Einsatzrisiken sind weg: Eine gesichtete Nachricht lässt sich nachsichten, das Ansehen fremder Posteingänge quittiert nicht mehr, und zwei Sichter verlieren keinen Verteiler mehr, sondern bekommen die Vereinigung, die Marke und eine Meldung. Der Wechsel zum Ersatzsichter dauert beim geordneten Schließen drei statt 130 Sekunden, der Stau wird der FmZ gemeldet, und der Laufzettel zeigt Inhalt, Eingangszeit, Anschrift in Grün, Warnung ohne Hauptempfänger, laufende Quittungszeit und den Namen des Sperrhalters. Das Drehbuch (Minute 15, 35, 45, 55) lässt sich ohne Hilfe nachspielen.

Offen sind jetzt andere Dinge, die alle mit den Übergaben zu tun haben: Vor dem Sichter steht die Station LdF, und ein Blitz, der dort liegt, löst nirgends einen Hinweis aus (R2-Si P1-1). Bei zwei Sichtern verliert der Zweite den Vermerk des Ersten unbemerkt (R2-Si P1-2). Eine Ersatzsichtung der FmZ trägt keine Marke, der heimkehrende Sichter sieht sie nur, wenn er sie sucht (R2-Si P2-1). Und das Lesen-Fenster ist die eine Maske ohne Fokusführung und mit dem alten Escape-Fehler.

Befunde neu: P0 = 0, P1 = 2, P2 = 5, P3 = 7.

---

## P1 – Hoch

### R2-Si P1-1 Ein Blitz beim LdF wird weder dem LdF noch dem Sichter noch der FmZ gemeldet

**Beobachtung.** Mit „LdF als eigene Station“ geht jeder Eingang zuerst zum LdF (Station vor dem Sichter). Aufnahme eines Blitz „Verletzte Helfer Deich“ (E 10): Der LdF, der auf dem Reiter „Lage“ steht, bekommt keinen Hinweis; beim Sichter und bei der FmZ erscheint ebenfalls nichts, auch nach 6, 60, 100 und 130 s nicht (Skript `m2.js`). Beim Sichter zählt nur die Kachel „Vor dem LdF“ (Aufnahme `11-si-vor-ldf.png`: Kachel 1, Sicht „Sichter“: „Keine Nachricht in ‚Sichter‘“). „Mit Vorrang offen“ blieb bei zwei Blitz-Eingängen beim LdF auf 0 (Skript `c2.js`: Kacheln 0/0/0/2/0/0). Erst die Weitergabe des LdF löst den Hinweis „Blitz-Nachricht E 2 für Sichter“ aus (rund 3 s später). Der Stauwächter (`apps/desktop/src/worker/sichterstau.ts:50-62`) zählt nur Eingänge im Laufzustand VOR_SICHTER, nicht VOR_LDF; ohne besetzten Sichter meldet er außerdem gar nichts (Zeile 52).
- Ohne LdF-Besetzung gilt die Ersatzregel: Der Blitz erreicht den Sichter sofort mit Hinweis (Skript `m1.js`, E 9). Der Befund betrifft also genau den Fall „LdF besetzt, aber gerade nicht am Rechner“.

**Auswirkung.** Der Blitz kann beim LdF liegen, solange dieser die Karte „Eingänge vor der Weitergabe“ nicht aufschlägt. Der Sichter weiß nur von der Kachel „Vor dem LdF“ und müsste sie von sich aus lesen; eine Zeitschwelle gibt es für diese Station nicht. Gerade die Einsatzleitung bei einer Blitz-Meldung bekäme nichts mit.

**Vorschlag.** Hinweis und Ton beim Eintreffen eines Vorrang-Eingangs beim LdF (wie beim Sichter), „Mit Vorrang offen“ zählt auch Vorrang vor dem LdF, und der Stauwächter bekommt eine Schwelle für VOR_LDF (die der FmZ), Hinweis an FmZ und Sichter mit dem Knopf „Ich gebe selbst weiter“ (Annahme: so wie beim Sichterstau).

### R2-Si P1-2 Bei zwei Sichtungen geht der Vermerk des Ersten verloren

**Beobachtung.** Der Vermerk ist die Handlungsanweisung des Sichters. Zwei Fälle, beide nachgespielt:
- **Gleichzeitig** (E 3, Si: „Si: S3 bearbeitet Sandsäcke.“ an S3, Zw: „Zw: S4 Sandsäcke liefern.“ an S4): S3 und S4 stehen im Verteiler (Vereinigung), bei **beiden** steht in der Zeile nur „Vermerk: Zw: S4 Sandsäcke liefern.“ (`g2.js`). S3 liest also eine Anweisung für S4 und nicht seine eigene.
- **Mit Abstand** (E 4, Si sichtet zuerst mit „Si: Lagebesprechung 18 Uhr, Raum 2.“, Zw hat den Laufzettel offen): Die Meldung übernimmt „die fremden Stellen“ (S2 rot, S3 grün), das Vermerkfeld von Zw bleibt „Zw: S1 informieren.“, der Vermerk von Si wird weder gezeigt noch übernommen. Nach „Nachsichten“ steht bei S3 nur „Zw: S1 informieren.“ (`g4.js`). Im Tagebuch steht der Vermerk des Ersten nicht (die Sichtungszeilen tragen keine Vermerke), in der Nachweisung nur der letzte.
- Die Meldung nennt nur den Verteiler: „Inzwischen von Si gesichtet, Verteiler: S2 (rot), S3 (grün). Ihre Eingaben bleiben, die fremden Stellen sind dazugenommen …“ (`53-`).

**Auswirkung.** Die Vereinigung der Verteiler hat den stillen Verlust der Empfänger beseitigt, aber der Auftrag des Ersten verschwindet stillschweigend, ohne Hinweis auf beiden Seiten. Beim Schichtwechsel mit zwei Sichtern ist das der Normalfall, nicht der Ausnahmefall.

**Vorschlag.** Die Meldung zeigt den fremden Vermerk im Wortlaut und übernimmt ihn mit Handzeichen in das Vermerkfeld („Si: … / Zw: …“); die Zeile führt beide Vermerke; das Tagebuch hält Vermerke fest (oder verweist auf die Nachweisung). Regressionstest für beide Reihenfolgen.

---

## P2 – Mittel

### R2-Si P2-1 Eine Ersatzsichtung der FmZ trägt keine Marke; der heimkehrende Sichter sieht nichts

**Beobachtung.** Die FmZ hat bei fehlendem Sichter E 7 (Sofort, Anschrift S4) selbst gesichtet (S2 rot, S4 grün vorbelegt, S4 bekam Hinweis und Zeile; `81-`, `82-`). Kehrt der Sichter zurück (neuer Kontext): Kacheln „Vor dem Sichter“ 2, Hinweise leer, keine Marke; E 7 steht in der Sicht „gesichtet“ unter allen anderen mit Stand „verteilt“, unterscheidbar nur über Handzeichen „Fm“ in der Nachweisung (`84-`, `85-`). Die Nachsichtung selbst geht (S3 blau und Vermerk kamen bei S3 an), der Laufzettel öffnet mit der **Quittungszeit der FmZ** (172047nov26) und meinem Handzeichen „Si“, also gemischt (Annahme: beabsichtigt, weil Nachsichtung die Zeit nicht neu setzt; ich habe sie nicht verändert).

**Auswirkung.** Das Drehbuch (Minute 55) verlangt „sichtet die Meldung nach“; wer wiederkommt, muss selbst wissen, was in seiner Abwesenheit verteilt wurde. Die Warteschlange der ersten Runde sah dafür eine Marke „Ersatzsichtung, bitte prüfen“ vor.

**Vorschlag.** Marke „Ersatzsichtung (Fm)“ an der Zeile und Filter „von Ersatzsichter gesichtet“ in der Sicht „gesichtet“; Hinweis „n Nachrichten wurden in Ihrer Abwesenheit von Fm gesichtet“ beim Wiederöffnen; die Marke fällt mit der Nachsichtung eines Sichters.

### R2-Si P2-2 Die Schwelle für „Ich sichte jetzt selbst“ gilt für Blitz wie für Einfach

**Beobachtung.** Die Karte „Vor dem Sichter“ mit „Ich sichte jetzt selbst“ erscheint erst, wenn ein Eingang die Schwelle der FmZ (Vorbelegung 20 min) vor dem Sichter wartet (`Sichterstau.tsx:46-49`). Bei auf 1 min gestellter Schwelle kam der Hinweis nach rund 100 s (nicht nach 90 s), die Zeile „Blitz 6 Hochwasserwarnung Hunte, seit 1 min“ stand unter der einfachen E 5 (Reihenfolge nach Nummer, nicht nach Vorrang, `72-`). Die Kachel „Über der Schwelle“ zählt Eingänge vor dem Sichter nicht mit.

**Auswirkung.** Bei besetztem, aber untätigem Sichter hat ein Blitz mit Standardwerten bis zu 20 Minuten Wartezeit, bevor die FmZ ihn selbst verteilen darf. Die Konzeption (Vorrang zuerst) spricht dagegen. (Annahme: Die Karte wurde nur für den Normalfall gedacht.)

**Vorschlag.** Eigene, kürzere Schwelle für Sofort und Blitz (z. B. 5 und 2 Minuten, als Einsatzparameter), Karte nach Vorrang sortieren.

### R2-Si P2-3 Das Lesen-Fenster hat keine Fokusführung, und sein Escape nimmt die Auswahl mit

**Beobachtung.** Öffnen: Fokus steht auf „Schließen“ (gut). Dann springt Tab nach einem Schritt hinter das Fenster in die Kopfzeile der Seite („Regel“, „Fenstermenü“, „Lage“ …, 14 Tabs, kein einziger im Dialog; Skript `e1.js`). Nach dem Schließen (Knopf oder Escape) liegt der Fokus auf `BODY`, nicht auf „Lesen“. Zum Vergleich: Die Masken (Aufnehmen) halten den Fokus bei 45 Tabs im Fenster und geben ihn beim Schließen zurück (`l1.js`; `Maske.tsx`/`useFokusfalle.ts`). Zusammen mit dem nicht behobenen P3-2 (siehe Tabelle) ergibt sich: Escape im Lesen-Fenster zerstört den halbfertigen Laufzettel.

**Auswirkung.** Wer mit der Tastatur sichtet (Strg+F, Tab, Enter), landet hinter dem Dialog; die Tastenfolge verliert den Bezug. Der Eingabeverlust geschieht ohne Rückfrage.

**Vorschlag.** Das Lesen-Fenster als Maske behandeln (`haltTab`, `useFokusRueckgabe`) und Escape am Fenster abfangen (`stopPropagation`), damit die Auswahl bleibt.

### R2-Si P2-4 Der Weitergabeknopf des LdF liegt bei 1320 px außerhalb des Fensters

**Beobachtung.** In der Karte „Eingänge vor der Weitergabe“ (rechts, 320 px breit) ist die Tabelle breiter als die Karte: Der Knopf „An den Sichter weitergeben“ liegt bei x = 1386 bis 1488, das Fenster ist 1320 breit, die Seite läuft horizontal auf 1495 px (`12-ldf-karte.png`, `c2.js`: Seite scrollWidth 1495, Knopf boundingBox x 1386). Die Spalte „Aufnahme“ ist abgeschnitten.

**Auswirkung.** Das ist die Station vor mir: Solange der LdF nicht nach rechts scrollt, kommt nichts an. Er sieht die Zeile, aber nicht den Knopf. (Der Befund liegt eigentlich beim LdF; er ist hier gelistet, weil er den Sichter bremst.)

**Vorschlag.** Karte über volle Breite oder Knopf in der ersten Spalte; Tabelle auf `table-layout` mit Umbruch.

### R2-Si P2-5 Der Reiter „Nachrichten“ zählt beim Sichter nichts

**Beobachtung.** S2, S3, S4 sehen am Reiter eine Zahl („Nachrichten1“), der Sichter nicht, obwohl bis zu vier Eingänge vor ihm lagen (der Reiter trägt die Zahl der Posteingänge eigener Stellen, der Sichter hat keinen). Einfache und Sofort-Eingänge melden sich beim Sichter nur in der Kachel „Vor dem Sichter“; Hinweis und Ton gibt es nur bei Blitz und Sofort mit dem Eintreffen vor dem Sichter, nicht für Einfach.

**Auswirkung.** Wer als Sichter zugleich auf der Lage arbeitet (Drehbuch: Platz 4 sitzt am Blatt), hat Einfach-Eingänge nur dann im Blick, wenn er das Blatt aufschlägt.

**Vorschlag.** Die Zahl „vor dem Sichter“ am Reiter für die Stelle Sichter.

---

## P3 – Gering

### R2-Si P3-1 Der Hinweiskasten schiebt den Inhalt beim Einblenden um 53 Pixel
Beim Tippen im Vermerkfeld kam ein Blitz-Hinweis herein (E 8): Der Kasten erschien oben, die Liste rutschte von 496 auf 549 px, die Auswahl, der Fokus und der Text blieben erhalten (`91-`, Skript `k1.js`). Gut; aber wer gerade auf eine Zeile zielt, trifft die nächste. Vorschlag: Platz reservieren oder den Hinweis überlagern.

### R2-Si P3-2 Die leere Sicht „Sichter“ schweigt zur Station LdF
Liegt ein Eingang beim LdF, steht in der Sicht „Sichter“ „Keine Nachricht in ‚Sichter‘“; die Kachel „Vor dem LdF 1“ steht darüber (`11-`). Vorschlag: „1 Nachricht liegt noch beim LdF“ als Leerzeile der Sicht, mit Sprung in die LdF-Sicht (nur lesen).

### R2-Si P3-3 Laufzettelhöhe: Das Raster liegt unter dem Knopf „Sichten“
Gemessen bei 1320 x 860, Hinweiskasten aus: Seitenhöhe 1233 px (nur S2 rot) bzw. 1219 px (fünf Stellen: S2 rot, S4 grün, S3 blau, Leiter blau, Polizei blau). Die klebende Leiste mit „Sichten“ liegt bei 823 bis 854 px und ist immer sichtbar (gut). Das Raster beginnt bei 793 px (zwei Eingänge in der Liste) bzw. 849 px (vier Eingänge) und das Vermerkfeld bei 994 bis 1071 px; ohne Scrollen sieht der Sichter beim Öffnen nur den Kopf mit Quittung und höchstens die erste Rasterzeile (`22-`, `32-`). Zwischen Stellenname und Kästchen liegen bis zu 500 px (`32-`), die Kästchen sind rund 13 px groß. Auswirkung: „Sichten“ lässt sich drücken, bevor das Raster ins Bild kam; die Vorbelegung (S2 rot) ist dann der Verteiler. Vorschlag: eine Zusammenfassung neben dem Knopf („Verteiler: S2 rot, S4 grün, S3 blau, Leiter blau, Polizei blau – 5 Empfänger“); sie schließt zugleich die Lücke „Empfängerzahl“ aus P1-3.

### R2-Si P3-4 Die Detailzeile der Nachweisung steht in der schmalen ersten Spalte
Sichtung, Verteiler und Vermerke stehen in der ersten Spalte („Vorrang“, ca. 160 px) und brechen zu zehn Zeilen um, während die übrigen Spalten leer bleiben (`97-`). Vorschlag: Zelle über die ganze Zeilenbreite (`colspan`).

### R2-Si P3-5 „Stelle abgeben“ ist in der Web-Schale kein Bedienelement
Das Drehbuch (Minute 55) und die Befundliste sprechen von „Stelle abgeben“. Das Fenstermenü bietet nur „Stelle und Handzeichen …“ und „Einsatz schließen“; erst „Einsatz schließen“ (und das Schließen des Reiters) gibt die Stelle ab (3 s). Wer den Rechner nur sperrt oder das Blatt wechselt, gibt nichts ab (Annahme: Schichtwechsel durch Sperren ist üblich). Vorschlag: Drehbuch und Handbuch nennen den Weg; „Stelle und Handzeichen …“ erhält den Knopf „Stelle abgeben“ für den Schichtwechsel am selben Rechner.

### R2-Si P3-6 Der Konflikthinweis-Zähler zählt schon beim Alleinsein
Gleich nach dem Anlegen des Einsatzes, „allein am Einsatz“, steht „⚠ 1 Konflikthinweis“ (`05-`, `06-`); mit zwei Sichtern stieg er auf 2. Wer den Zähler schon beim ersten Öffnen sieht, liest ihn nicht mehr, wenn er für die Nachrichten gilt. Vorschlag: Stammdaten-Konflikte beim Anlegen nicht zählen, Hinweise nach Gegenstand benennen („Nachricht E 3: zwei Sichtungen“).

### R2-Si P3-7 Die FmZ-Karte „Vor dem Sichter“ sortiert nach Nummer
E 5 (einfach) steht vor E 6 (Blitz), während die Sicht „Sichter“ richtig nach Vorrang ordnet (`72-`). Vorschlag: gleiche Ordnung.

---

## Station LdF vor dem Sichter (Weitergabe)

- Was ich sehe, bevor der LdF weitergegeben hat: die Kachel „Vor dem LdF“ und sonst nichts (P1-1, P3-2). Nach der Weitergabe steht die Nachricht nach rund 3 s in der Sicht, bei Blitz mit Hinweis. Der Hinweis nennt „für Sichter“ (Stelle, nicht Name); gut lesbar.
- Fehlt der LdF in der Präsenz, wird beim Aufnehmen sofort mit Zeit und Handzeichen der Aufnahme weitergegeben (Konzept §5); der Blitz kam direkt mit Hinweis (`m1.js`).
- Die LdF-Karte hat bei 1320 px einen Knopf außerhalb des Bildes (P2-4).

## Schichtwechsel nach Drehbuch Minute 55

| Schritt | Zeit |
|---|---|
| Sichter schließt den Einsatz (Fenstermenü), FmZ-Maske zeigt „Kein Sichter besetzt“ | **3 s** |
| Harter Ausfall (Netz weg, Kontext geschlossen), dieselbe Anzeige | **125 s** (Präsenzfrist) |
| Ersatzsichter FmZ verteilt E 7 beim Aufnehmen (S2 rot, S4 grün aus Anschrift, Hinweis an S4) | im selben Zug, Hinweis bei S4 nach 4 s |
| Sichter öffnet neu, sieht E 7 in „gesichtet“, sichtet nach (S3 blau, Vermerk) | Nachsichtung bei S3 nach 3,5 s sichtbar |

Das Drehbuch lässt sich an dieser Stelle ohne Zusatzwissen spielen; die Lücke ist die fehlende Marke (R2-Si P2-1).

## Was gut gelöst ist

- Die Nachsichtung, die Marke „zwei Sichtungen“, die Vereinigung der Verteiler und die Meldung im Laufzettel mit „Ihre Eingaben bleiben“ sind die richtige Antwort auf den stillen Verlust.
- „Nur lesen, Kenntnis gibt S4 selbst.“ am fremden Posteingang: kurz und eindeutig.
- Der Laufzettel führt Eingangszeit, Inhalt, Anschrift in Grün, Warnung ohne Hauptempfänger, Freitext in Blau und laufende Quittungszeit; die klebende Leiste mit „Sichten“ bleibt in Reichweite.
- Die Nachweisung zeigt Sichtung, Verteiler und Vermerke je Nachricht; das Tagebuch hält jede Sichtung mit Hz. und Stelle.
- Der Sichterstau mit Karte, „seit n min“ und „Ich sichte jetzt selbst“ ist verständlich; „Einsatz schließen“ gibt die Stelle in 3 s ab.
- Der Hinweiskasten behält bei neuem Blitz den Fokus und den getippten Text.
- Die Vorschau „Wie gedruckt“ im Lesen-Fenster und in der Maske gibt den Vordruck wieder.
