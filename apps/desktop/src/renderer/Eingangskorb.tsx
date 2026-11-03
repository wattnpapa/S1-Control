/**
 * Der Eingangskorb des Meldekopfs (M6.1) und die Revisionen einer Reihe
 * (M6.2).
 *
 * Die Excel kennt diesen Weg schon, nur von Hand: Der Meldekopf trägt die
 * Bögen in eine Google-Tabelle und markiert sie **gelb**, die Führungsstelle
 * kopiert die Zeile und markiert **grün**, bei einer Änderung wird wieder gelb
 * gesetzt (Hinweise C159–C172, EXH F-E1). Hier ist die Ampel kein Anstrich,
 * sondern der abgeleitete `uebernahmeZustand` aus §5.8.1 — sie kann gar nicht
 * vergessen werden.
 *
 * **Nichts verschwindet.** Der Empfang ist eine Tatsache; Löschen ist
 * verboten. Wer eine Meldung nicht will, lehnt sie ab — mit Grund (§2.4) —,
 * und sie bleibt im Korb. Dieselbe Regel führt die Excel als „Google-Zeilen
 * werden bis Einsatzende nicht gelöscht".
 *
 * Seit Runde 6 (Entwurf „Entlastung", 3.7) folgt der Korb dem Muster der
 * Lage: im Kopf der Hauptknopf „Bündel einlesen …" und „⋯" mit „Meldungen
 * als Datei speichern" (`Buendel.tsx`), darunter eine Filterzeile mit Chips
 * (`Filterchips.tsx`), und was eine Meldung kann, steht erst mit ihrer Wahl
 * in der Auswahlleiste und im Kontextmenü (`Meldungsauswahl.tsx`).
 */

import { useEffect, useMemo, useState } from "react";

import type { Meldungszeile } from "@s1/domaene";

import { Buendelmaske, useBuendelSchreiben } from "./Buendel.js";
import { Revisionen, zeit } from "./Eingangsrevisionen.js";
import { Filterchips } from "./Filterchips.js";
import { useFeldversuch } from "./Feldschreiben.js";
import { useGrundabfrage } from "./Grundabfrage.js";
import { Klappmenue, Menueeintrag, type Kontextort } from "./Klappmenue.js";
import { useLaden } from "./laden.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { Meldungskontextmenue, Meldungsleiste, type MeldungsauswahlEigenschaften } from "./Meldungsauswahl.js";
import { NurLesenHinweis, useNurLesen } from "./Nurlesen.js";
import { useKuerzel } from "./tastatur.js";
import { useSchreibsperre } from "./useVerbindungsstatus.js";
import { ablehnungZurueckgenommen, meldeStatusGesetzt, meldungAbgelehnt, uebernahmeZurueckgenommen } from "../kontrakt/bedienschritte.js";

/** Die vier Zustände mit Beschriftung und Ton — die Ampel der Vorlage. */
const ZUSTAENDE = [
  { wert: "NEU", titel: "Neu", ton: "warn" },
  { wert: "GEAENDERT", titel: "Geändert", ton: "warn" },
  { wert: "UEBERNOMMEN", titel: "Übernommen", ton: "ok" },
  { wert: "ABGELEHNT", titel: "Abgelehnt", ton: "" },
] as const;

type Zustandswahl = NonNullable<ReturnType<typeof useLaden.getState>["eingangsfilter"]["zustaende"]>;

/** Die Zustandsfilter als Chips, „Nur jüngste Fassung" als Schalter rechts daneben. */
function Eingangsfilter(): React.JSX.Element {
  const ansicht = useLaden((z) => z.eingangskorb);
  const filter = useLaden((z) => z.eingangsfilter);
  const setzeFilter = useLaden((z) => z.setzeEingangsfilter);
  const chips = ZUSTAENDE.map((z) => ({ ...z, anzahl: ansicht === undefined ? undefined : (ansicht.jeZustand[z.wert] ?? 0) }));
  return (
    <Filterchips
      beschriftung="Filter nach Zustand"
      chips={chips}
      wahl={filter.zustaende ?? []}
      aufWahl={(wahl) => void setzeFilter({ ...filter, zustaende: wahl.length === 0 ? undefined : (wahl as Zustandswahl) })}
      dazu={
        // K26: Bei einer Mehrtageslage trägt der Korb je Einheit so viele
        // Zeilen, wie es Meldetage gab. Gebraucht wird die jüngste; die
        // anderen stehen in der Revisionsansicht.
        <button
          type="button"
          className="filterschalter"
          aria-pressed={filter.nurKoepfe === true}
          onClick={() => void setzeFilter({ ...filter, nurKoepfe: filter.nurKoepfe !== true })}
        >
          Nur jüngste Fassung
        </button>
      }
    />
  );
}

