# Widerlegung Vorschlag A (Electron-Evolution) — Linse LIEFERBARKEIT UND BETRIEB

Key: widerlegung-vorschlag-a-electron-evolution-lieferbarkeit
Status: ABGESCHLOSSEN (Abschnitte 1–12 vollständig; Verdikt in §12)
Stand: 2026-09-08 (Abschnitte 8–12 nachgetragen, Betriebsparameter eingearbeitet)

Auftrag: widerlegen, dass ein KI-gestützter Einzelentwickler Vorschlag A **in der genannten Zeit (16–24 PW)** bis
Excel-Parität bringt und danach **im Einsatz betreibt**. Angriffsflächen: Velocity, Wartbarkeit über Jahre,
Abhängigkeit von jungen Werkzeugen, Build/CI/Signing/Verteilung an THW-Rechner ohne Admin-Rechte, Schulung,
Fehlerdiagnose im Einsatz ohne Entwickler vor Ort, Kopplung an erfassungsbogen.app, Realismus der Schätzung.
Maßstab: `historie` (= `analysis/s1-historie-qualitaet.md`) — was v1 wirklich gekostet hat.

Quellenkonvention wie im Vorschlag: `historie §8.1`, `nas §9`, `bmecat §9 R5`, `main §10`, `handbuch §7 F-L4`,
`kritik §3.6`, `nachlese-build §3.1`, `betriebsparameter` (= `design/betriebsparameter-johannes.md`),
`zieldatenmodell §4.2` (= `design/zieldatenmodell-feldabgleich.md`), `A §8` = der geprüfte Vorschlag.
Code als `Datei:Zeile`. Eigene Setzungen als [Annahme].

## Gliederung
1. Was ich NICHT angreife (damit der Rest Gewicht hat)
2. Der Maßstab: was v1 wirklich gekostet hat — und was daraus für 16–24 PW folgt
3. Die Schätzung im Einzelnen (F1, F2, F3, F8)
4. Verteilung und Update an THW-Rechner ohne Admin-Rechte (F4, F12)
5. Betrieb: Fehlerdiagnose im Einsatz ohne Entwickler vor Ort (F5, F14)
6. Schulung, Einführung, In-App-Hilfe (F7)
7. Kopplung an erfassungsbogen.app (F6)
8. Wartbarkeit über Jahre / junge Werkzeuge (F9)
9. Wo die Betriebsparameter den Vorschlag entlasten
10. Wo die Betriebsparameter den Vorschlag belasten (F4, F10, F11, F13, F15)
11. Findings, sortiert nach Schwere
12. Verdikt und Auflagen

---

## 1. Was ich NICHT angreife

Vorab, damit die Findings nicht als Pauschalkritik gelesen werden. Folgende naheliegende Angriffe habe ich geprüft
und **verworfen**, weil der Vorschlag sie bereits sauber adressiert:

