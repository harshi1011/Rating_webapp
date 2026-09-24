import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    // 1. Thought — FROM thoughts table, raw row
    const thoughtRows = await sql`
      SELECT id, content, category, created_at
      FROM thoughts
      WHERE id = ${id}
    `;
    if (thoughtRows.length === 0) {
      return NextResponse.json({ error: "Thought not found" }, { status: 404 });
    }
    const thought = thoughtRows[0];

    // 2. Community metrics — COMPUTED in backend via SQL aggregation, not stored
    // AVG(rating) and COUNT(*) computed at request time from ratings table
    const agg = await sql`
      SELECT 
        COUNT(*)::int AS total_ratings,
        AVG(rating)::float AS average_rating
      FROM ratings
      WHERE thought_id = ${id}
    `;
    const { total_ratings, average_rating } = agg[0];
    // average_rating is null when 0 ratings, frontend handles empty state

    // 3. Latest comments — FROM ratings, ordered by created_at DESC, limit 10, backend sorted
    const comments = await sql`
      SELECT comment, rating, created_at
      FROM ratings
      WHERE thought_id = ${id} AND comment IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return NextResponse.json({
      thought,
      average_rating, // computed: AVG(rating) from ratings, null if none
      total_ratings,  // computed: COUNT(*) from ratings
      latest_comments: comments, // computed: SELECT ... ORDER BY created_at DESC LIMIT 10
    });
  } catch (err) {
    console.error(`[GET /api/thoughts/${id}/verdict] error:`, err);
    return NextResponse.json({ error: "Failed to load verdict" }, { status: 500 });
  }
}
