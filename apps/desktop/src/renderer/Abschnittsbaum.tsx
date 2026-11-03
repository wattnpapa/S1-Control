/**
 * Der Abschnittsbaum (M3.1).
 *
 * Sechs Bedienschritte aus der DoD: anlegen, umbenennen, Typ ändern, umhängen
 * (mit Zyklusregel), sortieren, auflösen mit Zielabschnitt — dazu die freie
 * Wahl des taktischen Zeichens. Jeder von ihnen ist genau **ein** Ereignis aus
 * §5.3 (`Abschnittsmasken.tsx`), der Aktendienst schreibt ihn, und der Baum
 * kommt beim nächsten Zeigerwechsel neu.
 *
 * **Ein Knopf im Kopf** (Entwurf „Entlastung", 3.4, Optionen 6b, 6c): „Abschnitt
 * anlegen". Was einer Zeile gilt, steht in ihrem Menü „⋯" und im
 * Kontextmenü (`Abschnittsmenue.tsx`), erst wenn sie gewählt ist. Oben steht
 * „Alle Bereiche": Sie hebt die Auswahl auf und nennt Einheiten und
 * Ist-Stärke des Einsatzes, darüber einmal die Spaltenköpfe der Zahlen.
 *
 * **Die Komponente rechnet nicht.** Sortierung, Zyklusregel und
 * Auflösungskette stehen in `@s1/domaene/projektion`; was hier und in
 * `baumordnung.ts` steht, ist die Zuordnung Schritt → Ereignisentwurf.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { abschnittstypTitel, kennzahlen, projektion, type Baumknoten, type Staerke } from "@s1/domaene";

import { Abschnittskontextmenue, Zeilenmenue, type AbschnittsschritteEigenschaften } from "./Abschnittsmenue.js";
import { Abschnittsmasken, type Abschnittsentwurf, type Abschnittsmaske } from "./Abschnittsmasken.js";
import { nachbarInReihenfolge } from "./baumordnung.js";
import { abschnittszeichen, langform } from "./harke.js";
import type { Kontextort } from "./Klappmenue.js";
import { useLaden } from "./laden.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { kuerzelText, kuerzel, useKuerzel } from "./tastatur.js";
import { Zeichen } from "./zeichen.js";

export interface AbschnittsbaumEigenschaften {
  /** Der gewählte Abschnitt; er filtert zugleich die Einheitentabelle. */
  readonly gewaehlt: string | undefined;
  readonly aufWahl: (abschnittId: string | undefined) => void;
}

function staerkeText(staerke: Staerke): string {
  return `${String(staerke.fuehrer)}/${String(staerke.unterfuehrer)}/${String(staerke.mannschaft)}`;
}

/**
 * Schreiben aus Masken und Menü: Nach bestätigtem Schreiben schließt die
 * Maske und der Baum kommt neu.
 */
function useAbschnittsbedienung(schliesse: () => void): (entwurf: Abschnittsentwurf) => Promise<void> {
  const laden = useLaden();
  return async (entwurf) => {
    const ergebnis = await laden.bediene(entwurf);
    // §8.8 Punkt 1: Ein gescheiterter Bedienschritt wird sichtbar abgewiesen.
    // Die Maske bleibt dann offen — der Bediener soll seine Eingabe nicht
    // verlieren, nur weil der Schreibversuch nicht durchging.
    if (ergebnis?.art !== "geschrieben") return;
    schliesse();
    await laden.holeBaum();
  };
}

/**
 * Eine Stelle nach oben oder unten. Getauscht werden die
 * **Reihenfolgewerte** und nicht die Positionen: §5.3 sortiert nach
 * `reihenfolge`, und ein Tausch sind genau zwei `AbschnittUmsortiert` mit
 * `vorher` und `neu`. Ein Neudurchnummerieren aller Geschwister wären so
 * viele Ereignisse wie Geschwister — und jedes davon ein Konfliktkandidat
 * gegen einen zweiten Arbeitsplatz.
 */
