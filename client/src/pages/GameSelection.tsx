import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { EVENTS, GameId } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/retro/GlowText';
import clsx from '@/utils/clsx';

export function GameSelection() {
  const catalog = useRoomStore((s) => s.gameCatalog);
  const room = useRoomStore((s) => s.room);
  const you = useRoomStore((s) => s.you);
  const [selected, setSelected] = useState<GameId[]>([]);
  const isHost = !!you?.isHost;
  const host = room?.players.find((p) => p.isHost);

  function toggle(id: GameId) {
    if (!isHost) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  function handleContinue() {
    if (!isHost || selected.length === 0) return;
    socket.emit(EVENTS.GAME_SELECT, { gameIds: selected });
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 gap-6 max-w-3xl mx-auto w-full">
      <GlowText as="h1" color="yellow" className="font-display text-lg sm:text-2xl text-center">
        SELECT YOUR GAME
      </GlowText>
      <p className="text-white/50 text-xs text-center">
        {isHost
          ? 'Elige uno o varios juegos para esta partida.'
          : `Esperando a que ${host?.name ?? 'el anfitrión'} elija los juegos…`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {catalog.map((game) => {
          const isSelected = selected.includes(game.id);
          return (
            <motion.button
              key={game.id}
              onClick={() => toggle(game.id)}
              whileTap={isHost ? { scale: 0.97 } : undefined}
              disabled={!isHost}
              className={clsx(
                'arcade-panel text-left px-4 py-4 flex items-start gap-3 transition-colors relative',
                isSelected && 'ring-2 ring-arcade-green',
                !isHost && 'opacity-60 cursor-default',
              )}
              aria-pressed={isSelected}
            >
              <span className="text-2xl" aria-hidden="true">
                {game.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[11px] mb-1">
                  {game.name}
                  {!game.playable && <span className="text-white/30"> (próx.)</span>}
                </p>
                <p className="text-white/50 text-xs leading-snug">{game.description}</p>
              </div>
              {isSelected && (
                <span className="absolute top-2 right-2 bg-arcade-green rounded-full p-0.5">
                  <Check size={12} className="text-ink" />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {isHost ? (
        <Button className="w-full max-w-sm" disabled={selected.length === 0} onClick={handleContinue}>
          Continuar ({selected.length})
        </Button>
      ) : (
        <p className="font-display text-[10px] text-arcade-blue animate-pulse">ESPERANDO AL ANFITRIÓN…</p>
      )}
    </div>
  );
}
