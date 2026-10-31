import { describe, expect, it } from "vitest";

import { ereignisMitObjekt, ereignisname, meldungsklartext } from "./Ereignisnamen.js";

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

  it("nennt die Zusage einer Anforderung nicht „Ablösung“", () => {
    expect(ereignisMitObjekt("AbloesungZugesagt", "ANF-1")).toBe("Zusage ‚ANF-1‘ erfasst");
  });

  it("zeigt für keine Art des Katalogs einen CamelCase-Namen", () => {
    for (const art of ["EinheitZusammengefuehrt", "AbschnittUmgehaengt", "EtbEintragErfasst", "KostenParameterGeaendert"]) {
      expect(ereignisname(art), art).not.toMatch(/[a-zäöü][A-Z]/u);
    }
  });
});

describe("meldungsklartext", () => {
  it("setzt bekannte Ereignisnamen in Worte und lässt Paragrafenverweise weg", () => {
    expect(meldungsklartext("EinheitZusammengefuehrt braucht einen Grund (§2.4).")).toBe(
      "„Einheit zusammengeführt“ braucht einen Grund.",
    );
    expect(meldungsklartext("StatusGesetzt ist nach §6 U2 nicht rücknehmbar.")).toBe(
      "„Status der Einheit geändert“ ist nicht rücknehmbar.",
    );
  });

  it("lässt Unbekanntes und gewöhnlichen Text unverändert", () => {
    expect(meldungsklartext("Nicht gespeichert – Verbindung unterbrochen.")).toBe(
      "Nicht gespeichert – Verbindung unterbrochen.",
    );
    expect(meldungsklartext("GibtEsNicht")).toBe("GibtEsNicht");
  });
});
