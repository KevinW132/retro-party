import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { env } from './config/env';
import { registerSocketHandlers } from './socket';
import { roomManager } from './rooms/RoomManager';
import { isValidRoomCode } from './utils/roomCode';

const app = express();
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: roomManager.roomCount });
});

// Lightweight pre-flight check used by the Join Room screen before opening a socket.
app.get('/api/rooms/:code/exists', (req, res) => {
  const code = req.params.code?.toUpperCase();
  if (!isValidRoomCode(code)) return res.json({ exists: false });
  const room = roomManager.getRoom(code);
  res.json({ exists: Boolean(room), full: room?.isFull ?? false, inProgress: room ? room.status !== 'LOBBY' : false });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.corsOrigin, credentials: true },
  // Default 1MB is too tight for the outfit game's compressed photo uploads.
  maxHttpBufferSize: 8 * 1024 * 1024,
});

registerSocketHandlers(io);

server.listen(env.port, () => {
  console.log(`[retro-party] server listening on :${env.port}`);
});
