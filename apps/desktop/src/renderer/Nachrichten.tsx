/**
 * Das Blatt „Nachrichten" (KONZEPT-NACHRICHTEN.md §6, Schnitt N1) — der
 * 4-fach-Vordruck in der Führungsstelle.
 *
 * Oben das Band mit den fünf Zahlen aus `Lagebild.nachrichten` (neu für meine
 * Stellen, vor der FmZ, vor dem Sichter, mit Vorrang offen, über der
 * Schwelle; die letzten beiden bernstein ab eins). Darunter die Werkzeugzeile:
 * Umschalter der Sichten Posteingang, Ausgang und Sichter, der Hauptknopf
 * „Nachricht verfassen" (Strg+N) und die Suche über Betreff, Inhalt, Absender
 * und Anschrift (Strg+F). Der Posteingang filtert nach Zustand mit Chips wie
 * der Eingangskorb und lässt sich auf eine andere Stelle umstellen — die
 * Stelle ist ein Zuschnitt, kein Recht (§4).
 *
 * Schnitt N2: die Sichten „Fernmeldezentrale" (Ausgangswarteschlange und
 * „Eingang aufnehmen", `Fernmeldezentrale.tsx`) und „Nachweisung" (alle
 * Nachrichten nach Nummer, mit Ausgabe, `Nachweisung.tsx`); die Chips des
 * Posteingangs tragen die Zahlen je Zustand aus der Ansicht.
 *
 * Additiv (2026-11-17): die Sicht „LdF" (`Ldfsicht.tsx`) für den Leiter des
 * Fernmeldebetriebes, nur wenn der Einsatz ihn als Station führt oder die
 * Sitzung die Stelle LDF hat, und im Band die Zahl „vor dem LdF", wenn der
 * Einsatz ihn als Station führt.
 *
 * Nach den Audits vom 2026-11-17 (`Nachrichtenzusatz.tsx`): die eigene Stelle
 * im Band (SGL P1-4), in der Sicht Sichter der Umschalter „vor dem Sichter |
 * gesichtet“ zum Nachsichten (Sichter P0-1), ein Laufzettel, der nicht
 * verschwindet, wenn ein anderer Sichter zuvorkommt (Sichter P0-3), die
 * Karte „Ohne Nummer“ der FmZ (LdF P0-1) und Kenntnis nur für eigene Stellen
 * (Sichter P0-2). Dafür holt das Blatt in den Sichten Sichter und FmZ die
 * Nachweisung als zweite Ansicht mit; gefiltert wird nur für die Anzeige.
 *
 * Zweiter Durchlauf (Sichter P1-4, `Sichterstau.tsx`): In der Sicht der FmZ
 * nennt eine Zeile den Stau vor dem Sichter, und Eingänge über der Schwelle
 * oder ohne besetzten Sichter tragen „Ich sichte jetzt selbst“; der Knopf
 * öffnet darunter den Laufzettel wie beim Ersatzsichter.
 *
 * Nachzug der zweiten Runde (2026-11-18): Listenfläche, Nachweisung als
 * zweite Ansicht und der Laufzettel der FmZ stehen in `Nachrichtenflaeche.tsx`
 * (Strukturgrenze). Dazu: Nummernlücken über der Nachweisung (R2-LdF P2-7),
 * Zeitraum der Nachweisungsausgabe (R2-LdF P2-6), Schwelle und Wartezeit in
 * der Sicht LdF (R2-LdF P2-4), der säumige Sichter mit Namen (R2-FM P2-5),
 * „wie zuletzt bei diesem Absender“ im Laufzettel (Sichter P1-3) und „In der
 * Lage zeigen“ aus der Lese-Ansicht (R2-ETB P2-6).
 *
 * **Nichts wird hier gerechnet.** Ordnung, Filter, Laufzustand und Zahlen
 * kommen aus Ring 2 über den Ruf `nachrichtenAnfordern` und das Lagebild.
 */

import { useMemo, useState } from "react";

import { FMZ_SCHWELLE_VORBELEGUNG, type Nachrichtenzeile } from "@s1/domaene";

