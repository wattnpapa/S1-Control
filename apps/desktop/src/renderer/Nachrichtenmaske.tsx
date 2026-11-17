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
 * Nach den Audits vom 2026-11-17:
 * - Enter in einem Feld und Strg+Enter überall (auch im Inhalt) bestätigen;
 *   der Knopf steht im festen Fuß der Maske, bei 860 Pixel Höhe sichtbar;
 *   die Aufnahme hat die Tabulatorfolge Mittel, Uhrzeit, Gegenstelle,
 *   Absender, Anschrift, Vorrang, Betreff, Inhalt, Aufnehmen (Fernmelder P1-2).
 * - Esc und „Abbrechen“ fragen nach, sobald etwas getippt ist; der Entwurf
 *   bleibt bis zum ausdrücklichen Verwerfen stehen (Fernmelder P1-3, SGL P1-5).
 * - Der Absender ist Pflicht (SGL P1-4).
 * - Beim Ersatzsichter und bei der Gesprächsnotiz ist die Anschrift als grüne
 *   Hauptempfängerkopie im Laufzettel vorbelegt, S2 rot, solange niemand den
 *   Verteiler selbst anfasst (SGL P1-3, Fernmelder P1-4).
 *
 * Additiv (Fernmelder P2-3, P2-9): Der Schalter „Vom Papier nachtragen“ leert
 * die Zeiten („vom Blatt“ statt „jetzt“) und zeigt bei einem Ausgang
 * Annahme, Beförderung und Nummer im selben Vordruck; „Nachtragen“ schreibt
 * sie in einem Zug (`Papiernachtrag.tsx`).
 *
 * Schnitt N3 (Entscheidung 4): Unter dem Vordruck steht die „Vorschau", der
 * Vordruck, wie er gedruckt wird — zugeklappt, bis jemand sie aufklappt.
 *
 * Zweite Runde (2026-11-17):
 * - Stellenvorbehalt (Entscheidung 13) auch bei „Eingang aufnehmen“ (R2-FM
 *   P3-2) und beim Papier-Nachtrag mit FmZ-Teil (R2-SGL P1-2): ohne Stelle
 *   FMZ der Hinweis mit „Trotzdem“, Bestätigen bis dahin gesperrt, der
 *   Entwurf trägt den `grund`; `brauchtGrund` des Workers öffnet ihn ebenso.
 *   Der Nachtrag trägt `nachrichtenfolge.nachtrag: true`.
 * - Der mittlere Teil steht in `Nachrichtenmittelteil.tsx` (Tabfolge der
 *   Aufnahme vollständig, Startfokus in der Anschrift, Tooltips).
 * - Nach dem Aufgeben bleiben die Warnungen des Workers im Hinweiskasten
 *   (R2-FaBe P0-3), `meldeNachAufgeben`.
 */

import { useEffect, useState } from "react";

import { datumZeitGruppe } from "@s1/domaene";

import type { Sitzungsstellen } from "../kontrakt/index.js";

import { nachrichtAufnehmen, sichterBesetzt } from "../kontrakt/fmzschritte.js";
import { nachrichtenentwurfFehler } from "../kontrakt/nachrichtenschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { doppelterAusgangText } from "./doppelterAusgang.js";
import { merkeOffeneEingabe } from "./entwurf.js";
import { aufnahmeAus, aufnahmefehler, aufnahmeVorlage, folgeAus, nachweisAus, type Aufnahmewerte } from "./fmzformate.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import { anlageAus, entwurfAus, maskenfehler, richtungAus, stellenname, type Maskenwerte } from "./nachrichtenformate.js";
import { TEXT_FMZ_NICHT_BESETZT, fmzBesetzt } from "./Nachrichtenkopf.js";
import { Mittelteil, type Setze } from "./Nachrichtenmittelteil.js";
import { Nachtragsschalter, Nachtragsteil, PLATZHALTER_VOM_BLATT, mitGrund, nachtragFolge, nachtragVorlage, nachtragfehler, type Nachtragswerte } from "./Papiernachtrag.js";
import { brauchtGrund, useStellenvorbehalt } from "./Stellenvorbehalt.js";
import { Aufnahmeteil, Verteilschalter, Verteilteil, sichtungAus, verteilVorlage, type Verteilwerte } from "./Vordruckeingabe.js";
import { verteilerAusAnschrift } from "./Verteilerraster.js";
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

/**
 * Aufnahmevermerk und Laufzettel der Maske, wie getippt. Bis jemand den
 * Verteiler anfasst, folgt er der Anschrift: S2 rot, die Anschrift grün
 * (SGL P1-3); `angefasst` zählt für die Rückfrage beim Verwerfen.
 */
