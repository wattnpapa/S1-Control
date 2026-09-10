# M5 — Ressourcenplanung, Logistik, Kosten, FüSt-Personal

Stand: 2026-09-10 · Branch `v2-architektur` · Meilenstein M5 aus
[03-MEILENSTEINE.md](../../v2/03-MEILENSTEINE.md)

**M5 ist gebaut.** Alle vier Bereiche liegen vor, dazu ein fünfter, den die
Aufzählung nicht als eigenen führt: die Projektionen in Ring 2. Zwei Befunde
sind dabei aufgefallen, die niemand gesucht hat — eine Ansicht, die es bis in
den Aktendienst schaffte und nicht bis in die Vermittlung, und eine Regel des
Ereigniskonzepts, die der Fold nicht umsetzt. Beides steht unten.

M5 ist der erste Meilenstein, der in `05-UMSETZUNGSPLAN.md` nicht vorkommt.
Der Plan dort beschreibt Stufe 1 und endet nach M4 mit „V Verteilung und
Betrieb". Damit fällt M5 in Stufe 2 nach Entscheidung 1 — und der
Umsetzungsplan sagt zu M4.2 ausdrücklich, Logistik und Kosten blieben in der
Excel. M5 holt sie herein. Das ist eine Erweiterung des Umfangs von Stufe 1
und als solche zu lesen, nicht als Selbstverständlichkeit.

## Stand je Arbeitspaket

| WP | Inhalt | Stand |
|---|---|---|
| M5.0 | Vier Projektionen in Ring 2, Rufe im Kontrakt, Prüflage erweitert | fertig |
| M5.1 | Log als HTML und PDF, LogFrei als XLSX | fertig |
| M5.2 | Kostenübersicht, die vier Parameter am Einsatz | fertig |
| M5.3 | Anforderungen: Ansicht, Masken, Zustandsmaschine | fertig |
| M5.4 | FüSt-Personal: Dienstposten, Besetzung, Schichtplan | fertig |

Gates zum Stand dieses Berichts: `tsc -b` sauber, `eslint .` sauber, **1388
Tests in 105 Dateien grün** (von 1279 zum Ende von M4), `build:renderer` und
`build:schale` sauber. Die Rauchprobe unter Xvfb erzeugt jetzt sieben Ausgaben
statt vier.

## Die Commits

| Commit | Inhalt |
|---|---|
| `7cb8bbf` | Auftragsdokument: Reihenfolge, Lücken, der Befund vor der Log-Ausgabe |
| `f385e34` | M5.0: vier Projektionen, Prüflage erweitert |
| `fb5320c` | M5.1: Logistikblatt als Ausdruck und als Wertekopie |
| `9316db3` | M5.2: Kostenübersicht und die vier Parameter |
| `8bc69d5` | M5.3: Anforderungen mit ihrer Zustandsmaschine |
| `6846bbd` | M5.4: Dienstposten, Besetzung und Schichtplan |

## Was festgelegt wurde, und warum gerade so

### Keine neue Ereignisart — und das war keine Selbstbeschränkung

Der wichtigste Befund stand vor der ersten Zeile Code: **Der Katalog für M5
steht seit M1 vollständig.** `AnforderungAngelegt` mit Zusage, Erledigung,
Storno und drei Rücknahmen; `DienstpostenAngelegt` mit Besetzung und
Schichtplan; `LogistikGesetzt`; `KostenParameterGeaendert` — alles im
Katalog, alles gefaltet, `anforderungen` und `dienstposten` im Zustand, K13
bis K18 in den Kennzahlen. M1 hat für M5 mitgebaut, ohne dass ein Plan das
verlangt hätte.

M5 hat deshalb keine Ereignisart angelegt. Wo etwas fehlt, steht es unten als
Befund: Eine neue Art berührt den `zustandsHash` und gehört zu einer
`foldVersion` (§3.9), nicht in ein Oberflächenpaket. Dieselbe Regel galt in M3
für B1 und B2.

