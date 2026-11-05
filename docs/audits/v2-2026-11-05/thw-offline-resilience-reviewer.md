# Audit: Offline-Resilienz (THW-Nutzersicht) — S1-Control v2

- **Datum:** 05.11.2026
- **Stand:** Branch-Stand HEAD `5cc8af7` (nach dem UX-Umbau: Verbindungsbanner, Zustandsmarke, Statuszeile, Auswahlleiste, Eingangskorb)
- **Rolle:** Helfer/Sachbearbeiter in der Führungsstelle, der nicht davon ausgeht, dass Netz, Dienst oder Share zuverlässig da sind, und jederzeit wissen muss, ob eine Eingabe wirklich angekommen ist.
- **Material:**
  - Laufende Web-Schale mit eigener Kopie der Prüflage „Übung Weser-Ems" (40 Einheiten), `http://127.0.0.1:8209`, gesteuert mit Playwright/Chromium (1600×1000).
  - Zwei Browserkontexte als zwei Arbeitsplätze (A, B); ein dritter Kontext über den Namen `fuest.lan` (reines http, kein sicherer Kontext) für den LAN-Fall.
  - Störungen: Browser offline (`setOffline`), Antwort eines Schreibrufs unterwegs verworfen (Route abgefangen, Dienst hatte schon geschrieben), Dienst angehalten (`SIGSTOP`/`SIGCONT`), Dienst geordnet beendet (`SIGTERM`) und abgestürzt (`SIGKILL`) mit Neustart auf derselben Kopie, Share-Verzeichnis umbenannt, Ereignis- und Präsenzordner schreibgeschützt (`chattr +i`).
  - Dokumente: `README-v2.md`, `docs/v2/BETRIEB.md`, `docs/v2/HANDBUCH.md` (Störfälle), `docs/v2/adr/ADR-007-…`, `AGENTS.md`; Vergleich mit `docs/audits/thw-offline-resilience-reviewer.md` (v1-Audit).
  - Quelltext nur lesend als Beleg.
  - Bildschirmfotos: `/tmp/claude-0/-home-user-S1-Control/5e4b7d40-2c4b-58c0-a32e-96410bb256d6/scratchpad/shots/offline/` (im Text als `shots/…` abgekürzt).
- **Kennzeichnung:** **[beobachtet]** = am laufenden System erlebt · **[Code]** = aus dem Quelltext belegt (Datei:Zeile) · **[Annahme]** = plausible Folgerung, nicht geprüft · **[nicht prüfbar]** = in dieser Umgebung nicht nachzustellen.
- **Nicht geprüft:** Desktop-Schale (Electron), echtes SMB/NAS mit Timeouts, Mobilgeräte, https hinter Proxy.

---

## Urteil aus der Rolle

**Was funktioniert.** Der Ausfall *Browser ↔ Dienst* ist inzwischen gut gelöst. Schalte ich das Netz ab, steht nach 1–2 s oben ein fester Hinweis „⚠ Keine Verbindung zum Dienst seit 2 s. Die Anzeige ist veraltet, Eingaben werden nicht gespeichert und sind gesperrt …", die Zustandsmarke wechselt auf „⚠ Verbindung unterbrochen", die Statuszeile sagt „Stand … (veraltet) · Share-Stand unbekannt · Arbeitsplätze unbekannt", ab 1 min in Rot mit „✖" [beobachtet, `shots/11…14`]. „Übernehmen" ist gesperrt und nennt den Grund, die gewählte Eingabe bleibt stehen [beobachtet, `shots/13`]. Nach der Rückkehr steht „✓ Wieder verbunden – Daten wurden neu geladen", die Tabelle ist frisch [beobachtet, `shots/15`]. Geht die Antwort eines Speicherns verloren, steht im Dialog „Unklar, ob gespeichert – bitte Liste prüfen …"; ein zweites „Eintrag speichern" legt **nicht** doppelt an [beobachtet, `shots/22–24`]. Ohne Dienst zeigt ein Neuladen (auf `localhost`) eine klare Seite mit Papier-Vordruck [beobachtet, `shots/41`]. Eingaben, die der Dienst wegen gesperrtem Share nur lokal hielt, überleben sogar einen Absturz des Dienstes und kommen danach auf dem Share an [beobachtet].

