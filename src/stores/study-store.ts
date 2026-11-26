"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { GroupSessionState } from "@/lib/study/group-session";
import type { QuizAnswer, QuizItem } from "@/lib/study/quiz";
import type { ReviewPayload, ReviewSessionState } from "@/lib/study/review-session";

// Çalışma oturumları localStorage'da tutulur (SPEC 5.3): sayfa yenilense ya da telefon kapansa
// kaldığın yerden devam edersin. Anahtarlar tarih + grup içerir; eski günlerin kayıtları budanır.

export type QuizPhase = "question" | "feedback" | "result" | "saved";

/** Kayıttan sonra gösterilen özet. */
export type QuizSavedSummary = {
  xpGained: number;
  correct: number;
  total: number;
  percent: number;
  alreadySaved?: boolean;
  /** Grup sınavı: günün bütün grupları bitti mi */
  allGroupsDone?: boolean;
};

export type QuizProgress = {
  items: QuizItem[];
  index: number;
  answers: QuizAnswer[];
  phase: QuizPhase;
  saved?: QuizSavedSummary;
};

type StudyStore = {
  sessions: Record<string, GroupSessionState>;
  quizzes: Record<string, QuizProgress>;
  reviews: Record<string, ReviewSessionState>;
  setReview: (key: string, state: ReviewSessionState) => void;
  /** Kaydedilmeyi bekleyen tekrar cevapları (sayfa kapansa bile bir sonraki açılışta gönderilir) */
  reviewOutbox: Record<string, ReviewPayload[]>;
  addToOutbox: (key: string, payload: ReviewPayload) => void;
  removeFromOutbox: (key: string, wordId: number) => void;
  setSession: (key: string, state: GroupSessionState) => void;
  clearSession: (key: string) => void;
  setQuiz: (key: string, quiz: QuizProgress) => void;
  clearQuiz: (key: string) => void;
  /** Verilen tarihle başlamayan kayıtları siler (localStorage şişmesin). */
  pruneOtherDays: (date: string) => void;
};

const keepPrefix = <T,>(record: Record<string, T>, prefix: string) =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k.startsWith(prefix)));

export const useStudyStore = create<StudyStore>()(
  persist(
    (set) => ({
      sessions: {},
      quizzes: {},
      reviews: {},
      setReview: (key, state) => set((s) => ({ reviews: { ...s.reviews, [key]: state } })),
      reviewOutbox: {},
      addToOutbox: (key, payload) =>
        set((s) => {
          const list = (s.reviewOutbox[key] ?? []).filter((p) => p.wordId !== payload.wordId);
          return { reviewOutbox: { ...s.reviewOutbox, [key]: [...list, payload] } };
        }),
      removeFromOutbox: (key, wordId) =>
        set((s) => ({
          reviewOutbox: { ...s.reviewOutbox, [key]: (s.reviewOutbox[key] ?? []).filter((p) => p.wordId !== wordId) },
        })),
      setSession: (key, state) => set((s) => ({ sessions: { ...s.sessions, [key]: state } })),
      clearSession: (key) =>
        set((s) => {
          const sessions = { ...s.sessions };
          delete sessions[key];
          return { sessions };
        }),
      setQuiz: (key, quiz) => set((s) => ({ quizzes: { ...s.quizzes, [key]: quiz } })),
      clearQuiz: (key) =>
        set((s) => {
          const quizzes = { ...s.quizzes };
          delete quizzes[key];
          return { quizzes };
        }),
      pruneOtherDays: (date) =>
        set((s) => ({
          sessions: keepPrefix(s.sessions, `${date}:`),
          quizzes: keepPrefix(s.quizzes, `${date}:`),
          reviews: keepPrefix(s.reviews, `${date}:`),
          // Giden kutusu da yalnızca bugünü tutar: eski günün cevabı bugüne işlenmemeli.
          reviewOutbox: keepPrefix(s.reviewOutbox, `${date}:`),
        })),
    }),
    {
      name: "ef-study-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ sessions: s.sessions, quizzes: s.quizzes, reviews: s.reviews, reviewOutbox: s.reviewOutbox }),
    },
  ),
);

/** localStorage'dan okuma tamamlandı mı? (Sunucu çiziminde ve ilk karede false.) */
export function useStudyStoreHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useStudyStore.persist.onFinishHydration(onChange),
    () => useStudyStore.persist.hasHydrated(),
    () => false,
  );
}
