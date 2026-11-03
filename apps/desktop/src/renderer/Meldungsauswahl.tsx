/**
 * Was die gewählte Meldung im Eingangskorb kann — als Auswahlleiste unter
 * dem Korb und als Kontextmenü an der Zeile (Entwurf „Entlastung", 3.7).
 *
 * Bis Runde 6 standen „Ablehnen", „Übernahme zurück" und die Auswahl
 * „Meldestatus …" in jeder Zeile der Spalte „Handlung". Jetzt erscheinen sie
 * erst mit der Wahl einer Zeile. „Ablehnen mit Grund …" fragt den Grund
 * (§2.4); bei einer abgelehnten Meldung steht dort „Ablehnung zurück". Der
 * Meldestatus bleibt eine Auswahl und steht in der Leiste hinter den
 * Knöpfen, im Kontextmenü als drei Einträge.
 *
 * **Kein „Übernehmen".** Eine Meldung wird beim Einlesen des Bogens in der
 * Lage übernommen (Strg+Q), nicht aus dem Korb; einen Ruf, der eine
 * Korbzeile übernimmt, gibt es nicht. Der Hauptknopf des Korbs ist deshalb
 * „Bündel einlesen …".
 */

import type { Meldungszeile } from "@s1/domaene";

import { Auswahlkontextmenue, Auswahlleiste, type Leistenknopf } from "./Auswahlleiste.js";
import type { Kontextort } from "./Klappmenue.js";
import { MELDESTATUS, type Meldestatus } from "../kontrakt/bedienschritte.js";

export interface MeldungsauswahlEigenschaften {
  readonly zeile: Meldungszeile;
  /** Warum Schreiben gerade nicht geht (beendeter Einsatz, laufender Schritt, keine Verbindung). */
  readonly sperre: string | undefined;
  /** Nur der beendete Einsatz sperrt das Ablehnen; es fragt erst nach dem Grund. */
  readonly ablehnenSperre: string | undefined;
  readonly aufAblehnen: () => void;
  readonly aufAblehnungZurueck: () => void;
  readonly aufUebernahmeZurueck: () => void;
  readonly aufMeldestatus: (status: Meldestatus) => void;
  readonly aufFassungen: () => void;
}

const STATUSWORT: Readonly<Record<Meldestatus, string>> = {
  ANWESEND: "anwesend",
  ABGERUECKT: "abgerückt",
  AUFGEGANGEN: "aufgegangen",
};

export function meldungstitel(zeile: Meldungszeile): string {
  return `1 gewählt · ${zeile.bezeichnung}`;
}

function mit<T extends object>(sperre: string | undefined, knopf: T): T & { readonly sperre?: string } {
  return sperre === undefined ? knopf : { ...knopf, sperre };
}

/** Die Knöpfe der Leiste, in ihrer Reihenfolge. */
export function meldungsknoepfe(p: MeldungsauswahlEigenschaften): readonly Leistenknopf[] {
  const { zeile } = p;
  const knoepfe: Leistenknopf[] = [
    zeile.zustand === "ABGELEHNT"
      ? mit(p.sperre, { schluessel: "zurueck", text: "Ablehnung zurück", aufWahl: p.aufAblehnungZurueck })
      : mit(p.ablehnenSperre, {
          schluessel: "ablehnen",
          text: "Ablehnen mit Grund …",
          titel: "Die Ablehnung steht mit Grund im Einsatztagebuch; die Meldung bleibt im Korb",
          aufWahl: p.aufAblehnen,
        }),
  ];
  if (zeile.einheitId !== undefined) knoepfe.push(mit(p.sperre, { schluessel: "uebernahme", text: "Übernahme zurück", aufWahl: p.aufUebernahmeZurueck }));
  if (zeile.fassungen > 1) knoepfe.push({ schluessel: "fassungen", text: `Fassungen (${String(zeile.fassungen)}) …`, aufWahl: p.aufFassungen });
  return knoepfe;
}

/** Die Auswahl „Meldestatus …" in der Leiste: schreibt sofort, wie bisher in der Zeile. */
function Meldestatuswahl({ zeile, sperre, aufMeldestatus }: MeldungsauswahlEigenschaften): React.JSX.Element {
  return (
    <select
      aria-label={`Meldestatus ${zeile.bezeichnung}`}
      value=""
      disabled={sperre !== undefined}
      title={sperre}
      onChange={(e) => {
        if (e.target.value !== "") aufMeldestatus(e.target.value as Meldestatus);
      }}
    >
      <option value="">Meldestatus …</option>
      {MELDESTATUS.map((wert) => (
        <option key={wert} value={wert}>
          {wert}
        </option>
      ))}
    </select>
  );
}

export function Meldungsleiste(p: MeldungsauswahlEigenschaften): React.JSX.Element {
  return <Auswahlleiste titel={meldungstitel(p.zeile)} knoepfe={meldungsknoepfe(p)} dazu={<Meldestatuswahl {...p} />} />;
}

export function Meldungskontextmenue(p: MeldungsauswahlEigenschaften & { readonly ort: Kontextort; readonly aufSchliessen: () => void }): React.JSX.Element {
  const status = MELDESTATUS.map((wert) =>
    mit(p.sperre, { schluessel: wert, text: `Meldestatus: ${STATUSWORT[wert]}`, aufWahl: () => p.aufMeldestatus(wert) }),
  );
  return <Auswahlkontextmenue ort={p.ort} titel={p.zeile.bezeichnung} knoepfe={[...meldungsknoepfe(p), ...status]} aufSchliessen={p.aufSchliessen} />;
}
