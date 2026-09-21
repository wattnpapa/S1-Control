/**
 * Handles To Nato Date Time.
 */
/**
 * Zeitzonenkennung der örtlichen Zeit nach NATO-Schema (A–Z ohne J).
 *
 * Ohne Kennung ist eine Zeitangabe zweideutig, sobald Meldungen zwischen
 * Stellen mit unterschiedlicher Zeit ausgetauscht werden.
 */
export function natoZeitzonenKennung(date: Date): string {
  const versatz = typeof date.getTimezoneOffset === 'function' ? date.getTimezoneOffset() : 0;
  const versatzStunden = -versatz / 60;
  if (!Number.isInteger(versatzStunden) || versatzStunden < -12 || versatzStunden > 12) {
    // Halbe Stunden und Sonderfälle haben keinen Buchstaben.
    return '';
  }
  if (versatzStunden === 0) {
    return 'Z';
  }
  const oestlich = 'ABCDEFGHIKLM';
  const westlich = 'NOPQRSTUVWXY';
  return versatzStunden > 0
    ? (oestlich[versatzStunden - 1] ?? '')
    : (westlich[-versatzStunden - 1] ?? '');
}

export function toNatoDateTime(date: Date): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const mon = months[date.getMonth()] ?? 'JAN';
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${hh}${mm}${natoZeitzonenKennung(date)}${mon}${yy}`;
}
