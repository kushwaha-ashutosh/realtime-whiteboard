import { useState } from 'react';

interface Props {
  onConfirm: (password: string) => void;
  error?: string;
}

export default function PasswordPrompt({ onConfirm, error }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    const pw = value.trim();
    if (!pw) return;
    onConfirm(pw);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1e1e2e', borderRadius: 16, padding: '32px 36px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', gap: 14,
        minWidth: 320,
      }}>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, fontFamily: 'sans-serif' }}>
          🔒 Room is locked
        </div>
        <div style={{ color: '#9ca3af', fontSize: 14, fontFamily: 'sans-serif' }}>
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
            background: '#2d2d3f', border: '2px solid #374151',
            borderRadius: 8, padding: '10px 14px',
            color: '#fff', fontSize: 15, fontFamily: 'sans-serif',
            outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = '#6366f1')}
          onBlur={e => (e.target.style.borderColor = '#374151')}
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          style={{
            background: value.trim() ? '#6366f1' : '#374151',
            color: '#fff', border: 'none', borderRadius: 8,
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