### Der Zustand der Anforderung wird gezeigt, nicht gesetzt

`zustand` ist nach §5.6.2 kein Feld, sondern eine Ableitung aus drei
gewöhnlichen: `erledigung` schlägt `storno` schlägt `zusage`. Der Fold leitet
sie ab, die Projektion liest sie, die Ansicht zeigt sie. Ein zweiter
Ableitungspfad wäre genau die zweite Wahrheit, die Prüfkriterium P6
ausschließt.

Daraus folgt die Bedienung: Es gibt keinen „Zustand ändern"-Knopf, sondern je
einen für die drei Handlungen und je einen für ihre Rücknahme — und angeboten
wird nur, was den Zustand tatsächlich ändert. Eine Zusage auf eine geltende
Erledigung wäre nach §5.6.2 Nr. 2 wirkungslos; ein Knopf dafür wäre ein
Versprechen, das der Fold nicht hält.

Dreizehn Szenarien fahren das über die echte Strecke, darunter die Stelle, um
die es geht: `EINGETROFFEN` gewinnt gegen ein späteres Storno, und beide
Permutationen enden im selben Zustand.

### Die Führungsstelle ist ein zweites Modell

`excel-domaenenmodell.md` §5 sagt es in einem Satz: Das Blatt FüSt ist
„fachlich ein zweites Modell" — Funktion (Dienstposten) × Schicht × Rolle →
Besetzung, plus Dienstplan Funktion × Tag. Es steht neben der Einheitenliste
und nicht darin.

Die Berührung der beiden Modelle ist genau eine: K17 rechnet aus den besetzten
Dienstposten je `teileinheit × schicht` eine virtuelle Einheit, und deren
Stärke geht in den Druck aus M4.1 ein. Würde die Führungsstelle zusätzlich als
Einheit gemeldet, stünde sie zweimal in der Gesamtstärke — deshalb wird sie
nicht gemeldet.

**Die Besetzung trägt einen Namen und keine Eins.** Die Vorlage setzt in die
Rollenspalte eine „1"; hier steht, wer den Posten besetzt. Das ist mehr und
nicht weniger: Die Rolle folgt der Funktion, gezählt wird über K17, und wer
wann Dienst hatte, steht damit auch im Tagebuch. Ein geleertes Feld räumt den
Posten — der Wert wird `null`, das Feld bleibt stehen (§3.2).

### Die Spalten des Schichtplans kommen aus den Daten

Die Vorlage hat feste Spalten J bis AS und blendet vergangene Tage von Hand
aus. Hier steht eine Spalte, sobald jemand etwas hineingeschrieben hat — ein
Kalender, der 36 leere Spalten erzeugt, wäre auf einem Bildschirm dasselbe
Ärgernis wie in der Vorlage.

Das hat eine Folge, die aussieht wie ein Fehler und keiner ist: Für den ersten
Eintrag eines Tages gibt es keine Zelle. Deshalb öffnet ein Knopf eine Spalte,
und diese Liste ist reine Fenstersache — sie steht nicht im Store, überlebt
keinen Wechsel der Akte und muss es nicht.

Daneben steht ein Satz aus §5.7, der leicht zu übersehen ist und den ein Test
festhält: **Ein angelegter Dienstposten belegt keinen Schichtplanpfad.** Eine
Umsetzung, die beim Anlegen ein leeres Objekt anlegte, hätte in jedem Einsatz
mit einem unbeplanten Posten einen anderen `zustandsHash`, weil §7.6 der
Speicherschicht leere Objekte behält.

### Die Formel steht im Blatt, weil die Vorlage sich widerspricht

Befund A1 aus M4: Das Blatt „Status" rechnet `Männl. = Gesamt − Weibl.`, das
Blatt „Log" `I = H − J − K`. Beides kann nicht stimmen.

