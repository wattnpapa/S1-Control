/**
 * Demo-Einsatz: Korrekturen und Rücknahmen.
 *
 * Wer Lage führt, verschreibt sich, entscheidet um und nimmt zurück. Dieser
 * Teil geht die Wege einmal durch, die im geraden Ablauf nicht vorkommen:
 * Abschnitt umhängen, umsortieren, auflösen und wiederherstellen; Fahrzeug,
 * Person, Dienstposten und Auftrag ändern, entfernen und zurückholen; Zusage,
 * Erledigung und Storno einer Anforderung zurücknehmen. Im Tagebuch stehen
 * sie als das, was sie sind — mit Grund.
 */

import {
  abloesungZugesagt,
  anforderungAnlegen,
  anforderungErledigt,
  anforderungStorniert,
  dienstpostenAnlegen,
  dienstpostenEntfernt,
  dienstpostenGeaendert,
  dienstpostenWiederhergestellt,
  ruecknahme,
} from "../../kontrakt/bedienschritte.js";
import { auftragErfassen, auftragZuruecknehmen, fahrzeugEntfernen, fahrzeugWiederherstellen, personEntfernen, personWiederherstellen } from "../../kontrakt/einheitsteile.js";
import { ausgabestelleAnlegen, mahlzeitBestellt, mahlzeitStorniert, unterkunftWiederhergestellt } from "../../kontrakt/versorgungsschritte.js";
import { AB } from "./demostruktur.js";
import { STELLE, schrittAls, type Demoschritt, type Demozeit, type Schrittentwurf } from "./drehbuch.js";

const s1 = (minute: number, entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s1, minute, entwurf);
const s3 = (minute: number, entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s3, minute, entwurf);
const s4 = (minute: number, entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s4, minute, entwurf);

const AB_TEL = "demo-ab-tel";
const AB_LICHT = "demo-ab-ea2-licht";

function abschnitte(zeit: Demozeit): Demoschritt[] {
  const aufgeloest = { zielAbschnittId: AB.ea2, aufgeloestAm: zeit.um(300) };
  return [
    // Als Einsatzort angelegt, der Typ wird berichtigt und das Zeichen von Hand gesetzt.
    s3(5, { typ: "AbschnittAngelegt", nutzlast: { abschnittId: AB_TEL, name: "Abschnittsleitung Deich", typ: "EINSATZORT", reihenfolge: 20 } }),
    s3(6, { typ: "AbschnittTypGeaendert", nutzlast: { abschnittId: AB_TEL }, vorher: "EINSATZORT", neu: "SONSTIGE_FUEHRUNG", grund: "Führt die Abschnitte am Deich, ist kein Einsatzort" }),
    s3(7, { typ: "AbschnittZeichenGesetzt", nutzlast: { abschnittId: AB_TEL }, vorher: null, neu: "Führungsstellen/EAL" }),
    // An der Wurzel angelegt, dann unter den Abschnitt gehängt, zu dem er gehört.
    s3(82, { typ: "AbschnittAngelegt", nutzlast: { abschnittId: AB_LICHT, name: "Beleuchtung Deichfuß", typ: "EINSATZORT", reihenfolge: 21 } }),
    s3(84, { typ: "AbschnittUmgehaengt", nutzlast: { abschnittId: AB_LICHT }, vorher: null, neu: AB.ea2 }),
    // Meldekopf und Bereitstellungsraum tauschen die Plätze: zwei Umsortierungen.
    s3(30, { typ: "AbschnittUmsortiert", nutzlast: { abschnittId: AB.bereitstellung }, vorher: 3, neu: 2 }),
    s3(30, { typ: "AbschnittUmsortiert", nutzlast: { abschnittId: AB.meldekopf }, vorher: 2, neu: 3 }),
    // Zu früh aufgelöst und wiederhergestellt.
    s3(300, { typ: "AbschnittAufgeloest", nutzlast: { abschnittId: AB_LICHT }, vorher: null, neu: aufgeloest }),
    s3(304, { typ: "AbschnittWiederhergestellt", nutzlast: { abschnittId: AB_LICHT }, vorher: aufgeloest, neu: null }),
  ];
}

