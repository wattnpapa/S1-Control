/**
 * Demo-Einsatz: Versorgung — Unterbringung, Verpflegung, Sofortbedarf.
 *
 * Alles, was das Blatt „Versorgung" zeigt: Unterkünfte mit Belegung,
 * Ausgabestellen, die Mahlzeitenregel, Bestellungen (geliefert, offen,
 * storniert) und der Sofortbedarf, den die Einheiten mitgebracht haben.
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
import { EH } from "./demoeinheiten.js";
import { AB } from "./demostruktur.js";
import { STELLE, schrittAls, type Demoschritt, type Schrittentwurf, type Demozeit } from "./drehbuch.js";
import { zelle } from "./zelle.js";

const UK = { bbs: "demo-uk-bbs", djh: "demo-uk-djh", zelt: "demo-uk-zelt" } as const;
const AS = { hallen: "demo-as-hallen", sandkrug: "demo-as-sandkrug" } as const;

const s4 = (minute: number, entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s4, minute, entwurf);

function unterbringung(): Demoschritt[] {
  const belegung: readonly (readonly [string, string, number])[] = [
    [EH.fgrK.id, UK.bbs, 200],
    [EH.bOl.id, UK.bbs, 205],
    [EH.bNh.id, UK.bbs, 206],
    [EH.bVa.id, UK.bbs, 207],
    [EH.nOl.id, UK.djh, 210],
    [EH.wpVa.id, UK.djh, 211],
    [EH.logV.id, UK.djh, 212],
    [EH.wLe.id, UK.bbs, 320],
    [EH.bWe.id, UK.bbs, 580],
  ];
  return [
    s4(120, unterkunftAnlegen({ unterkunftId: UK.bbs, name: "Sporthalle BBS Wechloy", ort: "Ammerländer Heerstraße, Oldenburg", kapazitaet: 60, bemerkung: "Feldbetten vom DRK, Duschen in der Halle" })),
    s4(121, unterkunftAnlegen({ unterkunftId: UK.djh, name: "Jugendherberge Oldenburg", ort: "Straßburger Straße, Oldenburg", kapazitaet: 36 })),
    s4(122, unterkunftAnlegen({ unterkunftId: UK.zelt, name: "Zeltlager Sandkrug", ort: "Sportplatz Sandkrug", kapazitaet: 40 })),
    s4(180, unterkunftGeaendert(UK.bbs, "kapazitaet", 60, 80)),
    s4(260, unterkunftAufgeloest(UK.zelt, "Sportplatz steht unter Wasser")),
    ...belegung.map(([einheitId, unterkunftId, minute]) => s4(minute, einheitUntergebracht(einheitId, null, unterkunftId))),
    // Eine Umquartierung: aufgehoben und neu zugewiesen.
    s4(450, unterbringungAufgehoben(EH.logV.id, UK.djh)),
    s4(451, einheitUntergebracht(EH.logV.id, null, UK.bbs)),
  ];
}

function bestellungen(zeit: Demozeit): Demoschritt[] {
  const bestellt = (minute: number, anlage: Omit<Bestellanlage, "datum" | "bestelltVon">, fuerMinute: number): Demoschritt =>
    s4(minute, mahlzeitBestellt({ ...anlage, datum: zeit.tag(fuerMinute), bestelltVon: "S4 Klaassen" }));
  return [
    bestellt(60, { bestellungId: "demo-be-1", mahlzeit: "MITTAG", ausgabestelleId: AS.hallen, portionen: 110, vegetarisch: 12, vegan: 3, bestelltBei: "FGr Log-V OV Aurich" }, 240),
    bestellt(61, { bestellungId: "demo-be-2", mahlzeit: "MITTAG", ausgabestelleId: AS.sandkrug, portionen: 45, vegetarisch: 5, vegan: 1, bestelltBei: "FGr Log-V OV Aurich" }, 240),
    s4(250, mahlzeitGeliefert("demo-be-1", null, 110)),
    s4(265, mahlzeitGeliefert("demo-be-2", null, 40)),
    bestellt(300, { bestellungId: "demo-be-3", mahlzeit: "ABEND", ausgabestelleId: AS.hallen, portionen: 130, vegetarisch: 14, vegan: 3, bestelltBei: "FGr Log-V OV Aurich" }, 600),
    bestellt(301, { bestellungId: "demo-be-4", mahlzeit: "ABEND", ausgabestelleId: AS.sandkrug, portionen: 50, vegetarisch: 5, vegan: 1, bestelltBei: "Fleischerei Meyer, Sandkrug" }, 600),
    s4(480, mahlzeitStorniert("demo-be-4", "Lieferant kann nicht liefern, Ausgabe Sandkrug wird von den Hallen mitversorgt")),
    s4(610, mahlzeitGeliefert("demo-be-3", null, 130)),
    // Offen: bestellt, noch nicht geliefert.
    bestellt(650, { bestellungId: "demo-be-5", mahlzeit: "NACHT", ausgabestelleId: AS.hallen, portionen: 60, vegetarisch: 6, vegan: 1, bestelltBei: "FGr Log-V OV Aurich" }, 720),
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

/**
 * Den Sofortbedarf bringen die Einheiten mit ihrem Erfassungsbogen mit
 * (`SofortbedarfGesetzt` aus der Übernahme); hier arbeitet S4 ihn ab.
 */
function sofortbedarf(): Demoschritt[] {
  return [
    s4(130, sofortbedarfErledigt(EH.wpVa.id, "DIESEL")),
    s4(131, sofortbedarfErledigt(EH.wpVa.id, "VERPFLEGUNG")),
    s4(215, sofortbedarfErledigt(EH.wpVa.id, "UNTERBRINGUNG")),
    s4(150, sofortbedarfErledigt(EH.bVa.id, "VERPFLEGUNG")),
    s4(160, sofortbedarfErledigt(EH.bOl.id, "VERPFLEGUNG")),
    s4(161, sofortbedarfErledigt(EH.bOl.id, "DIESEL")),
    // Erledigt gemeldet und wieder geöffnet: Der Tankwagen kam nicht.
    s4(170, sofortbedarfErledigt(EH.bVa.id, "DIESEL")),
    s4(190, sofortbedarfWiederOffen(EH.bVa.id, "DIESEL")),
    s4(95, zelle("psaSaetzeProTag", EH.wpVa.id, null, 4)),
    s4(105, zelle("psaSaetzeProTag", EH.bOl.id, null, 2)),
  ];
}

export function versorgungsschritte(einsatzId: string, zeit: Demozeit): Demoschritt[] {
  return [...unterbringung(), ...verpflegung(einsatzId, zeit), ...sofortbedarf()];
}
