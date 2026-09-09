/**
 * Die Fehlerinjektion aus 05-UMSETZUNGSPLAN.md, M0.4 — Kill mitten im Append,
 * Partition, Uhrsprung — samt der übrigen Fehlerbilder, die §9
 * (KONZEPT-SPEICHER.md, Zeile zu Auflage 15) als vom Konzept behandelt führt.
 *
 * Getrennt von der feindlichen Dateisystem-Schicht, weil sie etwas anderes
 * tut: Die Schicht verfälscht **Aufrufe**, dieses Modul verfälscht die
 * **Lage** — es schneidet den Share ab, verstellt eine Uhr, kippt ein Byte in
 * einer fremden Datei oder lässt einen zweiten Prozess unter derselben Kennung
 * schreiben. Beides zusammen ergibt das Bild, gegen das M0 abgenommen wird.
 */

import { SCHEMA_VERSION } from "@s1/domaene";
import {
  KETTE_ANFANG,
  baueZeile,
  clientPraefix,
  leseZeilengrenzen,
  zerlegeEreignisDateiname,
  type Dateisystem,
} from "@s1/speicher";

import type { Klient } from "./klient.js";
import type { Fehlerinjektion } from "./plan.js";
import { Zufall } from "./zufall.js";

/** Eine eingetretene Störung, für den Bericht. */
export interface Stoerbefund {
  readonly art: string;
  readonly betroffen: string;
  readonly text: string;
}

export interface StoerwerkOptionen {
  readonly echt: Dateisystem;
  readonly fehler: Fehlerinjektion;
  readonly zufall: Zufall;
  readonly jetzt: () => number;
}

export class Stoerwerk {
  readonly befunde: Stoerbefund[] = [];
  /**
   * Ob die Beschädigung nach §8.2 gerade injiziert werden darf.
   *
   * Der Lauf schaltet sie nur in der letzten Phase ein; die Begründung steht im
   * Kopf von `lauf.ts`. Kurz: Eine Quarantäne ist nach §8.2 Punkt 5 und §8.6.1
   * Regel 4 für den Rest des Laufs nicht mehr aufhebbar, und ein Lauf, in dem
   * alle Clients in Quarantäne stehen, weist nichts mehr nach.
   */
  beschaedigungAktiv = false;
  readonly #o: StoerwerkOptionen;
  /** Entzogene Schreibrechte samt dem Zeitpunkt, zu dem sie zurückgegeben werden (§8.9). */
  readonly #rechteZurueck = new Map<Klient, number>();

  constructor(optionen: StoerwerkOptionen) {
    this.#o = optionen;
  }

