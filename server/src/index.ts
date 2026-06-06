import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import {
  migrate, loadYDocState, saveYDocState,
  getRoomPasswordHash, setRoomPassword, clearRoomPassword, sha256,
} from './db';
import { setupConnection, loadDocState, getOrCreateYRoom } from './yjsServer';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const STATIC_DIR = path.join(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// ── REST API ────────────────────────────────────────────────────────────
app.get('/api/rooms/:roomId/info', async (req, res) => {
  try {
    const hash = await getRoomPasswordHash(req.params.roomId);
    res.json({ locked: !!hash });
  } catch {
    res.json({ locked: false });
  }
});

app.post('/api/rooms/:roomId/lock', async (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password) { res.status(400).json({ error: 'password required' }); return; }
  await setRoomPassword(req.params.roomId, sha256(password));
  res.json({ ok: true });
});

app.delete('/api/rooms/:roomId/lock', async (req, res) => {
  const { password } = req.body as { password?: string };
  const stored = await getRoomPasswordHash(req.params.roomId).catch(() => null);
  if (!stored) { res.json({ ok: true }); return; }
  if (!password || sha256(password) !== stored) {
    res.status(403).json({ error: 'Wrong password' }); return;
  }
  await clearRoomPassword(req.params.roomId);
  res.json({ ok: true });
});

// ── Static / SPA ────────────────────────────────────────────────────────
app.use(express.static(STATIC_DIR));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

// ── Debounced DB saves ──────────────────────────────────────────────────
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

const hydrated = new Set<string>();

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url ?? '/', 'http://placeholder');
  const roomId = url.pathname.replace(/^\/yjs\//, '').split('?')[0] || 'default';
  const pwd = url.searchParams.get('pwd');

  // Password check (fast — single DB read)
  try {
    const storedHash = await getRoomPasswordHash(roomId);
    if (storedHash && pwd !== storedHash) {
      ws.close(4001, 'Wrong password');
      return;
    }
  } catch {
    // If DB is down, allow connection (fail-open)
  }

  setupConnection(ws, roomId, (id, state) => scheduleSave(id, state));

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
