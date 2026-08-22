import { TimerSnapshot } from '@retro-party/shared';

/** Server-authoritative round timer. The client only ever renders the
 * `endsAt` timestamp this produces — expiry is decided here, not in the browser. */
export class TimerService {
  private handle: NodeJS.Timeout | null = null;
  private snapshot: TimerSnapshot | null = null;

  start(durationMs: number, onExpire: () => void): TimerSnapshot {
    this.clear();
    const startedAt = Date.now();
    const endsAt = startedAt + durationMs;
    this.snapshot = { startedAt, endsAt, durationMs };
    this.handle = setTimeout(() => {
      this.handle = null;
      onExpire();
    }, durationMs);
    return this.snapshot;
  }

  clear(): void {
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
    this.snapshot = null;
  }

  current(): TimerSnapshot | null {
    return this.snapshot;
  }

  elapsedMs(): number {
    if (!this.snapshot) return 0;
    return Math.max(0, Date.now() - this.snapshot.startedAt);
  }
}
