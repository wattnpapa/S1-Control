/**
 * Die Bedienschritte der Einheitentabelle als reine Funktionen (M3.2).
 *
 * **Das Gegenstück zu den Projektionen.** Jene leiten aus dem Zustand ab, was
 * die Ansicht zeigt; diese leiten aus einer Handlung ab, welches Ereignis
 * geschrieben wird. Beides sind Regeln aus §5.4, und beides gehört aus
 * demselben Grund nicht in eine `.tsx`: Eine Regel, die zwischen JSX steht,
 * ist nur über das DOM prüfbar — und dann prüft man die Darstellung mit.
 *
 * Sie liegen hier und nicht in `@s1/domaene`, weil sie den {@link Entwurf} des
 * IPC-Kontrakts bauen und damit zur Schale gehören. Und sie liegen **beim
 * Kontrakt** und nicht beim Renderer, obwohl sie von Masken gerufen werden:
 * Die Szenarientests fahren dieselben Entwürfe gegen den Aktendienst, und der
 * gehört zum Main-Projekt. Läge das Modul beim Renderer, hätte ein Test
 * entweder die Ringgrenze zu brechen oder eine zweite Bauweise zu erfinden —
 * und die zweite ist immer die ältere (02-ZIELBILD.md, „Vier Ringe“). Was sie **nicht** tun: Id,
 * HLC, Akteur und Wanduhr setzen. Die gehören dem Schreiber
 * (KONZEPT-SPEICHER.md §2.4); ein Renderer, der eine HLC vergäbe, hätte eine
 * Uhr und damit Fachzustand.
 *
 * **Jeder setzende Schritt trägt seinen `vorher`-Wert** (§2.2a, Auflage 6).
 * Er kommt aus der Zelle, die dieses Fenster gerade zeigt — „was ich gesehen
 * habe", nicht „was gilt“. Genau diese Unterscheidung macht den
 * Konflikthinweis erst möglich.
 */

import type { EinheitVorlage, Spalte, Staerke, Tabellenzeile } from "@s1/domaene";

import type { Entwurf } from "./index.js";

/** Der Vorbelegungsstatus einer neu angelegten Einheit (§5.4, Blatt „Stärke“ Spalte Z). */
export const STATUS_VORBELEGUNG = "ANGEFORDERT";

/**
 * Baut den Entwurf einer Inline-Änderung.
 *
 * Die Zuordnung Spalte → Ereignisart steht in der Spaltentabelle von Ring 2
 * (`projektion/tabelle.ts`); hier wird sie nur ausgeführt. Eine
 * Fallunterscheidung über Spaltennamen an dieser Stelle wäre dieselbe Tabelle
 * ein zweites Mal — und die zweite veraltet.
 */
export function inlineEntwurf(
  spalte: Spalte,
  einheitId: string,
  vorher: unknown,
  neu: unknown,
  grund?: string,
): Entwurf | undefined {
  const weg = spalte.schreibt;
  if (weg === undefined) return undefined;
  const rahmen = { vorher, neu, ...(grund === undefined ? {} : { grund }) };
  switch (weg.art) {
    case "stammdaten":
      return { typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId, feld: weg.feld }, ...rahmen };
    case "zeitpunkt":
      return { typ: "ZeitpunktGesetzt", nutzlast: { einheitId, feld: weg.feld }, ...rahmen };
    case "logistik":
      return { typ: "LogistikGesetzt", nutzlast: { einheitId, feld: weg.feld }, ...rahmen };
    case "festeArt":
      return { typ: weg.typ, nutzlast: { einheitId }, ...rahmen };
  }
}

/**
 * Wandelt die Eingabe eines Feldes in den Wert, den das Ereignis trägt.
 *
 * Eine leere Eingabe wird **`null`** und nicht `""` oder `undefined`: §3.2
 * unterscheidet „nie gesetzt“ (das Feld fehlt) von „ausdrücklich als leer
 * gesetzt" (`null`). Wer ein Feld leert, meint das zweite — und ein `""`
 * stünde im Zustand als gesetzter leerer Text und im Ausdruck als leere
 * Zelle, die von einer nie gefüllten nicht zu unterscheiden wäre.
 */
export function eingabeAlsWert(spalte: Spalte, eingabe: string): unknown {
  const geputzt = eingabe.trim();
  if (geputzt === "") return null;
  if (spalte.art === "zahl") {
    const zahl = Number.parseInt(geputzt, 10);
    return Number.isNaN(zahl) ? null : zahl;
  }
  return geputzt;
}

