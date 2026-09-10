/**
 * Der Undo-Stapel gegen KONZEPT-EREIGNISSE.md §6, U1 bis U6.
 *
 * Die Prüffälle T61 bis T67 stehen dort namentlich; wo ein Test einen von
 * ihnen abdeckt, ist er im Namen genannt. T61 (der Fold hat keinen Sonderpfad)
 * liegt nicht hier, sondern in `fold-undo.test.ts` — er ist eine Aussage über
 * den Fold, nicht über den Stapel.
 */

import { describe, expect, it } from "vitest";

import { falte } from "./fold.js";
import type { EingehendesEreignis } from "./fold.js";
import {
  UNDO_TIEFE,
  Undostapel,
  geltenderFeldwert,
  kompensationFuer,
} from "./undo.js";
import {
  abschnittAngelegt,
  akteur,
  einheitGemeldet,
  einheitVerschoben,
  hlc,
  staerke,
  statusGesetzt,
} from "./pruefhilfen/ereignisbau.js";
import { SCHEMA_VERSION, ereignisId } from "./ereignis.js";

/** Grundlage aller Tests: ein Abschnitt und eine Einheit darin, beide von `aa`. */
function grundlage(): EingehendesEreignis[] {
  return [
    abschnittAngelegt(hlc(10, 0, "aa"), 1, {
      abschnittId: "EO",
      name: "Einsatzort",
      abschnittstyp: "EINSATZORT",
      reihenfolge: 1,
    }),
    einheitGemeldet(hlc(20, 0, "aa"), 2, {
      einheitId: "U1",
      abschnittId: "EO",
      bezeichnung: "Bergungsgruppe",
      organisation: "THW",
      ebene: "GRUPPE",
      staerke: staerke(0, 1, 8),
      personalErfassung: "VOLLSTAENDIG",
      status: "IM_EINSATZ",
    }),
  ];
}

/** Eine Kompensation, wie ein Schreiber sie aus einem Entwurf machen würde. */
function alsEreignis(
  entwurf: { typ: string; nutzlast: unknown; neu: unknown; vorher?: unknown; undoOf: string; grund?: string },
  h: ReturnType<typeof hlc>,
  laufnummer: number,
): EingehendesEreignis {
  return {
    id: ereignisId(h.clientId, laufnummer),
    hlc: h,
    schemaVersion: SCHEMA_VERSION,
    akteur: akteur(h.clientId),
    wanduhr: new Date(Date.parse("2026-09-08T08:00:00+02:00") + h.millisekunden).toISOString(),
    typ: entwurf.typ,
    nutzlast: entwurf.nutzlast,
    neu: entwurf.neu,
    ...(entwurf.vorher === undefined ? {} : { vorher: entwurf.vorher }),
    undoOf: entwurf.undoOf,
    ...(entwurf.grund === undefined ? {} : { grund: entwurf.grund }),
  };
}

