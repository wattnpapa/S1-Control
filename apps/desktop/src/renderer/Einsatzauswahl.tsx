/**
 * Die Einsatzauswahl — das, was vor dem ersten Einsatz zu tun ist (Entwurf
 * „Entlastung", 3.8, Option 6g).
 *
 * Die Einsätze stehen zuerst und groß: je Einsatz eine Zeile mit „Öffnen"
 * als Hauptweg (`Einsatzliste.tsx`), im Kopf der Karte „Neuer Einsatz …",
 * der eine Maske mit Name, Datum und Stammdaten öffnet (`Einsatzanlage.tsx`).
 * Daneben „Demo-Einsatz": Er legt ohne Maske einen Einsatz an, der zwölf
 * Stunden vor jetzt beginnt und schon Einheiten, Abschnitte, Funkplan,
 * Nachrichten und Versorgung trägt — zum Zeigen, Ausprobieren und Prüfen.
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

const TEXT_OHNE_SHARE = "Zuerst unten den Share-Pfad eintragen";

/** Der Tooltip des Knopfs „Demo-Einsatz" — sagt, was entsteht, bevor es entsteht. */
export const TEXT_DEMO =
  "Legt einen Übungseinsatz mit Beispieldaten an und öffnet ihn: Beginn vor zwölf Stunden, mit Einheiten, Abschnitten, Funkplan, Nachrichten und Versorgung";

function Einsatzkarte(): React.JSX.Element {
  const einsaetze = useLaden((z) => z.einsaetze);
  const share = useLaden((z) => z.einstellungen.sharePfad);
  const beschaeftigt = useLaden((z) => z.beschaeftigt);
  const oeffneEinsatz = useLaden((z) => z.oeffneEinsatz);
  const legeDemoEinsatzAn = useLaden((z) => z.legeDemoEinsatzAn);
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
          className="rechts"
          disabled={ohneShare || beschaeftigt}
          title={ohneShare ? TEXT_OHNE_SHARE : TEXT_DEMO}
          onClick={() => void legeDemoEinsatzAn()}
        >
          Demo-Einsatz
        </button>
        <button
          type="button"
          className="haupt"
          disabled={ohneShare || beschaeftigt}
          title={ohneShare ? TEXT_OHNE_SHARE : "Name, Datum und Stammdaten eintragen und den Einsatz anlegen"}
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
