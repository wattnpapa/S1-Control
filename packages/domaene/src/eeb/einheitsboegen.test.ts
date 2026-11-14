/**
 * Welcher Erfassungsbogen zu welcher gewählten Einheit gehört.
 *
 * Der Zustand wird hier von Hand gebaut und nicht gefaltet: Geprüft wird die
 * Zuordnung, nicht der Fold. Den ganzen Weg über die Akte misst
 * `apps/desktop/src/worker/szenarien-eeb.test.ts`.
 */

import { describe, expect, it } from "vitest";

import type { Zustand } from "../zustand.js";
import { boegenDerEinheiten } from "./einheitsboegen.js";

function feld<T>(wert: T): { wert: T } {
  return { wert };
}

function einheit(id: string, bezeichnung: string, meldungId?: string): unknown {
  return { id, bezeichnung: feld(bezeichnung), ...(meldungId === undefined ? {} : { meldungId: feld(meldungId) }) };
}

interface Meldungsangabe {
  readonly id: string;
  readonly stand: string;
  readonly einheitId?: string | null;
  readonly name?: string;
  readonly ohneBogen?: boolean;
}

function meldung({ id, stand, einheitId, name, ohneBogen }: Meldungsangabe): unknown {
  return {
    id,
    stand: feld(stand),
    empfangenAm: feld(stand),
    einheitSchluessel: feld(`schluessel-${id}`),
    meldeStatus: feld("ANWESEND"),
    ...(einheitId === undefined ? {} : { uebernahme: feld(einheitId === null ? null : { einheitId, uebernommeneFelder: [] }) }),
    ...(ohneBogen === true ? {} : { bogen: feld({ einheit: { name: name ?? id } }) }),
  };
}

function zustand(einheiten: unknown[], meldungen: unknown[]): Pick<Zustand, "einheiten" | "meldungen"> {
  const nachId = (liste: unknown[]): Record<string, unknown> =>
    Object.fromEntries(liste.map((eintrag) => [(eintrag as { id: string }).id, eintrag]));
  return { einheiten: nachId(einheiten), meldungen: nachId(meldungen) } as unknown as Pick<Zustand, "einheiten" | "meldungen">;
}

describe("boegenDerEinheiten", () => {
  it("findet den Bogen über die Anlage und über die Übernahme", () => {
    const z = zustand(
      [einheit("E1", "B 1", "M1"), einheit("E2", "FGr N")],
      [meldung({ id: "M1", stand: "2026-09-08T08:00" }), meldung({ id: "M2", stand: "2026-09-08T09:00", einheitId: "E2" })],
    );
    const auswahl = boegenDerEinheiten(z, ["E1", "E2"]);
    expect(auswahl.boegen.map((b) => b.meldungId)).toEqual(["M1", "M2"]);
    expect(auswahl.boegen[0]).toMatchObject({ einheitSchluessel: "schluessel-M1", meldeStatus: "ANWESEND" });
    expect(auswahl.ohneBogen).toEqual([]);
  });

  it("nimmt bei mehreren Fassungen die jüngste", () => {
    const z = zustand(
      [einheit("E1", "B 1", "M1")],
      [
        meldung({ id: "M1", stand: "2026-09-08T08:00", einheitId: "E1" }),
        meldung({ id: "M3", stand: "2026-09-09T07:00", einheitId: "E1" }),
        meldung({ id: "M2", stand: "2026-09-08T20:00", einheitId: "E1" }),
      ],
    );
    expect(boegenDerEinheiten(z, ["E1"]).boegen.map((b) => b.meldungId)).toEqual(["M3"]);
  });

  it("nennt Einheiten ohne Bogen, statt einen zu erfinden", () => {
    const z = zustand(
      [einheit("E1", "B 1", "M1"), einheit("E2", "Von Hand angelegt"), einheit("E3", "Nur Kopf", "M9")],
      [meldung({ id: "M1", stand: "2026-09-08T08:00" }), meldung({ id: "M9", stand: "2026-09-08T08:00", ohneBogen: true })],
    );
    const auswahl = boegenDerEinheiten(z, ["E1", "E2", "E3"]);
    expect(auswahl.boegen).toHaveLength(1);
    expect(auswahl.ohneBogen).toEqual(["Von Hand angelegt", "Nur Kopf"]);
  });

  it("zählt eine zurückgenommene Übernahme nicht", () => {
    const z = zustand([einheit("E1", "B 1")], [meldung({ id: "M1", stand: "2026-09-08T08:00", einheitId: null })]);
    expect(boegenDerEinheiten(z, ["E1"]).ohneBogen).toEqual(["B 1"]);
  });

  it("schreibt einen gemeinsamen Bogen aufgeteilter Einheiten nur einmal", () => {
    const z = zustand([einheit("E1", "B 1", "M1"), einheit("E1b", "B 1 Teil", "M1")], [meldung({ id: "M1", stand: "2026-09-08T08:00" })]);
    expect(boegenDerEinheiten(z, ["E1", "E1b"]).boegen).toHaveLength(1);
  });

  it("übergeht unbekannte Kennungen", () => {
    expect(boegenDerEinheiten(zustand([], []), ["weg"])).toEqual({ boegen: [], ohneBogen: [] });
  });
});
