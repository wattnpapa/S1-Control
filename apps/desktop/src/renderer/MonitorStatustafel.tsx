/**
 * Einsatzwert an der Wand: „Status" (S1) je Organisation und „Einsatzmittel"
 * (S3) je Abschnitt — wie viel gebunden, in Reserve, in Ruhe oder ausgefallen
 * ist. Aus dem Review der Stabsfunktionen: Kopfzahlen allein sagen der
 * Führung nicht, was noch verfügbar ist.
 *
 * Die Zahlen kommen fertig aus `projektion.statustafel` (Feld `status` der
 * Stärketafel). „Status" zeigt Köpfe mit der Einheitenzahl klein dahinter,
 * „Einsatzmittel" umgekehrt, weil S3 in Einheiten disponiert. Nicht
 * einsatzbereit steht in Bernstein, sobald es eine gibt.
 */

import type { Staerketafel, Statusspalte, Statustafel, Statuszeile } from "@s1/domaene";

import { Fuss, OhneZahlen, tafelgrad, type Ansichtseigenschaften } from "./Monitoransichten.js";

const SPALTEN: readonly { readonly schluessel: Statusspalte; readonly titel: string }[] = [
  { schluessel: "IM_EINSATZ", titel: "Im Einsatz" },
  { schluessel: "EINSATZBEREIT", titel: "Einsatzbereit" },
  { schluessel: "RUHE", titel: "Ruhe" },
  { schluessel: "NICHT_EINSATZBEREIT", titel: "Nicht einsatzbereit" },
  { schluessel: "SONSTIGE", titel: "Sonstige" },
];

/** Organisationen des Sanitätsdienstes — für die Zwischensumme der Fachberatung. */
export const SANITAETSDIENST: readonly string[] = ["DRK", "JUH", "MHD", "ASB", "RETTUNGSDIENST"];

type Einheitenmass = "koepfe" | "einheiten";

interface Zeile {
  readonly schluessel: string;
  readonly name: string;
  readonly tiefe: number;
  readonly werte: Statuszeile;
  readonly klasse?: string;
}

export function summiere(zeilen: readonly Statuszeile[]): Statuszeile {
  const leer = { einheiten: 0, koepfe: 0 };
  const summe: Record<Statusspalte, { einheiten: number; koepfe: number }> = {
    IM_EINSATZ: leer,
    EINSATZBEREIT: leer,
    RUHE: leer,
    NICHT_EINSATZBEREIT: leer,
    SONSTIGE: leer,
  };
  for (const z of zeilen) {
    for (const { schluessel } of SPALTEN) {
      summe[schluessel] = { einheiten: summe[schluessel].einheiten + z[schluessel].einheiten, koepfe: summe[schluessel].koepfe + z[schluessel].koepfe };
    }
  }
  return summe;
}

/** Zeilen je Organisation in der Reihenfolge der Stärketafel, dazu „davon Sanitätsdienst". */
export function organisationszeilen(tafel: Staerketafel, status: Statustafel): readonly Zeile[] {
  const zeilen = tafel.organisationen.flatMap((o) => {
    const werte = status.jeOrganisation[o.schluessel];
    return werte === undefined ? [] : [{ schluessel: o.schluessel, name: o.name, tiefe: 0, werte }];
  });
  const san = zeilen.filter((z) => SANITAETSDIENST.includes(z.schluessel));
  if (san.length < 2) return zeilen;
  return [...zeilen, { schluessel: "SAN", name: "davon Sanitätsdienst", tiefe: 1, werte: summiere(san.map((z) => z.werte)), klasse: "anmarsch" }];
}

/** Zeilen je Abschnitt mit Einheiten, eingerückt wie im Abschnittsbaum. */
export function abschnittszeilen(tafel: Staerketafel, status: Statustafel): readonly Zeile[] {
  return tafel.abschnitte.flatMap((a) => {
    const werte = status.jeAbschnitt[a.schluessel];
    return werte === undefined ? [] : [{ schluessel: a.schluessel, name: a.name, tiefe: a.tiefe, werte }];
  });
}

