import { useCallback, useEffect, useRef, useState } from 'react';
import { EVENTS } from '@retro-party/shared';
import type { DrawingStrokeEvent, DrawingStrokePoint, DrawingTool } from '@retro-party/shared';
import { socket } from '@/services/socket';

interface Stroke {
  id: string;
  tool: DrawingTool;
  color: string;
  size: number;
  points: DrawingStrokePoint[];
}

const FLUSH_INTERVAL_MS = 45;

export function useDrawingCanvas(isDrawer: boolean) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const pendingPointsRef = useRef<DrawingStrokePoint[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [tool, setTool] = useState<DrawingTool>('pen');
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState(4);

  const getCtx = useCallback(() => canvasRef.current?.getContext('2d') ?? null, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#181826';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) drawStroke(ctx, stroke, canvas.width, canvas.height);
  }, [getCtx]);

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, w: number, h: number) {
    if (stroke.points.length === 0) return;
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    stroke.points.forEach((p, i) => {
      const x = p.x * w;
      const y = p.y * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawSegment(stroke: Stroke, newPoints: DrawingStrokePoint[]) {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx || newPoints.length === 0) return;
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const allPoints = [...stroke.points.slice(-1), ...newPoints];
    ctx.beginPath();
    allPoints.forEach((p, i) => {
      const x = p.x * canvas.width;
      const y = p.y * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  const flush = useCallback(() => {
    const stroke = currentStrokeRef.current;
    if (!stroke || pendingPointsRef.current.length === 0) return;
    const points = pendingPointsRef.current;
    pendingPointsRef.current = [];
    socket.emit(EVENTS.DRAWING_STROKE, {
      strokeId: stroke.id,
      tool: stroke.tool,
      color: stroke.color,
      size: stroke.size,
      points,
    } as DrawingStrokeEvent);
  }, []);

  const toRelative = useCallback((clientX: number, clientY: number): DrawingStrokePoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
  }, []);

  const startStroke = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawer) return;
      const point = toRelative(clientX, clientY);
      if (!point) return;
      const stroke: Stroke = { id: crypto.randomUUID(), tool, color: tool === 'eraser' ? '#181826' : color, size, points: [point] };
      currentStrokeRef.current = stroke;
      strokesRef.current = [...strokesRef.current, stroke];
      pendingPointsRef.current = [point];
      const ctx = getCtx();
      if (ctx) drawSegment(stroke, []);
    },
    [isDrawer, tool, color, size, toRelative, getCtx],
  );

  const moveStroke = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDrawer || !currentStrokeRef.current) return;
      const point = toRelative(clientX, clientY);
      if (!point) return;
      const stroke = currentStrokeRef.current;
      drawSegment(stroke, [point]);
      stroke.points.push(point);
      pendingPointsRef.current.push(point);
    },
    [isDrawer, toRelative],
  );

  const endStroke = useCallback(() => {
    if (!isDrawer) return;
    flush();
    currentStrokeRef.current = null;
  }, [isDrawer, flush]);

  useEffect(() => {
    if (!isDrawer) return;
    flushTimerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, [isDrawer, flush]);

  const undo = useCallback(() => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    redrawAll();
    if (isDrawer) socket.emit(EVENTS.DRAWING_UNDO, {});
  }, [isDrawer, redrawAll]);

  const clear = useCallback(() => {
    strokesRef.current = [];
    redrawAll();
    if (isDrawer) socket.emit(EVENTS.DRAWING_CLEAR, {});
  }, [isDrawer, redrawAll]);

  const resetCanvas = useCallback(() => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    pendingPointsRef.current = [];
    redrawAll();
  }, [redrawAll]);

  // Remote relay listeners (only meaningful for the guesser, whose browser
  // never fires local pointer events for this stroke).
  useEffect(() => {
    const onStroke = (payload: DrawingStrokeEvent) => {
      let stroke = strokesRef.current.find((s) => s.id === payload.strokeId);
      if (!stroke) {
        stroke = { id: payload.strokeId, tool: payload.tool, color: payload.color, size: payload.size, points: [] };
        strokesRef.current = [...strokesRef.current, stroke];
      }
      drawSegment(stroke, payload.points);
      stroke.points.push(...payload.points);
    };
    const onUndo = () => {
      strokesRef.current = strokesRef.current.slice(0, -1);
      redrawAll();
    };
    const onClear = () => {
      strokesRef.current = [];
      redrawAll();
    };
    socket.on(EVENTS.DRAWING_STROKE, onStroke);
    socket.on(EVENTS.DRAWING_UNDO, onUndo);
    socket.on(EVENTS.DRAWING_CLEAR, onClear);
    return () => {
      socket.off(EVENTS.DRAWING_STROKE, onStroke);
      socket.off(EVENTS.DRAWING_UNDO, onUndo);
      socket.off(EVENTS.DRAWING_CLEAR, onClear);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redrawAll]);

  return {
    canvasRef,
    tool,
    setTool,
    color,
    setColor,
    size,
    setSize,
    startStroke,
    moveStroke,
    endStroke,
    undo,
    clear,
    resetCanvas,
    redrawAll,
  };
}
