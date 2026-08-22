import { useRoomStore } from '@/state/roomStore';
import { ScoreBoard } from '@/components/ui/ScoreBoard';
import { GameTimer } from '@/components/ui/GameTimer';
import { gameScreens } from '@/games/registry';

export function GameActive() {
  const room = useRoomStore((s) => s.room);
  const you = useRoomStore((s) => s.you);
  const gameState = useRoomStore((s) => s.gameState);

  if (!room || !gameState) {
    return <p className="flex-1 flex items-center justify-center text-white/40 text-sm">Cargando partida…</p>;
  }

  const Screen = gameScreens[gameState.gameId];

  return (
    <div className="flex-1 flex flex-col gap-6 px-4 py-6 max-w-4xl mx-auto w-full">
      <ScoreBoard players={room.players} scores={gameState.scores} youId={you?.id} />
      {gameState.timer && (
        <div className="flex justify-center">
          <GameTimer timer={gameState.timer} />
        </div>
      )}
      {gameState.totalRounds > 0 && (
        <p className="text-center text-white/30 text-[10px] font-display">
          RONDA {gameState.round} / {gameState.totalRounds}
        </p>
      )}
      <div className="flex-1">
        <Screen />
      </div>
    </div>
  );
}
