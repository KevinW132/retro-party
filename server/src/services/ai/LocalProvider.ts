import { AIService, GeneratedMovieClues, GeneratedRiddle, GeneratedTriviaQuestion } from './AIService';
import triviaData from '../../data/trivia.json';
import riddlesData from '../../data/riddles.json';
import drawingWords from '../../data/drawingWords.json';
import moviesData from '../../data/movies.json';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Zero-dependency fallback used whenever no AI provider key is configured,
 * or a live provider call fails. Always available, always free. */
export class LocalProvider implements AIService {
  async generateTrivia(category: string, difficulty: string, count: number): Promise<GeneratedTriviaQuestion[]> {
    const all = triviaData as GeneratedTriviaQuestion[];
    let pool = all.filter(
      (q) => (category === 'any' || q.category === category) && (difficulty === 'any' || q.difficulty === difficulty),
    );
    if (pool.length < count) pool = all.filter((q) => category === 'any' || q.category === category);
    if (pool.length < count) pool = all;
    return shuffle(pool).slice(0, count);
  }

  async generateRiddles(difficulty: string, count: number): Promise<GeneratedRiddle[]> {
    const all = riddlesData as GeneratedRiddle[];
    let pool = all.filter((r) => difficulty === 'any' || r.difficulty === difficulty);
    if (pool.length < count) pool = all;
    return shuffle(pool).slice(0, count);
  }

  async generateDrawingWords(count: number): Promise<string[]> {
    return shuffle(drawingWords as string[]).slice(0, count);
  }

  async generateMovieClues(title: string): Promise<GeneratedMovieClues | null> {
    const movie = (moviesData as { id: string; title: string; clues: string[] }[]).find(
      (m) => m.title.toLowerCase() === title.toLowerCase(),
    );
    return movie ? { id: movie.id, title: movie.title, clues: movie.clues } : null;
  }
}
