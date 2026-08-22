import { useEffect } from 'react';
import { EVENTS } from '@retro-party/shared';
import type {
  AppError,
  ChatMessage,
  GameCatalogPayload,
  GameFinishedPayload,
  GameStatePayload,
  FinalResultPayload,
  PlayerConnectionPayload,
  RoomStatePayload,
} from '@retro-party/shared';
import { socket, saveSession, clearSession } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';

export function useSocketListeners(): void {
  useEffect(() => {
    const onConnect = () => useRoomStore.getState().setSocketConnected(true);
    const onDisconnect = () => useRoomStore.getState().setSocketConnected(false);

    const onRoomState = (payload: RoomStatePayload) => {
      useRoomStore.getState().setRoomState(payload.room, payload.you);
      if (payload.you) saveSession({ roomCode: payload.room.code, playerId: payload.you.id });
    };

    const onGameCatalog = (payload: GameCatalogPayload) => {
      useRoomStore.getState().setGameCatalog(payload.games);
    };

    const onGameState = (payload: GameStatePayload) => {
      useRoomStore.getState().setGameState(payload.state);
    };

    const onGamePrivate = (payload: { gameId: string; data: Record<string, unknown> }) => {
      useRoomStore.getState().patchGameData(payload.data);
    };

    const onGameFinished = (payload: GameFinishedPayload) => {
      useRoomStore.getState().setLastFinishedGame(payload);
    };

    const onFinalResult = (payload: FinalResultPayload) => {
      useRoomStore.getState().setFinalResult(payload);
    };

    const onChatMessage = (payload: ChatMessage) => {
      useRoomStore.getState().pushChatMessage(payload);
    };

    const onPlayerConnection = (payload: PlayerConnectionPayload) => {
      if (!payload.connected) {
        useRoomStore.getState().setPeerDisconnect({
          playerId: payload.playerId,
          playerName: payload.playerName,
          graceEndsAt: payload.graceEndsAt ?? Date.now(),
        });
      } else {
        useRoomStore.getState().setPeerDisconnect(null);
      }
    };

    const onError = (payload: AppError) => {
      useRoomStore.getState().setError(payload);
      if (payload.code === 'ROOM_NOT_FOUND' || payload.code === 'ROOM_EXPIRED') {
        clearSession();
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(EVENTS.ROOM_STATE, onRoomState);
    socket.on(EVENTS.GAME_CATALOG, onGameCatalog);
    socket.on(EVENTS.GAME_STATE, onGameState);
    socket.on(EVENTS.GAME_PRIVATE, onGamePrivate);
    socket.on(EVENTS.GAME_FINISHED, onGameFinished);
    socket.on(EVENTS.FINAL_RESULT, onFinalResult);
    socket.on(EVENTS.CHAT_MESSAGE, onChatMessage);
    socket.on(EVENTS.PLAYER_CONNECTION, onPlayerConnection);
    socket.on(EVENTS.ERROR, onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(EVENTS.ROOM_STATE, onRoomState);
      socket.off(EVENTS.GAME_CATALOG, onGameCatalog);
      socket.off(EVENTS.GAME_STATE, onGameState);
      socket.off(EVENTS.GAME_PRIVATE, onGamePrivate);
      socket.off(EVENTS.GAME_FINISHED, onGameFinished);
      socket.off(EVENTS.FINAL_RESULT, onFinalResult);
      socket.off(EVENTS.CHAT_MESSAGE, onChatMessage);
      socket.off(EVENTS.PLAYER_CONNECTION, onPlayerConnection);
      socket.off(EVENTS.ERROR, onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
