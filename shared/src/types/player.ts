export interface Player {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
  score: number;
  isHost: boolean;
  joinedAt: number;
}

export interface ScoreEvent {
  delta: number;
  reason: string;
  at: number;
}

export interface PlayerScore {
  playerId: string;
  total: number;
  history: ScoreEvent[];
}
