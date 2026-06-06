import { useState } from 'react';

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
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1e1e2e', borderRadius: 16, padding: '32px 36px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: 16,
        minWidth: 320,
      }}>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, fontFamily: 'sans-serif' }}>
          Welcome to the whiteboard
        </div>
        <div style={{ color: '#9ca3af', fontSize: 14, fontFamily: 'sans-serif' }}>
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
            background: '#2d2d3f', border: '2px solid #374151',
            borderRadius: 8, padding: '10px 14px',
            color: '#fff', fontSize: 15, fontFamily: 'sans-serif',
            outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = '#6366f1')}
          onBlur={e => (e.target.style.borderColor = '#374151')}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={submit}
            disabled={value.trim().length === 0}
            style={{
              flex: 1,
              background: value.trim().length > 0 ? '#6366f1' : '#374151',
              color: '#fff', border: 'none', borderRadius: 8,
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
              color: '#9ca3af', border: '2px solid #374151', borderRadius: 8,
              padding: '10px 0', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'sans-serif',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = '#6b7280'; (e.target as HTMLButtonElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = '#374151'; (e.target as HTMLButtonElement).style.color = '#9ca3af'; }}
          >
            Skip (random name)
          </button>
        </div>
      </div>
    </div>
  );
}
