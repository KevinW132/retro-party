import { ReactNode } from 'react';
import { PixelParticles } from './PixelParticles';

export function RetroShell({ children }: { children: ReactNode }) {
  return (
    <div className="crt-vignette min-h-screen w-full relative overflow-x-hidden">
      <PixelParticles />
      <div className="scanlines relative z-10 min-h-screen flex flex-col">{children}</div>
    </div>
  );
}
