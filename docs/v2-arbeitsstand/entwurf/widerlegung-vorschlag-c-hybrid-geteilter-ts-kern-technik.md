# Widerlegung Vorschlag C (Hybrid, geteilter TS-Kern) — Linse: Technische Korrektheit

Status: FERTIG
Autor: Subagent „Widerleger Technik", Key `widerlegung-vorschlag-c-hybrid-geteilter-ts-kern-technik`
Prüfgegenstand: `design/vorschlag-c-hybrid-geteilter-ts-kern.md` (104,4 KB), Schwerpunkt §2.3–§2.5, §3.1–§3.10, §6, §7, §9
Maßstab: `analysis/nas-speicher-recherche.md` §1 (Primärquellen), ergänzt um `design/betriebsparameter-johannes.md`

## Gliederung

1. Prüfauftrag, Maßstab und was ich *nicht* angreife
2. Was der Vorschlag konkret festlegt (Speicher/Sync) — Kurzreferat mit Fundstellen
3. Angriffe auf den Schreibpfad (T1–T2)
4. Angriffe auf den Fold: Ordnung, Uhren, Undo, Revisionen (T3–T6)
5. Angriffe auf Betrieb, Identität, Sichtbarkeit (T7–T14)
6. Kleinere Befunde (T15–T20)
7. Was die Betriebsparameter entlasten und was sie belasten
8. Findings-Tabelle (Severity, Beleg, Rettung)
9. Verdict

---

## 1. Prüfauftrag, Maßstab und was ich *nicht* angreife

Auftrag: widerlegen, dass das Speicher-/Sync-Modell von Vorschlag C auf SMB mit 1–5 Clients, Netzabbrüchen, falschen Uhren, Abstürzen mitten im Schreiben, SMB-Caches und Windows-Dateisperren **korrekt und ohne Datenverlust** arbeitet. Dazu Fold-Determinismus, Undo, Archivierung, Migration, Offline-Nachfahren, Snapshot-Korrektheit, Fenster/Monitor, Updater ohne Internet.

**Was ich nach Prüfung *nicht* angreife** (weil die Belege den Vorschlag stützen, nicht widerlegen):

- **Die Grundentscheidung E3** (Append-only-Ereignisprotokoll mit genau einem Schreiber je Datei statt Portierung des Lockfile-Modells) ist durch die Primärquellen gedeckt und von mir nicht erschütterbar: `open(2)` schließt Multi-Writer-Append über Netz ausdrücklich aus („O_APPEND may lead to corrupted files on NFS filesystems if more than one process appends data to a file at once", nas §1.4), Rust-Std sagt dasselbe für den lokalen Fall („does not necessarily guarantee that data appended by different processes or threads does not interleave", nas §1.11) — der Ein-Schreiber-Schnitt ist damit die einzige belastbare Bauform. Umgekehrt trifft **jede** der belegten SMB-Eigenheiten den Lockpfad: FileNotFound-Cache 5 s / FileInfo- und Directory-Cache 10 s (nas §1.2), mandatory Byte-Range-Locks über CIFS (nas §1.6), Rename-EBUSY bei offener Zieldatei (nas §1.4), fehlendes `fsync` (nas §1.9). Vorschlag C §3.1 argumentiert hier korrekt und mit richtigen Fundstellen.
- **Die Ablehnung von SQLite auf dem Share** ist Faktenlage (Vorgabe; nas §1.1, §2), ebenso der Lost-Update-Befund des heutigen JSON-Stores (nas §3, `connection.ts:47-60`).
- **Polling statt Watcher** (§3.4): durch nas §1.5 belegt (Node-Doku „may not be reliable" auf NFS/SMB; `notify` „may not emit any events").
- **UDP nur als Beschleuniger** (§3.4): durch nas §1.10 belegt (Broadcast fällt bei WLAN-Client-Isolation, Multi-Adapter, Firewall aus).
- **`fsync` nach jedem Anhängen** (§3.2): durch nas §1.9 belegt (SMB2 FLUSH hat definierte Semantik).

Die Angriffe unten richten sich deshalb nicht gegen die Bauform, sondern gegen die **Vollständigkeit und Widerspruchsfreiheit der Regeln**, mit denen der Vorschlag diese Bauform ausfüllt. Das ist keine Formalie: der Vorschlag benennt selbst „Fold-Regelwerk unvollständig → **stiller** Falschzustand" als R1 und als schlimmsten denkbaren Fehler in einem Führungswerkzeug (§9 R1). Ich zeige, dass R1 im vorgelegten Text bereits an mindestens fünf Stellen eingetreten ist.

Konvention: **T-Nummern** sind meine Findings. Wo der Vorschlag ein Problem bereits adressiert, sage ich das und lasse es weg oder stufe es ab.

---

## 2. Was der Vorschlag festlegt — Kurzreferat mit Fundstellen

Nur, damit die Angriffe eindeutig zuordenbar sind; Details siehe Vorschlag.

