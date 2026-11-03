/**
 * Die Einsatzauswahl — das, was vor dem ersten Einsatz zu tun ist (Entwurf
 * „Entlastung", 3.8, Option 6g).
 *
 * Die Einsätze stehen zuerst und groß: je Einsatz eine Zeile mit „Öffnen"
 * als Hauptweg (`Einsatzliste.tsx`), im Kopf der Karte „Neuer Einsatz …",
 * der eine Maske mit Name, Datum und Stammdaten öffnet (`Einsatzanlage.tsx`).
 * Darunter eingeklappt „Dieser Arbeitsplatz" mit „Ändern"
 * (`Arbeitsplatzeinstellungen.tsx`).
 *
 * Eine Zustandsmarke „Share erreichbar" steht ohne Einsatz nicht im
 * Kopfband: Ob der Share erreichbar ist, meldet der Dienst nur im Lagebild
 * eines offenen Einsatzes. Ein leerer Share zeigt sich hier als leere Liste
 * mit dem Satz, was zu tun ist.
 */

import { useState } from "react";

import { Arbeitsplatzzeile } from "./Arbeitsplatzeinstellungen.js";
import { Einsatzanlage } from "./Einsatzanlage.js";
import { Einsatzliste } from "./Einsatzliste.js";
import { useLaden } from "./laden.js";

function Einsatzkarte(): React.JSX.Element {
  const einsaetze = useLaden((z) => z.einsaetze);
  const share = useLaden((z) => z.einstellungen.sharePfad);
  const beschaeftigt = useLaden((z) => z.beschaeftigt);
  const oeffneEinsatz = useLaden((z) => z.oeffneEinsatz);
  const [anlage, setzeAnlage] = useState(false);
  const ohneShare = share === "";
  return (
    <section aria-label="Einsätze" className="karte einsatzkarte">
      <div className="einheitenkopf">
        <h2>
          Einsätze {!ohneShare && <small>auf {share}</small>}
        </h2>
        <button
          type="button"
          className="haupt rechts"
          disabled={ohneShare || beschaeftigt}
          title={ohneShare ? "Zuerst unten den Share-Pfad eintragen" : "Name, Datum und Stammdaten eintragen und den Einsatz anlegen"}
          onClick={() => setzeAnlage(true)}
        >
          Neuer Einsatz …
        </button>
      </div>
      {einsaetze.length === 0 ? (
        <p className="hinweistext">{ohneShare ? "Zuerst unten den Share-Pfad eintragen." : "Unter diesem Pfad liegt noch kein Einsatz."}</p>
      ) : (
        <Einsatzliste einsaetze={einsaetze} aufOeffnen={(ordner) => void oeffneEinsatz(ordner)} />
      )}
      <p className="hinweistext fussnote">
        Beendete und archivierte Einsätze stehen unten und blass; sie lassen sich ansehen, aber nicht mehr ändern. Status und Einheiten nennt die
        Liste so, wie dieser Arbeitsplatz den Einsatz zuletzt gesehen hat.
      </p>
      {anlage && <Einsatzanlage aufSchliessen={() => setzeAnlage(false)} />}
    </section>
  );
}

export function Auswahl(): React.JSX.Element {
  return (
    <div className="startflaeche">
      <Einsatzkarte />
      <Arbeitsplatzzeile />
    </div>
  );
}
