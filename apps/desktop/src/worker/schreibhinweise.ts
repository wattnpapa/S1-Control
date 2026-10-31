/**
 * Hinweise zu einem **geschriebenen** Bedienschritt (additives Ergebnisfeld
 * `warnungen` und `abloesungOffen`).
 *
 * Gerechnet wird gegen den Zustand **nach** dem Schreiben. Nichts davon lehnt
 * ab: Zwei Gruppen „Gr San“ im selben Abschnitt oder zwei Anforderungen mit
 * derselben Kennung kommen im Einsatz vor, und eine Ablehnung hielte im
 * ungünstigen Moment die Meldung auf. Die Warnung sagt, dass die Zeilen nicht
 * mehr zu unterscheiden sind, und nennt den Ausweg. Die exakte Wiederholung
 * derselben Anfrage fängt die Idempotenz über die Anfrage-Kennung ab; sie ist
 * hier nicht berührt.
 */

import { kennzahlen, projektion, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

import type { Bedienergebnis } from "../kontrakt/index.js";

type Geschrieben = Extract<Bedienergebnis, { art: "geschrieben" }>;
export type Schreibhinweise = Pick<Geschrieben, "warnungen" | "abloesungOffen">;

function norm(wert: unknown): string {
  return typeof wert === "string" ? wert.trim().toLowerCase() : "";
}

function nutzlastText(entwurf: Ereignisentwurf, schluessel: string): string | undefined {
  const wert = ((entwurf.nutzlast ?? {}) as Record<string, unknown>)[schluessel];
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

function dublettenAnforderung(zustand: Zustand, entwurf: Ereignisentwurf): string | undefined {
  const id = nutzlastText(entwurf, "anforderungId");
  const kennung = norm(nutzlastText(entwurf, "kennung"));
  if (id === undefined || kennung === "") return undefined;
  const andere = Object.values(zustand.anforderungen).filter(
    (a) => a.id !== id && norm(a.kennung?.wert) === kennung && a.zustand !== "STORNIERT",
  );
  if (andere.length === 0) return undefined;
  return `Die Kennung „${nutzlastText(entwurf, "kennung") ?? ""}“ gibt es schon bei einer anderen Anforderung. Die Zeilen sind dann nicht zu unterscheiden — bitte eine der beiden ändern oder stornieren.`;
}

function dublettenAbschnitt(zustand: Zustand, entwurf: Ereignisentwurf): string | undefined {
  const id = nutzlastText(entwurf, "abschnittId");
  const name = norm(nutzlastText(entwurf, "name"));
  const neu = id === undefined ? undefined : zustand.abschnitte[id];
  if (neu === undefined || name === "") return undefined;
  const eltern = neu.parentId?.wert ?? null;
  const gleich = Object.values(zustand.abschnitte).some(
    (a) => a.id !== id && norm(a.name.wert) === name && (a.parentId?.wert ?? null) === eltern,
  );
  return gleich
    ? `Im selben übergeordneten Abschnitt gibt es schon einen Abschnitt „${nutzlastText(entwurf, "name") ?? ""}“. Die Zeilen sind nicht zu unterscheiden — bitte einen umbenennen.`
    : undefined;
}

function dublettenEinheit(zustand: Zustand, einheitId: string | undefined): string | undefined {
  const neu = einheitId === undefined ? undefined : zustand.einheiten[einheitId];
  if (neu === undefined) return undefined;
  const name = norm(neu.bezeichnung.wert);
  const abschnitt = neu.abschnittId.wert;
  if (name === "") return undefined;
  const gleich = Object.values(zustand.einheiten).some(
    (e) => e.id !== neu.id && norm(e.bezeichnung.wert) === name && e.abschnittId.wert === abschnitt &&
      kennzahlen.zaehlklasse(zustand, e) !== "ausserhalb",
  );
  return gleich
    ? `Im selben Abschnitt gibt es schon eine Einheit „${String(neu.bezeichnung.wert)}“. Die Zeilen sind nicht zu unterscheiden — bitte eine umbenennen, wenn es nicht dieselbe Einheit ist.`
    : undefined;
}

function dublette(zustand: Zustand, entwurf: Ereignisentwurf): string | undefined {
  switch (entwurf.typ) {
    case "AnforderungAngelegt":
      return dublettenAnforderung(zustand, entwurf);
    case "AbschnittAngelegt":
      return dublettenAbschnitt(zustand, entwurf);
    case "EinheitGemeldet":
      return dublettenEinheit(zustand, nutzlastText(entwurf, "einheitId"));
    case "EinheitAufgeteilt":
      return dublettenEinheit(zustand, nutzlastText(entwurf, "neueEinheitId"));
    default:
      return undefined;
  }
}

/** Die offene Ablösung der Anforderung, wenn der Entwurf ein Eintreffen war. */
function offeneAbloesung(zustand: Zustand, entwurf: Ereignisentwurf): Schreibhinweise["abloesungOffen"] {
  if (entwurf.typ !== "AnforderungErledigt") return undefined;
  const anforderungId = nutzlastText(entwurf, "anforderungId");
  return projektion.offeneAbloesungen(zustand).find((o) => o.anforderungId === anforderungId);
}

/**
 * Sammelt die Hinweise zu einem geschriebenen Entwurf; `vorab` sind die
 * Sätze, die die Folgeschritte schon mitbringen.
 */
export function schreibhinweise(zustand: Zustand, entwurf: Ereignisentwurf, vorab: readonly string[]): Schreibhinweise {
  const offen = offeneAbloesung(zustand, entwurf);
  const warnungen = [
    ...vorab,
    ...[dublette(zustand, entwurf)].filter((t): t is string => t !== undefined),
    ...(offen === undefined
      ? []
      : [
          `Die abgelöste Einheit „${offen.abgeloesteBezeichnung}“ zählt noch zur Ist-Stärke, obwohl „${offen.abloesendeBezeichnung}“ eingetroffen ist. Soll sie zurückgeführt werden?`,
        ]),
  ];
  return {
    ...(warnungen.length === 0 ? {} : { warnungen }),
    ...(offen === undefined ? {} : { abloesungOffen: offen }),
  };
}
