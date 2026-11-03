/**
 * Ordnung im Abschnittsbaum, gerechnet über den Zeilen, die dieses Fenster
 * sieht: Eltern, Zyklus, nächste Reihenfolge, Nachbar zum Umsortieren.
 *
 * Die fachliche Regel steht in `@s1/domaene/projektion` (Zyklusregel §5.3.1,
 * Sortierung §5.3); hier steht nur, was Baum, Menü und Masken über die
 * Ansicht wissen müssen, um keinen Schritt anzubieten, den der Fold
 * anschließend verwirft.
 */

import type { Baumknoten } from "@s1/domaene";

/**
 * Die beiden Systemabschnitte lassen sich nicht ändern (§5.3.4).
 *
 * Jedes ändernde Ereignis auf `EINGANG` oder `ARCHIV` ist wirkungslos und
 * erzeugt `reservierteIdVerworfen`. Einen Schritt anzubieten, dessen Wirkung
 * der Fold anschließend verwirft, wäre ein Versprechen, das die Anwendung
 * nicht hält.
 */
export function aenderbar(knoten: Baumknoten | undefined): boolean {
  return knoten !== undefined && !knoten.systemAbschnitt;
}

export function elternVon(zeilen: readonly Baumknoten[], id: string): string | undefined {
  return zeilen.find((zeile) => zeile.kinder.some((kind) => kind.id === id))?.id;
}

/** Wie `projektion.schluesseZyklus`, aber über den Zeilen der Ansicht. */
export function schliessteZyklus(zeilen: readonly Baumknoten[], abschnittId: string, kandidat: string): boolean {
  if (abschnittId === kandidat) return true;
  let lauf: string | undefined = kandidat;
  const gesehen = new Set<string>([abschnittId]);
  while (lauf !== undefined) {
    if (gesehen.has(lauf)) return true;
    gesehen.add(lauf);
    lauf = elternVon(zeilen, lauf);
  }
  return false;
}

/** Die nächste freie Reihenfolge unter demselben Elternteil. */
export function naechsteReihenfolge(zeilen: readonly Baumknoten[], parentId: string | undefined): number {
  const geschwister = zeilen.filter((zeile) =>
    parentId === undefined ? zeile.tiefe === 0 : elternVon(zeilen, zeile.id) === parentId,
  );
  return geschwister.reduce((groesste, zeile) => Math.max(groesste, zeile.reihenfolge), 0) + 1;
}

/** Der Geschwisterabschnitt eine Stelle darüber (-1) oder darunter (1), falls es ihn gibt. */
export function nachbarInReihenfolge(
  knoten: Baumknoten,
  zeilen: readonly Baumknoten[],
  richtung: -1 | 1,
): Baumknoten | undefined {
  const eltern = elternVon(zeilen, knoten.id);
  const geschwister = zeilen
    .filter((zeile) => elternVon(zeilen, zeile.id) === eltern)
    .sort((a, b) => (a.reihenfolge === b.reihenfolge ? (a.id < b.id ? -1 : 1) : a.reihenfolge - b.reihenfolge));
  const stelle = geschwister.findIndex((zeile) => zeile.id === knoten.id);
  return geschwister[stelle + richtung];
}
