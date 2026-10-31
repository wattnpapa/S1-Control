/**
 * Die Bedienschritte zwischen Anforderung und Einheit (M5.3).
 *
 * Zwei Handgriffe, die in der Excel Abtipparbeit sind: Aus einer
 * eingetroffenen Anforderung wird eine Einheit, und die Anforderung erfährt,
 * welche Einheit sie erledigt hat. Beides sind gewöhnliche Ereignisse des
 * Katalogs — `EinheitGemeldet` und `AnforderungErledigt` mit
 * `abloesendeEinheitId` im Wert (`zErledigung`). Ein eigenes
 * Verknüpfungsereignis gäbe es nur, wenn kein bestehendes Feld passte.
 *
 * Eine eigene Datei, weil `bedienschritte.ts` über der Grenze für neue
 * Dateien liegt.
 */

import type { Staerke } from "@s1/domaene";

import { auftragErfassen } from "./einheitsteile.js";
import type { Entwurf } from "./index.js";

/**
 * Der Status einer Einheit, die aus „Eingetroffen“ entsteht: Sie ist da, aber
 * noch nicht im Einsatz — „Einsatzbereit“ wie nach der Meldung am Eingang.
 * „Angefordert“ wäre falsch: Das ist der Status vor dem Eintreffen.
 */
export const STATUS_EINGETROFFEN = "EINSATZBEREIT";

/** Was die Maske „Einheit aus Anforderung anlegen“ abschickt. */
export interface AnlageAusAnforderung {
  readonly einheitId: string;
  readonly abschnittId: string;
  readonly bezeichnung: string;
  readonly organisation: string;
  readonly ebene: string;
  readonly staerke: Staerke;
  readonly herkunft?: string;
  readonly reihenfolge: number;
}

/** Der Auftrag der Anforderung an der neuen Einheit — leer, wenn keiner genannt ist. */
export function auftragAusAnforderung(
  auftragId: string,
  einheitId: string,
  text: string,
  von: string,
): Entwurf | undefined {
  return text.trim() === "" ? undefined : auftragErfassen({ auftragId, einheitId, text, von });
}

/**
 * Die Einheit aus einer Anforderung — ein `EinheitGemeldet` wie aus der
 * Vorlage, nur mit den Angaben der Anforderung. Die Einheit ist
 * eingetroffen, also „Einsatzbereit“ (`STATUS_EINGETROFFEN`) und nicht mehr
 * „Angefordert“; weiter meldet sie selbst.
 */
export function anlageAusAnforderung(anlage: AnlageAusAnforderung): Entwurf {
  const herkunft = anlage.herkunft?.trim() ?? "";
  return {
    typ: "EinheitGemeldet",
    nutzlast: {
      einheitId: anlage.einheitId,
      abschnittId: anlage.abschnittId,
      bezeichnung: anlage.bezeichnung.trim(),
      organisation: anlage.organisation,
      hierarchie: herkunft === "" ? [] : [{ art: "HERKUNFT", name: herkunft }],
      ebene: anlage.ebene,
      staerke: anlage.staerke,
      personalErfassung: "NUR_STAERKE",
      status: STATUS_EINGETROFFEN,
      reihenfolge: anlage.reihenfolge,
      istFuehrungDesAbschnitts: false,
    },
  };
}

/** Die geltende Erledigung, wie die Anforderungszeile sie nennt. */
export interface GeltendeErledigung {
  readonly anforderungId: string;
  readonly erledigtAm: string;
  readonly abloesendeEinheitId?: string;
}

/**
 * Trägt die ablösende Einheit an einer **schon** eingetroffenen Anforderung
 * nach.
 *
 * Die Eintreffzeit bleibt, wie sie war — nachgetragen wird die Einheit, nicht
 * ein zweites Eintreffen. `vorher` ist die geltende Erledigung (§2.2a): Hat
 * ein anderer Arbeitsplatz sie inzwischen zurückgenommen oder anders
 * verknüpft, wird das als Hinweis sichtbar und nicht still überschrieben.
 */
export function abloesungNachtragen(geltend: GeltendeErledigung, einheitId: string): Entwurf {
  const vorher =
    geltend.abloesendeEinheitId === undefined
      ? { erledigtAm: geltend.erledigtAm }
      : { erledigtAm: geltend.erledigtAm, abloesendeEinheitId: geltend.abloesendeEinheitId };
  return {
    typ: "AnforderungErledigt",
    nutzlast: { anforderungId: geltend.anforderungId },
    vorher,
    neu: { erledigtAm: geltend.erledigtAm, abloesendeEinheitId: einheitId },
  };
}
