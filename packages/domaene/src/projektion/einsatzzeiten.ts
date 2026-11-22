/**
 * Einsatzzeiten und Ablösung je Einheit vor Ort — für die Übersicht.
 *
 * Gefordert im Stab-Review vom 22.11.2026 (docs/audits/stab): S1 FA-S1-2 und
 * FA-S1-5, LtrFüSt F3, Fachberater Feuerwehr FW-A1. Wer ist seit wann
 * drin, wann muss wer raus, ist die Ablösung angefordert, zugesagt, da?
 * Die Angaben stehen heute in den Ressourcen-Spalten der Einheitentabelle
 * und im Blatt S4 unter „Nächste 24 h“, jede für sich.
 *
 * Keine neue Regel: Eintreffzeit und „verfügbar bis“ sind Felder der Einheit,
 * der Ablösungsstand kommt aus `abloesungDerEinheit` (K12). Ob „verfügbar bis“
 * abläuft und wie lange eine Einheit drin ist, rechnet die Anzeige mit ihrer
 * Minutenuhr (`verfuegbarkeitsmarke`, K18); dieses Paket kennt keine Uhr.
 */

import { statusTitel } from "../beschriftungen.js";
import { zaehlklasse } from "../kennzahlen.js";
import type { Id } from "../werte.js";
import type { EinheitZustand, Zustand } from "../zustand.js";
import { abloesungDerEinheit, type Marke } from "./abloesung.js";

export interface Einsatzzeitzeile {
  readonly einheitId: Id;
  readonly einheit: string;
  readonly organisation: string;
  readonly abschnitt: string;
  readonly status: string;
  readonly eingetroffenAm?: string;
  readonly verfuegbarBis?: string;
  /** Angefordert, zugesagt oder eingetroffen — mit wer und wann. */
  readonly abloesung?: {
    readonly marke: Marke;
    readonly durch: string;
    readonly zugesagtFuer: string;
  };
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

function ms(zeitpunkt: string | undefined, ohne: number): number {
  const wert = zeitpunkt === undefined ? Number.NaN : Date.parse(zeitpunkt);
  return Number.isNaN(wert) ? ohne : wert;
}

function zeileDer(zustand: Zustand, einheit: EinheitZustand): Einsatzzeitzeile {
  const eingetroffenAm = text(einheit.eingetroffenAm?.wert);
  const verfuegbarBis = text(einheit.verfuegbarBis?.wert);
  const status = text(einheit.status.wert);
  const abloesung = abloesungDerEinheit(zustand, einheit.id);
  return {
    einheitId: einheit.id,
    einheit: text(einheit.bezeichnung.wert) ?? einheit.id,
    organisation: text(einheit.organisation.wert) ?? "",
    abschnitt: text(zustand.abschnitte[einheit.wirksamerAbschnittId]?.name.wert) ?? "",
    status: status === undefined ? "" : statusTitel(status),
    ...(eingetroffenAm === undefined ? {} : { eingetroffenAm }),
    ...(verfuegbarBis === undefined ? {} : { verfuegbarBis }),
    ...(abloesung === undefined
      ? {}
      : {
          abloesung: {
            marke: abloesung.marke,
            durch: abloesung.zellen["abloesungDurch"] ?? "",
            zugesagtFuer: abloesung.zellen["zugesagtFuer"] ?? "",
          },
        }),
  };
}

/**
 * Die Einheiten vor Ort: wer zuerst gehen muss, steht oben (früheste
 * „verfügbar bis“), danach wer am längsten drin ist (früheste Eintreffzeit).
 */
export function einsatzzeiten(zustand: Zustand): readonly Einsatzzeitzeile[] {
  return Object.values(zustand.einheiten)
    .filter((einheit) => zaehlklasse(zustand, einheit) === "ist")
    .map((einheit) => zeileDer(zustand, einheit))
    .sort(
      (a, b) =>
        ms(a.verfuegbarBis, Number.MAX_SAFE_INTEGER) - ms(b.verfuegbarBis, Number.MAX_SAFE_INTEGER) ||
        ms(a.eingetroffenAm, Number.MAX_SAFE_INTEGER) - ms(b.eingetroffenAm, Number.MAX_SAFE_INTEGER) ||
        a.einheit.localeCompare(b.einheit, "de"),
    );
}
