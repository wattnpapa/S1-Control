/**
 * Die Entitäten der Fachlage im Zustand (Stab-Review 2026-11-22,
 * `katalog/schemata-fachlage.ts`). Gefaltet wird generisch wie jede Anlage
 * mit Feldern (§3.2): Was die Anlage trägt, steht als Feld; eine Feldänderung
 * überschreibt es nach LWW. Zurückgezogen wird über ein Feld, nicht gelöscht.
 */

import type { Id } from "./werte.js";
import type { Anlage, Feld, VerworfeneAnlage } from "./zustand.js";

interface Fachlageanlage extends Anlage {
  readonly id: Id;
  readonly zeitpunkt: Feld<string>;
  readonly verworfeneAnlagen: readonly VerworfeneAnlage[];
}

export interface AbschnittslageZustand extends Fachlageanlage {
  readonly abschnittId: Feld<Id>;
  readonly lage: Feld<string>;
  readonly ort?: Feld<string>;
  readonly bedarf?: Feld<string>;
  readonly zurueckgezogen?: Feld<boolean>;
}

export interface PegelmessungZustand extends Fachlageanlage {
  readonly pegel: Feld<string>;
  readonly wertCm: Feld<number>;
  readonly prognoseCm?: Feld<number>;
  readonly prognoseFuer?: Feld<string>;
  readonly quelle?: Feld<string>;
  readonly zurueckgezogen?: Feld<boolean>;
}

export interface DeichschadenZustand extends Fachlageanlage {
  readonly deichKm: Feld<string>;
  readonly art: Feld<string>;
  readonly beschreibung: Feld<string>;
  readonly abschnittId?: Feld<Id>;
  readonly stand?: Feld<string>;
  readonly massnahme?: Feld<string>;
}

export interface PatientZustand extends Fachlageanlage {
  readonly kennung: Feld<string>;
  readonly sichtung: Feld<string>;
  readonly einsatzkraft: Feld<boolean>;
  readonly organisation?: Feld<string>;
  readonly verletzung?: Feld<string>;
  readonly abschnittId?: Feld<Id>;
  readonly verbleib?: Feld<string>;
  readonly transportziel?: Feld<string>;
}

export interface AmtshilfeZustand extends Fachlageanlage {
  readonly kennung: Feld<string>;
  readonly an: Feld<string>;
  readonly leistung: Feld<string>;
  readonly umfang?: Feld<string>;
  readonly benoetigtAb?: Feld<string>;
  readonly stand?: Feld<string>;
  readonly bemerkung?: Feld<string>;
}

export interface MaterialZustand extends Fachlageanlage {
  readonly bezeichnung: Feld<string>;
  readonly menge: Feld<number>;
  readonly mengeneinheit: Feld<string>;
  readonly abschnittId?: Feld<Id>;
  readonly benoetigtBis?: Feld<string>;
  readonly lieferant?: Feld<string>;
  readonly stand?: Feld<string>;
  readonly bemerkung?: Feld<string>;
}

export interface PressemitteilungZustand extends Fachlageanlage {
  readonly titel: Feld<string>;
  readonly text: Feld<string>;
  readonly stand?: Feld<string>;
  /** Wer freigegeben hat (Handzeichen oder Stelle). */
  readonly freigabe?: Feld<string>;
}

export interface StoerungZustand extends Fachlageanlage {
  readonly bereich: Feld<string>;
  readonly beschreibung: Feld<string>;
  readonly ersatzweg?: Feld<string>;
  readonly stand?: Feld<string>;
}

/** Die Sammlungen der Fachlage; jede fehlt, solange sie leer ist (wie `unterkuenfte`). */
export interface Fachlagesammlungen {
  readonly abschnittslagen?: { readonly [id: string]: AbschnittslageZustand };
  readonly pegelmessungen?: { readonly [id: string]: PegelmessungZustand };
  readonly deichschaeden?: { readonly [id: string]: DeichschadenZustand };
  readonly patienten?: { readonly [id: string]: PatientZustand };
  readonly amtshilfen?: { readonly [id: string]: AmtshilfeZustand };
  readonly materialien?: { readonly [id: string]: MaterialZustand };
  readonly pressemitteilungen?: { readonly [id: string]: PressemitteilungZustand };
  readonly stoerungen?: { readonly [id: string]: StoerungZustand };
}

/** Entitätsart → Name der Sammlung im Zustand. */
export const FACHLAGE_SAMMLUNGEN = {
  abschnittslage: "abschnittslagen",
  pegelmessung: "pegelmessungen",
  deichschaden: "deichschaeden",
  patient: "patienten",
  amtshilfe: "amtshilfen",
  material: "materialien",
  pressemitteilung: "pressemitteilungen",
  stoerung: "stoerungen",
} as const;
