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

import { useEffect, useState } from "react";

import type { Dienstpostenzeile, Teilbereichsblock } from "@s1/domaene";

import { useLaden } from "./laden.js";
import {
  dienstpostenAnlegen,
  dienstpostenBesetzt,
  dienstpostenEntfernt,
  dienstpostenWiederhergestellt,
  schichtplanEintrag,
} from "../kontrakt/bedienschritte.js";

/** Die fünf Teilbereiche der Vorlage — die Vorbelegung der Anlegemaske. */
const TEILBEREICHE = ["Stab", "ZTr FK", "FGr F", "FGr K", "Externe"] as const;

/** Die Schichten, die das Blatt führt. Die Vorlage kennt Tag und Nacht paarweise. */
const SCHICHTEN = ["TAG", "NACHT", "FRUEH", "SPAET"] as const;

const ROLLENTEXT: Readonly<Record<string, string>> = {
  fuehrer: "Fü",
  unterfuehrer: "UFü",
  mannschaft: "He",
};

function neueKennung(): string {
  return `dp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Fuehrungsstelle(): React.JSX.Element {
  const laden = useLaden();
  const holeFuest = laden.holeFuest;
  const [neu, setzeNeu] = useState({ teileinheit: "Stab", funktion: "", schicht: "TAG" });
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

  useEffect(() => {
    void holeFuest();
  }, [holeFuest]);

  const ansicht = laden.fuest;
  const tage = [...new Set([...(ansicht?.plan.tage ?? []), ...zusaetzlicheTage])].sort();

  function lege(): void {
    if (neu.funktion.trim() === "") return;
    const bisher = ansicht?.bloecke.find((block) => block.teileinheit === neu.teileinheit);
    void laden.bediene(
      dienstpostenAnlegen({
        dienstpostenId: neueKennung(),
        teileinheit: neu.teileinheit,
        funktion: neu.funktion.trim(),
        schicht: neu.schicht,
        // Ans Ende des Teilbereichs: Wer einen Posten ergänzt, ergänzt ihn
        // unten und nicht mitten hinein.
        reihenfolge: (bisher?.zeilen.length ?? 0) + 1,
      }),
    );
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
      <h2>Führungsstelle</h2>

      <div className="fuestsumme">
        {ansicht.staerke.length === 0 ? (
          <p className="hinweistext">Kein Dienstposten besetzt.</p>
        ) : (
          <ul>
            {ansicht.staerke.map((zeile) => (
              <li key={`${zeile.teileinheit}-${zeile.schicht}`}>
                {zeile.teileinheit} · {zeile.schicht}: {zeile.staerke.fuehrer}/
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
            onChange={(e) => {
              setzeNeu((wert) => ({ ...wert, funktion: e.target.value }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") lege();
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
                {wert}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={lege}>
          Dienstposten anlegen
        </button>
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
          Kalender (§5.7); für den ersten Eintrag eines Tages öffnet der Knopf oben eine Spalte.
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
                  {zeile.funktion} · {zeile.schicht}
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

function Block({ block }: { readonly block: Teilbereichsblock }): React.JSX.Element {
  return (
    <div className="teilbereich">
      <h3>{block.teileinheit}</h3>
      <table className="dienstposten">
        <thead>
          <tr>
            <th scope="col">Funktion</th>
            <th scope="col">Schicht</th>
            <th scope="col">Rolle</th>
            <th scope="col">Besetzung</th>
            <th scope="col">Handlung</th>
          </tr>
        </thead>
        <tbody>
          {block.zeilen.map((zeile) => (
            <Postenzeile key={zeile.id} zeile={zeile} />
          ))}
          {Object.entries(block.summeJeSchicht).map(([schicht, staerke]) => (
            <tr key={schicht} className="summenzeile">
              <th scope="row" colSpan={3}>
                Besetzt · {schicht}
              </th>
              <td colSpan={2}>
                {staerke.fuehrer}/{staerke.unterfuehrer}/{staerke.mannschaft}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Postenzeile({ zeile }: { readonly zeile: Dienstpostenzeile }): React.JSX.Element {
  const laden = useLaden();
  const [entwurf, setzeEntwurf] = useState<string | undefined>(undefined);

  function uebernimm(): void {
    if (entwurf === undefined) return;
    const neu = entwurf.trim();
    setzeEntwurf(undefined);
    if (neu === zeile.besetzung) return;
    // §2.2a: `vorher` ist der Wert, den dieses Fenster gezeigt hat. Ein leeres
    // Feld heißt „unbesetzt“, und das ist im Zustand `null` und nicht "".
    void laden.bediene(
      dienstpostenBesetzt(zeile.id, zeile.besetzung === "" ? null : zeile.besetzung, neu),
    );
  }

  return (
    <tr className={zeile.entfernt ? "entfernt" : ""}>
      <th scope="row">{zeile.funktion}</th>
      <td>{zeile.schicht}</td>
      <td>{ROLLENTEXT[zeile.rolle] ?? zeile.rolle}</td>
      <td>
        <input
          type="text"
          aria-label={`Besetzung ${zeile.funktion} ${zeile.schicht}`}
          value={entwurf ?? zeile.besetzung}
          disabled={zeile.entfernt}
          onChange={(e) => {
            setzeEntwurf(e.target.value);
          }}
          onBlur={uebernimm}
          onKeyDown={(e) => {
            if (e.key === "Enter") uebernimm();
            if (e.key === "Escape") setzeEntwurf(undefined);
          }}
        />
      </td>
      <td>
        {zeile.entfernt ? (
          <button
            type="button"
            onClick={() => {
              void laden.bediene(dienstpostenWiederhergestellt(zeile.id));
            }}
          >
            Wiederherstellen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              // §2.4: Auch hier ist der Grund Pflicht — ein Dienstposten
              // verschwindet nicht ohne Erklärung aus dem Blatt.
              const grund = globalThis.prompt("Grund für das Entfernen");
              if (grund === null || grund.trim() === "") return;
              void laden.bediene(dienstpostenEntfernt(zeile.id, grund.trim()));
            }}
          >
            Entfernen
          </button>
        )}
      </td>
    </tr>
  );
}

function Planzelle({
  dienstpostenId,
  datum,
  text,
}: {
  readonly dienstpostenId: string;
  readonly datum: string;
  readonly text: string;
}): React.JSX.Element {
  const laden = useLaden();
  const [entwurf, setzeEntwurf] = useState<string | undefined>(undefined);

  return (
    <td>
      <input
        type="text"
        aria-label={`Plan ${dienstpostenId} ${datum}`}
        value={entwurf ?? text}
        onChange={(e) => {
          setzeEntwurf(e.target.value);
        }}
        onBlur={() => {
          if (entwurf === undefined || entwurf === text) {
            setzeEntwurf(undefined);
            return;
          }
          const neu = entwurf;
          setzeEntwurf(undefined);
          void laden.bediene(
            schichtplanEintrag(dienstpostenId, datum, text === "" ? null : text, neu),
          );
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setzeEntwurf(undefined);
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </td>
  );
}
