/**
 * Demo-Einsatz: Versorgung — Unterbringung, Verpflegung, Sofortbedarf.
 *
 * Alles, was das Blatt „Versorgung" zeigt: Unterkünfte mit Belegung,
 * Ausgabestellen, die Mahlzeitenregel, Bestellungen (geliefert, offen,
 * storniert) und der Sofortbedarf einzelner Einheiten.
 */

import { MAHLZEITENREGEL_VORBELEGUNG } from "@s1/domaene";

import {
  abschnittAusgabestelle,
  ausgabestelleAnlegen,
  einheitUntergebracht,
  mahlzeitBestellt,
  mahlzeitGeliefert,
  mahlzeitStorniert,
  mahlzeitenregelGesetzt,
  sofortbedarfErledigt,
  sofortbedarfWiederOffen,
  unterbringungAufgehoben,
  unterkunftAnlegen,
  unterkunftAufgeloest,
  unterkunftGeaendert,
  type Bestellanlage,
} from "../../kontrakt/versorgungsschritte.js";
import { AB } from "./demostruktur.js";
import { STELLE, schrittAls, type Demoschritt, type Schrittentwurf, type Demozeit } from "./drehbuch.js";
import { zelle } from "./zelle.js";

const UK = { bbs: "demo-uk-bbs", djh: "demo-uk-djh", zelt: "demo-uk-zelt" } as const;
const AS = { hallen: "demo-as-hallen", sandkrug: "demo-as-sandkrug" } as const;

const s4 = (minute: number, entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s4, minute, entwurf);

function unterbringung(): Demoschritt[] {
  const belegung: readonly (readonly [string, string, number])[] = [
    ["demo-eh-fk-ol", UK.bbs, 200],
    ["demo-eh-b1-ol", UK.bbs, 205],
    ["demo-eh-b-wa", UK.bbs, 206],
    ["demo-eh-b-de", UK.bbs, 207],
    ["demo-eh-n-ol", UK.djh, 210],
    ["demo-eh-wp-ol", UK.djh, 211],
    ["demo-eh-logv", UK.djh, 212],
    ["demo-eh-wp-nh", UK.bbs, 320],
    ["demo-eh-b-we", UK.bbs, 580],
  ];
  return [
    s4(120, unterkunftAnlegen({ unterkunftId: UK.bbs, name: "Sporthalle BBS Wechloy", ort: "Ammerländer Heerstraße, Oldenburg", kapazitaet: 60, bemerkung: "Feldbetten vom DRK, Duschen in der Halle" })),
    s4(121, unterkunftAnlegen({ unterkunftId: UK.djh, name: "Jugendherberge Oldenburg", ort: "Straßburger Straße, Oldenburg", kapazitaet: 36 })),
    s4(122, unterkunftAnlegen({ unterkunftId: UK.zelt, name: "Zeltlager Sandkrug", ort: "Sportplatz Sandkrug", kapazitaet: 40 })),
    s4(180, unterkunftGeaendert(UK.bbs, "kapazitaet", 60, 80)),
    s4(260, unterkunftAufgeloest(UK.zelt, "Sportplatz steht unter Wasser")),
    ...belegung.map(([einheitId, unterkunftId, minute]) => s4(minute, einheitUntergebracht(einheitId, null, unterkunftId))),
    // Eine Umquartierung: aufgehoben und neu zugewiesen.
    s4(450, unterbringungAufgehoben("demo-eh-logv", UK.djh)),
    s4(451, einheitUntergebracht("demo-eh-logv", null, UK.bbs)),
  ];
}

