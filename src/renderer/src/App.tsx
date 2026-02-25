import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AbschnittDetails, EinsatzListItem, OrganisationKey, SessionUser, UpdaterState } from '@shared/types';
import { ORGANISATION_OPTIONS } from '@renderer/constants/organisation';
import { CreateEinheitDialog } from '@renderer/components/dialogs/CreateEinheitDialog';
import { CreateFahrzeugDialog } from '@renderer/components/dialogs/CreateFahrzeugDialog';
import { MoveDialog } from '@renderer/components/dialogs/MoveDialog';
import { SplitEinheitDialog } from '@renderer/components/dialogs/SplitEinheitDialog';
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
  CreateEinheitForm,
  CreateFahrzeugForm,
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
  const [hasUndo, setHasUndo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updaterState, setUpdaterState] = useState<UpdaterState>(DEFAULT_UPDATER_STATE);

  const [moveDialog, setMoveDialog] = useState<MoveDialogState | null>(null);
  const [moveTarget, setMoveTarget] = useState('');

  const [showCreateEinheitDialog, setShowCreateEinheitDialog] = useState(false);
  const [createEinheitForm, setCreateEinheitForm] = useState<CreateEinheitForm>({
    nameImEinsatz: '',
    organisation: 'THW',
    fuehrung: '0',
    unterfuehrung: '1',
    mannschaft: '8',
    status: 'AKTIV',
    abschnittId: '',
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
  });

  const [startChoice, setStartChoice] = useState<'none' | 'open' | 'create'>('none');
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

  const renderUpdaterNotices = () => (
    <>
      {updaterState.stage === 'available' && (
        <div className="update-banner">
          Update verfügbar {updaterState.version ? `(${updaterState.version})` : ''}.
          <button onClick={() => void doDownloadUpdate()} disabled={busy}>
            Update herunterladen
          </button>
        </div>
      )}
      {updaterState.stage === 'downloaded' && (
        <div className="update-banner">
          Update heruntergeladen {updaterState.version ? `(${updaterState.version})` : ''}.
          <button onClick={() => void doInstallUpdate()} disabled={busy}>
            Jetzt neu starten
          </button>
        </div>
      )}
      {updaterState.stage === 'error' && <div className="error-banner">Update-Fehler: {updaterState.message}</div>}
      {updaterState.stage === 'unsupported' && <div className="banner">{updaterState.message}</div>}
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
    setHasUndo(false);
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
    const nextAllFahrzeuge = allDetails.flatMap((d, index) => {
      const abschnittName = nextAbschnitte[index]?.name ?? 'Unbekannt';
      return d.fahrzeuge.map((fahrzeug) => ({
        ...fahrzeug,
        abschnittName,
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

    setHasUndo(await window.api.hasUndoableCommand(einsatzId));
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
      setStartChoice('none');
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
      setStartChoice('none');
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
    });
    setShowCreateEinheitDialog(true);
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

    await withBusy(async () => {
      await window.api.createEinheit({
        einsatzId: selectedEinsatzId,
        nameImEinsatz: createEinheitForm.nameImEinsatz.trim(),
        organisation: createEinheitForm.organisation,
        aktuelleStaerke: gesamt,
        aktuelleStaerkeTaktisch: taktisch,
        aktuellerAbschnittId: createEinheitForm.abschnittId,
        status: createEinheitForm.status,
      });
      setShowCreateEinheitDialog(false);
      await refreshAll();
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
      });
      setShowCreateFahrzeugDialog(false);
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

  const doUndo = async () => {
    if (!selectedEinsatzId || isArchived) return;
    await withBusy(async () => {
      await window.api.undoLastCommand(selectedEinsatzId);
      await refreshAll();
    });
  };

  const doSaveDbPath = async () => {
    await withBusy(async () => {
      await window.api.setDbPath(dbPath);
      clearSelectedEinsatz();
      setStartChoice('none');
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
          onOpenExisting={() => void doStartOpenExisting()}
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
        busy={busy}
        hasUndo={hasUndo}
        isArchived={isArchived ?? false}
        selectedEinsatzId={selectedEinsatzId}
        onUndo={() => void doUndo()}
      />

      {renderUpdaterNotices()}

      {isArchived && <div className="banner">Einsatz ist archiviert (nur lesen).</div>}
      {error && <div className="error-banner">{error}</div>}

      <main className="content">
        <WorkspaceRail activeView={activeView} onSelect={setActiveView} />
        <AbschnittSidebar
          abschnitte={abschnitte}
          selectedId={selectedAbschnittId}
          einsatzName={selectedEinsatz?.name}
          onSelect={setSelectedAbschnittId}
        />

        <section className="main-view">
          {activeView === 'einsatz' && (
            <>
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
                onSplitEinheit={doOpenSplitEinheitDialog}
                onMoveFahrzeug={(id) => {
                  setMoveDialog({ type: 'fahrzeug', id });
                  setMoveTarget(selectedAbschnittId);
                }}
              />
            </>
          )}

          {activeView === 'fuehrung' && <FuehrungsstrukturView abschnitte={abschnitte} kraefte={allKraefte} />}

          {activeView === 'kraefte' && (
            <>
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
                onSplit={doOpenSplitEinheitDialog}
              />
            </>
          )}

          {activeView === 'fahrzeuge' && (
            <>
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
