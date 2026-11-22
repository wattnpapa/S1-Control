/**
 * Die Fachlage als Ansicht (Stab-Review 2026-11-22): je Bereich die Zeilen,
 * dazu was eine Rolle auf einen Blick braucht — die jüngste Lage je
 * Abschnitt, je Pegel letzter Wert mit Tendenz und Prognose, die Patienten
 * je Sichtungskategorie, offene Störungen.
 *
 * Eine Zeile trägt die Werte ihrer Felder, wie sie im Zustand stehen; was
 * fehlt, ist nie gesetzt. Der Stand hat je Bereich eine Vorgabe (gemeldet,
 * beantragt, angefordert, Entwurf, offen). Zurückgezogenes steht unten.
 */

import { SICHTUNGSKATEGORIEN } from "../fachlage-werte.js";
import type { Id } from "../werte.js";
import type { Feld, Zustand } from "../zustand.js";

export const FACHLAGE_BEREICHE = ["lage", "pegel", "deich", "patienten", "amtshilfe", "material", "presse", "stoerungen"] as const;
export type Fachlagebereich = (typeof FACHLAGE_BEREICHE)[number];

/** Der Stand, solange keiner gesetzt ist. */
export const VORGABESTAND: Readonly<Record<Fachlagebereich, string | undefined>> = {
  lage: undefined,
  pegel: undefined,
  deich: "GEMELDET",
  patienten: "VOR_ORT",
  amtshilfe: "BEANTRAGT",
  material: "ANGEFORDERT",
  presse: "ENTWURF",
  stoerungen: "OFFEN",
};

/** Stände, mit denen ein Eintrag erledigt ist; er rückt nach unten. */
const ERLEDIGT: ReadonlySet<string> = new Set(["GESICHERT", "ZURUECKGEZOGEN", "ENTLASSEN", "UEBERGEBEN", "ABGELEHNT", "BEENDET", "GELIEFERT", "STORNIERT", "VEROEFFENTLICHT", "BEHOBEN"]);

export type Fachlagewert = string | number | boolean;

export interface Fachlagezeile {
  readonly id: Id;
  readonly zeitpunkt: string;
  readonly abschnitt?: string;
  /** Die Felder der Entität (ohne Kennung), wie sie im Zustand stehen. */
  readonly werte: Readonly<Record<string, Fachlagewert>>;
  /** Stand (bei Lage und Pegel: „zurückgezogen“ oder keiner). */
  readonly stand?: string;
  readonly erledigt: boolean;
}

export interface Pegelstand {
  readonly pegel: string;
  readonly zeitpunkt: string;
  readonly wertCm: number;
  /** Änderung gegen die vorige Messung desselben Pegels. */
  readonly tendenzCm?: number;
  readonly prognoseCm?: number;
  readonly prognoseFuer?: string;
  /** Alle gültigen Messungen, älteste zuerst. */
  readonly verlauf: readonly { readonly zeitpunkt: string; readonly wertCm: number }[];
}

export interface Fachlage {
  readonly zeilen: Readonly<Record<Fachlagebereich, readonly Fachlagezeile[]>>;
  /** Je Abschnitt die jüngste gültige Lagemeldung. */
  readonly lageJeAbschnitt: readonly Fachlagezeile[];
  readonly pegelstaende: readonly Pegelstand[];
  /** Patienten nach Sichtungskategorie, ohne zurückgezogene; dazu Einsatzkräfte. */
  readonly patientensumme: Readonly<Record<string, number>> & { readonly einsatzkraefte: number; readonly gesamt: number };
  readonly offeneStoerungen: number;
}

type Roheintrag = { readonly id: Id; readonly zeitpunkt: Feld<string>; readonly [feld: string]: unknown };

const SAMMLUNG: Readonly<Record<Fachlagebereich, keyof Zustand>> = {
  lage: "abschnittslagen",
  pegel: "pegelmessungen",
  deich: "deichschaeden",
  patienten: "patienten",
  amtshilfe: "amtshilfen",
  material: "materialien",
  presse: "pressemitteilungen",
  stoerungen: "stoerungen",
};

const NICHT_WERT = new Set(["id", "angelegtDurch", "angelegtMit", "angelegtMitNutzlast", "angelegtMitGrund", "angelegtMitArt", "verworfeneAnlagen"]);

function werteAus(eintrag: Roheintrag): Record<string, Fachlagewert> {
  const werte: Record<string, Fachlagewert> = {};
  for (const [schluessel, feld] of Object.entries(eintrag)) {
    if (NICHT_WERT.has(schluessel)) continue;
    const wert = (feld as Feld<unknown> | undefined)?.wert;
    if (typeof wert === "string" || typeof wert === "number" || typeof wert === "boolean") werte[schluessel] = wert;
  }
  return werte;
}

