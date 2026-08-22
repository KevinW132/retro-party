import { GameMeta, GamePhase, Player, TimerSnapshot } from '@retro-party/shared';
import { ScoreService } from '../engine/ScoreService';

export interface EmitStateParams {
  phase: GamePhase;
  data: unknown;
  round?: number;
  totalRounds?: number;
  timer?: TimerSnapshot | null;
}

/** What a GameModule is handed to drive a room's active game. The module never
 * touches sockets directly — it only calls back into this API, and the engine
 * is the one thing that actually broadcasts to the room. */
export interface EngineApi {
  roomCode: string;
  players: Player[];
  scores: ScoreService;
  emitState(params: EmitStateParams): void;
  startTimer(durationMs: number, onExpire: () => void): TimerSnapshot;
  clearTimer(): void;
  currentTimer(): TimerSnapshot | null;
  addScore(playerId: string, delta: number, reason: string): void;
  /** Send data only one player's socket receives — used to keep secrets (e.g.
   * the word to draw) out of the broadcast state the other player can read. */
  whisper(playerId: string, data: unknown): void;
  finish(stats: Record<string, string | number>): void;
  playerName(playerId: string): string;
  otherPlayerId(playerId: string): string | undefined;
}

export interface GameModule<TConfig extends Record<string, unknown> = Record<string, unknown>> {
  meta: GameMeta;
  defaultConfig: TConfig;
  /** Kick off the game for the room (first round, initial broadcast). */
  start(api: EngineApi, config: TConfig): void;
  /** Handle a gameplay action scoped to this game module (answer, stroke, words...). */
  onAction(api: EngineApi, playerId: string, action: string, payload: unknown): void;
  onPlayerDisconnect?(api: EngineApi, playerId: string): void;
}
