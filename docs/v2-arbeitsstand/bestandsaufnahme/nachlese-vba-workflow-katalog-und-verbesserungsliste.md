# Nachlese: VBA-Workflow-Katalog und Verbesserungsliste (Einsatzkräfteübersicht V 1.5.2-beta)

Key: nachlese-vba-workflow-katalog-und-verbesserungsliste
Status: IN ARBEIT (Zwischenstand, wird abschnittsweise fortgeschrieben; §2 W01–W07 fertig)

Beantwortete Lücke (Vollständigkeitskritik §5 Nr. 1): Liefergegenstände (a) Workflow-Katalog und (c) Liste der in einer App anders zu lösenden Verfahren des Auftrags "excel-vba-workflows", die dort nach §11.7 fehlten.

## Gliederung
1. Vorgehen, Quellen, Zitierkonvention
2. Workflow-Katalog (W01–W22; je Workflow: Name, Auslöser, Schritte, Regeln, betroffene Daten, Nebenwirkungen/Defekte)
   2.x Querschnittsmatrix der Nebenwirkungen
3. Verbesserungsliste: Verfahren, die in v2 anders gelöst werden müssen (V01–V24, mit Codebegründung, Einsatzfolge, Anforderung an v2, Ist-Stand S1-Control v1)
4. Offene Fragen
5. Kurzfassung der Kernfakten

---

## 1. Vorgehen, Quellen, Zitierkonvention

- Primärquelle: `scratchpad/excel/vba_full.txt` (olevba-Export, 7.873 Zeilen, 40 Module). Zitiert als `vba:NNNN`. Alle Zeilenangaben wurden in diesem Lauf gegen den Export nachgelesen (nicht aus dem Vorgängerbericht übernommen).
- Blattdaten: `scratchpad/excel/sheet_<Blatt>.tsv` (zitiert als `Blatt!Zelle`), `defined_names.txt` (benannte Bereiche).
- Vorarbeit (nicht wiederholt, nur referenziert): `analysis/excel-vba-workflows.md` §1–§9 und §11 (Modulübersicht, Menü/Shortcuts, Zeilenoperationen, Maske, Speichern, HTML-Export, EEB, digitaler EEB inkl. Bit-Spezifikation, Auswertung/Testmodul); `analysis/excel-handbuch-anforderungen.md` (F-A1…F-L2, Rollen, Meldekopf); `analysis/s1-renderer-features.md` und `analysis/s1-main-architektur.md` (Ist-Stand S1-Control v1, für den Spaltenblock "v1-Ist" in §3); `analysis/nas-speicher-recherche.md` §10 (Speichermodell-Empfehlung).
- Was hier neu ist: (1) je Workflow die vollständige Schrittfolge mit *allen* Nebenwirkungen (Blattschutz, Kopiervorlagen-Reset, Schicht-Leerung, Zustandszellen, Timer), (2) die fachliche Erklärung einzelner Nebenwirkungen aus den Formeln (z.B. warum `Schicht_Angefordert` geleert wird), (3) drei bisher nicht dokumentierte Code-Befunde (Auswertungs-Bereinigung prüft Spalte AI statt AM; Leser der "Aktuell"-Datei blockieren das Autospeichern des Schreibers mit modalem Dialog; `ufr_bitteWarten` kann bei Laufzeitfehlern nicht mehr geschlossen werden), (4) die konsolidierte Verbesserungsliste mit Bezug auf den v1-Ist-Stand.
- Kennzeichnung: Aussagen über Excel-Laufzeitverhalten, die nicht im Code stehen und nicht in Excel getestet wurden, sind mit [unbelegt] bzw. [aus Code abgeleitet, nicht getestet] markiert.
- Web-Recherche war für diesen Auftrag nicht nötig (reine Codeanalyse).

