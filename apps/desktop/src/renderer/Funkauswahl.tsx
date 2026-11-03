/**
 * Was die gewählte Einheit im Blatt „Funkplan" kann — als Auswahlleiste am
 * Fuß der Zuordnung und als Kontextmenü an der Zeile (Entwurf „Entlastung",
 * 3.7, Option 6f).
 *
 * Bis Runde 6 standen „Funkprobe eintragen" und „kein Kontakt …" in der
 * Werkzeugzeile, ohne Markierung grau. Eine Funkprobe gilt aber einer
 * Einheit; deshalb stehen die Schritte jetzt dort, wo die Einheit gewählt
 * ist, und erst dann: „Funkprobe: Kontakt" (Strg+P) als Hauptweg, „kein
 * Kontakt …" mit Grund, die Maske „Funk und Erreichbarkeit" und „Rufgruppe
 * ändern …", das die Zelle Rufgruppe der Zeile zur Wahl öffnet. Im
 * beendeten Einsatz bleibt nur die Maske, die dann nur zeigt.
 */

import type { Funkteilnehmer } from "@s1/domaene";

import { Auswahlkontextmenue, Auswahlleiste, type Leistenknopf } from "./Auswahlleiste.js";
import type { Kontextort } from "./Klappmenue.js";
import { kuerzel, kuerzelText } from "./tastatur.js";

export interface FunkauswahlEigenschaften {
  readonly markiert: Funkteilnehmer;
  readonly nurLesen: boolean;
  readonly aufKontakt: () => void;
  readonly aufKeinKontakt: () => void;
  /** Öffnet „Funk und Erreichbarkeit". */
  readonly aufEinheit: () => void;
  /** Öffnet die Zelle Rufgruppe der Zeile zur Wahl. */
  readonly aufRufgruppe: () => void;
}

/** „1 gewählt · EAL 2 Pumpen Süd". */
export function funkauswahltitel(markiert: Funkteilnehmer): string {
  return `1 gewählt · ${markiert.einheit}`;
}

/** Die Schritte für die gewählte Einheit, in der Reihenfolge der Leiste. */
export function funkknoepfe(p: FunkauswahlEigenschaften): readonly Leistenknopf[] {
  const maske: Leistenknopf = {
    schluessel: "einheit",
    text: "Funk und Erreichbarkeit …",
    titel: p.nurLesen ? "Funk und Erreichbarkeit ansehen" : "Rufgruppen, Funkrufname, Erreichbarkeit und Funkhinweis bearbeiten",
    aufWahl: p.aufEinheit,
  };
  if (p.nurLesen) return [maske];
  return [
    {
      schluessel: "kontakt",
      text: "Funkprobe: Kontakt",
      kurz: kuerzelText(kuerzel("funkprobe") as never),
      titel: `Funkprobe „Kontakt“ für ${p.markiert.einheit}, Funkzeit jetzt`,
      haupt: true,
      aufWahl: p.aufKontakt,
    },
    { schluessel: "kein", text: "kein Kontakt …", titel: `Funkprobe ohne Kontakt für ${p.markiert.einheit}; fragt nach dem Grund`, aufWahl: p.aufKeinKontakt },
    maske,
    { schluessel: "rufgruppe", text: "Rufgruppe ändern …", titel: "Öffnet die Zelle Rufgruppe zur Wahl", aufWahl: p.aufRufgruppe },
  ];
}

/** Die Leiste am Fuß der Zuordnung. */
export function Funkleiste(p: FunkauswahlEigenschaften): React.JSX.Element {
  return <Auswahlleiste titel={funkauswahltitel(p.markiert)} knoepfe={funkknoepfe(p)} />;
}

/** Dieselben Schritte als Kontextmenü an der Zeile. */
export function Funkkontextmenue(
  p: FunkauswahlEigenschaften & { readonly ort: Kontextort; readonly aufSchliessen: () => void },
): React.JSX.Element {
  return <Auswahlkontextmenue ort={p.ort} titel={p.markiert.einheit} knoepfe={funkknoepfe(p)} aufSchliessen={p.aufSchliessen} />;
}
