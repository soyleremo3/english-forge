import { describe, expect, it } from "vitest";
import { buildTaskViews, dayProgress, parseTasks, type TaskContext, updateTaskProgress } from "./tasks";

const ctx = (dueCount: number): TaskContext => ({
  dueCount,
  settings: { daily_new: 8, min_sentences: 3, review_cap: 150 },
});

const statusOf = (views: ReturnType<typeof buildTaskViews>) =>
  Object.fromEntries(views.map((v) => [v.key, v.status]));

describe("parseTasks", () => {
  it("bozuk ya da boş jsonb'yi boş görev listesine çevirir", () => {
    expect(parseTasks(null)).toEqual({});
    expect(parseTasks("x")).toEqual({});
    expect(parseTasks({ review: { done: true } })).toEqual({ review: { done: true, count: 0 } });
  });
});

describe("buildTaskViews", () => {
  it("boş gün: tekrar kartı varsa hepsi bekliyor, günlük test kilitli", () => {
    const views = buildTaskViews({}, ctx(12));
    expect(statusOf(views)).toEqual({
      review: "pending",
      new_words: "pending",
      daily_test: "locked",
      sentences: "pending",
    });
    expect(views.find((v) => v.key === "review")?.total).toBe(12);
    expect(views.find((v) => v.key === "new_words")?.total).toBe(8);
  });

  it("vadesi gelen kart yoksa tekrar kendiliğinden tamam", () => {
    const review = buildTaskViews({}, ctx(0)).find((v) => v.key === "review");
    expect(review).toMatchObject({ status: "done", auto: true });
  });

  it("tekrar hedefi review_cap ile sınırlanır", () => {
    const review = buildTaskViews({}, ctx(400)).find((v) => v.key === "review");
    expect(review?.total).toBe(150);
  });

  it("yeni kelimeler bitince günlük test açılır", () => {
    const views = buildTaskViews({ new_words: { done: true, count: 8 } }, ctx(5));
    expect(statusOf(views).daily_test).toBe("pending");
  });

  it("ilerleme varsa devam ediyor, cümle hedefi dolunca tamam", () => {
    const views = buildTaskViews({ review: { done: false, count: 3 }, sentences: { done: false, count: 3 } }, ctx(5));
    expect(statusOf(views).review).toBe("in_progress");
    expect(statusOf(views).sentences).toBe("done");
  });
});

describe("dayProgress", () => {
  const allDone = {
    review: { done: true, count: 10 },
    new_words: { done: true, count: 8 },
    daily_test: { done: true, count: 1 },
    sentences: { done: true, count: 3 },
  };

  it("bütün zorunlu görevler bitince gün tamam", () => {
    const p = dayProgress(buildTaskViews(allDone, ctx(0)), ["review", "new_words", "daily_test", "sentences"]);
    expect(p).toEqual({ done: 4, total: 4, complete: true });
  });

  it("bir zorunlu görev eksikse gün tamam değil", () => {
    const tasks = updateTaskProgress(allDone, "sentences", { done: false, count: 1 });
    const p = dayProgress(buildTaskViews(tasks, ctx(0)), ["review", "new_words", "daily_test", "sentences"]);
    expect(p).toEqual({ done: 3, total: 4, complete: false });
  });

  it("zorunlu olmayan görev günü engellemez", () => {
    const tasks = { review: { done: true, count: 1 }, new_words: { done: true, count: 8 } };
    const p = dayProgress(buildTaskViews(tasks, ctx(0)), ["review", "new_words"]);
    expect(p.complete).toBe(true);
  });
});
