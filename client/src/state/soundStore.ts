import { create } from 'zustand';

const STORAGE_KEY = 'retro-party:sound-enabled';

function readInitial(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === null ? true : raw === 'true';
}

interface SoundStoreState {
  enabled: boolean;
  toggle: () => void;
}

export const useSoundStore = create<SoundStoreState>((set, get) => ({
  enabled: readInitial(),
  toggle: () => {
    const next = !get().enabled;
    localStorage.setItem(STORAGE_KEY, String(next));
    set({ enabled: next });
  },
}));
