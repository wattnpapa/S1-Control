/**
 * Demo-Einsatz: der Verlauf — was über die zwölf Stunden an der Lage geschieht.
 *
 * Anforderungen und Ablösung, Aufteilen und Zusammenführen, Stärke- und
 * Zeitänderungen, ein aufgelöster Abschnitt, eine doppelt erfasste Einheit
 * und die freien Einträge des Einsatztagebuchs.
 */

import type { Staerke, Tabellenzeile } from "@s1/domaene";

import {
  abloesungZugesagt,
  anforderungAnlegen,
  anforderungErledigt,
  anforderungGeaendert,
  anforderungStorniert,
  aufteilung,
  einheitWiederhergestellt,
  entfernung,
  zusammenfuehrung,
} from "../../kontrakt/bedienschritte.js";
import { einheitsanlage } from "../../kontrakt/einheitsanlage.js";
import { auftragBeenden, auftragErfassen } from "../../kontrakt/einheitsteile.js";
import { AB } from "./demostruktur.js";
import { STELLE, schrittAls, type Demoschritt, type Schrittentwurf, type Demozeit } from "./drehbuch.js";
import { zelle } from "./zelle.js";

const s1 = (minute: number, entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s1, minute, entwurf);
const s3 = (minute: number, entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s3, minute, entwurf);

function anforderungen(zeit: Demozeit): Demoschritt[] {
  return [
    // Erledigt: zusätzliche Pumpen, eingetroffen als FGr WP OV Nordenham.
    s1(190, anforderungAnlegen({ anforderungId: "demo-an-1", kennung: "A-01", vorgeseheneEinheitText: "Fachgruppe Wasserschaden/Pumpen", vorgesehenerAuftrag: "Lenzen Regenrückhaltebecken Wehnen", angefordertAm: zeit.um(190) })),
    s1(205, abloesungZugesagt("demo-an-1", zeit.um(290), "Regionalstelle Oldenburg")),
    s1(292, anforderungErledigt("demo-an-1", zeit.um(290), "demo-eh-wp-nh")),
    // Storniert.
    s1(220, anforderungAnlegen({ anforderungId: "demo-an-2", kennung: "A-02", vorgeseheneEinheitText: "Hubschrauber zur Deichbeobachtung", vorgesehenerAuftrag: "Deichlinie Achterdiek bis Sandkrug abfliegen", angefordertAm: zeit.um(220) })),
    s1(280, anforderungStorniert("demo-an-2", "Drohne der Feuerwehr übernimmt die Beobachtung")),
    // Ablösung: zugesagt und eingetroffen, die abgelöste Gruppe ruht.
    s1(400, anforderungAnlegen({ anforderungId: "demo-an-3", kennung: "A-03", abzuloesendeEinheitId: "demo-eh-b1-ol", vorgeseheneEinheitText: "Bergungsgruppe OV Westerstede", vorgesehenerAuftrag: "Deichverteidigung Achterdiek übernehmen", angefordertAm: zeit.um(400) })),
    s1(430, abloesungZugesagt("demo-an-3", zeit.um(570), "Regionalstelle Oldenburg")),
    s1(566, anforderungErledigt("demo-an-3", zeit.um(560), "demo-eh-b-we")),
    // Zugesagt, noch nicht da.
    s1(668, anforderungAnlegen({ anforderungId: "demo-an-4", kennung: "A-04", vorgeseheneEinheitText: "Fachgruppe Elektroversorgung", vorgesehenerAuftrag: "Stromversorgung Einsatzstelle Sandkrug", angefordertAm: zeit.um(668), bemerkung: "Ersatz für ausgefallene NEA 50 kVA" })),
    s1(686, abloesungZugesagt("demo-an-4", zeit.um(780), "Leitungs- und Koordinierungsstab LV HB/NI")),
    // Offen.
    s1(680, anforderungAnlegen({ anforderungId: "demo-an-5", kennung: "A-05", vorgeseheneEinheitText: "Verpflegungstrupp", vorgesehenerAuftrag: "Nachtverpflegung Ausgabe Sandkrug", angefordertAm: zeit.um(680) })),
    s1(695, anforderungGeaendert("demo-an-5", "bemerkung", null, "JUH prüft, Rückmeldung bis zur vollen Stunde zugesagt")),
  ];
}

