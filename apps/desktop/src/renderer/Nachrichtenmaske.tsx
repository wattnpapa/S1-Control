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
 *
 * Nachzug der zweiten Runde (2026-11-18):
 * - Zustände in `useMaskenteile.ts`, der Entwurf in `maskenentwurf.ts`,
 *   die sichtbaren Sätze in `Maskenzusatz.tsx` (Strukturgrenze).
 * - „Abbrechen“ stellt den Entwurf zurück, „Verwerfen“ löscht ihn nach
 *   Rückfrage (R2-FaBe P3-4, R2-SGL P3-2); Rückfragen stehen im festen Fuß
 *   (R2-SGL P3-1).
 * - Rückfragen mit zweitem Klick (`maskenrueckfragen.ts`): Abfassungszeit
 *   weit weg (R2-FaBe P2-5), Aufnahme ohne Nummer (R2-LdF P1-2 alt),
 *   Nummernsprung (R2-LdF P2-7); keine Nummer vorbelegt im Nachtrag
 *   (R2-SGL P2-1, R2-LdF P3-7).
 * - Aufnahme: Gegenstelle ist Pflicht (außer im Nachtrag vom Blatt), und
 *   Enter in einem Feld speichert erst mit Betreff, Inhalt und Gegenstelle
 *   (R2-FM P2-3).
 * - Antwort und Gesprächsnotiz sagen sichtbar, was sie sind (R2-FaBe P1-3,
 *   P1-5); Anschrift und Absender mit Bezug zur Lage (R2-ETB P2-6).
 */

import { useEffect, useState } from "react";

import type { Gegenstelle } from "../kontrakt/index.js";

import { sichterBesetzt } from "../kontrakt/fmzschritte.js";
import { nachrichtenentwurfFehler } from "../kontrakt/nachrichtenschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { doppelterAusgangText } from "./doppelterAusgang.js";
import { merkeOffeneEingabe } from "./entwurf.js";
import { aufnahmeAus, aufnahmefehler, nummerAusEingabe } from "./fmzformate.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import { aufgabeAus } from "./maskenentwurf.js";
import { abfassungsfrage, nummernsprungFrage, ohneNummerFrage, useRueckfragen } from "./maskenrueckfragen.js";
import { Entwurfszeile, Maskenhinweis, Verteilerklaerung } from "./Maskenzusatz.js";
import { bezugsziele } from "./nachrichtenbezug.js";
import { entwurfAus, maskenfehler, richtungAus, stellenname, type Maskenwerte } from "./nachrichtenformate.js";
import { TEXT_FMZ_NICHT_BESETZT, fmzBesetzt } from "./Nachrichtenkopf.js";
import { Mittelteil, type Setze } from "./Nachrichtenmittelteil.js";
import { Nachtragsschalter, Nachtragsteil, PLATZHALTER_VOM_BLATT, nachtragFolge, nachtragfehler } from "./Papiernachtrag.js";
import { brauchtGrund, useStellenvorbehalt } from "./Stellenvorbehalt.js";
import { useMaskenteile } from "./useMaskenteile.js";
import { Aufnahmeteil, Verteilschalter, Verteilteil, sichtungAus } from "./Vordruckeingabe.js";
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
  /** Additiv (R2-FaBe P3-4): unter diesem Schlüssel stellt „Abbrechen“ den Entwurf zurück. */
  readonly entwurfsschluessel?: string | undefined;
  /** Additiv (R2-ETB P2-6): die Einheiten der Lage mit Kennung, für den Bezug von Anschrift und Absender. */
  readonly gegenstellen?: readonly Gegenstelle[] | undefined;
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

/** Aufnahme: Enter in einem Feld schreibt erst mit Betreff, Inhalt und Gegenstelle (R2-FM P2-3). */
export function enterBereitBeiAufnahme(werte: Pick<Maskenwerte, "betreff" | "inhalt">, gegenstelle: string): boolean {
  return werte.betreff.trim() !== "" && werte.inhalt.trim() !== "" && gegenstelle.trim() !== "";
}

/** Was die Maske über Lage, Sitzung und Präsenz liest — die Ziele des Bezugs und ob ein Sichter da ist. */
function useMaskenumfeld(gegenstellen: readonly Gegenstelle[] | undefined) {
  const sitzung = useLaden((z) => z.lagebild?.sitzung);
  const peers = useLaden((z) => z.lagebild?.peers);
  const baum = useLaden((z) => z.baum?.baum);
  return {
    peers: peers ?? [],
    sichterDa: sichterBesetzt(sitzung?.stellen, peers ?? []),
    ziele: bezugsziele(gegenstellen ?? [], baum ?? []),
  };
}

