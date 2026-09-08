# Excel-Domänenmodell: Einsatzkräfteübersicht V 1.5.2-beta (THW FK Oldenburg)

Stand: 2026-09-06, abgeschlossen (Key: excel-domaenenmodell). Quellen: Excel-Dumps unter scratchpad/excel, entpackte .xlsm unter scratchpad/xlsm.

## Gliederung
1. Bereiche ("Einsatzstellen") des Blatts Stärke
2. Spaltenmodell einer Einheitenzeile (B..AW)
3. Berechnungen (Stärke, Logistik, Kosten, Summen)
4. Ableitungsblätter (Druck, Status, Log, LogFrei, Auswertung, FüOrg)
5. Blatt FüSt
6. Blatt AküLi
7. Zellkommentare als Feldhilfetexte
8. (a) ER-Zielmodell
9. (b) Tabelle Excel-Spalte -> Attribut -> Typ -> Regel
10. (c) Kennzahlen/Aggregationen mit Formel
11. Offene Fragen


## 0. Quellenlage und Blattzuordnung

- Arbeitsmappe: `unlocked_Einsatzkräfteübersichten_V 1.5.2-beta_2.xlsm`; 13 Blätter (`xlsm/xl/workbook.xml`): Startseite (veryHidden, sheet1), **Stärke** (sheet2, mit comments1.xml), Druck (sheet3), Status (sheet4), Log (sheet5), FüOrg (sheet6), FüSt (sheet7), Stammdaten (sheet8), Auswertung (sheet9, mit comments2.xml), LogFrei (sheet10), Hinweise (sheet11), AküLi (veryHidden, sheet12, mit tables/table1.xml), Neu (veryHidden, sheet13).
- Stärke: dims A1:AW1049, 52 verbundene Zellen, 4 Data Validations, 29 bedingte Formatierungen, Blattschutz aktiv (`sheetProtection ... selectLockedCells="1"`), Fixierung bei F6 (Spalten A–E und Zeilen 1–5 stehen fest).
- 40 VBA-Module (`excel/vba_full.txt`): Blattmodule t_staerke, t_druck, t_status, t_fueOrg, t_hinweise, t_fueSt, t_stammdaten, t_auswertung, t_startseite, t_neu, t_logFrei, t_log, t_akueli, DieseArbeitsmappe; Standardmodule m_auswertungsdatenKopieren, m_bereicheVerbergen, m_bereicheVerbergenCheckboxen, m_digitalerEEB, m_digitalerEEBParsing, m_eeb, m_htmlExport, m_makroFunktionen, m_speichern, m_testmodul, m_userformFunktionen, m_util, m_zlEinfuegenEntfernen, m_zlKopieren, m_zlOperationen, m_zlVerschieben; Formulare ufr_adminMenue, ufr_akueli, ufr_autoSpeichern, ufr_bereicheVerbergen, ufr_bitteWarten, ufr_datenEingabe, ufr_digitalerEEBEingabe, ufr_eebEinstellungen, ufr_erweitertesSpeichern, ufr_menue.

## 1. Bereiche ("Einsatzstellen") des Blatts Stärke

### 1.1 Zeilenlayout (Beleg: `excel/defined_names.txt`, `sheet_Stärke.tsv`)

| Bereich (Kopfzelle B) | Kopfzeile | Einheitenzeilen (Bereich_*) | Herkunft-Range (Spalte D) | Fachliche Rolle |
|---|---|---|---|---|
| Gesamt | Stärke!B5 ("Gesamt") | – | – | Gesamtsummenzeile über alle Bereiche |
| Führungsstelle (`Führungsstelle`=B6) | 6 | D7:Z16 (`Bereich_Führungsstelle`) — 10 Zeilen = 5 FüSt-Teileinheiten × Tag/Nacht | `FüSt_Herkunft` D7:D16 | Eigene FüSt-Stärke; Werte kommen aus Blatt FüSt (B7=FüSt!B8 "Stab", B9=FüSt!B49 "ZTr FK", B11=FüSt!B67 "FGr F", B13=FüSt!B93 "FGr K", B15=FüSt!B123 "Externe"; AA7/AA8 = "Tag"/"Nacht" usw.) |
| Meldekopf/Sonstiges (`Bereich_Meldekopf_Sonstiges` C17:AB22) | – | 17–22 | `Meldekopf_Sonstiges_Herkunft` D17:D22 | Drei Unterblöcke à 2 Zeilen: `Meldekopf_FüSt_BR_1` B17 ("Meldekopf FüSt BR_1", `BR1_Herkunft` D17:D18), `Meldekopf_FüSt_BR_2` B19 (D19:D20), `Sonstiges_Führung` B21 (D21:D22). Meldeköpfe der Bereitstellungsräume 1/2 und sonstiges Führungspersonal |
| Kopiervorlagen THW StAN | B23 | B24:AB71 (`Bereich_Kopiervorlagen_THW`) | – | Katalog von 46 THW-Einheitstypen (Zeile 25–70) zum Kopieren; fließt NICHT in Summen ein (Zeile 5 referenziert Zeile 23/24 nicht) |
| Kopiervorlagen KatS-StAN Nds und Feuerwehr | B73 | B74:AB122 (`Bereich_Kopiervorlagen_KatS_StAN_NDS`) | – | Katalog Feuerwehr (Zeile 75–80) und KatS Nds (82–121); fließt nicht in Summen ein |
| Logistik (`Logistik`=B124) | 124 | B125:AB136 (`Bereich_Logistik`, 12 Zeilen) | `Logistik_Herkunft` D125:D136 | Logistikkräfte des Einsatzes (Log-Punkt) |
| Angefordert / Anmarsch (`Angefordert`=B138) | 138 | B139:AB160 (22 Zeilen) | `Angefordert_Herkunft` D139:D160 | Angeforderte, noch nicht eingetroffene Kräfte |
| Bereitstellung 1 (`Bereitstellung_1`=B162) | 162 | B163:AB184 (22 Zeilen) | `Bereitstellung_1_Herkunft` D163:D184 | Bereitstellungsraum 1 |
| Bereitstellung 2 (`Bereitstellung_2`=B186) | 186 | B187:AB197 (11 Zeilen) | `Bereitstellung_2_Herkunft` D187:D197 | Bereitstellungsraum 2 |
| Einsatzort 1 … 21 (`Einsatzort_n`) | 199, 210, 221, 232, 243, 254, 265, 276, 287, 298, 309, 320, 330(!), 342, 353, 364, 375, 386, 398, 409, 420 | je 9 Zeilen (z. B. B200:AB208, …, B421:AB429) | `Einsatzort_n_Herkunft` D200:D208 usw. | Einsatzabschnitte/Einsatzstellen; Bezeichnung frei überschreibbar (B-Zelle) |
| "Kopier Bereich für 'Einsatz beendet'" | B431 | 432–1049 (leer) | – | Ablage für beendete Einheiten "zwecks Dokumentation" (Stärke!B431); ohne Summen |

Anmerkungen/Beobachtungen:
- Anomalie: `Einsatzort_13` zeigt auf B330, aber die Kopfzeile "Einsatzort 13" liegt in Zeile 331 (Zeile-5-Summe referenziert AC331); `Einsatzort_13_Herkunft` = D332:D340 passt zur Kopfzeile 331. Ebenso `Einsatzort_19` = B398 mit Herkunft D399:D407 (Kopf in Zeile 398, Block 399–407, davor eine Leerzeile 396/397 — die DV-Liste referenziert `D396:D397`). Also sind die Blockabstände nicht durchgängig 11 Zeilen.
- `Status_Einsatzort_15` = Z354:Z363 ragt eine Zeile über den Bereich (B354:AB362) hinaus (Excel-Inkonsistenz).
- Die erste Zeile jedes Datenblocks (z. B. 125, 139, 163, 187, 200, 211) ist in der Vorlage leer (keine Formeln in AM..AW), im Gegensatz zu den Folgezeilen; die DV "type=None" (AC126:AI128, AC129:AI136, AC140:AI160, AC164, AC166:AI184 …) spart diese ersten Zeilen ebenfalls aus. m_testmodul setzt beim Befüllen jeweils `.Rows(1) = ""` (vba_full.txt:2859, 2884, 2886, 2898, 2902, 2925, 2946, 2950) — die erste Zeile jedes Bereichs bleibt bewusst leer (Trennzeile/Einfügepuffer).
- Die Bereichsnamen der Kopfzellen sind vom Benutzer überschreibbar: VBA liest `Range("Einsatzort_" & i).Value` als Bezeichnung (vba_full.txt:535, 874, 3068) — d. h. "Einsatzort 7" kann z. B. "Deichabschnitt Süd" heißen. Reset auf Standard in m_testmodul:3032–3068.
- Zeilen zwischen den Blöcken (z. B. 137, 161, 185, 198, 209, 220 …) tragen eine Data Validation Liste `$B$6:$B$124` bzw. `$A$6:$A$126` (D209, D297) — Auswahl eines Bereichsnamens (Zweck: Zieleingabe für Verschieben? [unbelegt]; siehe m_zlVerschieben).
- Sichtbare Spalten im Standard-Layout (sheet2.xml `<cols>`): A–K, Z, AA, AB, AJ–AM. Versteckt: L–Y (Erreichbarkeit … Reserve 2), AC–AI (Logistikdaten), AN–AW (Kosten). Diese werden per VBA-Formular ufr_bereicheVerbergen / m_bereicheVerbergen ein-/ausgeblendet.

### 1.2 Benannte Bereiche je Block (Muster, Beleg defined_names.txt)
Für jeden Block X ∈ {FüSt, Meldekopf_Sonstiges, Logistik, Angefordert, Bereitstellung_1/2, Einsatzort_1..21, Kopiervorlagen_THW, Kopiervorlagen_KatS_StAN_NDS} existieren:
- `Bereich_X` (B..AB), `X_Herkunft` (D), `Status_X` (Z), `Schicht_X` (AA), `St_M_W_X` (AC:AI, Logistikdaten), `Stärke_X` (AC:AM), `Fü_X` (AJ), `UFü_X` (AK), `He_X` (AL), `Summe_X` (AM); zusätzlich `Logistik_Stärke` AJ125:AL136, `Logistikdaten_Kopiervorlagen_*` AC:AH, `Stärke_Kopiervorlagen_*` AJ:AL.
- Für Meldekopf/Sonstiges zusätzlich Teilbereiche `Fü_BR1/UFü_BR1/He_BR1/Summe_BR1` (Zeile 17–18), `*_BR2` (19–20), `*_Sonstiges_Führung` (21–22).
- FüSt-Blatt: `Bereich_Stab` FüSt!B10:C48, `Bereich_ZTr_FK` B52:C65, `Bereich_FGr_F` B70:C91, `Bereich_FGr_K` B96:C121, `Bereich_Externe` B126:C139 sowie `FüSt_Fü_*`, `FüSt_UFü_*`, `FüSt_He_*` (Spalten D/E/F) je Teilbereich.

