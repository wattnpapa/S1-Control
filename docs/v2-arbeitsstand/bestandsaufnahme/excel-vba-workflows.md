# Analyse: VBA-Workflows der Excel-Arbeitsmappe "Einsatzkräfteübersicht V 1.5.2-beta"

Key: excel-vba-workflows
Status: IN ARBEIT (Zwischenstand wird nach jedem Teilthema fortgeschrieben)

## Gliederung
1. Modulübersicht
2. Menü und Tastenkombinationen
3. Zeilenoperationen
4. Dateneingabe-Maske
5. Speichern
6. HTML-Export (Lage-Monitor)
7. EEB-Verlinkung
8. Digitaler EEB (Binärformat-Spezifikation)
9. Auswertung / LogFrei / Bereiche verbergen / Workbook-Events / Testmodul
10. (a) Workflow-Katalog
11. (b) Spezifikation digitaler EEB
12. (c) Verfahren, die in einer echten App anders gelöst werden sollten
13. Offene Fragen

---

## 1. Modulübersicht (vba_full.txt, olevba-Export, 7873 Zeilen)

Quelle: `scratchpad/excel/vba_full.txt`. Zeilenangaben unten beziehen sich auf diese Datei ("vba:NNNN").

| Modul | Typ | Zeilen (vba_full.txt) | Zweck |
|---|---|---|---|
| t_staerke | Blattmodul (Stärke) | 7–188 | Button-Handler des Hauptblatts: Menü, EEB aktualisieren, Zl einfügen/entfernen/verschieben, Speichern, ~30 Bereich-verbergen-Buttons |
| t_druck | Blattmodul (Druck) | 190–224 | Zoom-Toggle 55/100 %, Worksheet_Activate blendet Zeilen 6–34 mit leerer Gesamtstärke (K6:K34) aus |
| t_status, t_fueOrg, t_hinweise, t_stammdaten, t_startseite, t_neu, t_akueli | Blattmodule | 226–408 | leer |
| t_fueSt | Blattmodul (FüSt) | 241–273 | Buttons: Bereiche Stab/ZTrFK/FGrF/FGrK/Externe verbergen, Schicht-Spalte ein/aus |
| t_auswertung | Blattmodul | 280–287 | Button: Auswertung-Ressourcen verbergen |
| DieseArbeitsmappe | Workbook | 289–354 | Workbook_Open (Nutzungsbedingungen, Init, Blattschutz), Workbook_BeforeClose (Timer aus) |
| t_logFrei, t_log | Blattmodule | 366–402 | Worksheet_Activate: Zeilen 7–34 mit Stärke 0 (H7:H34) ausblenden |
| m_auswertungsdatenKopieren | Standardmodul | 409–601 | Stärke → Auswertung, Log → LogFrei kopieren |
| m_bereicheVerbergen | Standardmodul | 603–852 | Ein-/Ausblenden benannter Bereiche (Zeilen/Spalten) |
| m_bereicheVerbergenCheckboxen | Standardmodul | 854–982 | Userform "Bereiche verbergen" mit Checkboxen |
| m_digitalerEEB | Standardmodul | 984–1094 | Digitaler EEB → Zeile schreiben |
| m_digitalerEEBParsing | Standardmodul | 1096–1927 | Binär-Decoder des digitalen EEB (Base64url, Inflate, Varint, Vokabular) |
| m_eeb | Standardmodul | 1929–2192 | EEB-Ordner, Hyperlinks auf EEB-Dateien |
| m_htmlExport | Standardmodul | 2194–2313 | HTML-Export der Übersichtsblätter (Lage-Monitor) |
| m_makroFunktionen | Standardmodul | 2315–2521 | Tastenkombinationen (Strg+…), digitaler EEB in neue Zeile |
| m_speichern | Standardmodul | 2523–2757 | Speichern, Autospeichern, Auto-HTML-Export, Admin-Passwort |
| m_testmodul | Standardmodul | 2759–3084 | Testdaten füllen/zurücksetzen (Admin) |
| m_userformFunktionen | Standardmodul | 3086–3737 | Logik aller Userforms (Dateneingabe, Menü, Passwort, …) |
| m_util | Standardmodul | 3739–4053 | Persistente Zustandsfelder in Startseite!IV1..IV11, Pfad-Helfer, UTF-8-Konvertierung |
| m_zlEinfuegenEntfernen | Standardmodul | 4055–4201 | Zeilen einfügen/entfernen |
| m_zlKopieren | Standardmodul | 4203–4300 | Zeilen kopieren |
| m_zlOperationen | Standardmodul | 4302–4412 | Gemeinsame Regeln (gesperrte Zeilen, Bereichsgrenzen) |
| m_zlVerschieben | Standardmodul | 4414–4515 | Zeilen verschieben |
| ufr_adminMenue, ufr_akueli, ufr_autoSpeichern, ufr_bereicheVerbergen, ufr_bitteWarten, ufr_datenEingabe, ufr_digitalerEEBEingabe, ufr_eebEinstellungen, ufr_erweitertesSpeichern, ufr_menue, ufr_neuesPasswort, ufr_textEingabe, ufr_zlEinfuegen, ufr_zlEntfernen, ufr_zlKopieren, ufr_zlKopierenZiel, ufr_zlVerschieben, ufr_zlVerschiebenZiel | Userforms (18) | 4517–5150 | Reine Event-Weiterleitung an m_userformFunktionen; jede Form zentriert sich in UserForm_Activate |

Architekturmuster: Die Userforms enthalten keine Logik, sondern delegieren an `m_userformFunktionen`. Der gesamte Anwendungszustand (Passwort, Autospeichern-Flags, Export-Flags, EEB-Ordner) liegt in **versteckten Zellen** `Startseite!IV1..IV11` (m_util, vba:3748–3758) und wird damit mit der Datei gespeichert.

### Zustandsfelder (m_util, vba:3748–3758)
| Zelle | Bedeutung | Init in Workbook_Open (vba:312–319) |
|---|---|---|
| Startseite!IV1 | Blattschutz-Passwort (Klartext in Zelle) | – (bleibt) |
| Startseite!IV2 | zuletzt eingegebenes Passwort ("Admin-Freischaltung") | "" |
| Startseite!IV5 | Erstgespeichert (Boolean) | False |
| Startseite!IV6 | Autospeichern aktiv | False |
| Startseite!IV7 | Autospeichern-Intervall (Minuten) | 10 |
| Startseite!IV8 | HTML-Export läuft gerade | False |
| Startseite!IV9 | Auto-HTML-Export aktiv | False |
| Startseite!IV10 | Auto-HTML-Export-Intervall (Minuten) | 1 |
| Startseite!IV11 | Ordnerpfad Einheitenerfassungsbögen | – |

`Stärke!E3` zeigt `=IF(Startseite!IV6=TRUE,"Auto Speichern aktiv","")` (sheet_Stärke.tsv E3).

## 2. Menü und Tastenkombinationen

### 2.1 Hauptmenü ufr_menue (vba:4856–4931 → m_userformFunktionen vba:3547–3622)
Geöffnet über Button `btn_menue` auf Blatt Stärke (t_staerke vba:12–31) oder Strg+Shift+M (vba:2387–2409). Modeless. **Nebeneffekt beim Öffnen**: Kopiervorlagen-Bereiche werden zurückgesetzt (Stärke/Logistikdaten = 0, Status/Schicht = "") für THW und KatS_StAN_NDS (vba:21–29) – Begründung im Kommentar: "Menue oeffnen kann hierfuer genutzt werden, da es regelmaessig aufgerufen wird".

| Button (Caption laut Kommentar) | Handler | Fachliche Funktion |
|---|---|---|
| Zeilen einfügen (CommandButton7) | m_zlEinfuegenEntfernen.verarbeiteZlEinfuegenAnfrage | s. Abschnitt 3 |
| Zeilen entfernen (CommandButton2) | verarbeiteZlEntfernenAnfrage | s. 3 |
| Zeilen verschieben (CommandButton3) | m_zlVerschieben.verarbeiteZlVerschiebenAngefragt | s. 3 |
| Zeilen kopieren (CommandButton9) | m_zlKopieren.verarbeiteZlKopierenAnfrage | s. 3 |
| Speichern (CommandButton4) | m_speichern.verarbeiteSpeichernAnfrage | s. 5 |
| erw. Speichern / "Autospeichern_Ein" | m_speichern.verarbeiteErweitertesSpeichernAnfrage | Autospeichern + Auto-HTML-Export konfigurieren; Button-Farbe: grau = nichts aktiv, gelb = eines aktiv, grün = beides aktiv (vba:3555–3568) |
| Ressourcenplanung ein/aus (CommandButton5) | m_bereicheVerbergen.verbergeStaerkeRessourcen | Spaltenblock ein/aus |
| Log-Daten ein/aus (CommandButton12) | verbergeStaerkeLogDaten | Spaltenblock ein/aus |
| Kostenübersicht ein/aus (CommandButton6) | verbergeStaerkeKostenuebersicht | Spaltenblock ein/aus |
| Bereiche verbergen (CommandButton8) | m_bereicheVerbergenCheckboxen.oeffneUfrBereicheVerbergen | Checkbox-Dialog, welche Abschnitte sichtbar |
| Auswertung aktualisieren (CommandButton10) | m_auswertungsdatenKopieren.kopiereStaerkeInAuswertung | Kopie Stärke → Auswertung |
| LogFrei aktualisieren (CommandButton11) | kopiereLogInLogFrei | Kopie Log → LogFrei |
| EEB-Einstellungen (cmd_eeb_einstellungen) | m_eeb.verarbeiteEEBAnfrage | EEB-Ordner festlegen |
| Abbrechen (btn_abbrechen_versteckt) | ufr_menue.Hide | Menü nur verstecken, nicht entladen |