import { nachrichtenParameterSetzen, sichterBesetzt } from "../kontrakt/fmzschritte.js";
import type { Lagebild } from "../kontrakt/index.js";
import { stelleBesetzt } from "../kontrakt/ldfschritte.js";
import { Eingangskarte, OhneNummerKarte, Warteschlange, ohneNummerZeilen } from "./Fernmeldezentrale.js";
import type { Kontextort } from "./Klappmenue.js";
import { Laufzettel } from "./Laufzettel.js";
import { Ldfsicht, ldfSichtbar } from "./Ldfsicht.js";
import { Weitergabemaske } from "./Ldfmaske.js";
import { useLaden } from "./laden.js";
import { Nachrichtenkontextmenue, Nachrichtenleiste } from "./Nachrichtenauswahl.js";
import { Besetzungshinweis, Fassungshinweis, Nachrichtenband, Postfilter, Werkzeugzeile, ersteSicht, type Nachrichtensicht, type Posteingangsstand } from "./Nachrichtenkopf.js";
import { Listenflaeche, Lueckenzeile, SelbstLaufzettel, useNachweisungDazu } from "./Nachrichtenflaeche.js";
import { Sichtzusatz, Stellenangabe, quittierendeStellen, type Sichterstand } from "./Nachrichtenzusatz.js";
import { Nachweisung } from "./Nachweisung.js";
import { Nachweisungsausgabe } from "./Nachweisungsausgabe.js";
import { NurLesenHinweis, useNurLesen } from "./Nurlesen.js";
import { Sichterhinweis, Sichterstaukarte, sichtername } from "./Sichterstau.js";
import { useKuerzel } from "./tastatur.js";
import { useNachrichtenansicht } from "./useNachrichtenansicht.js";
import { useFmzschritte } from "./useFmzschritte.js";
import { useNachrichtenschritte } from "./useNachrichtenschritte.js";

// Die Tests und andere Blätter kennen die erste Sicht und den Typ weiter unter diesem Namen.
export { ersteSicht, type Nachrichtensicht } from "./Nachrichtenkopf.js";

export interface NachrichtenEigenschaften {
  readonly aufTagebuch: () => void;
  /** Additiv: öffnet „Stelle und Handzeichen“ (SGL P1-4, Knopf im Band). */
  readonly aufStelle?: (() => void) | undefined;
  /** Additiv (R2-ETB P2-6): schlägt das Blatt Lage auf — „In der Lage zeigen“. */
  readonly aufLage?: (() => void) | undefined;
}

/**
 * „LdF als Station einschalten“ aus der Sicht LdF (2026-11-22) — nur, solange
 * die Station aus ist; derselbe Entwurf wie in den Stammdaten.
 */
function stationEinschalten(lagebild: Lagebild | undefined): (() => void) | undefined {
  const einsatzId = lagebild?.einsatzId;
  const stand = lagebild?.stammdaten?.ldfStation;
  if (einsatzId === undefined || stand !== false) return undefined;
  const entwurf = nachrichtenParameterSetzen(einsatzId, "ldfStation", stand ?? null, true);
  return entwurf === undefined ? undefined : () => void useLaden.getState().bediene(entwurf);
}

