// Bütün tarih hesapları bu dosyadan geçer (SPEC 4, CLAUDE.md).
// "Çalışma günü" (study date) YYYY-MM-DD biçiminde bir takvim günüdür ve
// DAY_START_HOUR'da (varsayılan 04:00) başlar: gece 01:00'deki çalışma önceki güne sayılır.

export type IsoDate = string; // "YYYY-MM-DD"

export type TimeConfig = {
  timeZone: string;
  dayStartHour: number;
};

export const DEFAULT_TIME_CONFIG: TimeConfig = {
  timeZone: "Europe/Istanbul",
  dayStartHour: 4,
};

/** Ortam değişkenlerinden (APP_TIMEZONE, DAY_START_HOUR) ayarları okur; geçersizse varsayılan. */
export function getTimeConfig(env: Record<string, string | undefined> = process.env): TimeConfig {
  const hour = Number(env.DAY_START_HOUR);
  return {
    timeZone: env.APP_TIMEZONE || DEFAULT_TIME_CONFIG.timeZone,
    dayStartHour:
      Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_TIME_CONFIG.dayStartHour,
  };
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Bir anın verilen saat dilimindeki takvim günü (YYYY-MM-DD). */
export function calendarDate(instant: Date, timeZone: string): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Çalışma günü: anı gün başlangıç saati kadar geri kaydırıp yerel takvim gününü alır. */
export function getStudyDate(now: Date = new Date(), config: TimeConfig = getTimeConfig()): IsoDate {
  return calendarDate(new Date(now.getTime() - config.dayStartHour * HOUR_MS), config.timeZone);
}

function toUtcMs(date: IsoDate): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Geçersiz tarih: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** b - a, gün olarak. diffDays("2026-01-01", "2026-01-03") = 2 */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Saat dilimindeki yerel saat ile UTC arasındaki fark (dakika): yerel = UTC + fark. */
function zoneOffsetMinutes(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - instantMs) / 60_000);
}

/** Bir çalışma gününün başladığı an: o günün yerel DAY_START_HOUR'u (ör. 2026-11-26 04:00 İstanbul). */
export function startOfStudyDay(date: IsoDate, config: TimeConfig = getTimeConfig()): Date {
  const guess = toUtcMs(date) + config.dayStartHour * HOUR_MS;
  // Yerel saati UTC'ye çevir; yaz saati geçişine karşı farkı bir kez daha kontrol et.
  let instant = guess - zoneOffsetMinutes(guess, config.timeZone) * 60_000;
  instant = guess - zoneOffsetMinutes(instant, config.timeZone) * 60_000;
  return new Date(instant);
}

/** Çalışma gününün bittiği an (ertesi çalışma gününün başlangıcı). */
export function endOfStudyDay(date: IsoDate, config: TimeConfig = getTimeConfig()): Date {
  return startOfStudyDay(addDays(date, 1), config);
}

/** 1 = Pazartesi … 7 = Pazar (ISO). */
export function isoWeekday(date: IsoDate): number {
  const d = new Date(toUtcMs(date)).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Tarihin içinde bulunduğu haftanın Pazartesi günü. */
export function weekStart(date: IsoDate): IsoDate {
  return addDays(date, 1 - isoWeekday(date));
}