function zeileAus(zustand: Zustand, bereich: Fachlagebereich, eintrag: Roheintrag): Fachlagezeile {
  const werte = werteAus(eintrag);
  const zurueck = werte["zurueckgezogen"] === true;
  const stand = zurueck ? "ZURUECKGEZOGEN" : typeof werte["stand"] === "string" ? werte["stand"] : typeof werte["verbleib"] === "string" ? werte["verbleib"] : VORGABESTAND[bereich];
  const abschnittId = werte["abschnittId"];
  const abschnitt = typeof abschnittId === "string" ? zustand.abschnitte[abschnittId]?.name.wert : undefined;
  return {
    id: eintrag.id,
    zeitpunkt: typeof werte["zeitpunkt"] === "string" ? werte["zeitpunkt"] : "",
    ...(typeof abschnitt === "string" ? { abschnitt } : {}),
    werte,
    ...(stand === undefined ? {} : { stand }),
    erledigt: stand !== undefined && ERLEDIGT.has(stand),
  };
}

/** Offene zuerst, darin die jüngste oben; erledigte darunter, ebenso. */
function ordne(a: Fachlagezeile, b: Fachlagezeile): number {
  if (a.erledigt !== b.erledigt) return a.erledigt ? 1 : -1;
  return Date.parse(b.zeitpunkt) - Date.parse(a.zeitpunkt) || a.id.localeCompare(b.id);
}

function bereichszeilen(zustand: Zustand, bereich: Fachlagebereich): Fachlagezeile[] {
  const sammlung = (zustand[SAMMLUNG[bereich]] ?? {}) as Readonly<Record<string, Roheintrag>>;
  return Object.values(sammlung).map((e) => zeileAus(zustand, bereich, e)).sort(ordne);
}

function jeAbschnitt(lagen: readonly Fachlagezeile[]): Fachlagezeile[] {
  const juengste = new Map<string, Fachlagezeile>();
  for (const zeile of lagen) {
    const abschnitt = String(zeile.werte["abschnittId"]);
    if (zeile.erledigt || juengste.has(abschnitt)) continue;
    juengste.set(abschnitt, zeile);
  }
  return [...juengste.values()];
}

function pegelstaende(messungen: readonly Fachlagezeile[]): Pegelstand[] {
  const jePegel = new Map<string, Fachlagezeile[]>();
  for (const m of messungen.filter((z) => !z.erledigt)) {
    const name = String(m.werte["pegel"]);
    jePegel.set(name, [...(jePegel.get(name) ?? []), m]);
  }
  return [...jePegel].map(([pegel, liste]) => {
    const verlauf = liste.map((m) => ({ zeitpunkt: m.zeitpunkt, wertCm: Number(m.werte["wertCm"]) })).sort((a, b) => Date.parse(a.zeitpunkt) - Date.parse(b.zeitpunkt));
    const letzte = verlauf[verlauf.length - 1] as { zeitpunkt: string; wertCm: number };
    const vorige = verlauf[verlauf.length - 2];
    const quelle = liste.find((m) => m.zeitpunkt === letzte.zeitpunkt);
    const prognoseCm = quelle?.werte["prognoseCm"];
    const prognoseFuer = quelle?.werte["prognoseFuer"];
    return {
      pegel,
      ...letzte,
      ...(vorige === undefined ? {} : { tendenzCm: letzte.wertCm - vorige.wertCm }),
      ...(typeof prognoseCm === "number" ? { prognoseCm } : {}),
      ...(typeof prognoseFuer === "string" ? { prognoseFuer } : {}),
      verlauf,
    };
  }).sort((a, b) => a.pegel.localeCompare(b.pegel, "de"));
}

function patientensumme(patienten: readonly Fachlagezeile[]): Fachlage["patientensumme"] {
  const gueltig = patienten.filter((p) => p.stand !== "ZURUECKGEZOGEN");
  const je: Record<string, number> = Object.fromEntries(SICHTUNGSKATEGORIEN.map((k) => [k, 0]));
  for (const p of gueltig) je[String(p.werte["sichtung"])] = (je[String(p.werte["sichtung"])] ?? 0) + 1;
  return { ...je, einsatzkraefte: gueltig.filter((p) => p.werte["einsatzkraft"] === true).length, gesamt: gueltig.length };
}

export function fachlage(zustand: Zustand): Fachlage {
  const zeilen = Object.fromEntries(FACHLAGE_BEREICHE.map((b) => [b, bereichszeilen(zustand, b)])) as Record<Fachlagebereich, Fachlagezeile[]>;
  return {
    zeilen,
    lageJeAbschnitt: jeAbschnitt(zeilen.lage),
    pegelstaende: pegelstaende(zeilen.pegel),
    patientensumme: patientensumme(zeilen.patienten),
    offeneStoerungen: zeilen.stoerungen.filter((s) => !s.erledigt).length,
  };
}