| Festlegung | Fundstelle |
|---|---|
| Dateilayout: `ereignisse/<clientId>.<segment>.jsonl`, „EIN Schreiber je Datei"; neues Segment „ab 8 MB **oder je Programmstart**" | C §3.2 |
| Harte Regeln: nur `create_new` (`wx`) und `append`; einzige überschriebene Datei = **eigene** Präsenzdatei; `fsync` nach jedem Ereignis; Zeilenformat `<len>\t<crc32>\t<json>\n`; Leser **verwerfen eine unvollständige letzte Zeile**; Besitzer **kürzt beim Start** auf die letzte gültige Zeile | C §3.2 |
| Start-Prüfung: Ende der Share-Datei gegen lokalen Übertragungsoffset; bei Abweichung **neue clientId + neue Dateigeneration** | C §3.2, R12 |
| Ereignis: `id = clientId:seq`, `hlc`, `wanduhr` (nur Anzeige), `widerruftId`, `vorherHash` = „Hash der vorherigen Zeile **DERSELBEN Datei**" | C §3.3 |
| Sichtbarkeit: Poll 2 s, `readdir` + je bekannter Datei `open`+`read` ab Offset; UDP-Unicast an Präsenz-Peers | C §3.4 |
| Uhren: HLC, Sortierschlüssel `(physisch, zaehler, clientId)` lexikografisch; Abweichung > 5 min → Ereignis **trotzdem angenommen**, UI warnt; alle TTL-Mechanismen entfallen | C §3.5 |
| Fold: reine Funktion über die **deterministisch sortierte Gesamtmenge**; Regeln K1–K12; Konflikthinweise sind Daten, keine Dialoge | C §3.6 |
| Schnappschuss: ≥ 5.000 Ereignisse und 60 s Ruhe → `create_new`, Inhalt „Zustand + Versionsvektor + blake3" | C §3.6 |
| Offline: local-first, lokal schreiben + `fsync`, dann ab `hochgeladenOffset` anhängen; **bei Fehlschlag „bleibt der Offset stehen und der Versuch wiederholt sich"** | C §3.7 |
| Archiv: `archiv.marker` per `create_new`; danach lehnt der Fold neue Ereignisse ab (K10); ZIP, Hash-Prüfung, Quellordner verschieben | C §3.8 |
| Meldekopf: Weg A direkt, Weg B `.s1meld`-Bündel (= „exakt ein Ereignisdatei-Segment", per `create_new` abgelegt, Besitzer bleibt der Meldekopf), Weg C QR; Idempotenz über `bogenInhaltsId` (K6) | C §3.9 |
| Prozessmodell: **ein Kern-Worker je geöffnetem Einsatz**, darin `@s1/speicher`, Fold, Projektionen **und UDP** | C §2.3 |
| Lokal je Client: `%APPDATA%\S1-Control\` (Spiegel, `einstellungen.json` mit **clientId**, `uebertragung.json`) | C §3.2, §2.3 |
| Update ohne Internet: Ablage `programm\` auf demselben Share, `aktuell.json` mit SHA-256, Installer aus `%APPDATA%\...\update-cache` starten | C §2.5 |
| Property-Tests: Ordnungsunabhängigkeit, Idempotenz, **„Präfix-Konsistenz: `falte(E_1..n)` stimmt mit dem inkrementellen Fold überein … das ist der Live-Pfad"**, Schnappschuss-Äquivalenz | C §7.2 |

---

## 3. Angriffe auf den Schreibpfad

### T1 — Der Live-Pfad ist für die nicht-LWW-Regeln nicht ordnungsunabhängig; die eigene Property prüft den falschen Fall  ·  **blocker**

**Angegriffene Behauptung.** C §3.6: „Der Fold ist eine reine Funktion `falte(ereignisse) -> …` über die **deterministisch sortierte Gesamtmenge**. Daraus folgt Ordnungsunabhängigkeit (dieselbe Menge ⇒ derselbe Zustand, egal in welcher Reihenfolge sie ankam)." Und C §7.2 Eigenschaft 3: „`falte(E_1..n)` stimmt mit dem inkrementellen Fold überein, der Ereignis für Ereignis anwendet (**das ist der Live-Pfad**)."

Diese beiden Sätze sind zusammen nicht haltbar. Der erste beschreibt eine Mengenfunktion über die *sortierte* Folge, der zweite einen inkrementellen Fold in **Ankunftsreihenfolge**. Ankunftsreihenfolge ist über SMB systematisch *keine* Präfixfolge der HLC-Sortierung: C §3.4 sagt selbst, fremde Ereignisse erscheinen „typisch 2–4 s, bis **10 s** für die erste Datei eines neuen Clients". Jeder eigene Tastendruck in dieser Zeitspanne erzeugt ein Ereignis mit größerem HLC als das gleich darauf eintreffende fremde. Out-of-order-Eintreffen ist damit nicht der Sonderfall, sondern der **Normalfall bei jedem Poll**.

**Warum das nicht harmlos ist.** Für K1 (LWW je Feld) ist die Ankunftsreihenfolge egal, wenn jedes Feld seinen Gewinner-HLC mitführt — das ist ein Register und kommutativ. Für die übrigen Regeln nicht:

*Schrittfolge (K3, Abschnitts-Zyklus).* Vorgabe C §3.6 K3: „Ereignis mit **kleinerem HLC gewinnt**, das andere wird No-Op mit Hinweis."
1. Baum: Abschnitte X und Y sind Geschwister.
2. Client B erzeugt `AbschnittUmgehaengt{Y unter X}` mit hlc=3 (B ist offline oder auf der langsamen Seite des Polls).
3. Client A erzeugt `AbschnittUmgehaengt{X unter Y}` mit hlc=5 und wendet es **sofort lokal** an (§2.3: „Die UI wartet auf die neue Projektionsversion, nicht auf den Share"). Kein Zyklus zu diesem Zeitpunkt → wird angewandt. Zustand A: X unter Y.
4. 4 s später trifft B's hlc=3 bei A ein. Inkrementell angewandt ergäbe es einen Zyklus → nach K3 gewinnt „kleinerer HLC", aber es ist das **später eingetroffene**; wendet A es an, muss es sein eigenes hlc=5 zurücknehmen — das ist kein inkrementeller Schritt mehr, sondern ein Rollback.
5. Client B hat die Ereignisse in der Reihenfolge 3, 5 gesehen: es wendet 3 an (Y unter X), dann 5 (Zyklus → No-Op). Zustand B: **Y unter X**.
6. Ohne Rollback zeigt A dauerhaft „X unter Y", B dauerhaft „Y unter X". **Zwei Führungsstellen sehen zwei verschiedene Führungsstrukturen, ohne dass irgendein Fehler angezeigt wird.**

Dasselbe Muster trifft K2 (Verschieben in einen inzwischen aufgelösten Abschnitt — ob die Einheit im Zielabschnitt oder im Auffangabschnitt landet, hängt davon ab, ob das Auflösungsereignis beim Anwenden schon bekannt war), K5 (Tombstone gewinnt — beim inkrementellen Anwenden einer *nach* dem Tombstone eintreffenden, aber HLC-älteren Bearbeitung entsteht ein Feld auf einem gelöschten Objekt) und K9 (Teilen/Zusammenführen; `freierTeilSchluessel()` vergibt Schlüssel abhängig vom Zustand zum Zeitpunkt des Aufrufs — bei anderer Anwendungsreihenfolge fallen andere Schlüssel).

**Die vorgesehene Absicherung greift nicht.** Property 3 formuliert „`falte(E_1..n)`" — das ist ein **Präfix der sortierten Folge**. Genau dieser Fall tritt live nie problematisch auf. Der gefährliche Fall — „wende in Ankunftsreihenfolge an, die keine Sortierpräfixe sind" — wird von keiner der vier Eigenschaften erfasst. Eigenschaft 1 (Ordnungsunabhängigkeit) testet `falte(shuffle(E)) == falte(E)`, also die **Batch**-Funktion, die intern ohnehin sortiert; sie ist damit trivial erfüllt und beweist über den Live-Pfad nichts. Der Vorschlag hat also einen Property-Test, der grün ist, während der Betriebspfad divergiert — das ist genau R15 („Grüne Tests ohne Aussagekraft sind gefährlicher als keine"), nur eine Ebene tiefer.

**Kostenfolge, die im Vorschlag fehlt.** Die saubere Auflösung ist: **bei jedem eintreffenden Ereignis, dessen HLC kleiner ist als der größte bereits angewandte, ab dem letzten Schnappschuss neu falten** (Rebase). Damit stimmt der Live-Zustand wieder mit der Mengenfunktion überein. Der Preis ist ein Re-Fold pro Poll-Zyklus im Normalbetrieb. Größenordnung nach nas §4: „Fold in Node < 500 ms [Schätzung]" für 50.000 Ereignisse; bei realistischen 272 Einheiten × ~10 Ereignissen (Betriebsparameter/Kritik §3.1) sind es Millisekunden — das ist **beherrschbar**, steht aber nirgends, ist nicht budgetiert und interagiert mit T19 (die Schnappschuss-Schwelle 5.000 wird real nie erreicht, es gibt also nie einen Schnappschuss, ab dem man neu falten könnte — man faltet immer alles).

**Was den Vorschlag rettet.** Eine der beiden Varianten, explizit entschieden und getestet:
(a) **Rebase-Regel:** „Trifft ein Ereignis mit HLC < max(angewandt) ein, wird der Zustand ab dem letzten Schnappschuss neu gefaltet"; Schnappschuss-Schwelle drastisch senken (z. B. alle 500 Ereignisse oder alle 60 s), damit der Rebase billig bleibt; Property 3 ersetzen durch „**falte in beliebiger Ankunftsreihenfolge mit Rebase == falte(sortiert)**", generiert mit einem Ankunfts-Scheduler, der Verzögerungen bis 10 s simuliert.
(b) **Alle Regeln registerförmig machen:** K3/K2/K9 nicht als „wer zuerst kommt" formulieren, sondern als Projektion über die *Endmenge* (Elternzuweisung je Abschnitt ist ein LWW-Register; Zyklen werden **beim Projizieren** deterministisch aufgebrochen, nicht beim Anwenden). Das ist die Bauform, die `LoroTree` fertig mitbringt (nas §5) — der Vorschlag verwirft CRDTs in §3.1/§5 als „Zusatz, nicht Ersatz", übersieht dabei aber, dass genau das Baum-Verschiebeproblem der Teil ist, den eine CRDT löst und ein handgeschriebener Fold hier nicht löst.
In jedem Fall gehört das in **M0** und in dessen Abnahmekriterium („zwei Prozesse, gemeinsames Verzeichnis, künstliche Ankunftsverzögerung ⇒ identischer Zustand nach Konvergenz"). Stufe 2 der Mehrclient-Simulation (§7.3) kommt dem nahe, prüft aber laut Text nur „nach Konvergenz müssen alle Instanzen denselben Zustand melden" für **Stufe 1 in-process**; für Stufe 2 sind Störungen aufgezählt, aber Zustandsgleichheit nicht als Abnahmekriterium genannt.

### T2 — Wiederaufnahme nach teilweise übertragenem Anhängen zerstört die Mitte einer fremdlesbaren Datei  ·  **schwer**

**Angegriffene Behauptung.** C §3.2: „Leser prüfen `len` und `crc32` und **verwerfen eine unvollständige letzte Zeile** … Teilschreiben ist damit harmlos." Und C §3.7 Punkt 2: „Schlägt er fehl (Timeout 5 s, `ENOENT`, `EBUSY`, Netz weg), **bleibt der Offset stehen und der Versuch wiederholt sich**."

Beide Sätze zusammen erzeugen einen Korruptionspfad, den keine der beiden Schutzmaßnahmen abdeckt.

**Schrittfolge.**
1. Lokale Datei und Share-Datei sind bei Offset 40.000 synchron, `hochgeladenOffset = 40000`.
2. Der Client schreibt E101 (300 B) lokal + `fsync` — die UI meldet fertig (§2.3).
3. Der Übertragungsschritt hängt 300 B an die Share-Datei an. Der SMB-Client überträgt 150 B, dann bricht die Verbindung ab (SessTimeout 60 s, nas §1.8) oder das NAS quittiert nicht. Node meldet einen Fehler; auf dem Server liegen aber bereits 150 B. (Dass ein abgebrochener Schreibvorgang teilweise ankommt, ist die Grundannahme, auf der die gesamte Zeilenprüfsumme beruht — der Vorschlag setzt sie in §3.2 selbst voraus.)
4. Nach §3.7 bleibt `hochgeladenOffset = 40000`. Der Versuch wiederholt sich.
5. Der Wiederholungsversuch **hängt an** (`append`), er schreibt nicht an Offset 40.000. Die Share-Datei enthält jetzt: gültige Zeilen bis 40.000, **150 B Zeilenrumpf**, dann die vollständige Zeile E101.
6. Ein fremder Leser, der bei 40.000 weiterliest, liest `len`/`crc32` aus dem Rumpf, bekommt Unsinn und steht vor einer defekten Zeile, die **nicht die letzte** ist. Die Regel „unvollständige letzte Zeile verwerfen" greift nicht. Ein Resynchronisationsverfahren („bis zum nächsten `\n` vorspulen") ist nirgends festgelegt; ohne es bleibt der Leser für diese Datei dauerhaft stehen — und damit blind für **alle** weiteren Ereignisse dieses Clients, inklusive aller Meldungen eines Meldekopfs.
7. Auch der Besitzer repariert es nicht: „der Besitzer kürzt **beim Start** auf die letzte gültige Zeile" — das ist ein Startvorgang, kein Laufzeitpfad. Der Sitzungs-Weiterbetrieb hat keine Prüfung.
8. Die Start-Prüfung aus §3.2 („Ende der Share-Datei passt nicht zum lokalen Übertragungsoffset → **neue clientId**, neue Dateigeneration") greift erst beim nächsten Programmstart, und ihr Heilmittel ist für einen anderen Fall gebaut (Image-Klon, R12). Sie lässt die korrupte Datei mit einer defekten Zeile in der Mitte liegen.

**Verschärfend:** Der Fehlerfall ist nicht exotisch. Er tritt bei jedem NAS-Stocken > 5 s auf (der Vorschlag setzt den Timeout selbst auf 5 s, §2.3/§3.7), also genau in der Lage, für die local-first gebaut wurde.

**Was den Vorschlag rettet.** Drei Regeln, alle billig:
1. **Rückleseprüfung vor jeder Wiederaufnahme:** vor dem erneuten Anhängen die **echte** Länge der eigenen Share-Datei ermitteln — nicht per `stat` (FileInfoCache bis 10 s, nas §1.2), sondern durch einen **Daten-Read ab `hochgeladenOffset`** (Daten-Reads umgehen den Attribut-Cache, nas §1.2/§4). Stimmen die dort liegenden Bytes mit dem Erwarteten überein, Offset vorziehen; liegt ein Rumpf da, **nicht anhängen**, sondern das Segment schließen und ein neues beginnen (`create_new`, gleicher Besitzer, `segment+1`, erste Zeile trägt den Hash der letzten gültigen Zeile des Vorgängersegments — siehe T9).
2. **Leser-Resynchronisation als festgelegte Regel:** bei CRC-/Längenfehler bis zum nächsten `\n` vorspulen und weiterlesen, den übersprungenen Bereich als Konflikthinweis im ETB ausweisen. Das ist zulässig, weil JSON keine rohen Zeilenumbrüche enthält (`\n` wird als zwei Zeichen kodiert) — diese Begründung gehört ins Konzeptdokument, sonst ist die Regel nicht überprüfbar.
3. **Fehlerinjektion Stufe 3 (§7.3) um „Kurzschreiben auf dem Share, dann Wiederaufnahme" erweitern** — der Vorschlag listet „Kurzschreiben" bereits als Injektionsfall, aber nicht die Kombination mit dem Retry-Pfad, und nur „Datei ist plötzlich kürzer", nicht „Datei ist plötzlich länger als mein Offset".

---

## 4. Angriffe auf den Fold: Undo, Archiv, Revisionen, Uhren

### T3 — Undo als neues Ereignis mit größerem HLC vernichtet fremde, neuere Werte  ·  **schwer**

**Angegriffene Behauptung.** C §3.6 K12: „Undo = **Kompensationsereignis** `widerruftId`; nur eigene Ereignisse, nur die letzten *n* der eigenen Sitzung". C stellt das als Fortschritt gegenüber v1 dar („v1 hat Undo nur für MOVE und im Mehrclient undefiniert"). Die Semantik der Kompensation ist aber nirgends definiert — und die naheliegende Lesart („ein Ereignis, das den alten Wert zurückschreibt") ist im Mehrclient-Betrieb falsch.

**Schrittfolge.**
1. A meldet für Einheit E die Stärke 1/2/9 (Ereignis a1, hlc=5).
2. B korrigiert nach Rückfrage auf 1/3/9 (Ereignis b1, hlc=7). Nach K1/K4 (LWW absolut) gilt 1/3/9. Richtig.
3. A merkt, dass es die falsche Einheit war, und drückt Strg+Z. Nach K12 entsteht ein Kompensationsereignis c1 mit `widerruftId = a1` — und zwangsläufig mit **hlc = 9**, weil HLC monoton ist.
4. Wenn c1 den Vorzustand von a1 (0/0/0) als Wert schreibt, gewinnt es per LWW gegen b1. **B's Korrektur ist weg**, ohne Konflikthinweis, weil formal gar kein Konflikt vorliegt: das jüngste Ereignis hat gewonnen.
5. B sieht die Stärke auf 0/0/0 zurückspringen und weiß nicht warum. Er trägt erneut 1/3/9 ein. A drückt nochmal Strg+Z (nächstes Ereignis der Sitzung) …

Dasselbe gilt schärfer für Strukturereignisse: das Undo eines `AbschnittAngelegt`, in den ein anderer Client zwischenzeitlich zwölf Einheiten verschoben hat, löst über K2 eine stille Umsortierung von zwölf fremden Einheiten in den Bereitstellungsraum aus. K2 verhindert Datenverlust, aber der Nutzer hat „meine letzte Aktion rückgängig" gedrückt und eine Lageänderung für andere ausgelöst.

**Warum das nicht durch R1/K12 abgedeckt ist.** K12 regelt *wer* was widerrufen darf, nicht *was ein Widerruf bedeutet*. Der Vorschlag nennt in §7.2 auch keine Property für Undo (die vier Eigenschaften erwähnen `widerruftId` nicht).

**Was den Vorschlag rettet.** Kompensation **nicht als Mutation, sondern als Filter** definieren: `widerruftId` markiert ein Ereignis als „nicht wirksam"; der Fold entfernt es aus der Menge und faltet neu. Damit ist Undo (a) ordnungsunabhängig, (b) idempotent, (c) semantisch exakt „so, als hätte ich es nie getan" — b1 bleibt der jüngste Schreiber und gewinnt weiterhin. Das setzt genau die Rebase-Fähigkeit voraus, die T1 ohnehin verlangt; beide Findings haben dieselbe Rettung. Zusätzlich: Undo, das fremde Zustände berührt, muss **vor** der Ausführung anzeigen, was es bei anderen bewirkt („12 Einheiten würden in den Bereitstellungsraum zurückfallen — trotzdem?"), und einen Ereignisvermerk für die anderen Clients erzeugen. Und eine Property: `falte(E)` mit `E' = E ∪ {widerruf(e)}` muss gleich `falte(E \ {e})` sein.

### T4 — Archivierung kollidiert mit dem local-first-Nachfahren; K10 verwirft entweder legitime Arbeit oder macht das Archiv falsch  ·  **schwer**

**Angegriffene Behauptung.** C §3.6 K10: „Ereignis **nach** `archiv.marker` → Fold **lehnt ab** und erzeugt Hinweis". C §3.8: „Danach lehnt der Fold neue Ereignisse ab (K10). Ein Client erzeugt `archiv\<ordner>.zip` … und prüft die Hashes, bevor der Quellordner **verschoben** wird."

„Nach" ist zweideutig, und beide Auflösungen sind defekt:

*Auslegung 1 — „nach" = HLC größer als der Marker.* Ein Meldekopf, der nach §3.7 Punkt 5 einen Tag ohne Share gearbeitet hat, hat Ereignisse mit HLC **vor** dem Marker. Sie werden also angenommen — aber das ZIP ist da längst geschrieben, hashgeprüft und der Quellordner verschoben. Die Ereignisse haben kein Ziel mehr; ihr Upload-Ziel (`ereignisse/`) existiert nicht mehr → `ENOENT` → nach §3.7 „bleibt der Offset stehen und der Versuch wiederholt sich" — **eine Endlosschleife auf einen gelöschten Pfad**, und die Arbeit eines Tages existiert nur noch lokal auf dem Meldekopf-Laptop, wo niemand sie sucht. Das Archiv ist zugleich nachweislich unvollständig, obwohl seine Hashes stimmen.

*Auslegung 2 — „nach" = später eingetroffen.* Dann verwirft der Fold ein Tagewerk legitimer, HLC-korrekt einsortierbarer Ereignisse mit einem Hinweiszettel. Das ist Datenverlust per Regel.

**Zusatzbefund:** Der Marker ist eine **nackte Datei** (§3.2 `archiv.marker`, `create_new`), kein Ereignis. Er hat damit keinen HLC, keinen Akteur und keinen Platz im ETB — obwohl „Einsatz archiviert" der bedeutendste Vorgang im Einsatztagebuch ist (N-6 „unlöschbare Historie", `excel-handbuch-anforderungen.md` §7). Und weil `create_new` über SMB serverseitig entschieden wird, aber der FileNotFound-Cache 5 s beträgt (nas §1.2), kann ein zweiter Client bis zu 5 s lang glauben, der Marker existiere noch nicht — irrelevant für die Atomarität des Anlegens, aber relevant dafür, dass zwischen Marker und ZIP ein Zeitfenster liegt, in dem andere Clients ungestört weiterschreiben.

