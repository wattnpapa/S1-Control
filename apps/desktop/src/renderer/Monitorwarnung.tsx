/**
 * Der Warnstreifen des Stärke-Monitors bei Verbindungsverlust.
 *
 * Der Monitor hängt an der Wand und wird aus Metern gelesen; eine stehengebliebene
 * Zahl sieht aus wie eine aktuelle. Der Streifen sagt deshalb, **seit wann die
 * Zahl nicht mehr gestimmt haben kann**: „Keine Verbindung – Stand hh:mm". Symbol
 * und Wort, nicht nur Farbe (⚠ gelb, nach einer Minute ✖ rot). Der Rest des
 * Monitors bleibt Weiß auf Schwarz, wie er zur Fernlesbarkeit sein soll.
 */

import type { Verbindungsstatus } from "./verbindung.js";

type Unterbrochen = Extract<Verbindungsstatus, { zustand: "unterbrochen" }>;

function zwei(zahl: number): string {
  return String(zahl).padStart(2, "0");
}

/** Der letzte Stand als Uhrzeit des Rechners – dieselbe Uhr wie die Zeit des Kopfbands. */
export function standUhrzeit(jetzt: number, seitMs: number): string {
  const stand = new Date(jetzt - seitMs);
  if (Number.isNaN(stand.getTime())) return "unbekannt";
  return `${zwei(stand.getHours())}:${zwei(stand.getMinutes())}`;
}

export function Verbindungswarnung({ status, jetzt }: { readonly status: Unterbrochen; readonly jetzt: number }): React.JSX.Element {
  const rot = status.stufe === "rot";
  return (
    <p
      role="alert"
      className="monitorwarnung"
      style={{
        width: "100%",
        textAlign: "center",
        fontWeight: 700,
        fontSize: "clamp(1.1rem, 3.5vw, 2.4rem)",
        padding: "0.3em 0.6em",
        background: rot ? "#c00000" : "#ffd400",
        color: rot ? "#fff" : "#000",
        border: "3px solid #fff",
      }}
    >
      {rot ? "✖" : "⚠"} Keine Verbindung – Stand {standUhrzeit(jetzt, status.seitMs)}
    </p>
  );
}
