/**
 * Die Einheit aus einer Anforderung — Vorschlag und Auswahl (M5.3).
 *
 * „Eingetroffen“ an einer Anforderung heißt in der Excel: Jemand trägt eine
 * neue Zeile von Hand ein und tippt dabei ab, was in der Anforderung schon
 * steht. Diese Datei liefert, was die Maske „Einheit aus Anforderung anlegen“
 * vorbelegt, und die Liste, aus der die Ablöse-Einheit einer neuen
 * Anforderung gewählt wird. Beides ist Ableitung, kein Zustand.
 */

import type { Id, Staerke } from "../werte.js";
import type { AnforderungZustand, Zustand } from "../zustand.js";

/**
 * Was die Maske „Einheit aus Anforderung anlegen“ vorbelegt.
 *
 * Die Anforderung selbst trägt nur den Text der vorgesehenen Einheit und den,
 * der zugesagt hat. Organisation, Ebene und Stärke kommen deshalb von der
 * Einheit, die abgelöst wird: Eine Ablösung ist in aller Regel eine Einheit
 * derselben Art. Die Maske zeigt das als Vorbelegung, nicht als Meldung —
 * die Zahlen sind zu prüfen, bevor sie gelten.
 */
export interface Einheitsvorschlag {
  readonly bezeichnung: string;
  readonly organisation: string;
  readonly ebene: string;
  readonly staerke: Staerke;
  readonly herkunft: string;
  /** Der Bereich „Angefordert / Anmarsch“, wenn es ihn gibt. */
  readonly abschnittId?: Id;
  /** Von welcher Einheit Organisation, Ebene und Stärke stammen. */
  readonly nachVorbildVon?: string;
}

const NULLSTAERKE: Staerke = { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 };

function feldtext(feld: { readonly wert: unknown } | undefined, ersatz: string): string {
  return typeof feld?.wert === "string" && feld.wert !== "" ? feld.wert : ersatz;
}

/** Der erste nicht aufgelöste Abschnitt vom Typ „Angefordert / Anmarsch“, nach Id geordnet. */
export function anmarschabschnitt(zustand: Zustand): Id | undefined {
  return Object.values(zustand.abschnitte)
    .filter((abschnitt) => abschnitt.typ.wert === "ANGEFORDERT" && (abschnitt.aufgeloest?.wert ?? null) === null)
    .map((abschnitt) => abschnitt.id)
    .sort()[0];
}

export function einheitsvorschlag(zustand: Zustand, anforderung: AnforderungZustand): Einheitsvorschlag {
  const vorbildId = anforderung.abzuloesendeEinheitId?.wert;
  const vorbild = typeof vorbildId === "string" ? zustand.einheiten[vorbildId] : undefined;
  const zusage = anforderung.zusage?.wert as { zugesagtVon?: unknown } | null | undefined;
  const abschnittId = anmarschabschnitt(zustand);
  return {
    bezeichnung: feldtext(anforderung.vorgeseheneEinheitText, feldtext(vorbild?.bezeichnung, "")),
    organisation: feldtext(vorbild?.organisation, "THW"),
    ebene: feldtext(vorbild?.ebene, "GRUPPE"),
    // Die Stärke bleibt 0/0/0, auch wenn ein Vorbild da ist: Was die
    // eintreffende Einheit stark ist, weiß nur ihre Meldung. Eine Zahl, die
    // niemand gemeldet hat, ist in der Stärkeübersicht der gefährlichere
    // Fehler als eine Null, die auffällt.
    staerke: NULLSTAERKE,
    herkunft: typeof zusage?.zugesagtVon === "string" ? zusage.zugesagtVon : "",
    ...(abschnittId === undefined ? {} : { abschnittId }),
    ...(vorbild === undefined ? {} : { nachVorbildVon: feldtext(vorbild.bezeichnung, vorbild.id) }),
  };
}

/** Eine Einheit zur Auswahl — Id und Name, mehr braucht die Liste nicht. */
export interface Einheitenwahl {
  readonly id: Id;
  readonly name: string;
}

/**
 * Die Einheiten, die abgelöst werden können: nicht entfernt, nicht
 * aufgegangen, nach Name geordnet. Die Liste gehört zum Blatt
 * Anforderungen und nicht zur Tabelle, weil die Tabelle nur einen Ausschnitt
 * trägt (M3.7) — und eine Auswahl aus einem Ausschnitt verschwiege Einheiten.
 */
export function einheitenwahl(zustand: Zustand): readonly Einheitenwahl[] {
  return Object.values(zustand.einheiten)
    .filter((einheit) => einheit.entfernt?.wert !== true && !einheit.wirksamAufgegangen)
    .map((einheit) => ({ id: einheit.id, name: feldtext(einheit.bezeichnung, einheit.id) }))
    .sort((a, b) => a.name.localeCompare(b.name, "de-DE") || (a.id < b.id ? -1 : 1));
}
