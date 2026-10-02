import 'reflect-metadata';
import { join } from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './http/all-exceptions.filter';
import { ApiException } from './http/api-exception';

async function bootstrap(): Promise<void> {
  config(); // CWD (docker / explicit env)
  // Monorepo dev: API runs from apps/api, .env lives at the repo root.
  config({ path: join(process.cwd(), '..', '..', '.env'), override: false });
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      exceptionFactory: (errors) =>
        new ApiException(
          400,
          'INVALID_PARAMS',
          errors
            .map((e) => Object.values(e.constraints ?? {}).join(', '))
            .join('; ') || 'Invalid request parameters.',
        ),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
});
