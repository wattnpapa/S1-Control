/**
 * Was der Worker aus der Sitzung an einen Bedienschritt der Nachrichten
 * schreibt, bevor er ihn prüft (Audits Nachrichten Runde 2).
 *
 * - **Stellenvorbehalt als `grund`-Pflicht** (R2-FaBe P0-1, R2-SGL P1-2,
 *   R2-FM P3-2): Sichten ohne Stelle SICHTER, Eingang aufnehmen oder
 *   Papier-Nachtrag mit Werten der FmZ ohne Stelle FMZ verlangen einen
 *   `grund` — das Bedienergebnis `brauchtGrund` mit `stelle` und `hinweis`,
 *   wie bei einer Art mit Pflichtgrund. Die Regel steht im Kontrakt
 *   (`stellenvorbehalt.ts`), weil der Renderer sie vorher prüfen kann.
 * - **Ersatzsichter** (§5): Sichtet die FmZ oder der LdF, weil kein Sichter
 *   besetzt ist, trägt die Sichtung `GRUND_ERSATZSICHTER` — auch die über
 *   „Ich sichte jetzt selbst“, nicht nur die beim Aufnehmen.
 * - **Stelle der Sitzung in der Nutzlast** (R2-ETB P1-1, R2-LdF P3-2): Das
 *   Tagebuch nannte bei der Aufnahme die Funktion des Absenders draußen und
 *   bei den Kopien nach der Beförderung „Sichter“. Die Stelle des Schreibers
 *   steht jetzt im Ereignis; nach dem Einsatz ist die Präsenz leer.
 * - **Papier-Nachtrag** (R2-SGL P1-2): Trägt der Entwurf `nachtrag`, steht
 *   an ihm und an seinen Folgen der `grund` „vom Papier nachgetragen“.
 */

import { istFernmelderstelle, projektion, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

import type { Bedienergebnis, Entwurf } from "../kontrakt/index.js";
import { STELLE_FMZ, STELLE_SICHTER, hatFmzWerte, istErsatzsichter, stellenvorbehalt, type Vorbehaltsumfeld } from "../kontrakt/stellenvorbehalt.js";

const STELLE_LDF = "LDF";

/**
 * Die Arten, an die der Worker die Stelle der Sitzung schreibt. Kenntnis
 * und Erledigung fehlen: Bei ihnen wählt `stelle` den Feldpfad und ist
 * schon die eigene Stelle.
 */
const MIT_STELLE: ReadonlySet<string> = new Set([
  "NachrichtVerfasst",
  "NachrichtAngenommen",
  "NachrichtUebermittlungVorgeschlagen",
  "NachrichtBefoerdert",
  "NachrichtAufnahmeBerichtigt",
  "NachrichtNachgewiesen",
  "NachrichtWeitergegeben",
  "NachrichtGesichtet",
  "NachrichtVermerkt",
  "NachrichtZurueckgezogen",
]);

/**
 * Additiv (ETB P1-7, Runde 1): Erledigung, ihre Rücknahme und das
 * Zurückziehen trugen weder Handzeichen noch (bei der Erledigung) eine
 * andere Stelle als die des Feldpfads — im Tagebuch stand „Arbeitsplatz“.
 * Der Worker schreibt das Handzeichen der Sitzung in die Nutzlast.
 */
const MIT_HANDZEICHEN: ReadonlySet<string> = new Set(["NachrichtErledigt", "ErledigungDerNachrichtZurueckgenommen", "NachrichtZurueckgezogen"]);

/**
 * Welche Stelle der Sitzung den Schritt tut, wenn sie mehrere führt — die
 * Station zuerst. `STELLE_FMZ` steht hier für jeden Fernmelder: die Stellen
 * FM1 bis FM3 der Sitzung oder den Altwert FMZ (2026-11-21).
 */
const STATION: Readonly<Record<string, readonly string[]>> = {
  NachrichtGesichtet: [STELLE_SICHTER, STELLE_FMZ, STELLE_LDF],
  NachrichtWeitergegeben: [STELLE_LDF, STELLE_FMZ],
  NachrichtUebermittlungVorgeschlagen: [STELLE_LDF, STELLE_FMZ],
  NachrichtAngenommen: [STELLE_FMZ, STELLE_LDF],
  NachrichtBefoerdert: [STELLE_FMZ, STELLE_LDF],
  NachrichtAufnahmeBerichtigt: [STELLE_FMZ, STELLE_LDF],
  // 2026-11-21: Mit LdF als Station weist der LdF nach; ein Platz mit beiden Stellen trägt LDF.
  NachrichtNachgewiesen: [STELLE_LDF, STELLE_FMZ],
};

type Folgeentwurf = Ereignisentwurf & Pick<Entwurf, "nachrichtenfolge">;

function objekt(wert: unknown): Record<string, unknown> | undefined {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert) ? (wert as Record<string, unknown>) : undefined;
}

