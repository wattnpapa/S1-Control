/**
 * Teile des Blatts „Nachrichten“, die die Audits vom 2026-11-17 verlangen —
 * eigene Datei, damit `Nachrichten.tsx` nicht über die Strukturgrenze wächst.
 *
 * - **Meine Stelle** (Sachgebietsleiter P1-4): Stelle und Handzeichen der
 *   Sitzung stehen sichtbar im Band, mit Knopf zum Ändern; vorher waren sie
 *   nach dem Öffnen nirgends mehr zu sehen.
 * - **Nachsichten** (Sichter P0-1, P1-5): In der Sicht Sichter lässt sich
 *   zwischen „vor dem Sichter“ und „gesichtet“ umschalten; die gesichteten
 *   Eingänge (jüngste Sichtung zuerst) sind zugleich die Ablage „meine
 *   Sichtungen“. Die Ordnung nach Sichtungszeit ist Darstellung; die Zeilen
 *   selbst kommen unverändert aus Ring 2 (Sicht Nachweisung).
 * - **Fremder Posteingang** (Sichter P0-2): Wer den Posteingang einer
 *   fremden Stelle ansieht, gibt dort keine Kenntnis; nur Stellen der eigenen
 *   Sitzung quittieren, und die Sicht sagt es.
 */

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Sitzungsstellen } from "../kontrakt/index.js";
import { stellenname } from "./nachrichtenformate.js";

/** „Meine Stelle: S4 · Hz. Ru“ — oder „ohne Stelle“. */
export function stellentext(sitzung: Sitzungsstellen | undefined): string {
  const stellen = sitzung?.stellen ?? [];
  const hz = sitzung?.handzeichen === undefined ? "" : ` · Hz. ${sitzung.handzeichen}`;
  return stellen.length === 0 ? `Meine Stelle: ohne Stelle${hz}` : `Meine Stelle: ${stellen.map(stellenname).join(", ")}${hz}`;
}

export function Stellenangabe({ sitzung, aufAendern }: { readonly sitzung: Sitzungsstellen | undefined; readonly aufAendern: (() => void) | undefined }): React.JSX.Element {
  return (
    <p className="stellenangabe" aria-label="Meine Stelle">
      <span>{stellentext(sitzung)}</span>
      {aufAendern !== undefined && (
        <button type="button" className="icon" title="Stelle und Handzeichen dieses Arbeitsplatzes ändern" onClick={aufAendern}>
          Ändern
        </button>
      )}
    </p>
  );
}

/** Die beiden Stände der Sicht Sichter. */
export type Sichterstand = "offen" | "gesichtet";

export function Sichterumschalter({ stand, aufStand }: { readonly stand: Sichterstand; readonly aufStand: (stand: Sichterstand) => void }): React.JSX.Element {
  return (
    <div className="umschalter" role="group" aria-label="Stand beim Sichter">
      <button type="button" aria-pressed={stand === "offen"} onClick={() => aufStand("offen")}>
        vor dem Sichter
      </button>
      <button type="button" aria-pressed={stand === "gesichtet"} onClick={() => aufStand("gesichtet")}>
        gesichtet
      </button>
    </div>
  );
}

/** Die gesichteten, nicht zurückgezogenen Nachrichten, jüngste Sichtung zuerst. */
export function gesichteteZeilen(zeilen: readonly Nachrichtenzeile[]): readonly Nachrichtenzeile[] {
  return zeilen
    .filter((z) => z.sichtung !== undefined && !z.zurueckgezogen)
    .sort((a, b) => Date.parse(b.sichtung?.zeitpunkt ?? "") - Date.parse(a.sichtung?.zeitpunkt ?? ""));
}

/** Die Stellen, für die „Lesen“ und „Erledigt“ quittieren: nur die eigenen der Sitzung (Sichter P0-2). */
export function quittierendeStellen(gezeigt: readonly string[], sitzung: Sitzungsstellen | undefined): readonly string[] {
  const eigene = sitzung?.stellen ?? [];
  return gezeigt.filter((s) => eigene.includes(s));
}

/** „Nur lesen, Kenntnis gibt S4 selbst.“ — über einem fremden Posteingang. */
export function fremdhinweis(fuer: string): string {
  return `Nur lesen, Kenntnis gibt ${stellenname(fuer)} selbst.`;
}

export interface SichtzusatzEigenschaften {
  readonly sicht: string;
  readonly fuer: string;
  readonly sitzung: Sitzungsstellen | undefined;
  readonly sichterstand: Sichterstand;
  readonly aufSichterstand: (stand: Sichterstand) => void;
}

/** Unter der Werkzeugzeile: der Hinweis im fremden Posteingang (P0-2) oder der Umschalter des Sichters (P0-1). */
export function Sichtzusatz({ sicht, fuer, sitzung, sichterstand, aufSichterstand }: SichtzusatzEigenschaften): React.JSX.Element | null {
  if (sicht === "posteingang" && fuer !== "" && !(sitzung?.stellen ?? []).includes(fuer)) return <p className="hinweistext">{fremdhinweis(fuer)}</p>;
  if (sicht === "sichter") return <Sichterumschalter stand={sichterstand} aufStand={aufSichterstand} />;
  return null;
}
