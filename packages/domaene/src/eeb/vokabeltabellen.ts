/**
 * Die Nachschlagetabellen `code → Text` fuer den Bogenadapter.
 *
 * Ein Erfassungsbogen traegt Einheitstyp, Hierarchie-Ebene, Fahrzeugtyp,
 * Funktionen und Funkruf-Kennwort als **Vokabularcodes**. Deren Bedeutung
 * haengt an der Organisation des Bogens: Code 3 ist beim THW der „Zugtrupp
 * Technischer Zug", bei einer anderen Organisation nichts. Ohne diese
 * Tabellen schreibt der Adapter `#3` in die Lage — lesbar fuer niemanden.
 *
 * Die Zuordnung Organisation → Tabelle kommt aus dem geteilten Kern
 * (`@bos/meldekopf`, `vokabularFuer`), damit Erfassungsbogen und
 * S1-Control dieselben Codes gleich lesen.
 *
 * Die Textform folgt dem Ort, an dem der Wert steht:
 * - **Einheitstyp und Ebene als Name** — der Einheitstyp speist die
 *   Bezeichnung und die Ebenen-Inferenz (`ebeneAusEinheitstyp` erkennt
 *   „Zugtrupp", nicht „ZTr TZ").
 * - **Fahrzeugtyp, Funktion, Kennwort als Kurzform** — so stehen sie auf dem
 *   Papierbogen und in den Spalten der Einheitenliste („FüKW", „GrFü",
 *   „Heros").
 */

import type { OrganisationsTyp } from "@bos/eeb-format";
import { vokabularFuer } from "@bos/meldekopf";

import type { NameJeCode, Vokabeltabellen } from "./adapter.js";

type Vokabelart = Parameters<typeof vokabularFuer>[1];

function nachschlagen(
  org: OrganisationsTyp,
  art: Vokabelart,
  form: "kurz" | "name",
): NameJeCode {
  const tabelle = vokabularFuer(org, art);
  return (code) => tabelle.find((eintrag) => eintrag.code === code)?.[form];
}

/** Die Tabellen fuer einen Bogen der Organisation `org`. */
export function vokabeltabellenFuer(org: OrganisationsTyp): Vokabeltabellen {
  return {
    einheitstyp: nachschlagen(org, "einheitstyp", "name"),
    hierarchieEbene: nachschlagen(org, "ebene", "name"),
    fahrzeugtyp: nachschlagen(org, "fahrzeug", "kurz"),
    funktion: nachschlagen(org, "funktion", "kurz"),
    funkrufKennwort: nachschlagen(org, "kennwort", "kurz"),
  };
}
