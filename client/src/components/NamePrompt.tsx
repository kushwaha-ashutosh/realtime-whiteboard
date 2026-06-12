import { useState } from 'react';
import { useTheme } from '../ThemeContext';

const ADJS = ['swift','bright','calm','bold','kind','wise','warm','cool','brave','eager'];
const NOUNS = ['fox','owl','star','wave','leaf','moon','spark','hawk','river','cloud'];

export function randomName(): string {
  return ADJS[Math.floor(Math.random() * ADJS.length)] + '-' +
         NOUNS[Math.floor(Math.random() * NOUNS.length)];
}

interface Props {
  onConfirm: (name: string) => void;
}

export default function NamePrompt({ onConfirm }: Props) {
  const t = useTheme();
  const [value, setValue] = useState('');

  const submit = () => {
    const name = value.trim();
    if (name.length === 0) return;
    onConfirm(name);
  };

  const skip = () => onConfirm(randomName());

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
        display: 'flex', flexDirection: 'column', gap: 16,
        minWidth: 320,
      }}>
        <div style={{ color: t.text, fontSize: 20, fontWeight: 700, fontFamily: 'sans-serif' }}>
          Welcome to the whiteboard
        </div>
        <div style={{ color: t.textMuted, fontSize: 14, fontFamily: 'sans-serif' }}>
          Enter your name so others can see who you are — or skip for a random one.
        </div>
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (value.trim() ? submit() : skip())}
          placeholder="Your name (optional)"
          maxLength={30}
          style={{
            background: t.inputBg, border: `2px solid ${t.panelBorder}`,
            borderRadius: 8, padding: '10px 14px',
            color: t.text, fontSize: 15, fontFamily: 'sans-serif',
            outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = t.accent)}
          onBlur={e => (e.target.style.borderColor = t.panelBorder)}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={submit}
            disabled={value.trim().length === 0}
            style={{
              flex: 1,
              background: value.trim().length > 0 ? t.accent : t.btnDefault,
              color: value.trim().length > 0 ? '#fff' : t.textMuted,
              border: 'none', borderRadius: 8,
              padding: '10px 0', fontSize: 15, fontWeight: 600,
              cursor: value.trim().length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'sans-serif', transition: 'background 0.15s',
            }}
          >
            Join
          </button>
          <button
            onClick={skip}
            style={{
              flex: 1,
              background: 'transparent',
              color: t.textMuted, border: `2px solid ${t.panelBorder}`, borderRadius: 8,
              padding: '10px 0', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'sans-serif',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.borderColor = t.accent;
              (e.target as HTMLButtonElement).style.color = t.text;
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.borderColor = t.panelBorder;
              (e.target as HTMLButtonElement).style.color = t.textMuted;
            }}
          >
            Skip (random name)
          </button>
        </div>
      </div>
    </div>
  );
}
