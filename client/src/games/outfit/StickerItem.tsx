import { PointerEvent, RefObject, useRef } from 'react';
import type { PlacedSticker } from '@retro-party/shared';

const BASE_FONT_FRAC = 0.15; // font-size as a fraction of the stage width, at scale=1

interface StickerItemProps {
  sticker: PlacedSticker;
  stageRef: RefObject<HTMLDivElement>;
  stageWidth: number;
  selected: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<PlacedSticker>) => void;
  onDelete: (id: string) => void;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function StickerItem({ sticker, stageRef, stageWidth, selected, interactive, onSelect, onChange, onDelete }: StickerItemProps) {
  const dragging = useRef(false);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    e.stopPropagation();
    onSelect(sticker.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = true;
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!interactive || !dragging.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    onChange(sticker.id, {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    });
  }

  function endDrag() {
    dragging.current = false;
  }

  const fontSize = Math.max(12, stageWidth * BASE_FONT_FRAC * sticker.scale);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="absolute select-none touch-none"
      style={{
        left: `${sticker.x * 100}%`,
        top: `${sticker.y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
        fontSize: `${fontSize}px`,
        lineHeight: 1,
        cursor: interactive ? 'grab' : 'default',
        touchAction: 'none',
      }}
    >
      <span style={{ display: 'inline-block' }}>{sticker.emoji}</span>
      {selected && interactive && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 flex gap-1 bg-black/80 rounded px-1.5 py-1 whitespace-nowrap pixel-border"
          style={{ top: '-2.4em', transform: 'translateX(-50%)', fontSize: '11px' }}
        >
          <button type="button" className="px-1 text-white" onClick={() => onChange(sticker.id, { rotation: sticker.rotation - 15 })}>
            ↺
          </button>
          <button
            type="button"
            className="px-1 text-white"
            onClick={() => onChange(sticker.id, { scale: Math.max(0.4, sticker.scale - 0.15) })}
          >
            −
          </button>
          <button
            type="button"
            className="px-1 text-white"
            onClick={() => onChange(sticker.id, { scale: Math.min(3, sticker.scale + 0.15) })}
          >
            +
          </button>
          <button type="button" className="px-1 text-white" onClick={() => onChange(sticker.id, { rotation: sticker.rotation + 15 })}>
            ↻
          </button>
          <button type="button" className="px-1 text-arcade-pink" onClick={() => onDelete(sticker.id)}>
            🗑
          </button>
        </div>
      )}
    </div>
  );
}
