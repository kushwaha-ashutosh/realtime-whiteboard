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

const TOOLS: Array<{ id: ShapeType | 'select'; label: string }> = [
  { id: 'select', label: '↖ Select' },
  { id: 'rect', label: '▭ Rect' },
  { id: 'ellipse', label: '◯ Ellipse' },
  { id: 'line', label: '╱ Line' },
];

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000'];

const btn = (bg: string, extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: bg, color: '#fff', fontSize: 13, ...extra,
});

export default function Toolbar({ tool, color, onToolChange, onColorChange, onClear, onDeleteSelected, onUndo, onRedo, onSavePng }: Props) {
  return (
    <div style={{
      position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 8, alignItems: 'center',
      background: '#1e1e2e', borderRadius: 12, padding: '8px 14px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)', zIndex: 100,
    }}>
      {TOOLS.map(t => (
        <button key={t.id} onClick={() => onToolChange(t.id)} style={{
          ...btn(tool === t.id ? '#6366f1' : '#2d2d3f'), fontWeight: 600,
        }}>
          {t.label}
        </button>
      ))}
      <div style={{ width: 1, height: 28, background: '#444' }} />
      {COLORS.map(c => (
        <button key={c} onClick={() => onColorChange(c)} style={{
          width: 22, height: 22, borderRadius: '50%', padding: 0, cursor: 'pointer',
          border: color === c ? '3px solid #fff' : '2px solid transparent', background: c,
        }} />
      ))}
      <div style={{ width: 1, height: 28, background: '#444' }} />
      <button onClick={onUndo} title="Undo (Ctrl+Z)" style={btn('#374151')}>↩ Undo</button>
      <button onClick={onRedo} title="Redo (Ctrl+Y)" style={btn('#374151')}>↪ Redo</button>
      <div style={{ width: 1, height: 28, background: '#444' }} />
      <button onClick={onDeleteSelected} style={btn('#7f1d1d')}>🗑 Del</button>
      <button onClick={onClear} style={btn('#374151')}>Clear</button>
      <button onClick={onSavePng} title="Save as PNG" style={btn('#065f46')}>⬇ PNG</button>
    </div>
  );
}
