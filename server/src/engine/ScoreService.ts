import { ScoreEvent } from '@retro-party/shared';

export class ScoreService {
  private scores = new Map<string, number>();
  private history = new Map<string, ScoreEvent[]>();

  register(playerId: string): void {
    if (!this.scores.has(playerId)) {
      this.scores.set(playerId, 0);
      this.history.set(playerId, []);
    }
  }

  add(playerId: string, delta: number, reason: string): number {
    this.register(playerId);
    const next = Math.max(0, (this.scores.get(playerId) ?? 0) + delta);
    this.scores.set(playerId, next);
    this.history.get(playerId)!.push({ delta, reason, at: Date.now() });
    return next;
  }

  get(playerId: string): number {
    return this.scores.get(playerId) ?? 0;
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.scores.entries());
  }

  historyFor(playerId: string): ScoreEvent[] {
    return this.history.get(playerId) ?? [];
  }

  reset(): void {
    this.scores.clear();
    this.history.clear();
  }
}