## 2. Spaltenmodell einer Einheitenzeile (Stärke, Spalten B..AW)

Quellen: Kopfzeilen Stärke!B4:AW5, Kommentare `comments1.xml`, VBA `m_digitalerEEB` (Spaltenkonstanten, vba_full.txt:984–1022), `m_userformFunktionen` (Eingabeformular ufr_datenEingabe, Spaltenindizes 3..39, vba_full.txt:3150–3190 und 3330–3370), Blatt Hinweise Zeilen 11–58, Sichtbarkeit aus `sheet2.xml <cols>`.

Spaltengruppen (Beleg m_bereicheVerbergen Konstanten vba_full.txt:603+7–10): "Ressourcenplanung" = L:Y, "Logistikdaten" = AC:AI, "Kostenübersicht" = AN:AW. Alle drei Gruppen sind in der Vorlage ausgeblendet und per Button/Menü zuschaltbar.

| Sp. | Kopf (Zeile 4/5) | Bedeutung / Hilfetext | Typ | Pflicht | Wertebereich / Regel | Sichtbar |
|---|---|---|---|---|---|---|
| A | – | Zeilennummern-Hilfsspalte (DV-Liste `$A$6:$A$126` in D209/D297 verweist darauf; Inhalt leer) | – | – | – | ja (Breite 4,8) |
| B | FüSt. | "Hier in den bei den einzelnen Einsatzorten den Namen oder die Funktion der FüSt eintragen" (Kommentar B4); Hinweise Z.11–12: Überschriften der Einsatzstellen (grau, Kopfzeile) bzw. in der ersten Zeile eines Bereichs die Führungsstelle (z. B. "Z Bef St; GrFü FGr B; UEAL xx; EAL xx") | Text | optional | frei | ja |
| C | Bezeichnung | Bezeichnung der taktischen Einheit, "z.B. TZ THW oder TZ-WP THW oder LZ FW oder SanZ DRK" (C4); Hinweise Z.13 | Text | fachlich Pflicht (Zeile ohne C/D/E/F/G/H/I/K/AA und Stärke 0 wird in Auswertung gelöscht, vba_full.txt:560–575) | frei | ja |
| D | Organisation | "Organisation entsprechend Drop Down Menü" (D4) | Enum | fachlich Pflicht (Status!G36 meldet "Einheiten ohne Statusangabe oder Organisation") | ERLAUBTE_ORGANISATIONEN = THW, FW, BW, DRK, JUH, ASB, MALT, DLRG, POL, BPOL, HK/NLWKN, ZIV (vba_full.txt:3091); Formular verwirft andere Werte (ufr_datenEingabe_organisationChange) | ja |
| E | Herkunft | "Hier die Herkunft der Einheit eintragen" (E4); Auswertung-Kommentar E4: "THW Ortsverband oder Herkunft" | Text | optional | frei (z. B. OV-Name) | ja |
| F | Zug | Bezeichnung als Zug, "z.B TZ THW, LZ FW San Betr.Z" (F4) | Text | optional | frei | ja |
| G | Trupp o. Staffel | "z.B. ZTr THW oder FüTr FW oder Tr Log THW" (G4) | Text | optional | frei | ja |
| H | Gruppe | "z.B. FGr N THW oder LGr FW oder Betr.Gr DRK" (H4) | Text | optional | frei | ja |
| I | Person | Einzelpersonen "z.B. Zf, GrF, TeBe, ..." (I4); Hinweise Z.18 "TeBe, FaBe, LNA, Ziv." | Text | optional | frei | ja |
| J | Geräte / Fahrzeuge (inkl. Kennzeichen) | mitgeführte Geräte/Fahrzeuge; "Felder bearbeiten mit Strg + a" (J4); mehrzeilig (Kopiervorlagen enthalten \n-getrennte Listen) | Text mehrzeilig | optional | frei | ja |
| K | Aufträge | "Hier den Einsatzverlauf dokumentieren. Von - bis; Einsatzort und Auftrag" (K4) – Einsatzverlauf/Auftragshistorie als Freitext | Text mehrzeilig | optional | frei | ja |
| L | Erreichbarkeit (Funk / Tel. / eMail) | Erreichbarkeit der Einheit, z. B. Mobilnummer des Einheitenführers (Hinweise Z.21) | Text | optional | frei | nein (Ressourcen) |
| M | Verfügbar bis (Dat. / Zeit) | bis wann verfügbar (Hinweise Z.22); bedingte Formatierung: Zelle wird eingefärbt (theme 9, tint 0,4) wenn `TODAY()>=M-1`, d. h. ab dem Vortag des Ablaufs; leere Zelle keine Färbung (sheet2.xml conditionalFormatting) | Datum/Zeit | optional | Datum; Auswertung formatiert "dd.mm.yyyy hh:mm" (vba_full.txt:441–447) | nein |
| N | Ablösung angefordert (Dat. / Zeit) | Zeitpunkt der Anforderung einer Ablösung (Hinweise Z.23) | Datum/Zeit | optional | | nein |
| O | Anforderungs-ID | Referenz zur Zeile im Bereich "Angefordert"; Form der ID wird mit der THW-Behördenstruktur abgestimmt (Hinweise Z.24–25) | Text | optional | frei | nein |
| P | Zugesagt für (Dat. / Zeit) | für wann zugesagt (Hinweise Z.26) | Datum/Zeit | optional | | nein |
| Q | Zugesagt von (Org.) | zusagende verantwortliche Stelle (Hinweise Z.27) | Text | optional | | nein |
| R | Vorgesehene Einheit | welche Einheit zugesagt wurde (Hinweise Z.28) | Text | optional | | nein |
| S | Vorgesehener Auftrag | geplanter Auftrag der zugesagten Einheit (Hinweise Z.29) | Text | optional | | nein |
| T | eingetr. / zugew. (Dat. / Zeit) | Eintreffen/Zuweisung (Hinweise Z.30) | Datum/Zeit | optional | | nein |
| U | Einsatzende (Dat. / Zeit) | Einsatzende der Einheit (Hinweise Z.31) | Datum/Zeit | optional | | nein |
| V | Rückführung (Dat. / Zeit) | Rückführung (Hinweise Z.32) | Datum/Zeit | optional | | nein |
| W | Bemerkungen | Freitext (Formularfeld txt_bemerkung, Spalte 23) | Text | optional | | nein |
| X, Y | Reserve 1 / Reserve 2 | unbenutzte Reservespalten (Breite 0,5, versteckt) | – | – | – | nein |
| Z | Status | "Status über Drop Down einfügen" (Z4); Hinweise Z.34 | Enum | fachlich Pflicht (Kontrollsumme Status!G36) | ERLAUBTE_STATUSE = Rufbereitschaft, Einsatzvorbehalt, Angefordert, Anmarsch, Rückmarsch, Einsatzbereit, Einsatz, Ruhe, Nicht einsatzbereit (vba_full.txt:3092). Die Zell-DV `F6:J6 → #REF!` ist ein Relikt; die eigentliche Liste steht nur im VBA. Achtung: Blatt Status verwendet für die SUMIF-Aggregation abweichende Kurzformen "Ruf Bereitsch." (Status!B25) und "Einsatzvorbeh." (Status!B26); das Testmodul schreibt genau diese Kurzformen (vba_full.txt:2860–2861). Werte "Rufbereitschaft"/"Einsatzvorbehalt" aus dem Formular würden in Status!B25/B26 NICHT gezählt (Inkonsistenz der Vorlage). | ja |
| AA | Schicht | "Früh / Spät / Nacht (3 Schichten) oder Tag / Nacht (2 Schichten); Vorbelegung 'Tag'" (AA4) | Enum | fachlich Pflicht (Status!G43: "Einheiten ohne Schichtangabe oder Organisation"; Bereich Angefordert ausgenommen) | ERLAUBTE_SCHICHTEN = Tag, Früh, Spät, Nacht (vba_full.txt:3093). In der FüSt-Zeilen fest "Tag"/"Nacht" (AA7..AA16). Beim Verschieben/Kopieren wird `Schicht_Angefordert` geleert (vba_full.txt:4392, 4497) | ja |
| AB | ID Einheiten-erfassungsbogen | Dateiname des EEB "mit oder ohne Dateiendung: F OLDENBURG.pdf / 144 / eeb_F_OLDENBURG" (AB4); VBA m_eeb erzeugt Hyperlink auf `<EEB-Ordner>\<ID>.<pdf|docx|png|jpg|jpeg|odt|svg|webp|avif|heic>` (vba_full.txt:1937–1940, 1986–2020) | Text (Dateiname/Referenz) | optional | Dateiendung aus Liste | ja |
| AC | Weibl. | Anzahl weiblicher Einsatzkräfte (AC4) | Integer ≥0 | optional (Default 0) | numerisch, sonst 0 (ufr_datenEingabe_logDatenChange) | nein (Logistik) |
| AD | Div. | Anzahl Einsatzkräfte divers (AD4) | Integer ≥0 | Default 0 | | nein |
| AE | Veget. | Anzahl Vegetarier (AE4) | Integer ≥0 | Default 0 | | nein |
| AF | Vegan. | Anzahl Veganer (AF4) | Integer ≥0 | Default 0 | | nein |
| AG | ÜN (m) | männliche Einsatzkräfte mit Übernachtungsbedarf (AG4) | Integer ≥0 | Default 0 | | nein |
| AH | ÜN (w) | weibliche mit Übernachtungsbedarf (AH4) | Integer ≥0 | Default 0 | | nein |
| AI | ÜN (d) | diverse mit Übernachtungsbedarf (AI4) | Integer ≥0 | Default 0 | | nein |
| AJ | Fü | Stärke: Anzahl Einheitsführer (Hinweise Z.45) | Integer ≥0 | Default 0 | numerisch, sonst 0 | ja |
| AK | Ufü | Stärke: Unterführer (Hinweise Z.46) | Integer ≥0 | Default 0 | | ja |
| AL | He | Stärke: Helfer (Hinweise Z.47) | Integer ≥0 | Default 0 | | ja |
| AM | Gesamt | `=SUM(AJn:ALn)` (z. B. Stärke!AM126) | Integer, berechnet | – | Formel; Formular zeigt Summe nur an (txt_gesamt, nicht zurückgeschrieben) | ja |
| AN | PSA | `=AMn` – Anzahl notwendiger PSA = Gesamtstärke (AN7) | Integer, berechnet | – | | nein (Kosten) |
| AO | Anz. Pro Tag | "erforderliche Anzahl der PSA pro Tag eintragen. Ist keine PSA erforderlich, dann 0" (AO2) | Integer | Eingabe (FüSt-Zeilen Default 1, sonst 0) | | nein |
| AP | Ges. PSA pro Tag | `=ANn*AOn` (AP7) | berechnet | | | nein |
| AQ | Kosten pro Satz PSA | `=$AQ$3` (Kopffeld AQ3 = 180; Kommentar AQ3 "Kosten pro 1 Satz PSA eintragen") | Währung, berechnet aus Kopf | | | nein |
| AR | Kosten PSA pro Tag | `=ANn*AOn*AQn` (AR7) | berechnet | | | nein |
| AS | VDA pro Tag | `=$AS$3` (AS3 = 150; "VDA Betrag pro Helfer, ggf. Durchschnittswerte") | Währung aus Kopf | | | nein |
| AT | Unterkunft Verpflegung | `=$AT$3` (AT3 = 20; "Verpflegungskosten pro Helfer") | Währung aus Kopf | | | nein |
| AU | Kosten VDA + UK / Verpfl. pro Tag | `=(ASn+ATn)*AMn` (AU7) | berechnet | | | nein |
| AV | Geplante Einsatztage | `=$AV$3*AMn` (AV3 = 5; "für wieviele Einsatztage die Kosten berechnet werden sollen") – Achtung: Zelle enthält Einsatztage × Gesamtstärke (Personentage), nicht Tage | berechnet | | | nein |
| AW | Gesamtkosten | `=IFERROR((ARn+AUn)*AVn/AMn,0)` (AW7) = (Kosten PSA/Tag + Kosten VDA+UK/Tag) × Einsatztage | berechnet | | | nein |

