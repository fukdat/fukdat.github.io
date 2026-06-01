import { ContactRepository, CrmClient } from './ports';

/** Payload for an async CRM contact-sync job. */
export interface CrmSyncJob {
  readonly contactId: string;
}

export type JobHandler<T> = (payload: T) => Promise<void>;

/**
 * Build the CRM-sync job handler. Throwing propagates to the queue, which
 * retries with backoff; a missing contact is treated as a no-op (no retry).
 */
export function makeCrmSyncHandler(
  contacts: ContactRepository,
  crm: CrmClient,
): JobHandler<CrmSyncJob> {
  return async (job: CrmSyncJob): Promise<void> => {
    const contact = await contacts.findById(job.contactId);
    if (contact === null) return;
    await crm.upsertContact(contact);
  };
}
