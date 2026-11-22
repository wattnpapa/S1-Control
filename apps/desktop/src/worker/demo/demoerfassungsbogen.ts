/**
 * Demo-Einsatz: der Erfassungsbogen.
 *
 * Ein Trupp meldet sich am Meldekopf mit seinem elektronischen
 * Erfassungsbogen an. Der Bogen geht denselben Weg wie die PDF der
 * Erfassungsbogen-App: `eebDatei` liest ihn ein, `eebUebernehmen` legt die
 * Einheit mit Personen, Fahrzeug und Sofortbedarf an. Danach arbeitet der
 * Trupp, rückt ab und wird archiviert — die Meldung bleibt im Eingangskorb.
 *
 * Die Kennung der Einheit vergibt die Übernahme (aus dem Fingerabdruck des
 * Bogens); die späteren Schritte lesen sie deshalb erst beim Abspielen.
 */

import { ARCHIV_ABSCHNITT_ID, type Zustand } from "@s1/domaene";

import { meldeStatusGesetzt } from "../../kontrakt/bedienschritte.js";
import { rufgruppeDerEinheit } from "../../kontrakt/funkschritte.js";
import type { Entwurf } from "../../kontrakt/index.js";
import { RG } from "./demofunk.js";
import { AB } from "./demostruktur.js";
import { STELLE, schrittAls, type Demoschritt, type Demozeit } from "./drehbuch.js";
import { zelle } from "./zelle.js";

/** Die Epoche des Erfassungsbogens: Minuten bzw. Tage seit dem 1. Januar 2020 (`@bos/eeb-format`, `model.ts`). */
const EEB_EPOCHE_MS = Date.UTC(2020, 0, 1);

/** Der Bogen des Trupps Unbemannte Luftfahrtsysteme — in der Form, die die Erfassungsbogen-App schreibt. */
function bogenTruppUl(standMs: number): Record<string, unknown> {
  const tag = Math.floor((standMs - EEB_EPOCHE_MS) / 86_400_000);
  const person = (vorname: string, nachname: string, staerkeRolle: number, funktionen: readonly number[]): Record<string, unknown> => ({
    vorname, nachname, staerkeRolle, funktionen: funktionen.map((code) => ({ code })), fahrerlaubnis: 9, geschlecht: 0, ernaehrung: 0, kontakte: [], zusatzqualifikationen: [],
  });
  return {
    schemaVersion: 10,
    uebung: true,
    stand: Math.round((standMs - EEB_EPOCHE_MS) / 60_000),
    einheit: {
      organisation: 1,
      einheitsTyp: { code: 22 },
      hierarchie: [
        { bezeichnung: { code: 1 }, name: "Cloppenburg", kurz: "OCLP" },
        { bezeichnung: { code: 2 }, name: "Oldenburg" },
        { bezeichnung: { code: 3 }, name: "Bremen, Niedersachsen" },
      ],
    },
    einsatz: { zeitraumVon: tag, zeitraumBis: tag + 1, ortAuftrag: "Hochwasser Hunte — Luftbilderkundung der Deichlinie" },
    personalErfassung: 0,
    personal: [
      person("Marco", "Thoben", 1, [4]),
      person("Erik", "Wübbeler", 0, [5, 82]),
      person("Lars", "Bahlmann", 0, [5]),
      person("Hannes", "Kalvelage", 0, [5]),
    ],
    fahrzeuge: [{ typ: { code: 23 }, stanKonform: true, kennzeichen: "THW-81321", funkrufname: { kennwort: { code: 1 }, eigenerStandort: true, teile: [76, 25] } }],
    sofortbedarf: { verpflegungPersonen: 4, dieselLiter: 30, benzinLiter: 0, gemischLiter: 0, unterbringung: false, ruhezeitErforderlich: false },
  };
}

export function erfassungsbogenschritte(zeit: Demozeit): Demoschritt[] {
  let einheitId: string | undefined;
  const fuerEinheit = (bau: (id: string, zustand: Zustand) => Entwurf | undefined) => (zustand: Zustand): Entwurf | undefined =>
    einheitId === undefined ? undefined : bau(einheitId, zustand);
  const status = (neu: string) => fuerEinheit((id, zustand) => zelle("status", id, zustand.einheiten[id]?.status.wert ?? null, neu));
  return [
    {
      minute: 232,
      als: STELLE.s1,
      name: "Erfassungsbogen übernehmen",
      tat: async (dienst) => {
        const stand = await dienst.eebDatei([JSON.stringify(bogenTruppUl(zeit.beginnMs + 230 * 60_000))]);
        if (stand.art !== "vollstaendig") return `Der Bogen wurde nicht gelesen: ${stand.meldung ?? stand.art}`;
        const ergebnis = await dienst.eebUebernehmen(AB.erkundung);
        if (ergebnis.art !== "uebernommen") return ergebnis.meldung;
        einheitId = ergebnis.einheitId;
        return undefined;
      },
    },
    schrittAls(STELLE.s1, 234, status("IM_EINSATZ")),
    schrittAls(STELLE.ldf, 235, fuerEinheit((id) => rufgruppeDerEinheit(id, null, RG.erkundung))),
    schrittAls(STELLE.s3, 396, status("RUECKMARSCH")),
    schrittAls(STELLE.s1, 398, (zustand) => {
      const [meldungId, meldung] = Object.entries(zustand.meldungen)[0] ?? [];
      return meldungId === undefined ? undefined : meldeStatusGesetzt(meldungId, meldung?.meldeStatus?.wert ?? null, "ABGERUECKT");
    }),
    // Abgerückt und abgeschlossen: Die Einheit wandert ins Archiv und zählt nicht mehr.
    schrittAls(STELLE.s1, 410, fuerEinheit((id, zustand) => ({
      typ: "EinheitArchiviert",
      nutzlast: { einheitId: id },
      vorher: zustand.einheiten[id]?.abschnittId.wert ?? null,
      neu: ARCHIV_ABSCHNITT_ID,
    }))),
  ];
}
