/**
 * Der Konvergenzvergleich nach KONZEPT-SPEICHER.md §7.6 — das zählbare
 * Abbruchkriterium aus Auflage 18.
 *
 * §7.6 legt drei Dinge fest, und alle drei stehen hier:
 *
 *  * **Was verglichen wird:** nicht der Hash allein, sondern das Paar aus
 *    Versionsvektor und `zustandsHash`.
 *  * **Die drei Ausgänge**, von denen nur einer ein Fehler ist. Gleiche
 *    Vektoren mit verschiedenem Hash ist der rote Ausgang. Verschiedene
 *    Vektoren heißen „nicht vergleichbar" — der Lauf zählt nicht, ist aber
 *    kein Fehler.
 *  * **Wer verglichen wird:** §8.6.1 Regel 3 nimmt Clients mit Quarantäne aus
 *    dem Vergleich heraus und meldet sie getrennt als „unvollständige Sicht".
 *    Ein Testlauf, der absichtlich eine Zeile beschädigt, muss diesen Ausgang
 *    erwarten, statt an ihm zu scheitern.
 *
 * ## Der Versionsvektor wird aus dem lokalen Spiegel gebildet
 *
 * §5.5: Der lokale Spiegel enthält **nur geprüfte Zeilen**, für eigene Dateien
 * vollständig, für fremde ihr geprüftes Präfix. Er ist damit genau die
 * Ereignismenge, die dieser Client gesehen hat — und derselbe Bestand, aus dem
 * der Zustand gefaltet wird. Vektor und Hash aus derselben Quelle zu bilden ist
 * die Bedingung dafür, dass „gleicher Vektor" überhaupt „gleiche Eingabe"
 * bedeutet; würde der Hash aus einer nebenher mitgeführten Faltung stammen und
 * der Vektor von der Platte, verglichen die beiden Größen verschiedene Dinge.
 *
 * ## Die zusätzliche Identitätensicht ist Diagnose, nicht Kriterium
 *
 * {@link Clientstand.identitaetenHash} steht **neben** dem Kriterium aus §7.6,
 * nie an seiner Stelle. Er beantwortet bei einem Ausgang „nicht vergleichbar"
 * die Frage, ob die Clients dieselben Ereignisse auf verschiedenen Dateiwegen
 * gesehen haben oder wirklich verschiedene Mengen. Ohne ihn wäre jeder dritte
 * Ausgang gleich stumm — und der dritte Ausgang tritt nach jeder Reparatur
 * nach §4.6 zwangsläufig ein (siehe {@link Vergleichsbefund}).
 */

import {
  falteAuf,
  materialisiere,
  zustandsHash,
  type EingehendesEreignis,
  type KanonischerWert,
  type Zustand,
} from "@s1/domaene";
import {
  KETTE_ANFANG,
  istVerwaltungsereignis,
  leseZeilengrenzen,
  sha256Hex,
  type Dateisystem,
  type Einsatzablage,
} from "@s1/speicher";

/** Stand einer Datei im lokalen Spiegel: bis wohin gelesen und mit welcher Kette (§5.3, §7.6). */
export interface Dateistand {
  readonly offset: number;
  readonly kette: string;
}

/**
 * Der Versionsvektor eines Clients (§7.6).
 *
 * Schlüssel ist der Dateiname. Ein Client, der eine Datei **noch gar nicht
 * kennt**, hat für sie keinen kleineren Wert, sondern gar keinen — deshalb ein
 * Record und keine Zahlenliste mit Nullen.
 */
export type Versionsvektor = Readonly<Record<string, Dateistand>>;

export interface Clientstand {
  readonly clientId: string;
  readonly vektor: Versionsvektor;
  /** §7.6: SHA-256 über die kanonische Serialisierung des materialisierten Zustands. */
  readonly zustandsHash: string;
  /** Diagnose, kein Kriterium: Hash über die Menge der gefalteten Ereignis-Identitäten. */
  readonly identitaetenHash: string;
  readonly ereignisse: number;
  /**
   * Die **endgültigen** Quarantänestellen nach §8.2. §8.6.1 Regel 3: Wer hier
   * etwas stehen hat, wird aus dem Vergleich genommen.
   */
  readonly quarantaenen: readonly string[];
  /**
   * Die **vorläufigen** Quarantänestellen nach §8.1 — berichtet, nicht
   * bewertet. §8.1 führt sie ausdrücklich als „kein Fehler": Die Datei wird
   * in jedem Takt-B-Durchlauf erneut geprüft, und die Stelle verschwindet,
   * sobald der Schreiber die Zeile vervollständigt.
   */
  readonly vorlaeufigeQuarantaenen: readonly string[];
  /** Die Bytes aller gelesenen Ereigniszeilen — Grundlage der Prüfung von A2 (§2.6, §10). */
  readonly bytes: number;
}

