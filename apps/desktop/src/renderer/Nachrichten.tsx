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
 * **Nichts wird hier gerechnet.** Ordnung, Filter, Laufzustand und Zahlen
 * kommen aus Ring 2 über den Ruf `nachrichtenAnfordern` und das Lagebild.
 */

import { useMemo, useState } from "react";

import { FMZ_SCHWELLE_VORBELEGUNG, type Nachrichtenzeile } from "@s1/domaene";

import { AUSSCHNITT_MAX } from "../kontrakt/index.js";
import { sichterBesetzt } from "../kontrakt/fmzschritte.js";
import { Eingangskarte, OhneNummerKarte, Warteschlange, ohneNummerZeilen } from "./Fernmeldezentrale.js";
import type { Kontextort } from "./Klappmenue.js";
import { Laufzettel } from "./Laufzettel.js";
import { Ldfsicht, ldfSichtbar } from "./Ldfsicht.js";
import { useLaden } from "./laden.js";
import { Nachrichtenkontextmenue, Nachrichtenleiste } from "./Nachrichtenauswahl.js";
import { Besetzungshinweis, NACHRICHTENSICHTEN, Nachrichtenband, Postfilter, Werkzeugzeile, ersteSicht, type Nachrichtensicht, type Posteingangsstand } from "./Nachrichtenkopf.js";
import { Nachrichtenliste } from "./Nachrichtenliste.js";
import { Sichtzusatz, Stellenangabe, gesichteteZeilen, quittierendeStellen, type Sichterstand } from "./Nachrichtenzusatz.js";
import { Nachweisung, Nachweisungsausgabe } from "./Nachweisung.js";
import { NurLesenHinweis, useNurLesen } from "./Nurlesen.js";
import { Sichterhinweis, Sichterstaukarte } from "./Sichterstau.js";
import { useKuerzel } from "./tastatur.js";
import { useNachrichtenansicht, type Nachrichtenabruf } from "./useNachrichtenansicht.js";
import { useFmzschritte } from "./useFmzschritte.js";
import { useNachrichtenschritte } from "./useNachrichtenschritte.js";

// Die Tests und andere Blätter kennen die erste Sicht und den Typ weiter unter diesem Namen.
export { ersteSicht, type Nachrichtensicht } from "./Nachrichtenkopf.js";

interface ListenEigenschaften {
  readonly abruf: Nachrichtenabruf;
  /** Additiv: die gezeigten Zeilen, wenn sie nicht die der Ansicht sind (Sichter „gesichtet“). */
  readonly zeilenErsatz?: readonly Nachrichtenzeile[] | undefined;
  readonly sicht: Nachrichtensicht;
  readonly stellen: readonly string[];
  readonly gewaehltId: string | undefined;
  readonly aufWahl: (id: string) => void;
  readonly aufLesen: (zeile: Nachrichtenzeile) => void;
  readonly aufKontext: (ort: Kontextort) => void;
}

/** Die Liste der Sicht, mit Ladezustand, leerer Sicht und Hinweis auf weitere Zeilen. */
function Listenflaeche({ abruf, zeilenErsatz, sicht, stellen, gewaehltId, aufWahl, aufLesen, aufKontext }: ListenEigenschaften): React.JSX.Element {
  const titel = NACHRICHTENSICHTEN.find((s) => s.schluessel === sicht)?.titel ?? sicht;
  const zeilen = zeilenErsatz ?? abruf.ansicht?.zeilen ?? [];
  if (abruf.ansicht === undefined) {
    return <p className="hinweistext">{abruf.fehler ?? "Wird geladen …"}</p>;
  }
  if (zeilen.length === 0) {
    const ohneStelle = (sicht === "posteingang" || sicht === "offen") && stellen.length === 0;
    return (
      <p className="hinweistext">
        {ohneStelle ? "Keine Stelle gewählt — über das Fenstermenü „Stelle und Handzeichen …“ angeben oder oben eine Stelle wählen." : `Keine Nachricht in „${titel}“.`}
      </p>
    );
  }
  return (
    <>
      {abruf.fehler !== undefined && <p className="hinweistext fehler">{abruf.fehler}</p>}
      <Nachrichtenliste
        zeilen={zeilen}
        beschriftung={`Nachrichten: ${titel}`}
        stellen={stellen}
        posteingang={sicht === "posteingang" || sicht === "offen"}
        eingangsspalte={sicht === "sichter"}
        gewaehltId={gewaehltId}
        aufWahl={aufWahl}
        aufLesen={(id) => {
          const zeile = zeilen.find((z) => z.id === id);
          if (zeile !== undefined) aufLesen(zeile);
        }}
        aufKontext={aufKontext}
      />
      {zeilenErsatz === undefined && abruf.ansicht.gesamtzahl > zeilen.length && (
        <p className="hinweistext">
          {zeilen.length} von {abruf.ansicht.gesamtzahl} Nachrichten; die Suche grenzt ein.
        </p>
      )}
    </>
  );
}

