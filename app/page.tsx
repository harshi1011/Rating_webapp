"use client";

import { useEffect, useState } from "react";

type Thought = {
  id: number;
  content: string;
  category: string;
  created_at: string;
};

export default function Home() {
  const [thought, setThought] = useState<Thought | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRating, setSubmittedRating] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [verdict, setVerdict] = useState<{
    average_rating: number | null;
    total_ratings: number;
    latest_comments: { comment: string; rating: number; created_at: string }[];
  } | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [verdictError, setVerdictError] = useState<string | null>(null);

  async function loadRandom() {
    setLoading(true);
    setLoadError(null);
    setSubmitError(null);
    setShowSuccess(false);
    setRating(null);
    setComment("");
    setSubmittedRating(null);
    setHoverRating(null);
    setVerdict(null);
    setVerdictError(null);
    setVerdictLoading(false);
    try {
      const res = await fetch("/api/thoughts/random");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load thought");
      setThought(json.thought ?? json);
    } catch (e: any) {
      setLoadError(e.message || "Failed to load thought");
    } finally {
      setLoading(false);
    }
  }

  async function fetchVerdict(thoughtId: number) {
    setVerdictLoading(true);
    setVerdictError(null);
    try {
      const res = await fetch(`/api/thoughts/${thoughtId}/verdict`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load verdict");
      // Backend computes AVG/COUNT — frontend only renders
      setVerdict({
        average_rating: json.average_rating,
        total_ratings: json.total_ratings,
        latest_comments: json.latest_comments ?? [],
      });
    } catch (e: any) {
      setVerdictError(e.message || "Failed to load verdict");
    } finally {
      setVerdictLoading(false);
    }
  }

  useEffect(() => {
    loadRandom();
  }, []);

  async function handleSubmit() {
    setSubmitError(null);
    if (!thought) {
      setSubmitError("No thought loaded");
      return;
    }
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
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thought_id: thought.id,
          rating,
          comment: comment.trim() ? comment.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit rating");
      setSubmittedRating(rating);
      setShowSuccess(true);
      // Fetch community verdict from backend — backend computes AVG/COUNT, frontend renders
      await fetchVerdict(thought.id);
    } catch (e: any) {
      setSubmitError(e.message || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  }

  const displayRating = hoverRating ?? rating;

  return (
    <main className="max-w-2xl mx-auto px-5 py-8 md:py-10">
      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          🌙 MY NOT-SO-WEIRD <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">3 AM</span> THOUGHTS
        </h1>
        <p className="text-slate-400 mt-2 text-sm md:text-[15px]">
          Anonymous late-night overthinking — read, rate how weird it is 1–5.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow shadow-emerald-400/50" />
          No login required — just overthinking
        </div>
      </header>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400 backdrop-blur">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
          Loading thought...
        </div>
      )}

      {!loading && loadError && (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-center backdrop-blur">
          <p className="text-red-300">{loadError}</p>
          <button
            onClick={loadRandom}
            className="mt-4 rounded-full bg-white px-6 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && thought && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 md:p-7 shadow-xl backdrop-blur">
          {/* Category */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-widest text-cyan-200 uppercase">
              <span>🧠</span> {thought.category}
            </span>
            <span className="text-xs text-slate-500">#{thought.id}</span>
          </div>

          {/* Thought */}
          <blockquote className="mt-4 text-xl md:text-2xl font-medium leading-relaxed text-white">
            “{thought.content}”
          </blockquote>

          {/* Divider */}
          <div className="my-6 h-px bg-white/10" />

          {!showSuccess ? (
            <>
              <p className="text-center text-sm font-semibold tracking-wide text-slate-300">
                How weird is this? <span className="text-cyan-300">1 = nah</span> · <span className="text-indigo-300">5 = ultra weird</span>
              </p>

              {/* Star selector — obvious and easy to use */}
              <div className="mt-3 flex justify-center gap-1.5 md:gap-2">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = displayRating !== null && n <= displayRating;
                  const selected = rating !== null && n <= rating;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-label={`Rate ${n} star${n>1?"s":""}`}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(n)}
                      disabled={submitting}
                      className={`relative flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl border text-2xl transition
                        ${active
                          ? "border-amber-400/40 bg-amber-400/20 scale-105"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"}
                        ${selected ? "ring-2 ring-amber-400/30" : ""}
                        disabled:opacity-60`}
                    >
                      <span className={active ? "text-amber-300" : "text-slate-500"}>⭐</span>
                      <span className="absolute -bottom-1 text-[10px] font-bold text-slate-400">{n}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-center text-xs text-slate-500 min-h-4">
                {displayRating ? (
                  <>
                    {displayRating === 1 && "Not weird at all — happens to everyone"}
                    {displayRating === 2 && "A little weird, but relatable"}
                    {displayRating === 3 && "Pretty weird — 3 AM brain approved"}
                    {displayRating === 4 && "Very weird — you're overthinking right"}
                    {displayRating === 5 && "Ultra weird — certified 3 AM thought"}
                  </>
                ) : (
                  "Tap a star to choose 1–5"
                )}
              </p>

              {/* Comment */}
              <label className="mt-6 block">
                <span className="text-sm font-medium text-slate-300">Optional comment</span>
                <span className="text-xs text-slate-500"> — what does this remind you of?</span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="e.g. Literally me at 2 AM..."
                  disabled={submitting}
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#0f1530] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-60"
                />
                <span className="mt-1 block text-right text-xs text-slate-500">{comment.length}/500</span>
              </label>

              {submitError && (
                <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {submitError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-600 hover:to-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Submitting...
                  </>
                ) : (
                  "Rate This Thought →"
                )}
              </button>

              <button
                onClick={loadRandom}
                disabled={submitting}
                className="mt-3 w-full rounded-full border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
              >
                Skip → Next Thought
              </button>
            </>
          ) : (
            // M6 Community Verdict — renders backend response, no frontend AVG calc
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
                <p className="text-xs uppercase tracking-widest text-emerald-300">🌙 Community Verdict</p>
                <p className="mt-2 font-semibold text-emerald-100">
                  Your rating:{" "}
                  <span className="inline-flex gap-0.5">
                    {[1,2,3,4,5].map(n=> <span key={n} className={n <= (submittedRating||0) ? "opacity-100" : "opacity-30"}>⭐</span>)}
                  </span>{" "}
                  {submittedRating} / 5
                </p>
              </div>

              {verdictLoading && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-slate-400">
                  <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
                  Loading community verdict...
                </div>
              )}

              {verdictError && (
                <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-center text-red-200 text-sm">
                  {verdictError}
                  <button onClick={() => thought && fetchVerdict(thought.id)} className="mt-2 block mx-auto text-xs underline">Retry</button>
                </div>
              )}

              {!verdictLoading && !verdictError && verdict && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-[#0f1530] p-4 text-center">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Community rating</div>
                      <div className="mt-1 text-2xl font-extrabold text-white">
                        {verdict.average_rating !== null ? verdict.average_rating.toFixed(1) : "—"} <span className="text-sm font-medium text-slate-400">/ 5</span>
                      </div>
                      <div className="mt-1 flex justify-center gap-0.5 text-sm">
                        {[1,2,3,4,5].map(n=>{
                          const avg = verdict.average_rating ?? 0;
                          return <span key={n} className={n <= Math.round(avg) ? "opacity-100" : "opacity-20"}>⭐</span>
                        })}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0f1530] p-4 text-center">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Total ratings</div>
                      <div className="mt-1 text-2xl font-extrabold text-white">{verdict.total_ratings}</div>
                      <div className="text-xs text-slate-500">Based on {verdict.total_ratings} rating{verdict.total_ratings!==1?"s":""}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0f1530] p-4">
                    <div className="text-sm font-semibold text-slate-200">Latest thoughts from the community</div>
                    {verdict.latest_comments.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500 italic">No comments yet — be the first to leave one!</p>
                    ) : (
                      <ul className="mt-3 space-y-2.5">
                        {verdict.latest_comments.map((c, i) => (
                          <li key={i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                            <p className="text-sm leading-relaxed text-slate-100">“{c.comment}”</p>
                            <p className="mt-1 text-xs text-slate-500">⭐ {c.rating} · {new Date(c.created_at).toLocaleDateString()}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-[11px] text-slate-500">Sorted by backend: ORDER BY created_at DESC LIMIT 10</p>
                  </div>
                </>
              )}

              <button
                onClick={loadRandom}
                className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 py-3.5 font-bold text-white shadow-lg hover:from-indigo-600 hover:to-cyan-500"
              >
                Next Thought →
              </button>
            </div>
          )}
        </section>
      )}

      <footer className="mt-8 text-center text-xs text-slate-500">
        Backend validates every rating 1–5 • DB stores facts, backend computes averages
      </footer>
    </main>
  );
}
