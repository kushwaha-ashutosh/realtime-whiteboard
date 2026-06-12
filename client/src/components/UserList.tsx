import { useState } from 'react';
import type { CursorState } from '../hooks/useYjs';
import { useTheme } from '../ThemeContext';

interface Props {
  cursors: Map<number, CursorState>;
  myClientId: number;
  followingId: number | null;
  onFollow: (id: number | null) => void;
  roomId: string;
  isLocked: boolean;
  onLock: (password: string) => Promise<void>;
  onUnlock: (password: string) => Promise<boolean>;
}

export default function UserList({
  cursors, myClientId, followingId, onFollow,
  roomId: _roomId, isLocked, onLock, onUnlock,
}: Props) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [lockInput, setLockInput] = useState('');
  const [lockError, setLockError] = useState('');

  const users = Array.from(cursors.entries());
  const otherUsers = users.filter(([id]) => id !== myClientId);
  const me = cursors.get(myClientId);

  const handleLockSubmit = async () => {
    if (!lockInput.trim()) return;
    try {
      if (isLocked) {
        const ok = await onUnlock(lockInput);
        if (!ok) { setLockError('Wrong password'); return; }
      } else {
        await onLock(lockInput);
      }
      setShowLockDialog(false);
      setLockInput('');
      setLockError('');
    } catch {
      setLockError('Failed — try again');
    }
  };

  return (
    <>
      <button
        onClick={() => setExpanded(e => !e)}
        title="User list"
        style={{
          position: 'fixed', top: 52, right: 16, zIndex: 200,
          background: t.panelBg, border: `1px solid ${t.panelBorder}`,
          borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
          color: t.textMuted, fontSize: 12, fontFamily: 'monospace',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
        {users.length} online
      </button>

      {expanded && (
        <div style={{
          position: 'fixed', top: 84, right: 16, zIndex: 200,
          background: t.panelBg, border: `1px solid ${t.panelBorder}`,
          borderRadius: 10, padding: '10px 0',
          width: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {me && (
            <div style={{ padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: me.color, border: `2px solid ${t.divider}`,
              }} />
              <span style={{ color: t.text, fontSize: 13, fontFamily: 'sans-serif', flex: 1 }}>
                {me.name}
              </span>
              <span style={{
                background: t.accent, color: '#fff', fontSize: 10,
                borderRadius: 4, padding: '1px 5px', fontFamily: 'sans-serif',
              }}>you</span>
            </div>
          )}

          {otherUsers.length > 0 && (
            <div style={{ height: 1, background: t.divider, margin: '6px 0' }} />
          )}

          {otherUsers.map(([id, state]) => (
            <div key={id} style={{ padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: state.color, border: `2px solid ${t.divider}`,
              }} />
              <span style={{
                color: t.text, fontSize: 13, fontFamily: 'sans-serif', flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {state.name}
              </span>
              <button
                onClick={() => onFollow(followingId === id ? null : id)}
                style={{
                  background: followingId === id ? t.accent : 'transparent',
                  border: `1px solid ${followingId === id ? t.accent : t.panelBorder}`,
                  borderRadius: 5, padding: '2px 6px',
                  color: followingId === id ? '#fff' : t.textMuted,
                  fontSize: 11, cursor: 'pointer', fontFamily: 'sans-serif',
                  flexShrink: 0,
                }}
                title={followingId === id ? 'Stop following' : "Follow this user's cursor"}
              >
                {followingId === id ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}

          <div style={{ height: 1, background: t.divider, margin: '6px 0' }} />
          <div style={{ padding: '4px 12px' }}>
            <button
              onClick={() => { setShowLockDialog(true); setLockInput(''); setLockError(''); }}
              style={{
                width: '100%', background: 'transparent',
                border: `1px solid ${t.panelBorder}`, borderRadius: 6,
                padding: '5px 8px', cursor: 'pointer',
                color: isLocked ? '#fbbf24' : t.textMuted,
                fontSize: 12, fontFamily: 'sans-serif',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{isLocked ? '🔒' : '🔓'}</span>
              <span>{isLocked ? 'Room locked' : 'Lock room'}</span>
            </button>
          </div>
        </div>
      )}

      {showLockDialog && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: t.panelBg, borderRadius: 12, padding: '24px 28px',
            width: 300, boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            border: `1px solid ${t.panelBorder}`,
          }}>
            <div style={{ color: t.text, fontWeight: 700, fontSize: 16, fontFamily: 'sans-serif', marginBottom: 8 }}>
              {isLocked ? 'Unlock room' : 'Lock room with password'}
            </div>
            <div style={{ color: t.textMuted, fontSize: 13, fontFamily: 'sans-serif', marginBottom: 14 }}>
              {isLocked
                ? 'Enter the room password to unlock it for everyone.'
                : 'New visitors will need this password to join.'}
            </div>
            <input
              autoFocus
              type="password"
              value={lockInput}
              onChange={e => setLockInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLockSubmit()}
              placeholder="Password"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: t.inputBg, border: `2px solid ${t.panelBorder}`,
                borderRadius: 8, padding: '9px 12px',
                color: t.text, fontSize: 14, fontFamily: 'sans-serif',
                outline: 'none', marginBottom: lockError ? 6 : 12,
              }}
            />
            {lockError && (
              <div style={{ color: '#ef4444', fontSize: 12, fontFamily: 'sans-serif', marginBottom: 10 }}>
                {lockError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleLockSubmit}
                style={{
                  flex: 1, background: t.accent, color: '#fff', border: 'none',
                  borderRadius: 8, padding: '9px 0', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'sans-serif',
                }}
              >
                {isLocked ? 'Unlock' : 'Lock'}
              </button>
              <button
                onClick={() => setShowLockDialog(false)}
                style={{
                  flex: 1, background: 'transparent', color: t.textMuted,
                  border: `1px solid ${t.panelBorder}`, borderRadius: 8,
                  padding: '9px 0', fontSize: 14, cursor: 'pointer',
                  fontFamily: 'sans-serif',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
