/**
 * Minimal Yjs WebSocket sync server.
 *
 * Protocol (matches y-websocket client):
 *   msg[0] = messageType  (0=sync, 1=awareness)
 *   sync step1:  [0, 0, <varlen stateVector>]   client→server
 *   sync step2:  [0, 1, <varlen update>]         server→client
 *   sync update: [0, 2, <varlen update>]          either direction
 *   awareness:   [1, <varlen payload>]
 */

import * as Y from 'yjs';
import { WebSocket } from 'ws';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const SYNC_STEP1 = 0;
const SYNC_STEP2 = 1;
const SYNC_UPDATE = 2;

// ---- varint / framing helpers ----

function writeVarUint(val: number): Uint8Array {
  const bytes: number[] = [];
  while (val > 0x7f) { bytes.push((val & 0x7f) | 0x80); val >>>= 7; }
  bytes.push(val & 0x7f);
  return new Uint8Array(bytes);
}

function readVarUint(buf: Uint8Array, pos: number): [number, number] {
  let result = 0, shift = 0;
  while (true) {
    const byte = buf[pos++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return [result, pos];
    shift += 7;
  }
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

function encodeFrame(data: Uint8Array): Uint8Array {
  return concat(writeVarUint(data.length), data);
}

function readFrame(buf: Uint8Array, pos: number): [Uint8Array, number] {
  const [len, next] = readVarUint(buf, pos);
  return [buf.slice(next, next + len), next + len];
}

function sendBin(ws: WebSocket, data: Uint8Array) {
  if (ws.readyState === WebSocket.OPEN) ws.send(data);
}

// ---- room state ----

interface YRoom {
  doc: Y.Doc;
  clients: Set<WebSocket>;
}

const rooms = new Map<string, YRoom>();

export function getOrCreateYRoom(roomId: string): YRoom {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { doc: new Y.Doc(), clients: new Set() });
  }
  return rooms.get(roomId)!;
}

export function loadDocState(roomId: string, state: Uint8Array): void {
  if (state.length === 0) return;
  const room = getOrCreateYRoom(roomId);
  Y.applyUpdate(room.doc, state);
  // Push the hydrated state to all currently connected clients
  const fullUpdate = Y.encodeStateAsUpdate(room.doc);
  const msg = concat(new Uint8Array([MSG_SYNC, SYNC_UPDATE]), encodeFrame(fullUpdate));
  for (const client of room.clients) {
    sendBin(client, msg);
  }
}

export function encodeDocState(roomId: string): Uint8Array {
  const room = rooms.get(roomId);
  return room ? Y.encodeStateAsUpdate(room.doc) : new Uint8Array(0);
}

// ---- connection handler ----

export type OnDocUpdate = (roomId: string, state: Uint8Array) => void;

export function setupConnection(
  ws: WebSocket,
  roomId: string,
  onDocUpdate: OnDocUpdate,
): void {
  const room = getOrCreateYRoom(roomId);
  room.clients.add(ws);

  function broadcastUpdate(update: Uint8Array, except: WebSocket) {
    const msg = concat(new Uint8Array([MSG_SYNC, SYNC_UPDATE]), encodeFrame(update));
    for (const client of room.clients) {
      if (client !== except) sendBin(client, msg);
    }
  }

  function broadcastAwareness(payload: Uint8Array, except: WebSocket) {
    const msg = concat(new Uint8Array([MSG_AWARENESS]), encodeFrame(payload));
    for (const client of room.clients) {
      if (client !== except) sendBin(client, msg);
    }
  }

  ws.on('message', (raw: Buffer) => {
    const buf = new Uint8Array(raw);
    if (buf.length === 0) return;
    const msgType = buf[0];

    if (msgType === MSG_SYNC) {
      const syncType = buf[1];

      if (syncType === SYNC_STEP1) {
        // Client sends its state vector → reply with diff + our own step1
        const [sv] = readFrame(buf, 2);
        const diff = Y.encodeStateAsUpdate(room.doc, sv);
        sendBin(ws, concat(new Uint8Array([MSG_SYNC, SYNC_STEP2]), encodeFrame(diff)));

        const ourSv = Y.encodeStateVector(room.doc);
        sendBin(ws, concat(new Uint8Array([MSG_SYNC, SYNC_STEP1]), encodeFrame(ourSv)));

      } else if (syncType === SYNC_STEP2 || syncType === SYNC_UPDATE) {
        // Client sends an update → apply, broadcast to everyone else, persist
        const [update] = readFrame(buf, 2);
        Y.applyUpdate(room.doc, update);
        broadcastUpdate(update, ws);           // send to all OTHER clients
        onDocUpdate(roomId, Y.encodeStateAsUpdate(room.doc));
      }

    } else if (msgType === MSG_AWARENESS) {
      const [payload] = readFrame(buf, 1);
      broadcastAwareness(payload, ws);
    }
  });

  ws.on('close', () => {
    room.clients.delete(ws);
  });
}
