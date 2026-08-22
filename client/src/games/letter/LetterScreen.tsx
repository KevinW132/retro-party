import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { EVENTS, LetterData } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { useSound } from '@/hooks/useSound';

const MAX_LEN = 3000;

export function LetterScreen() {
  const gameState = useRoomStore((s) => s.gameState);
  const you = useRoomStore((s) => s.you);
  const room = useRoomStore((s) => s.room);
  const { play } = useSound();
  const [draft, setDraft] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const prevRevealed = useRef(false);

  const data = gameState?.data as LetterData | undefined;
  const opponent = room?.players.find((p) => p.id !== you?.id);

  useEffect(() => {
    if (data?.revealed && !prevRevealed.current) {
      prevRevealed.current = true;
      play('correct');
    }
  }, [data?.revealed, play]);

  if (!gameState || !data || !you) return <p className="text-center text-white/40 text-sm py-12">Cargando…</p>;

  const youWrote = data.writtenBy.includes(you.id);
  const opponentWrote = !!opponent && data.writtenBy.includes(opponent.id);

  function send(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || youWrote) return;
    socket.emit(EVENTS.ANSWER_SUBMIT, { value: draft, at: Date.now() });
  }

  function confirmRead() {
    if (confirmed) return;
    setConfirmed(true);
    socket.emit(EVENTS.ANSWER_SUBMIT, { value: 'continue', at: Date.now() });
  }

  if (data.revealed) {
    const incoming = data.letters.find((l) => l.playerId === opponent?.id);
    const outgoing = data.letters.find((l) => l.playerId === you.id);
    const opponentConfirmed = !!opponent && data.confirmedBy.includes(opponent.id);

    return (
      <div className="flex flex-col gap-6 items-center max-w-xl mx-auto">
        <p className="text-white/40 text-xs font-display">✉️ LAS CARTAS LLEGARON</p>

        {incoming && (
          <motion.div
            initial={{ opacity: 0, y: 16, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: -1 }}
            className="paper-sheet font-letter w-full px-6 py-8 sm:px-10 sm:py-10 text-base sm:text-lg leading-relaxed whitespace-pre-wrap"
          >
            <p className="font-handwriting text-2xl sm:text-3xl mb-4">Querido/a {you.name}:</p>
            {incoming.text || <span className="italic opacity-60">(esta carta llegó en blanco…)</span>}
            <p className="font-handwriting text-2xl sm:text-3xl mt-6 text-right">— {incoming.playerName}</p>
          </motion.div>
        )}

        {outgoing && (
          <details className="w-full">
            <summary className="cursor-pointer text-center text-white/40 text-[10px] font-display uppercase">
              Ver la carta que enviaste
            </summary>
            <div className="paper-sheet font-letter mt-3 w-full px-6 py-6 text-sm leading-relaxed whitespace-pre-wrap opacity-90">
              <p className="font-handwriting text-xl mb-2">Querido/a {opponent?.name}:</p>
              {outgoing.text || <span className="italic opacity-60">(no llegaste a escribir a tiempo)</span>}
            </div>
          </details>
        )}

        {!confirmed ? (
          <button onClick={confirmRead} className="btn-arcade">
            💌 Continuar
          </button>
        ) : (
          <p className="font-display text-[10px] text-arcade-blue animate-pulse">
            {opponentConfirmed ? 'CERRANDO EL SOBRE…' : `ESPERANDO A QUE ${(opponent?.name ?? '').toUpperCase()} TERMINE DE LEER…`}
          </p>
        )}
      </div>
    );
  }

  if (youWrote) {
    return (
      <div className="flex flex-col gap-6 items-center max-w-xl mx-auto py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl"
        >
          💌
        </motion.div>
        <p className="font-display text-sm text-arcade-green text-center">TU CARTA YA VOLÓ</p>
        <p className="text-white/50 text-xs text-center max-w-sm">
          {opponentWrote
            ? `${opponent?.name ?? 'Tu compañero'} también terminó — abriendo el sobre…`
            : `Esperando a que ${opponent?.name ?? 'tu compañero'} termine de escribir la suya…`}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-4 items-center max-w-xl mx-auto w-full">
      <p className="text-white/40 text-xs font-display text-center">
        ESCRIBILE UNA CARTA A {(opponent?.name ?? 'TU COMPAÑERO').toUpperCase()}
      </p>
      <div className="paper-sheet font-letter w-full px-6 py-6 sm:px-8 sm:py-8 flex flex-col gap-3">
        <p className="font-handwriting text-2xl sm:text-3xl">Querido/a {opponent?.name ?? '...'}:</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          placeholder="Escribí lo que quieras decirle…"
          rows={10}
          className="bg-transparent outline-none resize-none text-base sm:text-lg leading-relaxed placeholder:text-[#2b2013]/40"
          autoFocus
        />
        <p className="font-handwriting text-2xl sm:text-3xl text-right">— {you.name}</p>
      </div>
      <div className="flex items-center justify-between w-full text-white/30 text-[10px] font-display">
        <span>
          {draft.length} / {MAX_LEN}
        </span>
      </div>
      <button type="submit" disabled={!draft.trim()} className="btn-arcade">
        💌 Enviar carta
      </button>
    </form>
  );
}
