/**
 * Die Maske „Funk und Erreichbarkeit" einer Einheit (KONZEPT-FUNKPLAN.md §6,
 * Option 5d): Hauptrufgruppe, weitere Rufgruppen, Funkrufname,
 * Erreichbarkeit, Funkhinweis und darunter der Tagebuchauszug zu Funk.
 *
 * Das Konzept sieht einen vierten Karteireiter einer Maske „Einheit
 * bearbeiten" vor; eine solche Maske gibt es nicht — die Stammdaten der
 * Einheit werden in den Zellen der Einheitentabelle bearbeitet. Diese Maske
 * ist deshalb der Reiter für sich, geöffnet aus dem Blatt „Funkplan" und aus
 * der Lage (Knopf „Funk …" bei einer markierten Einheit).
 *
 * Wie jede Maske: Enter übernimmt, Esc verwirft. Sie hält, was sie beim
 * Öffnen sah, und schreibt je geändertem Feld einen Schritt mit diesem
 * Vorher-Wert (`funkmaskenwerte.ts`); ein Kollege, der dasselbe Feld
 * inzwischen anders gesetzt hat, wird nicht still überschrieben. Solange sie
 * offen ist, sperrt sie die Einheit für die anderen Arbeitsplätze.
 */

import { useState } from "react";

import type { Funkteilnehmer, Rufgruppenkarte } from "@s1/domaene";

import { Ableitungsfeld } from "./Ableitungsfeld.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Funkauszug } from "./Funkauszug.js";
import { funkeingabeAus, funkentwuerfe, type Funkeingabe } from "./funkmaskenwerte.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";
import { Rufgruppenchips } from "./Rufgruppenchips.js";
import { wahltext } from "./Rufgruppenzelle.js";
import { useSperreHalten } from "./useBearbeitungssperre.js";
import { useFunkplanansicht } from "./useFunkplanansicht.js";

export interface FunkUndErreichbarkeitEigenschaften {
  /** Der Teilnehmer, wie der Funkplan ihn beim Öffnen zeigte — die Vorher-Werte. */
  readonly teilnehmer: Funkteilnehmer;
  readonly rufgruppen: readonly Rufgruppenkarte[];
  /** Beendeter Einsatz: Felder gesperrt, die Maske zeigt nur. */
  readonly nurLesen?: boolean;
  readonly aufSchliessen: () => void;
}

/** Die Auswahl der Hauptrufgruppe: geltende Gruppen, die gesetzte auch aufgelöst oder unbekannt, und „keine". */
function Hauptrufgruppe(props: { readonly t: Funkteilnehmer; readonly rufgruppen: readonly Rufgruppenkarte[]; readonly wert: string; readonly aufWert: (wert: string) => void }): React.JSX.Element {
  const geltend = props.rufgruppen.filter((r) => !r.aufgeloest);
  const gesetzt = props.t.rufgruppeId;
  const fremd = gesetzt !== undefined && !geltend.some((r) => r.rufgruppeId === gesetzt);
  return (
    <label>
      Hauptrufgruppe <small>über diese Gruppe ruft die FüSt</small>
      <select value={props.wert} onChange={(e) => props.aufWert(e.target.value)}>
        {geltend.map((r) => (
          <option key={r.rufgruppeId} value={r.rufgruppeId}>
            {wahltext(r)}
          </option>
        ))}
        {fremd && <option value={gesetzt}>{`${props.t.rufgruppe ?? gesetzt} (${props.t.rufgruppeAufgeloest ? "aufgelöst" : "unbekannt"})`}</option>}
        <option value="">— keine Rufgruppe —</option>
      </select>
    </label>
  );
}

