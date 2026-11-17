/**
 * Druck des Nachrichtenvordrucks in „Dieser Arbeitsplatz" (KONZEPT-NACHRICHTEN.md
 * §7 und Entscheidung 7, Schnitt N3): das Blatt (A5 hoch oder zwei auf A4
 * quer) und der Automatikdruck.
 *
 * Der Automatikdruck braucht ein Ziel, sonst ist er aus: ein festes
 * Verzeichnis, in das die PDFs fallen, oder ein fest eingestellter Drucker.
 * Den Drucker gibt es nur in der Desktop-App (Electron druckt); im Browser
 * liegt das Verzeichnis auf dem Rechner des Dienstes, und die Maske sagt das.
 * „Probedruck" schickt den leeren Vordruck an das Ziel, das gerade dasteht —
 * auch vor „Übernehmen", damit ein falsches Ziel nicht erst gespeichert
 * werden muss, um es zu bemerken.
 *
 * Audit Fernmelder P2-11: Ein falsch getipptes Verzeichnis wurde still
 * angelegt. Der Probedruck meldet jetzt „Verzeichnis gibt es nicht“ und bietet
 * „Anlegen und Probedruck“ an; beim Übernehmen fragt `druckverzeichnisBestaetigt`
 * „Verzeichnis gibt es nicht, anlegen?“.
 */

import { useEffect, useState } from "react";

import type { Automatikdruckziel, Druckerangabe, Einstellungen, Probedruckergebnis, VordruckBlatt } from "../kontrakt/index.js";
import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";

export type Druckmodus = "aus" | "verzeichnis" | "drucker";

/** Die Felder der Maske, solange niemand „Übernehmen" gedrückt hat. */
export interface Druckwerte {
  readonly blatt: VordruckBlatt;
  readonly modus: Druckmodus;
  readonly pfad: string;
  readonly drucker: string;
}

/** Die Felder aus den gespeicherten Einstellungen; „aus" ohne Schalter oder ohne Ziel. */
export function druckwerteAus(e: Einstellungen): Druckwerte {
  const ziel = e.automatikdruck;
  return {
    blatt: e.vordruckBlatt ?? "a5",
    modus: e.automatikdruckAn === true && ziel !== undefined ? ziel.ziel : "aus",
    pfad: ziel?.ziel === "verzeichnis" ? ziel.pfad : "",
    drucker: ziel?.ziel === "drucker" ? ziel.name : "",
  };
}

/** Das Ziel, das die Felder beschreiben — auch bei „aus" das zuletzt eingetragene, damit es gemerkt bleibt. */
function zielAus(w: Druckwerte, bisher: Automatikdruckziel | undefined): Automatikdruckziel | undefined {
  if (w.modus === "verzeichnis") return { ziel: "verzeichnis", pfad: w.pfad.trim() };
  if (w.modus === "drucker") return { ziel: "drucker", name: w.drucker };
  if (w.pfad.trim() !== "") return { ziel: "verzeichnis", pfad: w.pfad.trim() };
  if (w.drucker !== "") return { ziel: "drucker", name: w.drucker };
  return bisher;
}

/**
 * Die Einstellungen aus den Feldern: an nur mit gewähltem und ausgefülltem
 * Ziel (Entscheidung 7). Vorbelegungen (A5, aus) werden nicht ungefragt
 * geschrieben — nur, was schon gespeichert war oder jemand gewählt hat.
 */
export function druckeinstellungenAus(w: Druckwerte, bisher: Einstellungen): Pick<Einstellungen, "vordruckBlatt" | "automatikdruck" | "automatikdruckAn"> {
  const ziel = zielAus(w, bisher.automatikdruck);
  const an = (w.modus === "verzeichnis" && w.pfad.trim() !== "") || (w.modus === "drucker" && w.drucker !== "");
  return {
    ...(bisher.vordruckBlatt === undefined && w.blatt === "a5" ? {} : { vordruckBlatt: w.blatt }),
    ...(ziel === undefined ? {} : { automatikdruck: ziel }),
    ...(bisher.automatikdruckAn === undefined && !an ? {} : { automatikdruckAn: an }),
  };
}

