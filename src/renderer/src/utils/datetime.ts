export function toNatoDateTime(date: Date): string {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const mon = months[date.getMonth()] ?? 'JAN';
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${hh}${mm}${mon}${yy}`;
}
