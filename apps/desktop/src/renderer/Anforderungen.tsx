/**
 * Die Anforderungen (M5.3).
 *
 * Die Excel führt sie als sechs Spalten einer Einheitenzeile — N bis S
 * (`excel-domaenenmodell.md` §2). Im Zielmodell sind sie eine **eigene
 * Entität** mit einer Zustandsmaschine (KONZEPT-EREIGNISSE.md §5.6), und der
 * Unterschied ist der Grund für dieses Blatt: Eine Anforderung, die noch keine
 * Einheit hat, hätte in der Vorlage keine Zeile — und genau das ist der
 * Normalfall zwischen Anforderung und Zusage.
 *
 * **Der Zustand wird gezeigt, nicht gesetzt.** Er ist nach §5.6.2 aus drei
 * gewöhnlichen Feldern abgeleitet: `erledigung` schlägt `storno` schlägt
 * `zusage`. Deshalb gibt es hier auch keinen „Zustand ändern“-Knopf, sondern
 * je einen für die drei Handlungen und je einen für ihre Rücknahme. Ein
 * einzelnes Zustandsfeld ließe `EINGETROFFEN → ZUGESAGT` zu, sobald eine
 * verspätete Zusage eine höhere HLC trägt — den Rückschritt, den P6 verbietet.
 */

import { useEffect, useState } from "react";
import { useGrundabfrage } from "./Grundabfrage.js";

import { zeitpunktText, type Anforderungszeile, type Anforderungszustand } from "@s1/domaene";

import { useLaden } from "./laden.js";
import { Hilfemarke } from "./Hilfemarke.js";
import { AnforderungZuEinheit, type Eintreffart } from "./AnforderungZuEinheit.js";
import { AnforderungZusage } from "./AnforderungZusage.js";
import { Anforderungsneu } from "./Anforderungsneu.js";
import { useFeldversuch } from "./Feldschreiben.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { NurLesenHinweis, useNurLesen } from "./Nurlesen.js";
import { anforderungStorniert, ruecknahme } from "../kontrakt/bedienschritte.js";

/** Die vier Zustände mit ihrer Beschriftung, in der Ordnung der Liste. */
const ZUSTAENDE: readonly { readonly wert: Anforderungszustand; readonly titel: string }[] = [
  { wert: "OFFEN", titel: "Offen" },
  { wert: "ZUGESAGT", titel: "Zugesagt" },
  { wert: "EINGETROFFEN", titel: "Eingetroffen" },
  { wert: "STORNIERT", titel: "Storniert" },
];

/** Das Wort zum Zustand — die Liste zeigt keine Schlüssel. */
function zustandTitel(wert: Anforderungszustand): string {
  return ZUSTAENDE.find((zustand) => zustand.wert === wert)?.titel ?? wert;
}

export function Anforderungen(): React.JSX.Element {
  const laden = useLaden();
  const holeAnforderungen = laden.holeAnforderungen;

  useEffect(() => {
    void holeAnforderungen();
  }, [holeAnforderungen]);

  const ansicht = laden.anforderungen;

  return (
    <section aria-label="Anforderungen" className="anforderungen">
      <h2>Anforderungen <Hilfemarke kennung="anforderungen" /></h2>

      <NurLesenHinweis />

      <Zustandsfilter />

      <Anforderungsneu einheitenwahl={ansicht?.einheitenwahl ?? []} />

      {ansicht === undefined ? (
        <p className="hinweistext">Wird geladen …</p>
      ) : ansicht.zeilen.length === 0 ? (
        <p className="hinweistext">Keine Anforderung.</p>
      ) : (
        <table className="anforderungstabelle">
          <thead>
            <tr>
              <th scope="col">Zustand</th>
              <th scope="col">Kennung</th>
              <th scope="col">Angefordert</th>
              <th scope="col">Ablösung für</th>
              <th scope="col">Vorgesehen</th>
              <th scope="col">Auftrag</th>
              <th scope="col">Zusage</th>
              <th scope="col">Handlung</th>
            </tr>
          </thead>
          <tbody>
            {ansicht.zeilen.map((zeile) => (
              <Zeile key={zeile.id} zeile={zeile} />
            ))}
          </tbody>
        </table>
      )}

      {ansicht !== undefined && ansicht.gesamtzahl > ansicht.zeilen.length && (
        <p className="hinweistext">
          {ansicht.zeilen.length} von {ansicht.gesamtzahl} Anforderungen.
        </p>
      )}
    </section>
  );
}

