/**
 * Der Korrekturweg fuer Einheiten, die mit `#3` statt „Zugtrupp Technischer
 * Zug" uebernommen wurden.
 *
 * Die Akte entsteht wie im Betrieb vor der Behebung: `uebernahmeEntwuerfe`
 * mit leeren Tabellen, gefaltet ueber den echten Fold.
 */

import { describe, expect, it } from "vitest";

import { falte, type EingehendesEreignis } from "../fold.js";
import {
  abschnittAngelegt,
  anlageEreignis,
  einsatzAngelegt,
  feldEreignis,
  hlc,
} from "../pruefhilfen/ereignisbau.js";
import { pruefbogen } from "../pruefhilfen/pruefbogen.js";
import type { Zustand } from "../zustand.js";
import { uebernahmeEntwuerfe, type Uebernahmeentwurf } from "./scanner.js";
import { teilIdsAus, vokabelkorrekturen } from "./vokabelkorrektur.js";

const MELDUNG = "M-0123456789abcdef";
const EINHEIT = "E-albstadt";

let laufnummer = 0;

function alsEreignis(entwurf: Uebernahmeentwurf): EingehendesEreignis {
  laufnummer += 1;
  const h = hlc(60_000 + laufnummer, 0, "c1");
  if (!("neu" in entwurf)) return anlageEreignis(h, laufnummer, entwurf.typ, entwurf.nutzlast);
  return feldEreignis(h, laufnummer, entwurf.typ, entwurf.nutzlast, entwurf.vorher, entwurf.neu, entwurf.grund);
}

/** Die Ereignisse einer Uebernahme mit dem Adapter vor der Behebung. */
function fehlerhafteUebernahme(): EingehendesEreignis[] {
  laufnummer = 10;
  const bogen = pruefbogen();
  const entwuerfe = uebernahmeEntwuerfe(bogen, { zustand: "unsigniert" }, {
    meldungId: MELDUNG,
    einheitId: EINHEIT,
    abschnittId: "A-1",
    ...teilIdsAus(MELDUNG, bogen),
    empfangenAm: "2026-09-08T08:30:00.000Z",
    tabellen: {},
  });
  return [
    einsatzAngelegt(hlc(1_000, 0, "c1"), 1, {
      einsatzId: "X-1",
      name: "Prüfeinsatz",
      art: "EINSATZ",
      fuestName: "FüSt",
      beginn: "2026-09-08T08:00:00+02:00",
      schichtmodell: "ZWEI_SCHICHTEN",
    }),
    abschnittAngelegt(hlc(2_000, 0, "c1"), 2, {
      abschnittId: "A-1",
      name: "EA 1",
      abschnittstyp: "EINSATZORT",
      reihenfolge: 0,
    }),
    ...entwuerfe.map(alsEreignis),
  ];
}

function korrigiert(ereignisse: EingehendesEreignis[]): Zustand {
  return falte([...ereignisse, ...vokabelkorrekturen(falte(ereignisse)).map(alsEreignis)]);
}

describe("Vokabularkorrektur übernommener Einheiten", () => {
  it("findet die rohen Codes einer fehlerhaft übernommenen Einheit", () => {
    const zustand = falte(fehlerhafteUebernahme());
    expect(zustand.einheiten[EINHEIT]?.bezeichnung.wert).toBe("#3 Albstadt");

    const felder = vokabelkorrekturen(zustand).map(
      (e) => `${e.typ}:${String((e.nutzlast as { feld: string }).feld)}`,
    );
    expect(felder).toEqual([
      "EinheitStammdatenGeaendert:bezeichnung",
      "EinheitStammdatenGeaendert:hierarchie",
      "EinheitStammdatenGeaendert:ebene",
      "FahrzeugGeaendert:typ",
      "FahrzeugGeaendert:funkrufname",
      "FahrzeugGeaendert:funkrufname",
      "PersonGeaendert:funktionen",
    ]);
  });

  it("setzt nach dem Schreiben Namen statt Codes und hat danach nichts mehr offen", () => {
    const zustand = korrigiert(fehlerhafteUebernahme());
    const einheit = zustand.einheiten[EINHEIT];
    const [fueKw] = teilIdsAus(MELDUNG, pruefbogen()).fahrzeugIds;

    expect(einheit?.bezeichnung.wert).toBe("Zugtrupp Technischer Zug Albstadt");
    expect(einheit?.ebene.wert).toBe("ZUGTRUPP");
    const hierarchie = einheit?.hierarchie?.wert as readonly { art: string }[] | undefined;
    expect(hierarchie?.[0]?.art).toBe("Ortsverband");
    expect(zustand.fahrzeuge[fueKw as string]?.typ.wert).toBe("FüKW");
    expect(zustand.hinweise).toEqual([]);
    expect(vokabelkorrekturen(zustand)).toEqual([]);
  });

  it("lässt eine von Hand geänderte Bezeichnung stehen", () => {
    const ereignisse = fehlerhafteUebernahme();
    ereignisse.push(
      feldEreignis(hlc(90_000, 0, "c2"), 1, "EinheitStammdatenGeaendert",
        { einheitId: EINHEIT, feld: "bezeichnung" }, "#3 Albstadt", "ZTr TZ Albstadt"),
    );
    const offen = vokabelkorrekturen(falte(ereignisse));

    expect(offen.some((e) => (e.nutzlast as { feld: string }).feld === "bezeichnung")).toBe(false);
    expect(offen.some((e) => (e.nutzlast as { feld: string }).feld === "ebene")).toBe(true);
  });

  it("schreibt mit gesehenem Vorher-Wert und nennt die Meldung im Grund", () => {
    const [erste] = vokabelkorrekturen(falte(fehlerhafteUebernahme()));
    expect(erste?.vorher).toBe("#3 Albstadt");
    expect(erste?.grund).toBe(`Vokabularkorrektur EEB ${MELDUNG}`);
  });

  it("findet bei korrekt übernommenen Bögen nichts", () => {
    const bogen = pruefbogen();
    laufnummer = 10;
    const ereignisse = uebernahmeEntwuerfe(bogen, { zustand: "unsigniert" }, {
      meldungId: MELDUNG,
      einheitId: EINHEIT,
      abschnittId: "A-1",
      ...teilIdsAus(MELDUNG, bogen),
      empfangenAm: "2026-09-08T08:30:00.000Z",
    }).map(alsEreignis);
    expect(vokabelkorrekturen(falte([...fehlerhafteUebernahme().slice(0, 2), ...ereignisse]))).toEqual([]);
  });
});
