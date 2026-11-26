import Link from "next/link";
import { Suspense } from "react";
import { ReviewSession } from "@/components/study/review-session";
import { tr } from "@/i18n/tr";
import { requireUser } from "@/lib/auth/current-user";
import { loadReviewQueue } from "@/lib/reviews";

// Tekrar (SPEC 5.5): vadesi gelen kartlar, review_cap sınırıyla.
export default function ReviewPage() {
  return (
    <section className="space-y-4">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← {tr.review.back}
      </Link>
      <h1 className="text-2xl font-semibold">{tr.review.title}</h1>
      <Suspense fallback={<p className="text-muted">{tr.review.loading}</p>}>
        <ReviewLoader />
      </Suspense>
    </section>
  );
}

async function ReviewLoader() {
  const { supabase, userId, now } = await requireUser();
  const q = await loadReviewQueue(supabase, userId, now);
  return (
    <ReviewSession
      key={q.date}
      date={q.date}
      cards={q.cards}
      todayCards={q.todayCards}
      relearnIds={q.relearnIds}
      buttons={q.settings.review_buttons}
      typedEvery={q.settings.typed_review_every}
      accent={q.settings.tts_accent}
      overflow={q.overflow}
      cap={q.settings.review_cap}
      reviewedToday={q.reviewedToday}
    />
  );
}
