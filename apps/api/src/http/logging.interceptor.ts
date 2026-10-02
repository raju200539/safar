import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/** Access log so real phone requests can be diagnosed (method, url, ms). */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly log = new Logger('http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method?: string;
      url?: string;
    }>();
    const started = Date.now();
    return next.handle().pipe(
      tap(() => {
        this.log.log(
          `${req.method ?? '?'} ${req.url ?? '?'} ${Date.now() - started}ms`,
        );
      }),
    );
  }
}
