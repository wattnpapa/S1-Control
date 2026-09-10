# M3 — Lagebild: was gebaut wurde und was offen bleibt

Stand: 2026-09-10 · Branch `v2-architektur` · Meilenstein M3 aus
[05-UMSETZUNGSPLAN.md](../../v2/05-UMSETZUNGSPLAN.md)

**M3 ist gebaut.** Alle sechs Arbeitspakete des Plans liegen vor, dazu zwei,
die der Plan nicht als eigene führt: die Projektionen in Ring 2 und die
Erweiterung des IPC-Kontrakts. Ein Nachweis bleibt offen — der Stärke-Monitor
auf einer echten zweiten Anzeige, aus demselben Grund wie M2.4: keine
Hardware. Der Rest ist grün und läuft.

## Stand je Arbeitspaket

| WP | Inhalt | Stand |
|---|---|---|
| M3.0 | Projektionen in Ring 2: Baum, Einheitentabelle, Tagebuch | fertig |
| M3.7 | Kontrakt: vier Ansichtsrufe, drei Scannerrufe, drei Monitorrufe, Lagezeiger | fertig |
| M3.6a | Tastenkarte als eine Stelle | fertig |
| M3.1 | Abschnittsbaum: anlegen, umbenennen, Typ, umhängen, sortieren, auflösen | fertig |
| M3.2 | Einheitentabelle mit Feldgruppen, Inline-Bearbeitung, fünf Masken, Untertabellen | fertig |
| M3.3 | Einsatztagebuch-Ansicht | fertig, danach **aus dem Umfang genommen** |
| M3.4 | EEB per Handscanner: Segmentstapel, Signatur, Vorschau, Übernahme | fertig |
| M3.5 | Stärke-Monitor als Zweitfenster mit Monitorwahl | gebaut, **auf Zweitbildschirm ungeprüft** |
| M3.6b | Abkürzungsliste und Tastenkarte als Hilfefenster | fertig |

Gates zum Stand dieses Berichts: `tsc -b` sauber, `eslint .` sauber, **1183
Tests in 86 Dateien grün** (von 923 zum Ende von M2), `build:renderer` und
`build:schale` sauber, und die Rauchprobe startet unter Xvfb beide Fenster —
Arbeitsplatz und Monitor — bis in den Renderer hinein.

## Die Commits

| Commit | Inhalt |
|---|---|
| `e96623e` | Auftragsdokument: Reihenfolge und ihre Begründung |
| `4c8c66d` | M3.0 und M3.7: Projektionen in Ring 2, Ansichtsrufe im Kontrakt |
| `b89df64` | M3.6a: die Tastenkarte |
| `981c075` | M3.1: der Abschnittsbaum, mit den BDD-Szenarien |
| `a1167e9` | M3.2: die Einheitentabelle |
| `be7f548` | M3.3: die Einsatztagebuch-Ansicht |
| `756fa30` | M3.4: der Handscanner-Weg |
| `6c993a6` | M3.5: der Stärke-Monitor als Zweitfenster |
| `13d6a66` | M3.6b: Hilfefenster |
| `935ee48` | M3.5: die Rauchprobe prüft beide Fenster |

## Was festgelegt wurde, und warum gerade so

### Geschoben wird ein Zeiger, geholt wird die Ansicht

Der M2-Bericht gab den Zuschnitt vor: Das Lagebild im Kontrakt ist eine flache
Projektion für die Statuszeile und wächst nicht weiter. M3 hält sich daran und
fügt genau **eine** Zahl hinzu, `lageZeiger`.

Er zählt gefaltete fachliche Ereignisse und nicht Änderungen an der
Projektion, und darin liegt der Punkt: Ein Statuswechsel an einer von 150
Einheiten lässt `einheiten`, `abschnitte` und `gesamtstaerke` unberührt — die
Tabelle ist danach trotzdem veraltet. Ein Zeiger, der an der flachen
Projektion hinge, meldete diesen Fall nie. Was sich geändert hat, sagt er
nicht; das holt die offene Ansicht mit ihrem eigenen Ruf, gefiltert und auf
ihren Ausschnitt beschnitten. Eine zugeklappte Ansicht kostet damit nichts.

