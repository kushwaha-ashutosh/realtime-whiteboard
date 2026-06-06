import 'dotenv/config';
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
import { migrate, loadRoom } from './db';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const STATIC_DIR = path.join(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(STATIC_DIR));
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

  ws.on('message', async (data) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(data.toString()) as ClientMsg;
    } catch {
      return;
    }

    if (msg.type === 'join') {
      if (currentRoomId) {
        const prev = getOrCreateRoom(currentRoomId);
        prev.clients.delete(ws);
      }
      currentRoomId = msg.roomId;
      const room = getOrCreateRoom(currentRoomId);
      room.clients.add(ws);

      // Hydrate from DB if this room is fresh in memory
      if (room.shapes.length === 0) {
        try {
          const saved = await loadRoom(currentRoomId);
          if (saved.length > 0) room.shapes = saved;
        } catch (err) {
          console.error('[db] loadRoom failed:', err);
        }
      }

      send(ws, { type: 'init', shapes: room.shapes });
      return;
    }

    if (!currentRoomId) return;

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
      getOrCreateRoom(currentRoomId).clients.delete(ws);
    }
  });
});

migrate()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Whiteboard server listening on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Migration failed — server will not start:', err);
    process.exit(1);
  });