Rahmenfakten, die in mehreren Workflows gebraucht werden:
- Anwendungszustand liegt in versteckten Zellen `Startseite!IV1..IV11` (m_util vba:3748–3758; Blatt `Startseite` ist `veryHidden`, sheet_Startseite.tsv Kopfzeile). Werte im ausgelieferten Original: IV1 Passwort = `123`, IV5 Erstgespeichert = False, IV6 Autospeichern = False, IV7 = 10, IV8 = False, IV9 = False, IV10 = 1, IV11 leer (sheet_Startseite.tsv).
- Jeder Schreibzugriff auf eine Zustandszelle entsperrt und schützt das Blatt Startseite (`startseiteEntsperren/-Sperren`, vba:4040–4052) – auch die reinen Laufzeit-Flags IV8 ("HTML-Export läuft") und IV2 ("letzte Passworteingabe").
- Sieben Blätter werden in `Workbook_Open` mit dem Passwort geschützt (vba:321–328); jede Makro-Operation folgt dem Muster `Unprotect(getPasswort) … Protect(getPasswort)`.
- Bearbeitbarkeit einer Zeile wird über `hatGesperrteZeilen` entschieden (vba:4312–4333): Zeile ≤ 22 → gesperrt; sonst gesperrt, wenn Zelle in Spalte D das Locked-Flag trägt (`INDIKATOR_ZEILENSPERRUNG_SPALTE = "D"`, vba:4308).
- Menü `ufr_menue` wird nie entladen, nur versteckt (`ufr_menue.Hide`, z.B. vba:4068, 4164); erst `Workbook_BeforeClose` entlädt es (vba:349–351).
- Dateigröße des Originals: 1.080.958 Byte (`ls -la` auf die .xlsm) – relevant für die Abschätzung der Verlaufskopien in W13/W14.

---

## 2. Workflow-Katalog

Aufbau je Workflow: **Auslöser** (UI-Element/Tastenkombination/Ereignis) · **Schritte** (Code-Reihenfolge) · **Regeln** (Prüfungen, Abbrüche) · **Betroffene Daten** (Zellen/Bereiche/Dateien) · **Nebenwirkungen und Defekte** · **Bezug** (Handbuch-ID aus excel-handbuch-anforderungen.md, Verbesserungspunkt in §3).

### W01 Einsatz beginnen (Datei öffnen, Stammdaten)
- **Auslöser:** Öffnen der .xlsm → `Workbook_Open` (vba:294–336). Kein eigener "Neuer Einsatz"-Befehl; der Anwender kopiert die Vorlage bzw. öffnet eine vorhandene Verlaufsdatei. Das Zurücksetzen auf einen leeren Einsatz existiert nur als Admin-Funktion (W20).
- **Schritte:**
  1. Fenster maximieren, Blatt `Neu` veryHidden, `Startseite` kurz sichtbar; modale MsgBox mit Nutzungsbedingungen ("Freigabe nur zur Nutzung im Technischen Hilfswerk … Weitergabe nur mit Erlaubnis der FK THW OV Oldenburg (Ni)", vba:299–304).
  2. `Startseite`, `Neu`, `AküLi` → veryHidden (vba:308–310).
  3. Zustandsfelder zurücksetzen: Erstgespeichert=False, Autospeichern=False/10 min, letzte Passworteingabe="", Auto-HTML-Export=False/1 min, HTML-Export-läuft=False (vba:312–318).
  4. Blattschutz auf Stärke, Druck, Status, Log, FüSt, Stammdaten, Hinweise (vba:321–328; Startseite-Schutz ist auskommentiert, vba:320/329).
  5. Blatt `Stammdaten` aktivieren, MsgBox "Zunächst bitte Einsatz- oder Übungs-Name und Name der FüSt eintragen … wichtig für das korrekte spätere Abspeichern" (vba:333–336).
  6. Anwender trägt Stammdaten!C4 (Name Einsatz/Übung), C5 (Name FüSt), C6 (übergeordnete FüSt) ein (sheet_Stammdaten.tsv B4:C6). Stärke!G1 `=Stammdaten!$C$4`, Stärke!B1 `="Kräfteübersicht: "&Stammdaten!C5` (sheet_Stärke.tsv).
