export interface SummaryPlayer {
  id: string;
  name: string;
  score: number;
}

export interface SummaryStat {
  icon: string;
  label: string;
  value: string;
}

export interface SummaryGame {
  icon: string;
  name: string;
}

export interface SummaryData {
  roomCode: string;
  players: SummaryPlayer[];
  winnerId: string | null;
  games: SummaryGame[];
  stats: SummaryStat[];
  date: Date;
}

const WIDTH = 900;
const HEIGHT = 1180;

async function ensureFont(): Promise<void> {
  try {
    await document.fonts.load('32px "Press Start 2P"');
    await document.fonts.ready;
  } catch {
    // font API not available / failed to load — canvas falls back to a generic font
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the retro summary card directly on canvas — no DOM screenshot library,
 * no server round-trip, and nothing gets persisted anywhere. */
export async function renderSummaryCard(data: SummaryData): Promise<HTMLCanvasElement> {
  await ensureFont();
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#12121e');
  bg.addColorStop(1, '#0a0a12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // outer pixel border
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, WIDTH - 56, HEIGHT - 56);

  let y = 110;
  ctx.textAlign = 'center';

  ctx.fillStyle = '#a855f7';
  ctx.font = '46px "Press Start 2P", monospace';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 24;
  ctx.fillText('RETRO PARTY', WIDTH / 2, y);
  ctx.shadowBlur = 0;

  y += 40;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '16px monospace';
  ctx.fillText(
    data.date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) + `  ·  SALA ${data.roomCode}`,
    WIDTH / 2,
    y,
  );

  // winner
  y += 90;
  const winner = data.players.find((p) => p.id === data.winnerId);
  if (winner) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = '22px "Press Start 2P", monospace';
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur = 18;
    ctx.fillText('🏆 ' + winner.name.toUpperCase(), WIDTH / 2, y);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = '#ffffffaa';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillText('¡EMPATE!', WIDTH / 2, y);
  }

  // scoreboard
  y += 90;
  const boxW = 320;
  const gap = 40;
  const startX = WIDTH / 2 - boxW - gap / 2;
  data.players.forEach((p, i) => {
    const x = startX + i * (boxW + gap);
    const isWinner = p.id === data.winnerId;
    ctx.fillStyle = isWinner ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.05)';
    roundRect(ctx, x, y, boxW, 130, 4);
    ctx.fill();
    ctx.strokeStyle = isWinner ? '#a855f7' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, boxW, 130, 4);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.fillText(p.name, x + boxW / 2, y + 40);

    ctx.fillStyle = '#ffd23f';
    ctx.font = '38px "Press Start 2P", monospace';
    ctx.fillText(String(p.score), x + boxW / 2, y + 95);
  });

  // games played
  y += 200;
  ctx.fillStyle = '#38bdf8';
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillText('JUEGOS JUGADOS', WIDTH / 2, y);
  y += 50;
  ctx.font = '34px sans-serif';
  const iconsRow = data.games.map((g) => g.icon).join('   ');
  ctx.fillStyle = '#ffffff';
  ctx.fillText(iconsRow || '—', WIDTH / 2, y);

  // stats
  y += 70;
  ctx.fillStyle = '#39ff88';
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillText('ESTADÍSTICAS', WIDTH / 2, y);
  y += 20;
  ctx.textAlign = 'left';
  const statColX = WIDTH / 2 - 260;
  data.stats.slice(0, 6).forEach((stat, i) => {
    const rowY = y + 44 + i * 42;
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${stat.icon}  ${stat.label}`, statColX, rowY);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd23f';
    ctx.font = '16px monospace';
    ctx.fillText(stat.value, statColX + 520, rowY);
    ctx.textAlign = 'left';
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '12px monospace';
  ctx.fillText('retro-party', WIDTH / 2, HEIGHT - 50);

  return canvas;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
