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

export interface ChatMessage {
  id: string;
  name: string;
  color: string;
  text: string;
  ts: number;
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
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  wsError: 'wrong_password' | null;
}

const COLORS = ['#f97316','#eab308','#22c55e','#06b6d4','#8b5cf6','#ec4899','#ef4444'];
function colorForId(id: number) { return COLORS[id % COLORS.length]; }

function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useYjs(
  roomId: string,
  displayName: string,
  passwordHash?: string,
): YjsHandle {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const mapRef = useRef<Y.Map<WhiteboardShape> | null>(null);
  const chatRef = useRef<Y.Array<ChatMessage> | null>(null);
  const undoRef = useRef<Y.UndoManager | null>(null);
  const [shapes, setShapes] = useState<WhiteboardShape[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursors, setCursors] = useState<Map<number, CursorState>>(new Map());
  const [myClientId, setMyClientId] = useState(0);
  const [wsError, setWsError] = useState<'wrong_password' | null>(null);

  // Keep a ref so the WS URL stays current on reconnect without
  // tearing down the doc (which wipes content) on every lock/unlock.
  const passwordHashRef = useRef(passwordHash);
  useEffect(() => { passwordHashRef.current = passwordHash; }, [passwordHash]);

  useEffect(() => {
    const doc = new Y.Doc();
    const wsUrl = getWsUrl();
    const pwd = passwordHashRef.current;
    const room = pwd ? `yjs/${roomId}?pwd=${pwd}` : `yjs/${roomId}`;
    const provider = new WebsocketProvider(wsUrl, room, doc, { connect: true });
    const shapeMap = doc.getMap<WhiteboardShape>('shapes');
    const chatArr = doc.getArray<ChatMessage>('chat');

    docRef.current = doc;
    providerRef.current = provider;
    mapRef.current = shapeMap;
    chatRef.current = chatArr;

    const undoManager = new Y.UndoManager(shapeMap, { captureTimeout: 500 });
    undoRef.current = undoManager;

    setMyClientId(doc.clientID);
    setWsError(null);

    provider.awareness.setLocalStateField('cursor', {
      x: 0, y: 0, name: displayName, color: colorForId(doc.clientID),
    });

    const shapeObserver = () => setShapes(Array.from(shapeMap.values()));
    shapeMap.observe(shapeObserver);
    setShapes(Array.from(shapeMap.values()));

    const chatObserver = () => setMessages(chatArr.toArray());
    chatArr.observe(chatObserver);
    setMessages(chatArr.toArray());

    const awarenessHandler = () => {
      const next = new Map<number, CursorState>();
      provider.awareness.getStates().forEach((state, clientId) => {
        if (state.cursor) next.set(clientId, state.cursor as CursorState);
      });
      setCursors(next);
    };
    provider.awareness.on('change', awarenessHandler);

    // Detect wrong-password close
    provider.ws?.addEventListener('close', (e: CloseEvent) => {
      if (e.code === 4001) setWsError('wrong_password');
    });

    return () => {
      shapeMap.unobserve(shapeObserver);
      chatArr.unobserve(chatObserver);
      provider.awareness.off('change', awarenessHandler);
      undoManager.destroy();
      provider.destroy();
      doc.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, displayName]); // passwordHash intentionally excluded — changing it (lock/unlock) must not wipe the doc

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
  }, [displayName]);

  const sendMessage = useCallback((text: string) => {
    const doc = docRef.current;
    const arr = chatRef.current;
    if (!arr || !doc) return;
    const color = colorForId(doc.clientID);
    arr.push([{ id: nanoid(), name: displayName, color, text: text.trim(), ts: Date.now() }]);
  }, [displayName]);

  const undo = useCallback(() => undoRef.current?.undo(), []);
  const redo = useCallback(() => undoRef.current?.redo(), []);

  return {
    shapes, addShape, updateShape, deleteShape, clearShapes,
    updateCursor, cursors, myClientId, undo, redo,
    messages, sendMessage, wsError,
  };
}
