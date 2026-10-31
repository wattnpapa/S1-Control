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

import {
  projektion,
  type Spalte,
  type Spaltengruppe,
  type Tabellenzeile,
} from "@s1/domaene";

import { Einheitenmasken } from "./Einheitenmasken.js";
import { Untertabellen } from "./Untertabellen.js";
import { UNGUELTIGE_EINGABE, eingabeAlsWert, inlineEntwurf } from "../kontrakt/bedienschritte.js";
import { useLaden } from "./laden.js";
import { kuerzel, kuerzelText, useKuerzel } from "./tastatur.js";
import { Einheitenkopf } from "./Einheitenkopf.js";
import { hinweisAusErgebnis } from "./Anlegeversuch.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { useSchreibsperre } from "./useVerbindungsstatus.js";
import { StatusLeiste } from "./Statusleiste.js";
import { Zelle, istZahl } from "./Einheitenzelle.js";
import { spaltenFuerAnzeige } from "./Einheitenspalten.js";
import { Tabellensumme } from "./Tabellensumme.js";
import { GLIEDERUNG_AUS, GegliederteZeilen, Gliederungsschalter, einzug, type Gliederungswahl } from "./Tabellengliederung.js";

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

/** Welche Maske offen ist — höchstens eine. */
export type Einheitenmaske =
  | "anlegen"
  | "verschieben"
  | "aufteilen"
  | "zusammenfuehren"
  | "entfernen"
  | "abloesung"
  | "kopieren"
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
  /** Der Statusfilter — leer heißt alle; die Leiste zählt auch die Abgewählten. */
  const [statuswahl, setzeStatuswahl] = useState<readonly string[]>([]);
  /** Gliederung nach Bereichen mit Zwischensummen — kombinierbar mit Status und Suche. */
  const [gliederung, setzeGliederung] = useState<Gliederungswahl>(GLIEDERUNG_AUS);
  const [maske, setzeMaske] = useState<Einheitenmaske>(undefined);
  /** Mehrfachauswahl für „verschieben (auch mehrere)“ und das Zusammenführen. */
  const [markiert, setzeMarkiert] = useState<readonly string[]>([]);
  const [bearbeitet, setzeBearbeitet] = useState<{ zeile: string; spalte: string } | undefined>(undefined);
  /** Die Regel, gegen die die offene Zelle verstößt — die Zelle bleibt offen, bis sie stimmt oder verworfen wird. */
  const [zellenfehler, setzeZellenfehler] = useState<string | undefined>(undefined);

  /** Ohne Verbindung: Die Zelle bleibt mit ihrem Text offen, „Übernehmen“ ist gesperrt. */
  const verbindungssperre = useSchreibsperre();

  /** Beendet oder archiviert: Die Tabelle zeigt, schreibt aber nichts. */
  const nurLesen = (laden.lagebild?.einsatzStatus ?? "AKTIV") !== "AKTIV";

  const setzeTabellenfilter = laden.setzeTabellenfilter;
  const akteId = laden.akteId;
  useEffect(() => {
    if (akteId === undefined) return;
    void setzeTabellenfilter({
      ...(abschnittId === undefined ? {} : { abschnittId }),
      ...(suche === "" ? {} : { suche }),
      ...(statuswahl.length === 0 ? {} : { status: statuswahl }),
      ...(gliederung.an ? { gliederung: true, ohneLeereBereiche: gliederung.ohneLeere } : {}),
    });
  }, [akteId, abschnittId, suche, statuswahl, gliederung, setzeTabellenfilter]);

  const spalten = useMemo(() => spaltenFuerAnzeige(projektion.spaltenDerGruppen(gruppen)), [gruppen]);
  const zeilen = laden.tabelle?.zeilen ?? [];
  const gewaehlte = zeilen.filter((zeile) => markiert.includes(zeile.einheitId));
  useKuerzel(
    useMemo(
      () => ({
        anlegen: () => {
          if (!nurLesen) setzeMaske("anlegen");
        },
        verschieben: () => {
          if (!nurLesen && markiert.length > 0) setzeMaske("verschieben");
        },
        entfernen: () => {
          if (!nurLesen && markiert.length === 1) setzeMaske("entfernen");
        },
        kopieren: () => {
          if (!nurLesen && markiert.length === 1) setzeMaske("kopieren");
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
      [markiert, maske, bearbeitet, nurLesen],
    ),
  );

  function schalteGruppe(gruppe: Spaltengruppe): void {
    setzeGruppen((bisher) =>
      bisher.includes(gruppe) ? bisher.filter((eintrag) => eintrag !== gruppe) : [...bisher, gruppe],
    );
  }

  function schalteStatus(status: string): void {
    setzeStatuswahl((bisher) =>
      bisher.includes(status) ? bisher.filter((eintrag) => eintrag !== status) : [...bisher, status],
    );
  }

  function schalteMarkierung(id: string, mitStrg: boolean): void {
    setzeMarkiert((bisher) => {
      if (!mitStrg) return bisher.length === 1 && bisher[0] === id ? [] : [id];
      return bisher.includes(id) ? bisher.filter((eintrag) => eintrag !== id) : [...bisher, id];
    });
  }

  async function schreibeZelle(zeile: Tabellenzeile, spalte: Spalte, eingabe: string): Promise<void> {
    const neu = eingabeAlsWert(spalte, eingabe);
    if (neu === UNGUELTIGE_EINGABE) {
      // Nicht schließen, nichts schreiben: Die Regel steht an der Zelle,
      // und Escape verwirft wie immer.
      setzeZellenfehler(
        spalte.art === "staerke"
          ? "Stärke als Fü/UFü/He, z. B. 0/1/8"
          : "Zeit als TT.MM.JJJJ HH:MM, „29.10. 14:30“ oder „14:30“ (heute)",
      );
      return;
    }
    if (verbindungssperre !== undefined) {
      // Kein stummes Verwerfen: Der Text bleibt in der Zelle, der Grund steht dabei.
      setzeZellenfehler(verbindungssperre);
      return;
    }
    setzeZellenfehler(undefined);
    const zelle = zeile.zellen[spalte.schluessel];
    if (zelle === undefined) {
      setzeBearbeitet(undefined);
      return;
    }
    // Nichts geändert, nichts geschrieben: Ein Ereignis, das denselben Wert
    // noch einmal setzt, steht für immer im Protokoll und erzeugt bei einem
    // zweiten Arbeitsplatz einen Konfliktkandidaten ohne fachlichen Anlass.
    const entwurf = JSON.stringify(neu) === JSON.stringify(zelle.wert) ? undefined : inlineEntwurf(spalte, zeile.einheitId, zelle.wert, neu);
    if (entwurf === undefined) {
      setzeBearbeitet(undefined);
      return;
    }
    const ergebnis = await laden.bediene(entwurf);
    // Geschlossen wird nur nach bestätigtem Schreiben; sonst bleibt der Text
    // stehen, und die Zelle sagt, ob nicht gespeichert oder unklar ist.
    const hinweis = hinweisAusErgebnis(ergebnis);
    if (hinweis === undefined) setzeBearbeitet(undefined);
    else setzeZellenfehler(hinweis);
  }

  /** Die Zeile einer Einheit — flach oder, mit Gliederung, um `tiefe` eingerückt. */
  function einheitszeile(zeile: Tabellenzeile, tiefe?: number): React.JSX.Element {
    return (
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
        <th scope="row" title={zeile.abschnittId} style={tiefe === undefined ? undefined : einzug(tiefe)}>
          {zeile.abschnittName}
        </th>
        {spalten.map((spalte) => (
          <Zelle
            key={spalte.schluessel}
            zeile={zeile}
            spalte={spalte}
            gesperrt={nurLesen}
            {...(verbindungssperre === undefined ? {} : { sperre: verbindungssperre })}
            bearbeitet={
              bearbeitet?.zeile === zeile.einheitId && bearbeitet.spalte === spalte.schluessel
            }
            fehler={
              bearbeitet?.zeile === zeile.einheitId && bearbeitet.spalte === spalte.schluessel
                ? zellenfehler
                : undefined
            }
            aufBearbeiten={() => {
              setzeZellenfehler(undefined);
              setzeBearbeitet({ zeile: zeile.einheitId, spalte: spalte.schluessel });
            }}
            aufFertig={(eingabe) => schreibeZelle(zeile, spalte, eingabe)}
            aufAbbrechen={() => {
              setzeZellenfehler(undefined);
              setzeBearbeitet(undefined);
            }}
          />
        ))}
      </tr>
    );
  }

  return (
    <section aria-label="Einheiten" className="einheiten">
      <Einheitenkopf
        gesamtzahl={laden.tabelle?.gesamtzahl ?? 0}
        markiert={markiert.length}
        nurLesen={nurLesen}
        suche={suche}
        aufSuche={setzeSuche}
        aufMaske={setzeMaske}
      />
      {nurLesen && (
        <p className="sperrhinweis" role="status">
          {TEXT_NUR_LESEN}: Status ändern, Anlegen, Verschieben und Entfernen sind gesperrt.
        </p>
      )}

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

      {/* Die Leiste ist die „Stärke nach Status“ des Blatts Status, auf den
          Ausschnitt bezogen, und zugleich der Filter: Wer „Angefordert“
          anklickt, sieht, was noch nicht da ist. Gezählt wird vor dem Filter,
          damit ein abgewählter Wert seine Zahl behält. */}
      <div className="tabellenleiste">
        <StatusLeiste jeStatus={laden.tabelle?.jeStatus ?? {}} wahl={statuswahl} aufSchalten={schalteStatus} aufAlle={() => { setzeStatuswahl([]); }} />
        <Gliederungsschalter wahl={gliederung} aufWahl={setzeGliederung} />
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
                  className={[istZahl(spalte) ? "zahl" : "", spalte.schluessel === "bezeichnung" ? "namensspalte" : ""].join(" ").trim() || undefined}
                >
                  {spalte.kopf}
                </th>
              ))}
            </tr>
          </thead>
          {laden.tabelle?.gliederung === undefined ? (
            <tbody>{zeilen.map((zeile) => einheitszeile(zeile))}</tbody>
          ) : (
            <GegliederteZeilen
              gliederung={laden.tabelle.gliederung}
              zeilen={zeilen}
              fenster={{
                von: laden.tabelle.von,
                gesamtzahl: laden.tabelle.gesamtzahl,
                gefiltert: statuswahl.length > 0 || suche !== "",
              }}
              spalten={spalten}
              zeileFuer={einheitszeile}
            />
          )}
          {/* Die Summe steht unter der Tabelle und zählt genau das, was
              darüber steht — den Ausschnitt, nicht den Einsatz. Entfernte
              Einheiten bleiben sichtbar, zählen aber nicht mit (§5.4.5); die
              Ist-Stärke des Einsatzes steht im Kopfband. */}
          <Tabellensumme
            zeilen={zeilen}
            spalten={spalten}
            ausschnitt={zeilen.length !== (laden.tabelle?.gesamtzahl ?? 0)}
          />
        </table>
      </div>

      <p className="tabellenfuss">
        <span>
          {zeilen.length === laden.tabelle?.gesamtzahl
            ? `${String(zeilen.length)} Einheiten`
            : `${String(zeilen.length)} von ${String(laden.tabelle?.gesamtzahl ?? 0)} Einheiten`}
        </span>
        <span className="hinweistext">
          Doppelklick bearbeitet die Zelle · Textzelle: Enter oder Wegklicken schreibt, Esc verwirft · Auswahl (Status u. a.): Tipp öffnet sie, Enter oder „Übernehmen“ schreibt, Esc oder Wegklicken verwirft ·{" "}
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
        aufGeschrieben={() => {
          // Die Auswahl gehörte zur Maske: Nach Verschieben oder Entfernen
          // zeigte sie sonst „Verschieben (1)“ für eine Einheit, die nicht mehr da ist.
          setzeMarkiert([]);
        }}
      />
    </section>
  );
}