Die Alternative wäre gewesen, dass der Worker weiß, welche Ansicht offen ist.
Das wäre Fachwissen über die Oberfläche im Worker — genau die Vermischung, die
02-ZIELBILD.md ausschließt.

### Die Projektionen stehen in Ring 2, die Bedienschritte daneben

Baum, Tabellenzeile und Tagebuchzeile sind Ableitungen mit festgeschriebenen
Regeln: Sekundärsortierung (§5.3), Zyklusregel (§5.3.1), Auflösungskette
(§5.3.2), die Ordnung des Tagebuchs (§2.6, §5.9.1). Eine Sortierregel in einer
`.tsx` ist gegen das Konzept nicht prüfbar; in `packages/domaene/src/projektion/`
läuft sie im Test in beiden Umgebungen, node und jsdom.

Dasselbe gilt für die **Schreibseite**: `apps/desktop/src/renderer/bedienschritte.ts`
hält als reine Funktionen, welches Ereignis eine Handlung schreibt, mit
welcher Nutzlast und mit welchem `vorher`. Sie liegen in der Schale und nicht
in Ring 2, weil sie den `Entwurf` des IPC-Kontrakts bauen — aber sie sind
ohne DOM prüfbar, und das ist der Zweck.

Der Ertrag steht in der Spaltentabelle: Jede Spalte trägt neben ihrer
Überschrift den Feldpfad im Zustand, die Ereignisart, mit der eine Änderung
geschrieben wird, und die Excel-Spalte, aus der sie stammt. Eine
Inline-Bearbeitung, die die falsche Ereignisart schreibt, fiele sonst erst am
Konflikthinweis eines anderen Arbeitsplatzes auf.

### „150 Einheiten flüssig" ist gemessen

Die DoD von M3.2 nennt eine Zahl, und eine Zahl ohne Messung ist eine Meinung.
Gemessen auf dieser Maschine:

| Größe | Seite von 100 Zeilen | dieselbe Anfrage ohne Ausschnitt |
|---|---|---|
| 150 Einheiten | 1,8 ms | 2,3 ms |
| 1.000 Einheiten | 1,8 ms | 11,3 ms |
| 5.000 Einheiten | 2,3 ms | 56,0 ms |

Der Ausschnitt ist praktisch konstant, die volle Liste wächst linear. Genau
darauf beruht der Zuschnitt aus M3.7 — und genau das hält der Prüffall fest,
der verlangt, dass die Seite **um ein Vielfaches** billiger ist als die volle
Liste. Fiele der Unterschied weg, wäre der Ausschnitt im Kontrakt nutzlos.

Über den vollen Weg gemessen, mit Dateisystem: ein Bedienschritt samt `fsync`
4,1 ms, ein Tabellenausschnitt 1,6 ms, der Baum 0,18 ms, ein Tagebuchausschnitt
0,40 ms. Der Schreibwert ist ein Nebenbefund für M0.5 — auf einer lokalen
Platte, nicht auf dem Share.

Die Messung der Projektion läuft **ohne** Dateisystem, und das ist kein
Bequemlichkeitsschnitt: 5.000 Ereignisse einzeln mit `fsync` zu schreiben
dauert auf dieser Maschine über zwei Minuten und misst die Platte.

### Das Tagebuch wird aus den Ereignissen gerendert, nicht aus dem Zustand

§5.9.1 begründet es mit einem Satz, der auch der Prüfmaßstab ist: Der Zustand
hält je Feld zwei Beobachtungen, das Tagebuch braucht alle. Fünf
Statusänderungen an derselben Einheit ergeben deshalb fünf Zeilen und nicht
zwei — als Prüffall festgehalten.

