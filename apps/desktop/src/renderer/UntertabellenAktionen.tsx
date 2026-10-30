/**
 * Die Folgehandlungen in den Untertabellen: Auftrag erledigt, Auftrag
 * zurücknehmen, Fahrzeug oder Person entfernen (§5.5, §5.6).
 *
 * **Erledigt ist nicht zurückgenommen.** Ein erledigter Auftrag bekommt sein
 * Ende und bleibt in der Spalte K stehen — er ist Teil des Einsatzverlaufs.
 * Ein zurückgenommener war ein Versehen und fällt aus der Spalte; im Tagebuch
 * steht er weiter.
 *
 * **Entfernen fragt nach dem Grund**, weil §2.4 ihn für Fahrzeug und Person
 * zur Pflicht macht. Entfernen ist kein Löschen (§5.4.5): Der Eintrag bleibt
 * durchgestrichen in der Untertabelle und lässt sich dort wiederherstellen.
 */

import { useState } from "react";

import { zeitpunktText } from "@s1/domaene";

import { zeitpunktAusEingabe } from "../kontrakt/bedienschritte.js";
import {
  auftragBeenden,
  auftragZuruecknehmen,
  fahrzeugEntfernen,
  personEntfernen,
} from "../kontrakt/einheitsteile.js";
import type { Entwurf } from "../kontrakt/index.js";
import { Maske } from "./Maske.js";
import { Meldungszeile, useAbschluss } from "./UntertabellenErfassung.js";
import { Zeitfeld } from "./Zeitfeld.js";

/** Was in den Untertabellen gerade erfasst oder bearbeitet wird. */
export type Untertabellenmaske =
  | { readonly art: "auftrag" }
  | { readonly art: "fahrzeug" }
  | { readonly art: "person" }
  | { readonly art: "auftragErledigt"; readonly id: string; readonly name: string; readonly bis?: string }
  | { readonly art: "auftragZurueck"; readonly id: string; readonly name: string }
  | { readonly art: "fahrzeugEntfernen"; readonly id: string; readonly name: string }
  | { readonly art: "personEntfernen"; readonly id: string; readonly name: string };

export interface FolgeEigenschaften {
  readonly einheitId: string;
  readonly maske: Extract<Untertabellenmaske, { readonly id: string }>;
  readonly aufSchliessen: () => void;
}

export function UntertabellenFolge({ einheitId, maske, aufSchliessen }: FolgeEigenschaften): React.JSX.Element {
  if (maske.art === "auftragErledigt") {
    return <AuftragErledigt einheitId={einheitId} maske={maske} aufSchliessen={aufSchliessen} />;
  }
  return <GrundMaske einheitId={einheitId} maske={maske} aufSchliessen={aufSchliessen} />;
}

function AuftragErledigt({ einheitId, maske, aufSchliessen }: FolgeEigenschaften): React.JSX.Element {
  // Vorbelegt mit „jetzt“: Meist wird ein Auftrag gemeldet, wenn er fertig
  // ist. Wer ihn nachträgt, überschreibt die Zeit.
  const [ende, setzeEnde] = useState(() => zeitpunktText(new Date().toISOString()));
  const { meldung, setzeMeldung, abschliessen } = useAbschluss(einheitId, aufSchliessen);
  const bis = maske.art === "auftragErledigt" ? maske.bis : undefined;

  return (
    <Maske
      titel={`Auftrag erledigt: ${maske.name}`}
      bestaetigungstext="Erledigt"
      bereit={ende.trim() !== ""}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={async () => {
        const zeit = zeitpunktAusEingabe(ende);
        if (zeit === undefined) {
          setzeMeldung("Das Ende ist keine lesbare Zeitangabe — z. B. „16:00“ oder „30.10. 16:00“.");
          return;
        }
        await abschliessen(auftragBeenden(maske.id, bis, zeit));
      }}
    >
      <label>
        Ende
        <Zeitfeld wert={ende} aufAenderung={setzeEnde} />
      </label>
      <Meldungszeile meldung={meldung} />
    </Maske>
  );
}

const GRUND_TEXTE = {
  auftragZurueck: {
    titel: "Auftrag zurücknehmen",
    knopf: "Zurücknehmen",
    hinweis:
      "Für einen Auftrag, der so nie erteilt wurde. Er fällt aus der Spalte „Aufträge“, bleibt aber im Tagebuch. Ein fertiger Auftrag wird nicht zurückgenommen, sondern als erledigt gesetzt.",
  },
  fahrzeugEntfernen: {
    titel: "Fahrzeug entfernen",
    knopf: "Entfernen",
    hinweis: "Entfernen ist kein Löschen: Das Fahrzeug bleibt durchgestrichen stehen und lässt sich wiederherstellen.",
  },
  personEntfernen: {
    titel: "Person entfernen",
    knopf: "Entfernen",
    hinweis: "Entfernen ist kein Löschen: Die Person bleibt durchgestrichen stehen und lässt sich wiederherstellen.",
  },
} as const;

function grundEntwurf(maske: FolgeEigenschaften["maske"], grund: string): Entwurf {
  if (maske.art === "fahrzeugEntfernen") return fahrzeugEntfernen(maske.id, grund);
  if (maske.art === "personEntfernen") return personEntfernen(maske.id, grund);
  return auftragZuruecknehmen(maske.id, grund);
}

function GrundMaske({ einheitId, maske, aufSchliessen }: FolgeEigenschaften): React.JSX.Element {
  const [grund, setzeGrund] = useState("");
  const { meldung, abschliessen } = useAbschluss(einheitId, aufSchliessen);
  const texte = GRUND_TEXTE[maske.art === "auftragErledigt" ? "auftragZurueck" : maske.art];
  // §2.4: Pflicht beim Entfernen, beim Zurücknehmen eines Auftrags erwünscht.
  const pflicht = maske.art !== "auftragZurueck";

  return (
    <Maske
      titel={`${texte.titel}: ${maske.name}`}
      bestaetigungstext={texte.knopf}
      bereit={!pflicht || grund.trim() !== ""}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={() => abschliessen(grundEntwurf(maske, grund))}
    >
      <label>
        {pflicht ? "Grund (Pflicht)" : "Grund"}
        <input value={grund} onChange={(e) => { setzeGrund(e.target.value); }} />
      </label>
      <p className="hinweistext">{texte.hinweis}</p>
      <Meldungszeile meldung={meldung} />
    </Maske>
  );
}
