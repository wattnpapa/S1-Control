# Excel "Einsatzkräfteübersicht V 1.5.2-beta" (THW FK Oldenburg) – Handbuch, Verfahren, Rollen, Anforderungen

Key: excel-handbuch-anforderungen. Status: ABGESCHLOSSEN (Rohbefunde aus den Zwischenständen sind in den Abschnitten 1–6 und im Anhang eingearbeitet; Sicherungskopie der Zwischenstände: excel-handbuch-anforderungen.zwischenstand.bak).

## 0. Quellenlage und Vorgehen

Ausgewertet (Dump von "unlocked_Einsatzkräfteübersichten_V 1.5.2-beta_2.xlsm"):
- Blatt `Hinweise` (A1:L172) = Benutzerhandbuch in 4 Kapiteln (Hinweise!C2:C5): Felder des Blatts Stärke, Menüfunktionen, weitere Blätter, besondere Vorgehensweisen (FüOrg-Wechsel, Ressourcenplanung, Kopiervorlagen, Meldekopf). Zusätzlich Texte in Zeichnungsobjekten (ShortCut-Liste, HTML/Tablet-Anleitung, Bedienhinweis, Kosten-Disclaimer) und die Grafik "Verwendung der Ressourcen Spalten (Vorschlag) – Vorgehensweise bei Ablösungen" (xl/media/image84.png, verankert bei Hinweise Zeile 131).
- Blatt `Neu` (veryHidden) = Versionshistorie mit Daten in Spalte C.
- Blätter `Stammdaten`, `Startseite` (veryHidden, Konfigurationszellen IU1:IV11), `AküLi` (veryHidden, Abkürzungsliste).
- Ausgabeblätter `Druck`, `Status`, `Log`, `LogFrei`, `FüOrg`, `Auswertung`, Personalblatt `FüSt`, Hauptblatt `Stärke` (Struktur, benannte Bereiche, Kommentare).
- OOXML: workbook.xml, worksheets/_rels, drawings 1–8, vmlDrawing 1–4, comments1/2.xml, media (89 Dateien).
- VBA (vba_full.txt, 40 Module, 390 Prozeduren) zur Verifikation der Handbuchaussagen.
Belegformat: `Blatt!Zelle`, `Datei:Zeile` (vba_full.txt), Modulname. Aussagen ohne Beleg sind mit [unbelegt] markiert.

Autoren/Rechte: "© THW FK-Oldenburg (Ni) Fokke Mennenga, Jannik Gnieser, Nils van Rijsinge", "Weitergabe nur mit Erlaubnis durch THW FK-Oldenburg" (Stammdaten!B10:B11, Startseite!E29:E30); Nutzungsbedingungs-MsgBox beim Öffnen: "Freigabe nur zur Nutzung im Technischen Hilfswerk / Weitergabe an Externe untersagt" (DieseArbeitsmappe.Workbook_Open, vba_full.txt:295-304). Versionstext "Einsatzkräfteübersicht V 1.5.2-beta" (Startseite!IV4).

## 1. Rollen und Arbeitsplätze (wie sie im Handbuch/Code sichtbar werden)

| Rolle / Arbeitsplatz | Trägt ein | Liest | Beleg |
|---|---|---|---|
| **FüSt – Bearbeiter Kräfteübersicht** (in der Excel nicht als "S1" benannt; die Funktionen der FüSt heißen Ltr FüSt, Ltr Stab, SGL 1–6, FüGeh SG 1–4; das Führen der Kräfteübersicht ist klassisch Aufgabe von S1 [unbelegt]) | Alles im Blatt Stärke: Einheiten, Status, Schicht, Aufträge, Ressourcenplanung, Logistikzahlen, Stärken; Stammdaten; EEB-ID/Link; Übernahme der Meldekopf-Zeilen per Zwischenablage; Verschieben/Kopieren/Einfügen von Zeilen | Druck, Status, Log, Auswertung | Hinweise!C104:C105, C163-C172; FüSt!B10:B37 |
| **Meldekopf** (ausgelagert, ggf. mehrere, ggf. ohne Netzverbindung zur FüSt) | Erfasst Daten aus den Einheiten-Erfassungsbögen zeilenweise in die "Meldekopf-Tabelle" (Google-Tabelle), markiert neue Zeilen gelb; führt eigenes Einsatztagebuch (ETB); legt EEB-Dateien im FK-Netzlaufwerk bzw. Google-Drive-Ordner ab | Sieht grüne Markierung = von FüSt übernommen | Hinweise!C33, C159-C172 |
| **Einheitenführer / anmeldende Einheit** | liefert EEB (Papier, Datei oder digital als QR-Code der App erfassungsbogen.app), Erreichbarkeit, Verfügbar-bis | – | Hinweise!C21-C22, C33; m_digitalerEEBParsing Kopfkommentar (vba_full.txt:1100-1114); Ablaufgrafik image84 ("Bei Anmeldung / Erfassungsbogen") |
| **Logistik (Verpflegung/Unterkunft)** | – (in der Excel nur Leser; Zahlen werden von der FüSt in AC:AI eingetragen) | Blatt Log (geschützt) bzw. LogFrei (frei bearbeitbar, exportierbar), HTML-Export "Logistik" | Hinweise!C38-C44, C109, C120; m_htmlExport LOGISTIK_EXPORT_RANGE |
| **Führung / Lagekarte** | – | Ausdruck Blatt Druck (Stärken je Einsatzstelle, Gesamtstärke, Org-Filter), Blatt FüOrg (Führungsharke mit taktischen Zeichen), Blatt Status; HTML-Monitor (Tablet, 60-s-Reload) | Hinweise!C107, C108, C110, C99; Textfeld 2 in Hinweise-Zeichnung |
| **Übergeordnete FüSt / "zuständige Ansprechstelle in der THW Behördenstruktur"** | legt Form der Anforderungs-ID fest; ist Adressat der Anforderung | – | Hinweise!C24-C25; Stammdaten!C6 "Name der übergeordneten Führungsstelle" |
| **Entsendende Stelle** | liefert Zusage (Zugesagt für/von, vorgesehene Einheit, Erreichbarkeit B, Verfügbar bis B) | – | Ablaufgrafik image84 ("Nach Zusage der entsendenden Stelle") |
| **Admin (FK Oldenburg / Tabellenbetreuer)** | Passwort (Startseite!IV1 = 123), Blattschutz umschalten (Strg+Shift+B), Admin-Menü (Strg+Shift+P), Passwort ändern | – | Startseite!IU1:IV2; m_makroFunktionen.schalteBlattsperreUm, oeffneUfrAdminMenue (vba_full.txt:2357-2392) |

Mehrere gleichzeitige Nutzer sieht die Excel nur über die Umwege Meldekopf-Google-Tabelle (paralleles Erfassen), HTML-Export auf NAS (paralleles Lesen) und die "Aktuell"-Kopie der Datei vor; die Arbeitsmappe selbst ist Einzelplatz (SaveAs-Verlaufskopien, m_speichern).

## 2. Verfahren Schritt für Schritt

### 2.1 Einsatz beginnen (Stammdaten)
1. Datei öffnen, Makros aktivieren (Stammdaten!B2). Beim Öffnen: Nutzungsbedingungen-MsgBox, alle Blätter werden mit Passwort geschützt, Parameter zurückgesetzt (Erstgespeichert=False, Autospeichern aus/10 min, HTML-Autoexport aus/1 min), Blatt Stammdaten wird angezeigt mit MsgBox "Zunächst bitte Einsatz- oder Übungs-Name und Name der FüSt eintragen … wichtig für das korrekte spätere Abspeichern" (Workbook_Open, vba_full.txt:295-349).
2. Stammdaten!C4 Name des Einsatzes/der Übung ("Bezeichnung ohne Sonderzeichen !", Pfeil in drawing6), C5 Name der Führungsstelle, C6 Name der übergeordneten Führungsstelle. Der Einsatzname steuert den Dateinamen (Hinweise!C7, C116-C117) und erscheint in allen Ausgabeköpfen (Druck!C2:C3, Status!A1:A2, Log!C2:C3, Stärke!B1/G1, FüOrg-Textfelder "Name_Einsatz_Übung", "Name_Füst", "Name_Vorgesetzte_FüSt").
3. Bereichsnamen (Einsatzstellen) an die Führungsstruktur anpassen: graue Kopfzeilen Stärke!B6, B17, B19, B21, B124, B138, B162, B186, B199…B420 sind umbenennbar (Kommentar "Bezeichnung ggf. anpassen"); in der jeweils ersten Zeile eines Bereichs wird die Führungsstelle eingetragen ("Z Bef St; GrFü FGr B; UEALxx; EAL xx") (Hinweise!C11-C12).
4. Kostenparameter im Kopf setzen (Stärke!AQ3 Kosten/Satz PSA=180, AS3 VDA/Tag=150, AT3 UK/Verpfl.=20, AV3 geplante Einsatztage=5) – nur Abschätzung (Hinweise Rechteck 62).
5. Erstspeichern: SaveAs-Dialog mit vorgeschlagenem Namen `<Einsatzname>_Stärkeübersicht_<yyyy_mm_dd_hhmm_ss>.xlsm` (m_speichern.getDateiname, speicherErstmalig).

