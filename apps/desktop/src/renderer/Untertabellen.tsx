/**
 * Fahrzeuge, Personen und Aufträge einer Einheit (M3.2).
 *
 * Die Excel führt beides als mehrzeiligen Freitext in den Spalten J und K
 * (`excel-domaenenmodell.md` §2). Dass hier Entitäten stehen und dort Text,
 * ist der eigentliche Fortschritt: Aus Text lässt sich keine Stückzahl
 * summieren und kein Fahrzeug einer anderen Einheit zuordnen.
 *
 * **Hier wird auch erfasst.** Je Untertabelle ein „+“ für einen neuen
 * Eintrag und je Zeile die Folgehandlung als Symbolknopf; die Masken stehen in
 * `UntertabellenErfassung.tsx` und `UntertabellenAktionen.tsx`. Die Spalten J
 * und K der Einheitentabelle zeigen das Ergebnis sofort, weil sie aus genau
 * diesen Einträgen abgeleitet sind.
 *
 * Sie werden **eigens geholt** und nicht mit jeder Tabellenzeile mitgeliefert
 * (M3.7): Eine Einheit mit vollständiger Personalerfassung führt bis zu
 * dreißig Personen, und 150 solcher Einheiten wären viertausend Datensätze
 * über die Prozessgrenze, um die einer einzigen aufgeklappten Zeile zu zeigen.
 */

import { useEffect, useState, type ReactNode } from "react";

import { einheitsteilTitel, zeitpunktText, type Untertabelle } from "@s1/domaene";

import { UntertabellenFolge, type Untertabellenmaske } from "./UntertabellenAktionen.js";
import { AuftragErfassung, FahrzeugErfassung, PersonErfassung } from "./UntertabellenErfassung.js";
import { fahrzeugWiederherstellen, personWiederherstellen } from "../kontrakt/einheitsteile.js";
import type { Entwurf } from "../kontrakt/index.js";
import { useEinheitsteilSchreiben } from "./einheitsteilSchreiben.js";
import { useLaden } from "./laden.js";

export interface UntertabellenEigenschaften {
  readonly einheitId: string;
}

type Fahrzeug = Untertabelle["fahrzeuge"][number];
type Auftrag = Untertabelle["auftraege"][number];

function fahrzeugText(fahrzeug: Fahrzeug): string {
  return [
    fahrzeug.typ,
    fahrzeug.bezeichnung === "" ? "" : ` — ${fahrzeug.bezeichnung}`,
    fahrzeug.kennzeichen === undefined ? "" : ` (${fahrzeug.kennzeichen})`,
    fahrzeug.funkrufname === undefined ? "" : ` · ${fahrzeug.funkrufname}`,
  ].join("");
}

function auftragZeit(auftrag: Auftrag): string {
  if (auftrag.von === undefined && auftrag.bis === undefined) return "";
  return `${zeitpunktText(auftrag.von)}–${zeitpunktText(auftrag.bis)} `;
}

export function Untertabellen({ einheitId }: UntertabellenEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const holeUntertabelle = laden.holeUntertabelle;
  const [maske, setzeMaske] = useState<Untertabellenmaske | undefined>(undefined);
  const schreibe = useEinheitsteilSchreiben(einheitId);

  useEffect(() => {
    void holeUntertabelle(einheitId);
    // Eine offene Maske gehört zur Einheit, für die sie geöffnet wurde.
    setzeMaske(undefined);
  }, [einheitId, holeUntertabelle]);

  const daten = laden.untertabelle?.einheitId === einheitId ? laden.untertabelle : undefined;
  if (daten === undefined) {
    return (
      <section aria-label="Untertabellen" className="untertabellen">
        <p className="hinweistext">Wird geladen …</p>
      </section>
    );
  }

  const zeile = laden.tabelle?.zeilen.find((eintrag) => eintrag.einheitId === einheitId);
  const schliesse = (): void => {
    setzeMaske(undefined);
  };
  const stelleHer = (entwurf: Entwurf): void => {
    void schreibe(entwurf).then((ausgang) => {
      if (ausgang !== undefined) laden.melde("warnung", ausgang);
    });
  };

  return (
    <section aria-label="Untertabellen" className="untertabellen">
      <Fahrzeugliste fahrzeuge={daten.fahrzeuge} aufMaske={setzeMaske} aufHerstellen={stelleHer} />
      <Personenliste personen={daten.personen} aufMaske={setzeMaske} aufHerstellen={stelleHer} />
      <Auftragsliste auftraege={daten.auftraege} aufMaske={setzeMaske} />

      {maske?.art === "auftrag" && (
        <AuftragErfassung
          einheitId={einheitId}
          aufSchliessen={schliesse}
          {...(zeile === undefined ? {} : { abschnittId: zeile.abschnittId, abschnittName: zeile.abschnittName })}
        />
      )}
      {maske?.art === "fahrzeug" && <FahrzeugErfassung einheitId={einheitId} aufSchliessen={schliesse} />}
      {maske?.art === "person" && <PersonErfassung einheitId={einheitId} aufSchliessen={schliesse} />}
      {maske !== undefined && "id" in maske && (
        <UntertabellenFolge einheitId={einheitId} maske={maske} aufSchliessen={schliesse} />
      )}
    </section>
  );
}

interface ListenEigenschaften {
  readonly aufMaske: (maske: Untertabellenmaske) => void;
}

