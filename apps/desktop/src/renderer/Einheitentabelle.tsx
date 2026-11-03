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

import { useCallback, useEffect, useMemo, useState } from "react";

import { projektion, type Spalte, type Spaltengruppe, type Tabellenzeile } from "@s1/domaene";

import { Einheitenmasken } from "./Einheitenmasken.js";
import { Untertabellen } from "./Untertabellen.js";
import type { Tabellenansicht } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { kuerzel, kuerzelText, useKuerzel } from "./tastatur.js";
import { Einheitenkopf } from "./Einheitenkopf.js";
import { Einheitenzeile, type Zeilenumgebung } from "./Einheitenzeile.js";
import { Auswahlleiste, Einheitenkontextmenue } from "./Einheitenauswahl.js";
import type { Kontextort } from "./Klappmenue.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { useFremdsperren } from "./useBearbeitungssperre.js";
import { useZellbearbeitung, type Zellbearbeitung } from "./useZellbearbeitung.js";
import { StatusLeiste } from "./Statusleiste.js";
import { istZahl } from "./Einheitenzelle.js";
import { GRUPPENTITEL, spaltenFuerAnzeige } from "./Einheitenspalten.js";
import { Tabellensumme } from "./Tabellensumme.js";
import { GLIEDERUNG_AUS, GegliederteZeilen, Gliederungsschalter, type Gliederungswahl } from "./Tabellengliederung.js";

/** Welche Maske offen ist — höchstens eine. */
export type Einheitenmaske =
  | "anlegen"
  | "verschieben"
  | "aufteilen"
  | "zusammenfuehren"
  | "entfernen"
  | "abloesung"
  | "kopieren"
  | "funk"
  | undefined;

export interface EinheitentabelleEigenschaften {
  /** Der gewählte Abschnitt filtert die Tabelle; `undefined` heißt „alle“. */
  readonly abschnittId: string | undefined;
  /** Die gewählte Einheit filtert das Tagebuch. */
  readonly einheitId: string | undefined;
  readonly aufEinheit: (einheitId: string | undefined) => void;
  /** „Im Tagebuch zeigen": wählt die Einheit und schlägt das Blatt Tagebuch auf. */
  readonly aufTagebuch?: ((einheitId: string) => void) | undefined;
}

interface Filterwahl {
  readonly abschnittId: string | undefined;
  readonly suche: string;
  readonly statuswahl: readonly string[];
  readonly gliederung: Gliederungswahl;
}

/** Bestellt den Ausschnitt beim Worker, sobald sich ein Filter ändert. */
function useTabellenfilter({ abschnittId, suche, statuswahl, gliederung }: Filterwahl): void {
  const setzeTabellenfilter = useLaden((zustand) => zustand.setzeTabellenfilter);
  const akteId = useLaden((zustand) => zustand.akteId);
  useEffect(() => {
    if (akteId === undefined) return;
    void setzeTabellenfilter({
      ...(abschnittId === undefined ? {} : { abschnittId }),
      ...(suche === "" ? {} : { suche }),
      ...(statuswahl.length === 0 ? {} : { status: statuswahl }),
      ...(gliederung.an ? { gliederung: true, ohneLeereBereiche: gliederung.ohneLeere } : {}),
    });
  }, [akteId, abschnittId, suche, statuswahl, gliederung, setzeTabellenfilter]);
}

interface Kuerzelstand {
  readonly markiert: number;
  readonly maske: Einheitenmaske;
  readonly nurLesen: boolean;
  readonly zellen: Zellbearbeitung;
  readonly setzeMaske: (maske: Einheitenmaske) => void;
  readonly hebeAuswahlAuf: () => void;
}

/** Die Kürzel der Excel an der Tabelle (M3.6): Strg+N, Strg+M, Strg+E, Strg+K, Strg+F, Esc. */
function useTabellenkuerzel({ markiert, maske, nurLesen, zellen, setzeMaske, hebeAuswahlAuf }: Kuerzelstand): void {
  const offen = zellen.offen !== undefined;
  const schliesseZelle = zellen.schliesse;
  useKuerzel(
    useMemo(
      () => ({
        anlegen: () => {
          if (!nurLesen) setzeMaske("anlegen");
        },
        verschieben: () => {
          if (!nurLesen && markiert > 0) setzeMaske("verschieben");
        },
        entfernen: () => {
          if (!nurLesen && markiert === 1) setzeMaske("entfernen");
        },
        kopieren: () => {
          if (!nurLesen && markiert === 1) setzeMaske("kopieren");
        },
        suchen: () => {
          document.getElementById("einheitensuche")?.focus();
        },
        abbrechen: () => {
          if (maske !== undefined) setzeMaske(undefined);
          else if (offen) schliesseZelle();
          else hebeAuswahlAuf();
        },
      }),
      [markiert, maske, offen, nurLesen, setzeMaske, schliesseZelle, hebeAuswahlAuf],
    ),
  );
}

