import type { HealthStatus } from '@hyd/shared';
import { Controller, Get } from '@nestjs/common';
import { OtpClient } from '../adapters/otp/otp-client';
import { dbPing } from '../adapters/postgres/pool';

@Controller()
export class HealthController {
  private readonly otp = new OtpClient();

  @Get('health')
  async health(): Promise<HealthStatus> {
    const liveEnabled = process.env.LIVE_ENABLED === 'true';
    const [otpOk, dbOk] = await Promise.all([
      this.otp.ping(),
      dbPing(),
    ]);
    return {
      status: otpOk && dbOk ? 'ok' : 'degraded',
      api: 'ok',
      otp: otpOk ? 'ok' : 'unreachable',
      db: dbOk ? 'ok' : 'unreachable',
      live: liveEnabled ? 'enabled' : 'disabled',
    };
  }
}
