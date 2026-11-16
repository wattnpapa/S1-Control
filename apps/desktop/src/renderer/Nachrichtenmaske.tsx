/**
 * Die Maske „Nachricht verfassen" — der Vordruck selbst, nicht ein Formular
 * mit zwanzig Feldern untereinander (KONZEPT-NACHRICHTEN.md §6).
 *
 * Drei Teile in der Anordnung des Blattes: oben grau die Vermerke der FmZ,
 * in der Mitte die Nachricht mit der Kästchenzeile (Übermittlungswunsch,
 * Spruch oder Durchsage, Sofort oder Blitz), Anschrift und Ruf-Nr., Betreff,
 * zwölf Zeilen Inhalt, Absender, Abfassungszeit, Zeichen und Funktion; unten
 * grau der Laufzettel, den erst der Sichter füllt.
 *
 * Die Anschrift bietet Abschnitte, Einheiten und die besetzten Stellen der
 * Präsenz an und lässt Freitext zu — die Gegenstelle draußen steht in keiner
 * Liste. Absender, Zeichen und Funktion sind aus Stelle und Handzeichen der
 * Sitzung vorbelegt, die Abfassungszeit mit „jetzt" als Datum-Zeit-Gruppe.
 * Der Inhalt zählt die Zeilen gegen die zwölf des Vordrucks und sagt ab der
 * dreizehnten, dass der Ausdruck ein Folgeblatt bekommt; gekürzt wird nichts.
 *
 * Bis „Aufgeben" ist die Maske ein Entwurf dieses Fensters (§5), kein
 * Ereignis; beim Verlassen der Seite warnt der Browser (`entwurf.ts`). Die
 * Richtung ist in N1 immer Ausgang; den Eingang nimmt die FmZ auf (N2).
 * Vorrang ist nicht vorbelegt: Die Lehrunterlage mahnt, ihn restriktiv zu nutzen.
 */

import { useEffect, useState } from "react";

import { NACHRICHT_MITTEL, projektion } from "@s1/domaene";

import { nachrichtenentwurfFehler, nachrichtVerfassen } from "../kontrakt/nachrichtenschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { merkeOffeneEingabe } from "./entwurf.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import { ZEILEN_VORDRUCK, anlageAus, inhaltszeilen, maskenfehler, stellenname, type Maskenwerte } from "./nachrichtenformate.js";
import { FmzTeil, LaufzettelAnzeige } from "./Vordruckteile.js";

export interface NachrichtenmaskeEigenschaften {
  readonly titel?: string;
  readonly vorlage: Maskenwerte;
  /** Abschnitte und Einheiten des Einsatzes, aus der Ansicht des Blattes. */
  readonly anschriften: readonly string[];
  readonly aufSchliessen: () => void;
}

/** Die besetzten Stellen der Präsenz als Wörter — lebende Arbeitsplätze, ohne Doppelte. */
export function besetzteStellen(peers: readonly { readonly veraltet: boolean; readonly stellen?: readonly string[] | undefined }[]): readonly string[] {
  return [...new Set(peers.filter((p) => !p.veraltet).flatMap((p) => p.stellen ?? []).map(stellenname))];
}

type Setze = <K extends keyof Maskenwerte>(feld: K, wert: Maskenwerte[K]) => void;

function Kaestchenzeile({ werte, setze }: { readonly werte: Maskenwerte; readonly setze: Setze }): React.JSX.Element {
  const vorrang = (stufe: "SOFORT" | "BLITZ"): React.JSX.Element => (
    <label className="kaestchen">
      <input type="checkbox" checked={werte.vorrang === stufe} onChange={(e) => setze("vorrang", e.target.checked ? stufe : "")} />
      {stufe === "SOFORT" ? "Sofort" : "Blitz"}
    </label>
  );
  return (
    <div className="kaestchenzeile" role="group" aria-label="Übermittlungswunsch, Art und Vorrang">
      <label>
        Übermittlungswunsch
        <select value={werte.uebermittlungswunsch} onChange={(e) => setze("uebermittlungswunsch", e.target.value)}>
          <option value="">—</option>
          {NACHRICHT_MITTEL.map((m) => (
            <option key={m} value={m}>
              {projektion.mittelWort(m)}
            </option>
          ))}
        </select>
      </label>
      {(["SPRUCH", "DURCHSAGE"] as const).map((art) => (
        <label key={art} className="kaestchen">
          <input type="checkbox" checked={werte.art === art} onChange={(e) => setze("art", e.target.checked ? art : "")} />
          {art === "SPRUCH" ? "Spruch" : "Durchsage"}
        </label>
      ))}
      {vorrang("SOFORT")}
      {vorrang("BLITZ")}
      <label className="kaestchen">
        <input type="checkbox" checked={werte.gespraechsnotiz} onChange={(e) => setze("gespraechsnotiz", e.target.checked)} />
        Gesprächsnotiz
      </label>
    </div>
  );
}

