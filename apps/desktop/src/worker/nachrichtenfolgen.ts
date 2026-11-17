/**
 * Die Folgeschritte des Nachrichtenwegs (KONZEPT-NACHRICHTEN.md §5, §9,
 * Schnitt N2) — ein Teil von `planeFolgen` in `schreibfolgen.ts`.
 *
 * - **Eingang mit Nummer**: Nimmt die FmZ einen Eingang auf und trägt die
 *   Nummer gleich ein, folgt auf `NachrichtVerfasst` ein
 *   `NachrichtNachgewiesen` (Entscheidung 1 und 2: Die FmZ nummeriert, Eingang
 *   und Ausgang gemeinsam).
 * - **Ersatzsichter und Gesprächsnotiz**: Steht in der Präsenz kein Sichter,
 *   verteilt, wer aufnimmt; die Gesprächsnotiz verteilt ihr Verfasser selbst.
 *   Dann folgt `NachrichtGesichtet` im selben Zug — die Regel aus eStab, nur
 *   dass hier die Präsenz entscheidet statt ein Login (§5 „Ersatzsichter").
 * - **Beförderung an eine Einheit**: Ist die Gegenstelle eine Einheit der
 *   Lage, folgt auf `NachrichtBefoerdert` eine Funkprobe „Kontakt“ — der
 *   Funkplan zeigt dann den letzten Kontakt.
 * - **Doppelte Nummer**: Wer eine schon vergebene Nummer nachweist, wird
 *   nicht aufgehalten (Papier geht vor), aber der Hinweis sagt es sofort; der
 *   Fold hält `nachweisnummerDoppelt` fest (§9 „zeigen, nicht raten").
 *
 * Die Werte der Folgen kommen aus dem Entwurf (`nachrichtenfolge`), geprüft
 * werden sie wie jeder andere Schritt beim Schreiben (`nachrichtenpruefung.ts`).
 */

