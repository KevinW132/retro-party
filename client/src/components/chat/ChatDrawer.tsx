import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useRoomStore } from '@/state/roomStore';
import { ChatPanel } from './ChatPanel';

/** Floating toggle + slide-over drawer so chat never eats space from the game
 * itself. The Lobby additionally shows an inline <ChatPanel /> on large
 * screens, but this drawer is the only chat access during active gameplay,
 * on every screen size. */
export function ChatDrawer() {
  const [open, setOpen] = useState(false);
  const unread = useRoomStore((s) => s.unreadChat);
  const markRead = useRoomStore((s) => s.markChatRead);

  return (
    <div>
      <button
        onClick={() => {
          setOpen(true);
          markRead();
        }}
        aria-label="Abrir chat"
        className="fixed bottom-4 right-4 z-40 btn-arcade-secondary !rounded-full !p-3 shadow-glow"
      >
        <MessageCircle size={20} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-arcade-pink text-[9px] font-display rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full h-[70vh]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-full">
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar chat"
                  className="absolute -top-3 right-3 z-10 bg-panel2 pixel-border p-2"
                >
                  <X size={16} />
                </button>
                <ChatPanel />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
