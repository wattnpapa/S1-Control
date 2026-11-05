# Audit S1-Control v2 — Perspektive Leiter Stab / Leiter Führungsstelle

Stand: **05.11.2026**, HEAD `d6401f7` (nach den Schnitten E1–E4 „Entlastung der Oberfläche“, Fleetmapping-Vorschlag und den Rollen-Reviewern).

Rolle: Ich leite die Führungsstelle. Ich koordiniere S1 bis S6 und die Führungsgehilfen, setze den Führungsrhythmus, leite die Lagebesprechung und bereite Entscheidungen für den Einsatzleiter vor. Ich pflege selbst kaum Daten. Ich will sehen, ob die Sachgebiete synchron sind und wo etwas liegen bleibt, und ich muss die Führungsstelle zum Schichtwechsel geordnet übergeben.

Material: eigene Web-Schale `http://127.0.0.1:8224` mit eigener Kopie der Prüflage „Übung Weser-Ems“ (40 Einheiten). Profil „Alle Blätter“, Anzeigename „Leiter Stab“. Viewports 1600×1000 und 1920×1080, Durchlauf 20:58–21:15 Uhr. Reale Schreibvorgänge: Tagebucheintrag „Lagebesprechung“, Auftrag an „TZ THW Bereitstellung“, acht Ausgaben (HTML), HTML-Monitor, Statuswechsel im Störfall. Störfall nachgestellt, indem der Share-Ordner der Kopie für etwa eine Minute umbenannt und dann zurückbenannt wurde. Aufnahmen: `scratchpad/shots/leiter-stab/01…91` (deviceScaleFactor 1). Ausgaben: `share/einsaetze/2026-09-08-uebung-weser-ems/ausgaben/` der Kopie. Quelltext nur lesend. Vergleich mit `docs/audits/v2-2026-10-29/thw-command-reviewer.md` und `docs/audits/v2-2026-11-05/thw-command-reviewer.md`.

Kennzeichnung: **[beobachtet]** heißt an der laufenden Web-Schale gesehen oder ausgelöst. **[Code]** heißt aus der Quelle belegt (Datei:Zeile). **[Annahme]** ist eine Annahme über THW-Abläufe oder Ursachen. **[nicht prüfbar]** heißt in der Web-Schale nicht nachvollziehbar.

---

## Urteil

S1-Control ist ein gutes Werkzeug für die **Stärke**. Die Ist-Stärke im Kopfband (`14/48/202 // 264 · +63 erwartet · 3 beendet`) hat eine aufklappbare Regel. Dieselbe Zahl steht in Druck, Status-Matrix, Führungsorganisation, Stärke-Monitor und HTML-Monitor. Die Führungsorganisation (Harke) zeigt die Stärke je Abschnitt so, dass ich sie am Beamer besprechen kann. Ablösungen tragen eine Marke an der Einheit, Anforderungen haben einen Filter mit Zählern, und die Ausgaben sind mit Zeitstempel abgelegt und überschreiben sich nicht.

Für die **Leitung der Führungsstelle** fehlt die Klammer über die Sachgebiete:

1. **Es gibt keinen Ort für „Was ist offen?“.** Für die offenen Punkte der Prüflage brauchte ich neun Ansichten plus einen Spaltenwechsel. Nirgends steht ein Alter („seit 2 h offen“).
2. **Entscheidungen der Lagebesprechung lassen sich festhalten, aber nicht als Auftrag verfolgen.** Das Tagebuch nimmt Freitext an. Aufträge gibt es nur an Einheiten, nicht an ein Sachgebiet, ohne Frist und ohne Gesamtliste. Der normale Weg „Tagebucheintrag ohne Uhrzeit“ wird sogar immer abgewiesen.
3. **Die Technik der Führungsstelle meldet sich missverständlich.** Geschlossene Browser bleiben minutenlang als „9 weitere Arbeitsplätze“ stehen. Verschwindet der Einsatzordner, wird der Einsatz geschlossen. Öffne ich ihn dann wieder, sehe ich ein Lagebild ohne Einsatzname und ohne Ist-Stärke, das nichts annimmt und sich auch nach Rückkehr des Ordners nicht erholt.

Die Lagebesprechung kann ich mit der Software für die Stärke führen. Offene Punkte, Aufträge und den Stand für die Übergabe führe ich weiter auf Papier oder an der Tafel.

---

## Findings

### P1-1 — Kein Überblick über die offenen Punkte aller Sachgebiete, keine Altersangabe