describe("U3 — der Stapel ist je Client und wird abgeleitet", () => {
  it("führt nur eigene Ereignisse (T63)", () => {
    const stapel = new Undostapel("aa");
    stapel.nimmAlleAuf([
      ...grundlage(),
      statusGesetzt(hlc(30, 0, "bb"), 1, "U1", "IM_EINSATZ", "RUHE"),
    ]);
    const ids = stapel.eintraege.map((e) => e.id);
    expect(ids.every((id) => id.startsWith("aa"))).toBe(true);
    expect(stapel.eintraege).toHaveLength(2);
  });

  it("nimmt ein Ereignis vom Stapel, sobald ein fremder Client es kompensiert (T62)", () => {
    const stapel = new Undostapel("aa");
    const eigen = statusGesetzt(hlc(30, 0, "aa"), 3, "U1", "IM_EINSATZ", "RUHE");
    stapel.nimmAlleAuf([...grundlage(), eigen]);
    expect(stapel.oberster()?.id).toBe(eigen.id);

    const durchB = alsEreignis(
      { typ: "StatusGesetzt", nutzlast: { einheitId: "U1" }, neu: "IM_EINSATZ", vorher: "RUHE", undoOf: eigen.id },
      hlc(40, 0, "bb"),
      1,
    );
    stapel.nimmAuf(durchB);
    expect(stapel.eintraege.map((e) => e.id)).not.toContain(eigen.id);
  });

  it("ordnet nach HLC und bei Gleichstand nach Ereignis-Id (§3.5)", () => {
    const stapel = new Undostapel("aa");
    const frueh = statusGesetzt(hlc(30, 0, "aa"), 3, "U1", "IM_EINSATZ", "RUHE");
    const spaet = statusGesetzt(hlc(31, 0, "aa"), 4, "U1", "RUHE", "IM_EINSATZ");
    stapel.nimmAlleAuf([...grundlage(), frueh, spaet]);
    expect(stapel.oberster()?.id).toBe(spaet.id);
  });

  it("hält höchstens zwanzig Einträge (Startwert S4)", () => {
    const stapel = new Undostapel("aa");
    stapel.nimmAlleAuf(grundlage());
    for (let i = 0; i < 30; i += 1) {
      stapel.nimmAuf(statusGesetzt(hlc(100 + i, 0, "aa"), 10 + i, "U1", "RUHE", "IM_EINSATZ"));
    }
    expect(stapel.eintraege).toHaveLength(UNDO_TIEFE);
    expect(UNDO_TIEFE).toBe(20);
  });

  it("lässt den nächstälteren nachrücken, wenn der oberste kompensiert wird", () => {
    // Der Grund, aus dem der Stapel **alle** eigenen Ereignisse behält und
    // nicht bloß zwanzig: Ein Ring der Länge zwanzig hätte den Nachrücker
    // bereits vergessen.
    const stapel = new Undostapel("aa");
    stapel.nimmAlleAuf(grundlage());
    const geschrieben: EingehendesEreignis[] = [];
    for (let i = 0; i < 25; i += 1) {
      const e = statusGesetzt(hlc(100 + i, 0, "aa"), 10 + i, "U1", "RUHE", "IM_EINSATZ");
      geschrieben.push(e);
      stapel.nimmAuf(e);
    }
    const zwanzigsteAeltere = geschrieben[4] as EingehendesEreignis;
    expect(stapel.eintraege.map((e) => e.id)).not.toContain(zwanzigsteAeltere.id);

    // Alle zwanzig sichtbaren kompensieren — dann steht der vorher
    // abgeschnittene wieder im Stapel.
    for (const [i, sichtbar] of stapel.eintraege.entries()) {
      stapel.nimmAuf(
        alsEreignis(
          { typ: "StatusGesetzt", nutzlast: { einheitId: "U1" }, neu: "RUHE", undoOf: sichtbar.id },
          hlc(300 + i, 0, "aa"),
          200 + i,
        ),
      );
    }
    expect(stapel.eintraege.map((e) => e.id)).toContain(zwanzigsteAeltere.id);
  });
});

describe("U5 — Redo gibt es nicht", () => {
  it("legt eine Kompensation nicht selbst auf den Stapel", () => {
    const stapel = new Undostapel("aa");
    const eigen = statusGesetzt(hlc(30, 0, "aa"), 3, "U1", "IM_EINSATZ", "RUHE");
    stapel.nimmAlleAuf([...grundlage(), eigen]);
    const zurueck = alsEreignis(
      { typ: "StatusGesetzt", nutzlast: { einheitId: "U1" }, neu: "IM_EINSATZ", vorher: "RUHE", undoOf: eigen.id },
      hlc(40, 0, "aa"),
      4,
    );
    stapel.nimmAuf(zurueck);
    expect(stapel.eintraege.map((e) => e.id)).not.toContain(zurueck.id);
  });

  it("weist die Rücknahme einer Rücknahme ab", () => {
    const zustand = falte(grundlage());
    const zurueck = alsEreignis(
      { typ: "StatusGesetzt", nutzlast: { einheitId: "U1" }, neu: "IM_EINSATZ", undoOf: "aa-0000000003" },
      hlc(40, 0, "aa"),
      4,
    );
    expect(kompensationFuer(zurueck, zustand)).toEqual({
      art: "nichtMoeglich",
      meldung: "Ein Redo gibt es nicht (§6 U5).",
    });
  });
});

