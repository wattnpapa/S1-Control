/**
 * Hybrid Logical Clock — KONZEPT-SPEICHER.md §3.1 und §3.2, Auflage 5.
 *
 * Die HLC ist die *einzige* technische Ordnung des Systems. Die Wanduhr wird
 * angezeigt und plausibilisiert, ordnet aber nie (§3.1). Verglichen wird immer
 * die Struktur, nie die Zeichenkette (§3.2) — die Textform ist eine
 * Darstellung fuer Dateinamen und JSON.
 *
 * Plattformneutral (02-ZIELBILD.md, „Vier Ringe"): keine Uhr wird hier
 * unmittelbar aufgerufen. Die Zeitquelle ist injiziert (§8 Vorbemerkung),
 * damit der Uhrsprung aus der Fehlerinjektion von M0 pruefbar bleibt.
 */

/** Die HLC als Struktur (§3.2). */
export interface Hlc {
  /** Unix-Millisekunden. Wird niemals verkleinert (§3.2, „Die eigene Uhr darf rueckwaerts springen, die HLC nicht"). */
  readonly millisekunden: number;
  /** Zaehler innerhalb derselben Millisekunde, 0 bis {@link ZAEHLER_MAX}. */
  readonly zaehler: number;
  /** Kennung des erzeugenden Clients; zugleich der Gleichstandsbrecher. */
  readonly clientId: string;
}

/** 13 Ziffern tragen Unix-Millisekunden bis zum Jahr 2286 (§3.2). */
export const MILLISEKUNDEN_STELLEN = 13;
/** 6 Ziffern erlauben eine Million Ereignisse in derselben Millisekunde (§3.2). */
export const ZAEHLER_STELLEN = 6;
/** Groesster darstellbarer Zaehler; darueber greift die Ueberlaufregel (§3.2). */
export const ZAEHLER_MAX = 999_999;
/** Groesste darstellbare Millisekunde bei fester Stellenzahl. */
export const MILLISEKUNDEN_MAX = 9_999_999_999_999;
/** Schwelle fuer fremde Fehluhren und fuer den Rueckwaertssprung der eigenen Uhr (§3.2). */
export const UHR_SCHWELLE_MS = 5 * 60 * 1000;

/**
 * Vergleicht zwei HLC als Struktur: `millisekunden`, dann `zaehler`, dann
 * `clientId` als Gleichstandsbrecher (§3.2).
 *
 * Der Vergleich der `clientId` ist bewusst der gewoehnliche lexikografische
 * Vergleich der Zeichenkette. Nur so stimmt die Ordnung der Textform mit
 * dieser Strukturordnung ueberein — worauf sich die Sortierung der
 * Schnappschuss-Dateinamen in §7.2 verlaesst.
 *
 * @returns negativ, wenn `a` vor `b` liegt; 0 bei Gleichheit; sonst positiv.
 */
export function vergleicheHlc(a: Hlc, b: Hlc): number {
  if (a.millisekunden !== b.millisekunden) return a.millisekunden < b.millisekunden ? -1 : 1;
  if (a.zaehler !== b.zaehler) return a.zaehler < b.zaehler ? -1 : 1;
  if (a.clientId === b.clientId) return 0;
  return a.clientId < b.clientId ? -1 : 1;
}

/** `true`, wenn beide HLC in allen drei Bestandteilen uebereinstimmen. */
export function hlcGleich(a: Hlc, b: Hlc): boolean {
  return vergleicheHlc(a, b) === 0;
}

/** Die groessere der beiden HLC nach {@link vergleicheHlc}. */
export function groessereHlc(a: Hlc, b: Hlc): Hlc {
  return vergleicheHlc(a, b) >= 0 ? a : b;
}

function fuelle(wert: number, stellen: number): string {
  return String(wert).padStart(stellen, "0");
}

/**
 * Textform mit fester Stellenzahl (§3.2):
 * `<millisekunden: 13>-<zaehler: 6>-<clientId>`.
 *
 * Die feste Stellenzahl ist der Grund, warum die lexikografische Ordnung der
 * Textform mit der Strukturordnung uebereinstimmt. Wird sie verletzt, faellt
 * die Sortierung der Schnappschuss-Dateinamen still auseinander.
 */
