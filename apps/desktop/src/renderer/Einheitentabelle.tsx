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

import { projektion, type Spalte, type Tabellenzeile } from "@s1/domaene";

import { Einheitenmasken } from "./Einheitenmasken.js";
import { Untertabellen } from "./Untertabellen.js";
import type { Tabellenansicht } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { kuerzel, kuerzelText, useKuerzel } from "./tastatur.js";
import { Einheitenkopf } from "./Einheitenkopf.js";
import { Einheitenzeile, type Zeilenumgebung } from "./Einheitenzeile.js";
import { Auswahlbereich } from "./Einheitenauswahl.js";
import { useEinheitenmarkierung } from "./useEinheitenmarkierung.js";
import { useFremdsperren } from "./useBearbeitungssperre.js";
import { useZellbearbeitung, type Zellbearbeitung } from "./useZellbearbeitung.js";
import { StatusLeiste } from "./Statusleiste.js";
import { istZahl } from "./Einheitenzelle.js";
import { spaltenFuerAnzeige } from "./Einheitenspalten.js";
import { Tabellensumme } from "./Tabellensumme.js";
import { GegliederteZeilen, type Gliederungswahl } from "./Tabellengliederung.js";
import { spaltenzustand, umgeschaltet, useSpaltenwahl } from "./useSpaltenwahl.js";

/** Welche Maske offen ist — höchstens eine. */
export type Einheitenmaske =
  | "anlegen"
  | "anlegenFrei"
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
  /** „Erfassungsbogen einlesen …" im Hauptknopf: Der Scanner hängt an der Lage. */
  readonly aufScanner?: (() => void) | undefined;
}

interface Filterwahl {
  readonly abschnittId: string | undefined;
  readonly suche: string;
  readonly statuswahl: readonly string[];
  readonly gliederung: Gliederungswahl;
  readonly stillgelegte: boolean;
}

/** Bestellt den Ausschnitt beim Worker, sobald sich ein Filter ändert. */
function useTabellenfilter({ abschnittId, suche, statuswahl, gliederung, stillgelegte }: Filterwahl): void {
  const setzeTabellenfilter = useLaden((zustand) => zustand.setzeTabellenfilter);
  const akteId = useLaden((zustand) => zustand.akteId);
  useEffect(() => {
    if (akteId === undefined) return;
    void setzeTabellenfilter({
      ...(abschnittId === undefined ? {} : { abschnittId }),
      ...(suche === "" ? {} : { suche }),
      ...(statuswahl.length === 0 ? {} : { status: statuswahl }),
      ...(gliederung.an ? { gliederung: true, ohneLeereBereiche: gliederung.ohneLeere } : {}),
      ...(stillgelegte ? { mitStillgelegten: true } : {}),
    });
  }, [akteId, abschnittId, suche, statuswahl, gliederung, stillgelegte, setzeTabellenfilter]);
}

