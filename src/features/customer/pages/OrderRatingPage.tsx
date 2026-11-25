import { ArrowLeft, Star, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { customerApi, ApiError } from "../services/customerApi";
import { useAuth } from "../../auth/hooks/useAuth";
import { loadCustomerRating, rememberRating, readSavedRating, refreshCustomerRatingLookup } from "../services/customerRatingState";


/** Keep the unselected star outlines readable in both Customer themes.
 * The previous text-white/[0.18] became almost invisible on white cards.
 * This CSS affects only this rating page, not any other icons or components.
 */
const ratingStarThemeCss = `
  .customer-order-rating .customer-rating-star-idle {
    color: #bcb3ba;
    fill: none;
  }
  html[data-customer-theme="light"] .customer-order-rating .customer-rating-star-idle {
    color: #786e65;
  }
  .customer-order-rating .customer-rating-star-button:focus-visible {
    outline: 2px solid #f97316;
    outline-offset: 4px;
    border-radius: 6px;
  }
`;

/* =========================================================
   ORDER RATING PAGE
   Route: /customer/deliveries/:deliveryId/rate
   Only shown after order status = DELIVERED_TO_HUB.
========================================================= */

export function OrderRatingPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const customerId = String(user?.id ?? "");

  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [ratingCheck, setRatingCheck] = useState<"loading" | "unrated" | "rated" | "error" | "already">("loading");
  const [checkAttempt, setCheckAttempt] = useState(0);

  // A confirmed POST is cached per customer/order so a later GET 404
  // cannot hide an already-submitted score. Missing ratings still use BE GET.
  useEffect(() => {
    let active = true;
    setRatingCheck("loading");
    setExistingRating(null);
    if (!deliveryId || !customerId) {
      setRatingCheck("error");
      return () => { active = false; };
    }

    const cached = readSavedRating(customerId, deliveryId);
    if (cached !== null) {
      setExistingRating(cached);
      setRatingCheck("rated");
      return () => { active = false; };
    }

    void loadCustomerRating(customerId, deliveryId).then((result) => {
      if (!active) return;
      if (result.kind === "rated") {
        setExistingRating(result.rating);
        setRatingCheck("rated");
      } else {
        setRatingCheck(result.kind);
      }
    });
    return () => { active = false; };
  }, [deliveryId, customerId, checkAttempt]);

  const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  const handleSubmit = async () => {
    if (!selected || !deliveryId || submitting || ratingCheck !== "unrated") return;
    setSubmitting(true);
    setError("");
    try {
      const saved = await customerApi.submitRating(deliveryId, selected, comment.trim() || undefined);
      const score = saved?.rating ?? selected;
      // POST has succeeded: remember the server-confirmed score for later visits.
      rememberRating(customerId, deliveryId, score);
      setExistingRating(score);
      setRatingCheck("rated");
      setSubmitted(true);
    } catch (err) {
      // If another session already rated this order, display the saved rating.
      if (err instanceof ApiError && err.status === 409) {
        refreshCustomerRatingLookup(customerId, deliveryId);
        try {
          const saved = await customerApi.getRating(deliveryId);
          if (Number.isInteger(saved?.rating) && saved.rating >= 1 && saved.rating <= 5) {
            rememberRating(customerId, deliveryId, saved.rating);
            setExistingRating(saved.rating);
            setRatingCheck("rated");
            return;
          }
        } catch { /* BE rating lookup may not support GET. */ }
        // The server has confirmed a duplicate. Never offer another POST.
        setRatingCheck("already");
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (ratingCheck === "already") {
    return (
      <div className="customer-order-rating mx-auto max-w-[520px] px-4 py-16 text-center">
        <p className="text-[18px] font-medium text-white">This order has already been rated.</p>
        <p className="mt-2 text-[13px] text-white/60">The backend did not provide the saved star count. Please check the GET rating API.</p>
        <button type="button" onClick={() => navigate(`/customer/deliveries/${deliveryId}`)}
          className="mt-6 rounded-xl bg-orange-500 px-5 py-2.5 text-[13px] font-semibold text-black">Back to order</button>
      </div>
    );
  }

  if (ratingCheck === "loading") {
    return <div role="status" className="mx-auto max-w-[520px] px-4 py-16 text-[14px] text-white/70">Checking your rating…</div>;
  }

  if (ratingCheck === "error") {
    return (
      <div className="mx-auto max-w-[520px] px-4 py-16 text-center">
        <p role="alert" className="text-[14px] text-white/75">Unable to check your previous rating.</p>
        <button type="button" onClick={() => { if (deliveryId) refreshCustomerRatingLookup(customerId, deliveryId); setCheckAttempt((n) => n + 1); }}
          className="mt-5 rounded-xl bg-orange-500 px-5 py-2.5 text-[13px] font-semibold text-black">Try again</button>
        <button type="button" onClick={() => navigate(`/customer/deliveries/${deliveryId}`)}
          className="ml-3 text-[13px] text-orange-400">Back to order</button>
      </div>
    );
  }

  if (submitted || ratingCheck === "rated") {
    return (
      <div className="customer-order-rating mx-auto flex min-h-[60vh] max-w-[480px] flex-col items-center justify-center px-4 pb-20 pt-12 text-center sm:px-6">
        <style>{ratingStarThemeCss}</style>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10">
          <CheckCircle2 size={32} className="text-orange-400" />
        </div>
        <h1 className="mt-6 text-[24px] font-semibold tracking-[-0.03em] text-white">
          {submitted ? "Thank you!" : "You already rated this delivery"}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-white/[0.56]">
          {submitted
            ? "Your feedback helps us improve the drone delivery experience."
            : "Your rating has already been recorded."}
        </p>
        <div className="mt-6 flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              size={22}
              className={i < (existingRating ?? selected) ? "fill-orange-400 text-orange-400" : "customer-rating-star-idle"}
            />
          ))}
        </div>
        <p className="mt-2 text-[13px] font-semibold text-orange-400">{existingRating ?? selected}/5 stars</p>
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
    <div className="customer-order-rating mx-auto w-full max-w-[520px] px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <style>{ratingStarThemeCss}</style>
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
        <p className="text-[11px] font-semibold capitalize tracking-normal text-white/[0.36]">
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
                className="customer-rating-star-button transition-transform active:scale-90"
              >
                <Star
                  size={36}
                  className={`transition-colors ${
                    active
                      ? "fill-orange-400 text-orange-400"
                      : "customer-rating-star-idle"
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
