/**
 * Die Masken der Fernmeldezentrale und der Nachweisung (KONZEPT-NACHRICHTEN.md
 * §5, §6, Schnitt N2): welcher Vermerk gerade offen ist und ob die
 * Eingangsmaske steht — die Verdrahtung hinter den Knöpfen der Warteschlange,
 * der Nachweisung und „Eingang aufnehmen", neben `useNachrichtenschritte`.
 *
 * Die Eingangsmaske ist die Nachrichtenmaske mit Richtung Eingang und
 * freigeschaltetem oberem Teil; Anschrift ist der Name der eigenen
 * Führungsstelle aus den Stammdaten (§5 „Eingang von außen"), die Nummer
 * „höchste bekannte plus eins" aus der Ansicht.
 */

import { useState } from "react";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Nachrichtenansicht, Sitzungsstellen } from "../kontrakt/index.js";
import { eingangVorlage } from "./fmzformate.js";
import { Fmzmaske, type Fmzschritt } from "./Fmzmasken.js";
import { useLaden } from "./laden.js";
import type { Maskenwerte } from "./nachrichtenformate.js";
import { Nachrichtenmaske } from "./Nachrichtenmaske.js";

export interface Fmzschritte {
  readonly aufSchritt: (schritt: Fmzschritt, zeile: Nachrichtenzeile) => void;
  readonly aufEingang: () => void;
  readonly masken: React.ReactNode;
}

export function useFmzschritte(ansicht: Nachrichtenansicht | undefined, sitzung: Sitzungsstellen | undefined): Fmzschritte {
  const [offen, setzeOffen] = useState<{ readonly schritt: Fmzschritt; readonly zeile: Nachrichtenzeile } | undefined>(undefined);
  // Die Vorlage beim Öffnen gemerkt: Die Maske vergleicht mit ihr, ob etwas getippt ist.
  const [eingang, setzeEingang] = useState<Maskenwerte | undefined>(undefined);
  const fuestName = useLaden((z) => z.lagebild?.stammdaten?.fuestName);
  // Die Zeile bleibt der Stand beim Öffnen: Er ist der Vorwert, den der Schritt mitschickt (§2.2a).
  const masken = (
    <>
      {offen !== undefined && (
        <Fmzmaske
          key={`${offen.schritt}/${offen.zeile.id}`}
          schritt={offen.schritt}
          zeile={offen.zeile}
          handzeichen={sitzung?.handzeichen ?? ""}
          naechsteNummer={ansicht?.naechsteNummer}
          vergebeneNummern={ansicht?.vergebeneNummern}
          gegenstellen={ansicht?.gegenstellen}
          aufSchliessen={() => setzeOffen(undefined)}
        />
      )}
      {eingang !== undefined && (
        <Nachrichtenmaske
          titel="Eingang aufnehmen"
          vorlage={eingang}
          anschriften={ansicht?.anschriften ?? []}
          aufnahme={{ naechsteNummer: ansicht?.naechsteNummer, vergebeneNummern: ansicht?.vergebeneNummern }}
          aufSchliessen={() => setzeEingang(undefined)}
        />
      )}
    </>
  );
  return { aufSchritt: (schritt, zeile) => setzeOffen({ schritt, zeile }), aufEingang: () => setzeEingang(eingangVorlage(sitzung, fuestName)), masken };
}
