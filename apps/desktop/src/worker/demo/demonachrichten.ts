/**
 * Demo-Einsatz: die Nachrichten.
 *
 * Ausgänge, Eingänge und eine Gesprächsnotiz über die zwölf Stunden, mit
 * Vorrang, Antwort, Weiterleitung, Berichtigung und Zurückziehen. Die letzten
 * Nachrichten bleiben unterwegs stehen (`bis`), damit LdF, Fernmelder,
 * Sichter und die Sachgebiete beim Öffnen etwas vorfinden. Den Weg je
 * Nachricht bauen `ausgangsschritte` und `eingangsschritte`.
 */

import { FMZ_SCHWELLE_VORBELEGUNG } from "@s1/domaene";

import { aufnahmeBerichtigen, nachrichtAufnehmen, nachrichtNachweisen, nachrichtenParameterSetzen } from "../../kontrakt/fmzschritte.js";
import { erledigt, erledigungZurueck, nachrichtZurueckziehen } from "../../kontrakt/nachrichtenschritte.js";
import { RG } from "./demofunk.js";
import { ausgangsschritte, eingangsschritte, type Demoausgang, type Demoeingang } from "./demonachrichtenweg.js";
import { DEMO_FUEST } from "./demostruktur.js";
import { STELLE, schrittAls, vorhandene, type Demoschritt, type Schrittentwurf, type Demostelle, type Demozeit } from "./drehbuch.js";

const TEL = "TEL Landkreis Oldenburg";
const ROT_S2 = { stelle: "S2", kopie: "ROT" } as const;
const gruen = (stelle: string): { stelle: string; kopie: "GRUEN" } => ({ stelle, kopie: "GRUEN" });
const blau = (stelle: string): { stelle: string; kopie: "BLAU" } => ({ stelle, kopie: "BLAU" });
const einheit = (id: string): { entitaet: "EINHEIT"; id: string } => ({ entitaet: "EINHEIT", id });

