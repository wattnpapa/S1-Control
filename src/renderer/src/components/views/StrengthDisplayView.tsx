import { useEffect, useMemo, useState } from 'react';
import { toNatoDateTime } from '@renderer/utils/datetime';
import type { StrengthDisplayState } from '@shared/types';

const DEFAULT_STATE: StrengthDisplayState = { taktischeStaerke: '0/0/0//0' };

interface FitFontSizeOptions {
  text: string;
  viewport: { width: number; height: number };
  maxWidthRatio: number;
  maxHeightRatio: number;
  charWidthEm: number;
  letterSpacingEm?: number;
}

/**
 * Calculates best-fit font size for a text within viewport bounds.
 */
function calcFitFontSize(options: FitFontSizeOptions): number {
  const {
    text,
    viewport,
    maxWidthRatio,
    maxHeightRatio,
    charWidthEm,
    letterSpacingEm = 0,
  } = options;
  const safeTextLength = Math.max(1, text.trim().length);
  const widthUnits = safeTextLength * (charWidthEm + letterSpacingEm);
  const byWidth = (viewport.width * maxWidthRatio) / widthUnits;
  const byHeight = viewport.height * maxHeightRatio;
  return Math.max(24, Math.floor(Math.min(byWidth, byHeight)));
}

/**
 * Subscribes to strength state updates.
 */
function useStrengthState(): StrengthDisplayState {
  const [state, setState] = useState<StrengthDisplayState>(DEFAULT_STATE);
  useEffect(() => {
    void (async () => {
      setState(await window.api.getStrengthDisplayState());
    })();
    const unsubscribe = window.strengthDisplayEvents.onStateChanged((next) => {
      setState(next as StrengthDisplayState);
    });
    return () => unsubscribe();
  }, []);
  return state;
}

/**
 * Tracks current monitor viewport size.
 */
function useViewport(): { width: number; height: number } {
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    const onResize = (): void => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return viewport;
}

/**
 * Tracks current time for the monitor clock.
 */
function useClock(): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/**
 * Closes menu when clicking outside or pressing escape.
 */
function useMenuAutoClose(setMenuOpen: (open: boolean) => void): void {
  useEffect(() => {
    const onGlobalClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('.strength-display-corner-left')) {
        return;
      }
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onGlobalClick);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onGlobalClick);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [setMenuOpen]);
}

/**
 * Renders monitor corner action controls.
 */
function StrengthCornerActions({
  menuOpen,
  onToggleMenu,
  onToggleInverted,
  onClose,
}: {
  menuOpen: boolean;
  onToggleMenu: () => void;
  onToggleInverted: () => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <>
      <div className="strength-display-corner strength-display-corner-left">
        <CornerButton className="strength-display-corner-button" label="Menü öffnen" title="Monitor-Menü" onClick={onToggleMenu}>
          ☰
        </CornerButton>
        {menuOpen ? (
          <div className="strength-display-menu">
            <button type="button" className="strength-display-menu-item" onClick={onToggleInverted}>
              Schwarz/Weiß wechseln
            </button>
            <div className="strength-display-menu-hint">Weitere Einstellungen folgen</div>
          </div>
        ) : null}
      </div>
      <div className="strength-display-corner strength-display-corner-right">
        <CornerButton className="strength-display-corner-button" label="Monitor schließen" title="Monitor schließen" onClick={onClose}>
          ×
        </CornerButton>
      </div>
    </>
  );
}

/**
 * Renders a corner action button.
 */
function CornerButton({
  className,
  label,
  title,
  onClick,
  children,
}: {
  className: string;
  label: string;
  title: string;
  onClick: () => void;
  children: string;
}): JSX.Element {
  return (
    <button type="button" className={className} aria-label={label} title={title} onClick={onClick}>
      {children}
    </button>
  );
}

/**
 * Handles Strength Display View.
 */
export function StrengthDisplayView(): JSX.Element {
  const state = useStrengthState();
  const now = useClock();
  const [inverted, setInverted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const viewport = useViewport();
  useMenuAutoClose(setMenuOpen);

  const containerClass = useMemo(
    () => `strength-display ${inverted ? 'is-inverted' : ''}`,
    [inverted],
  );
  const strengthFontSize = calcFitFontSize({
    text: state.taktischeStaerke,
    viewport,
    maxWidthRatio: 0.95,
    maxHeightRatio: 0.42,
    charWidthEm: 0.62,
    letterSpacingEm: 0.04,
  });
  const timeLabel = toNatoDateTime(now);
  const timeFontSize = calcFitFontSize({
    text: timeLabel,
    viewport,
    maxWidthRatio: 0.95,
    maxHeightRatio: 0.24,
    charWidthEm: 0.7,
    letterSpacingEm: 0.05,
  });

  /**
   * Handles Closing The Strength Display Window.
   */
  const closeMonitor = async (): Promise<void> => {
    await window.api.closeStrengthDisplayWindow();
  };

  return (
    <div className={containerClass}>
      <StrengthCornerActions
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((prev) => !prev)}
        onToggleInverted={() => {
          setInverted((prev) => !prev);
          setMenuOpen(false);
        }}
        onClose={() => {
          void closeMonitor();
        }}
      />
      <div className="strength-display-inner">
        <div
          className="strength-display-value"
          style={{ fontSize: `${strengthFontSize}px` }}
          onDoubleClick={() => setInverted((prev) => !prev)}
        >
          {state.taktischeStaerke}
        </div>
        <div
          className="strength-display-time"
          style={{ fontSize: `${timeFontSize}px` }}
          onDoubleClick={() => setInverted((prev) => !prev)}
        >
          {timeLabel}
        </div>
      </div>
    </div>
  );
}
