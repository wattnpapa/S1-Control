# S1-Control v2 — der neue Baum

Dieses Dokument beschreibt den Baum, der auf dem Branch `v2-architektur`
entsteht. Der v1-Code liegt unverändert daneben unter `legacy-v1/` und wird
nicht mehr gebaut; auf `main` steht er weiterhin allein in der Wurzel.
Verbindlich sind `docs/v2/02-ZIELBILD.md`, `docs/v2/05-UMSETZUNGSPLAN.md` und
`docs/v2/adr/ADR-003-geteilter-kern-eeb-format.md`.

## Warum `legacy-v1/`

Die Zielstruktur aus 02-ZIELBILD.md legt `packages/` und `apps/` samt einer
eigenen Wurzel-`package.json` in das Wurzelverzeichnis. Zwei
Wurzel-`package.json` nebeneinander gibt es nicht. 02-ZIELBILD.md nennt
`legacy-v1/` ausdrücklich als Option; die Verschiebung geschah per `git mv`,
die Historie jeder Datei bleibt also erhalten. v1 wird nur noch gelesen —
STAN-Daten, Zeichen-Inferenz und die BDD-Szenarien werden daraus herausgelöst.

## Aufbau

```
S1-Control/
  package.json          npm-Workspaces, ESM
  tsconfig.json         Solution-Datei für `tsc -b`
  tsconfig.base.json    gemeinsame Compileroptionen
  eslint.config.mjs     die Ringgrenzen, maschinell erzwungen
  vitest.config.ts      vier Testprojekte (node und jsdom)
  bau/kern-bauen.mjs    baut das Submodul nach vendor/eeb-format/dist
  packages/
    domaene/  speicher/  netz/  ausgaben/  cli/
  apps/desktop/         Electron-Main, Preload, Renderer
  vendor/eeb-format/      git-Submodul, geteilt mit erfassungsbogen.app
  docs/v2/              Zielbild, Umsetzungsplan, ADRs
  legacy-v1/            v1 als Referenz, wird nicht gebaut
```

Alle Pakete sind derzeit **Gerüste**: je eine kleine, fachlich sinnvolle
Funktion mit Test. Der Fachinhalt kommt ab M0.2.

## Die vier Ringe

Grundregel: jeder Ring darf nur **nach innen** importieren, nie nach außen.

| Ring | Paket | erlaubt | verboten |
|---|---|---|---|
| 1 | `@bos/eeb-format` | reines TypeScript | `node:`, DOM, React, Electron (im Kern-Repo geprüft) |
| 2 | `@s1/domaene` | `@bos/eeb-format` | `node:`, DOM, React, Electron, andere `@s1/*` |
| 3 | `@s1/speicher` | `node:fs`, `node:crypto`, `@s1/domaene` | DOM, React, Electron, `@s1/ausgaben`, `@s1/cli` |
| 3 | `@s1/netz` | `node:dgram`, `@s1/domaene` | DOM, React, Electron, `@s1/ausgaben`, `@s1/cli` |
| 3 | `@s1/ausgaben` | `@s1/domaene`, `@bos/eeb-format` | `node:`, Electron, React, `@s1/speicher`, `@s1/netz`, `@s1/cli` |
| 3 | `@s1/cli` | alle `@s1/*`, `node:` | Electron, React |
| 4 | `apps/desktop` | alles nach innen | Main-Prozess zieht keine Renderer-Bibliotheken; kein Paket importiert aus `apps/*` |

Die Grenzen stehen an **drei** Stellen, damit keine einzelne umgangen werden
kann:

1. **ESLint** (`eslint.config.mjs`, `@typescript-eslint/no-restricted-imports`)
   fängt jeden verbotenen Import — auch die Kernmodulnamen ohne `node:`-Präfix.
2. **TypeScript**: `packages/domaene/tsconfig.json` setzt `"types": []` und
   lässt `"DOM"` aus `lib` weg. Damit scheitert schon die Typprüfung an
   `process`, `document` oder `fetch` — selbst ohne Import.
3. **Vitest**: `@s1/domaene` läuft in zwei Projekten, einmal unter `node` und
   einmal unter `jsdom`. Wer eine Plattform-API zur Laufzeit braucht, fällt in
   einem der beiden Läufe durch.

## Das Submodul `vendor/eeb-format`

`@bos/eeb-format` ist der geteilte Kern mit erfassungsbogen.app (ADR-003) und hängt
als git-Submodul unter `vendor/eeb-format`. Er ist zugleich ein npm-Workspace,
`@s1/domaene` und `@s1/ausgaben` binden ihn per `"file:../../vendor/eeb-format"`
ein und rufen ihn tatsächlich auf.

