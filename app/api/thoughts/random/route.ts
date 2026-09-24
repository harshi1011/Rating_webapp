import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, content, category, created_at
      FROM thoughts
      ORDER BY RANDOM()
      LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "No thoughts found" }, { status: 404 });
    }
    return NextResponse.json({ thought: rows[0] });
  } catch (err) {
    console.error("[GET /api/thoughts/random] error:", err);
    return NextResponse.json({ error: "Failed to load thought" }, { status: 500 });
  }
}
