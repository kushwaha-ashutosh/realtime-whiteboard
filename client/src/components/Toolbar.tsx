import { useState, useRef, useEffect } from 'react';
import type { ShapeType, GridType } from '../types';
import { useTheme } from '../ThemeContext';
import type { ThemeMode } from '../theme';

interface Props {
  tool: ShapeType | 'select';
  color: string;
  gridType: GridType;
  zoomPct: number;
  themeMode: ThemeMode;
  onToolChange: (t: ShapeType | 'select') => void;
  onColorChange: (c: string) => void;
  onGridChange: (g: GridType) => void;
  onZoomTo: (scale: number) => void;
  onThemeToggle: () => void;
  onClear: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSavePng: () => void;
  onResetView: () => void;
}

const TOOLS: Array<{ id: ShapeType | 'select'; label: string; title: string }> = [
  { id: 'select',  label: '↖',  title: 'Select / Multi-select (drag to lasso)' },
  { id: 'rect',    label: '▭',  title: 'Rectangle' },
  { id: 'ellipse', label: '◯',  title: 'Ellipse' },
  { id: 'line',    label: '╱',  title: 'Line' },
  { id: 'pen',     label: '✏',  title: 'Pen (freehand)' },
  { id: 'arrow',   label: '→',  title: 'Arrow' },
  { id: 'text',    label: 'T',  title: 'Text' },
  { id: 'sticky',  label: '🗒', title: 'Sticky note' },
];

const COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899',
  '#fde68a','#bbf7d0','#bfdbfe','#000000','#ffffff',
];

const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300];
const GRID_CYCLE: GridType[] = ['none', 'dots', 'lines'];
const GRID_ICONS: Record<GridType, string> = { none: '⬜', dots: '⁚', lines: '⊞' };
const GRID_TITLES: Record<GridType, string> = {
  none: 'Grid: off', dots: 'Grid: dots', lines: 'Grid: lines',
};

function ZoomPicker({ zoomPct, onZoomTo }: { zoomPct: number; onZoomTo: (s: number) => void }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Zoom presets"
        style={{
          padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: open ? t.btnActive : t.btnDefault,
          color: open ? '#fff' : t.textMuted,
          fontSize: 13, fontFamily: 'monospace', fontWeight: 600,
          minWidth: 56, textAlign: 'center',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        {zoomPct}%
        <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)',
          background: t.panelBg, border: `1px solid ${t.panelBorder}`,
          borderRadius: 8, padding: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 500, minWidth: 88,
        }}>
          {ZOOM_PRESETS.map(pct => (
            <button
              key={pct}
              onClick={() => { onZoomTo(pct / 100); setOpen(false); }}
              style={{
                display: 'block', width: '100%',
                padding: '6px 14px', border: 'none', borderRadius: 5,
                background: zoomPct === pct ? t.btnActive : 'transparent',
                color: zoomPct === pct ? '#fff' : t.text,
                fontSize: 13, fontFamily: 'monospace',
                cursor: 'pointer', textAlign: 'right',
                fontWeight: zoomPct === pct ? 700 : 400,
              }}
              onMouseEnter={e => {
                if (zoomPct !== pct) (e.target as HTMLButtonElement).style.background = t.btnDefault;
              }}
              onMouseLeave={e => {
                if (zoomPct !== pct) (e.target as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              {pct}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Toolbar({
  tool, color, gridType, zoomPct, themeMode,
  onToolChange, onColorChange, onGridChange, onZoomTo, onThemeToggle,
  onClear, onDeleteSelected, onUndo, onRedo, onSavePng, onResetView,
}: Props) {
  const t = useTheme();

  const btn = (bg: string, color_ = '#fff'): React.CSSProperties => ({
    padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: bg, color: color_, fontSize: 16, fontWeight: 600,
    fontFamily: 'sans-serif', lineHeight: 1,
  });

  const cycleGrid = () => {
    const idx = GRID_CYCLE.indexOf(gridType);
    onGridChange(GRID_CYCLE[(idx + 1) % GRID_CYCLE.length]);
  };

  return (
    <>
      {/* ── Top centre: tools + colours + actions ── */}
      <div style={{
        position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6, alignItems: 'center',
        background: t.panelBg, borderRadius: 12, padding: '8px 12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        border: `1px solid ${t.panelBorder}`,
        zIndex: 100, flexWrap: 'nowrap',
      }}>
        {TOOLS.map(tt => (
          <button key={tt.id} onClick={() => onToolChange(tt.id)} title={tt.title} style={{
            ...btn(tool === tt.id ? t.btnActive : t.btnDefault, tool === tt.id ? '#fff' : t.text),
            minWidth: 30, textAlign: 'center',
          }}>
            {tt.label}
          </button>
        ))}

        <div style={{ width: 1, height: 26, background: t.divider, flexShrink: 0 }} />

        {COLORS.map(c => (
          <button key={c} onClick={() => onColorChange(c)} title={c} style={{
            width: 24, height: 24, borderRadius: '50%', padding: 0, cursor: 'pointer', flexShrink: 0,
            border: color === c ? '3px solid #6366f1' : `2px solid ${t.panelBorder}`,
            background: c, outline: 'none',
          }} />
        ))}

        <div style={{ width: 1, height: 26, background: t.divider, flexShrink: 0 }} />

        <button onClick={onDeleteSelected} title="Delete selected (Del)"
          style={btn(t.mode === 'dark' ? '#7f1d1d' : '#fee2e2', t.mode === 'dark' ? '#fff' : '#ef4444')}>🗑</button>
        <button onClick={onClear} title="Clear all" style={btn(t.btnDefault, t.text)}>✕</button>
        <button onClick={onSavePng} title="Save as PNG"
          style={btn(t.mode === 'dark' ? '#065f46' : '#d1fae5', t.mode === 'dark' ? '#fff' : '#065f46')}>⬇</button>

        <div style={{ width: 1, height: 26, background: t.divider, flexShrink: 0 }} />

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={btn(t.btnDefault, t.text)}
        >
          {themeMode === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* ── Bottom centre: undo/redo + grid + reset + zoom ── */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6, alignItems: 'center',
        background: t.panelBg, borderRadius: 12, padding: '8px 12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        border: `1px solid ${t.panelBorder}`,
        zIndex: 100,
      }}>
        <button onClick={onUndo} title="Undo (Ctrl+Z)" style={btn(t.btnDefault, t.text)}>↩</button>
        <button onClick={onRedo} title="Redo (Ctrl+Y)" style={btn(t.btnDefault, t.text)}>↪</button>

        <div style={{ width: 1, height: 28, background: t.divider, flexShrink: 0 }} />

        <button onClick={cycleGrid} title={GRID_TITLES[gridType]}
          style={btn(gridType !== 'none' ? t.btnActive : t.btnDefault, gridType !== 'none' ? '#fff' : t.text)}>
          {GRID_ICONS[gridType]}
        </button>
        <button onClick={onResetView} title="Reset view (Home)" style={btn(t.btnDefault, t.text)}>⌂</button>

        <div style={{ width: 1, height: 28, background: t.divider, flexShrink: 0 }} />

        <ZoomPicker zoomPct={zoomPct} onZoomTo={onZoomTo} />
      </div>
    </>
  );
}
