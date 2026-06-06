import { useEffect, useRef, useState } from 'react';
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

export interface YjsHandle {
  shapes: WhiteboardShape[];
  addShape: (s: WhiteboardShape) => void;
  updateShape: (s: WhiteboardShape) => void;
  deleteShape: (id: string) => void;
  clearShapes: () => void;
  awareness: WebsocketProvider['awareness'] | null;
}

export function useYjs(roomId: string): YjsHandle {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const mapRef = useRef<Y.Map<WhiteboardShape> | null>(null);
  const [shapes, setShapes] = useState<WhiteboardShape[]>([]);
  const [awareness, setAwareness] = useState<WebsocketProvider['awareness'] | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    const wsUrl = getWsUrl();
    const provider = new WebsocketProvider(wsUrl, `yjs/${roomId}`, doc, {
      connect: true,
    });
    const shapeMap = doc.getMap<WhiteboardShape>('shapes');

    docRef.current = doc;
    providerRef.current = provider;
    mapRef.current = shapeMap;
    setAwareness(provider.awareness);

    // Re-render whenever the map changes
    const observer = () => {
      setShapes(Array.from(shapeMap.values()));
    };
    shapeMap.observe(observer);
    // Initial render
    setShapes(Array.from(shapeMap.values()));

    return () => {
      shapeMap.unobserve(observer);
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
      mapRef.current = null;
    };
  }, [roomId]);

  const addShape = (s: WhiteboardShape) => mapRef.current?.set(s.id, s);
  const updateShape = (s: WhiteboardShape) => mapRef.current?.set(s.id, s);
  const deleteShape = (id: string) => mapRef.current?.delete(id);
  const clearShapes = () => {
    const m = mapRef.current;
    if (!m) return;
    const doc = docRef.current!;
    doc.transact(() => { for (const key of m.keys()) m.delete(key); });
  };

  return { shapes, addShape, updateShape, deleteShape, clearShapes, awareness };
}
