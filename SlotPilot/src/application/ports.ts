import { Booking, Resource, Service } from '../domain/booking';

/** Abstracts "now" so time-dependent logic is deterministic in tests. */
export interface Clock {
  now(): Date;
}

export interface ResourceRepository {
  findById(id: string): Promise<Resource | null>;
}

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>;
}

export interface BookingRepository {
  /** Active (non-canceled) bookings for a resource overlapping [from, to). */
  findActiveInRange(resourceId: string, from: Date, to: Date): Promise<Booking[]>;
  /**
   * Persist a new booking, atomically rejecting any overlap with an existing
   * active booking for the same resource. This is the double-booking
   * invariant and mirrors a Postgres exclusion constraint in production.
   * @throws BookingConflictError on overlap.
   */
  create(booking: Booking): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  cancel(id: string): Promise<Booking | null>;
}

/** DI tokens for the interface-typed providers. */
export const TOKENS = {
  Clock: Symbol('Clock'),
  ResourceRepository: Symbol('ResourceRepository'),
  ServiceRepository: Symbol('ServiceRepository'),
  BookingRepository: Symbol('BookingRepository'),
} as const;
