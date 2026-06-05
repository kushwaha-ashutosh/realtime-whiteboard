import { useState } from 'react';
import WhiteboardCanvas from './components/WhiteboardCanvas';
import Toolbar from './components/Toolbar';
import type { WhiteboardShape, ShapeType } from './types';

export default function App() {
  const [tool, setTool] = useState<ShapeType | 'select'>('rect');
  const [color, setColor] = useState('#3b82f6');
  const [shapes, setShapes] = useState<WhiteboardShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleDeleteSelected = () => {
    if (selectedId) {
      setShapes(s => s.filter(x => x.id !== selectedId));
      setSelectedId(null);
    }
  };

  return (
    <>
      <Toolbar
        tool={tool}
        color={color}
        onToolChange={t => { setTool(t); setSelectedId(null); }}
        onColorChange={setColor}
        onClear={() => { setShapes([]); setSelectedId(null); }}
        onDeleteSelected={handleDeleteSelected}
      />
      <WhiteboardCanvas
        tool={tool}
        color={color}
        shapes={shapes}
        onShapesChange={setShapes}
        selectedId={selectedId}
        onSelectId={setSelectedId}
      />
    </>
  );
}
