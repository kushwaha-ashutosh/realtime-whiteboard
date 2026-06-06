import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { WhiteboardShape } from '../types';

function getWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.DEV
    ? `${window.location.hostname}:3001`
    : window.location.host;
  return `${proto}//${host}`;
}

export interface CursorState {
  x: number;
  y: number;
  name: string;
  color: string;
}

export interface YjsHandle {
  shapes: WhiteboardShape[];
  addShape: (s: WhiteboardShape) => void;
  updateShape: (s: WhiteboardShape) => void;
  deleteShape: (id: string) => void;
  clearShapes: () => void;
  updateCursor: (x: number, y: number) => void;
  cursors: Map<number, CursorState>;
  myClientId: number;
  undo: () => void;
  redo: () => void;
}

const COLORS = ['#f97316','#eab308','#22c55e','#06b6d4','#8b5cf6','#ec4899','#ef4444'];
function colorForId(id: number) { return COLORS[id % COLORS.length]; }


export function useYjs(roomId: string, displayName: string): YjsHandle {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const mapRef = useRef<Y.Map<WhiteboardShape> | null>(null);
  const undoRef = useRef<Y.UndoManager | null>(null);
  const [shapes, setShapes] = useState<WhiteboardShape[]>([]);
  const [cursors, setCursors] = useState<Map<number, CursorState>>(new Map());
  const [myClientId, setMyClientId] = useState(0);

  useEffect(() => {
    const doc = new Y.Doc();
    const wsUrl = getWsUrl();
    const provider = new WebsocketProvider(wsUrl, `yjs/${roomId}`, doc, { connect: true });
    const shapeMap = doc.getMap<WhiteboardShape>('shapes');

    docRef.current = doc;
    providerRef.current = provider;
    mapRef.current = shapeMap;
    // UndoManager scoped to only the shapes map so Ctrl-Z undoes YOUR edits, not others'
    const undoManager = new Y.UndoManager(shapeMap, { captureTimeout: 500 });
    undoRef.current = undoManager;

    setMyClientId(doc.clientID);

    // Set our own awareness state
    provider.awareness.setLocalStateField('cursor', {
      x: 0, y: 0, name: displayName, color: colorForId(doc.clientID),
    });

    // Re-render shapes when map changes
    const shapeObserver = () => setShapes(Array.from(shapeMap.values()));
    shapeMap.observe(shapeObserver);
    setShapes(Array.from(shapeMap.values()));

    // Re-render cursors when awareness changes
    const awarenessHandler = () => {
      const next = new Map<number, CursorState>();
      provider.awareness.getStates().forEach((state, clientId) => {
        if (state.cursor) next.set(clientId, state.cursor as CursorState);
      });
      setCursors(next);
    };
    provider.awareness.on('change', awarenessHandler);

    return () => {
      shapeMap.unobserve(shapeObserver);
      provider.awareness.off('change', awarenessHandler);
      undoManager.destroy();
      provider.destroy();
      doc.destroy();
    };
  }, [roomId, displayName]);

  const addShape = useCallback((s: WhiteboardShape) => mapRef.current?.set(s.id, s), []);
  const updateShape = useCallback((s: WhiteboardShape) => mapRef.current?.set(s.id, s), []);
  const deleteShape = useCallback((id: string) => mapRef.current?.delete(id), []);
  const clearShapes = useCallback(() => {
    const m = mapRef.current;
    const doc = docRef.current;
    if (!m || !doc) return;
    doc.transact(() => { for (const key of m.keys()) m.delete(key); });
  }, []);

  const updateCursor = useCallback((x: number, y: number) => {
    providerRef.current?.awareness.setLocalStateField('cursor', {
      x, y, name: displayName, color: colorForId(docRef.current?.clientID ?? 0),
    });
  }, []);

  const undo = useCallback(() => undoRef.current?.undo(), []);
  const redo = useCallback(() => undoRef.current?.redo(), []);

  return { shapes, addShape, updateShape, deleteShape, clearShapes, updateCursor, cursors, myClientId, undo, redo };
}
