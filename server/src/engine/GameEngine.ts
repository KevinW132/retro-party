import { Server } from 'socket.io';
import {
  EVENTS,
  GameId,
  GameResult,
  GameStateSnapshot,
  Player,
  TimerSnapshot,
} from '@retro-party/shared';
import { Room } from '../rooms/Room';
import { ScoreService } from './ScoreService';
import { TimerService } from './TimerService';
import { EngineApi, EmitStateParams, GameModule } from '../games/GameModule';
import { getGameModule } from '../games/registry';
import { broadcastRoomState } from '../socket/broadcastRoomState';

export class GameEngine {
  readonly gameId: GameId;
  private io: Server;
  private room: Room;
  private module: GameModule;
  private scores = new ScoreService();
  private timer = new TimerService();
  private lastSnapshot: GameStateSnapshot;
  private finished = false;

  constructor(io: Server, room: Room, gameId: GameId) {
    this.io = io;
    this.room = room;
    this.gameId = gameId;
    const module = getGameModule(gameId);
    if (!module) throw new Error(`Unknown game: ${gameId}`);
    this.module = module;
    for (const p of room.players) this.scores.register(p.id);
    this.lastSnapshot = {
      gameId,
      phase: 'WAITING',
      round: 0,
      totalRounds: 0,
      timer: null,
      scores: this.scores.snapshot(),
      data: null,
    };
  }

  private buildApi(): EngineApi {
    const engine = this;
    return {
      roomCode: this.room.code,
      players: this.room.players.map(({ id, name, connected, ready, score, isHost, joinedAt }) => ({
        id,
        name,
        connected,
        ready,
        score,
        isHost,
        joinedAt,
      })) as Player[],
      scores: this.scores,
      emitState(params: EmitStateParams) {
        engine.lastSnapshot = {
          gameId: engine.gameId,
          phase: params.phase,
          round: params.round ?? engine.lastSnapshot.round,
          totalRounds: params.totalRounds ?? engine.lastSnapshot.totalRounds,
          timer: params.timer !== undefined ? params.timer : engine.lastSnapshot.timer,
          scores: engine.scores.snapshot(),
          data: params.data,
        };
        engine.io.to(engine.room.code).emit(EVENTS.GAME_STATE, { state: engine.lastSnapshot });
      },
      startTimer(durationMs: number, onExpire: () => void) {
        const snapshot = engine.timer.start(durationMs, onExpire);
        return snapshot;
      },
      clearTimer() {
        engine.timer.clear();
      },
      currentTimer() {
        return engine.timer.current();
      },
      whisper(playerId: string, data: unknown) {
        const player = engine.room.getPlayer(playerId);
        if (!player?.socketId) return;
        engine.io.to(player.socketId).emit(EVENTS.GAME_PRIVATE, { gameId: engine.gameId, data });
      },
      addScore(playerId: string, delta: number, reason: string) {
        engine.scores.add(playerId, delta, reason);
        engine.io.to(engine.room.code).emit(EVENTS.SCORE_UPDATE, {
          scores: engine.scores.snapshot(),
          lastDelta: { playerId, delta, reason },
        });
      },
      finish(stats: Record<string, string | number>) {
        engine.finishGame(stats);
      },
      playerName(playerId: string) {
        return engine.room.getPlayer(playerId)?.name ?? 'Player';
      },
      otherPlayerId(playerId: string) {
        return engine.room.players.find((p) => p.id !== playerId)?.id;
      },
    };
  }

  start(config: Record<string, unknown>): void {
    this.room.status = 'IN_GAME';
    broadcastRoomState(this.io, this.room);
    this.module.start(this.buildApi(), { ...this.module.defaultConfig, ...config });
  }

  handleAction(playerId: string, action: string, payload: unknown): void {
    if (this.finished) return;
    this.module.onAction(this.buildApi(), playerId, action, payload);
  }

  handlePlayerDisconnect(playerId: string): void {
    this.module.onPlayerDisconnect?.(this.buildApi(), playerId);
  }

  currentSnapshot(): GameStateSnapshot {
    return this.lastSnapshot;
  }

  private finishGame(stats: Record<string, string | number>): void {
    if (this.finished) return;
    this.finished = true;
    this.timer.clear();
    const scores = this.scores.snapshot();
    const entries = Object.entries(scores);
    let winnerId: string | null = null;
    if (entries.length === 2 && entries[0][1] !== entries[1][1]) {
      winnerId = entries[0][1] > entries[1][1] ? entries[0][0] : entries[1][0];
    }
    const result: GameResult = {
      gameId: this.gameId,
      scores,
      winnerId,
      roundsPlayed: this.lastSnapshot.round,
      stats,
      finishedAt: Date.now(),
    };
    this.room.gameHistory.push(result);
    // `scores` here is this single game's tally (each GameEngine starts a fresh
    // ScoreService) — accumulate it onto the room's running total across the queue.
    for (const p of this.room.players) {
      p.score += scores[p.id] ?? 0;
    }
    this.room.status = 'GAME_RESULT';
    broadcastRoomState(this.io, this.room);
    const hasNextGame = this.room.currentGameIndex + 1 < this.room.gameQueue.length;
    this.io.to(this.room.code).emit(EVENTS.GAME_FINISHED, { result, hasNextGame });
  }
}
