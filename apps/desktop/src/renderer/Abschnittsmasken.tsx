/**
 * Die Masken des Abschnittsbaums (M3.1): anlegen, umbenennen, Typ ändern,
 * Zeichen, umhängen, auflösen.
 *
 * Jede Maske baut genau **ein** Ereignis aus §5.3; der Baum schreibt es über
 * `bediene` und holt sich danach neu. Jeder gesetzte Schritt trägt seinen
 * `vorher`-Wert (§2.2a, Auflage 6) — den Wert aus dem Knoten, den dieser
 * Arbeitsplatz gerade sieht: „was ich gesehen habe", nicht „was gilt".
 *
 * **Zeichen und Typ sind zweierlei.** Der Typ entscheidet, ob die Stärke des
 * Abschnitts in die Gesamtstärke eingeht (§5.3.3), und eine Änderung daran
 * verlangt einen Grund (§2.4). Das Zeichen entscheidet nichts davon; es sagt,
 * womit der Abschnitt auf der Karte und in der Harke steht.
 *
 * Seit Runde 6 („Entlastung", 3.4) öffnen das Menü „⋯" an der gewählten
 * Baumzeile und das Kontextmenü diese Masken; vorher standen sieben Knöpfe
 * im Kopf der Karte.
 */

import { useState } from "react";

import { ABSCHNITTSTYPEN, abschnittstypTitel, type Baumknoten } from "@s1/domaene";

import { AbschnittAnlegen } from "./AbschnittAnlegen.js";
import { elternVon, naechsteReihenfolge, schliessteZyklus } from "./baumordnung.js";
import { langform } from "./harke.js";
import { Maske } from "./Maske.js";
import { Zeichenwahl } from "./Zeichenwahl.js";
import type { Entwurf } from "../kontrakt/index.js";

/** Welche Maske gerade offen ist — höchstens eine. */
export type Abschnittsmaske = "anlegen" | "umbenennen" | "typ" | "zeichen" | "umhaengen" | "aufloesen";

export type Abschnittsentwurf = Entwurf;

interface MaskenEigenschaften {
  readonly knoten: Baumknoten;
  readonly zeilen: readonly Baumknoten[];
  readonly aufSchliessen: () => void;
  /** Schreibt, schließt die Maske nach bestätigtem Schreiben und holt den Baum neu. */
  readonly bediene: (entwurf: Abschnittsentwurf) => Promise<void>;
}

export interface AbschnittsmaskenEigenschaften extends Omit<MaskenEigenschaften, "knoten"> {
  readonly maske: Abschnittsmaske | undefined;
  readonly knoten: Baumknoten | undefined;
  readonly gewaehlt: string | undefined;
}

export function Abschnittsmasken({ maske, knoten, gewaehlt, ...gemeinsam }: AbschnittsmaskenEigenschaften): React.JSX.Element | null {
  if (maske === "anlegen") {
    return (
      <AbschnittAnlegen
        elternId={gewaehlt === undefined || knoten?.systemAbschnitt === true ? undefined : gewaehlt}
        reihenfolge={naechsteReihenfolge(gemeinsam.zeilen, gewaehlt)}
        aufSchliessen={gemeinsam.aufSchliessen}
        typwahl={(wert, aufWahl) => <Typwahl wert={wert} aufWahl={aufWahl} />}
      />
    );
  }
  if (maske === undefined || knoten === undefined) return null;
  const eigenschaften = { knoten, ...gemeinsam };
  switch (maske) {
    case "umbenennen":
      return <Umbenennen {...eigenschaften} />;
    case "typ":
      return <TypAendern {...eigenschaften} />;
    case "zeichen":
      return <ZeichenSetzen {...eigenschaften} />;
    case "umhaengen":
      return <Umhaengen {...eigenschaften} />;
    case "aufloesen":
      return <Aufloesen {...eigenschaften} />;
  }
}

function Umbenennen({ knoten, aufSchliessen, bediene }: MaskenEigenschaften): React.JSX.Element {
  const [eingabe, setzeEingabe] = useState(knoten.name);
  return (
    <Maske
      titel={`„${knoten.name}“ umbenennen`}
      bestaetigungstext="Name speichern"
      bereit={eingabe.trim().length > 0}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={() =>
        bediene({ typ: "AbschnittUmbenannt", nutzlast: { abschnittId: knoten.id }, vorher: knoten.name, neu: eingabe.trim() })
      }
    >
      <label>
        Neuer Name
        <input value={eingabe} onChange={(e) => { setzeEingabe(e.target.value); }} />
      </label>
    </Maske>
  );
}

function TypAendern({ knoten, aufSchliessen, bediene }: MaskenEigenschaften): React.JSX.Element {
  const [eingabe, setzeEingabe] = useState(knoten.typ);
  const [grund, setzeGrund] = useState("");
  return (
    <Maske
      titel={`Typ von „${knoten.name}“ ändern`}
      bestaetigungstext="Typ speichern"
      // §2.4: `AbschnittTypGeaendert` verlangt einen Grund. Am Typ hängt
      // `zaehltInGesamtstaerke` — eine Änderung verschiebt die
      // Gesamtstärke, und wer sie später liest, soll wissen, warum.
      bereit={eingabe !== knoten.typ && grund.trim().length > 0}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={() =>
        bediene({
          typ: "AbschnittTypGeaendert",
          nutzlast: { abschnittId: knoten.id },
          vorher: knoten.typ,
          neu: eingabe,
          grund: grund.trim(),
        })
      }
    >
      <label>
        Typ
        <Typwahl wert={eingabe} aufWahl={setzeEingabe} />
      </label>
      <label>
        Grund (Pflicht)
        <input value={grund} onChange={(e) => { setzeGrund(e.target.value); }} />
      </label>
    </Maske>
  );
}

