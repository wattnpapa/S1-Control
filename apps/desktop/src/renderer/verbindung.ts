/**
 * Der ehrliche Verbindungsstatus zwischen Browser und Dienst.
 *
 * Die Statuszeile zeigte bei Netzverlust weiter „Share erreichbar (gerade
 * eben)", weil sie nur den Stand **hinter** dem Dienst kennt (Dienst↔Share).
 * Die Verbindung davor (Browser↔Dienst) hat bisher niemand gemessen. Dieser
 * Speicher hält den letzten erfolgreichen Kontakt und den letzten Ausfall; die
 * Web-Brücke füttert ihn (Rufe, Strom, Herzschlag-Abfrage), die Oberfläche
 * liest ihn. In Electron füttert ihn niemand: `aktiv` bleibt `false`, und die
 * Oberfläche zeigt nichts Zusätzliches.
 *
 * Die Bewertung ({@link bewerte}) ist eine reine Funktion von Zustand und
 * Uhrzeit und damit ohne Zeitgeber prüfbar.
 */

import { create } from "zustand";

/** Ab so vielen Millisekunden ohne Kontakt gilt die Verbindung als unterbrochen. */
export const SCHWELLE_UNTERBROCHEN_MS = 10_000;
/** Ab dieser Dauer wird aus gelb rot. */
export const SCHWELLE_ROT_MS = 60_000;

/** Klartext für Fehlermeldungen; feste Texte, damit sie nach der Wiederverbindung gezielt verschwinden. */
export const MELDUNG_KEINE_VERBINDUNG = "Keine Verbindung zum Dienst.";
export const MELDUNG_NICHT_GESPEICHERT =
  "Keine Verbindung zum Dienst. Ihre Eingabe wurde nicht gespeichert. Sie bleibt im Formular stehen und kann nach der Wiederverbindung übernommen werden.";
export const MELDUNG_UNKLAR = "Unklar, ob gespeichert – bitte Liste prüfen.";

/** Die Meldungen, die mit der Wiederverbindung überholt sind. */
export const VERBINDUNGSMELDUNGEN: readonly string[] = [
  MELDUNG_KEINE_VERBINDUNG,
  MELDUNG_NICHT_GESPEICHERT,
  MELDUNG_UNKLAR,
];

export interface VerbindungsZustand {
  /** Hat die Web-Brücke die Überwachung gestartet? Sonst ist nichts zu zeigen. */
  readonly aktiv: boolean;
  readonly letzterKontakt: number | undefined;
  /** Wann der erste Fehlschlag der laufenden Störung war; `undefined` = keine Störung. */
  readonly ausfallSeit: number | undefined;
  /** Zählt Wiederverbindungen; die Oberfläche lädt bei jeder Änderung neu. */
  readonly wiederverbunden: number;
  readonly wiederverbundenUm: number | undefined;
  /** Zählt Schreibrufe mit unbekanntem Ausgang. */
  readonly unklar: number;
}

export interface Verbindungsspeicher extends VerbindungsZustand {
  starte(jetzt: number): void;
  meldeKontakt(jetzt: number): void;
  /** Kontakt über den Mitteilungsstrom: hebt eine festgestellte Störung nicht auf. */
  meldeStromKontakt(jetzt: number): void;
  meldeAusfall(jetzt: number): void;
  meldeUnklar(): void;
  zuruecksetzen(): void;
}

const ANFANG: VerbindungsZustand = {
  aktiv: false,
  letzterKontakt: undefined,
  ausfallSeit: undefined,
  wiederverbunden: 0,
  wiederverbundenUm: undefined,
  unklar: 0,
};

export const useVerbindung = create<Verbindungsspeicher>((setze, hole) => ({
  ...ANFANG,
  starte(jetzt) {
    if (hole().aktiv) return;
    setze({ aktiv: true, letzterKontakt: jetzt });
  },
  meldeKontakt(jetzt) {
    const z = hole();
    const warGestoert = z.ausfallSeit !== undefined || bewerte(z, jetzt).zustand === "unterbrochen";
    setze({
      aktiv: true,
      letzterKontakt: jetzt,
      ausfallSeit: undefined,
      ...(warGestoert ? { wiederverbunden: z.wiederverbunden + 1, wiederverbundenUm: jetzt } : {}),
    });
  },
  meldeStromKontakt(jetzt) {
    // Der Strom kann weiterliefern, während Rufe und Herzschlag scheitern (halb
    // tote Verbindung, Proxy, Browser-Offline mit offenem Strom). Würde jede
    // Mitteilung die Störung beenden, finge die Zählung „seit N s" sekündlich
    // neu an und die rote Stufe käme nie. Nur ein beantworteter Ruf heilt.
    if (hole().ausfallSeit !== undefined) return;
    hole().meldeKontakt(jetzt);
  },
  meldeAusfall(jetzt) {
    const z = hole();
    if (z.ausfallSeit !== undefined) return;
    setze({ aktiv: true, ausfallSeit: jetzt, letzterKontakt: z.letzterKontakt ?? jetzt });
  },
  meldeUnklar() {
    setze({ unklar: hole().unklar + 1 });
  },
  zuruecksetzen() {
    setze({ ...ANFANG });
  },
}));

export type Verbindungsstatus =
  | { readonly zustand: "unbekannt" }
  | { readonly zustand: "verbunden"; readonly letzterKontakt: number }
  | {
      readonly zustand: "unterbrochen";
      readonly stufe: "gelb" | "rot";
      /** Millisekunden seit dem letzten erfolgreichen Kontakt. */
      readonly seitMs: number;
    };

/** Bewertet den Zustand zur Zeit `jetzt`. */
export function bewerte(zustand: VerbindungsZustand, jetzt: number): Verbindungsstatus {
  if (!zustand.aktiv || zustand.letzterKontakt === undefined) return { zustand: "unbekannt" };
  const seitMs = Math.max(0, jetzt - zustand.letzterKontakt);
  if (zustand.ausfallSeit === undefined && seitMs <= SCHWELLE_UNTERBROCHEN_MS) {
    return { zustand: "verbunden", letzterKontakt: zustand.letzterKontakt };
  }
  return { zustand: "unterbrochen", stufe: seitMs >= SCHWELLE_ROT_MS ? "rot" : "gelb", seitMs };
}

/** „12 s", „3 min", „2 h" – die Dauer ohne „vor". */
export function dauerText(ms: number): string {
  const sekunden = Math.floor(ms / 1000);
  if (sekunden < 60) return `${String(sekunden)} s`;
  const minuten = Math.floor(sekunden / 60);
  if (minuten < 60) return `${String(minuten)} min`;
  return `${String(Math.floor(minuten / 60))} h`;
}

/** Der Satz der Statuszeile und des Banners. */
export function unterbrochenText(seitMs: number): string {
  return `Keine Verbindung zum Dienst seit ${dauerText(seitMs)}`;
}

/** Sind Schreibaktionen gerade gesperrt? Nur bei erkannter Unterbrechung. */
export function schreibenGesperrt(zustand: VerbindungsZustand, jetzt: number): boolean {
  return bewerte(zustand, jetzt).zustand === "unterbrochen";
}