/** Die Quelle einer Aufteilung, wie die Tabelle sie zeigt — `aufteilung` liest davon nur Kennung und Stärke. */
function quelle(einheitId: string, staerke: Staerke): Tabellenzeile {
  return { einheitId, staerke } as Tabellenzeile;
}

function teilungen(): Demoschritt[] {
  const trupp: Staerke = { fuehrer: 0, unterfuehrer: 1, mannschaft: 2 };
  const transport: Staerke = { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 };
  return [
    // Bleibt abgeteilt: ein Trupp der 1. Bergungsgruppe am Sandsackfüllplatz.
    s3(200, aufteilung({ quelle: quelle("demo-eh-b1-ol", { fuehrer: 0, unterfuehrer: 2, mannschaft: 7 }), neueEinheitId: "demo-eh-b1-ol-tr", bezeichnung: "Trupp Sandsackfüllmaschine", abgeteilteStaerke: trupp, abschnittId: AB.fuellplatz, reihenfolge: 30, organisation: "THW", ebene: "TRUPP" })),
    s3(201, zelle("status", "demo-eh-b1-ol-tr", "ANGEFORDERT", "IM_EINSATZ")),
    // Abgeteilt und später mit der Löschgruppe Ohmstede zusammengeführt: der Transporttrupp des Löschzugs.
    s3(250, aufteilung({ quelle: quelle("demo-eh-ff-wa", { fuehrer: 1, unterfuehrer: 3, mannschaft: 18 }), neueEinheitId: "demo-eh-ff-wa-tr", bezeichnung: "Trupp Sandsacktransport", abgeteilteStaerke: transport, abschnittId: AB.ea2, reihenfolge: 31, organisation: "FEUERWEHR", ebene: "TRUPP" })),
    s3(251, zelle("status", "demo-eh-ff-wa-tr", "ANGEFORDERT", "IM_EINSATZ")),
    s3(500, zusammenfuehrung("demo-eh-ff-ol", [quelle("demo-eh-ff-wa-tr", transport)])),
  ];
}

function aenderungen(zeit: Demozeit): Demoschritt[] {
  const vorStaerke: Staerke = { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 };
  return [
    // Doppelt erfasst, entfernt — und eine zweite, zu Unrecht entfernte, wiederhergestellt.
    s1(11, einheitsanlage({ einheitId: "demo-eh-doppelt", abschnittId: AB.angefordert, bezeichnung: "Bergungsgruppe", organisation: "THW", ebene: "GRUPPE", staerke: vorStaerke, reihenfolge: 40, herkunft: "OV Wardenburg" })),
    s1(13, entfernung("demo-eh-doppelt", "Doppelt erfasst, steht bereits als Bergungsgruppe OV Wardenburg in der Liste")),
    s1(123, entfernung("demo-eh-pol", "Verwechslung mit dem Verbindungsbeamten der Bundespolizei")),
    s1(125, einheitWiederhergestellt("demo-eh-pol")),
    // Ein Helfer verletzt: Die Stärke sinkt, mit Meldezeit.
    s1(380, { typ: "StaerkeGeaendert", nutzlast: { einheitId: "demo-eh-b-wa", meldezeit: zeit.um(375) }, vorher: vorStaerke, neu: { fuehrer: 0, unterfuehrer: 1, mannschaft: 7 } }),
    s1(381, zelle("bemerkung", "demo-eh-b-wa", null, "Ein Helfer mit Schnittverletzung ins Klinikum, ambulant versorgt")),
    // Ablösung: Die 1. Bergungsgruppe übergibt, ihr Auftrag endet, die Ablösung übernimmt.
    s3(570, zelle("verfuegbarBis", "demo-eh-b1-ol", null, zeit.um(600))),
    s3(598, auftragBeenden("demo-eh-b1-ol-auftrag-1", undefined, zeit.um(598))),
    s3(599, { typ: "EinheitVerschoben", nutzlast: { einheitId: "demo-eh-b-we", kommentar: "Löst 1. Bergungsgruppe OV Oldenburg ab" }, vorher: AB.bereitstellung, neu: AB.ea1 }),
    s3(600, zelle("status", "demo-eh-b-we", "EINSATZBEREIT", "IM_EINSATZ")),
    s3(600, auftragErfassen({ auftragId: "demo-eh-b-we-auftrag-1", einheitId: "demo-eh-b-we", text: "Deichverteidigung Achterdiek, Sandsackverbau km 3,2 bis 3,6 fortführen", von: zeit.um(600), abschnittId: AB.ea1 })),
    // Rückmarsch der Löschgruppe: Einsatzende und Rückführung als Zeiten.
    s3(640, zelle("einsatzendeAm", "demo-eh-ff-ol", null, zeit.um(640))),
    s3(641, zelle("rueckfuehrungAm", "demo-eh-ff-ol", null, zeit.um(700))),
    // Die Netzersatzanlage fällt aus.
    s3(658, { typ: "FahrzeugGeaendert", nutzlast: { fahrzeugId: "demo-eh-n-ol-fz-2", feld: "status" }, vorher: "EINSATZBEREIT", neu: "NICHT_EINSATZBEREIT" }),
    // Die Erkundung ist beendet: Der Abschnitt wird aufgelöst.
    s3(400, { typ: "AbschnittAufgeloest", nutzlast: { abschnittId: AB.erkundung }, vorher: null, neu: { zielAbschnittId: AB.ea2, aufgeloestAm: zeit.um(400) } }),
  ];
}

