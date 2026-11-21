/**
 * Die Undo-Gruppe: ein Bedienschritt mit seinen Folgeschritten als **ein**
 * Eintrag des Stapels (Audits Nachrichten Runde 2: R2-LdF P2-8, R2-FM P3-1,
 * R2-FaBe P2-8; KONZEPT-EREIGNISSE.md §6, Nachtrag „Undo-Gruppe“).
 *
 * Nach „Befördern“ standen im Stapel bis zu fünf eigene Ereignisse: die
 * Beförderung und die Folgeschritte des Workers (Annahme, Nummer, Kontakt im
 * Funkplan, Kopien an S2 und den Verfasser). „Rückgängig“ nannte den
 * obersten — „Nachricht A 3 gesichtet“ —, nahm nur ihn zurück, und wer
 * dreimal drückte, wusste nicht, wann er fertig war. Nach „Aufgeben“ nannte
 * er einen älteren Schritt, weil die Anlage selbst nicht rücknehmbar ist.
 *
 * **Was hier geregelt wird, ist Bedienung, nicht Undo.** Jedes Ereignis bleibt
 * je für sich ein Gegenereignis nach U1, auf dem Stapel nach U3, ohne Redo
 * (U5), mit Hinweis gegen Fremdänderung (U6). Die Gruppe fasst nur zusammen,
 * was der Bediener als einen Schritt getan hat: Folgeschritte tragen in der
 * Nutzlast `folgeVon` mit der Ereignis-Id des Hauptschritts. Der Stapel liegt
 * damit weiter nirgends (U3) — die Zugehörigkeit steht in den Ereignissen.
 */

import { KATALOG } from "./katalog/index.js";
import type { EingehendesEreignis } from "./fold.js";
import type { EreignisId } from "./ereignis.js";
import type { StapelEintrag } from "./undo.js";

/** Der Schlüssel der Nutzlast, den Folgeschritte tragen. */
export const FOLGE_VON = "folgeVon";

function objekt(wert: unknown): Record<string, unknown> | undefined {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert) ? (wert as Record<string, unknown>) : undefined;
}

/** Der Hauptschritt, zu dem ein Ereignis gehört — oder das Ereignis selbst. */
export function gruppenkennung(ereignis: Pick<EingehendesEreignis, "id" | "nutzlast">): EreignisId {
  const folge = objekt(ereignis.nutzlast)?.[FOLGE_VON];
  return typeof folge === "string" && folge !== "" ? folge : ereignis.id;
}

/**
 * Die Einträge der obersten Gruppe, neuestes zuerst — die Reihenfolge der
 * Rücknahme. Ohne Folgeschritte ist das der oberste Eintrag allein.
 */
export function obersteGruppe(eintraege: readonly StapelEintrag[]): readonly StapelEintrag[] {
  const oberster = eintraege[0];
  if (oberster === undefined) return [];
  const kennung = gruppenkennung(oberster.ereignis);
  return eintraege.filter((e) => gruppenkennung(e.ereignis) === kennung);
}

const TEILWORT: Readonly<Record<string, string>> = {
  NachrichtAngenommen: "Annahme",
  NachrichtNachgewiesen: "Nummer",
  NachrichtGesichtet: "Sichtung",
  NachrichtWeitergegeben: "Weitergabe",
  NachrichtUebermittlungVorgeschlagen: "Vorschlag",
  NachrichtBefoerdert: "Beförderung",
  FunkprobeDurchgefuehrt: "Kontakt im Funkplan",
  EinheitRufgruppeGesetzt: "Rufgruppe der Einheit",
};

/** Der Bedienschritt in Worten, wie die Maske ihn nennt. */
function hauptwort(haupt: EingehendesEreignis | undefined): string | undefined {
  if (haupt === undefined) return undefined;
  const n = objekt(haupt.nutzlast) ?? {};
  if (haupt.typ === "NachrichtVerfasst") {
    if (haupt.grund?.startsWith("vom Papier nachgetragen") === true) return "Vom Papier nachtragen";
    if (n["gespraechsnotiz"] === true) return "Gesprächsnotiz aufgeben";
    if (n["richtung"] === "AUSGANG") return "Nachricht aufgeben";
    return objekt(n["aufnahme"]) === undefined ? "Eingang erfassen" : "Eingang aufnehmen";
  }
  if (haupt.typ === "NachrichtBefoerdert") return "Befördern";
  if (haupt.typ === "NachrichtWeitergegeben") return "An den Sichter weitergeben";
  if (haupt.typ === "NachrichtGesichtet") return "Sichten";
  return undefined;
}

