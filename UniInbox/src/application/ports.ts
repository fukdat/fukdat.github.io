import { Channel, Contact, Conversation, InboundEvent, Message } from '../domain/types';

export interface Clock {
  now(): Date;
}

export interface ContactUpsertInput {
  readonly organizationId: string;
  readonly channel: Channel;
  readonly externalId: string;
  readonly displayName: string;
  readonly email?: string;
}

export interface ContactRepository {
  /** Find-or-create by (organizationId, channel, externalId). */
  upsert(input: ContactUpsertInput): Promise<{ contact: Contact; created: boolean }>;
  findById(id: string): Promise<Contact | null>;
}

export interface ConversationRepository {
  findOpenByContact(contactId: string): Promise<Conversation | null>;
  create(conversation: Conversation): Promise<Conversation>;
  save(conversation: Conversation): Promise<Conversation>;
  findById(id: string): Promise<Conversation | null>;
  list(organizationId: string): Promise<Conversation[]>;
}

export interface MessageRepository {
  findByProviderId(providerMessageId: string): Promise<Message | null>;
  create(message: Message): Promise<Message>;
  listByConversation(conversationId: string): Promise<Message[]>;
}

/** Upstream CRM. Implementations must treat upsert as idempotent. */
export interface CrmClient {
  upsertContact(contact: Contact): Promise<{ crmId: string }>;
}

/** Transport used by channel adapters to send outbound messages. */
export interface ChannelTransport {
  send(channel: Channel, to: string, body: string): Promise<{ providerMessageId: string }>;
}

export interface ChannelAdapter {
  readonly channel: Channel;
  /** Normalize a raw provider webhook payload. @throws ValidationError */
  parseInbound(payload: unknown): InboundEvent;
  send(to: string, body: string): Promise<{ providerMessageId: string }>;
}

export interface JobQueue<T> {
  enqueue(payload: T): Promise<void>;
}