Gebaut ist die Lesart des Log-Blatts, weil dieses Blatt hier entsteht und K5
sie seit M1.3 rechnet. Neu ist, dass der Ausdruck sie **nennt**: Die Fußzeile
sagt die Formel und sagt, dass die Frage offen ist. Eine Führungsstelle, die
zwei Blätter nebeneinanderlegt und zwei verschiedene Zahlen sieht, soll nicht
raten müssen, welche wie gerechnet ist. Der Befund ist damit aus dem Bericht
auf das Papier gewandert — dorthin, wo er entschieden wird.

### Die Parameter stehen einmal oben

Die Vorlage reicht `Kosten pro Satz PSA`, `VDA pro Tag` und
`Unterkunft/Verpflegung` mit Formeln wie `AQ = $AQ$3` in jede Zeile durch. In
einer Tabelle ist das die einzige Möglichkeit, eine Kopfzahl in einer
Zeilenformel zu benutzen; hier wäre es dieselbe Zahl vierzig Mal
untereinander. Das Blatt nennt sie einmal, und die Zeile trägt die vier
gerechneten Größen aus K13 bis K16.

Die Parameter gehören zum **Einsatz** und nicht zum Arbeitsplatz: Zwei Rechner
am selben Share müssen dieselben Sätze rechnen, und `Einstellungen` im
Kontrakt ist je Rechner. Deshalb ein Ereignis (§5.2) und keine Einstellung.

Beträge werden ohne `Intl` formatiert. Das Ergebnis von `Intl.NumberFormat`
hängt an den Gebietsdaten der Umgebung; zwei Rechner druckten dieselbe Zahl
dann verschieden, und ein Goldfile wäre nicht stabil.

### Die Prüflage trägt jetzt, was M5 prüft

Vor M5 hatte die Prüflage keine Logistikwerte, keine PSA-Sätze, keine
Anforderung und keinen Dienstposten. Die Logistikspalten der Statusmatrix
standen deshalb in ihrem Goldfile durchweg auf null — ein Goldfile über lauter
Nullen prüft die Rechnung nicht.

Ergänzt sind: Logistikwerte an neun Einheiten, PSA-Sätze an fünf, vier
Anforderungen mit je einem der vier Zustände, vierzehn Dienstposten in allen
fünf Teilbereichen und fünf Schichtplaneinträge an zwei Tagen. Die Lage bleibt
bit-stabil und hinweisfrei — mit **verschiedenen** Kennungen bei den
Anforderungen, weil zwei gleiche nach §5.6.1 einen `moeglicheDublette`
erzeugten und diese Lage keinen Hinweis tragen soll.

Das Status-Goldfile hat sich dadurch geändert. Der Diff ist die eigentliche
Aussage: Wo vorher acht Nullen standen, stehen jetzt Zahlen, deren Summe
aufgeht.

### Eine Reiterleiste statt drei weiterer Abschnitte

Das Lagebild trug schon Baum, Tabelle, Ausgaben und Tagebuch. Drei weitere
Blätter darunter hieße scrollen, um die Lage zu sehen — und die Lage ist das,
was während eines Einsatzes offen bleibt. Anforderungen, Führungsstelle und
Kosten werden dagegen aufgeschlagen, gelesen und wieder zugeklappt.

Zugeklappt kostet ein Blatt nichts, und genau darauf beruht der Zuschnitt aus
M3.7: Geschoben wird ein Zeiger, geholt wird, was offen ist. `frischeAnsichten`
erneuert eine Ansicht nur, wenn sie einmal geholt wurde.

## Zwei Befunde, die niemand gesucht hat

### Eine Ansicht, die nie ankam

`kostenAnfordern` aus M5.2 war im Kontrakt, im Aktendienst und im Store — und
fiel in der Vermittlung durch den `switch`, der keinen Vorgabezweig hat. Der
Aufrufer bekam eine Antwort, die formal in Ordnung war und nichts enthielt.
Die Tests des Pakets waren grün: Sie riefen `dienst.kosten()` direkt.

