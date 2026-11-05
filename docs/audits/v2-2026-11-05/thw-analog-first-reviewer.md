# Audit „Analog first“ — S1-Control v2, Stand 05.11.2026

Rolle: erfahrener, IT-skeptischer Helfer in der Führungsstelle (S1). Ich arbeite mit Meldeblock, Funkprotokoll, Stärketafel und Stift und frage bei jeder Bildschirmhandlung: Was mache ich, wenn das Ding schwarz wird — und wie kommt mein Papier danach ohne Chaos zurück in den Rechner?

**Datum:** 05.11.2026 · **Stand:** HEAD `6772ffe` (UX-Umbau E2–E4, Fleetmapping-Vorschlag, Nachtbild)
**Material:** eigene Web-Schale mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten), Port 8201, Profil „Führungsstelle (S1)“ auf der Einsatzauswahl; Bedienung mit Playwright, 34 Screenshots und 5 PDF-Abzüge unter `scratchpad/shots/analog-first/`; erzeugte Ausgaben im Share der Kopie unter `ausgaben/` (Einheitenliste, Papier-Vordruck, Tagebuch, Funkplan, Einsatzakte-ZIP); `docs/v2/HANDBUCH.md`, `docs/v2/KURZANLEITUNG.md`, `docs/v2/adr/ADR-007-…`; Vorgänger-Audit `docs/audits/v2-2026-10-29/thw-analog-first-reviewer.md`; Quelltext nur als Beleg.
**Kennzeichnung:** **[beobachtet]** = in der laufenden Kopie ausgelöst bzw. an Datei/Screenshot gesehen · **[Code]** = aus Quelltext belegt, Datei:Zeile · **[Annahme]** = plausibel, nicht ausgelöst · **[nicht prüfbar]** = in dieser Umgebung nicht nachstellbar (Electron-Fenster, echter Share- oder Stromausfall, Drucker, http-LAN ohne localhost).

Geschrieben habe ich nur in meiner Kopie: ein Auftrag und ein Fahrzeug an „BGr 2 Oldenburg“, ein Statuswechsel, vier Eingetroffen-Zeiten, eine (versehentlich provozierte) Funkprobe, eine Einsatzakte.

---

## Urteil

Seit dem 29.10. hat sich für den Papiermenschen viel getan, und das erkenne ich ausdrücklich an: Aufträge und Fahrzeuge lassen sich jetzt an der Einheit erfassen (der Auftrag sogar mit Beginn „1430“ vom Block), eine Einheit geht „Ohne Vorlage“ an, die **Einheitenliste** kommt als HTML mit „Öffnen · Herunterladen · Drucken“ aus dem Blatt Ausgaben, es gibt einen **Papier-Vordruck** (Meldeblock mit Kästchen „im Rechner nachgetragen“, leere Einheitenliste, Funkprotokoll, Funkplan), die Einsatzakte entsteht per Knopf, und bei Dienstausfall sperrt die Seite ehrlich, statt still Eingaben zu sammeln. Die neuen Bedienbausteine (Auswahlleiste, „⋯“, Filterzeile, Profil) ändern an der Rückfallebene nichts, schaden ihr aber auch nicht. Der Fleetmapping-Vorschlag kommt aus einer lokalen Datei und lässt den Namen „wie auf dem Funkgerät“ frei — das geht auch ohne Netz.

Reibung bleibt an genau der Stelle, an der das Papier zurück in den Rechner muss: **Ein Statuswechsel und eine Funkprobe tragen immer die Uhrzeit des Klicks, nie die Zeit vom Block.** Das fälscht nicht nur das Tagebuch, sondern setzt im Funkplan den „letzten Kontakt“ auf jetzt — eine Einheit, die seit einer Stunde schweigt, sieht nach dem Nachtragen frisch gemeldet aus. Dazu kommt, dass Strg+P im Funkplan nicht druckt, sondern eine Funkprobe „Kontakt“ schreibt, und dass bei einem unerwarteten Dienstausfall nur leere Vordrucke, aber kein letzter Stand zu haben sind, wenn niemand vorher gedruckt hat.

Ohne fremde Hilfe geschafft: Papierbogen übernehmen (Auftrag, Fahrzeug, Zeiten) — ja; Stand drucken — ja, solange der Dienst läuft; nach Ausfall den Meldeblock zeitrichtig nachtragen — **nein** für Status und Funkkontakt.

---

## Findings

