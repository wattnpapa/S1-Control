/**
 * Demo-Einsatz: der Weg einer Nachricht durch die Führungsstelle.
 *
 * Zwei Bauer, die aus einer Nachricht ihre Schritte machen — mit denselben
 * Schrittbauern wie die Masken (`nachrichtenschritte.ts`, `fmzschritte.ts`,
 * `ldfschritte.ts`):
 *
 * - **Ausgang**: aufgeben (Verfasser) → Übermittlung vorschlagen (LdF) →
 *   annehmen, befördern, nachweisen (Fernmelder).
 * - **Eingang**: aufnehmen (Fernmelder) → nachweisen und weitergeben (LdF) →
 *   sichten und verteilen (Sichter) → Kenntnis nehmen, erledigen (Stellen).
 *
 * `bis` hält eine Nachricht an einer Station an. So liegen am Ende des
 * Drehbuchs Nachrichten vor dem LdF, in der FmZ und vor dem Sichter — jede
 * Stelle findet Arbeit vor, wenn sie den Demo-Einsatz öffnet.
 */

import { nachrichtAnnehmen, nachrichtAufnehmen, nachrichtBefoerdern, nachrichtNachweisen, nachrichtVorschlagen } from "../../kontrakt/fmzschritte.js";
import { nachrichtNachweisenUndWeitergeben } from "../../kontrakt/ldfschritte.js";
import { erledigt, kenntnisGenommen, nachrichtSichten, nachrichtVerfassen, type Nachrichtenanlage } from "../../kontrakt/nachrichtenschritte.js";
import { STELLE, schrittAls, type Demoschritt, type Demostelle, type Demozeit } from "./drehbuch.js";

/** Der Funkkontakt, den eine Nachricht über Funk im Funkplan hinterlässt. */
export interface Demokontakt {
  readonly einheitId: string;
  readonly rufgruppeId: string;
}

type Inhalt = Pick<Nachrichtenanlage, "anschrift" | "betreff" | "inhalt" | "absender" | "vorrang" | "art" | "rufnummer" | "anschriftBezug" | "absenderBezug" | "antwortAuf" | "weitergeleitetVon" | "zeichen" | "funktion">;

export interface Demoausgang extends Inhalt {
  readonly id: string;
  readonly minute: number;
  readonly verfasser: Demostelle;
  readonly mittel: string;
  readonly gegenstelle: string;
  readonly nummer: number;
  readonly kontakt?: Demokontakt;
  /** Die letzte Station, die die Nachricht erreicht; ohne Angabe läuft sie durch. */
  readonly bis?: "aufgegeben" | "vorgeschlagen" | "angenommen";
}

export interface Demoeingang extends Inhalt {
  readonly id: string;
  readonly minute: number;
  readonly mittel: string;
  readonly gegenstelle: string;
  readonly nummer: number;
  readonly kontakt?: Demokontakt;
  readonly verteiler: readonly { readonly stelle: string; readonly kopie: "ROT" | "GRUEN" | "BLAU" }[];
  readonly vermerke?: string;
  /** Die Stellen, die Kenntnis nehmen — in dieser Reihenfolge, je zwei Minuten später. */
  readonly kenntnis?: readonly Demostelle[];
  /** Die Stelle, die die Nachricht erledigt. */
  readonly erledigtVon?: Demostelle;
  readonly bis?: "aufgenommen" | "weitergegeben" | "gesichtet";
}

const FERNMELDER = STELLE.fm1;
const FERNMELDERNAME = "Fm1";

function vermerk(zeit: Demozeit, minute: number, stelle: Demostelle): { zeitpunkt: string; handzeichen: string } {
  return { zeitpunkt: zeit.um(minute), handzeichen: stelle.handzeichen };
}

function stelleVon(stelle: Demostelle): string {
  return stelle.stellen[0] ?? "";
}

