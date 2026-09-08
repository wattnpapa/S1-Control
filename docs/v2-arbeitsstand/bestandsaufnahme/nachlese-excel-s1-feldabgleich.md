# Nachlese: Feldabgleich Excel-Zielmodell (Einsatzkräfteübersicht V 1.5.2-beta) ↔ S1-Control v1-Format

Key: nachlese-excel-s1-feldabgleich
Stand: IN ARBEIT – §0–§2 geschrieben, §3–§7 folgen abschnittsweise

## Gliederung

0. Quellenlage und Methode
1. Verifikation der Erstfassung in vollstaendigkeitskritik.md §3.1
2. Feldabgleich Blatt „Stärke" (Spalten B..AW) ↔ JsonEinheit / CreateEinheitInput
3. Feldabgleich Einsatz-/FüSt-/Bereichsebene ↔ JsonEinsatz / JsonAbschnitt
4. Enum-Abbildungen
   4.1 Organisation: Excel 12 ↔ S1 14 ↔ EEB-App 1–11/255
   4.2 Status: Excel 9 ↔ S1 3 Werte + Abschnittstyp
   4.3 Bereichstypen ↔ systemTyp
   4.4 Schicht, Verpflegung, Übernachtung, Geschlecht
5. Entscheidungsliste je Excel-Feld ohne v1-Entsprechung (Pflicht / optional / entfällt)
6. Ausgaben (Log, LogFrei, Status-Matrix, FüOrg, Druck, Auswertung)
7. Offene Punkte

---

## 0. Quellenlage und Methode

Gelesen (vollständig, nicht wiederholt): vollstaendigkeitskritik.md §3.1 und §5, excel-domaenenmodell.md §1, §2, §5, §7, §9, excel-vba-workflows.md (Zeilen 149, 184, 211, 318, 355–357, 484), excel-handbuch-anforderungen.md (Gliederung), s1-main-architektur.md §8, s1-renderer-features.md (Export/Monitor-Stellen).

Primärquellen, die für diesen Abgleich selbst gelesen wurden:
- Excel: `sheet_Stärke.tsv` Zeilen 1–22 (Kopfzeilen B4:AW5, Kopfparameter AQ3/AS3/AT3/AV3, FüSt-Projektionen Z.7–16, Meldekopf-Zeilen 17–22), `sheet_Hinweise.tsv` B/C 1–172, `sheet_Status.tsv` (vollständig), `sheet_Stammdaten.tsv`, `sheet_Startseite.tsv`, `sheet_Auswertung.tsv` Kopf, `vba_full.txt` 984–1022 (Spaltenkonstanten m_digitalerEEB) und 3089–3093 (ERLAUBTE_ORGANISATIONEN/STATUSE/SCHICHTEN).
- S1-Control: `src/main/json-store/types.ts` (vollständig, 210 Zeilen), `src/shared/ipc.ts` 1–260, `src/shared/types.ts` (OrganisationKey, TacticalSignConfig, EinheitListItem), `src/main/services/einsatz-transaction-guards.ts`, `src/main/services/einsatz-write/einheit.ts`, `helfer.ts`, `validations.ts`, `einsatz-core.ts`, `src/renderer/src/components/dialogs/EinheitFormFields.tsx:116–117`, `FuehrungsstrukturView.tsx:32`.
- EEB-App: `einheitenerfassungsbogen/src/model.ts` 90–103 (OrganisationsTyp), 148–159 (Geschlecht, Ernaehrung), 240–330 (Einheit, Einsatz, Sofortbedarf, Staerke, Erfassungsbogen), `src/app/oldenburg-xlsx.ts` (vollständig), `src/app/hilfen.ts` 66–83 (ORG_OPTIONEN).