function useTeilwerte(sitzung: Sitzungsstellen | undefined, naechsteNummer: number | undefined, anschrift: string) {
  const [aufnahmewerte, setzeAufnahmewerte] = useState<Aufnahmewerte>(() => aufnahmeVorlage(sitzung, naechsteNummer));
  const [verteilwerte, setzeVerteilwerte] = useState<Verteilwerte>(() => verteilVorlage(sitzung?.handzeichen ?? ""));
  const [verteilerAngefasst, setzeVerteilerAngefasst] = useState(false);
  const [aufnahmeAngefasst, setzeAufnahmeAngefasst] = useState(false);
  const fuestName = useLaden((z) => z.lagebild?.stammdaten?.fuestName);
  const verteilung: Verteilwerte = verteilerAngefasst ? verteilwerte : { ...verteilwerte, verteiler: verteilerAusAnschrift(anschrift, fuestName) };
  return {
    fuestName,
    /** Fernmelder P2-3: im Nachtrag Aufnahme und Quittung leer, sonst wieder „jetzt“; zählt nicht als getippt. */
    zeitenVomBlatt: (an: boolean): void => {
      const jetzt = an ? "" : datumZeitGruppe(new Date());
      setzeAufnahmewerte((w) => ({ ...w, zeit: jetzt }));
      setzeVerteilwerte((w) => ({ ...w, quittung: jetzt }));
    },
    aufnahmewerte,
    verteilung,
    angefasst: aufnahmeAngefasst || verteilerAngefasst,
    aufAufnahme: (neu: Aufnahmewerte): void => {
      setzeAufnahmeAngefasst(true);
      setzeAufnahmewerte(neu);
    },
    aufVerteilung: (neu: Verteilwerte): void => {
      if (neu.verteiler !== verteilung.verteiler) setzeVerteilerAngefasst(true);
      setzeVerteilwerte(neu);
    },
  };
}

/**
 * Nach dem Aufgeben (R2-FaBe P0-3): Die Warnungen des Workers (etwa „FmZ
 * nicht besetzt“) bleiben im Hinweiskasten stehen, bis jemand sie schließt —
 * die Maske selbst ist dann zu. Schweigt der Worker (älterer Stand), sagt die
 * Maske es für einen Ausgang selbst, wenn die Präsenz keine FmZ kennt.
 */
export function meldeNachAufgeben(warnungen: readonly string[] | undefined, ausgang: boolean): void {
  const { melde, lagebild } = useLaden.getState();
  for (const satz of warnungen ?? []) melde("warnung", satz);
  if ((warnungen ?? []).length === 0 && ausgang && !fmzBesetzt(lagebild)) melde("warnung", `Aufgegeben. ${TEXT_FMZ_NICHT_BESETZT}`);
}