### P0-1 · Nachgetragene Statusmeldungen und Funkproben bekommen die Klickzeit — der Funkplan hält eine schweigende Einheit danach für frisch gemeldet

- **Fundstelle / Aufgabe:** Lage → Statuszelle einer Einheit (Screenshot `07-status-editor.png`); Funkplan → Auswahlleiste „Funkprobe: Kontakt“ / „kein Kontakt …“ (`23-funkplan-gewaehlt.png`); Anforderung anlegen; Einheit anlegen „Ohne Vorlage“ (`31-einheit-ohne-vorlage.png`). Aufgabe: eine Stunde Meldeblock und Funkprotokoll nach einem Ausfall nachtragen.
- **Beobachtung:**
  - [beobachtet] Der Status-Editor ist ein Auswahlfeld mit „Übernehmen / Abbrechen“ — kein Zeitfeld. Nach „Einsatz → Ruhe“ für BGr 2 steht im Tagebuch unter „Zeit der Meldung“ nichts (`08-tagebuch.png`), im Funkplan-Ausdruck steht bei BGr 2 „2044 Meldung“ = Zeitpunkt meines Klicks, bei allen anderen „2035 Meldung“ (`14-funkplan-druck.png`).
  - [beobachtet] Zum Vergleich: Der Auftrag mit Beginn „1430“ landet richtig als „05.11. 14:30:00“ in „Zeit der Meldung“, der Tagebuch-Eintrag hat ebenfalls „Zeit der Meldung“. Es geht also — nur nicht für Status und Funk.
  - [Code] Der Vertrag kann es längst: `StatusGesetzt = { einheitId, ereignisZeit?: Zeitpunkt }` (`packages/domaene/src/katalog/schemata.ts:187`), der Dienst prüft diese „Funkzeit“ sogar auf Zukunft (`apps/desktop/src/worker/zustandspruefung.ts:70`), und der letzte Kontakt rechnet mit `status.fachlicheZeit ?? status.wanduhr` (`packages/domaene/src/projektion/funkkontakt.ts:100`). Kein Renderer-Pfad setzt `ereignisZeit` (Suche in `apps/desktop/src/renderer`: kein Treffer). Funkprobe: `zeitpunkt: new Date().toISOString()` (`apps/desktop/src/renderer/useFunkprobe.tsx:69,72`). Anforderung: `angefordertAm: new Date().toISOString()` (`Anforderungsneu.tsx:112`). „Ohne Vorlage“ legt immer „Angefordert“ an (`EinheitAnlegen.tsx:230`) — eine längst eingetroffene Einheit vom Meldekopf-Papier braucht danach einen Statuswechsel, der wieder die Klickzeit trägt.
- **Erwartung der Rolle:** Auf meinem Block steht „1412 FGr Wasserschaden Einsatz“. Beim Nachtragen tippe ich „1412“ dazu — so wie es beim Auftrag und im Tagebuch schon geht. Und die Störfallkarte sagt selbst: „Zeitpunkte, die für die Auswertung zählen, dort nachtragen, wo sie eingetippt werden — sie sind ein Feld und keine Systemzeit.“ Für den Status gibt es dieses Feld nicht.
- **Auswirkung im Einsatz:** Nach 45 Minuten Papierbetrieb trägt der S1 dreißig Statuszeilen nach. Jede setzt im Funkplan „letzter Kontakt“ auf jetzt. Die Bernstein-Marke „kein Kontakt > 60 min“ verschwindet für alle — auch für die Einheit, deren letzte echte Meldung 75 Minuten alt ist. Die Vermeldezentrale macht keine Funkprobe, weil der Rechner Kontakt anzeigt. Das ist eine gefährliche Fehlinterpretation, kein Schönheitsfehler. Zusätzlich weist das Tagebuch für jeden Statuswechsel die Nachtragezeit aus; Einsatzzeiten und Abrechnung stimmen nicht, und man sieht es ihnen nicht an.
- **Empfehlung:** Am Statuswechsel (Zelle und Kontextmenü), an der Funkprobe und an „Anforderung anlegen“ ein optionales Feld „Zeit der Meldung“ (leer = jetzt, dieselbe Schreibweise wie beim Auftrag: „1412“, „14:12“, „05.11. 14:12“). Für den Nachtrag-Fall eine Sammelerfassung „vom Meldeblock nachtragen“, in der Zeit, Einheit und neuer Status zeilenweise wie auf dem Block getippt werden. „Ohne Vorlage“ mit wählbarem Anfangsstatus und Eintreffzeit, wenn die Einheit nachweislich schon da ist.
- **Verifikation:** Prüflage, Einheit mit letzter Meldung vor 70 Minuten (Marke Bernstein). Statuswechsel mit Meldezeit von vor 70 Minuten nachtragen → Marke bleibt Bernstein; Tagebuch zeigt die Blockzeit unter „Zeit der Meldung“; Funkplan-Ausdruck nennt die Blockzeit.

