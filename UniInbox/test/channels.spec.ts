import { ValidationError } from '../src/domain/errors';
import { Channel } from '../src/domain/types';
import { EmailAdapter } from '../src/infrastructure/channels/email.adapter';
import { TelegramAdapter } from '../src/infrastructure/channels/telegram.adapter';
import { WebchatAdapter } from '../src/infrastructure/channels/webchat.adapter';
import { FakeChannelTransport } from '../src/infrastructure/fakes';

const transport = new FakeChannelTransport();

describe('TelegramAdapter', () => {
  const adapter = new TelegramAdapter(transport);

  it('normalizes a telegram update', () => {
    const event = adapter.parseInbound({
      message: {
        message_id: 10,
        date: 1_700_000_000,
        text: 'hi there',
        from: { id: 42, first_name: 'Jane', last_name: 'Doe' },
      },
    });
    expect(event.channel).toBe(Channel.TELEGRAM);
    expect(event.externalContactId).toBe('42');
    expect(event.contactDisplayName).toBe('Jane Doe');
    expect(event.providerMessageId).toBe('tg:10');
    expect(event.body).toBe('hi there');
    expect(event.sentAt.toISOString()).toBe('2023-11-14T22:13:20.000Z');
  });

  it('rejects a malformed payload', () => {
    expect(() => adapter.parseInbound({ message: { from: {} } })).toThrow(ValidationError);
  });
});

describe('EmailAdapter', () => {
  const adapter = new EmailAdapter(transport);

  it('normalizes an inbound email', () => {
    const event = adapter.parseInbound({
      messageId: 'm1',
      date: '2026-01-02T10:00:00Z',
      text: 'hello',
      from: { email: 'al@example.com', name: 'Al' },
    });
    expect(event.externalContactId).toBe('al@example.com');
    expect(event.contactEmail).toBe('al@example.com');
    expect(event.contactDisplayName).toBe('Al');
    expect(event.providerMessageId).toBe('email:m1');
  });

  it('rejects an invalid email address', () => {
    expect(() =>
      adapter.parseInbound({ messageId: 'm1', date: '2026-01-02T10:00:00Z', text: 'x', from: { email: 'not-an-email' } }),
    ).toThrow(ValidationError);
  });
});

describe('WebchatAdapter', () => {
  const adapter = new WebchatAdapter(transport);

  it('normalizes a webchat event and synthesizes a visitor name', () => {
    const event = adapter.parseInbound({
      eventId: 'e1',
      sessionId: 'sess_abcdef',
      text: 'yo',
      sentAt: '2026-01-02T10:00:00Z',
    });
    expect(event.externalContactId).toBe('sess_abcdef');
    expect(event.providerMessageId).toBe('web:e1');
    expect(event.contactDisplayName).toBe('Visitor sess_a');
  });
});
