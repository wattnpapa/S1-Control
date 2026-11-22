/**
 * Die Einheit aus einer Anforderung — Vorschlag und Auswahl (M5.3).
 *
 * „Eingetroffen“ an einer Anforderung heißt in der Excel: Jemand trägt eine
 * neue Zeile von Hand ein und tippt dabei ab, was in der Anforderung schon
 * steht. Diese Datei liefert, was die Maske „Einheit aus Anforderung anlegen“
 * vorbelegt, und die Liste, aus der die Ablöse-Einheit einer neuen
 * Anforderung gewählt wird. Beides ist Ableitung, kein Zustand.
 */

import { zaehlklasse } from "../kennzahlen.js";
import type { Id, Staerke } from "../werte.js";
import type { AnforderungZustand, EinheitZustand, Zustand } from "../zustand.js";

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
  /** Der vorgesehene Auftrag der Anforderung; leer, wenn keiner genannt ist. */
  readonly auftrag: string;
  /** Der Einsatzbereich der abzulösenden Einheit, wenn er in die Stärke zählt. */
  readonly abschnittId?: Id;
  /** Von welcher Einheit Organisation, Ebene und Stärke stammen. */
  readonly nachVorbildVon?: string;
}

const NULLSTAERKE: Staerke = { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 };

function feldtext(feld: { readonly wert: unknown } | undefined, ersatz: string): string {
  return typeof feld?.wert === "string" && feld.wert !== "" ? feld.wert : ersatz;
}

/**
 * Der Bereich der abzulösenden Einheit, wenn er in die Gesamtstärke zählt.
 *
 * Nicht vorgeschlagen wird „Angefordert / Anmarsch“: Eine dort angelegte,
 * eingetroffene Einheit stünde in der Lage, zählte aber nicht in die
 * Ist-Stärke. Ohne zählenden Bereich bleibt die Wahl leer und ist zu treffen.
 */
function zaehlenderBereich(zustand: Zustand, vorbild: EinheitZustand | undefined): Id | undefined {
  if (vorbild === undefined) return undefined;
  const bereich = zustand.abschnitte[vorbild.wirksamerAbschnittId];
  return bereich?.zaehltInGesamtstaerke === true ? bereich.id : undefined;
}

export function einheitsvorschlag(zustand: Zustand, anforderung: AnforderungZustand): Einheitsvorschlag {
  const vorbildId = anforderung.abzuloesendeEinheitId?.wert;
  const vorbild = typeof vorbildId === "string" ? zustand.einheiten[vorbildId] : undefined;
  const zusage = anforderung.zusage?.wert as { zugesagtVon?: unknown } | null | undefined;
  const abschnittId = zaehlenderBereich(zustand, vorbild);
  return {
    bezeichnung: feldtext(anforderung.vorgeseheneEinheitText, feldtext(vorbild?.bezeichnung, "")),
    organisation: feldtext(vorbild?.organisation, "THW"),
    ebene: feldtext(vorbild?.ebene, "GRUPPE"),
    // Die Stärke der abzulösenden Einheit ist die Vorbelegung: Eine Ablösung
    // ist in aller Regel gleich stark, und eine Null im Kopf wäre die
    // falschere Aussage. Die Maske zeigt sie änderbar und nennt die Herkunft
    // („nachVorbildVon“); ohne Vorbild bleibt es bei 0/0/0.
    staerke: vorbild?.wirksameStaerke ?? NULLSTAERKE,
    auftrag: feldtext(anforderung.vorgesehenerAuftrag, ""),
    herkunft: typeof zusage?.zugesagtVon === "string" ? zusage.zugesagtVon : "",
    ...(abschnittId === undefined ? {} : { abschnittId }),
    ...(vorbild === undefined ? {} : { nachVorbildVon: feldtext(vorbild.bezeichnung, vorbild.id) }),
  };
}

/** Eine Einheit zur Auswahl — Id und Name, dazu, was das Einbuchen beim Verknüpfen braucht. */
export interface Einheitenwahl {
  readonly id: Id;
  readonly name: string;
  /**
   * Additiv (Stab-Review S1, B-S1-2): Abschnitt und Status, wie sie im Zustand
   * stehen, die Eintreffzeit, und ob die Einheit noch erwartet wird
   * (angefordert, Anmarsch). „Verknüpfen“ an der Anforderung bucht sie damit ein.
   */
  readonly abschnittId?: Id;
  readonly status?: string;
  readonly eingetroffenAm?: string;
  readonly erwartet?: boolean;
}

/**
 * Die Einheiten, die abgelöst werden können: nicht entfernt, nicht
 * aufgegangen, nach Name geordnet. Die Liste gehört zum Blatt
 * Anforderungen und nicht zur Tabelle, weil die Tabelle nur einen Ausschnitt
 * trägt (M3.7) — und eine Auswahl aus einem Ausschnitt verschwiege Einheiten.
 */
function wahlAus(zustand: Zustand, einheit: EinheitZustand): Einheitenwahl {
  const abschnittId = einheit.abschnittId.wert;
  const status = einheit.status.wert;
  const eingetroffenAm = einheit.eingetroffenAm?.wert;
  return {
    id: einheit.id,
    name: feldtext(einheit.bezeichnung, einheit.id),
    ...(typeof abschnittId === "string" ? { abschnittId } : {}),
    ...(typeof status === "string" ? { status } : {}),
    ...(typeof eingetroffenAm === "string" ? { eingetroffenAm } : {}),
    erwartet: zaehlklasse(zustand, einheit) === "erwartet",
  };
}

export function einheitenwahl(zustand: Zustand): readonly Einheitenwahl[] {
  return Object.values(zustand.einheiten)
    .filter((einheit) => einheit.entfernt?.wert !== true && !einheit.wirksamAufgegangen)
    .map((einheit) => wahlAus(zustand, einheit))
    .sort((a, b) => a.name.localeCompare(b.name, "de-DE") || (a.id < b.id ? -1 : 1));
}