### P1-1 · Strg+P druckt im Funkplan nicht, sondern schreibt eine Funkprobe „Kontakt“

- **Fundstelle / Aufgabe:** Blatt Funkplan, Einheit in der Zuordnung gewählt, Strg+P gedrückt (`25-funkplan-strg-p.png`).
- **Beobachtung:** [beobachtet] Ohne Auswahl passiert nichts — auch kein Druckdialog. Mit gewählter „FGr Wasserschaden“ steht danach „2051 Funkprobe“ in der Zeile, die Statuszeile meldet „✓ Funkprobe der Einheit ‚FGr Wasserschaden‘ eingetragen · gespeichert“, Rückgängig ist angeboten. [Code] Das Kürzel ist im Funkplan immer angemeldet und unterdrückt den Browserdruck (`Funkplan.tsx:207`, `tastatur.ts:83` `preventDefault`). Im Handbuch steht es so in der Tastenkarte (Strg+P = Funkprobe, Excel-Spalte „—“).
- **Erwartung der Rolle:** Strg+P heißt seit dreißig Jahren „drucken“ — in der Excel, im Browser, überall. Wenn ich den Funkplan als Fernmeldeskizze an die Wand hängen will, drücke ich genau das.
- **Auswirkung im Einsatz:** Ein Druckversuch erzeugt eine **erfundene Funkverbindung** mit aktueller Uhrzeit. Die Einheit gilt als erreicht, die „kein Kontakt“-Marke verschwindet (gleiche Folge wie P0-1). Die Bestätigung in der Statuszeile ist klein und unten; wer auf einen Druckdialog wartet, übersieht sie. Rückgängig hilft nur, wenn man den Fehler bemerkt.
- **Empfehlung:** Strg+P dem Drucken lassen (im Funkplan: Funkplan als HTML erzeugen und Druck öffnen). Die Funkprobe auf ein Kürzel legen, das niemand aus Gewohnheit drückt, oder nur per Knopf.
- **Verifikation:** Im Funkplan mit gewählter Einheit Strg+P → Druckvorschau, kein neuer Tagebucheintrag, „letzter Kontakt“ unverändert.

### P1-2 · Bei Dienstausfall gibt es leere Vordrucke, aber keinen letzten Stand — wer nicht vorher gedruckt hat, fängt auf Papier bei null an

- **Fundstelle / Aufgabe:** Verbindung zum Dienst getrennt (Playwright `setOffline`), danach Ausgaben → „Öffnen“ einer vorher erzeugten Einheitenliste; Lage-Ansicht mit Browserdruck (`17-offline-maske.png`, `20-offline-oeffnen.png`, `21-seite-1.png`).
- **Beobachtung:**
  - [beobachtet] Die Seite sagt nach 12 s klar: „Keine Verbindung zum Dienst … Eingaben werden nicht gespeichert und sind gesperrt … offene Formulare behalten ihre Eingaben.“ Eine halb ausgefüllte Tagebuchmaske („1412“, Text) blieb stehen und war nach Rückkehr noch da. Das ist ehrlich und gut.
  - [beobachtet] „Öffnen“ der zwei Minuten vorher geschriebenen Einheitenliste zeigt die Seite „⚠ Dienst nicht erreichbar“ statt der Liste. Die Datei liegt auf dem Share — für den Browser-Arbeitsplatz unerreichbar.
  - [beobachtet] Browserdruck der Lage: Kopfband, Baum und die ersten drei Einheiten, dann Summen; die Tabelle ist im Scrollbereich abgeschnitten. Kein Druckstil im Renderer [Code] (`@media print` nur in `public/offline.html`).
  - [Code] Die Offline-Seite mit „Papier-Vordruck drucken“ kommt über einen Service Worker, und den gibt es nur unter https oder localhost (`apps/desktop/src/renderer/offlineSchale.ts:1-10`, ADR-007 Z. 25). Im http-Netz der Führungsstelle zeigt ein Neuladen ohne Dienst die Fehlerseite des Browsers. [nicht prüfbar] in dieser Umgebung (localhost).
  - [Code] Der automatisch geschriebene HTML-Monitor ist „derselbe Druck in einer anderen Hülle“ — Abschnittssummen, keine Einheiten (`packages/ausgaben/src/monitor.ts:9`), und standardmäßig aus (Kästchen in `09-ausgaben.png`).
  - Das Handbuch löst es organisatorisch: „Die Einheitenliste vor jeder Lagebesprechung ausdrucken — sie ist der Stand, mit dem bei einem Rechnerausfall auf Papier weitergearbeitet wird.“