const AUSGAENGE: readonly Demoausgang[] = [
  {
    id: "demo-n-a1", minute: 20, verfasser: STELLE.s3, mittel: "TELEFON", gegenstelle: TEL, nummer: 1,
    anschrift: TEL, absender: "S3", betreff: "Führungsstelle arbeitsbereit",
    inhalt: "THW-Führungsstelle Oldenburg ist in den Weser-Ems-Hallen arbeitsbereit.\nErreichbar über Telefon 0441 5550100 und Rufgruppe THW_OL_FUE.",
  },
  {
    id: "demo-n-a2", minute: 44, verfasser: STELLE.s3, mittel: "FUNK", gegenstelle: "Heros Oldenburg 22/51", nummer: 3, vorrang: "SOFORT",
    anschrift: "1. Bergungsgruppe OV Oldenburg", anschriftBezug: einheit("demo-eh-b1-ol"), absender: "S3", betreff: "Einsatzauftrag Deich Achterdiek",
    inhalt: "Lage: Deich Achterdiek durchweicht zwischen km 3,2 und 3,6.\nAuftrag: Deichfuß mit Sandsäcken sichern, Material am Füllplatz Bauhof.\nMeldung bei Arbeitsbeginn und alle 60 Minuten.",
    kontakt: { einheitId: "demo-eh-b1-ol", rufgruppeId: RG.ea1 },
  },
  {
    id: "demo-n-a3", minute: 186, verfasser: STELLE.s3, mittel: "TELEFAX", gegenstelle: TEL, nummer: 6,
    anschrift: TEL, absender: "S3", betreff: "Anforderung zusätzlicher Pumpen",
    inhalt: "Klärwerk Wehnen droht vollzulaufen, Zulauf übersteigt die Förderleistung.\nBenötigt: eine weitere Fachgruppe Wasserschaden/Pumpen mit mindestens 5.000 l/min.\nEintreffen am Meldekopf Weser-Ems-Hallen.",
  },
  {
    id: "demo-n-a4", minute: 212, verfasser: STELLE.s3, mittel: "FUNK", gegenstelle: "Heros Oldenburg 24/61", nummer: 8, weitergeleitetVon: "demo-n-e3",
    anschrift: "Fachgruppe Wasserschaden/Pumpen OV Oldenburg", anschriftBezug: einheit("demo-eh-wp-ol"), absender: "S3", betreff: "Verstärkung Pumpen zugesagt",
    inhalt: "FGr WP OV Nordenham trifft in etwa 90 Minuten ein und übernimmt das Regenrückhaltebecken.\nEinweisung durch Abschnittsleiter EA 3.",
    kontakt: { einheitId: "demo-eh-wp-ol", rufgruppeId: RG.ea3 },
  },
  {
    id: "demo-n-a5", minute: 385, verfasser: STELLE.s1, mittel: "TELEFON", gegenstelle: "Regionalstelle Oldenburg", nummer: 10,
    anschrift: "Regionalstelle Oldenburg", absender: "S1", betreff: "Unfallmeldung",
    inhalt: "Ein Helfer OV Wardenburg mit Schnittverletzung an der Hand, Transport ins Klinikum Oldenburg.\nUnfallanzeige folgt, Angehörige sind durch den Ortsbeauftragten verständigt.",
  },
  {
    id: "demo-n-a6", minute: 672, verfasser: STELLE.s3, mittel: "TELEFON", gegenstelle: TEL, nummer: 13, vorrang: "SOFORT",
    anschrift: TEL, absender: "S3", betreff: "Anforderung Fachgruppe Elektroversorgung",
    inhalt: "Netzersatzanlage 50 kVA der FGr N ausgefallen, Einsatzstelle Sandkrug ohne Licht.\nBenötigt: Fachgruppe Elektroversorgung mit Netzersatzanlage.",
  },
  {
    id: "demo-n-a7", minute: 690, verfasser: STELLE.s2, mittel: "DFUE", gegenstelle: TEL, nummer: 14,
    anschrift: TEL, absender: "S2", betreff: "Lagemeldung zum Schichtwechsel",
    inhalt: "Kräfte: 15 Einheiten, 148 Einsatzkräfte.\nEA 1 und EA 2 halten, EA 3 fördert 20.000 l/min.\nEin Verletzter (leicht), Ausfall einer Netzersatzanlage, Ersatz ist angefordert.",
  },
  // --- unterwegs: in der FmZ angenommen, noch nicht befördert ---
  {
    id: "demo-n-a8", minute: 706, verfasser: STELLE.s3, mittel: "FUNK", gegenstelle: "Heros Westerstede 22/51", nummer: 0, bis: "angenommen",
    anschrift: "Bergungsgruppe OV Westerstede", anschriftBezug: einheit("demo-eh-b-we"), absender: "S3", betreff: "Kontrollgang Deichkrone",
    inhalt: "Deichkrone zwischen km 3,2 und 4,1 stündlich abgehen.\nSickerstellen sofort melden.",
    kontakt: { einheitId: "demo-eh-b-we", rufgruppeId: RG.ea1 },
  },
  // --- unterwegs: aufgegeben, liegt beim LdF ---
  {
    id: "demo-n-a9", minute: 714, verfasser: STELLE.s4, mittel: "FUNK", gegenstelle: "Heros Wilhelmshaven 31/40", nummer: 0, bis: "aufgegeben",
    anschrift: "Fachgruppe Logistik-Verpflegung OV Wilhelmshaven", anschriftBezug: einheit("demo-eh-logv"), absender: "S4", betreff: "Nachtverpflegung Sandkrug",
    inhalt: "60 Portionen Nachtverpflegung innerhalb von zwei Stunden an die Ausgabe Feuerwehrhaus Sandkrug.\nDavon 6 vegetarisch, 1 vegan.",
  },
];

