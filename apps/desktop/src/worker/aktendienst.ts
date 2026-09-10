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
  kompensationFuer,
  leereFaltung,
  materialisiere,
  vergleicheHlc,
  type Akteur,
  type EingehendesEreignis,
  type Faltung,
  type Hlc,
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

import {
  lagebildDelta,
  type Bedienergebnis,
  type Lagebild,
  type Mitteilung,
  type Peer,
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
}

export const TAKTE_VORBELEGUNG: Takte = {
  spiegelungMs: 1_000,
  taktAMs: 1_000,
  taktBMs: 4_000,
  praesenzMs: 15_000,
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

  /** Die hoechste gesehene HLC — der „Stand", den die Statuszeile nennt. */
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
    // clientId steht in jeder HLC (§3.2) und entscheidet, was „eigen" ist.
    if (akte.schreiber.clientId !== this.#clientId) this.#uebernimmKennung(akte.schreiber.clientId);

    this.#melde(ergebnis.reaktion);
    for (const weitere of ergebnis.weitereReaktionen ?? []) this.#melde(weitere);
    this.#nimmAuf(ergebnis.quarantaeneNachlauf.neueZeilen);

    // Der Oeffnungsbefund sagt bereits, ob der Share erreichbar war; ihn hier
    // zu setzen erspart der Statuszeile eine Sekunde „nicht erreichbar", die
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
   * „Letzte Aktion rueckgaengig" (§6 U3).
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
    // und ein Undo darauf faellt unter U3, Satz „keine fremden Ereignisse".
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
