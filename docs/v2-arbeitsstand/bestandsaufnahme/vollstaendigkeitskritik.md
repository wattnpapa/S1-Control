# Vollständigkeitskritik – S1-Control Architektur-Neubewertung

Stand: abgeschlossen 2026-09-07

## Gliederung
1. Bestandsaufnahme der acht Berichte (Größe, Endzustand, Abbruchstellen)
2. Prüfung der fünf abgebrochenen Berichte gegen ihre Aufträge
   2.1 excel-domaenenmodell
   2.2 excel-vba-workflows
   2.3 excel-handbuch-anforderungen
   2.4 bmecat-stack-muster
   2.5 nas-speicher-recherche
3. Prüfung der Leitfragen
   3.1 Excel-Datenmodell vollständig?
   3.2 EEB-Format vollständig / Begleit-App?
   3.3 S1-Control-Features vs. IPC-Vertrag
   3.4 SQLite-auf-SMB-Scheitern und Lost Updates
   3.5 Tauri-Fähigkeiten belegt?
   3.6 Widersprüche zwischen Berichten
   3.7 Fehlende Zahlen
4. Gesamtbewertung
5. Nachlese-Aufträge (max. 6)

## 1. Bestandsaufnahme


Alle acht Berichte wurden vollständig gelesen (Stand 2026-09-07):

| Bericht | Zeilen / KB | Endzustand laut Datei | Vollständig gelesen |
|---|---|---|---|
| excel-domaenenmodell.md | 532 / 57 | "abgeschlossen"; Gliederung 0–11 vorhanden, endet mit §11 Offene Fragen | ja |
| excel-vba-workflows.md | 484 / 58 | Status "IN ARBEIT"; Gliederung nennt 13 Abschnitte, Datei endet nach §11.7 | ja |
| excel-handbuch-anforderungen.md | 307 / 50 | "ABGESCHLOSSEN"; §0–11 + Anhang | ja |
| bmecat-stack-muster.md | 462 / 76 | "wird fortlaufend geschrieben"; §0–10 vorhanden, endet mit §10 Offene Fragen (11 Punkte) | ja |
| nas-speicher-recherche.md | 329 / 64 | "ABGESCHLOSSEN"; §0–12 vorhanden | ja |
| s1-historie-qualitaet.md | 275 / 38 | abgeschlossen; §1–9 | ja |
| s1-main-architektur.md | 435 / 55 | abgeschlossen; §1–11 (Reihenfolge im Text 1, 3a, 3b, 3c, 4, 5, 6, 3d, 1b, 2, 7, 8, 9, 10, 11) | ja |
| s1-renderer-features.md | 402 / 52 | abgeschlossen; §1–12 | ja |

Vorläufiger Befund erster Ordnung: excel-vba-workflows.md bricht nach §11.7 ab; die in der eigenen Gliederung angekündigten Abschnitte 10 "(a) Workflow-Katalog", 12 "(c) Verfahren, die in einer echten App anders gelöst werden sollten" und 13 "Offene Fragen" fehlen (Verifikation per grep folgt in §2.2).

## 2. Prüfung der fünf abgebrochenen Berichte gegen ihre Aufträge

### 2.1 excel-domaenenmodell – Auftrag (a) ER-Zielmodell, (b) Spalte→Attribut→Typ→Regel, (c) Kennzahlen mit Formel
- (a) vorhanden: §8.1 Entitäten (Einsatz, Einsatzstelle/Bereich, Einheit, Einheitstyp/Kopiervorlage, FüSt-Teileinheit, Dienstposten, Schichtplan-Eintrag, EEB in zwei Ausprägungen, Meldekopf-Eintrag, Snapshot), §8.2 Beziehungen, §8.3 Enumerationen (Organisation 12 Werte, Status 9 Werte, Schicht 4 Werte, Bereichstyp, EEB-Enums).
- (b) vorhanden: §9 Tabelle über alle Spalten B..AW plus Kopfzellen, Stammdaten, FüSt-Spalten, Auswertung!A, Startseite!IV11.
- (c) vorhanden: §10 mit 21 Kennzahlen/Regeln inkl. Zellformeln (Bereichssummen, Gesamtsumme Zeile 5 mit 32 Summanden, Druck-Plausibilität, SUMIF/SUMIFS nach Org/Status/Schicht, Kosten, CF-Warnung Verfügbar-bis).
- Vollständigkeit der Excel-Abdeckung: alle 13 Blätter zugeordnet (§0), alle Bereiche mit Zeilen und benannten Bereichen (§1.1, §1.2), alle Spalten (§2), Statusliste inkl. Inkonsistenz "Ruf Bereitsch."/"Rufbereitschaft" (§2 Spalte Z, §4.2), Schichtwerte Tag/Nacht/Früh/Spät (§2 Spalte AA), `*_Herkunft`-Bereiche (zeigen auf Spalte D Organisation, nicht auf E Herkunft – §1.1, §4.1), Kommentare (§7), FüSt-Dienstposten (§5), AküLi (§6).
- Mangel: §11 verweist bei EebVokabText auf eine "Ergänzung unten", die nicht existiert (Datei endet mit §11). Der Punkt ist aber im VBA-Bericht §8.4 geklärt (EebVokabText und EebBogenSchreiben sind in keinem Modul definiert; PROJECT-Stream geprüft).
- Urteil: Liefergegenstände (a)–(c) vollständig. Kein Gap erster Ordnung.

