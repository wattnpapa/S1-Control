/**
 * Der Demo-Einsatz: das ganze Drehbuch und sein Abspieler.
 *
 * Ein Knopf in der Einsatzauswahl legt einen Einsatz an, der zwölf Stunden
 * vor jetzt beginnt und alles enthält, was die Software kann — damit niemand
 * bei null anfängt, der sie zeigen, ausprobieren oder prüfen will.
 *
 * **Pflicht bei jedem neuen Feature:** Das Drehbuch wird mit erweitert
 * (`AGENTS.md` §13). `demoeinsatz.test.ts` hält das fest — eine Ereignisart
 * des Katalogs, die weder im Drehbuch vorkommt noch dort begründet
 * ausgenommen ist, lässt den Test scheitern.
 *
 * Die Teile:
 * - `demostruktur.ts`   Stammdaten, Abschnitte, Führungsstelle
 * - `demoeinheiten.ts`  die Einheitenliste (Daten, zum Austauschen)
 * - `boegen/`           die Übungsbögen, aus denen die Einheiten entstehen
 * - `demokraefte.ts`    Anmeldung mit Erfassungsbogen, Eintreffen und Verlauf je Einheit
 * - `demofunk.ts`       Rufgruppen, Zuordnung, Funkproben
 * - `demoversorgung.ts` Unterbringung, Verpflegung, Sofortbedarf
 * - `demoverlauf.ts`    Anforderungen, Aufteilung, Änderungen, Tagebuch
 * - `demonachrichten.ts` die Nachrichten, `demonachrichtenweg.ts` ihr Weg durch die Stationen
 * - `demokorrekturen.ts` Korrekturen und Rücknahmen
 */

import type { Bedienergebnis } from "../../kontrakt/index.js";
import type { Aktendienst } from "../aktendienst.js";
import { fachlageschritte } from "./demofachlage.js";
import { funkschritte } from "./demofunk.js";
import { korrekturschritte } from "./demokorrekturen.js";
import { kraefteschritte } from "./demokraefte.js";
import { nachrichtenschritte } from "./demonachrichten.js";
import { abschnittsschritte, einsatzschritte, fuehrungsstellenschritte } from "./demostruktur.js";
import { verlaufsschritte } from "./demoverlauf.js";
import { versorgungsschritte } from "./demoversorgung.js";
import { DEMO_DAUER_MINUTEN, demozeit, type Demoschritt } from "./drehbuch.js";
import type { Stelluhr } from "./stelluhr.js";

/** Der Beginn eines Demo-Einsatzes, der jetzt angelegt wird. */
export function demoBeginnMs(jetztMs: number): number {
  return jetztMs - DEMO_DAUER_MINUTEN * 60_000;
}

/**
 * Das Drehbuch in der Reihenfolge, in der es gespielt wird: nach Minute, bei
 * gleicher Minute in der Reihenfolge der Teile (die Sortierung ist stabil).
 */
export function demoDrehbuch(einsatzId: string, beginnMs: number): Demoschritt[] {
  const zeit = demozeit(beginnMs);
  const schritte = [
    ...einsatzschritte(einsatzId, zeit),
    ...abschnittsschritte(),
    ...fuehrungsstellenschritte(zeit),
    ...kraefteschritte(zeit),
    ...funkschritte(einsatzId, zeit),
    ...versorgungsschritte(einsatzId, zeit),
    ...verlaufsschritte(zeit),
    ...nachrichtenschritte(einsatzId, zeit),
    ...korrekturschritte(zeit),
    ...fachlageschritte(zeit),
  ];
  return schritte
    .map((schritt, stelle) => ({ schritt, stelle }))
    .sort((a, b) => a.schritt.minute - b.schritt.minute || a.stelle - b.stelle)
    .map((eintrag) => eintrag.schritt);
}

/** Ein Schritt, den der Aktendienst nicht geschrieben hat. */
export interface Demofehler {
  readonly minute: number;
  readonly typ: string;
  readonly meldung: string;
}

export interface Demoergebnis {
  readonly schritte: number;
  readonly fehler: readonly Demofehler[];
}

function meldungVon(ergebnis: Bedienergebnis): string {
  return "meldung" in ergebnis ? `${ergebnis.art}: ${ergebnis.meldung}` : ergebnis.art;
}

/** Führt einen Schritt aus; liefert den Fehler, wenn er nichts geschrieben hat. */
async function spiele(dienst: Aktendienst, schritt: Demoschritt): Promise<Demofehler | undefined> {
  if ("tat" in schritt) {
    const meldung = await schritt.tat(dienst);
    return meldung === undefined ? undefined : { minute: schritt.minute, typ: schritt.name, meldung };
  }
  const entwurf = typeof schritt.entwurf === "function" ? schritt.entwurf(dienst.zustand) : schritt.entwurf;
  if (entwurf === undefined) return { minute: schritt.minute, typ: "(Entwurf)", meldung: "Der Schritt hat keinen Entwurf gebaut." };
  const ergebnis = await dienst.bediene(entwurf);
  return ergebnis.art === "geschrieben" ? undefined : { minute: schritt.minute, typ: entwurf.typ, meldung: meldungVon(ergebnis) };
}

/**
 * Spielt das Drehbuch in den geöffneten Aktendienst ein.
 *
 * Vor jedem Schritt wird die Uhr auf seine Minute gestellt und die Stelle der
 * Sitzung gesetzt. Ein Schritt, der abgewiesen wird, hält das Drehbuch nicht
 * an: Ein Demo-Einsatz mit einer Lücke ist brauchbar, ein halber nicht. Die
 * Lücke steht im Ergebnis, und der Test lässt keine zu.
 */
export async function spieleDemoEin(dienst: Aktendienst, uhr: Stelluhr, einsatzId: string): Promise<Demoergebnis> {
  const beginnMs = uhr.zeit();
  const drehbuch = demoDrehbuch(einsatzId, beginnMs);
  const fehler: Demofehler[] = [];
  for (const schritt of drehbuch) {
    uhr.stelle(beginnMs + schritt.minute * 60_000);
    dienst.stellenSetzen(schritt.als?.stellen, schritt.als?.handzeichen);
    const fehlschlag = await spiele(dienst, schritt);
    if (fehlschlag !== undefined) fehler.push(fehlschlag);
  }
  dienst.stellenSetzen(undefined, undefined);
  // Ein Durchlauf, damit die Segmente auf dem Share liegen, bevor der Demo-Arbeiter schließt.
  await dienst.takt();
  return { schritte: drehbuch.length, fehler };
}