Die Ursache war eine Verdopplung. Der Verteiler Auftrag → Methode stand im
Worker-Einstieg, und die Werkstatt der Vermittlungstests hatte daneben eine
zweite, handgeschriebene Fassung mit sechs Auftragsarten — dem Stand von M2.
Jeder Ansichtsruf, der danach dazukam, war dort nicht abgedeckt.

Behoben: Der Verteiler steht in `worker/auftraege.ts` und wird von Betrieb und
Test benutzt. Dazu ein Test, der **jeden** Ansichtsruf durch die Vermittlung
schickt und auf den Zeigerstand prüft. Zwei Verteiler über derselben Menge
sind eine Verdopplung, bei der die zweite Fassung immer die ältere ist.

Nebenbei sind die Bedienschritte von `renderer/` nach `kontrakt/` gewandert:
Die Szenarientests fahren dieselben Entwürfe gegen den Aktendienst, und der
gehört zum Main-Projekt. Am alten Ort hätte ein Test entweder die Ringgrenze
zu brechen oder eine zweite Bauweise zu erfinden.

### Eine Regel, die der Fold nicht umsetzt

§5.6.2 Nr. 1 verlangt: Ein Storno gegen eine bereits geltende Erledigung wird
gefaltet, ändert den Zustand nicht — und trägt einen
`wirkungslosGegenTerminalzustand`. Der Satz steht im Konzept mit Begründung:
„Ohne den eigenen Hinweis wäre eine bewusste Stornierung wirkungslos **und**
unsichtbar."

Der Fold erzeugt diesen Hinweis für Archivierung, Aufteilung und
Zusammenführung — für die Anforderung nicht. Das Verhalten ist im Übrigen
richtig: Der Zustand bleibt `EINGETROFFEN`, das Storno steht im Feld. Es fehlt
allein die Sichtbarkeit.

Nicht von M5 aus geheilt: Hinweise gehen nach §3.8 in den `zustandsHash`, und
§3.9 ist an dieser Stelle deutlich — zwei Clients mit derselben Ereignismenge
und verschiedenem Fold-Verhalten hätten identische Versionsvektoren und
verschiedene Hashes, also den roten Ausgang. Die Änderung gehört zu einer
`foldVersion`. Der Szenarientest sagt das an Ort und Stelle und macht **keine**
Zusicherung über den Hinweis: Sie wäre entweder rot oder zementierte das
Fehlen.

## Befunde aus der Arbeit

| Nr. | Befund | Behandlung |
|---|---|---|
| M-B1 | §5.6.2 Nr. 1 verlangt beim Storno gegen einen Terminalzustand einen `wirkungslosGegenTerminalzustand`; der Fold erzeugt ihn für Archivierung, Aufteilung und Zusammenführung, nicht für die Anforderung | Verhalten sonst richtig, nur unsichtbar. Gehört zu einer `foldVersion` (§3.9), nicht in ein Oberflächenpaket. Im Test benannt, ohne Zusicherung |
| M-B2 | **Für Johannes.** Die Zuordnung Funktion → Rolle (Fü/UFü/He) ist eine Vorbelegung im Code. Ob ein „SGL 3" als Unterführer oder als Führer zählt, entscheidet die Dienstvorschrift der Stelle | Sie gehört zu den Stammdaten der Führungsstelle — dieselbe Lücke wie B6 (Zonenbuchstabe). `Einstellungen` im Kontrakt führt bislang nur Share-Pfad und Anzeigename |
| M-B3 | `anforderung.zusage` wird an drei Stellen verschieden beschrieben: `zustand.ts` als `{einheitText, zugesagtAm}`, §5.6 als `{zugesagtFuer, zugesagtVon, abloesendeEinheitId?}`, der Fold liest `zugesagtFuer` | Gelesen und geschrieben wird die Fassung des Folds — an ihr hängt die Plausibilisierung nach §2.5. Die beiden anderen gehören angeglichen; `zustand.ts` berührt den Hash, also wieder eine `foldVersion` |
| M-B4 | `anforderung.storno` trägt nach dem Katalog den festen Wert `true`, `zustand.ts` beschreibt `{storniertAm}` | Angezeigt wird nur, **dass** storniert wurde; wann und von wem, steht im Tagebuch. Wie M-B3 |
| M-B5 | Die Werkstatt der Vermittlungstests hatte einen eigenen Auftragsverteiler auf dem Stand von M2 | Behoben, siehe oben. Der Fall ist die Sorte, die kein Gate findet: Beide Seiten waren grün, die Naht dazwischen war es nicht |