export interface AnlageAusVorlage {
  readonly einheitId: string;
  readonly abschnittId: string;
  readonly vorlage: EinheitVorlage;
  readonly reihenfolge: number;
  /** Abweichende Stärke; ohne sie gilt die Soll-Stärke der Vorlage. */
  readonly staerke?: Staerke;
  readonly herkunft?: string;
}

/**
 * Eine Einheit aus einer Vorlage anlegen.
 *
 * **Die Soll-Stärke wird übernommen, nicht erfunden.** Fehlt sie der Vorlage
 * (`sollStaerke` ist optional, weil die Quelle nicht immer eine hergibt),
 * steht 0/0/0 da — und nicht ein geschätzter Wert. Eine Zahl, die niemand
 * gemeldet hat, ist in einer Stärkeübersicht der gefährlichere Fehler.
 *
 * Der Status ist `ANGEFORDERT` und nicht `IM_EINSATZ`: Wer aus dem
 * Vorlagenkatalog anlegt, plant Kräfte — er meldet sie nicht als anwesend.
 * `vorlageId` bleibt an der Einheit stehen, damit später nachvollziehbar ist,
 * woher die Soll-Werte kamen (ZDM §3.2).
 */
export function anlageAusVorlage(auftrag: AnlageAusVorlage): Entwurf {
  const staerke = auftrag.staerke ?? auftrag.vorlage.sollStaerke ?? { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 };
  return {
    typ: "EinheitGemeldet",
    nutzlast: {
      einheitId: auftrag.einheitId,
      abschnittId: auftrag.abschnittId,
      bezeichnung: auftrag.vorlage.bezeichnung,
      organisation: auftrag.vorlage.organisation,
      // §5.1, `zHierarchieEbene`: Die Stufe heißt `art` und `name`, nicht
      // `ebene` und `bezeichnung` — der Typ `HierarchieEbene` in `werte.ts`
      // nennt sie anders, und maßgeblich ist das Schema, gegen das der
      // Aktendienst prüft (Befund H-B1 im Bericht zu M3).
      hierarchie:
        auftrag.herkunft === undefined || auftrag.herkunft.trim() === ""
          ? []
          : [{ art: "ORTSVERBAND", name: auftrag.herkunft.trim() }],
      ebene: auftrag.vorlage.ebene,
      staerke,
      personalErfassung: "NUR_STAERKE",
      status: STATUS_VORBELEGUNG,
      reihenfolge: auftrag.reihenfolge,
      istFuehrungDesAbschnitts: false,
      vorlageId: auftrag.vorlage.id,
    },
  };
}

/**
 * Eine Einheit verschieben.
 *
 * §5.3.2 Punkt 2: Die Verschiebung wird gefaltet, auch wenn der Zielabschnitt
 * inzwischen aufgelöst ist — die Wirkung ist dann der Weiterlauf ins Ziel der
 * Auflösung. Die Maske prüft das deshalb **nicht** nach: Eine Prüfung, die der
 * Fold ohnehin anders entscheidet, wäre eine zweite Regel.
 */
export function verschiebung(einheitId: string, vonAbschnittId: string, nachAbschnittId: string): Entwurf {
  return {
    typ: "EinheitVerschoben",
    nutzlast: { einheitId },
    vorher: vonAbschnittId,
    neu: nachAbschnittId,
  };
}

export interface Aufteilung {
  readonly quelle: Tabellenzeile;
  readonly neueEinheitId: string;
  readonly bezeichnung: string;
  readonly abgeteilteStaerke: Staerke;
  readonly abschnittId: string;
  readonly reihenfolge: number;
  readonly organisation: string;
  readonly ebene: string;
  /** Fahrzeuge und Personen, die mitwandern (§5.9.2, letzter Absatz). */
  readonly fahrzeugIds?: readonly string[];
  readonly personIds?: readonly string[];
}

