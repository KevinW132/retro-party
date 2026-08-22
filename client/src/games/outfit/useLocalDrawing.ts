import { useCallback, useRef, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  tool: 'pen' | 'eraser';
  color: string;
  size: number;
  points: Point[];
}

/** Freehand drawing confined to a single local canvas — no socket relay,
 * unlike the live-synced canvas in Dibuja y Adivina. Editing the outfit
 * photo is a private, secret step, so nothing needs to leave this client
 * until the final composited image is submitted. */
export function useLocalDrawing() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);

  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#111111');
  const [size, setSize] = useState(6);

  const getCtx = useCallback(() => canvasRef.current?.getContext('2d') ?? null, []);

  const toCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const strokePath = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke, points: Point[]) => {
    if (points.length === 0) return;
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) strokePath(ctx, stroke, stroke.points);
  }, [getCtx, strokePath]);

  const startStroke = useCallback(
    (clientX: number, clientY: number) => {
      const point = toCanvasPoint(clientX, clientY);
      if (!point) return;
      const stroke: Stroke = { tool, color: tool === 'eraser' ? '#000000' : color, size, points: [point] };
      currentRef.current = stroke;
      strokesRef.current = [...strokesRef.current, stroke];
    },
    [tool, color, size, toCanvasPoint],
  );

  const moveStroke = useCallback(
    (clientX: number, clientY: number) => {
      const stroke = currentRef.current;
      if (!stroke) return;
      const point = toCanvasPoint(clientX, clientY);
      if (!point) return;
      const ctx = getCtx();
      if (ctx) strokePath(ctx, stroke, [stroke.points[stroke.points.length - 1], point]);
      stroke.points.push(point);
    },
    [toCanvasPoint, getCtx, strokePath],
  );

  const endStroke = useCallback(() => {
    currentRef.current = null;
  }, []);

  const undo = useCallback(() => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    redrawAll();
  }, [redrawAll]);

  const clear = useCallback(() => {
    strokesRef.current = [];
    redrawAll();
  }, [redrawAll]);

  return { canvasRef, tool, setTool, color, setColor, size, setSize, startStroke, moveStroke, endStroke, undo, clear };
}
