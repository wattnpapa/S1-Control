/**
 * Nachricht und Lage verbinden (R2-ETB P2-6).
 *
 * Das Schema der Domäne kennt `anschriftBezug` und `absenderBezug`
 * (`schemata-nachrichten.ts`: Einheit, Abschnitt, Fahrzeug, Anforderung,
 * Stelle), die Oberfläche schrieb sie nicht: Anschrift und Absender waren
 * Freitext, auch wenn die Maske Einheiten und Abschnitte vorschlug. Jetzt
 * gilt: Steht in Anschrift oder Absender **genau** der Name einer Einheit
 * oder eines Abschnitts der Lage, trägt die Anlage den Bezug mit. Ein
 * Freitext („OV Wildeshausen“) bleibt ohne Bezug — geraten wird nicht.
 *
 * Die Lese-Ansicht zeigt den Bezug als „In der Lage zeigen“: Das Blatt Lage
 * schlägt auf, mit dem Abschnitt bzw. der Einheit gewählt
 * ({@link zeigeInLage}, die Lage hört auf {@link useLagesprung}).
 *
 * Die Zeile trägt den Bezug, sobald der Domänenschnitt ihn liefert; bis
 * dahin wird er optional gelesen ({@link bezugDerZeile}).
 */

import { create } from "zustand";

import type { Nachrichtenzeile } from "@s1/domaene";

/** Ein Bezug wie im Schema (`zNachrichtenbezug`). */
export interface Nachrichtenbezug {
  readonly entitaet: "EINHEIT" | "ABSCHNITT" | "FAHRZEUG" | "ANFORDERUNG" | "STELLE";
  readonly id: string;
}

/** Ein Name der Lage mit seiner Kennung: Einheit (aus den Gegenstellen) oder Abschnitt (aus dem Baum). */
export interface Bezugsziel {
  readonly name: string;
  readonly bezug: Nachrichtenbezug;
}

const norm = (text: string): string => text.trim().replace(/\s+/gu, " ").toLocaleLowerCase("de");

/** Die Ziele aus Einheiten und Abschnitten; Systemabschnitte (Eingang, Archiv) sind kein Ziel. */
export function bezugsziele(
  einheiten: readonly { readonly einheitId: string; readonly name: string }[],
  abschnitte: readonly { readonly id: string; readonly name: string; readonly systemAbschnitt?: boolean }[],
): readonly Bezugsziel[] {
  return [
    ...einheiten.map((e) => ({ name: e.name, bezug: { entitaet: "EINHEIT" as const, id: e.einheitId } })),
    ...abschnitte.filter((a) => a.systemAbschnitt !== true).map((a) => ({ name: a.name, bezug: { entitaet: "ABSCHNITT" as const, id: a.id } })),
  ];
}

/** Der Bezug zum Text, wenn er genau einem Ziel gleicht (ohne Groß-/Kleinschreibung); bei mehreren Treffern keiner. */
export function bezugAus(text: string, ziele: readonly Bezugsziel[]): Nachrichtenbezug | undefined {
  const gesucht = norm(text);
  if (gesucht === "") return undefined;
  const treffer = ziele.filter((z) => norm(z.name) === gesucht);
  return treffer.length === 1 ? treffer[0]?.bezug : undefined;
}

/** Die Bezüge für die Anlage: nur, was gefunden wurde. */
export function bezuegeAus(anschrift: string, absender: string, ziele: readonly Bezugsziel[]): { readonly anschriftBezug?: Nachrichtenbezug; readonly absenderBezug?: Nachrichtenbezug } {
  const an = bezugAus(anschrift, ziele);
  const von = bezugAus(absender, ziele);
  return { ...(an === undefined ? {} : { anschriftBezug: an }), ...(von === undefined ? {} : { absenderBezug: von }) };
}

function alsBezug(wert: unknown): Nachrichtenbezug | undefined {
  if (wert === null || typeof wert !== "object") return undefined;
  const w = wert as { readonly entitaet?: unknown; readonly id?: unknown };
  return typeof w.entitaet === "string" && typeof w.id === "string" ? { entitaet: w.entitaet as Nachrichtenbezug["entitaet"], id: w.id } : undefined;
}

/** Die Bezüge der Zeile, die in der Lage zu zeigen sind (Einheit, Abschnitt); optional gelesen (anderer Strang). */
export function bezugDerZeile(zeile: Nachrichtenzeile): readonly { readonly rolle: "Anschrift" | "Absender"; readonly bezug: Nachrichtenbezug }[] {
  const z = zeile as { readonly anschriftBezug?: unknown; readonly absenderBezug?: unknown };
  const liste = [
    { rolle: "Anschrift" as const, bezug: alsBezug(z.anschriftBezug) },
    { rolle: "Absender" as const, bezug: alsBezug(z.absenderBezug) },
  ];
  return liste.filter((e): e is { rolle: "Anschrift" | "Absender"; bezug: Nachrichtenbezug } => e.bezug !== undefined && (e.bezug.entitaet === "EINHEIT" || e.bezug.entitaet === "ABSCHNITT"));
}

/** Der Sprung in die Lage: welcher Abschnitt oder welche Einheit gewählt werden soll; `folge` zählt jeden Sprung. */
export interface Lagesprung {
  readonly folge: number;
  readonly abschnittId?: string | undefined;
  readonly einheitId?: string | undefined;
}

export const useLagesprung = create<Lagesprung>(() => ({ folge: 0 }));

/** Wählt in der Lage den Abschnitt bzw. die Einheit des Bezugs; das Blatt schlägt der Aufrufer auf. */
export function zeigeInLage(bezug: Nachrichtenbezug): void {
  const folge = useLagesprung.getState().folge + 1;
  useLagesprung.setState(bezug.entitaet === "ABSCHNITT" ? { folge, abschnittId: bezug.id, einheitId: undefined } : { folge, abschnittId: undefined, einheitId: bezug.id }, true);
}
