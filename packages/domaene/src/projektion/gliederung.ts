/**
 * Die Gliederung der Einheitentabelle nach Bereichen.
 *
 * Das Blatt „Stärke“ der Excel ist keine flache Liste: Jeder Bereich —
 * Führungsstelle, Meldekopf, Logistik, Angefordert/Anmarsch, die
 * Bereitstellungsräume, die Einsatzorte, „Einsatz beendet“ — hat eine
 * Kopfzeile mit seinem Namen und seiner Summe, darunter stehen seine
 * Einheiten. Wer die Tabelle liest, sieht Gesamtliste und Gliederung zugleich.
 * Diese Datei liefert genau das: die Einheiten in der Ordnung des
 * Abschnittsbaums und je Bereich eine Kopfzeile mit Zwischensumme.
 *
 * **Gerechnet wird wie im Baum, nicht neu.** Die eigene Stärke eines Bereichs
 * folgt K2 (`abschnittStaerke`): alles, was in der Lage steht, also weder
 * entfernt noch aufgegangen. Die Summe mit Unterabschnitten folgt
 * `Baumknoten.summenStaerke`. Die Summe des Einsatzes folgt K3: nur Einheiten
 * mit `zaehlt` — ohne Angefordert, Eingang und „Einsatz beendet“ —, und die
 * angeforderten stehen daneben. Ohne Filter sind das dieselben Zahlen wie in
 * Baum und Kopfband; mit Filter dieselben Regeln über die gefilterte Menge.
 *
 * **Eine bewusste Abweichung:** K2 nimmt den Abschnitt „Einsatz beendet“
 * (`ARCHIV`) aus der Lage, der Baum zeigt dort deshalb null. Unter der
 * Kopfzeile stehen in der Tabelle aber die beendeten Einheiten, und eine
 * Kopfzeile, die über drei Einheiten „0 Einh.“ sagt, ist ein Widerspruch im
 * selben Blick. Die Kopfzeile summiert sie deshalb und trägt `zaehlt: false` —
 * wie die Excel, deren Bereich „Einsatz beendet“ seine Stärke ebenfalls nennt.
 */

import { STAERKE_NULL, staerkePlus, type Id, type Staerke } from "../werte.js";
import { EINGANG_ABSCHNITT_ID, type EinheitZustand, type Zustand } from "../zustand.js";
import { abschnittsbaum, type Baumknoten } from "./baum.js";

/** Die Kopfzeile eines Bereichs. */
export interface Bereichskopf {
  readonly abschnittId: Id;
  readonly name: string;
  readonly typ: string;
  /** Tiefe im Abschnittsbaum; 0 ist ein Bereich an der Wurzel. */
  readonly tiefe: number;
  /** Index der ersten Zeile dieses Bereichs in der gegliederten Gesamtliste. */
  readonly von: number;
  /** Zeilen unmittelbar unter dieser Kopfzeile, auch mitgezeigte stillgelegte. */
  readonly zeilen: number;
  /** Einheiten unmittelbar in diesem Bereich, die in der Lage stehen. */
  readonly einheiten: number;
  /** Deren Stärke (K2). */
  readonly staerke: Staerke;
  /** Einheiten dieses Bereichs und aller Unterabschnitte. */
  readonly einheitenSumme: number;
  /** Deren Stärke — dieselbe Zahl wie `Baumknoten.summenStaerke`. */
  readonly summenStaerke: Staerke;
  /** Geht dieser Bereich in die Gesamtstärke ein (§5.3)? */
  readonly zaehlt: boolean;
}

/** Die oberste Kopfzeile: der Einsatz gesamt. */
export interface Einsatzsumme {
  /** Einheiten, die in die Gesamtstärke zählen (K3, `E*`). */
  readonly einheiten: number;
  /** Ihre Stärke — ohne Filter dieselbe Zahl wie im Kopfband. */
  readonly staerke: Staerke;
  /** Einheiten in Abschnitten vom Typ `ANGEFORDERT`, getrennt ausgewiesen. */
  readonly angefordertEinheiten: number;
  readonly angefordert: Staerke;
}

