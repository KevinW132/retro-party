import { ComponentType } from 'react';
import type { GameId } from '@retro-party/shared';
import { QuickQuestionsScreen } from './quickQuestions/QuickQuestionsScreen';
import { DrawingScreen } from './drawing/DrawingScreen';
import { ClueGameScreen } from './clue/ClueGameScreen';
import { RiddlesScreen } from './riddles/RiddlesScreen';
import { MusicScreen } from './music/MusicScreen';
import { LetterScreen } from './letter/LetterScreen';
import { OutfitScreen } from './outfit/OutfitScreen';

export const gameScreens: Record<GameId, ComponentType> = {
  quickQuestions: QuickQuestionsScreen,
  trivia: QuickQuestionsScreen, // same MCQ + speed-score shape as quickQuestions
  drawing: DrawingScreen,
  movie: ClueGameScreen,
  music: MusicScreen,
  riddles: RiddlesScreen,
  letter: LetterScreen,
  outfit: OutfitScreen,
};
