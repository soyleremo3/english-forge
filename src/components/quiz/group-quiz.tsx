"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { submitGroupQuizAction } from "@/app/(app)/study/actions";
import { QuizSession } from "@/components/quiz/quiz-session";
import { GroupStudy } from "@/components/study/group-study";
import { tr } from "@/i18n/tr";
import type { StudyWord } from "@/lib/new-words";
import type { QuizDirectionSetting } from "@/lib/study/quiz";

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

// Grup sınavı (SPEC 5.3): ortak QuizSession + isteğe bağlı "Yanlışları tekrar çalış"
// (kısa kart turu ve kaydedilmeyen mini sınav).
export function GroupQuiz({ quizKey, groupIndex, words, directionSetting, shuffle, accent, nextHref, completed, allGroupsDone }: Props) {
  const [retry, setRetry] = useState<null | { phase: "study" | "quiz"; wrongIds: number[]; round: number }>(null);
  const byId = useMemo(() => new Map(words.map((w) => [w.wordId, w])), [words]);

  if (retry) {
    const wrongWords = retry.wrongIds.flatMap((id) => byId.get(id) ?? []);
    if (retry.phase === "study") {
      return (
        <GroupStudy
          sessionKey={`${quizKey}:retry:${retry.round}`}
          words={wrongWords}
          shuffle={shuffle}
          accent={accent}
          heading={tr.quiz.retryWrong}
          allowKnown={false}
          onFinish={() => setRetry({ ...retry, phase: "quiz" })}
        />
      );
    }
    return (
      <div className="space-y-3">
        <h2 className="font-semibold">{tr.quiz.retryTitle}</h2>
        <QuizSession
          storageKey={`${quizKey}:retry-quiz:${retry.round}`}
          words={wrongWords}
          directionSetting={directionSetting}
          allowAppeal={false}
          renderDone={({ score }) => (
            <div className="space-y-3 rounded-2xl bg-surface p-4">
              <p className="font-medium">{tr.quiz.retryDone}</p>
              <p className="tabular-nums">{tr.quiz.score(score.correct, score.total, score.percent)}</p>
              <NextLinks nextHref={nextHref} allDone={allGroupsDone} />
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <QuizSession
      storageKey={quizKey}
      words={words}
      directionSetting={directionSetting}
      allowAppeal
      completed={completed}
      onSave={async (answers) => {
        const res = await submitGroupQuizAction({
          groupIndex,
          answers: answers.map((a) => ({ wordId: a.wordId, direction: a.direction, answer: a.answer, appealed: a.appealed })),
        });
        return res.ok ? res.result : null;
      }}
      renderAlreadyCompleted={() => (
        <section className="space-y-3 rounded-2xl bg-success/10 p-5" role="status">
          <p className="font-medium text-success">✓ {tr.quiz.alreadySaved}</p>
          <NextLinks nextHref={nextHref} allDone={allGroupsDone} />
        </section>
      )}
      renderDone={({ saved, score }) => (
        <div className="space-y-3 rounded-2xl bg-success/10 p-4" role="status">
          <p className="font-medium text-success">
            {saved?.alreadySaved ? tr.quiz.alreadySaved : tr.quiz.saved(saved?.xpGained ?? 0)}
          </p>
          {score.wrongIds.length > 0 && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setRetry({ phase: "study", wrongIds: score.wrongIds, round: Date.now() })}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 font-medium hover:bg-surface-hover"
              >
                {tr.quiz.retryWrong}
              </button>
              <p className="text-xs text-muted">{tr.quiz.retryHint}</p>
            </div>
          )}
          <NextLinks nextHref={nextHref} allDone={saved?.allGroupsDone ?? allGroupsDone} />
        </div>
      )}
    />
  );
}

export function NextLinks({ nextHref, allDone }: { nextHref: string; allDone: boolean }) {
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
