/**
 * Die Zelle „Rufgruppe" der Zuordnung im Blatt „Funkplan" (Option 5b):
 * bearbeitbar wie eine Zelle der Einheitentabelle — Doppelklick (oder Enter)
 * öffnet die Wahl, Enter schreibt, Esc verwirft.
 *
 * Zur Wahl stehen alle geltenden Rufgruppen, „keine Rufgruppe" und „Neue
 * Rufgruppe anlegen …"; das Letzte öffnet die Anlage und setzt die neue
 * Gruppe danach an dieser Einheit. Geschrieben wird mit `rufgruppenwahl`,
 * also über denselben Bedienschritt wie die Einheitentabelle, mit dem Wert,
 * den die Zelle beim Öffnen sah. Solange sie offen ist, sperrt sie die
 * Einheit für die anderen Arbeitsplätze.
 */

import { useState } from "react";

import { projektion, type Funkteilnehmer, type Rufgruppenkarte } from "@s1/domaene";

import { hinweisAusErgebnis } from "./Anlegeversuch.js";
import { Betriebsartmarke, OhneRufgruppe } from "./Funkmarken.js";
import { useLaden } from "./laden.js";
import { sperrtext, useFremdsperren, useSperreHalten } from "./useBearbeitungssperre.js";
import { rufgruppenwahl } from "../kontrakt/funkschritte.js";

/** Der Wert der Auswahl, der die Anlage öffnet — keine Kennung kann so heißen. */
export const NEUE_RUFGRUPPE = " neu";

export interface RufgruppenzelleEigenschaften {
  readonly teilnehmer: Funkteilnehmer;
  /** Alle Rufgruppen des Plans; zur Wahl stehen die geltenden. */
  readonly rufgruppen: readonly Rufgruppenkarte[];
  readonly nurLesen: boolean;
  readonly aufNeu: (teilnehmer: Funkteilnehmer) => void;
}

function Anzeige({ t, karte }: { readonly t: Funkteilnehmer; readonly karte: Rufgruppenkarte | undefined }): React.JSX.Element {
  if (t.rufgruppeId === undefined) return <OhneRufgruppe />;
  if (t.rufgruppeAufgeloest) {
    return (
      <>
        <span className="mono durchgestrichen">{t.rufgruppe}</span> <OhneRufgruppe />
      </>
    );
  }
  return (
    <>
      {karte?.betriebsart === "DMO" && <Betriebsartmarke betriebsart="DMO" />} <span className="mono">{t.rufgruppe}</span>
    </>
  );
}

/** „THW_OL_FUE (TMO · Führung)" — so steht eine Gruppe in der Auswahl. */
function wahltext(r: Rufgruppenkarte): string {
  return `${r.name} (${projektion.betriebsartWort(r.betriebsart)}${r.zweck === undefined ? "" : ` · ${r.zweck}`})`;
}

interface WahllisteEigenschaften {
  readonly t: Funkteilnehmer;
  readonly rufgruppen: readonly Rufgruppenkarte[];
  readonly wahl: string;
  readonly aufWahl: (wert: string) => void;
  readonly aufSchreiben: () => void;
  readonly aufSchliessen: () => void;
}

/** Die offene Zelle: Enter schreibt, Esc und Wegklicken verwerfen. */
function Wahlliste(props: WahllisteEigenschaften): React.JSX.Element {
  return (
    <td className="bearbeitbar offen rufgruppenzelle">
      <select
        aria-label={`Rufgruppe für ${props.t.einheit}`}
        autoFocus
        value={props.wahl}
        onChange={(e) => props.aufWahl(e.target.value)}
        onBlur={props.aufSchliessen}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            props.aufSchreiben();
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            props.aufSchliessen();
          }
        }}
      >
        {props.rufgruppen
          .filter((r) => !r.aufgeloest)
          .map((r) => (
            <option key={r.rufgruppeId} value={r.rufgruppeId}>
              {wahltext(r)}
            </option>
          ))}
        <option value="">— keine Rufgruppe —</option>
        <option value={NEUE_RUFGRUPPE}>Neue Rufgruppe anlegen …</option>
      </select>
    </td>
  );
}

export function Rufgruppenzelle({ teilnehmer: t, rufgruppen, nurLesen, aufNeu }: RufgruppenzelleEigenschaften): React.JSX.Element {
  const [offen, setzeOffen] = useState<{ readonly vorher: string | undefined } | undefined>(undefined);
  // Eine aufgelöste Gruppe steht nicht zur Wahl; die Zelle beginnt dann bei „keine".
  const start = t.rufgruppeAufgeloest ? "" : (t.rufgruppeId ?? "");
  const [wahl, setzeWahl] = useState(start);
  const bediene = useLaden((z) => z.bediene);
  const melde = useLaden((z) => z.melde);
  const fremd = useFremdsperren();
  useSperreHalten(offen === undefined ? undefined : t.einheitId);
  const karte = rufgruppen.find((r) => r.rufgruppeId === t.rufgruppeId);
  const gesperrtVon = fremd.von(t.einheitId);

  const oeffne = (): void => {
    if (nurLesen) return;
    const hinweis = fremd.pruefeStart(t.einheitId);
    if (hinweis !== undefined) {
      melde("warnung", hinweis);
      return;
    }
    setzeWahl(start);
    setzeOffen({ vorher: t.rufgruppeId });
  };

  const schreibe = (): void => {
    const vorher = offen?.vorher;
    setzeOffen(undefined);
    const entwurf = rufgruppenwahl(t.einheitId, vorher, wahl);
    if (entwurf === undefined) return;
    void bediene(entwurf).then((ergebnis) => {
      const hinweis = hinweisAusErgebnis(ergebnis);
      if (hinweis !== undefined) melde("warnung", `${t.einheit}: ${hinweis}`);
    });
  };

  if (offen === undefined || nurLesen) {
    return (
      <td
        className="bearbeitbar rufgruppenzelle"
        tabIndex={nurLesen ? undefined : 0}
        title={nurLesen ? undefined : "Doppelklick oder Enter: Rufgruppe wählen"}
        onDoubleClick={oeffne}
        onKeyDown={(e) => {
          if (e.key === "Enter") oeffne();
        }}
      >
        <Anzeige t={t} karte={karte} />
        {gesperrtVon !== undefined && <span className="warnung"> {sperrtext(gesperrtVon)}</span>}
      </td>
    );
  }
  return (
    <Wahlliste
      t={t}
      rufgruppen={rufgruppen}
      wahl={wahl}
      aufWahl={(wert) => {
        if (wert !== NEUE_RUFGRUPPE) {
          setzeWahl(wert);
          return;
        }
        setzeOffen(undefined);
        aufNeu(t);
      }}
      aufSchreiben={schreibe}
      aufSchliessen={() => setzeOffen(undefined)}
    />
  );
}
