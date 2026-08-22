import type { Player } from './player';

export type RoomStatus =
  | 'LOBBY'
  | 'GAME_SELECTION'
  | 'GAME_CONFIG'
  | 'GAME_LOADING'
  | 'IN_GAME'
  | 'ROUND_END'
  | 'GAME_RESULT'
  | 'FINAL_RESULT';

export interface RoomSummary {
  code: string;
  status: RoomStatus;
  players: Player[];
  hostId: string;
  gameQueue: string[];
  currentGameIndex: number;
  createdAt: number;
  gameHistory: import('./game').GameResult[];
}

export interface DisconnectInfo {
  playerId: string;
  graceEndsAt: number;
}
