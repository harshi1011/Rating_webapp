import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = 'force-dynamic';

const MAX_COMMENT_LENGTH = 500;

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { thought_id, rating, comment } = body ?? {};

  // --- thought_id validation ---
  if (thought_id === undefined || thought_id === null) {
    return NextResponse.json({ error: "thought_id is required" }, { status: 400 });
  }
  const thoughtIdNum = Number(thought_id);
  if (!Number.isInteger(thoughtIdNum) || thoughtIdNum <= 0) {
    return NextResponse.json({ error: "thought_id must be a valid integer" }, { status: 400 });
  }

  // --- rating validation ---
  if (rating === undefined || rating === null) {
    return NextResponse.json({ error: "rating is required" }, { status: 400 });
  }
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum)) {
    return NextResponse.json({ error: "rating must be an integer between 1 and 5" }, { status: 400 });
  }
  if (ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: "rating must be between 1 and 5" }, { status: 400 });
  }

  // --- comment validation ---
  let normalizedComment: string | null = null;
  if (comment !== undefined && comment !== null) {
    if (typeof comment !== "string") {
      return NextResponse.json({ error: "comment must be a string" }, { status: 400 });
    }
    const trimmed = comment.trim();
    if (trimmed.length === 0) {
      normalizedComment = null; // whitespace-only => empty
    } else if (trimmed.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `comment must be at most ${MAX_COMMENT_LENGTH} characters` },
        { status: 400 }
      );
    } else {
      normalizedComment = trimmed;
    }
  }

  try {
    const sql = getSql();

    // --- thought_id must exist ---
    const existing = await sql`SELECT id FROM thoughts WHERE id = ${thoughtIdNum}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "thought not found" }, { status: 404 });
    }

    // --- insert rating (raw SQL) ---
    const rows = await sql`
      INSERT INTO ratings (thought_id, rating, comment)
      VALUES (${thoughtIdNum}, ${ratingNum}, ${normalizedComment})
      RETURNING id, thought_id, rating, comment, created_at
    `;

    return NextResponse.json(
      { success: true, rating: rows[0] },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/ratings] error:", err);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
