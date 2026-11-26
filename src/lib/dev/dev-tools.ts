// Geliştirici araçları (yalnızca `next dev`). Production'da görünmez ve çalışmaz:
// her giriş noktası isDevToolsEnabled() ile korunur.

/** Simüle edilen gün kaydırmasının tutulduğu çerez. */
export const DEV_DAY_OFFSET_COOKIE = "ef-dev-day-offset";

const MAX_OFFSET_DAYS = 3650;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isDevToolsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "development";
}

/** Test kullanıcısı mı? Kural: e-postanın yerel kısmı "+test" ya da otomasyon için "+e2e" ile biter. */
export function isTestEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && /\+(test|e2e)@/i.test(email.trim());
}

/** Çerez değerini güvenle gün sayısına çevirir (0–3650, geçersizse 0). */
export function parseDayOffset(value: string | undefined): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return 0;
  return Math.min(n, MAX_OFFSET_DAYS);
}

export function shiftDays(now: Date, days: number): Date {
  return new Date(now.getTime() + days * DAY_MS);
}