Der Aktendienst hält die fachlichen Ereignisse seiner Akte deshalb neben der
Faltung. Das ist zulässig und in §3.1 nicht gemeint: Jene Schranke gilt dem
`Zustand`, der in den `zustandsHash` eingeht und über Schnappschüsse wandert.
Diese Liste geht nirgendwohin und stirbt mit dem Worker.

Die Sätze entstehen erst beim Ruf, mit den Namen, die **dann** gelten. Eine
beim Eintreffen gebaute und aufbewahrte Zeile trüge den Namen von damals — und
zwei Arbeitsplätze zeigten verschiedene Tagebücher über derselben
Ereignismenge, je nachdem, wann sie die Zeile gebaut haben.

### Die Buchstaben der Tastenkarte sind die der Excel

Strg+N einfügen, Strg+E entfernen, Strg+M verschieben, Strg+D „jetzt", Strg+Q
Erfassungsbogen, Strg+H Abkürzungsliste — dieselben wie in `m_makroFunktionen`.
Das ist kein Zitat, sondern der billigste Teil der Umstellung: Wer die Excel
seit Jahren bedient, hat sie in den Fingern. Nicht übernommen wurde Strg+A (in
der Excel die Eingabemaske); im Browser markiert es alles, und ein Kürzel, das
eine so tief verankerte Bedienung überschreibt, kostet mehr, als es einbringt.

Die Tastenkarte ist zugleich die Quelle der Abkürzungsliste im Hilfefenster.
Zwei Listen wären nach der dritten Änderung zwei verschiedene, und die falsche
stünde in der Hilfe.

### Der Handscanner entpackt im Worker, nicht im Renderer

Ein Handscanner ist für den Rechner eine Tastatur. Der Renderer schickt Text
und bekommt Fortschritt, Signaturbefund und eine Vorschau in Klartext zurück —
die Byte-Abschnitte sieht er nie. Der Grund ist die Ringgrenze: Das Entpacken
braucht einen Kompressor, und der Renderer hat kein Node. Die Sammel- und
Übersetzungsregeln stehen trotzdem in Ring 2, mit **injiziertem** Kompressor,
wie das Dateisystem in Ring 3.

Zwei Festlegungen darin sind erwähnenswert:

* **Der Signaturbefund entscheidet nichts** (§5.8.1). Eine Meldung mit
  gebrochener Signatur wird aufgenommen und angezeigt; wer sie nicht will,
  lehnt sie ab. Ein Meldeweg, der still verwirft, verliert im Zweifel eine
  echte Meldung, und das ist der teurere Fehler.
* **Ein unlesbarer Einzelscan wirft den halben Stapel nicht weg**, ein Stapel,
  dessen zusammengesetzter Payload nicht entpackbar ist, dagegen schon. Der
  erste Fall ist ein Strichcode auf demselben Tisch; zehn Minuten Scanarbeit
  dafür zu verlieren wäre die teurere Reaktion. Der zweite Fall sind Trümmer,
  auf denen der nächste Scan nicht aufsetzen darf.

Die `meldungId` ist der Inhalts-Hash des **migrierten** Bogens. Damit erzeugen
zwei Meldeköpfe, die denselben QR scannen, eine Meldung und nicht zwei —
darauf beruht die Dublettenfreiheit des ganzen Meldewegs.

### Der Monitor ist ein zweites Fenster auf dieselbe Seite

Geladen mit dem Fragment `#monitor`. Ein eigener Einstiegspunkt wäre ein
zweites Bündel für dieselben zwanzig Zeilen und ein zweiter Ort, an dem die
Brücke eingesetzt wird.

Die Vermittlung bekommt dafür eine **Naht** statt eines Electron-Imports:
`Fenstersteuerung` ist ein Port wie `Dateisystem` in Ring 3. Ohne sie wäre der
Weg „Ruf → Antwort" nicht mehr ohne Fenster prüfbar — und das ist die
Eigenschaft, an der die Prüfbarkeit des ganzen Main hängt.