- **Fundstelle / Aufgabe:** Prüfaufgabe 2 („alle offenen Punkte zusammentragen“) und Prüfaufgabe 1. Reiterzeile; Lage; Eingang › Eingangskorb und › Anforderungen; Versorgung; Funkplan; Führungsstelle; Statuszeile und Diagnose; Einsatztagebuch. Aufnahmen `03-lage.png`, `10-Eingang.png`, `20-anforderungen.png`, `12-Funkplan.png`, `13-Versorgung.png`, `11-Fuehrungsstelle.png`, `24-diagnose.png`. Code: `apps/desktop/src/renderer/Reiterzeile.tsx:39-40` (Zähler am Reiter nur für offene Meldungen des Eingangskorbs), `apps/desktop/src/renderer/Ressourcenmarken.tsx:9,61` („läuft ab“ nur an der Zelle „Verfügbar bis“).
- **Beobachtung [beobachtet, Code]:** Gezählte Ansichten für den offenen Stand der Prüflage:
  1. **Lage:** „BGr 1 Oldenburg *Ablösung angefordert*“, „FGr Elektroversorgung *Ablösung zugesagt*“, Filter „Nicht einsatzbereit 1“ (Gr Wasserrettung).
  2. **Lage › Spalten › Ressourcen:** Fristen („läuft ab“) stehen nur dort, in einer sonst ausgeblendeten Spaltengruppe.
  3. **Eingang › Eingangskorb:** „0 offen“.
  4. **Eingang › Anforderungen:** „Offen 1 · Zugesagt 1“. Die Spalte „Angefordert“ nennt „08.09.2026 05:30“, aber kein Alter. Der Reiter „Eingang“ trägt keine Zahl, obwohl eine Anforderung offen ist.
  5. **Versorgung:** „Nachtverpflegung 0000 … noch nicht bestellt“, „44 ohne Unterkunft“.
  6. **Funkplan:** „0 Rufgruppen · 39 ohne Rufgruppe“.
  7. **Führungsstelle:** unbesetzte Dienstposten („SGL 1 · Nacht“, „SprFu/Kf · Nacht“). Sie sind nur als leeres Feld erkennbar, „Besetzt · NACHT 1/0/0“ nennt keine Lücke.
  8. **Statuszeile / Diagnose:** „⚠ 8 Konflikthinweise“.
  9. **Einsatztagebuch:** Entscheidungen und Meldungen, nur über die Suche.

  Aufträge an Einheiten stehen nur je Zeile in der Spalte „Aufträge“. Eine Liste offener Aufträge gibt es nicht. Kein Kopfband, kein Reiter und kein Monitorbild fasst diese Punkte zusammen.
- **Erwartung der Rolle:** Eine Seite, auf Papier die Tafel „Offene Punkte“: je Sachgebiet die Zahl offener Vorgänge (Anforderungen offen/zugesagt, fällige Ablösungen, ungesichtete Meldungen, offene Bestellung, unbesetzte Dienstposten, Einheiten ohne Kontakt, offene Aufträge). Zu jedem Punkt das Alter, und ein Klick führt zur Stelle.
- **Auswirkung im Einsatz:** Vor jeder Lagebesprechung muss ich jedes Sachgebiet abfragen oder neun Blätter durchgehen. Eine Anforderung ohne Zusage fällt nicht auf, weil weder Reiter noch Kopfband sie zählen und die Liste kein Alter nennt. Ich führe deshalb eine eigene Liste auf Papier, und die weicht vom Rechner ab.
- **Empfehlung:** Ein Blatt oder ein ausklappbarer Bereich „Offene Punkte“ mit einer Zeile je Sachgebiet und Art, mit Zahl, ältestem Alter und Sprung zur Stelle. Die Zahl offener und zugesagter Anforderungen auch am Reiter „Eingang“ zeigen. „Läuft ab“ an der Bezeichnung zeigen, wie es die Ablösungsmarke schon tut.
- **Verifikation:** Mit der Prüflage nennt eine einzige Ansicht mindestens: Anforderung offen 1 (mit Alter), zugesagt 1, Ablösung angefordert 1, Bestellung Nacht offen, 44 ohne Unterkunft, 39 ohne Rufgruppe, 2 Dienstposten unbesetzt, 8 Konflikthinweise. Jeder Eintrag springt zur Fundstelle.

### P1-2 — Entscheidungen der Lagebesprechung werden nicht zu verfolgbaren Aufträgen an Sachgebiete

