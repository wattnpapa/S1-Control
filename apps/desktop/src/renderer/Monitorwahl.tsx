/**
 * Die Monitorwahl (M3.5).
 *
 * Zwei Knöpfe und eine Liste — mehr ist es nicht, und mehr soll es nicht
 * sein: Der Stärke-Monitor wird einmal zu Beginn eines Einsatzes aufgezogen
 * und danach nicht mehr angefasst.
 *
 * **Die Bildschirme werden erst beim Aufklappen geholt.** Ein Kabel wird
 * mitten im Einsatz umgesteckt; eine Liste, die beim Start geladen wurde,
 * zeigte dann einen Bildschirm, den es nicht mehr gibt. Ihre Kennungen
 * überleben ohnehin keinen Neustart und werden deshalb auch nicht gemerkt.
 */

import { useState } from "react";

import { useLaden } from "./laden.js";

export function Monitorwahl(): React.JSX.Element {
  const laden = useLaden();
  const [offen, setzeOffen] = useState(false);

  return (
    <span className="monitorwahl">
      <button
        type="button"
        onClick={() => {
          setzeOffen((bisher) => !bisher);
          if (!offen) void laden.ladeBildschirme();
        }}
      >
        Stärke-Monitor
      </button>

      {offen && (
        <span className="monitorwahlliste">
          <button
            type="button"
            onClick={() => {
              void laden.oeffneMonitor();
              setzeOffen(false);
            }}
            title="Ohne Wahl geht der Monitor auf dem zweiten Bildschirm auf"
          >
            Auf dem Zweitbildschirm öffnen
          </button>
          {(laden.bildschirme ?? []).map((bildschirm) => (
            <button
              key={bildschirm.id}
              type="button"
              onClick={() => {
                void laden.oeffneMonitor(bildschirm.id);
                setzeOffen(false);
              }}
            >
              {bildschirm.name} ({bildschirm.breite}×{bildschirm.hoehe}
              {bildschirm.primaer ? ", Hauptbildschirm" : ""})
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              void laden.schliesseMonitor();
              setzeOffen(false);
            }}
          >
            Schließen
          </button>
        </span>
      )}
    </span>
  );
}
