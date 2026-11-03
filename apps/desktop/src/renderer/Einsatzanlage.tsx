/**
 * Die Maske „Neuer Einsatz …" der Einsatzauswahl (Entwurf „Entlastung",
 * 3.8, Option 6g): Name, Datum und die Stammdaten in einem Schritt.
 *
 * Die Felder sind die der Stammdatenmaske (`Stammdatenfelder`), dazu das
 * Datum, das mit dem Namen den Ordner der Einsatzdatei bildet. Vorbelegt
 * sind Datum und Beginn mit jetzt, die Art „Einsatz" und zwei Schichten; die
 * Führungsstelle bleibt leer, bis jemand sie einträgt — ein Platzhalter
 * stünde sonst auf jedem Ausdruck. Geschrieben wird über
 * `legeEinsatzMitStammdatenAn` (`einsatzanlage.ts`).
 *
 * Scheitert die Anlage (gleicher Name am selben Tag, kein Share), bleibt die
 * Maske mit allen Eingaben offen; der Grund steht im Fehlerbild des
 * Fensters und hier am Knopf.
 */

import { useState } from "react";

import { zeitpunktText } from "@s1/domaene";

import { anlagefehler, legeEinsatzMitStammdatenAn } from "./einsatzanlage.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import type { Stammdateneingabe } from "./stammdatenformular.js";
import { Stammdatenfelder } from "./Stammdatenmaske.js";

/** Heute als `JJJJ-MM-TT` in der Ortszeit des Arbeitsplatzes. */
export function heute(jetzt: Date = new Date()): string {
  const zwei = (n: number): string => String(n).padStart(2, "0");
  return `${String(jetzt.getFullYear())}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}`;
}

function leereStammdaten(): Stammdateneingabe {
  return {
    name: "",
    art: "EINSATZ",
    fuestName: "",
    uebergeordneteFuestName: "",
    ort: "",
    beginn: zeitpunktText(new Date().toISOString()),
    schichtmodell: "ZWEI_SCHICHT",
  };
}

export function Einsatzanlage({ aufSchliessen }: { readonly aufSchliessen: () => void }): React.JSX.Element {
  const fehler = useLaden((z) => z.fehler);
  const [datum, setzeDatum] = useState(() => heute());
  const [stammdaten, setzeStammdaten] = useState<Stammdateneingabe>(leereStammdaten);
  const grund = anlagefehler({ datum, stammdaten });

  return (
    <Maske
      titel="Neuer Einsatz"
      bestaetigungstext="Einsatz anlegen"
      bereit={grund === undefined}
      bereitGrund={grund}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={async () => {
        if (await legeEinsatzMitStammdatenAn({ datum, stammdaten })) aufSchliessen();
      }}
    >
      <p className="hinweistext">
        Name, Führungsstelle und übergeordnete Führungsstelle stehen danach auf jedem Ausdruck. Alles lässt sich später im Blatt Führungsstelle
        unter Stammdaten ändern.
      </p>
      <Stammdatenfelder
        eingabe={stammdaten}
        aufAendern={(feld, wert) => setzeStammdaten((bisher) => ({ ...bisher, [feld]: wert }))}
        nachName={
          <>
            <label>
              Datum
              <input type="date" value={datum} aria-describedby="erklaerung-datum" onChange={(e) => setzeDatum(e.target.value)} />
            </label>
            <p id="erklaerung-datum" className="hinweistext feldsatz">
              Steht mit dem Namen im Namen der Einsatzdatei auf dem Share.
            </p>
          </>
        }
      />
      {fehler !== undefined && (
        <p className="hinweistext" role="alert">
          {fehler}
        </p>
      )}
    </Maske>
  );
}
