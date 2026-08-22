import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { EVENTS } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { useSound } from '@/hooks/useSound';
import clsx from '@/utils/clsx';

interface RiddlesData {
  riddle: { id: string; question: string; index: number; total: number } | null;
  answeredPlayerIds: string[];
  revealAnswer: string | null;
  results: Record<string, boolean> | null;
}

export function RiddlesScreen() {
  const gameState = useRoomStore((s) => s.gameState);
  const you = useRoomStore((s) => s.you);
  const room = useRoomStore((s) => s.room);
  const { play } = useSound();
  const [value, setValue] = useState('');
  const lastId = useRef<string | null>(null);

  const data = gameState?.data as RiddlesData | undefined;
  const riddle = data?.riddle;

  useEffect(() => {
    if (riddle && riddle.id !== lastId.current) {
      lastId.current = riddle.id;
      setValue('');
    }
  }, [riddle]);

  useEffect(() => {
    if (data?.results && you) play(data.results[you.id] ? 'correct' : 'incorrect');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.revealAnswer]);

  if (!riddle) return <p className="text-center text-white/40 text-sm py-12">Cargando adivinanza…</p>;

  const hasAnswered = !!you && data?.answeredPlayerIds.includes(you.id);
  const opponent = room?.players.find((p) => p.id !== you?.id);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (hasAnswered || data?.revealAnswer || !value.trim()) return;
    socket.emit(EVENTS.ANSWER_SUBMIT, { value: value.trim(), at: Date.now() });
  }

  return (
    <div className="flex flex-col gap-6 items-center max-w-xl mx-auto">
      <p className="text-white/40 text-xs font-display">
        ADIVINANZA {riddle.index + 1} / {riddle.total}
      </p>
      <motion.p key={riddle.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-base sm:text-lg text-center whitespace-pre-line">
        {riddle.question}
      </motion.p>

      {!data?.revealAnswer ? (
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={hasAnswered}
            placeholder="Escribe tu respuesta…"
            className="flex-1 bg-panel2 pixel-border px-4 py-3 text-white outline-none disabled:opacity-50"
          />
          <button type="submit" disabled={hasAnswered || !value.trim()} className="btn-arcade">
            Enviar
          </button>
        </form>
      ) : (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-sm text-arcade-yellow">
          Respuesta: {data.revealAnswer}
        </motion.p>
      )}

      <div className="text-xs text-white/50 font-display flex gap-4">
        <span>{hasAnswered ? '✅ Respondiste' : '⏳ Esperando tu respuesta'}</span>
        {opponent && (
          <span>
            {data?.answeredPlayerIds.includes(opponent.id) ? `✅ ${opponent.name} respondió` : `⏳ Esperando a ${opponent.name}`}
          </span>
        )}
      </div>

      {data?.results && you && (
        <p className={clsx('font-display text-sm', data.results[you.id] ? 'text-arcade-green' : 'text-arcade-pink')}>
          {data.results[you.id] ? '✨ ¡CORRECTO!' : '❌ INCORRECTO'}
        </p>
      )}
    </div>
  );
}
