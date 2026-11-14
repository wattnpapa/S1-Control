/**
 * Der Handscanner-Weg (M3.4).
 *
 * Ein Handscanner ist für den Rechner eine Tastatur: Er tippt die
 * Zeichenkette aus dem QR-Code und schließt mit Enter ab. Diese Maske ist
 * deshalb ein einzelnes Textfeld, das nach jedem Enter geleert wird — mehr
 * braucht es nicht, und alles darüber hinaus stünde dem Scannen im Weg.
 *
 * **Das Feld behält den Fokus.** Wer sieben Teile scannt, greift dazwischen
 * nicht zur Maus; verlöre das Feld den Fokus, ginge der nächste Scan als
 * Tastendruck an das Fenster und löste dort Kürzel aus.
 *
 * **Der Bogen wird nicht hier entpackt.** Das braucht einen Kompressor, und
 * der Renderer hat kein Node (02-ZIELBILD.md, „Vier Ringe“). Diese Maske
 * schickt Text und bekommt Fortschritt, Signaturbefund und eine Vorschau in
 * Klartext zurück — die Byte-Abschnitte sieht sie nie.
 *
 * **Daneben der Datei-Weg** (`ScannerDatei.tsx`): Eine PDF aus der
 * Erfassungsbogen-App lässt sich auf die Maske ziehen oder über „PDF wählen …“
 * öffnen. Sie führt danach in dieselbe Vorschau wie ein Scan.
 */

import { useEffect, useRef, useState } from "react";

import type { Sammeluebernahme } from "../kontrakt/index.js";

import { useLaden } from "./laden.js";
import { Dateiknopf, useAblage, useBogendateien } from "./ScannerDatei.js";
import { kuerzel, kuerzelText } from "./tastatur.js";

export interface ScannerEigenschaften {
  /** Der Abschnitt, in den übernommen wird — die Wahl aus dem Baum. */
  readonly abschnittId: string | undefined;
  readonly aufSchliessen: () => void;
}

export function Scanner({ abschnittId, aufSchliessen }: ScannerEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [eingabe, setzeEingabe] = useState("");
  const [ziel, setzeZiel] = useState(abschnittId ?? "");
  const [ergebnis, setzeErgebnis] = useState<string | undefined>(undefined);
  const feld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    feld.current?.focus();
  }, [laden.eeb]);

  const stand = laden.eeb;
  const vorschau = stand?.vorschau;
  const abschnitte = flach(laden.baum?.baum ?? []);
  const dateien = useBogendateien();
  const liesDateien = (gewaehlt: readonly File[]): void => {
    setzeErgebnis(undefined);
    void dateien.lies(gewaehlt);
  };
  const ablage = useAblage(liesDateien);
  const wartend = stand?.wartend ?? 0;

  return (
    <section
      aria-label="Erfassungsbogen einlesen"
      className={ablage.ziehend ? "scanner ziehend" : "scanner"}
      {...ablage.griffe}
    >
      <div className="scannerkopf">
        <h2>Erfassungsbogen einlesen</h2>
        <span className="hinweistext">
          Handscanner in das Feld richten und den Code lesen ({kuerzelText(kuerzel("eeb") as never)}
          )
        </span>
        <button type="button" onClick={aufSchliessen}>
          Schließen
        </button>
      </div>

      <label>
        Scan
        <input
          ref={feld}
          value={eingabe}
          autoFocus
          onChange={(e) => {
            setzeEingabe(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const text = eingabe;
            setzeEingabe("");
            setzeErgebnis(undefined);
            void laden.scanne(text);
          }}
        />
      </label>
      <Dateiknopf aufDateien={liesDateien} />

      <p className="fortschritt" aria-live="polite">
        {fortschrittstext(stand)}
        {wartend > 0 && ` ${wartendtext(wartend)}`}
      </p>
      {dateien.hinweis !== undefined && <p className="warnung">{dateien.hinweis}</p>}
      {stand?.meldung !== undefined && <p className="warnung">{stand.meldung}</p>}

      {vorschau !== undefined && (
        <div className="vorschau">
          <h3>Vorschau</h3>
          <dl>
            <dt>Bezeichnung</dt>
            <dd>{vorschau.bezeichnung}</dd>
            <dt>Organisation</dt>
            <dd>{vorschau.organisation}</dd>
            <dt>Herkunft</dt>
            <dd>{vorschau.herkunft === "" ? "—" : vorschau.herkunft}</dd>
            <dt>Stärke</dt>
            <dd>
              {vorschau.staerke.fuehrer}/{vorschau.staerke.unterfuehrer}/
              {vorschau.staerke.mannschaft}
            </dd>
            <dt>Personen · Fahrzeuge</dt>
            <dd>
              {vorschau.personen} · {vorschau.fahrzeuge}
            </dd>
            <dt>Signatur</dt>
            {/* §5.8.1: Der Befund wird **angezeigt**, er entscheidet nichts.
                Eine Meldung mit gebrochener Signatur wird aufgenommen; wer sie
                nicht will, lehnt sie ab — sie bleibt sichtbar. */}
            <dd className={vorschau.signatur === "ungueltig" ? "fehler" : ""}>
              {signaturtext(vorschau.signatur)}
              {vorschau.signaturKurzform === undefined ? "" : ` · ${vorschau.signaturKurzform}`}
              {vorschau.absender === undefined ? "" : ` · ${vorschau.absender}`}
            </dd>
          </dl>

          <label>
            Übernehmen in Abschnitt
            <select
              value={ziel}
              onChange={(e) => {
                setzeZiel(e.target.value);
              }}
            >
              <option value="">— bitte wählen —</option>
              {abschnitte.map((eintrag) => (
                <option key={eintrag.id} value={eintrag.id}>
                  {eintrag.name}
                </option>
              ))}
            </select>
          </label>

          <div className="maskenknoepfe">
            <button
              type="button"
              disabled={ziel === ""}
              onClick={() => {
                void (async () => {
                  const ausgang = await laden.uebernimmScan(ziel);
                  if (ausgang === undefined) return;
                  setzeErgebnis(
                    ausgang.art === "uebernommen"
                      ? `Übernommen: ${String(ausgang.ereignisse)} Ereignisse geschrieben.`
                      : ausgang.art === "abgewiesen"
                        ? `Abgewiesen bei ${ausgang.beiEreignis}: ${ausgang.meldung}`
                        : ausgang.meldung,
                  );
                })();
              }}
            >
              Übernehmen
            </button>
            {wartend > 0 && (
              <button
                type="button"
                disabled={ziel === ""}
                title="Diesen und alle weiteren Bögen der Datei in den gewählten Abschnitt übernehmen"
                onClick={() => {
                  void (async () => {
                    const ausgang = await laden.uebernimmAlleScans(ziel);
                    if (ausgang !== undefined) setzeErgebnis(sammeltext(ausgang));
                  })();
                }}
              >
                Alle übernehmen ({String(wartend + 1)})
              </button>
            )}
            {wartend > 0 && (
              <button
                type="button"
                title="Diesen Bogen nicht übernehmen und den nächsten der Datei zeigen"
                onClick={() => {
                  setzeErgebnis(undefined);
                  void laden.ueberspringeScan();
                }}
              >
                Überspringen
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void laden.setzeScanZurueck();
              }}
            >
              Von vorn
            </button>
          </div>
        </div>
      )}

      {ergebnis !== undefined && (
        <p role="status" className="hinweistext">
          {ergebnis}
        </p>
      )}
    </section>
  );
}