- **Fundstelle / Aufgabe:** Prüfaufgabe 3. Einsatztagebuch › „Eintrag hinzufügen“; Lage › Einheit wählen › Untertabelle „Aufträge“. Aufnahmen `41-etb-maske-gefuellt.png`, `44-etb-mit-zeit.png`, `51-untertabellen.png`, `52-auftrag-erfasst.png`, `7-einheitenliste.png`. Code: `apps/desktop/src/renderer/TagebuchEintrag.tsx:24` (Quellen bis „Lagebesprechung“, kein Empfänger), `packages/domaene/src/katalog/schemata.ts:464-474` (`EtbEintragErfasst`: Text, Zeit, optionaler Bezug auf Einheit/Abschnitt/Fahrzeug/Anforderung, kein Sachgebiet, keine Frist), `apps/desktop/src/renderer/UntertabellenErfassung.tsx:82-130` (Auftrag nur an einer Einheit: Text und Beginn).
- **Beobachtung [beobachtet, Code]:** Die Entscheidung habe ich als Tagebucheintrag mit Quelle „Lagebesprechung“ erfasst: „Entscheidung LdE: EA Reserve mit TZ THW Bereitstellung besetzen. Auftrag an S3: … Auftrag an S4: …“. Er steht danach mit „Leiter Stab“ im Tagebuch. „S3“ und „S4“ sind aber nur Text. Es gibt kein Feld „an“, keine Frist, kein „erledigt“ und keinen Filter „Lagebesprechung“. Danach habe ich an der Einheit „TZ THW Bereitstellung“ einen Auftrag erfasst. Das ging gut („✓ Auftrag erfasst … · gespeichert“, mit Rückgängig), und der Auftrag erscheint in der Einheitenliste. Er hängt aber an einer Einheit und nicht am Sachgebiet, das ihn umsetzen soll. Es gibt keine Liste aller offenen Aufträge, und das Tagebuch kennt keinen Bezug zwischen Entscheidung und Auftrag.
- **Erwartung der Rolle:** Auf Papier ist das die Liste „Aufträge aus der Lagebesprechung“ mit Nr., Inhalt, Zuständig (Sachgebiet oder Funktion), Termin und Erledigt. In der Software: aus dem Tagebucheintrag heraus einen Auftrag an S1–S6 oder eine Funktion der Führungsstelle mit Termin anlegen. In der nächsten Besprechung lese ich die offenen Aufträge mit Verzug vor.
- **Auswirkung im Einsatz:** Nach der Besprechung geht jedes Sachgebiet mit eigener Mitschrift weg. Ob S4 die Nachtverpflegung für den Anmarsch tatsächlich bestellt hat, sehe ich erst, wenn ich nachfrage. Bei der Übergabe sind offene Aufträge nur mündlich zu übermitteln.
- **Empfehlung:** Einen Vorgang „Auftrag der Führungsstelle“ mit Zuständig (aus den Dienstposten), Termin, Zustand (offen, in Arbeit, erledigt) und Bezug zum Tagebucheintrag. Eine Liste dieser Aufträge mit Verzugsmarke, die in „Offene Punkte“ (P1-1) und in eine Ausgabe für die Lagebesprechung eingeht.
- **Verifikation:** Aus einem Tagebucheintrag „Lagebesprechung“ zwei Aufträge an S3 und S4 mit Termin 22:00 anlegen. Um 22:01 tragen beide eine Verzugsmarke in der Liste und in „Offene Punkte“. „Erledigt“ an S4 nimmt ihn heraus, und das Tagebuch zeigt den Verlauf.

### P1-3 — Tagebucheintrag ohne Uhrzeit wird immer abgewiesen

