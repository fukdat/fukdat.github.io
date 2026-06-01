import { ValidationError } from '../src/domain/errors';
import { AvailabilityRule, assertBookable, generateSlots, Weekday } from '../src/domain/scheduling';
import { Interval, addMinutes, atUTCMinute } from '../src/domain/time';

const DAY = new Date('2026-06-01T12:00:00.000Z');
const WEEKDAY = DAY.getUTCDay() as Weekday;
const PAST = new Date('2000-01-01T00:00:00.000Z');
const HOURS: AvailabilityRule = { weekday: WEEKDAY, startMinute: 540, endMinute: 1020 };

describe('generateSlots', () => {
  it('fills business hours back-to-back', () => {
    const slots = generateSlots({
      day: DAY,
      rules: [HOURS],
      serviceDurationMinutes: 60,
      stepMinutes: 60,
      busy: [],
      now: PAST,
    });
    // 09:00..16:00 starts -> 8 hourly slots ending by 17:00.
    expect(slots).toHaveLength(8);
    expect(slots[0]!.start.toISOString()).toBe('2026-06-01T09:00:00.000Z');
    expect(slots[7]!.end.toISOString()).toBe('2026-06-01T17:00:00.000Z');
  });

  it('excludes slots overlapping a busy interval', () => {
    const busy: Interval = { start: atUTCMinute(DAY, 600), end: atUTCMinute(DAY, 660) };
    const slots = generateSlots({
      day: DAY,
      rules: [HOURS],
      serviceDurationMinutes: 60,
      stepMinutes: 60,
      busy: [busy],
      now: PAST,
    });
    expect(slots).toHaveLength(7);
    expect(slots.some((s) => s.start.getTime() === busy.start.getTime())).toBe(false);
  });

  it('excludes slots that start in the past', () => {
    const slots = generateSlots({
      day: DAY,
      rules: [HOURS],
      serviceDurationMinutes: 60,
      stepMinutes: 60,
      busy: [],
      now: atUTCMinute(DAY, 660), // 11:00
    });
    expect(slots).toHaveLength(6); // 11:00..16:00
    expect(slots[0]!.start.toISOString()).toBe('2026-06-01T11:00:00.000Z');
  });

  it('returns nothing when no rule matches the weekday', () => {
    const otherDay = (((WEEKDAY + 1) % 7) as Weekday);
    const slots = generateSlots({
      day: DAY,
      rules: [{ weekday: otherDay, startMinute: 540, endMinute: 1020 }],
      serviceDurationMinutes: 60,
      stepMinutes: 60,
      busy: [],
      now: PAST,
    });
    expect(slots).toHaveLength(0);
  });
});

describe('assertBookable', () => {
  const ok: Interval = { start: atUTCMinute(DAY, 540), end: atUTCMinute(DAY, 600) };

  it('passes for a valid in-hours future slot', () => {
    expect(() => assertBookable(ok, [HOURS], PAST)).not.toThrow();
  });

  it('rejects an empty or inverted interval', () => {
    const bad: Interval = { start: ok.start, end: ok.start };
    expect(() => assertBookable(bad, [HOURS], PAST)).toThrow(ValidationError);
  });

  it('rejects booking in the past', () => {
    expect(() => assertBookable(ok, [HOURS], addMinutes(ok.start, 1))).toThrow(/past/);
  });

  it('rejects intervals crossing UTC midnight', () => {
    const start = atUTCMinute(DAY, 1410); // 23:30
    const crossing: Interval = { start, end: addMinutes(start, 60) };
    expect(() => assertBookable(crossing, [HOURS], PAST)).toThrow(/midnight/);
  });

  it('rejects times outside business hours', () => {
    const start = atUTCMinute(DAY, 480); // 08:00, before 09:00
    const early: Interval = { start, end: addMinutes(start, 30) };
    expect(() => assertBookable(early, [HOURS], PAST)).toThrow(/business hours/);
  });
});
