import { Server, Socket } from 'socket.io';
import { EVENTS } from '@retro-party/shared';
import { roomManager } from '../../rooms/RoomManager';
import { sanitizeChatText } from '../../utils/sanitize';
import { isPlainObject } from '../../middleware/validate';
import { isRateLimited } from '../../middleware/rateLimit';
import { emitError } from '../errors';

export function registerChatHandlers(io: Server, socket: Socket): void {
  socket.on(EVENTS.CHAT_SEND, (payload: unknown) => {
    const code = socket.data.roomCode as string | undefined;
    const playerId = socket.data.playerId as string | undefined;
    if (!code || !playerId) return;
    const room = roomManager.getRoom(code);
    if (!room) return;
    const player = room.getPlayer(playerId);
    if (!player) return;

    if (isRateLimited(`chat:${socket.id}`, 8, 10_000)) {
      return emitError(socket, 'RATE_LIMITED', 'Estás enviando mensajes muy rápido.');
    }
    if (!isPlainObject(payload)) return emitError(socket, 'INVALID_PAYLOAD', 'Payload inválido.');
    const text = sanitizeChatText(payload.text);
    if (!text) return;

    const message = {
      id: crypto.randomUUID(),
      playerId: player.id,
      playerName: player.name,
      text,
      at: Date.now(),
    };
    room.pushChat(message);
    io.to(room.code).emit(EVENTS.CHAT_MESSAGE, message);
  });
}
