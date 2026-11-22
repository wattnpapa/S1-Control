/**
 * Was der Monitor außer dem Lagebild für die gewählte Ansicht holt: die
 * Versorgungsansicht, den Funkplan, die Stärketafel, die Warteschlange und
 * den Lageticker. Jeder Abruf läuft nur, solange eine Ansicht ihn braucht.
 */

import type { MonitorAnsicht } from "../kontrakt/index.js";
import type { Ansichtseigenschaften } from "./Monitoransichten.js";
import { useFunkplanansicht } from "./useFunkplanansicht.js";
import { useTagebuchticker, useWarteschlange } from "./useMonitorlisten.js";
import { useStaerketafel } from "./useStaerketafel.js";
import { useVersorgungsansicht } from "./useVersorgungsansicht.js";

const BRAUCHT_VERSORGUNG: readonly MonitorAnsicht[] = ["tafel", "vorausschau", "unterbringung", "sofortbedarf"];
const BRAUCHT_FUNKPLAN: readonly MonitorAnsicht[] = ["funkplan", "still"];
const BRAUCHT_STAERKE: readonly MonitorAnsicht[] = ["abschnitte", "organisationen", "kreuz", "status", "kommen", "einsatzmittel", "auftraege"];

export type Monitordaten = Pick<Ansichtseigenschaften, "ansicht" | "funkplan" | "staerketafel" | "warteschlange" | "ticker">;

export function useMonitordaten(ansicht: MonitorAnsicht, akteId: string | undefined, lageZeiger: number | undefined): Monitordaten {
  const offen = lageZeiger !== undefined;
  const versorgung = useVersorgungsansicht(akteId, lageZeiger, 24, offen && BRAUCHT_VERSORGUNG.includes(ansicht));
  const braucheFunk = offen && BRAUCHT_FUNKPLAN.includes(ansicht);
  const funk = useFunkplanansicht(braucheFunk ? akteId : undefined, lageZeiger, "", braucheFunk);
  const staerketafel = useStaerketafel(akteId, lageZeiger, offen && BRAUCHT_STAERKE.includes(ansicht));
  const warteschlange = useWarteschlange(akteId, lageZeiger, offen && ansicht === "warteschlange");
  const ticker = useTagebuchticker(akteId, lageZeiger, offen && ansicht === "ticker");
  return { ansicht: versorgung.ansicht, funkplan: funk.ansicht, staerketafel, warteschlange, ticker };
}
