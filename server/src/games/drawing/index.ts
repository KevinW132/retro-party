import { AnswerSubmitPayload, DrawingData, SCORE, speedScore } from '@retro-party/shared';
import { EngineApi, GameModule } from '../GameModule';
import { TurnManager } from '../../engine/TurnManager';
import { isCloseEnough } from '../../utils/answerSimilarity';
import { sanitizeAnswerText } from '../../utils/sanitize';
import fallbackWords from '../../data/drawingWords.json';

interface DrawingConfig extends Record<string, unknown> {
  totalRounds: number;
  drawMs: number;
  wordsPerPlayer: number;
}

interface DrawingSession {
  config: DrawingConfig;
  collecting: boolean;
  wordPool: string[];
  usedWords: Set<string>;
  wordsSubmittedBy: Set<string>;
  round: number;
  turnManager: TurnManager;
  currentWord: string | null;
  drawerId: string | null;
  guesserId: string | null;
  startedAt: number;
  guessesFeedback: { playerId: string; wrong: boolean; text: string; at: number }[];
  correctGuessCount: Record<string, number>;
  correctGuessesWhileDrawing: Record<string, number>;
}

const sessions = new Map<string, DrawingSession>();
const words = fallbackWords as string[];

function pickWord(session: DrawingSession): string | null {
  const available = session.wordPool.filter((w) => !session.usedWords.has(w));
  if (available.length === 0) return null;
  const word = available[Math.floor(Math.random() * available.length)];
  session.usedWords.add(word);
  return word;
}

function publicData(session: DrawingSession): DrawingData {
  return {
    drawerId: session.drawerId,
    guesserId: session.guesserId,
    wordLength: session.currentWord ? session.currentWord.length : null,
    wordReveal: null,
    guessesFeedback: session.guessesFeedback.slice(-10),
    collectingWords: session.collecting,
    wordsSubmittedBy: [...session.wordsSubmittedBy],
  };
}

function startRound(api: EngineApi, session: DrawingSession): void {
  session.round += 1;
  if (session.round > session.config.totalRounds) {
    finishGame(api, session);
    return;
  }
  const word = pickWord(session);
  if (!word) {
    finishGame(api, session);
    return;
  }
  session.currentWord = word;
  session.drawerId = session.turnManager.current();
  session.guesserId = session.turnManager.other();
  session.turnManager.advance();
  session.guessesFeedback = [];
  session.startedAt = Date.now();

  const timer = api.startTimer(session.config.drawMs, () => resolveRound(api, session, false));
  api.emitState({
    phase: 'ROUND_ACTIVE',
    round: session.round,
    totalRounds: session.config.totalRounds,
    timer,
    data: publicData(session),
  });
  if (session.drawerId) {
    api.whisper(session.drawerId, { wordReveal: word });
  }
}

function resolveRound(api: EngineApi, session: DrawingSession, guessedCorrectly: boolean): void {
  api.clearTimer();
  if (guessedCorrectly && session.guesserId && session.drawerId) {
    const elapsed = Date.now() - session.startedAt;
    const delta = speedScore(elapsed, session.config.drawMs);
    api.addScore(session.guesserId, delta, 'drawing-correct-guess');
    api.addScore(session.drawerId, SCORE.BONUS, 'drawing-drawer-bonus');
    session.correctGuessCount[session.guesserId] = (session.correctGuessCount[session.guesserId] ?? 0) + 1;
    session.correctGuessesWhileDrawing[session.drawerId] =
      (session.correctGuessesWhileDrawing[session.drawerId] ?? 0) + 1;
  }
  api.emitState({
    phase: 'ROUND_RESULT',
    timer: null,
    data: { ...publicData(session), wordReveal: session.currentWord },
  });
  setTimeout(() => startRound(api, session), 3500);
}

function finishGame(api: EngineApi, session: DrawingSession): void {
  let bestDrawerId: string | null = null;
  let bestDrawerCount = -1;
  for (const [playerId, count] of Object.entries(session.correctGuessesWhileDrawing)) {
    if (count > bestDrawerCount) {
      bestDrawerCount = count;
      bestDrawerId = playerId;
    }
  }
  api.finish({
    bestDrawerPlayerId: bestDrawerId ?? '',
    bestDrawerCorrectGuesses: bestDrawerCount < 0 ? 0 : bestDrawerCount,
  });
  sessions.delete(api.roomCode);
}

export const drawingGame: GameModule<DrawingConfig> = {
  meta: {
    id: 'drawing',
    name: 'Dibuja y Adivina',
    icon: '🎨',
    description: 'Uno dibuja, el otro adivina. Los roles se alternan cada ronda.',
    minPlayers: 2,
    maxPlayers: 2,
    turnBased: true,
    playable: true,
  },
  defaultConfig: { totalRounds: 6, drawMs: 60000, wordsPerPlayer: 5 },
  start(api, config) {
    const session: DrawingSession = {
      config,
      collecting: true,
      wordPool: [],
      usedWords: new Set(),
      wordsSubmittedBy: new Set(),
      round: 0,
      turnManager: new TurnManager(api.players.map((p) => p.id)),
      currentWord: null,
      drawerId: null,
      guesserId: null,
      startedAt: 0,
      guessesFeedback: [],
      correctGuessCount: {},
      correctGuessesWhileDrawing: {},
    };
    sessions.set(api.roomCode, session);
    api.emitState({
      phase: 'PRE_ROUND',
      round: 0,
      totalRounds: config.totalRounds,
      timer: null,
      data: publicData(session),
    });
  },
  onAction(api, playerId, action, payload) {
    const session = sessions.get(api.roomCode);
    if (!session) return;

    if (action === 'submitWords') {
      if (!session.collecting || session.wordsSubmittedBy.has(playerId)) return;
      const raw = (payload as { words?: unknown })?.words;
      const list = Array.isArray(raw) ? raw : [];
      const cleaned = list
        .map((w) => sanitizeAnswerText(w, 40))
        .filter((w): w is string => !!w)
        .slice(0, session.config.wordsPerPlayer);
      session.wordPool.push(...cleaned);
      session.wordsSubmittedBy.add(playerId);
      if (session.wordsSubmittedBy.size >= api.players.length) {
        // Top up with local dataset words if players didn't submit enough for every round.
        const needed = session.config.totalRounds - session.wordPool.length;
        if (needed > 0) {
          const extra = [...words].sort(() => Math.random() - 0.5).slice(0, needed);
          session.wordPool.push(...extra);
        }
        session.collecting = false;
        startRound(api, session);
      } else {
        api.emitState({ phase: 'PRE_ROUND', data: publicData(session) });
      }
      return;
    }

    if (action === 'guess') {
      if (session.collecting || playerId !== session.guesserId || !session.currentWord) return;
      const guess = sanitizeAnswerText((payload as AnswerSubmitPayload)?.value, 60);
      if (!guess) return;
      const correct = isCloseEnough(guess, session.currentWord);
      session.guessesFeedback.push({ playerId, wrong: !correct, text: guess, at: Date.now() });
      if (correct) {
        resolveRound(api, session, true);
      } else {
        api.emitState({ phase: 'ROUND_ACTIVE', data: publicData(session) });
      }
    }
  },
  onPlayerDisconnect() {
    // Drawing continues server-side; strokes/guesses from the disconnected
    // player simply pause until they reconnect.
  },
};

export function isCurrentDrawer(roomCode: string, playerId: string): boolean {
  return sessions.get(roomCode)?.drawerId === playerId;
}
