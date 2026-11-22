/**
 * Demo-Einsatz: der Verlauf — was über die zwölf Stunden an der Lage geschieht.
 *
 * Anforderungen und Ablösung, Aufteilen und Zusammenführen, Stärke- und
 * Zeitänderungen, ein aufgelöster Abschnitt, eine doppelt erfasste Einheit,
 * ein abgerückter Trupp und die freien Einträge des Einsatztagebuchs.
 *
 * Stärken, Fahrzeuge und Meldungen stehen in den Erfassungsbögen; die
 * Schritte lesen sie deshalb beim Abspielen aus dem Zustand.
 */

import { ARCHIV_ABSCHNITT_ID, type Staerke, type Tabellenzeile } from "@s1/domaene";

import {
  abloesungZugesagt,
  anforderungAnlegen,
  anforderungErledigt,
  anforderungGeaendert,
  anforderungStorniert,
  aufteilung,
  einheitWiederhergestellt,
  entfernung,
  meldeStatusGesetzt,
  zusammenfuehrung,
} from "../../kontrakt/bedienschritte.js";
import { einheitsanlage } from "../../kontrakt/einheitsanlage.js";
import { auftragBeenden, auftragErfassen } from "../../kontrakt/einheitsteile.js";
import { EH, type Demoeinheit } from "./demoeinheiten.js";
import { TRUPP_FUELLPLATZ } from "./demofunk.js";
import { AB } from "./demostruktur.js";
import { fahrzeugeDer, meldungDer } from "./demoteile.js";
import { STELLE, schrittAls, type Demoschritt, type Demozeit, type Entwurfsbauer, type Schrittentwurf } from "./drehbuch.js";
import { statusNeu, zelleNeu } from "./zelle.js";

const s1 = (minute: number, entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s1, minute, entwurf);
const s3 = (minute: number, entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s3, minute, entwurf);

function anforderungen(zeit: Demozeit): Demoschritt[] {
  return [
    // Erledigt: Boote und Pumpen, eingetroffen als FGr W OV Leer.
    s1(190, anforderungAnlegen({ anforderungId: "demo-an-1", kennung: "A-01", vorgeseheneEinheitText: "Fachgruppe Wassergefahren", vorgesehenerAuftrag: "Regenrückhaltebecken Wehnen sichern", angefordertAm: zeit.um(190) })),
    s1(205, abloesungZugesagt("demo-an-1", zeit.um(290), "Regionalstelle Oldenburg")),
    s1(292, anforderungErledigt("demo-an-1", zeit.um(290), EH.wLe.id)),
    // Storniert.
    s1(220, anforderungAnlegen({ anforderungId: "demo-an-2", kennung: "A-02", vorgeseheneEinheitText: "Hubschrauber zur Deichbeobachtung", vorgesehenerAuftrag: "Deichlinie Achterdiek bis Sandkrug abfliegen", angefordertAm: zeit.um(220) })),
    s1(280, anforderungStorniert("demo-an-2", "Aufklärungstrupp Luft der Feuerwehr übernimmt die Beobachtung mit der Drohne")),
    // Ablösung: zugesagt und eingetroffen, die abgelöste Gruppe ruht.
    s1(400, anforderungAnlegen({ anforderungId: "demo-an-3", kennung: "A-03", abzuloesendeEinheitId: EH.bOl.id, vorgeseheneEinheitText: "Bergungsgruppe OV Westerstede", vorgesehenerAuftrag: "Deichverteidigung Achterdiek übernehmen", angefordertAm: zeit.um(400) })),
    s1(430, abloesungZugesagt("demo-an-3", zeit.um(570), "Regionalstelle Oldenburg")),
    s1(566, anforderungErledigt("demo-an-3", zeit.um(560), EH.bWe.id)),
    // Zugesagt, noch nicht da.
    s1(668, anforderungAnlegen({ anforderungId: "demo-an-4", kennung: "A-04", vorgeseheneEinheitText: "Fachgruppe Elektroversorgung", vorgesehenerAuftrag: "Stromversorgung Einsatzstelle Sandkrug", angefordertAm: zeit.um(668), bemerkung: "Ersatz für die ausgefallene Netzersatzanlage" })),
    s1(686, abloesungZugesagt("demo-an-4", zeit.um(780), "Leitungs- und Koordinierungsstab LV HB/NI")),
    // Offen.
    s1(680, anforderungAnlegen({ anforderungId: "demo-an-5", kennung: "A-05", vorgeseheneEinheitText: "Verpflegungstrupp", vorgesehenerAuftrag: "Nachtverpflegung Ausgabe Sandkrug", angefordertAm: zeit.um(680) })),
    s1(695, anforderungGeaendert("demo-an-5", "bemerkung", null, "DRK prüft, Rückmeldung bis zur vollen Stunde zugesagt")),
  ];
}

