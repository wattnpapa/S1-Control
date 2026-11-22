/**
 * Den Demo-Einsatz anlegen — der Teil der Vermittlung, der nur ihn betrifft.
 *
 * Ein **eigener, kurzlebiger Arbeiter** spielt das Drehbuch ein
 * (`worker/demo/demoeinsatz.ts`): Seine Uhr ist gestellt und beginnt zwölf
 * Stunden vor jetzt, damit jedes Ereignis die Wanduhr seines Drehbuchschritts
 * trägt. Danach schließt er, und die Vermittlung öffnet den Einsatz wie jeden
 * anderen — für den gewöhnlichen Arbeiter ist das ein Programmneustart zwölf
 * Stunden später, mit der Uhr des Rechners.
 *
 * Wie die Vermittlung kennt diese Datei kein Electron und hält keinen
 * Fachzustand: Was im Demo-Einsatz steht, entscheidet allein das Drehbuch.
 */

import type { Arbeiterhof } from "./arbeiterhof.js";
import { EINSATZ_DOPPELT } from "./einsatzliste.js";
import type { Startdaten } from "../worker/akte-worker.js";
import { demoBeginnMs, type Demoergebnis } from "../worker/demo/demoeinsatz.js";
import { DEMO_NAME } from "../worker/demo/demostruktur.js";
import { demozeit } from "../worker/demo/drehbuch.js";

/** So viele Demo-Einsätze desselben Tages bekommen eine laufende Nummer; danach ist Schluss. */
export const DEMO_HOECHSTENS_JE_TAG = 20;

export interface Demoanlageumfeld {
  readonly hof: Arbeiterhof;
  /** Legt den Einsatzordner an und liefert seinen Namen; wirft {@link EINSATZ_DOPPELT}, wenn es ihn gibt. */
  legeOrdnerAn(name: string, datum: string): Promise<string>;
  startdaten(ordner: string): Omit<Startdaten, "akteId">;
  protokolliere(stufe: "info" | "warnung", text: string): void;
  /** Die Uhr des Rechners; in Tests gestellt. */
  jetztMs(): number;
}

/** Der Ordner des Demo-Einsatzes; gibt es am selben Tag schon einen, bekommt der neue eine laufende Nummer. */
async function legeDemoOrdnerAn(umfeld: Demoanlageumfeld, datum: string): Promise<string> {
  for (let nummer = 1; nummer <= DEMO_HOECHSTENS_JE_TAG; nummer += 1) {
    try {
      return await umfeld.legeOrdnerAn(nummer === 1 ? DEMO_NAME : `${DEMO_NAME} ${String(nummer)}`, datum);
    } catch (fehler) {
      if (!(fehler instanceof Error) || fehler.message !== EINSATZ_DOPPELT) throw fehler;
    }
  }
  throw new Error(`Für diesen Tag gibt es schon ${String(DEMO_HOECHSTENS_JE_TAG)} Demo-Einsätze.`);
}

/** Legt den Ordner an und spielt das Drehbuch ein; liefert den Ordner des fertigen Demo-Einsatzes. */
export async function legeDemoEinsatzAn(umfeld: Demoanlageumfeld): Promise<string> {
  const beginnMs = demoBeginnMs(umfeld.jetztMs());
  const ordner = await legeDemoOrdnerAn(umfeld, demozeit(beginnMs).tag(0));
  const akteId = umfeld.hof.starte({ ...umfeld.startdaten(ordner), demoBeginnMs: beginnMs });
  try {
    await umfeld.hof.frage(akteId, { art: "oeffne" });
    const ergebnis = (await umfeld.hof.frage(akteId, { art: "demoEinspielen" })) as Demoergebnis;
    // Ein Demo-Einsatz mit Lücken bleibt nutzbar; die Lücken stehen im Protokoll.
    for (const fehler of ergebnis.fehler) {
      umfeld.protokolliere("warnung", `Demo-Einsatz: Schritt ${fehler.typ} (Minute ${String(fehler.minute)}) nicht geschrieben: ${fehler.meldung}`);
    }
    umfeld.protokolliere("info", `Demo-Einsatz eingespielt: ${String(ergebnis.schritte)} Schritte`);
  } finally {
    await umfeld.hof.schliesse(akteId);
  }
  return ordner;
}
