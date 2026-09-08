# Widerlegung Vorschlag B (Tauri 2 + Rust-Kern) — Linse: TECHNISCHE KORREKTHEIT

Key: `widerlegung-vorschlag-b-tauri-rust-kern-technik`
Stand: §1–§6 vollständig (zweiter Lauf; der erste brach nach W9 ab, §3.2 wurde um W10 ergänzt, §3.3–§6 neu geschrieben).
Geprüfter Gegenstand: `design/vorschlag-b-tauri-rust-kern.md` §2, §3, §6.2, §7.2, §7.3, §8.1 (M0/M3).
Maßstab: `analysis/nas-speicher-recherche.md` §1 (Primärquellen), §10, §11; `design/betriebsparameter-johannes.md`; Quervergleich `design/zieldatenmodell-feldabgleich.md` §4.

Belegkonvention: `nas §x` = nas-speicher-recherche.md, `kritik §x` = vollstaendigkeitskritik.md, `ZDM §x` = zieldatenmodell-feldabgleich.md, `nachlese-tauri` / `nachlese-speichermodell` = die gleichnamigen Nachlesen, `VB §x` = der geprüfte Vorschlag B. `[Annahme]` markiert eigene, unbelegte Setzungen.

## Gliederung
1. Prüfauftrag, Methode, Abgrenzung
2. Was der Vorschlag bereits korrekt adressiert (keine Findings daraus)
3. Findings
   3.1 Blocker — stiller Datenverlust / stille Divergenz im Schreib-/Spiegelpfad (W1–W3)
   3.2 Schwer — Fold, Undo, Snapshot, Uhren, Beweisführung (W4–W10)
   3.3 Mittel — Segmentwachstum, Archivierung, Snapshotgüte, Benutzerprofil, Update, Nicht-Append-Pfade (W11–W16)
   3.4 Gering (W17–W20)
4. Entlastung und Belastung durch die Betriebsparameter
5. Konsolidierte Auflagenliste (was M0 zusätzlich beweisen muss)
6. Gesamturteil

---

## 1. Prüfauftrag, Methode, Abgrenzung

Geprüft wurde ausschließlich die technische Korrektheit des Speicher-/Sync-Modells und der daran hängenden Mechanismen (Fold, Undo, Snapshot, Archivierung, Migration, Offline-Nachfahren, Fenster/Monitor, Updater ohne Internet) unter den Störfällen: 1–5 gleichzeitige Clients, Netzabbrüche, falsche Uhren, Abstürze mitten im Schreiben, SMB-Metadaten-Caches (10 s / 5 s / 10 s), Oplock/Lease-Semantik und Windows-Dateisperren.

Methode: für jede tragende Entscheidung wurde versucht, eine konkrete Schrittfolge zu konstruieren, die zu Datenverlust, Divergenz zwischen Clients oder einem nicht erkennbaren Falschzustand führt. Eine Feststellung wird nur dann als Finding geführt, wenn (a) die Schrittfolge aus den im Vorschlag getroffenen Festlegungen folgt, (b) der Vorschlag sie nicht bereits behandelt, und (c) angegeben werden kann, welche Ergänzung sie ausräumt.

Nicht Gegenstand dieser Linse: Aufwandsschätzung, Sprachwahl Rust vs. TypeScript, fachliche Vollständigkeit gegenüber der Excel, Bedienbarkeit, Wirtschaftlichkeit. Die Entscheidung „Ereignisprotokoll statt Lockfile-Portierung" (VB §3.2) wird **nicht** angegriffen — ihre sechs Begründungen sind belegt und die Gegenposition (bmecat R9) ist durch die Lost-Update-Reproduktion (kritik §3.4, nachlese-speichermodell §2) und durch nas §1.2/§1.4 widerlegt. Angegriffen wird die **Ausführung**: ob das konkret spezifizierte Modell das leistet, was es verspricht.

Ein Hinweis zur Quellenlage, der die Beweislast verschiebt: `nachlese-speichermodell-widerspruch-aufloesen.md` ist unvollständig (Datei endet nach §2). Die dort angekündigten Abschnitte §3 (Prüfung der fünf SMB-Eigenschaften gegen den Portierungsvorschlag), §5.2/§5.3 (Import-Ereignis, Parallelbetrieb) und insbesondere **§6 „Was nur ein Experiment auf einem echten SMB-Share klären kann"** wurden nie geschrieben. Vorschlag B beruft sich mehrfach auf diese Nachlese (VB §3.2 Punkt 1 und 3); die Liste der experimentell zu klärenden Punkte, auf die M0 sich stützen müsste, existiert also gar nicht. Das ist keine Schwäche des Vorschlags, aber der Grund, warum §5 dieses Berichts eine eigene Auflagenliste aufstellt.

---

## 2. Was der Vorschlag bereits korrekt adressiert (keine Findings daraus)

Diese Punkte wurden geprüft und sind **kein** Angriffspunkt. Sie stehen hier, damit die Synthese sie nicht doppelt behandelt und damit erkennbar ist, dass die Findings in §3 nicht auf Lücken zielen, die der Vorschlag längst geschlossen hat.