- **Erwartung der Rolle:** Wenn der Rechner hängt, will ich *den letzten Stand* auf Papier — nicht ein leeres Formular, in das ich 40 Einheiten aus dem Kopf schreibe. Die Excel hat alle 60 Sekunden ein HTML neben die Datei gelegt, das jeder Rechner öffnen konnte.
- **Auswirkung im Einsatz:** Fällt der Dienst unangekündigt aus (Server-Laptop zugeklappt, Akku, Stromausfall am Verteiler), ist der letzte Ausdruck so alt wie die letzte Lagebesprechung. Wer den Stand dazwischen braucht, ruft alle Abschnitte über Funk ab — genau in dem Moment, in dem ohnehin alles klemmt.
- **Empfehlung:** Die Einheitenliste wie den Monitor automatisch und regelmäßig in `ausgaben/` fortschreiben (feste Datei „aktueller Stand“), standardmäßig an. Im Browser den zuletzt gesehenen Stand der Lage druckbar halten, auch wenn der Dienst weg ist (Druckstil für die Lage, der die ganze Tabelle umbricht). Die Störfallkarte um den Satz ergänzen, wo die Datei „aktueller Stand“ liegt und wie man sie ohne Programm öffnet.
- **Verifikation:** Dienst hart beenden; an einem anderen Rechner im Explorer und im noch offenen Browserfenster innerhalb einer Minute eine vollständige Einheitenliste mit Stand ≤ 2 min drucken.

### P1-3 · Für den Rückweg vom Papier in den Rechner gibt es kein Abgleichverfahren — Dubletten und Lücken fallen niemandem auf

- **Fundstelle / Aufgabe:** Papier-Vordruck „Meldeblock“ (`13-papier-vordruck-kopf.png`), Maske „Eintrag ins Einsatztagebuch“ (`16-tagebuch-eintrag-maske.png`), Störfallkarte (Diagnose, `KURZANLEITUNG.md` Seite 2).
- **Beobachtung:**
  - [beobachtet] Der Meldeblock hat Datum, Uhrzeit, Von/An, Weg, Dringlichkeit, „☐ im Rechner nachgetragen · Nachgetragen von / Uhrzeit“ — gut gedacht —, aber **keine laufende Nummer**. Die Tagebuchmaske hat kein Feld für eine Blatt- oder Meldungsnummer.
  - [Code] Jeder Tagebuch-Eintrag bekommt eine neue Kennung (`TagebuchEintrag.tsx:46` `neueId("ETB")`); ein zweites Nachtragen desselben Zettels durch einen anderen Arbeitsplatz ist ein zweiter, gleichwertiger Eintrag. [Annahme] Eine Prüfung „gleicher Text, gleiche Meldezeit“ gibt es nicht; ich habe keine gefunden.
  - [beobachtet] Die Wege auf dem Vordruck („Funk · Telefon · Melder · Mündlich“, `packages/ausgaben/src/papier.ts:72`) passen nicht zu den Quellen der Maske („Funk · Telefon · Meldung vor Ort · Lagebesprechung · Sonstiges“). „Dringlichkeit“ und „Von/An“ haben in der Maske kein Feld.
  - [beobachtet] Die Störfallkarte sagt „auf Papier weiterarbeiten und später nachtragen“ — aber nicht, in welcher Reihenfolge (erst Eintreffen und Verschieben, dann Status, dann Aufträge?), wer nachträgt (einer oder alle) und welcher Stand bei Widerspruch gilt (Papier oder Rechner).
