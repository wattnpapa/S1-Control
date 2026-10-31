/**
 * Der Verbindungsstatus als React-Hook – mit eigener Uhr.
 *
 * Die Bewertung hängt an der Uhrzeit („seit 12 s"); ohne Takt bliebe eine
 * Anzeige stehen, solange nichts Neues eintrifft – genau der Fehler, der die
 * Statuszeile grün ließ. Der Takt ist eine Sekunde, wie bei der Uhr des
 * Fensters in `Arbeitsplatz.tsx`.
 */

import { useEffect, useState } from "react";

import { bewerte, schreibenGesperrt, useVerbindung, type Verbindungsstatus } from "./verbindung.js";

export function useVerbindungsstatus(): Verbindungsstatus {
  const zustand = useVerbindung();
  const [jetzt, setzeJetzt] = useState(() => Date.now());
  useEffect(() => {
    const zeitgeber = setInterval(() => setzeJetzt(Date.now()), 1000);
    return () => clearInterval(zeitgeber);
  }, []);
  return bewerte(zustand, Math.max(jetzt, zustand.letzterKontakt ?? 0));
}

/**
 * Der Grund, warum Schreiben gerade gesperrt ist – oder `undefined`.
 * Formulare zeigen ihn neben dem gesperrten Knopf.
 */
export function useSchreibsperre(): string | undefined {
  const status = useVerbindungsstatus();
  const zustand = useVerbindung.getState();
  if (status.zustand !== "unterbrochen" || !schreibenGesperrt(zustand, Date.now())) return undefined;
  return "Keine Verbindung zum Dienst – Übernehmen ist gesperrt. Ihre Eingaben bleiben stehen; es wird automatisch neu verbunden.";
}
