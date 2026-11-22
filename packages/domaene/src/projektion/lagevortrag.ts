/**
 * Die Mappe für die Lagebesprechung: was der Leiter Stab vortragen will.
 *
 * Gefordert im Stab-Review vom 22.11.2026 (LtrStab A1 und A2, S2 FA-S2-4):
 * Die Exportgruppe „Lagebesprechung“ hatte nur Stärkeausdrucke; wer die
 * Besprechung vorbereitete, schlug Stärke, Anforderungen, Nachrichten,
 * Aufträge und Tagebuch einzeln auf. Hier steht es auf einem Blatt.
 *
 * Keine neue Regel: Stärke, Aufträge, Einsatzzeiten und was kommt aus der
 * Übersicht, Anforderungen aus der Anforderungsliste, der Rücklauf der
 * Nachrichten, die letzten eigenen Tagebucheinträge. Was „läuft ab“ heißt,
 * rechnet `verfuegbarkeitsmarke` (K18) gegen den Stand der Mappe.
 */

import type { EingehendesEreignis } from "../fold.js";
import type { Zustand } from "../zustand.js";
import { verfuegbarkeitsmarke } from "./abloesung.js";
import { anforderungsliste, type Anforderungszeile } from "./anforderung.js";
import type { Einsatzzeitzeile } from "./einsatzzeiten.js";
import { nachrichtenausschnitt } from "./nachrichten.js";
import { ruecklauf, type Ruecklaufzeile } from "./ruecklauf.js";
import { stabsuebersicht, type Stabsuebersicht } from "./stabsuebersicht.js";
import { tagebuchausschnitt } from "./tagebuch.js";

/** So viele eigene Tagebucheinträge stehen in der Mappe, die jüngsten zuerst. */
export const LAGEVORTRAG_EINTRAEGE = 10;

export interface Lagevortrag {
  readonly uebersicht: Stabsuebersicht;
  /** Offene und zugesagte Anforderungen. */
  readonly anforderungen: readonly Anforderungszeile[];
  readonly ruecklauf: readonly Ruecklaufzeile[];
  /** Einheiten, deren „verfügbar bis“ abgelaufen ist oder innerhalb eines Tages abläuft. */
  readonly ablaufend: readonly Einsatzzeitzeile[];
  /** Die jüngsten eigenen Einträge (Meldungen, Entscheidungen, Lagebesprechungen). */
  readonly eintraege: readonly { readonly zeitpunkt?: string; readonly satz: string }[];
}

export function lagevortrag(zustand: Zustand, ereignisse: readonly EingehendesEreignis[], jetzt: string): Lagevortrag {
  const uebersicht = stabsuebersicht(zustand);
  const eigene = tagebuchausschnitt(zustand, ereignisse).zeilen.filter((z) => z.typ === "EtbEintragErfasst" || z.typ === "EtbEintragBerichtigt");
  return {
    uebersicht,
    anforderungen: anforderungsliste(zustand, { zustaende: ["OFFEN", "ZUGESAGT"] }).zeilen,
    ruecklauf: ruecklauf(nachrichtenausschnitt(zustand, { sicht: "nachweisung", jetzt }).zeilen),
    ablaufend: uebersicht.einsatzzeiten.filter((z) => verfuegbarkeitsmarke(z.verfuegbarBis, jetzt) !== undefined),
    eintraege: eigene.slice(0, LAGEVORTRAG_EINTRAEGE).map((z) => ({ ...(z.zeitpunkt === undefined ? {} : { zeitpunkt: z.zeitpunkt }), satz: z.satz })),
  };
}
