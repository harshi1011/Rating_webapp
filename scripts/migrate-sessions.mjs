import fs from "fs";
import { neon } from "@neondatabase/serverless";
const env = fs.readFileSync(".env.local","utf8");
for(const l of env.split("\n")){const m=l.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}
const sql = neon(process.env.DATABASE_URL);
console.log("Creating sessions table and adding session_id to ratings...");
await sql`CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  thought_ids INTEGER[] NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`;
console.log("sessions table ready");

await sql`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL`;
console.log("ratings.session_id column ready");

await sql`CREATE INDEX IF NOT EXISTS idx_ratings_session_id ON ratings(session_id)`;
console.log("index ready");

const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sessions' ORDER BY ordinal_position`;
console.log("sessions cols", cols);
const rcols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='ratings' ORDER BY ordinal_position`;
console.log("ratings cols", rcols.map(c=>c.column_name));
console.log("Done");
