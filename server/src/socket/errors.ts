import { Socket } from 'socket.io';
import { EVENTS, ErrorCode } from '@retro-party/shared';

export function emitError(socket: Socket, code: ErrorCode, message: string): void {
  socket.emit(EVENTS.ERROR, { code, message });
}
