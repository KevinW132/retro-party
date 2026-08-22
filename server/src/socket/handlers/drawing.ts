import { Server, Socket } from 'socket.io';
import { EVENTS } from '@retro-party/shared';
import { roomManager } from '../../rooms/RoomManager';
import { GameEngine } from '../../engine/GameEngine';
import { isCurrentDrawer } from '../../games/drawing';
import { isRateLimited } from '../../middleware/rateLimit';
import { isPlainObject } from '../../middleware/validate';

const MAX_POINTS_PER_EVENT = 64;

/** High-frequency canvas relay — deliberately bypasses the GameEngine
 * broadcast pipeline (no full-state re-emit per stroke), per spec: stream
 * incremental point deltas, never full canvas images. */
export function registerDrawingHandlers(io: Server, socket: Socket): void {
  socket.on(EVENTS.DRAWING_STROKE, (payload: unknown) => {
    relayIfDrawer(io, socket, EVENTS.DRAWING_STROKE, payload, (p) => {
      if (!isPlainObject(p)) return false;
      const points = (p as { points?: unknown }).points;
      return Array.isArray(points) && points.length > 0 && points.length <= MAX_POINTS_PER_EVENT;
    });
  });

  socket.on(EVENTS.DRAWING_UNDO, (payload: unknown) => {
    relayIfDrawer(io, socket, EVENTS.DRAWING_UNDO, payload, () => true);
  });

  socket.on(EVENTS.DRAWING_CLEAR, (payload: unknown) => {
    relayIfDrawer(io, socket, EVENTS.DRAWING_CLEAR, payload, () => true);
  });
}

function relayIfDrawer(
  io: Server,
  socket: Socket,
  event: string,
  payload: unknown,
  isValid: (payload: unknown) => boolean,
): void {
  if (isRateLimited(`draw:${socket.id}`, 60, 1000)) return;
  const code = socket.data.roomCode as string | undefined;
  const playerId = socket.data.playerId as string | undefined;
  if (!code || !playerId) return;
  const room = roomManager.getRoom(code);
  const engine = room?.engine as GameEngine | undefined;
  if (!room || !engine || engine.gameId !== 'drawing') return;
  if (!isCurrentDrawer(code, playerId)) return;
  if (!isValid(payload)) return;
  socket.to(code).emit(event, payload);
}
