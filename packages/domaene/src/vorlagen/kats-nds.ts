/**
 * KatS-Vorlagen Niedersachsen aus dem zweiten Kopiervorlagen-Bereich der Excel
 * (Blatt „Stärke“ C83:J121, Abschnitt „KatS Nds“, ergänzt in Fassung 1.5.0,
 * Neu!B34).
 *
 * **Was aus der Quelle kommt:** Bezeichnung (Spalte C), Ebene (die Spalte, in
 * der die Bezeichnung ein zweites Mal steht: F Zug, G Trupp o. Staffel,
 * H Gruppe), die Fahrzeuge (Spalte J) und die Zugbloecke (die Zeilen unter
 * einem Fachzug). Die Langnamen sind die des Blatts „AküLi“.
 *
 * **Was nicht aus der Quelle kommt und deshalb als Annahme gekennzeichnet
 * ist:**
 *
 *  * *Organisation.* Spalte D ist im KatS-Block leer — dieselbe Einheit stellt
 *    am einen Ort das DRK, am anderen die Johanniter. Die Vorlage traegt
 *    deshalb alle ueblichen Traeger (`traeger`) und als `organisation` nur die
 *    Vorbelegung; die Maske laesst sie aendern. Annahme, am Standort pruefen.
 *  * *Sollstaerke.* Die Stärke-Spalten (AJ:AL) sind leer. Eingetragen ist die
 *    taktische Grundgliederung der Ebene (Trupp 0/1/2, Staffel 0/1/5, Gruppe
 *    0/1/8, Zugtrupp 1/1/2; ein Zug als Summe seines Blocks). Das ist keine
 *    StAN-Zahl — `sollStaerkeAnnahme` sagt es der Maske, damit die Zahl dort
 *    nicht wie eine gemeldete aussieht. Annahme, am Standort pruefen.
 *
 * Die Feuerwehr-Vorlagen des ersten Blocks (`feuerwehr.ts`) bleiben ohne
 * Sollstaerke; dort ist nichts geaendert.
 */

import type { Organisation, Staerke, TaktischeEbene } from "../ereignis.js";
import type { EinheitVorlage } from "./katalog.js";

const KATALOG_VERSION = "1.5.0"; // Excel-Fassung, in der der Block kam (Neu!B34)

/** Annahme, am Standort pruefen: die taktische Grundgliederung je Ebene. */
const GRUNDGLIEDERUNG: Partial<Record<TaktischeEbene, Staerke>> = {
  TRUPP: { fuehrer: 0, unterfuehrer: 1, mannschaft: 2 },
  STAFFEL: { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 },
  GRUPPE: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
  ZUGTRUPP: { fuehrer: 1, unterfuehrer: 1, mannschaft: 2 },
};

// Traegerlisten — Annahme, am Standort pruefen.
const FW: readonly Organisation[] = ["FEUERWEHR"];
const WASSERRETTUNG: readonly Organisation[] = ["DLRG", "DRK"];
const HIORG: readonly Organisation[] = ["DRK", "JUH", "MHD", "ASB"];
const REGIE: readonly Organisation[] = ["REGIE", "DRK", "JUH", "MHD", "ASB", "DLRG", "FEUERWEHR"];

type Fz = readonly [typ: string, anzahl?: number];

interface Zeile {
  readonly id: string;
  readonly bezeichnung: string;
  readonly lang: string;
  readonly ebene: TaktischeEbene;
  readonly traeger: readonly Organisation[];
  readonly fahrzeuge: readonly Fz[];
  readonly teilVon?: string;
  /** Nur fuer Zuege: die Ebenen ihres Blocks, deren Grundgliederung sich summiert. */
  readonly block?: readonly TaktischeEbene[];
}

