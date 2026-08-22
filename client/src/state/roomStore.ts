import { create } from 'zustand';
import type {
  AppError,
  ChatMessage,
  GameFinishedPayload,
  GameMeta,
  GameStateSnapshot,
  Player,
  RoomSummary,
} from '@retro-party/shared';

interface PeerDisconnect {
  playerId: string;
  playerName: string;
  graceEndsAt: number;
}

interface FinalResultState {
  scores: Record<string, number>;
  winnerId: string | null;
  history: import('@retro-party/shared').GameResult[];
}

interface RoomStoreState {
  room: RoomSummary | null;
  you: Player | null;
  socketConnected: boolean;
  error: AppError | null;
  gameCatalog: GameMeta[];
  gameState: GameStateSnapshot | null;
  lastFinishedGame: GameFinishedPayload | null;
  finalResult: FinalResultState | null;
  chatMessages: ChatMessage[];
  unreadChat: number;
  peerDisconnect: PeerDisconnect | null;

  setSocketConnected: (v: boolean) => void;
  setRoomState: (room: RoomSummary, you: Player | null) => void;
  setError: (error: AppError | null) => void;
  setGameCatalog: (games: GameMeta[]) => void;
  setGameState: (state: GameStateSnapshot) => void;
  patchGameData: (patch: Record<string, unknown>) => void;
  setLastFinishedGame: (payload: GameFinishedPayload | null) => void;
  setFinalResult: (payload: FinalResultState | null) => void;
  pushChatMessage: (message: ChatMessage) => void;
  markChatRead: () => void;
  setPeerDisconnect: (info: PeerDisconnect | null) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStoreState>((set) => ({
  room: null,
  you: null,
  socketConnected: false,
  error: null,
  gameCatalog: [],
  gameState: null,
  lastFinishedGame: null,
  finalResult: null,
  chatMessages: [],
  unreadChat: 0,
  peerDisconnect: null,

  setSocketConnected: (v) => set({ socketConnected: v }),
  setRoomState: (room, you) =>
    set((s) => ({
      room,
      you: you ?? s.you,
      peerDisconnect: room.players.every((p) => p.connected) ? null : s.peerDisconnect,
    })),
  setError: (error) => set({ error }),
  setGameCatalog: (gameCatalog) => set({ gameCatalog }),
  setGameState: (gameState) => set({ gameState }),
  patchGameData: (patch) =>
    set((s) => (s.gameState ? { gameState: { ...s.gameState, data: { ...(s.gameState.data as object), ...patch } } } : {})),
  setLastFinishedGame: (lastFinishedGame) => set({ lastFinishedGame }),
  setFinalResult: (finalResult) => set({ finalResult }),
  pushChatMessage: (message) =>
    set((s) => ({ chatMessages: [...s.chatMessages, message].slice(-100), unreadChat: s.unreadChat + 1 })),
  markChatRead: () => set({ unreadChat: 0 }),
  setPeerDisconnect: (peerDisconnect) => set({ peerDisconnect }),
  reset: () =>
    set({
      room: null,
      you: null,
      error: null,
      gameCatalog: [],
      gameState: null,
      lastFinishedGame: null,
      finalResult: null,
      chatMessages: [],
      unreadChat: 0,
      peerDisconnect: null,
    }),
}));