/** Die drei Ausgänge aus §7.6 plus die getrennte Meldung aus §8.6.1 Regel 3. */
export type Vergleichsbefund =
  /** Gleiche Vektoren, gleicher Hash. Der Lauf zählt. */
  | {
      readonly art: "konvergent";
      readonly clients: readonly string[];
      readonly zustandsHash: string;
      readonly unvollstaendigeSicht: readonly UnvollstaendigeSicht[];
    }
  /**
   * Gleiche Vektoren, verschiedener Hash. **Der rote Ausgang**, an dem M0
   * abbricht (05-UMSETZUNGSPLAN.md, Abbruchkriterium M0).
   */
  | {
      readonly art: "abweichend";
      readonly clients: readonly string[];
      readonly hashes: Readonly<Record<string, string>>;
    }
  /**
   * Verschiedene Vektoren. Kein Fehler, aber auch kein Nachweis.
   *
   * `gleicheIdentitaeten` ist die Diagnose: Sind die Ereignismengen trotz
   * verschiedener Dateiwege dieselben, liegt der Unterschied allein in den
   * Offsets — der Regelfall nach einer Reparatur nach §4.6, bei der derselbe
   * Inhalt in einer anderen Datei steht.
   */
  | {
      readonly art: "nichtVergleichbar";
      readonly clients: readonly string[];
      readonly grund: string;
      readonly gleicheIdentitaeten: boolean;
      readonly gleicheHashes: boolean;
      readonly unvollstaendigeSicht: readonly UnvollstaendigeSicht[];
    }
  /**
   * Weniger als zwei Clients ohne Quarantäne — nach §7.6 gibt es nichts zu
   * vergleichen.
   *
   * `zustaendeDeckenSich` ist die Ersatzauskunft und die Substanz von §8.6.1
   * Regel 4: Halten trotz der Quarantäne alle Clients denselben Zustand? Genau
   * das sagt der Wiederherstellungsweg über das Ersatzsegment (§4.6) zu —
   * „Danach gilt die Konvergenzzusage für die betroffenen Leser wieder."
   */
  | {
      readonly art: "zuWenigeClients";
      readonly zustaendeDeckenSich: boolean;
      readonly unvollstaendigeSicht: readonly UnvollstaendigeSicht[];
    };

/** Ein Client mit Quarantäne, getrennt gemeldet (§8.6.1 Regel 3). */
export interface UnvollstaendigeSicht {
  readonly clientId: string;
  readonly quarantaenen: readonly string[];
  /**
   * Ob dieser Client trotz seiner Quarantäne denselben Zustand hält wie die
   * verglichenen. Das ist die Wirkung des Wiederherstellungswegs aus §8.6.1
   * Regel 4 und wird berichtet, nie bewertet.
   */
  readonly geheilt: boolean;
}

/**
 * Liest den lokalen Spiegel eines Clients und bildet daraus Vektor, Zustand und
 * Hashes.
 *
 * Das Dateisystem ist hier absichtlich das **ungestörte**: Der Vergleich ist
 * die Messung, nicht der Messgegenstand. Ein Konvergenzvergleich, der selbst
 * durch den `FileNotFound`-Cache liest, meldete Unterschiede, die es nicht
 * gibt.
 */
export async function erhebeStand(
  dateisystem: Dateisystem,
  ablage: Einsatzablage,
  clientId: string,
  quarantaenen: readonly string[],
  vorlaeufigeQuarantaenen: readonly string[] = [],
): Promise<Clientstand> {
  const vektor: Record<string, Dateistand> = {};
  const ereignisse: EingehendesEreignis[] = [];
  const identitaeten: string[] = [];
  let bytes = 0;

  const namen = [...(await dateisystem.listeVerzeichnis(ablage.lokalEreignisse))].sort();
  for (const name of namen) {
    if (!name.endsWith(".jsonl")) continue;
    const inhalt = await dateisystem.liesAb(ablage.lokalDatei(name), 0);
    const abschnitt = leseZeilengrenzen(inhalt, 0);
    const letzte = abschnitt.zeilen.at(-1);
    vektor[name] = {
      offset: abschnitt.endeOffset,
      kette: letzte === undefined ? KETTE_ANFANG : letzte.kette,
    };
    for (const zeile of abschnitt.zeilen) {
      bytes += zeile.laenge;
      // §2.4: `SegmentAbgeschlossen` und `SegmentErsetzt` reden über die Datei,
      // in der sie stehen. Sie sind Sache der Speicherschicht und gehören nicht
      // in den Fold; der Fold führte sie sonst als unbekannte Ereignisse im
      // Zustand — und damit läge Dateiverwaltung im `zustandsHash`.
      if (istVerwaltungsereignis(zeile.rahmen.typ)) continue;
      // §4.6: Dieselbe Identität mit gleichem Inhalt ist dasselbe Ereignis.
      if (zeile.wiederholung) continue;
      identitaeten.push(zeile.rahmen.id);
      ereignisse.push(zeile.rahmen as unknown as EingehendesEreignis);
    }
  }

  const zustand: Zustand = materialisiere(falteAuf(ereignisse));
  const eindeutige = [...new Set(identitaeten)].sort();
  return {
    clientId,
    vektor,
    // `sha256Hex` wird hereingereicht: `@s1/domaene` ist plattformneutral und
    // darf `node:crypto` nicht sehen (02-ZIELBILD.md, „Vier Ringe“).
    zustandsHash: zustandsHash(zustand as unknown as KanonischerWert, sha256Hex),
    identitaetenHash: sha256Hex(eindeutige.join("\n")),
    ereignisse: eindeutige.length,
    quarantaenen,
    vorlaeufigeQuarantaenen,
    bytes,
  };
}

