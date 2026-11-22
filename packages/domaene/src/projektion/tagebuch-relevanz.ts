/**
 * Was ins Einsatztagebuch im engeren Sinn gehört, und was nachgetragen ist.
 *
 * Gefordert im Stab-Review vom 22.11.2026 (ETB-Führer E1, E2; S2 B-S2-5):
 * Nach 25 Minuten Übung standen 111 Zeilen im Tagebuch, fünf Nachrichten
 * erzeugten 21 davon, elf waren Zwischenschritte von FmZ und LdF. Und ein
 * Eintrag mit Fachzeit 17:05, erfasst 17:27, trug keine Marke.
 *
 * **Verwaltungsschritte** ändern die Lage nicht: Zwischenschritte des
 * Fernmeldebetriebs, Parameter, Stammdaten, Dienstposten, Rufgruppen,
 * Unterkünfte, Ausgabestellen, Logistikangaben. Sie bleiben im vollständigen
 * Protokoll; der Filter „Nur Tagebuchrelevantes“ blendet sie aus. Was die
 * Lage ändert, bleibt immer sichtbar: Eintrag, Statuswechsel, Auftrag,
 * Anforderung, Ein- und Ausgang einer Nachricht, Sichtung, Beförderung.
 *
 * **Nachtrag** heißt: Die fachliche Zeit liegt mindestens
 * {@link NACHTRAG_MINUTEN} Minuten vor der Erfassung.
 */

export const VERWALTUNGSSCHRITTE: ReadonlySet<string> = new Set([
  // Zwischenschritte des Fernmeldebetriebs; Ein- und Ausgang selbst bleiben.
  "NachrichtUebermittlungVorgeschlagen",
  "NachrichtAngenommen",
  "NachrichtNachgewiesen",
  "NachrichtWeitergegeben",
  // Parameter und Stammdaten.
  "EinsatzStammdatenGeaendert",
  "KostenParameterGeaendert",
  "NachrichtenParameterGesetzt",
  "FunkParameterGesetzt",
  "MahlzeitenregelGesetzt",
  "PsaBedarfGesetzt",
  "LogistikGesetzt",
  // Gliederung der Führung und Verzeichnisse.
  "AbschnittZeichenGesetzt",
  "DienstpostenAngelegt",
  "DienstpostenGeaendert",
  "DienstpostenEntfernt",
  "SchichtplanEintragGesetzt",
  "RufgruppeAngelegt",
  "RufgruppeGeaendert",
  "UnterkunftAngelegt",
  "UnterkunftGeaendert",
  "AusgabestelleAngelegt",
  "AusgabestelleEntfernt",
]);

export function istVerwaltungsschritt(typ: string): boolean {
  return VERWALTUNGSSCHRITTE.has(typ);
}

/** Ab so viel Abstand zwischen fachlicher Zeit und Erfassung gilt ein Eintrag als nachgetragen. */
export const NACHTRAG_MINUTEN = 10;

/** Liegt die fachliche Zeit mindestens {@link NACHTRAG_MINUTEN} vor der Erfassung? */
export function istNachtrag(zeitpunkt: string | undefined, erfasst: string): boolean {
  if (zeitpunkt === undefined) return false;
  const fach = Date.parse(zeitpunkt);
  const geschrieben = Date.parse(erfasst);
  if (Number.isNaN(fach) || Number.isNaN(geschrieben)) return false;
  return geschrieben - fach >= NACHTRAG_MINUTEN * 60_000;
}