- **Fundstelle / Aufgabe:** Prüfaufgabe 3, Einsatztagebuch › „Eintrag hinzufügen“, Feld „Zeit der Meldung“ leer (Platzhalter „leer = jetzt“). Aufnahme `42-etb-nach.png`. Code: `apps/desktop/src/renderer/TagebuchEintrag.tsx:46-47` und `apps/desktop/src/renderer/Anlegeversuch.tsx:73-76`.
- **Beobachtung [beobachtet, Code]:** Text und Quelle „Lagebesprechung“ eingetragen, Zeit leer gelassen, „Eintrag speichern“ gedrückt. Ergebnis: „Nicht gespeichert – Die Nutzlast für EtbEintragErfasst ist nicht gültig: zeitpunkt — Invalid ISO datetime“. Mit eingetippter Uhrzeit (z. B. „2105“) wurde gespeichert. Ursache [Code]: `kennung()` merkt sich den **ersten** erzeugten Wert für den ganzen Versuch. Der zweite Aufruf für „jetzt“ (`TagebuchEintrag.tsx:47`) liefert deshalb die Kennung „ETB-…“ statt eines Zeitpunkts. Derselbe Befund steht im Sichter- und im FM-Zentrale-Audit vom selben Tag; hier ist er aus Sicht der Lagebesprechung bestätigt.
- **Erwartung der Rolle:** „Leer = jetzt“ funktioniert, wie es dasteht. Wenn etwas fehlt, sagt die Meldung auf Deutsch, was zu tun ist („Uhrzeit eintragen“).
- **Auswirkung im Einsatz:** Das Protokoll der Lagebesprechung, also der Weg, den Entscheidungen überhaupt in die Akte nehmen, scheitert im Normalfall mit einer technischen Meldung. Unter Zeitdruck schreibt man die Entscheidung dann auf Papier und trägt sie nie nach.
- **Empfehlung:** „Leer = jetzt“ zuverlässig speichern. Fehlermeldungen der Prüfung in Bedienersprache übersetzen.
- **Verifikation:** Eintrag mit leerer Zeit speichert und zeigt im Tagebuch „Erfasst“ und „Zeit der Meldung“ mit der aktuellen Minute. Ein Regressionstest deckt den leeren Zeitpunkt ab.

### P1-4 — Störfall „Einsatzordner nicht auffindbar“: Einsatz schließt, Wiederöffnen ergibt ein eingefrorenes Lagebild

- **Fundstelle / Aufgabe:** Prüfaufgabe 5. Share-Ordner der Kopie für etwa eine Minute umbenannt und wieder zurückbenannt. Aufnahmen `80-share-weg.png`, `85-oeffnen-ohne-ordner.png`, `87-zombie-statuswahl.png`, `88-zombie-geschrieben.png`, `86-nach-rueckkehr.png`. Code: `packages/speicher/src/fehler.ts:55` (`ENOENT` → „ordnerFort“), `apps/desktop/src/worker/aktendienst.ts:519-523` (Akte wird geschlossen), `packages/speicher/src/spiegelergebnis.ts:18-19`.
- **Beobachtung [beobachtet, Code]:**
  1. Nach etwa 10 s springt das Fenster ohne Rückfrage auf die Einsatzauswahl. Darunter steht **zweimal** derselbe Satz: „Der Einsatzordner ist unter dem bekannten Pfad nicht mehr auffindbar. Die Einträge liegen lokal bereit …“. Was ich tun soll, steht nicht da. Die Liste bietet den Einsatz weiter mit „Öffnen“ an.
  2. Bei „Öffnen“, solange der Ordner fehlt, erscheint die volle Lage-Tabelle mit allen Einheiten. Im Kopf steht aber „S1-Control“ statt des Einsatznamens, die Ist-Stärke ist „—“, und es gibt weder Zustandsmarke noch Statuszeile. Unten steht „Kein Einsatz geöffnet“. Ein Statuswechsel endet mit „Nicht gespeichert – Die Akte ist geschlossen.“
  3. Nach Rückkehr des Ordners und Neuladen bleibt dieser Zustand. Erst ein neues Browserfenster öffnet den Einsatz wieder normal.
  4. Die Störfallliste in Diagnose und Kurzanleitung kennt diesen Fall nicht. Sie beschreibt nur „Share nicht erreichbar“ mit „Weiterarbeiten ist immer richtig“.
  - [Annahme] Ob ein echter NAS- oder SMB-Ausfall unter Windows als „Ordner nicht auffindbar“ (`ENOENT`) oder als „nicht erreichbar“ ankommt, habe ich nicht geprüft. Bei einem umgehängten Laufwerksbuchstaben oder einer umbenannten Freigabe tritt der Fall jedenfalls ein. Einen Ausfall des Dienstes selbst konnte ich in dieser Umgebung nicht nachstellen **[nicht prüfbar]**.
- **Erwartung der Rolle:** Ein Wort, ob dem Bild zu trauen ist, wie es die Zustandsmarke im Normalbetrieb leistet. Dazu ein Satz, was jetzt zu tun ist („Share-Pfad prüfen; bis dahin auf Papier, Einheitenliste liegt vor“). Kein halb geöffnetes Lagebild, das wie das echte aussieht.
- **Auswirkung im Einsatz:** Die Führungsstelle sieht nach Wiederöffnen eine vollständige, aber eingefrorene Lage. Wer nur auf die Tabelle schaut, hält sie für aktuell. Eingaben scheitern einzeln an jeder Zelle. Ohne Hilfe von außen kommt niemand darauf, dass ein neues Fenster nötig ist.
- **Empfehlung:** Den Fall als eigenen Störfall mit Handlungsanweisung führen und den Hinweis nur einmal zeigen. Ein Einsatz, der nicht geöffnet werden kann, öffnet keine Tabelle, oder er öffnet sie sichtbar als „nur lesen, Stand HH:MM“. Kehrt der Ordner zurück, erholt sich die Ansicht selbst oder bietet „Erneut öffnen“ an.
- **Verifikation:** Ordner wegnehmen: Ein Satz mit Handlungsanweisung erscheint einmal. „Öffnen“ zeigt keine bearbeitbare Lage ohne Kopfdaten. Ordner zurück: Innerhalb einer Minute oder nach einem Klick ist der Einsatz normal offen, ohne neues Browserfenster.