/** Die Zustandsfilter über der Liste, mit der Zahl je Zustand. */
function Zustandsfilter(): React.JSX.Element {
  const laden = useLaden();
  const ansicht = laden.anforderungen;
  const filter = laden.anforderungsfilter;
  return (
  <div className="anforderungsfilter">
    {ZUSTAENDE.map((zustand) => {
      const gewaehlt = filter.zustaende?.includes(zustand.wert) ?? false;
      return (
        <label key={zustand.wert}>
          <input
            type="checkbox"
            checked={gewaehlt}
            onChange={() => {
              const bisher = filter.zustaende ?? [];
              const naechste = gewaehlt
                ? bisher.filter((wert) => wert !== zustand.wert)
                : [...bisher, zustand.wert];
              // Keine Auswahl heißt „alle“ und nicht „nichts“: Eine leere
              // Liste, die eine leere Tabelle ergibt, liest sich wie ein
              // Fehler.
              void laden.setzeAnforderungsfilter(
                naechste.length === 0 ? {} : { zustaende: naechste },
              );
            }}
          />
          {zustand.titel}
          {ansicht === undefined ? "" : ` (${String(ansicht.jeZustand[zustand.wert] ?? 0)})`}
        </label>
      );
    })}
  </div>
  );
}

/** Welche Maske an einer Zeile offen ist. */
type Zeilenmaske = "zusage" | Eintreffart | undefined;

function Zeile({ zeile }: { readonly zeile: Anforderungszeile }): React.JSX.Element {
  return (
    <tr className={zeile.zustand === "STORNIERT" ? "storniert" : ""}>
      <td data-label="Zustand">
        <span className={`zustand zustand-${zeile.zustand.toLowerCase()}`}>{zustandTitel(zeile.zustand)}</span>
      </td>
      <th scope="row" data-label="Kennung">{zeile.kennung}</th>
      <td data-label="Angefordert">{zeitpunktText(zeile.angefordertAm)}</td>
      <td data-label="Ablösung für">{zeile.abzuloesendeEinheit ?? ""}</td>
      <td data-label="Vorgesehen">
        {zeile.vorgeseheneEinheitText}
        {/* Die Einheit, die aus der Anforderung angelegt wurde — „Ablösung
            durch“ in der Einheitentabelle. */}
        {zeile.abloesendeEinheit !== undefined && (
          <span className="hinweistext"> → angelegt: {zeile.abloesendeEinheit}</span>
        )}
      </td>
      <td data-label="Auftrag">{zeile.vorgesehenerAuftrag}</td>
      <td data-label="Zusage">
        {zeile.zugesagtFuer === undefined
          ? ""
          : `${zeitpunktText(zeile.zugesagtFuer)}${zeile.zugesagtVon === "" ? "" : ` · ${zeile.zugesagtVon ?? ""}`}`}
      </td>
      <Handlungen zeile={zeile} />
    </tr>
  );
}

