import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import { BookingConflictError, DomainError, NotFoundError, ValidationError } from '../domain/errors';

/** Translates domain errors into clean HTTP responses. */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(exception);
    response.status(status).json({
      error: { code: exception.code, message: exception.message },
    });
  }

  private statusFor(exception: DomainError): number {
    if (exception instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (exception instanceof ValidationError) return HttpStatus.BAD_REQUEST;
    if (exception instanceof BookingConflictError) return HttpStatus.CONFLICT;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
