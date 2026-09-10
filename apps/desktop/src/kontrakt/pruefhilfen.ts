/**
 * Prüfhilfen zum Kontrakt (M7.3).
 *
 * Sie stehen hier und nicht in einem Testordner, weil beide Seiten der Naht
 * sie brauchen: die Renderertests, die eine Peerzeile zeigen, und die
 * Schalentests, die eine bauen. Eine zweite Fassung je Seite wäre bei der
 * nächsten Erweiterung des Lagebilds zweimal zu ändern.
 */

import type { Peer } from "./index.js";

/**
 * Ein Arbeitsplatz mit unauffälligen Werten; angegeben wird nur, worauf es
 * im jeweiligen Test ankommt.
 *
 * Die Vorbelegung ist bewusst der Normalfall — wache Uhr, nichts in
 * Quarantäne, gelesener Stand gleich geschriebenem: So ist in jedem Test
 * sichtbar, welche **eine** Abweichung er prüft.
 */
export function peer(teile: Partial<Peer> = {}): Peer {
  return {
    clientId: "a",
    anzeigename: "A",
    rechnername: "ra",
    veraltet: false,
    wanduhr: "",
    programmversion: "2.0.0",
    segment: 0,
    offset: 0,
    gelesenerOffset: 0,
    uhrAbweichungMs: 0,
    quarantaene: 0,
    ...teile,
  };
}
