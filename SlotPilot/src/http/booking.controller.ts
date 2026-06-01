import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { BookingService } from '../application/booking.service';
import { Booking } from '../domain/booking';
import { Interval } from '../domain/time';
import { AvailabilityQueryDto, CreateBookingDto } from './dto';

interface SlotView {
  start: string;
  end: string;
}

interface BookingView {
  id: string;
  resourceId: string;
  serviceId: string;
  customerName: string;
  customerEmail: string;
  start: string;
  end: string;
  status: string;
}

@Controller()
export class BookingController {
  constructor(
    @Inject(BookingService) private readonly bookings: BookingService,
  ) {}

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('availability')
  async availability(@Query() query: AvailabilityQueryDto): Promise<SlotView[]> {
    const slots = await this.bookings.getAvailability(
      query.resourceId,
      query.serviceId,
      query.day,
    );
    return slots.map(this.toSlotView);
  }

  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateBookingDto): Promise<BookingView> {
    const booking = await this.bookings.createBooking(body);
    return this.toBookingView(booking);
  }

  @Get('bookings/:id')
  async get(@Param('id') id: string): Promise<BookingView> {
    return this.toBookingView(await this.bookings.getBooking(id));
  }

  @Delete('bookings/:id')
  async cancel(@Param('id') id: string): Promise<BookingView> {
    return this.toBookingView(await this.bookings.cancelBooking(id));
  }

  private toSlotView(slot: Interval): SlotView {
    return { start: slot.start.toISOString(), end: slot.end.toISOString() };
  }

  private toBookingView(b: Booking): BookingView {
    return {
      id: b.id,
      resourceId: b.resourceId,
      serviceId: b.serviceId,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      start: b.start.toISOString(),
      end: b.end.toISOString(),
      status: b.status,
    };
  }
}
