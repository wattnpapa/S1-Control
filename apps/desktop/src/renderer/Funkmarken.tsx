/**
 * Die Marken des Funkplans (KONZEPT-FUNKPLAN.md §4 bis §6): Betriebsart und
 * „ohne Rufgruppe".
 *
 * Eine Stelle für beides, weil vier Ansichten sie zeigen — Rufgruppenliste,
 * Zuordnung, Zelle im Blatt und Zelle der Einheitentabelle — und die Marke
 * überall dieselbe Auskunft geben soll. **DMO in Bernstein**: Die Reichweite
 * ist begrenzt, und der Sprechfunker muss den Gateway im Kopf haben; bei DMO
 * tut er etwas anderes als bei TMO. Analog gestrichelt, TMO neutral. Farbe
 * **und** Wort, wie jede Zustandsmarke.
 */

import { projektion, type Tabellenzeile } from "@s1/domaene";

import type { Zustandswahl } from "../kontrakt/index.js";

/** Der Ton der Betriebsart: Bernstein für DMO, gestrichelt für Analog. */
export function betriebsartTon(betriebsart: string | undefined): string {
  if (betriebsart === "DMO") return "warn";
  if (betriebsart === "ANALOG") return "analog";
  return "";
}

export function Betriebsartmarke({ betriebsart }: { readonly betriebsart: string | undefined }): React.JSX.Element {
  const ton = betriebsartTon(betriebsart);
  return <span className={`marke-zustand betriebsart ${ton}`.trim()}>{projektion.betriebsartWort(betriebsart)}</span>;
}

/** „ohne" in der Zelle, „ohne Rufgruppe" als Kopf der Gruppe: die Arbeit, die ansteht. */
export function OhneRufgruppe({ lang = false }: { readonly lang?: boolean }): React.JSX.Element {
  return <span className="marke-zustand warn">{lang ? "ohne Rufgruppe" : "ohne"}</span>;
}

/**
 * Die Marke in der Zelle „Rufgruppe" der Einheitentabelle (Option 5c): „DMO"
 * bei Direktbetrieb, „ohne" für eine Einheit, die zählt oder erwartet wird
 * und keine geltende Rufgruppe trägt — auch, wenn ihre Gruppe aufgelöst ist.
 * Ohne Liste (ein älterer Dienst) bleibt die Zelle ohne Marke, statt zu raten.
 */
export function Rufgruppenzellmarke(props: {
  readonly zeile: Tabellenzeile;
  readonly werteliste: readonly Zustandswahl[] | undefined;
}): React.JSX.Element | null {
  const { zeile, werteliste } = props;
  if (zeile.zaehlklasse !== "ist" && zeile.zaehlklasse !== "erwartet") return null;
  const wert = zeile.zellen["rufgruppe"]?.wert;
  const gesetzt = typeof wert === "string" && wert !== "" ? wert : undefined;
  if (gesetzt === undefined) return <OhneRufgruppe />;
  if (werteliste === undefined) return null;
  const eintrag = werteliste.find((w) => w.wert === gesetzt);
  if (eintrag === undefined) return <> <OhneRufgruppe /></>;
  return eintrag.betriebsart === "DMO" ? <> <Betriebsartmarke betriebsart="DMO" /></> : null;
}