- **Erwartung der Rolle:** Beim Funkprotokoll auf Papier habe ich laufende Nummern und einen Abhakvermerk. Beim Nachtragen will ich „Blatt 3, Nr. 1–17“ erfassen und sehen, dass Nr. 12 schon jemand drin hat. Und ich will eine Regel: Für die Zeit des Ausfalls gilt das Papier.
- **Auswirkung im Einsatz:** Zwei S1-Helfer teilen sich nach dem Wiederanlauf den Stapel nicht sauber auf; Meldungen stehen doppelt oder gar nicht im Tagebuch. Bei der Nachbereitung lässt sich nicht mehr sagen, welche Einträge vom Papier kamen.
- **Empfehlung:** Laufende Nummer (mit Arbeitsplatz-/Blattkürzel) auf Meldeblock und Funkprotokoll; dasselbe Feld in der Tagebuchmaske und als Spalte im Tagebuch; Hinweis „Nr. bereits erfasst von …“. Wege auf Vordruck und Maske gleich benennen. Ein achter Störfall „Weiter auf Papier und zurück“ mit drei Sätzen: wer trägt nach, in welcher Reihenfolge, Papier gilt für die Ausfallzeit.
- **Verifikation:** Zwei Bediener tragen denselben Block parallel nach; das Programm weist die zweite Erfassung jeder Nummer sichtbar hin; das Tagebuch ist nach Nummer vollständig und dublettenfrei.

### P2-1 · Zeitschreibweisen sind nicht überall gleich — „1412“ geht im Auftrag, aber nicht in der Zelle „Eingetroffen“

- **Fundstelle / Aufgabe:** Lage → Spalten → Ressourcen → Zelle „Eingetroffen“ (`33-eingetroffen-1412.png`, `34-zeit-*.png`); Maske „Auftrag erfassen“ (`05-auftrag-maske-gefuellt.png`).
- **Beobachtung:** [beobachtet] Zelle „Eingetroffen“: „14:12“ → 05.11.2026 14:12, „05.11. 13:05“ → richtig, **„1412“ und „1305“ → abgewiesen** mit „Zeit als TT.MM.JJJJ HH:MM, „29.10. 14:30“ oder „14:30“ (heute)“ (`useZellbearbeitung.ts:46`). Die Maske „Auftrag erfassen“ nimmt „1430“ an (Hinweistext dort: „14:30“, „1430“ oder „30.10. 14:30“; `funkzeit.ts:18-35`). [beobachtet] „23:50“ um 20:55 Uhr wird als heutiges Eintreffen in der Zukunft ohne Rückfrage geschrieben. [Annahme] Wer nach Mitternacht „2350“ vom Block nachträgt, bekommt „heute 23:50“ — einen Tag zu spät.
- **Erwartung der Rolle:** Auf dem Block steht „1412“, ohne Doppelpunkt. Ein Zeitfeld nimmt, was das andere nimmt.
- **Auswirkung im Einsatz:** Beim Nachtragen in Serie fliegt jede dritte Zeile mit Hinweis heraus; man lernt zwei Regeln für dasselbe. Zukunftszeiten nach Mitternacht verschieben Eintreffen und Einsatzdauer still.
- **Empfehlung:** Ein Zeitleser für alle Felder (Funkzeit „1412“, „051412“ eingeschlossen). Bei Zeiten mehr als einige Minuten in der Zukunft nachfragen („gestern 23:50?“).
- **Verifikation:** Dieselben fünf Schreibweisen in Zelle, Auftrag, Tagebuch und (nach P0-1) Status ergeben dieselben Zeitpunkte; „2350“ um 00:30 wird als Vortag angeboten.

### P2-2 · Der Tagebuch-Ausdruck mischt Meldezeit und Erfassungszeit — was nachgetragen wurde, sieht man auf Papier nicht mehr

- **Fundstelle / Aufgabe:** Ausgaben → „Tagebuch als HTML“ → Drucken (`15-tagebuch-druck.png`).
- **Beobachtung:** [beobachtet] Am Bildschirm hat das Tagebuch zwei Zeitspalten „Erfasst“ und „Zeit der Meldung“ — gut. Der Ausdruck hat eine Spalte „Zeit“. Der um 20:43 erfasste Auftrag mit Beginn 14:30 steht dort als „05.11.2026 14:30“ zwischen Einträgen von 20:35 und 20:43, ohne Kennzeichen. [Code] `zeitText(zeile.zeitpunkt ?? zeile.wanduhr)` (`packages/ausgaben/src/listen.ts:82`), Reihenfolge nach Erfassung (`listen.ts:97`).
- **Erwartung der Rolle:** Das gedruckte Tagebuch geht in die Einsatzakte und in die Nachbereitung. Ein Nachtrag muss als Nachtrag erkennbar sein — auf Papier schreibt man „nachgetragen 20:43“ daneben.
- **Auswirkung im Einsatz:** Wer die Akte liest, sieht scheinbar chronologische Fehler („14:30 nach 20:35“) oder hält Nachträge für Echtzeitmeldungen. Bei Rückfragen ist nicht mehr zu belegen, was wann bekannt war.
- **Empfehlung:** Im Ausdruck beide Zeiten (Meldung, Erfasst) oder eine Marke „nachgetr. 20:43“, sobald sie mehr als wenige Minuten auseinanderliegen.
- **Verifikation:** Nachgetragenen Auftrag und Tagebucheintrag drucken; beide tragen sichtbar Meldezeit und Erfassungszeit.