### 2.2 excel-vba-workflows – Auftrag (a) Workflow-Katalog, (b) EEB-Spezifikation, (c) anders-zu-lösende Verfahren
- Datei endet nach §11.7 (grep der Überschriften: 1, 2, 4, 3, 5, 6, 7, 9, 8, 11 – kein §10, kein §12, kein §13; Status im Kopf "IN ARBEIT").
- (a) Workflow-Katalog FEHLT als konsolidierter Liefergegenstand. Das Rohmaterial ist in §2–§9 vorhanden (Menü/Shortcuts, Zeilenoperationen mit Regeln, Dateneingabe-Maske mit Spaltenzuordnung, Speichern inkl. Autospeichern/OnTime, HTML-Export, EEB-Verlinkung, Auswertung/LogFrei, Bereiche verbergen, Workbook-Events, Testmodul), aber nicht in der geforderten Form "Name, Auslöser, Schritte, Regeln, betroffene Daten" je Workflow.
- (b) vorhanden und sehr gründlich: §11.1 Textschicht (Base41-Alphabet und -Gruppierung, Base64url), §11.2 Container EEB2/EEB2C mit Ed25519-Signaturstufen, §11.3 Primitive (u8/u16/u32 LE, varint, str, vokab mit 0=Freitext, BCD-Telefon, EebDatum u16 Tage seit 2020-01-01, EebZeitpunkt u32 Minuten lokale Wandzeit), §11.4 komplette Feldreihenfolge mit Flag-Bits (eflags, hflags, zflags, pflags Bit0–4, Person-flags Bits 0–3/4–5/6–7, kflags, fflags Bit0–4, sflags), Schema-Weichen v2/v3/v6/v7/v8, §11.5 alle Enum-Zahlenwerte und Vokabular-Namensräume (E 1–46, F 1–102 + 200–344, V 1–55, H je Organisation, K 1–7), §11.6 Segmentierung EEBS mit FNV-1a-32-Prüfsumme und QR-Budget, §11.7 Referenz-Mapping der App auf das Oldenburger Excel-Layout. Begleit-App gefunden: /Users/johannes/Developer/einheitenerfassungsbogen (src/codec.ts 1.043 Z., docs/datenmodell.md, src/app/oldenburg-xlsx.ts). Bit-Ebene erreicht.
- (c) Liste der anders zu lösenden Verfahren FEHLT als Liefergegenstand. Einzelbefunde sind über den Text verstreut (kein Undo bei Zeilen entfernen §3.3; Kopieren dupliziert Stärke/Status/EEB-ID §3.4; `Schicht_Angefordert` wird bei jedem Einfügen/Verschieben global geleert §3.1/§3.5; Fachlogik in Locked-Flags der Spalte D §3.1; Zustand in versteckten Zellen Startseite!IV1..IV11 §1; Passwort im Klartext §5.4; `For Each` über String-Konstante macht EEB-Link-Aktualisierung defekt §7.4; EebVokabText undefiniert macht Strg+Q nicht kompilierbar §8.4; doppeltes SaveAs mit Sekundenkollision §5.1; HTML-Export nur bei offener Mappe §6.3), aber nicht zusammengeführt und nicht mit Begründung je Verfahren.
- Fehlt außerdem: §13 Offene Fragen des Berichts.
- Urteil: (b) vollständig, (a) und (c) fehlen → Gap erster Ordnung (siehe §5, Gap 1).

### 2.3 excel-handbuch-anforderungen – Auftrag (a) Anforderungsliste, (b) Rollenmodell, (c) Glossar, (d) Ausgabeprodukte
- (a) vorhanden: §7 mit F-A1…F-L6 (12 Gruppen A–L, ca. 55 funktionale Anforderungen) und N-1…N-9 (nicht-funktional getrennt), jede mit Quelle (Blatt!Zelle, VBA-Zeile, Neu-Version).
- (b) vorhanden: §1 (Rollen/Arbeitsplätze mit Belegen) und §8 (kompaktes Rollenmodell für ein Nachfolgesystem).
- (c) vorhanden: §9 Glossar (Führung, Stärke, Ressourcen, Kosten, Organisationen, FüSt-Funktionen, AküLi Einheiten und Fahrzeuge), unbelegte Ausschreibungen als [unbelegt] markiert.
- (d) vorhanden: §3 (exakter Inhalt je Blatt inkl. Zellbereiche, Formeln, bekannter Defekte) und §10 (Kurzliste 8 Produkte).
- Zusatznutzen: §4 Versionshistorie mit Bedarfsrückschluss, §5 dreizehn Schwächen/Workarounds, §2.2 fünf Anmeldevarianten inkl. Meldekopf-Google-Tabelle als bereits gelebter Zwei-Stellen-Prozess.
- Urteil: vollständig. Kein Gap erster Ordnung.

