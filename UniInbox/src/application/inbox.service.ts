import { NotFoundError, ValidationError } from '../domain/errors';
import {
  Channel,
  Conversation,
  ConversationStatus,
  Direction,
  Message,
} from '../domain/types';
import { CrmSyncJob } from './crm-sync';
import {
  ChannelAdapter,
  Clock,
  ContactRepository,
  ConversationRepository,
  JobQueue,
  MessageRepository,
} from './ports';

export interface IngestResult {
  readonly conversation: Conversation;
  readonly message: Message;
  /** True when the provider message was already ingested (idempotent replay). */
  readonly deduped: boolean;
}

/** Orchestrates inbound ingestion, threading, replies and CRM sync. */
export class InboxService {
  constructor(
    private readonly clock: Clock,
    private readonly newId: () => string,
    private readonly contacts: ContactRepository,
    private readonly conversations: ConversationRepository,
    private readonly messages: MessageRepository,
    private readonly adapters: ReadonlyMap<Channel, ChannelAdapter>,
    private readonly crmQueue: JobQueue<CrmSyncJob>,
  ) {}

  private adapterFor(channel: Channel): ChannelAdapter {
    const adapter = this.adapters.get(channel);
    if (adapter === undefined) {
      throw new ValidationError(`no adapter registered for channel '${channel}'`);
    }
    return adapter;
  }

  async ingest(
    organizationId: string,
    channel: Channel,
    rawPayload: unknown,
  ): Promise<IngestResult> {
    const event = this.adapterFor(channel).parseInbound(rawPayload);

    // Idempotency: a repeated provider message id never creates a duplicate.
    const duplicate = await this.messages.findByProviderId(event.providerMessageId);
    if (duplicate !== null) {
      const conversation = await this.conversations.findById(duplicate.conversationId);
      if (conversation === null) throw new NotFoundError('conversation not found');
      return { conversation, message: duplicate, deduped: true };
    }

    const { contact } = await this.contacts.upsert({
      organizationId,
      channel,
      externalId: event.externalContactId,
      displayName: event.contactDisplayName,
      email: event.contactEmail,
    });

    let conversation = await this.conversations.findOpenByContact(contact.id);
    if (conversation === null) {
      conversation = await this.conversations.create({
        id: this.newId(),
        organizationId,
        contactId: contact.id,
        channel,
        status: ConversationStatus.OPEN,
        lastMessageAt: event.sentAt,
      });
    }

    const message = await this.messages.create({
      id: this.newId(),
      conversationId: conversation.id,
      organizationId,
      direction: Direction.INBOUND,
      channel,
      providerMessageId: event.providerMessageId,
      body: event.body,
      authorName: event.contactDisplayName,
      sentAt: event.sentAt,
    });

    conversation.status = ConversationStatus.OPEN;
    conversation.lastMessageAt = event.sentAt;
    await this.conversations.save(conversation);

    await this.crmQueue.enqueue({ contactId: contact.id });

    return { conversation, message, deduped: false };
  }

  async reply(conversationId: string, body: string, authorName: string): Promise<Message> {
    if (body.trim().length === 0) {
      throw new ValidationError('reply body must not be empty');
    }
    const conversation = await this.conversations.findById(conversationId);
    if (conversation === null) throw new NotFoundError('conversation not found');
    const contact = await this.contacts.findById(conversation.contactId);
    if (contact === null) throw new NotFoundError('contact not found');

    const { providerMessageId } = await this.adapterFor(conversation.channel).send(
      contact.externalId,
      body,
    );

    const message = await this.messages.create({
      id: this.newId(),
      conversationId,
      organizationId: conversation.organizationId,
      direction: Direction.OUTBOUND,
      channel: conversation.channel,
      providerMessageId,
      body,
      authorName,
      sentAt: this.clock.now(),
    });

    conversation.lastMessageAt = message.sentAt;
    await this.conversations.save(conversation);
    return message;
  }

  listConversations(organizationId: string): Promise<Conversation[]> {
    return this.conversations.list(organizationId);
  }

  listMessages(conversationId: string): Promise<Message[]> {
    return this.messages.listByConversation(conversationId);
  }
}