/** Die Handlungen einer Zeile und die Masken, die sie öffnen. */
function Handlungen({ zeile }: { readonly zeile: Anforderungszeile }): React.JSX.Element {
  const aktion = useFeldversuch();
  const nurLesen = useNurLesen();
  const [maske, setzeMaske] = useState<Zeilenmaske>(undefined);
  // Beendeter Einsatz oder unterbrochene Verbindung: Die Knöpfe sind gesperrt,
  // der Grund steht im Blatt (Banner bzw. Verbindungsband) und als Tooltip.
  const zu = nurLesen || aktion.laeuft;
  const grund = nurLesen ? TEXT_NUR_LESEN : undefined;
  const schliesse = (): void => {
    setzeMaske(undefined);
  };
  return (
    <td className="handlungen" data-label="Handlung">
      {/* Die Knöpfe folgen dem abgeleiteten Zustand (§5.6.2). Angeboten wird
          nur, was den Zustand ändert — und die Rücknahme dessen, was gilt.
          Eine Zusage auf eine bereits geltende Erledigung wäre wirkungslos
          und trüge einen Hinweis; einen Knopf dafür anzubieten, wäre ein
          Versprechen, das der Fold nicht hält. */}
      {zeile.zustand === "OFFEN" && (
        <button type="button" disabled={nurLesen} title={grund} onClick={() => { setzeMaske("zusage"); }}>
          Zusagen
        </button>
      )}
      {zeile.zustand === "ZUGESAGT" && (
        <>
          <button type="button" disabled={nurLesen} title={grund} onClick={() => { setzeMaske("eintreffen"); }}>
            Eingetroffen
          </button>
          <button
            type="button"
            disabled={zu || aktion.gesperrt}
            title={grund}
            onClick={() => {
              void aktion.schreibe(ruecknahme(zeile.id, "zusage"));
            }}
          >
            {aktion.laeuft ? "…" : "Zusage zurück"}
          </button>
        </>
      )}
      {zeile.zustand === "EINGETROFFEN" && (
        <>
          {zeile.abloesendeEinheitId === undefined && (
            <button type="button" disabled={nurLesen} title={grund} onClick={() => { setzeMaske("nachtragen"); }}>
              Einheit anlegen
            </button>
          )}
          <button
            type="button"
            disabled={zu || aktion.gesperrt}
            title={grund}
            onClick={() => {
              void aktion.schreibe(ruecknahme(zeile.id, "erledigung"));
            }}
          >
            {aktion.laeuft ? "…" : "Eintreffen zurück"}
          </button>
        </>
      )}
      <StornoKnopf zeile={zeile} />
      {aktion.anzeige}
      {maske === "zusage" && <AnforderungZusage zeile={zeile} aufSchliessen={schliesse} />}
      {(maske === "eintreffen" || maske === "nachtragen") && (
        <AnforderungZuEinheit zeile={zeile} art={maske} aufSchliessen={schliesse} />
      )}
    </td>
  );
}

/** Stornieren — mit Pflichtgrund (§2.4) — oder die Rücknahme des Stornos. */
function StornoKnopf({ zeile }: { readonly zeile: Anforderungszeile }): React.JSX.Element {
  const laden = useLaden();
  const grundabfrage = useGrundabfrage();
  const aktion = useFeldversuch();
  const nurLesen = useNurLesen();
  return (
    <>
      {zeile.zustand === "STORNIERT" ? (
        <button
          type="button"
          disabled={nurLesen || aktion.laeuft || aktion.gesperrt}
          title={nurLesen ? TEXT_NUR_LESEN : undefined}
          onClick={() => {
            void aktion.schreibe(ruecknahme(zeile.id, "storno"));
          }}
        >
          {aktion.laeuft ? "…" : "Storno zurück"}
        </button>
      ) : (
        <button
          type="button"
          disabled={nurLesen}
          title={nurLesen ? TEXT_NUR_LESEN : undefined}
          onClick={() => {
            // §2.4: Das Storno ist einer der Pflichtfälle für `grund`. Ohne
            // ihn weist der Aktendienst das Ereignis ab, und die Abweisung
            // wäre für den Bediener nicht erklärbar.
            grundabfrage.frage({
              titel: "Anforderung stornieren",
              erlaeuterung:
                "Die Stornierung steht mit diesem Grund im Einsatztagebuch und ist später von einem Versehen zu unterscheiden.",
              bestaetigungstext: "Stornieren",
              aufGrund: (grund) => laden.bediene(anforderungStorniert(zeile.id, grund)),
            });
          }}
        >
          Stornieren
        </button>
      )}
      {zeile.zustand === "STORNIERT" && aktion.anzeige}
      {grundabfrage.maske}
    </>
  );
}
