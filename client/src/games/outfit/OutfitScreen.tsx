import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { EVENTS, OutfitData } from '@retro-party/shared';
import { socket } from '@/services/socket';
import { useRoomStore } from '@/state/roomStore';
import { useSound } from '@/hooks/useSound';
import { compressImageFile } from '@/utils/imageCompress';
import { OutfitEditor } from './OutfitEditor';

export function OutfitScreen() {
  const gameState = useRoomStore((s) => s.gameState);
  const you = useRoomStore((s) => s.you);
  const room = useRoomStore((s) => s.room);
  const { play } = useSound();
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevRevealed = useRef(false);
  // The photo to edit only ever arrives via a private whisper (game:private),
  // but every subsequent game:state broadcast (e.g. the opponent finishing
  // their own edit) replaces the whole gameState wholesale and re-nulls it —
  // broadcasts never carry a real value for this field. Cache the first real
  // value we see so a later broadcast can't wipe out an edit in progress.
  const cachedPhotoToEdit = useRef<string | null>(null);

  const data = gameState?.data as OutfitData | undefined;
  const opponent = room?.players.find((p) => p.id !== you?.id);

  useEffect(() => {
    if (data?.phase === 'revealed' && !prevRevealed.current) {
      prevRevealed.current = true;
      play('correct');
    }
  }, [data?.phase, play]);

  useEffect(() => {
    if (data?.photoToEdit) cachedPhotoToEdit.current = data.photoToEdit;
  }, [data?.photoToEdit]);

  if (!gameState || !data || !you) return <p className="text-center text-white/40 text-sm py-12">Cargando…</p>;

  async function handlePickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCompressing(true);
    try {
      const { dataUrl } = await compressImageFile(file);
      setPreview(dataUrl);
    } catch {
      // corrupt/unsupported file — user can just try another one
    } finally {
      setCompressing(false);
    }
  }

  function sendPhoto(dataUrl: string) {
    socket.emit(EVENTS.PHOTO_SUBMIT, { dataUrl });
  }

  function confirmDone() {
    if (confirmed) return;
    setConfirmed(true);
    socket.emit(EVENTS.ANSWER_SUBMIT, { value: 'continue', at: Date.now() });
  }

  // --- Phase: uploading ---
  if (data.phase === 'uploading') {
    const youUploaded = data.uploadedBy.includes(you.id);
    if (youUploaded) {
      return (
        <div className="flex flex-col gap-4 items-center max-w-sm mx-auto py-12 text-center">
          <span className="text-6xl">📸</span>
          <p className="font-display text-sm text-arcade-green">FOTO ENVIADA</p>
          <p className="text-white/50 text-xs">
            Esperando a que {opponent?.name ?? 'tu compañero'} suba la suya…
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4 items-center max-w-sm mx-auto py-8">
        <p className="font-display text-xs text-arcade-blue text-center">
          📸 SUBÍ UNA FOTO TUYA — {opponent?.name?.toUpperCase() ?? 'TU COMPAÑERO'} LA VA A VESTIR
        </p>
        {preview ? (
          <>
            <img src={preview} alt="Vista previa" className="w-full max-w-xs pixel-border object-cover" />
            <div className="flex gap-2 w-full">
              <button type="button" onClick={() => setPreview(null)} className="btn-arcade-secondary flex-1">
                Cambiar
              </button>
              <button type="button" onClick={() => sendPhoto(preview)} className="btn-arcade flex-1">
                Usar esta foto
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={compressing}
            className="btn-arcade w-full flex items-center justify-center gap-2"
          >
            <Upload size={14} /> {compressing ? 'Procesando…' : 'Elegir foto'}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickFile} />
        <p className="text-white/30 text-[10px] text-center">
          La foto solo se comparte dentro de esta sala y se descarta al terminar la partida.
        </p>
      </div>
    );
  }

  // --- Phase: editing ---
  if (data.phase === 'editing') {
    const youEdited = data.editedBy.includes(you.id);
    if (youEdited) {
      return (
        <div className="flex flex-col gap-4 items-center max-w-sm mx-auto py-12 text-center">
          <span className="text-6xl">🎨</span>
          <p className="font-display text-sm text-arcade-green">TU OBRA ESTÁ LISTA</p>
          <p className="text-white/50 text-xs">
            Esperando a que {opponent?.name ?? 'tu compañero'} termine…
          </p>
        </div>
      );
    }
    const photoToEdit = data.photoToEdit ?? cachedPhotoToEdit.current;
    if (!photoToEdit) return <p className="text-center text-white/40 text-sm py-12">Cargando la foto a vestir…</p>;
    return <OutfitEditor photoDataUrl={photoToEdit} onSubmit={sendPhoto} />;
  }

  // --- Phase: revealed ---
  const incoming = data.results.find((r) => r.subjectId === you.id);
  const outgoing = data.results.find((r) => r.editorId === you.id);
  const opponentConfirmed = !!opponent && data.confirmedBy.includes(opponent.id);

  return (
    <div className="flex flex-col gap-6 items-center max-w-lg mx-auto">
      <p className="text-white/40 text-xs font-display">👗 ¡MIRÁ CÓMO TE VISTIERON!</p>

      {incoming?.imageDataUrl && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
          <img src={incoming.imageDataUrl} alt="Tu look" className="w-full pixel-border" />
          <p className="text-center text-xs text-white/50 mt-2">Look armado por {opponent?.name ?? '...'}</p>
        </motion.div>
      )}

      {outgoing?.imageDataUrl && (
        <details className="w-full max-w-sm">
          <summary className="cursor-pointer text-center text-white/40 text-[10px] font-display uppercase">
            Ver el look que armaste
          </summary>
          <img src={outgoing.imageDataUrl} alt="Tu creación" className="w-full pixel-border mt-3 opacity-90" />
        </details>
      )}

      {!confirmed ? (
        <button type="button" onClick={confirmDone} className="btn-arcade">
          ✨ Continuar
        </button>
      ) : (
        <p className="font-display text-[10px] text-arcade-blue animate-pulse">
          {opponentConfirmed ? 'GUARDANDO LOS LOOKS…' : `ESPERANDO A QUE ${(opponent?.name ?? '').toUpperCase()} TERMINE DE MIRAR…`}
        </p>
      )}
    </div>
  );
}
