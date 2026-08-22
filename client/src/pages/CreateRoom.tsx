import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, ArrowLeft } from 'lucide-react';
import { EVENTS, PLAYER_NAME_MAX_LENGTH } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { GlowText } from '@/components/retro/GlowText';

export function CreateRoom({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const room = useRoomStore((s) => s.room);
  const error = useRoomStore((s) => s.error);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    socket.emit(EVENTS.ROOM_CREATE, { playerName: name.trim() });
  }

  const roomLink = room ? `${window.location.origin}/room/${room.code}` : '';

  function copy(what: 'code' | 'link') {
    const value = what === 'code' ? room?.code ?? '' : roomLink;
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-8 text-center">
        <GlowText as="h2" color="green" className="font-display text-lg sm:text-xl">
          Tu sala está lista
        </GlowText>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="arcade-panel px-8 py-6"
        >
          <p className="text-white/50 text-xs font-display mb-2">CÓDIGO</p>
          <p className="font-display text-3xl sm:text-4xl text-arcade-yellow glow-text tracking-widest">{room.code}</p>
        </motion.div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button variant="secondary" className="flex-1" onClick={() => copy('code')} icon={copied === 'code' ? <Check size={14} /> : <Copy size={14} />}>
            {copied === 'code' ? 'Copiado' : 'Copiar código'}
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => copy('link')} icon={copied === 'link' ? <Check size={14} /> : <Copy size={14} />}>
            {copied === 'link' ? 'Copiado' : 'Copiar enlace'}
          </Button>
        </div>
        {typeof navigator.share === 'function' && (
          <Button
            variant="secondary"
            icon={<Share2 size={14} />}
            onClick={() => navigator.share?.({ title: 'Retro Party', text: `Únete a mi sala: ${room.code}`, url: roomLink })}
          >
            Compartir
          </Button>
        )}
        <p className="text-white/40 text-xs">Esperando al segundo jugador…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-8">
      <button onClick={onBack} className="absolute top-4 left-4 text-white/60 hover:text-white" aria-label="Volver">
        <ArrowLeft />
      </button>
      <GlowText as="h2" color="purple" className="font-display text-lg sm:text-xl">
        Crear Sala
      </GlowText>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-sm">
        <TextInput
          id="playerName"
          label="Nombre del jugador"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={PLAYER_NAME_MAX_LENGTH}
          placeholder="Nombre"
          autoFocus
        />
        {error && <p className="text-arcade-pink text-xs">{error.message}</p>}
        <Button type="submit" disabled={!name.trim()}>
          Crear Sala
        </Button>
      </form>
    </div>
  );
}
