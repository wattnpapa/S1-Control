/**
 * „Neue Anforderung" im Blatt Anforderungen: die Felder und der Knopf „Anfordern".
 *
 * Das Blatt schließt nicht wie ein Dialog, deshalb gilt hier das Muster des
 * Anlegeversuchs (`Anlegeversuch.tsx`) mit zwei Besonderheiten: Die Felder
 * werden **erst nach bestätigtem Schreiben** geleert, und bei Fehler oder
 * unbekanntem Ausgang steht der Hinweis dauerhaft unter dem Knopf — samt
 * „Eingabe verwerfen" für den Fall, dass der Bediener die Liste geprüft hat und
 * neu beginnen will. Kennung und Zeitstempel bleiben bis dahin dieselben.
 */

import { useEffect, useRef, useState } from "react";

import type { Einheitenwahl } from "@s1/domaene";

import { TEXT_UNKLAR, useAnlegeversuch } from "./Anlegeversuch.js";
import {
  Anforderungsfelder,
  LEERE_ANFORDERUNG,
  anforderungAusEingabe,
  anforderungBereit,
  neueAnforderungsId,
} from "./Anforderungsformular.js";
import { anforderungEingabeFehler } from "./anforderungseingabepruefung.js";
import { TEXT_NUR_LESEN, TEXT_UNKLAR_VERWERFEN } from "./Maske.js";
import { useAnforderungsentwurf } from "./entwurf.js";
import { useLaden } from "./laden.js";

interface Anforderungskennung {
  readonly id: string;
  readonly angefordertAm: string;
}

/** Was der Knopf „Anfordern“ noch braucht, in Worten. */
export const TEXT_ANFORDERN_FEHLT =
  "Es fehlt noch: Ablösung für, vorgesehene Einheit oder Auftrag – die Kennung allein reicht nicht.";
/** Die Rückfrage, wenn die Kennung in der Liste schon steht. */
export const TEXT_KENNUNG_VORHANDEN = "Kennung bereits vorhanden, trotzdem anlegen?";

/** Eine Anlage, deren Ausgang beim Verwerfen unklar war: wartet auf die nächste geladene Liste. */
interface Ungeklaert {
  readonly id: string;
  readonly kennung: string;
  readonly liste: Anforderungsansicht | undefined;
}

type Anforderungsansicht = NonNullable<ReturnType<typeof useLaden.getState>["anforderungen"]>;

/** Fenstersache und nicht Komponentenzustand: überlebt den Wechsel des Blatts. */
let ungeklaert: readonly Ungeklaert[] = [];

/** Für Tests: vergisst die offenen Warnungen. */
export function vergesseUngeklaerte(): void {
  ungeklaert = [];
}

function normal(kennung: string): string {
  return kennung.trim().toLowerCase();
}