- **Regeln:** Keine Pflichtfeldprüfung. Der Einsatzname fließt ungeprüft in Dateinamen (W13) und HTML-Dateinamen (W15); Sonderzeichen wie `/` oder `:` würden `SaveAs` scheitern lassen [aus Code abgeleitet, nicht getestet]. Der Reset-Text "Name_Einsatz_Übung" (vba:2978) bleibt stehen, wenn der Anwender nichts einträgt, und wird dann Bestandteil aller Dateinamen.
- **Betroffene Daten:** Stammdaten!C4:C6; Startseite!IV2, IV5–IV10; Schutzzustand von 7 Blättern.
- **Nebenwirkungen/Defekte:** (a) Zwei modale Dialoge bei jedem Öffnen, auch beim Öffnen einer Verlaufskopie zum Nachschauen. (b) Weil IV5 immer False gesetzt wird, ist der erste Speichervorgang jeder Sitzung ein SaveAs-Dialog (W13), auch wenn die Datei bereits an der richtigen Stelle liegt. (c) Der gespeicherte Autospeichern-Zustand einer Vorsitzung geht verloren – nach Absturz/Neustart läuft kein Autospeichern, bis es jemand wieder einschaltet. (d) `Application.ScreenUpdating=False` wird zwischen Schritt 2 und 4 gesetzt und danach wieder True (vba:305, 331) – nur Kosmetik.
- **Bezug:** F-A1…F-A3; §3 V13 (Zustand in Zellen), V15 (Sitzungsbeginn).

### W02 Einheit erfassen/bearbeiten über die Dateneingabe-Maske (Strg+A auf Stärke)
- **Auslöser:** Strg+A (`Tastenkombination_Strg_A`, vba:2330–2348, `VB_Invoke_Func = "a\n14"`); auf `t_staerke` → `ufr_datenEingabeOeffnen` (vba:3152–3194). Kein Menüeintrag, kein Button; Hinweise!C19–C20 empfehlen die Maske für Langtexte.
- **Schritte:**
  1. Form laden; `aktuelleZeile/aktuelleSpalte` = aktive Zelle merken (Modulvariablen in m_makroFunktionen, vba:2320–2321); `ActiveCell.EntireRow.Select` (vba:3156).
  2. 36 Felder aus der Zeile lesen (Spalten 3–23, 26–39; vba:3158–3193), darunter `txt_gesamt` aus AM (nur Anzeige).
  3. Dropdowns aus Konstanten gefüllt (`ERLAUBTE_ORGANISATIONEN/STATUSE/SCHICHTEN`, vba:3091–3093; `ufr_datenEingabe_initialisiieren` vba:3125–3150).
  4. Live-Validierung: Organisation/Status/Schicht beim Verlassen des Felds gegen die Liste, ungültig → MsgBox "Wähle eine gültige Option aus." und Feld leeren (vba:3196–3257); Fü/UFü/He → Gesamt neu rechnen, nicht-numerisch → 0 (vba:3264–3295); Log-Daten nicht-numerisch → 0 (vba:3297–3330).
  5. Klick/Fokus in `txt_idEEB` → Dateiauswahl (W11), danach Fokus auf `txt_zug` (vba:3259–3262; Form-Events vba:4688–4694).
  6. OK: `On Error Resume Next`, ursprüngliche Zelle selektieren, 35 Felder zurückschreiben (Spalten 3–23, 26–38; vba:3332–3372), Form entladen. Abbruch: nur Zelle selektieren, entladen (vba:3374–3378).
- **Regeln:** Keine Prüfung, ob die Zeile eine Datenzeile ist – die Maske öffnet sich auch auf Überschrifts-, FüSt- (7–16), Meldekopf- (17–22) und Kopiervorlagen-Zeilen (24–71, 74–122). Keine Pflichtfelder, keine Datumsprüfung (M, N, P, T, U, V sind Freitext-TextBoxen), kein Duplikat-Check, kein Undo.
- **Betroffene Daten:** Stärke!C:W, Z:AB, AC:AL der aktiven Zeile. Nicht geschrieben: B (FüSt), X/Y (Reserve), AM (Formel), AN:AW (Kosten), AO (Anz. pro Tag).
- **Nebenwirkungen/Defekte:** (a) Durch `On Error Resume Next` (vba:3333) scheitern Schreibzugriffe auf gesperrte Zellen **stumm** – der Anwender sieht "OK", die Zelle bleibt alt; betrifft z.B. Spalte D in Überschriftszeilen und generell alle Zeilen, wenn das Blatt geschützt und die Zelle Locked ist. (b) Der Status-Wortlaut der Maske ("Rufbereitschaft", "Einsatzvorbehalt") weicht von Status!B25:B26 ("Ruf Bereitsch.", "Einsatzvorbeh.") und den Testdaten (vba:2860ff., laut Vorgängerbericht §9.5) ab – Auswertungen per SUMIF auf den Statuswert würden solche Zeilen nicht mitzählen [Formelauswirkung nicht einzeln geprüft, siehe §4]. (c) Zahlenfelder werden als Strings zugewiesen; Excel wandelt beim Setzen von `.Value` numerische und datumsähnliche Zeichenketten in Zahlen/Datum um [unbelegt, Standardverhalten von Excel, nicht getestet]. (d) Das Blatt wird für die Maske **nicht** entsperrt – Schreiben funktioniert nur, weil Datenzellen Unlocked sind; d.h. die Maske ist auf die Locked-Konfiguration angewiesen (V04).
- **Bezug:** F-C1, F-C4, F-C5; §3 V04, V10, V11.

