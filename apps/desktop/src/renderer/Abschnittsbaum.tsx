/**
 * Der Abschnittsbaum (M3.1).
 *
 * Sechs Bedienschritte aus der DoD: anlegen, umbenennen, Typ ändern, umhängen
 * (mit Zyklusregel), sortieren, auflösen mit Zielabschnitt — dazu die freie
 * Wahl des taktischen Zeichens. Jeder von ihnen ist genau **ein** Ereignis aus
 * §5.3 — die Maske baut den Entwurf, der Aktendienst schreibt ihn, und der
 * Baum kommt beim nächsten Zeigerwechsel neu.
 *
 * **Zeichen und Typ sind zweierlei.** Der Typ entscheidet, ob die Stärke des
 * Abschnitts in die Gesamtstärke eingeht (§5.3.3), und eine Änderung daran
 * verlangt einen Grund (§2.4). Das Zeichen entscheidet nichts davon; es sagt,
 * womit der Abschnitt auf der Karte und in der Harke steht. Deshalb hat es
 * eine eigene Art und keine Grundpflicht.
 *
 * **Die Komponente rechnet nicht.** Sortierung, Zyklusregel und
 * Auflösungskette stehen in `@s1/domaene/projektion`; was hier steht, ist die
 * Zuordnung Knopf → Ereignisentwurf. Der einzige Ort, an dem diese
 * Komponente eine fachliche Frage stellt, ist {@link schluesseZyklus} vor dem
 * Umhängen — und auch die Antwort kommt aus Ring 2.
 *
 * **Jeder gesetzte Schritt trägt seinen `vorher`-Wert** (§2.2a, Auflage 6).
 * Der Wert kommt aus dem Knoten, den dieser Arbeitsplatz gerade sieht; genau
 * das ist die Aussage, die §2.2a verlangt — „was ich gesehen habe", nicht
 * „was gilt".
 */

import { useEffect, useMemo, useState } from "react";

import { ABSCHNITTSTYPEN, projektion, type Baumknoten } from "@s1/domaene";

import { Maske } from "./Maske.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";
import { abschnittszeichen, langform } from "./harke.js";
import { Zeichen } from "./zeichen.js";
import { Zeichenwahl } from "./Zeichenwahl.js";
import { kuerzelText, kuerzel, useKuerzel } from "./tastatur.js";
import { Hilfemarke } from "./Hilfemarke.js";

/** Welche Maske gerade offen ist — höchstens eine. */
type Maskenart =
  | "anlegen"
  | "umbenennen"
  | "typ"
  | "zeichen"
  | "umhaengen"
  | "aufloesen"
  | undefined;

export interface AbschnittsbaumEigenschaften {
  /** Der gewählte Abschnitt; er filtert zugleich die Einheitentabelle. */
  readonly gewaehlt: string | undefined;
  readonly aufWahl: (abschnittId: string | undefined) => void;
}

