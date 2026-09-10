/**
 * Die drei Namen der Bruecke — ohne zod, mit Absicht.
 *
 * Sie stehen getrennt vom uebrigen Kontrakt, weil das **Preload** sie braucht
 * und sonst nichts. Zog es sie aus `index.ts`, buendelte esbuild zod mit in
 * `out/preload.cjs`: 742 kB statt weniger Zeilen, geladen in der Sandbox
 * jedes Fensters, fuer drei Zeichenketten. Die Schemata bleiben dort, wo sie
 * gebraucht werden — im Main, der prueft, und im Renderer, der Formulare baut.
 */

export const KANAL_RUF = "s1:ruf";
export const KANAL_MITTEILUNG = "s1:mitteilung";

/** Der Name, unter dem die Bruecke im Renderer steht. */
export const BRUECKE = "s1";
