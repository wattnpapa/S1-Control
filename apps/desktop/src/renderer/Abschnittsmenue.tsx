/**
 * Die Schritte an einem Abschnitt — als „⋯" an der gewählten Baumzeile und
 * als Kontextmenü per Rechtsklick (Entwurf „Entlastung", 3.4, Option 6e).
 *
 * Bis Runde 6 standen Umbenennen, Typ ändern, Zeichen, Umhängen, ↑, ↓ und
 * Auflösen als sieben Knöpfe im Kopf der Karte, auch ohne Auswahl, dann
 * grau. Jetzt erscheinen sie erst an der Zeile, der sie gelten (Leitsatz 2).
 * Was mit dieser Zeile nicht geht (Systemabschnitt, schon aufgelöst, beendeter
 * Einsatz, schon oben), steht grau im Menü und nennt den Grund — versteckt
 * wird nichts, damit niemand einen Schritt sucht, den es gibt.
 */

import type { Baumknoten } from "@s1/domaene";

import { aenderbar, nachbarInReihenfolge } from "./baumordnung.js";
import { Klappmenue, Kontextmenue, Menueeintrag, type Kontextort, type Waehle } from "./Klappmenue.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import type { Abschnittsmaske } from "./Abschnittsmasken.js";

export interface AbschnittsschritteEigenschaften {
  readonly knoten: Baumknoten;
  readonly zeilen: readonly Baumknoten[];
  readonly nurLesen: boolean;
  readonly aufMaske: (maske: Abschnittsmaske) => void;
  /** Eine Stelle nach oben (-1) oder unten (1) unter denselben Eltern. */
  readonly aufVerschieben: (richtung: -1 | 1) => void;
}

/** Warum an diesem Abschnitt nichts geändert werden kann — oder nichts. */
function grundsperre(knoten: Baumknoten, nurLesen: boolean): string | undefined {
  if (nurLesen) return TEXT_NUR_LESEN;
  if (!aenderbar(knoten)) return "Eingang und Archiv lassen sich nicht ändern";
  return undefined;
}

function Schritte({ knoten, zeilen, nurLesen, aufMaske, aufVerschieben, waehle }: AbschnittsschritteEigenschaften & { readonly waehle: Waehle }): React.JSX.Element {
  const sperre = grundsperre(knoten, nurLesen);
  const oben = sperre ?? (nachbarInReihenfolge(knoten, zeilen, -1) === undefined ? "Steht schon oben" : undefined);
  const unten = sperre ?? (nachbarInReihenfolge(knoten, zeilen, 1) === undefined ? "Steht schon unten" : undefined);
  const aufloesen = sperre ?? (knoten.aufgeloestNach === undefined ? undefined : "Schon aufgelöst");
  const maske = (art: Abschnittsmaske) => waehle(() => { aufMaske(art); });
  return (
    <>
      <Menueeintrag text="Umbenennen …" sperre={sperre} aufWahl={maske("umbenennen")} />
      <Menueeintrag text="Typ ändern …" sperre={sperre} aufWahl={maske("typ")} />
      <Menueeintrag
        text="Zeichen …"
        sperre={sperre}
        titel="Das taktische Zeichen dieses Abschnitts frei wählen"
        aufWahl={maske("zeichen")}
      />
      <Menueeintrag text="Umhängen …" sperre={sperre} aufWahl={maske("umhaengen")} />
      <hr />
      <Menueeintrag text="Nach oben" sperre={oben} aufWahl={waehle(() => { aufVerschieben(-1); })} />
      <Menueeintrag text="Nach unten" sperre={unten} aufWahl={waehle(() => { aufVerschieben(1); })} />
      <hr />
      <Menueeintrag text="Auflösen …" rot sperre={aufloesen} aufWahl={maske("aufloesen")} />
    </>
  );
}

/** „⋯" an der gewählten Baumzeile. */
export function Zeilenmenue(eigenschaften: AbschnittsschritteEigenschaften): React.JSX.Element {
  const { knoten } = eigenschaften;
  return (
    <Klappmenue
      huelle="zeilenmenue rechts"
      knopf={{
        inhalt: "⋯",
        beschriftung: `Weitere Schritte für ${knoten.name}`,
        titel: "Umbenennen, Typ ändern, Zeichen, Umhängen, Reihenfolge, Auflösen",
      }}
      menue={{ beschriftung: `Abschnitt ${knoten.name}`, id: `abschnittsmenue-${knoten.id}` }}
      inhalt={(waehle) => <Schritte {...eigenschaften} waehle={waehle} />}
    />
  );
}

/** Dieselben Schritte als Kontextmenü an der Mausposition. */
export function Abschnittskontextmenue({
  ort,
  aufSchliessen,
  ...eigenschaften
}: AbschnittsschritteEigenschaften & { readonly ort: Kontextort; readonly aufSchliessen: () => void }): React.JSX.Element {
  return (
    <Kontextmenue
      ort={ort}
      beschriftung={`Abschnitt ${eigenschaften.knoten.name}`}
      aufSchliessen={aufSchliessen}
      inhalt={(waehle) => <Schritte {...eigenschaften} waehle={waehle} />}
    />
  );
}
