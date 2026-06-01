import { z } from 'zod';

import { ValidationError } from '../../domain/errors';
import { Channel } from '../../domain/types';
import { ChannelTransport } from '../../application/ports';

/** Shared helpers for channel adapters. */
export abstract class BaseChannelAdapter {
  abstract readonly channel: Channel;

  constructor(protected readonly transport: ChannelTransport) {}

  protected parse<T>(schema: z.ZodType<T>, payload: unknown): T {
    const result = schema.safeParse(payload);
    if (!result.success) {
      const issue = result.error.issues[0];
      const detail = issue !== undefined ? `${issue.path.join('.')}: ${issue.message}` : 'bad shape';
      throw new ValidationError(`invalid ${this.channel} payload (${detail})`);
    }
    return result.data;
  }

  protected requireDate(value: string | number): Date {
    const date = typeof value === 'number' ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationError(`invalid ${this.channel} timestamp`);
    }
    return date;
  }

  async send(to: string, body: string): Promise<{ providerMessageId: string }> {
    return this.transport.send(this.channel, to, body);
  }
}
