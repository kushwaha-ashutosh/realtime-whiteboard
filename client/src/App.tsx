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
import GridCanvas from './components/GridCanvas';
import Minimap from './components/Minimap';
import StrokePanel from './components/StrokePanel';
import { useYjs } from './hooks/useYjs';
import type { ShapeType, GridType, Viewport } from './types';
import { ThemeContext } from './ThemeContext';
import { dark, light } from './theme';
import type { ThemeMode } from './theme';

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

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, scale: 1 };

function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [tool, setTool] = useState<ShapeType | 'select'>('rect');
  const [color, setColor] = useState('#3b82f6');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState<string | null>(getSavedName);
  const [passwordHash, setPasswordHash] = useState<string | undefined>(undefined);
  const [roomLocked, setRoomLocked] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [followingId, setFollowingId] = useState<number | null>(null);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [gridType, setGridType] = useState<GridType>('dots');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const stageRef = useRef<Konva.Stage>(null);

  const theme = themeMode === 'dark' ? dark : light;

  const {
    shapes, addShape, updateShape, deleteShape, clearShapes,
    updateCursor, cursors, myClientId, undo, redo,
    messages, sendMessage, wsError,
  } = useYjs(roomId!, displayName ?? '', passwordHash);

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

  useEffect(() => {
    if (wsError === 'wrong_password') {
      setPasswordError('Wrong password — try again.');
      setShowPasswordPrompt(true);
      setPasswordHash(undefined);
    }
  }, [wsError]);

  // Follow mode: pan to keep followed user centered
  useEffect(() => {
    if (followingId === null) return;
    const cursor = cursors.get(followingId);
    if (!cursor) return;
    setViewport(vp => ({
      ...vp,
      x: window.innerWidth / 2 - cursor.x * vp.scale,
      y: window.innerHeight / 2 - cursor.y * vp.scale,
    }));
  }, [cursors, followingId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!displayName) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z') { e.preventDefault(); undo(); }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          selectedIds.forEach(id => deleteShape(id));
          setSelectedIds([]);
        }
      }
      if (e.key === 'Escape') setFollowingId(null);
      if (e.key === 'Home') setViewport(DEFAULT_VIEWPORT);
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(shapes.map(s => s.id));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [displayName, undo, redo, selectedIds, deleteShape, shapes]);

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
    const res = await fetch(`/api/rooms/${roomId}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return;
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
    const body = await res.json().catch(() => ({}));
    console.log('[unlock] response:', res.status, body);
    if (res.ok) { setRoomLocked(false); setPasswordHash(undefined); return true; }
    return false;
  };

  if (!displayName) {
    return (
      <ThemeContext.Provider value={theme}>
        <NamePrompt onConfirm={name => {
          saveDisplayName(name);
          setDisplayName(name);
        }} />
      </ThemeContext.Provider>
    );
  }

  if (showPasswordPrompt) {
    return (
      <ThemeContext.Provider value={theme}>
        <PasswordPrompt onConfirm={handlePasswordConfirm} error={passwordError} />
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={theme}>
      {/* Solid background behind grid */}
      <div style={{ position: 'fixed', inset: 0, background: theme.canvasBg, zIndex: 0 }} />
      <GridCanvas viewport={viewport} gridType={gridType} />

      {/* Room ID badge */}
      <div style={{
        position: 'fixed', top: 12, right: 16, zIndex: 200,
        background: theme.panelBg, borderRadius: 8, padding: '4px 10px',
        border: `1px solid ${theme.panelBorder}`,
        color: theme.accent, fontSize: 12, fontFamily: 'monospace',
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
        gridType={gridType}
        zoomPct={Math.round(viewport.scale * 100)}
        themeMode={themeMode}
        onToolChange={t => { setTool(t); setSelectedIds([]); }}
        onColorChange={setColor}
        onGridChange={setGridType}
        onClear={() => { clearShapes(); setSelectedIds([]); }}
        onDeleteSelected={() => {
          if (selectedIds.length > 0) {
            selectedIds.forEach(id => deleteShape(id));
            setSelectedIds([]);
          }
        }}
        onUndo={undo}
        onRedo={redo}
        onSavePng={handleSavePng}
        onResetView={() => setViewport(DEFAULT_VIEWPORT)}
        onZoomTo={scale => setViewport(vp => ({
          x: window.innerWidth / 2 - (window.innerWidth / 2 - vp.x) / vp.scale * scale,
          y: window.innerHeight / 2 - (window.innerHeight / 2 - vp.y) / vp.scale * scale,
          scale,
        }))}
        onThemeToggle={() => setThemeMode(m => m === 'dark' ? 'light' : 'dark')}
      />
      <StrokePanel strokeWidth={strokeWidth} color={color} onChange={setStrokeWidth} />
      <WhiteboardCanvas
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        shapes={shapes}
        onShapeAdd={addShape}
        onShapeUpdate={updateShape}
        onShapeDelete={deleteShape}
        onCursorMove={updateCursor}
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
        stageRef={stageRef}
        viewport={viewport}
        onViewportChange={setViewport}
      />
      <Cursors
        cursors={cursors}
        myClientId={myClientId}
        offsetX={viewport.x}
        offsetY={viewport.y}
        scale={viewport.scale}
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
      <Minimap shapes={shapes} viewport={viewport} />
    </ThemeContext.Provider>
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
