import { createClueGuessGame, ClueItem } from '../clueGameFactory';
import { fetchPreviewUrl } from '../../services/music/previewService';
import rawSongs from '../../data/songs.json';

interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: string;
  difficulty: string;
}

const items: ClueItem[] = (rawSongs as Song[]).map((s) => ({
  id: s.id,
  answer: s.title,
  clues: [`🎵 Género: ${s.genre}`, `📅 Año: ${s.year}`, `🎤 Artista: ${s.artist}`],
}));

// No audio is bundled — clips are 30s previews resolved from Apple's public
// iTunes Search API (no key required) once at startup and cached on the
// items themselves for the process lifetime. Sequential on purpose to stay
// well under iTunes' unpublished rate limit; if a lookup fails or the
// process is mid-fetch, that round just falls back to clue-only play.
(async () => {
  for (let i = 0; i < items.length; i++) {
    const song = rawSongs[i] as Song;
    items[i].audioUrl = (await fetchPreviewUrl({ title: song.title, artist: song.artist })) ?? undefined;
  }
})().catch(() => {});

export const musicGame = createClueGuessGame(
  {
    id: 'music',
    name: 'Adivina la Canción',
    icon: '🎵',
    description: 'Escuchá un fragmento de 30s y adiviná la canción, con pistas de género, año y artista de respaldo.',
    minPlayers: 2,
    maxPlayers: 2,
    turnBased: false,
    playable: true,
  },
  items,
);
