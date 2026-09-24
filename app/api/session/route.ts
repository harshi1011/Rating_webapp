import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import { createSession, getSession, getThoughtById } from "@/lib/session";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const cookieStore = cookies();
    let sessionId = cookieStore.get("session_id")?.value || null;
    let session = null;

    if (sessionId) {
      session = await getSession(sessionId);
    }

    // If no session or invalid, create new one
    if (!session) {
      session = await createSession();
      cookieStore.set("session_id", session.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    // If completed, return finished (do not create new session, do not return new thought)
    if (session.completed) {
      return NextResponse.json({
        finished: true,
        completed: true,
        questionNumber: 3,
        totalQuestions: 3,
        shownThoughtIds: session.thought_ids,
        isFinal: true,
      });
    }

    const currentThoughtId = session.thought_ids[session.current_index];
    const thought = await getThoughtById(currentThoughtId);
    if (!thought) {
      return NextResponse.json({ error: "Thought not found" }, { status: 500 });
    }

    return NextResponse.json({
      finished: false,
      completed: false,
      sessionId: session.id,
      thought,
      questionNumber: session.current_index + 1, // 1..3
      totalQuestions: 3,
      shownThoughtIds: session.thought_ids.slice(0, session.current_index),
      currentThoughtId,
      isFinal: session.current_index === 2, // third thought is final
      // backend is source of truth for these:
      currentIndex: session.current_index,
    });
  } catch (err) {
    console.error("[GET /api/session] error:", err);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
