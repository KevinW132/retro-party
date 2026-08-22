import { motion } from 'framer-motion';
import { GlowText } from '@/components/retro/GlowText';
import { Button } from '@/components/ui/Button';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { useSound } from '@/hooks/useSound';

export function Landing({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  const { play } = useSound();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-10">
      <div className="absolute top-4 right-4">
        <SoundToggle />
      </div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <GlowText as="h1" color="purple" className="font-display text-3xl sm:text-5xl leading-relaxed">
          RETRO
          <br />
          PARTY
        </GlowText>
        <p className="mt-6 text-white/70 text-sm sm:text-base max-w-md mx-auto">
          Dos jugadores. Una sala. Que gane el mejor.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-4 w-full max-w-sm"
      >
        <Button
          className="flex-1"
          onClick={() => {
            play('click');
            onCreate();
          }}
        >
          Crear Sala
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            play('click');
            onJoin();
          }}
        >
          Unirse a una Sala
        </Button>
      </motion.div>

      <p className="text-white/30 text-[10px] font-display">v1.0 · 2 JUGADORES · TIEMPO REAL</p>
    </div>
  );
}
