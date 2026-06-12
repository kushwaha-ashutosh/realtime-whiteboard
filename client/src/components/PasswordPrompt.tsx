import { useState } from 'react';
import { useTheme } from '../ThemeContext';

interface Props {
  onConfirm: (password: string) => void;
  error?: string;
}

export default function PasswordPrompt({ onConfirm, error }: Props) {
  const t = useTheme();
  const [value, setValue] = useState('');

  const submit = () => {
    const pw = value.trim();
    if (!pw) return;
    onConfirm(pw);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: t.mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: t.panelBg, borderRadius: 16, padding: '32px 36px',
        border: `1px solid ${t.panelBorder}`,
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', gap: 14,
        minWidth: 320,
      }}>
        <div style={{ color: t.text, fontSize: 20, fontWeight: 700, fontFamily: 'sans-serif' }}>
          🔒 Room is locked
        </div>
        <div style={{ color: t.textMuted, fontSize: 14, fontFamily: 'sans-serif' }}>
          This room requires a password to join.
        </div>
        {error && (
          <div style={{ color: '#ef4444', fontSize: 13, fontFamily: 'sans-serif' }}>
            {error}
          </div>
        )}
        <input
          autoFocus
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Enter password"
          style={{
            background: t.inputBg, border: `2px solid ${t.panelBorder}`,
            borderRadius: 8, padding: '10px 14px',
            color: t.text, fontSize: 15, fontFamily: 'sans-serif',
            outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = t.accent)}
          onBlur={e => (e.target.style.borderColor = t.panelBorder)}
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          style={{
            background: value.trim() ? t.accent : t.btnDefault,
            color: value.trim() ? '#fff' : t.textMuted,
            border: 'none', borderRadius: 8,
            padding: '10px 0', fontSize: 15, fontWeight: 600,
            cursor: value.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'sans-serif',
          }}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