/**
 * Die Nachweisung als zweite Ansicht, nur in den Sichten Sichter und FmZ:
 * gesichtete Eingänge zum Nachsichten (Sichter P0-1, P0-3) und beförderte
 * Nachrichten ohne Nummer (LdF P0-1).
 */
function useNachweisungDazu(akteId: string | undefined, lageZeiger: number | undefined, sicht: Nachrichtensicht, stand: Sichterstand) {
  const mit = sicht === "sichter" || sicht === "fmz";
  const nachweisung = useNachrichtenansicht(mit ? akteId : undefined, lageZeiger, { sicht: "nachweisung", anzahl: AUSSCHNITT_MAX });
  const alle = mit ? (nachweisung.ansicht?.zeilen ?? []) : [];
  return { alle, gesichtet: sicht === "sichter" && stand === "gesichtet" ? gesichteteZeilen(alle) : undefined };
}

/**
 * Der Laufzettel der FmZ, die selbst sichtet (Sichter P1-4) — wie beim Ersatzsichter.
 * Er rollt beim Öffnen in den Blick und fokussiert die Quittung (R2-FM P1-2, R2-Si P2):
 * Vorher lag er unter der Falz, und „Sichten“ war blind drückbar.
 */
function SelbstLaufzettel({ zeile, handzeichen, nurLesen, aufFertig }: { readonly zeile: Nachrichtenzeile | undefined; readonly handzeichen: string; readonly nurLesen: boolean; readonly aufFertig: () => void }): React.JSX.Element | null {
  if (zeile === undefined) return null;
  return <Laufzettel key={zeile.id} zeile={zeile} handzeichen={handzeichen} nurLesen={nurLesen} aufGesichtet={aufFertig} fokus />;
}

export interface NachrichtenEigenschaften {
  readonly aufTagebuch: () => void;
  /** Additiv: öffnet „Stelle und Handzeichen“ (SGL P1-4, Knopf im Band). */
  readonly aufStelle?: (() => void) | undefined;
}

export function Nachrichten({ aufTagebuch, aufStelle }: NachrichtenEigenschaften): React.JSX.Element {
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
  const sichterDa = sichterBesetzt(sitzung?.stellen, useLaden((z) => z.lagebild?.peers) ?? []);
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
  const schritte = useNachrichtenschritte({ zeile: gewaehlt, sitzung, stellen: quittierendeStellen(stellen, sitzung), nurLesen, anschriften: abruf.ansicht?.anschriften ?? [], aufTagebuch });
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
      <Nachrichtenband lage={lage} />
      <Besetzungshinweis lagebild={lagebild} />
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
          <Warteschlange zeilen={zeilen} jetzt={abruf.ansicht.jetzt} gewaehltId={gewaehltId} nurLesen={nurLesen} aufWahl={setzeGewaehltId} aufSchritt={fmz.aufSchritt} schwelleMinuten={schwelle ?? FMZ_SCHWELLE_VORBELEGUNG} />
          <Eingangskarte nurLesen={nurLesen} aufEingang={fmz.aufEingang} />
          <OhneNummerKarte zeilen={abruf.ansicht.ohneNummer ?? ohneNummerZeilen(alle)} nurLesen={nurLesen} aufSchritt={fmz.aufSchritt} />
          <Sichterstaukarte zeilen={alle} sichterDa={sichterDa} schwelleMinuten={schwelle ?? FMZ_SCHWELLE_VORBELEGUNG} nurLesen={nurLesen} aufSelbst={(zeile) => setzeSelbstId(zeile.id)} />
        </div>
      ) : sicht === "ldf" && abruf.ansicht !== undefined ? (
        <Ldfsicht zeilen={zeilen} handzeichen={sitzung?.handzeichen ?? ""} nurLesen={nurLesen} aufVorschlag={(zeile) => fmz.aufSchritt("vorschlag", zeile)} />
      ) : sicht === "nachweisung" && abruf.ansicht !== undefined ? (
        <Nachweisung zeilen={zeilen} gewaehltId={gewaehltId} nurLesen={nurLesen} aufWahl={setzeGewaehltId} aufSchritt={fmz.aufSchritt} />
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
        />
      )}
      {schritte.auswahl !== undefined && <Nachrichtenleiste {...schritte.auswahl} />}
      {schritte.auswahl !== undefined && kontext !== undefined && <Nachrichtenkontextmenue {...schritte.auswahl} ort={kontext} aufSchliessen={() => setzeKontext(undefined)} />}
      {sicht === "sichter" && gewaehlt !== undefined && (
        <Laufzettel key={gewaehlt.id} zeile={gewaehlt} handzeichen={sitzung?.handzeichen ?? ""} nurLesen={nurLesen} aufGesichtet={() => setzeGewaehltId(undefined)} />
      )}
      {sicht === "fmz" && <SelbstLaufzettel zeile={alle.find((z) => z.id === selbstId)} handzeichen={sitzung?.handzeichen ?? ""} nurLesen={nurLesen} aufFertig={() => setzeSelbstId(undefined)} />}
      {schritte.masken}
      {fmz.masken}
    </section>
  );
}
