import { makeCrmSyncHandler } from '../src/application/crm-sync';
import { InboxService } from '../src/application/inbox.service';
import { Channel, Direction } from '../src/domain/types';
import { TelegramAdapter } from '../src/infrastructure/channels/telegram.adapter';
import { EmailAdapter } from '../src/infrastructure/channels/email.adapter';
import { FakeChannelTransport, FakeCrmClient } from '../src/infrastructure/fakes';
import {
  InMemoryContactRepository,
  InMemoryConversationRepository,
  InMemoryMessageRepository,
} from '../src/infrastructure/in-memory.repos';
import { InMemoryJobQueue } from '../src/infrastructure/job-queue';
import { TestClock, seqId } from './helpers';

const ORG = 'org_1';

function build(opts: { crmFails?: number } = {}) {
  const clock = new TestClock(Date.parse('2026-01-01T00:00:00Z'));
  const ids = seqId('e');
  const contacts = new InMemoryContactRepository(ids, clock);
  const conversations = new InMemoryConversationRepository();
  const messages = new InMemoryMessageRepository();
  const transport = new FakeChannelTransport();
  const adapters = new Map<Channel, TelegramAdapter | EmailAdapter>([
    [Channel.TELEGRAM, new TelegramAdapter(transport)],
    [Channel.EMAIL, new EmailAdapter(transport)],
  ]);
  const crm = new FakeCrmClient(opts.crmFails ?? 0);
  const queue = new InMemoryJobQueue(
    makeCrmSyncHandler(contacts, crm),
    { maxAttempts: 3, baseDelayMs: 1000 },
    clock,
    seqId('job'),
  );
  const service = new InboxService(clock, ids, contacts, conversations, messages, adapters, queue);
  return { service, queue, crm, transport, messages, clock };
}

function tg(messageId: number, fromId: number, text = 'hello'): unknown {
  return {
    message: {
      message_id: messageId,
      date: 1_700_000_000,
      text,
      from: { id: fromId, first_name: 'Jane' },
    },
  };
}

describe('InboxService ingestion', () => {
  it('creates a conversation, message and enqueues CRM sync', async () => {
    const { service, queue } = build();
    const result = await service.ingest(ORG, Channel.TELEGRAM, tg(1, 42));
    expect(result.deduped).toBe(false);
    expect(result.message.direction).toBe(Direction.INBOUND);
    expect(queue.pending).toBe(1);
  });

  it('is idempotent on a repeated provider message id', async () => {
    const { service, queue, messages } = build();
    await service.ingest(ORG, Channel.TELEGRAM, tg(1, 42));
    const second = await service.ingest(ORG, Channel.TELEGRAM, tg(1, 42));
    expect(second.deduped).toBe(true);
    const conv = second.conversation.id;
    expect(await messages.listByConversation(conv)).toHaveLength(1);
    expect(queue.pending).toBe(1); // no second enqueue
  });

  it('threads multiple messages from the same contact into one conversation', async () => {
    const { service } = build();
    const a = await service.ingest(ORG, Channel.TELEGRAM, tg(1, 42));
    const b = await service.ingest(ORG, Channel.TELEGRAM, tg(2, 42, 'again'));
    expect(b.conversation.id).toBe(a.conversation.id);
  });

  it('separates different contacts into different conversations', async () => {
    const { service } = build();
    const a = await service.ingest(ORG, Channel.TELEGRAM, tg(1, 42));
    const b = await service.ingest(ORG, Channel.TELEGRAM, tg(2, 99));
    expect(b.conversation.id).not.toBe(a.conversation.id);
  });

  it('sends a reply through the channel transport', async () => {
    const { service, transport, messages } = build();
    const { conversation } = await service.ingest(ORG, Channel.TELEGRAM, tg(1, 42));
    const reply = await service.reply(conversation.id, 'thanks!', 'Agent Smith');
    expect(reply.direction).toBe(Direction.OUTBOUND);
    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0]!.to).toBe('42');
    expect(await messages.listByConversation(conversation.id)).toHaveLength(2);
  });
});

describe('CRM sync via the queue', () => {
  it('eventually succeeds after transient failures, idempotently', async () => {
    const { service, queue, crm, clock } = build({ crmFails: 2 });
    await service.ingest(ORG, Channel.TELEGRAM, tg(1, 42));

    expect((await queue.runDueJobs()).retried).toBe(1); // fail 1
    clock.advance(1000);
    expect((await queue.runDueJobs()).retried).toBe(1); // fail 2
    clock.advance(2000);
    expect((await queue.runDueJobs()).processed).toBe(1); // success

    expect(crm.upsertCalls).toBe(3);
    expect(crm.distinctContacts).toBe(1);
    expect(queue.pending).toBe(0);
  });

  it('upserts the same contact only once across multiple messages', async () => {
    const { service, queue, crm } = build();
    await service.ingest(ORG, Channel.TELEGRAM, tg(1, 42));
    await service.ingest(ORG, Channel.TELEGRAM, tg(2, 42, 'again'));
    expect(queue.pending).toBe(2);

    await queue.runDueJobs();

    expect(crm.upsertCalls).toBe(2);
    expect(crm.distinctContacts).toBe(1); // idempotent CRM upsert
  });

  it('dead-letters a job that never succeeds', async () => {
    const { service, queue, crm, clock } = build({ crmFails: 99 });
    await service.ingest(ORG, Channel.TELEGRAM, tg(1, 42));

    await queue.runDueJobs(); // attempt 1
    clock.advance(1000);
    await queue.runDueJobs(); // attempt 2
    clock.advance(2000);
    const stats = await queue.runDueJobs(); // attempt 3 -> dead-letter

    expect(stats.deadLettered).toBe(1);
    expect(queue.deadLetterCount).toBe(1);
    expect(crm.upsertCalls).toBe(3);
    expect(crm.distinctContacts).toBe(0);
  });
});
