import { IsEmail, IsISO8601, IsString, Length, Matches } from 'class-validator';

export class AvailabilityQueryDto {
  @IsString()
  @Length(1, 64)
  resourceId!: string;

  @IsString()
  @Length(1, 64)
  serviceId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'day must be YYYY-MM-DD' })
  day!: string;
}

export class CreateBookingDto {
  @IsString()
  @Length(1, 64)
  resourceId!: string;

  @IsString()
  @Length(1, 64)
  serviceId!: string;

  @IsISO8601({ strict: true }, { message: 'startsAt must be an ISO-8601 instant' })
  startsAt!: string;

  @IsString()
  @Length(1, 255)
  customerName!: string;

  @IsEmail()
  customerEmail!: string;
}