/** Schaltet einen Wert in einer Liste an oder ab. */
function umgeschaltet<T>(liste: readonly T[], wert: T): readonly T[] {
  return liste.includes(wert) ? liste.filter((eintrag) => eintrag !== wert) : [...liste, wert];
}

export function Einheitentabelle({ abschnittId, einheitId, aufEinheit, aufTagebuch }: EinheitentabelleEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [gruppen, setzeGruppen] = useState<readonly Spaltengruppe[]>(projektion.SICHTBARE_GRUPPEN_VORBELEGUNG);
  const [suche, setzeSuche] = useState("");
  /** Der Statusfilter — leer heißt alle; die Leiste zählt auch die Abgewählten. */
  const [statuswahl, setzeStatuswahl] = useState<readonly string[]>([]);
  /** Gliederung nach Bereichen mit Zwischensummen — kombinierbar mit Status und Suche. */
  const [gliederung, setzeGliederung] = useState<Gliederungswahl>(GLIEDERUNG_AUS);
  const [maske, setzeMaske] = useState<Einheitenmaske>(undefined);
  /** Mehrfachauswahl für „verschieben (auch mehrere)“ und das Zusammenführen. */
  const [markiert, setzeMarkiert] = useState<readonly string[]>([]);
  /** Wo das Kontextmenü der Auswahl aufging; es gilt nur, solange etwas markiert ist. */
  const [kontext, setzeKontext] = useState<Kontextort | undefined>(undefined);
  const fremd = useFremdsperren();
  const zellen = useZellbearbeitung(fremd);
  /** Beendet oder archiviert: Die Tabelle zeigt, schreibt aber nichts. */
  const nurLesen = (laden.lagebild?.einsatzStatus ?? "AKTIV") !== "AKTIV";

  useTabellenfilter({ abschnittId, suche, statuswahl, gliederung });
  const hebeAuswahlAuf = useCallback(() => {
    setzeMarkiert([]);
  }, []);
  useTabellenkuerzel({ markiert: markiert.length, maske, nurLesen, zellen, setzeMaske, hebeAuswahlAuf });

  const spalten = useMemo(() => spaltenFuerAnzeige(projektion.spaltenDerGruppen(gruppen)), [gruppen]);
  const zeilen = laden.tabelle?.zeilen ?? [];
  const gewaehlte = zeilen.filter((zeile) => markiert.includes(zeile.einheitId));

  const umgebung: Zeilenumgebung = {
    nurLesen,
    zellen,
    fremd,
    auswahlwerte: laden.tabelle?.auswahlwerte,
    aufKlick: (id, mitStrg) => {
      setzeMarkiert((bisher) => {
        if (!mitStrg) return bisher.length === 1 && bisher[0] === id ? [] : [id];
        return umgeschaltet(bisher, id);
      });
      aufEinheit(id);
    },
    aufKontext: (id, ereignis) => {
      // Das Menü des Browsers trüge hier nichts bei (Entwurf, offene Fragen).
      ereignis.preventDefault();
      // Ohne Strg ist die Zeile danach allein markiert, mit Strg kommt sie dazu.
      const mitStrg = ereignis.ctrlKey || ereignis.metaKey;
      setzeMarkiert((bisher) => (!mitStrg ? [id] : bisher.includes(id) ? bisher : [...bisher, id]));
      aufEinheit(id);
      setzeKontext({ x: ereignis.clientX, y: ereignis.clientY });
    },
  };
  const auswahl = { gewaehlte, anzahl: markiert.length, nurLesen, aufMaske: setzeMaske };
  const erste = gewaehlte[0];
  const zeileFuer = (zeile: Tabellenzeile, tiefe?: number): React.JSX.Element => (
    <Einheitenzeile
      key={zeile.einheitId}
      zeile={zeile}
      spalten={spalten}
      tiefe={tiefe}
      zustand={{ markiert: markiert.includes(zeile.einheitId), gewaehlt: zeile.einheitId === einheitId }}
      umgebung={umgebung}
    />
  );

  return (
    <section aria-label="Einheiten" className="einheiten">
      <Einheitenkopf
        gesamtzahl={laden.tabelle?.gesamtzahl ?? 0}
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

      <Spaltenwahl gruppen={gruppen} aufSchalten={(gruppe) => { setzeGruppen((bisher) => umgeschaltet(bisher, gruppe)); }} />

      {/* Die Leiste ist die „Stärke nach Status“ des Blatts Status, auf den
          Ausschnitt bezogen, und zugleich der Filter: Wer „Angefordert“
          anklickt, sieht, was noch nicht da ist. Gezählt wird vor dem Filter,
          damit ein abgewählter Wert seine Zahl behält. */}
      <div className="tabellenleiste">
        <StatusLeiste
          jeStatus={laden.tabelle?.jeStatus ?? {}}
          wahl={statuswahl}
          aufSchalten={(status) => { setzeStatuswahl((bisher) => umgeschaltet(bisher, status)); }}
          aufAlle={() => { setzeStatuswahl([]); }}
        />
        <Gliederungsschalter wahl={gliederung} aufWahl={setzeGliederung} />
      </div>

      <Tabelle tabelle={laden.tabelle} spalten={spalten} gefiltert={statuswahl.length > 0 || suche !== ""} zeileFuer={zeileFuer} />
      <Auswahlleiste {...auswahl} />
      {kontext !== undefined && markiert.length > 0 && (
        <Einheitenkontextmenue
          {...auswahl}
          ort={kontext}
          aufSchliessen={() => {
            setzeKontext(undefined);
          }}
          aufTagebuch={aufTagebuch === undefined || erste === undefined ? undefined : () => { aufTagebuch(erste.einheitId); }}
        />
      )}
      <Tabellenfuss gezeigt={zeilen.length} gesamtzahl={laden.tabelle?.gesamtzahl} />

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
          // zeigte sie sonst eine Einheit, die nicht mehr da ist.
          setzeMarkiert([]);
        }}
      />
    </section>
  );
}

