/**
 * Die Bestätigung nach dem eigenen Schreiben (Entwurf „Entlastung", 3.3).
 *
 * Nach jedem eigenen Schritt steht in der Statuszeile zehn Sekunden lang
 * „✓ Einheit ‚FGr WP 1‘ Status geändert · gespeichert". Das beantwortet die
 * Frage „habe ich das jetzt gespeichert?" (Audit neuer Nutzer P2-3), ohne
 * dass der Kontrakt dafür ein Feld bekommt.
 *
 * **Woher der Name kommt.** Die Antwort auf `bedienen` sagt nur
 * „geschrieben" und die Ereignis-Id. Den Gegenstand („FGr WP 1") kennt das
 * Lagebild: `undoObersteArt` und `undoObersteObjekt` beschreiben den
 * obersten Schritt des **eigenen** Rücknahmeverlaufs, und der ändert sich
 * nur durch eigene Schritte. Ändert sich der Verlauf nach einem Schreiben und
 * steht oben dieselbe Art, ist das der eben geschriebene Schritt.
 *
 * **Die Reihenfolge ist nicht fest.** Die Mitteilung mit dem neuen Lagebild
 * kann vor oder nach der Antwort eintreffen. Kommt sie vorher, nennt die
 * Bestätigung den Gegenstand sofort; kommt sie danach, steht zuerst der
 * Vorgang allein („Status geändert · gespeichert") und der Gegenstand wird
 * nachgetragen, sobald das Bild da ist. Ein Schritt, der nicht auf den
 * Verlauf kommt (§6 U2, „nicht rückgängig"), bleibt beim Vorgang allein —
 * lieber ohne Namen als mit dem eines früheren Schritts.
 */

import type { Lagebild } from "../kontrakt/index.js";
import { ereignisMitObjekt, ereignisname } from "./Ereignisnamen.js";

/** So lange steht die Bestätigung, dann verschwindet sie. */
export const BESTAETIGUNG_MS = 10_000;

export interface Bestaetigung {
  readonly text: string;
  /** Wann sie entstand (Uhr des Rechners) — für die zehn Sekunden. */
  readonly zeit: number;
}

/** Der oberste Schritt des eigenen Rücknahmeverlaufs. */
interface Verlaufsstand {
  readonly tiefe: number;
  readonly art: string | undefined;
  readonly objekt: string | undefined;
}

function verlaufsstand(lagebild: Lagebild | undefined): Verlaufsstand | undefined {
  if (lagebild === undefined) return undefined;
  return { tiefe: lagebild.undoTiefe, art: lagebild.undoObersteArt, objekt: lagebild.undoObersteObjekt };
}

function gleich(a: Verlaufsstand | undefined, b: Verlaufsstand | undefined): boolean {
  return a?.tiefe === b?.tiefe && a?.art === b?.art && a?.objekt === b?.objekt;
}

/** „Einheit ‚TZ‘ entfernt“ — der Schritt, den „Rückgängig“ jetzt zurücknähme; leer ohne Verlauf. */
export function obersterSchritt(lagebild: Lagebild | undefined): string {
  const art = lagebild?.undoObersteArt;
  return art === undefined ? "" : ereignisMitObjekt(art, lagebild?.undoObersteObjekt);
}

/** Die Bestätigung einer Rücknahme; `schritt` ist der oberste Schritt **vor** dem Zurücknehmen. */
export function ruecknahmeBestaetigung(schritt: string, zeit: number): Bestaetigung {
  return {
    text: schritt === "" ? "Letzter Schritt zurückgenommen · gespeichert" : `Zurückgenommen: ${schritt} · gespeichert`,
    zeit,
  };
}

/**
 * Folgt einem Schreiben vom Ruf bis zum Lagebild.
 *
 * Höchstens ein Schreiben ist offen: Die Oberfläche sperrt ihre Knöpfe,
 * solange ein Ruf läuft, und ein zweites Schreiben ersetzt das erste.
 */
export class Bestaetigungsfolge {
  #offen: { readonly art: string; readonly vorher: Verlaufsstand | undefined; zeit?: number } | undefined;

  /** Vor dem Ruf: welche Art geschrieben wird und wie der Verlauf jetzt steht. */
  beginne(art: string, lagebild: Lagebild | undefined): void {
    this.#offen = { art, vorher: verlaufsstand(lagebild) };
  }

  /** Vergisst das offene Schreiben — abgewiesen, gescheitert oder eine Rücknahme dazwischen. */
  vergiss(): void {
    this.#offen = undefined;
  }

  /** Nach der Antwort „geschrieben“: die Bestätigung, so gut das Bild sie schon hergibt. */
  geschrieben(lagebild: Lagebild | undefined, zeit: number): Bestaetigung | undefined {
    const offen = this.#offen;
    if (offen === undefined) return undefined;
    const benannt = this.#benenne(lagebild);
    if (benannt !== undefined) {
      this.#offen = undefined;
      return { text: benannt, zeit };
    }
    offen.zeit = zeit;
    return { text: `${ereignisname(offen.art)} · gespeichert`, zeit };
  }

  /**
   * Beim neuen Lagebild: trägt den Gegenstand nach, wenn die Antwort schon da
   * war; sonst merkt es sich nichts — die Antwort fragt das Bild selbst.
   */
  nachgetragen(lagebild: Lagebild): Bestaetigung | undefined {
    const offen = this.#offen;
    if (offen?.zeit === undefined) return undefined;
    const benannt = this.#benenne(lagebild);
    if (benannt === undefined) return undefined;
    this.#offen = undefined;
    return { text: benannt, zeit: offen.zeit };
  }

  #benenne(lagebild: Lagebild | undefined): string | undefined {
    const offen = this.#offen;
    const stand = verlaufsstand(lagebild);
    if (offen === undefined || stand?.art !== offen.art || gleich(stand, offen.vorher)) return undefined;
    return `${ereignisMitObjekt(offen.art, stand.objekt)} · gespeichert`;
  }
}
