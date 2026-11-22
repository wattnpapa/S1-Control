/**
 * Demo-Einsatz: der Funkplan — Rufgruppen, Zuordnung, Funkproben.
 *
 * Die Rufgruppen stehen fest; welche Einheit auf welcher Gruppe arbeitet,
 * folgt aus ihrem Abschnitt. Die Funkproben laufen in Runden über den
 * Einsatz, mit einzelnen Proben ohne Kontakt, damit der Funkplan auch seine
 * Warnungen zeigt.
 */

import { FUNK_KONTAKT_SCHWELLE_VORBELEGUNG } from "@s1/domaene";

import {
  funkSchwelleSetzen,
  funkhinweisDerEinheit,
  funkprobe,
  funkrufnameUeberschreiben,
  rufgruppeAnlegen,
  rufgruppeAufgeloest,
  rufgruppeDerEinheit,
  rufgruppeGeaendert,
  rufgruppeWiederhergestellt,
  weitereRufgruppenDerEinheit,
  type Rufgruppenanlage,
} from "../../kontrakt/funkschritte.js";
import { DEMO_EINHEITEN, EH, type Demoeinheit } from "./demoeinheiten.js";
import { AB } from "./demostruktur.js";
import { STELLE, schrittAls, vorhandene, type Demoschritt, type Schrittentwurf, type Demozeit } from "./drehbuch.js";

/** Die Rufgruppen des Demo-Einsatzes. */
export const RG = {
  fuehrung: "demo-rg-fue",
  ea1: "demo-rg-ea1",
  ea2: "demo-rg-ea2",
  ea3: "demo-rg-ea3",
  logistik: "demo-rg-log",
  dmo: "demo-rg-dmo",
  analog: "demo-rg-2m",
  erkundung: "demo-rg-erk",
} as const;

const RUFGRUPPEN: readonly Rufgruppenanlage[] = [
  { rufgruppeId: RG.fuehrung, betriebsart: "TMO", name: "THW_OL_FUE", zweck: "Führung: Führungsstelle und Abschnittsleiter", hoert: "FmZ der Führungsstelle: Fm1 und LdF" },
  { rufgruppeId: RG.ea1, betriebsart: "TMO", name: "THW_OL_EA1", zweck: "Einsatzabschnitt 1 Deich Nord", hoert: "Abschnittsleiter EA 1", abschnittId: AB.ea1 },
  { rufgruppeId: RG.ea2, betriebsart: "TMO", name: "THW_OL_EA2", zweck: "Einsatzabschnitt 2 Deich Süd", hoert: "Abschnittsleiter EA 2", abschnittId: AB.ea2 },
  { rufgruppeId: RG.ea3, betriebsart: "TMO", name: "THW_OL_EA3", zweck: "Einsatzabschnitt 3 Pumpen", hoert: "Abschnittsleiter EA 3", abschnittId: AB.ea3 },
  { rufgruppeId: RG.logistik, betriebsart: "TMO", name: "THW_OL_LOG", zweck: "Logistik, Verpflegung, Transporte", hoert: "Fm2", abschnittId: AB.logistik },
  { rufgruppeId: RG.dmo, betriebsart: "DMO", name: "307_F*", zweck: "Einsatzstellenfunk am Deichfuß (kein Netz)", gateway: "GKW OV Oldenburg", bemerkung: "Reichweite nur innerhalb des Abschnitts" },
  { rufgruppeId: RG.analog, betriebsart: "ANALOG", name: "Kanal 50 W/U", zweck: "2-m-Band Feuerwehr, Rückfallebene", hoert: "Fm3" },
  { rufgruppeId: RG.erkundung, betriebsart: "TMO", name: "THW_OL_ERK", zweck: "Erkundung Hunte-Niederung", abschnittId: AB.erkundung },
];

/** Der Trupp, den das Drehbuch von der Bergungsgruppe OV Oldenburg abteilt (`demoverlauf.ts`). */
export const TRUPP_FUELLPLATZ = "demo-eh-bol-trupp";

const GRUPPE_JE_ABSCHNITT: Readonly<Record<string, string>> = {
  [AB.fuest]: RG.fuehrung,
  [AB.ea1]: RG.ea1,
  [AB.fuellplatz]: RG.ea1,
  [AB.erkundung]: RG.erkundung,
  [AB.ea2]: RG.ea2,
  [AB.ea3]: RG.ea3,
  [AB.logistik]: RG.logistik,
  [AB.bereitstellung]: RG.fuehrung,
};

/** Die Hauptrufgruppe einer Einheit — die ihres Abschnitts. */
export function rufgruppeVon(einheit: Demoeinheit): string | undefined {
  return einheit.eingetroffen === undefined ? undefined : GRUPPE_JE_ABSCHNITT[einheit.abschnittId];
}

