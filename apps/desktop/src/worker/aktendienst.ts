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

import path from "node:path";

import {
  HlcUhr,
  KATALOG,
  grundPasst,
  Undostapel,
  obersteGruppe,
  falteHinzu,
  hlcAlsText,
  kennzahlen,
  LEERER_STAND,
  FOLD_VERSION,
  kompensationFuer,
  leereFaltung,
  liesBogen,
  nimmScan,
  boegenAusJsonTexten,
  boegenDerEinheiten,
  buendelAusMeldungen,
  einheitIdAus,
  liesBuendel,
  teilIdsAus,
  uebernahmeEntwuerfe,
  materialisiere,
  projektion,
  standText,
  vergleicheHlc,
  type Akteur,
  type EingehendesEreignis,
  type Faltung,
  type Hlc,
  type Nachrichtenzeile,
  type Sammelstand,
  type Zustand,
} from "@s1/domaene";
import {
  Akte,
  PRAESENZ_TAKT_MS,
  Praesenzbeobachtung,
  clientPraefix,
  entfernePraesenz,
  istVerwaltungsereignis,
  liesFremdePraesenz,
  liesLokaleHistorie,
  oeffneAkte,
  schreibePraesenz,
  segmentText,
  uhrAbweichungMs,
  type Dateisystem,
  type Einsatzablage,
  type Ereignisentwurf,
  type Oeffnungsergebnis,
  type Reaktion,
  type Zeitquelle,
} from "@s1/speicher";

import { encodePayloadUrl, type Kompressor } from "@bos/eeb-format";
import {
  MONITOR_DATEINAME,
  auswertungAlsXlsx,
  harkeAlsHtml,
  kostenAlsHtml,
  logAlsHtml,
  logFreiAlsXlsx,
  oldenburgAlsXlsx,
  druckAlsHtml,
  druckdaten,
  einheitenlisteAlsHtml,
  einheitenlistendaten,
  bildschirmtauglich,
  monitorAlsHtml,
  statusAlsHtml,
  statusdaten,
} from "@s1/ausgaben";

import {
  KONFLIKTHINWEISE_MAX,
  lagebildDelta,
  type Akteergebnis,
  type Baumansicht,
  type Anforderungsansicht,
  type Buendelergebnis,
  type Eingangskorbansicht,
  type Erfassungsbogenergebnis,
  type Vokabelkorrekturergebnis,
  type Fuestansicht,
  type Kostenansicht,
  type Versorgungsansicht,
  type Funkplanansicht,
  type Nachrichtenansicht,
  type Sitzungsstellen,
  type Staerketafelansicht,
  type Bedienergebnis,
  type Lagebild,
  type Mitteilung,
  type Peer,
  type Ruf,
  type Tabellenansicht,
  type Tagebuchansicht,
  type EebStand,
  type EebVorschau,
  type Entwurf,
  type Sammeluebernahme,
  type Uebernahmeergebnis,
  type Untertabellenansicht,
} from "../kontrakt/index.js";
import { einheitWiederhergestellt, verschiebung } from "../kontrakt/bedienschritte.js";
import { pruefeAnforderung } from "./anforderungspruefung.js";
import { dateimarke } from "./dateimarke.js";
import { LISTENAUSGABEN, funkplanausgabe, listenausgabe, nachweisungsausgabe, tagebuchHtml, type Listenausgabe } from "./listenausgaben.js";
import { funkFuerLagebild, funkplanansicht, tabellenauswahl } from "./funkplanprojektion.js";
import { gegenstandMitBetreff } from "./nachrichtengegenstand.js";
import { Undoanzeige, alsFolgeschritt, istGruppe, nimmGruppeZurueck, undoTiefe } from "./undogruppe.js";
import { abweichungshinweis, mitWegmarken } from "./wegmarken.js";
import { abschlussvermerkEntwurf, mitAbschlussangaben } from "./abschlussvermerk.js";
import {
  archivierungsentwurf,
  archivierungszeitFehler,
  erzeugeEinsatzakte,
  pruefeAbschluss,
} from "./einsatzabschluss.js";
import { pruefeAnlagenamen } from "./anlagenamenpruefung.js";
import { buendelUrsachen } from "./buendelablehnung.js";
import type { Nachrichtenfolgeumfeld } from "./nachrichtenfolgen.js";
import { planeFolgen, anwesendBereichshinweis } from "./schreibfolgen.js";
import { eigeneGespraechsnotiz, istNachtrag, mitSitzungsangaben, sichterSaeumig, vorbehaltsergebnis } from "./sitzungsangaben.js";
import type { Vorbehaltsumfeld } from "../kontrakt/stellenvorbehalt.js";
import { sichterBesetzt } from "../kontrakt/fmzschritte.js";
import { fernmelderBesetzt, ldfBesetzt, stelleBesetzt } from "../kontrakt/ldfschritte.js";
import { schreibhinweise } from "./schreibhinweise.js";
import { offeneVokabelkorrekturen, vokabelnKorrigieren } from "./vokabelkorrektur.js";
import { Bearbeitungssperren } from "./bearbeitungssperren.js";
import { pruefeVorwert } from "./vorwertpruefung.js";
import { pruefeGegenZustand } from "./zustandspruefung.js";
import { pruefeEinheitsteil } from "./einheitsteilpruefung.js";
import { pruefeVersorgung } from "./versorgungspruefung.js";
import { pruefeFunk } from "./funkpruefung.js";
import { legeFehlendeVordrucke, legeHandzeichenverzeichnisBei, legeNachweisungBei } from "./aktenbeilagen.js";
import {
  Vorrangwaechter,
  besetzteStellen,
  fernmelderwahlAusPraesenz,
  konflikthinweiseFuerLagebild,
  mitNachrichtenparametern,
  nachrichtenansicht,
  nachrichtenFuerLagebild,
  offeneNachrichtenTeil,
  peerStellen,
  sitzungAus,
} from "./nachrichtendienst.js";
import { pruefeNachricht, unbekannteNachricht } from "./nachrichtenpruefung.js";
import { Automatikdruck, type Automatikdruckeinstellung, type Druckauftrag } from "./automatikdruck.js";
import { ORDNER_NACHRICHTEN, vordruckDerNachricht } from "./nachrichtenvordruck.js";
import { Sichterstauwaechter } from "./sichterstau.js";
import { versorgungFuerLagebild, versorgungsansicht } from "./versorgungsprojektion.js";
import { VERSORGUNGSAUSGABEN, versorgungsausgabe, type Versorgungsausgabe } from "./versorgungsausgaben.js";

/**
 * Die Takte in Millisekunden (§6.2, §6.4, §5.4).
 *
 * Startwerte aus KONZEPT-SPEICHER.md §10; sie stehen hier als Vorbelegung und
 * nicht als Konstante, weil M0.5 sie am echten Geraet nachmisst und die Tests
 * sie herunterdrehen.
 */
/**
 * Die Ausgaben, die als HTML-Seite entstehen — und damit auch als PDF.
 *
 * Eine Liste an einer Stelle: Worker, Vermittlung und Auftragsweg lesen sie
 * von hier, damit eine neue Seite nicht an drei Orten nachgetragen wird.
 */
export type Seitenausgabe =
  | "druck"
  | "status"
  | "log"
  | "kosten"
  | "fueorg"
  | "einheitenliste"
  | "funkplan"
  | "nachweisung"
  | Listenausgabe
  | Versorgungsausgabe;

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
  praesenzMs: PRAESENZ_TAKT_MS,
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
  /**
   * Additiv (N3, Entscheidung 7): wohin ein Druckauftrag des Automatikdrucks
   * mit Ziel Drucker geht — im Worker an den Main, der allein Electron hat.
   * Fehlt er, gibt es nur das Ziel Verzeichnis.
   */
  readonly sendeDruck?: (auftrag: Druckauftrag) => void;
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

/** Holt eine entfernte Einheit zurueck und stellt sie in den Zielabschnitt. */
function wiederherstellung(einheitId: string, vonAbschnittId: string | null, nachAbschnittId: string): Entwurf[] {
  const zurueck = einheitWiederhergestellt(einheitId);
  if (vonAbschnittId === nachAbschnittId || vonAbschnittId === null) return [zurueck];
  return [zurueck, verschiebung(einheitId, vonAbschnittId, nachAbschnittId)];
}

/** Der Zwischenstand eines Massenimports — nur innerhalb des Workers. */
interface Sammellauf {
  uebernommen: number;
  ereignisse: number;
  readonly fehlgeschlagen: { bezeichnung: string; meldung: string }[];
  readonly aktualisiert: { bezeichnung: string; abschnitt: string }[];
  readonly wiederhergestellt: string[];
  fertig: number;
  readonly gesamt: number;
  naechster: EebStand | undefined;
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
  readonly #undoanzeige = new Undoanzeige();

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
  readonly #sperren = new Bearbeitungssperren();

  #gesendet: Lagebild;
  #folge = 0;
  #geschlossen = false;

  /**
   * Die Warteschlange der Schreibwege.
   *
   * Prüfung (Einsatzstatus, Bestand) und Schreiben liegen in einem
   * `await`-Abstand; ohne Reihenfolge liefen zwei Bedienschritte ineinander:
   * Eine Einheitenanlage, die kurz vor „Einsatz beenden“ geprüft wurde,
   * landete nach dem Ende noch im Einsatz. Jeder Schreibweg läuft deshalb
   * hintereinander, und jeder prüft gegen den Zustand, den der vorige schon
   * gefaltet hat. Mehrere Arbeitsplätze mit eigenem Worker schreiben je ein
   * eigenes Segment (append-only); dort greift der Fold (`nachArchivierungEingegangen`).
   */
  #schlange: Promise<unknown> = Promise.resolve();

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
  /** Woher der angezeigte Bogen kam — steht so in `EebMeldungEmpfangen`. */
  #scanQuelle: "SCAN" | "PDF_IMPORT" = "SCAN";
  /** Die Bezeichnung des angezeigten Bogens — fuer die Fehlerliste des Massenimports. */
  #scanBezeichnung = "";
  /** Gesetzt von {@link eebAbbrechen}; der Massenimport prueft es zwischen zwei Boegen. */
  #abbruchGewuenscht = false;
  /**
   * Die weiteren Boegen einer eingelesenen Datei, als Scan-Texte.
   *
   * Eine Sammel-PDF traegt viele Boegen, die Maske zeigt einen. Die uebrigen
   * warten hier in derselben Form, in der ein Handscanner sie lieferte — damit
   * gibt es hinter der Datei keinen zweiten Weg, sondern denselben.
   */
  #scanWartend: string[] = [];

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

