/**
 * Der Aktendienst — die Fachschleife eines Workers (M2.1).
 *
 * Ein Worker je offener Akte, sagt 05-UMSETZUNGSPLAN.md M2.1, und
 * KONZEPT-SPEICHER.md §5.4.4 nennt ihn beim Namen: „Der Worker je Akte ist
 * M2.1"; `akte.ts` haelt deshalb ausdruecklich keinen Takt — „Die Akte wird
 * gerufen, sie ruft nicht."
 *
 * **Hier steht die Fachschleife, nicht der Worker.** Die Trennung ist
 * beabsichtigt und der Grund, aus dem der Mehrclient-Nachweis aus M2.3
 * ueberhaupt als Test laufen kann: Diese Klasse kennt weder `worker_threads`
 * noch Electron, sie bekommt ihr Dateisystem und ihre Uhr injiziert, und sie
 * schlaegt keinen eigenen Takt — {@link Aktendienst.takt} wird gerufen. Der
 * Worker-Einstieg (`akte-worker.ts`) ist danach eine Botschaftsschleife, und
 * ein Test kann zwei Aktendienste in einem Prozess gegeneinander laufen
 * lassen.
 *
 * Was der Dienst haelt und was nicht:
 *
 *  * er haelt die **fortgeschriebene Faltung** — die Quelle der Vorher-Werte
 *    fuer den naechsten Bedienschritt (§2.5, Auflage 6). Ein Client kennt nur,
 *    was er gesehen hat;
 *  * er haelt den **Undo-Stapel** dieses Clients (§6 U3);
 *  * er haelt **kein** Fenster, keine Einstellung und keinen zweiten Einsatz.
 *    Das ist Sache des Main-Prozesses.
 */

import {
  HlcUhr,
  KATALOG,
  Undostapel,
  falteHinzu,
  hlcAlsText,
  kennzahlen,
  LEERER_STAND,
  kompensationFuer,
  leereFaltung,
  liesBogen,
  nimmScan,
  uebernahmeEntwuerfe,
  materialisiere,
  projektion,
  vergleicheHlc,
  type Akteur,
  type EingehendesEreignis,
  type Faltung,
  type Hlc,
  type Sammelstand,
  type Zustand,
} from "@s1/domaene";
import {
  Akte,
  Praesenzbeobachtung,
  clientPraefix,
  istVerwaltungsereignis,
  liesFremdePraesenz,
  oeffneAkte,
  schreibePraesenz,
  segmentText,
  type Dateisystem,
  type Einsatzablage,
  type Ereignisentwurf,
  type Oeffnungsergebnis,
  type Reaktion,
  type Zeitquelle,
} from "@s1/speicher";

import type { Kompressor } from "@bos/eeb-format";
import {
  MONITOR_DATEINAME,
  auswertungAlsXlsx,
  oldenburgAlsXlsx,
  druckAlsHtml,
  druckdaten,
  monitorAlsHtml,
  statusAlsHtml,
  statusdaten,
} from "@s1/ausgaben";

import {
  lagebildDelta,
  type Baumansicht,
  type Bedienergebnis,
  type Lagebild,
  type Mitteilung,
  type Peer,
  type Ruf,
  type Tabellenansicht,
  type Tagebuchansicht,
  type EebStand,
  type EebVorschau,
  type Uebernahmeergebnis,
  type Untertabellenansicht,
} from "../kontrakt/index.js";

/**
 * Die Takte in Millisekunden (§6.2, §6.4, §5.4).
 *
 * Startwerte aus KONZEPT-SPEICHER.md §10; sie stehen hier als Vorbelegung und
 * nicht als Konstante, weil M0.5 sie am echten Geraet nachmisst und die Tests
 * sie herunterdrehen.
 */
export interface Takte {
  readonly spiegelungMs: number;
  readonly taktAMs: number;
  readonly taktBMs: number;
  readonly praesenzMs: number;
  /**
   * Wie oft die Monitordatei hoechstens neu geschrieben wird (M4.3).
   *
   * Die Haelfte der Nachladezeit der Seite (60 s, `RELOAD_SEKUNDEN`): Damit
   * ist das Bild an der Wand nie aelter als eine halbe Ladeperiode, und der
   * Share sieht hoechstens zwei Schreibvorgaenge je Minute. Oefter zu
   * schreiben brachte nichts — die Seite laedt ja nicht oefter.
   */
  readonly monitorMs: number;
}

export const TAKTE_VORBELEGUNG: Takte = {
  spiegelungMs: 1_000,
  taktAMs: 1_000,
  taktBMs: 4_000,
  praesenzMs: 15_000,
  monitorMs: 30_000,
};

export interface AktendienstOptionen {
  readonly akteId: string;
  readonly dateisystem: Dateisystem;
  readonly zeit: Zeitquelle;
  readonly ablage: Einsatzablage;
  readonly clientId: string;
  readonly einsatzId: string;
  readonly akteur: Akteur;
  readonly anzeigename: string;
  readonly rechnername: string;
  readonly programmversion: string;
  readonly neueKennung: () => string;
  /**
   * Der Kompressor fuer den Handscanner-Weg (M3.4).
   *
   * Injiziert wie das Dateisystem: `@s1/domaene` ist plattformneutral und hat
   * weder `node:zlib` noch die `DecompressionStream` des Browsers
   * (02-ZIELBILD.md, „Vier Ringe“). Fehlt er, ist der Scan-Weg schlicht nicht
   * verfuegbar — das ist besser als ein Aktendienst, der ohne ihn nicht
   * startet.
   */
  readonly kompressor?: Kompressor;
  /** Wohin die Mitteilungen gehen — im Worker `parentPort.postMessage`. */
  readonly sende: (mitteilung: Mitteilung) => void;
  readonly takte?: Partial<Takte>;
  readonly segmentgroesse?: number;
}

/** Das leere Lagebild: was die Statuszeile zeigt, bevor irgendetwas gelesen wurde. */
function leeresLagebild(einsatzId: string): Lagebild {
  return {
    einsatzId,
    einsatzName: "",
    einsatzArt: "",
    standHlc: "",
    standWanduhr: "",
    letzterShareKontakt: "",
    shareErreichbar: false,
    peers: [],
    unuebertrageneBytes: 0,
    quarantaene: [],
    abschnitte: 0,
    einheiten: 0,
    gesamtstaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
    staerkeJeStatus: {},
    hinweise: 0,
    unbekannteEreignisse: 0,
    undoTiefe: 0,
    lageZeiger: 0,
  };
}

