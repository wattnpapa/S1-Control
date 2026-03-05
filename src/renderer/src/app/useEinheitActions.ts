import { useEinheitCreateActions } from '@renderer/app/einheit-actions/useEinheitCreateActions';
import { useEinheitEditActions } from '@renderer/app/einheit-actions/useEinheitEditActions';
import { useEinheitFahrzeugActions } from '@renderer/app/einheit-actions/useEinheitFahrzeugActions';
import { useEinheitHelferActions } from '@renderer/app/einheit-actions/useEinheitHelferActions';
import { useEinheitSplitActions } from '@renderer/app/einheit-actions/useEinheitSplitActions';
import type { UseEinheitActionsProps } from '@renderer/app/einheit-actions/types';

/**
 * Composes all Einheit-related actions from dedicated feature hooks.
 */
export function useEinheitActions(props: UseEinheitActionsProps) {
  const createActions = useEinheitCreateActions(props);
  const editActions = useEinheitEditActions(props);
  const helferActions = useEinheitHelferActions(props);
  const fahrzeugActions = useEinheitFahrzeugActions(props);
  const splitActions = useEinheitSplitActions(props);

  return {
    ...createActions,
    ...editActions,
    ...helferActions,
    ...fahrzeugActions,
    ...splitActions,
  };
}