export function hlcAlsText(hlc: Hlc): string {
  if (!Number.isInteger(hlc.millisekunden) || hlc.millisekunden < 0 || hlc.millisekunden > MILLISEKUNDEN_MAX) {
    throw new RangeError(`HLC-Millisekunden ausserhalb der festen Stellenzahl: ${hlc.millisekunden}`);
  }
  if (!Number.isInteger(hlc.zaehler) || hlc.zaehler < 0 || hlc.zaehler > ZAEHLER_MAX) {
    throw new RangeError(`HLC-Zaehler ausserhalb der festen Stellenzahl: ${hlc.zaehler}`);
  }
  if (hlc.clientId.length === 0 || hlc.clientId.includes("-")) {
    // Der Bindestrich trennt die drei Bestandteile. Eine clientId, die selbst
    // einen traegt, machte die Textform mehrdeutig.
    throw new RangeError(`Unzulaessige clientId in der HLC: ${JSON.stringify(hlc.clientId)}`);
  }
  return `${fuelle(hlc.millisekunden, MILLISEKUNDEN_STELLEN)}-${fuelle(hlc.zaehler, ZAEHLER_STELLEN)}-${hlc.clientId}`;
}

/** Liest die Textform aus §3.2 zurueck in die Struktur. */
export function hlcAusText(text: string): Hlc {
  const muster = /^(\d{13})-(\d{6})-(.+)$/.exec(text);
  if (muster === null) throw new SyntaxError(`Keine HLC-Textform nach §3.2: ${JSON.stringify(text)}`);
  return {
    millisekunden: Number(muster[1]),
    zaehler: Number(muster[2]),
    clientId: muster[3] as string,
  };
}

/** Meldungen nach §8.5. Sie halten die Arbeit nie an, sie werden angezeigt. */
export type Uhrmeldung =
  /** Ein fremder Wert zoege die eigene Uhr um mehr als fuenf Minuten nach vorn; er wird nicht uebernommen (§3.2). */
  | { readonly art: "fremdeUhrWeichtAb"; readonly abweichungMs: number; readonly fremderClientId: string }
  /** Die eigene Wanduhr ist um mehr als fuenf Minuten hinter die HLC zurueckgefallen (§3.2). */
  | { readonly art: "eigeneUhrZurueck"; readonly rueckstandMs: number }
  /** Der Zaehler ist voll, aber die Wanduhr kommt nicht weiter (§3.2, Zaehlerueberlauf). */
  | { readonly art: "uhrSteht"; readonly millisekunden: number };

/** Ergebnis von {@link HlcUhr.erzeugen}. */
export type Erzeugung =
  | { readonly art: "erzeugt"; readonly hlc: Hlc; readonly meldung?: Uhrmeldung }
  /**
   * Der Zaehler hat {@link ZAEHLER_MAX} erreicht (§3.2). Der Schreiber wartet,
   * bis die Wanduhr die naechste Millisekunde erreicht, und ruft erneut auf.
   * Das ist hoechstens eine Millisekunde und niemals ein Fehler.
   */
  | { readonly art: "wartenAufNaechsteMillisekunde"; readonly millisekunden: number; readonly meldung?: Uhrmeldung };

/** Ergebnis von {@link HlcUhr.empfangen}. */
export interface Empfang {
  /** Der eigene Stand nach dem Empfang. */
  readonly hlc: Hlc;
  /** `false`, wenn der fremde Wert wegen der Fuenf-Minuten-Regel nicht uebernommen wurde (§3.2). */
  readonly uebernommen: boolean;
  readonly meldung?: Uhrmeldung;
}

/** Die injizierte Zeitquelle: Unix-Millisekunden. Keine Komponente ruft eine Uhr unmittelbar auf (§8). */
export type Wanduhr = () => number;

export interface HlcUhrOptionen {
  readonly clientId: string;
  readonly wanduhr: Wanduhr;
  /** Fortgeschriebener Stand aus einem frueheren Lauf; ohne ihn beginnt die Uhr bei 0. */
  readonly start?: Hlc;
}

/**
 * Die fortschreibbare Uhr eines Clients — die Pseudocode-Regeln aus §3.2,
 * eins zu eins uebernommen.
 *
 * Zustandsbehaftet, weil die Fortschreibung genau das ist: `millisekunden` und
 * `zaehler` des Clients ueber die Zeit. Rein bleibt alles Uebrige in diesem
 * Modul.
 */
export class HlcUhr {
  readonly #clientId: string;
  readonly #wanduhr: Wanduhr;
  #millisekunden: number;
  #zaehler: number;
  /** Zaehlt aufeinanderfolgende Wartelaeufe in derselben Millisekunde (§3.2, „die Uhr steht"). */
  #wartelaeufe = 0;

  constructor(optionen: HlcUhrOptionen) {
    this.#clientId = optionen.clientId;
    this.#wanduhr = optionen.wanduhr;
    this.#millisekunden = optionen.start?.millisekunden ?? 0;
    this.#zaehler = optionen.start?.zaehler ?? 0;
  }