export function Abschnittsbaum({ gewaehlt, aufWahl }: AbschnittsbaumEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [maske, setzeMaske] = useState<Maskenart>(undefined);
  const [eingabe, setzeEingabe] = useState("");
  const [grund, setzeGrund] = useState("");
  const [ziel, setzeZiel] = useState("");
  const [ohneAufgeloeste, setzeOhneAufgeloeste] = useState(false);

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

  function schliesse(): void {
    setzeMaske(undefined);
    setzeEingabe("");
    setzeGrund("");
    setzeZiel("");
  }

  async function bediene(entwurf: Parameters<typeof laden.bediene>[0]): Promise<void> {
    const ergebnis = await laden.bediene(entwurf);
    // §8.8 Punkt 1: Ein gescheiterter Bedienschritt wird sichtbar abgewiesen.
    // Die Maske bleibt dann offen — der Bediener soll seine Eingabe nicht
    // verlieren, nur weil der Schreibversuch nicht durchging.
    if (ergebnis?.art !== "geschrieben") return;
    schliesse();
    await laden.holeBaum();
  }

  useKuerzel(
    useMemo(
      () => ({
        anlegen: () => {
          setzeMaske("anlegen");
        },
        abbrechen: () => {
          if (maske !== undefined) schliesse();
          else aufWahl(undefined);
        },
      }),
      [maske, aufWahl],
    ),
  );

  return (
    <section aria-label="Abschnitte" className="baum">
      <div className="baumkopf">
        <h2>Abschnitte <Hilfemarke kennung="abschnitte" /></h2>
        <button
          type="button"
          onClick={() => {
            setzeMaske("anlegen");
          }}
          title={`Neuer Abschnitt (${kuerzelText(kuerzel("anlegen") as never)})`}
        >
          Neu
        </button>
        <button type="button" disabled={!aenderbar(knoten)} onClick={() => { setzeEingabe(knoten?.name ?? ""); setzeMaske("umbenennen"); }}>
          Umbenennen
        </button>
        <button type="button" disabled={!aenderbar(knoten)} onClick={() => { setzeEingabe(knoten?.typ ?? ""); setzeMaske("typ"); }}>
          Typ ändern
        </button>
        <button
          type="button"
          disabled={!aenderbar(knoten)}
          onClick={() => { setzeEingabe(knoten?.zeichen ?? ""); setzeMaske("zeichen"); }}
          title="Das taktische Zeichen dieses Abschnitts frei wählen"
        >
          Zeichen
        </button>
        <button type="button" disabled={!aenderbar(knoten)} onClick={() => { setzeMaske("umhaengen"); }}>
          Umhängen
        </button>
        <button
          type="button"
          disabled={!aenderbar(knoten)}
          onClick={() => void verschiebeInReihenfolge(knoten, zeilen, -1, bediene)}
          title="Eine Stelle nach oben"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={!aenderbar(knoten)}
          onClick={() => void verschiebeInReihenfolge(knoten, zeilen, 1, bediene)}
          title="Eine Stelle nach unten"
        >
          ↓
        </button>
        <button
          type="button"
          disabled={!aenderbar(knoten) || knoten?.aufgeloestNach !== undefined}
          onClick={() => { setzeMaske("aufloesen"); }}
        >
          Auflösen
        </button>
        <label className="schalter">
          <input
            type="checkbox"
            checked={ohneAufgeloeste}
            onChange={(e) => {
              setzeOhneAufgeloeste(e.target.checked);
            }}
          />
          Aufgelöste ausblenden
        </label>
      </div>

      <ul className="baumliste">
        {zeilen
          .filter((zeile) => !ohneAufgeloeste || zeile.aufgeloestNach === undefined)
          .map((zeile) => (
            <li key={zeile.id} style={{ paddingLeft: `${String(zeile.tiefe * 1.2)}rem` }}>
              <button
                type="button"
                className={zeile.id === gewaehlt ? "baumzeile gewaehlt" : "baumzeile"}
                aria-pressed={zeile.id === gewaehlt}
                onClick={() => {
                  aufWahl(zeile.id === gewaehlt ? undefined : zeile.id);
                }}
              >
                {/* Das taktische Zeichen des Abschnitts — dasselbe, das in
                    der Führungsharke steht und auf der Lagekarte klebt. Wer
                    den Baum liest, soll die Struktur ohne Umweg über die
                    Typbezeichnung erkennen. */}
                <ZeichenDesAbschnitts knoten={zeile} />
                <span className="name">{zeile.name}</span>
                {/* Der Typ als Wort nur dort, wo kein Zeichen ihn zeigt: Beides
                    nebeneinander sagt dasselbe zweimal und nimmt dem Namen den
                    Platz. Am Zeichen steht die Bedeutung im `title`. */}
                {abschnittszeichen(zeile) === undefined && <span className="typ">{zeile.typ}</span>}
                <span className="zahlen">
                  {String(zeile.einheitenSumme)} Einh. · {zeile.summenStaerke.fuehrer}/
                  {zeile.summenStaerke.unterfuehrer}/{zeile.summenStaerke.mannschaft}
                </span>
                {zeile.aufgeloestNach !== undefined && (
                  <span className="warnung">aufgelöst → {zeile.aufgeloestNach}</span>
                )}
                {zeile.zyklusGeloest === true && (
                  <span className="warnung" title="Die Umhängung schloss einen Zyklus und wurde nicht wirksam (§5.3.1)">
                    Zyklus gelöst
                  </span>
                )}
                {zeile.elternUnbekannt !== undefined && (
                  <span className="warnung" title="Der übergeordnete Abschnitt ist noch nicht eingetroffen (§3.10)">
                    Elternabschnitt fehlt
                  </span>
                )}
              </button>
            </li>
          ))}
      </ul>

      {maske === "anlegen" && (
        <Maske
          titel="Abschnitt anlegen"
          bereit={eingabe.trim().length > 0}
          aufAbbrechen={schliesse}
          aufBestaetigen={() => {
            void bediene({
              typ: "AbschnittAngelegt",
              nutzlast: {
                abschnittId: neueId("A"),
                name: eingabe.trim(),
                typ: ziel === "" ? "EINSATZORT" : ziel,
                // Der neue Abschnitt hängt unter dem gewählten, wenn einer
                // gewählt ist: Das ist fast immer gemeint, und der Weg zurück
                // an die Wurzel ist ein Umhängen.
                ...(gewaehlt === undefined || knoten?.systemAbschnitt === true ? {} : { parentId: gewaehlt }),
                reihenfolge: naechsteReihenfolge(zeilen, gewaehlt),
              },
            });
          }}
        >
          <label>
            Name
            <input value={eingabe} onChange={(e) => { setzeEingabe(e.target.value); }} />
          </label>
          <label>
            Typ
            <Typwahl wert={ziel === "" ? "EINSATZORT" : ziel} aufWahl={setzeZiel} />
          </label>
        </Maske>
      )}

      {maske === "umbenennen" && knoten !== undefined && (
        <Maske
          titel={`„${knoten.name}“ umbenennen`}
          bereit={eingabe.trim().length > 0}
          aufAbbrechen={schliesse}
          aufBestaetigen={() => {
            void bediene({
              typ: "AbschnittUmbenannt",
              nutzlast: { abschnittId: knoten.id },
              vorher: knoten.name,
              neu: eingabe.trim(),
            });
          }}
        >
          <label>
            Neuer Name
            <input value={eingabe} onChange={(e) => { setzeEingabe(e.target.value); }} />
          </label>
        </Maske>
      )}

      {maske === "typ" && knoten !== undefined && (
        <Maske
          titel={`Typ von „${knoten.name}“ ändern`}
          // §2.4: `AbschnittTypGeaendert` verlangt einen Grund. Am Typ hängt
          // `zaehltInGesamtstaerke` — eine Änderung verschiebt die
          // Gesamtstärke, und wer sie später liest, soll wissen, warum.
          bereit={eingabe !== knoten.typ && grund.trim().length > 0}
          aufAbbrechen={schliesse}
          aufBestaetigen={() => {
            void bediene({
              typ: "AbschnittTypGeaendert",
              nutzlast: { abschnittId: knoten.id },
              vorher: knoten.typ,
              neu: eingabe,
              grund: grund.trim(),
            });
          }}
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
      )}

      {maske === "zeichen" && knoten !== undefined && (
        <Maske
          titel={`Zeichen von „${knoten.name}“`}
          // Kein Grund und keine Pflichtangabe: Das Zeichen ist eine Aussage
          // ueber die Darstellung und nicht ueber die Lage — es verschiebt
          // keine Staerke und keine Zaehlregel, anders als der Typ (§2.4).
          bereit={eingabe !== (knoten.zeichen ?? "")}
          aufAbbrechen={schliesse}
          aufBestaetigen={() => {
            void bediene({
              typ: "AbschnittZeichenGesetzt",
              nutzlast: { abschnittId: knoten.id },
              vorher: knoten.zeichen ?? null,
              neu: eingabe === "" ? null : eingabe,
            });
          }}
        >
          <Zeichenwahl
            wert={eingabe === "" ? undefined : eingabe}
            abgeleitet={`${langform(knoten.typ, knoten.tiefe)} (aus dem Typ)`}
            aufWahl={(kennung) => {
              setzeEingabe(kennung ?? "");
            }}
          />
        </Maske>
      )}

      {maske === "umhaengen" && knoten !== undefined && (
        <Maske
          titel={`„${knoten.name}“ umhängen`}
          aufAbbrechen={schliesse}
          aufBestaetigen={() => {
            void bediene({
              typ: "AbschnittUmgehaengt",
              nutzlast: { abschnittId: knoten.id },
              vorher: elternVon(zeilen, knoten.id) ?? null,
              neu: ziel === "" ? null : ziel,
            });
          }}
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
          <p className="hinweistext">
            Abschnitte, die einen Zyklus schlössen, stehen nicht zur Wahl (§5.3.1).
          </p>
        </Maske>
      )}

      {maske === "aufloesen" && knoten !== undefined && (
        <Maske
          titel={`„${knoten.name}“ auflösen`}
          bestaetigungstext="Auflösen"
          bereit={ziel !== ""}
          aufAbbrechen={schliesse}
          aufBestaetigen={() => {
            void bediene({
              typ: "AbschnittAufgeloest",
              nutzlast: { abschnittId: knoten.id },
              vorher: null,
              neu: { zielAbschnittId: ziel, aufgeloestAm: new Date().toISOString() },
            });
          }}
        >
          <label>
            Einheiten laufen weiter in
            <select value={ziel} onChange={(e) => { setzeZiel(e.target.value); }}>
              <option value="">— bitte wählen —</option>
              {zeilen
                .filter(
                  (zeile) =>
                    zeile.id !== knoten.id &&
                    zeile.aufgeloestNach === undefined &&
                    zeile.typ !== "ARCHIV" &&
                    zeile.typ !== "EINGANG",
                )
                .map((zeile) => (
                  <option key={zeile.id} value={zeile.id}>
                    {zeile.name}
                  </option>
                ))}
            </select>
          </label>
          <p className="hinweistext">
            Der Abschnitt bleibt sichtbar und lässt sich wiederherstellen; seine Einheiten stehen ab
            sofort im gewählten Ziel (§5.3.2).
          </p>
        </Maske>
      )}
    </section>
  );
}

