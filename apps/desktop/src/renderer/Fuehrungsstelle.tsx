/**
 * Das Blatt der Führungsstelle: Dienstposten und Schichtplan (M5.4).
 *
 * Vorbild ist `excel-domaenenmodell.md` §5. Das Blatt ist dort ausdrücklich
 * ein **zweites Modell** neben der Einheitenliste: Funktion (Dienstposten) ×
 * Schicht × Rolle → Besetzung, dazu ein Dienstplan Funktion × Tag.
 *
 * **Warum die eigene Stärke nicht als Einheit gemeldet wird.** Sie erscheint
 * im Lagebild wie jede andere Stärke, entsteht aber aus den besetzten
 * Dienstposten — das rechnet K17. Würde die Führungsstelle zusätzlich als
 * Einheit erfasst, stünde sie zweimal in der Gesamtstärke.
 *
 * **Die Besetzung trägt einen Namen und keine Eins.** Die Vorlage setzt in
 * die Rollenspalte eine „1“; hier steht, wer den Posten besetzt. Das ist
 * mehr und nicht weniger: Die Rolle folgt der Funktion, gezählt wird über
 * K17, und wer wann Dienst hatte, steht damit auch im Tagebuch.
 */

import { useEffect, useRef, useState } from "react";

import { schichtTitel } from "@s1/domaene";

import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Block, Planzelle } from "./Fuehrungsstellenzeilen.js";
import { useLaden } from "./laden.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { NurLesenHinweis, useNurLesen } from "./Nurlesen.js";
import { Hilfemarke } from "./Hilfemarke.js";
import { Stammdatenblock } from "./Stammdatenmaske.js";
import { dienstpostenAnlegen } from "../kontrakt/bedienschritte.js";

/** Die fünf Teilbereiche der Vorlage — die Vorbelegung der Anlegemaske. */
const TEILBEREICHE = ["Stab", "ZTr FK", "FGr F", "FGr K", "Externe"] as const;

/** Die Schichten, die das Blatt führt. Die Vorlage kennt Tag und Nacht paarweise. */
const SCHICHTEN = ["TAG", "NACHT", "FRUEH", "SPAET"] as const;