### 2.4 bmecat-stack-muster – Auftrag (a) Musterkatalog, (b) Übertragbarkeitsmatrix, (c) Projektstruktur-Vorlage, (d) Risikoliste mit Gegenmaßnahmen
- (a) vorhanden: §8.1 M1–M35 mit Datei:Zeile und Bewertung.
- (b) vorhanden: §8.2 (übernehmen/anpassen/neu/nicht übernehmen je Baustein) plus §8.4 Plugin-/Crate-Liste.
- (c) vorhanden: §8.3 Verzeichnisbaum mit Crates s1-model/s1-store/s1-stan/s1-net/s1-import/s1-export/s1-cli, src-tauri-Modulen, zwei Fenstereinstiegen, docs/-Struktur, CI-Gerüst.
- (d) vorhanden: §9 R1–R15 mit Einschätzung und Gegenmaßnahme (WebView2 offline, drei Engines, Debugging, Build-Zeiten, Ein-Personen-Team, E2E-Werkzeugwechsel, Drucken, Mehrfenster, SMB, Datei-Watching, Updater/Minisign, Security-Defaults, Signing, Migration, Doku).
- Tauri-Fähigkeiten für S1-Bedarf: Mehrfenster (R8, Bug #14019 ungeprüft), Updater (R11, tauri-plugin-updater + Minisign, SemVer-Zwang vs. Zeitstempelversion), Drucken (R7: kein Print-API, Ausweg Datei + opener), WebView2 offline (R1: offlineInstaller ~127 MB bzw. fixedRuntime ~180 MB, mit Quellen), UDP (§8.4 std/tokio UdpSocket) – alle adressiert; Restunsicherheiten in §10 Fragen 3, 4, 7, 8, 9 ehrlich benannt.
- Messwerte vorhanden: cargo test Kern warm 1,06 s / kalt 26,7 s (68 Crates, 693 MB); Tauri-Debug-Kaltbau "~4 min" nur aus UI-ABNAHME.md übernommen, nicht gemessen.
- Urteil: vollständig. Kein Gap erster Ordnung. Inhaltlicher Widerspruch zu nas/main siehe §3.6.

### 2.5 nas-speicher-recherche – Auftrag (a) Bewertungsmatrix A–F, (b) belegte SMB-Aussagen, (c) Empfehlung + 5 Restrisiken, (d) Dateilayout
- (a) vorhanden: §9 Matrix A–F gegen Konsistenz, Datenverlust, Offline, Komplexität, Undo, Nachvollziehbarkeit, Performance <5.000, Aufwand Rust, Aufwand Node, plus Zeile "SMB-Eigenheiten, die treffen".
- (b) vorhanden: §1.1–§1.11 mit URLs (sqlite.org howtocorrupt/lockingv3/wal/faq, Microsoft SMB2-Redirector-Caches 10 s/5 s/10 s, Oplock vs. Lease, MS-SMB2 FLUSH/Durable Handles/SessTimeout 60 s, mount.cifs cache=/actimeo/nobrl, open(2) O_APPEND/O_EXCL auf NFS, Node fs.watch und Rust notify Known Problems, Apple nsmb.conf, Samba-HOWTO veto oplock files, HLC-Paper, uhlc/automerge/loro/yrs docs.rs, Fireboard/CommandX). Unbelegte Punkte markiert (Windows-Rename-Atomarität, O_EXCL→SMB2 CREATE, libuv MoveFileEx, Firewall-Verhalten).
- (c) vorhanden: §10 Empfehlung Option C (Append-only Ereignisprotokoll, ein Schreiber je Datei, HLC, deterministischer Fold) ausgebaut zu E (lokale Materialisierung), mit fünf Restrisiken (Regelwerk-Vollständigkeit, Sichtbarkeitsverzögerung durch SMB-Caches, Schema-Evolution, Client-Identität, Snapshot-Korrektheit).
- (d) vorhanden: §11 Verzeichnisbaum (manifest, einsaetze/<ordner>/{einsatz.json, events/<clientId>.<segment>.jsonl, snapshots/, presence/, attachments/, archive.marker}, archiv/, stammdaten/) mit Regeln (nur create-new + append, Event-Zeilenformat mit len/crc32/prev-Hash, lokale Spiegelung, Poll-Zyklus 2 s, Snapshot-Politik, Archivierung).
- Urteil: vollständig. Kein Gap erster Ordnung.

## 3. Prüfung der Leitfragen

### 3.1 Ist das Excel-Datenmodell vollständig?
Ja, in Bezug auf die Excel selbst (siehe §2.1 und §2.3): alle 13 Blätter, alle 49 Spalten A..AW, alle Bereiche mit Zeilen und benannten Bereichen (342 Namen), Statusliste (9 Werte, inkl. der Inkonsistenz Formular "Rufbereitschaft"/"Einsatzvorbehalt" vs. Status-Blatt "Ruf Bereitsch."/"Einsatzvorbeh.", vba_full.txt:3092 vs. Status!B25:B26), Schichtwerte (Tag/Nacht/Früh/Spät, vba_full.txt:3093, Kommentar AA4), `*_Herkunft`-Bereiche (zeigen auf Spalte D Organisation, nicht auf E Herkunft), FüSt-Dienstposten mit Tag/Nacht-Doppelzeilen, Kopiervorlagen (THW 46, FW 4, KatS Nds ca. 40), AküLi (42 Einheiten + 66 Fahrzeuge), Zellkommentare, Versionshistorie (Blatt Neu), versteckte Zustandszellen Startseite!IV1..IV11.

Eigene Ergänzung – Kapazität der Vorlage (aus defined_names.txt): Führungsstelle 10 + Meldekopf/Sonstiges 6 + Logistik 12 + Angefordert 22 + Bereitstellung 1 22 + Bereitstellung 2 11 + 21 Einsatzorte × 9 = **272 Einheitenzeilen**; Druck-Blatt fest 29 Einsatzstellen-Zeilen (6–34); Blatt Stärke bis Zeile 1049 (Archivbereich ab 431); Datei 1,08 MB (leer). Die Excel ist also auf Größenordnung 100–300 Einheiten ausgelegt. Das Kriterium "<5.000 Einheiten" aus dem NAS-Auftrag liegt um Faktor 15–50 darüber, die "Großlage 150 Einheiten" des Main-Berichts passt zur Vorlage. Reale Zahlen fehlen (siehe §3.7).

**Was fehlt: der Feld-für-Feld-Abgleich Excel ↔ S1-Control v1.** Keiner der acht Berichte hat das Excel-Zielmodell (excel-domaenenmodell §9) gegen das v1-Format (s1-main-architektur §8, json-store/types.ts) gelegt. Erste Fassung aus den beiden Berichten (zu verifizieren, Gap 2):

| Excel (Stärke-Spalte / Struktur) | S1-Control v1 (JsonEinheit u. a.) | Deckung |
|---|---|---|
| B FüSt-Kennung ("erste Zeile = FüSt des Bereichs") | – (Abschnitt hat nur name; keine Position/Reihenfolge) | fehlt |
| C Bezeichnung | nameImEinsatz | ja |
| D Organisation (12: THW, FW, BW, DRK, JUH, ASB, MALT, DLRG, POL, BPOL, HK/NLWKN, ZIV) | organisation (14: THW, FEUERWEHR, POLIZEI, BUNDESWEHR, REGIE, DRK, ASB, JOHANNITER, MALTESER, DLRG, BERGWACHT, MHD, RETTUNGSDIENST_KOMMUNAL, SONSTIGE) | Abbildung nötig; HK/NLWKN, ZIV fehlen in S1; MALTESER und MHD doppelt in S1; EEB-App hat dritte Liste (1 THW … 11 Rettungsdienst, 255 Sonstige) |
| E Herkunft (OV/Herkunft Freitext) | ovName (+ ovTelefon/ovFax, rbName…, lvName…) | ja, feiner |
| F/G/H Zug / Trupp-Staffel / Gruppe (vier Textspalten = taktische Ebene) | tacticalSignConfig.typ (zug/gruppe/trupp/staffel/zugtrupp/bereitschaft/abteilung/grossverband) | anders modelliert, ja |
| I Person (TeBe, FaBe, LNA, Ziv.) | – (Helfer nur an Einheit gebunden) | fehlt |
| J Geräte/Fahrzeuge (Freitext inkl. Kennzeichen) | Fahrzeug-Entität (name, kennzeichen, funkrufname, stanKonform, sondergeraet, nutzlast) | ja, besser |
| K Aufträge (Einsatzverlauf von–bis, Ort, Auftrag) | einheitBewegungen (Abschnittswechsel, Zeit, Benutzer, Kommentar ohne UI) | teilweise; kein Auftragstext |
| L Erreichbarkeit | erreichbarkeiten | ja |
| M Verfügbar bis, N Ablösung angefordert, O Anforderungs-ID, P Zugesagt für, Q Zugesagt von, R Vorgesehene Einheit, S Vorgesehener Auftrag, V Rückführung | – | fehlt (gesamte Ressourcenplanung, Hinweise C21–C32, image84) |
| T eingetroffen/zugewiesen | erstellt (Anlagezeitpunkt) | nur näherungsweise |
| U Einsatzende | aufgeloest (nie gesetzt) | fehlt praktisch |
| W Bemerkungen | bemerkung | ja |
| Z Status (9 Werte) | status (AKTIV, IN_BEREITSTELLUNG, ABGEMELDET) + Abschnitt systemTyp ANFAHRT/BEREITSTELLUNGSRAUM | deutlich gröber; Angefordert/Anmarsch/Rückmarsch/Ruhe/Rufbereitschaft/Einsatzvorbehalt/Nicht einsatzbereit nicht abbildbar |
| AA Schicht (Tag/Nacht/Früh/Spät) | – | fehlt |
| AB ID EEB (Dateiverweis auf gescannten Bogen) + digitaler EEB (QR) | EEB-Felder inline (OV/RB/LV, GrFü) ohne Dateiverweis; kein QR-Decoder | fehlt |
| AC Weibl., AD Div. | Helfer.geschlecht MAENNLICH/WEIBLICH (kein DIVERS), Anzahl | teilweise |
| AE Veget., AF Vegan | Helfer.vegetarisch, vegetarierVorhanden (kein Vegan) | teilweise |
| AG/AH/AI Übernachtung m/w/d | – | fehlt |
| AJ/AK/AL Fü/UFü/He, AM Gesamt | aktuelleStaerkeTaktisch "F/UF/M/G", aktuelleStaerke | ja |
| AN–AW Kosten (PSA, VDA, UK, Einsatztage) + Kopfparameter AQ3/AS3/AT3/AV3 | – | fehlt |
| Bereich (Zeilenposition): Führungsstelle, Meldekopf BR1/BR2, Sonstiges Führung, Logistik, Angefordert/Anmarsch, BR1, BR2, Einsatzort 1–21, Einsatz beendet | aktuellerAbschnittId; Abschnitt-Baum mit parentId; systemTyp FUEST/ANFAHRT/LOGISTIK/BEREITSTELLUNGSRAUM/NORMAL | ja, mächtiger (Hierarchie); Meldekopf-Typ und Archivbereich fehlen |
| Blatt FüSt: Dienstposten × Tag/Nacht × Fü/UFü/He, Schichtplan Datum × Funktion | – | fehlt komplett |
| Stammdaten C4/C5/C6 | JsonEinsatz name/fuestName/uebergeordneteFuestName | ja, exakt |
| Kopiervorlagen THW StAN | thw-stan-2025.generated.json (47 Einträge) + Inferenz | ja (THW); FW/KatS Nds fehlen |
| Meldekopf-Prozess (Google-Tabelle, gelb/grün-Quittierung) | – (Clients gleichberechtigt, kein Eingangskorb) | fehlt |
| Ausgaben Druck / Status-Matrix / Log / LogFrei / FüOrg / Auswertung / HTML-Monitor | Führungsstruktur-View, Org-Chips (max. 4), Stärke-Monitor (nur Gesamtstärke+Zeit), Export ZIP (CSV/HTML mit UUIDs) | überwiegend schwächer; Log/LogFrei, Org×Status-Matrix, FüOrg-Zeichen fehlen |
| Verlaufskopien beim Speichern, kein Undo | Backup alle 5 min ohne Rotation; Undo nur MOVE | ähnlich |
| Nur in S1: Abschnitt-Hierarchie, Helfer mit Namen, Fahrzeug-Entität, taktische Zeichen (SVG, Inferenz), STAN-Inferenz, Split, Bewegungshistorie, Record-Locks, Benutzer/Rollen | | S1-Mehrwert |

Konsequenz für die Entscheidung: v1 deckt etwa die Hälfte der Excel-Felder ab; die für die FüSt zentralen Blöcke Ressourcenplanung/Ablösung, Schicht, Logistikzahlen, Statusfeinheit, FüSt-Personal und die Ausgabeprodukte fehlen. Das v2-Datenmodell kann nicht "v1 + Persistenz" sein.

### 3.2 Ist das digitale EEB-Format vollständig spezifiziert? Begleit-App gefunden?
Ja (siehe §2.2 (b)). Bit-Ebene erreicht, gegen codec.ts der Begleit-App /Users/johannes/Developer/einheitenerfassungsbogen geprüft (Alphabete, Flag-Bits, Feldreihenfolge, Schema-Weichen, Segmentierung, Signatur). Für die Architekturentscheidung relevant: (1) der Referenz-Codec ist TypeScript (1.043 Zeilen) und läuft in jeder WebView – ein Rust-Port ist für Tauri nicht nötig; (2) reale Bögen sind mehrheitlich segmentiert (nur 73 von 443 Beispielbögen passen in einen QR, Mittel 2,91 Teile), eine Sammel-Scan-Funktion ist Pflicht; (3) der Excel-Import (Strg+Q) ist nach Code-Lesart nie lauffähig gewesen (EebVokabText/EebBogenSchreiben undefiniert, vba_full.txt:1207,1626), es gibt also keine Felderfahrung mit QR-Import; (4) das fachlich bessere Mapping steht in der App (src/app/oldenburg-xlsx.ts), nicht im VBA. Keine Nachlese nötig.

### 3.3 Sind die S1-Control-Features vollständig gegenüber dem IPC-Vertrag?
Ja. Eigene Zählung: 67 eindeutige Kanalstrings in src/shared/ipc.ts:360–445 (Main-Bericht: 66 Kanäle; Differenz vermutlich ein Alias). Abgleich mit s1-renderer-features.md: alle Kanäle sind erfasst; sieben nur in Kurzschreibweise (`taktisches-zeichen:formation-svg(s)`, `vehicle-svg(s)`, `person-svg`; `updater:check/download/install/get-state/state-changed`). Bestätigt und dreifach belegt: `command:undo-last`, `einsatz:archive`, `einsatz:export`, `auth:logout` haben kein Bedienelement; kein Kanal zum Löschen von Einheit/Fahrzeug/Abschnitt/Einsatz. Feature-Inventar (42 Zeilen) und Datenfelder je Entität sind vollständig. Keine Nachlese nötig.

### 3.4 Wurde geklärt, warum SQLite auf SMB scheiterte, und erlaubt JSON+Lockfile heute Lost Updates?
Commit-Belege liegen vor (historie §1 Phase 2/5, nas §0.1, main §3b): 23df61d/c9f312d/4a098e7 (28.02., 00:47–01:10), 0ca506a ("WAL is not reliable across many SMB/NAS setups with multiple hosts" → DELETE/FULL/busy 10 s), 70e5060, b7bc562, c6a1668, 6f5d13b ("malformed" – Korruptionsindiz), cd33747 (zurück auf WAL, unbegründet), 4b66ce2/a1e1d8e (Utility-Prozess wegen blockierendem Main-Thread), f0a5fec (SQLite raus, 31.05.). Die Ursachenkette (Lock-Semantik über SMB, Client-Caches, synchrone I/O, fehlende Änderungsbenachrichtigung) ist durch nas §1.1–§1.9 mit Primärquellen unterlegt. Was fehlt, sind die konkreten Symptome (keine Commit-Bodies) – nur Johannes kann sagen, ob Korruption auftrat.

Lost Update: **jetzt zur Laufzeit bestätigt** (Reproduktion scratchpad/repro/lost-update.ts mit vite-node gegen den unveränderten Code, zwei `openDatabaseWithRetry`-Kontexte auf einer Datei):
```
Datei nach A.save():   writeSeq=1 einheiten=["A1"]
B sieht (In-Memory):   einheiten=[]
Datei nach B.save():   writeSeq=1 einheiten=["B1"]
A sieht (In-Memory):   einheiten=["A1"]
ERGEBNIS: LOST UPDATE – Einheit A1 ist aus der Datei verschwunden.
```
Zusatzbefund: writeSeq ist nicht einmal monoton (B schreibt seinen In-Memory-Zähler 0+1 = 1 zurück); ein späterer "writeSeq vergleichen"-Fix müsste zuerst ein Re-Read einführen. Die drei S1-Berichte hatten das nur aus dem Code abgeleitet; die offene Frage "im Betrieb aufgefallen?" bleibt (Gap 3), die technische Frage ist geschlossen.

### 3.5 Sind Tauri-Fähigkeiten für den S1-Bedarf belegt?
Weitgehend (bmecat §2, §8.4, §9): WebView2 offline (R1, mit Quellen: offlineInstaller/fixedRuntime), Updater (R11: tauri-plugin-updater, Minisign, SemVer-Zwang), Drucken (R7: kein Print-API; Ausweg Datei + opener – passt zur heutigen Export-Idee und zum Excel-Ausdruck-Workflow), UDP (std/tokio), Dateiassoziation, single-instance, Mehrfenster (R8). Ungeprüft und entscheidungsrelevant: Mehrfenster auf Zweitmonitor (Issue #14019, bmecat §10 Frage 7) – der Stärke-Monitor ist Kernfeature (Excel-Pendant: HTML-Lagemonitor F-K6); tauri-action mit fixedRuntime (Frage 4); E2E-Werkzeugwechsel (R6, Frage 8). Nicht betrachtet, aber gering: Kamerazugriff (getUserMedia) in WKWebView/WebView2 für QR-Scan – die Excel arbeitet mit USB-Handscanner (Tastatur-Emulation), das funktioniert in jeder WebView. Alle Tauri-Aussagen sind teilweise [unbelegt] markiert; bmecatEditor liefert kein Vorbild für Mehrfenster, Updater, Store, Log, Watcher (§2 Tabelle). → Gap 5 (Spike statt Lesen).

### 3.6 Widersprüche zwischen Berichten
1. **Speichermodell (substanziell):** bmecat §8.0/M16/M19/R9 empfiehlt, das heutige Modell (JSON-Datei = Wahrheit, Lockdatei `wx`, Stale-Timeout, tmp+rename, writeSeq, UDP, Presence-Heartbeat) "1:1 in s1-store/s1-net zu portieren" plus optimistische Konflikterkennung; nas §3/§9/§10 stuft genau dieses Modell (Option B) als "nur als Übergang" ein und empfiehlt Append-only-Ereignisprotokoll mit einem Schreiber je Datei (C→E), "Events sind Wahrheit, Snapshots verwerfbar"; main §10 fordert, Persistenz-, Lock-, Präsenz-, Sperren- und Backup-Modell neu zu entwerfen. nas begründet mit Primärquellen (Stale-Übernahme nicht atomar, Uhrenabhängigkeit, FileNotFound-Cache 5 s, kein fsync, Rename-EBUSY), bmecat argumentiert aus der Portierungsperspektive ohne diese Analyse. Die Synthese muss das explizit entscheiden (Gap 4).
2. **Working Tree:** historie (KeyFacts, §4.4, §8) bezeichnet die 14 ungecommitteten Dateien als "Feature Einsatz-Basisdaten bearbeiten" und ordnet Typfehler dem WIP zu; renderer §5 sagt "reine Prettier-Neuformatierung, Feature bereits in e2fbb7c". **Verifiziert:** `git show HEAD:<f> | npx prettier --stdin-filepath <f>` ist für alle 14 Dateien byteidentisch mit dem Working Tree; `npm run format` = `prettier --write .` existiert (package.json:32). Renderer hat recht. Folge: die 91 Renderer-Typfehler und der onEditAbschnitt-Fehler liegen bereits auf HEAD.
3. **Updater-Testanteil (intern historie):** KeyFacts/§3/§8.1 "2.985 Testzeilen (62 %)" vs. §5-Tabelle "2.021 Zeilen (42 %)". Die itemisierte Tabelle ist glaubwürdiger; Aussage "Updater dominiert die Tests" gilt in beiden Fällen.
4. **Teststatus:** main "190 Tests grün in 5 s" vs. historie "1 failed/189 passed, flaky test/updater.test.ts:129 (5.212 ms vs. 5.000 ms Timeout)". Beides beobachtet; der Test ist flaky.
5. **Zeilenzahl shared/ipc.ts:** 422 (historie, HEAD/Lint) vs. 439 (main, bmecat, Working Tree nach Prettier) – erklärt durch Punkt 2.
6. **Skalenannahmen:** main "Großlage 150 Einheiten ≈ 2–2,5 MB" vs. nas "5.000 Einheiten ≈ 5–20 MB" vs. Excel-Vorlage 272 Zeilen. Kein Widerspruch, aber drei Baselines ohne reale Zahl.
7. **Renderer-Wiederverwendung:** bmecat §8.2 "S1-Renderer bleibt weitgehend" vs. renderer W15/historie §8.1 Punkt 3 (150-Props-Drilling, kein Store, 91 Typfehler, null Komponententests) und bmecats eigenes M22 (Store für zwei Fenster). Die Synthese darf den Renderer nicht als kostenlos übernehmbar ansetzen.
8. **Tests, die "zu Rust-Tests werden":** bmecat §8.2 "190 Tests werden zu Rust-Tests" vs. historie §5: nur ca. 1.000 Zeilen Fachlogik-Tests wären portierbar, der Rest ist Updater/Sync.
9. **Digitaler EEB in der Excel:** handbuch F-D2/N-8 führt den QR-Import als vorhandene Funktion; vba §8.4 zeigt, dass er nicht kompiliert; domaenenmodell §11 verweist auf eine nicht existierende "Ergänzung unten". Kein sachlicher Widerspruch (Anforderung bleibt), aber die Synthese sollte "keine Feldpraxis mit QR-Import" vermerken.
10. **nas §0.2 vs. §3:** §0.2 beschreibt mutateEinsatzFile als Schreibpfad, §3 korrigiert auf ctx.save(); main §3c bestätigt null Aufrufer von mutateEinsatzFile. Innerhalb des Berichts aufgelöst.

### 3.7 Fehlende Zahlen
Vorhanden: LOC (Main+Shared 11.040, Renderer 10.097, Tests 4.798/36 Dateien/190 Tests/5,73 s), Typfehler 42+91, Lint 15 Warnungen, Commit-Statistik (206, +70.488/−20.827), bmecat 31,5 k Rust-Zeilen/227 Tests/Kern kalt 26,7 s, Beispiel-.s1control 6.762 B (4 Einheiten), Byte-Schätzung je Entität, Timeout-Tabelle (main §4.5), SMB-Cache-Zeiten (10 s/5 s/10 s, SessTimeout 60 s), EEB-QR-Budget (512/276 B, 2,91 Teile), Excel-Kapazität 272 Zeilen (eigene Ableitung), xlsm 1,08 MB, Backup-Beispielordner 112 Dateien.
Fehlend und entscheidungsrelevant:
- Reale Einsatzgrößen (Einheiten/Fahrzeuge/Helfer/Bewegungen/Dauer), reale .s1control-Größen, Anzahl gleichzeitiger Clients, NAS-Modell, Client-OS/Windows-Version, NTP – auf diesem Mac nicht ermittelbar: ~/Library/Application Support/S1-Control/settings.json zeigt nur einen E2E-Temp-Pfad (/private/var/folders/…/s1-e2e-…), keine Share-Pfade. Quelle müssen die FüSt-Rechner bzw. Johannes sein (Gap 3).
- SMB-Latenzen (stat/open/read/write/rename in ms) auf dem realen Share – nirgends gemessen; entscheidend für Poll-Intervalle (Option C) und für die Bewertung synchroner I/O.
- Tauri: Kaltbau/Warmbau von src-tauri auf der Entwicklungsmaschine (nur "~4 min" aus bmecat-Doku), CI-Dauer je Plattform; Electron: CI-Dauer je Job (aus `gh run list` ablesbar, nicht erhoben); Playwright-E2E-Laufzeit.
- Excel: existieren gefüllte Arbeitsmappen realer Einsätze/Übungen (Migrationsbedarf) oder nur die Vorlage? Nicht ermittelt.
- Historie: seit wann ist `npm run typecheck` ein No-op (tsconfig.json files:[])? Für die Entscheidung unerheblich.

## 4. Gesamtbewertung

Die acht Berichte tragen zusammen eine belastbare Grundlage; die entscheidungskritischen Fakten sind mehrfach unabhängig belegt und in einem Fall (Lost Update) durch diese Kritik zur Laufzeit bestätigt:
- Randbedingung "Datei auf SMB, mehrere Clients, kein Server" ist mit SQLite (A) nachweislich gescheitert (Commits + SQLite-Primärquellen) und mit dem heutigen JSON+Lockfile-Modell (B) auf Datenebene nicht funktionsfähig (Reproduktion). Der Stack ist dafür zweitrangig – das sagen historie, main, nas und bmecat übereinstimmend.
- Die Excel ist vollständig dekonstruiert (Modell, Formeln, Workflows, Handbuch, Anforderungen F-A1…N-9, Ausgabeprodukte, EEB bis Bit-Ebene, Begleit-App gefunden). Die Vorlage ist auf 100–300 Einheiten ausgelegt und kennt Mehrbenutzer nur über Meldekopf-Google-Tabelle und HTML-Lesekopien.
- S1-Control v1 ist vollständig inventarisiert (67 IPC-Kanäle, 42 Features, Datenformat, Risikoliste R-DATA…R-UPD, tote 1.085 Zeilen, Doku-Drift). Fachlogik, Zeichen-/STAN-Inferenz, Domänenvokabular und Testideen sind übernehmbar; Persistenz/Sync/Locks/Backup nicht.
- Tauri ist tragfähig, löst aber keines der harten Probleme; Kosten sind benannt (WebView2 offline, E2E-Wechsel, zwei Sprachen, Updater-Neubau, Renderer nicht kostenlos).

Was für eine belastbare Entscheidung noch fehlt, ist überschaubar und konzentriert sich auf fünf Punkte: der konsolidierte Excel-Workflow-Katalog samt Verbesserungsliste (Auftrag vba (a)/(c) nicht geliefert), der Feld-für-Feld-Abgleich Excel ↔ v1 als Basis für Datenmodell und Migrationspfad (nirgends geleistet; Erstfassung in §3.1), die realen Betriebsparameter (NAS, OS, Größen, Clientzahl, NTP – nicht aus Dateien ableitbar), die explizite Auflösung des Speichermodell-Widerspruchs bmecat vs. nas/main (inkl. Überführung eines v1-Snapshots), sowie ein kurzer Tauri-Spike für Mehrfenster/fixedRuntime/E2E. Als sechster Punkt fehlen Messwerte (SMB-Latenz, Build-/CI-Zeiten), die Poll-Design und Team-Velocity quantifizieren.

Nicht mehr nötig: weitere Excel-Lektüre, weitere IPC-Inventur, weiteres Graben in der SQLite-Historie, weitere SMB-Literatur.

## 5. Nachlese-Aufträge (Gaps)

1. **vba-workflow-katalog-und-verbesserungsliste** – Liefergegenstände (a) und (c) des VBA-Auftrags fehlen (Bericht endet nach §11.7). Quellen: vba_full.txt Module m_zlEinfuegenEntfernen 4055–4201, m_zlKopieren 4203–4300, m_zlOperationen 4302–4412, m_zlVerschieben 4414–4515, m_userformFunktionen 3086–3737, m_speichern 2523–2757, m_htmlExport 2194–2313, m_eeb 1929–2192, m_auswertungsdatenKopieren 409–601, m_bereicheVerbergen(+Checkboxen) 603–982, m_makroFunktionen 2315–2521, DieseArbeitsmappe 289–354, t_staerke 7–188, m_testmodul 2759–3084; Vorarbeit excel-vba-workflows.md §2–§9 (Rohbefunde, Defekte §7.4/§8.4).
2. **excel-s1-feldabgleich** – Tabelle §3.1 verifizieren und je Excel-Feld ohne v1-Entsprechung entscheiden (Pflicht/optional/entfällt) sowie Enum-Abbildungen festlegen (Organisation 12↔14↔EEB-Liste, Status 9↔3+Abschnittstyp, Bereichstypen). Quellen: sheet_Stärke.tsv Zeilen 4–5, Hinweise!C13–C58, defined_names.txt; src/main/json-store/types.ts:7–128, src/shared/ipc.ts:80–180, src/main/services/einsatz-transaction-guards.ts:5–20; einheitenerfassungsbogen/src/app/oldenburg-xlsx.ts und src/model.ts:90–103.
3. **reale-betriebsparameter** – NAS-Implementierung, Client-OS/Windows-Version, gleichzeitige Clients, NTP, Einsatzgrößen, .s1control-Größen, Nutzung LAN-Peer-Updater, Legacy-.sqlite-Dateien, gefüllte Excel-Mappen; dazu SMB-Latenzmessung. Quellen: nicht im Repo (settings.json hier = E2E-Temp); FüSt-Rechner %APPDATA%\S1-Control\settings.json bzw. ~/Library/Application Support/S1-Control/settings.json (dbPath, recentEinsatzDbPaths), auf dem Share `_system.json` (activeClients.computerName/ipAddress/dbPath), `backup/` (Anzahl, Größen), Johannes/FK Oldenburg.
4. **speichermodell-widerspruch-aufloesen** – bmecat R9/M16/M19 (Portierung Lockfile-Modell + CAS, JSON = Wahrheit) vs. nas §10 (Event-Log C/E, Events = Wahrheit) vs. main §10 (Neuentwurf); Entscheidung mit Begründung und Weg für v1-Snapshot → neues Modell. Quellen: nas-speicher-recherche.md §1.2/§1.4/§1.9/§3/§9–§11; bmecat-stack-muster.md §8.0, §8.1 M16/M19, §9 R9/R10/R14; s1-main-architektur.md §3c/§8/§10; scratchpad/repro/lost-update.ts.
5. **tauri-mehrfenster-und-e2e-spike** – Zweitmonitor-Fenster stabil (Issue #14019, aktuelle Tauri-2.x-Version), tauri-action mit fixedRuntime ohne 180-MB-Blob, E2E-Stack für die 10 playwright-bdd-Szenarien (WDIO tauri-service unter Windows vs. Playwright browser-mode). Quellen: github.com/tauri-apps/tauri/issues/14019 + Changelog; v2.tauri.app/distribute/windows-installer; tauri-apps/tauri-action README; bmecatEditor e2e/wdio.conf.ts:7–79, docs/UI-ABNAHME.md:33–36,130–132; S1 e2e/features/einsatz-lifecycle.feature, e2e/steps/einsatz.steps.ts.
6. **build-ci-latenz-messwerte** – src-tauri Kalt-/Warmbau (Debug/Release) auf der Entwicklungsmaschine, Electron-CI-Dauer je Job, Playwright-Laufzeit, SMB-Roundtrip-Zeiten. Quellen: `gh run list --workflow build-main.yml --limit 20` (S1), `cargo build`/`cargo tauri build --debug` in /Users/johannes/Developer/bmecatEditor mit `time`, `npm run test:e2e` in S1, Messskript gegen das reale Share.
