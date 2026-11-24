import "server-only";
import { google } from "@ai-sdk/google";
import { APICallError, generateText, Output } from "ai";
import type { z } from "zod";

// Yapay zekâ katmanı (docs/SPEC.md 7.1).
// - Yalnızca sunucuda ve betiklerde çalışır (server-only).
// - GEMINI_MODELS sırayla denenir; hata, zaman aşımı ya da kota durumunda sıradakine geçilir.
// - Çıktı zod şemasıyla doğrulanır.
// Kullanım kaydı ve günlük bütçe (ai_usage) çağıran katmanda, onAttempt ile yapılır.

export const AI_TIMEOUT_MS = 20_000;

/** Bütün modellerin kotası doldu. "Yarın tekrar dene" durumu. */
export class AiQuotaError extends Error {
  constructor(message = "Bütün Gemini modellerinin kotası doldu.") {
    super(message);
    this.name = "AiQuotaError";
  }
}

/** Hiçbir model geçerli bir cevap üretemedi (kota dışı sebepler). */
export class AiUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiUnavailableError";
  }
}

export type AiAttempt = {
  model: string;
  ok: boolean;
  /** Başarısızsa kısa sebep: quota | timeout | invalid_output | error */
  reason?: "quota" | "busy" | "timeout" | "invalid_output" | "error";
};

export function getModelChain(raw: string | undefined = process.env.GEMINI_MODELS): string[] {
  const models = (raw ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
  if (models.length === 0) {
    throw new AiUnavailableError("GEMINI_MODELS boş. .env.local içine model adlarını yaz.");
  }
  return models;
}

export function isQuotaError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) return true;
    if (error.responseBody?.includes("RESOURCE_EXHAUSTED")) return true;
  }
  return error instanceof Error && /RESOURCE_EXHAUSTED|quota/i.test(error.message);
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError" || /timed? ?out/i.test(error.message))
  );
}

function classify(error: unknown): NonNullable<AiAttempt["reason"]> {
  if (isQuotaError(error)) return "quota";
  if (isTransientError(error)) return "busy";
  if (isTimeoutError(error)) return "timeout";
  if (error instanceof Error && error.name === "AI_NoObjectGeneratedError") return "invalid_output";
  return "error";
}

export type GenerateStructuredOptions<S extends z.ZodType> = {
  schema: S;
  system: string;
  prompt: string;
  /** Varsayılan 20 sn (SPEC 7.1). */
  timeoutMs?: number;
  /** Her model denemesinden sonra çağrılır (ai_usage kaydı, konsol ilerlemesi). */
  onAttempt?: (attempt: AiAttempt) => void | Promise<void>;
  /** Test için: model sırasını elle ver. */
  models?: string[];
  /** Modelin düşünme düzeyi. Kısa, yapılandırılmış işler için "minimal" yeterli ve hızlı. */
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  /** Geçici yoğunlukta (503) aynı modeli yeniden denemeden önce beklenecek süreler. */
  retryDelaysMs?: readonly number[];
};

const DEFAULT_RETRY_DELAYS_MS = [2_000, 5_000] as const;

/** 503 "high demand" gibi geçici sunucu hataları: aynı model kısa süre sonra tekrar denenir. */
export function isTransientError(error: unknown): boolean {
  return APICallError.isInstance(error) && (error.statusCode === 503 || error.statusCode === 500);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateStructured<S extends z.ZodType>(
  options: GenerateStructuredOptions<S>,
): Promise<{ data: z.infer<S>; model: string }> {
  const models = options.models ?? getModelChain();
  const timeout = options.timeoutMs ?? AI_TIMEOUT_MS;
  const retryDelays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  let lastError: unknown;
  let allQuota = true;

  for (const model of models) {
    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      try {
        const { output } = await generateText({
          model: google(model),
          system: options.system,
          prompt: options.prompt,
          output: Output.object({ schema: options.schema }),
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(timeout),
          providerOptions: {
            google: { thinkingConfig: { thinkingLevel: options.thinkingLevel ?? "minimal" } },
          },
        });
        // Output.object şemayla doğrular; yine de tipi kesinleştirmek için bir kez daha parse et.
        const data = options.schema.parse(output) as z.infer<S>;
        await options.onAttempt?.({ model, ok: true });
        return { data, model };
      } catch (error) {
        lastError = error;
        if (isTransientError(error) && attempt < retryDelays.length) {
          await sleep(retryDelays[attempt]);
          continue;
        }
        const reason = classify(error);
        if (reason !== "quota") allQuota = false;
        await options.onAttempt?.({ model, ok: false, reason });
        break;
      }
    }
  }

  if (allQuota) throw new AiQuotaError();
  throw new AiUnavailableError("Hiçbir Gemini modeli cevap veremedi.", { cause: lastError });
}
