import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Ellipse, Line, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { WhiteboardShape, ShapeType } from '../types';
import { nanoid } from '../utils/id';

interface Props {
  tool: ShapeType | 'select';
  color: string;
  shapes: WhiteboardShape[];
  onShapeAdd: (shape: WhiteboardShape) => void;
  onShapeUpdate: (shape: WhiteboardShape) => void;
  onCursorMove?: (x: number, y: number) => void;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  stageRef?: React.RefObject<Konva.Stage | null>;
}

export default function WhiteboardCanvas({
  tool, color, shapes,
  onShapeAdd, onShapeUpdate, onCursorMove,
  selectedId, onSelectId, stageRef: externalStageRef,
}: Props) {
  const [draft, setDraft] = useState<WhiteboardShape | null>(null);
  const isDrawing = useRef(false);
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = (externalStageRef ?? internalStageRef) as React.RefObject<Konva.Stage | null>;
  const trRef = useRef<Konva.Transformer>(null);
  const [stageSize, setStageSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const handler = () => setStageSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Attach transformer to selected shape
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    if (selectedId) {
      const node = stageRef.current.findOne(`#${selectedId}`);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer()?.batchDraw();
      }
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, shapes]);

  const getPointer = () => stageRef.current?.getPointerPosition() ?? { x: 0, y: 0 };

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      if (e.target === stageRef.current) onSelectId(null);
      return;
    }
    isDrawing.current = true;
    const pos = getPointer();
    const base = {
      id: nanoid(),
      fill: tool === 'line' ? 'transparent' : color + '55',
      stroke: color,
      strokeWidth: 2,
    };
    let shape: WhiteboardShape;
    if (tool === 'rect') {
      shape = { ...base, type: 'rect', x: pos.x, y: pos.y, width: 0, height: 0 };
    } else if (tool === 'ellipse') {
      shape = { ...base, type: 'ellipse', x: pos.x, y: pos.y, width: 0, height: 0 };
    } else {
      shape = { ...base, type: 'line', x: 0, y: 0, points: [pos.x, pos.y, pos.x, pos.y] };
    }
    setDraft(shape);
  }, [tool, color, onSelectId]);

  const handleMouseMove = useCallback(() => {
    const pos = getPointer();
    onCursorMove?.(pos.x, pos.y);
    if (!isDrawing.current || !draft) return;
    setDraft(prev => {
      if (!prev) return prev;
      if (prev.type === 'rect') return { ...prev, width: pos.x - prev.x, height: pos.y - prev.y };
      if (prev.type === 'ellipse') return { ...prev, width: pos.x - prev.x, height: pos.y - prev.y };
      if (prev.type === 'line' && prev.points)
        return { ...prev, points: [prev.points[0], prev.points[1], pos.x, pos.y] };
      return prev;
    });
  }, [draft]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !draft) return;
    isDrawing.current = false;
    // Drop trivially small shapes
    const big = draft.type === 'line'
      ? draft.points && Math.abs(draft.points[2] - draft.points[0]) + Math.abs(draft.points[3] - draft.points[1]) > 2
      : Math.abs(draft.width ?? 0) > 2 && Math.abs(draft.height ?? 0) > 2;
    if (big) onShapeAdd(draft);
    setDraft(null);
  }, [draft, onShapeAdd]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    const base = shapes.find(s => s.id === id);
    if (!base) return;
    onShapeUpdate({ ...base, x: e.target.x(), y: e.target.y() });
  }, [shapes, onShapeUpdate]);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>, id: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    const base = shapes.find(s => s.id === id);
    if (!base) return;
    onShapeUpdate({
      ...base,
      x: node.x(), y: node.y(),
      width: Math.max(4, (base.width ?? 0) * scaleX),
      height: Math.max(4, (base.height ?? 0) * scaleY),
    });
  }, [shapes, onShapeUpdate]);

  const shapeProps = (s: WhiteboardShape) => ({
    id: s.id,
    draggable: tool === 'select',
    onClick: () => tool === 'select' && onSelectId(s.id),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(e, s.id),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(e, s.id),
  });

  const renderShape = (s: WhiteboardShape, isDraft = false) => {
    const props = isDraft
      ? { key: '_draft', listening: false }
      : shapeProps(s);

    if (s.type === 'rect') {
      const x = (s.width ?? 0) < 0 ? s.x + (s.width ?? 0) : s.x;
      const y = (s.height ?? 0) < 0 ? s.y + (s.height ?? 0) : s.y;
      return <Rect {...props} x={x} y={y}
        width={Math.abs(s.width ?? 0)} height={Math.abs(s.height ?? 0)}
        fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
    }
    if (s.type === 'ellipse') {
      return <Ellipse {...props}
        x={s.x + (s.width ?? 0) / 2} y={s.y + (s.height ?? 0) / 2}
        radiusX={Math.abs((s.width ?? 0) / 2)} radiusY={Math.abs((s.height ?? 0) / 2)}
        fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
    }
    if (s.type === 'line') {
      return <Line {...props} points={s.points ?? []}
        stroke={s.stroke} strokeWidth={s.strokeWidth} lineCap="round" />;
    }
    return null;
  };

  return (
    <Stage
      ref={stageRef}
      width={stageSize.w}
      height={stageSize.h}
      style={{ background: '#0f0f17', cursor: tool === 'select' ? 'default' : 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Layer>
        {shapes.map(s => renderShape(s))}
        {draft && renderShape(draft, true)}
        <Transformer ref={trRef} rotateEnabled={false}
          boundBoxFunc={(_old, neo) => ({
            ...neo,
            width: Math.max(4, neo.width),
            height: Math.max(4, neo.height),
          })}
        />
      </Layer>
    </Stage>
  );
}
