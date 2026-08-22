import { AnswerSubmitPayload, SCORE, speedScore } from '@retro-party/shared';
import { EngineApi, GameModule } from '../GameModule';
import { questionGenerator } from '../../services/ai/QuestionGenerator';
import { GeneratedTriviaQuestion } from '../../services/ai/AIService';

interface TriviaConfig extends Record<string, unknown> {
  category: string;
  difficulty: string;
  count: number;
  timePerQuestionMs: number;
}

interface TriviaSession {
  config: TriviaConfig;
  pool: GeneratedTriviaQuestion[];
  index: number;
  current: GeneratedTriviaQuestion | null;
  startedAt: number;
  answers: Map<string, { key: string; at: number }>;
  correctCounts: Record<string, number>;
}

const sessions = new Map<string, TriviaSession>();

function publicData(session: TriviaSession, revealCorrectKey: string | null, deltas: Record<string, number> | null) {
  const q = session.current;
  return {
    question: q
      ? { id: q.id, prompt: q.question, options: q.options, index: session.index, total: session.config.count }
      : null,
    answeredPlayerIds: [...session.answers.keys()],
    lastRoundResult: revealCorrectKey
      ? {
          correctKey: revealCorrectKey,
          correctPlayerIds: [...session.answers.entries()].filter(([, a]) => a.key === revealCorrectKey).map(([id]) => id),
          deltas: deltas ?? {},
        }
      : null,
  };
}

function nextQuestion(api: EngineApi, session: TriviaSession): void {
  session.index += 1;
  if (session.index >= session.pool.length) {
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
    totalRounds: session.pool.length,
    timer,
    data: publicData(session, null, null),
  });
}

function resolveRound(api: EngineApi, session: TriviaSession): void {
  if (!session.current) return;
  api.clearTimer();
  const deltas: Record<string, number> = {};
  for (const player of api.players) {
    const answer = session.answers.get(player.id);
    if (!answer) continue;
    if (answer.key === session.current.correctKey) {
      const delta = speedScore(answer.at - session.startedAt, session.config.timePerQuestionMs);
      deltas[player.id] = delta;
      session.correctCounts[player.id] = (session.correctCounts[player.id] ?? 0) + 1;
      api.addScore(player.id, delta, 'trivia-correct');
    } else {
      deltas[player.id] = SCORE.WRONG_PENALTY;
      api.addScore(player.id, SCORE.WRONG_PENALTY, 'trivia-wrong');
    }
  }
  api.emitState({ phase: 'ROUND_RESULT', timer: null, data: publicData(session, session.current.correctKey, deltas) });
  setTimeout(() => nextQuestion(api, session), 3000);
}

function finishGame(api: EngineApi, session: TriviaSession): void {
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

export const triviaGame: GameModule<TriviaConfig> = {
  meta: {
    id: 'trivia',
    name: 'Trivia',
    icon: '🧠',
    description: 'Elige categoría y dificultad. Preguntas generadas por IA (o desde el set local si no hay API key).',
    minPlayers: 2,
    maxPlayers: 2,
    turnBased: false,
    playable: true,
  },
  defaultConfig: { category: 'any', difficulty: 'any', count: 10, timePerQuestionMs: 15000 },
  start(api, config) {
    const session: TriviaSession = {
      config,
      pool: [],
      index: -1,
      current: null,
      startedAt: 0,
      answers: new Map(),
      correctCounts: {},
    };
    sessions.set(api.roomCode, session);
    api.emitState({ phase: 'PRE_ROUND', round: 0, totalRounds: config.count, timer: null, data: { loading: true } });
    questionGenerator
      .generateTrivia(config.category, config.difficulty, config.count)
      .then((questions) => {
        if (!sessions.has(api.roomCode)) return; // room may have moved on
        session.pool = questions;
        nextQuestion(api, session);
      })
      .catch(() => finishGame(api, session));
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
    if (session.answers.size >= api.players.length) resolveRound(api, session);
  },
};
