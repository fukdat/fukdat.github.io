import { Booking, BookingStatus, Resource, Service } from '../domain/booking';
import { BookingConflictError } from '../domain/errors';
import { overlaps } from '../domain/time';
import {
  BookingRepository,
  Clock,
  ResourceRepository,
  ServiceRepository,
} from '../application/ports';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class InMemoryResourceRepository implements ResourceRepository {
  private readonly byId = new Map<string, Resource>();

  constructor(initial: readonly Resource[] = []) {
    for (const r of initial) this.byId.set(r.id, r);
  }

  async findById(id: string): Promise<Resource | null> {
    return this.byId.get(id) ?? null;
  }
}

export class InMemoryServiceRepository implements ServiceRepository {
  private readonly byId = new Map<string, Service>();

  constructor(initial: readonly Service[] = []) {
    for (const s of initial) this.byId.set(s.id, s);
  }

  async findById(id: string): Promise<Service | null> {
    return this.byId.get(id) ?? null;
  }
}

export class InMemoryBookingRepository implements BookingRepository {
  private readonly byId = new Map<string, Booking>();

  async findActiveInRange(resourceId: string, from: Date, to: Date): Promise<Booking[]> {
    const range = { start: from, end: to };
    return [...this.byId.values()].filter(
      (b) =>
        b.resourceId === resourceId &&
        b.status === BookingStatus.CONFIRMED &&
        overlaps({ start: b.start, end: b.end }, range),
    );
  }

  async create(booking: Booking): Promise<Booking> {
    // Synchronous check-and-set: atomic on the single-threaded event loop,
    // standing in for a DB exclusion constraint.
    const slot = { start: booking.start, end: booking.end };
    for (const existing of this.byId.values()) {
      if (
        existing.resourceId === booking.resourceId &&
        existing.status === BookingStatus.CONFIRMED &&
        overlaps({ start: existing.start, end: existing.end }, slot)
      ) {
        throw new BookingConflictError('requested slot is no longer available');
      }
    }
    this.byId.set(booking.id, booking);
    return booking;
  }

  async findById(id: string): Promise<Booking | null> {
    return this.byId.get(id) ?? null;
  }

  async cancel(id: string): Promise<Booking | null> {
    const booking = this.byId.get(id);
    if (booking === undefined) return null;
    booking.status = BookingStatus.CANCELED;
    return booking;
  }
}
