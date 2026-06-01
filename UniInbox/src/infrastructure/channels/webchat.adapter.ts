import { z } from 'zod';

import { Channel, InboundEvent } from '../../domain/types';
import { ChannelAdapter } from '../../application/ports';
import { BaseChannelAdapter } from './base';

const WebchatInbound = z.object({
  eventId: z.string().min(1),
  sessionId: z.string().min(1),
  visitorName: z.string().optional(),
  text: z.string(),
  sentAt: z.string().min(1),
});

export class WebchatAdapter extends BaseChannelAdapter implements ChannelAdapter {
  readonly channel = Channel.WEBCHAT;

  parseInbound(payload: unknown): InboundEvent {
    const event = this.parse(WebchatInbound, payload);
    return {
      channel: this.channel,
      externalContactId: event.sessionId,
      contactDisplayName: event.visitorName ?? `Visitor ${event.sessionId.slice(0, 6)}`,
      providerMessageId: `web:${event.eventId}`,
      body: event.text,
      sentAt: this.requireDate(event.sentAt),
    };
  }
}
