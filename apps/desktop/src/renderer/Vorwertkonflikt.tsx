/**
 * Die Konfliktmeldung der Nachrichtenmasken (Audit Fernmelder P2-6).
 *
 * Weist der Worker einen Schritt ab, weil ein anderer Arbeitsplatz denselben
 * Vermerk inzwischen gesetzt hat (`VORWERT`, `worker/vorwertpruefung.ts`),
 * stand in der Maske bisher „Wurde inzwischen von … geändert (neu:
 * {"zeitpunkt":"2026-11-17T09:20:00.000Z","handzeichen":"Ha"}). Neu laden?“ —
 * Rohdaten und eine Frage ohne Knopf. Unter Last liest das niemand.
 *
 * Jetzt sagt die Maske in Worten, was gilt: „Inzwischen von Hans (FmZ)
 * geändert: Annahme ist jetzt 1020 Ha“, und der Knopf „Neu laden“ holt die
 * Nachricht neu und öffnet die Maske mit dem neuen Vorher-Wert — wer dann
 * bewusst bestätigt, überschreibt sehenden Auges (§2.2a).
 *
 * Der Text der Abweisung kommt aus dem Worker und wird hier gelesen, nicht
 * geändert (der Kontrakt bleibt, wie er ist). Lässt er sich nicht lesen,
 * steht der Satz ohne Wert da, aber nie Rohdaten.
 */

import { datumZeitGruppe, projektion, type Nachrichtenzeile } from "@s1/domaene";

import { CODE_VORWERT, type Bedienergebnis, type Peer } from "../kontrakt/index.js";
import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { stellenname } from "./nachrichtenformate.js";

/** Der Vermerk, den ein Schritt setzt, als Wort. */
const FELDNAME: Readonly<Record<string, string>> = {
  NachrichtAngenommen: "Annahme",
  NachrichtBefoerdert: "Beförderung",
  NachrichtNachgewiesen: "Nummer",
  NachrichtGesichtet: "Sichtung",
  NachrichtUebermittlungVorgeschlagen: "Übermittlungsvorschlag",
  NachrichtWeitergegeben: "Weitergabe",
};

/** Die Abweisung des Workers, zerlegt: wer, und der neue Wert, soweit lesbar. */
export function abweisungLesen(meldung: string): { readonly wer: string | undefined; readonly neu: unknown } {
  const treffer = /^Wurde inzwischen von (.+?) geändert \(neu: ([\s\S]*)\)\. Neu laden\?$/u.exec(meldung);
  if (treffer === null) return { wer: undefined, neu: undefined };
  const roh = treffer[2] ?? "";
  try {
    return { wer: treffer[1], neu: JSON.parse(roh) as unknown };
  } catch {
    return { wer: treffer[1], neu: roh === "leer" ? null : roh };
  }
}

function uhr(zeitpunkt: unknown): string {
  return typeof zeitpunkt === "string" ? datumZeitGruppe(zeitpunkt).slice(2, 6) : "";
}

/** Der Wert eines Vermerks in Worten: „1020 Ha“, „1021 Fm (Funk)“, „Nr. 8“, „leer“. */
export function vermerkwert(wert: unknown): string {
  if (wert === null || wert === undefined || wert === "") return "leer";
  if (typeof wert !== "object") return String(wert);
  const w = wert as Record<string, unknown>;
  const teile = [
    typeof w["nummer"] === "number" ? `Nr. ${String(w["nummer"])}` : "",
    uhr(w["zeitpunkt"]),
    typeof w["handzeichen"] === "string" ? w["handzeichen"] : "",
    typeof w["mittel"] === "string" ? `(${projektion.mittelWort(w["mittel"])})` : "",
    typeof w["gegenstelle"] === "string" ? `an ${w["gegenstelle"]}` : "",
  ].filter((t) => t !== "");
  return teile.length === 0 ? "geändert" : teile.join(" ");
}

/** „Hans (FmZ)“ — der Name mit den Stellen seines Arbeitsplatzes aus der Präsenz, sofern bekannt. */
export function werMitStelle(wer: string | undefined, peers: readonly Peer[]): string {
  if (wer === undefined) return "einem anderen Arbeitsplatz";
  const stellen = peers.find((p) => p.anzeigename === wer)?.stellen ?? [];
  return stellen.length === 0 ? wer : `${wer} (${stellen.map(stellenname).join(", ")})`;
}

/** „Inzwischen von Hans (FmZ) geändert: Annahme ist jetzt 1020 Ha“ — ohne Rohdaten. */
export function konflikttext(typ: string, meldung: string, peers: readonly Peer[]): string {
  const { wer, neu } = abweisungLesen(meldung);
  const feld = FELDNAME[typ] ?? "der Vermerk";
  return `Inzwischen von ${werMitStelle(wer, peers)} geändert: ${feld} ist jetzt ${vermerkwert(neu)}.`;
}

/** Ob ein Ergebnis die Abweisung wegen eines fremden neueren Werts ist. */
export function istVorwertAbweisung(ergebnis: Bedienergebnis | undefined): ergebnis is Extract<Bedienergebnis, { art: "abgewiesen" }> {
  return ergebnis?.art === "abgewiesen" && ergebnis.code === CODE_VORWERT;
}

/** Holt die Nachricht neu; `undefined`, wenn es sie nicht (mehr) gibt oder der Ruf scheitert. */
export async function nachrichtNeuHolen(nachrichtId: string): Promise<Nachrichtenzeile | undefined> {
  const akteId = useLaden.getState().akteId;
  if (akteId === undefined) return undefined;
  try {
    const zeile = await rufe({ art: "nachrichtAnfordern", akteId, nachrichtId });
    return zeile === null || typeof zeile !== "object" ? undefined : zeile;
  } catch (fehler) {
    useLaden.getState().melde("warnung", fehler instanceof Error ? fehler.message : String(fehler));
    return undefined;
  }
}

export interface KonflikthinweisEigenschaften {
  readonly text: string;
  readonly aufNeuLaden: () => void;
}

/** Der Hinweis in der Maske mit dem Knopf „Neu laden“. */
export function Konflikthinweis({ text, aufNeuLaden }: KonflikthinweisEigenschaften): React.JSX.Element {
  return (
    <p className="warnung konflikthinweis" role="alert">
      {text}{" "}
      <button type="button" onClick={aufNeuLaden} title="Die Nachricht neu holen und die Maske mit dem geltenden Wert öffnen">
        Neu laden
      </button>
    </p>
  );
}