/** Die Quelle einer Aufteilung, wie die Tabelle sie zeigt — `aufteilung` liest davon nur Kennung und Stärke. */
function quelle(einheitId: string, staerke: Staerke): Tabellenzeile {
  return { einheitId, staerke } as Tabellenzeile;
}

interface Abteilung {
  readonly von: Demoeinheit;
  readonly neueEinheitId: string;
  readonly bezeichnung: string;
  readonly staerke: Staerke;
  readonly abschnittId: string;
  readonly ebene: string;
}

/** Teilt ab, gegen die Stärke, die die Quelle beim Abspielen hat — sie kommt aus dem Bogen. */
function abteilen(a: Abteilung, reihenfolge: number): Entwurfsbauer {
  return (zustand) => {
    const einheit = zustand.einheiten[a.von.id];
    if (einheit === undefined) return undefined;
    return aufteilung({
      quelle: quelle(a.von.id, einheit.wirksameStaerke),
      neueEinheitId: a.neueEinheitId,
      bezeichnung: a.bezeichnung,
      abgeteilteStaerke: a.staerke,
      abschnittId: a.abschnittId,
      reihenfolge,
      organisation: einheit.organisation.wert ?? "SONSTIGE",
      ebene: a.ebene,
    });
  };
}

function teilungen(): Demoschritt[] {
  const transport: Staerke = { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 };
  const TRUPP_TRANSPORT = "demo-eh-fwamm-trupp";
  return [
    // Bleibt abgeteilt: ein Trupp der Bergungsgruppe OV Oldenburg am Sandsackfüllplatz.
    s3(200, abteilen({ von: EH.bOl, neueEinheitId: TRUPP_FUELLPLATZ, bezeichnung: "Trupp Sandsackausgabe", staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 2 }, abschnittId: AB.fuellplatz, ebene: "TRUPP" }, 40)),
    s3(201, statusNeu(TRUPP_FUELLPLATZ, "IM_EINSATZ")),
    // Abgeteilt und später mit der Löschgruppe Emden zusammengeführt: der Transporttrupp des Fachzugs.
    s3(250, abteilen({ von: EH.fwAmm, neueEinheitId: TRUPP_TRANSPORT, bezeichnung: "Trupp Sandsacktransport", staerke: transport, abschnittId: AB.ea2, ebene: "TRUPP" }, 41)),
    s3(251, statusNeu(TRUPP_TRANSPORT, "IM_EINSATZ")),
    s3(500, zusammenfuehrung(EH.fwEmd.id, [quelle(TRUPP_TRANSPORT, transport)])),
  ];
}

