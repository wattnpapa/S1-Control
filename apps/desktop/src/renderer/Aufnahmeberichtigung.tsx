/**
 * „Aufnahme berichtigen“ in der Lese-Ansicht der Fernmeldezentrale (FM P2-7,
 * Runde 1: „Eingangsvermerke sind nach dem Speichern nicht korrigierbar“).
 *
 * Ein Zahlendreher in der Aufnahmezeit oder das falsche Mittel ließ sich bisher
 * nur durch Zurückziehen und Neuaufnahme beheben — die Nummer war dann doppelt
 * belegt. Jetzt berichtigt die FmZ Mittel, Zeit und Handzeichen der Aufnahme
 * (Feld 1, 2) mit dem Bedienschritt `aufnahmeBerichtigen`: mit dem Vorwert vom
 * Öffnen (Vorwert-Prüfung wie Annehmen und Befördern) und einem Pflichtgrund,
 * weil der Vermerk auf Papier schon stehen kann. Weist der Worker ab, weil ein
 * anderer Platz inzwischen berichtigt hat, steht der Satz in Worten da.
 */

import { useState } from "react";

import { datumZeitGruppe, hatFernmelderstelle, NACHRICHT_MITTEL, projektion, type Nachrichtenzeile } from "@s1/domaene";

import { aufnahmeBerichtigen } from "../kontrakt/fmzschritte.js";
import { nachrichtenentwurfFehler } from "../kontrakt/nachrichtenschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import { handzeichenPflicht, zeitAusEingabe } from "./nachrichtenformate.js";
import { istVorwertAbweisung, konflikttext } from "./Vorwertkonflikt.js";

export interface Berichtigungseingaben {
  readonly mittel: string;
  readonly zeit: string;
  readonly handzeichen: string;
  readonly grund: string;
}

/** Ob die Lese-Ansicht „Aufnahme berichtigen“ anbietet: ein aufgenommener, gültiger Eingang an einem Platz der FmZ. */
export function berichtigbar(zeile: Nachrichtenzeile, stellen: readonly string[], nurLesen: boolean): boolean {
  return !nurLesen && hatFernmelderstelle(stellen) && zeile.richtungKurz === "E" && zeile.aufnahme !== undefined && !zeile.zurueckgezogen;
}

/** Der Entwurf aus den Eingaben, oder der Satz, was fehlt. */
export function berichtigungsentwurf(zeile: Nachrichtenzeile, e: Berichtigungseingaben, jetzt: Date = new Date()) {
  const zeitpunkt = zeitAusEingabe(e.zeit, jetzt);
  if (zeitpunkt === undefined) return "Zeit der Aufnahme lesbar eintragen";
  const hz = handzeichenPflicht(e.handzeichen);
  if (hz !== undefined) return hz;
  if (e.grund.trim() === "") return "Grund der Berichtigung eintragen";
  return aufnahmeBerichtigen(zeile.id, zeile.aufnahme ?? null, { mittel: e.mittel, zeitpunkt, handzeichen: e.handzeichen }, e.grund);
}

export function Aufnahmeberichtigung({ zeile, aufSchliessen }: { readonly zeile: Nachrichtenzeile; readonly aufSchliessen: () => void }): React.JSX.Element {
  const a = zeile.aufnahme;
  const [e, setzeE] = useState<Berichtigungseingaben>(() => ({ mittel: a?.mittel ?? "FUNK", zeit: a === undefined ? "" : datumZeitGruppe(a.zeitpunkt), handzeichen: a?.handzeichen ?? "", grund: "" }));
  const [konflikt, setzeKonflikt] = useState<string | undefined>(undefined);
  const peers = useLaden((z) => z.lagebild?.peers);
  const versuch = useAnlegeversuch();
  const entwurf = berichtigungsentwurf(zeile, e);
  const setze = (feld: keyof Berichtigungseingaben) => (wert: string): void => setzeE((bisher) => ({ ...bisher, [feld]: wert }));

  async function schreibe(): Promise<void> {
    if (typeof entwurf === "string") return;
    const ungueltig = nachrichtenentwurfFehler(entwurf);
    if (ungueltig !== undefined) {
      useLaden.getState().melde("warnung", ungueltig);
      return;
    }
    const ergebnis = await versuch.schreibe(entwurf);
    if (istVorwertAbweisung(ergebnis)) {
      setzeKonflikt(konflikttext(entwurf.typ, ergebnis.meldung, peers ?? []));
      return;
    }
    if (ergebnis?.art === "geschrieben") aufSchliessen();
  }

  return (
    <Maske
      titel="Aufnahme berichtigen"
      bestaetigungstext="Berichtigen"
      nurKnopf
      bereit={typeof entwurf !== "string" && !versuch.gesperrt}
      bereitGrund={typeof entwurf === "string" ? entwurf : versuch.sperre}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={schreibe}
    >
      <p className="hinweistext">Mittel, Zeit und Handzeichen der Aufnahme neu; der alte Vermerk bleibt mit dem Grund im Tagebuch.</p>
      <div className="vordruckzeile">
        <label>
          Mittel
          <select value={e.mittel} onChange={(ev) => setze("mittel")(ev.target.value)}>
            {NACHRICHT_MITTEL.map((m) => (
              <option key={m} value={m}>
                {projektion.mittelWort(m)}
              </option>
            ))}
          </select>
        </label>
        <Dtgfeld beschriftung="Aufnahme" wert={e.zeit} aufAenderung={setze("zeit")} />
        <label>
          Handzeichen
          <input value={e.handzeichen} maxLength={4} onChange={(ev) => setze("handzeichen")(ev.target.value)} />
        </label>
      </div>
      <label>
        Grund
        <input value={e.grund} placeholder="z. B. Zahlendreher in der Uhrzeit" onChange={(ev) => setze("grund")(ev.target.value)} />
      </label>
      {konflikt === undefined ? versuch.anzeige : <p className="warnung" role="alert">{konflikt}</p>}
    </Maske>
  );
}