/** Die Stelle, die der Schritt in der Nutzlast trägt; `undefined` ohne Stellen. */
export function stelleFuer(entwurf: Folgeentwurf, stellen: readonly string[]): string | undefined {
  if (stellen.length === 0) return undefined;
  const bevorzugt = entwurf.typ === "NachrichtVerfasst" && hatFmzWerte(entwurf) ? [STELLE_FMZ, STELLE_LDF] : (STATION[entwurf.typ] ?? []);
  const passend = bevorzugt.flatMap((s) => (s === STELLE_FMZ ? stellen.filter(istFernmelderstelle) : stellen.filter((eigene) => eigene === s)));
  return passend[0] ?? stellen[0];
}

/**
 * Ob der Schritt einen Grund braucht, den er nicht trägt; dann das
 * Bedienergebnis. Ohne Sitzung (ein Aufrufer, der keine Stelle kennt) gilt
 * keiner — die Stellenabfrage ist in beiden Schalen Pflicht.
 */
export function vorbehaltsergebnis(entwurf: Folgeentwurf, umfeld: Vorbehaltsumfeld | undefined): Bedienergebnis | undefined {
  if (umfeld === undefined || entwurf.undoOf !== undefined) return undefined;
  const vorbehalt = stellenvorbehalt(entwurf, umfeld);
  return vorbehalt === undefined ? undefined : { art: "brauchtGrund", zielArt: entwurf.typ, stelle: vorbehalt.stelle, hinweis: vorbehalt.meldung };
}

/** Der Grund, den der Worker selbst setzt — nur, wo der Entwurf keinen trägt. */
function eigenerGrund(entwurf: Folgeentwurf, umfeld: Vorbehaltsumfeld | undefined, nachtrag: boolean): string | undefined {
  if (entwurf.grund !== undefined) {
    // Nachtrag mit „Trotzdem“: beide Angaben, der Nachtrag zuerst (der Satz erkennt ihn am Anfang).
    // Ersatzsichtung und Kopien behalten ihren Grund — an ihm erkennt das Tagebuch sie.
    const eigen = [projektion.GRUND_ERSATZSICHTER, projektion.GRUND_SICHTER_SAEUMIG, projektion.GRUND_KOPIEN].includes(entwurf.grund) || entwurf.grund.startsWith(projektion.GRUND_NACHTRAG);
    return nachtrag && !eigen ? `${projektion.GRUND_NACHTRAG}; ${entwurf.grund}` : undefined;
  }
  if (nachtrag) return projektion.GRUND_NACHTRAG;
  const ersatz = entwurf.typ === "NachrichtGesichtet" && objekt(entwurf.neu) !== undefined && umfeld !== undefined && istErsatzsichter(umfeld);
  if (!ersatz) return undefined;
  // R2-FM P2-5: am besetzten, aber säumigen Sichter vorbei — ein anderer Satz im Tagebuch.
  return umfeld.sichterBesetzt ? projektion.GRUND_SICHTER_SAEUMIG : projektion.GRUND_ERSATZSICHTER;
}