function summe(ebenen: readonly TaktischeEbene[]): Staerke {
  return ebenen.reduce<Staerke>(
    (bisher, ebene) => {
      const teil = GRUNDGLIEDERUNG[ebene] ?? { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 };
      return {
        fuehrer: bisher.fuehrer + teil.fuehrer,
        unterfuehrer: bisher.unterfuehrer + teil.unterfuehrer,
        mannschaft: bisher.mannschaft + teil.mannschaft,
      };
    },
    { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  );
}

function alsVorlage(zeile: Zeile): EinheitVorlage {
  const [erster] = zeile.traeger;
  const soll = zeile.block === undefined ? GRUNDGLIEDERUNG[zeile.ebene] : summe(zeile.block);
  return {
    id: zeile.id,
    katalog: "KATS_STAN_NDS",
    katalogVersion: KATALOG_VERSION,
    organisation: erster ?? "SONSTIGE",
    traeger: zeile.traeger,
    bezeichnung: zeile.bezeichnung,
    lang: zeile.lang,
    ebene: zeile.ebene,
    ...(soll === undefined ? {} : { sollStaerke: soll, sollStaerkeAnnahme: true }),
    fahrzeuge: zeile.fahrzeuge.map(([typ, anzahl]) => ({ typ, anzahl: anzahl ?? 1 })),
    ...(zeile.teilVon === undefined ? {} : { teilVon: zeile.teilVon }),
  };
}

const ZEILEN: readonly Zeile[] = [
  // --- Feuerwehr-Bereitschaft (Zeilen 83–98) ---------------------------------
  { id: "kats-fm-veg", bezeichnung: "FM VEG", lang: "Fachmodul Vegetationsbrandbekämpfung", ebene: "GRUPPE", traeger: FW,
    fahrzeuge: [["TSF"], ["WLF"], ["Abrollcontainer VEG"]] },
  { id: "kats-fm-hfs", bezeichnung: "FM HFS", lang: "Fachmodul Hochleistungsförderpumpensystem", ebene: "GRUPPE", traeger: FW,
    fahrzeuge: [["GW-L 2 HFS"], ["WLF"], ["AB HFS"], ["MTW"]] },
  { id: "kats-fuegr-fb-nds", bezeichnung: "FüGr FB NDS", lang: "Führungsgruppe Feuerwehrbereitschaft Nds", ebene: "GRUPPE", traeger: FW,
    fahrzeuge: [["KdoW"], ["MTW"], ["ELW 2"], ["Krad"]] },
  { id: "kats-fgr-verses", bezeichnung: "FGr VersES", lang: "Fachgruppe Versorgung und Eigenschutz", ebene: "GRUPPE", traeger: FW,
    fahrzeuge: [["GW-L1 BTrMt"], ["Anh Marschgepäck"], ["GW-L1 Vpf"], ["Anh Kühl"], ["GW-L2 Vers"], ["KTW/RTW"]] },
  { id: "kats-fz-bs", bezeichnung: "FZ BS", lang: "Fachzug Brandschutz", ebene: "ZUG", traeger: FW,
    block: ["ZUGTRUPP", "TRUPP", "GRUPPE", "GRUPPE"],
    fahrzeuge: [["ELW 1"], ["LF KatS", 2], ["SW KatS / GW-L2 SW"]] },
  { id: "kats-fz-bs-ztr", bezeichnung: "ZTr", lang: "Zugtrupp", ebene: "ZUGTRUPP", traeger: FW, teilVon: "kats-fz-bs",
    fahrzeuge: [["ELW 1"]] },
  { id: "kats-fz-bs-tr-log-schlauch", bezeichnung: "Tr Log Schlauch", lang: "Trupp Logistik Schlauch", ebene: "TRUPP", traeger: FW,
    teilVon: "kats-fz-bs", fahrzeuge: [["SW KatS/GW-L2 SW"]] },
  { id: "kats-fz-bs-lg", bezeichnung: "LG", lang: "Löschgruppe", ebene: "GRUPPE", traeger: FW, teilVon: "kats-fz-bs",
    fahrzeuge: [["LF KatS"]] },
  // Die Excel fuehrt Zugtrupp und Loeschgruppe nur einmal (beim FZ BS); der
  // FZ TH nimmt dieselben Bausteine und eigens nur den Tr TH.
  { id: "kats-fz-th", bezeichnung: "FZ TH", lang: "Fachzug Technische Hilfe", ebene: "ZUG", traeger: FW,
    block: ["ZUGTRUPP", "TRUPP", "GRUPPE", "GRUPPE"],
    fahrzeuge: [["ELW 1"], ["LF KatS", 2], ["RW/GW-L2 TH"]] },
  { id: "kats-fz-th-tr-th", bezeichnung: "Tr TH", lang: "Trupp Technische Hilfe", ebene: "TRUPP", traeger: FW, teilVon: "kats-fz-th",
    fahrzeuge: [["RW/GW-L2 TH"]] },
  { id: "kats-fz-vegbbk", bezeichnung: "FZ VegBBK", lang: "Fachzug Vegetationsbrandbekämpfung", ebene: "ZUG", traeger: FW,
    block: ["ZUGTRUPP", "TRUPP", "TRUPP", "TRUPP", "TRUPP", "STAFFEL"],
    fahrzeuge: [["ELW 1"], ["TLF 2000/3000", 4], ["GW-L2"]] },
  { id: "kats-fz-vegbbk-tr", bezeichnung: "Tr VegBBK", lang: "Trupp Vegetationsbrandbekämpfung", ebene: "TRUPP", traeger: FW,
    teilVon: "kats-fz-vegbbk", fahrzeuge: [["TLF 2000/3000"]] },
  { id: "kats-fz-vegbbk-st-log-we", bezeichnung: "St Log Wasserentnahme", lang: "Staffel Logistik Wasserentnahme", ebene: "STAFFEL",
    traeger: FW, teilVon: "kats-fz-vegbbk", fahrzeuge: [["GW-L2"]] },
  { id: "kats-fz-wt", bezeichnung: "FZ WT", lang: "Fachzug Wassertransport", ebene: "ZUG", traeger: FW,
    block: ["ZUGTRUPP", "TRUPP", "TRUPP", "TRUPP", "TRUPP", "STAFFEL"],
    fahrzeuge: [["ELW 1"], ["TLF 3000", 4], ["GW-L2"]] },
  { id: "kats-fz-wt-tr", bezeichnung: "Tr WT", lang: "Trupp Wassertransport", ebene: "TRUPP", traeger: FW, teilVon: "kats-fz-wt",
    fahrzeuge: [["TLF 3000"]] },
  { id: "kats-fz-wt-st-log", bezeichnung: "St Log WT", lang: "Staffel Logistik Wassertransport", ebene: "STAFFEL", traeger: FW,
    teilVon: "kats-fz-wt", fahrzeuge: [["GW-L2"]] },
  // --- Wasserrettung (Zeilen 99–102) ---------------------------------------
  { id: "kats-gr-wr", bezeichnung: "Gr WR", lang: "Gruppe Wasserrettung", ebene: "GRUPPE", traeger: WASSERRETTUNG,
    fahrzeuge: [["GW WR"], ["MZB KatS"], ["GW StrR"], ["Raft"]] },
  { id: "kats-gr-tau", bezeichnung: "Gr Tau", lang: "Gruppe Einsatz Tauchen", ebene: "GRUPPE", traeger: WASSERRETTUNG,
    fahrzeuge: [["GW Tau"], ["MZB KatS"]] },
  { id: "kats-gr-stau", bezeichnung: "Gr STau", lang: "Gruppe Spezial Tauchen", ebene: "GRUPPE", traeger: WASSERRETTUNG,
    fahrzeuge: [["GW Tau"], ["GW SpTau"], ["MZB KatS"]] },
  { id: "kats-gtrw", bezeichnung: "GTrW", lang: "Gerätetrupp Wassergefahren", ebene: "TRUPP", traeger: WASSERRETTUNG,
    fahrzeuge: [["GW WGT"], ["MZB KatS (LKW K, HWB)"]] },
  // --- Sanität und Betreuung (Zeilen 103–112) --------------------------------
  { id: "kats-st-pt", bezeichnung: "St PT", lang: "Staffel Patiententransport", ebene: "STAFFEL", traeger: HIORG,
    fahrzeuge: [["KTW", 3]] },
  { id: "kats-z-sb", bezeichnung: "Z SB", lang: "Zug Sanität und Betreuung", ebene: "ZUG", traeger: HIORG,
    block: ["ZUGTRUPP", "GRUPPE", "GRUPPE"],
    fahrzeuge: [["ZTrKW"], ["GW San"], ["MTW"], ["GW Bt"], ["MTW Bt"], ["Anh Bt"]] },
  { id: "kats-z-sb-ztr", bezeichnung: "ZTr", lang: "Zugtrupp", ebene: "ZUGTRUPP", traeger: HIORG, teilVon: "kats-z-sb",
    fahrzeuge: [["ZTrKW"]] },
  { id: "kats-z-sb-gr-san", bezeichnung: "Gr San", lang: "Gruppe Sanitätsversorgung", ebene: "GRUPPE", traeger: HIORG,
    teilVon: "kats-z-sb", fahrzeuge: [["GW San"], ["MTW"]] },
  { id: "kats-z-sb-gr-bt", bezeichnung: "Gr BT", lang: "Gruppe Betreuung", ebene: "GRUPPE", traeger: HIORG, teilVon: "kats-z-sb",
    fahrzeuge: [["GW Bt"], ["MTW Bt"], ["Anh Bt"]] },
  { id: "kats-st-psnv", bezeichnung: "St PSNV", lang: "Staffel Psychosoziale Notfallversorgung", ebene: "STAFFEL", traeger: HIORG,
    fahrzeuge: [["MTW"]] },
  { id: "kats-gr-vpf", bezeichnung: "Gr Vpf", lang: "Gruppe Verpflegung", ebene: "GRUPPE", traeger: HIORG,
    fahrzeuge: [["GW Vpf"], ["MTW Vpf"], ["FKH"], ["Anh Kühl"]] },
  { id: "kats-st-reg", bezeichnung: "St Reg", lang: "Staffel Registrierung", ebene: "STAFFEL", traeger: HIORG,
    fahrzeuge: [["MTW"]] },
  { id: "kats-st-btl", bezeichnung: "St BtL", lang: "Staffel Betreuungstransport- und -leitung", ebene: "STAFFEL", traeger: HIORG,
    fahrzeuge: [["MTWm"], ["Anh Bt"]] },
  { id: "kats-tr-t", bezeichnung: "Tr T", lang: "Trupp Transport Bus 50", ebene: "TRUPP", traeger: HIORG,
    fahrzeuge: [["KOM"], ["Anh"]] },
  // --- Logistik, Führung, Regieeinheiten (Zeilen 113–121) --------------------
  { id: "kats-gr-lt", bezeichnung: "Gr LT", lang: "Gruppe Logistik und Technik (mit Tr Log-Fü)", ebene: "GRUPPE", traeger: REGIE,
    fahrzeuge: [["Kombi-L"], ["GW L gr"], ["Anh Log"], ["GW L kl"], ["NEA LiMa"], ["Anh Tank"], ["GW L 7,5"]] },
  { id: "kats-gr-ev", bezeichnung: "Gr EV", lang: "Gruppe Energieversorgung", ebene: "GRUPPE", traeger: REGIE,
    fahrzeuge: [["NEA 250"], ["TB Ks 6000l"]] },
  { id: "kats-tr-l", bezeichnung: "Tr L", lang: "Trupp Logistik schwer", ebene: "TRUPP", traeger: REGIE,
    fahrzeuge: [["WLF"], ["AB Mulde und Logistik"], ["Anh"], ["UslG"]] },
  { id: "kats-gr-fue", bezeichnung: "Gr Fü", lang: "Gruppe Führung", ebene: "GRUPPE", traeger: REGIE,
    fahrzeuge: [["FüKW"], ["KdoW"], ["Anh Zelt"]] },
  { id: "kats-ztr-wr", bezeichnung: "ZTr-WR", lang: "Zugtrupp Wasserrettung", ebene: "ZUGTRUPP", traeger: WASSERRETTUNG,
    fahrzeuge: [["ZTrKW"]] },
  { id: "kats-tr-ml", bezeichnung: "Tr ML", lang: "Trupp Melde- und Lotsen", ebene: "TRUPP", traeger: REGIE,
    fahrzeuge: [["Krad"]] },
  { id: "kats-tr-akl", bezeichnung: "Tr Akl", lang: "Trupp Aufklärung Luft", ebene: "TRUPP", traeger: REGIE,
    fahrzeuge: [["Kombi UAV"]] },
  { id: "kats-ge-sfm", bezeichnung: "GE SFM", lang: "Geräteeinheit Sandsackfüllmaschine", ebene: "GRUPPE", traeger: REGIE,
    fahrzeuge: [["SMF"], ["Anh. Trsp"], ["Mat Cont"]] },
  { id: "kats-ge-mobhws", bezeichnung: "GE mobHWS", lang: "Geräteeinheit mobiles Hochwasserschutzsystem", ebene: "TRUPP",
    traeger: REGIE, fahrzeuge: [["geeignetes Transportfahrzeug"]] },
];

/** Die 39 Zeilen des Blocks „KatS Nds“, in der Reihenfolge der Excel. */
export const KATS_NDS_VORLAGEN: readonly EinheitVorlage[] = ZEILEN.map(alsVorlage);
