/**
 * Die Stammdaten des Einsatzes — das Blatt „Stammdaten“ der Excel.
 *
 * Die Vorlage verlangt beim Start drei Angaben, und alle drei stehen danach
 * auf jedem Ausdruck: den Namen des Einsatzes, den Namen der eigenen
 * Führungsstelle und die übergeordnete Führungsstelle. Dazu kommen hier, was
 * die Anlage `EinsatzAngelegt` ohnehin trägt: Art, Ort, Beginn und
 * Schichtmodell (§5.2).
 *
 * **Warum eine eigene Projektion.** Der Zustand führt jedes Feld als
 * Beobachtung mit HLC und Zweitwert; die Maske braucht den Wert, der gerade
 * gilt, und zwar so, dass ein ausdrücklich geleertes Feld (`null`, §3.2)
 * und ein nie gesetztes gleich aussehen: als leere Eingabe. Diese Regel
 * gehört nicht in eine `.tsx`, sondern neben die Prüfung des neuen Werts,
 * die der Worker vor dem Schreiben anwendet.
 */

import { zEinsatzArt, zPflichttext, zSchichtmodell, zZeitpunkt } from "../katalog/bausteine.js";
import type { Zustand } from "../zustand.js";

/** Die Felder, die `EinsatzStammdatenGeaendert` setzen kann — in der Reihenfolge der Maske. */
export const STAMMDATENFELDER = [
  "name",
  "art",
  "fuestName",
  "uebergeordneteFuestName",
  "ort",
  "beginn",
  "schichtmodell",
] as const;

export type Stammdatenfeld = (typeof STAMMDATENFELDER)[number];

/** Die Felder, die leer bleiben dürfen. Alle übrigen sind in der Anlage Pflicht (§5.2). */
export const FREIE_STAMMDATENFELDER: readonly Stammdatenfeld[] = ["uebergeordneteFuestName", "ort"];

/** Die Stammdaten, wie Maske, Kopfband und Ausgaben sie lesen. */
export interface Einsatzstammdaten {
  readonly name: string;
  readonly art: string;
  readonly fuestName: string;
  readonly uebergeordneteFuestName?: string;
  readonly ort?: string;
  readonly beginn: string;
  readonly schichtmodell: string;
}

function text(feld: { readonly wert: unknown } | undefined): string | undefined {
  return typeof feld?.wert === "string" && feld.wert !== "" ? feld.wert : undefined;
}

/**
 * Liest die Stammdaten aus dem Zustand; `undefined`, solange kein Einsatz angelegt ist.
 *
 * Ein Pflichtfeld, das trotzdem fehlt — ein fremdes Ereignis hat es auf
 * `null` gesetzt —, wird zum leeren Text und nicht zum Absturz: Die Maske
 * zeigt dann ein leeres Feld, und genau dort trägt der Bediener es nach.
 */
export function einsatzstammdaten(zustand: Zustand): Einsatzstammdaten | undefined {
  const einsatz = zustand.einsatz;
  if (einsatz === undefined) return undefined;
  const uebergeordnet = text(einsatz.uebergeordneteFuestName);
  const ort = text(einsatz.ort);
  return {
    name: text(einsatz.name) ?? "",
    art: text(einsatz.art) ?? "",
    fuestName: text(einsatz.fuestName) ?? "",
    ...(uebergeordnet === undefined ? {} : { uebergeordneteFuestName: uebergeordnet }),
    ...(ort === undefined ? {} : { ort }),
    beginn: text(einsatz.beginn) ?? "",
    schichtmodell: text(einsatz.schichtmodell) ?? "",
  };
}

/**
 * Prüft den Wert `neu` eines `EinsatzStammdatenGeaendert`, bevor er geschrieben wird.
 *
 * Der Katalog prüft nur die Nutzlast — welches Feld —, nicht den Wert im
 * Rahmen. Ohne diese Prüfung stünde ein leerer FüSt-Name oder ein Beginn,
 * der keine Zeitangabe ist, im append-only-Protokoll und danach auf jedem
 * Ausdruck. Rückgabe ist die Meldung für den Bediener, sonst `undefined`.
 */
export function stammdatenwertFehler(feld: string, neu: unknown): string | undefined {
  switch (feld) {
    case "name":
    case "fuestName":
      return typeof neu === "string" && zPflichttext.safeParse(neu.trim()).success
        ? undefined
        : `${feld === "name" ? "Der Einsatzname" : "Der Name der Führungsstelle"} darf nicht leer sein.`;
    case "uebergeordneteFuestName":
    case "ort":
      return neu === null || typeof neu === "string" ? undefined : "Die Angabe muss ein Text sein.";
    case "art":
      return zEinsatzArt.safeParse(neu).success ? undefined : "Die Einsatzart ist unbekannt.";
    case "schichtmodell":
      return zSchichtmodell.safeParse(neu).success ? undefined : "Das Schichtmodell ist unbekannt.";
    case "beginn":
      return zZeitpunkt.safeParse(neu).success ? undefined : "Der Einsatzbeginn ist keine lesbare Zeitangabe.";
    default:
      return undefined;
  }
}
