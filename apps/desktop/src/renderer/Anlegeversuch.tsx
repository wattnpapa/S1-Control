/**
 * Der Anlegeversuch einer Maske: stabile Kennungen, ehrlicher Ausgang.
 *
 * Jede Maske, die etwas **erzeugt**, hat dasselbe Problem: Bleibt die Antwort
 * aus („Unklar, ob gespeichert"), tippt der Bediener noch einmal auf
 * Übernehmen. Mit frischer Kennung entstünde ein zweites Objekt. Dieser Hook
 * gibt jeder Dialoginstanz **eine** Kennung (und was sonst im Körper stehen
 * muss, etwa den Zeitstempel), bis der Dialog schließt. Der Dienst kennt die
 * Wiederholung dann an Kennung und Körper und legt nur einmal an
 * (`web/wiederholung.ts`).
 *
 * Zum zweiten steht der Ausgang **im Dialog** und bleibt dort stehen, bis der
 * Dialog schließt oder ein neuer Versuch gelingt: „Nicht gespeichert –
 * Verbindung unterbrochen" bzw. „Unklar, ob gespeichert – bitte Liste prüfen".
 * Die Meldung des Fensters (Fehlerbild am Seitenende) verschwindet bei der
 * Wiederverbindung; hier darf sie das nicht. Alle Eingaben bleiben stehen,
 * denn die Maske schließt nur bei `geschrieben`.
 *
 * Ohne Verbindung ist Schreiben gesperrt, mit Grund neben dem Knopf
 * (`useSchreibsperre`).
 */

import { useCallback, useRef, useState } from "react";

import type { Bedienergebnis, Entwurf } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { MELDUNG_KEINE_VERBINDUNG, MELDUNG_NICHT_GESPEICHERT, MELDUNG_UNKLAR } from "./verbindung.js";
import { useSchreibsperre } from "./useVerbindungsstatus.js";

/** Der Hinweis bei unbekanntem Ausgang. */
export const TEXT_UNKLAR =
  "Unklar, ob gespeichert – bitte Liste prüfen. Ihre Eingaben bleiben stehen; erneutes Übernehmen legt nicht doppelt an.";
/** Der Hinweis, wenn sicher nichts geschrieben wurde. */
export const TEXT_NICHT_GESPEICHERT =
  "Nicht gespeichert – Verbindung unterbrochen. Ihre Eingaben bleiben stehen; bitte nach der Wiederverbindung erneut übernehmen.";

/** Der dauerhafte Dialogtext zur Meldung des Fensters, wenn ein Schreibruf scheiterte. */
export function hinweisAusFehler(fehler: string | undefined): string {
  if (fehler === undefined) return "Nicht gespeichert – es ist kein Einsatz geöffnet.";
  if (fehler === MELDUNG_UNKLAR) return TEXT_UNKLAR;
  if (fehler === MELDUNG_NICHT_GESPEICHERT || fehler === MELDUNG_KEINE_VERBINDUNG) return TEXT_NICHT_GESPEICHERT;
  return `Nicht gespeichert – ${fehler}`;
}

/** Der Hinweis zum Ausgang eines Schreibrufs; `undefined` heißt geschrieben. */
export function hinweisAusErgebnis(ergebnis: Bedienergebnis | undefined): string | undefined {
  if (!ergebnis) return hinweisAusFehler(useLaden.getState().fehler);
  if (ergebnis.art === "geschrieben") return undefined;
  if ("meldung" in ergebnis) return `Nicht gespeichert – ${ergebnis.meldung}`;
  return "Nicht gespeichert.";
}

export interface Anlegeversuch {
  /** Keine Verbindung: Der Bestätigungsknopf bleibt gesperrt. */
  readonly gesperrt: boolean;
  /** Die Kennungen dieser Dialoginstanz; `erzeuge` läuft einmal, danach gilt dasselbe Ergebnis. */
  readonly kennung: <T>(erzeuge: () => T) => T;
  /** Schreibt den Entwurf und hält den Ausgang im Dialog fest. */
  readonly schreibe: (entwurf: Entwurf) => Promise<Bedienergebnis | undefined>;
  /** Nur wo kein Dialog schließt (Blatt): vergisst Kennung und Hinweis, der nächste Versuch ist neu. */
  readonly verwerfe: () => void;
  /** Sperrgrund und Hinweis; in den Inhalt der Maske zu setzen. */
  readonly anzeige: React.JSX.Element | null;
  readonly hinweis: string | undefined;
  readonly sperre: string | undefined;
}

export function useAnlegeversuch(): Anlegeversuch {
  const sperre = useSchreibsperre();
  const gehalten = useRef<unknown>(undefined);
  const [hinweis, setzeHinweis] = useState<string | undefined>(undefined);

  const kennung = useCallback(<T,>(erzeuge: () => T): T => {
    gehalten.current ??= erzeuge();
    return gehalten.current as T;
  }, []);

  const schreibe = useCallback(async (entwurf: Entwurf): Promise<Bedienergebnis | undefined> => {
    setzeHinweis(undefined);
    const ergebnis = await useLaden.getState().bediene(entwurf);
    setzeHinweis(hinweisAusErgebnis(ergebnis));
    return ergebnis;
  }, []);

  const verwerfe = useCallback((): void => {
    gehalten.current = undefined;
    setzeHinweis(undefined);
  }, []);

  const anzeige =
    sperre === undefined && hinweis === undefined ? null : <Versuchshinweise sperre={sperre} hinweis={hinweis} />;
  return { gesperrt: sperre !== undefined, kennung, schreibe, verwerfe, anzeige, hinweis, sperre };
}

/** Sperrgrund und Ausgang des letzten Versuchs, jeweils als Hinweis zum Vorlesen. */
export function Versuchshinweise({
  sperre,
  hinweis,
}: {
  readonly sperre: string | undefined;
  readonly hinweis: string | undefined;
}): React.JSX.Element {
  return (
    <>
      {sperre !== undefined && (
        <p role="alert" className="warnung">
          {sperre}
        </p>
      )}
      {hinweis !== undefined && (
        <p role="alert" className="fehler">
          {hinweis}
        </p>
      )}
    </>
  );
}
