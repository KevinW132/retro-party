import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { Eraser, Pencil, Undo2, Trash2 } from 'lucide-react';
import type { PlacedSticker } from '@retro-party/shared';
import clsx from '@/utils/clsx';
import { loadImage } from '@/utils/imageCompress';
import { useLocalDrawing } from './useLocalDrawing';
import { StickerItem } from './StickerItem';

const WARDROBE = ['🎩', '👒', '🧢', '🎓', '👑', '🕶️', '👓', '🥽', '💄', '👄', '😎', '🧣', '👔', '👗', '🎀', '💍', '🌹', '⭐', '❤️', '🦄', '🐱', '🎃', '🌈', '⚡'];
const PALETTE = ['#111111', '#ffffff', '#ff3ea5', '#38bdf8', '#39ff88', '#ffd23f', '#a855f7', '#f97316'];
const SIZES = [3, 6, 12];
const OUTPUT_QUALITY = 0.85;
const BASE_FONT_FRAC = 0.15;

interface OutfitEditorProps {
  photoDataUrl: string;
  onSubmit: (finalDataUrl: string) => void;
}

export function OutfitEditor({ photoDataUrl, onSubmit }: OutfitEditorProps) {
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [mode, setMode] = useState<'stickers' | 'draw'>('stickers');
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const drawing = useLocalDrawing();

  useEffect(() => {
    let cancelled = false;
    loadImage(photoDataUrl).then((img) => {
      if (!cancelled) setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    });
    return () => {
      cancelled = true;
    };
  }, [photoDataUrl]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setStageWidth(box.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [natural]);

  function addSticker(emoji: string) {
    const id = crypto.randomUUID();
    setStickers((prev) => [...prev, { id, emoji, x: 0.5, y: 0.5, scale: 1, rotation: 0 }]);
    setSelectedId(id);
  }

  function updateSticker(id: string, patch: Partial<PlacedSticker>) {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function deleteSticker(id: string) {
    setStickers((prev) => prev.filter((s) => s.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }

  function handleDrawPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (mode !== 'draw') return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawing.startStroke(e.clientX, e.clientY);
  }
  function handleDrawPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (mode !== 'draw' || e.buttons !== 1) return;
    drawing.moveStroke(e.clientX, e.clientY);
  }
  function handleDrawPointerUp() {
    if (mode !== 'draw') return;
    drawing.endStroke();
  }

  async function handleFinish() {
    if (!natural || submitting) return;
    setSubmitting(true);
    try {
      const img = await loadImage(photoDataUrl);
      const canvas = document.createElement('canvas');
      canvas.width = natural.width;
      canvas.height = natural.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, natural.width, natural.height);
      if (drawing.canvasRef.current) ctx.drawImage(drawing.canvasRef.current, 0, 0, natural.width, natural.height);
      for (const s of stickers) {
        ctx.save();
        ctx.translate(s.x * natural.width, s.y * natural.height);
        ctx.rotate((s.rotation * Math.PI) / 180);
        ctx.font = `${natural.width * BASE_FONT_FRAC * s.scale}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.emoji, 0, 0);
        ctx.restore();
      }
      onSubmit(canvas.toDataURL('image/jpeg', OUTPUT_QUALITY));
    } finally {
      setSubmitting(false);
    }
  }

  if (!natural) return <p className="text-center text-white/40 text-sm py-12">Cargando foto…</p>;

  return (
    <div className="flex flex-col gap-4 items-center w-full max-w-lg mx-auto">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('stickers')}
          className={clsx('btn-arcade-secondary !py-2 !px-3 !text-[10px]', mode === 'stickers' && 'ring-2 ring-arcade-blue')}
        >
          🎽 Accesorios
        </button>
        <button
          type="button"
          onClick={() => setMode('draw')}
          className={clsx('btn-arcade-secondary !py-2 !px-3 !text-[10px]', mode === 'draw' && 'ring-2 ring-arcade-blue')}
        >
          ✏️ Dibujar
        </button>
      </div>

      <div
        ref={stageRef}
        onPointerDown={() => setSelectedId(null)}
        className="relative w-full pixel-border overflow-hidden bg-panel2 touch-none"
        style={{ aspectRatio: `${natural.width} / ${natural.height}` }}
      >
        <img src={photoDataUrl} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
        <canvas
          ref={drawing.canvasRef}
          width={natural.width}
          height={natural.height}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: mode === 'draw' ? 'auto' : 'none', cursor: mode === 'draw' ? 'crosshair' : 'default' }}
          onPointerDown={handleDrawPointerDown}
          onPointerMove={handleDrawPointerMove}
          onPointerUp={handleDrawPointerUp}
          onPointerLeave={handleDrawPointerUp}
        />
        {stickers.map((s) => (
          <StickerItem
            key={s.id}
            sticker={s}
            stageRef={stageRef}
            stageWidth={stageWidth}
            selected={selectedId === s.id}
            interactive={mode === 'stickers'}
            onSelect={setSelectedId}
            onChange={updateSticker}
            onDelete={deleteSticker}
          />
        ))}
      </div>

      {mode === 'stickers' && (
        <div className="flex flex-wrap gap-2 justify-center max-w-md">
          {WARDROBE.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addSticker(emoji)}
              className="text-2xl w-10 h-10 flex items-center justify-center pixel-border bg-panel2 hover:brightness-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {mode === 'draw' && (
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <button
            type="button"
            onClick={() => drawing.setTool('pen')}
            className={clsx('btn-arcade-secondary !p-2', drawing.tool === 'pen' && 'ring-2 ring-arcade-blue')}
            aria-label="Lápiz"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => drawing.setTool('eraser')}
            className={clsx('btn-arcade-secondary !p-2', drawing.tool === 'eraser' && 'ring-2 ring-arcade-blue')}
            aria-label="Borrador"
          >
            <Eraser size={14} />
          </button>
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => drawing.setColor(c)}
              className={clsx('w-6 h-6 pixel-border', drawing.color === c && 'ring-2 ring-white')}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
          {SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => drawing.setSize(sz)}
              className={clsx('btn-arcade-secondary !p-2 !text-[9px]', drawing.size === sz && 'ring-2 ring-arcade-blue')}
            >
              {sz}px
            </button>
          ))}
          <button type="button" onClick={drawing.undo} className="btn-arcade-secondary !p-2" aria-label="Deshacer">
            <Undo2 size={14} />
          </button>
          <button type="button" onClick={drawing.clear} className="btn-arcade-secondary !p-2" aria-label="Limpiar">
            <Trash2 size={14} />
          </button>
        </div>
      )}

      <button type="button" onClick={handleFinish} disabled={submitting} className="btn-arcade w-full max-w-xs">
        {submitting ? 'Enviando…' : '✅ Listo, enviar'}
      </button>
    </div>
  );
}

