export interface ZonedClock {
  weekday: string;
  isWeekday: boolean;
  year: string;
  month: string;
  day: string;
  hour: number;
  minute: number;
  second: number;
  hhmm: number;
  dateStr: string;
  formattedTime: string;
}

const WEEKDAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

function getZonedClock(timeZone: string, date: Date = new Date()): ZonedClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  const rawHour = Number(map.hour ?? 0);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(map.minute ?? 0);
  const second = Number(map.second ?? 0);
  const weekday = map.weekday ?? "Mon";
  const year = map.year ?? "1970";
  const month = map.month ?? "01";
  const day = map.day ?? "01";

  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    weekday,
    isWeekday: WEEKDAYS.has(weekday),
    year,
    month,
    day,
    hour,
    minute,
    second,
    hhmm: hour * 100 + minute,
    dateStr: `${year}-${month}-${day}`,
    formattedTime: `${pad(hour)}:${pad(minute)}:${pad(second)}`,
  };
}

export function getTaipeiClock(date: Date = new Date()): ZonedClock {
  return getZonedClock("Asia/Taipei", date);
}

/**
 * 判斷目前是否為台股集中/櫃買常態交易時段 (週一至週五 09:00 - 13:30 Asia/Taipei)。
 * @param allowClosingBuffer 若為 true，包含 13:30~13:35 收盤撮合/資料落地緩衝期。
 */
export function isTwMarketTradingHours(
  allowClosingBuffer = false,
  date: Date = new Date()
): boolean {
  const tw = getTaipeiClock(date);
  if (!tw.isWeekday) return false;
  const endHhmm = allowClosingBuffer ? 1335 : 1330;
  return tw.hhmm >= 900 && tw.hhmm <= endHhmm;
}

/**
 * 判斷目前是否為美股常態交易時段 (週一至週五 09:30 - 16:00 America/New_York，自動適配夏令/冬令時間)。
 */
export function isUsMarketTradingHours(date: Date = new Date()): boolean {
  const us = getZonedClock("America/New_York", date);
  if (!us.isWeekday) return false;
  return us.hhmm >= 930 && us.hhmm <= 1600;
}

export function getTwMarketPhase(date: Date = new Date()): {
  isOpen: boolean;
  label: string;
  clock: ZonedClock;
} {
  const clock = getTaipeiClock(date);
  if (!clock.isWeekday) {
    return { isOpen: false, label: "休市中 (假日)", clock };
  }
  if (clock.hhmm < 830) {
    return { isOpen: false, label: "已收盤", clock };
  }
  if (clock.hhmm < 900) {
    return { isOpen: false, label: "盤前試撮", clock };
  }
  if (clock.hhmm <= 1330) {
    return { isOpen: true, label: "盤中即時", clock };
  }
  return { isOpen: false, label: "已收盤", clock };
}