async function verschiebeInReihenfolge(
  knoten: Baumknoten | undefined,
  zeilen: readonly Baumknoten[],
  richtung: -1 | 1,
  bediene: (entwurf: Abschnittsentwurf) => Promise<void>,
): Promise<void> {
  const nachbar = knoten === undefined ? undefined : nachbarInReihenfolge(knoten, zeilen, richtung);
  if (knoten === undefined || nachbar === undefined) return;
  const tausch = (a: Baumknoten, b: Baumknoten): Abschnittsentwurf => ({
    typ: "AbschnittUmsortiert",
    nutzlast: { abschnittId: a.id },
    vorher: a.reihenfolge,
    neu: b.reihenfolge,
  });
  await bediene(tausch(knoten, nachbar));
  await bediene(tausch(nachbar, knoten));
}

export function Abschnittsbaum({ gewaehlt, aufWahl }: AbschnittsbaumEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [maske, setzeMaske] = useState<Abschnittsmaske | undefined>(undefined);
  const [kontext, setzeKontext] = useState<Kontextort | undefined>(undefined);
  const nurLesen = (laden.lagebild?.einsatzStatus ?? "AKTIV") !== "AKTIV";

  // Der erste Baum wird beim Öffnen der Akte geholt; alles Weitere holt
  // `frischeAnsichten` über den Lagezeiger (M3.7). Der Effekt hängt deshalb an
  // der Akte und an nichts sonst — an `laden` gehängt liefe er bei jeder
  // Zustandsänderung des Fensters erneut und holte den Baum im Sekundentakt.
  const akteId = laden.akteId;
  const holeBaum = laden.holeBaum;
  useEffect(() => {
    if (akteId !== undefined) void holeBaum();
  }, [akteId, holeBaum]);

  const baum = laden.baum?.baum ?? [];
  const zeilen = useMemo(() => projektion.baumZeilen(baum), [baum]);
  const knoten = zeilen.find((zeile) => zeile.id === gewaehlt);

  const schliesse = useCallback(() => {
    setzeMaske(undefined);
  }, []);
  const bediene = useAbschnittsbedienung(schliesse);

  useKuerzel(
    useMemo(
      () => ({
        anlegen: () => {
          if (!nurLesen) setzeMaske("anlegen");
        },
        abbrechen: () => {
          if (maske !== undefined) schliesse();
          else aufWahl(undefined);
        },
      }),
      [maske, aufWahl, nurLesen, schliesse],
    ),
  );

  const schritte: Omit<AbschnittsschritteEigenschaften, "knoten"> = {
    zeilen,
    nurLesen,
    aufMaske: setzeMaske,
    aufVerschieben: (richtung) => void verschiebeInReihenfolge(knoten, zeilen, richtung, bediene),
  };

  return (
    <section aria-label="Abschnitte" className="baum">
      <Baumkopf
        nurLesen={nurLesen}
        aufAnlegen={() => {
          setzeMaske("anlegen");
        }}
      />

      <Baumliste zeilen={zeilen} gewaehlt={gewaehlt} aufWahl={aufWahl} aufKontext={setzeKontext} schritte={schritte} />

      {kontext !== undefined && knoten !== undefined && (
        <Abschnittskontextmenue
          ort={kontext}
          knoten={knoten}
          {...schritte}
          aufSchliessen={() => {
            setzeKontext(undefined);
          }}
        />
      )}

      <Abschnittsmasken
        key={`${maske ?? ""}-${knoten?.id ?? ""}`}
        maske={maske}
        knoten={knoten}
        gewaehlt={gewaehlt}
        zeilen={zeilen}
        aufSchliessen={schliesse}
        bediene={bediene}
      />
    </section>
  );
}