function tagebuch(zeit: Demozeit): Demoschritt[] {
  const eintrag = (minute: number, kennung: string, text: string, bezug?: { entitaet: "EINHEIT" | "ABSCHNITT"; id: string }): Demoschritt =>
    schrittAls(STELLE.s2, minute, { typ: "EtbEintragErfasst", nutzlast: { etbId: `demo-etb-${kennung}`, zeitpunkt: zeit.um(minute), text, ...(bezug === undefined ? {} : { bezug }) } });
  return [
    eintrag(2, "1", "Telefon: TEL Landkreis Oldenburg alarmiert die Führungsstelle. Auftrag: Deichverteidigung an der Hunte zwischen Achterdiek und Sandkrug."),
    eintrag(16, "2", "Telefon: Pegel Oldenburg-Drielake 3,82 m, steigend. Scheitel wird in etwa zehn Stunden erwartet."),
    eintrag(65, "3", "Lagebesprechung: Schwerpunkt EA 1. Sickerstelle bei Deich-km 3,4 wird vorrangig gesichert.", { entitaet: "ABSCHNITT", id: AB.ea1 }),
    eintrag(185, "4", "Lagebesprechung: Klärwerk Wehnen droht vollzulaufen, zusätzliche Pumpen angefordert.", { entitaet: "ABSCHNITT", id: AB.ea3 }),
    eintrag(372, "5", "Funk: Bergungsgruppe OV Wardenburg meldet einen verletzten Helfer, Schnittverletzung an der Hand, Transport durch Rettungsdienst.", { entitaet: "EINHEIT", id: "demo-eh-b-wa" }),
    eintrag(420, "6", "Telefon: Pegel Oldenburg-Drielake 4,05 m, weiter steigend."),
    schrittAls(STELLE.s2, 426, {
      typ: "EtbEintragBerichtigt",
      nutzlast: { etbId: "demo-etb-6b", berichtigtEintragId: "demo-etb-6", zeitpunkt: zeit.um(420), text: "Telefon: Pegel Oldenburg-Drielake 4,15 m, weiter steigend." },
      grund: "Zahlendreher bei der Aufnahme",
    }),
    eintrag(530, "7", "Lagebesprechung zum Schichtwechsel: Nachtschicht übernimmt, Ablösung für EA 1 ist im Bereitstellungsraum."),
    eintrag(662, "8", "Funk: FGr N meldet Ausfall der Netzersatzanlage 50 kVA, Einsatzstelle Sandkrug ohne Licht.", { entitaet: "EINHEIT", id: "demo-eh-n-ol" }),
    eintrag(710, "9", "Telefon: Pegel Oldenburg-Drielake 4,21 m, Anstieg flacht ab."),
  ];
}

export function verlaufsschritte(zeit: Demozeit): Demoschritt[] {
  return [...anforderungen(zeit), ...teilungen(), ...aenderungen(zeit), ...tagebuch(zeit)];
}
