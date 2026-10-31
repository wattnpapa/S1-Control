/**
 * Prüffälle zu den Klartextsätzen des Tagebuchs: Namen statt Kennungen,
 * keine „Ablösung“ ohne Ablösung, keine Roh-Ids.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import {
  abschnittAngelegt,
  anlageEreignis,
  einheitGemeldet,
  einheitVerschoben,
  einsatzAngelegt,
  feldEreignis,
  hlc,
  staerke,
} from "../pruefhilfen/ereignisbau.js";
import { tagebuchzeile } from "./tagebuch.js";

const GRUNDLAGE = [
  einsatzAngelegt(hlc(1, 0, "a"), 1, {
    einsatzId: "E1",
    name: "Hochwasser",
    art: "EINSATZ",
    fuestName: "FüSt 1",
    beginn: "2026-09-08T08:00:00+02:00",
    schichtmodell: "ZWEI_SCHICHT",
  }),
  abschnittAngelegt(hlc(2, 0, "a"), 2, { abschnittId: "A-3e717cb960bc", name: "EA Nord", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
  einheitGemeldet(hlc(3, 0, "a"), 3, {
    einheitId: "U1",
    abschnittId: "A-3e717cb960bc",
    bezeichnung: "TZ",
    organisation: "THW",
    ebene: "ZUG",
    staerke: staerke(1, 2, 9),
    personalErfassung: "NUR_STAERKE",
    status: "ANMARSCH",
  }),
];

function satz(ereignis: EingehendesEreignis, weitere: readonly EingehendesEreignis[] = []): string {
  const zustand = materialisiere(falteHinzu(leereFaltung(), [...GRUNDLAGE, ...weitere]));
  return tagebuchzeile(zustand, ereignis).satz;
}

describe("Tagebuch in Klartext", () => {
  it("nennt bei einer Verschiebung Abschnittsnamen und nie eine Roh-Id", () => {
    const verschoben = einheitVerschoben(hlc(4, 0, "a"), 4, "U1", "A-3e717cb960bc", "EINGANG");
    expect(satz(verschoben)).toBe("TZ: Einheit verschoben: EA Nord → Eingang");
    const unbekannt = einheitVerschoben(hlc(5, 0, "a"), 5, "U1", "EINGANG", "A-ffffffffffff");
    expect(satz(unbekannt)).not.toMatch(/A-ffff/);
  });

  it("schreibt Entfernen ohne „(leer) → ja“", () => {
    const entfernt = feldEreignis(hlc(4, 0, "a"), 4, "EinheitEntfernt", { einheitId: "U1" }, null, true, "Doppelt erfasst");
    expect(satz(entfernt)).toBe("TZ: Einheit entfernt");
  });

  it("nennt beim Auflösen den Zielabschnitt beim Namen", () => {
    const aufgeloest = feldEreignis(hlc(4, 0, "a"), 4, "AbschnittAufgeloest", { abschnittId: "A-3e717cb960bc" }, null, {
      zielAbschnittId: "EINGANG",
    });
    expect(satz(aufgeloest)).toBe("EA Nord: Abschnitt aufgelöst — Einheiten gehen nach Eingang");
  });

  it("spricht bei einer Zusage ohne Ablösung nicht von Ablösung", () => {
    const anlage = anlageEreignis(hlc(4, 0, "a"), 4, "AnforderungAngelegt", {
      anforderungId: "anf-mvw0i02k-xzqarb",
      vorgeseheneEinheitText: "BGr Varel",
      angefordertAm: "2026-09-08T08:00:00+02:00",
    });
    const zusage = feldEreignis(hlc(5, 0, "a"), 5, "AbloesungZugesagt", { anforderungId: "anf-mvw0i02k-xzqarb" }, null, {
      zugesagtFuer: "2026-09-08T18:00:00+02:00",
      zugesagtVon: "THW RB",
    });
    const erledigt = feldEreignis(hlc(6, 0, "a"), 6, "AnforderungErledigt", { anforderungId: "anf-mvw0i02k-xzqarb" }, null, {
      erledigtAm: "2026-09-08T19:00:00+02:00",
      abloesendeEinheitId: "U1",
    });
    expect(satz(anlage, [anlage])).toBe("Anforderung (BGr Varel): angelegt — vorgesehen: BGr Varel");
    expect(satz(zusage, [anlage])).toMatch(/^Anforderung \(BGr Varel\): Zusage erfasst/);
    expect(satz(erledigt, [anlage])).toMatch(/— als Einheit TZ$/);
    expect(satz(erledigt, [anlage])).not.toMatch(/anf-mvw0/);
  });
});
