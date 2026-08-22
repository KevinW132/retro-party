/** Alternates whose "turn" it is across rounds for turn-based games (e.g. Drawing & Guess). */
export class TurnManager {
  private order: string[];
  private index = 0;

  constructor(playerIds: string[]) {
    this.order = [...playerIds];
  }

  current(): string {
    return this.order[this.index % this.order.length];
  }

  other(): string {
    return this.order[(this.index + 1) % this.order.length];
  }

  advance(): string {
    this.index += 1;
    return this.current();
  }
}
