/**
 * Die Einheitentabelle (M3.2).
 *
 * Sie ist das Blatt „Stärke“ der Excel: eine Zeile je Einheit, die
 * Spaltengruppen zuschaltbar, und die Bearbeitung findet in der Zelle statt.
 * Wer heute in der Excel arbeitet, klickt in eine Zelle, tippt und drückt
 * Enter; jede Maske, die sich dazwischenschiebt, kostet Zeit, die eine
 * Führungsstelle im Meldungstakt nicht hat.
 *
 * **Die Zelle trägt zwei Werte** (§2.2a, Auflage 6): den Text, der angezeigt
 * wird, und den Wert, den ein Bedienschritt als `vorher` mitschickt.
 * Angezeigt wird „0/1/8“, geschickt wird das Tripel — und geprüft wird gegen
 * das, was **dieses Fenster** gesehen hat. Eine Zelle, an der ein Hinweis
 * hängt, wird markiert; das ist die sichtbare Seite von §3.8.
 *
 * **Der Ausschnitt kommt vom Worker.** Die Ansicht holt hundert Zeilen und
 * nicht fünftausend (M3.7); die Zahl unter der Tabelle nennt trotzdem alle
 * Treffer. Das ist die Antwort auf „150 Einheiten flüssig“ aus der DoD — nicht
 * schnelleres Zeichnen, sondern weniger zu zeichnen.
 */

import { useEffect, useMemo, useState } from "react";

import { projektion, type Spalte, type Spaltengruppe, type Tabellenzeile } from "@s1/domaene";

import { Einheitenmasken } from "./Einheitenmasken.js";
import { Untertabellen } from "./Untertabellen.js";
import { eingabeAlsWert, inlineEntwurf } from "../kontrakt/bedienschritte.js";
import { useLaden } from "./laden.js";
import { kuerzel, kuerzelText, useKuerzel } from "./tastatur.js";
import { Hilfemarke } from "./Hilfemarke.js";

/**
 * Die Spaltengruppen, wie sie am Umschalter stehen.
 *
 * In der Projektion heißen sie wie in der Excel (`KOSTENUEBERSICHT`); über
 * einer Tabelle gelesen sind Versalien ohne Umlaute keine Beschriftung,
 * sondern ein Bezeichner.
 */
const GRUPPENTITEL: Record<string, string> = {
  GRUNDDATEN: "Grunddaten",
  STAERKE: "Stärke",
  RESSOURCENPLANUNG: "Ressourcen",
  LOGISTIKDATEN: "Logistik",
  KOSTENUEBERSICHT: "Kosten",
};

/**
 * Der Ton einer Statusmarke.
 *
 * **Farbe und Wort, nie Farbe allein** (§9-Regel der Oberfläche): Die Marke
 * trägt den Status ausgeschrieben; die Farbe ist die zweite Auskunft für den
 * Blick über die Spalte, nicht die erste.
 */
const STATUSTON: Record<string, string> = {
  IM_EINSATZ: "ok",
  EINSATZBEREIT: "ok",
  ANMARSCH: "warn",
  ANGEFORDERT: "warn",
  NICHT_EINSATZBEREIT: "fehler",
};

/** Zahlenspalten stehen rechts: Wer Stärken vergleicht, liest Spalten. */
function istZahl(spalte: Spalte): boolean {
  return spalte.art === "zahl" || spalte.schluessel === "gesamt" || spalte.schluessel === "staerke";
}

/** Welche Maske offen ist — höchstens eine. */
export type Einheitenmaske =
  | "anlegen"
  | "verschieben"
  | "aufteilen"
  | "zusammenfuehren"
  | "entfernen"
  | undefined;

export interface EinheitentabelleEigenschaften {
  /** Der gewählte Abschnitt filtert die Tabelle; `undefined` heißt „alle“. */
  readonly abschnittId: string | undefined;
  /** Die gewählte Einheit filtert das Tagebuch. */
  readonly einheitId: string | undefined;
  readonly aufEinheit: (einheitId: string | undefined) => void;
}

