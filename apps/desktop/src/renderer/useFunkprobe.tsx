/**
 * „Funkprobe eintragen" (KONZEPT-FUNKPLAN.md §5 und §6, Funkplan F3) — eine
 * Stelle für das Blatt „Funkplan" (Knopf und Strg+P) und die Maske „Funk und
 * Erreichbarkeit" (Knöpfe in der Zeile „Letzter Kontakt").
 *
 * „Kontakt" schreibt sofort, mit der Funkzeit jetzt. „kein Kontakt …" fragt
 * nach dem Grund (Pflicht) und schreibt mit der Funkzeit des Knopfdrucks: Die
 * Probe ist gescheitert, als der Sprechfunker rief, nicht als er den Grund
 * fertig getippt hatte. Der Entwurf kommt aus dem Kontrakt (`funkprobe`), mit
 * der gesehenen Probe desselben Ergebnisses als Vorher-Wert.
 *
 * Die Grundabfrage ist eine eigene Maske. Wer den Haken in einer anderen Maske
 * benutzt, zeichnet `maske` **neben** ihr und nicht in ihr: Ein Absenden in
 * der inneren Maske stiege sonst durch den React-Baum in die äußere.
 */

import { projektion, type Funkprobenwert } from "@s1/domaene";

import type { Bedienergebnis } from "../kontrakt/index.js";
import { funkprobe, type Funkprobenziel } from "../kontrakt/funkschritte.js";
import { hinweisAusErgebnis } from "./Anlegeversuch.js";
import { useGrundabfrage } from "./Grundabfrage.js";
import { useLaden } from "./laden.js";

/** Das Ziel einer Probe, mit Namen für Rückfrage und Meldung. */
export type Funkprobeneinheit = Funkprobenziel & { readonly einheit: string };

/** Was geschrieben wurde — für eine Maske, die Anzeige und Vorher-Wert nachführt. */
export interface GeschriebeneProbe {
  readonly ergebnis: "KONTAKT" | "KEIN_KONTAKT";
  /** Der Wert, wie er jetzt im Feld steht — der Vorher-Wert der nächsten Probe. */
  readonly wert: Funkprobenwert;
}

interface Probe {
  readonly ergebnis: "KONTAKT" | "KEIN_KONTAKT";
  readonly zeitpunkt: string;
  readonly grund?: string;
}

export interface Funkprobenbedienung {
  readonly kontakt: (ziel: Funkprobeneinheit) => void;
  readonly keinKontakt: (ziel: Funkprobeneinheit) => void;
  /** Die Grundabfrage, solange sie offen ist — neben jeder anderen Maske zeichnen. */
  readonly maske: React.JSX.Element | null;
}

export function useFunkprobe(aufGeschrieben?: (probe: GeschriebeneProbe) => void): Funkprobenbedienung {
  const bediene = useLaden((z) => z.bediene);
  const melde = useLaden((z) => z.melde);
  const abfrage = useGrundabfrage();

  const schreibe = async (ziel: Funkprobeneinheit, probe: Probe): Promise<Bedienergebnis | undefined> => {
    const entwurf = funkprobe(ziel, probe.ergebnis, probe.zeitpunkt, probe.grund);
    const ergebnis = await bediene(entwurf);
    const hinweis = hinweisAusErgebnis(ergebnis);
    if (hinweis !== undefined) {
      melde("warnung", `${ziel.einheit}: ${hinweis}`);
    } else if (ergebnis?.art === "geschrieben") {
      const wort = probe.ergebnis === "KONTAKT" ? "Kontakt" : "kein Kontakt";
      melde("info", `Funkprobe ${ziel.einheit}: ${wort} ${projektion.uhrzeitKurz(probe.zeitpunkt)}`);
      aufGeschrieben?.({ ergebnis: probe.ergebnis, wert: entwurf.neu as Funkprobenwert });
    }
    return ergebnis;
  };

  return {
    kontakt: (ziel) => {
      void schreibe(ziel, { ergebnis: "KONTAKT", zeitpunkt: new Date().toISOString() });
    },
    keinKontakt: (ziel) => {
      const zeitpunkt = new Date().toISOString();
      abfrage.frage({
        titel: `„${ziel.einheit}“ — kein Kontakt`,
        erlaeuterung: `Funkprobe ${projektion.uhrzeitKurz(zeitpunkt)} ohne Kontakt. Der letzte Kontakt bleibt stehen; „kein Kontakt“ steht daneben, bis wieder Kontakt war.`,
        bestaetigungstext: "Eintragen",
        aufGrund: (grund) => schreibe(ziel, { ergebnis: "KEIN_KONTAKT", zeitpunkt, grund }),
      });
    },
    maske: abfrage.maske,
  };
}