### W03 Zelltext bearbeiten (Strg+A außerhalb Stärke), Zeitstempel (Strg+D), AküLi (Strg+H)
- **Auslöser/Schritte:**
  - Strg+A auf anderen Blättern → `ufr_textEingabeOeffnen` (vba:3097–3101): TextBox = `ActiveCell.Value`; OK schreibt zurück mit `On Error Resume Next` (vba:3103–3107). Gesperrt für `t_druck|t_hinweise|t_log|t_startseite|t_status` (Konstante vba:2325, Beep vba:2338). Zweck: mehrzeilige Texte (z.B. FüSt-Schichtplanung, Hinweise!C112).
  - Strg+D → `schreibeDatum`: `ActiveCell.Value = Now` (vba:2351–2354), auf jedem Blatt, ohne Fehlerbehandlung.
  - Strg+H → `AküLi_anzeigen`: `ufr_akueli.Show` (vba:2518–2520).
- **Regeln:** keine.
- **Betroffene Daten:** aktive Zelle.
- **Nebenwirkungen/Defekte:** (a) Strg+D auf geschützter Zelle löst einen **unbehandelten Laufzeitfehler 1004** aus (kein `On Error`), d.h. Excel zeigt den VBA-Fehlerdialog mit "Debuggen" [aus Code abgeleitet; ob der VBA-Projektschutz das Debuggen verhindert, ist aus dem Export nicht ersichtlich]. (b) Strg+A schreibt mit `Resume Next` stumm nicht (wie W02a). (c) Strg+A überschreibt die Excel-Standardbelegung "Alles markieren" in der gesamten Excel-Instanz, solange die Mappe geöffnet ist – ebenso Strg+D (Ausfüllen unten), Strg+N (Neu), Strg+E, Strg+K (Hyperlink), Strg+M, Strg+Q, Strg+H (Ersetzen) (Attribute `VB_Invoke_Func`, vba:2331, 2352, 2395, 2423, 2433, 2443, 2453, 2463, 2519).
- **Bezug:** F-C4, F-C6; §3 V11, V20.

### W04 Zeile(n) einfügen (Leerzeilen in einem Bereich)
- **Auslöser:** Menü "Zeilen einfügen" (ufr_menue.CommandButton7 → vba:3536–3538), Strg+N (vba:2422–2430, nur t_staerke), Stärke-Button CommandButton1 (vba:37–39) → `verarbeiteZlEinfuegenAnfrage` (vba:4067–4075).
- **Schritte:**
  1. Menü verstecken; erste markierte Zeile vollständig markieren (`markiereZeilenVollstaendig(Selection.Rows(1))`, vba:4070); `ufr_zlEinfuegen` **modeless** anzeigen (vba:4074) mit SpinButton/TextBox für die Anzahl (Validierung gegen Min/Max des SpinButtons, vba:4125–4160).
  2. OK (`verarbeiteAnzahlZlEinfuegenEingestellt`, vba:4077–4093): Form nur verstecken (Anzahl bleibt erhalten, vba:4079); **Selection erneut** auf ganze Zeile erweitern; gesperrt → MsgBox "Einfügen von gesperrten Zeilen nicht möglich" (vba:4085); sonst MsgBox "Wirklich einfügen?" (vba:4088).
  3. Ausführung (`verarbeiteZlEinfuegenBestaetigt`, vba:4095–4123): Anzahl aus SpinButton, 0 → Abbruch; `eingefügteZeilen = Selection.Resize(anzahl, …)` vor dem Einfügen berechnet; Blatt entsperren; `anzahl`-mal `zielzeile.Copy` + `zielzeile.Insert(Shift:=xlDown)` (vba:4106–4109); `eingefügteZeilen.Offset(-(anzahl-1))` → `setzeStaerkenZurueck` (vba:4112–4113); Blatt schützen; Cursor auf `B(ersteEingefügteZeile-1)`; Form entladen.
  4. `setzeStaerkenZurueck` (vba:4360–4398) je Zeile: AB ClearContents; Z..B ClearContents; AC:AD, AE:AF, AG:AH, AI, AJ:AK, AL = 0; B..AA ClearContents; AO = 0; AA = "". **Danach global** `Range("Schicht_Angefordert").Value = ""` (vba:4391) = Stärke!AA139:AA160 (defined_names.txt).