export function Nachrichten({ aufTagebuch, aufStelle, aufLage }: NachrichtenEigenschaften): React.JSX.Element {
  const akteId = useLaden((z) => z.akteId);
  const lageZeiger = useLaden((z) => z.lagebild?.lageZeiger);
  const lage = useLaden((z) => z.lagebild?.nachrichten);
  const lagebild = useLaden((z) => z.lagebild);
  const sitzung = lagebild?.sitzung;
  const nurLesen = useNurLesen();
  const schwelle = useLaden((z) => z.lagebild?.stammdaten?.fmzSchwelleMinuten);
  const mitLdf = ldfSichtbar(useLaden((z) => z.lagebild?.stammdaten?.ldfStation), sitzung?.stellen ?? []);
  const [sicht, setzeSicht] = useState<Nachrichtensicht>(() => ersteSicht(sitzung?.stellen ?? []));
  const [suche, setzeSuche] = useState("");
  const [zustaende, setzeZustaende] = useState<readonly Posteingangsstand[]>([]);
  const [fuer, setzeFuer] = useState("");
  const [gewaehltId, setzeGewaehltId] = useState<string | undefined>(undefined);
  const [kontext, setzeKontext] = useState<Kontextort | undefined>(undefined);
  const [sichterstand, setzeSichterstand] = useState<Sichterstand>("offen");
  // Sichter P1-4: der Eingang, den die FmZ selbst sichtet („Ich sichte jetzt selbst“).
  const [selbstId, setzeSelbstId] = useState<string | undefined>(undefined);
  // Review 2026-11-21: ein beim fehlenden LdF hängender Ausgang, den die FmZ selbst weitergibt.
  const [weiterZeile, setzeWeiterZeile] = useState<Nachrichtenzeile | undefined>(undefined);
  const peers = useLaden((z) => z.lagebild?.peers);
  // R2-FM P2-5, R2-Si P2-2: die Schwellen vor dem Sichter je Vorrang aus den Stammdaten, optional gelesen.
  const vorrangschwellen = useLaden((z) => z.lagebild?.stammdaten) as { readonly sichterSchwelleBlitzMinuten?: number; readonly sichterSchwelleSofortMinuten?: number } | undefined;
  const sichterDa = sichterBesetzt(sitzung?.stellen, peers ?? []);
  const stellen = fuer === "" ? (sitzung?.stellen ?? []) : [fuer];
  const abruf = useNachrichtenansicht(akteId, lageZeiger, {
    sicht,
    stellen: [...stellen],
    ...(sicht === "posteingang" && zustaende.length > 0 ? { zustaende: [...zustaende] } : {}),
    ...(suche.trim() === "" ? {} : { suche: suche.trim() }),
  });
  const { alle, gesichtet } = useNachweisungDazu(akteId, lageZeiger, sicht, sichterstand);
  const zeilen = gesichtet ?? abruf.ansicht?.zeilen ?? [];
  // Fällt die gewählte Nachricht aus der Sicht (ein anderer Sichter war schneller), bleibt sie gewählt (Sichter P0-3).
  const gewaehlt = zeilen.find((z) => z.id === gewaehltId) ?? (sicht === "sichter" ? alle.find((z) => z.id === gewaehltId) : undefined);
  const schritte = useNachrichtenschritte({ zeile: gewaehlt, sitzung, stellen: quittierendeStellen(stellen, sitzung), nurLesen, anschriften: abruf.ansicht?.anschriften ?? [], aufTagebuch, gegenstellen: abruf.ansicht?.gegenstellen, aufLage });
  const fmz = useFmzschritte(abruf.ansicht, sitzung);
  const { verfassen } = schritte;
  // R2-FM P2-1: In der Sicht Fernmeldezentrale legt Strg+N den Eingang an („je nach gewählter Ansicht“).
  const anlegen = sicht === "fmz" ? fmz.aufEingang : verfassen;

  useKuerzel(
    useMemo(
      () => ({
        anlegen: () => {
          if (!nurLesen) anlegen();
        },
        suchen: () => document.getElementById("nachrichtensuche")?.focus(),
        abbrechen: () => setzeGewaehltId(undefined),
      }),
      [nurLesen, anlegen],
    ),
  );
  const waehleSicht = (neu: Nachrichtensicht): void => {
    setzeSicht(neu);
    setzeGewaehltId(undefined);
  };

  return (
    <section aria-label="Nachrichten" className="nachrichten">
      <h2>Nachrichten</h2>
      <NurLesenHinweis />
      <Nachrichtenband lage={lage} ldfBesetzt={stelleBesetzt("LDF", sitzung?.stellen, peers ?? [])} />
      <Besetzungshinweis lagebild={lagebild} />
      <Fassungshinweis lagebild={lagebild} />
      <Stellenangabe sitzung={sitzung} aufAendern={aufStelle} />
      <Werkzeugzeile
        sicht={sicht}
        aufSicht={waehleSicht}
        suche={suche}
        aufSuche={setzeSuche}
        nurLesen={nurLesen}
        aufVerfassen={verfassen}
        mitLdf={mitLdf}
        {...(sicht === "nachweisung" ? { rechts: <Nachweisungsausgabe /> } : {})}
      />
      {(sicht === "posteingang" || sicht === "offen") && (
        <Postfilter
          lage={lage}
          zaehlung={abruf.ansicht?.zaehlung}
          wahl={zustaende}
          aufWahl={setzeZustaende}
          sitzung={sitzung}
          fuer={fuer}
          aufFuer={setzeFuer}
          offen={sicht === "offen"}
          aufOffen={(an) => waehleSicht(an ? "offen" : "posteingang")}
        />
      )}
      <Sichtzusatz
        sicht={sicht}
        fuer={fuer}
        sitzung={sitzung}
        sichterstand={sichterstand}
        aufSichterstand={(neu) => {
          setzeSichterstand(neu);
          setzeGewaehltId(undefined);
        }}
      />
      {sicht === "fmz" && <Sichterhinweis lage={lage} />}
      {sicht === "fmz" && abruf.ansicht !== undefined ? (
        <div className="fmzkarten">
          <Warteschlange zeilen={zeilen} jetzt={abruf.ansicht.jetzt} gewaehltId={gewaehltId} nurLesen={nurLesen} aufWahl={setzeGewaehltId} aufSchritt={fmz.aufSchritt} schwelleMinuten={schwelle ?? FMZ_SCHWELLE_VORBELEGUNG} stellen={sitzung?.stellen ?? []} aufWeitergabe={setzeWeiterZeile} />
          <Eingangskarte nurLesen={nurLesen} aufEingang={fmz.aufEingang} />
          <OhneNummerKarte zeilen={abruf.ansicht.ohneNummer ?? ohneNummerZeilen(alle)} nurLesen={nurLesen} aufSchritt={fmz.aufSchritt} />
          <Sichterstaukarte
            zeilen={alle}
            sichterDa={sichterDa}
            schwelleMinuten={{ einsatz: schwelle ?? FMZ_SCHWELLE_VORBELEGUNG, blitz: vorrangschwellen?.sichterSchwelleBlitzMinuten, sofort: vorrangschwellen?.sichterSchwelleSofortMinuten }}
            nurLesen={nurLesen}
            aufSelbst={(zeile) => setzeSelbstId(zeile.id)}
            sichter={sichtername(peers ?? [])}
            jetzt={abruf.ansicht.jetzt}
          />
        </div>
      ) : sicht === "ldf" && abruf.ansicht !== undefined ? (
        <Ldfsicht zeilen={zeilen} handzeichen={sitzung?.handzeichen ?? ""} nurLesen={nurLesen} aufVorschlag={(zeile) => fmz.aufSchritt("vorschlag", zeile)} schwelleMinuten={schwelle ?? FMZ_SCHWELLE_VORBELEGUNG} naechsteNummer={abruf.ansicht?.naechsteNummer} vergebeneNummern={abruf.ansicht?.vergebeneNummern} aufStationEinschalten={stationEinschalten(lagebild)} />
      ) : sicht === "nachweisung" && abruf.ansicht !== undefined ? (
        <>
          <Lueckenzeile luecken={abruf.ansicht.nummernluecken} />
          <Nachweisung zeilen={zeilen} gewaehltId={gewaehltId} nurLesen={nurLesen} aufWahl={setzeGewaehltId} aufSchritt={fmz.aufSchritt} />
        </>
      ) : (
        <Listenflaeche
          abruf={abruf}
          zeilenErsatz={gesichtet}
          sicht={sicht}
          stellen={stellen}
          gewaehltId={gewaehltId}
          aufWahl={setzeGewaehltId}
          aufLesen={schritte.lesen}
          aufKontext={setzeKontext}
          lage={lage}
          aufLdf={mitLdf ? () => waehleSicht("ldf") : undefined}
        />
      )}
      {schritte.auswahl !== undefined && <Nachrichtenleiste {...schritte.auswahl} />}
      {schritte.auswahl !== undefined && kontext !== undefined && <Nachrichtenkontextmenue {...schritte.auswahl} ort={kontext} aufSchliessen={() => setzeKontext(undefined)} />}
      {sicht === "sichter" && gewaehlt !== undefined && (
        <Laufzettel key={gewaehlt.id} zeile={gewaehlt} handzeichen={sitzung?.handzeichen ?? ""} nurLesen={nurLesen} aufGesichtet={() => setzeGewaehltId(undefined)} verlauf={alle} />
      )}
      {sicht === "fmz" && <SelbstLaufzettel zeile={alle.find((z) => z.id === selbstId)} handzeichen={sitzung?.handzeichen ?? ""} nurLesen={nurLesen} aufFertig={() => setzeSelbstId(undefined)} verlauf={alle} saeumig={sichterDa} />}
      {schritte.masken}
      {fmz.masken}
      {weiterZeile !== undefined && <Weitergabemaske key={weiterZeile.id} zeile={weiterZeile} handzeichen={sitzung?.handzeichen ?? ""} naechsteNummer={abruf.ansicht?.naechsteNummer} vergebeneNummern={abruf.ansicht?.vergebeneNummern} aufSchliessen={() => setzeWeiterZeile(undefined)} />}
    </section>
  );
}