### 2.2 Tastenkombinationen (m_makroFunktionen, Attribute VB_Invoke_Func)
| Kombination | Prozedur (vba) | Wirkung | Blattbeschränkung |
|---|---|---|---|
| Strg+A | Tastenkombination_Strg_A (2329–2348) | Auf Stärke: ufr_datenEingabe (Zeilenmaske); sonst ufr_textEingabe (Zelltext) | Verboten auf t_druck, t_hinweise, t_log, t_startseite, t_status (Konstante vba:2325) → Beep |
| Strg+D | schreibeDatum (2350–2354) | `ActiveCell.Value = Now` (Datum/Zeit-Stempel) | keine |
| Strg+Shift+P | oeffneUfrAdminMenue (2356–2360) | Admin-Menü (Passworteingabe) | keine |
| Strg+Shift+B | schalteBlattsperreUm (2362–2384) | Blattschutz umschalten – nur wenn zuletzt eingegebenes Passwort == Passwort | keine |
| Strg+Shift+M | Tastenkombination_Strg_Shift_M (2387–2409) | Hauptmenü öffnen (+ Kopiervorlagen-Reset) | nur t_staerke |
| Strg+N | Tastenkombination_Strg_N (2412–2418) | Zeilen einfügen | nur t_staerke |
| Strg+E | Tastenkombination_Strg_E (2421–2427) | Zeilen entfernen | nur t_staerke |
| Strg+K | Tastenkombination_Strg_K (2430–2436) | Zeilen kopieren | nur t_staerke |
| Strg+M | Tastenkombination_Strg_M (2439–2445) | Zeilen verschieben | nur t_staerke |
| Strg+Q | digitalerEEBInNeueZeile (2448–2503) | Digitalen EEB-String einlesen → neue Zeile oberhalb der Auswahl | nur t_staerke |
| Strg+H | AküLi_anzeigen (2505–2508) | Abkürzungsliste (ufr_akueli) anzeigen | keine |

Hinweis: Die Anfrage nannte Strg+J; im Code existiert keine Zuordnung zu "j". Vorhanden sind a, d, P, B, M, n, e, k, m, q, h (Großbuchstabe = mit Shift).

### 2.3 Buttons auf Blatt Stärke (t_staerke vba:12–188)
btn_menue (Menü), btn_eebAktualisieren (m_eeb.verarbeiteEebAktualisierenClick), CommandButton1/2 (Zl einfügen/entfernen), 3/4 (Kostenübersicht/Ressourcen verbergen), 5 (Zl verschieben), 6 (Speichern), 50/51 (Kopiervorlagen THW / KatS_StAN_NDS verbergen), 53 (FüSt-Meldekopf), 7 (Logistik), 8 (Angefordert), 9/10 (Bereitstellung 1/2), 11–31 (Einsatzort 1–21), 48 (Checkbox-Dialog), sowie drei mit deutschem Namen: Kostenübersicht_Click, Log_Daten_Click, Ressourcen_Click.
Blatt FüSt (vba:241–273): CommandButton1–5 verbergen Stab, ZTrFK, FGrF, FGrK, Externe; 6/7 Schicht-Spalte aus/ein. Blatt Auswertung: CommandButton1 verbirgt Auswertung-Ressourcen (vba:285).

### 2.4 Admin-Menü (Strg+Shift+P, ufr_adminMenue vba:4517–4561, m_userformFunktionen vba:3377–3411)
- Passworteingabe; bei korrektem Passwort werden Buttons "Daten füllen" / "Daten löschen" (Testdaten, m_testmodul) sichtbar.
- "Neues Passwort" → ufr_neuesPasswort: prüft altes Passwort, Gleichheit der zwei neuen Eingaben, setzt IV1/IV2 und schützt alle Blätter neu (vba:3631–3676).
- "ohne Admin" → IV2 = "" und Blätter Startseite/Neu/AküLi werden xlVeryHidden.
- PWok → m_speichern.ueberpruefePwAktiviereAdmin (s. Abschnitt 5).

## 4. Dateneingabe-Maske (ufr_datenEingabe / ufr_textEingabe)

### 4.1 ufr_textEingabe (vba:3096–3110)
Einfacher Textdialog: lädt `ActiveCell.Value` in `txt_eingabefeld`, OK schreibt zurück (mit `On Error Resume Next`, d.h. Fehler auf geschützten Zellen werden stumm verschluckt), Abbruch entlädt. Wird auf allen Blättern außer der Verbotsliste genutzt (Strg+A außerhalb von Stärke).

### 4.2 ufr_datenEingabe – Felder und Spaltenzuordnung (vba:3135–3176 lesen, 3305–3346 schreiben)
Spaltenüberschriften aus sheet_Stärke.tsv Zeile 4/5:

| Spalte | Index | Überschrift (Stärke!Zeile4/5) | Form-Feld | Typ/Validierung |
|---|---|---|---|---|
| C | 3 | Bezeichnung | txt_bezeichnung | Text |
| D | 4 | Organisation | cbo_organisation | Dropdown, Liste fix, bei Exit validiert; ungültig → MsgBox + leeren (vba:3179–3196) |
| E | 5 | Herkunft | txt_herkunft | Text |
| F | 6 | Zug | txt_zug | Text |
| G | 7 | Trupp o. Staffel | txt_trupp | Text |
| H | 8 | Gruppe | txt_gruppe | Text |
| I | 9 | Person | txt_person | Text |
| J | 10 | Geräte / Fahrzeuge (inkl. Kennzeichen) | txt_gerät | Text |
| K | 11 | Aufträge | txt_aufträge | Text |
| L | 12 | Erreichbarkeit (Funk/Tel./eMail) | txt_erreichbarkeit | Text |
| M | 13 | Verfügbar bis (Dat./Zeit) | txt_verfügbar | Text (keine Datumsprüfung) |
| N | 14 | Ablösung angefordert (Dat./Zeit) | txt_ablösung | Text |
| O | 15 | Anforderungs-ID | txt_anforderungsId | Text |
| P | 16 | Zugesagt für (Dat./Zeit) | txt_zugesagtFür | Text |
| Q | 17 | Zugesagt von (Org.) | txt_zugesagtVon | Text |
| R | 18 | Vorgesehene Einheit | txt_vorgesEinheit | Text |
| S | 19 | Vorgesehener Auftrag | txt_vorgesAuftrag | Text |
| T | 20 | eingetr./zugew. (Dat./Zeit) | txt_eingetr | Text |
| U | 21 | Einsatzende (Dat./Zeit) | txt_einsatzende | Text |
| V | 22 | Rückführung (Dat./Zeit) | txt_rückführung | Text |
| W | 23 | Bemerkungen | txt_bemerkung | Text |
| X, Y | 24, 25 | Reserve 1/2 | – | nicht in Maske |
| Z | 26 | Status | cbo_status | Dropdown fix, validiert bei Exit |
| AA | 27 | Schicht | cbo_schicht | Dropdown fix, validiert bei Exit |
| AB | 28 | ID Einheitenerfassungsbogen | txt_idEEB | Bei Enter/MouseDown öffnet Dateiauswahl (m_eeb.verarbeiteTextEingabeEEBIDAenderung), danach Fokus auf txt_zug (vba:3235–3238) |
| AC | 29 | Weibl. | txt_weiblich | numerisch, sonst → 0 |
| AD | 30 | Div. | txt_divers | numerisch, sonst → 0 |
| AE | 31 | Veget. | txt_veget | numerisch, sonst → 0 |
| AF | 32 | Vegan. | txt_vegan | numerisch, sonst → 0 |
| AG | 33 | ÜN (m) | txt_ünM | numerisch, sonst → 0 |
| AH | 34 | ÜN (w) | txt_ünW | numerisch, sonst → 0 |
| AI | 35 | ÜN (d) | txt_ünD | numerisch, sonst → 0 |
| AJ | 36 | Fü | txt_fü | numerisch, sonst → 0; Änderung berechnet Gesamt neu (vba:3240–3268) |
| AK | 37 | Ufü | txt_uFü | dito |
| AL | 38 | He | txt_he | dito |
| AM | 39 | Gesamt | txt_gesamt | nur Anzeige, wird NICHT zurückgeschrieben (Zelle enthält Formel) |

Dropdown-Inhalte (Konstanten vba:3091–3093):
- Organisation: THW, FW, BW, DRK, JUH, ASB, MALT, DLRG, POL, BPOL, HK/NLWKN, ZIV
- Status: Rufbereitschaft, Einsatzvorbehalt, Angefordert, Anmarsch, Rückmarsch, Einsatzbereit, Einsatz, Ruhe, Nicht einsatzbereit
- Schicht: Tag, Früh, Spät, Nacht

Verhalten:
- Öffnen (Strg+A auf Stärke): merkt aktuelle Zeile/Spalte, markiert die gesamte Zeile, füllt alle Felder aus der Zeile (vba:3129–3176). **Keine Prüfung auf gesperrte/Überschriftszeilen** – die Maske kann auf jeder Zeile geöffnet werden.
- OK: schreibt alle Felder (außer Gesamt) zurück, `On Error Resume Next` (vba:3302) – Schreibfehler auf geschützten Zellen werden ignoriert, kein Feedback.
- Stärke-Summe im Dialog: Fü + UFü + He → txt_gesamt live berechnet (vba:3240–3268).
- Log-Daten-Felder: Nichtnumerisches wird stumm durch 0 ersetzt (vba:3270–3299).
- Kein Undo, keine Pflichtfelder, keine Datumsvalidierung, kein Duplikat-Check.

## 3. Zeilenoperationen (m_zlOperationen, m_zlEinfuegenEntfernen, m_zlKopieren, m_zlVerschieben)

