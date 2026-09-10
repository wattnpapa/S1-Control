# Handoff: S1-Control v2 — Oberfläche im Design von erfassungsbogen.app

## Überblick
Entwürfe für die Renderer-Oberfläche von **S1-Control v2** (Branch `v2-architektur`, Electron + React 19 + Vite).
Ziel: Die heute funktional fertigen, aber ungestalteten Ansichten aus `apps/desktop/src/renderer/` erhalten
die Gestaltungsebene von **erfassungsbogen.app** — damit beide Anwendungen (Bogen erfassen / Lage führen)
für Anwender wie ein Produkt wirken. Beispiellage in allen Entwürfen: „Hochwasser Oldenburg", 42 Einheiten,
6 Abschnitte, 13″-Arbeitsplatz (Kartenbreite 1320 px).

## Zu den Design-Dateien
Die Datei `S1-Control Mockups.dc.html` in diesem Bündel ist eine **Design-Referenz in HTML** — ein Prototyp,
der Aussehen und Verhalten zeigt, **kein** Produktionscode zum Kopieren. Sie ist ein „Design Component"
(Streaming-HTML mit ausschließlich Inline-Styles) und läuft direkt im Browser.
Aufgabe im Zielcode: die gezeigten Ansichten in der **bestehenden Umgebung** von S1-Control nachbauen —
React 19 + TypeScript strict, Vite, Zustand-Store, die Komponenten in `apps/desktop/src/renderer/`,
Styling im dortigen `index.html`-`<style>`-Block (Klassen wie `.arbeitsplatz`, `.lage`, `.baum`,
`.einheiten`, `.statuszeile`, `.monitor`). Keine neuen Abhängigkeiten nötig; die Entwürfe brauchen
weder ein CSS-Framework noch eine Komponentenbibliothek.

## Fidelity
**High-fidelity.** Farben, Typografie, Abstände, Rahmen und Zustände sind final und unten mit exakten Werten
dokumentiert. Interaktionen sind als Zustandsbilder gezeigt (Inline-Bearbeitung, Konflikthinweis, Befehlsleiste),
nicht als lauffähige Logik.

## Optionen im Prototyp
Die Datei ist als Optionsblatt aufgebaut: pro Runde ein `<section class="dv-turn">`, neueste oben.
Jede Option hat eine stabile Kennung, über die im Gespräch referenziert wird:

| Kennung | Inhalt | Status |
|---|---|---|
| 2a | **Lagebild im Zieldesign** (Navy-Kopfband, KPI-Band, eckige Karten, Mono-Spaltenköpfe) | **Grundlage für die Umsetzung** |
| 2b | Dasselbe im Theme „Feld" (2-px-Schwarz, größere Schrift) | Theme-Nachweis |
| 2c | Dasselbe im Theme „Nacht" (Bernstein auf Schwarz) | Theme-Nachweis |
| 2d | Nahtstelle: Bogen aus erfassungsbogen.app „In Einsatz aufnehmen" | umzusetzen |
| 2e | Bausteinblatt: Knöpfe, Marken, Tabellenkopf, Banner + offene Entscheidungen | Referenz |
| 3a | Führungsorganisation (Führungsharke) mit taktischen Zeichen | umzusetzen |
| 1a–1i | Erste Runde im alten S1-Look (zwei Spalten, Cockpit, Monitor, Eingangskorb, FüSt, Ausgaben, Masken, Scanner) | Vorstufe, nur als Vergleich |

Umzusetzen ist die **Runde 2/3**-Gestaltung; Runde 1 dokumentiert nur den Weg dorthin.

## Design-Tokens

