/**
 * Der Kontakt im Funkplan als Folgeschritt einer Nachricht — herausgelöst aus
 * `nachrichtenfolgen.ts` (AGENTS.md §6).
 *
 * Jede Nachricht, die per Funk mit einer Einheit der Lage läuft, ist ein
 * Funkkontakt: der Ausgang beim Befördern (Quittung der Gegenstelle), der
 * Eingang beim Aufnehmen durch die FmZ (Uhrzeit der Aufnahme). Der Funkplan
 * zeigt „letzter Kontakt“ aus der jüngsten Funkprobe „Kontakt“.
 *
 * - **Rufgruppe des Kontakts**: Die Maske schickt die Rufgruppe mit, über die
 *   gesprochen wurde (`kontaktRufgruppeId`), vorbelegt mit der Hauptrufgruppe
 *   der Einheit. Fehlt sie oder ist sie unbekannt oder aufgelöst, trägt die
 *   Probe die Hauptrufgruppe wie bisher.
 * - **Einheit ohne Rufgruppe**: Hat die Einheit keine geltende Hauptrufgruppe
 *   (keine, unbekannte oder aufgelöste — der Funkplan führt sie dann unter
 *   „ohne Rufgruppe“), wird sie der gewählten Gruppe zugeordnet. Eine schon
 *   zugeordnete Einheit wird nie umgesetzt: Ob ein Spruch auf einer anderen
 *   Gruppe ein Gruppenwechsel ist, weiß nur die Führungsstelle.
 *
 * Beide Schritte sind Folgeschritte des Nachrichtenschritts; „Rückgängig“
 * nimmt sie mit ihm zurück (`undogruppe.ts`). Der Vorher-Wert ist, was der
 * Zustand zuletzt sah; die Zuordnung prüft ihn, damit sie keine Gruppe
 * überschreibt, die ein anderer Platz inzwischen gesetzt hat.
 */

import { projektion, type EinheitZustand, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

import type { PruefbarerEntwurf } from "./vorwertpruefung.js";

/** Was die Maske für den Kontakt mitschickt (`nachrichtenfolge`). */
export interface Kontaktwunsch {
  readonly einheitId: string;
  readonly zeitpunkt: string;
  readonly rufgruppeId?: string;
}

export interface Kontaktplan {
  readonly folgen: readonly { readonly entwurf: Ereignisentwurf; readonly hinweis: string }[];
  readonly hinweise: readonly string[];
}

const KEIN_PLAN: Kontaktplan = { folgen: [], hinweise: [] };

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

/** Der Wunsch aus `nachrichtenfolge` des Entwurfs mit der Zeit des Kontakts; ohne Einheit keiner. */
export function kontaktwunsch(entwurf: Ereignisentwurf, zeitpunkt: unknown): Kontaktwunsch | undefined {
  const folge = (entwurf as { readonly nachrichtenfolge?: { readonly kontaktEinheitId?: unknown; readonly kontaktRufgruppeId?: unknown } }).nachrichtenfolge;
  const einheitId = text(folge?.kontaktEinheitId);
  const zeit = text(zeitpunkt);
  if (einheitId === undefined || zeit === undefined) return undefined;
  const rufgruppeId = text(folge?.kontaktRufgruppeId);
  return { einheitId, zeitpunkt: zeit, ...(rufgruppeId === undefined ? {} : { rufgruppeId }) };
}

/** Die gewählte Gruppe, wenn sie im Einsatz gilt. */
function geltendeGruppe(zustand: Zustand, id: string | undefined): string | undefined {
  return id !== undefined && projektion.rufgruppeGilt(zustand.rufgruppen?.[id]) ? id : undefined;
}

function zuordnung(zustand: Zustand, einheit: EinheitZustand, gruppe: string, name: string): { entwurf: Ereignisentwurf; hinweis: string } {
  const vorher = text(einheit.rufgruppeId?.wert) ?? null;
  const r = zustand.rufgruppen?.[gruppe];
  const gruppenname = r === undefined ? gruppe : projektion.rufgruppenAnzeige(r);
  const entwurf: PruefbarerEntwurf = { typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId: einheit.id }, vorher, neu: gruppe, vorwertPruefen: true };
  return { entwurf, hinweis: `Funkplan: „${name}“ der Rufgruppe „${gruppenname}“ zugeordnet.` };
}

/**
 * Plant Kontakt und, wenn die Einheit ohne geltende Rufgruppe steht, die
 * Zuordnung zur gewählten Gruppe — gegen den Zustand **vor** dem Schreiben.
 */
export function planeFunkkontakt(zustand: Zustand, wunsch: Kontaktwunsch | undefined): Kontaktplan {
  const einheit = wunsch === undefined ? undefined : zustand.einheiten[wunsch.einheitId];
  if (wunsch === undefined || einheit === undefined || einheit.entfernt?.wert === true) return KEIN_PLAN;
  const name = text(einheit.bezeichnung.wert) ?? einheit.id;
  const haupt = text(einheit.rufgruppeId?.wert);
  const gewaehlt = geltendeGruppe(zustand, wunsch.rufgruppeId);
  const rufgruppeId = gewaehlt ?? haupt;
  const vorher = einheit.letzteFunkprobe?.KONTAKT?.wert ?? null;
  const neu = { zeitpunkt: wunsch.zeitpunkt, ...(rufgruppeId === undefined ? {} : { rufgruppeId }) };
  const kontakt = {
    entwurf: { typ: "FunkprobeDurchgefuehrt", nutzlast: { einheitId: einheit.id, ergebnis: "KONTAKT" }, vorher, neu } satisfies Ereignisentwurf,
    hinweis: `Funkplan: Kontakt mit „${name}“ vermerkt.`,
  };
  const ohneGruppe = geltendeGruppe(zustand, haupt) === undefined;
  const folgen = gewaehlt !== undefined && ohneGruppe ? [zuordnung(zustand, einheit, gewaehlt, name), kontakt] : [kontakt];
  const unbekannt = wunsch.rufgruppeId !== undefined && gewaehlt === undefined;
  return { folgen, hinweise: unbekannt ? ["Die gewählte Rufgruppe gilt nicht mehr; der Kontakt steht unter der Hauptrufgruppe."] : [] };
}