interface HerstellbarEigenschaften extends ListenEigenschaften {
  readonly aufHerstellen: (entwurf: Entwurf) => void;
}

function Fahrzeugliste({
  fahrzeuge,
  aufMaske,
  aufHerstellen,
}: HerstellbarEigenschaften & { readonly fahrzeuge: Untertabelle["fahrzeuge"] }): React.JSX.Element {
  return (
    <Teil titel="Fahrzeuge" neu="Fahrzeug erfassen" aufNeu={() => { aufMaske({ art: "fahrzeug" }); }}>
      {fahrzeuge.length === 0 ? (
        <p className="hinweistext">Keine Fahrzeuge erfasst.</p>
      ) : (
        <ul>
          {fahrzeuge.map((fahrzeug) => (
            // §5.4.5 gilt auch hier: Entfernen ist kein Löschen. Ein
            // entfernter Eintrag bleibt sichtbar — sonst ließe er sich nicht
            // wiederherstellen, weil ihn niemand mehr sieht.
            <li key={fahrzeug.id} className={fahrzeug.entfernt ? "entfernt" : ""}>
              <span>{fahrzeugText(fahrzeug)}{fahrzeug.entfernt && " · entfernt"}</span>
              {fahrzeug.entfernt ? (
                <Symbol zeichen="↺" text="Fahrzeug wiederherstellen" auf={() => { aufHerstellen(fahrzeugWiederherstellen(fahrzeug.id)); }} />
              ) : (
                <Symbol zeichen="✕" text="Fahrzeug entfernen" auf={() => { aufMaske({ art: "fahrzeugEntfernen", id: fahrzeug.id, name: fahrzeugText(fahrzeug) }); }} />
              )}
            </li>
          ))}
        </ul>
      )}
    </Teil>
  );
}

function Personenliste({
  personen,
  aufMaske,
  aufHerstellen,
}: HerstellbarEigenschaften & { readonly personen: Untertabelle["personen"] }): React.JSX.Element {
  return (
    <Teil titel="Personen" neu="Person erfassen" aufNeu={() => { aufMaske({ art: "person" }); }}>
      {personen.length === 0 ? (
        <p className="hinweistext">Keine Personen erfasst — die Einheit meldet nur ihre Stärke.</p>
      ) : (
        <ul>
          {personen.map((person) => (
            <li key={person.id} className={person.entfernt ? "entfernt" : ""}>
              <span>
                {person.name}
                {person.rolle === undefined ? "" : ` · ${einheitsteilTitel(person.rolle)}`}
                {person.entfernt && " · entfernt"}
              </span>
              {person.entfernt ? (
                <Symbol zeichen="↺" text="Person wiederherstellen" auf={() => { aufHerstellen(personWiederherstellen(person.id)); }} />
              ) : (
                <Symbol zeichen="✕" text="Person entfernen" auf={() => { aufMaske({ art: "personEntfernen", id: person.id, name: person.name }); }} />
              )}
            </li>
          ))}
        </ul>
      )}
    </Teil>
  );
}

function Auftragsliste({
  auftraege,
  aufMaske,
}: ListenEigenschaften & { readonly auftraege: Untertabelle["auftraege"] }): React.JSX.Element {
  return (
    <Teil titel="Aufträge" neu="Auftrag erfassen" aufNeu={() => { aufMaske({ art: "auftrag" }); }}>
      {auftraege.length === 0 ? (
        <p className="hinweistext">Kein Auftrag erfasst.</p>
      ) : (
        <ul>
          {auftraege.map((auftrag) => (
            <li key={auftrag.id} className={auftrag.beendet ? "beendet" : ""}>
              <span>{auftragZeit(auftrag)}{auftrag.text}</span>
              {!auftrag.beendet && (
                <Symbol
                  zeichen="✓"
                  text="Auftrag erledigt"
                  auf={() => {
                    aufMaske({
                      art: "auftragErledigt",
                      id: auftrag.id,
                      name: auftrag.text,
                      ...(auftrag.bis === undefined ? {} : { bis: auftrag.bis }),
                    });
                  }}
                />
              )}
              <Symbol zeichen="✕" text="Auftrag zurücknehmen" auf={() => { aufMaske({ art: "auftragZurueck", id: auftrag.id, name: auftrag.text }); }} />
            </li>
          ))}
        </ul>
      )}
    </Teil>
  );
}

interface TeilEigenschaften {
  readonly titel: string;
  readonly neu: string;
  readonly aufNeu: () => void;
  readonly children: ReactNode;
}

function Teil({ titel, neu, aufNeu, children }: TeilEigenschaften): React.JSX.Element {
  return (
    <div>
      <h3>
        {titel} <Symbol zeichen="+" text={neu} auf={aufNeu} />
      </h3>
      {children}
    </div>
  );
}

/**
 * Ein Symbolknopf — platzsparend wie in der Tabelle, aber mit vollem Namen:
 * Der Bildschirmleser liest ihn vor, und die Maus zeigt ihn als Hinweis.
 */
function Symbol({ zeichen, text, auf }: { readonly zeichen: string; readonly text: string; readonly auf: () => void }): React.JSX.Element {
  return (
    <button type="button" className="symbolknopf" aria-label={text} title={text} onClick={auf}>
      {zeichen}
    </button>
  );
}