function Textfeld({ titel, feld, werte, setze, liste }: { readonly titel: string; readonly feld: "anschrift" | "rufnummer" | "betreff" | "absender" | "zeichen" | "funktion"; readonly werte: Maskenwerte; readonly setze: Setze; readonly liste?: string }): React.JSX.Element {
  return (
    <label>
      {titel}
      <input value={werte[feld]} list={liste} onChange={(e) => setze(feld, e.target.value)} />
    </label>
  );
}

function Inhaltsfeld({ werte, setze }: { readonly werte: Maskenwerte; readonly setze: Setze }): React.JSX.Element {
  const zeilen = inhaltszeilen(werte.inhalt);
  const ueber = zeilen > ZEILEN_VORDRUCK;
  return (
    <div className="vordruckinhalt">
      <label>
        Inhalt
        <textarea rows={ZEILEN_VORDRUCK} value={werte.inhalt} onChange={(e) => setze("inhalt", e.target.value)} />
      </label>
      <span className={ueber ? "zeilenzaehler warn" : "zeilenzaehler"} role="status">
        {zeilen} von {ZEILEN_VORDRUCK} Zeilen
        {ueber && " – der Ausdruck bekommt ein Folgeblatt; gekürzt wird nichts."}
      </span>
    </div>
  );
}

function Mittelteil({ werte, setze, anschriften }: { readonly werte: Maskenwerte; readonly setze: Setze; readonly anschriften: readonly string[] }): React.JSX.Element {
  return (
    <fieldset className="vordruckteil" aria-label="Nachricht">
      <legend>Nachricht</legend>
      <Kaestchenzeile werte={werte} setze={setze} />
      <div className="vordruckzeile">
        <Textfeld titel="Anschrift" feld="anschrift" werte={werte} setze={setze} liste="nachrichtenanschriften" />
        <Textfeld titel="Ruf-Nr." feld="rufnummer" werte={werte} setze={setze} />
      </div>
      <datalist id="nachrichtenanschriften">
        {anschriften.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <Textfeld titel="Betreff" feld="betreff" werte={werte} setze={setze} />
      <Inhaltsfeld werte={werte} setze={setze} />
      <div className="vordruckzeile">
        <Textfeld titel="Absender" feld="absender" werte={werte} setze={setze} liste="nachrichtenanschriften" />
        <Dtgfeld beschriftung="Abfassungszeit" wert={werte.abfassungszeit} aufAenderung={(wert) => setze("abfassungszeit", wert)} />
      </div>
      <div className="vordruckzeile">
        <Textfeld titel="Zeichen" feld="zeichen" werte={werte} setze={setze} />
        <Textfeld titel="Funktion" feld="funktion" werte={werte} setze={setze} />
      </div>
    </fieldset>
  );
}

export function Nachrichtenmaske({ titel = "Nachricht verfassen", vorlage, anschriften, aufSchliessen }: NachrichtenmaskeEigenschaften): React.JSX.Element {
  const [werte, setzeWerte] = useState<Maskenwerte>(vorlage);
  const versuch = useAnlegeversuch();
  const peers = useLaden((z) => z.lagebild?.peers);
  const setze: Setze = (feld, wert) => setzeWerte((bisher) => ({ ...bisher, [feld]: wert }));
  const geaendert = JSON.stringify(werte) !== JSON.stringify(vorlage);
  const fehler = maskenfehler(werte);

  useEffect(() => {
    merkeOffeneEingabe("nachricht", geaendert);
    return () => merkeOffeneEingabe("nachricht", false);
  }, [geaendert]);

  async function aufgeben(): Promise<void> {
    const nachrichtId = versuch.kennung(() => neueId("N"));
    const entwurf = nachrichtVerfassen(anlageAus(werte, nachrichtId));
    const ungueltig = nachrichtenentwurfFehler(entwurf);
    if (ungueltig !== undefined) {
      useLaden.getState().melde("warnung", ungueltig);
      return;
    }
    const ergebnis = await versuch.schreibe(entwurf);
    if (ergebnis?.art === "geschrieben") aufSchliessen();
  }

  const alleAnschriften = [...new Set([...besetzteStellen(peers ?? []), ...anschriften])];
  return (
    <Maske
      titel={titel}
      bestaetigungstext="Aufgeben"
      nurKnopf
      bereit={fehler.length === 0 && !versuch.gesperrt}
      bereitGrund={fehler[0] ?? versuch.sperre}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={aufgeben}
    >
      <div className="vordruck">
        <FmzTeil />
        <Mittelteil werte={werte} setze={setze} anschriften={alleAnschriften} />
        <LaufzettelAnzeige />
      </div>
      {versuch.anzeige}
    </Maske>
  );
}
