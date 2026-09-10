/**
 * Die fünf Masken der Einheitentabelle (M3.2).
 *
 * Anlegen aus Vorlage, verschieben (auch mehrere), aufteilen,
 * zusammenführen, entfernen. Jede baut ihren Entwurf über die reinen
 * Funktionen aus `bedienschritte.ts` — hier steht die Eingabe, dort die
 * Regel. Die Trennung ist der Grund, aus dem sich die Regeln aus §5.4 ohne
 * DOM prüfen lassen.
 *
 * Zwei der fünf haben eine Warnung im Text, und beide stehen dort nicht aus
 * Höflichkeit:
 *
 *  * **Entfernen** verlangt einen Grund (§2.4), weil es eine gemeldete Kraft
 *    aus allen Summen nimmt, ohne sie zu löschen (§5.4.5).
 *  * **Zusammenführen** ist nicht umkehrbar (§5.9.2): Der Rückweg teilt aus
 *    dem Ziel eine Einheit mit **neuer** Id ab; alles, was auf die alte
 *    zeigte, zeigt weiter dorthin.
 */

import { useEffect, useState } from "react";

import {
  gefuellteKataloge,
  vorlagenAus,
  type EinheitVorlage,
  type Tabellenzeile,
  type Vorlagenkatalog,
} from "@s1/domaene";

import { Maske } from "./Maske.js";
import type { Einheitenmaske } from "./Einheitentabelle.js";
import { anlageAusVorlage, aufteilung, entfernung, verschiebung, zusammenfuehrung } from "./bedienschritte.js";
import { neueId } from "./kennungen.js";
import { useLaden } from "./laden.js";

export interface EinheitenmaskenEigenschaften {
  readonly maske: Einheitenmaske;
  readonly gewaehlte: readonly Tabellenzeile[];
  /** Der gewählte Abschnitt — Ziel der Anlage und Vorbelegung der Verschiebung. */
  readonly abschnittId: string | undefined;
  readonly aufSchliessen: () => void;
}

