import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function migrate(): Promise<void> {
  // If the old Phase-2 schema (state jsonb) exists, drop it — the data is
  // incompatible with the Phase-3 Yjs binary format.
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
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