const FUEST = DEMO_FUEST;

const EINGAENGE: readonly Demoeingang[] = [
  {
    id: "demo-n-e1", minute: 28, mittel: "TELEFON", gegenstelle: TEL, nummer: 2,
    anschrift: FUEST, absender: TEL, betreff: "Lage und Auftrag",
    inhalt: "Pegel Oldenburg-Drielake 3,82 m, steigend. Deich zwischen Achterdiek und Sandkrug gefährdet.\nAuftrag THW: Deichverteidigung in zwei Abschnitten, Pumpeneinsatz Klärwerk Wehnen.",
    verteiler: [ROT_S2, gruen("S3"), blau("LEITER")], kenntnis: [STELLE.s3, STELLE.s2, STELLE.leiter], erledigtVon: STELLE.s3,
  },
  {
    id: "demo-n-e2", minute: 92, mittel: "FUNK", gegenstelle: "Heros Oldenburg 22/51", nummer: 4, vorrang: "SOFORT",
    anschrift: FUEST, absender: "1. Bergungsgruppe OV Oldenburg", absenderBezug: einheit("demo-eh-b1-ol"), betreff: "Sickerstelle Deich-km 3,4",
    inhalt: "Sickerstelle am Deichfuß bei km 3,4, etwa zwei Meter breit, Wasser trüb.\nBenötigen 800 Sandsäcke und Vlies.",
    kontakt: { einheitId: "demo-eh-b1-ol", rufgruppeId: RG.ea1 },
    verteiler: [ROT_S2, gruen("S3"), blau("S4")], vermerke: "S4: Sandsäcke vom Füllplatz zuführen", kenntnis: [STELLE.s3, STELLE.s4, STELLE.s2], erledigtVon: STELLE.s3,
  },
  {
    id: "demo-n-e3", minute: 204, mittel: "TELEFAX", gegenstelle: TEL, nummer: 7, antwortAuf: "demo-n-a3",
    anschrift: FUEST, absender: TEL, betreff: "Zusage Pumpen",
    inhalt: "Fachgruppe Wasserschaden/Pumpen OV Nordenham ist alarmiert.\nEintreffen am Meldekopf in etwa 90 Minuten.",
    verteiler: [ROT_S2, gruen("S3"), blau("S1")], kenntnis: [STELLE.s3, STELLE.s1], erledigtVon: STELLE.s3,
  },
  {
    id: "demo-n-e4", minute: 370, mittel: "FUNK", gegenstelle: "Heros Wardenburg 22/51", nummer: 9, vorrang: "BLITZ",
    anschrift: FUEST, absender: "Bergungsgruppe OV Wardenburg", absenderBezug: einheit("demo-eh-b-wa"), betreff: "Verletzter Helfer",
    inhalt: "Ein Helfer mit stark blutender Schnittverletzung an der Hand.\nRettungsdienst an die Zufahrt Achterdiek, Einweiser steht an der Straße.",
    kontakt: { einheitId: "demo-eh-b-wa", rufgruppeId: RG.ea1 },
    verteiler: [ROT_S2, gruen("S1"), blau("LEITER"), blau("S3")], kenntnis: [STELLE.s1, STELLE.leiter, STELLE.s3, STELLE.s2], erledigtVon: STELLE.s1,
  },
  {
    id: "demo-n-e5", minute: 418, mittel: "TELEFON", gegenstelle: "Pegeldienst NLWKN", nummer: 11,
    anschrift: FUEST, absender: "Pegeldienst NLWKN", betreff: "Pegel Drielake",
    inhalt: "Pegel Oldenburg-Drielake 4,15 m, weiter steigend.\nScheitel wird in drei bis vier Stunden erwartet.",
    verteiler: [ROT_S2, gruen("S3"), blau("LEITER")], kenntnis: [STELLE.s3, STELLE.s2],
  },
  {
    id: "demo-n-e6", minute: 660, mittel: "FUNK", gegenstelle: "Heros Oldenburg 23/61", nummer: 12, vorrang: "SOFORT",
    anschrift: FUEST, absender: "FGr N OV Oldenburg", absenderBezug: einheit("demo-eh-n-ol"), betreff: "Ausfall Netzersatzanlage",
    inhalt: "Netzersatzanlage 50 kVA mit Motorschaden ausgefallen.\nEinsatzstelle Sandkrug ohne Licht, Arbeiten am Deichfuß eingestellt.",
    kontakt: { einheitId: "demo-eh-n-ol", rufgruppeId: RG.ea2 },
    verteiler: [ROT_S2, gruen("S3"), blau("S4")], kenntnis: [STELLE.s3, STELLE.s4],
  },
  // --- gesichtet und verteilt, aber noch von niemandem gelesen ---
  {
    id: "demo-n-e7", minute: 696, mittel: "TELEFON", gegenstelle: "PI Oldenburg-Stadt/Ammerland", nummer: 15, bis: "gesichtet",
    anschrift: FUEST, absender: "Polizei, Verbindungsbeamter", betreff: "Sperrung Sandkruger Straße",
    inhalt: "Sandkruger Straße ab sofort zwischen Bümmersteder Tredde und Bahnübergang voll gesperrt.\nZufahrt EA 2 nur noch über die Hatter Landstraße.",
    verteiler: [ROT_S2, gruen("S3"), blau("S4")],
  },
  // --- unterwegs: vom LdF weitergegeben, liegt vor dem Sichter ---
  {
    id: "demo-n-e8", minute: 703, mittel: "FUNK", gegenstelle: "Heros Oldenburg 24/61", nummer: 16, bis: "weitergegeben",
    anschrift: FUEST, absender: "FGr WP OV Oldenburg", absenderBezug: einheit("demo-eh-wp-ol"), betreff: "Wasserstand Klärwerk fällt",
    inhalt: "Wasserstand im Zulauf des Klärwerks seit einer Stunde um 12 cm gefallen.\nFörderleistung wird beibehalten.",
    kontakt: { einheitId: "demo-eh-wp-ol", rufgruppeId: RG.ea3 }, verteiler: [],
  },
  {
    id: "demo-n-e9", minute: 711, mittel: "FUNK", gegenstelle: "Heros Delmenhorst 22/51", nummer: 17, vorrang: "SOFORT", bis: "weitergegeben",
    anschrift: FUEST, absender: "Bergungsgruppe OV Delmenhorst", absenderBezug: einheit("demo-eh-b-de"), betreff: "Deichfuß rutscht",
    inhalt: "Deichfuß bei Sandkrug rutscht auf etwa zehn Metern Länge.\nBenötigen sofort Licht und weitere 20 Einsatzkräfte.",
    kontakt: { einheitId: "demo-eh-b-de", rufgruppeId: RG.ea2 }, verteiler: [],
  },
  // --- unterwegs: aufgenommen, liegt beim LdF ---
  {
    id: "demo-n-e10", minute: 717, mittel: "TELEFON", gegenstelle: "Pegeldienst NLWKN", nummer: 0, bis: "aufgenommen",
    anschrift: FUEST, absender: "Pegeldienst NLWKN", betreff: "Pegel Drielake",
    inhalt: "Pegel Oldenburg-Drielake 4,21 m, Anstieg flacht ab.\nScheitel wird innerhalb der nächsten Stunde erwartet.",
    verteiler: [],
  },
];