const MODI: readonly { readonly wert: Druckmodus; readonly titel: string }[] = [
  { wert: "aus", titel: "Aus" },
  { wert: "verzeichnis", titel: "Verzeichnis" },
  { wert: "drucker", titel: "Drucker" },
];

function useDruckerliste(aktiv: boolean): readonly Druckerangabe[] | string {
  const [liste, setzeListe] = useState<readonly Druckerangabe[] | string>("Drucker werden gesucht …");
  useEffect(() => {
    if (!aktiv) return;
    let gilt = true;
    rufe({ art: "druckerAuflisten" })
      .then((drucker) => gilt && setzeListe(drucker.length === 0 ? "Auf diesem Rechner ist kein Drucker eingerichtet." : drucker))
      .catch((fehler: unknown) => gilt && setzeListe(fehler instanceof Error ? fehler.message : String(fehler)));
    return () => {
      gilt = false;
    };
  }, [aktiv]);
  return liste;
}

/** Was nach einem Probedruck dasteht (FM P2-11: auch „Verzeichnis gibt es nicht“). */
export function probedrucktext(e: Probedruckergebnis): string {
  if (e.art === "verzeichnis") return `Probedruck geschrieben: ${e.pfad}`;
  if (e.art === "drucker") return `Probedruck an „${e.name}“ gegeben.`;
  return `Verzeichnis gibt es nicht: ${e.pfad}. Es wurde nichts angelegt.`;
}

function Probedruck({ werte }: { readonly werte: Druckwerte }): React.JSX.Element {
  const [ergebnis, setzeErgebnis] = useState<string | undefined>(undefined);
  const [fehlt, setzeFehlt] = useState(false);
  const ziel: Automatikdruckziel | undefined =
    werte.modus === "verzeichnis" && werte.pfad.trim() !== "" ? { ziel: "verzeichnis", pfad: werte.pfad.trim() } : werte.modus === "drucker" && werte.drucker !== "" ? { ziel: "drucker", name: werte.drucker } : undefined;
  const pruefe = (anlegen: boolean): void => {
    if (ziel === undefined) return;
    setzeErgebnis("Probedruck läuft …");
    setzeFehlt(false);
    rufe({ art: "probedruck", ziel, ...(anlegen ? { anlegen: true } : {}) })
      .then((e) => {
        setzeFehlt(e.art === "verzeichnisFehlt");
        setzeErgebnis(probedrucktext(e));
      })
      .catch((fehler: unknown) => setzeErgebnis(`Probedruck gescheitert: ${fehler instanceof Error ? fehler.message : String(fehler)}`));
  };
  return (
    <span className="probedruck">
      <button type="button" disabled={ziel === undefined} title={ziel === undefined ? "Erst ein Verzeichnis oder einen Drucker angeben" : "Den leeren Vordruck an dieses Ziel geben"} onClick={() => pruefe(false)}>
        Probedruck
      </button>
      {fehlt && (
        <button type="button" title="Das Verzeichnis anlegen und den Probedruck hineinschreiben" onClick={() => pruefe(true)}>
          Anlegen und Probedruck
        </button>
      )}
      {ergebnis !== undefined && (
        <span className={fehlt ? "hinweistext warn" : "hinweistext"} role="status">
          {ergebnis}
        </span>
      )}
    </span>
  );
}

/**
 * Vor dem Übernehmen (FM P2-11): Gibt es das Verzeichnis des Automatikdrucks?
 * Fehlt es, fragt `frage` „Verzeichnis gibt es nicht, anlegen?“; bei Ja wird
 * es angelegt, bei Nein nichts gespeichert (`false`), damit der Pfad
 * berichtigt werden kann. Ohne Verzeichnisziel oder bei Fehlern der Prüfung
 * geht das Speichern weiter — die Prüfung schützt, sie sperrt nicht.
 */
export async function druckverzeichnisBestaetigt(werte: Druckwerte, frage: (text: string) => boolean = (text) => globalThis.confirm(text)): Promise<boolean> {
  const pfad = werte.pfad.trim();
  if (werte.modus !== "verzeichnis" || pfad === "") return true;
  try {
    const pruefung = await rufe({ art: "verzeichnisPruefen", pfad });
    if (pruefung.vorhanden) return true;
    if (!frage(`Verzeichnis „${pfad}“ gibt es nicht, anlegen?`)) return false;
    const angelegt = await rufe({ art: "verzeichnisPruefen", pfad, anlegen: true });
    if (!angelegt.vorhanden) useLaden.getState().melde("warnung", `Das Verzeichnis „${pfad}“ ließ sich nicht anlegen.`);
    return angelegt.vorhanden;
  } catch {
    return true;
  }
}

