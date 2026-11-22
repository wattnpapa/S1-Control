/**
 * Die Fachlage im Demo-Einsatz (Stab-Review 2026-11-22): je Bereich ein
 * offener und ein erledigter Fall, mit den Schrittbauern der Oberfläche
 * (`kontrakt/fachlageschritte.ts`). Zeiten sind Minuten seit Beginn.
 */

import { fachlageAenderung, fachlageAnlage } from "../../kontrakt/fachlageschritte.js";
import { AB } from "./demostruktur.js";
import { STELLE, schrittAls, type Demoschritt, type Demozeit } from "./drehbuch.js";

function lage(zeit: Demozeit): Demoschritt[] {
  return [
    schrittAls(STELLE.s2, 40, fachlageAnlage("lage", "demo-lg-1", { abschnittId: AB.ea1, zeitpunkt: zeit.um(38), lage: "Deich durchfeuchtet, keine Sickerstellen", ort: "Deich-km 2 bis 4" })),
    schrittAls(STELLE.s2, 250, fachlageAnlage("lage", "demo-lg-2", { abschnittId: AB.ea1, zeitpunkt: zeit.um(248), lage: "Sickerstelle bei km 3,4 mit Sandsäcken gesichert, wird beobachtet", ort: "Deich-km 3,4", bedarf: "2000 Sandsäcke" })),
    schrittAls(STELLE.s2, 260, fachlageAnlage("lage", "demo-lg-3", { abschnittId: AB.ea3, zeitpunkt: zeit.um(258), lage: "Klärwerk Wehnen, Becken 2 läuft voll; zwei Pumpen im Betrieb" })),
    schrittAls(STELLE.s2, 265, fachlageAnlage("lage", "demo-lg-4", { abschnittId: AB.ea2, zeitpunkt: zeit.um(264), lage: "Doppelt erfasst" })),
    schrittAls(STELLE.s2, 266, fachlageAenderung("lage", "demo-lg-4", "zurueckgezogen", { vorher: null, neu: true })),
  ];
}

function pegel(zeit: Demozeit): Demoschritt[] {
  const messung = (minute: number, id: string, wertCm: number, prognoseCm?: number): Demoschritt =>
    schrittAls(STELLE.fachberater, minute, fachlageAnlage("pegel", id, { pegel: "Oldenburg-Drielake", zeitpunkt: zeit.um(minute), wertCm, quelle: "Pegelportal NLWKN", ...(prognoseCm === undefined ? {} : { prognoseCm, prognoseFuer: zeit.um(minute + 360) }) }));
  return [
    messung(16, "demo-pg-1", 382),
    messung(180, "demo-pg-2", 398, 425),
    messung(420, "demo-pg-3", 415, 425),
    messung(710, "demo-pg-4", 421, 424),
    schrittAls(STELLE.fachberater, 430, fachlageAnlage("pegel", "demo-pg-5", { pegel: "Oldenburg-Drielake", zeitpunkt: zeit.um(429), wertCm: 451 })),
    schrittAls(STELLE.fachberater, 432, fachlageAenderung("pegel", "demo-pg-5", "zurueckgezogen", { vorher: null, neu: true })),
  ];
}

function deich(zeit: Demozeit): Demoschritt[] {
  return [
    schrittAls(STELLE.s3, 64, fachlageAnlage("deich", "demo-ds-1", { deichKm: "3,4", art: "SICKERSTELLE", beschreibung: "landseitig am Deichfuß, klares Wasser", zeitpunkt: zeit.um(62), abschnittId: AB.ea1 })),
    schrittAls(STELLE.s3, 90, fachlageAenderung("deich", "demo-ds-1", "massnahme", { vorher: null, neu: "Quellkade aus Sandsäcken" })),
    schrittAls(STELLE.s3, 140, fachlageAenderung("deich", "demo-ds-1", "stand", { vorher: null, neu: "GESICHERT" })),
    schrittAls(STELLE.s3, 600, fachlageAnlage("deich", "demo-ds-2", { deichKm: "5,1", art: "QUALMWASSER", zeitpunkt: zeit.um(598), abschnittId: AB.ea2 })),
    schrittAls(STELLE.s3, 610, fachlageAenderung("deich", "demo-ds-2", "stand", { vorher: null, neu: "UNTER_BEOBACHTUNG" })),
  ];
}

function patienten(zeit: Demozeit): Demoschritt[] {
  return [
    schrittAls(STELLE.fachberater, 374, fachlageAnlage("patienten", "demo-pt-1", { kennung: "AK-0017", sichtung: "SK3", einsatzkraft: true, organisation: "THW", verletzung: "Schnittverletzung Hand", zeitpunkt: zeit.um(372), abschnittId: AB.ea1 })),
    schrittAls(STELLE.fachberater, 390, fachlageAenderung("patienten", "demo-pt-1", "verbleib", { vorher: null, neu: "TRANSPORT" })),
    schrittAls(STELLE.fachberater, 391, fachlageAenderung("patienten", "demo-pt-1", "transportziel", { vorher: null, neu: "Klinikum Oldenburg" })),
    schrittAls(STELLE.fachberater, 640, fachlageAnlage("patienten", "demo-pt-2", { kennung: "AK-0023", sichtung: "SK2", einsatzkraft: false, verletzung: "Unterkühlung", zeitpunkt: zeit.um(638), abschnittId: AB.ea2 })),
  ];
}

