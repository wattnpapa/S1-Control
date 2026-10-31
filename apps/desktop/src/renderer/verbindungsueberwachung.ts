/**
 * Die Herzschlag-Abfrage der Web-Brücke.
 *
 * `EventSource` meldet einen Abriss nicht verlässlich (eine halb tote
 * Verbindung bleibt „offen"), und ohne Eingabe läuft kein Ruf. Deshalb fragt
 * die Brücke den Dienst alle paar Sekunden an `gesundheit` — dem einen Weg,
 * den auch die Anmeldung nicht sperrt. Antwort heißt Kontakt, keine Antwort
 * Ausfall. Bei Ausfall wird dichter gefragt, damit die Wiederverbindung schnell
 * auffällt. Dazu hört die Überwachung auf `online`/`offline` des Browsers: Das
 * sind schnelle Hinweise, aber keine Wahrheit; die Abfrage entscheidet.
 */

export const TAKT_VERBUNDEN_MS = 5_000;
export const TAKT_AUSFALL_MS = 2_000;
export const ZEITLIMIT_MS = 4_000;

export interface Meldeziel {
  meldeKontakt(jetzt: number): void;
  meldeAusfall(jetzt: number): void;
}

export interface UeberwachungsAbhaengigkeiten {
  readonly hole: typeof fetch;
  readonly uhr: () => number;
  readonly ziel: Meldeziel;
  /** Browser-Ereignisse `online`/`offline`; fehlt außerhalb eines Fensters. */
  readonly fenster?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
}

/** Startet die Überwachung und liefert das Anhalten. */
export function starteUeberwachung(a: UeberwachungsAbhaengigkeiten): () => void {
  let angehalten = false;
  let zeitgeber: ReturnType<typeof setTimeout> | undefined;
  let laeuft = false;

  const planen = (ms: number): void => {
    if (angehalten) return;
    if (zeitgeber !== undefined) clearTimeout(zeitgeber);
    zeitgeber = setTimeout(() => void frage(), ms);
  };

  const frage = async (): Promise<void> => {
    if (angehalten || laeuft) return;
    laeuft = true;
    let erreicht: boolean;
    try {
      const antwort = await a.hole("gesundheit", {
        cache: "no-store",
        signal: AbortSignal.timeout(ZEITLIMIT_MS),
      });
      erreicht = antwort.ok;
    } catch {
      erreicht = false;
    }
    laeuft = false;
    if (angehalten) return;
    if (erreicht) a.ziel.meldeKontakt(a.uhr());
    else a.ziel.meldeAusfall(a.uhr());
    planen(erreicht ? TAKT_VERBUNDEN_MS : TAKT_AUSFALL_MS);
  };

  const beiOffline = (): void => {
    a.ziel.meldeAusfall(a.uhr());
    planen(TAKT_AUSFALL_MS);
  };
  const beiOnline = (): void => {
    planen(0);
  };
  a.fenster?.addEventListener("offline", beiOffline);
  a.fenster?.addEventListener("online", beiOnline);
  planen(TAKT_VERBUNDEN_MS);

  return () => {
    angehalten = true;
    if (zeitgeber !== undefined) clearTimeout(zeitgeber);
    a.fenster?.removeEventListener("offline", beiOffline);
    a.fenster?.removeEventListener("online", beiOnline);
  };
}