**Wo es reibt.** Sobald der Ausfall nicht zwischen Browser und Dienst, sondern **hinter** dem Dienst liegt oder der Dienst neu startet, verliert die Anzeige ihre Ehrlichkeit: Nach einem Absturz mit Neustart zeigt mein Fenster eine eingefrorene Lage mit „✓ aktuell", Änderungen anderer Arbeitsplätze kommen nicht mehr an, und jede Eingabe scheitert mit „Unbekannte Akte: akte-1". Nach einem geordneten Neustart (Update) oder wenn der Einsatzordner verschwindet, wird mir der Einsatz unter den Händen geschlossen – samt offenem Formular. Bei schreibgeschütztem Share bleibt die Marke grün „✓ aktuell", während meine Eingaben nur lokal liegen. Und im dokumentierten Betrieb über reines http im LAN speichern alle „Anlegen"-Masken (Tagebuch, Einheit, Abschnitt …) **gar nichts und melden auch nichts**.

**Ohne fremde Hilfe?** Den Funkloch-Fall ja. Die Fälle „Dienst neu gestartet", „Einsatzordner weg" und „Share schreibgeschützt" kann ich nicht sicher erkennen; aus dem eingefrorenen oder geschlossenen Zustand komme ich nur mit F5 bzw. „⋯ → Einsatz schließen → Öffnen" heraus – darauf käme ich ohne Hinweis nicht.

---

## Findings

### P0-1 · Nach Neustart des Dienstes eingefrorene Lage mit „✓ aktuell" – Änderungen anderer kommen nicht an, jede Eingabe scheitert

1. **Priorität:** P0
2. **Fundstelle / Aufgabe:** Lage und Tagebuch im Browser, während der Dienst abstürzt und neu startet (Container-Neustart, Stromausfall des Dienstrechners, OOM). Wiederverbindung `apps/desktop/src/renderer/verbindungsabgleich.ts:19-31`; Antwort des Dienstes `FEHLER standAnfordern: Unbekannte Akte: akte-1` im Protokoll.
3. **Beobachtung:**
   - [beobachtet] Dienst mit `SIGKILL` beendet, 4 s später neu gestartet. Arbeitsplatz A zeigt danach weiter die alte Lage, Zustandsmarke „✓ aktuell", Statuszeile „Share erreichbar (vor 12 s)", nach 33 s „(vor 37 s)" – sonst kein Hinweis, kein Banner (`shots/45`).
   - [beobachtet] Arbeitsplatz B (F5 gedrückt) setzt „LG Rastede" auf „Einsatzbereit". A zeigt 15 s später unverändert „Einsatz" bei „✓ aktuell" (`shots/48`). Erst nach F5 sieht A den neuen Status.
   - [beobachtet] Speichert A in diesem Zustand einen Tagebucheintrag oder einen Status, steht „Nicht gespeichert – Unbekannte Akte: akte-1" (`shots/46`, `shots/47`). Die Eingabe bleibt im Formular stehen (kein Verlust), aber der Text erklärt nichts.
   - [Code] Der Abgleich nach Wiederverbindung schluckt jeden Fehler: „ein Fehlschlag ist hier kein Fehlerbild" (`verbindungsabgleich.ts:19-31`). Der Neustart des Dienstes wird so nicht als „Einsatz neu öffnen" behandelt.
