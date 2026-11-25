// Grup çalışması tur mantığı (SPEC 5.3). Saf durum makinesi; arayüz ve localStorage bunu kullanır.
//
// - Bir tur, gruptaki aktif kelimelerin sırayla gösterilmesidir.
// - Son kelimeden sonra başa dönülür: yeni tur, aktif kelimelerle başlar (sıra karışır, ayar kapalı değilse).
// - "Bildim" denen kelime aktif listeden çıkar, sonraki turda gelmez. "Bilemedim" listede kalır.
// - Kullanıcı istediği an ileri/geri gidebilir. Döngü sonsuzdur.
// - Aktif kelime kalmayınca "Bu grubu bir daha çalışmak ister misin?" sorusu (phase: "ask").
//   Evet → bütün kelimeler yeniden aktif, yeni tur. Hayır → grup sınavı (arayüz yönlendirir).

export type GroupSessionState = {
  /** Gruptaki bütün kelimeler (words.id) */
  wordIds: number[];
  /** Henüz "Bildim" denmemiş kelimeler */
  active: number[];
  /** Bu turun gösterim sırası */
  order: number[];
  /** order içindeki konum */
  pos: number;
  /** Tur numarası (1'den başlar) */
  round: number;
  /** Kartın arka yüzü (İngilizce) görünüyor mu */
  flipped: boolean;
  phase: "study" | "ask";
};

export type SessionAction =
  | { type: "flip" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "rate"; knew: boolean }
  | { type: "repeat" }
  | { type: "replace"; oldId: number; newId: number | null };

export type SessionOptions = {
  /** Her yeni turda sırayı karıştır (ayar: shuffle_rounds) */
  shuffle: boolean;
  /** 0 ≤ x < 1; testlerde sabitlenir */
  rng?: () => number;
};

export function shuffled<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** İlk tur kelimeleri sırasıyla gösterir; karıştırma "her yeni turda" yapılır. */
export function createSession(wordIds: readonly number[]): GroupSessionState {
  return {
    wordIds: [...wordIds],
    active: [...wordIds],
    order: [...wordIds],
    pos: 0,
    round: 1,
    flipped: false,
    phase: wordIds.length === 0 ? "ask" : "study",
  };
}

export function currentWordId(state: GroupSessionState): number | null {
  if (state.phase !== "study") return null;
  return state.order[state.pos] ?? null;
}

/** Aktif kelimelerin, gruptaki asıl sırayı koruyarak listesi. */
function activeInGroupOrder(state: GroupSessionState, active: readonly number[]): number[] {
  return state.wordIds.filter((id) => active.includes(id));
}

function startRound(state: GroupSessionState, active: number[], opts: SessionOptions): GroupSessionState {
  if (active.length === 0) return { ...state, active, flipped: false, phase: "ask" };
  const base = activeInGroupOrder(state, active);
  return {
    ...state,
    active,
    order: opts.shuffle ? shuffled(base, opts.rng) : base,
    pos: 0,
    round: state.round + 1,
    flipped: false,
    phase: "study",
  };
}

function advance(state: GroupSessionState, opts: SessionOptions): GroupSessionState {
  if (state.pos + 1 < state.order.length) return { ...state, pos: state.pos + 1, flipped: false };
  // Son kelimeden sonra başa dön: yeni tur.
  return startRound(state, state.active, opts);
}

export function sessionReducer(
  state: GroupSessionState,
  action: SessionAction,
  opts: SessionOptions,
): GroupSessionState {
  switch (action.type) {
    case "flip":
      return state.phase === "study" ? { ...state, flipped: !state.flipped } : state;

    case "next":
      return state.phase === "study" ? advance(state, opts) : state;

    case "prev":
      if (state.phase !== "study" || state.pos === 0) return { ...state, flipped: false };
      return { ...state, pos: state.pos - 1, flipped: false };

    case "rate": {
      const id = currentWordId(state);
      // Bildim/Bilemedim yalnızca arka yüz görünürken.
      if (id === null || !state.flipped) return state;
      const active = action.knew
        ? state.active.filter((x) => x !== id)
        : state.active.includes(id)
          ? state.active
          : [...state.active, id];
      if (active.length === 0) return { ...state, active, flipped: false, phase: "ask" };
      return advance({ ...state, active }, opts);
    }

    case "repeat":
      // "Evet": gruptaki bütün kelimeler yeniden aktif, yeni tur.
      return startRound(state, [...state.wordIds], opts);

    case "replace": {
      const { oldId, newId } = action;
      if (!state.wordIds.includes(oldId)) return state;
      const swap = (list: number[]) =>
        newId === null ? list.filter((x) => x !== oldId) : list.map((x) => (x === oldId ? newId : x));
      const wordIds = swap(state.wordIds);
      // Yeni kelime her zaman aktiftir (henüz öğrenilmedi).
      const active = newId === null ? state.active.filter((x) => x !== oldId) : [...swap(state.active.filter((x) => x !== oldId)), newId];
      const removedAt = state.order.indexOf(oldId);
      const order = swap(state.order);
      let pos = state.pos;
      if (newId === null && removedAt !== -1 && removedAt < pos) pos -= 1;
      const next: GroupSessionState = { ...state, wordIds, active: [...new Set(active)], order, pos, flipped: false };
      if (wordIds.length === 0 || next.active.length === 0) return { ...next, phase: "ask" };
      if (pos >= order.length) return startRound(next, next.active, opts);
      return next;
    }
  }
}

/** Kaydedilmiş oturum bu gruba mı ait ve tutarlı mı? (localStorage'dan dönüşte) */
export function isSessionValid(state: GroupSessionState, wordIds: readonly number[]): boolean {
  const same = state.wordIds.length === wordIds.length && state.wordIds.every((id, i) => id === wordIds[i]);
  if (!same) return false;
  const inGroup = (id: number) => wordIds.includes(id);
  return (
    state.active.every(inGroup) &&
    state.order.every(inGroup) &&
    state.pos >= 0 &&
    (state.phase === "ask" || state.pos < state.order.length)
  );
}
