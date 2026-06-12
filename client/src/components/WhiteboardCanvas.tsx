import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Ellipse, Line, Transformer, Arrow, Text, Group } from 'react-konva';
import type Konva from 'konva';
import type { WhiteboardShape, ShapeType, Viewport } from '../types';
import { nanoid } from '../utils/id';

interface Props {
  tool: ShapeType | 'select';
  color: string;
  strokeWidth: number;
  shapes: WhiteboardShape[];
  onShapeAdd: (shape: WhiteboardShape) => void;
  onShapeUpdate: (shape: WhiteboardShape) => void;
  onShapeDelete: (id: string) => void;
  onCursorMove?: (x: number, y: number) => void;
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  stageRef?: React.RefObject<Konva.Stage | null>;
  viewport: Viewport;
  onViewportChange: (v: Viewport) => void;
}

function getShapeBounds(s: WhiteboardShape) {
  if (s.type === 'line' || s.type === 'arrow' || s.type === 'pen') {
    const pts = s.points ?? [];
    if (pts.length < 2) return null;
    const xs = pts.filter((_, i) => i % 2 === 0);
    const ys = pts.filter((_, i) => i % 2 === 1);
    return {
      x: Math.min(...xs), y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
  }
  const x = (s.width ?? 0) < 0 ? s.x + (s.width ?? 0) : s.x;
  const y = (s.height ?? 0) < 0 ? s.y + (s.height ?? 0) : s.y;
  return { x, y, w: Math.abs(s.width ?? 0), h: Math.abs(s.height ?? 0) };
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

export default function WhiteboardCanvas({
  tool, color, strokeWidth, shapes,
  onShapeAdd, onShapeUpdate, onShapeDelete, onCursorMove,
  selectedIds, onSelectIds,
  stageRef: externalStageRef,
  viewport, onViewportChange,
}: Props) {
  void onShapeDelete; // exposed for parent; canvas uses onSelectIds + parent deletes
  const [draft, setDraft] = useState<WhiteboardShape | null>(null);
  const isDrawing = useRef(false);
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = (externalStageRef ?? internalStageRef) as React.RefObject<Konva.Stage | null>;
  const trRef = useRef<Konva.Transformer>(null);
  const [stageSize, setStageSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const penPointsRef = useRef<number[]>([]);

  const [editingShape, setEditingShape] = useState<WhiteboardShape | null>(null);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [lasso, setLasso] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const lassoStart = useRef<{ x: number; y: number } | null>(null);

  const spaceDown = useRef(false);
  const isPanning = useRef(false);
  const panStart = useRef({ mx: 0, my: 0, vx: 0, vy: 0 });
  const viewportRef = useRef(viewport);
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);

  // Space bar for pan mode
  useEffect(() => {
    const onKD = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' && !e.repeat &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        spaceDown.current = true;
      }
    };
    const onKU = (e: KeyboardEvent) => {
      if (e.code === 'Space') { spaceDown.current = false; isPanning.current = false; }
    };
    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup', onKU);
    return () => { window.removeEventListener('keydown', onKD); window.removeEventListener('keyup', onKU); };
  }, []);

  useEffect(() => {
    const handler = () => setStageSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Sync transformer to selected nodes
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    if (selectedIds.length > 0) {
      const nodes = selectedIds
        .map(id => stageRef.current!.findOne('#' + id))
        .filter(Boolean) as Konva.Node[];
      trRef.current.nodes(nodes);
      trRef.current.getLayer()?.batchDraw();
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds, shapes]);

  // Focus textarea on editing start
  useEffect(() => {
    if (editingShape) {
      const existing = shapes.find(s => s.id === editingShape.id);
      setEditText(existing?.text ?? editingShape.text ?? '');
      setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.select(); }, 30);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingShape?.id]);

  const getPointer = useCallback(
    () => stageRef.current?.getRelativePointerPosition() ?? { x: 0, y: 0 },
    []
  );
  const getScreenPointer = useCallback(
    () => stageRef.current?.getPointerPosition() ?? { x: 0, y: 0 },
    []
  );

  const commitTextEdit = useCallback(() => {
    if (!editingShape) return;
    onShapeUpdate({ ...editingShape, text: editText });
    setEditingShape(null);
  }, [editingShape, editText, onShapeUpdate]);

  const startEditing = useCallback((shape: WhiteboardShape) => {
    onSelectIds([]);
    setEditingShape(shape);
  }, [onSelectIds]);

  // Wheel => zoom centered on cursor
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const vp = viewportRef.current;
    const pointer = stage.getPointerPosition()!;
    const mousePointTo = {
      x: (pointer.x - vp.x) / vp.scale,
      y: (pointer.y - vp.y) / vp.scale,
    };
    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = Math.max(0.05, Math.min(8, direction > 0 ? vp.scale * 1.1 : vp.scale / 1.1));
    onViewportChange({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
      scale: newScale,
    });
  }, [onViewportChange]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (editingShape) { commitTextEdit(); return; }

    // Middle-click or Space+drag => pan
    if (e.evt.button === 1 || spaceDown.current) {
      e.evt.preventDefault();
      const screen = getScreenPointer();
      const vp = viewportRef.current;
      panStart.current = { mx: screen.x, my: screen.y, vx: vp.x, vy: vp.y };
      isPanning.current = true;
      return;
    }

    if (tool === 'select') {
      if (e.target === stageRef.current) {
        // Start rubber-band lasso
        const pos = getPointer();
        lassoStart.current = pos;
        setLasso({ x: pos.x, y: pos.y, w: 0, h: 0 });
        onSelectIds([]);
      }
      return;
    }

    isDrawing.current = true;
    const pos = getPointer();
    const base = {
      id: nanoid(),
      fill: (tool === 'line' || tool === 'pen' || tool === 'arrow') ? 'transparent' : color + '55',
      stroke: color,
      strokeWidth,
    };

    let shape: WhiteboardShape;
    switch (tool) {
      case 'rect':
        shape = { ...base, type: 'rect', x: pos.x, y: pos.y, width: 0, height: 0 }; break;
      case 'ellipse':
        shape = { ...base, type: 'ellipse', x: pos.x, y: pos.y, width: 0, height: 0 }; break;
      case 'line':
        shape = { ...base, type: 'line', x: 0, y: 0, points: [pos.x, pos.y, pos.x, pos.y] }; break;
      case 'arrow':
        shape = { ...base, type: 'arrow', x: 0, y: 0, points: [pos.x, pos.y, pos.x, pos.y] }; break;
      case 'pen':
        penPointsRef.current = [pos.x, pos.y];
        shape = { ...base, type: 'pen', x: 0, y: 0, points: [pos.x, pos.y] }; break;
      case 'text':
        shape = { ...base, type: 'text', x: pos.x, y: pos.y, width: 240, height: 40,
          fill: 'transparent', stroke: color, fontSize: 18, text: '' }; break;
      case 'sticky':
        shape = { ...base, type: 'sticky', x: pos.x, y: pos.y, width: 0, height: 0,
          fill: color + 'cc', fontSize: 14, text: '' }; break;
      default: return;
    }
    setDraft(shape);
  }, [tool, color, strokeWidth, onSelectIds, editingShape, commitTextEdit, getPointer, getScreenPointer]);

  const handleMouseMove = useCallback((_e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getPointer();
    onCursorMove?.(pos.x, pos.y);

    if (isPanning.current) {
      const screen = getScreenPointer();
      const dx = screen.x - panStart.current.mx;
      const dy = screen.y - panStart.current.my;
      onViewportChange({ x: panStart.current.vx + dx, y: panStart.current.vy + dy, scale: viewportRef.current.scale });
      return;
    }

    if (lassoStart.current && tool === 'select') {
      const sx = lassoStart.current.x;
      const sy = lassoStart.current.y;
      setLasso({
        x: Math.min(sx, pos.x), y: Math.min(sy, pos.y),
        w: Math.abs(pos.x - sx), h: Math.abs(pos.y - sy),
      });
      return;
    }

    if (!isDrawing.current || !draft) return;

    setDraft(prev => {
      if (!prev) return prev;
      switch (prev.type) {
        case 'rect': case 'sticky':
          return { ...prev, width: pos.x - prev.x, height: pos.y - prev.y };
        case 'ellipse':
          return { ...prev, width: pos.x - prev.x, height: pos.y - prev.y };
        case 'line': case 'arrow':
          return { ...prev, points: [prev.points![0], prev.points![1], pos.x, pos.y] };
        case 'pen': {
          penPointsRef.current = [...penPointsRef.current, pos.x, pos.y];
          return { ...prev, points: penPointsRef.current };
        }
        default: return prev;
      }
    });
  }, [draft, tool, onCursorMove, getPointer, getScreenPointer, onViewportChange]);

  const handleMouseUp = useCallback((_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning.current) { isPanning.current = false; return; }

    if (lassoStart.current && tool === 'select') {
      lassoStart.current = null;
      if (lasso && (lasso.w > 4 || lasso.h > 4)) {
        const hits = shapes.filter(s => {
          const b = getShapeBounds(s);
          return b && rectsOverlap(b, lasso);
        });
        onSelectIds(hits.map(s => s.id));
      }
      setLasso(null);
      return;
    }

    if (!isDrawing.current || !draft) return;
    isDrawing.current = false;

    const isTrivial = (() => {
      switch (draft.type) {
        case 'line': case 'arrow': {
          const pts = draft.points!;
          return Math.abs(pts[2] - pts[0]) + Math.abs(pts[3] - pts[1]) <= 2;
        }
        case 'pen': return (draft.points?.length ?? 0) < 4;
        case 'text': return false;
        case 'sticky': return Math.abs(draft.width ?? 0) < 20 && Math.abs(draft.height ?? 0) < 20;
        default: return Math.abs(draft.width ?? 0) <= 2 && Math.abs(draft.height ?? 0) <= 2;
      }
    })();

    if (!isTrivial) {
      const finalDraft = draft.type === 'text' ? { ...draft, width: 240, height: 40 } : draft;
      const committed = (draft.type === 'sticky' && Math.abs(draft.width ?? 0) < 20)
        ? { ...finalDraft, width: 200, height: 150 } : finalDraft;
      onShapeAdd(committed);
      if (committed.type === 'text' || committed.type === 'sticky') startEditing(committed);
    }
    setDraft(null);
    penPointsRef.current = [];
  }, [draft, lasso, tool, shapes, onShapeAdd, onSelectIds, startEditing]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    const base = shapes.find(s => s.id === id);
    if (!base) return;
    if (base.type === 'line' || base.type === 'arrow' || base.type === 'pen') {
      const dx = e.target.x(); const dy = e.target.y();
      const pts = base.points ?? [];
      const newPts = pts.map((v, i) => v + (i % 2 === 0 ? dx : dy));
      e.target.x(0); e.target.y(0);
      onShapeUpdate({ ...base, points: newPts });
    } else {
      onShapeUpdate({ ...base, x: e.target.x(), y: e.target.y() });
    }
  }, [shapes, onShapeUpdate]);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>, id: string) => {
    const node = e.target;
    const scaleX = node.scaleX(); const scaleY = node.scaleY();
    node.scaleX(1); node.scaleY(1);
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
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (tool !== 'select') return;
      if (e.evt.shiftKey) {
        onSelectIds(
          selectedIds.includes(s.id)
            ? selectedIds.filter(i => i !== s.id)
            : [...selectedIds, s.id]
        );
      } else {
        onSelectIds([s.id]);
      }
    },
    onDblClick: () => { if (s.type === 'text' || s.type === 'sticky') startEditing(s); },
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
          stroke={s.stroke} strokeWidth={s.strokeWidth} lineCap="round" lineJoin="round" tension={0.4} />;
      case 'arrow':
        return <Arrow key={key} {...extra} points={s.points ?? []}
          stroke={s.stroke} strokeWidth={s.strokeWidth} fill={s.stroke}
          pointerLength={10} pointerWidth={8} lineCap="round" />;
      case 'text':
        return <Text key={key} {...extra} x={s.x} y={s.y}
          text={isEditing ? '' : (s.text || '(click to type)')}
          fontSize={s.fontSize ?? 18} fill={isEditing ? 'transparent' : s.stroke}
          width={s.width ?? 240} wrap="word" />;
      case 'sticky': {
        const w = Math.abs(s.width ?? 200); const h = Math.abs(s.height ?? 150);
        const sx = (s.width ?? 0) < 0 ? s.x + (s.width ?? 0) : s.x;
        const sy = (s.height ?? 0) < 0 ? s.y + (s.height ?? 0) : s.y;
        return (
          <Group key={key} {...extra} x={sx} y={sy}>
            <Rect width={w} height={h} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} cornerRadius={6} />
            <Text text={isEditing ? '' : (s.text || '(double-click to type)')}
              x={10} y={10} width={w - 20} fontSize={s.fontSize ?? 14}
              fill="#1f2937" wrap="word" listening={false} />
          </Group>
        );
      }
      default: return null;
    }
  };

  // Convert world coords to screen for the textarea overlay
  const textareaStyle = (): React.CSSProperties => {
    if (!editingShape) return { display: 'none' };
    const isSticky = editingShape.type === 'sticky';
    const wx = (editingShape.width ?? 0) < 0 ? editingShape.x + (editingShape.width ?? 0) : editingShape.x;
    const wy = (editingShape.height ?? 0) < 0 ? editingShape.y + (editingShape.height ?? 0) : editingShape.y;
    const w = Math.abs(editingShape.width ?? 240);
    const h = Math.abs(editingShape.height ?? 40);
    const sc = viewport.scale;
    return {
      position: 'fixed',
      top: wy * sc + viewport.y + (isSticky ? 10 * sc : 0),
      left: wx * sc + viewport.x + (isSticky ? 10 * sc : 0),
      width: (isSticky ? w - 20 : w) * sc,
      minHeight: (isSticky ? h - 20 : h) * sc,
      background: 'transparent',
      border: isSticky ? 'none' : '1.5px dashed #6366f1',
      borderRadius: 4, outline: 'none', resize: 'none', overflow: 'hidden',
      fontFamily: 'sans-serif',
      fontSize: `${(editingShape.fontSize ?? (isSticky ? 14 : 18)) * sc}px`,
      color: isSticky ? '#1f2937' : editingShape.stroke,
      padding: '2px 4px', zIndex: 300, lineHeight: 1.4,
    };
  };

  const cursorStyle = () => {
    if (spaceDown.current) return isPanning.current ? 'grabbing' : 'grab';
    if (tool === 'select') return 'default';
    if (tool === 'text') return 'text';
    return 'crosshair';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1 }}>
      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        style={{ background: 'transparent', cursor: cursorStyle() }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          {shapes.map(s => renderShape(s))}
          {draft && renderShape(draft, true)}
          {lasso && (
            <Rect
              x={lasso.x} y={lasso.y} width={lasso.w} height={lasso.h}
              fill="rgba(99,102,241,0.08)" stroke="#6366f1"
              strokeWidth={1 / viewport.scale}
              dash={[4 / viewport.scale, 4 / viewport.scale]}
              listening={false}
            />
          )}
          <Transformer
            ref={trRef}
            rotateEnabled={false}
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
            if (e.key === 'Escape') commitTextEdit();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commitTextEdit();
          }}
          onBlur={commitTextEdit}
          style={textareaStyle()}
          placeholder={editingShape.type === 'sticky' ? 'Type your note…' : 'Type here…'}
        />
      )}
    </div>
  );
}