### P2-3 · Die gedruckte Einheitenliste ist ein Lesestand, kein Arbeitsblatt — und passt nicht zum leeren Vordruck

- **Fundstelle / Aufgabe:** Einheitenliste als HTML und als Druck (`12-einheitenliste-kopf.png`, `12-einheitenliste.pdf`, 3 Seiten quer) neben „Papier-Vordruck: Einheitenliste“ (`13-papier-vordruck.png`).
- **Beobachtung:** [beobachtet] Die Liste ist richtig gegliedert (Bereich mit Zwischensumme, Ist/Erwartet/Alle getrennt, Stand im Kopf), Aufträge stehen drin. Aber: keine Leerzeilen und keine leere Spalte „neuer Status / Zeit“ zum Weiterführen mit Bleistift; „Nr.“ ist die Zeilenposition dieses Ausdrucks, keine bleibende Kennung; unter „Geräte / Fahrzeuge“ steht nur „GKW I“, das erfasste Kennzeichen „THW-84123“ fehlt; kein Funkrufname. Der leere Vordruck hat andere Spalten in anderer Reihenfolge (Abschnitt, „Funkruf / Kontakt“, Eintreffen; `papier.ts:88`). Im Kopf stehen `2026-09-08_uebung-weser-ems_227e68` und `@bos/eeb-format 0.0.0` — für den Helfer Rauschen.
- **Erwartung der Rolle:** Den Ausdruck lege ich bei Ausfall auf den Tisch und führe auf ihm weiter: Status durchstreichen, neuen mit Uhrzeit daneben, neue Einheiten unten anhängen. Und wenn ich auf den leeren Vordruck wechsle, sollen die Spalten dieselben sein.
- **Auswirkung im Einsatz:** Weiterführen heißt auf den Rand kritzeln; beim Nachtragen muss man zwei verschieden aufgebaute Blätter zusammenlesen. Fahrzeuge lassen sich auf dem Papier nicht über das Kennzeichen identifizieren.
- **Empfehlung:** Einheitenliste mit Spalte „Änderung (Status/Zeit)“ und einigen Leerzeilen je Bereich; Spalten von Ausdruck und Vordruck angleichen; Kennzeichen und Funkrufname mitdrucken; Technikzeilen aus dem Kopf in die Fußzeile.
- **Verifikation:** 30 Minuten auf dem Ausdruck weiterführen und danach nachtragen, ohne ein zweites Blatt zu brauchen.

### P2-4 · Rechnerausfall mit noch nicht übertragenen Daten: die Störfallkarte widerspricht sich (unverändert seit 29.10.)

- **Fundstelle / Aufgabe:** Diagnose („Nicht übertragen: 0 B“, Pfad „Lokaler Spiegel …/arbeitsplaetze/4c2dd5…/spiegel“, `28-diagnose.png`); Störfall „Die Anwendung startet nicht“, Schritt 4.
- **Beobachtung:** [beobachtet] „Nicht übertragen“ nennt weiterhin nur Bytes, keine Liste der betroffenen Einheiten. [Code] Störfall 5 sagt „Der lokale Zwischenspeicher darf gelöscht werden … die Wahrheit liegt dort [auf dem Share]“ (`packages/domaene/src/stoerfaelle.ts:148`), Störfall 1 sagt, bei Share-Ausfall werde „in den Zwischenspeicher“ weitergeschrieben. [nicht prüfbar] echter Share- und Rechnerausfall im Electron-Betrieb.
- **Erwartung der Rolle:** Ich will wissen, *was* drüben fehlt, damit ich es auf einen Zettel schreiben kann, bevor ich den Rechner aufgebe.
- **Auswirkung im Einsatz:** Wer Störfall 5 befolgt, nachdem der Share weg war, löscht genau die Meldungen, die nur dort lagen.
- **Empfehlung:** Schritt 4 an die Bedingung „Nicht übertragen: 0“ knüpfen; sonst Spiegel sichern. „Nicht übertragen“ als Anzahl mit „Zeigen“ (die Liste ist der Zettel für den Rechnertausch).
- **Verifikation:** Share trennen, drei Statuswechsel, Anwendung beenden; die Diagnose bzw. Karte führt dazu, die drei Änderungen vor dem Löschen zu sichern.

