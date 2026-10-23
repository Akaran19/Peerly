import { useEffect, useState } from "react";
import { dataClient } from "@/lib/dataClient";
import { UserPaper, User } from "@/types";
import { Star, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ReviewsCardProps = { paperId: string; limit?: number };

export default function ReviewsCard({ paperId, limit = 3 }: ReviewsCardProps) {
  const [agg, setAgg] = useState<{ avgRating: number; count: number; histogram: Record<1|2|3|4|5, number> } | null>(null);
  const [reviews, setReviews] = useState<Array<UserPaper & { user: User }>>([]);
  const [showMore, setShowMore] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      dataClient.getAggregatesForPaper(paperId),
      dataClient.getTopReviewsForPaper(paperId, limit),
    ]).then(([agg, reviews]) => {
      setAgg(agg);
      setReviews(reviews);
    });
  }, [paperId, limit]);

  if (!agg) return null;

  const ratingWord = agg.count === 1 ? 'rating' : 'ratings';
  const peak = Math.max(1, ...Object.values(agg.histogram));

  return (
    <section className="space-y-5" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="paper-section-label">Reader reviews</h2>

      {agg.count > 0 && (
        <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div>
            <p className="font-editorial text-5xl leading-none tabular-nums">{agg.avgRating.toFixed(1)}</p>
            <div className="mt-2 flex items-center gap-0.5" aria-label={`${agg.avgRating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("h-3.5 w-3.5", i < Math.round(agg.avgRating) ? "fill-amber-500 text-amber-500" : "text-foreground/20")} />
              ))}
            </div>
            <p className="mt-1 label-mono">{agg.count} {ratingWord}</p>
          </div>
          <ul className="max-w-xs space-y-1" aria-label="Rating distribution">
            {([5, 4, 3, 2, 1] as const).map(star => {
              const count = agg.histogram[star] ?? 0;
              return (
                <li key={star} className="grid grid-cols-[1rem_minmax(0,1fr)_1.5rem] items-center gap-2 font-ident text-[10px] text-muted-foreground">
                  <span>{star}</span>
                  <span className="h-1.5 bg-foreground/10">
                    <span className="block h-full bg-foreground/70" style={{ width: `${(count / peak) * 100}%` }} />
                  </span>
                  <span className="text-right">{count}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-y py-5">
          <p className="font-editorial text-lg italic text-muted-foreground">No written reviews yet.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => document.getElementById("review-form")?.scrollIntoView({ behavior: "smooth", block: "center" })}
          >
            Write the first one
          </Button>
        </div>
      ) : (
        <ol className="divide-y border-y">
          {reviews.map((review) => (
            <li key={review.id} className="space-y-3 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border font-editorial text-base">
                  {review.user?.name?.[0] || review.user?.handle?.[0] || <UserIcon className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{review.user?.name || review.user?.handle || "Anonymous"}</p>
                  <p className="font-ident text-[10px] text-muted-foreground">
                    {review.updated_at ? new Date(review.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ""}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className="flex items-center gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("h-3.5 w-3.5", i < (review.rating ?? 0) ? "fill-amber-500 text-amber-500" : "text-foreground/20")} />
                    ))}
                  </span>
                  <span className="font-ident text-[10px] text-muted-foreground" title="Upvotes">▲ {review.upvotes ?? 0}</span>
                </div>
              </div>
              {review.review && (
                <p className={cn("max-w-[68ch] font-editorial text-[16.5px] leading-relaxed text-foreground/85", showMore[review.id] ? "line-clamp-none" : "line-clamp-6")}>
                  {review.review}
                </p>
              )}
              {review.review && review.review.length > 400 && (
                <button
                  className="min-h-0 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  onClick={() => setShowMore(s => ({ ...s, [review.id]: !s[review.id] }))}
                >
                  {showMore[review.id] ? "Show less" : "Show more"}
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
