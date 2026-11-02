/**
 * Prüfungen der Funkplan-Ereignisse vor dem Schreiben (KONZEPT-FUNKPLAN.md §8).
 *
 * Der Katalog prüft die Nutzlast; der Wert der Form-a-Arten steht aber in
 * `neu`, und den kennt er nicht. Eine Rufgruppe ohne Namen, eine Reihenfolge
 * als Text oder eine Hauptrufgruppe, die keine Kennung ist, stünde sonst für
 * immer im append-only-Protokoll. Dasselbe gilt für die Stammdaten des
 * Funkplans an der Einheit (F2): die weiteren Rufgruppen als Liste von
 * Kennungen, Funkhinweis und Funkrufname als Text. Ein Teil von `pruefeNeu`
 * im Aktendienst.
 */

import type { Ereignisentwurf } from "@s1/speicher";

function feldDer(entwurf: Ereignisentwurf): string | undefined {
  const feld = (entwurf.nutzlast as { feld?: unknown } | null | undefined)?.feld;
  return typeof feld === "string" ? feld : undefined;
}

const istText = (wert: unknown): boolean => typeof wert === "string" && wert.trim().length > 0;

/** Die Felder, die nie leer sein dürfen, mit ihrer Meldung. */
const PFLICHT: Readonly<Record<string, string>> = {
  name: "Eine Rufgruppe braucht einen Namen.",
  betriebsart: "Eine Rufgruppe braucht eine Betriebsart (TMO, DMO oder Analog).",
};

function pruefeAenderung(feld: string | undefined, neu: unknown): string | undefined {
  if (feld === undefined) return undefined;
  const pflicht = PFLICHT[feld];
  if (pflicht !== undefined) return istText(neu) ? undefined : pflicht;
  if (feld === "reihenfolge") {
    return neu === null || (typeof neu === "number" && Number.isInteger(neu)) ? undefined : "Die Reihenfolge muss eine ganze Zahl sein.";
  }
  if (feld === "abschnittId") {
    return neu === null || istText(neu) ? undefined : "Der Bereich der Rufgruppe ist keine gültige Kennung.";
  }
  return neu === null || typeof neu === "string" ? undefined : "Der Wert muss ein Text sein.";
}

/** Die Stammdatenfelder des Funkplans an der Einheit; die übrigen prüft der Aufrufer nicht hier. */
function pruefeStammdatum(feld: string | undefined, neu: unknown): string | undefined {
  if (feld === "weitereRufgruppenIds") {
    return neu === null || (Array.isArray(neu) && neu.every(istText)) ? undefined : "Die weiteren Rufgruppen müssen eine Liste von Kennungen sein.";
  }
  if (feld === "funkHinweis" || feld === "funkrufnameOverride") {
    return neu === null || typeof neu === "string" ? undefined : "Der Wert muss ein Text sein.";
  }
  return undefined;
}

/** Liefert eine Fehlermeldung in Klartext, oder `undefined`, wenn alles passt. */
export function pruefeFunk(entwurf: Ereignisentwurf): string | undefined {
  if (entwurf.typ === "RufgruppeAngelegt") {
    const nutzlast = (entwurf.nutzlast ?? {}) as Record<string, unknown>;
    if (typeof nutzlast["name"] === "string" && !istText(nutzlast["name"])) return PFLICHT["name"];
    if (typeof nutzlast["betriebsart"] === "string" && !istText(nutzlast["betriebsart"])) return PFLICHT["betriebsart"];
  }
  if (entwurf.typ === "RufgruppeGeaendert") return pruefeAenderung(feldDer(entwurf), entwurf.neu);
  if (entwurf.typ === "EinheitStammdatenGeaendert") return pruefeStammdatum(feldDer(entwurf), entwurf.neu);
  if (entwurf.typ === "EinheitRufgruppeGesetzt" && entwurf.neu !== null && !istText(entwurf.neu)) {
    return "Die Rufgruppe ist keine gültige Kennung.";
  }
  return undefined;
}
