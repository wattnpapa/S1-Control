import { useCallback, useMemo, useState } from 'react';
import type {
  ActiveClientInfo,
  AbschnittDetails,
  EinsatzListItem,
  EinheitHelfer,
  OrganisationKey,
  PeerUpdateStatus,
  SessionUser,
  UpdaterState,
} from '@shared/types';
import { buildTacticalSignConfigJson, parseTacticalSignConfig } from '@renderer/app/tactical-sign-form';
import { useAppBootstrap } from '@renderer/app/useAppBootstrap';
import { useEinsatzData } from '@renderer/app/useEinsatzData';
import { useEditLocks } from '@renderer/app/useEditLocks';
import { useStartActions } from '@renderer/app/useStartActions';
import { useSyncEvents } from '@renderer/app/useSyncEvents';
import { useSystemActions } from '@renderer/app/useSystemActions';
import { UpdaterNotices } from '@renderer/components/common/UpdaterUi';
import { CreateAbschnittDialog } from '@renderer/components/dialogs/CreateAbschnittDialog';
import { CreateFahrzeugDialog } from '@renderer/components/dialogs/CreateFahrzeugDialog';
import { EditAbschnittDialog } from '@renderer/components/dialogs/EditAbschnittDialog';
import { MoveDialog } from '@renderer/components/dialogs/MoveDialog';
import { SplitEinheitDialog } from '@renderer/components/dialogs/SplitEinheitDialog';
import { AbschnittSidebar } from '@renderer/components/layout/AbschnittSidebar';
import { Topbar } from '@renderer/components/layout/Topbar';
import { WorkspaceRail } from '@renderer/components/layout/WorkspaceRail';
import { AppEntryView } from '@renderer/components/views/AppEntryView';
import { WorkspaceContent } from '@renderer/components/views/WorkspaceContent';
import type {
  CreateAbschnittForm,
  CreateEinheitForm,
  CreateFahrzeugForm,
  EditAbschnittForm,
  EditEinheitForm,
  EditFahrzeugForm,
  FahrzeugOverviewItem,
  KraftOverviewItem,
  MoveDialogState,
  SplitEinheitForm,
  TacticalStrength,
  WorkspaceView,
} from '@renderer/types/ui';
import { readError } from '@renderer/utils/error';
import { parseTaktischeStaerke } from '@renderer/utils/tactical';

const EMPTY_DETAILS: AbschnittDetails = { einheiten: [], fahrzeuge: [] };
const EMPTY_STRENGTH: TacticalStrength = { fuehrung: 0, unterfuehrung: 0, mannschaft: 0, gesamt: 0 };
const DEFAULT_UPDATER_STATE: UpdaterState = { stage: 'idle' };
/**
 * Handles App.
 */
