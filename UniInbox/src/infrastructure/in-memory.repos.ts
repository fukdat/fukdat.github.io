import {
  Channel,
  Contact,
  Conversation,
  ConversationStatus,
  Message,
} from '../domain/types';
import {
  Clock,
  ContactRepository,
  ContactUpsertInput,
  ConversationRepository,
  MessageRepository,
} from '../application/ports';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

function contactKey(org: string, channel: Channel, externalId: string): string {
  return `${org}:${channel}:${externalId}`;
}

export class InMemoryContactRepository implements ContactRepository {
  private readonly byId = new Map<string, Contact>();
  private readonly byKey = new Map<string, string>();

  constructor(
    private readonly newId: () => string,
    private readonly clock: Clock,
  ) {}

  async upsert(input: ContactUpsertInput): Promise<{ contact: Contact; created: boolean }> {
    const key = contactKey(input.organizationId, input.channel, input.externalId);
    const existingId = this.byKey.get(key);
    if (existingId !== undefined) {
      const contact = this.byId.get(existingId)!;
      contact.displayName = input.displayName;
      if (input.email !== undefined) contact.email = input.email;
      return { contact, created: false };
    }
    const contact: Contact = {
      id: this.newId(),
      organizationId: input.organizationId,
      channel: input.channel,
      externalId: input.externalId,
      displayName: input.displayName,
      email: input.email,
      createdAt: this.clock.now(),
    };
    this.byId.set(contact.id, contact);
    this.byKey.set(key, contact.id);
    return { contact, created: true };
  }

  async findById(id: string): Promise<Contact | null> {
    return this.byId.get(id) ?? null;
  }
}

export class InMemoryConversationRepository implements ConversationRepository {
  private readonly byId = new Map<string, Conversation>();

  async findOpenByContact(contactId: string): Promise<Conversation | null> {
    for (const c of this.byId.values()) {
      if (c.contactId === contactId && c.status !== ConversationStatus.CLOSED) return c;
    }
    return null;
  }

  async create(conversation: Conversation): Promise<Conversation> {
    this.byId.set(conversation.id, conversation);
    return conversation;
  }

  async save(conversation: Conversation): Promise<Conversation> {
    this.byId.set(conversation.id, conversation);
    return conversation;
  }

  async findById(id: string): Promise<Conversation | null> {
    return this.byId.get(id) ?? null;
  }

  async list(organizationId: string): Promise<Conversation[]> {
    return [...this.byId.values()]
      .filter((c) => c.organizationId === organizationId)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }
}

export class InMemoryMessageRepository implements MessageRepository {
  private readonly byId = new Map<string, Message>();
  private readonly byProviderId = new Map<string, string>();

  async findByProviderId(providerMessageId: string): Promise<Message | null> {
    const id = this.byProviderId.get(providerMessageId);
    return id !== undefined ? (this.byId.get(id) ?? null) : null;
  }

  async create(message: Message): Promise<Message> {
    this.byId.set(message.id, message);
    if (message.providerMessageId !== undefined) {
      this.byProviderId.set(message.providerMessageId, message.id);
    }
    return message;
  }

  async listByConversation(conversationId: string): Promise<Message[]> {
    return [...this.byId.values()]
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }
}
