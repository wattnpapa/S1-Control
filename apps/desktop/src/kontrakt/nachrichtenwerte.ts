/**
 * Die Sichten des Blattes „Nachrichten" als Liste für den Kontrakt
 * (KONZEPT-NACHRICHTEN.md §6).
 *
 * Eine Abschrift von `projektion.NACHRICHTEN_SICHTEN`, weil `index.ts` nur zod
 * und **Typen** aus `@s1/domaene` zieht: Preload und Main sollen für ein
 * Schema nicht den ganzen Fachkern laden. Dass beide Listen gleich sind,
 * prüft `nachrichtenschritte.test.ts`.
 */

export const NACHRICHTEN_SICHTEN_LISTE = ["posteingang", "ausgang", "sichter", "fmz", "nachweisung"] as const;
