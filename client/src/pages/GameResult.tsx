import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { EVENTS } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/retro/GlowText';
import { useSound } from '@/hooks/useSound';

export function GameResult() {
  const room = useRoomStore((s) => s.room);
  const you = useRoomStore((s) => s.you);
  const lastFinishedGame = useRoomStore((s) => s.lastFinishedGame);
  const { play } = useSound();
  const isHost = !!you?.isHost;
  const host = room?.players.find((p) => p.isHost);

  useEffect(() => {
    play(lastFinishedGame?.result.winnerId ? 'correct' : 'click');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!room || !lastFinishedGame) return null;
  const { result, hasNextGame } = lastFinishedGame;
  const winner = room.players.find((p) => p.id === result.winnerId);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-6 text-center max-w-md mx-auto w-full">
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="arcade-panel px-8 py-6 w-full">
        <GlowText as="h2" color="yellow" className="font-display text-base sm:text-lg mb-4">
          GAME OVER
        </GlowText>

        {winner ? (
          <p className="font-display text-sm text-arcade-green mb-4 flex items-center justify-center gap-2">
            <Trophy size={16} /> {winner.name.toUpperCase()}
          </p>
        ) : (
          <p className="font-display text-sm text-white/60 mb-4">¡EMPATE!</p>
        )}

        <div className="flex justify-center gap-6 mb-6">
          {room.players.map((p) => (
            <div key={p.id} className="flex flex-col items-center">
              <span className="text-xs text-white/60">{p.name}</span>
              <span className="font-display text-arcade-green text-lg">+{result.scores[p.id] ?? 0}</span>
            </div>
          ))}
        </div>

        <p className="font-display text-[9px] text-arcade-blue uppercase mb-2">Marcador total</p>
        <div className="flex justify-center gap-6">
          {room.players.map((p) => (
            <div key={p.id} className="flex flex-col items-center">
              <span className="text-xs text-white/60">{p.name}</span>
              <span className="font-display text-arcade-yellow text-xl">{p.score}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {isHost ? (
        <Button className="w-full" onClick={() => socket.emit(EVENTS.GAME_NEXT)}>
          {hasNextGame ? 'Siguiente Juego' : 'Ver Resultado Final'}
        </Button>
      ) : (
        <p className="font-display text-[10px] text-arcade-blue animate-pulse">
          ESPERANDO A {(host?.name ?? 'EL ANFITRIÓN').toUpperCase()}…
        </p>
      )}
    </div>
  );
}
