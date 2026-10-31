/**
 * Die Erfassungsmasken der Untertabellen: Auftrag, Fahrzeug, Person an der
 * gewählten Einheit (§5.5, §5.6).
 *
 * Sie sind die Antwort auf den Befund, dass die Spalten J „Geräte /
 * Fahrzeuge“ und K „Aufträge“ des Blatts Stärke in der Tabelle nur berechnet
 * standen — und nichts sie füllen konnte. In der Excel tippt die
 * Führungsstelle beides als Freitext in die Zelle; hier entsteht je Eintrag
 * eine Entität, und die Zelle wird daraus abgeleitet.
 *
 * **Die Felder sind genau die der Nutzlastschemata.** Was das Schema als
 * Pflicht führt, ist Pflicht in der Maske; was es nicht kennt, fragt sie nicht
 * ab. Bei der Person heißt das: Geschlecht und Verpflegung **müssen** gewählt
 * werden. Eine Vorbelegung wäre eine Angabe, die niemand gemacht hat — und
 * aus ihr rechnen Unterbringung und Verpflegung.
 *
 * Bedient wird wie jede Maske über {@link Maske}: Der Fokus steht im ersten
 * Feld, Enter übernimmt, Escape verwirft.
 */

import { useRef, useState } from "react";

import {
  ERNAEHRUNG_AUSWAHL,
  FAHRZEUGSTATUS_AUSWAHL,
  GESCHLECHT_AUSWAHL,
  ROLLEN_AUSWAHL,
  type Auswahlwert,
} from "@s1/domaene";

import { zeitpunktAusEingabe } from "../kontrakt/bedienschritte.js";
import { auftragErfassen, fahrzeugAnlegen, personHinzufuegen } from "../kontrakt/einheitsteile.js";
import { Maske } from "./Maske.js";
import { Zeitfeld } from "./Zeitfeld.js";
import { useEinheitsteilSchreiben } from "./einheitsteilSchreiben.js";
import { neueId } from "./kennungen.js";
import { useSchreibsperre } from "./useVerbindungsstatus.js";

export interface ErfassungEigenschaften {
  readonly einheitId: string;
  readonly aufSchliessen: () => void;
}

/** Schreibt und schließt — oder zeigt den Grund, aus dem nichts geschrieben wurde. */
export function useAbschluss(einheitId: string, aufSchliessen: () => void) {
  const schreibe = useEinheitsteilSchreiben(einheitId);
  const sperre = useSchreibsperre();
  const gehalten = useRef<unknown>(undefined);
  const [eigene, setzeMeldung] = useState<string | undefined>(undefined);
  async function abschliessen(entwurf: Parameters<typeof schreibe>[0]): Promise<void> {
    setzeMeldung(undefined);
    const ausgang = await schreibe(entwurf);
    if (ausgang === undefined) aufSchliessen();
    else setzeMeldung(ausgang);
  }
  /** Die Kennung der Dialoginstanz: eine Wiederholung ist dieselbe Anlage (`Anlegeversuch.tsx`). */
  function kennung(erzeuge: () => string): string {
    gehalten.current ??= erzeuge();
    return gehalten.current as string;
  }
  // Ohne Verbindung steht der Sperrgrund da; ein Ausgang des Versuchs bleibt bis zum Schließen.
  return { meldung: eigene ?? sperre, setzeMeldung, abschliessen, kennung, gesperrt: sperre !== undefined };
}

export function Meldungszeile({ meldung }: { readonly meldung: string | undefined }): React.JSX.Element | null {
  if (meldung === undefined) return null;
  return (
    <p className="fehler" role="alert">
      {meldung}
    </p>
  );
}

// ---------------------------------------------------------------------------

export interface AuftragErfassungEigenschaften extends ErfassungEigenschaften {
  /** Wo die Einheit gerade steht — der Ort des Auftrags („von–bis; Ort; Auftrag“). */
  readonly abschnittId?: string;
  readonly abschnittName?: string;
}

export function AuftragErfassung({
  einheitId,
  abschnittId,
  abschnittName,
  aufSchliessen,
}: AuftragErfassungEigenschaften): React.JSX.Element {
  const [text, setzeText] = useState("");
  const [von, setzeVon] = useState("");
  const { meldung, setzeMeldung, abschliessen, kennung, gesperrt } = useAbschluss(einheitId, aufSchliessen);
  // Leer heißt „jetzt“ — der häufigste Fall, und er soll keinen Handgriff kosten.
  // „Jetzt“ ist der Zeitpunkt des ersten Bestätigens und bleibt bei einer
  // Wiederholung gleich: Sonst wäre der Körper ein anderer und der Dienst
  // erkennte die Wiederholung nicht.
  const jetztBeimBestaetigen = useRef<string | undefined>(undefined);

  return (
    <Maske
      titel="Auftrag erfassen"
      bestaetigungstext="Erfassen"
      bereit={text.trim() !== "" && !gesperrt}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={() => {
        jetztBeimBestaetigen.current ??= new Date().toISOString();
        const beginn = von.trim() === "" ? jetztBeimBestaetigen.current : zeitpunktAusEingabe(von);
        if (beginn === undefined) {
          setzeMeldung("Der Beginn ist keine lesbare Zeitangabe — z. B. „14:30“ oder „30.10. 14:30“.");
          return;
        }
        return abschliessen(
          auftragErfassen({
            auftragId: kennung(() => neueId("A")),
            einheitId,
            text,
            von: beginn,
            ...(abschnittId === undefined ? {} : { abschnittId }),
          }),
        );
      }}
    >
      <label>
        Auftrag
        <input value={text} onChange={(e) => { setzeText(e.target.value); }} placeholder="z. B. Deich sichern" />
      </label>
      <label>
        Beginn
        <Zeitfeld wert={von} aufAenderung={setzeVon} platzhalter="leer = jetzt" />
      </label>
      {abschnittName !== undefined && <p className="hinweistext">Ort: {abschnittName}</p>}
      <Meldungszeile meldung={meldung} />
    </Maske>
  );
}