export function App() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [dbPath, setDbPath] = useState('');
  const [lanPeerUpdatesEnabled, setLanPeerUpdatesEnabled] = useState(false);
  const [einsaetze, setEinsaetze] = useState<EinsatzListItem[]>([]);
  const [selectedEinsatzId, setSelectedEinsatzId] = useState<string>('');
  const [abschnitte, setAbschnitte] = useState([] as Awaited<ReturnType<typeof window.api.listAbschnitte>>);
  const [selectedAbschnittId, setSelectedAbschnittId] = useState<string>('');
  const [details, setDetails] = useState<AbschnittDetails>(EMPTY_DETAILS);
  const [allKraefte, setAllKraefte] = useState<KraftOverviewItem[]>([]);
  const [allFahrzeuge, setAllFahrzeuge] = useState<FahrzeugOverviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updaterState, setUpdaterState] = useState<UpdaterState>(DEFAULT_UPDATER_STATE);

  const [moveDialog, setMoveDialog] = useState<MoveDialogState | null>(null);
  const [moveTarget, setMoveTarget] = useState('');

  const [showCreateEinheitDialog, setShowCreateEinheitDialog] = useState(false);
  const [showCreateAbschnittDialog, setShowCreateAbschnittDialog] = useState(false);
  const [createAbschnittForm, setCreateAbschnittForm] = useState<CreateAbschnittForm>({
    name: '',
    systemTyp: 'NORMAL',
    parentId: '',
  });
  const [showEditAbschnittDialog, setShowEditAbschnittDialog] = useState(false);
  const [editAbschnittForm, setEditAbschnittForm] = useState<EditAbschnittForm>({
    abschnittId: '',
    name: '',
    systemTyp: 'NORMAL',
    parentId: '',
  });
  const [createEinheitForm, setCreateEinheitForm] = useState<CreateEinheitForm>({
    nameImEinsatz: '',
    organisation: 'THW',
    fuehrung: '0',
    unterfuehrung: '1',
    mannschaft: '8',
    status: 'AKTIV',
    abschnittId: '',
    grFuehrerName: '',
    ovName: '',
    ovTelefon: '',
    ovFax: '',
    rbName: '',
    rbTelefon: '',
    rbFax: '',
    lvName: '',
    lvTelefon: '',
    lvFax: '',
    bemerkung: '',
    vegetarierVorhanden: false,
    erreichbarkeiten: '',
    tacticalSignMode: 'AUTO',
    tacticalSignUnit: '',
    tacticalSignTyp: 'none',
    tacticalSignDenominator: '',
  });
  const [showEditEinheitDialog, setShowEditEinheitDialog] = useState(false);
  const [editEinheitHelfer, setEditEinheitHelfer] = useState<EinheitHelfer[]>([]);
  const [editEinheitForm, setEditEinheitForm] = useState<EditEinheitForm>({
    einheitId: '',
    nameImEinsatz: '',
    organisation: 'THW',
    fuehrung: '0',
    unterfuehrung: '0',
    mannschaft: '0',
    status: 'AKTIV',
    grFuehrerName: '',
    ovName: '',
    ovTelefon: '',
    ovFax: '',
    rbName: '',
    rbTelefon: '',
    rbFax: '',
    lvName: '',
    lvTelefon: '',
    lvFax: '',
    bemerkung: '',
    vegetarierVorhanden: false,
    erreichbarkeiten: '',
    tacticalSignMode: 'AUTO',
    tacticalSignUnit: '',
    tacticalSignTyp: 'none',
    tacticalSignDenominator: '',
  });

  const [showSplitEinheitDialog, setShowSplitEinheitDialog] = useState(false);
  const [splitEinheitForm, setSplitEinheitForm] = useState<SplitEinheitForm>({
    sourceEinheitId: '',
    nameImEinsatz: '',
    organisation: 'THW',
    fuehrung: '0',
    unterfuehrung: '0',
    mannschaft: '1',
    status: 'AKTIV',
  });

  const [showCreateFahrzeugDialog, setShowCreateFahrzeugDialog] = useState(false);
  const [createFahrzeugForm, setCreateFahrzeugForm] = useState<CreateFahrzeugForm>({
    name: '',
    kennzeichen: '',
    status: 'AKTIV',
    einheitId: '',
    funkrufname: '',
    stanKonform: 'UNBEKANNT',
    sondergeraet: '',
    nutzlast: '',
  });
  const [showEditFahrzeugDialog, setShowEditFahrzeugDialog] = useState(false);
  const [editFahrzeugForm, setEditFahrzeugForm] = useState<EditFahrzeugForm>({
    fahrzeugId: '',
    name: '',
    kennzeichen: '',
    status: 'AKTIV',
    einheitId: '',
    funkrufname: '',
    stanKonform: 'UNBEKANNT',
    sondergeraet: '',
    nutzlast: '',
  });

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

  const {
    lockByEinheitId,
    lockByFahrzeugId,
    lockByAbschnittId,
    refreshEditLocks,
    acquireEditLock,
    releaseEditLock,
    clearLocks,
  } = useEditLocks({
    sessionActive: Boolean(session),
    selectedEinsatzId,
    onError: (message) => setError(message),
  });

  const selectedEinsatz = useMemo(
    () => einsaetze.find((item) => item.id === selectedEinsatzId) ?? null,
    [einsaetze, selectedEinsatzId],
  );
  const broadcastMonitorLogs = useMemo(
    () =>
      debugSyncLogs
        .filter((line) => line.includes('[einsatz-sync] received') || line.includes('[einsatz-sync] remote-change'))
        .slice(-120),
    [debugSyncLogs],
  );
  const udpDebugMonitorLogs = useMemo(
    () =>
      debugSyncLogs
        .filter((line) => {
          const isUdpScope =
            line.includes('[einsatz-sync]') ||
            line.includes('[peer-service]') ||
            line.includes('[peer-discovery]') ||
            line.includes('[peer-offer]');
          if (!isUdpScope) {
            return false;
          }
          return (
            line.includes('udp-') ||
            line.includes('broadcast') ||
            line.includes('received') ||
            line.includes('query') ||
            line.includes('sent') ||
            line.includes('remote-change')
          );
        })
        .slice(-250),
    [debugSyncLogs],
  );
  const selectedAbschnittLock = selectedAbschnittId ? lockByAbschnittId[selectedAbschnittId] : undefined;
  const selectedAbschnittLockedByOther = Boolean(selectedAbschnittLock && !selectedAbschnittLock.isSelf);

  const isArchived = selectedEinsatz?.status === 'ARCHIVIERT';
  const showAbschnittSidebar = activeView === 'einsatz';

  const clearSelectedEinsatz = useCallback(() => {
    setSelectedEinsatzId('');
    setAbschnitte([]);
    setSelectedAbschnittId('');
    setDetails(EMPTY_DETAILS);
    setAllKraefte([]);
    setAllFahrzeuge([]);
    setGesamtStaerke(EMPTY_STRENGTH);
    setActiveClients([]);
    clearLocks();
  }, [clearLocks]);

  /**
   * Handles Close Edit Abschnitt Dialog.
   */
  const closeEditAbschnittDialog = useCallback(() => {
    const abschnittId = editAbschnittForm.abschnittId;
    setShowEditAbschnittDialog(false);
    if (!selectedEinsatzId || !abschnittId) {
      return;
    }
    void releaseEditLock(selectedEinsatzId, 'ABSCHNITT', abschnittId).catch(() => undefined);
  }, [editAbschnittForm.abschnittId, releaseEditLock, selectedEinsatzId]);

  /**
   * Handles Close Edit Einheit Dialog.
   */
  const closeEditEinheitDialog = useCallback(() => {
    const einheitId = editEinheitForm.einheitId;
    setShowEditEinheitDialog(false);
    setEditEinheitHelfer([]);
    if (!selectedEinsatzId || !einheitId) {
      return;
    }
    void releaseEditLock(selectedEinsatzId, 'EINHEIT', einheitId).catch(() => undefined);
  }, [editEinheitForm.einheitId, releaseEditLock, selectedEinsatzId]);

  /**
   * Handles Close Edit Fahrzeug Dialog.
   */
  const closeEditFahrzeugDialog = useCallback(() => {
    const fahrzeugId = editFahrzeugForm.fahrzeugId;
    setShowEditFahrzeugDialog(false);
    if (!selectedEinsatzId || !fahrzeugId) {
      return;
    }
    void releaseEditLock(selectedEinsatzId, 'FAHRZEUG', fahrzeugId).catch(() => undefined);
  }, [editFahrzeugForm.fahrzeugId, releaseEditLock, selectedEinsatzId]);

  const { loadEinsatz, refreshEinsaetze, refreshAll } = useEinsatzData({
    selectedEinsatzId,
    selectedAbschnittId,
    setEinsaetze,
    setAbschnitte,
    setSelectedAbschnittId,
    setDetails,
    setAllKraefte,
    setAllFahrzeuge,
    setGesamtStaerke,
    clearSelectedEinsatz,
    refreshEditLocks,
    emptyDetails: EMPTY_DETAILS,
    emptyStrength: EMPTY_STRENGTH,
  });

  /**
   * Handles With Busy.
   */
  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  };

  useAppBootstrap({
    authReady,
    setAuthReady,
    setDbPath,
    setLanPeerUpdatesEnabled,
    setUpdaterState,
    setSession,
    setQueuedOpenFilePath,
    setNow,
    setError,
    refreshEinsaetze,
  });

  useSyncEvents({
    session,
    authReady,
    busy,
    activeView,
    selectedEinsatzId,
    selectedAbschnittId,
    queuedOpenFilePath,
    setQueuedOpenFilePath,
    setError,
    setDetails,
    setActiveClients,
    setDbPath,
    setLanPeerUpdatesEnabled,
    setPeerUpdateStatus,
    setDebugSyncLogs,
    setEinsaetze,
    setSelectedEinsatzId,
    setStartChoice,
    loadEinsatz,
    refreshAll,
    withBusy,
  });

  const startActions = useStartActions({
    startNewEinsatzName,
    startNewFuestName,
    setError,
    setEinsaetze,
    setSelectedEinsatzId,
    setStartNewEinsatzName,
    setStartChoice,
    loadEinsatz,
    withBusy,
  });

  const systemActions = useSystemActions({
    dbPath,
    selectedEinsatzId,
    selectedAbschnittId,
    moveDialog,
    moveTarget,
    gesamtStaerke,
    setLanPeerUpdatesEnabled,
    setDbPath,
    setPeerUpdateStatus,
    clearSelectedEinsatz,
    refreshEinsaetze,
    loadEinsatz,
    refreshAll,
    setError,
    setMoveDialog,
    setMoveTarget,
    withBusy,
  });

  /**
   * Handles Do Create Einheit.
   */
  const doCreateEinheit = () => {
    if (!selectedEinsatzId || !selectedAbschnittId || isArchived) return;
    closeEditEinheitDialog();
    setCreateEinheitForm({
      nameImEinsatz: '',
      organisation: 'THW',
      fuehrung: '0',
      unterfuehrung: '1',
      mannschaft: '8',
      status: 'AKTIV',
      abschnittId: selectedAbschnittId,
      grFuehrerName: '',
      ovName: '',
      ovTelefon: '',
      ovFax: '',
      rbName: '',
      rbTelefon: '',
      rbFax: '',
      lvName: '',
      lvTelefon: '',
      lvFax: '',
      bemerkung: '',
      vegetarierVorhanden: false,
      erreichbarkeiten: '',
      tacticalSignMode: 'AUTO',
      tacticalSignUnit: '',
      tacticalSignTyp: 'none',
      tacticalSignDenominator: '',
    });
    setShowCreateEinheitDialog(true);
  };

  /**
   * Handles Do Create Abschnitt.
   */
  const doCreateAbschnitt = () => {
    if (!selectedEinsatzId || isArchived) return;
    setCreateAbschnittForm({
      name: '',
      systemTyp: 'NORMAL',
      parentId: selectedAbschnittId || '',
    });
    setShowCreateAbschnittDialog(true);
  };

  /**
   * Handles Do Edit Selected Abschnitt.
   */
  const doEditSelectedAbschnitt = () => {
    void (async () => {
      if (!selectedAbschnittId || !selectedEinsatzId || isArchived) return;
      if (selectedAbschnittLockedByOther) {
        setError(`Datensatz wird gerade von ${selectedAbschnittLock?.computerName} (${selectedAbschnittLock?.userName}) bearbeitet.`);
        return;
      }
      const current = abschnitte.find((item) => item.id === selectedAbschnittId);
      if (!current) {
        setError('Abschnitt nicht gefunden.');
        return;
      }
      const acquired = await acquireEditLock(selectedEinsatzId, 'ABSCHNITT', selectedAbschnittId);
      if (!acquired) {
        return;
      }
      setEditAbschnittForm({
        abschnittId: current.id,
        name: current.name,
        systemTyp: current.systemTyp,
        parentId: current.parentId ?? '',
      });
      setShowEditAbschnittDialog(true);
    })().catch((err) => setError(readError(err)));
  };

  /**
   * Handles Do Submit Create Abschnitt.
   */
  const doSubmitCreateAbschnitt = async () => {
    if (!selectedEinsatzId || isArchived) return;
    if (!createAbschnittForm.name.trim()) {
      setError('Bitte Namen für den Abschnitt eingeben.');
      return;
    }
    await withBusy(async () => {
      const created = await window.api.createAbschnitt({
        einsatzId: selectedEinsatzId,
        name: createAbschnittForm.name.trim(),
        systemTyp: createAbschnittForm.systemTyp,
        parentId: createAbschnittForm.parentId || null,
      });
      setShowCreateAbschnittDialog(false);
      await loadEinsatz(selectedEinsatzId, created.id);
    });
  };

  /**
   * Handles Do Submit Edit Abschnitt.
   */
  const doSubmitEditAbschnitt = async () => {
    if (!selectedEinsatzId || isArchived) return;
    if (!editAbschnittForm.name.trim()) {
      setError('Bitte Namen für den Abschnitt eingeben.');
      return;
    }
    await withBusy(async () => {
      await window.api.updateAbschnitt({
        einsatzId: selectedEinsatzId,
        abschnittId: editAbschnittForm.abschnittId,
        name: editAbschnittForm.name.trim(),
        systemTyp: editAbschnittForm.systemTyp,
        parentId: editAbschnittForm.parentId || null,
      });
      await releaseEditLock(selectedEinsatzId, 'ABSCHNITT', editAbschnittForm.abschnittId);
      setShowEditAbschnittDialog(false);
      await loadEinsatz(selectedEinsatzId, editAbschnittForm.abschnittId);
    });
  };

  /**
   * Handles Do Submit Create Einheit.
   */
  const doSubmitCreateEinheit = async () => {
    if (!selectedEinsatzId || isArchived) return;
    if (!createEinheitForm.nameImEinsatz.trim()) {
      setError('Bitte Namen der Einheit eingeben.');
      return;
    }
    if (!createEinheitForm.abschnittId) {
      setError('Bitte Abschnitt auswählen.');
      return;
    }

    const fuehrung = Number(createEinheitForm.fuehrung);
    const unterfuehrung = Number(createEinheitForm.unterfuehrung);
    const mannschaft = Number(createEinheitForm.mannschaft);
    if ([fuehrung, unterfuehrung, mannschaft].some((v) => Number.isNaN(v) || v < 0)) {
      setError('Taktische Stärke muss aus Zahlen >= 0 bestehen.');
      return;
    }

    const gesamt = fuehrung + unterfuehrung + mannschaft;
    const taktisch = `${fuehrung}/${unterfuehrung}/${mannschaft}/${gesamt}`;
    const vegetarierVorhanden = false;
    const tacticalSignConfigJson = buildTacticalSignConfigJson({
      nameImEinsatz: createEinheitForm.nameImEinsatz.trim(),
      organisation: createEinheitForm.organisation,
      tacticalSignMode: createEinheitForm.tacticalSignMode,
      tacticalSignUnit: createEinheitForm.tacticalSignUnit,
      tacticalSignTyp: createEinheitForm.tacticalSignTyp,
      tacticalSignDenominator: createEinheitForm.tacticalSignDenominator,
    });

    await withBusy(async () => {
      await window.api.createEinheit({
        einsatzId: selectedEinsatzId,
        nameImEinsatz: createEinheitForm.nameImEinsatz.trim(),
        organisation: createEinheitForm.organisation,
        aktuelleStaerke: gesamt,
        aktuelleStaerkeTaktisch: taktisch,
        aktuellerAbschnittId: createEinheitForm.abschnittId,
        status: createEinheitForm.status,
        grFuehrerName: createEinheitForm.grFuehrerName,
        ovName: createEinheitForm.ovName,
        ovTelefon: createEinheitForm.ovTelefon,
        ovFax: createEinheitForm.ovFax,
        rbName: createEinheitForm.rbName,
        rbTelefon: createEinheitForm.rbTelefon,
        rbFax: createEinheitForm.rbFax,
        lvName: createEinheitForm.lvName,
        lvTelefon: createEinheitForm.lvTelefon,
        lvFax: createEinheitForm.lvFax,
        bemerkung: createEinheitForm.bemerkung,
        vegetarierVorhanden,
        erreichbarkeiten: createEinheitForm.erreichbarkeiten,
        tacticalSignConfigJson,
      });
      setShowCreateEinheitDialog(false);
      await refreshAll();
    });
  };

  /**
   * Handles Do Open Edit Einheit Dialog.
   */
  const doOpenEditEinheitDialog = (einheitId: string) => {
    void (async () => {
      if (!selectedEinsatzId || isArchived) {
        return;
      }
      setShowCreateEinheitDialog(false);
      closeEditFahrzeugDialog();
      const acquired = await acquireEditLock(selectedEinsatzId, 'EINHEIT', einheitId);
      if (!acquired) {
        return;
      }
      const einheit = allKraefte.find((item) => item.id === einheitId);
      if (!einheit) {
        await releaseEditLock(selectedEinsatzId, 'EINHEIT', einheitId);
        setError('Einheit nicht gefunden.');
        return;
      }
      const helfer = await window.api.listEinheitHelfer(einheitId);
      setEditEinheitHelfer(helfer);
      const parsed = parseTaktischeStaerke(einheit.aktuelleStaerkeTaktisch, einheit.aktuelleStaerke);
      const tactical = parseTacticalSignConfig(einheit.tacticalSignConfigJson);
      setEditEinheitForm({
        einheitId,
        nameImEinsatz: einheit.nameImEinsatz,
        organisation: einheit.organisation,
        fuehrung: String(parsed.fuehrung),
        unterfuehrung: String(parsed.unterfuehrung),
        mannschaft: String(parsed.mannschaft),
        status: einheit.status,
        grFuehrerName: einheit.grFuehrerName ?? '',
        ovName: einheit.ovName ?? '',
        ovTelefon: einheit.ovTelefon ?? '',
        ovFax: einheit.ovFax ?? '',
        rbName: einheit.rbName ?? '',
        rbTelefon: einheit.rbTelefon ?? '',
        rbFax: einheit.rbFax ?? '',
        lvName: einheit.lvName ?? '',
        lvTelefon: einheit.lvTelefon ?? '',
        lvFax: einheit.lvFax ?? '',
        bemerkung: einheit.bemerkung ?? '',
        vegetarierVorhanden: einheit.vegetarierVorhanden ?? false,
        erreichbarkeiten: einheit.erreichbarkeiten ?? '',
        ...tactical,
      });
      setShowEditFahrzeugDialog(false);
      setShowEditEinheitDialog(true);
    })().catch((err) => setError(readError(err)));
  };

  /**
   * Handles Do Submit Edit Einheit.
   */
  const doSubmitEditEinheit = async () => {
    if (!selectedEinsatzId || isArchived) return;
    if (!editEinheitForm.nameImEinsatz.trim()) {
      setError('Bitte Namen der Einheit eingeben.');
      return;
    }
    const fuehrung = Number(editEinheitForm.fuehrung);
    const unterfuehrung = Number(editEinheitForm.unterfuehrung);
    const mannschaft = Number(editEinheitForm.mannschaft);
    if ([fuehrung, unterfuehrung, mannschaft].some((v) => Number.isNaN(v) || v < 0)) {
      setError('Taktische Stärke muss aus Zahlen >= 0 bestehen.');
      return;
    }
    const gesamt = fuehrung + unterfuehrung + mannschaft;
    const taktisch = `${fuehrung}/${unterfuehrung}/${mannschaft}/${gesamt}`;
    const vegetarierVorhanden = editEinheitHelfer.some((h) => h.vegetarisch);
    const tacticalSignConfigJson = buildTacticalSignConfigJson({
      nameImEinsatz: editEinheitForm.nameImEinsatz.trim(),
      organisation: editEinheitForm.organisation,
      tacticalSignMode: editEinheitForm.tacticalSignMode,
      tacticalSignUnit: editEinheitForm.tacticalSignUnit,
      tacticalSignTyp: editEinheitForm.tacticalSignTyp,
      tacticalSignDenominator: editEinheitForm.tacticalSignDenominator,
    });

    await withBusy(async () => {
      await window.api.updateEinheit({
        einsatzId: selectedEinsatzId,
        einheitId: editEinheitForm.einheitId,
        nameImEinsatz: editEinheitForm.nameImEinsatz.trim(),
        organisation: editEinheitForm.organisation,
        aktuelleStaerke: gesamt,
        aktuelleStaerkeTaktisch: taktisch,
        status: editEinheitForm.status,
        grFuehrerName: editEinheitForm.grFuehrerName,
        ovName: editEinheitForm.ovName,
        ovTelefon: editEinheitForm.ovTelefon,
        ovFax: editEinheitForm.ovFax,
        rbName: editEinheitForm.rbName,
        rbTelefon: editEinheitForm.rbTelefon,
        rbFax: editEinheitForm.rbFax,
        lvName: editEinheitForm.lvName,
        lvTelefon: editEinheitForm.lvTelefon,
        lvFax: editEinheitForm.lvFax,
        bemerkung: editEinheitForm.bemerkung,
        vegetarierVorhanden,
        erreichbarkeiten: editEinheitForm.erreichbarkeiten,
        tacticalSignConfigJson,
      });
      await releaseEditLock(selectedEinsatzId, 'EINHEIT', editEinheitForm.einheitId);
      setShowEditEinheitDialog(false);
      setEditEinheitHelfer([]);
      await refreshAll();
    });
  };

  const doCreateEinheitHelfer = async (input: {
    name: string;
    rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
    geschlecht: 'MAENNLICH' | 'WEIBLICH';
    anzahl: number;
    funktion: string;
    telefon: string;
    erreichbarkeit: string;
    vegetarisch: boolean;
    bemerkung: string;
  }) => {
    if (!selectedEinsatzId || !editEinheitForm.einheitId || isArchived) return;
    await withBusy(async () => {
      await window.api.createEinheitHelfer({
        einsatzId: selectedEinsatzId,
        einsatzEinheitId: editEinheitForm.einheitId,
        name: input.name.trim(),
        rolle: input.rolle,
        geschlecht: input.geschlecht,
        anzahl: input.anzahl,
        funktion: input.funktion,
        telefon: input.telefon,
        erreichbarkeit: input.erreichbarkeit,
        vegetarisch: input.vegetarisch,
        bemerkung: input.bemerkung,
      });
      setEditEinheitHelfer(await window.api.listEinheitHelfer(editEinheitForm.einheitId));
    });
  };

  const doUpdateEinheitHelfer = async (input: {
    helferId: string;
    name: string;
    rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
    geschlecht: 'MAENNLICH' | 'WEIBLICH';
    anzahl: number;
    funktion: string;
    telefon: string;
    erreichbarkeit: string;
    vegetarisch: boolean;
    bemerkung: string;
  }) => {
    if (!selectedEinsatzId || isArchived) return;
    await withBusy(async () => {
      await window.api.updateEinheitHelfer({
        einsatzId: selectedEinsatzId,
        helferId: input.helferId,
        name: input.name.trim(),
        rolle: input.rolle,
        geschlecht: input.geschlecht,
        anzahl: input.anzahl,
        funktion: input.funktion,
        telefon: input.telefon,
        erreichbarkeit: input.erreichbarkeit,
        vegetarisch: input.vegetarisch,
        bemerkung: input.bemerkung,
      });
      if (editEinheitForm.einheitId) {
        setEditEinheitHelfer(await window.api.listEinheitHelfer(editEinheitForm.einheitId));
      }
    });
  };

  /**
   * Handles Do Delete Einheit Helfer.
   */
  const doDeleteEinheitHelfer = async (helferId: string) => {
    if (!selectedEinsatzId || isArchived) return;
    await withBusy(async () => {
      await window.api.deleteEinheitHelfer({ einsatzId: selectedEinsatzId, helferId });
      if (editEinheitForm.einheitId) {
        setEditEinheitHelfer(await window.api.listEinheitHelfer(editEinheitForm.einheitId));
      }
    });
  };

  const doCreateEinheitFahrzeug = async (input: {
    name: string;
    kennzeichen: string;
    status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
    funkrufname: string;
    stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
    sondergeraet: string;
    nutzlast: string;
  }) => {
    if (!selectedEinsatzId || !editEinheitForm.einheitId || isArchived) return;
    if (!input.name.trim()) {
      setError('Bitte Fahrzeugname eingeben.');
      return;
    }
    await withBusy(async () => {
      await window.api.createFahrzeug({
        einsatzId: selectedEinsatzId,
        name: input.name.trim(),
        kennzeichen: input.kennzeichen.trim() || undefined,
        aktuelleEinsatzEinheitId: editEinheitForm.einheitId,
        status: input.status,
        funkrufname: input.funkrufname,
        stanKonform: input.stanKonform === 'UNBEKANNT' ? null : input.stanKonform === 'JA',
        sondergeraet: input.sondergeraet,
        nutzlast: input.nutzlast,
      });
      await refreshAll();
    });
  };

  const doUpdateEinheitFahrzeug = async (input: {
    fahrzeugId: string;
    name: string;
    kennzeichen: string;
    status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
    funkrufname: string;
    stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
    sondergeraet: string;
    nutzlast: string;
  }) => {
    if (!selectedEinsatzId || !editEinheitForm.einheitId || isArchived) return;
    if (!input.name.trim()) {
      setError('Bitte Fahrzeugname eingeben.');
      return;
    }
    await withBusy(async () => {
      const acquired = await acquireEditLock(selectedEinsatzId, 'FAHRZEUG', input.fahrzeugId);
      if (!acquired) {
        return;
      }
      try {
        await window.api.updateFahrzeug({
          einsatzId: selectedEinsatzId,
          fahrzeugId: input.fahrzeugId,
          name: input.name.trim(),
          kennzeichen: input.kennzeichen.trim() || undefined,
          aktuelleEinsatzEinheitId: editEinheitForm.einheitId,
          status: input.status,
          funkrufname: input.funkrufname,
          stanKonform: input.stanKonform === 'UNBEKANNT' ? null : input.stanKonform === 'JA',
          sondergeraet: input.sondergeraet,
          nutzlast: input.nutzlast,
        });
        await refreshAll();
      } finally {
        await releaseEditLock(selectedEinsatzId, 'FAHRZEUG', input.fahrzeugId);
      }
    });
  };

  /**
   * Handles Do Create Fahrzeug.
   */
  const doCreateFahrzeug = () => {
    if (!selectedEinsatzId || !selectedAbschnittId || isArchived) return;
    if (allKraefte.length === 0) {
      setError('Bitte zuerst mindestens eine Einheit anlegen, bevor Fahrzeuge zugeordnet werden.');
      return;
    }
    setCreateFahrzeugForm({
      name: '',
      kennzeichen: '',
      status: 'AKTIV',
      einheitId: allKraefte[0]?.id ?? '',
      funkrufname: '',
      stanKonform: 'UNBEKANNT',
      sondergeraet: '',
      nutzlast: '',
    });
    setShowCreateFahrzeugDialog(true);
  };

  /**
   * Handles Do Submit Create Fahrzeug.
   */
  const doSubmitCreateFahrzeug = async () => {
    if (!selectedEinsatzId || isArchived) return;
    if (!createFahrzeugForm.name.trim()) {
      setError('Bitte Fahrzeugname eingeben.');
      return;
    }
    if (!createFahrzeugForm.einheitId) {
      setError('Bitte zugeordnete Einheit auswählen.');
      return;
    }

    await withBusy(async () => {
      await window.api.createFahrzeug({
        einsatzId: selectedEinsatzId,
        name: createFahrzeugForm.name.trim(),
        kennzeichen: createFahrzeugForm.kennzeichen.trim() || undefined,
        aktuelleEinsatzEinheitId: createFahrzeugForm.einheitId,
        status: createFahrzeugForm.status,
        funkrufname: createFahrzeugForm.funkrufname,
        stanKonform:
          createFahrzeugForm.stanKonform === 'UNBEKANNT'
            ? null
            : createFahrzeugForm.stanKonform === 'JA',
        sondergeraet: createFahrzeugForm.sondergeraet,
        nutzlast: createFahrzeugForm.nutzlast,
      });
      setShowCreateFahrzeugDialog(false);
      await refreshAll();
    });
  };

  /**
   * Handles Do Open Edit Fahrzeug Dialog.
   */
  const doOpenEditFahrzeugDialog = (fahrzeugId: string) => {
    void (async () => {
      if (!selectedEinsatzId || isArchived) {
        return;
      }
      closeEditEinheitDialog();
      const acquired = await acquireEditLock(selectedEinsatzId, 'FAHRZEUG', fahrzeugId);
      if (!acquired) {
        return;
      }
      const fahrzeug = allFahrzeuge.find((item) => item.id === fahrzeugId);
      if (!fahrzeug) {
        await releaseEditLock(selectedEinsatzId, 'FAHRZEUG', fahrzeugId);
        setError('Fahrzeug nicht gefunden.');
        return;
      }
      setEditFahrzeugForm({
        fahrzeugId,
        name: fahrzeug.name,
        kennzeichen: fahrzeug.kennzeichen ?? '',
        status: fahrzeug.status,
        einheitId: fahrzeug.aktuelleEinsatzEinheitId ?? '',
        funkrufname: fahrzeug.funkrufname ?? '',
        stanKonform: fahrzeug.stanKonform === null ? 'UNBEKANNT' : fahrzeug.stanKonform ? 'JA' : 'NEIN',
        sondergeraet: fahrzeug.sondergeraet ?? '',
        nutzlast: fahrzeug.nutzlast ?? '',
      });
      setShowEditEinheitDialog(false);
      setShowEditFahrzeugDialog(true);
    })().catch((err) => setError(readError(err)));
  };

  /**
   * Handles Do Submit Edit Fahrzeug.
   */
  const doSubmitEditFahrzeug = async () => {
    if (!selectedEinsatzId || isArchived) return;
    if (!editFahrzeugForm.name.trim()) {
      setError('Bitte Fahrzeugname eingeben.');
      return;
    }
    if (!editFahrzeugForm.einheitId) {
      setError('Bitte zugeordnete Einheit auswählen.');
      return;
    }
    await withBusy(async () => {
      await window.api.updateFahrzeug({
        einsatzId: selectedEinsatzId,
        fahrzeugId: editFahrzeugForm.fahrzeugId,
        name: editFahrzeugForm.name.trim(),
        kennzeichen: editFahrzeugForm.kennzeichen.trim() || undefined,
        status: editFahrzeugForm.status,
        aktuelleEinsatzEinheitId: editFahrzeugForm.einheitId,
        funkrufname: editFahrzeugForm.funkrufname,
        stanKonform:
          editFahrzeugForm.stanKonform === 'UNBEKANNT'
            ? null
            : editFahrzeugForm.stanKonform === 'JA',
        sondergeraet: editFahrzeugForm.sondergeraet,
        nutzlast: editFahrzeugForm.nutzlast,
      });
      await releaseEditLock(selectedEinsatzId, 'FAHRZEUG', editFahrzeugForm.fahrzeugId);
      setShowEditFahrzeugDialog(false);
      await refreshAll();
    });
  };

  /**
   * Handles Do Open Split Einheit Dialog.
   */
  const doOpenSplitEinheitDialog = (sourceEinheitId: string) => {
    const source = allKraefte.find((e) => e.id === sourceEinheitId);
    setSplitEinheitForm({
      sourceEinheitId,
      nameImEinsatz: source ? `${source.nameImEinsatz} - Teil 1` : '',
      organisation: source?.organisation ?? 'THW',
      fuehrung: '0',
      unterfuehrung: '0',
      mannschaft: '1',
      status: source?.status ?? 'AKTIV',
    });
    setShowSplitEinheitDialog(true);
  };

  /**
   * Handles Do Submit Split Einheit.
   */
  const doSubmitSplitEinheit = async () => {
    if (!selectedEinsatzId || isArchived) return;
    if (!splitEinheitForm.sourceEinheitId) {
      setError('Bitte Quell-Einheit wählen.');
      return;
    }
    if (!splitEinheitForm.nameImEinsatz.trim()) {
      setError('Bitte Namen für die Teileinheit eingeben.');
      return;
    }

    const fuehrung = Number(splitEinheitForm.fuehrung);
    const unterfuehrung = Number(splitEinheitForm.unterfuehrung);
    const mannschaft = Number(splitEinheitForm.mannschaft);
    if ([fuehrung, unterfuehrung, mannschaft].some((v) => Number.isNaN(v) || v < 0)) {
      setError('Split-Stärke muss aus Zahlen >= 0 bestehen.');
      return;
    }

    await withBusy(async () => {
      await window.api.splitEinheit({
        einsatzId: selectedEinsatzId,
        sourceEinheitId: splitEinheitForm.sourceEinheitId,
        nameImEinsatz: splitEinheitForm.nameImEinsatz.trim(),
        organisation: splitEinheitForm.organisation,
        fuehrung,
        unterfuehrung,
        mannschaft,
        status: splitEinheitForm.status,
      });
      setShowSplitEinheitDialog(false);
      await refreshAll();
    });
  };

  if (!authReady || !session || !selectedEinsatzId) {
    return (
      <AppEntryView
        authReady={authReady}
        session={session}
        selectedEinsatzId={selectedEinsatzId}
        updaterState={updaterState}
        busy={busy}
        error={error}
        startChoice={startChoice}
        setStartChoice={setStartChoice}
        einsaetze={einsaetze}
        startNewEinsatzName={startNewEinsatzName}
        setStartNewEinsatzName={setStartNewEinsatzName}
        startNewFuestName={startNewFuestName}
        setStartNewFuestName={setStartNewFuestName}
        onDownloadUpdate={() => void systemActions.downloadUpdate()}
        onOpenReleasePage={() => void systemActions.openReleasePage()}
        onOpenExisting={() => void startActions.openExisting()}
        onOpenKnownEinsatz={(einsatzId) => void startActions.openKnown(einsatzId)}
        onCreate={() => void startActions.create()}
      />
    );
  }

  return (
    <div className="app-shell">
      <Topbar
        einsatzName={selectedEinsatz?.name ?? '-'}
        gesamtStaerke={gesamtStaerke}
        now={now}
        onOpenStrengthDisplay={() => void systemActions.openStrengthDisplay()}
        onCloseStrengthDisplay={() => void systemActions.closeStrengthDisplay()}
        busy={busy}
      />

      <UpdaterNotices
        updaterState={updaterState}
        busy={busy}
        onDownloadUpdate={() => void systemActions.downloadUpdate()}
        onOpenReleasePage={() => void systemActions.openReleasePage()}
      />

      {isArchived && <div className="banner">Einsatz ist archiviert (nur lesen).</div>}
      {error && <div className="error-banner">{error}</div>}

      <main className={showAbschnittSidebar ? 'content content-with-sidebar' : 'content content-no-sidebar'}>
        <WorkspaceRail activeView={activeView} onSelect={setActiveView} />
        {showAbschnittSidebar && (
          <AbschnittSidebar
            abschnitte={abschnitte}
            selectedId={selectedAbschnittId}
            einsatzName={selectedEinsatz?.name}
            locksByAbschnittId={lockByAbschnittId}
            onSelect={setSelectedAbschnittId}
            onEditSelected={doEditSelectedAbschnitt}
            editDisabled={busy || !selectedAbschnittId || isArchived || selectedAbschnittLockedByOther}
          />
        )}

        <WorkspaceContent
          activeView={activeView}
          busy={busy}
          isArchived={isArchived ?? false}
          selectedEinsatz={selectedEinsatz}
          selectedEinsatzId={selectedEinsatzId}
          selectedAbschnittId={selectedAbschnittId}
          abschnitte={abschnitte}
          details={details}
          allKraefte={allKraefte}
          allFahrzeuge={allFahrzeuge}
          broadcastMonitorLogs={broadcastMonitorLogs}
          debugSyncLogs={debugSyncLogs}
          udpDebugMonitorLogs={udpDebugMonitorLogs}
          activeClients={activeClients}
          dbPath={dbPath}
          lanPeerUpdatesEnabled={lanPeerUpdatesEnabled}
          peerUpdateStatus={peerUpdateStatus}
          kraefteOrgFilter={kraefteOrgFilter}
          setKraefteOrgFilter={setKraefteOrgFilter}
          showEditEinheitDialog={showEditEinheitDialog}
          editEinheitForm={editEinheitForm}
          setEditEinheitForm={setEditEinheitForm}
          editEinheitHelfer={editEinheitHelfer}
          onSubmitEditEinheit={() => void doSubmitEditEinheit()}
          onCloseEditEinheit={closeEditEinheitDialog}
          onCreateEinheitHelfer={doCreateEinheitHelfer}
          onUpdateEinheitHelfer={doUpdateEinheitHelfer}
          onDeleteEinheitHelfer={doDeleteEinheitHelfer}
          onCreateEinheitFahrzeug={doCreateEinheitFahrzeug}
          onUpdateEinheitFahrzeug={doUpdateEinheitFahrzeug}
          showCreateEinheitDialog={showCreateEinheitDialog}
          createEinheitForm={createEinheitForm}
          setCreateEinheitForm={setCreateEinheitForm}
          onSubmitCreateEinheit={() => void doSubmitCreateEinheit()}
          onCloseCreateEinheit={() => setShowCreateEinheitDialog(false)}
          showEditFahrzeugDialog={showEditFahrzeugDialog}
          editFahrzeugForm={editFahrzeugForm}
          setEditFahrzeugForm={setEditFahrzeugForm}
          onSubmitEditFahrzeug={() => void doSubmitEditFahrzeug()}
          onCloseEditFahrzeug={closeEditFahrzeugDialog}
          onCreateEinheit={doCreateEinheit}
          onCreateAbschnitt={doCreateAbschnitt}
          onCreateFahrzeug={doCreateFahrzeug}
          onMoveEinheit={(id) => {
            setMoveDialog({ type: 'einheit', id });
            setMoveTarget(selectedAbschnittId);
          }}
          onEditEinheit={doOpenEditEinheitDialog}
          onSplitEinheit={doOpenSplitEinheitDialog}
          onMoveFahrzeug={(id) => {
            setMoveDialog({ type: 'fahrzeug', id });
            setMoveTarget(selectedAbschnittId);
          }}
          onEditFahrzeug={doOpenEditFahrzeugDialog}
          onSaveDbPath={() => void systemActions.saveDbPath()}
          onSetDbPath={setDbPath}
          onRestoreBackup={() => void systemActions.restoreBackup()}
          onToggleLanPeerUpdates={(enabled) => void systemActions.toggleLanPeerUpdates(enabled)}
          einheitLocksById={lockByEinheitId}
          fahrzeugLocksById={lockByFahrzeugId}
        />
      </main>

      <MoveDialog
        visible={Boolean(moveDialog)}
        type={moveDialog?.type ?? 'einheit'}
        abschnitte={abschnitte}
        moveTarget={moveTarget}
        isArchived={isArchived ?? false}
        onChangeTarget={setMoveTarget}
        onConfirm={() => void systemActions.move()}
        onClose={() => {
          setMoveDialog(null);
          setMoveTarget('');
        }}
      />

      <CreateAbschnittDialog
        visible={showCreateAbschnittDialog}
        busy={busy}
        isArchived={isArchived ?? false}
        form={createAbschnittForm}
        abschnitte={abschnitte}
        onChange={setCreateAbschnittForm}
        onSubmit={() => void doSubmitCreateAbschnitt()}
        onClose={() => setShowCreateAbschnittDialog(false)}
      />

      <EditAbschnittDialog
        visible={showEditAbschnittDialog}
        busy={busy}
        isArchived={isArchived ?? false}
        form={editAbschnittForm}
        abschnitte={abschnitte}
        onChange={setEditAbschnittForm}
        onSubmit={() => void doSubmitEditAbschnitt()}
        onClose={closeEditAbschnittDialog}
      />

      <SplitEinheitDialog
        visible={showSplitEinheitDialog}
        busy={busy}
        isArchived={isArchived ?? false}
        form={splitEinheitForm}
        allKraefte={allKraefte}
        onChange={setSplitEinheitForm}
        onSubmit={() => void doSubmitSplitEinheit()}
        onClose={() => setShowSplitEinheitDialog(false)}
      />

      <CreateFahrzeugDialog
        visible={showCreateFahrzeugDialog}
        busy={busy}
        isArchived={isArchived ?? false}
        form={createFahrzeugForm}
        allKraefte={allKraefte}
        onChange={setCreateFahrzeugForm}
        onSubmit={() => void doSubmitCreateFahrzeug()}
        onClose={() => setShowCreateFahrzeugDialog(false)}
      />

      <UpdaterOverlay updaterState={updaterState} />
    </div>
  );
}
