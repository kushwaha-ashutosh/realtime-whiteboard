import 'dotenv/config';
import { Pool } from 'pg';
import { createHash } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');

export async function migrate(): Promise<void> {
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='rooms' AND column_name='state'
      ) THEN
        DROP TABLE rooms;
      END IF;
    END
    $$
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id         TEXT PRIMARY KEY,
      ydoc_state BYTEA,
      password   TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS password TEXT`);
}

export async function loadYDocState(roomId: string): Promise<Uint8Array | null> {
  const res = await pool.query<{ ydoc_state: Buffer }>(
    'SELECT ydoc_state FROM rooms WHERE id = $1',
    [roomId],
  );
  const buf = res.rows[0]?.ydoc_state;
  return buf ? new Uint8Array(buf) : null;
}

export async function saveYDocState(roomId: string, state: Uint8Array): Promise<void> {
  await pool.query(
    `INSERT INTO rooms (id, ydoc_state, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO UPDATE
       SET ydoc_state = EXCLUDED.ydoc_state,
           updated_at = EXCLUDED.updated_at`,
    [roomId, Buffer.from(state)],
  );
}

export async function getRoomPasswordHash(roomId: string): Promise<string | null> {
  const res = await pool.query<{ password: string | null }>(
    'SELECT password FROM rooms WHERE id = $1',
    [roomId],
  );
  return res.rows[0]?.password ?? null;
}

export async function setRoomPassword(roomId: string, hash: string): Promise<void> {
  await pool.query(
    `INSERT INTO rooms (id, password, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET password = $2, updated_at = NOW()`,
    [roomId, hash],
  );
}

export async function clearRoomPassword(roomId: string): Promise<void> {
  await pool.query(
    'UPDATE rooms SET password = NULL WHERE id = $1',
    [roomId],
  );
}
