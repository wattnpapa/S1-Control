/**
 * Die Filterzeile über der Einheitentabelle: Zähler und Filter je Statuswert,
 * rechts klein, was das Menü „Spalten" eingestellt hat.
 *
 * Seit Runde 6 („Entlastung", 3.5) heißt sie „Filter" und nicht mehr
 * „Status": Die Chips sind Filter, und das soll man lesen, ohne zu probieren
 * (Audit P2-2). Sie ist die einzige Zeile zwischen Kopf und Tabelle.
 */

import { EINHEIT_STATUS, statusTitel, statusTon } from "@s1/domaene";

interface StatusLeisteEigenschaften {
  readonly jeStatus: { readonly [status: string]: { readonly anzahl: number; readonly gesamt: number } };
  readonly wahl: readonly string[];
  readonly aufSchalten: (status: string) => void;
  readonly aufAlle: () => void;
  /** Rechts in der Zeile: „Gliederung nach Bereich · Spalten Grunddaten, Stärke". */
  readonly zustand?: string;
}

/**
 * Die Statusleiste über der Tabelle: ein Knopf je Statuswert in der Reihenfolge
 * der Excel, mit Zahl der Einheiten und — im Titel — der Stärke. Werte ohne
 * Einheit stehen nicht in der Leiste; ein gewählter Wert bleibt stehen, auch
 * wenn seine Zahl auf null fällt, damit die Abwahl erreichbar bleibt.
 */
export function StatusLeiste({ jeStatus, wahl, aufSchalten, aufAlle, zustand }: StatusLeisteEigenschaften): React.JSX.Element | null {
  const bekannte = EINHEIT_STATUS.filter((status) => (jeStatus[status]?.anzahl ?? 0) > 0 || wahl.includes(status));
  const fremde = Object.keys(jeStatus)
    .filter((status) => !(EINHEIT_STATUS as readonly string[]).includes(status))
    .sort();
  const werte = [...bekannte, ...fremde];
  if (werte.length === 0 && zustand === undefined) return null;
  return (
    <div className="statusfilter filterzeile" role="group" aria-label="Filter nach Status">
      <span className="statusfilter-titel">Filter</span>
      {werte.map((status) => {
        const zaehler = jeStatus[status] ?? { anzahl: 0, gesamt: 0 };
        return (
          <button
            key={status}
            type="button"
            aria-pressed={wahl.includes(status)}
            title={`Stärke ${String(zaehler.gesamt)} — klicken filtert die Tabelle`}
            onClick={() => {
              aufSchalten(status);
            }}
          >
            <span className={`marke-zustand ${statusTon(status)}`}>{statusTitel(status)}</span>
            <span className="statusfilter-zahl">{zaehler.anzahl}</span>
          </button>
        );
      })}
      {wahl.length > 0 && (
        <button type="button" className="alsLink" onClick={aufAlle}>
          Alle zeigen
        </button>
      )}
      {zustand !== undefined && <span className="filterzustand">{zustand}</span>}
    </div>
  );
}
