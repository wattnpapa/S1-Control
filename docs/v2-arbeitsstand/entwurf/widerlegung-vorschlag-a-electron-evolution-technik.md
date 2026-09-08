# Widerlegung Vorschlag A (Electron-Evolution) — Linse TECHNISCHE KORREKTHEIT

Status: ABGESCHLOSSEN (Abschnitte 0–9 vollständig; Verdikt in §9.3)
Autor-Key: widerlegung-vorschlag-a-electron-evolution-technik
Hinweis: Abschnitte 0–4 (bis S6) stammen aus einem ersten, abgebrochenen Lauf; S7, S8 sowie die
Abschnitte 5–9 wurden im Wiederaufnahmelauf ergänzt, einschließlich der Auswertung von
`betriebsparameter-johannes.md` (§7), die dem ersten Lauf noch fehlte.

Zitierweise: `A §3.5` = vorschlag-a-electron-evolution.md; `ZDM §4.1` = zieldatenmodell-feldabgleich.md;
`nas §1.2` = analysis/nas-speicher-recherche.md; `kritik §3.4` = analysis/vollstaendigkeitskritik.md;
`betrieb` = design/betriebsparameter-johannes.md; `bmecat §9 R7` = analysis/bmecat-stack-muster.md.
Primärquellen werden über `nas §1.x` referenziert, weil dort die URLs und Wortlaute stehen.
Eigene Setzungen sind mit [Annahme] gekennzeichnet.

## Gliederung
0. Arbeitsstand und Lesestand
1. Prüfmaßstab und Vorgehen
2. Was der Vorschlag zum Speicher-/Sync-Modell normativ festlegt
3. Blocker
4. Schwere Befunde
5. Mittlere Befunde
6. Geringe Befunde
7. Entlastungen und Belastungen durch die realen Betriebsparameter
8. Angriffe, die NICHT durchgehen (geprüft und verworfen)
9. Auflagenliste und Verdikt

---

## 0. Arbeitsstand und Lesestand

Vollständig gelesen: `betriebsparameter-johannes.md`; `vollstaendigkeitskritik.md`;
`nas-speicher-recherche.md` §1 (Primärquellen, vollständig), §2–§12 (vollständig);
`vorschlag-a-electron-evolution.md` (817 Zeilen, vollständig);
`zieldatenmodell-feldabgleich.md` §4.1/§4.2 (Einsatz, Abschnitt, Einheit), §4.3 (Undo U1–U6),
§4.4 (Konfliktregeln, Prüfkriterien P1–P6), §5.1 (v1-Migration) sowie die Feldtabellen §2/§3
per gezielter Suche nach `HLC|Schnappschuss|Konflikt|abgeleitet|LWW|vorher`.

Nicht erneut geprüft (laut Auftrag gesicherte Fakten): SQLite-auf-Share, Lost-Update-Reproduktion,
Tauri-Tragfähigkeit, Excel-Umfang, EEB-Codec, Toolchain-Versionen.

---

## 1. Prüfmaßstab und Vorgehen

Maßstab ist `nas §1` (Primärquellen). Die für diese Prüfung tragenden Sätze:

| Kürzel | Aussage | Quelle |
|---|---|---|
| Q1 | Windows-SMB-Client: `FileInfoCacheLifetime` 10 s, `FileNotFoundCacheLifetime` 5 s, `DirectoryCacheLifetime` 10 s; MS warnt ausdrücklich vor Anwendungen, die Dateierzeugung als Benachrichtigungsmechanismus nutzen | `nas §1.2` |
| Q2 | Oplock/Lease: Client darf Schreibdaten **und** Byte-Range-Locks lokal puffern, bis ein Break kommt; Oplocks unter SMB2+ clientseitig nicht abschaltbar | `nas §1.2` |
| Q3 | `O_APPEND` mit mehreren Schreibern über Netz ist prinzipiell rennbehaftet; Rust-Std: „does not necessarily guarantee that data appended by different processes or threads does not interleave" | `nas §1.4`, `§1.11` |
| Q4 | Rename mit `ReplaceIfExists` scheitert unter Windows mit EPERM/EBUSY, wenn ein anderer Client die Zieldatei ohne `FILE_SHARE_DELETE` offen hält | `nas §1.4`, `§3` |
| Q5 | SMB2 FLUSH hat definierte Semantik (Client-Cache leeren + Server-Flush) und blockiert bis zum Abschluss | `nas §1.9` |
| Q6 | Request Expiration Timer `SessTimeout` = 60 s; Anwendungen ohne Retry sehen I/O-Fehler | `nas §1.8` |
| Q7 | Watcher über Netz unzuverlässig (Node `fs.watch`, Rust `notify`) → Polling ist die einzige portable Basis | `nas §1.5` |
| Q8 | HLC hält die logische Uhr „always close to the NTP clock"; `uhlc` liefert `ExceedingDeltaError`, wenn ein empfangener Zeitstempel die Uhr zu weit vorzieht | `nas §1.11` |
| Q9 | UDP-Broadcast fällt bei WLAN-Client-Isolation, Multi-Adapter und Firewall aus; Beschleuniger, nie Wahrheit | `nas §1.10`, `§8.1` |

Vorgehen: Jede Festlegung in `A §2.2`, `§2.5`, `§2.6`, `§3.1`–`§3.11`, `§6.2`, `§7.2`–`§7.5`
wurde gegen Q1–Q9, gegen `ZDM §4` (das dieselbe Sache normativ genauer beschreibt) und gegen
ein konkretes Ablaufszenario geprüft. Vor jedem Befund wurde geprüft, ob `A §9` (Risiken A1–A15)
oder `A §10` (offene Punkte) ihn bereits adressiert; wo das der Fall ist, steht das im Befund
und die Bewertung bezieht sich nur auf den nicht abgedeckten Rest.

---

## 2. Was der Vorschlag zum Speicher-/Sync-Modell normativ festlegt

Kurzrekonstruktion, damit die Angriffe adressierbar sind (Belege in Klammern):

1. Append-only-Ereignisdateien, ein Schreiber je Datei, `<len>\t<crc32>\t<json>\n`,
   `fsync` nach jedem Ereignis, Hash-Kette `vorher` je Zeile (`A §3.3`).
2. Segmente `<clientId>.<segment>.jsonl`, Rotation „ab 8 MB **oder bei jedem App-Start**" (`A §3.3`).
3. Lokal-zuerst: Ereignis erst nach `%APPDATA%`, dann Spiegelung auf den Share ab
   `eigenerUploadOffset` aus `uebertragung.json` (`A §3.3`, `§3.7`).
4. Poll alle 2 s: `readdir(ereignisse/)` + `open`/`read` ab gemerktem Offset; UDP als Beschleuniger
   (`A §3.6`).
5. Fold = reine Funktion, Sortierung `hlc` aufsteigend, Tie-Break `clientId`, dann Laufnummer;
   neun Regeln, Grundregel feldweises LWW (`A §3.5`).
6. Schnappschüsse `{versionsvektor, zustand, hashKette}`, Leser falten „nur Events > Version-Vector"
   (`A §3.3`, `nas §4`).
7. HLC-Text `physisch:logisch:clientId`, Delta-Grenze 5 min, bei Überschreitung „nur der logische
   Teil hochgezählt" plus UI-Warnung (`A §3.3`, `§3.8`).
8. Keine Locks, keine TTLs; Bearbeitungssperren durch weiche Präsenzanzeige ersetzt (`A §3.8`).
9. Archivierung: `archiviert.marker` (create-new) + Fold-Regel 7 „spätere fachliche Ereignisse
   werden verworfen"; danach ZIP und Ordner verschieben (`A §3.5 Regel 7`, `§3.11`).
10. Alle Share-I/O im Worker-Thread, Main ohne `*Sync`, Timeout je Operation (`A §1.4`, `§2.2`, `§9 A2`).

