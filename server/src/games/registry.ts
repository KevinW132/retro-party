import { GameId, GameMeta } from '@retro-party/shared';
import { GameModule } from './GameModule';
import { drawingGame } from './drawing';
import { quickQuestionsGame } from './quickQuestions';
import { movieGame } from './movie';
import { riddlesGame } from './riddles';
import { triviaGame } from './trivia';
import { musicGame } from './music';
import { letterGame } from './letter';
import { outfitGame } from './outfit';

const registry = new Map<GameId, GameModule<any>>([
  ['drawing', drawingGame],
  ['quickQuestions', quickQuestionsGame],
  ['movie', movieGame],
  ['riddles', riddlesGame],
  ['trivia', triviaGame],
  ['music', musicGame],
  ['letter', letterGame],
  ['outfit', outfitGame],
]);

export function getGameModule(id: GameId): GameModule<any> | undefined {
  return registry.get(id);
}

export function listGameMeta(): GameMeta[] {
  return [...registry.values()].map((g) => g.meta);
}
