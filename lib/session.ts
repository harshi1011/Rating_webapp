import { getSql } from "./db";

export type SessionRow = {
  id: string;
  thought_ids: number[];
  current_index: number;
  completed: boolean;
  created_at: string;
};

export function newSessionId() {
  return crypto.randomUUID();
}

export async function createSession(): Promise<SessionRow> {
  const sql = getSql();
  const id = newSessionId();
  // pick exactly 3 unique thoughts in random order, backend is source of truth
  const thoughtRows = await sql`SELECT id FROM thoughts ORDER BY RANDOM() LIMIT 3`;
  if (thoughtRows.length < 3) throw new Error("Not enough thoughts to create session");
  const thoughtIds = thoughtRows.map((r: any) => r.id as number);
  const rows = await sql`
    INSERT INTO sessions (id, thought_ids, current_index, completed)
    VALUES (${id}, ${thoughtIds}, 0, false)
    RETURNING id, thought_ids, current_index, completed, created_at
  `;
  return rows[0] as SessionRow;
}

export async function getSession(id: string): Promise<SessionRow | null> {
  const sql = getSql();
  const rows = await sql`SELECT id, thought_ids, current_index, completed, created_at FROM sessions WHERE id = ${id}`;
  return (rows[0] as SessionRow) || null;
}

export async function advanceSession(id: string): Promise<SessionRow> {
  const sql = getSql();
  // increment current_index, if reaches 3 mark completed
  const rows = await sql`
    UPDATE sessions
    SET current_index = current_index + 1,
        completed = CASE WHEN current_index + 1 >= 3 THEN true ELSE false END
    WHERE id = ${id}
    RETURNING id, thought_ids, current_index, completed, created_at
  `;
  return rows[0] as SessionRow;
}

export async function getThoughtById(thoughtId: number) {
  const sql = getSql();
  const rows = await sql`SELECT id, content, category, created_at FROM thoughts WHERE id = ${thoughtId}`;
  return rows[0] || null;
}
