/**
 * Die Werkzeugzeile des Blattes „Versorgung" (S4.3) — was je Unteransicht
 * neben dem Umschalter steht: die Mahlzeitenregel (für alle sichtbar, bei
 * Verpflegung und Vorausschau bearbeitbar), „Ausgabestelle anlegen",
 * „Bestellung …" für die erste noch unbestellte Mahlzeit und die Ausgaben.
 */

import { useState } from "react";

import type { Versorgungsblatt } from "@s1/domaene";

import { vorschlagAus } from "./Bestellkarte.js";
import { useNurLesen } from "./Nurlesen.js";
import { AusgabestelleMaske, BestellMaske, MahlzeitenregelMaske } from "./Verpflegungsmasken.js";
import { Versorgungsausgabe } from "./Versorgungsausgabe.js";
import { mahlzeitText } from "./versorgungstext.js";
import type { Unteransicht } from "./Versorgung.js";

type Offen = "regel" | "ausgabestelle" | "bestellung" | undefined;

export function Werkzeuge({ ansicht, blatt }: { readonly ansicht: Unteransicht; readonly blatt: Versorgungsblatt }): React.JSX.Element {
  const nurLesen = useNurLesen();
  const [offen, setzeOffen] = useState<Offen>(undefined);
  const schliesse = (): void => setzeOffen(undefined);
  const stelle = blatt.vorausschau.mahlzeiten.findIndex((_, i) => blatt.bestellstand[i]?.bestellung === undefined);
  const unbestellt = stelle === -1 ? undefined : blatt.vorausschau.mahlzeiten[stelle];
  const mitRegel = ansicht === "verpflegung" || ansicht === "vorausschau";
  return (
    <>
      {mitRegel && (
        <button type="button" disabled={nurLesen} onClick={() => setzeOffen("regel")} title={blatt.regeltext}>
          Mahlzeitenregel: {blatt.regelVorbelegung ? "Vorbelegung" : "eigene"} …
        </button>
      )}
      {ansicht === "verpflegung" && !nurLesen && (
        <button type="button" onClick={() => setzeOffen("ausgabestelle")}>
          Ausgabestelle anlegen
        </button>
      )}
      {ansicht === "vorausschau" && unbestellt !== undefined && !nurLesen && (
        <button type="button" className="haupt" onClick={() => setzeOffen("bestellung")}>
          Bestellung {mahlzeitText(unbestellt.mahlzeit)} {unbestellt.uhrzeit} …
        </button>
      )}
      <span className="werkzeugrechts">
        {ansicht === "verpflegung" && <Versorgungsausgabe ausgabe="bestellliste" titel="Bestellliste" />}
        {ansicht === "vorausschau" && <Versorgungsausgabe ausgabe="vorausschau" titel="Vorausschau" />}
      </span>
      {offen === "regel" && <MahlzeitenregelMaske regel={blatt.plan.regel} vorbelegung={blatt.regelVorbelegung} aufSchliessen={schliesse} />}
      {offen === "ausgabestelle" && <AusgabestelleMaske aufSchliessen={schliesse} />}
      {offen === "bestellung" && unbestellt !== undefined && (
        <BestellMaske vorschlag={vorschlagAus(unbestellt)} ausgabestellen={blatt.ausgabestellen} aufSchliessen={schliesse} />
      )}
    </>
  );
}
