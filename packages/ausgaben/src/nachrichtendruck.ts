/**
 * Die Projektionszeile des Blattes „Nachrichten" als Eingabe des
 * Vordruck-Adapters (KONZEPT-NACHRICHTEN.md §7, §8).
 *
 * Der Adapter (`nachricht.ts`) kennt bewusst weder Zustand noch Projektion;
 * diese eine Abbildung ist die Naht. Sie rechnet nichts, sie benennt nur um:
 * fehlende Texte werden leer, Vermerke behalten ihre Zeitpunkte (ISO), und die
 * Nachweisnummer wird zum Text, weil der Vordruck sie als Feld schreibt.
 */

import type { Nachrichtenzeile } from "@s1/domaene";

import type {
  Nachrichtendruck,
  Nachrichtennachweis,
  Nachrichtensichtung,
  Nachrichtenvermerk,
} from "./nachricht.js";

function vermerk(
  wert: { readonly mittel?: string; readonly zeitpunkt: string; readonly handzeichen: string } | undefined,
): { aufnahme: Nachrichtenvermerk } | Record<string, never> {
  if (wert === undefined) return {};
  return {
    aufnahme: {
      ...(wert.mittel === undefined ? {} : { mittel: wert.mittel }),
      zeitpunkt: wert.zeitpunkt,
      handzeichen: wert.handzeichen,
    },
  };
}

function nachweisAus(zeile: Nachrichtenzeile): Nachrichtennachweis | undefined {
  const n = zeile.nachweis;
  return n === undefined ? undefined : { nummer: String(n.nummer), zeitpunkt: n.zeitpunkt, handzeichen: n.handzeichen };
}

/** Nur die Kopiefarbe BLAU heißt „nur Kopie"; GRÜN, ROT und Unbekanntes sind Verteiler. */
function sichtungAus(zeile: Nachrichtenzeile): Nachrichtensichtung | undefined {
  const s = zeile.sichtung;
  if (s === undefined) return undefined;
  return {
    zeitpunkt: s.zeitpunkt,
    handzeichen: s.handzeichen,
    verteiler: s.verteiler.map((v) => ({ stelle: v.stelle, kopie: v.kopie === "BLAU" })),
    vermerke: zeile.vermerke ?? s.vermerke ?? "",
  };
}

/** Die Nachricht als Eingabe für `nachrichtAlsVordruckPdf`; `uebung` kommt vom Einsatz. */
export function nachrichtendruckAus(zeile: Nachrichtenzeile, uebung: boolean): Nachrichtendruck {
  const sichtung = sichtungAus(zeile);
  const nachweis = nachweisAus(zeile);
  return {
    richtung: zeile.richtung === "AUSGANG" ? "AUSGANG" : "EINGANG",
    art: zeile.art ?? "",
    vorrang: zeile.vorrang ?? "",
    gespraechsnotiz: zeile.gespraechsnotiz,
    uebermittlungswunsch: zeile.uebermittlungswunsch ?? "",
    anschrift: zeile.anschrift,
    rufnummer: zeile.rufnummer ?? "",
    betreff: zeile.betreff,
    inhalt: zeile.inhalt,
    absender: zeile.absender,
    abfassungszeit: zeile.abfassungszeit ?? "",
    zeichen: zeile.zeichen ?? "",
    funktion: zeile.funktion ?? "",
    gegenstelle: zeile.gegenstelle ?? "",
    ...vermerk(zeile.aufnahme),
    ...(zeile.annahme === undefined ? {} : { annahme: { zeitpunkt: zeile.annahme.zeitpunkt, handzeichen: zeile.annahme.handzeichen } }),
    ...(zeile.befoerderung === undefined
      ? {}
      : { befoerderung: { mittel: zeile.befoerderung.mittel, zeitpunkt: zeile.befoerderung.zeitpunkt, handzeichen: zeile.befoerderung.handzeichen } }),
    ...(nachweis === undefined ? {} : { nachweis }),
    ...(sichtung === undefined ? {} : { sichtung }),
    uebung,
  };
}
