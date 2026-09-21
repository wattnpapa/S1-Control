import type { EinsatzJsonFile } from '../json-store/types';

export interface JournalEintrag {
  id: string;
  zeitpunkt: string;
  /** Was geschah, in einem Satz. */
  vorgang: string;
  /** Wer es erfasst hat. */
  benutzer: string;
  kommentar: string | null;
}

function abschnittName(data: EinsatzJsonFile, abschnittId: string | null): string {
  if (!abschnittId) {
    return 'ohne Abschnitt';
  }
  return data.abschnitte.find((a) => a.id === abschnittId)?.name ?? 'entfernter Abschnitt';
}

/**
 * Stellt die Bewegungen eines Einsatzes als lesbares Journal zusammen.
 *
 * Ohne diese Ansicht ist eine Übergabe nur mündlich möglich: die Bewegungen
 * stehen zwar in der Einsatzdatei, waren aber nirgends abrufbar.
 */
export function listJournal(data: EinsatzJsonFile, einsatzId: string, limit = 200): JournalEintrag[] {
  const eintraege: JournalEintrag[] = [];

  for (const bewegung of data.einheitBewegungen) {
    const einheit = data.einheiten.find((e) => e.id === bewegung.einsatzEinheitId);
    if (!einheit || einheit.einsatzId !== einsatzId) {
      continue;
    }
    eintraege.push({
      id: bewegung.id,
      zeitpunkt: bewegung.zeitpunkt,
      vorgang: `${einheit.nameImEinsatz}: ${abschnittName(data, bewegung.vonAbschnittId)} → ${abschnittName(data, bewegung.nachAbschnittId)}`,
      benutzer: bewegung.benutzer,
      kommentar: bewegung.kommentar,
    });
  }

  for (const bewegung of data.fahrzeugBewegungen) {
    const fahrzeug = data.fahrzeuge.find((f) => f.id === bewegung.einsatzFahrzeugId);
    if (!fahrzeug || fahrzeug.einsatzId !== einsatzId) {
      continue;
    }
    eintraege.push({
      id: bewegung.id,
      zeitpunkt: bewegung.zeitpunkt,
      vorgang: `${fahrzeug.name}: ${abschnittName(data, bewegung.vonAbschnittId)} → ${abschnittName(data, bewegung.nachAbschnittId)}`,
      benutzer: bewegung.benutzer,
      kommentar: null,
    });
  }

  return eintraege
    .sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt))
    .slice(0, limit);
}
