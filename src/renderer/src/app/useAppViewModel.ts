import { useState } from 'react';
import type { AppEntryViewProps } from '@renderer/components/views/AppEntryView';
import type { AppWorkspaceShellProps } from '@renderer/components/views/AppWorkspaceShell';
import { useAppBootstrap } from '@renderer/app/useAppBootstrap';
import { useAppControllers } from '@renderer/app/useAppControllers';
import { buildEntryProps, buildWorkspaceProps } from '@renderer/app/app-view-props';
import { useAppCoreState } from '@renderer/app/useAppCoreState';
import { useWorkspaceUiState } from '@renderer/app/useWorkspaceUiState';

/**
 * Holds root view model for the app root view switching.
 */
export interface AppViewModel {
  showWorkspace: boolean;
  entryProps: AppEntryViewProps;
  workspaceProps: AppWorkspaceShellProps | null;
}

/**
 * Creates workspace shell props from controller outputs.
 */
function createWorkspaceShellProps(params: Parameters<typeof buildWorkspaceProps>[0]): AppWorkspaceShellProps {
  return buildWorkspaceProps(params);
}

/**
 * Maps view-model context to workspace prop builder input.
 */
function toWorkspaceBuilderArgs(params: {
  rootState: ReturnType<typeof useAppCoreState>;
  uiState: ReturnType<typeof useWorkspaceUiState>;
  selectedAbschnittId: string;
  setSelectedAbschnittId: (value: string) => void;
  derivedState: ReturnType<typeof useAppControllers>['derivedState'];
  lockByAbschnittId: ReturnType<typeof useAppControllers>['lockByAbschnittId'];
  lockByEinheitId: ReturnType<typeof useAppControllers>['lockByEinheitId'];
  lockByFahrzeugId: ReturnType<typeof useAppControllers>['lockByFahrzeugId'];
  closeEditEinheitDialog: ReturnType<typeof useAppControllers>['closeEditEinheitDialog'];
  closeEditFahrzeugDialog: ReturnType<typeof useAppControllers>['closeEditFahrzeugDialog'];
  abschnittActions: ReturnType<typeof useAppControllers>['abschnittActions'];
  einheitActions: ReturnType<typeof useAppControllers>['einheitActions'];
  fahrzeugActions: ReturnType<typeof useAppControllers>['fahrzeugActions'];
  systemActions: ReturnType<typeof useAppControllers>['systemActions'];
}): Parameters<typeof buildWorkspaceProps>[0] {
  return {
    busy: params.rootState.busy,
    error: params.rootState.error,
    selectedEinsatzId: params.rootState.selectedEinsatzId,
    abschnitte: params.rootState.abschnitte,
    details: params.rootState.details,
    allKraefte: params.rootState.allKraefte,
    allFahrzeuge: params.rootState.allFahrzeuge,
    dbPath: params.rootState.dbPath,
    lanPeerUpdatesEnabled: params.rootState.lanPeerUpdatesEnabled,
    setDbPath: params.rootState.setDbPath,
    setSelectedAbschnittId: params.setSelectedAbschnittId,
    uiState: params.uiState,
    derivedState: params.derivedState,
    lockByAbschnittId: params.lockByAbschnittId,
    lockByEinheitId: params.lockByEinheitId,
    lockByFahrzeugId: params.lockByFahrzeugId,
    closeEditEinheitDialog: params.closeEditEinheitDialog,
    closeEditFahrzeugDialog: params.closeEditFahrzeugDialog,
    updaterState: params.rootState.updaterState,
    abschnittActions: params.abschnittActions,
    einheitActions: params.einheitActions,
    fahrzeugActions: params.fahrzeugActions,
    systemActions: params.systemActions,
  };
}

/**
 * Builds all state, actions and view props for app root rendering.
 */
export function useAppViewModel(): AppViewModel {
  const rootState = useAppCoreState();
  const [selectedAbschnittId, setSelectedAbschnittId] = useState('');

  const uiState = useWorkspaceUiState();
  const {
    derivedState,
    lockByEinheitId,
    lockByFahrzeugId,
    lockByAbschnittId,
    refreshEinsaetze,
    closeEditEinheitDialog,
    closeEditFahrzeugDialog,
    startActions,
    systemActions,
    abschnittActions,
    fahrzeugActions,
    einheitActions,
  } = useAppControllers({
    rootState,
    uiState,
    selectedAbschnittId,
    setSelectedAbschnittId,
  });

  useAppBootstrap({
    authReady: rootState.authReady,
    setAuthReady: rootState.setAuthReady,
    setDbPath: rootState.setDbPath,
    setLanPeerUpdatesEnabled: rootState.setLanPeerUpdatesEnabled,
    setUpdaterState: rootState.setUpdaterState,
    setSession: rootState.setSession,
    setQueuedOpenFilePath: uiState.setQueuedOpenFilePath,
    setNow: uiState.setNow,
    setError: rootState.setError,
    refreshEinsaetze,
  });

  const entryProps = buildEntryProps({
    authReady: rootState.authReady,
    session: rootState.session,
    selectedEinsatzId: rootState.selectedEinsatzId,
    updaterState: rootState.updaterState,
    busy: rootState.busy,
    error: rootState.error,
    einsaetze: rootState.einsaetze,
    uiState,
    checkForUpdates: () => void systemActions.checkForUpdates(),
    downloadUpdate: () => void systemActions.downloadUpdate(),
    openReleasePage: () => void systemActions.openReleasePage(),
    openExisting: () => void startActions.openExisting(),
    openKnownEinsatz: (einsatzId) => void startActions.openKnown(einsatzId),
    createEinsatz: () => void startActions.create(),
  });

  if (!rootState.authReady || !rootState.session || !rootState.selectedEinsatzId) {
    return {
      showWorkspace: false,
      entryProps,
      workspaceProps: null,
    };
  }

  return {
    showWorkspace: true,
    entryProps,
    workspaceProps: createWorkspaceShellProps(
      toWorkspaceBuilderArgs({
        rootState,
        uiState,
        selectedAbschnittId,
        setSelectedAbschnittId,
        derivedState,
        lockByAbschnittId,
        lockByEinheitId,
        lockByFahrzeugId,
        closeEditEinheitDialog,
        closeEditFahrzeugDialog,
        abschnittActions,
        einheitActions,
        fahrzeugActions,
        systemActions,
      }),
    ),
  };
}