/**
 * Eine Einheit aufteilen.
 *
 * **Die Wirkung ist relativ** (§5.4.2, Auflage 10): `abgeteilteStaerke` wird
 * der Quelle abgezogen, und der Abzug steht an der **neuen** Einheit, nicht
 * als absolute Neuberechnung an der Quelle. Zwei nebenläufige Aufteilungen
 * derselben Quelle ergeben so beide ihren Abzug; eine absolute Angabe ließe
 * die zweite die erste überschreiben, und zwölf Helfer verschwänden.
 *
 * `gesehen` ist die Quellstärke, die dieser Bediener beim Aufteilen vor sich
 * hatte. Sie ist der `vorher`-Wert dieses Vorgangs (§5.4.3) — ohne sie könnte
 * der Fold `vorgangSummeWeichtAb` nicht bilden.
 *
 * Die Fahrzeuge und Personen wandern **in demselben Vorgang** mit: §5.9.2
 * hält fest, dass sonst alles, was auf die Quelle zeigt, weiter dorthin zeigt.
 */
export function aufteilung(auftrag: Aufteilung): Entwurf {
  return {
    typ: "EinheitAufgeteilt",
    nutzlast: {
      quellEinheitId: auftrag.quelle.einheitId,
      neueEinheitId: auftrag.neueEinheitId,
      neueEinheit: {
        abschnittId: auftrag.abschnittId,
        bezeichnung: auftrag.bezeichnung,
        organisation: auftrag.organisation,
        hierarchie: [],
        ebene: auftrag.ebene,
        staerke: auftrag.abgeteilteStaerke,
        personalErfassung: "NUR_STAERKE",
        status: STATUS_VORBELEGUNG,
        reihenfolge: auftrag.reihenfolge,
        istFuehrungDesAbschnitts: false,
      },
      abgeteilteStaerke: auftrag.abgeteilteStaerke,
      gesehen: auftrag.quelle.staerke,
      uebernommeneFahrzeuge: (auftrag.fahrzeugIds ?? []).map((fahrzeugId) => ({
        fahrzeugId,
        gesehenEinheitId: auftrag.quelle.einheitId,
      })),
      uebernommenePersonen: (auftrag.personIds ?? []).map((personId) => ({
        personId,
        gesehenEinheitId: auftrag.quelle.einheitId,
      })),
    },
  };
}

/**
 * Einheiten zusammenführen.
 *
 * Je Quelle die Stärke, die der Bediener sah (§5.4.3) — dieselbe Begründung
 * wie beim Aufteilen: Die Wirkung ist additiv am Ziel und einmalig je Quelle,
 * und der gesehene Wert ist das, woran der Fold eine Abweichung erkennt.
 *
 * **Der Weg zurück gibt die Quelle nicht wieder her** (§5.9.2): Wer eine
 * Zusammenführung rückgängig macht, teilt aus dem Ziel eine Einheit mit
 * **neuer** Id ab. Das ist keine Eigenheit dieser Funktion, sondern der Grund,
 * aus dem die Maske vor dem Zusammenführen fragt.
 */
export function zusammenfuehrung(zielEinheitId: string, quellen: readonly Tabellenzeile[]): Entwurf {
  return {
    typ: "EinheitZusammengefuehrt",
    nutzlast: {
      zielEinheitId,
      quellen: quellen.map((zeile) => ({ einheitId: zeile.einheitId, gesehen: zeile.staerke })),
    },
  };
}

/**
 * Eine Einheit entfernen.
 *
 * §2.4 macht den Grund zur Pflicht, und §5.4.5 sagt, warum: Entfernen ist
 * kein Löschen. Die Einheit bleibt im Zustand, fällt aber aus allen Summen —
 * wer das später liest, muss erfahren, warum eine gemeldete Kraft nicht mehr
 * zählt.
 */
export function entfernung(einheitId: string, grund: string): Entwurf {
  return {
    typ: "EinheitEntfernt",
    nutzlast: { einheitId },
    vorher: null,
    neu: true,
    grund,
  };
}

/**
 * Die vier Kostenparameter des Einsatzes (M5.2).
 *
 * Sie stehen in der Anlage `EinsatzAngelegt.kosten` und belegen die Pfade
 * `einsatz/kosten/<feld>` (§5.2). Waeren sie Konstanten im Code, haette der
 * Zustand einen Anfangswert ohne Ereignisquelle, und `vorher` der ersten
 * Aenderung passte auf nichts — deshalb traegt schon die Anlage sie mit.
 *
 * `einsatzId` gehoert in die Nutzlast, obwohl es je Akte nur einen Einsatz
 * gibt: Der Rahmen benennt den Bezug, und ein Ereignis ohne ihn waere in einer
 * zusammengefuehrten Akte nicht mehr zuzuordnen (§2.2).
 */
