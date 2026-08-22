import { Server, Socket } from 'socket.io';
import { DISCONNECT_GRACE_MS, EVENTS, RoomJoinPayload } from '@retro-party/shared';
import { roomManager } from '../../rooms/RoomManager';
import { sanitizePlayerName } from '../../utils/sanitize';
import { isValidRoomCode } from '../../utils/roomCode';
import { isPlainObject } from '../../middleware/validate';
import { isRateLimited } from '../../middleware/rateLimit';
import { emitError } from '../errors';
import { listGameMeta } from '../../games/registry';
import { GameEngine } from '../../engine/GameEngine';
import { broadcastRoomState } from '../broadcastRoomState';

export function registerRoomHandlers(io: Server, socket: Socket): void {
  socket.on(EVENTS.ROOM_CREATE, (payload: unknown) => {
    if (isRateLimited(`create:${socket.id}`, 5, 60_000)) {
      return emitError(socket, 'RATE_LIMITED', 'Demasiadas solicitudes, espera un momento.');
    }
    if (!isPlainObject(payload)) return emitError(socket, 'INVALID_PAYLOAD', 'Payload inválido.');
    const name = sanitizePlayerName(payload.playerName);
    if (!name) return emitError(socket, 'NAME_REQUIRED', 'El nombre es obligatorio.');

    const room = roomManager.createRoom();
    const player = room.addPlayer(name, socket.id);
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;
    socket.join(room.code);
    socket.emit(EVENTS.ROOM_STATE, { room: room.toSummary(), you: player });
  });

  socket.on(EVENTS.ROOM_JOIN, (payload: unknown) => {
    if (isRateLimited(`join:${socket.id}`, 10, 60_000)) {
      return emitError(socket, 'RATE_LIMITED', 'Demasiadas solicitudes, espera un momento.');
    }
    if (!isPlainObject(payload)) return emitError(socket, 'INVALID_PAYLOAD', 'Payload inválido.');
    const { code, playerName, playerId } = payload as unknown as RoomJoinPayload;
    if (!isValidRoomCode(code)) return emitError(socket, 'INVALID_CODE', 'Código de sala inválido.');
    const upperCode = code.toUpperCase();
    const room = roomManager.getRoom(upperCode);
    if (!room) return emitError(socket, 'ROOM_NOT_FOUND', 'Esa sala no existe o ha expirado.');

    // Reconnect path: existing playerId in this room reattaches its socket.
    if (playerId && room.getPlayer(playerId)) {
      const player = room.reattachPlayer(playerId, socket.id)!;
      socket.data.roomCode = room.code;
      socket.data.playerId = player.id;
      socket.join(room.code);
      socket.to(room.code).emit(EVENTS.PLAYER_CONNECTION, {
        playerId: player.id,
        playerName: player.name,
        connected: true,
      });
      broadcastRoomState(io, room);
      return;
    }

    if (room.isFull) return emitError(socket, 'ROOM_FULL', 'La sala ya tiene dos jugadores.');
    if (room.status !== 'LOBBY') {
      return emitError(socket, 'GAME_ALREADY_IN_PROGRESS', 'La partida ya ha comenzado.');
    }
    const name = sanitizePlayerName(playerName);
    if (!name) return emitError(socket, 'NAME_REQUIRED', 'El nombre es obligatorio.');

    const player = room.addPlayer(name, socket.id);
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;
    socket.join(room.code);
    broadcastRoomState(io, room);
  });

  socket.on(EVENTS.ROOM_READY, (payload: unknown) => {
    const room = currentRoom(socket);
    if (!room) return;
    const player = room.getPlayer(socket.data.playerId);
    if (!player) return;
    const ready = isPlainObject(payload) ? Boolean(payload.ready) : false;
    player.ready = ready;
    room.touch();
    broadcastRoomState(io, room);
  });

  socket.on(EVENTS.ROOM_START, () => {
    const room = currentRoom(socket);
    if (!room) return;
    if (room.status !== 'LOBBY') return;
    if (room.players.length < 2) return emitError(socket, 'NOT_IN_ROOM', 'Falta un jugador.');
    const allReady = room.players.every((p) => p.ready && p.connected);
    if (!allReady) return emitError(socket, 'INVALID_PAYLOAD', 'Ambos jugadores deben estar listos.');
    room.status = 'GAME_SELECTION';
    broadcastRoomState(io, room);
    io.to(room.code).emit(EVENTS.GAME_CATALOG, { games: listGameMeta() });
  });

  socket.on(EVENTS.ROOM_REPLAY, () => {
    const room = currentRoom(socket);
    if (!room) return;
    if (room.hostId !== socket.data.playerId) {
      return emitError(socket, 'NOT_HOST', 'Solo el anfitrión puede iniciar una revancha.');
    }
    if (room.status !== 'FINAL_RESULT') return;
    room.gameHistory = [];
    room.gameQueue = [];
    room.currentGameIndex = -1;
    room.engine = null;
    for (const p of room.players) {
      p.score = 0;
      p.ready = false;
    }
    room.status = 'GAME_SELECTION';
    broadcastRoomState(io, room);
    io.to(room.code).emit(EVENTS.GAME_CATALOG, { games: listGameMeta() });
  });

  socket.on(EVENTS.ROOM_LEAVE, () => handleLeave(io, socket));
  socket.on('disconnect', () => handleDisconnect(io, socket));
}

function currentRoom(socket: Socket) {
  const code = socket.data.roomCode as string | undefined;
  if (!code) return undefined;
  return roomManager.getRoom(code);
}

function handleLeave(io: Server, socket: Socket): void {
  const room = currentRoom(socket);
  if (!room) return;
  const playerId = socket.data.playerId as string;
  room.removePlayer(playerId);
  socket.leave(room.code);
  broadcastRoomState(io, room);
  roomManager.destroyIfEmpty(room.code);
  socket.data.roomCode = undefined;
  socket.data.playerId = undefined;
}

function handleDisconnect(io: Server, socket: Socket): void {
  const room = currentRoom(socket);
  if (!room) return;
  const playerId = socket.data.playerId as string;
  const player = room.getPlayer(playerId);
  if (!player) return;
  player.connected = false;
  player.socketId = null;
  (room.engine as GameEngine | null)?.handlePlayerDisconnect(playerId);
  const graceEndsAt = Date.now() + DISCONNECT_GRACE_MS;
  socket.to(room.code).emit(EVENTS.PLAYER_CONNECTION, {
    playerId: player.id,
    playerName: player.name,
    connected: false,
    graceEndsAt,
  });
  broadcastRoomState(io, room);

  player.disconnectTimer = setTimeout(() => {
    const stillHere = room.getPlayer(playerId);
    if (stillHere && !stillHere.connected) {
      room.removePlayer(playerId);
      broadcastRoomState(io, room);
      roomManager.destroyIfEmpty(room.code);
    }
  }, DISCONNECT_GRACE_MS);
}
