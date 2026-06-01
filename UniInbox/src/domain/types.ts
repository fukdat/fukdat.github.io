export enum Channel {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  WEBCHAT = 'webchat',
}

export enum Direction {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum ConversationStatus {
  OPEN = 'open',
  PENDING = 'pending',
  CLOSED = 'closed',
}

/** A provider-agnostic inbound message, produced by a channel adapter. */
export interface InboundEvent {
  readonly channel: Channel;
  readonly externalContactId: string;
  readonly contactDisplayName: string;
  readonly contactEmail?: string;
  /** Globally unique provider message id, used for idempotent dedup. */
  readonly providerMessageId: string;
  readonly body: string;
  readonly sentAt: Date;
}

export interface Contact {
  readonly id: string;
  readonly organizationId: string;
  readonly channel: Channel;
  readonly externalId: string;
  displayName: string;
  email?: string;
  readonly createdAt: Date;
}

export interface Conversation {
  readonly id: string;
  readonly organizationId: string;
  readonly contactId: string;
  readonly channel: Channel;
  status: ConversationStatus;
  lastMessageAt: Date;
}

export interface Message {
  readonly id: string;
  readonly conversationId: string;
  readonly organizationId: string;
  readonly direction: Direction;
  readonly channel: Channel;
  readonly providerMessageId?: string;
  readonly body: string;
  readonly authorName: string;
  readonly sentAt: Date;
}
