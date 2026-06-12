import { useRef, useEffect } from 'react';
import type { GridType, Viewport } from '../types';
import { useTheme } from '../ThemeContext';

interface Props {
  viewport: Viewport;
  gridType: GridType;
}

const SPACING = 40; // world units between grid cells

export default function GridCanvas({ viewport, gridType }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (gridType === 'none') return;

    const { x: ox, y: oy, scale } = viewport;
    const step = SPACING * scale;

    const startX = ((ox % step) + step) % step;
    const startY = ((oy % step) + step) % step;

    ctx.save();

    if (gridType === 'lines') {
      ctx.strokeStyle = t.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = startX; x < W; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
      }
      for (let y = startY; y < H; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();
    } else {
      const dotR = Math.max(1, scale * 0.8);
      ctx.fillStyle = t.gridDot;
      for (let x = startX; x < W; x += step) {
        for (let y = startY; y < H; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }, [viewport, gridType, t]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    observer.observe(canvas);
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
