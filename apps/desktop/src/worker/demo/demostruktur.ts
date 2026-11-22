/**
 * Demo-Einsatz: Stammdaten, Abschnitte und die Führungsstelle.
 *
 * Das Gerüst, in das die übrigen Drehbuchteile ihre Kräfte, Nachrichten und
 * Versorgung stellen. Die Kennungen der Abschnitte (`AB`) benutzen alle
 * anderen Teile.
 */

import { KOSTEN_VORBELEGUNG } from "@s1/domaene";

import {
  dienstpostenAnlegen,
  dienstpostenBesetzt,
  kostenParameter,
  schichtplanEintrag,
  stammdatenAenderung,
} from "../../kontrakt/bedienschritte.js";
import { STELLE, schritt, schrittAls, type Demoschritt, type Demozeit } from "./drehbuch.js";

export const DEMO_NAME = "Demo-Einsatz Hochwasser Hunte";
export const DEMO_FUEST = "THW-Führungsstelle Oldenburg";

/** Die Abschnitte des Demo-Einsatzes. */
export const AB = {
  fuest: "demo-ab-fuest",
  meldekopf: "demo-ab-mk",
  bereitstellung: "demo-ab-br",
  ea1: "demo-ab-ea1",
  fuellplatz: "demo-ab-ea1-fuell",
  ea2: "demo-ab-ea2",
  ea3: "demo-ab-ea3",
  logistik: "demo-ab-log",
  angefordert: "demo-ab-ang",
  /** Wird im Verlauf aufgelöst — zeigt die Auflösung eines Abschnitts. */
  erkundung: "demo-ab-erk",
} as const;

interface Abschnittsanlage {
  readonly abschnittId: string;
  readonly name: string;
  readonly typ: string;
  readonly parentId?: string;
  readonly bemerkung?: string;
}

const ABSCHNITTE: readonly Abschnittsanlage[] = [
  { abschnittId: AB.fuest, name: "Führungsstelle", typ: "FUEHRUNGSSTELLE" },
  { abschnittId: AB.meldekopf, name: "Meldekopf Weser-Ems-Hallen", typ: "MELDEKOPF" },
  { abschnittId: AB.bereitstellung, name: "Bereitstellungsraum Weser-Ems-Hallen", typ: "BEREITSTELLUNGSRAUM" },
  { abschnittId: AB.ea1, name: "EA 1 Deich Nord (Achterdiek)", typ: "EINSATZORT", bemerkung: "Deich-km 3,2 bis 4,1, Zufahrt nur über Achterdiek" },
  { abschnittId: AB.fuellplatz, name: "Sandsackfüllplatz Bauhof", typ: "EINSATZORT", parentId: AB.ea1 },
  { abschnittId: AB.ea2, name: "EA 2 Deich Süd (Sandkrug)", typ: "EINSATZORT" },
  { abschnittId: AB.ea3, name: "EA 3 Pumpen Klärwerk Wehnen", typ: "EINSATZORT" },
  { abschnittId: AB.logistik, name: "Logistik und Verpflegung", typ: "LOGISTIK" },
  { abschnittId: AB.angefordert, name: "Angeforderte Kräfte", typ: "ANGEFORDERT" },
  { abschnittId: AB.erkundung, name: "Erkundung Hunte-Niederung", typ: "EINSATZORT" },
];

/** `EinsatzAngelegt` und die Stammdaten, die die Anlage nicht trägt. */
export function einsatzschritte(einsatzId: string, zeit: Demozeit): Demoschritt[] {
  const anlage: Demoschritt = schrittAls(STELLE.s1, 0, {
    typ: "EinsatzAngelegt",
    nutzlast: {
      einsatzId,
      name: DEMO_NAME,
      art: "UEBUNG",
      fuestName: DEMO_FUEST,
      beginn: zeit.um(0),
      schichtmodell: "ZWEI_SCHICHT",
      kosten: KOSTEN_VORBELEGUNG,
    },
  });
  return [
    anlage,
    schrittAls(STELLE.s1, 1, stammdatenAenderung(einsatzId, "uebergeordneteFuestName", null, "TEL Landkreis Oldenburg")),
    schrittAls(STELLE.s1, 1, stammdatenAenderung(einsatzId, "ort", null, "Oldenburg, Hunte-Deich zwischen Achterdiek und Sandkrug")),
    schrittAls(STELLE.s1, 3, kostenParameter(einsatzId, "geplanteEinsatztage", KOSTEN_VORBELEGUNG.geplanteEinsatztage, 3)),
  ];
}