/** Der Kopf: Titel, der eine Hauptknopf und einmal die Spaltenköpfe der Zahlen (Audit P2-2). */
function Baumkopf({ nurLesen, aufAnlegen }: { readonly nurLesen: boolean; readonly aufAnlegen: () => void }): React.JSX.Element {
  return (
    <>
      <div className="baumkopf">
        <h2>Abschnitte</h2>
        <button
          type="button"
          className="haupt"
          disabled={nurLesen}
          onClick={aufAnlegen}
          title={nurLesen ? TEXT_NUR_LESEN : `Neuen Abschnitt anlegen (${kuerzelText(kuerzel("anlegen") as never)})`}
        >
          Abschnitt anlegen
        </button>
      </div>
      <p className="baumspalten">Einh. · Fü/UFü/He</p>
    </>
  );
}

interface BaumlisteEigenschaften {
  readonly zeilen: readonly Baumknoten[];
  readonly gewaehlt: string | undefined;
  readonly aufWahl: (abschnittId: string | undefined) => void;
  /** Rechtsklick: Die Zeile ist schon gewählt, das Menü geht an dieser Stelle auf. */
  readonly aufKontext: (ort: Kontextort) => void;
  readonly schritte: Omit<AbschnittsschritteEigenschaften, "knoten">;
}

/**
 * Die Liste mit „Alle Bereiche" oben und dem Schalter für Aufgelöste am Fuß.
 * Aufgelöste stehen in der Vorgabe nicht da: Sie sind Geschichte, und ihre
 * Einheiten stehen längst im Ziel. Der Schalter erscheint nur, wenn es welche
 * gibt.
 */
function Baumliste({ zeilen, gewaehlt, aufWahl, aufKontext, schritte }: BaumlisteEigenschaften): React.JSX.Element {
  const [aufgeloesteZeigen, setzeAufgeloesteZeigen] = useState(false);
  const namen = useMemo(() => new Map(zeilen.map((zeile) => [zeile.id, zeile.name])), [zeilen]);
  const aufgeloeste = zeilen.filter((zeile) => zeile.aufgeloestNach !== undefined).length;
  return (
    <>
      <ul className="baumliste">
        <AlleBereiche gewaehlt={gewaehlt === undefined} aufWahl={aufWahl} />
        {zeilen
          .filter((zeile) => aufgeloesteZeigen || zeile.aufgeloestNach === undefined)
          .map((zeile) => (
            <li
              key={zeile.id}
              className={zeile.id === gewaehlt ? "gewaehlt" : undefined}
              style={{ paddingLeft: `${String(zeile.tiefe * 1.2)}rem` }}
              onContextMenu={(ereignis) => {
                // Das Menü des Browsers trüge hier nichts bei (Entwurf, offene Fragen).
                ereignis.preventDefault();
                if (zeile.id !== gewaehlt) aufWahl(zeile.id);
                aufKontext({ x: ereignis.clientX, y: ereignis.clientY });
              }}
            >
              <Baumzeile zeile={zeile} gewaehlt={zeile.id === gewaehlt} namen={namen} aufWahl={aufWahl} />
              {zeile.id === gewaehlt && <Zeilenmenue knoten={zeile} {...schritte} />}
            </li>
          ))}
      </ul>
      {aufgeloeste > 0 && (
        <div className="baumfuss">
          <label className="schalter">
            <input
              type="checkbox"
              checked={aufgeloesteZeigen}
              onChange={(e) => {
                setzeAufgeloesteZeigen(e.target.checked);
              }}
            />
            Aufgelöste zeigen ({aufgeloeste})
          </label>
        </div>
      )}
    </>
  );
}

/** „Alle Bereiche": hebt die Auswahl auf und nennt Einheiten und Ist-Stärke des Einsatzes. */
function AlleBereiche({ gewaehlt, aufWahl }: { readonly gewaehlt: boolean; readonly aufWahl: (id: undefined) => void }): React.JSX.Element {
  const lagebild = useLaden((zustand) => zustand.lagebild);
  return (
    <li className={gewaehlt ? "alle gewaehlt" : "alle"}>
      <button
        type="button"
        className={gewaehlt ? "baumzeile gewaehlt" : "baumzeile"}
        aria-pressed={gewaehlt}
        title="Alle Einheiten des Einsatzes; hebt die Wahl eines Abschnitts auf"
        onClick={() => {
          aufWahl(undefined);
        }}
      >
        <span className="name">Alle Bereiche</span>
        {lagebild !== undefined && (
          <span className="zahlen" title={`${String(lagebild.einheiten)} Einheiten, Ist-Stärke ${staerkeText(lagebild.gesamtstaerke)}`}>
            {String(lagebild.einheiten)} · {staerkeText(lagebild.gesamtstaerke)}
          </span>
        )}
      </button>
    </li>
  );
}

