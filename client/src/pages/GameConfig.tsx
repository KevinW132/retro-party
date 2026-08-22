import { useEffect, useState } from 'react';
import { EVENTS } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/retro/GlowText';

const CATEGORIES = [
  { id: 'any', label: 'Cualquiera', icon: '🎲' },
  { id: 'peliculas', label: 'Películas', icon: '🎬' },
  { id: 'musica', label: 'Música', icon: '🎵' },
  { id: 'videojuegos', label: 'Videojuegos', icon: '🎮' },
  { id: 'deportes', label: 'Deportes', icon: '⚽' },
  { id: 'cultura', label: 'Cultura general', icon: '🌎' },
  { id: 'ciencia', label: 'Ciencia', icon: '🧪' },
  { id: 'tecnologia', label: 'Tecnología', icon: '💻' },
  { id: 'historia', label: 'Historia', icon: '📚' },
  { id: 'geografia', label: 'Geografía', icon: '🗺️' },
];

export function GameConfig() {
  const room = useRoomStore((s) => s.room);
  const you = useRoomStore((s) => s.you);
  const catalog = useRoomStore((s) => s.gameCatalog);
  const [totalRounds, setTotalRounds] = useState(8);
  const [roundSeconds, setRoundSeconds] = useState(15);
  const [category, setCategory] = useState('any');
  const [difficulty, setDifficulty] = useState('any');
  const [triviaCount, setTriviaCount] = useState(10);
  const [writeMinutes, setWriteMinutes] = useState(4);
  const [editMinutes, setEditMinutes] = useState(3);

  const gameId = room?.gameQueue[room.currentGameIndex + 1];

  useEffect(() => {
    setRoundSeconds(gameId === 'drawing' ? 45 : 15);
    setTotalRounds(8);
  }, [gameId]);

  if (!room || !gameId) return null;
  const meta = catalog.find((g) => g.id === gameId);
  if (!meta) return null;
  const isHost = !!you?.isHost;
  const host = room.players.find((p) => p.isHost);

  function start() {
    if (!isHost) return;
    let config: Record<string, unknown> = {};
    if (gameId === 'quickQuestions') config = { totalQuestions: totalRounds, timePerQuestionMs: roundSeconds * 1000 };
    else if (gameId === 'drawing') config = { totalRounds, drawMs: roundSeconds * 1000 };
    else if (gameId === 'riddles') config = { totalRounds, timePerRoundMs: roundSeconds * 1000 };
    else if (gameId === 'trivia') config = { category, difficulty, count: triviaCount, timePerQuestionMs: roundSeconds * 1000 };
    else if (gameId === 'letter') config = { writeMs: writeMinutes * 60 * 1000 };
    else if (gameId === 'outfit') config = { editMs: editMinutes * 60 * 1000 };
    socket.emit(EVENTS.GAME_START, config);
  }

  if (!isHost) {
    return (
      <div className="flex-1 flex flex-col items-center px-4 py-8 gap-6 max-w-md mx-auto w-full text-center">
        <GlowText as="h1" color="green" className="font-display text-lg text-center">
          {meta.icon} {meta.name}
        </GlowText>
        <p className="text-white/50 text-xs text-center">{meta.description}</p>
        <p className="font-display text-[10px] text-arcade-blue animate-pulse">
          ESPERANDO A QUE {(host?.name ?? 'EL ANFITRIÓN').toUpperCase()} CONFIGURE E INICIE LA PARTIDA…
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 gap-6 max-w-md mx-auto w-full">
      <GlowText as="h1" color="green" className="font-display text-lg text-center">
        {meta.icon} {meta.name}
      </GlowText>
      <p className="text-white/50 text-xs text-center">{meta.description}</p>

      {gameId === 'trivia' && (
        <div className="w-full flex flex-col gap-4">
          <div>
            <p className="font-display text-[9px] text-arcade-blue mb-2 uppercase">Categoría</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`text-xs px-3 py-2 pixel-border ${category === c.id ? 'bg-arcade-purple' : 'bg-panel2'}`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-display text-[9px] text-arcade-blue mb-2 uppercase">Dificultad</p>
            <div className="flex gap-2">
              {[
                { id: 'any', label: '🎲 Cualquiera' },
                { id: 'easy', label: '🟢 Fácil' },
                { id: 'medium', label: '🟡 Medio' },
                { id: 'hard', label: '🔴 Difícil' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`flex-1 text-xs px-2 py-2 pixel-border ${difficulty === d.id ? 'bg-arcade-purple' : 'bg-panel2'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-display text-[9px] text-arcade-blue mb-2 uppercase">Cantidad</p>
            <div className="flex gap-2">
              {[5, 10, 15].map((n) => (
                <button
                  key={n}
                  onClick={() => setTriviaCount(n)}
                  className={`flex-1 text-xs px-2 py-2 pixel-border ${triviaCount === n ? 'bg-arcade-purple' : 'bg-panel2'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameId === 'letter' && (
        <div className="w-full flex flex-col gap-4">
          <div>
            <p className="font-display text-[9px] text-arcade-blue mb-2 uppercase">Tiempo para escribir</p>
            <div className="flex gap-2">
              {[2, 4, 6].map((m) => (
                <button
                  key={m}
                  onClick={() => setWriteMinutes(m)}
                  className={`flex-1 text-xs px-2 py-2 pixel-border ${writeMinutes === m ? 'bg-arcade-purple' : 'bg-panel2'}`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameId === 'outfit' && (
        <div className="w-full flex flex-col gap-4">
          <div>
            <p className="font-display text-[9px] text-arcade-blue mb-2 uppercase">Tiempo para vestir</p>
            <div className="flex gap-2">
              {[2, 3, 5].map((m) => (
                <button
                  key={m}
                  onClick={() => setEditMinutes(m)}
                  className={`flex-1 text-xs px-2 py-2 pixel-border ${editMinutes === m ? 'bg-arcade-purple' : 'bg-panel2'}`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {(gameId === 'quickQuestions' || gameId === 'drawing' || gameId === 'riddles') && (
        <div className="w-full flex flex-col gap-4">
          <div>
            <p className="font-display text-[9px] text-arcade-blue mb-2 uppercase">Rondas</p>
            <div className="flex gap-2">
              {[5, 8, 12].map((n) => (
                <button
                  key={n}
                  onClick={() => setTotalRounds(n)}
                  className={`flex-1 text-xs px-2 py-2 pixel-border ${totalRounds === n ? 'bg-arcade-purple' : 'bg-panel2'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-display text-[9px] text-arcade-blue mb-2 uppercase">
              Tiempo por ronda: {roundSeconds}s
            </p>
            <input
              type="range"
              min={gameId === 'drawing' ? 30 : 10}
              max={gameId === 'drawing' ? 90 : 30}
              step={5}
              value={roundSeconds}
              onChange={(e) => setRoundSeconds(Number(e.target.value))}
              className="w-full accent-arcade-purple"
            />
          </div>
        </div>
      )}

      <Button className="w-full" onClick={start}>
        Iniciar Juego
      </Button>
    </div>
  );
}
