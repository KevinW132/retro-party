import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { CHAT_MAX_LENGTH, EVENTS } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';

export function ChatPanel({ compact = false }: { compact?: boolean }) {
  const messages = useRoomStore((s) => s.chatMessages);
  const you = useRoomStore((s) => s.you);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    socket.emit(EVENTS.CHAT_SEND, { text: trimmed });
    setText('');
  }

  return (
    <div className="arcade-panel flex flex-col h-full">
      <div className="px-3 py-2 border-b border-white/10 font-display text-[10px] text-arcade-blue flex items-center gap-2">
        💬 CHAT
      </div>
      <div ref={listRef} className={compact ? 'flex-1 min-h-[120px] max-h-[220px] overflow-y-auto px-3 py-2 space-y-2' : 'flex-1 overflow-y-auto px-3 py-2 space-y-2'}>
        {messages.length === 0 && <p className="text-white/30 text-xs italic">Sin mensajes todavía…</p>}
        {messages.map((m) => (
          <div key={m.id} className="text-xs leading-snug">
            <span className={m.playerId === you?.id ? 'text-arcade-green font-semibold' : 'text-arcade-pink font-semibold'}>
              {m.playerName}:
            </span>{' '}
            <span className="text-white/90 break-words">{m.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 p-2 border-t border-white/10">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, CHAT_MAX_LENGTH))}
          placeholder="Escribe un mensaje…"
          maxLength={CHAT_MAX_LENGTH}
          aria-label="Mensaje de chat"
          className="flex-1 bg-panel2 pixel-border px-3 py-2 text-sm text-white placeholder-white/30 outline-none min-h-[40px]"
        />
        <button
          type="submit"
          aria-label="Enviar mensaje"
          className="btn-arcade-secondary !px-3 !py-2 !min-h-[40px]"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
