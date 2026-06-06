import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import type Konva from 'konva';
import WhiteboardCanvas from './components/WhiteboardCanvas';
import Toolbar from './components/Toolbar';
import Cursors from './components/Cursors';
import NamePrompt from './components/NamePrompt';
import PasswordPrompt from './components/PasswordPrompt';
import UserList from './components/UserList';
import Chat from './components/Chat';
import { useYjs } from './hooks/useYjs';
import type { ShapeType } from './types';

function getSavedName(): string | null {
  return sessionStorage.getItem('wb-display-name');
}
function saveDisplayName(name: string) {
  sessionStorage.setItem('wb-display-name', name);
}

function randomRoomId(): string {
  const adj = ['violet', 'amber', 'cobalt', 'jade', 'crimson', 'azure'];
  const noun = ['otter', 'falcon', 'prism', 'beacon', 'comet', 'ember'];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj[Math.floor(Math.random() * adj.length)]}-${noun[Math.floor(Math.random() * noun.length)]}-${num}`;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [tool, setTool] = useState<ShapeType | 'select'>('rect');
  const [color, setColor] = useState('#3b82f6');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(getSavedName);
  const [passwordHash, setPasswordHash] = useState<string | undefined>(undefined);
  const [roomLocked, setRoomLocked] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [followingId, setFollowingId] = useState<number | null>(null);
  const [stageOffset, setStageOffset] = useState({ x: 0, y: 0 });
  const stageRef = useRef<Konva.Stage>(null);

  const {
    shapes, addShape, updateShape, deleteShape, clearShapes,
    updateCursor, cursors, myClientId, undo, redo,
    messages, sendMessage, wsError,
  } = useYjs(roomId!, displayName ?? '', passwordHash);

  // Check if room is locked on mount
  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/rooms/${roomId}/info`)
      .then(r => r.json())
      .then((info: { locked: boolean }) => {
        setRoomLocked(info.locked);
        if (info.locked && !passwordHash) setShowPasswordPrompt(true);
      })
      .catch(() => {});
  }, [roomId]);

  // Handle wrong password from WS
  useEffect(() => {
    if (wsError === 'wrong_password') {
      setPasswordError('Wrong password — try again.');
      setShowPasswordPrompt(true);
      setPasswordHash(undefined);
    }
  }, [wsError]);

  // Follow mode: pan stage to keep followed user's cursor centered
  useEffect(() => {
    if (followingId === null) {
      setStageOffset({ x: 0, y: 0 });
      return;
    }
    const cursor = cursors.get(followingId);
    if (!cursor) return;
    setStageOffset({
      x: window.innerWidth / 2 - cursor.x,
      y: window.innerHeight / 2 - cursor.y,
    });
  }, [cursors, followingId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!displayName) return;
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z') { e.preventDefault(); undo(); }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) { deleteShape(selectedId); setSelectedId(null); }
      }
      if (e.key === 'Escape') setFollowingId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [displayName, undo, redo, selectedId, deleteShape]);

  const handleSavePng = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = uri;
    a.download = `whiteboard-${roomId}.png`;
    a.click();
  };

  const handlePasswordConfirm = async (password: string) => {
    const hash = await sha256(password);
    setPasswordHash(hash);
    setShowPasswordPrompt(false);
    setPasswordError('');
  };

  const handleLock = async (password: string) => {
    await fetch(`/api/rooms/${roomId}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setRoomLocked(true);
    const hash = await sha256(password);
    setPasswordHash(hash);
  };

  const handleUnlock = async (password: string): Promise<boolean> => {
    const res = await fetch(`/api/rooms/${roomId}/lock`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setRoomLocked(false);
      setPasswordHash(undefined);
      return true;
    }
    return false;
  };

  // Show name prompt first
  if (!displayName) {
    return (
      <NamePrompt onConfirm={name => {
        saveDisplayName(name);
        setDisplayName(name);
      }} />
    );
  }

  // Then password prompt if room is locked
  if (showPasswordPrompt) {
    return (
      <PasswordPrompt
        onConfirm={handlePasswordConfirm}
        error={passwordError}
      />
    );
  }

  return (
    <>
      {/* Room ID badge */}
      <div style={{
        position: 'fixed', top: 12, right: 16, zIndex: 200,
        background: '#1e1e2e', borderRadius: 8, padding: '4px 10px',
        color: '#6366f1', fontSize: 12, fontFamily: 'monospace',
      }}>
        room: {roomId}
      </div>

      {/* Follow mode banner */}
      {followingId !== null && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, background: '#6366f1', borderRadius: 20,
          padding: '6px 16px', color: '#fff', fontSize: 13,
          fontFamily: 'sans-serif', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span>Following {cursors.get(followingId)?.name ?? '…'}</span>
          <button
            onClick={() => setFollowingId(null)}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: 10, padding: '2px 8px', color: '#fff',
              cursor: 'pointer', fontSize: 12, fontFamily: 'sans-serif',
            }}
          >
            Stop (Esc)
          </button>
        </div>
      )}

      <Toolbar
        tool={tool}
        color={color}
        onToolChange={t => { setTool(t); setSelectedId(null); }}
        onColorChange={setColor}
        onClear={() => { clearShapes(); setSelectedId(null); }}
        onDeleteSelected={() => { if (selectedId) { deleteShape(selectedId); setSelectedId(null); } }}
        onUndo={undo}
        onRedo={redo}
        onSavePng={handleSavePng}
      />
      <WhiteboardCanvas
        tool={tool}
        color={color}
        shapes={shapes}
        onShapeAdd={addShape}
        onShapeUpdate={updateShape}
        onCursorMove={updateCursor}
        selectedId={selectedId}
        onSelectId={setSelectedId}
        stageRef={stageRef}
        stageOffsetX={stageOffset.x}
        stageOffsetY={stageOffset.y}
      />
      <Cursors
        cursors={cursors}
        myClientId={myClientId}
        offsetX={stageOffset.x}
        offsetY={stageOffset.y}
      />
      <UserList
        cursors={cursors}
        myClientId={myClientId}
        followingId={followingId}
        onFollow={setFollowingId}
        roomId={roomId!}
        isLocked={roomLocked}
        onLock={handleLock}
        onUnlock={handleUnlock}
      />
      <Chat
        messages={messages}
        myClientId={myClientId}
        displayName={displayName}
        onSend={sendMessage}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="*" element={<Navigate to={`/room/${randomRoomId()}`} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
