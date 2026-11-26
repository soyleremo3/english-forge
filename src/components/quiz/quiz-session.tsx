"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { tr } from "@/i18n/tr";
import type { StudyWord } from "@/lib/new-words";
import {
  buildQuizItems,
  expectedAnswer,
  gradeAnswer,
  type QuizAnswer,
  type QuizDirectionSetting,
  type QuizItem,
  type QuizScore,
  scoreQuiz,
} from "@/lib/study/quiz";
import { type QuizProgress, type QuizSavedSummary, useStudyStore, useStudyStoreHydrated } from "@/stores/study-store";

// Ortak yazılı sınav bileşeni (SPEC 5.3, 5.4, 5.6): grup sınavı, mini sınav ve günlük test bunu kullanır.
// Soru → anında geri bildirim → Enter; yanlışta "Aslında doğruydu"; sonuç ekranında kaydetmeden önce itiraz;
// ilerleme localStorage'da (sayfa yenilense kaldığı yerden devam eder).

export type QuizSessionProps = {
  /** localStorage anahtarı ("<tarih>:..." ile başlamalı) */
  storageKey: string;
  words: StudyWord[];
  /** Soru sırası/yönü; verilmezse kelimelerden karışık üretilir */
  directionSetting: QuizDirectionSetting;
  allowAppeal: boolean;
  /** Sınav sunucuda zaten kaydedilmiş (başka cihaz / temizlenmiş tarayıcı) */
  completed?: boolean;
  /** Kaydetme; verilmezse sonuç kaydedilmez (mini sınav) */
  onSave?: (answers: QuizAnswer[]) => Promise<QuizSavedSummary | null>;
  /** Kayıttan sonra (ya da kaydedilmeyen sınav bitince) gösterilecek bölüm */
  renderDone: (args: { saved: QuizSavedSummary | undefined; score: QuizScore; answers: QuizAnswer[] }) => ReactNode;
  /** Sunucuda kayıtlı ama bu cihazda sonuç yokken gösterilecek bölüm */
  renderAlreadyCompleted?: () => ReactNode;
};

export function QuizSession(props: QuizSessionProps) {
  const hydrated = useStudyStoreHydrated();
  if (!hydrated) return <p className="text-muted">{tr.quiz.loading}</p>;
  return <QuizSessionInner {...props} />;
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

function QuizSessionInner({
  storageKey,
  words,
  directionSetting,
  allowAppeal,
  completed = false,
  onSave,
  renderDone,
  renderAlreadyCompleted,
}: QuizSessionProps) {
  const byId = useMemo(() => new Map(words.map((w) => [w.wordId, w])), [words]);
  const wordIds = useMemo(() => words.map((w) => w.wordId), [words]);

  const stored = useStudyStore((s) => s.quizzes[storageKey]);
  const setQuiz = useStudyStore((s) => s.setQuiz);
  const [initial] = useState<QuizProgress>(() => ({
    items: buildQuizItems(wordIds, directionSetting),
    index: 0,
    answers: [],
    phase: "question",
  }));
  const progress = isProgressValid(stored, wordIds) ? stored : initial;
  const update = (next: QuizProgress) => setQuiz(storageKey, next);

  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState(false);
  const score = scoreQuiz(progress.answers);

  if (completed && progress.phase !== "saved" && renderAlreadyCompleted) return <>{renderAlreadyCompleted()}</>;

  if (progress.phase === "question" || progress.phase === "feedback") {
    const item = progress.items[progress.index];
    return (
      <QuizRunner
        items={progress.items}
        words={byId}
        index={progress.index}
        answer={progress.answers[progress.index]}
        allowAppeal={allowAppeal}
        onSubmit={(text) => {
          const word = item && byId.get(item.wordId);
          if (!item || !word) return;
          update({ ...progress, answers: [...progress.answers, answerFor(item, word, text)], phase: "feedback" });
        }}
        onAppeal={() =>
          update({ ...progress, answers: progress.answers.map((a, i) => (i === progress.index ? { ...a, appealed: true } : a)) })
        }
        onNext={() =>
          update(
            progress.index + 1 < progress.items.length
              ? { ...progress, index: progress.index + 1, phase: "question" }
              : { ...progress, phase: onSave ? "result" : "saved" },
          )
        }
      />
    );
  }

  const save = () => {
    if (!onSave) return;
    setSaveError(false);
    startSaving(async () => {
      const saved = await onSave(progress.answers);
      if (!saved) {
        setSaveError(true);
        return;
      }
      update({ ...progress, phase: "saved", saved });
    });
  };

  const wrongAnswers = progress.answers.filter((a) => a.result === "wrong");
  const canAppeal = progress.phase === "result" && allowAppeal;

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
                  {a.appealed ? (
                    <span className="text-sm text-success">{tr.quiz.appealed}</span>
                  ) : (
                    canAppeal && (
                      <button
                        type="button"
                        onClick={() =>
                          update({ ...progress, answers: progress.answers.map((x) => (x === a ? { ...x, appealed: true } : x)) })
                        }
                        className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
                      >
                        {tr.quiz.appeal}
                      </button>
                    )
                  )}
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
        renderDone({ saved: progress.saved, score, answers: progress.answers })
      )}
    </section>
  );
}
