/**
 * Bestellungen und Ausgabestellen der Verpflegung (S4.3, KONZEPT-S4.md §5.1).
 *
 * Eine Bestellung gilt für **eine** Mahlzeit an **einem** Tag. Wird für
 * dieselbe Mahlzeit neu bestellt („Bestellung ändern"), gilt die jüngste
 * nicht stornierte; die älteren stehen im Verlauf als ersetzt. Die
 * Vorausschau ist der Vorschlag, die Bestellung die Entscheidung — die
 * Differenz zeigt, wo nach der Bestellung noch jemand gemeldet wurde.
 */

import { vergleicheHlc } from "../hlc.js";
import type { AbschnittZustand, BestellungZustand, Zustand } from "../zustand.js";

export interface Bestellzeile {
  readonly bestellungId: string;
  readonly datum: string;
  readonly mahlzeit: string;
  readonly ausgabestelleId?: string;
  readonly ausgabestelle?: string;
  readonly portionen: number;
  readonly vegetarisch: number;
  readonly vegan: number;
  readonly bestelltBei?: string;
  readonly bestelltVon?: string;
  /** Wann bestellt wurde (Uhrzeit des anlegenden Arbeitsplatzes, nur Anzeige). */
  readonly bestelltUm: string;
  readonly geliefert?: number;
  readonly storniert: boolean;
  /** Eine jüngere Bestellung derselben Mahlzeit gilt statt dieser. */
  readonly ersetzt: boolean;
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.length > 0 ? wert : undefined;
}

function zahl(wert: unknown): number {
  return typeof wert === "number" && Number.isFinite(wert) ? wert : 0;
}

function ausgabestellenname(zustand: Zustand, id: string | undefined): string | undefined {
  return id === undefined ? undefined : (text(zustand.ausgabestellen?.[id]?.name.wert) ?? id);
}

function zeileAus(zustand: Zustand, b: BestellungZustand, ersetzt: boolean): Bestellzeile {
  const stelle = text(b.ausgabestelleId?.wert);
  const name = ausgabestellenname(zustand, stelle);
  const bei = text(b.bestelltBei?.wert);
  const von = text(b.bestelltVon?.wert);
  const geliefert = b.geliefert?.wert;
  return {
    bestellungId: b.id,
    datum: text(b.datum.wert) ?? "",
    mahlzeit: text(b.mahlzeit.wert) ?? "",
    ...(stelle === undefined ? {} : { ausgabestelleId: stelle }),
    ...(name === undefined ? {} : { ausgabestelle: name }),
    portionen: zahl(b.portionen.wert),
    vegetarisch: zahl(b.vegetarisch.wert),
    vegan: zahl(b.vegan.wert),
    ...(bei === undefined ? {} : { bestelltBei: bei }),
    ...(von === undefined ? {} : { bestelltVon: von }),
    bestelltUm: new Date(b.angelegtMit.millisekunden).toISOString(),
    ...(typeof geliefert === "number" ? { geliefert } : {}),
    storniert: b.storniert?.wert === true,
    ersetzt,
  };
}

/** Alle Bestellungen, jüngste zuerst, mit der Marke „ersetzt". */
export function bestellverlauf(zustand: Zustand): readonly Bestellzeile[] {
  const alle = Object.values(zustand.bestellungen ?? {}).sort((a, b) => vergleicheHlc(b.angelegtMit, a.angelegtMit));
  const gesehen = new Set<string>();
  return alle.map((b) => {
    const schluessel = `${String(b.datum.wert)}/${String(b.mahlzeit.wert)}`;
    const gilt = b.storniert?.wert !== true && !gesehen.has(schluessel);
    if (gilt) gesehen.add(schluessel);
    return zeileAus(zustand, b, b.storniert?.wert !== true && !gilt);
  });
}

/** Die geltende Bestellung einer Mahlzeit an einem Tag, sofern es eine gibt. */
export function geltendeBestellung(
  verlauf: readonly Bestellzeile[],
  datum: string,
  mahlzeit: string,
): Bestellzeile | undefined {
  return verlauf.find((b) => b.datum === datum && b.mahlzeit === mahlzeit && !b.storniert && !b.ersetzt);
}

export interface Ausgabestellenzeile {
  readonly ausgabestelleId: string;
  readonly name: string;
  readonly ort?: string;
  readonly traeger?: string;
}

/** Die Ausgabestellen in Namensordnung. */
export function ausgabestellen(zustand: Zustand): readonly Ausgabestellenzeile[] {
  return Object.values(zustand.ausgabestellen ?? {})
    .filter((a) => a.entfernt?.wert !== true)
    .map((a) => {
      const ort = text(a.ort?.wert);
      const traeger = text(a.traeger?.wert);
      return {
        ausgabestelleId: a.id,
        name: text(a.name.wert) ?? a.id,
        ...(ort === undefined ? {} : { ort }),
        ...(traeger === undefined ? {} : { traeger }),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/**
 * Die Ausgabestelle eines Bereichs: die gesetzte, sonst die Vorbelegung —
 * der Bereich vom Typ LOGISTIK, wenn es genau einen gibt (KONZEPT-S4.md §6).
 */
export function ausgabestelleDes(
  zustand: Zustand,
  abschnittId: string,
): { readonly id?: string; readonly name: string; readonly vorbelegt: boolean } | undefined {
  const gesetzt = text(zustand.abschnitte[abschnittId]?.ausgabestelleId?.wert);
  if (gesetzt !== undefined) return { id: gesetzt, name: ausgabestellenname(zustand, gesetzt) ?? gesetzt, vorbelegt: false };
  const logistik = Object.values(zustand.abschnitte).filter(
    (a: AbschnittZustand) => a.typ.wert === "LOGISTIK" && (a.aufgeloest?.wert ?? null) === null,
  );
  const einziger = logistik.length === 1 ? logistik[0] : undefined;
  const name = text(einziger?.name.wert);
  return name === undefined ? undefined : { name, vorbelegt: true };
}
