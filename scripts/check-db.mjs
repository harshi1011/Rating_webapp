import { neon } from "@neondatabase/serverless";
import fs from "fs";
const env = fs.readFileSync(".env.local","utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g,"");
}
const sql = neon(process.env.DATABASE_URL);
const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
console.log("tables:", tables);
try {
  const thoughts = await sql`SELECT COUNT(*) as count FROM thoughts`;
  console.log("thoughts count:", thoughts);
} catch(e){ console.log("thoughts table missing or error:", e.message)}
try {
  const ratings = await sql`SELECT COUNT(*) as count FROM ratings`;
  console.log("ratings count:", ratings);
} catch(e){ console.log("ratings table missing or error:", e.message)}
