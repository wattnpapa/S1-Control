/**
 * Die Unterkünfte als Karten (S4.2, 4e): Name, Ort, Kapazität, Belegung als
 * Balken in m/w/d, frei, dazu die Marke „frei", „voll" oder „⚠ überbelegt".
 *
 * Ändern und Auflösen stehen an der Karte; das Auflösen fragt einen Grund
 * (Pflicht, §2.4) — wer eine Unterkunft auflöst, nimmt Leuten ihr Bett.
 */

import type { Unterkunftskarte } from "@s1/domaene";

import { useGrundabfrage } from "./Grundabfrage.js";
import { useLaden } from "./laden.js";
import { unterkunftAufgeloest, unterkunftWiederhergestellt } from "../kontrakt/versorgungsschritte.js";

function anteil(wert: number, kapazitaet: number, belegt: number): string {
  const basis = Math.max(kapazitaet, belegt, 1);
  return `${String((wert / basis) * 100)}%`;
}

function Marke({ k }: { readonly k: Unterkunftskarte }): React.JSX.Element {
  if (k.aufgeloest) return <span className="marke-zustand">aufgelöst</span>;
  if (k.ueberbelegt) return <span className="marke-zustand fehler">⚠ überbelegt</span>;
  if (k.frei === 0) return <span className="marke-zustand warn">voll</span>;
  return <span className="marke-zustand ok">{k.frei} frei</span>;
}

function Karte(props: {
  readonly k: Unterkunftskarte;
  readonly nurLesen: boolean;
  readonly aufAendern: (k: Unterkunftskarte) => void;
  readonly aufAufloesen: (k: Unterkunftskarte) => void;
}): React.JSX.Element {
  const { k } = props;
  const bediene = useLaden((z) => z.bediene);
  return (
    <article className={k.aufgeloest ? "unterkunftskarte aufgeloest" : "unterkunftskarte"} aria-label={k.name}>
      <header>
        <strong>{k.name}</strong>
        {k.ort !== undefined && <span className="leise">{k.ort}</span>}
        <Marke k={k} />
      </header>
      <div className="belegungsbalken" role="img" aria-label={`belegt ${String(k.belegt.gesamt)} von ${String(k.kapazitaet)}`}>
        <span className="m" style={{ width: anteil(k.belegt.m, k.kapazitaet, k.belegt.gesamt) }} />
        <span className="w" style={{ width: anteil(k.belegt.w, k.kapazitaet, k.belegt.gesamt) }} />
        <span className="d" style={{ width: anteil(k.belegt.d, k.kapazitaet, k.belegt.gesamt) }} />
      </div>
      <p className="belegungszahlen">
        <strong>{k.belegt.gesamt}</strong> / {k.kapazitaet} · m {k.belegt.m} · w {k.belegt.w} · d {k.belegt.d} ·{" "}
        {k.einheiten.length === 0 ? "keine Einheit" : `${String(k.einheiten.length)} Einheiten`}
      </p>
      {!props.nurLesen && (
        <p className="kartenknoepfe">
          {k.aufgeloest ? (
            <button type="button" onClick={() => void bediene(unterkunftWiederhergestellt(k.unterkunftId))}>
              Wiederherstellen
            </button>
          ) : (
            <>
              <button type="button" onClick={() => props.aufAendern(k)}>
                Ändern
              </button>
              <button type="button" onClick={() => props.aufAufloesen(k)}>
                Auflösen …
              </button>
            </>
          )}
        </p>
      )}
    </article>
  );
}

export function Unterkunftskarten(props: {
  readonly karten: readonly Unterkunftskarte[];
  readonly nurLesen: boolean;
  readonly aufAendern: (k: Unterkunftskarte) => void;
}): React.JSX.Element {
  const abfrage = useGrundabfrage();
  const bediene = useLaden((z) => z.bediene);
  const aufAufloesen = (k: Unterkunftskarte): void => {
    abfrage.frage({
      titel: `Unterkunft „${k.name}“ auflösen`,
      erlaeuterung: `${String(k.einheiten.length)} Einheiten verlieren ihre Zuweisung und stehen danach als „ohne Unterkunft“.`,
      bestaetigungstext: "Auflösen",
      aufGrund: (grund) => bediene(unterkunftAufgeloest(k.unterkunftId, grund)),
    });
  };
  return (
    <div className="unterkunftskarten">
      {props.karten.length === 0 && <p className="hinweistext">Noch keine Unterkunft angelegt.</p>}
      {props.karten.map((k) => (
        <Karte key={k.unterkunftId} k={k} nurLesen={props.nurLesen} aufAendern={props.aufAendern} aufAufloesen={aufAufloesen} />
      ))}
      <p className="legende">
        <span className="m" /> männl. <span className="w" /> weibl. <span className="d" /> div.
      </p>
      {abfrage.maske}
    </div>
  );
}
