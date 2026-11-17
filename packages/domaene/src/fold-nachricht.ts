/**
 * Die Ableitungen des Folds an der Nachricht (KONZEPT-NACHRICHTEN.md §9).
 *
 * Eigene Datei, weil `fold.ts` Altbestand über jeder Größengrenze ist; der
 * Fold ruft sie in `materialisiere` und sonst nirgends. Hier steht, was der
 * Katalog nicht sagen kann:
 *
 *  * der abgeleitete `laufzustand` je Nachricht — eine reine Funktion der
 *    Felder und der Parameter `sichtungAuchAusgang` und `ldfStation`
 *    (additiv; die Präsenz entscheidet hier nichts), also nach §3.1 aus dem
 *    Zustand entscheidbar und nach jedem Schnappschuss gleich;
 *  * der Hinweis `nachweisnummerDoppelt`, nach §3.8 bei jeder
 *    Materialisierung neu gerechnet: Er verschwindet von selbst, sobald eine
 *    der beiden Nachrichten eine andere Nummer trägt oder zurückgezogen ist;
 *  * `unbekannterWert` für die offenen Bereiche **innerhalb** der
 *    Strukturwerte (Mittel und Kopiefarbe des Verteilers). Die allgemeine
 *    Prüfung in `fold.ts` sieht nur Felder, deren Wert selbst eine
 *    Zeichenkette ist. **Die Stelle wird nicht geprüft:** Freie Namen
 *    („Polizei“ als Verbindungsstelle, „DRK“ als Fachberater) sind der
 *    Normalfall und kein Fremdwert einer neueren Fassung (§4).
 */

import { NACHRICHT_KOPIEN, NACHRICHT_MITTEL } from "./ereignis.js";
import { kanonischeSerialisierung, vergleicheNachCodepunkt, type KanonischerWert } from "./kanonisch.js";
import type { Laufzustand } from "./zustand-nachricht.js";
import type { Feld, Konflikthinweis } from "./zustand.js";

/** Was der Fold je Nachricht gebaut hat — strukturell, damit `fold.ts` nichts exportieren muss. */
export interface GebauteNachricht {
  readonly werte: Record<string, unknown>;
  readonly felder: ReadonlyMap<string, Feld<unknown>>;
}

const BEKANNTE_KOPIEN: ReadonlySet<string> = new Set(NACHRICHT_KOPIEN);
const BEKANNTE_MITTEL: ReadonlySet<string> = new Set(NACHRICHT_MITTEL);

function alsObjekt(wert: unknown): Record<string, unknown> | undefined {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert)
    ? (wert as Record<string, unknown>)
    : undefined;
}

/**
 * Die Stellen des geltenden Verteilers, in seiner Reihenfolge und ohne
 * Wiederholung; mit `weitere` (die streitige zweite Sichtung) dahinter
 * deren Stellen, die noch fehlen.
 */
export function verteilerstellen(sichtung: unknown, weitere?: unknown): readonly string[] {
  const stellen: string[] = [];
  for (const quelle of [sichtung, weitere]) {
    const verteiler = alsObjekt(quelle)?.["verteiler"];
    if (!Array.isArray(verteiler)) continue;
    for (const eintrag of verteiler) {
      const stelle = alsObjekt(eintrag)?.["stelle"];
      if (typeof stelle === "string" && !stellen.includes(stelle)) stellen.push(stelle);
    }
  }
  return stellen;
}

function gleich(a: unknown, b: unknown): boolean {
  return kanonischeSerialisierung(a as KanonischerWert) === kanonischeSerialisierung(b as KanonischerWert);
}

/**
 * Die zweite, verdrängte Sichtung, solange zwei Sichter ohne voneinander zu
 * wissen gesichtet haben (§5 „Sichtung": „die Nachricht steht bei beiden
 * Verteilern"). Dieselbe Bedingung wie `vorherPasstNicht` in `fold.ts`: Der
 * Gewinner hat einen Vorher-Wert mitgeführt, der nicht die zweithöchste
 * Beobachtung ist, und beide Werte unterscheiden sich. Eine Nachsichtung mit
 * passendem Vorher-Wert („2. Sichtung") bereinigt den Stand; eine Rücknahme
 * (`undoOf`) oder eine gelöschte Sichtung vereinigt nichts.
 */
