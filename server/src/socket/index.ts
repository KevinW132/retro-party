import { Server, Socket } from 'socket.io';
import { registerRoomHandlers } from './handlers/room';
import { registerChatHandlers } from './handlers/chat';
import { registerGameHandlers } from './handlers/game';
import { registerDrawingHandlers } from './handlers/drawing';

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    registerRoomHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerDrawingHandlers(io, socket);
  });
}
