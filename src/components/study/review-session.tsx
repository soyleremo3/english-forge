"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { finishReviewAction, reviewAnswerAction } from "@/app/(app)/study/actions";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { Flashcard } from "@/components/study/flashcard";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useSpeech } from "@/hooks/use-speech";
import { tr } from "@/i18n/tr";
import { isPassing } from "@/lib/answer-check";
import type { ReviewGrade } from "@/lib/fsrs";
import type { StudyWord } from "@/lib/new-words";
import { finalResult, gradeAnswer, type QuizAnswer } from "@/lib/study/quiz";
import {
  createReviewSession,
  currentCard,
  isReviewSessionValid,
  isTypedCard,
  type ReviewPayload,
  type ReviewSessionState,
  reviewReducer,
  shouldSubmit,
} from "@/lib/study/review-session";
import { useStudyStore, useStudyStoreHydrated } from "@/stores/study-store";

type Props = {
  date: string;
  /** Bugün kalan vadesi gelmiş kartlar (sınır kadar) */
  cards: StudyWord[];
  /** Bugün zaten tekrar edilmiş kartlar (oturum yenilenince devam için) */
  todayCards: StudyWord[];
  /** Bugün ilk cevabı "Bilemedim" olan kartlar */
  relearnIds: number[];
  buttons: "two" | "four";
  typedEvery: number;
  accent: string;
  overflow: number;
  cap: number;
  reviewedToday: number;
};

const EMPTY_OUTBOX: ReviewPayload[] = [];

const GRADE_STYLE: Record<ReviewGrade, string> = {
  again: "bg-danger text-white",
  hard: "bg-warning text-black",
  good: "bg-success text-white",
  easy: "bg-accent text-white",
};

export function ReviewSession(props: Props) {
  const hydrated = useStudyStoreHydrated();
  if (!hydrated) return <p className="text-muted">{tr.review.loading}</p>;
  return <ReviewSessionInner {...props} />;
}

