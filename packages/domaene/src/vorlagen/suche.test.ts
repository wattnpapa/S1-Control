import { describe, expect, it } from "vitest";

import { sucheVorlagen, vorlagenOrganisationen } from "./suche.js";
import { vorlage } from "./index.js";

describe("Vorlagensuche", () => {
  it("findet ohne Filter alle Vorlagen", () => {
    expect(sucheVorlagen({}).length).toBeGreaterThan(80);
  });

  it("sucht in Kurz- und Langbezeichnung, ohne auf Umlaute und Gross-/Kleinschreibung zu achten", () => {
    const treffer = sucheVorlagen({ text: "sanitaet", katalog: "KATS_STAN_NDS" }).map((v) => v.id);
    expect(treffer).toEqual(["kats-z-sb", "kats-z-sb-gr-san"]);
    expect(sucheVorlagen({ text: "FZ bs" }).map((v) => v.id)).toEqual(["kats-fz-bs"]);
  });

  it("findet eine Vorlage unter jedem ihrer Traeger", () => {
    const juh = sucheVorlagen({ organisation: "JUH" }).map((v) => v.id);
    expect(juh).toContain("kats-z-sb");
    expect(juh).not.toContain("fw-loeschzug");
    expect(vorlagenOrganisationen(vorlage("fw-loeschzug") ?? ({} as never))).toEqual(["FEUERWEHR"]);
  });

  it("verbindet Katalog, Organisation und Text", () => {
    const treffer = sucheVorlagen({ katalog: "FEUERWEHR", organisation: "FEUERWEHR", text: "gruppe" });
    expect(treffer.map((v) => v.id)).toEqual(["fw-loeschgruppe"]);
    expect(sucheVorlagen({ katalog: "FEUERWEHR", organisation: "DRK" })).toHaveLength(0);
  });

  describe("Reihenfolge der Treffer", () => {
    const ids = (text: string): string[] => sucheVorlagen({ text }).map((v) => v.id);

    it("stellt das genaue Kürzel vor Teiltreffer in einem anderen Wort", () => {
      const treffer = ids("TZ");
      expect(treffer[0]).toBe("thw-tz");
      expect(treffer.indexOf("thw-lastkraftwagen-1-5-t-nutzlast-mit-ladekran-780-knm")).toBeGreaterThan(1);
    });

    it("stellt „LG“ vor „LGr“ und die Vorlage mit Sollstärke vor die ohne", () => {
      expect(ids("LG").slice(0, 2)).toEqual(["kats-fz-bs-lg", "fw-loeschgruppe"]);
    });

    it("findet das THW-Zugtrupp über die Abkürzungsliste und führt es vor dem Rest", () => {
      const treffer = sucheVorlagen({ text: "Zugtrupp" });
      expect(treffer.some((v) => v.organisation === "THW")).toBe(true);
      expect(treffer.slice(0, 3).every((v) => v.organisation === "THW")).toBe(true);
    });

    it("zeigt dieselbe Vorlage derselben Organisation nur einmal", () => {
      const treffer = sucheVorlagen({ text: "Zugtrupp" }).filter(
        (v) => v.organisation === "FEUERWEHR" && v.lang === "Zugtrupp",
      );
      expect(treffer).toHaveLength(1);
      expect(treffer[0]?.sollStaerke).toBeDefined();
    });

    it("lässt bei gewähltem Katalog nichts weg", () => {
      expect(sucheVorlagen({ text: "Zugtrupp", katalog: "FEUERWEHR" }).map((v) => v.id)).toContain("fw-zugtrupp");
    });
  });
});
