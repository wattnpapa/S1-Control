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
});
