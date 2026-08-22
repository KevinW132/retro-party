import { motion } from 'framer-motion';
import type { TimerSnapshot } from '@retro-party/shared';
import { useServerTimer } from '@/hooks/useServerTimer';
import clsx from '@/utils/clsx';

export function GameTimer({ timer }: { timer: TimerSnapshot | null }) {
  const { remainingSec, ratio } = useServerTimer(timer);
  if (!timer) return null;
  const urgent = remainingSec <= 5;

  return (
    <div className="flex flex-col items-center gap-1" role="timer" aria-live="polite">
      <motion.span
        key={urgent ? remainingSec : 'calm'}
        initial={urgent ? { scale: 1.4 } : false}
        animate={{ scale: 1 }}
        className={clsx(
          'font-display text-xl sm:text-2xl glow-text',
          urgent ? 'text-arcade-pink' : 'text-arcade-blue',
        )}
      >
        {remainingSec > 0 ? remainingSec : "TIME'S UP!"}
      </motion.span>
      <div className="w-32 sm:w-48 h-2 bg-panel2 pixel-border overflow-hidden">
        <div
          className={clsx('h-full transition-[width] duration-150', urgent ? 'bg-arcade-pink' : 'bg-arcade-blue')}
          style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }}
        />
      </div>
    </div>
  );
}