### 3.1 Gemeinsame Regeln (m_zlOperationen vba:4302–4412)
- **Gesperrte Zeilen** (`hatGesperrteZeilen`, vba:4311–4333): Eine Auswahl gilt als gesperrt, wenn (a) die erste Zeile ≤ 22 ist ("Alles über Zeile 22 ist sowieso gesperrt" – Kopf, Führungsstelle Z.7–16, Meldekopf/Sonstiges Z.17–22) oder (b) in irgendeiner markierten Zeile die Zelle in **Spalte D** (`INDIKATOR_ZEILENSPERRUNG_SPALTE`, vba:4308) das Locked-Flag trägt. Spalte D ist also der Marker für Abschnitts-Überschriften/Summenzeilen; Datenzeilen haben D entsperrt. Konsequenz: Ob eine Zeile bearbeitbar ist, hängt vom Zellformat (Locked) ab – Fachlogik steckt in der Formatierung.
- **Vollständige Zeilenmarkierung** (`markiereZeilenVollstaendig`, vba:4338–4353): Aus jeder (auch nicht zusammenhängenden) Auswahl werden via `Union` ganze Zeilen; Mehrfachbereiche (`Areas`) bleiben erhalten.
- **Stärken zurücksetzen** (`setzeStaerkenZurueck`, vba:4357–4394): pro Zeile AB (ID EEB) ClearContents; B..Z ClearContents (FüSt, Bezeichnung … Status); AC:AD, AE:AF, AG:AH, AI, AJ:AK, AL = 0 (Weibl./Div./Veget./Vegan./ÜN m,w,d/Fü/UFü/He); AO (Anz. pro Tag) = 0; AA (Schicht) = "". **Zusätzlich global**: `Range("Schicht_Angefordert").Value = ""` (AA139:AA160) – die Schicht-Spalte des Abschnitts "Angefordert" wird bei jedem Einfügen und jedem Verschieben komplett geleert (vba:4391, 4494). Blatt muss vorher entsperrt sein (Kommentar vba:4356).
- **Ziel = Quelle** (`istZielzeileQuellzeile`, vba:4399–4411): prüft, ob die Zielzeile in einer der Quellzeilen liegt.
- Alle Operationen laufen als: Menü verstecken → Auswahl auf ganze Zeilen erweitern → **modeless** Userform anzeigen (Nutzer kann währenddessen die Markierung ändern) → OK → Regelprüfung → MsgBox "Wirklich …?" → Blatt entsperren → Operation → Blatt schützen.

### 3.2 Zeilen einfügen (m_zlEinfuegenEntfernen vba:4062–4110; Strg+N, Menü, CommandButton1)
1. Erste markierte Zeile wird vollständig markiert, ufr_zlEinfuegen (Anzahl via SpinButton `spn_anzahlZeilen`/`txt_anzahlZeilen`, Bereich Min..Max des SpinButtons, Text wird gegen Min/Max validiert, vba:4113–4142) modeless angezeigt.
2. OK: erneut erste Zeile markieren; gesperrt → "Einfügen von gesperrten Zeilen nicht möglich"; sonst "Wirklich einfügen?".
3. Ausführung (vba:4086–4110): die markierte Zeile wird `anzahlZeilen`-mal kopiert und mit `Insert(Shift:=xlDown)` an ihrer Position eingefügt (Format, Formeln, Datenvalidierung, Locked-Flags werden dadurch geerbt); anschließend werden über `Offset(-(anzahl-1))` die Zeilen unterhalb der ersten geleert (`setzeStaerkenZurueck`). **Netto-Effekt** (per Kommentar vba:4058–4061): unter der markierten Zeile entstehen n leere Zeilen mit identischem Layout; die Datenzeile bleibt oben. Cursor danach auf Spalte B der Datenzeile. Die Zeilenanzahl im Formular bleibt erhalten (Form wird nur versteckt, vba:4074).
- Es gibt keine "leere Zeile"-Vorlage: neue Zeilen sind immer Klone der Kontextzeile. Damit werden auch Formeln (AM Gesamt, AN..AW Kosten) mitkopiert.

### 3.3 Zeilen entfernen (vba:4146–4186; Strg+E, Menü, CommandButton2)
1. Alle markierten Zeilen (auch mehrere, nicht zusammenhängend) werden vollständig markiert, ufr_zlEntfernen modeless.
2. OK: gesperrt → "Löschen von gesperrten Zeilen nicht möglich"; sonst "Zeilen wirklich entfernen?".
3. `Selection.Rows.Delete` (physisches Löschen, Zeilen rücken nach); Cursor auf B(ersteZeile-1). **Kein Undo** (Excel-Undo-Stack wird durch Makro geleert), keine Sicherung der gelöschten Daten, kein Log-Eintrag.

### 3.4 Zeilen kopieren (m_zlKopieren vba:4203–4300; Strg+K, Menü)
1. Start: Kopiervorlagen-Bereiche werden genullt (Stärke_/Logistikdaten_Kopiervorlagen_THW und _KatS_StAN_NDS = 0, Status_/Schicht_Kopiervorlagen = "", vba:4215–4223). Zweck: die StAN-Vorlagenzeilen (Bereich_Kopiervorlagen_THW = Stärke!B24:AB71, Bereich_Kopiervorlagen_KatS_StAN_NDS = B74:AB122, defined_names.txt) sollen beim Kopieren immer Stärke 0 liefern – **das ist das "Stärken zurücksetzen beim Kopieren"**: es gilt für die Vorlagen, nicht für die kopierte Zeile selbst.
2. Quelle: alle markierten Zeilen (mehrere Areas erlaubt), ufr_zlKopieren → OK → gesperrt? → `quellBereich` merken → ufr_zlKopierenZiel.
3. Ziel: erste markierte Zeile. Regeln: Ziel gesperrt → Abbruch; Ziel Teil der Quelle → Abbruch, **Ausnahme**: die erste Quellzeile darf Ziel sein (Kommentar vba:4258: "erste Zeile der Quelle darf Zielzeile sein" → Duplikat direkt über sich selbst).
4. "Wirklich kopieren?" → für jede Area: Copy + `zielzeile.Insert(Shift:=xlDown)` – Kopien werden **oberhalb der Zielzeile** eingefügt, Quelle bleibt erhalten (Kommentar vba:4209–4211). Danach Cursor auf AA (Schicht) der Zielzeile und Hinweis "Schichtangaben und Status kontrollieren" (vba:4283–4284).
5. Fehlerpfad: "Fehler beim kopieren! Daten überprüfen und evtl. Backup verwenden." (vba:4287) – kein Rollback.
- Kopierte Zeilen behalten Stärke, Status, Schicht, ID-EEB (inkl. Hyperlink) der Quelle → Doppelzählung bis der Nutzer korrigiert.

### 3.5 Zeilen verschieben (m_zlVerschieben vba:4414–4515; Strg+M, Menü, CommandButton5)
Ablauf wie Kopieren (inkl. Kopiervorlagen-Reset), Unterschiede:
- Ziel darf **nicht** Teil der Quelle sein (keine Ausnahme, vba:4470–4473).
- Nach dem Einfügen aller Areas wird `quellBereich.Delete` ausgeführt (vba:4493) – Range-Objekte verschieben sich beim Insert automatisch mit, daher stimmt die Löschposition.
- Danach `Range("Schicht_Angefordert").Value = ""` (vba:4496) – Schicht im Abschnitt "Angefordert" wird geleert.
- Hinweis "Schichtangaben und Status kontrollieren"; Fehlerpfad "evtl. Backup verwenden" (vba:4508).
- Fachlich ist Verschieben = Statuswechsel einer Einheit zwischen Abschnitten (Angefordert → Bereitstellungsraum → Einsatzort). Die Software kennt keinen Abschnitts-Begriff, nur Zeilenpositionen zwischen Überschriftszeilen.

### 3.6 Nicht zusammenhängende Auswahl
Unterstützt bei Entfernen, Kopieren, Verschieben (Iteration über `quellBereich.Areas`, vba:4271, 4487). Bei Einfügen zählt nur `Selection.Rows(1)`.

## 5. Speichern (m_speichern vba:2523–2757)

### 5.1 Dateinamensschema
- `getDateiname()` (vba:2534–2536): `<Stärke!G1>_Stärkeübersicht_<yyyy_mm_dd_hhmm_ss>.xlsm`. `Stärke!G1` ist Formel `=Stammdaten!$C$4` (Einsatz-/Übungsname, sheet_Stärke.tsv G1). Deshalb die Aufforderung in Workbook_Open, zuerst Einsatzname und FüSt-Name in Stammdaten einzutragen ("wichtig für das korrekte spätere Abspeichern", vba:335–336).
- `speicherDatei()` (vba:2538–2561) speichert **zweimal**: (1) `SaveAs "<Einsatzname>_Stärkeübersicht_Aktuell"` (fester Name, wird überschrieben; Fehler → MsgBox "…konnte nicht gespeichert werden. Überprüfe ob die Datei geöffnet wurde…" und `Resume Next`), (2) `SaveAs getDateiname()` (Zeitstempel-Historie). Nach dem Vorgang ist die geöffnete Arbeitsmappe die **Zeitstempel-Datei**; `DisplayAlerts=False` unterdrückt Überschreib-Rückfragen. Der Pfad ist relativ → landet im aktuellen Verzeichnis (CurDir), das durch den Erstspeichern-Dialog gesetzt wird; `m_htmlExport.exportiereBlatt` setzt `ChDir ThisWorkbook.Path` (vba:2245) – Hinweis darauf, dass CurDir-Drift ein bekanntes Problem war.
- Ergebnis pro Speichervorgang: eine "Aktuell"-Datei + eine neue Versionsdatei. Es entsteht eine manuelle Versionshistorie im Ordner (Backup-Strategie: "evtl. Backup verwenden", vba:4287).

### 5.2 Erstspeichern
- `speicherErstmalig()` (vba:2564–2572): `Application.Dialogs(xlDialogSaveAs).Show(getDateiname())` – Nutzer wählt Ordner; bei Erfolg `IV5 = True`.
- `verarbeiteSpeichernAnfrage()` (vba:2575–2596): Wenn erstgespeichert: existiert die Zeitstempel-Datei bereits (`Dir(...)`), dann "Datei mit Uhrzeit bereits vorhanden, bitte kurz warten" (Sekundenauflösung), sonst `speicherDatei` + "Datei mit aktueller Uhrzeit gespeichert". Sonst Erstspeichern-Dialog. Menü wird danach versteckt.