/** Die bekannten Abschnittstypen (§5.3) ohne die beiden systemseitigen; der Bereich bleibt offen (§3.7). */
function Typwahl({ wert, aufWahl }: { wert: string; aufWahl: (typ: string) => void }): React.JSX.Element {
  return (
    <select value={wert} onChange={(e) => { aufWahl(e.target.value); }}>
      {ABSCHNITTSTYPEN.filter((typ) => typ !== "ARCHIV" && typ !== "EINGANG").map((typ) => (
        <option key={typ} value={typ}>
          {typ}
        </option>
      ))}
    </select>
  );
}

/**
 * Die beiden Systemabschnitte lassen sich nicht ändern (§5.3.4).
 *
 * Jedes ändernde Ereignis auf `EINGANG` oder `ARCHIV` ist wirkungslos und
 * erzeugt `reservierteIdVerworfen`. Einen Knopf anzubieten, dessen Wirkung der
 * Fold anschließend verwirft, wäre ein Versprechen, das die Anwendung nicht
 * hält.
 */
function aenderbar(knoten: Baumknoten | undefined): boolean {
  return knoten !== undefined && !knoten.systemAbschnitt;
}

function elternVon(zeilen: readonly Baumknoten[], id: string): string | undefined {
  return zeilen.find((zeile) => zeile.kinder.some((kind) => kind.id === id))?.id;
}

