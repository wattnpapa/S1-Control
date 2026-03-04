import { UpdaterNotices, UpdaterOverlay } from '@renderer/components/common/UpdaterUi';
import { StartView } from '@renderer/components/views/StartView';
import type { EinsatzListItem, SessionUser, UpdaterState } from '@shared/types';
import type { Dispatch, JSX, SetStateAction } from 'react';

interface AppEntryViewProps {
  authReady: boolean;
  session: SessionUser | null;
  selectedEinsatzId: string;
  updaterState: UpdaterState;
  busy: boolean;
  error: string | null;
  startChoice: 'none' | 'open' | 'create';
  setStartChoice: Dispatch<SetStateAction<'none' | 'open' | 'create'>>;
  einsaetze: EinsatzListItem[];
  startNewEinsatzName: string;
  setStartNewEinsatzName: Dispatch<SetStateAction<string>>;
  startNewFuestName: string;
  setStartNewFuestName: Dispatch<SetStateAction<string>>;
  onDownloadUpdate: () => void;
  onOpenReleasePage: () => void;
  onOpenExisting: () => void;
  onOpenKnownEinsatz: (einsatzId: string) => void;
  onCreate: () => void;
}

/**
 * Renders startup states before the workspace is available.
 */
export function AppEntryView(props: AppEntryViewProps): JSX.Element | null {
  const notices = (
    <UpdaterNotices
      updaterState={props.updaterState}
      busy={props.busy}
      onDownloadUpdate={props.onDownloadUpdate}
      onOpenReleasePage={props.onOpenReleasePage}
    />
  );

  if (!props.authReady) {
    return (
      <>
        {notices}
        <div className="login-page">
          <div className="panel start-screen-panel">
            <div className="login-header">
              <span className="login-logo-wrap">
                <img src="branding/logo.svg" alt="THW Logo" className="login-logo" />
              </span>
              <h1 className="login-title">S1-Control</h1>
            </div>
            <p className="hint">Initialisiere Anwendung …</p>
            {props.error && <p className="error">{props.error}</p>}
          </div>
        </div>
        <UpdaterOverlay updaterState={props.updaterState} />
      </>
    );
  }

  if (!props.session) {
    return (
      <>
        {notices}
        <div className="login-page">
          <div className="panel start-screen-panel">
            <div className="login-header">
              <span className="login-logo-wrap">
                <img src="branding/logo.svg" alt="THW Logo" className="login-logo" />
              </span>
              <h1 className="login-title">S1-Control</h1>
            </div>
            <p className="error">{props.error || 'Automatische Anmeldung fehlgeschlagen.'}</p>
          </div>
        </div>
        <UpdaterOverlay updaterState={props.updaterState} />
      </>
    );
  }

  if (!props.selectedEinsatzId) {
    return (
      <>
        {notices}
        <StartView
          startChoice={props.startChoice}
          setStartChoice={props.setStartChoice}
          busy={props.busy}
          error={props.error}
          einsaetze={props.einsaetze}
          startNewEinsatzName={props.startNewEinsatzName}
          setStartNewEinsatzName={props.setStartNewEinsatzName}
          startNewFuestName={props.startNewFuestName}
          setStartNewFuestName={props.setStartNewFuestName}
          appVersion={props.updaterState.currentVersion}
          onOpenExisting={props.onOpenExisting}
          onOpenKnownEinsatz={props.onOpenKnownEinsatz}
          onCreate={props.onCreate}
        />
        <UpdaterOverlay updaterState={props.updaterState} />
      </>
    );
  }

  return null;
}
