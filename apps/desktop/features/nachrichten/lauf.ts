/**
 * Führt eine Feature-Datei mit den gemeinsamen Schritten aus.
 *
 * Warum alle Schritte über `defineSteps` und keiner im Szenario selbst: Die
 * drei Features teilen ihre Sätze („Wenn die FmZ die Nachricht unter Nummer 1
 * nachweist" steht im Ausgang wie in der Gesprächsnotiz). Ein Satz hat damit
 * genau eine Umsetzung, und ein neues Szenario braucht keinen Code, solange es
 * nur bekannte Sätze benutzt. Fehlt ein Satz, bricht vitest-cucumber schon
 * beim Einsammeln mit dem Wortlaut des Schritts ab.
 */

import { fileURLToPath } from "node:url";

import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";

import "./ausdruecke.js";
import { ablaufschritte } from "./schritte-ablauf.js";
import { pruefschritte } from "./schritte-pruefung.js";
import { schliesseWelt } from "./welt.js";

export async function fuehreAus(datei: string): Promise<void> {
  // Der Pfad gilt relativ zu dieser Datei; alle Features liegen daneben.
  const feature = await loadFeature(fileURLToPath(new URL(datei, import.meta.url)), { language: "de" });
  describeFeature(feature, ({ Background, Scenario, AfterAllScenarios, defineSteps }) => {
    defineSteps(({ Step }) => {
      ablaufschritte(Step);
      pruefschritte(Step);
    });
    AfterAllScenarios(schliesseWelt);
    Background(() => {});
    for (const szenario of feature.scenarii) Scenario(szenario.description, () => {});
  });
}