### 5.3 Autospeichern-Zyklus (Application.OnTime)
- `schalteAutoSpeichernEin` (vba:2607–2610): `Application.OnTime(Now + TimeSerial(0, IV7, 0), "fuehreAutoSpeichernZyklusAus")`. Standard 10 Minuten (Workbook_Open vba:314).
- `fuehreAutoSpeichernZyklusAus` (vba:2599–2605): wenn aktiv → `speicherDatei` (beide Dateien) und erneut planen. Rekursives Ein-Schuss-Timing, kein Dauer-Timer.
- `schalteAutoSpeichernAus` (vba:2612–2620): storniert den geplanten OnTime-Aufruf (Schedule:=False), nur wenn ein Zeitpunkt gesetzt war.
- Workbook_BeforeClose (vba:340–352) schaltet beide Zyklen ab, "da Autospeichern sonst noch im Hintergrund läuft" (OnTime würde die Datei sonst erneut öffnen).
- Konfiguration über ufr_erweitertesSpeichern (vba:2622–2712): Checkbox `cb_autoSpeichern` + Intervall (SpinButton/TextBox mit Min/Max-Validierung, vba:3425–3450), Checkbox `cb_druckExportieren` + Intervall. Beim Aktivieren ohne vorheriges Erstspeichern wird erst der SaveAs-Dialog erzwungen (vba:2646–2653). Zustandswechsel-Logik: neu aktiviert → sofortiger Zyklus (bzw. nur Planung, wenn gerade erstgespeichert, "verhindert, dass beim Erstspeichern 3x gespeichert wird", vba:2668), deaktiviert → aus, Intervall geändert → aus+ein. MsgBox fasst Änderungen zusammen, Menü-Button färbt sich (grau/gelb/grün).
- Der Autospeichern-Zustand steht in Zellen (IV6/IV7) und wird **mit der Datei gespeichert**; Workbook_Open setzt ihn aber immer auf False/10 zurück (vba:313–314), d.h. nach Neuöffnen ist Autospeichern aus.

### 5.4 Admin-Passwort / Blattschutz
- Passwort liegt im Klartext in `Startseite!IV1` (m_util vba:3749, 3762); das Blatt Startseite ist xlVeryHidden und mit demselben Passwort geschützt. Bei "unlocked_…xlsm" (Dateiname des Originals) wurde dieser Schutz offenbar bereits entfernt.
- Workbook_Open schützt Stärke, Druck, Status, Log, FüSt, Stammdaten, Hinweise mit dem Passwort (vba:321–329). Jede Makro-Operation entsperrt und schützt wieder (Muster `Unprotect(getPasswort) … Protect(getPasswort)`).
- `ueberpruefePwAktiviereAdmin` (vba:2714–2731): richtiges Passwort → IV2 = Passwort, Blätter Startseite/Neu/AküLi werden sichtbar ("Admin-Funktionen freigeschaltet"); falsch → IV2 = "", Blätter xlVeryHidden.
- Strg+Shift+B (vba:2362–2384) schaltet Blattschutz des aktiven Blatts um, nur wenn IV2 == IV1.
- Passwortwechsel (vba:3631–3676): alle 8 Blätter werden mit altem Passwort entsperrt und neu geschützt.
- Zweck des Schutzes: nicht Sicherheit, sondern Schutz vor versehentlicher Bearbeitung von Formeln/Kopf (Locked-Flags steuern zugleich die Zeilenoperations-Regeln, s. 3.1).

## 6. HTML-Export (m_htmlExport vba:2194–2313) – de facto Lage-Monitor

### 6.1 Was exportiert wird
| Aufruf | Blatt | Bereich (Konstante vba:2200–2202) | Datei (vba:2303–2306) | `<title>` (vba:2309–2312) |
|---|---|---|---|---|
| exportiereDruck | Druck | $B$4:$K$35 | `<WorkbookPath>\Staerkeuebersicht <Einsatzname> Druck.html` | "Stärkeübersicht <Einsatzname> Druck" |
| exportiereStatus | Status | $A$1:$J$44 | `…Staerkeuebersicht <Einsatzname> Status.html` | "… Status" |
| exportiereLogistik | Log | $B$1:$F$39 | `…Staerkeuebersicht <Einsatzname> Logistik.html` | "… Logistik" |
`exportiereAlleBlaetter` (vba:2217–2221) ruft alle drei nacheinander. Einsatzname = Stärke!G1.

### 6.2 Technik (exportiereBlatt vba:2223–2265)
1. `IV8 = True` (Export läuft; t_druck.Worksheet_Activate nutzt das, um ScreenUpdating nicht vorzeitig einzuschalten, vba:220–222).
2. Blatt aktivieren (löst `Worksheet_Activate` aus → Druck blendet Zeilen 6–34 mit leerer Gesamtstärke K aus; Log blendet Zeilen 7–34 mit H=0 aus → **im HTML erscheinen nur belegte Zeilen**), ggf. Blattschutz aufheben.
3. `ThisWorkbook.PublishObjects.Add(SourceType:=xlSourceRange, HtmlType:=xlHtmlStatic, DivID:="Table").Publish Create:=True` – Excel-eigener statischer HTML-Export (windows-1252, inline-Styles).
4. `bearbeiteHtmlDatei` (vba:2267–2300) patcht die Datei per String-Replace:
   - vor `</body>`: `<h1 id="warningNoJs">Bitte aktiviere JavaScript…</h1>` + Script, das die Warnung versteckt und `table.style.width = "unset"` setzt;
   - nach `<head>`: `<meta http-equiv="refresh" content="60">` **und** `<script>setTimeout(() => location.reload(), 60000)</script>` (doppelte 60-s-Aktualisierung, Meta + JS);
   - `Cache-Control: no-cache, no-store, must-revalidate`, `Pragma: no-cache`, `Expires: 0`;
   - `<title>`.
   - Anschließend `m_util.konvertiereAnsiiZuUtf8` (vba:3859–3884): Datei als ANSI lesen, `charset=windows-1252` → `charset=utf-8` ersetzen, via ADODB.Stream als UTF-8 zurückschreiben.
5. Vorherige Auswahl/Blatt wiederherstellen, Schutz wieder setzen, `IV8 = False`; Fehler werden gesammelt und nach dem Aufräumen erneut geworfen (vba:2249–2264).

### 6.3 Auto-Export-Zyklus
`fuehreAutoHtmlExportZyklusAus` (vba:2734–2739) → `exportiereAlleBlaetter` + `Application.OnTime(Now + IV10 Minuten)`; Standard **1 Minute** (Workbook_Open vba:318). Zusammen mit dem 60-s-Refresh im HTML ergibt sich: Ein Browser (z.B. auf einem Beamer/Monitor im FüSt-Raum oder auf einem anderen Rechner mit Zugriff auf den Share) zeigt die Blätter Druck/Status/Logistik mit ≤ 2 Minuten Verzögerung ohne Excel. **Das ist der Lage-Monitor**: read-only, dateibasiert (HTML neben der .xlsm), kein Server, Verteilung über den SMB-Share. Kein Push, keine Historie, kein Diff; bei laufendem Export blinkt die Excel-Oberfläche (Blattwechsel).
Einschränkungen aus dem Code: nur drei feste Bereiche; Zeilenzahl fix (Druck 6–34 = max. 29 Einheiten/Abschnitte); Export schlägt fehl, wenn eine Datei vom Browser gesperrt ist (kein Retry); Zeichensatz-Umweg über ANSI→UTF-8 (Umlaute).

## 7. EEB-Verlinkung (m_eeb vba:1929–2192)

