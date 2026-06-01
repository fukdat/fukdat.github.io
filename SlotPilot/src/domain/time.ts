/** A half-open time interval [start, end). */
export interface Interval {
  readonly start: Date;
  readonly end: Date;
}

const MS_PER_MINUTE = 60_000;
export const MINUTES_PER_DAY = 24 * 60;

/**
 * Two half-open intervals overlap iff each starts before the other ends.
 * Adjacent intervals (a.end === b.start) do NOT overlap.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** Minutes elapsed since UTC midnight for the given instant. */
export function minutesOfDayUTC(instant: Date): number {
  return instant.getUTCHours() * 60 + instant.getUTCMinutes();
}

/** Duration of an interval in whole minutes. */
export function durationMinutes(interval: Interval): number {
  return (interval.end.getTime() - interval.start.getTime()) / MS_PER_MINUTE;
}

/** Build a UTC instant at the given calendar day plus an offset in minutes. */
export function atUTCMinute(day: Date, minuteOfDay: number): Date {
  const midnight = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  return new Date(midnight + minuteOfDay * MS_PER_MINUTE);
}

/** Add minutes to an instant, returning a new Date. */
export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * MS_PER_MINUTE);
}
