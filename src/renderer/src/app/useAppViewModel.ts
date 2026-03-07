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
 * Returns whether entry flow should be rendered instead of workspace.
 */
function isEntryOnlyState(rootState: ReturnType<typeof useAppCoreState>): boolean {
  return !rootState.authReady || !rootState.session || !rootState.selectedEinsatzId;
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
    einsatzInitialLoading: params.rootState.einsatzInitialLoading,
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
 * Creates entry props from current root/ui state and action bundles.
 */
function buildEntryViewProps(params: {
  rootState: ReturnType<typeof useAppCoreState>;
  uiState: ReturnType<typeof useWorkspaceUiState>;
  startActions: ReturnType<typeof useAppControllers>['startActions'];
  systemActions: ReturnType<typeof useAppControllers>['systemActions'];
}): AppEntryViewProps {
  return buildEntryProps({
    authReady: params.rootState.authReady,
    session: params.rootState.session,
    selectedEinsatzId: params.rootState.selectedEinsatzId,
    updaterState: params.rootState.updaterState,
    busy: params.rootState.busy,
    error: params.rootState.error,
    einsaetze: params.rootState.einsaetze,
    uiState: params.uiState,
    checkForUpdates: () => void params.systemActions.checkForUpdates(),
    openMainDevTools: () => void params.systemActions.openMainDevTools(),
    downloadUpdate: () => void params.systemActions.downloadUpdate(),
    openReleasePage: () => void params.systemActions.openReleasePage(),
    openExisting: () => void params.startActions.openExisting(),
    openKnownEinsatz: (einsatzId) => void params.startActions.openKnown(einsatzId),
    createEinsatz: () => void params.startActions.create(),
  });
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
    setPerfSafeMode: rootState.setPerfSafeMode,
    setSession: rootState.setSession,
    setQueuedOpenFilePath: uiState.setQueuedOpenFilePath,
    setError: rootState.setError,
    refreshEinsaetze,
  });

  const entryProps = buildEntryViewProps({
    rootState,
    uiState,
    startActions,
    systemActions,
  });

  if (isEntryOnlyState(rootState)) {
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
