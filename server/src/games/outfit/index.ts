import { OutfitData, OutfitPhase, OutfitResultEntry } from '@retro-party/shared';
import { EngineApi, GameModule } from '../GameModule';

interface OutfitConfig extends Record<string, unknown> {
  editMs: number;
}

interface OutfitSession {
  editMs: number;
  phase: OutfitPhase;
  photos: Map<string, string>; // playerId -> photo they uploaded of themselves
  edited: Map<string, string>; // playerId (editor) -> final image they produced of the other player
  confirmed: Set<string>;
}

const sessions = new Map<string, OutfitSession>();

function publicData(api: EngineApi, session: OutfitSession): OutfitData {
  const results: OutfitResultEntry[] = [];
  if (session.phase === 'revealed') {
    for (const editor of api.players) {
      const subjectId = api.otherPlayerId(editor.id);
      if (!subjectId) continue;
      results.push({ subjectId, editorId: editor.id, imageDataUrl: session.edited.get(editor.id) ?? '' });
    }
  }
  return {
    phase: session.phase,
    uploadedBy: [...session.photos.keys()],
    editedBy: [...session.edited.keys()],
    confirmedBy: [...session.confirmed],
    results,
    photoToEdit: null,
  };
}

function startEditing(api: EngineApi, session: OutfitSession): void {
  session.phase = 'editing';
  const timer = api.startTimer(session.editMs, () => {
    // Timer forces the reveal — anyone who didn't finish editing sends the
    // other player's original, undecorated photo instead of nothing at all.
    for (const p of api.players) {
      if (session.edited.has(p.id)) continue;
      const otherId = api.otherPlayerId(p.id);
      const fallback = otherId ? session.photos.get(otherId) : undefined;
      if (fallback) session.edited.set(p.id, fallback);
    }
    reveal(api, session);
  });
  // Broadcast the phase change first (data.photoToEdit is always null in the
  // broadcast) — whisper the actual photo to each player only *after*, since
  // `game:state` replaces the client's whole state object and would otherwise
  // wipe out the private patch if sent first (same ordering the drawing game
  // uses for its whispered word).
  api.emitState({ phase: 'ROUND_ACTIVE', round: 0, totalRounds: 0, timer, data: publicData(api, session) });
  for (const p of api.players) {
    const otherId = api.otherPlayerId(p.id);
    const photo = otherId ? session.photos.get(otherId) : undefined;
    if (photo) api.whisper(p.id, { photoToEdit: photo });
  }
}

function reveal(api: EngineApi, session: OutfitSession): void {
  if (session.phase === 'revealed') return;
  session.phase = 'revealed';
  api.clearTimer();
  api.emitState({ phase: 'ROUND_RESULT', timer: null, data: publicData(api, session) });
}

function finishGame(api: EngineApi): void {
  api.finish({});
  sessions.delete(api.roomCode);
}

export const outfitGame: GameModule<OutfitConfig> = {
  meta: {
    id: 'outfit',
    name: 'Cambio de Look',
    icon: '👗',
    description: 'Subí tu foto y vestí a tu compañero con accesorios y dibujo libre. Al final, los dos ven cómo quedaron.',
    minPlayers: 2,
    maxPlayers: 2,
    turnBased: false,
    playable: true,
  },
  defaultConfig: { editMs: 3 * 60 * 1000 },
  start(api, config) {
    const session: OutfitSession = {
      editMs: config.editMs,
      phase: 'uploading',
      photos: new Map(),
      edited: new Map(),
      confirmed: new Set(),
    };
    sessions.set(api.roomCode, session);
    api.emitState({ phase: 'PRE_ROUND', round: 0, totalRounds: 0, timer: null, data: publicData(api, session) });
  },
  onAction(api, playerId, action, payload) {
    const session = sessions.get(api.roomCode);
    if (!session) return;

    if (action === 'photoSubmit') {
      const dataUrl = (payload as { dataUrl?: unknown })?.dataUrl;
      if (typeof dataUrl !== 'string') return;

      if (session.phase === 'uploading') {
        if (session.photos.has(playerId)) return;
        session.photos.set(playerId, dataUrl);
        if (session.photos.size >= api.players.length) {
          startEditing(api, session);
        } else {
          api.emitState({ phase: 'PRE_ROUND', data: publicData(api, session) });
        }
      } else if (session.phase === 'editing') {
        if (session.edited.has(playerId)) return;
        session.edited.set(playerId, dataUrl);
        api.emitState({ phase: 'ROUND_ACTIVE', data: publicData(api, session) });
        if (session.edited.size >= api.players.length) reveal(api, session);
      }
      return;
    }

    if (action === 'submit') {
      // Reused as the "I finished reading/looking" confirmation, same pattern
      // as the letter game — value/content of the payload is irrelevant here.
      if (session.phase !== 'revealed' || session.confirmed.has(playerId)) return;
      session.confirmed.add(playerId);
      api.emitState({ phase: 'ROUND_RESULT', timer: null, data: publicData(api, session) });
      if (api.players.every((p) => session.confirmed.has(p.id))) finishGame(api);
    }
  },
};
