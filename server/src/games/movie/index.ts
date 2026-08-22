import { createClueGuessGame, ClueItem } from '../clueGameFactory';
import rawMovies from '../../data/movies.json';

interface Movie {
  id: string;
  title: string;
  year: number;
  genre: string;
  difficulty: string;
  clues: string[];
}

const items: ClueItem[] = (rawMovies as Movie[]).map((m) => ({
  id: m.id,
  answer: m.title,
  clues: m.clues,
}));

export const movieGame = createClueGuessGame(
  {
    id: 'movie',
    name: 'Adivina la Película',
    icon: '🎬',
    description: 'Descubre el título a partir de pistas progresivas. Menos pistas, más puntos.',
    minPlayers: 2,
    maxPlayers: 2,
    turnBased: false,
    playable: true,
  },
  items,
);
