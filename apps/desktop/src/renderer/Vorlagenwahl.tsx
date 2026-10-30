/**
 * Die Vorlagenwahl der Anlegemaske — Suche, Katalog, Organisation, Liste.
 *
 * Drei Kataloge mit zusammen über neunzig Einträgen passen in kein
 * Auswahlfeld, das man noch lesen kann. Die Excel löst das mit dem Blatt: Man
 * scrollt zum Kopiervorlagen-Bereich und sucht mit dem Auge. Hier filtert
 * Tippen, und die Liste bleibt kurz.
 *
 * **Tastatur:** Der Fokus steht im Suchfeld. Pfeil auf/ab markiert, Enter
 * wählt die markierte Vorlage. Ein zweites Enter auf der gewählten bestätigt
 * die Maske — Enter fällt dann zum Formular durch. Wer also „z sb“, Enter,
 * Enter tippt, hat den Zug angelegt, ohne die Hand von der Tastatur zu nehmen.
 */

import { useState } from "react";

import {
  ORGANISATIONEN,
  gefuellteKataloge,
  organisationTitel,
  sucheVorlagen,
  vorlagenOrganisationen,
  vorlagenkatalogTitel,
  vorlagen,
  type EinheitVorlage,
  type Organisation,
  type Vorlagenkatalog,
} from "@s1/domaene";

/** Die Soll-Stärke als „Fü/UFü/He“, mit „Annahme“, wo sie keine Quellenzahl ist. */
export function sollText(eintrag: EinheitVorlage): string {
  const soll = eintrag.sollStaerke;
  if (soll === undefined) return "";
  const zahlen = `${String(soll.fuehrer)}/${String(soll.unterfuehrer)}/${String(soll.mannschaft)}`;
  return eintrag.sollStaerkeAnnahme === true ? `${zahlen}, Annahme` : zahlen;
}

/** Nur Organisationen, unter denen es überhaupt eine Vorlage gibt. */
function organisationenMitVorlage(): readonly Organisation[] {
  const vorhanden = new Set(vorlagen().flatMap(vorlagenOrganisationen));
  return ORGANISATIONEN.filter((organisation) => vorhanden.has(organisation));
}

export interface VorlagenwahlEigenschaften {
  readonly gewaehlt: string;
  readonly aufWahl: (vorlageId: string) => void;
}

export function Vorlagenwahl({ gewaehlt, aufWahl }: VorlagenwahlEigenschaften): React.JSX.Element {
  const [text, setzeText] = useState("");
  const [katalog, setzeKatalog] = useState<Vorlagenkatalog | "">("");
  const [organisation, setzeOrganisation] = useState<Organisation | "">("");
  const [markiert, setzeMarkiert] = useState(0);

  const treffer = sucheVorlagen({
    text,
    ...(katalog === "" ? {} : { katalog }),
    ...(organisation === "" ? {} : { organisation }),
  });
  const marke = Math.min(markiert, Math.max(treffer.length - 1, 0));
  const markierte = treffer[marke];

  function neuGefiltert(): void {
    setzeMarkiert(0);
  }

  function aufTaste(ereignis: React.KeyboardEvent<HTMLInputElement>): void {
    if (ereignis.key === "ArrowDown" || ereignis.key === "ArrowUp") {
      ereignis.preventDefault();
      const schritt = ereignis.key === "ArrowDown" ? 1 : -1;
      setzeMarkiert(Math.min(Math.max(marke + schritt, 0), Math.max(treffer.length - 1, 0)));
      return;
    }
    // Enter wählt nur, wenn es etwas Neues zu wählen gibt; sonst bestätigt es
    // die Maske wie überall.
    if (ereignis.key === "Enter" && markierte !== undefined && markierte.id !== gewaehlt) {
      ereignis.preventDefault();
      aufWahl(markierte.id);
    }
  }

  return (
    <div className="vorlagenwahl">
      <label>
        Vorlage suchen
        <input
          type="search"
          value={text}
          role="combobox"
          aria-expanded="true"
          aria-controls="vorlagenliste"
          aria-activedescendant={markierte === undefined ? undefined : `vorlage-${markierte.id}`}
          placeholder="z. B. Z SB, Löschgruppe, Tauchen"
          onChange={(e) => {
            setzeText(e.target.value);
            neuGefiltert();
          }}
          onKeyDown={aufTaste}
        />
      </label>
      <div className="vorlagenfilter">
        <label>
          Nur Katalog
          <select
            value={katalog}
            onChange={(e) => {
              setzeKatalog(e.target.value as Vorlagenkatalog | "");
              neuGefiltert();
            }}
          >
            <option value="">alle</option>
            {gefuellteKataloge().map((eintrag) => (
              <option key={eintrag} value={eintrag}>
                {vorlagenkatalogTitel(eintrag)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nur Organisation
          <select
            value={organisation}
            onChange={(e) => {
              setzeOrganisation(e.target.value as Organisation | "");
              neuGefiltert();
            }}
          >
            <option value="">alle</option>
            {organisationenMitVorlage().map((eintrag) => (
              <option key={eintrag} value={eintrag}>
                {organisationTitel(eintrag)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Vorlagenliste treffer={treffer} marke={marke} gewaehlt={gewaehlt} aufWahl={aufWahl} />
    </div>
  );
}

function Vorlagenliste({
  treffer,
  marke,
  gewaehlt,
  aufWahl,
}: {
  readonly treffer: readonly EinheitVorlage[];
  readonly marke: number;
  readonly gewaehlt: string;
  readonly aufWahl: (vorlageId: string) => void;
}): React.JSX.Element {
  if (treffer.length === 0) return <p className="hinweistext">Keine Vorlage passt. „Ohne Vorlage“ legt eine freie Zeile an.</p>;
  return (
    <ul id="vorlagenliste" className="vorlagenliste" role="listbox" aria-label="Vorlagen">
      {treffer.map((eintrag, index) => (
        <li
          key={eintrag.id}
          id={`vorlage-${eintrag.id}`}
          role="option"
          aria-selected={eintrag.id === gewaehlt}
          data-markiert={index === marke ? "ja" : undefined}
          onMouseDown={(e) => {
            // Der Fokus bleibt im Suchfeld, damit Enter danach bestätigt.
            e.preventDefault();
          }}
          onClick={() => {
            aufWahl(eintrag.id);
          }}
        >
          <strong>{eintrag.bezeichnung}</strong>
          {eintrag.lang === undefined ? "" : ` — ${eintrag.lang}`}
          <span className="vorlagenmerkmal">
            {[organisationTitel(eintrag.organisation), sollText(eintrag)].filter((teil) => teil !== "").join(" · ")}
          </span>
        </li>
      ))}
    </ul>
  );
}
