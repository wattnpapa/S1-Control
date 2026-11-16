/**
 * Die beiden Parameter des Nachrichtenwegs je Einsatz in der Stammdatenmaske
 * (KONZEPT-NACHRICHTEN.md §5 „Zwanzig Minuten", Entscheidung 8, Schnitt N2).
 *
 * „Ausgänge nach der Beförderung zum Sichter" (`sichtungAuchAusgang`,
 * Vorbelegung nein) und die Schwelle der FmZ in Minuten (`fmzSchwelleMinuten`,
 * Vorbelegung 20). Keine Stammdaten im Sinn der Excel, aber Einstellungen
 * des Einsatzes, die für alle Arbeitsplätze gelten — deshalb hier und nicht
 * in den Einstellungen des Arbeitsplatzes. Geschrieben wird nur, was sich
 * gegenüber dem Gezeigten geändert hat, mit dem Wert aus dem Zustand als
 * Vorwert (`null`, solange die Vorbelegung gilt).
 */

import { FMZ_SCHWELLE_VORBELEGUNG } from "@s1/domaene";

import type { Entwurf } from "../kontrakt/index.js";
import { nachrichtenParameterSetzen } from "../kontrakt/fmzschritte.js";

/** Was im Zustand steht — fehlt, solange niemand den Parameter gesetzt hat. */
export interface Nachrichtenparameterstand {
  readonly sichtungAuchAusgang?: boolean | undefined;
  readonly fmzSchwelleMinuten?: number | undefined;
}

/** Die Eingabe der Maske, wie getippt. */
export interface Nachrichtenparametereingabe {
  readonly sichtungAuchAusgang: boolean;
  readonly fmzSchwelleMinuten: string;
}

export function parametereingabeAus(stand: Nachrichtenparameterstand): Nachrichtenparametereingabe {
  return {
    sichtungAuchAusgang: stand.sichtungAuchAusgang ?? false,
    fmzSchwelleMinuten: String(stand.fmzSchwelleMinuten ?? FMZ_SCHWELLE_VORBELEGUNG),
  };
}

/** Der Fehler der Schwelle als Satz, sonst `undefined`. */
export function parameterfehler(eingabe: Nachrichtenparametereingabe): string | undefined {
  return /^\d{1,4}$/u.test(eingabe.fmzSchwelleMinuten.trim()) && Number(eingabe.fmzSchwelleMinuten) >= 1
    ? undefined
    : "Schwelle der FmZ als ganze Zahl ab 1 (Minuten) eintragen";
}

/** Die Entwürfe für das, was sich gegenüber dem Gezeigten geändert hat. */
export function parameterEntwuerfe(einsatzId: string, stand: Nachrichtenparameterstand, eingabe: Nachrichtenparametereingabe): readonly Entwurf[] {
  const gezeigt = parametereingabeAus(stand);
  const entwuerfe: Entwurf[] = [];
  if (eingabe.sichtungAuchAusgang !== gezeigt.sichtungAuchAusgang) {
    const e = nachrichtenParameterSetzen(einsatzId, "sichtungAuchAusgang", stand.sichtungAuchAusgang ?? null, eingabe.sichtungAuchAusgang);
    if (e !== undefined) entwuerfe.push(e);
  }
  const schwelle = Number(eingabe.fmzSchwelleMinuten.trim());
  if (parameterfehler(eingabe) === undefined && schwelle !== Number(gezeigt.fmzSchwelleMinuten)) {
    const e = nachrichtenParameterSetzen(einsatzId, "fmzSchwelleMinuten", stand.fmzSchwelleMinuten ?? null, schwelle);
    if (e !== undefined) entwuerfe.push(e);
  }
  return entwuerfe;
}

export function Nachrichtenparameterfelder({ eingabe, aufAendern }: { readonly eingabe: Nachrichtenparametereingabe; readonly aufAendern: (eingabe: Nachrichtenparametereingabe) => void }): React.JSX.Element {
  return (
    <fieldset aria-label="Nachrichtenweg">
      <legend>Nachrichtenweg</legend>
      <label className="kaestchen">
        <input type="checkbox" checked={eingabe.sichtungAuchAusgang} onChange={(e) => aufAendern({ ...eingabe, sichtungAuchAusgang: e.target.checked })} />
        Ausgänge nach der Beförderung zum Sichter
      </label>
      <label>
        Schwelle der FmZ (Minuten bis zur Marke)
        <input type="text" inputMode="numeric" value={eingabe.fmzSchwelleMinuten} onChange={(e) => aufAendern({ ...eingabe, fmzSchwelleMinuten: e.target.value })} />
      </label>
    </fieldset>
  );
}
