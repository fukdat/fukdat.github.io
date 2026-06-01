import { randomUUID } from 'crypto';

import { makeCrmSyncHandler } from './application/crm-sync';
import { InboxService } from './application/inbox.service';
import { ChannelAdapter } from './application/ports';
import { Channel } from './domain/types';
import { EmailAdapter } from './infrastructure/channels/email.adapter';
import { TelegramAdapter } from './infrastructure/channels/telegram.adapter';
import { WebchatAdapter } from './infrastructure/channels/webchat.adapter';
import { FakeChannelTransport, FakeCrmClient } from './infrastructure/fakes';
import {
  InMemoryContactRepository,
  InMemoryConversationRepository,
  InMemoryMessageRepository,
  SystemClock,
} from './infrastructure/in-memory.repos';
import { InMemoryJobQueue } from './infrastructure/job-queue';

export interface App {
  readonly service: InboxService;
  /** Drain the CRM-sync queue once (called on a timer at runtime). */
  readonly drainQueue: () => Promise<void>;
}

/**
 * Wire the object graph. In production the in-memory repositories, transport
 * and CRM client are replaced by Postgres, real provider SDKs and a BullMQ
 * worker — all behind the same ports.
 */
export function createApp(): App {
  const clock = new SystemClock();
  const ids = (): string => randomUUID();

  const contacts = new InMemoryContactRepository(ids, clock);
  const conversations = new InMemoryConversationRepository();
  const messages = new InMemoryMessageRepository();

  const transport = new FakeChannelTransport();
  const adapters = new Map<Channel, ChannelAdapter>([
    [Channel.TELEGRAM, new TelegramAdapter(transport)],
    [Channel.EMAIL, new EmailAdapter(transport)],
    [Channel.WEBCHAT, new WebchatAdapter(transport)],
  ]);

  const crm = new FakeCrmClient();
  const queue = new InMemoryJobQueue(
    makeCrmSyncHandler(contacts, crm),
    { maxAttempts: 5, baseDelayMs: 1000 },
    clock,
  );

  const service = new InboxService(clock, ids, contacts, conversations, messages, adapters, queue);

  return {
    service,
    drainQueue: async () => {
      await queue.runDueJobs();
    },
  };
}