  /**
   * Gibt fällige Rechte zurück.
   *
   * §8.9 sagt ausdrücklich: „Weiterversucht wird trotzdem — ein Recht kann
   * zurückgegeben werden." Ein Entzug ohne Rückgabe prüfte nur die halbe Regel
   * und machte jede Ruhephase danach unerreichbar.
   */
  tick(): void {
    const jetzt = this.#o.jetzt();
    for (const [klient, wann] of [...this.#rechteZurueck]) {
      if (jetzt >= wann) {
        klient.dateisystem.gibSchreibrechtZurueck();
        this.#rechteZurueck.delete(klient);
      }
    }
  }

  /** Gibt am Ende einer Phase alles zurück, damit die Ruhephase erreichbar ist. */
  loeseAlles(): void {
    for (const klient of this.#rechteZurueck.keys()) klient.dateisystem.gibSchreibrechtZurueck();
    this.#rechteZurueck.clear();
  }

  /** Zieht die Störungen für einen Bedienschritt des angegebenen Clients. */
  async vorBedienschritt(handelnder: Klient): Promise<void> {
    const f = this.#o.fehler;
    const z = this.#o.zufall;

    if (z.trifft(f.partition)) {
      handelnder.dateisystem.partitioniere(f.partitionMs);
      this.#merke("partition", handelnder, `Share für ${f.partitionMs} ms nicht erreichbar (§8.3)`);
    }

    if (z.trifft(f.uhrsprung)) {
      // §3.2: Die Delta-Grenze von fünf Minuten gilt in beide Richtungen, und
      // der Rückwärtssprung der eigenen Uhr wird dort ausdrücklich abgefangen.
      const richtung = z.trifft(0.5) ? 1 : -1;
      const betrag = z.zwischen(Math.floor(f.uhrsprungMs / 2), f.uhrsprungMs) * richtung;
      handelnder.uhr.springe(betrag);
      this.#merke("uhrsprung", handelnder, `Wanduhr um ${betrag} ms verstellt (§3.2, §8.5)`);
    }

    if (z.trifft(f.schreibrechtEntzug) && !this.#rechteZurueck.has(handelnder)) {
      handelnder.dateisystem.entzieheSchreibrecht();
      this.#rechteZurueck.set(handelnder, this.#o.jetzt() + f.schreibrechtEntzugMs);
      this.#merke("schreibrechtEntzug", handelnder, "EACCES auf dem Share (§8.9, dauerhaft)");
    }

    if (z.trifft(f.lokaleSchreibstoerung)) {
      const code = z.waehle(["EBUSY", "EACCES", "ENOSPC", "EIO"]);
      handelnder.dateisystem.erzwingeLokaleSchreibstoerung(code);
      this.#merke("lokaleSchreibstoerung", handelnder, `${code} auf dem lokalen Schreibweg (§8.8)`);
    }

    if (z.trifft(f.profilKlon)) {
      await this.#klone(handelnder);
    }
  }

  /**
   * Die Beschädigung nach §8.2, gezogen **nach** dem Spiegelungslauf.
   *
   * Siehe die Begründung der Reihenfolge in `lauf.ts`: Nur frisch gespiegelte,
   * noch nicht gelesene Bytes erreichen einen Leser.
   */
  async nachDerSpiegelung(alle: readonly Klient[]): Promise<void> {
    if (!this.beschaedigungAktiv) return;
    if (!this.#o.zufall.trifft(this.#o.fehler.beschaedigung)) return;
    await this.#beschaedige(alle);
  }

  /**
   * Kill mitten im Append (§5.2, §8.1) mit anschließendem Neustart.
   *
   * Es wird ein Bruchstück ohne Zeilenende an das laufende lokale Segment
   * gehängt — genau das, was ein harter Abbruch zwischen `write` und `fsync`
   * hinterlässt — und die Akte danach neu geöffnet. §8.1 verlangt vom
   * Schreiber, sein eigenes letztes Segment beim Start auf die letzte
   * vollständige, kettenrichtige Zeile zu kürzen; ob er das tut, entscheidet
   * sich hier.
   */
  async kill(klient: Klient): Promise<boolean> {
    if (!this.#o.zufall.trifft(this.#o.fehler.kill)) return false;
    const pfad = klient.ablage.lokalSegment(klient.clientId, klient.akte.schreiber.segment);
    const bruchstueck = new TextEncoder().encode(
      `742\tcafebabe\t{"id":"${klient.clientId}:99999","typ":"Ein`,
    );
    try {
      await this.#o.echt.haengeAnUndSynchronisiere(pfad, bruchstueck);
    } catch {
      // Existiert das Segment noch nicht, gibt es auch nichts abzuschneiden.
      return false;
    }
    this.#merke("kill", klient, "Abbruch mitten im lokalen Anhang, danach Neustart (§5.2, §8.1)");
    await klient.oeffneMitWiederholung();
    return true;
  }

  /**
   * §8.2: Ein Byte in der Share-Datei eines Clients kippt.
   *
   * Getroffen wird die **Mitte** der Datei, nicht ihr Ende: Eine Beschädigung
   * am Ende sähe wie eine unvollständige Zeile aus (§8.1) und liefe in die
   * Frist statt in die Quarantäne. Die Mitte ist zugleich der Fall, den §4.6.1
   * als Auslöser 1 abdeckt — der Vergleich aus §5.4.3 setzt an `shareOffset`
   * an und sähe sie nie.
   */
  async #beschaedige(alle: readonly Klient[]): Promise<void> {
    const opfer = this.#o.zufall.waehle(alle);
    const praefix = clientPraefix(opfer.clientId);
    const namen = (await this.#o.echt.listeVerzeichnis(opfer.ablage.shareEreignisse))
      .filter((n) => zerlegeEreignisDateiname(n)?.praefix === praefix)
      .sort();
    if (namen.length === 0) return;
    const name = this.#o.zufall.waehle(namen);
    const pfad = opfer.ablage.shareDatei(name);
    const bytes = new Uint8Array(await this.#o.echt.liesAb(pfad, 0));
    const zeilen = leseZeilengrenzen(bytes, 0).zeilen;
    // Mindestens eine Zeile muss hinter der beschädigten stehen, sonst liegt
    // die Beschädigung am Dateiende und ist §8.1, nicht §8.2.
    if (zeilen.length < 2) return;
    // **Möglichst weit hinten.** Ein Leser liest nach §6.2 ab seinem
    // `leseOffset` und sieht eine Stelle nie wieder, die er schon gelesen hat.
    // Eine Beschädigung in der Dateimitte trifft deshalb nur den Schreiber
    // (§4.6.1 Auslöser 1) und nie einen Leser — der Weg aus §8.2 und §8.6.1
    // bliebe ungeprüft. Die vorletzte Zeile ist die letzte Stelle, an der noch
    // eine Zeile folgt (Bedingung für §8.2 statt §8.1) und die zugleich gute
    // Aussicht hat, von mindestens einem Leser noch nicht gelesen zu sein.
    const ziel = zeilen[zeilen.length - 2];
    if (ziel === undefined) return;
    // In die Zeilenmitte, damit weder das Längenfeld noch das Zeilenende
    // getroffen wird: Das ist Regel 4 aus §8.2 (CRC stimmt nicht), der Fall,
    // den die Quarantäne behandelt.
    const stelle = ziel.offset + Math.floor(ziel.laenge / 2);
    bytes[stelle] = ((bytes[stelle] as number) ^ 0x20) & 0xff;
    await this.#o.echt.kuerzeAuf(pfad, 0);
    await this.#o.echt.haengeAnUndSynchronisiere(pfad, bytes);
    this.#merke("beschaedigung", opfer, `${name} bei Offset ${ziel.offset} verfälscht (§8.2)`);
  }

  /**
   * §4.5 Fall 2 und §5.4.3 Ausgang C: Ein zweiter Prozess schreibt unter
   * derselben Kennung.
   *
   * Angehängt wird eine formal einwandfreie Zeile mit einer Laufnummer, die
   * lokal nicht vergeben ist. Genau daran — und nur daran — trennt §5.4.3 die
   * fremde Schreibspur von einer Beschädigung.
   */
  async #klone(klient: Klient): Promise<void> {
    const segment = klient.akte.schreiber.segment;
    const pfad = klient.ablage.shareSegment(klient.clientId, segment);
    let vorhanden: Uint8Array;
    try {
      vorhanden = await this.#o.echt.liesAb(pfad, 0);
    } catch {
      return;
    }
    const abschnitt = leseZeilengrenzen(vorhanden, 0);
    if (abschnitt.zeilen.length === 0) return;
    const letzte = abschnitt.zeilen.at(-1);
    const zeile = baueZeile({
      id: `${klient.clientId}:900${this.#o.zufall.bis(1000)}`,
      vorgaenger: letzte === undefined ? KETTE_ANFANG : letzte.kette,
      typ: "EinheitGemeldet",
      hlc: { millisekunden: this.#o.jetzt(), zaehler: 0, clientId: klient.clientId },
      schemaVersion: SCHEMA_VERSION,
      akteur: { benutzer: "Klon", host: "klon", clientId: klient.clientId },
      wanduhr: new Date(this.#o.jetzt()).toISOString(),
      nutzlast: {
        einheitId: `E-klon-${this.#o.zufall.bis(100000)}`,
        abschnittId: "AUFFANG",
        bezeichnung: "Zug des geklonten Profils",
        organisation: "THW",
        ebene: "ZUG",
        staerke: { fuehrer: 1, unterfuehrer: 1, mannschaft: 9 },
        personalErfassung: "VOLLSTAENDIG",
        status: "IM_EINSATZ",
      },
    });
    await this.#o.echt.haengeAnUndSynchronisiere(pfad, zeile);
    this.#merke("profilKlon", klient, `fremde Schreibspur in Segment ${segment} (§4.5 Fall 2)`);
  }

  #merke(art: string, klient: Klient, text: string): void {
    this.befunde.push({ art, betroffen: `Client ${klient.nummer}`, text });
  }

  /** Wie oft welche Störung eingetreten ist — der Nachweis, dass keine bei null blieb. */
  zaehlung(): Readonly<Record<string, number>> {
    const zaehler: Record<string, number> = Object.create(null) as Record<string, number>;
    for (const befund of this.befunde) zaehler[befund.art] = (zaehler[befund.art] ?? 0) + 1;
    return zaehler;
  }
}
