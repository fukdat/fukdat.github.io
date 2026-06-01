import { Channel, Contact } from '../domain/types';
import { ChannelTransport, CrmClient } from '../application/ports';

/** Records outbound sends and returns synthetic provider ids. */
export class FakeChannelTransport implements ChannelTransport {
  public readonly sent: Array<{ channel: Channel; to: string; body: string }> = [];
  private counter = 0;

  async send(channel: Channel, to: string, body: string): Promise<{ providerMessageId: string }> {
    this.sent.push({ channel, to, body });
    this.counter += 1;
    return { providerMessageId: `out:${channel}:${this.counter}` };
  }
}

/**
 * In-memory CRM. Upsert is idempotent by (org, channel, externalId). Can be
 * configured to fail the first N calls to exercise queue retry/backoff.
 */
export class FakeCrmClient implements CrmClient {
  private readonly byKey = new Map<string, string>();
  public upsertCalls = 0;
  private failsRemaining: number;

  constructor(failTimes = 0) {
    this.failsRemaining = failTimes;
  }

  async upsertContact(contact: Contact): Promise<{ crmId: string }> {
    this.upsertCalls += 1;
    if (this.failsRemaining > 0) {
      this.failsRemaining -= 1;
      throw new Error('CRM upstream temporarily unavailable');
    }
    const key = `${contact.organizationId}:${contact.channel}:${contact.externalId}`;
    const existing = this.byKey.get(key);
    if (existing !== undefined) return { crmId: existing };
    const crmId = `crm_${this.byKey.size + 1}`;
    this.byKey.set(key, crmId);
    return { crmId };
  }

  get distinctContacts(): number {
    return this.byKey.size;
  }
}
