/**
 * Konflikthinweise an Nachrichten in der Diagnose, mit „Nachricht öffnen“
 * (Audit Sichter P0-3, zweiter Durchlauf Punkt 10).
 *
 * Zwei Sichter an derselben Nachricht erzeugen `vorherPasstNicht` auf
 * `nachricht/<id>/sichtung` (§5 „Sichtung“). Die Statuszeile zählt solche
 * Hinweise; wer ihnen nachgeht, landete bisher in der Diagnose bei einer Zahl
 * ohne Weg zur Nachricht. Hier steht je Hinweis an einer Nachricht der Knopf
 * „Nachricht öffnen“ wie im Tagebuch (ETB P0-1): Er holt die Zeile über die
 * Kennung (`nachrichtAnfordern`) und zeigt die Ansicht.
 *
 * Das Lagebild trägt heute nur die Zahl (`Lagebild.hinweise`). Die Liste mit
 * Feldpfaden liefert der Kontraktschnitt des anderen Arbeitsstrangs als
 * `konflikthinweise`; bis dahin wird sie optional gelesen, und der Abschnitt
 * fehlt.
 */

import { useState } from "react";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Lagebild } from "../kontrakt/index.js";
import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { Nachrichtenansicht } from "./Nachrichtenansicht.js";

/** Ein Konflikthinweis, wie die Diagnose ihn braucht: Art und Feldpfad. */
export interface Hinweiseintrag {
  readonly art: string;
  readonly feldpfad: string;
}

/** Die Liste der Konflikthinweise aus dem Lagebild — optional gelesen (siehe Dateikopf). */
export function konflikthinweiseAus(lagebild: Lagebild | undefined): readonly Hinweiseintrag[] {
  const liste = (lagebild as { readonly konflikthinweise?: unknown } | undefined)?.konflikthinweise;
  if (!Array.isArray(liste)) return [];
  return liste.filter((h): h is Hinweiseintrag => typeof h === "object" && h !== null && typeof (h as Hinweiseintrag).feldpfad === "string" && typeof (h as Hinweiseintrag).art === "string");
}

/** Die Kennung der Nachricht aus `nachricht/<id>/…`, sonst `undefined`. */
export function nachrichtIdAusPfad(feldpfad: string): string | undefined {
  const treffer = /^nachricht\/([^/]+)(?:\/|$)/u.exec(feldpfad);
  return treffer?.[1];
}

const FELD: Readonly<Record<string, string>> = { sichtung: "Sichtung", nachweis: "Nummer", annahme: "Annahme", befoerderung: "Beförderung" };

/** „Sichtung: zwei Sichter haben verschieden verteilt“ — der Hinweis in Worten. */
export function hinweistext(h: Hinweiseintrag): string {
  const feld = FELD[h.feldpfad.split("/")[2] ?? ""] ?? "Vermerk";
  if (h.art === "vorherPasstNicht") return `${feld}: zwei Arbeitsplätze haben verschieden vermerkt`;
  return `${feld}: ${h.art}`;
}

/** „Nachricht öffnen“: holt die Zeile über die Kennung und zeigt die Ansicht (wie im Tagebuch, ETB P0-1). */
export function useNachrichtOeffnen(): { readonly oeffne: (nachrichtId: string) => void; readonly anzeige: React.ReactNode } {
  const [offen, setzeOffen] = useState<Nachrichtenzeile | undefined>(undefined);
  const oeffne = (nachrichtId: string): void => {
    const { akteId, melde } = useLaden.getState();
    if (akteId === undefined) return;
    rufe({ art: "nachrichtAnfordern", akteId, nachrichtId })
      .then((zeile) => {
        if (zeile === null) melde("warnung", "Diese Nachricht gibt es in diesem Einsatz nicht.");
        else setzeOffen(zeile);
      })
      .catch((fehler: unknown) => {
        melde("warnung", fehler instanceof Error ? fehler.message : String(fehler));
      });
  };
  const anzeige = offen === undefined ? null : <Nachrichtenansicht zeile={offen} aufSchliessen={() => setzeOffen(undefined)} />;
  return { oeffne, anzeige };
}

/** Der Abschnitt der Diagnose; ohne Hinweis an einer Nachricht entfällt er. */
export function Nachrichtenhinweise({ lagebild }: { readonly lagebild: Lagebild | undefined }): React.JSX.Element | null {
  const oeffnen = useNachrichtOeffnen();
  const eintraege = konflikthinweiseAus(lagebild).flatMap((h) => {
    const id = nachrichtIdAusPfad(h.feldpfad);
    return id === undefined ? [] : [{ h, id }];
  });
  if (eintraege.length === 0) return null;
  return (
    <>
      <h3>Konflikthinweise an Nachrichten</h3>
      <ul className="nachrichtenhinweise">
        {eintraege.map(({ h, id }, nummer) => (
          <li key={`${h.feldpfad}-${String(nummer)}`}>
            {hinweistext(h)}{" "}
            <button type="button" aria-label="Nachricht öffnen" title={`Nachricht ${id} öffnen`} onClick={() => oeffnen.oeffne(id)}>
              ✉ Nachricht öffnen
            </button>
          </li>
        ))}
      </ul>
      {oeffnen.anzeige}
    </>
  );
}
