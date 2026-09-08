# Widerlegung Vorschlag B (Tauri 2 + Rust-Kern) — Linse LIEFERBARKEIT UND BETRIEB

Key: `widerlegung-vorschlag-b-tauri-rust-kern-lieferbarkeit`
Stand: ABGESCHLOSSEN (§0–§12). Historie: §0–§6 aus einem früheren, abgebrochenen Lauf (Kopfzeile behauptete fälschlich „abgeschlossen"; die Datei endete nach §6.2). §7–§12 in diesem Lauf ergänzt.
Gegenstand: `design/vorschlag-b-tauri-rust-kern.md` (666 Zeilen, §1–§10)
Maßstab: `analysis/s1-historie-qualitaet.md` (was v1 wirklich gekostet hat), `design/betriebsparameter-johannes.md` (verbindliche Antworten), `analysis/nachlese-build-ci-latenz-messwerte.md`, `analysis/nachlese-tauri-mehrfenster-und-e2e-spike.md`, `analysis/bmecat-stack-muster.md §9`, `analysis/excel-handbuch-anforderungen.md §7`, `design/zieldatenmodell-feldabgleich.md §3/§4`.

Belegkonvention wie im Vorschlag: `B §x` = Vorschlag B, `hist §x` = s1-historie-qualitaet, `bmecat §x/Rn` = bmecat-stack-muster, `hb F-xx` = excel-handbuch-anforderungen §7, `kritik §x` = vollstaendigkeitskritik, `nl-build §x` / `nl-tauri §x` = die beiden Nachlesen, `betrieb` = betriebsparameter-johannes, `zdm §x` = zieldatenmodell-feldabgleich. `[Annahme]` markiert eigene, unbelegte Setzungen. Eigene Messungen sind als solche gekennzeichnet.

## Gliederung
0. Auftrag, Prüfmaßstab, Was ich NICHT angreife
1. Der Lieferversprechen-Kern von Vorschlag B, wörtlich
2. Maßstab aus der Historie: was v1 wirklich gekostet hat
3. Velocity: rechnet die Aufwandsschätzung?
4. Verteilung, Signing, WebView2, Update — ohne Admin-Rechte
5. Entwicklungs- und Diagnosefähigkeit auf der Zielplattform
6. Kopplung an erfassungsbogen.app — eigene Prüfung des Submodul-Plans
7. Werkzeugrisiko und Wartbarkeit über Jahre
8. Testbarkeit als Lieferrisiko
9. Anwenderseite: Schulung, Hilfe, Umstellung, Diagnose im Einsatz
10. Entlastungen durch die Betriebsparameter (was gegen mich spricht)
11. Findings, sortiert nach Schwere
12. Verdict

---

## 0. Auftrag, Prüfmaßstab, Was ich NICHT angreife

Geprüft wird eine einzige Behauptung: **Ein KI-gestützter Einzelentwickler bringt Vorschlag B in „24 bis 40 Personenwochen, Erwartungswert ~29" (B §8.2) bis Excel-Parität und betreibt das Ergebnis danach im Einsatz.** Alles andere (ob das Ereignisprotokoll fachlich richtig ist, ob der Fold korrekt konvergiert, ob das Datenmodell die Excel trifft) gehört anderen Linsen.

Nicht angegriffen wird, weil der Vorschlag es bereits adressiert und ich nichts Besseres weiß:
- **M0 vor allem anderen** mit benanntem Abbruchkriterium (B §8.1 M0). Das ist die richtige Reihenfolge und explizit gegen die v1-Lehre gebaut (hist §8.3 „eine Testumgebung, die zwei Clients gegen ein simuliertes Share fährt, bevor Produktivcode entsteht").
- **Vertikale Schnitte ab M2** und „v1 bleibt auf `main` lauffähig" (B §8.4, B2). Das ist die einzig richtige Antwort auf das Abbruchrisiko.
- **Ausstiegspunkt nach M3 zugunsten desselben Entwurfs in TypeScript** (B §8.2 Punkt 3, B2, §10.4). Der Vorschlag baut seine eigene Notbremse ein und benennt sie ehrlich.
- **Die Ehrlichkeit über den Rust-Aufpreis** (B §1.4: „+20 bis +35 % Bauzeit"; §8.3). Der Vorschlag beschönigt den Stack-Preis nicht.
- **Diagnose per Ereignislog** (B §7.2 Regressionskorpus: „jeder Feldfehler exakt reproduzierbar"). Das ist gegenüber v1 ein echter Betriebsgewinn und wird unten nur an seinen Rändern angegriffen.

Angegriffen wird die **Zahl**, die **Verteilungs-/Betriebsstrecke**, die **Naht zu erfassungsbogen.app** und die **Anwenderseite**.

---

## 1. Der Lieferversprechen-Kern von Vorschlag B, wörtlich

| Position | Zusage | Fundstelle |
|---|---|---|
| Rechengröße | „1 PW = 40 fokussierte Arbeitsstunden eines KI-gestützten Einzelentwicklers" | B §8 Kopf |
| Summe | 28,5 PW Mittelwert, Spanne **24–40 PW** | B §8.1 Tabelle, §8.2 |
| Kalenderumrechnung | „bei 8–10 h/Woche rund 2,5 Jahre, bei 20 h/Woche rund 14 Monate" | B §8, §10.4 |
| M0 Beweis Speicher + Tauri-Spike | **2 PW** | B §8.1 |
| M1 Kern-Crates + Property-Tests + CLI | 3 PW | B §8.1 |
| M2 Tauri-Schale + React-Neubau + erster vertikaler Schnitt | 3 PW | B §8.1 |
| M3 Mehrclient-Härtung + Störfallmatrix | 2 PW | B §8.1 |
| M4 Einheit vollständig + Ressourcenplanung | 3 PW | B §8.1 |
| M5 Logistik + Kosten + FüSt-Personal | 2,5 PW | B §8.1 |
| M6a sieben Ausgabeprodukte + Stärke-Monitor + ETB | 2,5 PW | B §8.1 |
| M6b FüOrg-Editor | 2 PW | B §8.1 |
| M7 EEB-Integration (Submodul, QR, Sammel-Import, Eingangskorb) | 2,5 PW | B §8.1 |
| M8 Migration + Stammdaten + STAN-/Zeichen-Inferenz | 2,5 PW | B §8.1 |
| **M9 Verteilung: fixedRuntime-Installer, Signierung, Updater GitHub + Share, BETRIEB.md** | **1,5 PW** | B §8.1 |
| M10 Abnahme, echte Übung ≥2 Clients, Nachbesserungen | 2 PW | B §8.1 |

Zusätzliche harte Projektvorgaben, die die Lieferbarkeit betreffen: `tauri >= 2.11.0` als **Mindestversion** (B §2.2), `fixedRuntime`-WebView2 (+~180 MB, B §2.5), Cross-Plattform Windows/macOS/Linux (B §7.5 Build-Matrix), Submodul `vendor/eeb` mit Vite-Alias (B §5.4), zwei E2E-Stacks (B §7.1).

---

## 2. Maßstab aus der Historie: was v1 wirklich gekostet hat

Alle Zahlen aus hist §1–§8, nicht neu erhoben.

**Kalender.** 206 Commits, 2026-02-24 bis 2026-06-07 (hist §1). Aktive Strecken: 24.02.–21.03. (26 Tage) und 31.05.–07.06. (8 Tage); dazwischen 10 Wochen Pause (hist §1 Phase 6). Also **~34 aktive Kalendertage**. Burst-Muster: 45 Commits am 25.02., 36 am 26.02., 24 am 05.03.; 21 Commits zwischen 0 und 3 Uhr nachts (hist §1c).

**Ergebnis nach diesen 34 Tagen.** 11.040 Zeilen Main+Shared, 10.097 Zeilen Renderer, 4.798 Testzeilen / 190 Tests (kritik §3.7). Fachlich: **etwa die Hälfte der Excel-Felder** (kritik §3.1); Ressourcenplanung, Schicht, Logistik, Kosten, FüSt-Personal, sechs von acht Ausgabeprodukten fehlen ganz. Qualitativ: 42 + 91 Typfehler, `npm run typecheck` ein No-op, 0 Renderer-Komponententests, 15 Lint-Warnungen, ein flaky Test, Doku-Drift über 20 Zeilen hinweg (hist §4, §5, §6). Datenhaltung: Lost Update zur Laufzeit reproduziert (kritik §3.4).

**Wohin die Zeit floss** (hist §3):

| Kategorie | Commit-Anteil | Codebeleg |
|---|---:|---|
| Fachfeatures/UI | 28 % | – |
| **Updater / Peer-Update / Release-CI / Signing** | **24 %** | 2.225 Servicezeilen (33 % aller Servicezeilen) + **2.985 Testzeilen (62 % aller Testzeilen)**; `updater.ts` 33× geändert; `build-main.yml` 20×; `package.json` 25× |
| Datenhaltung/Sync/Locking/SMB/JSON | 19 % | `connection.ts` 14×, `clients.ts` 14× |
| Tests/CI/Lint/Coverage | 11 % | |
| Refactoring | 5 % | 14 Commits an zwei Tagen |
| Performance | 5 % | Utility-Prozess ≈1.200 Zeilen, 12 Wochen später gelöscht |

hist §3 fasst zusammen: „Rund 45 % der Commits und über die Hälfte des Test-Codes betreffen Infrastruktur (Updater, Release, Sync, Locking, Datenhaltung), nicht die Fachdomäne."

**Drei Lehren, die für die Bewertung von B zählen:**
1. **Code-Durchsatz ist nicht der Engpass.** Johannes produziert KI-gestützt sehr schnell Code (v1: ~21 kLoC produktiv in 34 aktiven Tagen; bmecatEditor: 31,5 kLoC Rust in 9 Tagen, bmecat R5). Wer B mit „das schafft niemand" angreift, greift die falsche Stelle an.
2. **Der Engpass ist die Auslieferungs- und Betriebsstrecke.** Der Updater war 24 % des Projekts, wurde 33× angefasst und hatte am **letzten aktiven Arbeitstag** (07.06., `ffa14f8`) noch einen fachlichen Fehler („Versionsvergleich erkennt neue Builds am selben Tag"), 3,5 Monate nach Projektbeginn — in einem **reifen** Ökosystem (electron-builder/electron-updater) mit tausenden Nutzern.
3. **Der zweite Engpass ist alles, was nur auf fremder Infrastruktur reproduzierbar ist.** Die SMB-Krise (Phase 2) und die Performance-Krise (Phase 5) sind beide Nachtarbeits-Cluster; hist §8.1 Punkt 4 nennt als Ursache ausdrücklich „Symptom fehlender lokaler Multi-Client-Testbarkeit".

---

## 3. Velocity: rechnet die Aufwandsschätzung?

### 3.1 Der Vergleichsanker, den der Vorschlag selbst setzt

B rechnet 28,5 PW = **1.140 fokussierte Stunden**. v1 hat in ~34 aktiven Kalendertagen (hist §1) einen Gegenstand erzeugt, der die halbe Excel-Fachlichkeit abdeckt. Selbst wenn man v1 großzügig mit 10 h je aktivem Tag ansetzt [Annahme, aus Burst-Muster hist §1c abgeleitet], sind das **~340 h ≈ 8,5 PW**. B verspricht also für **3,4× den v1-Aufwand**:

- die **doppelte** Fachlichkeit (Excel-Parität statt v1-Umfang, kritik §3.1),
- ein **schwierigeres** Speichermodell (Ereignisprotokoll + Fold + Property-Tests statt Ganzdatei-Schreiben),
- eine **zweite Sprache** und die Grenze dazwischen (B §8.3: allein dafür +6 bis +10 PW),
- einen **kompletten Renderer-Neubau** (B §5.3: „Der Renderer wird nicht übernommen"), inklusive der Testinfrastruktur, die v1 nie hatte (hist §5: „Kein einziger Komponenten- oder Hook-Test"),
- **acht Ausgabeprodukte** mit Snapshot-Tests (B §6.2) statt v1s einem ZIP-Export,
- eine **neu gebaute Verteilungs- und Updatestrecke** (B §2.6),
- **EEB-Integration** inklusive Mehrteil-QR (B §8.1 M7),
- und eine **deutlich höhere Qualitätsschranke** in jedem Punkt, an dem v1 nachweislich gerissen ist (B §7.4: „In v2 bricht die CI bei jedem Typfehler"; Property-Tests; Störfallmatrix; ADRs).

Der Faktor 3,4 muss all das tragen. Die einzelnen Positionen unten zeigen, wo er reißt.

### 3.2 Die Schätzung bankt auf Entlastungen, die inzwischen geschlossen sind

B §8.2 nennt die Unsicherheit „24 bis 40 PW" und §10.3 listet vier Entscheidungen, die die Spanne nach unten ziehen sollen. Drei davon sind durch die Betriebsparameter oder durch die Anforderungslage **nicht mehr verfügbar**:

| Entlastung, auf die B rechnet | Fundstelle | Stand nach `betrieb` / hb |
|---|---|---|
| „Linux-Clients: Tier 2 oder gar nicht? Bei ‚gar nicht' entfällt ein Drittel der Build-Matrix" | B §10.3 Punkt 4 | **macOS/Linux berücksichtigen** (betrieb, Zeile „macOS / Linux"). Die volle Drei-Plattform-Matrix bleibt, damit auch drei Rendering-Engines (bmecat R2) und drei Installer-/Signing-Pfade. |
| „FüOrg-Editor: Pflicht oder Ausbaustufe? Wenn Ausbaustufe, sinkt die Gesamtspanne um 2 PW" | B §10.3 Punkt 3 | F-K4 ist eine reguläre Anforderung der Excel (hb §7 K) und Teil des Ziels „Excel vollständig ablösen". Als Parität-Kriterium ist sie nicht abwählbar, ohne das Projektziel zu ändern. |
| „Peer-Update über LAN: ja oder nein? Mein Vorschlag: nein" | B §10.3 Punkt 1 | betrieb: „LAN-Peer-Update: **nicht beantwortet**". Die Streichung ist eine unbestätigte Annahme; B selbst beziffert die Rücknahme mit „+1,5 PW in M9". |
| „PDF: erst auf Nachfrage" | B §6.3, §10.3 Punkt 2 | offen; kostet bei Bedarf 1–1,5 PW. |

Die genannten 24 PW am unteren Rand sind damit die Kombination aus vier Best-Case-Antworten, von denen mindestens eine (Linux) bereits gegen den Vorschlag entschieden ist. **Realistisch ist die Spanne nach oben verschoben, nicht symmetrisch.**

### 3.3 M9 ist die entscheidende Fehlkalkulation (Detail in §4)

B budgetiert **1,5 PW = 5,3 % der Gesamtsumme** für Installer, Signierung, Updater über zwei Kanäle und Betriebsdoku. In v1 hatte genau dieser Themenblock **24 % der Commits, 33 % der Servicezeilen und 62 % der Testzeilen** (hist §3) — in einem reifen Ökosystem, mit einem einzigen Kanal, ohne per-User-Zwang, und war nach 3,5 Monaten immer noch nicht fehlerfrei (hist §1 Phase 9). Selbst wenn man B zubilligt, dass der LAN-Peer-Updater (~920 Zeilen) entfällt und Tauri die Minisign-Prüfung mitbringt, ist der Faktor zwischen historischer und veranschlagter Last **größer als fünf**.

### 3.4 Zwei weitere Positionen, deren Grundlage schwächer ist als der Vorschlag annimmt

**M1 (3 PW) gegen den tatsächlichen Ereigniskatalog.** B §3.4 listet ~45 Ereignistypen und §3.5 neun Fold-Regeln. Das Zielmodell, das parallel entstanden ist, listet in `zdm §4.2` **~55 Typen, jeweils mit eigener Konfliktregel**, darunter Zustandsmaschinen (`AnforderungErledigt` monoton, `AbloesungZugesagt` nur aus `OFFEN`), Barrieren (`EinsatzArchiviert` als Fold-Sperre mit Kleinste-HLC-Regel), **relative** statt absoluter Mutation (`EinheitAufgeteilt`: „die Quellstärke wird relativ reduziert … v1 setzt hier absolut (`einheit.ts:191-193`) und wäre nebenläufig falsch"), Inhalts-Hash-Idempotenz (`EebMeldungEmpfangen`) und Zyklusauflösung nach HLC-Größe (`AbschnittUmgehaengt`). Dazu 30 abgeleitete Kennzahlen mit Formel (`zdm §3.3` K1–K30). B §8.1 M1 verlangt für 3 PW: alle Kern-Crates, den vollständigen Katalog für Einsatz/Abschnitt/Einheit, vier Property-Eigenschaften, `s1 doctor|fold|sim` **und** eine Konvergenz gegen das echte Share. Das ist die anspruchsvollste Position des ganzen Plans, budgetiert wie eine mittlere.

**M2 (3 PW) gegen die Renderer-Realität.** v1s Renderer sind 10.097 Zeilen in 88 Dateien mit 4.165 Zeilen Hooks (hist §5), entstanden aus 46 Änderungen an `App.tsx` plus zwei vollen Refactoring-Tagen (hist §1 Phase 4). B verwirft ihn und baut neu — mit Store, generierten Bindings, CSS je Komponente und **Komponententests ab Tag 1** (B B6), also mit einer Infrastruktur, die v1 nie aufgebaut hat. M2 liefert dafür „Tauri-Schale + React-Grundgerüst + erster vertikaler Schnitt" in 3 PW und M4/M6 sollen den Rest tragen. B nennt das Risiko selbst (B6, „mittel × mittel", Frühwarnzeichen „M2 überschreitet 4 PW") — die Einpreisung ist dennoch die eines Umbaus, nicht die eines Neubaus.

### 3.5 Die Rechengröße selbst ist für diesen Kontext untauglich

„1 PW = 40 fokussierte Arbeitsstunden" (B §8) unterstellt Vollzeit-Fokusblöcke. Der reale Rhythmus ist aus hist §1c belegt: Bursts von 24–45 Commits an einzelnen Tagen, 21 Commits zwischen 0 und 3 Uhr, 40 zwischen 21 und 24 Uhr; die drei SMB-Notfixes liegen zwischen 00:47 und 01:10. Abend- und Nachtstunden nach einem Arbeitstag sind keine „fokussierten Stunden" im Sinne der Rechnung, und **genau in diesem Modus sind die teuersten Fehlentscheidungen von v1 entstanden** (Journal-Strategie WAL → DELETE → WAL → SQLite raus, hist §1b; Utility-Prozess, 12 Wochen später gelöscht). Für einen Entwurf, dessen Kernrisiko „ein nicht bedachter Nebenläufigkeitsfall erzeugt einen stillen Falschzustand" heißt (B B1, „hoch × sehr hoch"), ist die Annahme durchgehend fokussierter Stunden nicht nur optimistisch, sondern in der Risikologik falsch herum.

---

## 4. Verteilung, Signing, WebView2, Update — ohne Admin-Rechte

### 4.1 Die neue Randbedingung, die der Vorschlag nicht kannte

`betrieb`: **„keine Admin-Rechte auf den FüSt-Rechnern. Installer müssen per-User installieren (NSIS per-user / portable / MSI per-user). Kein Dienst, kein Treiber, keine Systemänderung. Auto-Update muss ohne Admin funktionieren."**

Was Vorschlag B dazu sagt, vollständig:
- §2.5: „Zusätzlich ein **MSI/NSIS-Silent-Schalter** dokumentieren, damit die FüSt-Rechner per USB-Stick in einem Rutsch installiert werden können. [Annahme: keine Softwareverteilung im THW-FK vorhanden.]"
- §2.6: Share-Weg „…dann Installer per `opener` starten und App beenden".
- §8.1 M9 DoD: „Ein FüSt-Rechner ohne Internet lässt sich installieren und über den Share aktualisieren; Rollback-Weg beschrieben."

Kein Wort zu Installationsumfang (per-user vs. per-machine), kein Wort zu Rechteanforderungen, keine Erwähnung von NSIS-`installMode`. Das ist keine Nachlässigkeit des Autors — er kannte die Antwort nicht —, aber es macht M9 zu einem Meilenstein, dessen zentrale Randbedingung **nach** der Schätzung dazugekommen ist.

Drei konkrete Folgen:

1. **Der MSI-Weg fällt aus.** MSI-Installation im Maschinenkontext verlangt Elevation; der von B als „zusätzlich" genannte MSI-Silent-Schalter ist unter der Randbedingung kein Verteilungsweg. [Annahme, allgemeine Windows-Installer-Eigenschaft; nicht gegen die Tauri-Doku verifiziert, weil offline nicht prüfbar.] Übrig bleiben NSIS im `currentUser`-Modus oder ein portables Verzeichnis — beides muss gewählt, gebaut, signiert und getestet werden, und beides wird von B nirgends benannt.
2. **Der Rückfallpfad für Risiko B7 ist unter der Randbedingung fragwürdig.** B7 lautet „`tauri-action` nimmt den ~180-MB-Runtime nicht sauber mit"; Gegenmaßnahme: „Rückfall: `offlineInstaller` (+127 MB, Evergreen)". Der WebView2-Offline-Installer installiert die Evergreen-Laufzeit; ob er ohne Admin durchläuft, hängt davon ab, ob er als Nicht-Admin per-User installiert — das ist genau die Frage, die niemand gestellt hat. Ergebnis: **die Gegenmaßnahme zu B7 ist unbelegt.** (Entlastend: unter Windows 11 ist die Laufzeit ohnehin da — siehe §10.)
3. **Der Update-Pfad muss ohne Elevation funktionieren.** B §2.6 beschreibt zwei Kanäle, die beide am Ende einen Installer starten. Ein per-machine-Installer löst dabei eine UAC-Abfrage aus, die ein FüSt-Anwender ohne Adminkonto nicht beantworten kann — der Rechner bliebe auf der alten Version stehen, und zwar **still**, weil der Fehlerfall im Vorschlag nicht behandelt ist. Das ist der Betriebszustand, der v1 schon einmal 33 Änderungen an einer Datei gekostet hat (hist §2).

### 4.2 Die Fragen, die die Nachlese gerade nicht beantwortet hat

Die Nachlese, die genau diese Strecke schließen sollte, ist **abgebrochen**:
- `nl-tauri` hat eine Gliederung mit §3 „WebView2-Distribution (webviewInstallMode) und tauri-action" und §4 „E2E-Stack", **endet aber nach §2.5** (eigene Prüfung: `wc -l` = 72 Zeilen, letzte Überschrift „### 2.5 Antwort auf Frage 1"). Von den drei Tauri-Fragen, die kritik §5 Gap 5 aufgemacht hat, ist genau **eine** (Mehrfenster/Zweitmonitor) beantwortet.
- `nl-build` hat eine Gliederung mit §6 „Tauri/Rust lokal: Kalt-/Warmbau Debug und Release" und §8 „SMB-Roundtrip-Zeiten", **endet aber nach §3.3** (eigene Prüfung: 72 Zeilen, letzte Überschrift „### 3.3 Einordnung"). Gemessen ist nur die **Electron**-CI (Median 5:16 Wandzeit, 12,5–15 Runner-Minuten, kritischer Pfad `build-win` 239 s).

B zitiert das korrekt (§2.4: „Tauri-Debug-Kaltbau ~4 min (aus bmecat-Doku übernommen, **nicht gemessen**)"; §7.5: „10–20 min je Plattform [Annahme, bmecat R4]"). Aber die Konsequenz benennt der Vorschlag nicht: **Die laufende Hauptkostenposition des gewählten Stacks — die Build-/Feedbackzeit — ist bis heute unbekannt, und M0 sieht ihre Messung nicht als DoD vor** (B §8.1 M0 DoD nennt Konvergenz, Latenz-p95, „NAS weg 10 min", drei Tauri-Fragen mit Ja/Nein — keine Bauzeitmessung).

Für einen Einzelentwickler ist das die falsche Auslassung. Bei 3× CI-Zeit gegenüber heute (B §7.5) und einem Tauri-Debug-Kaltbau in Minutenordnung ändert sich der Arbeitsmodus: v1 konnte pro Push in 5:16 min vier Plattformen bauen und releasen (nl-build §3.1, gemessen). Das war der Rhythmus, in dem 206 Commits entstanden sind.

### 4.3 Was in M9 tatsächlich drinsteckt

Aufzählung aus B §2.5, §2.6, §8.1 M9 und der neuen Randbedingung:

1. `fixedRuntime`-Cab besorgen, gitignoren, im CI laden und cachen (B §2.5) — Machbarkeit über `tauri-action` **offen** (B §2.5, B7, bmecat §10 Frage 4, nl-tauri §3 nie geschrieben).
2. NSIS per-user-Modus wählen, bauen, testen (nicht im Vorschlag).
3. macOS: Developer-ID-Signierung + Notarisierung. v1 brauchte dafür 5 Secrets, eine Validierungsstufe und eine Zertifikatsprüfung mit `continue-on-error` (hist §7) und scheiterte daran noch am 05./06.06. (`nl-build §3.2`: build-mac scheiterte, Re-Run scheiterte, Folge-Commit `ed68271` „add macOS certificate validity check").
4. Linux: deb (+ ggf. rpm/AppImage), da Linux bleibt (`betrieb`).
5. `tauri-plugin-updater` gegen GitHub-`latest.json`.
6. **Zweiter, selbstgebauter Update-Kanal über den Share** mit `minisign-verify`, Notfall-Zweitschlüssel, Artefaktkopie, Installerstart, App-Beendigung, Rollback-Weg.
7. Portierung von `updater-versioning.ts` nach Rust („~120 Zeilen inkl. Tests", B §2.6) — der Datums-vs-SemVer-Vergleich, der in v1 **fünfunddreißig** Updater-Bugs später immer noch einen Fehler hatte (hist §1 Phase 9, `ffa14f8`).
8. Schlüsselhaltung, Verlustabsicherung (B §2.6, B11).
9. `BETRIEB.md` (Sharelayout, Rechte, Backup, Wiederherstellung).

Neun Positionen, davon zwei mit offenem Machbarkeitsstatus, eine komplett neu erfunden (Share-Updater), eine historisch fehleranfällig, für **60 Stunden**. Das ist die Position, an der der Plan bricht.

---

## 5. Entwicklungs- und Diagnosefähigkeit auf der Zielplattform

### 5.1 Der Vorschlag benennt keine Windows-Maschine

Die Zielplattform ist Windows („Windows-Rechner der FüSt, macOS/Linux nachrangig", Auftrag; `betrieb`: Windows 11). Der Vorschlag verlangt an mindestens sieben Stellen Windows-spezifische Arbeit:

| Stelle | Windows-spezifisch, weil |
|---|---|
| B §2.2 / B8 | Zweitmonitor randlos über der Taskleiste; **gemischte DPI** (Issue #6843 offen, nl-tauri §2.5) — genau das, was nl-tauri §2.5 als „nur durch den Spike belegbar" markiert |
| B §2.3 | „Fenstererzeugung darf unter Windows nicht in einem synchronen Command passieren (Deadlock)" (nl-tauri §1, Tauri-Doku seit 1.0.0-rc.15) |
| B §2.5 | `fixedRuntime`, NSIS, Installergröße, Offlinefähigkeit |
| B §2.6 | Update ohne Admin, UAC-Verhalten |
| B §7.1 | „E2E echt: WDIO + `@wdio/tauri-service` **unter Windows**" |
| B §7.5 | Job `smoke-win` auf `windows-latest` |
| B §8.1 M0(b) | „zweites Fenster auf Zweitmonitor **unter Windows** inkl. gemischter DPI, `fixedRuntime`-Installer, ein WDIO-Smoke" |

Die einzige belegte Entwicklungsmaschine ist ein **macOS-Rechner** (nl-build §2: Apple M5 Pro, macOS 26.5.2; auch die Umgebungsangaben dieser Sitzung). Die einzigen belegten Windows-Rechner sind die FüSt-Rechner **ohne Admin-Rechte** (`betrieb`). Für eine Tauri-Entwicklungsumgebung unter Windows wird üblicherweise die MSVC-Toolchain (Visual-Studio-Buildtools) gebraucht, deren Installation Elevation verlangt [Annahme, nicht offline verifizierbar; die GNU-Toolchain wäre ein unerprobter Sonderweg].

Konsequenz, falls Johannes keinen eigenen Windows-Rechner mit Adminrechten hat: **Jeder Windows-spezifische Fehler wird ausschließlich über CI beobachtet** — ohne Debugger, ohne DevTools, ohne interaktive Reproduktion, mit einer Rundenzeit von 10–20 min je Versuch (B §7.5, [Annahme]). Für DPI-, Taskleisten-, Installer- und UAC-Fragen ist das der teuerste denkbare Modus. v1 hatte dieses Problem in geringerem Maß, weil Electron **eine** Engine über alle Plattformen liefert; Tauri hat drei (bmecat R2) und macht damit „auf meinem Mac sieht es richtig aus" zu einer wertlosen Aussage für die Zielplattform.

Das ist kein erfundenes Problem: nl-tauri §2.5 listet vier Punkte, die „nicht durch Lesen belegbar, nur durch den Spike" sind — und drei davon (gemischte DPI unter Windows, Monitor-Ab-/Anstecken, randlos über der Taskleiste) sind **auf einem Mac nicht spikebar**.

### 5.2 Die Diagnosefähigkeit im Einsatz — stark, aber an den Rändern unfertig

Was B liefert und was ich ausdrücklich als Fortschritt gegenüber v1 werte:
- `s1-cli` mit `doctor|fold|export|migrate|import-excel|sim|archiv` (B §5.2, §1.5 Punkt 2),
- `tracing` + `tauri-plugin-log` in eine Datei je Einsatz (B §2.1),
- Diagnoseansicht in M3, Uhrenwarnung, Presence-/Standanzeige („Stand vom Share: vor 3 s · 2 weitere Clients online · 1 Client seit 4 min nicht erreichbar", B §3.8),
- und der eigentliche Gewinn: **unveränderliche Ereignisse machen jeden Feldfehler exakt reproduzierbar** (B §7.2 Regressionskorpus). v1 konnte das nicht (hist §8.1 Punkt 4).

Was fehlt:
1. **Der CLI ist kein Auslieferungsgegenstand.** In `bundle`/`resources` (B §5.2 `src-tauri/resources/`) steht der StAN-Datensatz, nicht das Binary. Ob `s1.exe` neben der App landet, ob es ohne Admin startbar ist (SmartScreen/AppLocker) und wer es im Einsatz bedient, steht nirgends.
2. **Kein Diagnosepaket.** Für Ferndiagnose („Johannes ist nicht vor Ort") braucht es einen Ein-Klick-Befehl, der Log, Presence, Offsets, Manifest, Version und die letzten N Ereignisse einpackt. `s1 archiv` erzeugt die Einsatzakte, nicht das Diagnosepaket, und setzt den `archiv.marker` — im laufenden Einsatz ist das genau der falsche Befehl (B §3.10: „`archiv.marker` (create_new) friert den Einsatz ein").
3. **Kein Fehlerbild für den Anwender.** Die Störfallmatrix (B §7.6) prüft, dass die Software die Störfälle übersteht; sie sagt nicht, was auf dem Bildschirm steht und was der S1-Gehilfe um 3 Uhr nachts tun soll.

---

## 6. Kopplung an erfassungsbogen.app — eigene Prüfung des Submodul-Plans

B §5.4 entscheidet: git-Submodul `vendor/eeb`, Tag-gepinnt, Vite-Alias `@eeb/*`. Und: **„Konkret eingebunden werden nur `src/codec.ts`, `src/model.ts`, `src/signatur.ts`, `src/app/einsatz-transport.ts`, `src/app/hilfen.ts` (Migration alter Bögen) und `src/app/meldung-diff.ts` … Der Rest des Ursprungsprojekts (UI, PDF, Capacitor) wird nicht gebaut."**

### 6.1 Eigene Messung: die transitive Hülle dieser sechs Dateien

Ausgeführt am 2026-09-07 in `/Users/johannes/Developer/einheitenerfassungsbogen`, Auflösung relativer Importe ab den sechs genannten Einstiegen:

```
Erreichte lokale Dateien: 17          Zeilen gesamt: 5.176
  106  src/app/absenderkarte.ts           1.043  src/codec.ts
  202  src/app/aufteilen.ts                 392  src/model.ts
  728  src/app/einsaetze.ts                 340  src/signatur.ts
  178  src/app/einsatz-transport.ts          73  src/vokabulare/ebenen.ts
   66  src/app/geraete-schluessel.ts        110  src/vokabulare/sitzplaetze.ts
  825  src/app/hilfen.ts                    164  src/vokabulare/thw-funktionen-ergaenzung.ts
  346  src/app/meldung-diff.ts              289  src/vokabulare/thw.ts
  151  src/app/nativ.ts
   38  src/app/papierkorb.ts
  125  src/app/zusammenfuehren.ts
Externe Pakete: @capacitor/app, @capacitor/core, @capacitor/filesystem,
                @capacitor/share, @noble/ed25519, pako, qrcode
```

Damit sind drei Aussagen des Vorschlags widerlegt:

1. **„Der Rest … (UI, PDF, **Capacitor**) wird nicht gebaut" ist falsch.** `src/app/hilfen.ts:48` importiert `{ binaerTeilen, istNativ, textTeilen } from "./nativ"`, und `src/app/nativ.ts:9-12` importiert `@capacitor/core`, `@capacitor/app`, `@capacitor/filesystem`, `@capacitor/share`. Der Kopfkommentar der Datei sagt es selbst: „Native Brücke (Capacitor): In-App-QR-Scanner und Teilen von Dateien über das System-Share-Sheet". S1-Control müsste also entweder vier Capacitor-Pakete als eigene Abhängigkeiten führen oder ein Alias-Shim bauen — beides ist zusätzliche, dauerhaft zu pflegende Arbeit an einer fremden Codebasis.
2. **Der Umfang ist ~3× so groß wie angegeben.** Nicht sechs Dateien, sondern 17 mit 5.176 Zeilen, darunter `einsaetze.ts` (728 Z., die Meldekopf-Sammlung), `aufteilen.ts`, `zusammenfuehren.ts`, `papierkorb.ts`, `absenderkarte.ts`, `geraete-schluessel.ts` und drei Vokabular-Module. Der letzte Block ist fachlich relevant: `thw.ts`/`ebenen.ts`/`sitzplaetze.ts` sind **Vokabulare**, also Daten, die S1 in `s1-model`/`s1-stan` ohnehin kanonisch führen will (B §4.3, §5.3). Zwei konkurrierende Vokabularquellen im selben Prozess sind genau das Doppelpflegeproblem, das B mit dem Submodul vermeiden wollte.
3. **Browser-/App-Zustand wird mitimportiert.** `localStorage`-Zugriffe: `einsaetze.ts` 4×, `absenderkarte.ts` 2×, `geraete-schluessel.ts` 2× (eigene Zählung per grep). `geraete-schluessel.ts` erzeugt/hält den **Geräteschlüssel** für die Ed25519-Signatur — in S1 eingebunden hieße das, dass eine FüSt-Installation nebenbei eine Signaturidentität der Erfassungsbogen-App im WebView-`localStorage` anlegt. Das ist keine „Naht", das ist eine Verschmelzung zweier Produkte.

### 6.2 Warum das die Lieferbarkeit trifft

- B §8.1 M7 budgetiert **2,5 PW** für „Submodul, QR per Handscanner und Kamera, Segmentsammlung (Mittel 2,91 Teile je Bogen), Sammel-Import aus `eeb-einsatz`-JSON/PDF, `s1-eeb-map`, Meldekopf-Eingangskorb mit gelb/grün-Quittierung und Diff". In diesen 100 Stunden ist die Aufräumarbeit an der fremden Codebasis (Extraktion eines wirklich plattformneutralen Kerns, Trennung von Capacitor/localStorage, Vokabular-Entflechtung) nicht enthalten — und sie ist **Voraussetzung**, nicht Zugabe.
- Die Arbeit fällt **im anderen Repo** an. Damit ist eine Abhängigkeit geschaffen, die B eigentlich vermeiden wollte: `erfassungsbogen.app` muss für S1 umgebaut werden, und beide Produkte hängen anschließend an derselben Refaktorierung. Die von B abgelehnte Option „npm-Paket veröffentlichen" (B §5.4 Tabelle: „sauberste Versionierung, aber Registry-Infrastruktur … als Zusatzlast") sieht nach dieser Messung günstiger aus als das Submodul, weil sie die Extraktion erzwingt, statt sie zu verstecken.
- Der CI-Job „`tsc --noEmit` gegen das Submodul" (B §5.4) braucht dann auch die Abhängigkeiten des Submoduls (`pako`, `qrcode`, `@noble/ed25519`, vier Capacitor-Pakete) im S1-Baum — sonst prüft er nichts.

**Was den Vorschlag hier rettet:** die *Entscheidung* (kein Rust-Port des Codecs, B §4.6) ist richtig und gut begründet — vier Argumente, darunter die 1.291 Testzeilen im Ursprungsprojekt und der nie lauffähige VBA-Port (vba §8.4). Falsch ist nur der *Weg*. Statt „sechs Dateien aliasen" braucht es „im Ursprungsprojekt einen UI-freien Kern (`codec`, `model`, `signatur`, Transport, Vokabulare) ohne Capacitor/`localStorage`/`qrcode` herausschneiden und als Paket oder Submodul-Unterverzeichnis anbieten" — mit eigener Position in der Schätzung.

---

## 7. Werkzeugrisiko und Wartbarkeit über Jahre

### 7.1 Eigene Messung am Tauri-Changelog: B pinnt eine Kernfunktion auf die jüngste Minor-Linie

B §2.2 macht **`tauri >= 2.11.0` zur Mindestversion** und begründet das mit dem Multi-Monitor-Fix #15250; B §10.3 Punkt 5 lässt Johannes das noch bestätigen; B8 führt es als Gegenmaßnahme.

Eigene Zählung in `analysis/tauri-CHANGELOG.md` (2026-09-08):
- **47 stabile 2.x-Releases** über **12 Minor-Linien** (2.0.0 … 2.11.5); insgesamt 191 Release-Überschriften einschließlich der alpha/beta/rc-Strecke.
- Die **oberste Überschrift der Datei ist `2.11.5`** — B verlangt also nicht „mindestens eine reife Version", sondern **die jüngste Minor-Linie überhaupt**.
- Diese Linie hat in ihrer kurzen Lebenszeit bereits **fünf Patch-Releases** gebraucht (2.11.1–2.11.5).
- Der geforderte Fix ist verifiziert: `tauri-CHANGELOG.md:106` — „Fix initial window position when positioning it to another monitor" (#15250), erschienen in **2.11.0**, also am Kopf der Linie, ohne Feldbewährung.
- **2.11.1 enthält zwei Security-Fixes** (`tauri-CHANGELOG.md:64-70`): ACL-Umgehung für IPC-Aufrufe aus fremden Origins ohne `AppManifest`, und falsche Behandlung des `.localhost`-Suffixes **auf Windows/Android**, wodurch entfernte Websites als lokal galten.

Drei Folgerungen für die Lieferbarkeit:

1. **Die riskanteste Anforderung des Entwurfs (Zweitmonitor, B8, hb-Ausgabeprodukt „Stärke-Monitor") hängt an dem Teil des Werkzeugs, der am kürzesten in der Welt ist.** Wenn #15250 den Fall „gemischte DPI" (Issue #6843, weiterhin offen, nl-tauri §2.5) nicht mitlöst — und der Titel des Fixes deutet nur auf die *initiale* Position, nicht auf DPI-Wechsel —, dann ist B8s Gegenmaßnahme („`tauri >= 2.11` Pflicht") wirkungslos und es bleibt nur der Rückfall „Monitorwahl manuell im UI". Das ist gegenüber der Excel (HTML-Datei im Browser auf dem Zweitschirm, hb §7 Zeile 83) ein **Rückschritt**, kein Fortschritt.
2. **Security-Patches sind bei diesem Stack Betriebspflicht, nicht Kür.** Eine Version mit ACL-Umgehung auf einem Gerät im Einsatznetz ist kein akademisches Problem, sondern genau der Fall, für den es einen funktionierenden Updatepfad braucht. Damit ist die in §4 auseinandergenommene M9-Strecke (1,5 PW, zwei ungeklärte Machbarkeitsfragen, Update ohne Admin-Rechte ungeprüft) **nicht optional nachrüstbar** — sie ist Voraussetzung dafür, dass die App über Jahre überhaupt betrieben werden darf.
3. **Die Nachpflege ist dauerhaft, nicht einmalig.** 47 Releases über 12 Minor-Linien heißt für einen Einzelentwickler mit 8–10 h/Woche: mehrmals im Jahr Version anheben, Regressionsmatrix (drei Plattformen, drei Rendering-Engines, bmecat R2) erneut durchspielen, Installer neu bauen und auf drei FüSt-Rechner ohne Admin-Rechte bringen. B budgetiert Wartung an keiner Stelle — die Meilensteintabelle endet bei M10 „Abnahme".

### 7.2 Die Abhängigkeiten unterhalb von Tauri sind der zweite, ungezählte Pflegeposten

Der Vorschlag benennt an eigenen Krücken: `tauri-specta` (Bindings, B §5.3/§7.4), `@wdio/tauri-service` v1.3 („jung", bmecat R6, B5), `proptest`, `insta`, `minijinja`, `blake3`, `minisign-verify`, `tracing`, `tauri-plugin-log`, `tauri-plugin-updater`, `swatinem/rust-cache`, `tauri-action` (B §2.4–§2.6, §5.2, §7.1, §7.5). Davon sind **zwei tragende Teile Drittprojekte außerhalb der Tauri-Organisation** (`tauri-specta`, `@wdio/tauri-service`) [Annahme zur Trägerschaft; offline nicht gegen die Registry verifizierbar], und beide sitzen an Stellen, an denen ein Ausfall nicht lokal reparierbar ist: die Typgrenze zwischen den Sprachen und der einzige Test, der die echte App startet.

Zum Vergleich der heutige Stack: v1 hat `package.json` **25×** angefasst (hist §3) — Abhängigkeitspflege war dort schon ein sichtbarer Posten, und zwar in einem Ökosystem mit einer einzigen Sprache und einem einzigen Lockfile. v2 hat zwei Paketmanager, zwei Lockfiles, ein Submodul mit eigenen Abhängigkeiten (§6.1) und eine dritte Werkzeugkette für die Installer.

### 7.3 Was für den Vorschlag spricht — und wo diese Rechnung trotzdem nicht aufgeht

B §8.3 ist ehrlich: „Diese Rechnung geht nur auf, wenn der Kern langlebig ist – bei einem Werkzeug, das in zwei Jahren ersetzt wird, wäre TypeScript die richtige Wahl." Das ist die richtige Bedingung, und sie ist **auf der Ebene des Kerns erfüllbar**: `s1-model`, `s1-event`, `s1-fold`, `s1-store` sind UI-frei, ohne Tauri-Abhängigkeit (B §8.1 M1 DoD: „keine Tauri-Abhängigkeit in `crates/`") und damit tatsächlich langlebiger als jede Electron-Schicht.

Der Einwand trifft nicht den Kern, sondern die **Hülle**: Was gepflegt werden muss, ist nicht `s1-fold` (das ändert sich nur mit der Fachlichkeit), sondern Tauri, WebView2, drei Installer, drei Rendering-Engines, zwei E2E-Stacks und das Submodul. Der langlebige Teil ist der billige Teil; der teure Teil ist genau der, dessen Halbwertszeit B als Argument gegen sich selbst anführt.

**Bus-Faktor.** Der Entwurf hat an keiner Stelle einen zweiten Menschen. Für eine ehrenamtlich getragene Fachanwendung ist die Frage „wer macht das, wenn Johannes ein Jahr nicht kann" nicht theoretisch. Ein Nachfolger für React/TypeScript ist im THW-Umfeld plausibler zu finden als einer für einen Rust-Workspace mit HLC, Property-Tests und Borrow-Checker über Thread-Grenzen [Annahme; keine Erhebung, aber die Richtung ist schwer zu bestreiten]. B adressiert das über ADRs und `EREIGNISKATALOG.md` (B15/R15) — gute Dokumentation senkt die Einstiegshürde, hebt aber nicht die Sprachwahl auf.

---

## 8. Testbarkeit als Lieferrisiko

### 8.1 Das Abnahme-Orakel für M5 und M6a existiert nicht mehr

Zwei Definitions of Done stützen sich auf ein Artefakt, das es laut `betrieb` nicht gibt:

| DoD | Wortlaut | Voraussetzung |
|---|---|---|
| M5 | „Log- und Statuszahlen stimmen gegen eine **ausgefüllte Referenz-Mappe** zellgenau" (B §8.1) | eine real ausgefüllte Excel-Mappe |
| M6a | „Sieben Produkte mit ‚Stand:'-Zeile, **Snapshot-Tests gegen Referenzdateien**" (B §8.1) | Referenzausgaben aus der Excel |
| M8 | „`s1 migrate` erzeugt aus **einer v1-Datei** eine identische Lage" (B §8.1) | eine produktive `.s1control`-Datei |

`betrieb`, Zeile „Altdaten": **„keine: keine produktiven SQLite-/JSON-Einsatzdateien, keine gefüllten Excel-Mappen."**

Damit ist:
- **M8s DoD wörtlich unerfüllbar** und die Meilensteinbeschreibung zur Hälfte gegenstandslos (B §3.11 „Migration bestehender `.s1control`-Dateien" und B §3.12 „Migration der Excel-Mappe" sind zwei Abschnitte ohne Gegenstand). Das ist eine echte **Entlastung** und wird in §10 gutgeschrieben.
- **M5 und M6a aber sind belastet**: die Referenz, gegen die „zellgenau" geprüft werden soll, muss **erst hergestellt werden** — also eine Excel-Mappe mit einer realistischen Übungslage von Hand befüllen, dann Druck/Status/Log/LogFrei/Auswertung/HTML daraus exportieren und als Snapshot-Grundwahrheit einfrieren. Diese Arbeit steht in keinem Meilenstein. Sie ist kein Programmieraufwand, sondern stumpfe Fachdateneingabe in genau dem Werkzeug, das abgelöst werden soll, und sie muss **vor** M5 fertig sein.
- Ohne diese Referenz degeneriert der Snapshot-Test zur Tautologie: `insta` friert ein, was der eigene Code gerade ausgibt, und prüft danach nur noch, dass sich nichts *ändert* — nicht, dass es *richtig* ist. Genau der Fehlertyp, den B mit „zellgenau" ausschließen wollte, bleibt dann offen.

Das ist der wichtigste Punkt, den die Betriebsparameter neu aufmachen und den weder der Vorschlag noch die bisherigen §0–§6 dieser Widerlegung kennen konnten.

### 8.2 Die breite E2E-Ebene prüft die neue Grenze gerade nicht

B §7.1 setzt zweigleisig auf:
- **„E2E schnell: Playwright browser-mode gegen Vite mit gemocktem `invoke`"** — trägt „die 10 Gherkin-Szenarien + neue", also die Breite;
- **„E2E echt: WDIO + `@wdio/tauri-service` unter Windows"** — „~6 Smokes".

Der gemockte `invoke` ist genau die Naht, die Vorschlag B **neu einführt** und die es in v1 (ein Prozess, eine Sprache, `ipcMain`/`contextBridge`) in dieser Form nicht gab. Die breite Testebene läuft also gegen eine Attrappe der einzigen Schicht, die der Stackwechsel hinzufügt. Absicherung der echten Grenze liefern sechs Smokes, deren Werkzeug B selbst als jung und ausfallgefährdet führt (B5: „Fällt WDIO ganz aus, bleibt eine manuelle UI-ABNAHME-Checkliste").

Das ist kein Konstruktionsfehler — es ist die übliche und vernünftige Aufteilung. Es heißt aber, dass die **Rückfallposition bei B5 „manuelle Checkliste" ist**, und für einen Einzelentwickler ist eine manuelle Checkliste über drei Plattformen der teuerste dauerhafte Posten, den man sich einhandeln kann. Er wiederholt sich bei jedem Tauri-Update aus §7.1.

### 8.3 Die stärkste Absicherung des Entwurfs läuft nicht in der CI

B §7.3 trennt sauber:
- **In-Process (CI, schnell):** N Threads gegen ein `tempfile`-Verzeichnis;
- **Echt (`s1 sim`, manuell/Übung):** vier Prozesse gegen `\\NAS\S1-Control`.

Der zweite ist der einzige, der die tatsächliche Zielumgebung berührt, und er ist ausdrücklich **manuell**. Die CI-Variante läuft gegen ein lokales Dateisystem — also gegen genau die Umgebung, in der auch v1s Speichercode grün war, während er über SMB versagte (hist §8.1 Punkt 4: „Symptom fehlender lokaler Multi-Client-Testbarkeit"; SQLite-Krise Phase 2).

Das erzeugt ein Regressionsloch mit Ansage: Eine Änderung in M4/M5/M6, die das Segment-/Offset-/Fold-Verhalten unter SMB-Semantik verschlechtert (Directory-Cache, partiell sichtbarer Append, Rename-Verhalten), passiert die CI unbemerkt und fällt erst bei der nächsten manuellen `s1 sim`-Runde auf — oder in der Übung. B nennt `s1 sim` „danach das Abnahmemittel für jede Änderung am Speichermodell" (§7.3), sagt aber nicht, **wer erzwingt, dass es gelaufen ist**. In einem Ein-Personen-Projekt ohne Review ist die einzige wirksame Erzwingung die CI, und dort kann der Test nicht laufen, weil das Share nicht erreichbar ist.

**Was rettet:** ein Pflicht-Gate, das eine Release-Signatur nur vergibt, wenn ein `s1 sim`-Protokoll mit passendem Commit-Hash vorliegt — also die Kopplung an den Release-Job statt an die Disziplin.

### 8.4 Der Prüfumfang von M1 gegen 3 PW (Ergänzung zu §3.4)

Zu den in §3.4 gezählten ~55 Ereignistypen mit je eigener Konfliktregel (`zdm §4.2`) kommt für die Property-Tests ein Posten, den B nicht ausweist: **Generatoren**. Eigenschaft 1 (Kommutativität über Permutationen) und Eigenschaft 4 (Invariantenerhalt: kein Abschnittszyklus, Stärke-Summenregel, keine Einheit ohne Abschnitt, keine Referenz ins Leere) verlangen `proptest`-Strategien, die **strukturell gültige** Ereignisfolgen erzeugen — sonst prüft die Eigenschaft nur, dass ungültige Eingaben ungültig bleiben. Für einen Baum mit Umhängen, Aufteilen (relative Mutation, `zdm §4.2`), Zusammenführen und Archivierungsbarriere ist der Generator ein eigenes Stück Software, typischerweise in der Größenordnung des Folds selbst [Annahme, keine Messung; die Richtung folgt aus der Invariantenliste in B §7.2 Punkt 4].

---

## 9. Anwenderseite: Schulung, Hilfe, Umstellung, Diagnose im Einsatz

### 9.1 Eigene Prüfung: der Vorschlag enthält keine einzige Zeile für den Anwender

Vollständige Suche über `design/vorschlag-b-tauri-rust-kern.md` (2026-09-08) nach `schulung|handbuch|hilfe|anwender|einweis|onboarding|tooltip`: **acht Treffer, davon keiner zum Sachverhalt.** Sieben betreffen `hilfen.ts` (EEB-Datei), `Benutzer`/`benutzer` als Feldname im Ereignis-Akteur, `Result<_, String>` und die Belegkonvention; einer ist die Zeile 285 zur AküLi als Datenimport.

Die Dokumente, die der Vorschlag vorsieht, sind ausnahmslos **Entwicklerdokumente**: `docs/adr/`, `EREIGNISKATALOG.md`, `docs/UI-ABNAHME.md` (Abnahme-Checkliste für ihn selbst, B §7.6), `BETRIEB.md` (Sharelayout, Rechte, Backup, Wiederherstellung, B §8.1 M9). Es gibt kein Anwenderhandbuch, keine In-App-Hilfe, keine Kurzanleitung, kein Schulungsmaterial und keinen Meilenstein, in dem so etwas entstünde.

### 9.2 Das ist keine Auslassung im Komfortbereich, sondern eine offene Paritätsanforderung

`hb §7` führt unter den funktionalen Anforderungen ausdrücklich:

> **F-L4** „Tastenkürzel für alle Kernfunktionen; Hilfe/Abkürzungsliste (AküLi) und **Handbuch in der Anwendung**; ControlTips." (Textfeld 19; Neu!B28, B39; AküLi)

und unter den nicht-funktionalen:

> **N-5** „Bedienung unter Stress: **Tastatur-first**, Eingabemasken mit Listen, minimale Ladezeiten, Bestätigungen, keine Formatzerstörung durch Nutzerfehler."

Die abzulösende Excel liefert das heute: `hb §7` Zeile 8 belegt das Blatt `Hinweise` als **Benutzerhandbuch in vier Kapiteln über A1:L172**, dazu Textobjekte mit ShortCut-Liste, HTML-/Tablet-Anleitung, Bedienhinweis und Kosten-Disclaimer sowie eine erklärende Grafik zum Ablösungsverfahren (`xl/media/image84.png`).

B §4/§6 bilden die *Daten* und die *Ausgaben* der Excel ab; die **Bedienungsschicht** (Kürzel, ControlTips, eingebautes Handbuch) fällt an keiner Stelle auf. B §9/B4 führt „Scope-Explosion Excel-Parität" als Risiko und will „hb §7 als Abnahmeliste mit Ja/Nein je Anforderung führen" — F-L4 wird dabei weder als „ja" eingeplant noch als bewusstes „nein" gestrichen (die genannten Streichkandidaten sind F-L3 Passwortschutz, F-K4-Detailtiefe, PDF). **Ein Paritätsziel, das eine Anforderung schlicht übersieht, ist keine Parität.**

Größenordnung: ein Tastaturkonzept über alle Kernfunktionen, ControlTips an den Eingabefeldern und ein pflegbares In-App-Handbuch sind gegenüber der Gesamtsumme nicht groß — aber sie sind **null** eingeplant und fallen in genau die Phase (M4–M6), die B ohnehin als unsicher markiert (B4, „M4 überschreitet 4 PW").

### 9.3 Die Umstellung ist im Plan die Doppelerfassung — im Einsatz ist sie das nicht

B §8.4: „Ab M2 ist die App bei jeder Übung parallel zur Excel einsetzbar (**Doppelerfassung**), ab M6a ersetzt sie die Ausdrucke, ab M10 die Mappe."

Szenario, Schrittfolge: Übung, FüSt besetzt, Meldekopf meldet 14 Einheiten in 40 Minuten. Der S1-Gehilfe soll jede Meldung zweimal eintragen — einmal in die Mappe, die er kennt und deren Ausdrucke der Zugführer erwartet, einmal in eine Software, die noch keine Kürzel, keine ControlTips und kein Handbuch hat (§9.2) und deren Ausgaben erst ab M6a existieren. Unter Last fällt die zweite Erfassung als Erstes weg. Damit fällt genau die Rückmeldung weg, für die die Doppelerfassung gedacht war, und der erste ernsthafte Feldtest rutscht auf M10 — den Meilenstein mit **2 PW** für „Abnahme, echte Übung, Nachbesserungen".

Das ist die Stelle, an der B2 („Projekt bleibt auf halbem Weg liegen") am wahrscheinlichsten eintritt, und die Gegenmaßnahme („ab M2 ist jeder Stand einsetzbar") trägt sie nicht: *einsetzbar* heißt hier *zusätzlich bedienbar*, nicht *anstelle*. Was tragen würde: einen abgegrenzten Arbeitsplatz früh **allein** auf v2 umstellen (naheliegend der Meldekopf-Eingangskorb, hb F-E1, weil er heute ohnehin ein eigener Zettel-/EEB-Weg ist), statt die Vollerfassung zu verdoppeln.

### 9.4 Diagnose im Einsatz ohne Entwickler vor Ort (Fortschreibung von §5.2)

§5.2 hat die Werkzeugseite geprüft. Auf der Anwenderseite bleibt offen:

1. **Wer bedient `s1 doctor`?** Der CLI ist das zentrale Diagnosemittel (B §5.2, §1.5), aber kein Auslieferungsgegenstand (§5.2 Punkt 1) und hat keine Anwenderdokumentation (§9.1). Im Einsatz um 3 Uhr steht damit ein S1-Gehilfe vor einer Anwendung, die „Stand vom Share: vor 3 s · 2 weitere Clients online · 1 Client seit 4 min nicht erreichbar" anzeigt (B §3.8) — eine gute Anzeige — und hat für den Fall „1 Client seit 4 min nicht erreichbar" **keine Handlungsanweisung**.
2. **Die Störfallmatrix prüft die Software, nicht das Verfahren.** B §7.6 listet sechs Störfälle (NAS weg / Absturz beim Schreiben / Uhr 3 h falsch / Doppelstart / Monitor abgesteckt / Update im Betrieb) und lässt sie in M3 einmal durchspielen. Was fehlt, ist die Spalte „was sieht der Anwender, was soll er tun" — also der Teil, der ins `BETRIEB.md` oder auf eine laminierte Karte neben den Rechner gehört. Ohne sie ist die Matrix ein Entwicklertest, keine Betriebsvorbereitung.
3. **Das Rückfallverfahren ist nicht beschrieben.** Ab M10 ist die Excel abgelöst. Fällt v2 in einer Lage aus (Update-Fehlschlag ohne Adminrechte, §4.1 Punkt 3; Fold-Fehler, B1), gibt es weder eine dokumentierte Rückkehr zur Mappe noch einen Export, der in die Mappe zurückführt. B §6 erzeugt Ausgaben *aus* der Projektion; ein Weg *zurück in* das Excel-Format steht nur als Import (`s1-import`) im Plan, nicht als Export. hb N-9 fordert immerhin „Datenfeld-Kompatibilität für Auswertung in Excel (flache Tabelle exportierbar)" — das deckt die Auswertung, nicht die Weiterarbeit.

**Was rettet:** eine eigene, kleine Position „Betriebsfähigkeit beim Anwender" mit vier Gegenständen — Kurzanleitung (2 Seiten), Störfallkarte mit Anwendersicht, `s1 diag`-Ein-Klick-Paket (Log, Presence, Offsets, Version, letzte N Ereignisse) und ein benanntes Rückfallverfahren — vor M10, nicht in M10.

---

## 10. Entlastungen durch die Betriebsparameter (was gegen mich spricht)

Redlichkeitsprüfung: `betrieb` entlastet Vorschlag B an fünf Stellen, teils erheblich.

| Parameter | Wirkung auf B | Bewertung |
|---|---|---|
| **Windows 11** auf den Clients | „WebView2-Evergreen-Laufzeit ist auf Windows 11 vorinstalliert; `fixedRuntime`/`offlineInstaller` ist kein Muss mehr, nur noch Absicherung" (`betrieb`). Damit verliert **B7** („`tauri-action` nimmt den ~180-MB-Runtime nicht sauber mit") seine Wirkung: der Installer darf im Regelfall den Bootstrapper nehmen, der Offlinefall ist abgesichert statt blockierend. Auch M0(b) wird kleiner: „`fixedRuntime`-Installer über `tauri-action`" muss nicht mehr *funktionieren*, nur *bewertet* werden. | **Starke Entlastung.** Der in bmecat R1 als „Hoch" geführte Risikopunkt fällt praktisch weg. Mein §4-Befund bleibt trotzdem stehen, weil er nicht an WebView2 hängt, sondern an **per-User-Installation und Update ohne Elevation**. |
| **NTP vorhanden** | B §3.7 („Uhren ohne NTP") wird von einem Kernproblem zu einer Absicherung; die Driftwarnung bleibt sinnvoll, die HLC bleibt nötig für die Ordnung, aber der Störfall „Uhr um 3 h falsch" (§7.6) ist ein seltener Fehlerfall statt Normalzustand. | **Entlastung**, klein in PW, groß im Restrisiko. |
| **1 bis 5 gleichzeitige Rechner** | `s1 sim --clients 4` (B §7.3) trifft damit die reale Obergrenze, nicht eine willkürliche Zahl; Polling auf wenige Dateien ist unkritisch; die Presence-Liste bleibt klein. Die Skalierungsfrage, die bei einem Ereignisprotokoll immer mitschwingt, ist damit beantwortet. | **Entlastung**; bestätigt B §3.3/§3.8 als angemessen dimensioniert. |
| **Keine Altdaten** | M8 verliert zwei seiner drei Bestandteile: „v1-`.s1control`-Migration" und Import gefüllter Excel-Mappen entfallen; B §3.11 und §3.12 werden gegenstandslos; **B13** ist von „Risiko" zu „eingetreten, Wirkung niedrig" geworden. Übrig bleiben Kopiervorlagen, AküLi, StAN-Daten und die Zeichen-Inferenz — B hat das bereits als Rückfall benannt („Notfalls schrumpft M8 auf Kopiervorlagen + AküLi (lohnt sich auch dann)"). | **Entlastung ~1 bis 1,5 PW.** Gegenrechnung in §8.1: dieselbe Tatsache **belastet** M5/M6a, weil das Referenz-Orakel fehlt. Netto eher neutral bis leicht negativ. |
| **Synology (SMB/Samba)** | B3 („unbekanntes NAS") schrumpft: das Zielsystem ist benannt, Samba-basiert, mit dokumentierbaren Oplock-/Durable-Handle-Einstellungen. M0(a) misst nicht mehr ins Blaue. | **Entlastung**, verschiebt M0 von „Machbarkeitsnachweis unter Unsicherheit" zu „Messung an einem bekannten System". |
| **SQLite scheiterte an Latenz, nicht an Korruption** | Bestätigt die Grundrichtung (Append-only statt Sperren) und entkräftet den denkbaren Einwand, das Speicherproblem sei ein Bedienfehler gewesen. | Entlastung für die *Technik*-Linse, für die Lieferbarkeit neutral. |

**Was zusätzlich belastet** (in §3.2 und §4 bereits verrechnet, hier zur Bilanz): macOS/Linux bleiben Anforderung (die von B §10.3 Punkt 4 erhoffte Kürzung der Build-Matrix entfällt); keine Admin-Rechte (§4); LAN-Peer-Update unbeantwortet, also B §10.3 Punkt 1 unbestätigt (+1,5 PW Eventualposten).

**Bilanz.** Die Betriebsparameter nehmen Vorschlag B ungefähr **2 bis 3 PW an Risikopositionen** ab (WebView2-Absicherung, NAS-Unbekanntheit, halbes M8) und legen ihm **4 bis 8 PW** auf (per-User-Verteilungs- und Updatestrecke §4.3, Referenzdaten-Herstellung §8.1, drei Plattformen bleiben, Anwenderschicht §9.2). Der Erwartungswert von 28,5 PW wandert damit nach oben, nicht nach unten — und zwar in genau die Meilensteine, die B am knappsten kalkuliert hat.

---

## 11. Findings, sortiert nach Schwere

| # | Angegriffene Entscheidung | Schwere | Kern des Belegs | Was den Vorschlag rettet |
|---|---|---|---|---|
| **L1** | M9 „Verteilung: `fixedRuntime`-Installer, Signierung, Updater über GitHub **und** Share, `BETRIEB.md`" = **1,5 PW** (B §8.1) | **blocker** | Derselbe Themenblock war in v1 24 % der Commits, 33 % der Servicezeilen, **62 % der Testzeilen** (hist §3), `updater.ts` 33× geändert, und hatte am letzten aktiven Arbeitstag noch einen Fachfehler (`ffa14f8`). Dazu neu: „keine Admin-Rechte … Auto-Update muss ohne Admin funktionieren" (`betrieb`) — im ganzen Vorschlag nicht erwähnt; MSI-Weg fällt damit aus, NSIS-`installMode` ist nirgends gewählt, das UAC-Verhalten des Update-Pfads (B §2.6: „Installer per `opener` starten und App beenden") ist ungeprüft. Neun Einzelpositionen in §4.3, zwei mit offenem Machbarkeitsstatus. | M9 aufteilen und neu bepreisen (realistisch 4–6 PW), **per-User-Installation und Update ohne Elevation als Ja/Nein-DoD in M0(b)** statt in M9, MSI streichen, einen Kanal statt zwei bauen (Share reicht, GitHub-Updater erst wenn Zeit bleibt). |
| **L2** | „Excel-Parität" als Zielbegriff, geführt über „hb §7 als Abnahmeliste mit Ja/Nein je Anforderung" (B4) | **blocker** für den Paritätsanspruch | Eigene Volltextsuche (§9.1): der Vorschlag enthält **keine** Anwenderdokumentation, In-App-Hilfe, Kurzanleitung, Tastaturkonzept oder Schulung. `hb §7` F-L4 fordert genau das („Tastenkürzel für alle Kernfunktionen; Hilfe/AküLi und **Handbuch in der Anwendung**; ControlTips"), N-5 fordert Tastatur-first; die Excel liefert es heute als Blatt `Hinweise` A1:L172 in vier Kapiteln (`hb §7` Z. 8). F-L4 steht weder unter den eingeplanten noch unter den bewusst gestrichenen Anforderungen (B4 nennt F-L3, F-K4, PDF). | Eigene Position „Bedienschicht und Anwenderdoku" (Kürzel, ControlTips, In-App-Handbuch, 2-Seiten-Kurzanleitung), 1–2 PW, **vor** M10; oder F-L4 schriftlich als „nicht in v2" streichen und den Paritätsanspruch entsprechend einschränken. |
| **L3** | „Konkret eingebunden werden nur [sechs Dateien] … Der Rest des Ursprungsprojekts (UI, PDF, **Capacitor**) wird nicht gebaut" (B §5.4), M7 = 2,5 PW | **schwer** | Eigene transitive Auflösung (§6.1, 2026-09-07): **17 Dateien, 5.176 Zeilen**, nicht sechs. `src/app/hilfen.ts:48` → `./nativ`, und `src/app/nativ.ts:9-12` importiert vier Capacitor-Pakete — die Zusage ist falsch. Dazu `localStorage` in `einsaetze.ts` (4×), `absenderkarte.ts` (2×), `geraete-schluessel.ts` (2×), letzteres hält den **Ed25519-Geräteschlüssel**; drei Vokabularmodule konkurrieren mit `s1-model`/`s1-stan`. Die Extraktionsarbeit fällt im **fremden Repo** an und ist Voraussetzung, nicht Zugabe. | Im Ursprungsprojekt einen UI-freien, Capacitor- und `localStorage`-freien Kern herausschneiden (`codec`, `model`, `signatur`, Transport, Vokabulare) und als Paket **oder** als Submodul-Unterverzeichnis anbieten — als **eigene, bepreiste Position** (1–1,5 PW) vor M7. Die von B verworfene npm-Paket-Variante erzwingt diese Trennung und ist nach der Messung die günstigere Wahl. |
| **L4** | M5-DoD „zellgenau gegen eine **ausgefüllte Referenz-Mappe**", M6a-DoD „Snapshot-Tests gegen **Referenzdateien**", M8-DoD „aus **einer v1-Datei** eine identische Lage" (B §8.1) | **schwer** | `betrieb`: „Altdaten **keine**: keine produktiven SQLite-/JSON-Einsatzdateien, **keine gefüllten Excel-Mappen**." M8s DoD ist damit wörtlich unerfüllbar (Entlastung, §10); M5/M6a verlieren ihr Orakel: ohne Referenz friert `insta` nur den eigenen Output ein und prüft Stabilität statt Richtigkeit. Die Herstellung einer Referenzlage (Mappe von Hand füllen, sechs Ausgaben exportieren, einfrieren) steht in keinem Meilenstein. | Eigene Position „Referenzlage herstellen" (Übungslage 20–40 Einheiten in der Excel erfassen, alle Ausgaben exportieren, als Testkorpus einfrieren), 0,5–1 PW, **vor** M5. M8 gleichzeitig auf Kopiervorlagen/AküLi/StAN/Zeichen-Inferenz kürzen (−1 bis −1,5 PW). |
| **L5** | Untergrenze „24 PW" (B §8.2) | **schwer** | §3.2: Die Untergrenze setzt vier Best-Case-Antworten voraus (B §10.3). Eine ist bereits gegen den Vorschlag entschieden (`betrieb`: „macOS/Linux **berücksichtigen**" → volle Drei-Plattform-Matrix, drei Rendering-Engines, drei Installerpfade); eine ist unbestätigt (LAN-Peer-Update „nicht beantwortet" → Eventualposten +1,5 PW nach B selbst); eine (FüOrg/F-K4) ist ohne Änderung des Projektziels nicht abwählbar. | Die Spanne asymmetrisch angeben („29–45 PW, Untergrenze nur bei folgenden drei Entscheidungen") statt symmetrisch, und die drei Entscheidungen vor M0 einholen. |
| **L6** | „`s1 sim` … danach das Abnahmemittel für jede Änderung am Speichermodell" (B §7.3), aber ausdrücklich **manuell** | **schwer** | Die CI-Variante läuft gegen ein `tempfile`-Verzeichnis, also gegen dieselbe Umgebung, in der v1s Speichercode grün war, während er über SMB versagte (hist §8.1 Punkt 4: „Symptom fehlender lokaler Multi-Client-Testbarkeit"). Wer die manuelle Runde erzwingt, ist nirgends festgelegt; in einem Ein-Personen-Projekt ohne Review gibt es keine zweite Instanz, die es einfordert. | Release-Gate: eine Version wird nur signiert, wenn ein `s1 sim`-Protokoll mit passendem Commit-Hash vorliegt. Zusätzlich einen self-hosted Runner mit gemountetem Share **oder** einen Samba-Container im CI, damit wenigstens SMB-Semantik statt POSIX getestet wird. |
| **L7** | „`tauri >= 2.11.0` als Mindestversion" (B §2.2, B8) | **mittel** | Eigene Zählung in `analysis/tauri-CHANGELOG.md`: **47 stabile 2.x-Releases über 12 Minor-Linien**; `2.11.5` ist die **oberste** Überschrift — B macht die jüngste Minor-Linie zur Pflicht, für die riskanteste UI-Funktion. Der geforderte Fix ist `tauri-CHANGELOG.md:106` (#15250, „Fix **initial** window position when positioning it to another monitor") und adressiert die initiale Position, nicht den offenen DPI-Fall #6843. 2.11.1 trägt **zwei Security-Fixes** in Windows-relevantem Code (`:64-70`) → Updatefähigkeit ist Betriebspflicht (Kopplung zu L1). Laufende Versionspflege ist in keinem Meilenstein budgetiert (die Tabelle endet bei M10). | Zweitmonitor-Verhalten inkl. gemischter DPI in M0(b) **auf echter Windows-Hardware** verifizieren, bevor die Version zur Pflicht erklärt wird; Rückfall „Monitor als Browserfenster wie die Excel es macht" explizit als gleichwertige Option führen; einen jährlichen Wartungsposten (Versionsanhebung + Regressionsmatrix + Neuverteilung) ausweisen. |
| **L8** | Sieben Windows-spezifische Arbeitspakete (§5.1) ohne benannte Windows-Entwicklungsmaschine | **mittel** | Die einzige belegte Entwicklungsmaschine ist macOS (nl-build §2: M5 Pro, macOS 26.5.2); die einzigen belegten Windows-Rechner sind die FüSt-Rechner **ohne Admin-Rechte** (`betrieb`). Drei der vier Punkte, die nl-tauri §2.5 als „nur durch den Spike belegbar" markiert (gemischte DPI, Monitor ab-/anstecken, randlos über der Taskleiste), sind auf einem Mac nicht spikebar. Ohne Windows-Maschine wird jeder Windows-Fehler nur über CI beobachtet, Rundenzeit 10–20 min (B §7.5). | Vor M0 benennen, auf welcher Windows-Maschine mit Adminrechten entwickelt und gespiket wird (eigener Rechner, VM mit Windows-11-Lizenz, oder ein FüSt-Rechner, für den einmalig Rechte beschafft werden). Fällt das aus, ist M0(b) nicht durchführbar und der Zweitmonitor gehört gestrichen. |
| **L9** | Rechengröße „1 PW = 40 **fokussierte** Arbeitsstunden" (B §8) | **mittel** | Der belegte Rhythmus ist ein anderer: Bursts von 24–45 Commits an einzelnen Tagen, 21 Commits zwischen 0 und 3 Uhr, 40 zwischen 21 und 24 Uhr, die drei SMB-Notfixes zwischen 00:47 und 01:10 (hist §1c). In genau diesem Modus entstanden v1s teuerste Fehlentscheidungen (Journal-Strategie WAL→DELETE→WAL→SQLite raus, hist §1b; Utility-Prozess, 12 Wochen später gelöscht). Für einen Entwurf, dessen Kernrisiko „stiller Falschzustand" heißt (B1, hoch × sehr hoch), ist die Fokusannahme in der Risikologik falsch herum. | Kalenderzeit statt Personenwochen als Steuergröße (B §10.4 fragt richtig, rechnet dann aber wieder in PW zurück); und eine Regel, dass Änderungen an `s1-fold`/`s1-store` nicht in Nacht-Bursts gemergt werden, sondern erst nach einem `s1 sim`-Lauf am Folgetag (Kopplung zu L6). |
| **L10** | „Ab M2 ist die App bei jeder Übung parallel zur Excel einsetzbar (Doppelerfassung)" (B §8.4) als Gegenmaßnahme zu B2 | **mittel** | Szenario §9.3: Unter Übungslast fällt die zweite Erfassung als Erstes weg — insbesondere solange die App weder Kürzel noch ControlTips noch Handbuch hat (L2) und ihre Ausgaben erst ab M6a existieren. Damit rutscht der erste ernsthafte Feldtest faktisch auf M10 (2 PW für Abnahme + Übung + Nachbesserungen). | Statt Vollerfassung verdoppeln: **einen abgegrenzten Arbeitsplatz früh allein** auf v2 umstellen — naheliegend der Meldekopf-Eingangskorb (hb F-E1), der heute ohnehin ein eigener Weg ist. Dafür M7 (EEB) vor M5/M6 ziehen. |
| **L11** | M1 = 3 PW für Kern-Crates, vollständigen Ereigniskatalog, vier Property-Eigenschaften, `s1 doctor\|fold\|sim` und Konvergenz gegen das echte Share | **mittel** | `zdm §4.2` listet ~55 Ereignistypen mit je eigener Konfliktregel (Zustandsmaschinen, Barrieren, relative Mutation bei `EinheitAufgeteilt`, Inhalts-Hash-Idempotenz, Zyklusauflösung nach HLC) plus 30 abgeleitete Kennzahlen (`zdm §3.3`). Dazu ungezählt: `proptest`-**Generatoren**, die strukturell gültige Ereignisfolgen erzeugen — ohne sie prüfen die Eigenschaften 1 und 4 nichts (§8.4). | M1 splitten (Katalog+Fold / Property-Infrastruktur / CLI) und auf 5–6 PW anheben; Frühwarnzeichen von B2 („M0+M1 > 7 PW") entsprechend nachziehen, sonst schlägt es sofort an und entwertet sich. |
| **L12** | Diagnose im Einsatz: `s1-cli` + `tracing` + Diagnoseansicht + Störfallmatrix (B §5.2, §2.1, §7.6) | **gering** | Der CLI ist kein Auslieferungsgegenstand (`resources/` enthält StAN-Daten, nicht das Binary, B §5.2); `s1 archiv` setzt den `archiv.marker` und friert den Einsatz ein (B §3.10) — im laufenden Einsatz der falsche Befehl; die Störfallmatrix hat keine Spalte „was sieht der Anwender, was tut er"; ein Rückfallverfahren zur Excel nach M10 ist nirgends beschrieben. | `s1 diag` als lesender Ein-Klick-Befehl (Log, Presence, Offsets, Manifest, Version, letzte N Ereignisse in ein ZIP), Störfallmatrix um die Anwenderspalte ergänzen, Rückfallverfahren in `BETRIEB.md`. Zusammen ~0,5 PW. |

**Aufwandswirkung der Findings, grob addiert** (nur die Positionen, die zusätzliche Arbeit sind, nicht die Umverteilungen): M9 +2,5 bis +4,5 (L1), Bedienschicht/Anwenderdoku +1 bis +2 (L2), EEB-Extraktion +1 bis +1,5 (L3), Referenzlage +0,5 bis +1 (L4), M1-Nachschlag +2 bis +3 (L11), Diagnose/Betrieb +0,5 (L12), abzüglich M8-Kürzung −1 bis −1,5 (§10). **Summe: +6,5 bis +11 PW gegenüber den 28,5 PW des Vorschlags** — also ein Erwartungswert von **35 bis 40 PW**, was der von B genannten *Obergrenze* entspricht. Nicht eingerechnet, weil nicht quantifizierbar: L7 (Wartung, jährlich wiederkehrend), L8 (fehlende Windows-Maschine: entweder Beschaffungsaufwand oder Verlust der Spikefähigkeit), L9 (Modusrisiko).

---

## 12. Verdict

**FÄLLT** — nicht der Entwurf, sondern das Lieferversprechen in der vorliegenden Form.

Was steht: Die Reihenfolge ist richtig (M0 mit benanntem Abbruchkriterium vor allem anderen, B §8.1), die vertikalen Schnitte sind die einzig sinnvolle Absicherung gegen den Projektabbruch (B §8.4), der Ausstiegspunkt nach M3 zugunsten desselben Speicherentwurfs in TypeScript ist ehrlich und funktionsfähig (B §8.2, §10.4), die Ehrlichkeit über den Rust-Aufpreis (+20–35 %, B §8.3) ist die Ausnahme, nicht die Regel bei Architekturvorschlägen, und das Ereignisprotokoll bringt einen echten Betriebsgewinn, weil jeder Feldfehler aus dem Log reproduzierbar wird (B §7.2) — etwas, das v1 nachweislich nicht konnte (hist §8.1).

Was nicht steht, ist die **Zahl** und die **Betriebsstrecke**:

1. **Die Schätzung ist nicht nur knapp, sie ist unvollständig.** Vier ganze Arbeitspakete fehlen in der Meilensteintabelle: die Extraktion eines wirklich plattformneutralen EEB-Kerns aus dem fremden Repo (L3, gemessen: 17 Dateien / 5.176 Zeilen statt der zugesagten sechs, inklusive Capacitor entgegen der ausdrücklichen Zusage), die Herstellung der Referenzlage, ohne die zwei DoDs bedeutungslos sind (L4), die Bedienschicht und Anwenderdokumentation, die eine Paritätsanforderung ist (L2, hb F-L4), und die laufende Werkzeugpflege (L7). Eine Schätzung, der Positionen fehlen, ist nicht durch Puffer heilbar, sondern nur durch Ergänzen.
2. **Der Meilenstein, an dem v1 nachweislich am teuersten war, ist der am knappsten kalkulierte.** 1,5 PW für die gesamte Verteilungs-, Signier- und Updatestrecke gegen 24 % der Commits und 62 % der Testzeilen in v1 (hist §3) — bei gleichzeitig **verschärfter** Randbedingung, die der Vorschlag nicht kannte: kein Admin, kein MSI, Update ohne Elevation, und Security-Patches des Frameworks als Dauerpflicht (L1, L7).
3. **„Excel-Parität" ist mit diesem Plan nicht erreichbar**, weil eine Anforderung der Liste, gegen die er sich selbst misst, im Plan nicht vorkommt — weder als Ja noch als bewusstes Nein (L2).
4. **Die Betriebsparameter entlasten weniger, als sie belasten** (§10): −2 bis −3 PW (WebView2 auf Windows 11, bekanntes NAS, halbes M8) gegen +4 bis +8 PW (per-User-Verteilung, Referenzdaten, drei Plattformen bleiben, Anwenderschicht).

**Korrigierter Erwartungswert: 35 bis 40 PW** statt 28,5 — also die Obergrenze der eigenen Spanne als neuer Mittelwert. Bei den in B §10.4 selbst genannten Umrechnungen sind das **rund 3 bis 3,5 Jahre bei 8–10 h/Woche** oder **17 bis 20 Monate bei 20 h/Woche**. Für ein Werkzeug, das eine funktionierende Excel ablösen soll, ist die erste Zahl kein Plan, sondern ein Risiko; und B §10.4 zieht daraus bereits selbst die richtige Konsequenz („unter 10 h/Woche → denselben Speicherentwurf in TypeScript bauen").

**Was den Vorschlag rettet** — er ist reparabel, und zwar ohne die Leitidee anzufassen:
- L1, L2, L3, L4, L11, L12 als **zusätzliche Meilensteinpositionen** aufnehmen und die Spanne auf 35–45 PW korrigieren, statt sie zu verteidigen.
- **M0 erweitern** um genau drei Ja/Nein-Fragen, die heute in M9 stecken und dort zu spät kommen: per-User-Installation ohne Admin, Update ohne Elevation, Zweitmonitor bei gemischter DPI auf echter Windows-Hardware. Alle drei sind billig zu beantworten und teuer zu übersehen.
- **Die Windows-Maschine benennen** (L8) — ohne sie ist M0(b) nicht durchführbar.
- **`s1 sim` an das Release-Gate koppeln** (L6), weil die stärkste Absicherung des Entwurfs sonst von Disziplin abhängt statt von einem Mechanismus.
- Und die von B selbst eingebaute Notbremse ernst nehmen: **nach M3 gegen dieselbe Architektur in TypeScript neu bewerten** (B §8.2 Punkt 3). Nach dieser Prüfung ist der Erwartungswert dieser Neubewertung nicht neutral — L1, L7, L8 und der Zweisprachenpreis (B §8.3: +6 bis +10 PW) fallen dort sämtlich weg, während der fachliche Kern (Ereignisprotokoll, Fold, Ausgaben aus der Projektion, EEB-Naht) stackneutral erhalten bleibt.

Der Entwurf ist gut; das Lieferversprechen ist es nicht. Wer B annimmt, sollte es mit korrigierter Zahl, erweitertem M0 und ohne den Satz „Excel-Parität" annehmen — oder den in B §10.4 beschriebenen TypeScript-Weg auf demselben Speichermodell wählen.

---

*Ende. Abschnitte 0–12 vollständig.*
