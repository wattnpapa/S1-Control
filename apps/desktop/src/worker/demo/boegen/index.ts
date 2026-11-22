/**
 * Die Erfassungsbögen des Demo-Einsatzes — Übungsbögen aus
 * `wattnpapa/erfassungsbogen` (`examples/`), siehe `HERKUNFT.md`.
 *
 * Jeder Bogen ist eine Einheit, die sich am Meldekopf anmeldet. Der Schlüssel
 * ist der Name, unter dem das Drehbuch sie anspricht (`demoeinheiten.ts`).
 */

import type { Erfassungsbogen } from "@bos/eeb-format";

import asbSoltauVerpflegungsgruppe from "./asb-soltau-verpflegungsgruppe.json";
import bundeswehrKreisverbindungskommando from "./bundeswehr-kreisverbindungskommando.json";
import dlrgLangenhagenStaffelWasserrettung from "./dlrg-langenhagen-staffel-wasserrettung.json";
import drkRastedeBereitschaft from "./drk-rastede-bereitschaft.json";
import feuerwehrAmmerlandFachzugTh from "./feuerwehr-ammerland-fachzug-th.json";
import feuerwehrEmdenLoeschgruppeKats from "./feuerwehr-emden-loeschgruppe-kats.json";
import juhAhlhorn from "./juh-ahlhorn.json";
import katsPapenburgSandsackfuellmaschine from "./kats-papenburg-sandsackfuellmaschine.json";
import katsWesterstedeAufklaerungstruppLuft from "./kats-westerstede-aufklaerungstrupp-luft.json";
import katsWilhelmshavenHochwasserschutzsystem from "./kats-wilhelmshaven-hochwasserschutzsystem.json";
import mhdSandkrug from "./mhd-sandkrug.json";
import thwAurichFgrLogV from "./thw-aurich-fgr-log-v.json";
import thwLeerFgrW from "./thw-leer-fgr-w.json";
import thwNordenhamB from "./thw-nordenham-b.json";
import thwOldenburgB from "./thw-oldenburg-b.json";
import thwOldenburgFgrF from "./thw-oldenburg-fgr-f.json";
import thwOldenburgFgrI from "./thw-oldenburg-fgr-i.json";
import thwOldenburgFgrK from "./thw-oldenburg-fgr-k.json";
import thwOldenburgFgrN from "./thw-oldenburg-fgr-n.json";
import thwOldenburgFgrR from "./thw-oldenburg-fgr-r.json";
import thwOldenburgZtrFzFk from "./thw-oldenburg-ztr-fz-fk.json";
import thwOldenburgZtrTz from "./thw-oldenburg-ztr-tz.json";
import thwVarelB from "./thw-varel-b.json";
import thwVarelFgrWp from "./thw-varel-fgr-wp.json";
import thwWesterstedeB from "./thw-westerstede-b.json";

const ROH = {
  asbSoltauVerpflegungsgruppe,
  bundeswehrKreisverbindungskommando,
  dlrgLangenhagenStaffelWasserrettung,
  drkRastedeBereitschaft,
  feuerwehrAmmerlandFachzugTh,
  feuerwehrEmdenLoeschgruppeKats,
  juhAhlhorn,
  katsPapenburgSandsackfuellmaschine,
  katsWesterstedeAufklaerungstruppLuft,
  katsWilhelmshavenHochwasserschutzsystem,
  mhdSandkrug,
  thwAurichFgrLogV,
  thwLeerFgrW,
  thwNordenhamB,
  thwOldenburgB,
  thwOldenburgFgrF,
  thwOldenburgFgrI,
  thwOldenburgFgrK,
  thwOldenburgFgrN,
  thwOldenburgFgrR,
  thwOldenburgZtrFzFk,
  thwOldenburgZtrTz,
  thwVarelB,
  thwVarelFgrWp,
  thwWesterstedeB,
};

export type Bogenname = keyof typeof ROH;

/** Die Bögen in der Form, die die Erfassungsbogen-App schreibt; migriert werden sie bei der Übernahme. */
export const DEMO_BOEGEN = ROH as unknown as Readonly<Record<Bogenname, Erfassungsbogen>>;