Weitere Feststellungen zum Zeilenmodell:
- Ein Datensatz = eine Zeile in genau einem Bereich; die Bereichszugehörigkeit ist implizit über die Zeilenposition kodiert (kein Attribut). Zuordnung zu einer Einsatzstelle ändert sich durch physisches Verschieben der Zeile (m_zlVerschieben: Copy → Insert → Delete Quelle, vba_full.txt:4480–4500).
- Reihenfolge innerhalb eines Bereichs ist fachlich bedeutsam (erste Zeile = Führungsstelle des Bereichs laut Hinweise Z.12) und wird durch Einfüge-/Verschiebeposition bestimmt.
- Zeilensperre: Zeilen ≤ 22 (FüSt/Meldekopf) und Zeilen mit gesperrter Zelle in Spalte D gelten als gesperrt (m_zlOperationen.hatGesperrteZeilen, vba_full.txt:4310–4333) – Kopfzeilen und Summenzeilen sind nicht verschieb-/löschbar.
- Neue Zeile (Einfügen): Kopie der markierten Zeile, dann `setzeStaerkenZurueck`: B..AA und AB gelöscht, AC..AL = 0, AO = 0 (vba_full.txt:4356–4395).
- FüSt-Zeilen 7–16 sind keine frei editierbaren Einheiten, sondern Projektionen aus Blatt FüSt (B, AJ, AK, AL Formeln), Status/Schicht/Logistikdaten dort aber manuell.
- Tastenkürzel (m_makroFunktionen): Strg+A Eingabemaske (Stärke) bzw. Textfeld-Popup (andere Blätter), Strg+D `=Now` in aktive Zelle, Strg+N Zeilen einfügen, Strg+E entfernen, Strg+K kopieren, Strg+M verschieben, Strg+Shift+M Menü, Strg+Q digitalen EEB (QR) in neue Zeile, Strg+H AküLi, Strg+Shift+P Admin, Strg+Shift+B Blattschutz (vba_full.txt:2330–2520).

## 3. Berechnungen

### 3.1 Zeilenebene (jede Einheitenzeile n; Beleg Stärke!Z.7 bzw. Z.126)
- Gesamtstärke: `AMn = SUM(AJn:ALn)` (Fü+UFü+He).
- PSA-Bedarf: `ANn = AMn`; `APn = ANn*AOn`; `AQn = $AQ$3`; `ARn = ANn*AOn*AQn`.
- Unterkunft/Verpflegung: `ASn = $AS$3`; `ATn = $AT$3`; `AUn = (ASn+ATn)*AMn`.
- Einsatztage: `AVn = $AV$3*AMn`; Gesamtkosten `AWn = IFERROR((ARn+AUn)*AVn/AMn, 0)`.
- Kopffelder: AQ3 = 180 (€/Satz PSA), AS3 = 150 (VDA/Tag/Helfer), AT3 = 20 (Unterkunft+Verpflegung/Tag/Helfer), AV3 = 5 (geplante Einsatztage). Alle vier sind Einsatz-Parameter (Stammdaten), keine Zeilendaten.

### 3.2 FüSt-Kopplung (Stärke ← FüSt)
- Stärke!B7 `=FüSt!B8` ("Stab"), B9 `=FüSt!B49` ("ZTr FK"), B11 `=FüSt!B67` ("FGr F"), B13 `=FüSt!B93` ("FGr K"), B15 `=FüSt!B123` ("Externe").
- Stärke!AJ7:AL7 `=FüSt!D8:F8` (Stab Tag), AJ8:AL8 `=FüSt!D9:F9` (Stab Nacht), AJ9/10 ← FüSt!D49:F50 (ZTr FK Tag/Nacht), AJ11/12 ← D67:F68 (FGr F), AJ13/14 ← D93:F94 (FGr K), AJ15/16 ← D123:F124 (Externe).
- Schicht AA7..AA16 fest "Tag"/"Nacht" (Werte), Status/Logistikdaten manuell.

### 3.3 Bereichssummen (Kopfzeile jedes Bereichs)
- Für jede Spalte S ∈ {AC..AM, AP, AR, AU, AV, AW}: `S_kopf = SUM(S_erste:S_letzte)`, z. B. AC124 `=SUM(AC125:AC136)`, AJ199 `=SUM(AJ200:AJ208)`.
- FüSt-Block: Zeile 6 `=SUM(x7:x16)`. Meldekopf/Sonstiges hat keine Kopfsumme; die Zeilen 17–22 gehen einzeln in die Gesamtsumme ein.
- Bekannte Vorlagenfehler: AV162 `=SUM(AV168:AV184)` statt AV163 (Bereitstellung 1); Angefordert-Kopf (Z.138) hat keine AV-Summe.

### 3.4 Gesamtsumme (Zeile 5)
- `X5 = X6 + X17 + X18 + X19 + X20 + X21 + X22 + X124 + X138 + X162 + X186 + X199 + X210 + X221 + X232 + X243 + X254 + X265 + X276 + X287 + X298 + X309 + X320 + X331 + X342 + X353 + X364 + X375 + X386 + X398 + X409 + X420` für X ∈ AC..AM (inkl. Angefordert).
- Für Kosten AP5, AR5, AU5, AV5, AW5: gleiche Summe, aber OHNE X138 (Angefordert/Anmarsch wird bei Kosten nicht mitgerechnet). Kopiervorlagen (Z.23–122) und "Einsatz beendet" (ab Z.431) gehen nirgends ein.

### 3.5 FüSt-Blatt (Beleg sheet_FüSt.tsv)
- Teilbereichszeile Tag: `D8 = SUMIF($C$10:$C$47,$C$8,D$10:D$47)` (alle "Tag"-Zeilen des Stab-Blocks, Spalte Fü), analog E (UFü), F (He); Nacht `D9` mit `$C$9`. Entsprechend D49/D50 über C52:C65 (ZTr FK), D67/D68 über C70:C91 (FGr F), D93/D94 über C96:C121 (FGr K), D123/D124 über C126:C139 (Externe). `G = SUM(D:F)`.
- Gesamt FüSt: `D7 = D8+D9+D49+D50+D67+D68+D93+D94+D123+D124` (analog E7, F7), `G7 = SUM(D7:F7)`.
- Vorlagenfehler: F93 `=SUMIF($C$96:E$121,$C96,…)` verwendet `$C96` (Zelle "Tag" der ersten Funktionszeile) statt `$C93` – funktioniert nur zufällig, weil C96 = "Tag". Mehrere SUMIF-Bereiche sind schief (`$C$52:C65`, `$C$70:C$91`), Excel nutzt nur die erste Spalte, daher wirkungslos.

## 4. Ableitungsblätter

### 4.1 Druck (sheet3, "Stärke auf der Lagekarte")
- Kopf: C2 `=Stammdaten!C4` (Einsatzname), C3 `=Stammdaten!C5` (FüSt-Name), E4 `=NOW()`, S4 = Organisationsfilter (Vorbelegung "THW"; ActiveX-ComboBox activeX34, Zoom-Button btn_zoom selektiert S4, vba_full.txt:197–206).
- Eine Zeile je Bereich (Z.7 FüSt, 8 BR1, 9 BR2, 10 Sonstiges Führung, 11 Logistik, 12 Bereitstellung 1, 13 Bereitstellung 2, 14–34 Einsatzort 1–21). Bereich "Angefordert / Anmarsch" ist bewusst NICHT enthalten (Druck!E35 "(ohne Kräfte aus dem Bereich 'Angefordert / Anmarsch')").
- Spalten: B laufende Nr. (`=IF(Stärke!$AM199>0,1,"")`), C Bereichsname (`=IF(Stärke!$AM6>0,Stärke!B6,"")`), E/G/I/K = Fü/UFü/He/Gesamt aus der Bereichs-Kopfzeile (`=IF(Stärke!$AM6>0,Stärke!AJ6,"")` …), F/H/J Trennzeichen "/", "/", "=", L Plausibilität `=IFERROR("",IF(E+G+I-K=0,"o.k.","Fehler"))` (CF grün "o.k."/rot "Fehler").
- "Davon Stärke: <Org>" M/O/Q/S: `=SUMIFS(Fü_<Bereich>,<Bereich>_Herkunft,S4)` usw. – Filter über Spalte D (Organisation) des jeweiligen Bereichs (Druck!M7 `=SUMIFS(Fü_FüSt,FüSt_Herkunft,S4)`; für Einsatzort 11–21 als Array-Formeln). CF färbt M4:S34 je nach S4-Wert (12 Organisationsfarben, dxf 14–25).
- Zeile 6 "Gesamt": `E6=SUM(E7:E34)` usw., L6 Plausibilität.
- Worksheet_Activate blendet Zeilen mit leerer Gesamtstärke aus (t_druck, vba_full.txt:208–224). HTML-Export "$B$4:$K$35" (m_htmlExport) mit 60-s-Auto-Reload für Lagedarstellung im Browser.
- Anomalie: Druck!C26 verweist auf Stärke!B330 (Name), Zahlen aber auf Zeile 331 (siehe Einsatzort_13-Versatz).