### 7.1 Ordnerpfad
- Gespeichert in `Startseite!IV11` (m_util vba:3758), **bevorzugt relativ** zum Speicherort der Arbeitsmappe (`speichereEEBOrdnerPfadUndAktualisiereLinks`, vba:2093–2112: "Immer relativen Pfad bevorzugen zum speichern").
- Auswahl per `msoFileDialogFolderPicker` (waehleOrdnerPfad vba:2049–2091); Rückgabe über `m_util.getRelativerPfadZuBasisPfad(ThisWorkbook.Path, gewählt)` (vba:3936–3990): relativ nur bei gleicher Wurzel (Laufwerksbuchstabe `X:` oder UNC-Share `\\server\share`, getPfadWurzel vba:3993–4014, Beispiel im Kommentar: `\\172.30.3.200\disk`, `\\thw.nas.local\thw-einsaetze` → **Beleg für NAS/SMB-Betrieb im Einsatznetz**), sonst absolut mit Trailing-Backslash; `..\`-Segmente für Aufwärtsnavigation; gleicher Ordner → `.\`.
- ufr_eebEinstellungen zeigt relativen und aufgelösten absoluten Pfad (setzeUfrEEBLabels vba:1957–1966). Speichern prüft `istOrdnerVorhanden` (GetAttr & vbDirectory, vba:3886–3897) und startet direkt die Link-Aktualisierung.

### 7.2 Erlaubte Dateiendungen
`pdf|docx|png|jpg|jpeg|odt|svg|webp|avif|heic` (vba:1940, "In optimierter Reihenfolge nach Wahrscheinlichkeit der Verwendung").

### 7.3 ID-Feld in der Dateneingabe (verarbeiteTextEingabeEEBIDAenderung vba:2114–2142)
Klick/Enter im Feld `txt_idEEB` öffnet einen FilePicker; gewählte Datei → relativer Pfad zum Workbook-Ordner, Trailing-Backslash entfernt, Endung geprüft (sonst MsgBox "unerlaubte Dateiendung"), **Endung abgeschnitten** und der Rest (relativer Pfad ohne Endung) in `txt_idEEB` geschrieben → landet in Spalte AB. Die "ID" ist also ein Dateiname/relativer Pfad ohne Endung.

### 7.4 Hyperlink-Erzeugung ("EEB aktualisieren", btn_eebAktualisieren → verarbeiteEebAktualisierenClick vba:1970–2046)
1. Kein Pfad → Einstellungsdialog. Relativer Pfad → absolut auflösen ("Ansonsten kommt es zu Problemen wenn Leerzeichen im Pfad vorhanden sind", vba:1986). Ordner fehlt → MsgBox + Dialog.
2. ufr_bitteWarten (modeless, QueryClose abgefangen vba:4665–4667), Blatt entsperren.
3. Für Zeilen **7..1000** Spalte AB: bei nicht-leerem Inhalt `getErstenVorhandenenDateiPfad(ordner, inhalt)` (vba:2144–2166): erst mit vorhandener Endung, sonst alle Endungen der Liste durchprobieren (`Dir$`). Gefunden → Hyperlink setzen/aktualisieren (`Hyperlinks.Add` bzw. `.Address`/`.TextToDisplay`), sonst `entferneHyperlink` (ClearHyperlinks + Unterstreichung/Farbe zurücksetzen, vba:2184–2190) und Fehlerzähler.
4. Abschluss-MsgBox: "Gefundene Bögen: n / Nicht gefundene Bögen: m".
- **Code-Befund**: `hatErlaubteDateiendung(dateiNameOhneEndung, EINHEITEN_ERFASSUNGS_ERLAUBTE_ENDUNGEN)` (vba:2149) und `For Each endung In EINHEITEN_ERFASSUNGS_ERLAUBTE_ENDUNGEN` (vba:2157) iterieren über die **String-Konstante** statt über `Split(...)`. `For Each` über einen String ist in VBA nicht zulässig (Laufzeitfehler 13/424) [Laufzeitverhalten nicht getestet, aus Code abgeleitet]. Wegen `On Error GoTo Fehler` (vba:1999) würde der erste nicht-leere AB-Eintrag zum Abbruch mit "Nicht gefundene Bögen: 1" führen. Die Funktion ist in dieser Beta nach Code-Lesart defekt; im Dateneingabe-Pfad (vba:2119) wird korrekt `Split` verwendet.
- Fachlicher Kern: Die Stärkeübersicht verweist pro Einheit auf den (gescannten/PDF-) **Einheitenerfassungsbogen** im gemeinsamen Ordner; die Verlinkung ist dateisystembasiert und bricht bei Umbenennung/Verschieben.

## 9. Auswertung / LogFrei / Bereiche verbergen / Workbook-Events / Testmodul

### 9.1 Auswertung aktualisieren (m_auswertungsdatenKopieren.kopiereStaerkeInAuswertung vba:420–520)
Zweck: flache, filterbare **Werte-Kopie** aller Datenzeilen des Blatts Stärke in das Blatt Auswertung (ohne Formeln, ohne Abschnittsstruktur), mit Spalte A = Abschnittsbezeichnung.
1. Menü verstecken, ufr_bitteWarten modeless, Stärke entsperren.
2. `vorbereitenAuswertungsBlatt` (vba:444–484): Auswertung!A5:AM1000 entsperren und löschen; Datumsformat `dd.mm.yyyy hh:mm` für M:N, P, T:V; `B1 = Now` (Stand); Teilergebnis-Formeln (`=TEILERGEBNIS(9; …5:…1000)`, also SUMME, filterfest) in AC3..AM3 für Weibl./Div./Veget./Vegan./ÜN m,w,d/Fü/UFü/He/Gesamt.
3. `kopiereAuswertungInStaerkeOperation` (vba:486–570): nacheinander Bereiche FüSt (B7:AB22 + AC7:AM22, Bezeichnung "FüSt"), `Bereich_Angefordert`, `Bereich_Logistik`, `Bereich_Bereitstellung_1`, `_2`, dann `Bereich_Einsatzort_1..21` – jeweils B:AB und Stärke_… (AC:AM) per `PasteSpecial xlPasteValues` an die nächste freie Zeile (ermittelt über Spalte AM, `getLetzteZeile` vba:573–575); Spalte A erhält den Abschnittsnamen aus der Überschriftszelle (`Angefordert`, `Logistik`, `Einsatzort_n` …, defined_names.txt).
4. Bereinigung (vba:546–568): Zeilen mit Gesamt ("AI" – **Achtung**: lokale Konstante überschreibt "AM", vba:547) = 0/"" **und** leeren Feldern B..I, K, AA werden gelöscht.
- Hinweise: Kopiervorlagen-Bereiche werden nicht kopiert. Die Auswertung ist ein Snapshot (Stand in B1), kein Live-Blatt. Button "Ressourcen verbergen" auf Auswertung blendet Spalten L:Y um (vba:615–623).

### 9.2 LogFrei aktualisieren (kopiereLogInLogFrei vba:581–600)
Kopiert Werte aus Log!C7:P34 → LogFrei!C7 und Log!C38:P38 (angeforderte Stärken) → LogFrei!C38, setzt LogFrei!E4 = Now, blendet Zeilen mit H=0 aus. Zweck: Blatt "Log" enthält Formeln auf Stärke (Logistikbedarf: Verpflegung/Unterkunft), "LogFrei" ist eine formelfreie, **weitergabefähige** Kopie (z.B. an Logistik/Verpflegung außerhalb der FüSt). Worksheet_Activate von Log/LogFrei blendet Nullzeilen aus (vba:369–380, 388–401).

### 9.3 Bereiche verbergen (m_bereicheVerbergen vba:603–852, m_bereicheVerbergenCheckboxen vba:854–982)
- Spaltengruppen auf Stärke (Toggle, vba:609–612): Kostenübersicht AN:AW, Ressourcenplanung L:Y, Log-Daten AC:AI. Auswertung: Ressourcen L:Y.
- Zeilengruppen auf Stärke (Toggle, `toggleStaerkeSichtbarkeit` vba:820–835): jeder benannte Abschnitt (`Bereich_Logistik`, `Bereich_Angefordert`, `Bereich_Bereitstellung_1/2`, `Bereich_Einsatzort_1..21`, `Bereich_Kopiervorlagen_THW`, `Bereich_Kopiervorlagen_KatS_StAN_NDS`; FüSt+Meldekopf gemeinsam vba:747–757). Nach dem Toggle wird die Zelle in Spalte B der Zeile davor (Überschrift) selektiert.
- FüSt-Blatt: Abschnitte Stab, ZTr FK, FGr F, FGr K, Externe (vba:806–824). Schicht-Spalten ein-/ausblenden (vba:764–789): Zähler in FüSt!I1, ab Spalte 10; blendet jeweils eine Spalte aus/ein und passt den Druckbereich an – eine primitive "Anzahl Schichten"-Steuerung.
- Checkbox-Dialog (vba:858–911): Captions der Checkboxen werden aus den Überschriftszellen (`Führungsstelle`, `Logistik`, `Angefordert`, `Bereitstellung_1/2`, `Einsatzort_1..21`) gelesen → **Abschnittsnamen sind vom Nutzer umbenennbar** (Testmodul-Reset setzt Defaults "Angefordert / Anmarsch", "Bereitstellung 1", "Einsatzort n", vba:3013, 3033, 3068). Checkbox = True bedeutet verborgen. "Alle auswählen/abwählen". OK schreibt Hidden-Flags (FüSt-Checkbox steuert Führungsstelle **und** Meldekopf/Sonstiges).
- Sichtbarkeit ist reine Ansichtsoption, wird aber in der Datei gespeichert und wirkt bei Druck/HTML-Export.

### 9.4 Workbook_Open / BeforeClose (DieseArbeitsmappe vba:289–354)
Open: Fenster maximieren; Startseite kurz sichtbar mit MsgBox Nutzungsbedingungen ("Freigabe nur zur Nutzung im Technischen Hilfswerk / Weitergabe an Externe untersagt / Weitergabe nur mit Erlaubnis der FK THW OV Oldenburg (Ni)"); Startseite, Neu, AküLi → xlVeryHidden; Zustandsfelder zurücksetzen (Erstgespeichert False, Autospeichern aus/10 min, Auto-HTML-Export aus/1 min, Export-läuft False, IV2 ""); 7 Blätter schützen; Stammdaten anzeigen mit Aufforderung Einsatz-/Übungsname und FüSt-Name einzutragen.
BeforeClose: Autospeichern- und Auto-Export-Timer stornieren, ufr_menue entladen. **Kein** automatisches Speichern beim Schließen, keine Warnung bei ungespeicherten Änderungen über Excel-Standard hinaus.
Blatt "Neu" (t_neu, leer, xlVeryHidden, nur Admin sichtbar) – vermutlich eine leere Vorlage; Blatt "AküLi" = Abkürzungsliste (Strg+H zeigt ufr_akueli).

### 9.5 Testmodul (m_testmodul vba:2759–3084, nur im Admin-Menü)
- `fuelleStaerkeBereiche` (vba:2767–2942): FüSt-Blatt: alle Fü/UFü/He-Felder von Stab, ZTr FK, FGr F, FGr K, Externe = 1. Stärke-Blatt: FüSt Status "Einsatz", St_M_W = 1, Herkunft "THW"; Meldekopf/Sonstiges Status "Einsatz", Schicht abwechselnd Tag/Nacht, Fü 1/UFü 2/He 3; Logistik Fü 1/UFü 2/He 3 (erste Zeile leer), Status "Einsatz" mit Varianten in Zeilen 6–11 ("Ruf Bereitsch.", "Einsatzvorbeh.", "Anmarsch", "Rückmarsch", "Ruhe", "Nicht einsatzbereit" – **abweichende Schreibweisen** gegenüber der Dropdown-Liste), Schicht Tag/Nacht/Früh/Spät; Angefordert Status "Angefordert"; Bereitstellung 1 mit allen 12 Organisationen als Herkunft (Zeilen 3–13), Status "Einsatzbereit", Schicht "Tag"; Einsatzorte 1–21 je Fü/UFü/He = 1, Status "Einsatz", Schicht "Tag", Herkunft "THW". Es werden **nur Zahlen/Status/Schicht/Herkunft** gefüllt, keine Bezeichnungen/Namen – Testdaten dienen dem Prüfen der Summen-/Logistikformeln.
- `setzeStaerkeBereicheZurueck` (vba:2944–3083): alles auf 0/"" zurück, Stammdaten C4/C5/C6 auf "Name_Einsatz_Übung"/"Name_Füst"/"Name_Vorgesetzte_FüSt", Abschnittsüberschriften auf Defaults, anschließend Auswertung und LogFrei neu erzeugen (= leeren). Das ist faktisch die **"Neuer Einsatz"-Funktion** – nur per Admin-Passwort erreichbar.
- Verwendete benannte Bereiche `Status_*` (29 Stück), `St_M_W_*` (AC:AI je Abschnitt), `UFü_*`, `Stärke_*` (AC:AM je Abschnitt) sind in defined_names.txt (342 Namen; workbook.xml: 349 definedName-Einträge) vorhanden – das Testmodul ist damit lauffähig.

## 8. Digitaler EEB in der Arbeitsmappe (m_digitalerEEB, m_digitalerEEBParsing, ufr_digitalerEEBEingabe)

### 8.1 Herkunft des Strings – Begleit-App gefunden
- Der Modulkopf (vba:1099–1116) nennt die Quelle: "Dekoder für Daten aus dem digitalen Erfassugsbogen: https://erfassungsbogen.app/ … Liest den Text, den ein QR-Scanner (Tastatur-Emulation) aus einem Einheiten-Erfassungsbogen-Code in die Zelle schreibt", Verweis auf `src/codec.ts`, Vermerk "KI generiert und nicht überarbeitet!".
- Die Begleit-App liegt lokal vor: **/Users/johannes/Developer/einheitenerfassungsbogen** (package.json: "erfassungsbogen" 1.0.0, "Digitaler Einheiten-Erfassungsbogen für BOS: Assistent, PDF-Export im Papier-Layout, Offline-Transport per QR-Code"; Electron + Capacitor iOS/Android + Web). Maßgebliche Dateien: `src/codec.ts` (1043 Z., Encoder/Decoder, Referenz), `src/model.ts` (Enums), `src/signatur.ts` (Ed25519-Container), `docs/datenmodell.md` (446 Z., Spezifikation Schema 8, Stand 2026-08-05), `src/vokabulare/*.ts` (Codetabellen), `src/app/oldenburg-xlsx.ts` (XLSX-Export im Format der Oldenburger Excel-Einheitenliste).
- QR-Inhalt: `https://erfassungsbogen.app/#B.<Base41>` (App-URL, Daten im Fragment, nie an einen Server gesendet; datenmodell.md "QR-Payload-Format"). Der QR sitzt auf der letzten Seite der PDF des Bogens; Scan per Handykamera (Universal Link), Webcam oder **USB-Handscanner (Tastatur-Emulation)** am PC (README "Was kann die App?").
- grep-Treffer in /Users/johannes/Developer: ausschließlich im Repo `einheitenerfassungsbogen` (index.html, src/codec.ts, docs/datenmodell.md, src/signatur.ts, src/app/qr-scanner-web.tsx, pdf-dokument.ts, hilfen.ts). In S1-Control nur die Überschrift "Erfassungsbogen (optional)" in EinheitFormFields.tsx:137 und FahrzeugFormFields.tsx:83 – kein Decoder.

### 8.2 Workflow in Excel (Strg+Q, m_makroFunktionen.digitalerEEBInNeueZeile vba:2448–2503)
1. Nur auf Blatt Stärke; erste markierte Zeile darf nicht gesperrt sein (sonst "Einfügen in diese Zeile nicht möglich").
2. ufr_digitalerEEBEingabe (modal, Caption "Digitalen EEB einfügen", Textfeld `txt_eingabefeld`): Nutzer scannt/pastet den QR-Text; OK → globale Variablen `digitalerEEBText`/`digitalerEEBEingabeBestaetigt` (vba:3118–3127).
3. `m_digitalerEEBParsing.EebBogenLesen(text)` → `TEebBogen` (Fehler → MsgBox "EEB konnte nicht eingefügt werden: …").
4. Markierte Zeile kopieren und an gleicher Stelle einfügen (Klon wie bei Zl einfügen), dann `EebBogenInZeileSchreiben(zeile.Row, bogen)` in die **obere** (neue) Zeile; Cursor auf B.
- Weitere Einstiegspunkte im Parsing-Modul (`EebBogenScannen` → Blätter "Bögen/Personal/Fahrzeuge", `EebBogenAlsText`, vba:1200–1235) werden in der Mappe nicht aufgerufen; `EebBogenScannen` ruft ein nicht existierendes `EebBogenSchreiben` auf.

### 8.3 Zellbefüllung (EebBogenInZeileSchreiben vba:1032–1093)
| Spalte | Wert aus Bogen | Bemerkung |
|---|---|---|
| C Bezeichnung | `einheitsTyp` | Vokabulartext (E) bzw. Freitext |
| D Organisation | `EebOrgName(organisation, organisationName)` | z.B. "THW", "Feuerwehr", "Johanniter (JUH)", "Sonstige (Name)" – **weicht** von der Dropdown-Liste der Maske ab (dort "FW", "JUH", …) |
| E Herkunft | `hierarchie` | "OV Oldenburg - Ni / RB … / LV …" bzw. "OV-Nr. 1540" bei standortRef |
| F Zug, G Trupp, H Gruppe, I Person | "" | leer |
| J Geräte/Fahrzeuge | `typ kennzeichen; typ kennzeichen; …` | Funkrufname nicht übernommen |
| K Aufträge | `ortAuftrag` | |
| L Erreichbarkeit | "" | **Kontakte der Führungskraft werden nicht übernommen** |
| M Verfügbar bis | `zeitraumBis` als Text "dd.mm.yyyy hh:nn" | Text, kein Datum |
| N Ablösung, O Anforderungs-ID | "" | |
| P Zugesagt für | `zeitraumVon` (Text) | fragwürdige Zuordnung |
| Q Zugesagt von | "" | |
| R Vorgesehene Einheit | `einheitOrt` (Name der ersten Ebene) | fragwürdig |
| S Vorgesehener Auftrag | `ortAuftrag` | doppelt zu K |
| T eingetr./zugew. | `einsatzbeginn` (Text) | |
| U Einsatzende | `einsatzende` (Text) | |
| V Rückführung | "" | |
| W Bemerkungen | `sonstiges` | **Übungs-Flag wird nicht vermerkt** |
| Z Status, AA Schicht, AB ID EEB | "" | leer |
| AC Weibl., AD Div. | aus `personal[].geschlecht` gezählt | |
| AE Veget., AF Vegan. | `vegetarisch`/`vegan` = nur `verpflegungManuell` (pflags Bit 3) | **nicht aus `ernaehrung` abgeleitet** → bei vollständig erfasstem Personal 0 (App leitet ab) |
| AG/AH/AI ÜN m/w/d | nur `unterbringungManuell` (pflags Bit 2) | dito, nicht aus Geschlecht abgeleitet |
| AJ Fü, AK Ufü, AL He | `staerkeFuehrer/Unterfuehrer/Mannschaft` | manuell oder aus Rollen gezählt (vba:1710–1718) |
| AM Gesamt | – | Formel |

### 8.4 Code-Befunde am VBA-Decoder
- `EebVokabText(...)` (vba:1626, 1628, 1630) ist **in keinem Modul definiert** (PROJECT-Stream von xl/vbaProject.bin listet exakt die 16 Standardmodule aus vba_full.txt; `strings` findet den Namen nur als Referenz). Ebenso fehlt `EebBogenSchreiben` (vba:1207). Folge: Das Modul kann nicht kompiliert werden ("Sub oder Function nicht definiert") – der Strg+Q-Import ist in dieser Beta nach Code-Lesart **nicht lauffähig** [nicht in Excel getestet]. Vokabular-Codes würden ohne Tabelle als "#12" erscheinen (Kommentar vba:1618–1619 "Tabellen gibt es nur für das THW und die Ebenen").
- Base41-, Base64url-, Inflate- (RFC 1951, puff.c-Verfahren, vba:1338–1470), Varint-, BCD- und UTF-8-Leser sind vollständig in VBA nachgebaut (vba:1237–1614) und stimmen mit `codec.ts` überein (geprüft: Alphabete, Gruppenbildung, Flag-Bits, Feldreihenfolge, Schema-Weichen v3/v7/v8, Legacy-Kennzeichen Flag 16, Sofortbedarf v2).
- Signatur-Container `EEB2C` wird übersprungen, **nicht geprüft** (vba:1268–1279); Segment-Codes (`EEBS.`) werden nicht unterstützt (führen zu "ungültige Zeichen"); Vorlagen-Marker `V.` wird stillschweigend als Bogen akzeptiert (vba:1254).
- Der Modulzustand (Byte-Array, Position, Bitpuffer) liegt in Modulvariablen – nicht reentrant.

## 11. (b) Vollständige Spezifikation des digitalen EEB-Formats ("EEB2", Schema 2–8)

Quellen: `einheitenerfassungsbogen/src/codec.ts` (Referenz-Encoder/Decoder), `src/model.ts` (Enums), `docs/datenmodell.md`, VBA `m_digitalerEEBParsing` (vba:1096–1927). Alle Angaben unten sind gegen codec.ts geprüft; VBA-Zeilen als Zweitbeleg.

### 11.1 Textschicht (QR-Inhalt / Link)
```
QR-Inhalt:      "https://erfassungsbogen.app/#" ‖ Fragment
Fragment:       [ "V." ]                          Vorlagen-Marker (geteilte Vorlage, technisch derselbe Bogen)
             |  "EEBS." teilNr "." anzahl "." id "."  Segment-Kopf (mehrere QR-Codes, s. 11.6)
             ‖  Datenteil
Datenteil:      "B." ‖ Base41(Payload)            (QR-Codes seit Base41-Umstellung)
             |  Base64url(Payload)               (ältere QR-Codes und Text-Links, ohne Marker, ohne Padding)
```
- Erkennung: Text trimmen; steht ein `#` darin, gilt nur der Teil danach (`fragmentInhalt`, codec.ts; vba:1250–1252). `.` kommt in keinem der beiden Alphabete vor, daher sind die Marker eindeutig.
- **Base41** (codec.ts `base41Dekodieren`; vba:1297–1324): Alphabet `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$*-/:` (Index = Ziffernwert 0..40). Je 3 Zeichen → 2 Bytes: `v = d0 + 41·d1 + 1681·d2` (niedrigste Stelle zuerst), `v ≤ 65535`, Ausgabe `[v >> 8, v & 0xFF]` (High-Byte zuerst). Rest von 2 Zeichen → 1 Byte: `v = d0 + 41·d1 ≤ 255`. Rest von 1 Zeichen = Fehler. Ungültiges Zeichen oder Überlauf = Fehler (kein stilles Verfälschen).
- **Base64url** (codec.ts `base64UrlDekodieren`; vba:1326–1343): Alphabet `A–Z a–z 0–9 - _`, kein Padding; 6-Bit-Akkumulation, überzählige Restbits verworfen.

### 11.2 Payload-Container
```
unsigniert:  0x45 0x45 0x42 0x32              "EEB2"  ‖ DeflateRaw(Binärstrom)
signiert:    0x45 0x45 0x42 0x32 0x43         "EEB2C" ‖ varint(n) ‖ stufe_1 … stufe_n ‖ DeflateRaw(Binärstrom)
stufe_k:     pubkey[32] ‖ signatur[64] ‖ varint(kartenLen) ‖ karte[kartenLen]
karte:       flags u8 (Bit0 Name, Bit1 E-Mail, Bit2 Telefon) ‖ je gesetztem Bit: str
```
- Zuerst auf das 5-Byte-Magic prüfen, dann auf das 4-Byte-Magic (`entpackePayload`; vba:1262–1279). `n` ∈ 1..32 (`MAX_STUFEN`).
- Signatur (Ed25519, `@noble/ed25519`): Stufe k zeichnet `kartenBlock_k ‖ stufe_1 … stufe_{k-1} ‖ komprimierterStrom` – nicht das Magic, nicht den eigenen Schlüssel (`signierteBytes`, codec.ts). Maßgeblich für "von wem kam der Bogen" ist die **letzte** Stufe; Verifikation blockiert den Import nie (Anzeigestatus "unsigniert / gültig von <Kurzform> / ungültig"). Trust-Modell TOFU, keine PKI; Schlüsselpaar pro Gerät in localStorage.
- Der Deflate-Strom ist in beiden Formen byte-identisch (Stufen sind reine Hülle). Kompression: **roher Deflate (RFC 1951)**, kein zlib-/gzip-Header (`Kompressor.deflateRaw/inflateRaw`; VBA eigener Inflater vba:1349–1470 mit Stored-, Fixed- und Dynamic-Huffman-Blöcken).

### 11.3 Primitive des Binärstroms (alle Ganzzahlen Little-Endian)
| Typ | Kodierung | codec.ts | VBA |
|---|---|---|---|
| u8 / u16 / u32 | 1/2/4 Byte LE | Writer.u8/u16/u32 | LiesU8/U16/U32 (vba:1541–1556) |
| varint | Base-128 LE, Bit 7 = Fortsetzung | Writer.varint | LiesVarint (vba:1558–1567) |
| str | varint Länge (Bytes) ‖ UTF-8 | Writer.str | LiesString (vba:1570–1600, inkl. Surrogatpaare) |
| vokab | varint code; **0 = Freitext folgt als str** | Writer.vokab | LiesVokabular (vba:1620–1634) |
| bcd (Telefon) | varint Ziffernanzahl ‖ ⌈n/2⌉ Bytes, High-Nibble zuerst, Füll-Nibble 0xF bei ungerader Anzahl | Writer.bcd | LiesBcd (vba:1603–1612) |
| EebDatum | u16 = Tage seit 2020-01-01 (Kalendertag, lokal) | model.ts `datumZuIso` | `EEB_EPOCHE + u16` (vba:1118, 1770) |
| EebZeitpunkt | u32 = Minuten seit 2020-01-01 00:00 **lokale Wandzeit** (kein UTC/Unix) | model.ts `MINUTEN_JE_TAG = 1440` | `EEB_EPOCHE + u32/1440` |

### 11.4 Feldreihenfolge des Binärstroms (decodeBinaer / BogenLesen vba:1640–1723)
```
varint  schemaVersion                       2..8 (SCHEMA_VERSION = 8); außerhalb → Fehler
        stand:  v ≥ 7 → u32 EebZeitpunkt; v ≤ 6 → u16 EebDatum (Mitternacht)
--- Einheit (encodeEinheit / EinheitLesen vba:1725–1762) ---
u8      organisation                        Enum OrganisationsTyp (11.5)
u8      eflags   Bit0 organisationName vorhanden | Bit1 standortRef vorhanden
[Bit0]  str      organisationName            (Pflicht bei SONSTIGE=255)
vokab   einheitsTyp                          Namensraum E der Organisation
Bit1=1: varint   standortRef                 THW-OV-Nummer; Hierarchie kommt aus dem OV-Verzeichnis der App (src/vokabulare/thw-ov.ts, ~700 Einträge); VBA schreibt "OV-Nr. n"
Bit1=0: str      altName                     Legacy-Slot "Name der Einheit" (Schema ≤ 4), heute immer ""
        varint   nEbenen                     unterste Ebene zuerst; Ebene 1 = eigene Einheit (Pflicht)
        je Ebene:
          u8     hflags  Bit0 telefon | Bit1 email | Bit2 kurz
          vokab  bezeichnung                 Namensraum H (Hierarchie-Ebenen) der Organisation
          str    name                        z.B. "Oldenburg - Ni"
          [Bit0] bcd telefon  [Bit1] str email  [Bit2] str kurz (z.B. "OODE")
        Migration: nEbenen = 0 und altName ≠ "" → eine Ebene {bezeichnung: Freitext "", name: altName}
--- Einsatz (encodeEinsatz / EinsatzLesen vba:1764–1772) ---
u8      zflags   Bit0 einsatzbeginn | Bit1 einsatzende
u16     zeitraumVon (EebDatum)      u16 zeitraumBis (EebDatum)
str     ortAuftrag
[Bit0]  u32 einsatzbeginn (EebZeitpunkt)   [Bit1] u32 einsatzende
--- Personal-Kopf ---
u8      pflags   Bit0 personalErfassung (0 VOLLSTAENDIG / 1 NUR_STAERKE) | Bit1 staerkeManuell | Bit2 unterbringungManuell | Bit3 verpflegungManuell | Bit4 uebung (ab v6)
[Bit1]  u8 fuehrer, u8 unterfuehrer, u8 mannschaft          (gesamt = Summe, nicht kodiert)
[Bit2]  u8 m, u8 w, u8 d
[Bit3]  u8 vegetarisch, u8 vegan
varint  nPersonal; je Person (encodePerson / PersonLesen vba:1774–1810):
          str vorname; str nachname
          u8  flags:  Bits0–3 fahrerlaubnis | Bits4–5 geschlecht | Bits6–7 staerkeRolle
          v ≥ 3: u8 ernaehrung        (v2: Default FLEISCH)
          v ≥ 8: varint nWeitere; nWeitere × u8 fahrerlaubnis   (weitere Klassen, z.B. B + A)
          varint nFunktionen;        × vokab (Namensraum F)
          varint nKontakte;          × Kontakt:
              u8 kflags: Bits0–1 art (0 MOBIL, 1 FESTNETZ, 2 EMAIL) | Bit2 dienstlich (D/P) | Bit3 emailTemplate (legacy)
              Bit3=1: u8 templateId (1 = THW "vorname.nachname@thw-<ov-slug>.de", wird nicht mehr erzeugt)
              sonst art=2: str wert;  sonst: bcd wert
          varint nZusatzqualifikationen; × vokab (in der Praxis immer Freitext: berufe.ts / dlrg-qualifikationen.ts sind reine Tipphilfen ohne Codes)
--- Fahrzeuge ---
varint  nFahrzeuge; je Fahrzeug (encodeFahrzeug / FahrzeugLesen vba:1830–1844):
          u8  fflags: Bit0 stanKonform angegeben | Bit1 stanKonform = ja | Bit2 funkrufname | Bit3 aenderungen | Bit4 LEGACY THW-Kennzeichen als varint (Schema ≤ 3)
          vokab typ (Namensraum V)
          Bit4=1: varint (überspringen, Kennzeichen bleibt leer)   Bit4=0: str kennzeichen ("THW-84397", "OL-FW 2041")
          [Bit2] Funkrufname:  u8 eigenerStandort (1/0); vokab kennwort (globaler Namensraum K); eigenerStandort=0: str ort; varint nTeile; nTeile × u8   → "Heros Oldenburg 18/13"
          [Bit3] str aenderungen
--- Sofortbedarf ---
u8      hatSofortbedarf (1/0); wenn 1:
          u8 verpflegungPersonen
          v < 3: u8 davonVegetarisch (Migration → verpflegungManuell)
          varint dieselLiter; varint benzinLiter; varint gemischLiter
          u8 sflags: Bit0 unterbringung | Bit1 ruhezeitErforderlich
--- Sonstiges ---
u8      hatSonstiges (1/0); [1] str sonstiges
ENDE    Der Leser muss exakt am Ende stehen, sonst Fehler "überschüssige Daten am Ende".
```
Abgeleitete Werte (nie kodiert, außer manuell): Stärke Fü/UFü/He aus `staerkeRolle` (2 = Führer, 1 = Unterführer, sonst Mannschaft) falls nicht `staerkeManuell`; Unterbringung m/w/d aus `geschlecht` falls nicht manuell; Verpflegung veg./vegan aus `ernaehrung` falls nicht manuell; Ansprechpartner = erste Führungskraft mit Kontakt. Encoder schreibt die **kleinste tragende Schema-Version** (`transportSchemaVersion`): ohne Übung/Uhrzeit/Mehrfach-Fahrerlaubnis bleibt ein Bogen Schema 5.

### 11.5 Enumerationen und Vokabulare (Zahlenwerte)
- **OrganisationsTyp** (model.ts:90–103; VBA EebOrgName vba:1876–1896): 1 THW, 2 Feuerwehr (BF/FF), 3 Polizei, 4 Bundespolizei, 5 DRK, 6 JUH, 7 MHD, 8 ASB, 9 DLRG, 10 Bundeswehr, 11 Rettungsdienst, 255 Sonstige (Name Pflicht).
- **StaerkeRolle**: 0 Mannschaft, 1 Unterführer, 2 Führer. **Geschlecht**: 0 M, 1 W, 2 D. **Ernaehrung**: 0 Fleisch, 1 Vegetarisch, 2 Vegan. **PersonalErfassung**: 0 vollständig, 1 nur Stärke. **KontaktArt**: 0 Mobil, 1 Festnetz, 2 E-Mail.
- **Fahrerlaubnis** (4 Bit): 0 keine, 1 AM, 2 A1, 3 A2, 4 A, 5 B, 6 BE, 7 C1, 8 C1E, 9 C, 10 CE, 11 D1, 12 D1E, 13 D, 14 DE. "Kf" ist implizit (> 0).
- **Vokabular-Namensräume**: Code 0 = Freitext (reserviert), Codes append-only, nie umgedeutet. Tabellen existieren nur für THW (E, F, V), für Hierarchie-Ebenen (H) mehrerer Organisationen und global für Funkruf-Kennwörter (K); alle anderen Organisationen nutzen Freitext (`vokabularFuer` in src/app/hilfen.ts:89–101).
  - **H Hierarchie-Ebenen** (ebenen.ts, thw.ts): THW 1 OV, 2 RB, 3 LV · Feuerwehr 1 Gemeinde/Stadt, 2 LK, 3 Bezirk, 4 Land · DRK 1 OV, 2 KV, 3 LV · JUH 1 OV, 2 RV, 3 LV · MHD 1 OG, 2 DG, 3 LG · ASB 1 OV, 2 KV, 3 RV, 4 LV · DLRG 1 OG, 2 Bezirk, 3 LV · Polizei/BPOL/BW/RD/Sonstige: keine.
  - **K Funkruf-Kennwörter** (thw.ts `FUNKRUF_KENNWOERTER`): 1 Heros (THW), 2 Florian (FW), 3 Rotkreuz (DRK), 4 Akkon (JUH), 5 Johannes (MHD), 6 Sama (ASB), 7 Pelikan (DLRG).
  - **E THW-Einheitstypen** (thw.ts `THW_EINHEITSTYPEN`, StAN 01.07.2026): 1 MT, 2 VOST, 3 ZTr TZ, 4 B, 5 B (ASH), 6 FGr R (A), 7 FGr R (B), 8 FGr R (C), 9 FGr W (A), 10 FGr W (B), 11 FGr BrB, 12 FGr O (A), 13 FGr O (B), 14 FGr O (C), 15 FGr Sp, 16 FGr N, 17 SEEBA, 18 FGr SB (A), 19 FGr SB (B), 20 Tr ESS, 21 Tr MHP, 22 Tr UL, 23 FGr BT, 24 FGr I, 25 FGr E, 26 FGr TW, 27 FGr WP (A), 28 FGr WP (B), 29 FGr WP (C), 30 FGr Öl (A), 31 FGr Öl (B), 32 FGr Öl (C), 33 SEEWA, 34 ENT, 35 SEElift, 36 ZTr FZ Log, 37 FGr Log-MW, 38 FGr Log-V, 39 Tr Log-TS, 40 Sys BR500, 41 ZTr FZ FK, 42 FGr F, 43 FGr K (A), 44 FGr K (B), 45 Stab, 46 OV-Stab.
  - **F THW-Funktionen** (thw.ts `THW_FUNKTIONEN` + `thw-funktionen-ergaenzung.ts`): Grundfunktionen 1 ZFü, 2 ZTrFü, 3 GrFü, 4 TrFü, 5 He, 6 He (Res), 7 SGL, 8 Ltr VOST, 9 stv. Ltr VOST, 10 GrLtr VOST, 11 TrLtr VOST, 12 PSF, 13 Peer; Zusatzfunktionen 30 Spr, 31 SanHe, 32 AGT, 33 CBRN, 34 FK IuK, 35 FüGeh, 36 BoFü, 37 BoFü man., 38–46 Bediener (Motorsäge, Ladekran, Mobilkran, Bagger/Radlader, Teleskoplader, Schreitbagger, Hubarbeitsbühne, Arbeitsplattform, TOG), 47 GabelSt, 48 GelSt, 49–55 Maschinisten (NEA, SEA, Pumpen, TWAA, Richtfunk, Separation, Skimmer), 56 RettHuFü, 57 Spreng, 58 SprengGeh, 59 THW-Schw, 60 PE/PVC-Schw, 61 BFB, 62 TB Ortung, 63 TB Ölschaden, 64 TB VOST, 65 Abn. EGS, 66 NwFü, 67 LogFü, 68 Ltr THW-FüSt, 69 Ltr Stab THW-FüSt, 70 Ltr FmBetrieb, 71 FmFü, 72 Ltr ENT, 73–78 SGL S1–S6, 79 BergTaucher, 80 TauchSanHe, 81 TauchGerWart, 82 LuFzFernFü, 83 Ausw. Fernerkundung, 84 TW-Laborant, 85 Hygiene, 86 Koch, 87 GerWart St V, 88–90 Bef. P. Logistik/Technik/Elektro, 91 Hägglunds, 92 Fotograf, 93 Redakteur, 94 Presse MT, 95 SoMe, 96 Videograf, 100 Kf ADR Stückgut, 101 Kf ADR Tank, 102 Kf ADR Kl. 1; Ergänzung 200–344 (145 generierte Einträge der THW-Inlands-Funktionsliste).
  - **V THW-Fahrzeugtypen** (thw.ts `THW_FAHRZEUGTYPEN`): 1 FmKW, 2 FüKW, 3 FüKomKW, 4 GKW, 5 MTW FGr, 6 MLW IV, 7 LKW Kipper, 8 LKW Lbw, 9 LKW Lkr, 10 LKW Lkr gl, 11 LKW WLF, 12 LKW WLF Tank, 13 SZM, 14 Auflieger, 15 PKW gl, 16 Bagger, 17 Radlader, 18 Teleskoplader, 19 Schreitbagger, 20 Mobilkran, 21 Gabelstapler, 22 MzAB, 23 MTW TZ, 24 MTW gl, 25 MzKW, 26 MzGW, 27 MTW OV, 40 Anh 2t, 41 Anh K, 42 Anh FüLa, 43 Anh Plane/Spriegel, 44 Anh Plattform, 45 Anh Tieflader, 46 Anh DLE, 47 Anh NEA mittel, 48 Anh NEA groß, 49 Anh NEA sehr groß, 50 Anh SwPu klein, 51 Anh SwPu mittel, 52 Anh SwPu groß, 53 Anh TWAA, 54 Anh BDF, 55 Anh ASH.

### 11.6 Segmentierung (codec.ts `segmentPayloadUrls`/`parseSegmentUrl`/`segmentePayload`)
- Budget: ein einzelner QR bis Version 18 (ECC M, 512 Payload-Bytes); darüber Aufteilung in Teile ≤ Version 13 (276 Bytes) – Feldmeldung "QR-Codes zu klein" (Kommentar codec.ts, 2026-09-05). Gemessen: voller THW-Bogen 511 B (mit OV-Referenz 411 B), Meldekopf-Schnellerfassung 191 B; von 443 Beispielbögen passen nur 73 in einen Code, Mittel 2,91 Teile, max. 7.
- Kopf `EEBS.<teilNr>.<anzahl>.<id>.` + Datenteil; `id` = FNV-1a-32 (Offset 0x811c9dc5, Prime 0x01000193) über den **gesamten** Payload; Chunks fortlaufend gleich groß; Zusammensetzen erst bei Vollständigkeit, Duplikate ignorieren, fremde `id` → neu beginnen, Prüfsumme nach Zusammensetzen prüfen. Jeder Teil hat einen eigenen QR (mehrere PDF-Seiten).
- Ein Parser für S1-Control muss Segmente sammeln können (Meldekopf-Sammel-Scan), sonst sind reale Bögen mehrheitlich nicht einlesbar.

### 11.7 Referenz-Mapping der App auf die Oldenburger Excel-Liste (src/app/oldenburg-xlsx.ts)
Die App exportiert bereits eine XLSX "im Format Oldenburg" (36 Spalten A..AJ: FüSt., Bezeichnung, Organisation, Herkunft, Zug, Trupp o., Gruppe, Person, Geräte/Fahrzeuge, Aufträge, Erreichbarkeit, Verfügbar bis, Ablösung, Anforderungs-ID, Zugesagt für/von, Vorgesehene Einheit/Auftrag, eingetr., Einsatzende, Rückführung, Bemerkung, Reserve×2, Schicht, ID EEB, Weibl., Div., Veget., Vegan., ÜN m/w/d, Fü, Ufü, He – **ohne Status**, Zeile 1 mit `SUBTOTAL(9;…)`). Fachlich sinnvollere Zuordnung als im VBA: Bezeichnung = Kurzform Einheitstyp; Zug/Trupp/Gruppe/Person nach Ebenen-Erkennung am ausgeschriebenen Typ (Trupp vor Zug prüfen); Herkunft = "OV Oldenburg - Ni (OODE)"; Geräte = "2× GKW,\nMzKW"; Erreichbarkeit = Ansprechpartner + Kontakte, sonst Einheitskontakte; Verfügbar bis = zeitraumBis; eingetr. = einsatzbeginn; Bemerkung = "ÜBUNG — sonstiges"; ÜN nur wenn `sofortbedarf.unterbringung`; ID EEB = Sammlungs-ID bzw. Inhalts-Hash; FüSt/Status/Schicht/Ablösung/Zusagen/Rückführung bleiben leer ("gehören der Führungsstelle"). Dieses Mapping ist die bessere Vorlage für den S1-Control-Import als `EebBogenInZeileSchreiben`.
