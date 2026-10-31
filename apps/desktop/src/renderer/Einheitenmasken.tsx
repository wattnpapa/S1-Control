/**
 * Die fünf Masken der Einheitentabelle (M3.2).
 *
 * Anlegen (aus Vorlage oder ohne, in `EinheitAnlegen.tsx`; „Zeile kopieren“
 * ist dieselbe Maske mit Vorbelegung aus `einheitKopie.ts`), verschieben
 * (auch mehrere), aufteilen, zusammenführen, entfernen. Jede baut ihren Entwurf über die reinen
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

import type { Tabellenzeile } from "@s1/domaene";

import { AbloesungAnfordern } from "./AbloesungAnfordern.js";
import { EinheitAnlegen } from "./EinheitAnlegen.js";
import { kopieVorbelegung } from "./einheitKopie.js";
import { Maske } from "./Maske.js";
import { Abschnittswahl, Staerkefelder, zahl, type Staerkeeingabe } from "./Maskenfelder.js";
import type { Einheitenmaske } from "./Einheitentabelle.js";
import { aufteilung, entfernung, istStaerkeEingabe, verschiebung, zusammenfuehrung } from "../kontrakt/bedienschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
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
  const [ziel, setzeZiel] = useState(abschnittId ?? "");
  const [grund, setzeGrund] = useState("");
  const [bezeichnung, setzeBezeichnung] = useState("");
  const [staerke, setzeStaerke] = useState<Staerkeeingabe>({ fuehrer: "0", unterfuehrer: "0", mannschaft: "0" });

  useEffect(() => {
    // Beim Verschieben ist der gewählte Abschnitt der **Herkunftsort** der
    // markierten Einheiten; ihn als Ziel vorzubelegen hieße, ein Übernehmen
    // anzubieten, das nichts bewegt. Beim Anlegen ist er das richtige Ziel.
    setzeZiel(maske === "verschieben" ? "" : (abschnittId ?? ""));
  }, [abschnittId, maske]);

  const versuch = useAnlegeversuch();
  const verwerfeVersuch = versuch.verwerfe;
  // Kennungen und Hinweis gelten für **eine** Maske: Wer sie schließt und eine
  // andere öffnet, beginnt neu.
  useEffect(() => {
    verwerfeVersuch();
  }, [maske, verwerfeVersuch]);

  const erste = gewaehlte[0];
  const abschnitte = laden.baum?.baum ?? [];

  async function schreibe(entwurf: Parameters<typeof laden.bediene>[0]): Promise<void> {
    const ergebnis = await versuch.schreibe(entwurf);
    if (ergebnis?.art !== "geschrieben") return;
    aufSchliessen();
    await laden.holeTabelle();
    await laden.holeBaum();
  }

  if (maske === undefined) return null;

  // Die Ablösung hat ihre eigene Maske (M5.3); hier steht nur die Weiche.
  if (maske === "abloesung" && erste !== undefined) {
    return <AbloesungAnfordern zeile={erste} aufSchliessen={aufSchliessen} />;
  }

  // Der Schlüssel trennt Anlegen und Kopieren: Wer aus der offenen Kopie mit
  // Strg+N in die leere Anlage wechselt, soll keine Werte der Quelle erben.
  if (maske === "anlegen") {
    return <EinheitAnlegen key="anlegen" abschnittId={abschnittId} aufSchliessen={aufSchliessen} />;
  }

  if (maske === "kopieren" && erste !== undefined) {
    const vorhandene = (laden.tabelle?.zeilen ?? []).map((zeile) => text(zeile.zellen["bezeichnung"]?.wert) ?? zeile.anzeige);
    return (
      <EinheitAnlegen
        key={`kopie-${erste.einheitId}`}
        abschnittId={abschnittId}
        vorbelegung={kopieVorbelegung(erste, vorhandene)}
        aufSchliessen={aufSchliessen}
      />
    );
  }

  if (maske === "verschieben") {
    return (
      <Maske
        titel={`${String(gewaehlte.length)} Einheit(en) verschieben`}
        bereit={!versuch.gesperrt && ziel !== "" && gewaehlte.some((zeile) => zeile.abschnittId !== ziel)}
        aufAbbrechen={aufSchliessen}
        aufBestaetigen={() => {
          return (async () => {
            // Je Einheit ein Ereignis, und zwar nacheinander: Jede trägt ihren
            // eigenen `vorher`-Wert (§2.2a), und ein gemeinsames Ereignis für
            // mehrere Einheiten gibt es im Katalog nicht.
            for (const zeile of gewaehlte) {
              const ergebnis = await versuch.schreibe(verschiebung(zeile.einheitId, zeile.abschnittId, ziel));
              // Scheitert eine, bleibt die Maske offen; die bereits verschobenen
              // stehen schon am Ziel, die Wiederholung ändert an ihnen nichts.
              if (ergebnis?.art !== "geschrieben") return;
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
              {zeile.anzeige} (bisher {zeile.abschnittName})
            </li>
          ))}
        </ul>
        {versuch.anzeige}
      </Maske>
    );
  }

  if (maske === "aufteilen" && erste !== undefined) {
    const abgeteilt = {
      fuehrer: zahl(staerke.fuehrer),
      unterfuehrer: zahl(staerke.unterfuehrer),
      mannschaft: zahl(staerke.mannschaft),
    };
    const summe = abgeteilt.fuehrer + abgeteilt.unterfuehrer + abgeteilt.mannschaft;
    return (
      <Maske
        titel={`„${erste.anzeige}“ aufteilen`}
        bereit={!versuch.gesperrt && bezeichnung.trim().length > 0 && summe > 0 && Object.values(staerke).every(istStaerkeEingabe)}
        aufAbbrechen={aufSchliessen}
        aufBestaetigen={() => {
          return schreibe(
            aufteilung({
              quelle: erste,
              neueEinheitId: versuch.kennung(() => neueId("E")),
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
        <Staerkefelder wert={staerke} aufWert={setzeStaerke} />
        <label>
          Abschnitt
          <Abschnittswahl wert={ziel === "" ? erste.abschnittId : ziel} abschnitte={abschnitte} aufWahl={setzeZiel} />
        </label>
        <p className="hinweistext">
          Abgezogen werden {summe} von {String(erste.gesamt)}. Die Wirkung ist relativ (§5.4.2): Der
          Abzug steht an der neuen Einheit, nicht als neue Gesamtzahl an der Quelle — zwei
          gleichzeitige Aufteilungen derselben Einheit gehen so beide auf.
        </p>
        {versuch.anzeige}
      </Maske>
    );
  }

  if (maske === "zusammenfuehren" && erste !== undefined) {
    const quellen = gewaehlte.filter((zeile) => zeile.einheitId !== ziel);
    return (
      <Maske
        titel="Einheiten zusammenführen"
        bestaetigungstext="Zusammenführen"
        bereit={!versuch.gesperrt && ziel !== "" && quellen.length > 0}
        aufAbbrechen={aufSchliessen}
        aufBestaetigen={() => {
          return schreibe(zusammenfuehrung(ziel, quellen));
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
        {versuch.anzeige}
      </Maske>
    );
  }

  if (maske === "entfernen" && erste !== undefined) {
    return (
      <Maske
        titel={`„${erste.anzeige}“ entfernen`}
        bestaetigungstext="Entfernen"
        bereit={!versuch.gesperrt && grund.trim().length > 0}
        aufAbbrechen={aufSchliessen}
        aufBestaetigen={() => {
          return schreibe(entfernung(erste.einheitId, grund.trim()));
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
        {versuch.anzeige}
      </Maske>
    );
  }

  return null;
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}