/** Zwei Versionsvektoren sind gleich, wenn sie über dieselbe Dateimenge dieselben Stände führen (§7.6). */
export function vektorenGleich(a: Versionsvektor, b: Versionsvektor): boolean {
  const links = Object.keys(a).sort();
  const rechts = Object.keys(b).sort();
  if (links.length !== rechts.length) return false;
  for (let i = 0; i < links.length; i += 1) {
    const name = links[i] as string;
    if (name !== rechts[i]) return false;
    const x = a[name] as Dateistand;
    const y = b[name] as Dateistand;
    if (x.offset !== y.offset || x.kette !== y.kette) return false;
  }
  return true;
}

/** Nennt die erste Datei, in der sich zwei Vektoren unterscheiden — für den Bericht. */
function ersterUnterschied(a: Versionsvektor, b: Versionsvektor): string {
  const namen = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  for (const name of namen) {
    const x = a[name];
    const y = b[name];
    if (x === undefined) return `${name} nur bei einem der beiden Clients bekannt`;
    if (y === undefined) return `${name} nur bei einem der beiden Clients bekannt`;
    if (x.offset !== y.offset) return `${name} bei Offset ${x.offset} gegen ${y.offset}`;
    if (x.kette !== y.kette) return `${name} bei gleichem Offset mit verschiedener Kette`;
  }
  return "kein Unterschied gefunden";
}

/**
 * Führt den Vergleich nach §7.6 und §8.6.1 Regel 3 durch.
 *
 * „Krank" heißt **endgültige** Quarantäne nach §8.2. Die vorläufige aus §8.1
 * zählt nicht: Sie ist dort ausdrücklich „kein Fehler", verschwindet mit der
 * nächsten vollständigen Zeile, und ein Client, der allein ihretwegen aus dem
 * Vergleich fiele, machte eine Phase unbewertbar aus einem Zustand heraus,
 * der keiner ist. Bis zum 2026-09-09 wurden beide gleich behandelt; siehe
 * `Klient.quarantaenen`.
 */
export function vergleiche(staende: readonly Clientstand[]): Vergleichsbefund {
  const gesund = staende.filter((s) => s.quarantaenen.length === 0);
  const kranke = staende.filter((s) => s.quarantaenen.length > 0);

  // Ohne Client ohne Quarantäne gibt es keinen gesunden Bezugspunkt. Dann ist
  // der Bezug der erste Client überhaupt: Die Frage lautet nicht mehr „deckt
  // er sich mit den Gesunden", sondern „decken sich alle" — und genau das ist
  // die Zusage aus §8.6.1 Regel 4 nach der Reparatur.
  const referenzHash = gesund[0]?.zustandsHash ?? staende[0]?.zustandsHash;
  const unvollstaendigeSicht: readonly UnvollstaendigeSicht[] = kranke.map((s) => ({
    clientId: s.clientId,
    quarantaenen: s.quarantaenen,
    geheilt: referenzHash !== undefined && s.zustandsHash === referenzHash,
  }));

  if (gesund.length < 2) {
    return {
      art: "zuWenigeClients",
      zustaendeDeckenSich:
        referenzHash !== undefined && staende.every((s) => s.zustandsHash === referenzHash),
      unvollstaendigeSicht,
    };
  }

  const erster = gesund[0] as Clientstand;
  const clients = gesund.map((s) => s.clientId);
  const abweichend = gesund.find((s) => !vektorenGleich(erster.vektor, s.vektor));

  if (abweichend !== undefined) {
    return {
      art: "nichtVergleichbar",
      clients,
      grund: `${erster.clientId} gegen ${abweichend.clientId}: ${ersterUnterschied(erster.vektor, abweichend.vektor)}`,
      gleicheIdentitaeten: gesund.every((s) => s.identitaetenHash === erster.identitaetenHash),
      gleicheHashes: gesund.every((s) => s.zustandsHash === erster.zustandsHash),
      unvollstaendigeSicht,
    };
  }

  if (gesund.some((s) => s.zustandsHash !== erster.zustandsHash)) {
    return {
      art: "abweichend",
      clients,
      hashes: Object.fromEntries(gesund.map((s) => [s.clientId, s.zustandsHash])),
    };
  }

  return {
    art: "konvergent",
    clients,
    zustandsHash: erster.zustandsHash,
    unvollstaendigeSicht,
  };
}