function ReviewSessionInner({ date, cards, todayCards, relearnIds, buttons, typedEvery, accent, overflow, cap, reviewedToday }: Props) {
  const key = `${date}:review`;
  const byId = useMemo(() => new Map([...todayCards, ...cards].map((w) => [w.wordId, w])), [cards, todayCards]);
  const remaining = useMemo(() => cards.map((c) => c.wordId), [cards]);
  const known = useMemo(() => new Set(byId.keys()), [byId]);

  const stored = useStudyStore((s) => s.reviews[key]);
  const setReview = useStudyStore((s) => s.setReview);
  const [fresh] = useState(() => createReviewSession(remaining, relearnIds));
  const session: ReviewSessionState = stored && isReviewSessionValid(stored, remaining, known) ? stored : fresh;

  // Giden kutusu: kaydedilmeyi bekleyen ilk cevaplar (localStorage). Sayfa kapanıp açılsa bile gönderilir.
  const outbox = useStudyStore((s) => s.reviewOutbox[key]) ?? EMPTY_OUTBOX;
  const addToOutbox = useStudyStore((s) => s.addToOutbox);
  const removeFromOutbox = useStudyStore((s) => s.removeFromOutbox);
  const [pending, startTransition] = useTransition();
  const [lastAttemptFailed, setLastAttemptFailed] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState<QuizAnswer | undefined>(undefined);
  const { supported: speechSupported, speak } = useSpeech(accent);

  const id = currentCard(session);
  const word = id === null ? null : (byId.get(id) ?? null);
  const typed = isTypedCard(session, typedEvery);

  /** Giden kutusundakileri sırayla gönderir; kaydedilen çıkar. Sunucu her kart için günde yalnızca ilk cevabı işler. */
  const flush = () =>
    startTransition(async () => {
      let failed = false;
      for (const p of useStudyStore.getState().reviewOutbox[key] ?? []) {
        const res = await reviewAnswerAction(p);
        if (res.ok) removeFromOutbox(key, p.wordId);
        else failed = true;
      }
      setLastAttemptFailed(failed);
    });

  // Açılışta önceki ziyaretten kalan cevapları gönder.
  const flushedOnMount = useRef(false);
  useEffect(() => {
    if (flushedOnMount.current) return;
    flushedOnMount.current = true;
    if ((useStudyStore.getState().reviewOutbox[key] ?? []).length > 0) flush();
  });

  /**
   * Cevabı HEMEN uygular (tuşlar kaybolmasın, telefonda gecikme hissedilmesin); ana turdaki ilk cevapsa
   * giden kutusuna koyup arka planda gönderir. Yazılı soruda not, sunucuyla aynı fonksiyonla hesaplanır.
   */
  const answer = (grade: ReviewGrade, typedInput?: { answer: string; appealed: boolean }) => {
    if (id === null) return;
    const submit = shouldSubmit(session);
    setReview(key, reviewReducer(session, { type: "answer", grade }));
    setTypedAnswer(undefined);
    if (submit) {
      addToOutbox(key, { wordId: id, grade, typed: typedInput });
      flush();
    }
  };

  // Oturum bitince ve bütün cevaplar kaydedilince görevi bir kez tamamla.
  const finished = useRef(false);
  useEffect(() => {
    if (session.phase === "done" && !pending && outbox.length === 0 && !finished.current) {
      finished.current = true;
      void finishReviewAction();
    }
  }, [session.phase, pending, outbox.length]);

  const flipped = session.flipped;
  const grades: ReviewGrade[] = buttons === "four" ? ["again", "hard", "good", "easy"] : ["again", "good"];
  const labels = buttons === "four" ? tr.review.fourGrades : tr.review.grades;

  useHotkeys(
    [
      { key: " ", handler: () => setReview(key, reviewReducer(session, { type: "flip" })) },
      ...grades.map((g, i) => ({ key: String(i + 1), handler: () => flipped && answer(g) })),
      { key: "p", handler: () => flipped && word && speak(word.lemma) },
    ],
    session.phase !== "done" && !typed && word !== null,
  );

  if (session.phase === "done" || !word) {
    const total = reviewedToday + Object.keys(session.firstGrades).length;
    return (
      <section className="space-y-4 rounded-3xl border border-border bg-surface p-6 text-center" role="status">
        {total > 0 ? (
          <>
            <h2 className="text-xl font-semibold">✓ {tr.review.doneTitle}</h2>
            <p className="text-muted">{tr.review.doneBody(total)}</p>
          </>
        ) : (
          <p>{tr.review.noCards}</p>
        )}
        {overflow > 0 && <p className="text-sm text-warning">{tr.review.overflow(overflow, cap)}</p>}
        <SyncStatus waiting={outbox.length} failed={lastAttemptFailed} pending={pending} onRetry={flush} />
        <Link href="/" className="inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-white">
          {tr.review.toToday}
        </Link>
      </section>
    );
  }

  const mainTotal = session.queue.length;
  const header =
    session.phase === "main"
      ? tr.review.progress(session.pos + 1, mainTotal)
      : tr.review.relearnHeading(session.relearn.length);

  return (
    <section className="space-y-4">
      {overflow > 0 && session.phase === "main" && session.pos === 0 && (
        <p className="rounded-xl border border-warning/50 bg-warning/10 px-4 py-2 text-sm">{tr.review.overflow(overflow, cap)}</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span className="font-medium text-foreground tabular-nums">{header}</span>
        {session.phase === "relearn" && <span>{tr.review.relearnHint}</span>}
        {typed && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-accent">{tr.review.typedHint}</span>}
      </div>

      {typed ? (
        <QuizRunner
          items={[{ wordId: word.wordId, direction: "tr_en" }]}
          words={byId}
          index={0}
          hideCounter
          answer={typedAnswer}
          allowAppeal
          onSubmit={(text) =>
            setTypedAnswer({ wordId: word.wordId, direction: "tr_en", answer: text, result: gradeAnswer(word, "tr_en", text), appealed: false })
          }
          onAppeal={() => setTypedAnswer((a) => (a ? { ...a, appealed: true } : a))}
          onNext={() => {
            if (!typedAnswer) return;
            const grade: ReviewGrade = isPassing(finalResult(typedAnswer)) ? "good" : "again";
            answer(grade, { answer: typedAnswer.answer, appealed: typedAnswer.appealed });
          }}
        />
      ) : (
        <>
          <Flashcard
            key={`${session.phase}:${word.wordId}`}
            word={word}
            flipped={flipped}
            onFlip={() => setReview(key, reviewReducer(session, { type: "flip" }))}
            onSpeak={() => speak(word.lemma)}
            speechSupported={speechSupported}
          />
          {flipped ? (
            <div className={`grid gap-2 ${grades.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
              {grades.map((g, i) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => answer(g)}
                  className={`rounded-xl px-4 py-3 font-semibold hover:opacity-90 disabled:opacity-60 ${GRADE_STYLE[g]}`}
                >
                  {labels[g]} <span className="opacity-70">({i + 1})</span>
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setReview(key, reviewReducer(session, { type: "flip" }))}
              className="w-full rounded-xl border border-border px-4 py-3 font-medium hover:bg-surface-hover"
            >
              {tr.study.flipCard} <span className="text-muted">(Space)</span>
            </button>
          )}
          <p className="hidden text-xs text-muted md:block">{buttons === "four" ? tr.review.shortcuts4 : tr.review.shortcuts2}</p>
        </>
      )}
      <SyncStatus waiting={outbox.length} failed={lastAttemptFailed} pending={pending} onRetry={flush} />
    </section>
  );
}

/** Kaydedilmeyi bekleyen cevap varsa durumunu gösterir: kaydediliyor ya da (başarısızsa) tekrar dene. */
function SyncStatus({ waiting, failed, pending, onRetry }: { waiting: number; failed: boolean; pending: boolean; onRetry: () => void }) {
  if (waiting === 0) return null;
  if (!failed || pending) {
    return (
      <p role="status" className="text-sm text-muted">
        {tr.review.saving(waiting)}
      </p>
    );
  }
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-danger/50 bg-danger/10 p-3 text-sm">
      <span>{tr.review.saveError}</span>
      <button type="button" onClick={onRetry} className="rounded-lg border border-border px-3 py-1.5 font-medium">
        {tr.review.retrySave(waiting)}
      </button>
    </div>
  );
}
