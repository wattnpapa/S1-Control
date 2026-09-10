/**
 * Der Zustand-Store des Renderers (M2.2).
 *
 * Er hält, was das Fenster zeigt, und sonst nichts: die Umgebung, die
 * Einstellungen, die Liste der Einsätze, die offene Akte und ihr Lagebild.
 * **Er faltet nicht.** Der Fachzustand liegt im Worker (02-ZIELBILD.md); was
 * hier ankommt, ist eine fertige Projektion.
 *
 * Der Grund, aus dem dieser Store überhaupt eigene Logik hat, ist der
 * Delta-Weg. Ein volles Bild kommt beim Öffnen und auf Anforderung, alles
 * dazwischen sind Änderungen mit einer laufenden Folge. Drei Dinge müssen
 * deshalb hier entschieden werden, und jedes davon ist unten geprüft:
 *
 *  * ein Delta, das auf **kein** Bild trifft, wird verworfen statt geraten;
 *  * eine **Lücke** in der Folge führt zur Anforderung des vollen Standes,
 *    nicht zum stillen Weiterzeichnen auf einem halben Bild;
 *  * Hinweise werden **gekappt**. Ein Fenster, das über acht Stunden jede
 *    Meldung sammelt, wächst mit der Zahl der Störungen — genau das, was
 *    KONZEPT-EREIGNISSE.md §3.1 dem Zustand verbietet und was hier nicht
 *    anders ist.
 */

import { create } from "zustand";

import { rufe } from "./bruecke.js";
import { lagebildMit } from "../kontrakt/index.js";
import type {
  Baumansicht,
  Bedienergebnis,
  Bildschirm,
  EebStand,
  EinsatzEintrag,
  Einstellungen,
  Entwurf,
  Lagebild,
  Mitteilung,
  Ruf,
  Tabellenansicht,
  Tagebuchansicht,
  Uebernahmeergebnis,
  Umgebung,
  Untertabellenansicht,
} from "../kontrakt/index.js";

/** Wie viele Hinweise das Fenster höchstens behält. */
export const HINWEISE_MAX = 50;

/**
 * Wie viele Zeilen eine Ansicht auf einmal holt (M3.7).
 *
 * Deutlich unter `AUSSCHNITT_MAX` des Kontrakts: Die Schranke dort schützt den
 * Worker vor einem Ruf, den niemand lesen will; diese Zahl hier ist die, die
 * tatsächlich auf einen Bildschirm passt. Wer weiter blättert, holt die
 * nächste Seite — das ist billiger als eine Antwort, die zehnmal so groß ist
 * wie das, was das Fenster zeigt.
 */
export const SEITE = 100;

export interface Hinweis {
  readonly nummer: number;
  readonly stufe: "info" | "warnung" | "fehler";
  readonly text: string;
}

export interface Tabellenfilter {
  readonly abschnittId?: string;
  readonly suche?: string;
  readonly mitStillgelegten?: boolean;
  readonly von?: number;
}

export interface Tagebuchfilterwahl {
  readonly einheitId?: string;
  readonly abschnittId?: string;
  readonly suche?: string;
  readonly nurRuecknahmen?: boolean;
  readonly von?: number;
}

export interface Laden {
  readonly umgebung: Umgebung | undefined;
  readonly einstellungen: Einstellungen;
  readonly einsaetze: readonly EinsatzEintrag[];
  readonly akteId: string | undefined;
  readonly lagebild: Lagebild | undefined;
  /** Folge der zuletzt eingearbeiteten Standmitteilung. */
  readonly folge: number;
  /** Der letzte Fehler eines Rufs — das Fehlerbild des Fensters. */
  readonly fehler: string | undefined;
  readonly hinweise: readonly Hinweis[];
  /** Läuft gerade ein Ruf? Die Oberfläche sperrt dann ihre Knöpfe. */
  readonly beschaeftigt: boolean;

