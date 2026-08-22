export type GameId =
  | 'drawing'
  | 'quickQuestions'
  | 'movie'
  | 'riddles'
  | 'trivia'
  | 'music'
  | 'letter'
  | 'outfit';

export type GamePhase =
  | 'WAITING'
  | 'PRE_ROUND'
  | 'COUNTDOWN'
  | 'ROUND_ACTIVE'
  | 'ROUND_RESULT'
  | 'GAME_RESULT';

export interface GameMeta {
  id: GameId;
  name: string;
  icon: string;
  description: string;
  minPlayers: 2;
  maxPlayers: 2;
  turnBased: boolean;
  playable: boolean; // false = scaffolded / coming soon
}

export interface GameResult {
  gameId: GameId;
  scores: Record<string, number>;
  winnerId: string | null;
  roundsPlayed: number;
  stats: Record<string, string | number>;
  finishedAt: number;
}

export interface TimerSnapshot {
  startedAt: number;
  endsAt: number;
  durationMs: number;
}

/** Generic envelope broadcast for the active game. `data` is game-specific
 * and interpreted by the matching client game module. */
export interface GameStateSnapshot<TData = unknown> {
  gameId: GameId;
  phase: GamePhase;
  round: number;
  totalRounds: number;
  timer: TimerSnapshot | null;
  scores: Record<string, number>;
  data: TData;
}

// ---------- Quick Questions payloads ----------
export interface QuickQuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface QuickQuestionPublic {
  id: string;
  prompt: string;
  options: QuickQuestionOption[];
  index: number;
  total: number;
}

export interface QuickQuestionsData {
  question: QuickQuestionPublic | null;
  answeredPlayerIds: string[];
  lastRoundResult: {
    correctKey: string;
    correctPlayerIds: string[];
    deltas: Record<string, number>;
  } | null;
}

// ---------- Drawing & Guess payloads ----------
export type DrawingTool = 'pen' | 'eraser';

export interface DrawingStrokePoint {
  x: number;
  y: number;
}

export interface DrawingStrokeEvent {
  strokeId: string;
  tool: DrawingTool;
  color: string;
  size: number;
  points: DrawingStrokePoint[];
}

export interface DrawingData {
  drawerId: string | null;
  guesserId: string | null;
  wordLength: number | null;
  wordReveal: string | null; // only sent to drawer, or after round ends
  guessesFeedback: { playerId: string; wrong: boolean; text: string; at: number }[];
  collectingWords: boolean;
  wordsSubmittedBy: string[];
}

export interface GameResultSummary {
  gameId: GameId;
  scores: Record<string, number>;
  winnerId: string | null;
}

// ---------- Letter payloads ----------
export interface LetterEntry {
  playerId: string;
  playerName: string;
  text: string;
}

export interface LetterData {
  writtenBy: string[];
  revealed: boolean;
  confirmedBy: string[];
  letters: LetterEntry[];
}

// ---------- Outfit (photo dress-up) payloads ----------
export interface PlacedSticker {
  id: string;
  emoji: string;
  x: number; // 0..1, relative to the photo's width
  y: number; // 0..1, relative to the photo's height
  scale: number;
  rotation: number; // degrees
}

export type OutfitPhase = 'uploading' | 'editing' | 'revealed';

export interface OutfitResultEntry {
  subjectId: string; // whose photo this is
  editorId: string; // who dressed them up
  imageDataUrl: string;
}

export interface OutfitData {
  phase: OutfitPhase;
  uploadedBy: string[];
  editedBy: string[];
  confirmedBy: string[];
  results: OutfitResultEntry[]; // only populated once phase === 'revealed'
  /** Only ever set via a private whisper to the player who should edit it —
   * always null in the broadcast state. */
  photoToEdit: string | null;
}
