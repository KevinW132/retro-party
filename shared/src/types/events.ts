import type { Player } from './player';
import type { RoomSummary } from './room';
import type { ChatMessage } from './chat';
import type { GameId, GameMeta, GameStateSnapshot, GameResult, TimerSnapshot } from './game';
import type { DrawingStrokeEvent } from './game';

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_EXPIRED'
  | 'NAME_REQUIRED'
  | 'NAME_TAKEN'
  | 'INVALID_CODE'
  | 'NOT_IN_ROOM'
  | 'NOT_HOST'
  | 'INVALID_PAYLOAD'
  | 'RATE_LIMITED'
  | 'GAME_NOT_FOUND'
  | 'GAME_ALREADY_IN_PROGRESS'
  | 'UNKNOWN';

export interface AppError {
  code: ErrorCode;
  message: string;
}

// ---------- Client -> Server ----------
export interface RoomCreatePayload {
  playerName: string;
}
export interface RoomJoinPayload {
  code: string;
  playerName: string;
  playerId?: string; // present on reconnect attempts
}
export interface RoomReadyPayload {
  ready: boolean;
}
export interface ChatSendPayload {
  text: string;
}
export interface GameSelectPayload {
  gameIds: GameId[];
}
export interface AnswerSubmitPayload {
  value: string;
  at: number;
}
export interface DrawingWordsSubmitPayload {
  words: string[];
}
export interface PhotoSubmitPayload {
  dataUrl: string;
}

// ---------- Server -> Client ----------
export interface RoomStatePayload {
  room: RoomSummary;
  you: Player;
}
export interface GameCatalogPayload {
  games: GameMeta[];
}
export interface GameStatePayload {
  state: GameStateSnapshot;
}
export interface RoundLifecyclePayload {
  gameId: GameId;
  round: number;
  timer: TimerSnapshot | null;
}
export interface ScoreUpdatePayload {
  scores: Record<string, number>;
  lastDelta?: { playerId: string; delta: number; reason: string };
}
export interface GameFinishedPayload {
  result: GameResult;
  hasNextGame: boolean;
}
export interface FinalResultPayload {
  scores: Record<string, number>;
  winnerId: string | null;
  history: GameResult[];
}
export interface PlayerConnectionPayload {
  playerId: string;
  playerName: string;
  connected: boolean;
  graceEndsAt?: number;
}

export type { DrawingStrokeEvent };
