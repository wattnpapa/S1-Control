/**
 * Die Abmeldung beim Schließen der Seite.
 *
 * Ein geschlossener Browser blieb bei den Kollegen als „weiterer Arbeitsplatz"
 * stehen, bis seine Präsenz verfiel (und danach noch als „veraltet"). Beim
 * Beenden der Seite (`pagehide`) geht deshalb ein `sendBeacon` an den Dienst;
 * der schließt den Arbeitsplatz nach kurzer Frist, falls die Seite nicht gleich
 * wiederkommt (Neuladen), und nimmt seine Präsenz vom Share. Ohne `sendBeacon`
 * oder bei Verlust der Nachricht gilt wie bisher der Ablauf der Schwelle.
 */

export interface Abmeldeziel {
  addEventListener(art: "pagehide", hoerer: (ereignis: PageTransitionEvent) => void): void;
  removeEventListener(art: "pagehide", hoerer: (ereignis: PageTransitionEvent) => void): void;
}

/** Meldet beim endgültigen Schließen ab; liefert das Entfernen des Hörers. */
export function meldeBeimSchliessenAb(
  fenster: Abmeldeziel,
  sende: ((adresse: string) => boolean) | undefined,
): () => void {
  const hoerer = (ereignis: PageTransitionEvent): void => {
    // `persisted`: Die Seite geht nur in den Rückwärts-Cache und kommt wieder.
    if (ereignis.persisted) return;
    try {
      sende?.("abmelden");
    } catch {
      // Abmelden ist Komfort; die Schwelle der Präsenz räumt es sonst auf.
    }
  };
  fenster.addEventListener("pagehide", hoerer);
  return () => fenster.removeEventListener("pagehide", hoerer);
}
