/**
 * Die Ablösung an der Einheitenzeile — die Spalten N bis S des Blatts „Stärke“.
 *
 * In der Excel stehen „Ablösung angefordert“, „Anforderungs-ID“, „Zugesagt
 * für“, „Zugesagt von“, „Vorgesehene Einheit“ und „Vorgesehener Auftrag“ als
 * Spalten **an der Einheit, die abgelöst wird**. Im Zielmodell ist die
 * Anforderung eine eigene Entität (§5.6), und die Einheit kennt sie nicht.
 * Diese Datei holt die Spalten trotzdem an die Zeile zurück, und zwar als
 * Ableitung: Die Anforderung nennt die abzulösende Einheit
 * (`abzuloesendeEinheitId`), die Erledigung nennt die ablösende
 * (`erledigung.abloesendeEinheitId`, `zErledigung`). Ein zweites Feld an der
 * Einheit wäre die zweite Wahrheit über dieselbe Ablösung.
 *
 * Außerdem stehen hier die beiden Marken, die K12 und K18 sichtbar machen,
 * und der Vorschlag für die Einheit, die aus einer eingetroffenen Anforderung
 * angelegt wird — damit niemand die Ablösung ein zweites Mal von Hand erfasst.
 */

import { zeitpunktText } from "../beschriftungen.js";
import type { Id, Zeitpunkt } from "../werte.js";
import type { Zustand } from "../zustand.js";
import { anforderungZurEinheit, type Anforderungszeile } from "./anforderung.js";

/** Der Ton einer Marke — derselbe Wortschatz wie bei der Statusmarke. */
export type Markenton = "ok" | "warn" | "ruhe" | "fehler" | "neutral";

/** Eine Marke: immer ein Wort, die Farbe steht nur daneben. */
export interface Marke {
  readonly text: string;
  readonly ton: Markenton;
}

/** Die Schlüssel der sechs Ablösungsspalten in der Reihenfolge der Excel. */
export const ABLOESUNGSSPALTEN = [
  "abloesungAngefordert",
  "anforderungsKennung",
  "zugesagtFuer",
  "zugesagtVon",
  "abloesungDurch",
  "vorgesehenerAuftrag",
] as const;

const ZUSTANDSMARKE: Readonly<Record<string, Marke>> = {
  OFFEN: { text: "Ablösung angefordert", ton: "warn" },
  ZUGESAGT: { text: "Ablösung zugesagt", ton: "warn" },
  EINGETROFFEN: { text: "Ablösung eingetroffen", ton: "ok" },
};

/** Die Ablösung einer Einheit, wie die Zeile sie zeigt. */
export interface Abloesungsstand {
  readonly anforderungId: Id;
  readonly zellen: { readonly [schluessel: string]: string };
  /** K12 als Wort: angefordert, zugesagt oder eingetroffen. */
  readonly marke: Marke;
}

/** Die Zellen N bis S aus der Zeile der Anforderung. */
function zellenAus(zeile: Anforderungszeile): { readonly [schluessel: string]: string } {
  return {
    abloesungAngefordert: zeitpunktText(zeile.angefordertAm),
    anforderungsKennung: zeile.kennung,
    zugesagtFuer: zeitpunktText(zeile.zugesagtFuer ?? ""),
    zugesagtVon: zeile.zugesagtVon ?? "",
    // „Ablösung durch“: die Einheit, die aus der Anforderung angelegt wurde,
    // und bis dahin, was vorgesehen ist — der Text der Spalte R der Excel.
    abloesungDurch: zeile.abloesendeEinheit ?? zeile.vorgeseheneEinheitText,
    vorgesehenerAuftrag: zeile.vorgesehenerAuftrag,
  };
}

/**
 * Die Ablösung an der Einheit (K12) — oder `undefined`, wenn keine nicht
 * stornierte Anforderung sie ablösen soll.
 */
export function abloesungDerEinheit(zustand: Zustand, einheitId: Id): Abloesungsstand | undefined {
  const zeile = anforderungZurEinheit(zustand, einheitId);
  if (zeile === undefined) return undefined;
  return {
    anforderungId: zeile.id,
    zellen: zellenAus(zeile),
    marke: ZUSTANDSMARKE[zeile.zustand] ?? { text: "Ablösung angefordert", ton: "warn" },
  };
}

/** K18: Die Verfügbarkeit endet innerhalb eines Tages. */
const VORLAUF_MS = 24 * 60 * 60 * 1000;

/**
 * Die Marke an „Verfügbar bis“ (K18) — „läuft ab“ innerhalb eines Tages,
 * „abgelaufen“ danach.
 *
 * `jetzt` kommt vom Aufrufer, wie bei {@link kennzahlen.verfuegbarkeitLaeuftAb}:
 * Dieses Paket kennt keine Uhr. Die Oberfläche fragt mit ihrer Minutenuhr,
 * damit die Marke auch ohne neues Ereignis erscheint, wenn die Frist näher
 * rückt.
 */
export function verfuegbarkeitsmarke(bis: unknown, jetzt: Zeitpunkt): Marke | undefined {
  if (typeof bis !== "string" || bis === "") return undefined;
  const ende = Date.parse(bis);
  const gegenwart = Date.parse(jetzt);
  if (Number.isNaN(ende) || Number.isNaN(gegenwart)) return undefined;
  if (gegenwart >= ende) return { text: "abgelaufen", ton: "fehler" };
  if (gegenwart >= ende - VORLAUF_MS) return { text: "läuft ab", ton: "warn" };
  return undefined;
}
