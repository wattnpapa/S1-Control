/**
 * „Status und Einbuchen …“ für eine oder mehrere markierte Einheiten.
 *
 * Gefordert im Stab-Review vom 22.11.2026 (Führungsgehilfe S1, FA-FG-1 und
 * FA-FG-2): am Meldetisch eine Einheit in einem Zug einbuchen (Abschnitt,
 * Status, Eintreffzeit, Schicht) und zum Schichtwechsel mehrere Einheiten
 * auf einmal umstellen. Vorher waren das rund 15 Handgriffe an vier Stellen
 * und je Einheit drei Klicks.
 *
 * Geschrieben wird je Einheit nacheinander, jeder Schritt mit seinem eigenen
 * Vorher-Wert (`einbuchungsschritte`). Scheitert einer, bleibt die Maske
 * offen; was schon geschrieben ist, ändert eine Wiederholung nicht.
 */

import { useState } from "react";

import { EINHEIT_STATUS, SCHICHTEN, projektion, schichtTitel, statusTitel, type Tabellenzeile } from "@s1/domaene";

import { einbuchungsschritte, type Einbuchungsstand } from "../kontrakt/einbuchungsschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";

/** Bei diesen Status ist eine Einheit vor Ort; dann wird die Eintreffzeit vorgeschlagen. */
const VOR_ORT: ReadonlySet<string> = new Set(["EINSATZBEREIT", "IM_EINSATZ", "RUHE", "NICHT_EINSATZBEREIT"]);

function wert(zeile: Tabellenzeile, schluessel: string): string | undefined {
  const w = zeile.zellen[schluessel]?.wert;
  return typeof w === "string" && w !== "" ? w : undefined;
}

/** Der Stand einer Tabellenzeile, wie der Schrittbauer ihn braucht. */
export function standAus(zeile: Tabellenzeile): Einbuchungsstand {
  return {
    einheitId: zeile.einheitId,
    abschnittId: zeile.abschnittId,
    status: wert(zeile, "status"),
    schicht: wert(zeile, "schicht"),
    eingetroffenAm: wert(zeile, "eingetroffenAm"),
  };
}

interface StatusmaskeEigenschaften {
  readonly gewaehlte: readonly Tabellenzeile[];
  readonly aufSchliessen: () => void;
  readonly aufGeschrieben?: (() => void) | undefined;
}

export function Statusmaske({ gewaehlte, aufSchliessen, aufGeschrieben }: StatusmaskeEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const versuch = useAnlegeversuch();
  const [status, setzeStatus] = useState("EINSATZBEREIT");
  const [abschnittId, setzeAbschnittId] = useState("");
  const [schicht, setzeSchicht] = useState("");
  const [eintreffen, setzeEintreffen] = useState(true);
  const abschnitte = projektion.baumZeilen(laden.baum?.baum ?? []);
  const mitEintreffen = eintreffen && VOR_ORT.has(status);

  async function schreibe(): Promise<void> {
    const zeit = versuch.kennung(() => new Date().toISOString());
    const wahl = { status, abschnittId, schicht, ...(mitEintreffen ? { eingetroffenAm: zeit } : {}) };
    for (const zeile of gewaehlte) {
      for (const schritt of einbuchungsschritte(standAus(zeile), wahl)) {
        const ergebnis = await versuch.schreibe(schritt);
        if (ergebnis?.art !== "geschrieben") return;
      }
    }
    aufSchliessen();
    aufGeschrieben?.();
    await laden.holeTabelle();
    await laden.holeBaum();
  }

  return (
    <Maske
      titel={gewaehlte.length === 1 ? `Status und Einbuchen · ${gewaehlte[0]?.anzeige ?? ""}` : `Status und Einbuchen · ${String(gewaehlte.length)} Einheiten`}
      bestaetigungstext="Übernehmen"
      bereit={!versuch.gesperrt && gewaehlte.length > 0}
      bereitGrund="Einheiten wählen"
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={schreibe}
    >
      {versuch.anzeige}
      <label>
        Status
        <select value={status} onChange={(e) => setzeStatus(e.target.value)}>
          {EINHEIT_STATUS.map((s) => (
            <option key={s} value={s}>{statusTitel(s)}</option>
          ))}
        </select>
      </label>
      <label>
        Abschnitt
        <select value={abschnittId} onChange={(e) => setzeAbschnittId(e.target.value)}>
          <option value="">— Abschnitt behalten —</option>
          {abschnitte.map((k) => (
            <option key={k.id} value={k.id}>{"  ".repeat(k.tiefe)}{k.name}</option>
          ))}
        </select>
      </label>
      <label>
        Schicht
        <select value={schicht} onChange={(e) => setzeSchicht(e.target.value)}>
          <option value="">— Schicht behalten —</option>
          {SCHICHTEN.map((s) => (
            <option key={s} value={s}>{schichtTitel(s)}</option>
          ))}
        </select>
      </label>
      <label className="schalter">
        <input type="checkbox" checked={mitEintreffen} disabled={!VOR_ORT.has(status)} onChange={(e) => setzeEintreffen(e.target.checked)} />
        Eintreffzeit „jetzt“ eintragen, wo noch keine steht
      </label>
      <ul className="hinweistext">
        {gewaehlte.map((zeile) => (
          <li key={zeile.einheitId}>
            {zeile.anzeige} (bisher {statusTitel(wert(zeile, "status") ?? "") || "ohne Status"}, {zeile.abschnittName})
          </li>
        ))}
      </ul>
    </Maske>
  );
}
