/**
 * Die Maske „Eintrag hinzufügen“ des Einsatztagebuchs.
 *
 * Das Tagebuch zeigt, was in der Lage geschieht — aber nicht alles, was zu
 * einem Einsatz gehört, ist eine Einheit, ein Status oder eine Anforderung:
 * ein Funkspruch, ein Rückruf, eine Lagemeldung der Behörde. Dafür gibt es
 * `EtbEintragErfasst`. Die Maske fragt, was gemeldet wurde, auf welchem Weg
 * es kam und wann es geschah (fachliche Zeit; leer heißt „jetzt“).
 *
 * Der Weg steht als Anfang des Textes („Funk: …“): Das Ereignis hat dafür
 * kein eigenes Feld, und ein Vorsatz bleibt auch im Ausdruck lesbar.
 *
 * Additiv (ETB P0-1): Ist das Tagebuch auf eine Nachricht gefiltert, trägt
 * der Eintrag sie als Bezug (`bezug` NACHRICHT) und steht danach in ihrem
 * Tagebuch — nicht nur über den Text.
 */

import { useState } from "react";

import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Maske } from "./Maske.js";
import { Zeitfeld } from "./Zeitfeld.js";
import { TEXT_ZEITFORMAT, funkzeitAusEingabe } from "./funkzeit.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";

/** Die Wege, auf denen eine Meldung ankommt. */
export const QUELLEN = ["Funk", "Telefon", "Meldung vor Ort", "Lagebesprechung", "Sonstiges"] as const;

/** Der Text, wie er im Tagebuch steht: mit dem Weg als Vorsatz. */
export function eintragstext(quelle: string, text: string): string {
  const inhalt = text.trim();
  return quelle === "" ? inhalt : `${quelle}: ${inhalt}`;
}

export interface TagebuchEintragEigenschaften {
  readonly aufSchliessen: () => void;
  /** Additiv (ETB P0-1): die Nachricht, zu der der Eintrag gehört — Kennung und Name („Nachricht E 3“). */
  readonly nachricht?: { readonly id: string; readonly name: string } | undefined;
}

export function TagebuchEintrag({ aufSchliessen, nachricht }: TagebuchEintragEigenschaften): React.JSX.Element {
  const versuch = useAnlegeversuch();
  const [text, setzeText] = useState("");
  const [quelle, setzeQuelle] = useState<string>(QUELLEN[0]);
  const [zeit, setzeZeit] = useState("");
  // Leer heißt „jetzt“; sonst muss die Eingabe lesbar sein.
  const zeitpunkt = zeit.trim() === "" ? undefined : funkzeitAusEingabe(zeit);
  const zeitUnlesbar = zeit.trim() !== "" && zeitpunkt === undefined;

  async function schreibe(): Promise<void> {
    // Kennung und „jetzt“ in einem gehaltenen Wert: `kennung` merkt sich nur
    // einen, ein zweiter Aufruf gäbe die ETB-Kennung als Zeitpunkt zurück.
    const { etbId, gesetzt } = versuch.kennung(() => ({ etbId: neueId("ETB"), gesetzt: new Date().toISOString() }));
    const ergebnis = await versuch.schreibe({
      typ: "EtbEintragErfasst",
      nutzlast: {
        etbId,
        zeitpunkt: zeitpunkt ?? gesetzt,
        text: eintragstext(quelle, text),
        ...(nachricht === undefined ? {} : { bezug: { entitaet: "NACHRICHT", id: nachricht.id } }),
      },
    });
    if (ergebnis?.art !== "geschrieben") return;
    aufSchliessen();
    await useLaden.getState().holeTagebuch();
  }

  return (
    <Maske
      titel={nachricht === undefined ? "Eintrag ins Einsatztagebuch" : `Eintrag ins Einsatztagebuch zu ${nachricht.name}`}
      bestaetigungstext="Eintrag speichern"
      bereit={text.trim() !== "" && !zeitUnlesbar && !versuch.gesperrt}
      bereitGrund={zeitUnlesbar ? "Zeit lesbar eintragen oder leer lassen" : "Text eintragen"}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={schreibe}
    >
      <label>
        Was wurde gemeldet?
        <textarea
          rows={3}
          value={text}
          onChange={(e) => {
            setzeText(e.target.value);
          }}
        />
      </label>
      <label>
        Quelle
        <select
          value={quelle}
          onChange={(e) => {
            setzeQuelle(e.target.value);
          }}
        >
          {QUELLEN.map((eintrag) => (
            <option key={eintrag} value={eintrag}>
              {eintrag}
            </option>
          ))}
        </select>
      </label>
      <label>
        Zeit der Meldung
        <Zeitfeld wert={zeit} aufAenderung={setzeZeit} platzhalter="leer = jetzt, sonst z. B. 0630" />
      </label>
      {zeitUnlesbar && <span className="feldfehler">{TEXT_ZEITFORMAT}</span>}
      {versuch.anzeige}
    </Maske>
  );
}
