/**
 * Die Zeile „Letzter Kontakt" der Maske „Funk und Erreichbarkeit" (Option 5d,
 * Funkplan F3): die Marke des letzten Kontakts, „kein Kontakt" daneben und
 * die Knöpfe „Funkprobe jetzt: Kontakt" und „kein Kontakt …".
 *
 * Die Knöpfe schreiben sofort und nicht erst mit „Übernehmen": Eine Funkprobe
 * ist eine Beobachtung, keine Änderung eines Feldes, und sie gilt, auch wenn
 * die übrige Maske verworfen wird. Nach dem Schreiben führt die Zeile ihre
 * Anzeige selbst nach — die Maske hält den Teilnehmer, wie er beim Öffnen war.
 * Das Alter steht gegen die Minutenuhr der Oberfläche.
 */

import type { Funkteilnehmer, KeinKontaktGemeldet, LetzterKontakt } from "@s1/domaene";

import { KeinKontaktmarke, Kontaktmarke, teilnehmerKontaktmarke } from "./Funkmarken.js";
import { useMinutenuhr } from "./Ressourcenmarken.js";
import type { GeschriebeneProbe } from "./useFunkprobe.js";

/** Was die Zeile zeigt: der Kontakt und „kein Kontakt", nach eigenen Proben nachgeführt. */
export interface Kontaktanzeige {
  readonly letzterKontakt?: LetzterKontakt;
  readonly keinKontaktGemeldet?: KeinKontaktGemeldet;
}

/** Die Anzeige beim Öffnen: was der Funkplan zum Teilnehmer wusste. */
export function kontaktanzeigeVon(t: Funkteilnehmer): Kontaktanzeige {
  return {
    ...(t.letzterKontakt === undefined ? {} : { letzterKontakt: t.letzterKontakt }),
    ...(t.keinKontaktGemeldet === undefined ? {} : { keinKontaktGemeldet: t.keinKontaktGemeldet }),
  };
}

/** Die Anzeige nach einer eigenen Probe: „Kontakt" ersetzt den Kontakt und tilgt „kein Kontakt". */
export function nachProbe(anzeige: Kontaktanzeige, probe: GeschriebeneProbe): Kontaktanzeige {
  if (probe.ergebnis === "KONTAKT") return { letzterKontakt: { art: "FUNKPROBE", zeitpunkt: probe.wert.zeitpunkt, ueberSchwelle: false } };
  return { ...anzeige, keinKontaktGemeldet: probe.wert };
}

export interface KontaktzeileEigenschaften {
  readonly t: Funkteilnehmer;
  readonly anzeige: Kontaktanzeige;
  readonly schwelleMinuten: number;
  readonly aufKontakt: () => void;
  readonly aufKeinKontakt: () => void;
}

export function Kontaktzeile({ t, anzeige, schwelleMinuten, aufKontakt, aufKeinKontakt }: KontaktzeileEigenschaften): React.JSX.Element {
  const jetzt = useMinutenuhr();
  const marke = teilnehmerKontaktmarke({ status: t.status, ...anzeige }, jetzt, schwelleMinuten);
  return (
    <div className="kontaktzeile" role="group" aria-label="Letzter Kontakt">
      <span className="feldtitel">
        Letzter Kontakt <small>Funkprobe oder Statusmeldung · Bernstein ab {schwelleMinuten} min</small>
      </span>
      <span className="kontaktmarken">
        <Kontaktmarke marke={marke} />
        <KeinKontaktmarke t={anzeige} />
      </span>
      <button type="button" onClick={aufKontakt}>
        Funkprobe jetzt: Kontakt
      </button>
      <button type="button" onClick={aufKeinKontakt}>
        kein Kontakt …
      </button>
    </div>
  );
}