export function streitigeSichtung(feld: Feld<unknown> | undefined): Record<string, unknown> | undefined {
  const zweiter = feld?.zweiter;
  if (feld === undefined || zweiter === undefined || feld.undoOf !== undefined) return undefined;
  const gewinner = alsObjekt(feld.wert);
  const verdraengt = alsObjekt(zweiter.wert);
  if (gewinner === undefined || verdraengt === undefined || feld.gesehenerVorher === undefined) return undefined;
  if (gleich(feld.gesehenerVorher.wert, zweiter.wert) || gleich(feld.wert, zweiter.wert)) return undefined;
  return verdraengt;
}

/**
 * Die Parameter des Einsatzes, die den Laufweg bestimmen. Ein Wahrheitswert
 * allein ist `sichtungAuchAusgang` — so riefen Fold und Tests vor dem LdF.
 */
export interface Laufwegparameter {
  readonly sichtungAuchAusgang: boolean;
  /** Der LdF ist eigene Station (additiv, 2026-11-17); fehlt = nein. */
  readonly ldfStation?: boolean;
}

function alsParameter(parameter: boolean | Laufwegparameter): Laufwegparameter {
  return typeof parameter === "boolean" ? { sichtungAuchAusgang: parameter } : parameter;
}

function hat(felder: ReadonlyMap<string, Feld<unknown>>, name: string): boolean {
  return alsObjekt(felder.get(name)?.wert) !== undefined;
}

/**
 * Steht die Nachricht beim LdF? Nur mit dem Parameter: ein Ausgang, der
 * angenommen ist, aber weder einen Übermittlungsvorschlag trägt noch
 * befördert ist (Folie 22: der LdF legt das Mittel fest, bevor der
 * Fernmelder übermittelt — `NachrichtUebermittlungVorgeschlagen`); ein Eingang
 * der FmZ (mit Aufnahmevermerk), der weder weitergegeben noch gesichtet ist
 * (Stabsdienstordnung: Fernmelder → LdF → Sichter). Ohne Annahme steht der
 * Ausgang noch vor der FmZ, ohne Aufnahme lief der Eingang nicht über sie.
 */
function vorLdf(felder: ReadonlyMap<string, Feld<unknown>>, ausgang: boolean): boolean {
  if (ausgang) return hat(felder, "annahme") && !hat(felder, "vorschlag") && !hat(felder, "befoerderung");
  return hat(felder, "aufnahme") && !hat(felder, "weitergabe") && !hat(felder, "sichtung");
}

/**
 * Der Laufzustand aus §9. Die Reihenfolge der Prüfungen ist die Regel:
 * zurückgezogen schlägt alles; mit `ldfStation` steht eine Nachricht vor
 * dem LdF, solange er sie nicht bearbeitet hat; ein Ausgang (keine
 * Gesprächsnotiz) ohne Beförderung steht vor der FmZ; ungesichtet läuft er
 * danach nur bei `sichtungAuchAusgang` zum Sichter, sonst ist sein Weg zu
 * Ende; gesichtet zählt allein der Verteiler.
 */
export function laufzustandAus(
  felder: ReadonlyMap<string, Feld<unknown>>,
  parameter: boolean | Laufwegparameter,
): Laufzustand {
  const { sichtungAuchAusgang, ldfStation } = alsParameter(parameter);
  if (felder.get("entfernt")?.wert === true) return "ZURUECKGEZOGEN";
  const ausgang = felder.get("richtung")?.wert === "AUSGANG";
  const notiz = felder.get("gespraechsnotiz")?.wert === true;
  if (ldfStation === true && !notiz && vorLdf(felder, ausgang)) return "VOR_LDF";
  if (ausgang && !notiz && !hat(felder, "befoerderung")) return "VOR_FMZ";
  const sichtung = alsObjekt(felder.get("sichtung")?.wert);
  if (sichtung === undefined) {
    if (ausgang && !notiz) return sichtungAuchAusgang ? "VOR_SICHTER" : "ERLEDIGT";
    return "VOR_SICHTER";
  }
  const offen = verteilerstellen(sichtung, streitigeSichtung(felder.get("sichtung"))).some((stelle) => felder.get(`erledigt/${stelle}`)?.wert !== true);
  return offen ? "VERTEILT" : "ERLEDIGT";
}