describe("U2 — was rückgängig gemacht werden kann, ist typabhängig", () => {
  it("nimmt ein setzendes Ereignis mit derselben Art und `neu = vorher` zurück", () => {
    const ereignisse = grundlage();
    const gesetzt = statusGesetzt(hlc(30, 0, "aa"), 3, "U1", "IM_EINSATZ", "RUHE");
    const zustand = falte([...ereignisse, gesetzt]);
    const ergebnis = kompensationFuer(gesetzt, zustand);
    expect(ergebnis.art).toBe("entwurf");
    if (ergebnis.art !== "entwurf") return;
    expect(ergebnis.entwurf).toMatchObject({
      typ: "StatusGesetzt",
      nutzlast: { einheitId: "U1" },
      neu: "IM_EINSATZ",
      // Auflage 6: der **geltende** Wert, nicht der, den das Original sah.
      vorher: "RUHE",
      undoOf: gesetzt.id,
    });
  });

  it("nimmt eine Verschiebung mit dem Ausgangsabschnitt zurück", () => {
    const ereignisse = [
      ...grundlage(),
      abschnittAngelegt(hlc(11, 0, "aa"), 9, {
        abschnittId: "BR",
        name: "Bereitstellungsraum",
        abschnittstyp: "BEREITSTELLUNGSRAUM",
        reihenfolge: 2,
      }),
    ];
    const verschoben = einheitVerschoben(hlc(30, 0, "aa"), 3, "U1", "EO", "BR");
    const zustand = falte([...ereignisse, verschoben]);
    const ergebnis = kompensationFuer(verschoben, zustand);
    expect(ergebnis.art).toBe("entwurf");
    if (ergebnis.art !== "entwurf") return;
    expect(ergebnis.entwurf.neu).toBe("EO");
    expect(ergebnis.entwurf.vorher).toBe("BR");
    // §3.2: Der Fold rechnet danach mit dem Ausgangsabschnitt.
    const danach = falte([...ereignisse, verschoben, alsEreignis({ ...ergebnis.entwurf }, hlc(40, 0, "aa"), 4)]);
    expect(danach.einheiten["U1"]?.wirksamerAbschnittId).toBe("EO");
  });

  it("nimmt eine Anlage über ihr Gegenereignis zurück und verlangt dessen Grund (§2.4)", () => {
    const ereignisse = grundlage();
    const anlage = ereignisse[1] as EingehendesEreignis;
    const zustand = falte(ereignisse);

    expect(kompensationFuer(anlage, zustand)).toEqual({
      art: "brauchtGrund",
      zielArt: "EinheitEntfernt",
    });

    const ergebnis = kompensationFuer(anlage, zustand, "Doppelmeldung");
    expect(ergebnis.art).toBe("entwurf");
    if (ergebnis.art !== "entwurf") return;
    expect(ergebnis.entwurf).toMatchObject({
      typ: "EinheitEntfernt",
      nutzlast: { einheitId: "U1" },
      // `festerWert` der Zielart, nicht das `vorher` des Originals.
      neu: true,
      grund: "Doppelmeldung",
    });
    const danach = falte([...ereignisse, alsEreignis({ ...ergebnis.entwurf }, hlc(40, 0, "aa"), 4)]);
    expect(danach.einheiten["U1"]?.entfernt?.wert).toBe(true);
  });

  it("nimmt einen angelegten Abschnitt über AbschnittAufgeloest zurück", () => {
    const ereignisse = grundlage();
    const anlage = ereignisse[0] as EingehendesEreignis;
    const ergebnis = kompensationFuer(anlage, falte(ereignisse));
    expect(ergebnis.art).toBe("entwurf");
    if (ergebnis.art !== "entwurf") return;
    expect(ergebnis.entwurf.typ).toBe("AbschnittAufgeloest");
    expect(ergebnis.entwurf.nutzlast).toEqual({ abschnittId: "EO" });
  });

  it("meldet die strukturellen Arten als eigenen Fachvorgang", () => {
    const aufgeteilt: EingehendesEreignis = {
      id: ereignisId("aa", 7),
      hlc: hlc(50, 0, "aa"),
      schemaVersion: SCHEMA_VERSION,
      akteur: akteur("aa"),
      wanduhr: "2026-09-08T08:00:50.000Z",
      typ: "EinheitAufgeteilt",
      nutzlast: { neueEinheitId: "U2", quellEinheitId: "U1" },
    };
    const ergebnis = kompensationFuer(aufgeteilt, falte(grundlage()));
    expect(ergebnis.art).toBe("strukturell");
    if (ergebnis.art !== "strukturell") return;
    expect(ergebnis.inverseArt).toBe("EinheitZusammengefuehrt");
  });

  it("weist die sechs nicht rücknehmbaren Arten ab", () => {
    const zustand = falte(grundlage());
    for (const typ of [
      "EinsatzAngelegt",
      "EinsatzArchiviert",
      "EebMeldungEmpfangen",
      "EtbEintragErfasst",
      "EtbEintragBerichtigt",
      "KorrekturVon",
    ]) {
      const ereignis: EingehendesEreignis = {
        id: ereignisId("aa", 9),
        hlc: hlc(60, 0, "aa"),
        schemaVersion: SCHEMA_VERSION,
        akteur: akteur("aa"),
        wanduhr: "2026-09-08T08:01:00.000Z",
        typ,
        nutzlast: {},
      };
      expect(kompensationFuer(ereignis, zustand).art, typ).toBe("nichtMoeglich");
    }
  });

  it("lässt keine dieser Arten auf den Stapel", () => {
    const stapel = new Undostapel("aa");
    for (const typ of ["EinsatzAngelegt", "EinsatzArchiviert", "KorrekturVon"]) {
      stapel.nimmAuf({
        id: ereignisId("aa", 9),
        hlc: hlc(60, 0, "aa"),
        schemaVersion: SCHEMA_VERSION,
        akteur: akteur("aa"),
        wanduhr: "2026-09-08T08:01:00.000Z",
        typ,
        nutzlast: {},
      });
    }
    expect(stapel.eintraege).toHaveLength(0);
  });
});

