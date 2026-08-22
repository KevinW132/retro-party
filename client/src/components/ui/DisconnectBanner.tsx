import { motion } from 'framer-motion';
import { useRoomStore } from '@/state/roomStore';

export function DisconnectBanner() {
  const peerDisconnect = useRoomStore((s) => s.peerDisconnect);
  if (!peerDisconnect) return null;

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full bg-arcade-pink/20 border-b-2 border-arcade-pink text-center py-2 px-4"
      role="alert"
    >
      <p className="font-display text-[10px] sm:text-xs text-arcade-pink">
        ⚠️ {peerDisconnect.playerName.toUpperCase()} SE HA DESCONECTADO — esperando reconexión…
      </p>
    </motion.div>
  );
}
