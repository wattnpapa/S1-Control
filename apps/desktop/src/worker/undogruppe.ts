/**
 * „Rückgängig“ für einen Bedienschritt mit Folgeschritten (Audits Nachrichten
 * Runde 2: R2-LdF P2-8, R2-FM P3-1, R2-FaBe P2-8; KONZEPT-EREIGNISSE.md §6,
 * Nachtrag „Undo-Gruppe“).
 *
 * Drei Teile, alle ohne eigenen Zustand im Aktendienst:
 *
 *  - **Markieren**: Jeder Folgeschritt eines Nachrichtenschritts trägt in der
 *    Nutzlast `folgeVon` mit der Ereignis-Id des Hauptschritts. So steht die
 *    Gruppe in den Ereignissen; der Stapel bleibt abgeleitet (U3).
 *  - **Zurücknehmen**: Die oberste Gruppe wird in umgekehrter Reihenfolge
 *    kompensiert, jedes Ereignis mit seinem eigenen Gegenereignis (U1). Hält
 *    ein Teil an, bleibt der Rest stehen, und die Meldung sagt, wie weit es ging.
 *  - **Anzeigen**: Das Lagebild nennt den Schritt als Ganzes
 *    (`undoObersteSchritt`, `undoObersteTeile`) und den jüngsten eigenen
 *    Schritt, der nicht rücknehmbar ist (`undoOhneRuecknahme`).
 */

import {
  FOLGE_VON,
  gruppenbezeichnung,
  gruppenkennung,
  gruppenrest,
  kompensationFuer,
  obersteGruppe,
  ohneRuecknahmeHinweis,
  type EingehendesEreignis,
  type StapelEintrag,
  type Undostapel,
  vergleicheHlc,
  type Zustand,
} from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

import type { Bedienergebnis, Lagebild } from "../kontrakt/index.js";

/** Die Bedienschritte, deren Folgeschritte zur Gruppe gehören: alle Schritte des Nachrichtenwegs. */
function gruppiert(typ: string): boolean {
  return typ.startsWith("Nachricht");
}

/**
 * Der Folgeschritt mit `folgeVon`; unverändert, wenn der Hauptschritt kein
 * Nachrichtenschritt oder selbst eine Rücknahme ist (die Folgen einer
 * Kompensation gehören nicht zu einer Gruppe — es gibt kein Redo, U5).
 */
export function alsFolgeschritt<T extends Ereignisentwurf>(folge: T, haupt: Pick<Ereignisentwurf, "typ" | "undoOf">, hauptId: string): T {
  if (!gruppiert(haupt.typ) || haupt.undoOf !== undefined || folge.undoOf !== undefined) return folge;
  const nutzlast = typeof folge.nutzlast === "object" && folge.nutzlast !== null ? (folge.nutzlast as Record<string, unknown>) : {};
  return { ...folge, nutzlast: { ...nutzlast, [FOLGE_VON]: hauptId } };
}

/** Was die Rücknahme einer Gruppe vom Aktendienst braucht. */
export interface Gruppenruecknahme {
  readonly zustand: () => Zustand;
  /** Schreibt eine Kompensation wie jeden Bedienschritt (mit Prüfung und eigenen Folgen). */
  readonly schreibe: (entwurf: Ereignisentwurf) => Promise<Bedienergebnis>;
  /** Das Ereignis des Hauptschritts, auch wenn es selbst nicht auf dem Stapel steht. */
  readonly ereignis: (id: string) => EingehendesEreignis | undefined;
}

/** Ist die oberste Gruppe mehr als ein einzelner Schritt? */
export function istGruppe(gruppe: readonly StapelEintrag[]): boolean {
  return gruppe.some((e) => (e.ereignis.nutzlast as Record<string, unknown> | undefined)?.[FOLGE_VON] !== undefined);
}

function teilweise(bezeichnung: string, fertig: number, gesamt: number, meldung: string): Bedienergebnis {
  return { art: "nichtMoeglich", meldung: `„${bezeichnung}“ nur zum Teil zurückgenommen (${String(fertig)} von ${String(gesamt)} Teilen): ${meldung}` };
}

/**
 * Nimmt die Gruppe zurück, neuestes Ereignis zuerst. Das Ergebnis ist das
 * der letzten Kompensation, mit dem Satz, was zurückgenommen wurde.
 */