function Zelle({ werte, spalte, mass }: { readonly werte: Statuszeile; readonly spalte: Statusspalte; readonly mass: Einheitenmass }): React.JSX.Element {
  const z = werte[spalte];
  if (z.einheiten === 0) return <td className="monitorleise">—</td>;
  const haupt = mass === "koepfe" ? z.koepfe : z.einheiten;
  const neben = mass === "koepfe" ? `${String(z.einheiten)} E` : `${String(z.koepfe)} K`;
  return (
    <td className={spalte === "NICHT_EINSATZBEREIT" ? "monitorwarn" : undefined}>
      {haupt} <small>{neben}</small>
    </td>
  );
}

function Statusbild(props: {
  readonly e: Ansichtseigenschaften;
  readonly titel: string;
  readonly beschriftung: string;
  readonly kopf: string;
  readonly mass: Einheitenmass;
  readonly zeilen: (t: Staerketafel, s: Statustafel) => readonly Zeile[];
}): React.JSX.Element {
  const { e, titel, beschriftung, kopf, mass, zeilen } = props;
  const tafel = e.staerketafel?.tafel;
  const status = tafel?.status;
  if (tafel === undefined || status === undefined) return <OhneZahlen titel={titel} e={e} hinweis="Noch keine Stärke" />;
  const liste = zeilen(tafel, status);
  if (liste.length === 0) return <OhneZahlen titel={titel} e={e} hinweis="Noch keine Kräfte vor Ort" />;
  const spalten = SPALTEN.filter((s) => s.schluessel !== "SONSTIGE" || status.gesamt.SONSTIGE.einheiten > 0);
  const grad = tafelgrad(e.mass, 22 + spalten.length * 12, liste.length + 2);
  const einheit = mass === "koepfe" ? "Köpfe, Einheiten (E) klein" : "Einheiten, Köpfe (K) klein";
  return (
    <section className="monitor monitortafel" aria-label={`Monitor ${titel}`}>
      <p className="monitorbeschriftung">{beschriftung}</p>
      <table style={{ fontSize: `${String(grad)}px` }}>
        <thead>
          <tr>
            <th scope="col">{kopf}</th>
            {spalten.map((s) => (
              <th key={s.schluessel} scope="col">
                {s.titel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {liste.map((z) => (
            <tr key={z.schluessel} className={z.klasse}>
              <th scope="row" style={z.tiefe > 0 ? { paddingLeft: `${String(0.5 + z.tiefe * 1.2)}em` } : undefined}>
                {z.name}
              </th>
              {spalten.map((s) => (
                <Zelle key={s.schluessel} werte={z.werte} spalte={s.schluessel} mass={mass} />
              ))}
            </tr>
          ))}
          <tr className="summe">
            <th scope="row">Gesamt</th>
            {spalten.map((s) => (
              <Zelle key={s.schluessel} werte={status.gesamt} spalte={s.schluessel} mass={mass} />
            ))}
          </tr>
        </tbody>
      </table>
      <Fuss lagebild={e.lagebild} jetzt={e.jetzt} zusatz={`${e.zeit} · Kräfte vor Ort nach Status · ${einheit}${e.fusszusatz ?? ""}`} />
    </section>
  );
}

/** S1 — Einsatzwert je Organisation, mit Zwischensumme Sanitätsdienst. */
export function MonitorStatus(e: Ansichtseigenschaften): React.JSX.Element {
  return (
    <Statusbild e={e} titel="Status" beschriftung="Status je Organisation · was gebunden, was frei ist" kopf="Organisation" mass="koepfe" zeilen={organisationszeilen} />
  );
}

/** S3 — Einheiten je Abschnitt nach Status: Reserve und Ausfall auf einen Blick. */
export function MonitorEinsatzmittel(e: Ansichtseigenschaften): React.JSX.Element {
  return (
    <Statusbild e={e} titel="Einsatzmittel" beschriftung="Einsatzmittel je Abschnitt · Einheiten nach Status" kopf="Abschnitt" mass="einheiten" zeilen={abschnittszeilen} />
  );
}