export function ausgangsschritte(n: Demoausgang, zeit: Demozeit): Demoschritt[] {
  const { id, minute, verfasser, mittel, gegenstelle, nummer, kontakt, bis, ...inhalt } = n;
  const schritte = [
    schrittAls(verfasser, minute, nachrichtVerfassen({ ...inhalt, nachrichtId: id, richtung: "AUSGANG", uebermittlungswunsch: mittel, abfassungszeit: zeit.um(minute) })),
  ];
  if (bis === "aufgegeben") return schritte;
  schritte.push(schrittAls(STELLE.ldf, minute + 2, nachrichtVorschlagen(id, null, { mittel, fernmelder: FERNMELDERNAME, gegenstelle, ...vermerk(zeit, minute + 2, STELLE.ldf) })));
  if (bis === "vorgeschlagen") return schritte;
  schritte.push(schrittAls(FERNMELDER, minute + 3, nachrichtAnnehmen(id, null, vermerk(zeit, minute + 3, FERNMELDER))));
  if (bis === "angenommen") return schritte;
  const folge = kontakt === undefined ? undefined : { kontaktEinheitId: kontakt.einheitId, kontaktRufgruppeId: kontakt.rufgruppeId };
  schritte.push(
    schrittAls(FERNMELDER, minute + 6, nachrichtBefoerdern(id, null, { mittel, gegenstelle, ...vermerk(zeit, minute + 6, FERNMELDER) }, folge)),
    schrittAls(FERNMELDER, minute + 7, nachrichtNachweisen(id, null, { nummer, ...vermerk(zeit, minute + 7, FERNMELDER) })),
  );
  return schritte;
}

function nachDerSichtung(n: Demoeingang, zeit: Demozeit): Demoschritt[] {
  const schritte: Demoschritt[] = [];
  (n.kenntnis ?? []).forEach((stelle, folge) => {
    const minute = n.minute + 7 + folge * 2;
    schritte.push(schrittAls(stelle, minute, kenntnisGenommen(n.id, stelleVon(stelle), vermerk(zeit, minute, stelle))));
  });
  if (n.erledigtVon !== undefined) schritte.push(schrittAls(n.erledigtVon, n.minute + 25, erledigt(n.id, stelleVon(n.erledigtVon))));
  return schritte;
}

export function eingangsschritte(n: Demoeingang, zeit: Demozeit): Demoschritt[] {
  const { id, minute, mittel, gegenstelle, nummer, kontakt, verteiler, vermerke, bis } = n;
  const anlage: Nachrichtenanlage = {
    nachrichtId: id,
    richtung: "EINGANG",
    anschrift: n.anschrift,
    betreff: n.betreff,
    inhalt: n.inhalt,
    absender: n.absender,
    gegenstelle,
    abfassungszeit: zeit.um(minute - 1),
    aufnahme: { mittel, ...vermerk(zeit, minute, FERNMELDER) },
    ...(n.vorrang === undefined ? {} : { vorrang: n.vorrang }),
    ...(n.absenderBezug === undefined ? {} : { absenderBezug: n.absenderBezug }),
    ...(n.antwortAuf === undefined ? {} : { antwortAuf: n.antwortAuf }),
  };
  const schritte = [schrittAls(FERNMELDER, minute, nachrichtAufnehmen(anlage, kontakt === undefined ? {} : { kontakt }))];
  if (bis === "aufgenommen") return schritte;
  schritte.push(schrittAls(STELLE.ldf, minute + 2, nachrichtNachweisenUndWeitergeben(id, { nummer, ...vermerk(zeit, minute + 2, STELLE.ldf) }, vermerk(zeit, minute + 2, STELLE.ldf))));
  if (bis === "weitergegeben") return schritte;
  const sichtung = { ...vermerk(zeit, minute + 4, STELLE.sichter), verteiler, ...(vermerke === undefined ? {} : { vermerke }) };
  schritte.push(schrittAls(STELLE.sichter, minute + 4, nachrichtSichten(id, null, sichtung)));
  return bis === "gesichtet" ? schritte : [...schritte, ...nachDerSichtung(n, zeit)];
}
