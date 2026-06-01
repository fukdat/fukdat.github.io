import Fastify, { FastifyInstance } from 'fastify';

import { InboxService } from '../application/inbox.service';
import { DomainError, NotFoundError, ValidationError } from '../domain/errors';
import { Channel } from '../domain/types';

interface WebhookParams {
  org: string;
  channel: string;
}

interface ReplyBody {
  body?: unknown;
  authorName?: unknown;
}

function toChannel(value: string): Channel {
  const channels = Object.values(Channel) as string[];
  if (!channels.includes(value)) {
    throw new ValidationError(`unknown channel '${value}'`);
  }
  return value as Channel;
}

function statusFor(error: DomainError): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ValidationError) return 400;
  return 500;
}

/** Build the HTTP server wired to a given InboxService. */
export function buildServer(service: InboxService): FastifyInstance {
  const app = Fastify({ logger: false });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomainError) {
      void reply.status(statusFor(error)).send({ error: { code: error.code, message: error.message } });
      return;
    }
    void reply.status(500).send({ error: { code: 'internal_error', message: 'unexpected error' } });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.post<{ Params: WebhookParams; Body: unknown }>(
    '/webhooks/:org/:channel',
    async (request, reply) => {
      const channel = toChannel(request.params.channel);
      const result = await service.ingest(request.params.org, channel, request.body);
      return reply.status(200).send({
        conversationId: result.conversation.id,
        messageId: result.message.id,
        deduped: result.deduped,
      });
    },
  );

  app.get<{ Params: { org: string } }>(
    '/organizations/:org/conversations',
    async (request) => {
      const conversations = await service.listConversations(request.params.org);
      return conversations.map((c) => ({
        id: c.id,
        contactId: c.contactId,
        channel: c.channel,
        status: c.status,
        lastMessageAt: c.lastMessageAt.toISOString(),
      }));
    },
  );

  app.get<{ Params: { id: string } }>(
    '/conversations/:id/messages',
    async (request) => {
      const messages = await service.listMessages(request.params.id);
      return messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        body: m.body,
        authorName: m.authorName,
        sentAt: m.sentAt.toISOString(),
      }));
    },
  );

  app.post<{ Params: { id: string }; Body: ReplyBody }>(
    '/conversations/:id/reply',
    async (request, reply) => {
      const { body, authorName } = request.body ?? {};
      if (typeof body !== 'string' || typeof authorName !== 'string') {
        throw new ValidationError('body and authorName are required strings');
      }
      const message = await service.reply(request.params.id, body, authorName);
      return reply.status(201).send({
        id: message.id,
        direction: message.direction,
        body: message.body,
        sentAt: message.sentAt.toISOString(),
      });
    },
  );

  return app;
}