function amtshilfe(zeit: Demozeit): Demoschritt[] {
  return [
    schrittAls(STELLE.fachberater, 300, fachlageAnlage("amtshilfe", "demo-ah-1", { kennung: "AH-01", an: "Bundeswehr, Landeskommando Niedersachsen", leistung: "Sandsackbefüllung und Verbau am Deich", umfang: "ein Zug", benoetigtAb: zeit.um(480), zeitpunkt: zeit.um(298) })),
    schrittAls(STELLE.fachberater, 360, fachlageAenderung("amtshilfe", "demo-ah-1", "stand", { vorher: null, neu: "IN_PRUEFUNG" })),
    schrittAls(STELLE.fachberater, 470, fachlageAenderung("amtshilfe", "demo-ah-1", "stand", { vorher: "IN_PRUEFUNG", neu: "GENEHMIGT" })),
    schrittAls(STELLE.fachberater, 471, fachlageAenderung("amtshilfe", "demo-ah-1", "bemerkung", { vorher: null, neu: "Eintreffen im Bereitstellungsraum angekündigt" })),
  ];
}

function material(zeit: Demozeit): Demoschritt[] {
  return [
    schrittAls(STELLE.s4, 255, fachlageAnlage("material", "demo-ma-1", { bezeichnung: "Sandsäcke", menge: 2000, mengeneinheit: "Stück", zeitpunkt: zeit.um(254), abschnittId: AB.ea1, lieferant: "Bauhof Stadt Oldenburg" })),
    schrittAls(STELLE.s4, 330, fachlageAenderung("material", "demo-ma-1", "stand", { vorher: null, neu: "GELIEFERT" })),
    schrittAls(STELLE.s4, 560, fachlageAnlage("material", "demo-ma-2", { bezeichnung: "Diesel", menge: 800, mengeneinheit: "Liter", zeitpunkt: zeit.um(558), abschnittId: AB.ea3, benoetigtBis: zeit.um(700) })),
    schrittAls(STELLE.s4, 575, fachlageAenderung("material", "demo-ma-2", "stand", { vorher: null, neu: "BESTELLT" })),
  ];
}

function presse(zeit: Demozeit): Demoschritt[] {
  return [
    schrittAls(STELLE.s5, 200, fachlageAnlage("presse", "demo-pm-1", { titel: "Deichverteidigung an der Hunte", text: "Rund 150 Einsatzkräfte sichern den Deich zwischen Achterdiek und Sandkrug. Eine Gefahr für die Bevölkerung besteht derzeit nicht.", zeitpunkt: zeit.um(198) })),
    schrittAls(STELLE.leiter, 215, fachlageAenderung("presse", "demo-pm-1", "freigabe", { vorher: null, neu: "Leiter (Ah)" })),
    schrittAls(STELLE.s5, 216, fachlageAenderung("presse", "demo-pm-1", "stand", { vorher: null, neu: "VEROEFFENTLICHT" })),
    schrittAls(STELLE.s5, 650, fachlageAnlage("presse", "demo-pm-2", { titel: "Pegel flacht ab", text: "Der Anstieg des Pegels flacht ab. Die Einsatzkräfte bleiben über Nacht am Deich.", zeitpunkt: zeit.um(648) })),
    schrittAls(STELLE.s5, 655, fachlageAenderung("presse", "demo-pm-2", "stand", { vorher: null, neu: "ZUR_FREIGABE" })),
  ];
}

function stoerungen(zeit: Demozeit): Demoschritt[] {
  return [
    schrittAls(STELLE.s6, 120, fachlageAnlage("stoerungen", "demo-st-1", { bereich: "DRUCKER", beschreibung: "Drucker der Fernmeldezentrale meldet Papierstau", ersatzweg: "Drucker im Raum S1", zeitpunkt: zeit.um(118) })),
    schrittAls(STELLE.s6, 135, fachlageAenderung("stoerungen", "demo-st-1", "stand", { vorher: null, neu: "BEHOBEN" })),
    schrittAls(STELLE.s6, 664, fachlageAnlage("stoerungen", "demo-st-2", { bereich: "STROM", beschreibung: "Netzersatzanlage Sandkrug ausgefallen, Einsatzstelle ohne Licht", ersatzweg: "Beleuchtung über GKW", zeitpunkt: zeit.um(662) })),
    schrittAls(STELLE.s6, 668, fachlageAenderung("stoerungen", "demo-st-2", "stand", { vorher: null, neu: "IN_ARBEIT" })),
  ];
}

export function fachlageschritte(zeit: Demozeit): Demoschritt[] {
  return [...lage(zeit), ...pegel(zeit), ...deich(zeit), ...patienten(zeit), ...amtshilfe(zeit), ...material(zeit), ...presse(zeit), ...stoerungen(zeit)];
}
