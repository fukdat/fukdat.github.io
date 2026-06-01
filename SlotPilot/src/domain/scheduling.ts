import { ValidationError } from './errors';
import {
  Interval,
  MINUTES_PER_DAY,
  addMinutes,
  atUTCMinute,
  durationMinutes,
  minutesOfDayUTC,
  overlaps,
} from './time';

/** Sunday = 0 ... Saturday = 6 (matches Date.getUTCDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A recurring weekly window of availability, in minutes from UTC midnight. */
export interface AvailabilityRule {
  readonly weekday: Weekday;
  readonly startMinute: number;
  readonly endMinute: number;
}

export interface SlotGenerationParams {
  /** Any instant within the target UTC calendar day. */
  readonly day: Date;
  readonly rules: readonly AvailabilityRule[];
  readonly serviceDurationMinutes: number;
  /** Grain at which candidate start times are generated. */
  readonly stepMinutes: number;
  /** Active bookings to subtract from availability. */
  readonly busy: readonly Interval[];
  /** Current instant; slots starting before this are excluded. */
  readonly now: Date;
}

/**
 * Generate all free, bookable slots for a resource on a given UTC day.
 * Pure and deterministic: same inputs always yield the same slots.
 */
export function generateSlots(params: SlotGenerationParams): Interval[] {
  const { day, rules, serviceDurationMinutes, stepMinutes, busy, now } = params;
  if (serviceDurationMinutes <= 0) {
    throw new ValidationError('service duration must be positive');
  }
  if (stepMinutes <= 0) {
    throw new ValidationError('step must be positive');
  }

  const weekday = day.getUTCDay() as Weekday;
  const slots: Interval[] = [];

  for (const rule of rules) {
    if (rule.weekday !== weekday) continue;
    for (
      let startMin = rule.startMinute;
      startMin + serviceDurationMinutes <= rule.endMinute;
      startMin += stepMinutes
    ) {
      const start = atUTCMinute(day, startMin);
      const slot: Interval = { start, end: addMinutes(start, serviceDurationMinutes) };
      if (start.getTime() < now.getTime()) continue;
      if (busy.some((b) => overlaps(slot, b))) continue;
      slots.push(slot);
    }
  }

  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Validate that an interval is bookable against business hours and the
 * clock. Throws ValidationError with a precise reason; does NOT check
 * overlaps (that invariant is enforced atomically at persistence time).
 */
export function assertBookable(
  interval: Interval,
  rules: readonly AvailabilityRule[],
  now: Date,
): void {
  if (interval.end.getTime() <= interval.start.getTime()) {
    throw new ValidationError('end must be after start');
  }
  if (interval.start.getTime() < now.getTime()) {
    throw new ValidationError('cannot book a slot in the past');
  }

  const startMin = minutesOfDayUTC(interval.start);
  const endMin = startMin + durationMinutes(interval);
  if (endMin > MINUTES_PER_DAY) {
    throw new ValidationError('booking must not cross UTC midnight');
  }

  const weekday = interval.start.getUTCDay() as Weekday;
  const fits = rules.some(
    (r) => r.weekday === weekday && r.startMinute <= startMin && endMin <= r.endMinute,
  );
  if (!fits) {
    throw new ValidationError('requested time is outside business hours');
  }
}
