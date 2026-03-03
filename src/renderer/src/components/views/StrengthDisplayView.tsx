import { useEffect, useMemo, useState } from 'react';
import { toNatoDateTime } from '@renderer/utils/datetime';
import type { StrengthDisplayState } from '@shared/types';

const DEFAULT_STATE: StrengthDisplayState = { taktischeStaerke: '0/0/0//0' };

/**
 * Handles Strength Display View.
 */
export function StrengthDisplayView(): JSX.Element {
  const [state, setState] = useState<StrengthDisplayState>(DEFAULT_STATE);
  const [now, setNow] = useState(new Date());
  const [inverted, setInverted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    void (async () => {
      setState(await window.api.getStrengthDisplayState());
    })();
    const unsubscribe = window.strengthDisplayEvents.onStateChanged((next) => {
      setState(next as StrengthDisplayState);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    /**
     * Handles Global Click.
     */
    const onGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (target.closest('.strength-display-corner-left')) {
        return;
      }
      setMenuOpen(false);
    };
    /**
     * Handles Key Down.
     */
    const onKeyDown = (event: KeyboardEvent) => {
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
  }, []);

  useEffect(() => {
    /**
     * Handles On Resize.
     */
    const onResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const containerClass = useMemo(
    () => `strength-display ${inverted ? 'is-inverted' : ''}`,
    [inverted],
  );

  const calcFitFontSize = (
    text: string,
    maxWidthRatio: number,
    maxHeightRatio: number,
    charWidthEm: number,
    letterSpacingEm = 0,
  ): number => {
    const safeTextLength = Math.max(1, text.trim().length);
    const widthUnits = safeTextLength * (charWidthEm + letterSpacingEm);
    const byWidth = (viewport.width * maxWidthRatio) / widthUnits;
    const byHeight = viewport.height * maxHeightRatio;
    return Math.max(24, Math.floor(Math.min(byWidth, byHeight)));
  };

  const strengthFontSize = calcFitFontSize(state.taktischeStaerke, 0.95, 0.42, 0.62, 0.04);
  const timeLabel = toNatoDateTime(now);
  const timeFontSize = calcFitFontSize(timeLabel, 0.95, 0.24, 0.7, 0.05);

  /**
   * Handles Closing The Strength Display Window.
   */
  const closeMonitor = async (): Promise<void> => {
    await window.api.closeStrengthDisplayWindow();
  };

  return (
    <div className={containerClass}>
      <div className="strength-display-corner strength-display-corner-left">
        <button
          type="button"
          className="strength-display-corner-button"
          aria-label="Menü öffnen"
          title="Monitor-Menü"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          ☰
        </button>
        {menuOpen ? (
          <div className="strength-display-menu">
            <button
              type="button"
              className="strength-display-menu-item"
              onClick={() => {
                setInverted((prev) => !prev);
                setMenuOpen(false);
              }}
            >
              Schwarz/Weiß wechseln
            </button>
            <div className="strength-display-menu-hint">Weitere Einstellungen folgen</div>
          </div>
        ) : null}
      </div>
      <div className="strength-display-corner strength-display-corner-right">
        <button
          type="button"
          className="strength-display-corner-button"
          aria-label="Monitor schließen"
          title="Monitor schließen"
          onClick={() => {
            void closeMonitor();
          }}
        >
          ×
        </button>
      </div>
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
