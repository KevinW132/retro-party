import { SCORE } from '@retro-party/shared';
import { EngineApi, GameModule } from './GameModule';
import { isCloseEnough } from '../utils/answerSimilarity';
import { sanitizeAnswerText } from '../utils/sanitize';
import { GameMeta } from '@retro-party/shared';

export interface ClueItem {
  id: string;
  answer: string;
  clues: string[];
  /** Optional playable clip (e.g. music previews). Left undefined for games
   * without audio, like movie clues. */
  audioUrl?: string;
}

interface ClueConfig extends Record<string, unknown> {
  totalRounds: number;
  roundMs: number;
  clueIntervalMs: number;
}

interface ClueSession {
  config: ClueConfig;
  pool: ClueItem[];
  index: number;
  current: ClueItem | null;
  revealedCount: number;
  roundToken: number;
  wrongGuesses: { playerId: string; text: string }[];
  correctCounts: Record<string, number>;
}

function shuffledSample<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function scoreForClueIndex(revealedCount: number): number {
  if (revealedCount <= 1) return SCORE.ULTRA_FAST;
  if (revealedCount === 2) return SCORE.FAST;
  if (revealedCount === 3) return SCORE.MEDIUM;
  return SCORE.SLOW;
}

function publicData(session: ClueSession, revealAnswer: string | null) {
  return {
    clues: session.current ? session.current.clues.slice(0, session.revealedCount) : [],
    totalClues: session.current ? session.current.clues.length : 0,
    wrongGuesses: session.wrongGuesses.slice(-6),
    revealAnswer,
    index: session.index,
    total: session.pool.length,
    audioUrl: session.current?.audioUrl ?? null,
  };
}

export function createClueGuessGame(meta: GameMeta, itemPool: ClueItem[]): GameModule<ClueConfig> {
  const sessions = new Map<string, ClueSession>();

  function scheduleNextClue(api: EngineApi, session: ClueSession, token: number): void {
    if (!session.current) return;
    if (session.revealedCount >= session.current.clues.length) return;
    setTimeout(() => {
      if (session.roundToken !== token || !session.current) return;
      session.revealedCount = Math.min(session.revealedCount + 1, session.current.clues.length);
      api.emitState({ phase: 'ROUND_ACTIVE', data: publicData(session, null) });
      scheduleNextClue(api, session, token);
    }, session.config.clueIntervalMs);
  }

  function startRound(api: EngineApi, session: ClueSession): void {
    session.index += 1;
    if (session.index >= session.pool.length) {
      finishGame(api, session);
      return;
    }
    session.current = session.pool[session.index];
    session.revealedCount = 1;
    session.wrongGuesses = [];
    session.roundToken += 1;
    const token = session.roundToken;
    const timer = api.startTimer(session.config.roundMs, () => resolveRound(api, session, null));
    api.emitState({
      phase: 'ROUND_ACTIVE',
      round: session.index + 1,
      totalRounds: session.pool.length,
      timer,
      data: publicData(session, null),
    });
    scheduleNextClue(api, session, token);
  }

  function resolveRound(api: EngineApi, session: ClueSession, winnerId: string | null): void {
    if (!session.current) return;
    api.clearTimer();
    if (winnerId) {
      const delta = scoreForClueIndex(session.revealedCount);
      api.addScore(winnerId, delta, 'clue-correct');
      session.correctCounts[winnerId] = (session.correctCounts[winnerId] ?? 0) + 1;
    }
    api.emitState({ phase: 'ROUND_RESULT', timer: null, data: publicData(session, session.current.answer) });
    setTimeout(() => startRound(api, session), 3500);
  }

  function finishGame(api: EngineApi, session: ClueSession): void {
    let mostCorrectPlayerId = '';
    let mostCorrectValue = -1;
    for (const [playerId, count] of Object.entries(session.correctCounts)) {
      if (count > mostCorrectValue) {
        mostCorrectValue = count;
        mostCorrectPlayerId = playerId;
      }
    }
    api.finish({ mostCorrectPlayerId, mostCorrectCount: mostCorrectValue < 0 ? 0 : mostCorrectValue });
    sessions.delete(api.roomCode);
  }

  return {
    meta,
    defaultConfig: { totalRounds: 8, roundMs: 45000, clueIntervalMs: 12000 },
    start(api, config) {
      const session: ClueSession = {
        config,
        pool: shuffledSample(itemPool, config.totalRounds),
        index: -1,
        current: null,
        revealedCount: 0,
        roundToken: 0,
        wrongGuesses: [],
        correctCounts: {},
      };
      sessions.set(api.roomCode, session);
      startRound(api, session);
    },
    onAction(api, playerId, action, payload) {
      const session = sessions.get(api.roomCode);
      if (!session || !session.current) return;
      if (action !== 'guess') return;
      const guess = sanitizeAnswerText((payload as { value?: unknown })?.value, 80);
      if (!guess) return;
      if (isCloseEnough(guess, session.current.answer)) {
        resolveRound(api, session, playerId);
      } else {
        session.wrongGuesses.push({ playerId, text: guess });
        api.emitState({ phase: 'ROUND_ACTIVE', data: publicData(session, null) });
      }
    },
  };
}
