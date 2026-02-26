import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AbschnittDetails, EinsatzListItem, EinheitHelfer, OrganisationKey, SessionUser, UpdaterState } from '@shared/types';
import { ORGANISATION_OPTIONS } from '@renderer/constants/organisation';
import { CreateAbschnittDialog } from '@renderer/components/dialogs/CreateAbschnittDialog';
import { CreateEinheitDialog } from '@renderer/components/dialogs/CreateEinheitDialog';
import { CreateFahrzeugDialog } from '@renderer/components/dialogs/CreateFahrzeugDialog';
import { EditAbschnittDialog } from '@renderer/components/dialogs/EditAbschnittDialog';
import { MoveDialog } from '@renderer/components/dialogs/MoveDialog';
import { SplitEinheitDialog } from '@renderer/components/dialogs/SplitEinheitDialog';
import { InlineEinheitEditor, InlineFahrzeugEditor } from '@renderer/components/editor/InlineEditors';
import { AbschnittSidebar } from '@renderer/components/layout/AbschnittSidebar';
import { Topbar } from '@renderer/components/layout/Topbar';
import { WorkspaceRail } from '@renderer/components/layout/WorkspaceRail';
import { FahrzeugeOverviewTable } from '@renderer/components/tables/FahrzeugeOverviewTable';
import { KraefteOverviewTable } from '@renderer/components/tables/KraefteOverviewTable';
import { EinsatzOverviewView } from '@renderer/components/views/EinsatzOverviewView';
import { FuehrungsstrukturView } from '@renderer/components/views/FuehrungsstrukturView';
import { SettingsView } from '@renderer/components/views/SettingsView';
import { StartView } from '@renderer/components/views/StartView';
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
import { parseTaktischeStaerke, toTaktischeStaerke } from '@renderer/utils/tactical';

const EMPTY_DETAILS: AbschnittDetails = { einheiten: [], fahrzeuge: [] };
const EMPTY_STRENGTH: TacticalStrength = { fuehrung: 0, unterfuehrung: 0, mannschaft: 0, gesamt: 0 };
const DEFAULT_UPDATER_STATE: UpdaterState = { stage: 'idle' };
const RELEASES_URL = 'https://github.com/wattnpapa/S1-Control/releases/latest';

