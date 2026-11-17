/**
 * Der Automatikdruck im Worker (KONZEPT-NACHRICHTEN.md Entscheidung 7,
 * Schnitt N3).
 *
 * Jede Nachricht, die für eine Stelle der Sitzung neu eintrifft — gesichtet,
 * eine eigene Stelle im Verteiler, nicht zurückgezogen —, geht als Vordruck
 * an das Ziel des Arbeitsplatzes: als PDF in ein festes Verzeichnis (beide
 * Schalen) oder als Druckauftrag an den Main, der sie einem Drucker gibt
 * (nur Desktop). Ohne Ziel ist der Automatikdruck aus, und dann rechnet hier
 * auch nichts mit: Der Wächter kostet einen Durchgang über alle Nachrichten
 * je eingelesenem Zug.
 *
 * Dieselbe Stelle wie der Hinweis bei Vorrang (`nachrichtendienst.ts`,
 * Entscheidung 6), aber für jede Nachricht und auch für eine Sichtung dieses
 * Arbeitsplatzes: Der Hinweis sagt, was man noch nicht weiß, der Ausdruck
 * ist das Papier für die Stelle — das braucht auch, wer selbst verteilt hat.
 * Was beim Öffnen oder beim Einschalten schon da war, ist kein Eintreffen.
 *
 * Fehler am Verzeichnis (Share weg, keine Rechte) melden sich einmal je
 * Sitzung als Hinweis „warnung"; die Nachricht selbst steht im Blatt und
 * lässt sich von Hand drucken. Ein Ausdruck ist ein abgeleiteter Anzeiger
 * (KONZEPT-SPEICHER.md §1.3) und wird ohne `fsync` geschrieben.
 */

import path from "node:path";

import { projektion, type Nachrichtenzeile, type Zustand } from "@s1/domaene";
import type { Dateisystem } from "@s1/speicher";

import type { Automatikdruckziel, Mitteilung, VordruckBlatt } from "../kontrakt/index.js";
import { vordruckDerZeile } from "./nachrichtenvordruck.js";

/** Was der Main dem Worker über den Automatikdruck sagt; `undefined` heißt aus. */
export interface Automatikdruckeinstellung {
  readonly ziel: Automatikdruckziel;
  readonly blatt: VordruckBlatt;
}

/** Ein Druckauftrag an den Main (Ziel Drucker): die Bytes, der Systemname des Druckers, der Dateiname fürs Protokoll. */
export interface Druckauftrag {
  readonly bytes: Uint8Array;
  readonly drucker: string;
  readonly dateiname: string;
}

/** Gesichtet, nicht zurückgezogen, eine Stelle der Sitzung im Verteiler. */
function eingetroffen(zustand: Zustand, stellen: readonly string[]): Nachrichtenzeile[] {
  if (stellen.length === 0 || zustand.nachrichten === undefined) return [];
  return projektion
    .nachrichtenausschnitt(zustand, { sicht: "nachweisung" })
    .zeilen.filter((z) => z.sichtung !== undefined && !z.zurueckgezogen && z.verteiler.some((m) => stellen.includes(m.stelle)));
}

/**
 * Merkt sich, welche Nachrichten für die Stellen schon da waren, und liefert
 * nur, was neu dazukommt — je Nachricht einmal, auch bei mehreren eigenen
 * Stellen im Verteiler. Vor der ersten Grundlinie liefert er nichts.
 */
export class Eintreffwaechter {
  #bekannt: Set<string> | undefined;

  grundlinie(zustand: Zustand, stellen: readonly string[]): void {
    this.#bekannt = new Set(eingetroffen(zustand, stellen).map((z) => z.id));
  }

  vergiss(): void {
    this.#bekannt = undefined;
  }

  neue(zustand: Zustand, stellen: readonly string[]): readonly Nachrichtenzeile[] {
    const bekannt = this.#bekannt;
    if (bekannt === undefined) return [];
    const neu = eingetroffen(zustand, stellen).filter((z) => !bekannt.has(z.id));
    for (const zeile of neu) bekannt.add(zeile.id);
    return neu;
  }
}

export interface AutomatikdruckOptionen {
  readonly akteId: string;
  readonly dateisystem: Dateisystem;
  readonly sende: (mitteilung: Mitteilung) => void;
  /** Fehlt in der Werkstatt und in der Web-Schale: Dann gibt es kein Druckerziel. */
  readonly sendeDruck?: ((auftrag: Druckauftrag) => void) | undefined;
  /**
   * Additiv (FM P2-11): `ausgaben/nachrichten` des Einsatzes. Fehlt das
   * eingestellte Verzeichnis, liegt der Vordruck hier, statt dass ein falsch
   * getippter Ordner still angelegt wird. Fehlt die Angabe, bleibt nur der Hinweis.
   */
  readonly ersatzOrdner?: string | undefined;
  /** Additiv (ETB P1-2): ETB-Nummern aus den Ereignissen, für Feld 20 des Vordrucks. */
  readonly bezug?: (() => projektion.Tagebuchbezug) | undefined;
}

export class Automatikdruck {
  readonly #o: AutomatikdruckOptionen;
  readonly #waechter = new Eintreffwaechter();
  #einstellung: Automatikdruckeinstellung | undefined;
  #fehlerGemeldet = false;
  /** FM P2-11: Der Hinweis „Druckverzeichnis nicht vorhanden“ kommt einmal je Sitzung. */
  #fehltGemeldet = false;
  /** Die Ausdrucke laufen nacheinander; die Kette ist zugleich der Haken für die Tests. */
  #kette: Promise<void> = Promise.resolve();

