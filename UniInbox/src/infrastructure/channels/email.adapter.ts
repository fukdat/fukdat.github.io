import { z } from 'zod';

import { Channel, InboundEvent } from '../../domain/types';
import { ChannelAdapter } from '../../application/ports';
import { BaseChannelAdapter } from './base';

const EmailInbound = z.object({
  messageId: z.string().min(1),
  date: z.string().min(1),
  text: z.string(),
  from: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
});

export class EmailAdapter extends BaseChannelAdapter implements ChannelAdapter {
  readonly channel = Channel.EMAIL;

  parseInbound(payload: unknown): InboundEvent {
    const email = this.parse(EmailInbound, payload);
    return {
      channel: this.channel,
      externalContactId: email.from.email,
      contactDisplayName: email.from.name ?? email.from.email,
      contactEmail: email.from.email,
      providerMessageId: `email:${email.messageId}`,
      body: email.text,
      sentAt: this.requireDate(email.date),
    };
  }
}