/** Der Name des gewählten Abschnitts aus dem Baum, den dieses Fenster sieht. */
function useAbschnittsname(abschnittId: string | undefined): string | undefined {
  const baum = useLaden((zustand) => zustand.baum?.baum);
  return useMemo(
    () => (abschnittId === undefined ? undefined : projektion.baumZeilen(baum ?? []).find((zeile) => zeile.id === abschnittId)?.name),
    [abschnittId, baum],
  );
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

export function Einheitentabelle({ abschnittId, einheitId, aufEinheit, aufTagebuch, aufScanner }: EinheitentabelleEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const wahl = useSpaltenwahl(abschnittId !== undefined);
  const [suche, setzeSuche] = useState("");
  /** Der Statusfilter — leer heißt alle; die Leiste zählt auch die Abgewählten. */
  const [statuswahl, setzeStatuswahl] = useState<readonly string[]>([]);
  const [maske, setzeMaske] = useState<Einheitenmaske>(undefined);
  /** Mehrfachauswahl für „verschieben (auch mehrere)“ und das Zusammenführen. */
  const markierung = useEinheitenmarkierung(aufEinheit);
  const { markiert } = markierung;
  const fremd = useFremdsperren();
  const zellen = useZellbearbeitung(fremd);
  /** Beendet oder archiviert: Die Tabelle zeigt, schreibt aber nichts. */
  const nurLesen = (laden.lagebild?.einsatzStatus ?? "AKTIV") !== "AKTIV";

  useTabellenfilter({ abschnittId, suche, statuswahl, gliederung: wahl.gliederung, stillgelegte: wahl.stillgelegte });
  useTabellenkuerzel({ markiert: markiert.length, maske, nurLesen, zellen, setzeMaske, hebeAuswahlAuf: markierung.hebeAuf });

  const gruppen = wahl.gruppen;
  const spalten = useMemo(() => spaltenFuerAnzeige(projektion.spaltenDerGruppen(gruppen)), [gruppen]);
  const zeilen = laden.tabelle?.zeilen ?? [];
  const abschnittName = useAbschnittsname(abschnittId);
  const gewaehlte = zeilen.filter((zeile) => markiert.includes(zeile.einheitId));

  const umgebung: Zeilenumgebung = {
    nurLesen,
    zellen,
    fremd,
    auswahlwerte: laden.tabelle?.auswahlwerte,
    aufKlick: markierung.klick,
    aufKontext: markierung.rechtsklick,
  };
  const zeileFuer = zeilenbauer(spalten, umgebung, markiert, einheitId);

  return (
    <section aria-label="Einheiten" className="einheiten">
      <Einheitenkopf
        zahl={einheitenzahl(laden.tabelle?.gesamtzahl ?? 0, abschnittName)}
        nurLesen={nurLesen}
        suche={{ wert: suche, aufSuche: setzeSuche }}
        aufMaske={setzeMaske}
        aufScanner={aufScanner}
        spalten={wahl}
      />
      {/* Die Filterzeile ist die „Stärke nach Status“, auf den Ausschnitt
          bezogen, und zugleich der Filter. Gezählt wird vor dem Filter. */}
      <StatusLeiste
        jeStatus={laden.tabelle?.jeStatus ?? {}}
        wahl={statuswahl}
        aufSchalten={(status) => { setzeStatuswahl((bisher) => umgeschaltet(bisher, status)); }}
        aufAlle={() => { setzeStatuswahl([]); }}
        zustand={spaltenzustand(wahl)}
      />

      <Tabelle tabelle={laden.tabelle} spalten={spalten} gefiltert={statuswahl.length > 0 || suche !== ""} zeileFuer={zeileFuer} />
      <Auswahlbereich markierung={markierung} gewaehlte={gewaehlte} nurLesen={nurLesen} aufMaske={setzeMaske} aufTagebuch={aufTagebuch} />
      <Tabellenfuss gezeigt={zeilen.length} gesamtzahl={laden.tabelle?.gesamtzahl} />

      {einheitId !== undefined && <Untertabellen einheitId={einheitId} />}

      <Einheitenmasken
        maske={maske}
        gewaehlte={gewaehlte}
        abschnittId={abschnittId}
        aufSchliessen={() => {
          setzeMaske(undefined);
        }}
        // Die Auswahl gehörte zur Maske: Nach Verschieben oder Entfernen
        // zeigte sie sonst eine Einheit, die nicht mehr da ist.
        aufGeschrieben={markierung.hebeAuf}
      />
    </section>
  );
}

/** Baut die Zeile einer Einheit — flach oder, mit Gliederung, um `tiefe` eingerückt. */
function zeilenbauer(
  spalten: readonly Spalte[],
  umgebung: Zeilenumgebung,
  markiert: readonly string[],
  einheitId: string | undefined,
): (zeile: Tabellenzeile, tiefe?: number) => React.JSX.Element {
  return (zeile, tiefe) => (
    <Einheitenzeile
      key={zeile.einheitId}
      zeile={zeile}
      spalten={spalten}
      tiefe={tiefe}
      zustand={{ markiert: markiert.includes(zeile.einheitId), gewaehlt: zeile.einheitId === einheitId }}
      umgebung={umgebung}
    />
  );
}

/** „20" ohne gewählten Abschnitt, „6 in EA 1 Deich Nord" mit ihm. */
function einheitenzahl(gesamtzahl: number, abschnittName: string | undefined): string {
  return abschnittName === undefined ? String(gesamtzahl) : `${String(gesamtzahl)} in ${abschnittName}`;
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
