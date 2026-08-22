import { CHAT_MAX_LENGTH, PLAYER_NAME_MAX_LENGTH } from '@retro-party/shared';

const CONTROL_CHARS_REGEX = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');
// Same as above but keeps newlines — for multi-line text like a letter.
const CONTROL_CHARS_KEEP_NEWLINE_REGEX = new RegExp('[\\u0000-\\u0009\\u000B-\\u001F\\u007F]', 'g');

/** Strips HTML/control chars and collapses whitespace. Not a full HTML sanitizer —
 * we never render user text as HTML, only as text nodes, so this just guards
 * against garbage input and layout-breaking payloads. */
function stripUnsafe(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizePlayerName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = stripUnsafe(raw).slice(0, PLAYER_NAME_MAX_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

export function sanitizeChatText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = stripUnsafe(raw).slice(0, CHAT_MAX_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

export function sanitizeAnswerText(raw: unknown, maxLen = 80): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = stripUnsafe(raw).slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : null;
}

/** Like sanitizeAnswerText but preserves line breaks — for free-form multi-line
 * text (e.g. a written letter) where collapsing whitespace would ruin it. */
export function sanitizeLetterText(raw: unknown, maxLen = 3000): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .replace(/<[^>]*>/g, '')
    .replace(CONTROL_CHARS_KEEP_NEWLINE_REGEX, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : null;
}