### 2.2 Einheit anmelden
Varianten, die das Handbuch/der Code kennen:
- **a) Direkt in Stärke:** Leerzeile im Zielbereich einfügen (Menü/Strg+N, "Einfügen erfolgt nach der angewählten Zeile", Hinweise!C83), Zeile mit Strg+A über die Eingabemaske ufr_datenEingabe befüllen (Dropdowns Organisation/Status/Schicht, Stärke- und Logistikfelder, EEB-ID-Dateiauswahl; m_userformFunktionen:3092-3235). Pflicht für die Auswertung: Organisation (D), Status (Z), Schicht (AA) – sonst Kontrollsummen-Warnung (Status!G36, G43). Datum/Zeit mit Strg+D (Now) in T "eingetr./zugew.".
- **b) Aus Kopiervorlage (StAN):** Vorlagenzeile aus "Kopiervorlagen THW StAN" (Stärke!B23ff) oder "Kopiervorlagen KatS-StAN Nds und Feuerwehr" (B73ff) mit "Zeile(n) kopieren" (Strg+K) an den Zielort kopieren, dort Status/Schicht/Stärken anpassen (Hinweise!C86-C87, C155-C157). Vorlagen enthalten keine Stärken; Menüöffnen nullt sie sicherheitshalber (t_staerke.btn_menue_Click, vba_full.txt:12-30).
- **c) Mit Papier-/Datei-EEB:** EEB-Datei im vereinbarten Ordner (FK-Netzlaufwerk, sonst Google-Drive-Verzeichnis) ablegen, Dateiname (mit/ohne Endung) in AB "ID Einheiten-Erfassungsbogen" eintragen, "Links aktualisieren" (btn_eebAktualisieren) erzeugt Hyperlinks für Endungen pdf|docx|png|jpg|jpeg|odt|svg|webp|avif|heic (Hinweise!C33, C36, C95; m_eeb:1939, 1963-2032). Mehrere Bilder vorher zu einer Datei verbinden (Hinweise!C95).
- **d) Mit digitalem EEB (QR-Code der App erfassungsbogen.app):** Zeile markieren, Strg+Q, QR-Scanner (Tastatur-Emulation) tippt den Code in das Eingabefeld, Dekoder (Base41/Base64url → Magic EEB2/EEB2C → raw Deflate → Binärschema 2..8) füllt eine neue Zeile: Bezeichnung=Einheitstyp, Organisation, Herkunft=Hierarchie, Fahrzeuge "Typ Kennzeichen; …", Aufträge, Verfügbar bis/Zugesagt für aus Zeitraum, Vorgesehene Einheit=Einheit-Ort, eingetr./zugew.=Einsatzbeginn, Einsatzende, Bemerkung=Sonstiges, w/d-Zahlen aus Personalliste, veg/vegan, ÜN m/w/d, Fü/UFü/He. Status/Schicht/EEB-ID bleiben leer und sind nachzutragen (m_makroFunktionen.digitalerEEBInNeueZeile:2462-2516; m_digitalerEEB.EebBogenInZeileSchreiben:1028-1094).
- **e) Über den Meldekopf (Google-Tabelle):** Meldekopf trägt EEB-Daten zeilenweise in die Google-"Meldekopf-Tabelle" ein (Spalten FüSt … ID Einheiten-Erfassungsbogen identisch zur Excel), markiert die erste Spalte gelb, dokumentiert die Anmeldung im eigenen ETB. FüSt erkennt neuen Eintrag, kopiert die Zeile von Spalte 1 bis "He" (Strg+C), fügt sie in der Excel im Zielbereich (z. B. Bereitstellungsraum) mit Einfügeoption "Formeln"/"Zieldesign verwenden" ein (nur linke Zelle markieren!), markiert dann in der Google-Tabelle grün. Änderungen: Meldekopf setzt wieder gelb, FüSt nach Übernahme grün. Google-Zeilen werden bis Einsatzende nicht gelöscht (Nachvollziehbarkeit, Schutz vor Datenverlust) (Hinweise!C159-C172).

### 2.3 Einheit verschieben / umgliedern (FüOrg-Wechsel)
- "Zeile(n) verschieben" (Strg+M): eine oder mehrere (auch nicht zusammenhängende, Neu!B25) Zeilen werden nach der angewählten Zielzeile eingefügt; Bereichsköpfe sind gesperrt (m_zlOperationen.hatGesperrteZeilen) (Hinweise!C85).
- FüOrg-Wechsel: in einem freien Bereich einen EA/UEA anlegen (Bereich umbenennen), Führungsstelle (EAL/UEAL) in die erste Zeile eintragen, zugehörige Einheiten per "verschieben" zuordnen; alternativ bestehenden Bereich umbenennen (Hinweise!C125-C126).
- Bereiche ein-/ausblenden über +/-‑Buttons je Bereich (Spalte A) oder Check-Box-Form für mehrere Bereiche (Hinweise!C88; ufr_bereicheVerbergen). Blatt Druck blendet leere Einsatzstellen automatisch aus (t_druck.Worksheet_Activate).

### 2.4 Ressourcenplanung: Anforderung → Zusage → Eintreffen → Einsatzende → Rückführung, Ablösung
Kein verbindliches Verfahren; Spaltenüberschriften L:V sind ungeschützt, eigene Vorgehensweisen möglich (Hinweise!C129-C130). Vorschlag laut Grafik image84 "Vorgehensweise bei Ablösungen":
1. Zeile Einheit A (im Einsatz): bei Anmeldung/EEB → L Erreichbarkeit A, M Verfügbar bis. Vorbereitung Ablösung.
2. Bei Absendung der Anforderung → N Ablösung angefordert (Datum/Zeit), O Anforderungs-ID (Form mit der zuständigen THW-Ansprechstelle abgestimmt, Hinweise!C24-C25).
3. Nach Zusage der entsendenden Stelle → P Zugesagt für, Q Zugesagt von, R Vorgesehene Einheit B.
4. Zeile Einheit B im Bereich "Angefordert / Anmarsch" (Stärke!B138) anlegen: C/D/E Bezeichnung/Organisation/Herkunft, L Erreichbarkeit B, M Verfügbar bis B, O dieselbe Anforderungs-ID (später löschen), S Vorgesehener Auftrag ("z. B. Ablösung Einheit A"); Status "Angefordert" bzw. "Anmarsch".
5. Bei Anmeldung/EEB von B → T Eingetr./Zugew.; B per Verschieben in den Zielbereich; Status z. B. Einsatzbereit/Einsatz.
6. Bei Einsatzende A → U Einsatzende; V Rückführung sofern bekannt; Status Rückmarsch; Zeile A "zwecks Dokumentation" in den Bereich B431 "Einsatz beendet" verschieben (Hinweise!C105; Stärke!B431).
Zählregeln: Kräfte im Bereich "Angefordert / Anmarsch" zählen nicht in Druck/Log-Gesamt, werden in Log/LogFrei separat ausgewiesen (Druck!E35, Log!D36, C38:P38 = Stärke!AM138 usw.).

### 2.5 Schichtbetrieb
- Spalte AA Schicht: 2 Schichten "Tag"/"Nacht", 3 Schichten "Früh"/"Spät"/"Nacht"; Vorbelegung "Tag" (Hinweise!C35; Kommentar AA4; ERLAUBTE_SCHICHTEN "Tag|Früh|Spät|Nacht").
- Bereiche FüSt (Zeilen 7–16) und Meldekopf/Sonstiges (17–22) haben feste Tag/Nacht-Doppelzeilen (Stärke!AA7:AA16, Testmodul 2836-2841).
- Blatt Status Zeilen 38–41 summiert Fü/UFü/He/Gesamt je Schicht; Log/LogFrei Spalten D:G je Einsatzraum und Schicht.
- Personal der FüSt: Blatt FüSt mit Tag/Nacht-Zeile je Funktion (weiß/grau), Stärke per "1" in Fü/Ufü/He; rechts "Schicht Planung" mit Datumsspalten (J6:AS6), Namen + Herkunft/Erreichbarkeit/Einsatzoptionen als mehrzeiliger Text (Strg+A), nicht mehr aktuelle Spalten per +/- ausblenden, rechts erweiterbar; keine Verknüpfungen (Hinweise!C111-C115; FüSt!I4, J10).