function bestellungen(zeit: Demozeit): Demoschritt[] {
  const bestellt = (minute: number, anlage: Omit<Bestellanlage, "datum" | "bestelltVon">, fuerMinute: number): Demoschritt =>
    s4(minute, mahlzeitBestellt({ ...anlage, datum: zeit.tag(fuerMinute), bestelltVon: "S4 Klaassen" }));
  return [
    bestellt(60, { bestellungId: "demo-be-1", mahlzeit: "MITTAG", ausgabestelleId: AS.hallen, portionen: 110, vegetarisch: 12, vegan: 3, bestelltBei: "FGr Log-V OV Wilhelmshaven" }, 240),
    bestellt(61, { bestellungId: "demo-be-2", mahlzeit: "MITTAG", ausgabestelleId: AS.sandkrug, portionen: 45, vegetarisch: 5, vegan: 1, bestelltBei: "FGr Log-V OV Wilhelmshaven" }, 240),
    s4(250, mahlzeitGeliefert("demo-be-1", null, 110)),
    s4(265, mahlzeitGeliefert("demo-be-2", null, 40)),
    bestellt(300, { bestellungId: "demo-be-3", mahlzeit: "ABEND", ausgabestelleId: AS.hallen, portionen: 130, vegetarisch: 14, vegan: 3, bestelltBei: "FGr Log-V OV Wilhelmshaven" }, 600),
    bestellt(301, { bestellungId: "demo-be-4", mahlzeit: "ABEND", ausgabestelleId: AS.sandkrug, portionen: 50, vegetarisch: 5, vegan: 1, bestelltBei: "Fleischerei Meyer, Sandkrug" }, 600),
    s4(480, mahlzeitStorniert("demo-be-4", "Lieferant kann nicht liefern, Ausgabe Sandkrug wird von den Hallen mitversorgt")),
    s4(610, mahlzeitGeliefert("demo-be-3", null, 130)),
    // Offen: bestellt, noch nicht geliefert.
    bestellt(650, { bestellungId: "demo-be-5", mahlzeit: "NACHT", ausgabestelleId: AS.hallen, portionen: 60, vegetarisch: 6, vegan: 1, bestelltBei: "FGr Log-V OV Wilhelmshaven" }, 720),
  ];
}

function verpflegung(einsatzId: string, zeit: Demozeit): Demoschritt[] {
  const regel = MAHLZEITENREGEL_VORBELEGUNG.map((zeile) => (zeile.mahlzeit === "MITTAG" ? { ...zeile, uhrzeit: "1230" } : zeile));
  return [
    s4(40, ausgabestelleAnlegen({ ausgabestelleId: AS.hallen, name: "Verpflegungsausgabe Weser-Ems-Hallen", ort: "Halle 3", traeger: "THW FGr Log-V" })),
    s4(41, ausgabestelleAnlegen({ ausgabestelleId: AS.sandkrug, name: "Ausgabe Feuerwehrhaus Sandkrug", ort: "Sandkrug", traeger: "FF Sandkrug" })),
    s4(42, abschnittAusgabestelle(AB.ea2, null, AS.sandkrug)),
    s4(43, abschnittAusgabestelle(AB.ea1, null, AS.hallen)),
    s4(50, mahlzeitenregelGesetzt(einsatzId, null, regel)),
    ...bestellungen(zeit),
  ];
}

function sofortbedarf(): Demoschritt[] {
  const bedarf = (minute: number, einheitId: string, neu: Record<string, unknown>): Demoschritt =>
    s4(minute, { typ: "SofortbedarfGesetzt", nutzlast: { einheitId }, vorher: null, neu });
  return [
    bedarf(90, "demo-eh-wp-ol", { verpflegungPersonen: 12, dieselLiter: 400, benzinLiter: 0, gemischLiter: 0, unterbringung: true, ruhezeitErforderlich: false }),
    bedarf(100, "demo-eh-b-de", { verpflegungPersonen: 9, dieselLiter: 120, benzinLiter: 40, gemischLiter: 10, unterbringung: true, ruhezeitErforderlich: true }),
    bedarf(300, "demo-eh-wp-nh", { verpflegungPersonen: 11, dieselLiter: 250, benzinLiter: 0, gemischLiter: 0, unterbringung: true, ruhezeitErforderlich: false }),
    s4(130, sofortbedarfErledigt("demo-eh-wp-ol", "DIESEL")),
    s4(131, sofortbedarfErledigt("demo-eh-wp-ol", "VERPFLEGUNG")),
    s4(215, sofortbedarfErledigt("demo-eh-wp-ol", "UNTERBRINGUNG")),
    s4(150, sofortbedarfErledigt("demo-eh-b-de", "VERPFLEGUNG")),
    // Erledigt gemeldet und wieder geöffnet: Der Tankwagen kam nicht.
    s4(170, sofortbedarfErledigt("demo-eh-b-de", "DIESEL")),
    s4(190, sofortbedarfWiederOffen("demo-eh-b-de", "DIESEL")),
    s4(95, zelle("psaSaetzeProTag", "demo-eh-wp-ol", null, 4)),
    s4(105, zelle("psaSaetzeProTag", "demo-eh-b1-ol", null, 2)),
  ];
}

export function versorgungsschritte(einsatzId: string, zeit: Demozeit): Demoschritt[] {
  return [...unterbringung(), ...verpflegung(einsatzId, zeit), ...sofortbedarf()];
}
