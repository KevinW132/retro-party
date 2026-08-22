import { Volume2, VolumeX } from 'lucide-react';
import { useSoundStore } from '@/state/soundStore';

export function SoundToggle() {
  const enabled = useSoundStore((s) => s.enabled);
  const toggle = useSoundStore((s) => s.toggle);
  return (
    <button
      onClick={toggle}
      aria-label={enabled ? 'Desactivar sonido' : 'Activar sonido'}
      aria-pressed={enabled}
      className="btn-arcade-secondary !p-3"
    >
      {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
  );
}
