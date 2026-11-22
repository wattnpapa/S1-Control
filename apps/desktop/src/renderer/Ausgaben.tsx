/**
 * Die Kernausgaben in der Oberfläche (M4.1).
 *
 * Druck, Status, Einheitenliste und die übrigen Blätter der Vorlage, je als
 * PDF, HTML oder XLSX. Keine rechnet selbst. Welche es gibt und in welcher
 * Gruppe sie stehen, steht in `Ausgabenkatalog.ts`; hier wird nur gezeichnet.
 *
 * **Aufbau.** Oben die zuletzt erzeugte Datei, damit sie nach dem Klick ohne
 * Scrollen sichtbar ist. Darunter je Anlass eine Tabelle: eine Zeile je
 * Ausgabe mit kurzem Zweck, die Formate in festen Spalten. Dann der
 * HTML-Monitor, der kein einmaliger Export ist, sondern sich fortschreibt.
 * Ganz unten und deutlich abgesetzt der Abschluss des Einsatzes.
 *
 * **Der Pfad wird genannt.** Ein „fertig“ ohne Pfad zwingt den Bediener, die
 * Datei zu suchen; sie liegt im Ordner `ausgaben\` des Einsatzes auf dem
 * Share (KONZEPT-SPEICHER.md §1.4). Daneben stehen „Öffnen“, „Ordner zeigen“
 * und bei HTML „Drucken“ (`Ausgabedatei.tsx`).
 */

import { useState } from "react";

import { ORGANISATIONEN } from "@s1/domaene";

import type { Ausgabeergebnis } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { Ausgabedatei } from "./Ausgabedatei.js";
import {
  AUSGABEGRUPPEN,
  FORMATSPALTEN,
  knopfname,
  type Ausgabeart,
  type Ausgabeformat,
  type Ausgabegruppe,
  type Ausgabezeile,
} from "./Ausgabenkatalog.js";
import { Einsatzabschluss } from "./Einsatzabschluss.js";

type Erzeuge = (ausgabe: Ausgabeart, format: Ausgabeformat) => void;

export function Ausgaben(): React.JSX.Element {
  const laden = useLaden();
  const [organisation, setzeOrganisation] = useState("THW");
  const [erzeugt, setzeErzeugt] = useState<Ausgabeergebnis | undefined>(undefined);

  const erzeuge: Erzeuge = (ausgabe, format) => {
    setzeErzeugt(undefined);
    void (async () => {
      const ergebnis = await laden.erzeugeAusgabe(ausgabe, format, ausgabe === "druck" ? organisation : undefined);
      if (ergebnis === undefined) return;
      setzeErzeugt(ergebnis);
    })();
  };

  return (
    <section aria-label="Exporte" className="ausgaben">
      <div className="ausgabenkopf">
        <h2>Exporte</h2>
        <span className="hinweistext">Jede Datei wird im Ordner „ausgaben“ des Einsatzes abgelegt.</span>
      </div>
      <div className="ausgabeergebnis" aria-live="polite">
        {erzeugt !== undefined && (
          <Ausgabedatei pfad={erzeugt.pfad} vorsatz="Geschrieben" zusatz={`${String(erzeugt.bytes)} Bytes`} />
        )}
        {erzeugt?.weitere?.map((datei) => (
          <Ausgabedatei key={datei.pfad} pfad={datei.pfad} vorsatz="Dazu geschrieben" zusatz={`${String(datei.bytes)} Bytes`} />
        ))}
      </div>
      <div className="ausgabegruppen">
        {AUSGABEGRUPPEN.map((gruppe) => (
          <Gruppentabelle
            key={gruppe.titel}
            gruppe={gruppe}
            erzeuge={erzeuge}
            organisationswahl={<Organisationswahl wert={organisation} setze={setzeOrganisation} />}
          />
        ))}
      </div>
      <HtmlMonitor organisation={organisation} />
      <Einsatzabschluss />
    </section>
  );
}

interface GruppentabelleEigenschaften {
  readonly gruppe: Ausgabegruppe;
  readonly erzeuge: Erzeuge;
  readonly organisationswahl: React.JSX.Element;
}

function Gruppentabelle({ gruppe, erzeuge, organisationswahl }: GruppentabelleEigenschaften): React.JSX.Element {
  return (
    <section className="ausgabegruppe" aria-label={gruppe.titel}>
      <table className="ausgabetabelle">
        <caption>{gruppe.titel}</caption>
        <tbody>
          {gruppe.zeilen.map((zeile) => (
            <tr key={zeile.ausgabe}>
              <th scope="row">
                <span className="ausgabename">{zeile.name}</span>
                <span className="hinweistext">{zeile.zweck}</span>
                {zeile.mitOrganisation === true && organisationswahl}
              </th>
              {FORMATSPALTEN.map((format) => (
                <td key={format} className="ausgabeformat">
                  <Formatknopf zeile={zeile} format={format} erzeuge={erzeuge} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

interface FormatknopfEigenschaften {
  readonly zeile: Ausgabezeile;
  readonly format: Ausgabeformat;
  readonly erzeuge: Erzeuge;
}

/** Der Knopf zeigt nur das Format; der zugängliche Name nennt die ganze Ausgabe. */
function Formatknopf({ zeile, format, erzeuge }: FormatknopfEigenschaften): React.JSX.Element | null {
  const angebot = zeile.formate.find((eintrag) => eintrag.format === format);
  if (angebot === undefined) return null;
  const name = knopfname(zeile, angebot);
  return (
    <button
      type="button"
      aria-label={name}
      title={angebot.titel ?? name}
      onClick={() => { erzeuge(angebot.ausgabe ?? zeile.ausgabe, format); }}
    >
      {format.toUpperCase()}
      {angebot.zusatz !== undefined && <span className="formatzusatz">{angebot.zusatz}</span>}
    </button>
  );
}

function Organisationswahl({ wert, setze }: { wert: string; setze(wert: string): void }): React.JSX.Element {
  return (
    <label className="schalter" title="Der Druck weist zusätzlich die Stärke dieser Organisation aus">
      Davon-Stärke
      <select
        value={wert}
        onChange={(e) => {
          setze(e.target.value);
        }}
      >
        {ORGANISATIONEN.map((eintrag) => (
          <option key={eintrag} value={eintrag}>
            {eintrag}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Der HTML-Monitor (M4.3) ist keine einmalige Ausgabe, sondern eine Datei,
 * die sich fortschreibt — deshalb ein Schalter und kein Knopf. Nicht zu
 * verwechseln mit dem Lagemonitor aus M3.5: Der ist ein Fenster dieser
 * Anwendung, dieser hier eine Datei für ein fremdes Gerät.
 */
function HtmlMonitor({ organisation }: { organisation: string }): React.JSX.Element {
  const htmlMonitor = useLaden((zustand) => zustand.htmlMonitor);
  const schalteHtmlMonitor = useLaden((zustand) => zustand.schalteHtmlMonitor);
  return (
    <section className="ausgabemonitor" aria-label="Fortlaufende Ausgabe">
      <h3>Fortlaufend</h3>
      <label className="schalter">
        <input
          type="checkbox"
          checked={htmlMonitor !== undefined}
          onChange={(e) => {
            void schalteHtmlMonitor(e.target.checked, false, organisation);
          }}
        />
        HTML-Monitor für ein zweites Gerät
      </label>
      <span className="hinweistext">
        {htmlMonitor === undefined ? "Schreibt die Stärke laufend in eine Datei, die ein anderes Gerät anzeigen kann." : `Monitorseite: ${htmlMonitor}`}
      </span>
    </section>
  );
}
