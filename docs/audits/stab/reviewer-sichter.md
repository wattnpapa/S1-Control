# Stabsreview Sichter

Stand: 22.11.2026, Web-Schale http://127.0.0.1:8790 (Playwright, Chromium, 1320 × 860, Stichproben 1440 × 900, je Arbeitsplatz ein eigener Browser-Kontext). Übungseinsatz „Review FmZ Hochwasser Hunte“ (Lage siehe `reviewer-ldf.md`): S3 als Absender, Sichter (ich, Hz. Kü), LdF, Fm1, Fm2 parallel; 16 Eingänge und 8 Ausgänge, davon 3 Blitz und 4 Sofort; LdF als Station; eine Ersatzsichtung durch Fm1, solange der Sichter noch nicht da war. Skripte und Screenshots: `/tmp/claude-0/-home-user-S1-Control/da3ae362-6e34-5a71-8ae2-cf93c02225f2/scratchpad/reviews/fmz/`.

Grundlage: die Audits der Nachrichten-Funktion (`docs/audits/nachrichten/`). Befunde von dort werden nicht wiederholt.

**Annahmen (keine Vorschrift):** Der Sichter quittiert jeden Eingang, legt den Verteiler fest und hat den Rücklauf im Blick: ob die Stelle, die handeln soll, die Nachricht auch hat und sich darum kümmert, besonders bei Vorrang. Er verteilt nur an Stellen, die tatsächlich besetzt sind, oder weiß, wer sie vertritt.

## Urteil

Das Sichten selbst ist rund: Warteschlange mit Vorrang oben, Laufzettel mit Rasterkästchen, Vorbelegung S2 rot, Warnung „Kein Hauptempfänger“, Marke „Ersatzsichtung (Yi)“ für die Sichtung der FmZ in meiner Abwesenheit, Hinweis „wartet seit 16 Minuten vor dem Sichter, obwohl ein Sichter besetzt ist“. Was mir fehlt, beginnt **nach** dem Knopf „Sichten“: Mit dem Verteilen verliere ich jede Nachricht aus dem Blick. Meine Liste „gesichtet“ sagt nur „verteilt“; ob der Blitz bei S3 seit 20 Minuten ungelesen liegt, erfahre ich nur, wenn ich den Posteingang jeder Stelle einzeln aufschlage. Beim Verteilen selbst sehe ich nicht, welche Stellen überhaupt besetzt sind.

## Stichprobe der als offen geführten Befunde

| Befund | Stand im Browser |
| --- | --- |
| R2-Sichter P2-1 (Ersatzsichtung ohne Marke) | Marke steht: „verteiltErsatzsichtung (Yi)“ in „gesichtet“ (`46-si-gesichtet.png`). Ein Hinweis beim Wiederkommen fehlt weiter (wie im README als offen geführt). |
| R2-Sichter P2-4 (Weitergabeknopf des LdF außerhalb) | behoben: `scrollWidth` 1320 (`70-ldf-1320-voll.png`). |
| SGL P2-13 (Antwort nicht mit dem Original verknüpft) | weiter offen: `antwortAuf` wird nur in der Maske angezeigt (`renderer/Maskenzusatz.tsx`), in keiner Liste. |

## Fehlende Ansichten

### Si-A1 (P1) – Rücklauf: Was ist verteilt, aber nicht gelesen oder erledigt?

- **Was der Sichter sehen/tun muss:** Eine Übersicht aller verteilten Nachrichten mit Zustand je Empfängerstelle (neu / gelesen / erledigt), Vorrang und Zeit seit Verteilung; oben, was mit Vorrang ungelesen liegt. Daraus: bei der Stelle nachhaken, umverteilen, dem Leiter melden.
- **Was die App schon hat:** Kenntnisnahme je Stelle mit Zeit und Handzeichen, „erledigt“ je Stelle, „Posteingang von <Stelle>“, Sicht „Offen“ je Stelle (`offenFuerStellen`), Vorrang-Hinweis an die Empfängerstelle.
- **Wo es heute verstreut ist:** Nur in den Posteingängen der einzelnen Stellen, einzeln über „Posteingang von“ aufzuschlagen (`72-si-posteingang-s3.png`); meine Liste „gesichtet“ sagt nur „verteilt“ (`46-si-gesichtet.png`). Siehe Befund Si-1.

