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
import { Maske } from "./Maske.js";
import { useLaden } from "./laden.js";

export interface AbloesungAnfordernEigenschaften {
  readonly zeile: Tabellenzeile;
  readonly aufSchliessen: () => void;
}

export function AbloesungAnfordern({ zeile, aufSchliessen }: AbloesungAnfordernEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [eingabe, setzeEingabe] = useState({ ...LEERE_ANFORDERUNG, abzuloesendeEinheitId: zeile.einheitId });

  return (
    <Maske
      titel={`Ablösung für „${zeile.anzeige}“ anfordern`}
      bestaetigungstext="Anfordern"
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={async () => {
        const entwurf = anforderungAusEingabe(eingabe, new Date().toISOString());
        if (entwurf === undefined) return;
        const ergebnis = await laden.bediene(entwurf);
        if (ergebnis?.art === "geschrieben") aufSchliessen();
      }}
    >
      <Anforderungsfelder eingabe={eingabe} aufEingabe={setzeEingabe} />
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
