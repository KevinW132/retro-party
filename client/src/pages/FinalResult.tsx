import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, RotateCcw, DoorOpen, Home } from 'lucide-react';
import { EVENTS, GameId, GameResult, Player } from '@retro-party/shared';
import { socket, clearSession } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/retro/GlowText';
import { Confetti } from '@/components/retro/Confetti';
import { useSound } from '@/hooks/useSound';
import { downloadCanvas, renderSummaryCard, SummaryStat } from '@/utils/summaryImage';

const GAME_META: Record<GameId, { icon: string; name: string }> = {
  drawing: { icon: '🎨', name: 'Dibuja y Adivina' },
  quickQuestions: { icon: '⚡', name: 'Preguntas Rápidas' },
  movie: { icon: '🎬', name: 'Adivina la Película' },
  riddles: { icon: '🧩', name: 'Adivinanzas' },
  trivia: { icon: '🧠', name: 'Trivia' },
  music: { icon: '🎵', name: 'Adivina la Canción' },
  letter: { icon: '✉️', name: 'Carta Secreta' },
  outfit: { icon: '👗', name: 'Cambio de Look' },
};

function buildStats(history: GameResult[], players: Player[]): SummaryStat[] {
  const nameOf = (id: unknown) => players.find((p) => p.id === id)?.name ?? '—';
  const stats: SummaryStat[] = [];

  const qq = history.find((h) => h.gameId === 'quickQuestions');
  if (qq?.stats.fastestAnswerPlayerId) {
    stats.push({ icon: '⚡', label: 'Respuesta más rápida', value: `${nameOf(qq.stats.fastestAnswerPlayerId)}` });
  }

  const correctTally: Record<string, number> = {};
  for (const h of history) {
    const id = h.stats.mostCorrectPlayerId;
    const count = h.stats.mostCorrectCount;
    if (typeof id === 'string' && id && typeof count === 'number') {
      correctTally[id] = (correctTally[id] ?? 0) + count;
    }
  }
  const bestCorrect = Object.entries(correctTally).sort((a, b) => b[1] - a[1])[0];
  if (bestCorrect) stats.push({ icon: '🎯', label: 'Mayor cantidad de aciertos', value: `${nameOf(bestCorrect[0])} (${bestCorrect[1]})` });

  const drawing = history.find((h) => h.gameId === 'drawing');
  if (drawing?.stats.bestDrawerPlayerId) {
    stats.push({ icon: '🎨', label: 'Mejor dibujante', value: `${nameOf(drawing.stats.bestDrawerPlayerId)}` });
  }

  const trivia = history.find((h) => h.gameId === 'trivia');
  if (trivia?.stats.mostCorrectPlayerId) {
    stats.push({ icon: '🧠', label: 'Mejor en trivia', value: `${nameOf(trivia.stats.mostCorrectPlayerId)}` });
  }

  if (history.some((h) => h.gameId === 'letter')) {
    stats.push({ icon: '✉️', label: 'Cartas intercambiadas', value: 'Sí' });
  }

  if (history.some((h) => h.gameId === 'outfit')) {
    stats.push({ icon: '👗', label: 'Looks armados', value: 'Sí' });
  }

  stats.push({ icon: '🎮', label: 'Juegos jugados', value: String(history.length) });
  return stats;
}

export function FinalResult({ onNewRoom, onFinish }: { onNewRoom: () => void; onFinish: () => void }) {
  const room = useRoomStore((s) => s.room);
  const you = useRoomStore((s) => s.you);
  const finalResult = useRoomStore((s) => s.finalResult);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [generating, setGenerating] = useState(false);
  const { play } = useSound();

  const winner = room?.players.find((p) => p.id === finalResult?.winnerId);
  const youWon = winner && you && winner.id === you.id;

  useEffect(() => {
    play(finalResult?.winnerId ? (youWon ? 'victory' : 'defeat') : 'click');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!room || !finalResult) return null;

  async function handleDownload() {
    if (!room || !finalResult) return;
    setGenerating(true);
    try {
      const canvas = await renderSummaryCard({
        roomCode: room.code,
        players: room.players.map((p) => ({ id: p.id, name: p.name, score: finalResult.scores[p.id] ?? 0 })),
        winnerId: finalResult.winnerId,
        games: finalResult.history.map((h) => GAME_META[h.gameId]),
        stats: buildStats(finalResult.history, room.players),
        date: new Date(),
      });
      canvasRef.current = canvas;
      downloadCanvas(canvas, `retro-party-${room.code}.png`);
    } finally {
      setGenerating(false);
    }
  }

  function replay() {
    socket.emit(EVENTS.ROOM_REPLAY);
  }

  function newRoom() {
    socket.emit(EVENTS.ROOM_LEAVE);
    clearSession();
    useRoomStore.getState().reset();
    onNewRoom();
  }

  function finish() {
    socket.emit(EVENTS.ROOM_LEAVE);
    clearSession();
    useRoomStore.getState().reset();
    onFinish();
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-6 text-center max-w-lg mx-auto w-full">
      {finalResult.winnerId && <Confetti />}

      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
        <p className="text-5xl mb-2">🏆</p>
        <GlowText as="h1" color={youWon ? 'green' : 'yellow'} className="font-display text-2xl sm:text-4xl">
          VICTORY
        </GlowText>
        <p className="font-display text-lg sm:text-xl text-arcade-yellow mt-3">
          {winner ? winner.name.toUpperCase() : 'EMPATE'}
        </p>
      </motion.div>

      <div className="flex items-center gap-4 font-display text-2xl">
        {room.players.map((p, i) => (
          <span key={p.id}>
            {finalResult.scores[p.id] ?? 0}
            {i === 0 && <span className="text-white/30 text-sm mx-2">VS</span>}
          </span>
        ))}
      </div>

      {youWon !== undefined && (
        <p className="text-arcade-green text-xs font-display">{youWon ? 'YOU ARE THE CHAMPION!' : '¡Buena partida!'}</p>
      )}

      <Button onClick={handleDownload} disabled={generating} icon={<Download size={14} />} className="w-full max-w-xs">
        {generating ? 'Generando…' : 'Descargar Resultado'}
      </Button>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        {you?.isHost ? (
          <Button variant="secondary" className="flex-1" icon={<RotateCcw size={14} />} onClick={replay}>
            Jugar de Nuevo
          </Button>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[10px] font-display text-arcade-blue">
            Solo el anfitrión puede reiniciar
          </div>
        )}
        <Button variant="secondary" className="flex-1" icon={<DoorOpen size={14} />} onClick={newRoom}>
          Nueva Sala
        </Button>
        <Button variant="danger" className="flex-1" icon={<Home size={14} />} onClick={finish}>
          Finalizar
        </Button>
      </div>
    </div>
  );
}
