"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { GroupSessionState } from "@/lib/study/group-session";
import type { QuizAnswer, QuizItem } from "@/lib/study/quiz";

// Çalışma oturumları localStorage'da tutulur (SPEC 5.3): sayfa yenilense ya da telefon kapansa
// kaldığın yerden devam edersin. Anahtarlar tarih + grup içerir; eski günlerin kayıtları budanır.

export type QuizPhase = "question" | "feedback" | "result" | "saved";

export type QuizProgress = {
  items: QuizItem[];
  index: number;
  answers: QuizAnswer[];
  phase: QuizPhase;
  saved?: { xpGained: number; correct: number; total: number; percent: number; allGroupsDone: boolean };
};

type StudyStore = {
  sessions: Record<string, GroupSessionState>;
  quizzes: Record<string, QuizProgress>;
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
        })),
    }),
    {
      name: "ef-study-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ sessions: s.sessions, quizzes: s.quizzes }),
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
