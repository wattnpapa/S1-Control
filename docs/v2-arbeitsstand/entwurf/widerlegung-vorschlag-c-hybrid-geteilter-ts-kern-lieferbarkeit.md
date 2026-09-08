# Widerlegung Vorschlag C (Hybrid, geteilter TS-Kern) — Linse LIEFERBARKEIT UND BETRIEB

Key: `widerlegung-vorschlag-c-hybrid-geteilter-ts-kern-lieferbarkeit`
Stand: ABGESCHLOSSEN (2026-09-07); **nachgeprüft und ergänzt 2026-09-08** um die Linsenfrage „Wartbarkeit über Jahre / Abhängigkeit von jungen Werkzeugen" (F16–F18, Nachtrag zu F2, Auflage 9). Die Betriebsparameter aus `betriebsparameter-johannes.md` waren bereits im ersten Lauf eingearbeitet (§5 und F5, F6, F12, F13, F14) — dort war nichts nachzutragen.
Verdikt: **fällt** — nicht die Architektur, sondern die Liefer- und Betriebszusage in ihrer vorgelegten Form.

## Gliederung
1. Prüfauftrag, Prüfgegenstand und Maßstab
2. Was ich nicht angreife (damit die Findings scharf bleiben)
3. Der Velocity-Maßstab aus v1 — die Zahlen, an denen sich 21 PW messen lassen
4. Findings F1–F18
5. Entlastungen und Belastungen durch `betriebsparameter-johannes.md`
6. Findings-Tabelle (Schweregrad, Beleg, Rettung)
7. Verdikt und die Auflagen, unter denen der Vorschlag lieferbar würde
8. Was ich nicht prüfen konnte

---

## 1. Prüfauftrag, Prüfgegenstand und Maßstab

**Geprüfte Behauptung** (aus `vorschlag-c-hybrid-geteilter-ts-kern.md` §8): Ein KI-gestützter Einzelentwickler erreicht Excel-Parität in **21 PW Planwert, Spanne 18–30 PW**, verteilt auf M0–M8, und betreibt das Ergebnis danach im Einsatz.

**Maßstab** ist ausdrücklich `s1-historie-qualitaet.md` — also das, was v1 desselben Entwicklers unter denselben Bedingungen tatsächlich gekostet und erreicht hat. Zusätzlich herangezogen: die Release-Rohdaten beider Projekte (`scratchpad/analysis/gh-release-assets.tsv`, `git for-each-ref` im Bogen-Repo), weil sie die einzige harte Auskunft über Verbreitung und Release-Takt sind.

Der Prüfauftrag lautet Widerlegung. Ich habe deshalb bei jedem Punkt zuerst gesucht, ob der Vorschlag ihn bereits adressiert — mehrere Kandidaten sind daran gescheitert und stehen in §2.

## 2. Was ich nicht angreife (geprüft, vom Vorschlag bereits erledigt)

Diese Punkte lagen nahe, halten aber der Gegenprobe nicht stand und zählen deshalb **nicht** als Finding:

- *„Per-User-Installation ohne Admin-Rechte ist ungelöst."* Falsch als Angriff: `electron-builder`/NSIS installiert in der Voreinstellung **per Benutzer** nach `%LOCALAPPDATA%\Programs` ohne Elevation, und `electron-updater` aktualisiert auf demselben Weg. Der neue Betriebsparameter „keine Admin-Rechte" (`betriebsparameter-johannes.md`) trifft die Installation von Vorschlag C nicht. Er trifft etwas anderes — siehe F5.
- *„Der Offline-Installer ist eine unbelegte Annahme."* §2.5 markiert 90–120 MB als [Annahme]; die Messung bestätigt sie: die letzte v1-Windows-Datei ist **102.026.360 B ≈ 97 MiB** (`gh-release-assets.tsv`, Release `2026.06.07.14.49`). Die Annahme war korrekt, kein Finding — aber die Zahl gehört als Messwert in den Vorschlag (F12).
- *„Die Mehrclient-Tests sind nur Behauptung."* §7.3 ist mit vier Stufen, Fehlerinjektion über eine `Dateischnittstelle` und einem eigenen `test-windows`-Job konkreter als alles, was v1 je hatte (`s1-historie-qualitaet.md` §5: „kein Test mit zwei echten Clients/Prozessen auf einer Datei"). Der Angriff greift nur an einer Stelle — der Zielplattform-Testbank (F9).
- *„Der Renderer wird kostenlos aus v1 übernommen."* Nein: §1.4 und §5.3 schließen den v1-Renderer ausdrücklich aus. Der Angriff verlagert sich auf die Schätzung (F8).
- *„Das Speichermodell ist unbewiesen."* Es ist unbewiesen, aber der Vorschlag stellt genau dafür M0 mit explizitem Abbruchkriterium an den Anfang (§8 M0, E10). Das ist die stärkste Einzelentscheidung des Vorschlags aus Lieferbarkeitssicht. Angreifbar ist nur die Durchführbarkeit von M0s DoD (c) — F9.
- *„Undo/ETB/Backup sind Zusatzaufwand."* Sie fallen im Ereignismodell strukturell ab (§3.8). Kein Finding.

## 3. Der Velocity-Maßstab aus v1 — die Zahlen

Aus `s1-historie-qualitaet.md`, ergänzt um eigene Auswertungen der Rohdaten:

| Größe | Wert | Quelle |
|---|---|---|
| Aktive Entwicklungszeit v1 | 24.02.–21.03. (≈3,5 Wochen) + 31.05.–07.06. (≈1 Woche); dazwischen **10 Wochen Pause** | historie §1 Phasen 0–9 |
| Commits / Zeilen | 206 Commits, +70.488 / −20.827 | historie §1c |
| Arbeitsrhythmus | 45 Commits an einem Tag; **21 Commits zwischen 0 und 3 Uhr**, 40 zwischen 21 und 24 Uhr; SMB-Fixes 00:47–01:10 | historie §1c, §1 Phase 2 |
| Anteil Infrastruktur | Updater/Peer/Release/Signing **24 %** der Commits, Datenhaltung/Sync/Locking **19 %**, Tests/CI **11 %** → zusammen ~45 %; **62 % aller Testzeilen** entfallen auf den Updater | historie §3 |
| Fachliche Abdeckung nach dieser Zeit | ≈ die Hälfte der Excel-Felder; Ressourcenplanung, Schicht, Logistik, Kosten, FüSt-Personal, Meldekopf, Statusfeinheit **fehlen vollständig** | vollstaendigkeitskritik §3.1 |
| Qualitätsstand nach dieser Zeit | 42 + 91 Typfehler, `typecheck` ein No-op, 0 Renderer-Komponententests, E2E nicht in CI, 15 gerissene Lint-Grenzen, reproduzierter Lost Update | historie §4, §5; Kritik §3.4 |
| Verbreitung | **70 Releases**, über alle zusammen **76 Downloads** der Windows-`.exe`, 82 `.dmg`, 63 `.deb` | eigene Auswertung `gh-release-assets.tsv` (Spalte 4 = Downloadzähler) |

Und aus dem Schwesterprojekt (eigene Auswertung in `/Users/johannes/Developer/einheitenerfassungsbogen`):

| Größe | Wert |
|---|---|
| Zeitraum | 2026-07-11 bis 2026-09-06, 300 Commits |
| Release-Takt | **193 Tags** in ~8 Wochen; bis zu **16 Tags an einem Tag** (06.08.), je 8 am 05. und 06.09. |
| Stack | React 19, Vite 8, TS 7, vitest 4, Capacitor 8 (iOS/Android), Electron 43 + electron-builder + electron-updater, PWA, cucumber-E2E, `@testing-library/react` |
| Zielsystem | Einzelplatz: `localStorage`, keine Mehrclient-Datei-Synchronisation, kein Netzlaufwerk, kein zweites Fenster |

Diese beiden Datensätze tragen die Findings F1, F2, F6 und F7.

---

## 4. Findings

### F1 — blocker: Die Schätzung hat keine Kalenderachse und keine Verfügbarkeitsannahme

**Angegriffene Entscheidung:** §8 „Summe und Unsicherheit": 21,0 PW Planwert, Spanne 18–30 PW; R4-Frühwarnsignal „ein Meilenstein überzieht um mehr als 50 %".

**Beleg:** Nirgends im Vorschlag steht, was eine Personenwoche ist. S1-Control ist Ehrenamt (THW FK Oldenburg) neben einer Vollzeitstelle — belegbar am Arbeitsrhythmus: 21 Commits zwischen 0 und 3 Uhr, 40 zwischen 21 und 24 Uhr, die kritischen SMB-Fixes zwischen 00:47 und 01:10 (historie §1c, §1 Phase 2), und eine **10-Wochen-Pause vom 21.03. bis 31.05. mitten im Projekt** (historie §1 Phase 6/7).

