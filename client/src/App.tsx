import { useEffect, useState } from 'react';
import { EVENTS } from '@retro-party/shared';
import { socket, loadSession, clearSession } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { useSocketListeners } from '@/hooks/useSocketListeners';
import { RetroShell } from '@/components/retro/RetroShell';
import { DisconnectBanner } from '@/components/ui/DisconnectBanner';
import { ChatDrawer } from '@/components/chat/ChatDrawer';
import { Landing } from '@/pages/Landing';
import { CreateRoom } from '@/pages/CreateRoom';
import { JoinRoom } from '@/pages/JoinRoom';
import { Lobby } from '@/pages/Lobby';
import { GameSelection } from '@/pages/GameSelection';
import { GameConfig } from '@/pages/GameConfig';
import { GameActive } from '@/pages/GameActive';
import { GameResult } from '@/pages/GameResult';
import { FinalResult } from '@/pages/FinalResult';

type PreRoomScreen = 'home' | 'create' | 'join';

export default function App() {
  useSocketListeners();
  const room = useRoomStore((s) => s.room);
  const [preRoomScreen, setPreRoomScreen] = useState<PreRoomScreen>('home');
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    setReconnecting(true);
    const attempt = () => {
      socket.emit(EVENTS.ROOM_JOIN, { code: session.roomCode, playerName: '', playerId: session.playerId });
    };
    if (socket.connected) attempt();
    else socket.once('connect', attempt);

    // These only resolve the initial reconnect attempt — detach immediately
    // after the first result so a later, unrelated error (e.g. rate limiting
    // during normal play) can't wipe a valid stored session.
    const onRoomState = () => {
      setReconnecting(false);
      socket.off(EVENTS.ROOM_STATE, onRoomState);
      socket.off(EVENTS.ERROR, onError);
    };
    const onError = () => {
      setReconnecting(false);
      clearSession();
      socket.off(EVENTS.ROOM_STATE, onRoomState);
      socket.off(EVENTS.ERROR, onError);
    };
    socket.on(EVENTS.ROOM_STATE, onRoomState);
    socket.on(EVENTS.ERROR, onError);
    return () => {
      socket.off(EVENTS.ROOM_STATE, onRoomState);
      socket.off(EVENTS.ERROR, onError);
    };
  }, []);

  if (reconnecting && !room) {
    return (
      <RetroShell>
        <div className="flex-1 flex items-center justify-center">
          <p className="font-display text-xs text-arcade-blue animate-pulse">RECONECTANDO…</p>
        </div>
      </RetroShell>
    );
  }

  return (
    <RetroShell>
      <DisconnectBanner />
      {renderScreen()}
      {room && <ChatDrawer />}
    </RetroShell>
  );

  function renderScreen() {
    if (!room) {
      if (preRoomScreen === 'create') return <CreateRoom onBack={() => setPreRoomScreen('home')} />;
      if (preRoomScreen === 'join') return <JoinRoom onBack={() => setPreRoomScreen('home')} />;
      return <Landing onCreate={() => setPreRoomScreen('create')} onJoin={() => setPreRoomScreen('join')} />;
    }

    switch (room.status) {
      case 'LOBBY':
        return <Lobby />;
      case 'GAME_SELECTION':
        return <GameSelection />;
      case 'GAME_CONFIG':
        return <GameConfig />;
      case 'IN_GAME':
      case 'ROUND_END':
        return <GameActive />;
      case 'GAME_RESULT':
        return <GameResult />;
      case 'FINAL_RESULT':
        return <FinalResult onNewRoom={() => setPreRoomScreen('create')} onFinish={() => setPreRoomScreen('home')} />;
      default:
        return null;
    }
  }
}
