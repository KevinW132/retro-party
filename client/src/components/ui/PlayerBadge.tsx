import { WifiOff } from 'lucide-react';
import type { Player } from '@retro-party/shared';
import clsx from '@/utils/clsx';

export function PlayerBadge({ player, isYou }: { player: Player; isYou?: boolean }) {
  return (
    <div className="arcade-panel px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xl" aria-hidden="true">
          👾
        </span>
        <div className="min-w-0">
          <p className="font-display text-[10px] truncate">
            {player.name}
            {isYou && <span className="text-arcade-green"> (tú)</span>}
            {player.isHost && <span className="text-arcade-yellow"> ★</span>}
          </p>
        </div>
      </div>
      {!player.connected ? (
        <span className="flex items-center gap-1 text-[9px] font-display text-arcade-pink" role="status">
          <WifiOff size={12} aria-hidden="true" /> OFFLINE
        </span>
      ) : (
        <span
          className={clsx(
            'text-[9px] font-display px-2 py-1',
            player.ready ? 'text-arcade-green' : 'text-white/40',
          )}
          role="status"
        >
          {player.ready ? '🟢 LISTO' : '⚪ ESPERANDO'}
        </span>
      )}
    </div>
  );
}