export class Aktendienst {
  readonly #o: AktendienstOptionen;
  readonly #takte: Takte;
  readonly #praesenzbeobachtung = new Praesenzbeobachtung();

  #clientId: string;
  #hlcUhr: HlcUhr;
  #akte: Akte | undefined;
  #faltung: Faltung = leereFaltung();
  #zustand: Zustand = materialisiere(leereFaltung());
  #stapel: Undostapel;

  /** Die hoechste gesehene HLC — der „Stand“, den die Statuszeile nennt. */
  #hoechsteHlc: Hlc | undefined;
  #letzteWanduhr = "";
  #letzterShareKontakt = "";
  #shareErreichbar = false;
  #shareMeldung: string | undefined;
  #peers: readonly Peer[] = [];

  #letzteSpiegelung = Number.NEGATIVE_INFINITY;
  #letzterTaktA = Number.NEGATIVE_INFINITY;
  #letzterTaktB = Number.NEGATIVE_INFINITY;
  #letztePraesenz = Number.NEGATIVE_INFINITY;

  #gesendet: Lagebild;
  #folge = 0;
  #geschlossen = false;

  /**
   * Zaehlt jedes gefaltete fachliche Ereignis (M3.7).
   *
   * Er zaehlt **Ereignisse** und nicht Aenderungen am Lagebild: Eine
   * Statusaenderung an einer von 150 Einheiten laesst die flache Projektion
   * unberuehrt, und trotzdem ist die Tabelle danach veraltet. Ein Zeiger, der
   * an der Projektion haengt, meldete diesen Fall nie.
   */
  #lageZeiger = 0;

  /**
   * Die fachlichen Ereignisse dieser Akte, in Eintreffreihenfolge.
   *
   * §5.9.1: Das Tagebuch wird aus den Ereignisdateien gerendert und ist
   * ausdruecklich **kein** Bestandteil des `Zustand`. Der Dienst haelt sie
   * deshalb neben der Faltung — nicht als zweite Wahrheit, sondern als
   * dieselbe Quelle, die auch die Faltung gespeist hat. Das erspart es, fuer
   * jede Tagebuchansicht die Segmente erneut zu lesen; die Zeilen selbst
   * entstehen erst beim Ruf, mit den Namen, die **jetzt** gelten.
   *
   * Die Liste waechst mit der Zahl der Ereignisse. Das ist hier zulaessig und
   * in §3.1 nicht gemeint: Jene Schranke gilt dem `Zustand`, der in den
   * `zustandsHash` eingeht und ueber Schnappschuesse wandert. Diese Liste
   * geht nirgendwohin und stirbt mit dem Worker.
   */
  readonly #ereignisse: EingehendesEreignis[] = [];

  /**
   * Der Sammelstand des Handscanners (M3.4).
   *
   * Er liegt hier und nicht im Renderer, weil er aus Byte-Abschnitten besteht,
   * die nur mit dem Codec zu deuten sind. Er gehoert zur **Akte** und nicht
   * zum Fenster: Wer den Einsatz schliesst, verliert ihn — ein halb
   * gescannter Bogen ohne Akte hat kein Ziel.
   */
  #scanstand: Sammelstand = LEERER_STAND;
  #scanPayload: Uint8Array | undefined;
  #scanText = "";

  /**
   * Der HTML-Monitor (M4.3): eingeschaltet oder nicht, und mit welchen Wahlen.
   *
   * Er ist **aus**, bis ihn jemand einschaltet. Eine Datei, die immer
   * geschrieben wird, liegt auf jedem Share jedes Einsatzes — auch dort, wo
   * niemand ein zweites Geraet hat, und kostet zwei Schreibvorgaenge je
   * Minute fuer nichts.
   */
  #monitor: { mitStatus: boolean; organisation?: string } | undefined;
  #letzterMonitor = Number.NEGATIVE_INFINITY;

  constructor(optionen: AktendienstOptionen) {
    this.#o = optionen;
    this.#takte = { ...TAKTE_VORBELEGUNG, ...optionen.takte };
    this.#clientId = optionen.clientId;
    this.#hlcUhr = new HlcUhr({ clientId: optionen.clientId, wanduhr: optionen.zeit });
    this.#stapel = new Undostapel(optionen.clientId);
    this.#gesendet = leeresLagebild(optionen.einsatzId);
  }

  get clientId(): string {
    return this.#clientId;
  }

  get zustand(): Zustand {
    return this.#zustand;
  }