export interface Tabellengliederung {
  readonly bereiche: readonly Bereichskopf[];
  readonly einsatz: Einsatzsumme;
}

export interface Gliederungsoptionen {
  /** Bereiche ohne Zeilen (auch in den Unterabschnitten) weglassen. */
  readonly ohneLeereBereiche?: boolean;
  /** Die Tabelle ist auf diesen Abschnitt gefiltert: nur seine Kopfzeile. */
  readonly abschnittId?: Id;
}

export interface GegliederteEinheiten {
  /** Die Einheiten in der Reihenfolge der Kopfzeilen. */
  readonly einheiten: readonly EinheitZustand[];
  readonly gliederung: Tabellengliederung;
}

/** Ein Bereich während des Aufbaus — `von` kommt erst beim Abflachen dazu. */
interface Rohbereich extends Omit<Bereichskopf, "von"> {
  readonly mitglieder: readonly EinheitZustand[];
  /** Zeilen dieses Bereichs und aller Unterabschnitte. */
  readonly zeilenSumme: number;
}

function inDerLage(einheit: EinheitZustand): boolean {
  return einheit.entfernt?.wert !== true && !einheit.wirksamAufgegangen;
}

function summe(einheiten: readonly EinheitZustand[]): Staerke {
  return einheiten.reduce<Staerke>((bisher, e) => staerkePlus(bisher, e.wirksameStaerke), STAERKE_NULL);
}

function nachAbschnitt(einheiten: readonly EinheitZustand[]): Map<Id, EinheitZustand[]> {
  const gruppen = new Map<Id, EinheitZustand[]>();
  for (const einheit of einheiten) {
    const liste = gruppen.get(einheit.wirksamerAbschnittId);
    if (liste === undefined) gruppen.set(einheit.wirksamerAbschnittId, [einheit]);
    else liste.push(einheit);
  }
  return gruppen;
}

/**
 * Läuft einen Teilbaum ab und liefert seine Bereiche in Anzeigereihenfolge.
 *
 * Die Summen entstehen beim Aufstieg — wie in `abschnittsbaum` —, damit die
 * Kostenordnung linear in der Zahl der Abschnitte bleibt.
 */
function bereicheDesTeilbaums(knoten: Baumknoten, gruppen: ReadonlyMap<Id, EinheitZustand[]>): Rohbereich[] {
  const mitglieder = gruppen.get(knoten.id) ?? [];
  const gezaehlt = mitglieder.filter(inDerLage);
  const unten = knoten.kinder.flatMap((kind) => bereicheDesTeilbaums(kind, gruppen));
  const kinder = unten.filter((bereich) => bereich.tiefe === knoten.tiefe + 1);
  const staerke = summe(gezaehlt);
  const kopf: Rohbereich = {
    abschnittId: knoten.id,
    name: knoten.name,
    typ: knoten.typ,
    tiefe: knoten.tiefe,
    zeilen: mitglieder.length,
    einheiten: gezaehlt.length,
    staerke,
    einheitenSumme: kinder.reduce((n, kind) => n + kind.einheitenSumme, gezaehlt.length),
    summenStaerke: kinder.reduce<Staerke>((s, kind) => staerkePlus(s, kind.summenStaerke), staerke),
    zaehlt: knoten.zaehlt,
    mitglieder,
    zeilenSumme: kinder.reduce((n, kind) => n + kind.zeilenSumme, mitglieder.length),
  };
  return [kopf, ...unten];
}

/**
 * Einheiten, deren wirksamer Abschnitt nicht im Baum steht.
 *
 * Das kommt vor, solange ein `AbschnittAngelegt` unterwegs ist (§3.10). Die
 * Einheiten bekommen eine eigene Kopfzeile am Ende — weglassen hieße, eine
 * gemeldete Kraft aus der Tabelle zu nehmen, weil ein fremdes Ereignis fehlt.
 */