/** Die Gesprächsnotiz: selbst verteilt, von der FmZ nur nachgewiesen. */
function gespraechsnotiz(zeit: Demozeit): Demoschritt[] {
  const id = "demo-n-g1";
  const sichtung = { zeitpunkt: zeit.um(115), handzeichen: STELLE.s4.handzeichen, verteiler: [ROT_S2, { stelle: "S3", kopie: "BLAU" }] };
  const anlage = {
    nachrichtId: id, richtung: "AUSGANG" as const, gespraechsnotiz: true, rufnummer: "0441 5550777", abfassungszeit: zeit.um(115),
    anschrift: "Bauhof Stadt Oldenburg", absender: "S4", betreff: "Sandlieferung",
    inhalt: "Bauhof liefert 60 t Sand in drei Fuhren an den Füllplatz, erste Fuhre in 30 Minuten.\nAnsprechpartner vor Ort: Herr Kramer.",
  };
  return [
    schrittAls(STELLE.s4, 115, nachrichtAufnehmen(anlage, { sichtung })),
    schrittAls(STELLE.fm1, 118, nachrichtNachweisen(id, null, { nummer: 5, zeitpunkt: zeit.um(118), handzeichen: STELLE.fm1.handzeichen })),
  ];
}

/** Ein Schritt, wenn der Schrittbauer einen Entwurf geliefert hat. */
function falls(stelle: Demostelle, minute: number, entwurf: Schrittentwurf | undefined): Demoschritt | undefined {
  return entwurf === undefined ? undefined : schrittAls(stelle, minute, entwurf);
}