### Farben
| Token | Wert | Verwendung |
|---|---|---|
| navy-900 | `#1c2251` | Kopfband, gefüllte Hauptknöpfe, gewählte Baumzeile |
| navy-800 | `#14183a` | Text, 3-px-Oberkante der Karten, dunkle Nebenleiste |
| navy-600 | `#1a3fb0` | Logo-Kachel |
| navy-300 | `#a9b0d4` | Sekundärtext auf Navy |
| navy-200 | `#c3c8e4` | inaktive Reiter auf Navy |
| page-bg | `#eef0f6` | Arbeitsfläche |
| card | `#ffffff` | Karten, Tabellen |
| border | `#c9cfe0` | Kartenrahmen, Tabellenaußenrahmen, Zellrahmen im Kopf |
| border-soft | `#dde1ec` | Trennlinien innerhalb der Karte, Zellrahmen im Körper |
| row-alt | `#f6f7fb` | hervorgehobene KPI-Kachel, Infokästen |
| thead-bg | `#e7eaf3` | Tabellenkopf, Summenzeile |
| row-selected | `#eaedf7` | gewählte Tabellenzeile |
| text-muted | `#5c6484` | Beschriftungen |
| text-muted-2 | `#3a4266` | Tabellenzellen sekundär |
| text-placeholder | `#8b93ad` | Platzhalter, Chevrons |
| ok-bg / ok-line / ok-ink | `#e0f0e6` / `#a8d3b8` / `#14652f` | Status IM_EINSATZ, EINSATZBEREIT, UEBERNOMMEN |
| warn-bg / warn-line / warn-ink | `#fbeccd` / `#e3c987` / `#7a5c12` | ANMARSCH, NEU, GEAENDERT, Konflikthinweis |
| err-bg / err-line / err-ink | `#f7dede` / `#dda9a9` / `#8f1717` | NICHT_EINSATZBEREIT, Löschen |
| neutral-bg | `#eceef4` | RUHE, ABGELEHNT, ENTFERNT |
| übung-streifen | `repeating-linear-gradient(135deg,#f7ecc6 0 12px,#fbf5e2 12px 24px)`, Rahmen `#d8c47a` | Übungsbanner |
| tz-gelb | `#ffff00` | taktische Zeichen (Führungsstellen-Flagge) |

Theme **Feld**: Grund `#e9ebf0`, Rahmen durchgängig `2px solid #000`, Text `#000`, Basisschrift 14 px, Knopfhöhe 38 px.
Theme **Nacht**: Grund `#0c0b06`, Karte `#14120a`, Rahmen `#3a3418` / `#2a2410`, Text `#e8dfae`, Überschrift `#f0e5b0`, Akzent `#c8a232`, Zahl-Akzent `#e0b84a`, Status-Marken `#1b2a14/#9ed17e` (ok), `#2a2410/#e0b84a` (warn), `rgba(239,68,68,.26)/#ffa8a8` (Fehler).
Theme **Dunkel** (aus erfassungsbogen.app übernehmen): Indigo-Grund, Lavendel-Akzent — im Prototyp nur als Schalter gezeigt.

