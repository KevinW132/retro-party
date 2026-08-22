interface TrackQuery {
  title: string;
  artist: string;
}

interface ITunesSearchResponse {
  results?: { previewUrl?: string }[];
}

/** Looks up a 30s preview clip for a track via Apple's public iTunes Search
 * API (no key required, same clips iTunes/Apple Music use for previews).
 * Best-effort: any failure resolves to null so the game degrades to
 * clue-only play instead of erroring. */
export async function fetchPreviewUrl({ title, artist }: TrackQuery): Promise<string | null> {
  try {
    const term = encodeURIComponent(`${title} ${artist}`);
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`);
    if (!res.ok) return null;
    const json = (await res.json()) as ITunesSearchResponse;
    return json.results?.[0]?.previewUrl ?? null;
  } catch {
    return null;
  }
}