  /**
   * Stellen und Handzeichen dieses Arbeitsplatzes für die Sitzung dieser Akte
   * (KONZEPT-NACHRICHTEN.md Entscheidung 3). Sie gehören zur Sitzung und
   * nicht zur Akte: Sie stehen in der Präsenz, im Lagebild und im Zuschnitt
   * des Blattes „Nachrichten", nie in einem Ereignis (§4: Stelle und
   * Handzeichen gehen in die Nutzlast der Ereignisse, die sie brauchen).
   * Fehlt, solange niemand sie angegeben hat.
   */
  #sitzung: Sitzungsstellen | undefined;
  /** Meldet eintreffende Nachrichten mit Vorrang für die Stellen der Sitzung (Entscheidung 6). */
  readonly #vorrang = new Vorrangwaechter();
  /** Druckt jede eintreffende Nachricht, wenn ein Ziel gesetzt ist (N3, Entscheidung 7). */
  readonly #automatik: Automatikdruck;
  /** Meldet der FmZ den Stau vor dem Sichter, wenn keiner besetzt ist (Sichter P1-4). */
  readonly #sichterstau = new Sichterstauwaechter();
  /** ETB-Nummern und Rückzugsgründe, gemerkt je Lagezeiger (ETB P1-2, P1-3). */
  #bezugGemerkt: { readonly zeiger: number; readonly bezug: projektion.Tagebuchbezug } | undefined;
  /** Die Stelle ist abgegeben (Sichter P1-4): Die Präsenz trägt `abgemeldet`, bis `stellenSetzen` sie wieder setzt. */
  #abgemeldet = false;

