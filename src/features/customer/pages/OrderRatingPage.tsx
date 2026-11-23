import { ArrowLeft, Star, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { customerApi } from "../services/customerApi";

/* =========================================================
   ORDER RATING PAGE
   Route: /customer/deliveries/:deliveryId/rate
   Only shown after order status = DELIVERED_TO_HUB.
========================================================= */

export function OrderRatingPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();

  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  const handleSubmit = async () => {
    if (!selected || !deliveryId || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await customerApi.submitRating(deliveryId, selected, comment.trim() || undefined);
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit rating. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[480px] flex-col items-center justify-center px-4 pb-20 pt-12 text-center sm:px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
          <CheckCircle2 size={32} className="text-orange-400" />
        </div>
        <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.03em] text-white">
          Thank you!
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-white/[0.56]">
          Your feedback helps us improve the drone delivery experience.
        </p>
        <div className="mt-6 flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={22}
              className={i < selected ? "fill-orange-400 text-orange-400" : "text-white/[0.14]"}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate(`/customer/deliveries/${deliveryId}`)}
          className="mt-10 flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-6 text-[13px] font-semibold text-black transition hover:bg-orange-400"
        >
          Back to order
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[520px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-1.5 text-[12px] font-medium text-white/[0.44] transition hover:text-white"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      {/* Header */}
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
          Rate your experience
        </p>
        <h1 className="mt-3 text-[30px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[36px]">
          How was your delivery?
        </h1>
        {deliveryId && (
          <p className="mt-2 text-[12px] text-white/[0.36]">
            Order #{deliveryId}
          </p>
        )}
      </header>

      {/* Star selector */}
      <div className="mt-10 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/94 p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/[0.36]">
          Overall rating
        </p>

        <div className="mt-5 flex items-center gap-2">
          {Array.from({ length: 5 }, (_, i) => {
            const val = i + 1;
            const active = val <= (hovered || selected);
            return (
              <button
                key={val}
                type="button"
                aria-label={`Rate ${val} star${val > 1 ? "s" : ""}`}
                onMouseEnter={() => setHovered(val)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setSelected(val)}
                className="transition-transform active:scale-90"
              >
                <Star
                  size={36}
                  className={`transition-colors ${
                    active
                      ? "fill-orange-400 text-orange-400"
                      : "fill-transparent text-white/[0.18]"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Label */}
        <div className="mt-3 h-5">
          {(hovered || selected) > 0 && (
            <p className="text-[13px] font-semibold text-orange-400">
              {STAR_LABELS[hovered || selected]}
            </p>
          )}
        </div>
      </div>

      {/* Comment */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#161217]/94 p-6">
        <label
          htmlFor="rating-comment"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/[0.36]"
        >
          Comments (optional)
        </label>
        <textarea
          id="rating-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Tell us about your experience…"
          className="mt-3 w-full resize-none rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder-white/[0.22] outline-none transition focus:border-orange-500/60 focus:bg-white/[0.06]"
        />
        <p className="mt-1.5 text-right text-[10px] text-white/[0.24]">
          {comment.length} / 1000
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[12px] leading-5 text-red-300">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selected || submitting}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-[13px] font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Submitting…" : "Submit rating"}
      </button>

      <p className="mt-4 text-center text-[11px] leading-5 text-white/[0.30]">
        You can only rate each delivery once.
      </p>
    </div>
  );
}