/** Wie {@link projektion.schluesseZyklus}, aber über den Zeilen der Ansicht. */
function schliessteZyklus(zeilen: readonly Baumknoten[], abschnittId: string, kandidat: string): boolean {
  if (abschnittId === kandidat) return true;
  let lauf: string | undefined = kandidat;
  const gesehen = new Set<string>([abschnittId]);
  while (lauf !== undefined) {
    if (gesehen.has(lauf)) return true;
    gesehen.add(lauf);
    lauf = elternVon(zeilen, lauf);
  }
  return false;
}

/** Die nächste freie Reihenfolge unter demselben Elternteil. */
function naechsteReihenfolge(zeilen: readonly Baumknoten[], parentId: string | undefined): number {
  const geschwister = zeilen.filter((zeile) =>
    parentId === undefined ? zeile.tiefe === 0 : elternVon(zeilen, zeile.id) === parentId,
  );
  return geschwister.reduce((groesste, zeile) => Math.max(groesste, zeile.reihenfolge), 0) + 1;
}

/**
 * Verschiebt einen Abschnitt eine Stelle nach oben oder unten.
 *
 * Getauscht werden die **Reihenfolgewerte** und nicht die Positionen: `§5.3`
 * sortiert nach `reihenfolge`, und ein Tausch ist genau ein
 * `AbschnittUmsortiert` mit `vorher` und `neu`. Ein Neudurchnummerieren aller
 * Geschwister wären so viele Ereignisse wie Geschwister — und jedes davon
 * ein Konfliktkandidat gegen einen zweiten Arbeitsplatz.
 */