/** Was die Lage der Maske festlegt und was vor dem Schreiben fehlt oder zu fragen ist. */
function useMaskenpruefung(t: ReturnType<typeof useMaskenteile>, aufnahme: Aufnahmeumfeld | undefined, sichterDa: boolean) {
  const { werte, aufnahmewerte, verteilung, nachtrag, nachtragswerte, selbst } = t;
  const fmz = aufnahme !== undefined && werte.richtung === "EINGANG";
  const grund = verteilgrund(fmz, werte.gespraechsnotiz, selbst, sichterDa);
  const sichtung = grund === undefined ? undefined : sichtungAus(verteilung);
  // Ein Ausgang vom Blatt trägt Annahme, Beförderung und Nummer gleich mit (Fernmelder P2-9).
  const ausgangVomBlatt = nachtrag && !fmz && richtungAus(werte) === "AUSGANG";
  // R2-FM P3-2, R2-SGL P1-2 (Entscheidung 13): Aufnahme und Nachtrag mit FmZ-Teil sind der FmZ vorbehalten.
  // Der Nachtrag nur, wenn er Werte der FmZ trägt (Annahme, Beförderung, Nummer) — wie `hatFmzWerte` im Worker.
  const nachtragMitFmz = ausgangVomBlatt && Object.keys(nachtragFolge(nachtragswerte)).length > 0;
  const vorbehalt = useStellenvorbehalt(fmz ? "aufnahme" : "nachtrag", fmz || nachtragMitFmz);
  const fehler = [
    ...maskenfehler(werte),
    ...(ausgangVomBlatt ? nachtragfehler(nachtragswerte) : []),
    ...(fmz ? aufnahmefehler(aufnahmewerte) : []),
    // R2-FM P2-3: Wer den Spruch gegeben hat, gehört in den Aufnahmevermerk; vom Blatt gilt, was dort steht.
    ...(fmz && !nachtrag && aufnahmewerte.gegenstelle.trim() === "" ? ["Gegenstelle (Rufname) eintragen"] : []),
    ...(grund !== undefined && sichtung === undefined ? ["Quittung und Handzeichen im Laufzettel eintragen"] : []),
  ];
  const nummer = fmz ? aufnahmewerte.nummer : ausgangVomBlatt ? nachtragswerte.nummer : "";
  const rueckfragen = useRueckfragen([
    abfassungsfrage(werte.abfassungszeit, nachtrag),
    fmz ? ohneNummerFrage(aufnahmewerte.nummer, nachtrag) : undefined,
    nummernsprungFrage(nummerAusEingabe(nummer), aufnahme?.naechsteNummer),
  ]);
  return { fmz, grund, sichtung, ausgangVomBlatt, vorbehalt, fehler, rueckfragen };
}

interface VordruckEigenschaften {
  readonly t: ReturnType<typeof useMaskenteile>;
  readonly p: ReturnType<typeof useMaskenpruefung>;
  readonly aufnahme: Aufnahmeumfeld | undefined;
  readonly umfeld: { readonly sichterDa: boolean; readonly anschriften: readonly string[]; readonly setze: Setze };
}

/** Die drei Teile des Vordrucks, je nach Lage: Aufnahme oder Nachtrag oben, Laufzettel unten. */
function Vordruck({ t, p, aufnahme, umfeld }: VordruckEigenschaften): React.JSX.Element {
  const { werte, nachtrag } = t;
  const platzhalter = nachtrag ? PLATZHALTER_VOM_BLATT : undefined;
  return (
    <div className="vordruck">
      {p.fmz ? (
        <Aufnahmeteil werte={t.aufnahmewerte} aufAenderung={t.aufAufnahme} vergebeneNummern={aufnahme?.vergebeneNummern} platzhalter={platzhalter} />
      ) : p.ausgangVomBlatt ? (
        <Nachtragsteil werte={t.nachtragswerte} aufAenderung={t.setzeNachtragswerte} vergebeneNummern={aufnahme?.vergebeneNummern} />
      ) : (
        <FmzTeil />
      )}
      <Mittelteil werte={werte} setze={umfeld.setze} anschriften={umfeld.anschriften} tabfolge={p.fmz} nachtrag={nachtrag} />
      {werte.gespraechsnotiz && (
        <>
          <Verteilschalter selbst={t.selbst || !umfeld.sichterDa} aufSelbst={t.setzeSelbst} sichterDa={umfeld.sichterDa} />
          <Verteilerklaerung selbst={t.selbst || !umfeld.sichterDa} />
        </>
      )}
      {p.grund === undefined ? (
        <LaufzettelAnzeige />
      ) : (
        <Verteilteil werte={t.verteilung} aufAenderung={t.aufVerteilung} grund={p.grund} anschrift={werte.anschrift} eigeneFuest={t.fuestName} platzhalter={platzhalter} tabfolge={p.fmz} />
      )}
    </div>
  );
}

