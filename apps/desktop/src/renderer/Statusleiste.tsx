/** Die Statusleiste über der Einheitentabelle: Zähler und Filter je Statuswert. */

import { EINHEIT_STATUS, statusTitel, statusTon } from "@s1/domaene";

interface StatusLeisteEigenschaften {
  readonly jeStatus: { readonly [status: string]: { readonly anzahl: number; readonly gesamt: number } };
  readonly wahl: readonly string[];
  readonly aufSchalten: (status: string) => void;
  readonly aufAlle: () => void;
}

/**
 * Die Statusleiste über der Tabelle: ein Knopf je Statuswert in der Reihenfolge
 * der Excel, mit Zahl der Einheiten und — im Titel — der Stärke. Werte ohne
 * Einheit stehen nicht in der Leiste; ein gewählter Wert bleibt stehen, auch
 * wenn seine Zahl auf null fällt, damit die Abwahl erreichbar bleibt.
 */
export function StatusLeiste({ jeStatus, wahl, aufSchalten, aufAlle }: StatusLeisteEigenschaften): React.JSX.Element | null {
  const bekannte = EINHEIT_STATUS.filter((status) => (jeStatus[status]?.anzahl ?? 0) > 0 || wahl.includes(status));
  const fremde = Object.keys(jeStatus)
    .filter((status) => !(EINHEIT_STATUS as readonly string[]).includes(status))
    .sort();
  const werte = [...bekannte, ...fremde];
  if (werte.length === 0) return null;
  return (
    <div className="statusfilter" role="group" aria-label="Status">
      <span className="statusfilter-titel">Status</span>
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
    </div>
  );
}
