import 'dotenv/config';
import { Pool } from 'pg';
import type { WhiteboardShape } from './types';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id         TEXT PRIMARY KEY,
      state      JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function loadRoom(roomId: string): Promise<WhiteboardShape[]> {
  const res = await pool.query<{ state: WhiteboardShape[] }>(
    'SELECT state FROM rooms WHERE id = $1',
    [roomId],
  );
  return res.rows[0]?.state ?? [];
}

export async function saveRoom(roomId: string, shapes: WhiteboardShape[]): Promise<void> {
  await pool.query(
    `INSERT INTO rooms (id, state, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE
       SET state = EXCLUDED.state,
           updated_at = EXCLUDED.updated_at`,
    [roomId, JSON.stringify(shapes)],
  );
}
