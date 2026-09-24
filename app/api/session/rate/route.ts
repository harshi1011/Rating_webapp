import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import { getSession, advanceSession, getThoughtById } from "@/lib/session";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const MAX_COMMENT_LENGTH = 500;

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { thought_id, rating, comment } = body ?? {};

  // --- basic validation (same as POST /api/ratings) ---
  if (thought_id === undefined || thought_id === null) {
    return NextResponse.json({ error: "thought_id is required" }, { status: 400 });
  }
  const thoughtIdNum = Number(thought_id);
  if (!Number.isInteger(thoughtIdNum) || thoughtIdNum <= 0) {
    return NextResponse.json({ error: "thought_id must be a valid integer" }, { status: 400 });
  }
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
  let normalizedComment: string | null = null;
  if (comment !== undefined && comment !== null) {
    if (typeof comment !== "string") {
      return NextResponse.json({ error: "comment must be a string" }, { status: 400 });
    }
    const trimmed = comment.trim();
    if (trimmed.length === 0) normalizedComment = null;
    else if (trimmed.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ error: `comment must be at most ${MAX_COMMENT_LENGTH} characters` }, { status: 400 });
    } else normalizedComment = trimmed;
  }

  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Session not found. Please refresh." }, { status: 400 });
    }
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
    if (session.completed) {
      return NextResponse.json({ error: "Session already completed" }, { status: 400 });
    }

    // --- session is source of truth: validate thought_id matches current expected ---
    const expectedThoughtId = session.thought_ids[session.current_index];
    if (thoughtIdNum !== expectedThoughtId) {
      return NextResponse.json(
        { error: `Invalid thought for this session. Expected thought ${expectedThoughtId}` },
        { status: 400 }
      );
    }

    const sql = getSql();
    // ensure thought exists (should, but check)
    const existing = await sql`SELECT id FROM thoughts WHERE id = ${thoughtIdNum}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "thought not found" }, { status: 404 });
    }

    // insert rating with session_id
    await sql`
      INSERT INTO ratings (thought_id, rating, comment, session_id)
      VALUES (${thoughtIdNum}, ${ratingNum}, ${normalizedComment}, ${sessionId})
    `;

    // advance session
    const updated = await advanceSession(sessionId);

    // if completed, return finished (no next thought)
    if (updated.completed) {
      return NextResponse.json({
        success: true,
        finished: true,
        completed: true,
        message: "Session completed",
        // do not return next thought
      });
    }

    // else return next thought
    const nextThoughtId = updated.thought_ids[updated.current_index];
    const nextThought = await getThoughtById(nextThoughtId);
    return NextResponse.json({
      success: true,
      finished: false,
      completed: false,
      nextThought,
      questionNumber: updated.current_index + 1,
      totalQuestions: 3,
      isFinal: updated.current_index === 2,
      shownThoughtIds: updated.thought_ids.slice(0, updated.current_index),
    });
  } catch (err) {
    console.error("[POST /api/session/rate] error:", err);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
