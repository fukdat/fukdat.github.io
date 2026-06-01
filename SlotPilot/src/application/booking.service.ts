import { randomUUID } from 'crypto';

import { Booking, BookingStatus } from '../domain/booking';
import { NotFoundError, ValidationError } from '../domain/errors';
import { assertBookable, generateSlots } from '../domain/scheduling';
import { Interval, addMinutes, atUTCMinute } from '../domain/time';
import { BookingRepository, Clock, ResourceRepository, ServiceRepository } from './ports';

export interface CreateBookingInput {
  readonly resourceId: string;
  readonly serviceId: string;
  /** ISO-8601 instant, e.g. "2026-06-01T09:00:00Z". */
  readonly startsAt: string;
  readonly customerName: string;
  readonly customerEmail: string;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Orchestrates availability queries and the booking lifecycle. */
export class BookingService {
  constructor(
    private readonly clock: Clock,
    private readonly resources: ResourceRepository,
    private readonly services: ServiceRepository,
    private readonly bookings: BookingRepository,
    private readonly newId: () => string = randomUUID,
  ) {}

  /** Free slots for a resource/service on a given UTC day ("YYYY-MM-DD"). */
  async getAvailability(
    resourceId: string,
    serviceId: string,
    dayIso: string,
  ): Promise<Interval[]> {
    if (!DAY_RE.test(dayIso)) {
      throw new ValidationError('day must be formatted as YYYY-MM-DD');
    }
    const day = new Date(`${dayIso}T00:00:00.000Z`);
    if (Number.isNaN(day.getTime())) {
      throw new ValidationError('day is not a valid date');
    }

    const resource = await this.resources.findById(resourceId);
    if (resource === null) throw new NotFoundError('resource not found');
    const service = await this.services.findById(serviceId);
    if (service === null) throw new NotFoundError('service not found');

    const dayStart = atUTCMinute(day, 0);
    const dayEnd = atUTCMinute(day, 24 * 60);
    const busy = await this.bookings.findActiveInRange(resourceId, dayStart, dayEnd);

    return generateSlots({
      day,
      rules: resource.availabilityRules,
      serviceDurationMinutes: service.durationMinutes,
      stepMinutes: service.durationMinutes,
      busy: busy.map((b) => ({ start: b.start, end: b.end })),
      now: this.clock.now(),
    });
  }

  async createBooking(input: CreateBookingInput): Promise<Booking> {
    const resource = await this.resources.findById(input.resourceId);
    if (resource === null) throw new NotFoundError('resource not found');
    const service = await this.services.findById(input.serviceId);
    if (service === null) throw new NotFoundError('service not found');
    if (service.organizationId !== resource.organizationId) {
      throw new ValidationError('service and resource belong to different organizations');
    }

    const start = new Date(input.startsAt);
    if (Number.isNaN(start.getTime())) {
      throw new ValidationError('startsAt is not a valid ISO-8601 instant');
    }
    const interval: Interval = { start, end: addMinutes(start, service.durationMinutes) };
    assertBookable(interval, resource.availabilityRules, this.clock.now());

    const booking: Booking = {
      id: this.newId(),
      organizationId: resource.organizationId,
      resourceId: resource.id,
      serviceId: service.id,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      start: interval.start,
      end: interval.end,
      status: BookingStatus.CONFIRMED,
    };
    // Repository enforces the no-overlap invariant atomically.
    return this.bookings.create(booking);
  }

  async getBooking(id: string): Promise<Booking> {
    const booking = await this.bookings.findById(id);
    if (booking === null) throw new NotFoundError('booking not found');
    return booking;
  }

  async cancelBooking(id: string): Promise<Booking> {
    const booking = await this.bookings.cancel(id);
    if (booking === null) throw new NotFoundError('booking not found');
    return booking;
  }
}