> **Offen:** Das Kern-Repo hat noch **kein** GitHub-Remote — Johannes hat es
> bewusst noch nicht freigegeben. `.gitmodules` zeigt deshalb auf den lokalen
> Pfad `/Users/johannes/Developer/eeb-format`. Diese URL **muss umgeschrieben
> werden**, sobald das Remote existiert:
>
> ```bash
> git submodule set-url vendor/eeb-format git@github.com:<konto>/eeb-format.git
> git submodule sync --recursive
> ```
>
> Bis dahin ist der Submodul-Checkout in der CI nicht auflösbar; der Workflow
> `.github/workflows/build-v2.yml` läuft deswegen ausschließlich manuell (siehe
> dort).

Der Kern wird nach `vendor/eeb-format/dist/` gebaut, bevor irgendetwas anderes
läuft. Das erledigt `bau/kern-bauen.mjs` als `postinstall` der Wurzel — nicht
das `prepare`-Skript des Kerns, weil neuere npm-Versionen Install-Skripte von
Abhängigkeiten nicht mehr ungefragt ausführen.

## Erste Schritte

Voraussetzung: Node 24 (`.nvmrc`). Die `.npmrc` zeigt bewusst auf die
öffentliche npm-Registry, weil global eine CodeArtifact-Registry konfiguriert
ist.

```bash
git submodule update --init --recursive
npm install            # installiert und baut anschließend vendor/eeb-format

npm run typecheck      # tsc -b über alle Projekte, mit echten Emits
npm run lint           # die Ringgrenzen
npm test               # alle Pakete; @s1/domaene unter node und jsdom
npm run build          # Renderer (Vite) + Main/Preload (esbuild)
npm start              # leeres Electron-Fenster
npm run start:rauchprobe   # startet, meldet den Fensterzustand, beendet sich
```

Zwei Kleinigkeiten machen `tsc -b` gegen einen geleerten Baum robust, und
beide sind aus einem echten Fehlschlag entstanden, nicht aus Vorsicht:
`tsconfig.base.json` löst die eigenen `@s1/*`-Pakete per `paths` über die
Quellen auf (die `exports` zeigen auf `dist/`, das es vor dem ersten Bau nicht
gibt), und jedes Projekt legt seinen `tsBuildInfoFile` in den eigenen
Ausgabeordner (wer `dist/` löscht, löscht den Bauzustand mit — sonst hält sich
`tsc -b` für fertig und emittiert nichts). Zur Laufzeit bleibt es beim
gewöhnlichen Weg über `node_modules` und `exports`.

`npm run typecheck` ist ein echter `tsc -b`: nach dem Lauf liegen in jedem
Paket `dist/index.js` und `dist/index.d.ts`. Die Wurzel-`tsconfig.json` ist
eine Solution-Datei; sie enthält selbst keine Quellen, baut aber über ihre
Referenzen alle sechs Projekte in Abhängigkeitsreihenfolge.

### Warum zwei TypeScript-Einträge

Gebaut und typgeprüft wird mit TypeScript 7 (`@typescript/native`, liefert das
`tsc` auf dem Pfad). TypeScript 7 bringt keine JavaScript-Compiler-API mehr
mit, `typescript-eslint` bricht damit beim Laden ab. Deshalb steht zusätzlich
die Kompatibilitätsschiene `"typescript": "npm:@typescript/typescript6"` im
Baum — genau wie im Kern-Repo. Sie fällt weg, sobald `typescript-eslint`
TypeScript 7 unterstützt.

### Warum esbuild statt tsup

02-ZIELBILD.md nennt tsup für Main und Preload. tsup bringt für
Typdeklarationen eine eigene TypeScript-Schiene mit und wäre damit die dritte
TypeScript-Fassung im Baum. Die Schale braucht überhaupt keine
Deklarationsdateien — sie wird nie importiert, sondern nur gestartet. Übrig
bleibt reines Bündeln, und das erledigt esbuild direkt. Die Typprüfung macht
ohnehin `tsc -b`, nicht der Bündler.

Zwei Ausgabeformate mit Absicht: `out/main.mjs` als ESM (Electron 43 lädt
ESM-Main), `out/preload.cjs` als CommonJS (Preload-Skripte werden in der
Sandbox nur als CommonJS geladen).

### Die Rauchprobe

`S1_SMOKE=1` lässt die Schale sich selbst beenden, sobald das Fenster sichtbar
ist. Sie meldet vorher Sichtbarkeit, Titel, Größe und den aus dem Renderer
zurückgelesenen Text und beendet sich mit Exitcode 0. Damit ist ein
erfolgreicher Start ohne Zuschauer belegbar — auch in einem Skript.
