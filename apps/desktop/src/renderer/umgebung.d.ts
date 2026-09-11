/**
 * Was der Bündler zur Bauzeit beisteuert.
 *
 * Der Renderer hat `"types": []` (tsconfig.renderer.json) — bewusst: Keine
 * Node-Typen, keine Electron-Typen. `vite/client` zöge beides an Typen mit
 * herein, die hier nichts zu suchen haben. Gebraucht wird genau eine
 * Ergänzung: `import.meta.glob`, mit dem `zeichensatz.ts` die importierten
 * taktischen Zeichen ins Bündel nimmt.
 */

interface ImportMeta {
  /**
   * Vite löst das Muster zur Bauzeit auf. Mit `eager` liegt der Inhalt
   * unmittelbar vor; ohne ihn stünden hier Ladefunktionen.
   */
  glob(
    muster: string,
    optionen?: { eager?: boolean; query?: string; import?: string },
  ): Record<string, unknown>;
}

/** Rohtext statt Modul — so kommt `index.json` des Zeichensatzes herein. */
declare module "*.json?raw" {
  const inhalt: string;
  export default inhalt;
}