### 2.6 Kopiervorlagen (StAN)
Zwei Bereiche im Blatt Stärke: "Kopiervorlagen THW StAN (aus diesem Bereich nur kopieren)" (B23; Einheiten Stärke!C25:C70: OV-Stab, MT, TZ, ZTr TZ, B, B(ASH), FGr R(A/B/C), W(A/B), BrB, O(A/B/C), Sp, N, SB(A/B), Tr ESS, MHP, UL, FGr BT, I, E, TW, WP(A/B/C), Öl(A/B/C), FZ Log mit ZTr/Log-M/Log-VG/Log-MW/Log-V, Tr TS, FZ FK(A/B), ZTr FZ FK, FGr F, FGr K(A/B), Stab) und "Kopiervorlagen KatS-StAN Nds und Feuerwehr" (B73; Feuerwehr LZ FW mit ZTr/ELW 1, LGr/LF 20/16, LSt/TLF 16/25, LTr/DLK 23/12; KatS Nds C83:C121 mit Fahrzeugen in J). Neu!B12, B13, B34, B40: Vorlagen kamen in 0.3 (THW), 0.4 (Feuerwehr), 1.5.0 (KatS-StAN Nds), 1.5.1 (THW-StAN aktualisiert).

### 2.7 Auswertung / Abschlussdokumentation
- Menü "Tabelle Auswertung aktualisieren": kopiert alle Datenzeilen aus Stärke als Werte in das ungeschützte Blatt Auswertung mit Zeitstempel (Auswertung!B1), Bereichsname als Spalte A, filterbare SUBTOTAL-Summen (AC3:AM3); alte Daten werden überschrieben (Hinweise!C92-C93, C118-C119).
- Menü "Tabelle LogFrei aktualisieren": Werte aus Log in LogFrei (Zeitstempel E4), zur freien Bearbeitung/Export in andere Datei (Hinweise!C94-C96, C120).
- Einsatz-Ende-Dokumentation: rückgeführte Einheiten in den Bereich "Einsatz beendet" (B431) verschieben; Verlaufskopien der Datei (Zeitstempel im Namen) und die Google-Tabelle des Meldekopfs (nie löschen) bilden das Archiv (Hinweise!C105, C165; m_speichern).
- Ein ETB ist nicht Teil der Excel; der Meldekopf führt sein ETB extern, es ist "Bestandteil des ETB's der zugehörigen Führungsstelle" (Hinweise!C164).

### 2.8 Ausdruck für die Lagekarte / HTML-Monitor
- Druck: Zoom-Button toggelt 55 % ↔ 100 % (t_druck.btn_zoom_Click), Org-Filter S4 (Default THW), leere Einsatzstellen ausgeblendet; "kann zur Verwendung auf der Lagekarte ausgedruckt werden" (Hinweise!C107).
- FüOrg: Führungsharke bearbeiten und für Lagekarte drucken; Palette taktischer Zeichen "Nur Kopieren – nicht verschieben", "Zum Bearbeiten Arbeitsblatt kopieren, Original nicht verändern" (Hinweise!C110; drawing4).
- HTML: "erw. Speichern" aktiviert Autospeichern (Intervall Minuten) und/oder Auto-Export des Blatts Druck als HTML (Intervall Minuten, Default 1); Datei `Staerkeuebersicht <Einsatzname> Druck.html` im Mappenordner, Browser lädt alle 60 s neu (Meta-Refresh + JS-Reload, no-cache-Header). Code kann zusätzlich Status und Log exportieren (exportiereStatus/Logistik/AlleBlaetter; im Handbuch nur Druck erwähnt). Tablet-Nutzung: Speicherort auf NAS/Webserver, auf Tablet einbinden, im Browser öffnen (Hinweise!C99; Textfeld 2; m_htmlExport:2200-2312).

### 2.9 Speichern/Sichern
"Speichern" speichert doppelt: `<Einsatzname>_Stärkeübersicht_Aktuell.xlsm` (überschrieben) und `<Einsatzname>_Stärkeübersicht_<Zeitstempel>.xlsm` (Verlauf); erstes Speichern fragt Ort ab, danach fester Ort; Autospeichern zyklisch (OnTime); MsgBox wenn Datei mit gleicher Sekunde existiert (Hinweise!C97-C100; m_speichern:2530-2600). Vorgänge sind nicht rückgängig machbar (Hinweise!C70-C72) – die Verlaufskopien sind das einzige Undo.

### 2.10 Kostenabschätzung
Spalten AN:AW je Zeile: PSA (automatisch), Anz. pro Tag (Eingabe), Ges. PSA pro Tag, Kosten pro Satz PSA (Kopf), Kosten PSA pro Tag, VDA pro Tag (Kopf), Unterkunft/Verpflegung (Kopf), Kosten VDA+UK+Verpfl. pro Tag, geplante Einsatztage (Kopf), Gesamtkosten (Hinweise!C49-C58); ausblendbar; explizit nur Abschätzung.

## 3. Ausgabeprodukte – exakter Inhalt

### 3.1 Druck (Druck!A1:S37; Exportbereich HTML $B$4:$K$35)
Kopf: C2 Einsatzname, C3 FüSt-Name, C4 "Stärke:", E4 Zeitstempel NOW(). Zeile 6 "Gesamt": Fü / UFü / He = Gesamt (E6/G6/I6/K6 = Summen der Zeilen 7–34), L6 Plausibilität "o.k."/"Fehler". Zeilen 7–34 = Einsatzstellen in fester Reihenfolge: FüSt (Stärke!6), Meldekopf FüSt BR_1 (17+18), Meldekopf FüSt BR_2 (19+20), Sonstiges Führung (21+22), Logistik (124), Bereitstellung 1 (162), Bereitstellung 2 (186), Einsatzort 1–21 (199…420, B14:B34 laufende Nummer). Anzeige nur wenn Gesamtstärke > 0 (sonst leer und Zeile ausgeblendet). Format je Zeile "Name | Fü / UFü / He = Gesamt | o.k.". Rechts M4 "Davon Stärke:" mit Org-Filter S4 (Dropdown, Default "THW"): SUMIFS(Fü_<Bereich>, <Bereich>_Herkunft, S4) usw. – Achtung: der Filter läuft über die Spalte D "Organisation" (benannte Bereiche *_Herkunft zeigen auf Spalte D, z. B. BR1_Herkunft = Stärke!$D$17:$D$18). E35 "(ohne Kräfte aus dem Bereich "Angefordert / Anmarsch")". Bekannter Defekt: Druck!C26 liest Stärke!B330, während E26:K26 Stärke!*331 lesen (Einsatzort 13 hat Doppelkopf B330/B331).

### 3.2 Status (Status!A1:Q43; HTML $A$1:$J$44)
A1 Einsatzname, A2 FüSt, A4 "Stärke nach Organisationen", E5 NOW(). Matrix Organisation × Stärke: Zeilen B7:B18 THW, FW, BW, DRK, JUH, ASB, MALT, DLRG, POL, BPOL, HK/NLWKN, ZIV; Spalten Fü / UFü / He = Gesamt (SUMIF über Stärke!$D$7:$D$429), M Männl. (= Gesamt − Weibl.), N Weibl., O Veget., P/Q Unterbringung Männl./Weibl.; Zeile 20 Summe. Zweiter Block B24 "Status der Einsatzkräfte": Ruf Bereitsch., Einsatzvorbeh., Angefordert, Anmarsch, Rückmarsch, Einsatzbereit, Einsatz, Ruhe, Nicht einsatzbereit (SUMIF über Stärke!$Z), Kontrollsumme Zeile 35, G36 Warnung "Einheiten ohne Statusangabe oder Organisation". Dritter Block B37 "Schichten": Tag, Nacht, Früh, Spät (SUMIF über Stärke!$AA), Kontrollsumme 42, G43 Warnung "Einheiten ohne Schichtangabe oder Organisation" (Angefordert/Anmarsch herausgerechnet). Nicht enthalten: Div., Vegan, ÜN (d) (nur in Log).

### 3.3 Log (Log!A1:Q38, geschützt; HTML $B$1:$F$39)
C2/C3 Einsatz/FüSt, C4 "Logistik Details", D4 NOW(). Spalten: Einsatzraum | Schichtbetrieb Früh, Spät, Tag, Nacht | Summe | Einsatzkräfte M, W, D, Veget, Vegan | Unterbr. M, W, D. Zeilen 7–34 je Einsatzraum (Namen aus den Bereichsköpfen, Reihenfolge wie Druck); Schichtspalten = SUMIFS(Summe_<Bereich>, Schicht_<Bereich>, Schichtname); Summe = Bereichs-Gesamtstärke; M = Summe − W − D (Rest); W/D/Veget/Vegan/ÜN aus Stärke!AC:AI der Bereichskopfzeile. Zeile 35 Gesamt, D36 "(ohne Kräfte aus dem Bereich Angefordert / Anmarsch)", Zeile 38 "Kräfte aus dem Bereich Angefordert / Anmarsch" separat (Stärke!AM138, AC138…AI138).

