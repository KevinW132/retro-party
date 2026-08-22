import { AIService, GeneratedMovieClues, GeneratedRiddle, GeneratedTriviaQuestion } from './AIService';
import { LocalProvider } from './LocalProvider';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

/** Live OpenAI-backed provider. Only `generateTrivia` actually calls out to
 * OpenAI — the other methods proxy to LocalProvider since local datasets
 * cover them well enough for now (swap in real prompts here later if needed).
 * Any network/parse failure falls back to LocalProvider so the game never breaks. */
export class OpenAIProvider implements AIService {
  private fallback = new LocalProvider();

  constructor(private apiKey: string) {}

  async generateTrivia(category: string, difficulty: string, count: number): Promise<GeneratedTriviaQuestion[]> {
    try {
      const prompt = `Genera ${count} preguntas de trivia en español, categoría "${category}", dificultad "${difficulty}". ` +
        'Responde SOLO un JSON con la forma {"questions":[{"question":string,"options":[{"key":"A|B|C|D","text":string}] (4 opciones),"correctKey":"A|B|C|D"}]}.';
      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.8,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI request failed: ${res.status}`);
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty OpenAI response');
      const parsed = JSON.parse(content) as { questions?: unknown[] };
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      const valid: GeneratedTriviaQuestion[] = questions
        .filter(isValidQuestion)
        .slice(0, count)
        .map((q, i) => ({
          id: `ai-${Date.now()}-${i}`,
          category,
          difficulty,
          question: q.question,
          options: q.options.map((o) => ({ key: o.key as 'A' | 'B' | 'C' | 'D', text: o.text })),
          correctKey: q.correctKey,
        }));
      if (valid.length === 0) throw new Error('No valid questions returned');
      return valid;
    } catch {
      return this.fallback.generateTrivia(category, difficulty, count);
    }
  }

  generateRiddles(difficulty: string, count: number): Promise<GeneratedRiddle[]> {
    return this.fallback.generateRiddles(difficulty, count);
  }

  generateDrawingWords(count: number): Promise<string[]> {
    return this.fallback.generateDrawingWords(count);
  }

  generateMovieClues(title: string): Promise<GeneratedMovieClues | null> {
    return this.fallback.generateMovieClues(title);
  }
}

interface RawQuestion {
  question: string;
  options: { key: string; text: string }[];
  correctKey: string;
}

const VALID_KEYS = new Set(['A', 'B', 'C', 'D']);

function isValidQuestion(q: unknown): q is RawQuestion {
  if (typeof q !== 'object' || q === null) return false;
  const obj = q as Record<string, unknown>;
  if (typeof obj.question !== 'string') return false;
  if (typeof obj.correctKey !== 'string' || !VALID_KEYS.has(obj.correctKey)) return false;
  if (!Array.isArray(obj.options) || obj.options.length !== 4) return false;
  return obj.options.every((o) => {
    if (typeof o !== 'object' || o === null) return false;
    const opt = o as Record<string, unknown>;
    return typeof opt.key === 'string' && VALID_KEYS.has(opt.key) && typeof opt.text === 'string';
  });
}