Ohne Wahl geht der Monitor auf dem **zweiten** Bildschirm auf, nicht auf dem
ersten: Er hängt an der Wand, der Arbeitsplatz steht auf dem Tisch. Gibt es
nur einen, öffnet er dort — ein Fenster, das nirgends aufgeht, wäre schlechter
als eines am falschen Platz. Die Bildschirmliste wird beim Aufklappen geholt
und nicht gemerkt: Ein Kabel wird mitten im Einsatz umgesteckt, und die
Kennungen des Betriebssystems überleben ohnehin keinen Neustart.

Das Zweitfenster kennt **keine `akteId`** — es hat keinen Einsatz geöffnet und
sieht nur, was der Main an alle Fenster schiebt. Es übernimmt die Akte der
ersten Standmitteilung und fordert bei einer Lücke den vollen Stand nach. Auf
einem Monitor an der Wand ist eine falsche Zahl schlimmer als eine alte.

### Was „BDD-Szenarien grün" hier heißt

Drei Pakete verlangen sie. v1 hatte dafür eine Feature-Datei mit zehn
Szenarien und Playwright; im v2-Baum gibt es beides nicht.

**Die Szenarien sind portiert, der Läufer nicht.** 29 Szenarien in vier
Dateien: zehn zu Abschnitten, elf zu Einheiten, sieben zum Tagebuch, acht zum
Handscanner — und acht zur Tastatur. Die ersten vier fahren die echte Strecke
Bedienschritt → Speicherschicht → echtes Dateisystem → Fold → Projektion; das
zur Tastatur fährt die echten Komponenten, weil es von der Bedienung handelt
und die im Fenster stattfindet.

Der Grund gegen Playwright ist nicht Bequemlichkeit: Es braucht ein Fenster
und einen Bildschirm, die CI-Matrix aus M2.5 läuft auf drei Plattformen, und
ein Szenario, das auf zweien übersprungen wird, ist kein Nachweis — die Gates
verbieten übersprungene Tests. Der Läufer selbst gehört zu M7, wo die
Anwendung als Paket vorliegt. Das ist Befund B5 unten.

## Befunde aus der Arbeit