export function Nachrichtenmaske({ titel = "Nachricht verfassen", vorlage, anschriften, aufnahme, aufSchliessen, entwurfsschluessel, gegenstellen }: NachrichtenmaskeEigenschaften): React.JSX.Element {
  const t = useMaskenteile(vorlage, aufnahme?.naechsteNummer, entwurfsschluessel);
  const { werte, aufnahmewerte, nachtrag, nachtragswerte } = t;
  const umfeld = useMaskenumfeld(gegenstellen);
  const p = useMaskenpruefung(t, aufnahme, umfeld.sichterDa);
  const { fmz, vorbehalt, fehler, rueckfragen } = p;
  const versuch = useAnlegeversuch();
  // SGL P3-20: die Rückfrage bei gleichem Ausgang; der zweite Klick gibt auf.
  const [doppelt, setzeDoppelt] = useState<string | undefined>(undefined);
  const setze: Setze = (feld, wert) => {
    setzeDoppelt(undefined);
    t.setzeWerte((bisher) => ({ ...bisher, [feld]: wert }));
  };

  useEffect(() => {
    merkeOffeneEingabe("nachricht", t.geaendert);
    return () => merkeOffeneEingabe("nachricht", false);
  }, [t.geaendert]);

  async function aufgeben(): Promise<void> {
    if (rueckfragen.halteAn()) return;
    const nachrichtId = versuch.kennung(() => neueId("N"));
    const akteId = useLaden.getState().akteId;
    if (richtungAus(werte) === "AUSGANG" && doppelt === undefined && akteId !== undefined) {
      const frage = await doppelterAusgangText(akteId, werte);
      if (frage !== undefined) {
        setzeDoppelt(frage);
        return;
      }
    }
    const entwurf = aufgabeAus({ nachrichtId, werte, aufnahmewerte, nachtragswerte, nachtrag, fmz, ausgangVomBlatt: p.ausgangVomBlatt, sichtung: p.sichtung, grund: vorbehalt.grund, ziele: umfeld.ziele });
    const ungueltig = nachrichtenentwurfFehler(entwurf);
    if (ungueltig !== undefined) {
      useLaden.getState().melde("warnung", ungueltig);
      return;
    }
    const ergebnis = await versuch.schreibe(entwurf);
    if (brauchtGrund(ergebnis)) vorbehalt.erzwinge();
    if (ergebnis?.art !== "geschrieben") return;
    t.vergiss();
    meldeNachAufgeben(ergebnis.warnungen, richtungAus(werte) === "AUSGANG" && !nachtrag);
    aufSchliessen();
  }

  const vorschau = entwurfAus(werte, {
    ...(fmz ? { aufnahme: aufnahmeAus(aufnahmewerte), gegenstelle: aufnahmewerte.gegenstelle.trim(), nummer: aufnahmewerte.nummer } : {}),
    sichtung: p.sichtung,
  });
  const frage = rueckfragen.sichtbar ?? (doppelt === undefined ? undefined : { frage: doppelt, knopf: "Trotzdem aufgeben" });
  const zurueckstellen = t.zurueckstellen;
  return (
    <Maske
      titel={titel}
      bestaetigungstext={frage?.knopf ?? (nachtrag ? "Nachtragen" : fmz ? "Aufnehmen" : "Aufgeben")}
      geaendert={t.geaendert}
      bereit={fehler.length === 0 && !versuch.gesperrt && !vorbehalt.gesperrt}
      bereitGrund={fehler[0] ?? versuch.sperre ?? (vorbehalt.gesperrt ? "Erst „Trotzdem“ wählen" : undefined)}
      aufAbbrechen={() => {
        t.vergiss();
        aufSchliessen();
      }}
      aufZurueckstellen={
        zurueckstellen === undefined
          ? undefined
          : () => {
              zurueckstellen();
              aufSchliessen();
            }
      }
      enterBereit={!fmz || enterBereitBeiAufnahme(werte, aufnahmewerte.gegenstelle)}
      fusszeile={frage === undefined ? undefined : <p className="warnung fussfrage" role="alert">{frage.frage}</p>}
      aufBestaetigen={aufgeben}
    >
      <Entwurfszeile zeit={t.wiederhergestellt} />
      <Nachtragsschalter an={nachtrag} aufAn={t.schalteNachtrag} />
      {vorbehalt.hinweis}
      <Maskenhinweis werte={werte} />
      <Vordruck t={t} p={p} aufnahme={aufnahme} umfeld={{ sichterDa: umfeld.sichterDa, anschriften: [...new Set([...besetzteStellen(umfeld.peers), ...anschriften])], setze }} />
      <Vordruckvorschau ort="maske" quelle={{ art: "entwurf", entwurf: vorschau }} />
      {versuch.anzeige}
    </Maske>
  );
}