  constructor(optionen: AutomatikdruckOptionen) {
    this.#o = optionen;
  }

  get an(): boolean {
    return this.#einstellung !== undefined;
  }

  /** Wartet, bis alle angestoßenen Ausdrucke geschrieben oder gescheitert sind. */
  fertig(): Promise<void> {
    return this.#kette;
  }

  /**
   * Setzt das Ziel. Ist die Akte schon offen (`offen`), wird die Grundlinie
   * jetzt gezogen: Was beim Einschalten schon da war, ist nicht eingetroffen.
   * Ein neues Ziel darf seinen Fehler wieder einmal melden.
   */
  setze(einstellung: Automatikdruckeinstellung | undefined, offen: { zustand: Zustand; stellen: readonly string[] } | undefined): void {
    if (JSON.stringify(einstellung?.ziel) !== JSON.stringify(this.#einstellung?.ziel)) {
      this.#fehlerGemeldet = false;
      this.#fehltGemeldet = false;
    }
    const vorher = this.#einstellung;
    this.#einstellung = einstellung;
    if (einstellung === undefined) this.#waechter.vergiss();
    else if (vorher === undefined && offen !== undefined) this.#waechter.grundlinie(offen.zustand, offen.stellen);
  }

  /** Nach dem Öffnen und nach einem Stellenwechsel: Was jetzt da ist, ist nicht eingetroffen. */
  grundlinie(zustand: Zustand, stellen: readonly string[]): void {
    if (this.#einstellung !== undefined) this.#waechter.grundlinie(zustand, stellen);
  }

  /** Nach jedem eingelesenen Zug: Was neu für die Stellen da ist, geht ans Ziel. */
  nachEintreffen(zustand: Zustand, stellen: readonly string[]): void {
    const einstellung = this.#einstellung;
    if (einstellung === undefined) return;
    for (const zeile of this.#waechter.neue(zustand, stellen)) {
      this.#kette = this.#kette.then(() => this.#drucke(zeile, zustand, einstellung));
    }
  }

  async #drucke(zeile: Nachrichtenzeile, zustand: Zustand, einstellung: Automatikdruckeinstellung): Promise<void> {
    const ziel = einstellung.ziel;
    try {
      const mitBezug = this.#o.bezug === undefined ? zeile : (projektion.mitTagebuchbezug([zeile], this.#o.bezug())[0] ?? zeile);
      const { dateiname, bytes } = vordruckDerZeile(mitBezug, zustand, einstellung.blatt);
      if (ziel.ziel === "drucker") {
        if (this.#o.sendeDruck === undefined) throw new Error("Auf diesem Arbeitsplatz gibt es keinen Drucker.");
        this.#o.sendeDruck({ bytes, drucker: ziel.name, dateiname });
        return;
      }
      // FM P2-11: kein stilles Anlegen. Fehlt das Verzeichnis, geht der
      // Vordruck nach ausgaben/nachrichten, und der Arbeitsplatz erfährt es einmal.
      const ordner = (await this.#o.dateisystem.existiert(ziel.pfad)) ? ziel.pfad : await this.#ersatz(ziel.pfad);
      await this.#o.dateisystem.schreibeUeberOhneSync(path.join(ordner, dateiname), bytes);
    } catch (fehler) {
      this.#meldeFehler(ziel, fehler);
    }
  }

  /** Der Ersatzordner nach einem fehlenden Druckverzeichnis; wirft ohne Ersatz (dann meldet `#meldeFehler`). */
  async #ersatz(pfad: string): Promise<string> {
    const ersatz = this.#o.ersatzOrdner;
    if (ersatz === undefined) throw new Error(`Das Druckverzeichnis „${pfad}“ gibt es nicht`);
    await this.#o.dateisystem.legeVerzeichnisAn(ersatz);
    if (!this.#fehltGemeldet) {
      this.#fehltGemeldet = true;
      this.#o.sende({
        art: "hinweis",
        akteId: this.#o.akteId,
        stufe: "warnung",
        text: `Automatikdruck: Druckverzeichnis „${pfad}“ nicht vorhanden, Vordruck liegt unter ausgaben/nachrichten. Bitte das Ziel in den Druckeinstellungen prüfen; dieser Hinweis kommt einmal je Sitzung.`,
      });
    }
    return ersatz;
  }

  #meldeFehler(ziel: Automatikdruckziel, fehler: unknown): void {
    if (this.#fehlerGemeldet) return;
    this.#fehlerGemeldet = true;
    const wohin = ziel.ziel === "drucker" ? `an den Drucker „${ziel.name}“` : `in das Verzeichnis „${ziel.pfad}“`;
    const grund = fehler instanceof Error ? fehler.message : String(fehler);
    this.#o.sende({
      art: "hinweis",
      akteId: this.#o.akteId,
      stufe: "warnung",
      text: `Automatikdruck: Der Vordruck ließ sich nicht ${wohin} geben (${grund}). Die Nachricht steht im Blatt und lässt sich dort drucken; dieser Hinweis kommt einmal je Sitzung.`,
    });
  }
}
