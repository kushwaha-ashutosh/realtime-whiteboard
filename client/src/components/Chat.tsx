import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../hooks/useYjs';
import { useTheme } from '../ThemeContext';

interface Props {
  messages: ChatMessage[];
  myClientId: number;
  displayName: string;
  onSend: (text: string) => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat({ messages, myClientId: _myClientId, displayName: _dn, onSend }: Props) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevLen.current) {
      if (!open) setUnread(u => u + (messages.length - prevLen.current));
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLen.current = messages.length;
  }, [messages.length, open]);

  const handleOpen = () => { setOpen(true); setUnread(0); };
  const handleClose = () => setOpen(false);

  const submit = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  return (
    <>
      <button
        onClick={open ? handleClose : handleOpen}
        title="Chat"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 200,
          width: 48, height: 48, borderRadius: '50%',
          background: open ? t.accent : t.panelBg,
          border: `2px solid ${t.panelBorder}`,
          cursor: 'pointer', fontSize: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        💬
        {unread > 0 && !open && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#ef4444', color: '#fff',
            borderRadius: '50%', width: 18, height: 18,
            fontSize: 10, fontWeight: 700, fontFamily: 'sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 200,
          width: 300, height: 420,
          background: t.panelBg, border: `1px solid ${t.panelBorder}`,
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${t.divider}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: t.text, fontWeight: 700, fontSize: 14, fontFamily: 'sans-serif' }}>
              Chat
            </span>
            <button onClick={handleClose} style={{
              background: 'none', border: 'none', color: t.textMuted,
              cursor: 'pointer', fontSize: 16, lineHeight: 1,
            }}>×</button>
          </div>

          <div style={{
            flex: 1, overflowY: 'auto', padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {messages.length === 0 && (
              <div style={{
                color: t.textMuted, fontSize: 13, fontFamily: 'sans-serif',
                textAlign: 'center', marginTop: 40,
              }}>
                No messages yet. Say hi! 👋
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ color: m.color, fontSize: 12, fontWeight: 700, fontFamily: 'sans-serif' }}>
                    {m.name}
                  </span>
                  <span style={{ color: t.textMuted, fontSize: 10, fontFamily: 'monospace' }}>
                    {formatTime(m.ts)}
                  </span>
                </div>
                <div style={{
                  color: t.text, fontSize: 13, fontFamily: 'sans-serif',
                  lineHeight: 1.4, wordBreak: 'break-word',
                  background: t.inputBg, borderRadius: 8,
                  padding: '6px 10px',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{
            padding: '8px 10px', borderTop: `1px solid ${t.divider}`,
            display: 'flex', gap: 6,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
              placeholder="Message…"
              style={{
                flex: 1, background: t.inputBg,
                border: `1px solid ${t.panelBorder}`, borderRadius: 8,
                padding: '7px 10px', color: t.text,
                fontSize: 13, fontFamily: 'sans-serif', outline: 'none',
              }}
            />
            <button
              onClick={submit}
              disabled={!input.trim()}
              style={{
                background: input.trim() ? t.accent : t.btnDefault,
                border: 'none', borderRadius: 8, padding: '7px 12px',
                color: input.trim() ? '#fff' : t.textMuted,
                cursor: input.trim() ? 'pointer' : 'default',
                fontSize: 14,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
