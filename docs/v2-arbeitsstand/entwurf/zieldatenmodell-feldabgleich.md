# Zieldatenmodell S1-Control v2 – Feld-für-Feld-Abgleich Excel ↔ v1 ↔ EEB

Status: ABGESCHLOSSEN
Key: zieldatenmodell-feldabgleich
Stand: 2026-09-07

## Gliederung
0. Quellen und Lesart
1. Abgleichstabelle Excel → v1 → EEB → Entscheidung v2
2. Enum-Abbildungen
3. Zielmodell v2 – Entitäten, Attribute, Typen (inkl. abgeleiteter Kennzahlen)
4. Ereignis-Katalog (stack-neutral) mit Undo- und Konfliktsemantik
5. Migrationsregeln (v1-JSON, Excel-Mappe, EEB-QR)
6. Offene fachliche Entscheidungen für Johannes/FüSt

---

## 0. Quellen und Lesart

Primärquellen dieses Berichts (jeweils gelesen, nicht referiert):

| Kürzel | Quelle |
|---|---|
| EXD | `analysis/excel-domaenenmodell.md` §6 (AküLi), §8 (ER-Modell), §9 (Spalte→Attribut), §10 (Kennzahlen), §11 (offene Fragen) |
| EXH | `analysis/excel-handbuch-anforderungen.md` §7 (F-A1…F-L6, N-1…N-9) |
| KRI | `analysis/vollstaendigkeitskritik.md` §3.1 (Erstfassung des Abgleichs), §3.2, §3.6 |
| NAS | `analysis/nas-speicher-recherche.md` §10 (Empfehlung Option C/E), §11 (Dateilayout, Event-Zeilenformat) |
| V1 | `/Users/johannes/Developer/S1-Control/src/main/json-store/types.ts`, `src/shared/types.ts`, `src/shared/ipc.ts`, `src/main/services/einsatz-write/tactical-strength.ts`, `src/main/services/einsatz-write/einheit.ts` |
| EEB | `/Users/johannes/Developer/einheitenerfassungsbogen/src/model.ts`, `src/app/einsaetze.ts`, `src/app/oldenburg-xlsx.ts`, `docs/datenmodell.md` |

Lesart der Entscheidungsspalte in §1:

- **Pflicht** – Feld muss in v2 vorhanden und in der Erfassungsmaske erreichbar sein; ohne es ist die Excel nicht abgelöst.
- **optional** – Feld ist im Modell vorhanden, aber nicht Pflichteingabe; darf in der Standardansicht ausgeblendet sein (EXH F-F4, F-L5 fordern genau das).
- **abgeleitet** – wird nie gespeichert, sondern aus anderen Feldern berechnet; Formel in §3.3.
- **entfällt** – bewusst nicht übernommen, mit Begründung.

Grundsatz, der die Tabelle durchzieht: **v2 ist nicht „v1 + Persistenz"** (KRI §3.1 Schlusssatz). v1 deckt rund die Hälfte der Excel-Felder ab; die für die FüSt zentralen Blöcke Ressourcenplanung/Ablösung, Schicht, Logistikzahlen, Statusfeinheit, FüSt-Personal und Kosten fehlen vollständig.

Zweiter Grundsatz: **Was die Excel als Zeilenposition kodiert, wird in v2 eine Referenz.** Der Excel-Bereich ist eine Zeilenspanne, die erste Zeile des Bereichs ist per Konvention dessen Führungsstelle (EXD §8.1, EXH F-B2). Beides sind implizite Daten, die v2 explizit macht (`abschnittId`, `istFuehrungDesAbschnitts`).

Dritter Grundsatz: **Der EEB ist die Meldung, nicht die Einheit.** Der Bogen ist ein Dokument mit `stand`, das die meldende Einheit über sich selbst ausfüllt; die Führungsstelle führt daneben ihre eigenen Felder (Status, Schicht, Anforderungs-ID, Zusagen) — das steht wörtlich im Kopf von `oldenburg-xlsx.ts`: „Die Vorlage hat mehr Spalten, als ein Erfassungsbogen kennt (Ablösung, Anforderungs-ID, Zusagen, Rückführung, Schicht). Die bleiben LEER — sie gehören der Führungsstelle, nicht der meldenden Einheit". v2 muss diese Trennung im Modell führen (Entität `EebMeldung` neben `Einheit`, §3.2), sonst überschreibt ein Reimport Führungsdaten.

---

## 1. Abgleichstabelle Excel → v1 → EEB → Entscheidung v2

Reihenfolge: Excel-Blattstruktur (Stammdaten, Bereiche, Stärke-Spalten B..AW, FüSt-Blatt, Ausgaben). Spalte „v1" nennt das Feld aus `json-store/types.ts` bzw. `shared/types.ts`; „EEB" das Feld aus `model.ts`/`einsaetze.ts`.

### 1.1 Einsatz und Stammdaten

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| Stammdaten!C4 Einsatzname | `JsonEinsatz.name` | `Einsatzsammlung.name` | **Pflicht** `einsatz.name` | Erscheint auf allen Ausgaben (EXH F-A1) und geht in Datei-/Exportnamen ein (F-A2). In v2 kein Dateinamens-Zwang mehr (Ordnername ist unveränderlich, NAS §11), aber Slug daraus. |
| Stammdaten!C5 Name der FüSt | `JsonEinsatz.fuestName` | – | **Pflicht** `einsatz.fuestName` | 1:1 vorhanden. |
| Stammdaten!C6 übergeordnete FüSt | `JsonEinsatz.uebergeordneteFuestName` | – | **optional** | 1:1 vorhanden (v1 nullable). |
| – | `JsonEinsatz.start` / `.end` | `Einsatz.zeitraumVon/Bis` (je Bogen!) | **Pflicht** `beginn`, **optional** `ende` | Excel kennt keinen Einsatzbeginn als Feld; nur Dateizeitstempel. v1-Feld übernehmen. EEB-`zeitraumVon/Bis` gehört zur Meldung, nicht zum Einsatz — nicht verwechseln. |
| – | `JsonEinsatz.status` AKTIV/BEENDET/ARCHIVIERT | `EinsatzArt` EINSATZ/UEBUNG/VERANSTALTUNG | **Pflicht** `status` + **Pflicht** `art` | v1-Status übernehmen (Archivierung, NAS §11 `archive.marker`). `art` ist neu und kommt aus EEB: der Bogen trägt `uebung` (Schema 6) und die Sammlung `EinsatzArt`; eine Übungsmeldung darf in der Liste nicht wie eine echte aussehen (Kommentar in `oldenburg-xlsx.ts` `zeileFuer`). |
| Stärke!AQ3 PSA-Satzpreis (Default 180) | – | – | **optional** `kosten.psaKostenProSatz` | EXH F-A4/F-L6; ganzer Kostenblock fehlt in v1. |
| Stärke!AS3 VDA/Tag (150) | – | – | **optional** `kosten.vdaProTag` | dito |
| Stärke!AT3 UK+Verpflegung/Tag (20) | – | – | **optional** `kosten.ukVerpflegungProTag` | dito |
| Stärke!AV3 geplante Einsatztage (5) | – | – | **optional** `kosten.geplanteEinsatztage` | dito |
| Startseite!IV11 EEB-Ordnerpfad | – | – | **optional** `eebOrdnerPfad` (relativ zum Einsatzordner) | EXH F-D1. In v2 besser: `attachments/` im Einsatzordner (NAS §11), Pfad nur als Migrationshilfe. |
| Startseite!IV7/IV10 Autospeicher-/HTML-Intervall | – | – | **entfällt** | Konfiguration des Excel-Speichermechanismus. v2 speichert ereignisgetrieben (NAS §10); das HTML-Monitor-Intervall wird Client-Einstellung, kein Einsatzdatum. |
| Startseite!IV4 Versionstext | – | – | **entfällt** | Anwendungsversion, kein Einsatzdatum. |
| – | – | – | **Pflicht (neu)** `schichtmodell` ∈ {ZWEI_SCHICHT, DREI_SCHICHT} | Die Excel lässt Tag/Nacht und Früh/Spät/Nacht nebeneinander stehen (EXD §8.3, EXH F-G2); v2 muss entscheiden, welche Werte gültig sind, sonst zählen Log-Auswertungen falsch. Siehe §2.3. |

