/**
 * Die Kontrollsummen und die Zählzeile des Statusblatts, in Klartext.
 *
 * Vorher stand dort „Schicht: Einheiten ohne Schichtangabe oder Organisation
 * (-49)“ in Rot, dazu eine Liste mit internen Kennungen (`E-05dfe66cdb46`).
 * Eine Führungsstelle kann mit „-49“ nichts anfangen und die Kennung keiner
 * Einheit zuordnen. Jetzt sagt der Text, **was** abweicht, **um wie viel** und
 * **welche Einheiten** es betrifft — mit Namen, ohne Kennungen.
 */

import { kennzahlen } from "@s1/domaene";

import type { Statusdaten } from "./status.js";

export interface Kontrollzeile {
  /** `ok` grün, `fehler` rot (Handlung nötig), `hinweis` neutral (keine Handlung). */
  readonly art: "ok" | "fehler" | "hinweis";
  readonly text: string;
}

const MAX_NAMEN = 8;

/** „ZTr, Gr BT und 3 weitere“ — Namen, nie Kennungen. */
export function namenListe(namen: readonly string[]): string {
  if (namen.length <= MAX_NAMEN) return namen.join(", ");
  return `${namen.slice(0, MAX_NAMEN).join(", ")} und ${String(namen.length - MAX_NAMEN)} weitere`;
}

function kraefte(zahl: number): string {
  return `${String(Math.abs(zahl))} ${Math.abs(zahl) === 1 ? "Kraft" : "Kräfte"}`;
}

function statusZeile(daten: Statusdaten, namen: readonly string[]): Kontrollzeile {
  if (daten.probeStatus === 0) {
    return { art: "ok", text: "Status: o.k. — alle Einheiten tragen Status und Organisation." };
  }
  const wer = namen.length === 0 ? "" : ` Betroffen: ${namenListe(namen)}.`;
  return {
    art: "fehler",
    text: `Status: Die Tabellen „Organisation“ und „Status“ weichen um ${kraefte(daten.probeStatus)} ab, weil bei Einheiten Status oder Organisation fehlt.${wer}`,
  };
}

function schichtZeile(daten: Statusdaten, namen: readonly string[]): Kontrollzeile {
  if (daten.probeSchicht === 0) {
    return { art: "ok", text: "Schicht: o.k. — alle Einheiten tragen eine Schicht." };
  }
  if (daten.schichtenSumme === 0) {
    return {
      art: "hinweis",
      text:
        "Schicht: In diesem Einsatz sind keine Schichten erfasst, die Schichttabelle bleibt deshalb leer. " +
        "Die Stärkezahlen oben sind davon nicht betroffen.",
    };
  }
  const wer = namen.length === 0 ? "" : ` Betroffen: ${namenListe(namen)}.`;
  return {
    art: "fehler",
    text: `Schicht: In der Schichttabelle fehlen ${kraefte(daten.probeSchicht)} gegenüber den Organisationen, weil bei Einheiten die Schicht fehlt.${wer}`,
  };
}

/** Die Zeilen unter „Kontrollsummen“. */
export function kontrollzeilen(daten: Statusdaten): Kontrollzeile[] {
  const namen = daten.ohnePflichtangabe.map((einheit) => einheit.bezeichnung);
  return [statusZeile(daten, namen), schichtZeile(daten, namen)];
}

/** Die Zeile mit der Ist-Stärke und den Nebenzahlen — dieselbe Zählregel wie das Kopfband. */
export function istZeile(daten: Statusdaten): string {
  const { fuehrer, unterfuehrer, mannschaft } = daten.ist;
  const ist = `${String(fuehrer)}/${String(unterfuehrer)}/${String(mannschaft)} // ${String(fuehrer + unterfuehrer + mannschaft)}`;
  const teile = [
    `Ist-Stärke (vor Ort): ${ist}`,
    kennzahlen.erwartetText(daten.erwartet),
    daten.beendet > 0 ? `${String(daten.beendet)} beendet/Rückmarsch` : "",
  ];
  return teile.filter((teil) => teil !== "").join(" · ");
}