  starte(): Promise<void>;
  setzeEinstellungen(neu: Einstellungen): Promise<void>;
  ladeEinsaetze(): Promise<void>;
  legeEinsatzAn(name: string, datum: string): Promise<void>;
  oeffneEinsatz(ordner: string): Promise<void>;
  schliesseEinsatz(): Promise<void>;
  /** Die drei Ansichten. `undefined` heißt: noch nie geholt (M3.7). */
  readonly baum: Baumansicht | undefined;
  readonly tabelle: Tabellenansicht | undefined;
  readonly tagebuch: Tagebuchansicht | undefined;
  /** Die Untertabellen der aufgeklappten Einheit — höchstens einer. */
  readonly untertabelle: Untertabellenansicht | undefined;
  readonly tabellenfilter: Tabellenfilter;
  readonly tagebuchfilter: Tagebuchfilterwahl;

  holeBaum(): Promise<void>;
  holeTabelle(): Promise<void>;
  holeTagebuch(): Promise<void>;
  holeUntertabelle(einheitId: string): Promise<void>;

  /** Der Sammelstand des Handscanners (M3.4); `undefined` heißt „noch nichts gescannt“. */
  readonly eeb: EebStand | undefined;
  scanne(text: string): Promise<void>;
  setzeScanZurueck(): Promise<void>;
  uebernimmScan(abschnittId: string): Promise<Uebernahmeergebnis | undefined>;

  /** Die angeschlossenen Bildschirme; `undefined` heißt „noch nicht gefragt“ (M3.5). */
  readonly bildschirme: readonly Bildschirm[] | undefined;
  ladeBildschirme(): Promise<void>;
  oeffneMonitor(bildschirmId?: string): Promise<void>;
  schliesseMonitor(): Promise<void>;
  setzeTabellenfilter(filter: Tabellenfilter): Promise<void>;
  setzeTagebuchfilter(filter: Tagebuchfilterwahl): Promise<void>;
  /** Holt jede Ansicht neu, die schon einmal geholt wurde. */
  frischeAnsichten(): Promise<void>;

  bediene(entwurf: Entwurf): Promise<Bedienergebnis | undefined>;
  zurueck(grund?: string): Promise<Bedienergebnis | undefined>;
  nimmMitteilung(mitteilung: Mitteilung): void;
  loescheFehler(): void;
}

const LEERE_EINSTELLUNGEN: Einstellungen = { sharePfad: "", anzeigename: "" };

/**
 * Was von den Ansichten bleibt, wenn die Akte wechselt: nichts.
 *
 * Ein Baum aus dem vorigen Einsatz im Fenster des nächsten wäre nicht bloß
 * unschön, sondern falsch — die Ids sind je Akte vergeben, und ein Klick
 * darauf schriebe in die neue Akte auf einen Abschnitt, den es dort nicht
 * gibt.
 */
const LEERE_ANSICHTEN = {
  baum: undefined,
  tabelle: undefined,
  tagebuch: undefined,
  untertabelle: undefined,
  // Auch der Sammelstand: Er gehört zur Akte, nicht zum Fenster. Ein halb
  // gescannter Bogen ohne Akte hat kein Ziel (M3.4).
  eeb: undefined,
} as const;

let hinweisNummer = 0;

/**
 * Eine laufende Nummer je Ansicht — der Schutz gegen die überholte Antwort.
 *
 * Zwei Rufe derselben Ansicht können sich überholen: Wer schnell tippt,
 * schickt drei Suchen, und die Antworten kommen in beliebiger Reihenfolge
 * zurück. Ohne diese Nummer trüge das Fenster am Ende das Ergebnis der
 * zweiten Suche, weil es zuletzt eintraf. Verworfen wird deshalb jede
 * Antwort, die nicht zum **jüngsten** Ruf ihrer Ansicht gehört.
 */
const laufendeNummer: Record<"baum" | "tabelle" | "tagebuch" | "untertabelle", number> = {
  baum: 0,
  tabelle: 0,
  tagebuch: 0,
  untertabelle: 0,
};