1. **Ein Schreiber je Datei.** Der einzige Weg, der die dokumentierte Multi-Writer-Append-Race (nas §1.4 `open(2)` O_APPEND über NFS; nas §1.11 Rust `OpenOptions::append` „does not necessarily guarantee that data appended by different processes or threads does not interleave") umgeht. Korrekt gewählt.
2. **Kein Lock, keine Stale-Übernahme, keine TTL.** VB §3.2 Punkt 3 und §3.7 streichen genau die Mechanismen, die nas §1.2/§1.4 als über SMB nicht sauber definierbar ausweist (`file-lock.ts:25-27`: Vergleich von `Date.now()` des einen mit `acquiredAt` des anderen Rechners, danach Schreiben ohne `wx`). Ersatzlos zu streichen ist die richtige Antwort, nicht sie zu reparieren.
3. **Polling statt Watcher.** Belegt durch nas §1.5 (Node `fs.watch` „may not be reliable" auf NFS/SMB; Rust `notify` „Network mounted filesystems like NFS may not emit any events"). UDP nur als Beschleuniger, mit Kenntnis der Ausfallgründe (nas §1.10: Broadcast über mehrere Adapter, WLAN Client Isolation, Firewall).
4. **Presence als Datei je Client statt geteilter RMW-Datei.** Deckt main §10 (d) und R-SYS-1..3 ab.
5. **Idempotenz über Ereignis-`id`** (VB §3.5 Punkt 6) — macht Wiedereinspielen nach Doppelspiegelung unschädlich. Der *Mechanismus* stimmt; der *Schlüssel* ist unterspezifiziert (→ W3).
6. **Unbekannte Ereignistypen durchreichen statt verwerfen** (VB §3.5 Punkt 8) — deckt nas §10 Restrisiko 3.
7. **`clientId`-Kollision durch Image-Klon** ist als B10 erkannt und mit Zufalls-ULID + Hostname + Fremdschreiber-Erkennung adressiert (nas §10 Restrisiko 4).
8. **Segmentwechsel gegen Doppelstart** (VB §3.3 Präzisierung 1) ist als Mechanismus richtig: konkurrierende `create_new`-Versuche in einer Schleife brauchen keinen Lock, und `create_new` bildet auf SMB2 CREATE mit Disposition FILE_CREATE ab, die serverseitig entschieden wird (nas §1.4, dort als [unbelegt] markiert und in B3 als Spike-Punkt geführt). Der Mechanismus ist nicht das Problem — seine Folgekosten sind es (→ W1, W11).
9. **Datei sofort leer anlegen** (Präzisierung 2) ist die richtige Antwort auf den Directory-Cache; die Restlatenz von ~10 s beim Beitritt neuer Clients wird in VB §3.8 ehrlich zugesagt und nicht kleingeredet.
10. **Fenster/Zweitmonitor.** Die Nachlese ist korrekt wiedergegeben: Issue #14019 ist Wayland-spezifisch und für Windows/macOS nicht einschlägig; der echte S1-Fall (#12167) ist seit Tauri 2.11.0 (PR #15250) gefixt; Fenstererzeugung im `setup()`-Hook statt im synchronen Command (Windows-Deadlock, docs.rs `WebviewWindowBuilder` „Known issues"); Monitorwahl über `position()`/`name()`, weil `tauri::window::Monitor` keine numerische ID hat (nachlese-tauri §2.4). Gemischte DPI (#6843, offen) ist als Spike-Pflicht und als Risiko B8 geführt. Hier gibt es nichts zu widerlegen.
11. **Drucken über den Systembrowser** statt über ein nicht existierendes Tauri-Druck-API (bmecat R7) — technisch korrekt und deckungsgleich mit dem heutigen Excel-Workflow.
12. **Updater-Versionsschema.** Der SemVer-Zwang von `tauri-plugin-updater` gegen das Zeitstempelschema `YYYY.MM.DD.HH.MM` ist erkannt, `BUILD_SEMVER` und `updater-versioning.ts` inkl. des Fixes aus `ffa14f8` werden portiert (VB §2.6).
13. **Performance des Poll-Grundfalls.** Ich habe versucht, die Poll-Last als Killer zu konstruieren, und es geht bei stabiler Segmentzahl nicht auf: 5 Clients, wenige Dateien, 2-s-Zyklus, Ereignisse in Tippgeschwindigkeit — das ist um Größenordnungen weniger Round-Trips als die SQLite-Fassung mit Byte-Range-Locks je Transaktion (nas §1.6). Ein Angriff auf die Performance trägt **nur** über die unbegrenzt wachsende Segmentzahl (→ W11), nicht über den Normalbetrieb.

---

## 3. Findings

Jedes Finding nennt: die **angegriffene Festlegung** (mit Fundstelle im Vorschlag), das **Szenario** als Schrittfolge, den **Beleg**, warum das Szenario eintreten kann, und die **Rettung**.

### 3.1 Blocker — stiller Datenverlust bzw. stille Divergenz im Schreib-/Spiegelpfad

Alle drei Blocker haben dieselbe Signatur und sind deshalb zusammen zu lesen: der schreibende Client hat das Ereignis, alle anderen haben es nie; niemand bemerkt es; keine der vier Property-Eigenschaften (VB §7.2) und kein Lauf von `s1 sim` in der in VB §7.3/§8.1 beschriebenen Form deckt es auf. Das trifft genau die Fehlerklasse, die der Vorschlag selbst als schlimmste benennt („Datenverlust ist der schlimmste Fehler", VB §3.1) und als strukturell ausgeschlossen behauptet („Konvergenz ist garantiert, weil jeder nur eigene Dateien anhängt", VB §3.9).

---

#### W1 (blocker) — Verwaister Segment-Rest: Präzisierung 1 und die Offset-Spiegelung widersprechen sich

**Angegriffene Festlegung.** VB §3.3 Präzisierung 1: „Segmentwechsel bei jedem App-Start … Damit ist ausgeschlossen, dass zwei Prozesse desselben Clients … in dieselbe Datei anhängen." Zugleich VB §3.9: „geschrieben wird **immer zuerst lokal** …, die Share-Spiegelung ist ein zweiter, wiederholbarer Append ab Offset. … Bei Rückkehr wird ab Offset nachgeschoben; Konvergenz ist garantiert."

**Szenario.**
1. Client FUEST1 arbeitet im Einsatz, Segment `c-9b12ef-fuest1.000007.jsonl`. Lokal stehen 412 Ereignisse, auf den Share gespiegelt sind 389 (Offset in `upload-state.json`). Ursache der Lücke: NAS kurz weg, WLAN-Aussetzer, oder schlicht der nächste Spiegelzyklus stand noch aus.
2. Der Rechner stürzt ab / wird zugeklappt / die App wird hart beendet.
3. Neustart. Nach Präzisierung 1 legt der Client Segment `000008` an und schreibt ab jetzt dorthin — lokal **und** auf dem Share.
4. Die 23 Ereignisse 390–412 aus Segment `000007` stehen weiterhin nur im lokalen Log. Es existiert im Vorschlag **keine Regel**, die einen neuen Prozess anweist, den unfertigen Spiegelstand eines *alten* Segments nachzuholen. Der Schreib-Task ist in VB §2.3 als „1 Thread je offenem Einsatz → hängt Ereignisse an die EIGENE lokale Datei an, fsync, dann Spiegelung auf den Share (Append ab Offset)" beschrieben — er kennt genau eine aktuelle Datei.
5. Ergebnis: FUEST1 zeigt eine Lage mit 412 Ereignissen, jeder andere Client eine mit 389. Beide Faltungen sind in sich deterministisch und korrekt. Die Ereignismengen sind verschieden. Es gibt keinen Alarm, weil es keinen Vergleich gibt.

**Beleg, dass die Lücke real entsteht.** Die Spiegelung ist per Konstruktion asynchron gegenüber dem lokalen Schreiben (VB §3.9 nennt sie „zweiten … Append"), und sie muss es sein, weil sonst der Offline-Betrieb blockieren würde. Ein Rückstand ist damit der Normalzustand, nicht die Ausnahme. Dass er beim Absturz besteht, folgt aus nas §1.8 (SMB-Request-Expiration `SessTimeout` 60 s: eine ausstehende Operation blockiert bis zu 60 s, bevor ein Fehler kommt) — in diesem Fenster sammelt sich lokal Material an.

**Warum die vorhandene Absicherung nicht greift.** `s1 sim` „zieht am Ende jeden Client einzeln offline und wieder online" (VB §7.3) — ein *sauberes* Trennen und Wiederverbinden desselben Prozesses. Genau dabei bleibt das Segment offen und der Rückstand wird aufgeholt. Nur ein **Prozessabbruch** zwischen Trennen und Wiederverbinden erzeugt W1. In der M0-DoD (VB §8.1) steht „NAS weg für 10 min ohne Datenverlust" — nicht „Client hart getötet, während der Spiegelstand hinterherhinkt".

**Rettung.** Beim Start (und bei jeder Share-Rückkehr) über **alle eigenen Segmente** iterieren, nicht nur über das aktuelle: für jedes lokale Segment den Share-Stand ermitteln und den Rest nachschieben, bevor das neue Segment beschrieben wird. Zusätzlich einen Abschlussmarker: die letzte Zeile eines stillgelegten Segments ist ein Ereignis `SegmentAbgeschlossen{anzahl, letzteId, hash}`, damit ein Leser erkennt, dass ein Segment vollständig ist — und umgekehrt, dass eines es noch nicht ist. Das macht die Lücke sichtbar statt still. Kosten: gering, aber die Regel muss vor M1 im Ereigniskatalog stehen, weil sie einen Ereignistyp und ein Feld in `upload-state.json` verlangt.

---

#### W2 (blocker) — Abgerissener Share-Append zerstört genau ein Ereignis, und die Leserregel deckt nur die letzte Zeile

**Angegriffene Festlegung.** VB §3.4: „Zeilenformat: `<len>\t<crc32>\t<json>\n`, nach jedem Ereignis `sync_all()`. Leser verwerfen eine unvollständige oder crc-falsche **letzte** Zeile und lesen sie beim nächsten Poll erneut." Und VB §3.2/nas §10: „keine der belegten SMB-Schwächen berührt den Schreibpfad".

**Szenario.**
1. Client MELDEKOPF1 hängt Ereignis 501 (620 Byte) an sein Share-Segment an. Der Schreibvorgang überträgt 280 Byte, dann bricht die Verbindung (WLAN-Roaming, NAS-Neustart, Kabel).
2. Nach nas §1.8 setzt der Client die Verbindung nach `SessTimeout` (Default 60 s) zurück; die App bekommt einen I/O-Fehler. Die 280 Byte können auf dem Server bereits sichtbar sein — SMB2 WRITE ist keine Transaktion über die volle Payload, und `sync_all()` (SMB2 FLUSH, nas §1.9) macht das Geschriebene dauerhaft, nicht das Ungeschriebene ungeschehen.
3. Der Client bemerkt den Fehler, geht in den Offline-Modus, arbeitet lokal weiter.
4. Bei Rückkehr schiebt er „ab Offset" nach. Der Offset in `upload-state.json` steht auf dem Ende von Ereignis 500 — der Client weiß nichts von den 280 Byte. Er hängt Ereignis 501 vollständig an. Auf dem Share steht jetzt: `…<Ereignis 500>\n<280 Byte Bruchstück><len>\t<crc32>\t<json von 501>\n<Ereignis 502>\n…`
5. Jeder Leser zerlegt an `\n`. Die Zeile aus Bruchstück + Ereignis 501 ist CRC-falsch. Sie ist aber **nicht die letzte Zeile** — die Regel „unvollständige letzte Zeile verwerfen und beim nächsten Poll erneut lesen" greift nicht. Was der Leser tut, ist nicht spezifiziert. Verwirft er sie, ist Ereignis 501 für alle außer dem Schreiber dauerhaft weg. Bricht er ab, bleibt der Client auf ewig auf diesem Offset stehen und sieht auch 502ff. nie.
6. Wieder: Schreiber hat 501, alle anderen nicht. Kein Alarm.

**Beleg.** nas §1.9 wörtlich zu FLUSH und zur Pufferung unter Write-Lease: „ein Client-Absturz oder Netzabbruch vor Break/Close kann den Inhalt der `.tmp` verlieren" — der Bericht zieht daraus die Konsequenz für den Rename-Pfad; für den Append-Pfad gilt dieselbe Physik, nur mit dem umgekehrten Vorzeichen: nicht zu wenig, sondern *ein Teil* der Bytes wird dauerhaft. nas §1.8 belegt, dass die Verbindung mitten in einer Operation zurückgesetzt wird und Anwendungen ohne Retry I/O-Fehler sehen.

**Was der Vorschlag beinahe schon hat.** Die Ereigniszeile trägt `prev:"<blake3-8>"` (VB §3.4) — eine Hash-Kette innerhalb der Datei. Sie ist das einzige Mittel im Entwurf, das den Bruch überhaupt erkennen könnte. Es gibt aber **keine Regel, die sie prüft**: weder auf Leserseite (§3.5 nennt neun Regeln, keine davon die Kette) noch auf Schreiberseite. Damit ist `prev` heute reine Dekoration.

**Rettung — drei Teile, alle klein:**
1. **Schreiberseitige Rückleseprüfung vor jedem Wiederaufsetzen.** Vor dem ersten Append nach einem Fehler oder Neustart: Share-Datei ab `Offset − letzteZeilenlänge` lesen, die letzte vollständige Zeile identifizieren, ihre `id` und ihren `prev` gegen das lokale Log prüfen. Nur wenn der Share-Stand ein exaktes Präfix des lokalen Logs ist, darf angehängt werden.
2. **Bei Abweichung: Segment stilllegen, neues Segment beginnen** (`create_new`), und die betroffenen Ereignisse dort erneut schreiben. Die Dedup-Regel über die Ereignis-`id` (VB §3.5 Punkt 6) macht das unschädlich — vorausgesetzt, W3 ist behoben.
3. **Leserseitige Kettenprüfung als harte Bedingung**: eine CRC- oder Ketten-Falschzeile, die nicht die letzte ist, ist ein Defekt, kein Rauschen. Sie muss zu einem sichtbaren Fehler („Segment X ab Ereignis N beschädigt") führen und nicht zum stillen Überspringen. Ohne diese Regel ist die Kette wertlos.

---

#### W3 (blocker) — Ereignis-`id` ohne Persistenz- und Monotoniezusage: die Dedup-Regel verwirft echte Ereignisse

**Angegriffene Festlegung.** VB §3.4/§3.5 Punkt 6: „Ereignis-`id` ist `<clientId>:<laufnummer>`; ein zweimal gelesenes Ereignis wird verworfen. Damit ist ein Wiedereinspielen (Backup, Doppelspiegelung) unschädlich." Beispielzeile in §3.4: `"id":"c-9b12ef:000123"`. (ZDM §4.1 verwendet denselben Aufbau und macht ebenfalls keine Aussage zur Laufnummer.)

**Szenario.**
1. FUEST1 startet die App, schreibt Segment `000007` mit den Ereignissen `c-9b12ef:000001` … `c-9b12ef:000123`.
2. Absturz. Neustart. Nach Präzisierung 1 wird Segment `000008` angelegt.
3. Woher kommt die nächste Laufnummer? Der Vorschlag sagt es nicht. Die naheliegende Implementierung — Zähler im Prozess, beginnend bei 1, weil das Segment neu ist — erzeugt erneut `c-9b12ef:000001`.
4. Jeder Leser (inklusive FUEST1 selbst nach dem nächsten Neustart) faltet zuerst Segment `000007`, sieht `c-9b12ef:000001` … `000123`, und **verwirft anschließend die ersten 123 Ereignisse aus Segment `000008` als Duplikate**. Die Dedup-Regel, die vor Doppelspiegelung schützen soll, löscht echte Arbeit.
5. Verschärfung: Selbst mit einem persistierten Zähler ist die Reihenfolge Schreiben-dann-Zähler-erhöhen nicht absturzsicher. Wird der Zähler nach dem Ereignis gespeichert und der Prozess stirbt dazwischen, vergibt der Neustart dieselbe Nummer für ein **anderes** Ereignis. Dann existieren zwei verschiedene Ereignisse mit derselben `id`; welches gefaltet wird, hängt davon ab, welches ein Client zuerst liest — also von der Lesereihenfolge. Das ist unmittelbar eine Divergenz zwischen Clients und widerlegt den Determinismus-Anspruch.

**Beleg.** Der Vorschlag definiert die `id` als Paar aus `clientId` und Laufnummer und trifft an keiner Stelle eine Aussage über Persistenz, Monotonie oder Absturzverhalten des Zählers. Präzisierung 1 (VB §3.3) macht Neustarts zum Regelfall und legt die Segmentgrenze als natürliche Zählergrenze nahe. Die Idempotenzregel (VB §3.5 Punkt 6) hängt vollständig an dieser `id`.

**Rettung.** Zwei Zeilen Spezifikation, aber sie müssen vor M1 stehen:
1. `id = <clientId>:<segment>:<laufnummer im Segment>` — dann ist die Eindeutigkeit strukturell erzwungen und braucht keinen persistenten Zustand. Der Segmentname ist bereits durch `create_new` global eindeutig je Client.
2. Alternativ: Zähler nicht speichern, sondern beim Start aus dem **lokalen** Log ableiten (Anzahl der Zeilen bzw. höchste vergebene Nummer). Das lokale Log ist ohnehin die primäre Wahrheit (VB §3.9) und übersteht den Absturz; damit ist die Ableitung absturzsicher und braucht keine zweite Datei.
Zusätzlich: eine Property-Eigenschaft „`id` ist über alle Segmente eines Clients hinweg eindeutig" gehört in die Liste in VB §7.2, weil kein bestehender Test das prüft.

---

### 3.2 Schwer — Fold, Undo, Snapshot, Uhren, Beweisführung

#### W4 (schwer) — Kompensation und Snapshot-Äquivalenz sind beweisbar unvereinbar

**Angegriffene Festlegungen.** VB §3.5 Punkt 7: „Kompensation statt Rücknahme: `EreignisKompensiert{zielId, begruendung}` ist das Undo. Der Fold wendet das kompensierte Ereignis **nicht an**." VB §7.2 Eigenschaft 3: „Snapshot-Äquivalenz: `fold(events) == fold_from(snapshot_at(k), events[k..])` für jedes k. Damit ist Restrisiko 5 maschinell abgedeckt."

**Der Widerspruch, formal.** Sei E ein Ereignis mit Index i < k, das das Feld `einheit.bemerkung` auf „X" setzt (vorher „W"). Sei C ein Kompensationsereignis mit Index j > k und `zielId = E`.
- `fold(events)`: E wird nicht angewandt → `bemerkung = "W"`.
- `fold_from(snapshot_at(k), events[k..])`: der Snapshot enthält `bemerkung = "X"`; beim Anwenden von C liegt E nicht mehr im Eingabestrom. Um „W" wiederherzustellen, müsste die Projektion den Vorgängerwert **und** dessen HLC-Wasserzeichen enthalten. Eine Projektion mit Feld-LWW (VB §3.5 Punkt 2) enthält beides nicht.

Die beiden Eigenschaften können also nicht gleichzeitig gelten. Die Property-Eigenschaft 3 wird, sobald sie implementiert ist, an genau diesem generierten Fall scheitern — das ist der gute Ausgang. Der schlechte Ausgang: die Generatoren erzeugen `EreignisKompensiert` nicht über eine Snapshotgrenze hinweg, der Test bleibt grün, und im Feld ist ein Undo nach dem Snapshotpunkt wirkungslos oder falsch.

**Verschärfung durch die Fold-Struktur.** Die Regel „der Fold wendet das kompensierte Ereignis nicht an" ist **nicht** in einem einzigen Vorwärtsdurchlauf über die HLC-sortierten Ereignisse ausführbar, wenn die Kompensation ein *fremdes* Ereignis betrifft (FüSt nimmt eine Meldekopf-Eingabe zurück — genau der von hb F-L2 geforderte Fall). Der Fold sieht E, bevor er C sieht. Er müsste also entweder zweistufig arbeiten (erst alle Kompensationen einsammeln, dann falten) oder rückwirkend korrigieren. Der Lese-Task in VB §2.3 ist aber inkrementell beschrieben („faltet neue Ereignisse in die Projektion"). Beides — Zweistufigkeit und inkrementelle Faltung — ist im Vorschlag nicht in Einklang gebracht.

**Belege für die Alternative.** ZDM §4.3 löst dasselbe Problem anders und richtig: Regel U1 — „Undo ist immer ein neues Ereignis (Kompensation). Es trägt `undoOf` **und die Payload, die den vorherigen Zustand wiederherstellt** (aus dem `vorher`-Feld des Originals). Der Fold behandelt es wie ein normales Ereignis — **kein Sonderpfad, keine Rückwärtslogik**." Damit ist die Kompensation ein gewöhnliches LWW-Schreibereignis, einstufig faltbar und snapshot-äquivalent. Vorschlag B hat diese Formulierung nicht übernommen, sondern die semantisch stärkere und technisch unhaltbare Variante „Ereignis wird nicht angewandt" gewählt.

**Rettung.** Die ZDM-Fassung übernehmen: Kompensation ist ein normales Ereignis mit Vorher-Payload, `undoOf` ist nur ein Etikett für ETB und UI, nie ein Fold-Sonderpfad. Dann gilt Eigenschaft 3 wieder, und der inkrementelle Lese-Task bleibt korrekt. Voraussetzung ist W9 (Vorher-Werte in jedem Feldereignis) — die beiden Findings hängen zusammen.

---

#### W5 (schwer) — Die HLC-Korrektur beim Lesen zerstört den Determinismus, den §3.7 zwei Punkte vorher zusichert

**Angegriffene Festlegung.** VB §3.7 letzter Punkt: „**HLC-Drift begrenzen**: `uhlc` lehnt Ereignisse mit absurder Zukunftszeit ab (konfigurierbares Delta, Vorschlag 10 min); solche Ereignisse werden angenommen, aber **mit korrigierter HLC neu eingeordnet** und markiert."

**Warum das falsch ist.** Die korrigierte HLC entsteht aus der Uhr und dem Zustand des **lesenden** Clients zum **Zeitpunkt des Lesens**. Sie wird nicht in die Ereignisdatei zurückgeschrieben — das verbietet die Grundregel „nur eigene Dateien" (VB §3.2, nas §11). Also gilt:
- Client A liest das Ereignis um 14:03 und ordnet es bei HLC(A, 14:03) ein.
- Client B ist zu dem Zeitpunkt offline und liest dasselbe Ereignis um 14:41 → HLC(B, 14:41).
- A und B falten dieselbe Ereignismenge in **unterschiedlicher Reihenfolge** und erhalten bei jedem LWW-Konflikt einen anderen Zustand.

Das widerspricht direkt VB §1.1 („deterministisch faltet"), VB §3.5 Punkt 1 („Deterministisch und uhrenunabhängig") und VB §3.7 Punkt 1 („Eine falsch gestellte Uhr verschiebt die Ordnung, **zerstört aber weder Determinismus noch Daten** – jeder Client faltet dieselbe Reihenfolge"). §3.7 Punkt 1 und §3.7 Punkt 4 können nicht beide gelten.

**Herkunft des Fehlers.** `uhlc::update_with_timestamp()` mit `ExceedingDeltaError` (nas §1.11) ist ein Schutz für **live** empfangene Nachrichten in einem Nachrichtenprotokoll: dort verhindert er, dass ein Peer mit kaputter Uhr die eigene Uhr dauerhaft in die Zukunft zieht. Auf einen **gespeicherten, dauerhaften** Ereignislog angewandt wird derselbe Mechanismus zu einer leserabhängigen Umschreibung der Historie. Der Vorschlag markiert die konkrete Ausgestaltung selbst als `[Annahme]` — die Annahme ist falsch.

**Rettung.** Trennen, was `uhlc` vermischt:
1. **Ordnung**: strikt nach der im Ereignis gespeicherten HLC, Gleichstand nach `clientId` (VB §3.5 Punkt 1). Nie korrigieren, nie umschreiben. Ein Ereignis mit falscher Uhr landet an einer fachlich unpassenden Stelle — aber bei **allen** Clients an derselben.
2. **Eigene Uhr**: der `ExceedingDelta`-Schutz darf verhindern, dass die *eigene* HLC durch ein fremdes Ereignis in die Zukunft gezogen wird (sonst reißt ein Client mit kaputter Uhr alle anderen mit). Das ist eine Entscheidung über die **eigene nächste** HLC, nicht über die Einordnung des fremden Ereignisses.
3. **Sichtbarkeit**: die bereits vorgesehene Driftwarnung (§3.7 Punkt 3, Schwelle 120 s) bleibt und ist die richtige Antwort auf das Problem.

---

#### W6 (schwer) — Kein Zyklusregelwerk für `AbschnittUmgehaengt`: die zugesicherte Invariante ist mit Feld-LWW nicht haltbar

**Angegriffene Festlegungen.** VB §3.5 Punkt 2: „Feldebene, Last-Writer-Wins: je Entität und je Feld gewinnt das Ereignis mit der höheren HLC." VB §7.2 Eigenschaft 4: „Invariantenerhalt: Nach jedem Fold gilt: **kein Abschnittszyklus** (`validations.ts:12-35`) …". Der Ereigniskatalog (§3.4) enthält `AbschnittUmgehaengt`; die neun Fold-Regeln in §3.5 enthalten **keine** Regel dazu.

**Szenario.**
1. Abschnittsbaum: Wurzel → A, Wurzel → B.
2. Client 1 hängt A unter B (`AbschnittUmgehaengt{A, neuParent: B}`, HLC 100).
3. Client 2 hängt zeitgleich B unter A (`AbschnittUmgehaengt{B, neuParent: A}`, HLC 101).
4. Feld-LWW greift **je Entität und je Feld**: `A.elternId` wird von Ereignis 1 gesetzt, `B.elternId` von Ereignis 2. Beide Ereignisse betreffen verschiedene Entitäten, es gibt keinen Konflikt im Sinne der LWW-Regel — **beide gewinnen**.
5. Ergebnis: A ist Kind von B und B ist Kind von A. Zyklus. Die Einheiten in diesem Teilbaum sind aus der Wurzel nicht mehr erreichbar; jede rekursive Auswertung (Gesamtstärke, Druckausgabe, Führungsstruktur) läuft in eine Endlosschleife oder liefert falsche Summen.

**Warum das kein Randfall ist.** Es ist das klassische Move-Problem replizierter Bäume; nas §1.11 nennt genau deshalb, dass Loro einen `Tree`-Container mit Move hat und `yrs` keinen. Vorschlag B hat CRDT-Bibliotheken bewusst verworfen (nas §10: „für Stammdaten-artige Einsatzdaten mit fachlichen Regeln bringt eine CRDT keinen Mehrwert gegenüber dem eigenen Fold") — das ist vertretbar, verpflichtet aber dazu, die Regel selbst zu schreiben. Sie fehlt. Die genannte Gegenmaßnahme „erschöpfendes `match` im Fold (Compiler erzwingt Vollständigkeit)" (Risiko B1) hilft hier nicht: der `match`-Arm für `AbschnittUmgehaengt` existiert und tut etwas, es ist nur das Falsche. Der Compiler prüft Typvollständigkeit, nicht Regelrichtigkeit — das ist der Kern von W7.

**Belege für die Lösung.** ZDM §4.2 hat die Regel bereits ausformuliert: „LWW/Feld, **danach Zyklusprüfung**. Entsteht durch nebenläufiges Umhängen ein Zyklus, wird die Kante mit der **größeren** `hlc` gelöst: der betroffene Abschnitt wird an die Wurzel gehängt und ein Konflikthinweis erzeugt. (Deterministisch, weil `hlc` total geordnet ist.)" Und ZDM §4.4 P5 „Kein Waisenzustand".

**Rettung.** Die ZDM-Regel übernehmen und in §3.5 als eigenen Punkt führen. Zusätzlich prüfen, ob dieselbe Klasse bei anderen Beziehungsfeldern auftritt: `FahrzeugUmgehaengt` (Fahrzeug an Einheit), `EinheitGeteilt`/`EinheitZusammengefuehrt` (zusammengeführte Einheit wird nebenläufig geteilt — ZDM hat dafür Regeln, VB §3.5 nur für `EinheitGeteilt`, `EinheitZusammengefuehrt` steht ohne Regel im Katalog).

---

#### W7 (schwer) — Property-Eigenschaft 1 ist eine Tautologie; die Hauptgegenmaßnahme gegen das selbsterklärte Top-Risiko wirkt nicht

**Angegriffene Festlegung.** VB §7.2 Eigenschaft 1: „**Determinismus/Kommutativität:** Für jede Permutation der Eingangsreihenfolge (die HLC-Sortierung bleibt fix, die Ankunftsreihenfolge variiert) ist die Projektion bit-identisch. **Das ist der Test, der Restrisiko 1 aus nas §10 adressiert.**" Restrisiko 1 ist „Regelwerk-Vollständigkeit"; Vorschlag B führt es als B1 („hoch × sehr hoch", „das gefährlichste Risiko, weil es *nicht auffällt*").

**Warum die Eigenschaft nichts prüft.** Der Fold sortiert die Eingabe zuerst nach HLC (§3.5 Punkt 1, Gleichstand nach `clientId`). Sortieren ist eine kanonische Funktion: für jede Permutation P einer Menge M gilt `sort(P) = sort(M)`. Also gilt `fold(sort(P)) = fold(sort(M))` für **jede** beliebige Fold-Funktion — auch für eine, die den Baum zerstört (W6), die Kompensation falsch behandelt (W4) oder Stärken falsch mischt. Die Eigenschaft ist erfüllt, bevor die erste Fachregel geschrieben ist. Sie testet die Sortierfunktion, nicht das Regelwerk. (Dieselbe Schwäche hat ZDM §4.4 P1; dort ist sie durch P4 „Summenerhaltung", P5 „Kein Waisenzustand" und P6 „Monotone Zustandsmaschine" wenigstens teilweise aufgefangen — Vorschlag B hat diese drei nicht.)

Die drei übrigen Eigenschaften decken die Lücke nicht: Eigenschaft 2 (Idempotenz) prüft die Dedup-Regel, Eigenschaft 3 (Snapshot-Äquivalenz) ist mit der Kompensationsregel unvereinbar (W4), Eigenschaft 4 (Invarianten) ist die einzige, die überhaupt Fachaussagen trifft — und sie ist nach W6 mit dem spezifizierten Regelwerk nicht erfüllbar.

**Konsequenz.** Das gefährlichste Risiko des Vorschlags (B1) hat drei Gegenmaßnahmen: Ereigniskatalog als Spezifikation vor der Implementierung, erschöpfendes `match`, vier Property-Eigenschaften. Die erste ist gut und liegt in ZDM §4 bereits vor (dort deutlich vollständiger als in VB §3.5); die zweite prüft Typ- statt Regelvollständigkeit; die dritte ist wie gezeigt weitgehend leer. Das Risiko ist damit praktisch unabgedeckt.

**Rettung — konkrete Ersatztests:**
1. **Sichten statt Permutationen.** Nicht die Reihenfolge variieren, sondern die **Teilmenge**: generiere eine Ereignismenge und n Client-Sichten (jede Sicht = eine wachsende Teilmenge mit zufälligen Verzögerungen je Quelldatei), falte jede Sicht inkrementell und prüfe, dass am Ende alle Sichten und der Ein-Schuss-Fold denselben Zustand liefern. Das ist der Test, der W4 (inkrementell vs. zweistufig) und W1/W2 (unterschiedliche Ereignismengen) überhaupt sichtbar macht.
2. **Orakel statt Selbstvergleich.** Eine bewusst naive, langsame Referenzfaltung (kopierender Zustand, keine Wasserzeichen, keine Snapshots) gegen die optimierte stellen — Differentialtest. Nur so lässt sich prüfen, ob die inkrementelle Faltung mit Feld-Wasserzeichen dasselbe tut wie die naive.
3. **Fachinvarianten aus ZDM §4.4 übernehmen** (P4 Summenerhaltung über Teilen/Zusammenführen, P5 keine Waisen, P6 monotone Zustandsmaschine für `Anforderung`) und um zwei ergänzen: „kein Zyklus im Abschnittsbaum" (W6) und „`id`-Eindeutigkeit über alle Segmente" (W3).

---

#### W8 (schwer) — `s1 sim` und M0 können die entscheidenden SMB-Effekte konstruktionsbedingt nicht beobachten

**Angegriffene Festlegungen.** VB §7.3: „`s1 sim --share \\NAS\S1-Control --clients 4 … startet **vier Prozesse**, erzeugt Ereignisse …, misst Sichtbarkeitslatenz …, zieht am Ende jeden Client einzeln offline und wieder online und vergleicht am Schluss die Projektionen aller vier per blake3." VB §8.1 M0(a): „Prototyp `s1-sim` in Rust: **4 Prozesse**, ein echtes SMB-Share … **Abbruchkriterium benannt:** scheitert (a), fällt der ganze Vorschlag."

**Der Mangel.** Vier Prozesse auf **einer** Maschine teilen sich einen SMB-Redirector, eine Session, einen Satz Client-Caches und einen Satz Oplocks/Leases. Genau die Effekte, die M0 beweisen soll, sind damit ausgeblendet:
- **Metadaten-Caches sind pro Client-Maschine** (nas §1.2: `FileInfoCacheLifetime` 10 s, `FileNotFoundCacheLifetime` 5 s, `DirectoryCacheLifetime` 10 s, Registry unter `Lanmanworkstation`). Zwischen zwei Prozessen desselben Rechners tritt die Verzögerung nicht auf. Die gemessene Sichtbarkeitslatenz p95 ist damit systematisch zu gut — und sie ist die Zahl, die VB §3.8 der FüSt zusagt.
- **Oplock-/Lease-Breaks** entstehen erst, wenn ein *zweiter Client* dieselbe Datei öffnet (nas §1.2: „bei konkurrierendem Öffnen sendet der Server einen Oplock/Lease-Break"). Innerhalb eines Clients ändert sich der Lease-Zustand nicht. Der Samba-HOWTO-Befund (nas §1.11: „any break the first client receives will affect synchronization of the entire file") ist so nicht reproduzierbar.
- **Sharing Violations und Rename-EBUSY** (nas §1.4) entstehen aus Handles verschiedener Clients.
- **Die drei Betriebssysteme** (Betriebsparameter: Windows 11 primär, macOS/Linux zu berücksichtigen) haben unterschiedliche Caches (nas §1.6 mount.cifs `cache=`/`actimeo=`, §1.7 macOS `nsmb.conf` `dir_cache_max_cnt`). Ein Ein-Maschinen-Lauf prüft genau eine davon.
- **Der Fehlerkatalog ist zu klein.** „Jeden Client einzeln offline und wieder online ziehen" ist ein sauberer Ab- und Aufbau. W1 braucht einen harten Prozessabbruch bei Spiegelrückstand, W2 einen Verbindungsabriss **während** eines Share-Appends, W3 einen Absturz zwischen Ereignis und Zählerfortschreibung.
- **Der Vergleich ist zu spät und zu grob.** „Am Schluss die Projektionen aller vier per blake3" prüft die Konvergenz im Ruhezustand. Er findet W1 und W2 nur, wenn der betroffene Client noch läuft und seine eigene Projektion mit in den Vergleich geht — er findet nicht, ob ein Snapshot zwischenzeitlich einen Falschzustand eingefroren hat (W13), und er sagt nichts über Zwischenzustände.

**Konsequenz.** M0 ist der Meilenstein mit dem einzigen Abbruchkriterium des ganzen Vorschlags („scheitert (a), fällt der ganze Vorschlag"). Ein Instrument, das die Hauptrisiken nicht sehen kann, erzeugt eine grüne Ampel mit Signalwirkung für 27 weitere Personenwochen.

**Rettung.**
1. M0(a) auf **mindestens zwei physischen Windows-11-Rechnern plus einem macOS-Rechner** gegen die reale Synology fahren, nicht vier Prozesse auf einem. `s1 sim` braucht dafür nur einen Modus „ein Prozess je Maschine, gemeinsamer Plan aus einer Plandatei auf dem Share, Vergleich am Ende über die geschriebenen Projektionshashes".
2. Fehlerinjektion in die Liste: hartes Töten mitten im Share-Append; Kabel ziehen während eines Appends; NAS-Neustart; Uhr eines Clients um 3 h verstellen; Client mit geklontem Profil.
3. Vergleich nicht nur am Ende, sondern nach jeder Ruhephase, und zusätzlich der Vergleich **lokales Log ⟷ Share-Segment** je Client (das ist der Test, der W1 und W2 direkt trifft und billiger ist als jeder Konvergenztest).
4. Die gemessene Latenz getrennt ausweisen für „bekannte Datei, neue Bytes" und „neuer Client / neues Segment" — nur die zweite Zahl trägt die 10-s-Zusage aus VB §3.8.

---

#### W9 (schwer) — Ohne Vorher-Werte gibt es keine Konflikterkennung; „kein Datenverlust" ist auf Feldebene falsch

**Angegriffene Festlegungen.** VB §3.4 (Ereigniszeile: `payload` enthält nur den neuen Wert, kein `vorher`), §3.5 Punkt 2 (Feld-LWW), §3.6 („Ersatz: unverbindlicher Bearbeitungshinweis … Die Feldebenen-LWW macht ihn fachlich entbehrlich"), §3.9 („**Kein Merge-Dialog, kein Datenverlust**, kein Sonderfall im Code").

**Das technische Argument.** Eine HLC liefert eine **Totalordnung**, keine partielle Ordnung. Aus zwei HLC-Werten lässt sich ableiten, welcher größer ist — nicht, ob der Schreiber des größeren den kleineren *gesehen* hatte. Damit ist im Entwurf, so wie er spezifiziert ist, **nicht entscheidbar**, ob eine Überschreibung eine bewusste Korrektur oder ein blindes Überschreiben fremder Arbeit war. Konflikthinweise sind nur für zwei Strukturfälle vorgesehen (§3.5 Punkt 3 aufgelöster Zielabschnitt, Punkt 5 Split); für den häufigsten Fall — zwei Menschen ändern dasselbe Feld derselben Einheit — gibt es keinen.

**Szenario, das den Betrieb trifft.**
1. Meldekopf BR2 arbeitet 40 min ohne Share-Verbindung (Normalpfad nach VB §3.9) und meldet für 12 Einheiten Stärken und Status.
2. Die FüSt hat in derselben Zeit über Funk für 5 dieser Einheiten Stärken korrigiert.
3. Der Meldekopf kommt zurück. Alle Ereignisse werden gespiegelt und gefaltet. Für die 5 überschneidenden Einheiten gewinnt jeweils die höhere HLC — bei synchronen Uhren (NTP ist laut Betriebsparametern vorhanden) also der zeitlich spätere Eintrag.
4. Der Verlierer verschwindet aus der Projektion. Er steht im ETB, aber niemand schaut dort nach, weil niemand weiß, dass er nachschauen müsste. Weder der Meldekopf noch die FüSt bekommt eine Meldung.

**Ist das ein Fehler oder gewollt?** Als Konfliktstrategie ist LWW vertretbar. Falsch ist die **Zusage**: „kein Datenverlust" (§3.9) beschreibt korrekt die *Ereignisebene* (kein Ereignis geht verloren) und wird im selben Satz als Aussage über die *Lage* gelesen. Auf Feldebene ist LWW definitionsgemäß Verwerfen. Und der begründete Verzicht auf Record-Locks (§3.6, „die Feldebenen-LWW macht ihn fachlich entbehrlich") setzt genau die Konflikterkennung voraus, die es nicht gibt.

**Belege für die Lösung.** ZDM §4.1 Regel 3: „Jedes Ereignis, das ein Feld setzt, trägt neben `neu` auch `vorher` (den Wert, den der schreibende Client gesehen hat). Das kostet Bytes und liefert dafür drei Dinge: lesbare ETB-Sätze …, **erkennbare Konflikte** (`vorher` passt nicht zum gefalteten Zustand → Hinweis im UI) und **triviale Kompensation**." ZDM §4.2 wendet das durchgängig an (`StaerkeGeaendert`: „Passt `vorher` nicht zum gefalteten Zustand → Konflikthinweis mit beiden Werten, LWW gilt trotzdem"), ZDM §4.3 Regel U6 beschreibt genau den Fall „ein Bediener verwirft still fremde Arbeit".

**Rettung.** `vorher` in jedes feldsetzende Ereignis aufnehmen (Vorschlag B hat es in §3.4 nicht) und die Regel „`vorher` ≠ gefalteter Zustand ⇒ Konflikthinweis in der Projektion" in §3.5 ergänzen. Das ist zugleich die Voraussetzung für die Rettung von W4. Kosten: einige Bytes je Ereignis; Nutzen: die Konflikthinweise, die §3.6 bereits als Ersatz für die Record-Locks eingeplant hat, werden überhaupt erst berechenbar.

---

#### W10 (schwer) — Inkrementelle Faltung ohne Feld-Wasserzeichen: der Nachzügler überschreibt den neueren Wert

**Angegriffene Festlegungen.** VB §3.5 Punkt 1: „**Ordnung:** Sortierung nach HLC, bei Gleichstand nach `clientId`." VB §3.5 Punkt 2: „Feldebene, Last-Writer-Wins: je Entität und je Feld gewinnt das Ereignis mit der höheren HLC." VB §2.3 Lese-Task: „Poll 2 s: readdir + read-at-offset fremder Dateien, **faltet neue Ereignisse in die Projektion**". VB §3.9: „Bei Rückkehr wird ab Offset nachgeschoben; **Konvergenz ist garantiert**, weil jeder nur eigene Dateien anhängt."

**Der Widerspruch.** „Sortierung nach HLC" beschreibt einen Ein-Schuss-Fold über die *vollständige* Ereignismenge. Der Lese-Task ist aber inkrementell: er bekommt alle 2 s einen Nachschub und faltet ihn in eine bestehende Projektion. Beides ist nur dann dasselbe, wenn die Projektion je Feld merkt, mit welcher HLC der aktuelle Wert gesetzt wurde, und ein eintreffendes Ereignis mit *kleinerer* HLC verwirft. Diesen Zustand — ein HLC-Wasserzeichen je Feld — nennt der Vorschlag an keiner Stelle: weder in §3.5 (neun Regeln, keine davon zum Wasserzeichen), noch in der Projektionsbeschreibung (§2.3 `lage: RwLock<Projektion>`), noch im Ereigniskatalog. Ohne es lautet die naheliegende Implementierung von Punkt 2 „setze das Feld auf den Wert des zuletzt *verarbeiteten* Ereignisses" — und das ist Ankunftsreihenfolge, nicht HLC-Reihenfolge.

**Szenario — es ist der vom Vorschlag selbst zum Normalpfad erklärte Fall.**
1. Meldekopf BR2 verliert die Share-Verbindung um 14:00. Er arbeitet 40 min weiter (VB §3.9: „Der Normalpfad ist bereits offline"), unter anderem setzt er um 14:05 `einheit-17.bemerkung = "Trupp abgesetzt"` (HLC ≈ 14:05).
2. Die FüSt ist online und setzt um 14:20 dasselbe Feld auf `"Trupp zurück, Fahrzeug defekt"` (HLC ≈ 14:20). Alle online-Clients falten das und zeigen es an.
3. Um 14:40 kommt BR2 zurück und spiegelt seine Ereignisse. Der Lese-Task der FüSt liest sie als „neue Ereignisse" und faltet sie ein.
4. Ohne Wasserzeichen gewinnt bei der FüSt der zuletzt *verarbeitete* Satz: die Bemerkung springt auf den 35 Minuten älteren Stand „Trupp abgesetzt".
5. Ein Client, der in diesem Moment frisch startet und alles neu faltet (Ein-Schuss, HLC-sortiert), zeigt korrekt „Trupp zurück, Fahrzeug defekt".
6. Ergebnis: **zwei Clients, gleiche Ereignismenge, verschiedener Zustand** — genau das, was §3.9 als strukturell ausgeschlossen behauptet. Und der Zustand des länger laufenden Clients ist der falsche; ein Neustart „repariert" ihn, was die Fehlersuche im Einsatz maximal irreführend macht.

**Warum die vorhandene Absicherung nicht greift.** Property-Eigenschaft 1 (§7.2) permutiert die *Eingangsreihenfolge*, sortiert aber laut eigener Formulierung vorher nach HLC — sie prüft damit nur den Ein-Schuss-Fold (siehe W7) und niemals den inkrementellen Pfad. Eigenschaft 3 (Snapshot-Äquivalenz) vergleicht `fold(events)` mit `fold_from(snapshot, rest)` — auch das sind zwei Ein-Schuss-Läufe. Kein Test im Vorschlag vergleicht „inkrementell gewachsene Projektion" gegen „frisch gefaltete Projektion". `s1 sim` vergleicht am Ende per blake3 die Projektionen aller vier Clients (§7.3) — das würde den Fehler theoretisch sehen, aber nur, wenn während des Laufs tatsächlich ein Client offline war *und* danach nicht neu gestartet wurde *und* dasselbe Feld nebenläufig geschrieben wurde. Der Standardlauf („zieht am Ende jeden Client einzeln offline und wieder online") erzeugt genau das nicht zuverlässig.

**Beleg, dass das kein konstruierter Randfall ist.** Der Offline-Betrieb ist im Vorschlag der Normalpfad (§3.9, Überschrift und erster Satz). Die Sichtbarkeitslatenz-Tabelle (§3.8) führt „NAS kurz weg → fremde Änderungen erscheinen nach Rückkehr **gebündelt**" ausdrücklich als erwarteten Betriebsfall. Ein gebündelter Nachschub mit durchweg älteren HLCs ist damit der Regelfall, nicht die Ausnahme.

**Rettung.**
1. Die Projektion trägt je Feld (bzw. je Feld-Slot einer Entität) die HLC des gewinnenden Ereignisses. Der Fold *vergleicht* statt zuzuweisen: `if e.hlc > slot.hlc { slot = (wert, e.hlc, e.clientId) }`, Gleichstand nach `clientId`. Das ist die einzige Formulierung, unter der Punkt 1 und Punkt 2 gemeinsam gelten und unter der inkrementelle und Ein-Schuss-Faltung dasselbe Ergebnis liefern.
2. Für nicht-feldartige Regeln (Verschieben, Teilen, Auflösen, Kompensation) gilt dasselbe Problem verschärft — dort reicht kein Wasserzeichen. Entweder werden diese Ereignisse zurückgestellt und die betroffene Entität wird bei einem Nachzügler **neu aus ihrer Ereignisliste gefaltet** (Teil-Refold je Entität), oder der Lese-Task faltet bei jedem Nachzügler mit HLC kleiner als dem globalen Hochwasserstand vom letzten Snapshot neu. Der Vorschlag muss sich für einen der beiden Wege entscheiden; heute enthält er keinen.
3. Der Test dazu ist die „Sichten"-Eigenschaft aus der Rettung zu W7: dieselbe Ereignismenge, unterschiedliche Ankunftsstaffelung je Sicht, am Ende bit-identische Projektionen — und zusätzlich ein Vergleich jeder inkrementell gewachsenen Projektion gegen den Ein-Schuss-Fold nach jedem Nachschub.

---

### 3.3 Mittel — Segmentwachstum, Archivierung, Snapshotgüte, Benutzerprofil, Update, Nicht-Append-Pfade

#### W11 (mittel) — Segmentwechsel bei jedem Start: die Dateizahl wächst mit den Neustarts, und die Poll-Kosten wachsen mit ihr

**Angegriffene Festlegungen.** VB §3.3 Präzisierung 1: „Segmentwechsel bei jedem App-Start … neues Segment bei >8 MB **oder bei App-Neustart**." VB §3.8: „UDP blockiert → ≤ 2 s Poll + SMB-Leselatenz". nas §11 Poll-Zyklus: „alle 2 s `readdir(events)` (neue Dateien), dann **für jede bekannte Datei** `open`+`read` ab letztem Offset".

**Die Rechnung.** Die Zahl der Segmentdateien ist nicht durch die Datenmenge begrenzt, sondern durch das Verhalten der Bediener. Ein Hochwassereinsatz über eine Woche, 5 Rechner (Betriebsparameter: „1 bis 5"), je Rechner Schichtwechsel, Zuklappen, Akku, Absturz, Neustart — konservativ 4 Starts je Rechner und Tag:

| | Segmentdateien in `events/` |
|---|---|
| 1 Tag, 3 Clients, 4 Starts | 12 |
| 3 Tage, 5 Clients, 4 Starts | 60 |
| 7 Tage, 5 Clients, 4 Starts | **140** |

Bei 140 Dateien und einem 2-s-Zyklus fragt **jeder** Client 70 Dateien pro Sekunde ab (open/read-at-offset, ggf. plus `readdir`); bei 5 Clients sind das ~350 SMB-Round-Trips/s auf einer Synology, von denen 139/140 nichts zurückgeben, weil die Segmente stillgelegt sind. Der Vorschlag rechnet diese Zahl an keiner Stelle vor; §3.8 sagt Latenzen zu, die nur bei kleiner, stabiler Dateizahl gelten, und Risiko B12 betrifft ausdrücklich nur „Logwachstum/Startzeit", also die *Ereignis*-, nicht die *Dateizahl*.

**Beleg, dass genau diese Lastform das bekannte Problem ist.** Die Betriebsparameter halten fest, dass der Mehrclient-Betrieb mit SQLite an der **Langsamkeit** scheiterte, nicht an Korruption. Die Ursache dort waren Lock-Round-Trips je Transaktion über SMB (nas §1.6). Ein Poll-Modell, dessen Round-Trip-Zahl linear mit der Zahl der Neustarts wächst, reproduziert dieselbe Fehlerklasse auf einem anderen Weg — und zwar erst nach Tagen, also genau dann, wenn der Einsatz seinen Höhepunkt hat. Zusätzlich: jede neue Datei ist beim Beitritt eines Clients einmal durch den Directory-Cache verzögert (nas §1.2, 10 s) — bei 140 Dateien ist der Kaltstart entsprechend zäh, und die Zusage „einmalig bis ~10 s" (§3.8) gilt dann je Entdeckungsrunde, nicht einmal je Einsatz.

**Rettung.**
1. **Stillgelegte Segmente nicht mehr pollen.** Das setzt den Abschlussmarker aus der Rettung zu W1 voraus (`SegmentAbgeschlossen{anzahl, letzteId, hash}` als letzte Zeile): eine Datei mit Abschlussmarker wird einmal vollständig gelesen und danach nie wieder geöffnet. Damit fällt die Poll-Menge auf „je Client höchstens ein aktives Segment" — bei 5 Clients also 5 Dateien statt 140.
2. **Segmentwechsel nicht bedingungslos bei jedem Start.** Der Doppelstart-Schutz ist auch ohne ihn erreichbar: beim Start `create_new` auf das *nächste* Segment nur dann, wenn das eigene letzte Segment keinen Abschlussmarker trägt **und** der Share-Stand nicht zum lokalen Offset passt (das ist ohnehin die Fremdschreiber-Prüfung aus B10). Ein sauber beendeter Client kann sein Segment weiterschreiben.
3. **Verdichtung beim Öffnen:** ältere Segmente in die Snapshot-Basis falten (§3.5 Punkt 9) und nur die seit dem Snapshot geschriebenen pollen.

---

#### W12 (mittel) — Archivierung: `archiv.marker` macht eine Fold-Entscheidung von einem Dateisystemzustand abhängig, und der Ordnerverschub kollidiert mit offenen Handles

**Angegriffene Festlegungen.** VB §3.3 Dateilayout: „`archiv.marker` # create_new; **danach nimmt der Fold keine neuen Ereignisse mehr an**." VB §3.10: „`archiv.marker` (create_new) friert den Einsatz ein; … **Erst nach verifiziertem Hash-Vergleich wird der Ordner verschoben.**" Zugleich enthält der Ereigniskatalog (§3.4) den Typ `EinsatzArchiviert`.

**Mangel 1 — zwei Wahrheiten, eine davon zeitabhängig.** Ob ein Ereignis angenommen wird, hängt nach dieser Formulierung davon ab, ob der lesende Client die Datei `archiv.marker` **sieht**. Die Sichtbarkeit einer neu angelegten Datei unterliegt dem `FileNotFoundCacheLifetime` (5 s) und dem `DirectoryCacheLifetime` (10 s) des Windows-Clients (nas §1.2, wörtlich: „Applications which require a high level of file information consistency across clients which may utilize **creation** … of a file as a notification mechanism to other nodes may encounter delays or consistency issues"). Damit gilt: Client A hat den Marker gesehen und verwirft Ereignisse ab jetzt; Client B hat ihn noch nicht gesehen, schreibt weiter und faltet seine eigenen Ereignisse. Beide sind in sich konsistent, ihre Projektionen divergieren. Der Fehler ist derselbe wie in W5, nur mit einem Dateisystem- statt einem Uhrenzustand als Quelle: **eine Fold-Entscheidung darf nur aus dem Ereignisstrom folgen, nie aus einem Dateisystemzustand mit Zeitbezug.** Der Katalog enthält mit `EinsatzArchiviert` bereits das richtige Mittel; der Vorschlag sagt nicht, welches der beiden gilt.

**Mangel 2 — der Ordnerverschub gegen offene Handles.** „Erst nach verifiziertem Hash-Vergleich wird der Ordner verschoben" — verschoben wird ein Verzeichnis, in dem per Konstruktion jeder andere Client mindestens eine Datei offen hält: seine eigene Segmentdatei wird beim Öffnen des Einsatzes angelegt (Präzisierung 2) und zum Anhängen offen gehalten. nas §1.4: „Ein Rename scheitert unter Windows mit EPERM/EBUSY, wenn ein anderer Client die Zieldatei ohne `FILE_SHARE_DELETE` offen hält." Der Vorschlag beschreibt keinen Ablauf für diesen Fall: kein „alle Clients müssen den Einsatz geschlossen haben", keine Presence-Prüfung, keine Fehlerbehandlung, kein Teil-Erfolg-Zustand (Server, die einen Ordnerverschub dateiweise ausführen, hinterlassen bei EBUSY einen halb verschobenen Ordner — der Rest-Ordner enthält dann genau die Segmente der noch laufenden Clients).

**Rettung.**
1. Archivierung ist **ein Ereignis** (`EinsatzArchiviert`, HLC). Fold-Regel: Ereignisse mit HLC größer als die Archivierungs-HLC werden nicht verworfen, sondern angewandt und als „nach Archivierung eingegangen" markiert (Konflikthinweis in der Projektion, wie §3.5 Punkt 3 es für andere Fälle schon vorsieht). Deterministisch, weil vollständig aus dem Log ableitbar. `archiv.marker` darf bleiben — aber nur als Hinweis für das UI und als Sperre für das *Öffnen*, nie als Fold-Bedingung.
2. Verschieben nur, wenn die Presence-Dateien zeigen, dass kein anderer Client den Einsatz offen hat, plus ausdrückliche Fehlerbehandlung („MELDEKOPF1 hat den Einsatz noch offen — Archivierung nicht möglich") und Wiederholbarkeit. Die ZIP-Erzeugung (Lesen + Hashes) ist davon unabhängig und darf immer laufen.
3. In die Störfallmatrix (§7.6) aufnehmen: „Archivierung, während ein zweiter Client den Einsatz offen hat".

---

#### W13 (mittel) — Snapshot-Auswahl bei nebenläufigen Snapshots ist nicht definiert, und „stichprobenartig validieren" kann einen falschen Snapshot nicht widerlegen

**Angegriffene Festlegungen.** VB §3.5 Punkt 9: „Projektion ist verwerfbar. Snapshots tragen Versionsvektor + blake3-Hash; ein Leser, der einen Snapshot lädt, prüft **stichprobenartig** gegen Neufaltung (nas §10 Restrisiko 5)." VB §3.3: `snapshots\20260906T141233Z-c-9b12ef.json`; nas §11: „Kollisionen zweier Clients sind harmlos, beide Snapshots sind gültig, **der neuere Version-Vector gewinnt**." Risiko B12: „Snapshots ab 5.000 Ereignissen mit Versionsvektor + blake3; Property-Eigenschaft 3 prüft Snapshot-Äquivalenz maschinell."

**Mangel 1 — „der neuere Versionsvektor" ist bei Nebenläufigkeit kein definierter Begriff.** Ein Versionsvektor ist eine **partielle** Ordnung. Zwei Clients, die gleichzeitig einen Snapshot schreiben, haben in aller Regel unvergleichbare Vektoren: A hat Ereignisse von C gesehen, die B fehlen, und umgekehrt. Weder „größer" noch „neuer" ist dann definiert. Der Vorschlag übernimmt die Formulierung aus nas §11 unverändert und liefert keine Auswahlregel. Praktisch heißt das: welchen Snapshot ein Client lädt, hängt von der Sortierung des Verzeichnislistings oder vom Zeitstempel im Dateinamen ab — also von der Wanduhr des Erzeugers, die der Entwurf sonst überall ausdrücklich nicht zur Ordnung heranzieht (§3.5 Punkt 1).

**Mangel 2 — die Validierung ist entweder wertlos oder ersetzt den Snapshot.** „Stichprobenartig gegen Neufaltung prüfen" ist keine Prüfung: entweder faltet der Client die Ereignisse bis zum Snapshotpunkt tatsächlich neu — dann hat er die Ersparnis, die der Snapshot bringen sollte, gerade aufgebraucht — oder er prüft eine Teilmenge und kann einen falschen Snapshot nicht widerlegen (ein Snapshot, der in einem einzigen Feld falsch ist, wird von einer Stichprobe mit hoher Wahrscheinlichkeit nicht getroffen). Der `blake3`-Hash im Snapshot beweist nur, dass die Datei unverändert ist — nicht, dass ihr Inhalt der korrekten Faltung entspricht. Und es fehlt die Regel, was bei Abweichung geschieht.

**Mangel 3 — abgeleitete Konflikthinweise im Snapshot brechen die Äquivalenz.** §3.5 Punkt 3 hält fest: Konflikthinweise stehen „in der Projektion (nicht im Log — Hinweise sind ableitbar, keine Ereignisse)". Ein Snapshot ist eine serialisierte Projektion und enthält damit Hinweise, deren Ableitung Ereignisse *vor* dem Snapshotpunkt voraussetzt. `fold_from(snapshot_at(k), events[k..])` kann sie weder reproduzieren noch zurücknehmen. Das ist ein zweiter, von W4 unabhängiger Weg, auf dem Property-Eigenschaft 3 scheitert.

**Rettung.**
1. Auswahlregel ausschreiben: bevorzugt der Snapshot, dessen Versionsvektor von den lokal bekannten Segment-Offsets **gedeckt** ist und der die meisten Ereignisse enthält; bei Unvergleichbarkeit einen beliebigen deterministisch wählbaren (z. B. größter Ereignis-Gesamtzähler, Gleichstand nach `clientId`) und den Rest aus allen Segmenten nachfalten. Entscheidend ist, dass der **Endzustand** von der Snapshotwahl unabhängig ist — das ist genau Property-Eigenschaft 3 und muss über *alle* verfügbaren Snapshots geprüft werden, nicht über einen konstruierten.
2. Prüfung binär statt stichprobenartig: der Snapshot trägt den blake3 **über die kanonisch serialisierte Projektion**; ein Client, der ihn lädt, faltet nichts nach, verwendet ihn aber nur, wenn ein zweiter, unabhängig erzeugter Snapshot mit demselben Versionsvektor denselben Hash trägt — oder er faltet einmal beim Erzeugen vollständig gegen und verwirft bei Abweichung mit sichtbarer Meldung. Ein „vielleicht richtiger" Snapshot ist schlechter als keiner.
3. Abgeleitete Hinweise nicht in den Snapshot serialisieren, sondern nach dem Laden neu ableiten — oder die Hinweise doch als Ereignisse führen. Der Vorschlag muss sich entscheiden.

---

#### W14 (mittel) — Lokales Log je Benutzerprofil: der Schichtwechsel am selben Rechner erzeugt einen neuen Client und macht den Spiegelrückstand des Vorgängers unerreichbar

**Angegriffene Festlegungen.** VB §3.9: „geschrieben wird immer zuerst lokal (`%APPDATA%\S1-Control\einsaetze\<ordner>\events\…`) … `upload-state.json` merkt den letzten übertragenen Offset." Betriebsparameter: „**keine Admin-Rechte** auf den FüSt-Rechnern → Installer müssen per-User installieren".

**Szenario.**
1. FüSt-Laptop, Benutzer `s1-tag` arbeitet die Tagschicht. Sein lokales Log liegt unter `C:\Users\s1-tag\AppData\Roaming\S1-Control\…`, `clientId` und `upload-state.json` ebenfalls.
2. Schichtwechsel 20:00. Der Rechner bleibt, der Benutzer wechselt auf `s1-nacht` (oder der Rechner wird abgemeldet und ein anderer meldet sich an — bei per-User-Installation ohne Admin-Rechte hat jeder Benutzer seine eigene Installation und damit seinen eigenen `%APPDATA%`-Zweig).
3. `s1-nacht` startet die App: neue `clientId`, neues Segment, eigenes lokales Log. Fachlich ist das sogar erwünscht (der Akteur im ETB stimmt).
4. War der Spiegelstand von `s1-tag` beim Abmelden im Rückstand (W1), liegen dessen letzte Ereignisse nur noch in einem Profil, das die laufende App weder kennt noch lesen darf. Der Nachhol-Mechanismus aus der Rettung zu W1 („beim Start über alle **eigenen** Segmente iterieren") greift nicht, weil es nicht mehr dieselbe Identität ist.
5. Zusätzlich verdoppelt jeder Benutzerwechsel die Segmentzahl (→ W11) und die Presence-Einträge.

**Beleg.** Die per-User-Installation ist keine Entwurfsentscheidung, sondern eine Folge der Betriebsparameter („keine Admin-Rechte"). Der Vorschlag kennt diese Randbedingung noch nicht: §2.5 nennt „MSI/NSIS-Silent-Schalter, damit die FüSt-Rechner per USB-Stick in einem Rutsch installiert werden können" — ein MSI-Systeminstaller ist ohne Admin-Rechte nicht ausführbar. §3.9 setzt stillschweigend „ein Rechner = ein Client = ein lokales Log" voraus.

**Rettung.**
1. Das lokale Log an den **Einsatz**, nicht an den Benutzer binden, wenn ein gemeinsamer Ort verfügbar ist (z. B. `%PROGRAMDATA%` — ohne Admin-Rechte nur, wenn der Ordner einmal beschreibbar angelegt wurde; sonst ein vom Benutzer gewählter lokaler Pfad, der in `settings.json` steht). [Annahme: `%PROGRAMDATA%`-Unterordner sind nach Erstanlage für Standardbenutzer beschreibbar — vor M0 zu prüfen.]
2. Alternativ und einfacher: Beim Start prüft der Client, ob im gemeinsamen lokalen Datenverzeichnis Segmente **anderer** `clientId`s mit unvollständigem Spiegelstand liegen, und schiebt sie nach. Das ist dieselbe Schleife wie in der Rettung zu W1, nur über alle lokal gefundenen Segmente statt nur über die eigenen. Ein fremdes Segment darf dabei nur *fortgeschrieben* werden, wenn es auf dem Share noch ein echtes Präfix ist — sonst neues Segment (Rettung zu W2).
3. Ausdrücklich festlegen: „ein Windows-Benutzerkonto = ein Client". Dann ist der Schichtwechsel im ETB sauber, und der Nachholpfad ist der aus Punkt 2. Diese Festlegung fehlt heute.

---

#### W15 (mittel) — Update über den Share: `mindestClientVersion` kann eine laufende Lage aussperren, und der Installationsmodus ist nicht auf „ohne Admin-Rechte" festgelegt

**Angegriffene Festlegungen.** VB §2.6: „Eigener Rust-Prüfschritt: `\\NAS\S1-Control\update\latest.json` + Artefakt …, Signatur mit `minisign-verify` … dann **Installer per `opener` starten und App beenden**." VB §2.5: „Zusätzlich ein **MSI/NSIS-Silent-Schalter** …". VB §3.5 Punkt 8: „Zusätzlich `manifest.json.mindestClientVersion` als **harte Sperre**, wenn ein Formatbruch unvermeidbar ist."

**Mangel 1 — die harte Sperre trifft mitten in den Einsatz.** `manifest.json` liegt auf der Wurzel des Shares und gilt für alle Einsätze. Wird sie erhöht (durch wen? → W17), sperrt sie **sofort** jeden Client aus, der noch nicht aktualisiert hat — auch einen, der gerade in einer laufenden Lage arbeitet und dessen lokale Ereignisse noch nicht gespiegelt sind. Die Kombination „ein Client aktualisiert sich über den Share, der neue Client hebt die Mindestversion, die übrigen vier fliegen raus" ist mit den beschriebenen Mechanismen erreichbar und im Vorschlag nirgends ausgeschlossen. Für ein Werkzeug, dessen einziger Zweck die Lageführung während eines Einsatzes ist, ist das der teuerste denkbare Fehlerfall.

**Mangel 2 — der Installationsmodus ist offen und entscheidet über die Machbarkeit.** Ohne Admin-Rechte (Betriebsparameter) ist ein per-Machine-MSI nicht installierbar und ein per-Machine-NSIS ebenfalls nicht. Nur eine per-User-Installation (NSIS `installMode: currentUser`) funktioniert; das muss **einmal** festgelegt und danach beibehalten werden, weil ein Update mit einem per-Machine-Installer über eine per-User-Installation nicht sauber greift. [Annahme: Tauris NSIS-Bundle bietet `installMode` mit `currentUser`; vor M0(b) zu verifizieren.] Der Vorschlag lässt beides offen und nennt MSI zuerst.

**Mangel 3 — Installer vom Share starten.** „Installer per `opener` starten" — liegt das Artefakt auf dem Share, wird eine ausführbare Datei über SMB gestartet; das ist der Fall, den Windows SmartScreen/Defender und viele Endpoint-Konfigurationen gesondert behandeln, und der Start blockiert, solange das Netz hängt (nas §1.8, `SessTimeout` 60 s). Der Vorschlag sagt nicht, dass das Artefakt vor dem Start lokal kopiert und **nach** der Signaturprüfung von der lokalen Kopie ausgeführt wird — sonst ist die Prüfung ohnehin ein Time-of-check/Time-of-use-Fenster.

**Rettung.**
1. `mindestClientVersion` wirkt **je Einsatz**, nicht global, und wird nie automatisch durch ein Update erhöht, sondern nur durch eine ausdrückliche Handlung („Einsatz auf Format 2 heben"); vorher zeigt jeder Client die Versionen aller anderen aus der Presence-Datei an. Alte Clients werden gewarnt, nicht ausgesperrt — die Regel „unbekannte Typen durchreichen" (§3.5 Punkt 8) trägt genau dafür.
2. Update während eines geöffneten Einsatzes nur nach ausdrücklicher Bestätigung, und erst nachdem der Spiegelstand vollständig ist (Verbindung zu W1: ein Update ist ein geplanter Prozessabbruch).
3. Installationsmodus als ADR festschreiben: NSIS per-User, Silent-Schalter dokumentiert, Update ohne UAC. In M0(b) einmal auf einem Rechner ohne Admin-Rechte durchspielen.
4. Artefakt vor Ausführung lokal kopieren, Hash/Signatur **der lokalen Kopie** prüfen, dann starten.

---

#### W16 (mittel) — Backup und HTML-Monitor sind die zwei Ausnahmen von „nur eigene Dateien, nur Append" — und beide sind ohne Schreiberwahl und mit Replace-Rename spezifiziert

**Angegriffene Festlegungen.** VB §3.10: „stündlich (und bei Einsatzende) kopiert **der Client, der die Rolle `FüSt` hat**, den Einsatzordner nach `\\NAS\S1-Control\backup\<ordner>\<zeitstempel>\`." VB §6.2 HTML-Monitor: „Ausgabe-Task im Rust-Prozess schreibt alle N Minuten `\\NAS\...\monitor\index.html` (**tmp+rename**)."

**Mangel 1 — die Schreiberwahl hängt an einem Rollenmodell, das es nicht gibt.** Rollen sind in v1 nirgends durchgesetzt (Risiko B14, main §11) und ihre fachliche Bedeutung ist eine offene Frage an Johannes (§10.2 Punkt 1). Solange sie nicht definiert und durchgesetzt sind, kann es passieren, dass **zwei** Clients sich für „FüSt" halten. Dann schreiben zwei Clients dieselbe Backup-Zielstruktur und dieselbe `monitor/index.html` — zwei Schreiber auf einer Datei, also genau die Konstellation, die das gesamte Speichermodell vermeidet (nas §1.11 Rust `append`: „does not necessarily guarantee that data appended by different processes or threads does not interleave"; nas §1.4 zum Rename-Konflikt). Es gibt keine Wahl-, Übernahme- oder Kollisionsregel.

**Mangel 2 — Replace-Rename kehrt durch die Hintertür zurück.** `tmp+rename` auf eine Datei, die per Konstruktion alle 60 s von einem Browser gelesen wird, ist der Pfad, den nas §1.4 als realistischen Fehlerfall benennt: „Ein Rename scheitert unter Windows mit EPERM/EBUSY, wenn ein anderer Client die Zieldatei ohne `FILE_SHARE_DELETE` offen hält." Dazu kommt nas §1.9: ohne `fsync` auf die `.tmp` kann der Rename eine leere oder kurze Datei sichtbar machen. Der Vorschlag begründet das Speichermodell unter anderem damit, dass „keine der belegten SMB-Schwächen den Schreibpfad berührt" (§3.2/nas §10 Punkt 1) — für diese beiden Ausgabepfade gilt das nicht, und der Vorschlag sagt es nicht.

**Mangel 3 — Backup als Ordnerkopie während laufender Appends.** Kopiert wird ein Ordner, in dem gerade angehängt wird. Eine Segmentdatei wird dann mitten in einer Zeile kopiert; das ist erträglich (die Leserregel verwirft die unvollständige letzte Zeile), muss aber gesagt sein — und ein Backup, das eine halbe Zeile enthält, darf beim Zurückspielen nicht als „vollständiges Segment" gelten. Ohne den Abschlussmarker aus der Rettung zu W1 ist beides nicht unterscheidbar.

**Rettung.**
1. Schreiber deterministisch bestimmen, ohne Rollenmodell: derjenige Client mit der lexikografisch kleinsten `clientId` unter den Presence-Dateien, die jünger als 30 s sind. Fällt er aus, übernimmt der nächste automatisch — und weil beide Aufgaben idempotent sind (Backup mit Zeitstempel im Zielnamen, Monitor-HTML mit „Stand:"-Zeile), ist ein kurzzeitiger Doppelbetrieb harmlos, sobald die Dateinamen den Schreiber enthalten.
2. Monitor-HTML **je Schreiber** benennen (`monitor/index-<clientId>.html`) plus eine einmalig angelegte, nie ersetzte `index.html`, die per Meta-Refresh/kleinem Skript auf die aktuellste zeigt — dann verschwindet der Replace-Rename ganz. Wenn eine feste `index.html` unverzichtbar ist: `fsync` auf die `.tmp`, Rename mit Wiederholung und sichtbarer Fehlermeldung bei EBUSY.
3. Backup als Kopie *plus* Prüfschritt: nach dem Kopieren je Datei blake3 vergleichen und Segmente ohne Abschlussmarker als „laufend" kennzeichnen.

---

### 3.4 Gering

#### W17 (gering) — `manifest.json` ist als unveränderliche `create_new`-Datei spezifiziert, trägt aber einen Wert, der steigen können muss

**Angegriffene Festlegungen.** VB §3.3: „`manifest.json` # `{formatVersion, mindestClientVersion}`; **create_new durch den ersten Client**". VB §3.5 Punkt 8: „`manifest.json.mindestClientVersion` als **harte Sperre**, wenn ein Formatbruch unvermeidbar ist."

**Der Widerspruch.** Eine Datei, die nur per `create_new` entsteht und danach unverändert bleibt, kann keine steigende Mindestversion tragen — die Sperre wäre auf den Stand des allerersten Clients eingefroren. Kann sie dagegen fortgeschrieben werden, ist sie eine geteilte Read-Modify-Write-Datei auf dem Share und damit genau die Konstruktion, die Präzisierung 3 (§3.3) mit guter Begründung abgeschafft hat (`_system.json`, main §10 (d), R-SYS-1..3). Der Vorschlag entscheidet das nicht.

**Rettung.** Format- und Mindestversion je Einsatz als Ereignis führen (`FormatMindestversionGesetzt`, HLC-geordnet, mit `akteur`) — dann ist die Sperre deterministisch aus dem Log ableitbar, hat einen Urheber im ETB und braucht keine gemeinsam beschriebene Datei. `manifest.json` bleibt reine Erstinformation für einen Client, der den Share zum ersten Mal sieht. Zusammen mit der Rettung zu W15 (kein automatisches Anheben) ist das Thema erledigt.

---

#### W18 (gering) — Das Zeilenformat ist unterspezifiziert: `len` hat keine definierte Semantik, und es fehlt die Regel zur Wiederaufsetzung nach einer Falschzeile

**Angegriffene Festlegung.** VB §3.4: „Zeilenformat: `<len>\t<crc32>\t<json>\n`".

**Die Lücke.** Nicht gesagt ist: (a) ob `len` die Bytes des JSON, der ganzen Zeile oder der Nutzlast ohne Zeilenende zählt; (b) worüber der CRC gebildet wird; (c) dass das serialisierte JSON garantiert kein rohes `\n` enthält (bei `serde_json::to_string` ist das gegeben, bei einer „pretty"-Variante nicht — eine Ein-Zeichen-Änderung in der Konfiguration zerstört das Format still); (d) in welcher Kodierung `len` steht (dezimal? hex? fester Breite?).

**Warum das mehr als Formalismus ist.** `len` ist das einzige Mittel, mit dem ein Leser nach einer beschädigten Zeile **wieder aufsetzen** kann, ohne die Datei zu verwerfen: er springt vom Zeilenanfang um `len` Bytes weiter und prüft, ob dort ein `\n` steht. Genau das ist der fehlende Baustein in der Rettung zu W2 (Bruchstück mitten in der Datei). Ohne definierte Semantik ist `len` — wie `prev` — Dekoration.

**Rettung.** Ein Satz in §3.4: „`len` ist die dezimale Byte-Länge des JSON-Teils ohne Trenner und Zeilenende; `crc32` wird über genau diese Bytes gebildet; das JSON ist einzeilig serialisiert." Plus die Leserregel: „Ist die Zeile fehlerhaft, wird ab Zeilenanfang + `len` + 1 erneut aufgesetzt; gelingt das nicht, gilt der Rest der Datei als beschädigt und wird gemeldet."

---

#### W19 (gering) — Reichweite und Breite von `prev` sind nicht festgelegt

**Angegriffene Festlegung.** VB §3.4 Beispielzeile: `"prev":"<blake3-8>"`. Kontext: nas §8.4 führt die Hash-Kette unter „Revisionssicherheit erhöhen: … nachträgliche Änderung wird erkennbar".

**Die Lücke.** „blake3-8" ist mehrdeutig (8 Hex-Zeichen = 32 Bit, oder 8 Byte = 64 Bit), und es ist nicht gesagt, worüber der Hash gebildet wird (Vorgängerzeile roh? deren JSON? deren `id`?) und ob die Kette an der Segmentgrenze neu beginnt oder über Segmente desselben Clients fortläuft. Bei 32 Bit ist die Kette in einem Einsatz mit der in M3 als Zielgröße genannten Menge von 20.000 Ereignissen bereits kollisionsbehaftet [Geburtstagsschranke ≈ 65.000]; als Nachweis gegen absichtliche Änderung taugt ein Präfix ohnehin nicht, weil sich ein passendes Präfix trivial erzeugen lässt.

**Rettung.** Festlegen: `prev` = die ersten 16 Byte des blake3 über die vollständige vorhergehende Zeile (inklusive `len`/`crc32`), Kette beginnt je Segment neu und wird über das Abschlussereignis (Rettung zu W1: `SegmentAbgeschlossen{…, hash}`) an das Folgesegment gebunden. Und: die Kette wird beim Lesen tatsächlich geprüft (Rettung zu W2 Punkt 3) — sonst ist die Breite egal, weil niemand hinsieht.

---

#### W20 (gering) — Zwei unspezifizierte Kleinigkeiten mit Belegbezug: UDP-Hinweis vor Sichtbarkeit, und der Freigabemodus des dauerhaft offenen Append-Handles

**(a) UDP kann schneller sein als der Cache.** VB §2.3/§3.8: der Netz-Task sendet „ich habe angehängt" als Beschleuniger, das UDP-Paket löst einen sofortigen Lesevorgang aus. nas §1.2 hält dazu wörtlich fest: „**Ein UDP-Signal ‚bitte neu lesen' kann daher *vor* der Sichtbarkeit der Änderung eintreffen.**" Nicht gesagt ist, was der Leser tut, wenn der ausgelöste Read nichts liefert: ein naives „sofort nochmal" erzeugt eine heiße Schleife über SMB, solange der `FileInfoCache` (10 s) noch den alten Stand hält — und zwar bei jedem angehängten Ereignis, also unter Last am schlimmsten. **Rettung:** UDP löst höchstens einen zusätzlichen Lesevorgang je Datei und Poll-Periode aus (Entprellung), nie eine Wiederholschleife; ein leerer Read ist kein Fehler.

**(b) Freigabemodus.** Jeder Client hält seine Segmentdatei zum Anhängen offen (Präzisierung 2 legt sie beim Öffnen an, der Schreib-Task hängt an). Ob andere Clients sie lesen können, hängt unter Windows vom Sharing-Modus des `CreateFile`-Aufrufs ab. Rusts `std::fs::OpenOptions` setzt per Default `FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE`, also ist der Normalfall in Ordnung — aber jede Abweichung (eine Hilfs-Crate, ein Advisory-Lock über `fs4`, ein Windows-spezifischer `share_mode`-Aufruf) macht die eigenen Ereignisse für alle anderen unlesbar, und zwar ohne Fehler auf der Schreiberseite. Das gehört als ausdrückliche Zusage in den Ereigniskatalog und als Testfall in `s1 sim` („fremdes aktives Segment ist lesbar, während der Eigentümer anhängt"). Dasselbe gilt für `FILE_SHARE_DELETE`, ohne das der Archiv-Verschub aus W12 zusätzlich scheitert.

---

## 4. Entlastung und Belastung durch die Betriebsparameter

Vorschlag B kannte `design/betriebsparameter-johannes.md` noch nicht — er führt die dort beantworteten Punkte selbst als offene Fragen (§10.1 Nummern 1–6) und als Risiko B3/B13. Die Antworten verschieben mehrere Bewertungen, in beide Richtungen. Diese Bewegung ist unabhängig von den Findings in §3 zu lesen: keiner der zwanzig Punkte wird durch die Betriebsparameter aufgehoben, mehrere werden wahrscheinlicher oder unwahrscheinlicher.

### 4.1 Entlastung

| Parameter | Entlastet | Wie stark |
|---|---|---|
| **Windows 11** | §2.5 `fixedRuntime` (+180 MB) und Risiko **B7** („`tauri-action` nimmt den Runtime nicht sauber mit"). WebView2-Evergreen ist auf Windows 11 vorinstalliert; der Installer muss die Laufzeit nicht mitbringen. | B7 fällt von „mittel × hoch" auf „niedrig × mittel" und verliert seine Sperrwirkung für M0(b). Die Begründung des Vorschlags für `fixedRuntime` (reproduzierbarer Renderer im Einsatz) bleibt sachlich richtig, ist aber jetzt eine Kür, kein Muss. |
| **Keine Altdaten** | §3.11 (v1-`.s1control`-Migration) entfällt vollständig, §3.12 schrumpft auf die Kopiervorlagen/AküLi. Damit entfallen auch die Folgeprobleme: der Pseudo-Client `c-migration-<hash>`, die synthetisierten HLCs aus alten Wanduhr-Zeitstempeln (die in der HLC-Ordnung neben echten Ereignissen stehen würden) und die Parallelbetriebs-Warnung. | Risiko **B13** ist eingetreten und damit erledigt; M8 verliert seinen Migrationsteil. Technisch ist das eine echte Entlastung, weil ein Ereignisstrom ohne synthetische Vergangenheit deutlich einfacher zu begründen ist. |
| **NTP vorhanden** | Der Auslöser für W5 (HLC-Korrektur bei „absurder Zukunftszeit", Delta 10 min) wird selten; die Driftwarnung (§3.7, Schwelle 120 s) schlägt kaum an. | W5 bleibt **inhaltlich falsch** und muss korrigiert werden — aber die Eintrittswahrscheinlichkeit sinkt deutlich. Die Einstufung „schwer" bleibt, weil ein selten auslösender Regelfehler schwerer zu finden ist, nicht leichter. |
| **1–5 Rechner** | Die Poll-Grundlast im Normalbetrieb (§2 Punkt 13 dieses Berichts) und die Presence-Liste. | Bestätigt, was der Vorschlag annimmt. Entlastet **nicht** W11: die Segmentzahl wächst mit den Neustarts, nicht mit der Clientzahl. |
| **Synology** | `create_new`-Atomarität: Samba entscheidet SMB2-CREATE(FILE_CREATE) serverseitig (nas §1.4), Synology-DSM hat dokumentierte Schalter für Oplocks, SMB2-Leases und Durable Handles (nas §1.8). Der Rückfallpfad aus B3 („Segmentname mit Zufallssuffix") wird wahrscheinlich nicht gebraucht. | Entlastet den in §2 Punkt 8 bereits als korrekt eingestuften Mechanismus zusätzlich. |
| **SQLite scheiterte an Langsamkeit, nicht an Korruption** | Bestätigt die Grundentscheidung gegen Option A und gegen jedes lock-basierte Modell — und damit indirekt die Ablehnung von bmecat R9. | Die Richtungsentscheidung (§3.2 des Vorschlags) steht nach den Betriebsparametern besser da als vorher. |

### 4.2 Belastung

| Parameter | Belastet | Folge |
|---|---|---|
| **Keine Admin-Rechte** | §2.5 („MSI/NSIS-Silent-Schalter") und §2.6 (Update-Weg). Ein per-Machine-MSI ist ohne Admin-Rechte nicht installierbar; ein Update, das einen per-Machine-Installer über eine per-User-Installation legt, greift nicht. | → **W15**. Der Installationsmodus wird von einer Nebensache zu einer Festlegung, die einmal richtig getroffen und danach nie geändert werden darf. In M0(b) auf einem Rechner **ohne** Admin-Rechte zu prüfen, nicht auf dem Entwicklerrechner. |
| **Keine Admin-Rechte (zweite Folge)** | §3.9 (lokales Log unter `%APPDATA%`). Per-User-Installation heißt: je Windows-Benutzer eine Installation, eine `clientId`, ein lokales Log. | → **W14**. Der Schichtwechsel am selben Rechner wird zum Datenpfad-Problem, nicht nur zu einer ETB-Frage. |
| **macOS/Linux berücksichtigen** | §7.3/§8.1: `s1 sim` und M0(a) sind als Ein-Maschinen-Lauf beschrieben. Mit drei Betriebssystemen sind drei verschiedene Cache-Schichten im Spiel (Windows-Redirector nas §1.2, macOS `nsmb.conf`/`dir_cache_max_cnt` nas §1.7, Linux `cache=`/`actimeo=` nas §1.6). | → **W8**. M0(a) muss mindestens Windows **und** macOS gegen dieselbe Synology fahren, sonst misst es eine Cache-Schicht von dreien. |
| **Synology = Samba** | nas §1.11 zitiert den Samba3-HOWTO wörtlich: bei Oplock-Pufferung und abreißender TCP-Verbindung „the work from the prior session is lost. When the file server recovers, an oplock break is not sent to the client". | Das ist ein **Primärquellenbeleg für die Prämisse von W2**: ein abgerissener Schreibvorgang hinterlässt einen undefinierten Zustand auf dem Server, und der Client erfährt es nicht. W2 wird durch die Betriebsparameter wahrscheinlicher, nicht unwahrscheinlicher. |
| **1 bis 5 Rechner** | §7.3 (`s1 sim --clients 4`), §3.8 (Latenztabelle) und die durchgehende Rede von „2–4 Clients" (auch §3.6 stützt den Verzicht auf Record-Locks ausdrücklich auf „bei 2–4 Clients selten"). | Die Obergrenze ist 5, nicht 4. `s1 sim` und die Abnahme sind auf 5 auszulegen; die [Annahme] in §3.6 über die Kollisionshäufigkeit bleibt unbelegt und wird bei 5 gleichzeitigen Bedienern schwächer. |
| **NTP vorhanden (Kehrseite)** | §3.2 Punkt 3 begründet die Ablehnung des Lockfile-Modells unter anderem damit, die Stale-Lock-Übernahme sei „weder atomar noch uhrenunabhängig". Mit NTP verliert das Uhrenargument an Gewicht. | Die **Entscheidung** bleibt trotzdem richtig: sie trägt weiterhin auf der fehlenden Atomarität (nas §1.2/§1.4), auf der reproduzierten Lost-Update-Lücke (kritik §3.4) und darauf, dass die vorgeschlagene `writeSeq`-Prüfung ohne Re-Read keine Portierung wäre. Die Synthese sollte die Begründung aber um das schwächer gewordene Uhrenargument bereinigen, damit sie nicht angreifbar bleibt. |

### 4.3 Was die Betriebsparameter **nicht** ändern

Alle drei Blocker (W1–W3) und alle sieben schweren Findings (W4–W10) sind unabhängig von NAS-Typ, Uhrensynchronisation, Betriebssystem und Clientzahl: sie folgen aus der Spezifikation selbst — aus dem Verhältnis von lokalem Log und Share-Spiegel, aus der Definition der Ereignis-`id`, aus dem Verhältnis von inkrementeller zu sortierter Faltung und aus der Formulierung der vier Property-Eigenschaften. Ein perfektes NAS, perfekte Uhren und ein einziger Client würden keinen davon entschärfen — mit Ausnahme von W5, dessen Auslöser seltener wird.

---

## 5. Konsolidierte Auflagenliste (was M0 zusätzlich beweisen muss)

M0 ist der einzige Meilenstein mit einem benannten Abbruchkriterium („scheitert (a), fällt der ganze Vorschlag", VB §8.1). Genau deshalb entscheidet die Güte seines Instruments über die Belastbarkeit des gesamten Plans. Die folgende Liste ist die Ergänzung, ohne die M0 ein grünes Signal für 27 weitere Personenwochen erzeugt, ohne die Hauptrisiken je gesehen zu haben (W8). Sie ersetzt den nie geschriebenen §6 der `nachlese-speichermodell-widerspruch-aufloesen.md` (§1 dieses Berichts).

**A — Vor M1 in die Spezifikation (kein Experiment nötig, aber blockierend):**
1. Ereignis-`id`-Schema absturzsicher festlegen (`<clientId>:<segment>:<lfd>` oder Ableitung aus dem lokalen Log) — **W3**.
2. Nachholpfad über *alle* eigenen und lokal gefundenen Segmente plus Abschlussereignis `SegmentAbgeschlossen{anzahl, letzteId, hash}` — **W1**, Voraussetzung für **W11**, **W14**, **W16**.
3. Schreiberseitige Präfixprüfung vor jedem Wiederaufsetzen und leserseitige Kettenprüfung als harte Bedingung; `len`-Semantik und Resynchronisationsregel — **W2**, **W18**, **W19**.
4. Feld-Wasserzeichen (HLC je Feld) in der Projektion und eine Entscheidung, wie Nachzügler bei nicht-feldartigen Regeln behandelt werden (Teil-Refold je Entität oder Neufaltung ab Hochwasserstand) — **W10**.
5. `vorher` in jedem feldsetzenden Ereignis; Kompensation als normales Ereignis mit Vorher-Payload statt als Fold-Sonderpfad — **W9**, **W4**.
6. Zyklusregel für `AbschnittUmgehaengt` (ZDM §4.2) und Regeln für `EinheitZusammengefuehrt`, `FahrzeugUmgehaengt` — **W6**.
7. HLC nie beim Lesen korrigieren; `ExceedingDelta` wirkt nur auf die eigene nächste HLC — **W5**.
8. Archivierung als Ereignis statt als Dateizustand; Mindestversion als Ereignis je Einsatz — **W12**, **W17**, **W15**.
9. Schreiberwahl für Backup und HTML-Monitor ohne Rollenmodell (kleinste `clientId` unter frischen Presence-Dateien); Monitor-Ausgabe ohne Replace-Rename — **W16**.
10. Ausdrückliche Zusage zum Windows-Freigabemodus des offenen Segment-Handles — **W20 (b)**.

**B — Testapparat, bevor M0 als bestanden gilt:**
11. Property-Eigenschaft 1 ersetzen durch **Sichten statt Permutationen** (wachsende Teilmengen je Client, inkrementell gefaltet, am Ende gegen den Ein-Schuss-Fold verglichen) — **W7**, **W10**.
12. **Differentialtest gegen ein naives Orakel** (kopierender Zustand, keine Wasserzeichen, keine Snapshots) — **W7**.
13. Fachinvarianten aus ZDM §4.4 (P4 Summenerhaltung, P5 keine Waisen, P6 monotone Zustandsmaschine) plus „kein Zyklus" und „`id` eindeutig über alle Segmente" — **W6**, **W3**, **W7**.
14. Snapshot-Äquivalenz über **alle** vorhandenen Snapshots, mit Kompensation über die Snapshotgrenze im Generator — **W4**, **W13**.

**C — Was nur auf dem echten Share messbar ist (der eigentliche M0(a)):**
15. Mindestens **zwei physische Windows-11-Rechner plus ein macOS-Rechner** gegen die reale Synology; ein Prozess je Maschine, gemeinsamer Plan aus einer Plandatei auf dem Share — **W8**, Betriebsparameter „macOS/Linux berücksichtigen".
16. Fehlerinjektion statt sauberem Trennen: harter Prozessabbruch bei bestehendem Spiegelrückstand (**W1**); Kabel/WLAN weg **während** eines Share-Appends (**W2**); Absturz zwischen Ereignis und Zählerfortschreibung (**W3**); Rückkehr eines 40-min-Offline-Clients mit nebenläufig geänderten Feldern (**W9**, **W10**); NAS-Neustart; Uhr eines Clients um 3 h verstellt (**W5**).
17. Vergleich **nach jeder Ruhephase**, nicht nur am Ende — und zusätzlich je Client der Vergleich *lokales Log ⟷ Share-Segment* (findet W1 und W2 direkt und billiger als jeder Konvergenztest).
18. Skalierungsmessung der Poll-Last: Sichtbarkeitslatenz p50/p95/max bei **10, 50 und 200** Segmentdateien in `events/` — **W11**. Abbruchschwelle vorab festlegen, nicht hinterher.
19. Latenzzahlen getrennt ausweisen für „bekannte Datei, neue Bytes" und „neue Datei / neuer Client" — nur die zweite trägt die 10-s-Zusage aus §3.8.
20. Ordnerverschub (`archiv/`) ausführen, während ein zweiter Client den Einsatz offen hat — **W12**.
21. Synology-Einstellungen protokollieren, die das Ergebnis bestimmen: Opportunistic Locking, SMB2-Lease, Durable Handles, Transportverschlüsselung (nas §1.8) — sonst ist die Messung nicht reproduzierbar und nicht übertragbar.
22. Installation und Share-Update auf einem Rechner **ohne Admin-Rechte** durchspielen — **W15**, Betriebsparameter.

**D — Was M0 nicht mehr beweisen muss (Entlastung):**
23. `fixedRuntime`/`offlineInstaller` als Sperrpunkt entfällt (Windows 11) — bleibt als Absicherung wünschenswert, nicht als DoD.
24. Migration (v1 und Excel-Einsatzdaten) entfällt vollständig; nur die Kopiervorlagen bleiben.

---

## 6. Gesamturteil

**Verdict: hält mit Auflagen** — aber die Auflagen sind nicht optional, und die Formulierung verdient eine Präzisierung: **als Richtungsentscheidung hält der Vorschlag jedem Angriff stand; als Bauanleitung in der vorliegenden Fassung nicht.**

**Was hält.** Die tragende Entscheidung — Append-only-Ereignisprotokoll, genau ein Schreiber je Datei, kein Lock, kein Master, keine TTL, HLC-Ordnung, Polling statt Watcher, Offline als Normalpfad — ist die einzige der sechs untersuchten Optionen, bei der keine der belegten SMB-Schwächen den Schreibpfad berührt (nas §9 Bewertungsmatrix, §10). Ich habe versucht, sie zu widerlegen, und es geht nicht: der Multi-Writer-Append ist ausgeschlossen (nas §1.4, §1.11), die Stale-Lock-Übernahme ist ersatzlos gestrichen statt repariert, der Verzicht auf Watcher ist belegt, und die Betriebsparameter (Synology/Samba, SQLite scheiterte an Latenz) stützen die Entscheidung zusätzlich (§4.1). Auch die Tauri-Seite unter dieser Linse — Zweitmonitor, Fenstererzeugung im `setup()`-Hook, Drucken über den Systembrowser, SemVer-Zwang des Updaters — ist sauber recherchiert und enthält keinen Angriffspunkt (§2 Punkte 10–12).

**Was nicht hält.** Die **Ausführung** hat drei Defekte, die jeder für sich stillen Datenverlust oder stille Divergenz erzeugen (W1 verwaister Segment-Rest, W2 abgerissener Share-Append, W3 nicht absturzsichere Ereignis-`id`) und einen vierten, der die im Vorschlag zugesagte Konvergenz im **häufigsten Betriebsfall** aufhebt (W10, Nachzügler ohne Feld-Wasserzeichen). Alle vier haben dieselbe Signatur: der schreibende Client hat recht, alle anderen haben etwas anderes, niemand bemerkt es. Genau diese Fehlerklasse benennt der Vorschlag selbst als die schlimmste (§3.1, Risiko B1) und behauptet sie als strukturell ausgeschlossen (§3.9: „Konvergenz ist garantiert").

**Der eigentliche Befund ist aber nicht die Zahl der Defekte, sondern dass der Beweisapparat sie nicht sehen kann.** Property-Eigenschaft 1 ist eine Tautologie über die Sortierfunktion (W7), Eigenschaft 3 ist mit der eigenen Kompensationsregel unvereinbar und wird entweder rot oder nie ausgelöst (W4, W13), Eigenschaft 4 ist mit dem spezifizierten Regelwerk nicht erfüllbar (W6), und `s1 sim`/M0(a) als Vier-Prozesse-auf-einer-Maschine-Lauf blendet die Cache-, Lease- und Sperr-Effekte aus, deren Nachweis der ganze Meilenstein ist (W8). In der vorliegenden Fassung würde M0 mit hoher Wahrscheinlichkeit **grün** — und damit das einzige Abbruchkriterium des Vorschlags entwerten. Das ist der Grund, warum §5 dieses Berichts nicht als Verbesserungswunsch, sondern als Bedingung zu lesen ist.

**Warum trotzdem nicht „fällt".** Jedes der zwanzig Findings hat eine benannte, kleine Rettung, und die Mehrzahl davon steht bereits ausformuliert im Schwesterdokument `zieldatenmodell-feldabgleich.md` §4 — `vorher` in jedem Feldereignis (ZDM §4.1 Regel 3), Kompensation als normales Ereignis (ZDM §4.3 U1), Zyklusregel nach LWW (ZDM §4.2), die Fachinvarianten P4–P6 (ZDM §4.4). Vorschlag B hat an diesen Stellen eine semantisch stärkere, technisch schwächere Variante gewählt; die Korrektur ist eine Spezifikationsänderung von wenigen Zeilen je Punkt, keine Architekturänderung. Der Aufwand liegt nicht im Umschreiben, sondern im Testapparat (§5 Teil B) und im Messaufbau (§5 Teil C) — beides gehört ohnehin in M0/M1 und ist in den 2 + 3 PW für M0/M1 vermutlich nicht vollständig eingepreist [Annahme; die Aufwandslinse gehört nicht zu diesem Auftrag].

**Konsequenz für die Synthese.** Der Speicherentwurf ist übernehmbar, aber nur in der korrigierten Fassung. Er ist zugleich — wie der Vorschlag selbst in §10.4 einräumt — **stackneutral**: keiner der zwanzig Punkte hängt an Rust oder Tauri. W1–W20 treffen den Entwurf, nicht die Sprache; sie gelten für Vorschlag C in demselben Umfang, soweit dieser dasselbe Speichermodell übernimmt. Umgekehrt liefert diese Linse **kein** Argument für Tauri: die Tauri-spezifischen Prüfpunkte (Fenster, Monitor, Drucken, Updater) sind entweder gelöst oder als Spike geführt; die einzige Tauri-spezifische Belastung durch die Betriebsparameter (per-User-Installation ohne Admin-Rechte, W15) ist mit Electron identisch. Der Rust-Kern zahlt sich unter dieser Linse an genau einer Stelle aus — beim erschöpfenden `match` und den Property-Tests — und ausgerechnet diese Stelle ist im Vorschlag noch nicht belastbar ausgebaut (W7).

**Reihenfolge, falls Johannes diesem Vorschlag folgt:** erst §5 Teil A (Spezifikation, ~1–2 Tage Schreibarbeit, kein Code), dann §5 Teil B (Testapparat), dann M0(a) in der Fassung §5 Teil C. Erst danach ist die grüne Ampel etwas wert.

---

*Ende. §1–§6 vollständig; 20 Findings (3 Blocker, 7 schwer, 6 mittel, 4 gering).*
