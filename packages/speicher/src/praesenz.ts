/**
 * Präsenz — KONZEPT-SPEICHER.md §6.4.
 *
 * `praesenz\<clientId>.json` ist die **einzige** Datei auf dem Share, die
 * überschrieben wird, und jeder Client überschreibt ausschließlich seine
 * eigene.
 *
 * **Zusicherung, genau abgegrenzt:** Die Präsenzdatei ist kein Datenpfad und
 * keine Fold-Regel. Kein Ereignis, kein gefalteter Zustand und keine
 * Poll-Entscheidung hängt an ihr. Fällt sie vollständig aus, ist die Folge auf
 * zwei Stellen begrenzt, und beide sind Komfort: Die Anzeige „3 weitere
 * Arbeitsplätze" wird ungenau, und die Erkennungshilfe für entfernte Dateien
 * (§8.6.2) verliert eine ihrer beiden Quellen. Insbesondere darf sie den
 * Verfall aus §6.2 **vorziehen, nie verhindern**.
 *
 * Geschrieben wird durch Überschreiben an Ort und Stelle mit Kürzen auf die
 * neue Länge, **kein Rename**: Rename schlägt unter Windows mit `EPERM`/`EBUSY`
 * fehl, wenn ein anderer Client die Zieldatei ohne `FILE_SHARE_DELETE` geöffnet
 * hält (`nas-speicher-recherche.md` §1.4) — genau das täte ein lesender Client.
 */

import type { Hlc } from "@s1/domaene";

import type { Dateisystem } from "./dateisystem.js";
import { hlcAlsText } from "@s1/domaene";
import { ORDNER_PRAESENZ, type Einsatzablage } from "./pfade.js";
import { PRAESENZ_VERALTET_MS } from "./startwerte.js";
import { wanduhrText, type Zeitquelle } from "./zeit.js";

const kodierer = new TextEncoder();
const dekodierer = new TextDecoder("utf-8", { fatal: false });

/**
 * Ein Quarantänehinweis für den Schreiber der betroffenen Datei (§4.6.1,
 * Auslöser 2).
 *
 * „Setzt ein Leser eine Datei in Quarantäne, trägt er Datei und Offset in
 * **seine eigene** Präsenzdatei ein. Sieht ein Schreiber dort seine eigene
 * Datei genannt, prüft er sie sofort ab dem genannten Offset, statt bis zum
 * nächsten Öffnen zu warten." Ein Leser repariert dabei nach wie vor nichts und
 * schreibt in keine fremde Datei — er sagt nur, was er sieht.
 */
export interface Quarantaenehinweis {
  readonly datei: string;
  readonly offset: number;
}

/** Der Inhalt einer Präsenzdatei (§6.4). */
export interface Praesenz {
  readonly clientId: string;
  readonly anzeigename: string;
  readonly rechnername: string;
  readonly programmversion: string;
  /** Letzter Kontakt als HLC-Textform fester Stellenzahl (§3.2). */
  readonly hlc: string;
  /** Letzter Kontakt als Wanduhr — nur Anzeige, nie Ordnung (§3.1). */
  readonly wanduhr: string;
  /** Laufendes eigenes Segment und dessen Offset (§6.4). */
  readonly segment: number;
  readonly offset: number;
  /** §4.6.1, Auslöser 2. Leer, solange dieser Leser nichts in Quarantäne hat. */
  readonly quarantaene?: readonly Quarantaenehinweis[];
}

export interface PraesenzOptionen {
  readonly dateisystem: Dateisystem;
  readonly zeit: Zeitquelle;
  readonly ablage: Einsatzablage;
  readonly clientId: string;
  readonly anzeigename: string;
  readonly rechnername: string;
  readonly programmversion: string;
}

/** Schreibt die eigene Präsenzdatei (§6.4). Kein Rename, kein `fsync`. */
export async function schreibePraesenz(
  optionen: PraesenzOptionen,
  stand: { readonly hlc: Hlc; readonly segment: number; readonly offset: number },
  quarantaene: readonly Quarantaenehinweis[] = [],
): Promise<void> {
  const inhalt: Praesenz = {
    clientId: optionen.clientId,
    anzeigename: optionen.anzeigename,
    rechnername: optionen.rechnername,
    programmversion: optionen.programmversion,
    hlc: hlcAlsText(stand.hlc),
    wanduhr: wanduhrText(optionen.zeit()),
    segment: stand.segment,
    offset: stand.offset,
    ...(quarantaene.length === 0 ? {} : { quarantaene }),
  };
  await optionen.dateisystem.legeVerzeichnisAn(optionen.ablage.sharePraesenz);
  await optionen.dateisystem.schreibeUeberOhneSync(
    optionen.ablage.praesenzDatei(optionen.clientId),
    kodierer.encode(JSON.stringify(inhalt, undefined, 2)),
  );
}

/** Ein gelesener fremder Arbeitsplatz. */
export interface FremdePraesenz {
  readonly praesenz: Praesenz;
  /** §6.4: veraltet ab 60 Sekunden ohne Fortschreibung (Startwert, §10). */
  readonly veraltet: boolean;
}

