import type { ShapeType } from '../types';

interface Props {
  tool: ShapeType | 'select';
  color: string;
  onToolChange: (t: ShapeType | 'select') => void;
  onColorChange: (c: string) => void;
  onClear: () => void;
  onDeleteSelected: () => void;
}

const TOOLS: Array<{ id: ShapeType | 'select'; label: string }> = [
  { id: 'select', label: '↖ Select' },
  { id: 'rect', label: '▭ Rect' },
  { id: 'ellipse', label: '◯ Ellipse' },
  { id: 'line', label: '╱ Line' },
];

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000'];

export default function Toolbar({ tool, color, onToolChange, onColorChange, onClear, onDeleteSelected }: Props) {
  return (
    <div style={{
      position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 8, alignItems: 'center',
      background: '#1e1e2e', borderRadius: 12, padding: '8px 14px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)', zIndex: 100,
    }}>
      {TOOLS.map(t => (
        <button key={t.id} onClick={() => onToolChange(t.id)}
          style={{
            padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tool === t.id ? '#6366f1' : '#2d2d3f',
            color: '#fff', fontWeight: 600, fontSize: 13,
          }}>
          {t.label}
        </button>
      ))}
      <div style={{ width: 1, height: 28, background: '#444' }} />
      {COLORS.map(c => (
        <button key={c} onClick={() => onColorChange(c)}
          style={{
            width: 22, height: 22, borderRadius: '50%', border: color === c ? '3px solid #fff' : '2px solid transparent',
            background: c, cursor: 'pointer', padding: 0,
          }} />
      ))}
      <div style={{ width: 1, height: 28, background: '#444' }} />
      <button onClick={onDeleteSelected}
        style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#7f1d1d', color: '#fff', fontSize: 13 }}>
        🗑 Del
      </button>
      <button onClick={onClear}
        style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#374151', color: '#fff', fontSize: 13 }}>
        Clear
      </button>
    </div>
  );
}
