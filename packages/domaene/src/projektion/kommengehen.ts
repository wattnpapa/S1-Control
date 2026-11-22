/**
 * Kommen und Gehen der Kräfte für den Monitor (S1): wer angefordert oder
 * zugesagt ist, wer im Anmarsch ist und wessen Verfügbarkeit endet — eine
 * Liste in Zeitfolge, damit S1 und Führung sehen, wo in den nächsten Stunden
 * gehandelt werden muss.
 *
 * Gerechnet wird ohne Uhr: Die Projektion liefert die Zeitpunkte, ob etwas
 * „läuft ab" oder „abgelaufen" ist, entscheidet die Anzeige gegen ihre Zeit.
 * Stornierte und eingetroffene Anforderungen fehlen; eine Anforderung, die
 * eine Einheit ablösen soll, nennt sie.
 */

import { zaehlklasse } from "../kennzahlen.js";
import type { Zustand } from "../zustand.js";
import { anforderungsliste } from "./anforderung.js";

export type Bewegungsart = "angefordert" | "zugesagt" | "anmarsch" | "verfuegbarBis";

export interface Bewegung {
  readonly schluessel: string;
  readonly art: Bewegungsart;
  /** Einheit oder vorgesehene Einheit. */
  readonly name: string;
  /** Zeitpunkt, nach dem sortiert wird: zugesagt für, verfügbar bis, angefordert am. */
  readonly zeitpunkt?: string;
  /** „löst FGr WP 1 ab" oder der vorgesehene Auftrag. */
  readonly zusatz?: string;
}

function zeitwert(z: string | undefined): number {
  const wert = z === undefined ? Number.NaN : Date.parse(z);
  return Number.isNaN(wert) ? Number.POSITIVE_INFINITY : wert;
}

function anforderungen(zustand: Zustand): Bewegung[] {
  const { zeilen } = anforderungsliste(zustand, { zustaende: ["OFFEN", "ZUGESAGT"] });
  return zeilen.map((z) => {
    const zugesagt = z.zustand === "ZUGESAGT";
    const zeitpunkt = zugesagt ? (z.zugesagtFuer ?? z.angefordertAm) : z.angefordertAm;
    const zusatz = z.abzuloesendeEinheit !== undefined ? `löst ${z.abzuloesendeEinheit} ab` : z.vorgesehenerAuftrag;
    return {
      schluessel: `anforderung/${z.id}`,
      art: zugesagt ? "zugesagt" : "angefordert",
      name: z.vorgeseheneEinheitText === "" ? z.kennung : z.vorgeseheneEinheitText,
      ...(zeitpunkt === "" ? {} : { zeitpunkt }),
      ...(zusatz === "" ? {} : { zusatz }),
    };
  });
}

function einheiten(zustand: Zustand): Bewegung[] {
  const ergebnis: Bewegung[] = [];
  for (const e of Object.values(zustand.einheiten)) {
    const klasse = zaehlklasse(zustand, e);
    const name = typeof e.bezeichnung.wert === "string" ? e.bezeichnung.wert : e.id;
    if (klasse === "erwartet" && e.status.wert === "ANMARSCH") {
      ergebnis.push({ schluessel: `anmarsch/${e.id}`, art: "anmarsch", name });
    }
    const bis = e.verfuegbarBis?.wert;
    if (klasse === "ist" && typeof bis === "string" && bis !== "") {
      ergebnis.push({ schluessel: `bis/${e.id}`, art: "verfuegbarBis", name, zeitpunkt: bis });
    }
  }
  return ergebnis;
}

/** Alle Bewegungen, früheste zuerst; ohne Zeitpunkt ans Ende, dann nach Name. */
export function kommenUndGehen(zustand: Zustand): readonly Bewegung[] {
  return [...anforderungen(zustand), ...einheiten(zustand)].sort(
    (a, b) => zeitwert(a.zeitpunkt) - zeitwert(b.zeitpunkt) || a.name.localeCompare(b.name, "de"),
  );
}
