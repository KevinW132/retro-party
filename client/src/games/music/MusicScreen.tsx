import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EVENTS } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { useSound } from '@/hooks/useSound';

interface MusicData {
  clues: string[];
  totalClues: number;
  wrongGuesses: { playerId: string; text: string }[];
  revealAnswer: string | null;
  index: number;
  total: number;
  audioUrl: string | null;
}

export function MusicScreen() {
  const gameState = useRoomStore((s) => s.gameState);
  const room = useRoomStore((s) => s.room);
  const { play } = useSound();
  const [value, setValue] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastIndex = useRef<number>(-1);

  const data = gameState?.data as MusicData | undefined;

  useEffect(() => {
    if (data && data.index !== lastIndex.current) {
      lastIndex.current = data.index;
      setValue('');
      setIsPlaying(false);
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [data]);

  const prevRevealRef = useRef<string | null>(null);
  useEffect(() => {
    if (data?.revealAnswer && data.revealAnswer !== prevRevealRef.current) {
      prevRevealRef.current = data.revealAnswer;
      play('correct');
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [data?.revealAnswer, play]);

  if (!gameState || !data) return <p className="text-center text-white/40 text-sm py-12">Cargando…</p>;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || data?.revealAnswer) return;
    socket.emit(EVENTS.ANSWER_SUBMIT, { value: value.trim(), at: Date.now() });
    setValue('');
  }

  function toggleAudio() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 items-center max-w-xl mx-auto">
      <p className="text-white/40 text-xs font-display">
        🎵 ADIVINA LA CANCIÓN · {data.index + 1} / {data.total}
      </p>

      {data.audioUrl ? (
        <>
          <audio ref={audioRef} src={data.audioUrl} preload="none" onEnded={() => setIsPlaying(false)} />
          <button type="button" onClick={toggleAudio} className="btn-arcade flex items-center gap-2">
            {isPlaying ? '⏸️ Pausar' : '▶️ Escuchar (30s)'}
          </button>
        </>
      ) : (
        <p className="text-white/30 text-xs text-center">🔇 Sin clip para esta canción — usá las pistas de abajo</p>
      )}

      <div className="flex flex-col gap-2 w-full">
        <AnimatePresence initial={false}>
          {data.clues.map((clue, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="arcade-panel px-4 py-3 text-sm"
            >
              <span className="text-arcade-blue font-display text-[10px] mr-2">PISTA #{i + 1}</span>
              {clue}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!data.revealAnswer ? (
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Tu respuesta…"
            className="flex-1 bg-panel2 pixel-border px-4 py-3 text-white outline-none"
          />
          <button type="submit" disabled={!value.trim()} className="btn-arcade">
            Responder
          </button>
        </form>
      ) : (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-sm text-arcade-yellow">
          Respuesta: {data.revealAnswer}
        </motion.p>
      )}

      {data.wrongGuesses.length > 0 && !data.revealAnswer && (
        <div className="text-xs text-white/40 flex flex-col gap-1 items-center">
          {data.wrongGuesses.slice(-3).map((g, i) => (
            <span key={i}>
              ❌ {room?.players.find((p) => p.id === g.playerId)?.name ?? '?'}: "{g.text}"
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