async function verschiebeInReihenfolge(
  knoten: Baumknoten | undefined,
  zeilen: readonly Baumknoten[],
  richtung: -1 | 1,
  bediene: (entwurf: { typ: string; nutzlast: unknown; vorher?: unknown; neu?: unknown }) => Promise<void>,
): Promise<void> {
  if (knoten === undefined) return;
  const eltern = elternVon(zeilen, knoten.id);
  const geschwister = zeilen
    .filter((zeile) => elternVon(zeilen, zeile.id) === eltern)
    .sort((a, b) => (a.reihenfolge === b.reihenfolge ? (a.id < b.id ? -1 : 1) : a.reihenfolge - b.reihenfolge));
  const stelle = geschwister.findIndex((zeile) => zeile.id === knoten.id);
  const nachbar = geschwister[stelle + richtung];
  if (nachbar === undefined) return;
  await bediene({
    typ: "AbschnittUmsortiert",
    nutzlast: { abschnittId: knoten.id },
    vorher: knoten.reihenfolge,
    neu: nachbar.reihenfolge,
  });
  await bediene({
    typ: "AbschnittUmsortiert",
    nutzlast: { abschnittId: nachbar.id },
    vorher: nachbar.reihenfolge,
    neu: knoten.reihenfolge,
  });
}

/**
 * Das Zeichen einer Baumzeile — klein, und nur wenn der Satz eines kennt.
 *
 * Die Zuordnung steht in `harke.ts` und wird hier **mitbenutzt** statt
 * nachgebaut: Ein Abschnitt, der in der Harke eine Einsatzabschnittsleitung
 * ist, darf im Baum keine andere sein.
 */
function ZeichenDesAbschnitts({
  knoten,
}: {
  readonly knoten: Baumknoten;
}): React.JSX.Element | null {
  const gewaehlt = abschnittszeichen(knoten);
  if (gewaehlt === undefined) return null;
  return (
    <span className="baumzeichen">
      <Zeichen
        kennung={gewaehlt.kennung}
        // Die Langform nur beim abgeleiteten Zeichen: Bei einem frei
        // gewaehlten benennt der Satz selbst, was es bedeutet, und der Typ
        // waere dann die falsche Auskunft.
        bedeutung={knoten.zeichen === undefined ? langform(knoten.typ, knoten.tiefe) : undefined}
        breite={26}
        ausschnitt={gewaehlt.ausschnitt}
      />
    </span>
  );
}
