import { Controller, Get, Param } from '@nestjs/common';
import { error } from './error';

@Controller('v1/stops')
export class StopsController {
  @Get('search')
  search(): unknown {
    return error('NOT_IMPLEMENTED', 'Stop search lands in M3.');
  }

  @Get('nearby')
  nearby(): unknown {
    return error('NOT_IMPLEMENTED', 'Nearby stops lands in M3.');
  }

  @Get(':id/arrivals')
  arrivals(@Param('id') _id: string): unknown {
    return error('NOT_IMPLEMENTED', 'Departures land in M3.');
  }
}
