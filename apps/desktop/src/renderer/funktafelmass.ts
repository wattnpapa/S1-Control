/**
 * Wie groß die Tafel „Funkplan" auf dem Monitor gesetzt wird (F4,
 * KONZEPT-FUNKPLAN.md §4).
 *
 * Der Grad kommt wie bei den Tafeln der Versorgung aus `tafelgrad` und damit
 * aus `schriftgroesse`: so breit wie eine Zeile, so hoch wie die Zeilenzahl
 * erlaubt. Diese Datei schätzt nur, **wie viele Zeilen** die Tafel braucht —
 * eine Rufgruppe ist hier keine Tabellenzeile fester Höhe, sondern so hoch
 * wie ihr Name mit Zweck oder wie ihre Kacheln, wenn sie umbrechen. Viele
 * Gruppen oder Teilnehmer verkleinern die Schrift, statt seitenweise zu
 * blättern; das hat S4 für die Versorgungstafel so entschieden, und an der
 * Wand soll sich jede Tafel gleich verhalten.
 *
 * Gerechnet wird in Zeichen der Grundschrift und in Zeilenhöhen von
 * `tafelgrad`. Wie viele Zeichen in eine Zeile passen, hängt am Grad selbst
 * (`ZEICHENBREITE` wie bei der Stärke); {@link funktafelgrad} sucht deshalb
 * den größten Grad, bei dem Breite und Höhe zueinander passen: Bei ihm fasst
 * eine Zeile so viele Zeichen, wie die Schätzung der Kachelreihen annimmt.
 * Die Faktoren stehen für die
 * Größen aus index.html (`.monitorfunkplan`): Name 1,3-fach in Mono, Zweck und
 * Kleingedrucktes 0,75-fach. Lieber eine Zeile zu viel geschätzt als ein
 * abgeschnittener Teilnehmer: Die Schätzung ist nur der Anfang, den
 * `useFunktafelgrad` nach dem Zeichnen an der gemessenen Tafel nachzieht.
 */

import { projektion, statusTitel, statusTon, type Funkteilnehmer, type Rufgruppenkarte } from "@s1/domaene";

import type { Fenstermass } from "./Monitor.js";
import { tafelgrad } from "./Monitoransichten.js";
import { ZEICHENBREITE } from "./monitorZahlen.js";

/** Die schmalste Zeile, mit der der Grad beginnt — Name, Zweck und zwei Kacheln. */
const ZEICHEN_MINDESTENS = 60;
/** Was rechts und links vom Rand des Monitors und vom Zellabstand abgeht, in Pixeln. */
const SEITENRAND = 48;

/** Die Höhe einer Tafelzeile in `tafelgrad`, in Grundschrifthöhen. */
const ZEILENHOEHE = 1.9;
const KLEIN = 0.75;
const NAME = 1.3;
/**
 * Fließtext in der Systemschrift ist schmaler als eine Tabellenziffer: rund
 * 0,5 statt 0,62 der Schrifthöhe. Mono (Rufgruppe, Funkrufname) bleibt bei 0,6.
 */
const SANS = 0.82;
/** Kachel: Bezeichnung, Kleingedrucktes, Innenabstand und Abstand zur nächsten Reihe. */
const KACHELREIHE = 2.7;

/** Das Kleingedruckte einer Kachel, getrennt nach leisem und warnendem Teil. */
export interface Kachelzeile {
  readonly leise: readonly string[];
  readonly warn: readonly string[];
}

/** Funkrufname, Status (außer grün), „hört mit", dann in Bernstein letzter und fehlender Kontakt. */
export function kachelzeile(t: Funkteilnehmer, mithoerer: boolean): Kachelzeile {
  const ton = statusTon(t.status);
  const leise = [t.funkrufname, ton === "ok" || t.status === "" ? "" : statusTitel(t.status), mithoerer ? "hört mit" : ""];
  const kontakt = t.letzterKontakt;
  const kein = t.keinKontaktGemeldet;
  const warn = [
    kontakt?.ueberSchwelle === true ? `letzter Kontakt ${projektion.uhrzeitKurz(kontakt.zeitpunkt)}` : "",
    kein === undefined ? "" : `kein Kontakt ${projektion.uhrzeitKurz(kein.zeitpunkt)}`,
  ];
  return { leise: leise.filter((s) => s !== ""), warn: warn.filter((s) => s !== "") };
}

function kachelzeichen(t: Funkteilnehmer, mithoerer: boolean): number {
  const z = kachelzeile(t, mithoerer);
  const klein = [...z.leise, ...z.warn].join(" · ").length;
  return Math.max(t.einheit.length * SANS, klein * KLEIN) + 2;
}

/** „Zweck · Gateway … · hört …" unter dem Namen der Rufgruppe. */
export function rufgruppenzeile(r: Rufgruppenkarte): string {
  const teile = [r.zweck, r.gateway === undefined ? undefined : `Gateway ${r.gateway}`, r.hoert === undefined ? undefined : `hört ${r.hoert}`];
  return teile.filter((t): t is string => t !== undefined && t !== "").join(" · ");
}