- **Regeln:** nur erste markierte Zeile zählt; Zeile ≤ 22 oder D Locked → verboten. Neue Zeilen sind **Klone der Kontextzeile** (Format, Formeln AM/AN:AW, Datenvalidierung, Locked-Flags, bedingte Formate werden mitkopiert); es gibt keine Leerzeilen-Vorlage. Netto-Layout laut Kommentar vba:4058–4061: Datenzeile bleibt oben, darunter n leere Zeilen.
- **Betroffene Daten:** Zeilen unterhalb der markierten Zeile; alle benannten Bereiche, die die Einfügestelle umschließen, wachsen mit (Excel-Standard); Stärke!AA139:AA160 (Schicht Angefordert) wird geleert.
- **Nebenwirkungen/Defekte:** (a) **Schicht der angeforderten Einheiten wird bei jedem Einfügen an beliebiger Stelle gelöscht** (vba:4391) – s. V03 für die fachliche Herleitung (Plausibilitätsformel Status!G43). (b) Zwischen Schritt 1 und 2 kann der Anwender die Markierung ändern (modeless); die Operation wirkt auf die Markierung zum OK-Zeitpunkt, ohne Vorschau. (c) `Range(...)` in `setzeStaerkenZurueck` ist unqualifiziert (ActiveSheet) – korrekt nur, weil alle Einstiege auf t_staerke beschränkt sind. (d) Kein Undo (Excel-Undo-Stack ist nach Makrolauf leer [unbelegt, Excel-Standardverhalten]; Hinweise!C70–C72 "Vorgänge können nicht rückgängig gemacht werden"). (e) Ob `ClearContents` auf AB einen vorhandenen Hyperlink entfernt, ist aus dem Code nicht ableitbar (§4).
- **Bezug:** F-C7; Hinweise!C83; §3 V01, V03, V05.

### W05 Zeile(n) entfernen
- **Auslöser:** Menü CommandButton2 (vba:3540–3542), Strg+E (vba:2432–2440), Stärke-Button CommandButton2 (vba:41–43) → `verarbeiteZlEntfernenAnfrage` (vba:4163–4171).
- **Schritte:** Menü verstecken; **alle** markierten Zeilen (auch nicht zusammenhängend, `Areas` via `Union`, vba:4341–4358) vollständig markieren; `ufr_zlEntfernen` modeless. OK (vba:4173–4188): Form entladen, Selection erneut erweitern, gesperrt → "Löschen von gesperrten Zeilen nicht möglich", sonst "Zeilen wirklich entfernen?" → `verarbeiteZlEntfernenBestaetigt` (vba:4190–4200): entsperren, `Selection.Rows.Delete`, Cursor `B(ersteZeile-1)`, schützen.
- **Regeln:** wie W04 (Zeile ≤ 22 oder D Locked). Keine Untergrenze: der letzte Datenzeile eines Bereichs kann gelöscht werden; ein benannter Bereich, dessen alle Zeilen gelöscht werden, wird zu `#BEZUG!` [unbelegt, Excel-Standardverhalten] – die Formeln (z.B. Stärke!AM5, Log!D7 `SUMIFS(Summe_FüSt, …)`) und alle Makros, die `Range("Bereich_…")` ansprechen (vba:749–757, 861–946, 487–540), würden dann scheitern.
- **Betroffene Daten:** physische Zeilenlöschung; nachrückende Zeilen; benannte Bereiche schrumpfen.
- **Nebenwirkungen/Defekte:** (a) **Kein Undo, keine Sicherung, kein Protokoll** der gelöschten Inhalte (einzige Rückfallebene: Verlaufskopien aus W13). (b) Modeless-Fenster wie W04b. (c) Hyperlinks der gelöschten Zeile gehen mit verloren, die EEB-Datei bleibt verwaist.
- **Bezug:** F-C7; Hinweise!C84; §3 V01, V02.

