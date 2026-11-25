import "server-only";
import { cookies } from "next/headers";
import { DEV_DAY_OFFSET_COOKIE, isDevToolsEnabled, parseDayOffset, shiftDays } from "./dev-tools";

/** Geliştirmede simüle edilen gün kaydırması; production'da her zaman 0. */
export async function getDayOffset(): Promise<number> {
  if (!isDevToolsEnabled()) return 0;
  return parseDayOffset((await cookies()).get(DEV_DAY_OFFSET_COOKIE)?.value);
}

/**
 * Uygulamanın "şimdi"si. Production'da gerçek zaman.
 * Geliştirmede "Tarihi ileri al" ile kaydırılmış olabilir (ertesi günü denemek için).
 */
export async function getNow(): Promise<Date> {
  const now = new Date();
  const offset = await getDayOffset();
  return offset === 0 ? now : shiftDays(now, offset);
}
