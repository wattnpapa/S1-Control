import type { EinsatzListItem } from '@shared/types';

/**
 * Inserts or moves an einsatz to the front of the recent list.
 */
export function upsertRecentEinsatz(
  current: EinsatzListItem[],
  nextItem: EinsatzListItem,
): EinsatzListItem[] {
  const rest = current.filter((item) => item.id !== nextItem.id);
  return [nextItem, ...rest];
}