### W06 Zeile(n) kopieren – einschließlich "Kopiervorlage nutzen"
- **Auslöser:** Menü CommandButton9 (vba:3548–3550), Strg+K (vba:2442–2450) → `verarbeiteZlKopierenAnfrage` (vba:4214–4234). Kein Stärke-Button.
- **Schritte:**
  1. Menü verstecken; **Kopiervorlagen-Reset** (vba:4216–4226): `Stärke_Kopiervorlagen_THW`/`_KatS_StAN_NDS` = 0, `Logistikdaten_Kopiervorlagen_*` = 0, `Status_Kopiervorlagen_*` = "", `Schicht_Kopiervorlagen_*` = "" (Blatt kurz entsperrt).
  2. Alle markierten Zeilen vollständig markieren; `ufr_zlKopieren` modeless.
  3. OK Quelle (vba:4236–4250): Form entladen, Selection erweitern, gesperrt → "Kopieren von gesperrten Zeilen nicht möglich"; `quellBereich = Selection` (Modulvariable); `ufr_zlKopierenZiel` modeless.
  4. OK Ziel (vba:4252–4299): erste markierte Zeile; gesperrt → Abbruch; Ziel Teil der Quelle **und** nicht erste Quellzeile → Abbruch (vba:4265: "erste Zeile der Quelle darf Zielzeile sein"); "Wirklich kopieren?"; entsperren; je `Area`: `Copy` + `zielzeile.Insert(Shift:=xlDown)` (vba:4278–4282); schützen; Cursor auf AA (Schicht) der Zielzeile; MsgBox "Schichtangaben und Status kontrollieren" (vba:4291–4292). Fehlerpfad: "Fehler beim kopieren! Daten überprüfen und evtl. Backup verwenden." (vba:4295), kein Rollback.
- **Regeln:** Kopien landen **oberhalb** der Zielzeile, Quelle bleibt erhalten (Kommentar vba:4209–4211). Kopiervorlagen: Bereich_Kopiervorlagen_THW = Stärke!B24:AB71 (Kopf B23 "Kopiervorlagen THW StAN (aus diesem Bereich nur kopieren)"), Bereich_Kopiervorlagen_KatS_StAN_NDS = B74:AB122 (Kopf B73); Beispiel Zeile 25: C "OV-Stab", D "THW", H "OV-Stab", J "MTW OV", AJ:AL = 0 (sheet_Stärke.tsv). Der Reset in Schritt 1 (und beim Menüöffnen, W18/vba:21–29, sowie beim Verschieben vba:4429–4439) stellt sicher, dass Vorlagen ohne Stärke/Status/Schicht kopiert werden (Hinweise!C157).
- **Betroffene Daten:** Zielbereich (Einfügung), Kopiervorlagen-Bereiche (Reset), Cursor.
- **Nebenwirkungen/Defekte:** (a) **Kopierte Datenzeilen behalten Stärke, Status, Schicht, ID-EEB samt Hyperlink** – bis zur manuellen Korrektur zählt die Einheit doppelt in AM5, Druck, Status, Log (V02). Die Erinnerung ist nur eine MsgBox. (b) Die Ausnahme "erste Quellzeile darf Ziel sein" erzeugt ein Duplikat direkt über sich selbst – bequem für "gleiche Einheit noch einmal", aber ohne Kennzeichnung. (c) Der Kopiervorlagen-Reset ist eine **Schreiboperation als Nebenwirkung eines Menüöffnens/Kopierstarts**: wer eine Vorlage bewusst mit Stärke gepflegt hat, verliert sie beim nächsten Menüaufruf; die Mappe wird "dirty". (d) Es ist möglich, aus einem Kopiervorlagen-Bereich zu **verschieben** (W07) oder dort zu **löschen** (W05), da die Zeilen > 22 liegen und D vermutlich Unlocked ist – die Vorlage wird dann zerstört (Handbuch-Bericht §… "verschieben statt kopieren zerstört Vorlagen"; Locked-Status von D in Zeile 24–122 aus dem TSV nicht ersichtlich, §4). (e) `zielZeilenNummer` (vba:4281) wird berechnet, aber nie verwendet.
- **Bezug:** F-J1, F-J2; Hinweise!C86–C87, C155–C157; §3 V02, V06, V07.

