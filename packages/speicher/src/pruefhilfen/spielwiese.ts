/**
 * Ein Wegwerf-Verzeichnis für Tests — ausschließlich Prüfhilfe.
 *
 * Bewusst nicht aus `index.ts` exportiert: kein Teil der öffentlichen
 * Schnittstelle von `@s1/speicher`. Die Datei liegt trotzdem unter `src/`,
 * damit `tsc -b` und ESLint sie mit denselben Ringgrenzen prüfen wie den
 * Produktionscode — dieselbe Behandlung wie `pruefhilfen/ereignisbau.ts` in
 * `@s1/domaene`.
 */

import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface Spielwiese extends AsyncDisposable {
  /** Absoluter Pfad des Wegwerf-Verzeichnisses. */
  readonly pfad: string;
  /** Legt eine Datei mit dem angegebenen Inhalt an; Zwischenordner entstehen mit. */
  schreibe(relativ: string, inhalt: string | Uint8Array): Promise<string>;
  /** Liest eine Datei als Bytes. */
  lies(relativ: string): Promise<Uint8Array>;
  /** Liest eine Datei als Text. */
  liesText(relativ: string): Promise<string>;
  /** Absoluter Pfad innerhalb der Spielwiese. */
  bei(...teile: readonly string[]): string;
}

export async function spielwiese(): Promise<Spielwiese> {
  const pfad = await fsp.mkdtemp(path.join(os.tmpdir(), "s1-speicher-"));
  return {
    pfad,
    bei: (...teile) => path.join(pfad, ...teile),
    async schreibe(relativ, inhalt) {
      const ziel = path.join(pfad, relativ);
      await fsp.mkdir(path.dirname(ziel), { recursive: true });
      await fsp.writeFile(ziel, inhalt);
      return ziel;
    },
    lies: async (relativ) => new Uint8Array(await fsp.readFile(path.join(pfad, relativ))),
    liesText: (relativ) => fsp.readFile(path.join(pfad, relativ), "utf8"),
    async [Symbol.asyncDispose]() {
      await fsp.rm(pfad, { recursive: true, force: true });
    },
  };
}