// ---------------------------------------------------------------------------

export function FahrzeugErfassung({ einheitId, aufSchliessen }: ErfassungEigenschaften): React.JSX.Element {
  const [typ, setzeTyp] = useState("");
  const [bezeichnung, setzeBezeichnung] = useState("");
  const [kennzeichen, setzeKennzeichen] = useState("");
  const [status, setzeStatus] = useState("EINSATZBEREIT");
  const { meldung, abschliessen, kennung, gesperrt } = useAbschluss(einheitId, aufSchliessen);

  return (
    <Maske
      titel="Fahrzeug erfassen"
      bestaetigungstext="Erfassen"
      bereit={typ.trim() !== "" && !gesperrt}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={() =>
        abschliessen(fahrzeugAnlegen({ fahrzeugId: kennung(() => neueId("F")), einheitId, typ, bezeichnung, kennzeichen, status }))
      }
    >
      <label>
        Typ
        <input value={typ} onChange={(e) => { setzeTyp(e.target.value); }} placeholder="z. B. GKW, MTW, Anh" />
      </label>
      <label>
        Bezeichnung
        <input value={bezeichnung} onChange={(e) => { setzeBezeichnung(e.target.value); }} />
      </label>
      <label>
        Kennzeichen
        <input value={kennzeichen} onChange={(e) => { setzeKennzeichen(e.target.value); }} placeholder="z. B. THW-84123" />
      </label>
      <label>
        Status
        <Auswahl wert={status} werte={FAHRZEUGSTATUS_AUSWAHL} aufWahl={setzeStatus} />
      </label>
      <Meldungszeile meldung={meldung} />
    </Maske>
  );
}

// ---------------------------------------------------------------------------

export function PersonErfassung({ einheitId, aufSchliessen }: ErfassungEigenschaften): React.JSX.Element {
  const [nachname, setzeNachname] = useState("");
  const [vorname, setzeVorname] = useState("");
  const [rolle, setzeRolle] = useState("MANNSCHAFT");
  const [funktionen, setzeFunktionen] = useState("");
  const [geschlecht, setzeGeschlecht] = useState("");
  const [ernaehrung, setzeErnaehrung] = useState("");
  const { meldung, abschliessen, kennung, gesperrt } = useAbschluss(einheitId, aufSchliessen);
  const vollstaendig = [nachname, vorname, geschlecht, ernaehrung].every((wert) => wert.trim() !== "");

  return (
    <Maske
      titel="Person erfassen"
      bestaetigungstext="Erfassen"
      bereit={vollstaendig && !gesperrt}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={() =>
        abschliessen(
          personHinzufuegen({
            personId: kennung(() => neueId("P")),
            einheitId,
            vorname,
            nachname,
            rolle,
            funktionen,
            geschlecht,
            ernaehrung,
          }),
        )
      }
    >
      <label>
        Nachname
        <input value={nachname} onChange={(e) => { setzeNachname(e.target.value); }} />
      </label>
      <label>
        Vorname
        <input value={vorname} onChange={(e) => { setzeVorname(e.target.value); }} />
      </label>
      <label>
        Rolle
        <Auswahl wert={rolle} werte={ROLLEN_AUSWAHL} aufWahl={setzeRolle} />
      </label>
      <label>
        Funktionen
        <input value={funktionen} onChange={(e) => { setzeFunktionen(e.target.value); }} placeholder="kommagetrennt, z. B. Kraftfahrer, Sprechfunker" />
      </label>
      <label>
        Geschlecht
        <Auswahl wert={geschlecht} werte={GESCHLECHT_AUSWAHL} aufWahl={setzeGeschlecht} leer />
      </label>
      <label>
        Verpflegung
        <Auswahl wert={ernaehrung} werte={ERNAEHRUNG_AUSWAHL} aufWahl={setzeErnaehrung} leer />
      </label>
      <Meldungszeile meldung={meldung} />
    </Maske>
  );
}

interface AuswahlEigenschaften {
  readonly wert: string;
  readonly werte: readonly Auswahlwert[];
  readonly aufWahl: (wert: string) => void;
  /** Mit „— bitte wählen —“ vorn: Das Feld hat keine Vorbelegung. */
  readonly leer?: boolean;
}

function Auswahl({ wert, werte, aufWahl, leer = false }: AuswahlEigenschaften): React.JSX.Element {
  return (
    <select value={wert} onChange={(e) => { aufWahl(e.target.value); }}>
      {leer && <option value="">— bitte wählen —</option>}
      {werte.map((eintrag) => (
        <option key={eintrag.wert} value={eintrag.wert}>
          {eintrag.titel}
        </option>
      ))}
    </select>
  );
}
