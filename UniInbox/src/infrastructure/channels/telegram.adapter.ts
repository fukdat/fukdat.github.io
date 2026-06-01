import { z } from 'zod';

import { Channel, InboundEvent } from '../../domain/types';
import { ChannelAdapter } from '../../application/ports';
import { BaseChannelAdapter } from './base';

const TelegramUpdate = z.object({
  message: z.object({
    message_id: z.number(),
    date: z.number(),
    text: z.string(),
    from: z.object({
      id: z.number(),
      first_name: z.string(),
      last_name: z.string().optional(),
      username: z.string().optional(),
    }),
  }),
});

export class TelegramAdapter extends BaseChannelAdapter implements ChannelAdapter {
  readonly channel = Channel.TELEGRAM;

  parseInbound(payload: unknown): InboundEvent {
    const update = this.parse(TelegramUpdate, payload);
    const { from } = update.message;
    const displayName = [from.first_name, from.last_name].filter(Boolean).join(' ');
    return {
      channel: this.channel,
      externalContactId: String(from.id),
      contactDisplayName: displayName,
      providerMessageId: `tg:${update.message.message_id}`,
      body: update.message.text,
      sentAt: this.requireDate(update.message.date * 1000),
    };
  }
}