function aenderungen(zeit: Demozeit): Demoschritt[] {
  const doppelt = "demo-eh-doppelt";
  return [
    // Von Hand angelegt, obwohl die Gruppe schon mit Bogen da ist — entfernt. Und eine zu Unrecht entfernte, wiederhergestellt.
    s1(50, einheitsanlage({ einheitId: doppelt, abschnittId: AB.angefordert, bezeichnung: "Bergungsgruppe", organisation: "THW", ebene: "GRUPPE", staerke: { fuehrer: 0, unterfuehrer: 2, mannschaft: 7 }, reihenfolge: 42, herkunft: "OV Nordenham" })),
    s1(53, entfernung(doppelt, "Doppelt erfasst, die Bergungsgruppe OV Nordenham ist bereits mit Erfassungsbogen angemeldet")),
    s1(123, entfernung(EH.pol.id, "Verwechslung mit dem Verbindungsbeamten der Bundespolizei")),
    s1(125, einheitWiederhergestellt(EH.pol.id)),
    // Ein Helfer verletzt: Die Stärke sinkt, mit Meldezeit.
    s1(380, (zustand) => {
      const vorher = zustand.einheiten[EH.bNh.id]?.staerke.wert;
      if (vorher === undefined || vorher === null) return undefined;
      return { typ: "StaerkeGeaendert", nutzlast: { einheitId: EH.bNh.id, meldezeit: zeit.um(375) }, vorher, neu: { ...vorher, mannschaft: vorher.mannschaft - 1 } };
    }),
    s1(381, zelleNeu("bemerkung", EH.bNh.id, (e) => e.bemerkung?.wert, "Ein Helfer mit Schnittverletzung ins Klinikum, ambulant versorgt")),
    // Ablösung: Die Bergungsgruppe OV Oldenburg übergibt, ihr Auftrag endet, die Ablösung übernimmt.
    s3(570, zelleNeu("verfuegbarBis", EH.bOl.id, (e) => e.verfuegbarBis?.wert, zeit.um(600))),
    s3(598, auftragBeenden(`${EH.bOl.id}-auftrag-1`, undefined, zeit.um(598))),
    s3(599, { typ: "EinheitVerschoben", nutzlast: { einheitId: EH.bWe.id, kommentar: "Löst die Bergungsgruppe OV Oldenburg ab" }, vorher: AB.bereitstellung, neu: AB.ea1 }),
    s3(600, statusNeu(EH.bWe.id, "IM_EINSATZ")),
    s3(600, auftragErfassen({ auftragId: `${EH.bWe.id}-auftrag-1`, einheitId: EH.bWe.id, text: "Deichverteidigung Achterdiek, Sandsackverbau Deich-km 3,2 bis 3,6 fortführen", von: zeit.um(600), abschnittId: AB.ea1 })),
    // Rückmarsch der Löschgruppe: Einsatzende und Rückführung als Zeiten.
    s3(640, zelleNeu("einsatzendeAm", EH.fwEmd.id, (e) => e.einsatzendeAm?.wert, zeit.um(640))),
    s3(641, zelleNeu("rueckfuehrungAm", EH.fwEmd.id, (e) => e.rueckfuehrungAm?.wert, zeit.um(700))),
    // Die Netzersatzanlage der FGr N fällt aus.
    s3(658, (zustand) => {
      const nea = fahrzeugeDer(zustand, EH.nOl.id, "NEA")[0];
      return nea === undefined ? undefined : { typ: "FahrzeugGeaendert", nutzlast: { fahrzeugId: nea.id, feld: "status" }, vorher: nea.status?.wert ?? null, neu: "NICHT_EINSATZBEREIT" };
    }),
    // Die Erkundung ist beendet: Der Abschnitt wird aufgelöst.
    s3(400, { typ: "AbschnittAufgeloest", nutzlast: { abschnittId: AB.erkundung }, vorher: null, neu: { zielAbschnittId: AB.ea2, aufgeloestAm: zeit.um(400) } }),
  ];
}

/** Der Aufklärungstrupp Luft rückt ab: Meldestatus im Eingangskorb, dann ins Archiv — er zählt nicht mehr. */
function abgerueckt(): Demoschritt[] {
  const id = EH.uav.id;
  return [
    s1(398, (zustand) => {
      const meldung = meldungDer(zustand, id);
      return meldung === undefined ? undefined : meldeStatusGesetzt(meldung.id, meldung.meldeStatus?.wert ?? null, "ABGERUECKT");
    }),
    s1(410, (zustand) => {
      const einheit = zustand.einheiten[id];
      return einheit === undefined ? undefined : { typ: "EinheitArchiviert", nutzlast: { einheitId: id }, vorher: einheit.abschnittId.wert, neu: ARCHIV_ABSCHNITT_ID };
    }),
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
    eintrag(372, "5", "Funk: Bergungsgruppe OV Nordenham meldet einen verletzten Helfer, Schnittverletzung an der Hand, Transport durch Rettungsdienst.", { entitaet: "EINHEIT", id: EH.bNh.id }),
    eintrag(420, "6", "Telefon: Pegel Oldenburg-Drielake 4,05 m, weiter steigend."),
    schrittAls(STELLE.s2, 426, {
      typ: "EtbEintragBerichtigt",
      nutzlast: { etbId: "demo-etb-6b", berichtigtEintragId: "demo-etb-6", zeitpunkt: zeit.um(420), text: "Telefon: Pegel Oldenburg-Drielake 4,15 m, weiter steigend." },
      grund: "Zahlendreher bei der Aufnahme",
    }),
    eintrag(530, "7", "Lagebesprechung zum Schichtwechsel: Nachtschicht übernimmt, Ablösung für EA 1 ist im Bereitstellungsraum."),
    eintrag(662, "8", "Funk: FGr N meldet Ausfall der Netzersatzanlage, Einsatzstelle Sandkrug ohne Licht.", { entitaet: "EINHEIT", id: EH.nOl.id }),
    eintrag(710, "9", "Telefon: Pegel Oldenburg-Drielake 4,21 m, Anstieg flacht ab."),
  ];
}

export function verlaufsschritte(zeit: Demozeit): Demoschritt[] {
  return [...anforderungen(zeit), ...teilungen(), ...aenderungen(zeit), ...abgerueckt(), ...tagebuch(zeit)];
}
