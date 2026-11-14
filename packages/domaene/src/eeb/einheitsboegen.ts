/**
 * Die Erfassungsbögen gewählter Einheiten — für den Sammel-Download aus der
 * Einheitentabelle.
 *
 * **Welcher Bogen zu einer Einheit gehört.** Eine Einheit zeigt mit
 * `meldungId` auf die Meldung, aus der sie angelegt wurde; jede spätere
 * Übernahme (eine Revision, §5.8.2) trägt die Einheit in `uebernahme.einheitId`.
 * Beide Wege zählen. Hat eine Einheit mehrere Bögen, gilt der mit dem jüngsten
 * `stand` — das ist der, den die Einheit zuletzt über sich gemeldet hat.
 *
 * **Was keinen Bogen hat, wird genannt und nicht erfunden.** Eine von Hand
 * angelegte Einheit hat keinen Erfassungsbogen; einen aus ihren Feldern zu
 * bauen hieße, der Einheit eine Meldung unterzuschieben, die sie nie
 * abgegeben hat. Sie landet in `ohneBogen`, damit die Oberfläche es sagt.
 *
 * Zwei gewählte Einheiten können auf dieselbe Meldung zeigen (nach dem
 * Aufteilen). Der Bogen steht dann einmal in der Datei.
 */

import type { Erfassungsbogen } from "@bos/eeb-format";

import type { EinheitZustand, MeldungZustand, Zustand } from "../zustand.js";

/** Ein Bogen in der Form, die `buendelAusMeldungen` erwartet. */
export interface Einheitsbogen {
  readonly meldungId: string;
  readonly einheitSchluessel: string;
  readonly bogen: Erfassungsbogen;
  readonly empfangenAm: string;
  readonly meldeStatus?: string;
}

export interface Einheitsbogenauswahl {
  readonly boegen: readonly Einheitsbogen[];
  /** Die Bezeichnungen der gewählten Einheiten, zu denen kein Bogen vorliegt. */
  readonly ohneBogen: readonly string[];
}

/** Die jüngsten Bögen der Einheiten `einheitIds`, in der Reihenfolge der Auswahl. */
export function boegenDerEinheiten(
  zustand: Pick<Zustand, "einheiten" | "meldungen">,
  einheitIds: readonly string[],
): Einheitsbogenauswahl {
  const boegen: Einheitsbogen[] = [];
  const ohneBogen: string[] = [];
  const gesehen = new Set<string>();
  for (const einheitId of einheitIds) {
    const einheit = zustand.einheiten[einheitId];
    if (einheit === undefined) continue;
    const meldung = juengsteMeldung(einheit, Object.values(zustand.meldungen));
    if (meldung === undefined) {
      ohneBogen.push(einheit.bezeichnung.wert ?? einheit.id);
      continue;
    }
    if (gesehen.has(meldung.id)) continue;
    gesehen.add(meldung.id);
    boegen.push(alsEinheitsbogen(meldung));
  }
  return { boegen, ohneBogen };
}

function juengsteMeldung(einheit: EinheitZustand, meldungen: readonly MeldungZustand[]): MeldungZustand | undefined {
  let juengste: MeldungZustand | undefined;
  for (const meldung of meldungen) {
    if (!hatBogen(meldung) || !gehoertZu(meldung, einheit)) continue;
    if (juengste === undefined || zeitwert(meldung) > zeitwert(juengste)) juengste = meldung;
  }
  return juengste;
}

/** Der `stand` als Zahl — ISO-Texte mit verschiedenem Versatz ordnen sich nicht als Text. */
function zeitwert(meldung: MeldungZustand): number {
  const wert = Date.parse(meldung.stand.wert ?? "");
  return Number.isNaN(wert) ? 0 : wert;
}

function gehoertZu(meldung: MeldungZustand, einheit: EinheitZustand): boolean {
  // `null` heißt: Die Übernahme wurde zurückgenommen (§5.8.1).
  const uebernahme = meldung.uebernahme?.wert as { readonly einheitId: string } | null | undefined;
  return uebernahme?.einheitId === einheit.id || einheit.meldungId?.wert === meldung.id;
}

function hatBogen(meldung: MeldungZustand): boolean {
  return meldung.bogen?.wert !== undefined && meldung.bogen.wert !== null;
}

function alsEinheitsbogen(meldung: MeldungZustand): Einheitsbogen {
  const status = meldung.meldeStatus?.wert;
  return {
    meldungId: meldung.id,
    einheitSchluessel: meldung.einheitSchluessel?.wert ?? "",
    bogen: meldung.bogen?.wert as unknown as Erfassungsbogen,
    empfangenAm: meldung.empfangenAm.wert ?? "",
    ...(typeof status === "string" ? { meldeStatus: status } : {}),
  };
}
