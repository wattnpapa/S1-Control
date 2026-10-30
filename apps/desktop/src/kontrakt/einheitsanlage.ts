/**
 * Eine Einheit anlegen — mit oder ohne Vorlage, aber mit **einer** Bauweise.
 *
 * Die Excel kennt beide Wege: eine Zeile aus den Kopiervorlagen kopieren oder
 * eine leere Zeile frei ausfüllen. Beide ergeben im Blatt dieselbe Zeile, und
 * beide ergeben hier dasselbe Ereignis `EinheitGemeldet`. Der einzige
 * Unterschied ist `vorlageId`: Er steht nur da, wo eine Vorlage die Werte
 * geliefert hat (ZDM §3.2), und das Schema führt ihn deshalb optional.
 *
 * Eine zweite Funktion für den freien Weg wäre die zweite Bauweise, die beim
 * nächsten Feld, das die Anlage bekommt, vergessen wird. Darum baut
 * `anlageAusVorlage` (in `bedienschritte.ts`) ihren Entwurf hier.
 */

import type { Organisation, Staerke, TaktischeEbene } from "@s1/domaene";

import type { Entwurf } from "./index.js";

/** Der Vorbelegungsstatus einer neu angelegten Einheit (§5.4, Blatt „Stärke“ Spalte Z). */
export const STATUS_VORBELEGUNG = "ANGEFORDERT";

export interface Einheitsanlage {
  readonly einheitId: string;
  readonly abschnittId: string;
  readonly bezeichnung: string;
  readonly organisation: Organisation;
  readonly ebene: TaktischeEbene;
  readonly staerke: Staerke;
  readonly reihenfolge: number;
  readonly herkunft?: string;
  /** Nur auf dem Vorlagenweg. */
  readonly vorlageId?: string;
}

/**
 * Der Entwurf einer neuen Einheit.
 *
 * Der Status ist `ANGEFORDERT` und nicht `IM_EINSATZ`: Wer anlegt, plant
 * Kräfte — er meldet sie nicht als anwesend. Das gilt für die freie Zeile wie
 * für die Kopiervorlage.
 */
export function einheitsanlage(auftrag: Einheitsanlage): Entwurf {
  const herkunft = auftrag.herkunft?.trim() ?? "";
  return {
    typ: "EinheitGemeldet",
    nutzlast: {
      einheitId: auftrag.einheitId,
      abschnittId: auftrag.abschnittId,
      bezeichnung: auftrag.bezeichnung.trim(),
      organisation: auftrag.organisation,
      // §5.1, `zHierarchieEbene`: Die Stufe heißt `art` und `name`, nicht
      // `ebene` und `bezeichnung` — der Typ `HierarchieEbene` in `werte.ts`
      // nennt sie anders, und maßgeblich ist das Schema, gegen das der
      // Aktendienst prüft (Befund H-B1 im Bericht zu M3).
      hierarchie: herkunft === "" ? [] : [{ art: "ORTSVERBAND", name: herkunft }],
      ebene: auftrag.ebene,
      staerke: auftrag.staerke,
      personalErfassung: "NUR_STAERKE",
      status: STATUS_VORBELEGUNG,
      reihenfolge: auftrag.reihenfolge,
      istFuehrungDesAbschnitts: false,
      ...(auftrag.vorlageId === undefined ? {} : { vorlageId: auftrag.vorlageId }),
    },
  };
}
