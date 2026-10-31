/**
 * Die Zahlen und Zellen der Einheitenliste — das Blatt „Stärke“ als Ausgabe.
 *
 * Die Excel druckt ihr Hauptblatt mit Strg+P: alle Bereiche untereinander, je
 * Bereich eine Kopfzeile mit Zwischensumme, darunter die Einheiten mit ihren
 * Grunddaten. Das ist die Papier-Rückfallebene für die Lagebesprechung und
 * für den Rechnerausfall — der Druck (eine Zeile je Bereich) beantwortet die
 * Frage „wie viele wo“, diese Liste die Frage „wer genau“.
 *
 * **Hier wird nichts gerechnet, was anderswo schon gerechnet ist.** Die
 * Bereiche und ihre Zwischensummen kommen aus dem Abschnittsbaum
 * (`eigeneStaerke`, K2), die Zeilen aus der Einheitentabelle mit ihren
 * Wörtern statt Schlüsseln, die Vergleichszahlen unten aus dem Druck. Eine
 * Papierliste, deren Summe vom Druck abweicht, der daneben an der Lagekarte
 * hängt, ist in der Lagebesprechung schlechter als keine.
 */

import {
  ARCHIV_ABSCHNITT_ID,
  EINGANG_ABSCHNITT_ID,
  abschnittstypTitel,
  projektion,
  type Staerke,
  type Zustand,
} from "@s1/domaene";

/** Eine Einheit der Liste — alle Zellen schon als Wort, wie sie auf dem Papier stehen. */
export interface Einheitenlistenzeile {
  /** Laufende Nummer über die ganze Liste; auf Papier spricht man von „Zeile 17“. */
  readonly nr: number;
  readonly einheitId: string;
  readonly fuest: string;
  readonly einheit: string;
  readonly organisation: string;
  readonly herkunft: string;
  readonly ebene: string;
  readonly erreichbarkeit: string;
  readonly auftraege: string;
  readonly geraete: string;
  readonly status: string;
  readonly schicht: string;
  readonly staerke: Staerke;
  readonly gesamt: number;
  readonly eingetroffen: string;
  /** Die Zählklasse der einen Zählregel: Ist, erwartet oder beendet (Rückmarsch). */
  readonly klasse: "ist" | "erwartet" | "beendet" | "ausserhalb";
}

/** Ein Bereich mit seiner Kopfzeile und seinen Einheiten. */
export interface Einheitenlistenbereich {
  readonly abschnittId: string;
  readonly name: string;
  /** Der Abschnittstyp als Wort, etwa „Bereitstellungsraum“. */
  readonly typ: string;
  readonly tiefe: number;
  /** Die Ist-Stärke des Bereichs (Zählregel) — dieselbe Zahl wie in der Druckzeile. */
  readonly staerke: Staerke;
  readonly gesamt: number;
  /** Erwartete Köpfe (angefordert/Anmarsch/Eingang) in diesem Bereich — nicht in `staerke`. */
  readonly erwartet: number;
  /** §5.3: geht die Stärke dieses Bereichs in die Gesamtstärke ein? */
  readonly zaehlt: boolean;
  readonly zeilen: readonly Einheitenlistenzeile[];
}

export interface Einheitenlistendaten {
  readonly einsatzName: string;
  readonly fuestName: string;
  readonly bereiche: readonly Einheitenlistenbereich[];
  /** Zahl der aufgeführten Einheiten. */
  readonly einheiten: number;
  /** Die Ist-Stärke aller Bereiche — dieselbe Zahl wie Kopfband, Druck und Status. */
  readonly ist: Staerke;
  readonly istGesamt: number;
  /** Erwartete Kräfte (angefordert/Anmarsch/Eingang): in der Liste aufgeführt, aber nicht in der Ist-Stärke. */
  readonly erwartet: Staerke;
  readonly erwartetGesamt: number;
  /** Alle erfassten Einheiten (Ist + erwartet, ohne beendet/Rückmarsch; wie die Status-Matrix) — nicht die Ist-Stärke. */
  readonly alle: Staerke;
  readonly alleGesamt: number;
  /** Einheiten im Bereich „Einsatz beendet“: Sie stehen nicht in der Liste, ihre Zahl schon. */
  readonly beendet: number;
}

const NULL: Staerke = { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 };