function gruppenschritte(einsatzId: string): Demoschritt[] {
  const s6 = (minute: number, entwurf: Schrittentwurf | undefined): Demoschritt | undefined =>
    entwurf === undefined ? undefined : schrittAls(STELLE.ldf, minute, entwurf);
  return vorhandene([
    ...RUFGRUPPEN.map((gruppe, stelle) => s6(5, rufgruppeAnlegen({ ...gruppe, reihenfolge: stelle + 1 }))),
    s6(7, funkSchwelleSetzen(einsatzId, FUNK_KONTAKT_SCHWELLE_VORBELEGUNG, 90)),
    s6(160, rufgruppeGeaendert(RG.ea3, "zweck", "Einsatzabschnitt 3 Pumpen", "Einsatzabschnitt 3 Pumpen, Klärwerk und Regenrückhaltebecken")),
    // Aufgelöst und wiederhergestellt: beide Wege einmal im Tagebuch.
    s6(300, rufgruppeAufgeloest(RG.analog, "Feuerwehr arbeitet vollständig im Digitalfunk")),
    s6(330, rufgruppeWiederhergestellt(RG.analog)),
    s6(400, rufgruppeAufgeloest(RG.erkundung, "Erkundung abgeschlossen")),
  ]);
}

function zuordnungsschritte(): Demoschritt[] {
  const schritte: (Demoschritt | undefined)[] = [];
  for (const einheit of DEMO_EINHEITEN) {
    const gruppe = rufgruppeVon(einheit);
    if (gruppe === undefined || einheit.eingetroffen === undefined) continue;
    schritte.push(schrittAls(STELLE.ldf, einheit.eingetroffen + 3, rufgruppeDerEinheit(einheit.id, null, gruppe)));
  }
  const zusatz = (minute: number, entwurf: Schrittentwurf | undefined): Demoschritt | undefined =>
    entwurf === undefined ? undefined : schrittAls(STELLE.ldf, minute, entwurf);
  schritte.push(
    zusatz(46, weitereRufgruppenDerEinheit(EH.bOl.id, [], [RG.dmo])),
    zusatz(47, funkhinweisDerEinheit(EH.bOl.id, undefined, "Am Deichfuß nur DMO, Gateway am GKW")),
    zusatz(70, weitereRufgruppenDerEinheit(EH.fwAmm.id, [], [RG.analog])),
    zusatz(105, funkrufnameUeberschreiben(EH.fwEmd.id, undefined, "Florian Emden 7/44/1")),
    zusatz(140, funkhinweisDerEinheit(EH.dlrg.id, undefined, "Auf dem Boot nur Handfunkgerät, schlechte Verständigung")),
    zusatz(202, rufgruppeDerEinheit(TRUPP_FUELLPLATZ, null, RG.ea1)),
    zusatz(601, rufgruppeDerEinheit(EH.bWe.id, RG.fuehrung, RG.ea1)),
  );
  return vorhandene(schritte);
}

/** Wann geprobt wird und wer dabei nicht antwortet. */
const PROBENRUNDEN: readonly { readonly minute: number; readonly ohneKontakt: Readonly<Record<string, string>> }[] = [
  { minute: 180, ohneKontakt: {} },
  { minute: 360, ohneKontakt: { [EH.dlrg.id]: "Boot auf dem Wasser, keine Antwort" } },
  { minute: 540, ohneKontakt: {} },
  { minute: 700, ohneKontakt: { [EH.nOl.id]: "Funkgerät im MzGW ohne Strom, Netzersatzanlage ausgefallen" } },
];

function probenschritte(zeit: Demozeit): Demoschritt[] {
  const schritte: Demoschritt[] = [];
  for (const runde of PROBENRUNDEN) {
    DEMO_EINHEITEN.forEach((einheit, stelle) => {
      const gruppe = rufgruppeVon(einheit);
      const imEinsatz = einheit.verlauf?.some((w) => w.status === "IM_EINSATZ" && w.minute < runde.minute) === true;
      if (gruppe === undefined || !imEinsatz) return;
      const grund = runde.ohneKontakt[einheit.id];
      // Je Einheit eine Minute später: Eine Proberunde dauert, und der Funkplan zeigt die Reihenfolge.
      const minute = Math.min(runde.minute + stelle, 718);
      // Der Vorher-Wert kommt aus dem Zustand: Auch eine beförderte Nachricht hinterlässt einen Kontakt.
      schritte.push(schrittAls(STELLE.fm1, minute, (zustand) => {
        const gesehen = zustand.einheiten[einheit.id]?.letzteFunkprobe;
        const kontakt = gesehen?.KONTAKT?.wert ?? undefined;
        const keinKontakt = gesehen?.KEIN_KONTAKT?.wert ?? undefined;
        const letzteFunkproben = { ...(kontakt === undefined ? {} : { KONTAKT: kontakt }), ...(keinKontakt === undefined ? {} : { KEIN_KONTAKT: keinKontakt }) };
        return funkprobe({ einheitId: einheit.id, rufgruppeId: gruppe, rufgruppeAufgeloest: false, letzteFunkproben }, grund === undefined ? "KONTAKT" : "KEIN_KONTAKT", zeit.um(minute), grund);
      }));
    });
  }
  return schritte;
}

export function funkschritte(einsatzId: string, zeit: Demozeit): Demoschritt[] {
  return [...gruppenschritte(einsatzId), ...zuordnungsschritte(), ...probenschritte(zeit)];
}
