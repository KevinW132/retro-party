import { Server } from 'socket.io';
import { EVENTS, Player } from '@retro-party/shared';
import { InternalPlayer, Room } from '../rooms/Room';

function toPublicPlayer(player: InternalPlayer): Player {
  const { socketId: _socketId, disconnectTimer: _disconnectTimer, ...rest } = player;
  return rest;
}

/** Broadcasts room:state to every connected player in the room, with each
 * socket receiving its OWN player as `you` — never a single shared value.
 * `io.to(room.code).emit(..., { you: somePlayer })` is a trap: it sends the
 * exact same `you` to every socket in the Socket.IO room, so the other
 * player's client would render as if they were `somePlayer`. Always use this
 * helper instead of emitting room:state to the whole room directly. */
export function broadcastRoomState(io: Server, room: Room): void {
  const summary = room.toSummary();
  for (const player of room.players) {
    if (!player.socketId) continue;
    io.to(player.socketId).emit(EVENTS.ROOM_STATE, { room: summary, you: toPublicPlayer(player) });
  }
}
