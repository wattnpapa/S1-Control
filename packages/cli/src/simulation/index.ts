/**
 * `s1 simuliere` — die Simulation aus 05-UMSETZUNGSPLAN.md, M0.4.
 *
 * Ring 3: Dieses Paket darf alle `@s1/*` und `node:`, aber kein Electron
 * (02-ZIELBILD.md, „Vier Ringe"; erzwungen in `eslint.config.mjs`). Die
 * Simulation läuft deshalb ohne Electron, ohne Worker und ohne IPC — das ist
 * M2.1.
 */

export { FeindlichesDateisystem, OHNE_STOERUNG, VOLLE_STOERUNG, type Stoerprofil } from "./feindlichesDateisystem.js";
export { Klient, type Ruhemerkmale } from "./klient.js";
export { berichte, fehlendeStoerungen, GEFORDERTE_STOERUNGEN } from "./bericht.js";
export {
  erhebeStand,
  vektorenGleich,
  vergleiche,
  type Clientstand,
  type Dateistand,
  type Vergleichsbefund,
  type Versionsvektor,
} from "./konvergenz.js";
export { fuehreSimulationAus, type Laufergebnis, type LaufOptionen, type Phasenbefund } from "./lauf.js";
export type { Messwerte } from "./messung.js";
export {
  ALLE_FEHLER,
  OHNE_FEHLER,
  abnahmePlan,
  deutePlan,
  pruefePlan,
  ruhigerPlan,
  type Fehlerinjektion,
  type Plan,
} from "./plan.js";
export { Stoerwerk } from "./stoerungen.js";
export { Clientuhr, Simulationsuhr } from "./uhr.js";
export { Zufall } from "./zufall.js";
