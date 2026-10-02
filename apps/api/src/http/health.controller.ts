import type { HealthStatus } from '@hyd/shared';
import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health(): HealthStatus {
    const liveEnabled = process.env.LIVE_ENABLED === 'true';
    // M0: OTP/DB wiring lands in M2/M5. Report degraded until configured.
    const otp: HealthStatus['otp'] =
      process.env.OTP_URL === 'ok' ? 'ok' : 'unreachable';
    const db: HealthStatus['db'] =
      process.env.DATABASE_URL === 'ok' ? 'ok' : 'unreachable';
    const status = otp === 'ok' && db === 'ok' ? 'ok' : 'degraded';
    return {
      status,
      api: 'ok',
      otp,
      db,
      live: liveEnabled ? 'enabled' : 'disabled',
    };
  }
}
