/**
 * Die Maske „Abschnitt anlegen" des Abschnittsbaums.
 *
 * Die Kennung des Abschnitts gilt für die ganze Dialoginstanz
 * (`Anlegeversuch.tsx`): Geht die Antwort verloren und der Bediener übernimmt
 * erneut, ist das dieselbe Anlage und nicht ein zweiter Abschnitt gleichen
 * Namens. Eingaben bleiben bei jedem Fehler stehen, der Hinweis bleibt im Dialog.
 */

import { useState, type ReactNode } from "react";

import { Maske } from "./Maske.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";

export interface AbschnittAnlegenEigenschaften {
  /** Der Abschnitt, unter den der neue gehängt wird; `undefined` = Wurzel. */
  readonly elternId: string | undefined;
  readonly reihenfolge: number;
  readonly aufSchliessen: () => void;
  /** Die Typwahl des Baums — hier nur eingesetzt, um keinen Importkreis zu bauen. */
  readonly typwahl: (wert: string, aufWahl: (typ: string) => void) => ReactNode;
}

export function AbschnittAnlegen({ elternId, reihenfolge, aufSchliessen, typwahl }: AbschnittAnlegenEigenschaften): React.JSX.Element {
  const [name, setzeName] = useState("");
  const [typ, setzeTyp] = useState("EINSATZORT");
  const versuch = useAnlegeversuch();

  async function schreibe(): Promise<void> {
    const abschnittId = versuch.kennung(() => neueId("A"));
    const ergebnis = await versuch.schreibe({
      typ: "AbschnittAngelegt",
      nutzlast: {
        abschnittId,
        name: name.trim(),
        typ,
        // Unter dem gewählten Abschnitt, wenn einer gewählt ist; der Weg zurück
        // an die Wurzel ist ein Umhängen.
        ...(elternId === undefined ? {} : { parentId: elternId }),
        reihenfolge,
      },
    });
    if (ergebnis?.art !== "geschrieben") return;
    aufSchliessen();
    await useLaden.getState().holeBaum();
  }

  return (
    <Maske
      titel="Abschnitt anlegen"
      bestaetigungstext="Abschnitt anlegen"
      bereit={name.trim().length > 0 && !versuch.gesperrt}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={schreibe}
    >
      <label>
        Name
        <input value={name} onChange={(e) => { setzeName(e.target.value); }} />
      </label>
      <label>
        Typ
        {typwahl(typ, setzeTyp)}
      </label>
      {versuch.anzeige}
    </Maske>
  );
}
