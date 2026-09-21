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
    const einheit = data.einheiten.find((e) => e.id === payload.einheitId);
    const mitFahrzeugen = (payload.mitgefuehrteFahrzeugIds ?? []).length;
    const zusatz = mitFahrzeugen > 0 ? ` samt ${mitFahrzeugen} Fahrzeug(en)` : '';
    return {
      beschreibung: `${einheit?.nameImEinsatz ?? 'Einheit'} von ${von} nach ${nach} verschoben${zusatz}`,
      zeitpunkt: command.timestamp,
    };
  }

  if (command.commandTyp === 'MOVE_FAHRZEUG') {
    const fahrzeug = data.fahrzeuge.find((f) => f.id === payload.fahrzeugId);
    return {
      beschreibung: `${fahrzeug?.name ?? 'Fahrzeug'} von ${von} nach ${nach} verschoben`,
      zeitpunkt: command.timestamp,
    };
  }

  return { beschreibung: 'Letzte Änderung', zeitpunkt: command.timestamp };
}
