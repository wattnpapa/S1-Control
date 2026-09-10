/**
 * Der Abschnittsbaum als Projektion (M3.1).
 *
 * Er steht in Ring 2 und nicht im Renderer, weil er keine Darstellung ist,
 * sondern eine Ableitung mit festgeschriebenen Regeln: die Sekundärsortierung
 * aus KONZEPT-EREIGNISSE.md §5.3, die Zyklusregel aus §5.3.1 und die
 * Auflösungskette aus §5.3.2. Eine Sortierregel, die in einer `.tsx` steht,
 * ist gegen §5.3 nicht prüfbar; hier läuft sie im Test in beiden Umgebungen.
 *
 * **Der Baum entscheidet nichts.** Alles, was er zeigt, hat der Fold bereits
 * entschieden: `wirksamerParentId` trägt die Zyklusregel, `aufgeloest` die
 * Auflösung, `wirksamerAbschnittId` der Einheit den Lauf durch die Kette.
 * Diese Datei liest ab und summiert; sie prüft nicht nach. Täte sie es, gäbe
 * es zwei Wahrheiten über denselben Baum.
 */

import { abschnittStaerke, einheitenImAbschnitt } from "../kennzahlen.js";
import { staerkePlus, type Id, type Staerke } from "../werte.js";
import { ARCHIV_ABSCHNITT_ID, AUFFANG_ABSCHNITT_ID, type AbschnittZustand, type Zustand } from "../zustand.js";

/**
 * Ein Knoten des Baums.
 *
 * `eigeneStaerke` und `summenStaerke` stehen beide da, weil die Excel beide
 * zeigt: die Zeile eines Abschnitts nennt seine eigene Stärke, die Kopfzeile
 * eines Einsatzabschnitts die seiner Unterabschnitte mit. Sie
 * auseinanderzurechnen ist Sache dieser Projektion und nicht der Anzeige —
 * eine Anzeige, die selbst summiert, summiert bei jedem Neuzeichnen erneut.
 *
 * **`summenStaerke` ist nicht K3.** Sie summiert den Teilbaum, wie ihn die
 * Excel zeigt, ohne Rücksicht auf `zaehltInGesamtstaerke`: Ein Bediener, der
 * einen Abschnitt `ANGEFORDERT` aufklappt, will dessen Kräfte sehen. Die
 * Gesamtstärke des Einsatzes liefert `kennzahlen.einsatzGesamtstaerke` (K3)
 * und nichts sonst — zwei Summenfunktionen über derselben Größe wären zwei
 * Wahrheiten, und die Statuszeile zeigt bereits die eine.
 */
export interface Baumknoten {
  readonly id: Id;
  readonly name: string;
  readonly typ: string;
  readonly reihenfolge: number;
  readonly tiefe: number;
  /** Stärke der Einheiten, die unmittelbar in diesem Abschnitt stehen (K2). */
  readonly eigeneStaerke: Staerke;
  /** Diese Stärke plus die aller Unterabschnitte. */
  readonly summenStaerke: Staerke;
  /** Zahl der Einheiten unmittelbar in diesem Abschnitt. */
  readonly einheiten: number;
  /** Diese Zahl plus die aller Unterabschnitte. */
  readonly einheitenSumme: number;
  /** §5.3: geht die Stärke dieses Abschnitts in die Gesamtstärke ein? */
  readonly zaehlt: boolean;
  /** §5.3.4: `AUFFANG` und `ARCHIV` — sie lassen sich nicht ändern. */
  readonly systemAbschnitt: boolean;
  /** §5.3.2: gesetzt, sobald der Abschnitt aufgelöst ist; nennt das Ziel. */
  readonly aufgeloestNach?: Id;
  /**
   * §5.3.1: Der Abschnitt hat einen gefalteten `parentId`, aber keinen
   * wirksamen — die Kante ist der Zyklusregel zum Opfer gefallen und der
   * Abschnitt hängt an der Wurzel.
   */
  readonly zyklusGeloest?: true;
  /**
   * Der wirksame Elternabschnitt existiert (noch) nicht.
   *
   * §3.10: Das `AbschnittAngelegt` des Elternteils ist unterwegs. Der Knoten
   * hängt bis dahin an der Wurzel — **sichtbar**, nicht fort. Ihn wegzulassen
   * hieße, einen Abschnitt samt seiner Einheiten aus der Anzeige zu nehmen,
   * weil ein fremdes Ereignis fehlt.
   */
  readonly elternUnbekannt?: Id;
  readonly kinder: readonly Baumknoten[];
}

