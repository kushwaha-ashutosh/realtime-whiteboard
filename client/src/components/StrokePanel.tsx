import { useTheme } from '../ThemeContext';

interface Props {
  strokeWidth: number;
  color: string;
  onChange: (w: number) => void;
}

const PRESETS = [1, 2, 4, 6, 10, 16];

export default function StrokePanel({ strokeWidth, color, onChange }: Props) {
  const t = useTheme();

  return (
    <div style={{
      position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)',
      zIndex: 100,
      background: t.panelBg,
      border: `1px solid ${t.panelBorder}`,
      borderRadius: 12,
      padding: '10px 8px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        color: t.textMuted, fontSize: 10, fontFamily: 'sans-serif',
        letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2,
      }}>
        Stroke
      </div>

      {PRESETS.map(w => (
        <button
          key={w}
          title={`${w}px`}
          onClick={() => onChange(w)}
          style={{
            width: 36, height: 36,
            borderRadius: 8, border: 'none', cursor: 'pointer',
            background: strokeWidth === w ? t.btnActive : t.btnDefault,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          <div style={{
            width: 22,
            height: Math.min(w, 16),
            borderRadius: w <= 2 ? 1 : 4,
            background: strokeWidth === w ? '#fff' : color,
            opacity: strokeWidth === w ? 1 : 0.8,
          }} />
        </button>
      ))}

      <div style={{ width: 24, height: 1, background: t.divider }} />

      <input
        type="range"
        min={1}
        max={40}
        value={strokeWidth}
        onChange={e => onChange(Number(e.target.value))}
        title={`Custom: ${strokeWidth}px`}
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          width: 6,
          height: 80,
          cursor: 'pointer',
          accentColor: t.accent,
        }}
      />

      <div style={{
        color: t.textMuted, fontSize: 11, fontFamily: 'monospace',
        marginTop: 2,
      }}>
        {strokeWidth}px
      </div>
    </div>
  );
}
