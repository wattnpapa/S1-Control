/**
 * Sämtliche Startwerte aus KONZEPT-SPEICHER.md §10 (Annahme A4), an einer
 * Stelle.
 *
 * §10 sagt zu: „Wo eine Zahl erst durch die Messung M0.5 am echten
 * Synology-Share bestimmt wird, steht hier ein **Startwert** mit Begründung,
 * kein Ratewert ohne Kennzeichnung." Diese Datei ist die Code-Entsprechung
 * dieser Zusage. **Keiner dieser Werte ist eine Zusage**; M0.5 kalibriert sie.
 *
 * Deshalb stehen sie hier und nicht verstreut im Code: M0.5 ändert Zahlen,
 * nicht Code. Wer einen dieser Werte anderswo als Zahlenliteral wiederholt,
 * macht die Kalibrierung unauffindbar.
 */

/** Segmentgröße, ab der ein neues Segment beginnt — 4 MiB (§4.2, §10). */
export const SEGMENTGROESSE_BYTE = 4 * 1024 * 1024;

/**
 * Obergrenze je Zeile — 1 MiB (§2.1, §10).
 *
 * Wird nicht gemessen: Plausibilitätsschranke weit über A2 (400 bis 600 Byte
 * je Ereignis) und weit unter jedem Wert, dessen Abwarten schaden könnte.
 */
export const ZEILE_MAX_BYTE = 1024 * 1024;

/** Höchstzahl der Ziffern im Längenfeld (§2.1). 7 Ziffern decken {@link ZEILE_MAX_BYTE} ab. */
export const LAENGE_MAX_ZIFFERN = 7;

/** Takt A — kurzer Poll bekannter, noch wachsender Dateien: 3 s (§6.2, §10). */
export const TAKT_A_MS = 3_000;

/** Takt B — Verzeichnisauflistung, um neue Dateien zu entdecken: 4 s (§6.2, §10). */
export const TAKT_B_MS = 4_000;

/**
 * Verfall aus Takt A nach Stillstand — 5 min (§6.2, §10).
 *
 * Derselbe Wert gilt für die Frist, ab der eine unvollständige Zeile als
 * defekt gilt (§8.1): „er darf den Verfall nicht unterschreiten".
 */
export const VERFALL_MS = 5 * 60 * 1000;

/** Frist, ab der eine unvollständige Zeile in vorläufige Quarantäne geht — 5 min (§8.1, §10). */
export const UNVOLLSTAENDIG_FRIST_MS = VERFALL_MS;

/** Rückstau-Staffel der Spiegelung — 2 / 5 / 15 / 30 s, danach dauerhaft 30 s (§5.4.4, §10). */
export const RUECKSTAU_STAFFEL_MS = [2_000, 5_000, 15_000, 30_000] as const;

/** Präsenztakt — alle 15 s, zusätzlich bei jedem Segmentwechsel (§6.4, §10). */
export const PRAESENZ_TAKT_MS = 15_000;

/** Präsenz gilt als veraltet — 60 s ohne Fortschreibung (§6.4, §10). */
export const PRAESENZ_VERALTET_MS = 60_000;

/** Zeitausstieg der Oberfläche — 20 s, muss unter dem SMB-`SessTimeout` von 60 s bleiben (§8.4, §10). */
export const ZEITAUSSTIEG_MS = 20_000;

/** Wiederholung nach lokalem `EBUSY`/`EACCES` — genau einmal nach 250 ms (§8.8, §10). */
export const LOKALE_WIEDERHOLUNG_MS = 250;

/** Aufbewahrte eigene Schnappschüsse — 3 (§7.5, §10). Wird von M0.3 nur geführt, nicht benutzt. */
export const SCHNAPPSCHUESSE_AUFBEWAHRT = 3;

/** Schnappschuss-Auslöser: 2.000 Ereignisse oder 30 min (§7.5, §10). M0.3 baut keine Schnappschüsse. */
export const SCHNAPPSCHUSS_EREIGNISSE = 2_000;
/** Zweiter Schnappschuss-Auslöser (§7.5, §10). */
export const SCHNAPPSCHUSS_MS = 30 * 60 * 1000;