export const KOSTENFELDER = [
  "psaKostenProSatz",
  "vdaProTag",
  "ukVerpflegungProTag",
  "geplanteEinsatztage",
] as const;

export type Kostenfeld = (typeof KOSTENFELDER)[number];

export function kostenParameter(
  einsatzId: string,
  feld: Kostenfeld,
  vorher: number,
  neu: number,
): Entwurf {
  return { typ: "KostenParameterGeaendert", nutzlast: { einsatzId, feld }, vorher, neu };
}

// ---------------------------------------------------------------------------
// Anforderungen (M5.3)
// ---------------------------------------------------------------------------

/** Die Anlage einer Anforderung — Form (b): die Nutzlast **ist** die Anlage (§2.2). */
export interface Anforderungsanlage {
  readonly anforderungId: string;
  readonly kennung?: string;
  readonly abzuloesendeEinheitId?: string;
  readonly vorgeseheneEinheitText?: string;
  readonly vorgesehenerAuftrag?: string;
  readonly angefordertAm: string;
  readonly bemerkung?: string;
}

export function anforderungAnlegen(anlage: Anforderungsanlage): Entwurf {
  // Ohne `vorher` und ohne `neu`: Eine Anlage hat keinen Vorher-Wert, und
  // §2.2a prueft an ihr nichts.
  return { typ: "AnforderungAngelegt", nutzlast: { ...anlage } };
}

/** Die Felder, die `AnforderungGeaendert` kennt (§5.6). */
export const ANFORDERUNGSFELDER = [
  "kennung",
  "abzuloesendeEinheitId",
  "vorgeseheneEinheitText",
  "vorgesehenerAuftrag",
  "bemerkung",
  "angefordertAm",
] as const;

export type Anforderungsfeld = (typeof ANFORDERUNGSFELDER)[number];

export function anforderungGeaendert(
  anforderungId: string,
  feld: Anforderungsfeld,
  vorher: unknown,
  neu: unknown,
): Entwurf {
  return { typ: "AnforderungGeaendert", nutzlast: { anforderungId, feld }, vorher, neu };
}

/**
 * Die Zusage (§5.6.2).
 *
 * Der Wert traegt `zugesagtFuer` — genau diesen Schluessel plausibilisiert der
 * Fold als Planzeit (§2.5). `zustand.ts` beschreibt das Feld abweichend; die
 * Fassung des Folds gilt, weil an ihr Verhalten haengt.
 */
export function abloesungZugesagt(
  anforderungId: string,
  zugesagtFuer: string,
  zugesagtVon: string,
): Entwurf {
  return {
    typ: "AbloesungZugesagt",
    nutzlast: { anforderungId },
    vorher: null,
    neu: { zugesagtFuer, zugesagtVon },
  };
}

export function anforderungErledigt(anforderungId: string, erledigtAm: string): Entwurf {
  return {
    typ: "AnforderungErledigt",
    nutzlast: { anforderungId },
    vorher: null,
    neu: { erledigtAm },
  };
}

/** Das Storno — §2.4 macht den Grund hier zur Pflicht. */
export function anforderungStorniert(anforderungId: string, grund: string): Entwurf {
  return {
    typ: "AnforderungStorniert",
    nutzlast: { anforderungId },
    vorher: false,
    neu: true,
    grund,
  };
}

/**
 * Die drei Ruecknahmen (§5.6.2).
 *
 * Sie sind **keine** Undo-Ereignisse: Undo nimmt das juengste eigene Ereignis
 * zurueck (U1), eine Ruecknahme hier setzt ein bestimmtes Feld auf `null` und
 * darf jederzeit kommen — auch fuer ein fremdes Ereignis, auch spaeter. Ohne
 * sie waere ein Rueckschritt nur durch Ausschluss des Originals aus der
 * Ereignismenge darstellbar, und genau das schliesst U1 aus.
 */
export const RUECKNAHMEN = {
  zusage: "ZusageZurueckgenommen",
  erledigung: "ErledigungZurueckgenommen",
  storno: "StornoZurueckgenommen",
} as const;

export function ruecknahme(
  anforderungId: string,
  was: keyof typeof RUECKNAHMEN,
  grund?: string,
): Entwurf {
  return {
    typ: RUECKNAHMEN[was],
    nutzlast: { anforderungId },
    neu: null,
    ...(grund === undefined ? {} : { grund }),
  };
}
