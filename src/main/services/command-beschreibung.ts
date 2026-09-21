import type { EinsatzJsonFile } from '../json-store/types';

export interface LetzteAktion {
  /** Kurzer Satz, was zuletzt geschah, z. B. "1. Bergungsgruppe von A nach B verschoben". */
  beschreibung: string;
  zeitpunkt: string;
}

interface MovePayload {
  einheitId?: string;
  fahrzeugId?: string;
  vonAbschnittId: string;
  nachAbschnittId: string;
  mitgefuehrteFahrzeugIds?: string[];
}

function abschnittName(data: EinsatzJsonFile, abschnittId: string): string {
  return data.abschnitte.find((a) => a.id === abschnittId)?.name ?? 'unbekanntem Abschnitt';
}

function parsePayload(payloadJson: string): MovePayload | null {
  try {
    return JSON.parse(payloadJson) as MovePayload;
  } catch {
    return null;
  }
}

/**
 * Beschreibt eine Einheitenbewegung im Klartext.
 */
function beschreibeEinheitMove(data: EinsatzJsonFile, payload: MovePayload, von: string, nach: string): string {
  const einheit = data.einheiten.find((e) => e.id === payload.einheitId);
  const name = einheit ? einheit.nameImEinsatz : 'Einheit';
  const mitFahrzeugen = (payload.mitgefuehrteFahrzeugIds ?? []).length;
  const zusatz = mitFahrzeugen > 0 ? ` samt ${mitFahrzeugen} Fahrzeug(en)` : '';
  return `${name} von ${von} nach ${nach} verschoben${zusatz}`;
}

/**
 * Beschreibt eine Fahrzeugbewegung im Klartext.
 */
function beschreibeFahrzeugMove(data: EinsatzJsonFile, payload: MovePayload, von: string, nach: string): string {
  const fahrzeug = data.fahrzeuge.find((f) => f.id === payload.fahrzeugId);
  const name = fahrzeug ? fahrzeug.name : 'Fahrzeug';
  return `${name} von ${von} nach ${nach} verschoben`;
}

/**
 * Beschreibt die letzte rücknehmbare Aktion, damit die Rückfrage vor dem
 * Rückgängigmachen benennt, was genau zurückgeht.
 */
export function describeLastUndoableCommand(
  data: EinsatzJsonFile,
  einsatzId: string,
): LetzteAktion | null {
  const command = [...data.commandLog]
    .filter((c) => c.einsatzId === einsatzId && !c.undone)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  if (!command) {
    return null;
  }

  const payload = parsePayload(command.payloadJson);
  if (!payload) {
    return { beschreibung: 'Letzte Änderung', zeitpunkt: command.timestamp };
  }

  const von = abschnittName(data, payload.vonAbschnittId);
  const nach = abschnittName(data, payload.nachAbschnittId);

  if (command.commandTyp === 'MOVE_EINHEIT') {
    return { beschreibung: beschreibeEinheitMove(data, payload, von, nach), zeitpunkt: command.timestamp };
  }

  if (command.commandTyp === 'MOVE_FAHRZEUG') {
    return { beschreibung: beschreibeFahrzeugMove(data, payload, von, nach), zeitpunkt: command.timestamp };
  }

  return { beschreibung: 'Letzte Änderung', zeitpunkt: command.timestamp };
}