  /** Der aktuelle eigene Stand, ohne ihn fortzuschreiben. */
  get stand(): Hlc {
    return { millisekunden: this.#millisekunden, zaehler: this.#zaehler, clientId: this.#clientId };
  }

  /**
   * Erzeugen eines eigenen Ereignisses (§3.2):
   *
   * ```
   * w = Wanduhr in Millisekunden
   * wenn w > millisekunden:   millisekunden = w;  zaehler = 0
   * sonst:                                        zaehler = zaehler + 1
   * ```
   */
  erzeugen(): Erzeugung {
    const w = this.#wanduhr();
    if (w > this.#millisekunden) {
      this.#millisekunden = w;
      this.#zaehler = 0;
      this.#wartelaeufe = 0;
      return { art: "erzeugt", hlc: this.stand };
    }

    // Die Wanduhr ist nicht weiter als die HLC — entweder in derselben
    // Millisekunde oder zurueckgesprungen. `millisekunden` bleibt stehen, der
    // Zaehler laeuft weiter, bis die Wanduhr aufgeholt hat.
    const rueckstandMs = this.#millisekunden - w;
    const meldung: Uhrmeldung | undefined =
      rueckstandMs > UHR_SCHWELLE_MS ? { art: "eigeneUhrZurueck", rueckstandMs } : undefined;

    if (this.#zaehler >= ZAEHLER_MAX) {
      // §3.2, Zaehlerueberlauf beim Erzeugen: warten statt fehlschlagen.
      this.#wartelaeufe += 1;
      const stehtMeldung: Uhrmeldung | undefined =
        this.#wartelaeufe >= 2 ? { art: "uhrSteht", millisekunden: w } : meldung;
      return stehtMeldung === undefined
        ? { art: "wartenAufNaechsteMillisekunde", millisekunden: w }
        : { art: "wartenAufNaechsteMillisekunde", millisekunden: w, meldung: stehtMeldung };
    }

    this.#zaehler += 1;
    this.#wartelaeufe = 0;
    return meldung === undefined
      ? { art: "erzeugt", hlc: this.stand }
      : { art: "erzeugt", hlc: this.stand, meldung };
  }

  /**
   * Empfangen eines fremden Ereignisses (§3.2):
   *
   * ```
   * w = Wanduhr in Millisekunden
   * wenn f.millisekunden - max(millisekunden, w) > 5 Minuten: nicht uebernehmen
   * sonst:
   *     m = max(millisekunden, f.millisekunden, w)
   *     wenn m == millisekunden und m == f.millisekunden:  zaehler = max(zaehler, f.zaehler) + 1
   *     sonst wenn m == millisekunden:                     zaehler = zaehler + 1
   *     sonst wenn m == f.millisekunden:                   zaehler = f.zaehler + 1
   *     sonst:                                             zaehler = 0
   *     millisekunden = m
   * ```
   */
  empfangen(fremd: Hlc): Empfang {
    const w = this.#wanduhr();
    const eigenerOderWanduhr = Math.max(this.#millisekunden, w);

    if (fremd.millisekunden - eigenerOderWanduhr > UHR_SCHWELLE_MS) {
      // Schutz gegen fremde Fehluhren (§3.2). Das Ereignis wird normal
      // gefaltet; nur die eigene physische Komponente folgt ihm nicht.
      return {
        hlc: this.stand,
        uebernommen: false,
        meldung: {
          art: "fremdeUhrWeichtAb",
          abweichungMs: fremd.millisekunden - eigenerOderWanduhr,
          fremderClientId: fremd.clientId,
        },
      };
    }

    const m = Math.max(this.#millisekunden, fremd.millisekunden, w);
    let zaehler: number;
    if (m === this.#millisekunden && m === fremd.millisekunden) {
      zaehler = Math.max(this.#zaehler, fremd.zaehler) + 1;
    } else if (m === this.#millisekunden) {
      zaehler = this.#zaehler + 1;
    } else if (m === fremd.millisekunden) {
      zaehler = fremd.zaehler + 1;
    } else {
      zaehler = 0;
    }

    if (zaehler > ZAEHLER_MAX) {
      // §3.2, Zaehlerueberlauf beim Empfangen: Warten hilft nicht, weil der
      // fremde Wert feststeht. Stattdessen eine Millisekunde weiter, Zaehler 0
      // — monoton und innerhalb der festen Stellenzahl.
      this.#millisekunden = m + 1;
      this.#zaehler = 0;
    } else {
      this.#millisekunden = m;
      this.#zaehler = zaehler;
    }
    this.#wartelaeufe = 0;

    const rueckstandMs = this.#millisekunden - w;
    return rueckstandMs > UHR_SCHWELLE_MS
      ? { hlc: this.stand, uebernommen: true, meldung: { art: "eigeneUhrZurueck", rueckstandMs } }
      : { hlc: this.stand, uebernommen: true };
  }
}
