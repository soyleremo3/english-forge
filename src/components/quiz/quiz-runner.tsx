"use client";

import { useState } from "react";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { tr } from "@/i18n/tr";
import type { StudyWord } from "@/lib/new-words";
import { expectedAnswer, type QuizAnswer, type QuizItem } from "@/lib/study/quiz";

type Props = {
  items: QuizItem[];
  words: ReadonlyMap<number, StudyWord>;
  index: number;
  /** Bu sorunun cevabı verilmişse geri bildirim gösterilir */
  answer: QuizAnswer | undefined;
  allowAppeal: boolean;
  /** "Soru 1/1" sayacını gizle (tekrardaki tek yazılı soru) */
  hideCounter?: boolean;
  onSubmit: (text: string) => void;
  onAppeal: () => void;
  onNext: () => void;
};

const RESULT_STYLE = {
  correct: "border-success/50 bg-success/10",
  almost: "border-warning/50 bg-warning/10",
  wrong: "border-danger/50 bg-danger/10",
} as const;

// Tek soru: yazılı cevap → anında geri bildirim (doğru / neredeyse / yanlış, yanlışsa doğrusu) → Enter ile sonraki.
export function QuizRunner({ items, words, index, answer, allowAppeal, hideCounter, onSubmit, onAppeal, onNext }: Props) {
  const item = items[index];
  const word = item ? words.get(item.wordId) : undefined;
  const [text, setText] = useState("");

  useHotkeys([{ key: "Enter", handler: onNext, inButtons: false }], answer !== undefined);

  if (!item || !word) return null;
  const pos = word.pos ? (tr.pos[word.pos] ?? word.pos) : null;
  const trToEn = item.direction === "tr_en";
  const shown = answer?.appealed ? "correct" : answer?.result;

  return (
    <section className="space-y-4">
      {!hideCounter && <p className="text-sm text-muted tabular-nums">{tr.quiz.question(index + 1, items.length)}</p>}

      <div className="rounded-3xl border border-border bg-surface p-6 text-center">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          {trToEn ? tr.quiz.trToEn : tr.quiz.enToTr}
        </p>
        <p className="mt-3 text-3xl font-semibold">{trToEn ? word.tr_meanings.join(" · ") : word.lemma}</p>
        {pos && <p className="mt-2 text-sm text-muted">{pos}</p>}
      </div>

      {answer === undefined ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(text);
            setText("");
          }}
        >
          <label htmlFor="quiz-answer" className="sr-only">
            {tr.quiz.answerLabel}
          </label>
          <input
            id="quiz-answer"
            key={index}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            lang={trToEn ? "en" : "tr"}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={trToEn ? tr.quiz.answerPlaceholderEn : tr.quiz.answerPlaceholderTr}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-lg"
          />
          <button type="submit" className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white hover:opacity-90">
            {tr.quiz.check} <span className="opacity-70">(Enter)</span>
          </button>
        </form>
      ) : (
        <div className={`space-y-3 rounded-2xl border p-4 ${RESULT_STYLE[shown ?? "wrong"]}`} role="status" aria-live="polite">
          <p className="text-lg font-semibold">
            {answer.appealed ? tr.quiz.appealed : shown === "correct" ? tr.quiz.correct : shown === "almost" ? tr.quiz.almost : tr.quiz.wrong}
          </p>
          {shown !== "correct" || answer.appealed ? (
            <>
              <p className="text-sm">{tr.quiz.yourAnswer(answer.answer)}</p>
              <p className="text-sm font-medium">{tr.quiz.correctAnswer(expectedAnswer(word, item.direction))}</p>
            </>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              autoFocus
              onClick={onNext}
              className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-white hover:opacity-90"
            >
              {index + 1 < items.length ? tr.quiz.next : tr.quiz.seeResults} <span className="opacity-70">(Enter)</span>
            </button>
            {allowAppeal && answer.result === "wrong" && !answer.appealed && (
              <button
                type="button"
                onClick={onAppeal}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-hover"
              >
                {tr.quiz.appeal}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
