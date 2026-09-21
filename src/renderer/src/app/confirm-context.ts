import { createContext, useContext } from 'react';
import type { ConfirmRequest } from '@renderer/components/common/ConfirmDialog';

export type ConfirmFn = (request: ConfirmRequest) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Liefert die Rückfrage-Funktion. Ohne Provider wird nicht bestätigt, statt
 * die Handlung ungefragt auszuführen.
 */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  return confirm ?? (async () => false);
}
