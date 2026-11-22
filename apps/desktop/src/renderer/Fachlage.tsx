/**
 * Das Blatt „Fachlage“ (Stab-Review 2026-11-22): Lage je Abschnitt, Pegel,
 * Deich, Patienten, Amtshilfe, Material, Presse, Störungen — ein Umschalter,
 * je Bereich eine Tabelle mit „Neu …“ und „Ändern …“ an jeder Zeile.
 * Darüber die Zahlen, die eine Rolle auf einen Blick braucht.
 *
 * Gefordert von S2, Führungsgehilfe S2, S3, S4, S5, S6, Fachberater
 * Sanitätsdienst, Verbindungsperson Bundeswehr und Fachberater
 * Wasserbehörde. Jeder Bereich hat eigene Ereignisarten im Tagebuch.
 */

import { useEffect, useState } from "react";

import { fachlagewort, projektion, zeitpunktText, type Fachlage as Fachlagedaten, type Fachlagebereich, type Fachlagezeile } from "@s1/domaene";

import type { Fachlageansicht } from "../kontrakt/index.js";
import { rufe } from "./bruecke.js";
import { FachlageAenderung, FachlageAnlage } from "./Fachlagemasken.js";
import { FACHLAGEBESCHREIBUNG } from "./fachlagebereiche.js";
import { useLaden } from "./laden.js";
import { useNurLesen } from "./Nurlesen.js";

function useFachlage(): Fachlageansicht | undefined {
  const akteId = useLaden((z) => z.akteId);
  const lageZeiger = useLaden((z) => z.lagebild?.lageZeiger);
  const [ansicht, setzeAnsicht] = useState<Fachlageansicht | undefined>(undefined);
  useEffect(() => {
    if (akteId === undefined) return;
    let gilt = true;
    rufe({ art: "fachlageAnfordern", akteId })
      .then((antwort) => {
        if (gilt) setzeAnsicht(antwort);
      })
      .catch(() => undefined);
    return () => {
      gilt = false;
    };
  }, [akteId, lageZeiger]);
  return ansicht;
}

function zellwert(zeile: Fachlagezeile, feld: string): string {
  if (feld === "abschnitt") return zeile.abschnitt ?? "–";
  const wert = zeile.werte[feld];
  if (wert === undefined || wert === "") return "–";
  if (typeof wert === "boolean") return wert ? "ja" : "nein";
  return typeof wert === "string" ? fachlagewort(wert) : String(wert);
}

function Kopfzahlen({ bereich, f }: { bereich: Fachlagebereich; f: Fachlagedaten }): React.JSX.Element | null {
  if (bereich === "pegel" && f.pegelstaende.length > 0) {
    return (
      <ul className="fachlagekopf" aria-label="Pegelstände">
        {f.pegelstaende.map((p) => (
          <li key={p.pegel}>
            <strong>{p.pegel}</strong> {p.wertCm} cm{p.tendenzCm === undefined ? "" : ` (${p.tendenzCm >= 0 ? "+" : ""}${String(p.tendenzCm)})`}
            {p.prognoseCm === undefined ? "" : ` · Prognose ${String(p.prognoseCm)} cm${p.prognoseFuer === undefined ? "" : ` für ${zeitpunktText(p.prognoseFuer)}`}`}
            <span className="hinweistext"> · {zeitpunktText(p.zeitpunkt)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (bereich === "patienten") {
    const s = f.patientensumme;
    return (
      <p className="fachlagekopf" aria-label="Patienten je Sichtungskategorie">
        {s.gesamt} Patienten · SK 1: {s["SK1"]} · SK 2: {s["SK2"]} · SK 3: {s["SK3"]} · SK 4: {s["SK4"]} · davon Einsatzkräfte: {s.einsatzkraefte}
      </p>
    );
  }
  if (bereich === "stoerungen") return <p className="fachlagekopf">{f.offeneStoerungen === 0 ? "Keine offene Störung." : `${String(f.offeneStoerungen)} offene Störung(en).`}</p>;
  return null;
}

type Offen = { readonly art: "neu" } | { readonly art: "aendern"; readonly zeile: Fachlagezeile } | undefined;

export function Fachlage(): React.JSX.Element {
  const ansicht = useFachlage();
  const nurLesen = useNurLesen();
  const [bereich, setzeBereich] = useState<Fachlagebereich>("lage");
  const [offen, setzeOffen] = useState<Offen>(undefined);
  const b = FACHLAGEBESCHREIBUNG[bereich];
  const zeilen = ansicht?.fachlage.zeilen[bereich] ?? [];

  return (
    <section aria-label="Fachlage" className="fachlage">
      <div className="fachlagekopfzeile">
        <h2>Fachlage</h2>
        <div className="umschalter" role="group" aria-label="Bereich">
          {projektion.FACHLAGE_BEREICHE.map((name) => (
            <button key={name} type="button" aria-pressed={name === bereich} onClick={() => setzeBereich(name)}>
              {FACHLAGEBESCHREIBUNG[name].titel}
              {(ansicht?.fachlage.zeilen[name] ?? []).some((z) => !z.erledigt) && <span className="kurz"> {(ansicht?.fachlage.zeilen[name] ?? []).filter((z) => !z.erledigt).length}</span>}
            </button>
          ))}
        </div>
      </div>
      <section aria-label={b.titel} className="karte">
        <div className="fachlagekopfzeile">
          <h3>{b.titel}</h3>
          <button type="button" className="haupt" disabled={nurLesen} onClick={() => setzeOffen({ art: "neu" })}>
            {b.neu}
          </button>
        </div>
        <p className="hinweistext">{b.zweck}</p>
        {ansicht !== undefined && <Kopfzahlen bereich={bereich} f={ansicht.fachlage} />}
        {zeilen.length === 0 ? (
          <p>Noch nichts erfasst.</p>
        ) : (
          <div className="tabellenrahmen">
            <table>
              <thead>
                <tr>
                  <th scope="col">Zeit</th>
                  {b.spalten.map((s) => (
                    <th key={s.feld} scope="col">{s.titel}</th>
                  ))}
                  <th scope="col">Stand</th>
                  <th scope="col"><span className="nurvorlesen">Schritte</span></th>
                </tr>
              </thead>
              <tbody>
                {zeilen.map((zeile) => (
                  <tr key={zeile.id} className={zeile.erledigt ? "erledigt" : undefined}>
                    <td>{zeitpunktText(zeile.zeitpunkt)}</td>
                    {b.spalten.map((s) => (
                      <td key={s.feld}>{zellwert(zeile, s.feld)}</td>
                    ))}
                    <td>{zeile.stand === undefined ? "–" : fachlagewort(zeile.stand)}</td>
                    <td>
                      <button type="button" disabled={nurLesen} onClick={() => setzeOffen({ art: "aendern", zeile })} aria-label={`${b.titel}: Eintrag ändern`}>
                        Ändern …
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {offen?.art === "neu" && <FachlageAnlage key={bereich} bereich={bereich} aufSchliessen={() => setzeOffen(undefined)} />}
      {offen?.art === "aendern" && <FachlageAenderung key={offen.zeile.id} bereich={bereich} zeile={offen.zeile} aufSchliessen={() => setzeOffen(undefined)} />}
    </section>
  );
}