export function Nachrichtenmaske({ titel = "Nachricht verfassen", vorlage, anschriften, aufnahme, aufSchliessen }: NachrichtenmaskeEigenschaften): React.JSX.Element {
  const [werte, setzeWerte] = useState<Maskenwerte>(vorlage);
  const sitzung = useLaden((z) => z.lagebild?.sitzung);
  const t = useTeilwerte(sitzung, aufnahme?.naechsteNummer, werte.anschrift);
  const { aufnahmewerte, verteilung } = t;
  const [selbst, setzeSelbst] = useState(true);
  const [nachtrag, setzeNachtrag] = useState(false);
  const [nachtragswerte, setzeNachtragswerte] = useState<Nachtragswerte>(() => nachtragVorlage());
  const versuch = useAnlegeversuch();
  const peers = useLaden((z) => z.lagebild?.peers);
  // SGL P3-20: die Rückfrage bei gleichem Ausgang; der zweite Klick gibt auf.
  const [doppelt, setzeDoppelt] = useState<string | undefined>(undefined);
  const setze: Setze = (feld, wert) => {
    setzeDoppelt(undefined);
    setzeWerte((bisher) => ({ ...bisher, [feld]: wert }));
  };
  const geaendert = JSON.stringify(werte) !== JSON.stringify(vorlage) || t.angefasst || JSON.stringify(nachtragswerte) !== JSON.stringify(nachtragVorlage());
  const fmz = aufnahme !== undefined && werte.richtung === "EINGANG";
  const sichterDa = sichterBesetzt(sitzung?.stellen, peers ?? []);
  const grund = verteilgrund(fmz, werte.gespraechsnotiz, selbst, sichterDa);
  const sichtung = grund === undefined ? undefined : sichtungAus(verteilung);
  // Ein Ausgang vom Blatt trägt Annahme, Beförderung und Nummer gleich mit (Fernmelder P2-9).
  const ausgangVomBlatt = nachtrag && !fmz && richtungAus(werte) === "AUSGANG";
  // R2-FM P3-2, R2-SGL P1-2 (Entscheidung 13): Aufnahme und Nachtrag mit FmZ-Teil sind der FmZ vorbehalten.
  // Der Nachtrag nur, wenn er Werte der FmZ trägt (Annahme, Beförderung, Nummer) — wie `hatFmzWerte` im Worker.
  const nachtragMitFmz = ausgangVomBlatt && Object.keys(nachtragFolge(nachtragswerte)).length > 0;
  const vorbehalt = useStellenvorbehalt(fmz ? "aufnahme" : "nachtrag", fmz || nachtragMitFmz);
  const schalteNachtrag = (an: boolean): void => {
    setzeNachtrag(an);
    setze("abfassungszeit", an ? "" : vorlage.abfassungszeit);
    t.zeitenVomBlatt(an);
  };
  const fehler = [
    ...maskenfehler(werte),
    ...(ausgangVomBlatt ? nachtragfehler(nachtragswerte) : []),
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
    const akteId = useLaden.getState().akteId;
    if (anlage.richtung === "AUSGANG" && doppelt === undefined && akteId !== undefined) {
      const frage = await doppelterAusgangText(akteId, werte);
      if (frage !== undefined) {
        setzeDoppelt(frage);
        return;
      }
    }
    const vermerk = fmz ? aufnahmeAus(aufnahmewerte) : undefined;
    const gegenstelle = aufnahmewerte.gegenstelle.trim();
    const mitAufnahme = vermerk === undefined ? anlage : { ...anlage, aufnahme: vermerk, ...(gegenstelle === "" ? {} : { gegenstelle }) };
    // Vom Blatt nachgetragen: Annahme, Beförderung und Nummer sind Folgewerte
    // der Anlage, ein Bedienschritt statt zwei (Fernmelder P2-9).
    const nachweis = fmz ? nachweisAus(aufnahmewerte) : undefined;
    // R2-SGL P1-2: `nachtrag: true` kennzeichnet den Papier-Nachtrag für Tagebuch und Akte.
    const folge = { ...folgeAus(nachweis, sichtung), ...(ausgangVomBlatt ? nachtragFolge(nachtragswerte) : {}), ...(nachtrag ? { nachtrag: true } : {}) };
    const entwurf = mitGrund(nachrichtAufnehmen(mitAufnahme, folge), vorbehalt.grund);
    const ungueltig = nachrichtenentwurfFehler(entwurf);
    if (ungueltig !== undefined) {
      useLaden.getState().melde("warnung", ungueltig);
      return;
    }
    const ergebnis = await versuch.schreibe(entwurf);
    if (brauchtGrund(ergebnis)) vorbehalt.erzwinge();
    if (ergebnis?.art !== "geschrieben") return;
    meldeNachAufgeben(ergebnis.warnungen, anlage.richtung === "AUSGANG" && !nachtrag);
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
      bestaetigungstext={doppelt !== undefined ? "Trotzdem aufgeben" : nachtrag ? "Nachtragen" : fmz ? "Aufnehmen" : "Aufgeben"}
      geaendert={geaendert}
      bereit={fehler.length === 0 && !versuch.gesperrt && !vorbehalt.gesperrt}
      bereitGrund={fehler[0] ?? versuch.sperre ?? (vorbehalt.gesperrt ? "Erst „Trotzdem“ wählen" : undefined)}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={aufgeben}
    >
      <Nachtragsschalter an={nachtrag} aufAn={schalteNachtrag} />
      {vorbehalt.hinweis}
      <div className="vordruck">
        {fmz ? (
          <Aufnahmeteil werte={aufnahmewerte} aufAenderung={t.aufAufnahme} vergebeneNummern={aufnahme.vergebeneNummern} platzhalter={nachtrag ? PLATZHALTER_VOM_BLATT : undefined} />
        ) : ausgangVomBlatt ? <Nachtragsteil werte={nachtragswerte} aufAenderung={setzeNachtragswerte} vergebeneNummern={aufnahme?.vergebeneNummern} /> : <FmzTeil />}
        <Mittelteil werte={werte} setze={setze} anschriften={alleAnschriften} tabfolge={fmz} nachtrag={nachtrag} />
        {werte.gespraechsnotiz && <Verteilschalter selbst={selbst || !sichterDa} aufSelbst={setzeSelbst} sichterDa={sichterDa} />}
        {grund === undefined ? (
          <LaufzettelAnzeige />
        ) : (
          <Verteilteil werte={verteilung} aufAenderung={t.aufVerteilung} grund={grund} anschrift={werte.anschrift} eigeneFuest={t.fuestName} platzhalter={nachtrag ? PLATZHALTER_VOM_BLATT : undefined} tabfolge={fmz} />
        )}
      </div>
      <Vordruckvorschau ort="maske" quelle={{ art: "entwurf", entwurf }} />
      {doppelt !== undefined && (
        <p className="warnung" role="alert">
          {doppelt}
        </p>
      )}
      {versuch.anzeige}
    </Maske>
  );
}