**Szenario:** 21 PW à 40 h = 840 h. Bei einer realistischen ehrenamtlichen Verfügbarkeit von 8–12 h/Woche sind das **70–105 Kalenderwochen**, also 1,5–2 Jahre bis Excel-Parität — und die Spanne 18–30 PW wird zu 1,3–2,9 Jahren. Selbst bei 20 h/Woche sind es 42 Kalenderwochen. M0 + M1 (3,5 PW) allein sind dann 3–4 Monate, in denen es **keine benutzbare Anwendung** gibt (M2 liefert den ersten vertikalen Schnitt). Das Abbruchkriterium von M0 („ein Abbruch nach 2 PW ist billig", E10) ist unter dieser Umrechnung kein billiger Abbruch, sondern ein Vierteljahr. Und R4s Frühwarnsignal ist nicht auswertbar: ohne Termin je Meilenstein lässt sich „überzieht um mehr als 50 %" erst rückblickend feststellen.

**Warum das die Behauptung trifft:** Die Aufgabe lautet „in der genannten Zeit". Der Vorschlag nennt keine Zeit, sondern einen Aufwand. Aus einer Aufwandszahl ohne Verfügbarkeitsannahme lässt sich keine Lieferzusage ableiten — und die vorhandene Empirie (10 Wochen Pause in einem 15-Wochen-Projekt) sagt, dass die Umrechnung nicht wohlwollend ausfallen darf.

**Was den Vorschlag rettet:** PW in Stunden ausweisen; die wöchentliche Verfügbarkeit als Planungsgröße festschreiben; jedem Meilenstein ein Kalender-Zieldatum **und** ein Abbruchdatum geben; die Reihenfolge so schneiden, dass spätestens nach 6–8 Wochen Kalenderzeit etwas Vorführbares existiert (M0 zeitlich deckeln, M2 vorziehen bzw. M1 dahinter — siehe F2).

---

### F2 — schwer: Die Kopplungsbremse ist im Ein-Personen-Betrieb nicht beobachtbar, und der Release-Takt des Schwesterprodukts widerlegt die Pinning-Annahme

**Angegriffene Entscheidung:** §5.4 („jedes Produkt pinnt einen Submodul-Commit und zieht bewusst nach — kein floating main") und die Abbruchbedingung „wenn innerhalb von drei Monaten **zweimal** eine S1-Änderung ein Release von erfassungsbogen.app blockiert oder verzögert hat".

**Beleg:** Eigene Auswertung `git for-each-ref refs/tags` in `/Users/johannes/Developer/einheitenerfassungsbogen`: **193 Tags in ~8 Wochen**, bis zu **16 an einem Tag** (2026-08-06), je 8 am 05. und 06.09.2026. Das Produkt released mehrfach täglich. Der Vorschlag selbst nennt als Frühwarnsignal für R3: „Ein Kern-Commit, der nur wegen S1 nötig war und in erfassungsbogen.app Anpassungen erzwingt."

**Szenario, Schrittfolge:**
1. S1 ändert in M3 eine Signatur in `@bos/kern` (z. B. an `einheiten-liste.ts`, weil die FüSt-Tabelle andere Sortierkriterien braucht).
2. Der Bogen ist auf einen älteren Submodul-Commit gepinnt und merkt nichts — bis zum nächsten bewussten Nachziehen.
3. Beim Nachziehen (irgendwann in den nächsten Tagen, weil das Produkt täglich released) fällt die Anpassung an, mitten in einem Bogen-Release.
4. Der Entwickler ist beide Rollen zugleich. Er „blockiert" sich nicht — er wechselt den Kontext und repariert. **Das Ereignis, auf das die Abbruchbedingung hört, tritt definitionsgemäß nie ein.**

**Warum das die Behauptung trifft:** Die Abbruchbedingung ist die einzige Rückfalloption für das erklärte Hauptrisiko des gesamten Vorschlags (§1.5, R3). Sie ist an ein Signal geknüpft, das nur in einer Mehr-Personen-Organisation existiert. Damit ist R3 faktisch ungesichert — der Vorschlag glaubt, eine Notbremse zu haben, die keinen Griff hat. Zusätzlich ist „bewusst nachziehen" bei 2–3 Tags pro Tag im Bogen-Repo kein gelegentlicher Vorgang, sondern eine tägliche Pflichtaufgabe, die in keiner PW-Position steht (§8: „die laufende Pflege des geteilten Kerns … nicht in der Spanne enthalten").

**Nachtrag (2026-09-08), der den Befund verschärft:** `einheitenerfassungsbogen/.github/workflows/release.yml` heißt „Build & Release" und triggert auf `push: branches: [main]` mit `permissions: contents: write`; die Jobkette ist `prepare → check (npm ci, typecheck, test, test:e2e) → build-pages/deploy-pages + build-win` (`build-mac` steht auf `if: false`). **Jeder Push auf `main` erzeugt also ein Release** — das erklärt die 193 Tags bei 300 Commits und bedeutet: es gibt in diesem Produkt gar kein Release-Fenster, in dem eine Blockade als Ereignis auffallen könnte. Ein Submodul-Bump ist selbst ein Push auf `main` und damit selbst ein Release. Die Abbruchbedingung „hat zweimal ein Release blockiert oder verzögert" hat damit nicht nur keinen Beobachter (Ein-Personen-Betrieb), sondern auch keinen beobachtbaren Vorgang.

**Was den Vorschlag rettet:** Die Abbruchbedingung durch etwas Zählbares ersetzen, das aus den Repos ablesbar ist — z. B. „Anzahl Tage im Monat, an denen ein Commit beide Repos anfassen musste" oder „Anzahl Submodul-Bumps im Bogen-Repo pro Woche", mit vorab festgelegter Schwelle und einem CI-Schritt, der sie auswertet. Zusätzlich das Nachziehen automatisieren (Bot-PR im Bogen-Repo bei jedem Kern-Tag) und die laufende Kernpflege als eigene Betriebsposition mit Zahl führen.

---

### F3 — schwer: Der erste Baustein, der in den geteilten Kern soll, verletzt die Aufnahmeregel des Kerns

**Angegriffene Entscheidung:** §1.1 (d) und §4.6 letzte Zeile: „Ereignisprotokoll, HLC, Fold-Motor — geteilt (`@bos/kern`), **ja** (generisch)". Gegenüber §5.4 Aufnahmeregel 1: „Aufnahme nur, wenn **beide** Produkte den Baustein aufrufen. Ein ‚das brauchen wir sicher auch mal' reicht nicht."

**Beleg (Widerspruch im Dokument selbst):** §4.6 begründet die Aufnahme mit „erfassungsbogen.app kann damit später sein `localStorage`-Modell ablösen — **muss aber nicht**". Das ist wörtlich das „brauchen wir sicher auch mal", das Regel 1 verbietet.

**Warum das die Behauptung trifft (Lieferbarkeit, nicht Ästhetik):**
1. Der HLC-/Fold-/Ereigniskatalog-Teil ist genau der Teil, der in M0–M5 **am häufigsten geändert** wird (neue Ereignistypen bei jedem Fachmeilenstein M3–M6). Liegt er im Kern, unterliegt jede dieser Änderungen der Additiv-Regel (§1.5 Punkt 1), dem Versions-Pinning (§5.4 Regel 6) und dem Bundle-Budget des Bogens (Regel 5) — maximale Prozesslast für null Nutzen, weil es nur einen Konsumenten gibt.
2. Die durchgesetzten Regeln greifen hier nicht: ESLint prüft die **Importrichtung** (`@bos/kern` importiert nichts aus `@s1/*`), nicht die Bedingung „wird von beiden aufgerufen". Regel 1 ist die einzige Aufnahmeregel, die *nicht* mechanisch durchsetzbar ist — und sie wird als erstes gebrochen.
3. Damit wächst die Angriffsfläche von R3 (Kopplung) um genau den Teil, der am volatilsten ist. Das ist die Umkehrung des Zwecks: geteilt werden sollte das Stabile (Codec, Bogenmodell, Vokabulare — 8 Schemaschritte in einem Jahr), nicht das Neue.

**Was den Vorschlag rettet:** HLC, Fold-Motor, Ereigniskatalog und Upcaster nach `@s1/domaene` (oder in ein drittes Paket mit nur einem Konsumenten). In `@bos/kern` nur, was der Bogen **heute** aufruft. Ein CI-Test im Kern-Repo, der für jedes exportierte Modul nachweist, dass beide Produkte es importieren (Import-Graph beider Repos gegen die Export-Liste). Falls der Bogen sein `localStorage`-Modell später wirklich ablöst, wandert das Modul dann — additiv, nach der eigenen Regel.

---

### F4 — schwer: Der historisch teuerste Teilbereich wird nicht kleiner, sondern verdoppelt — und hat keine eigene Position

**Angegriffene Entscheidung:** §2.5 „Aktualisierung, zwei Wege": electron-updater gegen GitHub-Releases **plus** eine eigene Update-Ablage auf dem Share (`aktuell.json`, SHA-256, Cache-Verzeichnis, Installerstart); §7.4 Release-Job erzeugt „GitHub-Release + `latest.yml` + `aktuell.json`"; Verortung im Plan: ein Stichwort in **M8 (2,5 PW)**.

**Beleg:** historie §3 und §8.1: Updater/Peer-Update/Release-CI/Signing = **50 Commits (24 %)**, `updater.ts` 33× geändert, `build-main.yml` 20×, `package.json` 25×, **2.985 Testzeilen = 62 % aller Testzeilen** für ein Subsystem, „das mit der Fachaufgabe nichts zu tun hat"; letzter Updater-Bug am 07.06. war ausgerechnet der Versionsvergleich (`ffa14f8`). historie §8.1 führt diesen Bereich als **Rang 1** der Zeitfresser.

**Szenario:** Vorschlag C übernimmt `updater-versioning.ts` unverändert (§5.3) für Weg 1 und braucht denselben Vergleich noch einmal für Weg 2 (`aktuell.json` trägt eine Version, die gegen die laufende verglichen werden muss). Zwei Wege heißt: zwei Versionsvergleiche, zwei Downloadpfade, zwei Prüfsummenverfahren (`latest.yml`-sha512 vs. `aktuell.json`-sha256), zwei Fehlerbilder im Feld, zwei Testflächen — bei einem Produkt, das im Einsatznetz **kein Internet** hat, also Weg 1 dort nie benutzt.

**Warum das die Behauptung trifft:** Der Vorschlag rechnet die Einsparung korrekt (LAN-Peer-Update −920 Zeilen, Share-Ablage +200 Zeilen, E9), verrechnet aber nicht, dass Weg 1 **bestehen bleibt**. Und M8 trägt neben diesen zwei Wegen noch: Installer für vier Ziele, zwei Importer, Diagnose/Log, Handbuch, Tastenkürzel, Zugriffsschutz und die Abnahme — in 2,5 PW. Zum Vergleich: derselbe Themenbereich kostete in v1 ein knappes Viertel des Gesamtaufwands. Dazu kommt Ungebuchtes: E2E lief in v1 **nie in CI** (historie §5), soll aber in v2 auf einem Windows-Runner gegen die gebaute Electron-App laufen (§7.4, 3–8 min [Annahme]) — plus der neue `test-windows`-Job. CI-/Release-Engineering hat in keinem Meilenstein eine Zeile.

**Was den Vorschlag rettet:** Weg 1 (electron-updater) streichen — im Einsatznetz nutzlos, im OV durch dieselbe Share-/USB-Ablage bedienbar; genau **ein** Aktualisierungsmechanismus, ein Versionsvergleich, ein Prüfsummenverfahren. M8 auflösen (F11) und „CI, Release, Verteilung" als eigene Position mit mindestens 1,5 PW führen, kalibriert an historie §3.

---

### F5 — schwer: Ohne Admin-Rechte fällt der UDP-Beschleuniger aus — und mit ihm die Gegenmaßnahme zu R10

**Angegriffene Entscheidung:** §2.3 (UDP im Kern-Worker), §3.4 („UDP als Beschleuniger, Port 41235 … Versand als Unicast an die IPs aus `praesenz/` plus Broadcast"; „Erwartete Sichtbarkeitslatenz: mit UDP < 1 s"), §9 R10 Gegenmaßnahme („UDP-Unicast an bekannte Peers als Beschleuniger").

**Beleg:** `betriebsparameter-johannes.md`: „**keine Admin-Rechte** auf den FüSt-Rechnern … Kein Dienst, kein Treiber, keine Systemänderung." Ein Prozess, der UDP-Pakete auf Port 41235 **empfangen** soll, braucht unter Windows eine Eingangsregel der Defender-Firewall. Die Abfrage („Windows-Sicherheitshinweis") verlangt Administrator-Anmeldedaten, `New-NetFirewallRule` ebenso; ohne Zustimmung bleibt es beim Blockieren. Ausgehender Unicast ist erlaubt — der Empfang ist es nicht, und beim Unicast ist der Empfänger die entscheidende Seite. `nas-speicher-recherche.md` §8.1 führt Firewall bereits als einen der Gründe, an denen Broadcast scheitert; der neue Betriebsparameter macht daraus einen Dauerzustand statt eines Sonderfalls. [Annahme: kein Gruppenrichtlinien-Objekt setzt die Regel bereits — zu prüfen mit `Get-NetFirewallRule` auf einem FüSt-Rechner.]

**Warum das die Behauptung trifft:** Die zugesagte Sichtbarkeit von „< 1 s" existiert im Zielumfeld nicht; es bleibt bei 2–4 s für wachsende Dateien und **bis 10 s** für die erste Datei eines neuen Clients (§3.4, Windows-Directory-Cache). Das ist tragbar — aber R10 („Sichtbarkeitslatenz wird als Fehler wahrgenommen … untergräbt das Vertrauen mehr als ein sichtbarer Fehler") nennt UDP ausdrücklich als Gegenmaßnahme, und die fällt weg. Betriebsseitig entsteht außerdem genau die Fehlerklasse, die v1 in Debug-Konsolen ertränkt hat (historie §8.1 Punkt 4: Sync-Log-Konsole, UDP-Monitor, Peer-Status, „Symptom fehlender lokaler Multi-Client-Testbarkeit"): ein Beschleuniger, der bei manchen Rechnern geht und bei anderen nicht, ohne dass der Anwender den Unterschied erklären kann.

**Was den Vorschlag rettet:** Entweder UDP ersatzlos streichen (spart Code, spart die Debug-Oberflächen, macht die Latenz einheitlich und erklärbar) und §3.4/R10 allein auf den Poll stützen — mit ehrlicher Anzeige, die der Vorschlag ohnehin vorsieht; **oder** eine einmalige, dokumentierte Firewall-Eingangsregel als Installationsvoraussetzung der FüSt-IT festschreiben, in M0 auf einem echten FüSt-Rechner verifizieren und im Handbuch als Voraussetzung führen. In beiden Fällen die Zusage „< 1 s" aus dem Dokument nehmen, solange sie nicht auf dem Zielrechner gemessen ist.

---

### F6 — schwer: Es gibt keine belegte Anwenderbasis; Einführung und Schulung sind zugleich ausgeschlossen und als DoD gefordert

**Angegriffene Entscheidungen:** §8 „Nicht in der Spanne enthalten: **Feldabnahme über mehrere Übungen, Schulung der FüSt**, …" gegen M8 DoD „**eine Übung wird vollständig in v2 geführt, ohne dass die Excel parallel läuft**" (in 2,5 PW enthalten) und M7 DoD „Abnahme mit Johannes"; sowie die Definition „Excel-Parität = alle F-A1…N-9 erfüllt **oder ausdrücklich als ‚entfällt' begründet**".

**Belege:**
- Eigene Auswertung `gh-release-assets.tsv`: **70 Releases** von v1 zwischen 2026-02-26 und 2026-06-07, dabei über alle Releases zusammen **76 Downloads** der Windows-`.exe` (≈1,1 je Release), 82 `.dmg`, 63 `.deb`. Das ist die Signatur eines Projekts, das seine eigenen Artefakte prüft, nicht eines verteilten Werkzeugs.
- `betriebsparameter-johannes.md`: „**keine**: keine produktiven SQLite-/JSON-Einsatzdateien, keine gefüllten Excel-Mappen." v1 wurde nie in einem Einsatz geführt. (Damit schließt sich auch die Lücke, dass Downloadzähler eine USB-Verteilung nicht ausschließen würden.)
- historie §8: die Zeitfresser waren Technik, nicht Anwenderrückmeldung; es gibt keine Spur von Abnahmeterminen, Schulungsmaterial oder Anwenderdefekten in 206 Commits.

**Warum das die Behauptung trifft — zweifach:**
1. **Widerspruch in der Schätzung.** Feldabnahme ist ausgeschlossen und gleichzeitig DoD von M8. Entweder ist M8 unterschätzt, oder die Parität ist nicht erreicht, wenn M8 abgehakt ist. Beides bricht die Zusage „bis Excel-Parität in 18–30 PW".
2. **Der Betriebsteil der Behauptung ist unbelegt.** „Und danach im Einsatz betreibt" setzt Anwender voraus. Der einzige Datenpunkt zur Einführung dieses Werkzeugs in diese FüSt ist ein vollständiges Nicht-Ankommen. Der Vorschlag adressiert die *Bedienqualität* (R5, ehrlich und gut), aber nirgends den **Einführungspfad**: wer entscheidet in der FüSt über die Ablösung der Excel, wie sieht der Parallelbetrieb aus, was ist die Rückfallregel, wer schult die Wechselschichten, wie kommt eine neue Version auf Rechner, die drei Monate ausgeschaltet waren. „Handbuch und Abkürzungsliste in der App" (M8) ist Dokumentation, keine Einführung.
3. **Die Parität hat keinen unabhängigen Prüfer.** Der Entwickler ist Autor der Anforderungsliste, Umsetzer, Abnehmer (§8 M7 „Abnahme mit Johannes") und darf Anforderungen als „entfällt" begründen. Das Kriterium ist damit nicht falsifizierbar.

**Was den Vorschlag rettet:** Einen Meilenstein „Einführung" mit eigenem Aufwand aufnehmen: Kurzanleitung (2 Seiten, Papier), ein Schulungstermin je Schicht, benannte Abnahmeperson aus der FüSt, die **nicht** der Entwickler ist, Parallelbetriebsregel (Excel bleibt bis zur zweiten erfolgreichen Übung führend), Rückfallregel (siehe F10) und ein Verteilungsverfahren, das ohne Netz funktioniert. Parität erst erklären, wenn eine Übung ohne Excel gelaufen ist — und diese Übung in die Spanne aufnehmen, nicht daneben.

---

### F7 — mittel: Die Velocity-Belege stammen aus der Domäne, in der v1 gerade nicht gescheitert ist

**Angegriffene Entscheidung:** §8 Einleitung: „Belegte Vergleichswerte … erfassungsbogen.app hat 300 Commits und ~24.800 Zeilen `src/` in gut zwei Monaten erreicht; bmecatEditor 31,5 kLoC Rust in 9 Tagen … Diese Werte sind Grünfeld-Geschwindigkeiten mit hoher KI-Beteiligung; sie gelten hier nur, weil auch v2 grünes Feld ist."

**Beleg:** Eigene Auswertung `package.json` von `einheitenerfassungsbogen`: das Produkt ist eine Einzelplatz-SPA/PWA mit `localStorage` (Kandidat für die Kernextraktion ist ausdrücklich die `localStorage`-Hülle, §5.4). Es hat **keine** Mehrclient-Dateisynchronisation, kein Netzlaufwerk, kein zweites Fenster, keine Presence, keinen Fold über fremde Ereignisse. bmecatEditor testet E2E nur unter macOS (`bmecat-stack-muster.md` R6). Dem gegenüber: v1 versenkte 45 % der Commits und über die Hälfte der Testzeilen in Updater, Release, Sync, Locking, Datenhaltung (historie §3) — genau in den Dimensionen, in denen die Vergleichsprojekte nichts leisten.

**Warum das die Behauptung trifft:** Die Schätzung überträgt Fachlogik-Geschwindigkeit auf ein Vorhaben, dessen historische Kosten woanders lagen. Sie ist damit nicht falsch berechnet, sondern falsch kalibriert — und die Kalibrierungsquelle, die zur Verfügung stünde (v1, historie §3/§8), wird in §8 nur für die Rohzahl „206 Commits, +70.488/−20.827" zitiert, nicht für die Verteilung.

**Was den Vorschlag rettet:** Die Schätzung an v1 kalibrieren: v1 ≈ 4,5 aktive Wochen (bei ehrenamtlicher Verfügbarkeit, F1) für die halbe Excel-Abdeckung, ohne Renderer-Tests, ohne Mehrclient-Korrektheit, mit 133 Typfehlern. Einen Infrastrukturzuschlag als eigene Zeile führen (CI/Release/Verteilung/Diagnose), statt ihn in die Fachmeilensteine zu mischen, und die Vergleichsprojekte nur noch für die Fachlogik-Anteile heranziehen.

---

### F8 — mittel: Der Renderer ist der größte Einzelposten, hat keine eigene Position, und seine Unsicherheit wird auf ±1 Woche gedeckelt

**Angegriffene Entscheidung:** §8 „Wo die Unsicherheit sitzt": „**Die Oberfläche, nicht die Logik.** … Der Schichtplan …, das FüOrg-Bild und die Einheitentabelle mit ~40 Spalten samt Ein-/Ausblendgruppen (F-L5) sind die drei Ansichten, die **eine Woche mehr oder weniger** kosten können."

**Belege gegen die Deckelung:**
- v1 hatte **10.097 Renderer-Zeilen** (88 Dateien, 4.165 Zeilen Hooks) für einen kleineren Funktionsumfang — ohne einen einzigen Komponententest, mit 91 Typfehlern, `App.tsx` 46× geändert, zwei volle Refactoring-Tage nach acht Tagen (historie §2, §4.1, §5, §1 Phase 4).
- v2 verlangt **zusätzlich**: Komponententests je Ansicht (§7.1 „jede Ansicht mindestens ‚rendert mit leerem/typischem Zustand, Bedienelement löst erwartetes Kommando aus'"), Tastatur-first **ab M3** (R5), zwei Fenster mit gemeinsamer Projektion, ETB-Ansicht, Eingangskorb mit Diff-Darstellung, Anforderungs-/Ablösungsansicht, Dienstposten- und Schichtplanraster, Prüfhinweise, Peer-/Standanzeige.
- Das FüOrg-Produkt ist keine Ansicht: §6.2 Nr. 5 verlangt „Export als SVG und als PDF … und lässt **Positionen manuell nachjustieren**". Manuell nachjustierbare Positionen sind persistente Daten, also weitere Ereignistypen, Fold-Regeln und eine Direktmanipulations-Oberfläche. v1 hat nichts Vergleichbares; die Excel zeichnet das von Hand.

**Warum das die Behauptung trifft:** Die UI ist der einzige Bereich, in dem der Vorschlag **keinen** Vorbau hat (Kern: vorhanden; Fachlogik: spezifiziert; Speicher: M0 als Beweis) — und sie ist der Bereich, den die Schätzung am wenigsten auflöst. Sie steckt verteilt in M2 (3,0), M3 (2,5), M5 (1,5), M6 (2,5), M7 (3,0), gemischt mit Domänenlogik, ohne eine einzige eigene Zahl. Eine Deckelung auf ±1 PW für drei Ansichten ist mit v1s Erfahrung nicht vereinbar.

**Was den Vorschlag rettet:** Den Renderer als eigene Position mit eigener Spanne führen (Ansichtenliste × Aufwand, wie die Anforderungsliste F-A1…N-9 als Checkliste). Die FüOrg-Positionierung entweder streichen (nur automatisches Layout aus dem Abschnitts-Baum, manuelle Nachbearbeitung im externen SVG-Programm) oder als eigenen Meilenstein mit eigener Ereignisfamilie planen. Die drei genannten Ansichten früh prototypisch bauen (in M2), damit die Deckelung geprüft ist, bevor M5–M7 darauf planen.

---

### F9 — mittel: M0 ist das Abbruchtor, hängt aber an einem physischen Termin — und es gibt keine Windows-Testbank

**Angegriffene Entscheidung:** §8 M0 DoD (c): „`skripte/smb-latenz.mjs` liefert Zahlen **vom Share der FüSt**, und das Poll-Intervall ist daraus begründet statt gesetzt"; §7.3 Stufe 4 „einmal je Meilenstein auf dem realen Share der FüSt"; §10 Punkt 1 „von einem Windows-Client und einem Mac".

**Beleg:** `betriebsparameter-johannes.md` beantwortet NAS-Typ (Synology), NTP, Windows 11 und Clientzahl — **nicht** die Messung. `nachlese-build-ci-latenz-messwerte.md` §1: auf der Entwicklungsmaschine ist kein SMB-Share gemountet. Die Entwicklungsumgebung ist darwin (Umgebungsangabe der Sitzung); ein Windows-Rechner ist nirgends belegt. §7.4 prüft Windows ausschließlich auf GitHub-Runnern — die haben weder ein NAS noch ein SMB-Share, also genau die Eigenschaft nicht, an der v1 gescheitert ist (historie §8.1 Rang 2).

**Warum das die Behauptung trifft:** Das Abbruchtor des gesamten Vorhabens ist an einen Ortstermin gebunden, dessen Terminierung nicht in der Hand des Entwicklers liegt (Einsatz-NAS im OV, Zugriff nur bei Anwesenheit). Solange dieser Termin nicht steht, ist M0 nicht abschließbar und das Vorhaben hängt vor dem ersten Meilenstein. Und selbst nach der Messung bleibt die Zielplattform zwischen den Ortsterminen ungetestet: Stufe 4 findet „je Meilenstein" statt, die Stufen 1–3 laufen gegen ein Temp-Verzeichnis auf einem Mac. Der Vorschlag erkennt die Notwendigkeit (`test-windows` ist „neu und notwendig"), zieht aber nicht die Konsequenz für die Entwicklungsumgebung.

**Was den Vorschlag rettet:** Eine dauerhafte Testbank in M0 aufnehmen und budgetieren: ein Windows-11-Rechner oder eine Windows-VM plus eine SMB-Freigabe im selben LAN, die dem Einsatz-NAS technisch entspricht (Synology-Gerät oder Samba mit gleicher Version/Konfiguration). Damit werden Stufe 2–4 jederzeit lauffähig, die Latenzmessung wird wiederholbar, und der Ortstermin am Einsatz-NAS wird zur **Bestätigung** statt zur einzigen Quelle. M0 dann so schneiden, dass es ohne den Ortstermin abschließbar ist und nur die Bestätigung nachläuft.

---

### F10 — mittel: Für den schlimmsten Betriebsfall gibt es keinen Reparaturweg vor Ort

**Angegriffene Entscheidung:** §9 R1 („Fold-Regelwerk unvollständig … erzeugt einen **stillen** Falschzustand … Schlimmster denkbarer Fehler in einem Führungswerkzeug") — die Gegenmaßnahmen sind ausschließlich vorbeugend (Konzept vor Code, Erschöpfungsprüfung, Property-Tests, sichtbare Konflikthinweise). Dazu K12 („Kompensationsereignis; **nur eigene** Ereignisse … fremde nur als expliziter, protokollierter Vorgang **mit Rolle**") und §10 Punkt 11, der empfiehlt, Rollen **zum Start zu streichen** (Variante a).

**Szenario, Schrittfolge:** 02:40 Uhr, Großlage, drei Rechner. Der Meldekopf-Client hat wegen eines Fold-Fehlers zwei Einheiten in einen falschen Abschnitt gefaltet; der Fehler steckt in fremden Ereignissen. Die FüSt sieht eine falsche Lage.
1. Handkorrektur an der Datei: ausgeschlossen — §3.2 verbietet jedem Client das Anfassen fremder Dateien, und CRC32 + `vorherHash`-Kette machen eine Editor-Korrektur erkennbar kaputt. (Bei v1 war die Datei notfalls im Editor reparierbar — das war ein unbeabsichtigter Betriebsvorteil, den v2 aufgibt.)
2. Kompensation gegen fremde Ereignisse: laut K12 nur „mit Rolle" — Rollen sind zum Start gestrichen (§10 Punkt 11 a). Es gibt also kein Kommando.
3. Neu erfassen: die betroffenen Einheiten manuell doppelt anlegen — erzeugt eine falsche ETB-Historie und Dubletten in den Summen.
4. Rückfall auf die Excel: möglich (`einheiten.xlsx` im Oldenburg-Layout, §3.8), aber nirgends als Verfahren beschrieben, nicht geübt, und nach F6 kann niemand außer dem Entwickler den Schritt.

**Warum das die Behauptung trifft:** „Danach im Einsatz betreibt" heißt: Fehler treten auf, wenn der Entwickler nicht da ist. Der Vorschlag hat für den von ihm selbst als schlimmsten benannten Fall keine kurative Antwort, und die Revisionssicherheit (Hash-Kette, Append-only, kein Löschen), die fachlich richtig ist, verschließt zusätzlich den improvisierten Ausweg.

**Was den Vorschlag rettet:** (a) Einen Korrekturereignistyp definieren, den jeder FüSt-Arbeitsplatz gegen **fremde** Ereignisse schreiben darf — protokolliert, im ETB sichtbar, mit Grundtext; das erhält die Nachvollziehbarkeit und schafft den Weg. (b) `s1 reparieren` in der CLI: Akte falten, Abweichung benennen, Kompensationsstapel erzeugen. (c) Eine schriftliche Notfallstrecke „Lage einfrieren → Auswertung als XLSX exportieren → in der Excel weiterführen" mit einem Blatt im Handbuch, geübt in der Einführung (F6). (d) Punkt 11 aus §10 in diesem Licht neu entscheiden: eine minimale Rolle „FüSt" ist billiger als der fehlende Reparaturweg.

---

### F11 — mittel: M8 ist eine Sammelposition, trägt die gesamte Betriebsfähigkeit und widerspricht R5

**Angegriffene Entscheidung:** §8 M8 (2,5 PW): „Installer für alle Ziele; Update-Ablage auf dem Share + electron-updater; `s1 uebernehmen` und `s1 import-excel`; Diagnose/Log; Handbuch und Abkürzungsliste in der App (F-L4); Tastenkürzel für alle Kernfunktionen (N-5); Zugriffsschutz für Admin-Funktionen (N-7); Abnahme im Übungsbetrieb."

**Belege:**
- Widerspruch zu R5: „Tastenkürzel und Eingabemaske sind **Anforderung ab M3**, nicht Politur am Ende." M8 führt „Tastenkürzel für alle Kernfunktionen" trotzdem als eigenen Inhalt. Entweder doppelt gezählt oder in M3 nicht enthalten — in beiden Fällen ist eine der beiden Zahlen falsch.
- Widerspruch zur Spanne: „Abnahme im Übungsbetrieb" ist Inhalt von M8, „Feldabnahme über mehrere Übungen" ist laut derselben Seite **nicht** in der Spanne enthalten (F6).
- „Diagnose/Log" ist im gesamten Vorschlag die **einzige** Erwähnung von Protokollierung. Es gibt keine Aussage zu Logdateien, Rotation, Speicherort, Detailgrad, zum Sammeln eines Diagnosepakets oder zum Weg, wie ein Fehlerbild aus der FüSt zum Entwickler kommt. v1 hat dafür eine ganze Klasse von Werkzeugen gebaut, weil Mehrclient-Fehler nicht reproduzierbar waren (historie §8.1 Punkt 4).

**Warum das die Behauptung trifft:** Die Betriebsfähigkeit — Verteilung, Aktualisierung, Diagnose, Dokumentation, Zugriffsschutz, Abnahme — ist der Teil der Zusage „betreibt ihn danach im Einsatz", und er steckt vollständig in einer 2,5-PW-Position, die zusätzlich zwei nach F14 gegenstandslose Importer trägt.

**Was den Vorschlag rettet:** M8 in vier Positionen auflösen: „Verteilung/Aktualisierung", „Diagnose und Protokollierung" (mit einem konkreten Konzept: rotierende Logdatei je Client, `s1 diagnose` erzeugt ein ZIP aus Log + Akte + Umgebungsangaben, das per USB/Mail zum Entwickler geht — die Ereignisakte ist ohnehin schon der ideale Diagnosegegenstand, weil sie **wiederabspielbar** ist; das sollte der Vorschlag ausdrücklich als Diagnosestrategie benennen), „Handbuch/Schulung" (F6) und „Abnahme". Tastenkürzel aus M8 streichen (in M3 verortet).

---

### F12 — gering: Eine tragende Nebenbegründung des Stacks ist mit Windows 11 verbraucht; der eigene Preis ist jetzt gemessen

**Angegriffene Entscheidung:** §2.2 letzter Absatz und §2.5: „WebView2 offline (`fixedRuntime` ≈ 180 MB oder `offlineInstaller` ≈ 127 MB, R1) — bei Electron ist der Installer **per Konstruktion offline vollständig**. Das ist gegenüber Tauri der Punkt, der ohne Aufwand erfüllt ist."

**Beleg:** `betriebsparameter-johannes.md`: „Client-Betriebssystem **Windows 11** … WebView2-Evergreen-Laufzeit ist auf Windows 11 vorinstalliert; `fixedRuntime`/`offlineInstaller` ist kein Muss mehr, nur noch Absicherung." Der Posten entfällt also auf beiden Seiten. Gleichzeitig ist der Electron-Preis jetzt kein Schätzwert mehr: **102.026.360 B ≈ 97 MiB** je Windows-Installer (eigene Auswertung `gh-release-assets.tsv`, Release `2026.06.07.14.49`) — die Annahme „90–120 MB" ist bestätigt — plus R9 (Chromium-CVE-Dauerlast).

**Warum das die Behauptung berührt:** Es kippt die Entscheidung E2 **nicht**: das Hauptargument (§2.2, der TS-Kern muss außerhalb des UI-Threads mit Dateizugriff laufen, Rust kann kein TS ausführen) ist von den neuen Parametern unberührt, ebenso E2E-Beibehaltung und Updater-Vorbau. Aber die Nebenbegründung muss aus der Entscheidungsgrundlage verschwinden, damit sie in der Synthese nicht als Beleg zitiert wird — sonst steht in einem Jahr eine Entscheidung auf einem Argument, das schon bei der Entscheidung falsch war.

**Was den Vorschlag rettet:** §2.2/§2.5 um den WebView2-Posten kürzen, E2 allein auf das Ausführungsort-Argument stellen, die 97 MiB als Messwert eintragen (M31 verlangt „Messwert an jeder Performance-Aussage" — das gilt auch hier).

---

### F13 — gering: Der Abnahmemaßstab für M7 existiert nicht

**Angegriffene Entscheidung:** §8 M7 DoD: „ein Ausdruck der Stärkeübersicht ist neben dem **Excel-Ausdruck derselben Lage** prüfbar gleichwertig (Abnahme mit Johannes)"; §10 Punkt 17 verlangt dafür „einen Excel-Ausdruck einer realen Lage".

**Beleg:** `betriebsparameter-johannes.md`: „**keine gefüllten Excel-Mappen**." Es gibt keine reale Lage in der Excel, also auch keinen Ausdruck.

**Warum das die Behauptung trifft:** Ein DoD, dessen Referenzartefakt nicht existiert, ist nicht abnehmbar. Der Maßstab muss erst hergestellt werden — eine Übungslage vollständig in der Excel erfassen und drucken —, und dieser Aufwand steht nirgends.

**Was den Vorschlag rettet:** Eine synthetische Referenzlage („Übung Ammerland", 40–60 Einheiten über alle Bereiche und Status) einmal aufbauen und als Fixture einchecken. Sie zahlt dreifach: Golden Files für §7.1, Datensatz für die Mehrclient-Simulation, Schulungsmaterial für die Einführung (F6). Als eigene kleine Position führen, vor M7.

---

### F14 — gering (Entlastung mit Nebenwirkung): Die Migrationsanteile sind gegenstandslos

**Betroffene Teile:** §3.10 a/b/c, `s1 uebernehmen`, `s1 import-excel`, R6 („Verlust der Historie beim Umstieg / Doppelbetrieb"), §10 Punkte 13/14/16, Übernahme-Ereignisse `EinsatzAusV1Uebernommen` / `EinsatzAusExcelUebernommen`, Teile von M8.

**Beleg:** `betriebsparameter-johannes.md`: „**keine** produktiven SQLite-/JSON-Einsatzdateien, keine gefüllten Excel-Mappen … Grüne Wiese ohne Migrationspfad."

**Wirkung:** Echte Entlastung von rund 1,0 PW (der Vorschlag rechnet selbst −0,5 PW allein für den Excel-Import, §10 Punkt 13), R6 fällt ersatzlos, zwei Ereignistypen und zwei CLI-Befehle entfallen, `exceljs`/SheetJS als Leseabhängigkeit entfällt.

**Nebenwirkung, die als Finding bleibt:** Ohne Altdaten gibt es (a) keine Testfixture aus der Wirklichkeit (F13), (b) keine belegten Einsatzgrößen — die drei widersprüchlichen Baselines 150 / 5.000 / 272 (Kritik §3.6 Punkt 6) bleiben unaufgelöst, und (c) keinen sanften Übergang: die FüSt wechselt kalt von der Excel zu v2, was den Einführungspfad (F6) und die Rückfallregel (F10) wichtiger macht, nicht unwichtiger.

**Was den Vorschlag rettet:** Streichen und die freiwerdende Zeit **nicht** als Puffer verbuchen, sondern gegen F4 (Verteilung/CI) und F8 (Renderer) umlegen; die Baseline-Frage über die synthetische Referenzlage (F13) schließen.

---

### F15 — mittel: Die Selbstbindung durch Dokumente hat bei diesem Autor historisch nicht getragen

**Angegriffene Entscheidungen:** §1.5 Punkt 4, §5.4 („Aufnahmeregel … **durchgesetzt, nicht nur beschrieben**"), §9 R14 („Konzeptdokument je Vorhaben **vor** dem Code, ADR-Verzeichnis ab Tag 1"), M0 DoD (d)/(e).

**Gegenbelege aus demselben Repo:**
- `AGENTS.md` §7 verbot Big-Bang-Rewrites; die SQLite→JSON-Migration lief als Big Bang in **drei Commits in 20 Minuten**, −1632 Zeilen, Testbasis von 1.034 auf 280 Zeilen gekürzt, Typecheck dabei rot mit 42 Fehlern (historie §1 Phase 7, „Lehre").
- `AGENTS.md` §35–39 forderte noch Monate nach dem SQLite-Ausbau verpflichtende WAL-Pragmas; README beschrieb weiterhin SQLite-Dateien und WAL-Mehrclientbetrieb (historie §6, 20 Driftpunkte über vier Dokumente).
- Die Grenzwerte 400/80/10 aus `AGENTS.md` §6 sind als **Warnungen** konfiguriert und werden an 15 Stellen gerissen (historie §4.2).
- Für die drei größten Architekturentscheidungen (per-Einsatz-SQLite, Utility-Prozess, JSON-Migration) existiert **keine schriftliche Begründung** im Repo (historie §8.3) — obwohl genau das die Regel war.

**Fairness-Abzug:** Ein Teil der Regeln von Vorschlag C ist tatsächlich mechanisch: ESLint-Grenzregeln, Bundle-Budget im CI, Erschöpfungstest gegen `EREIGNIS_TYPEN`, echtes `tsc --noEmit`, Golden Files, Alt-Akten-Faltung im CI. Diese greife ich nicht an. Es geht um die **weichen** Regeln, die zufällig die tragenden sind: Konzept vor Code, ADR ab Tag 1, Additiv-Regel, Aufnahmeregel 1 (bereits gebrochen, F3), Abbruchbedingung (nicht beobachtbar, F2).

**Warum das die Behauptung trifft:** Vorschlag C setzt für sein Hauptrisiko (Kopplung) und sein schlimmstes Fehlerbild (R1, stiller Falschzustand) auf Disziplinartefakte, deren Wirksamkeit bei diesem Autor unter Zeitdruck empirisch widerlegt ist. Unter Termindruck — und F1 sagt, dass Termindruck der Normalzustand sein wird — sind das die ersten Dinge, die fallen.

**Was den Vorschlag rettet:** Jede weiche Regel bekommt einen mechanischen Auslöser: CI-Schritt, der fehlschlägt, wenn ein Ereignistyp in `katalog.ts` ohne §-Verweis in `KONZEPT-FOLD.md` existiert; CI-Schritt, der eine ADR-Datei für jeden Commit verlangt, der eine `docs/adr/`-relevante Datei ändert (oder wenigstens ein Label); der Import-Graph-Test aus F3; die zählbare Abbruchbedingung aus F2. Was nicht mechanisierbar ist, wird aus dem Plan gestrichen statt als Gegenmaßnahme geführt.

---

### F16 — schwer: Der geteilte Kern koppelt nicht nur Quelltext, sondern zwei Werkzeugketten, die heute weit auseinanderstehen — und die Aussage „am Bauverfahren ändert sich nichts" ist damit falsch

**Angegriffene Entscheidungen:** §2 Stacktabelle („Sprache durchgehend TypeScript (Ziel: **TS 7**, wie `einheitenerfassungsbogen/package.json` `"typescript": "^7.0.2"`)", „UI React 19 + Vite (beide Produkte schon so)"); §2.5 CI-Erwartung („die gemessenen **5:01–6:06 min Wandzeit je Push** … bleiben gültig, **weil sich am Bauverfahren nichts ändert**"); §5.3 (Liste der aus v1 „übernehmbaren" Module); R9 (Electron-Majors „**gemeinsam** heben — ein Aktualisierungsvorgang für zwei Produkte").

**Beleg (eigene Auswertung beider `package.json`, 2026-09-08):**

| Werkzeug | S1-Control v1 | erfassungsbogen.app | Sprung |
|---|---|---|---|
| TypeScript | `^5.7.3` | `^7.0.2` | **2 Majors, inkl. Compiler-Neuschreibung** |
| Vite | `^6.2.0` | `^8.1.4` | 2 Majors |
| vitest | `^3.0.7` | `^4.1.10` | 1 Major |
| Electron | `^35.0.0` | `^43.4.0` | **8 Majors** |
| electron-builder | `^25.1.8` | `^26.15.3` | 1 Major |
| `@types/node` | `^22.13.10` | `^26.1.1` | 4 Majors |
| Lint | `eslint ^9.20.1` + `typescript-eslint ^8.24.1` + `eslint-plugin-sonarjs` | **keiner** (17 deps / 31 devDeps, kein `eslint`, kein `prettier` — siehe F17) | — |
| E2E | `playwright-bdd ^9` | `playwright ^1.61.1` + cucumber-js | zwei Rahmen |
| mac-Build | signiert + `notarize: true` (`package.json` build-Block) | `build-mac:` mit `if: false` **abgeschaltet** | asymmetrisch |

**Warum das die Behauptung trifft:**
1. **Die CI-Zeiterwartung ist auf der falschen Kette gemessen.** Die 5:01–6:06 min stammen aus `nachlese-build-ci-latenz-messwerte.md` §3.1 und damit von Vite 6 / vitest 3 / TS 5.7 / Electron 35 / electron-builder 25. v2 baut mit einer anderen Kette, plus zwei neuen Jobs (`test-windows`, Windows-E2E gegen die gebaute App, §7.4). „Bleibt gültig, weil sich nichts ändert" ist keine Annahme, sondern eine falsche Prämisse — sie muss als **neuer** [Annahme]-Wert geführt werden.
2. **Die „übernehmbaren" Module sind gegen die alte Kette geschrieben.** §5.3 rechnet `updater-versioning.ts`, die Monitor-Fensterlogik (`strength-display.ts:144-148`) und die playwright-bdd-Szenarien als Vorbau. Sie kommen aus TS 5.7 / Electron 35 / playwright-bdd 9. Übernahme heißt hier Portierung, nicht Kopie — insbesondere die E2E-Szenarien, weil der Kern-Testrahmen laut §7 vitest 4 + Playwright ist und das Schwesterprodukt cucumber-js fährt.
3. **TS 7 ist eine Wette, die der Vorschlag nicht als Risiko führt.** Der Grund für TS 7 ist ausschließlich „wie erfassungsbogen.app". Damit hängt die tragende Absicherung des Vorschlags — `tsc --noEmit` **echt** statt No-op (§7.4, „Nulltoleranz ab M1"), `no-explicit-any` als Fehler, der `assertNie(x: never)`-Erschöpfungsprüfer, ESLint-Grenzregeln (§5.4 Regeln 2/3) — an der Frage, ob `typescript-eslint` und die restliche Lint-Kette auf dem neuen Compiler dasselbe leisten. Das ist nirgends geprüft [Annahme: ungeprüft; billig zu klären, indem man `typescript-eslint` einmal gegen TS 7 im Bogen-Repo laufen lässt]. Fällt es aus, ist der Teil des Regelwerks, den F15 ausdrücklich **nicht** angegriffen hat („mechanisch, greife ich nicht an"), keine Mechanik mehr, und F15s Urteil trifft dann das gesamte Regelwerk.
4. **R9s „gemeinsames Heben" ist keine Ersparnis, sondern eine Kopplung mit unterschiedlichen Kosten.** Beim Bogen ist Electron ein Nebenziel (Pages/PWA ist der Hauptpfad, `build-mac` ist abgeschaltet, Capacitor bedient iOS/Android). Bei S1 ist Electron **das** Produkt mit vier Buildzielen inklusive mac-Notarisierung. Ein Electron-Major kostet die beiden Produkte nicht dasselbe; „ein Aktualisierungsvorgang für zwei Produkte" gilt nur für den Versionsbump, nicht für die Regressionslast. Über Jahre gerechnet ist das die Wartungsposition, die es in keiner PW-Zeile gibt (§8: laufende Kernpflege „nicht in der Spanne enthalten").

**Was den Vorschlag rettet:** (a) Vor M1 ein Werkzeug-Spike: `@bos/kern` unter TS 7 bauen, `typescript-eslint` und die Grenzregeln darauf laufen lassen, Ergebnis als Messwert eintragen (M31-Regel). (b) Den Kern so ausliefern, dass er **keine** Compilerversion erzwingt — gebautes JS + `.d.ts` auf konservativem Ziel statt Quell-`file:`-Einbindung; dann dürfen die Produkte auf unterschiedlichen TS-Ständen bleiben und die Kopplung endet an der Paketgrenze. (c) Die CI-Zeitaussage in §2.5 als neue Annahme kennzeichnen und nach dem ersten grünen Lauf durch einen Messwert ersetzen. (d) „Werkzeugpflege beider Produkte" als eigene Betriebsposition mit Zahl führen (zusammen mit F2s Kernpflege).

---

### F17 — mittel: Die mechanischen Grenzregeln müssen in ein Repo eingeführt werden, das heute überhaupt keinen Linter hat — und genau daraus wurde bei diesem Autor historisch eine Warnkonfiguration

**Angegriffene Entscheidung:** §1.5 Punkt 1 und §5.4 Regeln 2/3/5: die Kopplungsgrenze wird „durchgesetzt per `eslint-plugin-import`-Regel … **plus Bundle-Größen-Budget im CI von erfassungsbogen.app**"; verortet in M1 (1,5 PW: „Repo `bos-kern`, Umzug der Dateien, `SpeicherHuelle`-Interface, Import-Umstellung in erfassungsbogen.app, **ESLint-Grenzregeln, Bundle-Budget, eigener CI-Lauf**").

**Beleg:** `einheitenerfassungsbogen/package.json` enthält **keinen Linter** — keine `eslint`-, `prettier`- oder sonstige Lint-Abhängigkeit in 17 `dependencies` und 31 `devDependencies`; die Skripte sind `typecheck: tsc --noEmit`, `test: vitest run`, plus Build-/Beispiel-Skripte. `release.yml` fährt `npm ci → typecheck → test → test:e2e` — **kein Lint-Schritt, kein Bundle-Größen-Schritt**. Das Produkt hat laut §8 des Vorschlags ~24.800 Zeilen `src/`.

**Warum das die Behauptung trifft:** Der Vorschlag beschreibt die Regeln so, als würde eine vorhandene Lint-Konfiguration um zwei Regeln erweitert. Tatsächlich ist es die Erstauslieferung eines Linters in eine 24,8-kLoC-Codebasis, die nie einen hatte — d. h. ein Erstlauf mit einer typischerweise dreistelligen Befundmenge, die entweder abgearbeitet oder entschärft werden muss. Der historische Umgang dieses Autors mit genau dieser Situation ist dokumentiert: Grenzwerte in `AGENTS.md` §6 sind als **Warnungen** konfiguriert und werden an 15 Stellen gerissen (historie §4.2); `typecheck` war in v1 ein No-op (historie §4). Die wahrscheinliche Auflösung unter Zeitdruck (F1) ist deshalb nicht „Codebasis aufräumen", sondern „Regeln auf `warn`" — und dann ist die Durchsetzung, die R3 trägt, formal vorhanden und wirkungslos. Zusätzlich: die Regeln laufen im CI eines **fremden Produkts**, dessen Pipeline bei jedem Push released (F2-Nachtrag); ein rot werdender Lint-Schritt blockiert dort ab sofort jede Auslieferung — was den Druck, ihn weich zu konfigurieren, weiter erhöht.

**Was den Vorschlag rettet:** (a) Die Grenzdurchsetzung dorthin verlagern, wo sie niemanden blockiert und mechanisch scharf sein kann: in das `bos-kern`-Repo als **Fehler** (Importrichtung, `no-node:`/`no-DOM`, `no-explicit-any`, Import-Graph-Test aus F3) und als Bundle-Messung gegen eine eingecheckte Obergrenze im Kern-CI selbst — der Bogen bekommt nur einen einzigen, billigen Prüfschritt. (b) Für den Bogen ausschließlich eine **eng gefasste** Flat-Config mit den zwei Grenzregeln einführen, nicht ein volles Regelwerk auf 24,8 kLoC. (c) Verbot, Regeln als `warn` zu konfigurieren, als CI-Prüfung der Konfigurationsdatei selbst — sonst wiederholt sich historie §4.2 wörtlich. (d) Diese Einführung als eigene Zeile in M1 mit eigener Zahl führen; „mechanisch, ~40 Dateien" beschreibt sie nicht.

---

### F18 — gering: Die Paketverdrahtung existiert in beiden Repos noch nicht und muss in fünf `npm ci`-Kontexten und drei Buildpfaden des Schwesterprodukts funktionieren

**Angegriffene Entscheidung:** §5.4 E8: „eigenes Repo `bos-kern`, in beiden Produkten als `git`-Submodul unter `vendor/bos-kern`, Abhängigkeit `"@bos/kern": "file:vendor/bos-kern"`"; §5.2 Projektstruktur mit npm-Workspaces (`pakete/*`, `vendor/bos-kern`); M1 als „mechanisch".

**Beleg:** Weder `einheitenerfassungsbogen` noch `S1-Control` hat heute Workspaces (`package.json` ohne `workspaces`-Feld) oder Submodule (kein `.gitmodules`). Im Bogen-Repo läuft `npm ci` in mehreren getrennten Jobs (`check`, `build-pages`, `build-win`, `build-mac` (deaktiviert)), und der Kern muss anschließend durch **drei verschiedene Bündelpfade** kommen: Vite→GitHub Pages/PWA (`vite-plugin-pwa`, dort greift auch das Bundle-Budget), Vite→Electron (`electron-builder`), und `cap sync ios`/Android (Capacitor 8, Kopie in native Projekte). Ein `file:`-Verweis auf ein Submodul ist in npm ein **Symlink** in `node_modules` — Symlinkauflösung ist genau die Stelle, an der PWA-Precaching, Capacitor-Kopie und `electron-builder`-Packen erfahrungsgemäß unterschiedlich reagieren [Annahme: ungeprüft, siehe §8].

**Warum das die Behauptung berührt (klein, aber terminkritisch):** M1 ist die Voraussetzung für alles ab M2 und mit 1,5 PW als „mechanisch" veranschlagt. Ein Fehlschlag in einem der drei Pfade betrifft nicht S1, sondern die laufende Auslieferung des Schwesterprodukts — also genau das Ereignis, das R3 fürchtet, gleich beim ersten Schritt. Der Vorschlag hat dafür bereits eine Rückfalloption (§5.4: „Kern bleibt in `einheitenerfassungsbogen`, S1 bindet dieses Repo ein — zulässig als Zwischenschritt in M1"); sie ist nur nicht als Reihenfolgeentscheidung ausgeschrieben.

**Was den Vorschlag rettet:** Einen halbtägigen Spike vor M1: leeres `@bos/kern`-Paket mit einer Funktion, per Submodul + `file:` in den Bogen einbinden, alle drei Buildpfade einmal grün fahren. Fällt einer aus, greift der vom Vorschlag selbst genannte Zwischenschritt — und die Extraktion in ein eigenes Repo wird nachgezogen, wenn S1 v2 seinen Feldnachweis hat (deckt sich mit Auflage 5).

---

## 5. Entlastungen und Belastungen durch `betriebsparameter-johannes.md`

| Parameter | Wirkung auf Vorschlag C | Belegstelle im Vorschlag |
|---|---|---|
| Synology (SMB, Samba) | **entlastet leicht**: bekannte Plattform, Oplock-/Notify-Verhalten dokumentiert; §10 Punkt 2 teilweise beantwortet. Die Latenzmessung bleibt offen (F9) | §3.4, §10.2 |
| NTP vorhanden | **entlastet**: die Uhrabweichungs-Warnung (§3.5, ±5 min) wird zum Ausnahmefall; fachliche Zeitstempel müssen nicht routinemäßig nachgepflegt werden. §10 Punkt 5 beantwortet. Am HLC-Modell ändert es nichts (richtig so) | §3.5, §10.5 |
| Windows 11 | **gemischt**: entlastet den Betrieb (WebView2 irrelevant, moderne SMB3-Leases), **entwertet aber eine Nebenbegründung des Stacks** (F12). §10 Punkt 3 beantwortet | §2.2, §2.5 |
| **keine Admin-Rechte** | **belastet**: Installation und Update bleiben unberührt (per-User-NSIS, §2), aber der **UDP-Beschleuniger fällt aus** und mit ihm die Gegenmaßnahme zu R10 (F5) | §2.3, §3.4, R10 |
| 1 bis 5 gleichzeitige Rechner | **entlastet deutlich**: Poll auf wenige Dateien ist trivial; Presence bleibt klein; die Schnappschuss-Schwelle (5.000 Ereignisse) wird selten erreicht; §10 Punkt 4 beantwortet | §3.4, §3.6 |
| macOS/Linux berücksichtigen | **neutral bis belastend**: die vierfache Build-Matrix bleibt (mit mac-Notarisierung), obwohl die Zielplattform Windows ist — ein Kostenposten, den F4 in die Verteilungsposition zieht | §2.5, §7.4 |
| SQLite scheiterte an **Langsamkeit** (nicht Korruption) | **entlastet die Begründung**: E3 (Ereignisprotokoll) stützt sich ohnehin auf Lock-Semantik und den reproduzierten Lost Update, nicht auf Korruption; die lokale SQLite-Projektion (§2.1) bleibt unbedenklich, weil lokal | §2.1, §3.1 |
| **keine Altdaten** | **entlastet ~1,0 PW** und streicht R6 (F14) — mit den Nebenwirkungen fehlender Fixtures (F13) und kaltem Umstieg (F6/F10) | §3.10, R6, M8 |

Netto: Die neuen Parameter machen den Vorschlag **technisch leichter** (Migration, Skalierung, Uhren) und **betrieblich enger** (kein UDP, kalter Umstieg, kein Abnahmematerial). Sie ändern nichts an den vier schweren Befunden zur Lieferbarkeit (F1, F2, F4, F6).

---

## 6. Findings-Tabelle

| # | Schwere | Angegriffene Entscheidung | Kern des Belegs | Rettung |
|---|---|---|---|---|
| F1 | **blocker** | §8: 21 PW / 18–30 PW als Lieferzusage | PW ohne Verfügbarkeitsannahme; historie §1c (Nachtcommits) + 10 Wochen Pause → 1,3–2,9 Jahre Kalenderzeit; R4-Frühwarnsignal ohne Termin nicht messbar | Stunden statt PW, Verfügbarkeit festschreiben, Kalender- und Abbruchdaten je Meilenstein |
| F2 | schwer | §5.4 Pinning + Abbruchbedingung „zweimal in drei Monaten ein Release blockiert" | 193 Tags in 8 Wochen im Bogen-Repo, bis 16/Tag; „blockiert" existiert im Ein-Personen-Betrieb nicht als Signal | zählbare Abbruchbedingung, automatisierter Submodul-Bump, Kernpflege als Betriebsposition |
| F3 | schwer | §1.1(d)/§4.6: Ereignisprotokoll+HLC+Fold in `@bos/kern` | verletzt §5.4 Aufnahmeregel 1 („nur was beide aufrufen"); §4.6 begründet mit „muss aber nicht"; Regel 1 ist die einzige nicht mechanisch geprüfte | HLC/Fold/Katalog nach `@s1/domaene`; Import-Graph-Test im Kern-CI |
| F4 | schwer | §2.5 zwei Update-Wege; Verortung in M8 | historie §3/§8.1: Updater/Release = 24 % der Commits, 62 % der Testzeilen, `updater.ts` 33×, letzter Bug 07.06.; Weg 1 bleibt bestehen, Weg 2 kommt dazu; CI/E2E-Windows unbudgetiert | electron-updater streichen, ein Mechanismus; „CI/Release/Verteilung" als eigene Position ≥1,5 PW |
| F5 | schwer | §3.4/R10: UDP als Beschleuniger, „< 1 s" | betriebsparameter „keine Admin-Rechte"; eingehende UDP-Regel der Windows-Firewall verlangt Elevation; nas §8.1 nennt Firewall bereits | UDP streichen und Latenz aus dem Poll begründen, **oder** einmalige Firewallregel als Installationsvoraussetzung, in M0 verifiziert |
| F6 | schwer | §8 Ausschluss von Schulung/Feldabnahme vs. M8-DoD; Paritätsdefinition mit „entfällt" und Abnahme durch den Autor | 70 Releases / 76 Windows-Downloads; betriebsparameter „keine produktiven Dateien" → v1 nie im Einsatz; Widerspruch Ausschluss vs. DoD | Meilenstein „Einführung" mit Aufwand; benannter Abnehmer aus der FüSt; Parität erst nach Übung ohne Excel |
| F7 | mittel | §8: erfassungsbogen.app / bmecatEditor als Velocity-Beleg | beide ohne Mehrclient/Netzlaufwerk/zweites Fenster; v1 versenkte 45 % der Commits in Infrastruktur (historie §3) | an v1 kalibrieren; Infrastrukturzuschlag als eigene Zeile |
| F8 | mittel | §8: UI-Unsicherheit „eine Woche mehr oder weniger" für drei Ansichten | v1: 10.097 Renderer-Zeilen für weniger Umfang, `App.tsx` 46×, 0 Komponententests; v2 fordert Tests je Ansicht, Tastatur-first, zwei Fenster, FüOrg mit manuell nachjustierbaren Positionen (= Grafikeditor) | Renderer als eigene Position; FüOrg-Positionierung streichen oder eigener Meilenstein; drei Ansichten früh prototypisch |
| F9 | mittel | §8 M0 DoD (c), §7.3 Stufe 4 | Abbruchtor hängt am Ortstermin am Einsatz-NAS; keine Windows-Testbank; GitHub-Runner haben kein SMB | Windows-Rechner + eigene SMB-Freigabe als dauerhafte Testbank in M0; Ortstermin nur als Bestätigung |
| F10 | mittel | R1 nur vorbeugend; K12 nur eigene Ereignisse; §10.11 empfiehlt Rollen zu streichen | im Einsatz kein Weg, eine falsche Lage zu korrigieren; Hash-Kette+CRC verschließen die Handkorrektur, die v1 noch hatte | Korrekturereignis für fremde Ereignisse; `s1 reparieren`; schriftliche Rückfallstrecke auf die Excel; Rollenentscheidung neu |
| F11 | mittel | §8 M8 (2,5 PW) als Sammelposition | Tastenkürzel doppelt zu R5/M3; Abnahme zugleich enthalten und ausgeschlossen; „Diagnose/Log" ist die einzige Erwähnung von Protokollierung im ganzen Dokument | M8 vierteilen; Diagnosekonzept ausformulieren (Log + `s1 diagnose`-ZIP + Wiederabspielen der Akte als Strategie benennen) |
| F12 | gering | §2.2/§2.5 WebView2-Offline als Electron-Vorteil | Windows 11 → WebView2 vorinstalliert; eigener Preis gemessen: 97 MiB je Installer | Nebenbegründung streichen; E2 allein auf das Ausführungsort-Argument stützen; Messwert eintragen |
| F13 | gering | M7 DoD „neben dem Excel-Ausdruck derselben Lage" | betriebsparameter: keine gefüllten Excel-Mappen → Referenzartefakt existiert nicht | synthetische Referenzlage als Fixture vorab bauen (dient zugleich Golden Files, Simulation, Schulung) |
| F14 | gering | §3.10, R6, `s1 uebernehmen`/`import-excel` | keine Altdaten → gegenstandslos; Entlastung ~1,0 PW, aber keine Fixtures und kalter Umstieg | streichen; Zeit gegen F4/F8 umlegen; Baseline über F13 schließen |
| F15 | mittel | §1.5/§5.4/R14: Disziplin als Gegenmaßnahme | AGENTS.md-Verbot vs. Big-Bang-Migration in 20 min; WAL-Pflicht nach SQLite-Ausbau; Grenzwerte als Warnungen, 15× gerissen; keine ADR für die drei größten Entscheidungen | jede weiche Regel mit mechanischem Auslöser versehen; nicht mechanisierbare Regeln streichen statt als Gegenmaßnahme führen |
| F16 | schwer | §2 „Ziel TS 7"; §2.5 „CI-Zeit bleibt gültig, weil sich am Bauverfahren nichts ändert"; §5.3 übernehmbare Module; R9 „gemeinsam heben" | gemessene Versionsschere: TS 5.7↔7, Vite 6↔8, vitest 3↔4, Electron 35↔43, electron-builder 25↔26, `@types/node` 22↔26, zwei E2E-Rahmen; mac-Build im Bogen `if: false` | Werkzeug-Spike vor M1 (TS 7 + typescript-eslint); Kern als gebautes Paket (JS + `.d.ts`) statt Quell-`file:`; CI-Zeit als neue Annahme; Werkzeugpflege als Betriebsposition |
| F17 | mittel | §5.4 Regeln 2/3/5: Grenzen „durchgesetzt" per ESLint + Bundle-Budget im CI des Bogens; M1 „mechanisch" | `einheitenerfassungsbogen` hat **keinen Linter** (kein `eslint`/`prettier` in 17+31 Deps) und keinen Lint-/Bundle-Schritt in `release.yml`; historie §4.2: Grenzwerte als Warnungen, 15× gerissen | Durchsetzung ins Kern-Repo verlagern; im Bogen nur zwei Regeln als Fehler; CI-Prüfung gegen `warn`-Konfiguration; eigene Zahl in M1 |
| F18 | gering | §5.4 E8 Submodul + `file:`; M1 als mechanisch | keine Workspaces/Submodule in beiden Repos heute; Kern muss durch Pages/PWA, Electron und `cap sync` und durch mehrere `npm ci`-Jobs | halbtägiger Verdrahtungs-Spike vor M1; sonst der vom Vorschlag selbst genannte Zwischenschritt |

---

## 7. Verdikt und Auflagen

**Verdikt: fällt** — bezogen auf die geprüfte Behauptung, nicht auf die Architektur.

Was **hält**: der Schnitt (geteilter TS-Kern), die Ableitung Electron aus diesem Schnitt (§2.2 Hauptargument), die Entscheidung für das Ereignisprotokoll gegen die Lockfile-Portierung (E3, sauber begründet, mit widerlegter Gegenprämisse), M0 als vorgezogenes Abbruchtor (E10 — die beste Einzelentscheidung des Vorschlags aus Lieferbarkeitssicht), die Teststrategie §7 (sie schließt die Lücken, an denen v1 blind war), und die Ehrlichkeit von §1.5/§9 (das Hauptrisiko ist benannt, nicht versteckt).

Was **fällt**: die Zusage „21 PW Planwert, 18–30 PW Spanne bis Excel-Parität, danach Betrieb im Einsatz". Sie fällt an vier voneinander unabhängigen Stellen:
1. Die Zahl hat keine Zeitachse und keine Verfügbarkeitsannahme (F1, blocker) — aus ihr folgt keine Lieferzusage.
2. Sie schließt Positionen aus, die ihre eigenen DoD verlangen (F6), und enthält Positionen, die doppelt gezählt oder gar nicht gebucht sind (F4, F8, F11).
3. Sie ist an Vergleichsprojekten kalibriert, die die kostentreibende Dimension nicht enthalten (F7), während der eigene Kalibrierungsdatensatz (historie §3/§8) vorliegt und ungenutzt bleibt.
4. Der Betriebsteil ist unvollständig: kein Reparaturweg im Fehlerfall (F10), kein Diagnosekonzept (F11), keine Anwenderbasis und kein Einführungspfad (F6), und die zugesagte Sichtbarkeitslatenz existiert im Zielumfeld nicht (F5).
5. *(Nachtrag 2026-09-08, Linsenfrage „Wartbarkeit über Jahre / junge Werkzeuge")* Die Kopplung reicht tiefer als der Quelltext: die beiden Produkte stehen heute auf unvereinbaren Werkzeugständen (F16), die Durchsetzungsmechanik muss in ein Repo ohne Linter eingeführt werden (F17), und die Paketverdrahtung ist ungetestet (F18). Der Vorschlag verbucht diesen Bereich unter „mechanisch" und „bleibt gültig" — beides ist mit den gemessenen Versionen widerlegt.

**Auflagen, unter denen die Lieferzusage wieder tragfähig würde** (in dieser Reihenfolge, alle vor dem ersten Codecommit):
1. Verfügbarkeit in Stunden/Woche festschreiben; PW in Kalenderdaten übersetzen; je Meilenstein ein Abbruchdatum (F1).
2. Neuschnitt der Positionen: „Renderer", „CI/Release/Verteilung", „Diagnose/Protokollierung", „Einführung/Schulung", „Abnahme" als eigene Zeilen mit eigenen Zahlen; M8 auflösen (F4, F6, F8, F11).
3. Umfangsreduktion an genau drei Stellen: electron-updater streichen (ein Update-Weg), UDP streichen (oder Firewallregel als Voraussetzung festschreiben), FüOrg-Positionierung streichen oder eigener Meilenstein (F4, F5, F8).
4. HLC/Fold/Ereigniskatalog aus `@bos/kern` heraus; Aufnahmeregel 1 mechanisch prüfen (F3).
5. Abbruchbedingung der Kopplung durch eine zählbare Größe ersetzen; M1 erst nach dem ersten Feldnachweis von M2 (F2) — sonst ist die Kopplungslast beim Schwesterprodukt bezahlt, bevor S1 v2 bewiesen hat, dass es ankommt.
6. Windows-Testbank plus eigene SMB-Freigabe beschaffen und in M0 einplanen; M0 so schneiden, dass es ohne den Ortstermin abschließbar ist (F9).
7. Reparaturweg und Rückfallstrecke definieren, bevor der erste Einsatz damit geführt wird (F10).
8. Synthetische Referenzlage als Fixture bauen (F13); Migrationsanteile streichen und die Zeit umlegen (F14).
9. *(neu)* Werkzeug- und Verdrahtungs-Spike **vor** M1: TS 7 mit Lint-Kette, `file:`-Submodul durch alle drei Buildpfade des Schwesterprodukts; Ergebnis entscheidet, ob der Kern als Quellpaket oder als gebautes Paket geteilt wird und ob M1 sofort oder erst nach dem Feldnachweis aus M2 läuft (F16, F17, F18). Erleichterung: die Rückfalloption ist im Vorschlag bereits vorgesehen (§5.4, „Kern bleibt in `einheitenerfassungsbogen` … zulässig als Zwischenschritt in M1") — Auflage 5 kostet damit fast nichts.

Mit diesen neun Auflagen halte ich den Vorschlag für lieferbar — aber dann mit einer anderen Zahl als 21 PW und mit einer Kalenderaussage, die der Synthese vermutlich unangenehm ist. Ohne sie ist „21 PW bis Excel-Parität" eine Aufwandsschätzung, die als Terminzusage gelesen wird, und genau das ist bei v1 schon einmal schiefgegangen: dort stand nach 15 Kalenderwochen ein Werkzeug mit halber Excel-Abdeckung, 133 Typfehlern, einem Datenverlustfehler und 76 Downloads.

---

## 8. Was ich nicht prüfen konnte

- **Verfügbarkeit von Johannes in Stunden/Woche** — die tragende Unbekannte von F1. Meine Umrechnung (8–12 h/Woche) ist [Annahme], abgeleitet aus dem Commit-Rhythmus (historie §1c) und dem Ehrenamtskontext; die Zahl muss Johannes liefern.
- **Ob ein Gruppenrichtlinienobjekt bereits eine Firewall-Eingangsregel setzt** (F5) — prüfbar mit `Get-NetFirewallRule` auf einem FüSt-Rechner.
- **Ob die 76 Windows-Downloads eine USB-Verteilung ausschließen** — nicht direkt; der Schluss stützt sich auf `betriebsparameter-johannes.md` („keine produktiven Einsatzdateien"), nicht auf den Zähler allein.
- **Reale SMB-Latenzen** auf dem Synology-Share — dieselbe Lücke, die M0 schließen soll (F9).
- *(2026-09-08)* **Ob `typescript-eslint` und die Grenzregeln unter TypeScript 7 tragen** (F16 Punkt 3) — der Bogen hat keinen Linter, also gibt es keinen Erfahrungswert; prüfbar in einer halben Stunde durch einen Probelauf im Bogen-Repo. Davon hängt ab, ob die mechanische Hälfte des Regelwerks existiert.
- *(2026-09-08)* **Ob die verwalteten Windows-11-Rechner Software-Ausführungsrichtlinien (AppLocker/WDAC/SmartScreen for Apps) haben.** „Keine Admin-Rechte" bedeutet, dass es eine verwaltende IT gibt; per-Benutzer-Installation nach `%LOCALAPPDATA%` ist technisch elevationsfrei (§2 dieses Berichts), kann aber durch Richtlinie untersagt sein. Das entwertet §2 nicht, ist aber vor M0 zu klären (ein Probeinstallations-Versuch auf einem FüSt-Rechner genügt) — zusammen mit R8 (kein Windows-Codesigning → SmartScreen beim ersten Start; im Vorschlag benannt und organisatorisch beantwortet, deshalb kein Finding).
- **Aufwand der Kernextraktion in `einheitenerfassungsbogen`** (M1, 1,5 PW): Ich habe `package.json` gelesen (Vite 8, Capacitor 8 für iOS/Android, PWA-Plugin, Electron 43) und den Release-Takt gemessen, aber nicht geprüft, ob eine `file:`-Abhängigkeit auf ein Submodul durch die Vite-/Capacitor-/PWA-Kette sauber durchläuft (Symlink-Auflösung, iOS-Build-Kopie). Das ist ein konkreter, prüfbarer Vorbehalt gegen die Einschätzung „mechanisch, ~40 Dateien" — als Spike vor M1 zu klären. Im Nachlauf 2026-09-08 zu **F18** ausgebaut (drei Buildpfade, mehrere `npm ci`-Jobs, keine Workspaces/Submodule in beiden Repos) — die Symlink-Frage selbst bleibt ungeprüft.
- **Hinweis zur Sitzung:** Ein Kostenwächter-Hook meldete während der Bearbeitung „Session cost $60.28 — COST CRITICAL". Ich habe die Recherche danach auf das Nötigste beschränkt (keine weiteren Volltexte, nur gezielte Auswertungen).
