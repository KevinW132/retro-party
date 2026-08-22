/** Shared scoring tiers so every game module scores consistently. */
export const SCORE = {
  ULTRA_FAST: 100,
  FAST: 75,
  MEDIUM: 50,
  SLOW: 25,
  BONUS: 25,
  WRONG_PENALTY: -10,
} as const;

/** Given elapsed ms out of a total window, pick a speed tier score. */
export function speedScore(elapsedMs: number, windowMs: number): number {
  const ratio = Math.max(0, Math.min(1, elapsedMs / windowMs));
  if (ratio <= 0.25) return SCORE.ULTRA_FAST;
  if (ratio <= 0.5) return SCORE.FAST;
  if (ratio <= 0.75) return SCORE.MEDIUM;
  return SCORE.SLOW;
}

export const ROOM_CODE_LENGTH = 6;
export const MAX_PLAYERS_PER_ROOM = 2;
export const DISCONNECT_GRACE_MS = 60_000;
export const ROOM_IDLE_EXPIRY_MS = 30 * 60_000;
export const CHAT_MAX_LENGTH = 240;
export const PLAYER_NAME_MAX_LENGTH = 20;
/** Max length (chars) of a base64 image data URL accepted for the outfit
 * game — generous headroom over the ~150-400KB the client compresses to. */
export const PHOTO_DATA_URL_MAX_LENGTH = 4_000_000;
