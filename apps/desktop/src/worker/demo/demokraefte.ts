/**
 * Demo-Einsatz: die Schritte je Einheit — Anmeldung, Eintreffen, Verlauf.
 *
 * Zwei Wege, wie im Betrieb:
 *
 * - **Mit Erfassungsbogen**: Die Einheit meldet sich am Meldekopf an. Der
 *   Bogen geht den Weg der PDF der Erfassungsbogen-App (`eebDatei`), die
 *   Übernahme (`eebUebernehmen`) legt die Einheit im Zielabschnitt an — mit
 *   Personen, Fahrzeugen, Funkrufnamen und Sofortbedarf.
 * - **Von Hand**: Die Einheit wird als angeforderte Kraft angelegt und beim
 *   Eintreffen in ihren Abschnitt verschoben.
 *
 * Danach gilt für beide dasselbe: Zeitpunkt, Status, Schicht, Auftrag.
 */

import { verschiebung } from "../../kontrakt/bedienschritte.js";
import { einheitsanlage } from "../../kontrakt/einheitsanlage.js";
import { auftragErfassen, fahrzeugAnlegen } from "../../kontrakt/einheitsteile.js";
import type { Aktendienst } from "../aktendienst.js";
import { DEMO_BOEGEN } from "./boegen/index.js";
import { DEMO_EINHEITEN, type Demoeinheit, type Handanlage } from "./demoeinheiten.js";
import { AB } from "./demostruktur.js";
import { STELLE, schrittAls, type Demoschritt, type Demozeit, type Schrittentwurf } from "./drehbuch.js";
import { statusNeu, zelleNeu } from "./zelle.js";

const STATUS_EINGETROFFEN = "EINSATZBEREIT";

/** Die Epoche des Erfassungsbogens: Minuten bzw. Tage seit dem 1. Januar 2020 (`@bos/eeb-format`, `model.ts`). */
const EEB_EPOCHE_MS = Date.UTC(2020, 0, 1);

/** Der Übungsbogen, auf diesen Einsatz gestellt: Stand ist die Minute der Anmeldung, der Zeitraum der Einsatztag. */
function bogenFuer(einheit: Demoeinheit, minute: number, zeit: Demozeit): Record<string, unknown> | undefined {
  if (einheit.bogen === undefined) return undefined;
  const standMs = zeit.beginnMs + minute * 60_000;
  const tag = Math.floor((standMs - EEB_EPOCHE_MS) / 86_400_000);
  return {
    ...(DEMO_BOEGEN[einheit.bogen] as unknown as Record<string, unknown>),
    uebung: true,
    stand: Math.round((standMs - EEB_EPOCHE_MS) / 60_000),
    einsatz: { zeitraumVon: tag, zeitraumBis: tag + 2, ortAuftrag: `Übung: Hochwasser Hunte — ${einheit.auftrag ?? "Bereitstellung"}` },
  };
}

/** Liest den Bogen ein und übernimmt ihn in den Abschnitt der Einheit. */
async function uebernimmBogen(dienst: Aktendienst, einheit: Demoeinheit, bogen: Record<string, unknown>): Promise<string | undefined> {
  const stand = await dienst.eebDatei([JSON.stringify(bogen)]);
  if (stand.art !== "vollstaendig") return `Der Bogen ${einheit.bogen ?? ""} wurde nicht gelesen: ${stand.meldung ?? stand.art}`;
  const ergebnis = await dienst.eebUebernehmen(einheit.abschnittId);
  if (ergebnis.art !== "uebernommen") return ergebnis.meldung;
  // Die Kennung, auf die sich alle späteren Schritte verlassen (`einheitIdDesBogens`).
  return ergebnis.einheitId === einheit.id ? undefined : `Die Übernahme hat ${ergebnis.einheitId} angelegt, das Drehbuch erwartet ${einheit.id}.`;
}

function anmeldung(einheit: Demoeinheit, minute: number, zeit: Demozeit): Demoschritt[] {
  const bogen = bogenFuer(einheit, minute, zeit);
  if (bogen === undefined) return [];
  return [{ minute, als: STELLE.s1, name: `Erfassungsbogen ${einheit.bogen ?? ""} übernehmen`, tat: (dienst) => uebernimmBogen(dienst, einheit, bogen) }];
}

function handanlage(einheit: Demoeinheit, hand: Handanlage, reihenfolge: number): Demoschritt[] {
  const s = (entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s1, hand.angelegt, entwurf);
  const schritte = [
    s(einheitsanlage({
      einheitId: einheit.id,
      abschnittId: AB.angefordert,
      bezeichnung: hand.bezeichnung,
      organisation: hand.organisation,
      ebene: hand.ebene,
      staerke: hand.staerke,
      reihenfolge,
      herkunft: hand.herkunft,
    })),
  ];
  if (hand.fuehrungskraft !== undefined) {
    const neu = { name: hand.fuehrungskraft.name, kontakte: [{ art: "MOBIL", dienstlich: true, wert: hand.fuehrungskraft.mobil }] };
    schritte.push(s({ typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId: einheit.id, feld: "fuehrungskraft" }, vorher: null, neu }));
  }
  return schritte;
}

