import { Module } from '@nestjs/common';

import { BookingService } from '../application/booking.service';
import {
  BookingRepository,
  Clock,
  ResourceRepository,
  ServiceRepository,
  TOKENS,
} from '../application/ports';
import { demoResources, demoServices } from '../infrastructure/demo-seed';
import {
  InMemoryBookingRepository,
  InMemoryResourceRepository,
  InMemoryServiceRepository,
  SystemClock,
} from '../infrastructure/in-memory.repo';
import { BookingController } from './booking.controller';

@Module({
  controllers: [BookingController],
  providers: [
    { provide: TOKENS.Clock, useClass: SystemClock },
    {
      provide: TOKENS.ResourceRepository,
      useFactory: () => new InMemoryResourceRepository(demoResources),
    },
    {
      provide: TOKENS.ServiceRepository,
      useFactory: () => new InMemoryServiceRepository(demoServices),
    },
    { provide: TOKENS.BookingRepository, useClass: InMemoryBookingRepository },
    {
      provide: BookingService,
      useFactory: (
        clock: Clock,
        resources: ResourceRepository,
        services: ServiceRepository,
        bookings: BookingRepository,
      ) => new BookingService(clock, resources, services, bookings),
      inject: [
        TOKENS.Clock,
        TOKENS.ResourceRepository,
        TOKENS.ServiceRepository,
        TOKENS.BookingRepository,
      ],
    },
  ],
})
export class AppModule {}
