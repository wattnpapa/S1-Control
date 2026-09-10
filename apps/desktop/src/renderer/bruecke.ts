/**
 * Der Zugang des Renderers zur Schale — die andere Seite des Preloads.
 *
 * Der Renderer hat weder Node noch Electron (02-ZIELBILD.md, „Vier Ringe");
 * `window.s1` ist alles, was er hat. Diese Datei gibt dem eine Form und einen
 * Typ, damit nicht jede Komponente ein `as` schreiben muss.
 *
 * **Die Bruecke wird injiziert, nicht gegriffen.** {@link setzeBruecke} gibt es,
 * damit die Komponententests aus M2.2 eine Attrappe einsetzen koennen. Ohne
 * diese Naht liefe jeder Test entweder gegen ein echtes Electron oder gegen ein
 * gefaelschtes `window` — beides schlechter als eine benannte Naht.
 */

import { BRUECKE, type Antwort, type Antworten, type Mitteilung, type Ruf } from "../kontrakt/index.js";

export interface Bruecke {
  readonly plattform: string;
  readonly electron: string;
  ruf(anfrage: Ruf): Promise<Antwort<unknown>>;
  aufMitteilung(hoerer: (mitteilung: Mitteilung) => void): () => void;
}

let eingesetzt: Bruecke | undefined;

/** Setzt die Bruecke von aussen — im Betrieb aus `haupt.tsx`, im Test aus dem Test. */
export function setzeBruecke(bruecke: Bruecke | undefined): void {
  eingesetzt = bruecke;
}

/** Die Bruecke aus `window`, wenn keine eingesetzt wurde. */
export function bruecke(): Bruecke {
  if (eingesetzt !== undefined) return eingesetzt;
  const aus = (globalThis as Record<string, unknown>)[BRUECKE];
  if (aus === undefined) {
    throw new Error(
      "Die Brücke zur Schale fehlt. Läuft dieses Fenster außerhalb von Electron?",
    );
  }
  return aus as Bruecke;
}

/**
 * Stellt eine Anfrage und liefert den Wert — oder wirft mit der Meldung.
 *
 * Der Kontrakt gibt `{ ok: false, meldung }` zurueck statt zu werfen (siehe
 * dort); hier wird daraus wieder eine Ausnahme. Das ist kein Widerspruch: Der
 * Kontrakt schuetzt die **Prozessgrenze** davor, einen Stapelabzug zu
 * transportieren. Innerhalb des Renderers ist die Ausnahme die kuerzere Form,
 * und der Store faengt sie an einer Stelle.
 */
export async function rufe<A extends Ruf["art"]>(
  anfrage: Extract<Ruf, { art: A }>,
): Promise<Antworten[A]> {
  const antwort = await bruecke().ruf(anfrage);
  if (!antwort.ok) throw new Error(antwort.meldung);
  return antwort.wert as Antworten[A];
}
