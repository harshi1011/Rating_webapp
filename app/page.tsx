"use client";

import { useEffect, useState } from "react";

type Thought = {
  id: number;
  content: string;
  category: string;
  created_at: string;
};

type SessionState = {
  thought: Thought;
  questionNumber: number;
  totalQuestions: number;
  isFinal: boolean;
  shownThoughtIds: number[];
};

type FinalResult = {
  thought_ids: number[];
  thoughts: { thought: Thought; userRating: number | null; userComment: string | null }[];
  userAverage: number | null;
  community: { thought_id: number; average_rating: number | null; total_ratings: number }[];
};

export default function Home() {
  const [thought, setThought] = useState<Thought | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isFinal, setIsFinal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [perThoughtSuccess, setPerThoughtSuccess] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [finalLoading, setFinalLoading] = useState(false);

  async function fetchSession() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/session", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load session");
      if (json.finished) {
        // session already completed — show final result
        setFinished(true);
        await fetchFinalResult();
        return;
      }
      setThought(json.thought);
      setQuestionNumber(json.questionNumber);
      setIsFinal(json.isFinal);
      setPerThoughtSuccess(null);
      setRating(null);
      setComment("");
      setHoverRating(null);
    } catch (e: any) {
      setLoadError(e.message || "Failed to load thought");
    } finally {
      setLoading(false);
    }
  }

  async function fetchFinalResult() {
    setFinalLoading(true);
    try {
      const res = await fetch("/api/session/result", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load result");
      setFinalResult(json);
      setFinished(true);
    } catch (e: any) {
      setLoadError(e.message || "Failed to load final result");
    } finally {
      setFinalLoading(false);
    }
  }

  useEffect(() => {
    fetchSession();
  }, []);

  async function handleRate() {
    setSubmitError(null);
    if (!thought) return;
    if (rating === null) {
      setSubmitError("Please select a rating.");
      return;
    }
    if (comment.trim().length > 500) {
      setSubmitError("Comment must be at most 500 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/session/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          thought_id: thought.id,
          rating,
          comment: comment.trim() ? comment.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit rating");

      // show per-thought success with user's rating (no community)
      setPerThoughtSuccess(rating);

      if (json.finished) {
        // was final thought — no next thought, show final result
        await fetchFinalResult();
      }
      // otherwise we stay on success screen with Next Thought button that will load next thought
    } catch (e: any) {
      setSubmitError(e.message || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    // load next thought from session
    setPerThoughtSuccess(null);
    setRating(null);
    setComment("");
    setHoverRating(null);
    setSubmitError(null);
    await fetchSession();
  }

  const displayRating = hoverRating ?? rating;

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-5 py-8 md:py-10">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">🌙 MY NOT-SO-WEIRD <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">3 AM</span> THOUGHTS</h1>
        </header>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">Loading thought...</div>
      </main>
    );
  }

  if (finished && finalResult) {
    return (
      <main className="max-w-2xl mx-auto px-5 py-8 md:py-10">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">🌙 Your 3 AM Verdict</h1>
          <p className="text-slate-400 mt-2 text-sm">You rated 3 unique thoughts — session complete.</p>
        </header>
        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-xl space-y-6">
          {finalResult.thoughts.map((item, idx) => (
            <div key={item.thought.id} className="rounded-xl border border-white/10 bg-[#0f1530] p-4">
              <div className="text-xs uppercase tracking-widest text-cyan-300">Thought {idx + 1} · {item.thought.category}</div>
              <blockquote className="mt-2 text-lg font-medium text-white">“{item.thought.content}”</blockquote>
              <div className="mt-3 flex gap-1">
                {[1,2,3,4,5].map(n=> <span key={n} className={n <= (item.userRating||0) ? "opacity-100" : "opacity-20"}>⭐</span>)}
                <span className="ml-2 text-sm text-slate-400">{item.userRating} / 5</span>
              </div>
              {item.userComment && <p className="mt-2 text-sm text-slate-400">“{item.userComment}”</p>}
              {(() => {
                const comm = finalResult.community.find(c=>c.thought_id===item.thought.id);
                return comm ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Community: {comm.average_rating !== null ? comm.average_rating.toFixed(1) : "—"} / 5 ({comm.total_ratings} ratings)
                  </p>
                ) : null;
              })()}
            </div>
          ))}
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
            <div className="text-xs uppercase tracking-widest text-emerald-300">Your average</div>
            <div className="mt-1 text-2xl font-extrabold text-white">{finalResult.userAverage !== null ? finalResult.userAverage.toFixed(1) : "—"} <span className="text-sm text-slate-400">/ 5</span></div>
            <p className="mt-1 text-xs text-slate-500">Backend computed from your 3 ratings</p>
          </div>
          <p className="text-center text-xs text-slate-500">Session finished — refresh will keep this result. No more thoughts.</p>
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="max-w-2xl mx-auto px-5 py-8">
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-center text-red-300">{loadError}<button onClick={fetchSession} className="mt-4 block mx-auto rounded-full bg-white px-6 py-2 text-sm font-semibold text-slate-900">Retry</button></div>
      </main>
    );
  }

  if (!thought) return null;

  const isPerThoughtDone = perThoughtSuccess !== null;

  return (
    <main className="max-w-2xl mx-auto px-5 py-8 md:py-10">
      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">🌙 MY NOT-SO-WEIRD <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">3 AM</span> THOUGHTS</h1>
        <p className="text-slate-400 mt-2 text-sm">Question {questionNumber} of 3 — {isFinal ? "final thought" : "keep going"}</p>
        <div className="mt-2 flex justify-center gap-1">
          {[1,2,3].map(n=> <span key={n} className={`h-2 w-6 rounded-full ${n <= questionNumber ? "bg-cyan-400" : n < questionNumber ? "bg-cyan-400" : "bg-white/10" } ${n===questionNumber && !isPerThoughtDone ? "ring-2 ring-white/20" : ""}`} />)}
        </div>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 md:p-7 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-widest text-cyan-200 uppercase">🧠 {thought.category}</span>
          <span className="text-xs text-slate-500">#{thought.id} · {questionNumber}/3</span>
        </div>
        <blockquote className="mt-4 text-xl md:text-2xl font-medium leading-relaxed text-white">“{thought.content}”</blockquote>
        <div className="my-6 h-px bg-white/10" />

        {!isPerThoughtDone ? (
          <>
            <p className="text-center text-sm font-semibold text-slate-300">How weird is this? <span className="text-cyan-300">1 = nah</span> · <span className="text-indigo-300">5 = ultra weird</span></p>
            <div className="mt-3 flex justify-center gap-1.5 md:gap-2">
              {[1,2,3,4,5].map(n=>{
                const active = displayRating !== null && n <= displayRating;
                const selected = rating !== null && n <= rating;
                return (
                  <button key={n} type="button" aria-label={`Rate ${n}`} onMouseEnter={()=>setHoverRating(n)} onMouseLeave={()=>setHoverRating(null)} onClick={()=>setRating(n)} disabled={submitting} className={`relative flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl border text-2xl transition ${active ? "border-amber-400/40 bg-amber-400/20 scale-105" : "border-white/10 bg-white/5 hover:bg-white/10"} ${selected ? "ring-2 ring-amber-400/30" : ""} disabled:opacity-60`}>
                    <span className={active ? "text-amber-300" : "text-slate-500"}>⭐</span><span className="absolute -bottom-1 text-[10px] font-bold text-slate-400">{n}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-center text-xs text-slate-500 min-h-4">
              {displayRating ? (displayRating===1?"Not weird at all":displayRating===2?"A little weird":displayRating===3?"Pretty weird":displayRating===4?"Very weird":"Ultra weird") : "Tap a star 1–5"}
            </p>
            <label className="mt-6 block">
              <span className="text-sm font-medium text-slate-300">Optional comment</span>
              <textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={500} rows={3} placeholder="e.g. Literally me at 2 AM..." disabled={submitting} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#0f1530] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-60" />
              <span className="mt-1 block text-right text-xs text-slate-500">{comment.length}/500</span>
            </label>
            {submitError && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{submitError}</div>}
            <button onClick={handleRate} disabled={submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 py-3.5 font-bold text-white shadow-lg disabled:opacity-60">
              {submitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Submitting...</> : isFinal ? "Finish" : "Rate & Next Thought →"}
            </button>
          </>
        ) : (
          <div className="space-y-4 text-center">
            {finalLoading ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-slate-400">Loading final result...</div>
            ) : isFinal ? (
              <p className="text-sm text-slate-400">You finished 3 thoughts — showing final verdict...</p>
            ) : (
              <button onClick={handleNext} className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 py-3.5 font-bold text-white">Next Thought →</button>
            )}
          </div>
        )}
      </section>

      <footer className="mt-8 text-center text-xs text-slate-500">Backend tracks session • 3 unique thoughts • no repeats • finishes after 3</footer>
    </main>
  );
}
