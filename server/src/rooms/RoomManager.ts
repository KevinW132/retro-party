import { ROOM_IDLE_EXPIRY_MS } from '@retro-party/shared';
import { Room } from './Room';
import { generateRoomCode } from '../utils/roomCode';

const MAX_CODE_ATTEMPTS = 20;

export class RoomManager {
  private rooms = new Map<string, Room>();
  private sweepInterval: NodeJS.Timeout;

  constructor() {
    this.sweepInterval = setInterval(() => this.sweepIdleRooms(), 60_000);
    this.sweepInterval.unref?.();
  }

  createRoom(): Room {
    let code = generateRoomCode();
    let attempts = 0;
    while (this.rooms.has(code) && attempts < MAX_CODE_ATTEMPTS) {
      code = generateRoomCode();
      attempts++;
    }
    const room = new Room(code);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  destroyRoom(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    for (const player of room.players) {
      if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
    }
    this.rooms.delete(code);
  }

  destroyIfEmpty(code: string): void {
    const room = this.rooms.get(code);
    if (room && room.isEmpty) this.destroyRoom(code);
  }

  private sweepIdleRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.isEmpty || now - room.lastActivityAt > ROOM_IDLE_EXPIRY_MS) {
        this.destroyRoom(code);
      }
    }
  }

  get roomCount(): number {
    return this.rooms.size;
  }
}

export const roomManager = new RoomManager();