### 1.2 Bereich / Einsatzstelle → Abschnitt

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| Zeilenposition = Bereichszugehörigkeit | `JsonEinheit.aktuellerAbschnittId` | – | **Pflicht** `einheit.abschnittId` | v1 ist hier besser: explizite Referenz statt Zeilenspanne. |
| Bereichsnamen B6/B17/…/B431 | `JsonAbschnitt.name` | – | **Pflicht** `abschnitt.name` | frei benennbar (EXH F-B2). |
| Bereichstyp (implizit aus Position) | `JsonAbschnitt.systemTyp` (5 Werte) | – | **Pflicht** `abschnitt.typ` (9 Werte, §2.4) | v1 kennt weder MELDEKOPF noch ARCHIV noch die Unterscheidung ANGEFORDERT/BEREITSTELLUNG sauber. |
| feste Bereichshierarchie (flach) | `JsonAbschnitt.parentId` (Baum) | – | **Pflicht** `abschnitt.parentId` | v1-Mehrwert übernehmen (EA/UEA-Gliederung, KRI §3.1 „S1-Mehrwert"). Excel-Bereiche werden beim Import zu Kindern der Wurzel. |
| feste Kapazität je Bereich (FüSt 10, Logistik 12, Angefordert 22, BR1 22, BR2 11, EO je 9 = 272 Zeilen, KRI §3.1) | unbegrenzt | – | **entfällt** | EXH F-B3 verlangt ausdrücklich „ein Nachfolger sollte unbegrenzt sein". |
| Reihenfolge der Bereiche im Druck | – | – | **Pflicht** `abschnitt.reihenfolge` (int) | Druck!B14:B34 hat feste Reihenfolge (EXH F-K1); ohne Sortierschlüssel ist die Lagekarte nicht reproduzierbar. |
| „Einsatzort 1..21" Nummerierung | – | – | **abgeleitet** aus `reihenfolge` je Typ | reine Anzeige. |
| Bereich ein-/ausblenden (Checkboxen) | – | – | **entfällt aus dem Datenmodell**, Client-Einstellung | EXH F-B4; Sichtbarkeit ist Ansichts-, kein Einsatzzustand. Ausnahme: „leere Bereiche in Ausgaben unterdrücken" ist eine **abgeleitete** Regel (§3.3 K7). |
| erste Zeile eines Bereichs = dessen FüSt (Hinweise Z.12) | – | – | **optional** `einheit.istFuehrungDesAbschnitts: bool` | Konvention explizit machen; EXD §11 nennt die Unklarheit („leere erste Datenzeile") als offene Frage → §6. |

### 1.3 Einheit – Identität und Herkunft

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| B FüSt./Führungsstelle | – | Spalte A bleibt leer („welche Führungsstelle die Einheit führt, entscheidet die Führungsstelle, nicht der Bogen", `oldenburg-xlsx.ts` `zeileFuer`) | **optional** `einheit.fuestKennung: string` | Nicht durch `abschnittId` ersetzbar: die Spalte trägt, welche FüSt die Einheit **führt**, nicht wo sie steht. |
| C Bezeichnung | `nameImEinsatz` | `einheitsTyp` (VokabularWert) + `einheitAnzeigename()` | **Pflicht** `einheit.bezeichnung` | fachlich Pflicht (leere Zeilen fallen in der Auswertung raus, EXD §9). |
| D Organisation (12) | `organisation` (14) | `Einheit.organisation` (11 + SONSTIGE) + `organisationName` | **Pflicht** `einheit.organisation` (Enum §2.1) + **optional** `organisationName` (Pflicht bei SONSTIGE) | Drei divergierende Listen; Abbildung in §2.1. `organisationName` ist zwingend, sonst geht „HK/NLWKN" und „Freiwillige Feuerwehr Wardenburg" verloren. |
| E Herkunft (OV/Ort) | `ovName`,`ovTelefon`,`ovFax`,`rbName/Tel/Fax`,`lvName/Tel/Fax` (9 Felder, flach) | `Einheit.hierarchie: HierarchieEbene[]` (bezeichnung, name, kurz, telefon, email), `standortRef` | **Pflicht** `einheit.hierarchie: Ebene[]` mit `{art, name, kurz?, telefon?, email?}` | **EEB-Modell gewinnt.** v1 hat OV/RB/LV fest verdrahtet — das trägt Feuerwehr (Gemeinde/Landkreis/Bezirk) und DRK (KV/LV) nicht. Der Excel-Freitext E wird beim Export aus `hierarchie[0]` erzeugt (`herkunftText()`), also verlustfrei ableitbar. Zusätzlich **optional** `standortRef` (THW-OV-Nummer) übernehmen — sie ist der stabile Identitätsanker für die Revisionszuordnung (`einheitSchluessel()`). |
| – | `stammdatenEinheitId` | – | **optional** `einheit.vorlageId` | Verweis auf Vorlagen-Katalog (§3.2 `EinheitVorlage`). |
| – | `parentEinsatzEinheitId` | `MeldeEintrag.stammtVon` / `aufgegangenIn` | **optional** `einheit.abgeteiltVonId` | v1 setzt es beim Split (`einheit.ts:190 ff.`); EEB kennt dasselbe Konzept beidseitig (Aufteilen/Zusammenführen). v2 braucht beide Richtungen → §4 Ereignisse `EinheitAufgeteilt`/`EinheitZusammengefuehrt`. |
| – | – | `MeldeEintrag.teilEtikett` („Fachberater", „Rest 2. Zug") | **optional** `einheit.teilEtikett` | Ohne das steht dieselbe Einheit nach einer Aufteilung zweimal gleichnamig in der Liste (Kommentar in `einsaetze.ts`). |
| – | `tacticalSignConfigJson` (`TacticalSignConfig`, 13 Felder) | – | **optional** `einheit.taktischesZeichen` (typisiert, nicht als JSON-String) | S1-Mehrwert (KRI §3.1); Excel hat taktische Zeichen nur als Bild-Palette im Blatt FüOrg (EXH F-K4). In v2 typisiertes Objekt, nicht `string|null` mit eingebettetem JSON. |
| – | `grFuehrerName` | `ansprechpartner(personal)` → Person mit Kontakt | **optional** `einheit.fuehrungskraft: {name, kontakte[]}` | v1 hat nur einen Namen; EEB liefert Name + Kontakte und leitet den Ansprechpartner regelbasiert ab. EEB-Form übernehmen. |

### 1.4 Einheit – taktische Gliederung

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| F Zug, G Trupp/Staffel, H Gruppe, I Person (4 Textspalten) | `TacticalSignConfig.typ` ∈ {none,trupp,staffel,gruppe,zug,zugtrupp,bereitschaft,abteilung,grossverband,platoon,group,squad} | `ebeneVon(typLang, gesamtstaerke)` → "zug"|"trupp"|"gruppe"|"person" (`oldenburg-xlsx.ts`) | **Pflicht** `einheit.ebene: Enum` (§2.8) — **eine** Spalte statt vier | Die vier Excel-Spalten kodieren eine einzige Eigenschaft durch die Wahl der Spalte. Der EEB-Exporter leitet sie bereits aus dem Einheitstyp ab; v2 speichert die Ebene und rendert die vier Spalten erst im Excel-Export. **Rückwärtskompatibel**: falls in mehreren Spalten Text steht (Excel erlaubt es), Import → `ebene` = die feinste befüllte Spalte, Reste in `bemerkung` (verlustfrei). |
| I Person (TeBe, FaBe, LNA, Ziv.) | keine Personen-Einheiten; `JsonHelfer` hängt an einer Einheit | `ebene = "person"` bei Gesamtstärke 1 | **abgedeckt** durch `ebene = PERSON` | KRI §3.1 markiert das als „fehlt" — das stimmt für v1; in v2 ist eine Einzelkraft eine Einheit mit `ebene=PERSON` und Stärke 0/0/1 bzw. 1/0/0. Die EEB-Heuristik (Gesamtstärke 1 → Personenspalte) wird zur Vorbelegung. |
| – | `TacticalSignConfig.typ` Werte `platoon/group/squad` | – | **entfällt** | englische Dubletten zu zug/gruppe/trupp (v1-Altlast). |

### 1.5 Einheit – Ausstattung

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| J Geräte/Fahrzeuge (Freitext, mehrzeilig, inkl. Kennzeichen) | `JsonFahrzeug` als **eigene Entität** (name, kennzeichen, funkrufname, stanKonform, sondergeraet, nutzlast, standardPiktogrammKey, status, aktuelleEinsatzEinheitId, aktuellerAbschnittId) | `Fahrzeug[]` (typ als VokabularWert, kennzeichen, funkrufname strukturiert {kennwort, eigenerStandort, ort, teile[]}, stanKonform, aenderungen) | **Pflicht** eigene Entität `Fahrzeug`; Excel-Spalte J ist **abgeleitet** (§3.3 K10) | v1 und EEB stimmen überein, dass Fahrzeuge Entitäten sind; die Excel-Freitextspalte ist der schwächste der drei. `geraeteText()` zeigt die Ableitung inkl. Zusammenfassung gleicher Typen („2× GKW"). |
| J (Kennzeichen im Text) | `JsonFahrzeug.kennzeichen` | `Fahrzeug.kennzeichen` | **optional** `fahrzeug.kennzeichen` | 1:1. |
| – | `funkrufname: string|null` | `Funkrufname` strukturiert | **optional** `fahrzeug.funkrufname` strukturiert + abgeleiteter Anzeigetext | EEB-Modell gewinnt (spart QR-Bytes, macht „Heros Oldenburg 18/13" zerlegbar); v1-String wird beim Import in `{kennwort:{freitext}, ort, teile}` geparst, bei Misserfolg als Freitext-Kennwort. |
| – | `stanKonform: bool|null` | `stanKonform?: bool` (undefined = Frage nicht anwendbar) | **optional** dreiwertig | 1:1; Dreiwertigkeit beibehalten. |
| – | `sondergeraet` | `aenderungen` („Änderungen bzw. Sondergerät") | **optional** `fahrzeug.aenderungen` | gleiches Feld, EEB-Name ist der Formularbegriff. |
| – | `nutzlast` | – | **optional** | v1-Mehrwert, billig. |
| – | `standardPiktogrammKey` | – | **optional** `fahrzeug.taktischesZeichen` | wie 1.3. |
| – | `JsonFahrzeug.aktuellerAbschnittId` | – | **optional** `fahrzeug.abschnittId` | v1 erlaubt, ein Fahrzeug abweichend von seiner Einheit zu verorten. Beibehalten: fachlich real (GW-L2 fährt Logistik, Einheit steht am EO). |
| – | `FahrzeugStatus` AKTIV/IN_BEREITSTELLUNG/AUSSER_BETRIEB | – | **optional** `fahrzeug.status` (reduziert auf EINSATZBEREIT/NICHT_EINSATZBEREIT) | Excel kennt keinen Fahrzeugstatus; IN_BEREITSTELLUNG ist in v1 eine Ortsangabe im Statusfeld (Kategorienfehler, siehe §2.2). |

### 1.6 Einheit – Auftrag, Erreichbarkeit, Bemerkungen

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| K Aufträge (Verlauf „von–bis; Ort; Auftrag", mehrzeilig) | `JsonEinheitBewegung[]` (von/nach Abschnitt, Zeitpunkt, Benutzer, Kommentar — Kommentar ohne UI) | `Einsatz.ortAuftrag: string` (ein Auftrag je Bogen) | **Pflicht** eigene Entität `Auftrag {von, bis?, abschnittId?, text, quelle}`; Excel-Spalte K **abgeleitet** (§3.3 K11) | Die Excel schreibt den Einsatzverlauf per Hand als Text; v1 hat die Bewegungen strukturiert, aber ohne Auftragstext; der EEB liefert nur den Anfangsauftrag. v2 vereinigt: jede `EinheitVerschoben`-Bewegung erzeugt automatisch eine Verlaufszeile, zusätzlich freie Auftragstexte. Das ist zugleich der ETB-Anschluss (EXH N-6). |
| L Erreichbarkeit (Funk/Tel./eMail) | `erreichbarkeiten: string|null` | `erreichbarkeitText()` aus Ansprechpartner-Kontakten, Rückfall Ebenen-Telefon/E-Mail | **optional** `einheit.erreichbarkeit` als **abgeleitet mit Override** | Die EEB-Ableitung ist besser (strukturierte Kontakte), aber die FüSt trägt hier auch Funkrufnamen/Kanäle ein, die im Bogen nicht stehen → Feld bleibt überschreibbar, Default = Ableitung. |
| W Bemerkungen | `bemerkung: string|null` | `sonstiges?: string` (+ „ÜBUNG"-Präfix beim Export) | **optional** `einheit.bemerkung` | 1:1; beim EEB-Import nicht überschreiben, sondern anhängen (§5.3). |
| X, Y Reserve 1/2 | – | Spalten `reserve1`,`reserve2` bleiben leer | **entfällt** | Leerspalten der Vorlage; in v2 durch echte Felder ersetzt. Beim Excel-Export leer mitschreiben, damit das fremde Format stimmt. |

### 1.7 Einheit – Ressourcenplanung und Ablösung (fehlt in v1 vollständig)

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| M Verfügbar bis | – | `Einsatz.zeitraumBis` (Bogen) | **optional** `einheit.verfuegbarBis: Zeitpunkt` | EXH F-F1; Grundlage der Ablaufwarnung (§3.3 K18). EEB liefert den Startwert (`excelDatum(b.einsatz.zeitraumBis)`). |
| N Ablösung angefordert (Dat./Zeit) | – | – (bleibt leer) | **optional** `anforderung.angefordertAm` | siehe unten: eigene Entität. |
| O Anforderungs-ID | – | – (bleibt leer) | **optional** `anforderung.kennung: string` | Format ist mit der übergeordneten Stelle abgestimmt (EXH F-F1), also Freitext. |
| P Zugesagt für (Dat./Zeit) | – | – | **optional** `anforderung.zugesagtFuer` | |
| Q Zugesagt von (Org.) | – | – | **optional** `anforderung.zugesagtVon` | |
| R Vorgesehene Einheit | – | – | **optional** `anforderung.vorgeseheneEinheitText` + `vorgeseheneEinheitId?` | EXH F-F3: die Verknüpfung A (abzulösen) ↔ B (Ablösung) läuft heute über gemeinsame Anforderungs-ID **und** diesen Freitext. v2 macht die Referenz explizit, behält den Text als Ausweg. |
| S Vorgesehener Auftrag | – | – | **optional** `anforderung.vorgesehenerAuftrag` | |
| V Rückführung (Dat./Zeit) | – | – | **optional** `einheit.rueckfuehrungAm` | Gehört zur Einheit, nicht zur Anforderung (sie wird zurückgeführt, nachdem die Ablösung da ist). |

**Entscheidung „Anforderung als eigene Entität":** ja. Begründung:
1. Die sieben Spalten N–S beschreiben **einen Vorgang** mit eigenem Lebenszyklus (angefordert → zugesagt → eingetroffen → abgelöst), nicht Eigenschaften einer Einheit. Als Attribute an der Einheit ist der Vorgang nicht wiederholbar — bei einer Mehrtageslage wird dieselbe Einheit zweimal abgelöst, und die Excel überschreibt dann die erste Ablösung.
2. EXH F-F3 verlangt eine **Verknüpfung zweier Einheiten** über die Anforderungs-ID; eine Beziehung zwischen zwei Einheiten ist keine Eigenschaft einer von beiden.
3. Die Bereichsspalte „Angefordert/Anmarsch" (Excel-Zeile 138) enthält Zeilen für Einheiten, die es noch nicht gibt — die Anforderung existiert vor der Einheit. Als Entität ist das darstellbar (`anforderung` ohne `abloesendeEinheitId`), als Attribut nicht.
4. Der Ereigniskatalog braucht ohnehin `AnforderungAngelegt`/`AbloesungZugesagt` als eigene Typen (§4.2), weil sie andere Konfliktregeln haben als Einheitsfelder.

Kompatibilität: die Excel-Spalten N–S werden beim Export aus der **jüngsten offenen** Anforderung der Einheit gefüllt (§3.3 K12).

### 1.8 Einheit – Zeiten

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| T eingetr./zugew. | `erstellt` (Anlagezeitpunkt) | `Einsatz.einsatzbeginn` (`excelZeitpunkt`) | **optional** `einheit.eingetroffenAm` | v1s `erstellt` ist ein Systemfeld und nur näherungsweise dasselbe (KRI §3.1) — beide getrennt führen: `erstellt` (technisch, aus dem Ereignis) und `eingetroffenAm` (fachlich, änderbar). |
| U Einsatzende | `aufgeloest` (laut KRI nie gesetzt) | `Einsatz.einsatzende` | **optional** `einheit.einsatzendeAm` | Fachliches Feld; das Verschieben nach ARCHIV ist die separate Handlung (F-F5). |
| – | `JsonEinheit.version` (int) | – | **entfällt** | Optimistische Sperre des v1-Schreibpfads. In einem Ereignisprotokoll (NAS §10) hat der Zustand keine Version; die Ordnung macht die HLC. |
| – | `JsonEinheitBewegung.zeitpunkt/benutzer` | `MeldeEintrag.empfangenAm/quelle` | **abgeleitet** aus dem Ereignisstrom | Jedes Ereignis trägt `hlc`, `wall`, `actor` (NAS §11 Event-Zeilenformat). Bewegungen werden nicht mehr als Tabelle gespeichert, sondern sind eine Projektion. |

### 1.9 Einheit – Status und Schicht

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| Z Status (9 Werte) | `EinheitStatus` (3) + `AbschnittSystemTyp` ANFAHRT/BEREITSTELLUNGSRAUM | `MeldeStatus` ANWESEND/ABGERUECKT/AUFGEGANGEN (Sammlung, nicht Bogen); Status-Spalte bewusst **nicht** exportiert | **Pflicht** `einheit.status` (9 Werte, §2.2) | v1 vermischt Status und Ort (IN_BEREITSTELLUNG). Die Excel-Liste ist die fachlich gewachsene; sie ist Kontrollsummen-relevant (Status!G36). EEB liefert hier **nichts** — der Meldestatus der Sammlung gehört ausdrücklich nicht in die Liste der FüSt (`oldenburg-xlsx.ts` Modulkopf). |
| AA Schicht (Tag/Nacht/Früh/Spät) | – | – (Spalte bleibt leer) | **Pflicht außer im Abschnitt ANGEFORDERT** `einheit.schicht` | EXH F-G2/F-G3; Konsistenzprüfung Status!J42 zählt Einheiten ohne Schicht. |
| – | `EinheitStatus.ABGEMELDET` | `MeldeStatus.ABGERUECKT` | **abgebildet** auf Abschnitt ARCHIV + `einsatzendeAm` | Abgemeldet ist kein Status, sondern ein Ort (Archivbereich) plus Zeit. |
| – | – | `MeldeStatus.AUFGEGANGEN` | **abgebildet** auf Ereignis `EinheitZusammengefuehrt` | Der EEB-Kommentar erklärt genau, warum das kein „abgerückt" sein darf: „ein zusammengeführter Truppteil ist NICHT abgerückt — er ist wieder Teil seiner Einheit und steckt in deren Zahlen. Als ‚abgerückt' gemeldet, läse die Führungsstelle einen Abgang, den es nie gab." |

### 1.10 Einheit – EEB-Bezug

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| AB ID EEB (Dateiname im EEB-Ordner) | – | `MeldeEintrag.id` = `bogenInhaltsId(bogen)` (FNV-1a-Hex); wird als Spalte `bogenId` exportiert | **optional** `einheit.eebDokumente: Anhang[]` **und** `einheit.eebMeldungen: EebMeldung[]` | Zwei verschiedene Dinge, die die Excel in eine Spalte presst: (a) der **gescannte Papierbogen** als Datei (EXH F-D1), (b) die **digitale Meldung** mit Inhalts-ID (F-D2). v2 trennt sie. Excel-Spalte AB wird beim Export aus der jüngsten Meldung bzw. dem ersten Anhang gefüllt. |
| – | – | `MeldeEintrag.einheitSchluessel` (Fingerabdruck) | **Pflicht auf der Meldung** `meldung.einheitSchluessel` | Grundlage der Revisionsgruppierung (`einheitSchluessel()`): `ref:<standortRef>|c<code>` bzw. `org:<org>|<orgName>|<typ>|<ebene0Name>`. v2 übernimmt die Funktion unverändert, damit dieselbe Zuordnung wie in der App entsteht. |
| – | – | `MeldeEintrag.signatur` {zustand, pubkey, kurzform, absender} | **optional** `meldung.signatur` | Herkunftsnachweis; „Verifikation blockiert den Import nie" (docs/datenmodell.md). |
| – | – | `MeldeEintrag.herkunft` (Base64url des Original-Payloads) | **optional** `meldung.rohPayload` | Nur die Rohbytes tragen die fremden Signaturen; ohne sie ist Gegenzeichnen beim Weiterreichen unmöglich (docs/datenmodell.md „Aufbewahrung"). |
| – | – | `MeldeEintrag.quelle` scan/manuell/pdf-import/aufteilung/zusammenfuehrung | **Pflicht auf der Meldung** `meldung.quelle` | Herkunftsnachweis, direkt übernehmbar. |
| – | – | `Erfassungsbogen.stand` (Minuten seit 2020-01-01, lokal) | **Pflicht auf der Meldung** `meldung.stand` | Ordnungskriterium der Revisionen (`istNeuer()`: erst `stand`, dann `empfangenAm`). |

### 1.11 Einheit – Logistik und Personal

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| AC Weibl. | `JsonHelfer.geschlecht` MAENNLICH/WEIBLICH + `anzahl` | `unterbringungMWD(b).w` aus `Person.geschlecht` | **abgeleitet** aus Personal, **mit manuellem Override** | Beide Vorbilder leiten ab; EEB hat den Override bereits als `unterbringungManuell` für den Meldekopf-Modus NUR_STAERKE. Genau dieses Muster übernehmen. |
| AD Div. | **fehlt** (v1 kennt nur MAENNLICH/WEIBLICH) | `Geschlecht.D = 2` | **abgeleitet + Override** | v1-Enum ist zu eng; EXH Neu!B33: „divers/vegan wurden wegen neuer EEB ergänzt". |
| AE Veget. | `JsonHelfer.vegetarisch: bool`, `JsonEinheit.vegetarierVorhanden: bool|null` | `verpflegung(b).vegetarisch` aus `Ernaehrung` | **abgeleitet + Override** | v1s `vegetarierVorhanden` ist ein Boolean, wo die Excel eine **Anzahl** braucht — nicht summierbar, damit für Log! unbrauchbar. |
| AF Vegan | **fehlt** | `verpflegung(b).vegan` (`Ernaehrung.VEGAN`) | **abgeleitet + Override** | dito |
| AG/AH/AI ÜN m/w/d | **fehlt** | `unterbringungMWD()`, aber nur wenn `sofortbedarf.unterbringung` gesetzt („sonst stünden dort Betten für Einheiten, die abends nach Hause fahren", `oldenburg-xlsx.ts`) | **abgeleitet + Override**, Regel: 0 wenn kein Unterbringungsbedarf | Die EEB-Regel ist fachlich richtig und muss mitwandern, sonst überzeichnet die Logistik den Bettenbedarf. |
| – (implizit: männlich = Rest) | – | `Geschlecht.M` | **abgeleitet** `m = gesamt − w − d` | Log!I7 rechnet genau so (EXD §10 Nr. 7/11). |
| – | `JsonHelfer` (name, rolle, geschlecht, anzahl, funktion, telefon, erreichbarkeit, vegetarisch, bemerkung) | `Person` (nachname, vorname, staerkeRolle, funktionen[], fahrerlaubnis + weitere, geschlecht, ernaehrung, kontakte[], zusatzqualifikationen[]) | **optional** Entität `Person` nach EEB-Vorbild | EEB-Modell gewinnt deutlich: Vor-/Nachname getrennt, Fahrerlaubnisklassen, Qualifikationen, mehrere typisierte Kontakte, Ernährung dreiwertig. v1s `anzahl` (ein „Helfer"-Satz kann n Personen meinen) entfällt — dafür gibt es `personalErfassung = NUR_STAERKE`. |
| – | – | `PersonalErfassung` VOLLSTAENDIG/NUR_STAERKE | **Pflicht** `einheit.personalErfassung` | Ohne dieses Flag ist nicht entscheidbar, ob eine Einheit mit 0 Personen und Stärke 1/3/17 fehlerhaft oder korrekt (Meldekopf-Schnellerfassung) ist. |
| – | – | `Sofortbedarf` {verpflegungPersonen, dieselLiter, benzinLiter, gemischLiter, unterbringung, ruhezeitErforderlich} | **optional** `einheit.sofortbedarf` | Excel hat davon nur die Unterbringungsspalten; Kraftstoff und Ruhezeit fehlen ihr ganz. Da der EEB sie liefert, ist es Verschwendung, sie beim Import wegzuwerfen — sie sind genau das, was die Logistik-FüSt braucht. **Neu gegenüber allen drei Quellen als geführtes Feld.** |

### 1.12 Einheit – Stärke

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| AJ Fü | `aktuelleStaerkeTaktisch` = String `"F/UF/M/G"` (`tactical-strength.ts:26-28`) | `Staerke.fuehrer` | **Pflicht** `einheit.staerke.fuehrer: int` | v1 speichert vier Zahlen als Zeichenkette mit redundanter Summe und validiert sie bei jedem Schreibzugriff (`validateTacticalStrength`, `tactical-strength.ts:46-57`). In v2: drei Integer, Summe abgeleitet. |
| AK UFü | (s. o.) | `Staerke.unterfuehrer` | **Pflicht** `staerke.unterfuehrer` | |
| AL He | (s. o.) | `Staerke.mannschaft` | **Pflicht** `staerke.mannschaft` | Benennung: THW-Begriff „He(lfer)" in der UI, `mannschaft` im Modell wie EEB (organisationsübergreifend). |
| AM Gesamt (`=SUM(AJ:AL)`) | `aktuelleStaerke: number` (redundant!) | `Staerke.gesamt` (redundant, aber `staerke()` berechnet es) | **abgeleitet** | v1 führt Gesamt und Tripel doppelt und muss sie gegeneinander validieren; das ist genau die Klasse von Fehlern, die ein Ereignisprotokoll nicht auflösen kann. Ein Feld weniger = eine Konfliktregel weniger. |
| – | `JsonStaerkeLogEntry` (alteStaerke, neueStaerke, zeitpunkt, benutzer) | Revisionen der Meldungen | **abgeleitet** aus Ereignissen `StaerkeGeaendert` | Historie ist im Ereignisstrom; keine zweite Tabelle. |
| – | `ThwStanStrength` {fuehrung, unterfuehrung, mannschaft, gesamt} in `ThwStanPresetSuggestion` | – | **optional** `vorlage.sollStaerke` | v1 hat STAN-Sollstärken bereits (aus `thw-stan-2025.generated.json`); die Excel-Kopiervorlagen haben sie **nicht** (alle 0, EXD §6.3, Hinweise Z.157). Das ist ein echter v1-Mehrwert und beantwortet zugleich EXD §11 („sollen StAN-Sollstärken hinterlegt werden?" → ja, sie liegen schon vor). |

### 1.13 Kosten

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| AN PSA-Bedarf (`=AM`) | – | – | **abgeleitet** = `staerke.gesamt` | |
| AO PSA/Tag je Einheit (Eingabe) | – | – | **optional** `einheit.psaSaetzeProTag: int` | einziges echtes Eingabefeld des Kostenblocks. |
| AP PSA gesamt/Tag | – | – | **abgeleitet** | §3.3 K13 |
| AQ/AS/AT/AV Parameterspalten (`=$AQ$3` usw.) | – | – | **entfällt** | Spalten, die nur den Kopfwert wiederholen — reine Tabellenkalkulations-Mechanik. |
| AR PSA-Kosten/Tag | – | – | **abgeleitet** | §3.3 K13 |
| AU VDA+UK/Tag | – | – | **abgeleitet** | §3.3 K14 |
| AV Personentage | – | – | **abgeleitet** | §3.3 K15. Achtung: die Spalte heißt „geplante Einsatztage", enthält aber Tage × Stärke (EXD §11) → in v2 korrekt `personentage` nennen. |
| AW Gesamtkosten | – | – | **abgeleitet** | §3.3 K16 |

### 1.14 FüSt-Personal und Schichtplanung (Blatt FüSt)

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| FüSt!B Funktionsbezeichnung (Ltr FüSt, Ltr Stab, SGL 1–6, FüGeh SG n, Ltr FZ FK, ZTrFü FK, SprFu/Kf, He ZTr, GrFü F/K, LdF, TrFü K, He K…) | – | `Person.funktionen[]` (VokabularWert) | **Pflicht** `dienstposten.funktion: string` (frei, vorbelegt aus Katalog) | EXH F-I1; fehlt in v1 komplett. |
| FüSt!C Schicht (Tag/Nacht, je Funktion zwei Zeilen) | – | – | **Pflicht** `dienstposten.schicht` | dito |
| FüSt!D/E/F Besetzung Fü/UFü/He (0/1) | – | – | **Pflicht** `dienstposten.besetzung: {fuehrer, unterfuehrer, mannschaft}` | Praktisch 0/1, aber als int führen (Doppelbesetzung möglich). |
| FüSt!G Summe | – | – | **abgeleitet** | |
| Teileinheit (Stab, ZTr FK, FGr F, FGr K, Externe) | – | – | **Pflicht** `dienstposten.teileinheit` | Gruppierungsebene der Summenformeln (EXD §10 Nr. 12). |
| Stärke!Z.7–16 (Projektion der FüSt-Teileinheiten als je 2 Einheiten-Zeilen Tag/Nacht, `=FüSt!D8:F8`) | – | – | **abgeleitet** (§3.3 K17) | In v2 keine Doppelerfassung: die FüSt erscheint im Abschnitt FUEHRUNGSSTELLE als generierte Einheiten je Teileinheit×Schicht. |
| FüSt!J7:AS7 Datumsspalten | – | – | **Pflicht** `schichtplanEintrag.datum: Datum` | |
| FüSt!J10:AS139 Personentext | – | – | **Pflicht** `schichtplanEintrag.text: string` (mehrzeilig) | EXH F-I2. **Bewusst Freitext belassen** (nicht auf `Person` referenzieren): das Blatt enthält Name + Funktion + Herkunft + Erreichbarkeit + Bemerkung in einem Feld, und die FüSt plant dort auch Personen, die noch keine Einheit haben. Strukturierung wäre eine Neuerfindung ohne Beleg. → §6 Frage 6. |
| „alte Tage ausblenden" | – | – | **entfällt aus dem Modell** (Ansicht) | EXH F-I2. |

### 1.15 Vorlagen, Stammdaten, Abkürzungen

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| Stärke!Z.25–121 Kopiervorlagen (THW ~46, FW 4, KatS Nds ~40) | `JsonStammdatenEinheit` {id, name, organisation, herkunft, standardStaerke, standardPiktogrammKey} + `thw-stan-2025.generated.json` (47 Einträge) | `Vorlagen` („Meine Vorlagen", eigene Einheit) | **Pflicht** Entität `EinheitVorlage` (§3.2) | Beide Vorbilder haben es; v2 vereinigt die drei Kataloge (THW-StAN, Feuerwehr, KatS-StAN Nds) unter einem Feld `katalog`. |
| Vorlage: Zug/Trupp/Gruppe-Belegung (F/G/H) | – | – | **Pflicht** `vorlage.ebene` | wie 1.4. |
| Vorlage: Standardfahrzeuge (Spalte J) | `ThwStanPresetSuggestion.vehicles: string[]` | – | **optional** `vorlage.fahrzeuge: {typ, anzahl}[]` | v1 hat es als String-Liste; typisiert übernehmen. |
| Vorlage: Stärke (in Excel alle 0) | `ThwStanPresetSuggestion.strength` | – | **optional** `vorlage.sollStaerke` | s. 1.12. |
| AküLi (42 Einheiten + 66 Fahrzeuge/Geräte, EXD §6) | – | Vokabulare je Organisation (`vokabularFuer(org, "einheitstyp"/"fahrzeug"/"ebene")`, `vokabText(w, tab, "name")` mit Kurz- und Langform) | **Pflicht** Katalog `Vokabular` mit `{namensraum, code, kurz, lang}` | Die AküLi ist ein Kurz→Lang-Wörterbuch; der EEB hat exakt dieselbe Struktur, aber mit stabilen numerischen Codes und je Organisation getrennt. **EEB-Vokabular wird die Quelle**, die AküLi wird beim Import dagegen abgeglichen (Rest als organisationsfreie Zusatzeinträge). Wichtig: EEB-Codes sind append-only, nie umdeuten (docs/datenmodell.md „Offene Punkte"). |
| Zellkommentare als Feldhilfe (EXD §7) | – | – | **entfällt aus dem Modell** | Wird UI-Hilfetext, kein Datum. EXH F-L4 fordert Hilfe/AküLi in der Anwendung. |

### 1.16 Ausgaben, Historie, Mehrbenutzer

| Excel | v1 | EEB | v2-Entscheidung | Begründung |
|---|---|---|---|---|
| Blätter Druck/Status/Log/LogFrei/FüOrg/Auswertung, HTML-Monitor | Führungsstruktur-View, Org-Chips (max. 4), Stärke-Monitor (nur Gesamtstärke + Zeit), Export ZIP (CSV/HTML mit UUIDs) | XLSX-Export „Oldenburg" (36 Spalten A..AJ, ohne Status) | **abgeleitet** (Projektionen, §3.3) | Keine dieser Ausgaben ist gespeicherter Zustand. Einziges Datum: `LogFrei` ist eine **bearbeitbare Kopie mit Zeitstempel** (EXH F-H3) → in v2 als `Snapshot`-Export, nicht als Entität. |
| Verlaufskopien beim Speichern (`<Name>_Stärkeübersicht_<ts>.xlsm`) | Backup alle 5 min ohne Rotation | Revisionen je Einheit (`revisionen()`) | **entfällt als Feld**, ersetzt durch Ereignisprotokoll | NAS §10 Punkt 4: „ergibt Backup/Export/Archiv fast gratis". |
| kein Undo (EXH F-L2 fordert es ausdrücklich) | `JsonCommandLogEntry` {commandTyp, payloadJson, undone} — nur MOVE nutzbar, `command:undo-last` ohne Bedienelement (KRI §3.3) | – | **Pflicht** Kompensationsereignisse (§4.3) | Weder ein `undone`-Flag noch ein Löschen des Ereignisses ist in einem Append-only-Log möglich (NAS §11 „Nur Create-New und Append"). |
| Meldekopf-Prozess (Google-Tabelle, gelb=neu/grün=übernommen, EXH F-E1…F-E5) | – (Clients gleichberechtigt, kein Eingangskorb) | `Einsatzsammlung` + `MeldeEintrag.status` + `neuesteJeEinheit()` | **Pflicht** Entität `EebMeldung` mit `uebernahmeZustand` | Der EEB-Sammlungsmechanismus **ist** der Meldekopf-Prozess, nur ohne Google. F-E2 („Meldekopf-Einträge werden nicht gelöscht") entspricht dem Append-only-Log. |
| – | `JsonActiveClient`, `JsonRecordEditLock`, `writeSeq` | – | **entfällt** | Persistenz-/Sperrmodell wird neu entworfen (KRI §3.6 Punkt 1); Presence wird informativ (NAS §11 `presence/`). |
| – | `JsonBenutzer` {name, rolle ADMIN/S1/FUE_ASS/VIEWER, passwortHash, aktiv} | Ed25519-Geräteschlüssel + Absenderkarte | **optional** `Akteur` je Ereignis | EXH L-3/N-7 verlangt Schutz vor versehentlicher Strukturänderung und Admin-Modus, nicht Mehrbenutzer-Authentifizierung. Ein Ereignis trägt ohnehin `actor: {user, host}` (NAS §11). Rollen bleiben, Passwort-Hashes im geteilten Verzeichnis sind zu überdenken → §6 Frage 9. |

---

## 2. Enum-Abbildungen

Grundregel für alle Enums in v2: **stabiler Schlüssel (SCREAMING_SNAKE, nie umbenannt) + Anzeigename + Excel-Kurzform + EEB-Code.** Die Schlüssel wandern in Ereignisse und Archivdateien und sind damit so langlebig wie die Einsatzakte; die Anzeigenamen dürfen sich ändern. Unbekannte Werte werden **nie verworfen**, sondern als `SONSTIGE` + Freitext gehalten (NAS §10 Restrisiko 3: „alte Clients dürfen neue Typen nicht verwerfen").

### 2.1 Organisation (Excel 12 ↔ v1 14 ↔ EEB 11 + Sonstige)

| v2-Schlüssel | Anzeige | Excel (D) | v1 `OrganisationKey` | EEB `OrganisationsTyp` | Anmerkung |
|---|---|---|---|---|---|
| `THW` | THW | THW | `THW` | 1 | |
| `FEUERWEHR` | Feuerwehr | FW | `FEUERWEHR` | 2 (BF und FF) | |
| `POLIZEI` | Polizei | POL | `POLIZEI` | 3 | |
| `BUNDESPOLIZEI` | Bundespolizei | BPOL | **fehlt** | 4 | v1 kennt nur POLIZEI — beim v1-Import bleibt BPOL nicht rekonstruierbar. |
| `DRK` | DRK | DRK | `DRK` | 5 | |
| `JUH` | Johanniter | JUH | `JOHANNITER` | 6 | Schlüsselname EEB-nah (`JUH`), Anzeige v1-nah. |
| `MHD` | Malteser | MALT | `MALTESER` **und** `MHD` (Dublette) | 7 | **Auflösung der Dublette:** MALT = Malteser Hilfsdienst = MHD. Beide v1-Schlüssel bilden auf `MHD` ab; Migrationsregel §5.1. |
| `ASB` | ASB | ASB | `ASB` | 8 | |
| `DLRG` | DLRG | DLRG | `DLRG` | 9 | |
| `BUNDESWEHR` | Bundeswehr | BW | `BUNDESWEHR` | 10 | |
| `RETTUNGSDIENST` | Rettungsdienst | **fehlt** | `RETTUNGSDIENST_KOMMUNAL` | 11 (kommunal/privat) | EEB-Semantik ist weiter; v1-Schlüssel bildet darauf ab. |
| `BERGWACHT` | Bergwacht | **fehlt** | `BERGWACHT` | **fehlt** (→255 + Name) | Beim EEB-Export als SONSTIGE + `organisationName="Bergwacht"`. |
| `WASSERWIRTSCHAFT` | Wasserwirtschaft (NLWKN/HK) | HK/NLWKN | **fehlt** | **fehlt** (→255 + Name) | Excel-only. Erhält eigenen Schlüssel, weil Druck!M4:S34 danach filtert (EXD §11 nennt die Farbcodierung). |
| `REGIE` | Regieeinheit | **fehlt** | `REGIE` | **fehlt** (→255 + Name) | v1-only; kommunale Regieeinheiten sind real, Schlüssel behalten. |
| `ZIVIL` | Zivil / Selbsthilfe | ZIV | **fehlt** (`SONSTIGE`) | **fehlt** (→255 + Name) | Excel-only. Nicht mit `SONSTIGE` verschmelzen: „Ziv." ist in der Excel eine eigene Filterkategorie (Spalte I „Person (…Ziv.)" und Druckfilter). |
| `SONSTIGE` | *(Freitext)* | – | `SONSTIGE` | 255 (Name Pflicht) | `organisationName` Pflicht. |

Regeln:
1. **16 Schlüssel**, Vereinigungsmenge aller drei Listen minus der v1-Dublette MALTESER/MHD.
2. `organisationName` (Freitext) ist an **jeder** Einheit erlaubt, nicht nur bei SONSTIGE — die Excel-Praxis „FW" für 40 verschiedene Ortsfeuerwehren braucht den Klartext (EEB tut es genauso: `b.einheit.organisationName?.trim() || orgLabel(...)`).
3. Beim EEB-Import kommt der Code aus `OrganisationsTyp`; für die vier v2-Schlüssel ohne EEB-Code (`BERGWACHT`, `WASSERWIRTSCHAFT`, `REGIE`, `ZIVIL`) wird beim Import von 255 anhand des `organisationName` per Wörterbuch heuristisch zugeordnet, **mit Vorschlag statt Automatik** (dasselbe Prinzip wie `einheitSchluessel()`: „von der App VORGESCHLAGEN, vom Menschen bestätigt").
4. Farbzuordnung je Organisation (EXD §11: FW FF0000, THW 0033CC, DLRG 00B0F0, POL 002AB0, BPOL 00228E, HiOrgs grau, HK/NLWKN + ZIV schwarz) als Anzeigeattribut mitführen — sonst sieht der Druck anders aus als die gewohnte Lagekarte. Ob die Farben verbindlich sind, ist ungeprüft [unbelegt, EXD §11] → §6 Frage 8.

### 2.2 Status (Excel 9 ↔ v1 3 + Abschnittstyp ↔ EEB –)

| v2-Schlüssel | Anzeige (Formular) | Kurzform (Status-Blatt) | v1 | EEB | Bedeutung |
|---|---|---|---|---|---|
| `RUFBEREITSCHAFT` | Rufbereitschaft | „Ruf Bereitsch." | – | – | angemeldet, zu Hause abrufbar |
| `EINSATZVORBEHALT` | Einsatzvorbehalt | „Einsatzvorbeh." | – | – | zugesagt unter Vorbehalt |
| `ANGEFORDERT` | Angefordert | Angefordert | – (indirekt: Abschnitt `ANFAHRT`) | – | angefordert, noch nicht in Marsch |
| `ANMARSCH` | Anmarsch | Anmarsch | – (Abschnitt `ANFAHRT`) | – | unterwegs zum Einsatz |
| `EINSATZBEREIT` | Einsatzbereit | Einsatzbereit | `IN_BEREITSTELLUNG` (teilweise) | – | vor Ort, verfügbar |
| `IM_EINSATZ` | Einsatz | Einsatz | `AKTIV` | – | im Auftrag gebunden |
| `RUHE` | Ruhe | Ruhe | – | – | Ruhezeit / Schichtpause |
| `NICHT_EINSATZBEREIT` | Nicht einsatzbereit | Nicht einsatzbereit | – | – | Ausfall, Defekt, Erschöpfung |
| `RUECKMARSCH` | Rückmarsch | Rückmarsch | – | – | auf dem Weg zurück |

Entscheidungen:
1. **Excel-Liste gewinnt vollständig** (9 Werte, EXH F-G1). v1s drei Werte sind nicht erweiterbar, ohne die Semantik zu brechen.
2. **Die Inkonsistenz Langform/Kurzform ist ein Vorlagenfehler**, kein fachlicher Unterschied: das Formular schreibt „Rufbereitschaft"/„Einsatzvorbehalt", die SUMIF-Formeln des Status-Blatts zählen „Ruf Bereitsch."/„Einsatzvorbeh." (KRI §3.1; EXD §11) — d. h. **diese beiden Statuswerte werden in der laufenden Excel schlicht nie mitgezählt**. In v2 löst der stabile Schlüssel das Problem restlos; die Anzeigenamen sind reine Beschriftung.
3. **`IN_BEREITSTELLUNG` ist kein Status, sondern ein Ort.** v1 hat hier einen Kategorienfehler: die Bereitstellung ist in der Excel ein Bereich (BR 1/BR 2), nicht ein Statuswert. Migration: `IN_BEREITSTELLUNG` → Status `EINSATZBEREIT` **und** Abschnitt vom Typ `BEREITSTELLUNGSRAUM` (§5.1).
4. **`ABGEMELDET` ist kein Status, sondern Archiv.** Migration → Abschnitt `ARCHIV` + `einsatzendeAm` (§5.1).
5. **Kein Status kommt aus dem EEB.** Ausdrücklich: „Die Einsatzkräfte-Übersicht der Führungsstelle führt eigene Statuswerte; das ‚Anwesend' aus der Sammlung gehört nicht dazu und stand dort als Fremdkörper" (`oldenburg-xlsx.ts` Modulkopf). Der Status wird bei einem EEB-Reimport **niemals** überschrieben (§5.3).
6. Der EEB-`MeldeStatus` wird in v2 **nicht** als Einheitsstatus geführt, sondern als Zustand der Meldung: `ANWESEND` = Meldung zählt, `ABGERUECKT` = Einheit hat den Meldekopf verlassen, `AUFGEGANGEN` = in eine andere Einheit zusammengeführt (§2.9).

### 2.3 Schicht

| v2-Schlüssel | Anzeige | Excel (AA) | gültig bei `schichtmodell` |
|---|---|---|---|
| `TAG` | Tag | Tag | ZWEI_SCHICHT |
| `NACHT` | Nacht | Nacht | ZWEI_SCHICHT, DREI_SCHICHT |
| `FRUEH` | Früh | Früh | DREI_SCHICHT |
| `SPAET` | Spät | Spät | DREI_SCHICHT |

Entscheidungen:
1. Vier Werte (EXD §8.3, EXH F-G2). Die Auswertung Log!D..G führt alle vier nebeneinander (EXD §10 Nr. 10), was nur bei gemischtem Betrieb sinnvoll ist.
2. `einsatz.schichtmodell` steuert, welche Werte die Maske anbietet — aber **die Validierung lehnt einen abweichenden Wert nicht ab** (eine hinzukommende Feuerwehrbereitschaft kann ein anderes Modell fahren). Warnung statt Fehler.
3. Default `TAG` (Kommentar Stärke!AA4).
4. `schicht` ist **Pflicht außer im Abschnitt vom Typ `ANGEFORDERT`** — genau die Ausnahme, die die Excel-Konsistenzformel Status!J42 macht (`J42 − J20 + AM138 = 0`, EXD §10 Nr. 9).
5. **Nicht** aus dem EEB befüllbar (Spalte bleibt im Oldenburg-Export leer).

### 2.4 Abschnittstyp (Excel-Bereiche ↔ v1 `AbschnittSystemTyp`)

| v2-Schlüssel | Excel-Bereich | v1 | zählt in Gesamtstärke | zählt in Kosten | erscheint im Druck | Schicht Pflicht |
|---|---|---|---|---|---|---|
| `FUEHRUNGSSTELLE` | Führungsstelle (Z.6–16) | `FUEST` | ja | ja | ja | ja |
| `MELDEKOPF` | Meldekopf FüSt BR 1 / BR 2 (Z.17–18) | **fehlt** | ja | ja | ja | ja |
| `SONSTIGE_FUEHRUNG` | Sonstiges Führung (Z.19–20) | **fehlt** (→`NORMAL`) | ja | ja | ja | ja |
| `LOGISTIK` | Logistik (Z.21/124–136) | `LOGISTIK` | ja | ja | ja | ja |
| `ANGEFORDERT` | Angefordert/Anmarsch (Z.138–160) | `ANFAHRT` | **nein** (separat ausgewiesen) | **nein** | **nein** | **nein** |
| `BEREITSTELLUNGSRAUM` | Bereitstellung 1 / 2 (Z.162–198) | `BEREITSTELLUNGSRAUM` | ja | ja | ja | ja |
| `EINSATZORT` | Einsatzort 1–21 | `NORMAL` | ja | ja | ja | ja |
| `ARCHIV` | „Einsatz beendet" (Z.431) | **fehlt** | nein | nein | nein | nein |
| `VORLAGEN` | Kopiervorlagen (Z.23–122) | **fehlt** | nein | nein | nein | nein |

Entscheidungen:
1. **`VORLAGEN` wird kein Abschnitt**, sondern ein eigener Katalog (§3.2 `EinheitVorlage`). In der Excel ist er nur deshalb ein Zeilenbereich, weil Excel nichts anderes anbietet. Der Wert steht in der Tabelle nur zur Vollständigkeit der Migration (§5.2).
2. **`ANGEFORDERT` ist der einzige Typ mit abweichenden Zählregeln** — und das an fünf Stellen (EXD §10 Nr. 3/4/11/17, EXH F-F2). Die Spalten „zählt in…" oben sind daher **Attribute des Typs**, nicht Sonderfälle im Auswertungscode.
3. **`MELDEKOPF` neu**: EXH F-E1…F-E5 beschreiben einen eigenständigen Arbeitsplatz mit eigenem ETB und Quittierungslogik; ohne eigenen Typ ist der Eingangskorb nicht modellierbar.
4. `SONSTIGE_FUEHRUNG` bleibt getrennt von `FUEHRUNGSSTELLE`, weil die Summenformel FüSt-Stärke (EXD §10 Nr. 12/13) nur die eigene FüSt aus dem FüSt-Blatt zieht, fremde Führungskräfte aber separat stehen.
5. v1s `NORMAL` bildet auf `EINSATZORT` ab (§5.1).
6. Ein Abschnitt kann Kinder haben (`parentId`); die Zählregeln des Typs gelten **je Abschnitt**, nicht vererbt. Ein `EINSATZORT` unter einem `EINSATZORT` (Unterabschnitt) zählt normal mit; ein Kind unter `ANGEFORDERT` erbt die Ausnahme **nicht** automatisch → §6 Frage 3.

### 2.5 Rolle Fü / UFü / He ↔ EEB `StaerkeRolle` ↔ v1 `HelferRolle`

| v2-Schlüssel | Excel-Spalte | v1 `HelferRolle` | EEB `StaerkeRolle` | Anzeige |
|---|---|---|---|---|
| `FUEHRER` | AJ „Fü" | `FUEHRER` | `FUEHRER = 2` | Führer / Fü |
| `UNTERFUEHRER` | AK „Ufü" | `UNTERFUEHRER` | `UNTERFUEHRER = 1` | Unterführer / UFü |
| `MANNSCHAFT` | AL „He" | `HELFER` | `MANNSCHAFT = 0` | Helfer (THW) / Mannschaft |

Entscheidungen:
1. Alle drei Quellen sind deckungsgleich — der einzige Unterschied ist die Benennung des dritten Werts. **Modellname `MANNSCHAFT`** (organisationsübergreifend, wie EEB), **UI-Beschriftung „He"** im THW-Kontext (wie Excel und v1).
2. Der EEB-Kommentar zur Bedeutung wird übernommen: „Rolle, in der die Person VOR ORT eingesetzt ist — nicht die höchste Qualifikation (ein SGL, der als GrFü fährt, zählt als Unterführer)" (`model.ts:189-191`). Das ist die einzige Stelle in allen drei Quellen, wo die Zählregel überhaupt definiert ist, und gehört als Feldhilfe in die Maske.
3. Numerische Werte des EEB (0/1/2) **nicht** als Speicherform übernehmen — die Reihenfolge 0=Mannschaft ist QR-Optimierung, in einer Datei sind sprechende Schlüssel besser.

### 2.6 Geschlecht

| v2-Schlüssel | Excel | v1 `HelferGeschlecht` | EEB `Geschlecht` |
|---|---|---|---|
| `MAENNLICH` | AC/AD implizit (Rest), AG „ÜN (m)" | `MAENNLICH` | `M = 0` |
| `WEIBLICH` | AC „Weibl.", AH „ÜN (w)" | `WEIBLICH` | `W = 1` |
| `DIVERS` | AD „Div.", AI „ÜN (d)" | **fehlt** | `D = 2` |

Entscheidungen:
1. **Drei Werte** (EEB-Modell). v1s Zweiwertigkeit ist nachweislich veraltet: EXH Neu!B33 dokumentiert, dass „divers/vegan wegen neuer EEB ergänzt" wurden — die Excel ist v1 hier voraus.
2. **Männlich wird gespeichert, nicht abgeleitet**, wenn Einzelpersonen erfasst sind (`Person.geschlecht`). Nur die *Aggregate* der Excel leiten m als Rest ab (Log!I7) — das bleibt eine Kennzahl (§3.3 K5), kein Feld.
3. Kein `UNBEKANNT`: keine der drei Quellen kennt es, und in der Unterbringungsrechnung wäre der Wert nicht verwertbar. Bei fehlender Angabe zählt die Person in `MAENNLICH` [Annahme — entspricht dem Excel-Verhalten „Rest", aber nicht explizit belegt] → §6 Frage 4.

### 2.7 Ernährung

| v2-Schlüssel | Excel | v1 | EEB `Ernaehrung` |
|---|---|---|---|
| `FLEISCH` | (Rest) | `vegetarisch = false` | `FLEISCH = 0` |
| `VEGETARISCH` | AE „Veget." | `vegetarisch = true`; Einheit: `vegetarierVorhanden: bool\|null` | `VEGETARISCH = 1` |
| `VEGAN` | AF „Vegan." | **fehlt** | `VEGAN = 2` |

Entscheidungen:
1. **EEB-Modell gewinnt** (dreiwertig je Person). v1s Boolean kann Vegan nicht ausdrücken und liefert auf Einheitsebene mit `vegetarierVorhanden` nur ein Ja/Nein statt einer Zahl — für Log! (Verpflegungsplanung) unbrauchbar.
2. Keine Erweiterung um Allergien/Halal/Kosher: in keiner der drei Quellen belegt; wenn nötig, gehört es in `sofortbedarf`/`bemerkung` → §6 Frage 5.
3. Aggregation nach dem EEB-Muster `verpflegung()`: `{gesamt, fleisch, vegetarisch, vegan}` mit `fleisch = max(0, gesamt − veg − vegan)` — der `max(0,…)` ist wichtig, weil bei manueller Erfassung (`verpflegungManuell`) die Summen überschreiten können.

### 2.8 Taktische Ebene (Excel-Spalten F/G/H/I ↔ v1 `TacticalSignConfig.typ` ↔ EEB `ebeneVon()`)

| v2-Schlüssel | Excel-Spalte | v1 `typ` | EEB `Ebene` |
|---|---|---|---|
| `GROSSVERBAND` | – | `grossverband` | – |
| `ABTEILUNG` | – | `abteilung` | – |
| `BEREITSCHAFT` | – | `bereitschaft` | – |
| `ZUG` | F „Zug" | `zug` | `"zug"` |
| `ZUGTRUPP` | G (als Trupp geführt) | `zugtrupp` | `"trupp"` |
| `GRUPPE` | H „Gruppe" | `gruppe` | `"gruppe"` |
| `STAFFEL` | G „Trupp o. [Staffel]" | `staffel` | `"trupp"` |
| `TRUPP` | G „Trupp o." | `trupp` | `"trupp"` |
| `PERSON` | I „Person" | – (`none`) | `"person"` (Gesamtstärke 1) |
| `UNBESTIMMT` | keine Spalte gefüllt | `none` | `undefined` | 

Entscheidungen:
1. Die Excel-Spalte G heißt „Trupp o." (= Trupp **oder** Staffel, EXD §9) und trägt beide; v2 trennt sie und mappt beim Export zurück in dieselbe Spalte.
2. Die englischen v1-Werte `platoon/group/squad` entfallen (§1.4).
3. Die EEB-Heuristik `ebeneVon(typLang, gesamtstaerke)` (Trupp **vor** Zug prüfen, weil „Zugtrupp Technischer Zug" ein Trupp ist) wird als **Vorbelegungsregel** beim Import übernommen, nicht als Speicherlogik.

### 2.9 Meldezustand (nur an der Meldung, EEB `MeldeStatus`)

| v2-Schlüssel | EEB | Bedeutung | Wirkung auf Summen |
|---|---|---|---|
| `ANWESEND` | `ANWESEND = 0` | Meldung ist der aktuelle Revisionskopf | zählt |
| `ABGERUECKT` | `ABGERUECKT = 1` | Einheit hat den Meldekopf verlassen | zählt nicht |
| `AUFGEGANGEN` | `AUFGEGANGEN = 2` | in eine andere Einheit zusammengeführt | zählt nicht (die Zahlen stecken im Ziel) |

Zusätzlich in v2, weil der Meldekopf-Prozess der Excel eine Quittierung kennt (EXH F-E1: „neu = gelb, übernommen = grün, Änderung = wieder gelb"):

| v2-Schlüssel `uebernahmeZustand` | Excel-Farbe | Bedeutung |
|---|---|---|
| `NEU` | gelb | eingegangen, von der FüSt noch nicht übernommen |
| `UEBERNOMMEN` | grün | in eine `Einheit` überführt |
| `GEAENDERT` | gelb | neue Revision nach Übernahme (Feldabgleich nötig) |
| `ABGELEHNT` | – | bewusst nicht übernommen (Dublette, Fehleingabe); bleibt sichtbar (F-E2: nicht löschen) |

### 2.10 Weitere Enums (kurz)

- **`EinsatzArt`**: `EINSATZ` / `UEBUNG` / `VERANSTALTUNG` — 1:1 aus EEB `EinsatzArt`. In v1 und Excel nur als Namensbestandteil („Name des Einsatzes oder der Übung", Stammdaten!C4).
- **`Fahrerlaubnis`**: 14 EU-Klassen AM…DE aus EEB `Fahrerlaubnis` unverändert (Excel und v1 kennen sie nicht). Mehrere Klassen je Person (`weitereFahrerlaubnisse`, EEB-Schema 8).
- **`KontaktArt`**: `MOBIL` / `FESTNETZ` / `EMAIL` + `dienstlich: bool` aus EEB `Kontakt`. Ersetzt v1s flache `telefon`/`erreichbarkeit`-Felder und die Excel-Freitextspalte L.
- **`Vorlagenkatalog`**: `THW_STAN` / `FEUERWEHR` / `KATS_STAN_NDS` (EXD §6.3).
- **`MeldeQuelle`**: `SCAN` / `MANUELL` / `PDF_IMPORT` / `AUFTEILUNG` / `ZUSAMMENFUEHRUNG` — 1:1 aus EEB.
- **`PersonalErfassung`**: `VOLLSTAENDIG` / `NUR_STAERKE` — 1:1 aus EEB.
- **`BenutzerRolle`**: `ADMIN` / `S1` / `FUE_ASS` / `VIEWER` aus v1 unverändert (Excel kennt nur „Admin-Modus mit Passwort", EXH F-L3).

---

## 3. Zielmodell v2 – Entitäten, Attribute, Typen

Notation: TypeScript-nahe Pseudotypen, stack-neutral lesbar (`Id` = opake Zeichenkette, `Zeitpunkt` = ISO-8601 mit Zonenversatz, `Datum` = ISO-Kalendertag, `int` = ganzzahlig ≥ 0 sofern nicht anders vermerkt). `?` = optional. Felder mit `/* abgeleitet */` werden **nicht gespeichert**.

### 3.1 Übersicht

```
Einsatz 1─n Abschnitt (Baum über parentId)
Einsatz 1─n Einheit ──n─1 Abschnitt
Einheit 1─n Fahrzeug          (Fahrzeug kann eigenen Abschnitt haben)
Einheit 1─n Person
Einheit 1─n Auftrag           (Verlaufszeilen, teils automatisch)
Einheit 0─n Anforderung       (als angeforderte ODER als ablösende Einheit)
Einheit 0─n EebMeldung        (Revisionen, gruppiert über einheitSchluessel)
Einheit 0─n Anhang            (gescannte EEB-Dateien, Fotos)
Einsatz 1─n Dienstposten ──1─n SchichtplanEintrag
Einsatz 1─n EtbEintrag        (Projektion des Ereignisstroms + freie Einträge)
global  1─n EinheitVorlage    (Katalog, versioniert, nicht einsatzgebunden)
global  1─n VokabularEintrag  (EEB-Vokabulare + AküLi)
```

Sechs Entscheidungen, die diese Struktur trägt:
1. **`Anforderung` ist eine Entität** (Begründung §1.7), nicht ein Satz Attribute an der Einheit.
2. **`Schicht` ist ein Attribut, keine Entität.** Die Excel führt Schicht nur als Wert je Einheit (AA) und als Doppelzeile Tag/Nacht im FüSt-Blatt. Es gibt keinen Schichtplan für Einheiten, nur für FüSt-Dienstposten — dort ist `schicht` ein Attribut des Dienstpostens. Eine Entität „Schicht" hätte keine eigenen Attribute außer dem Namen.
3. **`Logistikbedarf` ist ein Attribut-Bündel an der Einheit**, keine Entität: alle Zahlen (AC–AI) hängen an genau einer Einheit und haben keinen eigenen Lebenszyklus. Der `sofortbedarf` (Kraftstoff, Ruhezeit) kommt aus dem EEB dazu.
4. **`Kostenparameter` sind Attribute des Einsatzes**, alle einzelnen Kosten sind abgeleitet — die Excel hat pro Einheit genau ein Eingabefeld (AO), der Rest sind Formeln.
5. **`EebMeldung` ist eine eigene Entität mit Revisionen**, nicht ein Feld an der Einheit (Begründung §0 dritter Grundsatz).
6. **`EtbEintrag` ist überwiegend Projektion.** Er wird nicht doppelt geführt: jedes fachliche Ereignis erzeugt eine Zeile; zusätzlich gibt es frei getippte Einträge als eigener Ereignistyp.

### 3.2 Entitäten im Detail

**Einsatz**
```
id: Id
name: string                          // Pflicht, EXH F-A1
art: EinsatzArt                       // EINSATZ | UEBUNG | VERANSTALTUNG
fuestName: string                     // Pflicht
uebergeordneteFuestName?: string
ort?: string                          // aus EEB Einsatzsammlung.ort
beginn: Zeitpunkt
ende?: Zeitpunkt
status: 'AKTIV' | 'BEENDET' | 'ARCHIVIERT'
schichtmodell: 'ZWEI_SCHICHT' | 'DREI_SCHICHT'
kosten: {
  psaKostenProSatz: number            // €, Default 180  (Stärke!AQ3)
  vdaProTag: number                   // €, Default 150  (AS3)
  ukVerpflegungProTag: number         // €, Default 20   (AT3)
  geplanteEinsatztage: int            // Default 5       (AV3)
}
schemaVersion: int                    // NAS §10 Restrisiko 3
```

**Abschnitt**
```
id: Id
einsatzId: Id
parentId?: Id                         // Baum; null = direkt unter dem Einsatz
name: string
typ: Abschnittstyp                    // §2.4, bestimmt die Zählregeln
reihenfolge: int                      // Sortierung in Druck/Log
bemerkung?: string
aufgeloestAm?: Zeitpunkt              // Abschnitt geschlossen, Einheiten umgehängt
```
Invarianten: (a) genau ein Abschnitt vom Typ `ARCHIV` je Einsatz, systemseitig angelegt, nicht löschbar; (b) höchstens ein `FUEHRUNGSSTELLE` ohne `parentId`; (c) `parentId` darf keinen Zyklus bilden; (d) ein aufgelöster Abschnitt enthält keine Einheiten.

**Einheit**
```
id: Id
einsatzId: Id
abschnittId: Id
istFuehrungDesAbschnitts: bool        // Excel-Konvention "erste Zeile", EXH F-B2
reihenfolge: int                      // Position innerhalb des Abschnitts (F-B5)

// Identität
bezeichnung: string                   // Pflicht (Stärke!C)
organisation: Organisation            // §2.1
organisationName?: string             // Pflicht bei SONSTIGE
hierarchie: HierarchieEbene[]         // >=1, unterste zuerst (EEB-Modell)
standortRef?: int                     // THW-OV-Nummer o. ä.
fuestKennung?: string                 // Stärke!B
ebene: TaktischeEbene                 // §2.8, ersetzt Spalten F/G/H/I
teilEtikett?: string                  // "(Fachberater)", nach Aufteilung
abgeteiltVonId?: Id
vorlageId?: Id

// Führung und Erreichbarkeit
fuehrungskraft?: { name: string; kontakte: Kontakt[] }
erreichbarkeitOverride?: string       // sonst abgeleitet, §3.3 K9

// Stärke
staerke: { fuehrer: int; unterfuehrer: int; mannschaft: int }
personalErfassung: 'VOLLSTAENDIG' | 'NUR_STAERKE'

// Führungsdaten (kommen NIE aus dem EEB)
status: EinheitStatus                 // §2.2, Pflicht
schicht?: Schicht                     // Pflicht außer Abschnittstyp ANGEFORDERT
bemerkung?: string

// Zeiten
eingetroffenAm?: Zeitpunkt            // Stärke!T
verfuegbarBis?: Zeitpunkt             // M
einsatzendeAm?: Zeitpunkt             // U
rueckfuehrungAm?: Zeitpunkt           // V

// Logistik (Override; Default = Ableitung aus Person[], §3.3 K4)
logistikOverride?: {
  weiblich?: int; divers?: int
  vegetarisch?: int; vegan?: int
  uebernachtungM?: int; uebernachtungW?: int; uebernachtungD?: int
}
sofortbedarf?: {                      // aus EEB, in Excel nur teilweise
  verpflegungPersonen: int
  dieselLiter: int; benzinLiter: int; gemischLiter: int
  unterbringung: bool
  ruhezeitErforderlich: bool
}

// Kosten
psaSaetzeProTag?: int                 // Stärke!AO, einziges Kosten-Eingabefeld

// Darstellung
taktischesZeichen?: TaktischesZeichen // typisiert, nicht als JSON-String
```

**HierarchieEbene** (aus EEB `HierarchieEbene`)
```
art: VokabularWert        // OV | RB | LV | Gemeinde | Landkreis | KV | ...
name: string              // "Oldenburg - Ni"
kurz?: string             // "OODE"
telefon?: string
email?: string
```

**Kontakt** (aus EEB)
```
art: 'MOBIL' | 'FESTNETZ' | 'EMAIL'
dienstlich: bool
wert: string
```

**Person** (aus EEB `Person`, ersetzt v1 `JsonHelfer`)
```
id: Id
einheitId: Id
nachname: string
vorname: string
rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'MANNSCHAFT'   // §2.5
funktionen: VokabularWert[]
fahrerlaubnisse: Fahrerlaubnis[]                   // 0..n, EEB-Schema 8
geschlecht: 'MAENNLICH' | 'WEIBLICH' | 'DIVERS'
ernaehrung: 'FLEISCH' | 'VEGETARISCH' | 'VEGAN'
kontakte: Kontakt[]
zusatzqualifikationen: VokabularWert[]
bemerkung?: string
```

**Fahrzeug**
```
id: Id
einsatzId: Id
einheitId?: Id                  // null = Einheit noch nicht zugeordnet
abschnittId?: Id                // abweichender Standort (v1-Mehrwert)
typ: VokabularWert              // EEB-Vokabular je Organisation
bezeichnung?: string            // Freitext, wenn kein Vokabularwert passt
kennzeichen?: string
funkrufname?: { kennwort: VokabularWert; eigenerStandort: bool; ort?: string; teile: int[] }
stanKonform?: bool              // dreiwertig: undefined = nicht anwendbar
aenderungen?: string            // "Änderungen bzw. Sondergerät"
nutzlast?: string
status: 'EINSATZBEREIT' | 'NICHT_EINSATZBEREIT'
taktischesZeichen?: TaktischesZeichen
entferntAm?: Zeitpunkt
```

**Auftrag** (ersetzt Excel-Spalte K und v1 `JsonEinheitBewegung`)
```
id: Id
einheitId: Id
von: Zeitpunkt
bis?: Zeitpunkt
abschnittId?: Id                // Einsatzort des Auftrags
text: string
quelle: 'MANUELL' | 'BEWEGUNG' | 'EEB'   // BEWEGUNG = automatisch bei Verschieben
```

**Anforderung** (Excel-Spalten N–S, EXH F-F1/F-F3; fehlt in v1 und EEB)
```
id: Id
einsatzId: Id
kennung?: string                     // Anforderungs-ID, Format extern abgestimmt (O)
abzuloesendeEinheitId?: Id           // die Einheit, die abgelöst werden soll
abloesendeEinheitId?: Id             // die zugesagte Einheit, sobald bekannt (R)
vorgeseheneEinheitText?: string      // R als Freitext, solange keine Einheit existiert
vorgesehenerAuftrag?: string         // S
angefordertAm?: Zeitpunkt            // N
zugesagtFuer?: Zeitpunkt             // P
zugesagtVon?: string                 // Q (Organisation/Stelle)
erledigtAm?: Zeitpunkt               // = eingetroffenAm der ablösenden Einheit
zustand: 'OFFEN' | 'ZUGESAGT' | 'EINGETROFFEN' | 'STORNIERT'
bemerkung?: string
```

**Dienstposten** (FüSt-Blatt, EXH F-I1; fehlt in v1 und EEB)
```
id: Id
einsatzId: Id
teileinheit: string                  // "Stab" | "ZTr FK" | "FGr F" | "FGr K" | "Externe" (frei)
funktion: string                     // "Ltr FüSt", "SGL 3", "GrFü F", ...
schicht: Schicht
reihenfolge: int
besetzung: { fuehrer: int; unterfuehrer: int; mannschaft: int }   // praktisch 0/1
```

**SchichtplanEintrag** (FüSt!J10:AS139, EXH F-I2)
```
id: Id
dienstpostenId: Id
datum: Datum
text: string                         // mehrzeilig: Name, Funktion, Herkunft, Erreichbarkeit
```

**EebMeldung** (aus EEB `MeldeEintrag`; §0 dritter Grundsatz)
```
id: Id                               // = bogenInhaltsId(bogen), FNV-1a-Hex → Dedupe
einsatzId: Id
einheitSchluessel: string            // einheitSchluessel(), gruppiert Revisionen
einheitId?: Id                       // gesetzt, sobald übernommen
stand: Zeitpunkt                     // Erfassungsbogen.stand (Ordnungskriterium)
empfangenAm: Zeitpunkt
quelle: MeldeQuelle
meldeStatus: 'ANWESEND' | 'ABGERUECKT' | 'AUFGEGANGEN'
uebernahmeZustand: 'NEU' | 'UEBERNOMMEN' | 'GEAENDERT' | 'ABGELEHNT'   // §2.9
zugEtikett?: string
teilEtikett?: string
aufgegangenIn?: { einheitSchluessel: string; zusammengefuehrtAm: Zeitpunkt }
stammtVon?: { einheitSchluessel: string; teilEtikett?: string; abgeteiltAm: Zeitpunkt }
signatur?: { zustand: 'GUELTIG' | 'UNGUELTIG'; pubkey?: string; kurzform?: string;
             absender?: { name?: string; email?: string; telefon?: string } }
rohPayload?: string                  // Base64url; nötig für Gegenzeichnen beim Weiterreichen
bogen: Erfassungsbogen               // vollständige EEB-Struktur, unverändert
```
Regel: **die Meldung ist unveränderlich.** Eine Korrektur ist eine neue Meldung (Revision); Löschen ist verboten (EXH F-E2). `neuesteJeEinheit()` und `revisionen()` aus `einsaetze.ts` werden unverändert übernommen, inkl. der Ordnung `istNeuer()` (erst `stand`, dann `empfangenAm`).

**Anhang**
```
id: Id                               // = sha256 des Inhalts (NAS §11 attachments/<sha256>.<ext>)
einsatzId: Id
einheitId?: Id
dateiname: string                    // ursprüngliche EEB-ID der Excel (Spalte AB)
mimeTyp: string                      // pdf, docx, png, jpg, odt, svg, webp, avif, heic (EXH F-D1)
groesse: int
hinzugefuegtAm: Zeitpunkt
```

**EinheitVorlage** (Kopiervorlagen, EXH F-J1/F-J2)
```
id: Id
katalog: 'THW_STAN' | 'FEUERWEHR' | 'KATS_STAN_NDS'
katalogVersion: string               // Vorlagen sind pflegbar/versioniert (F-J2)
organisation: Organisation
bezeichnung: string                  // "FGr K (A)"
kurz?: string; lang?: string         // AküLi-Auflösung
ebene: TaktischeEbene
sollStaerke?: { fuehrer: int; unterfuehrer: int; mannschaft: int }   // aus v1 STAN-Daten
fahrzeuge: { typ: VokabularWert; anzahl: int }[]
teilVon?: Id                         // Zug → seine Trupps/Gruppen (Excel: Zugblöcke)
```

**VokabularEintrag** (EEB-Vokabulare + AküLi, EXD §6)
```
namensraum: string                   // "E" Einheitstyp | "F" Funktion | "V" Fahrzeug | "K" Funkkennwort | "H<org>" Ebene
organisation?: Organisation          // null = organisationsübergreifend (AküLi-Rest)
code: int                            // EEB-Code; append-only, nie umdeuten
kurz: string                         // "FGr K (A)", "GW-L2 SW"
lang: string                         // "Fachgruppe Kommunikation (A)", "Gerätewagen Logistik 2 Schlauch"
```

**EtbEintrag**
```
id: Id
einsatzId: Id
zeitpunkt: Zeitpunkt
akteur: { benutzer: string; host: string }
art: 'EREIGNIS' | 'FREITEXT'
ereignisId?: Id                      // bei art=EREIGNIS: Rückverweis in den Ereignisstrom
text: string                         // bei EREIGNIS: generierter Satz; bei FREITEXT: getippt
bezug?: { entitaet: 'EINHEIT'|'ABSCHNITT'|'FAHRZEUG'|'ANFORDERUNG'; id: Id }
```

**Benutzer** (aus v1, unverändert bis auf §6 Frage 9)
```
id: Id; name: string; rolle: 'ADMIN'|'S1'|'FUE_ASS'|'VIEWER'; aktiv: bool
```

### 3.3 Abgeleitete Kennzahlen mit Formel

Mengen: `E` = Einheiten des Einsatzes ohne Abschnittstyp `ARCHIV`; `E_A` = Einheiten im Abschnitt `A`; `E*` = Einheiten in Abschnitten mit `zaehltInGesamtstaerke = true` (also ohne `ANGEFORDERT`, `ARCHIV`); `P_e` = Personen der Einheit `e`. Excel-Referenzen aus EXD §10.

| Nr. | Kennzahl | Formel | Excel-Ursprung |
|---|---|---|---|
| K1 | `einheit.gesamtstaerke` | `fuehrer + unterfuehrer + mannschaft` | AM `=SUM(AJ:AL)` |
| K2 | `abschnitt.staerke` | `Σ_{e∈E_A} (fuehrer, unterfuehrer, mannschaft)` je Rolle | Kopfzeilen `=SUM(AJx:AJy)` |
| K3 | `einsatz.gesamtstaerke` | `Σ_{e∈E*}` je Rolle; `ANGEFORDERT` separat ausweisen | Zeile 5 (32 Summanden), Druck!K6 |
| K4 | `einheit.logistik` | `logistikOverride.x ?? Zählung über P_e` — `weiblich=\|{p: geschlecht=WEIBLICH}\|`, `divers` analog, `vegetarisch=\|{p: ernaehrung=VEGETARISCH}\|`, `vegan` analog | AC–AF, EEB `unterbringungMWD()`/`verpflegung()` |
| K5 | `einheit.maennlich` | `gesamtstaerke − weiblich − divers` | Log!I7 `=H−J−K` |
| K6 | `einheit.uebernachtung(m/w/d)` | `sofortbedarf.unterbringung ? (m,w,d aus K4) : (0,0,0)`; Override sticht | AG–AI + EEB-Regel `oldenburg-xlsx.ts` |
| K7 | `abschnitt.imDruckSichtbar` | `abschnitt.staerke.gesamt > 0 ∧ typ.erscheintImDruck` | t_druck `Worksheet_Activate` |
| K8 | `druck.plausibilitaet` | `Σ(Fü) + Σ(UFü) + Σ(He) − Σ(Gesamt) = 0` → „o.k."/„Fehler" | Druck!`E+G+I−K` |
| K9 | `einheit.erreichbarkeit` | `erreichbarkeitOverride ?? [fuehrungskraft.name, …fuehrungskraft.kontakte] ?? [hierarchie[0].telefon, hierarchie[0].email]`, getrennt durch „ / " | EEB `erreichbarkeitText()` |
| K10 | `einheit.geraeteText` (Excel-Spalte J) | Fahrzeuge nach `typ` gruppieren, `n>1 → "n× <lang>"`, verbunden mit „,\n" | EEB `geraeteText()` |
| K11 | `einheit.auftragsText` (Excel-Spalte K) | Aufträge chronologisch als „`von`–`bis`; `abschnitt.name`; `text`", je Zeile eine | Excel-Freitextkonvention (EXD §9) |
| K12 | Excel-Spalten N–S beim Export | aus der **jüngsten Anforderung** mit `zustand ≠ STORNIERT`, in der die Einheit `abzuloesendeEinheitId` ist | – |
| K13 | `einheit.psaKostenProTag` | `gesamtstaerke × psaSaetzeProTag × einsatz.kosten.psaKostenProSatz` | AN/AP/AR |
| K14 | `einheit.vdaUkProTag` | `(vdaProTag + ukVerpflegungProTag) × gesamtstaerke` | AU |
| K15 | `einheit.personentage` | `geplanteEinsatztage × gesamtstaerke` | AV (Spaltenname irreführend, §1.13) |
| K16 | `einheit.gesamtkosten` | `(psaKostenProTag + vdaUkProTag) × geplanteEinsatztage`; `0` bei `gesamtstaerke = 0` | AW `=IFERROR((AR+AU)*AV/AM,0)` |
| K17 | FüSt-Projektion | je `teileinheit × schicht`: eine virtuelle Einheit im Abschnitt `FUEHRUNGSSTELLE` mit `staerke = Σ dienstposten.besetzung` | FüSt!D8/D9 + Stärke!AJ7:AL16 `=FüSt!D8:F8` |
| K18 | Ablaufwarnung Verfügbarkeit | `heute ≥ verfuegbarBis − 1 Tag` → Warnfarbe | Bedingte Formatierung Spalte M |
| K19 | Matrix Organisation × Kennzahl | `Σ_{e∈E*, e.organisation=o}` je Rolle/Logistikwert | Status!D7..J18 `SUMIF` |
| K20 | Matrix Status × Kennzahl | `Σ_{e∈E*, e.status=s}` | Status!D25..J33 |
| K21 | Konsistenz Status | `Σ_Status − Σ_Organisation = 0`, sonst „Einheiten ohne Statusangabe oder Organisation" | Status!J35−J20 |
| K22 | Matrix Schicht × Kennzahl | `Σ_{e∈E*, e.schicht=s}` | Status!D38..J41 |
| K23 | Konsistenz Schicht | `Σ_Schicht − Σ_Organisation + Σ_ANGEFORDERT = 0` | Status!J42 |
| K24 | Abschnitt × Schicht | `Σ_{e∈E_A, e.schicht=s}` je Rolle | Log!D..G `SUMIFS` |
| K25 | Einheiten ohne Pflichtangabe | `{e ∈ E* : status = null ∨ organisation = null ∨ (schicht = null ∧ abschnitt.typ ≠ ANGEFORDERT)}` | Status!G36/G43 |
| K26 | `meldung.istRevisionskopf` | `neuesteJeEinheit()`: max nach (`stand`, dann `empfangenAm`) je `einheitSchluessel` | EEB `istNeuer()` |
| K27 | Meldekopf-Eingang | `{m : uebernahmeZustand ∈ {NEU, GEAENDERT}}`, sortiert nach `empfangenAm` | EXH F-E1 (gelb/grün) |
| K28 | `einheit.anzeigename` | `bezeichnung` + (`teilEtikett` ? ` (${teilEtikett})` : ``) | EEB `zeileFuer()` |
| K29 | Excel-Spalte E „Herkunft" | `[art(hierarchie[0]), hierarchie[0].name, "(kurz)"]` verbunden mit Leerzeichen | EEB `herkunftText()` |
| K30 | Excel-Spalte W „Bemerkung" | `[art=UEBUNG ? "ÜBUNG" : "", bemerkung]` verbunden mit „ — " | EEB `zeileFuer()` |

Zwei Regeln, die aus diesen Formeln folgen und in den Implementierungsberichten landen müssen:
- **Keine Kennzahl wird gespeichert.** v1 speichert `aktuelleStaerke` neben `aktuelleStaerkeTaktisch` und muss beide bei jedem Schreibzugriff gegeneinander validieren (`tactical-strength.ts:46-57`). In einem verteilten Ereignismodell ist jede redundante Speicherung eine potenzielle Divergenz zwischen Clients.
- **Der Unterschied „zählt / zählt nicht" ist Typattribut, nicht Sonderfall** (§2.4). Sonst wandert `if (abschnitt.name === 'Angefordert')` in zwanzig Auswertungen.

---

## 4. Ereignis-Katalog (stack-neutral)

Dieser Katalog ist die Antwort auf NAS §10 Restrisiko 1: „Event-Katalog als Spezifikation **vor** der Implementierung". Er ist bewusst so formuliert, dass er zu allen drei Architekturvorschlägen passt — er sagt **was** passiert und **wie Konflikte aufgelöst werden**, nicht wo die Datei liegt oder in welcher Sprache gefaltet wird. Wer sich für ein Nicht-Ereignis-Modell entscheidet (bmecat §8.0: Lockfile + optimistische Konflikterkennung), liest denselben Katalog als Liste der **Schreibbefehle mit ihren Vorbedingungen** — die Konfliktregeln gelten dann für die Konflikterkennung statt für den Fold.

### 4.1 Rahmen: Ereignisform, Identität, Ordnung

Hülle je Ereignis (NAS §11 gibt das Zeilenformat vor; hier die fachlichen Felder):
```
id        : "<clientId>:<laufnummer>"     // global eindeutig ohne Koordination
hlc       : Hybrid Logical Clock          // Ordnung; nicht die Wanduhr
wall      : Zeitpunkt mit Zonenversatz    // Anzeige, ETB, Plausibilität
actor     : { benutzer, host, clientId }
typ       : string                        // aus §4.2
v         : int                           // Schemaversion DIESES Ereignistyps
payload   : {...}                         // typabhängig
undoOf    : Id | null                     // Kompensationsereignis, §4.3
grund     : string | null                 // Freitext, geht in den ETB
```

Fünf Regeln, die für **jeden** Typ gelten:

1. **Ordnung.** Alles wird nach `hlc` gefaltet, nie nach `wall`. Die Uhren der FüSt-Rechner sind im Einsatznetz nicht garantiert synchron (reale Betriebsparameter unbekannt, KRI §3.7).
2. **Idempotenz.** Ein Ereignis mit bereits gefalteter `id` wird verworfen. Zusätzlich haben zwei Typen einen fachlichen Idempotenzschlüssel: `EebMeldungEmpfangen` (Inhalts-Hash, EEB `bogenInhaltsId()`) und `AnhangHinzugefuegt` (sha256).
3. **Vorher-Werte.** Jedes Ereignis, das ein Feld setzt, trägt neben `neu` auch `vorher` (den Wert, den der schreibende Client gesehen hat). Das kostet Bytes und liefert dafür drei Dinge: lesbare ETB-Sätze („Stärke von 0/3/17 auf 0/2/17"), erkennbare Konflikte („`vorher` passt nicht zum gefalteten Zustand" → Hinweis im UI) und triviale Kompensation (§4.3).
4. **Unbekannte Typen werden durchgereicht, nicht verworfen** (NAS §10 Restrisiko 3). Ein Client, der `typ` nicht kennt, faltet ihn nicht, zeigt aber im ETB „unbekanntes Ereignis (Typ X, Version Y) von <Akteur>" und schreibt ihn beim Spiegeln unverändert weiter.
5. **Nach `EinsatzArchiviert` werden neue Ereignisse nicht mehr gefaltet**, sondern als Konflikthinweis angezeigt (NAS §11 `archive.marker`).

Legende der Konfliktspalte in §4.2:
- **LWW/Feld** – Last-Writer-Wins je Einzelfeld nach `hlc`; zwei Clients, die verschiedene Felder derselben Einheit ändern, verlieren nichts.
- **LWW/Entität** – der gesamte Datensatz gewinnt oder verliert am Stück (nur wo Feldunabhängigkeit fachlich falsch wäre).
- **additiv** – Ereignisse akkumulieren, Reihenfolge egal (kommutativ).
- **Regel** – fachliche Auflösung, im Text beschrieben.

### 4.2 Katalog der Ereignistypen

#### Einsatz

| Typ | Payload | Undo | Konfliktregel |
|---|---|---|---|
| `EinsatzAngelegt` | `{einsatzId, name, art, fuestName, uebergeordneteFuestName?, beginn, schichtmodell, schemaVersion}` | nein (Anlage ist der Ursprung) | erstes Ereignis der Akte; ein zweites wird verworfen |
| `EinsatzStammdatenGeaendert` | `{feld, vorher, neu}` für `name`/`art`/`fuestName`/`uebergeordneteFuestName`/`ort`/`schichtmodell` | ja (Gegen-Set) | LWW/Feld |
| `KostenParameterGeaendert` | `{feld, vorher, neu}` für die vier Parameter | ja | LWW/Feld |
| `EinsatzBeendet` | `{ende}` | ja (`EinsatzWiedereroeffnet` als `undoOf`) | LWW/Entität |
| `EinsatzArchiviert` | `{zeitpunkt, snapshotHash}` | **nein** | **Regel:** Barriere. Nach dem ersten `EinsatzArchiviert` (kleinste `hlc`) werden alle späteren Ereignisse nicht mehr gefaltet, sondern als „nach Archivierung eingegangen" im ETB gelistet. Zwei gleichzeitige Archivierungen: die mit kleinerer `hlc` gilt, die zweite ist ein No-op. |

#### Abschnitt

| Typ | Payload | Undo | Konfliktregel |
|---|---|---|---|
| `AbschnittAngelegt` | `{abschnittId, name, typ, parentId?, reihenfolge}` | ja → `AbschnittAufgeloest` | additiv (eindeutige Id) |
| `AbschnittUmbenannt` | `{abschnittId, vorher, neu}` | ja | LWW/Feld |
| `AbschnittTypGeaendert` | `{abschnittId, vorher, neu}` | ja | LWW/Feld. **Achtung:** ändert Zählregeln rückwirkend für alle Auswertungen — deshalb Pflicht-`grund` und ETB-Eintrag. |
| `AbschnittUmgehaengt` | `{abschnittId, vorherParentId, neuParentId}` | ja | **Regel:** LWW/Feld, danach Zyklusprüfung. Entsteht durch nebenläufiges Umhängen ein Zyklus, wird die Kante mit der **größeren** `hlc` gelöst: der betroffene Abschnitt wird an die Wurzel gehängt und ein Konflikthinweis erzeugt. (Deterministisch, weil `hlc` total geordnet ist.) |
| `AbschnittUmsortiert` | `{abschnittId, vorher, neu}` (reihenfolge) | ja | LWW/Feld; gleiche Werte sind zulässig, Sekundärsortierung nach `abschnittId` |
| `AbschnittAufgeloest` | `{abschnittId, zielAbschnittId}` (wohin die verbliebenen Einheiten wandern) | ja → `AbschnittWiederhergestellt` | **Regel:** gewinnt gegen nebenläufiges `EinheitVerschoben` **in** diesen Abschnitt: die Einheit landet in `zielAbschnittId`, mit Konflikthinweis. Begründung: eine Einheit darf nie in einem nicht existierenden Abschnitt hängen. |

#### Einheit

| Typ | Payload | Undo | Konfliktregel |
|---|---|---|---|
| `EinheitGemeldet` (Anlage) | `{einheitId, abschnittId, bezeichnung, organisation, organisationName?, hierarchie[], standortRef?, ebene, staerke{f,uf,m}, personalErfassung, status, schicht?, vorlageId?, meldungId?}` | ja → `EinheitEntfernt` | additiv (eindeutige Id). Doppelmeldung derselben realen Einheit ist **kein** technischer Konflikt, sondern ein fachlicher: Erkennung über `einheitSchluessel` → Hinweis „mögliche Dublette", Auflösung durch `EinheitZusammengefuehrt`. |
| `EinheitStammdatenGeaendert` | `{einheitId, feld, vorher, neu}` für `bezeichnung`/`organisation`/`organisationName`/`hierarchie`/`ebene`/`fuestKennung`/`bemerkung`/`teilEtikett`/`fuehrungskraft`/`erreichbarkeitOverride`/`taktischesZeichen`/`istFuehrungDesAbschnitts` | ja | LWW/Feld. `hierarchie` und `fuehrungskraft` sind Teilstrukturen und werden **als Ganzes** ersetzt (LWW/Entität innerhalb des Feldes) — Feld-Merge über verschachtelte Listen wäre nicht deterministisch begründbar. |
| `StaerkeGeaendert` | `{einheitId, vorher{f,uf,m}, neu{f,uf,m}}` | ja | **LWW/Entität über das Tripel**, nicht je Rolle. Begründung: die drei Zahlen sind eine Meldung („0/3/17"), keine unabhängigen Felder; ein Merge aus zwei Meldungen (Fü von A, He von B) ergäbe eine Stärke, die nie jemand gemeldet hat. Passt `vorher` nicht zum gefalteten Zustand → Konflikthinweis mit beiden Werten, LWW gilt trotzdem. |
| `StatusGesetzt` | `{einheitId, vorher, neu}` | ja | LWW/Feld |
| `SchichtGesetzt` | `{einheitId, vorher, neu}` | ja | LWW/Feld |
| `ZeitpunktGesetzt` | `{einheitId, feld ∈ {eingetroffenAm, verfuegbarBis, einsatzendeAm, rueckfuehrungAm}, vorher, neu}` | ja | LWW/Feld |
| `EinheitVerschoben` | `{einheitId, vonAbschnittId, nachAbschnittId, kommentar?}` | ja (Gegen-Verschiebung mit `undoOf`) | **Regel:** LWW/Feld auf `abschnittId`; existiert `nachAbschnittId` nicht (mehr), greift die Regel von `AbschnittAufgeloest`. Erzeugt zusätzlich automatisch einen `Auftrag` mit `quelle=BEWEGUNG` (K11) und einen ETB-Eintrag. |
| `EinheitUmsortiert` | `{einheitId, abschnittId, vorher, neu}` | ja | LWW/Feld; Sekundärsortierung nach `einheitId` |
| `LogistikGesetzt` | `{einheitId, feld ∈ logistikOverride, vorher, neu}` | ja | LWW/Feld. `null` als `neu` bedeutet „Override aufheben, wieder ableiten". |
| `SofortbedarfGesetzt` | `{einheitId, vorher{…}, neu{…}}` | ja | LWW/Entität (kommt als Block aus dem EEB) |
| `PsaBedarfGesetzt` | `{einheitId, vorher, neu}` | ja | LWW/Feld |
| `EinheitAufgeteilt` | `{quellEinheitId, neueEinheitId, teilEtikett, abgeteilteStaerke{f,uf,m}, abschnittId, uebernommeneFahrzeugIds[], uebernommenePersonIds[]}` | ja → `EinheitZusammengefuehrt` mit `undoOf` | **Regel:** die Quellstärke wird **relativ** reduziert (`quelle.staerke −= abgeteilteStaerke`), nicht absolut gesetzt. Damit bleiben zwei nebenläufige Aufteilungen derselben Einheit korrekt (beide Teile entstehen, Quelle sinkt zweimal). Wird die Quellstärke dabei negativ, wird auf 0 geklemmt und ein Konflikthinweis erzeugt. v1 setzt hier absolut (`einheit.ts:191-193`) und wäre nebenläufig falsch. |
| `EinheitZusammengefuehrt` | `{zielEinheitId, quellEinheitIds[], uebernommeneStaerke{f,uf,m}}` | ja → `EinheitAufgeteilt` mit `undoOf` | **Regel:** additiv auf der Zielstärke; die Quellen erhalten `meldeZustand = AUFGEGANGEN` und zählen nicht mehr. Wird eine Quelle nebenläufig verschoben, gewinnt die Zusammenführung (die Einheit existiert als eigenständige nicht mehr). Doppelte Zusammenführung derselben Quelle ist ein No-op (Quelle ist schon aufgegangen). |
| `EinheitArchiviert` | `{einheitId, vonAbschnittId, einsatzendeAm?}` | ja | Sonderfall von `EinheitVerschoben` in den `ARCHIV`-Abschnitt; gleiche Regel |
| `EinheitEntfernt` | `{einheitId, grund}` | ja → `EinheitWiederhergestellt` | **Regel:** kein Hard Delete. Die Einheit wird als `entfernt` markiert und aus allen Summen genommen, bleibt aber in ETB und Historie (EXH N-6, F-E2). Gewinnt gegen alle nebenläufigen Feldänderungen (die werden gefaltet, aber die Einheit zählt nicht). |

#### Fahrzeug und Person

| Typ | Payload | Undo | Konfliktregel |
|---|---|---|---|
| `FahrzeugAngelegt` | `{fahrzeugId, einheitId?, typ, bezeichnung?, kennzeichen?, funkrufname?, stanKonform?, aenderungen?, nutzlast?}` | ja → `FahrzeugEntfernt` | additiv |
| `FahrzeugGeaendert` | `{fahrzeugId, feld, vorher, neu}` | ja | LWW/Feld |
| `FahrzeugVerschoben` | `{fahrzeugId, vonAbschnittId?, nachAbschnittId?}` | ja | wie `EinheitVerschoben` |
| `FahrzeugEinheitGewechselt` | `{fahrzeugId, vorherEinheitId?, neuEinheitId?}` | ja | LWW/Feld |
| `FahrzeugEntfernt` | `{fahrzeugId, grund}` | ja | wie `EinheitEntfernt` |
| `PersonHinzugefuegt` | `{personId, einheitId, nachname, vorname, rolle, funktionen[], fahrerlaubnisse[], geschlecht, ernaehrung, kontakte[], zusatzqualifikationen[]}` | ja → `PersonEntfernt` | additiv |
| `PersonGeaendert` | `{personId, feld, vorher, neu}` | ja | LWW/Feld |
| `PersonEntfernt` | `{personId, grund}` | ja | LWW/Entität |

#### Auftrag und Anforderung

| Typ | Payload | Undo | Konfliktregel |
|---|---|---|---|
| `AuftragErfasst` | `{auftragId, einheitId, von, bis?, abschnittId?, text, quelle}` | ja → `AuftragZurueckgenommen` | additiv |
| `AuftragBeendet` | `{auftragId, bis}` | ja | LWW/Feld |
| `AnforderungAngelegt` | `{anforderungId, kennung?, abzuloesendeEinheitId?, vorgeseheneEinheitText?, vorgesehenerAuftrag?, angefordertAm}` | ja → `AnforderungStorniert` | additiv |
| `AbloesungZugesagt` | `{anforderungId, zugesagtFuer, zugesagtVon, abloesendeEinheitId?}` | ja (Gegen-Set auf `zustand=OFFEN`) | **Regel:** LWW/Feld auf den Zusagefeldern; setzt `zustand` auf `ZUGESAGT`, **aber nur wenn** der gefaltete Zustand `OFFEN` ist. Ist er bereits `EINGETROFFEN`, wird die Zusage gefaltet, `zustand` bleibt jedoch `EINGETROFFEN` (Zustandsmaschine, kein LWW auf dem Zustand). |
| `AnforderungErledigt` | `{anforderungId, abloesendeEinheitId, erledigtAm}` | ja | Zustandsmaschine `OFFEN\|ZUGESAGT → EINGETROFFEN`; monoton, spätere `AbloesungZugesagt` ändert den Zustand nicht mehr |
| `AnforderungStorniert` | `{anforderungId, grund}` | ja | terminal; gewinnt gegen `AbloesungZugesagt`, verliert gegen `AnforderungErledigt` (was eingetroffen ist, ist eingetroffen) |

#### Führungsstelle (Personal und Schichtplan)

| Typ | Payload | Undo | Konfliktregel |
|---|---|---|---|
| `DienstpostenAngelegt` | `{dienstpostenId, teileinheit, funktion, schicht, reihenfolge}` | ja → `DienstpostenEntfernt` | additiv |
| `DienstpostenGeaendert` | `{dienstpostenId, feld, vorher, neu}` | ja | LWW/Feld |
| `DienstpostenBesetzt` | `{dienstpostenId, vorher{f,uf,m}, neu{f,uf,m}}` | ja | LWW/Entität über das Tripel (wie `StaerkeGeaendert`) |
| `DienstpostenEntfernt` | `{dienstpostenId}` | ja | LWW/Entität |
| `SchichtplanEintragGesetzt` | `{dienstpostenId, datum, vorher, neu}` | ja | LWW/Feld, Schlüssel = (`dienstpostenId`, `datum`) |

#### EEB-Meldungen und Anhänge

| Typ | Payload | Undo | Konfliktregel |
|---|---|---|---|
| `EebMeldungEmpfangen` | `{meldungId (=Inhalts-Hash), einheitSchluessel, stand, empfangenAm, quelle, signatur?, rohPayload?, bogen}` | **nein** | **Regel:** idempotent über `meldungId`. Zwei Clients, die denselben QR scannen, erzeugen dieselbe Id → eine Meldung. Der Empfang ist eine Tatsache und wird nie zurückgenommen (EXH F-E2). |
| `EebMeldungZugeordnet` | `{meldungId, einheitSchluessel}` (manuelle Korrektur der Fingerabdruck-Zuordnung) | ja | LWW/Feld. Der Fingerabdruck ist ausdrücklich Heuristik („von der App VORGESCHLAGEN, vom Menschen bestätigt", `einsaetze.ts`). |
| `EebMeldungUebernommen` | `{meldungId, einheitId, uebernommeneFelder[]}` | ja → `EebMeldungUebernahmeZurueckgenommen` | **Regel:** setzt `uebernahmeZustand = UEBERNOMMEN` und erzeugt **zusätzlich** die eigentlichen Feldereignisse (`StaerkeGeaendert`, `LogistikGesetzt`, …) als separate Ereignisse mit `grund = "EEB <meldungId>"`. Damit gelten dort die normalen Konfliktregeln, und die Übernahme ist im ETB als solche erkennbar. |
| `EebMeldungAbgelehnt` | `{meldungId, grund}` | ja | LWW/Feld auf `uebernahmeZustand` |
| `EebMeldeStatusGesetzt` | `{meldungId, vorher, neu}` (ANWESEND/ABGERUECKT/AUFGEGANGEN) | ja | LWW/Feld |
| `AnhangHinzugefuegt` | `{anhangId (=sha256), einheitId?, dateiname, mimeTyp, groesse}` | ja → `AnhangEntfernt` (nur Verweis, Datei bleibt) | idempotent über `anhangId` |

#### Einsatztagebuch und Korrekturen

| Typ | Payload | Undo | Konfliktregel |
|---|---|---|---|
| `EtbEintragErfasst` | `{etbId, text, bezug?}` | **nein** (siehe §4.3) | additiv; unveränderlich |
| `EtbEintragBerichtigt` | `{etbId, berichtigtEintragId, text, grund}` | nein | additiv; die alte Zeile bleibt sichtbar, die Berichtigung steht daneben (ETB-Praxis) |
| `KorrekturVon` | `{korrigiertesEreignisId, grund}` + der korrigierte Sachverhalt als eingebettete Payload des Zieltyps | nein | **Regel:** siehe §4.3 |

### 4.3 Undo-Semantik

Ausgangslage: EXH F-L2 fordert echtes Undo („ein Nachfolger sollte echtes Undo/Änderungsprotokoll bieten"), die Excel hat keins, v1 hat es nur für MOVE und ohne Bedienelement (KRI §3.3). In einem Append-only-Protokoll (NAS §11 „Nur Create-New und Append") ist Löschen oder Umschreiben ausgeschlossen. Daraus folgt:

**Regel U1 – Undo ist immer ein neues Ereignis (Kompensation).** Es trägt `undoOf = <id des rückgängig gemachten Ereignisses>` und die Payload, die den vorherigen Zustand wiederherstellt (aus dem `vorher`-Feld des Originals, Regel 3 in §4.1). Der Fold behandelt es wie ein normales Ereignis — kein Sonderpfad, keine Rückwärtslogik.

**Regel U2 – Was rückgängig gemacht werden kann, ist typabhängig, nicht global.** Drei Klassen:

| Klasse | Typen | Verhalten |
|---|---|---|
| **frei rückgängig** | alle Feldänderungen, Verschiebungen, Anlagen, Zusagen | Kompensation setzt den vorherigen Wert bzw. entfernt die angelegte Entität |
| **strukturell rückgängig** | `EinheitAufgeteilt` ↔ `EinheitZusammengefuehrt`, `AbschnittAngelegt` ↔ `AbschnittAufgeloest` | die Kompensation ist der **inverse Fachvorgang**, nicht ein technisches Zurückrollen. Sie ist im ETB als Rücknahme markiert (`undoOf`), aber fachlich eine echte Handlung. |
| **nicht rückgängig** | `EinsatzAngelegt`, `EinsatzArchiviert`, `EebMeldungEmpfangen`, `EtbEintragErfasst`, `KorrekturVon` | Tatsachen bzw. Barrieren. Statt Undo gibt es `KorrekturVon` (U4) bzw. bei ETB die `EtbEintragBerichtigt`-Zeile. |

**Regel U3 – Undo ist ein Stapel je Client, keine globale Zeitreise.** „Letzte Aktion rückgängig" bedeutet: das letzte **eigene** Ereignis dieses Clients, das nicht bereits kompensiert wurde. Begründung: Bei 2–4 gleichzeitigen Bearbeitern ist ein globales Undo für den Bediener nicht vorhersagbar („Wessen Aktion war die letzte?"). v1 macht es global (`command:undo-last`) — und hat dafür konsequenterweise kein Bedienelement gebaut.

**Regel U4 – `KorrekturVon` ist das Werkzeug für „das war fachlich falsch, nicht nur versehentlich".** Beispiel: Eine Meldung wurde der falschen Einheit zugeordnet und ist bereits in Summen und Ausdrucken eingegangen. `KorrekturVon` trägt den korrigierten Sachverhalt und die Begründung; im ETB erscheinen **beide** Zeilen (der Irrtum und die Korrektur), weil das Tagebuch die Lage dokumentiert, wie sie geführt wurde, nicht wie sie im Rückblick hätte sein sollen. Das ist der Unterschied zu U1: Undo tut so, als wäre nichts gewesen; Korrektur sagt, dass etwas war.

**Regel U5 – Redo gibt es nicht.** Ein kompensiertes Ereignis wird durch erneutes Ausführen der Handlung wiederhergestellt (neues Ereignis, kein `undoOf`). Ein Redo-Stapel über nebenläufige Ereignisse ist nicht deterministisch definierbar und in der Lageführung auch nicht gefragt.

**Regel U6 – Konflikt zwischen Undo und Fremdänderung.** Kompensiert Client A ein Ereignis, das Client B zwischenzeitlich überschrieben hat (`vorher` des Undo passt nicht zum gefalteten Zustand), gilt weiterhin LWW nach `hlc` — die Kompensation gewinnt, wenn sie später ist. Zusätzlich erscheint ein Konflikthinweis, weil das der Fall ist, in dem ein Bediener still fremde Arbeit verwirft.

### 4.4 Konfliktregeln – Zusammenfassung und Prüfkriterien

Verteilung über den Katalog: **LWW/Feld** für 24 Typen (alle skalaren Attribute), **LWW/Entität** für 6 (Stärke-Tripel, Dienstpostenbesetzung, Sofortbedarf, Person entfernt, Einsatz beendet, verschachtelte Teilstrukturen), **additiv** für 9 (Anlagen, ETB, Aufträge), **Regel** für 9 (Abschnitt aufgelöst, Umhängen/Zyklus, Aufteilen, Zusammenführen, Entfernen, Archivierungs-Barriere, Anforderungs-Zustandsmaschine, EEB-Idempotenz, EEB-Übernahme).

Warum nicht überall LWW: Drei Stellen, an denen LWW nachweislich falsche Zustände erzeugt und deshalb eine Fachregel steht —
1. **Stärke.** Feldweises LWW mischt zwei Meldungen zu einer dritten, die niemand gemeldet hat.
2. **Aufteilen.** Absolutes Setzen der Quellstärke (wie v1 es tut) verliert bei zwei nebenläufigen Aufteilungen einen Teil.
3. **Aufgelöster Abschnitt.** Feldweises LWW auf `abschnittId` kann eine Einheit in einen Abschnitt legen, den es nicht mehr gibt.

Prüfkriterien, die aus diesem Katalog direkt Tests werden (NAS §10 Restrisiko 1 fordert Property-Tests):
- **P1 Kommutativität:** Für jede Permutation einer Ereignismenge ergibt der Fold denselben Zustand. Gilt für alle Typen außer denen mit „Regel" — dort gilt P1 ebenfalls, weil jede Regel ausschließlich auf `hlc`-Ordnung und gefaltetem Zustand entscheidet, nie auf Ankunftsreihenfolge.
- **P2 Idempotenz:** Doppelt gefaltete Ereignisse ändern den Zustand nicht.
- **P3 Konvergenz:** Zwei Clients mit derselben Ereignismenge haben denselben Zustand — inklusive der Konflikthinweise (die sind Teil des Zustands, nicht der UI).
- **P4 Summenerhaltung:** `EinheitAufgeteilt` + `EinheitZusammengefuehrt` in beliebiger Reihenfolge lassen die Gesamtstärke des Einsatzes unverändert.
- **P5 Kein Waisenzustand:** Keine Einheit verweist nach dem Fold auf einen nicht existierenden oder aufgelösten Abschnitt.
- **P6 Monotone Zustandsmaschine:** `Anforderung.zustand` geht nie von `EINGETROFFEN` zurück.

---

## 5. Migrationsregeln

Alle drei Migrationswege erzeugen **Ereignisse**, keinen Zustand: der Import schreibt `EinsatzAngelegt`, `AbschnittAngelegt`, `EinheitGemeldet` … mit `actor.benutzer = "Import"` und `grund = "Migration aus <Quelle>"`. Damit ist die Herkunft jeder Zeile im ETB sichtbar, und der Import braucht keinen zweiten Schreibpfad. (Wer sich gegen das Ereignismodell entscheidet, liest dieselben Regeln als Zuordnungstabelle.)

### 5.1 v1 `.s1control`-JSON → v2

Quelle: `EinsatzJsonFile` (`json-store/types.ts:130-142`) und `SystemJsonFile` (:193-200).

| v1 | v2 | Regel |
|---|---|---|
| `einsatz.{id,name,fuestName,uebergeordneteFuestName,start,end,status}` | `Einsatz.{id,name,fuestName,uebergeordneteFuestName,beginn,ende,status}` | 1:1. `art = EINSATZ` (v1 kennt keine Übung). `schichtmodell = ZWEI_SCHICHT` [Annahme, Default]. Kostenparameter auf die Excel-Defaults (180/150/20/5). |
| `abschnitte[].{id,name,parentId}` | `Abschnitt.{id,name,parentId}` | 1:1 |
| `abschnitte[].systemTyp` | `Abschnitt.typ` | `FUEST→FUEHRUNGSSTELLE`, `ANFAHRT→ANGEFORDERT`, `LOGISTIK→LOGISTIK`, `BEREITSTELLUNGSRAUM→BEREITSTELLUNGSRAUM`, `NORMAL→EINSATZORT` (§2.4) |
| `abschnitte[].version` | – | **verworfen** (Sperrmechanik, §1.8) |
| – | `Abschnitt.reihenfolge` | aus der Array-Reihenfolge der Datei erzeugt |
| – | Abschnitt `ARCHIV` | wird angelegt, falls nicht vorhanden (Ziel der `ABGEMELDET`-Einheiten) |
| `einheiten[].{id,nameImEinsatz,aktuellerAbschnittId,bemerkung,erreichbarkeiten,erstellt}` | `Einheit.{id,bezeichnung,abschnittId,bemerkung,erreichbarkeitOverride,—}` | `erstellt` wird die `wall` des `EinheitGemeldet`-Ereignisses, nicht `eingetroffenAm` (§1.8) |
| `einheiten[].organisation` | `Einheit.organisation` | §2.1; `MALTESER`**und**`MHD` → `MHD`; `RETTUNGSDIENST_KOMMUNAL` → `RETTUNGSDIENST` |
| `einheiten[].aktuelleStaerkeTaktisch` `"F/UF/M/G"` | `Einheit.staerke` | `parseTaktisch()`-Logik (`tactical-strength.ts:6-21`): bei fehlendem/ungültigem String Fallback `{0, 0, aktuelleStaerke}` — **dieser Fallback muss beim Import einen Konflikthinweis erzeugen**, sonst wandern Führungskräfte still in die Mannschaft |
| `einheiten[].aktuelleStaerke` | – | **verworfen** (abgeleitet, K1); Abweichung zum Tripel wird als Importwarnung protokolliert |
| `einheiten[].status` | `Einheit.status` (+ ggf. Abschnitt) | `AKTIV→IM_EINSATZ`; `IN_BEREITSTELLUNG→EINSATZBEREIT` **und**, falls der Abschnitt nicht schon `BEREITSTELLUNGSRAUM` ist, Konflikthinweis (§2.2 Nr. 3); `ABGEMELDET→` Verschiebung nach `ARCHIV` + `einsatzendeAm = aufgeloest ?? erstellt` |
| `einheiten[].aufgeloest` | `Einheit.einsatzendeAm` | laut KRI §3.1 praktisch nie gesetzt |
| `einheiten[].{ovName,ovTelefon,ovFax,rbName,…,lvFax}` | `Einheit.hierarchie[]` | drei Ebenen erzeugen, unterste zuerst: `[{art:'OV', name:ovName, telefon:ovTelefon}, {art:'RB', name:rbName, …}, {art:'LV', …}]`; leere Ebenen weglassen. **Verlust: `*Fax`** — v2 kennt nur `MOBIL/FESTNETZ/EMAIL` (§2.10). Fax wandert als `FESTNETZ`-Kontakt mit Präfix „Fax: " [Annahme] → §6 Frage 7. |
| `einheiten[].grFuehrerName` | `Einheit.fuehrungskraft.name` | Kontakte leer |
| `einheiten[].vegetarierVorhanden` | – | **Verlust.** Boolean lässt sich nicht in die Anzahl `logistikOverride.vegetarisch` übersetzen. Regel: `true → 1` mit Importwarnung „Anzahl unbekannt, auf 1 gesetzt", `false/null → kein Override` |
| `einheiten[].tacticalSignConfigJson` | `Einheit.taktischesZeichen` | JSON parsen; `typ` nach §2.8 (`platoon/group/squad` → `ZUG/GRUPPE/TRUPP`); `meta.source/confidence/ruleVersion` übernehmen |
| `einheiten[].{stammdatenEinheitId,parentEinsatzEinheitId}` | `Einheit.{vorlageId, abgeteiltVonId}` | 1:1 |
| `einheiten[].version` | – | verworfen |
| – | `Einheit.ebene` | **nicht in v1 vorhanden** außer indirekt über `tacticalSignConfig.typ`; sonst `UNBESTIMMT`, Vorbelegung per EEB-Heuristik `ebeneVon()` aus dem Namen |
| – | `Einheit.schicht` | **fehlt in v1** → leer, Pflichtfeld-Warnung (K25) |
| – | `Einheit.personalErfassung` | `helfer.length > 0 ? VOLLSTAENDIG : NUR_STAERKE` |
| `fahrzeuge[].*` | `Fahrzeug.*` | 1:1 bis auf: `name → bezeichnung` (Vokabularzuordnung als Vorschlag), `funkrufname` (String) → Parseversuch `{kennwort, ort, teile}`, sonst Freitext-Kennwort; `status: AUSSER_BETRIEB → NICHT_EINSATZBEREIT`, `IN_BEREITSTELLUNG → EINSATZBEREIT` (§1.5); `standardPiktogrammKey → taktischesZeichen` |
| `helfer[].{name,funktion,telefon,erreichbarkeit,bemerkung}` | `Person.*` | `name` in Vor-/Nachname trennen (letztes Wort = Nachname [Annahme], bei Misserfolg alles in `nachname`); `telefon`+`erreichbarkeit` → `kontakte[]` |
| `helfer[].rolle` | `Person.rolle` | `HELFER → MANNSCHAFT` (§2.5) |
| `helfer[].geschlecht` | `Person.geschlecht` | 1:1; `DIVERS` kommt in v1 nicht vor |
| `helfer[].vegetarisch` | `Person.ernaehrung` | `true → VEGETARISCH`, `false → FLEISCH`. **Verlust: Vegan ist in v1 nicht darstellbar** |
| `helfer[].anzahl > 1` | – | **Verlust.** Ein v1-„Helfer" kann n Personen meinen. Regel: `anzahl` Personen mit demselben Namen + laufender Nummer erzeugen und Importwarnung; Alternative wäre `personalErfassung = NUR_STAERKE` mit Verlust der Namen → §6 Frage 7 |
| `einheitBewegungen[]` | Ereignisse `EinheitVerschoben` + `Auftrag(quelle=BEWEGUNG)` | chronologisch nach `zeitpunkt`; `benutzer` → `actor.benutzer` |
| `fahrzeugBewegungen[]` | Ereignisse `FahrzeugVerschoben` | dito |
| `staerkeLog[]` | Ereignisse `StaerkeGeaendert` | `alteStaerke/neueStaerke` sind **Gesamtzahlen**, kein Tripel → `{0,0,n}` mit Importwarnung |
| `commandLog[]` | ETB-Einträge `art=EREIGNIS` | `payloadJson` wird nicht interpretiert, nur als Text protokolliert; `undone=true` → Zeile mit Vermerk „zurückgenommen" |
| `system.stammdatenEinheiten[]` | `EinheitVorlage` (Katalog `THW_STAN`) | `standardStaerke` (eine Zahl) → `sollStaerke = {0,0,n}` mit Warnung; die echten STAN-Tripel kommen aus `thw-stan-2025.generated.json` |
| `system.benutzer[]` | `Benutzer` | 1:1; `passwortHash` → §6 Frage 9 |
| `system.activeClients`, `recordEditLocks`, `writeSeq` | – | **verworfen** (Persistenzmechanik, KRI §3.6 Punkt 1) |
| `system.einsatzListe[]` | Manifest / Einsatzverzeichnis | Pfade werden zu Ordnernamen (NAS §11) |

**Zusammenfassung der Verluste beim v1-Import (7 Punkte):**
1. Vegan-Angaben (v1 kennt nur `vegetarisch: bool`).
2. Divers (v1 `HelferGeschlecht` zweiwertig).
3. Genaue Anzahlen der Logistikwerte (v1 hat nur `vegetarierVorhanden: bool`).
4. Fax-Nummern behalten ihren Typ nicht.
5. `helfer.anzahl > 1` verliert die Individualität (Ersatznamen).
6. `staerkeLog` verliert die Rollenverteilung (nur Gesamtzahlen protokolliert).
7. Bundespolizei ist aus `POLIZEI` nicht rekonstruierbar (§2.1).
Alle sieben sind Felder, die v1 gegenüber Excel und EEB **ohnehin schon verloren** hatte — der Import verliert also nichts, was v1 hatte, sondern legt offen, was v1 nie führte. Praktische Konsequenz: Der Import ist unkritisch, weil v1-Bestand klein ist (Beispiel-`.s1control` 6.762 Bytes / 4 Einheiten, KRI §3.7; reale Größen unbekannt → dieselbe offene Frage wie in KRI Gap 3).

### 5.2 Excel-Mappe → v2

Voraussetzung: es ist ungeklärt, ob überhaupt **gefüllte** Mappen realer Einsätze existieren oder nur die Vorlage (KRI §3.7, letzter Punkt). Die Regeln gelten für beide Fälle; im Vorlagenfall trägt der Import nur Katalog und FüSt-Gerüst.

**(a) Bereiche → Abschnitte.** Die Zeilenblöcke des Blatts Stärke sind über die benannten Bereiche eindeutig identifizierbar (`Führungsstelle`, `Meldekopf_FüSt_BR_1/2`, `Sonstiges_Führung`, `Logistik`, `Angefordert`, `Bereitstellung_1/2`, `Einsatzort_1..21`; EXD §8.1). Regel:

| Benannter Bereich | v2-Abschnitt | Typ |
|---|---|---|
| `Führungsstelle` (Z.6–16) | „Führungsstelle" | `FUEHRUNGSSTELLE` |
| `Meldekopf_FüSt_BR_1`, `_2` (Z.17–18) | je ein Abschnitt mit dem Zellnamen | `MELDEKOPF` |
| `Sonstiges_Führung` (Z.19–20) | „Sonstiges Führung" | `SONSTIGE_FUEHRUNG` |
| `Logistik` (Z.21, 124–136) | „Logistik" | `LOGISTIK` |
| `Angefordert` (Z.138–160) | „Angefordert / Anmarsch" | `ANGEFORDERT` |
| `Bereitstellung_1`, `_2` (Z.162–198) | je einer, Name aus der Kopfzelle | `BEREITSTELLUNGSRAUM` |
| `Einsatzort_1..21` | je einer, Name aus der Kopfzelle B (umbenannt!) | `EINSATZORT` |
| Bereich „Einsatz beendet" (ab Z.431) | „Archiv" | `ARCHIV` |
| Kopiervorlagen (Z.23–122) | **kein Abschnitt** | → `EinheitVorlage` (c) |

`reihenfolge` = Reihenfolge im Blatt. Alle Abschnitte werden Kinder der Wurzel (die Excel hat keine Hierarchie); die EA/UEA-Gliederung baut die FüSt danach von Hand auf.

**(b) Zeilen → Einheiten.** Eine Datenzeile wird importiert, wenn Spalte C (Bezeichnung) **oder** eine der Stärkespalten AJ/AK/AL gefüllt ist. Die Zuordnung Spalte → Feld ist die Tabelle in §1; besondere Regeln:

1. **Leerzeilen und Trennzeilen überspringen** — inklusive der „leeren ersten Datenzeile je Bereich" (Z.125, 139, 163, 187, 200, 211 …), deren Zweck offen ist (EXD §11) → §6 Frage 1.
2. **Spalten F/G/H/I → `ebene`** (§2.8): die *feinste* gefüllte Spalte gewinnt (Person > Gruppe > Trupp/Staffel > Zug); Texte aus den übrigen gefüllten Spalten werden an `bemerkung` angehängt, damit nichts verloren geht.
3. **Spalte E → `hierarchie[0]`**: `{art: 'OV' (bei Organisation THW) bzw. Freitext, name: <Zellwert>}`. Steht ein Kürzel in Klammern („(OODE)"), wird es `kurz`.
4. **Spalte D → Organisation** über §2.1; unbekannter Wert → `SONSTIGE` + `organisationName = <Zellwert>`.
5. **Spalte Z → Status** über §2.2, **inklusive der Kurzformen** „Ruf Bereitsch."/„Einsatzvorbeh." (die in der Vorlage nie gezählt wurden). Leerer Status → Pflichtfeldwarnung, kein Default.
6. **Spalte J → Fahrzeuge**: der mehrzeilige Freitext wird an Zeilenumbrüchen und „,"/„;" getrennt; je Teil Versuch, „n× " abzuspalten und den Rest gegen die Fahrzeug-Vokabulare + AküLi (§3.2 `VokabularEintrag`) aufzulösen; Kennzeichenmuster (`[A-ZÄÖÜ]{1,3}[- ][A-Z]{0,2} ?\d{1,4}`, „THW-84397") werden als `kennzeichen` abgetrennt. Nicht auflösbare Teile → `Fahrzeug.bezeichnung` als Freitext. **Kein Rateverzicht:** die Zuordnung ist Vorschlag, der Import zeigt sie zur Bestätigung.
7. **Spalte K → Aufträge**: je Zeile ein `Auftrag` mit `quelle=MANUELL`; Versuch, führende Zeitangaben („08:30–12:00") in `von`/`bis` zu parsen, sonst alles in `text`.
8. **Spalten AC–AI → `logistikOverride`** (nicht in Personen umrechnen — die Excel hat keine Personendaten).
9. **Spalte AO → `psaSaetzeProTag`**; alle übrigen Kostenspalten (AN, AP, AQ, AR, AS, AT, AU, AV, AW) werden **ignoriert** (abgeleitet, §3.3). Kopfwerte AQ3/AS3/AT3/AV3 → `einsatz.kosten`.
10. **Spalte AB → `Anhang.dateiname`**: der Wert ist ein Dateiname im EEB-Ordner (Startseite!IV11); der Import legt einen `Anhang`-Datensatz an und versucht, die Datei zu finden (Endungen pdf/docx/png/jpg/jpeg/odt/svg/webp/avif/heic, EXH F-D1). Fehlt sie, bleibt der Verweis mit Warnung.
11. **Anforderungen (Spalten N–S):** je Zeile mit mindestens einem gefüllten Feld aus N–S entsteht **eine** `Anforderung` mit `abzuloesendeEinheitId = <diese Einheit>`. Zeilen mit gleicher `kennung` (Spalte O) im Bereich `ANGEFORDERT` werden derselben Anforderung als `abloesendeEinheitId` zugeordnet (EXH F-F3). Ohne Kennung bleibt die Verknüpfung offen (Freitext `vorgeseheneEinheitText`).
12. **Position:** `istFuehrungDesAbschnitts = (erste Datenzeile des Bereichs)` — mit dem Vorbehalt aus §6 Frage 1.

**(c) Kopiervorlagen (Z.23–122) → Vorlagen-Katalog.** Drei Kataloge (EXD §6.3): THW (Z.25–70, ~46 Einträge), Feuerwehr (Z.76–80, 4), KatS Nds (Z.83–121, ~40). Regeln:
- `bezeichnung` aus C, `ebene` aus F/G/H, `fahrzeuge` aus J (wie (b) Nr. 6), `organisation` aus D; **KatS-Nds-Zeilen haben keine Organisationsangabe** → `SONSTIGE` mit `organisationName` aus dem Katalognamen, bis die FüSt zuordnet.
- `sollStaerke` bleibt leer (in der Vorlage alle 0, Hinweise Z.157) und wird für THW aus `thw-stan-2025.generated.json` (v1) nachgetragen — das beantwortet EXD §11 („sollen StAN-Sollstärken hinterlegt werden?").
- Zugblöcke (z. B. „TZ [Zug] mit ZTr TZ, B, N") werden über `teilVon` verkettet, sodass das Kopieren eines Zuges seine Teileinheiten miterzeugt (das leistet die Excel heute nur durch Mehrzeilenauswahl).
- `katalogVersion` = Versionsangabe des Blatts Neu (0.3 / 0.4 / 1.5.0 / 1.5.1, EXH F-J2).

**(d) AküLi (Blatt `AküLi_Tabelle` A1:B111) → Vokabular.** 42 Einheiten + 66 Fahrzeuge/Geräte (EXD §6.1/§6.2) als `VokabularEintrag` mit `organisation = null` (die AküLi ist KatS-Nds/FW-Vokabular, EXD §6.2 Hinweis) und `code = null` (kein EEB-Code). Wo Kurzform **und** Langform mit einem EEB-Vokabulareintrag übereinstimmen, wird der EEB-Code übernommen und der AküLi-Eintrag verworfen (Dublettenvermeidung); der Rest bleibt als organisationsfreier Zusatz.

**(e) FüSt-Blatt → Dienstposten + Schichtplan.**
- Zeilen B10:B139 → `Dienstposten`, `teileinheit` aus dem umgebenden Block (Stab / ZTr FK / FGr F / FGr K / Externe, ablesbar an den Summenzeilen FüSt!D8/D9/D49/D50/D67/D68/D93/D94/D123/D124, EXD §10 Nr. 12), `funktion` aus B, `schicht` aus C, `besetzung` aus D/E/F.
- Spaltenköpfe J7:AS7 → Datumsspalten; Zellen J10:AS139 mit Inhalt → `SchichtplanEintrag {dienstpostenId, datum, text}`.
- **Die Projektion in Stärke Z.7–16 wird NICHT importiert** (sie ist `=FüSt!D8:F8`, also abgeleitet, K17). Würde man beides importieren, stünde die FüSt-Stärke doppelt.

**(f) Was aus der Excel nicht importiert wird:** die Blätter Druck, Status, Log, LogFrei, FüOrg, Auswertung (sämtlich Projektionen, §1.16), die versteckten Zustandszellen Startseite!IV1..IV11 außer IV11 (Konfiguration), die Blätter Hinweise/Neu/AküLi-Formular (Dokumentation → wandert in die Anwendungshilfe, EXH F-L4), alle Formeln und die bedingten Formatierungen (→ Regeln K7/K8/K18/K21/K23).

### 5.3 EEB-QR → v2

Der Import ist zweistufig: **Transport** (QR/Datei → `Erfassungsbogen`) und **Übernahme** (`Erfassungsbogen` → `Einheit`). Beides sind verschiedene Ereignisse (§4.2), und die Trennung ist die wichtigste Regel dieses Abschnitts.

**Stufe 1 – Transport.** Der Referenz-Codec ist vorhandenes, plattformneutrales TypeScript (`src/codec.ts`, 1.043 Zeilen; KRI §3.2 Punkt 1: „läuft in jeder WebView – ein Rust-Port ist für Tauri nicht nötig"). Zu beachten:

1. **Segmentierung ist der Regelfall, nicht der Ausnahmefall.** Von 443 Beispielbögen passen nur 73 in einen QR; Mittel 2,91 Teile (KRI §3.2 Punkt 2, docs/datenmodell.md). Der Sammel-Scan (`segmentSammeln`, `segmenteZuBogen`) ist **Pflichtfunktion**, kein Komfort. Kopf: `EEBS.<teilNr>.<anzahl>.<id>.B.<Base41>`; `id` = FNV-1a-32 über den gesamten Payload, bindet die Teile aneinander und prüft nach dem Zusammensetzen.
2. **Fortschrittsanzeige beim Scannen** („Teil 1 von 3"), Duplikate ignorieren, fremde/unsegmentierte Codes sofort separat behandeln.
3. **Magic-Reihenfolge:** erst 5 Bytes `EEB2C` prüfen, dann 4 Bytes `EEB2` — sonst wird ein signierter Bogen als unsignierter fehlinterpretiert.
4. **Signaturprüfung blockiert den Import nie** (docs/datenmodell.md). Ergebnis ist ein Anzeigehinweis; maßgeblich ist die **letzte** Stufe. `EebMeldung.signatur` speichert Zustand, Pubkey, Kurzform und die Absenderkarte (nur bei gültiger Signatur, weil sie sonst wertlos wäre).
5. **`rohPayload` (Base64url) aufbewahren.** Nur die Rohbytes tragen die fremden Signaturen; ohne sie kann die FüSt einen Bogen beim Weiterreichen nicht gegenzeichnen, und die Herkunft bricht nach dem ersten Meldeschritt ab. Das betrifft S1-Control direkt, sobald die FüSt Meldungen an eine übergeordnete Stelle weitergibt.
6. **Schema-Migration beim Empfang:** `migriereBogen()` hebt alte Bögen (Schema 2..8); insbesondere ist `stand` vor Schema 7 ein Tageszähler und wird auf Mitternacht gehoben. Der Import muss diese Funktion nutzen, nicht selbst rechnen.
7. **Eingangsscanner ohne Kamera:** die Excel arbeitet mit USB-Handscanner in Tastatur-Emulation (KRI §3.5) — v2 muss den Bogen also auch aus einem in ein Textfeld getippten/„getasteten" URL-Fragment lesen können, nicht nur aus der Kamera.

**Stufe 2 – Zuordnung und Übernahme.**

| Schritt | Regel | Quelle |
|---|---|---|
| Dedupe | `meldungId = bogenInhaltsId(bogen)` (FNV-1a über `JSON.stringify`). Derselbe Inhalt über zwei Wege (QR + PDF-Reimport) erzeugt **eine** Meldung | `einsaetze.ts` |
| Gruppierung | `einheitSchluessel(bogen.einheit)`: `ref:<standortRef>\|c<code>` wenn Standort-Ref vorhanden, sonst `org:<org>\|<orgName>\|<typ>\|<ebene0Name>` | `einsaetze.ts:202-207` |
| Zuordnung | **Vorschlag, keine Automatik.** Der Fingerabdruck ist ausdrücklich Heuristik; die Übernahme in eine bestehende `Einheit` bestätigt ein Mensch (Ereignis `EebMeldungZugeordnet` für Korrekturen) | `einsaetze.ts` Modulkopf |
| Revisionsordnung | `istNeuer()`: erst `bogen.stand`, dann `empfangenAm`; `neuesteJeEinheit()` liefert den Kopf | `einsaetze.ts:255-272` |
| Übernahme | `EebMeldungUebernommen` + separate Feldereignisse (§4.2). **Übernommen werden nur Felder, die der Bogen führt** | §0 dritter Grundsatz |

**Feldweise Übernahmeregeln** (die Umkehrung von `oldenburg-xlsx.ts` `zeileFuer`):

| v2-Feld | aus EEB | Regel bei Reimport (neue Revision) |
|---|---|---|
| `bezeichnung` | `vokabText(einheitsTyp)` bzw. `einheitAnzeigename()` + `teilEtikett` | überschreiben, wenn die FüSt sie nicht manuell geändert hat |
| `organisation`, `organisationName` | `einheit.organisation` / `organisationName` | überschreiben |
| `hierarchie`, `standortRef` | `einheit.hierarchie`, `einheit.standortRef` | überschreiben |
| `ebene` | `ebeneVon(langname, gesamtstaerke)` | nur setzen, wenn bisher `UNBESTIMMT` |
| `staerke` | `staerke(bogen)` (manuell oder aus `personal`) | überschreiben, aber **immer** als sichtbarer Feldabgleich („war 0/3/17, gemeldet 0/2/17") |
| `personalErfassung` | `bogen.personalErfassung` | überschreiben |
| `Person[]` | `bogen.personal` | vollständig ersetzen (die Meldung ist die Wahrheit über ihr eigenes Personal) |
| `Fahrzeug[]` | `bogen.fahrzeuge` | ersetzen, aber `abschnittId` und `status` der bestehenden Fahrzeuge erhalten (FüSt-Daten) |
| `logistikOverride` | `unterbringungMWD()`, `verpflegung()`, mit der Regel „ÜN nur bei `sofortbedarf.unterbringung`" | **nicht** als Override setzen, sondern die `Person`-Daten übernehmen und ableiten (K4); Override nur bei `personalErfassung = NUR_STAERKE` |
| `sofortbedarf` | `bogen.sofortbedarf` | überschreiben |
| `verfuegbarBis` | `einsatz.zeitraumBis` | überschreiben |
| `eingetroffenAm` | `einsatz.einsatzbeginn` | **nur setzen, wenn leer** — die FüSt kennt den echten Eintreffzeitpunkt besser |
| `einsatzendeAm` | `einsatz.einsatzende` | nur setzen, wenn leer |
| Auftrag | `einsatz.ortAuftrag` | als **neuer** `Auftrag` mit `quelle=EEB`, bestehende nicht ersetzen |
| `bemerkung` | `["ÜBUNG" falls uebung, sonstiges]` | **anhängen**, nicht ersetzen |
| `fuehrungskraft` | `ansprechpartner(personal)` | überschreiben |
| **`status`** | – | **nie aus dem EEB** (§2.2 Nr. 5) |
| **`schicht`** | – | **nie aus dem EEB** |
| **Anforderungsfelder N–S** | – | **nie aus dem EEB** |
| **`abschnittId`** | – | **nie aus dem EEB** (wo die Einheit steht, entscheidet die FüSt) |
| **`fuestKennung`** | – | **nie aus dem EEB** (Spalte A bleibt im Export leer) |

**Aufteilen und Zusammenführen.** Die App kennt beide Vorgänge bereits (`meldungAufteilen`, `meldungenZusammenfuehren`, `teilEtikett`, `stammSchluessel`, `freierTeilSchluessel`). v2 spiegelt sie 1:1 auf `EinheitAufgeteilt`/`EinheitZusammengefuehrt` (§4.2) — inklusive der Regel, dass `AUFGEGANGEN` kein Abrücken ist.

**Übungsbögen.** `bogen.uebung = true` (Schema 6) muss durch den ganzen Import wandern: Kennzeichnung an der Meldung, „ÜBUNG"-Präfix in der Bemerkung, und eine Warnung, wenn ein Übungsbogen in einen Einsatz mit `art = EINSATZ` übernommen wird.

**Was der EEB nicht liefert und daher immer leer bleibt:** Status, Schicht, Ablösung/Anforderungs-ID/Zusagen/Rückführung, FüSt-Kennung, Abschnittszuordnung, Kostenparameter, PSA-Bedarf, taktisches Zeichen. Das ist keine Lücke, sondern die Aufgabenteilung (`oldenburg-xlsx.ts` Modulkopf: „Erfundene Werte wären dort schlimmer als leere Zellen").

---

## 6. Offene fachliche Entscheidungen für Johannes/FüSt

Sortiert nach Auswirkung auf das Modell. Jede Frage ist so gestellt, dass eine kurze Antwort genügt; die Vorschlagsspalte ist die Fassung, mit der die Implementierung starten kann, falls keine Antwort kommt.

| # | Frage | Warum sie das Modell berührt | Vorschlag, falls unbeantwortet |
|---|---|---|---|
| 1 | **Ist die erste (leere) Datenzeile eines Bereichs die Führungsstelle des Bereichs oder ein Einfügepuffer?** Hinweise Z.12 sagt „erste Zeile = Führungsstelle", die Vorlage lässt sie ohne Formeln (EXD §11, KRI §3.1) | entscheidet, ob `istFuehrungDesAbschnitts` beim Excel-Import gesetzt wird und ob v2 die Zeile überhaupt braucht | Feld beibehalten, aber beim Import **nicht** automatisch setzen; in v2 markiert die FüSt die führende Einheit explizit |
| 2 | **Welche Statuswerte werden real benutzt?** Die Vorlage zählt „Rufbereitschaft"/„Einsatzvorbehalt" wegen der Kurzform-Inkonsistenz faktisch nie mit (§2.2 Nr. 2) — sind sie im Betrieb überhaupt vergeben worden? | wenn nein, könnte die Liste auf 7 Werte schrumpfen; wenn ja, war die Excel-Auswertung jahrelang falsch (das wäre ein Befund, den die FüSt kennen sollte) | alle 9 Werte behalten |
| 3 | **Sollen Zählregeln vererben?** Zählt ein Unterabschnitt unter „Angefordert" ebenfalls nicht in die Gesamtstärke? (§2.4 Nr. 6) | betrifft K3, K19–K24 und damit jede Auswertung | ja, vererben — ein Unterabschnitt eines Angefordert-Bereichs ist fachlich ebenfalls angefordert |
| 4 | **Wie zählt eine Person ohne Geschlechtsangabe?** Die Excel leitet „männlich = Rest" ab (Log!I7), was jede fehlende Angabe automatisch männlich macht | betrifft K5 und die Unterbringungsplanung | wie Excel: Rest zählt männlich, aber die Anzahl der Personen ohne Angabe wird als Hinweis ausgewiesen |
| 5 | **Werden weitere Ernährungsformen gebraucht** (Halal, glutenfrei, Allergien)? Weder Excel noch v1 noch EEB kennen sie (§2.7) | Enum-Erweiterung ist billig jetzt, teuer später (Codes sind append-only) | bei den drei EEB-Werten bleiben; Sonderfälle in `sofortbedarf`/`bemerkung` |
| 6 | **Soll der FüSt-Schichtplan strukturiert werden** (Person + Funktion + Erreichbarkeit getrennt) oder Freitext bleiben wie in der Excel? (§1.14) | strukturiert = Auswertbarkeit (wer ist wann da), Freitext = null Migrationsrisiko und die gewohnte Bedienung | Freitext belassen; Strukturierung ist eine eigene Ausbaustufe |
| 7 | **Wie viel v1-Bestand gibt es wirklich?** Existieren `.s1control`-Dateien mit echten Einsätzen, und gibt es gefüllte Excel-Mappen realer Lagen? (KRI §3.7, Gap 3) | entscheidet, wie viel Aufwand die Importregeln §5.1/§5.2 rechtfertigen. Bei „nur Testdaten und die leere Vorlage" schrumpft §5.1 auf ein Wegwerfskript und §5.2 auf Katalog + FüSt-Gerüst | Import als Einmalwerkzeug bauen, nicht als dauerhaftes Feature |
| 8 | **Sind die Organisationsfarben der Excel verbindlich** (THW 0033CC, FW FF0000, DLRG 00B0F0 …, EXD §11 [unbelegt])? | betrifft Druck und Lagekarte; falsche Farben fallen der Führung sofort auf | Excel-Farben übernehmen |
| 9 | **Braucht v2 überhaupt Benutzerkonten mit Passwort?** v1 speichert `passwortHash` in der geteilten Systemdatei; die Excel kennt nur einen Admin-Modus mit Klartextpasswort (EXH F-L3, vba §5.4). Die Anforderung ist „Schutz vor versehentlichem Ändern", nicht Zugriffsschutz gegen Angreifer | ein Passwortspeicher auf einer offenen NAS-Freigabe ist Sicherheits-Theater und erzeugt Pflege- und Konfliktaufwand | Rollen behalten, aber ohne Passwort: Rolle wird beim Start am Client gewählt und in `actor` protokolliert; Admin-Funktionen bekommen eine Bestätigungsabfrage |
| 10 | **Ein Meldekopf-Eingangskorb je Meldekopf oder einer für den Einsatz?** Die Excel hat zwei Meldekopf-Bereiche (BR 1 / BR 2, §2.4) und beschreibt einen Quittierungsprozess (EXH F-E1) | betrifft, ob `uebernahmeZustand` je Meldekopf getrennt geführt wird | ein gemeinsamer Korb mit Filter „eingegangen bei", weil die FüSt zentral übernimmt |
| 11 | **Wie wird die Anforderungs-ID gebildet?** Format ist „mit der übergeordneten Stelle abgestimmt" (EXH F-F1) — gibt es eine Konvention, die v2 vorschlagen kann? | entscheidet, ob `Anforderung.kennung` generiert oder nur eingegeben wird | Freitext mit optionalem Generator `<FüSt-Kürzel>-<lfd. Nr.>` |
| 12 | **Sollen Kosten überhaupt in v2?** Der Block ist in der Excel eine ausdrückliche Näherung (EXH F-L6), fehlt in v1 vollständig und wird an vier Kennzahlen (K13–K16) hängen | wenn die Kosten in der Praxis nie ausgewertet werden, spart das ein Eingabefeld, vier Formeln und eine Ausgabespalte | übernehmen — der Aufwand ist gering und die Daten fallen ohnehin an |
| 13 | **Zwei- oder Drei-Schicht-Modell als Standard?** (§2.3) | Vorbelegung der Maske und Spaltenzahl in Log! | ZWEI_SCHICHT (Tag/Nacht), weil die Excel-Vorbelegung „Tag" ist |
| 14 | **Soll v2 Bögen an übergeordnete Stellen weiterreichen können** (Gegenzeichnen der Signaturkette, §5.3 Punkt 5)? | entscheidet, ob `rohPayload` und die Ed25519-Kette in v2 überhaupt gebraucht werden — das ist ein spürbarer Implementierungsblock | `rohPayload` von Anfang an speichern (billig), das Gegenzeichnen später bauen |

---

## Anhang: Was dieser Bericht bewusst nicht entscheidet

- **Speicherform.** §4 ist so formuliert, dass er unter dem Ereignisprotokoll (NAS §10) wie unter dem Lockfile-Modell (bmecat §8.0) trägt. Die Entscheidung liegt beim Nachlese-Auftrag `speichermodell-widerspruch-aufloesen` bzw. der Synthese.
- **Stack.** Kein Feld und keine Regel dieses Modells hängt an Electron, Tauri, Rust oder TypeScript. Der einzige stacknahe Befund: der EEB-Codec liegt als plattformneutrales TypeScript vor und muss für eine WebView-basierte Lösung **nicht** portiert werden (KRI §3.2).
- **UI.** Welche Felder in welcher Maske stehen, ist Sache des Oberflächenentwurfs; §1 sagt nur, welche erreichbar sein müssen.
- **Ausgabelayouts.** Druck, Status, Log, LogFrei, FüOrg, Auswertung und der HTML-Monitor sind Projektionen (§1.16); ihre Formeln stehen in §3.3, ihr Layout nicht.
