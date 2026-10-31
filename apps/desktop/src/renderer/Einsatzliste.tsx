/**
 * Die Einsatzliste der Auswahl: je Einsatz Status, letzte Änderung und Zahl
 * der Einheiten, sortiert nach „zuletzt genutzt“.
 *
 * **Woher die Angaben kommen.** Der Dienst liest je Einsatz nur den Anker und
 * die Änderungszeit der Ereignisdateien (§2.6) — ein Fold je Einsatz machte die
 * Liste bei 50.000 Ereignissen unbenutzbar. Status und Zahl der Einheiten
 * kennt deshalb nur, wer den Einsatz geöffnet hat: Dieses Fenster merkt sich
 * den zuletzt gesehenen Stand (`sitzung.ts`) und beschriftet ihn als „zuletzt
 * gesehen“. Wo er fehlt, steht ein Strich — keine geratene Zahl.
 *
 * Beendete und archivierte Einsätze stehen abgesetzt darunter und gedämpft.
 */

import type { EinsatzEintrag } from "../kontrakt/index.js";
import { ladeStaende, type Einsatzstand } from "./sitzung.js";

const STATUSTEXT: Readonly<Record<Einsatzstand["status"], string>> = {
  AKTIV: "laufend",
  BEENDET: "beendet",
  ARCHIVIERT: "archiviert",
};

interface Zeile {
  readonly einsatz: EinsatzEintrag;
  readonly stand: Einsatzstand | undefined;
  readonly zuletzt: number;
}

function zuletztGenutzt(einsatz: EinsatzEintrag, stand: Einsatzstand | undefined): number {
  const geaendert = einsatz.geaendert === undefined ? 0 : Date.parse(einsatz.geaendert);
  return Math.max(stand?.genutzt ?? 0, Number.isNaN(geaendert) ? 0 : geaendert);
}

/** Ordnet die Einsätze: zuletzt genutzt zuerst, Beendete und Archivierte getrennt. */
export function ordneEinsatzliste(
  einsaetze: readonly EinsatzEintrag[],
  staende: Readonly<Record<string, Einsatzstand>>,
): { readonly aktuell: readonly Zeile[]; readonly abgeschlossen: readonly Zeile[] } {
  const zeilen = einsaetze
    .map((einsatz) => ({ einsatz, stand: staende[einsatz.ordner], zuletzt: zuletztGenutzt(einsatz, staende[einsatz.ordner]) }))
    .sort((a, b) => b.zuletzt - a.zuletzt);
  const abgeschlossen = (zeile: Zeile): boolean =>
    zeile.stand !== undefined && zeile.stand.status !== "AKTIV";
  return { aktuell: zeilen.filter((z) => !abgeschlossen(z)), abgeschlossen: zeilen.filter(abgeschlossen) };
}

/** „heute, 14:12“, „gestern, 09:30“ oder „03.10.2026, 16:05“. */
export function zeitText(zeit: number, jetzt: number = Date.now()): string {
  const t = new Date(zeit);
  const zwei = (n: number): string => String(n).padStart(2, "0");
  const uhr = `${zwei(t.getHours())}:${zwei(t.getMinutes())}`;
  const tag = (d: Date): string => `${String(d.getFullYear())}-${String(d.getMonth())}-${String(d.getDate())}`;
  if (tag(t) === tag(new Date(jetzt))) return `heute, ${uhr}`;
  if (tag(t) === tag(new Date(jetzt - 86_400_000))) return `gestern, ${uhr}`;
  return `${zwei(t.getDate())}.${zwei(t.getMonth() + 1)}.${String(t.getFullYear())}, ${uhr}`;
}

function Angaben({ zeile }: { readonly zeile: Zeile }): React.JSX.Element {
  const { stand } = zeile;
  return (
    <span className="hinweistext" style={{ display: "block" }}>
      {`Status: ${stand === undefined ? "—" : STATUSTEXT[stand.status]}`}
      {` · Letzte Änderung: ${zeile.zuletzt === 0 ? "—" : zeitText(zeile.zuletzt)}`}
      {` · Einheiten: ${stand === undefined ? "—" : String(stand.einheiten)}`}
      {stand === undefined ? "" : " (zuletzt gesehen)"}
    </span>
  );
}

function Eintrag({ zeile, aufOeffnen, gedaempft }: {
  readonly zeile: Zeile;
  readonly aufOeffnen: (ordner: string) => void;
  readonly gedaempft: boolean;
}): React.JSX.Element {
  return (
    <li style={gedaempft ? { opacity: 0.75 } : undefined}>
      <button
        type="button"
        style={{ display: "block", width: "100%", textAlign: "left" }}
        onClick={() => { aufOeffnen(zeile.einsatz.ordner); }}
      >
        <strong>{zeile.einsatz.name}</strong>
        {` (${zeile.einsatz.datum})`}
        <Angaben zeile={zeile} />
      </button>
    </li>
  );
}

export interface EinsatzlisteEigenschaften {
  readonly einsaetze: readonly EinsatzEintrag[];
  readonly aufOeffnen: (ordner: string) => void;
}

export function Einsatzliste({ einsaetze, aufOeffnen }: EinsatzlisteEigenschaften): React.JSX.Element {
  const { aktuell, abgeschlossen } = ordneEinsatzliste(einsaetze, ladeStaende());
  return (
    <>
      <ul>
        {aktuell.map((zeile) => (
          <Eintrag key={zeile.einsatz.ordner} zeile={zeile} aufOeffnen={aufOeffnen} gedaempft={false} />
        ))}
      </ul>
      {abgeschlossen.length > 0 && (
        <>
          <h3 className="hinweistext">Beendet und archiviert</h3>
          <ul>
            {abgeschlossen.map((zeile) => (
              <Eintrag key={zeile.einsatz.ordner} zeile={zeile} aufOeffnen={aufOeffnen} gedaempft />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
