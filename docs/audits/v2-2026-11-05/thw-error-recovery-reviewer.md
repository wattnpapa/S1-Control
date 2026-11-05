# Audit „Fehler und Rückweg“ — S1-Control v2, Stand 05.11.2026

**Rolle:** Helfer in der Führungsstelle, Profil „Führungsstelle (S1)“, unter Zeitdruck. Macht die üblichen Fehler: Doppelklick, Zahlendreher, falsche Auswahl, halb ausgefüllte Masken, Neuladen, Kollege am Nachbarplatz ändert dasselbe. Will danach **ohne Admin** weiterarbeiten.

**Material:** Eigene Web-Schale (http://127.0.0.1:8204) mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten), Stand HEAD `ffc3125`. Begehung mit Playwright (zwei Browserprofile als zwei Arbeitsplätze, Netztrennung per `setOffline`, Dienst-Neustart per `kill`). Screenshots unter `scratchpad/shots/error-recovery/` (Dateinamen in den Findings). Quelltext nur als Beleg (Datei:Zeile, Pfade relativ zu `apps/desktop/src/` bzw. `packages/domaene/src/`). Handbuch `docs/v2/HANDBUCH.md` und Kurzanleitung zum Abgleich der Zusagen. Vorgänger: `docs/audits/v2-2026-10-29/thw-error-recovery-reviewer.md`.

**Kennzeichnung:** **[beobachtet]** selbst in der laufenden Anwendung ausgelöst · **[Code]** aus dem Quelltext belegt · **[Annahme]** plausible Folgerung, auch zu THW-Abläufen · **[nicht prüfbar]** in der Web-Schale nicht nachzustellen.

**Hinweis zur Prüflage:** Alle Schreibversuche liefen in meiner eigenen Kopie. Ich habe dort absichtlich einen zweiten Einsatz „Übung Weser-Ems“ (08.09.**2062**) angelegt, zwei Zusammenführungen in „EA Schule Mitte“ geschrieben und eine doppelte Anforderung „ANF-2026-001“ erzeugt. Die gemeinsame Prüflage ist unberührt.

---

## Urteil aus Sicht der Rolle

**Was seit dem 29.10. trägt.** Die Stärkezelle schreibt keinen Text mehr: „0/18“ und „0,2,20“ werden an der Zelle mit „Stärke als Fü/UFü/He, z. B. 0/1/8“ abgewiesen, die Eingabe bleibt stehen (12, 48). **Rückgängig überlebt das Neuladen** und nennt den Schritt in Klartext („Rückgängig: Stärke der Einheit ‚BGr 2 Oldenburg‘ geändert“), fragt vorher nach und meldet „✓ Zurückgenommen …“ (15, 16). Aufteilen sperrt bei mehr Abzug als vorhanden mit konkreter Meldung (31), „Entfernen“ beginnt mit leerem Grund. Doppelklick auf „Einheit anlegen“ oder „Anfordern“ legt **eine** Einheit bzw. Anforderung an. Ein halb ausgefülltes Anforderungsformular übersteht Schließen und Neuladen, der Browser warnt vor dem Verlassen (34, 35). Bei **Netzverlust** bleibt die Maske offen, „Anfordern“ ist gesperrt mit Satz, und nach der Rückkehr steht alles noch da (52, 53). Das ist deutlich besser als vor einer Woche.

**Wo es reißt.** Der schwerste Fehler aus dem Vorgänger-Audit ist **nicht behoben, sondern jetzt bestätigt**: „Zusammenführen“ lässt sich mit leerem Ziel bestätigen, meldet „gespeichert“, schreibt eine falsche Zusammenführung ins Tagebuch, lässt sich nicht zurücknehmen **und blockiert danach die richtige Zusammenführung** (F1). Rückgängig nimmt am Nachbarplatz still einen jüngeren Wert weg (F2). Ein echter Doppelklick auf einen Maskenknopf trifft „Abbrechen“ und wirft die Eingaben weg (F3). Strg+N öffnet zwei Masken übereinander (F4). Konflikthinweise sind weiter nur eine Zahl, die durch eigene Fehlbedienung wächst (8 → 14), ohne dass man den Ort findet (F5). Eine falsche Bündeldatei wird als „0 aufgenommen“ quittiert (F6). Unplausible Werte — Jahr 2062, doppelte Anforderungskennung, 80 Helfer in einer Gruppe — gehen ohne Rückfrage durch, und manches davon (Einsatz, Anforderung, Herkunft) ist danach nicht mehr korrigierbar (F7, F8, F12).

**Ohne fremde Hilfe?** Zahlendreher in Stärke, Status, Abschnitt: ja, auch nach Neuladen. Falsch angelegter Einsatz, falsche Anforderungskennung, falsche Herkunft: nur mit Umweg (beenden, stornieren, entfernen und neu). Fehlbediente Zusammenführung: **nein**.

---

## Findings

### F1 — P0 — Zusammenführen ohne Ziel wird geschrieben, ist nicht zurücknehmbar und sperrt die richtige Zusammenführung (beobachtet; Rest aus 29.10., dort F4)

- **Fundstelle / Aufgabe:** Lage → Abschnitt „EA Schule Mitte“ wählen → „St PSNV“ und „St Registrierung“ markieren → Auswahlleiste „Zusammenführen“. Shots 19, 20, 21, 24, 25, 26.
- **Beobachtung:** [beobachtet] Die Maske zeigt „Ziel — die Einheit, die bestehen bleibt: — bitte wählen —“, darunter „geht auf: St PSNV (4)“ **und** „geht auf: St Registrierung (4)“ — und der Knopf „Zusammenführen“ ist **aktiv** (19). Ein Klick (oder Enter) schreibt; Statuszeile: „✓ Einheit ‚EO3‘ zusammengeführt · gespeichert“ — „EO3“ ist die Kennung des Abschnitts, keine Einheit (20). Die Tabelle zeigt beide Einheiten weiter mit ihrer Stärke; der Zähler springt von 8 auf 10 Konflikthinweise. Das Einsatztagebuch schreibt: „Einheiten zusammengeführt: St PSNV und St Registrierung aufgegangen in EO3“ (26).
  - Rückgängig bietet „Rückgängig: Einheit ‚EO3‘ zusammengeführt“ an, fragt „rückgängig machen?“, ich bestätige — **es passiert nichts**, der Knopf bietet denselben Schritt weiter an. Der Grund steht in einem Kasten „Hinweise“ **unterhalb der 40-Zeilen-Tabelle**, außer Sicht: „„Einheit zusammengeführt“ wird durch den inversen Fachvorgang „Einheit aufgeteilt“ zurückgenommen. Die Werte dafür stehen nicht im Original. Bitte über den Vorgang „Einheit aufgeteilt“ zurücknehmen.“ (24) — aus „EO3“ kann man nichts aufteilen.
  - Danach die **richtige** Zusammenführung (Ziel „St Registrierung“ gewählt): „✓ Einheit ‚St Registrierung‘ zusammengeführt · gespeichert“, Tagebuch „St PSNV aufgegangen in St Registrierung“ — aber „St PSNV“ steht weiter als eigene Zeile, Summe unverändert 3/10/42, Konflikthinweise 11 (25, 26).
  - [Code] `renderer/Einheitenmasken.tsx:56,61-66` belegt `ziel` für jede Maske außer „Verschieben“ mit der **Abschnitts**-Kennung vor; `:248` prüft nur `ziel !== ""`. `domaene/fold.ts:555-563` setzt `aufgegangenIn` per `setzeErstwert` — der erste (falsche) Wert bleibt, jede spätere Zusammenführung derselben Quelle verliert. `fold-struktur.test.ts:315` belegt, dass ein unbekanntes Ziel die Quelle „eigenständig lässt“ — die Stärke stimmt also, aber Akte und Tagebuch sagen etwas anderes.
- **Erwartung der Rolle:** Ohne gewähltes Ziel ist „Zusammenführen“ grau. Wenn der Knopf „Rückgängig: …“ anbietet, dann geht es auch. Und ein Fehler sperrt nicht die spätere Korrektur.
- **Auswirkung im Einsatz:** Ein Doppel-Enter beim Zusammenlegen zweier Staffeln erzeugt einen dauerhaft falschen Tagebucheintrag (Dokumentationspflicht) und macht die eigentlich gewollte Zusammenlegung unmöglich: Die Lage zeigt zwei Einheiten, das Tagebuch behauptet zweimal das Gegenteil. Rückweg nur über einen Admin am Ereignisprotokoll. Wer nach „gespeichert“ nicht in die Tabelle schaut, glaubt die Staffeln zusammengelegt.
- **Empfehlung:** Zielauswahl der Zusammenführung leer beginnen und nur gegen die markierten Einheiten zulassen; Schreibseite weist ein Ziel ab, das keine Einheit ist. Rückgängig darf einen Schritt, den es nicht zurücknehmen kann, gar nicht erst anbieten — oder sagt es **in der Frage-Maske** und bietet den passenden Weg an. Eine wirkungslose Zusammenführung muss als „nicht wirksam“ gemeldet werden, nicht als „gespeichert“. Für den bereits geschriebenen Fall eine Berichtigung („Zusammenführung war fehlerhaft“) über die Oberfläche.
- **Verifikation:** Abschnitt wählen, zwei Einheiten markieren, „Zusammenführen“ → Knopf grau mit „Ziel wählen …“. Ein Ereignis mit Abschnitts-Ziel (Test) → Schreibseite weist ab. Nach einer fehlerhaften Zusammenführung führt die richtige zum erwarteten Ergebnis (eine Zeile, Summe im Ziel).

### F2 — P1 — Rückgängig nimmt am anderen Arbeitsplatz still einen jüngeren Wert weg (beobachtet)

- **Fundstelle / Aufgabe:** Zwei Arbeitsplätze, Lage, Stärke „LG Rastede“. Shots 46, 47.
- **Beobachtung:** [beobachtet] Platz A setzt 1/1/7 → 1/1/8. Platz B sieht 1/1/8 und setzt 1/2/8. A sieht 1/2/8, drückt „Rückgängig: Stärke der Einheit ‚LG Rastede‘ geändert“. Die Frage-Maske sagt ausdrücklich: „Es nimmt nur Ihren letzten eigenen Schritt zurück, nicht den eines anderen Arbeitsplatzes.“ Ergebnis an **beiden** Plätzen: **1/1/7 ⚠** — die Änderung von B ist weg. Kein Hinweis an A, dass ein jüngerer fremder Wert überschrieben wird; B bekommt nur ein ⚠ an der Zelle und einen Konflikthinweis mehr (13 → 14). Bs eigener Knopf bietet weiter „Rückgängig: Stärke … geändert“ an.
  - [Code] Die Zellbearbeitung prüft den Vorwert und überschreibt nicht still (`renderer/useZellbearbeitung.ts:105-110`, `mitVorwertpruefung`); der Rücknahmeweg (`renderer/Ruecknahme.tsx:110-117`) hat keine entsprechende Rückfrage.
- **Erwartung der Rolle:** „Achtung: Platz ‚vm-2‘ hat den Wert inzwischen auf 1/2/8 gesetzt. Trotzdem auf 1/1/7 zurück?“
- **Auswirkung im Einsatz:** Der Kollege hat gerade eine neue Stärkemeldung eingetragen; ich nehme meinen alten Zahlendreher zurück und lösche damit seine Meldung. Die Gesamtstärke stimmt danach nicht, und beide glauben, alles richtig gemacht zu haben.
- **Empfehlung:** Vor der Rücknahme gegen den aktuellen Wert prüfen wie bei der Zelle; ist er fremd geändert, den fremden Wert nennen und nur bewusst überschreiben lassen (oder die Rücknahme ablehnen). Text der Frage-Maske an das tatsächliche Verhalten anpassen.
- **Verifikation:** Wie oben in zwei Fenstern → A erhält vor dem Bestätigen die Nennung „inzwischen 1/2/8 von …“, Standard ist „nicht zurücknehmen“.

### F3 — P1 — Doppelklick auf einen Maskenknopf trifft „Abbrechen“; die Eingaben sind weg (beobachtet)

- **Fundstelle / Aufgabe:** Einsatzauswahl → „Neuer Einsatz …“ → Name „Übung Weser-Ems“, Datum 08.09.2026 (gibt es schon), Führungsstelle → Doppelklick auf die **Mitte** von „Einsatz anlegen“. Shots 05, 06, 07.
- **Beobachtung:** [beobachtet] Einfacher Klick: Die Maske bleibt mit allen Eingaben offen, Grund „Ein Einsatz mit diesem Namen existiert bereits.“ (06) — so verspricht es das Handbuch. **Doppelklick in die Mitte:** Die Maske ist zu, alle Eingaben weg, oben steht nur das rote Band (07). Mit einem Klick-Protokoll nachgewiesen: Der zweite Klick landet auf `BUTTON.abbrechen`. Ursache: Nach dem ersten Klick zeigt der Hauptknopf „…“ statt „Einsatz anlegen“, wird schmaler, und „Abbrechen“ rutscht unter den Mauszeiger. Doppelklick am linken Rand oder zwei Klicks mit 50 ms Abstand: Maske bleibt.
  - [Code] `renderer/Maske.tsx:183-190` (`{laeuft ? "…" : bestaetigungstext}`, „Abbrechen“ direkt daneben). Das gilt für **jede** Maske des Programms. Bei Erfolg ist es harmlos (die Maske schließt ohnehin); bei Ablehnung, „Unklar, ob gespeichert“ oder Schreibstörung verschwindet mit der Maske auch der Grund.
- **Erwartung der Rolle:** Doppelklick ist eine Gewohnheit, kein Fehler. Er darf höchstens einmal auslösen — und nie das Gegenteil.
- **Auswirkung im Einsatz:** Lange Maske (Einsatz mit Stammdaten, Anforderung, Rufgruppe) neu tippen, und die Ablehnungsmeldung ist weg, also auch der Hinweis, warum es nicht ging.
- **Empfehlung:** Der Hauptknopf behält während des Schreibens seine Breite; „Abbrechen“ wird während des Schreibens kurz gesperrt oder liegt nicht unmittelbar daneben.
- **Verifikation:** In jeder Maske Doppelklick auf die Knopfmitte bei einem Fall, der abgewiesen wird → Maske offen, Grund sichtbar, Eingaben vollständig.

### F4 — P1 — Strg+N öffnet „Einheit anlegen“ und „Abschnitt anlegen“ gleichzeitig; der Fokus steht in der falschen (beobachtet)

- **Fundstelle / Aufgabe:** Lage, Strg+N — nach Klick in den Baum, nach Klick in eine Tabellenzeile und nach Klick ins Leere. Shot 30.
- **Beobachtung:** [beobachtet] In allen drei Fällen liegen zwei Masken übereinander: unten „Einheit anlegen“, darüber „Abschnitt anlegen“ mit dem Cursor im Feld „Name“. Wer eine Einheit anlegen will und gleich „FGr N“ + Enter tippt, legt einen **Abschnitt** „FGr N“ an. Esc schließt nacheinander beide.
  - [Code] Beide Blätter melden das Kürzel an: `renderer/Abschnittsbaum.tsx:116` und `renderer/Einheitentabelle.tsx:146-153`. Das Handbuch nennt Strg+N an beiden Stellen.
- **Erwartung der Rolle:** Strg+N tut genau eine Sache — die, wo ich gerade bin; wie die Kurzanleitung sagt: „Neuen Eintrag anlegen“.
- **Auswirkung im Einsatz:** Falscher Abschnitt im Baum, eine Einheit fehlt in der Lage; Aufräumen kostet Auflösen mit Grund und Neueingabe.
- **Empfehlung:** Ein Kürzel, ein Ziel: nach dem zuletzt bedienten Bereich (Baum oder Tabelle), sonst nur Einheit.
- **Verifikation:** In Baum, Tabelle und leer Strg+N → jeweils genau eine Maske, Titel passend zum Bereich.

### F5 — P1 — Konflikthinweise: Zahl ohne Ort; die Erklärung verspricht ⚠, die Tabelle zeigt keines (beobachtet; Rest aus 29.10., dort F8)

- **Fundstelle / Aufgabe:** Statuszeile „⚠ 8 Konflikthinweise“, Klick darauf; Tabelle mit allen Spaltengruppen (Grunddaten, Stärke, Ressourcen, Logistik, Kosten, Funk). Shots 17, 18.
- **Beobachtung:** [beobachtet] Der Klick öffnet jetzt eine Erklärung („… Betroffene Felder tragen in der Tabelle ein ⚠. Auflösen: mit dem Kollegen klären …“) — besser als die nackte Zahl. Aber: In der Tabelle steht bei 8 Hinweisen **kein einziges ⚠**, auch nicht mit allen 37 Spalten. Im Verlauf meiner Fehlbedienungen wuchs die Zahl auf 14 (falsche Zusammenführung +2, doppelte Anforderung +1 usw.), ohne dass irgendwo stand, welcher Hinweis wozu gehört. Erst der echte Zwei-Platz-Konflikt (F2) zeigte ein ⚠ an der Zelle. Die Diagnose nennt nur „Konflikthinweise: n“ [Code] `renderer/Diagnose.tsx:174`; Erklärungstext `renderer/statushinweise.ts:25-29`. Handbuch und Kurzanleitung versprechen weiter: „Der Hinweis nennt Feld, Gewinner und verdrängten Wert.“
- **Erwartung der Rolle:** Klick → Liste: Einheit/Anforderung/Abschnitt, Feld, geltender und verdrängter Wert, wer, wann, Sprung zur Zeile.
- **Auswirkung im Einsatz:** Die Zahl steigt, niemand weiß warum; nach dem dritten Mal ignoriert man sie — und übersieht den einen echten Konflikt, bei dem eine Stärkemeldung verdrängt wurde.
- **Empfehlung:** Hinweisliste mit Ort und Werten (auch für Hinweise außerhalb der Einheitentabelle: Anforderungen, Zusammenführungen, unbekannte Referenzen); Erklärungstext nur behaupten, was die Tabelle zeigt.
- **Verifikation:** In der Prüflage → Klick auf die Zahl → acht Zeilen mit Ort und Werten; jede führt zur Stelle.

### F6 — P1 — Falsche oder kaputte Bündeldatei: „0 aufgenommen, 0 schon bekannt“ statt Fehlermeldung (beobachtet + Code)

- **Fundstelle / Aufgabe:** Eingang → Eingangskorb → „Bündel einlesen …“ → Abschnitt „Meldekopf“, Datei: kaputtes JSON, leeres JSON, eine CSV-Liste. Shots 39, 40-*.
- **Beobachtung:** [beobachtet] Alle drei Dateien: Maske schließt, über dem Korb steht „0 aufgenommen, 0 schon bekannt“ — wie bei einem zweimal eingelesenen, gültigen Bündel. [Code] Der Dienst kennt den Grund: `worker/aktendienst.ts:1355` (`buendelUrsachen`) liefert `abgelehnt` mit Klartext („Datei nicht lesbar, falsches Format …“, Vertrag `kontrakt/index.ts:967-972`); der Renderer zeigt ihn nicht — `renderer/Buendel.tsx:31-34` baut den Satz nur aus den drei Zahlen.
- **Erwartung der Rolle:** „Diese Datei ist kein Bündel vom Meldekopf (falsches Format). Richtige Datei vom Stick wählen.“
- **Auswirkung im Einsatz:** Der Melder bringt den falschen Stick oder die falsche Datei; die Führungsstelle glaubt, die Meldungen seien schon drin („schon bekannt“ klingt so), und wartet auf Einheiten, die nie im Korb ankommen. [Annahme] Gerade beim Weg ohne Netz ist das der Normalfall, nicht die Ausnahme.
- **Empfehlung:** Die gelieferten Ursachen sichtbar machen; bei 0 aufgenommen und 0 bekannt die Maske offen lassen mit Grund und „Andere Datei wählen“.
- **Verifikation:** Kaputtes JSON einlesen → Maske bleibt, Grund in Klartext, Dateiwahl erneut möglich.

### F7 — P1 — Zahlendreher im Datum legt einen zweiten, gleichnamigen Einsatz an, der sich nicht mehr entfernen lässt (beobachtet)

- **Fundstelle / Aufgabe:** Einsatzauswahl → „Neuer Einsatz …“ → Name „Übung Weser-Ems“, Datum „08.09.2062“ statt „08.09.2026“. Shots 08, 10.
- **Beobachtung:** [beobachtet] „31.13.2026“ wird sauber abgewiesen („Das Datum ist nicht lesbar“), „08.09.2062“ dagegen ohne Rückfrage angenommen — die Namensprüfung greift nur am selben Tag. Der neue, leere Einsatz öffnet sofort (0/0/0). Zurück in der Liste stehen zwei „Übung Weser-Ems“ untereinander, der **falsche oben mit gefülltem „Öffnen“** (10). Die Liste kennt kein Entfernen oder Umbenennen; der Einsatz lässt sich nur beenden (Blatt Ausgaben), danach steht er blass darunter. [Code] `renderer/einsatzanlage.ts:35-42` prüft nur, ob das Datum existiert; Sortierung „zuletzt genutzt“ `renderer/Einsatzliste.tsx:34-46`. Die Beenden-Maske nennt nur den Namen, nicht das Datum (`renderer/Einsatzabschlussmasken.tsx:70`).
- **Erwartung der Rolle:** „Das Datum liegt 36 Jahre in der Zukunft — wirklich?“ und „Es gibt schon ‚Übung Weser-Ems‘ vom 08.09.2026 — öffnen statt neu anlegen?“
- **Auswirkung im Einsatz:** [Annahme] Ein zweiter Rechner, der die Liste nach Gewohnheit von oben bedient, öffnet den leeren Einsatz und erfasst dort — die Lage zerfällt auf zwei Dateien, beide mit identischem Namen auf jedem Ausdruck.
- **Empfehlung:** Datum außerhalb eines plausiblen Fensters (z. B. ±1 Jahr) nachfragen; bei gleichem Namen an anderem Tag den vorhandenen Einsatz mit „Öffnen“ anbieten; einen versehentlich angelegten, leeren Einsatz über die Oberfläche verwerfen können; in Liste und Beenden-Maske Name **und** Datum gleich stark zeigen.
- **Verifikation:** „08.09.2062“ eintippen → Rückfrage; gleicher Name anderes Datum → Hinweis mit „Öffnen“; leerer Fehl-Einsatz → „Verwerfen“ vorhanden.

### F8 — P1 — Doppelte Anforderungskennung wird angenommen; eine angelegte Anforderung ist nicht berichtigbar (beobachtet)

- **Fundstelle / Aufgabe:** Eingang → Anforderungen → „Anforderung anlegen“ mit Kennung „ANF-2026-001“ (gibt es schon). Shots 33–37.
- **Beobachtung:** [beobachtet] Angenommen, keine Warnung; die Liste führt zweimal „Offen · ANF-2026-001“ mit verschiedenen Einheiten und Aufträgen. Konflikthinweise +1. Die neue Anforderung bietet in Leiste und Kontextmenü nur „Zusagen …“ und „Stornieren …“ (37); Kennung, vorgesehene Einheit und Auftrag sind weder per Doppelklick noch per Maske änderbar. Solange es der letzte eigene Schritt ist, hilft Rückgängig; danach bleibt nur Stornieren mit Grund und neu anlegen.
- **Erwartung der Rolle:** „ANF-2026-001 gibt es schon (BGr THW OV Varel) — andere Kennung?“ und ein „Bearbeiten …“ für Tippfehler, solange die Anforderung offen ist.
- **Auswirkung im Einsatz:** [Annahme] Rückfragen bei der anfordernden Stelle laufen über die Kennung; zwei gleiche Kennungen führen zu Zusage oder Eintreffen an der falschen Anforderung.
- **Empfehlung:** Kennung beim Anlegen auf Eindeutigkeit prüfen (Vorschlag der nächsten freien Nummer); offene Anforderungen berichtigen können.
- **Verifikation:** Vorhandene Kennung eintippen → Feldfehler, Knopf grau; offene Anforderung → „Bearbeiten …“ in der Leiste.

### F9 — P1 — Neustart des Dienstes schließt den Einsatz und verwirft offene Masken — gegen die eigene Zusage (beobachtet)

- **Fundstelle / Aufgabe:** Anforderung halb ausgefüllt in der Maske (Kennung, Einheit, Auftrag), dann Dienst der Web-Schale beendet und neu gestartet. Shots 49, 50, 51. Gegenprobe Netztrennung: 52, 53.
- **Beobachtung:** [beobachtet] Nach 300 ms ist die Maske weg, das Fenster steht auf der Einsatzauswahl mit „Der Einsatz wurde geschlossen.“ — darüber das Band: „Keine Verbindung zum Dienst … **offene Formulare behalten ihre Eingaben.**“ (49). Nach der Rückkehr bleibt das Fenster auf der Einsatzauswahl; nach erneutem Öffnen ist der Anforderungsentwurf **leer** (51). Gegenprobe reine Netztrennung (8 s offline): Maske bleibt, Knopf gesperrt mit Satz, nach der Rückkehr alles da (52, 53) — vorbildlich. [Code] Meldung aus `worker/aktendienst.ts:452`. [Annahme] Ein Dienst-Neustart passiert beim Neustart des Rechners, der die Web-Schale anbietet, oder bei einem Update.
- **Erwartung der Rolle:** Was das Band verspricht: Eingaben bleiben; nach der Rückkehr bin ich wieder im selben Einsatz und Blatt.
- **Auswirkung im Einsatz:** Halbe Anforderung, halbe Einheit oder Tagebucheintrag sind weg, der Helfer steht vor der Einsatzauswahl und muss erst wieder den richtigen Einsatz finden (siehe F7, zwei gleichnamige).
- **Empfehlung:** Das Schließen bei Dienstende wie einen Verbindungsabbruch behandeln (Einsatz merken, nach Rückkehr wieder öffnen); Entwürfe nicht beim Schließen verwerfen; das Band nur versprechen, was gilt.
- **Verifikation:** Maske halb füllen, Dienst neu starten → nach Rückkehr derselbe Einsatz, dasselbe Blatt, Maske mit Eingaben.

### F10 — P2 — Unverändertes Enter in der Stärkezelle schreibt ein Ereignis (beobachtet + Code)

- **Fundstelle / Aufgabe:** Doppelklick auf „Fü / UFü / He“ einer Einheit, Enter ohne Änderung; ebenso „0/1/8/10“ bei 0/1/8. Shots 13, 23.
- **Beobachtung:** [beobachtet] Statuszeile „✓ Stärke der Einheit ‚Sandsackkolonne‘ geändert · gespeichert“, Rückgängig bietet den Schritt an; Tagebuch: „BGr 2 Oldenburg: Stärke geändert: 0/1/8 → 0/1/8“. [Code] `renderer/useZellbearbeitung.ts:93-98` will genau das verhindern („Nichts geändert, nichts geschrieben“), vergleicht aber per `JSON.stringify` — beim Stärke-Tripel greift das offenbar nicht.
- **Erwartung der Rolle:** Nur Hinschauen schreibt nichts.
- **Auswirkung im Einsatz:** Tagebuch mit Scheinänderungen; Rückgängig nimmt danach „die letzte Änderung“ zurück, die keine war, und der Helfer drückt ein zweites Mal — an derselben Einheit, ohne zu sehen, welcher Wert jetzt zurückkommt (F13). [Annahme] Am Nachbarplatz entsteht ein Konfliktkandidat ohne Anlass.
- **Empfehlung:** Gleichheit des Tripels nach Wert prüfen.
- **Verifikation:** Doppelklick, Enter → keine Bestätigung, kein Tagebucheintrag, Rückgängig unverändert.

### F11 — P2 — Unplausible Stärken gehen durch; die vierte Zahl (Gesamt) wird still verworfen (beobachtet + Code)

- **Fundstelle / Aufgabe:** Stärkezelle „BGr 2 Oldenburg“ (Gruppe, 0/1/8): „0/1/80“; „Sandsackkolonne“ 0/2/20: „0/2/20/23“. Shots 14, 13.
- **Beobachtung:** [beobachtet] „0/1/80“ wird ohne Rückfrage geschrieben, Kopfband springt von 264 auf 336. „0/2/20/23“ (Gesamt passt nicht, richtig wäre 22) wird kommentarlos als 0/2/20 übernommen. [Code] `kontrakt/bedienschritte.ts:95-104` („die Gesamtzahl der Excel wird mitgelesen, aber nicht geglaubt“), Obergrenze 999 je Teilstärke, `:141` („ein Zahlendreher wie 80 statt 8 bleibt drin“).
- **Erwartung der Rolle:** Rückfrage bei Sprung um mehr als das Doppelte bzw. über die übliche Stärke der Gliederungsebene; bei widersprüchlicher Gesamtzahl „Fü+UFü+He = 22, nicht 23 — welche Zahl stimmt?“.
- **Auswirkung im Einsatz:** Gesamtstärke um 72 zu hoch, bis es jemand bemerkt; die Gegenprobe, die der Helfer mit der Gesamtzahl bewusst mitgibt, wird ignoriert statt genutzt.
- **Empfehlung:** Weiche Plausibilitätsrückfrage (nicht Sperre) bei starkem Sprung; eine mitgegebene Gesamtzahl prüfen.
- **Verifikation:** 0/1/8 → 0/1/80 → Rückfrage mit beiden Werten; „0/2/20/23“ → Feldfehler.

### F12 — P2 — Herkunft ist nach dem Anlegen nicht korrigierbar (beobachtet + Code)

- **Fundstelle / Aufgabe:** Lage, Doppelklick auf die Zelle „Herkunft“ einer Einheit.
- **Beobachtung:** [beobachtet] Es öffnet sich kein Feld (Bezeichnung, FüSt., Stärke dagegen schon). [Code] `domaene/projektion/tabelle.ts:143` (`art: "berechnet"`), Herkunft wird nur bei der Anlage aus der Hierarchie gesetzt (`kontrakt/einheitsanlage.ts`); keine Maske ändert sie.
- **Erwartung der Rolle:** Tippfehler „THW OV Jver“ korrigiere ich wie jede andere Zelle.
- **Auswirkung im Einsatz:** [Annahme] Herkunft trägt Ablösung, Kosten und Rückführung; der einzige Weg ist Entfernen mit Grund und Neuanlage — mit neuer Kennung, ohne Verlauf.
- **Empfehlung:** Herkunft editierbar machen oder eine Maske „Herkunft berichtigen“.
- **Verifikation:** Doppelklick auf Herkunft → Feld, Enter → neuer Wert, Tagebucheintrag.

### F13 — P2 — Rückgängig nennt den Vorgang, aber nicht Feld und Wert (beobachtet; Teilrest aus 29.10., dort F11)

- **Fundstelle / Aufgabe:** Statuszeile nach Zellen-Änderungen. Shots 15, 16, 45.
- **Beobachtung:** [beobachtet] Klartext statt Ereignisart — gut. Aber „Rückgängig: Einheit ‚Tr Log Schlauch‘ geändert“ sagt nicht, welches Feld; „Rückgängig: Stärke der Einheit ‚BGr 2 Oldenburg‘ geändert“ steht nach F10 zweimal hintereinander gleichlautend da, auch in der Frage-Maske. Welcher Wert zurückkommt, steht nirgends.
- **Erwartung der Rolle:** „Rückgängig: FüSt. von ‚Tr Log Schlauch‘ (A12 → leer)“.
- **Auswirkung im Einsatz:** Wer mehrere Schritte zurücknehmen muss, drückt blind und prüft danach in der Tabelle.
- **Empfehlung:** Feld und „neu → wird wieder“ in Knopf-Tooltip und Frage-Maske.
- **Verifikation:** Nach Stärkeänderung → Frage-Maske zeigt „0/1/80 → 0/1/8“.

### F14 — P2 — Funkprobe: zweimal Strg+P oder Doppelklick trägt mehrfach ein (beobachtet)

- **Fundstelle / Aufgabe:** Funkplan, Einheit „BGr 2 Oldenburg“ gewählt, zweimal Strg+P, dann Doppelklick auf „Funkprobe: Kontakt“. Shot 43.
- **Beobachtung:** [beobachtet] Vier Einträge „2100 BGr 2 Oldenburg Kontakt“ in derselben Minute, vier Tagebuchzeilen; Rückgängig nimmt je einen zurück.
- **Erwartung der Rolle:** Zweiter Druck innerhalb weniger Sekunden für dieselbe Einheit tut nichts (oder fragt).
- **Auswirkung im Einsatz:** Funkprotokoll und Tagebuch mit Dubletten; beim Ausdruck sieht es aus, als habe man viermal gerufen.
- **Empfehlung:** Gleiche Funkprobe derselben Einheit kurz hintereinander zusammenfassen oder sperren.
- **Verifikation:** Doppelklick → genau ein Eintrag.

### F15 — P2 — Fleetmapping-Vorschlag setzt eine schon gewählte Betriebsart still zurück (beobachtet + Code)

- **Fundstelle / Aufgabe:** Funkplan → „Rufgruppe anlegen“ → Betriebsart „DMO (direkt)“ gewählt → im Namen „THW“ tippen → ersten Vorschlag „THW_01“ anklicken. Shot 42.
- **Beobachtung:** [beobachtet] Betriebsart steht danach auf **TMO**, ohne Hinweis; das Feld liegt oberhalb des Namens, außerhalb des Blicks. Der gewählte Vorschlag trägt in der Liste „nur LV HH MV SH“ — nach der Wahl erinnert nichts daran, dass er im Einsatzgebiet [Annahme: Niedersachsen] nicht gilt. [Code] `renderer/RufgruppeMaske.tsx:141`.
- **Erwartung der Rolle:** Ein Vorschlag füllt den Namen; was ich schon gewählt habe, bleibt — oder die Maske sagt „Betriebsart auf TMO gesetzt“.
- **Auswirkung im Einsatz:** Rufgruppe falsch als TMO geführt; DMO-Zähler und Gateway-Übersicht im Funkplan stimmen nicht.
- **Empfehlung:** Betriebsart nur setzen, wenn noch unberührt, sonst sichtbar melden; Länderhinweis nach der Wahl stehen lassen.
- **Verifikation:** DMO wählen, Vorschlag übernehmen → DMO bleibt oder Hinweis sichtbar.

### F16 — P3 — Neuladen mit halb getippter Zelle: kein Warnhinweis, Eingabe verworfen (beobachtet)

- **Fundstelle / Aufgabe:** Zelle „FüSt.“ geöffnet, „B7 halb“ getippt, Seite neu geladen.
- **Beobachtung:** [beobachtet] Kein „Seite verlassen?“ (anders als beim Anforderungsentwurf), Wert nicht geschrieben, Eingabe weg. Wechsel des Reiters mit offener Zelle schreibt dagegen die halbe Eingabe (mit Bestätigung in der Statuszeile) — zwei verschiedene Regeln für dasselbe „Weggehen“.
- **Erwartung der Rolle:** Einheitlich: entweder schreibt Weggehen immer (wie Wegklicken), oder es fragt.
- **Auswirkung im Einsatz:** Gering, aber verwirrend: Einmal ist die Eingabe drin, einmal nicht.
- **Empfehlung:** Bei offener, geänderter Zelle die Verlassen-Warnung wie beim Anforderungsentwurf.
- **Verifikation:** Zelle tippen, F5 → Browser fragt.

### F17 — P3 — Gleichnamiger Einsatz: Meldung ohne Ausweg (beobachtet)

- **Fundstelle / Aufgabe:** „Neuer Einsatz …“ mit vorhandenem Namen und Datum. Shot 06.
- **Beobachtung:** [beobachtet] „Ein Einsatz mit diesem Namen existiert bereits.“ steht in der Maske und als rotes Band oben (das Band bleibt bis „Verstanden“). Nicht gesagt: am selben Tag, und dass man ihn einfach öffnen kann.
- **Erwartung der Rolle:** „Gibt es schon (08.09.2026). [Öffnen] oder anderen Namen wählen.“
- **Auswirkung im Einsatz:** Zweiter Rechner versucht anzulegen statt zu öffnen; der naheliegende Ausweg ist ein anderes Datum — siehe F7.
- **Empfehlung:** Meldung mit Datum und Knopf „Öffnen“.
- **Verifikation:** Doppelten Namen eingeben → „Öffnen“ in der Meldung führt in den vorhandenen Einsatz.

---

## Positiv (beibehalten)

- Stärkezelle: Formatfehler an der Zelle benannt, Eingabe bleibt stehen, Esc verwirft.
- Rückgängig überlebt Neuladen, nennt den Schritt in Bediensprache, fragt nach und bestätigt die Rücknahme.
- Aufteilen sperrt Überzug mit konkreter Zahlenangabe; Entfernen beginnt mit leerem Grund.
- Doppelklick auf „Einheit anlegen“ und „Anfordern“ legt genau einmal an.
- Anforderungsentwurf übersteht Schließen und Neuladen, Browser warnt vor Verlassen.
- Netzverlust: Maske bleibt, Knopf gesperrt mit Satz, nach Rückkehr alles da.
- Strg+Z im Suchfeld bleibt Text-Rückgängig und löst keine Fachrücknahme aus.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen (Stärke, Status, Abschnitt, Anlage: ja; Zusammenführung nach Fehlbedienung: nein).
- **Fremde Hilfe nötig:** ja — für eine fehlbediente Zusammenführung (F1); sonst nein, aber mit Storno/Entfernen-Umwegen.
- **Größtes Missverständnis:** „‚gespeichert‘ heißt, es ist so passiert“ — bei der Zusammenführung ohne Ziel und bei der zweiten, richtigen Zusammenführung stimmt das nicht.
- **Größtes Einsatzrisiko:** Ein Doppel-Enter beim Zusammenlegen schreibt ein nicht zurücknehmbares Ereignis, das Tagebuch und Lage dauerhaft auseinanderlaufen lässt und die gewollte Zusammenlegung verhindert.
- **Top-Priorität für die nächste Iteration:** Zusammenführen erst mit gewählter Zieleinheit freigeben und Ziele, die keine Einheit sind, an der Schreibseite abweisen (F1); im selben Schnitt Rückgängig nur anbieten, was es auch zurücknehmen kann.