export interface Baumoptionen {
  /**
   * Aufgelöste Abschnitte weglassen.
   *
   * Vorbelegung ist `false`: §5.3.2 lässt den aufgelösten Abschnitt
   * ausdrücklich im Zustand stehen, und `AbschnittWiederhergestellt` braucht
   * einen sichtbaren Knoten, an dem es angesetzt werden kann. Wer ein
   * aufgeräumtes Bild will, schaltet ihn hier weg — und nicht der Fold.
   */
  readonly ohneAufgeloeste?: boolean;
  /** Den Systemabschnitt `ARCHIV` weglassen; `AUFFANG` bleibt immer sichtbar. */
  readonly ohneArchiv?: boolean;
}

/**
 * Vergleicht zwei Abschnitte nach `reihenfolge`, dann nach Id.
 *
 * §5.3, „Sekundärsortierung": Bei gleicher `reihenfolge` entscheidet die
 * Entitäts-Id in Codepoint-Ordnung. Ohne diese Regel hinge die Reihenfolge
 * zweier gleichrangiger Einträge an der Schlüsselreihenfolge der
 * Datensammlung, und zwei Clients zeigten Verschiedenes, obwohl ihr Zustand
 * konvergiert.
 */
function vergleiche(a: Baumknoten, b: Baumknoten): number {
  if (a.reihenfolge !== b.reihenfolge) return a.reihenfolge - b.reihenfolge;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function text(wert: unknown, ersatz: string): string {
  return typeof wert === "string" ? wert : ersatz;
}

function zahl(wert: unknown): number {
  return typeof wert === "number" ? wert : 0;
}

/**
 * Baut den Abschnittsbaum.
 *
 * Zwei Durchläufe: erst je Abschnitt die eigenen Zahlen, dann der Baum von
 * der Wurzel aus mit den Summen. Die Summen entstehen dabei **beim Aufstieg**
 * aus der Rekursion und nicht durch wiederholtes Absteigen — sonst wäre die
 * Kostenordnung quadratisch in der Tiefe, und die Excel hat vier Ebenen.
 */
export function abschnittsbaum(zustand: Zustand, optionen: Baumoptionen = {}): readonly Baumknoten[] {
  const sichtbar = new Map<Id, AbschnittZustand>();
  for (const [id, abschnitt] of Object.entries(zustand.abschnitte)) {
    if (optionen.ohneArchiv === true && id === ARCHIV_ABSCHNITT_ID) continue;
    if (optionen.ohneAufgeloeste === true && abschnitt.aufgeloest?.wert != null) continue;
    sichtbar.set(id, abschnitt);
  }

  const kinderVon = new Map<Id, Id[]>();
  const wurzeln: Id[] = [];
  for (const [id, abschnitt] of sichtbar) {
    const eltern = abschnitt.wirksamerParentId;
    // Der Elternteil muss **sichtbar** sein, nicht bloß bekannt: Wer die
    // aufgelösten wegschaltet, darf deren Kinder nicht mitverlieren.
    if (eltern === undefined || !sichtbar.has(eltern)) wurzeln.push(id);
    else kinderVon.set(eltern, [...(kinderVon.get(eltern) ?? []), id]);
  }

  const baue = (id: Id, tiefe: number): Baumknoten => {
    const abschnitt = sichtbar.get(id) as AbschnittZustand;
    const eigeneStaerke = abschnittStaerke(zustand, id);
    const einheiten = einheitenImAbschnitt(zustand, id).length;
    const kinder = (kinderVon.get(id) ?? []).map((kind) => baue(kind, tiefe + 1));
    kinder.sort(vergleiche);

    const aufgeloest = abschnitt.aufgeloest?.wert;
    const gefalteterEltern = abschnitt.parentId?.wert;
    const wirksamerEltern = abschnitt.wirksamerParentId;
    return {
      id,
      name: text(abschnitt.name.wert, id),
      typ: text(abschnitt.typ.wert, "EINSATZORT"),
      reihenfolge: zahl(abschnitt.reihenfolge.wert),
      tiefe,
      eigeneStaerke,
      summenStaerke: kinder.reduce<Staerke>((summe, kind) => staerkePlus(summe, kind.summenStaerke), eigeneStaerke),
      einheiten,
      einheitenSumme: kinder.reduce((summe, kind) => summe + kind.einheitenSumme, einheiten),
      zaehlt: abschnitt.zaehltInGesamtstaerke,
      systemAbschnitt: abschnitt.systemAbschnitt === true,
      ...(aufgeloest == null ? {} : { aufgeloestNach: aufgeloest.zielAbschnittId }),
      // §5.3.1: gefaltete Kante da, wirksame fort — die Kante ist gefallen.
      ...(typeof gefalteterEltern === "string" && wirksamerEltern === undefined
        ? { zyklusGeloest: true as const }
        : {}),
      // §3.10: wirksame Kante da, Ziel unbekannt — der Elternteil ist unterwegs.
      ...(wirksamerEltern !== undefined && !sichtbar.has(wirksamerEltern) && zustand.abschnitte[wirksamerEltern] === undefined
        ? { elternUnbekannt: wirksamerEltern }
        : {}),
      kinder,
    };
  };

  const baum = wurzeln.map((id) => baue(id, 0));
  baum.sort(vergleiche);
  return baum;
}

/** Läuft den Baum in Anzeigereihenfolge ab — eine Zeile je Knoten. */
export function baumZeilen(baum: readonly Baumknoten[]): readonly Baumknoten[] {
  return baum.flatMap((knoten) => [knoten, ...baumZeilen(knoten.kinder)]);
}

/**
 * Prüft, ob `kandidat` als neuer Elternteil von `abschnittId` einen Zyklus
 * schlösse — **vor** dem Schreiben.
 *
 * §5.3.1 löst einen Zyklus auf, wenn er entstanden ist, und das muss sie: Zwei
 * Clients können ihn gemeinsam erzeugen, ohne dass einer ihn sieht. Ein
 * einzelner Client, der ihn allein und sehenden Auges erzeugt, ist damit aber
 * nicht entschuldigt — sein Ereignis wäre eines, dessen Wirkung der Fold
 * anschließend zurücknimmt, und die Maske hätte eine Handlung angeboten, die
 * nie eintritt. Die Maske fragt deshalb hier.
 */
export function schluesseZyklus(zustand: Zustand, abschnittId: Id, kandidat: Id): boolean {
  if (abschnittId === kandidat) return true;
  const gesehen = new Set<Id>([abschnittId]);
  let lauf: Id | undefined = kandidat;
  while (lauf !== undefined) {
    if (gesehen.has(lauf)) return true;
    gesehen.add(lauf);
    lauf = zustand.abschnitte[lauf]?.wirksamerParentId;
  }
  return false;
}

/**
 * Die Abschnitte, die als Ziel einer Auflösung in Frage kommen.
 *
 * §5.3.2: Die Auflösung braucht ein Ziel, in dem die Einheiten weiterlaufen.
 * Der Abschnitt selbst scheidet aus, ein bereits aufgelöster ebenfalls — er
 * verlängerte nur die Kette —, und `ARCHIV` scheidet aus, weil eine Auflösung
 * dorthin die Stärke aller betroffenen Einheiten aus der Gesamtstärke nähme,
 * ohne dass jemand eine Einheit archiviert hätte.
 */
export function aufloesungsziele(zustand: Zustand, abschnittId: Id): readonly Id[] {
  return Object.entries(zustand.abschnitte)
    .filter(
      ([id, abschnitt]) =>
        id !== abschnittId && id !== ARCHIV_ABSCHNITT_ID && abschnitt.aufgeloest?.wert == null,
    )
    .map(([id]) => id)
    .sort();
}

export { AUFFANG_ABSCHNITT_ID, ARCHIV_ABSCHNITT_ID };