function neueKennung(): string {
  return `dp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Fuehrungsstelle(): React.JSX.Element {
  const laden = useLaden();
  const holeFuest = laden.holeFuest;
  const [neu, setzeNeu] = useState({ teileinheit: "Stab", funktion: "", schicht: "TAG" });
  const versuch = useAnlegeversuch();
  const nurLesen = useNurLesen();
  /**
   * Tage, die dieses Fenster zusätzlich zeigt.
   *
   * Die Spalten des Plans kommen aus den Daten (§5.7) — sonst stünden 36
   * leere Spalten da wie in der Vorlage. Der erste Eintrag eines Tages
   * braucht aber eine Zelle, in die er geschrieben werden kann. Diese Liste
   * ist deshalb reine Fenstersache und gehört nicht in den Store: Sie
   * überlebt keinen Wechsel der Akte und muss es nicht.
   */
  const [zusaetzlicheTage, setzeZusaetzlicheTage] = useState<readonly string[]>([]);
  const [neuerTag, setzeNeuenTag] = useState("");
  const anlageLaeuft = useRef(false);

  useEffect(() => {
    void holeFuest();
  }, [holeFuest]);

  const ansicht = laden.fuest;
  const tage = [...new Set([...(ansicht?.plan.tage ?? []), ...zusaetzlicheTage])].sort();

  async function lege(): Promise<void> {
    if (neu.funktion.trim() === "" || versuch.gesperrt || nurLesen || anlageLaeuft.current) return;
    anlageLaeuft.current = true;
    try {
      await legeAn();
    } finally {
      anlageLaeuft.current = false;
    }
  }

  async function legeAn(): Promise<void> {
    const bisher = ansicht?.bloecke.find((block) => block.teileinheit === neu.teileinheit);
    // Die Kennung bleibt bei einer Wiederholung gleich (`Anlegeversuch.tsx`);
    // die Eingabe wird erst nach bestätigtem Schreiben geleert.
    const ergebnis = await versuch.schreibe(
      dienstpostenAnlegen({
        dienstpostenId: versuch.kennung(neueKennung),
        teileinheit: neu.teileinheit,
        funktion: neu.funktion.trim(),
        schicht: neu.schicht,
        // Ans Ende des Teilbereichs: Wer einen Posten ergänzt, ergänzt ihn
        // unten und nicht mitten hinein.
        reihenfolge: (bisher?.zeilen.length ?? 0) + 1,
      }),
    );
    if (ergebnis?.art !== "geschrieben") return;
    versuch.verwerfe();
    setzeNeu((wert) => ({ ...wert, funktion: "" }));
  }

  if (ansicht === undefined) {
    return (
      <section aria-label="Führungsstelle" className="fuehrungsstelle">
        <p className="hinweistext">Wird geladen …</p>
      </section>
    );
  }

  return (
    <section aria-label="Führungsstelle" className="fuehrungsstelle">
      <h2>Führungsstelle <Hilfemarke kennung="fuehrungsstelle" /></h2>

      {/* Oben die Stammdaten: Das Blatt „Stammdaten“ der Excel trägt den
          Namen, unter dem diese Führungsstelle auf jedem Ausdruck steht. */}
      <NurLesenHinweis />

      <Stammdatenblock />

      <div className="fuestsumme">
        {ansicht.staerke.length === 0 ? (
          <p className="hinweistext">Kein Dienstposten besetzt.</p>
        ) : (
          <ul>
            {ansicht.staerke.map((zeile) => (
              <li key={`${zeile.teileinheit}-${zeile.schicht}`}>
                {zeile.teileinheit} · {schichtTitel(zeile.schicht)}: {zeile.staerke.fuehrer}/
                {zeile.staerke.unterfuehrer}/{zeile.staerke.mannschaft}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dienstpostenneu">
        <label>
          Teilbereich
          <select
            value={neu.teileinheit}
            onChange={(e) => {
              setzeNeu((wert) => ({ ...wert, teileinheit: e.target.value }));
            }}
          >
            {TEILBEREICHE.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Funktion
          <input
            type="text"
            value={neu.funktion}
            disabled={nurLesen}
            onChange={(e) => {
              setzeNeu((wert) => ({ ...wert, funktion: e.target.value }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void lege();
            }}
          />
        </label>
        <label>
          Schicht
          <select
            value={neu.schicht}
            onChange={(e) => {
              setzeNeu((wert) => ({ ...wert, schicht: e.target.value }));
            }}
          >
            {SCHICHTEN.map((wert) => (
              <option key={wert} value={wert}>
                {schichtTitel(wert)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={versuch.gesperrt || nurLesen}
          title={versuch.sperre ?? (nurLesen ? TEXT_NUR_LESEN : undefined)}
          onClick={() => void lege()}
        >
          Dienstposten anlegen
        </button>
        {neu.funktion.trim() === "" && !nurLesen && (
          <span className="hinweistext" data-testid="dienstposten-fehlt">
            Funktion eintragen
          </span>
        )}
        {versuch.anzeige}
      </div>

      {ansicht.bloecke.map((block) => (
        <Block key={block.teileinheit} block={block} />
      ))}

      <h3>Schichtplan</h3>
      <div className="planneu">
        <label>
          Tag anzeigen
          <input
            type="date"
            value={neuerTag}
            onChange={(e) => {
              setzeNeuenTag(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          disabled={neuerTag === ""}
          onClick={() => {
            setzeZusaetzlicheTage((bisher) => [...bisher, neuerTag]);
            setzeNeuenTag("");
          }}
        >
          Spalte öffnen
        </button>
      </div>
      {tage.length === 0 ? (
        <p className="hinweistext">
          Noch kein Tag beschrieben. Die Spalten entstehen aus den Einträgen und nicht aus einem
          Kalender; für den ersten Eintrag eines Tages öffnet der Knopf oben eine Spalte.
        </p>
      ) : (
        <table className="schichtplan">
          <thead>
            <tr>
              <th scope="col">Funktion</th>
              {tage.map((tag) => (
                <th key={tag} scope="col">
                  {tag}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ansicht.plan.zeilen.map((zeile) => (
              <tr key={zeile.dienstpostenId}>
                <th scope="row">
                  {zeile.funktion} · {schichtTitel(zeile.schicht)}
                </th>
                {tage.map((tag) => (
                  <Planzelle
                    key={tag}
                    dienstpostenId={zeile.dienstpostenId}
                    datum={tag}
                    text={zeile.tage[tag] ?? ""}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
