import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import { getSession, getThoughtById } from "@/lib/session";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Session not found" }, { status: 400 });
    }
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
    if (!session.completed) {
      return NextResponse.json({ error: "Session not yet completed" }, { status: 400 });
    }

    const sql = getSql();

    // User's 3 ratings for this session, in order of thought_ids
    const userRatings = await sql`
      SELECT thought_id, rating, comment, created_at
      FROM ratings
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
    `;

    // Map thought_id -> user rating
    const ratingMap = new Map<number, any>();
    for (const r of userRatings) ratingMap.set(r.thought_id, r);

    // Build thoughts array in session order
    const thoughts = [];
    for (const tid of session.thought_ids) {
      const thought = await getThoughtById(tid);
      const user = ratingMap.get(tid) || null;
      thoughts.push({
        thought,
        userRating: user?.rating ?? null,
        userComment: user?.comment ?? null,
      });
    }

    // User's average — computed by backend, not frontend
    const userAvgRows = await sql`
      SELECT AVG(rating)::float AS user_average
      FROM ratings
      WHERE session_id = ${sessionId}
    `;
    const userAverage = userAvgRows[0]?.user_average ?? null;

    // Community averages for the 3 thoughts (global, if available)
    const community = [];
    for (const tid of session.thought_ids) {
      const agg = await sql`
        SELECT COUNT(*)::int AS total_ratings, AVG(rating)::float AS average_rating
        FROM ratings
        WHERE thought_id = ${tid}
      `;
      community.push({
        thought_id: tid,
        average_rating: agg[0].average_rating,
        total_ratings: agg[0].total_ratings,
      });
    }

    return NextResponse.json({
      sessionId,
      thought_ids: session.thought_ids,
      thoughts,
      userAverage, // backend computed
      community,
      completed: true,
    });
  } catch (err) {
    console.error("[GET /api/session/result] error:", err);
    return NextResponse.json({ error: "Failed to load result" }, { status: 500 });
  }
}
