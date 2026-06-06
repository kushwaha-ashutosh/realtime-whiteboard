import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import { migrate, loadYDocState, saveYDocState } from './db';
import { setupConnection, loadDocState, getOrCreateYRoom } from './yjsServer';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const STATIC_DIR = path.join(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(STATIC_DIR));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

// Debounced DB saves: flush Yjs binary state 1.5s after last update
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleSave(roomId: string, state: Uint8Array) {
  const existing = saveTimers.get(roomId);
  if (existing) clearTimeout(existing);
  saveTimers.set(roomId, setTimeout(() => {
    saveYDocState(roomId, state).catch(err =>
      console.error(`[db] save failed for room ${roomId}:`, err),
    );
    saveTimers.delete(roomId);
  }, 1500));
}

// Track which rooms have been hydrated from DB this server session
const hydrated = new Set<string>();

wss.on('connection', (ws, req) => {
  // Room ID comes from URL path: /yjs/<roomId>
  const roomId = (req.url ?? '').replace(/^\/yjs\//, '') || 'default';

  // Register the connection immediately so it can send/receive right away
  setupConnection(ws, roomId, (id, state) => scheduleSave(id, state));

  // Hydrate from DB asynchronously (once per room per server session).
  // applyUpdate on the Yjs doc will propagate saved state to this client
  // via the normal sync exchange that setupConnection already set up.
  if (!hydrated.has(roomId)) {
    hydrated.add(roomId);
    loadYDocState(roomId)
      .then(saved => {
        if (saved && saved.length > 0) {
          loadDocState(roomId, saved);
          console.log(`[db] hydrated room "${roomId}" (${saved.length} bytes)`);
        }
      })
      .catch(err => console.error('[db] loadYDocState failed:', err));
  }
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