/** „A“, „A und B“, „A, B und C“. */
function aufzaehlung(teile: readonly string[]): string {
  if (teile.length <= 1) return teile.join("");
  return `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1] as string}`;
}

/** Die Kopien nach der Beförderung heißen so, nicht „Sichtung“ (R2-ETB P1-1). */
function teilwort(e: EingehendesEreignis): string | undefined {
  if (e.typ === "NachrichtGesichtet" && e.grund === "Kopien nach Beförderung") return "Kopien";
  return TEILWORT[e.typ];
}

/**
 * Die Bezeichnung der Gruppe: „Eingang aufnehmen (mit Nummer und Sichtung)“,
 * „Befördern (mit Annahme, Nummer und Kopien)“. `haupt` ist das Ereignis des
 * Hauptschritts, auch wenn es selbst nicht auf dem Stapel steht (die Anlage
 * einer Nachricht ist nicht rücknehmbar). `undefined` für einen Eintrag ohne
 * Folgeschritte — dann gilt die bisherige Anzeige aus Art und Gegenstand.
 */
export function gruppenbezeichnung(teile: readonly StapelEintrag[], haupt: EingehendesEreignis | undefined): string | undefined {
  const folgen = teile.filter((t) => gruppenkennung(t.ereignis) !== t.id);
  if (folgen.length === 0) return undefined;
  const wort = hauptwort(haupt) ?? "Bedienschritt";
  const namen = [...new Set([...folgen].reverse().map((t) => teilwort(t.ereignis)).filter((t): t is string => t !== undefined))];
  return namen.length === 0 ? wort : `${wort} (mit ${aufzaehlung(namen)})`;
}

/**
 * Steht der Hauptschritt selbst nicht auf dem Stapel (die Anlage einer
 * Nachricht), bleibt er nach der Rücknahme der Gruppe stehen. Der Satz sagt es.
 */
export function gruppenrest(haupt: EingehendesEreignis | undefined, teile: readonly StapelEintrag[]): string | undefined {
  if (haupt === undefined || teile.some((t) => t.id === haupt.id)) return undefined;
  return ohneRuecknahmeHinweis(haupt.typ);
}

/**
 * Warum der jüngste eigene Schritt nicht rücknehmbar ist und was stattdessen
 * gilt (R2-FaBe P2-8: nach „Aufgeben“ nannte „Rückgängig“ einen älteren Schritt).
 */
export function ohneRuecknahmeHinweis(typ: string): string {
  if (typ === "NachrichtVerfasst") return "Die Nachricht selbst bleibt: Eine aufgegebene oder aufgenommene Nachricht wird nicht rückgängig gemacht, sondern mit Grund zurückgezogen.";
  if (typ === "NachrichtKenntnisGenommen") return "Gelesen ist gelesen: Die Kenntnisnahme bleibt stehen.";
  if (typ === "NachrichtZurueckgezogen") return "Das Zurückziehen bleibt stehen; die Nachricht wird neu aufgegeben, wenn sie doch gilt.";
  if (typ === "EtbEintragErfasst" || typ === "EtbEintragBerichtigt") return "Ein Tagebucheintrag wird berichtigt, nicht rückgängig gemacht.";
  return "Dieser Schritt lässt sich nicht rückgängig machen.";
}

/** Darf die Art auf den Stapel? Dieselbe Regel wie `darfAufDenStapel` in `undo.ts`. */
export function ruecknehmbar(ereignis: Pick<EingehendesEreignis, "typ" | "undoOf">): boolean {
  const eintrag = KATALOG.get(ereignis.typ);
  return ereignis.undoOf === undefined && eintrag !== undefined && eintrag.ohneUndo !== true;
}
