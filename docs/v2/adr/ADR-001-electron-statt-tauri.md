# ADR-001 – Electron bleibt; Tauri und Rust werden nicht übernommen

Status: vorgeschlagen · Datum: 2026-09-08 · Entscheider: Johannes Rudolph

## Kontext

Das Schwesterprojekt bmecatEditor ist mit Tauri 2, einem UI-freien Rust-Kern-Crate und React in zehn Tagen zu einem leistungsfähigen Werkzeug geworden. Die Frage war, ob dieser Stack auch für S1-Control v2 der bessere ist. S1-Control hat andere harte Anforderungen: mehrere Clients auf einer SMB-Freigabe ohne Server, Offline-Betrieb, Verteilung an Windows-11-Rechner ohne Admin-Rechte, Zweitfenster für den Stärke-Monitor, Drucken, Integration des TypeScript-Codecs von erfassungsbogen.app.

## Entscheidung

S1-Control v2 wird mit Electron (aktuelle Stable-Linie), React und TypeScript gebaut. Rust und Tauri werden nicht eingesetzt.

## Begründung

1. **Die Speicherfrage ist stack-neutral.** SQLite auf dem Share scheitert in Rust genauso wie in Node (SMB-Locking, Cache-Kohärenz, Oplock-Breaks); das Ereignisprotokoll braucht nur Datei-Append, fsync und UDP, in beiden Sprachen gleich gut verfügbar. Tauri löst also keines der harten S1-Probleme von selbst (Bestandsaufnahme `bmecat-stack-muster.md` §9 Gesamteinschätzung, `nas-speicher-recherche.md` §10).
2. **Der geteilte TypeScript-Kern erzwingt Node außerhalb des UI-Threads.** Ein Kern, der das Ereignisprotokoll faltet, muss mit Dateizugriff und außerhalb des Renderers laufen. Tauris Rust-Seite kann kein TypeScript ausführen; die drei Auswege (Kern im WebView mit zwei getrennten JS-Kontexten für zwei Fenster, Kern in Rust nachbauen mit Doppelpflege bei jedem EEB-Schemaschritt, Node als Sidecar neben WebView2) sind alle schlechter als ein Worker-Thread in Electron (Vorschlag C §2.2).
3. **Kosten für einen Einzelentwickler.** Der Tauri-Vorschlag selbst beziffert die Zweisprachengrenze mit +20 bis +35 Prozent, also +6 bis +10 Personenwochen, dazu E2E-Werkzeugwechsel (Playwright steuert Tauri-WebViews nicht; die zehn BDD-Szenarien gingen verloren), Neubau von Updater und Zweitfenster-Logik in Rust, dreifache CI-Zeit (Vorschlag B §8, Widerlegung B-Lieferbarkeit).
4. **Electrons klassische Nachteile entfallen hier weitgehend.** Ohne SQLite gibt es kein natives Modul mehr, also kein node-gyp und keinen ABI-Bruch. Der Installer ist per Konstruktion offline vollständig und per-User installierbar; Drucken (`printToPDF`) und Mehrfenster sind erprobt. Der RAM-Nachteil (geschätzt 250 bis 450 MB gegenüber 80 bis 150 MB, nicht gemessen) ist für FüSt-Laptops tragbar.
5. **Was bleibt vom bmecatEditor-Muster:** die Neuordnung als UI-freier Kern mit eigenen Tests und CLI, die Konzeptdokumente mit Paragraphen-Nummern, Guards und Worker-Muster, die Schema-Versionierung. Diese Muster sind sprachunabhängig und werden in TypeScript übernommen (`bmecat-stack-muster.md` §8.1 M1, M7, M8, M12, M16, M29 bis M31).

## Verworfene Alternative

Tauri 2 mit Rust-Kern-Crates (Vorschlag B): im Wettbewerb 50 von 100 Punkten gegen 73 für Electron-Evolution; drei Blocker aus eigenen Festlegungen (verwaister Segment-Rest, Ereignis-ID ohne Monotoniezusage, Simulation, die die Zielfehlerklasse nicht sieht). Für die Akten: Tauri hatte zum Entscheidungszeitpunkt 47 stabile 2.x-Releases über 12 Minor-Linien; der Multi-Monitor-Fix verlangt mindestens 2.11; WebView2 ist auf Windows 11 vorinstalliert, weshalb das ursprünglich schwerste Tauri-Risiko (Fixed-Runtime, 180 MB) entfallen wäre. Das ändert die Rangfolge nicht.

## Konsequenzen

- Eine Sprache über Kern, Schale, Renderer, CLI und geteilten Kern.
- Der v1-Renderer wird nicht übernommen (Props-Drilling, Typfehler, keine Komponententests), wohl aber Fachregeln, STAN-Daten, Zeichen-Inferenz, BDD-Szenarien und CI-Gerüst.
- Die Frage „Warum nicht Tauri?" ist mit diesem ADR beantwortet und wird nicht bei jeder Gelegenheit neu gestellt; neu bewertet wird sie nur, wenn sich eine Randbedingung ändert (z. B. Serverprozess erlaubt, kein geteilter TS-Kern).