function ZeichenSetzen({ knoten, aufSchliessen, bediene }: MaskenEigenschaften): React.JSX.Element {
  const [eingabe, setzeEingabe] = useState(knoten.zeichen ?? "");
  return (
    <Maske
      titel={`Zeichen von „${knoten.name}“`}
      // Kein Grund und keine Pflichtangabe: Das Zeichen ist eine Aussage
      // über die Darstellung und nicht über die Lage — es verschiebt keine
      // Stärke und keine Zählregel, anders als der Typ (§2.4).
      bereit={eingabe !== (knoten.zeichen ?? "")}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={() =>
        bediene({
          typ: "AbschnittZeichenGesetzt",
          nutzlast: { abschnittId: knoten.id },
          vorher: knoten.zeichen ?? null,
          neu: eingabe === "" ? null : eingabe,
        })
      }
    >
      <Zeichenwahl
        wert={eingabe === "" ? undefined : eingabe}
        abgeleitet={`${langform(knoten.typ, knoten.tiefe)} (aus dem Typ)`}
        aufWahl={(kennung) => {
          setzeEingabe(kennung ?? "");
        }}
      />
    </Maske>
  );
}

function Umhaengen({ knoten, zeilen, aufSchliessen, bediene }: MaskenEigenschaften): React.JSX.Element {
  const [ziel, setzeZiel] = useState("");
  return (
    <Maske
      titel={`„${knoten.name}“ umhängen`}
      bestaetigungstext="Abschnitt umhängen"
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={() =>
        bediene({
          typ: "AbschnittUmgehaengt",
          nutzlast: { abschnittId: knoten.id },
          vorher: elternVon(zeilen, knoten.id) ?? null,
          neu: ziel === "" ? null : ziel,
        })
      }
    >
      <label>
        Übergeordneter Abschnitt
        <select value={ziel} onChange={(e) => { setzeZiel(e.target.value); }}>
          <option value="">— an die Wurzel —</option>
          {zeilen
            .filter((zeile) => !schliessteZyklus(zeilen, knoten.id, zeile.id))
            .map((zeile) => (
              <option key={zeile.id} value={zeile.id}>
                {zeile.name}
              </option>
            ))}
        </select>
      </label>
      <p className="hinweistext">Abschnitte, die einen Zyklus schlössen, stehen nicht zur Wahl.</p>
    </Maske>
  );
}

/** Wohin die Einheiten eines aufgelösten Abschnitts laufen dürfen: nicht in sich, nicht in Aufgelöste oder Systemabschnitte. */
function aufloesungsziele(zeilen: readonly Baumknoten[], knoten: Baumknoten): readonly Baumknoten[] {
  return zeilen.filter(
    (zeile) => zeile.id !== knoten.id && zeile.aufgeloestNach === undefined && zeile.typ !== "ARCHIV" && zeile.typ !== "EINGANG",
  );
}

function Aufloesen({ knoten, zeilen, aufSchliessen, bediene }: MaskenEigenschaften): React.JSX.Element {
  const [ziel, setzeZiel] = useState("");
  const { fuehrer, unterfuehrer, mannschaft } = knoten.summenStaerke;
  return (
    <Maske
      titel={`„${knoten.name}“ auflösen`}
      bestaetigungstext="Auflösen"
      bereit={ziel !== ""}
      bereitGrund="Zielabschnitt wählen"
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={() =>
        bediene({
          typ: "AbschnittAufgeloest",
          nutzlast: { abschnittId: knoten.id },
          vorher: null,
          neu: { zielAbschnittId: ziel, aufgeloestAm: new Date().toISOString() },
        })
      }
    >
      <label>
        Einheiten laufen weiter in
        <select value={ziel} onChange={(e) => { setzeZiel(e.target.value); }}>
          <option value="">— bitte wählen —</option>
          {aufloesungsziele(zeilen, knoten).map((zeile) => (
            <option key={zeile.id} value={zeile.id}>
              {zeile.name}
            </option>
          ))}
        </select>
      </label>
      <p className="hinweistext" data-testid="aufloesen-betrifft">
        Betrifft „{knoten.name}“: {String(knoten.einheitenSumme)} Einheit(en), Stärke {fuehrer}/{unterfuehrer}/{mannschaft}.
      </p>
      <p className="hinweistext">
        Der Abschnitt bleibt sichtbar und lässt sich wiederherstellen; seine Einheiten stehen ab sofort im gewählten Ziel.
      </p>
    </Maske>
  );
}

/** Die bekannten Abschnittstypen (§5.3) ohne die beiden systemseitigen; der Bereich bleibt offen (§3.7). */
function Typwahl({ wert, aufWahl }: { wert: string; aufWahl: (typ: string) => void }): React.JSX.Element {
  return (
    <select value={wert} onChange={(e) => { aufWahl(e.target.value); }}>
      {ABSCHNITTSTYPEN.filter((typ) => typ !== "ARCHIV" && typ !== "EINGANG").map((typ) => (
        <option key={typ} value={typ}>
          {abschnittstypTitel(typ)}
        </option>
      ))}
    </select>
  );
}