- **„CRDT-Bibliothek (automerge/loro/yrs) wurde nie geprüft."** Falsch als Vorwurf: `nas §9` bewertet Option D
  ausdrücklich („Ergänzung möglich, nicht nötig", Komplexität `−` gegenüber `o` bei C), und `A §3.1` wählt C→E unter
  Berufung auf genau diese Matrix. Kein Finding.
- **„Der Renderer wird als kostenlos übernehmbar angesetzt."** Falsch: `A §1.3`, `§1.6` und Risiko `A6` benennen
  ausdrücklich das Gegenteil und zitieren `kritik §3.6 Punkt 7`. Kein Finding.
- **„Zwei-Instanzen-E2E mit Playwright geht nicht."** Geht (`_electron.launch()` mehrfach). Kein Finding.
- **„Native Module bleiben ein Klotz."** Der Vorschlag streicht `better-sqlite3`/`drizzle`/`rebuild:native`
  vollständig (`A §2.4`); `historie §6` bestätigt, dass beides seit 31.05. ungenutzt mitgeschleppt wird. Das ist ein
  echter, belegter Gewinn. Kein Finding.
- **„Der Speicherentwurf ist nicht begründet."** `A §3.2 (a)–(g)` führt den Widerspruch bmecat R9 vs. nas §10 Punkt
  für Punkt auf, mit der Laufzeitreproduktion als Falsifikator. Das ist die sauberste Passage des Dokuments.
  Kein Finding (mit einer Ausnahme zum Hot Path, siehe F10 — die gehört aber primär in die Speicher-Linse).
- **„Portable-EXE gibt es nicht."** Doch: `package.json:26` `build:win:portable`. Kein Finding.

Was bleibt, ist die Lieferseite. Dort ist der Vorschlag deutlich schwächer als auf der Architekturseite.

---

## 2. Der Maßstab: was v1 wirklich gekostet hat

### 2.1 Die harte Zahl, die der Vorschlag nicht nennt

`git log --format='%ad' --date=short | sort -u | wc -l` in `/Users/johannes/Developer/S1-Control` → **21**.
Tagesverteilung (`sort | uniq -c`):

```
2026-02-24  1     2026-03-03   8     2026-03-21   7     2026-06-02   2
2026-02-25 45     2026-03-04   3     2026-05-31   4     2026-06-03   7
2026-02-26 36     2026-03-05  24     2026-06-01  10     2026-06-04   5
2026-02-27  8     2026-03-06   3                        2026-06-05   1
2026-02-28  4     2026-03-07  14                        2026-06-07   6
2026-03-01  2     2026-03-08   5
2026-03-02 11
```

v1 ist also in **21 Commit-Tagen über 104 Kalendertage** entstanden (24.02.–07.06.2026). Das sind rund
**4,2 Personenwochen Arbeitszeit bei 20 % Auslastung**. Zwei Lücken dominieren: 08.03. → 21.03. (13 Tage) und
21.03. → 31.05. (**71 Tage**). Bei einem Entwickler, der an einem Tag 45 Commits absetzt, sind stille Arbeitstage
ohne Commit unwahrscheinlich; die Zahl unterschätzt die Arbeitszeit also allenfalls leicht
[Annahme: Commit-Tage ≈ Arbeitstage].

Daraus folgt die einzige Umrechnung, die für ein Ehrenamtsprojekt zählt:
**1 PW (5 Arbeitstage) ≈ 25 Kalendertage ≈ 3,5 Kalenderwochen** — gemessen, nicht geschätzt.
`A §8` setzt „1 PW ≈ 2–4 Kalenderwochen [Annahme]" an; die Messung liegt am oberen Rand dieser Spanne.

### 2.2 Was v1 in diesen 4,2 PW geliefert hat

- Umfang: +70.488/−20.827 Zeilen in 206 Commits (`historie §1c`); heute 11.040 Zeilen Main+Shared, 10.097 Renderer,
  4.798 Testzeilen (`historie §3`).
- Fachlicher Deckungsgrad: **rund die Hälfte der Excel-Felder** (`kritik §3.1`, Schlusssatz: „Das v2-Datenmodell kann
  nicht 'v1 + Persistenz' sein").
- Qualitätszustand: Typecheck-Gate faktisch ein No-op, 42 + 91 Typfehler, 15 Lint-Verstöße, ein flaky Test, null
  Renderer-Komponententests, E2E nicht in CI (`historie §4`, `§5`).
- Mehrbenutzerbetrieb: **nicht funktionsfähig** (Lost Update zur Laufzeit reproduziert, `kritik §3.4`).

### 2.3 Wohin die Zeit floss — und was das für die neue Planung heißt

`historie §3` und `§8.1`, in Commit-Anteilen:

| Thema | Commits | Anteil | Code heute |
|---|---:|---:|---|
| Updater / Peer-Update / Release-CI / Signing | 50 | **24 %** | 2.225 Servicezeilen (33 % aller Services) + 2.985 Testzeilen (62 % aller Tests) |
| Datenhaltung / Sync / Locking / SMB / JSON-Migration | 40 | 19 % | |
| Tests / CI / Lint / Coverage | 23 | 11 % | |
| Fachfeatures/UI | 58 | 28 % | |
| Refactoring + Performance | 22 | 10 % | |

`historie §3` fasst zusammen: **„Rund 45 % der Commits und über die Hälfte des Test-Codes betreffen Infrastruktur
(Updater, Release, Sync, Locking, Datenhaltung), nicht die Fachdomäne."**

Das ist der Maßstab, an dem `A §8` zu messen ist. Die Meilensteinliste bepreist Fachschnitte großzügig
(M3–M5: 6,5–9,5 PW) und packt den gesamten Infrastrukturblock, der in v1 45 % verschlungen hat, in **einen
Halbsatz von M2**: „CI-Umbau" (`A §8 M2`, 2,0–3,0 PW zusammen mit Workspace-Umbau, dünnem Main, Worker-Thread mit
Protokoll, IPC-Kontrakt, Preload je Fenster, Renderer-Grundgerüst mit Store, zwei Fenstern, Einstellungen, Logging
und Fehlerbildern). Details in F3.

---

## 3. Die Schätzung im Einzelnen

### 3.1 F1 — Die Schätzung ist in einer Einheit ausgedrückt, die das Lieferdatum verbirgt

**Angegriffene Entscheidung:** `A §8 Summe`: „**Gesamtspanne: 16–24 Personenwochen bis Excel-Parität**", und
`A §8 Frühester Nutzen`: „Nach M3+M4 (ca. 8–12 PW) ist das Werkzeug für den Regelfall … bereits besser als die
Excel". Die Kalenderumrechnung steht nur als Klammerbemerkung im Kopf des Abschnitts („1 PW erfahrungsgemäß
2–4 Kalenderwochen [Annahme]") und wird auf keine der Zahlen angewendet.

**Beleg:** Mit dem im Repo gemessenen Rhythmus (§2.1, 3,5 Kalenderwochen je PW):

| | PW | Kalenderwochen (2 KW/PW, optimistisch) | Kalenderwochen (3,5 KW/PW, gemessen) |
|---|---:|---:|---:|
| M0 (Speicher-Spike, Abbruchkriterium) | 1,0–1,5 | 2–3 | 3,5–5 |
| bis M3+M4 („besser als Excel") | 8,0–12,0 | 16–24 (≈ 4–6 Monate) | 28–42 (≈ **7–10 Monate**) |
| bis Excel-Parität | 16,0–24,0 | 32–48 (≈ 7–11 Monate) | 56–84 (≈ **13–19 Monate**) |

Das ist keine Spitzfindigkeit, sondern die Entscheidungsgrundlage: Die Frage lautet „wann löst das Werkzeug die
Excel ab", nicht „wie viele konzentrierte Tage kostet es". Die Antwort ist unter der eigenen Annahme des
Vorschlags 7–11 Monate und unter der gemessenen Auslastung 13–19 Monate bis Parität. Der Vorschlag nennt diese
Zahl an keiner Stelle.

**Verschärfend:** `A §9 A3` („Ehrenamtlicher Einzelentwickler, 16–24 PW — Unterbrechungen über Monate,
Wissensverlust zwischen Sitzungen") behandelt die Unterbrechung als *Risiko*. Sie ist im selben Repository ein
*gemessenes Faktum*: 71 Tage Stillstand zwischen 21.03. und 31.05.2026 — und zwar genau an der Stelle, an der v1
Features hatte, aber die Persistenzfrage noch offen war. Das ist die strukturelle Entsprechung zum Übergang
M1→M2 der neuen Planung. Ein Risiko, das im Vorgängerprojekt eingetreten ist, gehört in die Basisplanung, nicht
in die Risikotabelle.

**Was den Vorschlag retten würde:** §8 um eine Kalenderspalte ergänzen, die aus der gemessenen Auslastung
(21 Commit-Tage / 104 Kalendertage) abgeleitet ist; das Datum „Excel-Parität frühestens" explizit nennen; und die
Umstiegsentscheidung nicht an Parität, sondern an M3+M4 hängen (was der Vorschlag im letzten Absatz von §8 schon
andeutet, aber nicht zur Planungsgrundlage macht).

---

### 3.2 F2 — „Erhalten bleibt der gesamte tragende Bestand — 190 Vitest-Tests" ist durch §5.3 desselben Dokuments falsifiziert

**Angegriffene Entscheidung:** `A §1.3` Zeile „Bestand, der weiterläuft: CI-Matrix, Signierung, Updater-Kern,
Playwright-BDD, **190 Vitest-Tests**, `printToPDF`" gegenüber Tauri „keiner davon"; `A §1.6`: „samt der
2.021–2.985 Testzeilen, die laut `historie §5` die Testsuite dominieren"; `A §8 Summe`: die Untergrenze werde
„dadurch begrenzt, dass Domänenmodell, Zeichen-Inferenz, STAN-Daten, Updater, CI und **Testinfrastruktur** bereits
existieren".

**Beleg — der Vorschlag streicht selbst den größten Teil dieser Tests:**

`A §2.6`: „**LAN-Peer-Update wird gestrichen.**"
`A §5.3 Nicht übernommen`: „… LAN-Peer-Update 919 Z., Debug-Log-Forwarding, Prewarm-Akrobatik) **sowie der gesamte
`json-store` samt `file-lock.ts`, `clients.ts`, `record-lock.ts`**."
`A §3.11`: die 5-Minuten-Vollkopie „entfällt ersatzlos".
`A §3.8`: Record-Locks „ersetzt durch weiche Anwesenheitsanzeige"; TTL-Mechanik „entfällt ersatzlos".

Gegengerechnet mit der Aufstellung in `historie §5` (Testzeilen je Datei):

| Testblock | Zeilen | Schicksal unter A |
|---|---:|---|
| Peer-Update (`update-peer-service-flow` 294, `-transfer` 193, `updater-peer-flow` 172, `-feed` 163, `-http-handler` 142, `update-peer` 91, `-offers` 91, `-protocol` 85, `-discovery` 57) | **1.288** | gestrichen (§2.6) — nur `update-peer-protocol` (85) wird als Wire-Test weiterverwendet (§5.3) |
| `einsatz-sync` 193, `record-lock` 120, `clients` 140, `backup` 112, `main-db-bridge` 147, `einsatz-files` 72, `einsatz-read-cache` 90 | **874** | überwiegend gegenstandslos: `record-lock`/`clients` (Modell entfällt), `backup` (Modell entfällt), `main-db-bridge`/`einsatz-read-cache` (bereits toter Code bzw. „Weglassen"), `einsatz-files` (neues Layout). Erhalten: der `/Volumes/…` vs. `Z:\…`-Teil von `einsatz-sync` |
| Fachlogik Main (`einsatz` 390, `command` 211, `export` 75, `behavior.*` 268) | **944** | als **Testideen** übernommen (§5.3), d. h. neu zu schreiben — der Gegenstand (json-store-Schreibpfade, IPC) existiert nicht mehr |
| `debug` 107 | 107 | Debug-Log-Forwarding wird weggelassen (§5.3) |
| Updater-Kern (`updater` 581, `app-version` 80, `startup-recovery` 72) | 733 | bleibt, aber §2.6 reduziert „den dreifachen GitHub-Fallback auf einen Pfad" → Teilumbau |
| STAN/Taktische Zeichen (263), `strength-display` (121), Renderer-Utils (151) | 535 | **echt übernehmbar** |

Realistisch wörtlich übernehmbar: rund **500–900 der 4.798 Testzeilen** (10–19 %). Wörtlich gestrichen:
mindestens 1.288 + rund 700 = **rund 2.000 Zeilen** (42 %). Der Rest ist Neuschreiben mit bekannter Testidee.

Die Aussage „190 Vitest-Tests bleiben unangetastet" (`A §1.1`) ist damit nicht haltbar; sie ist zugleich das
Argument, mit dem A gegen B punkten will (`A §1.3`, Zeile „Bestand, der weiterläuft"). Was tatsächlich bleibt und
gegenüber B einen echten Vorteil darstellt, ist etwas anderes und Kleineres: **die Werkzeugkette** (Vitest,
Playwright-BDD mit `_electron.launch()`, die zehn Gherkin-Dateien wörtlich, die CI-Matrix, die macOS-Signierkette,
`updater-versioning.ts`) — nicht der Testkorpus.

**Konsequenz für die Schätzung:** Die Untergrenze 16 PW steht ausdrücklich auf „Testinfrastruktur existiert
bereits". Wenn 42 % des Testkorpus gestrichen und weitere 20 % neu geschrieben werden, verschiebt sich die
Untergrenze. `A §7.1` fordert zusätzlich Neuland: ≥ 85 % Zeilenabdeckung in `kern`, sieben Property-Familien à
1.000 Läufe, Goldfiles je Ausgabeprodukt, Komponententests für „die 15 wichtigsten Komponenten" (heute: null,
`historie §5`) und eine Vierclient-Simulation. Das ist mehr Testarbeit als v1 insgesamt hatte, in einem Plan, der
den Testbestand als Ersparnis verbucht.

**Was den Vorschlag retten würde:** In `§1.3` die Zeile ehrlich auf „Werkzeugkette, CI-Matrix, Signierung,
BDD-Szenarien (Feature-Dateien), Updater-Versionsvergleich, ~500–900 Testzeilen" korrigieren; in `§8` einen eigenen
Posten „Testkorpus neu (Property, Simulation, Komponenten, Goldfiles)" mit 1,5–2,5 PW führen, statt ihn in M1–M4
zu verstecken.

---

### 3.3 F3 — M2 bündelt den Themenblock, der in v1 45 % der Commits gekostet hat, in einem Halbsatz

**Angegriffene Entscheidung:** `A §8 M2 – Schale und Gerüst · 2,0–3,0 PW`, Inhalt: „Workspace-Umbau, Main dünn,
Worker-Thread mit Protokoll, IPC-Kontrakt (`packages/kontrakt`), Preload je Fenster, Renderer-Grundgerüst mit
Store, zwei Fenster (Haupt + Monitor), Einstellungen, Logging, Fehlerbilder … **CI-Umbau**."

**Beleg 1 — historischer Aufwand desselben Themas.** `historie §3`: Updater/Peer/Release-CI/Signing = 50 Commits
(24 %), Tests/CI/Lint/Coverage = 23 Commits (11 %). `historie §2` (Churn): `.github/workflows/build-main.yml` 20×
geändert, `package.json` 25×, `updater.ts` 33×, `main.ts` 30×, `preload.ts` 23× („jeder neue IPC-Kanal =
Preload-Änderung"). `historie §7`: Tag-Format brauchte drei Anläufe an einem Tag; `ensure-update-metadata.cjs`
entstand aus fünf Fix-Commits an einem Tag. Das ist der empirische Preis von „CI-Umbau" in diesem Projekt.

**Beleg 2 — der neue CI-Umfang ist größer, nicht kleiner.** `A §7.5` fordert gegenüber heute zusätzlich:
`tsc -b` als echtes Gate (heute No-op, `historie §4.1`), Lint mit **0 Warnungen** (heute 15, `historie §4.2`),
Vitest über alle Workspace-Pakete inkl. Property- und Simulationsläufen, **E2E in CI auf ubuntu + windows**
(heute läuft E2E gar nicht in CI, `historie §5`), Job-Abhängigkeiten so, dass `build` ohne grünes `test` nicht
startet (heute nicht der Fall, `nachlese-build §3.2`: Lauf 27095343919 brach drei Builds ab, Windows lief 242 s
durch). Dazu die Coverage-Schwelle 85 % in `kern` (`A §7.1`) und die Import-Grenzen als Lint-Regeln (`A §5.2`).

**Beleg 3 — die CI-Zeitaussage stützt sich auf die alte Pipeline.** `A §1.6` führt „CI ist gemessen und günstig"
als Argument **gegen Tauri** ins Feld: Median 5:16 min (`nachlese-build §3.1`). Dieser Median stammt aus zehn
Läufen der **v1-Pipeline ohne E2E, ohne Property-Tests, ohne Simulation, mit No-op-Typecheck**. `A §7.5` schätzt
den Aufschlag mit „[Annahme: +30–60 s für Property-/Simulationstests, −20–40 s für den entfallenden
Native-Build]" — und lässt den größten neuen Posten, **E2E-Läufe auf zwei Betriebssystemen**, in der Rechnung
komplett weg. Für die E2E-Laufzeit existiert kein Messwert: `nachlese-build` kündigt in seiner Gliederung „§5
Playwright-BDD-Szenarien: Laufzeit `npm run test:e2e`" an, endet aber nach §3.3 — der Bericht ist an dieser Stelle
abgebrochen. Der Vergleich „Electron 5 min vs. Tauri 10–20 min" (`A §1.6`) stellt damit die *alte* Electron-Pipeline
der *geschätzten* Tauri-Pipeline gegenüber. Das ist kein Vergleich.

**Was den Vorschlag retten würde:** M2 in zwei Meilensteine trennen — „M2a Schale/Prozessmodell/Store" und
„M2b Pipeline (tsc -b, Lint-Gate, E2E in CI auf zwei OS, Simulationsjob, Job-Abhängigkeiten, Release-Trigger)" —
und M2b mit eigenen 1,5–2,5 PW bepreisen; die E2E-Laufzeit vor der Entscheidung einmal messen
(`npm run test:e2e` mit `time`), damit die CI-Aussage in §1.6 auf der v2-Pipeline steht.

---

### 3.4 F8 — M8 bepreist einen Fremdtermin als Arbeitspaket

**Angegriffene Entscheidung:** `A §8 M8 – Feldhärtung und Abnahme · 1,5–2,5 PW`, DoD: „**Ein vollständiger
Übungseinsatz wurde ohne Rückgriff auf die Excel geführt**"; Inhalt: „Übungslauf mit 3–4 echten Clients auf dem
echten NAS".

**Beleg:** Ein Übungseinsatz mit 3–4 besetzten Arbeitsplätzen der FüSt ist kein Entwicklertag, sondern ein Termin
mit mehreren Ehrenamtlichen, der Vorlauf, Dienstplanung und Gerät braucht. Die Personenwoche misst Johannes'
Arbeitszeit; das DoD hängt an der Verfügbarkeit anderer. `A §9 A5` benennt das Risiko korrekt („Feldtests kosten
Termine mit mehreren Personen") und nennt als Frühwarnzeichen „M8 wird 'aus Zeitgründen' verkürzt" — aber die
Planung reagiert nicht darauf: M8 steht als letzter Meilenstein hinter allem anderen, das heißt der einzige echte
Mehrclient-Nachweis auf dem echten Share liegt nach 14,5–21,5 PW, also nach `§3.1` frühestens ein Jahr nach
Beginn. Dasselbe gilt für `A §8 M7 DoD`: „die Betriebsanleitung ist von jemandem außer Johannes einmal
durchgearbeitet worden" — auch das ist ein Fremdtermin.

**Verschärfend:** `A §9 A5` begründet die Dringlichkeit selbst mit `main §11` („lief S1-Control seit Juni 2026
faktisch nur mit einem schreibenden Client?"). Genau dieser blinde Fleck wird reproduziert, wenn der reale
Mehrclient-Nachweis ans Ende rutscht. Die Vierclient-Simulation (`A §7.3`) ist ausdrücklich als Ersatz für
Feldversuche gedacht (`A §3.2 (f)`: „Property-Tests über Permutationen ersetzen Feldversuche mit vier Laptops auf
einem echten Share"), deckt aber genau die Klasse nicht ab, an der v1 gescheitert ist: SMB-Semantik, Client-Caches,
Sichtbarkeitsverzögerung, Virenscanner, Netztrennung im Feld.

**Was den Vorschlag retten würde:** Den Übungslauf aus M8 herauslösen und als **wiederkehrenden Termin ab M3**
planen (drei kurze Termine à ½ Tag mit 2–3 Rechnern statt eines großen am Ende); M8 auf die Nacharbeit reduzieren;
in §8 zwischen „Arbeitszeit" und „Terminabhängigkeit" trennen (zwei Spalten).

---

## 4. Verteilung und Update an THW-Rechner ohne Admin-Rechte

### 4.1 F4 — Der einzige Weg, wie die Software überhaupt auf die FüSt-Rechner kommt, wird erst in M7 geprüft

**Angegriffene Entscheidungen:**
- `A §2.5`: „Codesignierung Windows fehlt heute (`bmecat §9 R13`, Einschätzung ‚Niedrig'). **Empfehlung:
  unverändert lassen**, aber die SmartScreen-Warnung in der Betriebsanleitung dokumentieren."
- `A §2.6 Kanal 2`: stündliche Prüfung von `aktuell.json` auf dem Share, „Auf Windows wird der NSIS-Installer mit
  `/S` gestartet und die App beendet [Annahme: Silent-Install ohne Adminrechte, weil `perMachine:false` — zu
  prüfen, §10]".
- `A §9 A10` Frühwarnzeichen: „**Update auf einem zweiten Rechner in M7 schlägt fehl.**"
- `A §8 M0 DoD`: enthält ausschließlich Speicher-/Messkriterien, **kein** Installations- oder Updatekriterium.

**Beleg 1 — die Randbedingung ist jetzt hart.** `betriebsparameter`: „**keine Admin-Rechte** auf den
FüSt-Rechnern … Installer müssen per-User installieren … Auto-Update muss ohne Admin funktionieren." Damit ist
der Verteilungsweg keine Komfortfrage mehr, sondern Voraussetzung dafür, dass das Produkt überhaupt existiert.

**Beleg 2 — der heutige Build ist auf per-User nicht festgelegt.** `package.json` `build.nsis` enthält nur
`createStartMenuShortcut`, `createDesktopShortcut`, `shortcutName`, `menuCategory` — weder `oneClick` noch
`perMachine` sind gesetzt. Die Annahme in `A §2.6` („weil `perMachine:false`") stützt sich also auf einen
electron-builder-Standardwert, nicht auf eine Projektentscheidung. Sie sollte festgeschrieben und getestet werden,
nicht angenommen. `build.win.target` ist `"nsis"`; das Portable-Ziel wird nur über `--config.win.target=portable`
im Skript `build:win:portable` (`package.json:26`) erzeugt, also nicht in CI (`.github/workflows/build-main.yml`
baut portable + NSIS getrennt laut `historie §7`, aber `package.json` `build.win.target` bleibt `nsis`).

**Beleg 3 — die Signierentscheidung wird durch die neue Randbedingung teurer.** `A §2.5` verschiebt die
Windows-Signierung mit Verweis auf `bmecat §9 R13` („Niedrig"). Diese Einschätzung stammt aus einer Welt, in der
ein Nutzer die SmartScreen-Warnung wegklicken darf. Auf einem Rechner ohne Admin-Rechte — also mit hoher
Wahrscheinlichkeit einem verwalteten Gerät [Annahme, folgt aus „keine Admin-Rechte"] — ist offen, ob die Warnung
überhaupt quittierbar ist. Und Vorschlag A macht die Ausführung einer **unsignierten EXE zum Regelweg im
laufenden Einsatz**: Kanal 2 prüft stündlich und bietet „jetzt installieren?" an. Der Fallback ist eine zweite
unsignierte EXE (Portable). Beide Fallbacks teilen dieselbe Fehlerursache. Das ist kein diversifizierter Plan B.

**Beleg 4 — die Prüfung liegt 14 PW zu spät.** `A §10 Punkt 2` fragt Johannes nach „Windows-Version und Härtung
der FüSt-Rechner … Adminrechte für Benutzer ja/nein, Virenscanner, Ausführung von Netzlaufwerken erlaubt" und
begründet: „Warum wichtig: Update-Weg (§2.6), Portable-EXE, Risiko A10". Die Antwort auf die Teilfrage
Adminrechte liegt jetzt vor (nein). Die restlichen Teilfragen sind mit einem 30-Minuten-Versuch auf einem echten
FüSt-Rechner beantwortbar: heutigen NSIS-Installer und heutige Portable-EXE aus dem letzten Release
(`gh-release-assets.tsv`) kopieren, per-User installieren, starten, von einem Netzlaufwerk starten. Nichts davon
setzt v2 voraus. Trotzdem steht der Test erst in M7. Fällt er dort negativ aus, ist nicht ein Meilenstein
betroffen, sondern die Auslieferbarkeit — nach 14–19 PW Investition.

**Vergleich zur Alternative (für die Synthese):** Diese Schwäche ist **nicht** stackspezifisch. Ein Tauri-Build
hat dasselbe Problem (NSIS/MSI per-user, Updater ersetzt die EXE, ebenfalls unsigniert). Der Punkt ist also kein
Argument für B, sondern eine Auflage für jeden Vorschlag.

**Was den Vorschlag retten würde:** (1) `oneClick`/`perMachine:false` explizit in `build.nsis` festschreiben und
`portable` als reguläres CI-Artefakt bauen; (2) den Installations-/Update-Versuch auf einem echten FüSt-Rechner
als **DoD von M0** aufnehmen — vor jeder Zeile v2-Code, mit dem *heutigen* Installer; (3) die
Signierungsentscheidung neu bewerten (Azure Trusted Signing oder ein OV-Zertifikat) und, falls sie negativ
bleibt, im Betriebskonzept festhalten, dass jede Installation ein bewusster, dokumentierter Vorgang ist und
**kein** In-Einsatz-Automatismus; (4) Kanal 2 so entschärfen, dass er im Einsatz nur *meldet* und nie selbst
installiert.

---

### 4.2 F12 — Der Electron-Versionsstand ist im Vorschlag falsch angegeben, und der Rückstand fehlt in der Planung

**Angegriffene Entscheidung:** `A §2.1`: „Desktop-Schale | Electron (aktuelle Stable-Linie, **heute
`electron ^43.4.0` in beiden Repos**)"; `A §9 A12`: „Ohne native Module ist ein Electron-Upgrade **ein
Versionsdreher plus CI-Lauf**".

**Beleg:**
- `/Users/johannes/Developer/S1-Control/package.json:135` → `"electron": "^35.0.0"`; installiert ist
  **35.7.5** (`node -e "require('./node_modules/electron/package.json').version"`). `electron-builder` ist
  `^25.1.8` (installiert 25.1.8), `electron-updater` `^6.8.3`.
- `^43.4.0` gilt für **erfassungsbogen** (`/Users/johannes/Developer/einheitenerfassungsbogen/package.json:155`,
  dazu `electron-builder ^26.15.3`).
- `bmecatEditor` hat **überhaupt kein** Electron (`grep '"electron"'` liefert nichts; `package.json:28`
  `"@tauri-apps/cli": "^2"`). Die Formulierung „in beiden Repos" trifft auf keine Kombination zu.

**Warum das für die Lieferbarkeit zählt:** S1 liegt damit rund **acht Hauptversionen** hinter dem Stand, den das
Schwesterprojekt bereits fährt. Der Sprung 35 → 43 zieht einen Node-Hauptversionswechsel in der Laufzeit nach
sich, einen electron-builder-Hauptversionswechsel (25 → 26) und berührt `dev:main`/`build:main`, die noch mit
`--target node20` bündeln (`package.json`, Skript `dev:main`). Das ist kein „Versionsdreher plus CI-Lauf", sondern
ein eigenes Arbeitspaket, das in `A §8` nirgends auftaucht — obwohl der Branch neu aufgesetzt wird und der
Vorschlag explizit auf der „aktuellen Stable-Linie" starten will. Die Wartungsaussage in A12 („zweimal jährlich
als feste Aufgabe") ist zudem unbelegt: v1 hat in 3,5 Monaten Laufzeit **kein einziges** Electron-Upgrade gemacht;
es gibt also keine Erfahrung, auf die sich „ein Versionsdreher" stützen könnte.

**Was den Vorschlag retten würde:** Die Zahl korrigieren; das Upgrade 35 → aktuell als expliziten Posten in M2
mit 0,25–0,5 PW führen; A12 mit einem Belegsatz versehen („nach dem ersten Upgrade in M2 gemessen") statt mit
einer Behauptung.

---

## 5. Betrieb: Fehlerdiagnose im Einsatz ohne Entwickler vor Ort

### 5.1 F5 — Das Diagnosewerkzeug ist auf dem Zielrechner nicht lauffähig, und v1s Diagnoseoberflächen werden ersatzlos gestrichen

**Angegriffene Entscheidungen:**
- `A §5.1`: `packages/cli` mit `bin "akte": pruefe|falte|exportiere|migriere|simuliere`; `A §2.4`: Aufruf als
  `npm run akte`.
- `A §5.3 Nicht übernommen`: „**Debug-Log-Forwarding**"; `main §10 Weglassen` wird als Begründung zitiert.
- `A §8 M7`: `docs/BETRIEB.md` mit Inhalt „NAS einrichten, Ordnerrechte, Notverfahren bei NAS-Ausfall,
  USB-Übergabe".

**Beleg 1 — was gestrichen wird, war eine Reaktion auf genau dieses Problem.** `historie §8.1 Punkt 4`:
„**Debug-/Diagnose-Infrastruktur als Reaktion auf Nicht-Reproduzierbarkeit** (Sync-Log-Konsole 6def01a,
UDP-Monitor 47e134c/ac8f237, Peer-Status 3704260, Perf-Safe-Mode ed4b95a, SLO-Skripte 07a7fd0, `debug.ts`
107 Testzeilen): Symptom fehlender lokaler Multi-Client-Testbarkeit." `historie §2` bestätigt:
`SettingsView.tsx` 15× geändert, „Settings = Debug-Konsolen-Sammelbecken". Der Vorschlag ersetzt die *Ursache*
(fehlende lokale Mehrclient-Testbarkeit) korrekt durch die Simulation in CI — aber er streicht zugleich die
*Feldsicht* und stellt nichts an ihre Stelle. Beides zu tun ist eine Wette darauf, dass die Simulation alle
Feldfehler vorwegnimmt. `A §9 A2` sagt selbst, dass die entscheidende Umgebungsannahme (SMB) ungemessen ist.

**Beleg 2 — `akte` läuft auf dem Zielrechner nicht.** Das CLI ist ein Workspace-Paket, aufgerufen über
`npm run akte` (`A §2.4`). Das setzt Node, npm und ein ausgechecktes Repository voraus. Auf einem FüSt-Rechner
**ohne Admin-Rechte** (`betriebsparameter`) ist keine Node-Installation vorhanden und keine zu erwarten. Damit ist
das einzige Werkzeug, mit dem sich eine Akte prüfen, falten oder exportieren lässt (`pruefe|falte|exportiere`),
genau dort nicht verfügbar, wo im Fehlerfall jemand danach greifen müsste. Der Vorschlag adressiert das nirgends:
weder `§2.4` noch `§5.1` noch `§8 M7` erwähnen eine Auslieferung des CLI mit der Anwendung; `§9` enthält kein
Risiko zur Felddiagnose.

**Beleg 3 — was der Entwurf gut macht, und wo die Lücke genau sitzt.** Die *fachliche* Diagnose ist durch das
Ereignisprotokoll strukturell besser gelöst als in v1: alle Ereignisse aller Stellen liegen auf dem Share
(`A §3.3`), die Statuszeile zeigt Stand, Peer-Zahl und NAS-Erreichbarkeit (`A §3.6`), und Fremdschreiber-Warnungen
gehen in die Logs (`A §9 A7`). Die Lücke ist die *technische* Seite: welcher Client ist abgestürzt, warum hängt
die Oberfläche, welche App-Version läuft wo, wie groß ist die Uhrabweichung, wo steht welcher Upload-Offset.
Diese Daten liegen lokal je Client, und es gibt keinen definierten Ort, keine Rotation und keinen Sammelweg. In
`docs/BETRIEB.md` (M7-DoD) ist Diagnose nicht enthalten.

**Was den Vorschlag retten würde:** (1) `akte pruefe` und `akte exportiere` als **Menüpunkte der Anwendung**
ausliefern, nicht nur als CLI (das Kern- und Speicherpaket liegt ohnehin im Worker); (2) einen Menüpunkt
„**Diagnosepaket exportieren**" mit DoD in M2: App-Version je Stelle, Sharepfad, Uhrabweichung, Upload-Offsets,
Präsenzliste, letzte n Ereignisse, letzte 2.000 Logzeilen, als eine ZIP-Datei auf den Stick; (3) einen definierten
Logort mit Rotation in `docs/BETRIEB.md`; (4) `§9` um ein Risiko „Fehler im Einsatz ohne Entwickler vor Ort"
ergänzen.

### 5.2 F14 — Kein Rückfallverfahren, wenn die Anwendung selbst ausfällt

**Angegriffene Entscheidung:** `A §3.7` behandelt ausschließlich den **NAS**-Ausfall („Share weg → die App
arbeitet unverändert weiter"). `docs/BETRIEB.md` (M7) nennt „Notverfahren bei NAS-Ausfall". Kein DoD in `§8`
prüft, was die FüSt tut, wenn **die Anwendung** ausfällt (Absturzschleife, fehlgeschlagenes Update, Rechner tot).

**Beleg:** Solange die Excel läuft, ist das Rückfallverfahren trivial (Ausdruck, zweiter Rechner, Papier). Sobald
die Excel abgelöst ist — und Parität ist das erklärte Ziel (`A §1.1`) — ist S1 das einzige Lagebild. `handbuch
§7 N-4` fordert druckbare Ausgaben in fester Form gerade deshalb. `A §6` liefert die Ausgaben, aber kein DoD
verlangt, dass die Lage **jederzeit auf Papier fortführbar** ist (z. B.: der Druck enthält alle Felder, die zum
Weiterarbeiten nötig sind, und es existiert ein Verfahren, das Papier später wieder einzuspielen).

**Was den Vorschlag retten würde:** Ein DoD in M4: „Aus dem Druckprodukt lässt sich die Lage ohne die Anwendung
fortführen"; ein Abschnitt „Notbetrieb ohne Anwendung" in `docs/BETRIEB.md`; und die Regel, dass jede Stelle beim
Schichtwechsel einen Ausdruck zieht (das macht die Excel-FüSt heute ohnehin, `handbuch §7 F-K1`).

---

## 6. Schulung, Einführung, In-App-Hilfe

### 6.1 F7 — Schulung kommt im ganzen Vorschlag nicht vor, und eine Paritätsanforderung wird dabei übersehen

**Angegriffene Entscheidung:** `A §8` (neun Meilensteine, 16–24 PW) enthält keinen Posten für Anwenderschulung,
Anwenderdokumentation oder In-App-Hilfe. `grep -niE 'akueli|aküli|hilfe|handbuch|schulung|einweisung|f-l4|
controltip|anwenderdok'` über `vorschlag-a-electron-evolution.md` liefert **keinen einzigen Treffer** in diesem
Sinn (die 14 Treffer für „handbuch" sind sämtlich Quellenverweise auf den Bericht
`excel-handbuch-anforderungen.md`, keine Produktaussagen).

**Beleg 1 — es ist eine Paritätsanforderung, keine Kür.** `handbuch §7 F-L4`: „Tastenkürzel für alle
Kernfunktionen; **Hilfe/Abkürzungsliste (AküLi) und Handbuch in der Anwendung**; ControlTips. (Textfeld 19;
Neu!B28, B39; AküLi)". Die Excel liefert also ein eingebautes Handbuch und eine eingebaute Abkürzungsliste
(42 Einheiten + 66 Fahrzeuge, `kritik §3.1`). `A §8 M5 DoD` behauptet pauschal, „Alle Anforderungen der Gruppen
F, G, H, I, **L** aus `handbuch §7` sind abgehakt oder begründet zurückgestellt" — der Inhalt von M5 ist aber
ausschließlich Ressourcenplanung, Schicht, Logistik, Kosten, FüSt-Dienstposten und Archivbereich. F-L4 hat in
keinem Meilenstein ein Arbeitspaket. Das Datenmodell dafür ist immerhin vorgesehen (`zieldatenmodell §1.15`
Vokabular/AküLi als `VokabularEintrag`), die Oberfläche nicht.

**Beleg 2 — die Einführung hat kein Vehikel.** Der entscheidende Vorteil der Excel für die FüSt ist nicht ihr
Funktionsumfang, sondern dass jeder Excel kann. Ein Ersatz braucht: eine Kurzanleitung (1–2 Seiten,
laminierbar), eine Einweisung an einem Dienstabend, einen Demo-/Übungseinsatz zum gefahrlosen Ausprobieren und
eine Tastenkürzel-Karte (`handbuch §7 N-5` fordert ausdrücklich „Tastatur-first"). Nichts davon steht in `§8`;
`M7 DoD` verlangt nur, dass die **Betriebs**anleitung (NAS, Rechte, Notverfahren, USB) einmal von jemand anderem
durchgearbeitet wurde — das ist Administratoren-, nicht Anwenderdokumentation. `M8` nennt „Bedienung unter Stress
(`N-5`)" als Härtungsthema, aber ohne Schulungsbezug.

**Beleg 3 — der Aufwand ist nicht null.** Ein In-App-Hilfesystem (durchsuchbares Handbuch, AküLi, ControlTips an
den Feldern) plus eine Kurzanleitung plus eine Einweisung sind erfahrungsgemäß **1,0–2,0 PW** [Annahme] — also
5–12 % der Gesamtschätzung, die in den 16–24 PW nicht enthalten sind.

**Was den Vorschlag retten würde:** M9 „Anwenderdokumentation und Einweisung" mit 1,0–2,0 PW; F-L4 explizit einem
Meilenstein zuordnen; `docs/PARITAET.md` (das `A §9 A4` ohnehin vorsieht) beim Aufsetzen einmal vollständig gegen
`handbuch §7` prüfen, damit nicht weitere L-Anforderungen unter „abgehakt oder begründet zurückgestellt"
verschwinden.

---

## 7. Kopplung an erfassungsbogen.app

### 7.1 F6 — Der empfohlene Teilungsweg ist mit npm technisch nicht ausführbar

**Angegriffene Entscheidung:** `A §5.4`, Urteilsspalte „**empfohlen**": npm-Paket `@erfassungsbogen/kern` aus dem
bestehenden Repo, Vorgehen Punkt 1 „Im Repo `einheitenerfassungsbogen` einen Workspace **`pakete/kern`** anlegen",
Punkt 2 „Veröffentlichung als Git-Abhängigkeit mit Tag-Pinning:
`"@erfassungsbogen/kern": "github:wattnpapa/erfassungsbogen#eeb-kern-v1.0.0"` — offline-tauglich über den
npm-Cache, kein Registry-Konto nötig. [Annahme: kein npm-Registry-Konto gewünscht]".

**Beleg 1 — npm kann kein Unterverzeichnis eines Git-Repos als Paket installieren.** Die Angabe
`github:user/repo#tag` löst auf das **Wurzelpaket** des Repositorys auf; eine Pfadangabe innerhalb des Repos
(wie pnpm sie mit `#path:/packages/x` kennt) gibt es in npm nicht. Installiert würde also nicht `pakete/kern`,
sondern das gesamte Repository als Paket. Was das konkret bedeutet:
`/Users/johannes/Developer/einheitenerfassungsbogen` → `git remote -v`: `https://github.com/wattnpapa/erfassungsbogen.git`
(der im Vorschlag genannte Name stimmt also), `src/` = **140 Dateien / 36.462 Zeilen** TypeScript/TSX,
daneben `android/`, `ios/`, `electron/`, `prototype/`, `public/`, `release/`, `index.html` (161,7 KB),
`package-lock.json` (500,5 KB); `package.json:170` `"private": true`. Eine Git-Abhängigkeit führt zudem beim
Installieren das `prepare`-Skript des Zielpakets aus — bei diesem Repo also die Build-Kette der PWA, in S1s
`npm ci` und in jedem CI-Lauf.

**Beleg 2 — die Offline-Aussage trägt nicht so weit, wie sie klingt.** Git-Abhängigkeiten werden zwar mit
aufgelöstem Commit im Lockfile geführt und gecacht, brauchen aber ein funktionierendes `git` und im Zweifel
Netzzugang beim ersten Auflösen. Für ein Projekt, dessen Alleinstellungsmerkmal Offline-Tauglichkeit ist, ist das
die fragilste der verfügbaren Optionen.

**Beleg 3 — die 0,5 PW für den Paketschnitt sind optimistisch.** `A §5.4` veranschlagt „~0,5 Personenwoche,
gehört in M6" für: Workspace im Fremdrepo anlegen, `model.ts`/`codec.ts`/`signatur.ts`/`qr-node.ts` und Teile von
`app/einsaetze.ts` verschieben, die App auf das Paket umstellen, ~1.900 Testzeilen mitziehen. Das Zielrepo ist ein
aktives Produkt mit PWA-, Capacitor-, Android-, iOS- und Electron-Bau (`ls` oben) und einer eigenen CI
(`.github/`). Ein Workspace-Schnitt berührt dort Build, Tests, Release und Bundling. 0,5 PW ist die Untergrenze,
nicht die Erwartung.

**Was den Vorschlag retten würde — drei tragfähige Alternativen, in dieser Reihenfolge:**
1. **Eigenes Repository** `erfassungsbogen-kern` (nur Codec/Modell/Signatur/Tests). Dann funktioniert
   `github:wattnpapa/erfassungsbogen-kern#v1.0.0` wie beschrieben, ohne PWA-Ballast und ohne `prepare`-Kette.
   Das Bogen-Repo konsumiert es genauso wie S1 — der Schnitt zahlt sich zweimal aus.
2. **Tarball an einem GitHub-Release**: `npm pack` im Kern-Workspace, Asset an ein Release hängen, in S1 per
   URL + `integrity` pinnen. npm unterstützt entfernte Tarballs als Abhängigkeit; das Ergebnis ist
   byte-reproduzierbar und im npm-Cache vollständig offline nutzbar.
3. **GitHub Packages** — funktioniert, verlangt aber ein Token und ist damit gegen die Offline-Anforderung.

### 7.2 F6b — Schema-Drift zwischen selbstaktualisierender PWA und gepinntem Desktop-Codec

**Angegriffene Entscheidung:** `A §5.4 Punkt 2`: „S1 pinnt eine Version"; `A §5.4 Punkt 3`: „Damit bleibt die
Bit-Ebene an genau einer Stelle gepflegt".

**Beleg:** Das EEB-Format ist nicht eingefroren: `SCHEMA_VERSION = 8` mit Weichen v2/v3/v6/v7/v8
(`kritik §2.2 (b)`), und `handbuch §7 N-8` formuliert die Anforderung als „Kompatibilität mit dem digitalen EEB
(erfassungsbogen.app, **Schema ≤ 8**)". erfassungsbogen.app ist eine PWA, die sich beim Nutzer selbst
aktualisiert; S1 wird per Installer verteilt und im Einsatz gerade **nicht** aktualisiert (`A §2.6`, `A §9 A8`).
Der Regelfall im Einsatz ist damit: der Meldekopf scannt mit einer neueren Bogen-Version, S1 hat einen älteren
gepinnten Codec. `A §9 A8` behandelt genau diese Klasse — aber nur für die **eigenen** Ereignisse
(„`schemaVersion` je Ereignis; nur additive Änderungen; unbekannte Typen werden durchgereicht"), nicht für den
Fremdcodec. Für den EEB gibt es weder eine Bump-Politik, noch eine Vorwärtskompatibilitätsregel, noch eine
Fehlermeldung „Bogen-Version zu neu" und keinen Kompatibilitätstest gegen die letzten n Schemaversionen.

**Was den Vorschlag retten würde:** In `§5.4` festhalten: (a) der Codec toleriert unbekannte Felder/Segmente und
meldet „Bogen-Version zu neu für diese S1-Version — bitte S1 aktualisieren" statt zu scheitern; (b) S1s CI hält
eine Beispielbogen-Sammlung je Schemaversion (die 443 Beispielbögen aus `kritik §3.2` sind vorhanden) und testet
gegen alle; (c) eine Regel, wer wann die gepinnte Version anhebt, und dass ein EEB-Schemasprung ein
S1-Release erzwingt.

---

## 8. Wartbarkeit über Jahre und Abhängigkeit von jungen Werkzeugen

Vorwegstellung, damit die Gewichtung stimmt: **Auf der Werkzeugachse ist Vorschlag A der konservativste der drei
Entwürfe.** Electron, React 19, Vite, Vitest, npm-Workspaces, `zod`, `zustand`, `tsup` sind reife, breit getragene
Bausteine; der einzige Sprachraum ist TypeScript (`A §2.1`); `bmecat §9 R5` stuft „zwei Sprachen" ausdrücklich als
Risiko ein, das A nicht eingeht. Der Wegfall der nativen Module (`A §2.4`, gegen `package.json` `better-sqlite3
^11.8.1`, `drizzle-orm ^0.39.3`, `drizzle-kit ^0.30.4`, `@types/better-sqlite3`) beseitigt zusätzlich die einzige
ABI-gebundene Stelle. Das ist ein echter, belegter Wartungsvorteil. Auch der Bus-Faktor ist adressiert: ADRs,
§-nummerierte Konzeptdokumente und DoDs, „die auch nach drei Monaten Pause prüfbar" sind (`A §9 A3`), sind genau
die Antwort auf `historie §8.3` („für die drei größten Entscheidungen existiert keine schriftliche Begründung im
Repo"). Kein Finding.

Was fehlt, ist die Zeitachse **nach** der Parität.

### 8.1 F9 — Der Plan endet an der Parität; die wiederkehrende Betriebslast ist benennbar, aber nicht veranschlagt

**Angegriffene Entscheidung:** `A §8` endet mit M8. Die einzige Aussage zur Dauerlast ist `A §9 A12`:
„Ohne native Module ist ein Electron-Upgrade ein Versionsdreher plus CI-Lauf …; Upgrade **zweimal jährlich** als
feste Aufgabe in `docs/BETRIEB.md`." `A §9 A15` behandelt ausschließlich den *Verlust* von Signaturmaterial.

**Beleg 1 — der halbjährliche Takt lässt die ausgelieferte Version regelmäßig aus dem Support fallen.** Electron
veröffentlicht im Achtwochentakt und pflegt die letzten drei Hauptlinien [Annahme: Supportpolitik unverändert
gegenüber dem Stand der Recherche]. Drei Linien × 8 Wochen ≈ **5,5 Monate**. Ein Upgrade „zweimal jährlich" heißt
also: zum Zeitpunkt jedes Upgrades läuft auf den FüSt-Rechnern eine Version, die keine Chromium-Sicherheits-
aktualisierungen mehr erhält. Für ein Werkzeug, das Helfernamen, Erreichbarkeiten und Einsatzlagen führt
(`zieldatenmodell §1`), ist das eine Entscheidung, die begründet werden muss. Bemerkenswert: A hätte das bessere
Argument zur Hand und führt es nicht — die Anwendung lädt keine fremden Web-Inhalte, der Renderer sieht nur eigene
Bundles und Dateien vom Share; die Angriffsfläche einer Chromium-Lücke ist damit klein. Das gehört als bewusste
Festlegung in `docs/BETRIEB.md`, nicht als stillschweigende Folge eines Kalendertakts.

**Beleg 2 — die macOS-Signierkette ist eine jährliche Fremdkosten- und Terminabhängigkeit für eine Plattform, auf
der im Einsatz niemand arbeitet.** `package.json` `build.mac` = `{"hardenedRuntime": true, "notarize": true,
"target": ["dmg","zip"]}`. Notarisierung setzt eine **aktive, jährlich kostenpflichtige** Mitgliedschaft im Apple
Developer Program und ein gültiges Developer-ID-Zertifikat voraus. `A §2.5` führt „macOS bleibt signiert/
notarisiert" als Bestandsvorteil gegenüber Tauri ins Feld und `A §1.3` verbucht die Signierkette in der Zeile
„Bestand, der weiterläuft". Läuft die Mitgliedschaft aus, bricht kein Feature, sondern der Release-Job — genau die
Fehlerklasse, für die `ed68271 fix(ci): add macOS certificate validity check` bereits nachgerüstet wurde
(`A §9 A15`, `nachlese-build §3.1`: „Build macOS artifacts 139–159 s inkl. Signierung/Notarisierung"). Nach
`betriebsparameter` ist das Client-Betriebssystem der FüSt **Windows 11**; macOS ist Johannes' Entwicklungsmaschine.
Das Projekt trägt also eine jährliche Gebühr und einen jährlichen Termin für eine Nebenplattform, ohne dass dies
irgendwo als Entscheidung steht.

**Beleg 3 — die einzige wirklich junge Abhängigkeit sitzt an einem Gate.** `package.json` devDeps:
`"playwright-bdd": "^9.0.0"`. Das ist die alleinige Brücke zwischen den zehn Gherkin-Dateien und Playwright, ein
Drittprojekt außerhalb des Playwright-Kerns [Annahme zur Trägerschaft: kleines Projekt, an Playwright-Hauptversionen
gebunden]. `A §1.3` verbucht „Playwright-BDD" als Bestandsvorteil gegenüber Tauri, `A §7.4`/`§7.5` machen E2E zum
**Release-blockierenden Gate auf zwei Betriebssystemen**. Bricht die Brücke bei einem Playwright-Sprung, steht nicht
ein Test, sondern der Release. Der Wert liegt in den Gherkin-Dateien, nicht im Adapter — das sollte der Entwurf so
festhalten.

**Beleg 4 — es gibt keine Erfahrungsbasis für „ein Versionsdreher plus CI-Lauf".** v1 hat in 3,5 Monaten
Projektlaufzeit **kein einziges** Electron-Upgrade durchgeführt (`historie §1`, Phasen 0–9 enthalten keines;
`package.json:135` steht unverändert auf `^35.0.0`). Die Aussage in A12 ist damit unbelegt; siehe zusätzlich F12,
wonach der erste Sprung acht Hauptversionen umfasst und deshalb gerade **nicht** der Normalfall ist, auf den A12
sich beruft.

**Grobrechnung der Dauerlast** [Annahme, aus den vier Belegen zusammengesetzt]: zwei Electron-Upgrades + Abhängig-
keitspflege + eine CI-Reparatur + Zertifikats-/Mitgliedschaftserneuerung + Nachlauf nach jedem realen Einsatz
(Fehlerbilder, Wünsche der FüSt) ≈ **1,0–2,0 PW je Jahr**. Über fünf Jahre sind das 5–10 PW, also rund ein Drittel
bis die Hälfte der Erstinvestition. Diese Zahl fehlt in `A §8` vollständig — obwohl die Entscheidung, die hier
getroffen wird, eine über Jahre ist.

**Was den Vorschlag retten würde:** (1) einen Abschnitt „Dauerbetrieb" in `§8` mit 1,0–2,0 PW je Jahr und den vier
benannten Posten; (2) den Upgrade-Takt an die Electron-Supportlinie binden **oder** die bewusste Abweichung mit dem
Argument „keine fremden Web-Inhalte" schriftlich festhalten; (3) die macOS-Signierung als Entscheidung führen
(behalten und jährlich bezahlen — oder auf unsigniertes Entwickler-Build zurücknehmen, weil kein Einsatzrechner
macOS ist); (4) einen ADR „Gherkin-Dateien sind der Bestand, `playwright-bdd` ist austauschbar" und die Regel, dass
ein Adapterbruch das E2E-Gate rot färbt, aber keinen Release blockiert, bis er ersetzt ist.

---

## 9. Wo die Betriebsparameter den Vorschlag entlasten

`betriebsparameter` war den Vorschlägen nicht bekannt. Fünf Antworten entlasten A — teils erheblich.

| Antwort | Was sie an A entlastet | Beleg |
|---|---|---|
| **NTP vorhanden** | `A §3.8` („Uhren ohne NTP") wird von einer tragenden Konstruktion zur Absicherung. Die HLC bleibt für die *Ordnung* nötig, aber die Uhrabweichungs-Anzeige, die korrigierbaren Fachzeiten und die undefinierten TTL-/Stale-Fälle verlieren ihre Dringlichkeit. `A §10 Punkt 4` fragt genau danach und ist damit beantwortet. Entlastung in M0/M1. | `betriebsparameter` Zeile „Zeitsynchronisation"; `A §3.8`; `A §10 Punkt 4` |
| **Keine Altdaten** | `A §8 M7` verliert seinen größten Posten: `akte migriere` für v1-`.s1control` und der Excel-Import (`A §3.9`, `§3.10`) sind gegenstandslos. `A §10 Punkt 8` hatte das selbst vorweggenommen („Wenn (b) und (c) ‚nein', entfallen zwei Import-Pfade und M7 wird ~0,5 PW kürzer"); tatsächlich fällt auch (a) weg, also eher **0,75–1,0 PW**. Risiko `A11` (`exceljs` liest die `.xlsm` nicht) sinkt von „Importpfad kaputt" auf „Kopiervorlagen müssen anders übernommen werden" — und `exceljs` wird als *Lese*-Abhängigkeit womöglich ganz entbehrlich (der StAN-Katalog liegt in v1 bereits als Daten vor, `A §5.3`). | `betriebsparameter` Zeile „Altdaten"; `A §3.9`, `§3.10`, `§8 M7`, `§9 A11`, `§10 Punkt 8` |
| **1 bis 5 gleichzeitige Rechner** | Die Auslegung des Speichermodells ist bestätigt: Poll über eine Handvoll Dateien, kleine Präsenzliste, `praesenz/`-Verzeichnis mit ≤ 5 Einträgen. Die Vierclient-Simulation (`A §7.3`) deckt damit den realen Maximalfall nahezu ab statt nur einen Ausschnitt — das ist ein echter Zugewinn an Aussagekraft für ein CI-Gate. `A §10 Punkt 3` (drei unvereinbare Baselines) ist für die Clientzahl beantwortet. | `betriebsparameter` Zeile „Gleichzeitige Rechner"; `A §7.3`, `§10 Punkt 3` |
| **Synology (SMB)** | `A §9 A2` („NAS-Typ ist unbekannt") ist entschärft: Samba auf Linux, SMB3 mit Leases, bekanntes Verhalten. Vor allem wird die M0-Messung **billig und sofort ausführbar** — sie braucht kein v2, nur ein Skript gegen den gemounteten Share. `A §10 Punkt 1` ist zur Hälfte beantwortet. | `betriebsparameter` Zeile „NAS / Share"; `A §8 M0`, `§9 A2`, `§10 Punkt 1` |
| **SQLite scheiterte an Langsamkeit, nicht an Korruption** | Bestätigt `A §3.1` in der Sache und entwertet den Einwand „vielleicht war SQLite falsch bedient". Zugleich verschärft es das Latenz-Kriterium: das Abbruchkriterium in `A §8 M0` („> 300 ms je Ereignis") ist genau die richtige Größe, weil derselbe Mechanismus v1 zu Fall gebracht hat. | `betriebsparameter` Zeile „Mehrclient-Betrieb v1"; `historie §8.1 Punkt 2`; `A §3.1`, `§8 M0` |

**Summe der Entlastung: 0,75–1,5 PW**, konzentriert auf M7 und M0/M1 — und ein spürbarer Zugewinn an
Aussagekraft für die Vierclient-Simulation. Das ist ehrlich zu verrechnen, bevor die Belastungen aufgeschlagen
werden (§12).

Eine Antwort ist **neutral, aber nicht entlastend**: „Windows 11" beseitigt zwar die WebView2-Offline-Frage — aber
das war ohnehin ein Argument *gegen* Tauri, nicht *für* A. Was es bei A ändert, steht in F13.

---

## 10. Wo die Betriebsparameter den Vorschlag belasten

### 10.1 F4 wird von einer Planungsschwäche zu einer Existenzfrage

Bereits in §4.1 ausgeführt; hier nur die Zuspitzung durch die neue Faktenlage: `A §10 Punkt 2` fragte „Adminrechte
für Benutzer ja/nein" und begründete die Frage mit „Update-Weg (§2.6), Portable-EXE, Risiko A10". Die Antwort ist
**nein**. Damit ist die in `A §2.6` als Klammer geführte Annahme („[Annahme: Silent-Install ohne Adminrechte, weil
`perMachine:false` – zu prüfen, §10]") keine Fußnote mehr, sondern die Bedingung, unter der das Produkt überhaupt
auf einen FüSt-Rechner gelangt. `package.json` `build.nsis` setzt weder `oneClick` noch `perMachine`; `build.win`
ist `{"icon": …, "target": "nsis"}` — das Portable-Ziel entsteht nur über die Kommandozeilenüberschreibung im
Skript `build:win:portable`. Beides ist heute nicht festgelegt und nicht getestet. Der Test kostet 30 Minuten mit
dem *heutigen* Release-Artefakt und steht in M7.

### 10.2 F10 — Vier Zielplattformen bleiben im Plan, obwohl genau eine Client-Plattform benannt ist

**Angegriffene Entscheidung:** `A §2.1` führt „vier gebaute Zielplattformen (`nachlese-build §3.1`)" als
*Begründung* der Stack-Wahl; `A §1.6` stützt das CI-Argument auf den Median 5:16 min **über diese Vierermatrix**;
`A §7.5` fordert zusätzlich E2E auf ubuntu + windows. Nirgends wird entschieden, welche Plattform ein *Produkt* ist.

**Beleg 1:** `betriebsparameter` — Client-Betriebssystem **Windows 11**; macOS/Linux „berücksichtigen
(Entwicklung auf macOS; Linux als Tier 2)". Es gibt keinen benannten Linux-Anwender.

**Beleg 2:** `historie §8.1 Punkt 1` nennt als Ursache des teuersten Themenblocks überhaupt (50 Commits, 24 %,
2.225 Servicezeilen) ausdrücklich „**vier Plattform-Targets ab Tag 1**"; `historie §8.2` führt „Arch/pacman-Job,
ggf. Linux insgesamt [offen]" unter „was bei einem Neuanfang wegfiele"; `historie §8.3` schließt mit
„Plattformumfang aus dem tatsächlichen Einsatzbedarf ableiten". Vorschlag A trifft diese Entscheidung nicht — er
erbt die Plattformbreite und verbucht sie als Vorteil.

**Beleg 3:** `package.json` `build.linux` = `{"target": "deb", …}`. Die Linux-Auslieferung ist heute genau ein
Debian-Paket, ohne dass ein Nutzer dafür benannt wäre.

**Warum das die Lieferbarkeit trifft:** Jede Zielplattform kostet in CI Laufzeit (und damit an F3), im Release ein
Artefakt mit eigener Fehlerklasse, im Betrieb einen eigenen Installations- und Updateweg (`A §2.6` beschreibt
`aktuell.json` bereits mit einer `plattform`-Liste) und in der Fehlersuche eine Variante. Bei einem Einzelentwickler
ist Plattformbreite der klassische Multiplikator — und historisch in genau diesem Repo der teuerste Posten.

**Was den Vorschlag retten würde:** Die Zielplattformen als Entscheidung in `§2` führen statt als Bestand:
**Windows 11 = Produkt** (getestet, E2E, Feldsupport, Betriebsanleitung), **macOS = Entwicklungs- und
Nebenplattform** (Build und Unit-Tests ja, E2E ja, kein Feldsupport, Signierung als bezahlte Entscheidung, siehe
F9), **Linux = auf Anfrage aus der CI, kein Release-Artefakt**. Das entlastet M2 (F3), M8 und die Dauerlast (F9).

### 10.3 F11 — Ohne Admin-Rechte fällt der Schnellhinweis aus; danach widerspricht die Sichtbarkeits-SLO der eigenen Gegenmaßnahme

**Angegriffene Entscheidungen:** `A §2.2` (`packages/netz – UDP-Hinweise (dgram), Peer-Liste`); `A §3.6`
(Sichtbarkeit und Latenz); `A §8 M8 DoD`: „die SLOs (Öffnen < 2 s, **Fremdänderung < 5 s**) sind auf der
Zielhardware gemessen"; `A §9 A13`, das die UDP-Blockade als Umgebungsrisiko einstuft mit der Gegenmaßnahme
„Polling ist immer aktiv und ausreichend" — und im selben Feld die Folge beziffert: „**nur Polling, bis 10 s
Latenz**".

**Beleg 1 — der Ausfall ist unter den neuen Betriebsparametern der Regelfall, nicht das Risiko.** Ein Prozess, der
unter Windows einen UDP-Socket zum **Empfangen** öffnet, löst beim ersten Start die Firewall-Abfrage aus; das
Anlegen einer eingehenden Ausnahme verlangt Administrator-Erhebung. Auf FüSt-Rechnern **ohne Admin-Rechte**
(`betriebsparameter`) kann der Anwender diese Ausnahme nicht erteilen. Ausgehendes Senden bleibt erlaubt,
eingehende Broadcasts werden verworfen — und zwar auf **jedem** Client gleich. Es entsteht also nicht der Fall
„ein Client hört nicht", sondern „kein Client hört". [Annahme: keine per Gruppenrichtlinie vorab ausgerollte
Freigabe; das wäre der Ausweg, setzt aber eine IT-Stelle voraus, die es im OV vermutlich nicht gibt.]

**Beleg 2 — der Vorschlag widerspricht sich damit selbst.** A13 beziffert den Polling-Fall mit „bis 10 s Latenz";
das M8-DoD verlangt „Fremdänderung < 5 s". Solange UDP als Regelweg gilt, ist der Widerspruch verdeckt. Unter der
Randbedingung „kein Admin" ist der Polling-Fall der Normalfall, und die SLO ist mit der eigenen Gegenmaßnahme
unerreichbar — es sei denn, das Poll-Intervall wird auf ≤ 5 s gedrückt, was wiederum die SMB-Last erhöht, die M0
erst messen soll. Das ist keine Kleinigkeit: Sichtbarkeitslatenz ist die Kernanforderung des Mehrclientbetriebs
und die Größe, an der v1 gescheitert ist.

**Beleg 3 — die Härtung fehlt auch im Feldversuch.** `A §8 M0` misst „Sichtbarkeitslatenz **mit und ohne UDP**".
Das ist genau richtig, aber der Fall „ohne" ist jetzt der Hauptfall und nicht der Vergleichswert. Und weder M0 noch
M7 prüfen, ob die Firewall-Freigabe auf einem echten FüSt-Rechner überhaupt erteilbar ist — dieselbe Lücke wie F4.

**Was den Vorschlag retten würde:** (1) UDP als *optionale Beschleunigung* führen, die eine dokumentierte
Firewall-Freigabe voraussetzt, nicht als Kanal des Regelbetriebs; (2) das M0-Messprotokoll auf „ohne UDP" als
Referenzfall umstellen und das Poll-Intervall daraus ableiten; (3) die SLO ehrlich an den gemessenen Wert binden
(„Fremdänderung < Poll-Intervall + Sichtbarkeitslatenz, gemessen: x s") statt an eine gesetzte Zahl; (4) die
Firewall-Frage in denselben 30-Minuten-Feldversuch aufnehmen, den F4 für M0 fordert.

### 10.4 F13 — Das Installer-Größenargument gegen Tauri ist durch „Windows 11" falsifiziert

**Angegriffene Entscheidung:** `A §2.5` Schlussabsatz: „Tauri müsste für dasselbe Offline-Verhalten `fixedRuntime`
(~180 MB) oder `offlineInstaller` (~127 MB) mitliefern (`bmecat §9 R1`) … **Der Installer-Vorteil von Tauri
verschwindet also in genau diesem Anwendungsfall.**" Dieselbe Aussage trägt `A §1.5` („ehrlich unterlegen … der
allerdings kleiner ausfällt als ein offline-taugliches Tauri-Paket") und die Vergleichstabelle `A §1.3`.

**Beleg:** `betriebsparameter`: „Client-Betriebssystem **Windows 11** … WebView2-Evergreen-Laufzeit ist auf
Windows 11 **vorinstalliert**; `fixedRuntime`/`offlineInstaller` ist kein Muss mehr, nur noch Absicherung." Die
Prämisse des Arguments ist damit nicht mehr wahr. Ein Tauri-NSIS ohne mitgelieferte Laufzeit liegt in der
Größenordnung einstelliger MB; A liefert 101.954.252 B (`gh-release-assets.tsv`, von `A §2.5` selbst zitiert).

**Warum das lieferungsrelevant ist und nicht nur ein Punktabzug im Vergleich:** `A §2.6` Kanal 2 legt **jede** neue
Version als vollständigen Installer auf den Share; `A §9 A10` schreibt vor, dass jeder Client den Installer
„erst lokal kopiert, dann ausführt". Bei fünf Clients (`betriebsparameter`) sind das rund 0,5 GB je Update über
SMB im Einsatznetz, zuzüglich derselben Menge im Share; bei Kanal 3 (USB) ist es der Unterschied zwischen „nebenbei"
und „spürbar". Das ist beherrschbar — aber es ist ein Nachteil, und A verbucht ihn als neutralisiert. Ein Vergleich,
der auf einer falsch gewordenen Prämisse ruht, ist für die Synthese wertlos; die Entscheidung muss ihn ohne diesen
Posten tragen (was sie nach §12 kann).

**Was den Vorschlag retten würde:** (1) `§1.5` und `§2.5` auf die neue Faktenlage korrigieren: Tauri hat auf
Windows 11 einen echten Größenvorteil, der bei 1–5 Clients und Share-Verteilung kein Ausschlusskriterium ist;
(2) in `§2.6` differenzielle Auslieferung prüfen (electron-builder erzeugt für NSIS bereits Blockmaps) und den
Programmordner auf zwei Versionsstände begrenzen; (3) den Wegfall der nativen Module als Größengewinn beziffern,
statt ihn mit „[Annahme: wenige MB]" abzutun.

### 10.5 F15 — Für das erklärte Paritätskriterium existiert kein Referenzdatensatz, und es kann keiner gefunden werden

**Angegriffene Entscheidung:** `A §8 M4 DoD`: „ein Ausdruck der Stärkeübersicht ist gegen einen Excel-Ausdruck
desselben Datenstands Zeile für Zeile geprüft (**das ist das eigentliche Paritätskriterium**)"; `A §10` Schlusssatz:
„Zusätzlich hilfreich … ein anonymisierter realer Einsatzstand (Excel oder `.s1control`) als Testdatensatz für
Goldfiles (§7.1) und die Paritätsprüfung des Ausdrucks (M4-DoD)."

**Beleg:** `betriebsparameter`: „Altdaten: **keine** — keine produktiven SQLite-/JSON-Einsatzdateien, **keine
gefüllten Excel-Mappen**." Der einzige benannte Maßstab für das „eigentliche Paritätskriterium" existiert also
nicht und wird auch nicht auftauchen. Er muss **hergestellt** werden: eine Excel-Mappe mit einem realistischen
Einsatz (mehrere Abschnitte, einige Dutzend bis über hundert Einheiten, Status, Schicht, Logistik, FüSt-Personal)
von Hand füllen, alle acht Ausgabeprodukte daraus ziehen und als Goldfiles ablegen. Das ist Fachhandarbeit in der
Excel, kein Entwicklungsschritt, und es steht in `§8` nirgends [Annahme: 0,25–0,5 PW, plus ein Abgleich mit der
FüSt, ob die Mappe realistisch befüllt ist].

**Nebenwirkung in beide Richtungen:** Dieselbe fehlende Mappe entlastet M7 (kein Excel-Import, §9) und entwertet
zugleich die M0-Vorprüfung „ob `exceljs` die Excel-Mappe liest" (`A §8 M0`) — geprüft werden kann nur die leere
Vorlage. Der Vorschlag verrechnet die Entlastung nicht und bemerkt die Belastung nicht.

**Was den Vorschlag retten würde:** Einen Posten „Referenzmappe und Goldfiles erstellen" nach M1 aufnehmen; das
M4-DoD ausdrücklich auf diese Referenzmappe beziehen; die acht Ausdrucke versioniert unter `docs/referenz/`
ablegen, damit sie auch nach Monaten Pause noch der Maßstab sind (das ist zugleich eine Gegenmaßnahme zu `A §9 A3`).

---

## 11. Findings, sortiert nach Schwere

| # | Kurzfassung | Schwere | Ort |
|---|---|---|---|
| **F4** | Der einzige Weg, wie die Software auf die FüSt-Rechner kommt (per-User-Installation und stiller Update-Start ohne Admin-Rechte, unsignierte EXE), ist ungeprüft und steht in M7 — nach 14–19 PW. Der Test kostet 30 Minuten mit dem heutigen Artefakt. | **blocker** | §4.1, §10.1 |
| **F2** | „Erhalten bleibt der gesamte tragende Bestand — 190 Vitest-Tests" ist durch `A §2.6`/`§5.3` desselben Dokuments falsifiziert: ~42 % des Testkorpus werden gestrichen, ~20 % neu geschrieben; wörtlich übernehmbar sind 500–900 von 4.798 Zeilen. Die Untergrenze 16 PW steht auf dieser Annahme. | schwer | §3.2 |
| **F3** | M2 (2,0–3,0 PW) bündelt Workspace-Umbau, Prozessmodell, IPC-Kontrakt, Store, zwei Fenster **und** den CI-Umbau — den Themenblock, der in v1 45 % der Commits gekostet hat; der neue CI-Umfang ist größer, die zitierte Median-Laufzeit stammt aus der alten Pipeline ohne E2E. | schwer | §3.3 |
| **F1** | Die Schätzung ist ausschließlich in PW ausgedrückt; mit dem im Repo gemessenen Rhythmus (21 Commit-Tage / 104 Kalendertage ≈ 3,5 Kalenderwochen je PW) bedeuten 16–24 PW **13–19 Monate** bis Parität. Die 71-tägige Unterbrechung in v1 ist ein gemessenes Faktum, wird aber als Risiko A3 geführt. | schwer | §3.1 |
| **F11** | Ohne Admin-Rechte ist der UDP-Schnellhinweis auf Windows faktisch tot (eingehende Firewall-Regel nicht erteilbar); danach widerspricht das M8-SLO „Fremdänderung < 5 s" der eigenen Gegenmaßnahme A13 („nur Polling, bis 10 s"). | schwer | §10.3 |
| **F7** | Anwenderschulung, Anwenderdokumentation und In-App-Hilfe kommen im gesamten Vorschlag nicht vor; `handbuch §7 F-L4` (Handbuch + AküLi **in der Anwendung**) ist eine Paritätsanforderung und hat kein Arbeitspaket, obwohl `M5 DoD` die Gruppe L pauschal abhakt. | schwer | §6.1 |
| **F5** | Das einzige Diagnosewerkzeug (`akte`, aufgerufen über `npm run akte`) läuft auf einem FüSt-Rechner ohne Node und ohne Admin-Rechte nicht; gleichzeitig werden v1s Diagnoseoberflächen ersatzlos gestrichen. Kein Diagnosepaket, kein Logort, kein Risiko dazu. | schwer | §5.1 |
| **F14** | Es gibt kein Rückfallverfahren für den Ausfall der **Anwendung** (nur für den des NAS). Nach Ablösung der Excel ist S1 das einzige Lagebild; kein DoD verlangt, dass die Lage aus dem Ausdruck heraus fortführbar ist. | schwer | §5.2 |
| **F9** | Der Plan endet an der Parität. Electron-Upgradetakt „zweimal jährlich" lässt die ausgelieferte Version regelmäßig aus dem Support fallen; die macOS-Notarisierung ist eine jährliche Fremdkostenpflicht für eine Plattform ohne Einsatznutzer; `playwright-bdd` ist die einzige junge Abhängigkeit und sitzt an einem Release-Gate. Dauerlast ≈ 1,0–2,0 PW/Jahr, nirgends veranschlagt. | mittel | §8.1 |
| **F10** | Vier Zielplattformen werden als Vorteil verbucht statt als Entscheidung geführt, obwohl `betriebsparameter` genau eine Client-Plattform nennt und `historie §8.1/§8.2/§8.3` die Plattformbreite als Kostentreiber Nr. 1 ausweist. | mittel | §10.2 |
| **F12** | Der Electron-Versionsstand ist falsch angegeben (`^43.4.0 in beiden Repos`; tatsächlich `^35.0.0`, installiert 35.7.5; `^43.4.0` gilt für erfassungsbogen, bmecatEditor hat gar kein Electron). Der Sprung über acht Hauptversionen samt electron-builder 25→26 hat kein Arbeitspaket, und A12 („ein Versionsdreher") ist unbelegt. | mittel | §4.2 |
| **F8** | M8 (1,5–2,5 PW) bepreist mit „Übungslauf mit 3–4 echten Clients" einen Fremdtermin als Arbeitspaket; ebenso M7-DoD („von jemandem außer Johannes durchgearbeitet"). Der einzige reale Mehrclient-Nachweis liegt damit am Ende — genau der blinde Fleck, an dem v1 gescheitert ist. | mittel | §3.4 |
| **F6** | Der als „empfohlen" markierte Teilungsweg für den EEB-Codec (`github:wattnpapa/erfassungsbogen#tag` auf den Workspace `pakete/kern`) ist mit npm nicht ausführbar — npm löst auf das Wurzelpaket auf; installiert würde das gesamte PWA-Repo samt `prepare`-Kette. Drei tragfähige Alternativen benannt. | mittel | §7.1 |
| **F13** | Das Argument „der Installer-Größenvorteil von Tauri verschwindet im Offline-Szenario" ist durch „Windows 11" (WebView2 vorinstalliert) falsifiziert; die 102 MB werden bei Kanal 2 zu einem wiederkehrenden Transportposten über SMB. | mittel | §10.4 |
| **F15** | Das „eigentliche Paritätskriterium" (Ausdruck gegen Excel-Ausdruck desselben Datenstands) hat keinen Referenzdatensatz und kann keinen bekommen — es gibt keine gefüllten Excel-Mappen. Die Referenzmappe muss erst von Hand erzeugt werden und ist nicht veranschlagt. | mittel | §10.5 |
| **F6b** | Schema-Drift: die selbstaktualisierende PWA schreibt EEB-Schema ≤ 8, S1 pinnt eine Codec-Version und wird im Einsatz gerade nicht aktualisiert. `A §9 A8` deckt nur die eigenen Ereignisse ab, nicht den Fremdcodec; keine Bump-Politik, keine Vorwärtstoleranz, kein Kompatibilitätstest. | mittel | §7.2 |

Nicht als Finding geführt, weil vom Vorschlag bereits adressiert: CRDT-Alternative, Renderer-Umbaukosten,
Zwei-Instanzen-E2E, native Module, Begründung des Speichermodells, Portable-Ziel (§1); Bus-Faktor/ADRs (§8);
Werkzeugreife des Stacks insgesamt (§8).

---

## 12. Verdikt und Auflagen

### 12.1 Die geprüfte Behauptung, korrigiert

Zu widerlegen war: *Ein KI-gestützter Einzelentwickler bringt Vorschlag A in 16–24 PW bis Excel-Parität und
betreibt ihn danach im Einsatz.*

**Der Aufwandsteil der Behauptung fällt.** Rechnung, jeder Posten aus einem Finding:

| Posten | PW min | PW max | Beleg |
|---|---:|---:|---|
| Ausgangsschätzung `A §8` | 16,0 | 24,0 | — |
| Testkorpus neu (Property, Simulation, Komponenten, Goldfiles) statt „Bestand" | +1,5 | +2,5 | F2 |
| M2b Pipeline (echtes `tsc -b`, Lint-Gate 0, E2E in CI auf zwei OS, Simulationsjob, Job-Abhängigkeiten) | +1,5 | +2,5 | F3 |
| Anwenderdokumentation, In-App-Hilfe/AküLi (`F-L4`), Kurzanleitung, Einweisung | +1,0 | +2,0 | F7 |
| Diagnosepaket, Logort/Rotation, Betriebsdiagnose in `BETRIEB.md` | +0,25 | +0,5 | F5 |
| Electron 35 → aktuelle Linie inkl. electron-builder 25 → 26 | +0,25 | +0,5 | F12 |
| EEB-Paketschnitt realistisch (eigenes Repo statt Workspace im PWA-Repo) | +0,25 | +0,75 | F6 |
| Referenzmappe + acht Goldfile-Ausdrucke erzeugen | +0,25 | +0,5 | F15 |
| Notbetriebsverfahren ohne Anwendung (Druck-DoD, Verfahren) | +0,25 | +0,25 | F14 |
| **Entlastung** durch `betriebsparameter` (keine Altdaten → M7; NTP → §3.8; Synology → M0 billiger) | −0,75 | −1,5 | §9 |
| **Korrigierte Spanne** | **20,5** | **32,0** | |

Dazu, außerhalb der Paritätsrechnung: **1,0–2,0 PW je Jahr Dauerbetrieb** (F9) und drei bis vier
**Fremdtermine** mit anderen Menschen (F8), die keine Arbeitszeit sind, aber das Lieferdatum bestimmen.

In Kalenderzeit, mit dem im Repo gemessenen Rhythmus (F1: 3,5 Kalenderwochen je PW):
**72–112 Kalenderwochen ≈ 17–26 Monate bis Parität**; mit der optimistischen Eigenannahme des Vorschlags
(2 KW/PW) immer noch 41–64 Wochen ≈ 9–15 Monate. Die im Vorschlag genannte Zahl „16–24 PW" ist damit weder
falsch noch unehrlich — sie ist unvollständig und in einer Einheit ausgedrückt, die das Lieferdatum verbirgt.

**Der Betriebsteil der Behauptung hält nicht ohne Nacharbeit**, aber nicht aus stackspezifischen Gründen: Es fehlen
Verteilung/Update ohne Admin-Rechte als geprüfter Weg (F4), Felddiagnose (F5), Notbetrieb (F14), Schulung (F7) und
ein Dauerbetriebsbudget (F9). Alle fünf sind nachrüstbar, vier davon billig und früh.

**Was ausdrücklich hält:** Die Werkzeugachse (§8 Vorwort) — A ist der konservativste der drei Entwürfe, geht keinen
Sprachwechsel ein, verliert die einzige ABI-Abhängigkeit und hat mit Ausnahme von `playwright-bdd` keine junge
Abhängigkeit an tragender Stelle. Die Velocity-Annahme ist plausibel: v1 hat in 4,2 PW gemessener Arbeitszeit
70.488 Zeilen und einen lauffähigen Einbenutzer-Client geliefert (`historie §1c`, `§3`). Die Behauptung „ein
Einzelentwickler kann das" ist damit **nicht** widerlegt. Widerlegt ist die Zahl.

### 12.2 Verdikt

**hält mit Auflagen.** Kein Finding trifft die Architektur, sechs treffen den Lieferplan und fünf den Betrieb; das
einzige, das die Auslieferbarkeit im Ganzen gefährden kann (F4), ist mit einem 30-Minuten-Versuch **vor** jeder
Codezeile ausräumbar — und trifft jeden Alternativvorschlag gleichermaßen (auch ein Tauri-Build ist unsigniert und
muss per-User installieren). Ein „fällt" wäre hier nicht Strenge, sondern eine Verwechslung von „Plan zu
optimistisch" mit „Weg falsch".

### 12.3 Auflagen (Reihenfolge ist Teil der Auflage)

1. **Vor M0, mit dem heutigen Release-Artefakt:** NSIS-Installer und Portable-EXE aus dem letzten Release auf
   einem echten FüSt-Rechner per-User installieren und starten; prüfen, ob die SmartScreen-Warnung quittierbar ist,
   ob die Ausführung vom Netzlaufwerk erlaubt ist, ob der Virenscanner eingreift und ob eine eingehende
   UDP-Firewall-Regel erteilbar ist. Ergebnis als DoD-Punkt von M0. (F4, F11)
2. **`build.nsis` festschreiben** (`oneClick`, `perMachine:false`) und `portable` als reguläres CI-Artefakt bauen;
   `build.win.target` entsprechend erweitern. (F4)
3. **§8 um eine Kalenderspalte und eine Terminspalte ergänzen**, abgeleitet aus 21 Commit-Tagen / 104
   Kalendertagen; das Datum „Excel-Parität frühestens" nennen; die Umstiegsentscheidung an M3+M4 hängen statt an
   Parität. (F1, F8)
4. **M2 in M2a (Schale) und M2b (Pipeline) teilen**, M2b mit eigenen 1,5–2,5 PW; die E2E-Laufzeit einmal messen,
   damit die CI-Aussage in §1.6 auf der v2-Pipeline steht. (F3)
5. **Die Bestandszeile in §1.3 korrigieren** auf „Werkzeugkette, CI-Matrix, Signierung, Gherkin-Dateien,
   Updater-Versionsvergleich, ~500–900 Testzeilen"; einen eigenen Posten „Testkorpus neu" in §8 führen. (F2)
6. **M9 „Anwenderdokumentation und Einweisung" (1,0–2,0 PW)** aufnehmen; `F-L4` einem Meilenstein zuordnen;
   `docs/PARITAET.md` beim Aufsetzen einmal vollständig gegen `handbuch §7` prüfen. (F7)
7. **Diagnose ausliefern statt nur als CLI:** `akte pruefe`/`exportiere` als Menüpunkte, Menüpunkt
   „Diagnosepaket exportieren" mit DoD in M2, definierter Logort mit Rotation in `BETRIEB.md`, Risiko „Fehler im
   Einsatz ohne Entwickler vor Ort" in §9. (F5)
8. **Notbetrieb ohne Anwendung:** DoD in M4 „Aus dem Druckprodukt lässt sich die Lage fortführen"; Abschnitt in
   `BETRIEB.md`; Schichtwechsel-Ausdruck als Regel. (F14)
9. **Übungstermine ab M3 verteilen** (drei kurze Termine mit 2–3 Rechnern) statt eines großen in M8. (F8)
10. **EEB-Kern in ein eigenes Repository** `erfassungsbogen-kern` schneiden statt als Workspace im PWA-Repo;
    Vorwärtstoleranz des Codecs, Beispielbogen-Sammlung je Schemaversion in der CI, Bump-Regel. (F6, F6b)
11. **Zielplattformen als Entscheidung führen** (Windows 11 = Produkt, macOS = Nebenplattform, Linux = auf
    Anfrage); die macOS-Notarisierung als bezahlte Jahresentscheidung dokumentieren. (F10, F9)
12. **Abschnitt „Dauerbetrieb" in §8** mit 1,0–2,0 PW je Jahr; Upgrade-Takt an die Electron-Supportlinie binden
    oder die Abweichung begründen; ADR „Gherkin ist Bestand, `playwright-bdd` ist austauschbar". (F9)
13. **§1.5/§2.5 korrigieren:** Auf Windows 11 hat Tauri einen echten Installer-Größenvorteil; die Entscheidung für
    A muss ohne diesen Posten tragen. Differenzielle Auslieferung für Kanal 2 prüfen. (F13)
14. **Referenzmappe erzeugen** und das M4-Paritätskriterium darauf beziehen; Goldfiles versioniert ablegen. (F15)

### 12.4 Was dieses Urteil kippen würde

- **Nach unten (fällt):** Wenn Auflage 1 ergibt, dass auf den FüSt-Rechnern keine unsignierte, nicht
  freigegebene EXE startbar ist (AppLocker/WDAC oder eine Richtlinie, die per-User-Installationen unterbindet),
  fällt nicht Vorschlag A, sondern **jeder Desktop-Vorschlag** — dann ist die Frage nicht Electron vs. Tauri,
  sondern Desktop vs. eine Lösung, die ohne Installation auskommt.
- **Nach oben (hält ohne Auflagen 3–5):** Wenn Johannes bereit ist, das Ziel von „Excel-Parität" auf „M3+M4
  plus Kernausgaben" zu verschieben und die Excel für Kosten, Schichtplan und Logistik parallel weiterlaufen zu
  lassen, halbiert sich die kritische Strecke — dann sind 10–14 PW und rund ein Jahr realistisch, und die
  Schätzkritik verliert ihr Gewicht. `A §8` deutet das im letzten Absatz selbst an, macht es aber nicht zur
  Planungsgrundlage. Das ist die wirksamste Einzeländerung am ganzen Vorschlag.

---

Ende der Widerlegung (Linse Lieferbarkeit und Betrieb).
