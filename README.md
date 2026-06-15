# Real-Time Collaborative Whiteboard

A live whiteboard that persists. Open a room link, draw shapes — anyone with the same link sees your edits in real time. Refresh the page and the board is still there.

## What it does

- Draw rectangles, ellipses, and lines
- Select, move, and resize shapes
- Real-time sync via Yjs CRDT — concurrent edits merge correctly
- Live cursors with names for each connected user
- Undo/redo scoped to your own edits (Ctrl+Z / Ctrl+Y)
- Save the board as a PNG
- Rooms are just URLs — share the link to collaborate

## Stack

- **Frontend:** Vite + React + TypeScript + Konva (canvas)
- **Server:** Node + Express + ws (WebSocket)
- **Sync:** Yjs CRDT over WebSocket (hand-rolled sync protocol)
- **Database:** PostgreSQL (Neon) — stores Yjs binary state per room
- **Hosting:** Railway (one warm container)

## Run locally

### Prerequisites
- Node 18+
- A PostgreSQL database (Neon free tier works)

### Steps

```bash
# 1. Install dependencies
cd client && npm install
cd ../server && npm install

# 2. Configure the server
echo "DATABASE_URL=postgresql://..." > server/.env

# 3. Build the client
cd client && npm run build

# 4. Start the server (serves the built client + WebSocket)
cd server && npm start
# Open http://localhost:3001
```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Server port (default: `3001`) |

## Architecture

```
Browser (React + Konva)
  └─ WebsocketProvider (y-websocket client)
       │  Yjs binary frames over WS
       ▼
Node server (Express + ws)
  ├─ Serves client/dist as static files
  ├─ yjsServer.ts: Yjs sync protocol (step1/step2/update + awareness)
  └─ Debounced BYTEA saves to Neon PostgreSQL
```

The Yjs document is the single source of truth. The canvas renders from `Y.Map<shapes>` — nothing is stored in React state or the DOM.

