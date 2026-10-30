/**
 * Die Felder einer neuen Anforderung — im Blatt Anforderungen und in der
 * Maske „Ablösung anfordern“ der Einheitentabelle (M5.3).
 *
 * Zwei Stellen, eine Eingabe: Wer an der Einheit „Ablösung anfordern“ wählt,
 * soll dieselben Felder sehen wie im Blatt, nur mit der Einheit schon
 * eingetragen. Die Felder stehen deshalb hier und nicht zweimal, und den
 * Entwurf baut {@link anforderungAusEingabe} — ohne DOM prüfbar.
 */

import type { Einheitenwahl } from "@s1/domaene";

import { anforderungAnlegen } from "../kontrakt/bedienschritte.js";
import type { Entwurf } from "../kontrakt/index.js";

/** Was in die Felder getippt ist. */
export interface Anforderungseingabe {
  readonly kennung: string;
  /** Leer heißt: keine Ablösung, eine Anforderung zusätzlicher Kräfte. */
  readonly abzuloesendeEinheitId: string;
  readonly vorgeseheneEinheitText: string;
  readonly vorgesehenerAuftrag: string;
}

export const LEERE_ANFORDERUNG: Anforderungseingabe = {
  kennung: "",
  abzuloesendeEinheitId: "",
  vorgeseheneEinheitText: "",
  vorgesehenerAuftrag: "",
};

/**
 * Eine Kennung für eine neue Anforderung.
 *
 * Sie wird im Renderer gebildet und nicht im Worker, weil sie zur **Anlage**
 * gehört und die Anlage von hier kommt (§3.11). Zeitstempel plus Zufall
 * reicht: Kollidieren zwei Clients doch, gilt die kleinere HLC, und die
 * zweite Anlage steht in `verworfeneAnlagen`.
 */
export function neueAnforderungsId(): string {
  return `anf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function optional(schluessel: string, wert: string): Record<string, string> {
  const geputzt = wert.trim();
  return geputzt === "" ? {} : { [schluessel]: geputzt };
}

/** Ob die Eingabe eine Anforderung trägt: Ablösung, vorgesehene Einheit oder Auftrag. */
export function anforderungBereit(eingabe: Anforderungseingabe): boolean {
  return [eingabe.abzuloesendeEinheitId, eingabe.vorgeseheneEinheitText, eingabe.vorgesehenerAuftrag].some(
    (wert) => wert.trim() !== "",
  );
}

/** Der Entwurf aus der Eingabe — oder `undefined`, wenn nichts angefordert ist. */
export function anforderungAusEingabe(eingabe: Anforderungseingabe, angefordertAm: string): Entwurf | undefined {
  if (!anforderungBereit(eingabe)) return undefined;
  return anforderungAnlegen({
    anforderungId: neueAnforderungsId(),
    angefordertAm,
    ...optional("kennung", eingabe.kennung),
    ...optional("abzuloesendeEinheitId", eingabe.abzuloesendeEinheitId),
    ...optional("vorgeseheneEinheitText", eingabe.vorgeseheneEinheitText),
    ...optional("vorgesehenerAuftrag", eingabe.vorgesehenerAuftrag),
  });
}

export interface AnforderungsfelderEigenschaften {
  readonly eingabe: Anforderungseingabe;
  readonly aufEingabe: (eingabe: Anforderungseingabe) => void;
  /** Die Einheiten zur Wahl; fehlt sie, steht die Ablöse-Einheit fest. */
  readonly einheitenwahl?: readonly Einheitenwahl[];
  /** Enter im letzten Feld — im Blatt, wo kein Formular darum steht. */
  readonly aufEnter?: () => void;
}

export function Anforderungsfelder({
  eingabe,
  aufEingabe,
  einheitenwahl,
  aufEnter,
}: AnforderungsfelderEigenschaften): React.JSX.Element {
  const setze = (schluessel: keyof Anforderungseingabe) => (e: { target: { value: string } }) => {
    aufEingabe({ ...eingabe, [schluessel]: e.target.value });
  };
  return (
    <>
      <label>
        Kennung
        <input type="text" value={eingabe.kennung} onChange={setze("kennung")} />
      </label>
      {einheitenwahl !== undefined && (
        <label>
          Ablösung für
          <select value={eingabe.abzuloesendeEinheitId} onChange={setze("abzuloesendeEinheitId")}>
            <option value="">— keine —</option>
            {einheitenwahl.map((einheit) => (
              <option key={einheit.id} value={einheit.id}>
                {einheit.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Vorgesehene Einheit
        <input type="text" value={eingabe.vorgeseheneEinheitText} onChange={setze("vorgeseheneEinheitText")} />
      </label>
      <label>
        Vorgesehener Auftrag
        <input
          type="text"
          value={eingabe.vorgesehenerAuftrag}
          onChange={setze("vorgesehenerAuftrag")}
          onKeyDown={(e) => {
            if (e.key === "Enter") aufEnter?.();
          }}
        />
      </label>
    </>
  );
}