interface BaumzeileEigenschaften {
  readonly zeile: Baumknoten;
  readonly gewaehlt: boolean;
  readonly namen: ReadonlyMap<string, string>;
  readonly aufWahl: (abschnittId: string | undefined) => void;
}

function Baumzeile({ zeile, gewaehlt, namen, aufWahl }: BaumzeileEigenschaften): React.JSX.Element {
  const staerke = staerkeText(zeile.summenStaerke);
  return (
    <button
      type="button"
      className={gewaehlt ? "baumzeile gewaehlt" : "baumzeile"}
      aria-pressed={gewaehlt}
      onClick={() => {
        aufWahl(gewaehlt ? undefined : zeile.id);
      }}
    >
      {/* Das taktische Zeichen des Abschnitts — dasselbe, das in der
          Führungsharke steht und auf der Lagekarte klebt. */}
      <ZeichenDesAbschnitts knoten={zeile} />
      <span className="name">{zeile.name}</span>
      {/* Der Typ als Wort nur dort, wo kein Zeichen ihn zeigt: Beides
          nebeneinander sagt dasselbe zweimal und nimmt dem Namen den Platz. */}
      {abschnittszeichen(zeile) === undefined && <span className="typ">{abschnittstypTitel(zeile.typ)}</span>}
      {/* Die Spaltenköpfe „Einh. · Fü/UFü/He" stehen einmal über der Liste. */}
      <span className="zahlen" title={`${String(zeile.einheitenSumme)} Einheiten, Stärke ${staerke} (Fü/UFü/He)`}>
        {String(zeile.einheitenSumme)} · {staerke}
        {zeile.erwartetSumme > 0 && ` · ${kennzahlen.erwartetKurz(zeile.erwartetSumme)}`}
      </span>
      {zeile.aufgeloestNach !== undefined && (
        <span className="warnung">aufgelöst → {namen.get(zeile.aufgeloestNach) ?? "ein anderer Abschnitt"}</span>
      )}
      {zeile.zyklusGeloest === true && (
        <span className="warnung" title="Die Umhängung schloss einen Zyklus und wurde nicht wirksam">
          Zyklus gelöst
        </span>
      )}
      {zeile.elternUnbekannt !== undefined && (
        <span className="warnung" title="Der übergeordnete Abschnitt ist noch nicht eingetroffen">
          Elternabschnitt fehlt
        </span>
      )}
    </button>
  );
}

/**
 * Das Zeichen einer Baumzeile — klein, und nur wenn der Satz eines kennt.
 *
 * Die Zuordnung steht in `harke.ts` und wird hier **mitbenutzt** statt
 * nachgebaut: Ein Abschnitt, der in der Harke eine Einsatzabschnittsleitung
 * ist, darf im Baum keine andere sein.
 */
function ZeichenDesAbschnitts({ knoten }: { readonly knoten: Baumknoten }): React.JSX.Element | null {
  const gewaehlt = abschnittszeichen(knoten);
  if (gewaehlt === undefined) return null;
  return (
    <span className="baumzeichen">
      <Zeichen
        kennung={gewaehlt.kennung}
        // Die Langform nur beim abgeleiteten Zeichen: Bei einem frei
        // gewählten benennt der Satz selbst, was es bedeutet, und der Typ
        // wäre dann die falsche Auskunft.
        bedeutung={knoten.zeichen === undefined ? langform(knoten.typ, knoten.tiefe) : undefined}
        breite={26}
        ausschnitt={gewaehlt.ausschnitt}
      />
    </span>
  );
}