### P2-5 — Technikstatus: „9 weitere Arbeitsplätze“ werden gezählt, obwohl nur ein Browser offen ist

- **Fundstelle / Aufgabe:** Prüfaufgabe 5, Statuszeile und Diagnose › Arbeitsplätze. Aufnahmen `24-diagnose.png`, `27-diagnose-arbeitsplaetze.png`. Code: `apps/desktop/src/renderer/arbeitsplatzzahl.ts:11-13` (zählt nicht veraltete), `packages/speicher/src/praesenz.ts:128` (veraltet ab 60 s ohne Fortschreibung).
- **Beobachtung [beobachtet]:** Jeder meiner Prüfläufe öffnete und schloss ein Browserfenster. Die Statuszeile stieg von „1 weiterer Arbeitsplatz“ auf „9 weitere Arbeitsplätze“. Die Diagnose zeigt neunmal „Leiter Stab · vm“ mit „Zuletzt gesehen vor 3–6 min“ und „Uhr 4–7 min nach“. Keiner davon ist als veraltet grau abgesetzt, obwohl die Regel bei 60 s liegt. Die Uhrabweichung entspricht ziemlich genau dem Alter der letzten Sichtung. [Annahme] Der Wert ist eine Folge des alten Stands und keine echte Uhrabweichung. Wie sich die Desktop-Fassung verhält, konnte ich nicht prüfen **[nicht prüfbar]**. Eine Führungsstelle mit Browser-Arbeitsplätzen (Handy, Tablet, zweiter Laptop) erzeugt aber genau dieses Muster.
- **Erwartung der Rolle:** „2 weitere, davon 1 veraltet“ wie in der Kurzanleitung. Verschiedene Namen, damit ich sehe, welcher Platz fehlt. Keine Uhrwarnung für einen Platz, der nur fort ist.
- **Auswirkung im Einsatz:** Die Zahl „9 weitere Arbeitsplätze“ sagt mir nicht, ob S2 noch am Netz ist. Ich frage im Raum nach, statt der Anzeige zu trauen. Nach ein paar Stunden ignoriert jeder die Zahl.
- **Empfehlung:** Fortgegangene Arbeitsplätze nach der eigenen 60-s-Regel nicht mitzählen und grau zeigen. Die Uhrabweichung nur für aktive Plätze nennen. Beim Öffnen einen fehlenden Anzeigenamen deutlicher einfordern.
- **Verifikation:** Drei Browser öffnen und zwei schließen: Nach spätestens 2 min nennt die Statuszeile „1 weiterer Arbeitsplatz“, die Diagnose zeigt die zwei geschlossenen grau und ohne Uhrabweichung.

### P2-6 — Gleich beschriftete Zahlen widersprechen sich zwischen Ansicht und Ausgabe

- **Fundstelle / Aufgabe:** Prüffrage „Sind die Zahlen widerspruchsfrei?“. Lage-Baum, Führungsorganisation, Druck, HTML-Monitor, Status-HTML, Anforderungen-HTML. Aufnahmen `03-lage.png`, `21-fueorg.png`, `7-druck.png`, `65-monitor-html.png`, `7-status.png`, `7-anforderungen.png`. Code: `packages/ausgaben/src/status-kontrolle.ts:44-46`, `packages/ausgaben/src/status.ts:338-340`, `packages/ausgaben/src/listen.ts:25-34`.
- **Beobachtung [beobachtet, Code]:**
  - **„EA Deich Nord“** steht im Baum und in der Führungsorganisation mit **2/10/65 = 77**, einschließlich UA Deichfuß. Im Druck und im HTML-Monitor steht es mit **1/6/32 = 39**, UA Deichfuß in einer eigenen Zeile. Nur der Zwischenkopf der Tabelle sagt „mit Unterabschnitten“. Baum und Ausgaben sagen es nicht.
  - **Status-HTML:** Die Tabelle „Schichten“ summiert **290**, „Organisation“ und „Status“ summieren **327**. Darunter steht trotzdem „Schicht: o.k. — alle Einheiten tragen eine Schicht.“ und „Alle Einheiten tragen Organisation, Status und Schicht.“ Die 37 Kräfte der drei angeforderten Einheiten haben keine Schicht. Der Code lässt das bewusst zu (`status.ts:21-23`), aber der Satz behauptet etwas anderes.
  - **Anforderungen-HTML:** „Zusage“ steht als Rohwert „2026-09-08T16:00:00+02:00 / THW RB Oldenburg“, in der App als „08.09.2026 14:00 · THW RB Oldenburg“. [Annahme] Die zwei Stunden Unterschied kommen daher, dass die Prüfumgebung in UTC läuft. Das Format ist trotzdem roh. Außerdem steht dort „STORNIERT (storniert)“.
  - Gut erklärt und deshalb kein Widerspruch: Versorgung und Logistik zählen 293 („alle erfassten Einheiten der Einsatzbereiche“), die Ist-Stärke ist 264, alle erfassten Einheiten sind 327. Die Beschriftungen sagen jeweils, was gezählt wird.