**Was den Vorschlag rettet.**
1. Archivierung als **Ereignis** `EinsatzArchiviert{hlc, akteur}` in der Ereignisdatei des archivierenden Clients; die Marker-Datei bleibt höchstens als schneller Hinweis für Leser, ist aber nicht die Wahrheit.
2. Regel präzisieren: *wirksam* wird die Archivierung für Ereignisse mit **HLC > Marker-HLC**. Später eintreffende Ereignisse mit kleinerem HLC werden **angenommen und normal gefaltet**.
3. Vor dem ZIP eine **Ruhephase mit Quittung**: Archivieren ist erst erlaubt, wenn jeder in `praesenz/` gelistete Peer entweder seinen `hochgeladenOffset == Dateilänge` gemeldet hat oder als „seit > X abwesend" markiert ist; die UI listet auf, wer noch aussteht. Das nutzt die Präsenzdatei erstmals für etwas Belastbares.
4. **Der Quellordner wird nicht gelöscht, sondern nur umbenannt/verschoben, und ein `nachzuegler/`-Verzeichnis bleibt bestehen**; trifft doch noch ein Segment ein, wird das ZIP neu erzeugt und die Versionsnummer des Archivs hochgezählt. Bei 1–5 Clients (Betriebsparameter) ist die Ruhephase in Sekunden erledigt — das kostet fast nichts.

### T5 — „Neueste Revision zählt" (K7) ist nicht definiert: HLC oder fachliche Meldezeit? Bei falscher Uhr eines Meldekopfs entsteht eine stille Falschstärke  ·  **schwer**

**Angegriffene Behauptung.** C §3.6 K7: „Neue Meldung derselben Einheit (Mehrtageslage) → **Revision stapeln**, **neueste zählt in Summen**, alte bleiben lesbar." C §3.5: „Technische Ordnung ausschließlich über eine HLC … **Fachliche** Zeitpunkte (Meldezeit, Eintreffen …) sind **Nutzereingaben** … Sie werden **nie zur Ordnung verwendet**."

