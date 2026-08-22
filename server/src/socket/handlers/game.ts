import { Server, Socket } from 'socket.io';
import { AnswerSubmitPayload, EVENTS, GameId, PHOTO_DATA_URL_MAX_LENGTH, PhotoSubmitPayload } from '@retro-party/shared';
import { roomManager } from '../../rooms/RoomManager';
import { GameEngine } from '../../engine/GameEngine';
import { getGameModule, listGameMeta } from '../../games/registry';
import { isImageDataUrl, isPlainObject, isStringArray } from '../../middleware/validate';
import { isRateLimited } from '../../middleware/rateLimit';
import { emitError } from '../errors';
import { broadcastRoomState } from '../broadcastRoomState';

const GUESS_STYLE_GAMES = new Set<GameId>(['drawing', 'movie', 'music']);

export function registerGameHandlers(io: Server, socket: Socket): void {
  socket.on(EVENTS.GAME_CATALOG, () => {
    socket.emit(EVENTS.GAME_CATALOG, { games: listGameMeta() });
  });

  socket.on(EVENTS.GAME_SELECT, (payload: unknown) => {
    const room = currentRoom(socket);
    if (!room) return;
    if (!isHost(room, socket)) return emitError(socket, 'NOT_HOST', 'Solo el anfitrión puede elegir los juegos.');
    if (room.status !== 'GAME_SELECTION') return;
    if (!isPlainObject(payload) || !isStringArray(payload.gameIds, 10)) {
      return emitError(socket, 'INVALID_PAYLOAD', 'Selección de juegos inválida.');
    }
    const validIds = (payload.gameIds as string[]).filter((id) => getGameModule(id as GameId));
    if (validIds.length === 0) return emitError(socket, 'GAME_NOT_FOUND', 'Selecciona al menos un juego.');
    room.gameQueue = validIds as GameId[];
    room.currentGameIndex = -1;
    room.status = 'GAME_CONFIG';
    broadcastRoomState(io, room);
  });

  socket.on(EVENTS.GAME_START, (payload: unknown) => {
    const room = currentRoom(socket);
    if (!room) return;
    if (!isHost(room, socket)) return emitError(socket, 'NOT_HOST', 'Solo el anfitrión puede iniciar la partida.');
    if (room.status !== 'GAME_CONFIG') return;
    const nextIndex = room.currentGameIndex + 1;
    const gameId = room.gameQueue[nextIndex];
    if (!gameId) return emitError(socket, 'GAME_NOT_FOUND', 'No hay más juegos en la cola.');
    room.currentGameIndex = nextIndex;
    const config = isPlainObject(payload) ? payload : {};
    const engine = new GameEngine(io, room, gameId);
    room.engine = engine;
    engine.start(config as Record<string, unknown>);
  });

  socket.on(EVENTS.GAME_NEXT, () => {
    const room = currentRoom(socket);
    if (!room) return;
    if (!isHost(room, socket)) return emitError(socket, 'NOT_HOST', 'Solo el anfitrión puede continuar la partida.');
    if (room.status !== 'GAME_RESULT') return;
    const hasNext = room.currentGameIndex + 1 < room.gameQueue.length;
    if (!hasNext) {
      room.status = 'FINAL_RESULT';
      const scores = Object.fromEntries(room.players.map((p) => [p.id, p.score]));
      const entries = Object.entries(scores);
      let winnerId: string | null = null;
      if (entries.length === 2 && entries[0][1] !== entries[1][1]) {
        winnerId = entries[0][1] > entries[1][1] ? entries[0][0] : entries[1][0];
      }
      broadcastRoomState(io, room);
      io.to(room.code).emit(EVENTS.FINAL_RESULT, { scores, winnerId, history: room.gameHistory });
      return;
    }
    room.status = 'GAME_CONFIG';
    room.engine = null;
    broadcastRoomState(io, room);
  });

  socket.on(EVENTS.ANSWER_SUBMIT, (payload: unknown) => {
    if (isRateLimited(`answer:${socket.id}`, 20, 10_000)) return;
    const room = currentRoom(socket);
    const engine = room?.engine as GameEngine | undefined;
    if (!room || !engine) return;
    const playerId = socket.data.playerId as string;
    const action = GUESS_STYLE_GAMES.has(engine.gameId) ? 'guess' : 'submit';
    engine.handleAction(playerId, action, payload as AnswerSubmitPayload);
  });

  socket.on(EVENTS.PHOTO_SUBMIT, (payload: unknown) => {
    if (isRateLimited(`photo:${socket.id}`, 6, 10_000)) return;
    const room = currentRoom(socket);
    const engine = room?.engine as GameEngine | undefined;
    if (!room || !engine || engine.gameId !== 'outfit') return;
    if (!isPlainObject(payload) || !isImageDataUrl(payload.dataUrl, PHOTO_DATA_URL_MAX_LENGTH)) {
      return emitError(socket, 'INVALID_PAYLOAD', 'Foto inválida o demasiado pesada.');
    }
    const playerId = socket.data.playerId as string;
    const photoPayload: PhotoSubmitPayload = { dataUrl: payload.dataUrl };
    engine.handleAction(playerId, 'photoSubmit', photoPayload);
  });

  socket.on(EVENTS.DRAWING_WORDS_SUBMIT, (payload: unknown) => {
    const room = currentRoom(socket);
    const engine = room?.engine as GameEngine | undefined;
    if (!room || !engine || engine.gameId !== 'drawing') return;
    const playerId = socket.data.playerId as string;
    engine.handleAction(playerId, 'submitWords', payload);
  });
}

function currentRoom(socket: Socket) {
  const code = socket.data.roomCode as string | undefined;
  if (!code) return undefined;
  return roomManager.getRoom(code);
}

function isHost(room: ReturnType<typeof roomManager.getRoom>, socket: Socket): boolean {
  return !!room && room.hostId === (socket.data.playerId as string | undefined);
}