### 4.2 Status (sheet4, "Stärke nach Organisationen / Status / Schichten")
- Block 1 "Stärke nach Organisationen" (Z.7–18, je Organisation THW, FW, BW, DRK, JUH, ASB, MALT, DLRG, POL, BPOL, HK/NLWKN, ZIV): `D=SUMIF(Stärke!$D$7:$D$429,$B7,Stärke!AJ$7:AJ$429)` (Fü), F (AK), H (AL), `J=SUMIF(Stärke!$D$6:$D$429,$B7,Stärke!AM$6:AM$429)` (Gesamt); Unterbringung/Einsatzkräfte: `N`=Weibl. (AC), `M=J-N` (Männl. = Gesamt − Weibl.; Divers wird hier NICHT abgezogen), `O`=Veget. (AE), `P`=ÜN(m) (AG), `Q`=ÜN(w) (AH). Zeile 20 Summen.
- Block 2 "Status der Einsatzkräfte" (Z.25–33): je Statuswert `D=SUMIF(Stärke!$Z$7:$Z$429,$B25,Stärke!$AJ$7:$AJ$429)` usw.; Statusliste hier: "Ruf Bereitsch.", "Einsatzvorbeh.", "Angefordert", "Anmarsch", "Rückmarsch", "Einsatzbereit", "Einsatz", "Ruhe", "Nicht einsatzbereit". Kontrollsumme Z.35; G36 `=IF((J35-J20)<>0,"Einheiten ohne Statusangabe oder Organisation","o.k.")`.
- Block 3 "Schichten" (Z.38–41 Tag, Nacht, Früh, Spät): `D=SUMIF(Stärke!$AA$7:$AA$429,$B38,Stärke!$AJ$7:$AJ$429)` …; Kontrollsumme Z.42; G43 `=IF((J42-J20+Stärke!AM138)<>0,"Einheiten ohne Schichtangabe oder Organisation","o.k.")` — Angefordert-Kräfte (AM138) dürfen ohne Schicht sein.
- Wichtig: Die SUMIF-Bereiche $7:$429 umfassen auch die Kopiervorlagen (Z.24–122); deshalb setzt das VBA vor jeder Operation deren Stärke/Status/Schicht auf 0/"" (btn_menue_Click, m_zlKopieren, m_zlVerschieben).
- Gesamtsumme J20 zählt inkl. Angefordert (im Gegensatz zu Druck).

### 4.3 Log (sheet5, "Logistik Details") und LogFrei (sheet10)
- Eine Zeile je Bereich (7 FüSt, 8 BR1, 9 BR2, 10 Sonstiges Führung, 11 Logistik, 12/13 Bereitstellung 1/2, 14–34 Einsatzort 1–21), C = Bereichsname (`=Führungsstelle`, `=Einsatzort_1` …).
- Schichtbetrieb D–G: `D7=SUMIFS(Summe_FüSt,Stärke!$AA7:$AA16,Log!D6)` für Früh/Spät/Tag/Nacht (Gesamtstärke je Schicht und Bereich); Einsatzorte über `Schicht_Einsatzort_n`.
- H Summe `=IF(Stärke!$AM6>0,Stärke!AM6,0)`; Einsatzkräfte: J = W (AC), K = D (AD), `I = H-J-K` (M = Gesamt − W − D), L Veget (AE), M Vegan (AF); Unterbr.: N = ÜN m (AG), O = ÜN w (AH), P = ÜN d (AI).
- Z.35 Gesamt `=SUM(D7:D34)`…; Z.36 Hinweis "(ohne Kräfte aus dem Bereich 'Angefordert / Anmarsch')"; Z.38 separat "Kräfte aus dem Bereich Angefordert/Anmarsch": H `=Stärke!AM138`, J..P aus AC138..AI138.
- Worksheet_Activate blendet Zeilen mit Summe 0 aus (t_log). HTML-Export "$B$1:$F$39".
- LogFrei = Werte-Kopie von Log!C7:P34 und C38:P38 per Makro `kopiereLogInLogFrei` (vba_full.txt:577–602), ungeschützt, Stand in E4; dient dem freien Weiterverarbeiten/Export.

### 4.4 Auswertung (sheet9, "freie Auswertung")
- Flache, filterbare Tabelle (AutoFilter A4:AM4, ungeschützt) mit identischem Spaltenlayout wie Stärke B..AM, plus Spalte A = Bereichsname ("FüSt", Wert von `Angefordert`, `Logistik`, `Bereitstellung_1/2`, `Einsatzort_n`) — d. h. hier wird die implizite Bereichszugehörigkeit erstmals als Attribut materialisiert.
- Befüllung per Makro `kopiereStaerkeInAuswertung` (vba_full.txt:409–575): Werte-Kopie von B7:AB22 + AC7:AM22 (FüSt/Meldekopf), dann Bereich_Angefordert, Bereich_Logistik, Bereitstellung 1/2, Einsatzort 1–21 (Kopiervorlagen und "Einsatz beendet" nicht). Zeilen mit Gesamt 0/leer UND leeren Feldern B,C,D,E,F,G,H,I,K,AA werden gelöscht (Löschprüfung nutzt Spalte AI statt AM — Vorlagenfehler, Konstante GESAMT_SPALTE="AI" in vba_full.txt:556).
- Zeile 3: `=SUBTOTAL(9,AC5:AC740)` … `AM` (filtersensitive Summen; VBA schreibt `Teilergebnis(9;…1000)`); B1 Stand.
- Ressourcen-Spalten L:Y per Button ausblendbar (m_bereicheVerbergen.verbergeAuswertungRessourcen).

### 4.5 FüOrg (sheet6, "Führungsharke")
- Reines Zeichenblatt (drawing4.xml): Organigramm-Shapes mit Textfeldern "Name_Vorgesetzte_FüSt", "Name_Füst", "Name_Einsatz_Übung", Kästen "Bereitstellung 1", "Bereitstellung 2", "Logistik", "TZ- / ..", "HK", sowie verknüpfte Textfelder `Stärke_Fü_FüSt`, `Stärke_UFü_FüSt`, `Stärke_He_FüSt`, `Stärke_Ges_FüSt` (Fü / UFü / He = Ges der FüSt). Hinweise "Nur Kopieren - nicht verschieben", "Zum Bearbeiten / Arbeitsblatt kopieren / Original nicht verändern". N7 `=NOW()`.
- Kein Datenmodell; Hinweise Z.110: Vorlage für taktische Zeichen / Führungsstruktur für die Lagekarte. Hinweise Z.125–126: Anpassung der FüOrg erfolgt durch Umbenennen freier Bereiche (EA/UEA) und Verschieben der Einheiten.

## 5. Blatt FüSt (Eigene Stärke der Führungsstelle)