/**
 * Mehrfachwahl und kein Reiter: Mehrere Spaltengruppen stehen zugleich offen.
 * Deshalb Kontrollkästchen unter der Beschriftung „Spalten:“ — Reiter würden
 * „eins von fünf“ versprechen.
 */
function Spaltenwahl({ gruppen, aufSchalten }: { readonly gruppen: readonly Spaltengruppe[]; readonly aufSchalten: (gruppe: Spaltengruppe) => void }): React.JSX.Element {
  return (
    <div
      className="spaltenwahl"
      role="group"
      aria-label="Spalten anzeigen"
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.3rem 0.9rem", margin: "9px 0" }}
    >
      <strong>Spalten:</strong>
      {projektion.SPALTENGRUPPEN.map((gruppe) => (
        <label key={gruppe} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <input
            type="checkbox"
            checked={gruppen.includes(gruppe)}
            // Die Grunddaten lassen sich nicht wegschalten: Eine Tabelle
            // ohne Bezeichnung und Status ist keine Lage.
            disabled={gruppe === "GRUNDDATEN"}
            onChange={() => {
              aufSchalten(gruppe);
            }}
          />
          {GRUPPENTITEL[gruppe] ?? gruppe}
        </label>
      ))}
    </div>
  );
}

interface TabelleEigenschaften {
  readonly tabelle: Tabellenansicht | undefined;
  readonly spalten: readonly Spalte[];
  /** Status oder Suche schränken ein: Die Kopfzeile der Gliederung heißt dann „Auswahl“. */
  readonly gefiltert: boolean;
  readonly zeileFuer: (zeile: Tabellenzeile, tiefe?: number) => React.JSX.Element;
}

/** Kopf, Zeilen (flach oder gegliedert) und Summen. */
function Tabelle({ tabelle, spalten, gefiltert, zeileFuer }: TabelleEigenschaften): React.JSX.Element {
  const zeilen = tabelle?.zeilen ?? [];
  return (
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
        {tabelle?.gliederung === undefined ? (
          <tbody>{zeilen.map((zeile) => zeileFuer(zeile))}</tbody>
        ) : (
          <GegliederteZeilen
            gliederung={tabelle.gliederung}
            zeilen={zeilen}
            fenster={{ von: tabelle.von, gesamtzahl: tabelle.gesamtzahl, gefiltert }}
            spalten={spalten}
            zeileFuer={zeileFuer}
          />
        )}
        {/* Die Summe steht unter der Tabelle und zählt genau das, was
            darüber steht — den Ausschnitt, nicht den Einsatz. Entfernte
            Einheiten bleiben sichtbar, zählen aber nicht mit (§5.4.5); die
            Ist-Stärke des Einsatzes steht im Kopfband. */}
        <Tabellensumme zeilen={zeilen} spalten={spalten} ausschnitt={zeilen.length !== (tabelle?.gesamtzahl ?? 0)} />
      </table>
    </div>
  );
}

/** Unter der Tabelle: wie viele von wie vielen, und wie man eine Zelle bearbeitet. */
function Tabellenfuss({ gezeigt, gesamtzahl }: { readonly gezeigt: number; readonly gesamtzahl: number | undefined }): React.JSX.Element {
  return (
    <p className="tabellenfuss">
      <span>
        {gezeigt === gesamtzahl
          ? `${String(gezeigt)} Einheiten`
          : `${String(gezeigt)} von ${String(gesamtzahl ?? 0)} Einheiten`}
      </span>
      <span className="hinweistext">
        Doppelklick bearbeitet die Zelle · Textzelle: Enter oder Wegklicken schreibt, Esc verwirft · Auswahl (Status u. a.): Tipp öffnet sie, Enter oder „Übernehmen“ schreibt, Esc oder Wegklicken verwirft ·{" "}
        {kuerzelText(kuerzel("jetzt") as never)} setzt „jetzt"
      </span>
    </p>
  );
}
