import { useState } from 'react';
import type { ActiveClientInfo, EinheitHelfer, OrganisationKey, PeerUpdateStatus } from '@shared/types';
import type {
  CreateAbschnittForm,
  CreateEinheitForm,
  CreateFahrzeugForm,
  EditAbschnittForm,
  EditEinheitForm,
  EditFahrzeugForm,
  MoveDialogState,
  SplitEinheitForm,
  TacticalStrength,
  WorkspaceView,
} from '@renderer/types/ui';
import {
  DEFAULT_CREATE_ABSCHNITT_FORM,
  DEFAULT_CREATE_EINHEIT_FORM,
  DEFAULT_CREATE_FAHRZEUG_FORM,
  DEFAULT_EDIT_ABSCHNITT_FORM,
  DEFAULT_EDIT_EINHEIT_FORM,
  DEFAULT_EDIT_FAHRZEUG_FORM,
  DEFAULT_SPLIT_EINHEIT_FORM,
  EMPTY_EINHEIT_HELFER,
  EMPTY_STRENGTH,
} from '@renderer/app/defaultState';

/**
 * Creates and groups renderer UI state for dialogs, forms and workspace controls.
 */
export function useWorkspaceUiState() {
  const [moveDialog, setMoveDialog] = useState<MoveDialogState | null>(null);
  const [moveTarget, setMoveTarget] = useState('');

  const [showCreateEinheitDialog, setShowCreateEinheitDialog] = useState(false);
  const [showCreateAbschnittDialog, setShowCreateAbschnittDialog] = useState(false);
  const [createAbschnittForm, setCreateAbschnittForm] = useState<CreateAbschnittForm>(DEFAULT_CREATE_ABSCHNITT_FORM);
  const [showEditAbschnittDialog, setShowEditAbschnittDialog] = useState(false);
  const [editAbschnittForm, setEditAbschnittForm] = useState<EditAbschnittForm>(DEFAULT_EDIT_ABSCHNITT_FORM);
  const [createEinheitForm, setCreateEinheitForm] = useState<CreateEinheitForm>(DEFAULT_CREATE_EINHEIT_FORM);
  const [showEditEinheitDialog, setShowEditEinheitDialog] = useState(false);
  const [editEinheitHelfer, setEditEinheitHelfer] = useState<EinheitHelfer[]>(EMPTY_EINHEIT_HELFER);
  const [editEinheitForm, setEditEinheitForm] = useState<EditEinheitForm>(DEFAULT_EDIT_EINHEIT_FORM);

  const [showSplitEinheitDialog, setShowSplitEinheitDialog] = useState(false);
  const [splitEinheitForm, setSplitEinheitForm] = useState<SplitEinheitForm>(DEFAULT_SPLIT_EINHEIT_FORM);

  const [showCreateFahrzeugDialog, setShowCreateFahrzeugDialog] = useState(false);
  const [createFahrzeugForm, setCreateFahrzeugForm] = useState<CreateFahrzeugForm>(DEFAULT_CREATE_FAHRZEUG_FORM);
  const [showEditFahrzeugDialog, setShowEditFahrzeugDialog] = useState(false);
  const [editFahrzeugForm, setEditFahrzeugForm] = useState<EditFahrzeugForm>(DEFAULT_EDIT_FAHRZEUG_FORM);

  const [startChoice, setStartChoice] = useState<'none' | 'open' | 'create'>('open');
  const [startNewEinsatzName, setStartNewEinsatzName] = useState('');
  const [startNewFuestName, setStartNewFuestName] = useState('FüSt 1');
  const [queuedOpenFilePath, setQueuedOpenFilePath] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<WorkspaceView>('einsatz');
  const [kraefteOrgFilter, setKraefteOrgFilter] = useState<OrganisationKey | 'ALLE'>('ALLE');
  const [gesamtStaerke, setGesamtStaerke] = useState<TacticalStrength>(EMPTY_STRENGTH);
  const [now, setNow] = useState<Date>(new Date());
  const [activeClients, setActiveClients] = useState<ActiveClientInfo[]>([]);
  const [peerUpdateStatus, setPeerUpdateStatus] = useState<PeerUpdateStatus | null>(null);
  const [debugSyncLogs, setDebugSyncLogs] = useState<string[]>([]);

  return {
    moveDialog,
    setMoveDialog,
    moveTarget,
    setMoveTarget,
    showCreateEinheitDialog,
    setShowCreateEinheitDialog,
    showCreateAbschnittDialog,
    setShowCreateAbschnittDialog,
    createAbschnittForm,
    setCreateAbschnittForm,
    showEditAbschnittDialog,
    setShowEditAbschnittDialog,
    editAbschnittForm,
    setEditAbschnittForm,
    createEinheitForm,
    setCreateEinheitForm,
    showEditEinheitDialog,
    setShowEditEinheitDialog,
    editEinheitHelfer,
    setEditEinheitHelfer,
    editEinheitForm,
    setEditEinheitForm,
    showSplitEinheitDialog,
    setShowSplitEinheitDialog,
    splitEinheitForm,
    setSplitEinheitForm,
    showCreateFahrzeugDialog,
    setShowCreateFahrzeugDialog,
    createFahrzeugForm,
    setCreateFahrzeugForm,
    showEditFahrzeugDialog,
    setShowEditFahrzeugDialog,
    editFahrzeugForm,
    setEditFahrzeugForm,
    startChoice,
    setStartChoice,
    startNewEinsatzName,
    setStartNewEinsatzName,
    startNewFuestName,
    setStartNewFuestName,
    queuedOpenFilePath,
    setQueuedOpenFilePath,
    activeView,
    setActiveView,
    kraefteOrgFilter,
    setKraefteOrgFilter,
    gesamtStaerke,
    setGesamtStaerke,
    now,
    setNow,
    activeClients,
    setActiveClients,
    peerUpdateStatus,
    setPeerUpdateStatus,
    debugSyncLogs,
    setDebugSyncLogs,
  };
}
