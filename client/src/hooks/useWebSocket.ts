import { useEffect, useRef, useCallback } from 'react';
import type { WhiteboardShape } from '../types';

export type ServerMsg =
  | { type: 'init'; shapes: WhiteboardShape[] }
  | { type: 'shape_add'; shape: WhiteboardShape }
  | { type: 'shape_update'; shape: WhiteboardShape }
  | { type: 'shape_delete'; id: string }
  | { type: 'clear' };

export type ClientMsg =
  | { type: 'join'; roomId: string }
  | { type: 'shape_add'; shape: WhiteboardShape }
  | { type: 'shape_update'; shape: WhiteboardShape }
  | { type: 'shape_delete'; id: string }
  | { type: 'clear' };

interface Options {
  roomId: string;
  onMessage: (msg: ServerMsg) => void;
}

function getWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // In dev (Vite proxy) connect to server port directly; in prod same host
  const host = import.meta.env.DEV
    ? `${window.location.hostname}:3001`
    : window.location.host;
  return `${proto}//${host}`;
}

export function useWebSocket({ roomId, onMessage }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', roomId }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as ServerMsg;
        onMessageRef.current(msg);
      } catch { /* ignore bad frames */ }
    };

    ws.onclose = () => {
      // Simple reconnect after 2s
      setTimeout(() => {
        if (wsRef.current === ws) wsRef.current = null;
      }, 2000);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [roomId]);

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  return { send };
}