export async function nimmGruppeZurueck(gruppe: readonly StapelEintrag[], umfeld: Gruppenruecknahme, grund?: string): Promise<Bedienergebnis> {
  const hauptId = (gruppe[0]?.ereignis.nutzlast as Record<string, unknown> | undefined)?.[FOLGE_VON];
  const haupt = typeof hauptId === "string" ? umfeld.ereignis(hauptId) : gruppe.at(-1)?.ereignis;
  const bezeichnung = gruppenbezeichnung(gruppe, haupt) ?? "Bedienschritt";
  let letztes: Bedienergebnis | undefined;
  for (const [index, eintrag] of gruppe.entries()) {
    const kompensation = kompensationFuer(eintrag.ereignis, umfeld.zustand(), grund);
    if (kompensation.art === "brauchtGrund" && index === 0) return { art: "brauchtGrund", zielArt: kompensation.zielArt };
    if (kompensation.art !== "entwurf") return teilweise(bezeichnung, index, gruppe.length, "meldung" in kompensation ? kompensation.meldung : "Dieser Teil braucht einen Grund.");
    letztes = await umfeld.schreibe(kompensation.entwurf);
    if (letztes.art !== "geschrieben") return teilweise(bezeichnung, index, gruppe.length, "meldung" in letztes ? letztes.meldung : "nicht möglich.");
  }
  if (letztes?.art !== "geschrieben") return { art: "nichtMoeglich", meldung: "Es ist nichts zurückzunehmen." };
  const rest = gruppenrest(haupt, gruppe);
  const satz = `Zurückgenommen: ${bezeichnung} (${String(gruppe.length)} Teile).`;
  return { ...letztes, warnungen: [satz, ...(rest === undefined ? [] : [rest]), ...(letztes.warnungen ?? [])] };
}

type Undoteil = Partial<Pick<Lagebild, "undoObersteSchritt" | "undoObersteTeile" | "undoOhneRuecknahme" | "undoObersteArt">>;

/** Die Tiefe des Stapels in Bedienschritten, nicht in Ereignissen: eine Gruppe ist ein Schritt (R2-LdF P2-8). */
export function undoTiefe(stapel: Undostapel): number {
  return new Set(stapel.eintraege.map((e) => gruppenkennung(e.ereignis))).size;
}

/**
 * Die Felder des Lagebilds zur Undo-Gruppe, gemerkt je oberstem Eintrag —
 * das Lagebild entsteht in jedem Takt, die Suche nach dem Hauptschritt soll
 * es nicht.
 */
export class Undoanzeige {
  #gemerkt: { schluessel: string; teil: Undoteil } | undefined;

  teil(stapel: Undostapel, umfeld: Pick<Gruppenruecknahme, "ereignis">, gegenstand: (e: EingehendesEreignis) => string): Undoteil {
    const gruppe = obersteGruppe(stapel.eintraege);
    const ohne = stapel.juengsterOhneRuecknahme();
    // Nur wenn der nicht rücknehmbare Schritt jünger ist als die oberste Gruppe — sonst nennt „Rückgängig“ ohnehin den letzten.
    const neuer = ohne !== undefined && (gruppe[0] === undefined || vergleicheHlc(ohne.hlc, gruppe[0].hlc) > 0) ? ohne : undefined;
    const schluessel = `${gruppe.map((e) => e.id).join(",")}|${neuer?.id ?? ""}`;
    if (this.#gemerkt?.schluessel === schluessel) return this.#gemerkt.teil;
    const teil: Undoteil = {
      ...this.#gruppenteil(gruppe, umfeld),
      ...(neuer === undefined ? {} : { undoOhneRuecknahme: { art: neuer.typ, objekt: gegenstand(neuer), hinweis: ohneRuecknahmeHinweis(neuer.typ) } }),
    };
    this.#gemerkt = { schluessel, teil };
    return teil;
  }

  #gruppenteil(gruppe: readonly StapelEintrag[], umfeld: Pick<Gruppenruecknahme, "ereignis">): Undoteil {
    if (!istGruppe(gruppe)) return {};
    const hauptId = (gruppe[0]?.ereignis.nutzlast as Record<string, unknown> | undefined)?.[FOLGE_VON];
    const haupt = typeof hauptId === "string" ? umfeld.ereignis(hauptId) : undefined;
    const bezeichnung = gruppenbezeichnung(gruppe, haupt);
    if (bezeichnung === undefined) return {};
    // Steht der Hauptschritt selbst auf dem Stapel (Befördern, Weitergeben), heißt der Eintrag nach ihm —
    // auch für eine Oberfläche, die nur `undoObersteArt` liest. Die Anlage bleibt, sie gibt den Namen nicht.
    const hauptAufStapel = haupt !== undefined && gruppe.some((e) => e.id === haupt.id);
    return { undoObersteSchritt: bezeichnung, undoObersteTeile: gruppe.length, ...(hauptAufStapel ? { undoObersteArt: haupt.typ } : {}) };
  }
}