export function Einheitentabelle({
  abschnittId,
  einheitId,
  aufEinheit,
}: EinheitentabelleEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [gruppen, setzeGruppen] = useState<readonly Spaltengruppe[]>(
    projektion.SICHTBARE_GRUPPEN_VORBELEGUNG,
  );
  const [suche, setzeSuche] = useState("");
  const [maske, setzeMaske] = useState<Einheitenmaske>(undefined);
  /** Mehrfachauswahl für „verschieben (auch mehrere)“ und das Zusammenführen. */
  const [markiert, setzeMarkiert] = useState<readonly string[]>([]);
  const [bearbeitet, setzeBearbeitet] = useState<{ zeile: string; spalte: string } | undefined>(undefined);

  const setzeTabellenfilter = laden.setzeTabellenfilter;
  const akteId = laden.akteId;
  useEffect(() => {
    if (akteId === undefined) return;
    void setzeTabellenfilter({
      ...(abschnittId === undefined ? {} : { abschnittId }),
      ...(suche === "" ? {} : { suche }),
    });
  }, [akteId, abschnittId, suche, setzeTabellenfilter]);

  const spalten = useMemo(() => projektion.spaltenDerGruppen(gruppen), [gruppen]);
  const zeilen = laden.tabelle?.zeilen ?? [];
  const gewaehlte = zeilen.filter((zeile) => markiert.includes(zeile.einheitId));
  const summe = useMemo(
    () =>
      zeilen.reduce(
        (bisher, zeile) =>
          zeile.entfernt
            ? bisher
            : {
                fuehrer: bisher.fuehrer + zeile.staerke.fuehrer,
                unterfuehrer: bisher.unterfuehrer + zeile.staerke.unterfuehrer,
                mannschaft: bisher.mannschaft + zeile.staerke.mannschaft,
              },
        { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
      ),
    [zeilen],
  );

  useKuerzel(
    useMemo(
      () => ({
        anlegen: () => {
          setzeMaske("anlegen");
        },
        verschieben: () => {
          if (markiert.length > 0) setzeMaske("verschieben");
        },
        entfernen: () => {
          if (markiert.length === 1) setzeMaske("entfernen");
        },
        suchen: () => {
          document.getElementById("einheitensuche")?.focus();
        },
        abbrechen: () => {
          if (maske !== undefined) setzeMaske(undefined);
          else if (bearbeitet !== undefined) setzeBearbeitet(undefined);
          else setzeMarkiert([]);
        },
      }),
      [markiert, maske, bearbeitet],
    ),
  );

  function schalteGruppe(gruppe: Spaltengruppe): void {
    setzeGruppen((bisher) =>
      bisher.includes(gruppe) ? bisher.filter((eintrag) => eintrag !== gruppe) : [...bisher, gruppe],
    );
  }

  function schalteMarkierung(id: string, mitStrg: boolean): void {
    setzeMarkiert((bisher) => {
      if (!mitStrg) return bisher.length === 1 && bisher[0] === id ? [] : [id];
      return bisher.includes(id) ? bisher.filter((eintrag) => eintrag !== id) : [...bisher, id];
    });
  }

  async function schreibeZelle(zeile: Tabellenzeile, spalte: Spalte, eingabe: string): Promise<void> {
    setzeBearbeitet(undefined);
    const neu = eingabeAlsWert(spalte, eingabe);
    const zelle = zeile.zellen[spalte.schluessel];
    if (zelle === undefined) return;
    // Nichts geändert, nichts geschrieben: Ein Ereignis, das denselben Wert
    // noch einmal setzt, steht für immer im Protokoll und erzeugt bei einem
    // zweiten Arbeitsplatz einen Konfliktkandidaten ohne fachlichen Anlass.
    if (JSON.stringify(neu) === JSON.stringify(zelle.wert)) return;
    const entwurf = inlineEntwurf(spalte, zeile.einheitId, zelle.wert, neu);
    if (entwurf === undefined) return;
    await laden.bediene(entwurf);
  }

  return (
    <section aria-label="Einheiten" className="einheiten">
      <div className="einheitenkopf">
        <h2>
          Einheiten ({String(laden.tabelle?.gesamtzahl ?? 0)}) <Hilfemarke kennung="einheiten" />
        </h2>
        <button
          type="button"
          className="haupt"
          onClick={() => {
            setzeMaske("anlegen");
          }}
          title={`Einheit aus Vorlage anlegen (${kuerzelText(kuerzel("anlegen") as never)})`}
        >
          Aus Vorlage
        </button>
        {/* Die drei Schritte, die auf einer Auswahl arbeiten, stehen
            zusammen und durch einen Strich von Anlegen getrennt: Sie sind
            gesperrt, solange nichts markiert ist, und das soll man sehen,
            ohne die Knöpfe zu lesen. */}
        <span className="trenner" aria-hidden="true" />
        <button type="button" disabled={markiert.length === 0} onClick={() => { setzeMaske("verschieben"); }}>
          Verschieben ({markiert.length})
        </button>
        <button type="button" disabled={markiert.length !== 1} onClick={() => { setzeMaske("aufteilen"); }}>
          Aufteilen
        </button>
        <button type="button" disabled={markiert.length < 2} onClick={() => { setzeMaske("zusammenfuehren"); }}>
          Zusammenführen
        </button>
        <button type="button" disabled={markiert.length !== 1} onClick={() => { setzeMaske("entfernen"); }}>
          Entfernen
        </button>
        <label className="suchfeld">
          Suche
          <input
            id="einheitensuche"
            value={suche}
            placeholder="Einheit, Organisation, Ort, Kennzeichen …"
            onChange={(e) => {
              setzeSuche(e.target.value);
            }}
            title={`In die Suche springen (${kuerzelText(kuerzel("suchen") as never)})`}
          />
        </label>
      </div>

      <div className="spaltengruppen" role="group" aria-label="Spaltengruppen">
        {projektion.SPALTENGRUPPEN.map((gruppe) => (
          <button
            key={gruppe}
            type="button"
            aria-pressed={gruppen.includes(gruppe)}
            // Die Grunddaten lassen sich nicht wegschalten: Eine Tabelle
            // ohne Bezeichnung und Status ist keine Lage.
            disabled={gruppe === "GRUNDDATEN"}
            onClick={() => {
              schalteGruppe(gruppe);
            }}
          >
            {GRUPPENTITEL[gruppe] ?? gruppe}
          </button>
        ))}
      </div>

      <div className="tabellenrahmen">
        <table>
          <thead>
            <tr>
              <th scope="col">Abschnitt</th>
              {spalten.map((spalte) => (
                <th
                  key={spalte.schluessel}
                  scope="col"
                  className={istZahl(spalte) ? "zahl" : undefined}
                  title={`Excel-Spalte ${spalte.excel}`}
                >
                  {spalte.kopf}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => (
              <tr
                key={zeile.einheitId}
                className={[
                  markiert.includes(zeile.einheitId) ? "markiert" : "",
                  zeile.einheitId === einheitId ? "gewaehlt" : "",
                  zeile.entfernt ? "entfernt" : "",
                ]
                  .filter((klasse) => klasse !== "")
                  .join(" ")}
                onClick={(ereignis) => {
                  schalteMarkierung(zeile.einheitId, ereignis.ctrlKey || ereignis.metaKey);
                  aufEinheit(zeile.einheitId);
                }}
              >
                <th scope="row">{zeile.abschnittId}</th>
                {spalten.map((spalte) => (
                  <Zelle
                    key={spalte.schluessel}
                    zeile={zeile}
                    spalte={spalte}
                    bearbeitet={
                      bearbeitet?.zeile === zeile.einheitId && bearbeitet.spalte === spalte.schluessel
                    }
                    aufBearbeiten={() => {
                      setzeBearbeitet({ zeile: zeile.einheitId, spalte: spalte.schluessel });
                    }}
                    aufFertig={(eingabe) => void schreibeZelle(zeile, spalte, eingabe)}
                    aufAbbrechen={() => {
                      setzeBearbeitet(undefined);
                    }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
          {/* Die Summe steht unter der Tabelle und zählt genau das, was
              darüber steht — den Ausschnitt, nicht den Einsatz. Entfernte
              Einheiten bleiben sichtbar, zählen aber nicht mit (§5.4.5); die
              Gesamtstärke des Einsatzes steht im Kopfband. */}
          <tfoot>
            <tr className="summenzeile">
              <th scope="row">{zeilen.length === (laden.tabelle?.gesamtzahl ?? 0) ? "Summe" : "Summe (Ausschnitt)"}</th>
              {spalten.map((spalte) => (
                <td key={spalte.schluessel} className={istZahl(spalte) ? "zahl" : undefined}>
                  {spalte.schluessel === "staerke"
                    ? `${String(summe.fuehrer)}/${String(summe.unterfuehrer)}/${String(summe.mannschaft)}`
                    : spalte.schluessel === "gesamt"
                      ? String(summe.fuehrer + summe.unterfuehrer + summe.mannschaft)
                      : ""}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="tabellenfuss">
        <span>
          {zeilen.length === laden.tabelle?.gesamtzahl
            ? `${String(zeilen.length)} Einheiten`
            : `${String(zeilen.length)} von ${String(laden.tabelle?.gesamtzahl ?? 0)} Einheiten`}
        </span>
        <span className="hinweistext">
          Doppelklick bearbeitet die Zelle · Enter schreibt · Esc verwirft ·{" "}
          {kuerzelText(kuerzel("jetzt") as never)} setzt „jetzt"
        </span>
      </p>

      {einheitId !== undefined && <Untertabellen einheitId={einheitId} />}

      <Einheitenmasken
        maske={maske}
        gewaehlte={gewaehlte}
        abschnittId={abschnittId}
        aufSchliessen={() => {
          setzeMaske(undefined);
        }}
      />
    </section>
  );
}

interface ZelleEigenschaften {
  readonly zeile: Tabellenzeile;
  readonly spalte: Spalte;
  readonly bearbeitet: boolean;
  readonly aufBearbeiten: () => void;
  readonly aufFertig: (eingabe: string) => void;
  readonly aufAbbrechen: () => void;
}

/**
 * Eine Zelle — anzeigend oder bearbeitend.
 *
 * Enter schreibt, Escape verwirft, der Verlust des Fokus schreibt ebenfalls
 * (M3.6). Das letzte ist die Regel der Excel: Wer in die nächste Zelle klickt,
 * hat die vorige bestätigt. Eine Bearbeitung, die beim Wegklicken verfällt,
 * kostet die Eingabe, und der Bediener merkt es erst später.
 */
function Zelle({
  zeile,
  spalte,
  bearbeitet,
  aufBearbeiten,
  aufFertig,
  aufAbbrechen,
}: ZelleEigenschaften): React.JSX.Element {
  const zelle = zeile.zellen[spalte.schluessel];
  const [eingabe, setzeEingabe] = useState("");

  useEffect(() => {
    if (bearbeitet) setzeEingabe(zelle?.text ?? "");
  }, [bearbeitet, zelle?.text]);

  if (zelle === undefined) return <td />;

  const titel = zelle.umstritten
    ? "An diesem Feld hängt ein Konflikthinweis: Ein anderer Arbeitsplatz hat es zuletzt anders gesehen (§3.8)."
    : (zelle.wanduhr ?? "");

  if (!bearbeitet || spalte.schreibt === undefined) {
    return (
      <td
        className={[
          zelle.umstritten ? "umstritten" : "",
          spalte.schreibt === undefined ? "berechnet" : "",
          istZahl(spalte) ? "zahl" : "",
        ]
          .filter((klasse) => klasse !== "")
          .join(" ")}
        title={titel}
        onDoubleClick={spalte.schreibt === undefined ? undefined : aufBearbeiten}
      >
        {spalte.schluessel === "status" && zelle.text !== "" ? (
          <span className={`marke-zustand ${STATUSTON[zelle.text] ?? "neutral"}`}>{zelle.text}</span>
        ) : (
          zelle.text
        )}
        {zelle.umstritten && <span aria-label="Konflikthinweis"> ⚠</span>}
      </td>
    );
  }

  const gemeinsam = {
    autoFocus: true,
    value: eingabe,
    onBlur: () => {
      aufFertig(eingabe);
    },
    onKeyDown: (ereignis: React.KeyboardEvent) => {
      if (ereignis.key === "Enter") {
        ereignis.preventDefault();
        aufFertig(eingabe);
      }
      if (ereignis.key === "Escape") {
        ereignis.preventDefault();
        ereignis.stopPropagation();
        aufAbbrechen();
      }
      // Strg+D schreibt „jetzt“ in ein Zeitfeld — das Kürzel der Excel für
      // genau diesen Handgriff (m_makroFunktionen, `=Now`).
      if (spalte.art === "zeitpunkt" && (ereignis.ctrlKey || ereignis.metaKey) && ereignis.key.toLowerCase() === "d") {
        ereignis.preventDefault();
        setzeEingabe(new Date().toISOString());
      }
    },
  };

  return (
    <td className="bearbeitet">
      {spalte.art === "auswahl" ? (
        <select
          {...gemeinsam}
          aria-label={spalte.kopf}
          onChange={(e) => {
            setzeEingabe(e.target.value);
          }}
        >
          <option value="">—</option>
          {(spalte.werte ?? []).map((wert) => (
            <option key={wert} value={wert}>
              {wert}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...gemeinsam}
          aria-label={spalte.kopf}
          onChange={(e) => {
            setzeEingabe(e.target.value);
          }}
        />
      )}
    </td>
  );
}
