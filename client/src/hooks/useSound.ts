import { useCallback } from 'react';
import { playTones, SOUND_PRESETS, SoundName } from '@/sounds/tone';
import { useSoundStore } from '@/state/soundStore';

export function useSound() {
  const enabled = useSoundStore((s) => s.enabled);
  const play = useCallback(
    (name: SoundName) => {
      if (!enabled) return;
      playTones(SOUND_PRESETS[name]);
    },
    [enabled],
  );
  return { play, enabled };
}
