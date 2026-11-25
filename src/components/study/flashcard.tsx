"use client";

import { tr } from "@/i18n/tr";
import type { StudyWord } from "@/lib/new-words";

type Props = {
  word: StudyWord;
  flipped: boolean;
  onFlip: () => void;
  onSpeak?: () => void;
  speechSupported: boolean;
};

// Kart (SPEC 5.3): ön yüz Türkçe anlam ve kelime türü; arka yüz İngilizce kelime, telaffuz, örnek cümle.
// Dokununca ya da Space ile döner. prefers-reduced-motion açıksa animasyonsuz.
export function Flashcard({ word, flipped, onFlip, onSpeak, speechSupported }: Props) {
  const pos = word.pos ? (tr.pos[word.pos] ?? word.pos) : null;
  const [first, ...rest] = word.tr_meanings;

  return (
    <div className="perspective-distant">
      <div
        className={`relative grid min-h-72 transition-transform duration-500 ease-out transform-3d motion-reduce:transition-none ${
          flipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Ön yüz */}
        <button
          type="button"
          onClick={onFlip}
          aria-label={`${tr.study.flipCard}: ${first}`}
          aria-hidden={flipped}
          tabIndex={flipped ? -1 : 0}
          className="col-start-1 row-start-1 flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-surface p-6 text-center backface-hidden"
        >
          <span className="text-xs font-medium tracking-wide text-muted uppercase">{tr.study.front}</span>
          <span className="text-3xl font-semibold">{first}</span>
          {rest.length > 0 && <span className="text-lg text-muted">{rest.join(" · ")}</span>}
          {pos && <span className="rounded-full bg-accent-soft px-3 py-1 text-sm text-accent">{pos}</span>}
          <span className="mt-2 text-xs text-muted">{tr.study.tapToFlip}</span>
        </button>

        {/* Arka yüz */}
        <div
          aria-hidden={!flipped}
          className="col-start-1 row-start-1 flex rotate-y-180 flex-col items-center justify-center gap-3 rounded-3xl border border-accent/40 bg-surface p-6 text-center backface-hidden"
        >
          <span className="text-xs font-medium tracking-wide text-muted uppercase">{tr.study.back_}</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onFlip}
              tabIndex={flipped ? 0 : -1}
              className="text-4xl font-semibold"
              aria-label={`${tr.study.flipCard}: ${word.lemma}`}
            >
              {word.lemma}
            </button>
            {speechSupported && onSpeak && (
              <button
                type="button"
                onClick={onSpeak}
                tabIndex={flipped ? 0 : -1}
                aria-label={tr.study.listen}
                title={`${tr.study.listen} (P)`}
                className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent hover:opacity-80"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          {pos && <span className="text-sm text-muted">{pos}</span>}
          {word.example_en && (
            <div className="mt-2 max-w-md space-y-1">
              <p className="text-xs text-muted">{tr.study.example}</p>
              <p className="text-base">{word.example_en}</p>
              {word.example_tr && <p className="text-sm text-muted">{word.example_tr}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