### W07 Zeile(n) verschieben – Umgliederung, Abschnittswechsel, "Einsatz beendet"
- **Auslöser:** Menü CommandButton3 (vba:3544–3546), Strg+M (vba:2452–2460), Stärke-Button CommandButton5 (vba:53–55) → `verarbeiteZlVerschiebenAngefragt` (vba:4425–4445).
- **Fachliche Bedeutung:** Die Excel kennt keinen Abschnitts-Datentyp; die Zugehörigkeit einer Einheit zu FüSt/Logistik/Angefordert/Bereitstellung 1–2/Einsatzort 1–21/"Einsatz beendet" ergibt sich allein aus der Zeilenposition zwischen Überschriftszeilen (Bereich_* in defined_names.txt; Stärke!B431 "Kopier Bereich für 'Einsatz beendet'; Bei Einsatzende Einheiten zwecks Dokumentation hierher 'verschieben'"; Hinweise!C105, C125–C126). Verschieben ist damit der einzige Weg für: Anmarsch → Bereitstellungsraum → Einsatzort, Umgliederung bei FüOrg-Wechsel, Archivierung nach Einsatzende.
- **Schritte:** wie W06 Schritte 1–3 (inkl. Kopiervorlagen-Reset vba:4429–4439; Formulare `ufr_zlVerschieben`/`ufr_zlVerschiebenZiel`), dann OK Ziel (vba:4463–4514): Ziel gesperrt → Abbruch; Ziel Teil der Quelle → Abbruch **ohne Ausnahme** (vba:4477–4480); "Wirklich verschieben?"; entsperren; je Area `Copy` + `zielzeile.Insert` (vba:4489–4493); `quellBereich.Delete` (vba:4494); **`Range("Schicht_Angefordert").Value = ""`** (vba:4497); schützen; Cursor AA der Zielzeile; MsgBox "Schichtangaben und Status kontrollieren" (vba:4502); Fehlerpfad "evtl. Backup verwenden" (vba:4505).
- **Regeln:** Einfügen oberhalb der Zielzeile (Hinweise!C85 sagt "nach der angewählten Zielzeile" – Widerspruch zum Code-Kommentar vba:4420 "vor der markierten Zeile"; §4). Mehrere nicht zusammenhängende Quellbereiche erlaubt.
- **Betroffene Daten:** Quell- und Zielbereich, Stärke!AA139:AA160, Kopiervorlagen (Reset).
- **Nebenwirkungen/Defekte:** (a) **Alle Schichtangaben im Bereich Angefordert werden gelöscht**, unabhängig davon, ob die Verschiebung diesen Bereich berührt (V03). (b) Keine Historie: wann eine Einheit von wo nach wo verschoben wurde, ist nach der Operation nicht mehr feststellbar (nur über Verlaufskopien, W13). (c) Status (Z) wird **nicht** angepasst – eine Einheit kann im Bereich "Einsatzort 3" mit Status "Anmarsch" stehen; die MsgBox erinnert nur. (d) Copy+Insert+Delete ist nicht transaktional: bricht der Lauf zwischen Insert und Delete ab (`On Error GoTo Kopierfehler` vba:4486), existiert die Einheit doppelt; der Fehlertext empfiehlt das Backup. (e) Der Zielbereich-Kommentar-Text und die Handbuchbeschreibung widersprechen sich in der Einfügeposition.
- **Bezug:** F-B5, F-F5; Hinweise!C85, C105, C125–C126; §3 V01, V03, V08.
