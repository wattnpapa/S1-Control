/**
 * „Als Vordruck drucken" an einer Nachricht (KONZEPT-NACHRICHTEN.md §7,
 * Schnitt N3): der Ruf `nachrichtVordruckErzeugen` und die Zeile mit der
 * erzeugten Datei.
 *
 * Der Worker zeichnet und schreibt nach `ausgaben\nachrichten`; zurück kommt
 * der Pfad wie bei jeder anderen Ausgabe, und darunter stehen dieselben
 * Knöpfe („Öffnen", „Ordner zeigen", im Browser „Herunterladen",
 * `Ausgabedatei.tsx`). Gedruckt wird aus dem PDF-Betrachter: Ein PDF druckt
 * das Programm, das es öffnet. Das Blatt — A5 hoch oder zwei auf A4 quer —
 * ist eine Einstellung dieses Arbeitsplatzes (`vordruckBlatt`, Vorbelegung A5).
 */

import { useState } from "react";

import type { Ausgabeergebnis } from "../kontrakt/index.js";
import { Ausgabedatei } from "./Ausgabedatei.js";
import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";

export interface Vordruckausgabe {
  readonly erzeuge: (nachrichtId: string) => void;
  /** Die Zeile mit der zuletzt erzeugten Datei, sonst nichts. */
  readonly anzeige: React.ReactNode;
  readonly laeuft: boolean;
}

export function useVordruckausgabe(): Vordruckausgabe {
  const akteId = useLaden((z) => z.akteId);
  const blatt = useLaden((z) => z.einstellungen.vordruckBlatt ?? "a5");
  const [erzeugt, setzeErzeugt] = useState<Ausgabeergebnis | undefined>(undefined);
  const [laeuft, setzeLaeuft] = useState(false);

  const erzeuge = (nachrichtId: string): void => {
    if (akteId === undefined || laeuft) return;
    setzeErzeugt(undefined);
    setzeLaeuft(true);
    rufe({ art: "nachrichtVordruckErzeugen", akteId, nachrichtId, blatt })
      .then(setzeErzeugt)
      .catch((fehler: unknown) => {
        useLaden.getState().melde("warnung", `Vordruck: ${fehler instanceof Error ? fehler.message : String(fehler)}`);
      })
      .finally(() => setzeLaeuft(false));
  };

  const anzeige =
    erzeugt === undefined ? null : (
      <Ausgabedatei pfad={erzeugt.pfad} vorsatz={`Vordruck (${blatt === "a5" ? "A5" : "A4 quer"}) geschrieben`} zusatz={`${String(erzeugt.bytes)} Bytes`} />
    );
  return { erzeuge, anzeige, laeuft };
}
