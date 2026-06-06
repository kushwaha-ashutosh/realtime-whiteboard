import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMsg, ServerMsg } from './types';
import {
  getOrCreateRoom,
  applyShapeAdd,
  applyShapeUpdate,
  applyShapeDelete,
  applyClear,
} from './rooms';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const STATIC_DIR = path.join(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve the React build
app.use(express.static(STATIC_DIR));
// SPA fallback — any unknown path serves index.html so React Router handles it
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

function send(ws: WebSocket, msg: ServerMsg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(roomId: string, msg: ServerMsg, except?: WebSocket) {
  const room = getOrCreateRoom(roomId);
  for (const client of room.clients) {
    if (client !== except) send(client, msg);
  }
}

wss.on('connection', (ws) => {
  let currentRoomId: string | null = null;

  ws.on('message', (data) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(data.toString()) as ClientMsg;
    } catch {
      return;
    }

    if (msg.type === 'join') {
      // Leave previous room if any
      if (currentRoomId) {
        const prev = getOrCreateRoom(currentRoomId);
        prev.clients.delete(ws);
      }
      currentRoomId = msg.roomId;
      const room = getOrCreateRoom(currentRoomId);
      room.clients.add(ws);
      // Send full board state to the newly joined client
      send(ws, { type: 'init', shapes: room.shapes });
      return;
    }

    if (!currentRoomId) return; // must join first

    switch (msg.type) {
      case 'shape_add':
        applyShapeAdd(getOrCreateRoom(currentRoomId), msg.shape);
        broadcast(currentRoomId, msg, ws);
        break;
      case 'shape_update':
        applyShapeUpdate(getOrCreateRoom(currentRoomId), msg.shape);
        broadcast(currentRoomId, msg, ws);
        break;
      case 'shape_delete':
        applyShapeDelete(getOrCreateRoom(currentRoomId), msg.id);
        broadcast(currentRoomId, msg, ws);
        break;
      case 'clear':
        applyClear(getOrCreateRoom(currentRoomId));
        broadcast(currentRoomId, msg, ws);
        break;
    }
  });

  ws.on('close', () => {
    if (currentRoomId) {
      const room = getOrCreateRoom(currentRoomId);
      room.clients.delete(ws);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Whiteboard server listening on http://localhost:${PORT}`);
});
