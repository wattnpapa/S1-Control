/**
 * Eine Zeile der Einheitentabelle — flach oder, mit Gliederung, eingerückt.
 *
 * Die Zeile wählt (Klick, mit Strg dazu) und öffnet per Rechtsklick das
 * Kontextmenü der Auswahl; die Zellen bearbeiten sich selbst
 * (`Einheitenzelle.tsx`) nach den Regeln aus `useZellbearbeitung.ts`.
 */

import type { Spalte, Tabellenzeile } from "@s1/domaene";

import type { Zustandswahl } from "../kontrakt/index.js";
import { Zelle } from "./Einheitenzelle.js";
import { einzug } from "./Tabellengliederung.js";
import { sperrtext, type Fremdsperren } from "./useBearbeitungssperre.js";
import type { Zellbearbeitung } from "./useZellbearbeitung.js";

export interface EinheitenzeileEigenschaften {
  readonly zeile: Tabellenzeile;
  readonly spalten: readonly Spalte[];
  /** Mit Gliederung: die Tiefe des Bereichs, unter dem die Zeile steht. */
  readonly tiefe?: number | undefined;
  readonly zustand: { readonly markiert: boolean; readonly gewaehlt: boolean };
  readonly umgebung: Zeilenumgebung;
}

/** Was alle Zeilen gemeinsam haben: Sperren, Bearbeitung, Auswahlwerte, Handlungen. */
export interface Zeilenumgebung {
  readonly nurLesen: boolean;
  readonly zellen: Zellbearbeitung;
  readonly fremd: Fremdsperren;
  readonly auswahlwerte: { readonly [schluessel: string]: readonly Zustandswahl[] } | undefined;
  readonly aufKlick: (einheitId: string, mitStrg: boolean) => void;
  readonly aufKontext: (einheitId: string, ereignis: React.MouseEvent) => void;
}

export function Einheitenzeile({ zeile, spalten, tiefe, zustand, umgebung }: EinheitenzeileEigenschaften): React.JSX.Element {
  const { nurLesen, zellen, fremd, auswahlwerte } = umgebung;
  const sperre = fremd.von(zeile.einheitId);
  return (
    <tr
      className={[zustand.markiert ? "markiert" : "", zustand.gewaehlt ? "gewaehlt" : "", zeile.entfernt ? "entfernt" : ""]
        .filter((klasse) => klasse !== "")
        .join(" ")}
      onClick={(ereignis) => {
        umgebung.aufKlick(zeile.einheitId, ereignis.ctrlKey || ereignis.metaKey);
      }}
      onContextMenu={(ereignis) => {
        umgebung.aufKontext(zeile.einheitId, ereignis);
      }}
    >
      <th scope="row" title={zeile.abschnittId} style={tiefe === undefined ? undefined : einzug(tiefe)}>
        {zeile.abschnittName}
        {sperre !== undefined && (
          <span className="warnung" role="status">
            {" "}
            {sperrtext(sperre)}
          </span>
        )}
      </th>
      {spalten.map((spalte) => {
        const hier = zellen.offen?.zeile === zeile.einheitId && zellen.offen.spalte === spalte.schluessel;
        const werteliste = auswahlwerte?.[spalte.schluessel];
        return (
          <Zelle
            key={spalte.schluessel}
            zeile={zeile}
            spalte={spalte}
            gesperrt={nurLesen}
            {...(zellen.verbindungssperre === undefined ? {} : { sperre: zellen.verbindungssperre })}
            {...(werteliste === undefined ? {} : { werteliste })}
            bearbeitet={hier}
            fehler={hier ? zellen.fehler : undefined}
            aufBearbeiten={() => {
              zellen.starte(zeile, spalte);
            }}
            aufFertig={(eingabe) => zellen.schreibe(zeile, spalte, eingabe)}
            aufAbbrechen={() => {
              zellen.verwirf(zeile, spalte);
            }}
          />
        );
      })}
    </tr>
  );
}
