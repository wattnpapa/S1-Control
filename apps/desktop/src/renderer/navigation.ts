/**
 * Browser-Zurück verlässt den Einsatz nicht ungefragt.
 *
 * Auf dem Handy ist „Zurück“ (Wischgeste, Systemtaste) der naheliegendste
 * Griff — und ohne Gegenmaßnahme führt er aus der Anwendung hinaus, mitten im
 * Einsatz. Hier bekommt **jedes Blatt einen History-Eintrag**: Zurück geht
 * zum vorigen Blatt. Vom ersten Blatt aus fragt die Anwendung nach, ob es
 * zurück zur Einsatzauswahl gehen soll; der Eintrag wird dazu wieder
 * aufgefüllt, ein „Nein“ kostet also nichts.
 *
 * Nur im Browser: In der Desktop-App gibt es keine Verlaufsnavigation.
 * Zusätzlich warnt `beforeunload`, wenn ein Entwurf mit Inhalt offen ist.
 */

import { useEffect, useRef } from "react";

import { hatOffenenEntwurf } from "./entwurf.js";

export const TEXT_ZURUECK_FRAGE =
  "Zurück zur Einsatzauswahl? Der Einsatz bleibt gespeichert und lässt sich wieder öffnen.";

interface Verlauf {
  readonly blatt: string;
}

function stand(): Verlauf | undefined {
  const zustand = (globalThis.history.state ?? undefined) as { s1blatt?: unknown } | undefined;
  return typeof zustand?.s1blatt === "string" ? { blatt: zustand.s1blatt } : undefined;
}

export interface Navigation {
  /** Nur im Browser und nur, solange ein Einsatz offen ist. */
  readonly aktiv: boolean;
  readonly blatt: string;
  readonly waehleBlatt: (blatt: string) => void;
  readonly zurueckZurAuswahl: () => void;
}

export function useBrowserNavigation(navigation: Navigation): void {
  const neuste = useRef(navigation);
  neuste.current = navigation;
  const { aktiv, blatt } = navigation;

  // Ein Eintrag je Blatt: Wechselt das Blatt, kommt ein Eintrag dazu — außer
  // der Wechsel kam gerade aus dem Verlauf selbst.
  useEffect(() => {
    if (!aktiv) return;
    if (stand()?.blatt === blatt) return;
    try {
      globalThis.history.pushState({ s1blatt: blatt }, "");
    } catch {
      // Verlauf nicht verfügbar: dann eben ohne.
    }
  }, [aktiv, blatt]);

  useEffect(() => {
    if (!aktiv) return;
    const beiZurueck = (): void => {
      const jetzt = neuste.current;
      const verlauf = stand();
      if (verlauf !== undefined) {
        if (verlauf.blatt !== jetzt.blatt) jetzt.waehleBlatt(verlauf.blatt);
        return;
      }
      // Hinter das erste Blatt zurück: Eintrag auffüllen und fragen.
      globalThis.history.pushState({ s1blatt: jetzt.blatt }, "");
      if (globalThis.confirm(TEXT_ZURUECK_FRAGE)) jetzt.zurueckZurAuswahl();
    };
    globalThis.addEventListener("popstate", beiZurueck);
    return () => {
      globalThis.removeEventListener("popstate", beiZurueck);
    };
  }, [aktiv]);

  // Seite verlassen/neu laden mit offenem Entwurf: der Browser fragt.
  useEffect(() => {
    const beiEntladen = (ereignis: BeforeUnloadEvent): void => {
      if (!hatOffenenEntwurf()) return;
      ereignis.preventDefault();
      ereignis.returnValue = "";
    };
    globalThis.addEventListener("beforeunload", beiEntladen);
    return () => {
      globalThis.removeEventListener("beforeunload", beiEntladen);
    };
  }, []);
}