Aus M3 und M4 bleiben offen: **B1** (`HierarchieEbene` heißt im Katalog
`art`/`name`, im Typ `ebene`/`bezeichnung`), **B2** (`FahrzeugZustand.bezeichnung`
und `PersonZustand.vorname` als Pflichtfelder), **B5** (Playwright-Läufer
gehört zu M7), **B6** (Zonenbuchstabe der NATO-Zeit), **A1** (die Vorlage
widerspricht sich bei „männlich"). B1, B2, M-B1, M-B3 und M-B4 berühren
sämtlich den `zustandsHash` — sie gehören zusammen in einen Schritt mit einer
`foldVersion` und nicht einzeln verteilt.

## Was offen bleibt

| Punkt | Wer entscheidet | Warum offen |
|---|---|---|
| **A1 — „männlich" in der Vorlage** | Johannes | Unverändert aus M4, aber jetzt sichtbar: Die Formel steht in der Fußzeile des Logistikblatts. Die Antwort entscheidet über eine Spalte in vier Ausgaben |
| **M-B2 — Funktion → Rolle** | Johannes | Die Vorbelegung im Code ist grob (wer leitet, ist Führer; wer eine Gruppe oder ein Sachgebiet führt, ist Unterführer; alles Übrige Helfer). Eine Führungsstelle kann das anders sehen, und dann ist jede FüSt-Stärke im Druck falsch |
| **Der Ausdruck auf Papier** | Johannes | Unverändert aus M4. Jetzt sind es sieben Blätter statt vier |
| **Prüfpunkt 3 — Parität** | Johannes | Unverändert: Die Referenzlage aus Entscheidung 8 liegt nicht vor |
| **M3.5, M2.4, M0.5** | Johannes | Unverändert — alle drei brauchen Hardware |
| **Die Sammel-`foldVersion`** | eigener Schritt | B1, B2, M-B1, M-B3, M-B4 zusammen |
| **Freigabe von `KONZEPT-EREIGNISSE.md`** | Johannes | Unverändert aus M1 |

## Was M5 an das Nächste übergibt

* **Vier weitere Projektionen.** Anforderungsliste, FüSt-Blatt,
  Logistikzeilen, Kostenübersicht — alle in Ring 2, alle über der Prüflage
  geprüft. Wer sie in einer Ausgabe braucht, holt sie, statt zu rechnen.
* **Eine Prüflage, die etwas taugt.** Vier Anforderungszustände, vierzehn
  Dienstposten, Logistikwerte, PSA-Sätze — die Goldfiles prüfen jetzt Zahlen
  und nicht Nullen.
* **Einen Verteiler statt zwei.** Ein neuer Ansichtsruf ist im
  Vermittlungstest ohne Zutun abgedeckt.
* **Die Bedienschritte beim Kontrakt.** Renderer und Szenarientests bauen
  dieselben Entwürfe; eine zweite Bauweise kann nicht mehr entstehen.
* **Den Stand für die Verteilung.** Was jetzt fehlt, ist nicht Fachlichkeit,
  sondern ein Installer: M0.5, M2.4, M3.5 und Prüfpunkt 3 warten alle auf
  dieselbe Sache — eine Anwendung auf einem Rechner der Führungsstelle.
