/** Base class for expected domain errors, each mapped to an HTTP status. */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A requested entity does not exist. */
export class NotFoundError extends DomainError {
  readonly code = 'not_found';
}

/** Input violates a business rule (bad time, outside hours, past, etc.). */
export class ValidationError extends DomainError {
  readonly code = 'validation_error';
}

/** The requested slot overlaps an existing booking (double-booking). */
export class BookingConflictError extends DomainError {
  readonly code = 'booking_conflict';
}