export function Einheitenmasken({
  maske,
  gewaehlte,
  abschnittId,
  aufSchliessen,
}: EinheitenmaskenEigenschaften): React.JSX.Element | null {
  const laden = useLaden();
  const [katalog, setzeKatalog] = useState<Vorlagenkatalog | undefined>(undefined);
  const [vorlageId, setzeVorlageId] = useState("");
  const [herkunft, setzeHerkunft] = useState("");
  const [ziel, setzeZiel] = useState(abschnittId ?? "");
  const [grund, setzeGrund] = useState("");
  const [bezeichnung, setzeBezeichnung] = useState("");
  const [fuehrer, setzeFuehrer] = useState("0");
  const [unterfuehrer, setzeUnterfuehrer] = useState("0");
  const [mannschaft, setzeMannschaft] = useState("0");

  useEffect(() => {
    setzeZiel(abschnittId ?? "");
  }, [abschnittId, maske]);

  const kataloge = gefuellteKataloge();
  const gewaehlterKatalog = katalog ?? kataloge[0];
  const vorlagen: readonly EinheitVorlage[] =
    gewaehlterKatalog === undefined ? [] : vorlagenAus(gewaehlterKatalog);
  const vorlage = vorlagen.find((eintrag) => eintrag.id === vorlageId);
  const erste = gewaehlte[0];
  const abschnitte = laden.baum?.baum ?? [];

  async function schreibe(entwurf: Parameters<typeof laden.bediene>[0]): Promise<void> {
    const ergebnis = await laden.bediene(entwurf);
    if (ergebnis?.art !== "geschrieben") return;
    aufSchliessen();
    await laden.holeTabelle();
    await laden.holeBaum();
  }

  if (maske === undefined) return null;

  if (maske === "anlegen") {
    return (
      <Maske
        titel="Einheit aus Vorlage anlegen"
        bereit={vorlage !== undefined && ziel !== ""}
        aufAbbrechen={aufSchliessen}
        aufBestaetigen={() => {
          if (vorlage === undefined) return;
          void schreibe(
            anlageAusVorlage({
              einheitId: neueId("E"),
              abschnittId: ziel,
              vorlage,
              reihenfolge: (laden.tabelle?.gesamtzahl ?? 0) + 1,
              ...(herkunft.trim() === "" ? {} : { herkunft: herkunft.trim() }),
            }),
          );
        }}
      >
        <label>
          Katalog
          <select
            value={gewaehlterKatalog ?? ""}
            onChange={(e) => {
              setzeKatalog(e.target.value as Vorlagenkatalog);
              setzeVorlageId("");
            }}
          >
            {kataloge.map((eintrag) => (
              <option key={eintrag} value={eintrag}>
                {eintrag}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vorlage
          <select
            value={vorlageId}
            onChange={(e) => {
              setzeVorlageId(e.target.value);
            }}
          >
            <option value="">— bitte wählen —</option>
            {vorlagen.map((eintrag) => (
              <option key={eintrag.id} value={eintrag.id}>
                {eintrag.bezeichnung}
                {eintrag.sollStaerke === undefined
                  ? ""
                  : ` (${String(eintrag.sollStaerke.fuehrer)}/${String(eintrag.sollStaerke.unterfuehrer)}/${String(eintrag.sollStaerke.mannschaft)})`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Herkunft
          <input
            value={herkunft}
            onChange={(e) => {
              setzeHerkunft(e.target.value);
            }}
            placeholder="z. B. THW OV Oldenburg"
          />
        </label>
        <label>
          Abschnitt
          <Abschnittswahl wert={ziel} abschnitte={abschnitte} aufWahl={setzeZiel} />
        </label>
        <p className="hinweistext">
          Die Soll-Stärke der Vorlage wird übernommen; fehlt sie, steht 0/0/0 da. Eine Zahl, die
          niemand gemeldet hat, ist in einer Stärkeübersicht der gefährlichere Fehler. Der Status
          ist „Angefordert“: Wer aus dem Katalog anlegt, plant Kräfte und meldet sie nicht als
          anwesend.
        </p>
      </Maske>
    );
  }

  if (maske === "verschieben") {
    return (
      <Maske
        titel={`${String(gewaehlte.length)} Einheit(en) verschieben`}
        bereit={ziel !== ""}
        aufAbbrechen={aufSchliessen}
        aufBestaetigen={() => {
          void (async () => {
            // Je Einheit ein Ereignis, und zwar nacheinander: Jede trägt ihren
            // eigenen `vorher`-Wert (§2.2a), und ein gemeinsames Ereignis für
            // mehrere Einheiten gibt es im Katalog nicht.
            for (const zeile of gewaehlte) {
              await laden.bediene(verschiebung(zeile.einheitId, zeile.abschnittId, ziel));
            }
            aufSchliessen();
            await laden.holeTabelle();
            await laden.holeBaum();
          })();
        }}
      >
        <label>
          Nach Abschnitt
          <Abschnittswahl wert={ziel} abschnitte={abschnitte} aufWahl={setzeZiel} />
        </label>
        <ul className="hinweistext">
          {gewaehlte.map((zeile) => (
            <li key={zeile.einheitId}>
              {zeile.anzeige} ({zeile.abschnittId})
            </li>
          ))}
        </ul>
      </Maske>
    );
  }

  if (maske === "aufteilen" && erste !== undefined) {
    const abgeteilt = {
      fuehrer: zahl(fuehrer),
      unterfuehrer: zahl(unterfuehrer),
      mannschaft: zahl(mannschaft),
    };
    const summe = abgeteilt.fuehrer + abgeteilt.unterfuehrer + abgeteilt.mannschaft;
    return (
      <Maske
        titel={`„${erste.anzeige}“ aufteilen`}
        bereit={bezeichnung.trim().length > 0 && summe > 0}
        aufAbbrechen={aufSchliessen}
        aufBestaetigen={() => {
          void schreibe(
            aufteilung({
              quelle: erste,
              neueEinheitId: neueId("E"),
              bezeichnung: bezeichnung.trim(),
              abgeteilteStaerke: abgeteilt,
              abschnittId: ziel === "" ? erste.abschnittId : ziel,
              reihenfolge: erste.reihenfolge + 1,
              organisation: text(erste.zellen["organisation"]?.wert) ?? "THW",
              ebene: text(erste.zellen["ebene"]?.wert) ?? "TRUPP",
            }),
          );
        }}
      >
        <label>
          Bezeichnung der neuen Einheit
          <input
            value={bezeichnung}
            onChange={(e) => {
              setzeBezeichnung(e.target.value);
            }}
          />
        </label>
        <Staerkefelder
          fuehrer={fuehrer}
          unterfuehrer={unterfuehrer}
          mannschaft={mannschaft}
          aufFuehrer={setzeFuehrer}
          aufUnterfuehrer={setzeUnterfuehrer}
          aufMannschaft={setzeMannschaft}
        />
        <label>
          Abschnitt
          <Abschnittswahl wert={ziel === "" ? erste.abschnittId : ziel} abschnitte={abschnitte} aufWahl={setzeZiel} />
        </label>
        <p className="hinweistext">
          Abgezogen werden {summe} von {String(erste.gesamt)}. Die Wirkung ist relativ (§5.4.2): Der
          Abzug steht an der neuen Einheit, nicht als neue Gesamtzahl an der Quelle — zwei
          gleichzeitige Aufteilungen derselben Einheit gehen so beide auf.
        </p>
      </Maske>
    );
  }

  if (maske === "zusammenfuehren" && erste !== undefined) {
    const quellen = gewaehlte.filter((zeile) => zeile.einheitId !== ziel);
    return (
      <Maske
        titel="Einheiten zusammenführen"
        bestaetigungstext="Zusammenführen"
        bereit={ziel !== "" && quellen.length > 0}
        aufAbbrechen={aufSchliessen}
        aufBestaetigen={() => {
          void schreibe(zusammenfuehrung(ziel, quellen));
        }}
      >
        <label>
          Ziel — die Einheit, die bestehen bleibt
          <select
            value={ziel}
            onChange={(e) => {
              setzeZiel(e.target.value);
            }}
          >
            <option value="">— bitte wählen —</option>
            {gewaehlte.map((zeile) => (
              <option key={zeile.einheitId} value={zeile.einheitId}>
                {zeile.anzeige} ({String(zeile.gesamt)})
              </option>
            ))}
          </select>
        </label>
        <p className="warnung">
          Das ist nicht umkehrbar (§5.9.2): Der Rückweg teilt aus dem Ziel eine Einheit mit
          <strong> neuer </strong>
          Kennung ab. Alles, was auf die aufgegangenen Einheiten zeigt — Aufträge, Anforderungen —,
          zeigt danach weiterhin dorthin.
        </p>
        <ul className="hinweistext">
          {quellen.map((zeile) => (
            <li key={zeile.einheitId}>
              geht auf: {zeile.anzeige} ({String(zeile.gesamt)})
            </li>
          ))}
        </ul>
      </Maske>
    );
  }

  if (maske === "entfernen" && erste !== undefined) {
    return (
      <Maske
        titel={`„${erste.anzeige}“ entfernen`}
        bestaetigungstext="Entfernen"
        bereit={grund.trim().length > 0}
        aufAbbrechen={aufSchliessen}
        aufBestaetigen={() => {
          void schreibe(entfernung(erste.einheitId, grund.trim()));
        }}
      >
        <label>
          Grund (Pflicht)
          <input
            value={grund}
            onChange={(e) => {
              setzeGrund(e.target.value);
            }}
          />
        </label>
        <p className="hinweistext">
          Entfernen ist kein Löschen (§5.4.5): Die Einheit bleibt in der Akte und im Tagebuch, fällt
          aber aus allen Summen. Wer das später liest, soll erfahren, warum eine gemeldete Kraft
          nicht mehr zählt — deshalb ist der Grund Pflicht (§2.4).
        </p>
      </Maske>
    );
  }

  return null;
}

function zahl(eingabe: string): number {
  const wert = Number.parseInt(eingabe, 10);
  return Number.isNaN(wert) || wert < 0 ? 0 : wert;
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

function Abschnittswahl({
  wert,
  abschnitte,
  aufWahl,
}: {
  readonly wert: string;
  readonly abschnitte: readonly { readonly id: string; readonly name: string; readonly kinder: readonly unknown[] }[];
  readonly aufWahl: (id: string) => void;
}): React.JSX.Element {
  const alle = flach(abschnitte);
  return (
    <select
      value={wert}
      onChange={(e) => {
        aufWahl(e.target.value);
      }}
    >
      <option value="">— bitte wählen —</option>
      {alle.map((eintrag) => (
        <option key={eintrag.id} value={eintrag.id}>
          {eintrag.name}
        </option>
      ))}
    </select>
  );
}

interface FlacherKnoten {
  readonly id: string;
  readonly name: string;
  readonly kinder: readonly unknown[];
}

function flach(knoten: readonly FlacherKnoten[]): readonly FlacherKnoten[] {
  return knoten.flatMap((eintrag) => [eintrag, ...flach(eintrag.kinder as readonly FlacherKnoten[])]);
}

function Staerkefelder({
  fuehrer,
  unterfuehrer,
  mannschaft,
  aufFuehrer,
  aufUnterfuehrer,
  aufMannschaft,
}: {
  readonly fuehrer: string;
  readonly unterfuehrer: string;
  readonly mannschaft: string;
  readonly aufFuehrer: (wert: string) => void;
  readonly aufUnterfuehrer: (wert: string) => void;
  readonly aufMannschaft: (wert: string) => void;
}): React.JSX.Element {
  return (
    <>
      <label>
        Führer
        <input value={fuehrer} onChange={(e) => { aufFuehrer(e.target.value); }} inputMode="numeric" />
      </label>
      <label>
        Unterführer
        <input value={unterfuehrer} onChange={(e) => { aufUnterfuehrer(e.target.value); }} inputMode="numeric" />
      </label>
      <label>
        Mannschaft
        <input value={mannschaft} onChange={(e) => { aufMannschaft(e.target.value); }} inputMode="numeric" />
      </label>
    </>
  );
}
