/**
 * Der Funkrufname als gesprochener Text — geteilt von der Untertabelle der
 * Fahrzeuge (`projektion/tabelle.ts`) und dem Funkrufnamen der Einheit (K31).
 *
 * Im Katalog ist er ein Objekt aus Kennwort, Standortangabe und Kennzahlen
 * (§5.5). Zwei Stellen, die ihn zusammensetzen, wären zwei Schreibweisen
 * desselben Namens; über Funk gibt es nur eine.
 */

function textOptional(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

/**
 * Setzt den Funkrufnamen zu der Form zusammen, in der er gesprochen wird.
 *
 * `kennwort` plus, wenn der eigene Standort gemeint ist, der Ort und die
 * Kennzahlen mit Schrägstrich (§5.5). Fehlt das Kennwort, fehlt der ganze
 * Name — ein Funkrufname aus Kennzahlen allein wäre über Funk nicht
 * zuzuordnen.
 */
export function funkrufnameText(wert: unknown): string | undefined {
  if (typeof wert !== "object" || wert === null) return undefined;
  const teil = wert as {
    kennwort?: unknown;
    ort?: unknown;
    eigenerStandort?: unknown;
    teile?: unknown;
  };
  const kennwort = textOptional(teil.kennwort);
  if (kennwort === undefined) return undefined;
  const ort = textOptional(teil.ort);
  const kennzahlen = Array.isArray(teil.teile)
    ? teil.teile.filter((zahl): zahl is number => typeof zahl === "number").join("/")
    : "";
  return [kennwort, ort, kennzahlen === "" ? undefined : kennzahlen]
    .filter((stueck): stueck is string => stueck !== undefined)
    .join(" ");
}
