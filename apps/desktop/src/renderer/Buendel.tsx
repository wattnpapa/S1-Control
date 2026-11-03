/**
 * Die Bündeldatei (M6.3) — der Meldeweg ohne Netz.
 *
 * Ein Meldekopf steht am Bereitstellungsraum, oft ohne Verbindung zur
 * Führungsstelle. Er sammelt dort Bögen in der Erfassungsbogen-App, und
 * irgendwann fährt jemand mit einem USB-Stick hinüber. Dreißig Bögen einzeln
 * zu scannen wäre eine halbe Stunde Arbeit für etwas, das eine Datei kann.
 *
 * Seit Runde 6 (Entwurf „Entlastung", 3.7) steht das nicht mehr als Zeile
 * über dem Korb: „Bündel einlesen …" ist der Hauptknopf des Korbs und öffnet
 * {@link Buendelmaske} mit Abschnitt und Datei, „Meldungen als Datei
 * speichern" steht im Menü „⋯" ({@link useBuendelSchreiben}).
 *
 * **Der Griff ins Dateisystem geschieht hier und nicht im Worker.** Das
 * Dateifeld des Browsers liefert den Text; der Worker bekommt Text und keinen
 * Pfad. Ein Worker, der Pfade öffnet, die ihm jemand nennt, ist eine Tür, die
 * niemand braucht.
 */

import { useRef, useState } from "react";

import type { Buendelergebnis } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";

/**
 * Eine zweimal eingelesene Datei ist kein Fehler, sondern ein Vorgang ohne
 * Wirkung. Genau das muss dastehen, sonst hält der Bediener es für einen
 * Fehlschlag.
 */
export function buendeltext(ergebnis: Buendelergebnis): string {
  const nicht = ergebnis.uebersprungen > 0 ? `, ${String(ergebnis.uebersprungen)} nicht lesbar` : "";
  return `${String(ergebnis.aufgenommen)} aufgenommen, ${String(ergebnis.bekannt)} schon bekannt${nicht}`;
}

export interface BuendelmaskeEigenschaften {
  readonly aufSchliessen: () => void;
  /** Was eingelesen wurde, als Satz für die Statuszeile des Korbs. */
  readonly aufErgebnis: (text: string) => void;
}

/** Abschnitt und Datei wählen, dann „Einlesen". */
export function Buendelmaske({ aufSchliessen, aufErgebnis }: BuendelmaskeEigenschaften): React.JSX.Element {
  const baum = useLaden((z) => z.baum?.baum);
  const lieseBuendel = useLaden((z) => z.lieseBuendel);
  const [abschnittId, setzeAbschnittId] = useState("");
  const [datei, setzeDatei] = useState<File | undefined>(undefined);
  const dateifeld = useRef<HTMLInputElement>(null);
  const grund = abschnittId === "" ? "Zuerst den Abschnitt wählen, in den die Meldungen kommen" : "Datei wählen";

  const lies = async (): Promise<void> => {
    if (datei === undefined || abschnittId === "") return;
    const ergebnis = await lieseBuendel(await datei.text(), abschnittId);
    if (ergebnis === undefined) return;
    aufErgebnis(buendeltext(ergebnis));
    aufSchliessen();
  };

  return (
    <Maske
      titel="Bündel einlesen"
      bestaetigungstext="Einlesen"
      bereit={abschnittId !== "" && datei !== undefined}
      bereitGrund={grund}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={lies}
    >
      <p className="hinweistext">
        Eine Bündeldatei (.json) vom Meldekopf, etwa vom USB-Stick: Alle Meldungen darin kommen in den gewählten Abschnitt. Schon bekannte
        Meldungen werden erkannt und nicht doppelt aufgenommen.
      </p>
      <label>
        In Abschnitt
        <select value={abschnittId} onChange={(e) => setzeAbschnittId(e.target.value)}>
          <option value="">Abschnitt wählen …</option>
          {(baum ?? []).map((knoten) => (
            <option key={knoten.id} value={knoten.id}>
              {knoten.name}
            </option>
          ))}
        </select>
      </label>
      {/* Das Dateifeld des Browsers beschriftet sich in dessen Sprache
          („Choose File / No file chosen“); deshalb ein deutscher Knopf, der es
          öffnet, und der Dateiname daneben. */}
      <div className="dateiwahl">
        <button type="button" onClick={() => dateifeld.current?.click()}>
          Datei wählen …
        </button>
        <span className="hinweistext">{datei?.name ?? "Keine Datei gewählt"}</span>
        <input
          ref={dateifeld}
          type="file"
          accept="application/json,.json"
          aria-label="Meldungsdatei"
          style={{ display: "none" }}
          onChange={(e) => setzeDatei(e.target.files?.[0])}
        />
      </div>
    </Maske>
  );
}

/** „Meldungen als Datei speichern": schreibt nach `ausgaben\` und nennt den Pfad. */
export function useBuendelSchreiben(aufErgebnis: (text: string) => void): () => void {
  const schreibeBuendel = useLaden((z) => z.schreibeBuendel);
  return () => {
    void schreibeBuendel().then((ergebnis) => {
      if (ergebnis !== undefined) aufErgebnis(`Geschrieben: ${ergebnis.pfad}`);
    });
  };
}
