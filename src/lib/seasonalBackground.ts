import type { BackgroundKey } from "~/components/backgrounds";

/** [month (1-12), day of month], inclusive. */
type MonthDay = readonly [month: number, day: number];

/**
 * Date range → background for `SITE_BACKGROUND=dynamic`. The first matching
 * row wins; a range whose `to` is earlier than its `from` wraps past New Year.
 * Add rows (e.g. a short holiday range above a season) to extend it.
 */
export const SEASONAL_BACKGROUNDS: readonly {
  from: MonthDay;
  to: MonthDay;
  background: BackgroundKey;
}[] = [
  { from: [9, 1], to: [11, 30], background: "leaves" }, // fall
  { from: [12, 1], to: [2, 29], background: "snow" }, // winter (Feb 29 covers leap years)
];

/** Used on any date no row matches. */
export const FALLBACK_BACKGROUND: BackgroundKey = "rain";

const key = ([month, day]: MonthDay) => month * 100 + day;

/** Pick the background for a date, using that date's local month and day. */
export function backgroundForDate(date: Date): BackgroundKey {
  const today = key([date.getMonth() + 1, date.getDate()]);
  for (const { from, to, background } of SEASONAL_BACKGROUNDS) {
    const start = key(from);
    const end = key(to);
    const inRange =
      start <= end ? today >= start && today <= end : today >= start || today <= end;
    if (inRange) return background;
  }
  return FALLBACK_BACKGROUND;
}