function plus(a: Staerke, b: Staerke): Staerke {
  return {
    fuehrer: a.fuehrer + b.fuehrer,
    unterfuehrer: a.unterfuehrer + b.unterfuehrer,
    mannschaft: a.mannschaft + b.mannschaft,
  };
}

function summe(staerke: Staerke): number {
  return staerke.fuehrer + staerke.unterfuehrer + staerke.mannschaft;
}

function text(wert: unknown, ersatz = ""): string {
  return typeof wert === "string" && wert !== "" ? wert : ersatz;
}

function zellentext(zeile: projektion.Tabellenzeile, schluessel: string): string {
  return zeile.zellen[schluessel]?.text ?? "";
}

/** Eine Tabellenzeile der Projektion als Listenzeile — nur umgepackt, nicht umgerechnet. */
function listenzeile(zeile: projektion.Tabellenzeile, nr: number): Einheitenlistenzeile {
  return {
    nr,
    einheitId: zeile.einheitId,
    fuest: zellentext(zeile, "fuestKennung"),
    einheit: zeile.anzeige,
    organisation: zellentext(zeile, "organisation"),
    herkunft: zellentext(zeile, "herkunft"),
    ebene: zellentext(zeile, "ebene"),
    erreichbarkeit: zellentext(zeile, "erreichbarkeit"),
    auftraege: zellentext(zeile, "auftraege"),
    geraete: zellentext(zeile, "geraete"),
    status: zellentext(zeile, "status"),
    schicht: zellentext(zeile, "schicht"),
    staerke: zeile.staerke,
    gesamt: zeile.gesamt,
    eingetroffen: zellentext(zeile, "eingetroffenAm"),
    klasse: zeile.zaehlklasse,
  };
}

/**
 * Rechnet die Einheitenliste.
 *
 * **Leere Bereiche bleiben stehen**, anders als im Druck: Auf der Papierliste
 * sind sie die Stelle, an der bei Rechnerausfall von Hand weitergeschrieben
 * wird. Nur der Eingang fehlt, solange er leer ist — er ist eine
 * Warteschlange und kein Bereich der Excel (§5.3.4).
 *
 * **„Einsatz beendet“ steht nicht in der Liste.** Seine Einheiten zählen
 * weder im Druck noch in der Status-Matrix; stünden sie hier mit, ginge die
 * Summe dieser Liste mit keinem der beiden Ausdrucke auf. Ihre Zahl steht
 * unten, damit niemand sie für verloren hält.
 */
export function einheitenlistendaten(zustand: Zustand): Einheitenlistendaten {
  const knoten = projektion.baumZeilen(
    projektion.abschnittsbaum(zustand, { ohneArchiv: true, ohneAufgeloeste: true }),
  );
  let nr = 0;
  const bereiche: Einheitenlistenbereich[] = [];
  for (const k of knoten) {
    if (k.id === EINGANG_ABSCHNITT_ID && k.einheiten === 0) continue;
    const tabelle = projektion.einheitentabelle(zustand, { abschnittId: k.id });
    bereiche.push({
      abschnittId: k.id,
      name: k.name,
      typ: abschnittstypTitel(k.typ),
      tiefe: k.tiefe,
      staerke: k.eigeneStaerke,
      gesamt: summe(k.eigeneStaerke),
      erwartet: k.erwartet,
      zaehlt: k.zaehlt,
      zeilen: tabelle.zeilen.map((zeile) => listenzeile(zeile, (nr += 1))),
    });
  }

  const zeilen = bereiche.flatMap((b) => b.zeilen);
  const ist = bereiche.reduce<Staerke>((s, b) => plus(s, b.staerke), NULL);
  const erwartet = zeilen.filter((z) => z.klasse === "erwartet").reduce<Staerke>((s, z) => plus(s, z.staerke), NULL);
  const alle = zeilen.filter((z) => z.klasse === "ist" || z.klasse === "erwartet").reduce<Staerke>((s, z) => plus(s, z.staerke), NULL);
  return {
    einsatzName: text(zustand.einsatz?.name.wert, "(ohne Namen)"),
    fuestName: text(zustand.einsatz?.fuestName.wert),
    bereiche,
    einheiten: nr,
    ist,
    istGesamt: summe(ist),
    erwartet,
    erwartetGesamt: summe(erwartet),
    alle,
    alleGesamt: summe(alle),
    beendet: projektion.einheitentabelle(zustand, { abschnittId: ARCHIV_ABSCHNITT_ID, anzahl: 0 }).gesamtzahl,
  };
}
