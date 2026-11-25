"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { markKnownAction } from "@/app/(app)/study/actions";
import { Flashcard } from "@/components/study/flashcard";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useSpeech } from "@/hooks/use-speech";
import { tr } from "@/i18n/tr";
import type { StudyWord } from "@/lib/new-words";
import {
  createSession,
  currentWordId,
  type GroupSessionState,
  isSessionValid,
  type SessionAction,
  sessionReducer,
} from "@/lib/study/group-session";
import { useStudyStore, useStudyStoreHydrated } from "@/stores/study-store";

type Props = {
  /** localStorage anahtarı: "<tarih>:new:<grup>" gibi */
  sessionKey: string;
  words: StudyWord[];
  shuffle: boolean;
  accent: string;
  /** Üstte gösterilecek başlık (Grup 1/2 gibi) */
  heading?: string;
  /** "Bunu zaten biliyorum" bağlantısı (yalnızca ana grup çalışmasında) */
  allowKnown: boolean;
  /** "Hayır, sınava geç" */
  onFinish: () => void;
};

export function GroupStudy(props: Props) {
  const hydrated = useStudyStoreHydrated();
  if (!hydrated) return <p className="text-muted">{tr.study.loading}</p>;
  return <GroupStudyInner {...props} />;
}

function GroupStudyInner({ sessionKey, words: initialWords, shuffle, accent, heading, allowKnown, onFinish }: Props) {
  const [words, setWords] = useState(initialWords);
  const wordIds = useMemo(() => words.map((w) => w.wordId), [words]);
  const byId = useMemo(() => new Map(words.map((w) => [w.wordId, w])), [words]);

  const stored = useStudyStore((s) => s.sessions[sessionKey]);
  const setSession = useStudyStore((s) => s.setSession);
  const session: GroupSessionState =
    stored && isSessionValid(stored, wordIds) ? stored : createSession(wordIds);

  const dispatch = useCallback(
    (action: SessionAction) => {
      const current = useStudyStore.getState().sessions[sessionKey];
      const base = current && isSessionValid(current, wordIds) ? current : createSession(wordIds);
      setSession(sessionKey, sessionReducer(base, action, { shuffle }));
    },
    [sessionKey, setSession, shuffle, wordIds],
  );

  const { supported: speechSupported, speak } = useSpeech(accent);
  const currentId = currentWordId(session);
  const word = currentId === null ? null : (byId.get(currentId) ?? null);

  const [pending, startTransition] = useTransition();
  const [knownError, setKnownError] = useState(false);

  const markKnown = () => {
    if (!word || pending) return;
    setKnownError(false);
    const oldId = word.wordId;
    startTransition(async () => {
      const res = await markKnownAction(oldId);
      if (!res.ok) {
        setKnownError(true);
        return;
      }
      const replacement = res.replacement;
      setWords((ws) =>
        replacement ? ws.map((w) => (w.wordId === oldId ? replacement : w)) : ws.filter((w) => w.wordId !== oldId),
      );
      const current = useStudyStore.getState().sessions[sessionKey] ?? createSession(wordIds);
      setSession(
        sessionKey,
        sessionReducer(current, { type: "replace", oldId, newId: replacement?.wordId ?? null }, { shuffle }),
      );
    });
  };

  const studying = session.phase === "study" && word !== null;
  useHotkeys(
    [
      { key: " ", handler: () => dispatch({ type: "flip" }) },
      { key: "1", handler: () => session.flipped && dispatch({ type: "rate", knew: false }) },
      { key: "2", handler: () => session.flipped && dispatch({ type: "rate", knew: true }) },
      { key: "ArrowLeft", handler: () => dispatch({ type: "prev" }) },
      { key: "ArrowRight", handler: () => dispatch({ type: "next" }) },
      { key: "p", handler: () => session.flipped && word && speak(word.lemma) },
    ],
    studying,
  );

  if (session.phase === "ask" || !word) {
    return (
      <section className="space-y-4 rounded-3xl border border-border bg-surface p-6 text-center" aria-live="polite">
        <h2 className="text-xl font-semibold">{tr.study.askTitle}</h2>
        <p className="text-muted">{tr.study.askHint}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => dispatch({ type: "repeat" })}
            className="rounded-xl border border-border px-5 py-3 font-medium hover:bg-surface-hover"
          >
            {tr.study.askYes}
          </button>
          <button
            type="button"
            onClick={onFinish}
            autoFocus
            className="rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:opacity-90"
          >
            {tr.study.askNo}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span className="font-medium text-foreground">{heading}</span>
        <span className="tabular-nums">
          {tr.study.round(session.round)} · {tr.study.cardPosition(session.pos + 1, session.order.length)} ·{" "}
          {tr.study.activeLeft(session.active.length, session.wordIds.length)}
        </span>
      </div>

      <Flashcard
        key={word.wordId}
        word={word}
        flipped={session.flipped}
        onFlip={() => dispatch({ type: "flip" })}
        onSpeak={() => speak(word.lemma)}
        speechSupported={speechSupported}
      />

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          type="button"
          onClick={() => dispatch({ type: "prev" })}
          aria-label={tr.study.prev}
          className="size-12 rounded-xl border border-border text-xl hover:bg-surface-hover"
        >
          ←
        </button>
        {session.flipped ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "rate", knew: false })}
              className="rounded-xl bg-danger px-4 py-3 font-semibold text-white hover:opacity-90"
            >
              {tr.study.didntKnow} <span className="opacity-70">(1)</span>
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "rate", knew: true })}
              className="rounded-xl bg-success px-4 py-3 font-semibold text-white hover:opacity-90"
            >
              {tr.study.knew} <span className="opacity-70">(2)</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => dispatch({ type: "flip" })}
            className="rounded-xl border border-border px-4 py-3 font-medium hover:bg-surface-hover"
          >
            {tr.study.flipCard} <span className="text-muted">(Space)</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => dispatch({ type: "next" })}
          aria-label={tr.study.next}
          className="size-12 rounded-xl border border-border text-xl hover:bg-surface-hover"
        >
          →
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {allowKnown ? (
          <button
            type="button"
            onClick={markKnown}
            disabled={pending}
            className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
          >
            {tr.study.alreadyKnow}
          </button>
        ) : (
          <span />
        )}
        <p className="hidden text-xs text-muted md:block">{tr.study.shortcuts}</p>
      </div>
      {knownError && (
        <p role="alert" className="text-sm text-danger">
          {tr.study.alreadyKnowError}
        </p>
      )}
    </section>
  );
}