### Typografie
- UI-Schrift: `-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif`
- Mono (Spaltenköpfe, Kennungen, Kürzel): `ui-monospace, Menlo, monospace`
- Taktische Zeichen: **Roboto Slab Bold** (Google Fonts, Gewicht 700)
- Größen: Kopfband-Titel 21/700 · Stärke & Zeit im Kopf 30/700 tabular · KPI-Zahl 27/700 tabular · KPI-Label 10/400 mono, `letter-spacing:.14em`, Versalien · Kartentitel 14/700 · Tabellenkopf 10/400 mono, `letter-spacing:.1em`, Versalien · Tabellenzelle 12/1.35 · Statusmarke 9.5/700 · Statuszeile 11.5/400 · Hilfstext 11/1.45
- **Alle Zahlen `font-variant-numeric: tabular-nums`** (Stärke, Summen, Zeiten, Kennungen).
- Schreibweise der Gesamtstärke: **`24/61/183 // 268`** (Fü/UFü/He // Gesamt) — überall gleich.
- Taktische Zeit ohne Zonenbuchstabe: **`101443SEP26`**.

### Maße
- Radien: **0** (eckig) — einzige Ausnahme: Zustandsmarken 0, Pillen im alten Look entfallen.
- Rahmen: 1 px `#c9cfe0`; jede Hauptkarte zusätzlich `border-top: 3px solid #14183a`.
- Abstände: 6 / 8 / 9 / 11 / 13 / 14 / 16 / 20 / 22 px (Kartenpadding 13 px, Kartenabstand 14–16 px, Seitenpadding 14–20 px).
- Knöpfe: Höhe 31 px, Padding 0 13 px, 1 px Rahmen `#1c2251`; gefüllt = Hauptweg (`#1c2251`/weiß, 700), umrandet = Nebenweg (weiß/`#14183a`, 400), gesperrt `#c9cfe0`/`#8b93ad`, destruktiv Rahmen+Text `#b91c1c`.
- Tabellenzeilen: Zellpadding 7 px 8 px; Kopf 8 px; Summenzeile `#e7eaf3`, 700.
- Kein `box-shadow` außer bei Masken/Overlays: `0 14px 40px rgba(9,20,48,.22)`.

## Ansichten

### 1. Lagebild (Option 2a) — Hauptansicht
**Zweck:** Kräfte je Abschnitt führen: Abschnitt wählen, Einheiten sehen und in der Zelle bearbeiten.
**Quelle im Repo:** `Lage.tsx`, `Abschnittsbaum.tsx`, `Einheitentabelle.tsx`, `Statuszeile.tsx`.

Aufbau von oben nach unten (Höhen bei 1320×860):
1. **Kopfband** (Navy, Padding `11px 20px 0`): Zeile 1 = Breadcrumb „‹ Einsatzauswahl" (12/400, `#a9b0d4`).
   Zeile 2 = Logo-Kachel 44×30 (`#1a3fb0`, 1 px `#6b74a8`, Text „THW" 9/700) · Titel „S1-Control" 21/700 ·
   **STÄRKE** (Label 9.5 mono `.14em` `#a9b0d4`) + `24/61/183 // 268` 30/700 tabular ·
   **ZEIT** + `101443SEP26` 30/700 tabular · rechts der Theme-Schalter (1 px weißer Rahmen, vier Felder
   `Standard | Dunkel | Feld | Nacht`, aktiv = weiß auf Navy, Padding `7px 12px`).
   Zeile 3 = Zustandszeile „✓ Hochwasser Oldenburg · Stand vor 6 s · Share erreichbar — 2 weitere Arbeitsplätze" (12/400, `#8fe3a8`).
   Zeile 4 = Reiter `Lage | Eingangskorb 7 | Anforderungen | Führungsstelle | Kosten | Ausgaben` … `Diagnose` rechts;
   aktiv 13/700 weiß mit `border-bottom:2px solid #fff`, inaktiv 13/400 `#c3c8e4`; Zähler in `#f0c368`.
2. **KPI-Band** (weiß, `border-bottom:1px solid #c9cfe0`): fünf gleich breite Kacheln `EINHEITEN 42 · FÜHRER 24 · UNTERF. 61 · MANNSCH. 183 · GESAMT 268`;
   Zahl 27/700 tabular, Label darunter 10/400 mono `.14em`; Trenner `1px #dde1ec`; letzte Kachel Grund `#f6f7fb`, Zahl `#1c2251`.
   Die taktische Zeit steht **nicht** hier, sondern im Kopf.
3. **Arbeitsfläche** (Padding 14 px, Abstand 14 px): links **Abschnittsbaum** 266 px fest, rechts **Einheiten** flexibel.
   - Baum: Karte mit Kopf „Abschnitte" + Knopf „Neu ⌃N"; Zeilen `padding:9px 12px`, Kinder `padding-left:24px`,
     gewählt = `#1c2251`/weiß, Wurzel = `#f6f7fb`; rechts die Einheitenzahl in Mono; Meldekopf-Zeile trägt die Marke „7 neu" (warn).
     Darunter Kasten „BEDARF (EA 1)" (Verpflegung / Unterbringung / Fahrzeuge) und die Kürzelliste
     (`⌃N` Neu, `⌃M` Verschieben, `⌃E` Entfernen, `⌃Q` Bogen einlesen, `⌃F` Suche, `⌃H` Hilfe).
   - Einheiten: Knopfzeile (`Bogen scannen…` gefüllt, `Einheit aus Vorlage…`, `Bögen einlesen…` | `Verschieben (2)`,
     `Aufteilen`, `Zusammenführen`) + Suchfeld rechts („Einheit, Organisation, Ort, Kennzeichen…").
     Tabellenkarte mit Kopf „Einheiten (14)" + Umschalter `Karten | Tabelle`.
     Spalten: `EINHEIT · ORG. · HERKUNFT · F · U · M · GES. · STATUS · SCHICHT`; Zahlenspalten rechtsbündig;
     Breiten in **Prozent** auf den `<th>` (nie px — bei `table-layout:fixed` addiert sich das Zellpadding und die Tabelle
     wächst aus ihrem Rahmen); Summenzeile unten; Fußnote „Doppelklick bearbeitet die Zelle · Enter schreibt · Esc verwirft · ⌃D setzt ‚jetzt'".
     Zustände in der Tabelle: gewählte Zeile `#eaedf7`; **Inline-Bearbeitung** = Zelle mit `2px solid #1c2251`;
     **Konflikthinweis** = Zellgrund warn + „⚠" (Farbe **und** Zeichen); **entfernte Einheit** = `opacity:.55`, durchgestrichen, Marke ENTFERNT.
4. **Statuszeile** (30 px, weiß, `border-top:1px solid #c9cfe0`, 11.5/400): `Stand: vor 6 s · Share erreichbar (vor 3 s) · 2 weitere Arbeitsplätze · 1 Konflikthinweis`,
   rechts `42 EINH · 24/61/183 // 268` in Mono/600. Bei fehlendem Share: Text in warn, zusätzlich „14 kB noch nicht übertragen".

### 2. Themes Feld / Nacht (2b, 2c)
Gleicher Aufbau, andere Tokens (siehe oben). **Feld**: 2-px-Rahmen, Schrift 14 px, Knöpfe 38 px hoch, Statusmarken mit 2-px-Rahmen — für Handschuhe und Sonne.
**Nacht**: dunkel mit Bernstein-Akzent, kein Weiß-Grund, Zahlen `#f0e5b0`; Schichtangabe „NACHT 18–06" im Kopf.
Der Theme-Schalter sitzt im Kopfband und ist in allen Ansichten identisch (vier Felder, aktiv gefüllt).

### 3. Bogen aufnehmen (2d) — Nahtstelle zu erfassungsbogen.app
**Zweck:** Eine per QR/Bündel eingelesene Meldung übernehmen.
Kopfband „Bogen aufnehmen — Eingangskorb" + Quelle + „✓ Signatur gültig · Ed25519" (`#8fe3a8`).
Darunter das **Übungsbanner** (Streifenmuster, 12/400 `#7a5c12`, Wort „ÜBUNG" 11 mono `.12em`).
Zwei Spalten: links „Der Bogen" (520 px) mit Organisationskachel 62×40, Titelzeile, `Stärke 1/2/12 // 15` 25/700,
Block „SOFORTBEDARF" (Verpflegung / Unterbringung / Kraftstoff / Fahrzeuge) und Tabelle „PERSONAL (15) — AUSZUG"
(`FUNKTION · NAME, VORNAME · ERREICHBARKEIT`).
Rechts: „Was die Führungsstelle ergänzt" (Abschnitt = fokussiert mit 2-px-Rahmen, Status, Schicht, FüSt-Kennung)
mit Hinweis „Der Bogen gehört der meldenden Einheit …", darunter „Änderungen gegenüber Fassung 2" (Diff-Gruppen
STÄRKE / PERSONAL ZUGANG / FAHRZEUGE ZUGANG / BEDARF, Label 10 mono) und die Knopfzeile
`Fassung übernehmen ⏎` (gefüllt) · `Ablehnen mit Grund…` · `Später` + „Übernahme ist ein Ereignis — rücknehmbar mit ⌃Z".

### 4. Führungsorganisation / Führungsharke (3a)
**Zweck:** Die Führungsstruktur als Harke zeigen und drucken — gezeichnet aus dem Abschnittsbaum, kein zweiter Editor.
**Quelle im Repo:** `Abschnittsbaum.tsx` (Struktur), `Ausgaben.tsx` (`fueorg` als PDF).
Kopfband wie 2a (Titel „S1-Control", Stärke + Zeit, Theme-Schalter, Reiter mit aktivem „Führungsorganisation").
Werkzeugzeile: `Abschnitt anlegen ⌃N` (gefüllt) · `Umhängen` · `Typ ändern` · `Auflösen` |
`Beschriftung: Kurzform (TEL / EAL / UEAL) ▾` · `Zeichensatz: … ▾` · rechts `Als PDF (Lagekarte)`.
**Harke (konstruktiv wichtig):** je Ebene **ein CSS-Grid** `grid-template-columns:repeat(n,1fr)`;
der Querbalken spannt über alle Spalten mit `margin:0 calc(100%/2n)` (3 Spalten → 16.6667 %, 2 Spalten → 25 %),
Abzweigstummel und Zeichen sitzen in **derselben Zelle**, beide zentriert, **ohne `transform`** —
zwei getrennte Flex-Reihen oder `translateX(-50%)` führen zwangsläufig zu versetzten Achsen.
Linien: 3 px `#000`; Stummel 20 px (Ebene 1), 16 px (Ebene 2), 14 px (Ebene 3).
Knoten: TEL 196 px → EAL 176 px → UEAL 118 px Breite; unter jedem Zeichen eine Bildunterschrift
(10.5/400 `#3a4266`: Leiter + `14 Einh. · 8/21/64` in tabular).
Rechte Spalte (300 px): „EINRICHTUNGEN (NEBEN DER HARKE)" mit den Zeichen Meldekopf / Bereitstellungsraum /
Versorgungsstelle Verpflegung (je 74 px) und „ZEICHENSATZ (AUSZUG)" mit acht Zeichen à 58 px,
Beschriftung **Kurzform** (EL, TEL, EAL, UEAL, KatSL, MK, BR, Feldlager), vollständiger Name in `title`/`aria-label`.

## Interaktionen & Verhalten
- **Tastatur zuerst** (Kürzel der Excel, bereits in `renderer/tastatur.ts` / `@s1/domaene` implementiert):
  `⌃N` anlegen · `⌃M` verschieben · `⌃E` entfernen · `⌃F` Suche fokussieren · `⌃D` „jetzt" in Zeitfeld ·
  `⌃Q` Erfassungsbogen einlesen · `⌃Z` zurücknehmen · `⌃H` Hilfe. Vorschlag aus dem Entwurf (noch nicht im Code):
  `⌃K` Befehlsleiste, `⌃1…⌃6` Abschnittswechsel — siehe Option 1b.
- **Inline-Bearbeitung** (Einheitentabelle): Doppelklick öffnet die Zelle (2-px-Fokusrahmen), Enter schreibt,
  Escape verwirft, Fokusverlust schreibt ebenfalls. Kein Ereignis, wenn der Wert unverändert ist.
- **Masken**: Enter bestätigt, Escape bricht ab, Fokus steht im ersten Feld; gescheiterte Bedienschritte lassen die Maske offen.
- **Konflikthinweis** (§3.8): Zelle bleibt sichtbar markiert (Farbe + ⚠ + `title`), nichts wird still überschrieben.
- **Nichts verschwindet**: entfernte Einheiten, abgelehnte Meldungen und aufgelöste Abschnitte bleiben blass/durchgestrichen sichtbar.
- **Zweiter Klick auf einen Reiter** klappt das Nebenblatt zu (bestehendes Verhalten aus `Blaetter.tsx`).
- Übergänge: keine dekorativen Animationen; Zustandswechsel sind sofort sichtbar.

## Zustand
Bereits vorhanden im Store (`renderer/laden.ts`): `akteId`, `lagebild` (Stärke, Stand, Peers, Hinweise, Quarantäne),
`baum`, `tabelle` (Ausschnitt + Gesamtzahl), `tagebuch`, `eingangskorb`, `einstellungen`, `hinweise`.
Neu für die Gestaltung: **`theme: "standard" | "dunkel" | "feld" | "nacht"`** — je Gerät persistent (Einstellungen),
weil der Arbeitsplatz im Zelt anders steht als der im Fahrzeug. Fensterlokal bleiben: gewählter Abschnitt,
gewählte Einheit, offene Maske, offenes Nebenblatt, Suchtext, sichtbare Spaltengruppen.

## Assets
- **Taktische Zeichen**: die vom Auftraggeber gelieferten SVGs, im Projekt unter `assets/tz/` (Original) und
  `assets/tz/clean/` (ohne C2PA-Metadaten, ~350 Byte je Datei). Aufbau: `viewBox 0 0 256 256`;
  Führungsstellen-Flagge = `rect x=10 y=64 w=236 h=128 fill=#ffff00 stroke=#000 stroke-width=5` +
  Mast `line x1=10 y1=194 x2=10 y2=225` + Text `Roboto Slab` bold 56 px, `text-anchor:middle`, `x=128 y=150`.
  Meldekopf = Kreis `r=64` mit „M". Im Prototyp **inline** eingebettet, damit Roboto Slab greift
  (in `<img src>` würde die Schrift nicht laden). Harkenknoten setzen dieselbe Geometrie mit eigener Beschriftung,
  weil die Dateien feste Texte tragen.
- **Roboto Slab 700** über Google Fonts; im Offline-Betrieb der App muss die Schrift lokal mitgeliefert werden
  (`@font-face`, WOFF2 im Paket) — die Anwendung ist offline-first.
- Organisationsfarben für Einheitenzeichen (aus `themes/default.json` des Zeichensatz-Generators):
  THW `#003399`, Feuerwehr `#FF0000`, Katastrophenschutz `#DF6711`, Polizei `#13A538`, Bundeswehr `#996633`.
- Kein Icon-Set, keine Emoji, keine Bilder.

## Offene Entscheidungen (Option 2e)
1. Vier Themes in beiden Anwendungen — oder in S1 nur Standard + Nacht?
2. Reiterstreifen im Kopf (2a) oder zusätzlich die dunkle Modulleiste links (1a) für `⌃1…⌃6`?
3. Erfassen im Meldekopf-Modus: Wizard in 6 Schritten wie erfassungsbogen.app oder Maske mit Enter/Esc wie S1?
4. Eine Schriftfamilie für beide Anwendungen, oder Mono nur für Spaltenköpfe und Kennungen?
5. Gemeinsames Wortbild „S1-Control" / „Erfassungsbogen" im Kopfband?

## Dateien in diesem Bündel
- `S1-Control Mockups.dc.html` — alle Entwürfe (Runden 1–3). Öffnet direkt im Browser.
- `assets/tz/` und `assets/tz/clean/` — die taktischen Zeichen.
- `github.md` — Zuordnung Entwurf → Quelldateien im Repo (`## Screen map`), Stand der Auswertung.

## Repo-Zuordnung
repo: wattnpapa/S1-Control
branch: v2-architektur
path: apps/desktop/src, packages/domaene/src

## Last sync
date: 2026-09-10T17:58:00Z

### Updated in this project
- UI-Mockups für Lagebild (zwei Spalten + Dreispalten-Cockpit), hell und dunkel
- Stärke-Monitor, Eingangskorb/Meldekopf, Führungsstelle mit 12-h-Schichtplan
- Ausgaben nach Zweck gruppiert, Masken (Abschnitt/Einheit), EEB-Scanner
- Beispiellage „Hochwasser Oldenburg", 42 Einheiten, 6 Abschnitte
- Gestaltung mit erfassungsbogen.app zusammengeführt (Navy-Kopfband, KPI-Band, 4 Themes)
- Führungsharke mit taktischen Zeichen (Vorgaben aus jonas-koeritz/Taktische-Zeichen)

## Screen map
| Mockup (Option) | Repo-Quellen |
|---|---|
| 1a/1b/1c Lagebild | apps/desktop/src/renderer/Lage.tsx, Abschnittsbaum.tsx, Einheitentabelle.tsx, Tagebuch.tsx, Statuszeile.tsx, index.html; packages/domaene/src/projektion/tabelle.ts, ereignis.ts |
| 1d Stärke-Monitor | apps/desktop/src/renderer/Monitor.tsx, monitorZahlen.ts, index.html |
| 1e Eingangskorb / Meldekopf | apps/desktop/src/renderer/Eingangskorb.tsx, Meldekopf.tsx, Blaetter.tsx |
| 1f Führungsstelle / Schichtplan | apps/desktop/src/renderer/Fuehrungsstelle.tsx, Blaetter.tsx; packages/domaene/src/ereignis.ts (SCHICHTEN, SCHICHTMODELLE) |
| 1g Ausgaben | apps/desktop/src/renderer/Ausgaben.tsx |
| 1h Masken | apps/desktop/src/renderer/Maske.tsx, Abschnittsbaum.tsx, Einheitenmasken.tsx |
| 1i Scanner | apps/desktop/src/renderer/Scanner.tsx |
| 2a–2e Design-Zusammenführung | erfassungsbogen.app (Screenshots des Nutzers) + apps/desktop/src/renderer/index.html |
| 3a Führungsharke | apps/desktop/src/renderer/Abschnittsbaum.tsx, Ausgaben.tsx (fueorg); packages/domaene/src/projektion/tabelle.ts |

## Weitere Quellen
- jonas-koeritz/Taktische-Zeichen@master — README.md, themes/default.json, Makefile (Zeichenfläche 256×256, RobotoSlab-Bold, Organisationsfarben; fertige Zeichen liegen im Release-ZIP, CC0)

