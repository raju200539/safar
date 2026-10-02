import { Controller, Get } from '@nestjs/common';
import { error } from './error';

@Controller('v1')
export class PlanController {
  @Get('plan')
  plan(): unknown {
    // M2 implements TripPlanner + OtpPlanner.
    return error('NOT_IMPLEMENTED', 'Trip planning lands in M2.');
  }
}