- **Erwartung der Rolle:** Derselbe Name bedeutet in jeder Ansicht und auf jedem Papier dieselbe Zahl, oder er trägt sichtbar den Zusatz „mit UA“ oder „ohne UA“. Kontrollsätze stimmen mit der Tabelle darüber überein. Zeiten stehen auf Papier wie am Bildschirm.
- **Auswirkung im Einsatz:** In der Lagebesprechung hat der S3 „EA Deich Nord 39“ auf dem Ausdruck, am Beamer steht 77. Die ersten Minuten gehen in die Klärung, welche Zahl stimmt. Ein „o.k.“ unter abweichenden Summen untergräbt das Vertrauen in alle Kontrollsummen.
- **Empfehlung:** Den Bezug „mit Unterabschnitten“ oder „ohne“ in Baum, Führungsorganisation, Druck und HTML-Monitor gleich ausweisen. Den Schicht-Kontrollsatz auf „o.k. — 37 angeforderte Kräfte ohne Schicht“ ändern. Zeiten in Ausgaben im Format der App.
- **Verifikation:** Ausdruck „Druck“ und Führungsorganisation nebeneinanderlegen: Jede Zeile „EA Deich Nord“ hat dieselbe Zahl oder einen Zusatz. Status-HTML: Kontrollsatz und Summen widersprechen sich nicht. Anforderungen-HTML: „08.09.2026 16:00“.

### P2-7 — Schichtwechsel der Führungsstelle: keine Übergabeausgabe, kein „seit der letzten Besprechung“

- **Fundstelle / Aufgabe:** Prüfaufgabe 4. Ausgaben, Einsatztagebuch, Führungsstelle › Schichtplan. Aufnahmen `61-ausgaben-erzeugt.png`, `7-tagebuch.png`, `64-schichtplan.png`. Handbuch: `docs/v2/HANDBUCH.md:74` („Zum Schichtwechsel: Nichts.“).
- **Beobachtung [beobachtet]:** Für die Ablösung habe ich acht HTML-Ausgaben erzeugt (Status, Einheitenliste, Anforderungen, Tagebuch, Druck, Führungsorganisation, Logistik, Funkplan). Jede ist für sich brauchbar, aber keine fasst den Stand der Führungsstelle zusammen: offene Punkte, Entscheidungen, laufende Aufträge, was sich in der Schicht geändert hat. Das Tagebuch-HTML hat 132 Einträge, „älteste zuerst“, ohne Zeitraum. Im Programm hat das Tagebuch Suche, „Auf die Auswahl beschränken“ und „Nur Rücknahmen“, aber keinen Filter „seit HH:MM“. Der Schichtplan zeigt für den Ltr FüSt Nacht „Gnieser, Jannik“, hat aber Spaltenköpfe im Format „2026-09-08“ und ist nicht nach Teilbereich geordnet.
- **Erwartung der Rolle:** Eine Ausgabe „Übergabe Führungsstelle“ (oder „Lagebesprechung“): Stand, Ist-Stärke je Abschnitt, offene Punkte nach P1-1, offene Aufträge nach P1-2, Tagebuch seit Schichtbeginn oder seit der letzten Besprechung. Im Tagebuch einen Zeitfilter „seit“.
- **Auswirkung im Einsatz:** Die Übergabe bleibt mündlich und dauert. Was die abgehende Schicht nicht erwähnt, verschwindet in 132 Zeilen Tagebuch. „Nichts tun“ zum Schichtwechsel stimmt für die Daten, aber nicht für die Führung.
- **Empfehlung:** Eine Übergabe- bzw. Lagebesprechungsausgabe aus den vorhandenen Bausteinen. Im Tagebuch einen Filter „seit“ mit den Vorbelegungen „Schichtbeginn“ und „letzte Lagebesprechung“ (aus dem Eintrag mit Quelle „Lagebesprechung“).
- **Verifikation:** Eine Ausgabe erzeugt ein Blatt mit offenen Punkten, offenen Aufträgen und den Tagebuchzeilen seit dem letzten Eintrag „Lagebesprechung“. Eine Testperson ohne Vorwissen kann daraus drei offene Aufträge mit Zuständigem nennen.