4. **Erwartung der Rolle:** Nach jeder Störung entweder wieder echt aktuell – oder deutlich „veraltet". Nie „✓ aktuell" auf einem Stand, der nicht mehr nachgeführt wird.
5. **Auswirkung im Einsatz:** Ich führe nach einem Stand, den die anderen längst geändert haben (Status, Zuordnung, neue Einheiten), und halte ihn wegen des grünen Hakens für gesichert. Das ist genau die gefährliche Fehlinterpretation „falscher Status als aktuell". Ein Dienst-Neustart ist im Betrieb kein Sonderfall (Update, Container-Neustart, Stromausfall).
6. **Empfehlung:** Erkennt das Fenster nach einer Wiederverbindung, dass der Dienst den Einsatz nicht mehr kennt, muss es ihn selbst wieder öffnen oder sofort und dauerhaft „✖ Einsatz nicht mehr verbunden – bitte neu laden" zeigen, mit einem Knopf dafür. Die Zustandsmarke darf „✓ aktuell" nur zeigen, solange Stand-Mitteilungen tatsächlich eintreffen. Die Fehlermeldung „Unbekannte Akte" in Klartext übersetzen.
7. **Verifikation:** Fenster offen, Dienst hart beenden und neu starten, auf einem zweiten Arbeitsplatz einen Status ändern: Das erste Fenster zeigt binnen 10 s entweder den neuen Status oder eine rote, unübersehbare Veraltet-Meldung; keine Eingabe endet mit „Unbekannte Akte".

### P0-2 · Im LAN über reines http speichern alle Anlegemasken nichts – und sagen es nicht

