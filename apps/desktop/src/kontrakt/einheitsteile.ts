/**
 * Die Bedienschritte an Auftrag, Fahrzeug und Person einer Einheit (§5.5, §5.6).
 *
 * Dieselbe Rolle wie `bedienschritte.ts` — reine Funktionen von der Eingabe
 * einer Maske zum {@link Entwurf} —, aber eine eigene Datei, weil jene schon
 * die Einheitentabelle trägt. Geschrieben wird über den allgemeinen Ruf
 * `bedienen`; einen zweiten Schreibweg gibt es nicht.
 *
 * **Die Felder sind die der Nutzlastschemata** (`katalog/schemata.ts`), und
 * nur die. Was die Maske nicht abfragt, aber das Schema verlangt, steht hier
 * mit dem Wert, der „nichts angegeben“ heißt: die leeren Listen einer Person,
 * `MANUELL` als Quelle eines Auftrags. Optionale Texte fallen weg, wenn sie
 * leer sind — eine Anlage, die sich zu einem Feld nicht äußert, belegt es
 * nicht (§2.3), und ein `""` stünde im Zustand als gesetzter leerer Text.
 *
 * **Jede Folgehandlung trägt ihren `vorher`-Wert** (§2.2a): den Stand, den die
 * Untertabelle gerade zeigt.
 */

import type { Entwurf } from "./index.js";

/** Ein optionaler Text als Nutzlastfeld — oder gar nicht, wenn er leer ist. */
function optional<K extends string>(schluessel: K, eingabe: string | undefined): Partial<Record<K, string>> {
  const geputzt = eingabe?.trim() ?? "";
  return geputzt === "" ? {} : ({ [schluessel]: geputzt } as Record<K, string>);
}

/** Eine kommagetrennte Eingabe als Liste, ohne leere Einträge. */
export function listeAusEingabe(eingabe: string): string[] {
  return eingabe
    .split(/[,;]/)
    .map((teil) => teil.trim())
    .filter((teil) => teil !== "");
}

// ---------------------------------------------------------------------------
// Auftrag (§5.6)
// ---------------------------------------------------------------------------

export interface Auftragsanlage {
  readonly auftragId: string;
  readonly einheitId: string;
  readonly text: string;
  /** Der Beginn als ISO-Zeitpunkt — das Schema verlangt ihn. */
  readonly von: string;
  readonly abschnittId?: string;
}

/** Einen Auftrag erfassen — Form (b), ohne `vorher` und `neu`. */
export function auftragErfassen(anlage: Auftragsanlage): Entwurf {
  return {
    typ: "AuftragErfasst",
    nutzlast: {
      auftragId: anlage.auftragId,
      einheitId: anlage.einheitId,
      von: anlage.von,
      ...optional("abschnittId", anlage.abschnittId),
      text: anlage.text.trim(),
      quelle: "MANUELL",
    },
  };
}

/**
 * Einen Auftrag als erledigt setzen: `bis` wird der Zeitpunkt (§5.6).
 *
 * `gesehenBis` ist das Ende, das die Zeile zeigte — meist keines.
 */
export function auftragBeenden(auftragId: string, gesehenBis: string | undefined, bis: string): Entwurf {
  return { typ: "AuftragBeendet", nutzlast: { auftragId }, vorher: gesehenBis ?? null, neu: bis };
}

/**
 * Einen falsch erfassten Auftrag zurücknehmen.
 *
 * Kein Löschen: Der Auftrag fällt aus der Spalte K und der Untertabelle, steht
 * aber weiter im Tagebuch. Der Grund ist hier nicht Pflicht (§2.4), wird aber
 * mitgeschrieben, wenn er gegeben ist.
 */
export function auftragZuruecknehmen(auftragId: string, grund?: string): Entwurf {
  const geputzt = grund?.trim() ?? "";
  return {
    typ: "AuftragZurueckgenommen",
    nutzlast: { auftragId },
    vorher: null,
    neu: true,
    ...(geputzt === "" ? {} : { grund: geputzt }),
  };
}

// ---------------------------------------------------------------------------
// Fahrzeug (§5.5)
// ---------------------------------------------------------------------------

export interface Fahrzeuganlage {
  readonly fahrzeugId: string;
  readonly einheitId: string;
  readonly typ: string;
  readonly bezeichnung?: string;
  readonly kennzeichen?: string;
  readonly status: string;
}

export function fahrzeugAnlegen(anlage: Fahrzeuganlage): Entwurf {
  return {
    typ: "FahrzeugAngelegt",
    nutzlast: {
      fahrzeugId: anlage.fahrzeugId,
      einheitId: anlage.einheitId,
      typ: anlage.typ.trim(),
      ...optional("bezeichnung", anlage.bezeichnung),
      ...optional("kennzeichen", anlage.kennzeichen),
      status: anlage.status,
    },
  };
}

/** §5.4.5 sinngemäß: Entfernen ist kein Löschen, und der Grund ist Pflicht (§2.4). */
export function fahrzeugEntfernen(fahrzeugId: string, grund: string): Entwurf {
  return { typ: "FahrzeugEntfernt", nutzlast: { fahrzeugId }, vorher: null, neu: true, grund: grund.trim() };
}

export function fahrzeugWiederherstellen(fahrzeugId: string): Entwurf {
  return { typ: "FahrzeugWiederhergestellt", nutzlast: { fahrzeugId }, vorher: true, neu: false };
}

// ---------------------------------------------------------------------------
// Person (§5.5)
// ---------------------------------------------------------------------------

export interface Personenanlage {
  readonly personId: string;
  readonly einheitId: string;
  readonly vorname: string;
  readonly nachname: string;
  readonly rolle: string;
  /** Kommagetrennt, wie sie getippt werden: „Kraftfahrer, Sprechfunker“. */
  readonly funktionen: string;
  readonly geschlecht: string;
  readonly ernaehrung: string;
}

/**
 * Eine Person hinzufügen.
 *
 * Fahrerlaubnisse, Kontakte und Zusatzqualifikationen fragt die Maske nicht
 * ab; sie stehen als leere Listen da, weil das Schema sie verlangt. Das ist
 * die Aussage „nicht erfasst“, nicht „keine“ — ein Erfassungsbogen trägt sie
 * nach.
 */
export function personHinzufuegen(anlage: Personenanlage): Entwurf {
  return {
    typ: "PersonHinzugefuegt",
    nutzlast: {
      personId: anlage.personId,
      einheitId: anlage.einheitId,
      nachname: anlage.nachname.trim(),
      vorname: anlage.vorname.trim(),
      rolle: anlage.rolle,
      funktionen: listeAusEingabe(anlage.funktionen),
      fahrerlaubnisse: [],
      geschlecht: anlage.geschlecht,
      ernaehrung: anlage.ernaehrung,
      kontakte: [],
      zusatzqualifikationen: [],
    },
  };
}

export function personEntfernen(personId: string, grund: string): Entwurf {
  return { typ: "PersonEntfernt", nutzlast: { personId }, vorher: null, neu: true, grund: grund.trim() };
}

export function personWiederherstellen(personId: string): Entwurf {
  return { typ: "PersonWiederhergestellt", nutzlast: { personId }, vorher: true, neu: false };
}