Methode: Für jede Excel-Spalte B..AW und jede Struktur außerhalb des Stärke-Blatts wird (a) die v1-Entsprechung in `JsonEinheit`/`JsonAbschnitt`/`JsonEinsatz`/`JsonHelfer`/`JsonFahrzeug` benannt, (b) der Deckungsgrad bewertet (ja / teilweise / anders modelliert / fehlt), (c) für v2 eine Einstufung vorgeschlagen: **P** = Pflicht (ohne das Feld ist die Excel nicht ablösbar), **O** = optional (Mehrwert, kann nach v2.0 folgen oder als Freitext bleiben), **E** = entfällt (durch anderes Modell besser abgedeckt oder in der Excel selbst tot). Die Einstufung ist ein Vorschlag mit Begründung aus den Quellen; wo die Quellen keine Aussage zur realen Nutzung erlauben, steht das in §7.

Konvention „belegt": Excel-Belege als `Blatt!Zelle` oder `vba_full.txt:Zeile`, S1-Belege als `Datei:Zeile`. Aussagen ohne Beleg sind mit [unbelegt] markiert.

---

## 1. Verifikation der Erstfassung in vollstaendigkeitskritik.md §3.1

Die Tabelle in §3.1 wurde Zeile für Zeile gegen die Primärquellen geprüft. Ergebnis: **im Kern richtig, sieben Korrekturen/Präzisierungen**:

| §3.1-Zeile | Befund | Korrektur / Präzisierung | Beleg |
|---|---|---|---|
| D Organisation „MALTESER und MHD doppelt in S1" | bestätigt | `OrganisationKey` enthält sowohl `'MALTESER'` als auch `'MHD'` (Malteser Hilfsdienst) – fachlich dieselbe Organisation; außerdem `'JOHANNITER'` (Excel: JUH). `REGIE` und `BERGWACHT` haben keine Excel-Entsprechung. | `src/shared/types.ts:9–23`, `einsatz-transaction-guards.ts:5–20`, `vba_full.txt:3091` |
| F/G/H „vier Textspalten = taktische Ebene … anders modelliert, ja" | zu optimistisch | Die Excel-Spalten F/G/H/I tragen **Bezeichnungen** („TZ-R", „ZTr", „FGr N", „TeBe"), nicht nur die Ebene. S1 kennt nur `tacticalSignConfig.typ` (Enum) und `nameImEinsatz`; eine Zug-Zugehörigkeit einer Gruppe (Excel: Gruppe steht in H, ihr Zug in F derselben Zeile) ist in S1 nur über `parentEinsatzEinheitId` (Split-Herkunft, nicht Gliederung) oder gar nicht abbildbar. Bewertung: **teilweise**. | `Hinweise!C15–C18`, Stärke!F4/G4/H4/I4-Kommentare (domaenenmodell §7), `src/shared/types.ts:35–60`, `einheit.ts:203` |
| K Aufträge „einheitBewegungen … teilweise; kein Auftragstext" | bestätigt, Präzisierung | `JsonEinheitBewegung.kommentar` existiert (`types.ts:99`) und `MoveEinheitInput.kommentar` (`ipc.ts:169`), aber ohne UI (renderer-features Z.347). Der Excel-Verlauf ist „Von–bis; Einsatzort und Auftrag" als **eine mehrzeilige Zelle** (Stärke!K4-Kommentar), d. h. Freitext-Chronik, nicht Bewegungsliste. | `types.ts:92–100`, `ipc.ts:165–170` |
| T eingetroffen/zugewiesen „erstellt (nur näherungsweise)" | bestätigt | `erstellt = nowIso()` beim Anlegen (`einheit.ts:77`); kein editierbares Feld. Zusätzlich: die erste `JsonEinheitBewegung` mit `vonAbschnittId = null` gäbe den Zuweisungszeitpunkt – wird aber bei createEinheit **nicht** geschrieben (einheit.ts:45–81 schreibt nur `einheiten.push`). | `einheit.ts:45–81` |
| U Einsatzende „aufgeloest (nie gesetzt)" | bestätigt | `aufgeloest` kommt im Main außer in der Typdefinition und den `aufgeloest: null`-Initialisierungen nirgends vor (grep `src/main`: nur `types.ts:52`). | grep-Ergebnis, `einheit.ts:78, 231` |
| Z Status „(AKTIV, IN_BEREITSTELLUNG, ABGEMELDET) + Abschnitt systemTyp" | bestätigt, Ergänzung | `IN_BEREITSTELLUNG`/`ABGEMELDET` werden im Main **nirgends ausgewertet** (grep `src/main`: nur `types.ts:3–4`); im Renderer erscheinen sie als rohe Enum-Strings im `<option>` (`EinheitFormFields.tsx:116–117`, `EinheitFormRows.tsx:40–41`). Der Status ist in v1 also ein reines Etikett ohne Logik. `systemTyp` wird im Main nur für die Wurzel `FUEST` benutzt (`einsatz-core.ts:25, 47`). | s. Belege |
| AC/AD Weibl./Div. „Helfer.geschlecht MAENNLICH/WEIBLICH, Anzahl" | bestätigt | `validateHelferGeschlecht` erlaubt nur `MAENNLICH`/`WEIBLICH` (`validations.ts:43–47`); Default `MAENNLICH` (`helfer.ts:27`). Ein Zählwert „Weibl." je Einheit wäre in v1 nur als Summe der Helfer-Datensätze mit `geschlecht='WEIBLICH'` × `anzahl` rekonstruierbar – v1 hat keine solche Aggregation. | s. Belege |
| Kopiervorlagen „thw-stan-2025.generated.json (47 Einträge)" | Zahl korrigiert | Die Datei enthält **48** Einträge, der erste ist ein Fahrzeug (`Lastkraftwagen (1,5 t Nutzlast) mit Ladekran`, `strength: null`), d. h. nicht alle Einträge sind Einheiten-Vorlagen. | `src/main/services/stan/thw-stan-2025.generated.json` (node-Zählung) |
| „Meldekopf-Prozess (Google-Tabelle, gelb/grün) … fehlt" | bestätigt, Präzisierung | Excel: Meldekopf erfasst in Google-Tabelle mit identischen Spalten FüSt..ID EEB, Übertrag per Zwischenablage, gelb = neu, grün = übernommen (`Hinweise!C159–C172`). S1 hat keinen Eingangskorb, aber die EEB-App liefert bereits eine „Einsatzsammlung" (`einsaetze.ts`, `oldenburg-xlsx.ts:414–421 einsatzOldenburgXlsx`) – der Meldekopf-Datenfluss existiert also außerhalb von S1 schon digital. | s. Belege |

