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

  return (
    <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-5 md:p-6 mt-6">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h3 className="text-lg font-semibold">Reviews</h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 px-2.5 py-1 text-xs font-medium">
          <span aria-label={`${agg.avgRating} out of 5 stars`} className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn("w-4 h-4", i < Math.round(agg.avgRating) ? "text-amber-400" : "text-muted-foreground")}/>
            ))}
          </span>
          <span className="sr-only">Average rating</span>
          {agg.avgRating} <span className="text-muted-foreground">({agg.count} reviews)</span>
        </span>
      </div>
      {/* Histogram bars */}
      <div className="flex items-end gap-1 mt-2 mb-4">
        {Object.entries(agg.histogram).map(([star, count]) => (
          <div key={star} className="w-4 h-2 rounded bg-indigo-200 dark:bg-indigo-900" style={{ height: `${8 + count * 4}px` }} title={`${star} stars: ${count}`}/>
        ))}
      </div>
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-2">No reviews yet. Be the first to add one.</p>
            <Button size="sm" onClick={() => {
              const el = document.getElementById("review-form");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}>Add Review</Button>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="space-y-2 p-4 rounded-xl border bg-background/60 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-lg text-muted-foreground">
                  {review.user?.name?.[0] || review.user?.handle?.[0] || <UserIcon className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-medium">{review.user?.name || review.user?.handle || "Anonymous"}</div>
                  <div className="text-xs text-muted-foreground">{review.updated_at ? new Date(review.updated_at).toLocaleDateString() : ""}</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 ml-auto">
                  ▲ {review.upvotes ?? 0}
                </span>
              </div>
              <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("w-4 h-4", i < (review.rating ?? 0) ? "text-amber-400" : "text-muted-foreground")}/>
                ))}
              </div>
              {review.review && (
                <div className={cn("text-sm text-foreground", showMore[review.id] ? "line-clamp-none" : "line-clamp-6")}>{review.review}</div>
              )}
              {review.review && review.review.length > 400 && (
                <Button variant="ghost" size="sm" onClick={() => setShowMore(s => ({ ...s, [review.id]: !s[review.id] }))}>
                  {showMore[review.id] ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
