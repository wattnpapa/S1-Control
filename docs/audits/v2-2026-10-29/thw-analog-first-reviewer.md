# Audit „Analog first“ — S1-Control v2 (Branch v2-architektur)

Rolle: erfahrener, IT-skeptischer Helfer in der Führungsstelle. Die Excel „Einsatzkräfteübersicht“ habe ich akzeptiert, weil sie wie Papier funktioniert: alles auf einem Blatt, ausdruckbar, Datei mit Einsatzname und Datum auf dem Laufwerk, HTML-Export für die Wand, der Einheiten-Erfassungsbogen (EEB) kommt vom Meldekopf als Papier.

Geprüft am 29.10.2026 an der laufenden Web-Schale (http://127.0.0.1:8089, Prüflage „Übung Weser-Ems“, 40 Einheiten), den 25 Screenshots unter `scratchpad/v2shots/`, den Dateien unter `/tmp/s1-share/einsaetze/2026-09-08-uebung-weser-ems/`, der Kurzanleitung, dem Handbuch und — nur zur Einordnung — dem Quellcode. Keine Daten der Prüflage verändert; deshalb sind Schreibvorgänge mit Zeiteingaben nicht real ausgeführt, sondern als „plausible Risikostelle“ gekennzeichnet.

Kennzeichnung je Punkt: **[beobachtet]** = an App/Datei/Screenshot gesehen · **[plausibel]** = aus Code/Doku abgeleitet, nicht live ausgelöst · **[nicht prüfbar]** = in dieser Umgebung nicht nachstellbar (echter Share-Ausfall, Electron-Zweitfenster, Handscanner, Drucker).

---

## Urteil in Kürze

Die Lage sieht aus wie das Blatt „Stärke“: ein Blatt, Spalten in Excel-Reihenfolge, Summenzeile, Doppelklick–Eingabe–Enter wie in einer Zelle, Strg+D setzt „jetzt“. Die Statuszeile sagt in Worten, ob der Share da ist und ob Eingetipptes schon drüben liegt; die Kurzanleitung hat die sechs Störfälle auf einer Seite. Das ist mehr Rückfallebene, als ich erwartet hatte.

Reibung entsteht an drei Stellen, und zwei davon sind für den Papier-Wiedereinstieg ernst:

1. **Was auf dem Papier steht, kommt nicht komplett in die App.** Aufträge und Fahrzeuge/Kennzeichen (Excel-Spalten J/K, Freitext) sind in der Tabelle „berechnet“ und in den Untertabellen nur lesbar — es gibt keinen Weg, sie von Hand einzutragen. Eine Einheit, die nicht im Vorlagenkatalog steht, lässt sich ebenfalls nicht „leer“ anlegen.
2. **Nachgetragene Zeiten aus dem Meldeblock passen nicht in die Zellen.** Die Zeitfelder nehmen rohen Text und erwarten intern ISO-8601 mit Zeitzone; Strg+D schreibt `2026-10-29T19:44:00.000Z`. „1430“ oder „29.10. 14:30“ vom Papier ist nicht vorgesehen. Ein Statuswechsel trägt gar keine fachliche Zeit — nur die Uhr des Rechners im Moment des Klicks.
3. **Es gibt keinen Ausdruck des Gesamtstands als Blatt.** „Druck“ ist die Lagekarten-Übersicht je Abschnitt (wie in der Excel), aber die Einheitenliste selbst gibt es nur als XLSX. Fällt der Rechner aus, hängt an der Wand nichts, von dem man die 40 Zeilen weiterführen könnte.

Aufgabe (Lage führen, Druck für die Lagekarte, Nachtrag vom Papier) ohne fremde Hilfe: **mit Umwegen** — und beim Nachtrag von Aufträgen/Kennzeichen **nein**.

---

## Findings

### P0-1 · Papierbogen vom Meldekopf lässt sich nicht vollständig von Hand übernehmen (Aufträge, Fahrzeuge, Einheit außerhalb des Katalogs)

- **Fundstelle:** Lage → Einheitentabelle, Werkzeugleiste „Aus Vorlage · Verschieben · Aufteilen · Zusammenführen · Entfernen“ (Screenshot 02, 06); Untertabellen „Fahrzeuge / Personen / Aufträge“ unter der Tabelle (Screenshot 06, 23); Maske „Einheit aus Vorlage anlegen“ (Screenshot 07). Code: `apps/desktop/src/renderer/Untertabellen.tsx:41-110` (nur Listen, keine Eingabe), `packages/domaene/src/projektion/tabelle.ts:122-125` („Geräte / Fahrzeuge“ und „Aufträge“ `art: "berechnet"`, Kommentar: „die Untertabellen tun das“), `Einheitentabelle.tsx:243-245` (Strg+N = nur „aus Vorlage“).
- **Beobachtung [beobachtet]:** Doppelklick auf „Aufträge“ öffnet keinen Editor (live geprüft, innerHTML leer). Die Untertabellen haben keinen Knopf „Auftrag erteilen“ / „Fahrzeug hinzufügen“; es gibt im Renderer keinen Bedienschritt dafür. „Aus Vorlage“ ist der einzige Anlegeweg; die Maske verlangt Katalog (FEUERWEHR / THW_STAN) und Vorlage und setzt Status „Angefordert“. Der Störfall „Erfassungsbogen lässt sich nicht einlesen“ (Diagnose, Kurzanleitung Seite 2) sagt: „Die Werte von Hand in die Einheitenmaske eintragen“ — diese Maske gibt es für Aufträge und Fahrzeuge nicht.
- **Erwartung der Rolle:** In der Excel ist „Aufträge“ eine Zelle („Sandsack Deich km 3, Pumpe Keller Schule“) und „Geräte / Fahrzeuge“ eine Zelle mit Kennzeichen. Der EEB vom Meldekopf hat beides drauf. Ich erwarte: Zelle, tippen, Enter.
- **Auswirkung im Einsatz:** Der Auftrag — die Information, derentwegen die Spalte überhaupt existiert — bleibt auf dem Papier. Wer die Lage am Bildschirm liest, sieht „Kein Auftrag erfasst“ für alle 40 Einheiten (so in der Prüflage) und hält das für den Stand. Eine Sandsackkolonne „Regie / Landkreis Ammerland“ oder eine Bergwacht aus einem fremden Katalog muss als falsche Vorlage angelegt und dann umgetippt werden; der Status „Angefordert“ ist dann zusätzlich falsch, wenn die Einheit längst da ist.
- **Empfehlung:** Für „Aufträge“ und „Geräte / Fahrzeuge“ mindestens eine Freitext-Zelle in der Tabelle (wie Excel J/K), aus der bei Bedarf strukturierte Einträge entstehen können; in den Untertabellen „+ Auftrag“ / „+ Fahrzeug“ mit zwei Feldern. Ein Anlegeweg „Einheit von Hand“ (Bezeichnung, Organisation, Herkunft, Ebene, Stärke, Status) ohne Katalogzwang — das ist die Spalte-für-Spalte-Übernahme des Papierbogens.
- **Verifikation:** Papierbogen mit Auftragstext und zwei Kennzeichen in unter zwei Minuten vollständig übernehmen; danach stehen Auftrag und Kennzeichen in Tabelle, Druck/Auswertung und Tagebuch.

### P0-2 · Zeiten vom Meldeblock lassen sich nicht in gewohnter Schreibweise nachtragen; Statuswechsel hat keine fachliche Zeit

- **Fundstelle:** Lage → Spaltengruppe „Ressourcen“ → Zellen „Verfügbar bis / Eingetroffen / Einsatzende / Rückführung“ (Screenshot 04/05, eigener Screenshot `af2/h5-zeit-edit.png`: leeres Textfeld); Fußzeile „Strg+D setzt ‚jetzt‘“. Code: `apps/desktop/src/kontrakt/bedienschritte.ts:73-81` (`eingabeAlsWert`: Text wird getrimmt durchgereicht), `packages/domaene/src/katalog/bausteine.ts:23` (`zZeitpunkt = z.iso.datetime({ offset: true })`), `Einheitentabelle.tsx:497-500` (Strg+D → `new Date().toISOString()`), `katalog/schemata.ts:176` (`StatusGesetzt = { einheitId }`, keine Zeit), `schemata.ts:175` (`StaerkeGeaendert.meldezeit` optional, aber in der Tabelle nicht abfragbar).
- **Beobachtung [beobachtet]:** Zeitzelle ist ein leeres Eingabefeld ohne Muster, ohne Hinweis auf das Format. **[plausibel]:** „1430“ oder „29.10.2026 14:30“ erfüllt das ISO-Schema nicht; ob die Zelle den Wert still verwirft oder meldet, habe ich nicht ausgelöst (Prüflage nicht verändern). Strg+D schreibt eine UTC-Zeichenkette mit „Z“ — im Winter eine Stunde neben der Wanduhr. Statuswechsel per Zelle schreibt nur „Status gesetzt“ mit Rechneruhr; die Diagnose selbst sagt (Störfall Uhr): „Zeitpunkte, die für die Auswertung zählen, dort nachtragen, wo sie eingetippt werden — sie sind ein Feld und keine Systemzeit.“ Für den Status gibt es dieses Feld nicht.
- **Erwartung der Rolle:** Nach einem Share- oder Rechnerausfall führe ich eine Stunde auf dem Meldeblock: „1412 BGr 1 Oldenburg Einsatzbereit, 1425 FGr Räumen A Einsatz“. Beim Nachtragen will ich die Zeit vom Block eintippen, nicht die Zeit des Klicks akzeptieren müssen.
- **Auswirkung im Einsatz:** Die Einsatzdokumentation (Tagebuch, Spalte „Fachliche Zeit“ bleibt bei Statuswechseln leer — Screenshot 17) weist für alles, was vom Papier kommt, die Nachtragezeit aus. Für Einsatzzeiten, Abrechnung (Kosten rechnen über Personentage) und spätere Nachfragen ist das die falsche Zeit, und niemand sieht es ihr an.
- **Empfehlung:** Zeitzellen nehmen „HHMM“, „HH:MM“, „TT.MM. HH:MM“ und NATO-Zeit („291430OCT26“, so wie das Kopfband sie selbst zeigt) an und zeigen das Ergebnis lokal; Strg+D lokale Zeit. Statuswechsel mit optionaler fachlicher Zeit (Vorbelegung „jetzt“, überschreibbar) — mindestens über die Maske, gern inline mit Strg+D-Logik. Eine klar sichtbare Markierung „nachgetragen“ im Tagebuch, wenn fachliche Zeit und Wanduhr mehr als N Minuten auseinanderliegen.
- **Verifikation:** Zehn Zeilen vom Meldeblock mit Zeiten nachtragen; Tagebuch zeigt für jede die Blockzeit als fachliche Zeit, Druck/Status rechnen damit.

### P1-1 · Kein druckbarer Gesamtstand (Einheitenliste) — bei Rechner- oder Stromausfall hängt nichts an der Wand, von dem man weiterführen kann

- **Fundstelle:** Blatt „Ausgaben“ (Screenshot 15/16): Druck als PDF/HTML, Status als PDF/HTML, Auswertung als XLSX, Logistik, FüOrg, Kosten, Oldenburger Block als XLSX, HTML-Monitor. Erzeugte Dateien `ausgaben/druck_2026-10-29_1532.html` (Screenshot 25) und `status_…html` (Screenshot 27). Code: `packages/ausgaben/src/druck.ts:12-13` („Eine Zeile je Bereich, nicht je Einheit. Die Einheiten stehen im Blatt ‚Stärke‘“).
- **Beobachtung [beobachtet]:** „Druck“ = 8 Zeilen (Abschnitte) mit Fü/UFü/He, Probe, Davon-Stärke — genau das Excel-Druckblatt für die Lagekarte, gut. „Status“ = Matrix nach Organisation/Status/Schicht. Die Liste der 40 Einheiten mit Status, Schicht, Abschnitt gibt es nur als XLSX (Auswertung, Oldenburger Block) — das setzt Excel auf einem funktionierenden Rechner voraus. Weder HTML noch PDF der Tabelle; kein „Drucken“ der Lage-Ansicht (Browserdruck nicht vorgesehen, Tabelle scrollt horizontal, Screenshot 05).
- **Erwartung der Rolle:** Die Excel druckte ich als ganzes Blatt „Stärke“ aus, wenn der Beamer oder das Netz wackelte — eine A3-Seite, auf der ich mit Bleistift weiterführe. In der Excel ist das Strg+P.
- **Auswirkung im Einsatz:** Fällt der Arbeitsplatz aus (Störfall „Anwendung startet nicht“: „Ein anderer Rechner führt den Einsatz weiter“), muss ein anderer Rechner **da sein**. Ist die Führungsstelle mit einem Rechner unterwegs (Zugtrupp) oder fällt der Strom, bleibt nur das letzte Druckblatt mit acht Summenzeilen — damit lässt sich keine Einheit auf Papier weiterführen, keine Ablösung planen, kein Status nachvollziehen.
- **Empfehlung:** „Stärke als PDF/HTML“: die Tabelle in Excel-Spaltenordnung je Abschnitt gruppiert, Querformat, Summen je Abschnitt und gesamt, Stand/Zeit im Kopf, optional mit Leerzeilen zum handschriftlichen Weiterführen; außerdem in der Lage-Ansicht ein Druckstil (Strg+P), der Baum und Werkzeugleiste weglässt und die Tabelle umbricht.
- **Verifikation:** Eine Seite drucken, Rechner ausschalten, 30 Minuten auf dem Blatt weiterführen, danach alle Änderungen (P0-2) nachtragen — ohne dass eine Information fehlt.

### P1-2 · Beim Share-Ausfall ist die Rückfallebene gut beschrieben — beim gleichzeitigen Rechnerausfall nicht

- **Fundstelle:** Statuszeile und Kopfband (Screenshot 02: „✓ Übung Weser-Ems · Stand vor 30 min · Share erreichbar — 5 weitere Arbeitsplätze“, unten „Stand: vor 30 min · Share erreichbar (gerade eben) · 5 weitere · 8 Konflikthinweis(e)“); Diagnose (Screenshot 18): „Lokaler Spiegel /tmp/s1-daten/arbeitsplaetze/d987f4…/spiegel“, „Nicht übertragen: 0 B“; Kurzanleitung Seite 2, Störfall 1 und 5. Code: `Statuszeile.tsx:62-80` („Share nicht erreichbar — …“, „x kB noch nicht übertragen“), `Kopfband.tsx:158-161` (⚠-Zeile).
- **Beobachtung [beobachtet]:** Die Zeile benennt den Zustand in Worten, nicht in Symbolen; „noch nicht übertragen“ in Bytes zeigt, dass Eigenes noch lokal liegt. Die Kurzanleitung sagt richtig: weiterarbeiten, nicht neu starten, an einem Rechner weiterführen. **[nicht prüfbar]:** echter Share-Ausfall und Wiederanlauf. **[plausibel]:** Fällt der Rechner aus, während „4.2 kB noch nicht übertragen“ stand, liegen diese Ereignisse nur im lokalen Spiegel eines Verzeichnisses mit Hash-Namen (`arbeitsplaetze/<32 Hex>/spiegel`). Weder Kurzanleitung noch Handbuch beschreiben, wie man diesen Spiegel von einem toten Rechner (Stick, Festplatte ausbauen) auf den Share zurückträgt; das Handbuch sagt nur „der Spiegel darf gelöscht werden, die Wahrheit liegt auf dem Share“ — was in diesem Fall nicht stimmt. Störfall 1 Schritt 3 („An einem Rechner weiterführen, die anderen lesen nur mit“) nennt nicht, dass die anderen vorher ihre nicht übertragenen Bytes irgendwo ansagen oder ausdrucken sollen.
- **Erwartung der Rolle:** Bei der Excel wusste ich: die Datei liegt unter `\\nas\einsatz\Einsatzname_Datum.xlsm`, und wenn der Rechner stirbt, ist die letzte Autospeicherung da. Ich will wissen: Was genau fehlt drüben, und wie kriege ich es rüber, wenn dieser Rechner nicht mehr hochkommt?
- **Auswirkung im Einsatz:** Zehn Minuten Statusmeldungen eines Arbeitsplatzes verschwinden still, wenn Share und Rechner nacheinander ausfallen; die anderen Rechner sehen einen plausiblen, aber alten Stand und niemand weiß, dass etwas fehlt.
- **Empfehlung:** (a) „noch nicht übertragen“ nicht nur in Bytes, sondern als Zahl der Ereignisse mit Knopf „Zeigen“ → Liste der betroffenen Einheiten/Änderungen (das ist der Zettel, den man bei Rechnertausch abschreibt). (b) In der Kurzanleitung ein siebter Fall oder ein Zusatz zu Fall 5: Spiegelordner finden (Pfad steht in Diagnose) und auf einen anderen Rechner kopieren / `s1 akte` nachführen. (c) Bei Share-Ausfall länger als N Minuten ein Hinweis „Druckblatt erzeugen“ als analoge Sicherung — sofern P1-1 umgesetzt ist, sonst gibt es nichts Brauchbares zu drucken.
- **Verifikation:** Share trennen, drei Statuswechsel, Rechner hart ausschalten; nach Anleitung die Ereignisse mit dem Spiegel auf einen zweiten Rechner bringen; Tagebuch dort vollständig.

### P1-3 · Ausgaben entstehen nur auf dem Share — ausgerechnet dann nicht erreichbar, wenn man sie braucht

- **Fundstelle:** Ausgaben (Screenshot 16): „Geschrieben: /tmp/s1-share/einsaetze/…/ausgaben/status_2026-10-29_1532.html“; Handbuch „Ausgaben“: „die Datei landet im Ordner ‚ausgaben‘ des Einsatzes“; HTML-Monitor liegt ebenfalls im Share (`packages/ausgaben/src/monitor.ts`).
- **Beobachtung [beobachtet]:** Jede Ausgabe wird als Datei auf den Share geschrieben und der Pfad genannt; kein „Öffnen“/„Drucken“-Knopf, kein Vorschaufenster. **[plausibel]:** Bei „Share nicht erreichbar“ ist nicht ersichtlich, ob die Ausgabe scheitert, lokal landet oder wartet; die sechs Störfälle sagen dazu nichts. Der HTML-Monitor für das zweite Gerät hängt am selben Share.
- **Erwartung der Rolle:** Excel-Druckblatt: Strg+P, Papier kommt. HTML-Export: Datei neben der Excel, Browser zeigt sie, der Beamer hängt dran.
- **Auswirkung im Einsatz:** Share weg → die Lagekarte bekommt keinen Ausdruck, der Wandmonitor friert ein (immerhin mit sichtbarem Stand, `monitor.ts` Punkt 4). Der Bediener muss im Explorer den Share-Pfad suchen, um die Datei zu öffnen und zu drucken: drei Klicks, von denen die Kurzanleitung selbst sagt, dass sie „im Zweifel drei Klicks weit weg“ sind.
- **Empfehlung:** Ausgabe nach dem Erzeugen direkt öffnen bzw. „Öffnen“ und „Drucken“ anbieten; bei nicht erreichbarem Share in den lokalen Spiegel schreiben und das sagen („lokal abgelegt unter …, wird nachgeholt“); der HTML-Monitor sollte auch vom lokalen Rechner (Web-Schale/`http://<rechner>:…/monitor`) erreichbar sein, nicht nur über die Freigabe.
- **Verifikation:** Share trennen, „Druck als PDF“ drücken → PDF öffnet sich, Pfad wird genannt, nach Share-Rückkehr liegt sie auch dort.

### P2-1 · Die Dateien auf dem Share sind ohne App lesbar — aber nicht für den Helfer, sondern für den Admin

- **Fundstelle:** `/tmp/s1-share/einsaetze/2026-09-08-uebung-weser-ems/` mit `einsatz.json`, `ereignisse/70000000.0000.jsonl`, `praesenz/*.json`, `ausgaben/*.html`, `schnappschuesse/`, `anhaenge/`. Zeilenformat `packages/speicher/src/zeile.ts` (Kopf): `<länge>\t<crc32>\t<json>\n`.
- **Beobachtung [beobachtet]:** Der Ordnername trägt Datum und Einsatzname (wie die Excel-Datei) — gut. `einsatz.json` ist in fünf Zeilen lesbar (Name, Datum, angelegt von). Die Ereignisdatei ist mit Notepad lesbar und sagt je Zeile, wer was wann getan hat (`"typ":"AbschnittAngelegt"`, `"akteur":{"benutzer":"Seed","host":"seed-rechner"}`), aber: 130 Zeilen à 450–700 Zeichen, ein Stand ist nicht ablesbar, nur die Geschichte. Der Dateiname ist eine Client-Kennung (`70000000.0000.jsonl`), nicht „S1 Platz 1“. Die Zeile ist kein reines JSONL (Längen-/CRC-Präfix), ein normaler JSON-Betrachter stolpert. Die `ausgaben/*.html` sind dagegen mit jedem Browser offen und druckbar — das ist die eigentliche analoge Schnittstelle, und sie funktioniert.
- **Erwartung der Rolle:** Wenn die App nicht startet (Störfall 5), will ich auf dem Laufwerk eine Datei öffnen können, die mir den Stand zeigt. Die Excel konnte das auf jedem Rechner mit Office.
- **Auswirkung im Einsatz:** Ohne laufende App lässt sich aus dem Share kein Stand ablesen; der letzte Stand ist das zuletzt erzeugte `druck_/status_`-HTML — und das erzeugt niemand automatisch (die Excel schrieb den HTML-Export alle 60 s, hier nur bei eingeschaltetem HTML-Monitor-Schalter, Screenshot 15, standardmäßig aus).
- **Empfehlung:** Den HTML-Monitor (und/oder einen Stand als HTML-Tabelle, siehe P1-1) standardmäßig alle 60 s in `ausgaben/aktuell.html` schreiben — das ist die Excel-Gewohnheit und die Datei, die bei Störfall 5 jeder öffnen kann. In `einsatz.json` oder einer `LIESMICH.txt` im Einsatzordner einen Satz: „Stand ohne Programm: ausgaben/aktuell.html öffnen. Ereignisdateien nicht bearbeiten.“ Präsenz-/Ereignisdateien im Dateinamen mit Anzeigenamen ergänzen.
- **Verifikation:** App beenden, Explorer öffnen, in unter einer Minute den aktuellen Stand lesen und drucken können.

### P2-2 · Einsatzakte/Archiv nur über die Kommandozeile

- **Fundstelle:** Handbuch „Ein Einsatz von Anfang bis Ende“, Schritt 10: „`s1 akte exportiere` und das Archiv sichern“; `packages/cli/src/akte/exportiere.ts`; im Renderer kein Export-Knopf (grep `exportiere|Einsatzakte` in `apps/desktop/src/renderer`: kein Treffer).
- **Beobachtung [beobachtet]:** Im Blatt „Ausgaben“ gibt es keinen „Einsatzakte sichern“-Knopf; der Abschluss steht als Terminalbefehl im Handbuch und verweist auf BETRIEB.md.
- **Erwartung der Rolle:** Bei der Excel: Datei auf den Stick, fertig. Hier erwarte ich am Ende der Schicht/des Einsatzes einen Knopf „Einsatz als Datei sichern“, der eine ZIP mit Namen und Datum an einen gewählten Ort schreibt.
- **Auswirkung im Einsatz:** Die Sicherung macht derjenige, der die Kommandozeile kennt — also nicht der S1 um drei Uhr nachts. Fällt das NAS danach aus oder wird abgebaut, ist die einzige Fassung weg oder nur in Fragmenten in den Spiegeln.
- **Empfehlung:** „Einsatzakte sichern (ZIP)“ in Ausgaben, mit Zielwahl (Stick) und Prüfsummenmeldung; Hinweis in der Kurzanleitung unter „Anfangen/Aufhören“.
- **Verifikation:** Helfer ohne Terminal sichert den Einsatz in unter zwei Minuten auf einen Stick; `s1 akte pruefe` bestätigt.

### P2-3 · Klickzahl je Excel-Zelle: Grunddaten gleichwertig, Verschieben und Statuswechsel mit Zeit teurer, Auftrag unmöglich

- **Fundstelle:** Lage (Screenshot 06: Inline-Editor), Maske „Verschieben“ (Screenshot 08), Tastenkarte (Handbuch), eigener Screenshot `af2/h4-status-edit.png` (Status als Auswahlfeld mit Klartext).
- **Beobachtung [beobachtet]:**
  - Textzelle (Bezeichnung, Bemerkung, Stärke als `1/2/8`): Doppelklick → tippen → Enter = wie Excel (F2/tippen/Enter). Gleichwertig.
  - Status: Doppelklick → Auswahl → Enter: 3 Handgriffe; Excel-Pulldown: 2–3. Gleichwertig, Klartext statt Codes — aber ohne Zeit (P0-2).
  - Zeile verschieben: Zeile anklicken → „Verschieben (1)“ → Abschnitt wählen → Übernehmen = 4; Excel-Makro „Zeile verschieben“ ähnlich. Gleichwertig; Mehrfachauswahl ist sogar besser.
  - Typischer Ablauf „Einheit trifft ein“: Verschieben (4) + Status (3) + Eingetroffen Strg+D (Doppelklick, Strg+D, Enter = 3) = 10 Handgriffe, in der Excel ebenfalls etwa 8–10. Akzeptabel.
  - Auftrag eintragen: Excel 3 Handgriffe, hier nicht möglich (P0-1).
  - „Personalerfassung“ zeigt Rohcodes `NUR_STAERKE` / `VOLLSTAENDIG` (Screenshot 02, live Auswahlfeld) — Excel-Fremdwort, das in der Tabelle 40-mal steht und nichts sagt.
- **Erwartung der Rolle:** Nicht mehr Handgriffe als die Excel, und keine Spalte, die ich nicht verstehe.
- **Auswirkung im Einsatz:** Im Normalbetrieb kein Zeitverlust; die Rohcodes kosten Aufmerksamkeit und werden ignoriert, was an sich kein Schaden ist.
- **Empfehlung:** Spalte „Personalerfassung“ in Klartext („nur Stärke“ / „namentlich“) oder standardmäßig ausblenden; sonst nichts ändern — der Zellenweg ist richtig.
- **Verifikation:** Fünf Standardvorgänge (Eintreffen, Status, Auftrag, Ablösung planen, Einsatzende) neben der Excel stoppen; keiner mehr als +2 Handgriffe.

### P2-4 · Handscanner- und Bündelweg sind analog-tauglich, aber die Übergabe zurück aufs Papier fehlt

- **Fundstelle:** „Erfassungsbogen einlesen“ (eigener Screenshot `af2/h3-scanner.png`: ein Feld, „Noch nichts gescannt“, Vorschau mit Stärke/Signatur, „Übernehmen in Abschnitt“); Eingangskorb (Screenshot 10: „Bündel einlesen nach … / Datei wählen / Bündel schreiben“, Ampel Neu/Geändert/Übernommen/Abgelehnt); Störfall 6.
- **Beobachtung [beobachtet]:** Der Scanner ist ein einziges Feld, das den Fokus hält — das richtige Modell für einen Helfer mit Scanner in der einen und Bogen in der anderen Hand. Die Vorschau zeigt, was übernommen wird, bevor es übernommen wird. Der Eingangskorb bildet die gelb/grün-Ampel der bisherigen Google-Tabelle nach; gleicher Bogen zweimal = eine Meldung. Die Bündeldatei (USB-Stick vom Meldekopf ohne Netz) ist genau der Weg, den ein IT-Skeptiker verlangt. **[nicht prüfbar]:** echter Scan. Lücke: Die Ablehnung einer Meldung verlangt einen Grund (gut), aber der Meldekopf auf Papier erfährt davon nichts — es gibt keine druckbare „Rückmeldung an den Meldekopf“ (Liste: übernommen/abgelehnt mit Grund), und die „ID Erfassungsbogen“ steht in der Tabelle als `einheitSchluessel`-Hash, nicht als die Nummer, die der Meldekopf auf den Bogen schreibt.
- **Erwartung der Rolle:** Der Meldekopf gibt mir Papier und will zurück wissen, welche Bögen angekommen sind. In der Excel schrieb man die Bogen-ID in Spalte AB und hakte auf dem Papier ab.
- **Auswirkung im Einsatz:** Abgleich zwischen Papierstapel am Meldekopf und Korb in der Führungsstelle läuft über Funk/Telefon mit Bezeichnungen statt Nummern — Dubletten und vergessene Bögen fallen spät auf.
- **Empfehlung:** Druckbare Korb-Übersicht (Bogen-ID/Kennung, Einheit, Zustand, Grund, Zeit) als „Quittung für den Meldekopf“; in der Tabelle die menschenlesbare Bogen-Nummer, wenn der Bogen eine trägt.
- **Verifikation:** 30 Bögen per Bündel einlesen, 2 ablehnen, Quittung drucken; Meldekopf kann seinen Stapel damit abhaken.

### P3-1 · Störfallkarte: gut, aber zwei Sätze fehlen für den Papier-Helfer

- **Fundstelle:** Kurzanleitung Seite 2 / Diagnose „Die sechs Störfälle“ (Screenshot 18).
- **Beobachtung [beobachtet]:** Die sechs Fälle sind aus der Rolle heraus richtig gewählt und in Helfersprache („Jemanden zum NAS schicken: Strom, Netzwerkkabel, Freigabe“). Die Diagnose zeigt oben „Was gerade zutrifft“ — gut. Es fehlt: (a) der Satz, ab wann man auf Papier umsteigt („Share länger als X Minuten weg und nur ein Rechner: Druckblatt ziehen, Meldeblock führen, Zeiten mitschreiben“), (b) der Wiedereinstieg (Reihenfolge: erst Zeiten, dann Status, dann Verschieben — oder umgekehrt?), (c) Stromausfall/Akku, der bei einem Laptop-Zugtrupp der häufigste Fall ist. Die Protokolldatei-Pfade in Störfall 5 sind für den Helfer Rauschen.
- **Erwartung der Rolle:** Eine Seite, die mir sagt: Wann lege ich den Stift an, und wie komme ich zurück.
- **Auswirkung im Einsatz:** Gering — die Karte hilft bereits; ohne (a)/(b) entscheidet jeder Arbeitsplatz anders.
- **Empfehlung:** Siebter Abschnitt „Weiter auf Papier und zurück“ mit drei Schritten; Kurzanleitung aus der App heraus druckbar (die Erzeugung `packages/ausgaben/src/kurzanleitung.ts` existiert bereits — ein Knopf in Hilfe/Ausgaben fehlt).
- **Verifikation:** Neuer Helfer bekommt nur die Karte und führt eine Stunde Share-Ausfall inklusive Rückkehr sauber durch.

### P3-2 · „Stärke-Monitor“ in der Web-Schale ohne sichtbare Wirkung

- **Fundstelle:** Lage → „Stärke-Monitor“ (eigener Screenshot `af2/h6-monitor.png`): es erscheinen nur „Auf dem Zweitbildschirm öffnen“ / „Schließen“, in der Web-Schale passiert nichts weiter; Screenshot 23 (`#monitor`) zeigt die normale Lage.
- **Beobachtung [beobachtet]:** Zweitfenster ist ein Electron-Weg (`Monitorwahl.tsx`, `MonitorFenster.tsx`); in der Web-Schale **[nicht prüfbar]**. Der HTML-Monitor als Datei (Ausgaben) ist die analog-nähere Lösung (Beamer/Tablet, meta-refresh, großer Stand).
- **Empfehlung:** In der Web-Schale den Knopf ausblenden oder zum HTML-Monitor führen; sonst kein Handlungsbedarf.

---

## Was aus der Rolle ausdrücklich in Ordnung ist

- Die Lage ist **ein Blatt** mit Excel-Spaltenordnung, Summenzeile, Statusleiste mit Zählern (Screenshot 02) — kein Klicken durch Detailseiten, um eine Zahl zu sehen.
- Statuszeile in Worten: „Share nicht erreichbar“, „x kB noch nicht übertragen“, „allein am Einsatz“ — kein Ampel-Icon, das man deuten muss.
- „Entfernen“ ist kein Löschen, Rücknahmen stehen im Tagebuch — das ist die Haftung, die Papier auch hat (durchstreichen statt radieren). Besser als die Excel („Vorgänge können nicht rückgängig gemacht werden“).
- Druck- und Status-HTML sind mit jedem Browser offen, mit Stand und Probe-Spalte „o.k.“ wie gewohnt; Dateiname mit Zeitstempel, nichts wird überschrieben.
- Einsatzordner mit Datum und Namen auf dem Share; `einsatz.json` in Klartext.
- Scanner als ein Feld, Bündeldatei per Stick, Ampel im Eingangskorb — der Meldeweg ohne Netz ist mitgedacht.
- „Aus Vorlage“ warnt vor erfundenen Zahlen („Eine Zahl, die niemand gemeldet hat, ist der gefährlichere Fehler“) und setzt „Angefordert“ — das ist die richtige Vorsicht.

---

## Analog-/Digital-Übergabematrix

| Prozessschritt | Digitaler Nutzen | Analoger Fallback | Sauberer Wiedereinstieg in Digital |
|---|---|---|---|
| Einheit meldet sich am Meldekopf (EEB) | Scan/Bündel statt Abtippen; Dubletten erkannt; Ampel statt Farbe | Papierbogen bleibt die Urschrift (Störfall 6 sagt das richtig) | Scan oder Bündel später; **Lücke:** Aufträge/Fahrzeuge und Katalog-fremde Einheiten nicht von Hand erfassbar (P0-1); keine Quittung zurück an den Meldekopf (P2-4) |
| Statuswechsel / Eintreffen / Verschieben | Alle Rechner sehen es sofort; Summen ohne Rechenfehler; Tagebuch automatisch | Meldeblock mit Uhrzeit, Druckblatt mit Bleistift | Zellen und Verschieben sind schnell; **Lücke:** Blockzeit nicht eintragbar, Status ohne fachliche Zeit (P0-2) |
| Lagekarte / Lagebesprechung | Druck-/Status-HTML, Probe-Spalte, HTML-Monitor an der Wand | Ausdruck des Druckblatts, Whiteboard | Unkritisch — Ausgabe ist Einbahnstraße; **Lücke:** kein Ausdruck der Einheitenliste (P1-1), Ausgaben nur auf dem Share (P1-3) |
| Share-Ausfall | Lokaler Spiegel, Bytes-Anzeige, Autosync | Weiterarbeiten am einen Rechner; Meldeblock für die anderen | Automatisch bei Share-Rückkehr; **Lücke:** Rechnerausfall mit unübertragenen Ereignissen nicht beschrieben (P1-2) |
| Rechner-/Stromausfall | Andere Rechner führen weiter; Spiegel | Letzter Ausdruck + Meldeblock | Nachtragen über Zellen; **Lücke:** P0-2 und P1-1 |
| Ablösung planen (Anforderungen) | Kennung, Zustandskette, Zusage mit Zeit | Zettel mit Anforderungs-ID | Zustände rücknehmbar („Zusage zurück“); Zeit „Angefordert“ kommt aus der Systemuhr — Nachtrag mit Blockzeit nicht gesehen (Screenshot 11) |
| Einsatzende / Archiv | Einsatzakte mit Prüfsummen | Ausgedruckte Blätter in der Akte | **Lücke:** Export nur per Kommandozeile (P2-2) |
| Stand lesen ohne Programm | HTML im Ordner `ausgaben/` | — | Nur so aktuell wie die letzte manuelle Ausgabe; kein automatischer 60-s-Export wie in der Excel (P2-1) |

---

## Würde ich dafür das Papier weglegen?

**Für die laufende Lageführung mit zwei bis fünf Rechnern am Share: ja, mit dem Meldeblock daneben.** Die Tabelle arbeitet wie meine Excel-Zellen, mehrere Leute schreiben gleichzeitig ohne „Datei ist gesperrt“, und die Statuszeile sagt mir ehrlich, wann ich allein bin. Weglegen kann ich das Papier aber erst, wenn ich (1) einen Auftrag und ein Kennzeichen in eine Zelle tippen kann, (2) die Zeit vom Meldeblock so eintragen kann, wie sie dort steht, und (3) im Notfall ein ganzes Blatt mit allen Einheiten aus dem Drucker bekomme. Bis dahin bleibt der Bogen vom Meldekopf die Urschrift und das Druckblatt die Notlage — und das ist genau der Zustand, den die Software selbst in ihrem Störfall 6 beschreibt.

---

- **Aufgabe geschafft:** mit Umwegen (Nachtrag von Aufträgen/Kennzeichen: nein)
- **Fremde Hilfe nötig:** nein für den Tagesbetrieb; ja für Einsatzakte (Kommandozeile) und für die Rettung eines lokalen Spiegels
- **Größtes Missverständnis:** Dass „Doppelklick bearbeitet die Zelle“ für alle Spalten gilt — Aufträge, Geräte/Fahrzeuge und Herkunft sind nur Anzeige, und die Zeitzellen erwarten ein Format, das niemand auf dem Meldeblock schreibt.
- **Größtes Einsatzrisiko:** Nach einem Share- oder Rechnerausfall kommen die Papierstände mit falschen (Nachtrage-)Zeiten und ohne Aufträge in die App, und niemand sieht der Dokumentation an, was nachgetragen wurde.
- **Top-Priorität für die nächste Iteration:** Papier-Wiedereinstieg vollständig machen — Freitext für Aufträge/Fahrzeuge plus Zeitzellen, die „1430“/„29.10. 14:30“ annehmen, und Statuswechsel mit überschreibbarer fachlicher Zeit (P0-1, P0-2); direkt danach „Stärke als PDF“ (P1-1).

---

### Verwendetes Material
- Screenshots: `scratchpad/v2shots/01…27`, eigene unter `scratchpad/af2/h3-scanner.png`, `h4-status-edit.png`, `h5-zeit-edit.png`, `h6-monitor.png`
- Share: `/tmp/s1-share/einsaetze/2026-09-08-uebung-weser-ems/{einsatz.json, ereignisse/70000000.0000.jsonl, praesenz/, ausgaben/}`
- Doku: `docs/v2/KURZANLEITUNG.md`, `docs/v2/HANDBUCH.md`
- Code (nur zur Einordnung): `apps/desktop/src/renderer/{Einheitentabelle,Untertabellen,Einheitenmasken,Scanner,Eingangskorb,Ausgaben,Statuszeile,Kopfband,Tagebuch,Monitorwahl}.tsx`, `apps/desktop/src/kontrakt/bedienschritte.ts`, `packages/domaene/src/projektion/{tabelle,tagebuch}.ts`, `packages/domaene/src/katalog/{schemata,bausteine}.ts`, `packages/ausgaben/src/{druck,monitor,xlsx,index}.ts`, `packages/speicher/src/zeile.ts`, `packages/cli/src/akte/exportiere.ts`
