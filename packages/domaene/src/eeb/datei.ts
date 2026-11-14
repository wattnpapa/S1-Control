/**
 * Der Datei-Weg: Erfassungsbögen aus dem JSON-Anhang einer PDF.
 *
 * Die Erfassungsbogen-App bettet in jede PDF, die sie erzeugt, den Bogen als
 * JSON ein (`erfassungsbogen.json`, ZUGFeRD-artig) — eine Sammel-PDF trägt je
 * Einheit einen Anhang. Wer die PDF per Mail oder Stick bekommt, muss den
 * QR-Code darin nicht vom Bildschirm abscannen.
 *
 * **Diese Datei kennt keine PDF.** Sie bekommt Texte, die jemand aus den
 * Datenströmen der Datei gezogen hat, und entscheidet, welche davon Bögen
 * sind. Das Auspacken der PDF ist Transport und liegt in der Schale; die
 * Regel, was als Bogen gilt, liegt hier — wie beim Handscanner.
 *
 * **Der Anhang trägt keine Signatur.** Sie steckt nur im QR-Code. Ein Bogen
 * aus der Datei ist deshalb „nicht signiert“, und das ist die ehrliche
 * Auskunft (§5.8.1: Der Befund wird angezeigt, er entscheidet nichts).
 */

import { inhaltsHash, migriereBogen, type Erfassungsbogen } from "@bos/eeb-format";

import { kanonischeSerialisierung } from "../kanonisch.js";

/** Wie viele Bögen eine Lieferung höchstens tragen darf — eine Schranke gegen Unfug, kein Fachwert. */
export const DATEIBOEGEN_MAX = 500;

/**
 * Die Bögen aus einer Reihe von JSON-Texten, migriert und ohne Dubletten.
 *
 * Ein Text darf ein Bogen oder eine Liste von Bögen sein. Was kein JSON ist
 * oder nicht wie ein Bogen aussieht, fällt still heraus: Die Texte stammen aus
 * **allen** Datenströmen einer PDF, und die meisten davon sind Schrift und
 * Seiteninhalt.
 */
export function boegenAusJsonTexten(texte: readonly string[]): readonly Erfassungsbogen[] {
  const boegen: Erfassungsbogen[] = [];
  const gesehen = new Set<string>();
  for (const text of texte) {
    for (const kandidat of kandidaten(text)) {
      if (boegen.length >= DATEIBOEGEN_MAX) return boegen;
      const bogen = alsBogen(kandidat);
      if (bogen === undefined) continue;
      const schluessel = inhaltsHash(kanonischeSerialisierung(bogen as unknown as never));
      if (gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      boegen.push(bogen);
    }
  }
  return boegen;
}

function kandidaten(text: string): readonly unknown[] {
  try {
    const daten: unknown = JSON.parse(text);
    return Array.isArray(daten) ? daten : [daten];
  } catch {
    return [];
  }
}

/**
 * Der migrierte Bogen, oder `undefined`, wenn das Objekt keiner ist.
 *
 * Geprüft wird nur das Gerüst. Ob der Inhalt trägt, zeigt sich beim Kodieren
 * im Aktendienst — derselbe Codec, durch den auch ein gescannter Bogen geht.
 */
function alsBogen(kandidat: unknown): Erfassungsbogen | undefined {
  if (typeof kandidat !== "object" || kandidat === null) return undefined;
  const roh = kandidat as Record<string, unknown>;
  const einheit = roh["einheit"] as { hierarchie?: unknown } | null | undefined;
  const geruest =
    typeof roh["schemaVersion"] === "number" &&
    typeof roh["stand"] === "number" &&
    typeof einheit === "object" &&
    einheit !== null &&
    Array.isArray(einheit.hierarchie) &&
    Array.isArray(roh["personal"]) &&
    Array.isArray(roh["fahrzeuge"]);
  if (!geruest) return undefined;
  try {
    return migriereBogen(kandidat as Erfassungsbogen);
  } catch {
    return undefined;
  }
}
