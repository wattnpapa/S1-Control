import { describe, expect, it } from "vitest";

import { ereignisMitObjekt, ereignisname } from "./Ereignisnamen.js";

describe("Ereignisnamen", () => {
  it("übersetzt interne Vorgangsnamen ins Deutsche", () => {
    expect(ereignisname("EinheitEntfernt")).toBe("Einheit entfernt");
    expect(ereignisname("AbschnittAufgeloest")).toBe("Abschnitt aufgelöst");
    expect(ereignisname("EinsatzBeendet")).toBe("Einsatz beendet");
  });

  it("setzt den Namen des Gegenstands in die Mitte", () => {
    expect(ereignisMitObjekt("EinheitEntfernt", "TZ")).toBe("Einheit ‚TZ‘ entfernt");
    expect(ereignisMitObjekt("AbschnittAngelegt", "Zug A")).toBe("Abschnitt ‚Zug A‘ angelegt");
  });

  it("fällt ohne Namen auf den Vorgang allein zurück und zeigt nie den internen Namen einer bekannten Art", () => {
    expect(ereignisMitObjekt("EinheitEntfernt", undefined)).toBe("Einheit entfernt");
    expect(ereignisMitObjekt("EinheitEntfernt", "")).toBe("Einheit entfernt");
  });

  it("nutzt für Arten ohne eigene Benennung den Tagebuchtext", () => {
    expect(ereignisMitObjekt("SchichtGesetzt", "TZ")).toBe("Schicht gesetzt (‚TZ‘)");
    expect(ereignisname("GibtEsNicht")).toBe("GibtEsNicht");
  });
});
