import { AvailabilityRule } from './scheduling';

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELED = 'canceled',
}

/** A bookable service offered by an organization. */
export interface Service {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly durationMinutes: number;
}

/** A staff member or room that bookings are made against. */
export interface Resource {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly availabilityRules: readonly AvailabilityRule[];
}

export interface Booking {
  readonly id: string;
  readonly organizationId: string;
  readonly resourceId: string;
  readonly serviceId: string;
  readonly customerName: string;
  readonly customerEmail: string;
  readonly start: Date;
  readonly end: Date;
  status: BookingStatus;
}