import { projektion, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

/** Was der Worker über die Präsenz weiß und der Zustand nicht. */
export interface Nachrichtenfolgeumfeld {
  /** Ein lebender Arbeitsplatz (dieser oder ein anderer) hat die Stelle SICHTER. */
  readonly sichterBesetzt: boolean;
}

export interface Nachrichtenfolgeplan {
  readonly folgen: readonly { readonly entwurf: Ereignisentwurf; readonly hinweis: string }[];
  readonly hinweise: readonly string[];
}

/** Der Hinweis, den der Bediener nach dem Aufnehmen ohne Sichter sieht (§5). */
export const HINWEIS_ERSATZSICHTER = "Kein Sichter besetzt: Nachricht beim Aufnehmen verteilt.";

type Folgewerte = { readonly nachweis?: unknown; readonly sichtung?: unknown; readonly kontaktEinheitId?: unknown };

function folgewerte(entwurf: Ereignisentwurf): Folgewerte | undefined {
  const wert = (entwurf as { readonly nachrichtenfolge?: unknown }).nachrichtenfolge;
  return typeof wert === "object" && wert !== null ? (wert as Folgewerte) : undefined;
}

function nummerAus(wert: unknown): number | undefined {
  const nummer = (wert as { nummer?: unknown } | null | undefined)?.nummer;
  return typeof nummer === "number" ? nummer : undefined;
}

/** „E 7 Pumpen eingetroffen" — die Nachrichten, die diese Nummer schon tragen. */
export function nummerVergebenAn(zustand: Zustand, nummer: number, ausser: string): readonly string[] {
  return projektion
    .nachrichtenausschnitt(zustand, { sicht: "nachweisung" })
    .zeilen.filter((z) => z.nummer === nummer && z.id !== ausser)
    .map((z) => `${z.richtungKurz} ${String(nummer)} „${z.betreff === "" ? z.absender : z.betreff}“`);
}

function doppelhinweis(zustand: Zustand, nummer: number | undefined, nachrichtId: string): string | undefined {
  if (nummer === undefined) return undefined;
  const andere = nummerVergebenAn(zustand, nummer, nachrichtId);
  if (andere.length === 0) return undefined;
  return `Die Nummer ${String(nummer)} ist bereits vergeben (${andere.join(", ")}). Die Nachweisung zeigt beide mit Marke; berichtigt wird mit „Nachweisen“ und neuer Nummer.`;
}

function verteilhinweis(umfeld: Nachrichtenfolgeumfeld, gespraechsnotiz: boolean): string {
  if (!umfeld.sichterBesetzt) return HINWEIS_ERSATZSICHTER;
  return gespraechsnotiz ? "Gesprächsnotiz vom Verfasser verteilt." : "Nachricht beim Aufnehmen verteilt.";
}

function planeAnlage(zustand: Zustand, entwurf: Ereignisentwurf, umfeld: Nachrichtenfolgeumfeld): Nachrichtenfolgeplan {
  const werte = folgewerte(entwurf);
  const nutzlast = (entwurf.nutzlast ?? {}) as Record<string, unknown>;
  const nachrichtId = nutzlast["nachrichtId"];
  if (werte === undefined || typeof nachrichtId !== "string") return { folgen: [], hinweise: [] };
  const folgen: { entwurf: Ereignisentwurf; hinweis: string }[] = [];
  const hinweise: string[] = [];
  if (werte.nachweis !== undefined) {
    const nummer = nummerAus(werte.nachweis);
    folgen.push({
      entwurf: { typ: "NachrichtNachgewiesen", nutzlast: { nachrichtId }, vorher: null, neu: werte.nachweis },
      hinweis: `In der Nachweisung unter Nummer ${nummer === undefined ? "?" : String(nummer)} eingetragen.`,
    });
    const doppelt = doppelhinweis(zustand, nummer, nachrichtId);
    if (doppelt !== undefined) hinweise.push(doppelt);
  }
  if (werte.sichtung !== undefined) {
    folgen.push({
      entwurf: { typ: "NachrichtGesichtet", nutzlast: { nachrichtId }, vorher: null, neu: werte.sichtung },
      hinweis: verteilhinweis(umfeld, nutzlast["gespraechsnotiz"] === true),
    });
  }
  return { folgen, hinweise };
}

/**
 * Die Beförderung an eine Einheit der Lage ist ein Funkkontakt: Der Funkplan
 * zeigt „letzter Kontakt“ aus der jüngsten Funkprobe „Kontakt“. Der Vorwert
 * ist die Probe, die der Zustand zuletzt sah (Rücknahme setzt sie wieder).
 */
function planeKontakt(zustand: Zustand, entwurf: Ereignisentwurf): Nachrichtenfolgeplan {
  const einheitId = folgewerte(entwurf)?.kontaktEinheitId;
  const zeitpunkt = (entwurf.neu as { zeitpunkt?: unknown } | null | undefined)?.zeitpunkt;
  const einheit = typeof einheitId === "string" ? zustand.einheiten[einheitId] : undefined;
  if (typeof einheitId !== "string" || einheit === undefined || einheit.entfernt?.wert === true || typeof zeitpunkt !== "string") return { folgen: [], hinweise: [] };
  const rufgruppeId = einheit.rufgruppeId?.wert;
  const name = typeof einheit.bezeichnung.wert === "string" ? einheit.bezeichnung.wert : einheitId;
  const vorher = einheit.letzteFunkprobe?.KONTAKT?.wert ?? null;
  const neu = { zeitpunkt, ...(typeof rufgruppeId === "string" && rufgruppeId !== "" ? { rufgruppeId } : {}) };
  return {
    folgen: [
      {
        entwurf: { typ: "FunkprobeDurchgefuehrt", nutzlast: { einheitId, ergebnis: "KONTAKT" }, vorher, neu },
        hinweis: `Funkplan: Kontakt mit „${name}“ vermerkt.`,
      },
    ],
    hinweise: [],
  };
}

/** Plant die Folgen eines Nachrichtenentwurfs — gegen den Zustand **vor** dem Schreiben. */
export function planeNachrichtenfolgen(zustand: Zustand, entwurf: Ereignisentwurf, umfeld: Nachrichtenfolgeumfeld): Nachrichtenfolgeplan | undefined {
  if (entwurf.typ === "NachrichtVerfasst") return planeAnlage(zustand, entwurf, umfeld);
  if (entwurf.typ === "NachrichtBefoerdert") return planeKontakt(zustand, entwurf);
  if (entwurf.typ === "NachrichtNachgewiesen") {
    const nachrichtId = (entwurf.nutzlast as { nachrichtId?: unknown } | null | undefined)?.nachrichtId;
    const doppelt = typeof nachrichtId === "string" ? doppelhinweis(zustand, nummerAus(entwurf.neu), nachrichtId) : undefined;
    return { folgen: [], hinweise: doppelt === undefined ? [] : [doppelt] };
  }
  return undefined;
}