### Si-A2 (P2) – Stellenübersicht beim Verteilen (besetzt, durch wen, wie viel offen)

- **Was der Sichter sehen/tun muss:** Im Laufzettel je Stelle: besetzt oder nicht, Handzeichen, Zahl der offenen grünen Kopien; bei unbesetzter Stelle die Vertretung.
- **Was die App schon hat:** besetzte Stellen aus der Präsenz (`besetzteStellen`, Statuszeile), offene Kopien je Stelle (Sicht „Offen“), Handzeichen der Sitzungen.
- **Wo es heute verstreut ist:** Statuszeile unten („2 weitere: Fm1, LdF“), Posteingänge je Stelle. Das Verteilerraster zeigt nur Namen und Kästchen (`73-si-verteiler-1440.png`; `renderer/Verteilerraster.tsx` kennt keinen Besetzt-Zustand). Siehe Befund Si-2.

### Si-A3 (P2) – Übergabe des Sichters

- **Was der Sichter sehen/tun muss:** Zum Schichtwechsel: was vor mir liegt, was ich in meiner Schicht verteilt habe und was davon ungelesen ist, Ersatzsichtungen in meiner Abwesenheit (nachsichten?), Doppelsichtungen, offene Rückfragen; mit einer Übergabenotiz.
- **Was die App schon hat:** Sicht „Offen“ (für den Sichter nur die Warteschlange, `47-si-offen.png`), Liste „gesichtet“ mit Marke Ersatzsichtung, Konflikthinweise in der Diagnose, Tagebuch mit „gesichtet (Hz. Kü)“.
- **Wo es heute verstreut ist:** „Offen“, „gesichtet“, Diagnose (Fenstermenü) und Tagebuch; ein Zeitraum („meine Schicht“) lässt sich nirgends wählen.

### Si-A4 (P3) – Vorgänge statt Einzelnachrichten

- **Was der Sichter sehen/tun muss:** Zusammengehörige Nachrichten als Vorgang („Helfer abgerutscht“ E 4 → Ausgang „Verletzten melden“ A 13 → Antwort), um Antworten gleich an die Stelle zu geben, die den Vorgang führt.
- **Was die App schon hat:** Bezug `antwortAuf` beim Antworten, Suche über Betreff und Inhalt.
- **Wo es heute verstreut ist:** Bezug nur in der Maske sichtbar (siehe Stichprobe SGL P2-13); in meinem Szenario war A 13 ohne „Antworten“ verfasst und damit gar nicht verknüpft. (Annahme: Vorgangsbildung ist im Stab üblich, aber nicht vorgeschrieben.)

## Befunde an vorhandenen Ansichten

### Si-1 (P1) – Ein verteilter Blitz liegt 20 Minuten ungelesen, ohne dass Sichter oder FmZ es erfahren

- **Beobachtung:** E 4 „Helfer abgerutscht Deich km 4“ (Blitz) habe ich um 17:42 an S2 rot und S3 grün verteilt. Um 18:02 steht er im Posteingang S3 weiter als „neu“ (`72-si-posteingang-s3.png`), ebenso E 2 (Sofort). In meiner Liste „gesichtet“ steht nur „verteilt“ (`46-si-gesichtet.png`); einen Hinweis bekam ich nicht. Die Schwellen-Logik gibt es nur vor der FmZ, vor dem LdF und vor dem Sichter, nicht nach der Verteilung.
- **Auswirkung:** Ein Blitz kann im Fach einer Stelle liegen, deren Platz gerade leer ist oder die ihn übersehen hat; der Weg endet für alle anderen mit „verteilt“.
- **Empfehlung:** Schwelle für ungelesene Vorrang-Kopien (z. B. Blitz 5 min, Sofort 10 min, wie vor dem Sichter); Hinweis an den Sichter und Marke „ungelesen seit n min“ in „gesichtet“; Ansicht Si-A1.
- **Verifikation:** Blitz an eine Stelle verteilen, deren Arbeitsplatz ihn nicht liest: Nach der Schwelle bekommt der Sichter einen Hinweis, die Zeile in „gesichtet“ wird bernsteinfarben.

