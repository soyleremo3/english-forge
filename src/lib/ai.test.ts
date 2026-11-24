import { APICallError } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const generateText = vi.fn();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: (...args: unknown[]) => generateText(...args) };
});
vi.mock("@ai-sdk/google", () => ({ google: (name: string) => ({ modelId: name }) }));

const { AiQuotaError, AiUnavailableError, generateStructured, getModelChain } = await import("./ai");

const schema = z.object({ word: z.string() });

function quotaError() {
  return new APICallError({
    message: "Resource has been exhausted",
    url: "https://example.test",
    requestBodyValues: {},
    statusCode: 429,
    responseBody: '{"error":{"status":"RESOURCE_EXHAUSTED"}}',
  });
}

describe("getModelChain", () => {
  it("virgülle ayrılmış listeyi sırasıyla döner", () => {
    expect(getModelChain(" lite , flash ,")).toEqual(["lite", "flash"]);
  });

  it("boşsa hata verir", () => {
    expect(() => getModelChain("")).toThrow(AiUnavailableError);
  });
});

describe("generateStructured", () => {
  beforeEach(() => {
    generateText.mockReset();
  });

  it("ilk model başarılıysa onu kullanır", async () => {
    generateText.mockResolvedValueOnce({ output: { word: "go" } });
    const res = await generateStructured({ schema, system: "s", prompt: "p", models: ["lite", "flash"] });
    expect(res).toEqual({ data: { word: "go" }, model: "lite" });
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("kota ya da hata durumunda sıradaki modele geçer", async () => {
    const attempts: unknown[] = [];
    generateText
      .mockRejectedValueOnce(quotaError())
      .mockResolvedValueOnce({ output: { word: "run" } });
    const res = await generateStructured({
      schema,
      system: "s",
      prompt: "p",
      models: ["lite", "flash"],
      onAttempt: (a) => {
        attempts.push(a);
      },
    });
    expect(res.model).toBe("flash");
    expect(attempts).toEqual([
      { model: "lite", ok: false, reason: "quota" },
      { model: "flash", ok: true },
    ]);
  });

  it("503 yoğunluk hatasında aynı modeli yeniden dener", async () => {
    const busy = new APICallError({
      message: "high demand",
      url: "https://example.test",
      requestBodyValues: {},
      statusCode: 503,
    });
    generateText
      .mockImplementationOnce(async () => {
        throw busy;
      })
      .mockResolvedValueOnce({ output: { word: "ok" } });
    const res = await generateStructured({
      schema,
      system: "s",
      prompt: "p",
      models: ["lite", "flash"],
      retryDelaysMs: [0],
    });
    expect(res.model).toBe("lite");
    expect(generateText).toHaveBeenCalledTimes(2);
  });

  it("yoğunluk sürerse denemeler bitince sıradaki modele geçer", async () => {
    const attempts: unknown[] = [];
    generateText
      .mockImplementationOnce(async () => {
        throw new APICallError({ message: "x", url: "u", requestBodyValues: {}, statusCode: 503 });
      })
      .mockImplementationOnce(async () => {
        throw new APICallError({ message: "x", url: "u", requestBodyValues: {}, statusCode: 503 });
      })
      .mockResolvedValueOnce({ output: { word: "ok" } });
    const res = await generateStructured({
      schema,
      system: "s",
      prompt: "p",
      models: ["lite", "flash"],
      retryDelaysMs: [0],
      onAttempt: (a) => {
        attempts.push(a);
      },
    });
    expect(res.model).toBe("flash");
    expect(attempts[0]).toEqual({ model: "lite", ok: false, reason: "busy" });
  });

  it("şemaya uymayan çıktıyı kabul etmez", async () => {
    generateText.mockResolvedValue({ output: { word: 42 } });
    await expect(
      generateStructured({ schema, system: "s", prompt: "p", models: ["lite"] }),
    ).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("bütün modellerin kotası dolunca AiQuotaError fırlatır", async () => {
    generateText.mockImplementation(async () => {
      throw quotaError();
    });
    await expect(
      generateStructured({ schema, system: "s", prompt: "p", models: ["lite", "flash"] }),
    ).rejects.toBeInstanceOf(AiQuotaError);
  });

  it("kota dışı hatalar karışıksa AiUnavailableError fırlatır", async () => {
    generateText.mockRejectedValueOnce(quotaError()).mockRejectedValueOnce(new Error("boom"));
    await expect(
      generateStructured({ schema, system: "s", prompt: "p", models: ["lite", "flash"] }),
    ).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("20 sn zaman aşımı sinyali ve maxRetries 0 ile çağırır", async () => {
    const spy = vi.spyOn(AbortSignal, "timeout");
    generateText.mockResolvedValueOnce({ output: { word: "x" } });
    await generateStructured({ schema, system: "s", prompt: "p", models: ["lite"] });
    expect(spy).toHaveBeenCalledWith(20_000);
    expect(generateText.mock.calls[0][0]).toMatchObject({ maxRetries: 0 });
    spy.mockRestore();
  });
});
