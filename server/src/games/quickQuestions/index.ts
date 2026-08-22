import { AnswerSubmitPayload, GameMeta, QuickQuestionsData, SCORE, speedScore } from '@retro-party/shared';
import { EngineApi, GameModule } from '../GameModule';
import rawQuestions from '../../data/quickQuestions.json';

interface QuizQuestion {
  id: string;
  category: string;
  difficulty: string;
  prompt: string;
  options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctKey: string;
}

interface QQConfig extends Record<string, unknown> {
  totalQuestions: number;
  timePerQuestionMs: number;
}

interface QQSession {
  config: QQConfig;
  pool: QuizQuestion[];
  index: number;
  current: QuizQuestion | null;
  startedAt: number;
  answers: Map<string, { key: string; at: number }>;
  correctCounts: Record<string, number>;
  fastestMs: Record<string, number | null>;
  resolveTimeout: NodeJS.Timeout | null;
}

const sessions = new Map<string, QQSession>();
const questions = rawQuestions as QuizQuestion[];

function shuffledSample<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function publicData(session: QQSession, revealCorrectKey: string | null, deltas: Record<string, number> | null): QuickQuestionsData {
  const q = session.current;
  return {
    question: q
      ? { id: q.id, prompt: q.prompt, options: q.options, index: session.index, total: session.config.totalQuestions }
      : null,
    answeredPlayerIds: [...session.answers.keys()],
    lastRoundResult: revealCorrectKey
      ? {
          correctKey: revealCorrectKey,
          correctPlayerIds: [...session.answers.entries()]
            .filter(([, a]) => a.key === revealCorrectKey)
            .map(([id]) => id),
          deltas: deltas ?? {},
        }
      : null,
  };
}

function nextQuestion(api: EngineApi, session: QQSession): void {
  session.index += 1;
  if (session.index >= session.config.totalQuestions || session.pool.length === 0) {
    finishGame(api, session);
    return;
  }
  session.current = session.pool[session.index];
  session.answers.clear();
  session.startedAt = Date.now();
  const timer = api.startTimer(session.config.timePerQuestionMs, () => resolveRound(api, session));
  api.emitState({
    phase: 'ROUND_ACTIVE',
    round: session.index + 1,
    totalRounds: session.config.totalQuestions,
    timer,
    data: publicData(session, null, null),
  });
}

function resolveRound(api: EngineApi, session: QQSession): void {
  if (!session.current) return;
  api.clearTimer();
  const deltas: Record<string, number> = {};
  for (const player of api.players) {
    const answer = session.answers.get(player.id);
    if (!answer) continue;
    const correct = answer.key === session.current.correctKey;
    if (correct) {
      const elapsed = answer.at - session.startedAt;
      const delta = speedScore(elapsed, session.config.timePerQuestionMs);
      deltas[player.id] = delta;
      session.correctCounts[player.id] = (session.correctCounts[player.id] ?? 0) + 1;
      const prevFastest = session.fastestMs[player.id];
      if (prevFastest === null || prevFastest === undefined || elapsed < prevFastest) {
        session.fastestMs[player.id] = elapsed;
      }
      api.addScore(player.id, delta, 'quick-questions-correct');
    } else {
      deltas[player.id] = SCORE.WRONG_PENALTY;
      api.addScore(player.id, SCORE.WRONG_PENALTY, 'quick-questions-wrong');
    }
  }
  api.emitState({
    phase: 'ROUND_RESULT',
    timer: null,
    data: publicData(session, session.current.correctKey, deltas),
  });
  session.resolveTimeout = setTimeout(() => nextQuestion(api, session), 3000);
}

function finishGame(api: EngineApi, session: QQSession): void {
  let fastestPlayerId: string | null = null;
  let fastestValue = Infinity;
  for (const [playerId, ms] of Object.entries(session.fastestMs)) {
    if (ms !== null && ms !== undefined && ms < fastestValue) {
      fastestValue = ms;
      fastestPlayerId = playerId;
    }
  }
  let mostCorrectPlayerId: string | null = null;
  let mostCorrectValue = -1;
  for (const [playerId, count] of Object.entries(session.correctCounts)) {
    if (count > mostCorrectValue) {
      mostCorrectValue = count;
      mostCorrectPlayerId = playerId;
    }
  }
  api.finish({
    fastestAnswerPlayerId: fastestPlayerId ?? '',
    fastestAnswerMs: Number.isFinite(fastestValue) ? Math.round(fastestValue) : 0,
    mostCorrectPlayerId: mostCorrectPlayerId ?? '',
    mostCorrectCount: mostCorrectValue < 0 ? 0 : mostCorrectValue,
  });
  sessions.delete(api.roomCode);
}

export const quickQuestionsGame: GameModule<QQConfig> = {
  meta: {
    id: 'quickQuestions',
    name: 'Preguntas Rápidas',
    icon: '⚡',
    description: 'Responde antes que tu rival. Gana quien sea más rápido y acertado.',
    minPlayers: 2,
    maxPlayers: 2,
    turnBased: false,
    playable: true,
  },
  defaultConfig: { totalQuestions: 8, timePerQuestionMs: 15000 },
  start(api, config) {
    const session: QQSession = {
      config,
      pool: shuffledSample(questions, config.totalQuestions),
      index: -1,
      current: null,
      startedAt: 0,
      answers: new Map(),
      correctCounts: {},
      fastestMs: {},
      resolveTimeout: null,
    };
    sessions.set(api.roomCode, session);
    nextQuestion(api, session);
  },
  onAction(api, playerId, action, payload) {
    const session = sessions.get(api.roomCode);
    if (!session || !session.current) return;
    if (action !== 'submit') return;
    if (session.answers.has(playerId)) return;
    const value = (payload as AnswerSubmitPayload)?.value;
    if (typeof value !== 'string') return;
    session.answers.set(playerId, { key: value, at: Date.now() });
    api.emitState({ phase: 'ROUND_ACTIVE', data: publicData(session, null, null) });
    if (session.answers.size >= api.players.length) {
      resolveRound(api, session);
    }
  },
  onPlayerDisconnect() {
    // Game keeps running server-side; the disconnected player simply won't
    // be able to answer until they reconnect. Room-level UI shows the banner.
  },
};