Nicht in §3.1 enthalten, aber für den Abgleich relevant (Ergänzungen):
- **Spalten X/Y „Reserve"** (Stärke!X4/Y4, Breite 0,5, versteckt) – in der Excel unbenutzt; die EEB-App exportiert sie leer (`oldenburg-xlsx.ts:200–201`). Für v2: **E**.
- **Kopfparameter Stärke!AQ3=180, AS3=150, AT3=20, AV3=5** (PSA-Satzpreis, VDA/Tag, UK+Verpflegung/Tag, geplante Einsatztage) sind Einsatz-Attribute, nicht Einheiten-Attribute (`sheet_Stärke.tsv` AQ3/AS3, Hinweise!C52–C57).
- **Stärke!B1/G1** (`="Kräfteübersicht: "&Stammdaten!C5`, `=Stammdaten!C4`) und **Status!A1/A2** – Kopfzeilen aller Blätter referenzieren Einsatzname/FüSt-Name; in S1 identisch als `JsonEinsatz.name`/`fuestName` (`types.ts:9–10`). Stammdaten!C6 „übergeordnete FüSt" ↔ `uebergeordneteFuestName` (`types.ts:11`), aber `CreateEinsatzInput`/`UpdateEinsatzInput` (`ipc.ts:26–29, 43–47`) haben **kein** Feld dafür – v1 kann es nicht setzen.
- **Startseite!IV11 „Einheitenerfassungsbögen Ordner"** (Einsatz-Einstellung EEB-Ablagepfad) – kein Pendant in `AppSettings`/`JsonEinsatz`.

