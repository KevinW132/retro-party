import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { EVENTS, PLAYER_NAME_MAX_LENGTH } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { GlowText } from '@/components/retro/GlowText';

export function JoinRoom({ onBack, initialCode }: { onBack: () => void; initialCode?: string }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode ?? '');
  const error = useRoomStore((s) => s.error);
  const setError = useRoomStore((s) => s.setError);

  useEffect(() => () => setError(null), [setError]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setError(null);
    socket.emit(EVENTS.ROOM_JOIN, { playerName: name.trim(), code: code.trim().toUpperCase() });
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-8">
      <button onClick={onBack} className="absolute top-4 left-4 text-white/60 hover:text-white" aria-label="Volver">
        <ArrowLeft />
      </button>
      <GlowText as="h2" color="blue" className="font-display text-lg sm:text-xl">
        Unirse a Sala
      </GlowText>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-sm">
        <TextInput
          id="joinName"
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={PLAYER_NAME_MAX_LENGTH}
          placeholder="Nombre"
          autoFocus
        />
        <TextInput
          id="joinCode"
          label="Código"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="A7K9P2"
          maxLength={8}
        />
        {error && (
          <p className="text-arcade-pink text-xs" role="alert">
            {error.message}
          </p>
        )}
        <Button type="submit" disabled={!name.trim() || !code.trim()}>
          Unirse
        </Button>
      </form>
    </div>
  );
}
