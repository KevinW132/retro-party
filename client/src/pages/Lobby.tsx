import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { EVENTS } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { PlayerBadge } from '@/components/ui/PlayerBadge';
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/retro/GlowText';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useSound } from '@/hooks/useSound';

export function Lobby() {
  const room = useRoomStore((s) => s.room);
  const you = useRoomStore((s) => s.you);
  const { play } = useSound();

  const bothReady = room ? room.players.length === 2 && room.players.every((p) => p.ready) : false;
  const isFull = room ? room.players.length === 2 : false;

  useEffect(() => {
    if (isFull) play('join');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFull]);

  if (!room || !you) return null;

  function toggleReady() {
    play('ready');
    socket.emit(EVENTS.ROOM_READY, { ready: !you!.ready });
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 gap-6 max-w-2xl mx-auto w-full">
      <GlowText as="h1" color="purple" className="font-display text-lg sm:text-2xl text-center">
        RETRO PARTY
      </GlowText>
      <p className="font-display text-xs text-arcade-blue">
        ROOM: <span className="text-arcade-yellow">{room.code}</span>
      </p>

      <div className="w-full flex flex-col gap-3">
        {room.players.map((p) => (
          <PlayerBadge key={p.id} player={p} isYou={p.id === you.id} />
        ))}
        {room.players.length < 2 && (
          <div className="arcade-panel px-4 py-6 text-center text-white/40 text-xs font-display animate-pulse">
            ESPERANDO SEGUNDO JUGADOR…
          </div>
        )}
      </div>

      {isFull && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-arcade-green text-xs font-display">
          {bothReady ? '¡AMBOS LISTOS!' : 'PLAYER 2 JOINED!'}
        </motion.div>
      )}

      <div className="w-full max-w-md h-64 hidden lg:block">
        <ChatPanel />
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <Button className="w-full" variant={you.ready ? 'secondary' : 'primary'} onClick={toggleReady}>
          {you.ready ? 'CANCELAR LISTO' : 'ESTOY LISTO'}
        </Button>
        {bothReady && (
          <Button className="w-full" onClick={() => socket.emit(EVENTS.ROOM_START)}>
            COMENZAR
          </Button>
        )}
      </div>
    </div>
  );
}