### P3-1 · Kleinigkeiten an der Druckstrecke der Web-Schale

- [beobachtet] Im Browser stehen 11 „… als PDF“-Knöpfe; ein Druck darauf zeigt erst dann „PDF gibt es nur in der Desktop-App. Im Browser die Ausgabe als HTML erzeugen und mit ‚Drucken‘ ausgeben.“ (`11-pdf-versuch.png`). Die Meldung ist klar — die Knöpfe sollten im Browser gar nicht erst stehen oder gleich HTML+Drucken auslösen.
- [beobachtet] Die Hilfe sagt bei den Störfällen „die Kurzanleitung druckt sie“ (`Hilfeteile.tsx:134`), einen Knopf dafür gibt es weder in Hilfe noch in Ausgaben. Die Störfallkarte ist das wichtigste Papier im Ausfall.
- [beobachtet] Bei getrennter Verbindung steht neben dem grauen „Eintrag speichern“ „Text eintragen“, obwohl Text drinsteht (`18-offline-speichern.png`) — der Grund ist die Verbindung, nicht der Text.
- **Empfehlung:** PDF-Knöpfe in der Web-Schale ausblenden; „Kurzanleitung drucken“ in Hilfe und Ausgaben; Sperrgrund am Knopf richtig benennen.

### P3-2 · „Arbeitsplatz“ als Name überall — „Nachgetragen von“ auf dem Vordruck lässt sich keinem Eintrag zuordnen

- [beobachtet] Ohne gesetzten Anzeigenamen heißt jeder Browser „Arbeitsplatz“ auf Rechner „vm“; die Diagnose zeigt drei gleichnamige Arbeitsplätze, das Tagebuch als Akteur „Arbeitsplatz“, eine verwaiste Sitzung hält eine Zellsperre „wird von Arbeitsplatz bearbeitet“ (`34-zeit-c.png`).
- **Auswirkung:** Der Papiervermerk „nachgetragen von Meyer 20:43“ lässt sich im Tagebuch nicht wiederfinden.
- **Empfehlung:** Beim Öffnen eines Einsatzes ohne Anzeigenamen einmal nach dem Namen fragen; im Tagebuch-Ausdruck den Namen statt „Arbeitsplatz“.

---

## Gegenüber dem 29.10. erledigt (aus Rollensicht)

- **Aufträge und Fahrzeuge erfassbar** (alter P0-1): „+“ an Aufträge/Fahrzeuge/Personen der gewählten Einheit, Auftrag mit Beginn vom Block; Einheit „Ohne Vorlage“. [beobachtet]
- **Zeitzellen** nehmen „14:12“ und „05.11. 13:05“ und zeigen Ortszeit (alter P0-2, teilweise — Status/Funk siehe P0-1, „1412“ siehe P2-1). [beobachtet]
- **Einheitenliste druckbar**, Ausgaben mit „Öffnen · Herunterladen · Drucken“ (alter P1-1, P1-3 teilweise). [beobachtet]
- **Papier-Vordrucke** aus der App und auf der Offline-Seite. [beobachtet]/[Code]
- **Einsatzakte per Knopf** mit „Herunterladen“ (alter P2-2): `…_akte_2026-11-05_2053.zip`, 134 Ereignisse. [beobachtet]
- **Personalerfassung im Klartext** („Nur Stärke“) statt Rohcode. [beobachtet]
- Ehrliche Sperre bei Dienstausfall, Eingaben bleiben in offenen Masken (ADR-007). [beobachtet]

Weiter offen und hier nicht erneut geprüft (Korb der Prüflage leer): druckbare Quittung „übernommen/abgelehnt“ für den Meldekopf (alter P2-4). „Meldungen als Datei speichern“ im „⋯“ des Eingangskorbs ist vorhanden [beobachtet].