/** `unbekannterWert` an den offenen Bereichen innerhalb der Vermerke (§3.7). */
function strukturHinweise(id: string, felder: ReadonlyMap<string, Feld<unknown>>, hinweise: Konflikthinweis[]): void {
  for (const name of ["aufnahme", "befoerderung", "vorschlag"]) {
    const mittel = alsObjekt(felder.get(name)?.wert)?.["mittel"];
    if (typeof mittel === "string" && !BEKANNTE_MITTEL.has(mittel)) {
      hinweise.push({ art: "unbekannterWert", feldpfad: `nachricht/${id}/${name}`, wert: mittel });
    }
  }
  const verteiler = alsObjekt(felder.get("sichtung")?.wert)?.["verteiler"];
  if (!Array.isArray(verteiler)) return;
  for (const eintrag of verteiler) {
    const kopie = alsObjekt(eintrag)?.["kopie"];
    if (typeof kopie === "string" && !BEKANNTE_KOPIEN.has(kopie)) {
      hinweise.push({ art: "unbekannterWert", feldpfad: `nachricht/${id}/sichtung`, wert: kopie });
    }
  }
}

/**
 * Je Nummer ein Hinweis, wenn zwei oder mehr nicht zurückgezogene Nachrichten
 * sie tragen (§9: „zeigen, nicht raten"). Die Nummer bleibt bei beiden stehen;
 * berichtigt wird durch ein neues `NachrichtNachgewiesen`.
 */
function nummernHinweise(nachrichten: ReadonlyMap<string, GebauteNachricht>, hinweise: Konflikthinweis[]): void {
  const nachNummer = new Map<number, { id: string; durch: string }[]>();
  for (const [id, nachricht] of nachrichten) {
    if (nachricht.felder.get("entfernt")?.wert === true) continue;
    const nachweis = nachricht.felder.get("nachweis");
    const nummer = alsObjekt(nachweis?.wert)?.["nummer"];
    if (typeof nummer !== "number") continue;
    nachNummer.set(nummer, [...(nachNummer.get(nummer) ?? []), { id, durch: nachweis?.durch ?? "" }]);
  }
  for (const [nummer, treffer] of nachNummer) {
    if (treffer.length < 2) continue;
    const ids = treffer.map((t) => t.id).sort(vergleicheNachCodepunkt);
    hinweise.push({
      art: "nachweisnummerDoppelt",
      feldpfad: `nachricht/${ids[0] as string}/nachweis`,
      nummer,
      ids,
      ereignisse: treffer.map((t) => t.durch).sort(vergleicheNachCodepunkt),
    });
  }
}

/**
 * Baut die Sammlung `nachrichten` mit Laufzustand und legt die Hinweise ab.
 *
 * @param parameter die geltenden Parameter des Einsatzes (`sichtungAuchAusgang`,
 *   `ldfStation`); ein Wahrheitswert allein ist `sichtungAuchAusgang`. Fehlt einer, gilt nein.
 */
export function baueNachrichten(
  nachrichten: ReadonlyMap<string, GebauteNachricht>,
  parameter: boolean | Laufwegparameter,
  hinweise: Konflikthinweis[],
): Map<string, unknown> {
  const ergebnis = new Map<string, unknown>();
  for (const [id, nachricht] of nachrichten) {
    strukturHinweise(id, nachricht.felder, hinweise);
    ergebnis.set(id, { ...nachricht.werte, laufzustand: laufzustandAus(nachricht.felder, parameter) });
  }
  nummernHinweise(nachrichten, hinweise);
  return ergebnis;
}
