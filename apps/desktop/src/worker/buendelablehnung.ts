/**
 * Warum ein eingelesenes Bündel nichts (oder weniger) gebracht hat.
 *
 * „0 aufgenommen, 0 schon bekannt“ sagt dem Bediener nicht, ob die Datei
 * kaputt, falsch oder leer war. Diese Datei benennt die Ursache in Klartext.
 */

/** Klartext je Ursache; leer, wenn die Datei in Ordnung war. */
export function buendelUrsachen(text: string, eintraege: number, uebersprungen: number): { grund: string }[] {
  if (text.trim() === "") return [{ grund: "Die Datei ist leer." }];
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch {
    return [{ grund: "Die Datei ist keine Bündeldatei: Sie ist nicht lesbar (kein gültiges JSON). Bitte die Datei erneut auswählen oder neu exportieren." }];
  }
  const istSammlung = (s: unknown): boolean =>
    typeof s === "object" && s !== null && Array.isArray((s as { eintraege?: unknown }).eintraege);
  if (!Array.isArray(roh) || !roh.some(istSammlung)) {
    return [{ grund: "Die Datei enthält keine Meldungen im Bündelformat. Vermutlich ist es eine falsche Datei." }];
  }
  const ursachen: { grund: string }[] = [];
  if (eintraege === 0 && uebersprungen === 0) ursachen.push({ grund: "Die Bündeldatei enthält keine Meldungen." });
  if (uebersprungen > 0) {
    ursachen.push({ grund: `${String(uebersprungen)} Eintrag/Einträge der Datei waren nicht lesbar und wurden übersprungen.` });
  }
  return ursachen;
}
