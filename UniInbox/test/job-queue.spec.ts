import { InMemoryJobQueue } from '../src/infrastructure/job-queue';
import { TestClock, seqId } from './helpers';

const policy = { maxAttempts: 3, baseDelayMs: 1000 };

describe('InMemoryJobQueue', () => {
  it('processes a successful job exactly once', async () => {
    const clock = new TestClock(0);
    let calls = 0;
    const queue = new InMemoryJobQueue<number>(
      async () => {
        calls += 1;
      },
      policy,
      clock,
      seqId('job'),
    );
    await queue.enqueue(1);
    const stats = await queue.runDueJobs();
    expect(stats.processed).toBe(1);
    expect(queue.pending).toBe(0);
    expect(calls).toBe(1);
  });

  it('retries with exponential backoff, then succeeds', async () => {
    const clock = new TestClock(0);
    let calls = 0;
    const queue = new InMemoryJobQueue<number>(
      async () => {
        calls += 1;
        if (calls === 1) throw new Error('transient');
      },
      policy,
      clock,
      seqId('job'),
    );
    await queue.enqueue(1);

    expect((await queue.runDueJobs()).retried).toBe(1);
    expect(queue.pending).toBe(1);

    // Job is not yet due (backoff not elapsed).
    expect((await queue.runDueJobs()).processed).toBe(0);

    clock.advance(1000);
    expect((await queue.runDueJobs()).processed).toBe(1);
    expect(queue.pending).toBe(0);
    expect(calls).toBe(2);
  });

  it('dead-letters a job after exhausting attempts', async () => {
    const clock = new TestClock(0);
    const queue = new InMemoryJobQueue<number>(
      async () => {
        throw new Error('permanent');
      },
      { maxAttempts: 2, baseDelayMs: 1000 },
      clock,
      seqId('job'),
    );
    await queue.enqueue(7);

    await queue.runDueJobs(); // attempt 1 -> retry
    clock.advance(1000);
    const stats = await queue.runDueJobs(); // attempt 2 -> dead-letter

    expect(stats.deadLettered).toBe(1);
    expect(queue.pending).toBe(0);
    expect(queue.deadLetterCount).toBe(1);
    expect(queue.deadLetters()).toEqual([7]);
  });
});