---

## Analog-/Digital-Übergabematrix

| Prozessschritt | Digitaler Nutzen | Analoger Fallback | Sauberer Wiedereinstieg in Digital |
|---|---|---|---|
| Einheit meldet sich am Meldekopf (Papierbogen) | Scan/Bündel, Dubletten am Bogen erkannt, Aufträge/Fahrzeuge jetzt erfassbar | Bogen bleibt Urschrift | „Ohne Vorlage“ und „+ Auftrag/Fahrzeug“ gehen; **Lücke:** Einheit startet immer als „Angefordert“, Eintreffen per Status nur mit Klickzeit (P0-1) |
| Statuswechsel / Eintreffen | Summen sofort an allen Plätzen, Tagebuch automatisch | Meldeblock mit Uhrzeit, Einheitenliste mit Bleistift | Eintreffzeit in der Zelle ja (nicht „1412“, P2-1); **Status ohne Meldezeit (P0-1)** |
| Funkverkehr / Kontaktüberwachung | Bernstein-Marke „kein Kontakt > 60 min“, Funkplan druckbar | Funkprotokoll-Vordruck, Funkplan-Vordruck | **Funkprobe nur „jetzt“**, nachgetragener Status setzt Kontakt auf jetzt (P0-1); Strg+P schreibt Kontakt (P1-1) |
| Meldungen ins Einsatztagebuch | Volltextsuche, Meldezeit getrennt von Erfassung am Bildschirm | Meldeblock-Vordruck mit „im Rechner nachgetragen“ | Meldezeit tippbar; **keine laufende Nummer, keine Dublettenwarnung, Wege ungleich** (P1-3); Ausdruck verwischt Nachtrag (P2-2) |
| Dienst/Rechner fällt aus | Ehrliche Sperre, Masken behalten Eingaben | Leere Vordrucke; letzter Ausdruck der Einheitenliste | **Kein aktueller Stand abrufbar** ohne vorherigen Druck (P1-2); Spiegel-Hinweis widersprüchlich (P2-4) |
| Lagebesprechung / Wand | Einheitenliste, Druck, Status, Funkplan als HTML mit „Drucken“ | Ausdruck, Whiteboard | Einbahnstraße, unkritisch; Ausdruck taugt nur bedingt zum Weiterführen (P2-3) |
| Einsatzende / Akte | Einsatzakte-ZIP per Knopf | Ausdrucke in den Ordner | Funktioniert; Tagebuch-Ausdruck sollte Nachträge kenntlich machen (P2-2) |

---

## Würde ich dafür das Papier weglegen?

**Für die laufende Lageführung mit Netz: ja — den Meldeblock aber nicht, und nach einem Ausfall noch nicht.** Der Papierbogen vom Meldekopf passt jetzt vollständig in den Rechner, die Einheitenliste kommt aus dem Drucker, und die Software sagt ehrlich, wann sie nichts speichert. Solange aber ein nachgetragener Statuswechsel die Zeit des Klicks bekommt und dabei im Funkplan einen Kontakt vortäuscht, ist das Papier für die Ausfallzeit die einzige zeitrichtige Quelle — und ich müsste es nach dem Wiederanlauf neben dem Rechner aufbewahren, weil der Rechner für diese Stunde etwas Falsches sagt.

---

- **Aufgabe geschafft:** mit Umwegen — Papierbogen übernehmen und Stand drucken ja; Meldeblock nach Ausfall zeitrichtig nachtragen nein (Status, Funkprobe).
- **Fremde Hilfe nötig:** nein.
- **Größtes Missverständnis:** Dass „Zeit der Meldung“, die es beim Auftrag und im Tagebuch gibt, auch für den Statuswechsel gilt — dort zählt still die Klickzeit, und der Funkplan rechnet damit den letzten Kontakt.
- **Größtes Einsatzrisiko:** Nach dem Nachtragen eines Papierausfalls zeigt der Funkplan alle Einheiten als frisch gemeldet, und eine tatsächlich seit über einer Stunde schweigende Einheit fällt durch die Kontaktüberwachung.
- **Top-Priorität für die nächste Iteration:** Ein Feld „Zeit der Meldung“ (leer = jetzt, „1412“ erlaubt) am Statuswechsel und an der Funkprobe, das in `ereignisZeit` bzw. die Funkzeit geht — der Vertrag dafür existiert schon (P0-1); gleich danach Strg+P zurück an den Druck (P1-1).
