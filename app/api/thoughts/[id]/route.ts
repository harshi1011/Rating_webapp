import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid thought id" }, { status: 400 });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, content, category, created_at
      FROM thoughts
      WHERE id = ${id}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Thought not found" }, { status: 404 });
    }
    return NextResponse.json({ thought: rows[0] });
  } catch (err) {
    console.error(`[GET /api/thoughts/${id}] error:`, err);
    return NextResponse.json({ error: "Failed to load thought" }, { status: 500 });
  }
}
