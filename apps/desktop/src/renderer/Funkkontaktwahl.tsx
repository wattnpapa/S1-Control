/**
 * Der Kontakt im Funkplan beim Aufnehmen eines Eingangs und beim Befördern
 * eines Ausgangs — ein Kästchen und die Rufgruppe, gemeinsam für die Maske
 * „Eingang aufnehmen“ und die Maske „Befördern“.
 *
 * Läuft die Nachricht per Funk mit einer Einheit der Lage, steht das Kästchen
 * „Kontakt mit … im Funkplan vermerken“ gesetzt da. Die Rufgruppe ist mit der
 * Hauptrufgruppe der Einheit vorbelegt und bleibt wählbar: Gesprochen wird
 * auch einmal auf einer anderen Gruppe. Hat die Einheit noch keine Rufgruppe,
 * sagt die Maske, dass sie der gewählten zugeordnet wird; zugeordnet wird im
 * Worker (`funkkontaktfolge.ts`). Eine zugeordnete Einheit setzt der Kontakt
 * nicht um.
 *
 * Die Einheit findet die Maske über Namen oder Funkrufnamen der Gegenstelle,
 * beim Eingang ersatzweise über den Absender.
 */

import { useState } from "react";

import type { Gegenstelle, Rufgruppenwahl } from "../kontrakt/index.js";
import type { Funkkontakt } from "../kontrakt/fmzschritte.js";

/** Die Einheit, deren Name oder Funkrufname der Eingabe gleicht (ohne Groß-/Kleinschreibung); sonst keine. */
export function gegenstelleTreffer(gegenstellen: readonly Gegenstelle[], eingabe: string): Gegenstelle | undefined {
  const gesucht = eingabe.trim().toLocaleLowerCase("de");
  if (gesucht === "") return undefined;
  const gleich = (wert: string | undefined): boolean => wert !== undefined && wert.trim().toLocaleLowerCase("de") === gesucht;
  return gegenstellen.find((g) => gleich(g.name)) ?? gegenstellen.find((g) => gleich(g.funkrufname));
}

export interface Kontaktstand {
  readonly an: boolean;
  /** Die gewählte Rufgruppe; leer heißt „ohne Angabe“ (dann gilt die Hauptrufgruppe). */
  readonly rufgruppeId: string;
  readonly aufAn: (an: boolean) => void;
  readonly aufRufgruppe: (rufgruppeId: string) => void;
}

/**
 * Kästchen und Rufgruppe der Maske. Wechselt die Einheit (andere Gegenstelle
 * getippt), gilt wieder die Vorbelegung ihrer Hauptrufgruppe.
 */
export function useKontaktstand(treffer: Gegenstelle | undefined): Kontaktstand {
  const [an, aufAn] = useState(true);
  const [gewaehlt, setzeGewaehlt] = useState<{ readonly fuer: string; readonly rufgruppeId: string } | undefined>(undefined);
  const eigene = gewaehlt !== undefined && gewaehlt.fuer === treffer?.einheitId;
  return {
    an,
    rufgruppeId: eigene ? gewaehlt.rufgruppeId : (treffer?.rufgruppeId ?? ""),
    aufAn,
    aufRufgruppe: (rufgruppeId) => setzeGewaehlt(treffer === undefined ? undefined : { fuer: treffer.einheitId, rufgruppeId }),
  };
}

/** Der Kontakt, den der Entwurf mitschickt — nur per Funk, mit Einheit und gesetztem Kästchen. */
export function kontaktAus(treffer: Gegenstelle | undefined, mittel: string, stand: Pick<Kontaktstand, "an" | "rufgruppeId">): Funkkontakt | undefined {
  if (treffer === undefined || mittel !== "FUNK" || !stand.an) return undefined;
  return { einheitId: treffer.einheitId, ...(stand.rufgruppeId === "" ? {} : { rufgruppeId: stand.rufgruppeId }) };
}

/** Treffer, Stand und Kontakt in einem: die erste Eingabe, die eine Einheit nennt (Gegenstelle, dann Absender). */
export function useFunkkontakt(gegenstellen: readonly Gegenstelle[], eingaben: readonly string[], mittel: string) {
  const treffer = eingaben.map((eingabe) => gegenstelleTreffer(gegenstellen, eingabe)).find((g) => g !== undefined);
  const stand = useKontaktstand(treffer);
  return { treffer, stand, kontakt: kontaktAus(treffer, mittel, stand) };
}

/** Der Satz unter der Wahl, wenn die Einheit noch ohne Rufgruppe steht. */
export function zuordnungshinweis(treffer: Gegenstelle, rufgruppen: readonly Rufgruppenwahl[], rufgruppeId: string): string | undefined {
  if (treffer.rufgruppeId !== undefined) return undefined;
  const gruppe = rufgruppen.find((r) => r.rufgruppeId === rufgruppeId);
  if (gruppe === undefined) return `„${treffer.name}“ hat noch keine Rufgruppe. Mit einer gewählten Rufgruppe wird sie ihr zugeordnet.`;
  return `„${treffer.name}“ hat noch keine Rufgruppe und wird „${gruppe.name}“ zugeordnet.`;
}

export interface FunkkontaktwahlEigenschaften {
  readonly treffer: Gegenstelle | undefined;
  readonly mittel: string;
  readonly rufgruppen: readonly Rufgruppenwahl[];
  readonly stand: Kontaktstand;
}

/** Kästchen und Rufgruppe; ohne Einheit oder ohne Funk nichts. */
export function Funkkontaktwahl({ treffer, mittel, rufgruppen, stand }: FunkkontaktwahlEigenschaften): React.JSX.Element | null {
  if (treffer === undefined || mittel !== "FUNK") return null;
  const hinweis = stand.an ? zuordnungshinweis(treffer, rufgruppen, stand.rufgruppeId) : undefined;
  return (
    <div className="vordruckzeile">
      <label className="kaestchen">
        <input type="checkbox" checked={stand.an} onChange={(ev) => stand.aufAn(ev.target.checked)} />
        Kontakt mit „{treffer.name}“ im Funkplan vermerken
      </label>
      {stand.an && rufgruppen.length > 0 && (
        <label>
          Rufgruppe
          <select value={stand.rufgruppeId} onChange={(ev) => stand.aufRufgruppe(ev.target.value)}>
            <option value="">— ohne Angabe —</option>
            {rufgruppen.map((r) => (
              <option key={r.rufgruppeId} value={r.rufgruppeId}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {hinweis !== undefined && (
        <p className="hinweistext" role="status">
          {hinweis}
        </p>
      )}
    </div>
  );
}
