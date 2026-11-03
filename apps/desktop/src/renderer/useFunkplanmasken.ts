/**
 * Die Masken des Blattes „Funkplan" und die Funkprobe für die gewählte
 * Einheit — aus `Funkplan.tsx` herausgelöst, damit das Blatt verteilt und
 * nicht selbst entscheidet.
 *
 * Welche Maske offen ist, und die beiden Wege hinein: eine Rufgruppe
 * bearbeiten und eine Einheit öffnen, jeweils erst nach der Sperrprüfung.
 * Ein anderer Arbeitsplatz hat die Gruppe offen: erst Hinweis, dann
 * bewusstes Übernehmen beim zweiten Versuch.
 */

import { useCallback, useState } from "react";

import type { Funkplan as Funkplandaten, Funkteilnehmer, Rufgruppenkarte } from "@s1/domaene";

import { useLaden } from "./laden.js";
import type { Anlagezeile } from "./RufgruppeMaske.js";
import { useFremdsperren } from "./useBearbeitungssperre.js";
import { useFunkprobe } from "./useFunkprobe.js";

export type Funkplanmaske =
  | { readonly art: "anlegen"; readonly fuer?: Anlagezeile }
  | { readonly art: "bearbeiten"; readonly karte: Rufgruppenkarte }
  | { readonly art: "einheit"; readonly teilnehmer: Funkteilnehmer }
  | undefined;

export interface Funkplanmasken {
  readonly offen: Funkplanmaske;
  readonly setzeOffen: (offen: Funkplanmaske) => void;
  readonly bearbeite: (karte: Rufgruppenkarte) => void;
  readonly oeffneEinheit: (t: Funkteilnehmer) => void;
}

export function anlagezeile(t: Funkteilnehmer): Anlagezeile {
  return { einheitId: t.einheitId, einheit: t.einheit, ...(t.rufgruppeId === undefined ? {} : { vorher: t.rufgruppeId }) };
}

/** Die gewählte Einheit im aktuellen Plan — frisch, damit ihre Proben der richtige Vorher-Wert sind. */
export function teilnehmerVon(plan: Funkplandaten | undefined, einheitId: string | undefined): Funkteilnehmer | undefined {
  if (plan === undefined || einheitId === undefined) return undefined;
  return [...plan.rufgruppen.flatMap((r) => r.teilnehmer), ...plan.ohneRufgruppe].find((t) => t.einheitId === einheitId);
}

export function useFunkplanmasken(nurLesen: boolean): Funkplanmasken {
  const melde = useLaden((z) => z.melde);
  const fremd = useFremdsperren();
  const [offen, setzeOffen] = useState<Funkplanmaske>(undefined);
  const bearbeite = useCallback(
    (karte: Rufgruppenkarte): void => {
      if (nurLesen || karte.aufgeloest) return;
      const hinweis = fremd.pruefeStart(karte.rufgruppeId);
      if (hinweis !== undefined) {
        melde("warnung", hinweis);
        return;
      }
      setzeOffen({ art: "bearbeiten", karte });
    },
    [nurLesen, fremd, melde],
  );
  // Die Maske der Einheit hält den Teilnehmer, wie er beim Öffnen war: Das
  // sind ihre Vorher-Werte, auch wenn der Plan sich derweil auffrischt.
  const oeffneEinheit = useCallback(
    (t: Funkteilnehmer): void => {
      const hinweis = nurLesen ? undefined : fremd.pruefeStart(t.einheitId);
      if (hinweis !== undefined) {
        melde("warnung", hinweis);
        return;
      }
      setzeOffen({ art: "einheit", teilnehmer: t });
    },
    [nurLesen, fremd, melde],
  );
  return { offen, setzeOffen, bearbeite, oeffneEinheit };
}

/** „Funkprobe: Kontakt" und „kein Kontakt …" für die gewählte Einheit; ohne Wahl ein Hinweis. */
export function useProbeFuerGewaehlte(
  nurLesen: boolean,
  markiert: Funkteilnehmer | undefined,
): { readonly probe: (ergebnis: "KONTAKT" | "KEIN_KONTAKT") => void; readonly maske: React.JSX.Element | null } {
  const melde = useLaden((z) => z.melde);
  const funkprobe = useFunkprobe();
  const probe = (ergebnis: "KONTAKT" | "KEIN_KONTAKT"): void => {
    if (nurLesen) return;
    if (markiert === undefined) {
      melde("info", "Funkprobe: erst eine Einheit in der Zuordnung markieren.");
      return;
    }
    if (ergebnis === "KONTAKT") funkprobe.kontakt(markiert);
    else funkprobe.keinKontakt(markiert);
  };
  return { probe, maske: funkprobe.maske };
}