Struktur (sheet_FüSt.tsv, defined_names): Kopf B2 "Eigene Stärke", I2 `=Stammdaten!C4`, I3 `=Stammdaten!C5`, C3 `=NOW()`; Spalten B Funktion, C Schicht, D Fü, E Ufü, F He, G Gesamt; ab Spalte I "Schicht Planung >>>>" (I = Funktion (Formel `=IF(B10>"",B10,"")`), J..AS je ein Datum (J7 = 14.04.2025, K7 = 15.04.2025 als Beispiel; Zeile 8 "Tag", Zeile 9 "Nacht" als Legende), I1 = 10 Zähler für versteckte Spalten (m_bereicheVerbergen.verbergeFueStSchichtSpalte, vba_full.txt:770–795; Spalte Q ist in der Vorlage bereits versteckt).

Teilbereiche (jeweils Summenzeile Tag/Nacht, dann Funktionszeilen paarweise Tag/Nacht):
| Teilbereich | Summenzeilen | Funktionszeilen (`Bereich_*`) | Vorbelegte Funktionen (Spalte B) |
|---|---|---|---|
| Stab | 8 (Tag) / 9 (Nacht) | B10:C47 | Ltr FüSt, Ltr Stab, SGL 1, FüGeh SG 1 (×2), SGL 2, FüGeh SG 2 (×2), SGL 3, FüGeh SG 3, SGL 4, FüGeh SG 4, SGL 5, SGL 6, 5 Leerpaare |
| ZTr FK | 49 / 50 | B52:C65 | Ltr FZ FK, ZTrFü FK, SprFu/Kf, He ZTr, 3 Leerpaare |
| FGr F | 67 / 68 | B70:C91 | GrFü F, SprFu/Kf, LdF, SprFu, SPrFu/SprFu, 6 Leerpaare |
| FGr K | 93 / 94 | B96:C121 | GrFü K, SprFu/Kf, SprFu, TrFü K, He K (×2), 7 Leerpaare |
| Externe | 123 / 124 | B126:C139 | 7 Leerpaare |

- Erfassungslogik (Hinweise Z.111–115): je Funktion eine Tag- und eine Nachtzeile; die Stärke wird tagesaktuell durch Eintrag "1" in D/E/F (Fü/Ufü/He) gesetzt; Summen per SUMIF über Spalte C ("Tag"/"Nacht"). Ergebnis fließt in Stärke!AJ7:AL16 (siehe 3.2). Bedingte Formatierung färbt C="Nacht" grau (sheet7.xml CF, dxf 2–9).
- Schichtplanung (Spalten J..AS): Freitext je Funktion × Datum, z. B. J10 = "Meyer, Anton / SGL 1 - 4, Ltr FüSt / THW OV Irgendwo / Mob. 0123-456789 / Mail: … / Bem: Nur Tagschichten" — Personendaten (Name, Herkunft OV, Erreichbarkeit, Einsatzoptionen) als mehrzeiliger Text. "Der Planungsbereich hat keine weiteren Verknüpfungen" (Hinweise Z.115). Spalten für vergangene Tage werden per +/- Button ausgeblendet; rechts erweiterbar.
- Damit ist FüSt fachlich ein zweites Modell: Funktion (Dienstposten) × Schicht × Rolle (Fü/UFü/He) → Besetzung (0/1), plus Dienstplan Funktion × Tag → Person(en).

## 6. Blatt AküLi (Abkürzungsliste, Tabelle `AküLi_Tabelle` A1:B111, veryHidden, per Strg+H als Formular)

### 6.1 Einheiten
| Abkürzung | Bedeutung |
|---|---|
| FM Veg | Fachmodul Vegetationsbrandbekämpfung |
| FGr VersES | Fachgruppe Versorgung und Eigenschutz |
| FM Hfs | Fachmodul Hochleistungsförderpumpensystem |
| FüGr FB Nds | Führungsgruppe Feuerwehrbereitschaft Nds |
| FZ BS | Fachzug Brandschutz |
| FZ TH | Fachzug Technische Hilfe |
| FZ VegBBK | Fachzug Vegetationsbrandbekämpfung |
| FZ WT | Fachzug Wassertransport |
| GE MobHWS | Geräteeinheit mobiles Hochwasserschutzsystem |
| GE SFM | Geräteeinheit Sandsackfüllmaschine (GE SFM) |
| Gr BT | Gruppe Betreuung |
| Gr EV | Gruppe Energieversorgung |
| Gr Fü | Gruppe Führung |
| Gr LT | Gruppe Logistik und Technik |
| Gr San | Gruppe Sanitätsversorgung |
| Gr STau | Gruppe Spezial Tauchen |
| Gr Tau | Gruppe Einsatz Tauchen |
| Gr Vpf | Gruppe Verpflegung |
| Gr WR | Gruppe Wasserrettung |
| GTr W | Gerätetrupp Wassergefahren |
| LG | Löschgruppe |
| St BtL | Staffel Betreuungstransport- und -leitung |
| St Log Schlauch | Staffel Logistik Schlauch |
| St Log WT | Staffel Logistik Wassertransport |
| St PSNV | Staffel Psychosoziale Notfallversorgung |
| St PT | Staffel Patiententransport |
| St Reg | Staffel Registrierung |
| St StrWR | Staffel Strömungswasserrettung |
| St WR | Staffel Wasserrettung |
| StLog WE | Staffel Logistik Wasserentnahme |
| Tr Akl | Trupp Aufklärung Luft |
| TR L | Trupp Logistik schwer |
| Tr Log Schlauch | Trupp Logistik Schlauch |
| Tr LogFü | Trupp Logistik Führung |
| Tr ML | Trupp Melde- und Lotsen |
| Tr T | Trupp Transport Bus 50 |
| Tr TH | Trupp Technische Hilfe |
| Tr VegBBK | Trupp Vegetationsbrandbekämpfung |
| Tr WT | Trupp Wassertransport |
| Z SB | Zug Sanität und Betreuung |
| ZTr | Zugtrupp |
| ZTr WR | Zugtrupp Wasserrettung |

### 6.2 Fahrzeuge und Geräte
| Abkürzung | Bedeutung |
|---|---|
| AB HFS | Abrollbehälter mit Hochleistungsförderpumpensystem |
| AB Log | Abrollbehälter Logistik |
| AB Mulde | Abrollbehälter Mulde |
| AB Veg | Abrollbehälter Vegetationsbrandbekämpfung |
| Anh | Anhänger |
| Anh Bt | Anhänger Betreuung |
| Anh Kühl | Kühlanhänger |
| Anh Log | Anhänger für Logistikzwecke |
| Anh Tank | Anhänger mobile Kraftstoffversorgung |
| Anh Trsp | Anhänger zum Transport |
| Anh Zelt | Anhänger Zelt |
| DLK 23/12 | Drehleiter Korb, Rettungshöhe 23 m, Ausladung 12 m |
| ELW 1 | Einsatzleitwagen 1 |
| ELW 2 | Einsatz Leit Wagen 2 |
| FKH | Feldkochherd |
| FüKw | Führungs Kraftwagen |
| GW Bt | Gerätewagen Betreuungsdienst |
| GW L 7,5 | Gerätewagen Logistik „7,5“ |
| GW L Gr | Gerätewagen Logistik groß |
| GW L kl | Gerätewagen Logistik klein |
| GW San | Gerätewagen Sanitätsdienst |
| GW SpTau | Gerätewagen Spezialtauchen |
| GW Tau | Gerätewagen Tauchen |
| GW Vpf | Gerätewagen Verpflegung |
| GW WGT | Gerätewagen Wassergefahren / Technik |
| GW-L1 Vpf | Gerätewagen Logistik 1 Verpflegung |
| GW-L1BTrMt | Gerätewagen Logistik 1 Betriebsmittel |
| GW-L2 | Gerätewagen Logistik 2 |
| GW-L2 HFS | Gerätewagen-Logistik 2 mit Hochleistungsförderpumpensystem |
| GW-L2 SW | Gerätewagen Logistik 2 Schlauch |
| GW-L2 TH | Gerätewagen Logistik 2 Technische Hilfe |
| GW-L2 Vers | Gerätewagen Logistik 2 Versorgung |
| GW-Str | Gerätewagen Strömungsrettung |
| GW-WR | Gerätewagen Wasserrettung |
| HWB | Hochwasserschutzboot |
| KdoW | Kommando Wagen |
| KOM | Kraft Omnibus |
| Kombi UAV | Kombinationskraftwagen Unbemanntes Luftfahrzeug |
| Kombi-L | Kombinationskraftwagen Logistik |
| Krad | Kraftrad |
| KTW | Kranken Transport Wagen |
| LF 20/16 | Löschfahrzeug 20/16 (2000 ltr/min, 1600 ltr Tank) |
| LF KatS | Löschgruppenfahrzeug Katastrophenschutz |
| LKW K | Lastkraftwagen Kipper |
| LZ FW | Löschzug Feuerwehr |
| Mat Cont | Materialcontainer |
| MTW | Mannschaft Transport Wagen |
| MTW Bt | Mannschaft Transport Wagen Betreuung |
| MTW Vpf | Mannschaftstransportwagen Verpflegung |
| MTWm | Mannschaftstransportwagen multifunktional |
| MZB KatS | Mehrzweckboot Katastrophenschutz |
| NEA 250 | Netzersatzanlage 250 kVA |
| NEA LiMa | Netzersatzanlage mit Lichtmast |
| Raft | Schlauchboot |
| RTW | Rettungswagen |
| RW | Rüstwagen |
| SMF | Sandsackfüllmaschine, elektromechanisch |
| SW KatS | Schlauchwagen Katastrophenschutz |
| TB KS 6000 L | mobiler Tankbehälter Kraftstoff 6000 Liter |
| TLF 16/25 | Tank Löschfahrzeug 16/25 (1600 ltr/min, 2500 ltr Tank) |
| TLF 2000 | Tanklöschfahrzeug 2000 |
| TLF 3000 | Tanklöschfahrzeug 3000 |
| TSF | Tragkraftspritzen Fahrzeug |
| UslG | Umschlaggerät |
| WLF | Wechsellader Fahrzeug |
| ZTrKw | Zugtruppkraftwagen |

Hinweis: Die AküLi deckt nur KatS-Nds/Feuerwehr-Vokabular ab; die THW-Kürzel der Kopiervorlagen (FGr N, R, W, WP, Öl, BrB, O, Sp, SB, E, TW, I, BT, Log-MW/V, ESS, MHP, UL, TS, FK, F, K, MTW OV, GKW, MzGW, MLW IV, LKW-K/Lkr/Lbw, Anh PF/NEA/DLE/Tiefl/MzAB/SwPu/TWAA/FüLa/RiFu, FüKW, FüKomKW, FmKW, MastKW, SZM, AB Wks/SepCon/TW-Labor/TW-Tank) stehen nur implizit in Stärke!C25:J70.

### 6.3 Katalog der Kopiervorlagen (Einheitstypen), Stärke!Z.25–121
THW (Organisation "THW", Zeilen 25–70): OV-Stab (MTW OV); MT (MTW TZ, Anh MT 2t); TZ [Zug] mit ZTr TZ, B, N; ZTr TZ (FüKW); B (GKW, Anh 7t); B(ASH) (+Anh Ru 12t); FGr R(A)/R(B)/R(C); FGr W(A)/W(B); FGr BrB; FGr O(A)/O(B)/O(C); FGr Sp; FGr N; FGr SB(A)/SB(B); Tr ESS; Tr MHP; Tr UL; FGr BT; FGr I; FGr E; FGr TW; FGr WP(A)/(B)/(C); FGr Öl(A)/(B)/(C); FZ Log [Zug] mit ZTr FZ Log, Log-M, Log-VG, Log-MW, Log-V; ZTr FZ Log; FGr Log-MW; Tr Log M; Tr Log VG; FGr Log V; Tr TS; FZ FK(A)/(B) [Zug] mit ZTr FK, F, K(A)/K(B), Stab; ZTr FZ FK; FGr F; FGr K(A)/K(B); Stab. Jede Vorlage belegt Zug (F) / Trupp-Staffel (G) / Gruppe (H) entsprechend der taktischen Ebene und listet Fahrzeuge in J. Stärke-Werte sind in der Vorlage 0 (StAN-Stärken NICHT hinterlegt; Hinweise Z.157: "in der Kopiervorlage keine Stärken … eingetragen").
Feuerwehr (Org "FW", Z.76–80): LZ FW mit ZTr (ELW 1), LGr (LF 20/16), LSt (TLF 16/25), LTr (DLK 23/12).
KatS Nds (Z.83–121, ohne Organisationsangabe): FM VEG, FM HFS, FüGr FB NDS, FGr VersES, FZ BS (ZTr, Tr Log Schlauch, 2x LG), ZTr, Tr Log Schlauch, LG, FZ TH (Tr TH), FZ VegBBK (4x Tr VegBBK, St Log Wasserentnahme), FZ WT (4x Tr WT, St Log WT), Gr WR (St WR, St StrWR), Gr Tau, Gr STau, GTrW, St PT, Z SB (ZTr SB, Gr San, Gr BT), St PSNV, Gr Vpf, St Reg, St BtL, Tr T, Gr LT (Tr Log-Fü), Gr EV, Tr L, Gr Fü, ZTr-WR, Tr ML, Tr Akl, GE SFM, GE mobHWS.

## 7. Zellkommentare als Feldhilfetexte (comments1.xml = Stärke, comments2.xml = Auswertung)

| Zelle | Hilfetext (bereinigt) |
|---|---|
| Stärke!AO2 | Hier die erforderliche Anzahl der PSA pro Tag eintragen. Ist keine PSA erforderlich, dann "0" |
| Stärke!AQ3 | Hier die Kosten pro 1 Satz PSA eintragen |
| Stärke!AS3 | Hier den VDA Betrag pro Helfer eintragen, ggf. mit Durchschnittswerten arbeiten |
| Stärke!AT3 | Hier die Verpflegungskosten pro Helfer eintragen |
| Stärke!AV3 | Angabe für wieviele Einsatztage die Kosten berechnet werden sollen |
| Stärke!B4 | Hier in den bei den einzelnen Einsatzorten den Namen oder die Funktion der FüSt eintragen |
| Stärke!C4 | z.B. TZ THW oder TZ-WP THW oder LZ FW oder SanZ DRK u.s.w. |
| Stärke!D4 | Organisation entsprechend Drop Down Menü |
| Stärke!E4 | Hier die Herkunft der Einheit eintragen (Auswertung!E4: "Hier THW Ortsverband oder Herkunft der Einheit eintragen") |
| Stärke!F4 | z.B. TZ THW, LZ FW San Betr.Z, … (Auswertung!F4: "TZ, LZ, SanZ, ...") |
| Stärke!G4 | z.B. ZTr THW oder FüTr FW oder Tr Log THW u.s.w. |
| Stärke!H4 | z.B. FGr N THW oder LGr FW oder Betr.Gr DRK u.s.w. |
| Stärke!I4 | z.B. Zf, GrF, TeBe, ... |
| Stärke!J4 | Felder bearbeiten mit Strg + a |
| Stärke!K4 | Hier den Einsatzverlauf dokumentieren. Von - bis; Einsatzort und Auftrag. Funktion Strg+a nutzen |
| Stärke!Z4 | Status über Drop Down einfügen, Vorbelegung "Tag" [sic – gemeint ist AA] |
| Stärke!AA4 | Hier entweder Früh / Spät / Nacht (3 Schichten) oder Tag / Nacht (2 Schichten) eintragen; Vorbelegung "Tag"; Auswahl über Drop Down |
| Stärke!AB4 | Dateinamen mit oder ohne Dateiendung: - F OLDENBURG.pdf - 144 - eeb_F_OLDENBURG |
| Stärke!AC4 | Hier die Anzahl der weiblichen Helferinnen eintragen |
| Stärke!AD4 | Hier die Anzahl der Helfer:innen (d) eintragen |
| Stärke!AE4 | Hier die Anzahl der Vegetarier eintragen |
| Stärke!AF4 | Hier die Anzahl der Veganer eintragen |
| Stärke!AG4 | Hier die Anzahl der männlichen Helfer mit Übernachtung eintragen |
| Stärke!AH4 | Hier die Anzahl der weiblichen Helferinnen mit Übernachtung eintragen |
| Stärke!AI4 | Hier die Anzahl der Helfer:innen (d) mit Übernachtung eintragen |
| Stärke!B6, B17, B19, B21, B124, B162, B186, B199 … B420 | Bezeichnung ggf. anpassen (alle Bereichsnamen sind umbenennbar) |

Ergänzende Prozess-Hilfetexte aus Blatt Hinweise (Z.155–172): Kopiervorlagen-Nutzung; "Meldekopf Funktion": ausgelagerter Meldekopf erfasst EEB-Daten zeilenweise in einer Google-Tabelle (Spalten "FüSt" bis "ID Einheiten-Erfassungsbogen" identisch), Neueinträge gelb markiert, Übernahme in die Kräfteübersicht per Zwischenablage (Strg+C, Einfügen "Formeln"/"Zieldesign"), danach grün markiert; Meldekopf führt eigenes ETB. Das heißt: die Excel kennt bereits einen Zwei-Stellen-Prozess (Meldekopf → FüSt) mit manuellem Übertrag und Ampel-Quittierung.

## 8. (a) ER-artiges Zielmodell (fachlich 1:1 zur Excel)

### 8.1 Entitäten und Attribute

**Einsatz** (Blatt Stammdaten + Kopffelder Stärke!AQ3/AS3/AT3/AV3 + Startseite!IV*)
- name (Stammdaten!C4 "Name des Einsatzes oder der Übung"; wird für Dateinamen verwendet: `<Einsatz>_Stärkeübersicht_<yyyy_mm_dd_hhmm_ss>.xlsm` und `<Einsatz>_Stärkeübersicht_Aktuell`, m_speichern.getDateiname)
- fuestName (Stammdaten!C5), uebergeordneteFuestName (Stammdaten!C6)
- kostenParameter: psaKostenProSatz (AQ3, Default 180), vdaProTag (AS3, 150), unterkunftVerpflegungProTag (AT3, 20), geplanteEinsatztage (AV3, 5)
- eebOrdnerPfad (Startseite!IV11, relativ zur Arbeitsmappe bevorzugt), autoSpeichernIntervallMin (IV7, 10), autoHtmlExportIntervallMin (IV10, 1), versionstext (IV4)

**Einsatzstelle / Bereich** (Kopfzeilen des Blatts Stärke; benannte Bereiche `Führungsstelle`, `Meldekopf_FüSt_BR_1/2`, `Sonstiges_Führung`, `Logistik`, `Angefordert`, `Bereitstellung_1/2`, `Einsatzort_1..21`, plus impliziter Bereich "Einsatz beendet"/Archiv)
- typ: Enum {FUEHRUNGSSTELLE, MELDEKOPF_BR, SONSTIGES_FUEHRUNG, LOGISTIK, ANGEFORDERT, BEREITSTELLUNGSRAUM, EINSATZORT, ARCHIV_BEENDET, KOPIERVORLAGE}
- name (frei änderbar, Kommentar "Bezeichnung ggf. anpassen"), laufendeNummer (Einsatzort 1..21), reihenfolge
- kapazitaet in der Excel fest (Zeilenanzahl: FüSt 10, Meldekopf 2×3, Logistik 12, Angefordert 22, BR1 22, BR2 11, Einsatzort je 9) – im Zielmodell entfällt die Grenze
- Regeln: zaehltInGesamtstaerke (alle außer KOPIERVORLAGE/ARCHIV), zaehltInKosten (zusätzlich nicht ANGEFORDERT), zaehltInDruck/Log (nicht ANGEFORDERT), schichtPflicht (nicht ANGEFORDERT, Status!G43), sichtbar (Ein-/Ausblenden je Bereich)

**Einheit** (eine Zeile B..AW; Kern der Domäne)
- Zuordnung: einsatzstelleId (aus Zeilenposition), position (Zeilenreihenfolge), istFuehrungsstelleDesBereichs (Konvention: erste Zeile, Hinweise Z.12)
- Identifikation/Bezeichnung: fuestKennung (B), bezeichnung (C), organisation (D, Enum Organisation), herkunft (E, z. B. OV)
- taktische Gliederung: zug (F), truppStaffel (G), gruppe (H), person (I) – vier optionale Texte, die die taktische Ebene ausdrücken (genau eine/mehrere gefüllt)
- geraeteFahrzeuge (J, Liste/Text inkl. Kennzeichen), auftraege (K, Einsatzverlauf-Freitext)
- Ressourcenplanung: erreichbarkeit (L), verfuegbarBis (M, Zeitpunkt), abloesungAngefordertAm (N), anforderungsId (O, Referenz auf Anforderung/Angefordert-Zeile), zugesagtFuer (P), zugesagtVon (Q, Stelle/Org), vorgeseheneEinheit (R), vorgesehenerAuftrag (S), eingetroffenZugewiesenAm (T), einsatzendeAm (U), rueckfuehrungAm (V), bemerkungen (W)
- status (Z, Enum Status), schicht (AA, Enum Schicht), eebId (AB, Dateiname/Referenz auf EEB-Dokument)
- Logistikdaten: anzahlWeiblich (AC), anzahlDivers (AD), anzahlVegetarisch (AE), anzahlVegan (AF), uebernachtungM (AG), uebernachtungW (AH), uebernachtungD (AI)
- Stärke: fue (AJ), ufue (AK), he (AL); abgeleitet gesamt = fue+ufue+he (AM); abgeleitet maennlich = gesamt − weiblich − divers (Log!I)
- Kosten: psaProTag (AO, Eingabe; Default 1 in FüSt-Zeilen, sonst 0); abgeleitet: psaBedarf (AN=gesamt), psaGesamtProTag (AP), kostenPsaProTag (AR), kostenVdaUkProTag (AU), gesamtkosten (AW)
- Herkunft des Datensatzes (implizit): manuell, Kopiervorlage (m_zlKopieren), Meldekopf-Tabelle (Zwischenablage), digitaler EEB (QR, m_digitalerEEB)

**Einheitstyp / Kopiervorlage** (Stärke!Z.25–121)
- organisation, bezeichnung (C), zug/truppStaffel/gruppe-Belegung (F/G/H), standardGeraeteFahrzeuge (J), katalog {THW-StAN, KatS-StAN-Nds, Feuerwehr}; StAN-Stärke im Excel nicht hinterlegt (0)
- Abkürzung → Langname (AküLi, 42 Einheiten + 66 Fahrzeuge/Geräte)

**FüSt-Teileinheit** (FüSt-Blatt: Stab, ZTr FK, FGr F, FGr K, Externe) — Spezialfall von Einheit mit Ableitung aus Dienstposten
- Projektion in Stärke Z.7–16 als je zwei Einheiten-Zeilen (Tag/Nacht) mit status/logistikdaten manuell

**Dienstposten (Funktion)** (FüSt!B10..B139)
- teileinheit, funktionsbezeichnung (Ltr FüSt, Ltr Stab, SGL 1..6, FüGeh SG n, Ltr FZ FK, ZTrFü FK, SprFu/Kf, He ZTr, GrFü F, LdF, SprFu, GrFü K, TrFü K, He K, …), schicht (Tag/Nacht — jede Funktion existiert als Tag- und Nachtzeile)
- besetzung: rolleFue (D), rolleUfue (E), rolleHe (F) je 0/1 ("1" eintragen) — tagesaktuell

**Schichtplan-Eintrag** (FüSt!J10:AS139)
- dienstposten × datum (Spaltenkopf Zeile 7) → personText (Name, Funktion, Herkunft, Erreichbarkeit, Bemerkung; Freitext)

**Einheiten-Erfassungsbogen (EEB)** – zwei Ausprägungen
- Datei-Referenz: eebId → Datei in eebOrdner mit Endung pdf|docx|png|jpg|jpeg|odt|svg|webp|avif|heic (m_eeb)
- Digitaler EEB (QR-Code, erfassungsbogen.app, Schema 2..8, m_digitalerEEBParsing `TEebBogen`): schemaVersion, uebung, stand, organisation (Enum 1 THW, 2 Feuerwehr, 3 Polizei, 4 Bundespolizei, 5 DRK, 6 JUH, 7 MHD, 8 ASB, 9 DLRG, 10 Bundeswehr, 11 Rettungsdienst, 255 Sonstige) + organisationName, einheitsTyp, einheitOrt, hierarchie (Ebenen mit Bezeichnung/Name/Telefon/E-Mail/Kurzform), standortRef (THW-OV-Nr.), ortAuftrag, zeitraumVon/Bis, einsatzbeginn/-ende, personalErfassung (vollständig | nur Stärke), staerkeFuehrer/Unterfuehrer/Mannschaft/Gesamt, staerkeManuell, unterbringungM/W/D, vegetarisch, vegan, Sofortbedarf {verpflegungPersonen, dieselLiter, benzinLiter, gemischLiter, unterbringung, ruhezeit}, sonstiges, signaturstufen
  - Person: nachname, vorname, staerkeRolle (0 Mannschaft, 1 Unterführer, 2 Führer), funktionen[], fahrerlaubnis (AM…DE, mehrere), geschlecht (0 M, 1 W, 2 D), ernaehrung (0 Fleisch, 1 vegetarisch, 2 vegan), kontakte[] (Mobil/Festnetz/E-Mail, dienstlich/privat), qualifikationen[]
  - Fahrzeug: typ, kennzeichen, funkrufname (Kennwort + Ort + Teilkennung), stanKonform (ja/nein), aenderungen
- Mapping EEB → Einheit (EebBogenInZeileSchreiben): C=einheitsTyp, D=Org-Klartext, E=hierarchie, J=Fahrzeuge "Typ Kennzeichen; …", K=ortAuftrag, M=zeitraumBis, P=zeitraumVon, R=einheitOrt, S=ortAuftrag, T=einsatzbeginn, U=einsatzende, W=sonstiges, AC=Anzahl W, AD=Anzahl D, AE/AF=vegetarisch/vegan, AG..AI=unterbringung, AJ..AL=Stärke; Status/Schicht/eebId bleiben leer.

**Meldekopf-Eintrag** (externe Google-Tabelle, Hinweise Z.159–172): gleiche Spalten wie Einheit B..AB (+ Stärke bis He), Bearbeitungsstatus {neu (gelb), übernommen (grün)}; eigenes ETB.

**Snapshot / Auswertung** (Blatt Auswertung, LogFrei, HTML-Exporte, Dateikopien mit Zeitstempel): Zeitpunkt (Stand), Kopie aller Einheiten inkl. Bereichsname; Excel bildet Historie ausschließlich über Dateiversionen und den Archivbereich ab.

### 8.2 Beziehungen
- Einsatz 1 — n Einsatzstelle (fest vorgegebene Menge + 21 Einsatzorte, umbenennbar)
- Einsatzstelle 1 — n Einheit (geordnet); Einheit wechselt Einsatzstelle durch Verschieben (Historie nur in Spalte K "Aufträge" als Freitext)
- Einheit n — 1 Organisation; Einheit n — 0..1 Einheitstyp (Kopiervorlage, nur als Kopierquelle, keine Referenz)
- Einheit 0..1 — 0..1 EEB-Dokument (über eebId/Dateiname); Einheit 0..1 — 0..1 Anforderung (anforderungsId ↔ Zeile im Bereich Angefordert; Freitext-Referenz)
- Einsatz 1 — 1 FüSt; FüSt 1 — 5 FüSt-Teileinheit; Teileinheit 1 — n Dienstposten; Dienstposten 1 — n Schichtplan-Eintrag (je Datum)
- FüSt-Teileinheit ×{Tag, Nacht} → projizierte Einheit in Einsatzstelle FUEHRUNGSSTELLE (Stärke = Summe Besetzung)

### 8.3 Enumerationen
- Organisation: THW, FW, BW, DRK, JUH, ASB, MALT, DLRG, POL, BPOL, HK/NLWKN, ZIV (Formular + Status-Blatt + Druck-Filter identisch). EEB-Organisationen (Polizei, Bundespolizei, Bundeswehr, Rettungsdienst, MHD, Sonstige) werden beim Import als Klartext übernommen und passen nicht 1:1 zur Liste (z. B. "Feuerwehr" statt "FW") — Abbildungstabelle nötig.
- Status: Rufbereitschaft, Einsatzvorbehalt, Angefordert, Anmarsch, Rückmarsch, Einsatzbereit, Einsatz, Ruhe, Nicht einsatzbereit (Formular; Status-Blatt zählt "Ruf Bereitsch."/"Einsatzvorbeh." als Kurzform — im Zielmodell einheitlicher Schlüssel + Anzeigename).
- Schicht: Tag, Nacht (2-Schicht) | Früh, Spät, Nacht (3-Schicht); Default "Tag".
- Bereichstyp: s. o.; Rolle (Stärkegliederung): Fü, UFü, He; Geschlecht (Logistik): m (abgeleitet), w, d; Ernährung: vegetarisch, vegan (Rest = Standard); Übernachtungsbedarf je Geschlecht.
- Katalog: THW-StAN, KatS-StAN-Nds, Feuerwehr.
- EEB-Enums: Rolle (0/1/2), Geschlecht (0/1/2), Ernährung (0/1/2), Fahrerlaubnis (AM, A1, A2, A, B, BE, C1, C1E, C, CE, D1, D1E, D, DE), Kontaktart (Mobil, Festnetz, E-Mail; D/P).

## 9. (b) Tabelle Excel-Spalte → Attribut → Typ → Regel

| Excel | Attribut (Ziel) | Typ | Regel / Validierung |
|---|---|---|---|
| Zeilenposition (Bereich) | einheit.einsatzstelleId | FK | Pflicht; Wechsel = Verschieben; bestimmt Summen-/Kostenzugehörigkeit |
| Zeilenreihenfolge | einheit.position | int | Erste Zeile im Bereich = FüSt des Bereichs (Konvention) |
| Stärke!B | einheit.fuestKennung | string | optional |
| Stärke!C | einheit.bezeichnung | string | fachlich Pflicht (Leerzeilen werden in Auswertung verworfen) |
| Stärke!D | einheit.organisation | enum Organisation | Pflicht für Auswertungen (Status!G36); nur Listenwerte (Formular) |
| Stärke!E | einheit.herkunft | string | optional (OV/Herkunft) |
| Stärke!F | einheit.zug | string | optional |
| Stärke!G | einheit.truppStaffel | string | optional |
| Stärke!H | einheit.gruppe | string | optional |
| Stärke!I | einheit.person | string | optional |
| Stärke!J | einheit.geraeteFahrzeuge | string[] / mehrzeilig | optional; inkl. Kennzeichen |
| Stärke!K | einheit.auftraege | string mehrzeilig (Verlauf) | optional; Format "von–bis; Einsatzort; Auftrag" |
| Stärke!L | einheit.erreichbarkeit | string | optional |
| Stärke!M | einheit.verfuegbarBis | datetime | optional; Warnung ab TODAY() ≥ M−1 |
| Stärke!N | einheit.abloesungAngefordertAm | datetime | optional |
| Stärke!O | einheit.anforderungsId | string (Referenz) | optional; Format einsatzabhängig |
| Stärke!P | einheit.zugesagtFuer | datetime | optional |
| Stärke!Q | einheit.zugesagtVon | string | optional |
| Stärke!R | einheit.vorgeseheneEinheit | string | optional |
| Stärke!S | einheit.vorgesehenerAuftrag | string | optional |
| Stärke!T | einheit.eingetroffenAm | datetime | optional |
| Stärke!U | einheit.einsatzendeAm | datetime | optional |
| Stärke!V | einheit.rueckfuehrungAm | datetime | optional |
| Stärke!W | einheit.bemerkungen | string | optional |
| Stärke!X, Y | – (Reserve) | – | entfällt |
| Stärke!Z | einheit.status | enum Status | Pflicht (Kontrollsumme); Listenwert |
| Stärke!AA | einheit.schicht | enum Schicht | Pflicht außer Bereich Angefordert; Default Tag |
| Stärke!AB | einheit.eebId | string (Dateiname ohne/mit Endung) | optional; Auflösung gegen eebOrdner mit erlaubten Endungen |
| Stärke!AC | einheit.anzahlWeiblich | int ≥ 0 | Default 0; nicht-numerisch → 0 |
| Stärke!AD | einheit.anzahlDivers | int ≥ 0 | Default 0 |
| Stärke!AE | einheit.anzahlVegetarisch | int ≥ 0 | Default 0 |
| Stärke!AF | einheit.anzahlVegan | int ≥ 0 | Default 0 |
| Stärke!AG | einheit.uebernachtungM | int ≥ 0 | Default 0 |
| Stärke!AH | einheit.uebernachtungW | int ≥ 0 | Default 0 |
| Stärke!AI | einheit.uebernachtungD | int ≥ 0 | Default 0 |
| Stärke!AJ | einheit.staerke.fue | int ≥ 0 | Default 0 |
| Stärke!AK | einheit.staerke.ufue | int ≥ 0 | Default 0 |
| Stärke!AL | einheit.staerke.he | int ≥ 0 | Default 0 |
| Stärke!AM | einheit.staerke.gesamt | int (abgeleitet) | = fue+ufue+he |
| Stärke!AN | kosten.psaBedarf | int (abgeleitet) | = gesamt |
| Stärke!AO | einheit.psaProTag | int ≥ 0 | Eingabe; 0 = keine PSA |
| Stärke!AP | kosten.psaGesamtProTag | int (abgeleitet) | = psaBedarf × psaProTag |
| Stärke!AQ | einsatz.psaKostenProSatz | Geld | Einsatzparameter (AQ3) |
| Stärke!AR | kosten.psaProTagEuro | Geld (abgeleitet) | = psaBedarf × psaProTag × psaKostenProSatz |
| Stärke!AS | einsatz.vdaProTag | Geld | Einsatzparameter (AS3) |
| Stärke!AT | einsatz.unterkunftVerpflegungProTag | Geld | Einsatzparameter (AT3) |
| Stärke!AU | kosten.vdaUkProTag | Geld (abgeleitet) | = (vda + uk) × gesamt |
| Stärke!AV | kosten.personentage | int (abgeleitet) | = geplanteEinsatztage × gesamt |
| Stärke!AW | kosten.gesamt | Geld (abgeleitet) | = (psaProTagEuro + vdaUkProTag) × geplanteEinsatztage (0 bei gesamt = 0) |
| Stärke!B6/B17/B19/B21/B124/B138/B162/B186/B199.. | einsatzstelle.name | string | umbenennbar |
| Stärke!AQ3/AS3/AT3/AV3 | einsatz.kostenParameter | Geld/int | Einsatzweit |
| Stammdaten!C4/C5/C6 | einsatz.name / fuestName / uebergeordneteFuest | string | name Pflicht (Dateiname) |
| FüSt!B (Funktionszeile) | dienstposten.funktion | string | frei, vorbelegt |
| FüSt!C | dienstposten.schicht | enum {Tag, Nacht} | fest je Zeile |
| FüSt!D/E/F | dienstposten.besetzung.fue/ufue/he | 0/1 | "1" = besetzt (praktisch int) |
| FüSt!G | dienstposten.gesamt | int abgeleitet | Summe |
| FüSt!J7:AS7 | schichtplan.datum | date | Spaltenkopf |
| FüSt!J10:AS139 | schichtplan.personText | string mehrzeilig | frei |
| Auswertung!A | einheit.einsatzstelle.name (materialisiert) | string | nur Snapshot |
| Startseite!IV11 | einsatz.eebOrdnerPfad | Pfad | relativ bevorzugt |

## 10. (c) Kennzahlen und Aggregationen mit Formel

Notation: E = Menge der Einheiten (ohne Kopiervorlagen, ohne Archiv); E_B = Einheiten der Einsatzstelle B; ANG = Bereich Angefordert.

1. gesamt(e) = fue + ufue + he — Stärke!AMn `=SUM(AJn:ALn)`.
2. Stärke je Einsatzstelle (Fü/UFü/He/Gesamt, W/D/Veg/Vegan/ÜN m/w/d): Σ_{e∈E_B} — Kopfzeile `=SUM(AC125:AC136)` etc.; FüSt-Block `=SUM(x7:x16)`; Meldekopf-Zeilen einzeln.
3. Gesamtstärke Einsatz (inkl. ANG): Σ_B — Stärke!AJ5..AM5 = Summe der 32 Kopf-/Einzelzeilen (6, 17–22, 124, 138, 162, 186, 199 … 420).
4. Gesamtstärke ohne Angefordert (Lagekarte): Druck!K6 `=SUM(K7:K34)` (Bereiche ohne 138); Plausibilität `E+G+I−K = 0` → "o.k."/"Fehler".
5. Stärke je Einsatzstelle und Organisation o: Σ_{e∈E_B, org=o} — Druck!M..S `=SUMIFS(Fü_<B>,<B>_Herkunft,$S$4)`.
6. Stärke je Organisation (einsatzweit, inkl. ANG): Status!D7..J18 `=SUMIF(Stärke!$D$7:$D$429,B7,Stärke!AJ$7:AJ$429)`; Summe Z.20.
7. Logistik je Organisation: Weibl. N `=SUMIF(D, org, AC)`, Männl. M `=J−N`, Veget. O (AE), ÜN m P (AG), ÜN w Q (AH). (Div./Vegan/ÜN d fehlen im Status-Blatt.)
8. Stärke je Status s: Status!D25..J33 `=SUMIF(Stärke!$Z$7:$Z$429,B25,Stärke!$AJ$7:$AJ$429)`; Kontrollsumme Z.35; Konsistenz `J35 − J20 = 0` sonst "Einheiten ohne Statusangabe oder Organisation".
9. Stärke je Schicht: Status!D38..J41 `=SUMIF(Stärke!$AA$7:$AA$429,B38,…)`; Konsistenz `J42 − J20 + AM138 = 0` sonst "Einheiten ohne Schichtangabe oder Organisation".
10. Stärke je Einsatzstelle und Schicht (Früh/Spät/Tag/Nacht): Log!D..G `=SUMIFS(Summe_<B>,Schicht_<B>,Log!D$6)`.
11. Logistik je Einsatzstelle: Summe H, W J, D K, M I `=H−J−K`, Veget L, Vegan M, ÜN m/w/d N/O/P; Gesamt Z.35 ohne ANG; ANG separat Z.38 aus Zeile 138.
12. FüSt-Stärke je Teileinheit und Schicht: FüSt!D8 `=SUMIF($C$10:$C$47,$C$8,D$10:D$47)` (Tag), D9 (Nacht) …; FüSt gesamt D7 `=D8+D9+D49+D50+D67+D68+D93+D94+D123+D124`; G `=SUM(D:F)`.
13. FüSt in Stärke: AJ7:AL16 `=FüSt!D8:F8` … ; FüOrg-Textfelder Stärke_Fü_FüSt/UFü/He/Ges (verknüpft).
14. PSA-Bedarf: AN `=AM`; AP `=AN*AO`; AR `=AN*AO*AQ` mit AQ `=$AQ$3`.
15. VDA/Unterkunft/Verpflegung: AU `=(AS+AT)*AM` mit AS `=$AS$3`, AT `=$AT$3`.
16. Einsatztage/Personentage: AV `=$AV$3*AM`; Gesamtkosten AW `=IFERROR((AR+AU)*AV/AM,0)` = (AR+AU)·AV3.
17. Kosten je Einsatzstelle: Kopf `=SUM(APx:APy)`, AR, AU, AV, AW analog; Gesamt AP5/AR5/AU5/AV5/AW5 ohne Bereich 138.
18. Filtersensitive Summen im Snapshot: Auswertung!AC3..AM3 `=SUBTOTAL(9,AC5:AC740)`.
19. Ablaufwarnung Verfügbarkeit: CF `TODAY() >= M − 1` (Färbung), leer = keine Warnung.
20. Sichtbarkeitsregel Berichte: Zeile ausblenden wenn Gesamtstärke 0/leer (t_druck, t_log, t_logFrei Worksheet_Activate).
21. Dateiname/Versionierung: `<Einsatzname>_Stärkeübersicht_<yyyy_mm_dd_hhmm_ss>.xlsm` + `_Aktuell`; Auto-Save alle n Min (Default 10); HTML-Export `Staerkeuebersicht <Einsatz> <Druck|Status|Logistik>.html` alle n Min (Default 1) mit 60-s-Reload.

## 11. Offene Fragen / Unklarheiten
- Bedeutung der leeren ersten Datenzeile je Bereich (Z.125, 139, 163, 187, 200, 211 …): Trennzeile/Einfügepuffer oder vorgesehene "FüSt des Bereichs"-Zeile? Hinweise Z.12 spricht von der ersten Zeile als Führungsstelle; die Vorlage lässt sie ohne Formeln.
- Data Validation `$B$6:$B$124` bzw. `$A$6:$A$126` auf den Trennzeilen (D137, D161, D185, D209, D297 …): Zweck unbekannt (Relikt eines früheren Verschiebe-Mechanismus?).
- Status-Kurzformen "Ruf Bereitsch."/"Einsatzvorbeh." im Status-Blatt vs. Langformen im Formular: Welcher Wert ist verbindlich? (Zählfehler in der Vorlage.)
- AV-Spalte ("Geplante Einsatztage") enthält tatsächlich Tage × Stärke; ist das beabsichtigt oder Vorlagenfehler? Ebenso AV162 `=SUM(AV168:AV184)` und fehlende AV-Summe im Angefordert-Kopf.
- Einsatzort_13/Einsatzort_19-Versatz (B330 vs. Kopf Z.331; Leerzeile 396/397): Vorlagenfehler, ohne fachliche Bedeutung [Annahme].
- Kopiervorlagen enthalten keine StAN-Stärken (alle 0) — sollen im Zielsystem StAN-Sollstärken (Fü/UFü/He) je Einheitstyp hinterlegt werden? Quelle (StAN THW 2024/2025) nicht in der Mappe.
- Die "Meldekopf-Tabelle" (Google Sheets) ist nicht Teil der Mappe; Spaltenlayout laut Hinweise identisch B..AB(+Stärke), konkrete Datei nicht eingesehen.
- Digitaler EEB: Vokabular-Codes (Art E Einheitstyp, F Funktion, V Fahrzeugtyp, K Funk-Kennwort, H<org>_<n> Hierarchieebene) werden über `EebVokabText` aufgelöst; laut Kommentar (vba_full.txt:1616–1619) existieren Tabellen nur für THW (organisation = 1) und die Ebenen, sonst erscheint "#<code>". Wo `EebVokabText` definiert ist (weiteres Modul/Blatt?), wurde geprüft – siehe Ergänzung unten. Die Zuordnung EEB-Organisation → Organisationsliste der Mappe ist nicht definiert.
- Zeilenkommentare Stärke!Z4 ("Status … Vorbelegung 'Tag'") widersprechen der Spalte; vermutlich Copy-Paste-Fehler.
- FüSt-Schichtplanung: Datumsformat/Erweiterung "ganz rechts" per Hand; ob Spaltenkopf-Datum zwingend fortlaufend ist, nicht spezifiziert.
- Die Schriftfarben des Druck-Blatts je Organisationsfilter (CF M4:S34, dxfId 14–25 in styles.xml: FW FF0000 rot, THW 0033CC blau, BW theme 6 dunkel, DRK/JUH/ASB/MALT theme 0 tint −0,35 grau, DLRG 00B0F0, POL 002AB0, BPOL 00228E, HK/NLWKN und ZIV theme 1 schwarz) sind die einzige Farbcodierung von Organisationen in der Mappe; ob sie verbindlichen THW-Vorgaben entsprechen, wurde nicht geprüft [unbelegt].
