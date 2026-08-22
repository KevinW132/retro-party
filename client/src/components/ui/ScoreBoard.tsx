import { AnimatePresence, motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import type { Player } from '@retro-party/shared';
import clsx from '@/utils/clsx';

export function ScoreBoard({ players, scores, youId }: { players: Player[]; scores: Record<string, number>; youId?: string }) {
  const sorted = [...players];
  const leaderId =
    sorted.length === 2 && scores[sorted[0].id] !== scores[sorted[1].id]
      ? scores[sorted[0].id] > scores[sorted[1].id]
        ? sorted[0].id
        : sorted[1].id
      : null;

  return (
    <div className="flex gap-3 sm:gap-6 justify-center">
      {sorted.map((p) => {
        const score = scores[p.id] ?? 0;
        const isLeader = p.id === leaderId;
        return (
          <div
            key={p.id}
            className={clsx(
              'arcade-panel px-4 py-3 flex flex-col items-center min-w-[100px]',
              isLeader && 'ring-2 ring-arcade-yellow',
            )}
          >
            <div className="flex items-center gap-1 text-[10px] font-display truncate max-w-[110px]">
              {isLeader && <Trophy size={12} className="text-arcade-yellow" aria-hidden="true" />}
              <span className={p.id === youId ? 'text-arcade-green' : 'text-white/80'}>{p.name}</span>
            </div>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={score}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="font-display text-lg sm:text-2xl text-arcade-yellow glow-text mt-1"
              >
                {score}
              </motion.span>
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