| Nr. | Befund | Behandlung |
|---|---|---|
| B1 | `zHierarchieEbene` heißt im Katalog `art`/`name`, der Typ `HierarchieEbene` in `werte.ts` dagegen `ebene`/`bezeichnung`. Maßgeblich ist das Schema, gegen das der Aktendienst prüft; der Typ führt in die Irre | Beim ersten Lauf aufgefallen (abgewiesene Nutzlast). Der Code folgt dem Schema, der Kommentar sagt warum. **Der Typ gehört angeglichen** — nicht von M3 aus, weil er im Zustand steht und den Hash berührt |
| B2 | `FahrzeugZustand.bezeichnung` und `PersonZustand.vorname` stehen als Pflichtfelder, sind im Katalog aber optional. Ein Fahrzeug, das nur seinen Typ meldet — und die 443 Prüfbögen enthalten solche —, lässt die Projektion abstürzen | Aufgefallen an einem echten Bogen. Die Projektion fängt es ab; geheilt wird es nicht von hier aus, aus demselben Grund wie B1 |
| B3 | `EebMeldungUebernommen` verlangt `einheitId` und `uebernommeneFelder` **in der Nutzlast**, obwohl es Form (a) ist und den Wert in `neu` trägt | Kein Fehler, sondern §2.3: Die Nutzlast benennt den Bezug, `neu` trägt den Wert. Im Code als Kommentar festgehalten, weil es beim Lesen des Katalogs stolpern lässt |
| B4 | `bogenInhaltsId(bogen)` aus ZDM §3.2 gibt es im geteilten Kern nicht | Gerechnet wird über `inhaltsHash(kanonischeSerialisierung(bogen))` des **migrierten** Bogens. Deterministisch und auf jedem Client gleich; wenn der Kern die Funktion bekommt, ist das hier die Stelle |
| B5 | **Für Johannes.** Playwright und playwright-bdd fehlen im v2-Baum; die Szenarien laufen unter Vitest gegen dieselbe Strecke | Bewusst so, Begründung oben. Der Läufer gegen die gepackte Anwendung gehört zu M7 — das ist zu bestätigen oder zu widersprechen, nicht stillschweigend zu übernehmen |
| B6 | **Für Johannes.** Der Zonenbuchstabe der NATO-Zeit („A" für MEZ) ist nirgends hinterlegt; er steht als Vorbelegung in der Monitorkomponente | Er gehört fachlich zu den Stammdaten der Führungsstelle. `Einstellungen` im Kontrakt führt bislang nur Share-Pfad und Anzeigename |
| B7 | Die Schreibweisen der Abkürzungsliste sind die der Excel, einschließlich ihrer Eigenheiten („Einsatz Leit Wagen 2") | Unverändert übernommen. Sie zu glätten bräche den Vergleich mit der Referenzlage an einer Stelle, an der niemand ihn sucht |

## Was offen bleibt

| Punkt | Wer entscheidet | Warum offen |
|---|---|---|
| **M3.5 auf einer echten zweiten Anzeige** | Johannes | Keine zweite Anzeige verfügbar. Die Rauchprobe zeigt unter Xvfb, dass das Fenster aufgeht, die Monitoransicht lädt und die NATO-Zeit steht; ob die Schrift auf einem 55-Zoll-Bildschirm aus fünf Metern lesbar ist, sagt erst der Versuch |
| **M2.4** — zwei Rechner, echter Share | Johannes | Unverändert aus M2 |
| **M0.5** — Messung am echten Share | Johannes | Unverändert aus M0 |
| **Freigabe von `KONZEPT-EREIGNISSE.md`** | Johannes | Unverändert aus M1 |
| **`.nvmrc` gegen die CI-Ketten** | Johannes | Unverändert aus M2, Befund B4 dort |
| **B1 und B2** — zwei Typen im Zielmodell | eigener Schritt | Sie stehen im `Zustand` und berühren den `zustandsHash`; die Änderung gehört mit einer `foldVersion` zusammen und nicht in ein Oberflächenpaket |
| **Der ETB-Umfang** | Johannes, entschieden | Am 2026-09-10 aus dem Umfang genommen, nachdem M3.3 fertig war. Die Ansicht bleibt lesend; Berichtigungsmaske, freier Eintrag über eine Maske und der ETB-Export in M4 entfallen. Herausgenommen wurde nichts: Der Tagebuchstrom im Aktendienst trägt auch die Rücknahme-Anzeige |

## Was M3 an M4 übergibt

* **Die Projektionen.** Druck, Status-Matrix und XLSX (M4) lesen dieselben
  Ableitungen wie die Ansichten. Was dort zu bauen ist, ist die Ausgabeform
  und nicht die Rechnung.
* **Die Spaltentabelle.** Sie trägt zu jeder Spalte die Excel-Spalte, aus der
  sie stammt. Der Paritätsvergleich gegen die Referenzlage (Entscheidung 8)
  hat damit eine Zuordnung, die nicht von Hand gepflegt wird.
* **Den Ausschnitt als Muster.** Jede weitere Ansicht bekommt ihren eigenen
  Ruf mit Filter und Ausschnitt; das geschobene Lagebild wächst weiterhin
  nicht.
* **Die Referenzdaten.** Abkürzungsliste, Vorlagenkataloge, STAN-Datensatz und
  Zeichen-Inferenz liegen vollständig in Ring 2 und sind druckbar, ohne die
  Oberfläche anzufassen.
