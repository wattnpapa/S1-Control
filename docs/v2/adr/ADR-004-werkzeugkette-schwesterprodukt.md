# ADR-004 – Werkzeugkette auf dem Stand des Schwesterprodukts, keine Migration von Altdaten

Status: vorgeschlagen · Datum: 2026-09-08 · Entscheider: Johannes Rudolph

## Kontext

v1 steht auf TypeScript 5.7, Vite 6, Vitest 3, Electron 35 und CommonJS; erfassungsbogen.app auf TypeScript 7, Vite 8, Vitest 4, Electron 43 und ESM. Zwischen beiden liegen acht Electron-Majors, zwei TypeScript- und zwei Vite-Majors sowie der Modulsystemwechsel. Ein geteilter Kern (ADR-003) setzt ESM und gleiche Werkzeugmajors voraus. Außerdem gibt es keine Altdaten: weder produktive v1-Einsatzdateien noch gefüllte Excel-Mappen (Auskunft Johannes, 2026-09-07).

## Entscheidung

1. Der neue Baum startet auf der Werkzeugkette des Schwesterprodukts: TypeScript 7 strict, Vite 8, Vitest 4, Electron in der aktuellen Stable-Linie, `"type": "module"`, npm-Workspaces.
2. Es wird kein Migrationspfad für v1-`.s1control`-Dateien und keine Excel-Datenübernahme gebaut. Übernommen werden aus der Excel nur die Kopiervorlagen als Vorlagenkatalog und aus v1 nur Code-Bausteine (siehe 02-ZIELBILD.md).
3. `npm run typecheck` prüft real: in v1 war das Skript durch `files: []` in `tsconfig.json` ein Leerlauf, während 42 Fehler im Main und 91 im Renderer bestanden und die CI grün war. In v2 läuft `tsc -b` über alle Projekte, und das Gate ist Teil des Builds.

## Begründung

- Auf der grünen Wiese kostet der aktuelle Stand nichts; später kostet das Schließen der Werkzeugschere Wochen (Widerlegung C-Lieferbarkeit F16 bis F18, Urteil §11.5 M-0).
- Migrationscode ohne Daten ist totes Gewicht; die Widerlegungen beziffern die Entlastung auf rund eine Personenwoche.
- Ein Typecheck, der nichts prüft, hat in v1 dazu geführt, dass Typfehler über Monate unbemerkt in `main` lagen (`bestandsaufnahme/s1-historie-qualitaet.md` §4).

## Konsequenzen

- v1 bleibt auf `main` bau- und lauffähig als Referenz; der v2-Baum entsteht daneben (Repo-Struktur in 02-ZIELBILD.md).
- Die Dateiendung `.s1control` wird nicht weiterverwendet; v2 arbeitet mit Einsatzordnern.
- Die Dokumentation von v1 (README, AGENTS.md, agends.md, TODO.md) beschreibt seit Mai 2026 eine nicht mehr existierende SQLite-Architektur; sie wird für v2 nicht fortgeschrieben, sondern durch `docs/v2/` ersetzt.
