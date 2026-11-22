/**
 * „Kommen und Gehen" (S1): wer angefordert, zugesagt oder im Anmarsch ist und
 * wessen Verfügbarkeit endet — früheste zuerst. Aus dem Review: S1, Führung
 * und Fachberatung brauchen an der Wand, wo in den nächsten Stunden zu
 * handeln ist, nicht nur den Stand von jetzt.
 *
 * Die Zeilen kommen fertig aus `projektion.kommenUndGehen`; hier wird nur
 * gegen die Uhr markiert: „verfügbar bis" läuft ab (24 h) oder ist abgelaufen
 * — dann ⚠ und Bernstein. Passen nicht alle Zeilen, steht „+N weitere" darunter.
 */

import { projektion, type Bewegung, type Bewegungsart } from "@s1/domaene";

import { Fuss, OhneZahlen, tafelgrad, type Ansichtseigenschaften } from "./Monitoransichten.js";
import { tagText, uhrzeitText } from "./versorgungstext.js";

const ART_TEXT: Readonly<Record<Bewegungsart, string>> = {
  angefordert: "angefordert",
  zugesagt: "zugesagt für",
  anmarsch: "im Anmarsch",
  verfuegbarBis: "verfügbar bis",
};

/** Zeilen, die bei dieser Fensterhöhe noch lesbar passen (mindestens 6). */
export function zeilenplatz(hoehe: number): number {
  return Math.max(6, Math.floor(hoehe / 70));
}

/** „heute 1800", „morgen 0600" — leer ohne Zeitpunkt. */
export function zeitText(zeitpunkt: string | undefined, jetzt: number): string {
  if (zeitpunkt === undefined) return "";
  return `${tagText(zeitpunkt, jetzt)} ${uhrzeitText(zeitpunkt)}`.trim();
}

/** Die Marke einer Zeile: nur „verfügbar bis" kann ablaufen. */
export function marke(b: Bewegung, jetzt: number): string | undefined {
  if (b.art !== "verfuegbarBis") return undefined;
  return projektion.verfuegbarkeitsmarke(b.zeitpunkt, new Date(jetzt).toISOString())?.text;
}

/**
 * Zeichen der Tafelbreite: je Spalte der längste Eintrag, dazu der Zellabstand
 * (rund drei Zeichen je Zelle). Daraus die Schrift, damit nichts übersteht.
 */
export function zeilenzeichen(zeilen: readonly Bewegung[], jetzt: number): number {
  const spalte = (wert: (b: Bewegung) => string, kopf: string): number => Math.max(kopf.length, ...zeilen.map((b) => wert(b).length));
  const was = (b: Bewegung): string => {
    const m = marke(b, jetzt);
    return `${m === undefined ? "" : "⚠ "}${ART_TEXT[b.art]}${m === undefined ? "" : ` · ${m}`}`;
  };
  return (
    spalte((b) => zeitText(b.zeitpunkt, jetzt), "Wann") +
    spalte(was, "Was") +
    spalte((b) => b.name, "Einheit") +
    spalte((b) => b.zusatz ?? "", "Auftrag / Ablösung") +
    12
  );
}

function Bewegungszeile({ b, jetzt }: { readonly b: Bewegung; readonly jetzt: number }): React.JSX.Element {
  const m = marke(b, jetzt);
  return (
    <tr className={m === undefined ? undefined : "monitorwarn"}>
      <td>{zeitText(b.zeitpunkt, jetzt) || "—"}</td>
      <td className="text">
        {m === undefined ? "" : "⚠ "}
        {ART_TEXT[b.art]}
        {m === undefined ? "" : ` · ${m}`}
      </td>
      <th scope="row">{b.name}</th>
      <td className="text monitorleise">{b.zusatz ?? ""}</td>
    </tr>
  );
}

export function MonitorKommenGehen(e: Ansichtseigenschaften): React.JSX.Element {
  const titel = "Kommen und Gehen";
  const tafel = e.staerketafel?.tafel;
  if (tafel?.kommenGehen === undefined) return <OhneZahlen titel={titel} e={e} hinweis="Noch keine Stärke" />;
  if (tafel.kommenGehen.length === 0) return <OhneZahlen titel={titel} e={e} hinweis="Nichts angefordert, keine Frist offen" />;
  const platz = zeilenplatz(e.mass.hoehe);
  const zeilen = tafel.kommenGehen.slice(0, platz);
  const rest = tafel.kommenGehen.length - zeilen.length;
  const grad = tafelgrad(e.mass, zeilenzeichen(zeilen, e.jetzt), zeilen.length + (rest > 0 ? 2 : 1));
  return (
    <section className="monitor monitortafel" aria-label={`Monitor ${titel}`}>
      <p className="monitorbeschriftung">Kommen und Gehen · Anforderungen, Anmarsch, Verfügbarkeit</p>
      <table style={{ fontSize: `${String(grad)}px` }}>
        <thead>
          <tr>
            <th scope="col">Wann</th>
            <th scope="col" className="text">
              Was
            </th>
            <th scope="col" className="text">
              Einheit
            </th>
            <th scope="col" className="text">
              Auftrag / Ablösung
            </th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((b) => (
            <Bewegungszeile key={b.schluessel} b={b} jetzt={e.jetzt} />
          ))}
          {rest > 0 && (
            <tr className="anmarsch">
              <td colSpan={4}>+{rest} weitere</td>
            </tr>
          )}
        </tbody>
      </table>
      <Fuss lagebild={e.lagebild} jetzt={e.jetzt} zusatz={`${e.zeit} · früheste zuerst${e.fusszusatz ?? ""}`} />
    </section>
  );
}