/** Was eine von Hand angelegte Einheit beim Eintreffen zusätzlich braucht: Abschnitt und Fahrzeuge. */
function handEintreffen(einheit: Demoeinheit, hand: Handanlage, minute: number): Demoschritt[] {
  const s = (entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s1, minute, entwurf);
  return [
    s(verschiebung(einheit.id, AB.angefordert, einheit.abschnittId)),
    ...(hand.fahrzeuge ?? []).map((fahrzeug, stelle) =>
      s(fahrzeugAnlegen({
        fahrzeugId: `${einheit.id}-fz-${String(stelle + 1)}`,
        einheitId: einheit.id,
        typ: fahrzeug.typ,
        ...(fahrzeug.bezeichnung === undefined ? {} : { bezeichnung: fahrzeug.bezeichnung }),
        ...(fahrzeug.kennzeichen === undefined ? {} : { kennzeichen: fahrzeug.kennzeichen }),
        status: "EINSATZBEREIT",
      })),
    ),
  ];
}

/** Zeitpunkt, Status und die Zahlen für die Unterkunft — für jede eingetroffene Einheit. */
function eintreffen(einheit: Demoeinheit, minute: number, zeit: Demozeit): Demoschritt[] {
  const schritte = [
    schrittAls(STELLE.s1, minute, zelleNeu("eingetroffenAm", einheit.id, (e) => e.eingetroffenAm?.wert, zeit.um(minute))),
    schrittAls(STELLE.s1, minute, statusNeu(einheit.id, STATUS_EINGETROFFEN)),
  ];
  if (einheit.uebernachtung !== undefined) {
    schritte.push(
      schrittAls(STELLE.s4, minute + 5, zelleNeu("uebernachtungM", einheit.id, (e) => e.logistik["uebernachtungM"]?.wert, einheit.uebernachtung.m)),
      schrittAls(STELLE.s4, minute + 5, zelleNeu("uebernachtungW", einheit.id, (e) => e.logistik["uebernachtungW"]?.wert, einheit.uebernachtung.w)),
    );
  }
  return schritte;
}

/** Schicht und Bemerkung — sobald es die Einheit gibt. */
function angaben(einheit: Demoeinheit, minute: number): Demoschritt[] {
  const schritte: Demoschritt[] = [];
  if (einheit.schicht !== undefined) schritte.push(schrittAls(STELLE.s1, minute, zelleNeu("schicht", einheit.id, (e) => e.schicht?.wert, einheit.schicht)));
  if (einheit.bemerkung !== undefined) schritte.push(schrittAls(STELLE.s1, minute, zelleNeu("bemerkung", einheit.id, (e) => e.bemerkung?.wert, einheit.bemerkung)));
  return schritte;
}

/** Die Statuswechsel nach dem Eintreffen; der erste Einsatzstatus bringt den Auftrag mit. */
function verlauf(einheit: Demoeinheit, zeit: Demozeit): Demoschritt[] {
  const schritte: Demoschritt[] = [];
  let beauftragt = false;
  for (const wechsel of einheit.verlauf ?? []) {
    schritte.push(schrittAls(STELLE.s3, wechsel.minute, statusNeu(einheit.id, wechsel.status)));
    if (wechsel.status !== "IM_EINSATZ" || beauftragt || einheit.auftrag === undefined) continue;
    beauftragt = true;
    schritte.push(schrittAls(STELLE.s3, wechsel.minute, auftragErfassen({
      auftragId: `${einheit.id}-auftrag-1`,
      einheitId: einheit.id,
      text: einheit.auftrag,
      von: zeit.um(wechsel.minute),
      abschnittId: einheit.abschnittId,
    })));
  }
  return schritte;
}

function einheitenschritte(einheit: Demoeinheit, reihenfolge: number, zeit: Demozeit): Demoschritt[] {
  const hand = einheit.hand;
  const angelegt = hand === undefined ? [] : handanlage(einheit, hand, reihenfolge);
  const da = einheit.eingetroffen;
  if (da === undefined) return [...angelegt, ...angaben(einheit, hand?.angelegt ?? 0), ...verlauf(einheit, zeit)];
  return [
    ...angelegt,
    ...anmeldung(einheit, da, zeit),
    ...(hand === undefined ? [] : handEintreffen(einheit, hand, da)),
    ...eintreffen(einheit, da, zeit),
    ...angaben(einheit, da + 1),
    ...verlauf(einheit, zeit),
  ];
}

/** Alle Schritte aller Einheiten der Liste. */
export function kraefteschritte(zeit: Demozeit, einheiten: readonly Demoeinheit[] = DEMO_EINHEITEN): Demoschritt[] {
  return einheiten.flatMap((einheit, stelle) => einheitenschritte(einheit, stelle + 1, zeit));
}