/**
 * Der Entwurf mit der Stelle der Sitzung in der Nutzlast und dem Grund, den
 * der Worker setzt. `nachtrag`: der Schritt gehört zu einem Papier-Nachtrag
 * (der Entwurf selbst oder eine Folge davon).
 */
export function mitSitzungsangaben<T extends Folgeentwurf>(entwurf: T, umfeld: Vorbehaltsumfeld | undefined, nachtrag = false): T {
  const mitHz = mitHandzeichen(entwurf, umfeld);
  if (!MIT_STELLE.has(entwurf.typ) || entwurf.undoOf !== undefined) return mitHz;
  return mitStelleUndGrund(mitHz, umfeld, nachtrag);
}

/** Das Handzeichen der Sitzung an Erledigung und Zurückziehen (ETB P1-7); nur, wo die Nutzlast keines trägt. */
function mitHandzeichen<T extends Folgeentwurf>(entwurf: T, umfeld: Vorbehaltsumfeld | undefined): T {
  const nutzlast = objekt(entwurf.nutzlast);
  const hz = umfeld?.handzeichen?.trim() ?? "";
  if (!MIT_HANDZEICHEN.has(entwurf.typ) || nutzlast === undefined || hz === "" || typeof nutzlast["handzeichen"] === "string") return entwurf;
  return { ...entwurf, nutzlast: { ...nutzlast, handzeichen: hz } };
}

function mitStelleUndGrund<T extends Folgeentwurf>(entwurf: T, umfeld: Vorbehaltsumfeld | undefined, nachtrag: boolean): T {
  const nutzlast = objekt(entwurf.nutzlast);
  const stelle = umfeld === undefined || nutzlast === undefined || typeof nutzlast["stelle"] === "string" ? undefined : stelleFuer(entwurf, umfeld.stellen);
  const grund = eigenerGrund(entwurf, umfeld, nachtrag);
  if (stelle === undefined && grund === undefined) return entwurf;
  return {
    ...entwurf,
    ...(stelle === undefined || nutzlast === undefined ? {} : { nutzlast: { ...nutzlast, stelle } }),
    ...(grund === undefined ? {} : { grund }),
  };
}

/**
 * Gilt der Schritt einer Gesprächsnotiz, die dieser Arbeitsplatz verfasst
 * hat? Ihr Verfasser verteilt sie selbst (§5 „Gesprächsnotiz“, Folie 28) —
 * auch nachträglich, ohne Stelle Sichter.
 */
/**
 * Ist die Nachricht des Entwurfs über der Schwelle ihres Vorrangs vor dem
 * Sichter (R2-FM P2-5, R2-Si P2-2)? Gerechnet gegen die Uhr des Workers.
 */
export function sichterSaeumig(zustand: Zustand, entwurf: Folgeentwurf, jetztMs: number): boolean {
  const nachrichtId = objekt(entwurf.nutzlast)?.["nachrichtId"];
  if (entwurf.typ !== "NachrichtGesichtet" || typeof nachrichtId !== "string" || zustand.nachrichten?.[nachrichtId] === undefined) return false;
  return projektion.nachrichtNach(zustand, nachrichtId, new Date(jetztMs).toISOString())?.sichterSchwelleUeberschritten === true;
}

export function eigeneGespraechsnotiz(zustand: Zustand, entwurf: Folgeentwurf, clientId: string): boolean {
  const nachrichtId = objekt(entwurf.nutzlast)?.["nachrichtId"];
  const nachricht = typeof nachrichtId === "string" ? zustand.nachrichten?.[nachrichtId] : undefined;
  return nachricht?.gespraechsnotiz?.wert === true && nachricht.angelegtMit.clientId === clientId;
}

/** Trägt der Entwurf das Kennzeichen des Papier-Nachtrags? */
export function istNachtrag(entwurf: Folgeentwurf): boolean {
  return entwurf.nachrichtenfolge?.nachtrag === true;
}
