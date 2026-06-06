import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import type Konva from 'konva';
import WhiteboardCanvas from './components/WhiteboardCanvas';
import Toolbar from './components/Toolbar';
import Cursors from './components/Cursors';
import NamePrompt from './components/NamePrompt';
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

function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const [tool, setTool] = useState<ShapeType | 'select'>('rect');
  const [color, setColor] = useState('#3b82f6');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(getSavedName);
  const stageRef = useRef<Konva.Stage>(null);

  const {
    shapes, addShape, updateShape, deleteShape, clearShapes,
    updateCursor, cursors, myClientId, undo, redo,
  } = useYjs(roomId!, displayName ?? '');

  // Keyboard shortcuts (must be before any conditional return)
  useEffect(() => {
    if (!displayName) return;
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z') { e.preventDefault(); undo(); }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) { deleteShape(selectedId); setSelectedId(null); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [displayName, undo, redo, selectedId, deleteShape]);

  // Show name prompt until the user picks a name
  if (!displayName) {
    return (
      <NamePrompt onConfirm={name => {
        saveDisplayName(name);
        setDisplayName(name);
      }} />
    );
  }

  const handleSavePng = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = uri;
    a.download = `whiteboard-${roomId}.png`;
    a.click();
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: 12, right: 16, zIndex: 200,
        background: '#1e1e2e', borderRadius: 8, padding: '4px 10px',
        color: '#6366f1', fontSize: 12, fontFamily: 'monospace',
      }}>
        room: {roomId}
      </div>
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
      />
      <Cursors cursors={cursors} myClientId={myClientId} />
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
