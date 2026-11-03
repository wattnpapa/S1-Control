/**
 * Die Einsatzliste der Auswahl: je Einsatz eine Zeile mit Name und Datum,
 * Status als Marke, Zahl der Einheiten, Stand (letzte Änderung) und rechts
 * „Öffnen", sortiert nach „zuletzt genutzt“ (Entwurf „Entlastung", 3.8,
 * Option 6g). Der zuletzt genutzte trägt „Öffnen" gefüllt: Wer die Auswahl
 * aufschlägt, meint fast immer ihn.
 *
 * **Woher die Angaben kommen.** Der Dienst liest je Einsatz nur den Anker und
 * die Änderungszeit der Ereignisdateien (§2.6) — ein Fold je Einsatz machte die
 * Liste bei 50.000 Ereignissen unbenutzbar. Status und Zahl der Einheiten
 * kennt deshalb nur, wer den Einsatz geöffnet hat: Dieses Fenster merkt sich
 * den zuletzt gesehenen Stand (`sitzung.ts`) und beschriftet ihn als „zuletzt
 * gesehen“. Wo er fehlt, steht ein Strich — keine geratene Zahl.
 *
 * Beendete und archivierte Einsätze stehen abgesetzt darunter und blass, mit
 * „Ansehen" statt „Öffnen": Sie sind nur zu lesen.
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

const STATUSTON: Readonly<Record<Einsatzstand["status"], string>> = {
  AKTIV: "ok",
  BEENDET: "",
  ARCHIVIERT: "",
};

/** „2026-10-01" als „01.10.2026"; was anders aussieht, bleibt, wie es ist. */
export function datumText(datum: string): string {
  const teile = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(datum);
  return teile === null ? datum : `${teile[3] ?? ""}.${teile[2] ?? ""}.${teile[1] ?? ""}`;
}

interface EintragEigenschaften {
  readonly zeile: Zeile;
  readonly aufOeffnen: (ordner: string) => void;
  readonly abgeschlossen: boolean;
  /** Der zuletzt genutzte: „Öffnen" gefüllt. */
  readonly erster: boolean;
}

function Eintrag({ zeile, aufOeffnen, abgeschlossen, erster }: EintragEigenschaften): React.JSX.Element {
  const { stand, einsatz } = zeile;
  const wort = abgeschlossen ? "Ansehen" : "Öffnen";
  const gesehen = "Status und Einheiten: zuletzt an diesem Arbeitsplatz gesehen";
  return (
    <li className={abgeschlossen ? "einsatzzeile blass" : "einsatzzeile"} onDoubleClick={() => aufOeffnen(einsatz.ordner)}>
      <div className="einsatzname">
        <strong>{einsatz.name}</strong>
        <small>
          {datumText(einsatz.datum)}
          {stand?.status === "ARCHIVIERT" ? " · archiviert, nur lesen" : stand?.status === "BEENDET" ? " · beendet, nur lesen" : ""}
        </small>
      </div>
      {stand === undefined ? (
        <span className="leise" title="An diesem Arbeitsplatz noch nicht geöffnet">
          Status —
        </span>
      ) : (
        <span className={`marke-zustand ${STATUSTON[stand.status]}`.trim()} title={gesehen}>
          {STATUSTEXT[stand.status]}
        </span>
      )}
      <span className="zahl" title={stand === undefined ? undefined : gesehen}>
        {stand === undefined ? "—" : String(stand.einheiten)} Einh.
      </span>
      <span className="zahl">Stand {zeile.zuletzt === 0 ? "—" : zeitText(zeile.zuletzt)}</span>
      <button type="button" className={erster ? "haupt" : undefined} aria-label={`${einsatz.name} ${wort.toLowerCase()}`} onClick={() => aufOeffnen(einsatz.ordner)}>
        {wort}
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
    <ul className="einsatzliste" aria-label="Einsätze auf dem Share">
      {aktuell.map((zeile, stelle) => (
        <Eintrag key={zeile.einsatz.ordner} zeile={zeile} aufOeffnen={aufOeffnen} abgeschlossen={false} erster={stelle === 0} />
      ))}
      {abgeschlossen.map((zeile) => (
        <Eintrag key={zeile.einsatz.ordner} zeile={zeile} aufOeffnen={aufOeffnen} abgeschlossen erster={false} />
      ))}
    </ul>
  );
}
