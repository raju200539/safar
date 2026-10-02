import { HttpException } from '@nestjs/common';

/** Consistent error shape: { error: { code, message } } (SPEC §2.7). */
export class ApiException extends HttpException {
  constructor(status: number, code: string, message: string) {
    super({ error: { code, message } }, status);
  }

  static badRequest(code: string, message: string): ApiException {
    return new ApiException(400, code, message);
  }

  static upstream(message: string): ApiException {
    return new ApiException(502, 'UPSTREAM_ERROR', message);
  }
}
