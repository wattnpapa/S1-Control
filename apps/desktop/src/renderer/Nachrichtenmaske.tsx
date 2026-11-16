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
 * Ereignis; beim Verlassen der Seite warnt der Browser (`entwurf.ts`).
 *
 * Schnitt N2: Nimmt die FmZ einen Eingang auf, ist der obere Teil frei
 * (Aufnahmevermerk, Gegenstelle, Nummer), und „Aufnehmen" schreibt die
 * Nummer als Folgeschritt mit. Das Kästchen Gesprächsnotiz macht die
 * Nachricht zum Eingang ohne Beförderung; ihr Verfasser verteilt sie selbst
 * oder schickt sie an den Sichter. Steht kein Sichter in der Präsenz, zeigt
 * die Maske den Laufzettel mit, und die Sichtung geht im selben Zug mit
 * (§5 „Ersatzsichter").
 * Vorrang ist nicht vorbelegt: Die Lehrunterlage mahnt, ihn restriktiv zu nutzen.
 *
 * Schnitt N3 (Entscheidung 4): Unter dem Vordruck steht die „Vorschau", der
 * Vordruck, wie er gedruckt wird — zugeklappt, bis jemand sie aufklappt.
 */

import { useEffect, useState } from "react";

import { NACHRICHT_MITTEL, projektion } from "@s1/domaene";

import { nachrichtAufnehmen, sichterBesetzt } from "../kontrakt/fmzschritte.js";
import { nachrichtenentwurfFehler } from "../kontrakt/nachrichtenschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { merkeOffeneEingabe } from "./entwurf.js";
import { aufnahmeAus, aufnahmefehler, aufnahmeVorlage, folgeAus, nachweisAus, type Aufnahmewerte } from "./fmzformate.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import { ZEILEN_VORDRUCK, anlageAus, entwurfAus, inhaltszeilen, maskenfehler, stellenname, type Maskenwerte } from "./nachrichtenformate.js";
import { Aufnahmeteil, Verteilschalter, Verteilteil, sichtungAus, verteilVorlage, type Verteilwerte } from "./Vordruckeingabe.js";
import { FmzTeil, LaufzettelAnzeige } from "./Vordruckteile.js";
import { Vordruckvorschau } from "./Vordruckvorschau.js";

export interface NachrichtenmaskeEigenschaften {
  readonly titel?: string;
  readonly vorlage: Maskenwerte;
  /** Abschnitte und Einheiten des Einsatzes, aus der Ansicht des Blattes. */
  readonly anschriften: readonly string[];
  /** Additiv (N2): gesetzt, wenn die FmZ einen Eingang aufnimmt — schaltet den oberen Teil frei. */
  readonly aufnahme?: Aufnahmeumfeld;
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

/**
 * Was die Maske über Aufnahme und Verteilung weiß (Schnitt N2): `aufnahme`
 * schaltet den oberen Teil frei (die FmZ nimmt einen Eingang auf), die
 * Nummern belegen ihn vor und warnen vor einer doppelten.
 */
export interface Aufnahmeumfeld {
  readonly naechsteNummer?: number | undefined;
  readonly vergebeneNummern?: readonly number[] | undefined;
}

/** Der Grund über dem Laufzettel der Maske — oder `undefined`, wenn hier nicht verteilt wird (§5). */
export function verteilgrund(aufnahme: boolean, gespraechsnotiz: boolean, selbst: boolean, sichterDa: boolean): string | undefined {
  if (gespraechsnotiz && (selbst || !sichterDa)) {
    return sichterDa ? "Gesprächsnotiz: Der Verfasser bestimmt die Stellen, die Kenntnis bekommen (S2 rot vorbelegt)." : "Kein Sichter besetzt: Die Gesprächsnotiz wird beim Aufgeben verteilt.";
  }
  if (aufnahme && !gespraechsnotiz && !sichterDa) return "Kein Sichter besetzt: Die Nachricht wird beim Aufnehmen verteilt (S2 rot vorbelegt).";
  return undefined;
}

export function Nachrichtenmaske({ titel = "Nachricht verfassen", vorlage, anschriften, aufnahme, aufSchliessen }: NachrichtenmaskeEigenschaften): React.JSX.Element {
  const [werte, setzeWerte] = useState<Maskenwerte>(vorlage);
  const sitzung = useLaden((z) => z.lagebild?.sitzung);
  const [aufnahmewerte, setzeAufnahmewerte] = useState<Aufnahmewerte>(() => aufnahmeVorlage(sitzung, aufnahme?.naechsteNummer));
  const [verteilwerte, setzeVerteilwerte] = useState<Verteilwerte>(() => verteilVorlage(sitzung?.handzeichen ?? ""));
  const [selbst, setzeSelbst] = useState(true);
  const versuch = useAnlegeversuch();
  const peers = useLaden((z) => z.lagebild?.peers);
  const setze: Setze = (feld, wert) => setzeWerte((bisher) => ({ ...bisher, [feld]: wert }));
  const geaendert = JSON.stringify(werte) !== JSON.stringify(vorlage);
  const fmz = aufnahme !== undefined && werte.richtung === "EINGANG";
  const sichterDa = sichterBesetzt(sitzung?.stellen, peers ?? []);
  const grund = verteilgrund(fmz, werte.gespraechsnotiz, selbst, sichterDa);
  const sichtung = grund === undefined ? undefined : sichtungAus(verteilwerte);
  const fehler = [
    ...maskenfehler(werte),
    ...(fmz ? aufnahmefehler(aufnahmewerte) : []),
    ...(grund !== undefined && sichtung === undefined ? ["Quittung und Handzeichen im Laufzettel eintragen"] : []),
  ];

  useEffect(() => {
    merkeOffeneEingabe("nachricht", geaendert);
    return () => merkeOffeneEingabe("nachricht", false);
  }, [geaendert]);

  async function aufgeben(): Promise<void> {
    const nachrichtId = versuch.kennung(() => neueId("N"));
    const anlage = anlageAus(werte, nachrichtId);
    const vermerk = fmz ? aufnahmeAus(aufnahmewerte) : undefined;
    const gegenstelle = aufnahmewerte.gegenstelle.trim();
    const mitAufnahme = vermerk === undefined ? anlage : { ...anlage, aufnahme: vermerk, ...(gegenstelle === "" ? {} : { gegenstelle }) };
    const entwurf = nachrichtAufnehmen(mitAufnahme, folgeAus(fmz ? nachweisAus(aufnahmewerte) : undefined, sichtung));
    const ungueltig = nachrichtenentwurfFehler(entwurf);
    if (ungueltig !== undefined) {
      useLaden.getState().melde("warnung", ungueltig);
      return;
    }
    const ergebnis = await versuch.schreibe(entwurf);
    if (ergebnis?.art !== "geschrieben") return;
    for (const satz of ergebnis.warnungen ?? []) useLaden.getState().melde("info", satz);
    aufSchliessen();
  }

  const alleAnschriften = [...new Set([...besetzteStellen(peers ?? []), ...anschriften])];
  const entwurf = entwurfAus(werte, {
    ...(fmz ? { aufnahme: aufnahmeAus(aufnahmewerte), gegenstelle: aufnahmewerte.gegenstelle.trim(), nummer: aufnahmewerte.nummer } : {}),
    sichtung,
  });
  return (
    <Maske
      titel={titel}
      bestaetigungstext={fmz ? "Aufnehmen" : "Aufgeben"}
      nurKnopf
      bereit={fehler.length === 0 && !versuch.gesperrt}
      bereitGrund={fehler[0] ?? versuch.sperre}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={aufgeben}
    >
      <div className="vordruck">
        {fmz ? <Aufnahmeteil werte={aufnahmewerte} aufAenderung={setzeAufnahmewerte} vergebeneNummern={aufnahme.vergebeneNummern} /> : <FmzTeil />}
        <Mittelteil werte={werte} setze={setze} anschriften={alleAnschriften} />
        {werte.gespraechsnotiz && <Verteilschalter selbst={selbst || !sichterDa} aufSelbst={setzeSelbst} sichterDa={sichterDa} />}
        {grund === undefined ? <LaufzettelAnzeige /> : <Verteilteil werte={verteilwerte} aufAenderung={setzeVerteilwerte} grund={grund} />}
      </div>
      <Vordruckvorschau ort="maske" quelle={{ art: "entwurf", entwurf }} />
      {versuch.anzeige}
    </Maske>
  );
}