### P2-8 — Lagebesprechung am Monitor: nur die Gesamtzahl, keine Lage je Abschnitt und keine offenen Punkte

- **Fundstelle / Aufgabe:** Prüfaufgabe 1. Fenstermenü › „Stärke-Monitor öffnen …“, Ansichten 1–6; Ausgaben › „HTML-Monitor für ein zweites Gerät“. Aufnahmen `31-monitor.png` … `36-monitor.png`, `65-monitor-html.png`, `63-fueorg-1920.png`.
- **Beobachtung [beobachtet]:** Der Stärke-Monitor öffnet jetzt auch in der Web-Schale; der P3-11 vom 29.10. ist behoben. Er zeigt 1 Ist-Stärke, 2 nächste Mahlzeit, 3 Vorausschau 24 h, 4 Unterbringung, 5 Bereiche und Schichten (Köpfe für die Versorgung) und 6 Funkplan. Ansicht 1 zeigt „14/48/202 = 264“ ohne „+63 erwartet“. Eine Ansicht „Stärke je Abschnitt“ oder „Offene Punkte“ fehlt. Der HTML-Monitor (ein Schalter, kein Knopf) hat eine Tabelle je Einsatzstelle, ist aber eine Datei im Share-Ordner. Zur Besprechung bleibt in der App nur die Führungsorganisation, die am 1920er-Bild gut lesbar ist.
- **Erwartung der Rolle:** Für die Besprechung eine Monitoransicht mit Abschnitten und Stärke wie die Harke, dazu die erwartete Kraft und eine Ansicht „Offene Punkte“.
- **Auswirkung im Einsatz:** Am Beamer zeige ich entweder die große Gesamtzahl oder das Programmfenster mit Reitern und Bedienelementen. Die Besprechung springt zwischen Blättern.
- **Empfehlung:** Die Führungsorganisation als Monitoransicht anbieten, „+N erwartet“ in Ansicht 1 aufnehmen, später „Offene Punkte“ (P1-1) als eigene Ansicht.
- **Verifikation:** Taste 7 (o. ä.) am Monitor zeigt alle Abschnitte mit Fü/UFü/He und Gesamt sowie „+N erwartet“, lesbar aus 4 m bei 1920×1080.

### P2-9 — „⚠ 8 Konflikthinweise“ ist weiterhin nicht zur Stelle zu verfolgen (unverändert)

- **Fundstelle / Aufgabe:** Statuszeile, Diagnose. Aufnahmen `23-konflikte.png`, `24-diagnose.png`.
- **Beobachtung [beobachtet]:** Die Erklärung beim Klick sagt „Betroffene Felder tragen in der Tabelle ein ⚠“. In der Lage habe ich 0 Marken gefunden (`[aria-label=Konflikthinweis]`). Die Diagnose rät „Den Hinweis lesen: Er nennt Feld, Gewinner und verdrängten Wert“, zeigt aber nur „Konflikthinweise: 8“. Das deckt sich mit P2-9 vom 29.10. und P2-3 des Führungs-Audits vom 05.11.
- **Erwartung der Rolle / Auswirkung / Empfehlung / Verifikation:** wie im Führungs-Audit vom 05.11. (P2-3): Liste mit Ort und Werten, Sprung zur Stelle. Für mich als Leiter kommt hinzu: Eine Warnung im Technikstatus, der niemand nachgehen kann, entwertet alle anderen Warnungen dort.

### P3-10 — Kleinigkeiten