/** Die Breite der linken Spalte in Zeichen der Grundschrift: der längste Name mit Marke. */
export function rufgruppenbreite(gruppen: readonly Rufgruppenkarte[]): number {
  const breiteste = Math.max(0, ...gruppen.map((r) => r.name.length * NAME + projektion.betriebsartWort(r.betriebsart).length + 3));
  return Math.min(36, Math.max(18, Math.ceil(breiteste)));
}

/** Wie viele Kachelreihen die Teilnehmer in `platz` Zeichen brauchen — Kacheln brechen ganz um. */
export function kachelreihen(breiten: readonly number[], platz: number): number {
  let reihen = 0;
  let frei = 0;
  for (const breite of breiten) {
    if (reihen === 0 || breite > frei) {
      reihen += 1;
      frei = platz;
    }
    frei -= breite;
  }
  return reihen;
}

/** Die Höhe einer Rufgruppe in Grundschrifthöhen: Name mit Zweck links oder Kacheln rechts. */
function gruppenhoehe(r: Rufgruppenkarte, links: number, zeichen: number): number {
  const beschreibung = rufgruppenzeile(r).length * KLEIN * SANS;
  const linkeHoehe = NAME * 1.2 + Math.ceil(beschreibung / links) * KLEIN * 1.3;
  const breiten = [...r.teilnehmer.map((t) => kachelzeichen(t, false)), ...r.mithoerer.map((t) => kachelzeichen(t, true))];
  const rechteHoehe = kachelreihen(breiten, zeichen - links - 2) * KACHELREIHE;
  return Math.max(linkeHoehe, rechteHoehe) + 0.5;
}

/** Die Tafel in Zeilen von `tafelgrad`, wenn eine Zeile `zeichen` fasst: Kopf plus jede Rufgruppe. */
export function funktafelzeilen(gruppen: readonly Rufgruppenkarte[], zeichen: number): number {
  const links = rufgruppenbreite(gruppen);
  const hoehe = gruppen.reduce((summe, r) => summe + gruppenhoehe(r, links, zeichen), 1.2);
  return hoehe / ZEILENHOEHE;
}

/**
 * Was über und unter der Tafel steht, in Pixeln: Rand, Beschriftung und Fuß
 * (Größen aus `.monitor` und `.monitorfunkplan` in index.html, die mit dem
 * Fenster wachsen; der Fuß hält rechts den Punkten Platz frei). Der Fuß
 * kann mit den Namen ohne Rufgruppe zwei oder drei Zeilen lang werden.
 */
export function rahmenhoehe(mass: Fenstermass, fusszeichen: number): number {
  const beschriftung = Math.min(Math.max(12.8, mass.breite * 0.02), 22.4);
  const fuss = Math.min(Math.max(12.8, mass.breite * 0.017), 20.8);
  const fusszeilen = Math.max(1, Math.ceil((fusszeichen * fuss * 0.52) / Math.max(1, mass.breite - 260)));
  return 56 + beschriftung * 1.3 + fusszeilen * fuss * 1.25;
}

/** Wie viele Zeichen der Grundschrift bei diesem Grad in eine Zeile passen. */
export function zeichenBeiGrad(mass: Fenstermass, grad: number): number {
  return Math.floor((mass.breite - SEITENRAND) / (Math.max(1, grad) * ZEICHENBREITE));
}

function tafelflaeche(mass: Fenstermass, fusszeichen: number): Fenstermass {
  return { breite: mass.breite, hoehe: Math.max(1, mass.hoehe - rahmenhoehe(mass, fusszeichen)) };
}

/** Größer wird die Tafel nie: so groß, wie die schmalste Zeile in die Breite passt. */
export function funktafelhoechstgrad(mass: Fenstermass, fusszeichen: number): number {
  return tafelgrad(tafelflaeche(mass, fusszeichen), ZEICHEN_MINDESTENS, 0);
}

/**
 * Der Grad der Grundschrift der Tafel: der größte, bei dem die Tafel mit den
 * Zeichen, die bei ihm in eine Zeile passen, noch in die Höhe passt. Je
 * kleiner der Grad, desto mehr passt in die Zeile und desto seltener brechen
 * Kacheln um — die Bedingung kippt deshalb genau einmal, und die Suche
 * halbiert, statt jeden Grad zu probieren.
 */
export function funktafelgrad(mass: Fenstermass, gruppen: readonly Rufgruppenkarte[], fusszeichen: number): number {
  const tafel = tafelflaeche(mass, fusszeichen);
  const passt = (grad: number): boolean => grad <= tafelgrad(tafel, ZEICHEN_MINDESTENS, funktafelzeilen(gruppen, zeichenBeiGrad(mass, grad)));
  let unten = 1;
  let oben = funktafelhoechstgrad(mass, fusszeichen);
  if (passt(oben)) return oben;
  while (oben - unten > 1) {
    const mitte = Math.floor((oben + unten) / 2);
    if (passt(mitte)) unten = mitte;
    else oben = mitte;
  }
  return unten;
}
