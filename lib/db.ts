import { neon } from "@neondatabase/serverless";

// Raw SQL via @neondatabase/serverless. No ORM.
// Uses DATABASE_URL from environment. Never expose to client.
if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL is not set — API routes will fail until configured.");
}

export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export function getSql() {
  if (!sql) throw new Error("DATABASE_URL is not configured");
  return sql;
}
