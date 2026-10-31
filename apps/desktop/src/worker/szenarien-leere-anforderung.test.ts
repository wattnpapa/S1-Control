/**
 * Regression (Review Runde 2, P0): Eine Anforderung ohne Kennung ließ
 * Einheitentabelle, Tagebuch und Anforderungsliste mit „Cannot read
 * properties of undefined (reading 'wert')“ abstürzen — der ganze Einsatz
 * war unlesbar. Gemessen wird die echte Strecke bis zur Projektion.
 */

import { afterEach, describe, expect, it } from "vitest";

import { anforderungAnlegen } from "../kontrakt/bedienschritte.js";
import { grundlage, raeumeAuf, werkstattMitEinemPlatz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const JETZT = (): string => new Date(Date.now() - 60_000).toISOString();

describe("Anforderung ohne Pflichtangaben", () => {
  it("wird abgewiesen, bevor sie geschrieben wird", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const leer = await platz.dienst.bediene(
      anforderungAnlegen({ anforderungId: "A0", angefordertAm: JETZT() }),
    );
    expect(leer.art).toBe("abgewiesen");
    const nurLeerzeichen = await platz.dienst.bediene(
      anforderungAnlegen({ anforderungId: "A0", vorgeseheneEinheitText: "  ", kennung: " ", angefordertAm: JETZT() }),
    );
    expect(nurLeerzeichen.art).toBe("abgewiesen");
    expect(platz.dienst.zustand.anforderungen["A0"]).toBeUndefined();
  });
});

describe("Anlagen mit leerem Pflichtnamen", () => {
  const jetzt = (): string => new Date(Date.now() - 60_000).toISOString();
  const faelle: readonly (readonly [string, Record<string, unknown>, string])[] = [
    ["AbschnittAngelegt", { abschnittId: "X1", name: "   ", typ: "EINSATZORT", reihenfolge: 2 }, "Abschnitt"],
    [
      "EinheitGemeldet",
      {
        einheitId: "X2", abschnittId: "EO", bezeichnung: " ", organisation: "THW", ebene: "GRUPPE",
        staerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 1 }, personalErfassung: "NUR_STAERKE",
        status: "IM_EINSATZ", hierarchie: [], reihenfolge: 0, istFuehrungDesAbschnitts: false,
      },
      "Einheit",
    ],
    ["EtbEintragErfasst", { etbId: "X3", zeitpunkt: jetzt(), text: "  " }, "Tagebucheintrag"],
    ["AuftragErfasst", { auftragId: "X4", einheitId: "U1", von: jetzt(), text: " ", quelle: "MANUELL" }, "Auftrag"],
  ];

  it.each(faelle)("weist %s ohne Namen ab, bevor es geschrieben wird", async (typ, nutzlast, wort) => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const ergebnis = await platz.dienst.bediene({ typ, nutzlast });
    expect(ergebnis.art).toBe("abgewiesen");
    if (ergebnis.art === "abgewiesen") expect(ergebnis.meldung).toContain(wort);
  });
});