function verwaisteBereiche(gruppen: ReadonlyMap<Id, EinheitZustand[]>, bekannt: ReadonlySet<Id>): Rohbereich[] {
  return [...gruppen.keys()]
    .filter((id) => !bekannt.has(id))
    .sort()
    .map((id) => {
      const mitglieder = gruppen.get(id) ?? [];
      const gezaehlt = mitglieder.filter(inDerLage);
      const staerke = summe(gezaehlt);
      return {
        abschnittId: id,
        name: id,
        typ: "EINSATZORT",
        tiefe: 0,
        zeilen: mitglieder.length,
        einheiten: gezaehlt.length,
        staerke,
        einheitenSumme: gezaehlt.length,
        summenStaerke: staerke,
        zaehlt: mitglieder.some((e) => e.zaehlt),
        mitglieder,
        zeilenSumme: mitglieder.length,
      };
    });
}

/**
 * Welche Kopfzeilen stehen bleiben.
 *
 * Leere Bereiche bleiben wie in der Excel stehen — die Gliederung ist die
 * Ordnung des Einsatzes, nicht die der Treffer. `EINGANG` ist kein Bereich
 * der Excel, sondern die Warteschlange davor (§5.3.4), und erscheint nur, wenn
 * dort etwas wartet.
 */
function bleibtStehen(bereich: Rohbereich, optionen: Gliederungsoptionen): boolean {
  if (optionen.abschnittId !== undefined) return bereich.abschnittId === optionen.abschnittId;
  if (bereich.zeilenSumme > 0) return true;
  return optionen.ohneLeereBereiche !== true && bereich.abschnittId !== EINGANG_ABSCHNITT_ID;
}

/** Die Kopfzeile ohne die Arbeitsfelder des Aufbaus — sie gehen nicht über die Prozessgrenze. */
function alsKopf(bereich: Rohbereich, von: number): Bereichskopf {
  return {
    abschnittId: bereich.abschnittId,
    name: bereich.name,
    typ: bereich.typ,
    tiefe: bereich.tiefe,
    von,
    zeilen: bereich.zeilen,
    einheiten: bereich.einheiten,
    staerke: bereich.staerke,
    einheitenSumme: bereich.einheitenSumme,
    summenStaerke: bereich.summenStaerke,
    zaehlt: bereich.zaehlt,
  };
}

function einsatzsumme(zustand: Zustand, einheiten: readonly EinheitZustand[]): Einsatzsumme {
  const zaehlend = einheiten.filter((e) => e.zaehlt);
  const angefordert = einheiten.filter(
    (e) => inDerLage(e) && zustand.abschnitte[e.wirksamerAbschnittId]?.typ.wert === "ANGEFORDERT",
  );
  return {
    einheiten: zaehlend.length,
    staerke: summe(zaehlend),
    angefordertEinheiten: angefordert.length,
    angefordert: summe(angefordert),
  };
}

/**
 * Gliedert die (gefilterten, sortierten) Einheiten nach Bereichen.
 *
 * `einheiten` kommt bereits in der Sortierung der Tabelle (§5.3); innerhalb
 * eines Bereichs bleibt sie erhalten, die Bereiche selbst folgen dem Baum.
 */
export function gliedereEinheiten(
  zustand: Zustand,
  einheiten: readonly EinheitZustand[],
  optionen: Gliederungsoptionen = {},
): GegliederteEinheiten {
  const gruppen = nachAbschnitt(einheiten);
  // Aufgelöste Abschnitte tragen keine wirksamen Einheiten mehr (§5.3.2);
  // ihre Unterabschnitte hängen der Baum dann an die Wurzel.
  const baum = abschnittsbaum(zustand, { ohneAufgeloeste: true });
  const ausBaum = baum.flatMap((knoten) => bereicheDesTeilbaums(knoten, gruppen));
  const bekannt = new Set(ausBaum.map((bereich) => bereich.abschnittId));
  const roh = [...ausBaum, ...verwaisteBereiche(gruppen, bekannt)].filter((b) => bleibtStehen(b, optionen));

  let von = 0;
  const bereiche: Bereichskopf[] = [];
  const geordnet: EinheitZustand[] = [];
  for (const bereich of roh) {
    bereiche.push(alsKopf(bereich, von));
    geordnet.push(...bereich.mitglieder);
    von += bereich.mitglieder.length;
  }
  return { einheiten: geordnet, gliederung: { bereiche, einsatz: einsatzsumme(zustand, einheiten) } };
}