Damit ist die Ordnung der Revisionen zwingend die HLC — und die HLC eines Meldekopf-Geräts, das im Feld ohne NTP steht, ist an seine falsche Uhr gekoppelt (HLC hält die physische Komponente „nahe an der besten gesehenen Uhr", nas §1.11; ein Gerät, das *nie* mit den anderen spricht, sieht keine bessere Uhr).

**Schrittfolge.**
1. Meldekopf BR 1 arbeitet nach §3.9 Weg B offline; seine Uhr geht 6 h nach (Standby/CMOS, nas §8.2 nennt „Minuten bis Stunden" als realistisch).
2. 08:00 echte Zeit: Bogen für Einheit „1. Bergungsgruppe" mit 1/2/9. Ereignis hlc.physisch ≈ 02:00.
3. 12:00 echte Zeit: neuer Bogen derselben Einheit, jetzt 0/1/4 (Ablösung). Ereignis hlc.physisch ≈ 06:00.
4. Zwischendurch hat die FüSt um 09:00 aus einem Funkspruch eine Revision 1/2/8 selbst erfasst (hlc.physisch = 09:00).
5. Bündel wird um 13:00 per USB eingespielt. Nach HLC-Ordnung ist die **neueste** Revision die der FüSt von 09:00 (hlc 09:00 > hlc 06:00). Die **tatsächlich neueste Meldung** (12:00, 0/1/4) wird in den Summen ignoriert und liegt nur in der Historie.
6. Die Gesamtstärke des Abschnitts ist ab jetzt dauerhaft um 1/1/4 falsch. Sichtbar ist nichts: K4 erzeugt einen Konflikthinweis nur, „wenn zwei Clients **binnen 120 s** verschiedene Absolutwerte melden" — hier liegen Stunden dazwischen.

Dasselbe Problem hat der Weg C (QR): der Bogen trägt seine eigene Erfassungszeit, das Ereignis bekommt aber die HLC des scannenden FüSt-Rechners — ein am Vortag ausgefüllter, heute gescannter Bogen wird damit zur „neuesten" Revision.

**Warum das nicht schon adressiert ist.** §3.9 verweist auf `meldung-diff.ts` und die Revisionsstapelung des Schwesterprodukts, sagt aber nichts über die Ordnung. `einsaetze.ts:264` `neuesteJeEinheit()` ist ein Fold über die dortige Sammlung — welche Zeitachse er benutzt, ist im Vorschlag nicht referenziert, und beim Einbetten in einen HLC-geordneten Ereignisstrom stellt sich die Frage neu.

**Was den Vorschlag rettet.** Zwei Zeitachsen explizit trennen und **beide** benennen:
- *Technische Ordnung* (welches Ereignis gewinnt bei gleichzeitiger Bearbeitung **desselben Feldes**): HLC. Bleibt wie beschrieben.
- *Fachliche Ordnung von Meldungen* („welcher Meldestand ist der aktuelle"): die **Meldezeit auf dem Bogen** (Nutzereingabe, im EEB-Datenmodell vorhanden), HLC nur als Tie-Break. Das widerspricht §3.5 („fachliche Zeit nie zur Ordnung") — der Satz ist in dieser Absolutheit falsch und muss auf „nie zur *technischen* Ordnung" eingeschränkt werden. Determinismus bleibt gewahrt, weil die Meldezeit ein Datenfeld des Ereignisses ist und für alle Clients gleich aussieht.
- Zusätzlich: K4 vom Zeitfenster (120 s) lösen und stattdessen **jede** Revision, deren Meldezeit älter ist als die aktuell gültige, als Konflikthinweis führen („Meldung von 12:00 ist älter als der gültige Stand von 09:00 — übernehmen?"). Das entspricht der Quittierungslogik gelb→grün, die §3.9 ohnehin baut.
- Eine Property: „Revisionsordnung ist unabhängig von der Uhr des meldenden Geräts" — testbar, indem der Simulator die Uhr eines Prozesses verstellt (Stufe 2 hat den Fall bereits als „+37 Minuten", prüft aber laut Text nur die HLC-Deckelung, nicht die fachliche Summe).

### T6 — Die HLC-Deckelung ist nicht ausdefiniert: „trotzdem annehmen" lässt offen, ob die lokale Uhr mitzieht  ·  **schwer**

**Angegriffene Behauptung.** C §3.5: „Übersteigt ein empfangenes Ereignis die lokale Uhr um mehr als **5 Minuten**, wird es **trotzdem angenommen** (Einsatzbetrieb geht vor), aber die UI zeigt … an." Als Beleg dient `uhlc`, dessen `update_with_timestamp()` in genau diesem Fall einen `ExceedingDeltaError` liefert (nas §1.11) — also das Gegenteil tut.

Zwei Auslegungen, beide mit Folgen, und der Vorschlag entscheidet sich nicht:

*(a) Annehmen **ohne** die lokale HLC vorzuziehen.* Dann bricht die zentrale HLC-Eigenschaft: alle folgenden lokalen Ereignisse tragen einen **kleineren** HLC als das bereits gesehene fremde. Bei LWW je Feld (K1) heißt das: **jede Korrektur des vom Fremdgerät gesetzten Wertes verliert**, dauerhaft, bis die reale Zeit aufgeholt hat. Feldbild: „Die Stärke springt immer zurück, ich kann sie nicht ändern." Das ist derselbe Schaden wie ein Lost Update, nur unbehebbar durch Wiederholung.

*(b) Annehmen **und** die lokale HLC vorziehen* (Standard-HLC: `l = max(l, l_msg, pt)`). Dann funktioniert LWW, aber die 5-Minuten-Grenze ist wirkungslos: ein einziges Gerät mit +6 h zieht **alle** Clients 6 h nach vorn, und sie bleiben dort, bis die Echtzeit aufholt. Folgen: (i) die Warnung „Uhr weicht ab" erscheint danach bei **allen** Rechnern, auch den korrekten; (ii) jedes TTL-artige Verhalten, das doch noch auf HLC-Physik schaut, kippt; (iii) mit NTP (Betriebsparameter) korrigiert sich die Systemuhr zurück, die HLC aber nicht — der Abstand zwischen `wanduhr` und `hlc.physisch` bleibt sichtbar 6 h groß, was in einer Ereignisliste erklärungsbedürftig ist.

Zusätzlich: **NTP kann die Uhr rückwärts stellen** (Step). Der Vorschlag begründet HLC mit „Uhren ohne NTP" (§3.5-Überschrift), aber laut Betriebsparameter ist NTP vorhanden — der eigentliche Grund für HLC ist damit nicht mehr „grob falsche Uhren", sondern „nicht-monotone Uhren und Kausalität". Das ist eine bessere Begründung, aber der Vorschlag führt sie nicht, und der Test dazu („Uhr springt während des Betriebs um −3 s zurück, Ereignisse bleiben streng geordnet") fehlt in §7.3.

**Was den Vorschlag rettet.** Auslegung (b) explizit festschreiben, die 5-Minuten-Grenze **nur** als Anzeigeschwelle deklarieren (nicht als Verarbeitungsschwelle), zusätzlich eine **Obergrenze für das Vorziehen** einführen (z. B. Ereignisse mit physischer Komponente > lokal + 24 h werden angenommen, ziehen die lokale Uhr aber nur bis lokal + 5 min vor und werden im ETB als „Zeitstempel unplausibel" markiert) — das ist genau das Muster von `uhlc`, nur ohne Ablehnung. Dazu je eine Property: (i) lokale HLC ist streng monoton auch bei rückwärts springender Systemuhr; (ii) nach Empfang eines Ereignisses mit HLC h trägt jedes danach lokal erzeugte Ereignis einen HLC > h.

---

## 5. Angriffe auf Betrieb, Identität, Sichtbarkeit

### T7 — Das Poll-Verfahren skaliert mit der Zahl der Programmstarts, nicht mit der Zahl der Clients — und erzeugt genau das Latenzprofil, an dem SQLite gescheitert ist  ·  **mittel**

**Angegriffene Behauptung.** C §3.2: „neues Segment **ab 8 MB oder je Programmstart**". C §3.4: „`readdir(ereignisse/)` für neue Dateien, dann **je bekannter Datei `open` + `read`** ab bekanntem Offset", alle 2 s.

**Rechnung.** Eine dreitägige Lage, 4 schreibende Arbeitsplätze, App wird pro Tag dreimal neu gestartet (Akkuwechsel, Standby-Absturz, Update): 4 × 3 × 3 = **36 Segmentdateien**, dazu Schnappschüsse und Bündeldateien. Jeder Client führt alle 2 s: 1× `readdir` + 36× `open` + 36× `read` + 36× `close` ≈ **109 SMB-Roundtrips je 2 s**. Bei 1 ms RTT sind das 0,1 s — unauffällig. Bei WLAN mit 15–25 ms RTT (Einsatz-WLAN, das die Recherche als Regelfall annimmt, nas §1.10) sind es **1,6–2,7 s pro Zyklus** — der Poll wird zum Dauerlast-Job und läuft in sich selbst hinein, mit vier Clients gleichzeitig auf demselben NAS.

Das ist relevant, weil der einzige belastbare Erfahrungswert des Projekts genau hier liegt: der SQLite-Betrieb ist laut Betriebsparameter nicht an Korruption gescheitert, sondern daran, dass er **„super langsam"** war. Die Ursache dort waren Lock-Roundtrips je Transaktion (nas §2 „über SMB durch Lock-Roundtrips schlecht"). Das Ereignisprotokoll vermeidet die Locks, ersetzt sie aber durch Öffnungs-Roundtrips je Datei je Poll. Der Vorschlag erkennt das Messproblem (R2, §3.4 „Nicht gemessen und offen", M0), aber er entwirft die Zugriffsstruktur, ohne die Zahl der Dateien zu begrenzen — und „neues Segment je Programmstart" ist eine Entscheidung, die die Dateizahl **ohne fachlichen Nutzen** vervielfacht.

**Was den Vorschlag rettet.**
1. **Segmentwechsel nur nach Größe** (8 MB), nicht je Programmstart. Ein Programmstart braucht kein neues Segment, wenn die Startprüfung aus §3.2 ohnehin die Dateilänge verifiziert (T2 verlangt diese Prüfung ohnehin für den Laufzeitpfad).
2. **Dateihandles über Poll-Zyklen offen halten** statt `open`/`close` je Zyklus: ein `read` auf einem offenen Handle ist ein Roundtrip statt drei; SMB2 hält den Handle (durable handles auf Synology sind ein dokumentierter Schalter, nas §1.8).
3. **Abgeschlossene Segmente nicht mehr abfragen**: ein Segment, dessen Nachfolger existiert und dessen letzte Zeile gelesen ist, ist endgültig — es aus dem Poll-Satz nehmen. Damit wächst der Poll-Satz mit der Zahl **aktiver** Clients (1–5, Betriebsparameter), nicht mit der Historie.
4. `skripte/smb-latenz.mjs` (M0) muss **`readdir` mit 40 Einträgen** und **`open+read+close` in Serie** messen, nicht nur Einzeloperationen — sonst misst M0 die falsche Größe.

### T8 — Keine Regel für globale Ereignis-Eindeutigkeit; Weg B (`.s1meld`) kann Sequenzräume duplizieren  ·  **mittel**

**Angegriffene Behauptung.** C §3.9 Weg B: „Der Meldekopf exportiert `…s1meld` — inhaltlich **exakt ein Ereignisdatei-Segment**. Die FüSt legt es per `create_new` unter `ereignisse/` ab; Besitzer bleibt der Meldekopf … **Fold und Idempotenz (K6) machen doppeltes Einspielen harmlos**."

K6 stellt Idempotenz aber ausschließlich über `bogenInhaltsId` her — also **nur für Meldungsereignisse**. Ein Meldekopf-Segment enthält nach §3.9/§4 aber auch andere Ereignisse (Zuordnung `MeldungEinheitZugeordnet`, Übernahme, Korrekturen, ggf. Abschnittsereignisse im Meldekopf-Modus). Für die gibt es keine Inhaltsidentität, nur `id = clientId:seq` — und **nirgends im Vorschlag steht die Regel „Ereignisse mit gleicher `id` werden entduplziert"**. Ohne sie:

*Schrittfolge.* Meldekopf exportiert um 10:00 ein Bündel mit den Ereignissen 1–50 (USB-Stick an den Kraftfahrer) und um 12:00 ein zweites mit 1–80 (weil ein Segment als Ganzes exportiert wird und inzwischen gewachsen ist). Beide Bündel werden abgelegt — `create_new` verhindert die Kollision nur bei identischem Zielnamen, und die Namen tragen nach §3.9 einen Zeitstempel. Ergebnis: die Ereignisse 1–50 liegen **zweimal** unter zwei Dateinamen mit **derselben `clientId`**. Die Hash-Kette prüft nur „vorherige Zeile **DERSELBEN Datei**" (§3.3) und ist in beiden Dateien gültig. Der Fold sieht 130 Ereignisse statt 80. Für LWW-Felder ist das harmlos (identische Werte), für alles Nicht-Idempotente nicht: eine zweimal gefaltete `EinheitGeteilt` erzeugt über `freierTeilSchluessel()` (K9) einen **zweiten Teil**; eine zweimal gefaltete Anforderung/Ablösung zählt doppelt.

Zusätzlich verletzt Weg B die Invariante „ein Schreiber je Datei" auf einer Ebene, die der Vorschlag nicht anspricht: die Datei wird **von der FüSt geschrieben**, ihr Inhalt beansprucht aber den Sequenzraum des Meldekopfs. Kommt der Meldekopf später ins Netz und schreibt nach Weg A direkt weiter (§3.9 lässt beides ausdrücklich zu), vergibt er Sequenznummern, die bereits im übergebenen Bündel stehen.

**Was den Vorschlag rettet.**
1. Harte Regel im Fold: **`id` ist global eindeutig; das zweite Auftreten wird verworfen** (nicht gefaltet), Abweichung im Inhalt bei gleicher `id` ist ein Konflikthinweis mit Manipulationsverdacht (dafür ist die Hash-Kette da).
2. Bündel exportieren **immer ab dem letzten quittierten Offset**, nicht das ganze Segment; oder Bündelname deterministisch aus `(clientId, segment, vonOffset, bisOffset)` bilden, damit `create_new` das Wiedereinspielen wirklich abfängt.
3. Meldekopf-Sequenzraum je Übergabeweg trennen: nach einem Bündelexport beginnt der Meldekopf ein **neues Segment**; Weg A darf nur in Segmente schreiben, die nie exportiert wurden.
4. In §7.3 Stufe 2 den Fall aufnehmen: „dasselbe Bündel zweimal, und ein überlappendes Bündel" — er fehlt in der Störungsliste.

### T9 — Die Hash-Kette bricht bei jedem Segmentwechsel; der Anspruch „Ersatz für Revisionssicherheit" ist überzogen  ·  **mittel**

**Angegriffene Behauptung.** C §3.3: „Die Hash-Kette je Client-Datei (nas §8.4) macht nachträgliche Änderungen erkennbar — das ist der **Ersatz für ‚Revisionssicherheit' ohne PKI**."

Die Kette verknüpft ausschließlich Zeilen **derselben Datei** (§3.3 wörtlich). Zwischen den Segmenten eines Clients existiert keine Verknüpfung, und zwischen der letzten Zeile eines Segments und irgendetwas anderem auch nicht. Folge: **ein vollständiges Segment kann gelöscht werden, ohne dass irgendeine Prüfung anschlägt** — es fehlt einfach, und weil Segmente ohnehin je Programmstart entstehen (§3.2), fällt eine Lücke in der Nummerierung nicht zwingend auf. Ebenso lässt sich ein Segment am Ende auf eine gültige Zeilengrenze **kürzen**, ohne die Kette zu verletzen. Das ist für ein Einsatztagebuch (N-6 „unlöschbare Historie") die entscheidende Angriffsart, nicht die Manipulation einer einzelnen Zeile in der Mitte.

Das ist kein erfundenes Problem: der Vorschlag setzt darauf, dass das Protokoll **selbst** das ETB ist (§3.1 Punkt 4), und leitet daraus den Verzicht auf einen zweiten Mechanismus ab.

**Was den Vorschlag rettet.** (a) Die erste Zeile jedes Segments trägt `vorherHash` = Hash der letzten Zeile des Vorgängersegments und dessen Länge; (b) Schnappschüsse und Präsenzdateien führen je Clientdatei `(länge, endHash)` mit — damit ist ein späteres Kürzen gegen jeden Schnappschuss nachweisbar (der Vorschlag hat in `praesenz` ohnehin `lastOffsetPerFile` aus nas §11, nutzt es aber nur informativ); (c) beim Archivieren wird eine Gesamtprüfsumme über alle Segmentlängen und Endhashes ins `manifest.json` geschrieben — dann ist das ZIP das revisionsfeste Artefakt und nicht der offene Ordner.

### T10 — Lokaler Spiegel und `clientId` in `%APPDATA%` (Roaming) — bei servergespeicherten Profilen entsteht genau der Multi-Writer-Fall  ·  **mittel**

**Angegriffene Behauptung.** C §3.2 / §2.3: lokaler Spiegel und `einstellungen.json` mit der `clientId` liegen unter `%APPDATA%\S1-Control\`. Electron liefert diesen Pfad über `app.getPath('userData')`; v1 macht es bereits so (`src/main/main.ts:142`, `:438`, `services/updater.ts:101`). `%APPDATA%` ist unter Windows das **Roaming**-Verzeichnis.

Auf einem verwalteten Windows-11-Bestand ohne Adminrechte (Betriebsparameter) sind servergespeicherte Profile oder Ordnerumleitung des Roaming-Zweigs eine realistische Konfiguration [Annahme — die konkrete Domänenkonfiguration der FüSt-Rechner ist in keinem Bericht ermittelt]. Trifft sie zu, hat das zwei Folgen, die das Modell an der Wurzel treffen:
1. Die **`clientId` wandert mit dem Benutzer** auf einen zweiten Rechner. Zwei Rechner schreiben dann in dieselbe Ereignisdatei — exakt der Fall, den R12/nas-Restrisiko 4 als „genau der Multi-Writer-Fall, den das ganze Modell vermeidet" bezeichnet. Die vorgesehene Erkennung („Ende der Share-Datei passt nicht zum lokalen Offset") greift **nur beim Start** und nur, wenn der andere Rechner vorher etwas geschrieben hat; zwei parallel laufende Sitzungen erkennen sich nicht.
2. Der „lokale" Spiegel — die Grundlage von local-first (§3.7 Punkt 1: „zuerst … lokal geschrieben und `fsync`t. Die UI ist danach fertig") — liegt dann **auf einem Netzpfad**. Der schnelle, netzunabhängige Schreibpfad wird zum zweiten Netzschreibpfad, und der Fall „NAS weg" bedeutet ggf. „auch der lokale Spiegel weg".

**Was den Vorschlag rettet.** (a) Spiegel und `clientId` nach `%LOCALAPPDATA%` verlegen (in Electron: `app.setPath('userData', …)` bzw. `app.getPath('sessionData')`), nicht `app.getPath('userData')` in der Standardbelegung verwenden; unter macOS/Linux ist die Standardbelegung unproblematisch. (b) Die `clientId` zusätzlich an eine **maschinengebundene** Größe binden (Hostname + eine beim Erststart in `%LOCALAPPDATA%` angelegte Zufallszahl) und beim Start gegen den Hostname-Anteil des eigenen Dateinamens prüfen. (c) Fremdschreiber-Erkennung **laufend** statt nur beim Start: da der eigene Poll die eigene Datei ohnehin nicht liest, genügt ein Vergleich der erwarteten Länge alle *n* Zyklen — dieselbe Rückleseprüfung, die T2 verlangt. (d) In M0 explizit prüfen, wo `%APPDATA%` auf den FüSt-Rechnern real liegt (`echo %APPDATA%` und `net use`) — das ist eine Zeile in der Betriebsparameter-Abfrage und schließt die Lücke.

### T11 — Schnappschüsse tragen keine Fold-/Programmversion; eine korrigierte Fold-Regel vergiftet neuere Leser  ·  **mittel**

**Angegriffene Behauptung.** C §3.6: Schnappschuss enthält „Zustand, Versionsvektor und blake3-Hash"; R13 sichert das über „Leser prüfen stichprobenartig gegen Neu-Fold" ab.

Der Versionsvektor beschreibt, **welche Ereignisse** eingeflossen sind — nicht, **mit welcher Fold-Logik**. Genau das ist aber der interessante Fehlerfall: R1 sagt voraus, dass Fold-Regeln nachgebessert werden (und T1/T3/T5 zeigen konkret welche). Nach einer solchen Korrektur ist ein Schnappschuss, den ein Client mit der alten Version geschrieben hat, ein **falscher Zustand mit gültigem Hash und gültigem Versionsvektor**. Ein neuer Client übernimmt ihn und faltet nur die Differenz darauf — die Korrektur wirkt nie. Da im Einsatz Clients unterschiedlicher Versionen zusammenlaufen (deshalb existiert K11 „unbekanntes Ereignis durchreichen" und `mindestAppVersion`), ist Versionsmischung eingeplant, für Schnappschüsse aber nicht zu Ende gedacht.

**Was den Vorschlag rettet.** `foldVersion` (eine ganze Zahl, erhöht bei **jeder** semantischen Änderung an einer Fold-Regel) in Ereignis-Manifest und Schnappschuss; Leser ignorieren Schnappschüsse mit abweichender `foldVersion` und falten neu. Zusätzlich: der CI-Test aus R13 („einmal mit, einmal ohne Schnappschuss") muss über eine **eingecheckte Alt-Akte** laufen, nicht nur über frisch erzeugte Daten (R11 fordert die Alt-Akte bereits — beide Tests gehören zusammen).

### T12 — Die Update-Ablage auf dem Share ist ein unsignierter Codeverteilungskanal; die SHA-256 daneben beweist nichts  ·  **mittel**

**Angegriffene Behauptung.** C §2.5: „Verzeichnis `programm\` mit `aktuell.json` (Version, Dateiname, **SHA-256**, Mindest-Schemaversion) … lädt … den Installer … prüft die Prüfsumme und bietet ‚Jetzt aktualisieren' an (Installer starten, App beenden)." Dazu R8: kein Windows-Codesigning.

Prüfsumme und Datei liegen im **selben** beschreibbaren Verzeichnis. Wer die Installerdatei ersetzen kann, kann die `aktuell.json` mitändern — die Prüfung schützt gegen Übertragungsfehler, nicht gegen Ersetzung. In Verbindung mit „kein Codesigning" ist das Ergebnis: **jeder, der Schreibrechte auf dem Einsatz-Share hat, kann auf allen FüSt-Rechnern beliebigen Code zur Ausführung bringen, und die Anwendung bietet ihn dem Nutzer aktiv an.** Für ein Werkzeug, das auf Führungsrechnern läuft, ist das keine Randnotiz. Der Vorschlag ersetzt damit das v1-Peer-Update (das dieselbe Schwäche hatte, aber standardmäßig **deaktiviert** war) durch einen Kanal, der standardmäßig aktiv ist.

Zweiter Punkt aus den Betriebsparametern: **ohne Adminrechte** muss der Installer per-User laufen und nach `%LOCALAPPDATA%\Programs\…` installieren. Auf verwalteten Geräten mit AppLocker/WDAC-Standardregeln ist das Ausführen von Programmen außerhalb von `Program Files`/`Windows` für Nicht-Administratoren gesperrt [Annahme — AppLocker-Status der FüSt-Rechner nicht ermittelt]. Dann scheitern sowohl die Erstinstallation als auch jedes Selbst-Update, und zwar unabhängig vom Ablagemechanismus. Das ist eine Frage an Johannes, die in §10 fehlt (dort steht nur „Windows-Version", Punkt 3).

**Was den Vorschlag rettet.** (a) `aktuell.json` **mit Ed25519 signieren** — der Kern bringt `signatur.ts` bereits mit (§3.9 nutzt es für Meldekopf-Bündel), der öffentliche Schlüssel wird in die Anwendung kompiliert; damit ist der Kanal ohne Zertifikatskosten authentisch, und die vorhandene Kryptobibliothek verdient sich ein zweites Mal. (b) Die Ablage schreibgeschützt halten (eigene Freigabe, nur FüSt-IT schreibt) — organisatorisch, aber dann auch so dokumentieren. (c) Vor M8 klären, ob per-User-Installation und Ausführung aus dem Benutzerprofil auf den Zielrechnern überhaupt erlaubt sind; falls nicht, ist die einzige Auslieferungsform ein von der IT verteiltes Paket, und der Selbst-Update-Pfad entfällt ersatzlos (was den Aufwand senkt, aber die Betriebsannahme ändert).

### T13 — Die Speicherschicht wird nicht auf macOS geprüft, obwohl macOS jetzt verbindlich ist  ·  **mittel**

**Angegriffene Behauptung.** C §7.4: `test-windows` läuft „nur `@s1/speicher` + Mehrclient-Simulation"; ein macOS-Job existiert ausschließlich im `build`-Matrixlauf. Begründung im Text: „Windows ist die Zielplattform".

Nach den Betriebsparametern ist macOS/Linux ausdrücklich zu berücksichtigen (Entwicklung findet auf macOS statt). Für die Speicherschicht ist das kein Formalie: nas §1.7 belegt, dass der macOS-SMB-Client Verzeichnis-Enumeration cached und der Finder „only a partial list of the contents of a share" zeigt — genau die Operation, mit der §3.4 neue Clientdateien entdeckt; die Abhilfe (`/etc/nsmb.conf`) ist Root-Konfiguration und „a app cannot change it itself". Und nas §1.6 zeigt, dass unter Linux `cache=`/`actimeo=`/`nobrl` die Sichtbarkeit bestimmen und vom Anwender gesetzt werden. Eine Speicherschicht, die auf Ubuntu (lokales tmpfs) und Windows getestet wird, hat für beide Nicht-Windows-Zielplattformen keine Aussage.

**Was den Vorschlag rettet.** `test-macos` mit demselben Inhalt wie `test-windows` in die Matrix (GitHub-Runner vorhanden, +90 s). Er testet zwar lokale Dateisysteme, deckt aber Pfad-, `create_new`- und Truncate-Semantik ab; die SMB-spezifischen Effekte bleiben Stufe 4 (manuell) vorbehalten — dann aber **auf beiden** Client-Betriebssystemen, wie §10 Punkt 1 es für die Latenzmessung bereits vorsieht („von einem Windows-Client und einem Mac"). Die CI-Matrix zieht diese Konsequenz noch nicht.

### T14 — Zwei Clients legen gleichzeitig denselben Einsatz an; es gibt keinen Zusammenführungspfad  ·  **mittel**

**Angegriffene Behauptung.** C §3.2: Ordnername `<datum>_<slug>_<kurzid>`, „Ordnername unveraenderlich"; `einsatz.json` per `create_new` mit eigener `id`.

Die `kurzid` ist client-lokal erzeugt. Legen FüSt-Laptop und Meldekopf in derselben Minute „Hochwasser Hunte" an — der Regelfall am Einsatzbeginn, wenn beide unabhängig hochfahren und niemand weiß, wer zuerst da war —, entstehen **zwei Einsatzordner** mit zwei `einsatz.json`, zwei Ereignismengen und zwei Ids. `create_new` verhindert nichts, weil die Namen sich unterscheiden. Danach:
- Die Ereignisse referenzieren keine Einsatz-Id (sie liegen im Ordner, §3.2), also könnte man die Dateien in einen Ordner kopieren; die Entitäts-Ids sind clientseitig zufällig (`e-3f21`, `a-0004`), kollidieren also nicht — aber der Fold erzeugt dann die **Vereinigung** beider Strukturen: zwei Bereitstellungsräume, zwei Abschnittsbäume, doppelte Einheiten (dieselbe reale Einheit unter zwei Ids).
- Ein Zusammenführungsvorgang existiert im Vorschlag nicht; §3.9 Weg B ist für Bündel *desselben* Einsatzes gedacht.
- Die Directory-Cache-Verzögerung von bis zu 10 s beim Erscheinen neuer Verzeichniseinträge (nas §1.2, im Vorschlag in §3.4 selbst zitiert) macht den Fall **wahrscheinlicher**, nicht unwahrscheinlicher: der zweite Client sieht den Ordner des ersten in den ersten 10 s nicht.

**Was den Vorschlag rettet.** (a) Einsatz anlegen ist ein zweistufiger Vorgang: Share-Liste anzeigen (mit ausdrücklichem „neu einlesen"), dann anlegen; die UI warnt bei einem Namensähnlichkeitstreffer. (b) Fachliche Zusammenführung als benannter Vorgang: `EinsatzZusammengefuehrt{quelleId}` — die Ereignisse des einen Ordners werden als fremde Segmente in den anderen kopiert und ein Zuordnungsschritt (dieselbe Regel wie K8 „Fingerabdruck schlägt vor, ein Mensch bestätigt") dedupliziert die Einheiten. Der Kern kann das bereits: `einheitSchluessel()` ist der vorhandene Fingerabdruck. (c) Wenigstens: den Fall benennen und die Vermeidung im Handbuch festhalten („Einsatz legt die FüSt an, Meldeköpfe treten bei").

---

## 6. Kleinere Befunde

### T15 — Der HTML-Lagemonitor auf dem Share verletzt die eigene harte Regel  ·  **gering**
C §3.2 legt fest: „Kein Client benennt fremde Dateien um, überschreibt oder löscht sie. **Einzige Ausnahme: die eigene Präsenzdatei.**" C §2.4 legt fest: „Der Kern-Worker schreibt sie [die HTML-Monitordatei] auf Wunsch alle *n* Minuten in einen konfigurierbaren Ordner (**Share** oder lokal)". Das ist eine zweite überschriebene Datei, und sie ist der Fall mit dem höchsten Kollisionsrisiko: ein Tablet-Browser lädt sie alle 60 s neu, hält sie also regelmäßig offen — und ein Rename auf eine unter Windows ohne `FILE_SHARE_DELETE` geöffnete Zieldatei schlägt mit `EPERM`/`EBUSY` fehl (nas §1.4, §3). Sind zwei Clients für den Export konfiguriert, sind es zwei Schreiber auf einer Datei.
**Rettung:** Datei je Client (`lage-<clientId>.html`) plus eine einmalig per `create_new` angelegte `index.html`, die auf die zuletzt aktualisierte weiterleitet; oder ausdrücklich nur ein „Monitor-Client" darf exportieren, mit Belegung über die Präsenzdatei. In jedem Fall die harte Regel in §3.2 um diesen Fall ergänzen, statt sie stillschweigend zu brechen.

### T16 — UDP-Socket je Kern-Worker kollidiert bei zwei offenen Einsätzen  ·  **gering**
C §2.3 platziert „UDP Änderungshinweis … Port 41235" **innerhalb** des Kern-Workers, und es gibt „je geöffnetem Einsatz" einen Worker. Zwei gleichzeitig geöffnete Einsätze (Übung + Realeinsatz; oder Einsatz + Archivansicht) binden denselben Port zweimal → `EADDRINUSE`, und je nach Fehlerbehandlung fällt der Beschleuniger still aus. v1 hatte dafür einen Dienst im Main-Prozess (`einsatz-sync.ts`).
**Rettung:** UDP als **ein** Dienst im Main-Prozess, der Hinweise anhand des Einsatzordners an den passenden Worker routet; `SO_REUSEADDR` allein löst das nicht sauber.

### T17 — Der Sortierschlüssel ist ein lexikografisch verglichener String ohne festgelegte Breite  ·  **gering**
C §3.3 zeigt `"hlc": "1kq3x9.0007.c-9b12ef"`, C §3.5: „Sortierschlüssel: `(physisch, zaehler, clientId)` **lexikografisch**". Lexikografischer Vergleich unterschiedlich langer Zahlendarstellungen ist keine numerische Ordnung; sobald die physische Komponente die Stellenzahl wechselt (Basiswechsel, Zeitüberlauf) oder ein Client mit einer anderen Kodierung schreibt, kippt die Ordnung — und die Ordnung ist die Grundlage von allem. Der Zähler mit vier Stellen läuft bei > 9.999 Ereignissen in derselben Millisekunde über (unrealistisch, aber es fehlt die Regel, was dann passiert: Zeit um 1 ms vorziehen).
**Rettung:** Format normativ festschreiben — feste Breite, Nullauffüllung, dokumentierte Basis, plus eine Property „für zufällige Paare gilt: lexikografischer Vergleich der Schlüssel == numerischer Vergleich der Tripel". Zwei Zeilen Spezifikation, ein Test.

### T18 — Präsenz-Rename kann still scheitern und nimmt den UDP-Beschleuniger mit  ·  **gering**
Die Präsenzdatei ist die **einzige** überschriebene Datei (§3.2) und damit die einzige, die den Rename-Replace-Pfad benutzt — mit `EPERM`/`EBUSY`, wenn ein anderer Client sie gerade liest (nas §1.4). Sie ist zugleich die Quelle der Peer-IPs für den UDP-Unicast (§3.4) und in meiner Rettung zu T4 die Grundlage der Archivierungs-Quittung. Fällt sie intermittierend aus, verfällt der Beschleuniger auf den 2-s-Poll (unkritisch) und die Peer-Anzeige zeigt falsche „zuletzt gesehen"-Werte (R10-Mitigation wird unzuverlässig).
**Rettung:** Präsenz ebenfalls append-only (`praesenz/<clientId>.jsonl`, letzte gültige Zeile gilt, gelegentlich durch ein neues Segment ersetzt) — dann ist der einzige Overwrite-Pfad des Systems beseitigt und die harte Regel aus §3.2 ist ausnahmslos. Nebenbei löst das T15 mit.

### T19 — Die Schnappschuss-Schwelle wird im realen Einsatz nie erreicht  ·  **gering**
C §3.6: Schnappschuss ab „≥ 5.000 Ereignisse seit dem letzten Schnappschuss". Die eigene Größenrechnung in §3.8 nennt für die reale Excel-Vorlage „272 Einheitenzeilen … also eher ~1 MB", bei „~10 Ereignissen je Einheit" also ~2.700 Ereignisse für den **gesamten** Einsatz. Es wird also nie ein Schnappschuss geschrieben. Das ist für sich harmlos (Volltfold über 2.700 Ereignisse ist schnell), hat aber zwei Nebenwirkungen: (a) Property 4 und R13 sichern Maschinerie ab, die im Feld nie läuft — Testaufwand ohne Ertrag, in einem Vorhaben, dessen Hauptrisiko der Umfang ist (R4); (b) die Rettung zu T1 (Rebase ab letztem Schnappschuss) hat keinen Ankerpunkt.
**Rettung:** Schwelle zeit- statt mengenbasiert (z. B. alle 60 s Ruhe, mindestens alle 500 Ereignisse), damit Schnappschüsse tatsächlich entstehen und den Rebase billig machen — oder Schnappschüsse auf „lokal, nicht auf dem Share" reduzieren und die Share-Variante auf die Archivierung beschränken.

### T20 — Mehrfachstart auf einem Rechner  ·  **gering**
Der einzige Weg, wie zwei Prozesse mit derselben `clientId` gleichzeitig laufen (außer T10), ist der doppelte Programmstart — v1 verhindert ihn bereits mit `app.requestSingleInstanceLock()` (`src/main/main.ts:101`). Der Vorschlag erwähnt das nicht in der Liste dessen, was aus v1 wörtlich übernommen wird, und der Sperrbegriff müsste in v2 zusätzlich **je Einsatzordner** gelten, weil dort mehrere Worker parallel laufen dürfen (portable Kopie + installierte Version sind zwei Anwendungen im Sinne des Locks).
**Rettung:** Single-Instance-Lock explizit übernehmen **und** je Einsatzordner eine lokale (nicht auf dem Share liegende) Belegdatei führen; Verletzung → schreibgeschützt öffnen.

---

## 7. Was die Betriebsparameter entlasten und was sie belasten

Die Vorschläge kannten `design/betriebsparameter-johannes.md` noch nicht. Wirkung auf Vorschlag C:

**Entlastend**

| Parameter | Wirkung auf C |
|---|---|
| **Keine Altdaten** (weder `.s1control` noch gefüllte Excel-Mappen) | §3.10 a/b/c wird weitgehend gegenstandslos; R6 („Verlust der Historie beim Umstieg / Doppelbetrieb") verliert seinen Anlass; §10 Punkte 13, 14, 16 entfallen. M8 wird leichter (der Vorschlag veranschlagt für den Excel-Import selbst ~0,5 PW). Nur die **Kopiervorlagen/StAN-Extraktion zur Entwicklungszeit** bleibt — und die war ohnehin als Skript, nicht als Laufzeitfunktion geplant. Diese Entlastung ist echt und substanziell. |
| **Synology (Samba)** | Stützt die Atomaritätsannahmen von §3.2 stärker als ein unbekannter Server: `create_new` = SMB2 CREATE/FILE_CREATE serverseitig entschieden, Rename innerhalb des Shares = POSIX `rename()` (nas §1.4). Zusätzlich sind die relevanten Schalter dokumentiert und prüfbar (Synology „SMB durable handles", „Enable Opportunistic Locking"/„SMB2 lease", nas §1.8) — M0 kann sie gezielt abfragen statt zu raten. §10 Punkt 2 ist damit halb beantwortet. |
| **NTP vorhanden** | Senkt die Eintrittswahrscheinlichkeit von T5/T6 im FüSt-Netz deutlich; die Uhrabweichungs-Warnung wird Ausnahme statt Dauerzustand. **Aber:** genau die Geräte, für die §3.9 Weg B/C gebaut ist (Meldekopf ohne Netz zur FüSt), sehen den NTP-Server auch nicht — T5/T6 bleiben für den Meldekopfpfad in voller Höhe. Zusätzlich verschiebt NTP die Begründung für HLC von „falsche Uhren" auf „nicht-monotone Uhren" (Zeitsprünge durch Steps), was der Vorschlag nicht adressiert. |
| **1–5 gleichzeitige Rechner** | Bestätigt die Auslegung des Poll-Modells und macht die Ruhephase in meiner T4-Rettung praktikabel (Quittung von höchstens vier Peers). Entlastet **nicht** T7, weil die Poll-Kosten an der Zahl der Segmentdateien hängen, und die wächst mit den Programmstarts, nicht mit den Clients. |
| **SQLite scheiterte an Langsamkeit, nicht an Korruption** | Stützt die Grundentscheidung E3 und macht Option E (lokale SQLite als reine Projektion, nas §6) unbedenklich — der Vorschlag hält sie sich in §2.1 ohnehin offen. Verschärft aber T7: das Projekt hat bereits einmal an SMB-Roundtrips gescheitert, nicht an Datenintegrität. Die Messung in M0 ist damit nicht nur „gute Praxis", sondern die Wiederholung des Experiments, das schon einmal negativ ausging. |
| **Windows 11** | Entwertet ein Teilargument von §2.2: „WebView2 offline (`fixedRuntime` ≈ 180 MB, R1)" ist auf Windows 11 gegenstandslos, weil die Evergreen-Laufzeit vorinstalliert ist. Für die **technische Korrektheit** von C ist das folgenlos (das Hauptargument „Rust kann kein TypeScript ausführen" bleibt unberührt), es schwächt aber die Begründungslast gegen Tauri. Ehrlichkeitshalber gehört das in die Synthese, nicht in die Findings. |

**Belastend**

| Parameter | Wirkung auf C |
|---|---|
| **Keine Adminrechte** | Trifft §2.5 doppelt (T12): per-User-Installation ist Pflicht, und die Ausführbarkeit aus dem Benutzerprofil ist auf verwalteten Geräten nicht garantiert. §10 fragt nur nach der Windows-**Version**, nicht nach AppLocker/WDAC, Ausführungsrichtlinien und Installationsweg. Das ist eine Lücke in der Fragenliste, die vor M8 blockierend werden kann. |
| **macOS/Linux berücksichtigen** | Belastet §7.4 (T13): die Speicherschicht wird auf keiner der beiden Nicht-Windows-Zielplattformen automatisiert geprüft, obwohl nas §1.6/§1.7 für beide eigenes Cache-/Lock-Verhalten belegt. |
| **Windows 11, verwaltete Rechner** | Erhöht die Plausibilität von T10 (Roaming-Profil / Ordnerumleitung) und bringt einen im gesamten Berichtsbestand unerwähnten Mechanismus ins Spiel: **Windows-Offlinedateien (CSC)**. Ist „Immer offline verfügbar" für den Freigabepfad aktiv, bedient Windows die Zugriffe aus einem lokalen Cache mit eigener Synchronisationslogik, die bei Konflikten **Konfliktkopien** anlegt statt anzuhängen — das bricht das Append-only-Protokoll auf einer Ebene, die die Anwendung nicht sieht. [Annahme: Mechanismus aus allgemeinem Windows-Wissen; in keinem der acht Berichte belegt, und ob CSC auf den FüSt-Rechnern aktiv ist, ist nicht ermittelt.] Die Gegenmaßnahme ist billig und gehört in M0: prüfen, ob der Share-Pfad CSC-gecacht ist, und in diesem Fall warnen bzw. den Betrieb ablehnen; im Handbuch „Offlinedateien für diese Freigabe deaktivieren" festhalten. |

---

## 8. Findings-Tabelle

| # | Severity | Angegriffene Entscheidung | Kern des Belegs | Rettung in einem Satz |
|---|---|---|---|---|
| **T1** | **blocker** | §3.6 „Ordnungsunabhängigkeit folgt aus der sortierten Gesamtmenge" + §7.2 Eigenschaft 3 „inkrementeller Fold == Live-Pfad" | K3-Schrittfolge (hlc 3 vs. 5, Zyklus) erzeugt dauerhaft verschiedene Führungsstrukturen auf zwei Clients; die vier Properties testen den Fall nicht | Rebase-Regel bei out-of-order eintreffenden Ereignissen (oder registerförmige Regeln), Property auf Ankunftsreihenfolge umstellen, Abnahmekriterium in M0 |
| **T2** | schwer | §3.2 „unvollständige **letzte** Zeile verwerfen" + §3.7 „Offset bleibt stehen, Versuch wiederholt sich" | Teilübertragung + Retry erzeugt eine defekte Zeile **in der Mitte**; Leser bleibt für diese Datei dauerhaft stehen | Rückleseprüfung ab `hochgeladenOffset` vor jeder Wiederaufnahme; bei Rumpf neues Segment; Leser-Resync auf `\n` als Regel |
| **T3** | schwer | §3.6 K12 Undo als Kompensationsereignis | Kompensation trägt zwangsläufig den größten HLC und gewinnt per LWW gegen fremde neuere Korrekturen | `widerruftId` als **Filter** vor dem Fold definieren, nicht als Mutation; Property `falte(E ∪ widerruf(e)) == falte(E \ {e})` |
| **T4** | schwer | §3.6 K10 + §3.8 Archivierung | „nach dem Marker" ist zweideutig; beide Auslegungen verlieren entweder Offline-Arbeit oder machen das ZIP unvollständig; Upload-Ziel verschwindet | Archivierung als Ereignis mit HLC, Ruhephase mit Peer-Quittung, `nachzuegler/`, Archiv versionieren |
| **T5** | schwer | §3.6 K7 „neueste Revision zählt" + §3.5 „fachliche Zeit nie zur Ordnung" | Meldekopf mit −6 h liefert die real neueste Meldung mit dem kleinsten HLC → stille Falschstärke, K4-Fenster (120 s) greift nicht | Revisionsordnung über die **Meldezeit** (HLC als Tie-Break); §3.5 auf „nie zur *technischen* Ordnung" einschränken; Property „unabhängig von der Geräteuhr" |
| **T6** | schwer | §3.5 HLC-Deckelung „trotzdem angenommen" | Offen, ob die lokale HLC mitzieht; (a) bricht Kausalität und macht Korrekturen unmöglich, (b) macht die 5-min-Grenze wirkungslos und zieht alle Uhren mit | Standard-HLC-Vorziehen festschreiben, 5 min nur als **Anzeige**schwelle, Obergrenze fürs Vorziehen; Property „monoton auch bei rückwärts springender Systemuhr" |
| **T7** | mittel | §3.2 „neues Segment je Programmstart" + §3.4 „`open`+`read` je bekannter Datei je 2 s" | 36 Segmente nach drei Tagen → ~109 SMB-Roundtrips je Poll; Projekt ist an SMB-Latenz schon einmal gescheitert (Betriebsparameter) | Segmentwechsel nur nach Größe, Handles offen halten, abgeschlossene Segmente aus dem Poll nehmen, M0 misst Serienzugriffe |
| **T8** | mittel | §3.9 Weg B „Idempotenz K6 macht doppeltes Einspielen harmlos" | K6 gilt nur für Meldungen (`bogenInhaltsId`); für alle anderen Ereignisse fehlt eine Dedup-Regel; überlappende Bündel duplizieren Sequenzräume | Fold-Regel „`id` global eindeutig, zweites Auftreten verwerfen"; Bündel ab quittiertem Offset; nach Export neues Segment |
| **T9** | mittel | §3.3 Hash-Kette als „Ersatz für Revisionssicherheit" | Kette endet an der Dateigrenze; ganze Segmente löschbar/kürzbar ohne Erkennung — die relevante Manipulationsart für ein ETB | Segmentübergreifende Verkettung, `(länge, endHash)` in Schnappschuss/Präsenz, Gesamtprüfsumme im Archiv-Manifest |
| **T10** | mittel | §3.2/§2.3 lokaler Spiegel und `clientId` in `%APPDATA%` (Roaming; v1 `main.ts:142`) | Bei servergespeicherten Profilen wandert die `clientId` → Multi-Writer; „local-first" liegt auf dem Netz [Annahme zur Domänenkonfiguration] | `%LOCALAPPDATA%` verwenden, `clientId` maschinengebunden, Fremdschreiber-Erkennung laufend statt nur beim Start, in M0 prüfen |
| **T11** | mittel | §3.6 Schnappschuss „Zustand + Versionsvektor + blake3" | Der Versionsvektor beschreibt die Ereignisse, nicht die Fold-Logik; ein Schnappschuss aus einer Version vor einer Regelkorrektur ist gültig signiert und falsch | `foldVersion` in Manifest und Schnappschuss; Leser verwerfen abweichende; CI-Test über eingecheckte Alt-Akte |
| **T12** | mittel | §2.5 Update-Ablage mit SHA-256 neben der Datei; R8 kein Codesigning | Prüfsumme im selben beschreibbaren Verzeichnis beweist nichts; aktiver, unsignierter Codeverteilungskanal auf Führungsrechnern; dazu per-User-Ausführbarkeit ohne Adminrechte ungeklärt [Annahme AppLocker] | `aktuell.json` mit **Ed25519 aus dem eigenen Kern** signieren, öffentlichen Schlüssel einkompilieren; Ablage schreibgeschützt; Ausführungsrichtlinie vor M8 klären |
| **T13** | mittel | §7.4 Speicherschicht nur in `test-windows` | macOS/Linux sind laut Betriebsparametern verbindlich; nas §1.6/§1.7 belegen eigenes Cache-/Lock-Verhalten beider | `test-macos` in die Matrix; Stufe-4-Messung auf beiden Client-Betriebssystemen (§10 Punkt 1 fordert das bereits, §7.4 zieht die Konsequenz nicht) |
| **T14** | mittel | §3.2 Einsatzordner mit client-lokaler `kurzid`, „unveraenderlich" | Zwei Clients legen denselben Einsatz an → zwei Ordner, kein Zusammenführungspfad; der 10-s-Directory-Cache macht es wahrscheinlicher | Zweistufiges Anlegen mit Ähnlichkeitswarnung; `EinsatzZusammengefuehrt` mit K8-Fingerabdruck-Zuordnung; Handbuchregel „FüSt legt an" |
| **T15** | gering | §2.4 HTML-Monitor „Share oder lokal" vs. §3.2 harte Regel | Zweiter Overwrite-Pfad, ausgerechnet auf eine von Tablets offen gehaltene Datei (Rename-EBUSY, nas §1.4) | Datei je Client + einmalige `index.html`; oder Exportrecht über die Präsenzdatei belegen |
| **T16** | gering | §2.3 UDP im Kern-Worker, ein Worker je Einsatz | Zwei offene Einsätze → `EADDRINUSE` auf Port 41235 | Ein UDP-Dienst im Main-Prozess, Routing anhand des Einsatzordners |
| **T17** | gering | §3.5 lexikografischer Sortierschlüssel | Ordnung hängt an unspezifizierter Stellenzahl; Zählerüberlauf ungeregelt | Format normativ festschreiben (feste Breite, Nullauffüllung), Property „lexikografisch == numerisch" |
| **T18** | gering | §3.2 Präsenzdatei als einzige überschriebene Datei | Einziger Rename-Replace-Pfad des Systems, mit dokumentierter EBUSY-Falle; trägt Peer-IPs und (nach T4-Rettung) die Archivquittung | Präsenz ebenfalls append-only — beseitigt den letzten Overwrite-Pfad und löst T15 mit |
| **T19** | gering | §3.6 Schnappschuss ab 5.000 Ereignissen | Realer Einsatz erreicht ~2.700 Ereignisse (§3.8 eigene Rechnung) → nie ein Schnappschuss; Property 4 und R13 sichern totes Verhalten ab und der T1-Rebase hat keinen Anker | Zeitbasierte Schwelle (60 s Ruhe / 500 Ereignisse) oder Schnappschüsse nur lokal |
| **T20** | gering | Doppelstart / portable Kopie | Einziger verbleibender Multi-Writer-Weg auf einem Rechner; v1 hat den Lock (`main.ts:101`), C führt ihn nicht in der Übernahmeliste | Single-Instance-Lock übernehmen + lokale Belegdatei je Einsatzordner |

---

## 9. Verdict

**haelt-mit-auflagen.**

**Was den Angriff überstanden hat.** Die tragende Entscheidung E3 — Append-only-Ereignisprotokoll mit genau einem Schreiber je Datei statt Portierung des Lockfile-Modells — ist mit den Primärquellen nicht zu widerlegen; ich habe es versucht und bin auf das Gegenteil gestoßen. Multi-Writer-Append ist über Netz ausdrücklich unsicher (`open(2)`, nas §1.4) und selbst lokal nicht garantiert (Rust-Std, nas §1.11); jede belegte SMB-Eigenheit (Caches 5/10 s, mandatory Byte-Range-Locks, Rename-EBUSY, fehlendes `fsync`) trifft den Lockpfad und keine den Anhängepfad. Die Ableitung in C §3.1 ist sachlich richtig, ihre Belege stimmen, und die Betriebsparameter stützen sie zusätzlich (Synology/Samba mit serverseitig entschiedenem `create_new`; SQLite scheiterte an Latenz, nicht an Datenintegrität). Auch die Nebenentscheidungen Polling-vor-Watcher, UDP-nur-als-Beschleuniger und `fsync`-nach-jedem-Ereignis sind belegt und korrekt. Der Vorschlag ist außerdem der einzige der drei, der den Widerspruch der Berichte überhaupt entscheidet und die Entscheidung begründet.

**Was nicht hält.** Der Vorschlag beschreibt eine korrekte **Bauform** mit einem unvollständigen **Regelwerk**, und die Lücken liegen genau dort, wo er selbst sein Hauptrisiko sieht: R1 „Fold-Regelwerk unvollständig → stiller Falschzustand". Fünf Lücken sind konkret und mit Schrittfolgen belegt:
- **T1 (blocker):** Der Live-Pfad ist für K2/K3/K5/K9 nicht ordnungsunabhängig. Zwei Clients können dauerhaft verschiedene Führungsstrukturen anzeigen, ohne dass ein Hinweis erscheint. Die vier Property-Eigenschaften prüfen diesen Fall nicht — die Absicherung ist grün, während der Betriebspfad divergiert.
- **T2:** Der Wiederaufnahmepfad nach teilweise übertragenem Anhängen korrumpiert die Mitte einer fremdgelesenen Datei; die Regel „unvollständige **letzte** Zeile verwerfen" deckt ihn nicht, die Startprüfung greift zu spät.
- **T3:** Undo als Kompensationsereignis mit größtem HLC vernichtet fremde neuere Werte, konfliktfrei und unsichtbar.
- **T4:** Archivierung und local-first-Nachfahren widersprechen sich; eine der beiden Auslegungen verliert Daten, die andere macht das Archiv falsch.
- **T5/T6:** Die Zeitachse ist nicht ausdefiniert — weder für Revisionsordnung (HLC vs. Meldezeit) noch für das Verhalten der HLC bei stark abweichenden Fremduhren. Beides führt zu stillen Falschständen in den Stärkesummen, also im wichtigsten Ausgabewert des Werkzeugs.

**Warum trotzdem nicht „faellt".** Alle fünf Befunde sind Spezifikationslücken mit benennbaren, kleinen Reparaturen, die dieselbe Architektur voraussetzen und nicht ersetzen; drei davon (T1, T3, T5) haben sogar dieselbe Rettung — der Fold muss eine **Mengenfunktion mit Rebase** sein, nicht ein inkrementeller Anwender. Sie fallen sämtlich in den Umfang von **M0** („Beweis der Speicherarchitektur ohne UI", 2,0 PW), also in genau den Meilenstein, den der Vorschlag selbst nach vorn gezogen hat, damit ein Scheitern billig bleibt (E10). Das ist die Stelle, an der die Struktur des Vorschlags ihn rettet.

**Auflagen (Abnahmekriterien für M0, ohne die der Vorschlag als widerlegt zu behandeln ist).**
1. **T1:** Rebase-Regel entschieden und implementiert; Property 3 ersetzt durch einen Ankunfts-Scheduler mit Verzögerungen bis 10 s; Abnahmekriterium „*n* Prozesse, gemeinsames Verzeichnis, gestörte Zustellung ⇒ nach Konvergenz **identischer** Zustand" für Stufe 2, nicht nur Stufe 1.
2. **T2:** Rückleseprüfung vor jeder Wiederaufnahme; Leser-Resynchronisation als festgelegte Regel; Fehlerinjektion „Kurzschreiben auf dem Share **und** anschließender Retry" in Stufe 3.
3. **T3/T5/T6:** `widerruftId` als Filter; Revisionsordnung über die Meldezeit; HLC-Vorziehverhalten und Anzeigeschwelle getrennt festgeschrieben — je mit einer Property.
4. **T4:** Archivierung als Ereignis mit Ruhephase und Peer-Quittung; `nachzuegler/`-Pfad.
5. **T7:** Die Latenzmessung auf dem realen Synology-Share misst **Serienzugriffe** (`readdir` mit 40 Einträgen, 40× `open+read+close` gegen 40× `read` auf offenen Handles), nicht nur Einzeloperationen; Segmentwechsel je Programmstart wird gestrichen, sofern die Messung ihn nicht rechtfertigt.
6. **T10/T13 + Betriebsparameter:** In M0 wird auf einem echten FüSt-Rechner festgestellt, wo `%APPDATA%` liegt, ob Windows-Offlinedateien für den Share aktiv sind und ob Ausführung aus dem Benutzerprofil erlaubt ist; `test-macos` kommt in die CI-Matrix.
7. **T12:** `aktuell.json` wird mit dem bereits vorhandenen Ed25519-Verfahren signiert, bevor der Update-Pfad ausgeliefert wird.

**Ein Satz für die Synthese.** Die Speicherarchitektur von Vorschlag C ist die richtige Bauform mit einem noch nicht fertigen Regelwerk; sie fällt nicht an ihrer Idee, sondern daran, dass sie den Unterschied zwischen „Fold über die sortierte Menge" und „Anwenden in Ankunftsreihenfolge" nirgends zu Ende denkt — und dieser Unterschied ist im SMB-Betrieb mit 2–10 s Sichtbarkeitsverzug der Normalfall, nicht die Ausnahme.
