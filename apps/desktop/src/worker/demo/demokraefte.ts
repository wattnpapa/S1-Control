/**
 * Demo-Einsatz: die Schritte je Einheit — Anlage, Eintreffen, Verlauf.
 *
 * Jede Einheit aus `demoeinheiten.ts` geht denselben Weg wie im Betrieb: Sie
 * wird als angeforderte Kraft angelegt, trifft ein (Abschnitt, Zeitpunkt,
 * Status), bekommt Fahrzeuge, Personen und Auftrag und wechselt im Verlauf
 * den Status.
 */

import { einheitsanlage } from "../../kontrakt/einheitsanlage.js";
import { auftragErfassen, fahrzeugAnlegen, personHinzufuegen } from "../../kontrakt/einheitsteile.js";
import { verschiebung } from "../../kontrakt/bedienschritte.js";
import { DEMO_EINHEITEN, type Demoeinheit } from "./demoeinheiten.js";
import { AB } from "./demostruktur.js";
import { STELLE, schrittAls, type Demoschritt, type Schrittentwurf, type Demozeit } from "./drehbuch.js";
import { zelle } from "./zelle.js";

const STATUS_ANGELEGT = "ANGEFORDERT";
const STATUS_EINGETROFFEN = "EINSATZBEREIT";

function anlage(einheit: Demoeinheit, reihenfolge: number): Demoschritt[] {
  const s = (entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s1, einheit.angelegt, entwurf);
  const schritte = [
    s(einheitsanlage({
      einheitId: einheit.id,
      abschnittId: AB.angefordert,
      bezeichnung: einheit.bezeichnung,
      organisation: einheit.organisation,
      ebene: einheit.ebene,
      staerke: einheit.staerke,
      reihenfolge,
      herkunft: einheit.herkunft,
    })),
  ];
  if (einheit.schicht !== undefined) schritte.push(s(zelle("schicht", einheit.id, null, einheit.schicht)));
  if (einheit.bemerkung !== undefined) schritte.push(s(zelle("bemerkung", einheit.id, null, einheit.bemerkung)));
  if (einheit.fuehrungskraft !== undefined) {
    const neu = { name: einheit.fuehrungskraft.name, kontakte: [{ art: "MOBIL", dienstlich: true, wert: einheit.fuehrungskraft.mobil }] };
    schritte.push(s({ typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId: einheit.id, feld: "fuehrungskraft" }, vorher: null, neu }));
  }
  return schritte;
}

function eintreffen(einheit: Demoeinheit, minute: number, zeit: Demozeit): Demoschritt[] {
  const s = (entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s1, minute, entwurf);
  const schritte = [
    s(verschiebung(einheit.id, AB.angefordert, einheit.abschnittId)),
    s(zelle("eingetroffenAm", einheit.id, null, zeit.um(minute))),
    s(zelle("status", einheit.id, STATUS_ANGELEGT, STATUS_EINGETROFFEN)),
  ];
  (einheit.fahrzeuge ?? []).forEach((fahrzeug, stelle) => {
    schritte.push(s(fahrzeugAnlegen({
      fahrzeugId: `${einheit.id}-fz-${String(stelle + 1)}`,
      einheitId: einheit.id,
      typ: fahrzeug.typ,
      ...(fahrzeug.bezeichnung === undefined ? {} : { bezeichnung: fahrzeug.bezeichnung }),
      ...(fahrzeug.kennzeichen === undefined ? {} : { kennzeichen: fahrzeug.kennzeichen }),
      status: "EINSATZBEREIT",
    })));
  });
  return schritte;
}

function personal(einheit: Demoeinheit, minute: number): Demoschritt[] {
  const personen = einheit.personen ?? [];
  if (personen.length === 0) return [];
  const s = (entwurf: Schrittentwurf): Demoschritt => schrittAls(STELLE.s1, minute, entwurf);
  return [
    s(zelle("personalErfassung", einheit.id, "NUR_STAERKE", "VOLLSTAENDIG")),
    ...personen.map((person, stelle) =>
      s(personHinzufuegen({
        personId: `${einheit.id}-p-${String(stelle + 1)}`,
        einheitId: einheit.id,
        vorname: person.vorname,
        nachname: person.nachname,
        rolle: person.rolle,
        funktionen: person.funktionen,
        geschlecht: person.geschlecht ?? "MAENNLICH",
        ernaehrung: person.ernaehrung ?? "FLEISCH",
      })),
    ),
  ];
}

function logistik(einheit: Demoeinheit, minute: number): Demoschritt[] {
  return Object.entries(einheit.logistik ?? {}).map(([feld, wert]) => schrittAls(STELLE.s4, minute, zelle(feld, einheit.id, null, wert)));
}

/** Die Statuswechsel nach dem Eintreffen; der erste Einsatzstatus bringt den Auftrag mit. */
function verlauf(einheit: Demoeinheit, start: string, zeit: Demozeit): Demoschritt[] {
  const schritte: Demoschritt[] = [];
  let vorher = start;
  let beauftragt = false;
  for (const wechsel of einheit.verlauf ?? []) {
    schritte.push(schrittAls(STELLE.s3, wechsel.minute, zelle("status", einheit.id, vorher, wechsel.status)));
    vorher = wechsel.status;
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
  const schritte = anlage(einheit, reihenfolge);
  if (einheit.eingetroffen === undefined) return [...schritte, ...verlauf(einheit, STATUS_ANGELEGT, zeit)];
  return [
    ...schritte,
    ...eintreffen(einheit, einheit.eingetroffen, zeit),
    ...personal(einheit, einheit.eingetroffen + 2),
    ...logistik(einheit, einheit.eingetroffen + 5),
    ...verlauf(einheit, STATUS_EINGETROFFEN, zeit),
  ];
}

/** Alle Schritte aller Einheiten der Liste. */
export function kraefteschritte(zeit: Demozeit, einheiten: readonly Demoeinheit[] = DEMO_EINHEITEN): Demoschritt[] {
  return einheiten.flatMap((einheit, stelle) => einheitenschritte(einheit, stelle + 1, zeit));
}