describe("U6 — Undo gegen Fremdänderung", () => {
  it("gewinnt bei höherer HLC und erzeugt undoTrifftFremdenStand (T64, T65)", () => {
    const ereignisse = grundlage();
    const vonA = statusGesetzt(hlc(50, 0, "aa"), 3, "U1", "IM_EINSATZ", "RUHE");
    const vonB = statusGesetzt(hlc(70, 0, "bb"), 1, "U1", "RUHE", "ANGEFORDERT");

    // A sieht beide und nimmt seines zurück.
    const zustand = falte([...ereignisse, vonA, vonB]);
    const ergebnis = kompensationFuer(vonA, zustand);
    expect(ergebnis.art).toBe("entwurf");
    if (ergebnis.art !== "entwurf") return;
    // Der gesehene Vorher-Wert ist der **fremde** Stand, nicht der eigene.
    expect(ergebnis.entwurf.vorher).toBe("ANGEFORDERT");

    const zurueck = alsEreignis({ ...ergebnis.entwurf }, hlc(90, 0, "aa"), 4);
    const danach = falte([...ereignisse, vonA, vonB, zurueck]);
    expect(danach.einheiten["U1"]?.status.wert).toBe("IM_EINSATZ");
    expect(danach.hinweise.some((h) => h.art === "undoTrifftFremdenStand")).toBe(true);

    // T65: Ein viertes Ereignis verdrängt den Undo — der Hinweis fällt weg.
    const viertes = statusGesetzt(hlc(110, 0, "bb"), 2, "U1", "IM_EINSATZ", "RUHE");
    const zuletzt = falte([...ereignisse, vonA, vonB, zurueck, viertes]);
    expect(zuletzt.hinweise.some((h) => h.art === "undoTrifftFremdenStand")).toBe(false);
  });
});

describe("geltenderFeldwert", () => {
  it("liest ein festes Feld einer Entität", () => {
    const zustand = falte(grundlage());
    expect(geltenderFeldwert(zustand, "einheit", "U1", "status")).toBe("IM_EINSATZ");
  });

  it("unterscheidet ungesetzt von gelöscht", () => {
    const zustand = falte(grundlage());
    // Die Bemerkung wurde nie gesetzt — sie ist ungesetzt, nicht null.
    expect(geltenderFeldwert(zustand, "einheit", "U1", "bemerkung")).toBeUndefined();
  });

  it("liest einen Unterpfad", () => {
    const zustand = falte([
      ...grundlage(),
      {
        id: ereignisId("aa", 8),
        hlc: hlc(40, 0, "aa"),
        schemaVersion: SCHEMA_VERSION,
        akteur: akteur("aa"),
        wanduhr: "2026-09-08T08:00:40.000Z",
        typ: "LogistikGesetzt",
        nutzlast: { einheitId: "U1", feld: "uebernachtungM" },
        neu: 9,
      },
    ]);
    expect(geltenderFeldwert(zustand, "einheit", "U1", "logistik/uebernachtungM")).toBe(9);
  });

  it("gibt für eine unbekannte Entität undefined", () => {
    const zustand = falte(grundlage());
    expect(geltenderFeldwert(zustand, "einheit", "gibtEsNicht", "status")).toBeUndefined();
  });
});