Auf dem Share liegen außerdem, geschrieben von Clients: `praesenz/<eigene>.json` (überschrieben),
`ausgaben/monitor.html` (zyklisch überschrieben „vom Leitclient"), `ausgaben/Druck_*.pdf`,
`programm/aktuell.json` + Installer, `anhaenge/<sha256>.*`, `archiv/*.zip` (`A §3.3`, `§2.6`, `§6.2`, `§3.11`).

---

## 3. Blocker

### B1 — Schnappschüsse sind mit nachträglich eintreffenden Ereignissen nicht komponierbar; der spezifizierte Schnappschussinhalt kann den Fold nicht fortsetzen

**Angegriffene Entscheidung:** `A §3.3` (Schnappschussinhalt `{versionsvektor, zustand, hashKette}`),
`A §3.5` (Fold sortiert nach `hlc`, Grundregel feldweises LWW), `nas §4`/`A §3.5` („Leser laden
neuesten Schnappschuss und falten nur Events > Version-Vector"), `A §7.2 Eigenschaft 3`
(„Schnappschuss-Äquivalenz: `falte(alle)` == `falte(rest, ab=schnappschuss(präfix))` für jeden
Schnittpunkt").

**Warum das nicht trägt.** Der Fold ordnet global nach `hlc`. Die Ankunftsreihenfolge auf einem
Client ist davon unabhängig — genau das ist der Sinn des Modells (`A §3.7`: „Kein Merge-Dialog …
weil die Fold-Regeln zeitunabhängig sind"). Daraus folgt zwingend, dass Ereignisse eintreffen, die
**in der HLC-Ordnung vor** dem Stand liegen, den ein bereits geschriebener Schnappschuss abdeckt.
Der Versionsvektor kennzeichnet nur, *welche* Ereignisse eingeflossen sind, nicht einen unteren
Schnitt der Ordnung. Für die Fortsetzung des Folds auf einem Schnappschuss braucht der Fold je Feld
den HLC des aktuellen Gewinners — sonst kann er nicht entscheiden, ob ein spät gelesenes, aber
älteres Ereignis das im Schnappschuss stehende Feld überschreiben darf oder nicht.
`A §3.3` legt als Inhalt aber ausschließlich `zustand` (die materialisierte Sicht, `A §3.5`:
Maps von Entitäten) fest — ohne Gewinner-HLC je Feld.

**Ablauf mit Schrittfolge (vier Schritte, keine Sonderbedingung):**
1. Meldekopf M (Ortseingang, ohne NAS-Zugang, `A §3.7` letzter Punkt) erfasst um 14:05 lokal
   `EinheitFelderGeaendert{e-3f8a, status: "Einsatz"}` mit `hlc = 14:05`.
2. FüSt-Client F setzt um 14:30 `EinheitFelderGeaendert{e-3f8a, status: "Ruhe"}` mit `hlc = 14:30`.
3. F erreicht die Schnappschuss-Bedingung (`nas §11`: ≥ N Ereignisse und 60 s Ruhe) und schreibt
   `schnappschuesse/…-F.json` mit `zustand.einheiten["e-3f8a"].status = "Ruhe"` und einem
   Versionsvektor, der M gar nicht enthält.
4. M kommt zurück, seine Datei erscheint auf dem Share. Client C startet neu, lädt den neuesten
   Schnappschuss und faltet „nur Events > Version-Vector" — also auch Ms Ereignis von 14:05.
   Regel 1 (feldweises LWW) hat auf dem Schnappschussstand keine Vergleichsgröße; die einzige
   spezifizierte Operation ist „Feld setzen". → C zeigt `status = "Einsatz"`.
   Client F, der nie einen Schnappschuss geladen hat und den Gesamtstrom faltet, zeigt `"Ruhe"`.

Ergebnis: **zwei Clients, gleiche Ereignismenge, unterschiedlicher Zustand.** Das ist exakt die
Fehlerklasse, zu deren Beseitigung der ganze Vorschlag existiert (`A §3.2 (f)`: „gleiche
Ereignismenge → gleicher Zustand, unabhängig von Reihenfolge, Latenz und Uhrzeit").

**Zwei weitere Ausprägungen desselben Defekts:**

- **Regel 6 (`basis`-Prüfung) wird nach einem Schnappschuss unentscheidbar.** `A §3.5 Regel 6`
  verlangt einen Konflikthinweis, „wenn `basis` nicht dem gefalteten Vorgänger entspricht".
  Der „gefaltete Vorgänger" ist der HLC des vorherigen Gewinner-Ereignisses — der im Schnappschuss
  nicht steht. Ein Client mit Schnappschuss erzeugt den Hinweis also nicht, ein Client ohne
  Schnappschuss erzeugt ihn. Damit sind auch die Konflikthinweise nicht deterministisch,
  obwohl `ZDM §4.4 P3` sie ausdrücklich zum Zustand rechnet („die sind Teil des Zustands,
  nicht der UI").
- **Schnappschuss-Vergiftung durch veraltete Clients.** `A §3.4` legt fest, dass unbekannte
  Ereignistypen „durchgereicht und im ETB als unbekannt angezeigt, nie verworfen" werden. Ein
  Client mit älterer App faltet sie folglich nicht. Schreibt genau dieser Client einen
  Schnappschuss (die Schnappschussregel `nas §11` knüpft an Ereigniszahl und Ruhe, nicht an die
  App-Version), enthält `zustand` die Wirkung dieser Ereignisse nicht — und jeder spätere Leser,
  der den Schnappschuss lädt, kann sie nicht mehr nachholen, weil sie innerhalb des
  Versionsvektors liegen. Die `ablage.json`-Mindestversion (`A §3.3`, `§9 A8`) hilft nicht, weil
  sie erst nach dem Erscheinen des neuen Typs erhöht wird und der alte Client bis dahin
  legitimer Teilnehmer ist.

**Warum die vorhandenen Gegenmaßnahmen nicht reichen.** `A §9 A9` nennt als Maßnahme „Leser
validieren Schnappschüsse **stichprobenartig** gegen Neu-Fold". Das ist eine Detektion mit
Zufallsrate, keine Korrektheitsgarantie; sie sagt weder, was bei einem Treffer geschieht, noch
verhindert sie, dass in der Zwischenzeit ein Ausdruck mit falschen Zahlen an der Lagekarte hängt.
`A §7.2 Eigenschaft 3` prüft nur **Präfixe** (`ab=schnappschuss(präfix)`), also genau den Fall,
in dem keine älteren Ereignisse nachrücken — der Test ist so formuliert, dass er den Defekt
strukturell nicht finden kann. `A §8 M0-DoD` enthält keinen Schnappschuss. `A §7.3` prüft
„alle vier Prozesse und ein fünfter, frisch gestarteter Leser falten denselben Zustand" — das
würde den Defekt finden, **wenn** die Simulation Schnappschüsse schreibt; das steht nirgends,
und der frisch gestartete Leser ist der einzige, der überhaupt einen laden würde.

**Was den Vorschlag rettet.** Eine der folgenden drei Festlegungen, normativ in
`docs/KONZEPT-SPEICHER.md` und als Property-Test:
(a) Schnappschuss trägt je Feld/Entität den Gewinner-HLC (`{wert, hlc}` statt `wert`); Fortsetzung
vergleicht wie im Vollfold. Kosten: Schnappschuss wird ~2–3× größer, sonst nichts.
(b) Schnappschüsse nur bis zu einer **stabilen Front** (Watermark) schreiben: kleinster HLC, unter
dem kein bekannter Client mehr etwas beitragen kann. Das setzt eine vollständige Client-Liste und
eine untere Schranke je Client voraus — mit unbegrenzt lange offline arbeitenden Meldeköpfen
(`A §3.7`) existiert diese Schranke nicht, also praktisch untauglich.
(c) Schnappschüsse als reinen Lesecache deklarieren, der verworfen wird, sobald ein Ereignis mit
`hlc <` Schnappschuss-Maximum eintrifft (Neu-Fold). Einfachste Variante, kostet Startzeit genau
in den Fällen, in denen sie egal ist.
Zusätzlich in beiden Fällen: Schnappschuss trägt Schema-/App-Version und die Liste der
tatsächlich gefalteten Ereignistypen; Leser verwerfen Schnappschüsse, deren Schreiber nicht alle
im Bereich vorkommenden Typen kannte. Und: `A §7.2 Eigenschaft 3` muss von „Präfix" auf
„beliebige Teilmenge plus nachrückende ältere Ereignisse" umformuliert werden, sonst ist die
Reparatur nicht abgesichert.

---
## 4. Schwere Befunde

### S1 — Die Delta-Grenze der HLC ist nur für die Empfangsseite spezifiziert; auf der Senderseite fehlt sie, und feldweises LWW macht daraus stille Vorherrschaft eines Rechners mit vorgehender Uhr

**Angegriffene Entscheidung:** `A §3.8`, Satz: „Ein Client mit falscher Uhr zieht die anderen nicht
mit, weil bei Überschreiten einer Delta-Grenze (Vorschlag: 5 min) nur der logische Teil hochgezählt
und eine UI-Warnung gezeigt wird."

**Warum das nicht trägt.** Der zitierte Schutz ist der Empfangsschutz (`uhlc::ExceedingDeltaError`,
Q8): ein Empfänger übernimmt einen zu weit vorgezogenen Fremdzeitstempel nicht. Genau daraus folgt
der Schaden. Der Rechner mit der vorgehenden Uhr stempelt seine eigenen Ereignisse weiterhin mit
seiner eigenen physischen Zeit; alle anderen weigern sich, mitzuziehen. Für die Dauer der Abweichung
sortieren damit **alle** Ereignisse des schnellen Rechners hinter alle Ereignisse aller anderen.
Grundregel 1 des Folds ist feldweises LWW nach HLC (`A §3.5`). Also gewinnt der schnelle Rechner
jedes Feld, das er anfasst, gegen jede spätere Korrektur der FüSt — bis die Wanduhr der anderen
den Vorsprung eingeholt hat.

**Ablauf:** Meldekopf-Laptop hat +47 min (Beispiel aus `A §3.8` selbst).
1. 14:00 (echt) meldet Meldekopf `status = Anmarsch` für e-1, HLC-physisch 14:47.
2. 14:10 (echt) korrigiert die FüSt `status = Einsatzbereit`, HLC-physisch 14:10.
3. Fold: 14:47 > 14:10 → die Korrektur der FüSt ist unwirksam. Kein Konflikthinweis, weil
   `A §3.5 Regel 6` (`basis`-Prüfung) ausschließlich für `EinheitStaerkeGesetzt` gilt (siehe S4).
4. Die Warnung „Uhr weicht ab" erscheint laut `A §3.8` auf dem abweichenden Rechner — also dort,
   wo niemand sie mit dem Symptom in Verbindung bringt; die FüSt sieht nur, dass ihre Eingabe
   „nicht ankommt".

**Warum die Prüfung es nicht findet.** `A §7.2 Eigenschaft 4` prüft bei ±3 h Uhrabweichung
ausschließlich, dass die HLC-Folge „je Client streng monoton und kausal konsistent" ist. Monotonie
gilt in diesem Szenario. Die Eigenschaft, die verletzt wird — „kein Client kann die LWW-Entscheidung
länger als die Delta-Grenze dominieren" — ist nicht formuliert.

**Entlastung durch `betrieb`:** NTP ist im Einsatznetz vorhanden, die Abweichung ist damit im
Regelfall klein. Sie ist aber nicht ausgeschlossen: der Meldekopf am Ortseingang ist genau der
Rechner, der laut `A §3.7` **ohne** NAS- und damit typischerweise ohne Netzzugang arbeitet und
seine Zeit deshalb nicht bezieht; `nas §8.2` nennt zusätzlich Standby und leere CMOS-Batterie.

**Was den Vorschlag rettet.** (a) Senderseitige Kappung normativ festschreiben: Ein Client, dessen
eigene physische Uhr die höchste von Peers gesehene Zeit um mehr als Δ übersteigt, stempelt
`max(gesehen)+Δ` und zählt den logischen Teil hoch — dieselbe Regel, aber auf der Seite, die den
Schaden anrichtet. (b) Fold-Regel: LWW-Entscheidungen, bei denen Gewinner- und Verlierer-Ereignis
in `wand` und `hlc` unterschiedlich geordnet sind, erzeugen einen Konflikthinweis. (c) Property:
„Für jeden Ereignisstrom mit einem um X abweichenden Client gilt: keine Feldentscheidung wird
länger als Δ von diesem Client dominiert."

### S2 — Absolute Stärkeereignisse verletzen die Summenerhaltung beim nebenläufigen Aufteilen; die bewusste Abweichung von `nas §4` ist im Zieldatenmodell bereits als falsch nachgewiesen

**Angegriffene Entscheidung:** `A §3.4` Gestaltungsregel 1: „`nas §4` schlägt additive Ereignisse
vor; das ist … für die von Hand gepflegte Excel-Stärke aber unpraktikabel [Abweichung von nas,
bewusst]", umgesetzt als `EinheitStaerkeGesetzt {fue, ufue, he, basis}`. `A §3.5` enthält **keine**
Regel für `EinheitGeteilt`/`EinheitZusammengefuehrt`, obwohl beide im Katalog `A §3.4` stehen.

**Warum das nicht trägt.** `ZDM §4.4` benennt genau diesen Fall als eine von drei Stellen, an denen
LWW nachweislich falsche Zustände erzeugt: „**Aufteilen.** Absolutes Setzen der Quellstärke (wie v1
es tut) verliert bei zwei nebenläufigen Aufteilungen einen Teil", und fordert als Prüfkriterium
`P4 Summenerhaltung`.

**Ablauf:** Einheit U hat 0/3/17 (Gesamt 20).
1. FüSt teilt einen Trupp 0/1/5 ab → `EinheitStaerkeGesetzt{U, 0/2/12, basis=h0}` +
   `EinheitAngelegt{U2, 0/1/5}`.
2. Meldekopf teilt gleichzeitig 0/1/3 ab → `EinheitStaerkeGesetzt{U, 0/2/14, basis=h0}` +
   `EinheitAngelegt{U3, 0/1/3}`.
3. Fold: LWW über das Tripel, der spätere HLC gewinnt → U = 0/2/14. `EinheitAngelegt` ist additiv,
   beide Teile existieren.
4. Gesamtstärke des Einsatzes: 16 + 6 + 4 = **26** statt 20. Sechs Helfer sind entstanden.
   Der Ausdruck „Stärkeübersicht" (`A §6.2`, das Produkt, das an der Lagekarte hängt) zeigt sie.

Der `basis`-Hinweis aus Regel 6 feuert hier zwar, korrigiert aber nichts, und `A §7.2 Eigenschaft 5`
listet als Invarianten nur `gesamt == fue+ufue+he` (stimmt in jedem Teilobjekt) sowie
Waisenfreiheit — **nicht** die Summenerhaltung. Der Fehler entsteht also im Betrieb und wird von
der Prüfstrategie des Vorschlags nicht erkannt.

**Was den Vorschlag rettet.** `EinheitGeteilt` als **ein** Ereignis mit relativer Semantik
(„entnimmt {f,uf,m} aus U und legt damit U2 an") statt als Paar aus absolutem Setzen und Anlegen;
`ZDM §4.2`/`§4.4` gibt das bereits so vor. Die Rechtfertigung „von Hand gepflegte Excel-Stärke"
trägt für den Normalfall der reinen Stärkemeldung (dort ist absolutes Setzen richtig und
`ZDM §4.2` sagt dasselbe: LWW/Entität über das Tripel), nicht für den Aufteilungsvorgang.
Zusätzlich `A §7.2` um die Eigenschaft „Aufteilen+Zusammenführen in beliebiger Reihenfolge lassen
die Gesamtstärke unverändert" (= `ZDM §4.4 P4`) ergänzen.

### S3 — Archivierung ist eine unumkehrbare Barriere mit doppeltem Mechanismus (Markerdatei + Ereignis) und schluckt genau die Arbeit, die das Offline-Modell schützen soll

**Angegriffene Entscheidung:** `A §3.5 Regel 7` („Nach `EinsatzArchiviert` werden alle späteren
fachlichen Ereignisse **verworfen** und als Hinweis geführt"), `A §3.11` („Rolle ‚FüSt' setzt
`archiviert.marker` (create-new). Danach verwirft der Fold neue fachliche Ereignisse … Die App
erzeugt das ZIP nach `archiv\`, prüft die Hashes und verschiebt den Ordner erst dann.").

**Drei getrennte Defekte:**

1. **Zwei Wahrheiten.** `A §3.3`/`§3.11` machen die Markerdatei zum auslösenden Akt, `A §3.5 Regel 7`
   und `ZDM §4.2` das Ereignis `EinsatzArchiviert`. Beide können auseinanderlaufen: Der Marker ist
   für andere Clients wegen Q1 bis zu 10 s (Directory-Cache) bzw. 5 s (FileNotFound-Cache) unsichtbar,
   das Ereignis unterliegt derselben Poll-Latenz plus HLC-Ordnung. Es ist nicht festgelegt, welcher
   der beiden autoritativ ist und was gilt, wenn nur einer existiert (Marker gesetzt, Ereignis noch
   nicht gespiegelt — oder umgekehrt nach einem Absturz zwischen beiden Schritten).
2. **Offline-Arbeit wird zustandslos.** Ein Meldekopf, der laut `A §3.7` stundenlang ohne NAS
   weiterarbeitet, erzeugt Ereignisse mit HLC **nach** der Archivierung. Beim Wiederanschluss werden
   sie nicht gefaltet. `ZDM §4.3` legt für `EinsatzArchiviert` „Undo: **nein**" fest; einen Weg,
   die Barriere zurückzunehmen, gibt es weder in `A` noch in `ZDM`. Damit existiert ein Pfad, auf
   dem bestätigte Kommandos dauerhaft ohne Wirkung bleiben — im direkten Widerspruch zum
   Abnahmekriterium `A §7.3`: „kein Kommando, das eine Bestätigung erhalten hat, ist verloren".
3. **Der Ordner-Rename ist nicht rennfrei.** „verschiebt den Ordner" bedeutet unter Windows einen
   Rename auf ein Verzeichnis, dessen Dateien andere Clients gerade zum Lesen geöffnet haben
   (der Poll-Zyklus öffnet alle 2 s jede Ereignisdatei). Q4 gilt hier direkt: Der Rename schlägt
   mit Sharing Violation fehl. `A §3.11` beschreibt keinen Fehlerpfad; das Ergebnis ist ein
   Einsatzordner mit gesetztem Marker, der nicht wandert und in dem niemand mehr arbeiten darf.

**Was den Vorschlag rettet.** (a) Markerdatei streichen; allein `EinsatzArchiviert` ist die Barriere,
mit `hlc` als Kriterium — das ist ohnehin die einzige Größe, die ordnungsdefiniert ist.
(b) Regel 7 von „verworfen" auf „gefaltet in einen separaten, gekennzeichneten Nachtragsbereich"
umstellen und `EinsatzWiedereroeffnet` als berechtigten Fachvorgang zulassen (`ZDM §4.2` hat den
Typ für `EinsatzBeendet` bereits; für `EinsatzArchiviert` fehlt er). (c) Verschieben durch
Kopieren + `archiviert.zip` + Beibehalten des Ordners ersetzen, bzw. den Move erst zulassen, wenn
seit X Minuten keine Präsenzdatei aktualisiert wurde, und Fehlschlag als Normalfall behandeln.

### S4 — `basis`/`vorher` nur bei der Stärke: Freitextfelder verlieren beim parallelen Bearbeiten stumm, obwohl das Zieldatenmodell die Prüfung für jedes Feld vorschreibt

**Angegriffene Entscheidung:** `A §3.4` („Absolutwerte nur dort, wo LWW fachlich richtig ist (Name,
Status, Schicht, Bemerkung)", `EinheitFelderGeaendert {einheitId, felder:{status?, bemerkung?, …}}`
— ohne Vorher-Wert) und `A §3.5 Regel 6`, das die `basis`-Prüfung ausschließlich für
`EinheitStaerkeGesetzt` einführt. Dazu `A §3.8`: Bearbeitungssperren (`record-lock.ts`, TTL 45 s)
werden „ersatzlos" durch weiche Präsenzanzeige ersetzt.

**Warum das nicht trägt.** `ZDM §4.1 Regel 3` ist hier normativ und gegenläufig: „**Vorher-Werte.**
Jedes Ereignis, das ein Feld setzt, trägt neben `neu` auch `vorher` … erkennbare Konflikte
(`vorher` passt nicht zum gefalteten Zustand → Hinweis im UI) und triviale Kompensation".
`A` setzt das nur für ein einziges Feld um. Für alle anderen — `bemerkung`, `auftrag`,
`erreichbarkeit`, ETB-relevante Texte — gilt reines LWW ohne jede Erkennung. Der häufigste reale
Konflikt der Zielumgebung (FüSt schreibt den Auftrag, Meldekopf ergänzt die Bemerkung derselben
Einheit; oder zwei Bediener schreiben nacheinander in dasselbe Bemerkungsfeld) endet damit im
stummen Überschreiben eines Freitextes. v1 hatte dafür — kaputte, aber vorhandene — Record-Locks;
`A §3.8` streicht sie und ersetzt sie durch eine Anzeige, die wegen Q1 (Präsenzdateien unterliegen
dem 10-s-Attributcache) bis zu 10 s alt ist und deshalb systematisch **nicht** warnt, wenn zwei
Bediener kurz hintereinander dasselbe Feld anfassen.

Zusätzlich: `EinheitFelderGeaendert` mit einer partiellen Feldkarte kann „Feld leeren" nicht von
„Feld nicht angefasst" unterscheiden, sobald `undefined` über JSON serialisiert wird. Das ist ein
Formatdetail mit Datenwirkung (Löschen einer Bemerkung geht verloren) und in `A §3.4` nicht geregelt.

**Was den Vorschlag rettet.** `A §3.4`/`§3.5` durch `ZDM §4.1 Regel 3` ersetzen: `vorher` bei jedem
feldsetzenden Ereignis, Konflikthinweis bei Abweichung vom gefalteten Zustand, für alle Felder.
Für Freitexte zusätzlich: bei erkanntem Konflikt beide Fassungen im Hinweis mitführen, damit die
verlorene Fassung wiederherstellbar ist. Explizites `null` statt `undefined` im Schema.

### S5 — „Alle Share-Operationen mit Timeout im Worker" ist mit `node:fs` nicht implementierbar; der Worker-Thread isoliert nicht, weil der libuv-Threadpool prozessweit ist

**Angegriffene Entscheidung:** `A §1.4` („delegiert **jede** Share-Operation an einen
Worker-Thread. Damit fällt `R-MAIN-1` … strukturell weg"), `A §2.2` (Worker-Thread als Träger von
`packages/speicher`), `A §9 A2` Gegenmaßnahme: „alle Share-Operationen mit Timeout im Worker".

**Warum das nicht trägt.** Zwei Eigenschaften der Laufzeit, die der Vorschlag nicht berücksichtigt:

1. **Dateisystemoperationen von Node sind nicht abbrechbar.** `fs.promises`-Operationen laufen im
   libuv-Threadpool; ein `AbortSignal` (nur bei `readFile`/`writeFile` überhaupt vorhanden) lehnt
   die Promise ab, beendet aber die laufende Betriebssystemanfrage nicht. Für `open`, `read`,
   `stat`, `readdir`, `fsync` gibt es kein Abbruchmittel. Bei einem stockenden NAS bleibt der
   Threadpool-Platz bis zum SMB-Abbruch belegt — laut Q6 bis zu 60 s.
2. **Der Threadpool ist prozessweit und wird von Worker-Threads geteilt** (libuv legt den Pool
   einmal je Prozess an; `UV_THREADPOOL_SIZE` ist eine Prozessvariable, Vorgabe 4)
   [Annahme: gilt für die eingesetzte Node-/Electron-Linie unverändert — in M0 mit einem
   Messtest zu bestätigen]. Der Poll-Zyklus öffnet alle 2 s jede bekannte Ereignisdatei; bei
   fünf Clients mit mehreren Segmenten sind das mehr als vier gleichzeitige Operationen.
   Stockt der Share, sind alle vier Plätze belegt, und **jede** weitere `fs`-Operation des
   Prozesses steht an — auch die des Main-Threads (Einstellungen schreiben, Ausgabedateien,
   Installer kopieren nach `A §2.6`) und jede `crypto`-Operation (Hash-Kette, sha256-Prüfung).

Die Folge ist nicht der v1-Fehler (blockierter UI-Thread, `R-MAIN-1`) — der ist mit dem Verzicht auf
`*Sync` tatsächlich weg. Die Folge ist, dass die als Gegenmaßnahme benannte Timeout-Disziplin
nicht existiert: ein Timeout-und-Wiederholen-Muster stapelt blockierte Threadpool-Plätze und
verschlimmert die Lage. Ironischerweise ist die Struktur, die das löst, genau die, die
`A §1.7`/`§5.3` als Ballast streicht: ein **eigener Prozess** für Share-I/O, den man abschießen
kann (v1: „Utility-Prozess-Gerüst ~1.000 Z."). Der Rust-Weg hätte hier übrigens dasselbe Problem
(auch `std::fs`/`spawn_blocking` sind nicht abbrechbar) — der Befund spricht nicht für Tauri,
sondern gegen die konkrete Gegenmaßnahme.

**Was den Vorschlag rettet.** (a) Share-I/O in einen **Kindprozess** (`utility process` oder
`child_process`) statt in einen Worker-Thread; Timeout = Prozess beenden und neu starten, Zustand
liegt ohnehin im Ereignisprotokoll. (b) Wenn Worker-Thread, dann `UV_THREADPOOL_SIZE` explizit
setzen (z. B. 16) **und** die Zahl gleichzeitiger Share-Operationen im Worker auf eine harte
Obergrenze deutlich unterhalb der Poolgröße begrenzen (Semaphor), damit Main-Thread-I/O nie
verhungert. (c) M0 um eine Messung „NAS während des Betriebs trennen, Verhalten von Main-I/O
beobachten" erweitern; das ist ein Zweizeiler im Spike und schließt eine Annahme, die sonst erst
im Einsatz auffällt.

### S6 — Zwei App-Instanzen auf einem Rechner teilen `userData` und damit Client-Identität und Ereignisdatei; der Vorschlag bewirbt genau diese Konstellation

**Angegriffene Entscheidung:** `A §2.5` („Zusätzlich wird ein **Portable-Ziel** gebaut … ein
einzelnes `.exe`, das ohne Installation und ohne Adminrechte von einem USB-Stick oder direkt vom
Share startet"), `A §3.3` (lokale Ablage unter `app.getPath('userData')`, dort auch die
Client-Identität in `einstellungen.json`), `A §3.5` („Der Worker ist der einzige Schreiber der
eigenen Ereignisdatei", `A §2.2`).

**Warum das nicht trägt.** Ein Single-Instance-Mechanismus wird nirgends festgelegt — weder in
`A §2.2` (Prozessmodell) noch in `A §5.3` (Übernahmeliste) noch in `A §9`. Die Portable-EXE und die
installierte Fassung verwenden denselben Anwendungsnamen und damit dasselbe `userData`-Verzeichnis
[Annahme: `electron-builder`-Portable setzt kein abweichendes `userData` — in M0 zu prüfen; die
Annahme ist die ungünstige und deshalb die zu widerlegende]. Startet ein Bediener beide (der
typische Ablauf: installierte Fassung läuft, jemand startet zusätzlich die Portable vom Share, weil
„die aktuellere"), gibt es zwei Prozesse mit **derselben** `clientId`, die beide an dieselbe lokale
und dieselbe Share-Ereignisdatei anhängen. Das ist der Multi-Writer-Append-Fall, den Q3 ausdrücklich
ausschließt und dessen Vermeidung die gesamte Sicherheitsargumentation von `nas §10 Begründung 1`
trägt. Das Ergebnis ist eine Datei mit ineinander verschränkten Teilzeilen, gebrochener Hash-Kette
und doppelt vergebenen `id`-Laufnummern (`<clientId>:<laufnummer>`) — zwei verschiedene Ereignisse
mit derselben `id`, was die Idempotenzregel (`A §3.5 Regel 9`, `ZDM §4.1 Regel 2`) in eine stille
Datenvernichtung verwandelt: das zweite Ereignis wird als Duplikat verworfen.

`A §9 A7` deckt nur den Nachbarfall (Image-Klon auf **zwei** Rechnern) ab, und seine Erkennung
(„prüft, ob die eigene Share-Datei zum lokalen Offset und zur Hashkette passt … beginnt eine neue
Dateigeneration") führt bei zwei lokalen Instanzen zu einer Endlosschleife aus wechselseitigen
Generationswechseln.

**Was den Vorschlag rettet.** (a) `app.requestSingleInstanceLock()` verbindlich, plus eine
Sperrdatei im `userData`-Verzeichnis, die die Ereignisdatei-Hoheit an genau einen Prozess bindet
(lokale Datei, kein Netz — dort ist `O_EXCL` unproblematisch). (b) `clientId` an das
`userData`-Verzeichnis binden und der Portable-Fassung ein eigenes `userData` geben (dann sind es
sauber zwei Clients). (c) Die Prüfung aus A7 um „Schreiber ist derselbe Prozess" erweitern und bei
Verdacht **nicht** automatisch eine neue Generation beginnen, sondern anhalten und warnen.

### S7 — Der HLC-Text ist nur bei 13-stelliger Millisekundenzahl lexikografisch sortierbar; ein Rechner, der offline mit zurückgestellter Uhr startet, gewinnt danach dauerhaft jede LWW-Entscheidung

**Angegriffene Entscheidung:** `A §3.3`, wörtlich: `"hlc": "1757164353123:0007:c-9b12ef", // physisch(ms):logisch:clientId, lexikografisch sortierbar`;
`A §3.5` („Sortierung: `hlc` aufsteigend") als **einzige** Ordnungsgrundlage des Folds; `A §3.8`
(`hlc = max(eigenePhysische, gesehenePhysische) : logisch : clientId`).

**Warum das nicht trägt.** Der physische Teil ist eine Dezimalzahl variabler Länge. Lexikografische
Ordnung variabel langer Dezimalzahlen ist **nicht** numerische Ordnung: `"946684800000"` (12 Stellen,
= 2000-01-01) sortiert **hinter** `"1757164353123"` (13 Stellen), weil `'9' > '1'`. Jede physische
Zeit vor dem 2001-09-09 (der Millisekunden-Epoche, ab der 13 Stellen gelten) sortiert damit als
größter Wert des gesamten Einsatzes — und bleibt es für immer.

Die HLC-Regel `max(eigene, gesehene)` schützt einen Client, der bereits Fremdereignisse gesehen hat.
Sie schützt **nicht** den Client, der noch keine gesehen hat — und genau diese Konstellation bewirbt
der Vorschlag als Normalfall: der Meldekopf am Ortseingang startet ohne NAS-Zugang (`A §3.7`,
letzter Punkt), also mit leerem Fremdspiegel; `gesehenePhysische` existiert nicht, die eigene Uhr ist
die einzige Eingabe. `nas §8.2` nennt leere CMOS-Batterie und Standby als realistische Ursachen für
eine falsche Uhr; `betrieb` sagt zwar „NTP vorhanden im Einsatznetz" — der offline arbeitende
Meldekopf ist aber gerade der Rechner, der nicht in diesem Netz hängt. [Annahme: der konkrete
Windows-Vorgabewert nach CMOS-Verlust; belegt ist nur die Klasse „Uhr geht grob falsch", `nas §8.2`.]

**Ablauf mit Schrittfolge:**
1. Meldekopf-Laptop bootet ohne Netz, RTC steht auf 2000-01-01 → `Date.now()` = 946684800000 (12 Stellen).
2. Der Bediener erfasst 40 Einheiten; alle HLC-Strings beginnen mit `9466…`.
3. Übergabe (USB oder Netz). Der Fold sortiert lexikografisch: alle 40 Ereignisse liegen **hinter**
   jedem Ereignis mit 13-stelliger Zeit (`1757…` beginnt mit `'1'`).
4. Grundregel 1 (feldweises LWW nach HLC): Jedes Feld, das der Meldekopf angefasst hat, schlägt jede
   Eingabe der FüSt — auch jede, die Stunden **später** gemacht wird, denn `'9' > '1'` ändert sich nicht.
5. Die Delta-Grenze aus `§3.8` greift nicht: Sie ist gegen eine Uhr gerichtet, die zu weit **vorgeht**.
   Hier geht die Uhr 26 Jahre **nach**, und der Empfangsschutz zieht die eigene Uhr ohnehin nur hoch.

Das Ergebnis ist nicht bloß falsch, sondern **stabil** falsch: Es gibt kein späteres Ereignis, das die
Entscheidung überstimmen könnte, weil jedes spätere Ereignis lexikografisch kleiner ist. Das ist die
Umkehrung der Kernzusage `A §3.2 (f)`.

**Warum die Prüfung es nicht findet.** `A §7.2 Eigenschaft 4` simuliert Uhrabweichung von „±3 h" — drei
Stunden ändern die Stellenzahl nie. Die Generatoren erzeugen laut `A §7.2` „fachlich plausible"
Ströme; Zeiten vor 2001 gehören per Definition nicht dazu.

**Was den Vorschlag rettet.** (a) Feste Breite: physischer Teil als nullgepolsterte 16-stellige
Dezimalzahl oder als Hex fester Breite — dann ist lexikografisch = numerisch bis weit über die
Lebensdauer der Akten hinaus. (b) Besser zusätzlich: Der Fold vergleicht das **geparste Tripel**
(`physisch:number`, `logisch:number`, `clientId:string`); die Textform ist reines Transportformat.
Property-Test in `hlc.ts`: „Textvergleich == Tripelvergleich für zufällige Zeiten von 1970 bis 2200".
(c) Plausibilitätsuntergrenze: Ereignisse mit physischer Zeit vor `EinsatzAngelegt.hlc − 24 h` werden
beim Sortieren auf die Untergrenze gehoben und erzeugen einen Konflikthinweis; die `fachzeit` bleibt
unberührt, sie ist ohnehin Nutzereingabe (`A §3.8`). (d) `A §7.2 Eigenschaft 4` von „±3 h" auf
„±30 Jahre" erweitern — das ist eine Zahl im Generator, kein Aufwand.

### S8 — Ein einziger Worker je Akte trägt Kommandoverarbeitung, Share-Spiegelung und Poll-Schleife; das Offline-Versprechen aus §3.7 gilt deshalb nur, wenn der Share *weg* ist, nicht wenn er *hängt*

**Angegriffene Entscheidung:** `A §2.2` (ein Worker-Thread „akte" je offenem Einsatz, der `packages/kern`
**und** `packages/speicher` **und** `packages/netz` trägt und die materialisierte Sicht hält);
`A §2.2` („Kommandos gehen als **Intent** an den Worker … Der Worker erzeugt daraus 0..n Ereignisse,
faltet, und schickt ein Delta zurück"); `A §3.7` („**Share weg** → die App arbeitet unverändert weiter").

**Warum das nicht trägt.** Das Offline-Versprechen unterscheidet nicht zwischen „Share weg" (Fehler
kommt sofort, weil die Verbindung abgelehnt wird) und „Share hängt" (Fehler kommt erst nach dem
Request Expiration Timer, Q6: `SessTimeout` = 60 s). Der Regelfall im Einsatz ist der zweite:
Zellenwechsel im WLAN, NAS im Plattenstandby, überlastete Leitung, Synology beim Paket-Update.
Weil Kommandoverarbeitung und Share-I/O im **selben** Worker liegen und der Pfad je Ereignis
seriell ist (lokal anhängen → `fsync` → spiegeln → Delta), hält eine hängende SMB2-FLUSH-Antwort
(Q5: der Server blockiert bis zum Abschluss des Flush) den Worker fest. Für den Bediener sieht das aus
wie `R-MAIN-1` in v1 — die Eingabe wird nicht quittiert —, obwohl der UI-Thread lebt. Genau das
Verhalten, dessen strukturelle Beseitigung `A §1.4` als einen der vier Schnitte verkauft, tritt an
einer Stelle wieder auf, die der Vorschlag nicht betrachtet.

Verschärfend: `A §3.3` verlangt `fsync` nach **jedem** Ereignis. Bei Massenvorgängen — EEB-Segmentstapel
(`A §4.5`), Excel-Import (`A §3.10`), Migration (`A §3.9`) — sind das Dutzende bis Hunderte
aufeinanderfolgende FLUSH-Roundtrips im selben Worker. Das M0-Abbruchkriterium (`A §8`: „> 300 ms je
Ereignis") misst die Einzeloperation, nicht die Serie; 200 Ereignisse × 300 ms sind eine Minute, in der
nichts anderes läuft. Ebenfalls betroffen: die Poll-Schleife liegt im selben Worker, also verzögert ein
hängender Share auch das SLO „Fremdänderung sichtbar < 5 s" (`A §7.4`).

**Was der Vorschlag bereits adressiert und warum es nicht reicht.** `A §9 A2` nennt „alle
Share-Operationen mit Timeout im Worker". Erstens ist das mit `node:fs` nicht implementierbar (S5).
Zweitens beendet ein Timeout nicht die Blockade, sondern nur das Warten darauf — der belegte
Threadpool-Platz und die serielle Position in der Warteschlange bleiben.

**Was den Vorschlag rettet.** (a) Zwei Pfade normativ trennen: „lokal anhängen + falten + Delta senden"
ist der Quittierungspfad und darf **keine** Share-Operation enthalten; „spiegeln + pollen" ist eine
unabhängige, abbrechbare Aufgabe (nach S5 vorzugsweise ein eigener Kindprozess), deren Verzögerung
ausschließlich die Statuszeile beeinflusst. (b) `fsync` auf dem **Share** gruppieren (N Zeilen anhängen,
ein FLUSH); die Dauerhaftigkeitszusage hängt ohnehin an der lokalen Datei, die Share-Datei ist Spiegel.
Lokal bleibt `fsync` je Ereignis. (c) M0-DoD um zwei Fälle erweitern: „Serie von 200 Ereignissen am
Stück" und „Share einfrieren statt trennen (NAS-Standby erzwingen oder Kabel ziehen ohne Session-Reset)
— die Eingabe muss weiter quittiert werden".

---

## 5. Mittlere Befunde

### M1 — Segmentrotation „bei jedem App-Start" macht die Dateierzeugung zum Benachrichtigungsmechanismus — genau das Anti-Muster, vor dem die Primärquelle wörtlich warnt

**Angegriffene Entscheidung:** `A §3.3`: „`c-9b12ef-fuest1.000002.jsonl` — neues Segment ab 8 MB
**oder bei jedem App-Start**".

**Warum das nicht trägt.** Q1 (`nas §1.2`, Microsoft wörtlich): „Applications which require a high level
of file information consistency across clients which may utilize **creation** … of a file as a
notification mechanism to other nodes may encounter delays or consistency issues with these default
values", und zum Directory-Cache: „This cache is likely to affect distributed applications running on
multiple computers accessing a set of files on a server". Eine neue Datei wird von fremden Clients erst
nach Ablauf von `DirectoryCacheLifetime` (10 s) beim `readdir` sichtbar; ein gezielter `open` auf den
Namen kann zusätzlich bis zu `FileNotFoundCacheLifetime` (5 s) fälschlich `ENOENT` liefern, wenn ein
Poll-Zyklus zufällig kurz vor der Erzeugung danach gefragt hat.

`A §3.6` kennt den Effekt und bepreist ihn als Einmalkosten: „bis zu **10 s** für die *erste* Datei
eines neu hinzugekommenen Clients". Mit Rotation bei jedem App-Start sind es aber keine Einmalkosten:
**jeder Neustart jedes Clients** erzeugt eine neue Datei und damit das volle Sichtbarkeitsloch. Neustarts
sind im Einsatz häufig (Akku, Update nach `§2.6`, Rechnerwechsel bei Schichtwechsel). Zusammen mit dem
Poll-Intervall von 2 s liegt die Sichtbarkeit dann bei bis zu 12 s — exakt am eigenen SLO-Rand
(`A §7.4`: „< 12 s ohne UDP"), und das SLO ist damit an genau der Stelle grenzwertig, an der der
Vorschlag es für unproblematisch erklärt.

Zweite Wirkung: Der Poll-Aufwand wächst mit der Zahl der **Segmente**, nicht der Clients.
`A §3.6` liest „je bekannter Datei `open` + `read` ab gemerktem Offset". Bei 5 Rechnern (`betrieb`) und
einem mehrtägigen Einsatz mit je 10 Neustarts sind das 50 Dateien, die alle 2 s geöffnet und gelesen
werden — bei 49 davon ist das Ergebnis immer „nichts Neues". Das ist die Schwäche, die `nas §9` der
verworfenen Option F zuschreibt („Directory-Cache, Enumeration"), hier durch die Hintertür importiert.
Betroffen ist auch die Revisionsfähigkeit: `A §3.3` bindet die Hash-Kette an „die vorherige Zeile
**derselben Datei**" — bei Rotation je Start ist die Kette je Segment abgeschlossen, und nichts bindet
Segment N+1 an N. Das Löschen eines vollständigen Segments bleibt damit unerkennbar, obwohl `A §3.11`
das Rohprotokoll als „revisionsfähig" führt.

**Was den Vorschlag rettet.** (a) Rotation **nur** nach Größe; beim App-Start an das letzte eigene
Segment weiter anhängen (der Client kennt seinen Offset aus `uebertragung.json`, es gibt keinen
technischen Grund für ein neues Segment). (b) Wenn Rotation beim Start bleibt: neue Segmente tragen im
ersten Datensatz `vorher` = Hash der letzten Zeile des Vorgängersegments plus dessen Namen, damit die
Kette segmentübergreifend hält; und der Poll-Zyklus schließt Segmente, deren Ende erreicht ist und deren
Nachfolger existiert, dauerhaft ab (nur noch `readdir`, kein `open` mehr). (c) UDP-Hinweis um den
Dateinamen erweitern (`A §3.6` sieht `{einsatzId, clientId, datei, offset}` bereits vor), damit ein Peer
die neue Datei gezielt öffnet — mit einer Wiederholung nach 5 s wegen des FileNotFound-Caches, die im
Vorschlag fehlt.

### M2 — „Daten-Reads am bekannten Offset umgehen den Windows-Attributcache" ist die tragende Latenzannahme des Modells und in den Primärquellen nicht belegt; eine Rückfallebene fehlt

**Angegriffene Entscheidung:** `A §3.6`: „Bewusst **kein** `stat`/mtime als Wahrheitsquelle — Daten-Reads
am bekannten Offset umgehen den Windows-Attributcache (`nas §4`)."

**Warum das nicht trägt.** `nas §1.2` belegt drei **Metadaten**-Caches (FileInfo, FileNotFound,
Directory). Zur Frage, ob ein `read` jenseits der zwischengespeicherten Dateigröße einen Server-Roundtrip
erzwingt oder lokal als EOF beantwortet wird, sagt die Quelle nichts. Q2 (`nas §1.2`, MS-SMB2 Leasing)
sagt für die Datenseite eher das Gegenteil: Lese-Caching-Leases (R/RH) erlauben dem Client ausdrücklich,
**Daten** zu puffern. Ein Leser, der seinen Handle über Poll-Zyklen hinweg offen hält, darf unter einer
RH-Lease „nichts Neues" aus dem eigenen Cache beantworten, bis ein Lease-Break kommt. Ob dieser Break
beim reinen Anhängen eines anderen Clients zuverlässig ausgelöst wird, hängt von der
Server-Implementierung ab — und `betrieb` sagt: Synology, also Samba, dessen Oplock-/Lease-Verhalten
laut `nas §1.8` konfigurierbar ist und bei aktivierter Transportverschlüsselung sogar abgeschaltet wird.

Das ist keine Randnotiz: Auf dieser einen unbelegten Zeile ruhen die Sichtbarkeitsaussage von `A §3.6`
(„2–4 s"), das SLO aus `A §7.4` und die Begründung, warum Polling überhaupt reicht.

**Was der Vorschlag bereits adressiert.** `A §8 M0` misst „Sichtbarkeitslatenz mit und ohne UDP" und
`A §9 A2` führt die Abweichung als Risiko. Nicht adressiert ist (i) der **spezifische** Messfall
(derselbe Handle über mehrere Zyklen offen, während ein anderer Client anhängt — nur so wird die
Lease-Frage überhaupt sichtbar; ein Messaufbau, der je Zyklus neu öffnet, misst die Frage weg) und
(ii) die Rückfallebene, falls die Annahme fällt.

**Was den Vorschlag rettet.** (a) M0 bekommt genau zwei Messreihen: „Handle offen halten" vs. „je Zyklus
`open`/`read`/`close`", jeweils mit einem zweiten Rechner als Schreiber; die Differenz ist die Antwort.
(b) Die Entwurfsentscheidung wird konditional festgeschrieben: Fällt die Annahme, wird je Zyklus neu
geöffnet — das kostet je Datei einen zusätzlichen Roundtrip und macht M1 (Zahl der Segmente) zum
Kostentreiber, ändert aber die Architektur nicht. (c) `docs/BETRIEB.md` hält die Synology-Einstellungen
fest, die das Verhalten bestimmen (SMB2-Lease, Oplocks, Transportverschlüsselung, Durable Handles,
`nas §1.8`), und M0 protokolliert `Get-SmbConnection` (Dialekt) mit.

### M3 — Drei Dateien auf dem Share werden überschrieben; das verletzt die Regel, aus der die gesamte Sicherheitsargumentation folgt, und trifft direkt auf Q4

**Angegriffene Entscheidung:** `A §3.3`: `praesenz/<clientId>.json` — „eigene Datei; einzige, die
überschrieben wird"; `ausgaben/monitor.html` — „zyklisch überschrieben **vom Leitclient**";
`programm/aktuell.json` (`A §2.6`).

**Warum das nicht trägt.** Erstens ist die Behauptung, es sei genau eine Datei, im selben Abschnitt
widerlegt: Es sind drei Klassen überschriebener Dateien, und zwei davon (`monitor.html`,
`aktuell.json`) sind **nicht** clienteigen. Zweitens greift Q4 genau hier: `nas §11` schreibt für die
Präsenzdatei „Write-Tmp + **Rename** der eigenen Datei" vor; ein Rename mit `ReplaceIfExists` scheitert
unter Windows mit EPERM/EBUSY, wenn ein anderer Client die Zieldatei ohne `FILE_SHARE_DELETE` offen hält
— und die Präsenzdateien sind genau die Dateien, die jeder Client in jedem Zyklus liest, weil `A §3.6`
daraus die Peer-IPs für den Unicast-Hinweis zieht und `A §3.8` daraus die weiche Anwesenheitsanzeige
speist. Drittens: Wird stattdessen ohne Rename in-place überschrieben, kann ein gleichzeitiger Leser
eine halb geschriebene oder leere Datei sehen — bei JSON ein Parserfehler, bei `monitor.html` eine
kaputte Seite auf genau dem Lagemonitor, den Führung und Logistik lesen (`A §6.2`, `F-K6`).

Viertens ist der „Leitclient" nirgends definiert. Es gibt keine Wahl, keine Sperre und keinen
Tie-Break; zwei Clients, die sich beide für den Leitclient halten (der Normalfall nach einem Neustart,
weil diese Rolle nirgends abgelegt ist), überschreiben dieselbe Datei im Wechsel.

**Was den Vorschlag rettet.** (a) Präsenz ebenfalls append-only: `praesenz/<clientId>.jsonl` mit einer
Zeile je Aktualisierung, Leser nehmen die letzte gültige Zeile; Rotation beim Start, Altdateien werden
beim Archivieren entsorgt. Damit gibt es auf dem Share **keine** überschriebene Datei mehr, und die
Regel aus `nas §11` („Nur Create-New und Append") gilt ausnahmslos — auch didaktisch wertvoll, weil eine
Regel ohne Ausnahme prüfbar ist (Lint/Review: kein `writeFile` auf einen Share-Pfad).
(b) `ausgaben/monitor-<clientId>.html` plus eine `ausgaben/index.html`, die per Meta-Refresh auf die
jüngste zeigt — oder schlicht: der Monitor-Schreiber ist eine **Einstellung** („dieser Rechner schreibt
den Lagemonitor"), nicht eine implizite Rolle. (c) `programm/aktuell-<version>.json` mit create-new plus
`readdir`; damit entfällt das Überschreiben und gleichzeitig das Downgrade-Risiko.

### M4 — Ohne kanonische Serialisierung sind Schnappschuss-Hash, Goldfiles und die Selbstprüfung aus A9 ordnungsabhängig; die Property-Tests prüfen die Ordnungsabhängigkeit ausdrücklich weg

**Angegriffene Entscheidung:** `A §3.5` (materialisierte Sicht als `Map<id, …>` plus abgeleitete Indizes),
`A §3.3` (Schnappschuss `{versionsvektor, zustand, hashKette}`), `A §9 A9` („Leser validieren
Schnappschüsse stichprobenartig gegen Neu-Fold"), `A §7.2 Eigenschaft 1` („tiefer Vergleich **ohne die
Reihenfolge der Hinweise**").

**Warum das nicht trägt.** JavaScript-`Map`s iterieren in Einfügereihenfolge. Sobald der Zustand
serialisiert wird — und genau das ist ein Schnappschuss —, wird aus einer logisch gleichen Struktur eine
byteweise andere Datei und damit ein anderer Hash, sobald die Einfügereihenfolgen abweichen
(verschiedene Ausgangspunkte: Vollfold, Fold ab Schnappschuss, Fold nach Nachzüglern). Damit ist (i) die
Selbstprüfung aus A9 nicht durchführbar (ein Byte-Vergleich meldet Fehlalarme, ein Tiefvergleich braucht
denselben Normalisierer wie der Test), (ii) das Goldfile-Verfahren aus `A §7.1` fragil, und (iii) die
Aussage „gleiche Ereignismenge → gleicher Zustand" nur bis zur Grenze des jeweiligen Vergleichers wahr.

`A §7.2 Eigenschaft 1` schließt die Hinweisreihenfolge explizit vom Vergleich aus. Das ist genau verkehrt
herum: `ZDM §4.4 P3` rechnet die Konflikthinweise zum Zustand („die sind Teil des Zustands, nicht der
UI"). Eine Eigenschaft, die den fraglichen Teil vom Vergleich ausnimmt, kann den Defekt nicht finden.

**Was den Vorschlag rettet.** (a) Eine kanonische Serialisierung in `packages/kern/src/format/` festlegen
(Schlüssel sortiert, Arrays mit explizitem wertbasiertem Tie-Break, feste Zahlformatierung) und **sie**
zur Definition von „gleicher Zustand" machen. (b) `A §7.2 Eigenschaft 1` auf Byte-Gleichheit der
kanonischen Form umstellen und die Hinweise **einschließen**, mit deterministischer Hinweis-Id (G4).
(c) Erst dann ist A9 (Schnappschuss gegen Neu-Fold) überhaupt implementierbar.

### M5 — Die Mehrclient-Simulation läuft auf einem lokalen Dateisystem und kann per Konstruktion keine der Eigenschaften Q1–Q6 verletzen; die zentrale Qualitätsbehauptung bleibt für die eigentliche Fehlerklasse unbelegt

**Angegriffene Entscheidung:** `A §7.3` (4 Prozesse „gegen ein gemeinsames Temp-Verzeichnis, **das den
Share spielt**"; Störungen Partition/Uhr/Absturz/Truncate/„langsames Dateisystem") und der Abnahmesatz
„Das ist der Test, den v1 nicht bestanden hätte … er läuft in CI in unter einer Minute und braucht kein
NAS."

**Warum das nicht trägt.** Ein lokales Temp-Verzeichnis hat **keine** der belegten SMB-Eigenschaften:
keinen 10-s-Directory-Cache (Q1), keinen 5-s-Negativ-Cache (Q1), keine Lease-Pufferung (Q2), keine
Rename-Sharing-Violation (Q4), kein 60-s-Session-Timeout (Q6), keine mandatorischen Byte-Range-Locks
(`nas §1.6`). Die fünf Störungen decken Fehler der **Anwendung** ab (Partition, Uhr, Absturz, Truncate)
und eine pauschale Verzögerung — aber kein einziges dokumentiertes Verhaltensmerkmal des Transportwegs.
Die Simulation prüft damit den Fold, nicht das Speichermodell; und genau das Speichermodell ist die
Stelle, an der v1 gescheitert ist.

Der Vorschlag ist hier nicht unehrlich (`A §7.3`: „Ergänzend, **einmalig manuell** … das ersetzt die
Simulation nicht, sondern kalibriert sie"), zieht aber die falsche Konsequenz: Er stellt die manuelle
Messung **neben** die Simulation, statt die dokumentierten Eigenschaften **in** sie zu holen. Damit
bleibt die Regressionsfähigkeit für die teuerste Fehlerklasse bei null: Ein späterer Umbau der
Handle-Behandlung (M8) wird von keinem CI-Lauf bemerkt.

**Was den Vorschlag rettet** (billig, hoher Ertrag): Eine „feindliche Dateisystem"-Schicht in
`packages/speicher`, gegen die die Simulation läuft — ein dünner Adapter, der (i) neue Dateien im
`readdir` erst nach 10 s zeigt, (ii) ein `open` auf eine gerade erzeugte Datei 5 s lang mit `ENOENT`
beantwortet, (iii) ein `read` jenseits der zuletzt gesehenen Größe mit „0 Bytes" beantwortet, bis ein
künstlicher Lease-Break kommt, (iv) `rename` mit `EBUSY` scheitern lässt, während ein anderer Prozess
liest, und (v) jede Operation mit kleiner Wahrscheinlichkeit 60 s hängen lässt. Jede dieser fünf Zeilen
ist die direkte Übersetzung einer Primärquelle aus `nas §1`; zusammen machen sie Q1–Q6 zu Testfällen und
das Abnahmekriterium aus `A §7.3` überhaupt erst aussagekräftig. Als Nebeneffekt werden S5, S8, M2, M3
und M8 prüfbar statt nur behauptet.

### M6 — Die USB-Übergabe der Ereignisdatei erzeugt einen zweiten Schreibpfad auf denselben Dateinamen, bricht die Hash-Kette und macht die Offsetbuchhaltung dauerhaft falsch

**Angegriffene Entscheidung:** `A §3.7`, letzter Punkt: „Ein Meldekopf ohne NAS-Zugang … kann seine
Ereignisdatei per USB-Stick übergeben; sie wird in `ereignisse/` kopiert und ist ab dann normal Teil des
Folds." Dazu `A §3.3` (`eigenerUploadOffset` in `uebertragung.json`) und die Invariante „**EIN**
Schreiber" je Datei (`A §2.2`, `nas §10 Begründung 1`).

**Warum das nicht trägt.** Nach der Kopie existiert `c-44d0a3-meldekopf1.000001.jsonl` auf dem Share,
ohne dass der Meldekopf-Client davon weiß: sein `eigenerUploadOffset` steht weiterhin auf 0. Bekommt
derselbe Client später Netz, spiegelt er ab Offset 0 — der Append landet am aktuellen Dateiende, also
**hinter** der bereits vorhandenen Kopie. Die Datei enthält den Inhalt danach zweimal. Fachlich rettet
Regel 9 (Idempotenz über `id`) den Zustand, aber:
(i) die Hash-Kette `vorher` validiert nicht mehr, weil die erste Zeile des zweiten Blocks auf einen
Vorgänger zeigt, der an anderer Stelle steht — `A §3.3` verkauft die Kette als Manipulationserkennung,
`A §3.11` als Revisionsfähigkeit; was ein Leser bei einem Kettenbruch tun soll, steht nirgends;
(ii) der `eigenerUploadOffset` bleibt für immer um die Kopie versetzt, so dass jeder weitere Anlauf den
Fehler wiederholt;
(iii) wird die Datei ein zweites Mal per Stick eingetragen (der realistische Fall „ich weiß nicht, ob das
schon drin war"), wächst sie erneut.
Zusätzlich ist die Kopie selbst ein Schreibvorgang auf eine Datei, deren einziger legitimer Schreiber
laut `A §2.2` der Worker des Meldekopfes ist — geschieht sie, während dieser Client gerade Netz bekommt,
ist es der Multi-Writer-Append-Fall, den Q3 ausschließt.

**Was den Vorschlag rettet.** (a) Übergabedateien bekommen einen eigenen Namensraum:
`ereignisse/c-44d0a3-meldekopf1.usb-<n>.jsonl`, erzeugt mit create-new; der Client selbst benutzt diesen
Namen nie. Der Fold sieht dieselben Ereignisse, dedupliziert per `id`, und die Ketten bleiben je Datei
intakt. (b) Der übergebende Client vermerkt die Übergabe lokal (`uebertragung.json`: `uebergeben[]`).
(c) `packages/cli` bekommt `akte uebernehmen <datei>`, das Prüfsummen und Kette validiert, den Zielnamen
vergibt und einen Übernahmevermerk als Ereignis schreibt — damit ist der Vorgang im ETB sichtbar, was er
als Ersatz der Google-Tabelle (`handbuch F-E5`, `N-1`) sein muss.

### M7 — Reihenfolgefelder haben keinen deterministischen Tie-Break; die angezeigte und gedruckte Reihenfolge kann zwischen Clients divergieren

**Angegriffene Entscheidung:** `A §3.4` (Katalog mit `AbschnittSortiert`, `EinheitPositionGesetzt`),
`A §3.5` (für sie gilt nur die Grundregel „feldweises LWW"), `A §4.1` (`Abschnitt.reihenfolge`),
`A §6.2` (Druckprodukt „in fester Reihenfolge").

**Warum das nicht trägt.** Setzen zwei Clients nebenläufig Reihenfolgewerte, gewinnt je Objekt der
spätere HLC — aber keine Regel verhindert, dass danach zwei Geschwister denselben Wert tragen. Bei
Gleichstand entscheidet die Iterationsreihenfolge der Map, also die Einfügereihenfolge, also der
Ausgangspunkt des Folds; nach einem Schnappschuss (B1) ist sie gar nicht mehr rekonstruierbar. Das ist
der Fall, den `ZDM §4.4 P1/P3` ausschließt, und er trifft ein Produkt, das ausgedruckt an der Lagekarte
hängt.

**Was den Vorschlag rettet.** (a) Sortierschlüssel ist stets das Paar `(reihenfolge, id)`; die `id` ist
global eindeutig und stabil, damit ist die Ordnung total und deterministisch — eine Zeile im Fold, die
normativ in `docs/KONZEPT-EREIGNISSE.md` gehört. (b) Alternativ Bruchzahlindizes (Fractional Indexing),
wenn Einfügen zwischen zwei Nachbarn ohne Umnummerierung gebraucht wird; der Tie-Break aus (a) gilt dann
zusätzlich.

### M8 — Der Lebenszyklus der Dateihandles über Verbindungsabbrüche hinweg ist nicht spezifiziert; „Timeout" ist keine Wiederherstellung

**Angegriffene Entscheidung:** `A §3.6` („je bekannter Datei `open` + `read` ab gemerktem Offset"),
`A §3.3` (Append + `fsync` je Ereignis), `A §9 A2` („alle Share-Operationen mit Timeout im Worker").

**Warum das nicht trägt.** Q6 (`nas §1.8`): Nach `SessTimeout` (60 s) setzt der Client die Verbindung
zurück; „For applications which doesn't retry on SMB connection reset, IO errors are seen." Ob der
Worker seine Handles über Poll-Zyklen offen hält (dann müssen sie nach jedem Reset neu geöffnet und die
Offsets gegen die Dateilänge validiert werden) oder je Zyklus neu öffnet (dann kostet jeder Zyklus je
Datei zusätzliche Roundtrips, siehe M1/M2), ist nirgends festgelegt — es ist aber die Entscheidung, die
den Kostenrahmen des gesamten Poll-Modells bestimmt und die M0 messen soll, ohne dass sie benannt wäre.
`nas §1.8` nennt zusätzlich Durable Handles (auf Synology ein Schalter), die das Verhalten verändern.

**Was den Vorschlag rettet.** In `docs/KONZEPT-SPEICHER.md` normativ: Handle-Strategie je Dateiklasse,
Wiederanlaufregel („bei jedem Fehler: schließen, neu öffnen, Offset gegen Dateilänge prüfen; bei
Verkürzung anhalten und warnen"), Obergrenze gleichzeitiger Handles (zusammen mit dem Semaphor aus S5),
und ein Testfall in der Simulation nach M5(v).

### M9 — Der Auffangabschnitt aus Fold-Regel 3 ist über einen Namen definiert, nicht über eine Id; in einem frei benennbaren Baum ist die Regel damit nicht immer ausführbar

**Angegriffene Entscheidung:** `A §3.5 Regel 3`: „Verschieben in einen aufgelösten Abschnitt → Einheit
landet im definierten Auffangabschnitt (**`Bereitstellung 1`**, ersatzweise FüSt) plus Hinweis."
Gegenläufig `A §4.2`: „Einsatzstelle … **frei benennbar**, beliebig viele".

**Warum das nicht trägt.** Ein Fold darf nur auf Ids und Werten entscheiden. Existiert kein Abschnitt mit
diesem Namen (jederzeit möglich, `AbschnittUmbenannt` steht im Katalog), ist die Regel undefiniert;
existieren zwei, ist sie mehrdeutig. Die Ausweichregel „ersatzweise FüSt" hat dasselbe Problem. Das ist
eine der Stellen, die `nas §10 Restrisiko 1` meint („stille Falschzustände"), und sie verletzt
`ZDM §4.4 P5` (kein Waisenzustand), sobald sie ins Leere greift.

**Was den Vorschlag rettet.** `Einsatz.auffangAbschnittId` als Pflichtfeld, gesetzt von `EinsatzAngelegt`,
änderbar per `EinsatzStammdatenGeaendert`; `AbschnittAufgeloest` auf den Auffangabschnitt ist per
Validierung verboten. Fold-Regel 3 verweist ausschließlich auf diese Id.

---

## 6. Geringe Befunde

- **G1 — Das Undo-Zeitfenster führt die gerade gestrichene TTL wieder ein.** `A §3.5 Regel 8`: Undo „darf
  nur eigene Ereignisse **der letzten n Minuten** betreffen", während `A §3.8` alle TTL-Mechanismen
  „ersatzlos" streicht, weil sie über SMB und mit unsicheren Uhren nicht definierbar seien. Das Fenster
  misst auf derselben Uhr, deren Verlässlichkeit der Vorschlag bestreitet, und trifft den offline
  arbeitenden Meldekopf (`A §3.7`), der nach Stunden zurückkommt. `ZDM §4.3 U3` definiert Undo ohne
  Zeitbezug („das letzte **eigene** Ereignis dieses Clients, das nicht bereits kompensiert wurde"), `U2`
  typabhängig. *Rettung:* Regel 8 durch `ZDM U2/U3` ersetzen, kein Zeitfenster.
- **G2 — Zwei Quellen für Einsatzstammdaten.** `A §3.3`: `einsatz.s1control` trägt „einsatzId, **Name**,
  Anlagedatum, formatVersion. **Unveränderlich** (create-new)"; der Katalog enthält
  `EinsatzStammdatenGeaendert`. Nach einer Umbenennung zeigen Bündel-Kopf, Ordnername und Fold
  Verschiedenes — dieselbe Zwei-Wahrheiten-Klasse wie S3. *Rettung:* Der Bündel-Kopf trägt nur
  `einsatzId` und `formatVersion`; jeder Anzeigename kommt aus dem Fold.
- **G3 — `ablage.json` ist unveränderlich, muss aber erhöht werden können.** `A §3.3` erzeugt sie mit
  create-new; `A §9 A8` nutzt eine „Mindestversion im `ablage.json`" als Schutz gegen alte Clients. Wie
  diese Zahl steigt, ohne die Datei zu überschreiben (M3), ist offen. *Rettung:*
  `ablage/mindestversion-<n>.json` mit create-new, Leser nehmen das Maximum.
- **G4 — Konflikthinweise ohne stabile Id.** `A §3.4` führt `KonflikthinweisQuittiert` als Ereignis, aber
  `A §3.5` erzeugt Hinweise als abgeleitete Objekte ohne Id. Eine Quittierung braucht einen Bezug, der
  auf jedem Client gleich ist. *Rettung:* Hinweis-Id deterministisch aus den beteiligten Ereignis-Ids und
  dem Regelnamen ableiten (dann ist sie auch nach einem Neu-Fold identisch) und in die kanonische
  Zustandsform (M4) aufnehmen.
- **G5 — Monitorfenster auf einem Einzelbildschirm ist nicht schließbar.** `A §2.3` übernimmt aus
  `strength-display.ts:144-148` „Zielmonitor = erster Nicht-Primärmonitor, **sonst Primär**" zusammen mit
  `frame:false, movable:false, minimizable:false` (`:160-166`) und `backgroundColor:'#000000'` (`:168`),
  streicht aber Prewarm, Splash und Diagnose-Flag. Auf einem Meldekopf-Laptop ohne zweiten Bildschirm
  entsteht eine schwarze, rahmenlose, unverschiebbare Fläche über dem Arbeitsfenster. *Rettung:* Bei nur
  einem Display entweder nicht öffnen (Hinweis „kein zweiter Bildschirm erkannt") oder gerahmt und
  beweglich; in jedem Fall `Esc`/Menüpunkt „Monitor schließen" verbindlich.
- **G6 — Formatdetails mit Datenwirkung.** `A §3.3` legt `<len>\t<crc32>\t<json>\n` fest, ohne zu sagen,
  ob `len` Bytes oder Zeichen zählt und ob das Zeilenende mitzählt; ein Leser mit anderer Deutung
  schneidet gültige Zeilen ab. Ebenso offen: „Feld leeren" vs. „Feld nicht angefasst" bei partiellen
  Feldkarten (S4). *Rettung:* `len` = Bytes des JSON in UTF-8 ohne Zeilenende, mit Testvektor
  (Umlaute, Emoji) in `docs/KONZEPT-SPEICHER.md`.
- **G7 — Der spezifizierte Tie-Break ist wirkungslos.** `A §3.5`: „Sortierung: `hlc` aufsteigend,
  Tie-Break `clientId`, dann laufende Nummer." Da `clientId` laut `A §3.3` bereits der dritte Bestandteil
  des `hlc`-Strings ist, kann ein Gleichstand des vollständigen `hlc` nur innerhalb desselben Clients
  auftreten; der `clientId`-Tie-Break greift nie. Harmlos in der Wirkung, aber ein Indiz dafür, dass die
  Ordnungsdefinition nicht durchgerechnet wurde — was S7 bestätigt. *Rettung:* Ordnung als Tripel
  spezifizieren (S7 (b)); Tie-Break ist dann `(physisch, logisch, clientId, laufnummer)`.

---

## 7. Entlastungen und Belastungen durch die realen Betriebsparameter

`betrieb` (Auskunft Johannes, 2026-09-07) war den Vorschlägen nicht bekannt. Wirkung auf die Befunde
dieser Widerlegung:

### 7.1 Entlastungen

| Parameter | Wirkung auf Vorschlag A |
|---|---|
| **Keine Altdaten** (keine produktiven `.s1control`, keine `.sqlite`, keine gefüllten Excel-Mappen) | Größte Entlastung. `A §3.9` (v1-Migration), `A §3.10` (Excel-Einsatzdatenimport), Risiko `A11` (`exceljs` liest `.xlsm`) und `A §10 Punkt 8` entfallen bis auf den Kopiervorlagen-Katalog (`F-J1`), der ohnehin gebraucht wird. Technisch wichtiger als der Zeitgewinn: Die Ereignisse `EinsatzAusV1Uebernommen` / `EinsatzAusExcelUebernommen` sollten als „Startschnappschuss … vollständiger Zustand als Nutzlast" (`A §3.9 Schritt 1–2`) wirken — das ist **B1 in Ereignisform**: ein Zustandsblob ohne Gewinner-HLC je Feld, der als HLC-kleinstes Ereignis vor allem anderen liegt und mit dem der Fold dieselbe Vergleichsgröße verliert. Mit dem Wegfall verschwindet diese Fehlerquelle ersatzlos. |
| **NTP im Einsatznetz vorhanden** | Entlastet **S1** deutlich: Uhrabweichungen zwischen den vernetzten Rechnern sind die Ausnahme, die senderseitige Kappung ist billig und risikoarm nachzurüsten. Entlastet **S7 nicht**: Der Meldekopf am Ortseingang arbeitet laut `A §3.7` ohne NAS und damit typischerweise ohne Netz und ohne NTP — genau der Rechner, dessen Uhr beim Kaltstart in der Vergangenheit stehen kann. |
| **1 bis 5 gleichzeitige Rechner** | Entlastet die zweite Wirkung von **M1** (Poll-Fächer), die Präsenzliste, die Unicast-Peer-Liste und die Schnappschuss-Häufigkeit. Macht **B1-Variante (b)** (Watermark über alle bekannten Clients) rechnerisch fast praktikabel — aber weiterhin nicht anwendbar, weil ein unbegrenzt lange offline arbeitender Meldekopf keine untere Schranke liefert. Es bleibt bei (a) Gewinner-HLC im Schnappschuss oder (c) Schnappschuss als reiner Lesecache. |
| **Synology (SMB)** | Beantwortet `A §10 Punkt 1` teilweise und macht die offenen Punkte konkret benennbar: `nas §1.8` nennt für DSM die Schalter „SMB durable handles", „Enable Opportunistic Locking"/„SMB2 lease" und den Umstand, dass Oplocking bei aktivierter Transportverschlüsselung deaktiviert wird. Damit ist **M2** in M0 gezielt messbar statt allgemein „NAS-Verhalten". |
| **SQLite scheiterte an Langsamkeit, nicht an Korruption** | Bestätigt den Ausschluss von Option A und stützt die Grundentscheidung. Enthält aber eine Warnung für das neue Modell: Wenn SMB-Roundtrips auf dieser Installation teuer genug waren, um SQLite unbenutzbar zu machen, ist der **Dauerpreis** des Poll-Zyklus (M1/M2/M8) der eigentliche Risikoposten — nicht der Einzel-Append. Das Abbruchkriterium in `A §8 M0` („> 300 ms je Ereignis") misst die falsche Größe allein; es muss um „Gesamtkosten eines Poll-Zyklus bei N Segmenten und 5 Präsenzdateien" ergänzt werden. |
| **Windows 11 als Client-OS** | Für Vorschlag A technisch folgenlos (Electron bringt Chromium mit). |

### 7.2 Belastungen

**BP1 — Keine Admin-Rechte hebt S6 vom Sonderfall zum Regelfall.** Ohne Adminrechte ist die
Portable-EXE (`A §2.5`: „ohne Installation und ohne Adminrechte von einem USB-Stick oder direkt vom
Share") der naheliegende Verteilweg für Meldeköpfe auf fremden Rechnern — der Vorschlag bewirbt ihn
ausdrücklich als „schnellsten Weg in den Betrieb". Damit ist das gleichzeitige Laufen von installierter
und portabler Fassung mit gemeinsamem `userData`, gemeinsamer `clientId` und gemeinsamer Ereignisdatei
kein Randfall mehr. Die Auflage aus S6 (Single-Instance-Sperre plus eigenes `userData` für die
Portable-Fassung) wird dadurch von „empfohlen" zu „vor dem ersten Mehrclient-Betrieb zwingend".

**BP2 — Per-User-Installation bindet die Client-Identität an das Benutzerprofil, nicht an den Rechner.**
`A §3.3` legt Client-Identität und lokale Ablage unter `app.getPath('userData')` = `%APPDATA%` ab.
Bei per-user-Installation ohne Adminrechte ist das die Regel. Zwei Folgen: (i) Ein Benutzerwechsel auf
demselben Rechner (Schichtwechsel) erzeugt eine neue `clientId` und damit neue Segmente und neue
Präsenzdateien — verstärkt M1. (ii) Wandert `%APPDATA%` als Roaming-Profil auf einen zweiten Rechner,
tragen **zwei Rechner dieselbe `clientId`** — exakt der Fall aus `A §9 A7` / `nas §10 Restrisiko 4`,
und A7s automatische Reaktion („neue Dateigeneration beginnen") wird dabei wechselseitig ausgelöst.
`betrieb` sagt zu Roaming-Profilen nichts. *Auflage:* offene Frage an Johannes; unabhängig davon
`clientId` = Zufalls-Id **plus Hostname**, und beim Start prüfen, ob der gespeicherte Hostname zum
laufenden Rechner passt — passt er nicht, wird eine **neue** Identität vergeben statt weitergeschrieben.

**BP3 — „macOS/Linux berücksichtigen" macht die Latenzkonstanten plattformabhängig.** Die Aussagen aus
`A §3.6` (2 s Poll, „bis zu 10 s") stammen ausschließlich aus dem Windows-Redirector (Q1). `nas §1.6`
belegt für Linux-CIFS `cache=strict` als Vorgabe mit `actimeo=1` (also *besser*), `nas §1.7` für macOS
ein standardmäßig aktives Verzeichnis-Enumerations-Caching, das nur per `/etc/nsmb.conf` und Neu-Mount
abschaltbar ist — also durch die App **nicht** beeinflussbar, mit dem von Apple selbst beschriebenen
Symptom „shows only a partial list of the contents of a share or folder for a few seconds". Da die
Entwicklung auf macOS stattfindet, wird die Sichtbarkeitslatenz dort anders gemessen als sie im Betrieb
auf Windows ist — in beide Richtungen eine Fehlerquelle. *Auflage:* M0 misst auf allen drei Systemen;
das Poll-Intervall wird nicht als Konstante, sondern als adaptiver Wert festgelegt (Backoff bei
Leerläufen, Sofortlesen nach UDP-Hinweis), und `docs/BETRIEB.md` nennt die macOS-Einstellung.

**BP4 — Windows 11 entwertet die zentrale Entlastung der Installergrößen-Argumentation.** `A §1.5` und
`A §2.5` stützen sich darauf, dass ein offline-taugliches Tauri-Paket `fixedRuntime` (~180 MB) oder
`offlineInstaller` (~127 MB) mitliefern müsse und deshalb **über** dem 102-MB-Electron-Installer liege
(„Der Größenvorteil von Tauri existiert genau in dem Szenario nicht, das S1 braucht"). `betrieb` sagt:
Windows 11, und dort ist die WebView2-Evergreen-Laufzeit vorinstalliert. Damit ist die Prämisse für die
Zielrechner falsch, und der Vergleich lautet wieder 102 MB gegen ~10–20 MB. Das berührt die technische
Korrektheit des Speichermodells nicht, entzieht dem Vorschlag aber eines seiner drei Hauptargumente
gegen die Alternative. Für die Auswahlentscheidung gehört das in die Lieferbarkeits-/Stack-Linse; hier
wird es nur als widerlegte Behauptung festgehalten. *Rettung des Arguments:* Der Rest von `A §1.5/§1.6`
(kein Sprachwechsel, `printToPDF`, erprobte Mehrfenster-Logik, erhaltene E2E-Suite, gemessene CI-Zeit)
trägt ohne diese Zeile weiter; die Zeile selbst ist zu streichen oder auf „macOS/Linux und ältere
Windows-Stände" einzuschränken.

---

## 8. Angriffe, die NICHT durchgehen (geprüft und verworfen)

Diese Einwände liegen nahe, halten aber der Prüfung gegen `nas §1` bzw. gegen den Wortlaut des
Vorschlags nicht stand. Sie werden hier festgehalten, damit die Synthese sie nicht erneut aufwirft.

1. **„`fsync` über SMB ist wirkungslos, der Client puffert ohnehin."** Falsch. Q5 (`nas §1.9`,
   [MS-SMB2] SMB2 FLUSH): definierte Semantik — Client-Cache leeren *und* Server-Flush, blockierend bis
   zum Abschluss. `A §3.3` verlangt `fsync` je Ereignis; das ist die richtige Antwort auf Q2. Der Befund
   liegt an anderer Stelle: die *Kosten* der Serie (S8) und die *Gruppierbarkeit*, nicht die Wirkung.
2. **„Append-only auf SMB ist rennbehaftet (Q3)."** Q3 verbietet **Multi-Writer**-Append. `A §2.2`/`§3.3`
   halten die Ein-Schreiber-Invariante konsequent durch; das ist die tragende Konstruktion und sie ist
   korrekt. Angreifbar sind nur die **Verletzungen** dieser Invariante (S6: zwei Instanzen auf einem
   Rechner; M6: USB-Kopie), nicht die Invariante selbst.
3. **„Ohne netzweites Lock kann Archivierung nicht atomar sein."** Nein — `create-new` (SMB2 CREATE mit
   `FILE_CREATE`) entscheidet der Server, `nas §1.4`/`§1.11`. Das Problem von S3 ist nicht die Atomarität
   des Markers, sondern die doppelte Wahrheit, die Unumkehrbarkeit und der Ordner-Rename.
4. **„Für 300 Einheiten braucht es eine Datenbank."** Widerlegt durch `nas §6` („In-Memory-Struktur des
   Folds + Indizes reicht für <5.000 Einheiten problemlos") und durch `betrieb` (Zielgröße 100–300).
   `A §3.5` argumentiert an dieser Stelle korrekt und lässt `node:sqlite` als spätere Ausbaustufe offen,
   ohne davon abzuhängen.
5. **„Electron kann kein zuverlässiges Timeout auf Datei-I/O."** Der Einwand stimmt (S5), aber er spricht
   nicht gegen Electron: `std::fs`/`spawn_blocking` in Rust sind ebenfalls nicht abbrechbar. Der Befund
   trifft die *Gegenmaßnahme* `A §9 A2`, nicht die Stackwahl — und die Reparatur (Kindprozess statt
   Worker-Thread) ist in beiden Stacks dieselbe.
6. **„Das Erzeugen des Druck-PDF blockiert den Fold."** Bereits adressiert: `A §6.2` legt fest, dass die
   Ausgabeerzeugung „im Main-Prozess außerhalb des Worker-Threads" läuft, „damit ein 40-seitiges PDF
   weder den Fold noch die Eingabe blockiert". Rest-Risiko ist nur der geteilte libuv-Threadpool (S5).
7. **„Polling alle 2 s bei 5 Clients ist zu teuer."** Bei 5 Clients und **wenigen** Segmenten unkritisch.
   Der Befund liegt in der Zahl der Segmente (M1) und im Handle-Verhalten (M2/M8), nicht in der
   Client-Zahl.
8. **„Auto-Update ohne Internet ist nicht lösbar."** `A §2.6 Kanal 2` (Update-Ablage auf dem Share, ~150
   Zeilen) löst es mit dem Medium, das ohnehin da ist, inklusive `sha256`-Prüfung nach dem Kopieren; der
   Wegfall des LAN-Peer-Updaters ist durch `main §9 R-UPD-1` gedeckt. Angreifbar bleibt nur das
   Überschreiben von `aktuell.json` (M3) und die offene Frage „Ausführung von Netzlaufwerken erlaubt?"
   (`A §10 Punkt 2`, von `betrieb` nicht beantwortet) — beides adressiert `A §9 A10` im Grundsatz mit
   „erst lokal kopieren, dann ausführen".
9. **„UDP-Broadcast ist unzuverlässig, damit fällt die Sichtbarkeitszusage."** `A §3.6`/`§9 A13` behandeln
   UDP korrekt als Beschleuniger mit Polling als Grundlage und ergänzen Unicast an die Peers aus
   `praesenz/` — genau die Konsequenz aus Q9. Kein eigener Befund.
10. **„Der Renderer-Umbau gefährdet die Datenkorrektheit."** Kein technischer Korrektheitsbefund: Der
    Fachzustand liegt im Worker, der Renderer bekommt Deltas und hat keinen Schreibweg außer Intents
    (`A §2.2`). Das ist ein Lieferbarkeits-, kein Korrektheitsthema.

---

## 9. Auflagen und Verdikt

### 9.1 Befundübersicht

| Nr. | Kurzfassung | Schwere |
|---|---|---|
| B1 | Schnappschüsse ohne Gewinner-HLC je Feld sind mit nachrückenden älteren Ereignissen nicht komponierbar → zwei Clients, gleiche Ereignismenge, verschiedener Zustand | Blocker |
| S7 | HLC-Text ist nur bei 13-stelliger Millisekundenzahl lexikografisch sortierbar; Uhr in der Vergangenheit gewinnt dauerhaft jedes LWW-Feld | schwer |
| S1 | Delta-Grenze nur empfangsseitig; Rechner mit vorgehender Uhr dominiert LWW bis zum Einholen | schwer |
| S2 | Absolutes Stärkesetzen verletzt die Summenerhaltung beim nebenläufigen Aufteilen (`ZDM P4`) | schwer |
| S3 | Archivierung: doppelte Wahrheit (Marker + Ereignis), unumkehrbar, Ordner-Rename nicht rennfrei | schwer |
| S4 | `vorher`/`basis` nur bei der Stärke; alle übrigen Felder verlieren still, Sperren ersatzlos gestrichen | schwer |
| S5 | „Alle Share-Operationen mit Timeout im Worker" ist mit `node:fs` nicht implementierbar; libuv-Pool ist prozessweit | schwer |
| S6 | Zwei Instanzen auf einem Rechner teilen `userData`, `clientId` und Ereignisdatei (durch fehlende Adminrechte zum Regelfall geworden) | schwer |
| S8 | Ein Worker trägt Kommandopfad und Share-I/O; Offline-Versprechen gilt nur bei „Share weg", nicht bei „Share hängt" | schwer |
| M1 | Segmentrotation je App-Start = Dateierzeugung als Benachrichtigung (Q1-Anti-Muster); Poll wächst mit Segmenten; Hash-Kette endet je Segment | mittel |
| M2 | „Daten-Reads umgehen den Attributcache" unbelegt und tragend; kein Rückfall benannt | mittel |
| M3 | Drei überschriebene Dateien auf dem Share (Präsenz, `monitor.html`, `aktuell.json`); Q4 und Teil-Lesungen; „Leitclient" undefiniert | mittel |
| M4 | Keine kanonische Serialisierung → Schnappschuss-Hash/Goldfiles/A9 ordnungsabhängig; Eigenschaft 1 prüft es weg | mittel |
| M5 | Mehrclient-Simulation auf lokalem Dateisystem kann Q1–Q6 nicht verletzen; zentrale Qualitätszusage unbelegt | mittel |
| M6 | USB-Übergabe erzeugt zweiten Schreibpfad auf denselben Namen, bricht Kette, verfälscht Offsets | mittel |
| M7 | Reihenfolgefelder ohne deterministischen Tie-Break | mittel |
| M8 | Handle-Lebenszyklus und Wiederanlauf nach `SessTimeout` nicht spezifiziert | mittel |
| M9 | Auffangabschnitt über Namen statt Id | mittel |
| G1–G7 | Undo-Zeitfenster, zwei Stammdatenquellen, `ablage.json` unveränderlich, Hinweis-Ids, Monitorfenster auf Einzelbildschirm, `len`-Semantik, wirkungsloser Tie-Break | gering |
| BP1–BP4 | Betriebsparameter: Portable-Weg erzwingt Single-Instance; `clientId` am Benutzerprofil; plattformabhängige Latenz; Installergrößen-Argument entwertet | siehe §7.2 |

### 9.2 Auflagen, nach Zeitpunkt

**Vor M1, als Änderung der Spezifikation (`docs/KONZEPT-EREIGNISSE.md` / `KONZEPT-SPEICHER.md`) — kein
Code, überwiegend Textarbeit:**
1. Schnappschussformat: Gewinner-HLC je Feld **oder** Schnappschuss als verwerfbarer Lesecache (B1 a/c),
   plus Schema-/Typliste im Schnappschuss und Verwerfen bei unbekannten Typen.
2. HLC-Ordnung als geparstes Tripel mit fester Textbreite und Plausibilitätsuntergrenze (S7).
3. Senderseitige Delta-Kappung plus Konflikthinweis bei `wand`/`hlc`-Inversion (S1).
4. `vorher` bei **jedem** feldsetzenden Ereignis, Konflikthinweis bei Abweichung, explizites `null`
   statt `undefined` (S4, G6).
5. `EinheitGeteilt`/`EinheitZusammengefuehrt` mit relativer Semantik als je ein Ereignis (S2).
6. Archivierung ohne Markerdatei, mit `EinsatzWiedereroeffnet` und Nachtragsbereich (S3 a/b).
7. Kanonische Serialisierung als Definition von „gleicher Zustand" (M4).
8. Totale Ordnung `(reihenfolge, id)` (M7); `auffangAbschnittId` als Pflichtfeld (M9).
9. Kleinkram mit Datenwirkung: G1–G7.

**In M0, als Erweiterung von Inhalt und DoD:**
10. Share-I/O in einen **Kindprozess**; `UV_THREADPOOL_SIZE` gesetzt; Semaphor auf gleichzeitige
    Share-Operationen; Messfall „NAS während des Betriebs trennen, Main-I/O beobachten" (S5).
11. Trennung von Quittierungspfad und Spiegelpfad nachweisen: „Share einfrieren, Eingabe muss weiter
    quittiert werden"; Serie von 200 Ereignissen; gruppiertes `fsync` auf dem Share (S8).
12. Zwei Messreihen zur Handle-Frage (Handle offen vs. je Zyklus neu), auf Windows **und** macOS,
    mit protokollierter Synology-Konfiguration und `Get-SmbConnection` (M2, M8, BP3).
13. „Feindliche Dateisystem"-Schicht in der Simulation, die Q1, Q4 und Q6 nachbildet (M5) — die
    billigste und wirksamste Einzelmaßnahme der ganzen Liste.
14. Entscheidung zur Segmentrotation aus der Messung ableiten, Vorgabe „nur nach Größe" (M1).
15. Abbruchkriterium ergänzen um „Gesamtkosten eines Poll-Zyklus bei N Segmenten" (§7.1, SQLite-Latenz).

**In M2 / M3 / M7:**
16. `app.requestSingleInstanceLock()` plus lokale Hoheitsdatei; eigenes `userData` für die
    Portable-Fassung; Hostname-Prüfung der `clientId` beim Start (S6, BP1, BP2).
17. Präsenz, Lagemonitor-HTML und Update-Manifest ohne Überschreiben auf dem Share (M3).
18. USB-Übergabe mit eigenem Namensraum und `akte uebernehmen` (M6).
19. Monitorfenster bei nur einem Display schließbar (G5).

**Änderungen an der Prüfstrategie `A §7.2` (sonst sind die Reparaturen nicht abgesichert):**
20. Eigenschaft 1 auf Byte-Gleichheit der kanonischen Form, **einschließlich** Hinweisen.
21. Eigenschaft 3 von „Präfix" auf „beliebige Teilmenge plus nachrückende ältere Ereignisse".
22. Eigenschaft 4 von „±3 h" auf „±30 Jahre".
23. Neue Eigenschaft: Summenerhaltung über Teilen/Zusammenführen (`ZDM P4`).
24. Neue Eigenschaft: „Keine Feldentscheidung wird länger als Δ von einem Client mit abweichender Uhr
    dominiert."

Aufwandsschätzung dieser Auflagen: Punkte 1–9 sind Spezifikationsarbeit innerhalb von M1 und kosten
dort kaum zusätzliche Zeit, weil `A §7.6` ohnehin „jedes Konzept vor dem Code" verlangt; die Punkte
10–15 erweitern M0 um schätzungsweise **+0,5 PW**, die Punkte 16–19 verteilen sich mit **+0,5 PW** auf
M2/M3/M7, die Punkte 20–24 sind Änderungen an bereits geplanten Tests. Gesamt **+1,0 bis +1,5 PW** auf
die veranschlagten 16–24 PW — die Reparaturliste sprengt den Rahmen des Vorschlags nicht. [Annahme;
abgeleitet aus dem Zuschnitt der einzelnen Maßnahmen, keine Messung.]

### 9.3 Verdikt

**haelt-mit-auflagen.**

Begründung, warum nicht „faellt": Kein einziger Befund trifft die **Grundentscheidung** (`nas §10`
Option C→E statt `bmecat §9 R9`). Diese Entscheidung ist gegen die Primärquellen die einzige, bei der
keine der belegten SMB-Schwächen den Schreibpfad berührt (`nas §10 Begründung 1`, gestützt durch Q1–Q6),
und `A §3.2` führt sie mit der stärksten verfügbaren Begründung — der falsifizierten Prämisse von R9.
Alle Befunde treffen die **Ausgestaltung**: Schnappschussinhalt, Ordnungsdefinition, Ereignisformen,
Prozessschnitt, Testabdeckung. Jeder hat eine benannte, lokale Reparatur, die weder die Stackwahl noch
das Speichermodell noch den Meilensteinplan umwirft.

Begründung, warum nicht „haelt": B1 ist ein echter Blocker — der Vorschlag beschreibt einen Mechanismus,
der genau die Fehlerklasse wieder einführt, zu deren Beseitigung er existiert, und seine eigene
Property-Eigenschaft 3 ist so formuliert, dass sie den Defekt strukturell nicht finden kann. Dazu kommen
acht schwere Befunde, von denen vier (S1, S2, S4, S7) zu **stillen Falschzuständen** im laufenden
Einsatz führen und zwei (S5, S8) das zentrale Versprechen „kein blockierender I/O, offline arbeitet
weiter" an einer nicht betrachteten Stelle brechen.

**Harte Bedingung.** Die Auflagen 1–9 (Spezifikation) müssen **vor** dem ersten Code in `packages/kern`
abgeschlossen sein — sie ändern das Dateiformat und die Ereignisnutzlasten, sind also später teuer.
Die Auflagen 10–15 gehören in M0 und in dessen DoD; ohne Auflage 13 (feindliche Dateisystemschicht)
kann der Vorschlag seine eigene zentrale Qualitätszusage („in jedem CI-Lauf nachweisen, was v1 nicht
konnte") nicht führen, und die Prüfung bliebe an derselben Stelle blind wie in v1.

**Was das Verdikt kippen würde.** (i) Wenn die M0-Messung auf dem Synology-Share zeigt, dass ein Leser
Anhängungen anderer Clients nicht ohne Neu-Öffnen sieht **und** das Neu-Öffnen je Zyklus und Datei den
Poll-Zyklus über das SLO treibt (M2 + M8 + M1 gemeinsam), fällt das Sichtbarkeitsmodell — dann wäre eine
Änderungsbenachrichtigung mit Zustellgarantie nötig, die es ohne Serverprozess nicht gibt, und die
Randbedingung „kein Serverprozess" müsste neu verhandelt werden. (ii) Wenn sich zeigt, dass die
`fsync`-Serie auf dem realen Share auch gruppiert über dem Abbruchkriterium liegt, ist nicht das
Ereignisprotokoll falsch, wohl aber die Zusage „lokal schreiben ist immer schnell" — dann muss die
Share-Spiegelung als ausdrücklich verzögerter Hintergrundvorgang mit sichtbarem Rückstand entworfen
werden, was die UI-Zusagen aus `A §3.6` verändert. Beides ist in M0 mit dem vorhandenen Abbruchkriterium
erkennbar, sofern es um Auflage 15 ergänzt wird.

---

Ende der Widerlegung (Linse technische Korrektheit).
