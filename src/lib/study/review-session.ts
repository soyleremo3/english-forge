import type { ReviewGrade } from "@/lib/fsrs";

// Tekrar oturumu (SPEC 5.5). Saf durum makinesi; arayüz ve localStorage bunu kullanır.
//
// - Ana tur: vadesi gelen kartlar sırayla. Her kartın İLK cevabı FSRS'e gider (firstGrades).
// - "Bilemedim" (Again) denen kartlar ana turdan sonra bir kez daha gösterilir ve "Bildim" denene kadar
//   döngüde kalır (relearn). Bu ek turlar FSRS'i ETKİLEMEZ: firstGrades değişmez.
// - Ana turda her N. kart yazılı sorulur (typed_review_every; 0 = hiç). Ek turlar hep karttır.

export type ReviewPhase = "main" | "relearn" | "done";

export type ReviewSessionState = {
  /** Ana turun kartları (words.id), vade sırasıyla */
  queue: number[];
  /** Ana turdaki konum */
  pos: number;
  /** Kartın arka yüzü görünüyor mu */
  flipped: boolean;
  phase: ReviewPhase;
  /** Kartların o günkü ilk cevabı — FSRS'e yalnızca bu işlenir */
  firstGrades: Record<number, ReviewGrade>;
  /** "Bildim" denene kadar dönen kartlar (ön sıradaki gösterilir) */
  relearn: number[];
};

/** Sunucuya gönderilecek ilk cevap (giden kutusunda bekler, kaydedilince silinir). */
export type ReviewPayload = {
  wordId: number;
  grade: ReviewGrade;
  typed?: { answer: string; appealed: boolean };
};

export type ReviewAction =
  | { type: "flip" }
  | { type: "answer"; grade: ReviewGrade };

/**
 * Yeni oturum. `relearn`: bugün zaten "Bilemedim" denmiş ama henüz "Bildim" denmemiş kartlar
 * (sayfa yenilendiğinde ek tur kaybolmasın). Ana tur boşsa doğrudan ek turla başlar.
 */
export function createReviewSession(queue: readonly number[], relearn: readonly number[] = []): ReviewSessionState {
  const pending = relearn.filter((id) => !queue.includes(id));
  return {
    queue: [...queue],
    pos: 0,
    flipped: false,
    phase: queue.length > 0 ? "main" : pending.length > 0 ? "relearn" : "done",
    firstGrades: {},
    relearn: [...pending],
  };
}

export function currentCard(state: ReviewSessionState): number | null {
  if (state.phase === "main") return state.queue[state.pos] ?? null;
  if (state.phase === "relearn") return state.relearn[0] ?? null;
  return null;
}

/** Bu kart yazılı mı sorulacak? Ana turda her N. kart (1'den sayarak N, 2N, …). */
export function isTypedCard(state: ReviewSessionState, typedEvery: number): boolean {
  return state.phase === "main" && typedEvery > 0 && (state.pos + 1) % typedEvery === 0;
}

/** "Bilemedim" sayılan cevap: yalnızca Again. Hard/Good/Easy kartı bilinmiş sayar. */
const isLapse = (grade: ReviewGrade) => grade === "again";

export function reviewReducer(state: ReviewSessionState, action: ReviewAction): ReviewSessionState {
  const id = currentCard(state);
  if (id === null) return state;

  if (action.type === "flip") return { ...state, flipped: !state.flipped };

  if (state.phase === "main") {
    const firstGrades = id in state.firstGrades ? state.firstGrades : { ...state.firstGrades, [id]: action.grade };
    const relearn = isLapse(action.grade) && !state.relearn.includes(id) ? [...state.relearn, id] : state.relearn;
    const pos = state.pos + 1;
    if (pos < state.queue.length) return { ...state, firstGrades, relearn, pos, flipped: false };
    return { ...state, firstGrades, relearn, pos, flipped: false, phase: relearn.length > 0 ? "relearn" : "done" };
  }

  // Ek tur: FSRS'e dokunmaz. Bildim → döngüden çıkar; Bilemedim → sona gider, tekrar gelir.
  const [, ...rest] = state.relearn;
  const relearn = isLapse(action.grade) ? [...rest, id] : rest;
  return { ...state, relearn, flipped: false, phase: relearn.length > 0 ? "relearn" : "done" };
}

/** Bir cevabın FSRS'e gönderilmesi gerekiyor mu? (Yalnızca ana turda ve kartın ilk cevabıysa.) */
export function shouldSubmit(state: ReviewSessionState): boolean {
  const id = currentCard(state);
  return state.phase === "main" && id !== null && !(id in state.firstGrades);
}

/**
 * Kayıtlı oturum hâlâ geçerli mi? Sunucunun döndürdüğü "kalan" kartların hepsi oturumun ana turunda
 * olmalı ve oturumdaki her kartın verisi elimizde olmalı.
 */
export function isReviewSessionValid(
  state: ReviewSessionState,
  remaining: readonly number[],
  known: ReadonlySet<number>,
): boolean {
  return (
    remaining.every((id) => state.queue.includes(id)) &&
    state.queue.every((id) => known.has(id)) &&
    state.relearn.every((id) => known.has(id))
  );
}
