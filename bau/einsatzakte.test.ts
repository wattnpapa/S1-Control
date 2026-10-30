/**
 * Die Einsatzakte aus der Oberfläche besteht die Prüfung der Kommandozeile.
 *
 * **Warum das in `bau/` steht.** Die Aussage spannt zwei Ringe: Die Akte
 * entsteht im Worker der Schale (`apps/desktop`), geprüft wird sie mit
 * `s1 akte importiere` und `s1 akte pruefe` (`@s1/cli`). Keines der beiden
 * Pakete darf das andere importieren; ein Test, der beide braucht, gehört
 * deshalb hierher — wie der Gleichstand von Handbuch und Kurzanleitung.
 *
 * `importiere` ist die schärfere Prüfung: Es vergleicht jede Datei mit dem
 * Manifest, packt aus und faltet den ausgepackten Ordner mit demselben
 * Prüflauf wie `pruefe` — samt `zustandsHash` gegen den beim Packen.
 */

import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { fuehreAus } from "@s1/cli";

import { einsatzBeendet } from "../apps/desktop/src/kontrakt/bedienschritte.js";
import {
  EINSATZ_ID,
  grundlage,
  raeumeAuf,
  werkstattMitEinemPlatz,
} from "../apps/desktop/src/worker/pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

describe("Die Einsatzakte aus der Oberfläche", () => {
  it("wird von `s1 akte importiere` und `s1 akte pruefe` angenommen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene(einsatzBeendet(EINSATZ_ID, null, new Date(Date.now() - 60_000).toISOString()));
    await platz.dienst.archiviere(new Date().toISOString());
    const akte = await platz.dienst.erzeugeAkte();

    const ziel = path.join(platz.wurzel, "ausgepackt");
    const importiert = await fuehreAus(["akte", "importiere", akte.pfad, "--ziel", ziel]);
    expect(importiert.text).toContain("zustandsHash stimmt mit dem Export überein");
    expect(importiert.code).toBe(0);

    const geprueft = await fuehreAus(["akte", "pruefe", ziel]);
    expect(geprueft.text).toContain("Ergebnis: in Ordnung.");
    expect(geprueft.code).toBe(0);
  });
});