Fazit §1: Die Konsequenz aus §3.1 („v1 deckt etwa die Hälfte der Excel-Felder ab; das v2-Datenmodell kann nicht v1 + Persistenz sein") bleibt bestehen und wird durch die Detailprüfung eher verschärft: von den 36 fachlichen Stärke-Spalten (B..AM ohne X/Y) sind in v1 **12 direkt** (C, D, E, J, L, W, AJ, AK, AL, AM, teilw. AE, T-näherungsweise), **5 teilweise/anders** (F/G/H/I, K, Z, AC), **19 gar nicht** vorhanden (B, M, N, O, P, Q, R, S, U, V, AA, AB, AD, AF, AG, AH, AI sowie die Kostenspalten AN–AW als Block).

---

## 2. Feldabgleich Blatt „Stärke" (Spalten B..AW) ↔ JsonEinheit / CreateEinheitInput

Legende Deckung: **ja** = 1:1-Feld vorhanden; **teilw.** = nur Teilinformation oder nur über Umweg; **anders** = anderes Modell, Information rekonstruierbar; **fehlt** = kein Feld. Einstufung v2: **P**/**O**/**E** (siehe §0). Die Excel-Belege stehen in excel-domaenenmodell.md §2 (Spaltentabelle) und wurden hier gegen `sheet_Stärke.tsv` Z.4–5 und `Hinweise!C13–C58` nachgeprüft.

| Sp. | Excel-Feld (Kopf Z.4/5) | Excel-Semantik (Beleg) | v1-Feld (Beleg) | Deckung | v2 | Begründung der Einstufung |
|---|---|---|---|---|---|---|
| B | FüSt. | In der Bereichs-Kopfzeile: Name der Einsatzstelle; in der **ersten Datenzeile** eines Bereichs: die Führungsstelle dieses Bereichs („Z Bef St; GrFü FGr B; UEAL xx; EAL xx") (`Hinweise!C11–C12`, Stärke!B4-Kommentar) | – (Abschnitt hat nur `name`; Einheit hat keine Rolle „führt diesen Abschnitt" und keine Position) (`types.ts:17–24, 26–54`) | fehlt | **P** | Der Führungsstellen-Eintrag je Abschnitt ist Kern der FüOrg-Darstellung (Druck-Blatt und FüOrg-Harke zeigen ihn). In v2 nicht als Textspalte, sondern als Attribut am Abschnitt: `abschnitt.fuehrung` = Freitext **oder** Verweis auf eine Einheit/Person. Die Zeilenreihenfolge selbst (Position) kann durch dieses Attribut ersetzt werden; eine freie Sortierreihenfolge innerhalb eines Abschnitts ist **O**. |
| C | Bezeichnung | Bezeichnung der taktischen Einheit („THW FGr N, FW LZ, SanD Betr. Gr.") (`Hinweise!C13`) | `nameImEinsatz` (`types.ts:31`) | ja | P (vorhanden) | – |
| D | Organisation | Dropdown, 12 Werte (`vba_full.txt:3091`); Pflicht für Auswertungen (`Status!G36`) | `organisation` aus 14er-Whitelist (`types.ts:32`, `guards.ts:5–20`) | ja, Enum-Abbildung nötig | P (vorhanden) | Abbildung siehe §4.1 |
| E | Herkunft | „THW Ortsverband oder Herkunft" Freitext (Stärke!E4/Auswertung!E4-Kommentar) | `ovName` (+ `ovTelefon/ovFax`, `rbName…`, `lvName…`) (`types.ts:39–47`) | ja, S1 feiner (nur THW-Hierarchie) | P (vorhanden) | v1 modelliert nur die THW-Hierarchie OV/RB/LV; für FW/HiOrg passt „OV" nicht (EEB-App: `HierarchieEbene[]` mit organisationsspezifischem Vokabular, `model.ts:270–278`). Für v2: generische `herkunft` (Anzeigetext) + optionale Hierarchieliste wie im EEB. |
| F | Zug | Bezeichnung als Zug („TZ-R; LZ") (`Hinweise!C15`) | `tacticalSignConfig.typ = 'zug'` (`shared/types.ts:53`) – nur Ebene, kein Name | teilw. | **O** | Die vier Spalten F–I kodieren zwei Dinge: (1) die taktische Ebene der Einheit (Spalte, in der der Text steht) – in S1 `typ`; (2) den Namen der übergeordneten Gliederung (Gruppe in H, ihr Zug in F). (1) ist gedeckt. (2) ist ein Gliederungsbaum unterhalb des Abschnitts; v1 hat dafür nichts. Die EEB-App löst (2) über ein „Zug-Etikett" aus der Sammlung (`oldenburg-xlsx.ts:283–284, 312`). Für v2: `einheit.uebergeordneteEinheitId` (Gliederung, nicht Split) **O**; Ebene `typ` bleibt **P** (vorhanden). |
| G | Trupp o. Staffel | („ZTr, SanTr, LSt") (`Hinweise!C16`) | `typ = 'trupp' | 'staffel' | 'zugtrupp'` | teilw. | O (s. F) | wie F |
| H | Gruppe | („FGr N, Betr.Gr, LGr") (`Hinweise!C17`) | `typ = 'gruppe'` | teilw. | O (s. F) | wie F |
| I | Person | Einzelpersonen („TeBe, FaBe, LNA, Ziv.") (`Hinweise!C18`) | – (Helfer nur als Kind einer Einheit, `JsonHelfer.einsatzEinheitId` Pflicht, `types.ts:78`) | fehlt | **P** | Einzelpersonen (Fachberater, Verbindungskräfte, LNA, Zivilpersonen) sind reale Kräfte in der Übersicht mit Stärke 1 und eigener Zeile. Die EEB-App ordnet Bögen mit Gesamtstärke 1 ohne Einheitstyp automatisch dieser Spalte zu (`oldenburg-xlsx.ts:231–239`). Für v2: `typ = 'person'` als weiterer Wert der Ebene (Einheit mit Stärke 1/0/0 oder 0/0/1), keine eigene Entität nötig. |
| J | Geräte / Fahrzeuge (inkl. Kennzeichen) | mehrzeiliger Freitext, Popup Strg+A (`Hinweise!C19`, Stärke!J5) | `JsonFahrzeug` je Fahrzeug (name, kennzeichen, funkrufname, stanKonform, sondergeraet, nutzlast) (`types.ts:56–73`) | ja, S1 besser | P (vorhanden) | Excel-Freitext ist Untermenge; für Import aus Excel/EEB reicht `name`. Gerätelisten (nicht-Fahrzeuge, z. B. „Netzersatzanlage 50 kVA") passen in v1 nur als Fahrzeug oder Bemerkung – für v2 `sondergeraet`/Freitext genügt (**O**). |
| K | Aufträge | „Einsatzverlauf dokumentieren: Von–bis; Einsatzort und Auftrag" (Stärke!K4-Kommentar, `Hinweise!C20`) | `einheitBewegungen` (Abschnittswechsel mit Zeit/Benutzer/Kommentar) (`types.ts:92–100`); kein Auftragstext an der Einheit | teilw. | **P** | Der Auftrag („Deichverteidigung Abschnitt Süd", „Pumpen an Einsatzstelle 3") ist die zentrale fachliche Information neben Ort und Stärke; in S1 fehlt jedes Auftragsfeld. Für v2: `einheit.aktuellerAuftrag` (Text) **P** + Auftragshistorie als Ereignisliste (Zeit von/bis, Ort, Auftrag) – die Bewegungshistorie ist ein Spezialfall davon. |
| L | Erreichbarkeit (Funk/Tel./eMail) | Mobilnummer des Einheitenführers usw. (`Hinweise!C21`) | `erreichbarkeiten` (`types.ts:50`), zusätzlich `grFuehrerName`, `ovTelefon`, `JsonHelfer.telefon/erreichbarkeit` | ja | P (vorhanden) | – |
| M | Verfügbar bis (Dat./Zeit) | bis wann verfügbar; bedingte Färbung ab Vortag (`Hinweise!C22`, domaenenmodell §2) | – | fehlt | **P** | Grundlage der Ablöseplanung; die EEB-App liefert den Wert aus `einsatz.zeitraumBis` jedes Bogens (`oldenburg-xlsx.ts:319`) – er kommt also künftig automatisch mit jeder Anmeldung. Ohne Feld geht diese Information beim Import verloren. |
| N | Ablösung angefordert (Dat./Zeit) | Zeitpunkt der Ablöseanforderung (`Hinweise!C23`) | – | fehlt | **O** | Teil des Ressourcenplanungs-Blocks L:Y, der in der Vorlage ausgeblendet ist und laut `Hinweise!C129–C130` „keine verbindliche Vorgehensweise" hat („lediglich eine mögliche Vorgehensweise"). Für v2.0: als Gruppe optionaler Datums-/Textfelder an der Einheit **O**; besser als eigene Entität „Anforderung" (s. O). |
| O | Anforderungs-ID | Referenz zur Zeile im Bereich „Angefordert"; Form mit THW-Behördenstruktur abgestimmt (`Hinweise!C24–C25`) | – | fehlt | **O** | Die Excel verknüpft eine im Einsatz befindliche Einheit (die Ablösung braucht) mit einer Zeile im Bereich „Angefordert" (die Ablösung). Das ist fachlich eine **Beziehung Einheit → Anforderung**; in v2 als eigene Entität `Anforderung {id, externeId, angefordertAm, zugesagtFuer, zugesagtVon, vorgeseheneEinheit, vorgesehenerAuftrag, ersetztEinheitId?}` sauberer als 7 Spalten. Einstufung O, weil die Vorlage selbst diesen Block als fakultativ ausweist. |
| P | Zugesagt für (Dat./Zeit) | (`Hinweise!C26`) | – | fehlt | O (s. O) | Teil der Anforderung |
| Q | Zugesagt von (Org.) | zusagende Stelle (`Hinweise!C27`) | – | fehlt | O (s. O) | Teil der Anforderung |
| R | Vorgesehene Einheit | (`Hinweise!C28`) | – | fehlt | O (s. O) | Teil der Anforderung |
| S | Vorgesehener Auftrag | (`Hinweise!C29`) | – | fehlt | O (s. O) | Teil der Anforderung |
| T | eingetr. / zugew. (Dat./Zeit) | Eintreffen/Zuweisung (`Hinweise!C30`) | `erstellt` (Anlagezeitpunkt, nicht editierbar) (`einheit.ts:77`) | teilw. | **P** | Eintreffzeit ≠ Erfassungszeit (Nacherfassung, Meldekopf-Übertrag mit Verzug). EEB liefert `einsatzbeginn` (`oldenburg-xlsx.ts:320`). Für v2: editierbares `eingetroffenAm` **P**; `erstellt` bleibt technisches Audit-Feld. |
| U | Einsatzende (Dat./Zeit) | (`Hinweise!C31`) | `aufgeloest` (nie gesetzt) | fehlt praktisch | **P** | Ohne Einsatzende keine Abschlussdokumentation und keine korrekte Stärke (Excel: Einheit wird nach Einsatzende in den Archivbereich verschoben, `Hinweise!C105`). Für v2: `einsatzendeAm` + Statusübergang. |
| V | Rückführung (Dat./Zeit) | wann rückgeführt (`Hinweise!C32`) | – | fehlt | **O** | Unterscheidung Einsatzende vs. Rückführung (Einheit noch auf Rückmarsch/in Unterkunft) ist für Logistik relevant, aber in der Excel Teil des fakultativen Blocks. O; ließe sich über Status „Rückmarsch" + Zeitstempel der Statusänderung ableiten (§4.2). |
| W | Bemerkungen | Freitext | `bemerkung` (`types.ts:48`) | ja | P (vorhanden) | – |
| X, Y | Reserve 1/2 | unbenutzt, Breite 0,5 | – | – | **E** | tot |
| Z | Status | 9 Werte Dropdown (`vba_full.txt:3092`); Pflicht (Kontrollsumme `Status!G36`) | `status` 3 Werte ohne Logik (`types.ts:3`); Abschnitt-`systemTyp` ANFAHRT/BEREITSTELLUNGSRAUM (`types.ts:2`) | teilw., deutlich gröber | **P** | Abbildung siehe §4.2. Mindestens 7 der 9 Werte sind in v1 nicht darstellbar. |
| AA | Schicht | Tag/Nacht oder Früh/Spät/Nacht; Vorbelegung „Tag"; Pflicht außer Bereich Angefordert (`Hinweise!C35`, `Status!G43`, `vba_full.txt:3093`) | – | fehlt | **P** | Status-Blatt summiert Stärke je Schicht (`Status!B38:J41`); Log-Blatt gliedert Logistikdaten nach Schicht (`Hinweise!C109`). Bei mehrtägigen Lagen (Hochwasser) ist die Schichtstärke die Führungskennzahl. Für v2: `schicht` Enum {TAG, NACHT, FRUEH, SPAET} + Einsatz-Einstellung „Schichtmodell 2/3". Nullable, weil im Bereich Angefordert absichtlich leer (`vba_full.txt:4391, 4494`). |
| AB | ID Einheiten-Erfassungsbogen | Dateiname (mit/ohne Endung) im EEB-Ordner; Hyperlink per Makro; oder Sammlungs-ID (`Hinweise!C33, C36, C95`, `vba_full.txt:1937–1940`) | – (EEB-Inhalte nur inline: ov/rb/lv, grFuehrerName; kein Verweis, kein QR-Decoder) | fehlt | **P** | Zwei Ausprägungen: (a) Verweis auf gescanntes/fotografiertes Papier-EEB (Datei im Einsatz-Ordner) – **P**, da Papier-EEB der Normalfall bleibt; (b) digitaler EEB (QR/JSON der EEB-App) – **P** als Import (Bogen-Inhalts-Hash `bogenInhaltsId` als ID, `oldenburg-xlsx.ts:325`), die Rohdaten des Bogens sollten als Anhang am Einheiten-Datensatz gespeichert werden (Revisionen!). |
| AC | Weibl. | Anzahl weiblicher Einsatzkräfte (`Hinweise!C38`) | `JsonHelfer.geschlecht` M/W × `anzahl` (nur wenn Helfer erfasst) | anders/teilw. | **P** | Die Excel führt Zählwerte **je Einheit** ohne Personendaten. v1 zwingt zur Helfer-Erfassung. EEB-App: beides (`unterbringungMWD` aus Personal oder `unterbringungManuell`, `model.ts:311–312, 361–373`). Für v2: Zählfelder an der Einheit (`anzahlWeiblich`, `anzahlDivers`, …) **P**, optional aus Helferliste ableitbar. |
| AD | Div. | (`Hinweise!C39`) | – (Geschlecht nur MAENNLICH/WEIBLICH, `validations.ts:43–47`) | fehlt | **P** | EEB-App kennt `Geschlecht.D` (`model.ts:148–152`); Import würde sonst Daten verlieren. |
| AE | Veget. | Anzahl vegetarisch (`Hinweise!C40`) | `vegetarierVorhanden: boolean` (`types.ts:49`) bzw. `JsonHelfer.vegetarisch` | teilw. (Bool statt Zahl) | **P** | Verpflegungsbestellung braucht Zahlen, kein Flag. EEB liefert `verpflegung().vegetarisch` (`model.ts:381–398`). |
| AF | Vegan. | (`Hinweise!C41`) | – | fehlt | **P** | EEB kennt `Ernaehrung.VEGAN` (`model.ts:155–159`). |
| AG | ÜN (m) | Übernachtungsbedarf männlich (`Hinweise!C42`) | – | fehlt | **P** | Logistik-Kernzahl (Unterkunftsplanung). EEB liefert m/w/d nur bei `sofortbedarf.unterbringung` (`oldenburg-xlsx.ts:300–302`). |
| AH | ÜN (w) | (`Hinweise!C43`) | – | fehlt | **P** | wie AG |
| AI | ÜN (d) | (`Hinweise!C44`) | – | fehlt | **P** | wie AG |
| AJ | Fü | Anzahl Führer (`Hinweise!C45`) | `aktuelleStaerkeTaktisch` „F/UF/M/G" (String) (`types.ts:34`, `tactical-strength.ts`) | ja (als String kodiert) | P (vorhanden) | Für v2 drei Integer-Felder statt String. |
| AK | Ufü | (`Hinweise!C46`) | s. AJ | ja | P (vorhanden) | – |
| AL | He | (`Hinweise!C47`) | s. AJ | ja | P (vorhanden) | – |
| AM | Gesamt | `=SUM(AJ:AL)` (`Hinweise!C48`) | `aktuelleStaerke` (redundant gespeichert, validiert gegen Taktisch) | ja | P (abgeleitet) | In v2 nur berechnen. |
| AN | PSA | `=AM` (Kommentar AO2, `Hinweise!C49`) | – | fehlt | E (abgeleitet) | = Gesamtstärke |
| AO | Anz. PSA pro Tag | Eingabe je Einheit (0 = keine PSA) (`Hinweise!C50`, Stärke!AO2-Kommentar) | – | fehlt | **O** | Einziges Eingabefeld des Kostenblocks je Einheit. Der ganze Kostenblock AN–AW ist in der Vorlage ausgeblendet; Versionshistorie: „PSA-Kostenberechnung" kam in V2 (handbuch §4 Z.122). Nutzungsgrad unbekannt (§7). |
| AP | Ges. PSA pro Tag | `=AN*AO` | – | – | E (abgeleitet) | |
| AQ | Kosten pro Satz PSA | `=$AQ$3` (Einsatzparameter 180) | – | fehlt | O (Einsatzparameter) | siehe §3 |
| AR | Kosten PSA pro Tag | `=AN*AO*AQ` | – | – | E (abgeleitet) | |
| AS | VDA pro Tag | `=$AS$3` (150) | – | fehlt | O (Einsatzparameter) | |
| AT | Unterkunft/Verpflegung | `=$AT$3` (20) | – | fehlt | O (Einsatzparameter) | |
| AU | Kosten VDA+UK/Tag | `=(AS+AT)*AM` | – | – | E (abgeleitet) | |
| AV | Geplante Einsatztage | `=$AV$3*AM` (Personentage!) | – | fehlt | O (Einsatzparameter) | |
| AW | Gesamtkosten | `=IFERROR((AR+AU)*AV/AM,0)` | – | – | E (abgeleitet) | Als Report/Export-Berechnung aus 4 Einsatzparametern + AO. |

Zwischenfazit §2 (Zählung über B..AW, 48 Spalten, X/Y tot):
- **ja / vorhanden (11)**: C, D, E, J, L, W, AJ, AK, AL, AM, (AE nur als Bool).
- **teilweise / anders (6)**: F, G, H (Ebene ja, Gliederung nein), K, T, Z, AC.
- **fehlt (20 fachliche Felder)**: B, I, M, N, O, P, Q, R, S, U, V, AA, AB, AD, AF, AG, AH, AI, AO + Kostenparameter AQ/AS/AT/AV (Einsatzebene).
- **abgeleitet/entfällt (9)**: X, Y, AN, AP, AR, AU, AW (+ AM als Berechnung).

Von den 20 fehlenden Feldern sind nach obiger Einstufung **13 Pflicht** für v2 (B, I, M, T-editierbar, U, AA, AB, AD, AF, AG, AH, AI, AE-als-Zahl, AC-als-Zahl, Z-fein, K-Auftrag) und **7 optional** (N, O, P, Q, R, S, V als Entität „Anforderung"; AO + Kostenparameter).