  get akte(): Akte {
    if (this.#akte === undefined) throw new Error("Die Akte ist nicht geöffnet.");
    return this.#akte;
  }

  // -------------------------------------------------------------------------
  // Oeffnen und Schliessen
  // -------------------------------------------------------------------------

  /**
   * Oeffnet die Akte und schickt das erste, **volle** Lagebild.
   *
   * Voll und nicht als Delta: Der Renderer hat noch nichts, worauf ein Delta
   * aufsetzen koennte. Alles danach ist ein Delta (§ {@link takt}).
   */
  async oeffne(): Promise<Oeffnungsergebnis> {
    const { akte, ergebnis } = await oeffneAkte({
      dateisystem: this.#o.dateisystem,
      zeit: this.#o.zeit,
      ablage: this.#o.ablage,
      clientId: this.#clientId,
      einsatzId: this.#o.einsatzId,
      akteur: this.#o.akteur,
      uhr: this.#hlcUhr,
      neueKennung: this.#o.neueKennung,
      ...(this.#o.segmentgroesse === undefined ? {} : { segmentgroesse: this.#o.segmentgroesse }),
    });
    this.#akte = akte;
    // §4.5: Wechselt die Akte die Kennung, wechseln Uhr und Stapel mit — die
    // clientId steht in jeder HLC (§3.2) und entscheidet, was „eigen“ ist.
    if (akte.schreiber.clientId !== this.#clientId) this.#uebernimmKennung(akte.schreiber.clientId);

    this.#melde(ergebnis.reaktion);
    for (const weitere of ergebnis.weitereReaktionen ?? []) this.#melde(weitere);
    this.#nimmAuf(ergebnis.quarantaeneNachlauf.neueZeilen);

    // Der Oeffnungsbefund sagt bereits, ob der Share erreichbar war; ihn hier
    // zu setzen erspart der Statuszeile eine Sekunde „nicht erreichbar“, die
    // nicht stimmt.
    this.#shareErreichbar = ergebnis.reaktion?.art !== "shareNichtErreichbar";
    if (this.#shareErreichbar) this.#letzterShareKontakt = this.#jetztText();

    this.#folge = 0;
    this.#gesendet = this.#projiziere();
    this.#o.sende({ art: "stand", akteId: this.#o.akteId, folge: 0, voll: this.#gesendet });
    return ergebnis;
  }

  /** Beendet den Dienst. Weitere Takte tun nichts mehr. */
  schliesse(meldung = "Der Einsatz wurde geschlossen."): void {
    if (this.#geschlossen) return;
    this.#geschlossen = true;
    this.#o.sende({ art: "akteGeschlossen", akteId: this.#o.akteId, meldung });
  }

  // -------------------------------------------------------------------------
  // Der Takt
  // -------------------------------------------------------------------------

  /**
   * Ein Durchlauf: spiegeln, Takt A, Takt B, Praesenz — jeder nur, wenn faellig.
   *
   * Der Aufrufer ruft haeufig; welcher Schritt tatsaechlich laeuft, entscheidet
   * die Uhr und nicht der Aufrufer. Dadurch ist der Takt in einem Test durch
   * eine gestellte Uhr steuerbar, ohne dass irgendwo `setInterval` steht.
   *
   * Am Ende steht **ein** Delta. Nicht je Schritt eines: Vier Mitteilungen je
   * Sekunde je Akte waeren viermal Serialisierung und viermal ein Neuzeichnen
   * fuer eine Statuszeile, die sich einmal geaendert hat.
   */
  async takt(): Promise<void> {
    if (this.#geschlossen || this.#akte === undefined) return;
    const jetzt = this.#o.zeit();

    if (jetzt - this.#letzteSpiegelung >= this.#takte.spiegelungMs) {
      this.#letzteSpiegelung = jetzt;
      await this.#spiegle();
    }
    if (jetzt - this.#letzterTaktA >= this.#takte.taktAMs) {
      this.#letzterTaktA = jetzt;
      await this.#takt("A");
    }
    if (jetzt - this.#letzterTaktB >= this.#takte.taktBMs) {
      this.#letzterTaktB = jetzt;
      await this.#takt("B");
    }
    if (jetzt - this.#letztePraesenz >= this.#takte.praesenzMs) {
      this.#letztePraesenz = jetzt;
      await this.#praesenz();
    }
    if (this.#monitor !== undefined && jetzt - this.#letzterMonitor >= this.#takte.monitorMs) {
      this.#letzterMonitor = jetzt;
      await this.#schreibeMonitor();
    }
    this.#sendeDelta();
  }

  /** Schickt den vollen Stand — die Antwort auf eine Folgeluecke im Renderer. */
  sendeVollenStand(): void {
    this.#gesendet = this.#projiziere();
    this.#folge += 1;
    this.#o.sende({
      art: "stand",
      akteId: this.#o.akteId,
      folge: this.#folge,
      voll: this.#gesendet,
    });
  }

  async #spiegle(): Promise<void> {
    try {
      const { ergebnis, reaktion } = await this.akte.spiegle();
      this.#melde(reaktion);
      if (reaktion?.art === "kennungGewechselt" || reaktion?.art === "kennungswechselUnvollstaendig") {
        this.#uebernimmKennung(reaktion.neueClientId);
      }
      if (reaktion?.art === "ordnerFort") {
        // §5.7: Der Ordner ist fort. Die Akte weiterzufuehren hiesse, in einen
        // Ordner zu schreiben, den niemand oeffnet.
        this.schliesse(reaktion.meldung);
        return;
      }
      // §8.9: `gescheitert` ist der einzige Ausgang, der „der Share hat nicht
      // geantwortet" heisst. `beschaedigt` und `fremdeSchreibspur` sind
      // Befunde ueber die Daten, nicht ueber die Erreichbarkeit.
      if (ergebnis.art === "gescheitert") this.#setzeShare(false, ergebnis.meldung);
      else this.#setzeShare(true);
    } catch (fehler) {
      this.#setzeShare(false, (fehler as Error).message);
    }
  }

  async #takt(welcher: "A" | "B"): Promise<void> {
    try {
      const ergebnis = welcher === "A" ? await this.akte.taktA() : await this.akte.taktB();
      this.#nimmAuf(ergebnis.neueZeilen);
      const fehler = ergebnis.lesefehler[0];
      this.#setzeShare(
        fehler === undefined,
        fehler === undefined ? undefined : `${fehler.datei}: ${fehler.code}`,
      );
      for (const meldung of ergebnis.uhrmeldungen) {
        // §3.2: Eine Uhrmeldung ist eine Aussage ueber die Uhr **dieses**
        // Rechners und gehoert vor den Bediener, nicht ins Protokoll allein.
        this.#o.sende({
          art: "hinweis",
          akteId: this.#o.akteId,
          stufe: "warnung",
          text: `Uhr: ${JSON.stringify(meldung)}`,
        });
      }
    } catch (fehler) {
      this.#setzeShare(false, (fehler as Error).message);
    }
  }

  async #praesenz(): Promise<void> {
    const praesenzOptionen = {
      dateisystem: this.#o.dateisystem,
      zeit: this.#o.zeit,
      ablage: this.#o.ablage,
      clientId: this.#clientId,
      anzeigename: this.#o.anzeigename,
      rechnername: this.#o.rechnername,
      programmversion: this.#o.programmversion,
    };
    try {
      await schreibePraesenz(
        praesenzOptionen,
        {
          hlc: this.#hoechsteHlc ?? this.#hlcUhr.stand,
          segment: this.akte.schreiber.segment,
          offset: this.akte.schreiber.lokalerVollstaendigerOffset,
        },
        // §4.6.1 Ausloeser 2: Die eigene Quarantaene steht in der eigenen
        // Praesenzdatei, damit der betroffene Schreiber sie sieht.
        this.akte.leser.quarantaenen
          .filter((q) => !q.vorlaeufig)
          .map((q) => ({ datei: q.datei, offset: q.offset })),
      );
      this.#peers = (await liesFremdePraesenz(praesenzOptionen, this.#praesenzbeobachtung)).map(
        (fremd) => ({
          clientId: fremd.praesenz.clientId,
          anzeigename: fremd.praesenz.anzeigename,
          rechnername: fremd.praesenz.rechnername,
          veraltet: fremd.veraltet,
          wanduhr: fremd.praesenz.wanduhr,
        }),
      );
      this.#setzeShare(true);
    } catch (fehler) {
      // §6.4: Die Praesenz ist ein Beschleuniger. Faellt sie aus, faellt nichts
      // Fachliches aus — die Liste altert sichtbar, statt zu luegen.
      this.#setzeShare(false, (fehler as Error).message);
    }
  }

  // -------------------------------------------------------------------------
  // Bedienen und Zuruecknehmen
  // -------------------------------------------------------------------------

  /** Ein fachlicher Bedienschritt (§5.2). */
  async bediene(entwurf: Ereignisentwurf): Promise<Bedienergebnis> {
    if (this.#geschlossen) {
      return { art: "nichtMoeglich", meldung: "Die Akte ist geschlossen." };
    }
    const abgewiesen = this.#pruefeNutzlast(entwurf);
    if (abgewiesen !== undefined) return abgewiesen;
    const ergebnis = await this.akte.schreibe(entwurf);
    if (ergebnis.art === "geschrieben") {
      this.#nimmAuf([{ rahmen: ergebnis.zeile.rahmen }]);
      this.#sendeDelta();
      return { art: "geschrieben", ereignisId: ergebnis.zeile.rahmen.id };
    }
    if (ergebnis.art === "abgewiesen") {
      return {
        art: "abgewiesen",
        meldung: ergebnis.meldung,
        ...(ergebnis.code === undefined ? {} : { code: ergebnis.code }),
        dauerhafterHinweis: ergebnis.dauerhafterHinweis,
      };
    }
    return { art: "uhrSteht", meldung: JSON.stringify(ergebnis.meldung) };
  }

  /**
   * Prueft die Nutzlast gegen den Katalog, **bevor** geschrieben wird.
   *
   * §3.7 regelt, was ein Client mit einem Ereignis tut, dessen Nutzlast er
   * nicht deuten kann: Er faltet es nach `unbekannt` und arbeitet weiter. Das
   * ist die Regel fuer die **Empfangsseite** — fuer Zeilen, die eine andere
   * Fassung geschrieben hat. Auf der Schreibseite waere sie eine Zumutung: Das
   * Ereignisprotokoll ist append-only (§1.3), eine falsch gebaute Nutzlast
   * bliebe darin stehen, und jeder Client jeder kuenftigen Fassung schleppte
   * sie als `unbekannt` mit.
   *
   * §8.8 Punkt 1 verlangt, einen gescheiterten Bedienschritt **sichtbar**
   * abzuweisen. Genau das geschieht hier, und zwar bevor eine Zeile entsteht.
   */
  #pruefeNutzlast(entwurf: Ereignisentwurf): Bedienergebnis | undefined {
    const eintrag = KATALOG.get(entwurf.typ);
    if (eintrag === undefined) {
      return {
        art: "abgewiesen",
        meldung: `Diese Fassung kennt die Ereignisart ${entwurf.typ} nicht.`,
        code: "ART",
        dauerhafterHinweis: false,
      };
    }
    const geprueft = eintrag.schema.safeParse(entwurf.nutzlast ?? {});
    if (geprueft.success) return undefined;
    const erste = geprueft.error.issues[0];
    return {
      art: "abgewiesen",
      meldung:
        erste === undefined
          ? `Die Nutzlast für ${entwurf.typ} ist nicht gültig.`
          : `Die Nutzlast für ${entwurf.typ} ist nicht gültig: ${erste.path.join(".")} — ${erste.message}`,
      code: "SCHEMA",
      dauerhafterHinweis: false,
    };
  }

  /**
   * „Letzte Aktion rueckgaengig“ (§6 U3).
   *
   * Der Stapel liefert das Original, `kompensationFuer` den Entwurf, und
   * geschrieben wird ein **gewoehnliches** Ereignis mit `undoOf` (U1). Der
   * Dienst entscheidet hier nichts selbst: Ob eine Art ruecknehmbar ist, was
   * die Kompensation setzt und ob sie einen Grund braucht, steht im Katalog.
   */
  async zurueck(grund?: string): Promise<Bedienergebnis> {
    const oberster = this.#stapel.oberster();
    if (oberster === undefined) {
      return { art: "nichtMoeglich", meldung: "Es ist nichts zurückzunehmen." };
    }
    const kompensation = kompensationFuer(oberster.ereignis, this.#zustand, grund);
    if (kompensation.art === "nichtMoeglich") {
      return { art: "nichtMoeglich", meldung: kompensation.meldung };
    }
    if (kompensation.art === "brauchtGrund") {
      return { art: "brauchtGrund", zielArt: kompensation.zielArt };
    }
    if (kompensation.art === "strukturell") {
      return {
        art: "strukturell",
        inverseArt: kompensation.inverseArt,
        meldung: kompensation.meldung,
      };
    }
    return this.bediene(kompensation.entwurf);
  }

  // -------------------------------------------------------------------------
  // Die drei Ansichten (M3.7)
  // -------------------------------------------------------------------------

  /**
   * Der Abschnittsbaum (M3.1).
   *
   * Gebaut wird beim Ruf und nicht auf Vorrat: Ein Baum, den niemand
   * aufgeklappt hat, kostet so nichts, und ein Baum, den jemand aufgeklappt
   * hat, ist bei jedem Ruf frisch. Die Projektion liegt in Ring 2 und rechnet
   * dort gegen §5.3; hier wird sie nur gerufen.
   */
  baum(ruf: Extract<Ruf, { art: "baumAnfordern" }>): Baumansicht {
    return {
      lageZeiger: this.#lageZeiger,
      baum: projektion.abschnittsbaum(this.#zustand, {
        ...(ruf.ohneAufgeloeste === undefined ? {} : { ohneAufgeloeste: ruf.ohneAufgeloeste }),
        ...(ruf.ohneArchiv === undefined ? {} : { ohneArchiv: ruf.ohneArchiv }),
      }),
    };
  }

  /** Die Einheitentabelle, gefiltert und auf den Ausschnitt beschnitten (M3.2). */
  tabelle(ruf: Extract<Ruf, { art: "tabelleAnfordern" }>): Tabellenansicht {
    const ausschnitt = projektion.einheitentabelle(this.#zustand, {
      ...(ruf.abschnittId === undefined ? {} : { abschnittId: ruf.abschnittId }),
      ...(ruf.suche === undefined ? {} : { suche: ruf.suche }),
      ...(ruf.mitStillgelegten === undefined ? {} : { mitStillgelegten: ruf.mitStillgelegten }),
      ...(ruf.von === undefined ? {} : { von: ruf.von }),
      ...(ruf.anzahl === undefined ? {} : { anzahl: ruf.anzahl }),
    });
    return { lageZeiger: this.#lageZeiger, ...ausschnitt };
  }

  /** Fahrzeuge, Personen und Auftraege **einer** Einheit (M3.2). */
  untertabelle(ruf: Extract<Ruf, { art: "untertabelleAnfordern" }>): Untertabellenansicht {
    return {
      lageZeiger: this.#lageZeiger,
      einheitId: ruf.einheitId,
      ...projektion.untertabelle(this.#zustand, ruf.einheitId),
    };
  }

  /**
   * Das Einsatztagebuch (M3.3).
   *
   * Es laeuft ueber **alle** Ereignisse dieser Akte und nicht ueber den
   * Zustand — §5.9.1: Der Zustand haelt je Feld zwei Beobachtungen, das
   * Tagebuch braucht alle. Der Zustand kommt trotzdem mit, aber nur fuer die
   * Namen in den Saetzen.
   */
  tagebuch(ruf: Extract<Ruf, { art: "tagebuchAnfordern" }>): Tagebuchansicht {
    const ausschnitt = projektion.tagebuchausschnitt(
      this.#zustand,
      this.#ereignisse,
      {
        ...(ruf.einheitId === undefined ? {} : { einheitId: ruf.einheitId }),
        ...(ruf.abschnittId === undefined ? {} : { abschnittId: ruf.abschnittId }),
        ...(ruf.suche === undefined ? {} : { suche: ruf.suche }),
        ...(ruf.nurRuecknahmen === undefined ? {} : { nurRuecknahmen: ruf.nurRuecknahmen }),
      },
      ruf.von,
      ruf.anzahl,
    );
    return { lageZeiger: this.#lageZeiger, ...ausschnitt };
  }

  // -------------------------------------------------------------------------
  // Die Kernausgaben (M4.1)
  // -------------------------------------------------------------------------

  /**
   * Rendert eine Ausgabe als HTML — und schreibt sie nicht.
   *
   * Gerendert wird hier, weil der Zustand hier liegt; geschrieben wird
   * anderswo, weil der PDF-Weg die Bytes erst in der Schale bekommt
   * (`printToPDF`). Beide Wege gehen durch **dieselbe** Vorlage: Ein PDF, das
   * aus einer zweiten Vorlage entstuende, waere ein zweites Layout, das
   * niemand pflegt.
   *
   * Der Dateiname traegt den Stand in der Uhrzeit und nicht bloss „druck.pdf“:
   * Eine Fuehrungsstelle druckt im Einsatz mehrmals, und eine Datei, die sich
   * selbst ueberschreibt, nimmt ihr den Vergleich mit dem vorigen Ausdruck.
   */
  ausgabeHtml(ausgabe: "druck" | "status", organisation?: string): { dateiname: string; html: string } {
    const jetzt = new Date(this.#o.zeit());
    const kopf = {
      datum: this.#o.einsatzId.slice(0, 10),
      einsatzName: alsText(this.#zustand.einsatz?.name.wert),
      stand: `Stand: ${jetzt.toLocaleString("de-DE")}`,
    };
    const marke = dateimarke(jetzt);
    if (ausgabe === "status") {
      return { dateiname: `status_${marke}`, html: statusAlsHtml(statusdaten(this.#zustand), kopf) };
    }
    const daten = druckdaten(this.#zustand, organisation === undefined ? {} : { organisation });
    return { dateiname: `druck_${marke}`, html: druckAlsHtml(daten, kopf) };
  }

  /**
   * Schaltet den HTML-Monitor ein oder aus (M4.3).
   *
   * Beim Einschalten wird **sofort** geschrieben und nicht erst zum naechsten
   * Takt: Wer den Monitor einschaltet, geht danach zum zweiten Geraet, und
   * eine halbe Minute vor einer leeren Seite zu stehen waere die
   * unfreundlichste Art, den Schalter zu bestaetigen.
   */
  async monitorSchalten(
    an: boolean,
    optionen: { mitStatus?: boolean; organisation?: string } = {},
  ): Promise<string | null> {
    if (!an) {
      this.#monitor = undefined;
      return null;
    }
    this.#monitor = {
      mitStatus: optionen.mitStatus ?? false,
      ...(optionen.organisation === undefined ? {} : { organisation: optionen.organisation }),
    };
    this.#letzterMonitor = this.#o.zeit();
    return this.#schreibeMonitor();
  }

  /** `true`, solange der Monitor laeuft — fuer die Anzeige des Schalters. */
  get monitorLaeuft(): boolean {
    return this.#monitor !== undefined;
  }

  /**
   * Schreibt die Monitordatei — **auch dann, wenn sich nichts geaendert hat.**
   *
   * Das ist Absicht und dieselbe Ueberlegung wie beim Lagebild aus M2: Die
   * Seite laedt sich alle sechzig Sekunden neu; laedt sie und zeigt dasselbe
   * „Bild geschrieben“ wie vorher, ist das die Auskunft, dass der Schreiber
   * steht. Wuerde nur bei Aenderung geschrieben, waere ein toter Worker von
   * einer ruhigen Lage nicht zu unterscheiden — und genau das ist der Fehler,
   * den ein Monitor an der Wand am teuersten macht.
   *
   * Der Preis sind zwei kleine Schreibvorgaenge je Minute und Akte. Die
   * Datei ist ein abgeleiteter Anzeiger (§1.3) und geht ohne `fsync` heraus.
   */
  async #schreibeMonitor(): Promise<string> {
    const wahl = this.#monitor;
    if (wahl === undefined) throw new Error("Der Monitor ist nicht eingeschaltet.");
    const jetzt = new Date(this.#o.zeit());
    const html = monitorAlsHtml(
      this.#zustand,
      {
        datum: this.#o.einsatzId.slice(0, 10),
        einsatzName: alsText(this.#zustand.einsatz?.name.wert),
        stand: `Stand der Lage: ${this.#letzteWanduhr === "" ? "noch keine Meldung" : new Date(this.#letzteWanduhr).toLocaleString("de-DE")}`,
      },
      {
        mitStatus: wahl.mitStatus,
        // Der fachliche Stand ist der der juengsten Meldung; das
        // Lebenszeichen ist die Uhr dieses Rechners. Zwei Zeiten, und sie
        // werden nicht vermischt (§2.6).
        geschriebenUm: jetzt.toLocaleString("de-DE"),
        ...(wahl.organisation === undefined ? {} : { organisation: wahl.organisation }),
      },
    );
    return this.ausgabeSchreiben(MONITOR_DATEINAME, new TextEncoder().encode(html));
  }

  /**
   * Die Auswertung als XLSX (M4.2).
   *
   * Sie geht **nicht** durch {@link ausgabeHtml}: Sie ist keine Seite,
   * sondern eine Datei aus Bytes, und sie braucht keinen Umweg ueber die
   * Schale — anders als das PDF, fuer das es eine Rendering-Engine braucht.
   */
  auswertungXlsx(): { dateiname: string; bytes: Uint8Array } {
    const jetzt = new Date(this.#o.zeit());
    return {
      dateiname: `auswertung_${dateimarke(jetzt)}`,
      bytes: auswertungAlsXlsx(this.#zustand, {
        stand: `Stand: ${jetzt.toLocaleString("de-DE")}`,
        zeitpunkt: jetzt,
      }),
    };
  }

  /**
   * Der Oldenburger Block als XLSX (M4.2, Exportvariante).
   *
   * Derselbe Bestand wie die Auswertung, aber in der Spaltenordnung des
   * Blatts „Staerke" der Vorlage — zum Einfuegen in die gewohnte Excel. Wer
   * ihn erzeugt, uebergibt die Lage; er ist ein Ausgang und kein Umlauf, und
   * einen Rueckweg von dort gibt es nicht.
   */
  oldenburgXlsx(): { dateiname: string; bytes: Uint8Array } {
    const jetzt = new Date(this.#o.zeit());
    return {
      dateiname: `oldenburg_${dateimarke(jetzt)}`,
      bytes: oldenburgAlsXlsx(this.#zustand, {
        stand: `Stand: ${jetzt.toLocaleString("de-DE")}`,
        zeitpunkt: jetzt,
      }),
    };
  }

  /**
   * Schreibt Bytes in den Ordner `ausgaben\` des Einsatzes und liefert den Pfad.
   *
   * `schreibeUeberOhneSync` und nicht der Anhaenge-Weg aus §2.2: Eine Ausgabe
   * ist ein **abgeleiteter** Anzeiger wie die Praesenzdatei (§1.3) — sie
   * traegt keinen Zustand, den die Ereignisse nicht auch tragen, und ist
   * jederzeit neu erzeugbar. Ein `fsync` je Ausdruck kostete auf einem
   * SMB-Laufwerk Zeit fuer eine Zusicherung, die hier niemand braucht.
   */
  async ausgabeSchreiben(dateiname: string, bytes: Uint8Array): Promise<string> {
    const pfad = this.#o.ablage.ausgabeDatei(dateiname);
    await this.#o.dateisystem.legeVerzeichnisAn(this.#o.ablage.shareAusgaben);
    await this.#o.dateisystem.schreibeUeberOhneSync(pfad, bytes);
    return pfad;
  }

  // -------------------------------------------------------------------------
  // Der Handscanner-Weg (M3.4)
  // -------------------------------------------------------------------------

  /**
   * Nimmt einen gescannten Text auf.
   *
   * Ein Ruf je Scan: Der Handscanner tippt eine Zeichenkette und schliesst mit
   * Enter ab; die Maske schickt sie hierher und bekommt den Fortschritt
   * zurueck. Das ist ein Botschaftswechsel je Teil und damit vernachlaessigbar
   * — ein Bogen hat selten mehr als drei.
   */
  async eebScan(text: string): Promise<EebStand> {
    if (this.#o.kompressor === undefined) {
      return { art: "unlesbar", haben: 0, anzahl: 0, meldung: "Auf diesem Arbeitsplatz ist kein Entpacker eingerichtet." };
    }
    const vorheriger = this.#scanstand;
    const befund = nimmScan(vorheriger, text);
    if (befund.art === "unlesbar") {
      return { art: "unlesbar", haben: vorheriger.haben, anzahl: vorheriger.anzahl, meldung: befund.meldung };
    }
    this.#scanstand = befund.stand;
    if (befund.art !== "vollstaendig") {
      return { art: befund.art, haben: befund.stand.haben, anzahl: befund.stand.anzahl };
    }

    this.#scanPayload = befund.payload;
    this.#scanText = text;
    try {
      const bogen = await liesBogen(befund.payload, this.#o.kompressor);
      return {
        art: "vollstaendig",
        haben: befund.stand.haben,
        anzahl: befund.stand.anzahl,
        vorschau: this.#vorschau(bogen),
      };
    } catch (fehler) {
      // Der Payload liess sich nicht entpacken. Wie darauf zu reagieren ist,
      // haengt daran, **woher** er kam:
      //
      //  * Aus einem **Stapel** — dann sind die gesammelten Teile Truemmer,
      //    und der naechste Scan darf nicht auf ihnen aufsetzen.
      //  * Aus einem **einzelnen** Scan — dann war es ein anderer Code (ein
      //    Strichcode auf demselben Tisch, ein fremder QR). Der halbe Stapel,
      //    der daneben liegt, gehoert nicht dazu und bleibt stehen: Zehn
      //    Minuten Scanarbeit wegen eines Fehlgriffs zu verlieren waere die
      //    teurere Reaktion.
      const ausStapel = befund.stand.anzahl > 1;
      this.#scanPayload = undefined;
      this.#scanText = "";
      this.#scanstand = ausStapel ? LEERER_STAND : vorheriger;
      return {
        art: "unlesbar",
        haben: this.#scanstand.haben,
        anzahl: this.#scanstand.anzahl,
        meldung: `Der Scan enthält keinen lesbaren Erfassungsbogen: ${(fehler as Error).message}`,
      };
    }
  }

  /** Verwirft den Sammelstand — der Knopf „Von vorn“ der Maske. */
  eebZuruecksetzen(): EebStand {
    this.#scanstand = LEERER_STAND;
    this.#scanPayload = undefined;
    this.#scanText = "";
    return { art: "leer", haben: 0, anzahl: 0 };
  }

  /**
   * Uebernimmt den gescannten Bogen in einen Abschnitt.
   *
   * §5.8.2: Die uebernommenen Werte werden als **eigenstaendige** Ereignisse
   * geschrieben. Sie gehen einzeln in die Akte, und das ist keine Schwaeche:
   * Das Protokoll ist append-only, jedes Ereignis traegt seine eigene HLC, und
   * ein Client, der nur die Haelfte sieht, faltet den Rest, sobald er ihn
   * bekommt (§3.10). Bricht ein Schritt ab, bleibt das Geschriebene stehen —
   * die Meldung ist dann aufgenommen, die Einheit vielleicht noch nicht, und
   * genau das meldet der Ausgang.
   */
  async eebUebernehmen(abschnittId: string): Promise<Uebernahmeergebnis> {
    if (this.#o.kompressor === undefined || this.#scanPayload === undefined) {
      return { art: "nichtMoeglich", meldung: "Es liegt kein vollständig gescannter Bogen vor." };
    }
    const befund = await liesBogen(this.#scanPayload, this.#o.kompressor);
    const einheitId = `E-${befund.meldungId.slice(0, 12)}`;
    const entwuerfe = uebernahmeEntwuerfe(befund.bogen, befund.signatur, {
      meldungId: befund.meldungId,
      einheitId,
      abschnittId,
      // Die Ids der Personen und Fahrzeuge leiten sich aus der `meldungId`
      // ab und werden nicht gewuerfelt: Scannt ein zweiter Meldekopf denselben
      // Bogen, entstehen dieselben Ids — und §3.6 macht daraus eine
      // verworfene Zweitanlage statt einer Dublette.
      personIds: befund.bogen.personal.map((_, nummer) => `P-${befund.meldungId.slice(0, 10)}-${String(nummer)}`),
      fahrzeugIds: befund.bogen.fahrzeuge.map((_, nummer) => `F-${befund.meldungId.slice(0, 10)}-${String(nummer)}`),
      empfangenAm: this.#jetztText(),
      quelle: "SCAN",
      rohPayload: this.#scanText,
      einheitSchluessel: befund.meldungId,
    });

    let geschrieben = 0;
    for (const entwurf of entwuerfe) {
      const ergebnis = await this.bediene(entwurf);
      if (ergebnis.art !== "geschrieben") {
        return {
          art: "abgewiesen",
          meldung: ergebnis.art === "abgewiesen" ? ergebnis.meldung : JSON.stringify(ergebnis),
          beiEreignis: entwurf.typ,
        };
      }
      geschrieben += 1;
    }
    this.eebZuruecksetzen();
    return { art: "uebernommen", einheitId, ereignisse: geschrieben };
  }

  /** Was die Maske vor der Uebernahme zeigt — Klartext, keine Bytes. */
  #vorschau(befund: {
    readonly bogen: import("@bos/eeb-format").Erfassungsbogen;
    readonly signatur: import("@bos/eeb-format").SignaturStatus;
    readonly meldungId: string;
  }): EebVorschau {
    const uebersetzt = uebernahmeEntwuerfe(befund.bogen, befund.signatur, {
      meldungId: befund.meldungId,
      einheitId: "vorschau",
      abschnittId: "vorschau",
      empfangenAm: this.#jetztText(),
    });
    const einheit = (uebersetzt.find((e) => e.typ === "EinheitGemeldet")?.nutzlast ?? {}) as Record<string, unknown>;
    const hierarchie = (einheit["hierarchie"] ?? []) as { art?: string; name?: string }[];
    const signatur = befund.signatur;
    return {
      meldungId: befund.meldungId,
      bezeichnung: String(einheit["bezeichnung"] ?? ""),
      organisation: String(einheit["organisation"] ?? ""),
      herkunft: hierarchie.map((stufe) => `${stufe.art ?? ""} ${stufe.name ?? ""}`.trim()).join(" · "),
      ebene: String(einheit["ebene"] ?? ""),
      staerke: (einheit["staerke"] ?? { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 }) as EebVorschau["staerke"],
      personen: befund.bogen.personal.length,
      fahrzeuge: befund.bogen.fahrzeuge.length,
      stand: String(
        (uebersetzt.find((e) => e.typ === "EebMeldungEmpfangen")?.nutzlast["stand"] ?? "") as string,
      ),
      signatur: signatur.zustand === "gueltig" ? "gueltig" : signatur.zustand === "ungueltig" ? "ungueltig" : "unsigniert",
      ...(signatur.zustand === "unsigniert" ? {} : { signaturKurzform: signatur.kurzform }),
      ...(signatur.zustand === "gueltig" && signatur.absender?.name !== undefined
        ? { absender: signatur.absender.name }
        : {}),
      ...(typeof einheit["bemerkung"] === "string" ? { bemerkung: einheit["bemerkung"] } : {}),
    };
  }

  /** Der Stapel, wie die Oberflaeche ihn zeigt (§6 U3). */
  undoStapel(): readonly { id: string; typ: string; wanduhr: string }[] {
    return this.#stapel.eintraege.map((e) => ({ id: e.id, typ: e.typ, wanduhr: e.wanduhr }));
  }

  // -------------------------------------------------------------------------
  // Innenleben
  // -------------------------------------------------------------------------

  #uebernimmKennung(neue: string): void {
    this.#clientId = neue;
    this.#hlcUhr = new HlcUhr({ clientId: neue, wanduhr: this.#o.zeit });
    // Der Stapel wird **neu aufgebaut**, nicht umgeschrieben: Nach dem Wechsel
    // gehoeren die Zeilen der alten Kennung nicht mehr diesem Client (§4.5),
    // und ein Undo darauf faellt unter U3, Satz „keine fremden Ereignisse“.
    this.#stapel = new Undostapel(neue);
  }

  #melde(reaktion: Reaktion | undefined): void {
    if (reaktion === undefined) return;
    this.#o.sende({
      art: "hinweis",
      akteId: this.#o.akteId,
      stufe: reaktion.art === "repariert" || reaktion.art === "kennungGewechselt" ? "warnung" : "fehler",
      text: reaktion.meldung,
    });
  }

  #setzeShare(erreichbar: boolean, meldung?: string): void {
    this.#shareErreichbar = erreichbar;
    this.#shareMeldung = erreichbar ? undefined : meldung;
    if (erreichbar) this.#letzterShareKontakt = this.#jetztText();
  }

  #jetztText(): string {
    return new Date(this.#o.zeit()).toISOString();
  }

  /**
   * Nimmt gelesene oder selbst geschriebene Zeilen in die Faltung auf.
   *
   * Verwaltungsereignisse (§2.4) bleiben aussen vor: Sie gehoeren der
   * Speicherschicht und haben im Fachzustand nichts verloren.
   */
  #nimmAuf(zeilen: readonly { readonly rahmen: { readonly typ: string } }[]): void {
    const ereignisse: EingehendesEreignis[] = [];
    for (const zeile of zeilen) {
      if (istVerwaltungsereignis(zeile.rahmen.typ)) continue;
      ereignisse.push(zeile.rahmen as unknown as EingehendesEreignis);
    }
    if (ereignisse.length === 0) return;
    this.#ereignisse.push(...ereignisse);
    this.#lageZeiger += ereignisse.length;
    this.#faltung = falteHinzu(this.#faltung, ereignisse);
    this.#zustand = materialisiere(this.#faltung);
    this.#stapel.nimmAlleAuf(ereignisse);
    for (const ereignis of ereignisse) {
      if (this.#hoechsteHlc === undefined || vergleicheHlc(this.#hoechsteHlc, ereignis.hlc) < 0) {
        this.#hoechsteHlc = ereignis.hlc;
        this.#letzteWanduhr = ereignis.wanduhr;
      }
    }
  }

  /** Das Lagebild aus dem aktuellen Zustand — die einzige Stelle, die es baut. */
  #projiziere(): Lagebild {
    const zustand = this.#zustand;
    const gesamt = kennzahlen.einsatzGesamtstaerke(zustand).gesamt;
    const staerkeJeStatus: Record<string, number> = {};
    for (const [status, zeile] of Object.entries(kennzahlen.matrixStatus(zustand))) {
      staerkeJeStatus[status] = zeile.gesamt;
    }
    const oberster = this.#stapel.oberster();
    return {
      einsatzId: this.#o.einsatzId,
      einsatzName: alsText(zustand.einsatz?.name.wert),
      einsatzArt: alsText(zustand.einsatz?.art.wert),
      standHlc: this.#hoechsteHlc === undefined ? "" : hlcAlsText(this.#hoechsteHlc),
      standWanduhr: this.#letzteWanduhr,
      letzterShareKontakt: this.#letzterShareKontakt,
      shareErreichbar: this.#shareErreichbar,
      ...(this.#shareMeldung === undefined ? {} : { shareMeldung: this.#shareMeldung }),
      peers: this.#peers,
      unuebertrageneBytes: this.#unuebertrageneBytes(),
      quarantaene:
        this.#akte === undefined
          ? []
          : this.akte.leser.quarantaenen
              .filter((q) => !q.vorlaeufig)
              .map((q) => `${q.datei}@${String(q.offset)}`),
      abschnitte: Object.keys(zustand.abschnitte).length,
      einheiten: kennzahlen.einheitenDerLage(zustand).length,
      gesamtstaerke: gesamt,
      staerkeJeStatus,
      hinweise: zustand.hinweise.length,
      unbekannteEreignisse: zustand.unbekannt.length,
      undoTiefe: this.#stapel.eintraege.length,
      ...(oberster === undefined ? {} : { undoObersteArt: oberster.typ }),
      lageZeiger: this.#lageZeiger,
    };
  }

  /**
   * Eigene Bytes, die noch nicht auf dem Share liegen (§5.3) — **fuer das
   * laufende Segment**.
   *
   * Aeltere eigene Segmente bleiben aussen vor, und das ist kein Versehen: Ein
   * abgeschlossenes Segment holt die Spiegelung im naechsten Lauf nach, und die
   * Zahl in der Statuszeile beantwortet die Frage des Bedieners „ist meine
   * letzte Eingabe drueben?" Sie ueber alle je geschriebenen Dateien zu
   * bilden hiesse, in jedem Takt den ganzen lokalen Spiegel zu lesen — genau
   * das, was §6.2 dem Takt A erspart.
   */
  #unuebertrageneBytes(): number {
    if (this.#akte === undefined) return 0;
    const schluessel = `${clientPraefix(this.#clientId)}.${segmentText(this.akte.schreiber.segment)}`;
    const stand = this.akte.zustand.eigen[schluessel]?.shareOffset ?? 0;
    return Math.max(0, this.akte.schreiber.lokalerVollstaendigerOffset - stand);
  }

  /** Schickt ein Delta, wenn sich etwas geaendert hat — und sonst nichts. */
  #sendeDelta(): void {
    if (this.#geschlossen) return;
    const nachher = this.#projiziere();
    const delta = lagebildDelta(this.#gesendet, nachher);
    if (Object.keys(delta).length === 0) return;
    this.#gesendet = nachher;
    this.#folge += 1;
    this.#o.sende({ art: "stand", akteId: this.#o.akteId, folge: this.#folge, geaendert: delta });
  }
}

function alsText(wert: unknown): string {
  return typeof wert === "string" ? wert : "";
}

/**
 * Die Zeitmarke im Dateinamen einer Ausgabe: `2026-09-10_1430`.
 *
 * Ortszeit und keine Zone — der Dateiname wird von einem Menschen gelesen,
 * der neben dem Rechner steht, und nicht von einem Programm sortiert. Was
 * geordnet werden muss, steht im Manifest der Einsatzakte (M4.4).
 */
function dateimarke(zeitpunkt: Date): string {
  const zwei = (zahl: number): string => String(zahl).padStart(2, "0");
  return [
    zeitpunkt.getFullYear(),
    "-",
    zwei(zeitpunkt.getMonth() + 1),
    "-",
    zwei(zeitpunkt.getDate()),
    "_",
    zwei(zeitpunkt.getHours()),
    zwei(zeitpunkt.getMinutes()),
  ].join("");
}