  constructor(optionen: AktendienstOptionen) {
    this.#o = optionen;
    this.#automatik = new Automatikdruck({
      akteId: optionen.akteId,
      dateisystem: optionen.dateisystem,
      sende: (mitteilung) => optionen.sende(mitteilung),
      sendeDruck: optionen.sendeDruck,
      // FM P2-11, ETB P1-2: Ersatzordner statt stillem Anlegen, ETB-Nummern für Feld 20.
      ersatzOrdner: path.join(optionen.ablage.shareAusgaben, ORDNER_NACHRICHTEN),
      bezug: () => this.#tagebuchbezug(),
    });
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

  /** Der Einsatz dieser Akte — der Ordnername auf dem Share. */
  get einsatzId(): string {
    return this.#o.einsatzId;
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

    // **Die Wiederaufnahme, vor allem anderen.** Der Leser liest fremde
    // Dateien ab seinem gemerkten `leseOffset` (§6.2) und eigene gar nicht
    // (§5.4.1), und beide Offsets ueberstehen den Neustart in
    // `upload-state.json`. Ohne diesen Aufruf bliebe die Faltung nach jedem
    // Programmstart leer, bis jemand etwas Neues schreibt — der Einsatz saehe
    // aus, als haette er nie stattgefunden. Die Quelle ist der lokale Spiegel,
    // aus dem §5.3 die Identitaeten und §4.4 den Undo-Stapel ohnehin beim
    // Oeffnen aufbaut.
    const historie = await liesLokaleHistorie(this.#o.dateisystem, this.#o.ablage);
    this.#nimmAuf(historie.zeilen);
    for (const fehler of historie.lesefehler) {
      this.#o.sende({
        art: "hinweis",
        akteId: this.#o.akteId,
        stufe: "warnung",
        text: `Beim Wiederaufnehmen war ${fehler.datei} nicht vollständig lesbar (${fehler.code}). Was auf dem Share liegt, wird nachgeholt.`,
      });
    }

    // §3.2: Die HLC-Uhr faengt nach einem Neustart bei der Wanduhr an. Was die
    // Wiederaufnahme mitbringt, ist ihr deshalb nicht bekannt — ein Peer, der
    // vor dem Neustart voraus war, waere es aus Sicht dieses Clients nicht
    // mehr, und das naechste eigene Ereignis sortierte unter seines. Der
    // hoechste wiederaufgenommene Stand geht darum durch `empfangen`, genau
    // wie beim Lesen im Takt.
    if (this.#hoechsteHlc !== undefined) this.#hlcUhr.empfangen(this.#hoechsteHlc);

    this.#nimmAuf(ergebnis.quarantaeneNachlauf.neueZeilen);

    // Der Oeffnungsbefund sagt bereits, ob der Share erreichbar war; ihn hier
    // zu setzen erspart der Statuszeile eine Sekunde „nicht erreichbar“, die
    // nicht stimmt.
    this.#shareErreichbar = ergebnis.reaktion?.art !== "shareNichtErreichbar";
    if (this.#shareErreichbar) this.#letzterShareKontakt = this.#jetztText();

    // Was beim Öffnen schon da war, ist kein Eintreffen (Entscheidung 6).
    this.#vorrang.grundlinie(this.#zustand, this.#sitzung?.stellen ?? []);
    this.#automatik.grundlinie(this.#zustand, this.#sitzung?.stellen ?? []);

    this.#folge = 0;
    this.#gesendet = this.#projiziere();
    this.#o.sende({ art: "stand", akteId: this.#o.akteId, folge: 0, voll: this.#gesendet });
    return ergebnis;
  }

  /**
   * Setzt Stelle und Handzeichen der Sitzung (Entscheidung 3) — beim Öffnen
   * vor dem ersten Lagebild, danach aus dem Fenstermenü. Die Präsenz wird im
   * nächsten Takt geschrieben, damit die Kollegen die besetzten Stellen
   * sehen. Was für die neuen Stellen schon vorliegt, meldet sich nicht als
   * Vorrang: Es ist nicht eingetroffen, man hat nur die Stelle gewechselt.
   */
  stellenSetzen(stellen: readonly string[] | undefined, handzeichen: string | undefined): void {
    this.#sitzung = sitzungAus(stellen, handzeichen);
    this.#abgemeldet = false;
    this.#letztePraesenz = Number.NEGATIVE_INFINITY;
    // Vor dem Öffnen setzt `oeffne` die Grundlinie nach der Wiederaufnahme;
    // hier gesetzt, meldete die Wiederaufnahme jede alte Vorrangnachricht.
    if (this.#akte === undefined) return;
    this.#vorrang.grundlinie(this.#zustand, this.#sitzung.stellen);
    this.#automatik.grundlinie(this.#zustand, this.#sitzung.stellen);
    this.#sendeDelta();
  }

  /**
   * Setzt das Ziel des Automatikdrucks (N3, Entscheidung 7) — der Main schickt
   * es beim Öffnen und nach jeder Änderung der Einstellungen; `undefined`
   * schaltet ihn aus.
   */
  automatikdruckSetzen(einstellung: Automatikdruckeinstellung | undefined): void {
    const offen = this.#akte === undefined ? undefined : { zustand: this.#zustand, stellen: this.#sitzung?.stellen ?? [] };
    this.#automatik.setze(einstellung, offen);
  }

  /** Wartet auf die angestoßenen Ausdrucke des Automatikdrucks — für die Nachweise. */
  automatikdruckFertig(): Promise<void> {
    return this.#automatik.fertig();
  }

  /**
   * Setzt, verlängert oder gibt eine Bearbeitungssperre frei (`frei`). Die
   * Präsenz wird beim nächsten Takt sofort geschrieben, damit die Kollegen die
   * Änderung nach höchstens einem eigenen Präsenztakt sehen.
   */
  sperre(entitaetId: string, frei: boolean): void {
    const jetzt = this.#o.zeit();
    const geaendert = frei ? this.#sperren.gib(entitaetId) : this.#sperren.setze(entitaetId, jetzt);
    if (geaendert) this.#letztePraesenz = Number.NEGATIVE_INFINITY;
  }

  /**
   * Die Stelle abgeben (Sichter P1-4, ETB P3-3): Stellen und Handzeichen der
   * Sitzung fallen weg, und die Präsenz steht **sofort** mit `abgemeldet`
   * auf dem Share — nicht erst nach dem Verfall von rund zwei Minuten. Ein
   * Sichter-Arbeitsplatz, der schließt, gilt damit gleich als nicht besetzt,
   * und der Ersatzsichter der FmZ greift. `stellenSetzen` hebt es wieder auf.
   */
  async stelleAbgeben(): Promise<void> {
    this.#sitzung = undefined;
    this.#abgemeldet = true;
    if (this.#akte === undefined) return;
    this.#letztePraesenz = this.#o.zeit();
    await this.#praesenz();
    this.#sendeDelta();
  }

  /** Der Arbeitsplatz geht fort: Stelle abgeben, dann eigene Präsenzdatei weg, damit Kollegen ihn nicht mehr zählen. */
  async meldeAb(): Promise<void> {
    // Erst abgemeldet schreiben: Scheitert das Löschen am Share (SMB), steht
    // wenigstens keine Stelle mehr darin (Sichter P1-4).
    try {
      await this.stelleAbgeben();
    } catch {
      // Best effort wie das Löschen selbst.
    }
    await entfernePraesenz({
      dateisystem: this.#o.dateisystem,
      zeit: this.#o.zeit,
      ablage: this.#o.ablage,
      clientId: this.#clientId,
      anzeigename: this.#o.anzeigename,
      rechnername: this.#o.rechnername,
      programmversion: this.#o.programmversion,
    });
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
    this.#meldeSichterstau(jetzt);
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
      ...(this.#sitzung === undefined ? {} : { stellen: this.#sitzung.stellen }),
      ...(this.#sitzung?.handzeichen === undefined ? {} : { handzeichen: this.#sitzung.handzeichen }),
      ...(this.#abgemeldet ? { abgemeldet: true } : {}),
      foldVersion: FOLD_VERSION,
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
        this.#sperren.aktive(this.#o.zeit()),
      );
      this.#peers = (await liesFremdePraesenz(praesenzOptionen, this.#praesenzbeobachtung)).map(
        (fremd) => {
          // §6.4: Die Praesenzdatei traegt Segment und Offset des anderen
          // Platzes. Danebengestellt, wie weit **wir** seine laufende Datei
          // gelesen haben — die Differenz ist die Auskunft der
          // Diagnoseansicht (M7.3). Steht sie still, waehrend er schreibt,
          // kommt der Share nicht durch.
          const schluessel = `${clientPraefix(fremd.praesenz.clientId)}.${segmentText(fremd.praesenz.segment)}`;
          const gelesen = this.#akte === undefined ? 0 : (this.akte.zustand.fremd[schluessel]?.leseOffset ?? 0);
          // §2.6: Die Abweichung ordnet nichts; sie erklaert Anzeigen und die
          // Schwellen aus §2.5. Vorzeichenbehaftet, weil „geht vor" und „geht
          // nach" verschiedene Ursachen haben.
          return {
            clientId: fremd.praesenz.clientId,
            anzeigename: fremd.praesenz.anzeigename,
            rechnername: fremd.praesenz.rechnername,
            // Sichter P3-4: Wer seine Stelle abgegeben hat, zählt sofort nicht mehr mit.
            veraltet: fremd.veraltet || fremd.praesenz.abgemeldet === true,
            ...(fremd.praesenz.abgemeldet === true ? { abgemeldet: true } : {}),
            wanduhr: fremd.praesenz.wanduhr,
            programmversion: fremd.praesenz.programmversion,
            ...(typeof fremd.praesenz.foldVersion === "number" ? { foldVersion: fremd.praesenz.foldVersion } : {}),
            segment: fremd.praesenz.segment,
            offset: fremd.praesenz.offset,
            gelesenerOffset: gelesen,
            uhrAbweichungMs: uhrAbweichungMs(
              fremd,
              this.#praesenzbeobachtung.gesehenSeit(fremd.praesenz.clientId),
            ),
            quarantaene: fremd.praesenz.quarantaene?.length ?? 0,
            ...(fremd.veraltet || fremd.praesenz.bearbeitet === undefined ? {} : { bearbeitet: fremd.praesenz.bearbeitet }),
            ...(fremd.praesenz.abgemeldet === true ? {} : peerStellen(fremd.praesenz)),
          };
        },
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

  /** Ein fachlicher Bedienschritt (§5.2) — in der Reihenfolge des Eintreffens. */
  bediene(entwurf: Ereignisentwurf): Promise<Bedienergebnis> {
    return this.#hintereinander(() => this.#bedieneMitFolgen(entwurf));
  }

  /** Führt `arbeit` aus, sobald alle früher angenommenen Schreibwege fertig sind. */
  #hintereinander<T>(arbeit: () => Promise<T>): Promise<T> {
    const lauf = this.#schlange.then(arbeit, arbeit);
    this.#schlange = lauf.catch(() => undefined);
    return lauf;
  }

  /** Schreibt den Entwurf, dann seine Folgeschritte; das Ergebnis trägt die Hinweise. */
  async #bedieneMitFolgen(roh: Ereignisentwurf): Promise<Bedienergebnis> {
    // Runde 2 der Nachrichten-Audits: Stellenvorbehalt als grund-Pflicht, Stelle der
    // Sitzung in der Nutzlast, Ersatzsichter- und Nachtragsgrund (`sitzungsangaben.ts`).
    const sitzungsumfeld = this.#vorbehaltsumfeld(roh);
    const vorbehalt = vorbehaltsergebnis(roh, sitzungsumfeld);
    if (vorbehalt !== undefined) return vorbehalt;
    const nachtrag = istNachtrag(roh);
    // R2-LdF P2-1, P2-2: Beförderung ohne Vorschlag des besetzten LdF oder abweichend davon — Marke in der Nutzlast.
    const ldf = ldfBesetzt(this.#sitzung?.stellen, this.#peers);
    const entwurf = mitAbschlussangaben(mitWegmarken(this.#zustand, mitSitzungsangaben(roh, sitzungsumfeld, nachtrag), ldf), this.#sitzung);
    const plan = planeFolgen(this.#zustand, entwurf, this.#folgeumfeld());
    // R2-LdF P2-7, R2-ETB P2-2: die offenen Nachrichten ins Tagebuch, unmittelbar vor dem Einsatzende.
    const vorschritt = await this.#schreibeAbschlussvermerk(entwurf);
    const ergebnis = await this.#schreibe(entwurf);
    if (ergebnis.art !== "geschrieben") return ergebnis;
    const vorab = [...vorschritt, ...plan.hinweise, ...[abweichungshinweis(entwurf)].filter((t): t is string => t !== undefined)];
    // R2-LdF P2-8: Folgeschritte tragen den Hauptschritt (`folgeVon`), „Rückgängig“ nimmt sie mit ihm zurück.
    const alsFolge = <T extends Ereignisentwurf>(e: T): T => alsFolgeschritt(e, entwurf, ergebnis.ereignisId);
    for (const geplant of plan.folgen) {
      const folge = { ...geplant, entwurf: alsFolge(mitWegmarken(this.#zustand, mitSitzungsangaben(geplant.entwurf, sitzungsumfeld, nachtrag), ldf)) };
      // Fernmelder P2-9: Die Beförderung des Papier-Nachtrags plant ihre eigenen Folgen gegen den jetzt geltenden Zustand.
      const nachplan = folge.mitFolgen === true ? planeFolgen(this.#zustand, folge.entwurf, this.#folgeumfeld()) : undefined;
      const folgeErgebnis = await this.#schreibe(folge.entwurf);
      // Review Runde 2: Ein Folgeschritt ohne eigenen Satz (sein Nachfolger sagt es) meldet nichts.
      if (folgeErgebnis.art !== "geschrieben" || folge.hinweis !== "") vorab.push(folgeErgebnis.art === "geschrieben" ? folge.hinweis : `Folgeschritt nicht möglich: ${this.#meldungVon(folgeErgebnis)}`);
      if (folgeErgebnis.art !== "geschrieben" || nachplan === undefined) continue;
      vorab.push(...nachplan.hinweise);
      for (const weitere of nachplan.folgen) {
        const ergebnisWeitere = await this.#schreibe(alsFolge(mitSitzungsangaben(weitere.entwurf, sitzungsumfeld, nachtrag)));
        vorab.push(ergebnisWeitere.art === "geschrieben" ? weitere.hinweis : `Folgeschritt nicht möglich: ${this.#meldungVon(ergebnisWeitere)}`);
      }
    }
    const bereich = anwesendBereichshinweis(this.#zustand, entwurf);
    if (bereich !== undefined) vorab.push(bereich);
    return { ...ergebnis, ...schreibhinweise(this.#zustand, entwurf, vorab) };
  }

  /** Der Abschlussvermerk vor `EinsatzBeendet` (`abschlussvermerk.ts`) — nur, wenn das Einsatzende die Prüfung besteht. */
  async #schreibeAbschlussvermerk(entwurf: Ereignisentwurf): Promise<readonly string[]> {
    if (entwurf.typ !== "EinsatzBeendet" || pruefeAbschluss(this.#zustand, entwurf) !== undefined) return [];
    const vermerk = abschlussvermerkEntwurf(this.#zustand, entwurf, this.#sitzung);
    if (vermerk === undefined) return [];
    const ergebnis = await this.#schreibe(vermerk);
    return ergebnis.art === "geschrieben" ? ["Offene Nachrichten im Tagebuch vermerkt."] : [`Vermerk der offenen Nachrichten nicht möglich: ${this.#meldungVon(ergebnis)}`];
  }

  /** Stellen der Sitzung und Sichter in der Präsenz für den Stellenvorbehalt; ohne Sitzung keiner. */
  #vorbehaltsumfeld(entwurf: Ereignisentwurf): Vorbehaltsumfeld | undefined {
    if (this.#sitzung === undefined) return undefined;
    return {
      stellen: this.#sitzung.stellen,
      sichterBesetzt: sichterBesetzt(this.#sitzung.stellen, this.#peers),
      eigeneGespraechsnotiz: eigeneGespraechsnotiz(this.#zustand, entwurf, this.#clientId),
      // Additiv (R2-FM P2-5): über der Schwelle des Vorrangs gilt die Ersatzregel auch bei besetztem Sichter.
      sichterSaeumig: sichterSaeumig(this.#zustand, entwurf, this.#o.zeit()),
      // Additiv (ETB P1-7): das Handzeichen für Erledigung und Zurückziehen.
      ...(this.#sitzung.handzeichen === undefined ? {} : { handzeichen: this.#sitzung.handzeichen }),
    };
  }

  /** Was die Folgeplanung über die Präsenz wissen muss. */
  #folgeumfeld(): Nachrichtenfolgeumfeld {
    return {
      // Additiv (R2-FaBe P0-3, R2-LdF P1-3): FmZ für den Hinweis beim Aufgeben, die Stellen der Sitzung für die Ersatzregel.
      fmzBesetzt: fernmelderBesetzt(this.#sitzung?.stellen, this.#peers),
      stellen: this.#sitzung?.stellen ?? [],
      sichterBesetzt: sichterBesetzt(this.#sitzung?.stellen, this.#peers),
      // Additiv (2026-11-17): LdF für die Ersatzregel, S2 für den Hinweis zur roten Kopie.
      ldfBesetzt: ldfBesetzt(this.#sitzung?.stellen, this.#peers),
      s2Besetzt: stelleBesetzt("S2", this.#sitzung?.stellen, this.#peers),
      // Additiv (R2-SGL P2-1): die Uhr für die Prüfung des Papier-Nachtrags.
      jetztMs: this.#o.zeit(),
    };
  }

  #meldungVon(ergebnis: Bedienergebnis): string {
    return "meldung" in ergebnis ? ergebnis.meldung : "nicht möglich.";
  }

  /** Prüft und schreibt einen einzelnen Entwurf — ohne Folgeschritte. */
  async #schreibe(entwurf: Ereignisentwurf): Promise<Bedienergebnis> {
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
    // Ein beendeter oder archivierter Einsatz nimmt nichts mehr an — vor
    // allen anderen Prüfungen, damit die Meldung den Grund nennt, der zählt.
    const gesperrt = pruefeAbschluss(this.#zustand, entwurf);
    if (gesperrt !== undefined) return gesperrt;
    // Review Runde 2: kein Schritt auf eine Nachricht, die es nicht gibt.
    const unbekannt = unbekannteNachricht(this.#zustand, entwurf);
    if (unbekannt !== undefined) return { art: "abgewiesen", meldung: unbekannt, code: "NACHRICHT", dauerhafterHinweis: false };
    // Bestand und Funkzeit gegen den Zustand (Aufteilen darf nicht mehr
    // abziehen, als da ist).
    const unstimmig = pruefeGegenZustand(this.#zustand, entwurf, this.#o.zeit());
    if (unstimmig !== undefined) return unstimmig;
    // Optimistische Prüfung auf Verlangen: nicht still über einen fremden neueren Wert schreiben.
    const veraendert = pruefeVorwert(this.#zustand, entwurf, {
      eigeneClientId: this.#clientId,
      nameVon: (id) => this.#peers.find((p) => p.clientId === id)?.anzeigename,
    });
    if (veraendert !== undefined) return veraendert;
    // §2.4: Der Grund ist bei manchen Arten Pflicht, und die Regel steht im
    // Katalog — dieselbe, die auch der Fold anwendet. Ohne diese Pruefung
    // naehme der Dienst den Bedienschritt an, schriebe ihn in ein
    // append-only-Protokoll und wuerfe ihn beim naechsten Falten als
    // `unbekannt` weg (§3.7 Regel 4): Der Bediener saehe „geschrieben" und
    // keine Wirkung.
    if (!grundPasst(eintrag, entwurf)) {
      return {
        art: "abgewiesen",
        meldung: `${entwurf.typ} braucht einen Grund (§2.4).`,
        code: "GRUND",
        dauerhafterHinweis: false,
      };
    }
    const neuFehler = pruefeNeu(entwurf);
    if (neuFehler !== undefined) {
      return { art: "abgewiesen", meldung: neuFehler, code: "SCHEMA", dauerhafterHinweis: false };
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
  zurueck(grund?: string): Promise<Bedienergebnis> {
    return this.#hintereinander(() => this.#nimmZurueck(grund));
  }

  async #nimmZurueck(grund?: string): Promise<Bedienergebnis> {
    const oberster = this.#stapel.oberster();
    if (oberster === undefined) {
      return { art: "nichtMoeglich", meldung: "Es ist nichts zurückzunehmen." };
    }
    // R2-LdF P2-8, R2-FM P3-1: ein Bedienschritt mit Folgeschritten als Ganzes, neuestes zuerst.
    const gruppe = obersteGruppe(this.#stapel.eintraege);
    if (istGruppe(gruppe)) {
      return nimmGruppeZurueck(gruppe, { zustand: () => this.#zustand, schreibe: (e) => this.#bedieneMitFolgen(e), ereignis: (id) => this.#ereignisNach(id) }, grund);
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
    return this.#bedieneMitFolgen(kompensation.entwurf);
  }

  /**
   * Archiviert den Einsatz — mit dem Beleg, den nur der Worker bilden kann
   * (`einsatzabschluss.ts`). Ob archiviert werden darf, entscheidet dieselbe
   * Prüfung wie bei jedem Bedienschritt.
   */
  archiviere(zeitpunkt: string): Promise<Bedienergebnis> {
    const fehler = archivierungszeitFehler(zeitpunkt);
    if (fehler !== undefined) return Promise.resolve(fehler);
    return this.#hintereinander(() =>
      this.#bedieneMitFolgen(archivierungsentwurf(this.#zustand, this.#o.einsatzId, zeitpunkt)),
    );
  }

  /**
   * Erzeugt die Einsatzakte (M4.4) im Ordner des Einsatzes auf dem Share.
   *
   * Vorher wird gespiegelt: Gepackt wird der Share, und eigene Zeilen, die
   * noch im lokalen Spiegel stehen, fehlten sonst in der Akte. Scheitert die
   * Spiegelung, wird trotzdem gepackt — die Zahl der Ereignisse im Ergebnis
   * zeigt, was drin ist. Die Akte geht auch bei einem archivierten Einsatz:
   * Lesen ist nie gesperrt.
   */
  async erzeugeAkte(): Promise<Akteergebnis> {
    await this.#spiegle();
    await this.#legeTagebuchInDieAkte();
    // ETB P1-5: Vordrucke, die fehlen, und die Nachweisung kommen vor dem Packen dazu.
    const beilagen = await this.#legeNachrichtenInDieAkte();
    const akte = await erzeugeEinsatzakte(this.#o.dateisystem, this.#o.ablage.share, this.#o.einsatzId, new Date(this.#o.zeit()));
    return beilagen === undefined ? akte : { ...akte, nachrichtenbeilagen: beilagen };
  }

  /** Vordruck-PDFs und Nachweisung (`aktenbeilagen.ts`); `undefined` ohne Nachrichten. */
  async #legeNachrichtenInDieAkte(): Promise<Akteergebnis["nachrichtenbeilagen"]> {
    if (this.#zustand.nachrichten === undefined || Object.keys(this.#zustand.nachrichten).length === 0) return undefined;
    const ziel = { dateisystem: this.#o.dateisystem, ausgabenordner: this.#o.ablage.shareAusgaben };
    const jetzt = new Date(this.#o.zeit());
    const kopf = {
      datum: this.#o.einsatzId.slice(0, 10),
      einsatzName: alsText(this.#zustand.einsatz?.name.wert),
      stand: `Stand: ${standText(jetzt)}`,
      // R2-ETB P3-2: die Programmfassung im Druckkopf.
      programmversion: this.#o.programmversion,
      erstelltVon: this.#erstellerText(),
    };
    const vordrucke = await legeFehlendeVordrucke(ziel, this.#zustand, this.#tagebuchbezug());
    const nachweisung = await legeNachweisungBei(ziel, this.#zustand, kopf, dateimarke(jetzt), this.#ereignisse);
    // R2-ETB P2-7: Handzeichen → Arbeitsplatz und Stelle, damit die Zeichen der Akte zurückführbar bleiben.
    const handzeichen = await legeHandzeichenverzeichnisBei(ziel, kopf, dateimarke(jetzt), this.#ereignisse);
    return { ...vordrucke, fehlgeschlagen: vordrucke.fehlgeschlagen + (nachweisung ? 0 : 1) + (handzeichen ? 0 : 1), handzeichenverzeichnis: handzeichen };
  }

  /**
   * Legt das lesbare Tagebuch (HTML) in `ausgaben/`, bevor die Akte gepackt
   * wird — so liegt neben den Rohereignissen eine Fassung, die man ohne
   * Programm im Browser lesen kann. Scheitert das Schreiben, entsteht die
   * Akte trotzdem: Das Tagebuch ist Zugabe, nicht Voraussetzung.
   */
  async #legeTagebuchInDieAkte(): Promise<void> {
    try {
      const jetzt = new Date(this.#o.zeit());
      const kopf = {
        datum: this.#o.einsatzId.slice(0, 10),
        einsatzName: alsText(this.#zustand.einsatz?.name.wert),
        stand: `Stand: ${standText(jetzt)}`,
        // R2-ETB P3-2: die Programmfassung im Druckkopf.
        programmversion: this.#o.programmversion,
      };
      const html = bildschirmtauglich(tagebuchHtml(this.#zustand, this.#ereignisse, kopf));
      await this.ausgabeSchreiben(`tagebuch_${dateimarke(jetzt)}.html`, new TextEncoder().encode(html));
    } catch {
      // Zugabe: kein Grund, die Akte zu verweigern.
    }
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

  /**
   * Die Kostenuebersicht (M5.2) — **ohne** Ausschnitt.
   *
   * Sie ist eine Abrechnung, und eine Abrechnung mit der ersten Seite waere
   * keine. Bei 150 Einheiten sind es 150 Zeilen mit je acht Zahlen; das traegt
   * ein Ruf, und geholt wird sie ohnehin nur, wenn jemand sie aufschlaegt
   * (M3.7).
   */
  kosten(): Kostenansicht {
    return { lageZeiger: this.#lageZeiger, blatt: projektion.kostenblatt(this.#zustand) };
  }

  /** Das Blatt „Versorgung" (S4.1) — gerechnet für die Uhr dieses Workers. */
  versorgung(ruf: Extract<Ruf, { art: "versorgungAnfordern" }>): Versorgungsansicht {
    return versorgungsansicht(this.#zustand, ruf, this.#o.zeit(), this.#lageZeiger);
  }

  /** Das Blatt „Funkplan" (KONZEPT-FUNKPLAN.md §5), mit Suche zugeschnitten und gegen die Uhr dieses Workers gerechnet. */
  funkplan(ruf: Extract<Ruf, { art: "funkplanAnfordern" }>): Funkplanansicht {
    return funkplanansicht(this.#zustand, ruf, { lageZeiger: this.#lageZeiger, jetztMs: this.#o.zeit(), ereignisse: this.#ereignisse });
  }

  /** Das Blatt „Nachrichten" (KONZEPT-NACHRICHTEN.md §6), zugeschnitten auf die Stellen der Anfrage oder der Sitzung. */
  nachrichten(ruf: Extract<Ruf, { art: "nachrichtenAnfordern" }>): Nachrichtenansicht {
    return nachrichtenansicht(this.#zustand, ruf, {
      lageZeiger: this.#lageZeiger,
      jetztMs: this.#o.zeit(),
      clientId: this.#clientId,
      sitzung: this.#sitzung,
      sichterBesetzt: sichterBesetzt(this.#sitzung?.stellen, this.#peers),
      bezug: this.#tagebuchbezug(),
      // Additiv (R2-LdF P3-3, P3-4): LdF besetzt? und die Fernmelder aus der Präsenz.
      ldfBesetzt: ldfBesetzt(this.#sitzung?.stellen, this.#peers),
      fernmelder: fernmelderwahlAusPraesenz(this.#sitzung?.stellen, this.#o.anzeigename, this.#peers),
    });
  }

  /**
   * Eine einzelne Nachricht (ETB P0-1): „Nachricht öffnen" an der
   * Tagebuchzeile holt sie über die Kennung, nicht über eine Suche.
   */
  nachricht(nachrichtId: string): Nachrichtenzeile | null {
    const zeile = projektion.nachrichtNach(this.#zustand, nachrichtId, new Date(this.#o.zeit()).toISOString());
    // ETB P1-2, P1-3: mit ETB-Nummer und Grund des Zurückziehens für die Nachrichtenansicht.
    return zeile === undefined ? null : (projektion.mitTagebuchbezug([zeile], this.#tagebuchbezug())[0] ?? zeile);
  }

  /** Die Stärketafeln des Sachgebiets 1 (Monitor: Abschnitte, Organisationen). */
  staerketafel(): Staerketafelansicht {
    return { lageZeiger: this.#lageZeiger, tafel: projektion.staerketafel(this.#zustand) };
  }

  /**
   * Die Anforderungsliste (M5.3), gefiltert und auf den Ausschnitt beschnitten.
   *
   * Der **abgeleitete** Zustand je Anforderung kommt aus dem Fold (§5.6.2) und
   * wird hier nur weitergereicht. Ein zweiter Ableitungspfad waere genau die
   * zweite Wahrheit, die P6 ausschliesst.
   */
  anforderungen(ruf: Extract<Ruf, { art: "anforderungenAnfordern" }>): Anforderungsansicht {
    const ausschnitt = projektion.anforderungsliste(this.#zustand, {
      ...(ruf.zustaende === undefined ? {} : { zustaende: ruf.zustaende }),
      ...(ruf.suche === undefined ? {} : { suche: ruf.suche }),
      ...(ruf.von === undefined ? {} : { von: ruf.von }),
      ...(ruf.anzahl === undefined ? {} : { anzahl: ruf.anzahl }),
    });
    return { lageZeiger: this.#lageZeiger, ...ausschnitt };
  }

  /**
   * Das Blatt der Fuehrungsstelle (M5.4).
   *
   * Dienstposten, Schichtplan und die Staerke aus K17 in **einem** Ruf: Sie
   * sind drei Sichten auf dieselbe Menge, und drei Rufe holten die Posten
   * dreimal.
   */
  fuest(ruf: Extract<Ruf, { art: "fuestAnfordern" }>): Fuestansicht {
    const mitEntfernten = ruf.mitEntfernten === true ? { mitEntfernten: true } : {};
    return {
      lageZeiger: this.#lageZeiger,
      bloecke: projektion.dienstpostenblatt(this.#zustand, mitEntfernten),
      plan: projektion.schichtplanblatt(this.#zustand, {
        ...mitEntfernten,
        ...(ruf.planVon === undefined ? {} : { von: ruf.planVon }),
        ...(ruf.planBis === undefined ? {} : { bis: ruf.planBis }),
      }),
      staerke: projektion.fuestStaerke(this.#zustand),
    };
  }

  /**
   * Der Eingangskorb des Meldekopfs (M6.1) und die Revisionen einer Reihe
   * (M6.2) — derselbe Ruf mit anderem Filter.
   *
   * Der `uebernahmeZustand` je Meldung kommt aus dem Fold (§5.8.1) und wird
   * hier nur weitergereicht; die Projektion ordnet und schneidet.
   */
  eingangskorb(ruf: Extract<Ruf, { art: "eingangskorbAnfordern" }>): Eingangskorbansicht {
    const ausschnitt = projektion.eingangskorb(this.#zustand, {
      ...(ruf.zustaende === undefined ? {} : { zustaende: ruf.zustaende }),
      ...(ruf.einheitSchluessel === undefined ? {} : { einheitSchluessel: ruf.einheitSchluessel }),
      ...(ruf.suche === undefined ? {} : { suche: ruf.suche }),
      ...(ruf.nurKoepfe === undefined ? {} : { nurKoepfe: ruf.nurKoepfe }),
      ...(ruf.von === undefined ? {} : { von: ruf.von }),
      ...(ruf.anzahl === undefined ? {} : { anzahl: ruf.anzahl }),
    });
    return { lageZeiger: this.#lageZeiger, ...ausschnitt };
  }

  /**
   * Der Vergleich zweier Fassungen (M6.2).
   *
   * Ohne `vonId`/`nachId` die **beiden juengsten** der Reihe: Das ist die
   * Frage vor einer Uebernahme — was hat sich seit der letzten Meldung
   * geaendert.
   */
  fassungsvergleich(
    ruf: Extract<Ruf, { art: "fassungsvergleichAnfordern" }>,
  ): projektion.Fassungsvergleich | null {
    if (ruf.vonId !== undefined && ruf.nachId !== undefined) {
      return projektion.fassungsvergleich(this.#zustand, ruf.vonId, ruf.nachId) ?? null;
    }
    if (ruf.einheitSchluessel === undefined) return null;
    return projektion.letzteAenderung(this.#zustand, ruf.einheitSchluessel) ?? null;
  }

  /** Die Einheitentabelle, gefiltert und auf den Ausschnitt beschnitten (M3.2). */
  tabelle(ruf: Extract<Ruf, { art: "tabelleAnfordern" }>): Tabellenansicht {
    const ausschnitt = projektion.einheitentabelle(this.#zustand, {
      ...(ruf.abschnittId === undefined ? {} : { abschnittId: ruf.abschnittId }),
      ...(ruf.suche === undefined ? {} : { suche: ruf.suche }),
      ...(ruf.mitStillgelegten === undefined ? {} : { mitStillgelegten: ruf.mitStillgelegten }),
      ...(ruf.status === undefined ? {} : { status: ruf.status }),
      ...(ruf.gliederung === undefined ? {} : { gliederung: ruf.gliederung }),
      ...(ruf.ohneLeereBereiche === undefined ? {} : { ohneLeereBereiche: ruf.ohneLeereBereiche }),
      ...(ruf.von === undefined ? {} : { von: ruf.von }),
      ...(ruf.anzahl === undefined ? {} : { anzahl: ruf.anzahl }),
    });
    return { lageZeiger: this.#lageZeiger, ...ausschnitt, auswahlwerte: tabellenauswahl(this.#zustand) };
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
        ...(ruf.nachrichtId === undefined ? {} : { nachrichtId: ruf.nachrichtId }),
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
  ausgabeHtml(
    ausgabe: Seitenausgabe,
    organisation?: string,
    zeitraum?: { readonly von?: string; readonly bis?: string },
  ): { dateiname: string; html: string } {
    const gerendert = this.#rendereSeite(ausgabe, organisation, zeitraum);
    // Bildschirmhülle (viewport, scrollbare Tabellen): wirkt nur am Bildschirm, nicht im Druck.
    return { dateiname: gerendert.dateiname, html: bildschirmtauglich(gerendert.html) };
  }

  #rendereSeite(
    ausgabe: Seitenausgabe,
    organisation?: string,
    zeitraum?: { readonly von?: string; readonly bis?: string },
  ): { dateiname: string; html: string } {
    const jetzt = new Date(this.#o.zeit());
    const kopf = {
      datum: this.#o.einsatzId.slice(0, 10),
      einsatzName: alsText(this.#zustand.einsatz?.name.wert),
      stand: `Stand: ${standText(jetzt)}`,
      // R2-ETB P3-2: die Programmfassung im Druckkopf.
      programmversion: this.#o.programmversion,
    };
    const marke = dateimarke(jetzt);
    if (LISTENAUSGABEN.has(ausgabe)) {
      return listenausgabe(ausgabe as Listenausgabe, this.#zustand, this.#ereignisse, kopf, marke);
    }
    if (VERSORGUNGSAUSGABEN.has(ausgabe)) {
      return versorgungsausgabe(ausgabe as Versorgungsausgabe, this.#zustand, jetzt.getTime(), { ...kopf, marke });
    }
    if (ausgabe === "nachweisung") {
      // LdF P2-5: Schichtausschnitt, Zeitraum und Abschlusszeile; ETB P1-3: Grund des Zurückziehens.
      return nachweisungsausgabe(this.#zustand, { ...kopf, erstelltVon: this.#erstellerText() }, marke, { zeitraum, ereignisse: this.#ereignisse });
    }
    if (ausgabe === "funkplan") {
      return funkplanausgabe(this.#zustand, { ...kopf, erstelltVon: this.#erstellerText() }, marke, jetzt.toISOString());
    }
    if (ausgabe === "status") {
      return { dateiname: `status_${marke}`, html: statusAlsHtml(statusdaten(this.#zustand), kopf) };
    }
    if (ausgabe === "log") {
      return { dateiname: `logistik_${marke}`, html: logAlsHtml(this.#zustand, kopf) };
    }
    if (ausgabe === "kosten") {
      return { dateiname: `kosten_${marke}`, html: kostenAlsHtml(this.#zustand, kopf) };
    }
    if (ausgabe === "fueorg") {
      return { dateiname: `fueorg_${marke}`, html: harkeAlsHtml(this.#zustand, kopf) };
    }
    if (ausgabe === "einheitenliste") {
      return {
        dateiname: `einheitenliste_${marke}`,
        html: einheitenlisteAlsHtml(einheitenlistendaten(this.#zustand), kopf),
      };
    }
    const daten = druckdaten(this.#zustand, organisation === undefined ? {} : { organisation });
    return { dateiname: `druck_${marke}`, html: druckAlsHtml(daten, kopf) };
  }

  /** Wer eine Ausgabe erstellt: „Meier (Führungsstelle 1)“, ohne Benutzernamen nur der Platz. */
  #erstellerText(): string {
    const benutzer = this.#o.akteur.benutzer.trim();
    const platz = this.#o.anzeigename.trim();
    if (benutzer === "" || benutzer === platz) return platz;
    return platz === "" ? benutzer : `${benutzer} (${platz})`;
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
        stand: `Stand der Lage: ${this.#letzteWanduhr === "" ? "noch keine Meldung" : standText(this.#letzteWanduhr)}`,
        // R2-ETB P3-2: die Programmfassung im Druckkopf.
        programmversion: this.#o.programmversion,
      },
      {
        mitStatus: wahl.mitStatus,
        // Der fachliche Stand ist der der juengsten Meldung; das
        // Lebenszeichen ist die Uhr dieses Rechners. Zwei Zeiten, und sie
        // werden nicht vermischt (§2.6).
        geschriebenUm: standText(jetzt),
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
        stand: `Stand: ${standText(jetzt)}`,
        zeitpunkt: jetzt,
      }),
    };
  }

  /**
   * Die Wertekopie des Logistikblatts als XLSX (M5.1).
   *
   * Die Vorlage erzeugt sie per Makro aus dem Log-Blatt und laesst sie
   * ungeschuetzt (`excel-domaenenmodell.md` §4.3): Sie ist die Fassung zum
   * Weiterverarbeiten und geht deshalb an den Caterer, nicht an die Wand.
   */
  logFreiXlsx(): { dateiname: string; bytes: Uint8Array } {
    const jetzt = new Date(this.#o.zeit());
    return {
      dateiname: `logfrei_${dateimarke(jetzt)}`,
      bytes: logFreiAlsXlsx(this.#zustand, {
        stand: `Stand: ${standText(jetzt)}`,
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
        stand: `Stand: ${standText(jetzt)}`,
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
  /**
   * Der Vordruck einer Nachricht als PDF in `ausgaben\nachrichten`
   * (KONZEPT-NACHRICHTEN.md §7, Schnitt N3). Ein Unterordner, weil eine
   * Führungsstelle Dutzende Nachrichten druckt und die Listen sonst darin
   * untergingen; derselbe Weg ohne `fsync` wie jede Ausgabe.
   */
  async nachrichtVordruck(nachrichtId: string, blatt: "a5" | "a4quer"): Promise<{ pfad: string; bytes: number }> {
    const { dateiname, bytes } = vordruckDerNachricht(this.#zustand, nachrichtId, blatt, this.#tagebuchbezug());
    const ordner = path.join(this.#o.ablage.shareAusgaben, ORDNER_NACHRICHTEN);
    const pfad = path.join(ordner, dateiname);
    await this.#o.dateisystem.legeVerzeichnisAn(ordner);
    await this.#o.dateisystem.schreibeUeberOhneSync(pfad, bytes);
    return { pfad, bytes: bytes.length };
  }

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
    this.#scanQuelle = "SCAN";
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
      const vorschau = this.#vorschau(bogen);
      this.#scanBezeichnung = vorschau.bezeichnung;
      return {
        art: "vollstaendig",
        haben: befund.stand.haben,
        anzahl: befund.stand.anzahl,
        vorschau,
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

  /**
   * Nimmt die Boegen einer Datei auf — der JSON-Anhang einer PDF der
   * Erfassungsbogen-App, vom Renderer aus der Datei gezogen.
   *
   * Jeder Bogen wird in den Text umgerechnet, den sein QR-Code truege, und
   * geht dann durch {@link eebScan}: Vorschau, `meldungId` und Uebernahme sind
   * damit **dieselben** wie beim Handscanner, und ein Bogen, der einmal
   * gescannt und einmal als Datei kommt, ist eine Meldung (§5.8.1).
   *
   * Der erste Bogen wird angezeigt, die uebrigen warten. Enthaelt die Datei
   * keinen Bogen, bleibt stehen, was vorher da war.
   */
  async eebDatei(texte: readonly string[]): Promise<EebStand> {
    const kompressor = this.#o.kompressor;
    if (kompressor === undefined) {
      return { art: "unlesbar", haben: 0, anzahl: 0, meldung: "Auf diesem Arbeitsplatz ist kein Entpacker eingerichtet." };
    }
    const scans: string[] = [];
    for (const bogen of boegenAusJsonTexten(texte)) {
      try {
        scans.push(encodePayloadUrl(bogen, kompressor));
      } catch {
        // Das Geruest stimmte, der Inhalt nicht — kein Bogen.
      }
    }
    if (scans.length === 0) {
      return {
        art: "unlesbar",
        haben: this.#scanstand.haben,
        anzahl: this.#scanstand.anzahl,
        ...this.#wartendFeld(),
        meldung:
          "Die Datei enthält keinen Erfassungsbogen. Gelesen werden PDFs, die die Erfassungsbogen-App erzeugt hat — kein Scan eines Ausdrucks.",
      };
    }
    this.#scanWartend = scans;
    return this.#naechsterWartender();
  }

  /** Legt den angezeigten Bogen beiseite und zeigt den naechsten der Datei. */
  async eebUeberspringen(): Promise<EebStand> {
    this.#leereScan();
    return this.#naechsterWartender();
  }

  /** Verwirft den Sammelstand — der Knopf „Von vorn“ der Maske. */
  eebZuruecksetzen(): EebStand {
    this.#leereScan();
    this.#scanWartend = [];
    return { art: "leer", haben: 0, anzahl: 0 };
  }

  /** Raeumt den angezeigten Bogen ab; was wartet, wartet weiter. */
  #leereScan(): void {
    this.#scanstand = LEERER_STAND;
    this.#scanPayload = undefined;
    this.#scanText = "";
    this.#scanQuelle = "SCAN";
    this.#scanBezeichnung = "";
  }

  async #naechsterWartender(): Promise<EebStand> {
    const text = this.#scanWartend.shift();
    if (text === undefined) return { art: "leer", haben: 0, anzahl: 0 };
    const stand = await this.eebScan(text);
    this.#scanQuelle = "PDF_IMPORT";
    return { ...stand, ...this.#wartendFeld() };
  }

  #wartendFeld(): { readonly wartend?: number } {
    return this.#scanWartend.length === 0 ? {} : { wartend: this.#scanWartend.length };
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
    // Die Kennung kommt aus dem **Fingerabdruck** und nicht aus der
    // `meldungId` (M6.0): Sonst legte jede Tagesmeldung derselben Einheit eine
    // zweite Einheit an, und die Fuehrungsstelle saehe dieselbe Gruppe nach
    // drei Tagen dreimal im Lagebild.
    const einheitId = befund.einheitId;
    // Gibt es die Einheit schon, ist dies eine **Revision**: Die Uebernahme
    // schreibt dann Feldereignisse und keine zweite Anlage (§5.8.2).
    const vorhanden = this.#zustand.einheiten[einheitId];
    // Eine aufgegangene Einheit nimmt keine Revision an, die jemand sehen
    // koennte: Die Ereignisse landeten an einer unsichtbaren Einheit, und die
    // Maske meldete „uebernommen“. Also abweisen, bevor etwas geschrieben ist.
    if (vorhanden?.wirksamAufgegangen === true && vorhanden.entfernt?.wert !== true) {
      return {
        art: "abgewiesen",
        meldung: "Die Einheit ist in diesem Einsatz schon erfasst und in einer anderen Einheit aufgegangen. Der Bogen wurde nicht übernommen.",
        beiEreignis: "EinheitGemeldet",
      };
    }
    // Eine **entfernte** Einheit kommt zurueck: Wer sie geloescht hat und den
    // Bogen erneut einliest, will sie wieder haben — im gewaehlten Abschnitt.
    const wiederholt = vorhanden?.entfernt?.wert === true;
    const roh = uebernahmeEntwuerfe(befund.bogen, befund.signatur, {
      meldungId: befund.meldungId,
      einheitId,
      abschnittId,
      // Die Ids der Personen und Fahrzeuge leiten sich aus der `meldungId`
      // ab und werden nicht gewuerfelt: Scannt ein zweiter Meldekopf denselben
      // Bogen, entstehen dieselben Ids — und §3.6 macht daraus eine
      // verworfene Zweitanlage statt einer Dublette.
      ...teilIdsAus(befund.meldungId, befund.bogen),
      empfangenAm: this.#jetztText(),
      quelle: this.#scanQuelle,
      rohPayload: this.#scanText,
      einheitSchluessel: befund.einheitSchluessel,
    },
    vorhanden);
    const entwuerfe =
      wiederholt && vorhanden !== undefined
        ? [...roh.slice(0, 1), ...wiederherstellung(einheitId, vorhanden.abschnittId.wert, abschnittId), ...roh.slice(1)]
        : roh;

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
    this.#leereScan();
    // Eine Revision verschiebt nicht: Die Einheit bleibt, wo die Fuehrungsstelle
    // sie hingestellt hat. Die Maske muss sagen, wo das ist — sonst sucht der
    // Bediener sie im gewaehlten Abschnitt und findet sie nicht.
    const woanders = vorhanden !== undefined && !wiederholt && vorhanden.wirksamerAbschnittId !== abschnittId;
    const revision = woanders
      ? { bereitsIn: this.#abschnittsnameDer(einheitId) }
      : wiederholt
        ? { wiederhergestellt: true as const }
        : {};
    const fertig = { art: "uebernommen", einheitId, ereignisse: geschrieben, ...revision } as const;
    if (this.#scanWartend.length === 0) return fertig;
    return { ...fertig, naechster: await this.#naechsterWartender() };
  }

  #abschnittsnameDer(einheitId: string): string {
    const einheit = this.#zustand.einheiten[einheitId];
    const abschnitt = einheit === undefined ? undefined : this.#zustand.abschnitte[einheit.wirksamerAbschnittId];
    return abschnitt?.name.wert ?? "unbekanntem Abschnitt";
  }

  /**
   * Der Massenimport: uebernimmt den angezeigten Bogen und alle wartenden der
   * Datei in denselben Abschnitt.
   *
   * Jeder Bogen geht durch {@link eebUebernehmen} — dieselben Ereignisse,
   * dieselben Transaktionen, derselbe Sync wie per Knopf. Ein abgewiesener
   * oder unlesbarer Bogen wird notiert und beiseitegelegt; die uebrigen
   * laufen weiter.
   *
   * {@link eebAbbrechen} haelt den Lauf **zwischen** zwei Boegen an: Der
   * laufende Bogen wird fertig geschrieben, die uebrigen bleiben in der
   * Schlange, und der naechste kommt als `naechster` zurueck in die Maske.
   */
  async eebAlleUebernehmen(abschnittId: string): Promise<Sammeluebernahme> {
    this.#abbruchGewuenscht = false;
    const lauf: Sammellauf = {
      uebernommen: 0,
      ereignisse: 0,
      fehlgeschlagen: [],
      aktualisiert: [],
      wiederhergestellt: [],
      fertig: 0,
      gesamt: (this.#scanPayload === undefined ? 0 : 1) + this.#scanWartend.length,
      naechster: undefined,
    };
    while (this.#scanPayload !== undefined || this.#scanWartend.length > 0) {
      // Erst nach dem ersten Bogen: Davor kennt der Lauf den angezeigten Stand nicht.
      if (this.#abbruchGewuenscht && lauf.fertig > 0) return this.#abgebrochen(lauf);
      await this.#sammelschritt(abschnittId, lauf);
    }
    return this.#sammelausgang(lauf);
  }

  /** Bittet einen laufenden Massenimport, nach dem aktuellen Bogen anzuhalten. */
  eebAbbrechen(): null {
    this.#abbruchGewuenscht = true;
    return null;
  }

  async #sammelschritt(abschnittId: string, lauf: Sammellauf): Promise<void> {
    if (this.#scanPayload === undefined) {
      this.#leereScan();
      const stand = await this.#naechsterWartender();
      lauf.naechster = stand;
      if (stand.art !== "unlesbar") return;
      lauf.fehlgeschlagen.push({ bezeichnung: "—", meldung: stand.meldung ?? "unlesbar" });
    } else {
      const bezeichnung = this.#scanBezeichnung;
      const ergebnis = await this.eebUebernehmen(abschnittId);
      if (ergebnis.art === "uebernommen") {
        lauf.uebernommen += 1;
        lauf.ereignisse += ergebnis.ereignisse;
        lauf.naechster = ergebnis.naechster;
        if (ergebnis.bereitsIn !== undefined) lauf.aktualisiert.push({ bezeichnung, abschnitt: ergebnis.bereitsIn });
        if (ergebnis.wiederhergestellt === true) lauf.wiederhergestellt.push(bezeichnung);
      } else {
        lauf.fehlgeschlagen.push({ bezeichnung, meldung: ergebnis.meldung });
        this.#leereScan();
        lauf.naechster = undefined;
      }
    }
    lauf.fertig += 1;
    this.#meldeFortschritt(lauf.fertig, lauf.gesamt);
  }

  async #abgebrochen(lauf: Sammellauf): Promise<Sammeluebernahme> {
    this.#abbruchGewuenscht = false;
    const naechster = this.#scanPayload === undefined ? await this.#naechsterWartender() : lauf.naechster;
    return { ...this.#sammelausgang(lauf), abgebrochen: true, ...(naechster === undefined ? {} : { naechster }) };
  }

  #sammelausgang(lauf: Sammellauf): Sammeluebernahme {
    return {
      uebernommen: lauf.uebernommen,
      ereignisse: lauf.ereignisse,
      fehlgeschlagen: lauf.fehlgeschlagen,
      ...(lauf.aktualisiert.length === 0 ? {} : { aktualisiert: lauf.aktualisiert }),
      ...(lauf.wiederhergestellt.length === 0 ? {} : { wiederhergestellt: lauf.wiederhergestellt }),
    };
  }

  #meldeFortschritt(fertig: number, gesamt: number): void {
    this.#o.sende({ art: "eebFortschritt", akteId: this.#o.akteId, fertig, gesamt });
  }

  /**
   * Liest eine Buendeldatei ein (M6.3).
   *
   * Je Eintrag entstehen dieselben Ereignisse wie nach einem Scan — der Weg
   * ueber die Datei ist ein anderer Transport und kein anderes Verfahren.
   * Doppelte fallen ueber die `meldungId` zusammen (§3.6): Zwei Meldekoepfe,
   * die denselben Bogen fuehren, und ein zweimal eingelesenes Buendel ergeben
   * **eine** Meldung.
   *
   * **Ein Abbruch mittendrin laesst das Geschriebene stehen.** Das ist keine
   * Schwaeche, sondern das Protokoll: append-only, jedes Ereignis mit eigener
   * HLC (§1.3). Gezaehlt wird deshalb, was ankam, und der Ausgang sagt es.
   */
  async buendelEinlesen(text: string, abschnittId: string): Promise<Buendelergebnis> {
    const befund = liesBuendel(text);
    let aufgenommen = 0;
    let bekannt = 0;
    const abgelehnt = buendelUrsachen(text, befund.eintraege.length, befund.uebersprungen);

    for (const eintrag of befund.eintraege) {
      // §3.6: Kennt die Akte die Meldung schon, ist nichts zu tun. Der Fold
      // faellt zwar ohnehin auf eine Anlage zusammen, aber ein Ereignis zu
      // schreiben, das nichts aendert, fuellte das Protokoll und das Tagebuch.
      if (this.#zustand.meldungen[eintrag.meldungId] !== undefined) {
        bekannt += 1;
        continue;
      }
      const einheitId = einheitIdAus(eintrag.einheitSchluessel);
      const entwuerfe = uebernahmeEntwuerfe(
        eintrag.bogen,
        // Der Signaturbefund der Datei, in die Form der Bauhilfe gebracht.
        // Unsigniert ist kein Fehler (§5.8.1) — die Signatur entscheidet
        // nichts, sie wird angezeigt.
        signaturbefund(eintrag.signatur),
        {
          meldungId: eintrag.meldungId,
          einheitId,
          abschnittId,
          ...teilIdsAus(eintrag.meldungId, eintrag.bogen),
          empfangenAm: eintrag.empfangenAm === "" ? this.#jetztText() : eintrag.empfangenAm,
          quelle: eintrag.quelle,
          einheitSchluessel: eintrag.einheitSchluessel,
        },
        this.#zustand.einheiten[einheitId],
      );

      for (const entwurf of entwuerfe) {
        const ergebnis = await this.bediene(entwurf);
        if (ergebnis.art !== "geschrieben") {
          return {
            aufgenommen,
            bekannt,
            uebersprungen: befund.uebersprungen + (befund.eintraege.length - aufgenommen - bekannt),
            name: befund.name,
            abgelehnt: [...abgelehnt, { grund: `Das Schreiben wurde abgewiesen: ${this.#meldungVon(ergebnis)}` }],
          };
        }
      }
      aufgenommen += 1;
    }

    return {
      aufgenommen,
      bekannt,
      uebersprungen: befund.uebersprungen,
      name: befund.name,
      ...(abgelehnt.length === 0 ? {} : { abgelehnt }),
    };
  }

  /**
   * Schreibt die Meldungen dieser Akte als Buendeldatei (M6.3).
   *
   * Sie geht nach `ausgaben\` wie jede andere Ausgabe (M4.1): Eine
   * Buendeldatei ist ein abgeleiteter Anzeiger (§1.3) — sie traegt nichts,
   * was die Ereignisse nicht auch tragen, und ist jederzeit neu erzeugbar.
   */
  async buendelSchreiben(): Promise<{ pfad: string; bytes: number }> {
    const jetzt = new Date(this.#o.zeit());
    const meldungen = Object.values(this.#zustand.meldungen)
      .filter((meldung) => meldung.bogen?.wert !== undefined && meldung.bogen.wert !== null)
      .map((meldung) => ({
        meldungId: meldung.id,
        einheitSchluessel: alsText(meldung.einheitSchluessel?.wert),
        bogen: meldung.bogen?.wert as unknown as import("@bos/eeb-format").Erfassungsbogen,
        empfangenAm: alsText(meldung.empfangenAm.wert),
        ...(meldung.meldeStatus?.wert === undefined
          ? {}
          : { meldeStatus: alsText(meldung.meldeStatus.wert) }),
      }));

    const text = buendelAusMeldungen(meldungen, {
      id: this.#o.einsatzId,
      name: alsText(this.#zustand.einsatz?.name.wert),
      jetzt: jetzt.getTime(),
    });
    const bytes = new TextEncoder().encode(text);
    const pfad = await this.ausgabeSchreiben(`buendel_${dateimarke(jetzt)}.json`, bytes);
    return { pfad, bytes: bytes.length };
  }

  /**
   * Schreibt die Erfassungsboegen der gewaehlten Einheiten als Buendeldatei.
   *
   * Dasselbe Format wie `buendelSchreiben` — die Erfassungsbogen-App und
   * „Buendel einlesen" lesen es —, nur auf die Auswahl beschraenkt und je
   * Einheit mit der juengsten Fassung. Lesen ist auch im archivierten Einsatz
   * erlaubt; geschrieben wird nur nach `ausgaben\` (M4.1).
   */
  async erfassungsboegenSchreiben(einheitIds: readonly string[]): Promise<Erfassungsbogenergebnis> {
    const { boegen, ohneBogen } = boegenDerEinheiten(this.#zustand, einheitIds);
    if (boegen.length === 0) return { bytes: 0, boegen: 0, ohneBogen };
    const jetzt = new Date(this.#o.zeit());
    const text = buendelAusMeldungen(boegen, {
      id: this.#o.einsatzId,
      name: alsText(this.#zustand.einsatz?.name.wert),
      jetzt: jetzt.getTime(),
    });
    const bytes = new TextEncoder().encode(text);
    const pfad = await this.ausgabeSchreiben(`erfassungsboegen_${dateimarke(jetzt)}.json`, bytes);
    return { pfad, bytes: bytes.length, boegen: boegen.length, ohneBogen };
  }

  /**
   * Ersetzt rohe Vokabularcodes („#3") übernommener Einheiten durch Namen aus
   * dem gespeicherten Bogen. Rechnet und zählt in `./vokabelkorrektur.ts`.
   */
  vokabelnKorrigieren(): Promise<Vokabelkorrekturergebnis> {
    return vokabelnKorrigieren(this.#zustand, (entwurf) => this.bediene(entwurf));
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

  /** Ein Ereignis nach Id — für den Hauptschritt einer Undo-Gruppe (R2-LdF P2-8). */
  #ereignisNach(id: string): EingehendesEreignis | undefined {
    for (let i = this.#ereignisse.length - 1; i >= 0; i -= 1) {
      const e = this.#ereignisse[i];
      if (e?.id === id) return e;
    }
    return undefined;
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
    // Ein Satz je Aufruf statt einer Suche je Zeile: Die Wiederaufnahme
    // uebergibt den ganzen Spiegel auf einmal, und §2.6 rechnet mit 50.000
    // Ereignissen je Einsatz.
    const indiesemZug = new Set<string>();
    for (const zeile of zeilen) {
      if (istVerwaltungsereignis(zeile.rahmen.typ)) continue;
      const ereignis = zeile.rahmen as unknown as EingehendesEreignis;
      // §3.6, hier fuer die **Liste** und nicht nur fuer die Faltung: Die
      // Faltung verrechnet eine bereits gesehene Id nicht zweimal, die Liste
      // aus §5.9.1 wuerde sie zweimal zeigen. Zwei Wege liefern dieselbe Zeile
      // ein zweites Mal — ein Ersatzsegment wiederholt die Zeilen des
      // ersetzten (§4.6), und die Wiederaufnahme beim Oeffnen liest beide
      // Dateien. Ein Tagebuch mit doppelten Eintraegen waere kein
      // Schoenheitsfehler: Es ist die Urkunde des Einsatzes.
      if (this.#faltung.gesehen.has(ereignis.id) || indiesemZug.has(ereignis.id)) continue;
      indiesemZug.add(ereignis.id);
      ereignisse.push(ereignis);
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
    this.#meldeVorrang();
  }

  /** Sichter P1-4: der Stau vor dem Sichter an FMZ und LDF, je Nachricht einmal (`sichterstau.ts`). */
  #meldeSichterstau(jetztMs: number): void {
    const stellen = this.#sitzung?.stellen ?? [];
    const text = this.#sichterstau.pruefe({ zustand: this.#zustand, stellen, jetztMs, sichterBesetzt: sichterBesetzt(stellen, this.#peers) });
    if (text !== undefined) this.#o.sende({ art: "hinweis", akteId: this.#o.akteId, stufe: "warnung", text });
  }

  /** ETB-Nummern und Rückzugsgründe aus den Ereignissen, je Lagezeiger einmal gerechnet (ETB P1-2, P1-3). */
  #tagebuchbezug(): projektion.Tagebuchbezug {
    if (this.#bezugGemerkt?.zeiger !== this.#lageZeiger) {
      this.#bezugGemerkt = { zeiger: this.#lageZeiger, bezug: projektion.tagebuchbezug(this.#ereignisse) };
    }
    return this.#bezugGemerkt.bezug;
  }

  /** Entscheidung 6: der Hinweis bei Vorrang für eine Stelle der Sitzung, bei Blitz mit Ton. */
  #meldeVorrang(): void {
    const stellen = this.#sitzung?.stellen ?? [];
    if (stellen.length === 0) return;
    // Dieselbe Stelle, aber jede Nachricht: der Automatikdruck (N3, Entscheidung 7).
    this.#automatik.nachEintreffen(this.#zustand, stellen);
    for (const hinweis of this.#vorrang.neue(this.#zustand, stellen, this.#clientId)) {
      this.#o.sende({
        art: "hinweis",
        akteId: this.#o.akteId,
        stufe: "warnung",
        text: hinweis.text,
        ...(hinweis.blitz ? { ton: "blitz" as const } : {}),
      });
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
    const ausserhalb = kennzahlen.staerkeAusserhalbDerGesamtstaerke(zustand);
    const oberster = this.#stapel.oberster();
    const stammdaten = mitNachrichtenparametern(zustand, projektion.einsatzstammdaten(zustand));
    const offeneAbloesungen = projektion.offeneAbloesungen(zustand);
    return {
      einsatzId: this.#o.einsatzId,
      einsatzName: alsText(zustand.einsatz?.name.wert),
      einsatzArt: alsText(zustand.einsatz?.art.wert),
      ...(stammdaten === undefined ? {} : { stammdaten }),
      einsatzStatus: zustand.einsatz?.status ?? "AKTIV",
      einsatzEnde: alsText(zustand.einsatz?.ende?.wert),
      ...(offeneAbloesungen.length === 0 ? {} : { abloesungenOffen: [...offeneAbloesungen] }),
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
      staerkeErwartet: ausserhalb.erwartet,
      staerkeBeendet: ausserhalb.beendet,
      hinweise: zustand.hinweise.length,
      // Additiv (FM P2-6): Art und Pfad der ersten Hinweise, für „Nachricht öffnen“ in der Diagnose.
      // Additiv (R2-ETB P2-4, R2-SGL P2-2): an Nachrichten mit Satz (Nummer, Betreff, die beiden Werte).
      ...(zustand.hinweise.length === 0 ? {} : { konflikthinweise: konflikthinweiseFuerLagebild(zustand, KONFLIKTHINWEISE_MAX) }),
      vokabelkorrekturen: offeneVokabelkorrekturen(zustand),
      unbekannteEreignisse: zustand.unbekannt.length,
      // R2-LdF P2-8: Bedienschritte, nicht Ereignisse — ein Schritt mit Folgeschritten zählt einmal.
      undoTiefe: undoTiefe(this.#stapel),
      ...(oberster === undefined
        ? {}
        : {
            undoObersteArt: oberster.typ,
            undoObersteObjekt: gegenstandMitBetreff(zustand, oberster.ereignis),
          }),
      // Additiv (R2-LdF P2-8, R2-FaBe P2-8): der Schritt als Ganzes und der jüngste nicht rücknehmbare.
      ...this.#undoanzeige.teil(this.#stapel, { ereignis: (id) => this.#ereignisNach(id) }, (e) => gegenstandMitBetreff(zustand, e)),
      offeneAnforderungen: Object.values(zustand.anforderungen).filter(
        (a) => a.zustand === "OFFEN" || a.zustand === "ZUGESAGT",
      ).length,
      lageZeiger: this.#lageZeiger,
      versorgung: versorgungFuerLagebild(zustand, this.#o.zeit()),
      funk: funkFuerLagebild(zustand, this.#o.zeit()),
      nachrichten: nachrichtenFuerLagebild(zustand, this.#sitzung?.stellen ?? [], this.#o.zeit(), sichterBesetzt(this.#sitzung?.stellen, this.#peers), ldfBesetzt(this.#sitzung?.stellen, this.#peers)),
      ...offeneNachrichtenTeil(zustand),
      ...(this.#sitzung === undefined ? {} : { sitzung: this.#sitzung }),
      // Additiv (R2-FaBe P0-3): wer besetzt ist — FmZ, Sichter, LdF — für die Hinweise der Oberfläche.
      besetzteStellen: besetzteStellen(this.#sitzung?.stellen, this.#peers),
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
 * Der Signaturbefund einer Buendelzeile in der Form, die die Bauhilfe erwartet.
 *
 * Die Datei fuehrt nur den Zustand; `pubkey` und `kurzform` gehoeren zum
 * Transport, den sie nicht mitbringt. Sie bleiben leer statt erfunden — §5.8
 * laesst den ganzen Signaturblock weg, wenn nichts vorliegt, und eine
 * erfundene Kurzform waere eine Absenderangabe, die niemand gemacht hat.
 */
function signaturbefund(
  zustand: "GUELTIG" | "UNGUELTIG" | undefined,
): import("@bos/eeb-format").SignaturStatus {
  if (zustand === "GUELTIG") return { zustand: "gueltig", pubkey: "", kurzform: "" };
  if (zustand === "UNGUELTIG") return { zustand: "ungueltig", pubkey: "", kurzform: "" };
  return { zustand: "unsigniert" };
}

/**
 * Der Rahmenwert `neu` der Arten mit festem Feld (§2.5) wird hier geprueft,
 * weil der Katalog nur die Nutzlast kennt: Eine Staerke, die als Text
 * ankommt, stuende sonst im Protokoll, und jede Summe darueber wuerde NaN —
 * an jedem Arbeitsplatz, ohne Hinweis. Ebenso ein Zeitpunkt, der keiner ist.
 */
function pruefeNeu(entwurf: Ereignisentwurf): string | undefined {
  if (entwurf.typ === "StaerkeGeaendert") {
    const neu = entwurf.neu as { fuehrer?: unknown; unterfuehrer?: unknown; mannschaft?: unknown } | null | undefined;
    const zahl = (wert: unknown): boolean => typeof wert === "number" && Number.isInteger(wert) && wert >= 0;
    if (neu === null || typeof neu !== "object" || !zahl(neu.fuehrer) || !zahl(neu.unterfuehrer) || !zahl(neu.mannschaft)) {
      return "Die Stärke muss aus drei ganzen Zahlen (Fü/UFü/He) bestehen.";
    }
  }
  if (entwurf.typ === "EinsatzStammdatenGeaendert") {
    const feld = (entwurf.nutzlast as { feld?: unknown } | null | undefined)?.feld;
    return projektion.stammdatenwertFehler(typeof feld === "string" ? feld : "", entwurf.neu);
  }
  if (entwurf.typ === "ZeitpunktGesetzt" && entwurf.neu !== null && entwurf.neu !== undefined) {
    if (typeof entwurf.neu !== "string" || Number.isNaN(new Date(entwurf.neu).getTime())) {
      return "Der Zeitpunkt ist keine lesbare Zeitangabe.";
    }
  }
  return pruefeEinheitsteil(entwurf) ?? pruefeAnforderung(entwurf) ?? pruefeAnlagenamen(entwurf) ?? pruefeVersorgung(entwurf) ?? pruefeFunk(entwurf) ?? pruefeNachricht(entwurf);
}
