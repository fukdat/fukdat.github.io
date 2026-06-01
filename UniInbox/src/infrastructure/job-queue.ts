import { randomUUID } from 'crypto';

import { Clock, JobQueue } from '../application/ports';
import { JobHandler } from '../application/crm-sync';

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
}

export interface QueueStats {
  readonly processed: number;
  readonly retried: number;
  readonly deadLettered: number;
}

interface Entry<T> {
  readonly id: string;
  readonly payload: T;
  attempts: number;
  availableAt: number;
}

/**
 * A deterministic, retry-aware in-process queue. Failed jobs are retried with
 * exponential backoff up to `maxAttempts`, after which they are moved to a
 * dead-letter list. Time is injected so processing is fully testable; in
 * production this is replaced by a BullMQ + Redis adapter implementing the
 * same `JobQueue<T>` port.
 */
export class InMemoryJobQueue<T> implements JobQueue<T> {
  private readonly entries: Entry<T>[] = [];
  private readonly dead: Entry<T>[] = [];

  constructor(
    private readonly handler: JobHandler<T>,
    private readonly policy: RetryPolicy,
    private readonly clock: Clock,
    private readonly newId: () => string = randomUUID,
  ) {}

  async enqueue(payload: T): Promise<void> {
    this.entries.push({
      id: this.newId(),
      payload,
      attempts: 0,
      availableAt: this.clock.now().getTime(),
    });
  }

  get pending(): number {
    return this.entries.length;
  }

  get deadLetterCount(): number {
    return this.dead.length;
  }

  deadLetters(): readonly T[] {
    return this.dead.map((e) => e.payload);
  }

  /** Process every job whose backoff has elapsed. Returns a stats summary. */
  async runDueJobs(): Promise<QueueStats> {
    const now = this.clock.now().getTime();
    const due = this.entries.filter((e) => e.availableAt <= now);
    let processed = 0;
    let retried = 0;
    let deadLettered = 0;

    for (const entry of due) {
      try {
        await this.handler(entry.payload);
        this.remove(entry);
        processed += 1;
      } catch {
        entry.attempts += 1;
        if (entry.attempts >= this.policy.maxAttempts) {
          this.remove(entry);
          this.dead.push(entry);
          deadLettered += 1;
        } else {
          entry.availableAt = now + this.policy.baseDelayMs * 2 ** (entry.attempts - 1);
          retried += 1;
        }
      }
    }

    return { processed, retried, deadLettered };
  }

  private remove(entry: Entry<T>): void {
    const index = this.entries.indexOf(entry);
    if (index >= 0) this.entries.splice(index, 1);
  }
}
