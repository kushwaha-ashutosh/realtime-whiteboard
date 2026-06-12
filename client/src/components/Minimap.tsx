import type { WhiteboardShape, Viewport } from '../types';
import { useTheme } from '../ThemeContext';

interface Props {
  shapes: WhiteboardShape[];
  viewport: Viewport;
}

const MAP_W = 180;
const MAP_H = 120;
const PAD = 20;

function getWorldBounds(shapes: WhiteboardShape[]) {
  if (shapes.length === 0) return { minX: -400, minY: -300, maxX: 400, maxY: 300 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const s of shapes) {
    if (s.type === 'line' || s.type === 'arrow' || s.type === 'pen') {
      const pts = s.points ?? [];
      for (let i = 0; i < pts.length; i += 2) {
        minX = Math.min(minX, pts[i]);
        maxX = Math.max(maxX, pts[i]);
        minY = Math.min(minY, pts[i + 1]);
        maxY = Math.max(maxY, pts[i + 1]);
      }
    } else {
      const x = (s.width ?? 0) < 0 ? s.x + (s.width ?? 0) : s.x;
      const y = (s.height ?? 0) < 0 ? s.y + (s.height ?? 0) : s.y;
      const w = Math.abs(s.width ?? 0);
      const h = Math.abs(s.height ?? 0);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
  }

  return { minX: minX - PAD, minY: minY - PAD, maxX: maxX + PAD, maxY: maxY + PAD };
}

export default function Minimap({ shapes, viewport }: Props) {
  const t = useTheme();
  const bounds = getWorldBounds(shapes);
  const bW = bounds.maxX - bounds.minX;
  const bH = bounds.maxY - bounds.minY;

  const scaleM = Math.min(MAP_W / bW, MAP_H / bH);

  const toMap = (wx: number, wy: number) => ({
    x: (wx - bounds.minX) * scaleM,
    y: (wy - bounds.minY) * scaleM,
  });

  const vpMinX = -viewport.x / viewport.scale;
  const vpMinY = -viewport.y / viewport.scale;
  const vpW = window.innerWidth / viewport.scale;
  const vpH = window.innerHeight / viewport.scale;
  const vpTopLeft = toMap(vpMinX, vpMinY);
  const vpBotRight = toMap(vpMinX + vpW, vpMinY + vpH);

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 120,
      background: t.mode === 'dark' ? 'rgba(15,15,23,0.85)' : 'rgba(248,250,252,0.92)',
      border: `1px solid ${t.mode === 'dark' ? 'rgba(99,102,241,0.4)' : t.panelBorder}`,
      borderRadius: 10,
      width: MAP_W + 16,
      height: MAP_H + 16,
      padding: 8,
      backdropFilter: 'blur(4px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      <svg width={MAP_W} height={MAP_H} style={{ display: 'block', overflow: 'hidden' }}>
        {shapes.map(s => {
          if (s.type === 'line' || s.type === 'arrow' || s.type === 'pen') {
            const pts = s.points ?? [];
            const mapped: string[] = [];
            for (let i = 0; i < pts.length - 1; i += 2) {
              const p = toMap(pts[i], pts[i + 1]);
              mapped.push(`${p.x},${p.y}`);
            }
            return (
              <polyline key={s.id}
                points={mapped.join(' ')}
                fill="none"
                stroke={s.stroke}
                strokeWidth={Math.max(0.5, s.strokeWidth * scaleM)}
                opacity={0.7}
              />
            );
          }
          if (s.type === 'ellipse') {
            const cx = (s.width ?? 0) < 0 ? s.x + (s.width ?? 0) : s.x;
            const cy = (s.height ?? 0) < 0 ? s.y + (s.height ?? 0) : s.y;
            const p = toMap(cx + (s.width ?? 0) / 2, cy + (s.height ?? 0) / 2);
            return (
              <ellipse key={s.id}
                cx={p.x} cy={p.y}
                rx={Math.abs((s.width ?? 0) / 2) * scaleM}
                ry={Math.abs((s.height ?? 0) / 2) * scaleM}
                fill={s.fill} stroke={s.stroke}
                strokeWidth={0.5} opacity={0.7}
              />
            );
          }
          const rx = (s.width ?? 0) < 0 ? s.x + (s.width ?? 0) : s.x;
          const ry = (s.height ?? 0) < 0 ? s.y + (s.height ?? 0) : s.y;
          const p = toMap(rx, ry);
          const w = Math.abs(s.width ?? 0) * scaleM;
          const h = Math.abs(s.height ?? 0) * scaleM;
          return (
            <rect key={s.id}
              x={p.x} y={p.y} width={Math.max(1, w)} height={Math.max(1, h)}
              fill={s.fill} stroke={s.stroke} strokeWidth={0.5} opacity={0.7}
            />
          );
        })}

        <rect
          x={Math.max(0, vpTopLeft.x)}
          y={Math.max(0, vpTopLeft.y)}
          width={Math.min(MAP_W, vpBotRight.x) - Math.max(0, vpTopLeft.x)}
          height={Math.min(MAP_H, vpBotRight.y) - Math.max(0, vpTopLeft.y)}
          fill="rgba(99,102,241,0.12)"
          stroke="#6366f1"
          strokeWidth={1}
        />
      </svg>
      <div style={{
        position: 'absolute', top: 4, left: 8,
        color: t.textMuted, fontSize: 9,
        fontFamily: 'monospace', letterSpacing: 0.5, opacity: 0.7,
      }}>
        minimap
      </div>
    </div>
  );
}
