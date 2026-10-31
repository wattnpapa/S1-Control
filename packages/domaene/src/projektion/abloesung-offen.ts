/**
 * Offene Ablösungen: Die ablösende Einheit ist eingetroffen, die abgelöste
 * zählt aber weiter zur Ist-Stärke.
 *
 * Ohne diesen Hinweis stünden nach jeder Ablösung beide Einheiten in der
 * Ist-Zahl (Führung Runde 3, P1-2). Die Projektion ändert nichts am Status —
 * ob die abgelöste Einheit zurückgeführt wird, entscheidet die Führung. Sie
 * liefert nur die Frage, die die Oberfläche stellen kann.
 */

import { zaehlklasse } from "../kennzahlen.js";
import type { Id } from "../werte.js";
import type { Zustand } from "../zustand.js";
import { abloesendeEinheitId } from "./anforderung.js";

export interface OffeneAbloesung {
  readonly anforderungId: Id;
  /** Die abgelöste Einheit, die noch zur Ist-Stärke zählt. */
  readonly abgeloesteEinheitId: Id;
  readonly abgeloesteBezeichnung: string;
  readonly abloesendeEinheitId: Id;
  readonly abloesendeBezeichnung: string;
}

function bezeichnung(zustand: Zustand, id: Id): string {
  const wert = zustand.einheiten[id]?.bezeichnung.wert;
  return typeof wert === "string" && wert !== "" ? wert : id;
}

/** Alle eingetroffenen Ablösungen, deren abgelöste Einheit noch aktiv zählt — nach Anforderungs-Id geordnet. */
export function offeneAbloesungen(zustand: Zustand): readonly OffeneAbloesung[] {
  const liste: OffeneAbloesung[] = [];
  for (const anforderung of Object.values(zustand.anforderungen)) {
    if (anforderung.zustand !== "EINGETROFFEN") continue;
    const abgeloest = anforderung.abzuloesendeEinheitId?.wert;
    const abloesend = abloesendeEinheitId(anforderung);
    if (typeof abgeloest !== "string" || abloesend === undefined || abgeloest === abloesend) continue;
    const einheit = zustand.einheiten[abgeloest];
    if (einheit === undefined || zustand.einheiten[abloesend] === undefined) continue;
    if (zaehlklasse(zustand, einheit) !== "ist") continue;
    liste.push({
      anforderungId: anforderung.id,
      abgeloesteEinheitId: abgeloest,
      abgeloesteBezeichnung: bezeichnung(zustand, abgeloest),
      abloesendeEinheitId: abloesend,
      abloesendeBezeichnung: bezeichnung(zustand, abloesend),
    });
  }
  return liste.sort((a, b) => (a.anforderungId < b.anforderungId ? -1 : a.anforderungId > b.anforderungId ? 1 : 0));
}
