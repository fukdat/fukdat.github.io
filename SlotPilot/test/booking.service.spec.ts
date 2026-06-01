import { BookingService } from '../src/application/booking.service';
import { Clock } from '../src/application/ports';
import { BookingStatus, Resource, Service } from '../src/domain/booking';
import { BookingConflictError, NotFoundError, ValidationError } from '../src/domain/errors';
import { Weekday } from '../src/domain/scheduling';
import {
  InMemoryBookingRepository,
  InMemoryResourceRepository,
  InMemoryServiceRepository,
} from '../src/infrastructure/in-memory.repo';

class FixedClock implements Clock {
  constructor(private readonly value: Date) {}
  now(): Date {
    return this.value;
  }
}

const DAY_ISO = '2026-06-01';
const WEEKDAY = new Date(`${DAY_ISO}T12:00:00Z`).getUTCDay() as Weekday;

const resource: Resource = {
  id: 'r1',
  organizationId: 'o1',
  name: 'Alex',
  availabilityRules: [{ weekday: WEEKDAY, startMinute: 540, endMinute: 1020 }],
};
const service: Service = {
  id: 's1',
  organizationId: 'o1',
  name: 'Haircut',
  durationMinutes: 30,
};

function makeService(): BookingService {
  let counter = 0;
  return new BookingService(
    new FixedClock(new Date('2026-01-01T00:00:00Z')),
    new InMemoryResourceRepository([resource]),
    new InMemoryServiceRepository([service]),
    new InMemoryBookingRepository(),
    () => `bk_${++counter}`,
  );
}

describe('BookingService', () => {
  it('lists availability for the day', async () => {
    const slots = await makeService().getAvailability('r1', 's1', DAY_ISO);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]!.start.toISOString()).toBe('2026-06-01T09:00:00.000Z');
  });

  it('creates a confirmed booking', async () => {
    const booking = await makeService().createBooking({
      resourceId: 'r1',
      serviceId: 's1',
      startsAt: '2026-06-01T09:00:00Z',
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
    });
    expect(booking.status).toBe(BookingStatus.CONFIRMED);
    expect(booking.end.toISOString()).toBe('2026-06-01T09:30:00.000Z');
  });

  it('prevents double-booking the same slot', async () => {
    const svc = makeService();
    const input = {
      resourceId: 'r1',
      serviceId: 's1',
      startsAt: '2026-06-01T09:00:00Z',
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
    };
    await svc.createBooking(input);
    await expect(svc.createBooking({ ...input, customerName: 'Bob' })).rejects.toBeInstanceOf(
      BookingConflictError,
    );
  });

  it('allows an adjacent, non-overlapping slot', async () => {
    const svc = makeService();
    const base = {
      resourceId: 'r1',
      serviceId: 's1',
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
    };
    await svc.createBooking({ ...base, startsAt: '2026-06-01T09:00:00Z' });
    await expect(
      svc.createBooking({ ...base, startsAt: '2026-06-01T09:30:00Z' }),
    ).resolves.toBeDefined();
  });

  it('removes a booked slot from availability', async () => {
    const svc = makeService();
    const before = await svc.getAvailability('r1', 's1', DAY_ISO);
    await svc.createBooking({
      resourceId: 'r1',
      serviceId: 's1',
      startsAt: '2026-06-01T09:00:00Z',
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
    });
    const after = await svc.getAvailability('r1', 's1', DAY_ISO);
    expect(after).toHaveLength(before.length - 1);
  });

  it('frees the slot after cancellation', async () => {
    const svc = makeService();
    const booking = await svc.createBooking({
      resourceId: 'r1',
      serviceId: 's1',
      startsAt: '2026-06-01T09:00:00Z',
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
    });
    await svc.cancelBooking(booking.id);
    await expect(
      svc.createBooking({
        resourceId: 'r1',
        serviceId: 's1',
        startsAt: '2026-06-01T09:00:00Z',
        customerName: 'Bob',
        customerEmail: 'bob@example.com',
      }),
    ).resolves.toBeDefined();
  });

  it('rejects booking in the past', async () => {
    await expect(
      makeService().createBooking({
        resourceId: 'r1',
        serviceId: 's1',
        startsAt: '2025-06-02T09:00:00Z',
        customerName: 'Jane',
        customerEmail: 'jane@example.com',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws NotFound for an unknown resource', async () => {
    await expect(makeService().getAvailability('nope', 's1', DAY_ISO)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