function einheitsteile(zeit: Demozeit): Demoschritt[] {
  const mtw = "demo-eh-b-wa-fz-2";
  const person = "demo-eh-b1-ol-p-9";
  return [
    // Der MTW fährt für die Führungsstelle: erst der Einheit, dann dem Abschnitt zugeordnet.
    s1(140, { typ: "FahrzeugEinheitGewechselt", nutzlast: { fahrzeugId: mtw }, vorher: "demo-eh-b-wa", neu: "demo-eh-ztr-ol" }),
    s1(141, { typ: "FahrzeugVerschoben", nutzlast: { fahrzeugId: mtw }, vorher: null, neu: AB.fuest }),
    // Ein Fahrzeug irrtümlich entfernt.
    s1(70, fahrzeugEntfernen("demo-eh-wp-ol-fz-2", "Falsche Einheit angeklickt")),
    s1(71, fahrzeugWiederherstellen("demo-eh-wp-ol-fz-2")),
    // Eine Person: Funktion nachgetragen, abgemeldet und zurückgekehrt.
    s1(60, { typ: "PersonGeaendert", nutzlast: { personId: person, feld: "funktionen" }, vorher: ["Helfer"], neu: ["Helfer", "Sprechfunker"] }),
    s1(340, personEntfernen(person, "Aus persönlichen Gründen vorzeitig entlassen")),
    s1(350, personWiederherstellen(person)),
    // Die Einheit rückt in der Liste nach vorn.
    s1(150, { typ: "EinheitUmsortiert", nutzlast: { einheitId: "demo-eh-dlrg" }, vorher: 6, neu: 3 }),
    // Ein Auftrag, der zurückgenommen wird, bevor er begonnen hat.
    s3(270, auftragErfassen({ auftragId: "demo-eh-ff-ol-auftrag-2", einheitId: "demo-eh-ff-ol", text: "Deichkrone Sandkrug ausleuchten", von: zeit.um(270), abschnittId: AB.ea2 })),
    s3(275, auftragZuruecknehmen("demo-eh-ff-ol-auftrag-2", "Übernimmt die FGr N mit ihrem Lichtmast")),
  ];
}

function fuehrungsstelle(): Demoschritt[] {
  const posten = "demo-dp-fb-t";
  return [
    s1(12, dienstpostenAnlegen({ dienstpostenId: posten, teileinheit: "Stab", funktion: "Fachberater", schicht: "TAG", reihenfolge: 30 })),
    s1(14, dienstpostenGeaendert(posten, "funktion", "Fachberater", "Fachberater Deichverteidigung")),
    s1(355, dienstpostenEntfernt(posten, "Fachberater wechselt zur TEL")),
    s1(360, dienstpostenWiederhergestellt(posten)),
  ];
}

function anforderungen(zeit: Demozeit): Demoschritt[] {
  const id = "demo-an-6";
  const zusage = abloesungZugesagt(id, zeit.um(520), "Bauhof Stadt Oldenburg");
  const erledigung = anforderungErledigt(id, zeit.um(538));
  // Mit dem gesehenen Wert als `vorher`: Die Rücknahme sagt, was sie zurücknimmt.
  const zurueck = (was: "zusage" | "erledigung" | "storno", vorher: unknown, grund: string): Schrittentwurf => ({ ...ruecknahme(id, was, grund), vorher });
  return [
    s1(450, anforderungAnlegen({ anforderungId: id, kennung: "A-06", vorgeseheneEinheitText: "Radlader mit Fahrer", vorgesehenerAuftrag: "Sand am Füllplatz umschlagen", angefordertAm: zeit.um(450) })),
    // Zusage, die nicht hält; Storno, das zu früh kam; „eingetroffen" an der falschen Zeile.
    s1(455, zusage),
    s1(470, zurueck("zusage", zusage.neu, "Radlader des Bauhofs ist defekt")),
    s1(472, anforderungStorniert(id, "Kein Gerät verfügbar")),
    s1(490, zurueck("storno", true, "FGr Räumen OV Leer kann stellen")),
    s1(540, erledigung),
    s1(542, zurueck("erledigung", erledigung.neu, "Verwechslung, der Radlader ist noch auf der Anfahrt")),
  ];
}

function versorgung(zeit: Demozeit): Demoschritt[] {
  const ausgabe = "demo-as-bauhof";
  const bestellung = "demo-be-6";
  return [
    s4(44, ausgabestelleAnlegen({ ausgabestelleId: ausgabe, name: "Ausgabe Bauhof", ort: "Sandsackfüllplatz" })),
    s4(46, { typ: "AusgabestelleEntfernt", nutzlast: { ausgabestelleId: ausgabe }, vorher: null, neu: true }),
    s4(48, { typ: "AusgabestelleWiederhergestellt", nutzlast: { ausgabestelleId: ausgabe }, vorher: true, neu: false }),
    s4(305, mahlzeitBestellt({ bestellungId: bestellung, datum: zeit.tag(600), mahlzeit: "ABEND", ausgabestelleId: ausgabe, portionen: 25, vegetarisch: 3, vegan: 0, bestelltBei: "FGr Log-V OV Wilhelmshaven", bestelltVon: "S4 Klaassen" })),
    s4(310, mahlzeitStorniert(bestellung, "Füllplatz wird von den Hallen mitversorgt")),
    s4(315, { typ: "MahlzeitStornoZurueckgenommen", nutzlast: { bestellungId: bestellung }, vorher: true, neu: false }),
    // Das Zeltlager war aufgelöst, der Sportplatz ist wieder trocken.
    s4(640, unterkunftWiederhergestellt("demo-uk-zelt")),
  ];
}

export function korrekturschritte(zeit: Demozeit): Demoschritt[] {
  return [...abschnitte(zeit), ...einheitsteile(zeit), ...fuehrungsstelle(), ...anforderungen(zeit), ...versorgung(zeit)];
}