1. **Priorität:** P0
2. **Fundstelle / Aufgabe:** Einsatztagebuch → „Eintrag hinzufügen" → „Eintrag speichern"; betrifft jede Maske, die eine neue Kennung vergibt. `apps/desktop/src/renderer/kennungen.ts:29-30` (`globalThis.crypto.randomUUID()`), Aufrufer u. a. `TagebuchEintrag.tsx:46`, `AbschnittAnlegen.tsx:32`, `EinheitAnlegen.tsx:152`, `Einheitenmasken.tsx:202`, `RufgruppeMaske.tsx:100`, `UnterkunftMaske.tsx:68`, `Verpflegungsmasken.tsx:128/191`, `UntertabellenErfassung.tsx:112/151/196`, `AnforderungZuEinheit.tsx:154-155`.
3. **Beobachtung:**
   - [beobachtet] Aufruf über `http://fuest.lan:8209` (kein sicherer Kontext, so wie `README-v2.md` den Betrieb `http://<rechner>:8080` beschreibt): `isSecureContext = false`, `crypto.randomUUID` fehlt. Tagebucheintrag mit Text und Zeit „2120" → Klick auf „Eintrag speichern" → **nichts passiert**: Dialog bleibt offen, keine Meldung, kein Eintrag, nur ein Konsolenfehler „globalThis.crypto.randomUUID is not a function" (`shots/70`).
   - [Code] Die Anfrage-ID der Brücke kennt den Fall ausdrücklich und weicht aus (`webAnfrage.ts:45`, „randomUUID gibt es nur unter https"), die Kennungen der Masken nicht.
   - [Annahme] Statuswechsel und Feldänderungen ohne neue Kennung funktionieren dort weiter; betroffen ist „nur" alles, was neu angelegt wird – also Tagebuch, Einheiten, Abschnitte, Aufträge, Fahrzeuge, Personen, Rufgruppen, Anforderungen.
4. **Erwartung der Rolle:** Entweder es wird gespeichert, oder ich bekomme eine klare Meldung „Nicht gespeichert – …".
5. **Auswirkung im Einsatz:** Ich tippe eine Meldung ein, drücke Speichern, der Knopf reagiert nicht. Unter Druck halte ich das für einen Hänger, drücke Abbrechen oder wechsle die Ansicht – die Meldung ist weg und nirgends dokumentiert. Im genau dafür gedachten Betrieb (Rechner der Führungsstelle ohne Installation, Web-Schale im LAN) ist das Einsatztagebuch damit nicht führbar.
6. **Empfehlung:** Kennungen auch ohne sicheren Kontext erzeugen (wie bei der Anfrage-ID) und jeden unerwarteten Fehler beim Speichern im Dialog als „Nicht gespeichert – technischer Fehler, Eingabe bleibt stehen" zeigen. Bis dahin in `BETRIEB.md`/`README-v2.md` https verpflichtend machen.
7. **Verifikation:** Web-Schale über eine LAN-Adresse per http öffnen, je eine Einheit, einen Abschnitt und einen Tagebucheintrag anlegen: alle drei erscheinen in der Liste; ein erzwungener Fehler beim Speichern erzeugt eine sichtbare Meldung im Dialog.

### P1-1 · Einsatz wird unter den Händen geschlossen – bei Update/Neustart des Dienstes und wenn der Einsatzordner kurz fehlt; offene Formulare gehen verloren

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Laufende Lage mit offenem Tagebuch-Dialog. Geordnetes Beenden `apps/desktop/src/web/web.ts:208-222` → `arbeitsplaetze.ts:144-146`; Ordner fort `worker/aktendienst.ts:519-523`, Einstufung `packages/speicher/src/fehler.ts:55` und `einsatzordner.ts:46` (jedes `ENOENT` = „Ordner fort").
3. **Beobachtung:**
   - [beobachtet] Dienst mit `SIGTERM` beendet (so beendet `docker compose restart`/Update den Container): Das Fenster springt binnen 2 s aus der Lage auf die Einsatzauswahl, unten „Hinweise · Der Einsatz wurde geschlossen." Der gerade getippte Tagebuchtext („Lagemeldung EA Deich Nord: Deich bei km 12 durchfeuchtet …") ist **weg** (`shots/40`, `shots/43-SIGTERM…`, `shots/44-SIGTERM…`). Das Banner darüber sagt gleichzeitig „offene Formulare behalten ihre Eingaben". Nach dem Neustart bleibt das Fenster auf der Auswahl stehen; ich muss selbst „Öffnen" drücken.
   - [beobachtet] Zum Vergleich `SIGKILL`: Formular und Text bleiben erhalten (`shots/43-SIGKILL…`), dann aber P0-1.
   - [beobachtet] Share-Verzeichnis umbenannt (nachgestellt: SMB-Mount fällt ab, darunter liegt ein leerer Ordner): Beide Arbeitsplätze verlieren den Einsatz („Kein Einsatz geöffnet"); die Zustandsmarke zeigt nie „Share nicht erreichbar". Der Dienst legt dabei im leeren Pfad einen neuen Ordner `einsaetze/<einsatz>/praesenz/…` an (Geisterordner).
   - [beobachtet] Nach F5 entsteht ein Zwischenzustand: Lage und Tabelle sind sichtbar, Kopf „Ist-Stärke —", Statuszeile „Kein Einsatz geöffnet", jeder Statuswechsel endet mit „Nicht gespeichert – Die Akte ist geschlossen." (`shots/59-zwischenzustand`, `shots/60`). Heraus kommt man nur über „⋯ → Einsatz schließen" und erneut „Öffnen" (`shots/61`) – darauf weist nichts hin.
   - [Annahme] Ob ein abgerissener Windows-UNC-Pfad ebenfalls `ENOENT` liefert, ist hier [nicht prüfbar]; beim Container mit Bind-Mount eines Host-SMB-Mounts ist der leere Mountpunkt der naheliegende Fall.
4. **Erwartung der Rolle:** Laut Handbuch ist der Share-Ausfall „der Normalpfad": weiterarbeiten. Ein Neustart des Dienstes darf mir weder die Lage noch die halbe Meldung nehmen.
5. **Auswirkung im Einsatz:** Getippte Meldungen gehen bei jedem Update/Neustart verloren; bei einem kurz abgerissenen Mount steht die ganze Führungsstelle ohne Lage da und findet ohne Admin nicht zurück. Der Geisterordner kann später einen zweiten, falschen Einsatzordner vortäuschen [Annahme].
6. **Empfehlung:** Geordnetes Beenden darf im Browser nur „Dienst wird neu gestartet" bedeuten (Lage stehen lassen, Formulare behalten, danach selbst wieder öffnen). „Ordner fort" nur nach wiederholter, eindeutiger Prüfung annehmen und dem Bediener als „Einsatzordner nicht gefunden – Share prüfen" anzeigen, statt still zu schließen; dabei keine Ordner neu anlegen. Den Zwischenzustand „Tabelle sichtbar, Akte geschlossen" darf es nicht geben.
7. **Verifikation:** Mit offenem, gefülltem Formular den Container neu starten → Text steht danach noch, Einsatz ist von selbst wieder offen. Share-Mount für 60 s entfernen → Anzeige „Share nicht erreichbar/Ordner nicht gefunden", danach automatisch zurück, kein neuer Ordner im leeren Pfad.

### P1-2 · Tagebucheintrag ohne Uhrzeit wird immer abgewiesen (Folge des Wiederholschutzes)

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Einsatztagebuch → „Eintrag hinzufügen", Feld „Zeit der Meldung" leer gelassen (Platzhalter „leer = jetzt"). `apps/desktop/src/renderer/TagebuchEintrag.tsx:46-47` mit `Anlegeversuch.tsx:74`.
3. **Beobachtung:**
   - [beobachtet] Ohne Zeit: „Nicht gespeichert – Die Nutzlast für EtbEintragErfasst ist nicht gültig: zeitpunkt — Invalid ISO datetime" (`shots/25-etb-normal-leer`). Gesendet wurde `"zeitpunkt":"ETB-d534fd68edcc"` – die Kennung des Eintrags statt der Uhrzeit. Mit Zeit „2050" klappt es (`shots/25-etb-normal-2050`).
   - [Code] `versuch.kennung()` hält **einen** Wert je Dialog (`Anlegeversuch.tsx:74`, `gehalten.current ??= erzeuge()`); der zweite Aufruf für den Zeitstempel liefert deshalb die zuvor erzeugte ETB-Kennung zurück.
4. **Erwartung der Rolle:** „Leer = jetzt" heißt: Text eintippen, speichern, fertig.
5. **Auswirkung im Einsatz:** Der häufigste Weg ins Tagebuch scheitert mit einer Entwicklermeldung. Wer sie nicht versteht, bricht ab – die Meldung fehlt im Tagebuch. Mit dem Umweg „Uhrzeit von Hand eintragen" geht es.
6. **Empfehlung:** Leere Zeit wieder als „jetzt" speichern (eigener gehaltener Zeitstempel); Prüfmeldungen der Nutzlast in Klartext übersetzen („Uhrzeit nicht lesbar").
7. **Verifikation:** Tagebucheintrag ohne Zeit speichern → erscheint mit aktueller Uhrzeit; Wiederholung nach verlorener Antwort legt weiterhin nur einen Eintrag an.

### P1-3 · „✓ aktuell" und „✓ … gespeichert", obwohl die Eingaben nur lokal liegen

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Statuswechsel auf A und B, während der Share keine Schreibrechte mehr gibt (Ereignis- und Präsenzordner schreibgeschützt). `apps/desktop/src/renderer/Zustandsmarke.tsx:81-96` (Marke kennt nur `shareErreichbar`), `worker/aktendienst.ts:528-529`.
3. **Beobachtung:**
   - [beobachtet] 35 s lang und darüber hinaus: Marke „✓ aktuell", Statuszeile „Share erreichbar (gerade eben)", daneben „⚠ 878 B noch nicht übertragen" (`shots/55`). A meldet „✓ Status der Einheit ‚Tr Log WT' geändert · gespeichert".
   - [beobachtet] B sieht in dieser Zeit A's Änderung an „BGr 2 Oldenburg" nicht; beide sehen „1 weiterer Arbeitsplatz".
   - [beobachtet] Die aufgeklappte Erklärung ist gut formuliert („liegen nur auf diesem Gerät … gehen nicht verloren"), endet in der Web-Schale aber mit „das Fenster nicht schließen" – tatsächlich liegt der Zwischenspeicher beim Dienst und überlebte sogar dessen Absturz (`statushinweise.ts:47-52`).
   - [nicht prüfbar] Der echte Fall „Share nicht erreichbar" (Timeout/EIO eines NAS) ließ sich ohne SMB nicht nachstellen; die Marke hätte dafür einen eigenen Zustand (`Zustandsmarke.tsx:69-79`).
4. **Erwartung der Rolle:** Ein Haken oben heißt „die anderen sehen, was ich sehe". Liegen meine Eingaben nur hier, will ich das an derselben Stelle lesen, nicht als Bytezahl unten rechts.
5. **Auswirkung im Einsatz:** Ich verlasse mich darauf, dass die Vermeldezentrale meinen Statuswechsel sieht, und gebe ihn nicht per Funk weiter. Bei „B" statt „Einträgen" kann ich den Rückstand nicht einschätzen.
6. **Empfehlung:** Zustandsmarke auf „⚠ nicht übertragen" schalten, sobald eigene Eingaben auf dem Share fehlen; Bestätigung als „gespeichert, noch nicht übertragen" formulieren; Rückstand als Anzahl Eingaben und „seit HH:MM" angeben; Erklärtext je Schale (Browser: Fenster darf zu).
7. **Verifikation:** Share-Schreibrecht entziehen, einen Status ändern → Marke zeigt binnen 10 s einen Warnzustand, Bestätigung sagt „noch nicht übertragen", Rückstand „1 Eingabe seit …"; nach Rückgabe der Rechte wieder „✓ aktuell".

### P1-4 · Konflikt: verdrängter Wert nirgends zu sehen, Urheber im Tagebuch nicht unterscheidbar

1. **Priorität:** P1
2. **Fundstelle / Aufgabe:** Gleiches Feld („FGr Wasserschaden", Status) auf A („Ruhe") und B („Nicht einsatzbereit") geändert, während der Share schreibgeschützt war; danach Rückgabe der Rechte. `Einheitenzelle.tsx:155`; Diagnose; Tagebuch.
3. **Beobachtung:**
   - [beobachtet] Nach dem Abgleich zeigen beide „Nicht einsatzbereit ⚠", der Zähler springt von 8 auf 9 Konflikthinweise. A's „Ruhe" ist ohne Meldung ersetzt (`shots/57`, `shots/62`).
   - [beobachtet] Das „⚠" in der Zelle hat weder Tooltip noch Klickziel. Die Erklärung der Statuszeile und die Diagnose sagen „Den Hinweis lesen: Er nennt Feld, Gewinner und verdrängten Wert" – einen solchen Hinweis mit Wert habe ich nirgends gefunden; die Diagnose zeigt nur „Konflikthinweise: 9" (`shots/63`, `shots/64`). [Code] Im Renderer gibt es außer dem Zeichen keine Anzeige des verdrängten Werts (`Einheitenzelle.tsx:155`).
   - [beobachtet] Im Tagebuch stehen beide Einträge („Einsatz → Ruhe", „Einsatz → Nicht einsatzbereit"), aber Akteur „Arbeitsplatz" und Rechner „vm" sind für alle Browser gleich – wer was gesetzt hat, ist nicht erkennbar.
4. **Erwartung der Rolle:** Wenn meine Eingabe überschrieben wird, will ich das an der Stelle sehen und wissen, welcher Wert von wem verdrängt wurde.
5. **Auswirkung im Einsatz:** Ein Status springt nach einer Störung still um; die fachliche Klärung („wer hat recht?") ist ohne Namen und ohne verdrängten Wert nicht möglich.
6. **Empfehlung:** „⚠" mit Tooltip/Klick „Ihr Wert ‚Ruhe' (A, 21:04:23) wurde durch ‚Nicht einsatzbereit' (B, 21:04:27) ersetzt"; Liste der Hinweise in der Diagnose. In der Web-Schale den Anzeigenamen beim ersten Öffnen verlangen und den Browser statt des Dienstrechners als „Rechner" nennen.
7. **Verifikation:** Konfliktfall nachstellen → am betroffenen Feld und in der Diagnose sind beide Werte, Zeitpunkte und Arbeitsplätze lesbar.

### P2-1 · Hängender Dienst: Sekunden „✓ aktuell", dann widersprüchliche Aussage zu einer laufenden Eingabe

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Statuswechsel „Sandsackkolonne" → „Ruhe", Dienst hängt (`SIGSTOP`) 15 s. `renderer/webBruecke.ts:126` (Schreibruf ohne Zeitlimit), `verbindungsueberwachung.ts:16-18`.
3. **Beobachtung:**
   - [beobachtet] 3 s nach dem Hängen: „✓ aktuell", „Share erreichbar (vor 3 s)"; „Übernehmen" ist frei, nach dem Klick steht nur „…" (`shots/30`).
   - [beobachtet] Nach ca. 10 s: Banner „Eingaben werden nicht gespeichert und sind gesperrt", unter der offenen Zelle „Übernehmen ist gesperrt. Ihre Eingaben bleiben stehen" (`shots/31`). Nach `SIGCONT` wird genau diese Eingabe doch gespeichert („✓ … gespeichert", `shots/32`).
4. **Erwartung der Rolle:** Eine abgeschickte Eingabe hat einen eigenen Zustand: „wird gesendet …", nach Ablauf „unklar, ob gespeichert".
5. **Auswirkung im Einsatz:** Ich glaube „nicht gespeichert", schreibe es auf Papier oder sage es per Funk, und Minuten später landet der Wert doch – womöglich nach einer inzwischen anderen Lage.
6. **Empfehlung:** Laufende Schreibrufe sichtbar als „wird gesendet" führen, nach einer festen Frist als „Unklar, ob gespeichert" melden; Banner nicht „werden nicht gespeichert" sagen, solange eine Eingabe unterwegs ist.
7. **Verifikation:** Dienst während eines Speicherns 30 s anhalten → Anzeige wechselt von „wird gesendet" zu „unklar"; nach Rückkehr klare Bestätigung, ohne vorherige Gegenaussage.

### P2-2 · Offline-Seite und Papier-Vordruck fehlen im reinen http-Betrieb

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Neuladen ohne Verbindung. ADR-007, Abschnitt Konsequenzen; `BETRIEB.md:245-266`.
3. **Beobachtung:** [beobachtet] Auf `127.0.0.1` zeigt ein Neuladen ohne Dienst „⚠ Dienst nicht erreichbar … Arbeiten Sie jetzt auf Papier weiter" mit „Papier-Vordruck drucken" und lädt nach dem Neustart selbst nach (`shots/41`, `shots/42`). Über `http://fuest.lan` gibt es keinen Service Worker; das Neuladen endet in der leeren Browserfehlerseite (`shots/71`). Dokumentiert ist das, sichtbar für den Bediener nicht.
4. **Erwartung der Rolle:** Wenn nichts mehr geht, zumindest die Seite „was jetzt tun" und den Vordruck.
5. **Auswirkung im Einsatz:** Wer in Panik F5 drückt, verliert die zuletzt sichtbare Lage und bekommt eine Browserfehlermeldung ohne Handlungsanweisung.
6. **Empfehlung:** https im LAN als Regelbetrieb, oder bei http den Bediener beim Start einmal warnen („Bei Ausfall nicht neu laden; Vordrucke jetzt drucken").
7. **Verifikation:** Über die LAN-Adresse geöffnet, Dienst stoppen, F5 → Seite mit Handlungsanweisung oder vorher sichtbarer Warnhinweis.

### P2-3 · „Zeit der Meldung = jetzt" heißt nach einer Sperre: Zeit des späteren Speicherns

1. **Priorität:** P2
2. **Fundstelle / Aufgabe:** Tagebuch während einer Unterbrechung ausfüllen, nach der Wiederverbindung speichern. `TagebuchEintrag.tsx:46-48`.
3. **Beobachtung:** [Code] Der Zeitstempel für „leer" entsteht erst beim ersten Speicherversuch; während der Sperre ist der Knopf aus, also erst nach der Wiederverbindung. [Annahme] Eine um 20:50 eingegangene Meldung steht dann z. B. mit 21:05 im Tagebuch. (Derzeit überdeckt von P1-2.)
4. **Erwartung der Rolle:** Die Zeit der Meldung ist die Zeit, zu der ich sie aufgenommen habe.
5. **Auswirkung im Einsatz:** Falsche Reihenfolge und Zeiten in der Einsatzdokumentation nach jeder Störung.
6. **Empfehlung:** Bei gesperrtem Speichern auf das Feld „Zeit der Meldung" hinweisen oder die Zeit beim ersten Tippen vorschlagen.
7. **Verifikation:** Offline Text tippen, 5 min warten, online speichern → Tagebuch zeigt die Aufnahmezeit oder hat sie vorher abgefragt.

### P3-1 · „Unklar, ob gespeichert" auch, wenn sicher nichts ankam

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Speichern in den ersten Sekunden nach einem Dienstausfall. `renderer/webBruecke.ts:122-137`.
3. **Beobachtung:** [Code] Jeder Netzfehler eines Schreibrufs (auch „Verbindung abgelehnt") ergibt „Unklar, ob gespeichert – bitte Liste prüfen". Ehrlich, aber unnötig verunsichernd; die Liste ist in dem Moment selbst nicht abrufbar.
4. **Erwartung der Rolle:** Wo sicher ist, dass nichts ankam, „Nicht gespeichert".
5. **Auswirkung im Einsatz:** Zusätzliches Nachprüfen in einer Lage, in der ohnehin nichts geht.
6. **Empfehlung:** Den Text um „Liste nach der Wiederverbindung prüfen" ergänzen.
7. **Verifikation:** Dienst stoppen, sofort speichern → Text nennt, wann geprüft werden kann.

### P3-2 · Veraltete Tabelle sieht aus wie eine aktuelle; „Rückgängig" bleibt bedienbar

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Lage während der Unterbrechung. `Ruecknahme.tsx:64-75` (Sperre ohne Verbindungszustand).
3. **Beobachtung:** [beobachtet] Bei Unterbrechung bleibt die Tabelle farbig und unverändert; nur Banner, Marke und Statuszeile sagen „veraltet" (`shots/12`). [Code] Der Knopf „↶ Rückgängig: …" bleibt aktiv; erst die Brücke weist ab.
4. **Erwartung der Rolle:** Veraltete Werte auch in der Tabelle als solche erkennen; gesperrte Aktionen grau.
5. **Auswirkung im Einsatz:** Wer nach unten gescrollt hat oder nur auf die Tabelle schaut, liest alte Werte als aktuell.
6. **Empfehlung:** Tabelle bei Unterbrechung sichtbar dämpfen oder markieren; „Rückgängig" mit demselben Sperrgrund ausgrauen.
7. **Verifikation:** Offline schalten → Tabelle erkennbar als veraltet, Rückgängig grau mit Grund.

### P3-3 · „✓ aktuell" neben „Stand vor 6 min"

1. **Priorität:** P3
2. **Fundstelle / Aufgabe:** Statuszeile und Tooltip der Marke im Normalbetrieb.
3. **Beobachtung:** [beobachtet] „✓ aktuell · Stand vor 6 min" (`shots/02`): „Stand" ist der Zeitpunkt des letzten Ereignisses, nicht der letzten Prüfung.
4. **Erwartung der Rolle:** „Stand" = wann zuletzt abgeglichen.
5. **Auswirkung im Einsatz:** Gelegentliches Misstrauen in eine korrekte Anzeige, Nachfragen per Funk.
6. **Empfehlung:** „Letzte Änderung vor 6 min · geprüft gerade eben".
7. **Verifikation:** Ruhige Lage, 10 min warten → Anzeige unterscheidet beides.

---

## Abschluss

- **Aufgabe geschafft:** mit Umwegen – Funkloch und verlorene Antwort sicher; Dienst-Neustart, verschwundener Einsatzordner und schreibgeschützter Share nur mit F5 bzw. „Einsatz schließen/Öffnen" und ohne verlässliche Anzeige; im http-LAN-Betrieb ließ sich kein Tagebucheintrag anlegen.
- **Fremde Hilfe nötig:** ja – für das Herauskommen aus dem eingefrorenen bzw. geschlossenen Zustand und für das Erkennen, dass die http-Masken nichts speichern.
- **Größtes Missverständnis:** Der grüne Haken „✓ aktuell" bedeutet nur „Browser erreicht den Dienst", nicht „meine Lage ist nachgeführt und meine Eingaben sind bei den anderen".
- **Größtes Einsatzrisiko:** Nach einem Neustart des Dienstes wird auf einer eingefrorenen Lage mit „✓ aktuell" weitergeführt, während andere Arbeitsplätze längst andere Status gesetzt haben (P0-1).
- **Top-Priorität für die nächste Iteration:** Nach jeder Wiederverbindung prüfen, ob der Dienst den Einsatz noch führt, und ihn selbst wieder öffnen – sonst rot „nicht verbunden"; zusammen damit die Kennungserzeugung ohne https (P0-2) reparieren.