/** Kopf des Korbs: Titel mit Zahl, „Bündel einlesen …" und „⋯". */
function Korbkopf({ offen, aufErgebnis }: { readonly offen: number | undefined; readonly aufErgebnis: (text: string) => void }): React.JSX.Element {
  const [maske, setzeMaske] = useState(false);
  const schreibe = useBuendelSchreiben(aufErgebnis);
  const nurLesen = useNurLesen();
  return (
    <div className="einheitenkopf eingangskopf">
      <h2>
        Eingangskorb
        {offen === undefined ? "" : ` — ${String(offen)} offen`}
      </h2>
      <button
        type="button"
        className="haupt"
        disabled={nurLesen}
        title={nurLesen ? TEXT_NUR_LESEN : "Meldungen aus einer Bündeldatei des Meldekopfs in einen Abschnitt einlesen"}
        onClick={() => setzeMaske(true)}
      >
        Bündel einlesen …
      </button>
      <span className="werkzeugrechts">
        <Klappmenue
          huelle="rechts"
          knopf={{ inhalt: "⋯", klasse: "menueknopf", beschriftung: "Weitere Schritte im Eingangskorb", titel: "Meldungen als Datei speichern" }}
          menue={{ beschriftung: "Eingangskorb", id: "eingangsmenue" }}
          inhalt={(waehle) => (
            <Menueeintrag
              text="Meldungen als Datei speichern"
              titel="Schreibt alle Meldungen als Bündeldatei nach „ausgaben“, für den Weg ohne Netz"
              aufWahl={waehle(schreibe)}
            />
          )}
        />
      </span>
      {maske && <Buendelmaske aufSchliessen={() => setzeMaske(false)} aufErgebnis={aufErgebnis} />}
    </div>
  );
}

/** Was die gewählte Meldung schreibt — dieselben Schritte wie bisher in der Spalte „Handlung". */
function useMeldungsschritte(zeile: Meldungszeile | undefined, aufFassungen: () => void): {
  readonly auswahl: MeldungsauswahlEigenschaften | undefined;
  readonly masken: React.ReactNode;
} {
  const bediene = useLaden((z) => z.bediene);
  const grundabfrage = useGrundabfrage();
  const aktion = useFeldversuch();
  const nurLesen = useNurLesen();
  const verbindung = useSchreibsperre();
  const sperre = nurLesen ? TEXT_NUR_LESEN : aktion.gesperrt ? (verbindung ?? "Gerade nicht möglich") : aktion.laeuft ? "Wird geschrieben …" : undefined;
  const masken = (
    <>
      {aktion.anzeige}
      {grundabfrage.maske}
    </>
  );
  if (zeile === undefined) return { auswahl: undefined, masken };
  const auswahl: MeldungsauswahlEigenschaften = {
    zeile,
    sperre,
    ablehnenSperre: nurLesen ? TEXT_NUR_LESEN : undefined,
    aufAblehnen: () => {
      // §2.4: Der Grund gehört zur Ablehnung. Ohne ihn wäre sie im
      // Nachhinein nicht von einem Versehen zu unterscheiden.
      grundabfrage.frage({
        titel: "Meldung ablehnen",
        erlaeuterung: "Die Ablehnung steht mit diesem Grund im Einsatztagebuch und ist später von einem Versehen zu unterscheiden.",
        bestaetigungstext: "Ablehnen",
        // Das Versprechen geht an die Abfrage zurück: Der Dialog bleibt mit dem
        // Grund stehen, bis der Dienst das Schreiben bestätigt hat.
        aufGrund: (text) => bediene(meldungAbgelehnt(zeile.id, text)),
      });
    },
    aufAblehnungZurueck: () => void aktion.schreibe(ablehnungZurueckgenommen(zeile.id)),
    aufUebernahmeZurueck: () => void aktion.schreibe(uebernahmeZurueckgenommen(zeile.id)),
    aufMeldestatus: (status) => void aktion.schreibe(meldeStatusGesetzt(zeile.id, null, status)),
    aufFassungen,
  };
  return { auswahl, masken };
}

interface MeldungstabelleEigenschaften {
  readonly zeilen: readonly Meldungszeile[];
  readonly gewaehlt: string | undefined;
  readonly aufWahl: (id: string) => void;
  readonly aufKontext: (ort: Kontextort) => void;
  readonly aufReihe: (zeile: Meldungszeile) => void;
}

function Meldungstabelle({ zeilen, gewaehlt, aufWahl, aufKontext, aufReihe }: MeldungstabelleEigenschaften): React.JSX.Element {
  return (
    <table className="meldungstabelle" aria-label="Meldungen im Eingangskorb">
      <thead>
        <tr>
          <th scope="col">Zustand</th>
          <th scope="col">Einheit</th>
          <th scope="col">Org.</th>
          <th scope="col">Stärke</th>
          <th scope="col">Stand</th>
          <th scope="col">Empfangen</th>
          <th scope="col">Signatur</th>
          <th scope="col">Fassung</th>
        </tr>
      </thead>
      <tbody>
        {zeilen.map((zeile) => (
          <Zeile key={zeile.id} zeile={zeile} gewaehlt={zeile.id === gewaehlt} aufWahl={aufWahl} aufKontext={aufKontext} aufReihe={aufReihe} />
        ))}
      </tbody>
    </table>
  );
}