- **Profil:** Es gibt kein Profil für die Leitung. „Führungsstelle (S1)“ verbirgt Funkplan und Versorgung unter „Mehr“, also habe ich „Alle Blätter“ gewählt: acht Reiter, passt **[beobachtet]**.
- **Schichtplan:** Die Spaltenköpfe stehen als „2026-09-08“, sonst überall „TT.MM.JJJJ“. Die Datumswahl zeigt „mm/dd/yyyy“, [Annahme] wegen der englischen Browsersprache der Prüfumgebung **[beobachtet]**.
- **Führungsstelle:** „Besetzt · NACHT 1/0/0“ nennt die unbesetzten Posten nicht. Der Leiter muss leere Felder suchen **[beobachtet]**.
- **Zustandsmarke:** „✓ aktuell“ neben „Stand: vor 27 min“ ist richtig gemeint (Verbindung gut, letzte Änderung alt), braucht aber die Kurzanleitung zum Verständnis **[beobachtet]**.

---

## Abgleich mit dem Audit vom 29.10.2026 (thw-command-reviewer)

| 29.10. | Stand 05.11. aus meiner Sicht |
|---|---|
| P0-1 Stärkezelle schreibt Text | Laut Führungs-Audit vom 05.11. behoben; von mir nicht erneut ausgelöst. |
| P1-2 „angefordert, noch nicht da“ zwei Antworten | Teilweise. „+63 erwartet“ ist jetzt klar definiert; offene Anforderungen sind ein eigener Begriff ohne Zähler außerhalb ihres Blatts → P1-1. |
| P1-3 Ablösung fällig nirgends | Teilweise. Marke „Ablösung angefordert/zugesagt“ an der Einheit; „läuft ab“ nur in der Spaltengruppe Ressourcen → P1-1. |
| P1-4 Gesamtstärke mischt | Behoben. Ist-Stärke mit Regel, überall gleich. |
| P1-5 Status/Stärke nur mit Scrollen | Unverändert. Bei 1600 px liegt „Fü/UFü/He“ rechts außerhalb (`50-auswahl.png`), siehe Führungs-Audit 05.11. P1-1. |
| P2-8 Tagebuch nur mit Umweg | Unverändert, kein Zeitfilter → P2-7. |
| P2-9 Konflikthinweise ohne Weg | Unverändert → P2-9. |
| P2-10 „Stand vor 30 min“ grün | Entschärft durch die Zustandsmarke; siehe P3-10. |
| P3-11 Monitor in der Web-Schale | Behoben. |

---

## Was für die Rolle gut gelöst ist

Die Ist-Stärke ist eine Zahl mit einer Regel. Sie steht gleich in Kopfband, Tabellensumme, Führungsorganisation, Druck, Status-Matrix und Monitor, und die Status-Matrix erklärt ihre Zählgrundlage im Kopf. Die Führungsorganisation ist am Beamer die brauchbarste Besprechungsgrundlage. Ablösungen stehen an der Einheit, Anforderungen haben Filter mit Zählern, und „Eingetroffen“ legt die Einheit an. Ein Auftrag an einer Einheit ist mit zwei Klicks erfasst, wird quittiert, ist rücknehmbar und steht in der Einheitenliste. Mit gesetztem Anzeigenamen nennt das Tagebuch, wer was eingetragen hat. Ausgaben tragen den Zeitpunkt im Dateinamen und überschreiben sich nicht. Die Diagnose zeigt oben „Was gerade zutrifft“ in Bedienersprache. Die Versorgung zeigt ihre offenen Punkte als Kopfzahlen; das ist das Muster, das ich mir für alle Sachgebiete wünsche.

---

## Abschluss

- **Aufgabe der Rolle geschafft:** mit Umwegen. Stärke und Lage je Abschnitt: ja. Offene Punkte, Aufträge aus der Lagebesprechung, Übergabe: nur mit Abfrage der Sachgebiete und eigener Liste.
- **Nebenaufzeichnung auf Papier nötig:** ja. Für die Liste offener Punkte über alle Sachgebiete mit Alter, für Aufträge aus der Lagebesprechung mit Zuständigem und Termin und für die Übergabenotiz zum Schichtwechsel.
- **Größte Lücke an einer Übergabe:** Von der Lagebesprechung (Leiter) an die Sachgebiete S1–S6: Eine Entscheidung wird Freitext im Tagebuch, und weder Zuständigkeit noch Termin noch Erledigung lassen sich verfolgen.
- **Größtes Einsatzrisiko:** Nach einem Verlust des Einsatzordners zeigt das wiedergeöffnete Fenster ein vollständig aussehendes, aber eingefrorenes Lagebild, das Eingaben ablehnt und sich auch nach Rückkehr des Ordners nicht erholt.
- **Top-Priorität für die nächste Iteration:** Ein Blatt „Offene Punkte“ je Sachgebiet mit Alter und Sprung zur Stelle, in das auch die Aufträge aus der Lagebesprechung eingehen.
