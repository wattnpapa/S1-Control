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

import type { Anforderungszeile, Anforderungszustand } from "@s1/domaene";

import { useLaden } from "./laden.js";
import { Hilfemarke } from "./Hilfemarke.js";
import {
  abloesungZugesagt,
  anforderungAnlegen,
  anforderungErledigt,
  anforderungStorniert,
  ruecknahme,
} from "../kontrakt/bedienschritte.js";

/** Die vier Zustände mit ihrer Beschriftung, in der Ordnung der Liste. */
const ZUSTAENDE: readonly { readonly wert: Anforderungszustand; readonly titel: string }[] = [
  { wert: "OFFEN", titel: "Offen" },
  { wert: "ZUGESAGT", titel: "Zugesagt" },
  { wert: "EINGETROFFEN", titel: "Eingetroffen" },
  { wert: "STORNIERT", titel: "Storniert" },
];

/**
 * Eine Kennung für eine neue Anforderung.
 *
 * Sie wird im Renderer gebildet und nicht im Worker, weil sie zur **Anlage**
 * gehört und die Anlage von hier kommt (§3.11: Zwei Anlagen derselben Id sind
 * geregelt, aber die Id muss jemand vergeben). Zeitstempel plus Zufall reicht:
 * Kollidieren zwei Clients doch, gilt die kleinere HLC, und die zweite Anlage
 * steht in `verworfeneAnlagen`.
 */
function neueKennung(): string {
  return `anf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Formatiert einen ISO-Zeitpunkt für die Anzeige; leer bleibt leer. */
function zeit(wert: string): string {
  if (wert === "") return "";
  const zeitpunkt = new Date(wert);
  if (Number.isNaN(zeitpunkt.getTime())) return wert;
  return zeitpunkt.toLocaleString("de-DE");
}

/** Der Zeitpunkt „jetzt“ als ISO-Zeichenkette mit Zone — für die Anlage. */
function jetzt(): string {
  return new Date().toISOString();
}

export function Anforderungen(): React.JSX.Element {
  const laden = useLaden();
  const holeAnforderungen = laden.holeAnforderungen;
  const [neu, setzeNeu] = useState({ vorgeseheneEinheitText: "", vorgesehenerAuftrag: "", kennung: "" });

  useEffect(() => {
    void holeAnforderungen();
  }, [holeAnforderungen]);

  const ansicht = laden.anforderungen;
  const filter = laden.anforderungsfilter;

  function lege(): void {
    if (neu.vorgeseheneEinheitText.trim() === "" && neu.vorgesehenerAuftrag.trim() === "") return;
    void laden.bediene(
      anforderungAnlegen({
        anforderungId: neueKennung(),
        angefordertAm: jetzt(),
        ...(neu.kennung.trim() === "" ? {} : { kennung: neu.kennung.trim() }),
        ...(neu.vorgeseheneEinheitText.trim() === ""
          ? {}
          : { vorgeseheneEinheitText: neu.vorgeseheneEinheitText.trim() }),
        ...(neu.vorgesehenerAuftrag.trim() === ""
          ? {}
          : { vorgesehenerAuftrag: neu.vorgesehenerAuftrag.trim() }),
      }),
    );
    setzeNeu({ vorgeseheneEinheitText: "", vorgesehenerAuftrag: "", kennung: "" });
  }

  return (
    <section aria-label="Anforderungen" className="anforderungen">
      <h2>Anforderungen <Hilfemarke kennung="anforderungen" /></h2>

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

      <div className="anforderungneu">
        <label>
          Kennung
          <input
            type="text"
            value={neu.kennung}
            onChange={(e) => {
              setzeNeu((bisher) => ({ ...bisher, kennung: e.target.value }));
            }}
          />
        </label>
        <label>
          Vorgesehene Einheit
          <input
            type="text"
            value={neu.vorgeseheneEinheitText}
            onChange={(e) => {
              setzeNeu((bisher) => ({ ...bisher, vorgeseheneEinheitText: e.target.value }));
            }}
          />
        </label>
        <label>
          Vorgesehener Auftrag
          <input
            type="text"
            value={neu.vorgesehenerAuftrag}
            onChange={(e) => {
              setzeNeu((bisher) => ({ ...bisher, vorgesehenerAuftrag: e.target.value }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") lege();
            }}
          />
        </label>
        <button type="button" onClick={lege}>
          Anfordern
        </button>
      </div>

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

function Zeile({ zeile }: { readonly zeile: Anforderungszeile }): React.JSX.Element {
  const laden = useLaden();

  return (
    <tr className={zeile.zustand === "STORNIERT" ? "storniert" : ""}>
      <td>
        <span className={`zustand zustand-${zeile.zustand.toLowerCase()}`}>{zeile.zustand}</span>
      </td>
      <th scope="row">{zeile.kennung}</th>
      <td>{zeit(zeile.angefordertAm)}</td>
      <td>{zeile.abzuloesendeEinheit ?? ""}</td>
      <td>{zeile.vorgeseheneEinheitText}</td>
      <td>{zeile.vorgesehenerAuftrag}</td>
      <td>
        {zeile.zugesagtFuer === undefined
          ? ""
          : `${zeit(zeile.zugesagtFuer)}${zeile.zugesagtVon === "" ? "" : ` · ${zeile.zugesagtVon ?? ""}`}`}
      </td>
      <td className="handlungen">
        {/* Die Knöpfe folgen dem abgeleiteten Zustand (§5.6.2). Angeboten wird
            nur, was den Zustand ändert — und die Rücknahme dessen, was gilt.
            Eine Zusage auf eine bereits geltende Erledigung wäre wirkungslos
            und trüge einen Hinweis; einen Knopf dafür anzubieten, wäre ein
            Versprechen, das der Fold nicht hält. */}
        {zeile.zustand === "OFFEN" && (
          <button
            type="button"
            onClick={() => {
              void laden.bediene(abloesungZugesagt(zeile.id, jetzt(), ""));
            }}
          >
            Zusagen
          </button>
        )}
        {zeile.zustand === "ZUGESAGT" && (
          <>
            <button
              type="button"
              onClick={() => {
                void laden.bediene(anforderungErledigt(zeile.id, jetzt()));
              }}
            >
              Eingetroffen
            </button>
            <button
              type="button"
              onClick={() => {
                void laden.bediene(ruecknahme(zeile.id, "zusage"));
              }}
            >
              Zusage zurück
            </button>
          </>
        )}
        {zeile.zustand === "EINGETROFFEN" && (
          <button
            type="button"
            onClick={() => {
              void laden.bediene(ruecknahme(zeile.id, "erledigung"));
            }}
          >
            Eintreffen zurück
          </button>
        )}
        {zeile.zustand === "STORNIERT" ? (
          <button
            type="button"
            onClick={() => {
              void laden.bediene(ruecknahme(zeile.id, "storno"));
            }}
          >
            Storno zurück
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              // §2.4: Das Storno ist einer der Pflichtfälle für `grund`. Ohne
              // ihn weist der Aktendienst das Ereignis ab, und die Abweisung
              // wäre für den Bediener nicht erklärbar.
              const grund = globalThis.prompt("Grund der Stornierung");
              if (grund === null || grund.trim() === "") return;
              void laden.bediene(anforderungStorniert(zeile.id, grund.trim()));
            }}
          >
            Stornieren
          </button>
        )}
      </td>
    </tr>
  );
}
