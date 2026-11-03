/**
 * Die Schritte an einer Rufgruppe — als „⋯" an der gewählten Zeile der
 * Karte „Rufgruppen" und als Kontextmenü per Rechtsklick (Entwurf
 * „Entlastung", 3.7, wie der Abschnittsbaum in 3.4).
 *
 * Bis Runde 6 standen „Bearbeiten" und „Auflösen …" als Knöpfe unter dem
 * Kasten der gewählten Gruppe. Jetzt hängen sie an der Zeile, der sie
 * gelten. Eine aufgelöste Gruppe bietet „Wiederherstellen". Im beendeten
 * Einsatz stehen die Einträge grau mit dem Grund — versteckt wird nichts.
 */

import type { Rufgruppenkarte } from "@s1/domaene";

import { Klappmenue, Kontextmenue, Menueeintrag, type Kontextort, type Waehle } from "./Klappmenue.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { kuerzel, kuerzelText } from "./tastatur.js";

export interface RufgruppenschritteEigenschaften {
  readonly karte: Rufgruppenkarte;
  readonly nurLesen: boolean;
  readonly aufBearbeiten: (karte: Rufgruppenkarte) => void;
  readonly aufAufloesen: (karte: Rufgruppenkarte) => void;
  readonly aufWiederherstellen: (karte: Rufgruppenkarte) => void;
}

function Schritte({ karte, nurLesen, aufBearbeiten, aufAufloesen, aufWiederherstellen, waehle }: RufgruppenschritteEigenschaften & { readonly waehle: Waehle }): React.JSX.Element {
  const sperre = nurLesen ? TEXT_NUR_LESEN : undefined;
  if (karte.aufgeloest) {
    return <Menueeintrag text="Wiederherstellen" sperre={sperre} aufWahl={waehle(() => { aufWiederherstellen(karte); })} />;
  }
  return (
    <>
      <Menueeintrag text="Bearbeiten …" kurz={kuerzelText(kuerzel("entfernen") as never)} sperre={sperre} aufWahl={waehle(() => { aufBearbeiten(karte); })} />
      <hr />
      <Menueeintrag
        text="Auflösen …"
        rot
        sperre={sperre}
        titel="Fragt den Grund; die Teilnehmer stehen danach ohne Rufgruppe"
        aufWahl={waehle(() => { aufAufloesen(karte); })}
      />
    </>
  );
}

/** „⋯" an der gewählten Zeile. */
export function Rufgruppenzeilenmenue(eigenschaften: RufgruppenschritteEigenschaften): React.JSX.Element {
  const { karte } = eigenschaften;
  return (
    <Klappmenue
      huelle="zeilenmenue rechts"
      knopf={{
        inhalt: "⋯",
        beschriftung: `Weitere Schritte für ${karte.name}`,
        titel: karte.aufgeloest ? "Wiederherstellen" : "Bearbeiten, Auflösen",
      }}
      menue={{ beschriftung: `Rufgruppe ${karte.name}`, id: `rufgruppenmenue-${karte.rufgruppeId}` }}
      inhalt={(waehle) => <Schritte {...eigenschaften} waehle={waehle} />}
    />
  );
}

/** Dieselben Schritte als Kontextmenü an der Mausposition. */
export function Rufgruppenkontextmenue({
  ort,
  aufSchliessen,
  ...eigenschaften
}: RufgruppenschritteEigenschaften & { readonly ort: Kontextort; readonly aufSchliessen: () => void }): React.JSX.Element {
  return (
    <Kontextmenue
      ort={ort}
      beschriftung={`Rufgruppe ${eigenschaften.karte.name}`}
      aufSchliessen={aufSchliessen}
      inhalt={(waehle) => <Schritte {...eigenschaften} waehle={waehle} />}
    />
  );
}