export function abschnittsschritte(): Demoschritt[] {
  const anlagen = ABSCHNITTE.map((abschnitt, stelle) =>
    schrittAls(STELLE.s3, 4, { typ: "AbschnittAngelegt", nutzlast: { ...abschnitt, reihenfolge: stelle + 1 } }),
  );
  return [
    ...anlagen,
    schrittAls(STELLE.s3, 150, { typ: "AbschnittUmbenannt", nutzlast: { abschnittId: AB.ea3 }, vorher: "EA 3 Pumpen Klärwerk Wehnen", neu: "EA 3 Pumpen (Klärwerk Wehnen)" }),
    schrittAls(STELLE.s3, 240, {
      typ: "AbschnittBemerkungGesetzt",
      nutzlast: { abschnittId: AB.ea2 },
      vorher: null,
      neu: "Deichfuß durchweicht, Betreten nur mit Sicherung",
    }),
  ];
}

interface Posten {
  readonly id: string;
  readonly funktion: string;
  readonly schicht: "TAG" | "NACHT";
  readonly besetzung?: string;
}

const POSTEN: readonly Posten[] = [
  { id: "demo-dp-ltr-t", funktion: "Leiter Führungsstelle", schicht: "TAG", besetzung: "Ahlers, Jörg" },
  { id: "demo-dp-s1-t", funktion: "S1 Personal / Innerer Dienst", schicht: "TAG", besetzung: "Wilken, Sabine" },
  { id: "demo-dp-s2-t", funktion: "S2 Lage", schicht: "TAG", besetzung: "Hartmann, Uwe" },
  { id: "demo-dp-s3-t", funktion: "S3 Einsatz", schicht: "TAG", besetzung: "Becker, Carola" },
  { id: "demo-dp-s4-t", funktion: "S4 Versorgung", schicht: "TAG", besetzung: "Klaassen, Enno" },
  { id: "demo-dp-s6-t", funktion: "S6 Information und Kommunikation", schicht: "TAG", besetzung: "Lüers, Tammo" },
  { id: "demo-dp-si-t", funktion: "Sichter", schicht: "TAG", besetzung: "Siemers, Anke" },
  { id: "demo-dp-ldf-t", funktion: "Leiter des Fernmeldedienstes", schicht: "TAG", besetzung: "Lindemann, Dirk" },
  { id: "demo-dp-fm1-t", funktion: "Fernmelder 1", schicht: "TAG", besetzung: "Mohr, Svenja" },
  { id: "demo-dp-fm2-t", funktion: "Fernmelder 2", schicht: "TAG", besetzung: "Tschirner, Paul" },
  { id: "demo-dp-ltr-n", funktion: "Leiter Führungsstelle", schicht: "NACHT", besetzung: "Oetken, Heiko" },
  { id: "demo-dp-s2-n", funktion: "S2 Lage", schicht: "NACHT", besetzung: "Popken, Maren" },
  { id: "demo-dp-s3-n", funktion: "S3 Einsatz", schicht: "NACHT" },
  { id: "demo-dp-s4-n", funktion: "S4 Versorgung", schicht: "NACHT", besetzung: "Frerichs, Gesa" },
];

/** Die Dienstposten der Führungsstelle, ihre Besetzung und der Schichtplan des ersten Tages. */
export function fuehrungsstellenschritte(zeit: Demozeit): Demoschritt[] {
  const schritte: Demoschritt[] = [];
  POSTEN.forEach((posten, stelle) => {
    schritte.push(
      schrittAls(STELLE.s1, 8, dienstpostenAnlegen({ dienstpostenId: posten.id, teileinheit: "Stab", funktion: posten.funktion, schicht: posten.schicht, reihenfolge: stelle + 1 })),
    );
    if (posten.besetzung === undefined) return;
    schritte.push(schrittAls(STELLE.s1, 9, dienstpostenBesetzt(posten.id, null, posten.besetzung)));
    schritte.push(schrittAls(STELLE.s1, 10, schichtplanEintrag(posten.id, zeit.tag(0), null, posten.besetzung)));
  });
  // Der S3 der Nachtschicht steht erst am Abend fest — bis dahin zeigt das Blatt einen unbesetzten Posten.
  schritte.push(schritt(520, dienstpostenBesetzt("demo-dp-s3-n", null, "Bruns, Keno")));
  return schritte;
}
