import type { ShapeType } from '../types';

interface Props {
  tool: ShapeType | 'select';
  color: string;
  onToolChange: (t: ShapeType | 'select') => void;
  onColorChange: (c: string) => void;
  onClear: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSavePng: () => void;
}

const TOOLS: Array<{ id: ShapeType | 'select'; label: string; title: string }> = [
  { id: 'select',  label: '↖',  title: 'Select' },
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

const btn = (bg: string, extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer',
  background: bg, color: '#fff', fontSize: 13, fontWeight: 600,
  fontFamily: 'sans-serif', lineHeight: 1, ...extra,
});

export default function Toolbar({ tool, color, onToolChange, onColorChange, onClear, onDeleteSelected, onUndo, onRedo, onSavePng }: Props) {
  return (
    <div style={{
      position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 6, alignItems: 'center',
      background: '#1e1e2e', borderRadius: 12, padding: '7px 12px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)', zIndex: 100,
      flexWrap: 'nowrap',
    }}>
      {TOOLS.map(t => (
        <button key={t.id} onClick={() => onToolChange(t.id)} title={t.title} style={{
          ...btn(tool === t.id ? '#6366f1' : '#2d2d3f'),
          minWidth: 30, textAlign: 'center',
        }}>
          {t.label}
        </button>
      ))}

      <div style={{ width: 1, height: 26, background: '#444', flexShrink: 0 }} />

      {COLORS.map(c => (
        <button key={c} onClick={() => onColorChange(c)} title={c} style={{
          width: 20, height: 20, borderRadius: '50%', padding: 0, cursor: 'pointer', flexShrink: 0,
          border: color === c ? '3px solid #fff' : '2px solid #555',
          background: c, outline: 'none',
        }} />
      ))}

      <div style={{ width: 1, height: 26, background: '#444', flexShrink: 0 }} />

      <button onClick={onUndo} title="Undo (Ctrl+Z)" style={btn('#374151')}>↩</button>
      <button onClick={onRedo} title="Redo (Ctrl+Y)" style={btn('#374151')}>↪</button>

      <div style={{ width: 1, height: 26, background: '#444', flexShrink: 0 }} />

      <button onClick={onDeleteSelected} title="Delete selected" style={btn('#7f1d1d')}>🗑</button>
      <button onClick={onClear} title="Clear all" style={btn('#374151')}>✕</button>
      <button onClick={onSavePng} title="Save as PNG" style={btn('#065f46')}>⬇</button>
    </div>
  );
}