function Verzeichnisfeld({ werte, setze }: { readonly werte: Druckwerte; readonly setze: (teil: Partial<Druckwerte>) => void }): React.JSX.Element {
  const waehlbar = useLaden((z) => z.umgebung?.ordnerWaehlen === true);
  const waehle = (): void => {
    rufe({ art: "ordnerWaehlen", titel: "Verzeichnis für den Automatikdruck" })
      .then((ordner) => ordner !== null && setze({ pfad: ordner }))
      .catch((fehler: unknown) => useLaden.getState().melde("warnung", fehler instanceof Error ? fehler.message : String(fehler)));
  };
  return (
    <label>
      Verzeichnis
      <span className="feldmitknopf">
        <input value={werte.pfad} onChange={(e) => setze({ pfad: e.target.value })} />
        {waehlbar && (
          <button type="button" onClick={waehle}>
            Wählen …
          </button>
        )}
      </span>
    </label>
  );
}

function Druckerwahl({ werte, setze }: { readonly werte: Druckwerte; readonly setze: (teil: Partial<Druckwerte>) => void }): React.JSX.Element {
  const liste = useDruckerliste(true);
  if (typeof liste === "string") return <p className="hinweistext">{liste}</p>;
  return (
    <label>
      Drucker
      <select value={werte.drucker} onChange={(e) => setze({ drucker: e.target.value })}>
        <option value="">— Drucker wählen —</option>
        {liste.map((d) => (
          <option key={d.name} value={d.name}>
            {d.anzeigename}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface DruckeinstellungenEigenschaften {
  readonly werte: Druckwerte;
  readonly aufAenderung: (werte: Druckwerte) => void;
}

export function Druckeinstellungen({ werte, aufAenderung }: DruckeinstellungenEigenschaften): React.JSX.Element {
  const kannDrucken = useLaden((z) => z.umgebung?.druckerDrucken === true);
  const imBrowser = useLaden((z) => z.umgebung?.plattform === "web");
  const setze = (teil: Partial<Druckwerte>): void => aufAenderung({ ...werte, ...teil });
  return (
    <fieldset className="druckeinstellungen" aria-label="Nachrichtenvordruck drucken">
      <legend>Nachrichtenvordruck</legend>
      <label>
        Blatt
        <select value={werte.blatt} onChange={(e) => setze({ blatt: e.target.value as VordruckBlatt })}>
          <option value="a5">A5 hoch, ein Vordruck je Blatt</option>
          <option value="a4quer">A4 quer, zwei Vordrucke nebeneinander</option>
        </select>
      </label>
      <div className="umschalter" role="radiogroup" aria-label="Automatikdruck">
        <span className="lbl">Automatikdruck</span>
        {MODI.map((m) => (
          <label key={m.wert} className="kaestchen">
            <input type="radio" name="automatikdruck" checked={werte.modus === m.wert} disabled={m.wert === "drucker" && !kannDrucken} onChange={() => setze({ modus: m.wert })} />
            {m.titel}
          </label>
        ))}
      </div>
      {werte.modus === "verzeichnis" && <Verzeichnisfeld werte={werte} setze={setze} />}
      {werte.modus === "drucker" && kannDrucken && <Druckerwahl werte={werte} setze={setze} />}
      {werte.modus !== "aus" && <Probedruck werte={werte} />}
      <p className="hinweistext">
        Jede Nachricht, die für eine Stelle dieses Arbeitsplatzes eintrifft, geht als Vordruck an das Ziel. Ohne Ziel ist der Automatikdruck aus.
        {!kannDrucken && (imBrowser ? " Im Browser gibt es nur das Verzeichnis; es liegt auf dem Rechner des Dienstes." : " Einen Drucker gibt es nur in der Desktop-App.")}
      </p>
    </fieldset>
  );
}
