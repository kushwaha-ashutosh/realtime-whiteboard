import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Ellipse, Line, Transformer } from 'react-konva';
import Konva from 'konva';
import type { WhiteboardShape, ShapeType } from '../types';
import { nanoid } from '../utils/id';

interface Props {
  tool: ShapeType | 'select';
  color: string;
  shapes: WhiteboardShape[];
  onShapesChange: (shapes: WhiteboardShape[]) => void;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
}

export default function WhiteboardCanvas({ tool, color, shapes, onShapesChange, selectedId, onSelectId }: Props) {
  const isDrawing = useRef(false);
  const drawingId = useRef<string | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
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
    const id = nanoid();
    drawingId.current = id;

    const base = { id, fill: tool === 'line' ? 'transparent' : color + '55', stroke: color, strokeWidth: 2 };

    let shape: WhiteboardShape;
    if (tool === 'rect') {
      shape = { ...base, type: 'rect', x: pos.x, y: pos.y, width: 0, height: 0 };
    } else if (tool === 'ellipse') {
      shape = { ...base, type: 'ellipse', x: pos.x, y: pos.y, width: 0, height: 0 };
    } else {
      shape = { ...base, type: 'line', x: 0, y: 0, points: [pos.x, pos.y, pos.x, pos.y] };
    }
    onShapesChange([...shapes, shape]);
  }, [tool, color, shapes, onShapesChange, onSelectId]);

  const handleMouseMove = useCallback(() => {
    if (!isDrawing.current || !drawingId.current) return;
    const pos = getPointer();
    onShapesChange(shapes.map(s => {
      if (s.id !== drawingId.current) return s;
      if (s.type === 'rect') {
        return { ...s, width: pos.x - s.x, height: pos.y - s.y };
      } else if (s.type === 'ellipse') {
        return { ...s, width: pos.x - s.x, height: pos.y - s.y };
      } else if (s.type === 'line' && s.points) {
        return { ...s, points: [s.points[0], s.points[1], pos.x, pos.y] };
      }
      return s;
    }));
  }, [shapes, onShapesChange]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    // Remove zero-size shapes
    onShapesChange(shapes.filter(s => {
      if (s.id !== drawingId.current) return true;
      if (s.type === 'line') return s.points && Math.abs(s.points[2] - s.points[0]) + Math.abs(s.points[3] - s.points[1]) > 2;
      return Math.abs(s.width ?? 0) > 2 && Math.abs(s.height ?? 0) > 2;
    }));
    drawingId.current = null;
  }, [shapes, onShapesChange]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    onShapesChange(shapes.map(s => s.id === id ? { ...s, x: e.target.x(), y: e.target.y() } : s));
  }, [shapes, onShapesChange]);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>, id: string) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onShapesChange(shapes.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        x: node.x(), y: node.y(),
        width: Math.max(4, (s.width ?? 0) * scaleX),
        height: Math.max(4, (s.height ?? 0) * scaleY),
      };
    }));
  }, [shapes, onShapesChange]);

  const shapeProps = (s: WhiteboardShape) => ({
    id: s.id,
    draggable: tool === 'select',
    onClick: () => tool === 'select' && onSelectId(s.id),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(e, s.id),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(e, s.id),
  });

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
        {shapes.map(s => {
          if (s.type === 'rect') {
            const x = s.width! < 0 ? s.x + s.width! : s.x;
            const y = s.height! < 0 ? s.y + s.height! : s.y;
            return <Rect key={s.id} {...shapeProps(s)} x={x} y={y}
              width={Math.abs(s.width!)} height={Math.abs(s.height!)}
              fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
          }
          if (s.type === 'ellipse') {
            return <Ellipse key={s.id} {...shapeProps(s)}
              x={s.x + (s.width! / 2)} y={s.y + (s.height! / 2)}
              radiusX={Math.abs(s.width! / 2)} radiusY={Math.abs(s.height! / 2)}
              fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
          }
          if (s.type === 'line') {
            return <Line key={s.id} {...shapeProps(s)} points={s.points!}
              stroke={s.stroke} strokeWidth={s.strokeWidth} lineCap="round" />;
          }
          return null;
        })}
        <Transformer ref={trRef} rotateEnabled={false} boundBoxFunc={(_old, neo) => ({
          ...neo, width: Math.max(4, neo.width), height: Math.max(4, neo.height),
        })} />
      </Layer>
    </Stage>
  );
}
