import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eraser, Pencil, Undo2, Trash2 } from 'lucide-react';
import { EVENTS, DrawingData } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { useSound } from '@/hooks/useSound';
import clsx from '@/utils/clsx';
import { useDrawingCanvas } from './useDrawingCanvas';

const PALETTE = ['#ffffff', '#ff3ea5', '#38bdf8', '#39ff88', '#ffd23f', '#a855f7', '#f97316', '#111111'];
const SIZES = [3, 6, 12];

function WordCollectionForm() {
  const gameState = useRoomStore((s) => s.gameState);
  const you = useRoomStore((s) => s.you);
  const room = useRoomStore((s) => s.room);
  const [words, setWords] = useState<string[]>(['']);
  const data = gameState?.data as DrawingData | undefined;
  const submitted = !!you && !!data?.wordsSubmittedBy.includes(you.id);
  const opponent = room?.players.find((p) => p.id !== you?.id);

  function updateWord(i: number, value: string) {
    setWords((prev) => prev.map((w, idx) => (idx === i ? value : w)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleaned = words.map((w) => w.trim()).filter(Boolean);
    if (cleaned.length === 0) return;
    socket.emit(EVENTS.DRAWING_WORDS_SUBMIT, { words: cleaned });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="font-display text-sm text-arcade-green">✅ Palabras enviadas</p>
        <p className="text-white/50 text-xs">
          {opponent ? `Esperando a ${opponent.name}…` : 'Esperando al otro jugador…'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto w-full py-6">
      <p className="font-display text-xs text-arcade-blue text-center">ESCRIBE PALABRAS PARA DIBUJAR</p>
      {words.map((w, i) => (
        <input
          key={i}
          value={w}
          onChange={(e) => updateWord(i, e.target.value)}
          placeholder={`Palabra ${i + 1}`}
          maxLength={40}
          className="bg-panel2 pixel-border px-4 py-3 text-white outline-none"
        />
      ))}
      <div className="flex gap-2">
        {words.length < 5 && (
          <button type="button" onClick={() => setWords((prev) => [...prev, ''])} className="btn-arcade-secondary flex-1">
            + Palabra
          </button>
        )}
        <button type="submit" className="btn-arcade flex-1">
          Enviar
        </button>
      </div>
    </form>
  );
}

export function DrawingScreen() {
  const gameState = useRoomStore((s) => s.gameState);
  const you = useRoomStore((s) => s.you);
  const room = useRoomStore((s) => s.room);
  const { play } = useSound();
  const [guess, setGuess] = useState('');
  const lastRoundKey = useRef<string>('');

  const data = gameState?.data as DrawingData | undefined;
  const isDrawer = !!you && data?.drawerId === you.id;
  const canvas = useDrawingCanvas(isDrawer);

  const roundKey = `${gameState?.round}-${data?.drawerId}`;
  useEffect(() => {
    if (roundKey !== lastRoundKey.current) {
      lastRoundKey.current = roundKey;
      canvas.resetCanvas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey]);

  const prevReveal = useRef<string | null | undefined>(null);
  useEffect(() => {
    if (data?.wordReveal && data.wordReveal !== prevReveal.current && gameState?.phase === 'ROUND_RESULT') {
      prevReveal.current = data.wordReveal;
      play('correct');
    }
  }, [data?.wordReveal, gameState?.phase, play]);

  if (!gameState || !data) return null;
  if (data.collectingWords) return <WordCollectionForm />;

  const drawer = room?.players.find((p) => p.id === data.drawerId);
  const guesser = room?.players.find((p) => p.id === data.guesserId);

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    canvas.startStroke(e.clientX, e.clientY);
  }
  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.buttons !== 1) return;
    canvas.moveStroke(e.clientX, e.clientY);
  }
  function handlePointerUp() {
    canvas.endStroke();
  }

  function submitGuess(e: FormEvent) {
    e.preventDefault();
    if (!guess.trim()) return;
    socket.emit(EVENTS.ANSWER_SUBMIT, { value: guess.trim(), at: Date.now() });
    setGuess('');
  }

  return (
    <div className="flex flex-col gap-4 items-center max-w-2xl mx-auto w-full">
      <p className="font-display text-xs text-center">
        {isDrawer ? (
          <span className="text-arcade-green">
            DIBUJA: <span className="text-arcade-yellow">{data.wordReveal}</span>
          </span>
        ) : (
          <span className="text-arcade-blue">
            {drawer?.name?.toUpperCase()} DIBUJA · ADIVINA{' '}
            {data.wordLength ? '(' + '_ '.repeat(data.wordLength).trim() + ')' : ''}
          </span>
        )}
      </p>

      {isDrawer && (
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <button
            type="button"
            onClick={() => canvas.setTool('pen')}
            className={clsx('btn-arcade-secondary !p-2', canvas.tool === 'pen' && 'ring-2 ring-arcade-blue')}
            aria-label="Lápiz"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => canvas.setTool('eraser')}
            className={clsx('btn-arcade-secondary !p-2', canvas.tool === 'eraser' && 'ring-2 ring-arcade-blue')}
            aria-label="Borrador"
          >
            <Eraser size={14} />
          </button>
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => canvas.setColor(c)}
              className={clsx('w-6 h-6 pixel-border', canvas.color === c && 'ring-2 ring-white')}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => canvas.setSize(s)}
              className={clsx('btn-arcade-secondary !p-2 !text-[9px]', canvas.size === s && 'ring-2 ring-arcade-blue')}
            >
              {s}px
            </button>
          ))}
          <button type="button" onClick={canvas.undo} className="btn-arcade-secondary !p-2" aria-label="Deshacer">
            <Undo2 size={14} />
          </button>
          <button type="button" onClick={canvas.clear} className="btn-arcade-secondary !p-2" aria-label="Limpiar">
            <Trash2 size={14} />
          </button>
        </div>
      )}

      <canvas
        ref={canvas.canvasRef}
        width={800}
        height={500}
        className={clsx('w-full pixel-border bg-panel2 touch-none', isDrawer ? 'cursor-crosshair' : 'cursor-default')}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {!isDrawer && gameState.phase === 'ROUND_ACTIVE' && (
        <form onSubmit={submitGuess} className="flex gap-2 w-full max-w-md">
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Escribe tu respuesta…"
            className="flex-1 bg-panel2 pixel-border px-4 py-3 text-white outline-none"
          />
          <button type="submit" className="btn-arcade">
            Enviar
          </button>
        </form>
      )}

      {gameState.phase === 'ROUND_RESULT' && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-sm text-arcade-yellow">
          La palabra era: {data.wordReveal}
        </motion.p>
      )}

      {!isDrawer && data.guessesFeedback.length > 0 && (
        <div className="text-xs text-white/40 flex flex-col gap-1 items-center">
          {data.guessesFeedback.slice(-3).map((g, i) => (
            <span key={i} className={g.wrong ? '' : 'text-arcade-green'}>
              {g.wrong ? '❌' : '✅'} {room?.players.find((p) => p.id === g.playerId)?.name}: "{g.text}"
            </span>
          ))}
        </div>
      )}

      <p className="text-white/30 text-[10px]">
        {isDrawer ? `${guesser?.name ?? '...'} está adivinando` : `${drawer?.name ?? '...'} está dibujando`}
      </p>
    </div>
  );
}
