import 'dotenv/config';

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  port: readInt('SERVER_PORT', 4000),
  corsOrigin: process.env.CLIENT_ORIGIN?.split(',').map((s) => s.trim()) ?? [
    'http://localhost:5173',
  ],
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};
