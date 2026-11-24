/** Gemini model listesini gösterir (anahtar yazdırılmaz). npm run models */
import { loadLocalEnv } from "./load-env";

type Model = { name: string; displayName?: string; supportedGenerationMethods?: string[] };

async function main() {
  loadLocalEnv();
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY boş.");

  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    headers: { "x-goog-api-key": key },
  });
  if (!res.ok) throw new Error(`Model listesi alınamadı: HTTP ${res.status}`);

  const body = (await res.json()) as { models?: Model[] };
  for (const m of body.models ?? []) {
    if (!m.supportedGenerationMethods?.includes("generateContent")) continue;
    console.log(`${m.name.replace(/^models\//, "")}\t${m.displayName ?? ""}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
