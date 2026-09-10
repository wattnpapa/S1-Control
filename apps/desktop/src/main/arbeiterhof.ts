/**
 * Der Arbeiterhof — ein Worker je offener Akte (M2.1).
 *
 * Er ist die einzige Stelle im Main, die von Akten weiss, und selbst sie weiss
 * nichts Fachliches: Sie vergibt Kennungen, startet Threads, ordnet Antworten
 * ihren Auftraegen zu und reicht Mitteilungen weiter. Der Fachzustand liegt im
 * Worker, wie 02-ZIELBILD.md es verlangt („Electron-Main ohne Fachzustand").
 *
 * **Der Worker wird injiziert.** {@link ArbeiterFabrik} ist eine Naht wie der
 * `Dateisystem`-Port in Ring 3: Sie macht die Zuordnung von Antwort und
 * Auftrag pruefbar, ohne dass ein Thread startet. Ein Fehler in dieser
 * Zuordnung waere schwer zu finden und teuer — eine Antwort, die beim falschen
 * Aufrufer landet, ist ein falscher Wert in der Oberflaeche.
 */

import type { Mitteilung } from "../kontrakt/index.js";
import type { Auftrag, Auftragsentwurf, Startdaten, WorkerBotschaft } from "../worker/akte-worker.js";

/** Was der Hof von einem Worker braucht — mehr nicht. */
export interface Arbeiter {
  sende(auftrag: Auftrag): void;
  aufBotschaft(hoerer: (botschaft: WorkerBotschaft) => void): void;
  /** Ein abgestuerzter Thread; der Hof macht daraus eine geschlossene Akte. */
  aufEnde(hoerer: (grund: string) => void): void;
  beende(): Promise<void>;
}

export type ArbeiterFabrik = (start: Startdaten) => Arbeiter;

export interface ArbeiterhofOptionen {
  readonly fabrik: ArbeiterFabrik;
  readonly sende: (mitteilung: Mitteilung) => void;
}

interface Platz {
  readonly arbeiter: Arbeiter;
  readonly offen: Map<number, { aufloesen: (wert: unknown) => void; ablehnen: (fehler: Error) => void }>;
  naechsteNummer: number;
  beendet: boolean;
}

export class Arbeiterhof {
  readonly #o: ArbeiterhofOptionen;
  readonly #plaetze = new Map<string, Platz>();
  #naechsteAkte = 0;

  constructor(optionen: ArbeiterhofOptionen) {
    this.#o = optionen;
  }

  get offeneAkten(): readonly string[] {
    return [...this.#plaetze.keys()];
  }

  /**
   * Startet einen Worker und liefert die Akten-Kennung.
   *
   * Die Kennung kommt von hier und nicht vom Renderer: Sie ist der einzige
   * Bezug, ueber den der Renderer spaeter Auftraege stellt, und ein Renderer,
   * der sie selbst waehlte, koennte auf eine fremde Akte zeigen.
   */
  starte(start: Omit<Startdaten, "akteId">): string {
    this.#naechsteAkte += 1;
    const akteId = `akte-${String(this.#naechsteAkte)}`;
    const arbeiter = this.#o.fabrik({ ...start, akteId });
    const platz: Platz = { arbeiter, offen: new Map(), naechsteNummer: 0, beendet: false };
    this.#plaetze.set(akteId, platz);

    arbeiter.aufBotschaft((botschaft) => {
      if (botschaft.art === "mitteilung") {
        this.#o.sende(botschaft.mitteilung);
        return;
      }
      const wartend = platz.offen.get(botschaft.nummer);
      if (wartend === undefined) return;
      platz.offen.delete(botschaft.nummer);
      if (botschaft.art === "antwort") wartend.aufloesen(botschaft.wert);
      else wartend.ablehnen(new Error(botschaft.meldung));
    });

    arbeiter.aufEnde((grund) => {
      // Ein beendeter Thread laesst jeden offenen Auftrag ins Leere laufen.
      // Ihn dort haengen zu lassen hiesse, dass die Oberflaeche wartet, ohne
      // dass je etwas kaeme — der Fall, den §8.8 Punkt 1 fuer den Datenpfad
      // ausschliesst und der hier nicht anders ist.
      for (const wartend of platz.offen.values()) wartend.ablehnen(new Error(grund));
      platz.offen.clear();
      if (this.#plaetze.get(akteId) === platz && !platz.beendet) {
        this.#plaetze.delete(akteId);
        this.#o.sende({ art: "akteGeschlossen", akteId, meldung: grund });
      }
    });

    return akteId;
  }

  /** Stellt einen Auftrag und wartet auf die Antwort desselben Auftrags. */
  async frage(akteId: string, auftrag: Auftragsentwurf): Promise<unknown> {
    const platz = this.#plaetze.get(akteId);
    if (platz === undefined) throw new Error(`Unbekannte Akte: ${akteId}`);
    platz.naechsteNummer += 1;
    const nummer = platz.naechsteNummer;
    return new Promise<unknown>((aufloesen, ablehnen) => {
      platz.offen.set(nummer, { aufloesen, ablehnen });
      platz.arbeiter.sende({ ...auftrag, nummer } as Auftrag);
    });
  }

  /** Schliesst eine Akte: erst den Dienst, dann den Thread. */
  async schliesse(akteId: string): Promise<void> {
    const platz = this.#plaetze.get(akteId);
    if (platz === undefined) return;
    // `beendet` zuerst, damit der Ende-Hoerer unten die Akte nicht ein
    // zweites Mal als geschlossen meldet. Der Eintrag bleibt bis nach dem
    // Auftrag stehen — `frage` findet ihn sonst nicht mehr.
    platz.beendet = true;
    // Der Dienst soll seine Mitteilung noch loswerden; scheitert er, wird der
    // Thread trotzdem beendet.
    await this.frage(akteId, { art: "schliesse" }).catch(() => undefined);
    this.#plaetze.delete(akteId);
    await platz.arbeiter.beende();
  }

  async alleSchliessen(): Promise<void> {
    for (const akteId of [...this.#plaetze.keys()]) await this.schliesse(akteId);
  }
}
