import { motion } from 'framer-motion';
import { EVENTS, QuickQuestionsData } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import clsx from '@/utils/clsx';
import { useSound } from '@/hooks/useSound';
import { useEffect, useRef, useState } from 'react';

export function QuickQuestionsScreen() {
  const gameState = useRoomStore((s) => s.gameState);
  const you = useRoomStore((s) => s.you);
  const room = useRoomStore((s) => s.room);
  const { play } = useSound();
  const [selected, setSelected] = useState<string | null>(null);
  const lastQuestionId = useRef<string | null>(null);

  const data = gameState?.data as QuickQuestionsData | undefined;
  const question = data?.question;
  const result = data?.lastRoundResult;

  useEffect(() => {
    if (question && question.id !== lastQuestionId.current) {
      lastQuestionId.current = question.id;
      setSelected(null);
    }
  }, [question]);

  useEffect(() => {
    if (result) play(result.correctPlayerIds.includes(you?.id ?? '') ? 'correct' : 'incorrect');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (!question) return <p className="text-center text-white/40 text-sm py-12">Cargando pregunta…</p>;

  const hasAnswered = !!you && data?.answeredPlayerIds.includes(you.id);
  const opponent = room?.players.find((p) => p.id !== you?.id);
  const opponentAnswered = !!opponent && !!data?.answeredPlayerIds.includes(opponent.id);

  function choose(key: string) {
    if (hasAnswered || result) return;
    setSelected(key);
    socket.emit(EVENTS.ANSWER_SUBMIT, { value: key, at: Date.now() });
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      <p className="text-white/40 text-xs font-display">
        PREGUNTA {question.index + 1} / {question.total}
      </p>
      <motion.h2 key={question.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-lg sm:text-xl text-center max-w-xl">
        {question.prompt}
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {question.options.map((opt) => {
          const isSelected = selected === opt.key;
          const isCorrect = result && opt.key === result.correctKey;
          const isWrongSelected = result && isSelected && opt.key !== result.correctKey;
          return (
            <button
              key={opt.key}
              onClick={() => choose(opt.key)}
              disabled={hasAnswered || !!result}
              className={clsx(
                'arcade-panel px-4 py-4 text-left text-sm flex items-center gap-3 transition-colors disabled:opacity-70',
                isSelected && !result && 'ring-2 ring-arcade-blue',
                isCorrect && 'ring-2 ring-arcade-green bg-arcade-green/10',
                isWrongSelected && 'ring-2 ring-arcade-pink bg-arcade-pink/10',
              )}
            >
              <span className="font-display text-arcade-blue">{opt.key}</span>
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>

      <div className="text-xs text-white/50 font-display flex gap-4">
        <span>{hasAnswered ? '✅ Respondiste' : '⏳ Esperando tu respuesta'}</span>
        {opponent && <span>{opponentAnswered ? `✅ ${opponent.name} respondió` : `⏳ Esperando a ${opponent.name}`}</span>}
      </div>

      {result && (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={clsx(
            'font-display text-sm',
            result.correctPlayerIds.includes(you?.id ?? '') ? 'text-arcade-green' : 'text-arcade-pink',
          )}
        >
          {result.correctPlayerIds.includes(you?.id ?? '') ? '✨ ¡CORRECTO!' : '❌ Respuesta correcta: ' + result.correctKey}
        </motion.p>
      )}
    </div>
  );
}
