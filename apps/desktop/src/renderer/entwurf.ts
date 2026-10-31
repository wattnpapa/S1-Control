/**
 * Der Entwurf des Anforderungsformulars — im Store statt in der Komponente.
 *
 * Wer mitten in der Eingabe das Blatt wechselt (um nachzusehen, ob die
 * Einheit schon da ist), kommt zurück und findet die Felder leer — die
 * Komponente war inzwischen ausgehängt. Der Entwurf liegt deshalb hier, im
 * Fenster-Zustand, und zusätzlich in `sessionStorage`, damit er einen Reload
 * übersteht. Leer wird er, wenn das Formular ihn leert (erfolgreiches Anlegen,
 * „Eingabe verwerfen“): Der Setter mit leerer Eingabe löscht auch den Merker.
 */

import { useCallback } from "react";
import { create } from "zustand";

import { LEERE_ANFORDERUNG, type Anforderungseingabe } from "./Anforderungsformular.js";
import { useLaden } from "./laden.js";
import { ladeEntwurf, loescheEntwurf, speichereEntwurf } from "./sitzung.js";

interface Entwurfsspeicher {
  readonly ordner: string;
  readonly eingabe: Anforderungseingabe;
}

function vorbelegung(): Entwurfsspeicher {
  const gemerkt = ladeEntwurf<Partial<Anforderungseingabe>>();
  return gemerkt === undefined
    ? { ordner: "", eingabe: LEERE_ANFORDERUNG }
    : { ordner: gemerkt.ordner, eingabe: { ...LEERE_ANFORDERUNG, ...gemerkt.eingabe } };
}

export const useEntwurf = create<Entwurfsspeicher>(() => vorbelegung());

/** Ist die Eingabe leer? Dann gibt es nichts zu retten. */
export function istLeer(eingabe: Anforderungseingabe): boolean {
  return Object.values(eingabe).every((wert) => wert.trim() === "");
}

/** Gibt es einen Entwurf mit Inhalt, der bei einem Verlassen der Seite verloren ginge? */
export function hatOffenenEntwurf(): boolean {
  return !istLeer(useEntwurf.getState().eingabe);
}

/** Setzt den Entwurf zurück (für Tests und den Wechsel des Einsatzes). */
export function vergesseEntwurf(): void {
  loescheEntwurf();
  useEntwurf.setState({ ordner: "", eingabe: LEERE_ANFORDERUNG });
}

/**
 * Wie `useState` für das Anforderungsformular: Wert und Setter.
 *
 * Der Entwurf gehört zu einem Einsatz; im anderen Einsatz beginnt das Formular
 * leer, und der alte Entwurf wird erst beim ersten Tippen überschrieben.
 */
export function useAnforderungsentwurf(): readonly [Anforderungseingabe, (eingabe: Anforderungseingabe) => void] {
  const einsatz = useLaden((zustand) => zustand.lagebild?.einsatzId ?? "");
  const speicher = useEntwurf();
  const eingabe = speicher.ordner === einsatz || speicher.ordner === "" ? speicher.eingabe : LEERE_ANFORDERUNG;
  const setze = useCallback(
    (neu: Anforderungseingabe) => {
      if (istLeer(neu)) loescheEntwurf();
      else speichereEntwurf(einsatz, neu);
      useEntwurf.setState({ ordner: einsatz, eingabe: neu });
    },
    [einsatz],
  );
  return [eingabe, setze];
}
