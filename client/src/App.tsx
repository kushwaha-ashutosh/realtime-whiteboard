import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useState, useCallback } from 'react';
import WhiteboardCanvas from './components/WhiteboardCanvas';
import Toolbar from './components/Toolbar';
import { useWebSocket } from './hooks/useWebSocket';
import type { WhiteboardShape, ShapeType } from './types';

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
  const [shapes, setShapes] = useState<WhiteboardShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleMessage = useCallback((msg: import('./hooks/useWebSocket').ServerMsg) => {
    switch (msg.type) {
      case 'init':
        setShapes(msg.shapes);
        break;
      case 'shape_add':
        setShapes(s => [...s, msg.shape]);
        break;
      case 'shape_update':
        setShapes(s => s.map(x => x.id === msg.shape.id ? msg.shape : x));
        break;
      case 'shape_delete':
        setShapes(s => s.filter(x => x.id !== msg.id));
        break;
      case 'clear':
        setShapes([]);
        break;
    }
  }, []);

  const { send } = useWebSocket({ roomId: roomId!, onMessage: handleMessage });

  // Called by canvas when a shape finishes being drawn
  const handleShapeAdd = useCallback((shape: WhiteboardShape) => {
    send({ type: 'shape_add', shape });
  }, [send]);

  // Called by canvas when a shape is moved/resized
  const handleShapeUpdate = useCallback((shape: WhiteboardShape) => {
    send({ type: 'shape_update', shape });
  }, [send]);

  const handleDeleteSelected = () => {
    if (selectedId) {
      send({ type: 'shape_delete', id: selectedId });
      setShapes(s => s.filter(x => x.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleClear = () => {
    send({ type: 'clear' });
    setShapes([]);
    setSelectedId(null);
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
        onClear={handleClear}
        onDeleteSelected={handleDeleteSelected}
      />
      <WhiteboardCanvas
        tool={tool}
        color={color}
        shapes={shapes}
        onShapeAdd={handleShapeAdd}
        onShapeUpdate={handleShapeUpdate}
        selectedId={selectedId}
        onSelectId={setSelectedId}
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
