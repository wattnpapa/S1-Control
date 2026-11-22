/**
 * Die Kachelbilder des Monitors: „Offene Punkte" (Führung), „IuK-Lage" (S6)
 * und „Nachrichtenweg" (FmZ).
 *
 * Ein Raster aus Kacheln, je eine große Zahl mit einem Wort darunter. Die
 * Schrift richtet sich nach Fenster und Kachelzahl, damit nichts abgeschnitten
 * wird (AGENTS.md §9). Was die Kacheln zeigen, steht in `monitorKacheln.ts`.
 */

import { Fuss, OhneZahlen, type Ansichtseigenschaften } from "./Monitoransichten.js";
import { besetzungText, iukLage, nachrichtenweg, offenePunkte, type Kachel } from "./monitorKacheln.js";
import { schriftgroesse } from "./monitorZahlen.js";

/** Spalten des Rasters: bis vier nebeneinander, darüber in zwei oder drei Reihen. */
export function rasterspalten(anzahl: number): number {
  if (anzahl <= 4) return Math.max(anzahl, 1);
  return anzahl <= 8 ? Math.ceil(anzahl / 2) : Math.ceil(anzahl / 3);
}

function Kachelbild(props: {
  readonly titel: string;
  readonly beschriftung: string;
  readonly kacheln: readonly Kachel[];
  readonly e: Ansichtseigenschaften;
  readonly zusatz: string;
}): React.JSX.Element {
  const { titel, beschriftung, kacheln, e, zusatz } = props;
  const spalten = rasterspalten(kacheln.length);
  const reihen = Math.ceil(kacheln.length / spalten);
  const breite = (e.mass.breite * 0.9) / spalten;
  const hoehe = (e.mass.hoehe * 0.72) / reihen;
  const laengste = Math.max(3, ...kacheln.map((k) => k.wert.length));
  const grad = schriftgroesse(laengste, breite, hoehe * 0.8);
  const textgrad = Math.max(14, Math.min(Math.round(grad * 0.28), Math.round(breite / 16)));
  return (
    <section className="monitor monitorkacheln" aria-label={`Monitor ${titel}`}>
      <p className="monitorbeschriftung">{beschriftung}</p>
      <ul className="kachelraster" style={{ gridTemplateColumns: `repeat(${String(spalten)}, 1fr)` }}>
        {kacheln.map((k) => (
          <li key={k.schluessel} className={`kachel ${k.stufe}`} aria-label={`${k.text}: ${k.wert}`}>
            <span className="kachelwert" style={{ fontSize: `${String(grad)}px` }}>
              {k.wert}
            </span>
            <span className="kacheltext" style={{ fontSize: `${String(textgrad)}px` }}>
              {k.stufe === "warn" ? "⚠ " : ""}
              {k.text}
            </span>
            {k.unter !== undefined && (
              <span className="kachelunter" style={{ fontSize: `${String(Math.round(textgrad * 0.8))}px` }}>
                {k.unter}
              </span>
            )}
          </li>
        ))}
      </ul>
      <Fuss lagebild={e.lagebild} jetzt={e.jetzt} zusatz={`${e.zeit}${zusatz === "" ? "" : ` · ${zusatz}`}${e.fusszusatz ?? ""}`} />
    </section>
  );
}

/** Führung — offene Entscheidungen auf einen Blick. */
export function MonitorOffenePunkte(e: Ansichtseigenschaften): React.JSX.Element {
  return (
    <Kachelbild
      titel="Offene Punkte"
      beschriftung="Offene Punkte · was jetzt zu tun ist"
      kacheln={offenePunkte(e.lagebild, e.jetzt)}
      e={e}
      zusatz="⚠ = Handlungsbedarf"
    />
  );
}

/** S6 — Zustand von Share, Arbeitsplätzen und Übertragung. */
export function MonitorIukLage(e: Ansichtseigenschaften): React.JSX.Element {
  return <Kachelbild titel="IuK-Lage" beschriftung="IuK-Lage · Share und Arbeitsplätze" kacheln={iukLage(e.lagebild, e.jetzt)} e={e} zusatz="" />;
}

/** FmZ — Stau im Nachrichtenweg, ohne Inhalte. */
export function MonitorNachrichtenweg(e: Ansichtseigenschaften): React.JSX.Element {
  const kacheln = nachrichtenweg(e.lagebild);
  if (kacheln === undefined) return <OhneZahlen titel="Nachrichtenweg" e={e} hinweis="Noch keine Nachrichten" />;
  return (
    <Kachelbild
      titel="Nachrichtenweg"
      beschriftung="Nachrichtenweg · was wo wartet"
      kacheln={kacheln}
      e={e}
      zusatz={besetzungText(e.lagebild.besetzteStellen) ?? ""}
    />
  );
}
