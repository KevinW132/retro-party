export function isNonEmptyString(value: unknown, maxLen = 500): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLen;
}

export function isStringArray(value: unknown, maxItems = 20, maxLen = 100): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((v) => typeof v === 'string' && v.length <= maxLen)
  );
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isImageDataUrl(value: unknown, maxLen: number): value is string {
  return typeof value === 'string' && value.length <= maxLen && /^data:image\/(png|jpe?g|webp);base64,/.test(value);
}
