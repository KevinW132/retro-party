import { AnswerSubmitPayload, SCORE, speedScore } from '@retro-party/shared';
import { EngineApi, GameModule } from '../GameModule';
import { isCloseEnough } from '../../utils/answerSimilarity';
import { sanitizeAnswerText } from '../../utils/sanitize';
import rawRiddles from '../../data/riddles.json';

interface Riddle {
  id: string;
  difficulty: string;
  question: string;
  answer: string;
}

interface RiddlesConfig extends Record<string, unknown> {
  totalRounds: number;
  timePerRoundMs: number;
}

interface RiddlesSession {
  config: RiddlesConfig;
  pool: Riddle[];
  index: number;
  current: Riddle | null;
  startedAt: number;
  answers: Map<string, { text: string; at: number; correct: boolean }>;
  correctCounts: Record<string, number>;
}

const sessions = new Map<string, RiddlesSession>();
const riddles = rawRiddles as Riddle[];

function shuffledSample<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function publicData(session: RiddlesSession, revealAnswer: string | null) {
  return {
    riddle: session.current ? { id: session.current.id, question: session.current.question, index: session.index, total: session.pool.length } : null,
    answeredPlayerIds: [...session.answers.keys()],
    revealAnswer,
    results: revealAnswer
      ? Object.fromEntries([...session.answers.entries()].map(([id, a]) => [id, a.correct]))
      : null,
  };
}

function nextRiddle(api: EngineApi, session: RiddlesSession): void {
  session.index += 1;
  if (session.index >= session.pool.length) {
    finishGame(api, session);
    return;
  }
  session.current = session.pool[session.index];
  session.answers.clear();
  session.startedAt = Date.now();
  const timer = api.startTimer(session.config.timePerRoundMs, () => resolveRound(api, session));
  api.emitState({
    phase: 'ROUND_ACTIVE',
    round: session.index + 1,
    totalRounds: session.pool.length,
    timer,
    data: publicData(session, null),
  });
}

function resolveRound(api: EngineApi, session: RiddlesSession): void {
  if (!session.current) return;
  api.clearTimer();
  for (const [playerId, answer] of session.answers) {
    if (answer.correct) {
      const delta = speedScore(answer.at - session.startedAt, session.config.timePerRoundMs);
      api.addScore(playerId, delta, 'riddle-correct');
      session.correctCounts[playerId] = (session.correctCounts[playerId] ?? 0) + 1;
    } else {
      api.addScore(playerId, SCORE.WRONG_PENALTY, 'riddle-wrong');
    }
  }
  api.emitState({ phase: 'ROUND_RESULT', timer: null, data: publicData(session, session.current.answer) });
  setTimeout(() => nextRiddle(api, session), 3000);
}

function finishGame(api: EngineApi, session: RiddlesSession): void {
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

export const riddlesGame: GameModule<RiddlesConfig> = {
  meta: {
    id: 'riddles',
    name: 'Adivinanzas',
    icon: '🧩',
    description: 'Resuelve adivinanzas clásicas antes que tu rival.',
    minPlayers: 2,
    maxPlayers: 2,
    turnBased: false,
    playable: true,
  },
  defaultConfig: { totalRounds: 8, timePerRoundMs: 25000 },
  start(api, config) {
    const session: RiddlesSession = {
      config,
      pool: shuffledSample(riddles, config.totalRounds),
      index: -1,
      current: null,
      startedAt: 0,
      answers: new Map(),
      correctCounts: {},
    };
    sessions.set(api.roomCode, session);
    nextRiddle(api, session);
  },
  onAction(api, playerId, action, payload) {
    const session = sessions.get(api.roomCode);
    if (!session || !session.current) return;
    if (action !== 'submit') return;
    if (session.answers.has(playerId)) return;
    const value = sanitizeAnswerText((payload as AnswerSubmitPayload)?.value, 80);
    if (!value) return;
    const correct = isCloseEnough(value, session.current.answer);
    session.answers.set(playerId, { text: value, at: Date.now(), correct });
    api.emitState({ phase: 'ROUND_ACTIVE', data: publicData(session, null) });
    if (session.answers.size >= api.players.length) resolveRound(api, session);
  },
};
