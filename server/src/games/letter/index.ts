import { AnswerSubmitPayload, LetterData, LetterEntry } from '@retro-party/shared';
import { EngineApi, GameModule } from '../GameModule';
import { sanitizeLetterText } from '../../utils/sanitize';

interface LetterConfig extends Record<string, unknown> {
  writeMs: number;
}

interface LetterSession {
  letters: Map<string, string>;
  revealed: boolean;
  confirmed: Set<string>;
}

const sessions = new Map<string, LetterSession>();

function publicData(api: EngineApi, session: LetterSession): LetterData {
  const letters: LetterEntry[] = session.revealed
    ? api.players.map((p) => ({ playerId: p.id, playerName: p.name, text: session.letters.get(p.id) ?? '' }))
    : [];
  return {
    writtenBy: [...session.letters.keys()],
    revealed: session.revealed,
    confirmedBy: [...session.confirmed],
    letters,
  };
}

function revealIfReady(api: EngineApi, session: LetterSession): void {
  if (session.revealed) return;
  if (!api.players.every((p) => session.letters.has(p.id))) return;
  session.revealed = true;
  api.clearTimer();
  api.emitState({ phase: 'ROUND_RESULT', round: 0, totalRounds: 0, timer: null, data: publicData(api, session) });
}

function finishGame(api: EngineApi): void {
  api.finish({});
  sessions.delete(api.roomCode);
}

export const letterGame: GameModule<LetterConfig> = {
  meta: {
    id: 'letter',
    name: 'Carta Secreta',
    icon: '✉️',
    description: 'Escribile una carta a tu compañero de sala. Cuando ambos terminen, se leen al mismo tiempo.',
    minPlayers: 2,
    maxPlayers: 2,
    turnBased: false,
    playable: true,
  },
  defaultConfig: { writeMs: 4 * 60 * 1000 },
  start(api, config) {
    const session: LetterSession = { letters: new Map(), revealed: false, confirmed: new Set() };
    sessions.set(api.roomCode, session);
    // Timer forces the reveal even if someone never finishes writing — anyone
    // who hasn't submitted by then is treated as having sent a blank letter.
    const timer = api.startTimer(config.writeMs, () => {
      for (const p of api.players) {
        if (!session.letters.has(p.id)) session.letters.set(p.id, '');
      }
      revealIfReady(api, session);
    });
    api.emitState({ phase: 'ROUND_ACTIVE', round: 0, totalRounds: 0, timer, data: publicData(api, session) });
  },
  onAction(api, playerId, action, payload) {
    const session = sessions.get(api.roomCode);
    if (!session || action !== 'submit') return;
    const value = (payload as AnswerSubmitPayload)?.value;
    if (typeof value !== 'string') return;

    if (!session.revealed) {
      if (session.letters.has(playerId)) return;
      const text = sanitizeLetterText(value);
      if (!text) return;
      session.letters.set(playerId, text);
      api.emitState({ phase: 'ROUND_ACTIVE', data: publicData(api, session) });
      revealIfReady(api, session);
    } else {
      if (session.confirmed.has(playerId)) return;
      session.confirmed.add(playerId);
      api.emitState({ phase: 'ROUND_RESULT', timer: null, data: publicData(api, session) });
      if (api.players.every((p) => session.confirmed.has(p.id))) finishGame(api);
    }
  },
};