### 3.4 LogFrei (LogFrei!A1:P38, ungeschützt)
Wertekopie von Log mit Zeitstempel E4 "Logistik Details Stand:" und Hinweis G4 "Ungeschützte Tabelle"; Zeile 35 SUM-Formeln; B14:B34 Einsatzort-Nummern per Formel; Zweck: Filter, Bearbeitung, Export in andere Datei (Hinweise!C120).

### 3.5 FüOrg (FüOrg!A1:O7 + drawing4)
Zellinhalt nur M7 "Stand:", N7 NOW(). Zeichnung: links Führungsharke – Textfeld "Name_Einsatz_Übung", Gruppe "Name_Vorgesetzte_FüSt" (oben), Gruppe "Name_Füst" mit Stärkeanzeige "0 / 0 / 0 = 0", Gruppen "Bereitstellung 1", "Bereitstellung 2", "Logistik", Raster aus 5 × 3 Rechtecken (Einsatzabschnitte/Einheiten) mit gewinkelten Verbindern; rechts (Spalten 15–19) Palette aus 49 Bildern (media image21–68 jpeg, image69 png): blaue THW-Einheitenzeichen (TZ THW; leere THW-Kästen mit 1–3 Punkten = Trupp/Gruppe/Zug), rote Feuerwehr-Kästen mit Pfeilspitze (1–3 Punkte), gelbe Führungsstellen-Fahnen KatSL, LuK, TEL, ÖEL, ELO, EL, EAL, UEAL und Leerfahnen, Rauten (Führungspersonen) EL, EAL, UEAL, LNA, OrgL, ÖEL, TEL, runde Funktionszeichen (Log, M [Materialerhaltung/Logistik-Material, unbelegt], Sack Sand, Werkzeug-, Trichter-, Öffnungssymbol), LtS unter Dach (gelb und rot), Rauten anderer Organisationen (FW rot, THW blau, NLWKN orange, Pol grün, BW braun, weiße Rauten). Dateinamen tragen keine Semantik ("Grafik N"); nur zwei descr-Attribute "t-trztr" (image21) und "f-flts" (image59). Pfeil "Nur Kopieren – nicht verschieben", Hinweis "Zum Bearbeiten Arbeitsblatt kopieren, Original nicht verändern".

### 3.6 Auswertung (Auswertung!A1:AM740, ungeschützt)
A1 "Stand:", B1 Zeitstempel; AC3:AM3 SUBTOTAL(9,…) (filterfest). Spaltenliste A4:AM4: A FüSt (Bereichsname) | B FüSt. | C Bezeichnung | D Organisation | E Herkunft | F Zug | G Trupp o. | H Gruppe | I Person | J Geräte / Fahrzeuge | K Aufträge | L Erreichbarkeit | M Verfügbar bis | N Ablösung angefordert | O Anforderungs-ID | P Zugesagt für | Q Zugesagt von | R Vorgesehene Einheit | S Vorgesehener Auftrag | T eingetr./zugew. | U Einsatzende | V Rückführung | W Bemerkung | X Reserve | Y Reserve | Z Status | AA Schicht | AB ID Einheiten-Erfassungsbogen | AC Weibl. | AD Div. | AE Veget. | AF Vegan. | AG ÜN (m) | AH ÜN (w) | AI ÜN (d) | AJ Fü | AK Ufü | AL He | AM Gesamt. Datenzeilen ab 5 (Beispiel A5 "FüSt", B5 "Stab", AA5 "Tag").

### 3.7 HTML-Exporte (m_htmlExport)
`Staerkeuebersicht <Einsatzname> Druck.html` (Bereich Druck!B4:K35), optional `… Status.html` (A1:J44) und `… Logistik.html` (Log!B1:F39); statisches HTML mit 60-s-Reload und no-cache; Speicherort = Ordner der Arbeitsmappe.

### 3.8 Dateiartefakte
`<Einsatzname>_Stärkeübersicht_Aktuell.xlsm` und `<Einsatzname>_Stärkeübersicht_<yyyy_mm_dd_hhmm_ss>.xlsm` (m_speichern).

## 4. Versionshistorie (Blatt Neu) und Rückschluss auf Nutzerbedarf

| Version (Datum) | Inhalt (Neu!B) | Rückschluss |
|---|---|---|
| 1 | Ursprungsversion | reine Stärketabelle |
| 2 | Fehler bereinigt, Bereitstellungsraum 2, Einsatzorte auf bis zu 21, PSA-Kostenberechnung, Bereinigungs-Makros | mehr Einsatzstellen nötig; Kostenschätzung gewünscht |
| 3 | Makros Zeilen einfügen/löschen, Kostenübersicht ein/aus, Statusspalten ein/aus | Blattschutz erzwingt Makros für Struktur-Änderungen |
| 4 | Makro "Verschieben von Zeilen" (Einheiten) | Umgliedern ist Kernvorgang |
| 5 | Zwischenversion, Formulare | – |
| 6 (Beta) | mehrere Zeilen einfügen/löschen, Bereiche verbergen, Bereich "Angefordert", Status der Einheiten mit Übersicht, FüOrg | Anforderungsverfolgung, Statusbild, Führungsharke |
| 6.1 → 0. | Userform-Menü statt Einzelbuttons; "Freigabe zur Nutzung" | Bedienung vereinheitlicht |
| 0.1–0.2 | Menüsteuerung; Bearbeitungsmaske Fahrzeuge/Geräte | Langtexte brauchen Editor |
| 0.3 | Kopiervorlagen THW, Zeilen kopieren, Register HK Gerät | StAN-Vorlagen |
| 0.4 | Ressourcenplanung, Kopiervorlagen Feuerwehr, Design, Spalte Aufträge (Einsatzablauf), Bereich Einsatzende | Ablösungen planen, Verlauf dokumentieren |
| 0.5 | Fehlerkorrektur nach Tests, Status angepasst, Spalte "Schicht", Kommentarfelder, Version für TLtg., Blattschutz | Schichtbetrieb |
| 0.6 (Beta) | Blatt freie Auswertung; Org- und Status-Stärken "auf taktisch" (Fü/UFü/He); Ausdruck um Stärken THW ergänzt | Auswertbarkeit, taktische Stärkeschreibweise |
| 1.0 Beta (19.02.2024) | Ressourcenplanungs-Spalten, Logistikdaten (m/w/Veg/Unterbr.), Logistik-Übersicht, Strg+J für jetzt(); LogFrei; FüSt-Zeilen erweitert; Schichtauswertung Logistik; Passwortabfrage; Blatt Hinweise; Ablaufplan Ressourcenverwaltung | Logistik als Leser; Handbuch |
| 1.0 (08.03.2024) | Freigabe; Passwortabfrage angepasst | – |
| 1.1 | Neue Daten HK Geräte VPS 24 Vers. 14.3 | (Bedeutung HK/VPS offen) |
| 1.2 | Programmbereinigung; Status "Nicht einsatzbereit"; Userforms mit Hilfetexten; Blatt HK Geräte entfernt | – |
| 1.3 (06.04.2025) | Todo 1–6, 12, 16–18, 21–23; Autospeichern mit Zeit, fragt nach Erstspeichern; keine Ladezeit beim Öffnen; Verschieben/Kopieren nicht zusammenhängender Bereiche; Utils Passwort/Speicherstand | Performance und Robustheit |
| 1.4 (06.10.2025) | Schichtplanung im Blatt FüSt (Todo 8, 29); ControlTips (32), ESC schließt Userforms (20); einheitliche Stile (19), Stammdaten weiß (26), Kommentarfelder (31); Code-Refactoring/Namenskonvention (9, 15); Bugs 14, 27, 28, 30; automatischer HTML-Export Druck, "erw. Speichern" (24) | Personalplanung FüSt; Lage-Monitor |
| 1.4.2 (20.02.2026) | Anpassung an neue EEBs: divers und vegan (Todo 42–44) | EEB-Formular ist führend für Datenfelder |
| 1.5.0 | Kopiervorlage KatS-StAN Nds; Fehlerbeseitigung; Tastenkürzel; Spalte ID EEB vor den Stärkeangaben + EEB-Ordner/Verlinkung; Anpassungen für Meldekopf-Tabelle + Beschreibung; Hilfefenster AküLi (Strg+H) | Meldekopf-Anbindung, digitale Ablage |
| 1.5.1 (11.05.2026) | THW-StAN-Vorlage aktualisiert; StartUpPosition; Kopieren mit Zielzeile = erste Quellzeile; neue Eingabemaske t_staerke; ToDos 63, 65, 75, 77 | – |
| 1.5.2-beta (Startseite!IV4; nicht in Neu dokumentiert) | Code enthält zusätzlich: digitaler EEB (QR-Dekoder, Strg+Q), HTML-Export auch Status/Log | QR-EEB der App erfassungsbogen.app |