function formatBytesToMb(bytes?: number): string {
  if (!bytes || bytes < 0) return '-';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeedMb(bytesPerSecond?: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '-';
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatEtaSeconds(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '-';
  const rounded = Math.max(1, Math.round(seconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins > 0) {
    return `${mins}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

export function App() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [dbPath, setDbPath] = useState('');
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

  const [activeView, setActiveView] = useState<WorkspaceView>('einsatz');
  const [kraefteOrgFilter, setKraefteOrgFilter] = useState<OrganisationKey | 'ALLE'>('ALLE');
  const [gesamtStaerke, setGesamtStaerke] = useState<TacticalStrength>(EMPTY_STRENGTH);
  const [now, setNow] = useState<Date>(new Date());

  const selectedEinsatz = useMemo(
    () => einsaetze.find((item) => item.id === selectedEinsatzId) ?? null,
    [einsaetze, selectedEinsatzId],
  );

  const isArchived = selectedEinsatz?.status === 'ARCHIVIERT';
  const showAbschnittSidebar = activeView === 'einsatz';

  const renderUpdaterNotices = () => (
    <>
      {updaterState.stage === 'available' && (
        <div className="update-banner">
          <span>
            Update verfügbar {updaterState.latestVersion ? `(${updaterState.latestVersion})` : ''}. Quelle:{' '}
            {updaterState.source === 'electron-updater' ? 'In-App' : 'GitHub Release'}.
            {updaterState.message ? ` ${updaterState.message}` : ''}
          </span>
          <div className="update-actions">
            {updaterState.inAppDownloadSupported && (
              <button onClick={() => void doDownloadUpdate()} disabled={busy}>
                Update herunterladen
              </button>
            )}
            <button onClick={() => void doOpenReleasePage()} disabled={busy}>
              Release-Seite öffnen
            </button>
          </div>
        </div>
      )}
      {updaterState.stage === 'downloaded' && (
        <div className="update-banner">
          Update heruntergeladen {updaterState.latestVersion ? `(${updaterState.latestVersion})` : ''}.
          <button onClick={() => void doInstallUpdate()} disabled={busy}>
            Jetzt neu starten
          </button>
        </div>
      )}
      {updaterState.stage === 'error' && <div className="error-banner">Update-Fehler: {updaterState.message}</div>}
      {updaterState.stage === 'unsupported' && (
        <div className="update-banner">
          <span>{updaterState.message}</span>
          <button onClick={() => void doOpenReleasePage()} disabled={busy}>
            Release-Seite öffnen
          </button>
        </div>
      )}
    </>
  );

  const renderUpdaterOverlay = () =>
    updaterState.stage === 'downloading' ? (
      <div className="overlay-backdrop">
        <div className="overlay-panel">
          <h3>Update wird heruntergeladen</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, updaterState.progressPercent ?? 0))}%` }} />
          </div>
          <p>{Math.round(updaterState.progressPercent ?? 0)}%</p>
          <p>
            {formatBytesToMb(updaterState.progressTransferredBytes)} / {formatBytesToMb(updaterState.progressTotalBytes)}
          </p>
          <p>Geschwindigkeit: {formatSpeedMb(updaterState.progressBytesPerSecond)}</p>
          <p>
            Restzeit:{' '}
            {formatEtaSeconds(
              updaterState.progressTransferredBytes !== undefined &&
                updaterState.progressTotalBytes !== undefined &&
                updaterState.progressBytesPerSecond
                ? (updaterState.progressTotalBytes - updaterState.progressTransferredBytes) /
                    updaterState.progressBytesPerSecond
                : undefined,
            )}
          </p>
        </div>
      </div>
    ) : null;

  const clearSelectedEinsatz = useCallback(() => {
    setSelectedEinsatzId('');
    setAbschnitte([]);
    setSelectedAbschnittId('');
    setDetails(EMPTY_DETAILS);
    setAllKraefte([]);
    setAllFahrzeuge([]);
    setGesamtStaerke(EMPTY_STRENGTH);
  }, []);

  const loadEinsatz = useCallback(async (einsatzId: string, preferredAbschnittId?: string) => {
    const nextAbschnitte = await window.api.listAbschnitte(einsatzId);
    setAbschnitte(nextAbschnitte);

    const allDetails = await Promise.all(
      nextAbschnitte.map((abschnitt) => window.api.listAbschnittDetails(einsatzId, abschnitt.id)),
    );

    const nextAllKraefte = allDetails.flatMap((d, index) => {
      const abschnittName = nextAbschnitte[index]?.name ?? 'Unbekannt';
      return d.einheiten.map((einheit) => ({ ...einheit, abschnittName }));
    });
    setAllKraefte(nextAllKraefte);

    const einheitNameById = new Map(nextAllKraefte.map((e) => [e.id, e.nameImEinsatz]));
    const einheitOrgById = new Map(nextAllKraefte.map((e) => [e.id, e.organisation]));
    const nextAllFahrzeuge = allDetails.flatMap((d, index) => {
      const abschnittName = nextAbschnitte[index]?.name ?? 'Unbekannt';
      return d.fahrzeuge.map((fahrzeug) => ({
        ...fahrzeug,
        abschnittName,
        organisation: fahrzeug.organisation ?? (fahrzeug.aktuelleEinsatzEinheitId ? (einheitOrgById.get(fahrzeug.aktuelleEinsatzEinheitId) ?? null) : null),
        einheitName: fahrzeug.aktuelleEinsatzEinheitId
          ? (einheitNameById.get(fahrzeug.aktuelleEinsatzEinheitId) ?? 'Unbekannt')
          : '-',
      }));
    });
    setAllFahrzeuge(nextAllFahrzeuge);

    const total = allDetails.reduce<TacticalStrength>((sum, d) => {
      for (const einheit of d.einheiten) {
        const parsed = parseTaktischeStaerke(einheit.aktuelleStaerkeTaktisch, einheit.aktuelleStaerke);
        sum.fuehrung += parsed.fuehrung;
        sum.unterfuehrung += parsed.unterfuehrung;
        sum.mannschaft += parsed.mannschaft;
        sum.gesamt += parsed.gesamt;
      }
      return sum;
    }, { ...EMPTY_STRENGTH });
    setGesamtStaerke(total);

    const effectiveAbschnittId =
      preferredAbschnittId && nextAbschnitte.some((item) => item.id === preferredAbschnittId)
        ? preferredAbschnittId
        : nextAbschnitte[0]?.id || '';

    setSelectedAbschnittId(effectiveAbschnittId);
    if (effectiveAbschnittId) {
      setDetails(await window.api.listAbschnittDetails(einsatzId, effectiveAbschnittId));
    } else {
      setDetails(EMPTY_DETAILS);
    }

  }, []);

  const refreshEinsaetze = useCallback(async () => {
    const next = await window.api.listEinsaetze();
    setEinsaetze(next);
    if (selectedEinsatzId && !next.some((item) => item.id === selectedEinsatzId)) {
      clearSelectedEinsatz();
    }
    return next;
  }, [clearSelectedEinsatz, selectedEinsatzId]);

  const refreshAll = useCallback(async () => {
    await refreshEinsaetze();
    if (selectedEinsatzId) {
      await loadEinsatz(selectedEinsatzId, selectedAbschnittId);
    }
  }, [loadEinsatz, refreshEinsaetze, selectedAbschnittId, selectedEinsatzId]);

  useEffect(() => {
    void (async () => {
      try {
        const [currentSession, settings] = await Promise.all([window.api.getSession(), window.api.getSettings()]);
        setDbPath(settings.dbPath);
        setUpdaterState(await window.api.getUpdaterState());
        void window.api.checkForUpdates();
        if (currentSession) {
          setSession(currentSession);
        } else {
          const autoSession = await window.api.login({ name: 'admin', passwort: 'admin' });
          setSession(autoSession);
        }
        if (currentSession) {
          await refreshEinsaetze();
        } else {
          await refreshEinsaetze();
        }
      } catch (err) {
        setError(readError(err));
      } finally {
        setAuthReady(true);
      }
    })();
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribe = window.updaterEvents.onStateChanged((state) => {
      setUpdaterState(state as UpdaterState);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session || !selectedEinsatzId) {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshAll();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [refreshAll, selectedEinsatzId, session]);

  useEffect(() => {
    if (!session || !selectedEinsatzId || !selectedAbschnittId) {
      return;
    }
    void (async () => {
      try {
        setDetails(await window.api.listAbschnittDetails(selectedEinsatzId, selectedAbschnittId));
      } catch (err) {
        setError(readError(err));
      }
    })();
  }, [selectedAbschnittId, selectedEinsatzId, session]);

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

  const doStartOpenExisting = async () => {
    await withBusy(async () => {
      const opened = await window.api.openEinsatzWithDialog();
      if (!opened) {
        return;
      }
      setEinsaetze((prev) => {
        const rest = prev.filter((item) => item.id !== opened.id);
        return [opened, ...rest];
      });
      setSelectedEinsatzId(opened.id);
      await loadEinsatz(opened.id);
      setStartChoice('open');
    });
  };

  const doStartOpenKnownEinsatz = async (einsatzId: string) => {
    await withBusy(async () => {
      const opened = await window.api.openEinsatz(einsatzId);
      if (!opened) {
        throw new Error('Einsatz konnte im Standardpfad nicht geöffnet werden.');
      }
      setSelectedEinsatzId(einsatzId);
      await loadEinsatz(einsatzId);
      setStartChoice('open');
    });
  };

  const doStartCreateEinsatz = async () => {
    if (!startNewEinsatzName.trim()) {
      setError('Bitte Einsatzname eingeben.');
      return;
    }

    await withBusy(async () => {
      const created = await window.api.createEinsatzWithDialog({
        name: startNewEinsatzName.trim(),
        fuestName: startNewFuestName.trim() || 'FüSt 1',
      });
      if (!created) {
        return;
      }
      setStartNewEinsatzName('');
      setEinsaetze((prev) => {
        const rest = prev.filter((item) => item.id !== created.id);
        return [created, ...rest];
      });
      setSelectedEinsatzId(created.id);
      await loadEinsatz(created.id);
      setStartChoice('open');
    });
  };

  const doCreateEinheit = () => {
    if (!selectedEinsatzId || !selectedAbschnittId || isArchived) return;
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
    });
    setShowCreateEinheitDialog(true);
  };

  const doCreateAbschnitt = () => {
    if (!selectedEinsatzId || isArchived) return;
    setCreateAbschnittForm({
      name: '',
      systemTyp: 'NORMAL',
      parentId: selectedAbschnittId || '',
    });
    setShowCreateAbschnittDialog(true);
  };

  const doEditSelectedAbschnitt = () => {
    if (!selectedAbschnittId || isArchived) return;
    const current = abschnitte.find((item) => item.id === selectedAbschnittId);
    if (!current) {
      setError('Abschnitt nicht gefunden.');
      return;
    }
    setEditAbschnittForm({
      abschnittId: current.id,
      name: current.name,
      systemTyp: current.systemTyp,
      parentId: current.parentId ?? '',
    });
    setShowEditAbschnittDialog(true);
  };

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
      setShowEditAbschnittDialog(false);
      await loadEinsatz(selectedEinsatzId, editAbschnittForm.abschnittId);
    });
  };

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
      });
      setShowCreateEinheitDialog(false);
      await refreshAll();
    });
  };

  const doOpenEditEinheitDialog = (einheitId: string) => {
    void (async () => {
    const einheit = allKraefte.find((item) => item.id === einheitId);
    if (!einheit) {
      setError('Einheit nicht gefunden.');
      return;
    }
    const helfer = await window.api.listEinheitHelfer(einheitId);
    setEditEinheitHelfer(helfer);
    const parsed = parseTaktischeStaerke(einheit.aktuelleStaerkeTaktisch, einheit.aktuelleStaerke);
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
    });
    setShowEditFahrzeugDialog(false);
    setShowEditEinheitDialog(true);
    })().catch((err) => setError(readError(err)));
  };

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
      });
      setShowEditEinheitDialog(false);
      setEditEinheitHelfer([]);
      await refreshAll();
    });
  };

  const doCreateEinheitHelfer = async (input: {
    name: string;
    rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
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

  const doDeleteEinheitHelfer = async (helferId: string) => {
    if (!selectedEinsatzId || isArchived) return;
    await withBusy(async () => {
      await window.api.deleteEinheitHelfer({ einsatzId: selectedEinsatzId, helferId });
      if (editEinheitForm.einheitId) {
        setEditEinheitHelfer(await window.api.listEinheitHelfer(editEinheitForm.einheitId));
      }
    });
  };

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

  const doOpenEditFahrzeugDialog = (fahrzeugId: string) => {
    const fahrzeug = allFahrzeuge.find((item) => item.id === fahrzeugId);
    if (!fahrzeug) {
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
  };

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
      setShowEditFahrzeugDialog(false);
      await refreshAll();
    });
  };

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

  const doSaveDbPath = async () => {
    await withBusy(async () => {
      await window.api.setDbPath(dbPath);
      clearSelectedEinsatz();
      setStartChoice('open');
      await refreshEinsaetze();
    });
  };

  const doRestoreBackup = async () => {
    if (!selectedEinsatzId) {
      setError('Bitte zuerst einen Einsatz auswählen.');
      return;
    }
    await withBusy(async () => {
      const restored = await window.api.restoreBackup(selectedEinsatzId);
      if (!restored) {
        return;
      }
      const reopened = await window.api.openEinsatz(selectedEinsatzId);
      if (!reopened) {
        throw new Error('Einsatz konnte nach Backup-Wiederherstellung nicht geöffnet werden.');
      }
      await loadEinsatz(selectedEinsatzId, selectedAbschnittId);
    });
  };

  const doMove = async () => {
    if (!moveDialog || !selectedEinsatzId || !moveTarget) return;
    await withBusy(async () => {
      if (moveDialog.type === 'einheit') {
        await window.api.moveEinheit({
          einsatzId: selectedEinsatzId,
          einheitId: moveDialog.id,
          nachAbschnittId: moveTarget,
        });
      } else {
        await window.api.moveFahrzeug({
          einsatzId: selectedEinsatzId,
          fahrzeugId: moveDialog.id,
          nachAbschnittId: moveTarget,
        });
      }
      setMoveDialog(null);
      setMoveTarget('');
      await refreshAll();
    });
  };

  const doDownloadUpdate = async () => {
    await withBusy(async () => {
      await window.api.downloadUpdate();
    });
  };

  const doInstallUpdate = async () => {
    await withBusy(async () => {
      await window.api.installDownloadedUpdate();
    });
  };

  const doOpenReleasePage = async () => {
    await withBusy(async () => {
      await window.api.openExternalUrl(RELEASES_URL);
    });
  };

  const doOpenStrengthDisplay = async () => {
    await withBusy(async () => {
      await window.api.openStrengthDisplayWindow();
      await window.api.setStrengthDisplayState({
        taktischeStaerke: toTaktischeStaerke(gesamtStaerke).replace(/\/(\d+)$/, '//$1'),
      });
    });
  };

  const doCloseStrengthDisplay = async () => {
    await withBusy(async () => {
      await window.api.closeStrengthDisplayWindow();
    });
  };

  useEffect(() => {
    void window.api.setStrengthDisplayState({
      taktischeStaerke: toTaktischeStaerke(gesamtStaerke).replace(/\/(\d+)$/, '//$1'),
    });
  }, [gesamtStaerke]);

  if (!authReady) {
    return (
      <>
        {renderUpdaterNotices()}
        <div className="login-page">
          <div className="panel start-screen-panel">
            <div className="login-header">
              <span className="login-logo-wrap">
                <img src="branding/logo.svg" alt="THW Logo" className="login-logo" />
              </span>
              <h1 className="login-title">S1-Control</h1>
            </div>
            <p className="hint">Initialisiere Anwendung …</p>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
        {renderUpdaterOverlay()}
      </>
    );
  }

  if (!session) {
    return (
      <>
        {renderUpdaterNotices()}
        <div className="login-page">
          <div className="panel start-screen-panel">
            <div className="login-header">
              <span className="login-logo-wrap">
                <img src="branding/logo.svg" alt="THW Logo" className="login-logo" />
              </span>
              <h1 className="login-title">S1-Control</h1>
            </div>
            <p className="error">{error || 'Automatische Anmeldung fehlgeschlagen.'}</p>
          </div>
        </div>
        {renderUpdaterOverlay()}
      </>
    );
  }

  if (!selectedEinsatzId) {
    return (
      <>
        {renderUpdaterNotices()}
        <StartView
          startChoice={startChoice}
          setStartChoice={setStartChoice}
          busy={busy}
          error={error}
          einsaetze={einsaetze}
          startNewEinsatzName={startNewEinsatzName}
          setStartNewEinsatzName={setStartNewEinsatzName}
          startNewFuestName={startNewFuestName}
          setStartNewFuestName={setStartNewFuestName}
          appVersion={updaterState.currentVersion}
          updaterState={updaterState}
          onOpenExisting={() => void doStartOpenExisting()}
          onOpenKnownEinsatz={(einsatzId) => void doStartOpenKnownEinsatz(einsatzId)}
          onCreate={() => void doStartCreateEinsatz()}
        />
        {renderUpdaterOverlay()}
      </>
    );
  }

  return (
    <div className="app-shell">
      <Topbar
        einsatzName={selectedEinsatz?.name ?? '-'}
        gesamtStaerke={gesamtStaerke}
        now={now}
        onOpenStrengthDisplay={() => void doOpenStrengthDisplay()}
        onCloseStrengthDisplay={() => void doCloseStrengthDisplay()}
        busy={busy}
      />

      {renderUpdaterNotices()}

      {isArchived && <div className="banner">Einsatz ist archiviert (nur lesen).</div>}
      {error && <div className="error-banner">{error}</div>}

      <main className={showAbschnittSidebar ? 'content content-with-sidebar' : 'content content-no-sidebar'}>
        <WorkspaceRail activeView={activeView} onSelect={setActiveView} />
        {showAbschnittSidebar && (
          <AbschnittSidebar
            abschnitte={abschnitte}
            selectedId={selectedAbschnittId}
            einsatzName={selectedEinsatz?.name}
            onSelect={setSelectedAbschnittId}
            onEditSelected={doEditSelectedAbschnitt}
            editDisabled={busy || !selectedAbschnittId || isArchived}
          />
        )}

        <section className="main-view">
          {activeView === 'einsatz' && (
            <>
              <InlineEinheitEditor
                visible={showEditEinheitDialog}
                busy={busy}
                isArchived={isArchived ?? false}
                form={editEinheitForm}
                onChange={setEditEinheitForm}
                onSubmit={() => void doSubmitEditEinheit()}
                onCancel={() => {
                  setShowEditEinheitDialog(false);
                  setEditEinheitHelfer([]);
                }}
                helfer={editEinheitHelfer}
                onCreateHelfer={doCreateEinheitHelfer}
                onUpdateHelfer={doUpdateEinheitHelfer}
                onDeleteHelfer={doDeleteEinheitHelfer}
              />
              <InlineFahrzeugEditor
                visible={showEditFahrzeugDialog}
                busy={busy}
                isArchived={isArchived ?? false}
                form={editFahrzeugForm}
                allKraefte={allKraefte}
                onChange={setEditFahrzeugForm}
                onSubmit={() => void doSubmitEditFahrzeug()}
                onCancel={() => setShowEditFahrzeugDialog(false)}
              />
              <button onClick={doCreateEinheit} disabled={busy || !selectedAbschnittId || isArchived}>
                Einheit anlegen
              </button>
              <EinsatzOverviewView
                details={details}
                selectedEinsatz={selectedEinsatz}
                isArchived={isArchived ?? false}
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
              />
            </>
          )}

          {activeView === 'fuehrung' && (
            <>
              <div className="inline-actions">
                <button onClick={doCreateAbschnitt} disabled={busy || !selectedEinsatzId || isArchived}>
                  Abschnitt anlegen
                </button>
              </div>
              <FuehrungsstrukturView abschnitte={abschnitte} kraefte={allKraefte} />
            </>
          )}

          {activeView === 'kraefte' && (
            <>
              <InlineEinheitEditor
                visible={showEditEinheitDialog}
                busy={busy}
                isArchived={isArchived ?? false}
                form={editEinheitForm}
                onChange={setEditEinheitForm}
                onSubmit={() => void doSubmitEditEinheit()}
                onCancel={() => {
                  setShowEditEinheitDialog(false);
                  setEditEinheitHelfer([]);
                }}
                helfer={editEinheitHelfer}
                onCreateHelfer={doCreateEinheitHelfer}
                onUpdateHelfer={doUpdateEinheitHelfer}
                onDeleteHelfer={doDeleteEinheitHelfer}
              />
              <div className="inline-actions">
                <select
                  value={kraefteOrgFilter}
                  onChange={(e) => setKraefteOrgFilter(e.target.value as OrganisationKey | 'ALLE')}
                  disabled={busy}
                >
                  <option value="ALLE">Alle Organisationen</option>
                  {ORGANISATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button onClick={doCreateAbschnitt} disabled={busy || !selectedEinsatzId || isArchived}>
                  Abschnitt anlegen
                </button>
                <button onClick={doCreateEinheit} disabled={busy || !selectedAbschnittId || isArchived}>
                  Einheit anlegen
                </button>
              </div>
              <KraefteOverviewTable
                einheiten={
                  kraefteOrgFilter === 'ALLE'
                    ? allKraefte
                    : allKraefte.filter((e) => e.organisation === kraefteOrgFilter)
                }
                isArchived={isArchived ?? false}
                onMove={(id) => {
                  setMoveDialog({ type: 'einheit', id });
                  setMoveTarget(selectedAbschnittId);
                }}
                onEdit={doOpenEditEinheitDialog}
                onSplit={doOpenSplitEinheitDialog}
              />
            </>
          )}

          {activeView === 'fahrzeuge' && (
            <>
              <InlineFahrzeugEditor
                visible={showEditFahrzeugDialog}
                busy={busy}
                isArchived={isArchived ?? false}
                form={editFahrzeugForm}
                allKraefte={allKraefte}
                onChange={setEditFahrzeugForm}
                onSubmit={() => void doSubmitEditFahrzeug()}
                onCancel={() => setShowEditFahrzeugDialog(false)}
              />
              <button onClick={doCreateFahrzeug} disabled={busy || !selectedAbschnittId || isArchived}>
                Fahrzeug anlegen
              </button>
              <FahrzeugeOverviewTable
                fahrzeuge={allFahrzeuge}
                isArchived={isArchived ?? false}
                onMove={(id) => {
                  setMoveDialog({ type: 'fahrzeug', id });
                  setMoveTarget(selectedAbschnittId);
                }}
                onEdit={doOpenEditFahrzeugDialog}
              />
            </>
          )}

          {activeView === 'einstellungen' && (
            <SettingsView
              busy={busy}
              dbPath={dbPath}
              selectedEinsatzId={selectedEinsatzId}
              onChangeDbPath={setDbPath}
              onSaveDbPath={() => void doSaveDbPath()}
              onRestoreBackup={() => void doRestoreBackup()}
            />
          )}
        </section>
      </main>

      <MoveDialog
        visible={Boolean(moveDialog)}
        type={moveDialog?.type ?? 'einheit'}
        abschnitte={abschnitte}
        moveTarget={moveTarget}
        isArchived={isArchived ?? false}
        onChangeTarget={setMoveTarget}
        onConfirm={() => void doMove()}
        onClose={() => {
          setMoveDialog(null);
          setMoveTarget('');
        }}
      />

      <CreateEinheitDialog
        visible={showCreateEinheitDialog}
        busy={busy}
        isArchived={isArchived ?? false}
        form={createEinheitForm}
        abschnitte={abschnitte}
        onChange={setCreateEinheitForm}
        onSubmit={() => void doSubmitCreateEinheit()}
        onClose={() => setShowCreateEinheitDialog(false)}
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
        onClose={() => setShowEditAbschnittDialog(false)}
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

      {renderUpdaterOverlay()}
    </div>
  );
}
