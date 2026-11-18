/**
 * Was der Laufzettel des Sichters über den Verteiler hinaus sagt — eigene
 * Datei, damit `Laufzettel.tsx` unter der Strukturgrenze bleibt (AGENTS.md §6).
 *
 * - **Empfängerzahl** (Sichter P1-3, R2-Si P3-3): Der Knopf heißt
 *   „Sichten (3)“, und neben ihm steht der Verteiler in Worten
 *   („S2 rot, S4 grün, S3 blau“). Das Raster lag bei 860 Pixeln Höhe unter
 *   dem Knopf; wer sofort drückte, hatte die Vorbelegung nicht gesehen.
 * - **Wie zuletzt bei diesem Absender** (Sichter P1-3): Die Mahnung „Nicht
 *   jeder alles“ unterstützt ein Vorschlag aus der letzten Sichtung
 *   desselben Absenders in der Nachweisung — ein Klick übernimmt ihn, nichts
 *   geschieht von selbst.
 * - **Ersatzsichtung** (R2-Si P2-1): Hat die FmZ (oder der LdF) als
 *   Ersatzsichter verteilt, trägt die Zeile die Marke „Ersatzsichtung (Fm)“,
 *   und der Laufzettel sagt „bitte prüfen“. Der heimkehrende Sichter sah das
 *   bisher nur am Handzeichen in der Nachweisung. Erkannt wird sie an
 *   `zeile.ersatzsichtung` oder am Grund des Ereignisses
 *   (`GRUND_ERSATZSICHTER`), beides optional gelesen (Domänenschnitt).
 */

import { projektion, type Nachrichtenzeile } from "@s1/domaene";

import { stellenname } from "./nachrichtenformate.js";
import type { Verteilerwahl } from "./Verteilerraster.js";

const FARBE: Readonly<Record<string, string>> = { GRUEN: "grün", BLAU: "blau", ROT: "rot" };

/** „S2 rot, S4 grün“ — der Verteiler in Worten. */
export function verteilerkurz(verteiler: readonly Verteilerwahl[]): string {
  return verteiler.map((v) => `${stellenname(v.stelle)} ${FARBE[v.kopie] ?? v.kopie.toLowerCase()}`).join(", ");
}

/** „Sichten (3)“ bzw. „Nachsichten (2)“ — der Knopf mit der Zahl der Empfänger (Sichter P1-3). */
export function sichtknopftext(nachsichten: boolean, verteiler: readonly Verteilerwahl[]): string {
  return `${nachsichten ? "Nachsichten" : "Sichten"} (${String(verteiler.length)})`;
}

const norm = (text: string): string => text.trim().replace(/\s+/gu, " ").toLocaleLowerCase("de");

/** Der Verteiler der jüngsten Sichtung desselben Absenders, ohne diese Nachricht; sonst `undefined` (Sichter P1-3). */
export function zuletztBeiAbsender(verlauf: readonly Nachrichtenzeile[], zeile: Nachrichtenzeile): readonly Verteilerwahl[] | undefined {
  const absender = norm(zeile.absender);
  if (absender === "") return undefined;
  const frueher = verlauf
    .filter((z) => z.id !== zeile.id && !z.zurueckgezogen && z.sichtung !== undefined && norm(z.absender) === absender)
    .sort((a, b) => Date.parse(b.sichtung?.zeitpunkt ?? "") - Date.parse(a.sichtung?.zeitpunkt ?? ""))[0];
  const verteiler = frueher?.sichtung?.verteiler;
  if (verteiler === undefined || verteiler.length === 0) return undefined;
  return verteiler.map((v) => ({ stelle: v.stelle, kopie: v.kopie ?? "BLAU" }));
}

/** Ob die geltende Sichtung eine Ersatzsichtung ist (R2-Si P2-1); optional gelesen. */
export function istErsatzsichtung(zeile: Nachrichtenzeile): boolean {
  const z = zeile as { readonly ersatzsichtung?: unknown; readonly sichtungGrund?: unknown; readonly sichtung?: { readonly grund?: unknown } };
  if (z.ersatzsichtung === true) return true;
  return [z.sichtungGrund, z.sichtung?.grund].some((g) => g === projektion.GRUND_ERSATZSICHTER);
}

/** Die Marke an Zeile und Laufzettel: „Ersatzsichtung (Fm)“. */
export function Ersatzmarke({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element | null {
  if (!istErsatzsichtung(zeile)) return null;
  const hz = zeile.sichtung?.handzeichen;
  return (
    <span className="marke-zustand warn ersatzsichtung" title="Ohne besetzten Sichter verteilt — der Sichter sichtet nach">
      {" "}
      Ersatzsichtung{hz === undefined ? "" : ` (${hz})`}
    </span>
  );
}

/** Der Vorschlag über dem Raster; ohne frühere Sichtung des Absenders nichts. */
export function Absendervorschlag({ vorschlag, aufUebernehmen, gesperrt }: { readonly vorschlag: readonly Verteilerwahl[] | undefined; readonly aufUebernehmen: (verteiler: readonly Verteilerwahl[]) => void; readonly gesperrt: boolean }): React.JSX.Element | null {
  if (vorschlag === undefined) return null;
  return (
    <p className="hinweistext absendervorschlag">
      Wie zuletzt bei diesem Absender: {verteilerkurz(vorschlag)}{" "}
      <button type="button" disabled={gesperrt} title="Den Verteiler der letzten Sichtung dieses Absenders übernehmen" onClick={() => aufUebernehmen(vorschlag)}>
        Übernehmen
      </button>
    </p>
  );
}
