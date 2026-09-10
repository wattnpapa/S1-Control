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
  Bedienergebnis,
  EinsatzEintrag,
  Einstellungen,
  Entwurf,
  Lagebild,
  Mitteilung,
  Umgebung,
} from "../kontrakt/index.js";

/** Wie viele Hinweise das Fenster höchstens behält. */
export const HINWEISE_MAX = 50;

export interface Hinweis {
  readonly nummer: number;
  readonly stufe: "info" | "warnung" | "fehler";
  readonly text: string;
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
  bediene(entwurf: Entwurf): Promise<Bedienergebnis | undefined>;
  zurueck(grund?: string): Promise<Bedienergebnis | undefined>;
  nimmMitteilung(mitteilung: Mitteilung): void;
  loescheFehler(): void;
}

const LEERE_EINSTELLUNGEN: Einstellungen = { sharePfad: "", anzeigename: "" };

let hinweisNummer = 0;

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
          // „Einsatz anlegen" ist der falsche Ort für eine Entscheidung über
          // das Schichtmodell (Startwert S6).
          einsatzArt: "EINSATZ",
          fuestName: hole().einstellungen.anzeigename,
          beginn: new Date().toISOString(),
          schichtmodell: "ZWEI_SCHICHT",
        });
        setze({ akteId: angelegt.akteId, lagebild: undefined, folge: -1 });
        await hole().ladeEinsaetze();
      });
    },

    async oeffneEinsatz(ordner) {
      await mitFehlerbild(async () => {
        const geoeffnet = await rufe({ art: "einsatzOeffnen", ordner });
        setze({ akteId: geoeffnet.akteId, lagebild: undefined, folge: -1 });
      });
    },

    async schliesseEinsatz() {
      const akteId = hole().akteId;
      if (akteId === undefined) return;
      await mitFehlerbild(async () => {
        await rufe({ art: "einsatzSchliessen", akteId });
        setze({ akteId: undefined, lagebild: undefined, folge: -1 });
      });
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
        setze({ akteId: undefined, lagebild: undefined, folge: -1 });
        return;
      }
      // Eine Mitteilung für eine andere Akte gehört einem anderen Fenster.
      if (mitteilung.akteId !== zustand.akteId) return;

      if (mitteilung.voll !== undefined) {
        setze({ lagebild: mitteilung.voll, folge: mitteilung.folge });
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
      setze({
        lagebild: lagebildMit(zustand.lagebild, mitteilung.geaendert ?? {}),
        folge: mitteilung.folge,
      });
    },

    loescheFehler() {
      setze({ fehler: undefined });
    },
  };
});
