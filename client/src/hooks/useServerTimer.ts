import { useEffect, useState } from 'react';
import type { TimerSnapshot } from '@retro-party/shared';

/** Renders a countdown from a server-provided `endsAt` timestamp. The server
 * is what actually enforces expiry (emits TIME_EXPIRED / resolves the round);
 * this hook is purely cosmetic and never the source of truth. */
export function useServerTimer(timer: TimerSnapshot | null): { remainingMs: number; remainingSec: number; ratio: number } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [timer]);

  if (!timer) return { remainingMs: 0, remainingSec: 0, ratio: 0 };
  const remainingMs = Math.max(0, timer.endsAt - now);
  const ratio = timer.durationMs > 0 ? remainingMs / timer.durationMs : 0;
  return { remainingMs, remainingSec: Math.ceil(remainingMs / 1000), ratio };
}