### Si-2 (P2) – Verteilerraster ohne Besetzt-Anzeige; S2 rot ist vorbelegt, auch wenn S2 niemand besetzt

- **Beobachtung:** Im Laufzettel stehen Leiter, S1–S6, Fachberater, Verbindungsstelle gleichrangig; S2 ist rot vorbelegt, obwohl im ganzen Szenario keine S2 besetzt war; S3 war beim Sichten von A 13 nicht mehr angemeldet (Statuszeile „2 weitere: Fm1, LdF“), das Raster zeigte es nicht (`73-si-verteiler-1440.png`, `26-laufzettel.png`). Laut Handbuch wartet die Kopie dann „im Fach“.
- **Auswirkung:** Ich verteile an leere Plätze, ohne es zu merken; die Kopie wartet still, der Sachstand erreicht niemanden.
- **Empfehlung:** Im Raster je Stelle „besetzt (Hz.)“ oder „nicht besetzt“ anzeigen; bei grün oder Vorrang an eine unbesetzte Stelle eine Rückfrage („S3 ist nicht besetzt – trotzdem?“).
- **Verifikation:** Stelle schließen, Laufzettel öffnen: Die Stelle trägt „nicht besetzt“, grün an sie fragt nach.

### Si-3 (P2) – Zwei Funkplätze erzeugen doppelte Nummern, die beim Sichter ohne Marke ankommen

- **Beobachtung:** Aus dem Parallelbetrieb Fm1/Fm2 lagen E 10 „Füllmaschine Störung“ und E 10 „Sickerstelle gesichert“ sowie E 11 doppelt vor (Ursache siehe `reviewer-ldf.md`, LdF-1). Meine Warteschlange zeigt „10“ ohne Marke (`45-si-sichter.png`); „doppelt“ steht nur in der Nachweisung.
- **Auswirkung:** Ich quittiere und verteile Nummern, die nicht eindeutig sind; Rückfragen der Stellen („zu E 10“) treffen zwei Nachrichten.
- **Empfehlung:** Marke „doppelt“ in jeder Liste mit Nummer, auch vor dem Sichter.
- **Verifikation:** Doppelte Nummer erzeugen: Sichter-Warteschlange und Laufzettelkopf tragen „doppelt“.

### Si-4 (P3) – Liste „gesichtet“ zeigt dem Sichter „Kopie rot“

- **Beobachtung:** Jede Zeile der Liste „gesichtet“ trägt den Farbrand „Kopie rot“ (`46-si-gesichtet.png`), obwohl der Sichter keine Kopie hat; gemeint ist offenbar die S2-Kopie.
- **Auswirkung:** Der Farbrand, der sonst „das ist Ihre Kopie, Sie handeln“ bedeutet, sagt hier etwas anderes.
- **Empfehlung:** In „gesichtet“ statt des Farbrands die Verteilung als Text („S2 rot, S3 grün“) und den Lesestand.
- **Verifikation:** Liste „gesichtet“ zeigt keinen Kopie-Farbrand für den Sichter.

## Schluss

- **Aufgabe geschafft:** Sichten ja, zügig und ohne Hilfe. Den Rücklauf überwachen und gezielt an besetzte Stellen verteilen: nein, nur durch Aufschlagen jedes einzelnen Posteingangs.
- **Größtes Risiko:** Vorrang-Nachrichten, die nach der Verteilung unbemerkt ungelesen liegen (Si-1), verstärkt durch Verteilung an unbesetzte Stellen (Si-2).
- **Top-Priorität:** Ansicht „Rücklauf“ (Si-A1) mit Schwelle für ungelesenen Vorrang und Besetzt-Anzeige im Verteilerraster.
