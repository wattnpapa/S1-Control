/**
 * Die Maske „Ablösung anfordern“ an einer Einheitenzeile (M5.3).
 *
 * In der Excel ist das der Griff in die Spalten N und O derselben Zeile.
 * Hier entsteht dafür eine Anforderung im Blatt Anforderungen, mit der
 * markierten Einheit als abzulösender. Die Maske statt eines Blattwechsels,
 * weil sie kleiner ist: Wer in der Tabelle arbeitet, bleibt dort, und die
 * Spalten der Ressourcenplanung füllen sich, sobald die Anforderung steht.
 */

import { useState } from "react";

import type { Tabellenzeile } from "@s1/domaene";

import { Anforderungsfelder, LEERE_ANFORDERUNG, anforderungAusEingabe } from "./Anforderungsformular.js";
import { anforderungEingabeFehler } from "./anforderungseingabepruefung.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { neueAnforderungsId } from "./Anforderungsformular.js";
import { Maske } from "./Maske.js";

export interface AbloesungAnfordernEigenschaften {
  readonly zeile: Tabellenzeile;
  readonly aufSchliessen: () => void;
}

export function AbloesungAnfordern({ zeile, aufSchliessen }: AbloesungAnfordernEigenschaften): React.JSX.Element {
  const [eingabe, setzeEingabe] = useState({ ...LEERE_ANFORDERUNG, abzuloesendeEinheitId: zeile.einheitId });

  const fehler = anforderungEingabeFehler(eingabe, true);
  const versuch = useAnlegeversuch();

  return (
    <Maske
      bereit={fehler === undefined && !versuch.gesperrt}
      titel={`Ablösung für „${zeile.anzeige}“ anfordern`}
      bestaetigungstext="Anfordern"
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={async () => {
        if (fehler !== undefined) return;
        // Kennung und Zeit je Dialoginstanz: Die Wiederholung ist dieselbe Anforderung.
        const k = versuch.kennung(() => ({ id: neueAnforderungsId(), am: new Date().toISOString() }));
        const entwurf = anforderungAusEingabe(eingabe, k.am, k.id);
        if (entwurf === undefined) return;
        const ergebnis = await versuch.schreibe(entwurf);
        if (ergebnis?.art === "geschrieben") aufSchliessen();
      }}
    >
      <Anforderungsfelder eingabe={eingabe} aufEingabe={setzeEingabe} />
      {versuch.anzeige}
      {fehler !== undefined && (
        <p className="hinweistext" role="alert">
          {fehler}
        </p>
      )}
      {zeile.abloesung !== undefined && (
        <p className="warnung">
          Für diese Einheit steht schon „{zeile.abloesung.text}“ (Anforderungs-ID{" "}
          {zeile.zellen["anforderungsKennung"]?.text ?? ""}). Eine zweite Anforderung ersetzt sie in der
          Tabelle; die erste bleibt im Blatt Anforderungen.
        </p>
      )}
      <p className="hinweistext">
        Die Anforderung erscheint im Blatt Anforderungen. Zusage und Eintreffen werden dort
        eingetragen; die Spalten der Ressourcenplanung dieser Zeile folgen von selbst.
      </p>
    </Maske>
  );
}