/** „Teil 2 von 3" — der Satz aus der DoD von M3.4. */
export function fortschrittstext(stand: { art: string; haben: number; anzahl: number } | undefined): string {
  if (stand === undefined || stand.art === "leer") return "Noch nichts gescannt.";
  if (stand.art === "vollstaendig") {
    return stand.anzahl <= 1 ? "Bogen vollständig gelesen." : `Alle ${String(stand.anzahl)} Teile gelesen.`;
  }
  if (stand.art === "unlesbar" && stand.anzahl === 0) return "Noch nichts gescannt.";
  if (stand.anzahl === 0) return "Noch nichts gescannt.";
  return `Teil ${String(stand.haben)} von ${String(stand.anzahl)}`;
}

/** „Noch 3 weitere Bögen in der Datei." — steht hinter dem Fortschritt. */
export function wartendtext(wartend: number): string {
  return wartend === 1 ? "Noch ein weiterer Bogen in der Datei." : `Noch ${String(wartend)} weitere Bögen in der Datei.`;
}

/** „56 Bögen übernommen (560 Ereignisse). 1 abgewiesen: …" */
export function sammeltext(ausgang: Sammeluebernahme): string {
  const boegen = ausgang.uebernommen === 1 ? "1 Bogen" : `${String(ausgang.uebernommen)} Bögen`;
  const satz = `${boegen} übernommen (${String(ausgang.ereignisse)} Ereignisse).`;
  if (ausgang.fehlgeschlagen.length === 0) return satz;
  const gruende = ausgang.fehlgeschlagen.map((f) => `${f.bezeichnung}: ${f.meldung}`).join("; ");
  return `${satz} ${String(ausgang.fehlgeschlagen.length)} nicht übernommen — ${gruende}`;
}

function signaturtext(zustand: "unsigniert" | "gueltig" | "ungueltig"): string {
  switch (zustand) {
    case "gueltig":
      return "gültig";
    case "ungueltig":
      return "ungültig — der Bogen wird trotzdem aufgenommen";
    case "unsigniert":
      return "nicht signiert";
  }
}

interface FlacherKnoten {
  readonly id: string;
  readonly name: string;
  readonly kinder: readonly unknown[];
}

function flach(knoten: readonly FlacherKnoten[]): readonly FlacherKnoten[] {
  return knoten.flatMap((eintrag) => [eintrag, ...flach(eintrag.kinder as readonly FlacherKnoten[])]);
}
