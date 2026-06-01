import { Clock } from '../src/application/ports';

/** A controllable clock for deterministic time-based tests. */
export class TestClock implements Clock {
  constructor(private t: number) {}
  now(): Date {
    return new Date(this.t);
  }
  advance(ms: number): void {
    this.t += ms;
  }
}

/** Monotonic id generator for predictable ids in tests. */
export function seqId(prefix = 'id'): () => string {
  let n = 0;
  return () => `${prefix}_${(n += 1)}`;
}
