/**
 * Die Tagebuchsätze zu Auftrag, Fahrzeug und Person einer Einheit (§5.5, §5.6).
 *
 * Der Zusammenbau in `tagebuch.ts` nennt bei einer Anlage nur den Gegenstand
 * und die Art: „F-3a…: Fahrzeug angelegt“. Bei einer Einheit genügt das, ihr
 * Name ist der Inhalt. Bei diesen drei Arten ist es zu wenig: Ein Auftrag hat
 * keinen Namen außer seinem Text, ein Fahrzeug wird über Typ und Kennzeichen
 * erkannt, und wer im Tagebuch sucht, sucht nach „Deich sichern“ oder nach
 * dem Kennzeichen, nicht nach einer Kennung. Der Satz nennt deshalb die
 * Einheit vorn — sie ist der Bezug, nach dem gefiltert wird — und die
 * Angaben der Anlage dahinter.
 *
 * Die Angaben kommen **aus der Nutzlast** und nicht aus dem Zustand: Das
 * Tagebuch erzählt, was damals erfasst wurde. Eine spätere Änderung steht in
 * ihrer eigenen Zeile.
 */

import { einheitsteilTitel } from "../beschriftungen-einheitsteile.js";
import type { EingehendesEreignis } from "../fold.js";
import type { Id } from "../werte.js";
import type { Zustand } from "../zustand.js";

function feld(ereignis: EingehendesEreignis, schluessel: string): string | undefined {
  const nutzlast = ereignis.nutzlast;
  if (typeof nutzlast !== "object" || nutzlast === null) return undefined;
  const wert = (nutzlast as Record<string, unknown>)[schluessel];
  return typeof wert === "string" && wert.trim() !== "" ? wert.trim() : undefined;
}

function text(wert: { readonly wert: unknown } | undefined): string | undefined {
  return typeof wert?.wert === "string" && wert.wert !== "" ? wert.wert : undefined;
}

/** Der Name eines Fahrzeugs im Tagebuch: Bezeichnung, sonst Typ, sonst Kennung. */
export function fahrzeugname(zustand: Zustand, id: Id): string {
  const fahrzeug = zustand.fahrzeuge[id];
  return text(fahrzeug?.bezeichnung) ?? text(fahrzeug?.typ) ?? id;
}

/** Ein Auftrag heißt, wie er lautet — einen anderen Namen hat er nicht. */
export function auftragsname(zustand: Zustand, id: Id): string {
  return text(zustand.auftraege[id]?.text) ?? id;
}

function fahrzeugangaben(ereignis: EingehendesEreignis): string {
  const name = [feld(ereignis, "typ"), feld(ereignis, "bezeichnung")]
    .filter((teil): teil is string => teil !== undefined)
    .join(" ");
  const kennzeichen = feld(ereignis, "kennzeichen");
  return kennzeichen === undefined ? name : `${name} (${kennzeichen})`;
}

function personenangaben(ereignis: EingehendesEreignis): string {
  const name = [feld(ereignis, "vorname"), feld(ereignis, "nachname")]
    .filter((teil): teil is string => teil !== undefined)
    .join(" ");
  const rolle = feld(ereignis, "rolle");
  return rolle === undefined ? name : `${name} (${einheitsteilTitel(rolle)})`;
}

const ANGABEN: Readonly<Record<string, (ereignis: EingehendesEreignis) => string>> = {
  AuftragErfasst: (ereignis) => feld(ereignis, "text") ?? "",
  FahrzeugAngelegt: fahrzeugangaben,
  PersonHinzugefuegt: personenangaben,
};

/**
 * Der Satz einer Anlage von Auftrag, Fahrzeug oder Person — oder `undefined`
 * für jede andere Art, die dann der allgemeine Zusammenbau übernimmt.
 */
export function einheitsteilAnlagesatz(
  zustand: Zustand,
  ereignis: EingehendesEreignis,
  kopf: string,
): string | undefined {
  const angaben = ANGABEN[ereignis.typ];
  if (angaben === undefined) return undefined;
  const einheitId = feld(ereignis, "einheitId");
  const einheit =
    einheitId === undefined ? undefined : (text(zustand.einheiten[einheitId]?.bezeichnung) ?? einheitId);
  const satz = angaben(ereignis);
  const rumpf = satz === "" ? kopf : `${kopf} — ${satz}`;
  return einheit === undefined ? rumpf : `${einheit}: ${rumpf}`;
}