/** Was neben dem geraden Weg vorkommt: Parameter, Vermerk, Berichtigung, Zurückziehen, zurückgenommene Erledigung. */
function sonderfaelle(einsatzId: string, zeit: Demozeit): Demoschritt[] {
  const zurueckgezogen: Demoausgang = {
    id: "demo-n-a10", minute: 470, verfasser: STELLE.s4, mittel: "TELEFON", gegenstelle: "Fleischerei Meyer", nummer: 0, bis: "aufgegeben",
    anschrift: "Fleischerei Meyer, Sandkrug", absender: "S4", betreff: "Bestellung Abendverpflegung",
    inhalt: "50 Portionen Abendverpflegung für die Ausgabe Feuerwehrhaus Sandkrug.",
  };
  const aufnahmeE5 = { mittel: "TELEFON", zeitpunkt: zeit.um(418), handzeichen: STELLE.fm1.handzeichen };
  return vorhandene([
    falls(STELLE.s1, 2, nachrichtenParameterSetzen(einsatzId, "ldfStation", null, true)),
    falls(STELLE.ldf, 6, nachrichtenParameterSetzen(einsatzId, "fmzSchwelleMinuten", FMZ_SCHWELLE_VORBELEGUNG, 15)),
    schrittAls(STELLE.sichter, 380, { typ: "NachrichtVermerkt", nutzlast: { nachrichtId: "demo-n-e4" }, vorher: null, neu: "Helfer ist im Klinikum, Unfallmeldung durch S1" }),
    schrittAls(STELLE.fm1, 425, aufnahmeBerichtigen("demo-n-e5", aufnahmeE5, { ...aufnahmeE5, mittel: "TELEFAX" }, "Kam als Fax, nicht als Anruf")),
    ...ausgangsschritte(zurueckgezogen, zeit),
    schrittAls(STELLE.s4, 478, nachrichtZurueckziehen("demo-n-a10", "Lieferant hat telefonisch abgesagt")),
    // S4 hakt den Ausfall der Netzersatzanlage ab und nimmt es zurück: Der Ersatz ist noch nicht da.
    schrittAls(STELLE.s4, 675, erledigt("demo-n-e6", "S4")),
    schrittAls(STELLE.s4, 688, erledigungZurueck("demo-n-e6", "S4")),
  ]);
}

export function nachrichtenschritte(einsatzId: string, zeit: Demozeit): Demoschritt[] {
  return [
    ...AUSGAENGE.flatMap((n) => ausgangsschritte(n, zeit)),
    ...EINGAENGE.flatMap((n) => eingangsschritte(n, zeit)),
    ...gespraechsnotiz(zeit),
    ...sonderfaelle(einsatzId, zeit),
  ];
}
