"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GroupStudy } from "@/components/study/group-study";
import { tr } from "@/i18n/tr";
import type { StudyWord } from "@/lib/new-words";
import { useStudyStore } from "@/stores/study-store";

type Props = {
  date: string;
  groupIndex: number;
  groupCount: number;
  words: StudyWord[];
  shuffle: boolean;
  accent: string;
};

// /study/new: günün sıradaki grubunun kart döngüsü. "Hayır" → o grubun sınavı.
export function NewWordsStudy({ date, groupIndex, groupCount, words, shuffle, accent }: Props) {
  const router = useRouter();
  const pruneOtherDays = useStudyStore((s) => s.pruneOtherDays);

  // Önceki günlerin yarım oturumlarını localStorage'dan temizle.
  useEffect(() => {
    pruneOtherDays(date);
  }, [date, pruneOtherDays]);

  return (
    <GroupStudy
      sessionKey={`${date}:new:${groupIndex}`}
      words={words}
      shuffle={shuffle}
      accent={accent}
      heading={tr.study.groupOf(groupIndex + 1, groupCount)}
      allowKnown
      onFinish={() => router.push(`/study/quiz/${groupIndex + 1}`)}
    />
  );
}
