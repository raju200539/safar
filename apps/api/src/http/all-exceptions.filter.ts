import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

/** Normalise every error to { error: { code, message } }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const body = exception.getResponse() as
        | { error?: { code?: string; message?: string } }
        | string;
      if (typeof body === 'object' && body.error) {
        res.status(exception.getStatus()).json(body);
        return;
      }
      const message =
        typeof body === 'string' ? body : 'Request failed';
      res
        .status(exception.getStatus())
        .json({ error: { code: 'REQUEST_FAILED', message } });
      return;
    }
    // Use-case errors carrying { code, status } (e.g. OUT_OF_AREA).
    const coded = exception as { code?: string; status?: number; message?: string };
    if (coded?.code && coded?.status) {
      res
        .status(coded.status)
        .json({ error: { code: coded.code, message: coded.message } });
      return;
    }
    res
      .status(500)
      .json({ error: { code: 'INTERNAL', message: 'Unexpected error' } });
  }
}
