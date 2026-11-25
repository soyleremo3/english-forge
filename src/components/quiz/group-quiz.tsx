"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { submitGroupQuizAction } from "@/app/(app)/study/actions";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { GroupStudy } from "@/components/study/group-study";
import { tr } from "@/i18n/tr";
import type { StudyWord } from "@/lib/new-words";
import {
  buildQuizItems,
  expectedAnswer,
  gradeAnswer,
  type QuizAnswer,
  type QuizDirectionSetting,
  type QuizItem,
  scoreQuiz,
} from "@/lib/study/quiz";
import { type QuizProgress, useStudyStore, useStudyStoreHydrated } from "@/stores/study-store";

type Props = {
  /** localStorage anahtarı: "<tarih>:quiz:<grup>" */
  quizKey: string;
  groupIndex: number;
  words: StudyWord[];
  directionSetting: QuizDirectionSetting;
  shuffle: boolean;
  accent: string;
  /** Kayıttan sonra "Sonraki gruba geç" bağlantısı */
  nextHref: string;
  /** Bu grubun sınavı sunucuda zaten kaydedilmiş mi */
  completed: boolean;
  /** Günün bütün grupları bitti mi */
  allGroupsDone: boolean;
};

export function GroupQuiz(props: Props) {
  const hydrated = useStudyStoreHydrated();
  if (!hydrated) return <p className="text-muted">{tr.quiz.loading}</p>;
  return <GroupQuizInner {...props} />;
}

function isProgressValid(p: QuizProgress | undefined, wordIds: readonly number[]): p is QuizProgress {
  if (!p) return false;
  const ids = p.items.map((i) => i.wordId).sort((a, b) => a - b);
  const expected = [...wordIds].sort((a, b) => a - b);
  return ids.length === expected.length && ids.every((id, i) => id === expected[i]);
}

function answerFor(item: QuizItem, word: StudyWord, text: string): QuizAnswer {
  return { wordId: item.wordId, direction: item.direction, answer: text, result: gradeAnswer(word, item.direction, text), appealed: false };
}

