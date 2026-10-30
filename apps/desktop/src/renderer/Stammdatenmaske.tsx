/**
 * Die Stammdaten des Einsatzes — das Blatt „Stammdaten“ der Excel als Maske.
 *
 * Die Vorlage verlangt beim Start den Namen des Einsatzes, den Namen der
 * eigenen Führungsstelle und die übergeordnete Führungsstelle; der FüSt-Name
 * steht danach auf jedem Ausdruck. Beim Anlegen trägt der Einsatz dort den
 * Namen des Arbeitsplatzes, weil die Anlage einen Namen verlangt (§5.2) —
 * diese Maske ist der Ort, ihn richtig zu setzen.
 *
 * **Ein Ereignis je geändertem Feld.** Die Maske sammelt die Eingaben und
 * schreibt beim Übernehmen nur, was sich geändert hat, jeweils mit dem Wert,
 * den dieses Fenster gezeigt hat (§2.2a). Ändern zwei Arbeitsplätze zugleich
 * verschiedene Felder, gelten beide.
 */

import { useState } from "react";

import { einsatzArtTitel, schichtmodellTitel, zeitpunktText, type Einsatzstammdaten } from "@s1/domaene";

import { Maske } from "./Maske.js";
import { useLaden } from "./laden.js";
import {
  eingabeAus,
  eingabeFehler,
  stammdatenEntwuerfe,
  type Stammdateneingabe,
} from "./stammdatenformular.js";

const EINSATZARTEN = ["EINSATZ", "UEBUNG", "VERANSTALTUNG"] as const;
const SCHICHTMODELLE = ["ZWEI_SCHICHT", "DREI_SCHICHT"] as const;

/** Die Textfelder in der Reihenfolge des Blattes, mit den Wörtern der Excel. */
const TEXTFELDER = [
  { feld: "name", titel: "Einsatzname / Bezeichnung" },
  { feld: "fuestName", titel: "Name der Führungsstelle (FüSt)" },
  { feld: "uebergeordneteFuestName", titel: "Übergeordnete Führungsstelle" },
  { feld: "ort", titel: "Einsatzort" },
  { feld: "beginn", titel: "Einsatzbeginn (TT.MM.JJJJ HH:MM)" },
] as const;

export interface StammdatenmaskeEigenschaften {
  readonly einsatzId: string;
  readonly stammdaten: Einsatzstammdaten;
  aufSchliessen(): void;
}

export function Stammdatenmaske({
  einsatzId,
  stammdaten,
  aufSchliessen,
}: StammdatenmaskeEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [eingabe, setzeEingabe] = useState<Stammdateneingabe>(() => eingabeAus(stammdaten));
  const fehler = eingabeFehler(eingabe);

  function aendere(feld: keyof Stammdateneingabe, wert: string): void {
    setzeEingabe((bisher) => ({ ...bisher, [feld]: wert }));
  }

  async function uebernimm(): Promise<void> {
    for (const entwurf of stammdatenEntwuerfe(einsatzId, stammdaten, eingabe)) {
      const ergebnis = await laden.bediene(entwurf);
      // §8.8 Punkt 1: Geht ein Schritt nicht durch, bleibt die Maske offen
      // und die Eingabe stehen; was schon geschrieben ist, zeigt das Tagebuch.
      if (ergebnis?.art !== "geschrieben") return;
    }
    aufSchliessen();
  }

  return (
    <Maske
      titel="Stammdaten des Einsatzes"
      bereit={fehler === undefined}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={uebernimm}
    >
      {TEXTFELDER.map(({ feld, titel }) => (
        <label key={feld}>
          {titel}
          <input
            type="text"
            value={eingabe[feld]}
            onChange={(e) => {
              aendere(feld, e.target.value);
            }}
          />
        </label>
      ))}
      <label>
        Einsatzart
        <select
          value={eingabe.art}
          onChange={(e) => {
            aendere("art", e.target.value);
          }}
        >
          {EINSATZARTEN.map((wert) => (
            <option key={wert} value={wert}>
              {einsatzArtTitel(wert)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Schichtmodell
        <select
          value={eingabe.schichtmodell}
          onChange={(e) => {
            aendere("schichtmodell", e.target.value);
          }}
        >
          {SCHICHTMODELLE.map((wert) => (
            <option key={wert} value={wert}>
              {schichtmodellTitel(wert)}
            </option>
          ))}
        </select>
      </label>
      {fehler !== undefined && (
        <p className="hinweistext" role="status">
          {fehler}
        </p>
      )}
    </Maske>
  );
}

/**
 * Die Stammdaten als eine Tabellenzeile über dem Blatt der Führungsstelle,
 * mit dem Knopf, der die Maske öffnet.
 *
 * Hier und nicht in einem eigenen Reiter: Das Blatt „Stammdaten“ der Excel
 * hat drei Zeilen, und ein Reiter für drei Zeilen kostete im Kopfband mehr
 * Platz, als er trägt. Die Führungsstelle ist das Blatt, auf dem der eigene
 * Name steht.
 */
export function Stammdatenblock(): React.JSX.Element | null {
  const lagebild = useLaden((zustand) => zustand.lagebild);
  const [offen, setzeOffen] = useState(false);
  const daten = lagebild?.stammdaten;
  if (lagebild === undefined || daten === undefined) return null;

  return (
    <div className="stammdaten">
      <table aria-label="Stammdaten">
        <thead>
          <tr>
            <th scope="col">Einsatz</th>
            <th scope="col">Art</th>
            <th scope="col">FüSt</th>
            <th scope="col">Übergeordnete FüSt</th>
            <th scope="col">Einsatzort</th>
            <th scope="col">Beginn</th>
            <th scope="col">Schichtmodell</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{daten.name}</td>
            <td>{einsatzArtTitel(daten.art)}</td>
            <td>{daten.fuestName}</td>
            <td>{daten.uebergeordneteFuestName ?? "—"}</td>
            <td>{daten.ort ?? "—"}</td>
            <td>{zeitpunktText(daten.beginn)}</td>
            <td>{schichtmodellTitel(daten.schichtmodell)}</td>
          </tr>
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => {
          setzeOffen(true);
        }}
      >
        Stammdaten bearbeiten
      </button>
      {offen && (
        <Stammdatenmaske
          einsatzId={lagebild.einsatzId}
          stammdaten={daten}
          aufSchliessen={() => {
            setzeOffen(false);
          }}
        />
      )}
    </div>
  );
}
