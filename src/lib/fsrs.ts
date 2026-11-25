import { type Card, createEmptyCard, fsrs, type Grade, generatorParameters, Rating, State } from "ts-fsrs";
import { addDays, getStudyDate, getTimeConfig, startOfStudyDay, type TimeConfig } from "@/lib/time";

// ts-fsrs sarmalayıcısı (SPEC 5.3, 5.5).
// - enable_short_term: false → aralıklar gün cinsinden (dakikalık öğrenme adımı yok).
// - Yeni bir kartın İLK tekrarı her zaman ertesi çalışma günüdür (Good ya da Again fark etmez).
//   İkinci tekrardan itibaren FSRS'in hesapladığı aralık geçerlidir.

export type ReviewGrade = "again" | "hard" | "good" | "easy";

const GRADES: Record<ReviewGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

/** user_words tablosundaki FSRS kolonları. */
export type CardFields = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

export type FsrsOptions = {
  /** Hedef hatırlama oranı (ayar: desired_retention) */
  retention: number;
  timeConfig?: TimeConfig;
  /** Aralıklara küçük rastgelelik; testlerde kapatılır. */
  fuzz?: boolean;
};

function scheduler(options: FsrsOptions) {
  return fsrs(
    generatorParameters({
      request_retention: options.retention,
      enable_short_term: false,
      enable_fuzz: options.fuzz ?? true,
    }),
  );
}

function toFields(card: Card): CardFields {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: 0,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

/** Veritabanındaki sayı → FSRS durumu (New=0, Learning=1, Review=2, Relearning=3). */
function toState(value: number): State {
  switch (value) {
    case State.Learning:
      return State.Learning;
    case State.Review:
      return State.Review;
    case State.Relearning:
      return State.Relearning;
    default:
      return State.New;
  }
}

function fromFields(fields: CardFields): Card {
  const card = createEmptyCard(new Date(fields.due));
  return {
    ...card,
    due: new Date(fields.due),
    stability: fields.stability,
    difficulty: fields.difficulty,
    scheduled_days: fields.scheduled_days,
    learning_steps: fields.learning_steps,
    reps: fields.reps,
    lapses: fields.lapses,
    state: toState(fields.state),
    last_review: fields.last_review ? new Date(fields.last_review) : undefined,
  };
}

/**
 * Yeni kelimenin ilk değerlendirmesi (grup sınavı sonunda). Hafıza durumu FSRS'ten gelir,
 * ama vade her zaman ertesi çalışma gününün başlangıcıdır.
 */
export function firstReview(now: Date, grade: ReviewGrade, options: FsrsOptions): CardFields {
  const tc = options.timeConfig ?? getTimeConfig();
  const { card } = scheduler(options).next(createEmptyCard(now), now, GRADES[grade]);
  const tomorrow = startOfStudyDay(addDays(getStudyDate(now, tc), 1), tc);
  return { ...toFields(card), due: tomorrow.toISOString(), scheduled_days: 1 };
}

/** Sonraki tekrarlar: FSRS'in hesapladığı aralık olduğu gibi kullanılır. */
export function nextReview(
  fields: CardFields,
  now: Date,
  grade: ReviewGrade,
  options: FsrsOptions,
): CardFields {
  const { card } = scheduler(options).next(fromFields(fields), now, GRADES[grade]);
  return toFields(card);
}