function GroupQuizInner({ quizKey, groupIndex, words, directionSetting, shuffle, accent, nextHref, completed, allGroupsDone }: Props) {
  const byId = useMemo(() => new Map(words.map((w) => [w.wordId, w])), [words]);
  const wordIds = useMemo(() => words.map((w) => w.wordId), [words]);

  const stored = useStudyStore((s) => s.quizzes[quizKey]);
  const setQuiz = useStudyStore((s) => s.setQuiz);
  const [initial] = useState<QuizProgress>(() => ({
    items: buildQuizItems(wordIds, directionSetting),
    index: 0,
    answers: [],
    phase: "question",
  }));
  const progress = isProgressValid(stored, wordIds) ? stored : initial;
  const update = (next: QuizProgress) => setQuiz(quizKey, next);

  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState(false);
  const [retry, setRetry] = useState<null | { phase: "study" | "quiz" | "done"; items: QuizItem[]; index: number; answers: QuizAnswer[] }>(null);

  const score = scoreQuiz(progress.answers);

  // Sunucuda kaydedilmiş ama bu cihazda sonuç yok (ör. başka cihaz, temizlenmiş tarayıcı): yeniden sorma.
  if (completed && progress.phase !== "saved" && !retry) {
    return (
      <section className="space-y-3 rounded-2xl bg-success/10 p-5" role="status">
        <p className="font-medium text-success">✓ {tr.quiz.alreadySaved}</p>
        <NextLinks nextHref={nextHref} allDone={allGroupsDone} />
      </section>
    );
  }

  // --- Yanlışları tekrar çalış (isteğe bağlı, kaydedilmez) ---
  if (retry) {
    const wrongWords = score.wrongIds.flatMap((id) => byId.get(id) ?? []);
    if (retry.phase === "study") {
      return (
        <GroupStudy
          sessionKey={`${quizKey}:retry`}
          words={wrongWords}
          shuffle={shuffle}
          accent={accent}
          heading={tr.quiz.retryWrong}
          allowKnown={false}
          onFinish={() =>
            setRetry({ phase: "quiz", items: buildQuizItems(score.wrongIds, directionSetting), index: 0, answers: [] })
          }
        />
      );
    }
    if (retry.phase === "quiz") {
      const item = retry.items[retry.index];
      return (
        <div className="space-y-3">
          <h2 className="font-semibold">{tr.quiz.retryTitle}</h2>
          <QuizRunner
            items={retry.items}
            words={byId}
            index={retry.index}
            answer={retry.answers[retry.index]}
            allowAppeal={false}
            onSubmit={(text) => {
              const word = item && byId.get(item.wordId);
              if (!item || !word) return;
              setRetry({ ...retry, answers: [...retry.answers, answerFor(item, word, text)] });
            }}
            onAppeal={() => {}}
            onNext={() =>
              setRetry(
                retry.index + 1 < retry.items.length
                  ? { ...retry, index: retry.index + 1 }
                  : { ...retry, phase: "done" },
              )
            }
          />
        </div>
      );
    }
    const retryScore = scoreQuiz(retry.answers);
    return (
      <section className="space-y-4 rounded-3xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">{tr.quiz.retryDone}</h2>
        <p className="tabular-nums">{tr.quiz.score(retryScore.correct, retryScore.total, retryScore.percent)}</p>
        <NextLinks nextHref={nextHref} allDone={progress.saved?.allGroupsDone ?? false} />
      </section>
    );
  }

  // --- Sorular ---
  if (progress.phase === "question" || progress.phase === "feedback") {
    const item = progress.items[progress.index];
    return (
      <QuizRunner
        items={progress.items}
        words={byId}
        index={progress.index}
        answer={progress.answers[progress.index]}
        allowAppeal
        onSubmit={(text) => {
          const word = item && byId.get(item.wordId);
          if (!item || !word) return;
          update({ ...progress, answers: [...progress.answers, answerFor(item, word, text)], phase: "feedback" });
        }}
        onAppeal={() =>
          update({
            ...progress,
            answers: progress.answers.map((a, i) => (i === progress.index ? { ...a, appealed: true } : a)),
          })
        }
        onNext={() =>
          update(
            progress.index + 1 < progress.items.length
              ? { ...progress, index: progress.index + 1, phase: "question" }
              : { ...progress, phase: "result" },
          )
        }
      />
    );
  }

  // --- Sonuç (kaydetmeden önce itiraz edilebilir) ---
  const save = () => {
    setSaveError(false);
    startSaving(async () => {
      const res = await submitGroupQuizAction({
        groupIndex,
        answers: progress.answers.map((a) => ({
          wordId: a.wordId,
          direction: a.direction,
          answer: a.answer,
          appealed: a.appealed,
        })),
      });
      if (!res.ok) {
        setSaveError(true);
        return;
      }
      update({ ...progress, phase: "saved", saved: res.result });
    });
  };

  const wrongAnswers = progress.answers.filter((a) => a.result !== "correct" && a.result !== "almost");

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-border bg-surface p-6 text-center">
        <h2 className="text-sm font-medium text-muted">{tr.quiz.resultTitle}</h2>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{score.percent}%</p>
        <p className="mt-1 text-muted tabular-nums">{tr.quiz.score(score.correct, score.total, score.percent)}</p>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">{tr.quiz.wrongList}</h3>
        {wrongAnswers.length === 0 ? (
          <p className="text-muted">{tr.quiz.noWrong}</p>
        ) : (
          <ul className="space-y-2">
            {wrongAnswers.map((a) => {
              const w = byId.get(a.wordId);
              if (!w) return null;
              return (
                <li key={a.wordId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3">
                  <span>
                    <span className="block font-medium">{a.direction === "tr_en" ? w.tr_meanings[0] : w.lemma}</span>
                    <span className="block text-sm text-muted">
                      {tr.quiz.yourAnswer(a.answer)} · {tr.quiz.correctAnswer(expectedAnswer(w, a.direction))}
                    </span>
                  </span>
                  {progress.phase === "result" &&
                    (a.appealed ? (
                      <span className="text-sm text-success">{tr.quiz.appealed}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            ...progress,
                            answers: progress.answers.map((x) => (x === a ? { ...x, appealed: true } : x)),
                          })
                        }
                        className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
                      >
                        {tr.quiz.appeal}
                      </button>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {progress.phase === "result" ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            autoFocus
            className="w-full rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? tr.quiz.saving : tr.quiz.save}
          </button>
          {saveError && (
            <p role="alert" className="text-sm text-danger">
              {tr.quiz.saveError}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl bg-success/10 p-4" role="status">
          <p className="font-medium text-success">
            {progress.saved?.total === 0 ? tr.quiz.alreadySaved : tr.quiz.saved(progress.saved?.xpGained ?? 0)}
          </p>
          {score.wrongIds.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setRetry({ phase: "study", items: [], index: 0, answers: [] })}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 font-medium hover:bg-surface-hover"
              >
                {tr.quiz.retryWrong}
              </button>
              <p className="text-xs text-muted">{tr.quiz.retryHint}</p>
            </div>
          )}
          <NextLinks nextHref={nextHref} allDone={progress.saved?.allGroupsDone ?? false} />
        </div>
      )}
    </section>
  );
}

function NextLinks({ nextHref, allDone }: { nextHref: string; allDone: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {!allDone && (
        <Link href={nextHref} className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-white hover:opacity-90">
          {tr.quiz.nextGroup}
        </Link>
      )}
      <Link
        href="/"
        className={`rounded-xl px-5 py-2.5 font-semibold ${allDone ? "bg-accent text-white" : "border border-border hover:bg-surface-hover"}`}
      >
        {tr.quiz.toToday}
      </Link>
    </div>
  );
}