"beta": Kennzeichnung der Versionstexte für noch nicht freigegebene Stände (Neu!A7, A15, A16; Startseite!IV4); Freigaben waren 6.1/"0." und 1.0 (Neu!B9, B19). Todo-Nummern (bis 77) verweisen auf eine externe Todo-Liste, die nicht in der Datei enthalten ist.

## 5. Bekannte Schwächen und Workarounds der Excel (aus Handbuch/Code ableitbar)
1. Kein Undo: "Vorgänge können nicht rückgängig gemacht werden" (Hinweise!C70-C72); Ersatz = zeitgestempelte Verlaufskopien + "Aktuell"-Datei.
2. Blattschutz überall (Workbook_Open) mit Klartext-Passwort "123" (Startseite!IV1); nur Admin darf Schutz umschalten; Strukturänderungen nur über Makros (Zeilen einfügen/löschen/verschieben/kopieren) – daher fest verdrahtete Zeilenbereiche (benannte Bereiche pro Einsatzort), maximal 21 Einsatzorte, 2 Bereitstellungsräume, 2 Meldeköpfe, je Bereich begrenzte Zeilenzahl (z. B. Einsatzort 9 Zeilen, Bereitstellung 1 22 Zeilen).
3. Einfügen aus der Google-Tabelle nur mit Einfügeoption "Formeln"/"Zieldesign", nur linke Zelle markieren – sonst Formatierungen zerstört (Hinweise!C168-C170).
4. Meldekopf-Anbindung über Google-Tabelle (Cloud), Farbmarkierung gelb/grün als Übergabeprotokoll, manuelles Copy&Paste (Hinweise!C159-C172); EEB-Ablage auf FK-Netzlaufwerk oder Google Drive (Hinweise!C33).
5. Inkonsistente Wertelisten: Eingabemaske schreibt "Rufbereitschaft"/"Einsatzvorbehalt", Blatt Status summiert "Ruf Bereitsch."/"Einsatzvorbeh." (m_userformFunktionen:3092 vs. Status!B25:B26) → Kontrollsummen-Warnung; Zellen-Datenvalidierung für Status/Schicht fehlt (nur 4 DV im Blatt, eine mit #REF!), Kommentar Z4 "Vorbelegung Tag" ist Copy-Paste-Fehler.
6. Redundante Kopfstruktur: Einsatzort 13 doppelt (Stärke!B330/B331), Druck!C26 liest falsche Zeile; Einsatzort 19 beginnt bei 398 statt 397 (Bereichsschritt 11 gebrochen).
7. Doppelte Datenhaltung: Bereichsname als Zeilenüberschrift statt Attribut → Auswertung muss den Bereich in Spalte A "rekonstruieren"; Männeranzahl nur als Rest (Gesamt − w − d).
8. Sekundengenaue Dateinamen, MsgBox bei Kollision; Autospeichern über OnTime kann bei geschlossener Mappe nachlaufen (BeforeClose räumt auf).
9. HTML-Export nur statisch aus dem Mappenordner; Tablet braucht SMB/Webserver-Zugriff; Aktualität hängt vom Excel-Client ab (Export läuft nur solange die Mappe offen ist).
10. Digitaler EEB-Dekoder "KI generiert und nicht überarbeitet", Signatur nicht geprüft (vba_full.txt:1114, 1108).
11. Kopiervorlagen liegen im selben Blatt wie Live-Daten und müssen aktiv genullt werden (btn_menue_Click); Fehlbedienung "verschieben statt kopieren" zerstört Vorlagen (FüOrg-Hinweis "Nur Kopieren – nicht verschieben").
12. Handbuch-Drift: Strg+J (Neu!B16) vs. Strg+D im Code; "Statusspalten ein-/ausblenden" (Neu!B4) heißt heute Ressourcen/Log/Kosten; Menüfunktion "Auswertungsdaten erzeugen" (Hinweise!C118) heißt im Menü "Tabelle Auswertung aktualisieren".
13. Einzelplatz: gleichzeitiges Bearbeiten derselben Mappe nicht vorgesehen; Mehrbenutzer nur über Meldekopf-Tabelle und Lesekopien.

## 6. Nicht-funktionale Anforderungen (aus dem Einsatzkontext)
- Offline-Fähigkeit: Grundbetrieb ohne Internet (Excel lokal, FK-Netzlaufwerk); Google-Drive nur "ggf., wenn keine Netzwerkverbindung zum Meldekopf existiert" (Hinweise!C33).
- Netzlaufwerk/NAS: EEB-Ordner relativ zur Mappe oder absolut (m_eeb waehleOrdnerPfad), HTML auf NAS/Webserver (Textfeld 2).
- Mehrbenutzer: paralleles Erfassen am Meldekopf, paralleles Lesen (Tablet/HTML, Ausdruck), Übergabe-Quittierung (gelb/grün).
- Drucken: Blätter Druck, FüOrg, Status, Log als Papier für Lagekarte/Führung; Druck-Zoom 55 %.
- Schnelligkeit/Bedienung unter Stress: Tastaturbedienung (Pfeiltasten, ENTER/TAB, Strg+A/D/N/E/M/K/Q/H/Shift+M), Eingabemaske mit Dropdowns, "Keine Ladezeit beim Öffnen" (Neu!B24), Menü modeless, Bestätigungs-MsgBoxen, ESC schließt Forms (Neu!B28), ControlTips.
- Robustheit/Nachvollziehbarkeit: zeitgestempelte Verlaufskopien, Google-Zeilen nie löschen, "Einsatz beendet"-Archivbereich, Zeitstempel auf allen Ausgaben (NOW()).
- Vertraulichkeit: Weitergabe nur THW-intern (Nutzungsbedingungen), Passwortschutz (schwach).
- Fehlertoleranz: Plausibilitätsprüfungen (Druck!L, Status!G36/G43), Warnungen bei fehlendem Ordner/Datei.

## 7. (a) Nummerierte Anforderungsliste

### A. Einsatz und Stammdaten
- F-A1 Ein Einsatz/eine Übung hat Name (Pflicht, ohne Sonderzeichen), Name der Führungsstelle, Name der übergeordneten Führungsstelle; die Namen erscheinen auf allen Ausgaben. (Stammdaten!C4:C6; Druck!C2:C3; drawing6 Pfeil)
- F-A2 Der Einsatzname ist Bestandteil der Dateinamen/Exportnamen. (Hinweise!C7, C97; m_speichern.getDateiname)
- F-A3 Beim Start wird der Nutzer zur Eingabe der Stammdaten geführt. (Workbook_Open MsgBox)
- F-A4 Kostenparameter je Einsatz (PSA-Satzpreis, VDA/Tag, UK/Verpflegung/Tag, geplante Einsatztage) sind zentral änderbar. (Stärke!AQ3:AV3, Kommentare AO2..AV3)

### B. Führungsstruktur / Einsatzstellen (Bereiche)
- F-B1 Einheiten werden Einsatzstellen ("Bereichen") zugeordnet: Führungsstelle, Meldekopf 1/2, Sonstiges Führung, Logistik, Angefordert/Anmarsch, Bereitstellung 1/2, Einsatzort 1..n, Einsatz beendet. (Stärke!B6..B431)
- F-B2 Bereiche sind frei benennbar (z. B. EA/UEA); je Bereich wird eine Führungsstelle in der ersten Zeile geführt. (Hinweise!C11-C12, C125-C126; Kommentare "Bezeichnung ggf. anpassen")
- F-B3 Anzahl der Einsatzorte bis mindestens 21, mindestens 2 Bereitstellungsräume und 2 Meldeköpfe (Excel-Obergrenzen; ein Nachfolger sollte unbegrenzt sein). (Neu!B3; Druck!B14:B34)
- F-B4 Bereiche können einzeln oder mehrfach ein-/ausgeblendet werden; leere Einsatzstellen werden in Ausgaben unterdrückt. (Hinweise!C88; t_druck.Worksheet_Activate)
- F-B5 Umgliederung: Einheiten (auch mehrere, nicht zusammenhängend) zwischen Bereichen verschieben; Reihenfolge innerhalb eines Bereichs steuerbar ("nach der Zielzeile"). (Hinweise!C85; Neu!B25)

### C. Einheit erfassen (Datensatz)
- F-C1 Felder je Einheit: FüSt./Führungsstelle, Bezeichnung, Organisation (Liste THW|FW|BW|DRK|JUH|ASB|MALT|DLRG|POL|BPOL|HK/NLWKN|ZIV), Herkunft, Zug, Trupp/Staffel, Gruppe, Person, Geräte/Fahrzeuge (inkl. Kennzeichen, Langtext), Aufträge (Langtext, Einsatzverlauf von-bis), Erreichbarkeit (Funk/Tel./eMail), Verfügbar bis, Ablösung angefordert, Anforderungs-ID, Zugesagt für, Zugesagt von, Vorgesehene Einheit, Vorgesehener Auftrag, eingetr./zugew., Einsatzende, Rückführung, Bemerkungen, Reserve 1/2, Status, Schicht, ID EEB, Weibl., Div., Veget., Vegan., ÜN m/w/d, Fü, Ufü, He, Gesamt (berechnet). (Stärke!B4:AM4; Hinweise!C13-C48; ERLAUBTE_ORGANISATIONEN)
- F-C2 Taktische Stärke wird als Fü / UFü / He = Gesamt geschrieben und summiert; Gesamt = Summe. (Hinweise!C45-C48; Druck-Format)
- F-C3 Personen (TeBe, FaBe, LNA, Ziv.) und Geräte/Fahrzeuge werden als eigene Zeilen/Felder geführt. (Hinweise!C18-C19)
- F-C4 Langtexte (Geräte, Aufträge, Schichtplanungspersonen) sind über einen Texteditor mit Zeilenumbrüchen editierbar (Strg+A). (Hinweise!C19-C20, C112; ufr_textEingabe)
- F-C5 Eingabemaske mit Validierung der Listenfelder (Organisation, Status, Schicht) und Dateiauswahl für EEB. (ufr_datenEingabe; m_userformFunktionen:3185-3230)
- F-C6 Zeitstempel "jetzt" per Tastenkürzel in Datumsfelder. (Strg+D; Neu!B16)
- F-C7 Neue Zeilen einfügen/löschen, einzeln oder mehrere. (Hinweise!C83-C84)

### D. Einheiten-Erfassungsbogen (EEB)
- F-D1 Je Einheit eine EEB-ID (Dateiname mit/ohne Endung, Form FüSt-intern abgestimmt), die auf die abgelegte EEB-Datei in einem konfigurierbaren Ordner (relativ/absolut, NAS) verlinkt; erlaubte Endungen pdf, docx, png, jpg, jpeg, odt, svg, webp, avif, heic; Links aktualisierbar; Warnung bei fehlendem Ordner. (Hinweise!C33, C36, C95; m_eeb)
- F-D2 Digitaler EEB (QR-Code der App erfassungsbogen.app) muss eingelesen und in einen Einheiten-Datensatz überführt werden: Format URL-Fragment → Base41/Base64url → Magic EEB2/EEB2C → raw Deflate → Binärschema 2..8 (Epoche 2020) mit Feldern Organisation (Code 1..11, 255), Einheitstyp, Einheit-Ort, Hierarchie, OV-Nr., Ort/Auftrag, Zeitraum von/bis, Einsatzbeginn/-ende, Stärke Fü/UFü/Mannschaft/Gesamt, Unterbringung m/w/d, vegetarisch/vegan, Sofortbedarf (Verpflegung, Diesel/Benzin/Gemisch, Unterbringung, Ruhezeit), Sonstiges, Personalliste (Name, Rolle, Funktionen, Fahrerlaubnis, Geschlecht, Ernährung, Kontakte, Qualifikationen), Fahrzeugliste (Typ, Kennzeichen, Funkrufname, StAN-konform, Änderungen), Signaturstufen, Übung-Flag. (m_digitalerEEBParsing:1096-1930)
- F-D3 Datenfelder der Kräfteübersicht folgen dem EEB-Formular (divers/vegan wurden wegen neuer EEB ergänzt). (Neu!B33)

### E. Meldekopf-Anbindung
- F-E1 Ein oder mehrere ausgelagerte Meldeköpfe erfassen Anmeldungen parallel zur FüSt; die FüSt übernimmt sie mit Quittierung (neu = gelb, übernommen = grün, Änderung = wieder gelb). (Hinweise!C159-C172)
- F-E2 Meldekopf-Einträge werden nicht gelöscht (Nachvollziehbarkeit, Datenverlust-Schutz). (Hinweise!C165)
- F-E3 Der Meldekopf führt ein eigenes ETB, das Teil des ETB der FüSt ist. (Hinweise!C164)
- F-E4 Übernahme darf Formatierung/Struktur der Zieltabelle nicht beschädigen (heutiger Workaround "als Formel einfügen"). (Hinweise!C168-C170)
- F-E5 Meldekopf kann ohne Netzverbindung zur FüSt arbeiten (heute: Google-Tabelle/Google-Drive als Brücke). (Hinweise!C33, C161)

### F. Ressourcenplanung / Ablösung
- F-F1 Anforderungsvorgang je Einheit dokumentieren: Ablösung angefordert (Zeit), Anforderungs-ID (Format mit übergeordneter Stelle abgestimmt), Zugesagt für/von, vorgesehene Einheit, vorgesehener Auftrag, Eintreffen/Zuweisung, Einsatzende, Rückführung. (Hinweise!C21-C32; image84)
- F-F2 Angeforderte/anmarschierende Einheiten werden in einem eigenen Bereich geführt und in Gesamtstärken nicht mitgezählt, aber separat ausgewiesen. (Stärke!B138; Druck!E35; Log!C38)
- F-F3 Verknüpfung Einheit A (abzulösen) ↔ Einheit B (Ablösung) über gemeinsame Anforderungs-ID und "Vorgesehene Einheit"/"Vorgesehener Auftrag". (image84)
- F-F4 Ressourcenspalten sind optional ein-/ausblendbar; Verfahren nicht erzwungen. (Hinweise!C89, C129-C130)
- F-F5 Nach Einsatzende werden Einheiten in einen Archivbereich "Einsatz beendet" verschoben und bleiben auswertbar. (Hinweise!C105; Stärke!B431)

### G. Status und Schicht
- F-G1 Status aus fester Liste: Rufbereitschaft, Einsatzvorbehalt, Angefordert, Anmarsch, Rückmarsch, Einsatzbereit, Einsatz, Ruhe, Nicht einsatzbereit. (ERLAUBTE_STATUSE; Status!B25:B33)
- F-G2 Schicht aus Liste Tag, Nacht (2-Schicht) bzw. Früh, Spät, Nacht (3-Schicht); Vorbelegung Tag. (Hinweise!C35; Kommentar AA4)
- F-G3 Plausibilität: Einheiten ohne Status/Schicht/Organisation werden gemeldet. (Status!G36, G43)

### H. Logistik
- F-H1 Je Einheit: Anzahl weiblich, divers, vegetarisch, vegan, Übernachtungsbedarf m/w/d; männlich = Rest. (Hinweise!C38-C44; Log!I7)
- F-H2 Logistikübersicht je Einsatzraum und Schicht (Früh/Spät/Tag/Nacht, Summe, M/W/D, Veget/Vegan, Unterbringung M/W/D) mit Gesamtzeile und separat "Angefordert/Anmarsch". (Log!C5:P38)
- F-H3 Frei bearbeitbare/exportierbare Kopie der Logistikdaten mit Zeitstempel. (LogFrei; Hinweise!C94, C120)
- F-H4 Logistikspalten ein-/ausblendbar. (Hinweise!C90)

### I. Personal der Führungsstelle / Schichtplanung
- F-I1 Eigene Stärke der FüSt nach Unterbereichen (Stab, ZTr FK, FGr F, FGr K, Externe) und Funktionen (Ltr FüSt, Ltr Stab, SGL 1–6, FüGeh SG, Ltr FZ FK, ZTrFü FK, SprFu/Kf, He ZTr, GrFü F/K, LdF, SprFu, TrFü K, He K) je Tag/Nacht mit Fü/Ufü/He; fließt in die Kräfteübersicht ein. (FüSt!B8:B139; Stärke!B7:B16)
- F-I2 Schichtplanung: Datumsspalten × Funktion/Schicht mit Namen und Zusatzinfos (Herkunft, Erreichbarkeit, Einsatzoptionen); alte Tage ausblendbar; erweiterbar. (Hinweise!C111-C115; FüSt!I4:AS139)

### J. Kopiervorlagen (StAN)
- F-J1 Vorlagenkatalog taktischer Einheiten THW (StAN), Feuerwehr, KatS-StAN Nds mit Zug/Trupp/Gruppe-Einordnung und Fahrzeugen; Vorlagen ohne Stärken; Kopieren an Zielort mit anschließender Anpassung von Status/Schicht. (Stärke!B23:B122; Hinweise!C155-C157)
- F-J2 Vorlagen sind pflegbar/aktualisierbar (Versionen 0.3, 0.4, 1.5.0, 1.5.1). (Neu)

### K. Ausgaben
- F-K1 "Druck": Stärken Fü/UFü/He=Gesamt je Einsatzstelle in fester Reihenfolge, Gesamtzeile, Plausibilität, Org-Filter ("Davon Stärke: <Org>"), Zeitstempel, Einsatz-/FüSt-Name, ohne Angefordert/Anmarsch, leere Einsatzstellen ausgeblendet, Zoom für Lagekarten-Druck. (Druck; Hinweise!C107)
- F-K2 "Status": Matrix Organisation × (Fü/UFü/He=Gesamt, Männl., Weibl., Veget., Unterbringung m/w); Stärke je Status; Stärke je Schicht; Kontrollsummen. (Status; Hinweise!C108)
- F-K3 "Log"/"LogFrei" wie F-H2/F-H3.
- F-K4 "FüOrg": bearbeitbare Führungsharke mit Einsatz-/FüSt-Namen, Stärkeanzeige, Bereitstellung/Logistik-Knoten, Abschnittsraster und Palette taktischer Zeichen (THW/FW-Einheiten mit Größenpunkten, Führungsstellen-Fahnen KatSL/LuK/TEL/ÖEL/ELO/EL/EAL/UEAL, Personen-Rauten EL/EAL/UEAL/LNA/OrgL/ÖEL/TEL, Funktionskreise Log/M/Sandsack, LtS, Organisations-Rauten NLWKN/Pol/BW); druckbar; Zeitstempel. (FüOrg; drawing4; Hinweise!C110)
- F-K5 "Auswertung": flache, filterbare Gesamttabelle aller Einheiten mit Bereich als Spalte, Zeitstempel, Summen (SUBTOTAL). (Auswertung!A4:AM4)
- F-K6 Live-Monitor: Druck (optional Status/Log) periodisch als statische HTML-Datei an einen Netzort exportieren; Browser/Tablet lädt alle 60 s neu. (Hinweise!C99; Textfeld 2; m_htmlExport)
- F-K7 Alle Ausgaben tragen "Stand: <Datum/Zeit>". (Druck!E4, Status!E5, Log!D4, FüOrg!N7, Auswertung!B1, LogFrei!E4)

### L. Speichern, Versionierung, Hilfe, Schutz
- F-L1 Speichern erzeugt Verlaufskopie mit Zeitstempel und aktualisiert eine "Aktuell"-Datei; Erstspeicherort wird abgefragt und dann beibehalten; Autospeichern im Minutenintervall. (Hinweise!C97-C100; m_speichern)
- F-L2 Kein Undo → Historie/Wiederherstellung über Kopien; ein Nachfolger sollte echtes Undo/Änderungsprotokoll bieten. (Hinweise!C70-C72)
- F-L3 Schutz vor versehentlichem Ändern der Struktur (Kopfzeilen, Formeln); Admin-Modus mit Passwort. (Hinweise!C10, C74; Workbook_Open)
- F-L4 Tastenkürzel für alle Kernfunktionen; Hilfe/Abkürzungsliste (AküLi) und Handbuch in der Anwendung; ControlTips. (Textfeld 19; Neu!B28, B39; AküLi)
- F-L5 Bereichsübergreifende Sichten (Ressourcen, Logistik, Kosten) ausblendbar, um die Tabelle schmal zu halten. (Hinweise!C89-C91)
- F-L6 Kostenabschätzung je Einheit (PSA, VDA, UK/Verpflegung, Einsatztage) als Näherung. (Hinweise!C49-C58; Rechteck 62)

### N. Nicht-funktional
- N-1 Offline-Betrieb im FK-Netz ohne Internet; Cloud (Google) nur als Notbrücke. (Hinweise!C33, C161)
- N-2 Datenhaltung dateibasiert auf Netzlaufwerk/NAS; Pfade relativ zur Anwendung möglich. (m_eeb waehleOrdnerPfad; Textfeld 2)
- N-3 Mehrbenutzer: mind. FüSt-Bearbeiter + 1–2 Meldeköpfe schreibend, Führung/Logistik/Lagekarte lesend (Tablet), ohne Serverprozess. (Hinweise!C159; Textfeld 2)
- N-4 Druckbare Ausgaben (Lagekarte) in fester, kompakter Form (A4/Zoom 55 %). (Hinweise!C107, C110; t_druck)
- N-5 Bedienung unter Stress: Tastatur-first, Eingabemasken mit Listen, minimale Ladezeiten, Bestätigungen, keine Formatzerstörung durch Nutzerfehler. (Textfeld 4; Neu!B24; Hinweise!C168-C170)
- N-6 Nachvollziehbarkeit: Zeitstempel überall, Verlaufskopien, unlöschbare Meldekopf-Historie, Archivbereich. (Hinweise!C165; Stärke!B431)
- N-7 Vertraulichkeit/Weitergabe: THW-interne Nutzung, Zugriffsschutz für Admin-Funktionen. (Workbook_Open; Startseite!IV1)
- N-8 Kompatibilität mit dem digitalen EEB (erfassungsbogen.app, Schema ≤ 8) und Papier-/Datei-EEB. (m_digitalerEEBParsing; m_eeb)
- N-9 Datenfeld-Kompatibilität für Auswertung in Excel (flache Tabelle exportierbar). (Auswertung; LogFrei "kann in eine andere Datei exportiert werden")

## 8. (b) Rollenmodell (kompakt)

| Rolle | Rechte in einem Nachfolgesystem (abgeleitet) | Excel-Beleg |
|---|---|---|
| Bearbeiter Kräfteübersicht (FüSt, i. d. R. S1 [unbelegt]) | Vollzugriff auf Einheiten, Bereiche, Status, Ressourcenplanung, Logistikzahlen, Auswertungen, Speichern/Export | Hinweise Kap. 1–4 |
| Meldekopf (1..n) | Anlegen/Ändern von Anmeldungen (eigener Eingangskorb), EEB-Ablage, ETB-Eintrag; keine Umgliederung | Hinweise!C159-C172 |
| Leiter FüSt / Führung | Lesen Druck/Status/FüOrg, FüOrg bearbeiten | Hinweise!C107-C110 |
| Logistik | Lesen Log, LogFrei bearbeiten/exportieren | Hinweise!C109, C120 |
| Lagekarte/Monitor (Tablet) | Nur lesen (HTML/Ausdruck) | Textfeld 2 |
| Admin (FK Oldenburg) | Schutz aufheben, Passwort, Vorlagenpflege, Struktur | m_makroFunktionen; Startseite |
| Externe: übergeordnete FüSt, entsendende Stelle, Einheitenführer | Keine Systemrolle; liefern Anforderungs-ID, Zusage, EEB | Hinweise!C24-C28; image84 |

## 9. (c) Glossar (aus Hinweise, AküLi, Kopiervorlagen, FüSt, VBA)

Allgemein/Führung: FüSt = Führungsstelle; übergeordnete FüSt (Stammdaten!C6); Stab, Ltr FüSt, Ltr Stab, SGL 1–6 = Sachgebietsleiter, FüGeh SG = Führungsgehilfe Sachgebiet (FüSt!B10:B37) [Ausschreibung SGL/FüGeh unbelegt, THW-üblich]; EA/UEA = Einsatzabschnitt/Untereinsatzabschnitt, EAL/UEAL = (Unter-)Einsatzabschnittsleiter (Hinweise!C12, C126); Z Bef St = Zugbefehlsstelle (Hinweise!C12) [unbelegt]; EL, ELO, ÖEL, TEL, KatSL, LuK = Einsatzleitung/… (FüOrg-Palette; Ausschreibungen: TEL = Technische Einsatzleitung, ÖEL = Örtliche Einsatzleitung, KatSL = Katastrophenschutzleitung, LNA = Leitender Notarzt, OrgL = Organisatorischer Leiter, LtS = Leiter Stab [unbelegt]); Meldekopf = ausgelagerte Anmeldestelle (Hinweise!C159); ETB = Einsatztagebuch (Hinweise!C164); EEB = Einheiten-Erfassungsbogen (Hinweise!C95); Bereitstellungsraum/BR (Stärke!B17, B162); Einsatzstelle/Einsatzort/Bereich (Hinweise!C11); FüOrg = Führungsorganisation, "Führungsharke" (Hinweise!C110); StAN = Stärke- und Ausstattungsnachweisung (Hinweise!C156) [Ausschreibung unbelegt]; KatS Nds = Katastrophenschutz Niedersachsen (Stärke!B73, B82); AküLi = Abkürzungsliste (AküLi!A1:B1); FK = Fachzug Führung/Kommunikation (Kopiervorlagen "FZ FK(A/B)", "ZTr FK"; "THW FK-Oldenburg", "FK Netz-Laufwerk") [Ausschreibung unbelegt]; FGr F = Fachgruppe Führung, FGr K = Fachgruppe Kommunikation (FüSt!B67, B93) [unbelegt]; TZ = Technischer Zug, ZTr = Zugtrupp (AküLi!A43), B = Bergungsgruppe, FGr N/R/W/O/Sp/SB/BT/I/E/TW/WP/Öl/BrB/Log = THW-Fachgruppen (Stärke!C29:C70); MT (Stärke!C26) [Bedeutung offen]; TeBe = Technischer Berater, FaBe = Fachberater (Hinweise!C18) [unbelegt]; Ziv. = Zivilperson.
Stärke: Fü/UFü/He = Führer/Unterführer/Helfer (Hinweise!C45-C47); taktische Schreibweise "Fü / UFü / He = Gesamt" (Druck); ÜN = Übernachtung (Hinweise!C42-C44); Veget./Vegan.; Div./d = divers; Schicht Tag/Nacht/Früh/Spät.
Ressourcen: Anforderungs-ID (Hinweise!C24-C25); Zusage; Ablösung; Rückführung; Verfügbar bis; Status-Werte s. F-G1.
Kosten: PSA = Persönliche Schutzausrüstung; VDA = Verdienstausfall [unbelegt]; UK = Unterkunft (Stärke!AU2).
Organisationen: THW, FW = Feuerwehr, BW = Bundeswehr, DRK, JUH = Johanniter, ASB, MALT/MHD = Malteser, DLRG, POL = Polizei, BPOL = Bundespolizei, HK/NLWKN (NLWKN = Nds. Landesbetrieb für Wasserwirtschaft, Küsten- und Naturschutz [unbelegt]; HK offen), ZIV = Zivil (Status!B7:B18; EebOrgName).
FüSt-Funktionen: Ltr FZ FK, ZTrFü FK, SprFu/Kf = Sprechfunker/Kraftfahrer, He ZTr, GrFü F/K, LdF [offen], TrFü K, He K (FüSt!B52:B107).
AküLi Einheiten (AküLi!A3:B44): FM Veg Fachmodul Vegetationsbrandbekämpfung; FGr VersES Fachgruppe Versorgung und Eigenschutz; FM Hfs Fachmodul Hochleistungsförderpumpensystem; FüGr FB Nds Führungsgruppe Feuerwehrbereitschaft Nds; FZ BS Fachzug Brandschutz; FZ TH Fachzug Technische Hilfe; FZ VegBBK Fachzug Vegetationsbrandbekämpfung; FZ WT Fachzug Wassertransport; GE MobHWS Geräteeinheit mobiles Hochwasserschutzsystem; GE SFM Geräteeinheit Sandsackfüllmaschine; Gr BT Gruppe Betreuung; Gr EV Gruppe Energieversorgung; Gr Fü Gruppe Führung; Gr LT Gruppe Logistik und Technik; Gr San Gruppe Sanitätsversorgung; Gr STau Gruppe Spezial Tauchen; Gr Tau Gruppe Einsatz Tauchen; Gr Vpf Gruppe Verpflegung; Gr WR Gruppe Wasserrettung; GTr W Gerätetrupp Wassergefahren; LG Löschgruppe; St BtL Staffel Betreuungstransport und -leitung; St Log Schlauch Staffel Logistik Schlauch; St Log WT Staffel Logistik Wassertransport; St PSNV Staffel Psychosoziale Notfallversorgung; St PT Staffel Patiententransport; St Reg Staffel Registrierung; St StrWR Staffel Strömungswasserrettung; St WR Staffel Wasserrettung; StLog WE Staffel Logistik Wasserentnahme; Tr Akl Trupp Aufklärung Luft; TR L Trupp Logistik schwer; Tr Log Schlauch; Tr LogFü Trupp Logistik Führung; Tr ML Trupp Melde- und Lotsen; Tr T Trupp Transport Bus 50; Tr TH Trupp Technische Hilfe; Tr VegBBK Trupp Vegetationsbrandbekämpfung; Tr WT Trupp Wassertransport; Z SB Zug Sanität und Betreuung; ZTr Zugtrupp; ZTr WR Zugtrupp Wasserrettung.
AküLi Fahrzeuge/Geräte (AküLi!A46:B111): AB HFS/Log/Mulde/Veg Abrollbehälter …; Anh (Bt, Kühl, Log, Tank, Trsp, Zelt) Anhänger …; DLK 23/12 Drehleiter; ELW 1/2 Einsatzleitwagen; FKH Feldkochherd; FüKw Führungskraftwagen; GW Bt/L 7,5/L Gr/L kl/San/SpTau/Tau/Vpf/WGT Gerätewagen …; GW-L1 Vpf, GW-L1BTrMt, GW-L2, GW-L2 HFS/SW/TH/Vers, GW-Str, GW-WR; HWB Hochwasserschutzboot; KdoW Kommandowagen; KOM Kraftomnibus; Kombi UAV, Kombi-L; Krad; KTW; LF 20/16; LF KatS; LKW K Kipper; LZ FW Löschzug Feuerwehr; Mat Cont Materialcontainer; MTW (Bt, Vpf, m); MZB KatS Mehrzweckboot; NEA 250 / NEA LiMa Netzersatzanlage; Raft Schlauchboot; RTW; RW Rüstwagen; SMF Sandsackfüllmaschine; SW KatS Schlauchwagen; TB KS 6000 L Tankbehälter Kraftstoff; TLF 16/25, 2000, 3000 Tanklöschfahrzeug; TSF Tragkraftspritzenfahrzeug; UslG Umschlaggerät; WLF Wechselladerfahrzeug; ZTrKw Zugtruppkraftwagen.

## 10. (d) Ausgabeprodukte – Kurzliste
1. Druck (Papier Lagekarte, HTML-Monitor): Einsatz, FüSt, Stand; Gesamt Fü/UFü/He=Gesamt; je Einsatzstelle Fü/UFü/He=Gesamt + Plausibilität; "Davon Stärke <Org>" je Einsatzstelle; ohne Angefordert/Anmarsch.
2. Status (Papier/HTML): Org × Stärke/Männl./Weibl./Veget./ÜN m/w; Stärke je Status (9 Werte); Stärke je Schicht (4 Werte); Kontrollsummen und Warntexte.
3. Log (Papier/HTML, geschützt) und LogFrei (bearbeitbar): je Einsatzraum Schichtsummen Früh/Spät/Tag/Nacht, Summe, M/W/D, Veget/Vegan, ÜN M/W/D; Gesamt; Angefordert/Anmarsch separat.
4. FüOrg (Papier): Führungsharke mit Namen, Stärke, Knoten, taktischen Zeichen; Stand.
5. Auswertung (Excel-Arbeitsblatt): flache Tabelle A:AM aller Einheiten mit Bereich, Zeitstempel, SUBTOTAL-Summen.
6. HTML-Dateien "Staerkeuebersicht <Einsatz> Druck|Status|Logistik.html" mit 60-s-Reload.
7. Dateikopien "<Einsatz>_Stärkeübersicht_Aktuell.xlsm" und zeitgestempelte Verlaufskopien.
8. Hilfe: Blatt Hinweise, AküLi-Fenster (Strg+H), ControlTips.

## 11. Offene Fragen
- Bedeutung "HK" in "HK/NLWKN", "Register HK Gerät", "HK Geräte VPS 24 Vers. 14.3" (Neu!B12, B20, B21; Status!B17) – nicht in AküLi.
- "Version für TLtg." (Neu!B14) – TLtg nicht aufgelöst.
- Kürzel "MT" (Stärke!C26), "LdF" (FüSt!B74), "M"-Kreissymbol und weitere unbeschriftete Zeichen der FüOrg-Palette – keine Legende in der Datei.
- Ob die FüSt-Rolle "S1" heißt: Excel benennt nur SGL 1–6; Zuordnung Kräfteübersicht → S1 ist Fachwissen, nicht belegt.
- Inhalt/Layout der Google-"Meldekopf-Tabelle" (nur beschrieben, nicht in der Datei); Ort der externen Todo-Liste (Nummern bis 77).
- Ob HTML-Exporte Status/Logistik im Menü erreichbar sind (Code vorhanden, Handbuch nennt nur Druck; ufr_erweitertesSpeichern nicht vollständig geprüft).
- Warum Einsatzort 13 doppelt (B330/B331) und Einsatzort 19 versetzt ist (Altlast oder Absicht).
- Welche Statusliste gilt ("Ruf Bereitsch." vs. "Rufbereitschaft") – Handbuch/Status-Blatt und Eingabemaske widersprechen sich.
- Vollständige Bit-Semantik des EEB-Schemas (Vokabulartabellen EebVokabText für Einheitstypen/Funktionen/Fahrzeuge nur für THW) – für eine Reimplementierung ist die App-Spezifikation erfassungsbogen.app maßgeblich, nicht der VBA-Nachbau.
- Strg+J (Neu!B16) vs. Strg+D (Code) – welches Kürzel ist im Einsatz eingeübt.

## Anhang – Rohbefunde aus den Zwischenständen
(siehe excel-handbuch-anforderungen.zwischenstand.bak; die wesentlichen Daten sind oben eingearbeitet: Spaltenlayout Stärke, Bereichszeilen, benannte Bereiche, Ausgabeformeln, Drawing-/VML-Objekte, Kommentare, VBA-Module und -Konstanten.)
