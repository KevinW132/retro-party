export interface GeneratedTriviaQuestion {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctKey: string;
}

export interface GeneratedRiddle {
  id: string;
  difficulty: string;
  question: string;
  answer: string;
}

export interface GeneratedMovieClues {
  id: string;
  title: string;
  clues: string[];
}

/** Abstraction over "generate game content" so the concrete AI provider can be
 * swapped without touching any game module. Every method must be safe to call
 * even with no API key configured — implementations fall back to local data. */
export interface AIService {
  generateTrivia(category: string, difficulty: string, count: number): Promise<GeneratedTriviaQuestion[]>;
  generateRiddles(difficulty: string, count: number): Promise<GeneratedRiddle[]>;
  generateDrawingWords(count: number): Promise<string[]>;
  generateMovieClues(title: string): Promise<GeneratedMovieClues | null>;
}
