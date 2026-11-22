/**
 * Einbuchen beim Verknüpfen einer bestehenden Einheit mit einer Anforderung.
 *
 * Herausgelöst aus `AnforderungZuEinheit.tsx` (Strukturgrenze AGENTS.md §6).
 * Vorher blieb eine verknüpfte Einheit im Anmarsch stehen, ohne Status und
 * Eintreffzeit, und fehlte in der Ist-Stärke; die Maske schlug außerdem
 * „anlegen“ vor, obwohl die Einheit gleichen Namens schon im Anmarsch stand
 * (Stab-Review S1, B-S1-2).
 */

import type { Einheitenwahl, Einheitsvorschlag } from "@s1/domaene";

/** Bereiche, in denen eine eingetroffene Einheit nicht in die Ist-Stärke zählt. */
export const NICHT_ZAEHLEND: ReadonlySet<string> = new Set(["ANGEFORDERT", "EINGANG", "ARCHIV"]);

/**
 * Steht eine gleichnamige Einheit noch im Anmarsch, ist sie vermutlich die
 * angeforderte: dann „verknüpfen“ vorwählen statt „anlegen“, sonst entsteht
 * sie doppelt (Stab-Review S1, B-S1-2).
 */
export function gleichnamigeErwartete(einheiten: readonly Einheitenwahl[], vorschlag: Einheitsvorschlag | undefined): Einheitenwahl | undefined {
  const name = vorschlag?.bezeichnung.trim().toLocaleLowerCase("de-DE") ?? "";
  if (name === "") return undefined;
  return einheiten.find((e) => e.erwartet === true && e.name.trim().toLocaleLowerCase("de-DE") === name);
}

interface EinbuchenEigenschaften {
  readonly an: boolean;
  readonly aufAn: (an: boolean) => void;
  readonly abschnittId: string;
  readonly aufAbschnitt: (abschnittId: string) => void;
  readonly abschnitte: readonly { readonly id: string; readonly name: string; readonly typ: string }[];
}

/** Beim Verknüpfen: die Einheit gleich einbuchen (Stab-Review S1, B-S1-2). */
export function Einbuchen({ an, aufAn, abschnittId, aufAbschnitt, abschnitte }: EinbuchenEigenschaften): React.JSX.Element {
  return (
    <fieldset className="wegwahl">
      <legend>Einbuchen</legend>
      <label>
        <input
          type="checkbox"
          checked={an}
          onChange={(e) => {
            aufAn(e.target.checked);
          }}
        />
        In den Abschnitt verschieben, „Einsatzbereit“ setzen und die Eintreffzeit eintragen
      </label>
      {an && (
        <label>
          Abschnitt
          <select
            value={abschnittId}
            onChange={(e) => {
              aufAbschnitt(e.target.value);
            }}
          >
            <option value="">— Abschnitt behalten —</option>
            {abschnitte.map((knoten) => (
              <option key={knoten.id} value={knoten.id}>
                {NICHT_ZAEHLEND.has(knoten.typ) ? `${knoten.name} (zählt nicht)` : knoten.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  );
}
