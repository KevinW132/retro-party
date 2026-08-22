import { useMemo } from 'react';

const COLORS = ['#a855f7', '#38bdf8', '#39ff88', '#ffd23f', '#ff3ea5'];

interface Particle {
  left: string;
  top: string;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

/** Subtle floating pixel dots — decorative background, kept sparse so it never
 * competes with gameplay content. */
export function PixelParticles({ count = 18 }: { count?: number }) {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() < 0.7 ? 2 : 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        duration: 6 + Math.random() * 8,
        delay: Math.random() * 6,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-none opacity-40 animate-pulse"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
