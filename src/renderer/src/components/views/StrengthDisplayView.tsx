import { useEffect, useMemo, useState } from 'react';
import { toNatoDateTime } from '@renderer/utils/datetime';
import type { StrengthDisplayState } from '@shared/types';

const DEFAULT_STATE: StrengthDisplayState = { taktischeStaerke: '0/0/0//0' };

export function StrengthDisplayView(): JSX.Element {
  const [state, setState] = useState<StrengthDisplayState>(DEFAULT_STATE);
  const [now, setNow] = useState(new Date());
  const [inverted, setInverted] = useState(false);

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

  const containerClass = useMemo(
    () => `strength-display ${inverted ? 'is-inverted' : ''}`,
    [inverted],
  );

  return (
    <div className={containerClass}>
      <div className="strength-display-inner">
        <div className="strength-display-value" onDoubleClick={() => setInverted((prev) => !prev)}>
          {state.taktischeStaerke}
        </div>
        <div className="strength-display-time" onDoubleClick={() => setInverted((prev) => !prev)}>
          {toNatoDateTime(now)}
        </div>
      </div>
    </div>
  );
}