export const useLaden = create<Laden>((setze, hole) => {
  /** Führt einen Ruf aus und macht aus einem Fehler ein Fehlerbild statt eines Absturzes. */
  async function mitFehlerbild<T>(tue: () => Promise<T>): Promise<T | undefined> {
    setze({ beschaeftigt: true });
    try {
      const wert = await tue();
      setze({ fehler: undefined });
      return wert;
    } catch (fehler) {
      setze({ fehler: fehler instanceof Error ? fehler.message : String(fehler) });
      return undefined;
    } finally {
      setze({ beschaeftigt: false });
    }
  }

  /**
   * Holt eine Ansicht und trägt sie ein — sofern sie nicht überholt ist.
   *
   * Sie läuft **nicht** über `mitFehlerbild`: Ein fehlgeschlagener
   * Ansichtsruf ist kein Fehlerbild über dem ganzen Fenster. Er wird als
   * Hinweis geführt, und die Ansicht behält, was sie hatte — ein Lagebild,
   * das bei einer kurzen Störung leer wird, ist schlechter als eines, das
   * sichtbar altert.
   */
  async function holeAnsicht<A extends "baum" | "tabelle" | "tagebuch" | "untertabelle">(
    welche: A,
    baueRuf: (akteId: string) => Extract<Ruf, { art: `${A}Anfordern` }>,
  ): Promise<void> {
    const akteId = hole().akteId;
    if (akteId === undefined) return;
    laufendeNummer[welche] += 1;
    const meine = laufendeNummer[welche];
    try {
      const antwort = await rufe(baueRuf(akteId));
      if (meine !== laufendeNummer[welche]) return;
      if (hole().akteId !== akteId) return;
      setze({ [welche]: antwort } as unknown as Partial<Laden>);
    } catch (fehler) {
      merkeHinweis("warnung", fehler instanceof Error ? fehler.message : String(fehler));
    }
  }

  function merkeHinweis(stufe: Hinweis["stufe"], text: string): void {
    hinweisNummer += 1;
    const hinweise = [...hole().hinweise, { nummer: hinweisNummer, stufe, text }];
    setze({ hinweise: hinweise.slice(-HINWEISE_MAX) });
  }

  return {
    umgebung: undefined,
    einstellungen: LEERE_EINSTELLUNGEN,
    einsaetze: [],
    akteId: undefined,
    lagebild: undefined,
    folge: -1,
    fehler: undefined,
    hinweise: [],
    beschaeftigt: false,

    async starte() {
      await mitFehlerbild(async () => {
        const [umgebung, einstellungen] = await Promise.all([
          rufe({ art: "umgebung" }),
          rufe({ art: "einstellungenLesen" }),
        ]);
        setze({ umgebung, einstellungen });
        // Die Liste erst danach: Ohne Share-Pfad gäbe sie nichts her, und ein
        // Fehler beim Auflisten überschriebe sonst die Umgebung im Fehlerbild.
        if (einstellungen.sharePfad.length > 0) await hole().ladeEinsaetze();
      });
    },

    async setzeEinstellungen(neu) {
      await mitFehlerbild(async () => {
        const gespeichert = await rufe({ art: "einstellungenSetzen", einstellungen: neu });
        setze({ einstellungen: gespeichert });
        await hole().ladeEinsaetze();
      });
    },

    async ladeEinsaetze() {
      const einsaetze = await rufe({ art: "einsaetzeAuflisten" });
      setze({ einsaetze });
    },

    async legeEinsatzAn(name, datum) {
      await mitFehlerbild(async () => {
        const angelegt = await rufe({
          art: "einsatzAnlegen",
          name,
          datum,
          // Die drei Vorbelegungen sind die Werte, mit denen eine Führungsstelle
          // beginnt; geändert werden sie danach über die Stammdaten. Die Maske
          // „Einsatz anlegen“ ist der falsche Ort für eine Entscheidung über
          // das Schichtmodell (Startwert S6).
          einsatzArt: "EINSATZ",
          fuestName: hole().einstellungen.anzeigename,
          beginn: new Date().toISOString(),
          schichtmodell: "ZWEI_SCHICHT",
        });
        setze({ akteId: angelegt.akteId, lagebild: undefined, folge: -1, ...LEERE_ANSICHTEN });
        await hole().ladeEinsaetze();
      });
    },

    async oeffneEinsatz(ordner) {
      await mitFehlerbild(async () => {
        const geoeffnet = await rufe({ art: "einsatzOeffnen", ordner });
        setze({ akteId: geoeffnet.akteId, lagebild: undefined, folge: -1, ...LEERE_ANSICHTEN });
      });
    },

    async schliesseEinsatz() {
      const akteId = hole().akteId;
      if (akteId === undefined) return;
      await mitFehlerbild(async () => {
        await rufe({ art: "einsatzSchliessen", akteId });
        setze({ akteId: undefined, lagebild: undefined, folge: -1, ...LEERE_ANSICHTEN });
      });
    },

    baum: undefined,
    tabelle: undefined,
    tagebuch: undefined,
    untertabelle: undefined,
    eeb: undefined,
    bildschirme: undefined,
    tabellenfilter: {},
    tagebuchfilter: {},

    async holeBaum() {
      await holeAnsicht("baum", (akteId) => ({ art: "baumAnfordern", akteId, ohneArchiv: false }));
    },

    async holeTabelle() {
      const filter = hole().tabellenfilter;
      await holeAnsicht("tabelle", (akteId) => ({
        art: "tabelleAnfordern",
        akteId,
        von: filter.von ?? 0,
        anzahl: SEITE,
        ...(filter.abschnittId === undefined ? {} : { abschnittId: filter.abschnittId }),
        ...(filter.suche === undefined ? {} : { suche: filter.suche }),
        ...(filter.mitStillgelegten === undefined ? {} : { mitStillgelegten: filter.mitStillgelegten }),
      }));
    },

    async holeTagebuch() {
      const filter = hole().tagebuchfilter;
      await holeAnsicht("tagebuch", (akteId) => ({
        art: "tagebuchAnfordern",
        akteId,
        von: filter.von ?? 0,
        anzahl: SEITE,
        ...(filter.einheitId === undefined ? {} : { einheitId: filter.einheitId }),
        ...(filter.abschnittId === undefined ? {} : { abschnittId: filter.abschnittId }),
        ...(filter.suche === undefined ? {} : { suche: filter.suche }),
        ...(filter.nurRuecknahmen === undefined ? {} : { nurRuecknahmen: filter.nurRuecknahmen }),
      }));
    },

    async holeUntertabelle(einheitId) {
      await holeAnsicht("untertabelle", (akteId) => ({
        art: "untertabelleAnfordern",
        akteId,
        einheitId,
      }));
    },

    async scanne(text) {
      const akteId = hole().akteId;
      if (akteId === undefined) return;
      // **Kein** `mitFehlerbild`: Ein misslungener Scan ist kein Fehler des
      // Fensters, sondern ein Befund über den Scan — und er steht als
      // Meldung im Sammelstand, wo die Maske ihn zeigt.
      const stand = await rufe({ art: "eebScan", akteId, text });
      setze({ eeb: stand });
    },

    async setzeScanZurueck() {
      const akteId = hole().akteId;
      if (akteId === undefined) return;
      setze({ eeb: await rufe({ art: "eebZuruecksetzen", akteId }) });
    },

    async uebernimmScan(abschnittId) {
      const akteId = hole().akteId;
      if (akteId === undefined) return undefined;
      const ergebnis = await mitFehlerbild(() =>
        rufe({ art: "eebUebernehmen", akteId, abschnittId }),
      );
      if (ergebnis?.art === "uebernommen") {
        setze({ eeb: undefined });
        await hole().frischeAnsichten();
      }
      return ergebnis;
    },

    async ladeBildschirme() {
      await mitFehlerbild(async () => {
        setze({ bildschirme: await rufe({ art: "bildschirmeAuflisten" }) });
      });
    },

    async oeffneMonitor(bildschirmId) {
      await mitFehlerbild(async () => {
        await rufe({
          art: "monitorOeffnen",
          ...(bildschirmId === undefined ? {} : { bildschirmId }),
        });
      });
    },

    async schliesseMonitor() {
      await mitFehlerbild(async () => {
        await rufe({ art: "monitorSchliessen" });
      });
    },

    async setzeTabellenfilter(filter) {
      // Ein geänderter Filter setzt den Ausschnitt zurück: Wer auf Seite 4
      // steht und dann sucht, will nicht Seite 4 der neuen Treffermenge.
      setze({ tabellenfilter: { von: 0, ...filter } });
      await hole().holeTabelle();
    },

    async setzeTagebuchfilter(filter) {
      setze({ tagebuchfilter: { von: 0, ...filter } });
      await hole().holeTagebuch();
    },

    async frischeAnsichten() {
      const zustand = hole();
      // Nur, was schon einmal geholt wurde: Eine zugeklappte Ansicht kostet
      // so nichts, und genau darauf beruht der Zuschnitt aus M3.7 — geschoben
      // wird ein Zeiger, geholt wird, was offen ist.
      const einheitId = zustand.untertabelle?.einheitId;
      await Promise.all([
        zustand.baum === undefined ? undefined : zustand.holeBaum(),
        zustand.tabelle === undefined ? undefined : zustand.holeTabelle(),
        zustand.tagebuch === undefined ? undefined : zustand.holeTagebuch(),
        einheitId === undefined ? undefined : zustand.holeUntertabelle(einheitId),
      ]);
    },

    async bediene(entwurf) {
      const akteId = hole().akteId;
      if (akteId === undefined) return undefined;
      return mitFehlerbild(() => rufe({ art: "bedienen", akteId, entwurf }));
    },

    async zurueck(grund) {
      const akteId = hole().akteId;
      if (akteId === undefined) return undefined;
      return mitFehlerbild(() =>
        rufe({ art: "zurueck", akteId, ...(grund === undefined ? {} : { grund }) }),
      );
    },

    nimmMitteilung(mitteilung) {
      const zustand = hole();
      if (mitteilung.art === "hinweis") {
        merkeHinweis(mitteilung.stufe, mitteilung.text);
        return;
      }
      if (mitteilung.art === "akteGeschlossen") {
        if (mitteilung.akteId !== zustand.akteId) return;
        merkeHinweis("warnung", mitteilung.meldung);
        setze({ akteId: undefined, lagebild: undefined, folge: -1, ...LEERE_ANSICHTEN });
        return;
      }
      // Eine Mitteilung für eine andere Akte gehört einem anderen Fenster.
      if (mitteilung.akteId !== zustand.akteId) return;

      if (mitteilung.voll !== undefined) {
        const vorher = zustand.lagebild?.lageZeiger;
        setze({ lagebild: mitteilung.voll, folge: mitteilung.folge });
        if (vorher !== mitteilung.voll.lageZeiger) void hole().frischeAnsichten();
        return;
      }
      if (zustand.lagebild === undefined) {
        // Ein Delta ohne Bild: Es gibt nichts, worauf es sich auftragen ließe.
        // Der volle Stand wird angefordert, statt ein halbes Bild zu erfinden.
        void rufe({ art: "standAnfordern", akteId: mitteilung.akteId });
        return;
      }
      if (mitteilung.folge !== zustand.folge + 1) {
        // Eine Lücke. Sie ist im Betrieb möglich — ein Fenster, das während
        // eines Deltas neu lädt, hat die vorherige Mitteilung nie gesehen.
        void rufe({ art: "standAnfordern", akteId: mitteilung.akteId });
        return;
      }
      const neuesBild = lagebildMit(zustand.lagebild, mitteilung.geaendert ?? {});
      setze({ lagebild: neuesBild, folge: mitteilung.folge });
      // M3.7: Der Zeiger ist die einzige Auskunft, die der Worker über
      // fachliche Änderungen schiebt. Ändert er sich, ist jedes offene Bild
      // veraltet — und nur die offenen werden nachgeholt.
      if (zustand.lagebild.lageZeiger !== neuesBild.lageZeiger) void hole().frischeAnsichten();
    },

    loescheFehler() {
      setze({ fehler: undefined });
    },
  };
});
