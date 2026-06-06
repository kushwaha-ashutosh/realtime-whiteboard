import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Ellipse, Line, Transformer, Arrow, Text, Group } from 'react-konva';
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
  stageOffsetX?: number;
  stageOffsetY?: number;
}

export default function WhiteboardCanvas({
  tool, color, shapes,
  onShapeAdd, onShapeUpdate, onCursorMove,
  selectedId, onSelectId, stageRef: externalStageRef,
  stageOffsetX = 0, stageOffsetY = 0,
}: Props) {
  const [draft, setDraft] = useState<WhiteboardShape | null>(null);
  const isDrawing = useRef(false);
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = (externalStageRef ?? internalStageRef) as React.RefObject<Konva.Stage | null>;
  const trRef = useRef<Konva.Transformer>(null);
  const [stageSize, setStageSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const penPointsRef = useRef<number[]>([]);

  // Text / sticky editing
  const [editingShape, setEditingShape] = useState<WhiteboardShape | null>(null);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingShape) {
      const existing = shapes.find(s => s.id === editingShape.id);
      setEditText(existing?.text ?? editingShape.text ?? '');
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 30);
    }
  }, [editingShape?.id]);

  const getPointer = () => stageRef.current?.getPointerPosition() ?? { x: 0, y: 0 };

  const commitTextEdit = useCallback(() => {
    if (!editingShape) return;
    onShapeUpdate({ ...editingShape, text: editText });
    setEditingShape(null);
  }, [editingShape, editText, onShapeUpdate]);

  const startEditing = useCallback((shape: WhiteboardShape) => {
    onSelectId(null);
    setEditingShape(shape);
  }, [onSelectId]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editingShape) { commitTextEdit(); return; }
    if (tool === 'select') {
      if (e.target === stageRef.current) onSelectId(null);
      return;
    }
    isDrawing.current = true;
    const pos = getPointer();
    const base = {
      id: nanoid(),
      fill: (tool === 'line' || tool === 'pen' || tool === 'arrow') ? 'transparent' : color + '55',
      stroke: color,
      strokeWidth: tool === 'pen' ? 3 : 2,
    };

    let shape: WhiteboardShape;
    switch (tool) {
      case 'rect':
        shape = { ...base, type: 'rect', x: pos.x, y: pos.y, width: 0, height: 0 };
        break;
      case 'ellipse':
        shape = { ...base, type: 'ellipse', x: pos.x, y: pos.y, width: 0, height: 0 };
        break;
      case 'line':
        shape = { ...base, type: 'line', x: 0, y: 0, points: [pos.x, pos.y, pos.x, pos.y] };
        break;
      case 'arrow':
        shape = { ...base, type: 'arrow', x: 0, y: 0, points: [pos.x, pos.y, pos.x, pos.y] };
        break;
      case 'pen':
        penPointsRef.current = [pos.x, pos.y];
        shape = { ...base, type: 'pen', x: 0, y: 0, points: [pos.x, pos.y] };
        break;
      case 'text':
        shape = { ...base, type: 'text', x: pos.x, y: pos.y, width: 240, height: 40,
          fill: 'transparent', stroke: color, fontSize: 18, text: '' };
        break;
      case 'sticky':
        shape = { ...base, type: 'sticky', x: pos.x, y: pos.y, width: 0, height: 0,
          fill: color + 'cc', fontSize: 14, text: '' };
        break;
      default:
        return;
    }
    setDraft(shape);
  }, [tool, color, onSelectId, editingShape, commitTextEdit]);

  const handleMouseMove = useCallback(() => {
    const pos = getPointer();
    onCursorMove?.(pos.x, pos.y);
    if (!isDrawing.current || !draft) return;

    setDraft(prev => {
      if (!prev) return prev;
      switch (prev.type) {
        case 'rect':
        case 'sticky':
          return { ...prev, width: pos.x - prev.x, height: pos.y - prev.y };
        case 'ellipse':
          return { ...prev, width: pos.x - prev.x, height: pos.y - prev.y };
        case 'line':
        case 'arrow':
          return { ...prev, points: [prev.points![0], prev.points![1], pos.x, pos.y] };
        case 'pen': {
          penPointsRef.current = [...penPointsRef.current, pos.x, pos.y];
          return { ...prev, points: penPointsRef.current };
        }
        default:
          return prev;
      }
    });
  }, [draft, onCursorMove]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !draft) return;
    isDrawing.current = false;

    const isTrivial = (() => {
      switch (draft.type) {
        case 'line':
        case 'arrow': {
          const pts = draft.points!;
          return Math.abs(pts[2] - pts[0]) + Math.abs(pts[3] - pts[1]) <= 2;
        }
        case 'pen':
          return (draft.points?.length ?? 0) < 4;
        case 'text':
          return false; // always place
        case 'sticky':
          return Math.abs(draft.width ?? 0) < 20 && Math.abs(draft.height ?? 0) < 20;
        default:
          return Math.abs(draft.width ?? 0) <= 2 && Math.abs(draft.height ?? 0) <= 2;
      }
    })();

    if (!isTrivial) {
      // For small/click-placed text, give it a sensible default size
      const finalDraft = draft.type === 'text' ? { ...draft, width: 240, height: 40 } : draft;
      // For sticky that was just clicked (not dragged), give default size
      const committed = (draft.type === 'sticky' && Math.abs(draft.width ?? 0) < 20)
        ? { ...finalDraft, width: 200, height: 150 }
        : finalDraft;
      onShapeAdd(committed);
      if (committed.type === 'text' || committed.type === 'sticky') {
        startEditing(committed);
      }
    }
    setDraft(null);
    penPointsRef.current = [];
  }, [draft, onShapeAdd, startEditing]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    const base = shapes.find(s => s.id === id);
    if (!base) return;
    if (base.type === 'line' || base.type === 'arrow' || base.type === 'pen') {
      // Absorb the node's x/y offset back into absolute points
      const dx = e.target.x();
      const dy = e.target.y();
      const pts = base.points ?? [];
      const newPts = pts.map((v, i) => v + (i % 2 === 0 ? dx : dy));
      e.target.x(0);
      e.target.y(0);
      onShapeUpdate({ ...base, points: newPts });
    } else {
      onShapeUpdate({ ...base, x: e.target.x(), y: e.target.y() });
    }
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
    onDblClick: () => {
      if (s.type === 'text' || s.type === 'sticky') startEditing(s);
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(e, s.id),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(e, s.id),
  });

  const renderShape = (s: WhiteboardShape, isDraft = false) => {
    const key = isDraft ? '_draft' : s.id;
    const extra = isDraft ? { listening: false } : shapeProps(s);
    const isEditing = editingShape?.id === s.id;

    switch (s.type) {
      case 'rect': {
        const x = (s.width ?? 0) < 0 ? s.x + (s.width ?? 0) : s.x;
        const y = (s.height ?? 0) < 0 ? s.y + (s.height ?? 0) : s.y;
        return <Rect key={key} {...extra} x={x} y={y}
          width={Math.abs(s.width ?? 0)} height={Math.abs(s.height ?? 0)}
          fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
      }
      case 'ellipse':
        return <Ellipse key={key} {...extra}
          x={s.x + (s.width ?? 0) / 2} y={s.y + (s.height ?? 0) / 2}
          radiusX={Math.abs((s.width ?? 0) / 2)} radiusY={Math.abs((s.height ?? 0) / 2)}
          fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />;

      case 'line':
        return <Line key={key} {...extra} points={s.points ?? []}
          stroke={s.stroke} strokeWidth={s.strokeWidth} lineCap="round" lineJoin="round" />;

      case 'pen':
        return <Line key={key} {...extra} points={s.points ?? []}
          stroke={s.stroke} strokeWidth={s.strokeWidth}
          lineCap="round" lineJoin="round" tension={0.4} />;

      case 'arrow':
        return <Arrow key={key} {...extra} points={s.points ?? []}
          stroke={s.stroke} strokeWidth={s.strokeWidth} fill={s.stroke}
          pointerLength={10} pointerWidth={8} lineCap="round" />;

      case 'text':
        return <Text key={key} {...extra}
          x={s.x} y={s.y}
          text={isEditing ? '' : (s.text || '(click to type)')}
          fontSize={s.fontSize ?? 18}
          fill={isEditing ? 'transparent' : s.stroke}
          width={s.width ?? 240}
          wrap="word"
        />;

      case 'sticky': {
        const w = Math.abs(s.width ?? 200);
        const h = Math.abs(s.height ?? 150);
        const sx = (s.width ?? 0) < 0 ? s.x + (s.width ?? 0) : s.x;
        const sy = (s.height ?? 0) < 0 ? s.y + (s.height ?? 0) : s.y;
        return (
          <Group key={key} {...extra} x={sx} y={sy}>
            <Rect width={w} height={h}
              fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} cornerRadius={6} />
            <Text
              text={isEditing ? '' : (s.text || '(double-click to type)')}
              x={10} y={10}
              width={w - 20}
              fontSize={s.fontSize ?? 14}
              fill='#1f2937'
              wrap="word"
              listening={false}
            />
          </Group>
        );
      }

      default:
        return null;
    }
  };

  // Compute textarea position for text/sticky editing
  const textareaStyle = (): React.CSSProperties => {
    if (!editingShape) return { display: 'none' };
    const isSticky = editingShape.type === 'sticky';
    const sx = (editingShape.width ?? 0) < 0
      ? editingShape.x + (editingShape.width ?? 0)
      : editingShape.x;
    const sy = (editingShape.height ?? 0) < 0
      ? editingShape.y + (editingShape.height ?? 0)
      : editingShape.y;
    const w = Math.abs(editingShape.width ?? 240);
    const h = Math.abs(editingShape.height ?? 40);
    return {
      position: 'fixed',
      top: sy + (isSticky ? 10 : 0),
      left: sx + (isSticky ? 10 : 0),
      width: isSticky ? w - 20 : w,
      minHeight: isSticky ? h - 20 : h,
      background: 'transparent',
      border: isSticky ? 'none' : '1.5px dashed #6366f1',
      borderRadius: 4,
      outline: 'none',
      resize: 'none',
      overflow: 'hidden',
      fontFamily: 'sans-serif',
      fontSize: `${editingShape.fontSize ?? (isSticky ? 14 : 18)}px`,
      color: isSticky ? '#1f2937' : editingShape.stroke,
      padding: '2px 4px',
      zIndex: 300,
      lineHeight: 1.4,
    };
  };

  const cursorStyle = () => {
    if (tool === 'select') return 'default';
    if (tool === 'text') return 'text';
    return 'crosshair';
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        x={stageOffsetX}
        y={stageOffsetY}
        style={{ background: '#0f0f17', cursor: cursorStyle() }}
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

      {editingShape && (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') { commitTextEdit(); }
            // Ctrl+Enter commits for sticky; plain Enter adds newline
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { commitTextEdit(); }
          }}
          onBlur={commitTextEdit}
          style={textareaStyle()}
          placeholder={editingShape.type === 'sticky' ? 'Type your note…' : 'Type here…'}
        />
      )}
    </div>
  );
}
