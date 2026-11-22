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
import { ldfBesetzt } from "../kontrakt/ldfschritte.js";
import { eingangVorlage } from "./fmzformate.js";
import { Fmzmaske, type Fmzschritt } from "./Fmzmasken.js";
import { useLaden } from "./laden.js";
import type { Maskenwerte } from "./nachrichtenformate.js";
import { Nachrichtenmaske } from "./Nachrichtenmaske.js";

/** Der Satz zur Ersatzregel in der Beförderungsmaske. */
export const TEXT_LDF_ERSATZ = "Kein LdF besetzt: Ihre Beförderung gilt als Zuteilung, die Nachricht geht danach direkt an den Sichter.";

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
  // Additiv (2026-11-17): Führt der Einsatz den LdF als Station und ist keiner da, gilt die Ersatzregel.
  // 2026-11-22: ohne Angabe ist der LdF Station.
  const ldfStation = useLaden((z) => z.lagebild?.stammdaten?.ldfStation !== false);
  const peers = useLaden((z) => z.lagebild?.peers);
  const ldfDa = ldfBesetzt(sitzung?.stellen, peers ?? []);
  const ldfErsatz = ldfStation && !ldfDa ? TEXT_LDF_ERSATZ : undefined;
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
          rufgruppen={ansicht?.rufgruppen}
          aufSchliessen={() => setzeOffen(undefined)}
          ldfErsatz={ldfErsatz}
          fernmelder={ansicht?.fernmelder}
          fernmelderbesetzung={ansicht?.fernmelderbesetzung}
          ldfWartet={ldfStation && ldfDa && !(sitzung?.stellen ?? []).includes("LDF")}
        />
      )}
      {eingang !== undefined && (
        <Nachrichtenmaske
          titel="Eingang aufnehmen"
          vorlage={eingang}
          anschriften={ansicht?.anschriften ?? []}
          aufnahme={{ naechsteNummer: ansicht?.naechsteNummer, vergebeneNummern: ansicht?.vergebeneNummern }}
          gegenstellen={ansicht?.gegenstellen}
          rufgruppen={ansicht?.rufgruppen}
          entwurfsschluessel="eingang"
          aufSchliessen={() => setzeEingang(undefined)}
        />
      )}
    </>
  );
  return { aufSchritt: (schritt, zeile) => setzeOffen({ schritt, zeile }), aufEingang: () => setzeEingang(eingangVorlage(sitzung, fuestName)), masken };
}