/**
 * Merkt sich, seit wann eine fremde Präsenzdatei **unverändert** ist.
 *
 * §6.4 sagt „veraltet ab 60 Sekunden **ohne Fortschreibung**". Fortschreibung
 * ist eine Änderung des Inhalts, nicht ein Zahlenwert in der Datei: Wer die
 * fremde Wanduhr gegen die eigene rechnet, misst die Uhrdifferenz mit — und
 * §3.2 behandelt eine um Minuten abweichende Fremduhr ausdrücklich als
 * möglichen Betriebszustand, nicht als Fehler. Ein solcher Arbeitsplatz stünde
 * dauerhaft auf „offline" oder dauerhaft auf „aktiv".
 *
 * Beobachtet wird deshalb mit der **eigenen** Uhr, wann sich der Inhalt zuletzt
 * geändert hat. Das ist uhrunabhängig und misst genau das, was §6.4 meint.
 */
export class Praesenzbeobachtung {
  readonly #gesehen = new Map<string, { readonly stand: string; readonly seit: number }>();

  /** Meldet den gelesenen Inhalt und liefert, ob er als veraltet gilt. */
  beobachte(clientId: string, stand: string, jetzt: number): boolean {
    const bisher = this.#gesehen.get(clientId);
    if (bisher === undefined || bisher.stand !== stand) {
      this.#gesehen.set(clientId, { stand, seit: jetzt });
      return false;
    }
    return jetzt - bisher.seit > PRAESENZ_VERALTET_MS;
  }
}

/**
 * Liest alle Präsenzdateien außer der eigenen (§6.4).
 *
 * Ein Leser kann eine **halb geschriebene** Datei sehen; das ist zulässig und
 * vorgesehen: „Lässt sie sich nicht parsen, wird sie ignoriert und beim
 * nächsten Takt erneut gelesen. Kein Fehler, keine Meldung."
 *
 * Präsenzdateien werden **nie** von fremden Clients gelöscht — deshalb gibt es
 * hier keinen Aufräumweg.
 */
export async function liesFremdePraesenz(
  optionen: PraesenzOptionen,
  beobachtung?: Praesenzbeobachtung,
): Promise<readonly FremdePraesenz[]> {
  const namen = await optionen.dateisystem.listeVerzeichnis(optionen.ablage.sharePraesenz);
  const ergebnis: FremdePraesenz[] = [];
  for (const name of namen) {
    if (!name.endsWith(".json")) continue;
    if (name === `${optionen.clientId}.json`) continue;
    let bytes: Uint8Array;
    try {
      bytes = await optionen.dateisystem.liesAb(optionen.ablage.praesenzDatei(name.slice(0, -".json".length)), 0);
    } catch {
      continue;
    }
    const text = dekodierer.decode(bytes);
    const praesenz = deutePraesenz(text);
    if (praesenz === undefined) continue;
    const veraltet =
      beobachtung === undefined
        ? istVeraltet(praesenz, optionen.zeit())
        : beobachtung.beobachte(praesenz.clientId, text, optionen.zeit());
    ergebnis.push({ praesenz, veraltet });
  }
  return ergebnis;
}

/** Prüft einen gelesenen Text auf eine brauchbare Präsenz; halb Geschriebenes ergibt `undefined`. */
export function deutePraesenz(text: string): Praesenz | undefined {
  let wert: unknown;
  try {
    wert = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof wert !== "object" || wert === null || Array.isArray(wert)) return undefined;
  const objekt = wert as Record<string, unknown>;
  if (typeof objekt["clientId"] !== "string" || typeof objekt["wanduhr"] !== "string") {
    return undefined;
  }
  return objekt as unknown as Praesenz;
}

/**
 * §6.4: „Veraltet ab 60 Sekunden ohne Fortschreibung" — anhand der **fremden**
 * Wanduhr.
 *
 * Nur als Rückfallweg, wenn keine {@link Praesenzbeobachtung} mitgegeben wird.
 * Er misst die Uhrdifferenz mit und ist deshalb bei einer nach §3.2 zulässig
 * abweichenden Fremduhr ungenau; die Beobachtung ist der bessere Weg.
 */
export function istVeraltet(praesenz: Praesenz, jetzt: number): boolean {
  const gemeldet = Date.parse(praesenz.wanduhr);
  if (Number.isNaN(gemeldet)) return true;
  return jetzt - gemeldet > PRAESENZ_VERALTET_MS;
}

/**
 * Die Quarantänehinweise fremder Leser, die die **eigenen** Dateien betreffen
 * (§4.6.1, Auslöser 2).
 *
 * Der Schreiber prüft die genannte Stelle sofort, statt bis zum nächsten Öffnen
 * zu warten. Bleibt der Hinweis aus, heilt Auslöser 1 dieselbe Beschädigung —
 * nur später. Die Präsenzdatei beschleunigt, sie ist nicht Voraussetzung.
 */
export function hinweiseAufEigeneDateien(
  fremde: readonly FremdePraesenz[],
  eigenesPraefix: string,
): readonly Quarantaenehinweis[] {
  return fremde.flatMap((eintrag) =>
    (eintrag.praesenz.quarantaene ?? []).filter((hinweis) => hinweis.datei.startsWith(`${eigenesPraefix}.`)),
  );
}

/** Der Unterordner, in dem Präsenzdateien liegen (§1.4). */
export const PRAESENZ_ORDNER = ORDNER_PRAESENZ;