export function Eingangskorb(): React.JSX.Element {
  const holeEingangskorb = useLaden((z) => z.holeEingangskorb);
  const ansicht = useLaden((z) => z.eingangskorb);
  const [reihe, setzeReihe] = useState<string | undefined>(undefined);
  const [gewaehltId, setzeGewaehltId] = useState<string | undefined>(undefined);
  const [kontext, setzeKontext] = useState<Kontextort | undefined>(undefined);
  const [meldung, setzeMeldung] = useState<string | undefined>(undefined);
  const gewaehlt = ansicht?.zeilen.find((zeile) => zeile.id === gewaehltId);
  const { auswahl, masken } = useMeldungsschritte(gewaehlt, () => setzeReihe(gewaehlt?.einheitSchluessel));

  useEffect(() => {
    void holeEingangskorb();
  }, [holeEingangskorb]);
  useKuerzel(useMemo(() => ({ abbrechen: () => setzeGewaehltId(undefined) }), []));

  return (
    <section aria-label="Eingangskorb" className="eingangskorb">
      <Korbkopf offen={ansicht?.offen} aufErgebnis={setzeMeldung} />
      {meldung !== undefined && (
        <p role="status" className="hinweistext">
          {meldung}
        </p>
      )}
      <NurLesenHinweis />
      <Eingangsfilter />
      {ansicht === undefined ? (
        <p className="hinweistext">Wird geladen …</p>
      ) : ansicht.zeilen.length === 0 ? (
        <p className="hinweistext">Keine Meldung im Korb.</p>
      ) : (
        <Meldungstabelle zeilen={ansicht.zeilen} gewaehlt={gewaehltId} aufWahl={setzeGewaehltId} aufKontext={setzeKontext} aufReihe={(zeile) => setzeReihe(zeile.einheitSchluessel)} />
      )}
      {auswahl !== undefined && <Meldungsleiste {...auswahl} />}
      {auswahl !== undefined && kontext !== undefined && <Meldungskontextmenue {...auswahl} ort={kontext} aufSchliessen={() => setzeKontext(undefined)} />}
      {masken}
      {reihe !== undefined && <Revisionen einheitSchluessel={reihe} aufSchliessen={() => setzeReihe(undefined)} />}
    </section>
  );
}

interface ZeilenEigenschaften {
  readonly zeile: Meldungszeile;
  readonly gewaehlt: boolean;
  readonly aufWahl: (id: string) => void;
  readonly aufKontext: (ort: Kontextort) => void;
  readonly aufReihe: (zeile: Meldungszeile) => void;
}

function Zeile({ zeile, gewaehlt, aufWahl, aufKontext, aufReihe }: ZeilenEigenschaften): React.JSX.Element {
  const klassen = [zeile.zustand === "ABGELEHNT" ? "abgelehnt" : "", gewaehlt ? "gewaehlt" : ""].filter((k) => k !== "").join(" ");
  return (
    <tr
      className={klassen === "" ? undefined : klassen}
      aria-selected={gewaehlt}
      onClick={() => aufWahl(zeile.id)}
      onContextMenu={(ereignis) => {
        // Das Menü des Browsers trüge hier nichts bei (Entwurf, offene Fragen).
        ereignis.preventDefault();
        aufWahl(zeile.id);
        aufKontext({ x: ereignis.clientX, y: ereignis.clientY });
      }}
    >
      <td>
        <span className={`ampel ampel-${zeile.zustand.toLowerCase()}`}>{zeile.zustand}</span>
      </td>
      <th scope="row">{zeile.bezeichnung}</th>
      <td>{zeile.organisation}</td>
      <td className="zahl">{zeile.staerke}</td>
      <td>{zeit(zeile.stand)}</td>
      <td>{zeit(zeile.empfangenAm)}</td>
      <td>
        {/* §5.8.1: Die Signatur entscheidet nichts — sie wird angezeigt. Eine
            Meldung mit gebrochener Signatur wird aufgenommen; wer sie nicht
            will, lehnt sie ab. */}
        {zeile.signatur === "" ? "—" : zeile.signatur}
      </td>
      <td>
        {zeile.fassungen > 1 ? (
          <button type="button" onClick={() => aufReihe(zeile)}>
            {zeile.fassung} von {zeile.fassungen}
          </button>
        ) : (
          "1"
        )}
      </td>
    </tr>
  );
}
