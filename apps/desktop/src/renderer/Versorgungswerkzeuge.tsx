/**
 * Die Werkzeugzeile des Blattes „Versorgung" (S4.3, seit Runde 6 nach dem
 * Entwurf „Entlastung", 3.7) — was je Unteransicht neben dem Umschalter
 * steht.
 *
 * Je Unteransicht höchstens ein gefüllter Hauptknopf, und nur dort, wo er
 * der Hauptweg ist: In „Nächste 24 h" ist das „Bestellung …" für die erste
 * noch unbestellte Mahlzeit; in „Unterbringung" steht „Unterkunft anlegen"
 * in der Karte der Unterkünfte. Alles Seltene steht rechts im Menü „⋯": die
 * Mahlzeitenregel (bei Verpflegung und Vorausschau), „Ausgabestelle anlegen
 * …" (bei Verpflegung) und die Ausgabe der Unteransicht als PDF und als HTML
 * (Bestellliste, Vorausschau, Belegungsliste, Kraftstoffliste). Die
 * erzeugte Datei steht danach neben dem Menü.
 */

import { useState } from "react";

import type { Versorgungsblatt } from "@s1/domaene";

import { vorschlagAus } from "./Bestellkarte.js";
import { Klappmenue, Menueeintrag } from "./Klappmenue.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { useNurLesen } from "./Nurlesen.js";
import { AusgabestelleMaske, BestellMaske, MahlzeitenregelMaske } from "./Verpflegungsmasken.js";
import { Ausgabeeintraege, Ausgabepfad, useAusgabe, type Versorgungsausgabeart } from "./Versorgungsausgabe.js";
import { mahlzeitText } from "./versorgungstext.js";
import type { Unteransicht } from "./Versorgung.js";

type Offen = "regel" | "ausgabestelle" | "bestellung" | undefined;

/** Die Ausgabe je Unteransicht; „Bereiche · Schichten" hat keine. */
const AUSGABEN: Partial<Record<Unteransicht, { readonly ausgabe: Versorgungsausgabeart; readonly titel: string }>> = {
  verpflegung: { ausgabe: "bestellliste", titel: "Bestellliste" },
  vorausschau: { ausgabe: "vorausschau", titel: "Vorausschau" },
  unterbringung: { ausgabe: "belegung", titel: "Belegungsliste" },
  sofortbedarf: { ausgabe: "kraftstoff", titel: "Kraftstoffliste" },
};

interface MenueEigenschaften {
  readonly ansicht: Unteransicht;
  readonly blatt: Versorgungsblatt;
  readonly nurLesen: boolean;
  readonly aufMaske: (maske: Offen) => void;
}

/** „⋯": Regel, Ausgabestelle und die Ausgabe der Unteransicht. */
function Versorgungsmenue({ ansicht, blatt, nurLesen, aufMaske }: MenueEigenschaften): React.JSX.Element | null {
  const art = AUSGABEN[ansicht];
  const ausgabe = useAusgabe(art?.ausgabe ?? "bestellliste");
  const mitRegel = ansicht === "verpflegung" || ansicht === "vorausschau";
  const sperre = nurLesen ? TEXT_NUR_LESEN : undefined;
  if (art === undefined && !mitRegel) return null;
  return (
    <>
      <Klappmenue
        huelle="rechts"
        knopf={{ inhalt: "⋯", klasse: "menueknopf", beschriftung: "Weitere Schritte in der Versorgung", titel: [mitRegel ? "Mahlzeitenregel" : undefined, art === undefined ? undefined : `${art.titel} als Ausdruck`].filter(Boolean).join(", ") }}
        menue={{ beschriftung: "Versorgung", id: "versorgungsmenue" }}
        inhalt={(waehle) => (
          <>
            {mitRegel && (
              <Menueeintrag
                text={`Mahlzeitenregel: ${blatt.regelVorbelegung ? "Vorbelegung" : "eigene"} …`}
                titel={blatt.regeltext}
                sperre={sperre}
                aufWahl={waehle(() => { aufMaske("regel"); })}
              />
            )}
            {ansicht === "verpflegung" && <Menueeintrag text="Ausgabestelle anlegen …" sperre={sperre} aufWahl={waehle(() => { aufMaske("ausgabestelle"); })} />}
            {mitRegel && art !== undefined && <hr />}
            {art !== undefined && (
              <>
                <span className="titel" aria-hidden="true">
                  Ausdruck
                </span>
                <Ausgabeeintraege titel={art.titel} bedienung={ausgabe} waehle={waehle} />
              </>
            )}
          </>
        )}
      />
      <Ausgabepfad bedienung={ausgabe} />
    </>
  );
}

export function Werkzeuge({ ansicht, blatt }: { readonly ansicht: Unteransicht; readonly blatt: Versorgungsblatt }): React.JSX.Element {
  const nurLesen = useNurLesen();
  const [offen, setzeOffen] = useState<Offen>(undefined);
  const schliesse = (): void => setzeOffen(undefined);
  const stelle = blatt.vorausschau.mahlzeiten.findIndex((_, i) => blatt.bestellstand[i]?.bestellung === undefined);
  const unbestellt = stelle === -1 ? undefined : blatt.vorausschau.mahlzeiten[stelle];
  return (
    <>
      {ansicht === "vorausschau" && unbestellt !== undefined && !nurLesen && (
        <button type="button" className="haupt" onClick={() => setzeOffen("bestellung")}>
          Bestellung {mahlzeitText(unbestellt.mahlzeit)} {unbestellt.uhrzeit} …
        </button>
      )}
      <span className="werkzeugrechts">
        {/* Je Unteransicht ein eigenes Menü: Die erzeugte Datei der einen gehört nicht neben die andere. */}
        <Versorgungsmenue key={ansicht} ansicht={ansicht} blatt={blatt} nurLesen={nurLesen} aufMaske={setzeOffen} />
      </span>
      {offen === "regel" && <MahlzeitenregelMaske regel={blatt.plan.regel} vorbelegung={blatt.regelVorbelegung} aufSchliessen={schliesse} />}
      {offen === "ausgabestelle" && <AusgabestelleMaske aufSchliessen={schliesse} />}
      {offen === "bestellung" && unbestellt !== undefined && (
        <BestellMaske vorschlag={vorschlagAus(unbestellt)} ausgabestellen={blatt.ausgabestellen} aufSchliessen={schliesse} />
      )}
    </>
  );
}
