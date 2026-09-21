import { useCallback, useMemo, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { ConfirmDialog, type ConfirmRequest } from '@renderer/components/common/ConfirmDialog';
import { ConfirmContext, type ConfirmFn } from '@renderer/app/confirm-context';

interface PendingConfirm {
  request: ConfirmRequest;
  resolve: (value: boolean) => void;
}

/**
 * Stellt Rückfragen vor folgenschweren Handlungen bereit, ohne sie durch
 * jede Eigenschaftskette zu reichen.
 */
export function ConfirmProvider({ children }: { children: ReactNode }): JSX.Element {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (request) =>
      new Promise<boolean>((resolve) => {
        setPending({ request, resolve });
      }),
    [],
  );

  const schliessen = useCallback((antwort: boolean) => {
    setPending((current) => {
      current?.resolve(antwort);
      return null;
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <ConfirmDialog
          {...pending.request}
          onConfirm={() => schliessen(true)}
          onCancel={() => schliessen(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}