export function FunkUndErreichbarkeit({ teilnehmer: t, rufgruppen, nurLesen = false, aufSchliessen }: FunkUndErreichbarkeitEigenschaften): React.JSX.Element {
  const [eingabe, setzeEingabe] = useState<Funkeingabe>(() => funkeingabeAus(t));
  const versuch = useAnlegeversuch();
  useSperreHalten(nurLesen ? undefined : t.einheitId);
  const setze = <F extends keyof Funkeingabe>(feld: F, wert: Funkeingabe[F]): void => setzeEingabe((bisher) => ({ ...bisher, [feld]: wert }));

  async function schreibe(): Promise<void> {
    for (const entwurf of funkentwuerfe(t, eingabe)) {
      // Geht ein Schritt nicht durch, bleibt die Maske offen; was schon
      // geschrieben ist, steht im Tagebuch, die Wiederholung ändert daran nichts.
      if ((await versuch.schreibe(entwurf))?.art !== "geschrieben") return;
    }
    aufSchliessen();
  }

  return (
    <Maske titel={`„${t.einheit}“ — Funk und Erreichbarkeit`} bereit={!versuch.gesperrt && !nurLesen} aufAbbrechen={aufSchliessen} aufBestaetigen={schreibe}>
      <p className="hinweistext funkmaskenkopf">
        {t.bereich}
        {t.funkrufname === "" ? "" : ` · ${t.funkrufname}`}
      </p>
      <fieldset className="funkmaske" disabled={nurLesen}>
        <Hauptrufgruppe t={t} rufgruppen={rufgruppen} wert={eingabe.rufgruppeId} aufWert={(wert) => setze("rufgruppeId", wert)} />
        <Rufgruppenchips gewaehlt={eingabe.weitere} rufgruppen={rufgruppen} bekannt={t.weitereRufgruppen} hauptgruppe={eingabe.rufgruppeId} aufWahl={(liste) => setze("weitere", liste)} />
        <Ableitungsfeld
          titel="Funkrufname"
          erklaerung="Vorbelegung aus dem Fahrzeug"
          angezeigt={t.funkrufname}
          quelle="aus dem Fahrzeug"
          ueberschrieben={t.funkrufnameOverride !== undefined}
          wert={eingabe.funkrufname}
          aufWert={(wert) => setze("funkrufname", wert)}
        />
        <Ableitungsfeld
          titel="Erreichbarkeit"
          erklaerung="Führungskraft und Kontakte"
          angezeigt={t.erreichbarkeit}
          quelle="aus Führungskraft und Kontakten"
          ueberschrieben={t.erreichbarkeitOverride !== undefined}
          wert={eingabe.erreichbarkeit}
          aufWert={(wert) => setze("erreichbarkeit", wert)}
        />
        <label>
          Funkhinweis <small>frei · für die Sprechfunker</small>
          <textarea rows={3} value={eingabe.funkhinweis} onChange={(e) => setze("funkhinweis", e.target.value)} />
        </label>
      </fieldset>
      <Funkauszug einheitId={t.einheitId} />
      <p className="hinweistext">Jede Änderung ist ein Ereignis mit dem Wert, den diese Maske beim Öffnen sah; hat ein anderer Arbeitsplatz das Feld inzwischen geändert, wird nicht still überschrieben.</p>
      {versuch.anzeige}
    </Maske>
  );
}

/**
 * Die Maske aus der Lage: Die Einheitentabelle kennt den Funkplan nicht,
 * also holt die Maske ihn sich. Eine Einheit, die nicht im Plan steht
 * (entfernt, beendet), hat nichts zu rufen.
 */
export function FunkUndErreichbarkeitAusLage({ einheitId, aufSchliessen }: { readonly einheitId: string; readonly aufSchliessen: () => void }): React.JSX.Element | null {
  const akteId = useLaden((z) => z.akteId);
  const lageZeiger = useLaden((z) => z.lagebild?.lageZeiger);
  const einsatzStatus = useLaden((z) => z.lagebild?.einsatzStatus ?? "AKTIV");
  // Den Zeiger nur beim Öffnen: Ein neuer Stand darf die offene Maske nicht neu befüllen.
  const [zeiger] = useState(lageZeiger);
  const plan = useFunkplanansicht(akteId, zeiger).ansicht?.plan;
  if (plan === undefined) return null;
  const alle = [...plan.rufgruppen.flatMap((r) => r.teilnehmer), ...plan.ohneRufgruppe];
  const t = alle.find((eintrag) => eintrag.einheitId === einheitId);
  if (t === undefined) {
    return (
      <Maske titel="Funk und Erreichbarkeit" bereit={false} bereitGrund="Die Einheit steht nicht im Funkplan (entfernt oder beendet)." aufAbbrechen={aufSchliessen} aufBestaetigen={aufSchliessen}>
        <p className="hinweistext">Im Funkplan stehen nur Einheiten, die zählen oder erwartet werden.</p>
      </Maske>
    );
  }
  return <FunkUndErreichbarkeit teilnehmer={t} rufgruppen={plan.rufgruppen} nurLesen={einsatzStatus !== "AKTIV"} aufSchliessen={aufSchliessen} />;
}
