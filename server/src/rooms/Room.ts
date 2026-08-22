import {
  Player,
  RoomStatus,
  RoomSummary,
  GameResult,
  GameId,
  ChatMessage,
  MAX_PLAYERS_PER_ROOM,
} from '@retro-party/shared';

export interface InternalPlayer extends Player {
  socketId: string | null;
  disconnectTimer: NodeJS.Timeout | null;
}

export class Room {
  code: string;
  status: RoomStatus = 'LOBBY';
  players: InternalPlayer[] = [];
  gameQueue: GameId[] = [];
  currentGameIndex = -1;
  gameHistory: GameResult[] = [];
  createdAt = Date.now();
  lastActivityAt = Date.now();
  chatHistory: ChatMessage[] = [];
  /** Set by GameEngine once a game module is active for this room. */
  engine: unknown = null;

  constructor(code: string) {
    this.code = code;
  }

  touch(): void {
    this.lastActivityAt = Date.now();
  }

  get hostId(): string {
    return this.players.find((p) => p.isHost)?.id ?? '';
  }

  get isFull(): boolean {
    return this.players.length >= MAX_PLAYERS_PER_ROOM;
  }

  get isEmpty(): boolean {
    return this.players.length === 0;
  }

  getPlayer(playerId: string): InternalPlayer | undefined {
    return this.players.find((p) => p.id === playerId);
  }

  getPlayerBySocket(socketId: string): InternalPlayer | undefined {
    return this.players.find((p) => p.socketId === socketId);
  }

  addPlayer(name: string, socketId: string): InternalPlayer {
    const player: InternalPlayer = {
      id: crypto.randomUUID(),
      name,
      connected: true,
      ready: false,
      score: 0,
      isHost: this.players.length === 0,
      joinedAt: Date.now(),
      socketId,
      disconnectTimer: null,
    };
    this.players.push(player);
    this.touch();
    return player;
  }

  reattachPlayer(playerId: string, socketId: string): InternalPlayer | undefined {
    const player = this.getPlayer(playerId);
    if (!player) return undefined;
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }
    player.socketId = socketId;
    player.connected = true;
    this.touch();
    return player;
  }

  removePlayer(playerId: string): void {
    this.players = this.players.filter((p) => p.id !== playerId);
    if (this.players.length > 0 && !this.players.some((p) => p.isHost)) {
      this.players[0].isHost = true;
    }
    this.touch();
  }

  pushChat(message: ChatMessage): void {
    this.chatHistory.push(message);
    if (this.chatHistory.length > 50) this.chatHistory.shift();
    this.touch();
  }

  toSummary(): RoomSummary {
    return {
      code: this.code,
      status: this.status,
      players: this.players.map(stripInternal),
      hostId: this.hostId,
      gameQueue: this.gameQueue,
      currentGameIndex: this.currentGameIndex,
      createdAt: this.createdAt,
      gameHistory: this.gameHistory,
    };
  }
}

function stripInternal(p: InternalPlayer): Player {
  const { socketId: _socketId, disconnectTimer: _disconnectTimer, ...rest } = p;
  return rest;
}
