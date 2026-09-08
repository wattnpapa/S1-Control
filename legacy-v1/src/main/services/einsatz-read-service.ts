import type { EinsatzJsonFile, SystemJsonFile } from '../json-store/types';
import type {
  AbschnittDetails,
  AbschnittNode,
  EinsatzListItem,
  EinheitHelfer,
  EinheitListItem,
  FahrzeugListItem,
  HelferGeschlecht,
  HelferRolle,
  OrganisationKey,
} from '../../shared/types';

export function listEinsaetze(data: EinsatzJsonFile): EinsatzListItem[] {
  const e = data.einsatz;
  return [
    {
      id: e.id,
      name: e.name,
      fuestName: e.fuestName,
      start: e.start,
      end: e.end,
      status: e.status,
    },
  ];
}

export function listAbschnitte(data: EinsatzJsonFile, einsatzId: string): AbschnittNode[] {
  return data.abschnitte
    .filter((a) => a.einsatzId === einsatzId)
    .map((a) => ({
      id: a.id,
      einsatzId: a.einsatzId,
      parentId: a.parentId,
      name: a.name,
      systemTyp: a.systemTyp,
    }));
}

function mapEinheit(
  e: EinsatzJsonFile['einheiten'][number],
  system: SystemJsonFile,
): EinheitListItem {
  const stamm = e.stammdatenEinheitId
    ? system.stammdatenEinheiten.find((s) => s.id === e.stammdatenEinheitId)
    : undefined;
  return {
    id: e.id,
    parentEinsatzEinheitId: e.parentEinsatzEinheitId,
    nameImEinsatz: e.nameImEinsatz,
    organisation: e.organisation as OrganisationKey,
    aktuelleStaerke: e.aktuelleStaerke,
    aktuelleStaerkeTaktisch: e.aktuelleStaerkeTaktisch,
    status: e.status,
    piktogrammKey: stamm?.standardPiktogrammKey ?? null,
    tacticalSignConfigJson: e.tacticalSignConfigJson,
    aktuellerAbschnittId: e.aktuellerAbschnittId,
    grFuehrerName: e.grFuehrerName,
    ovName: e.ovName,
    ovTelefon: e.ovTelefon,
    ovFax: e.ovFax,
    rbName: e.rbName,
    rbTelefon: e.rbTelefon,
    rbFax: e.rbFax,
    lvName: e.lvName,
    lvTelefon: e.lvTelefon,
    lvFax: e.lvFax,
    bemerkung: e.bemerkung,
    vegetarierVorhanden: e.vegetarierVorhanden,
    erreichbarkeiten: e.erreichbarkeiten,
  };
}

function mapFahrzeug(
  f: EinsatzJsonFile['fahrzeuge'][number],
  einheiten: EinsatzJsonFile['einheiten'],
): FahrzeugListItem {
  const einheit = f.aktuelleEinsatzEinheitId
    ? einheiten.find((e) => e.id === f.aktuelleEinsatzEinheitId)
    : undefined;
  return {
    id: f.id,
    name: f.name,
    kennzeichen: f.kennzeichen,
    status: f.status,
    piktogrammKey: f.standardPiktogrammKey,
    organisation: (einheit?.organisation as OrganisationKey | undefined) ?? null,
    aktuelleEinsatzEinheitId: f.aktuelleEinsatzEinheitId,
    aktuellerAbschnittId: f.aktuellerAbschnittId,
    funkrufname: f.funkrufname,
    stanKonform: f.stanKonform,
    sondergeraet: f.sondergeraet,
    nutzlast: f.nutzlast,
  };
}

export function listAbschnittDetails(
  data: EinsatzJsonFile,
  system: SystemJsonFile,
  einsatzId: string,
  abschnittId: string,
): AbschnittDetails {
  const einheiten = data.einheiten
    .filter((e) => e.einsatzId === einsatzId && e.aktuellerAbschnittId === abschnittId)
    .map((e) => mapEinheit(e, system));
  const fahrzeuge = data.fahrzeuge
    .filter((f) => f.einsatzId === einsatzId && f.aktuellerAbschnittId === abschnittId)
    .map((f) => mapFahrzeug(f, data.einheiten));
  return { einheiten, fahrzeuge };
}

export function listAbschnittDetailsBatch(
  data: EinsatzJsonFile,
  system: SystemJsonFile,
  einsatzId: string,
): Record<string, AbschnittDetails> {
  const grouped: Record<string, AbschnittDetails> = {};
  for (const e of data.einheiten) {
    if (e.einsatzId !== einsatzId) continue;
    const item = mapEinheit(e, system);
    const bucket = (grouped[item.aktuellerAbschnittId] ??= { einheiten: [], fahrzeuge: [] });
    bucket.einheiten.push(item);
  }
  for (const f of data.fahrzeuge) {
    if (f.einsatzId !== einsatzId) continue;
    const item = mapFahrzeug(f, data.einheiten);
    if (!item.aktuellerAbschnittId) continue;
    const bucket = (grouped[item.aktuellerAbschnittId] ??= { einheiten: [], fahrzeuge: [] });
    bucket.fahrzeuge.push(item);
  }
  return grouped;
}

export function listEinheitHelfer(data: EinsatzJsonFile, einheitId: string): EinheitHelfer[] {
  return data.helfer
    .filter((h) => h.einsatzEinheitId === einheitId)
    .map((h) => ({
      id: h.id,
      einsatzId: h.einsatzId,
      einsatzEinheitId: h.einsatzEinheitId,
      name: h.name,
      rolle: h.rolle as HelferRolle,
      geschlecht: h.geschlecht as HelferGeschlecht,
      anzahl: h.anzahl,
      funktion: h.funktion,
      telefon: h.telefon,
      erreichbarkeit: h.erreichbarkeit,
      vegetarisch: h.vegetarisch,
      bemerkung: h.bemerkung,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function loadEinsatzState(
  data: EinsatzJsonFile,
  system: SystemJsonFile,
  einsatzId: string,
): { abschnitte: AbschnittNode[]; detailsBatch: Record<string, AbschnittDetails> } {
  return {
    abschnitte: listAbschnitte(data, einsatzId),
    detailsBatch: listAbschnittDetailsBatch(data, system, einsatzId),
  };
}

export function hasUndoableCommand(data: EinsatzJsonFile, einsatzId: string): boolean {
  return data.commandLog.some((c) => c.einsatzId === einsatzId && !c.undone);
}