export function Anforderungsneu({ einheitenwahl }: { readonly einheitenwahl: readonly Einheitenwahl[] }): React.JSX.Element {
  // Der Entwurf liegt im Store (`entwurf.ts`): Er übersteht Blattwechsel und Reload.
  const [neu, setzeNeu] = useAnforderungsentwurf();
  const [laeuft, setzeLaeuft] = useState(false);
  const laeuftSofort = useRef(false);
  const letzteId = useRef("");
  const [eingabefehler, setzeEingabefehler] = useState<string | undefined>(undefined);
  const [doppeltFrage, setzeDoppeltFrage] = useState(false);
  const [verwerfenFrage, setzeVerwerfenFrage] = useState(false);
  const versuch = useAnlegeversuch();
  const beendet = useLaden((zustand) => (zustand.lagebild?.einsatzStatus ?? "AKTIV") !== "AKTIV");
  const liste = useLaden((zustand) => zustand.anforderungen);
  const gesperrt = versuch.gesperrt || beendet;
  const fehlt = !beendet && !anforderungBereit(neu);

  useGeklaerteMelden(liste);

  // Die Rückfrage gilt für die Kennung, die gefragt wurde.
  useEffect(() => {
    setzeDoppeltFrage(false);
  }, [neu.kennung]);

  function kennungSchonDa(): boolean {
    const gesucht = normal(neu.kennung);
    if (gesucht === "") return false;
    return (
      (liste?.zeilen ?? []).some((zeile) => normal(zeile.kennung) === gesucht) ||
      ungeklaert.some((eintrag) => normal(eintrag.kennung) === gesucht)
    );
  }

  async function lege(): Promise<void> {
    if (laeuftSofort.current || gesperrt) return;
    const unvollstaendig = anforderungEingabeFehler(neu, false);
    setzeEingabefehler(unvollstaendig);
    if (unvollstaendig !== undefined) return;
    // Dieselbe Kennung noch einmal: erst fragen, dann (mit dem zweiten Druck) anlegen.
    if (!doppeltFrage && !versuch.hinweis && kennungSchonDa()) {
      setzeDoppeltFrage(true);
      return;
    }
    const kennung = versuch.kennung<Anforderungskennung>(() => ({
      id: neueAnforderungsId(),
      angefordertAm: new Date().toISOString(),
    }));
    const entwurf = anforderungAusEingabe(neu, kennung.angefordertAm, kennung.id);
    if (entwurf === undefined) return;
    letzteId.current = kennung.id;
    laeuftSofort.current = true;
    setzeLaeuft(true);
    setzeDoppeltFrage(false);
    try {
      const ergebnis = await versuch.schreibe(entwurf);
      // Geleert wird nur nach bestätigtem Schreiben: sonst ist die Eingabe weg.
      if (ergebnis?.art === "geschrieben") {
        setzeNeu(LEERE_ANFORDERUNG);
        versuch.verwerfe();
      }
    } finally {
      laeuftSofort.current = false;
      setzeLaeuft(false);
    }
  }

  function verwirf(): void {
    // Nach „Unklar“ erst fragen; die Anlage bleibt als Hinweis in der Leiste,
    // bis die Liste neu geladen ist und die Kennung gefunden wurde oder nicht.
    const unklar = versuch.hinweis === TEXT_UNKLAR;
    if (unklar && !verwerfenFrage) {
      setzeVerwerfenFrage(true);
      return;
    }
    if (unklar) merkeUngeklaert({ id: letzteId.current, kennung: neu.kennung.trim(), liste });
    setzeVerwerfenFrage(false);
    setzeNeu(LEERE_ANFORDERUNG);
    versuch.verwerfe();
  }

  const knopfGrund = beendet ? undefined : fehlt ? TEXT_ANFORDERN_FEHLT : undefined;
  return (
    <div className="anforderungneu">
      <Anforderungsfelder
        eingabe={neu}
        aufEingabe={setzeNeu}
        einheitenwahl={einheitenwahl}
        aufEnter={() => void lege()}
      />
      <div className="anforderungknopf">
        <button
          type="button"
          disabled={gesperrt || laeuft}
          aria-busy={laeuft}
          title={versuch.sperre ?? (beendet ? TEXT_NUR_LESEN : knopfGrund)}
          onClick={() => void lege()}
        >
          {laeuft ? "…" : doppeltFrage ? "Trotzdem anlegen" : "Anfordern"}
        </button>
        {knopfGrund !== undefined && !laeuft && eingabefehler === undefined && (
          <span className="hinweistext" data-testid="anfordern-fehlt">
            {knopfGrund}
          </span>
        )}
      </div>
      {eingabefehler !== undefined && fehlt && (
        <p className="hinweistext" role="alert">
          {eingabefehler}
        </p>
      )}
      {doppeltFrage && (
        <p className="warnung" role="alert">
          {TEXT_KENNUNG_VORHANDEN}
        </p>
      )}
      {versuch.anzeige}
      {beendet && (
        <p role="alert" className="hinweistext">
          {TEXT_NUR_LESEN}. Eingaben werden nicht gespeichert.
        </p>
      )}
      {verwerfenFrage && (
        <p className="warnung" role="alert">
          {TEXT_UNKLAR_VERWERFEN}
        </p>
      )}
      {versuch.hinweis !== undefined && (
        <button type="button" onClick={verwirf}>
          {verwerfenFrage ? "Trotzdem verwerfen" : "Eingabe verwerfen"}
        </button>
      )}
    </div>
  );
}

/** Merkt eine Anlage mit unklarem Ausgang und trägt sie als Hinweis in die Leiste ein. */
function merkeUngeklaert(eintrag: Ungeklaert): void {
  ungeklaert = [...ungeklaert, eintrag];
  const name = eintrag.kennung === "" ? "ohne Kennung" : `„${eintrag.kennung}“`;
  useLaden.getState().melde("warnung", `Anforderung ${name}: Unklar, ob gespeichert – bitte Liste prüfen.`);
}

/**
 * Sobald die Liste nach dem Verwerfen neu geladen wurde, sagt ein Hinweis, ob
 * die Anforderung dort steht. Erst dann gilt die Anlage als geklärt.
 */
function useGeklaerteMelden(liste: Anforderungsansicht | undefined): void {
  const zeilen = liste?.zeilen;
  useEffect(() => {
    const offen = ungeklaert.filter((eintrag) => eintrag.liste !== liste);
    if (offen.length === 0 || zeilen === undefined) return;
    ungeklaert = ungeklaert.filter((eintrag) => !offen.includes(eintrag));
    for (const eintrag of offen) {
      const da = zeilen.some((zeile) => zeile.id === eintrag.id);
      const name = eintrag.kennung === "" ? "ohne Kennung" : `„${eintrag.kennung}“`;
      useLaden
        .getState()
        .melde(
          da ? "info" : "warnung",
          da
            ? `Anforderung ${name} ist gespeichert.`
            : `Anforderung ${name} wurde nicht gefunden – sie ist nicht gespeichert, bitte neu anfordern.`,
        );
    }
  }, [liste, zeilen]);
}
